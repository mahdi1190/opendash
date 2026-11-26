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
  const swim = !!R.swim && !(R.clear < GARDEN_UNDER.head);   // (room beneath it for a swimmer's head and shoulders, or no way under)
  if (!swim && !R.peek) return null;
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
  if (R.trestle && swim) {
    const T = R.trestle, n = Math.max(0, Math.round((w1 - w0) / T.span) - 1);
    for (let k = 1; k <= n; k++) { const t = w0 + (w1 - w0) * k / (n + 1), e = P(t, hw), x = P(t, hw - T.edge).x, top = e.y + T.beam; posts.push({ t, x, y: top + T.drop, top: { x, y: top }, r: T.r }); }   // (top: just under the deck's side beam; x, y: its foot in the water, where it holds a swimmer off)
  }
  const xs = vis.map(p => p.x), ys = vis.map(p => p.y);
  return { id, src: 'crossing', kind: c.kind, rule: R, name: R.name, swim, peek: !swim && !!R.peek, deck, wet: [w0, w1], open, posts, face,
    vis, support: c.support, ribbon: c.points, bbox: [Math.min(...xs) - .4, Math.min(...ys) - .4, Math.max(...xs) + .4, Math.max(...ys) + .4],
    nearY: Math.max(...band.map(p => p.y)), gate: R.gate && c.crossing.gateId ? String(c.crossing.gateId) : null, crossing: c };
}
/** The zone under a thing of a raised kind (a pier): its footprint over the water, its piles from the world's own drawing of them
 *  (piles: [{x, y} px], or none). t: a row of gardenAffordThings() (x, y its foot's middle, w, h in cells). */
function gardenUnderZoneOfThing(t, W, piles) {
  const R = t && t.kind ? GARDEN_UNDER.kind[t.kind] : null; if (!R || !R.swim || R.clear < GARDEN_UNDER.head) return null;
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
/* ============================================================
   TUNNELS (26 Nov 2026, the depth lane, its second part). "maybe even add tunnels etc, add more depth into the game and locations".
   A way underground is a placed thing of KIND tunnel (GARDEN_KINDS.tunnel), a row of layout data (assets/garden/vale-depth.json), so a new
   one anywhere needs only data: its mouths (where you go in, how each is built, the way you walk in), the lines of its passages and its
   chambers. Nothing here names a place. The game (94-garden-zz-8depth-3tunnel.js) and a tool can both read a row with these:
     gardenTunnelGeom(row, x, y, W)         the row placed at (x, y) (cells: its first mouth's threshold), in world px: mouths, passages,
                                            chambers, stairs, its box; fault: why it cannot be used ('' when it can)
     gardenTunnelFree(G, px, py, e, open)   can the feet be at (px, py) inside it, e px in from its walls (open[i]: mouth i's stair is open)
   GARDEN_TUNNEL_STYLES  how each kind of way is built and sounds: a cellar (flags, a brick vault), a drift (a rough passage through rock),
                         an adit (a mine: timber props, a rail), a vault (dressed stone)
   GARDEN_CHAMBERS       what a chamber is (store, rest, well, vault, gallery, crystal, pool, glow, echo): its set piece, a lamp of its own
   ============================================================ */
const GARDEN_TUNNEL = Object.freeze({
  inner: 0.62,     // cells from a mouth's threshold (outside, where you stand) to its stair foot (inside)
  pr: 20,          // px of a passage's half width for each cell of its row's width (1.5 cells: 60 px across, two abreast)
  stairR: 15,      // px: a stair's half width
  foot: 5,         // px: how near a wall the feet go
  out: 0.34,       // cells: this near the top of an open stair, you go out
  arm: 0.95,       // cells: ...once you have been this far from it since you came in
  face: 1.2,       // H: the back wall's face, seen above the floor's far edge
  margin: 2.4,     // cells round the floor that the inside is drawn (as far as any light really shows the rock)
  light: Object.freeze({ lantern: 3.1, candle: 2.0, lamp: 2.3 }),   // cells: the reach of your own light (a lantern if you have one), a hung lamp's
});
const GARDEN_TUNNEL_STYLES = Object.freeze({
  cellar: Object.freeze({ name: 'the cellar', floor: 'flags', wall: 'brick', props: false, rail: false, echo: 0.3, drip: 0.05, col: Object.freeze({ rock: '#2b2420', rockHi: '#3d332b', floor: '#8a7c68', floorLo: '#6c604f', floorHi: '#a69680', grout: '#4c4338', wall: '#8e5a40', wallLo: '#6a412e', wallHi: '#b07a58', mortar: '#5a4636', light: '#ffc878' }) }),
  drift: Object.freeze({ name: 'the passage', floor: 'earth', wall: 'rock', props: false, rail: false, echo: 0.55, drip: 0.22, col: Object.freeze({ rock: '#26231f', rockHi: '#38332c', floor: '#7a6a52', floorLo: '#5e5140', floorHi: '#96846a', grout: '#4a4034', wall: '#6e665a', wallLo: '#4e483f', wallHi: '#948a7a', mortar: '#3e3a33', light: '#ffcc80' }) }),
  adit: Object.freeze({ name: 'the mine', floor: 'gravel', wall: 'rock', props: true, rail: true, echo: 0.6, drip: 0.4, col: Object.freeze({ rock: '#221f1c', rockHi: '#34302a', floor: '#6e6252', floorLo: '#544a3e', floorHi: '#8a7c68', grout: '#40372e', wall: '#665e54', wallLo: '#48423a', wallHi: '#8c8274', mortar: '#3a352f', light: '#ffc070' }) }),
  vault: Object.freeze({ name: 'the vault', floor: 'flags', wall: 'stone', props: false, rail: false, echo: 0.7, drip: 0.12, col: Object.freeze({ rock: '#272422', rockHi: '#3a3632', floor: '#867c6c', floorLo: '#6a6154', floorHi: '#a29684', grout: '#4a443a', wall: '#9a9080', wallLo: '#726a5c', wallHi: '#bab09e', mortar: '#585246', light: '#ffd08a' }) }),
});
const GARDEN_CHAMBERS = Object.freeze({
  store: Object.freeze({ piece: 'shelves', lamp: true, words: 'a store' }),
  rest: Object.freeze({ piece: 'bench', lamp: false, echo: true, words: 'a resting place' }),
  well: Object.freeze({ piece: 'well', lamp: true, words: 'a well' }),
  vault: Object.freeze({ piece: 'barrels', lamp: true, words: 'a vault' }),
  gallery: Object.freeze({ piece: 'tub', lamp: true, words: 'a working' }),
  crystal: Object.freeze({ piece: 'crystals', lamp: false, glow: '#9fd8ff', words: 'a crystal chamber' }),
  pool: Object.freeze({ piece: 'pool', lamp: false, echo: true, words: 'a still pool' }),
  glow: Object.freeze({ piece: 'worms', lamp: false, words: 'a glow-worm chamber' }),
  echo: Object.freeze({ piece: 'none', lamp: false, echo: true, words: 'an echoing chamber' }),
});
const GT_FACE = Object.freeze({ n: Object.freeze([0, -1]), s: Object.freeze([0, 1]), e: Object.freeze([1, 0]), w: Object.freeze([-1, 0]) });
const GT_BY = Object.freeze(['hatch', 'arch', 'adit', 'steps']);
/** A tunnel row placed at (x, y) (cells: its first mouth's threshold), in world px. Pure. */
function gardenTunnelGeom(row, x, y, W) {
  const T = GARDEN_TUNNEL, cw = W.cellW, chh = W.cellH, P = (cx, cy) => ({ x: cx * cw, y: W.sky + cy * chh });
  const out = { id: String(row && row.id || ''), name: String(row && row.name || 'the tunnel').slice(0, 40), style: GARDEN_TUNNEL_STYLES[row && row.style] ? row.style : 'drift', x, y, mouths: [], segs: [], ells: [], stairs: [], fault: '', box: [0, 0, 0, 0], cbox: [0, 0, 0, 0] };
  if (!/^[a-z0-9-]{1,32}$/.test(out.id)) { out.fault = 'its id'; return out; }
  if (!Number.isFinite(x) || !Number.isFinite(y)) { out.fault = 'no place'; return out; }
  const width = Math.max(1, Math.min(3, Number(row.width) || 1.5)), r = width * T.pr;
  const pts = (a) => Array.isArray(a) && a.length === 2 && Number.isFinite(+a[0]) && Number.isFinite(+a[1]) ? [x + +a[0], y + +a[1]] : null;
  (Array.isArray(row.mouths) ? row.mouths : []).slice(0, 4).forEach((m, i) => {
    const at = pts(m && m.at), face = m && GT_FACE[m.face] ? m.face : 'n', f = GT_FACE[face]; if (!at) return;
    const by = GT_BY.includes(m.by) ? m.by : 'arch', ix = at[0] + f[0] * T.inner, iy = at[1] + f[1] * T.inner, ox = at[0] + f[0] * 0.2, oy = at[1] + f[1] * 0.2;
    out.mouths.push({ i, by, face, fx: f[0], fy: f[1], x: at[0], y: at[1], ix, iy, ox, oy, px: P(at[0], at[1]), pin: P(ix, iy), pout: P(ox, oy) });
  });
  if (!out.mouths.length) { out.fault = 'no mouth'; return out; }
  // a path's point on a mouth's threshold is that mouth's stair foot
  const snap = (p) => { for (const m of out.mouths) if (Math.hypot(p[0] - m.x, p[1] - m.y) < 0.05) return [m.ix, m.iy]; return p; };
  for (const line of (Array.isArray(row.paths) ? row.paths : []).slice(0, 8)) {
    const L = (Array.isArray(line) ? line : []).map(pts).filter(Boolean).map(snap); if (L.length < 2) continue;
    for (let k = 1; k < L.length; k++) { const a = P(L[k - 1][0], L[k - 1][1]), b = P(L[k][0], L[k][1]); out.segs.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, r }); }
  }
  (Array.isArray(row.chambers) ? row.chambers : []).slice(0, 15).forEach((c, i) => {
    const at = pts(c && c.at), rr = Array.isArray(c && c.r) ? c.r : [1.2, 0.8]; if (!at) return;
    const p = P(at[0], at[1]); out.ells.push({ i, x: p.x, y: p.y, rx: Math.max(30, Math.min(150, (+rr[0] || 1.2) * cw)), ry: Math.max(22, Math.min(80, (+rr[1] || 0.8) * chh)), what: GARDEN_CHAMBERS[c.what] ? c.what : 'echo', cx: at[0], cy: at[1], rect: out.style === 'cellar' || out.style === 'vault' });   // (a built room is square, a cave rounded)
  });
  for (const m of out.mouths) out.stairs.push({ m: m.i, ax: m.pin.x, ay: m.pin.y, bx: m.pout.x, by: m.pout.y, r: T.stairR });
  if (!out.segs.length && !out.ells.length) { out.fault = 'no passage'; return out; }
  // each chamber's piece: against its back wall (shelves, barrels, a bench, a tub, crystals: the feet keep in front of it), or standing in
  // it (a well head, a pool: a hole in the floor). A passage that goes on out of a chamber's back keeps its way clear: the piece stands to
  // one side of it, and the old lamp to the other.
  for (const c of out.ells) {
    const piece = GARDEN_CHAMBERS[c.what].piece, through = out.segs.some(s => (Math.hypot(s.ax - c.x, s.ay - c.y) < 6 && s.by < c.y - c.ry * 0.6) || (Math.hypot(s.bx - c.x, s.by - c.y) < 6 && s.ay < c.y - c.ry * 0.6));
    c.pieceDx = through ? -c.rx * 0.5 : 0; c.lampDx = through ? c.rx * 0.55 : 0;
    if (piece === 'well') c.hole = { x: c.x, y: c.y - 2, rx: 24, ry: 9 };
    else if (piece === 'pool') c.hole = { x: c.x + c.rx * 0.12, y: c.y + c.ry * 0.12, rx: c.rx * 0.5, ry: c.ry * 0.45 };
    else if (piece !== 'none' && piece !== 'worms') { c.back = c.y - c.ry + 10; c.backX = through ? [c.x - c.rx - 4, c.x - 18] : [c.x - c.rx - 4, c.x + c.rx + 4]; }
  }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const take = (px, py, rx, ry) => { x0 = Math.min(x0, px - rx); x1 = Math.max(x1, px + rx); y0 = Math.min(y0, py - ry); y1 = Math.max(y1, py + ry); };
  for (const s of out.segs.concat(out.stairs)) { take(s.ax, s.ay, s.r, s.r); take(s.bx, s.by, s.r, s.r); }
  for (const e of out.ells) take(e.x, e.y, e.rx, e.ry);
  for (const m of out.mouths) take(m.px.x, m.px.y, 4, 4);
  out.box = [x0, y0, x1, y1];   // px: the floor and stairs
  out.cbox = [x0 / cw, (y0 - W.sky) / chh, x1 / cw, (y1 - W.sky) / chh];   // cells
  // every mouth's stair foot is on a passage or in a chamber, or that mouth leads nowhere
  for (const m of out.mouths) if (!gardenTunnelFree(out, m.pin.x, m.pin.y, 0, null)) { out.fault = 'mouth ' + m.i + ' leads nowhere'; break; }
  return out;
}
/** Squared distance (px) from p to the segment a-b. */
function _gtSeg2(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy; let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; const qx = ax + dx * t - px, qy = ay + dy * t - py; return qx * qx + qy * qy; }
/** Can the feet be at (px, py) (world px) inside the tunnel, e px in from its walls? open: [bool] per mouth (a shut mouth's stair is
 *  rock); null: every stair counts. Pure, no allocation. */
function gardenTunnelFree(G, px, py, e, open) {
  if (!G || px < G.box[0] - 2 || px > G.box[2] + 2 || py < G.box[1] - 2 || py > G.box[3] + 2) return false;
  for (let i = 0; i < G.ells.length; i++) {   // (a chamber's piece holds the feet off)
    const c = G.ells[i];
    if (c.hole) { const u = (px - c.hole.x) / (c.hole.rx + e), v = (py - c.hole.y) / (c.hole.ry + e * 0.6); if (u * u + v * v <= 1) return false; }
    if (c.back != null && py < c.back + e * 0.6 && px >= c.backX[0] && px <= c.backX[1]) { const u = (px - c.x) / (c.rx + 6), v = (py - c.y) / (c.ry + 6); if (u * u + v * v <= 1) return false; }
  }
  for (let i = 0; i < G.segs.length; i++) { const s = G.segs[i], r = s.r - e; if (r > 0 && _gtSeg2(px, py, s.ax, s.ay, s.bx, s.by) <= r * r) return true; }
  for (let i = 0; i < G.ells.length; i++) { const c = G.ells[i], rx = c.rx - e, ry = c.ry - e * 0.7; if (rx <= 0 || ry <= 0) continue; if (c.rect) { if (Math.abs(px - c.x) <= rx && Math.abs(py - c.y) <= ry) return true; continue; } const u = (px - c.x) / rx, v = (py - c.y) / ry; if (u * u + v * v <= 1) return true; }
  for (let i = 0; i < G.stairs.length; i++) { const s = G.stairs[i]; if (open && !open[s.m]) continue; const r = s.r - e * 0.6; if (r > 0 && _gtSeg2(px, py, s.ax, s.ay, s.bx, s.by) <= r * r) return true; }
  return false;
}
/** Which chamber (its index) you are in at (px, py), or -1. Pure. */
function gardenTunnelChamberAt(G, px, py) {
  let best = -1, bd = 1.0001;
  for (const c of G.ells) { const u = (px - c.x) / (c.rx + 18), v = (py - c.y) / (c.ry + 14), d = u * u + v * v; if (d < bd) { bd = d; best = c.i; } }
  return best;
}
