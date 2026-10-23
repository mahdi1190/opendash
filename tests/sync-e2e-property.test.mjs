// The 3-replica property test (tests/sync-property.test.mjs) with ENCRYPTION
// ON: the same random concurrent edits, skewed clocks and random delivery
// (out of order, twice, very late, whole snapshots), but every change travels
// sealed by the real key layer (lib/sync/e2e.mjs sealLine / sealSnapshot,
// opened with openLine / openSnapshot by the receiver), and the cloud also
// delivers corrupted copies that must be rejected. Every replica still ends
// with the same data and the same registers, and receiving never echoes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClock } from '../lib/sync/hlc.mjs';
import { capture, applyWrite, materialize, newTree, validateOp, syncedView, walkRegs, stable } from '../lib/sync/model.mjs';
import { createE2E } from '../lib/sync/e2e.mjs';
import * as X from '../lib/sync/e2e-crypto.mjs';
import { memorySecrets } from './sync-e2e.shared.mjs';

const FILE = 'ops-20261023.jsonl';

/** An in-memory shared folder for the key layer (keys.json / pair.json only). */
function memoryFolder() {
  const files = new Map();
  let t = 1;
  const listing = () => {
    const ids = [...new Set([...files.keys()].map(k => k.split('/')[0]))].sort();
    return ids.map(id => {
      const f = (n) => (files.has(`${id}/${n}`) ? { size: files.get(`${id}/${n}`).text.length, mtimeMs: files.get(`${id}/${n}`).m } : null);
      return { id, files: { logs: [], snapshot: null, device: null, keys: f('keys.json'), pair: f('pair.json') } };
    });
  };
  const adapter = (me) => ({
    readJson: async (id, n) => (files.has(`${id}/${n}`) ? JSON.parse(files.get(`${id}/${n}`).text) : null),
    writeOwnJson: async (n, v) => { files.set(`${me()}/${n}`, { text: JSON.stringify(v), m: t++ }); },
    removeOwnFile: async (n) => { files.delete(`${me()}/${n}`); },
  });
  return { listing, adapter };
}

/** Three devices in one encrypted group: A made it, B and C joined with the recovery code. */
async function group() {
  const folder = memoryFolder();
  const es = [0, 1, 2].map(() => createE2E({ secrets: memorySecrets() }));
  const ads = es.map(e => folder.adapter(() => e.deviceId));
  for (const e of es) await e.identity();
  const { code } = await es[0].createGroup();
  await es[0].refresh(ads[0], folder.listing());
  await es[1].joinWithRecovery(code, ads[1], folder.listing());
  await es[2].joinWithRecovery(code, ads[2], folder.listing());
  for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) await es[k].refresh(ads[k], folder.listing());
  for (const e of es) assert.equal(e.ready, true);
  assert.equal(new Set(es.map(e => e.currentKid)).size, 1, 'one current key');
  return es;
}

function prng(seed) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { next, int: (n) => Math.floor(next() * n), pick: (arr) => arr[Math.floor(next() * arr.length)], chance: (p) => next() < p };
}
const corrupt = (obj, R) => {
  const o = JSON.parse(JSON.stringify(obj));
  const ct = X.unb64u(o.enc.ct);
  ct[R.int(ct.length)] ^= 1 << R.int(8);
  o.enc.ct = X.b64u(ct);
  return o;
};

async function run(seed, steps, es) {
  const R = prng(seed);
  let wall = Date.UTC(2026, 9, 23, 9, 0, 0);
  const skew = [0, 1500, -900];
  const devs = es.map((e, i) => ({
    e, id: e.deviceId, i, tree: newTree(), clock: createClock({ deviceId: e.deviceId, now: () => wall + skew[i] }), seq: 0, seen: {}, n: 0,
    state: { custom: [], statuses: {}, notes: {}, countdowns: [], customOrder: {}, home: {} },
  }));
  const wire = [];            // {to, kind: 'line' | 'snap', from, obj}
  const binned = [];
  let rejected = 0;

  const edit = async (d, changes = 1 + R.int(3)) => {
    const s = structuredClone(d.state);
    for (let k = changes; k > 0; k--) mutate(d, s);
    const cap = capture(s, d.tree);
    d.state = s;
    if (!cap.w.length && !cap.x.length) return;
    const op = { v: 1, dev: d.id, n: ++d.seq, h: d.clock.tick(), s: { ...d.seen }, w: cap.w, x: cap.x };
    for (const [p, v] of op.w) applyWrite(d.tree, p, { h: op.h, n: op.n, s: op.s, v });
    for (const p of op.x) applyWrite(d.tree, p, { h: op.h, n: op.n, s: op.s, d: true });
    const sealed = JSON.parse(JSON.stringify(await d.e.sealLine(op, FILE)));
    assert.equal(sealed.v, 2);
    assert.ok(!('w' in sealed) && !('h' in sealed), 'nothing in the clear');
    for (const o of devs) if (o !== d) wire.push({ to: o.i, kind: 'line', from: d.id, obj: sealed });
  };
  const applyLines = (d, lines, touched) => {
    for (const raw of lines) {
      const v = validateOp(raw, raw.dev);
      assert.ok(v && v.rejected === 0, 'every line is valid');
      const op = v.op;
      d.clock.observe(op.h);
      for (const [p, val] of op.w) if (applyWrite(d.tree, p, { h: op.h, n: op.n, s: op.s, v: val }) === 'won') touched.add(p[0]);
      for (const p of op.x) if (applyWrite(d.tree, p, { h: op.h, n: op.n, s: op.s, d: true }) === 'won') touched.add(p[0]);
      d.seen[op.dev] = Math.max(d.seen[op.dev] || 0, op.n);
    }
  };
  const receive = async (d, items) => {
    const touched = new Set();
    for (const it of items) {
      if (it.kind === 'line') {
        const o = await d.e.openLine(it.obj, it.from, FILE);
        if (it.bad) { assert.ok(!o.line, 'a corrupted copy is rejected'); rejected++; continue; }
        assert.ok(o.line, `opens: ${JSON.stringify(o)}`);
        applyLines(d, [o.line], touched);
      } else {
        const r = await d.e.openSnapshot(it.obj, it.from);
        if (it.bad) { assert.ok(!r.snap); rejected++; continue; }
        assert.ok(r.snap, 'a sealed snapshot opens');
        applyLines(d, r.snap.data, touched);
      }
    }
    d.state = materialize(d.state, d.tree, [...touched]);
    const echo = capture(d.state, d.tree);
    assert.deepEqual([echo.w.length, echo.x.length], [0, 0], `receiving made an echo: ${JSON.stringify(echo.w.slice(0, 3))}`);
  };
  const snapshotOf = async (d) => {
    const by = new Map();
    for (const [path, r] of walkRegs(d.tree)) {
      const key = `${r.h}|${r.n}`;
      if (!by.has(key)) by.set(key, { v: 1, dev: r.h.slice(-16), n: r.n, h: r.h, s: r.s || {}, w: [], x: [] });
      if (r.d) by.get(key).x.push(path); else by.get(key).w.push([path, r.v]);
    }
    const sealed = await d.e.sealSnapshot({ v: 1, dev: d.id, seq: d.seq, data: JSON.parse(JSON.stringify([...by.values()])) });
    return JSON.parse(JSON.stringify(sealed));
  };

  function mutate(d, s) {
    const t = s.custom.length ? R.pick(s.custom) : null;
    switch (R.int(14)) {
      case 0: case 1: {
        const id = `u-${d.i}-${++d.n}`;
        s.custom.splice(R.int(s.custom.length + 1), 0, { id, title: `T${id}`, priority: R.pick(['p1', 'p2', 'p3']), tags: [], subtasks: R.chance(0.5) ? [{ id: `st-${id}-1`, title: 'one', done: false }] : [] });
        break;
      }
      case 2: if (t) { s.custom = s.custom.filter(x => x !== t); delete s.statuses[t.id]; delete s.notes[t.id]; binned.push(structuredClone(t)); } break;
      case 3: if (t) t.title = `${t.title.slice(0, 12)}~${d.i}${R.int(99)}`; break;
      case 4: if (t) { if (R.chance(0.3)) delete t.dueDate; else t.dueDate = `2026-11-${String(1 + R.int(28)).padStart(2, '0')}`; } break;
      case 5: if (t) t.tags = R.chance(0.5) ? [R.pick(['email', 'urgent', 'writing'])] : ['email', 'writing'].slice(0, R.int(3)); break;
      case 6: if (t) { (t.subtasks = t.subtasks || []).push({ id: `st-${d.i}-${++d.n}`, title: 'sub', done: false }); } break;
      case 7: if (t && t.subtasks && t.subtasks.length) { const st = R.pick(t.subtasks); st.done = !st.done; } break;
      case 8: if (t && t.subtasks && t.subtasks.length > 1) { const [m] = t.subtasks.splice(R.int(t.subtasks.length), 1); t.subtasks.splice(R.int(t.subtasks.length + 1), 0, m); } break;
      case 9: if (s.custom.length > 1) { const [m] = s.custom.splice(R.int(s.custom.length), 1); s.custom.splice(R.int(s.custom.length + 1), 0, m); } break;
      case 10: if (t) { if (R.chance(0.3)) delete s.statuses[t.id]; else s.statuses[t.id] = R.pick(['todo', 'doing', 'done']); } break;
      case 11: if (t) { const arr = s.notes[t.id] = s.notes[t.id] || []; if (arr.length && R.chance(0.3)) arr.splice(R.int(arr.length), 1); else arr.push({ id: `n-${d.i}-${++d.n}`, ts: wall, text: 'note' }); } break;
      case 12: {
        if (R.chance(0.5) || !s.countdowns.length) s.countdowns.push({ id: `cd-${d.i}-${++d.n}`, label: 'C' });
        else if (R.chance(0.5)) s.countdowns.splice(R.int(s.countdowns.length), 1);
        else { const [m] = s.countdowns.splice(R.int(s.countdowns.length), 1); s.countdowns.unshift(m); }
        break;
      }
      case 13: {
        if (R.chance(0.5)) s.customOrder.today = s.custom.map(x => x.id).filter(() => R.chance(0.7));
        else if (binned.length && !s.custom.some(x => x.id === binned[binned.length - 1].id)) s.custom.push(binned.pop());
        else s.home.layout = { version: 1, widgets: [R.pick(['focus', 'week', 'notes'])] };
        break;
      }
      default: break;
    }
  }

  for (const d of devs) await edit(d, 0);
  for (let step = 0; step < steps; step++) {
    wall += 5 + R.int(400);
    const d = R.pick(devs);
    if (R.chance(0.6)) await edit(d);
    if (wire.length && R.chance(0.5)) {
      const to = R.int(3);
      const mine = wire.filter(m => m.to === to);
      const take = mine.filter(() => R.chance(0.6));
      take.sort(() => R.next() - 0.5);
      const again = take.filter(() => R.chance(0.15));
      const bad = take.filter(() => R.chance(0.05)).map(m => ({ ...m, obj: corrupt(m.obj, R), bad: true }));
      for (const m of take) if (!R.chance(0.1)) wire.splice(wire.indexOf(m), 1);
      await receive(devs[to], [...take, ...bad, ...again]);
    }
    if (R.chance(0.05)) {
      const a = R.pick(devs), b = R.pick(devs);
      if (a !== b) {
        const snap = await snapshotOf(a);
        const items = [{ kind: 'snap', from: a.id, obj: snap }];
        if (R.chance(0.3)) items.unshift({ kind: 'snap', from: a.id, obj: corrupt(snap, R), bad: true });
        await receive(b, items);
      }
    }
  }
  for (const d of devs) {
    const mine = wire.filter(m => m.to === d.i);
    mine.sort(() => R.next() - 0.5);
    await receive(d, mine);
  }
  return { devs, rejected };
}

test('three replicas, encryption on: random concurrent edits and random delivery always converge (150 seeds)', async () => {
  const es = await group();
  let tasks = 0, regs = 0, rejected = 0;
  for (let seed = 1; seed <= 150; seed++) {
    const { devs, rejected: r } = await run(seed, 150, es);
    rejected += r;
    const views = devs.map(d => syncedView(d.state));
    assert.equal(views[1], views[0], `seed ${seed}: B differs from A`);
    assert.equal(views[2], views[0], `seed ${seed}: C differs from A`);
    const trees = devs.map(d => stable([...walkRegs(d.tree)].map(([p, r2]) => [p, r2.h, r2.d ? 'x' : r2.v]).sort((x, y) => (JSON.stringify(x[0]) < JSON.stringify(y[0]) ? -1 : 1))));
    assert.equal(trees[1], trees[0], `seed ${seed}: registers differ`);
    assert.equal(trees[2], trees[0], `seed ${seed}: registers differ`);
    tasks += devs[0].state.custom.length; regs += [...walkRegs(devs[0].tree)].length;
  }
  assert.ok(rejected > 50, `corrupted copies were sent and rejected (${rejected})`);
  console.log(`# encrypted: 150 seeds x 150 steps x 3 replicas converged; on average ${Math.round(tasks / 150)} tasks and ${Math.round(regs / 150)} registers; ${rejected} corrupted copies rejected`);
});
