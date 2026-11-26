/* ============================================================
   DEPTH: UNDER THINGS (26 Nov 2026, the depth lane). The owner: "now that we have the concept of depth in the game we can climb
   stuff but also should be able to go underneath stuff like swim under bridges and anywhere else".

   UNDER AS WELL AS OVER. Whatever is raised over the water is passed beneath: you swim under a footbridge's deck, through the hump
   bridge's arches, under the pier between its piles. Nothing here names a place. Every crossing the layout lays is judged by its
   crossing KIND (presentation.crossings[].kind), every thing by its GARDEN_KINDS kind, and its zone is read from its own standing deck
   as the world draws it (gardenIslandCrossingGeometry; the thing's footprint), so a new bridge or a new pier on any layout just works.

   PER LEVEL. For a swimmer beneath it the deck blocks nothing: its supports do (a footbridge's trestle posts, the hump bridge's cutwater
   and end piers, the pier's piles). For a walker on it the deck is ground, as it always was, and nothing below it matters. While anyone
   is beneath it, its own picture is drawn again over them, faded, so nobody is lost from view (the lid: 94-garden-zz-8depth-2lids.js),
   and whoever stands on it stays on top.

   GARDEN_UNDER.crossing[kind] (a crossing's kind) and GARDEN_UNDER.kind[kind] (a GARDEN_KINDS kind) = {
     swim     you swim beneath it                       peek   too low to pass under (a log): nothing passes
     clear    the room beneath it, in H (the player's height); a swimmer's head and shoulders need GARDEN_UNDER.head
     trestle  { span (px of water along the deck to each trestle), edge (px in from the deck's near side), beam (px the deck's side beam
              shows below its edge), drop (px the post shows below the beam), r (px) }: posts standing in the water under the near side
     spans    [[t0, t1], ...] shares of the deck's length that are open beneath it (its arches); the rest is pier and abutment
     face     px its near face drops below the deck to the water (the arches are cut in it)
     gate     shut while the crossing's own gate (gateId) is shut: logs chained across its arches, nobody passes
     piles    the posts the world draws under the deck (94-garden-native-world.js pierPiles) hold a swimmer off
     lid      how its picture is drawn again over you: 'vale' (the vale painter's own drawing of it, 94-garden-paint-vale-1places.js),
              'gate' (the gate's own baked base, 94-garden-native-painted-props.js), 'deck' (the world's drawing of the deck)
     name     the words for it
   }
   A crossing that has the layout's weir under it (within GARDEN_UNDER.weir cells) passes nothing: the river pours over the sill there.
   Pure data and pure functions above the runtime files (1under, 2lids): a tool can run this file in a vm on any layout's json.
   ============================================================ */
const GARDEN_UNDER = Object.freeze({
  head: 0.6,      // H: a swimmer's head and shoulders above the water
  weir: 2.5,      // cells: a crossing this near the layout's weir has the sill under it
  crossing: Object.freeze({
    footbridge: Object.freeze({ swim: true, clear: 0.75, trestle: Object.freeze({ span: 58, edge: 3, beam: 5, drop: 12, r: 3.4 }), lid: 'vale', name: 'the footbridge' }),
    'hump-bridge': Object.freeze({ swim: true, clear: 1.15, spans: Object.freeze([Object.freeze([0.17, 0.45]), Object.freeze([0.55, 0.83])]), face: 24, gate: true, lid: 'gate', name: 'the bridge' }),
    log: Object.freeze({ peek: true, clear: 0.25, name: 'the log' }),
  }),
  kind: Object.freeze({
    pier: Object.freeze({ swim: true, clear: 0.6, piles: true, lid: 'deck', name: 'the pier' }),
  }),
});
/** Point in a polygon of {x, y} points. */
function gardenUnderInPoly(x, y, pts) { let on = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) on = !on; } return on; }
/** A point (world px) in a crossing zone's own deck terms: t px along the deck from its first end, s px across it (+ the near side). */
function gardenUnderDeckTS(z, px, py, out) { const d = z.deck, dx = px - d.ax, dy = py - d.ay, o = out || {}; o.t = dx * d.ux + dy * d.uy; o.s = (dx * -d.uy + dy * d.ux) * d.near; return o; }
/** The zone under a crossing, from its standing deck as the world draws it (a row of gardenIslandCrossingGeometry()). null: nothing
 *  passes beneath it (stepping stones, a weir walk, a kind with no row). W: GARDEN_WORLD; data: the layout (its weir, its gates). */
function gardenUnderZoneOfCrossing(c, W, data) {
  const R = c && c.kind ? GARDEN_UNDER.crossing[c.kind] : null; if (!R || !c.support || c.support.length < 3 || !(c.length > 4)) return null;
  const id = String(c.crossing && c.crossing.id || ''); if (!/^[a-z0-9-]{1,32}$/.test(id)) return null;
  const pres = data && data.presentation || {}, weir = pres.weir;
  if (Array.isArray(weir) && c.support.some(p => Math.hypot(p.x - weir[0], p.y - weir[1]) < GARDEN_UNDER.weir)) return null;   // (the sill is under it)
  if (!R.swim && !R.peek) return null;
  const L = c.length, ux = (c.b.x - c.a.x) / L, uy = (c.b.y - c.a.y) / L, hw = c.halfWidth;
  // the near side: the one that faces you, lower on the screen (the side the painters draw the deck's beam and face on)
  const pa = c.deckPoint(0.5, hw), pb = c.deckPoint(0.5, -hw), near = (Math.abs(pa.y - pb.y) > 2 ? pa.y > pb.y : pa.x > pb.x) ? 1 : -1;
  const deck = { ax: c.a.x, ay: c.a.y, ux, uy, L, hw, near };
  // where the river lies beneath it, along the deck's middle line (px)
  let w0 = null, w1 = null; for (let t = 0; t <= L; t += 1) { const p = c.deckPoint(t / L, 0), x = p.x / W.cellW, y = (p.y - W.sky) / W.cellH; if (gardenUnderInPoly(x, y, c.points)) { if (w0 == null) w0 = t; w1 = t; } }
  if (w0 == null || w1 - w0 < 12) return null;
  const P = (t, s) => { const p = c.deckPoint(t / L, s * near); return { x: p.x, y: p.y }; };
  const cell = p => ({ x: p.x / W.cellW, y: (p.y - W.sky) / W.cellH });
  const face = R.face || 0, open = R.spans ? R.spans.map(([a, b]) => [Math.max(w0, a * L), Math.min(w1, b * L)]).filter(([a, b]) => b - a > 18) : [[w0, w1]];
  if (!open.length) return null;
  // beneath it: the deck over the water, and on the near side its face down to the water (the arches)
  const band = [P(w0, -hw), P(w1, -hw), P(w1, hw), P(w0, hw)];
  if (face) { band[2] = { x: band[2].x, y: band[2].y + face }; band[3] = { x: band[3].x, y: band[3].y + face }; }
  const vis = band.map(cell);
  // the trestles: posts standing in the water under the near side, evenly along the water's span
  const posts = [];
  if (R.trestle && R.swim) {
    const T = R.trestle, n = Math.max(0, Math.round((w1 - w0) / T.span) - 1);
    for (let k = 1; k <= n; k++) { const t = w0 + (w1 - w0) * k / (n + 1), e = P(t, hw), x = P(t, hw - T.edge).x, top = e.y + T.beam; posts.push({ t, x, y: top + T.drop, top: { x, y: top }, r: T.r }); }   // (top: just under the deck's side beam; x, y: its foot in the water, where it holds a swimmer off)
  }
  const xs = vis.map(p => p.x), ys = vis.map(p => p.y);
  return { id, src: 'crossing', kind: c.kind, rule: R, name: R.name, swim: !!R.swim, peek: !!R.peek, deck, wet: [w0, w1], open, posts, face,
    vis, support: c.support, ribbon: c.points, bbox: [Math.min(...xs) - .4, Math.min(...ys) - .4, Math.max(...xs) + .4, Math.max(...ys) + .4],
    nearY: Math.max(...band.map(p => p.y)), gate: R.gate && c.crossing.gateId ? String(c.crossing.gateId) : null, crossing: c };
}
/** The zone under a thing of a raised kind (a pier): its footprint over the water, its piles from the world's own drawing of them
 *  (piles: [{x, y} px], or none). t: a row of gardenAffordThings() (x, y its foot's middle, w, h in cells). */
function gardenUnderZoneOfThing(t, W, piles) {
  const R = t && t.kind ? GARDEN_UNDER.kind[t.kind] : null; if (!R || !R.swim) return null;
  const id = String(t.id || ''); if (!/^[a-z0-9-]{1,32}$/.test(id)) return null;
  const w = Math.max(.5, Number(t.w) || 1), h = Math.max(.5, Number(t.h) || 1), x0 = t.x - w / 2, x1 = t.x + w / 2, y0 = t.y - h, y1 = t.y;
  const vis = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  const mine = (piles || []).filter(p => p.x >= x0 * W.cellW - 30 && p.x <= x1 * W.cellW + 30 && p.y >= W.sky + y0 * W.cellH - 6 && p.y <= W.sky + y1 * W.cellH + 24);
  return { id, src: 'thing', kind: t.kind, rule: R, name: R.name, swim: true, peek: false, deck: null, posts: mine.map(p => ({ x: p.x, y: p.y, r: p.r || 3.4 })), face: 0,
    vis, rect: [x0, y0, x1, y1], bbox: [x0 - .5, y0 - .4, x1 + .5, y1 + .9], nearY: W.sky + y1 * W.cellH, gate: null, thing: t };
}
/** Is (x, y) (cells) beneath the zone, where a swimmer may be? Inside its band, over water, in an open span. */
function gardenUnderInZone(z, x, y, W) {
  if (!z || x < z.bbox[0] || x > z.bbox[2] || y < z.bbox[1] || y > z.bbox[3]) return false;
  if (z.rect) return x >= z.rect[0] && x <= z.rect[2] && y >= z.rect[1] && y <= z.rect[3];
  return gardenUnderInPoly(x, y, z.vis);
}
/* ---------- the snapshot (100% sync): where the gardener is, as friends should draw them ----------
   pw: [k, id, n]  k 'o' up on a floor (id the thing, n the floor's index), 'u' beneath a raised thing (id the crossing's or the thing's id),
                   't' inside a tunnel (id the tunnel's id, n its chamber); omitted on the ground. Never a reason to send the garden again.
   dp: { t: [[tunnelId, bits]], l: [[tunnelId, chamber, colour]] }   the tunnels' state friends must see (the depth lane's tunnels). */
const GARDEN_DEPTH_WIRE = Object.freeze({ id: /^[a-z0-9-]{1,32}$/, places: Object.freeze(['o', 'u', 't']), tunnels: 16, lamps: 48 });
/** Copy the depth fields of a snapshot that pass, into out (gardenSnapshotClean). An older app's snapshot has neither. */
function gardenDepthClean(raw, out) {
  if (!raw || !out) return out;
  const W = GARDEN_DEPTH_WIRE, int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
  const pw = raw.pw;
  if (Array.isArray(pw) && pw.length === 3 && W.places.includes(pw[0]) && typeof pw[1] === 'string' && W.id.test(pw[1]) && int(pw[2], 0, 15)) out.pw = [pw[0], pw[1], pw[2]];
  const dp = raw.dp;
  if (dp && typeof dp === 'object' && !Array.isArray(dp)) {
    const t = Array.isArray(dp.t) ? dp.t.filter(r => Array.isArray(r) && r.length === 2 && typeof r[0] === 'string' && W.id.test(r[0]) && int(r[1], 0, 255)).slice(0, W.tunnels).map(r => [r[0], r[1]]) : [];
    const l = Array.isArray(dp.l) ? dp.l.filter(r => Array.isArray(r) && r.length === 3 && typeof r[0] === 'string' && W.id.test(r[0]) && int(r[1], 0, 15) && int(r[2], 0, 15)).slice(0, W.lamps).map(r => [r[0], r[1], r[2]]) : [];
    if (t.length || l.length) { out.dp = {}; if (t.length) out.dp.t = t; if (l.length) out.dp.l = l; }
  }
  return out;
}
