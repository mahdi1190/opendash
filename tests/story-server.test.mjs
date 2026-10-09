// /api/story (server/routes/story.mjs): the day model + an immediate fallback
// script, the AI script through a mocked json job (validated, bad refs dropped,
// cached per kind and day, regenerate), Claude missing (503), AI off (409/'off'),
// and the brief.story settings. Synthetic data (tests/fixtures/actions-state.mjs).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { request, createServer } from 'node:http';
import { makeDataDir, TODAY, addDays, sampleState } from './fixtures/actions-state.mjs';
import { setStoryAi, setStoryWeatherFetch, setStoryNow } from '../server/routes/story.mjs';
import { STORY_SCRIPT_SCHEMA } from '../lib/story-script.mjs';

let dir, port, srv;
let aiCalls = [], aiAvailable = true, aiAnswer = null;
// As on CI: no Claude CLI, so the server's start-up checks never run a real one
// (the story's AI is a fake) and close() never waits for one.
process.env.CLAUDE_CLI_PATH = join(tmpdir(), 'opendash-tests-no-claude-cli', 'claude');

function freePort() { return new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); }); }
function raw(method, path, { headers = {}, body } = {}) {
  return new Promise((res, rej) => {
    const req = request({ host: '127.0.0.1', port, method, path, headers: { Host: `localhost:${port}`, ...headers } }, (r) => {
      const chunks = []; r.on('data', d => chunks.push(d));
      r.on('end', () => { const t = Buffer.concat(chunks).toString('utf8'); let json = null; try { json = JSON.parse(t); } catch {} res({ status: r.statusCode, json, text: t }); });
    });
    req.on('error', rej);
    if (body !== undefined) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}
const same = () => ({ Origin: `http://localhost:${port}`, 'Sec-Fetch-Site': 'same-origin' });
const get = (p) => raw('GET', p);
const post = (p, body = {}, headers = same()) => raw('POST', p, { headers: { 'Content-Type': 'application/json', ...headers }, body });
const put = (p, body = {}) => raw('PUT', p, { headers: { 'Content-Type': 'application/json', ...same() }, body });

before(async () => {
  const s = sampleState();
  s.completionLog = { 'u-6-fff': [Date.now() - 60 * 1000] };
  dir = makeDataDir(s);
  // A meeting today whose attendee is a Person (matched by email), and the user.
  writeFileSync(join(dir, 'calendar', 'calendar.json'), JSON.stringify({ fetchedAt: new Date().toISOString(), events: [
    { id: 'e1', summary: 'Group meeting', start: { dateTime: `${TODAY}T22:00:00Z` }, end: { dateTime: `${TODAY}T22:45:00Z` }, attendees: [{ email: 'sam@example.com', displayName: 'Sam Taylor' }] },
    { id: 'e2', summary: 'Conference', start: { date: addDays(TODAY, 3) }, end: { date: addDays(TODAY, 5) } },
  ] }));
  setStoryWeatherFetch(async () => { throw new TypeError('offline'); });
  setStoryAi({
    aiStatus: async () => ({ available: aiAvailable, code: aiAvailable ? null : 'NOT_SIGNED_IN' }),
    askJson: async (o) => { aiCalls.push(o); return { json: aiAnswer, model: o.model, ms: 5 }; },
  });
  port = await freePort();
  const { main } = await import('../server/index.mjs');
  srv = await main(['--port', String(port), '--no-open', '--data-dir', dir]);
});
after(async () => {
  await srv?.close();
  setStoryAi(null); setStoryWeatherFetch(null); setStoryNow(null);
  rmSync(dir, { recursive: true, force: true });
});

test('GET /api/story: the day model and a fallback script, at once', async () => {
  const r = await get('/api/story?kind=morning');
  assert.equal(r.status, 200, r.text);
  const { data, script, ai } = r.json;
  assert.equal(data.kind, 'morning'); assert.equal(data.date, TODAY);
  assert.equal(script.source, 'fallback');
  assert.ok(script.sentences.length >= 1);
  assert.equal(ai.state, 'missing'); assert.equal(ai.model, 'claude-haiku-4-5');
  assert.equal(data.weather, null, 'no town / offline: no weather, no wait');
  for (const k of ['events', 'focus', 'deadlines', 'people', 'suggestions', 'entities', 'gaps', 'dayType']) assert.ok(k in data, k);
  const e1 = data.events.find(e => e.id === 'e1');
  assert.ok(e1 && e1.type, 'events carry a scene type');
  assert.deepEqual(e1.people, ['sam'], 'attendee matched by email');
  const sam = data.people.find(p => p.id === 'sam');
  assert.ok(sam, 'Sam is a person of the day');
  assert.ok(sam.meetings.some(m => m.eventId === 'e1'));
  assert.ok(sam.counts.owe >= 1, 'tasks owed to Sam');
  assert.ok(!data.people.some(p => p.id === 'me'), 'never the user');
  // Every entity a script names exists in the catalogue.
  const cat = new Set(data.entities.map(e => e.type + '|' + e.ref));
  for (const s of script.sentences) for (const e of s.entities) assert.ok(cat.has(e.type + '|' + e.ref));
  for (const kind of ['evening', 'week']) {
    const x = await get('/api/story?kind=' + kind);
    assert.equal(x.status, 200, x.text);
    assert.equal(x.json.data.kind, kind);
    assert.ok(x.json.script.sentences.length >= 1);
  }
  assert.ok(Array.isArray((await get('/api/story?kind=week')).json.data.wins));
  assert.equal((await get('/api/story?kind=lunch')).status, 400);
});

test('POST /api/story/script: AI script validated, bad refs dropped, cached, regenerate', async () => {
  aiAnswer = { theme: 'Busy', mood: 'busy', palette: 'sky', headline: 'A full day',
    sentences: [
      { text: 'You see Sam at the Group meeting tonight.', entities: [{ type: 'person', ref: 'sam', text: 'Sam' }, { type: 'event', ref: 'e1', text: 'Group meeting' }, { type: 'person', ref: 'invented', text: 'Sam' }, { type: 'task', ref: 'u-404', text: 'nothing' }] },
      { text: 'Pace yourself.', entities: [] },
    ], closing: 'Go gently.' };
  aiCalls = [];
  let r = await post('/api/story/script', { kind: 'morning' });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.cached, false);
  assert.equal(r.json.dropped, 2);
  assert.equal(r.json.script.source, 'ai');
  assert.deepEqual(r.json.script.sentences[0].entities.map(e => e.type + '|' + e.ref), ['person|sam', 'event|e1']);
  assert.equal(aiCalls.length, 1);
  assert.deepEqual(aiCalls[0].schema, STORY_SCRIPT_SCHEMA);
  assert.equal(aiCalls[0].model, 'claude-haiku-4-5');
  assert.match(aiCalls[0].prompt, /<facts>/);
  assert.ok(existsSync(join(dir, 'briefs', 'story')) && readdirSync(join(dir, 'briefs', 'story')).some(n => n.startsWith('morning-')));
  // The GET now serves the cached AI script.
  r = await get('/api/story?kind=morning');
  assert.equal(r.json.ai.state, 'cached'); assert.equal(r.json.script.source, 'ai'); assert.equal(r.json.script.headline, 'A full day');
  // Asking again: cached, no new job. Regenerate: a new job.
  r = await post('/api/story/script', { kind: 'morning' });
  assert.equal(r.json.cached, true); assert.equal(aiCalls.length, 1);
  aiAnswer = { ...aiAnswer, headline: 'Rewritten' };
  r = await post('/api/story/script', { kind: 'morning', regenerate: true });
  assert.equal(r.json.cached, false); assert.equal(r.json.script.headline, 'Rewritten'); assert.equal(aiCalls.length, 2);
  // Unusable output -> 502, the cache keeps the last good script.
  aiAnswer = { sentences: [] };
  r = await post('/api/story/script', { kind: 'morning', regenerate: true });
  assert.equal(r.status, 502);
  assert.equal((await get('/api/story?kind=morning')).json.script.headline, 'Rewritten');
});

test('POST /api/story/script: Claude missing -> 503; AI off -> 409 and GET says off; same-origin enforced', async () => {
  aiAvailable = false;
  let r = await post('/api/story/script', { kind: 'evening' });
  assert.equal(r.status, 503);
  assert.equal((await get('/api/story?kind=evening')).json.script.source, 'fallback');
  aiAvailable = true;
  assert.equal((await post('/api/story/script', { kind: 'evening' }, { Origin: 'http://evil.example', 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal((await post('/api/story/script', { kind: 'nope' })).status, 400);
  r = await put('/api/config', { brief: { ai: false } });
  assert.equal(r.status, 200);
  assert.equal((await post('/api/story/script', { kind: 'evening' })).status, 409);
  r = await get('/api/story?kind=morning');
  assert.equal(r.json.ai.state, 'off');
  assert.equal(r.json.script.source, 'fallback', 'the cached AI script is not used while the AI is off');
  await put('/api/config', { brief: { ai: true } });
});

test('settings: brief.story is validated and partial patches keep the rest', async () => {
  let r = await put('/api/config', { brief: { story: { voiceName: 'Some Voice', rate: 1.2 } } });
  assert.equal(r.status, 200);
  assert.equal(r.json.brief.story.voiceName, 'Some Voice'); assert.equal(r.json.brief.story.rate, 1.2);
  r = await put('/api/config', { brief: { story: { pitch: 9, speed: 2, model: 'gpt-x', volume: 0.5 } } });
  const st = r.json.brief.story;
  assert.equal(st.voiceName, 'Some Voice', 'kept'); assert.equal(st.rate, 1.2, 'kept');
  assert.equal(st.pitch, 1.4, 'clamped'); assert.equal(st.speed, 1, 'only 0.8 / 1 / 1.25'); assert.equal(st.model, 'claude-haiku-4-5'); assert.equal(st.volume, 0.5);
  assert.equal(st.autoOpen, true); assert.equal(st.voice, true);
  r = await put('/api/config', { brief: { story: { model: 'claude-sonnet-5', voice: false } } });
  assert.equal(r.json.brief.story.model, 'claude-sonnet-5'); assert.equal(r.json.brief.story.voice, false);
  aiAnswer = { theme: 'x', mood: 'calm', palette: 'sky', headline: 'Week', sentences: [{ text: 'A week.', entities: [] }], closing: '' };
  aiCalls = [];
  await post('/api/story/script', { kind: 'week' });
  assert.equal(aiCalls[0].model, 'claude-sonnet-5', 'the configured model is used');
});

test('day adviser respects opt-in, deduplicates automatic periods and caps them at three', async () => {
  aiAvailable=true;aiCalls=[];
  await put('/api/config',{timezone:'UTC',time:{follow:'home'},brief:{ai:true,advisorAuto:false}});
  assert.equal((await post('/api/story/advice',{automatic:true})).status,409);
  await put('/api/config',{brief:{advisorAuto:true}});
  aiAnswer={summary:'Review the priorities for the rest of today.',ideas:[]};
  for(const time of ['08:00','13:00','18:00']) {
    setStoryNow(()=>new Date(TODAY+'T'+time+':00Z'));
    const first=await post('/api/story/advice',{automatic:true});assert.equal(first.status,200,first.text);
    assert.equal((await post('/api/story/advice',{automatic:true})).json.cached,true);
  }
  assert.equal(aiCalls.length,3);assert.equal(aiCalls[0].effort,'medium');
  assert.equal((await post('/api/story/advice',{}, {'Origin':'https://elsewhere.example'})).status,403);
  await put('/api/config',{brief:{ai:false}});assert.equal((await post('/api/story/advice')).status,409);
  setStoryNow(null);
});

test('failed automatic adviser reasoning consumes its period instead of repeating model calls', async()=>{
  await put('/api/config',{brief:{ai:true,advisorAuto:true}});
  setStoryNow(()=>new Date(addDays(TODAY,1)+'T08:00:00Z'));aiAnswer={summary:'',ideas:[]};aiCalls=[];
  assert.equal((await post('/api/story/advice',{automatic:true})).status,502);
  assert.equal((await post('/api/story/advice',{automatic:true})).json.cached,true);
  assert.equal(aiCalls.length,1);setStoryNow(null);
});
