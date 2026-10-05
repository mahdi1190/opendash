/* ============================================================
   TRAVEL MOMENTS (pure). Owner: MOMENTS (travel spec 4).
   The arrival, departure and welcome-home moments: their choreography
   tables, the level map, the scene generator (one sky shared with the
   brief), the clock dial, the hour roll, the dock vector, the content
   model and the moment queue. No DOM and no page globals: Node evaluates
   this file in tests/travel-moments.test.mjs together with
   07-core-clock-logic.js, the place files and 69-travel-logic.js.
   The DOM side (cards, the dock, the driver) is 69-travel-moments.js.

   User request, 3 Oct: "we can have fun popups based on the country or
   location etc if they are travelling". Decision (3 Oct): the arrival is a
   centred modal, once per country, with Esc and click-to-skip.

     TM_LEVELS                     off | reduced | subtle | standard | playful (MOTION 5)
     TM_MOMENTS / TM_PARTS         the moments and the parts each one has
     TM_LEVEL_MAP                  part -> level -> variant (spec 4.5)
     trMomentLevelPlan(kind, lv)   {part: variant} for one moment at one level
     trMomentLevelOf(o)            the level from {osReduced, userReduced, attr, preview}
     TM_CHOREO                     the timing tables (spec 4.4): rows {id, from, to, tier, token}
     trChoreoVars(table, o)        CSS custom properties (--trm-<id>-d / -t) from a table
     trChoreoSettle(table)         when a table settles (the last non-ambient row ends)
     trLoopAllot(cats, level)      the ambient loop categories a level allows
     trSkyFor(tod, cond)           {tod, phase, orb, wet, stars, lit} (the brief's vocabulary)
     trTodAt(hour, sunUp, sunDown) briefTimeOfDay when it is loaded, else the same rule
     trSceneSvg(o)                 the big scene's SVG (trusted markup: no user text)
     trDialAngles(o) / trDialSvg(o)  the two-hand dial; hands sweep by the true difference
     trHourStrip(homeMin, diffMin, o)  the hour roll: hours from home's to local
     trCountStrip(diffMin)         the "+8 h" count as a strip (a roll: transform only)
     trDockVector(a, b, o)         translate + scale that maps a card's corner onto the chip
     trMomentQueueNext(q, st, now) the moment queue (MOTION 9.1: one at a time, priority, caps)
     trArrivalModel(i) / trHomeModel(i) / trDepartModel(i)   the content of each moment
     trMomentAnnounce(model)       the polite live-region sentence
   ============================================================ */

const TM_LEVELS = Object.freeze(['off', 'reduced', 'subtle', 'standard', 'playful']);
/** The moments: arrive (the centred card), reopen (the same card, settled), home (the welcome-home
 *  postcard), recap (its "See more" card), depart (the Home card), dock (closing into the chip). */
const TM_MOMENTS = Object.freeze(['arrive', 'reopen', 'home', 'recap', 'depart', 'dock']);
const TM_PARTS = Object.freeze({
  arrive: ['entrance', 'scene', 'actor', 'title', 'time', 'diff', 'chips', 'stamp', 'loops'],
  reopen: ['entrance', 'scene', 'actor', 'title', 'time', 'diff', 'chips', 'stamp', 'loops'],
  home: ['entrance', 'scene', 'actor', 'title', 'chips', 'loops', 'life'],
  recap: ['entrance', 'scene', 'actor', 'title', 'diff', 'chips', 'loops'],
  depart: ['entrance', 'scene', 'actor', 'title', 'chips', 'loops'],
  dock: ['dock'],
});
/**
 * Spec 4.5, one row per part. Variants:
 *   entrance  settled | fade150 | fade-rise | full | tilt
 *   scene     first-frame | parked | full | full-arc
 *   actor     first-frame | parked | full | full-sparkle   (plane, train, suitcase)
 *   title     static | fade | mask | drop
 *   time      final | sweep-roll | sweep-flip
 *   diff      final | count
 *   chips     static | fade | pop | pop-bouncy
 *   stamp     static | fade | full
 *   loops     the number of ambient loop categories
 *   dock      instant | crossfade | fade-through | move | move-ring
 *   life      hidden | shown   (the 8 s timer runs either way)
 */
const TM_LEVEL_MAP = Object.freeze({
  entrance: { off: 'settled', reduced: 'fade150', subtle: 'fade-rise', standard: 'full', playful: 'tilt' },
  scene: { off: 'first-frame', reduced: 'first-frame', subtle: 'parked', standard: 'full', playful: 'full-arc' },
  actor: { off: 'first-frame', reduced: 'first-frame', subtle: 'parked', standard: 'full', playful: 'full-sparkle' },
  title: { off: 'static', reduced: 'static', subtle: 'fade', standard: 'mask', playful: 'drop' },
  time: { off: 'final', reduced: 'final', subtle: 'final', standard: 'sweep-roll', playful: 'sweep-flip' },
  diff: { off: 'final', reduced: 'final', subtle: 'count', standard: 'count', playful: 'count' },
  chips: { off: 'static', reduced: 'static', subtle: 'fade', standard: 'pop', playful: 'pop-bouncy' },
  stamp: { off: 'static', reduced: 'static', subtle: 'fade', standard: 'full', playful: 'full' },
  loops: { off: 0, reduced: 0, subtle: 2, standard: 6, playful: 8 },
  dock: { off: 'instant', reduced: 'crossfade', subtle: 'fade-through', standard: 'move', playful: 'move-ring' },
  life: { off: 'hidden', reduced: 'hidden', subtle: 'shown', standard: 'shown', playful: 'shown' },
});
function _tmLevel(lv) { return TM_LEVELS.includes(lv) ? lv : 'standard'; }
/** {part: variant} for one moment at one level. A reopen is always settled (no replay). */
function trMomentLevelPlan(kind, level) {
  const lv = _tmLevel(level);
  const parts = TM_PARTS[kind] || [];
  const out = { level: lv };
  for (const p of parts) out[p] = TM_LEVEL_MAP[p][lv];
  if (kind === 'reopen') for (const p of parts) if (p !== 'loops') out[p] = TM_LEVEL_MAP[p].off;
  return out;
}
/**
 * The level (MOTION 5): the OS setting gives Reduced and wins; the sidebar's "Reduce motion"
 * (html[data-motion="reduced"] without the OS setting) is Off, as the old switch was; a
 * chosen level (html[data-motion-level], once the motion build lands) next; Standard otherwise.
 * o.preview forces a level (screenshots, the Settings preview).
 */
function trMomentLevelOf(o) {
  o = o || {};
  if (o.preview && TM_LEVELS.includes(o.preview)) return o.preview;
  if (o.osReduced) return 'reduced';
  if (o.attr && TM_LEVELS.includes(o.attr)) return o.attr;
  if (o.userReduced) return 'off';
  return 'standard';
}

/* ---------- choreography (spec 4.4): ms from the start; tiers are MOTION 2.5's ---------- */
const TM_CHOREO = Object.freeze({
  // The postcard (welcome home): settles by about 1.9 s; the content tiers start with the surface.
  postcard: Object.freeze([
    { id: 'surface', from: 0, to: 406, tier: 'T1', token: '--m-spring-snappy' },
    { id: 'over', from: 100, to: 400, tier: 'T2', token: '--m-ease-out' },
    { id: 'title', from: 160, to: 890, tier: 'T2', token: '--m-ease-expo', step: 45 },
    { id: 'skyline', from: 140, to: 1240, tier: 'scene', token: '--m-ease-out', step: 38 },
    { id: 'actor', from: 260, to: 1760, tier: 'lead', token: 'transforms' },
    { id: 'clocks', from: 300, to: 660, tier: 'T3', token: '--m-ease-out' },
    { id: 'greet', from: 380, to: 900, tier: 'T3', token: '--m-ease-out' },
    { id: 'dial', from: 450, to: 1850, tier: 'T5', token: '--m-ease-in-out' },
    { id: 'count', from: 500, to: 1900, tier: 'T5', token: '--m-ease-in-out' },
    { id: 'chips', from: 1000, to: 1590, tier: 'T4', token: '--m-pop-ease', step: 70 },
    { id: 'actions', from: 1200, to: 1560, tier: 'T4', token: '--m-ease-out' },
    { id: 'ambient', from: 1900, to: 31900, tier: 'T6', token: 'loop' },
  ]),
  // The full card (the arrival, decision 3; "See more" from the welcome home): spec 4.4 t1.
  full: Object.freeze([
    { id: 'backdrop', from: 0, to: 260, tier: 'T1', token: '--m-ease-out' },
    { id: 'surface', from: 60, to: 680, tier: 'T1', token: '--m-ease-out' },
    { id: 'over', from: 160, to: 520, tier: 'T2', token: '--m-ease-out' },
    { id: 'title', from: 520, to: 1250, tier: 'T2', token: '--m-ease-expo', step: 45 },
    { id: 'skyline', from: 120, to: 1200, tier: 'scene', token: '--m-ease-out', step: 38 },
    { id: 'actor', from: 260, to: 1760, tier: 'lead', token: 'transforms' },
    { id: 'clocks', from: 760, to: 1180, tier: 'T3', token: '--m-ease-out' },
    { id: 'greet', from: 880, to: 1400, tier: 'T3', token: '--m-ease-out' },
    { id: 'dial', from: 900, to: 2300, tier: 'T5', token: '--m-ease-in-out' },
    { id: 'count', from: 900, to: 2300, tier: 'T5', token: '--m-ease-in-out' },
    { id: 'stamp', from: 1650, to: 2090, tier: 'T4', token: '--m-pop-ease' },
    { id: 'chips', from: 1850, to: 2440, tier: 'T4', token: '--m-pop-ease', step: 70 },
    { id: 'note', from: 2150, to: 2510, tier: 'T4', token: '--m-ease-out' },
    { id: 'actions', from: 2250, to: 2610, tier: 'T4', token: '--m-ease-out' },
    { id: 'ambient', from: 2610, to: 32610, tier: 'T6', token: 'loop' },
  ]),
  // The departure Home card (t4): the plane rolls, rotates at 34 %, climbs out; the contrail draws, then fades.
  depart: Object.freeze([
    { id: 'surface', from: 0, to: 620, tier: 'T1', token: '--m-ease-out' },
    { id: 'skyline', from: 120, to: 1200, tier: 'scene', token: '--m-ease-out', step: 38 },
    { id: 'over', from: 100, to: 400, tier: 'T2', token: '--m-ease-out' },
    { id: 'title', from: 400, to: 1040, tier: 'T2', token: '--m-ease-expo', step: 45 },
    { id: 'actor', from: 500, to: 2400, tier: 'lead', token: 'transforms' },
    { id: 'line', from: 700, to: 1060, tier: 'T3', token: '--m-ease-out' },
    { id: 'chips', from: 900, to: 1490, tier: 'T4', token: '--m-pop-ease', step: 70 },
    { id: 'ambient', from: 2400, to: 32400, tier: 'T6', token: 'loop' },
  ]),
  // Welcome home (t3): the suitcase rolls in (3 wheel turns), the door light comes on at 1700 ms.
  home: Object.freeze([
    { id: 'surface', from: 0, to: 406, tier: 'T1', token: '--m-spring-snappy' },
    { id: 'over', from: 100, to: 400, tier: 'T2', token: '--m-ease-out' },
    { id: 'title', from: 160, to: 800, tier: 'T2', token: '--m-ease-expo', step: 45 },
    { id: 'skyline', from: 140, to: 1240, tier: 'scene', token: '--m-ease-out', step: 38 },
    { id: 'actor', from: 420, to: 1820, tier: 'lead', token: 'transforms' },
    { id: 'line', from: 380, to: 900, tier: 'T3', token: '--m-ease-out' },
    { id: 'light', from: 1700, to: 2200, tier: 'scene', token: 'ease' },
    { id: 'chips', from: 1000, to: 1590, tier: 'T4', token: '--m-pop-ease', step: 70 },
    { id: 'actions', from: 1200, to: 1560, tier: 'T4', token: '--m-ease-out' },
    { id: 'ambient', from: 2200, to: 32200, tier: 'T6', token: 'loop' },
  ]),
  // The dock: the content fades, the shell takes the chip's tint and shrinks onto it, then hands over.
  dock: Object.freeze([
    { id: 'content', from: 0, to: 140, tier: 'exit', token: '--m-ease-in' },
    { id: 'tint', from: 60, to: 320, tier: 'exit', token: '--m-ease-out' },
    { id: 'move', from: 0, to: 420, tier: 'exit', token: '--m-ease-in-out' },
    { id: 'chip', from: 320, to: 440, tier: 'exit', token: 'linear' },
    { id: 'ring', from: 420, to: 1120, tier: 'exit', token: '--m-ease-out' },
    { id: 'dot', from: 520, to: 900, tier: 'exit', token: '--m-pop-ease' },
  ]),
  // Reopen from the chip: the card grows from the chip box, settled (--m-slower).
  reopen: Object.freeze([{ id: 'surface', from: 0, to: 320, tier: 'T1', token: '--m-ease-out' }]),
});
/** When a table settles: the last row to end, ambient loops apart. */
function trChoreoSettle(table) {
  return (table || []).filter(r => r.tier !== 'T6').reduce((a, r) => Math.max(a, r.to), 0);
}
/** CSS custom properties for a table: --trm-<id>-d (delay) and --trm-<id>-t (duration), as "name:value;" text. */
function trChoreoVars(table, o) {
  o = o || {};
  const k = Number.isFinite(o.k) ? o.k : 1;
  const shift = Number.isFinite(o.shift) ? o.shift : 0;   // < 0: continue an entrance already under way (a re-render)
  let s = '';
  for (const r of table || []) s += `--trm-${r.id}-d:${Math.round(r.from * k + shift)}ms;--trm-${r.id}-t:${Math.round((r.to - r.from) * k)}ms;`;
  return s;
}

/* ---------- ambient loops (MOTION 7.2 budget) ---------- */
/** Ambient loop categories, most important first. Particles (rain, snow) are the first to go below Standard. */
const TM_LOOP_ORDER = Object.freeze(['clouds', 'glow', 'windows', 'stars', 'waves', 'particles', 'aurora', 'props']);
function trLoopAllot(cats, level) {
  const n = TM_LEVEL_MAP.loops[_tmLevel(level)];
  const lv = _tmLevel(level);
  const have = new Set(cats || []);
  const out = [];
  for (const c of TM_LOOP_ORDER) {
    if (out.length >= n) break;
    if (!have.has(c)) continue;
    if (c === 'particles' && (lv === 'subtle' || lv === 'off' || lv === 'reduced')) continue;   // "no rain, snow or puffs"
    out.push(c);
  }
  return out;
}

/* ---------- one sky (spec 4.6): the brief's time of day and weather ---------- */
const TM_TODS = Object.freeze(['night', 'dawn', 'morning', 'day', 'dusk', 'evening']);
const TM_CONDS = Object.freeze(['clear', 'partly', 'cloudy', 'fog', 'drizzle', 'rain', 'showers', 'snow', 'thunder']);
/** The brief's rule (73-brief-logic.js briefTimeOfDay), used when that file is loaded. */
function trTodAt(hour, sunUp, sunDown) {
  if (typeof briefTimeOfDay === 'function') return briefTimeOfDay(hour, sunUp, sunDown);
  const h = Number(hour) || 0, up = Number.isFinite(sunUp) ? sunUp : 7, down = Number.isFinite(sunDown) ? sunDown : 19;
  if (h < up - 0.75 || h >= down + 1.25) return 'night';
  if (h < up + 1) return 'dawn';
  if (h < 12) return 'morning';
  if (h < down - 1) return 'day';
  if (h < down + 0.5) return 'dusk';
  return 'evening';
}
/** {tod, cond, orb: 'sun'|'moon'|'', wet, stars, lit}. Wet skies hide the sun at any hour. */
function trSkyFor(tod, cond) {
  const t = TM_TODS.includes(tod) ? tod : 'day';
  const c = TM_CONDS.includes(cond) ? cond : 'clear';
  const wet = /rain|showers|thunder|drizzle|cloudy|fog|snow/.test(c);
  const dark = t === 'night' || t === 'evening';
  return { tod: t, cond: c, wet, orb: wet ? '' : (dark ? 'moon' : 'sun'), stars: dark && !/rain|thunder|showers|fog|snow/.test(c), lit: t !== 'day' && t !== 'morning' };
}

/* ---------- the scene generator (spec 4.6): sky, skyline by place kind, weather, actor ---------- */
const TM_KINDS = Object.freeze(['towers', 'oldtown', 'coastal', 'mountain', 'desert', 'tropical', 'nordic', 'lowlands']);
function _tmRng(seed) {
  let a = 0;
  for (const ch of String(seed)) a = (a * 31 + ch.charCodeAt(0)) | 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const _tmF = (n) => (Math.round(n * 10) / 10).toString();
/** The skyline, generated by kind and seeded by the city (the same city always looks the same; no real landmarks). */
function _tmSkyline(kind, seed, sky, layer) {
  const R = _tmRng(seed + ':' + layer);
  const W = 560, G = 214, back = layer === 'back';
  const cls = back ? 'trm-back' : 'trm-ink';
  let x = back ? -10 : -6, i = 0, out = '';
  const win = (bx, by, bw) => {
    if (back || !sky.lit) return '';
    let s = '';
    for (let wy = by + 8; wy < G - 8; wy += 9) for (let wx = bx + 4; wx < bx + bw - 5; wx += 7) if (R() < 0.3) s +=`<rect class="trm-win" style="--d:${(R() * 7).toFixed(2)}s" x="${wx}" y="${wy}" width="3" height="4"/>`;
    return s;
  };
  const bld = (bx, bw, bh, roof) => {
    const top = G - bh;
    let shape;
    if (roof === 'pitch') shape = `<path d="M${bx} ${G}V${top + 8}L${_tmF(bx + bw / 2)} ${top - 6}L${bx + bw} ${top + 8}V${G}z"/>`;
    else if (roof === 'dome') shape = `<path d="M${bx} ${G}V${top + 6}a${_tmF(bw / 2)} ${_tmF(bw / 2.4)} 0 0 1 ${bw} 0V${G}z"/><rect x="${_tmF(bx + bw / 2 - 1)}" y="${_tmF(top - bw / 2.4 - 6)}" width="2" height="8"/>`;
    else if (roof === 'spire') shape = `<path d="M${bx} ${G}V${top}h${_tmF(bw * 0.3)}l${_tmF(bw * 0.2)} -${_tmF(bh * 0.55)}l${_tmF(bw * 0.2)} ${_tmF(bh * 0.55)}h${_tmF(bw * 0.3)}V${G}z"/>`;
    else if (roof === 'antenna') shape = `<rect x="${bx}" y="${top}" width="${bw}" height="${bh}"/><rect x="${_tmF(bx + bw / 2 - 1)}" y="${top - 18}" width="2" height="18"/>`;
    else if (roof === 'step') shape = `<path d="M${bx} ${G}V${top + 14}h${_tmF(bw * 0.15)}V${top + 6}h${_tmF(bw * 0.15)}V${top}h${_tmF(bw * 0.4)}V${top + 6}h${_tmF(bw * 0.15)}V${top + 14}h${_tmF(bw * 0.15)}V${G}z"/>`;
    else if (roof === 'cube') shape = `<rect x="${bx}" y="${top}" width="${bw}" height="${bh}"/><rect x="${bx - 1}" y="${top - 2}" width="${bw + 2}" height="3"/>`;
    else if (roof === 'gable') shape = `<path d="M${bx} ${G}V${top + 10}l${_tmF(bw * 0.2)} -4v-4h${_tmF(bw * 0.2)}l${_tmF(bw * 0.1)} -6l${_tmF(bw * 0.1)} 6h${_tmF(bw * 0.2)}v4l${_tmF(bw * 0.2)} 4V${G}z"/>`;
    else shape = `<rect x="${bx}" y="${top}" width="${bw}" height="${bh}"/>`;
    return `<g class="trm-rise ${cls}" style="--i:${i++}">${shape}${win(bx, top, bw)}</g>`;
  };
  if ((kind === 'mountain' || kind === 'nordic') && back) {
    let d = `M0 ${G}`, mx = -40;
    while (mx < W + 40) { const h = (kind === 'nordic' ? 40 : 70) + R() * 70, w = 90 + R() * 70; d += `L${_tmF(mx + w / 2)} ${_tmF(G - h)}L${_tmF(mx + w)} ${G}`; mx += w * 0.7; }
    return `<g class="trm-rise trm-back" style="--i:0"><path d="${d}z"/></g>`;
  }
  if (kind === 'desert' && back) return `<g class="trm-rise trm-back" style="--i:0"><path d="M0 ${G}C80 ${G - 30} 160 ${G - 34} 240 ${G - 12}S420 ${G - 40} 560 ${G - 16}V${G}z"/></g>`;
  if (kind === 'tropical' && back) return `<g class="trm-rise trm-back" style="--i:0"><path d="M300 ${G}C330 ${G - 54} 400 ${G - 70} 460 ${G - 40}S540 ${G - 20} 560 ${G - 24}V${G}z"/></g>`;
  if (kind === 'tropical') {
    // Palms on a low shore: the fronds sway as an ambient loop.
    for (const [px, ph] of [[60, 70], [118, 54], [470, 78], [520, 58]]) {
      out += `<g class="trm-rise trm-ink" style="--i:${i++}"><path d="M${px} ${G}c-2-${ph / 2} 2-${ph * 0.8} 6-${ph}l3 1c-3 ${ph * 0.3}-5 ${ph * 0.6}-4 ${ph - 1}z"/>`
        + `<g class="trm-palm" style="transform-origin:${px + 7}px ${G - ph}px">${[[-26, -6], [-20, 8], [22, -8], [26, 6], [0, -16]].map(([dx, dy]) => `<path d="M${px + 7} ${G - ph}q${_tmF(dx / 2)} ${_tmF(dy - 8)} ${dx} ${dy}q${_tmF(-dx / 3)} ${_tmF(-dy / 3 - 3)} ${_tmF(-dx)} ${_tmF(-dy)}z"/>`).join('')}</g></g>`;
    }
    for (let k = 0; k < 4; k++) { const bx = 180 + k * 46 + Math.round(R() * 10), bw = 26 + Math.round(R() * 10), bh = 14 + Math.round(R() * 14); out += bld(bx, bw, bh, R() < 0.5 ? 'pitch' : 'flat'); }
    return out;
  }
  while (x < W + 20) {
    let bw, bh, roof = 'flat';
    if (kind === 'towers') { bw = 16 + R() * 22; bh = (back ? 70 : 40) + R() * (back ? 110 : 120); roof = R() < 0.18 ? 'antenna' : R() < 0.3 ? 'step' : 'flat'; }
    else if (kind === 'oldtown') { bw = 20 + R() * 22; bh = (back ? 50 : 26) + R() * 40; roof = R() < 0.55 ? 'pitch' : 'flat'; if (!back && i === 6) { roof = 'spire'; bh = 120; bw = 22; } if (back && i === 4) { roof = 'dome'; bw = 46; bh = 66; } }
    else if (kind === 'coastal') { bw = 18 + R() * 20; bh = (back ? 34 : 18) + R() * 34 + (x / W) * (back ? 30 : 16); roof = R() < 0.5 ? 'pitch' : 'flat'; }
    else if (kind === 'desert') { bw = 18 + R() * 26; bh = 22 + R() * 34; roof = R() < 0.4 ? 'dome' : 'cube'; if (i === 5) { roof = 'spire'; bw = 18; bh = 190; } }
    else if (kind === 'mountain' || kind === 'nordic') { bw = 16 + R() * 18; bh = 14 + R() * 22; roof = 'pitch'; }
    else if (kind === 'lowlands') { bw = 16 + R() * 10; bh = (back ? 44 : 34) + R() * 22; roof = back ? 'pitch' : 'gable'; }
    else { bw = 20 + R() * 24; bh = (back ? 50 : 30) + R() * 60; roof = R() < 0.3 ? 'pitch' : 'flat'; }
    const gap = (kind === 'mountain' || kind === 'nordic') ? 10 + R() * 40 : kind === 'lowlands' ? (back ? 3 : 0.5) : (back ? 2 + R() * 6 : 4 + R() * 10);
    if ((kind === 'mountain' || kind === 'nordic') && R() < 0.45) { x += bw + gap; continue; }
    out += bld(Math.round(x), Math.round(bw), Math.round(bh), roof);
    x += bw + gap;
  }
  if (kind === 'lowlands' && !back) {
    // A windmill on the right: its sails turn as an ambient loop (counted with the clouds).
    out += `<g class="trm-rise trm-ink" style="--i:${i++}"><path d="M488 ${G}l6 -52h12l6 52z"/><g class="trm-mill" style="transform-origin:500px ${G - 52}px">`
      + `<path d="M499 ${G - 54}h2v-34h-2zM499 ${G - 50}h2v34h-2zM502 ${G - 53}v2h34v-2zM498 ${G - 53}v2h-34v-2z"/></g></g>`;
  }
  return out;
}
const _TM_PLANE = (gear) => `<path d="M31 -1.5c0-2.6-3.4-4.5-8-4.5H-20l-7.5-10h-5l3.6 11.2c-2.4.8-3.1 2.6-1.6 4.2 1.4 1.4 4.2 2.1 7.5 2.1H23c4.6 0 8-1.3 8-3z"/>`
  + `<path d="M3 -.5L-9 10h5.5L13 -.5z" opacity=".92"/><rect x="-3" y="2.2" width="9" height="4" rx="2" opacity=".9"/>`
  + `<g class="trm-plane-win">${[-14, -9, -4, 1, 6, 11, 16].map(x => `<circle cx="${x}" cy="-2.6" r=".9"/>`).join('')}<path d="M27.5 -4.6h2.2c.6.7.8 1.4.6 2h-3.6z"/></g>`
  + (gear ? '<path class="trm-gear" d="M18 2.5v5M-8 3v4.5"/><circle class="trm-tyre" cx="18" cy="8.4" r="1.6"/><circle class="trm-tyre" cx="-8" cy="8.4" r="1.6"/>' : '');
/**
 * The big scene (560 x 236 user units). o: {kind, seed, tod, cond, mode: 'arrive'|'rail'|'depart'|'home'|'none',
 * loops: [categories allowed], month (1-12, for the nordic aurora), touch (x of the touchdown), uid}.
 * Trusted markup: every value is a number or a constant; the seed only seeds the generator.
 */
function trSceneSvg(o) {
  o = o || {};
  const kind = TM_KINDS.includes(o.kind) ? o.kind : 'oldtown';
  const sky = trSkyFor(o.tod, o.cond);
  const R = _tmRng(o.seed || 'x');
  const uid = String(o.uid || ('s' + Math.floor(R() * 1e6))).replace(/[^\w-]/g, '');
  const mode = ['arrive', 'rail', 'depart', 'home', 'none'].includes(o.mode) ? o.mode : 'none';
  const allowed = Array.isArray(o.loops) ? o.loops : [];
  const cats = new Set();
  let s = `<svg class="trm-sc" viewBox="0 0 560 236" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false" data-tod="${sky.tod}" data-wx="${sky.cond}" data-kind="${kind}" data-mode="${mode}" data-trm-loops="${allowed.join(' ')}">`
    + `<defs><linearGradient id="tmg-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="trm-s1"/><stop offset=".6" class="trm-s2"/><stop offset="1" class="trm-s3"/></linearGradient>`
    + `<radialGradient id="tmo-${uid}"><stop offset="0" class="trm-o1"/><stop offset=".55" class="trm-o2"/><stop offset="1" class="trm-o3"/></radialGradient>`
    + (mode === 'depart' ? `<mask id="tmm-${uid}"><rect class="trm-trail-mask" x="0" y="0" width="640" height="236" fill="#fff"/></mask>` : '')
    + `</defs><rect width="560" height="236" fill="url(#tmg-${uid})"/>`;
  if (sky.wet) s += '<rect class="trm-wet" width="560" height="236"/>';
  if (sky.stars) { cats.add('stars'); for (let i = 0; i < 36; i++) s += `<circle class="trm-tw" style="--d:${(R() * 3.6).toFixed(2)}s" cx="${_tmF(R() * 560)}" cy="${_tmF(R() * 120)}" r="${(0.6 + R() * 1.1).toFixed(2)}" opacity="${(0.5 + R() * 0.5).toFixed(2)}"/>`; }
  // The nordic night: an aurora from November to March.
  const m = Number(o.month) || 0;
  if (kind === 'nordic' && (sky.tod === 'night' || sky.tod === 'evening') && (m >= 11 || (m >= 1 && m <= 3))) {
    cats.add('aurora');
    s += '<g class="trm-aur">' + [0, 1, 2].map(k => `<path class="trm-aur-band" style="--d:-${k * 2}s" d="M${-20 + k * 30} ${70 + k * 14}C120 ${30 + k * 10} 260 ${90 - k * 6} 400 ${46 + k * 12}S560 ${60 + k * 8} 600 ${40 + k * 10}"/>`).join('') + '</g>';
  }
  const ox = Number(o.orbX) || 430;
  const oy = sky.tod === 'dawn' ? 120 : sky.tod === 'dusk' ? 110 : 62;
  if (sky.orb) {
    cats.add('glow');
    s += `<g class="trm-sunr"><circle class="trm-glow" cx="${ox}" cy="${oy}" r="46" fill="url(#tmo-${uid})"/><circle class="trm-orb trm-orb-${sky.orb}" cx="${ox}" cy="${oy}" r="${sky.orb === 'sun' ? 17 : 13}"/>`
      + (sky.orb === 'moon' ? `<circle class="trm-moon-bite" cx="${ox + 6}" cy="${oy - 4}" r="12"/>` : '') + '</g>';
  }
  const nc = sky.wet ? 5 : (sky.cond === 'partly' ? 3 : 2);
  cats.add('clouds');
  for (let i = 0; i < nc; i++) {
    const cx = -80 + R() * 520, cy = 24 + R() * 70, k = 0.7 + R() * 0.8;
    s += `<g class="trm-drift" style="--dur:${(70 + R() * 60).toFixed(0)}s;--d:-${(R() * 60).toFixed(0)}s;--dx:${(80 + R() * 80).toFixed(0)}px"><g class="trm-cloud${sky.wet ? ' is-wet' : ''}" transform="translate(${cx.toFixed(0)} ${cy.toFixed(0)}) scale(${k.toFixed(2)})"><ellipse cx="40" cy="18" rx="40" ry="12"/><circle cx="26" cy="12" r="14"/><circle cx="48" cy="8" r="17"/></g></g>`;
  }
  s += _tmSkyline(kind, o.seed || 'x', sky, 'back') + _tmSkyline(kind, o.seed || 'x', sky, 'front');
  if (kind === 'tropical' || kind === 'lowlands') cats.add('props');
  if (sky.lit && kind !== 'tropical') cats.add('windows');
  if (kind === 'coastal' || kind === 'tropical') {
    cats.add('waves');
    s += '<rect class="trm-sea" y="214" width="560" height="22"/>';
    for (let i = 0; i < 3; i++) s += `<g class="trm-wave" style="--d:-${(i * 1.4).toFixed(1)}s"><path d="M-20 ${219 + i * 6}q10 -3 20 0${'t20 0'.repeat(29)}"/></g>`;
  } else s += '<rect class="trm-ground" y="212" width="560" height="24"/><rect class="trm-ground-edge" y="212" width="560" height="2"/>';
  if ((mode === 'arrive' || mode === 'depart') && kind !== 'coastal' && kind !== 'tropical') for (let x = 10; x < 560; x += 34) s += `<rect class="trm-runway" x="${x}" y="224" width="16" height="2" rx="1"/>`;
  if (mode === 'rail') s += '<rect class="trm-rail" y="226" width="560" height="2"/>' + Array.from({ length: 19 }, (_, k) => `<rect class="trm-rail" x="${k * 30 + 4}" y="228" width="10" height="2"/>`).join('');
  if (/rain|showers|drizzle|thunder/.test(sky.cond)) { cats.add('particles'); for (let i = 0; i < 46; i++) s += `<path class="trm-rain" style="--d:-${(R() * 0.9).toFixed(2)}s" d="M${(R() * 600).toFixed(0)} ${(R() * 40).toFixed(0)}l-4 12"/>`; }
  if (/snow/.test(sky.cond)) { cats.add('particles'); for (let i = 0; i < 40; i++) s += `<circle class="trm-snow" style="--d:-${(R() * 6).toFixed(2)}s" cx="${(R() * 560).toFixed(0)}" cy="${(R() * 20).toFixed(0)}" r="${(1 + R() * 1.6).toFixed(1)}"/>`; }
  const touch = Number(o.touch) || 452;
  if (mode === 'arrive') {
    s += `<g class="trm-actor" transform="translate(${touch} 202)"><g class="trm-land-x"><g class="trm-land-y"><g class="trm-land-r trm-plane">${_TM_PLANE(true)}</g></g></g></g>`
      + `<g class="trm-actor"><circle class="trm-puff" style="--d:1440ms" cx="${touch - 14}" cy="211" r="5"/><circle class="trm-puff" style="--d:1500ms" cx="${touch - 26}" cy="212" r="4"/></g>`;
  } else if (mode === 'depart') {
    s += `<path class="trm-trail trm-actor" mask="url(#tmm-${uid})" d="M70 205 L 250 205 C 400 205 520 120 640 10"/>`
      + `<g class="trm-actor" transform="translate(70 203)"><g class="trm-off-x"><g class="trm-off-y"><g class="trm-off-r trm-plane">${_TM_PLANE(true)}</g></g></g></g>`;
  } else if (mode === 'rail') {
    s += '<g class="trm-actor" transform="translate(300 196)"><g class="trm-train-in"><g class="trm-train">'
      + '<path d="M-150 0h170c14 0 26 6 30 16v12h-200z"/><rect class="trm-train-win" x="-140" y="5" width="22" height="9" rx="2"/><rect class="trm-train-win" x="-110" y="5" width="22" height="9" rx="2"/>'
      + '<rect class="trm-train-win" x="-80" y="5" width="22" height="9" rx="2"/><rect class="trm-train-win" x="-50" y="5" width="22" height="9" rx="2"/><rect class="trm-train-win" x="-20" y="5" width="22" height="9" rx="2"/>'
      + '<path class="trm-train-win" d="M22 5h12c6 1 10 4 12 9H22z"/></g></g></g>';
  } else if (mode === 'home') {
    const hx = 360;
    s += `<g class="trm-ink"><path d="M${hx} 212V160l46 -34 46 34V212z"/><rect x="${hx + 66}" y="128" width="10" height="22"/></g>`
      + `<rect class="trm-door" x="${hx + 36}" y="176" width="20" height="36" rx="2"/><rect class="trm-lamp" x="${hx + 10}" y="168" width="16" height="14" rx="2"/><rect class="trm-lamp" x="${hx + 66}" y="168" width="16" height="14" rx="2"/>`
      + `<path class="trm-door trm-porch" d="M${hx + 36} 212 L${hx + 10} 236 H${hx + 82} L${hx + 56} 212z"/>`
      + `<g class="trm-actor" transform="translate(${hx - 30} 0)"><g class="trm-case-roll"><rect class="trm-case" x="-22" y="182" width="26" height="24" rx="4"/><path class="trm-case-h" d="M-14 182v-8h10v8"/><rect x="-18" y="188" width="2.4" height="14" rx="1" class="trm-case-strap"/>`
      + '<g class="trm-wheel"><circle class="trm-tyre" cx="-16" cy="208" r="3"/><rect class="trm-hub" x="-16.5" y="205.5" width="1" height="2.4"/></g><g class="trm-wheel"><circle class="trm-tyre" cx="-2" cy="208" r="3"/><rect class="trm-hub" x="-2.5" y="205.5" width="1" height="2.4"/></g></g></g>';
  }
  return s + `<desc data-cats="${[...cats].join(' ')}"></desc></svg>`;
}
/** The loop categories a scene's markup uses (read back from its <desc>). */
function trSceneLoops(svg) { const m = /<desc data-cats="([^"]*)"/.exec(String(svg || '')); return m ? m[1].split(' ').filter(Boolean) : []; }

/* ---------- the dial (spec 4.4: the hands sweep from home time by the true difference) ---------- */
/**
 * o: {h, m (local), diffMin (local - home; 0 = no sweep)} ->
 * {to: {h, m}, from: {h, m}} in degrees. The hour hand turns diffMin x 0.5 deg; the minute hand
 * turns the difference's minutes plus at most 3 whole turns (a long sweep reads as a spin).
 */
function trDialAngles(o) {
  o = o || {};
  const h = Number(o.h) || 0, m = Number(o.m) || 0, d = Math.round(Number(o.diffMin) || 0);
  const to = { h: (h % 12) * 30 + m * 0.5, m: m * 6 };
  if (!d) return { to, from: { h: to.h, m: to.m } };
  const sign = d < 0 ? -1 : 1, a = Math.abs(d);
  const turns = Math.min(Math.floor(a / 60), 3);
  return { to, from: { h: to.h - d * 0.5, m: to.m - sign * ((a % 60) * 6 + turns * 360) } };
}
/** The dial's SVG. o: {h, m, diffMin, night, cls}. The hands' --trm-from/--trm-to drive the sweep. */
function trDialSvg(o) {
  o = o || {};
  const a = trDialAngles(o);
  let ticks = '';
  for (let i = 0; i < 12; i++) {
    const r = i * 30 * Math.PI / 180, r1 = i % 3 ? 38 : 35;
    ticks += `<line class="trm-dial-tick" x1="${_tmF(50 + Math.sin(r) * r1)}" y1="${_tmF(50 - Math.cos(r) * r1)}" x2="${_tmF(50 + Math.sin(r) * 41)}" y2="${_tmF(50 - Math.cos(r) * 41)}"/>`;
  }
  const st = (f, t) => `--trm-from:${_tmF(f)}deg;--trm-to:${_tmF(t)}deg`;
  const sweep = Math.round(Number(o.diffMin) || 0) ? ' is-sweep' : '';
  return `<svg class="trm-dial${o.night ? ' is-night' : ''}${sweep}${o.cls ? ' ' + String(o.cls).replace(/[^\w -]/g, '') : ''}" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle class="trm-dial-face" cx="50" cy="50" r="46"/>${ticks}`
    + `<line class="trm-hand trm-hand-h" style="${st(a.from.h, a.to.h)}" x1="50" y1="50" x2="50" y2="27"/><line class="trm-hand trm-hand-m" style="${st(a.from.m, a.to.m)}" x1="50" y1="50" x2="50" y2="16"/><circle class="trm-dial-pin" cx="50" cy="50" r="4"/></svg>`;
}

/* ---------- the hour roll and the difference count (transform-only "tickers") ---------- */
/**
 * The hours the roll passes, from home's hour to the local hour (the strip moves up for east,
 * down for west; its resting place is the local hour, so with motion off the right time shows).
 * homeMin: minutes since midnight at home; diffMin: local - home. o.h12: 12-hour digits.
 * -> {hours: ['07', ..., '15'], n (steps), west}
 */
function trHourStrip(homeMin, diffMin, o) {
  o = o || {};
  const hm = Math.round(Number(homeMin) || 0), d = Math.round(Number(diffMin) || 0);
  const h0 = Math.floor(hm / 60), h1 = Math.floor((hm + d) / 60);
  const n = Math.min(26, Math.abs(h1 - h0)), sign = h1 >= h0 ? 1 : -1;
  const fmt = (h) => { const x = ((h % 24) + 24) % 24; return o.h12 ? String(x % 12 || 12) : String(x).padStart(2, '0'); };
  const hours = [];
  for (let k = 0; k <= n; k++) hours.push(fmt(h0 + sign * k));
  return { hours: sign > 0 ? hours : hours.slice().reverse(), n, west: sign < 0 };
}
/** The difference as a count strip: '+0 h' ... '+8 h' (the last is the label clockFmtDiff gives). */
function trCountStrip(diffMin) {
  const d = Math.round(Number(diffMin) || 0);
  const final = typeof clockFmtDiff === 'function' ? clockFmtDiff(d) : String(d);
  if (!d) return { steps: [final], n: 0, final };
  const a = Math.abs(d), h = Math.floor(a / 60), sign = d > 0 ? '+' : '−';
  if (!h) return { steps: [final], n: 0, final };
  const steps = [];
  for (let k = 0; k < h; k++) steps.push(`${sign}${k} h`);
  steps.push(final);
  return { steps, n: steps.length - 1, final };
}

/* ---------- the dock (spec 4.4): layout boxes in, a transform out ---------- */
/**
 * a: the card's layout box, b: the chip's ({left, top, width, height}; offset* maths, never
 * getBoundingClientRect, which returns the transformed box). Desktop maps the card's top-right
 * corner onto the chip's; phone (o.phone) maps bottom-centre onto bottom-centre.
 * -> {dx, dy, sx, sy, origin}
 */
function trDockVector(a, b, o) {
  o = o || {};
  const n = (v) => Number(v) || 0;
  const A = { l: n(a && a.left), t: n(a && a.top), w: Math.max(1, n(a && a.width)), h: Math.max(1, n(a && a.height)) };
  const B = { l: n(b && b.left), t: n(b && b.top), w: Math.max(1, n(b && b.width)), h: Math.max(1, n(b && b.height)) };
  const ox = o.phone ? A.l + A.w / 2 : A.l + A.w, oy = o.phone ? A.t + A.h : A.t;
  const tx = o.phone ? B.l + B.w / 2 : B.l + B.w, ty = o.phone ? B.t + B.h : B.t;
  const r = (v) => Math.round(v * 1000) / 1000;
  return { dx: r(tx - ox), dy: r(ty - oy), sx: r(B.w / A.w), sy: r(B.h / A.h), origin: o.phone ? '50% 100%' : '100% 0' };
}

/* ---------- the moment queue (MOTION 9.1; Motion.moment when the motion build has none) ---------- */
/** Lower plays first. Travel > milestones > daily moments. */
const TM_MOMENT_PRIORITY = Object.freeze({ travel: 1, milestone: 2, daily: 3 });
/**
 * queue: [{id, key, kind: 'travel'|'milestone'|'daily', at}]
 * st: {showing, shown {key: ts}, todayCount, lastCardAt, bootAt, blockers {hidden, typing, modal, story, card, meeting}}
 * -> {action: 'idle'|'wait'|'show'|'skip', item?, why?, as?: 'card'|'flourish'|'pop'}
 */
function trMomentQueueNext(queue, st, now) {
  st = st || {};
  const q = (queue || []).slice().sort((a, b) => (TM_MOMENT_PRIORITY[a.kind] || 9) - (TM_MOMENT_PRIORITY[b.kind] || 9) || a.at - b.at);
  if (!q.length) return { action: 'idle' };
  const shown = st.shown || {};
  for (const item of q) {
    if (shown[item.key] != null) return { action: 'skip', item, why: 'already shown' };
    if (now - item.at > 6 * 3600000) return { action: 'skip', item, why: 'expired' };
  }
  if (st.showing) return { action: 'wait', item: q[0], why: 'one at a time' };
  const item = q[0];
  const b = st.blockers || {};
  const block = b.hidden ? 'hidden' : b.typing ? 'typing' : b.modal ? 'modal open' : b.story ? 'story playing' : b.card ? 'task card open' : b.meeting ? 'meeting in progress'
    : (st.bootAt != null && now - st.bootAt < 10000) ? 'just booted' : null;
  if (block) return { action: 'wait', item, why: block };
  if (item.kind === 'travel') return { action: 'show', item, as: 'card' };
  if ((st.todayCount || 0) >= 3) return { action: 'show', item, as: 'pop', why: 'daily cap' };
  if (st.lastCardAt != null && now - st.lastCardAt < 10 * 60000) return { action: 'show', item, as: 'flourish', why: 'cool-down' };
  return { action: 'show', item, as: 'card' };
}

/* ---------- content (spec 4.3) ---------- */
const _tmPad = (n) => String(n).padStart(2, '0');
function _tmHM(min, h12) {
  const m = ((Math.round(Number(min) || 0) % 1440) + 1440) % 1440, h = Math.floor(m / 60);
  return h12 ? `${h % 12 || 12}:${_tmPad(m % 60)}${h < 12 ? 'am' : 'pm'}` : `${_tmPad(h)}:${_tmPad(m % 60)}`;
}
function _tmParts(ms, zone) {
  if (typeof clockPartsIn === 'function') return clockPartsIn(ms, zone);
  const d = new Date(ms);
  return { h: d.getUTCHours(), mi: d.getUTCMinutes(), min: d.getUTCHours() * 60 + d.getUTCMinutes(), iso: d.toISOString().slice(0, 10), mo: d.getUTCMonth() + 1, dow: d.getUTCDay(), off: 0 };   // clock-ok: Node fallback without the clock file
}
function _tmOff(ms, zone) { return typeof clockOffsetIn === 'function' ? clockOffsetIn(ms, zone) : 0; }
function _tmCountryName(cc) {
  const c = typeof trCountry === 'function' ? trCountry(cc) : null;
  if (c && c.name) return c.name;
  return typeof trCountryLabel === 'function' ? trCountryLabel(cc) : String(cc || '');
}
/** The weather now and the rain window from a forecast (lib/weather.mjs's shape, in the place's own hours). */
function trWeatherChip(w, localMin) {
  if (!w || w.ok === false) return null;
  const cur = w.current || null;
  const hourly = Array.isArray(w.hourly) ? w.hourly : [];
  const temp = cur && Number.isFinite(cur.temp) ? Math.round(cur.temp) : (w.today && Number.isFinite(w.today.hi) ? Math.round(w.today.hi) : null);
  const cond = (cur && cur.cond) || (w.today && w.today.cond) || 'clear';
  const label = String((cur && cur.label) || (w.today && w.today.label) || '').toLowerCase();
  if (temp === null && !label) return null;
  const h = Math.floor((Number(localMin) || 0) / 60);
  const today = hourly.length ? hourly[0].date : '';
  const wetNow = /rain|showers|drizzle|thunder/.test(cond);
  let until = '';
  if (wetNow) {
    const dry = hourly.find(x => x.date === today && x.hour > h && !/rain|showers|drizzle|thunder/.test(x.cond || ''));
    if (dry) until = ` until ${_tmPad(dry.hour)}:00`;
  } else {
    const wet = hourly.find(x => x.date === today && x.hour > h && /rain|showers|drizzle|thunder/.test(x.cond || '') && (x.rain || 0) >= 50);
    if (wet) until = ` · rain from ${_tmPad(wet.hour)}:00`;
  }
  const icon = /snow/.test(cond) ? 'snowflake' : wetNow ? 'umbrella' : /cloud|fog/.test(cond) ? 'cloud' : 'sun';
  return { icon, html: `${temp !== null ? `<b>${temp}°</b> ` : ''}${_tmEsc(label || cond)}${_tmEsc(until)}`, cond, temp, sunrise: w.today && w.today.sunrise, sunset: w.today && w.today.sunset };
}
function _tmEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function _tmHours(hhmm) { const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || '')); return m ? Number(m[1]) + Number(m[2]) / 60 : NaN; }
/**
 * The arrival's content (spec 4.3). i: {now, zone (local), place {cc, cityId, label, zone}, home {zone, label, cc, ccy},
 * leg (the arrival leg, if any), source ('calendar'|'geo'|'zone'|'trip'), trip, weather (forecast), meetings (snapshot),
 * nextEvent {title, start}, holidays [{cc, date, name}], rate {ccy, perHome}, h12, banner (the zone banner's words),
 * landed (TR7: the computer did not switch), month}
 */
/** Ranked, contextual surprises. Distances are displacement, never route
 * mileage. Manual changes can compare places, without claiming a physical trip. */
const TR_JOURNEY_EGGS = Object.freeze([
  ['birthday-arrival', 'Birthday side quest unlocked.', 'A new setting for your birthday chapter.', x => x.birthday],
  ['far-far-away', 'Over 7,500 miles? Jesus Christ, did you leave anything for tomorrow?', x => x.distance, x => x.miles >= 7500],
  ['five-thousand-miles', 'Over 5,000 miles. Was the nearest coffee shop shut?', x => x.distance, x => x.miles >= 5000],
  ['two-thousand-miles', 'Over 2,500 miles. Bit dramatic for a change of scenery.', x => x.distance, x => x.miles >= 2500],
  ['thousand-miles', 'Jesus Christ, you travelled over 1,000 miles. Casual little outing?', x => x.distance, x => x.miles >= 1000],
  ['five-hundred-miles', 'Over 500 miles. A tiny change of scenery, obviously.', x => x.distance, x => x.miles >= 500],
  ['big-hop', 'Over 250 miles. Popping out, were you?', x => x.distance, x => x.miles >= 250],
  ['hundred-miles', 'New scenery unlocked.', x => x.distance, x => x.miles >= 100],
  ['equator', 'Changed hemispheres. Still haven\'t closed those tabs.', 'You crossed the equator between these locations.', x => x.geo && x.from.lat * x.to.lat < 0 && Math.abs(x.from.lat) >= 3 && Math.abs(x.to.lat) >= 3],
  ['date-line', 'Longitude just did a plot twist.', 'These locations sit on opposite sides of the 180-degree meridian.', x => x.geo && Math.abs(x.to.lon - x.from.lon) > 180],
  ['northward', 'Your compass picked the upstairs option.', 'A change of at least ten degrees of latitude northward.', x => x.geo && x.to.lat - x.from.lat >= 10],
  ['southward', 'Your compass picked the downstairs option.', 'A change of at least ten degrees of latitude southward.', x => x.geo && x.from.lat - x.to.lat >= 10],
  ['longitude', 'A whole new column on the globe.', 'A change of at least 45 degrees of longitude.', x => x.geo && Math.abs(x.to.lon - x.from.lon) >= 45 && Math.abs(x.to.lon - x.from.lon) <= 180],
  ['home-country', 'Back on familiar map pages.', 'A little home territory. A fresh chapter.', x => x.border && x.to.cc === x.homeCc],
  ['return-country', 'This country gets a sequel.', 'You have welcomed this country before.', x => x.border && x.returningCountry && x.to.cc !== x.homeCc],
  ['new-country', 'New country, new chapter.', 'Your dashboard came along for the ride.', x => x.border && !x.returningCountry && x.to.cc !== x.homeCc],
  ['clock-minutes', 'Even the minutes moved.', 'This clock shift is not a whole number of hours.', x => Number.isFinite(x.diffMin) && x.diffMin !== 0 && Math.abs(x.diffMin) % 60 !== 0],
  ['clock-big', 'Your clock is eight hours away. Good luck explaining your sleep schedule.', 'Eight hours or more from your home clock. Same dashboard.', x => Math.abs(x.diffMin) >= 480],
  ['clock-shift', 'Same you. New clock.', 'At least three hours from your home clock.', x => Math.abs(x.diffMin) >= 180],
  ['calendar-ahead', 'Already in tomorrow? Show-off.', 'The local date is ahead of the date at home.', x => x.dayDiff > 0],
  ['calendar-behind', 'You got yesterday back. Try not to waste it twice.', 'The local date is behind the date at home.', x => x.dayDiff < 0],
  ['third-town-day', 'Three towns in a day. Sit down for a bloody minute.', 'Three or more different towns in the last 24 hours.', x => x.uniqueToday >= 3],
  ['fifth-town-week', 'Five towns this week. The map would like a day off.', 'Five or more different towns in the last seven days.', x => x.uniqueWeek >= 5],
  ['return-quick', 'Back already? Forget something, or just missed the entrance?', 'This place made another appearance within a day.', x => x.returning && x.awayMs > 0 && x.awayMs <= 86400000],
  ['return-month', 'Previously, on your dashboard...', 'A familiar place, at least a month since the last visit.', x => x.returning && x.awayMs >= 30 * 86400000],
  ['third-visit', 'A trilogy deserves a good entrance.', 'Your third recorded visit to this place.', x => x.visitCount === 3],
  ['fifth-visit', 'Five visits. Shall we just leave your name on the door?', 'Five or more recorded visits to this place.', x => x.visitCount >= 5],
  ['returning', 'The sequel looks good on you.', 'A familiar place. A fresh chapter.', x => x.returning],
  ['weekend-return', 'Weekend sequel unlocked.', 'Back somewhere familiar for the weekend.', x => x.returning && (x.dow === 0 || x.dow === 6)],
  ['late-arrival', 'Making an entrance at this hour? Very subtle.', 'Unpack at your own pace.', x => x.hour >= 22 || x.hour < 5],
  ['early-bird', 'Before eight? Disgustingly organised.', 'A new setting before eight. Take your time settling in.', x => x.hour >= 5 && x.hour < 8],
  ['lunchtime', 'New location. Please tell me lunch was involved.', 'The scenery changed around lunchtime.', x => x.hour >= 11 && x.hour < 14],
  ['friday-arrival', 'Friday got a location upgrade.', 'A fresh setting for the end of the week.', x => x.dow === 5 && x.hour >= 16],
  ['sunday-arrival', 'Sunday has a bonus scene.', 'A small scene change before the new week.', x => x.dow === 0],
  ['local-fleet', 'Fleet by name. No need to rush.', 'Settle in at your own pace.', x => x.town === 'fleet'],
  ['local-yateley', 'Yateley. You can stop the dramatic entrance now.', 'Small town. Main-character arrival.', x => x.town === 'yateley'],
  ['local-sheffield', 'Sheffield has entered the chat.', 'A fresh setting for today.', x => x.town === 'sheffield'],
  ['local-manchester', 'Manchester has entered the chat.', 'Your dashboard made the guest list.', x => x.town === 'manchester'],
  ['local-reading', 'Reading? The plot thickens.', 'A new page for today.', x => x.town === 'reading'],
  ['local-bath', 'Bath has made a splash.', 'A fresh setting. No towel required.', x => x.town === 'bath'],
  ['local-york', 'York turn to make an entrance.', 'The next chapter starts here.', x => x.town === 'york'],
  ['local-oxford', 'Oxford: a fresh page.', 'No footnotes required for this entrance.', x => x.town === 'oxford'],
  ['local-cambridge', 'Cambridge has joined the group project.', 'Your dashboard brought its own notes.', x => x.town === 'cambridge'],
  ['local-edinburgh', 'Edinburgh gets the opening credits.', 'A new setting for the same main character.', x => x.town === 'edinburgh'],
  ['local-glasgow', 'Glasgow has entered the scene.', 'Your dashboard remembered its lines.', x => x.town === 'glasgow'],
  ['local-cardiff', 'Cardiff has joined the cast.', 'A fresh backdrop for your next chapter.', x => x.town === 'cardiff'],
  ['local-belfast', 'Belfast gets a grand entrance.', 'Your dashboard is ready for its close-up.', x => x.town === 'belfast'],
  ['local-derry', 'A fresh chapter in Derry/Londonderry.', 'Same dashboard. New opening credits.', x => ['derry/londonderry', 'derry', 'londonderry'].includes(x.town)],
].map(([id, title, detail, matches]) => Object.freeze({ id, title, detail, matches, priority: trJourneyEggPriority(id) })));
function trJourneyEggPriority(id) {
  if (id === 'birthday-arrival') return 100;
  if (id === 'far-far-away') return 95;
  if (id === 'five-thousand-miles') return 92;
  if (['new-country', 'home-country', 'return-country'].includes(id)) return 90;
  if (['equator', 'date-line', 'northward', 'southward', 'longitude'].includes(id)) return 85;
  if (['two-thousand-miles', 'thousand-miles', 'five-hundred-miles'].includes(id)) return 80;
  if (['calendar-ahead', 'calendar-behind'].includes(id)) return 75;
  if (id.startsWith('clock-') || id === 'return-month') return 70;
  if (['third-town-day', 'fifth-town-week', 'third-visit', 'fifth-visit'].includes(id)) return 65;
  if (id === 'big-hop') return 60;
  if (['return-quick', 'weekend-return'].includes(id)) return 55;
  if (id === 'returning') return 50;
  if (id === 'hundred-miles') return 45;
  if (id.startsWith('local-')) return 40;
  return 30;
}
function trJourneyEggChoices(i) {
  i = i || {};
  const from = i.from || {}, to = i.to || {};
  const valid = p => Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;
  let miles = 0;
  if (valid(from) && valid(to)) {
    const r = Math.PI / 180;
    const h = Math.sin((to.lat - from.lat) * r / 2) ** 2 + Math.cos(from.lat * r) * Math.cos(to.lat * r) * Math.sin((to.lon - from.lon) * r / 2) ** 2;
    miles = 12742 * Math.asin(Math.min(1, Math.sqrt(h))) / 1.609344;
  }
  const observed = ['geo', 'calendar', 'trip', 'travel'].includes(i.source || 'geo');
  const ctx = { ...i, from, to, miles, geo: observed && valid(from) && valid(to) && miles >= 100,
    border: /^[A-Z]{2}$/.test(from.cc || '') && /^[A-Z]{2}$/.test(to.cc || '') && from.cc !== to.cc,
    town: String(to.town || to.name || '').trim().toLowerCase(),
    distance: `About ${Math.round(miles).toLocaleString('en-GB')} miles between these locations, as the crow flies.` };
  let distancePicked = false;
  const candidates = TR_JOURNEY_EGGS.filter(e => {
    if (!e.matches(ctx)) return false;
    if (typeof e.detail === 'function') { if (distancePicked) return false; distancePicked = true; }
    return true;
  }); // The strongest distance band, rather than seven versions of the same fact.
  return candidates.map(e => ({ id: e.id,
    title: i.source === 'manual' && e.id === 'thousand-miles' ? 'Over 1,000 miles between settings. Subtle little scene change.' : e.title,
    detail: typeof e.detail === 'function' ? e.detail(ctx) : e.detail, extraMs: 2500, priority: e.priority }));
}
function trJourneyEgg(i) {
  let candidates = trJourneyEggChoices(i);
  if (!candidates.length) return null;
  const priority = Math.max(...candidates.map(e => e.priority));
  candidates = candidates.filter(e => e.priority === priority);
  i = i || {};
  // Travel card content stays deterministic; location opening windows shuffle
  // these matching choices and preserve their selection across reloads.
  const sequence = Math.max(0, Math.floor(Number(i.sequence) || 0));
  return candidates[sequence % candidates.length];
}
function trJourneyEggNext(choices, used, lastId, random = Math.random()) {
  if (!Array.isArray(choices) || !choices.length) return null;
  let pool = choices.filter(e => !(used || []).includes(e.id));
  if (!pool.length) pool = choices.filter(e => e.id !== lastId);
  if (!pool.length) pool = choices;
  const priority = Math.max(...pool.map(e => e.priority || 0));
  pool = pool.filter(e => (e.priority || 0) === priority);
  const n = Number.isFinite(random) ? Math.max(0, Math.min(0.999999, random)) : 0;
  return pool[Math.floor(n * pool.length)];
}
function trArrivalModel(i) {
  i = i || {};
  const now = Number(i.now) || 0;
  const place = i.place || {};
  const cc = String(place.cc || '').toUpperCase();
  const zone = place.zone || i.zone || (i.home && i.home.zone) || 'UTC';
  const home = i.home || {};
  const homeZone = home.zone || 'UTC';
  const city = place.cityId && typeof trCity === 'function' ? trCity(place.cityId) : null;
  const cityName = (city && city.name) || (place.kind === 'city' || place.cityId ? place.label || place.name || '' : '');
  const country = _tmCountryName(cc);
  const hasCity = !!cityName && ['calendar', 'geo', 'trip'].includes(i.source || 'calendar');
  const lp = _tmParts(now, zone), hp = _tmParts(now, homeZone);
  const diffMin = _tmOff(now, zone) - _tmOff(now, homeZone);
  const dayDiff = typeof clockDaysBetween === 'function' ? clockDaysBetween(hp.iso, lp.iso) : 0;
  const rail = !!(i.leg && i.leg.mode && i.leg.mode !== 'flight');
  const actor = i.leg ? (rail ? 'rail' : 'arrive') : 'none';
  const zoneLabel = typeof clockZoneLabel === 'function' ? clockZoneLabel(zone) : zone;
  const timeLabel = hasCity ? cityName : `${(typeof trZoneLabel === 'function' && trZoneLabel(zone)) || zoneLabel} time`;
  const kind = typeof trPlaceKind === 'function' ? trPlaceKind({ cityId: place.cityId, cc }) : 'oldtown';
  const wx = trWeatherChip(i.weather, lp.min);
  const tod = trTodAt(lp.h + lp.mi / 60, wx ? _tmHours(wx.sunrise) : NaN, wx ? _tmHours(wx.sunset) : NaN);
  const night = lp.h >= 23 || lp.h < 5;
  const g = typeof trGreeting === 'function' ? trGreeting({ cc, cityId: place.cityId, hour: lp.h }) : { lang: 'en', text: 'Hello', roman: '', meaning: '' };
  // Chips, the first matching ones in this order (4.3 #6); a night arrival keeps only the weather.
  const chips = [];
  // A meeting with guests in the next 48 h now falls at another wall time (it was booked at home).
  const re = diffMin ? (i.meetings || []).find(mt => mt && Number.isFinite(mt.start) && mt.start > now && mt.start - now <= 48 * 3600000 && mt.title) : null;
  if (re && !night) {
    const p = _tmParts(re.start, zone);
    const who = (re.their || []).find(t => t && t.name);
    chips.push({ icon: 'calendar', kind: 'meeting', html: who ? `${_tmEsc(re.title)} is <b>${_tmHM(p.min, i.h12)}</b> here · ${_tmHM(_tmParts(re.start, who.zone).min, i.h12)} for ${_tmEsc(String(who.name).split(/\s+/)[0])}` : `${_tmEsc(re.title)} is now <b>${_tmHM(p.min, i.h12)}</b> here` });
  }
  if (wx) chips.push({ icon: wx.icon, kind: 'weather', html: wx.html });
  if (!night) {
    const cur = typeof trCurrencyInfo === 'function' ? trCurrencyInfo(cc) : null;
    if (cur && cur.code && cur.code !== (home.ccy || '')) {
      const rate = i.rate && i.rate.perHome ? ` · ${_tmEsc(home.ccy === 'GBP' ? '£' : home.ccy || '')}1 ≈ <b>${_tmEsc(cur.symbol)}${_tmEsc(String(i.rate.perHome))}</b>` : '';
      chips.push({ icon: 'banknote', kind: 'currency', html: `${_tmEsc(cur.name)} <b>${_tmEsc(cur.symbol)}</b>${rate}` });
    }
    const plug = typeof trPlugAdvice === 'function' ? trPlugAdvice(home.cc, cc) : null;
    if (plug) chips.push({ icon: 'plug', kind: 'plugs', html: `Plugs <b>${_tmEsc(plug.types.join('/'))}</b>` });
    const tomorrow = typeof clockAddDays === 'function' ? clockAddDays(lp.iso, 1) : '';
    const hol = (i.holidays || []).find(x => x && x.cc === cc && x.date === tomorrow);
    if (hol) chips.push({ icon: 'flag', kind: 'holiday', html: `Tomorrow is a public holiday here (${_tmEsc(hol.name)}): shops and offices may close` });
    if (i.nextEvent && i.nextEvent.title && i.nextEvent.start > now) chips.push({ icon: 'calendar', kind: 'next', html: `Next: <b>${_tmEsc(i.nextEvent.title)}</b> ${_tmHM(_tmParts(i.nextEvent.start, zone).min, i.h12)}` });
  }
  const overline = rail ? `Arrived · ${hasCity ? cityName + ', ' : ''}${country}` : i.leg ? `Landed · ${hasCity ? cityName + ', ' : ''}${country}` : `On ${timeLabel.replace(/ time$/, '')} time · ${country}`;
  const title = `Welcome to ${hasCity ? cityName : country}`;
  const diffLabel = (typeof clockFmtDiff === 'function' ? clockFmtDiff(diffMin) : String(diffMin)) + (dayDiff > 0 ? ' · tomorrow there' : dayDiff < 0 ? ' · yesterday there' : '');
  const iata = i.leg && i.leg.to && i.leg.to.iata ? i.leg.to.iata : (i.leg && /\b([A-Z]{3})\s*$/.exec(String(i.leg.title || '').replace(/[)\]]/g, '')) || [])[1] || '';
  const arrivedMin = i.leg && Number.isFinite(i.leg.arrive) ? _tmParts(i.leg.arrive, zone).min : lp.min;
  const origin = i.leg && i.leg.from || home;
  const originCity = origin.cityId && typeof trCity === 'function' ? trCity(origin.cityId) : null;
  const egg = trJourneyEgg({ from: { ...(originCity || origin), cc: origin.cc || home.cc }, to: { ...(city || place), cc, town: cityName }, source: i.source || 'trip',
    hour: lp.h, dow: lp.dow, dayDiff, diffMin, homeCc: home.cc, returningCountry: !!i.returningCountry, sequence: i.sequence || 0,
    birthday: !!(i.birthday && String(i.birthday).slice(-5) === lp.iso.slice(-5)) });
  const note = i.landed ? String(i.landed) : i.banner ? String(i.banner) : '';
  return {
    kind: 'arrive', key: i.key || '', tripId: (i.trip && i.trip.id) || i.tripId || '', cc, cityId: place.cityId || '', city: hasCity ? cityName : '', country, title, overline,
    timeLabel, sceneKind: kind, seed: (place.cityId || cc || 'x').toLowerCase(), tod, cond: wx ? wx.cond : 'clear', actor, night, month: lp.mo,
    local: { h: lp.h, m: lp.mi, min: lp.min, label: _tmHM(lp.min, i.h12), iso: lp.iso }, home: { h: hp.h, m: hp.mi, min: hp.min, label: _tmHM(hp.min, i.h12), city: home.label || (typeof clockZoneLabel === 'function' ? clockZoneLabel(homeZone) : homeZone) },
    diffMin, diffLabel, greeting: night ? { lang: 'en', text: `It's ${_tmHM(lp.min, i.h12)} in ${hasCity ? cityName : country}.`, roman: 'Sleep well; tomorrow starts light.', meaning: '', night: true } : g,
    chips: chips.slice(0, night ? 1 : 3), chipsFull: chips.slice(0, night ? 1 : 4),
    stamp: `Arrived${iata ? '<br>' + _tmEsc(iata) : '<br>' + _tmEsc(cc)} · ${_tmHM(arrivedMin, false)}`,
    note, fullNote: `The dashboard now shows ${timeLabel.replace(/ time$/, '')} time. Tasks keep their dates; meetings show both times.`,
    h12: !!i.h12, egg,
  };
}
/** The live-region sentence: "Welcome to Tokyo. It is 15:42 here, 8 hours ahead of London." */
function trMomentAnnounce(m) {
  if (!m) return '';
  if (m.kind === 'home') return `${m.title}. ${m.line || ''}${m.egg ? ' ' + m.egg.title + ' ' + m.egg.detail : ''}`.trim();
  if (m.kind === 'depart') return `${m.title}. ${m.lineText || ''}`.trim();
  const d = Math.round(Number(m.diffMin) || 0), a = Math.abs(d), h = Math.floor(a / 60), mm = a % 60;
  const amount = (h ? `${h} hour${h === 1 ? '' : 's'}` : '') + (mm ? `${h ? ' ' : ''}${mm} minutes` : '');
  const rel = !d ? `the same time as ${m.home.city}` : `${amount} ${d > 0 ? 'ahead of' : 'behind'} ${m.home.city}`;
  return `${m.title}. It is ${m.local.label} here, ${rel}.${m.egg ? ' ' + m.egg.title + ' ' + m.egg.detail : ''}`;
}
/**
 * Welcome home (spec 4.1; t3). i: {now, home {zone, label, cc, cityId}, trip {id, label, dest, from, to, nights, spending,
 * groupEvents}, weather, bodyDiffMin, h12}
 */
function trHomeModel(i) {
  i = i || {};
  const now = Number(i.now) || 0;
  const home = i.home || {};
  const t = i.trip || {};
  const hp = _tmParts(now, home.zone || 'UTC');
  const wx = trWeatherChip(i.weather, hp.min);
  const days = t.from && t.to && typeof clockDaysBetween === 'function' ? Math.max(1, clockDaysBetween(t.from, t.to) + 1) : (Number(t.nights) || 0) + 1;
  const where = (t.dest && (t.dest.label || t.dest.name)) || t.label || '';
  const events = Array.isArray(t.groupEvents) ? t.groupEvents.length : 0;
  const counts = [{ n: days, label: days === 1 ? 'day away' : 'days away' }];
  if (events) counts.push({ n: events, label: events === 1 ? 'event there' : 'events there' });
  const by = t.spending && t.spending.byCcy ? Object.entries(t.spending.byCcy) : [];
  const spend = by.slice(0, 2).map(([ccy, v]) => ({ ccy, amt: v && Number.isFinite(v.orig) ? v.orig : 0 }));
  const homeLabel = home.label || (typeof clockZoneLabel === 'function' ? clockZoneLabel(home.zone) : '');
  const egg = trJourneyEgg({ from: t.dest || {}, to: { ...home, town: home.label }, homeCc: home.cc, source: 'trip' });
  const kind = typeof trPlaceKind === 'function' ? trPlaceKind({ cityId: home.cityId, cc: home.cc }) : 'oldtown';
  const chips = [];
  if (wx) chips.push({ icon: wx.icon, kind: 'weather', html: wx.html });
  // trBody's D is local - body: back home after flying west, the body is still ahead.
  const bd = Math.round(Number(i.bodyDiffMin) || 0);
  if (bd) { const a = Math.abs(bd), h = Math.floor(a / 60), mm = a % 60; chips.push({ icon: 'moon', kind: 'body', html: `Body clock still <b>${h ? h + ' h' : ''}${mm ? ' ' + mm + (h ? '' : ' min') : ''} ${bd < 0 ? 'ahead' : 'behind'}</b>` }); }
  return {
    kind: 'home', key: i.key || '', tripId: t.id || '', title: 'Welcome home', overline: `Back · ${hp.iso} · ${_tmHM(hp.min, i.h12)}`, dateIso: hp.iso, timeLabel: _tmHM(hp.min, i.h12),
    line: `${days} day${days === 1 ? '' : 's'}${where ? ' in ' + where : ' away'}. The dashboard is back on ${homeLabel} time.`, where, days, counts, spend,
    sceneKind: kind, seed: 'home', tod: trTodAt(hp.h + hp.mi / 60, wx ? _tmHours(wx.sunrise) : NaN, wx ? _tmHours(wx.sunset) : NaN), cond: wx ? wx.cond : 'clear', actor: 'home', month: hp.mo,
    chips: chips.slice(0, 3), homeLabel, egg, keptUntil: t.to && typeof clockAddDays === 'function' ? clockAddDays(t.to, 92) : '',
  };
}
/**
 * The departure Home card (spec 4.1; t4). i: {now, zone, home, leg (snapshot leg view), trip, weather (destination), packed {done, total}, checkedIn, h12}
 */
function trDepartModel(i) {
  i = i || {};
  const now = Number(i.now) || 0;
  const leg = i.leg || {};
  const home = i.home || {};
  const zone = i.zone || home.zone || 'UTC';
  const to = leg.to || (i.trip && i.trip.dest) || {};
  const from = leg.from || {};
  const dep = _tmParts(leg.depart || now, zone);
  const arrZone = leg.arriveZone || to.zone || zone;
  const arr = _tmParts(leg.arrive || leg.depart || now, arrZone);
  const arrHere = _tmParts(leg.arrive || leg.depart || now, zone);
  const today = _tmParts(now, zone).iso;
  const day = dep.iso === today ? 'Today' : (typeof clockDaysBetween === 'function' && clockDaysBetween(today, dep.iso) === 1 ? 'Tomorrow' : dep.iso);
  const verb = leg.mode && leg.mode !== 'flight' ? leg.mode : 'flight';
  const toName = to.label || to.name || _tmCountryName(to.cc);
  const fromName = from.label || from.name || '';
  const chips = [];
  if (i.checkedIn) chips.push({ icon: 'circle-check', kind: 'checkin', html: '<b>Checked in</b>' });
  if (i.packed && i.packed.total) chips.push({ icon: 'luggage', kind: 'pack', html: `Pack list <b>${Number(i.packed.done) || 0} / ${Number(i.packed.total)}</b>` });
  const wx = trWeatherChip(i.weather, arr.min);
  if (wx) chips.push({ icon: wx.icon, kind: 'weather', html: `${_tmEsc(toName)} ${wx.html}` });
  const arrDay = typeof clockDaysBetween === 'function' ? clockDaysBetween(dep.iso, arr.iso) : 0;
  const lineText = `${leg.code ? leg.code + ' · ' : ''}${fromName ? fromName + ' → ' : ''}${toName}. Lands ${arrDay > 0 ? 'the next day, ' : ''}${_tmHM(arr.min, i.h12)} ${toName} time (${_tmHM(arrHere.min, i.h12)} here).`;
  return {
    kind: 'depart', key: i.key || '', tripId: (i.trip && i.trip.id) || '', title: 'Have a good trip', overline: `${day} · ${verb} ${_tmHM(dep.min, i.h12)}`, lineText,
    homeCc: home.cc || '', destCc: to.cc || '', sceneKind: typeof trPlaceKind === 'function' ? trPlaceKind({ cityId: home.cityId, cc: home.cc }) : 'oldtown', seed: 'home',
    tod: trTodAt(dep.h + dep.mi / 60, NaN, NaN), cond: 'clear', actor: verb === 'flight' ? 'depart' : 'none', chips: chips.slice(0, 3), departAt: leg.depart || 0, eventId: leg.eventId || '',
  };
}
