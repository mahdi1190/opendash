// Property test: THREE replicas make random concurrent edits (tasks,
// subtasks, notes, statuses, countdowns, order lists, deletes and restores),
// with skewed clocks; the changes are delivered in random order, some twice,
// some as whole snapshots, some very late. Whatever happens, every replica
// ends with the same synced data and the same registers, and receiving never
// produces an echo (a change it would send back).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClock } from '../lib/sync/hlc.mjs';
import { capture, applyWrite, materialize, newTree, validateOp, syncedView, walkRegs, stable } from '../lib/sync/model.mjs';

const IDS = ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb', 'cccccccccccccccc'];

function prng(seed) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { next, int: (n) => Math.floor(next() * n), pick: (arr) => arr[Math.floor(next() * arr.length)], chance: (p) => next() < p };
}

function run(seed, steps) {
  const R = prng(seed);
  let wall = Date.UTC(2026, 9, 23, 9, 0, 0);
  const skew = [0, 1500, -900];   // one clock ahead, one behind
  const devs = IDS.map((id, i) => ({
    id, i, tree: newTree(), clock: createClock({ deviceId: id, now: () => wall + skew[i] }), seq: 0, seen: {}, n: 0,
    state: { custom: [], statuses: {}, notes: {}, countdowns: [], customOrder: {}, home: {} },
  }));
  const wire = [];            // {to, op, at}: change lines in flight
  const binned = [];          // deleted task ids that may be restored

  const edit = (d, changes = 1 + R.int(3)) => {
    const s = structuredClone(d.state);
    for (let k = changes; k > 0; k--) mutate(d, s);
    const cap = capture(s, d.tree);
    d.state = s;
    if (!cap.w.length && !cap.x.length) return;
    const op = { v: 1, dev: d.id, n: ++d.seq, h: d.clock.tick(), s: { ...d.seen }, w: cap.w, x: cap.x };
    for (const [p, v] of op.w) applyWrite(d.tree, p, { h: op.h, n: op.n, s: op.s, v });
    for (const p of op.x) applyWrite(d.tree, p, { h: op.h, n: op.n, s: op.s, d: true });
    const line = JSON.parse(JSON.stringify(op));
    for (const o of devs) if (o !== d) wire.push({ to: o.i, op: line });
  };
  const receive = (d, ops) => {
    const touched = new Set();
    for (const raw of ops) {
      const v = validateOp(raw, raw.dev);
      assert.ok(v && v.rejected === 0, 'every line is valid');
      const op = v.op;
      d.clock.observe(op.h);
      for (const [p, val] of op.w) if (applyWrite(d.tree, p, { h: op.h, n: op.n, s: op.s, v: val }) === 'won') touched.add(p[0]);
      for (const p of op.x) if (applyWrite(d.tree, p, { h: op.h, n: op.n, s: op.s, d: true }) === 'won') touched.add(p[0]);
      d.seen[op.dev] = Math.max(d.seen[op.dev] || 0, op.n);
    }
    d.state = materialize(d.state, d.tree, [...touched]);
    const echo = capture(d.state, d.tree);
    assert.deepEqual([echo.w.length, echo.x.length], [0, 0], `receiving made an echo: ${JSON.stringify(echo.w.slice(0, 3))}`);
  };
  /** Everything a device knows, as lines (what its snapshot.json carries). */
  const snapshotOf = (d) => {
    const by = new Map();
    for (const [path, r] of walkRegs(d.tree)) {
      const key = `${r.h}|${r.n}`;
      if (!by.has(key)) by.set(key, { v: 1, dev: r.h.slice(-16), n: r.n, h: r.h, s: r.s || {}, w: [], x: [] });
      if (r.d) by.get(key).x.push(path); else by.get(key).w.push([path, r.v]);
    }
    return JSON.parse(JSON.stringify([...by.values()]));
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
        if (R.chance(0.5)) s.customOrder.today = s.custom.map(x => x.id).filter(() => R.chance(0.7));   // an order list: one whole value
        else if (binned.length && !s.custom.some(x => x.id === binned[binned.length - 1].id)) s.custom.push(binned.pop());   // restore
        else s.home.layout = { version: 1, widgets: [R.pick(['focus', 'week', 'notes'])] };
        break;
      }
      default: break;
    }
  }

  // Each device records its own starting state first (the engine's first pass does this).
  for (const d of devs) edit(d, 0);
  for (let step = 0; step < steps; step++) {
    wall += 5 + R.int(400);
    const d = R.pick(devs);
    if (R.chance(0.6)) edit(d);
    // The cloud delivers a random batch, in random order, sometimes twice, sometimes very late.
    if (wire.length && R.chance(0.5)) {
      const to = R.int(3);
      const mine = wire.filter(m => m.to === to);
      const take = mine.filter(() => R.chance(0.6));
      take.sort(() => R.next() - 0.5);
      const again = take.filter(() => R.chance(0.15));
      for (const m of take) if (!R.chance(0.1)) wire.splice(wire.indexOf(m), 1);   // 10% stay in flight: delivered again later
      receive(devs[to], [...take, ...again].map(m => m.op));
    }
    // Now and then a device reads another's whole snapshot instead.
    if (R.chance(0.05)) { const a = R.pick(devs), b = R.pick(devs); if (a !== b) receive(b, snapshotOf(a)); }
  }
  // Everything still in flight arrives, shuffled.
  for (const d of devs) {
    const mine = wire.filter(m => m.to === d.i).map(m => m.op);
    mine.sort(() => R.next() - 0.5);
    receive(d, mine);
  }
  return devs;
}

test('three replicas with random concurrent edits and random delivery always converge (150 seeds)', () => {
  let tasks = 0, regs = 0;
  for (let seed = 1; seed <= 150; seed++) {
    const devs = run(seed, 150);
    const views = devs.map(d => syncedView(d.state));
    assert.equal(views[1], views[0], `seed ${seed}: B differs from A`);
    assert.equal(views[2], views[0], `seed ${seed}: C differs from A`);
    const trees = devs.map(d => stable([...walkRegs(d.tree)].map(([p, r]) => [p, r.h, r.d ? 'x' : r.v]).sort((x, y) => (JSON.stringify(x[0]) < JSON.stringify(y[0]) ? -1 : 1))));
    assert.equal(trees[1], trees[0], `seed ${seed}: registers differ`);
    assert.equal(trees[2], trees[0], `seed ${seed}: registers differ`);
    tasks += devs[0].state.custom.length; regs += [...walkRegs(devs[0].tree)].length;
  }
  console.log(`# 150 seeds x 150 steps x 3 replicas: converged; on average ${Math.round(tasks / 150)} tasks and ${Math.round(regs / 150)} registers each`);
});
