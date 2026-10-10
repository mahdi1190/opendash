import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { createApp } from '../server/router.mjs';
import registerNarration from '../server/routes/narration.mjs';
import { createNarration } from '../lib/narration.mjs';

const KEY = 'synthetic-elevenlabs-key';
const AUDIO = Buffer.from('ID3synthetic-provider-audio');

async function fixture(run, override = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'narration-route-test-')); const logs = [], network = [];
  const voice = createNarration({ dataDir: dir, fetchFn: async (url, opts) => { network.push({ url, opts }); return new Response(AUDIO, { headers: { 'Content-Type': 'audio/mpeg' } }); } });
  const ctx = { dataDir: dir, port: 4900, log: (...entry) => logs.push(entry), narration: voice, ...override };
  const app = createApp(ctx); registerNarration(app);
  async function http(path, { method = 'GET', origin, site, host = 'localhost:4900', body, contentType = 'application/json', raw } = {}) {
    const text = raw === undefined ? body === undefined ? '' : JSON.stringify(body) : raw;
    const req = Readable.from(text ? [Buffer.from(text)] : []);
    Object.assign(req, { url: path, method, headers: { host, ...(origin ? { origin } : {}), ...(site ? { 'sec-fetch-site': site } : {}),
      ...(text ? { 'content-type': contentType, 'content-length': Buffer.byteLength(text) } : {}) } });
    const res = { headersSent: false, headers: {}, setHeader(k, v) { this.headers[k] = v; }, writeHead(status, headers) { this.statusCode = status; this.headers = { ...this.headers, ...headers }; this.headersSent = true; }, end(body) { this.buffer = Buffer.isBuffer(body) ? body : Buffer.from(String(body || '')); this.text = this.buffer.toString('utf8'); } };
    assert.equal(await app.handle(req, res), true); return res;
  }
  try { await run({ app, voice, http, logs, network, dir }); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}

test('narration routes enforce same-origin reads and writes, local hosts and expected methods', async () => fixture(async ({ app, http, network }) => {
  assert.equal(app.routes.some(r => r.crossSite), false);
  const own = await http('/api/narration/status'); assert.equal(own.statusCode, 200); assert.equal(JSON.parse(own.text).connected, false); assert.equal(network.length, 0);
  for (const path of ['/api/narration/status', '/api/narration/voices', '/api/narration/audio?id=' + 'a'.repeat(64)]) {
    assert.equal((await http(path, { origin: 'https://example.test' })).statusCode, 403, path);
    assert.equal((await http(path, { site: 'cross-site' })).statusCode, 403, path);
    assert.equal((await http(path, { host: 'example.test:4900' })).statusCode, 421, path);
  }
  assert.equal((await http('/api/narration/settings', { method: 'POST', origin: 'https://example.test', body: { apiKey: KEY } })).statusCode, 403);
  assert.equal((await http('/api/narration/speech', { method: 'POST', site: 'cross-site', body: { text: 'A private script.' } })).statusCode, 403);
  assert.equal((await http('/api/narration/speech')).statusCode, 405);
  assert.equal((await http('/api/narration/voices', { method: 'POST', body: {} })).statusCode, 405);
  assert.equal(network.length, 0);
}));

test('narration routes validate JSON and cap settings/speech bodies before processing them', async () => fixture(async ({ http, network }) => {
  assert.equal((await http('/api/narration/settings', { method: 'POST', raw: '{broken' })).statusCode, 400);
  assert.equal((await http('/api/narration/settings', { method: 'POST', body: [] })).statusCode, 400);
  assert.equal((await http('/api/narration/settings', { method: 'POST', raw: '{}', contentType: 'text/plain' })).statusCode, 415);
  assert.equal((await http('/api/narration/settings', { method: 'POST', body: { apiKey: 'a'.repeat(8192) } })).statusCode, 413);
  assert.equal((await http('/api/narration/speech', { method: 'POST', body: { text: 'a'.repeat(24 * 1024) } })).statusCode, 413);
  assert.equal((await http('/api/narration/settings', { method: 'POST', body: { voiceId: '../outside' } })).statusCode, 400);
  assert.equal(network.length, 0);
}));

test('narration HTTP settings never return keys, and speech audio is private MP3 served through the guarded endpoint', async () => fixture(async ({ voice, http, logs, network }) => {
  const configure = await http('/api/narration/settings', { method: 'POST', origin: 'http://localhost:4900', body: { apiKey: KEY, provider: 'elevenlabs', voiceId: 'syntheticVoice', scope: 'all' } });
  assert.equal(configure.statusCode, 200); assert.equal(JSON.parse(configure.text).connected, true); assert.equal(configure.text.includes(KEY), false);
  const speech = await http('/api/narration/speech', { method: 'POST', body: { text: 'Welcome to your day.', delivery: { pauseMs: 0 }, kind: 'intro' } });
  assert.equal(speech.statusCode, 200); const out = JSON.parse(speech.text); assert.equal(out.cached, false); assert.equal(network.length, 1);
  assert.equal(speech.text.includes(KEY), false); assert.equal(speech.text.includes('Welcome'), false);
  const audio = await http(out.url, { site: 'same-origin' });
  assert.equal(audio.statusCode, 200); assert.deepEqual(audio.buffer, AUDIO); assert.equal(audio.headers['Content-Type'], 'audio/mpeg');
  assert.equal(audio.headers['Cache-Control'], 'private, no-store'); assert.equal(audio.headers['X-Content-Type-Options'], 'nosniff'); assert.equal(audio.headers['Content-Length'], AUDIO.length);
  assert.equal((await http('/api/narration/audio?id=../secrets/narration.json')).statusCode, 400);
  assert.equal((await http('/api/narration/audio?id=' + 'a'.repeat(64))).statusCode, 404);
  assert.equal(JSON.stringify(logs).includes(KEY), false); assert.equal(JSON.stringify(logs).includes('Welcome to your day.'), false);
  await voice.configure({ monthlyLimit: 0 });
  const replay = await http('/api/narration/speech', { method: 'POST', body: { text: 'Welcome to your day.', delivery: { pauseMs: 0 }, kind: 'intro' } });
  assert.equal(JSON.parse(replay.text).cached, true); assert.equal(network.length, 1);
}));

test('narration unexpected provider/storage errors never appear in HTTP responses or server logs', async () => fixture(async ({ http, logs }) => {
  for (const path of ['/api/narration/status', '/api/narration/voices']) {
    const res = await http(path); assert.equal(res.statusCode, 500); assert.equal(JSON.parse(res.text).code, 'NARRATION_ERROR');
    assert.equal(res.text.includes(KEY), false); assert.equal(res.text.includes('private synthetic narration'), false);
  }
  assert.equal(JSON.stringify(logs).includes(KEY), false); assert.equal(JSON.stringify(logs).includes('private synthetic narration'), false);
}, { narration: { status: async () => { throw new Error(KEY + ' private synthetic narration'); }, voices: async () => { throw new Error(KEY + ' private synthetic narration'); } } }));
