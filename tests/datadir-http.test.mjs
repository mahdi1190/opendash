// lib/datadir.mjs (data dir resolution, config validation, legacy detection)
// and server/http.mjs helpers (origin/host checks, escaping, config injection).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import {
  resolveDataDir, dataPaths, validateConfig, publicConfig, legacyStatus, ensureDataDir, DEFAULT_CONFIG, saveConfig, loadConfig, systemTimeZone,
} from '../lib/datadir.mjs';
import { sameOrigin, hostAllowed, esc, injectConfig, CONFIG_TAG } from '../server/http.mjs';

test('data dir: --data-dir, then DASHBOARD_DATA_DIR, then <repo>/data', () => {
  assert.equal(resolveDataDir({ argv: ['--data-dir', 'X:/d'], env: { DASHBOARD_DATA_DIR: 'Y:/e' } }), resolve('X:/d'));
  assert.equal(resolveDataDir({ argv: ['--data-dir=X:/d'], env: {} }), resolve('X:/d'));
  assert.equal(resolveDataDir({ argv: [], env: { DASHBOARD_DATA_DIR: 'Y:/e' } }), resolve('Y:/e'));
  assert.equal(resolveDataDir({ argv: [], env: {}, repoRoot: 'Z:/repo' }), join('Z:/repo', 'data'));
  const p = dataPaths('Q:/data');
  assert.equal(p.stateFile, join(resolve('Q:/data'), 'state', 'dashboard-state.json'));
  assert.equal(p.finance, join(resolve('Q:/data'), 'finance'));
});

test('config defaults are generic and complete', () => {
  const c = validateConfig({}).config;
  assert.equal(c.userName, '');
  assert.equal(c.currency, 'GBP');
  assert.equal(c.locale, 'en-GB');
  assert.equal(c.timezone, systemTimeZone(), 'this computer\'s zone, never a fixed one (tests/timezones.test.mjs)');
  assert.equal(c.weekStart, 'Mon');
  assert.equal(c.ai.chatModel, 'claude-opus-5-5');
  assert.equal(c.ai.effort, 'medium');
  assert.deepEqual(Object.keys(c.features).sort(), Object.keys(DEFAULT_CONFIG.features).sort());
});

test('config validation rejects bad values and strips markup from the name', () => {
  const { config, errors } = validateConfig({ userName: '<b>Al</b>', currency: 'gbp', weekStart: 'Thu', timezone: 'Mars/Base', ai: { model: 'gpt' } });
  assert.equal(config.userName, 'bAl/b');
  assert.ok(errors.length >= 4);
  assert.equal(config.currency, 'GBP');
  assert.equal(validateConfig({ timezone: 'America/New_York', locale: 'en-US', weekStart: 'Sun' }).errors.length, 0);
  assert.ok(!('financeDir' in publicConfig(validateConfig({ financeDir: 'C:/x' }).config)));
});

test('ensureDataDir creates the layout without overwriting; saveConfig validates', async () => {
  const d = mkdtempSync(join(tmpdir(), 'dd-test-'));
  try {
    writeFileSync(join(d, 'config.json'), JSON.stringify({ userName: 'Kept' }));
    await ensureDataDir(d);
    for (const f of ['state', 'finance', 'calendar', 'email', 'logs', 'connections.json', 'migrations.json']) assert.ok(existsSync(join(d, f)), f);
    assert.equal(JSON.parse(readFileSync(join(d, 'config.json'), 'utf8')).userName, 'Kept');
    await assert.rejects(saveConfig(d, { weekStart: 'Fri' }), e => e.status === 400);
    const c = await saveConfig(d, { currency: 'EUR' });
    assert.equal(c.currency, 'EUR');
    assert.equal((await loadConfig(d)).userName, 'Kept');
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('legacy detection: only when the data dir has no state but <repo>/state does', () => {
  const root = mkdtempSync(join(tmpdir(), 'legacy-test-'));
  try {
    const repo = join(root, 'repo'), data = join(root, 'data');
    assert.equal(legacyStatus({ dataDir: data, repoRoot: repo }), null);
    mkdirSync(join(repo, 'state'), { recursive: true });
    writeFileSync(join(repo, 'state', 'dashboard-state.json'), '{"custom":[]}');
    const l = legacyStatus({ dataDir: join(repo, 'data'), repoRoot: repo });
    assert.equal(l.command, 'node tools/migrate.mjs 001-data-dir');
    mkdirSync(join(repo, 'data', 'state'), { recursive: true });
    writeFileSync(join(repo, 'data', 'state', 'dashboard-state.json'), '{"custom":[]}');
    assert.equal(legacyStatus({ dataDir: join(repo, 'data'), repoRoot: repo }), null);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('sameOrigin / hostAllowed', () => {
  const req = (h) => ({ headers: h });
  assert.ok(sameOrigin(req({}), 4201));
  assert.ok(sameOrigin(req({ origin: 'http://localhost:4201', 'sec-fetch-site': 'same-origin' }), 4201));
  assert.ok(sameOrigin(req({ origin: 'http://127.0.0.1:4201' }), 4201));
  assert.ok(!sameOrigin(req({ origin: 'http://localhost:4202' }), 4201));
  assert.ok(!sameOrigin(req({ origin: 'https://evil.example' }), 4201));
  assert.ok(!sameOrigin(req({ 'sec-fetch-site': 'cross-site' }), 4201));
  assert.ok(!sameOrigin(req({ 'sec-fetch-site': 'same-site' }), 4201));
  assert.ok(hostAllowed(req({ host: 'localhost:4201' }), 4201));
  assert.ok(hostAllowed(req({ host: '127.0.0.1:4201' }), 4201));
  assert.ok(!hostAllowed(req({ host: 'evil.example:4201' }), 4201));
  assert.ok(!hostAllowed(req({ host: 'localhost' }), 4201));
});

test('esc and injectConfig', () => {
  assert.equal(esc(`<img src=x onerror="a('b')">&`), '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;');
  assert.equal(esc(null), '');
  const html = `<head>${CONFIG_TAG}</head>`;
  const out = injectConfig(html, { userName: '</script><script>alert(1)</script>', note: 'a' + String.fromCharCode(0x2028) + 'b' });
  assert.ok(!out.slice(6).includes('</script><script>'));
  const m = /<script id="dashboard-config" type="application\/json">(.*)<\/script>/.exec(out);
  assert.equal(JSON.parse(m[1]).userName, '</script><script>alert(1)</script>');
});
