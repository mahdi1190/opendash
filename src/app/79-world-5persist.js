/* ============================================================
   WORLD ENGINE v3: what a world scene keeps between page loads (docs/dev/WORLD_LOAD.md). Private prefix _wps. Browser only at use
   (pure at load: functions and constants; every call is guarded, Node never reaches IndexedDB).

   A world opening used to rebuild everything on every load: the world (worldBuild, 0.7-1.5 s), the ground detail plan (1.9 s on
   Albert Square), every chunk bitmap, the static shadows, the water and its mirror, the night lights. Only the v2 base layers were
   kept. This file keeps the rest in the persistent scene store (78-scene-cache.js, IndexedDB), each under the scene's OWN key:

     W|<id>|world|<season>        the built world (structured clone; the memo of 79-world-5host.js worldHostWorld takes it back)
     W|<id>|gplan                 the ground detail plan (79-world-4ground.js worldGroundDetail: geometry only, per world)
     W|<id>|p|<product key>       one product of the world-frame bake (79-world-5frame.js _wfrBakeJob), keyed exactly as the bake's own
                                  in-memory cache keys it ('gd|' ground layers, 'ch|' chunks, 'sh|' static shadow, 'wa|' water, 'li|' lights):
                                  a new light inside the same band, another day, another session all reuse the same products
     W|<id>|m|<geometry>          the manifest: which products were kept at that canvas geometry (with their season and band), so a bake
                                  fetches only what it can use, in one transaction, while its life is built
     W|<id>|still|<season>|<tod>  a kept still (WebP) of the scene's first frame: the first picture of an opening, a tile or a Home card
                                  before anything is built (a world item's markup never builds its world: 70-scene-svg.js, 71-anim-registry.js)

   <id> = worldPersistId(spec): the world engine's version (build.mjs: <meta name="freeflo-world-version">, the hash of the files that
   draw a world's pixels) + a hash of the scene's own spec + WORLD_PERSIST_FORMAT. Editing one scene, a v2 pack, the registry or the
   app keeps every other scene's records; the store evicts by last use (300 MB, 78-scene-cache.js).

     worldPersistOn()                           the store is there (and not switched off: window.__worldPersistOff, tools)
     worldPersistId(spec)                       Promise<string | null>
     worldPersistWorldGet(spec, season)         Promise<world | null>
     worldPersistWorldPut(spec, season, world)  in idle time (a clone of the pristine world)
     worldPersistStillGet(spec, season, tod)    Promise<Blob | null>
     worldPersistStillPut(spec, season, tod, canvas)   in idle time (WebP, at most WORLD_PERSIST_STILL_W wide)
     worldPersistPrefetch(env, S)               (the bake's prebake) starts reading what this bake can reuse
     worldPersistTake(S, key, o)                (the bake) a kept product in the bake cache's form, or undefined
     worldPersistRemember(S, key, kind, value)  (the bake) a product made now, kept after the bake (worldPersistSaveSoon)
     worldPersistSaveSoon(env, S)               (the bake's end) encodes and keeps what was made, in idle time, off the main thread
   ============================================================ */

const WORLD_PERSIST_FORMAT = 1;
const WORLD_PERSIST_WAIT_MS = 2500;          // a bake waits at most this long for its kept products (then makes them)
const WORLD_PERSIST_MANIFEST_MAX = 96;       // products listed per geometry (most recent first)
const WORLD_PERSIST_STILL_W = 2560;          // a kept still at most this wide (device px)
const WORLD_PERSIST_SAVE_DELAY_MS = 3000;    // a bake's products are kept this long after it is ready (its first seconds play undisturbed)
let _wpsEngineP = null, _wpsSaving = 0;
/** Tools: how many keeps are still on their way to the store (a load profile waits for 0 before it loads the page again). */
function worldPersistBusy() { return _wpsSaving; }
const _wpsSpecHashes = new WeakMap();
const _wpsNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const _wpsIdle = (fn, timeout) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: timeout || 4000 }) : setTimeout(fn, 60));

function worldPersistOn() {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined' || window.__worldPersistOff) return false;
    return typeof sceneStoreOn === 'function' && sceneStoreOn();
  } catch (e) { return false; }
}
function _wpsMeta(name) {
  try { const m = document.querySelector('meta[name="' + name + '"]'), v = m && m.getAttribute('content'); return typeof v === 'string' && /^[a-f0-9]{16,64}$/.test(v) ? v : null; } catch (e) { return null; }
}
/** The world engine's version: the build's hash of what draws a world, else the scene version (tools: a hash of the app script). */
function _wpsEngine() {
  if (_wpsEngineP) return _wpsEngineP;
  const m = _wpsMeta('freeflo-world-version');
  _wpsEngineP = m ? Promise.resolve(m) : (typeof sceneStoreVersion === 'function' ? Promise.resolve(sceneStoreVersion()).catch(() => 'none') : Promise.resolve('none'));
  return _wpsEngineP;
}
/** Two 32-bit FNV-style hashes of a string, as hex (64 bits: collisions between a user's scenes are not a concern). */
function _wpsHash(s) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = Math.imul(h2 + c, 2246822519) ^ (h2 >>> 13); }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}
/** A spec's own hash (memoised per spec object; a lazy spec is read once). */
function worldPersistSpecHash(spec) {
  if (!spec || typeof spec !== 'object') return null;
  const hit = _wpsSpecHashes.get(spec);
  if (hit) return hit;
  let h = null;
  try { h = _wpsHash(JSON.stringify(spec)); } catch (e) { h = null; }
  if (h) _wpsSpecHashes.set(spec, h);
  return h;
}
/** The scene's id in the store: engine version . spec hash . format (null: not kept). */
async function worldPersistId(spec) {
  const sh = worldPersistSpecHash(spec);
  if (!sh) return null;
  const eng = await _wpsEngine();
  return !eng || eng === 'none' ? null : eng.slice(0, 16) + '.' + sh + '.' + WORLD_PERSIST_FORMAT;
}

/* ---------- the built world and the ground plan ---------- */
/** A kept world for a spec and season (the live world: season undefined), or null. */
async function worldPersistWorldGet(spec, season) {
  if (!worldPersistOn()) return null;
  const id = await worldPersistId(spec);
  if (!id) return null;
  const rec = await sceneStoreGet('W|' + id + '|world|' + (season || '-'));
  return rec && rec.world && typeof rec.world === 'object' ? rec.world : null;
}
/** Keep a built world (in idle time; world: a pristine clone that nobody else holds). */
function worldPersistWorldPut(spec, season, world) {
  if (!worldPersistOn() || !world || world.minimal) return;
  _wpsIdle(async () => {
    try {
      const id = await worldPersistId(spec);
      if (!id) return;
      const n = (world.entities || []).length + 4 * (world.surfaces || []).length + 8 * (world.buildings || []).length + 2 * (world.lines || []).length;
      await sceneStorePut({ k: 'W|' + id + '|world|' + (season || '-'), world, at: Date.now() }, 64 * 1024 + n * 900);
    } catch (e) { /* not kept: built again next time */ }
  });
}
function worldPersistPlanPut(spec, plan) {
  if (!worldPersistOn() || !plan || !Array.isArray(plan.groups) || plan.stats && plan.stats.error) return;
  _wpsSaving++;
  _wpsIdle(async () => {
    try {
      const id = await worldPersistId(spec);
      if (!id) return;
      let n = 0;
      for (const g of plan.groups) n += (g.marks || []).length;
      for (const w of plan.walls || []) for (const r of w.runs || []) n += (r.marks || []).length;
      await sceneStorePut({ k: 'W|' + id + '|gplan', plan }, 16 * 1024 + n * 90);
    } catch (e) { /* not kept */ } finally { _wpsSaving--; }
  });
}

/* ---------- kept stills ---------- */
/** The time-of-day bucket of a kept still: the sky's tod (dawn, day, dusk, night), else from the light. */
function worldPersistTod(skyOrL) {
  const x = skyOrL || {};
  if (typeof x.tod === 'string' && /^(dawn|day|dusk|night)$/.test(x.tod)) return x.tod;
  if ((x.dark || 0) > 0.6) return 'night';
  const alt = Number(x.alt);
  if (Number.isFinite(alt) && alt < 4) return (Number(x.az) || 180) < 180 ? 'dawn' : 'dusk';
  return 'day';
}
async function worldPersistStillGet(spec, season, tod) {
  if (!worldPersistOn()) return null;
  const id = await worldPersistId(spec);
  if (!id) return null;
  const rec = await sceneStoreGet('W|' + id + '|still|' + (season || '-') + '|' + (tod || 'day'));
  return rec && rec.blob && typeof rec.blob.size === 'number' ? rec.blob : null;
}
/** A canvas scaled to at most maxW wide (the same canvas when it already fits, unless copy: then always a new one). */
function _wpsScaled(c, maxW, copy) {
  if (!c || !c.width || (c.width <= maxW && !copy)) return c;
  const k = Math.min(1, maxW / c.width), w = Math.max(1, Math.round(c.width * k)), h = Math.max(1, Math.round(c.height * k));
  const o = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const x = o.getContext('2d');
  x.imageSmoothingQuality = 'high';
  x.drawImage(c, 0, 0, w, h);
  return o;
}
/** A canvas as a WebP blob (PNG where the browser has no WebP encoder), or null. */
async function worldPersistEncodeWebp(c, quality) {
  try {
    if (typeof c.convertToBlob === 'function') return await c.convertToBlob({ type: 'image/webp', quality: quality || 0.82 });
    return await new Promise((res) => c.toBlob(b => res(b || null), 'image/webp', quality || 0.82));
  } catch (e) { return null; }
}
/** Keep a scene's first frame (in idle time). canvas: the frame at the base moment (a capture 'still'), any size. */
function worldPersistStillPut(spec, season, tod, canvas) {
  if (!worldPersistOn() || !canvas || !canvas.width) return;
  // a copy now (the caller frees its canvas as soon as it has kept its own still), encoded in idle time
  let copy = null;
  try { copy = _wpsScaled(canvas, WORLD_PERSIST_STILL_W, true); } catch (e) { return; }
  _wpsIdle(async () => {
    try {
      const id = await worldPersistId(spec);
      if (!id) return;
      const blob = await worldPersistEncodeWebp(copy, 0.84);
      if (blob) await sceneStorePut({ k: 'W|' + id + '|still|' + (season || '-') + '|' + (tod || 'day'), blob, w: canvas.width, h: canvas.height, at: Date.now() }, blob.size + 512);
    } catch (e) { /* not kept */ }
  });
}

/* ---------- the world-frame bake's products ---------- */
/** The geometry part of the bake's keys (79-world-5frame.js: chunks, shadows, water). */
function _wpsGeo(env) { return env.W + 'x' + env.H + '|' + Math.round(env.vs * 1e4) + '|' + Math.round(env.ox) + ',' + Math.round(env.oy); }
/** The band a bake will make (the same as its step 1: _wfrBand of the sky at the light's moment). */
function _wpsBand(env, S) {
  try {
    const L = env.L, world = S.rec.world, ms = L && Number.isFinite(L.ms) ? L.ms : null;
    if (typeof _wfrTimeCtx === 'function' && typeof _wfrSky === 'function' && typeof _wfrBand === 'function') return _wfrBand(L, _wfrSky(_wfrTimeCtx(world, ms, { L, season: S.season }), world.cam, L));
  } catch (e) { /* below */ }
  return null;
}
/**
 * At the bake's start (the world-frame pass's prebake): read the manifest of this scene at this geometry and every kept product this
 * bake can use (its season and band, its light key), and the ground plan; decode the bitmaps off the main thread. S.persist.pending
 * stays true until then (the bake waits for it at most WORLD_PERSIST_WAIT_MS before its first product). Only a renderer that keeps its
 * bake (env.cacheId: the host's live library scenes and its idle preparation) reads or keeps anything.
 */
function worldPersistPrefetch(env, S) {
  if (!env || !S || !env.cacheId || !worldPersistOn() || env.still) return;
  const spec = S.rec && S.rec.spec;
  if (!spec) return;
  const P = S.persist = { pending: true, got: new Map(), made: new Map(), listed: new Set(), gplan: null, gplanMade: false, hits: 0, misses: 0, id: null, geo: _wpsGeo(env), band: _wpsBand(env, S), lk: (env.out && env.out.lk) || '', t0: _wpsNow(), readMs: 0 };
  (async () => {
    const id = P.id = await worldPersistId(spec);
    if (!id) return;
    const [man, gp] = await sceneStoreGetMany(['W|' + id + '|m|' + P.geo, 'W|' + id + '|gplan']);
    if (gp && gp.plan && Array.isArray(gp.plan.groups)) P.gplan = gp.plan;
    const items = man && Array.isArray(man.items) ? man.items : [];
    for (const it of items) P.listed.add(it.key);
    // what this bake can use: its season, and its band or its exact light key (lights: the same light key's moment)
    const want = items.filter(it => it && it.key && it.season === S.season && (it.kind === 'lights' ? it.lk === P.lk : it.band === P.band || it.lk === P.lk)).slice(0, 48);
    if (!want.length) return;
    const recs = await sceneStoreGetMany(want.map(it => 'W|' + id + '|p|' + it.key));
    const tasks = [];
    recs.forEach((r, i) => {
      if (!r || !Array.isArray(r.blobs)) return;
      tasks.push(sceneStoreDecode(r.blobs).then((bms) => { if (bms.every(Boolean)) P.got.set(want[i].key, { kind: r.kind, meta: r.meta, bms }); else bms.forEach(b => b && b.close && b.close()); }));
    });
    await Promise.all(tasks);
  })().catch(() => {}).then(() => { P.pending = false; P.readMs = Math.round(_wpsNow() - P.t0); });
}
/** A decoded bitmap as a CPU canvas (a frame then draws it as cheaply as a baked one; the bitmap is closed). */
function _wpsCanvasOf(b) {
  if (!b) return null;
  const c = typeof _wfrCanvas === 'function' ? _wfrCanvas(b.width, b.height) : new OffscreenCanvas(b.width, b.height);
  const cx = c.getContext('2d', { willReadFrequently: true });
  cx.drawImage(b, 0, 0);
  try { cx.getImageData(0, 0, 1, 1); } catch (e) { /* drawn on first use */ }
  try { b.close(); } catch (e) { /* not a bitmap */ }
  return c;
}
/**
 * A kept product in the form the bake's cache holds it, or undefined. o: { regions (water: the bake's S.regions), chunks (lights: the
 * plan's chunks) }. The decoded bitmaps become CPU canvases here (a few ms a megabyte: the bake yields after each product).
 */
function worldPersistTake(S, key, o) {
  const P = S && S.persist, g = P && P.got.get(key);
  if (!g) { if (P) { P.misses++; (P.missed || (P.missed = [])).push(String(key).split('|').slice(0, 1).concat(String(key).split('|').slice(-3)).join('|')); } return undefined; }
  P.got.delete(key);
  const m = g.meta || {}, bms = g.bms;
  let v;
  try {
    if (g.kind === 'layer') v = Object.assign({ c: _wpsCanvasOf(bms[0]) }, m.box || {});
    else if (g.kind === 'shadow') v = Object.assign({ c: _wpsCanvasOf(bms[0]), plan: m.plan || [] }, m.box || {});
    else if (g.kind === 'water') {
      const regions = (o && o.regions) || [];
      v = [];
      for (const w of m.regions || []) {
        const R = regions[w.i];
        if (!R || String((R.ids || [R.id]).join(',')) !== w.rid) { v = undefined; break; }
        v.push({ R, res: { x0: w.x0, y0: w.y0, w: w.w, h: w.h, px: w.px || 0, wet: w.wet || 0, gaps: w.gaps || 0, img: null, base: null, refl: null, zb: null,
          baseCanvas: w.b >= 0 ? _wpsCanvasOf(bms[w.b]) : null, reflCanvas: w.r >= 0 ? _wpsCanvasOf(bms[w.r]) : null } });
      }
    } else if (g.kind === 'lights') {
      const bySig = new Map(((o && o.chunks) || []).map(ch => [_wpsChunkSig(ch), ch]));
      v = { n: m.n || 0, ground: m.ground ? Object.assign({ c: _wpsCanvasOf(bms[m.ground.b]) }, { x: m.ground.x, y: m.ground.y }) : null, byChunk: new Map() };
      for (const q of m.chunks || []) { const ch = bySig.get(q.sig); if (ch) v.byChunk.set(ch, { glass: null, glow: { c: _wpsCanvasOf(bms[q.b]), x: q.x, y: q.y } }); }
    }
  } catch (e) { v = undefined; }
  if (v === undefined) { for (const b of bms) { try { if (b && b.close) b.close(); } catch (e2) { /* gone */ } } P.misses++; return undefined; }
  P.hits++;
  P.listed.add(key);
  return v;
}
function _wpsChunkSig(ch) { return typeof _wfrHashStr === 'function' ? _wfrHashStr((ch.ents || []).map(r => r.id).join(',')) : _wpsHash((ch.ents || []).map(r => r.id).join(',')); }
/** A product this bake made (or found in memory) that the store does not list yet: kept after the bake. */
function worldPersistRemember(S, key, kind, value, extra) {
  const P = S && S.persist;
  if (!P || !key || value == null || P.listed.has(key) || P.made.has(key)) return;
  P.made.set(key, { kind, value, extra: extra || null });
}
/** The canvases of a product and its meta (or null: nothing worth keeping). */
function _wpsPack(key, item, S) {
  const v = item.value, list = [], put = (c) => { if (!c || !c.width || !c.height) return -1; list.push(c); return list.length - 1; };
  const box = (x) => ({ x: x.x | 0, y: x.y | 0, w: x.w, h: x.h });
  if (item.kind === 'layer') { if (!v.c) return null; put(v.c); return { list, meta: { box: box(v) } }; }
  if (item.kind === 'shadow') {
    if (!v.c) return null;
    put(v.c);
    // the shadows' holes over the water only (S.shade): the rest of the plan is the bitmap
    const plan = (v.plan || []).filter(s => s && s.holesScr && s.holesScr.length).map(s => ({ holesScr: s.holesScr, op: s.op }));
    return { list, meta: { box: box(v), plan } };
  }
  if (item.kind === 'water') {
    const regions = [];
    for (const w of v || []) {
      const R = w.R, res = w.res, i = (S.regions || []).indexOf(R);
      if (!res || !res.w || !res.h || i < 0) return null;
      const mk = (img) => { if (!img || !img.data) return null; const c = typeof _wfrCanvas === 'function' ? _wfrCanvas(res.w, res.h) : new OffscreenCanvas(res.w, res.h); c.getContext('2d').putImageData(new ImageData(img.data, res.w, res.h), 0, 0); return c; };
      regions.push({ i, rid: String((R.ids || [R.id]).join(',')), x0: res.x0, y0: res.y0, w: res.w, h: res.h, px: res.px, wet: res.wet, gaps: res.gaps,
        b: put(res.baseCanvas || mk(res.base)), r: put(res.reflCanvas || mk(res.refl)) });
    }
    return regions.length ? { list, meta: { regions } } : null;
  }
  if (item.kind === 'lights') {
    const meta = { n: v.n || 0, ground: null, chunks: [] };
    if (v.ground && v.ground.c) meta.ground = { b: put(v.ground.c), x: v.ground.x | 0, y: v.ground.y | 0 };
    if (v.byChunk) for (const [ch, out] of v.byChunk) { if (out && out.glow && out.glow.c) meta.chunks.push({ sig: _wpsChunkSig(ch), b: put(out.glow.c), x: out.glow.x | 0, y: out.glow.y | 0 }); else if (out && out.glass) return null; }
    return { list, meta };
  }
  return null;
}
/**
 * After the bake is ready: keep what it made (a few seconds later, in idle time; PNG encoding in the store's worker), then the
 * manifest for this geometry (its newest products first) and the ground plan when it was made now.
 */
function worldPersistSaveSoon(env, S) {
  const P = S && S.persist;
  if (!P || P.saving || (!P.made.size && !P.gplanMade)) return;
  P.saving = true; _wpsSaving++;
  const spec = S.rec && S.rec.spec, season = S.season, band = P.band, lk = P.lk, geo = P.geo;
  setTimeout(() => _wpsIdle(async () => {
    try {
      const id = P.id || await worldPersistId(spec);
      if (!id) return;
      if (P.gplanMade && S.rec.frame && S.rec.frame.groundPlan) worldPersistPlanPut(spec, S.rec.frame.groundPlan);
      const made = [...P.made.entries()];
      P.made.clear();
      const kept = await sceneStoreHas(made.map(([k]) => 'W|' + id + '|p|' + k));
      const added = [], todo = [];
      for (const [key, item] of made) {
        if (kept.has('W|' + id + '|p|' + key)) { added.push({ key, kind: item.kind, season, band, lk }); continue; }
        const pk = _wpsPack(key, item, S);
        if (pk && pk.list.length) todo.push({ key, item, pk });
      }
      // every canvas in one encode (the store's worker, PNG: lossless), then a record each; the manifest after every few, so a reload
      // soon after already finds what is kept
      const mk = 'W|' + id + '|m|' + geo;
      const writeManifest = async () => {
        if (!added.length) return;
        const old = await sceneStoreGet(mk), seen = new Set(added.map(a => a.key));
        const items = added.concat(((old && old.items) || []).filter(it => it && !seen.has(it.key))).slice(0, WORLD_PERSIST_MANIFEST_MAX);
        await sceneStorePut({ k: mk, items, at: Date.now() }, 256 + items.length * 160);
        for (const a of added) P.listed.add(a.key);
      };
      for (let i = 0; i < todo.length; i += 4) {
        const part = todo.slice(i, i + 4);
        let blobs;
        try { blobs = await sceneStoreEncode([].concat(...part.map(t => t.pk.list))); } catch (e) { continue; }
        let j = 0;
        for (const t of part) {
          const bl = blobs.slice(j, j + t.pk.list.length); j += t.pk.list.length;
          const bytes = bl.reduce((n, b) => n + (b ? b.size : 0), 512);
          if (await sceneStorePut({ k: 'W|' + id + '|p|' + t.key, kind: t.item.kind, meta: t.pk.meta, blobs: bl }, bytes)) added.push({ key: t.key, kind: t.item.kind, season, band, lk });
        }
        await writeManifest();
      }
      if (!todo.length) await writeManifest();
    } catch (e) { /* kept next time */ }
    finally { P.saving = false; _wpsSaving--; }
  }), WORLD_PERSIST_SAVE_DELAY_MS);
}
const WORLD_STILL_SVG_MEMO = 24;
const _wpsSvgMemo = new Map(), _wpsSvgQueue = [];
let _wpsSvgSeq = 0, _wpsSvgBusy = false;
/** The season an item's svg(so) draws (worldItem's rule, and a superseded item's own season: 71-anim-registry.js animSupersede). */
function _wpsSvgSeason(it, so) {
  so = so || {};
  if (so.season) return so.season;
  const ll = it.liveSky && typeof it.liveSky === 'object' ? it.liveSky : {};
  const own = it.sceneSeason || it.ukSeason;
  if (own && !(so.sky && Number.isFinite(so.sky.ms))) return own;
  if (so.sky && Number.isFinite(so.sky.ms) && typeof sceneSeason === 'function') return sceneSeason(so.sky.ms, ll.lat);
  return own || 'summer';
}
/** A world item's still as SVG markup (the body of animItemHtml's <svg>), without building anything now. */
function worldStillSvg(it, so) {
  so = so || {};
  if (typeof document === 'undefined' || !it || !it.worldSpec || typeof worldHostWorldReady !== 'function') return it.svg(so);
  const season = _wpsSvgSeason(it, so), tod = so.tod || (so.sky && so.sky.tod) || '', size = so.size || 'md';
  const key = worldHostItemId(it) + '|' + season + '|' + size + '|' + tod + '|' + (so.reduced ? 1 : 0) + '|' + (so.theme || '');
  const hit = _wpsSvgMemo.get(key);
  if (hit != null) return hit;
  if (worldHostWorldReady(it.worldSpec, season)) {
    let svg = '';
    try { svg = it.svg(so); } catch (e) { svg = ''; }
    _wpsSvgKeep(key, svg);
    return svg;
  }
  const n = ++_wpsSvgSeq;
  _wpsSvgQueue.push({ n, key, it, so, season });
  setTimeout(_wpsSvgPump, 0);
  // the placeholder: the scene's sky over its ground (the host's own placeholder colours)
  let top = '#3a80c4', low = '#dcebf2';
  try {
    const ll = it.liveSky && typeof it.liveSky === 'object' ? it.liveSky : {};
    const L = typeof sceneLight === 'function' ? sceneLight(so, { lat: ll.lat, lon: ll.lon, season, at: 'afternoon' }) : null;
    if (L && /^#[0-9a-f]{6}$/i.test(L.top || '')) top = L.top;
    if (L && /^#[0-9a-f]{6}$/i.test(L.low || '')) low = L.low;
  } catch (e) { /* the day sky */ }
  return `<g data-wst="${n}"><defs><linearGradient id="wst-${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="0.62" stop-color="${low}"/><stop offset="0.62" stop-color="#8d9a7a"/><stop offset="1" stop-color="#6f7c5e"/></linearGradient></defs><rect width="1600" height="900" fill="url(#wst-${n})"/></g>`;
}
function _wpsSvgKeep(key, svg) {
  _wpsSvgMemo.delete(key); _wpsSvgMemo.set(key, svg);
  while (_wpsSvgMemo.size > WORLD_STILL_SVG_MEMO) _wpsSvgMemo.delete(_wpsSvgMemo.keys().next().value);
}
/** One placeholder at a time: its world restored or built, its SVG drawn (idle periods), every placeholder of it replaced. */
function _wpsSvgPump() {
  if (_wpsSvgBusy || !_wpsSvgQueue.length) return;
  const job = _wpsSvgQueue.shift();
  if (!document.querySelector('g[data-wst="' + job.n + '"]')) { _wpsSvgPump(); return; }   // no longer on the page
  _wpsSvgBusy = true;
  worldHostWorldPrepare(job.it.worldSpec, { season: job.season }).catch(() => false).then(() => new Promise((res) => _wpsIdle(() => {
    try {
      let svg = _wpsSvgMemo.get(job.key);
      if (svg == null) { svg = job.it.svg(job.so); _wpsSvgKeep(job.key, svg); }
      for (const g of document.querySelectorAll('g[data-wst="' + job.n + '"]')) { g.removeAttribute('data-wst'); g.innerHTML = svg; }
    } catch (e) { /* the placeholder stays */ }
    res();
  }, 2000))).then(() => { _wpsSvgBusy = false; _wpsSvgPump(); });
}
