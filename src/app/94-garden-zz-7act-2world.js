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
  // a campfire in a ring of stones beside the beacon, a log to one side: warm your hands, toast a marshmallow
  { id: 'ga-fire-beacon', anchor: 'ld-beacon', at: [1.9, 1.5], act: 'warm', name: 'the campfire', stand: [0, -0.34], deg: 90, art: 'fire' },
  // and one by the woodsman's hut in the west woods
  { id: 'ga-fire-hut', cell: [15.5, 78.5], at: [0, 0], act: 'warm', name: 'the campfire', stand: [0, -0.34], deg: 90, art: 'fire' },
]);
const _GAW_ART = Object.freeze({
  scope: () => '<ellipse cx="0" cy="1" rx="13" ry="3.2" fill="#1a1408" opacity="0.22"/><path d="M-12 1q4 -3 9 -1q5 -2 9 0q5 -1 7 1" stroke="#6a8a3a" stroke-width="1.4" fill="none" opacity="0.8"/>'
    + '<path d="M0 -24L-9 0M0 -24L9 0M0 -24L1 1" stroke="#5a3e22" stroke-width="1.8" stroke-linecap="round"/><path d="M-9 0h-1.6M9 0h1.6" stroke="#2a1e10" stroke-width="1.4"/>'
    + '<circle cx="0" cy="-25" r="2.2" fill="#8a6a2a" stroke="#3a2810" stroke-width="0.6"/>'
    + '<g transform="translate(0 -26) rotate(-16)"><rect x="-9" y="-2.4" width="22" height="4.8" rx="1.4" fill="#c89838" stroke="#6a4a14" stroke-width="0.7"/><rect x="-9" y="-2.4" width="22" height="1.6" rx="0.8" fill="#f0d47a" opacity="0.7"/><rect x="12" y="-3.3" width="5" height="6.6" rx="1" fill="#b08428" stroke="#6a4a14" stroke-width="0.7"/><circle cx="17" cy="0" r="2.1" fill="#9ad0e8" opacity="0.8"/><rect x="-12" y="-1.6" width="3.4" height="3.2" rx="0.8" fill="#4a3418"/><path d="M2 -2.4v4.8M7 -2.4v4.8" stroke="#8a6420" stroke-width="0.7"/></g>',
  // world px: rungs every 5.56 px (9.4 of the figure's units at its scale), the landing 79 px up, bracketed to the wall
  ladder: () => { const S = typeof GW_SCALE === 'number' ? GW_SCALE : 0.592, top = GA_LADDER.top * S, g = GA_LADDER.gap * S, f = GA_LADDER.first * S; let r = '';
    for (let i = 0; i < GA_LADDER.rungs; i++) r += `<path d="M-5.2 ${_gawN(-f - i * g)}H5.2" stroke="#8a6a40" stroke-width="1.3"/>`;
    return `<ellipse cx="0" cy="1" rx="9" ry="2.2" fill="#1a1408" opacity="0.2"/><path d="M-13 ${_gawN(-top - 3)}h26v3.4h-26z" fill="#8a6438" stroke="#4a3218" stroke-width="0.6"/><path d="M-13 ${_gawN(-top + 0.4)}h26" stroke="#5a3e22" stroke-width="1"/><path d="M-12 ${_gawN(-top + 0.4)}l4 7M12 ${_gawN(-top + 0.4)}l-4 7" stroke="#6a4a2a" stroke-width="1.4"/>`
      + `<path d="M-12 ${_gawN(-top - 3)}V${_gawN(-top - 18)}M12 ${_gawN(-top - 3)}V${_gawN(-top - 18)}M-12 ${_gawN(-top - 17)}H12M-12 ${_gawN(-top - 10)}H12" stroke="#7a5a36" stroke-width="1.3" stroke-linecap="round"/>`
      + `<path d="M-5.4 0L-4.8 ${_gawN(-top)}M5.4 0L4.8 ${_gawN(-top)}" stroke="#7a5a36" stroke-width="1.6" stroke-linecap="round"/><path d="M-4.4 0L-3.9 ${_gawN(-top)}" stroke="#a8844e" stroke-width="0.5" opacity="0.8"/>${r}<path d="M-8 0q2 -3 4 -1M5 0q2 -3 3 0" stroke="#6a8a3a" stroke-width="1.2" fill="none"/>`; },
  fire: (o) => { const still = o && o.still;
    return '<ellipse cx="0" cy="1" rx="17" ry="5" fill="#1a1408" opacity="0.24"/><ellipse cx="0" cy="-1" rx="12" ry="3.6" fill="#3a2a1a" opacity="0.8"/>'
      + [[-12, 0], [-8, -3.4], [0, -4.4], [8, -3.4], [12, 0], [7, 3], [-1, 3.6], [-8, 3]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="3.4" ry="2.4" fill="${i % 2 ? '#8a8478' : '#a8a294'}" stroke="#4a463c" stroke-width="0.5"/>`).join('')
      + '<path d="M-7 0L6 -3.2M-5 -3L7 1" stroke="#5a3a22" stroke-width="2.6" stroke-linecap="round"/><path d="M-7 0L6 -3.2" stroke="#8a5a32" stroke-width="0.8"/>'
      + `<g class="${still ? '' : 'gda-flicker'}"><path d="M-5 -1Q-6 -9 -1 -15Q0 -9 3 -12Q6 -6 4 -1z" fill="#f08a2a"/><path d="M-3 -1Q-3 -7 0 -10Q1 -6 2.6 -7Q3.4 -3 2 -1z" fill="#ffd060"/></g>`
      + `<g class="${still ? '' : 'gda-glow'}"><ellipse cx="0" cy="-4" rx="16" ry="9" fill="#ffb050" opacity="0.14"/></g>`
      + '<path d="M18 2q4 -2 10 -1q2 1 0 3q-5 1 -10 0z" fill="#6a4a2e" stroke="#3a2818" stroke-width="0.6"/><ellipse cx="27.6" cy="2.4" rx="1.6" ry="1.6" fill="#a87c4f"/>'; },
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
    out.push(Object.assign({}, w, { x: fx + w.at[0], y: fy + w.at[1] }));
  }
  return out;
}
/** For gardenWorldProps: each drawn in world px at its foot, sorted in by its row. */
function gardenActWorldProps(sc, o) {
  const W = GARDEN_WORLD, out = [];
  for (const r of gardenActWorldRows()) {
    if (r.drawn === false || !_GAW_ART[r.art]) continue;
    const x = r.x * W.cellW, y = W.sky + r.y * W.cellH;
    out.push({ z: r.y, x: Math.floor(r.x), html: `<g class="gd-it gd-prop gd-prop-work" data-prop="${r.id}" data-z="${_gawN(r.y)}" pointer-events="none"><g transform="translate(${_gawN(x)} ${_gawN(y)})">${_GAW_ART[r.art](o)}</g></g>` });
  }
  return out;
}
