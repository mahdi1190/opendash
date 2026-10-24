#!/usr/bin/env node
// tools/ach-dayone.mjs - how many achievements would unlock ON DAY ONE for a data
// folder (2.18; docs/dev/ACHIEVEMENTS_500.md, "Calibration"). READ-ONLY: it reads
// the state file and the public config and writes nothing there. It loads the
// page's own pure files (src/app/71-ach-*.js, 71-achievements.js,
// 92-game-0logic.js) in a sandbox, so the numbers are the page's numbers.
//
//   node tools/ach-dayone.mjs <data-folder | state folder | dashboard-state.json> [options]
//     --list          every achievement that would unlock, by pack
//     --json          the report as JSON
//     --today DATE    pretend today is DATE (YYYY-MM-DD)
//     --strict        exit 1 when a pack is over its day-one budget
//   node tools/ach-dayone.mjs --synth <new empty folder> [--years 2] [--seed 7]
//     writes a SYNTHETIC data folder for an active long-time user (every word and number
//     invented) to calibrate against. Refuses a folder that is not empty or is inside the repo.
//
// NEVER point it at the owner's live data without asking first: use a sandbox copy
// or --synth. Device facts (finance, location history, calendar, friends) are not
// read here: achievements that need them count as locked, and the report says how many.
// Node stdlib only.

import { readFileSync, existsSync, statSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(REPO, 'src', 'app');
// Per-batch day-one budgets for the NEW achievements (docs/dev/ACHIEVEMENTS_500.md 4.0): about 5% of 500.
const BUDGET = { b1: 5, b2: 5, b3: 5, b4: 5, b5: 5 };
const DEVICE_NEEDS = new Set(['finance', 'locations', 'travel', 'calendar', 'friends', 'claude', 'sync', 'garden', 'pets', 'wardrobe', 'you']);

function arg(argv, name) { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; }
function isInside(parent, child) {
  const norm = (x) => resolve(x).replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  const p = norm(parent), c = norm(child);
  return c === p || c.startsWith(p + '/');
}

/* ---------- the page's pure files, in build order, in one sandbox ---------- */
export function loadEngine() {
  const files = readdirSync(APP).filter(f => /^71-ach-.*\.js$/.test(f) || f === '71-achievements.js' || f === '92-game-0logic.js').sort();
  const code = files.map(f => readFileSync(join(APP, f), 'utf8')).join('\n;\n')
    + `\n;globalThis.__ach = { ACH_DEFS, ACH_RARITY, ACH_CATS, ACH_HIST_XP, achFactsCompute, achFactsView, achProgress, achPacksAll, achLintReport, achInSeason };`;
  const ctx = vm.createContext({ console: { warn: () => {}, log: () => {}, error: () => {} } });
  vm.runInContext(code, ctx, { filename: 'achievements-bundle.js' });
  return { api: ctx.__ach, files };
}

/* ---------- reading a data folder (read-only) ---------- */
function readJsonSafe(p) { try { return JSON.parse(readFileSync(p, 'utf8')); } catch (e) { return null; } }
export function readFolder(where) {
  const p = resolve(where);
  if (!existsSync(p)) throw new Error(`not found: ${p}`);
  let stateFile = null, cfgFile = null;
  if (statSync(p).isFile()) { stateFile = p; cfgFile = join(dirname(dirname(p)), 'config.json'); }
  else if (existsSync(join(p, 'state', 'dashboard-state.json'))) { stateFile = join(p, 'state', 'dashboard-state.json'); cfgFile = join(p, 'config.json'); }
  else if (existsSync(join(p, 'dashboard-state.json'))) { stateFile = join(p, 'dashboard-state.json'); cfgFile = join(dirname(p), 'config.json'); }
  if (!stateFile) throw new Error(`no dashboard-state.json in ${p} (give a data folder, its state folder or the file)`);
  const state = readJsonSafe(stateFile);
  if (!state || typeof state !== 'object') throw new Error(`could not read ${stateFile}`);
  const cfg = (cfgFile && readJsonSafe(cfgFile)) || {};
  return { state, cfg, stateFile };
}
function partsIn(zone) {
  let fmt;
  try { fmt = new Intl.DateTimeFormat('en-GB', { timeZone: zone || undefined, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }); }
  catch (e) { fmt = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }); }
  const W = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return (ms) => {
    const o = {}; for (const x of fmt.formatToParts(new Date(Number(ms)))) o[x.type] = x.value;
    const h = Number(o.hour) % 24, mi = Number(o.minute);
    return { iso: `${o.year}-${o.month}-${o.day}`, h, mi, min: h * 60 + mi, dow: W[o.weekday] };
  };
}

/* ---------- the report ---------- */
export function dayOne(where, o = {}) {
  const { api } = loadEngine();
  const { state, cfg } = readFolder(where);
  const zone = cfg.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const partsOf = partsIn(zone);
  const today = /^\d{4}-\d{2}-\d{2}$/.test(String(o.today || '')) ? o.today : partsOf(Date.now()).iso;
  const weekStart = cfg.weekStart || 'Mon', birthday = typeof cfg.birthday === 'string' ? cfg.birthday.slice(-5) : '';
  const raw = api.achFactsCompute({ data: state, today, weekStart, birthday, partsOf });
  const F = api.achFactsView(raw, { today, weekStart, birthday, unlocked: {}, hist: {} });
  // As the first check after the update does: everything in history mode, meta ones last.
  const un = {}, hist = {};
  F.unlocked = un; F.hist = hist;
  const isMeta = (d) => JSON.stringify(d.when || {}).includes('"meta"');
  for (const d of api.ACH_DEFS) if (!isMeta(d) && api.achProgress(d, F).done) { un[d.id] = today; hist[d.id] = today; }
  for (let pass = 0; pass < 3; pass++) { let n = 0; for (const d of api.ACH_DEFS) if (!un[d.id] && isMeta(d) && api.achProgress(d, F).done) { un[d.id] = today; hist[d.id] = today; n++; } if (!n) break; }
  // facts a condition reads that nothing made (a batch's missing source, or a device fact)
  const known = new Set([...Object.keys(raw.n), ...Object.keys(raw.s)]);
  const marks = new Set(Object.keys(raw.m));
  const missing = new Map();
  const walk = (c, id) => {
    if (!c || typeof c !== 'object') return;
    const add = (name) => { if (!known.has(name)) { if (!missing.has(name)) missing.set(name, []); missing.get(name).push(id); } };
    if (typeof c.n === 'string') add(c.n);
    for (const k of ['days', 'run', 'win']) if (typeof c[k] === 'string') add(c[k]);
    if (c.cal && typeof c.s === 'string') add(c.s);
    if (Array.isArray(c.same)) for (const p of c.same) add(p[0]);
    if (Array.isArray(c.ratio)) c.ratio.forEach(add);
    for (const l of [c.all, c.any]) if (Array.isArray(l)) for (const x of l) walk(x, id);
    if (typeof c.mark === 'string' && !marks.has(c.mark)) { const k = 'mark:' + c.mark; if (!missing.has(k)) missing.set(k, []); missing.get(k).push(id); }
  };
  for (const d of api.ACH_DEFS) walk(d.when, d.id);
  const packs = new Map();
  const rar = Object.keys(api.ACH_RARITY);
  const blank = (id) => ({ id, total: 0, dayOne: 0, device: 0, byRarity: Object.fromEntries(rar.map(r => [r, { total: 0, dayOne: 0 }])), ids: [] });
  let xp = 0;
  for (const d of api.ACH_DEFS) {
    const p = packs.get(d.pack) || blank(d.pack); packs.set(d.pack, p);
    p.total++; p.byRarity[d.rarity].total++;
    if ((d.needs || []).some(n => DEVICE_NEEDS.has(n))) p.device++;
    if (un[d.id]) { p.dayOne++; p.byRarity[d.rarity].dayOne++; p.ids.push(d.id); xp += Math.round(d.xp * api.ACH_HIST_XP.rate); }
  }
  const all = [...packs.values()];
  const fresh = all.filter(p => p.id !== 'core');
  const sum = (l, k) => l.reduce((t, p) => t + p[k], 0);
  const newTotal = sum(fresh, 'total'), newDay = sum(fresh, 'dayOne');
  const newByRarity = Object.fromEntries(rar.map(r => [r, { total: fresh.reduce((t, p) => t + p.byRarity[r].total, 0), dayOne: fresh.reduce((t, p) => t + p.byRarity[r].dayOne, 0) }]));
  const lint = api.achLintReport();
  const entries = Object.values(state.completionLog || {}).reduce((t, a) => t + (Array.isArray(a) ? a.length : 0), 0);
  return {
    today, zone, data: { tasks: (state.custom || []).length, completions: entries, factErrors: raw.errors || [] },
    loaded: lint.loaded, skipped: lint.skipped, packs: all.map(p => Object.assign({}, p, { budget: p.id === 'core' ? null : (BUDGET[(/^(b\d)/.exec(p.id) || [])[1]] ?? null) })),
    fresh: { total: newTotal, dayOne: newDay, pct: newTotal ? Math.round(1000 * newDay / newTotal) / 10 : 0, budget: Math.round(newTotal * 0.05), byRarity: newByRarity },
    historyXp: Math.min(api.ACH_HIST_XP.cap, xp), missing: [...missing.entries()].map(([name, ids]) => ({ name, n: ids.length, example: ids[0] })),
    names: Object.fromEntries(api.ACH_DEFS.filter(d => un[d.id]).map(d => [d.id, `${d.name} (${d.rarity})`])),
  };
}
function printReport(r, o) {
  const pad = (s, n) => String(s).padEnd(n), lpad = (s, n) => String(s).padStart(n);
  const out = [];
  out.push(`OpenDash achievements on day one (read-only) · today ${r.today} · ${r.zone}`);
  out.push(`Data: ${r.data.tasks.toLocaleString('en-GB')} tasks, ${r.data.completions.toLocaleString('en-GB')} completions${r.data.factErrors.length ? ` · fact sources that failed: ${r.data.factErrors.join(', ')}` : ''}`);
  out.push(`Loaded ${r.loaded}, skipped ${r.skipped.length}${r.skipped.length ? ': ' + r.skipped.slice(0, 6).map(s => `${s.id} (${s.why})`).join('; ') : ''}`);
  out.push('');
  out.push(`${pad('pack', 14)}${lpad('total', 6)}${lpad('day one', 9)}${lpad('%', 7)}${lpad('budget', 8)}  needs device data`);
  for (const p of r.packs) {
    const over = p.budget != null && p.dayOne > p.budget ? '  OVER BUDGET' : '';
    out.push(`${pad(p.id, 14)}${lpad(p.total, 6)}${lpad(p.dayOne, 9)}${lpad((p.total ? (100 * p.dayOne / p.total).toFixed(1) : '0.0') + '%', 7)}${lpad(p.budget == null ? '-' : p.budget, 8)}  ${p.device}${over}`);
  }
  out.push('');
  if (r.fresh.total) {
    out.push(`New achievements: ${r.fresh.dayOne} of ${r.fresh.total} on day one (${r.fresh.pct}%; the budget is 5%, ${r.fresh.budget}).`);
    out.push('By rarity: ' + Object.entries(r.fresh.byRarity).map(([k, v]) => `${k} ${v.dayOne}/${v.total}`).join(' · '));
  } else out.push('No packs yet: only the core 78 (B0). Each batch adds its pack; run this again after it.');
  out.push(`History XP on day one: ${r.historyXp.toLocaleString('en-GB')} (half rate, 2,000 at most)`);
  if (r.missing.length) {
    out.push('');
    out.push('Facts no source makes here (a batch\'s missing source, or a device fact read only on the page):');
    for (const m of r.missing.slice(0, 40)) out.push(`  ${pad(m.name, 28)} ${lpad(m.n, 3)} achievement${m.n === 1 ? '' : 's'} (e.g. ${m.example})`);
    if (r.missing.length > 40) out.push(`  ... and ${r.missing.length - 40} more`);
  }
  if (o.list) {
    out.push('');
    for (const p of r.packs) { if (!p.ids.length) continue; out.push(`${p.id}:`); for (const id of p.ids) out.push(`  ${id}  ${r.names[id]}`); }
  }
  console.log(out.join('\n'));
}

/* ---------- a synthetic long-time user (every value invented) ---------- */
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function makeSynthetic(dest, o = {}) {
  dest = resolve(dest);
  if (isInside(REPO, dest)) throw new Error('the folder must be outside the repo (e.g. C:/tmp/ach-synth/data)');
  if (existsSync(dest) && readdirSync(dest).length) throw new Error(`${dest} is not empty`);
  const R = rng(Number(o.seed) || 7), pick = (l) => l[Math.floor(R() * l.length)], chance = (p) => R() < p;
  const years = Math.max(1, Math.min(4, Number(o.years) || 2));
  const DAY = 86400000, end = Date.UTC(2026, 9, 23, 18), start = end - years * 365 * DAY;
  const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
  const streams = ['work', 'home', 'study', 'health', 'admin'];
  const people = Array.from({ length: 30 }, (_, i) => ({ id: 'p' + (i + 1), name: 'Person ' + (i + 1), birthday: chance(0.4) ? `0${1 + (i % 9)}-1${i % 9}` : '' }));
  const custom = [], statuses = {}, completionLog = {}, taskActivity = {}, notes = {}, reviews = [], daynotes = {};
  const game = { v: 1, prefs: { fun: 'subtle' }, awards: {}, ticks: { inbox: {}, focus: {} }, counts: {}, marks: {}, focus: {}, quests: {}, records: {}, seen: { level: 1, levelMax: 1 } };
  let n = 0;
  const act = (id, ts, type, x) => { (taskActivity[id] = taskActivity[id] || []).push(Object.assign({ id: `a-${ts}-${n}`, ts, type, source: 'ui' }, x || {})); };
  // habits: five daily, two weekly, one monthly
  const habits = [];
  for (let i = 0; i < 8; i++) {
    const id = 'h' + i, rec = i < 5 ? 'daily' : i < 7 ? 'weekly' : 'monthly';
    custom.push({ id, title: 'Routine ' + (i + 1), stream: pick(streams), priority: 'p2', recurrence: rec, createdAt: start + i * DAY, dueDate: iso(end) });
    habits.push({ id, rec, keep: rec === 'daily' ? 0.62 : 0.8 });
  }
  for (let t = start; t < end; t += DAY) {
    const day = iso(t), dow = new Date(t).getUTCDay(), weekend = dow === 0 || dow === 6;
    if (!chance(weekend ? 0.55 : 0.9)) continue;   // active days
    for (const h of habits) {
      const due = h.rec === 'daily' || (h.rec === 'weekly' && dow === 1) || (h.rec === 'monthly' && day.endsWith('-01'));
      if (due && chance(h.keep)) (completionLog[h.id] = completionLog[h.id] || []).push(t + (7 + Math.floor(R() * 12)) * 3600000);
    }
    const k = weekend ? 1 + Math.floor(R() * 4) : 4 + Math.floor(R() * 10);
    for (let j = 0; j < k; j++) {
      const id = 't' + (++n), made = t - Math.floor(R() * R() * 60) * DAY, doneAt = t + (8 + Math.floor(R() * 13)) * 3600000 + Math.floor(R() * 3600000);
      const due = chance(0.6) ? iso(made + Math.floor(R() * 21) * DAY) : null;
      const subs = chance(0.2) ? Array.from({ length: 3 + Math.floor(R() * 4) }, (_, s) => ({ id: `${id}s${s}`, title: 'Step ' + (s + 1), done: true, ts: doneAt - (3 - s) * 600000 })) : [];
      const task = { id, title: 'Task ' + n, stream: pick(streams), priority: pick(['p1', 'p2', 'p2', 'p3', 'p0']), createdAt: made, dueDate: due,
        estimate: chance(0.4) ? pick([10, 15, 25, 30, 45, 60, 90, 120]) : 0, subtasks: subs, tags: chance(0.3) ? [pick(['writing', 'calls', 'email', 'reading'])] : [],
        people: chance(0.15) ? [pick(people).id] : [], recurrence: 'none' };
      custom.push(task);
      act(id, made, 'created');
      if (chance(0.25)) act(id, made + 3600000, 'plan', { from: null, to: iso(t), ...(chance(0.3) ? { time: '10:00' } : {}) });
      if (due && chance(0.15)) act(id, made + 7200000, 'date', { from: due, to: iso(Date.parse(due) + 2 * DAY), reason: chance(0.5) ? 'Waiting for a reply' : null });
      if (chance(0.1)) act(id, made + 5000, 'priority', { from: 'p3', to: task.priority });
      if (chance(0.12)) act(id, doneAt - 3600000, 'status', { from: 'todo', to: 'doing' });
      if (chance(0.94)) { statuses[id] = 'done'; completionLog[id] = [doneAt]; act(id, doneAt, 'status', { from: 'todo', to: 'done' }); }
      else if (chance(0.5)) { statuses[id] = 'done'; task.resolution = 'wontdo'; }
      if (chance(0.08)) notes[id] = [{ id: id + 'n', ts: doneAt - 1000, text: 'A note' }];
      if (subs.length >= 3 && statuses[id] === 'done' && !task.resolution) game.awards['boss:' + id] = { d: day, xp: Math.min(80, 10 + 5 * subs.length), k: 'boss', n: subs.length, t: id };
    }
    // focus
    if (chance(0.45)) {
      const s = 1 + Math.floor(R() * 3);
      for (let j = 0; j < s; j++) { const st = t + (9 + j * 2) * 3600000, ms = (20 + Math.floor(R() * 70)) * 60000; game.focus['f' + st] = { t: 't' + Math.max(1, n - j), s: st, ms, e: 0, k: 'tasks', d: day }; }
      game.ticks.focus[day] = 1;
    }
    if (chance(0.3)) game.ticks.inbox[day] = 1;
    if (chance(0.35)) daynotes[day] = { md: 'A few lines about the day, written in the evening.', updatedAt: t + 20 * 3600000 };
    if (chance(0.4)) reviews.push({ id: 'rv-evening-' + day, kind: 'evening', date: day, savedAt: new Date(t + 19 * 3600000).toISOString(), top3: ['t' + n] });
    if (dow === 0 && chance(0.6)) {
      const from = iso(t - 6 * DAY);
      reviews.push({ id: 'rv-week-' + from, kind: 'week', date: from, savedAt: new Date(t + 18 * 3600000).toISOString(), wins: chance(0.7) ? ['A win', 'Another'] : [], outcomes: chance(0.5) ? [{ area: 'work', items: ['One'] }] : [],
        triage: { reviewed: 8 + Math.floor(R() * 25), kept: 5, moved: 3, waiting: 1, someday: 1, done: 2, dropped: 1, binned: 0, nudged: Math.floor(R() * 4), minutes: 10 + Math.floor(R() * 20) } });
      const w = from, q = { list: [{ id: 'total', kind: 'total' }, { id: 'days', kind: 'days' }, { id: 'review', kind: 'review' }], done: {} };
      for (const x of q.list) if (chance(0.6)) q.done[x.id] = day;
      if (Object.keys(q.done).length === 3) q.done.all = day;
      game.quests[w] = q;
    }
  }
  const state = { _lastSave: end, custom, statuses, completionLog, taskActivity, notes, reviews, weeklyReviews: [], daynotes,
    people: [{ id: 'self', name: 'You', self: true }, ...people.map(p => ({ id: p.id, name: p.name, birthday: p.birthday }))], countdowns: [], streams: streams.map(s => ({ id: s, label: s })),
    seen: {}, game, achievements: { v: 2, unlocked: {}, notes: {} } };
  mkdirSync(join(dest, 'state'), { recursive: true });
  writeFileSync(join(dest, 'state', 'dashboard-state.json'), JSON.stringify(state));
  writeFileSync(join(dest, 'config.json'), JSON.stringify({ userName: 'Synthetic user', timezone: 'Europe/London', weekStart: 'Mon', locale: 'en-GB', birthday: '06-14' }, null, 2));
  return { dest, tasks: custom.length, completions: Object.values(completionLog).reduce((t, a) => t + a.length, 0), from: iso(start), to: iso(end) };
}

/* ---------- main ---------- */
function main(argv) {
  if (argv.includes('--synth')) {
    const dest = arg(argv, '--synth');
    if (!dest) { console.error('usage: node tools/ach-dayone.mjs --synth <new empty folder> [--years 2] [--seed 7]'); process.exit(2); }
    const r = makeSynthetic(dest, { years: arg(argv, '--years'), seed: arg(argv, '--seed') });
    console.log(`Synthetic data folder: ${r.dest} (${r.tasks.toLocaleString('en-GB')} tasks, ${r.completions.toLocaleString('en-GB')} completions, ${r.from} to ${r.to}). Every value is invented.`);
    console.log(`Now: node tools/ach-dayone.mjs ${r.dest}`);
    return;
  }
  const where = argv.find(a => !a.startsWith('--') && a !== arg(argv, '--today'));
  if (!where) { console.error('usage: node tools/ach-dayone.mjs <data folder> [--list] [--json] [--today YYYY-MM-DD] [--strict]\n       node tools/ach-dayone.mjs --synth <new empty folder>'); process.exit(2); }
  const r = dayOne(where, { today: arg(argv, '--today') });
  if (argv.includes('--json')) console.log(JSON.stringify(r, null, 2)); else printReport(r, { list: argv.includes('--list') });
  if (argv.includes('--strict') && r.packs.some(p => p.budget != null && p.dayOne > p.budget)) process.exit(1);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (e) { console.error('ach-dayone: ' + (e && e.message ? e.message : e)); process.exit(2); }
}
