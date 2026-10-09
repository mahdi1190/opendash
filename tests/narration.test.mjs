// Synthetic provider responses only: no real API key, account or narration.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createNarration, narrationRequest, NARRATION_DEFAULTS, NARRATION_TEXT_LIMIT } from '../lib/narration.mjs';
import { loadConfig, publicConfig } from '../lib/datadir.mjs';
import { normNarration, STORY_DEFAULTS } from '../lib/brief-config.mjs';
import { exportData } from '../lib/sharing.mjs';
import { readZip } from '../lib/zip.mjs';

const KEY = 'synthetic-elevenlabs-key';
const VOICE = 'syntheticVoice123';
const AUDIO = Buffer.from('ID3\u0004\u0000\u0000synthetic-mp3-payload');
const json = (doc, status = 200) => new Response(JSON.stringify(doc), { status, headers: { 'Content-Type': 'application/json' } });
const mp3 = () => new Response(AUDIO, { headers: { 'Content-Type': 'audio/mpeg' } });
const gate = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const subscription = extra => ({ tier: 'free', character_count: 1000, character_limit: 10000, next_character_count_reset_unix: Date.parse('2026-11-01T00:00:00Z') / 1000, ...extra });
const voiceRows = extra => ({ voices: [{ voice_id: VOICE, name: 'Synthetic narrator', category: 'premade', labels: { accent: 'american', gender: 'female', privateLabel: 'not public' }, preview_url: 'https://example.test/track', description: 'provider-private-description' }], has_more: false, ...extra });

async function fixture(run, handler = () => undefined, options = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'narration-test-'));
  let clock = Date.parse('2026-10-09T12:00:00Z'); const calls = [];
  const fetchFn = async (url, opts) => {
    const parsed = new URL(url); calls.push({ url: parsed, opts });
    assert.equal(parsed.origin, 'https://api.elevenlabs.io', 'keys and text only go to ElevenLabs');
    assert.equal(opts.redirect, 'error'); assert.equal(opts.headers['xi-api-key'], KEY); assert.ok(opts.signal);
    const response = await handler(parsed, opts, calls);
    if (response) return response;
    if (parsed.pathname === '/v1/user/subscription') return json(subscription());
    if (parsed.pathname === '/v2/voices') return json(voiceRows());
    return mp3();
  };
  const voice = createNarration({ dataDir: dir, fetchFn, now: () => clock, ...options });
  const connect = (extra = {}) => voice.configure({ apiKey: KEY, voiceId: VOICE, provider: 'elevenlabs', scope: 'all', ...extra });
  try { await run({ dir, voice, calls, fetchFn, connect, advance: ms => clock += ms, setTime: time => { clock = Date.parse(time); } }); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}

test('narration starts locally, persists settings through normal config validation, and isolates its key', async () => fixture(async ({ dir, voice, calls }) => {
  const initial = await voice.status();
  assert.deepEqual(Object.fromEntries(Object.keys(NARRATION_DEFAULTS).map(k => [k, initial[k]])), NARRATION_DEFAULTS);
  assert.equal(initial.connected, false); assert.deepEqual(initial.usage, { used: 0, remaining: 18000, period: '2026-10' });
  const configured = await voice.configure({ apiKey: KEY, voiceId: 'v'.repeat(80), modelId: 'eleven_v3', scope: 'highlights', monthlyLimit: 9000 });
  assert.equal(configured.connected, true); assert.equal(configured.provider, 'browser', 'saving a key alone does not enable cloud narration');
  assert.equal(configured.voiceId.length, 80); assert.equal(configured.modelId, 'eleven_v3'); assert.equal(configured.monthlyLimit, 9000);
  const config = await loadConfig(dir);
  assert.deepEqual(config.brief.story.narration, { provider: 'browser', voiceId: 'v'.repeat(80), modelId: 'eleven_v3', scope: 'highlights', monthlyLimit: 9000 });
  assert.equal(JSON.stringify(publicConfig(config)).includes(KEY), false);
  assert.equal(readFileSync(join(dir, 'config.json'), 'utf8').includes(KEY), false);
  assert.equal(JSON.parse(readFileSync(join(dir, 'secrets', 'narration.json'))).apiKey, KEY);
  if (process.platform !== 'win32') assert.equal(statSync(join(dir, 'secrets', 'narration.json')).mode & 0o777, 0o600);
  assert.equal(JSON.stringify(configured).includes(KEY), false); assert.equal(calls.length, 0);
  await voice.configure({ removeKey: true });
  assert.equal((await voice.status()).connected, false); assert.equal((await voice.status()).provider, 'browser');
}));

test('narration validates settings, identifiers, text bounds and delivery before any provider request', async () => fixture(async ({ voice, connect, calls }) => {
  for (const body of [{ url: 'https://example.test/steal' }, { apiKey: 'bad\nkey' }, { apiKey: '' }, { voiceId: '../../outside' }, { voiceId: 123 }, { voiceId: 'v'.repeat(81) }, { modelId: 'https://example.test' }, { provider: 'external' }, { monthlyLimit: -1 }, { monthlyLimit: 1.2 }, { monthlyLimit: 1000001 }, { scope: 'secret' }, { removeKey: 'true' }, { removeKey: true, apiKey: KEY }]) await assert.rejects(voice.configure(body), { code: 'BAD_REQUEST' });
  await connect();
  for (const body of [{ text: '' }, { text: 'x'.repeat(NARRATION_TEXT_LIMIT + 1) }, { text: 42 }, { text: 'bad\u0000text' }, { text: 'Hello', delivery: { tone: 'evil' } }, { text: 'Hello', delivery: { pace: 'unhurried' } }, { text: 'Hello', delivery: { pauseMs: 1201 } }, { text: 'Hello', kind: '../../steal' }, { text: 'Hello', preview: 'yes' }]) await assert.rejects(voice.speech(body), { code: 'BAD_REQUEST' });
  assert.equal(calls.length, 0);
}));

test('narration uses bounded model-specific expression without speaking directions or erasing real bracketed titles', () => {
  const input = '[warmly] Welcome. Review [draft] <break time="999s" /> today. Keep going.';
  const flash = narrationRequest(input, { tone: 'reflective', pace: 'slow', pauseMs: 500 }, 'eleven_flash_v2_5');
  assert.equal(flash.voice_settings.speed, 0.9); assert.ok(flash.voice_settings.stability > 0.5);
  assert.equal(flash.text.includes('[warmly]'), false); assert.equal(flash.text.includes('999'), false);
  assert.ok(flash.text.includes('[draft]')); assert.ok(flash.text.includes('<break time="0.50s" />'));
  assert.ok((flash.text.match(/<break /g) || []).length <= 3);
  const v3 = narrationRequest(input, { tone: 'reflective', pace: 'slow', pauseMs: 500 }, 'eleven_v3');
  assert.ok(v3.text.startsWith('[thoughtful] [unhurried]')); assert.ok(v3.text.includes('[short pause]'));
  assert.equal(v3.text.includes('<break'), false); assert.ok(v3.text.includes('(draft)')); assert.equal('speed' in v3.voice_settings, false);
  assert.equal(narrationRequest('A & B < 5.', { pauseMs: 0 }, 'eleven_flash_v2_5').text, 'A &amp; B &lt; 5.');
  assert.throws(() => narrationRequest('[warmly]', {}, 'eleven_flash_v2_5'), { code: 'BAD_REQUEST' });
});

test('narration deduplicates simultaneous clips, counts transmitted markup and replays after the cap reaches zero', async () => fixture(async ({ voice, connect, calls, dir }) => {
  await connect();
  const request = { text: 'Good morning. Here is your day.', delivery: { tone: 'warm', pace: 'steady', pauseMs: 300 }, kind: 'intro' };
  const [first, second] = await Promise.all([voice.speech(request), voice.speech(request)]);
  assert.equal(first.url, second.url); assert.match(first.url, /^\/api\/narration\/audio\?id=[a-f0-9]{64}$/);
  assert.equal(first.cached, false); assert.equal(calls.length, 1);
  const call = calls[0], body = JSON.parse(call.opts.body);
  assert.equal(call.url.pathname, '/v1/text-to-speech/' + VOICE); assert.equal(call.url.searchParams.get('output_format'), 'mp3_44100_128');
  assert.equal(body.model_id, 'eleven_flash_v2_5'); assert.equal(call.opts.headers['Content-Type'], 'application/json');
  assert.ok(first.usage.used > request.text.length); assert.equal(first.usage.used, Array.from(body.text).length);
  const audioId = new URL(first.url, 'http://localhost').searchParams.get('id');
  assert.deepEqual(await voice.audio(audioId), AUDIO);
  const stored = readdirSync(join(dir, 'cache', 'narration')).filter(n => n.endsWith('.mp3'));
  assert.equal(stored.length, 1); assert.equal(stored.some(n => n.includes('morning')), false);
  await voice.configure({ monthlyLimit: 0 });
  const cached = await voice.speech(request); assert.equal(cached.cached, true); assert.equal(cached.usage.remaining, 0); assert.equal(calls.length, 1);
  await assert.rejects(voice.speech({ text: 'A different introduction.', kind: 'intro' }), { code: 'NARRATION_LIMIT' });
  assert.equal((await voice.status()).usage.used, first.usage.used); assert.equal(calls.length, 1);
}));

test('narration keys its cache by voice, model and delivery and uses previews deliberately', async () => fixture(async ({ voice, connect, calls }) => {
  await connect({ provider: 'browser' });
  await assert.rejects(voice.speech({ text: 'Welcome.', kind: 'intro' }), { code: 'NARRATION_BROWSER' });
  const first = await voice.speech({ text: 'Welcome.', kind: 'intro', preview: true, delivery: { pauseMs: 0 } });
  const bright = await voice.speech({ text: 'Welcome.', kind: 'intro', preview: true, delivery: { tone: 'bright', pauseMs: 0 } });
  assert.notEqual(first.url, bright.url);
  await voice.configure({ provider: 'elevenlabs', modelId: 'eleven_v3' });
  const v3 = await voice.speech({ text: 'Welcome.', kind: 'intro', delivery: { pauseMs: 0 } }); assert.notEqual(v3.url, first.url);
  await voice.configure({ voiceId: 'anotherSyntheticVoice' });
  const other = await voice.speech({ text: 'Welcome.', kind: 'intro', delivery: { pauseMs: 0 } }); assert.notEqual(other.url, v3.url);
  assert.equal(calls.length, 4);
}));

test('narration applies highlights on the server and limits previews to the same allowance', async () => fixture(async ({ voice, connect, calls }) => {
  await connect({ scope: 'highlights', monthlyLimit: 10 });
  await assert.rejects(voice.speech({ text: 'Meeting.', kind: 'calendar' }), { code: 'NARRATION_SCOPE' });
  await assert.rejects(voice.speech({ text: 'An introduction far over the cap.', kind: 'intro', preview: true }), { code: 'NARRATION_LIMIT' });
  await voice.speech({ text: 'Welcome.', kind: 'intro', delivery: { pauseMs: 0 } });
  assert.equal(calls.length, 1);
}));

test('selected ElevenLabs narrates supporting story moments by default and retains explicit highlights', async () => fixture(async ({ voice, calls }) => {
  assert.deepEqual(normNarration(), NARRATION_DEFAULTS);
  assert.deepEqual(STORY_DEFAULTS.narration, NARRATION_DEFAULTS);
  assert.equal(normNarration({ scope: 'invalid' }).scope, 'all');
  assert.equal(normNarration({ scope: 'highlights' }).scope, 'highlights');
  const configured = await voice.configure({ apiKey: KEY, voiceId: VOICE, provider: 'elevenlabs' });
  assert.equal(configured.scope, 'all');
  const supporting = ['weather', 'calendar', 'focus', 'people', 'mail', 'money', 'tomorrow', 'habit'];
  for (const kind of supporting) {
    const reply = await voice.speech({ text: `The ${kind} moment.`, kind, delivery: { pauseMs: 0 } });
    assert.equal(reply.cached, false);
  }
  assert.equal(calls.length, supporting.length);
  await voice.configure({ scope: 'highlights' });
  await assert.rejects(voice.speech({ text: 'Another calendar moment.', kind: 'calendar' }), { code: 'NARRATION_SCOPE' });
  assert.equal(calls.length, supporting.length, 'explicit highlights still conserves allowance');
}));

test('narration reserves the local monthly cap before concurrent different requests dispatch', async () => {
  const started = gate(), release = gate();
  await fixture(async ({ voice, connect, calls }) => {
    await connect({ monthlyLimit: 10 });
    const first = voice.speech({ text: 'First.', delivery: { pauseMs: 0 } });
    await started.promise;
    await assert.rejects(voice.speech({ text: 'Second.', delivery: { pauseMs: 0 } }), { code: 'NARRATION_LIMIT' });
    assert.equal((await voice.status()).usage.used, 6); assert.equal(calls.length, 1);
    release.resolve(); await first;
  }, async url => { if (url.pathname.startsWith('/v1/text-to-speech/')) { started.resolve(); await release.promise; return mp3(); } });
});

test('narration deduplicates on disk across independent service instances', async () => fixture(async ({ dir, voice, connect, fetchFn, calls }) => {
  await connect();
  const other = createNarration({ dataDir: dir, fetchFn });
  const request = { text: 'One cached opening.', kind: 'intro' };
  const results = await Promise.all([voice.speech(request), other.speech(request)]);
  assert.equal(results[0].url, results[1].url); assert.equal(calls.length, 1); assert.equal(results.filter(r => r.cached).length, 1);
}));

test('narration month rollover preserves earlier usage, disconnecting never resets the cap', async () => fixture(async ({ dir, voice, connect, setTime }) => {
  await connect({ monthlyLimit: 10 });
  await voice.speech({ text: 'October.', delivery: { pauseMs: 0 } });
  const before = (await voice.status()).usage.used;
  await voice.configure({ removeKey: true }); await connect({ monthlyLimit: 10 });
  assert.equal((await voice.status()).usage.used, before);
  setTime('2026-11-03T12:00:00Z');
  assert.deepEqual((await voice.status()).usage, { used: 0, remaining: 10, period: '2026-11' });
  await voice.speech({ text: 'November.', delivery: { pauseMs: 0 } });
  setTime('2026-10-29T12:00:00Z'); assert.equal((await voice.status()).usage.used, before);
  const ledger = JSON.parse(readFileSync(join(dir, 'secrets', 'narration-usage.json')));
  assert.equal(ledger.months['2026-10'], before); assert.equal(ledger.months['2026-11'], 9);
}));

test('narration rejects a corrupted quota ledger instead of silently starting a new allowance', async () => fixture(async ({ dir, voice, connect, calls }) => {
  await connect();
  writeFileSync(join(dir, 'secrets', 'narration-usage.json'), '{broken');
  await assert.rejects(voice.speech({ text: 'No extra spend.' }), { code: 'ELEVENLABS_USAGE' });
  assert.equal(calls.length, 0);
}));

test('narration enumerates eligible account voices, sanitizes fields and refuses free Voice Library choices', async () => fixture(async ({ voice, connect, calls }) => {
  await connect();
  const [first, second] = await Promise.all([voice.voices(), voice.voices()]);
  assert.deepEqual(first.voices, second.voices); assert.equal(calls.length, 3, 'one subscription check plus two pages despite two callers');
  assert.deepEqual(first.account, { tier: 'free', remaining: 9000, resetAt: '2026-11-01T00:00:00.000Z' });
  assert.equal(first.voices.find(v => v.voiceId === VOICE).eligible, true);
  assert.equal(first.voices.find(v => v.voiceId === 'libraryVoice').eligible, false);
  assert.equal(first.voices.find(v => v.voiceId === 'paidOnly').eligible, false);
  assert.equal(first.voices.find(v => v.voiceId === 'secondPage').eligible, true);
  assert.equal(JSON.stringify(first).includes(KEY), false); assert.equal(JSON.stringify(first).includes('preview_url'), false); assert.equal(JSON.stringify(first).includes('provider-private-description'), false);
  assert.equal('privateLabel' in first.voices[0].labels, false);
  await assert.rejects(voice.configure({ voiceId: 'libraryVoice' }), { code: 'ELEVENLABS_VOICE_UNAVAILABLE' });
  assert.equal((await voice.status()).voiceId, VOICE, 'the blocked voice is not silently selected');
  await voice.status(); assert.equal(calls.length, 3, 'status uses local metadata');
}, url => url.pathname === '/v2/voices' ? json(url.searchParams.has('next_page_token') ? voiceRows({ voices: [{ voice_id: 'secondPage', name: 'Second page', category: 'generated' }] }) : voiceRows({ voices: [
  ...voiceRows().voices,
  { voice_id: 'libraryVoice', name: 'Community', category: 'professional', sharing: { public_owner_id: 'private-owner' } },
  { voice_id: 'paidOnly', name: 'Paid', category: 'premade', available_for_tiers: ['creator'] },
  { voice_id: '../../steal', name: 'Unsafe ID', category: 'premade' },
  { voice_id: KEY, name: KEY, category: 'premade' },
], has_more: true, next_page_token: 'synthetic-next' })) : undefined));

test('narration restricted keys can load premade voices with an unknown account allowance', async () => fixture(async ({ voice, connect }) => {
  await connect(); const out = await voice.voices();
  assert.equal(out.voices[0].eligible, true); assert.match(out.warning, /User Read/); assert.equal('account' in out, false);
}, url => url.pathname === '/v1/user/subscription' ? json({ detail: { message: KEY, status: 'missing_permissions' } }, 403) : undefined));

test('narration a failed subscription refresh preserves a known exhausted account allowance', async () => {
  let denied = false;
  await fixture(async ({ voice, connect, calls }) => {
    await connect(); await voice.voices(); assert.equal((await voice.status()).account.remaining, 0);
    denied = true; const refresh = await voice.voices();
    assert.equal(refresh.account.remaining, 0); assert.equal(refresh.account.tier, 'free'); assert.match(refresh.warning, /User Read/);
    await assert.rejects(voice.speech({ text: 'Keep the known cap.', delivery: { pauseMs: 0 } }), { code: 'ELEVENLABS_QUOTA' });
    assert.equal(calls.some(c => c.url.pathname.startsWith('/v1/text-to-speech/')), false);
  }, url => url.pathname === '/v1/user/subscription' ? denied ? json({ detail: { status: 'missing_permissions' } }, 403) : json(subscription({ character_count: 10000 })) : undefined);
});

test('narration removing a key during account refresh cannot restore its credentials or metadata', async () => {
  const started = gate(), release = gate();
  await fixture(async ({ voice, connect, dir }) => {
    await connect(); const refresh = voice.voices(); const rejected = assert.rejects(refresh, { code: 'ELEVENLABS_CHANGED' });
    await started.promise; await voice.configure({ removeKey: true }); release.resolve(); await rejected;
    assert.equal((await voice.status()).connected, false); assert.equal((await voice.status()).provider, 'browser');
    assert.equal(JSON.parse(readFileSync(join(dir, 'secrets', 'narration.json'))), null);
  }, async url => { if (url.pathname === '/v1/user/subscription') { started.resolve(); await release.promise; return json(subscription()); } });
});

test('narration reserves known provider credits before concurrent clips and conserves the raw local cap', async () => {
  const started = gate(), release = gate();
  await fixture(async ({ voice, connect, calls }) => {
    await connect(); await voice.voices();
    const first = voice.speech({ text: 'a'.repeat(120), delivery: { pauseMs: 0 } }); await started.promise;
    await assert.rejects(voice.speech({ text: 'b'.repeat(120), delivery: { pauseMs: 0 } }), { code: 'ELEVENLABS_QUOTA' });
    assert.equal((await voice.status()).account.remaining, 40); assert.equal((await voice.status()).usage.used, 120);
    assert.equal(calls.filter(c => c.url.pathname.startsWith('/v1/text-to-speech/')).length, 1);
    release.resolve(); await first; assert.equal((await voice.status()).account.remaining, 40);
  }, async url => {
    if (url.pathname === '/v1/user/subscription') return json(subscription({ character_count: 9900 }));
    if (url.pathname.startsWith('/v1/text-to-speech/')) { started.resolve(); await release.promise; return mp3(); }
  });
});

test('narration voice refresh cannot overwrite credits reserved while its provider snapshot was in flight', async () => {
  const refreshStarted = gate(), releaseRefresh = gate(), speechStarted = gate(), releaseSpeech = gate(); let reads = 0;
  await fixture(async ({ voice, connect }) => {
    await connect(); await voice.voices();
    const refreshing = voice.voices(); await refreshStarted.promise;
    const speech = voice.speech({ text: 'a'.repeat(120), delivery: { pauseMs: 0 } }); await speechStarted.promise;
    releaseRefresh.resolve(); await refreshing;
    assert.equal((await voice.status()).account.remaining, 40);
    await assert.rejects(voice.speech({ text: 'b'.repeat(120), delivery: { pauseMs: 0 } }), { code: 'ELEVENLABS_QUOTA' });
    releaseSpeech.resolve(); await speech;
    assert.equal((await voice.status()).account.remaining, 40);
  }, async url => {
    if (url.pathname === '/v1/user/subscription') { if (++reads === 2) { refreshStarted.resolve(); await releaseRefresh.promise; } return json(subscription({ character_count: 9900 })); }
    if (url.pathname.startsWith('/v1/text-to-speech/')) { speechStarted.resolve(); await releaseSpeech.promise; return mp3(); }
  });
});

test('narration provider refusals expose fixed messages and refund definite non-generation attempts', async () => fixture(async ({ voice, connect, calls }) => {
  await connect(); await voice.voices(); const before = (await voice.status()).account.remaining;
  const request = { text: 'A private synthetic script.', delivery: { pauseMs: 0 } };
  await assert.rejects(voice.speech(request), e => { assert.equal(e.code, 'ELEVENLABS_AUTH'); assert.equal(e.message.includes(KEY), false); assert.equal(e.message.includes(request.text), false); return true; });
  assert.equal((await voice.status()).usage.used, 0); assert.equal((await voice.status()).account.remaining, before);
  assert.equal(calls.filter(c => c.url.pathname.startsWith('/v1/text-to-speech/')).length, 1, 'no automatic paid retry');
}, url => url.pathname.startsWith('/v1/text-to-speech/') ? json({ detail: { status: 'invalid_api_key', message: KEY + ' A private synthetic script.' } }, 401) : undefined));

test('narration uncertain network attempts remain counted and audio does not accept arbitrary response content', async () => fixture(async ({ voice, connect, calls, dir }) => {
  await connect(); await voice.voices();
  const before = (await voice.status()).account.remaining;
  await assert.rejects(voice.speech({ text: 'Potentially billed.', delivery: { pauseMs: 0 } }), { code: 'ELEVENLABS_NETWORK' });
  const charged = (await voice.status()).usage.used; assert.equal(charged, 19); assert.equal((await voice.status()).account.remaining, before - 10);
  await assert.rejects(voice.speech({ text: 'Unreadable audio.', delivery: { pauseMs: 0 } }), { code: 'ELEVENLABS_RESPONSE' });
  assert.equal((await voice.status()).usage.used, charged + 17);
  assert.equal(readdirSync(join(dir, 'cache', 'narration')).some(n => n.endsWith('.mp3')), false);
  assert.equal(calls.filter(c => c.url.pathname.startsWith('/v1/text-to-speech/')).length, 2);
}, (url, opts) => {
  if (!url.pathname.startsWith('/v1/text-to-speech/')) return;
  if (JSON.parse(opts.body).text === 'Potentially billed.') throw new Error(KEY + ' sensitive provider/network detail');
  return json({ leaked: KEY });
}));

test('narration bounds provider audio streams and aborts a stalled request without refunding uncertain spend', async () => {
  let cancelled = false;
  await fixture(async ({ voice, connect }) => {
    await connect();
    await assert.rejects(voice.speech({ text: 'Too much audio.', delivery: { pauseMs: 0 } }), { code: 'ELEVENLABS_RESPONSE' });
    assert.equal(cancelled, true); assert.equal((await voice.status()).usage.used, 15);
  }, url => url.pathname.startsWith('/v1/text-to-speech/') ? new Response(new ReadableStream({ pull(c) { c.enqueue(new Uint8Array(1024 * 1024)); }, cancel() { cancelled = true; } }), { headers: { 'Content-Type': 'audio/mpeg' } }) : undefined);
  await fixture(async ({ voice, connect }) => {
    await connect();
    await assert.rejects(voice.speech({ text: 'A stalled request.', delivery: { pauseMs: 0 } }), { code: 'ELEVENLABS_NETWORK' });
    assert.equal((await voice.status()).usage.used, 18);
  }, (url, opts) => url.pathname.startsWith('/v1/text-to-speech/') ? new Promise((resolve, reject) => opts.signal.addEventListener('abort', () => reject(new Error('synthetic abort')), { once: true })) : undefined, { timeoutMs: 60 });
});

test('narration rejects unsafe audio IDs and exports neither its secrets, usage nor generated audio', async () => fixture(async ({ dir, voice, connect }) => {
  await connect(); await voice.speech({ text: 'Private cached audio.', kind: 'intro' });
  for (const id of ['../narration.json', 'x'.repeat(64), '/absolute', null]) await assert.rejects(voice.audio(id), { code: 'BAD_REQUEST' });
  await assert.rejects(voice.audio('0'.repeat(64)), { code: 'NARRATION_AUDIO_MISSING' });
  const entries = readZip(exportData({ dataDir: dir }).buffer);
  assert.ok(entries.some(e => e.name.endsWith('/config.json')));
  assert.equal(entries.some(e => /\/(?:secrets|cache)\//.test(e.name)), false);
  assert.equal(entries.some(e => e.data.includes(Buffer.from(KEY))), false);
}));

test('narration bounds disk caching without evicting the just-generated clip', async () => fixture(async ({ dir, voice, connect }) => {
  await connect(); const cache = join(dir, 'cache', 'narration'); mkdirSync(cache, { recursive: true });
  for (let i = 0; i < 501; i++) writeFileSync(join(cache, i.toString(16).padStart(64, '0') + '.mp3'), AUDIO);
  const result = await voice.speech({ text: 'The newest cached clip.', delivery: { pauseMs: 0 } });
  assert.equal(readdirSync(cache).filter(n => n.endsWith('.mp3')).length, 500);
  assert.deepEqual(await voice.audio(new URL(result.url, 'http://localhost').searchParams.get('id')), AUDIO);
}));
