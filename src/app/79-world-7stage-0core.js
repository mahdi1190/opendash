/* ============================================================
   WORLD STAGE: a world engine (v3) scene drawn by the garden's engine, Phaser 4.2.1 (WebGL), behind the renderer surface the
   scene host already uses (78-scene-host.js _schStage). docs/dev/WORLD_STAGE.md. Private names: _wsg. Browser only.

   ONE BAKE, TWO PLAYERS. The existing v2 canvas renderer (sceneRendererCreate, 78-scene-canvas.js) is created on a detached canvas
   with the host's options and bakes the scene as always (sky, clouds, ground groups; the world compositor's chunks, water, shadows,
   lights: env._wfr). It is THE BAKER and THE FALLBACK: while the stage plays it never runs its loop, and its own frames (warm-up,
   the frame after a bake) draw into a 1 x 1 context (o.layers). When the stage cannot play (no engine, no WebGL or a software one,
   a lost context, the garden's own game running, not ready in time, evicted by a newer stage), the SAME baker is attached to the
   host's canvas and plays it (Canvas 2D): no second bake.

   ONE GAME PER STAGE, ONE CLOCK. A Phaser.Game (WEBGL) on its own canvas inside the host (class sc-canvas sc-stage: the host's css
   fades it in at sc-ready), sized in device px (Phaser 4.2.1 has no resolution option), one scene. The scene time is the host's
   (o.time: the same _schTime the canvas renderer reads), never Phaser's. At most WORLD_STAGE_MAX stages hold a game at once (the
   oldest hands over to its baker).

   READY = baked AND the world's people there (its life driver) AND every static texture uploaded (in slices, a few ms a frame)
   AND the shaders compiled (hidden frames and the batch suite) AND one real frame drawn: then o.onReady (the host's sc-ready).
   The drawing itself is 79-world-7stage-1layers.js (static layers, texture slots, cross-fades), -2movers.js (people, animals and
   the statics drawn live, the occluder redraws) and -3fx.js (water, mirrors, shadows, lamps, weather).
   ============================================================ */

const WORLD_STAGE_MAX = 2;                  // stages holding a game (a WebGL context) at once
const WORLD_STAGE_GRACE_MS = 1500;          // after the baker is ready, the stage has this long to be ready (else the canvas plays)
const WORLD_STAGE_PEOPLE_MS = 3000;         // ... of which it waits at most this long for the world's life (its people)
const WORLD_STAGE_BOOT_MS = 6000;           // the engine's load and the game's boot, at most
const WORLD_STAGE_MIN_AREA = 360 * 200;     // css px: smaller hosts (tiles) keep the canvas renderer
// textures per batch: ONE. Phaser 4.2.1's multi-texture fragment shader picks its sampler by exact float equality on an interpolated
// varying (outTexDatum == float(INDEX), else transparent): where the interpolation is off by a rounding error, the fragments of any
// texture but the batch's first vanish (rectangles of leaves missing from a tree under SwiftShader; some GPUs interpolate the same
// way). One texture a batch costs a draw call per texture change (a few hundred a frame at most) and compiles one shader.
const WORLD_STAGE_TEXTURES = 1;
const WORLD_STAGE_SLICE_MS = 6;             // texture uploads per frame while preparing (no long task)
const WORLD_STAGE_FADE_S = 0.9;             // a re-bake (light key, season) and a relit chunk cross-fade over this
const _wsgLive = [];                        // live stages, oldest first
let _wsgNoGl = null;                        // why WebGL cannot be had on this page (a later stage goes straight to the canvas)
let _wsgSeq = 0;
const _wsgNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Is the stage on for this page? Tool pages (tools/lib/scene-page.mjs) choose with window.__sceneOpts.renderer ('stage'). */
function worldStageOn() {
  if (typeof window === 'undefined' || typeof document === 'undefined' || window.__sceneStageOff) return false;
  const so = window.__sceneOpts;
  if (so && so.renderer && so.renderer !== 'stage') return false;
  try { if (/(?:[?&#]|^)stage=0(?:&|$)/.test(String(location.search || '') + '&' + String(location.hash || '').replace(/^#/, ''))) return false; } catch (e) { /* no address */ }
  if (typeof FreefloGameEngine === 'undefined' || typeof sceneRendererCreate !== 'function') return false;
  return !_wsgNoGl;
}
/** Tools only: software WebGL (SwiftShader) is allowed on a tool page; the app falls back to the canvas on it. */
function _wsgSoftOk() { const so = typeof window !== 'undefined' ? window.__sceneOpts : null; return !!(so && so.renderer === 'stage'); }
/**
 * Can this page have a hardware WebGL context? Probed once, before the engine is even parsed: a machine without one (or with only a
 * software one, refused by failIfMajorPerformanceCaveat outside tool pages) goes straight to the canvas renderer. Phaser's own boot
 * error is thrown where no caller can catch it (the stage would only fall back at its grace timeout).
 */
function _wsgGlProbe() {
  if (_wsgNoGl) return false;
  if (_wsgGlProbe.ok) return true;
  let ok = false;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl', { failIfMajorPerformanceCaveat: !_wsgSoftOk() }) || c.getContext('experimental-webgl', { failIfMajorPerformanceCaveat: !_wsgSoftOk() });
    ok = !!gl;
    if (gl) { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); }
  } catch (e) { ok = false; }
  if (!ok) _wsgNoGl = 'no hardware WebGL';
  _wsgGlProbe.ok = ok;
  return ok;
}
/** Start the engine's decode and parse now (the opening calls it as the splash holds: Phaser is parsed during the brand). */
function worldStagePreload() {
  if (!worldStageOn() || !_wsgGlProbe()) return null;
  try { return FreefloGameEngine.load().catch((e) => { _wsgNoGl = 'engine: ' + (e && e.message); return null; }); } catch (e) { return null; }
}
/** Should this host's scene play on the stage? A world item, live, not a still, big enough to be a scene, the garden's game idle. */
function worldStageWanted(el, item, data) {
  if (!el || !worldStageOn() || !data || data.world3 !== true || typeof worldHostLive !== 'function') return false;
  const live = worldHostLive(data.id);
  if (!live || !live.compositor) return false;
  const c = el.classList;
  if (!c.contains('is-live') || el.getAttribute('data-sc-still') === '1' || el.getAttribute('data-sc-hover') === '1') return false;
  if (typeof GardenNative !== 'undefined' && GardenNative && typeof GardenNative.active === 'function' && GardenNative.active()) return false;
  const w = el.clientWidth || el.offsetWidth || 0, h = el.clientHeight || el.offsetHeight || 0;
  return w * h >= WORLD_STAGE_MIN_AREA;
}
/** The baker's frames while the stage plays: one shared 1 x 1 context (the world's frame still runs its logic: sprites, the clock). */
let _wsgTinyCx = null;
function _wsgTiny() {
  if (!_wsgTinyCx) { const c = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(1, 1) : Object.assign(document.createElement('canvas'), { width: 1, height: 1 }); _wsgTinyCx = c.getContext('2d', { alpha: true }); }
  return { sky: _wsgTinyCx, groups: [_wsgTinyCx] };
}
/** The device size of a css size (the baker's own rule: dpr-aware, capped by pixel count). */
function _wsgDeviceSize(w, h) {
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, M = typeof SCENE_BACKING_MAX !== 'undefined' ? SCENE_BACKING_MAX : [3840, 2160];
  let W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr));
  const k = Math.min(1, Math.sqrt((M[0] * M[1]) / (W * H)));
  return [Math.max(1, Math.round(W * k)), Math.max(1, Math.round(H * k))];
}

/**
 * The stage for one host. el: the host (.ap-composed); canvas: its canvas.sc-canvas (the fallback draws on it); data: the derived
 * world data; o: the host's renderer options ({ lod, season, L, maxFps, time, flush, profile, onReady, onError }).
 * -> the renderer surface (start, stop, running, ready, baked, baking, waiting, bakeIdle, resize, setLight, setSeason, setLod,
 *    frame, snapshot, attach, stats, resetStats, destroy, env, compiled, geometry, exportBake) plus engine ('phaser' | 'canvas').
 */
function worldStageCreate(el, canvas, data, o) {
  o = o || {};
  const st = { id: ++_wsgSeq, el, hostCanvas: canvas, data, o, baker: null, game: null, scene: null, cv: null, W: 0, H: 0,
    running: false, fell: false, why: null, dead: false, shown: false, readyCalled: false, forceT: null, envShown: null, gen: new Map(),
    t0: _wsgNow(), tBakerReady: 0, tEngine: 0, tGame: 0, tReady: 0, warm: 0, grace: 0, boot: 0, frameNo: 0, lastGardenCheck: 0,
    times: [], st: { frames: 0, uploads: 0, uploadMs: 0, uploadMax: 0, textures: 0, texBytes: 0, objects: 0, images: 0, figures: 0, redraws: 0, statics: 0, fades: 0, errors: [] } };
  // the baker: the v2 renderer on a detached canvas, frames into a 1 x 1 context while the stage plays (o.layers), the host's
  // canvas once it falls back. No persistent cache (its kept still is captured by a frame that moves the world's clock)
  const det = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(1, 1) : document.createElement('canvas');
  st.baker = sceneRendererCreate(det, data, { lod: o.lod, still: false, season: o.season, L: o.L, maxFps: o.maxFps, time: o.time, flush: o.flush, profile: o.profile, hideUntilReady: true,
    layers: () => (st.fell ? null : _wsgTiny()),
    onReady: () => _wsgBakerReady(st), onError: (e) => { if (o.onError) o.onError(e); } });
  _wsgLive.push(st);
  const B = st.baker;
  const api = {
    get engine() { return st.fell ? 'canvas' : 'phaser'; },
    get baked() { return B.baked; },
    get env() { return B.env; },
    get waiting() { return B.waiting; },
    get baking() { return B.baking; },
    get ready() { return st.fell ? B.ready : st.shown; },
    get running() { return st.fell ? B.running : st.running; },
    get compiled() { return B.compiled; },
    get geometry() { return B.geometry; },
    exportBake() { return B.exportBake(); },
    bakeIdle(w, h, opt) {
      B.bakeIdle(w, h, opt);
      if (!st.fell && !st.boot) _wsgBoot(st, w, h);
    },
    resize(w, h) { B.resize(w, h); },
    setLight(L) { B.setLight(L); },
    setSeason(s) { B.setSeason(s); },
    setLod(k) { B.setLod(k); },
    start() {
      if (st.dead) return;
      if (st.fell) { B.start(); return; }
      st.running = true;
      if (st.game && st.game.loop && !st.game.loop.running) { try { st.game.loop.wake(); } catch (e) { /* the next frame */ } }
    },
    stop() {
      if (st.fell) { B.stop(); return; }
      st.running = false;   // the loop sleeps at the end of its frame (preparation keeps it awake until ready)
    },
    /** One frame at t now (a clock restart, a tool's pinned moment). Before the stage shows: nothing is on screen to redraw. */
    frame(t) {
      if (st.fell) { B.frame(t); return; }
      if (!st.shown || !st.game) return;
      _wsgStepAt(st, t || 0);
    },
    /** The frame at t in a new canvas: the stage's own pixels (read back right after drawing), else the baker's frame. */
    snapshot(t) {
      if (st.fell || !st.shown) return B.snapshot(t);
      try { const c = _wsgReadBack(st, t || 0); if (c) return c; } catch (e) { /* the baker's */ }
      return B.snapshot(t);
    },
    /** The host was re-mounted with the same key: the stage's canvas moves beside the canvas it was handed. */
    attach(c2) {
      if (!c2) return;
      if (st.fell) { B.attach(c2); st.hostCanvas = c2; return; }
      st.hostCanvas = c2;
      const host = c2.parentNode;
      if (host && host.classList) { st.el = host; host.classList.add('sc-staged'); }
      if (st.cv && c2.parentNode) c2.insertAdjacentElement('afterend', st.cv);
    },
    stats() {
      const s = B.stats();
      s.engine = st.fell ? 'canvas' : 'phaser';
      s.stage = _wsgStats(st);
      if (!st.fell && st.times.length) { s.canvasDrawMs = s.drawMs; s.drawMs = s.stage.frameMs; }
      return s;
    },
    resetStats() { B.resetStats(); st.times.length = 0; },
    destroy() { _wsgDestroy(st); },
    /** Tools: the baker (the canvas renderer of the same bake: its snapshot(t) is the canvas path's frame of the same moment). */
    get baker() { return B; },
    /** Tools: hand this stage over to the canvas now (the fallback path, on purpose). */
    fallBack(why) { _wsgFall(st, why || 'asked'); },
    /** Tools and the docs: the stage's own state (phase, timings, textures). */
    get stage() { return _wsgStats(st); },
  };
  st.api = api;
  return api;
}

/** Load the engine and boot the game (in parallel with the bake). */
function _wsgBoot(st, w, h) {
  st.boot = _wsgNow();
  if (!_wsgGlProbe()) { _wsgFall(st, _wsgNoGl || 'no WebGL'); return; }
  st.bootTimer = setTimeout(() => { if (!st.scene && !st.fell && !st.dead) _wsgFall(st, 'the engine did not start in time'); }, WORLD_STAGE_BOOT_MS);
  let p;
  try { p = FreefloGameEngine.load(); } catch (e) { _wsgFall(st, 'engine: ' + (e && e.message)); return; }
  p.then((Ph) => {
    st.tEngine = _wsgNow();
    if (st.fell || st.dead) return;
    const [W, H] = st.baker.geometry ? [st.baker.geometry.W, st.baker.geometry.H] : _wsgDeviceSize(w || st.el.clientWidth || 1600, h || st.el.clientHeight || 900);
    _wsgGame(st, Ph, W, H);
  }, (e) => { _wsgNoGl = 'engine: ' + (e && e.message); _wsgFall(st, _wsgNoGl); });
}
function _wsgGame(st, Ph, W, H) {
  // at most WORLD_STAGE_MAX games (WebGL contexts) on the page: the oldest stage hands over to its canvas
  for (;;) {
    const games = _wsgLive.filter(s => s !== st && s.game && !s.fell && !s.dead);
    if (games.length < WORLD_STAGE_MAX) break;
    _wsgFall(games[0], 'evicted by a newer stage');
  }
  const cv = document.createElement('canvas');
  cv.className = 'sc-canvas sc-stage'; cv.setAttribute('aria-hidden', 'true'); cv.width = W; cv.height = H;
  st.cv = cv; st.W = W; st.H = H;
  if (st.hostCanvas && st.hostCanvas.parentNode) st.hostCanvas.insertAdjacentElement('afterend', cv); else st.el.appendChild(cv);
  st.el.classList.add('sc-staged');
  cv.addEventListener('webglcontextlost', (ev) => { try { ev.preventDefault(); } catch (e) { /* no matter */ } _wsgFall(st, 'the graphics context was lost'); });
  const maxFps = Number.isFinite(st.o.maxFps) && st.o.maxFps > 0 ? Math.min(240, st.o.maxFps) : 0;
  const scene = {
    key: 'world-stage-' + st.id,
    create() { st.scene = this; st.tGame = _wsgNow(); clearTimeout(st.bootTimer); try { _wsgSceneInit(st); } catch (e) { _wsgFall(st, 'scene: ' + (e && e.message)); } },
    update() { _wsgTick(st); },
  };
  try {
    st.game = new Ph.Game({ type: Ph.WEBGL, canvas: cv, parent: st.el, width: W, height: H, backgroundColor: '#000000', transparent: false, antialias: true, roundPixels: false, clearBeforeRender: false,
      powerPreference: 'default', failIfMajorPerformanceCaveat: !_wsgSoftOk(), maxTextures: WORLD_STAGE_TEXTURES, preserveDrawingBuffer: false,
      audio: { noAudio: true }, input: { keyboard: false, mouse: false, touch: false, gamepad: false }, disableContextMenu: false, banner: false, autoFocus: false,
      fps: { target: 60, min: 10, limit: maxFps, smoothStep: false }, scene });
  } catch (e) { _wsgNoGl = 'webgl: ' + (e && e.message); _wsgFall(st, _wsgNoGl); return; }
  if (st.game && st.game.renderer && st.game.renderer.type !== Ph.WEBGL) { _wsgNoGl = 'no webgl'; _wsgFall(st, _wsgNoGl); }
}
/** The baker finished a bake (the first one, or a re-bake after a new light, season or size). */
function _wsgBakerReady(st) {
  if (st.dead) return;
  if (st.fell) { _wsgReadyOnce(st); return; }
  if (!st.tBakerReady) {
    st.tBakerReady = _wsgNow();
    st.grace = setTimeout(() => { if (!st.shown && !st.fell && !st.dead) _wsgFall(st, 'the stage was not ready in time'); }, WORLD_STAGE_GRACE_MS);
  }
  const env = st.baker.env;
  if (!env || !env._wfr) { _wsgFall(st, 'no world compositor in the bake'); return; }
  // the loop prepares the new bake's textures (it sleeps only once shown and stopped)
  if (st.game && st.game.loop && !st.game.loop.running) { try { st.game.loop.wake(); } catch (e) { /* the next frame */ } }
}
function _wsgReadyOnce(st) {
  if (st.readyCalled) return;
  st.readyCalled = true;
  if (st.o.onReady) { try { st.o.onReady(); } catch (e) { /* the host's business */ } }
}
/** The scene exists: its fixed objects (stars, the fx graphics, pools); the rest comes with the first bake. */
function _wsgSceneInit(st) {
  if (typeof _wsgLayersInit === 'function') _wsgLayersInit(st);
}
/** One loop step (Phaser's update): prepare until ready, then draw the frame at the host's time. */
function _wsgTick(st) {
  if (st.dead || st.fell || !st.scene) return;
  const a = _wsgNow();
  try {
    if (a - st.lastGardenCheck > 2000) {
      st.lastGardenCheck = a;
      if (typeof GardenNative !== 'undefined' && GardenNative && typeof GardenNative.active === 'function' && GardenNative.active()) { _wsgFall(st, 'the garden is open'); return; }
    }
    if (!st.shown) _wsgPrepare(st);
    else if (st.forceT != null) _wsgFrame(st, st.forceT, false);
    else if (st.running) _wsgFrame(st, st.o.time ? st.o.time() : (_wsgNow() - st.t0) / 1000, false);
  } catch (e) {
    st.st.errors.push(String(e && e.message || e).slice(0, 160));
    if (typeof console !== 'undefined') console.warn('world stage: the canvas instead:', e);
    _wsgFall(st, 'frame: ' + (e && e.message));
    return;
  }
  const took = _wsgNow() - a;
  if (st.shown && st.forceT == null) { st.times.push(took); if (st.times.length > 900) st.times.splice(0, 300); }
  // shown and not playing: the loop sleeps (no frames, no draws); start() wakes it
  if (st.shown && !st.running && st.forceT == null && st.game.loop.running) { try { st.game.loop.sleep(); } catch (e) { /* awake */ } }
}
/** Before the stage shows: the bake's textures in slices, the people, the hidden warm frames, then the first real frame. */
function _wsgPrepare(st) {
  const B = st.baker;
  if (!B.ready || !B.env || !B.env._wfr || !B.env._wfr.ready) return;
  const env = B.env, out = env.out;
  if (out && (out.W !== st.W || out.H !== st.H)) _wsgResize(st, out.W, out.H);
  if (!_wsgGenReady(st, env, WORLD_STAGE_SLICE_MS)) return;
  st.envShown = env;
  const rec = env._wfr.rec;
  if (!rec.driver && _wsgNow() - st.tBakerReady < WORLD_STAGE_PEOPLE_MS) return;
  const t = st.o.time ? st.o.time() : 0;
  if (st.warm < 2) {
    // hidden frames (the canvas is not shown before sc-ready): every texture, batch and blend the scene uses goes through the GPU once
    _wsgFrame(st, t, true);
    if (st.warm === 0) _wsgShaders(st);
    st.warm++;
    return;
  }
  // the first real frame: the scene's clock starts here; the host shows the canvas from it
  _wsgFrame(st, t, false);
  st.shown = true; st.tReady = _wsgNow();
  clearTimeout(st.grace);
  _wsgReadyOnce(st);
}
/** A frame: the static layers of the shown bake (a newer bake is uploaded meanwhile and cross-fades in), the world at t. */
function _wsgFrame(st, t, warming) {
  const B = st.baker;
  // a newer bake (light, season, size): its textures in slices; until they are all there the frame keeps the shown one
  const envB = B.env;
  if (envB && envB !== st.envShown && envB._wfr && envB._wfr.ready && B.ready) {
    const out = envB.out;
    if (out && (out.W !== st.W || out.H !== st.H)) {
      // a new size: nothing of the old bake fits; the switch is at once (the host's css stretched the old frame meanwhile)
      if (_wsgGenReady(st, envB, 1e9)) { _wsgResize(st, out.W, out.H); st.envShown = envB; if (typeof _wsgSlotsReset === 'function') _wsgSlotsReset(st); }
    } else if (_wsgGenReady(st, envB, WORLD_STAGE_SLICE_MS)) st.envShown = envB;
  }
  const env = st.envShown;
  if (!env) return;
  st.frameNo++;
  _wsgDraw(st, env, t, warming);
  st.st.frames++;
}
function _wsgResize(st, W, H) {
  st.W = W; st.H = H;
  try { st.game.scale.resize(W, H); } catch (e) { /* the old size */ }
  try { const cam = st.scene.cameras.main; cam.setSize(W, H); cam.setScroll(0, 0); } catch (e) { /* the old camera */ }
}
/** Draw the frame at t now, synchronously (a restart, a pinned capture): one engine step with the time forced. */
function _wsgStepAt(st, t) {
  st.forceT = t;
  try { st.game.step(_wsgNow(), 16.7); } finally { st.forceT = null; }
}
/** The frame at t read back from the drawing buffer right after it is drawn (the same task, before it is presented). */
function _wsgReadBack(st, t) {
  _wsgStepAt(st, t);
  const gl = st.game.renderer && st.game.renderer.gl;
  if (!gl) return null;
  const W = st.W, H = st.H, px = new Uint8Array(W * H * 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const c = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H });
  const img = new ImageData(W, H), row = W * 4;
  for (let y = 0; y < H; y++) img.data.set(px.subarray((H - 1 - y) * row, (H - y) * row), y * row);
  c.getContext('2d').putImageData(img, 0, 0);
  return c;
}
/**
 * Compile the textured batch shader for every texture count up to the limit (Phaser 4 builds one per count; the first frame that
 * batches a new count would compile it on screen). The garden's technique (94-garden-native-runtime.js prepareShaders) through the
 * same private 4.2.1 programManager; a later engine without it: the hidden frames did the common counts.
 */
function _wsgShaders(st) {
  const rep = st.shaders = { state: 'preparing', compiled: 0, limit: 0, ms: 0 };
  const a = _wsgNow();
  try {
    const renderer = st.game.renderer, nodes = renderer.renderNodes, quad = nodes && typeof nodes.getNode === 'function' && nodes.getNode('BatchHandlerQuad'), manager = quad && quad.programManager;
    if (!manager || typeof quad.finalizeTextureCount !== 'function' || !renderer.shaderProgramFactory) { rep.state = 'unsupported'; return; }
    const standard = (c) => c && c.base && c.base.name === 'STANDARD' && Array.isArray(c.features) && !c.features.length && Array.isArray(c.additions);
    const src = Object.values(manager.programs || {}).map(s => s.config).find(standard) || (standard(manager.currentConfig) ? manager.currentConfig : null);
    if (!src) { rep.state = 'unsupported'; return; }
    const copy = (c) => ({ base: { ...c.base }, additions: c.additions.map(x => ({ ...x })), features: [...c.features] });
    rep.limit = Math.floor(Math.min(16, renderer.maxTextures, quad.maxTexturesPerBatch || renderer.maxTextures));
    for (let n = 1; n <= rep.limit; n++) {
      const prev = manager.currentConfig;
      try {
        manager.currentConfig = copy(src);
        quad.finalizeTextureCount(n);
        const c = manager.currentConfig, key = renderer.shaderProgramFactory.getKey(c.base, c.additions, c.features), had = renderer.shaderProgramFactory.has(key);
        if (manager.getCurrentProgramSuite() && !had) rep.compiled++;
      } finally { manager.currentConfig = prev; }
    }
    rep.state = 'ready';
  } catch (e) { rep.state = 'failed: ' + (e && e.message); }
  finally { rep.ms = Math.round((_wsgNow() - a) * 10) / 10; }
}
/** Hand over to the canvas: the baker plays on the host's canvas (no second bake); the game is disposed. */
function _wsgFall(st, why) {
  if (st.fell || st.dead) return;
  st.fell = true; st.why = why || 'unknown';
  clearTimeout(st.grace); clearTimeout(st.bootTimer);
  const game = st.game, cv = st.cv;
  st.game = null; st.scene = null; st.cv = null;
  if (typeof _wsgLayersFree === 'function') { try { _wsgLayersFree(st); } catch (e) { /* the game goes anyway */ } }
  _wsgDispose(game);
  if (cv && cv.parentNode) cv.remove();
  if (st.el && st.el.classList) st.el.classList.remove('sc-staged');
  const B = st.baker;
  try { if (st.hostCanvas) B.attach(st.hostCanvas); } catch (e) { /* the next frame */ }
  if (st.running) B.start();
  if (B.ready) _wsgReadyOnce(st);
  if (typeof console !== 'undefined' && !/evicted/.test(st.why)) console.info('world stage: the canvas renderer plays this scene (' + st.why + ')');
}
/**
 * Phaser 4.2.1's destroy only asks for disposal on the next step; a sleeping loop has none. Finish it after the current callback
 * (94-garden-world2-renderer.js disposeGame), and before READY wait for it (the scene manager is still booting then).
 */
function _wsgDispose(game) {
  if (!game) return;
  try { game.destroy(true); } catch (e) { return; }
  const finish = () => queueMicrotask(() => { if (!game.pendingDestroy) return; try { if (game.isRunning && typeof game.runDestroy === 'function') game.runDestroy(); else if (game.events) game.events.once('ready', finish); } catch (e) { /* gone */ } });
  finish();
}
function _wsgDestroy(st) {
  if (st.dead) return;
  st.dead = true;
  clearTimeout(st.grace); clearTimeout(st.bootTimer);
  const game = st.game, cv = st.cv;
  st.game = null; st.scene = null; st.cv = null;
  if (typeof _wsgLayersFree === 'function') { try { _wsgLayersFree(st); } catch (e) { /* the game goes anyway */ } }
  _wsgDispose(game);
  if (cv && cv.parentNode) cv.remove();
  if (st.el && st.el.classList) st.el.classList.remove('sc-staged');
  try { st.baker.destroy(); } catch (e) { /* gone */ }
  const i = _wsgLive.indexOf(st);
  if (i >= 0) _wsgLive.splice(i, 1);
}
function _wsgStats(st) {
  const r = (v) => Math.round(v * 100) / 100, a = st.times.slice().sort((x, y) => x - y), q = (p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0);
  const since = (t) => (t ? Math.round(t - st.t0) : null);
  return Object.assign({}, st.st, {
    id: st.id, phase: st.dead ? 'destroyed' : st.fell ? 'canvas' : st.shown ? 'playing' : 'preparing', why: st.why, running: st.running, size: [st.W, st.H], warm: st.warm,
    frameMs: { median: r(q(0.5)), p95: r(q(0.95)), max: r(a.length ? a[a.length - 1] : 0), n: a.length },
    engineMs: since(st.tEngine), gameMs: since(st.tGame), bakerReadyMs: since(st.tBakerReady), readyMs: since(st.tReady),
    engineLoadMs: typeof FreefloGameEngine !== 'undefined' && FreefloGameEngine.status ? Math.round(FreefloGameEngine.status().loadMs || 0) : null,
    shaders: st.shaders || null, uploadMs: r(st.st.uploadMs), uploadMax: r(st.st.uploadMax), errors: st.st.errors.slice(0, 5),
  });
}
if (typeof window !== 'undefined') {
  /** Debug and tools: every stage on the page ({ id, phase, why, frameMs, ... }). */
  window.__worldStages = () => _wsgLive.map(_wsgStats);
}
