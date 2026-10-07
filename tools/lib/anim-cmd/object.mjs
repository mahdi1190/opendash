// node tools/anim-pack.mjs object new|lint|sheet|list ...   the object library (docs/dev/SCENE_ENGINE.md sections 2.1 to 2.7)
//
//   object new <category>.<name> [--kit "K.tree('alder')"] [--variants N] [--kits a,b] [--role r]   scaffold a stub into
//       src/app/70-scene-lib-<plural>[-<kit>].js (a landmark: 70-scene-lib-landmark-<name>.js), creating the file with its IIFE
//   object lint [<id>,...] [--json]          the object rules (2.6); exit 2 on a failure. No id: every object of the library
//   object sheet <id>[,...] [--out dir] [--canvas] [--mode light|night]   a PNG per object: a row per variant, a column per season,
//       a night column (graded with the real night light) and a lit column (windows and the lit part at dusk), a 0.4x size strip and
//       three animation phases. Drawn from the resolved shapes (sceneObjShapes) as SVG; --canvas draws them with the canvas renderer
//   object list [--category c] [--kit k] [--role r] [--tag t] [--json]   what the library holds, and how many scenes use each object
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadRegistry, findBrowser } from '../anim-render.mjs';
import { loadThresholds } from '../../anim-pack.mjs';
import { engineOf, lintObject, dataOf } from '../scene-lint.mjs';
import { scenePathBox } from '../scene-svg.mjs';
import { launchChrome } from '../../release-chrome.mjs';

const pad = (s, n) => String(s).padEnd(n), lpad = (s, n) => String(s).padStart(n);
const splitList = (v) => [].concat(v || []).flatMap(x => String(x).split(',')).map(s => s.trim()).filter(Boolean);
export const CATEGORIES = ['tree', 'plant', 'ground', 'rock', 'water', 'bird', 'animal', 'person', 'vehicle', 'boat', 'building', 'street', 'rail', 'structure', 'prop', 'sky', 'landmark'];
/** The library file name of a category (2.1): plural, except the mass nouns. */
export const PLURAL = { tree: 'trees', plant: 'plants', ground: 'ground', rock: 'rocks', water: 'water', bird: 'birds', animal: 'animals', person: 'people', vehicle: 'vehicles', boat: 'boats', building: 'buildings', street: 'street', rail: 'rail', structure: 'structures', prop: 'props', sky: 'sky', landmark: 'landmark' };
/** The role an object of a category usually plays (2.7), the default of --role. */
export const DEFAULT_ROLE = { tree: 'tree', plant: 'ground', ground: 'ground', rock: 'rock', water: 'edge', bird: 'bird', animal: 'animal', person: 'walker', vehicle: 'vehicle', boat: 'boat', building: 'building-mid', street: 'street', rail: 'street', structure: 'building-mid', prop: 'street', sky: 'sky' };
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const ID_RE = /^([a-z]+)\.([a-z0-9-]{1,40})$/;

/* ---------------------------------------------------------------------------------------------
   object new
   --------------------------------------------------------------------------------------------- */
const header = (plural, kit) => `/* ============================================================
   SCENE LIBRARY: ${plural}${kit ? ` (kit ${kit})` : ''} (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine / sceneObjFromKit calls inside this IIFE and nothing
   else; every build runs lazily, once per (variant, season), memoised by
   the core. Check with: node tools/anim-pack.mjs object lint <id>, and
   LOOK with: node tools/anim-pack.mjs object sheet <id>.
   ============================================================ */
(function () {
})();
`;
/** "K.tree('alder')" -> the kit call at the origin with the standard options (2.3). */
export function kitCall(expr) {
  const m = /^\s*(K\.[A-Za-z]+)\s*(?:\((.*)\))?\s*$/.exec(String(expr || ''));
  if (!m) throw new Error(`--kit must be a kit generator call such as "K.tree('alder')" or "K.gorse", got "${expr}"`);
  const args = (m[2] || '').trim();
  return `${m[1]}(${args ? args + ', ' : ''}0, 0, 1, { season, seed: 11 + v * 7, shadow: false })`;
}
export function objectStub(id, { kit = '', variants = 3, kits = [], role = '', region = '' } = {}) {
  const [, cat, name] = ID_RE.exec(id);
  const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  if (cat === 'landmark') {
    return `
  // ${id}: REFINE it (the real structure: look up its form and be factual; window grids or tiers; edge highlights and shaded sides
  // consistent with ONE light direction; the lit part: floodlights, crown lights; snow on roofs in winter if the place has snow, then
  // seasonal: true; at least 80 shapes), then: node tools/anim-pack.mjs object lint ${id} && node tools/anim-pack.mjs object sheet ${id} --mode night
  sceneObjDefine({
    id: ${q(id)},
    category: 'landmark',
    size: [300, 400],
    variants: 1,
    seasonal: false,
    flippable: false,
    palette: { base: { wall: ['#c8c0b0', '#9a9284', '#e6e0d4'], glass: ['#3a4a5a', '#5a7088'] } },
    night: { glow: { window: '#ffd98a', lamp: '#ffe2a0' }, on: 0.7 },
    parts: ['body', 'lit'],
    shadow: { rx: 150, ry: 16, h: 400 },
    reflect: true,
    tags: ['landmark', ${q(`place:${region || '<region>'}/<key>`)}],
    build(v, rnd) {
      const body = [['@wall.0', sceneD.rect(-120, -400, 240, 400)], ['@wall.1', sceneD.rect(40, -400, 80, 400)]];
      for (let r = 0; r < 12; r++) for (let c = 0; c < 6; c++) body.push({ f: '@glass.0', d: sceneD.rect(-104 + c * 36, -380 + r * 30, 16, 14), glow: 'window' });
      return { body, lit: [{ f: '#ffe2a0', d: sceneD.rect(-120, -404, 240, 4), op: 0.8 }] };
    },
  });
`;
  }
  const r = role || DEFAULT_ROLE[cat] || 'street';
  const tags = [...kits.map(k => 'kit:' + k), 'role:' + r];
  if (kit) {
    return `
  // ${id}: the nature kit's drawing, parsed into library shapes (2.3). Check: node tools/anim-pack.mjs object lint ${id}
  sceneObjFromKit({
    id: ${q(id)},
    category: ${q(cat)},
    size: [200, 300],
    variants: ${variants},
    seasonal: true,
    flippable: true,
    shadow: { rx: 80, ry: 10, h: 300 },
    reflect: true,
    tags: [${tags.map(q).join(', ')}],
    credit: ${q('the nature kit ' + kit)},
    kit: (K, v, season) => ${kitCall(kit)},
  });
`;
  }
  const lights = ['building', 'vehicle'].includes(cat);
  return `
  // ${id}: draw it in build() (object-local units, the anchor at 0, 0 where it touches the ground, drawing upward into negative y),
  // with palette slots that change by season. Check: node tools/anim-pack.mjs object lint ${id} && node tools/anim-pack.mjs object sheet ${id}
  sceneObjDefine({
    id: ${q(id)},
    category: ${q(cat)},
    size: [120, 160],
    variants: ${variants},
    seasonal: ${lights ? 'false' : 'true'},
    flippable: true,
    palette: {
      base: { main: ['#6a7a5a', '#4a5a3e', '#8a9a72'], dark: ['#2a3326'] },${lights ? '' : `
      spring: { main: ['#6f9a48', '#4f7a34', '#a6c86a'] },
      summer: { main: ['#4f7a38', '#3a5f2c', '#7aa452'] },
      autumn: { main: ['#a8702e', '#7a4f22', '#d09a48'] },
      winter: { main: ['#6a6a5e', '#4a4a42', '#8a8a7e'] },`}
    },${lights ? `
    night: { glow: { window: '#ffd98a', lamp: '#ffe2a0' }, on: 0.7 },` : ''}
    parts: ['body'],
    shadow: { rx: 60, ry: 8, h: 160 },
    tags: [${tags.map(q).join(', ')}],
    build(v, rnd) {
      const w = 50 + v * 8;
      const body = [['@main.1', sceneD.ell(0, -70, w, 70)], ['@main.0', sceneD.ell(-8, -84, w * 0.8, 54)], ['@main.2', sceneD.ell(-20, -110, w * 0.4, 24), 0.8]];${lights ? `
      for (let i = 0; i < 4; i++) body.push({ f: '@dark', d: sceneD.rect(-30 + i * 16, -100, 8, 12), glow: 'window' });` : ''}
      return { body };
    },
  });
`;
}
/** The library file an object goes to (2.1): the plural file, or plural-<first kit> unless the plain file already holds that kit. */
export function libraryFileFor(root, id, kits = []) {
  const [, cat, name] = ID_RE.exec(id);
  if (cat === 'landmark') return `src/app/70-scene-lib-landmark-${name}.js`;
  const plain = `src/app/70-scene-lib-${PLURAL[cat]}.js`;
  if (!kits.length) return plain;
  const p = join(root, plain);
  // the starter files hold the temperate and urban objects (trees.js: oak, birch, pine, plane); every other kit gets its own file
  if (/^(temperate|urban)$/.test(kits[0]) || (existsSync(p) && readFileSync(p, 'utf8').includes(`'kit:${kits[0]}'`))) return plain;
  return `src/app/70-scene-lib-${PLURAL[cat]}-${kits[0]}.js`;
}
/** Append a stub to a library file (created with its header and IIFE when missing). Returns the file written. */
export function appendObject(root, file, stub) {
  const path = join(root, file);
  const text = existsSync(path) ? readFileSync(path, 'utf8') : header(file.replace(/^src\/app\/70-scene-lib-|\.js$/g, ''), '');
  const end = text.lastIndexOf('})();');
  if (end < 0) throw new Error(`${file} has no closing "})();": a library file is one IIFE`);
  writeFileSync(path, text.slice(0, end) + stub.replace(/^\n/, '') + text.slice(end));
  return file;
}

/* ---------------------------------------------------------------------------------------------
   Drawing an object (the sheets): resolved shapes -> SVG
   --------------------------------------------------------------------------------------------- */
const escA = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** The transform of an animation hook on a part at phase ph (0..1), for the sheet's animation columns. */
export function hookTransform(a, part, ph) {
  const s = Math.sin(ph * Math.PI * 2), [px, py] = a.pivot || [0, 0];
  const rot = (d) => `rotate(${d.toFixed(2)} ${px} ${py})`;
  const mine = (a.part === part) || (a.parts || []).includes(part);
  switch (a.kind) {
    case 'sway': return mine ? rot((a.deg || 2) * (a.k || 1) * s * 1.6) : '';
    case 'bob': return mine || a.part === '*' || !a.part ? `translate(0 ${((a.dy || 2) * s).toFixed(2)})` : '';
    case 'flap': { if (!mine) return ''; const [s0, s1] = a.sy || [0.3, 1]; const k = s0 + (s1 - s0) * (s + 1) / 2; return `translate(${px} ${py}) scale(1 ${k.toFixed(3)}) translate(${-px} ${-py})`; }
    case 'walk': { const i = (a.parts || []).indexOf(part); return i >= 0 ? rot((i % 2 ? -1 : 1) * (a.deg || 22) * s) : ''; }
    case 'paddle': return `translate(0 ${((a.dy || 1.5) * s).toFixed(2)}) rotate(${((a.deg || 2) * Math.cos(ph * 6.283)).toFixed(2)})`;
    case 'turn': return mine ? rot((a.deg || 14) * (ph < 0.5 ? 1 : -0.4)) : '';
    case 'spin': return mine ? rot(360 * ph) : '';
    case 'flicker': return '';
    default: return '';
  }
}
/**
 * One object variant as an SVG group (its own coordinates): grade (hex -> hex) tones every paint except glow and lit shapes; lit: draw the
 * lit part and the glow shapes in their night colours; ph: an animation phase (null: at rest).
 */
export function objectSvg(R, def, { grade = (c) => c, lit = false, ph = null, idp = 'g' } = {}) {
  const defs = []; let n = 0, body = '';
  const paint = (p, raw) => {
    if (!p) return 'none';
    if (typeof p === 'string') return raw ? p : grade(p);
    const id = `${idp}${++n}`, k = p.lin ? 'lin' : 'rad';
    const stops = p[k].map(s => `<stop offset="${s[0]}" stop-color="${raw ? s[1] : grade(s[1])}"${s[2] != null ? ` stop-opacity="${s[2]}"` : ''}/>`).join('');
    defs.push(p.lin ? `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${p.x1 || 0}" y1="${p.y1 || 0}" x2="${p.x2 || 0}" y2="${p.y2 == null ? 1 : p.y2}">${stops}</linearGradient>` : `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${p.cx || 0}" cy="${p.cy || 0}" r="${p.r || 10}">${stops}</radialGradient>`);
    return `url(#${id})`;
  };
  const glowCol = (s) => (def.night && def.night.glow && def.night.glow[s.glow]) || (s.glow === 'lamp' ? '#ffe2a0' : '#ffd98a');
  for (const part of R.order || Object.keys(R.parts)) {
    if (part === 'lit' && !lit) continue;
    let inner = '';
    for (const s of R.parts[part] || []) {
      const on = lit && s.glow, rawPart = part === 'lit';
      const f = on ? glowCol(s) : paint(s.f, rawPart);
      const st = s.s ? ` stroke="${on ? glowCol(s) : paint(s.s, rawPart)}" stroke-width="${s.w || 1}"${s.cap ? ` stroke-linecap="${s.cap}"` : ''}${s.dash ? ` stroke-dasharray="${s.dash.join(' ')}"` : ''}` : '';
      inner += `<path d="${escA(s.d)}" fill="${s.f || on ? f : 'none'}"${st}${s.op != null && s.op !== 1 ? ` opacity="${s.op}"` : ''}${s.m ? ` transform="matrix(${s.m.join(' ')})"` : ''}/>`;
    }
    const tf = ph == null ? '' : (R.anim || []).map(a => hookTransform(a, part, ph)).filter(Boolean).join(' ');
    body += tf ? `<g transform="${tf}">${inner}</g>` : inner;
  }
  return { defs: defs.join(''), body };
}
/** A night grade for the sheets: the core's sceneColour at a real night light when the engine has it, else a fixed blue-grey grade. */
export function nightGrade(reg, E) {
  try {
    if (typeof E.light === 'function' && typeof E.colour === 'function' && typeof reg.R.almSceneLight === 'function') {
      const sky = reg.R.almSceneLight(Date.parse('2026-10-07T22:00:00Z'), 51.5, -0.12, 'UTC');
      const L = E.light({ sky }, { lat: 51.5, lon: -0.12, heading: 180, fov: 80, horizon: 500, lift: 1 });
      if (L) return (c) => E.colour(c, { L });
    }
  } catch { /* the fallback below */ }
  const hx = (c) => { const s = String(c).replace('#', ''); const v = parseInt(s.length === 3 ? s.replace(/./g, '$&$&') : s, 16) || 0; return [v >> 16 & 255, v >> 8 & 255, v & 255]; };
  return (c) => { const [r, g, b] = hx(c), l = (r + g + b) / 3; return '#' + [r, g, b].map((v, i) => Math.round((v * 0.45 + l * 0.55) * 0.38 + [16, 26, 52][i] * 0.62).toString(16).padStart(2, '0')).join(''); };
}
/** The sheet page of one object: variants x (seasons, night, lit), the size strip and three animation phases. */
export function objectSheetHtml(reg, E, id, { mode = 'light' } = {}) {
  const def = E.obj(id);
  if (!def) throw new Error(`no object ${id}`);
  const seasons = def.seasonal === false ? ['summer'] : SEASONS;
  const night = nightGrade(reg, E), variants = def.variants || 1;
  const R0 = E.shapes(id, 0, 'summer');
  // the cell box: the union of every variant and season's shapes (measured here, so a sheet never clips), and the core's box
  let box = R0.box ? R0.box.slice() : [Infinity, Infinity, -Infinity, -Infinity];
  for (let v = 0; v < variants; v++) for (const s of seasons) { const R = E.shapes(id, v, s); for (const p of R.order || Object.keys(R.parts)) for (const sh of R.parts[p] || []) { const b = scenePathBox(sh.d, sh.m); if (b) box = [Math.min(box[0], b[0]), Math.min(box[1], b[1]), Math.max(box[2], b[2]), Math.max(box[3], b[3])]; } }
  if (!Number.isFinite(box[0])) box = [-100, -200, 100, 10];
  const bw = box[2] - box[0], bh = box[3] - box[1], cell = 220, k = Math.min((cell - 24) / bw, (cell - 34) / bh);
  const dark = mode === 'night' || mode === 'dark';
  const cellSvg = (R, opts, label, scale = k, bg = dark ? '#1b2230' : '#e8ece4') => {
    const g = objectSvg(R, def, opts);
    const w = Math.max(24, bw * scale + 16), h = bh * scale + 28;
    return `<figure><svg width="${Math.round(w)}" height="${Math.round(h)}" viewBox="0 0 ${Math.round(w)} ${Math.round(h)}" style="background:${opts.bgOverride || bg}"><defs>${g.defs}</defs><g transform="translate(${(8 - box[0] * scale).toFixed(1)} ${(8 - box[1] * scale).toFixed(1)}) scale(${scale.toFixed(4)})">${g.body}</g></svg><figcaption>${escA(label)}</figcaption></figure>`;
  };
  let rows = '';
  for (let v = 0; v < variants; v++) {
    let cells = '';
    for (const s of seasons) cells += cellSvg(E.shapes(id, v, s), { idp: `v${v}${s[0]}` }, `v${v} ${s}`);
    const Rs = E.shapes(id, v, 'summer');
    cells += cellSvg(Rs, { grade: night, idp: `v${v}n`, bgOverride: '#121a2c' }, `v${v} night`);
    cells += cellSvg(Rs, { grade: night, lit: true, idp: `v${v}l`, bgOverride: '#121a2c' }, `v${v} lit (dusk)`);
    rows += `<div class="row">${cells}</div>`;
  }
  let extra = '';
  for (const s of [1, 0.4]) extra += cellSvg(R0, { idp: `z${s}` }, `${s}x`, k * s);
  for (const ph of [0, 1 / 3, 2 / 3]) extra += cellSvg(R0, { ph, idp: `p${Math.round(ph * 3)}` }, `phase ${Math.round(ph * 3)}/3`);
  const tags = (def.tags || []).join(' '), anim = (R0.anim || []).map(a => a.kind).join(', ') || 'none';
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:12px;background:${dark ? '#0f141c' : '#f4f4f6'};color:${dark ? '#dde' : '#223'};font:12px system-ui,sans-serif}
h1{font-size:15px;margin:0 0 4px}p{margin:0 0 10px}.row{display:flex;gap:8px;margin:0 0 8px;align-items:flex-end}figure{margin:0}figcaption{padding:2px 0}</style></head><body>
<h1>${escA(id)} <small>(${escA(def.category)}, ${variants} variant${variants === 1 ? '' : 's'}${def.seasonal === false ? ', one look all year' : ', four seasons'})</small></h1>
<p>${escA(tags)} &middot; parts ${escA((R0.order || []).join(', '))} &middot; hooks ${escA(anim)} &middot; size ${escA((def.size || []).join(' x '))}</p>${rows}<div class="row">${extra}</div></body></html>`;
}

/* ---------------------------------------------------------------------------------------------
   object list: who uses what
   --------------------------------------------------------------------------------------------- */
export function objectUse(reg, E) {
  const used = new Map();
  for (const e of reg.items().filter(x => x.composed)) {
    try {
      const C = E.compile(dataOf(e.item, E), { season: 'summer', lod: 1, L: null });
      const ids = new Set([...(C.items || []).map(i => i.o), ...(C.actors || []).map(a => a.o), ...(C.flocks || []).map(f => f.o)]);
      for (const id of ids) used.set(id, (used.get(id) || 0) + 1);
    } catch { /* a broken scene is the lint's business */ }
  }
  return used;
}

export default {
  summary: 'the object library: new (scaffold a stub), lint (the object rules), sheet (variants x seasons x night PNG), list (what there is and who uses it)',
  usage: 'object new <cat>.<name> [--kit "<K call>"] [--variants N] [--kits a,b] [--role r] | object lint [<id>,...] [--json] | object sheet <id>[,...] [--out dir] [--canvas] [--mode light|night] | object list [--category c] [--kit k] [--role r] [--tag t] [--json]',
  positionals: '<new|lint|sheet|list> [<id>]',
  options: {
    kit: { type: 'string', help: 'object new: draw it with the nature kit, e.g. "K.tree(\'alder\')" (sceneObjFromKit: called at the origin with the season and a seed per variant)' },
    variants: { type: 'string', help: 'object new: how many variants (default 3; a landmark has 1)' },
    kits: { type: 'string', help: 'object new: the kits it belongs to (comma separated, from SCENE_KITS: temperate, tropical, arid, urban, towers, shophouse, east-asian, london, people, boats, birds ...); the first also names the file (70-scene-lib-trees-tropical.js)' },
    role: { type: 'string', help: 'object new: its role (one of SCENE_ROLES: tree, shrub, ground, edge, rock, building-far, building-mid, building-near, street, walker, vehicle, boat, bird, animal, sky); default by category' },
    region: { type: 'string', help: 'object new (a landmark): the region of its place:<region>/<key> tag' },
    json: { type: 'boolean', help: 'object lint / list: machine-readable output' },
    out: { type: 'string', help: 'object sheet: the output folder (default .anim-ref/objects/)' },
    canvas: { type: 'boolean', help: 'object sheet: draw with the canvas renderer (78-scene-canvas.js through tools/lib/scene-page.mjs) instead of SVG' },
    mode: { type: 'string', help: 'object sheet: light (default) or night (a dark page)' },
    category: { type: 'string', help: 'object list: only this category' },
    tag: { type: 'string', help: 'object list: only objects with this tag (kit:tropical, role:tree, landmark, signature ...)' },
  },
  notes: [
    'Every object except a landmark carries at least one kit:<kit> tag and exactly one role:<role> tag: archetypes pick objects by kit and role (sceneKitPick), so a new object reaches every scene of its kit without editing a scene.',
    'A landmark (landmark.<slug>) has its own file, at least 80 shapes, a night look (a lit part or 10+ glow shapes, unless tagged natural), the tags landmark and place:<region>/<key>, and flippable: false.',
    'Buildings and vehicles light at real dusk: at least 4 glow shapes (or tag unlit). Street, rail and building objects may never contain a ring with a bar across it (the TfL roundel, 8.4).',
  ],
  async run(args, ctx) {
    const [sub, ...rest] = ctx.positionals;
    if (!sub || !['new', 'lint', 'sheet', 'list'].includes(sub)) throw new Error('object needs a subcommand: new, lint, sheet or list (node tools/anim-pack.mjs object --help)');
    const root = ctx.root;
    if (sub === 'new') {
      const id = rest[0];
      const m = ID_RE.exec(id || '');
      if (!m) throw new Error(`object new needs an id <category>.<name> (lower case, digits and dashes; categories: ${CATEGORIES.join(' ')}), got "${id || ''}"`);
      if (!CATEGORIES.includes(m[1])) throw new Error(`unknown category "${m[1]}" (categories: ${CATEGORIES.join(' ')})`);
      const kits = splitList(args.kits);
      const reg = loadRegistry(root, { fresh: true }), E = engineOf(reg);
      if (E.ready && E.obj(id)) throw new Error(`${id} already exists: an id is stable forever; to change it define a new one`);
      if (E.kits && kits.some(k => !E.kits.includes(k))) throw new Error(`unknown kit(s) ${kits.filter(k => !E.kits.includes(k)).join(', ')} (SCENE_KITS: ${E.kits.join(' ')})`);
      if (args.role && E.roles && !E.roles.includes(args.role)) throw new Error(`unknown role ${args.role} (SCENE_ROLES: ${E.roles.join(' ')})`);
      if (m[1] !== 'landmark' && !kits.length) throw new Error('object new needs --kits <kit,...> (at least one kit: the archetypes pick objects by kit and role)');
      if (args.kit && m[1] === 'landmark') throw new Error('a landmark is drawn natively (refined by hand), not from the kit');
      const variants = args.variants ? Number(args.variants) : (m[1] === 'landmark' ? 1 : 3);
      if (!Number.isInteger(variants) || variants < 1 || variants > 16) throw new Error('--variants must be a whole number from 1 to 16');
      const file = libraryFileFor(root, id, kits);
      appendObject(root, file, objectStub(id, { kit: args.kit, variants, kits, role: args.role, region: args.region }));
      ctx.out(`wrote ${id} into ${file}`);
      ctx.out(`next: draw it in build(), then node tools/anim-pack.mjs object lint ${id} && node tools/anim-pack.mjs object sheet ${id}`);
      return 0;
    }
    const reg = loadRegistry(root, { fresh: true }), E = engineOf(reg);
    E.require(`object ${sub}`);
    const thresholds = loadThresholds(root);
    const all = E.objs().map(d => d.id).sort();
    const ids = splitList(rest);
    for (const id of ids) if (!E.obj(id)) throw new Error(`no object ${id} (object list shows what the library holds)`);
    if (sub === 'lint') {
      const list = ids.length ? ids : all;
      const res = list.map(id => lintObject(id, { E, thresholds }));
      const failing = res.filter(r => !r.pass);
      if (args.json) { ctx.out(JSON.stringify({ ok: !failing.length, objects: res.map(r => ({ id: r.id, pass: r.pass, failures: r.rules.filter(x => !x.ok), stats: r.stats })) }, null, 1)); return failing.length ? 2 : 0; }
      ctx.out(`anim-pack object lint: ${res.length} object(s)`);
      for (const r of res) {
        if (r.pass && list.length > 3) continue;
        ctx.out(`\n${r.pass ? 'PASS' : 'FAIL'}  ${r.id}   ${r.stats.shapes} shapes, ${r.stats.glow} glow, parts ${(r.stats.parts || []).join(' ')}, hooks ${(r.stats.anim || []).join(' ') || 'none'}`);
        for (const x of r.rules) if (list.length <= 3 || !x.ok) ctx.out(`    ${x.ok ? 'PASS' : 'FAIL'}  ${pad(x.rule, 16)} ${lpad(x.value, 14)}   ${x.limit}${x.ok ? '' : `\n          -> ${x.message}`}`);
      }
      ctx.out('');
      ctx.out(failing.length ? `FAIL: ${failing.length} of ${res.length} object(s): ${failing.map(r => r.id).join(', ')}` : `PASS: ${res.length} objects clean.`);
      return failing.length ? 2 : 0;
    }
    if (sub === 'list') {
      const used = objectUse(reg, E);
      const rows = all.map(id => {
        const d = E.obj(id), t = d.tags || [];
        let R = null; try { R = E.shapes(id, 0, 'summer'); } catch { /* listed as broken */ }
        return { id, category: d.category, kits: t.filter(x => x.startsWith('kit:')).map(x => x.slice(4)), role: (t.find(x => x.startsWith('role:')) || '').slice(5), variants: d.variants || 1, seasons: d.seasonal === false ? 1 : 4, parts: R ? R.order || Object.keys(R.parts) : [], anim: R ? (R.anim || []).map(a => a.kind) : [], usedBy: used.get(id) || 0, tags: t };
      }).filter(r => (!args.category || r.category === args.category) && (!args.kit || r.kits.includes(args.kit)) && (!args.role || r.role === args.role) && (!args.tag || r.tags.includes(args.tag)));
      if (args.json) { ctx.out(JSON.stringify({ objects: rows }, null, 1)); return 0; }
      ctx.out(`${pad('id', 34)} ${pad('category', 10)} ${pad('kits', 22)} ${pad('role', 13)} ${lpad('var', 3)} ${lpad('sea', 3)} ${pad('parts', 18)} ${pad('hooks', 14)} ${lpad('scenes', 6)}`);
      for (const r of rows) ctx.out(`${pad(r.id, 34)} ${pad(r.category, 10)} ${pad(r.kits.join(',') || '-', 22)} ${pad(r.role || '-', 13)} ${lpad(r.variants, 3)} ${lpad(r.seasons, 3)} ${pad(r.parts.join(',').slice(0, 18), 18)} ${pad(r.anim.join(',').slice(0, 14) || '-', 14)} ${lpad(r.usedBy, 6)}`);
      ctx.out(`\n${rows.length} object(s)${args.kit ? ` in kit ${args.kit}` : ''}${args.role ? ` with role ${args.role}` : ''}. Compose from these first; add an object (object new) only when the subject truly needs one.`);
      return 0;
    }
    // sheet
    if (!ids.length) throw new Error('object sheet needs ids: object sheet tree.oak,building.station-holden');
    const mode = args.mode || 'light';
    if (!['light', 'night', 'dark'].includes(mode)) throw new Error('--mode must be light or night');
    const outDir = resolve(args.out || join(root, '.anim-ref', 'objects'));
    mkdirSync(outDir, { recursive: true });
    const exe = findBrowser();
    if (!exe) throw new Error('No Chrome, Edge or Chromium found. Set CHROME_PATH to its executable.');
    const chrome = await launchChrome({ executable: exe });
    try {
      for (const id of ids) {
        const file = join(outDir, `${id}-${args.canvas ? 'canvas-' : ''}${mode}.png`);
        if (args.canvas) {
          let page;
          try { page = await import('../scene-page.mjs'); } catch { throw new Error('--canvas needs the page harness tools/lib/scene-page.mjs (the canvas renderer), which this checkout does not have yet'); }
          const def = E.obj(id), variants = def.variants || 1, seasons = def.seasonal === false ? ['summer'] : SEASONS;
          const R0 = E.shapes(id, 0, 'summer'), h = Math.max(40, (R0.box[3] - R0.box[1])), s = Math.min(1.4, 180 / h);
          const place = [];
          for (let v = 0; v < variants; v++) seasons.forEach((season, j) => place.push({ obj: id, x: 200 + j * 330, y: 280 + v * 220, s, variant: v, season, layer: 'fore', anim: false }));
          const data = { v: 1, id: 'object-sheet', view: { lat: 51.5, lon: -0.12, heading: 180, fov: 80, horizon: 120 }, at: 'noon', season: 'auto', setting: 'natural', weather: 'none', particles: 'none', sky: { stars: 0, sunR: 0, moonR: 0, clouds: { n: 0 } }, place };
          await page.sceneRenderPng(chrome, { root, data, size: { w: 1600, h: Math.min(2400, 120 + variants * 220) }, still: true, at: mode === 'light' ? null : '2026-10-07T22:00:00Z', location: [51.5, -0.12] }, file);
        } else {
          writeFileSync(file, await chrome.screenshot({ html: objectSheetHtml(reg, E, id, { mode }), width: 1500, height: 'auto', transparent: false }));
        }
        ctx.out(file);
      }
    } finally { await chrome.close(); }
    return 0;
  },
};
