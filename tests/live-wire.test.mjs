// Live sync's wire (lib/sync/live/wire.mjs, handshake.mjs, session.mjs) over
// an in-memory pipe: frames cut anywhere, the handshake between two paired
// devices, and every way in that must fail: a device that was never paired,
// one that pretends to be a member, a replayed handshake or frame, changed
// bytes, an old sync key (a device removed in this epoch), another protocol
// version, oversized or slow handshakes, floods. Platform-agnostic code only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as X from '../lib/sync/e2e-crypto.mjs';
import { encodeFrame, createFrameReader, jsonBytes, MAX_HELLO_FRAME } from '../lib/sync/live/wire.mjs';
import { staticAuth } from '../lib/sync/live/handshake.mjs';
import { createSession } from '../lib/sync/live/session.mjs';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function device() {
  const kp = await X.newKeyPair();
  return { ...kp, deviceId: await X.deviceIdOf(kp.pub) };
}
const GROUP = '0123456789abcdef', KID = 'aaaaaaaaaaaaaaaa';
const PSK = X.randomBytes(32);
const authFor = (me, members, { kid = KID, psk = PSK, group = GROUP } = {}) => staticAuth({ identity: me, group, kid, psk, members: Object.fromEntries(members.map(m => [m.deviceId, m.pub])) });

/** Two connected byte streams. tap(from, bytes) may return other bytes, or null to drop them. */
function pipe(tap = null) {
  const side = () => ({ data: [], close: [], closed: false });
  const a = side(), b = side();
  const end = (me, other, name) => ({
    write(bytes) {
      if (me.closed || other.closed) return false;
      let out = bytes.slice();
      if (tap) { out = tap(name, out); if (!out) return true; }
      setImmediate(() => { if (!other.closed) for (const f of other.data) f(out); });
      return true;
    },
    // Like TCP: what was written before the close still arrives first.
    close() {
      if (!me.closed) { me.closed = true; for (const f of me.close) f(); }
      setImmediate(() => { if (!other.closed) { other.closed = true; for (const f of other.close) f(); } });
    },
    onData: (f) => me.data.push(f), onClose: (f) => me.close.push(f),
    remote: { address: '127.0.0.1', port: name === 'i' ? 2 : 1 },
  });
  /** Bytes straight to one end ('i' or 'r'), as if the other had sent them. */
  const inject = (to, bytes) => { const s = to === 'i' ? a : b; setImmediate(() => { if (!s.closed) for (const f of s.data) f(bytes); }); };
  return [end(a, b, 'i'), end(b, a, 'r'), inject];
}
/** Run a session pair; resolves with what happened on both sides. */
async function link({ iAuth, rAuth, peerId, tap, opts = {}, after = async () => {} }) {
  const [ci, cr] = pipe(tap);
  const ev = { i: { open: false, msgs: [], why: null }, r: { open: false, msgs: [], why: null, peer: null } };
  const I = createSession({ conn: ci, role: 'initiator', auth: iAuth, peerId, ...opts, onOpen: () => { ev.i.open = true; }, onMessage: (m) => ev.i.msgs.push(m), onClose: (w) => { ev.i.why = w; } });
  const R = createSession({ conn: cr, role: 'responder', auth: rAuth, ...opts, onOpen: (s) => { ev.r.open = true; ev.r.peer = s.peerId; }, onMessage: (m) => ev.r.msgs.push(m), onClose: (w) => { ev.r.why = w; } });
  for (let k = 0; k < 100 && !(ev.i.open && ev.r.open) && !(ev.i.why || ev.r.why); k++) await sleep(5);
  await after(I, R, ev);
  return { I, R, ev };
}

test('frames survive being cut anywhere; empty and oversized frames stop the reader', () => {
  const frames = [jsonBytes({ a: 1 }), new Uint8Array(70000).fill(7), jsonBytes({ t: 'x', s: 'é'.repeat(10) })];
  const all = new Uint8Array(frames.reduce((n, f) => n + f.length + 4, 0));
  let o = 0;
  for (const f of frames) { const e = encodeFrame(f); all.set(e, o); o += e.length; }
  for (const step of [1, 3, 4, 5, 999, 70004, all.length]) {
    const got = [];
    const r = createFrameReader({ onFrame: (f) => got.push(f) });
    for (let i = 0; i < all.length; i += step) r.push(all.subarray(i, i + step));
    assert.equal(got.length, 3, `chunks of ${step}`);
    assert.deepEqual([...got[1].subarray(0, 4)], [7, 7, 7, 7]);
    assert.equal(r.buffered, 0);
  }
  let err = null;
  const big = createFrameReader({ max: 1000, onFrame: () => assert.fail('no frame'), onError: (e) => { err = e; } });
  big.push(encodeFrame(new Uint8Array(1001)));
  assert.equal(err, 'frame-size');
  err = null;
  const zero = createFrameReader({ onFrame: () => assert.fail('no frame'), onError: (e) => { err = e; } });
  zero.push(Uint8Array.from([0, 0, 0, 0, 1]));
  assert.equal(err, 'frame-size');
});

test('two paired devices: mutual authentication, then sealed messages both ways, in order', async () => {
  const A = await device(), B = await device();
  const { I, R, ev } = await link({ iAuth: authFor(A, [B]), rAuth: authFor(B, [A]), peerId: B.deviceId });
  assert.ok(ev.i.open && ev.r.open, `both open (${ev.i.why} / ${ev.r.why})`);
  assert.equal(ev.r.peer, A.deviceId, 'the responder learns who dialled, from the proof');
  for (let i = 0; i < 20; i++) { I.send({ t: 'n', i }); R.send({ t: 'n', i: 100 + i }); }
  for (let k = 0; k < 100 && (ev.r.msgs.length < 20 || ev.i.msgs.length < 20); k++) await sleep(5);
  assert.deepEqual(ev.r.msgs.map(m => m.i), [...Array(20).keys()]);
  assert.deepEqual(ev.i.msgs.map(m => m.i), [...Array(20).keys()].map(i => i + 100));
  assert.equal(await I.send({ t: 'big', s: 'x'.repeat(5 * 1024 * 1024) }), false, 'a message bigger than a frame is not sent');
  I.close('bye');
  await sleep(20);
  assert.equal(R.state, 'closed');
});

test('a device that was never paired, or that only borrows a member id, gets nowhere', async () => {
  const A = await device(), B = await device(), C = await device();
  // C is not in B's member list.
  let r = await link({ iAuth: authFor(C, [B]), rAuth: authFor(B, [A]), peerId: B.deviceId });
  assert.equal(r.ev.r.why, 'unknown'); assert.ok(!r.ev.i.open && !r.ev.r.open);
  // C claims to be A (A's id, C's own key): the proof needs A's private key.
  const fakeA = { ...C, deviceId: A.deviceId };
  r = await link({ iAuth: authFor(fakeA, [B]), rAuth: authFor(B, [A]), peerId: B.deviceId });
  await sleep(20);
  assert.ok(!r.ev.r.open, 'the responder never opens');
  assert.equal(r.ev.i.why, 'auth', "the impostor cannot even read the responder's proof");
  assert.ok(['auth', 'closed'].includes(r.ev.r.why));
  // C answers a call meant for B (B's id, C's key): the caller refuses.
  const fakeB = { ...C, deviceId: B.deviceId };
  r = await link({ iAuth: authFor(A, [B]), rAuth: authFor(fakeB, [A]), peerId: B.deviceId });
  assert.ok(!r.ev.i.open);
  assert.equal(r.ev.i.why, 'auth');
  // A call for someone else, or for another group.
  r = await link({ iAuth: authFor(A, [B, C]), rAuth: authFor(B, [A]), peerId: C.deviceId });
  assert.equal(r.ev.r.why, 'not-for-me');
  r = await link({ iAuth: authFor(A, [B], { group: 'fedcba9876543210' }), rAuth: authFor(B, [A]), peerId: B.deviceId });
  assert.equal(r.ev.r.why, 'group');
});

test('a device removed in this key epoch cannot finish: new key id, or the same id with an old secret', async () => {
  const A = await device(), B = await device();
  let r = await link({ iAuth: authFor(A, [B], { kid: 'bbbbbbbbbbbbbbbb' }), rAuth: authFor(B, [A]), peerId: B.deviceId });
  assert.equal(r.ev.r.why, 'key-mismatch');
  assert.equal(r.ev.i.why, 'key-mismatch', 'the caller is told to wait for the new key');
  r = await link({ iAuth: authFor(A, [B], { psk: X.randomBytes(32) }), rAuth: authFor(B, [A]), peerId: B.deviceId });
  assert.ok(!r.ev.i.open && !r.ev.r.open);
  assert.equal(r.ev.i.why, 'auth');
});

test('replays: a recorded handshake or a repeated frame never opens a link or delivers anything', async () => {
  const A = await device(), B = await device();
  const recorded = [];
  const r1 = await link({ iAuth: authFor(A, [B]), rAuth: authFor(B, [A]), peerId: B.deviceId, tap: (from, b) => { if (from === 'i') recorded.push(b); return b; } });
  assert.ok(r1.ev.r.open);
  await r1.I.send({ t: 'secret', v: 1 });
  await sleep(20);
  assert.equal(r1.ev.r.msgs.length, 1);
  r1.I.close();
  // Replay everything A sent (hello, confirm, the sealed frame) to a fresh responder.
  const [ci, cr] = pipe();
  const ev = { open: false, msgs: [], why: null };
  createSession({ conn: cr, role: 'responder', auth: authFor(B, [A]), onOpen: () => { ev.open = true; }, onMessage: (m) => ev.msgs.push(m), onClose: (w) => { ev.why = w; } });
  ci.onData(() => {});
  for (const b of recorded) { ci.write(b); await sleep(10); }
  await sleep(30);
  assert.equal(ev.open, false);
  assert.equal(ev.why, 'auth', 'the old confirmation does not fit the new ephemeral key');
  assert.equal(ev.msgs.length, 0);
  // The responder's half replayed to a caller: its welcome was made for another ephemeral key.
  const fromR = [];
  const r3 = await link({ iAuth: authFor(A, [B]), rAuth: authFor(B, [A]), peerId: B.deviceId, tap: (from, b) => { if (from === 'r') fromR.push(b); return b; } });
  assert.ok(r3.ev.i.open);
  r3.I.close();
  const [ci2, cr2, inject] = pipe();
  const ev2 = { open: false, why: null };
  createSession({ conn: ci2, role: 'initiator', auth: authFor(A, [B]), peerId: B.deviceId, onOpen: () => { ev2.open = true; }, onClose: (w) => { ev2.why = w; } });
  cr2.onData(() => {});                         // nobody real answers
  await sleep(20);
  for (const b of fromR) inject('i', b);        // the recorded welcome (and frames) of the earlier link
  await sleep(30);
  assert.equal(ev2.open, false);
  assert.equal(ev2.why, 'auth');
});

test('changed bytes: a flipped bit in the handshake or in a sealed frame closes the link', async () => {
  const A = await device(), B = await device();
  // The welcome's proof.
  let n = 0;
  let r = await link({ iAuth: authFor(A, [B]), rAuth: authFor(B, [A]), peerId: B.deviceId, tap: (from, b) => { if (from === 'r' && n++ === 0) { const s = new TextDecoder().decode(b.subarray(4)); const m = JSON.parse(s); m.c = m.c.slice(0, 5) + (m.c[5] === 'A' ? 'B' : 'A') + m.c.slice(6); return encodeFrame(jsonBytes(m)); } return b; } });
  assert.equal(r.ev.i.why, 'auth');
  assert.ok(!r.ev.r.open);
  // A sealed frame after the handshake.
  let armed = false;
  r = await link({ iAuth: authFor(A, [B]), rAuth: authFor(B, [A]), peerId: B.deviceId, tap: (from, b) => { if (from === 'i' && armed) { armed = false; const c = b.slice(); c[c.length - 3] ^= 1; return c; } return b; } });
  assert.ok(r.ev.r.open);
  armed = true;
  await r.I.send({ t: 'n', i: 1 });
  await sleep(30);
  assert.equal(r.ev.r.why, 'tampered');
  assert.equal(r.ev.r.msgs.length, 0);
  // Duplicated: the same sealed frame delivered twice.
  let copy = 0;
  r = await link({ iAuth: authFor(A, [B]), rAuth: authFor(B, [A]), peerId: B.deviceId, tap: (from, b) => { if (from === 'i' && copy === 1) { copy = 2; const two = new Uint8Array(b.length * 2); two.set(b); two.set(b, b.length); return two; } return b; } });
  copy = 1;
  await r.I.send({ t: 'n', i: 7 });
  await sleep(30);
  assert.equal(r.ev.r.msgs.length, 1, 'taken once');
  assert.equal(r.ev.r.why, 'tampered', 'the replayed copy closes the link');
  // Dropped: a frame missing from the stream makes the next one fail.
  let drop = false;
  r = await link({ iAuth: authFor(A, [B]), rAuth: authFor(B, [A]), peerId: B.deviceId, tap: (from, b) => { if (from === 'i' && drop) { drop = false; return null; } return b; } });
  drop = true;
  await r.I.send({ t: 'n', i: 1 });
  await r.I.send({ t: 'n', i: 2 });
  await sleep(30);
  assert.equal(r.ev.r.msgs.length, 0);
  assert.equal(r.ev.r.why, 'tampered');
});

test('a newer protocol version is told which versions this side speaks; junk and slow handshakes are cut off', async () => {
  const A = await device(), B = await device();
  let r = await link({ iAuth: authFor(A, [B]), rAuth: authFor(B, [A]), peerId: B.deviceId, tap: (from, b) => { if (from === 'i') { const m = JSON.parse(new TextDecoder().decode(b.subarray(4))); if (m.t === 'hello') { m.v = 9; return encodeFrame(jsonBytes(m)); } } return b; } });
  assert.equal(r.ev.r.why, 'version');
  assert.equal(r.ev.i.why, 'version');
  // A big frame before the handshake.
  const [ci, cr] = pipe();
  let why = null;
  createSession({ conn: cr, role: 'responder', auth: authFor(B, [A]), onClose: (w) => { why = w; } });
  ci.write(encodeFrame(new Uint8Array(MAX_HELLO_FRAME + 1)));
  await sleep(20);
  assert.equal(why, 'frame-size');
  // Not JSON.
  const [ci2, cr2] = pipe();
  let why2 = null;
  createSession({ conn: cr2, role: 'responder', auth: authFor(B, [A]), onClose: (w) => { why2 = w; } });
  ci2.write(encodeFrame(new TextEncoder().encode('GET / HTTP/1.1')));
  await sleep(20);
  assert.equal(why2, 'format');
  // Says nothing.
  const [, cr3] = pipe();
  let why3 = null;
  createSession({ conn: cr3, role: 'responder', auth: authFor(B, [A]), handshakeMs: 60, onClose: (w) => { why3 = w; } });
  await sleep(120);
  assert.equal(why3, 'timeout');
});

test('a flood is cut off; a silent link is closed; an idle link keeps itself alive with pings', async () => {
  const A = await device(), B = await device();
  let r = await link({ iAuth: authFor(A, [B]), rAuth: authFor(B, [A]), peerId: B.deviceId, opts: { limits: { frames: 20 } } });
  assert.ok(r.ev.r.open);
  for (let i = 0; i < 60; i++) r.I.send({ t: 'n', i });
  await sleep(60);
  assert.equal(r.ev.r.why, 'rate');
  assert.ok(r.ev.r.msgs.length <= 20);
  // Keepalive: pings every 30 ms keep it open past the 120 ms idle limit.
  r = await link({ iAuth: authFor(A, [B]), rAuth: authFor(B, [A]), peerId: B.deviceId, opts: { pingMs: 30, idleMs: 120 } });
  await sleep(300);
  assert.equal(r.I.state, 'open'); assert.equal(r.R.state, 'open');
  assert.equal(r.ev.r.msgs.length, 0, 'pings are not messages');
  // A peer that goes silent (its frames vanish) is closed after the idle limit.
  let mute = false;
  r = await link({ iAuth: authFor(A, [B]), rAuth: authFor(B, [A]), peerId: B.deviceId, opts: { pingMs: 30, idleMs: 120 }, tap: (from, b) => (mute && from === 'i' ? null : b) });
  mute = true;
  await sleep(300);
  assert.equal(r.ev.r.why, 'idle');
  r.I.close(); r.R.close();
});

test('the live core imports nothing platform-specific (a phone or WebRTC transport reuses it)', () => {
  const LIVE = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'sync', 'live');
  const CORE = ['wire.mjs', 'handshake.mjs', 'session.mjs', 'addrbook.mjs', 'discovery.mjs', 'lease.mjs', 'nat.mjs', 'live.mjs'];
  for (const f of CORE) {
    const code = readFileSync(join(LIVE, f), 'utf8').split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    assert.doesNotMatch(code, /from\s+['"]node:|require\(|\bBuffer\b|\bprocess\.|__dirname/, `${f} must stay platform-agnostic`);
    for (const m of code.matchAll(/from\s+['"]([^'"]+)['"]/g)) assert.ok(CORE.includes(m[1].replace('./', '')) || m[1] === '../e2e-crypto.mjs', `${f} imports ${m[1]}`);
  }
});
