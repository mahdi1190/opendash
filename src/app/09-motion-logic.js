/* ============================================================
   MOTION LOGIC (pure): the rules of the motion system (MOTION_SYSTEM v3.1),
   with no DOM and no page globals. src/motion.js (window.Motion) reads these
   globals in the page; tests/motion-logic.test.mjs runs this file in a VM.

     tokens       MOTION_T  MOTION_D  MOTION_STEP  MOTION_SPRING_MS
     intensity    MOTION_LEVELS  MOTION_PROFILES  motionResolveLevel  motionMigrateLevel
                  motionProfile  motionMs  motionPx  motionStaggerDelay
     navigation   motionSectionOf(view, resolve?)  motionNavKind(from, to, resolve?)
                  motionNavDir(from, to)  motionRenderKind(prev, next)
     rotation     MOTION_PALETTES  motionHash  motionPick(context, seed, level, recent)
     lists        motionFlipPlan(before, after, o)   which rows glide, which enter
     sky          motionSkyExtras(weather, o)        wind / rainbow / heat flags for the sky

   "Intensity" is the user's level (Settings > Animations): off | subtle |
   standard | playful. The OS "reduce motion" setting gives 'reduced', which
   wins over the level. Off keeps the old switch's meaning (everything still).
   ============================================================ */

/* ---------- tokens (Standard; the level scales them) ---------- */
const MOTION_T = Object.freeze({ instant: 80, fast: 120, base: 180, slow: 240, slower: 320, enter: 460, stage: 640, long: 900, pulse: 1800 });
const MOTION_D = Object.freeze({ d0: 2, d1: 4, d2: 8, d3: 12, d4: 24, d5: 48 });
const MOTION_STEP = Object.freeze({ char: 22, word: 45, row: 24, chip: 30, card: 55, tile: 60 });
const MOTION_SPRING_MS = Object.freeze({ snappy: 406, gentle: 570, bouncy: 610 });

/* ---------- intensity ---------- */
const MOTION_LEVELS = Object.freeze(['off', 'subtle', 'standard', 'playful']);
/**
 * k: time x; dk: travel x; sk: stagger step x; cap / budget: stagger cap and the last start (ms);
 * loops: ambient loops on screen; burst: celebration weight (0 none .. 3 moments); particles: x.
 */
const MOTION_PROFILES = Object.freeze({
  off:      Object.freeze({ name: 'off', k: 0, dk: 0, sk: 0, cap: 0, budget: 0, loops: 0, move: false, fade: false, burst: 0, particles: 0, vt: 'none', sub: 'none' }),
  reduced:  Object.freeze({ name: 'reduced', k: 0.6, dk: 0, sk: 0, cap: 0, budget: 0, loops: 0, move: false, fade: true, burst: 0, particles: 0, vt: 'fade', sub: 'fade' }),
  subtle:   Object.freeze({ name: 'subtle', k: 0.8, dk: 0.5, sk: 0.6, cap: 3, budget: 160, loops: 2, move: true, fade: true, burst: 1, particles: 0, vt: 'fade', sub: 'fade' }),
  standard: Object.freeze({ name: 'standard', k: 1, dk: 1, sk: 1, cap: 6, budget: 400, loops: 6, move: true, fade: true, burst: 2, particles: 1, vt: 'axis', sub: 'slide' }),
  playful:  Object.freeze({ name: 'playful', k: 1.1, dk: 1.5, sk: 1.15, cap: 8, budget: 520, loops: 8, move: true, fade: true, burst: 3, particles: 1.5, vt: 'axis', sub: 'slide' }),
});
/**
 * The effective level. o: {osReduced, stored ('off'|'subtle'|'standard'|'playful'|null),
 * legacy (the old 'dashboard-motion' value), scoped (a [data-motion-level] on an ancestor)}.
 * The OS setting wins over everything.
 */
function motionResolveLevel(o) {
  o = o || {};
  if (o.osReduced) return 'reduced';
  if (o.scoped && MOTION_LEVELS.includes(o.scoped)) return o.scoped;
  if (o.stored && MOTION_LEVELS.includes(o.stored)) return o.stored;
  if (o.legacy === 'reduced') return 'off';     // the old "Reduce motion" switch zeroed every duration: that is Off
  return 'standard';
}
/** The value to store in 'dashboard-motion-level' once (null: leave it). */
function motionMigrateLevel(stored, legacy) {
  if (stored && MOTION_LEVELS.includes(stored)) return null;
  return legacy === 'reduced' ? 'off' : 'standard';
}
function motionProfile(level) { return MOTION_PROFILES[level] || MOTION_PROFILES.standard; }
/** A duration token (or ms) at a level. */
function motionMs(token, level) {
  const v = MOTION_T[token] != null ? MOTION_T[token] : Number(token) || 0;
  const q = typeof level === 'object' && level ? level : motionProfile(level);
  return Math.round(v * q.k);
}
/** A distance token (or px) at a level. */
function motionPx(token, level) {
  const v = MOTION_D[token] != null ? MOTION_D[token] : Number(token) || 0;
  const q = typeof level === 'object' && level ? level : motionProfile(level);
  return v * q.dk;
}
/** Delay of item i of n: min(i, cap) x min(step x sk, budget / min(n - 1, cap)). No cap = no stagger. */
function motionStaggerDelay(i, n, step, level) {
  const q = typeof level === 'object' && level ? level : motionProfile(level);
  if (!q.cap) return 0;
  const st = typeof step === 'string' ? (MOTION_STEP[step] || MOTION_STEP.card) : (step || MOTION_STEP.card);
  const s = Math.min(st * q.sk, q.budget / Math.max(1, Math.min(n - 1, q.cap)));
  return Math.round(Math.min(i, q.cap) * s);
}

/* ---------- navigation ---------- */
const _MOTION_TASK_VIEWS = /^(today|tomorrow|week|all|no-date|completed|wins|triage)$/;
/**
 * The section a view belongs to: 'settings:appearance' -> 'settings'; the task views share
 * 'tasks'; 'person:x' -> 'people'. resolve(view) may name a registered section (sectionFor).
 */
function motionSectionOf(v, resolve) {
  v = String(v == null ? '' : v);
  if (_MOTION_TASK_VIEWS.test(v) || /^(stream|tag|day):/.test(v)) return 'tasks';
  if (/^person:/.test(v)) return 'people';
  if (typeof resolve === 'function') { try { const s = resolve(v); if (s) return String(s); } catch (e) { /* fall through */ } }
  return v.split(':')[0];
}
/** 'same' (a no-op) | 'sub' (same section: only its content swaps) | 'page' (another section). */
function motionNavKind(from, to, resolve) {
  if (from === to) return 'same';
  return motionSectionOf(from, resolve) === motionSectionOf(to, resolve) ? 'sub' : 'page';
}
const MOTION_SIDEBAR_ORDER = Object.freeze(['home', 'tasks', 'calendar', 'finance', 'people', 'tags', 'files', 'connections', 'settings']);
/** Sub-view orders, so a sub move knows which way it travels. */
const MOTION_SUB_ORDER = Object.freeze({
  home: ['home', 'home:evening', 'home:week', 'home:history'],
  calendar: ['calendar:month', 'calendar:week', 'calendar:day', 'calendar:agenda'],
  tasks: ['today', 'tomorrow', 'week', 'all', 'no-date', 'completed', 'wins', 'triage'],
});
/** +1 forward, -1 back, 0 unknown. Drilling into a detail (person:, day:) is forward. */
function motionNavDir(from, to, resolve) {
  from = String(from == null ? '' : from); to = String(to == null ? '' : to);
  const sf = motionSectionOf(from, resolve), st = motionSectionOf(to, resolve);
  if (sf === st) {
    const depth = (v) => (/^(person|day):/.test(v) ? 2 : v.includes(':') && !/^(stream|tag):/.test(v) ? 1 : 0);
    const df = depth(from), dt = depth(to);
    if (dt !== df && (sf === 'people' || /^day:/.test(from + to))) return dt > df ? 1 : -1;
    const order = MOTION_SUB_ORDER[sf];
    if (order) {
      const i = order.indexOf(from), j = order.indexOf(to);
      if (i >= 0 && j >= 0) return j > i ? 1 : j < i ? -1 : 0;
    }
    return 0;
  }
  const i = MOTION_SIDEBAR_ORDER.indexOf(sf), j = MOTION_SIDEBAR_ORDER.indexOf(st);
  return i < 0 || j < 0 ? 0 : j > i ? 1 : -1;
}
/**
 * The section-change classifier for a render (the replay fix).
 * prev / next: {section, view, mode} of the last render and of this one (prev null at boot).
 *   'page': boot or another section: the page entrance may play.
 *   'sub' : same section, another sub-view or mode: only the changing pane animates.
 *   null  : a re-render (save, live sync, filter, selection, theme): no entrance at all.
 */
function motionRenderKind(prev, next) {
  if (!prev || !next) return 'page';
  if (prev.section !== next.section) return 'page';
  if (prev.view !== next.view || (prev.mode || '') !== (next.mode || '')) return 'sub';
  return null;
}

/* ---------- variant rotation ---------- */
/** Contexts that rotate, per level. Frequent actions are NOT here: they use one fixed variant. */
const MOTION_PALETTES = Object.freeze({
  'page-title': { subtle: ['fade'], standard: ['mask', 'wipe', 'rise'], playful: ['mask', 'drift', 'blur', 'drop'] },
  'celebrate-milestone': { subtle: ['sparkle'], standard: ['confetti', 'stars'], playful: ['confetti', 'stars', 'coins', 'hearts'] },
  'sub-swap': { subtle: ['fade'], standard: ['slide'], playful: ['slide', 'rise'] },
});
/** FNV-1a, 32 bit. */
function motionHash(s) { s = String(s); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/**
 * The same seed always gives the same variant (a re-render never changes it); if it would repeat
 * `recent`, take the next one. null for an unknown context, Off or Reduced.
 */
function motionPick(context, seed, level, recent) {
  const pal = MOTION_PALETTES[context];
  if (!pal || level === 'off' || level === 'reduced') return null;
  const list = pal[level] || pal.standard;
  if (!list || !list.length) return null;
  let i = motionHash(seed) % list.length;
  if (recent && list.length > 1 && list[i] === recent) i = (i + 1) % list.length;
  return list[i];
}

/* ---------- lists (FLIP) ---------- */
/**
 * What a keyed list does after a re-render.
 * before / after: {key: {top, left}} (boxes on screen; before null = nothing measured).
 * o: {nav: 'page'|'sub'|null, bulk (max new keys that still animate, default 6), max (moves, default 60)}
 * -> {moves: [{key, dx, dy}], enters: [keys in order], instant: bool}
 *   - a key in both that moved more than 1 px glides (moves);
 *   - new keys enter; a sub-view change lets them all enter (it is new content), but a plain
 *     re-render with more than `bulk` new keys (an import, a file adoption) just shows them;
 *   - a page move animates nothing here (the page entrance does).
 */
function motionFlipPlan(before, after, o) {
  o = o || {};
  const out = { moves: [], enters: [], instant: false };
  if (o.nav === 'page' || !after) { out.instant = true; return out; }
  const keys = Object.keys(after);
  const fresh = [];
  for (const k of keys) {
    const a = after[k], b = before ? before[k] : null;
    if (b) {
      const dx = Math.round(b.left - a.left), dy = Math.round(b.top - a.top);
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) out.moves.push({ key: k, dx, dy });
    } else fresh.push(k);
  }
  if (!before) return out;        // first measure: nothing to compare against
  const bulk = o.bulk != null ? o.bulk : 6;
  if (o.nav === 'sub' || fresh.length <= bulk) out.enters = fresh;
  const max = o.max != null ? o.max : 60;
  if (out.moves.length > max) out.moves = out.moves.slice(0, max);
  return out;
}

/* ---------- sky extras (ambient weather) ---------- */
/**
 * Extra layers for a weather sky. w: lib/weather.mjs shape ({current: {cond, temp, wind, isDay},
 * hourly: [{date, hour, cond}]}). o: {hour (now, 0-23), today ('YYYY-MM-DD'), rainedRecently (bool)}.
 * -> {wind: bool, heat: bool, rainbow: bool, bolt: bool}
 *   wind: 30 km/h or more; heat: 28 degrees or more on a clear-ish day;
 *   rainbow: a dry, clear-ish daytime sky within 3 hours of rain (it plays once: CSS);
 *   bolt: thunder (the lightning bolt with the existing flash).
 */
function motionSkyExtras(w, o) {
  o = o || {};
  const c = w && w.current ? w.current : null;
  const out = { wind: false, heat: false, rainbow: false, bolt: false };
  if (!c) return out;
  const cond = String(c.cond || '');
  const clearish = cond === 'clear' || cond === 'partly';
  out.wind = typeof c.wind === 'number' && c.wind >= 30;
  out.heat = clearish && typeof c.temp === 'number' && c.temp >= 28 && c.isDay !== false;
  out.bolt = cond === 'thunder';
  let rained = !!o.rainedRecently;
  if (!rained && Array.isArray(w.hourly) && o.hour != null) {
    rained = w.hourly.some(h => {
      if (!h || (o.today && h.date && h.date !== o.today)) return false;
      const hh = typeof h.hour === 'number' ? h.hour : Number(String(h.time || '').slice(0, 2));
      return isFinite(hh) && hh < o.hour && o.hour - hh <= 3 && /rain|drizzle|showers|thunder/.test(String(h.cond || ''));
    });
  }
  out.rainbow = clearish && c.isDay !== false && rained;
  return out;
}
