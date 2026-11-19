/* ============================================================
   THINGS THE MOVES NEED THAT THE WORLD DID NOT HAVE (round 3, "player" branch, round 2). Drawn here, standing in the world all the time
   (not only while you use them: nothing appears out of nowhere), each painted with a base that meets the ground, a contact shadow and a
   little wear or growth round its foot. Each is placed against a fixed thing of the layout (anchor + at, in cells), so when a painter
   moves that thing, these move with it; a painter who draws their own may set `drawn: false` on the row and keep the action.

   GARDEN_ACT_WORLD rows: { id, anchor (a static id) | cell [x, y], at [dx, dy] (cells from the anchor's foot middle), act, name,
     stand [dx, dy] (cells from this thing's foot), deg, art (a drawing below), noProp (the figure holds nothing: the world has it) }.
   gardenActWorldProps(sc, o) -> rows for gardenWorldProps (94-garden-fish-1world.js): [{z, x, html}] in world px.
   gardenActWorldRows() -> the rows placed: [{ ...row, x, y }] (cells, the foot), for the action table (94-garden-zz-7act-1core.js).
   ============================================================ */
const GARDEN_ACT_WORLD = Object.freeze([
  // a brass telescope on a tripod on the folly's lookout, aimed at the far hills: you put your eye to it
  { id: 'ga-scope', anchor: 'ld-folly', at: [0.95, 0.55], act: 'look', name: 'the telescope', stand: [-0.18, 0.14], deg: -90, art: 'scope', noProp: true },
  // a ladder up the lighthouse's side to a plank landing with a rail: you climb the rungs and stand on the landing
  { id: 'ga-lh-ladder', anchor: 'ld-lighthouse', at: [0.22, 0.13], act: 'ladder', name: 'the lighthouse ladder', stand: [0, 0.03], deg: -90, art: 'ladder', noProp: true },
  // (round 3) the treehouse's and the hay loft's ladders, drawn standing there all the time like the lighthouse's (not only while you climb)
  { id: 'ga-th-ladder', anchor: 'ld-treehouse', at: [0.35, 0.2], act: 'ladderhi', name: 'the treehouse ladder', stand: [0, 0.03], deg: -90, noProp: true, edge: true },   // (the treehouse's painter draws this ladder: no art here)
  { id: 'ga-barn-ladder', anchor: 'ld-barn', at: [1.1, 0.37], act: 'ladderlo', name: 'the hay loft ladder', stand: [0, 0.03], deg: -90, art: 'ladder', top: 96, loft: true, noProp: true, edge: true },
  // a campfire in a ring of stones beside the beacon, a log to one side: warm your hands, toast a marshmallow
  { id: 'ga-fire-beacon', anchor: 'ld-beacon', at: [1.9, 1.5], act: 'warm', name: 'the campfire', stand: [0, -0.34], deg: 90, art: 'fire' },
  // and one by the woodsman's hut in the west woods
  { id: 'ga-fire-hut', cell: [15.5, 78.5], at: [0, 0], act: 'warm', name: 'the campfire', stand: [0, -0.34], deg: 90, art: 'fire' },
  // (1) a log laid by the fire to sit on (round 3: the bee boles and the driftwood arch are not seats; this is), its top at 0.3 of your height
  { id: 'ga-logseat', cell: [15.5, 78.5], at: [-1.45, -0.15], act: 'sit', name: 'the log', stand: [0, 0.12], deg: 90, art: 'logseat', seat: 0.42 },
  // (18) a leather ball on the grass by the green, and in autumn a pile of leaves beside it: kick them
  { id: 'ga-ball', anchor: 'sundial', at: [-4.3, 2.5], act: 'kick', name: 'the ball', stand: [0, -0.3], deg: 90, art: 'ball', kick: 'ball' },
  { id: 'ga-leaves', anchor: 'sundial', at: [-5.7, 0.2], act: 'kick', name: 'the leaf pile', stand: [0, -0.32], deg: 90, art: 'leaves', kick: 'leaves', season: 'autumn' },
  // (24) the busker's pitch by the market: a stool, an open fiddle case with a few coins, the fiddle on the stool
  { id: 'ga-busker', anchor: 'market-stall', at: [2.6, 1.2], act: 'play', name: 'the fiddle', stand: [0.9, 0.25], deg: 90, art: 'busker' },
  // (25) small things to pick up and carry: a basket of apples by the market, a shell on the quay beach, a log by the hut
  { id: 'ga-basket', anchor: 'market-stall', at: [-1.4, 1.3], act: 'carry', name: 'the basket', stand: [0, 0.36], deg: 90, art: 'basket', carry: 'basket' },
  { id: 'ga-log', anchor: 'ld-woodhut', at: [2.4, 1.6], act: 'carry', name: 'the log', stand: [0, 0.36], deg: 90, art: 'log', carry: 'log' },
  // (29) a worn grassy bank on the Mere's south shore, room for two side by side, legs over the water (round 3: right on the water's edge, the hips on the lip; edge: the walker leaves you there)
  { id: 'ga-bank-l', anchor: 'lake-board', at: [-4.6, -2.0], act: 'fishsit', name: 'the bank', stand: [0, 0], deg: 0, art: 'bank', edge: true, flat: true },
  { id: 'ga-bank-r', anchor: 'lake-board', at: [-3.4, -2.0], act: 'fishsit', name: 'the bank', stand: [0, 0], deg: 0, edge: true },
]);
const _GAW_ART = Object.freeze({
  scope: () => '<ellipse cx="0" cy="1" rx="13" ry="3.2" fill="#1a1408" opacity="0.22"/><path d="M-12 1q4 -3 9 -1q5 -2 9 0q5 -1 7 1" stroke="#6a8a3a" stroke-width="1.4" fill="none" opacity="0.8"/>'
    + '<path d="M0 -24L-9 0M0 -24L9 0M0 -24L1 1" stroke="#5a3e22" stroke-width="1.8" stroke-linecap="round"/><path d="M-9 0h-1.6M9 0h1.6" stroke="#2a1e10" stroke-width="1.4"/>'
    + '<circle cx="0" cy="-25" r="2.2" fill="#8a6a2a" stroke="#3a2810" stroke-width="0.6"/>'
    + '<g transform="translate(0 -26) rotate(-16)"><rect x="-9" y="-2.4" width="22" height="4.8" rx="1.4" fill="#c89838" stroke="#6a4a14" stroke-width="0.7"/><rect x="-9" y="-2.4" width="22" height="1.6" rx="0.8" fill="#f0d47a" opacity="0.7"/><rect x="12" y="-3.3" width="5" height="6.6" rx="1" fill="#b08428" stroke="#6a4a14" stroke-width="0.7"/><circle cx="17" cy="0" r="2.1" fill="#9ad0e8" opacity="0.8"/><rect x="-12" y="-1.6" width="3.4" height="3.2" rx="0.8" fill="#4a3418"/><path d="M2 -2.4v4.8M7 -2.4v4.8" stroke="#8a6420" stroke-width="0.7"/></g>',
  // world px: rungs every 5.56 px (9.4 of the figure's units at its scale), the landing 79 px up, bracketed to the wall
  ladder: (o, inUse, row) => { const S = typeof GW_SCALE === 'number' ? GW_SCALE : 0.592, top = ((row && row.top) || GA_LADDER.top) * S, N = Math.max(4, Math.round((((row && row.top) || GA_LADDER.top) - GA_LADDER.first) / GA_LADDER.gap) + 1), g = GA_LADDER.gap * S, f = GA_LADDER.first * S; let r = '';
    for (let i = 0; i < N; i++) r += `<path d="M-5.2 ${_gawN(-f - i * g)}H5.2" stroke="#8a6a40" stroke-width="1.3"/>`;
    // a hay-loft door in the wall at the landing (the barn): a dark doorway, hay spilling over its sill, the door swung open to one side
    const loft = row && row.loft ? `<path d="M-11 ${_gawN(-top - 1)}V${_gawN(-top - 24)}Q0 ${_gawN(-top - 29)} 11 ${_gawN(-top - 24)}V${_gawN(-top - 1)}z" fill="#2a1a10" stroke="#5a2a1a" stroke-width="1.2"/><path d="M-10 ${_gawN(-top - 2)}q4 -7 9 -4q4 -5 10 2z" fill="#e8c460"/><path d="M-8 ${_gawN(-top - 4)}l3 -4M-2 ${_gawN(-top - 5)}l1 -5M4 ${_gawN(-top - 4)}l3 -4" stroke="#c89a38" stroke-width="0.8"/><path d="M11 ${_gawN(-top - 1)}l9 2V${_gawN(-top - 22)}l-9 -2z" fill="#a8382a" stroke="#5a1a14" stroke-width="0.7"/><path d="M12 ${_gawN(-top - 6)}l7 1.6M12 ${_gawN(-top - 16)}l7 1.6" stroke="#f0e0c8" stroke-width="0.9" opacity="0.8"/>` : '';
    return loft + `<ellipse cx="0" cy="1" rx="9" ry="2.2" fill="#1a1408" opacity="0.2"/><path d="M-13 ${_gawN(-top - 3)}h26v3.4h-26z" fill="#8a6438" stroke="#4a3218" stroke-width="0.6"/><path d="M-13 ${_gawN(-top + 0.4)}h26" stroke="#5a3e22" stroke-width="1"/><path d="M-12 ${_gawN(-top + 0.4)}l4 7M12 ${_gawN(-top + 0.4)}l-4 7" stroke="#6a4a2a" stroke-width="1.4"/>`
      + `<path d="M-12 ${_gawN(-top - 3)}V${_gawN(-top - 18)}M12 ${_gawN(-top - 3)}V${_gawN(-top - 18)}M-12 ${_gawN(-top - 17)}H12M-12 ${_gawN(-top - 10)}H12" stroke="#7a5a36" stroke-width="1.3" stroke-linecap="round"/>`
      + `<path d="M-5.4 0L-4.8 ${_gawN(-top)}M5.4 0L4.8 ${_gawN(-top)}" stroke="#7a5a36" stroke-width="1.6" stroke-linecap="round"/><path d="M-4.4 0L-3.9 ${_gawN(-top)}" stroke="#a8844e" stroke-width="0.5" opacity="0.8"/>${r}<path d="M-8 0q2 -3 4 -1M5 0q2 -3 3 0" stroke="#6a8a3a" stroke-width="1.2" fill="none"/>`; },
  fire: (o) => { const still = o && o.still;
    return '<ellipse cx="0" cy="1" rx="17" ry="5" fill="#1a1408" opacity="0.24"/><ellipse cx="0" cy="-1" rx="12" ry="3.6" fill="#3a2a1a" opacity="0.8"/>'
      + [[-12, 0], [-8, -3.4], [0, -4.4], [8, -3.4], [12, 0], [7, 3], [-1, 3.6], [-8, 3]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="3.4" ry="2.4" fill="${i % 2 ? '#8a8478' : '#a8a294'}" stroke="#4a463c" stroke-width="0.5"/>`).join('')
      + '<path d="M-7 0L6 -3.2M-5 -3L7 1" stroke="#5a3a22" stroke-width="2.6" stroke-linecap="round"/><path d="M-7 0L6 -3.2" stroke="#8a5a32" stroke-width="0.8"/>'
      + `<g class="${still ? '' : 'gda-flicker'}"><path d="M-5 -1Q-6 -9 -1 -15Q0 -9 3 -12Q6 -6 4 -1z" fill="#f08a2a"/><path d="M-3 -1Q-3 -7 0 -10Q1 -6 2.6 -7Q3.4 -3 2 -1z" fill="#ffd060"/></g>`
      + `<g class="${still ? '' : 'gda-glow'}"><ellipse cx="0" cy="-4" rx="16" ry="9" fill="#ffb050" opacity="0.14"/></g>`
      + '<path d="M18 2q4 -2 10 -1q2 1 0 3q-5 1 -10 0z" fill="#6a4a2e" stroke="#3a2818" stroke-width="0.6"/><ellipse cx="27.6" cy="2.4" rx="1.6" ry="1.6" fill="#a87c4f"/>'; },
  ball: () => '<g transform="scale(1.35)"><ellipse cx="0" cy="1" rx="6" ry="1.8" fill="#1a1408" opacity="0.26"/><circle cx="0" cy="-4.6" r="5" fill="#f4efe4" stroke="#3a2a1a" stroke-width="0.7"/><path d="M-2 -7l2 -1.6l2 1.6l-0.8 2.4h-2.4z" fill="#2a2420"/><path d="M-4.6 -3.4l1.6 0.6M4.6 -3.4l-1.6 0.6M0 -1l0 1.6" stroke="#2a2420" stroke-width="0.7"/><ellipse cx="-1.8" cy="-6.6" rx="1.4" ry="0.8" fill="#ffffff" opacity="0.8"/><path d="M-7 1q2 -3 3 0M5 1q1 -3 3 -1" stroke="#5a8a32" stroke-width="1" fill="none"/></g>',
  leaves: () => { let s = '<ellipse cx="0" cy="1" rx="16" ry="4" fill="#1a1408" opacity="0.22"/>'; const C = ['#c8642a', '#e0a038', '#a8441e', '#d8862e', '#b8742a']; for (let i = 0; i < 26; i++) { const a = i * 2.4, r = (i % 7) * 1.9, x = Math.cos(a) * r * 1.6, y = -2 - Math.abs(Math.sin(a)) * r * 0.5 - (7 - i % 7) * 0.9; s += `<ellipse cx="${_gawN(x)}" cy="${_gawN(y)}" rx="3" ry="1.7" transform="rotate(${(i * 37) % 180} ${_gawN(x)} ${_gawN(y)})" fill="${C[i % 5]}" stroke="#6a3010" stroke-width="0.3"/>`; } return s; },
  busker: (o, inUse) => '<g transform="scale(0.62)"><ellipse cx="0" cy="1" rx="16" ry="4" fill="#1a1408" opacity="0.22"/><path d="M-12 0L-11 -9M-4 0L-5 -9M-10 -6h4" stroke="#6a4a2a" stroke-width="1.4"/><path d="M-13 -10h10v-1.6h-10z" fill="#8a6438" stroke="#4a3218" stroke-width="0.6"/>' + (inUse ? '' : '<g transform="translate(-8 -13) rotate(-8)"><path d="M-3 -2Q-6 -2 -6 1Q-6 4 -3 4Q-4 6 -1 7L6 7Q8 6 8 4Q11 4 11 1Q11 -2 8 -2Q8 -4 6 -5L-1 -5Q-4 -4 -3 -2z" fill="#a8582a" stroke="#4a2210" stroke-width="0.6"/><path d="M11 1h8" stroke="#2a1a10" stroke-width="1.6"/></g>') + '<path d="M2 0l14 0l-1 -4l-12 0z" fill="#3a2a3a" stroke="#1a1018" stroke-width="0.6"/><path d="M3 -4l12 0l-2 -5l-9 1z" fill="#6a2a3a" stroke="#1a1018" stroke-width="0.5"/><circle cx="7" cy="-1.6" r="1" fill="#f0cc50"/><circle cx="10" cy="-1.2" r="1" fill="#d8b040"/><circle cx="12" cy="-2" r="0.9" fill="#c8c8c0"/></g>',
  logseat: () => '<ellipse cx="0" cy="1" rx="25" ry="4.4" fill="#1a1408" opacity="0.26"/><path d="M-22 1Q-24 -10 -18 -11L18 -11Q23 -10 22 1Q0 4 -22 1z" fill="#6e4a2c" stroke="#3a2616" stroke-width="0.8"/>'
    + '<path d="M-18 -11L18 -11Q21 -10.4 21.6 -8L-20 -8Q-20 -10.4 -18 -11z" fill="#8e6a44"/><path d="M-16 -6.4Q-2 -5 14 -6.6M-14 -2.6Q2 -1.6 16 -3M-8 -9.4L6 -9.6" stroke="#4a301c" stroke-width="0.7" fill="none" opacity="0.8"/>'
    + '<ellipse cx="20.4" cy="-5" rx="3.6" ry="5.6" fill="#c89a62" stroke="#5a3a20" stroke-width="0.7"/><ellipse cx="20.4" cy="-5" rx="2.2" ry="3.6" fill="none" stroke="#9a7044" stroke-width="0.5"/><ellipse cx="20.4" cy="-5" rx="0.9" ry="1.5" fill="#9a7044"/>'
    + '<path d="M-21 -9Q-14 -12 -6 -10.6Q-12 -9.6 -21 -7z" fill="#6a8a36" opacity="0.85"/><path d="M-6 -11.4q1 -3 3 -1" stroke="#5a3a22" stroke-width="1" fill="none"/>'
    + '<path d="M-25 2q2 -5 4 0M-12 3q1 -4 2 0M8 3q1 -5 3 0M24 2q2 -5 3 0" stroke="#5a8a32" stroke-width="1.1" fill="none"/><path d="M-17 3q1 -3 3 -1" stroke="#7aa840" stroke-width="0.9" fill="none"/>',
  basket: () => '<ellipse cx="0" cy="1" rx="9" ry="2.4" fill="#1a1408" opacity="0.24"/><path d="M-7 -8H7L5.4 0H-5.4z" fill="#c8924a" stroke="#6a4218" stroke-width="0.7"/><path d="M-6.4 -5H6.4M-6 -2.4H6M-3 -8L-2.4 0M3 -8L2.4 0" stroke="#8a5a2a" stroke-width="0.6"/><path d="M-6 -8Q0 -16 6 -8" stroke="#8a5a2a" stroke-width="1.2" fill="none"/><circle cx="-2.6" cy="-9" r="2.2" fill="#d8452a"/><circle cx="1.8" cy="-9.4" r="2.2" fill="#7ac24a"/><circle cx="0" cy="-8.2" r="1.8" fill="#e8b830"/>',
  log: () => '<ellipse cx="0" cy="1" rx="14" ry="3" fill="#1a1408" opacity="0.24"/><path d="M-12 -1Q-13 -8 -9 -8L9 -8Q13 -8 12 -1Q0 1 -12 -1z" fill="#7a5432" stroke="#3a2818" stroke-width="0.7"/><ellipse cx="10" cy="-4.4" rx="3" ry="3.6" fill="#c8a070" stroke="#6a4a2a" stroke-width="0.6"/><ellipse cx="10" cy="-4.4" rx="1.4" ry="1.8" fill="none" stroke="#8a6440" stroke-width="0.5"/><path d="M-8 -6h12" stroke="#5a3a22" stroke-width="0.6"/>',
  bank: () => '<path d="M-26 -4Q-12 -9 0 -7Q14 -9 46 -4L48 2Q10 6 -28 2z" fill="#6a9a3a" opacity="0.9"/><path d="M-24 -2Q8 -6 44 -2" stroke="#8a6a3a" stroke-width="2.2" fill="none" opacity="0.7"/><path d="M-20 2q2 -5 4 0M-4 2q2 -6 3 0M14 2q1 -5 3 0M30 2q2 -6 3 0" stroke="#4a7a2a" stroke-width="1.1" fill="none"/><path d="M22 -6L26 -12M24 -6L22 -12" stroke="#6a4a2a" stroke-width="1"/>',
});
const _gawN = (v) => String(Math.round(v * 10) / 10);
/** Where each row is today, from the layout (or its own cell). */
function gardenActWorldRows() {
  let stat = []; try { stat = gardenIslandData().static || []; } catch (e) { stat = []; }
  const live = typeof GARDEN_PROPS !== 'undefined' ? new Map(GARDEN_PROPS.map(p => [p.id, p])) : new Map(), byId = new Map(stat.map(r => [r.id, r]));
  const out = [];
  for (const w of GARDEN_ACT_WORLD) {
    let fx, fy;
    if (w.cell) { fx = w.cell[0]; fy = w.cell[1]; }
    else { const r = live.get(w.anchor) || byId.get(w.anchor); if (!r) continue; fx = r.x + r.w / 2; fy = r.y + r.h; }
    const mv = typeof gartActMovedTo === 'function' ? gartActMovedTo(w.id) : null;   // a thing you carried off and set down is where you left it (this visit)
    out.push(Object.assign({}, w, mv ? { x: mv.x, y: mv.y } : { x: fx + w.at[0], y: fy + w.at[1] }));
  }
  return out;
}
/** For gardenWorldProps: each drawn in world px at its foot, sorted in by its row. */
function gardenActWorldProps(sc, o) {
  const W = GARDEN_WORLD, out = [];
  for (const r of gardenActWorldRows()) {
    if (r.drawn === false || !_GAW_ART[r.art] || (r.season && sc && sc.season !== r.season) || (typeof gartActCarried === 'function' && gartActCarried(r.id))) continue;
    const x = r.x * W.cellW, y = W.sky + r.y * W.cellH;
    out.push({ z: r.flat ? r.y - 1.2 : r.y, x: Math.floor(r.x), html: `<g class="gd-it gd-prop gd-prop-work" data-prop="${r.id}" data-z="${_gawN(r.y)}" pointer-events="none"><g transform="translate(${_gawN(x)} ${_gawN(y)})">${_GAW_ART[r.art](o, typeof gartActInUse === 'function' && gartActInUse(r.id), r)}</g></g>` });
  }
  return out;
}
