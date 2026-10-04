// server/actions/auth.mjs - the per-install token and the runtime file.
//
//   <data>/local-token    32 random bytes (hex), created on first boot, readable
//                         only by the user (0600 where the OS supports it).
//                         Local non-browser clients (the MCP server in HTTP
//                         mode, tools/actions-cli.mjs) send it as
//                         X-Dashboard-Token. The page never needs it: it is
//                         same-origin.
//   <data>/runtime.json   {app, pid, port, url, stateFile, startedAt, version},
//                         written by the server once it listens and removed
//                         when it stops. The MCP server uses it to find a
//                         running dashboard; a dead pid or a server that
//                         answers for a different data folder marks it stale.
//
// It also signs the confirm tokens a dry run hands out (HMAC with the local
// token), so a confirm survives a server restart and works in embedded mode.

import { existsSync, readFileSync, unlinkSync, promises as fsp } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { atomicWrite, withLock, readJson } from '../../lib/fsutil.mjs';

export const TOKEN_HEADER = 'x-dashboard-token';
export const tokenPath = (dataDir) => join(dataDir, 'local-token');
export const runtimePath = (dataDir) => join(dataDir, 'runtime.json');

/** Read the token, creating it (once, under a lock) if it does not exist. */
export async function ensureLocalToken(dataDir) {
  const file = tokenPath(dataDir);
  const read = () => { try { const t = readFileSync(file, 'utf8').trim(); return /^[0-9a-f]{64}$/.test(t) ? t : null; } catch { return null; } };
  let t = read();
  if (t) return t;
  return withLock(file, async () => {
    let cur = read();
    if (cur) return cur;
    cur = randomBytes(32).toString('hex');
    await atomicWrite(file, cur + '\n', { mode: 0o600 });
    await fsp.chmod(file, 0o600).catch(() => {});
    return cur;
  });
}
export function readLocalToken(dataDir) {
  try { const t = readFileSync(tokenPath(dataDir), 'utf8').trim(); return /^[0-9a-f]{64}$/.test(t) ? t : null; } catch { return null; }
}

/** Constant-time comparison of a presented token with the real one. */
export function tokenMatches(presented, real) {
  if (!presented || !real) return false;
  const a = Buffer.from(String(presented)), b = Buffer.from(String(real));
  return a.length === b.length && timingSafeEqual(a, b);
}

// ─── runtime.json ──────────────────────────────────────────────────────────
export async function writeRuntime(dataDir, info) {
  await atomicWrite(runtimePath(dataDir), JSON.stringify({ app: 'dashboard', ...info }, null, 1));
}
export async function removeRuntime(dataDir, pid = process.pid) {
  const f = runtimePath(dataDir);
  try {
    const cur = JSON.parse(await fsp.readFile(f, 'utf8'));
    if (cur && cur.pid === pid) await fsp.unlink(f);
  } catch { /* gone already */ }
}
export function removeRuntimeSync(dataDir, pid = process.pid) {
  const f = runtimePath(dataDir);
  try {
    const cur = JSON.parse(readFileSync(f, 'utf8'));
    if (cur && cur.pid === pid) unlinkSync(f);
  } catch { /* gone already */ }
}

export function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

const samePath = (a, b) => {
  const n = (p) => String(p || '').replace(/[\\/]+/g, '/').replace(/\/$/, '');
  return process.platform === 'win32' || process.platform === 'darwin' ? n(a).toLowerCase() === n(b).toLowerCase() : n(a) === n(b);
};

/**
 * Find a running dashboard server for this data folder.
 * Returns {port, url, pid} or {stale: reason} or null (no runtime file).
 */
// timeoutMs only matters when the port accepts but is slow to answer (a server
// that is not there refuses at once): a busy machine's live dashboard is
// better than falling back to embedded mode, so it is generous.
export async function discoverServer(dataDir, { stateFile, port: forcedPort, timeoutMs = 5000 } = {}) {
  let rt = null;
  if (existsSync(runtimePath(dataDir))) rt = await readJson(runtimePath(dataDir), { fallback: null }).catch(() => null);
  const port = forcedPort || (rt && rt.port);
  if (!port) return rt ? { stale: 'runtime.json has no port' } : null;
  if (!forcedPort && rt && rt.pid && !pidAlive(rt.pid)) return { stale: `the process ${rt.pid} in runtime.json is not running` };
  try {
    // ?quick=1: a server that has just (re)started answers at once instead of
    // waiting for its AI probe (up to 8 s), which would make this time out and
    // send MCP clients to embedded mode after every restart. Older servers ignore it.
    const r = await fetch(`http://127.0.0.1:${port}/api/health?quick=1`, { headers: { Host: `localhost:${port}` }, signal: AbortSignal.timeout(timeoutMs) });
    const h = await r.json();
    if (!h || h.app !== 'dashboard') return { stale: `port ${port} is not a dashboard` };
    if (stateFile && h.stateFile && !samePath(h.stateFile, stateFile)) return { stale: `the dashboard on port ${port} uses a different data folder` };
    return { port, url: `http://localhost:${port}`, pid: rt && rt.pid };
  } catch (e) {
    return { stale: `no answer on port ${port} (${e.name === 'TimeoutError' ? 'timeout' : e.code || e.message})` };
  }
}

// ─── Confirm tokens (dry run -> apply) ────────────────────────────────────
export const sha = (s) => createHash('sha256').update(String(s)).digest('base64url').slice(0, 32);
const mac = (secret, msg) => createHmac('sha256', secret).update(msg).digest('base64url').slice(0, 32);

export function signConfirm(secret, { opsHash, previewHash, ttlMs = 15 * 60 * 1000, now = Date.now() }) {
  const exp = now + ttlMs;
  return `c1.${exp}.${opsHash}.${previewHash}.${mac(secret, `${exp}.${opsHash}.${previewHash}`)}`;
}
/** -> {ok:true, previewHash} | {ok:false, why} */
export function verifyConfirm(secret, token, { opsHash, now = Date.now() }) {
  const m = /^c1\.(\d{10,16})\.([\w-]{32})\.([\w-]{32})\.([\w-]{32})$/.exec(String(token || ''));
  if (!m) return { ok: false, why: 'malformed confirm token' };
  const [, exp, oh, ph, sig] = m;
  if (!tokenMatches(sig, mac(secret, `${exp}.${oh}.${ph}`))) return { ok: false, why: 'confirm token signature does not match' };
  if (Number(exp) < now) return { ok: false, why: 'confirm token expired (15 minutes): run the dry run again' };
  if (oh !== opsHash) return { ok: false, why: 'confirm token is for a different set of ops: send exactly the ops of the dry run' };
  return { ok: true, previewHash: ph };
}
