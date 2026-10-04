// People card (User request, 4 Oct: a full card for people, their own pictures,
// and the email / assign buttons back where they can be found).
//   - the pure rules in src/app/54-people-card-logic.js (through lib/people-images.mjs):
//     where a person opens, picture references, people found in email, assignment pairs;
//   - the picture checks and the POST/GET /api/people/image endpoint: validation,
//     size and pixel caps, type sniffing, path safety, the usual Host/origin/JSON guards;
//   - person.update photo/cover through the actions layer (validated, undoable);
//   - openPerson routing on the page (54-people-card.js in a small sandbox) and that every
//     place that used to jump to #view=person: now goes through openPerson;
//   - the bulk "assign people to tasks" flow: pairs -> one batch of task.link_person, one undo.
// Synthetic data only.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { request, createServer } from 'node:http';
import vm from 'node:vm';
import {
  pcOpenMode, pcPhotoUrl, pcCoverLook, pcMailCandidates, pcAssignPairs, refKind, COVER_PRESETS, IMG_NAME_RE,
  imageInfo, checkImage, decodeDataUrl, personSlug, LIMITS, ImageError,
} from '../lib/people-images.mjs';
import { createActions } from '../server/actions/index.mjs';
import { makeDataDir } from './fixtures/actions-state.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..', 'src', 'app');

/* ---------- synthetic pictures (headers only: the server never decodes pixels) ---------- */
function png(w, h, extra = 64) {
  const b = Buffer.alloc(33 + extra);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8); b.write('IHDR', 12, 'latin1'); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20);
  return b;
}
function jpeg(w, h) {
  const b = Buffer.alloc(64);
  b[0] = 0xff; b[1] = 0xd8;
  b[2] = 0xff; b[3] = 0xe0; b.writeUInt16BE(16, 4);            // APP0, 16 bytes
  let i = 2 + 2 + 16;
  b[i] = 0xff; b[i + 1] = 0xc0; b.writeUInt16BE(17, i + 2); b[i + 4] = 8; b.writeUInt16BE(h, i + 5); b.writeUInt16BE(w, i + 7);
  return b;
}
function gif(w, h) { const b = Buffer.alloc(32); b.write('GIF89a', 0, 'latin1'); b.writeUInt16LE(w, 6); b.writeUInt16LE(h, 8); return b; }
function webp(w, h) {
  const b = Buffer.alloc(40);
  b.write('RIFF', 0, 'latin1'); b.writeUInt32LE(32, 4); b.write('WEBP', 8, 'latin1'); b.write('VP8X', 12, 'latin1'); b.writeUInt32LE(10, 16);
  b.writeUIntLE(w - 1, 24, 3); b.writeUIntLE(h - 1, 27, 3);
  return b;
}
const dataUrl = (mime, buf) => `data:${mime};base64,${buf.toString('base64')}`;

/* ---------- pure rules ---------- */
test('where a person opens: explicit mode, then the session switch, then Settings', () => {
  assert.equal(pcOpenMode({}), 'card', 'the centre card by default');
  assert.equal(pcOpenMode({ setting: 'panel' }), 'panel');
  assert.equal(pcOpenMode({ setting: 'panel', session: 'card' }), 'card', 'the card\'s switch wins for the session');
  assert.equal(pcOpenMode({ setting: 'card', session: 'panel' }), 'panel');
  assert.equal(pcOpenMode({ setting: 'card', session: 'panel', mode: 'card' }), 'card', 'an explicit mode wins');
  assert.equal(pcOpenMode({ mode: 'bogus', setting: 'nope' }), 'card');
});

test('picture references: files, Gravatar and built-in covers; anything else is nothing', () => {
  const name = 'sam-avatar-0123456789abcdef.webp';
  assert.ok(IMG_NAME_RE.test(name));
  assert.equal(refKind('file:' + name), 'file');
  assert.equal(pcPhotoUrl('file:' + name), '/api/people/image/' + name);
  assert.equal(pcPhotoUrl('file:sam-cover-0123456789abcdef.webp'), '', 'a cover is not a profile picture');
  const h = 'a'.repeat(64);
  assert.equal(refKind('gravatar:' + h), 'gravatar');
  assert.equal(pcPhotoUrl('gravatar:' + h), `https://gravatar.com/avatar/${h}?s=256&d=404`);
  for (const bad of ['file:../state/dashboard-state.json', 'file:sam-avatar-xyz.webp', 'file:Sam-avatar-0123456789abcdef.webp', 'file:sam-avatar-0123456789abcdef.svg',
    'gravatar:abc', 'gravatar:' + 'A'.repeat(64), 'https://example.org/x.png', 'javascript:alert(1)', 'preset:nope', '', null]) {
    assert.equal(refKind(bad), '', String(bad));
    assert.equal(pcPhotoUrl(bad), '', String(bad));
  }
  assert.ok(COVER_PRESETS.length >= 8);
  const c = pcCoverLook('preset:' + COVER_PRESETS[0]);
  assert.equal(c.kind, 'preset'); assert.match(c.css, /gradient/);
  assert.deepEqual(pcCoverLook('file:sam-cover-0123456789abcdef.jpg'), { kind: 'file', url: '/api/people/image/sam-cover-0123456789abcdef.jpg' });
  assert.equal(pcCoverLook('file:' + name).kind, 'default', 'an avatar file is not a cover');
  assert.equal(pcCoverLook('').kind, 'default');
});

test('people in email: unknown senders and recipients only; matches, bulk mail, the user and ignores are handled', () => {
  const people = [
    { id: 'sam', name: 'Sam Taylor', emails: ['sam@uni.example'] },
    { id: 'robin', name: 'Robin Quill', emails: [] },
    { id: 'me', name: 'Test User', emails: ['me@home.example'], self: true },
  ];
  const msgs = [
    { id: 't1', date: '2026-10-01T10:00:00Z', from: { name: 'Sam Taylor', email: 'SAM@uni.example' }, to: [{ name: 'Test User', email: 'me@home.example' }], cc: [{ name: 'Kim Park', email: 'kim@lab.example' }] },
    { id: 't2', date: '2026-10-02T10:00:00Z', from: { name: 'Kim Park', email: 'kim@lab.example' } },
    { id: 't3', date: '2026-10-02T11:00:00Z', from: { name: 'Quill, Robin', email: 'robin.q@client.example' } },
    { id: 't4', date: '2026-10-03T10:00:00Z', from: { name: 'Shop', email: 'noreply@shop.example' } },
    { id: 't5', date: '2026-10-03T10:00:00Z', from: { name: 'The Paper', email: 'daily@newsletters.paper.example' } },
    { id: 't6', date: '2026-10-03T12:00:00Z', from: { name: 'Pat', email: 'pat@x.example' } },
    { id: 't7', date: '2026-10-03T12:00:00Z', from: { name: '', email: 'not-an-address' } },
    { id: 't8', date: '2026-10-03T12:00:00Z', from: { name: 'Lee Ignored', email: 'lee@x.example' } },
  ];
  const auto = (e) => /^noreply@/.test(e);
  const out = pcMailCandidates(msgs, people, { myEmails: ['ME@home.example'], ignore: ['lee@x.example'], automated: auto });
  const by = Object.fromEntries(out.map(x => [x.email, x]));
  assert.deepEqual(Object.keys(by).sort(), ['kim@lab.example', 'pat@x.example', 'robin.q@client.example']);
  assert.equal(by['kim@lab.example'].count, 2, 'one count per thread, cc included');
  assert.equal(by['kim@lab.example'].name, 'Kim Park');
  assert.equal(by['robin.q@client.example'].name, 'Robin Quill', '"Last, First" reads as "First Last"');
  assert.equal(by['robin.q@client.example'].match, 'robin', 'same name as someone without this address: offer to add it');
  assert.equal(by['kim@lab.example'].match, null);
  assert.equal(out[out.length - 1].email, 'pat@x.example', 'one-word names come after people-like names');
  // Address only (no display name in the snapshot): "first.last" reads as a name and sorts first.
  const bare = pcMailCandidates([
    { id: 'b1', date: '2026-10-03T12:00:00Z', from: { name: '', email: 'em@journal.example' } },
    { id: 'b2', date: '2026-10-03T12:00:00Z', from: { name: '', email: 'em@journal.example' } },
    { id: 'b3', date: '2026-10-02T12:00:00Z', from: { name: '', email: 'robin.quill@else.example' } },
  ], people);
  assert.deepEqual(bare.map(x => [x.email, x.name, x.person, x.match]), [
    ['robin.quill@else.example', 'Robin Quill', true, 'robin'],
    ['em@journal.example', '', false, null],
  ]);
  assert.deepEqual(pcMailCandidates(null, null), []);
  assert.equal(pcMailCandidates(msgs, people, { limit: 1 }).length, 1);
});

test('assignment pairs: every ticked task x every chosen person, minus links that exist', () => {
  const linked = { t1: ['sam'], t2: [], t3: ['sam', 'alex'] };
  const pairs = pcAssignPairs(['t1', 't2', 't3', 't1', ''], ['sam', 'alex', 'sam'], (id) => linked[id]);
  assert.deepEqual(pairs, [
    { taskId: 't1', personId: 'alex' },
    { taskId: 't2', personId: 'sam' }, { taskId: 't2', personId: 'alex' },
  ]);
  assert.deepEqual(pcAssignPairs([], ['sam'], () => []), []);
  assert.deepEqual(pcAssignPairs(['t2'], [], () => []), []);
});

/* ---------- picture checks ---------- */
test('imageInfo sniffs PNG, JPEG, GIF and WebP from their bytes', () => {
  assert.deepEqual([imageInfo(png(256, 128)).type, imageInfo(png(256, 128)).width, imageInfo(png(256, 128)).height], ['png', 256, 128]);
  assert.deepEqual([imageInfo(jpeg(300, 200)).type, imageInfo(jpeg(300, 200)).width, imageInfo(jpeg(300, 200)).height], ['jpeg', 300, 200]);
  assert.deepEqual([imageInfo(gif(40, 30)).type, imageInfo(gif(40, 30)).width], ['gif', 40]);
  assert.deepEqual([imageInfo(webp(1200, 400)).type, imageInfo(webp(1200, 400)).width, imageInfo(webp(1200, 400)).height], ['webp', 1200, 400]);
  for (const bad of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), Buffer.from('<html><body>hi</body></html>    '), Buffer.alloc(4), 'nope']) assert.equal(imageInfo(bad), null);
});

test('checkImage: types, the type it claims, size and pixel caps', () => {
  assert.equal(checkImage({ kind: 'avatar', data: dataUrl('image/png', png(256, 256)) }).info.type, 'png');
  const code = (fn) => { try { fn(); } catch (e) { assert.ok(e instanceof ImageError); return `${e.status} ${e.code}`; } return 'ok'; };
  assert.equal(code(() => checkImage({ kind: 'banner', data: dataUrl('image/png', png(2, 2)) })), '400 BAD_REQUEST');
  assert.equal(code(() => checkImage({ kind: 'avatar', data: 'data:image/svg+xml;base64,' + Buffer.from('<svg/>').toString('base64') })), '415 NOT_AN_IMAGE');
  assert.equal(code(() => checkImage({ kind: 'avatar', data: 'data:text/html;base64,PGI+' })), '415 NOT_AN_IMAGE');
  assert.equal(code(() => checkImage({ kind: 'avatar', data: 'https://example.org/a.png' })), '415 NOT_AN_IMAGE');
  assert.equal(code(() => checkImage({ kind: 'avatar', data: 42 })), '400 BAD_REQUEST');
  assert.equal(code(() => checkImage({ kind: 'avatar', data: dataUrl('image/png', Buffer.from('<svg onload=alert(1)></svg>' + ' '.repeat(40))) })), '415 NOT_AN_IMAGE', 'bytes must be a picture');
  assert.equal(code(() => checkImage({ kind: 'avatar', data: dataUrl('image/png', jpeg(10, 10)) })), '422 TYPE_MISMATCH');
  assert.equal(code(() => checkImage({ kind: 'avatar', data: dataUrl('image/png', png(5000, 10)) })), '422 TOO_BIG');
  assert.equal(code(() => checkImage({ kind: 'avatar', data: dataUrl('image/png', png(256, 256, LIMITS.avatar)) })), '413 TOO_LARGE');
  assert.equal(code(() => checkImage({ kind: 'cover', data: dataUrl('image/png', png(1200, 400, LIMITS.avatar)) })), 'ok', 'covers may be larger');
  assert.equal(decodeDataUrl(dataUrl('image/jpeg', jpeg(1, 1))).type, 'jpeg');
  assert.equal(personSlug('Sam/../../x'), 'sam-x');
  assert.equal(personSlug('---'), '');
});

/* ---------- the endpoint ---------- */
let dir, port, srv;
const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
function call(method, path, body, headers = {}) {
  return new Promise((res, rej) => {
    const raw = body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body));
    const h = { Host: `localhost:${port}`, ...(raw !== undefined ? { 'Content-Type': 'application/json' } : {}), Origin: `http://localhost:${port}`, 'Sec-Fetch-Site': 'same-origin', ...headers };
    for (const k of Object.keys(h)) if (h[k] === null) delete h[k];
    const req = request({ host: '127.0.0.1', port, method, path, headers: h, agent: false }, (r) => {
      const chunks = [];
      r.on('error', () => res({ status: r.statusCode, json: null, buf: Buffer.concat(chunks), headers: r.headers }));   // closed early (413 before the upload ended)
      r.on('data', d => chunks.push(d));
      r.on('end', () => { const buf = Buffer.concat(chunks); let json = null; try { json = JSON.parse(buf.toString('utf8')); } catch {} res({ status: r.statusCode, json, buf, headers: r.headers }); });
    });
    req.on('error', rej);
    if (raw !== undefined) req.write(raw);
    req.end();
  });
}
before(async () => {
  dir = makeDataDir();
  port = await freePort();
  const { main } = await import('../server/index.mjs');
  srv = await main(['--port', String(port), '--no-open', '--data-dir', dir, '--fresh']);
});
after(async () => { await srv?.close(); rmSync(dir, { recursive: true, force: true }); });

test('POST /api/people/image stores a checked picture in the data folder; GET serves it back', async () => {
  const pic = png(256, 256);
  const r = await call('POST', '/api/people/image', { person: 'sam', kind: 'avatar', data: dataUrl('image/png', pic) });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.match(r.json.ref, /^file:sam-avatar-[0-9a-f]{16}\.png$/);
  assert.equal(refKind(r.json.ref), 'file');
  const file = join(dir, 'people', 'images', r.json.name);
  assert.ok(existsSync(file), 'kept inside <data>/people/images');
  assert.deepEqual(readFileSync(file), pic);
  const g = await call('GET', r.json.url);
  assert.equal(g.status, 200);
  assert.equal(g.headers['content-type'], 'image/png');
  assert.equal(g.headers['x-content-type-options'], 'nosniff');
  assert.deepEqual(g.buf, pic);
  // The same picture again is the same file; a cover goes beside it.
  const r2 = await call('POST', '/api/people/image', { person: 'sam', kind: 'avatar', data: dataUrl('image/png', pic) });
  assert.equal(r2.json.name, r.json.name);
  const c = await call('POST', '/api/people/image', { person: 'sam', kind: 'cover', data: dataUrl('image/webp', webp(1200, 400)) });
  assert.equal(c.status, 200); assert.match(c.json.ref, /^file:sam-cover-[0-9a-f]{16}\.webp$/);
});

test('the endpoint refuses what it should: validation, size cap, unknown people, guards', async () => {
  const post = (body, headers) => call('POST', '/api/people/image', body, headers);
  assert.equal((await post({ person: 'nobody', kind: 'avatar', data: dataUrl('image/png', png(8, 8)) })).status, 404);
  assert.equal((await post({ person: 'sam', kind: 'wallpaper', data: dataUrl('image/png', png(8, 8)) })).status, 400);
  assert.equal((await post({ kind: 'avatar', data: dataUrl('image/png', png(8, 8)) })).status, 400);
  const svg = await post({ person: 'sam', kind: 'avatar', data: 'data:image/svg+xml;base64,' + Buffer.from('<svg/>').toString('base64') });
  assert.equal(svg.status, 415); assert.equal(svg.json.code, 'NOT_AN_IMAGE');
  assert.equal((await post({ person: 'sam', kind: 'avatar', data: dataUrl('image/gif', png(8, 8)) })).status, 422);
  assert.equal((await post({ person: 'sam', kind: 'avatar', data: dataUrl('image/png', png(8, 8, LIMITS.avatar)) })).status, 413);
  // Bigger than any picture may be: the body limit stops it before it is read.
  // (The server may answer 413 and close before the upload has finished: a reset counts too.)
  const huge = await post({ person: 'sam', kind: 'cover', data: dataUrl('image/png', png(8, 8, LIMITS.cover * 2)) }).catch(e => ({ status: e.code }));
  assert.ok([413, 'ECONNRESET', 'EPIPE'].includes(huge.status), String(huge.status));
  assert.equal(readdirSync(join(dir, 'people', 'images')).filter(f => f.endsWith('.png') && f.includes('-cover-')).length, 0, 'nothing was stored');
  assert.equal((await post({ person: 'sam', kind: 'avatar', data: dataUrl('image/png', png(8, 8)) }, { Origin: 'http://evil.example', 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal((await post('person=sam', { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await post({ person: 'sam', kind: 'avatar', data: dataUrl('image/png', png(8, 8)) }, { Host: 'evil.example' })).status, 421);
  assert.equal((await call('GET', '/api/people/image')).status === 200, false);
});

test('GET only serves names this server makes: no path tricks', async () => {
  for (const p of [
    '/api/people/image/..%2Fstate%2Fdashboard-state.json', '/api/people/image/../state/dashboard-state.json',
    '/api/people/image/%2e%2e%2f%2e%2e%2fconfig.json', '/api/people/image/sam-avatar-0123456789abcdef.png%00.txt',
    '/api/people/image/config.json', '/api/people/image/sam-avatar-0123456789abcdef.svg', '/api/people/image/%E0%A4%A',
    '/api/people/image/sam-avatar-ffffffffffffffff.png',
  ]) {
    const r = await call('GET', p);
    assert.notEqual(r.status, 200, p);
    assert.ok(!r.buf.toString('utf8').includes('"_lastSave"'), p + ' must not leak the state');
  }
});

/* ---------- actions layer ---------- */
test('person.update photo / cover: checked references, undoable', async () => {
  const d = makeDataDir();
  try {
    const a = createActions({ dataDir: d });
    const run = (ops) => a.apply({ ops, source: 'mcp', client: 'test' });
    const disk = () => JSON.parse(readFileSync(join(d, 'state', 'dashboard-state.json'), 'utf8'));
    const r = await run([{ op: 'person.update', id: 'sam', photo: 'gravatar:' + 'b'.repeat(64), cover: 'preset:' + COVER_PRESETS[1] }]);
    let sam = disk().people.find(p => p.id === 'sam');
    assert.equal(sam.photo, 'gravatar:' + 'b'.repeat(64)); assert.equal(sam.cover, 'preset:' + COVER_PRESETS[1]);
    await run([{ op: 'person.update', id: 'sam', photo: 'file:sam-avatar-0123456789abcdef.webp', cover: 'file:sam-cover-0123456789abcdef.jpg' }]);
    for (const bad of [{ photo: 'https://example.org/a.png' }, { photo: 'file:../x' }, { photo: 'file:sam-cover-0123456789abcdef.jpg' }, { cover: 'gravatar:' + 'b'.repeat(64) }, { cover: 'preset:nope' }]) {
      await assert.rejects(run([{ op: 'person.update', id: 'sam', ...bad }]), (e) => e.code === 'BAD_VALUE', JSON.stringify(bad));
    }
    await a.undo(r.undo, { source: 'mcp' }).catch(() => null);
    await run([{ op: 'person.update', id: 'sam', photo: '', cover: '' }]);
    sam = disk().people.find(p => p.id === 'sam');
    assert.ok(!('photo' in sam) && !('cover' in sam), "'' removes them");
    const d2 = a.describe().ops.find(o => o.name === 'person.update');
    assert.ok(d2.schema.properties.photo && d2.schema.properties.cover, 'MCP sees the fields');
    assert.match(d2.schema.properties.photo.description, /gravatar/i);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('assign people to tasks: the pairs go as ONE batch of task.link_person and undo together', async () => {
  const d = makeDataDir();
  try {
    const a = createActions({ dataDir: d });
    const disk = () => JSON.parse(readFileSync(join(d, 'state', 'dashboard-state.json'), 'utf8'));
    const linkedOf = (tid) => (disk().custom.find(t => t.id === tid).people || []);
    const pairs = pcAssignPairs(['u-1-aaa', 'u-3-ccc', 'u-4-ddd'], ['sam', 'alex'], linkedOf);
    assert.equal(pairs.length, 5, 'u-1-aaa already has sam');
    const r = await a.apply({ ops: pairs.map(x => ({ op: 'task.link_person', id: x.taskId, person: x.personId })), source: 'ui', client: 'people assign' });
    for (const x of pairs) assert.ok(linkedOf(x.taskId).includes(x.personId), `${x.taskId} ${x.personId}`);
    assert.deepEqual(pcAssignPairs(['u-1-aaa', 'u-3-ccc', 'u-4-ddd'], ['sam', 'alex'], linkedOf), [], 'nothing left to do');
    await a.undo(r.undo, { source: 'ui' });
    assert.deepEqual(linkedOf('u-3-ccc'), []);
    assert.deepEqual(linkedOf('u-1-aaa'), ['sam']);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

/* ---------- openPerson on the page ---------- */
function pageBox(o = {}) {
  const calls = [];
  const people = [{ id: 'sam', name: 'Sam Taylor' }, { id: 'alex', name: 'Alex Kim' }, { id: 'me', name: 'Me', self: true }];
  const ctx = {
    console, Math, JSON, Date, setTimeout, calls,
    state: { view: o.view || 'people', openItemsIn: o.setting || 'card' },
    document: { addEventListener() {}, querySelectorAll: () => [], activeElement: null },
    window: {}, CSS: { escape: (s) => s },
    getPerson: (id) => people.find(p => p.id === id),
    itemOpenSetting: () => (o.setting === 'panel' ? 'panel' : 'card'),
    setView: (v) => { calls.push(['setView', v]); ctx.state.view = v; },
    saveUI() {}, render() { calls.push(['render']); }, _syncViewHash() {},
    tcOpen: (entry) => { calls.push(['tcOpen', entry.kind, entry.id]); ctx._tc = { stack: [entry], closing: false, root: { contains: () => false } }; },
    tcClose: () => { calls.push(['tcClose']); ctx._tc = null; },
    _tcCur: () => (ctx._tc ? ctx._tc.stack[ctx._tc.stack.length - 1] : null),
    _tcFocusStart: () => calls.push(['focus']),
    _tcClosePanel: () => calls.push(['closeTaskPanel']),
    _tc: null,
  };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(join(APP, '54-people-card-logic.js'), 'utf8'), ctx);
  vm.runInContext(readFileSync(join(APP, '54-people-card.js'), 'utf8').replace(/^let (_pcModeSession|_pcPageList|_pcShowDone|_pcAllTasks)/gm, 'var $1'), ctx);
  return ctx;
}

test('openPerson: the centre card by default, the panel when chosen, the switches, and no-ops', () => {
  const b = pageBox();
  assert.equal(b.openPerson('sam'), 'card');
  assert.deepEqual(b.calls.filter(c => c[0] === 'tcOpen'), [['tcOpen', 'person', 'sam']]);
  assert.equal(b.pcCurrentPersonId(), 'sam');
  b.calls.length = 0;
  assert.equal(b.openPerson('sam'), 'card', 'the person already shown: nothing re-opens');
  assert.deepEqual(b.calls, [['focus']]);
  assert.equal(b.openPerson('me'), false, 'the user\'s own record never opens');
  assert.equal(b.openPerson('ghost'), false);
  // "Open in side panel": this session's people open in the panel (the People page's person view).
  b.pcToPanel('sam');
  assert.equal(b.state.view, 'person:sam');
  assert.equal(b._tc, null);
  b.calls.length = 0;
  assert.equal(b.openPerson('alex'), 'panel');
  assert.deepEqual(b.calls, [['setView', 'person:alex']]);
  // "Open in the centre" from the panel: back to the card, leaving the person view.
  assert.equal(b.pcToCard('alex'), 'card');
  assert.equal(b.state.view, 'people');
  assert.equal(b.pcCurrentPersonId(), 'alex');
  assert.equal(b.openPerson('sam', { mode: 'panel' }), 'panel', 'an explicit mode wins');
  // Settings > Tasks "Side panel" sends people to the panel too.
  const p = pageBox({ setting: 'panel' });
  assert.equal(p.openPerson('sam'), 'panel');
  assert.equal(p.state.view, 'person:sam');
  assert.equal(p.openPerson('sam', { mode: 'card' }), 'card');
});

test('every place that opens a person goes through openPerson', () => {
  const offenders = [];
  for (const f of readdirSync(APP).filter(f => f.endsWith('.js'))) {
    if (f === '51-people-section.js' || f === '54-people-card.js') continue;   // the panel itself and the switch
    const src = readFileSync(join(APP, f), 'utf8');
    if (/setView\(\s*['"]person:['"]\s*\+/.test(src)) offenders.push(f);
  }
  assert.deepEqual(offenders, []);
  const sec = readFileSync(join(APP, '51-people-section.js'), 'utf8');
  assert.match(sec, /openPerson\(p\.id, \{ from: el \}\)/, 'People rows and cards');
  assert.match(sec, /onClick: \(\) => openPerson\(p\.id/, 'the sidebar');
  for (const f of ['60-task-detail.js', '43-calendar-panel.js', '46-cal-event-edit.js', '16-command-palette.js', '28-customise.js']) {
    assert.match(readFileSync(join(APP, f), 'utf8'), /openPerson\(/, f);
  }
  const card = readFileSync(join(APP, '61-task-card.js'), 'utf8');
  for (const hook of ["cur.kind === 'person') pcPersonView", "e.kind === 'person') return !!getPerson", "pcCardKey(k, cur)", "pcToPanel(cur.id)"]) assert.ok(card.includes(hook), hook);
});

test('the People actions are on the page: toolbar, per-person link picker, bulk assign', () => {
  const src = readFileSync(join(APP, '54-people-card.js'), 'utf8');
  for (const label of ['Find people in emails', 'Check email', 'Review suggested links', 'Assign to tasks…', 'Link tasks…', 'Use Gravatar', 'From Gmail or Google']) assert.ok(src.includes(label), label);
  assert.match(src, /selectList\(/, 'lists of choices use the shared select list');
  assert.match(src, /op: 'task\.link_person'/);
  assert.match(src, /op: 'person\.update', id, \[kind === 'avatar' \? 'photo' : 'cover'\]: j\.ref/);
  assert.ok(readFileSync(join(APP, '51-people-section.js'), 'utf8').includes('pcPeopleToolbar()'));
});
