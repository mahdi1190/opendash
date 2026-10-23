// The automatic "main computer" (lib/sync/live/lease.mjs) on a fake clock:
// two or three devices that exchange claims over live links or through the
// folder, one going to sleep (no heartbeat), a preferred device coming back,
// a network split and its healing, a user's pin, and a device that cannot
// do the job. The rule checked everywhere: while devices can hear each other,
// never two acting at once.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLeases, cleanClaims, LIVE_TTL_MS, FOLDER_TTL_MS } from '../lib/sync/live/lease.mjs';

const A = 'a'.repeat(16), B = 'b'.repeat(16), C = 'c'.repeat(16);
const ROLES = ['phone', 'fetch:acc1'];

/** Devices on one fake clock. link: 'live' (instant), 'folder' (delayed copies), or 'none'. */
function world(ids, { pins = {}, eligible = {}, folderDelayMs = 20000 } = {}) {
  let t = 1_000_000;
  const now = () => t;
  const devs = ids.map((id) => ({ id, awake: true, L: createLeases({ me: id, now, roles: () => ROLES, eligible: (r) => (eligible[id] ? eligible[id](r) : true), pin: (r) => pins[r] || null }) }));
  const W = { devs, link: 'live', inFlight: [], t: () => t, history: [] };
  const by = (id) => devs.find(d => d.id === id);
  W.by = by;
  W.exchange = () => {
    const live = W.link === 'live';
    for (const d of devs) if (d.awake) d.L.renew(live);
    if (live) {
      for (let round = 0; round < 3; round++) {
        for (const d of devs) {
          if (!d.awake) continue;
          const m = d.L.publish('live');
          for (const o of devs) if (o !== d && o.awake) o.L.receive(d.id, m, { via: 'live', recvAt: t });
        }
      }
    } else if (W.link === 'folder') {
      for (const d of devs) if (d.awake) W.inFlight.push({ from: d.id, m: d.L.publish('folder'), at: t + folderDelayMs });
      W.inFlight = W.inFlight.filter((x) => {
        if (x.at > t) return true;
        for (const o of devs) if (o.id !== x.from && o.awake) o.L.receive(x.from, x.m, { via: 'folder' });
        return false;
      });
    }
  };
  W.step = (ms, every = 1000) => {
    for (let s = 0; s < ms; s += every) {
      t += Math.min(every, ms - s);
      W.exchange();
      W.history.push({ t, phone: W.mains('phone') });
    }
  };
  W.mains = (role) => devs.filter(d => d.awake && d.L.isMain(role)).map(d => d.id);
  W.start = () => { for (const d of devs) { d.L.setReady(true); W.exchange(); t += 1; } W.exchange(); };
  return W;
}
const neverTwo = (W, from = 0) => { for (const h of W.history.slice(from)) assert.ok(h.phone.length <= 1, `two main computers at t=${h.t}: ${h.phone}`); };

test('two devices on a live link agree on one main computer per job, and it stays put', () => {
  const W = world([A, B]);
  W.start();
  assert.deepEqual(W.mains('phone'), [A], 'the first to claim holds it');
  assert.deepEqual(W.mains('fetch:acc1'), [A]);
  W.step(10 * 60 * 1000);
  neverTwo(W);
  assert.ok(W.history.every(h => h.phone.length === 1), 'never without one either');
  assert.equal(W.by(B).L.holder('phone').deviceId, A, 'B sees A as holder');
  assert.equal(W.by(B).L.holder('phone').acting, true);
});

test('the main computer goes to sleep: the other takes over when its 30 s claim runs out; on waking it does not snatch it back', () => {
  const W = world([A, B]);
  W.start();
  W.step(20000);
  W.by(A).awake = false;
  const slept = W.t();
  W.step(LIVE_TTL_MS - 2000, 500);
  assert.deepEqual(W.mains('phone'), [], 'nobody while A might still be working');
  W.step(4000, 500);
  assert.deepEqual(W.mains('phone'), [B], 'B took over');
  const took = W.history.find(h => h.phone.includes(B)).t - slept;
  assert.ok(took >= LIVE_TTL_MS - 1000 && took <= LIVE_TTL_MS + 11000, `took over after ${took} ms`);
  const mark = W.history.length;
  W.by(A).awake = true;
  assert.equal(W.by(A).L.isMain('phone'), false, 'a device that slept never acts on its old claim');
  W.step(60000, 500);
  neverTwo(W, mark);
  assert.deepEqual(W.mains('phone'), [B], 'B keeps it: A starts a new claim');
});

test('"home laptop first": the preferred device gets the job back when it returns, with a clean handover', () => {
  const W = world([A, B]);
  W.start();
  assert.deepEqual(W.mains('phone'), [A]);
  W.by(A).L.setPrefs([B, A]);
  const mark = W.history.length;
  W.step(5000, 250);
  neverTwo(W, mark);
  assert.deepEqual(W.mains('phone'), [B], 'B is preferred');
  assert.deepEqual(W.by(B).L.prefs.list, [B, A], 'the newest preference list reaches every device');
  W.by(B).awake = false;
  W.step(LIVE_TTL_MS + 12000, 500);
  assert.deepEqual(W.mains('phone'), [A], 'A covers while B sleeps');
  const back = W.history.length;
  W.by(B).awake = true;
  W.step(5000, 250);
  neverTwo(W, back);
  assert.deepEqual(W.mains('phone'), [B], 'B takes it back');
});

test('a network split: both act until it heals (they cannot outvote each other); then exactly one again', () => {
  const W = world([A, B]);
  W.start();
  W.link = 'none';
  W.step(LIVE_TTL_MS + 12000, 1000);
  assert.deepEqual(W.mains('phone').sort(), [A, B], 'split brain while split (documented)');
  W.link = 'live';
  W.exchange();
  assert.equal(W.mains('phone').length, 1, 'one exchange after healing');
  const mark = W.history.length;
  W.step(60000);
  neverTwo(W, mark);
  assert.equal(W.mains('phone').length, 1);
});

test('through the folder only: claims last 3 minutes; a sleeping holder is replaced after that, never before', () => {
  const W = world([A, B], { folderDelayMs: 20000 });
  W.link = 'folder';
  for (const d of W.devs) d.L.setReady(true);
  W.step(2 * 60 * 1000, 5000);
  assert.equal(W.mains('phone').length, 1, `one main through the folder (${W.mains('phone')})`);
  const holder = W.mains('phone')[0];
  const other = holder === A ? B : A;
  W.by(holder).awake = false;
  const slept = W.t();
  W.step(FOLDER_TTL_MS - 30000, 5000);
  assert.deepEqual(W.mains('phone'), [], 'the other waits out the 3 minutes');
  W.step(3 * 60 * 1000, 5000);
  assert.deepEqual(W.mains('phone'), [other]);
  const took = W.history.find(h => h.t > slept && h.phone.includes(other)).t - slept;
  assert.ok(took >= FOLDER_TTL_MS - 60000, `took over after ${took} ms`);
});

test('the user\'s pin ("Use this computer instead") and who can do the job at all', () => {
  const W = world([A, B, C], { pins: { 'fetch:acc1': { d: C, at: 5 } }, eligible: { [B]: (r) => r !== 'fetch:acc1' } });
  W.start();
  assert.deepEqual(W.mains('fetch:acc1'), [C], 'the pinned device');
  assert.deepEqual(W.mains('phone'), [A], 'other jobs as before');
  W.by(C).awake = false;
  W.step(LIVE_TTL_MS + 12000, 1000);
  assert.deepEqual(W.mains('fetch:acc1'), [A], 'B has no sign-in for that account, so A covers');
  assert.equal(W.by(B).L.holder('fetch:acc1').deviceId, A);
  assert.equal(W.by(B).L.isMain('fetch:acc1'), false);
});

test('not ready (the folder not read yet): no claims and never main; junk claims are dropped', () => {
  const L = createLeases({ me: A, roles: () => ROLES });
  L.renew(true);
  assert.equal(L.isMain('phone'), false);
  assert.deepEqual(L.publish('live').roles, {});
  for (const bad of [null, {}, { v: 2, at: 1, ttl: 30000 }, { v: 1, at: 'x', ttl: 30000 }, { v: 1, at: 1, ttl: 50 }, { v: 1, at: 1, ttl: 1e9 }]) assert.equal(cleanClaims(bad), null);
  const c = cleanClaims({ v: 1, at: 5, ttl: 30000, roles: { phone: { since: 1, view: 'not-an-id' }, 'bad role!': { since: 1 }, 'fetch:x': { since: 'no' } }, prefs: { list: ['zz', B], at: 3 } });
  assert.deepEqual(Object.keys(c.roles), ['phone']);
  assert.equal(c.roles.phone.view, null);
  assert.deepEqual(c.prefs.list, [B]);
  assert.equal(L.receive(A, { v: 1, at: 1, ttl: 30000, roles: {} }), false, 'its own id is ignored');
});
