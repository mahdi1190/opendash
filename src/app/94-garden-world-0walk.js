/* ============================================================
   GARDEN, the world you walk in (2.22). User request, 30 Oct 2026: "I want the player to always be in the garden ... you can
   move the player around with click" and "the controls are shit". You are IN the garden: your profile's figure (the one the scenes
   use) stands on the grass, walks where you click, and your pet follows. The camera follows you (or shows the whole garden).

     gardenWorldPainted(m)         after every paint of the stage: put the player, the pet and the camera back (the page calls it)
     gardenWorldStart(root) / gardenWorldStop()     the loop (one requestAnimationFrame, paused with the tab)
     gardenWorldClick(it, cell, ev, m)   a click on the stage: true when the world took it. You just click what you want: a building or a board
                                       (you walk to its door and it opens), a bug (you creep up and net it), the water (you cast), the ground (you walk there)
   gardenWorldHover(ev, cell, it)      what is under the pointer: {kind: 'prop' | 'bug' | 'water', text}, for the status line and the cursor
   gardenGoToProp(id)                  walk to a building's door and go in
     gardenWorldKey(ev, down)      WASD and the arrows walk, Space / E do the thing in front of you, + - Fit the camera
     gardenWalkToPoint(pt, then)   walk to a point (free movement: a straight line round whatever is in the way, not cell to cell), then `then`
   gardenWalkTo(cell, then)      the same for the middle of a cell
     gardenWalkable(x, y)          can you stand here?
     gardenWorldFace(cell)         turn to face a cell (the tools use this: you look at what you water)

   The player is a node inside the objects layer, put in depth order by its row (data-z), so you walk behind trees and in front of
   flowers. Everything that moves is driven by this loop and written as attributes, so the scene's own patching (which only
   touches plants, decorations and visitors) never restarts it. Reduced motion: you still walk (it is how the garden works), but
   without the bob, the camera glide or the pet's trot.
   ============================================================ */
const _gw = {
  on: false, raf: 0, last: 0, svg: null, root: null, box: null, ro: null,
  px: GARDEN_WORLD.start.x + 0.5, py: GARDEN_WORLD.start.y + 0.5, face: 1, speed: 0, moving: false, sneak: false,
  path: [], then: null, goal: null,
  node: null, body: '', bodyKey: '', fig: { idle: '', walk: '' },
  z: -1, pet: null, petSvg: '', petKey: '',
  cam: { x: 0, y: 0, w: 0, h: 0, vh: 0, mode: 'follow', init: false, dirty: true },
  keys: new Set(), grid: null, gridKey: '', saveT: 0, size: { w: 0, h: 0 },
};
const GW_SPEED = Object.freeze({ walk: 150, sneak: 70, run: 260 });   // (round 3: the walk now plants its feet, 94-garden-zz-6move.js; 215 could only slide them)   // pixels of stage a second (a cell is 48 x 30 of them)
const GW_ZOOMS = Object.freeze([230, 290, 360, 450, 560, 690, 860, 1040]);   // how many stage units tall the window shows (2.23: two more steps: the world is bigger)
const GW_FIGURE_ART = 0.74, GW_SCALE = GW_FIGURE_ART * GARDEN_ACTOR_SCALE;                                                // the figure's size: 70 units tall -> about 52 px
const GW_PET_SCALE = 0.5 * GARDEN_ACTOR_SCALE;                                             // your pet, drawn at two thirds of the size the garden uses for a wandering one: it comes up to your knee

/* ---------- the grid you walk on ---------- */
/** You walk through what you plant, so a full bed never walls you off: only a tree that has grown past a seedling stands in the way (its trunk, below). */
function gardenPlantBlocks(p) { return !!(p && p.def && p.def.cat === 'tree' && p.stage >= 2); }
/*
 * What has collisions, and how big (2.28; the owner, 31 Oct 2026: "collisions are weird in the garden ... rethink what has collisions and how big they are").
 * Three sizes, so a flower pot is not a wall:
 *   'none'  you walk through or over it: flat things (a picnic blanket), things you walk under (an arch, a pergola) or that hang (string lights, bunting)
 *   'soft'  a small box where it stands: a lantern, a bird bath, a gnome. About half a cell wide and a third deep at its base, so you slip past it
 *   'full'  the whole footprint, like a wall: fences, walls, hedges, benches and seats (you walk up to sit), a fountain, a shed
 * A gate is the way through a fence: the cottage gate is 'none' (it was 'soft', a half-cell box in the middle of pickets
 * a cell and a third wide, so you squeezed past either side of a thing drawn shut: the collision audit, 18 Nov 2026).
 * Trees block their trunk only (a small box at the foot), so the leaves are for walking behind. A catalogue row may say `col: 'none' | 'soft' | 'full'`
 * for itself. Soft boxes are not in the cell grid the routes are planned on (a cell with a lantern in it is still a cell you cross), only in what the
 * feet are tested against (_gwFree, gardenWorldFree), so you go round them instead of the route avoiding the whole cell.
 */
const GARDEN_COL_NONE = new Set(['picnic-blanket', 'sprinkler', 'solar-lights', 'toadstool-lamps', 'string-lights', 'paper-lanterns', 'festive-lights', 'bunting', 'rose-arch', 'pergola',
  'painted-eggs', 'leaf-pile', 'hanging-basket', 'wind-chimes', 'stone-frog', 'old-watering-can', 'bait-bucket']);
const GARDEN_COL_FULL = new Set(['picket-fence', 'wattle-fence', 'box-hedge', 'stone-wall', 'iron-railings', 'bamboo-screen', 'bench', 'stone-bench', 'swing-seat', 'hammock', 'deckchair', 'bistro-set',
  'driftwood-seat', 'fountain', 'mini-pond', 'wishing-well', 'potting-shed', 'gazebo', 'cold-frame', 'aquarium', 'trophy-board']);
/** 'none' | 'soft' | 'full' for a decoration (unknown ones are soft: a small box is the safe middle). */
function gardenDecorCol(def) {
  if (!def) return 'full';
  if (def.col === 'none' || def.col === 'soft' || def.col === 'full') return def.col;
  if (GARDEN_COL_NONE.has(def.id)) return 'none';
  // (every fence, wall, hedge and railing is 'full' by its family, not by a list of ids: the newer panels, the hazel hurdle,
  // the stone kerb, rope and posts, the crooked railings and the tumbled wall, were missing from the list, so each blocked
  // only a half-cell box under a panel drawn a cell wide and a run of them had a gap at every joint: the verifier, 18 Nov 2026)
  if (GARDEN_COL_FULL.has(def.id) || def.cat === 'fence' || (def.effect && def.effect.kind === 'sit')) return 'full';
  return 'soft';
}
/**
 * A painted fence, hedge or wall panel's block, in cells ({x0, y0, x1, y1}), or null. The painted panels
 * (94-garden-native-painted-decor-9fences.js) stand on their cell's foot line, a little wider than the cell, or turned (rot
 * 1 and 3) run up the middle of it from its foot to its far edge. As whole cells they stopped the feet up to a cell
 * behind a stone kerb drawn as one low line (19 Nov 2026); as half-cell boxes a run of them had a gap at every joint (the
 * verifier, 18 Nov 2026). The block is the panel's band: the cell's whole width (it meets its neighbours), as deep as the
 * panel stands on the ground; turned, the cell's whole length, as thick as the panel.
 */
const GARDEN_FENCE_BAND = Object.freeze({ 'rw-fence-kerb': [.3, .16], 'box-hedge': [.46, .3], 'stone-wall': [.4, .26], 'dc-old-wall': [.4, .26], 'bamboo-screen': [.36, .2] });   // [depth front on, half width turned]
function gardenFenceBand(dc) {
  const def = dc && dc.def; if (!def || def.cat !== 'fence' || def.layer === 'ground' || gardenDecorCol(def) !== 'full') return null;
  if (!(typeof GardenNativePainted !== 'undefined' && GardenNativePainted && GardenNativePainted.wanted && GardenNativePainted.wanted())) return null;
  if (typeof GardenPaintedDecor !== 'undefined' && GardenPaintedDecor && GardenPaintedDecor.has && !GardenPaintedDecor.has(def.id)) return null;   // (not painted: its cell, as before)
  if (typeof gardenBuildLookOf === 'function' && Object.values(gardenBuildLookOf('decor:' + dc.uid) || {}).some(Boolean)) return null;
  const w = def.w || 1, h = def.h || 1, foot = dc.y + h - .03, [depth, half] = GARDEN_FENCE_BAND[def.id] || [.36, .18];
  if (def.rot && (Number(dc.r) || 0) % 2 === 1) { const cx = dc.x + w / 2; return { x0: cx - half, y0: dc.y - .02, x1: cx + half, y1: foot }; }
  return { x0: dc.x - .02, y0: foot - depth, x1: dc.x + w + .02, y1: foot };
}
/** The weir walk's crossing while it is still shut (cells {x0, y0, x1, y1}), else null. It opens when the mill wheel is mended
 *  and the sluice comes up, the moment the Orchard stair's gate opens (round 3 valley layout: the plan's one piece of new code). */
function gardenWeirShutBox(m) {
  const D = typeof gardenIslandActive === 'function' && gardenIslandActive() && typeof gardenIslandData === 'function' ? gardenIslandData() : null;
  const c = D && D.presentation && (D.presentation.crossings || []).find(q => q.id === 'mill-weir'); if (!c || !c.shut) return null;
  const mm = m || (typeof gardenHere === 'function' ? gardenHere() : null), gate = typeof gardenGateOf === 'function' ? gardenGateOf(c.opensWith || 'island-orchard') : null;
  if (gate && mm && typeof gardenGateIsOpen === 'function' && gardenGateIsOpen(gate, mm.areas)) return null;
  return { x0: c.shut[0], y0: c.shut[1], x1: c.shut[2], y1: c.shut[3] };
}
/** The boxes the feet are tested against besides the cell grid: [{x0, y0, x1, y1}] in cells, and which cells each touches. */
function _gwBuildSolids(m) {
  const list = [], at = new Map(), painted = typeof GardenNativePainted !== 'undefined' && GardenNativePainted && GardenNativePainted.wanted && GardenNativePainted.wanted();
  // (src names the thing for the collision view, 94-garden-world-7collide.js; walking reads only the box)
  const add = (x0, y0, x1, y1, src) => {
    const r = { x0, y0, x1, y1, src: src || 'something solid' }; list.push(r);
    for (let cy = Math.floor(y0); cy <= Math.floor(y1 - 1e-6); cy++) for (let cx = Math.floor(x0); cx <= Math.floor(x1 - 1e-6); cx++) { const k = cx + ',' + cy; (at.get(k) || at.set(k, []).get(k)).push(r); }
    return r;
  };
  for (const p of m.plants) {
    if (!gardenPlantBlocks(p)) continue;
    const fp = p.fp || 1, cx = p.x + fp / 2, foot = p.y + fp - 0.08, w = fp > 1 ? 0.5 : 0.4, d = fp > 1 ? 0.32 : 0.28;
    add(cx - w / 2, foot - d, cx + w / 2, foot, 'tree trunk: ' + ((p.def && p.def.name) || 'a planted tree'));   // the trunk: the leaves are for walking behind
  }
  for (const dc of m.decor) {
    const def = dc.def; if (!def || def.layer === 'ground' || gardenDecorCol(def) !== 'soft') continue;
    // (the long wooden planter is a box of bedding drawn end to end across its two cells and half a cell deep: it blocks
    // end to end and that deep. Its half-size box left half a cell of drawn planter at each end to walk through (the
    // verifier, 18 Nov 2026), and a box a tenth of a cell short at each end let you stand in its end post (19 Nov 2026))
    // (and the mammoth skeleton stands on a plinth drawn 1.7 cells long, 52 px each side at the decorations' 0.8 scale,
    // 94-garden-native-painted-decor-8prizes.js: the half-size box left both ends of the plinth to stand on, the audit)
    const long = def.id === 'planter-box', plinth = def.id === 'play-fos-mammoth' ? 1.66 : 0, w = def.w || 1, h = def.h || 1, cx = dc.x + w / 2, foot = dc.y + h - 0.08, bw = long ? w - .04 : plinth || Math.min(w, 2) * 0.5, d = long || plinth ? .44 : 0.28 + (h > 1 ? 0.3 : 0);
    add(cx - bw / 2, foot - d, cx + bw / 2, foot, 'decoration: ' + (def.name || def.id));
  }
  for (const dc of m.decor) { const b = gardenFenceBand(dc); if (b) add(b.x0, b.y0, b.x1, b.y1, 'decoration: ' + (dc.def.name || dc.def.id)); }
  for (const p of gardenPropsNow()) {
    if (p.needs && !gardenWorkOwned(p.needs)) continue;
    if (gardenPropCol(p) !== 'soft') continue;
    const cx = p.x + p.w / 2, foot = p.y + p.h - 0.08, blk = p.block || GW_SOFT_BLOCK[p.id], bw = blk ? blk[0] : Math.min(p.w, 2) * 0.5, d = blk ? blk[1] : 0.28;   // (block: [w, d] in cells, a prop's own foot when it is not the usual half its width: a bench's stone bank, a lamp's post)
    add(cx - bw / 2, foot - d, cx + bw / 2, foot, 'small prop: ' + (p.name || p.id));   // a lectern, a camera, a post box: a small box at the base, so there is room beside it
  }
  // The authored landmark oak is painted scenery rather than a planted row.
  // Give only its bole a small foot box; its roots and crown remain walkable.
  const island = typeof gardenIslandActive === 'function' && gardenIslandActive() ? gardenIslandData() : null;
  // (round 3) the weir walk's planks below the mill wheel stay roped off until the wheel is mended and the sluice is up
  // (the Orchard stair's gate is open): the rope and the sign at each end are painted (94-garden-paint-vale-2valley-screens.js)
  { const wb = gardenWeirShutBox(m); if (wb) add(wb.x0, wb.y0, wb.x1, wb.y1, 'the weir walk, roped off until the sluice is up'); }
  const oak = island && island.version >= 5 && island.presentation && (island.presentation.plazas || []).find(p => p.id === 'great-oak-clearing');
  if (oak) {
    const W = GARDEN_WORLD, scale = 1.75, x = oak.x + 2.9, y = oak.y - 1.5;
    // (round 3) down to where its roots meet the ground (they flare to 8 below the bole's foot): the box stopped above
    // them and the feet stood on the drawn roots
    add(x - 20 * scale / W.cellW, y - 6 * scale / W.cellH, x + 20 * scale / W.cellW, y + 8 * scale / W.cellH, 'the Great Oak trunk');
  }
  // The warren bank is painted two and a half cells wide on a one-cell footprint (94-garden-paint-terrain-2marks.js,
  // ART['ld-warren'].box runs from 62 px left of its foot to 66 px right): only the middle two burrows stopped the feet
  // and you walked over the outer two. The low ends of the bank stop them too (the collision audit, 18 Nov 2026).
  const warren = island && island.version >= 5 && typeof GardenNativePainted !== 'undefined' && GardenNativePainted && GardenNativePainted.wanted && GardenNativePainted.wanted() ? gardenPropsNow().find(p => p.id === 'ld-warren') : null;
  if (warren && gardenPropCol(warren) === 'full' && !(warren.needs && !gardenWorkOwned(warren.needs))) {
    const W = GARDEN_WORLD, w = warren.w || 1, cx = warren.x + w / 2, foot = warren.y + (warren.h || 1);
    add(cx - 54 / W.cellW, foot - .4, warren.x, foot - .02, 'The warren bank (its west end)'); add(warren.x + w, foot - .4, cx + 58 / W.cellW, foot - .02, 'The warren bank (its east end)');
  }
  const logs = typeof gardenIslandLogStack === 'function' ? gardenIslandLogStack(island) : null;
  if (logs) { const f = logs.foot; add(f.x0, f.y0, f.x1, f.y1, 'log stack'); }
  // The quay's sea wall (94-garden-paint-vale-1harbour.js draws it from the plaza): the coast line lies a little below
  // the wall's foot, and you could step down off the quay and stand in the sea in front of the wall. Its top edge is
  // the end of the quay; the pier, the steps at each end and the beach past them stay open.
  const quay = island && island.version >= 5 && island.presentation && (island.presentation.plazas || []).find(p => p.id === 'the-quay');
  if (quay) {
    const pier = island.static.find(p => p.id === 'pier'), y0 = quay.y + 1.85, y1 = quay.y + 3.2, x0 = quay.x - 5.1, x1 = quay.x + 5.4;
    if (pier && pier.x > x0 && pier.x + pier.w < x1) { add(x0, y0, pier.x, y1, 'quay sea wall'); add(pier.x + pier.w, y0, x1, y1, 'quay sea wall'); } else add(x0, y0, x1, y1, 'quay sea wall');
  }
  // Fleet Falls sits in a gap in the scarp. Its painted rock (the cave cheek west of the
  // water, the step east of it out to the scarp) is solid, so only the cave stair climbs it.
  const fw = island && island.version >= 5 && typeof gardenFallsWater === 'function' ? gardenFallsWater(island) : null, fl = fw && island.presentation.falls;
  if (fw && fl.caveStair) {
    add(fl.caveStair[0] + .62, fw.lip.y + .15, fw.lip.x + .2, fl.caveStair[1] + .85, 'rock by Fleet Falls (cave cheek)');
    add(fw.lip.x + 1.6, fw.lip.y + .15, fl.x + fl.w + .75, fl.y + 1.7, 'rock by Fleet Falls (step)');
    add(fl.caveStair[0] + 1.55, fl.caveStair[1] + .85, fl.x + fl.w, fl.caveStair[1] + 1.7, 'Fleet Falls (the falling water)');   // (Cloudbreak layout: you could walk east from the stair's foot into the falling sheet)
  }
  // Cloudbreak's shortcut C, the falls cave stair: shut below level 18 by a rope across its foot (drawn by
  // 94-garden-paint-vale-1cloudbreak.js, which says where: gardenCloudbreakStairShut)
  if (typeof window.gardenCloudbreakStairShut === 'function') for (const [x0, x1, y] of window.gardenCloudbreakStairShut()) add(x0, y - .14, x1, y + .1, 'rope across the falls cave stair (opens at level 18)');
  if (typeof window.gardenCloudbreakLipShut === 'function') for (const [x0, y0, x1, y1] of window.gardenCloudbreakLipShut()) add(x0, y0, x1, y1, 'a lip stone rolled away (it is put back at level 6)');
  // the harbour's painted crates, pots, net, beached boat, bench and anchor stand in the way like the log stack
  if (island && island.version >= 5 && typeof gardenIslandHarbourThings === 'function') for (const t of gardenIslandHarbourThings(island)) add(t.foot[0], t.foot[1], t.foot[2], t.foot[3], 'harbour ' + t.key);
  // The painted Forest arch's two trunks stand where they are drawn (94-garden-native-painted-props.js gateArt 'arch':
  // their feet at +-(half + 2), sheared when the arch is seen side on); the lane runs between them, well clear.
  const woodsGate = island && island.version >= 5 && (island.gates || []).find(g => g.id === 'island-woods');
  const frame = woodsGate && typeof _gldIslandGateFrame === 'function' && typeof GardenNativePainted !== 'undefined' && GardenNativePainted.wanted && GardenNativePainted.wanted() ? _gldIslandGateFrame(woodsGate) : null;
  if (frame) {
    const W = GARDEN_WORLD, side = Math.abs(frame.uy) > Math.abs(frame.ux), half = Math.max(46, Math.min(80, frame.span * .62)), S = frame.span * .9;
    // (seen side on, the arch is a gap in a woodland edge whose oak and hedge banks block through the gate's own feet,
    // GardenPaintedProps.gateTrees: the two sheared trunks no longer stand there)
    if (!side) for (const sgn of [-1, 1]) { const lx = frame.x + sgn * (half + 2), ly = frame.y + 2; add((lx - 9) / W.cellW, (ly - 7 - W.sky) / W.cellH, (lx + 9) / W.cellW, (ly + 2 - W.sky) / W.cellH, 'Forest arch trunk'); }
  }
  // The crossings' own standing stonework (94-garden-native-painted-props.js gateFeet): the Ruined arch's two piers and the
  // wall stubs beside them, the stone cheeks and oak posts either side of the Orchard stair, the cairn on the pass. They
  // were paint only: you walked through each pier and came out behind it (the verifier, 18 Nov 2026).
  if (painted && island && typeof GardenPaintedProps !== 'undefined' && GardenPaintedProps && GardenPaintedProps.gateFeet) for (const f of GardenPaintedProps.gateFeet()) add(f.x0, f.y0, f.x1, f.y1, f.src);
  // A sight whose painting says where its base is (94-garden-paint-terrain-2marks.js ART[id].foot): the feet stop at that
  // base, not at its layout cells (_gwBuildGrid leaves those open to the feet). The hill stones are four stones, not a slab
  // four cells long; the folly's tower is narrower than its two cells; the shepherd's hut is wider than its one.
  for (const p of gardenPropsNow()) { const feet = gardenPropPaintedFeet(p); if (feet) for (const f of feet) add(f.x0, f.y0, f.x1, f.y1, p.name || p.id); }
  // The fells' sheepfolds (94-garden-paint-terrain-1fells.js): a dry-stone ring painted into the turf with a gateway in
  // it. It was walked straight over. The ring stops the feet along its own line; the gateway is the way in.
  if (painted && island && island.version >= 5 && typeof GardenPaintedTerrain !== 'undefined' && GardenPaintedTerrain && GardenPaintedTerrain.folds) for (const f of gardenWalkFolds(island)) { const r = add(f.x0, f.y0, f.x1, f.y1, f.src); r.form = f; }
  // the boulders the fells' ground painting stands up out of the turf (94-garden-paint-terrain-1fells.js standing)
  if (painted && island && island.version >= 5 && typeof GardenPaintedTerrain !== 'undefined' && GardenPaintedTerrain && GardenPaintedTerrain.standing) for (const b of GardenPaintedTerrain.standing()) {
    if (Array.isArray(b)) { add(b[0], b[1], b[2], b[3], 'boulder (fells)'); continue; }
    // (a slab of an outcrop: an oval, so its corners are not blocked where nothing is drawn)
    const pts = []; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; pts.push([b.x + Math.cos(a) * b.rx, b.y + Math.sin(a) * b.ry]); }
    const f = _gwFormOf(pts, 'rock outcrop (fells)'), r = add(f.x0, f.y0, f.x1, f.y1, f.src); r.form = f;
  }
  // Every painted tree on the map (village planting, the three painted woods, the orchard rows) has one trunk box at
  // its foot, from one list (_gwPaintedTrunks): the crowns are for walking behind.
  for (const b of _gwPaintedTrunks(island)) add(b.x0, b.y0, b.x1, b.y1, 'tree trunk (' + ({ wood: 'painted wood', orchard: 'orchard', village: 'village', fells: 'fells', gate: 'crossing', forest: 'a big tree' }[b.src] || b.src) + ')');
  // the old woodland's lamp plinths (94-garden-0island.js): a small block at the foot, the lantern above is walked behind
  if (typeof gardenIslandOldWoodLamps === 'function') { const lamps = gardenIslandOldWoodLamps(island); for (const q of lamps.concat(gardenIslandPosternPiers(island))) add(q.foot.x0, q.foot.y0, q.foot.x1, q.foot.y1, lamps.includes(q) ? 'lamp plinth' : 'postern pier'); }
  // the village's street lamps (ld-lamp-a by the Land Office, ld-lamp-b by the quay): an iron post on a small plinth, a block at its foot
  // like the old woodland's lamps, so you walk round the post and behind the lantern, not through it (their cell stays open)
  // the painted vale's standing things that name their foot (the cider press, the millstone, the maypole, the shore boulders...)
  if (island && typeof GardenPaintVale !== 'undefined' && GardenPaintVale && GardenPaintVale.feet) for (const f of GardenPaintVale.feet()) add(f.x0, f.y0, f.x1, f.y1, f.src);
  // the fells' standing ground that names its foot: the sheepfold walls, and the ground a peak's picture stands over (you stop at the mountain's flank)
  if (island && typeof GardenPaintedTerrain !== 'undefined' && GardenPaintedTerrain && GardenPaintedTerrain.feet) for (const f of GardenPaintedTerrain.feet()) add(f.x0, f.y0, f.x1, f.y1, f.src);
  // the High orchard's cliff at the head of the cove, and its two shortcuts while shut (94-garden-wonder-7shortcuts.js)
  if (island && typeof gardenOrchardShortcutBlocks === 'function') for (const b of gardenOrchardShortcutBlocks()) add(b.x0, b.y0, b.x1, b.y1, b.src);
  if (typeof gardenActThingSolids === 'function') for (const b of gardenActThingSolids()) add(b.x0, b.y0, b.x1, b.y1, b.src);   // a bench or a well placed as layout data
  // (its front at the plinth's drawn foot, the line the lamp sorts by: 5 px short of it, someone standing at the front of the
  // block with the smaller feet was drawn behind the lamp they stood in front of, the collision audit, 19 Nov 2026)
  for (const p of gardenPropsNow()) if (p.art === 'lamp' && /^ld-lamp-/.test(p.id)) { const x = p.x + .5, y = p.y + .86; add(x - .17, y - .22, x + .17, y + .04, 'street lamp post'); }
  // The landforms (mountains, the scarp, the ruin and terrace walls) stop the feet along their own outline, the one their
  // painters draw (2.73: the cells whose middle fell inside a thin wall blocked whole, so a wall had gaps you walked
  // through and invisible ends a cell wide; the collision view showed it on every wall). Their cells stay solid for
  // building and planting (gardenIslandBaseCell), not for walking (_gwBuildGrid).
  // the old woodland's ruin, postern and brick walls (layout round 3, critic 2): short boxes along the very line their
  // painters draw (94-garden-paint-vale-1places.js ruinWall, 94-garden-paint-vale-1oldwood.js brick), as thick as the stones
  // drawn there, so the feet stop on the stones (an outline three quarters of a cell wide stopped them out on the grass)
  for (const b of _gwOldWallBoxes(island)) add(b.x0, b.y0, b.x1, b.y1, b.src);
  for (const f of gardenWalkLandforms(island)) { const r = add(f.x0, f.y0, f.x1, f.y1, f.src); r.form = f; }
  // The light woods run right to the map's west edge, from the fells down to the old woodland: the feet could stand on
  // its last column with half the figure over the blank beyond the world. They stop half a cell in, among the trees
  // drawn there (the north edge is the sky over the fells; the east and south are sea).
  if (island && island.version >= 5) add(-1, -1, .34, GARDEN_WORLD.rows + 1, 'the edge of the map');
  for (const { form: f } of _gwFieldForms()) { const r = add(f.x0, f.y0, f.x1, f.y1, f.src); r.form = f; }
  return { list, at };
}
/** The one trunk-collision list for painted trees, in cells ({x0, y0, x1, y1, src}). Five painters plant trees, each
 *  recording its trunk feet: the village planting (GardenNativePainted.trunks, {x, y, w} at the foot), the painted woods
 *  (GardenPaintWood.trunks, boxes already), the High orchard rows (GardenPaintVale.orchardTrunks, [x, y, w]), the fells'
 *  pines and rowans (GardenPaintedTerrain.trunks) and the crossings' trees (GardenPaintedProps.gateTrees). Every
 *  foot becomes the same shape of box (its width, .28 of a row deep, ending just past the foot), and a foot that lies
 *  within half a cell of one already listed is the same tree drawn twice (a wood or the orchard over the planting), so it
 *  is listed once. */
function _gwFellTrunks() { const t = typeof GardenPaintedTerrain !== 'undefined' && GardenPaintedTerrain && GardenPaintedTerrain.trunks ? GardenPaintedTerrain.trunks() : null; return Array.isArray(t) ? t : []; }
/** The world's own big trees (94-garden-native-world.js forestRows: the trees that stand where no painter plants a wood;
 *  twelve of them on the fells). They were the one kind of tree with no trunk box: you walked through each trunk and stood
 *  inside it (the verifier, 18 Nov 2026). [x, y, width] at the foot, in cells. */
function _gwForestTrunks() { const nw = typeof _gw !== 'undefined' && _gw && _gw.nativeWorld, t = nw && nw.forestTrunks ? nw.forestTrunks() : null; return Array.isArray(t) ? t : []; }
function _gwGateTrunks() { const nat = typeof GardenNativePainted !== 'undefined' && GardenNativePainted && GardenNativePainted.wanted && GardenNativePainted.wanted(); const t = nat && typeof GardenPaintedProps !== 'undefined' && GardenPaintedProps && GardenPaintedProps.gateTrees ? GardenPaintedProps.gateTrees() : null; return Array.isArray(t) ? t : []; }
/** What the painted-trunk list depends on, cheaply: each painter's own revision or signature. */
function _gwTrunkSig() {
  const nat = typeof GardenNativePainted !== 'undefined' && GardenNativePainted && GardenNativePainted.trunks ? GardenNativePainted.trunks() : null;
  const wood = typeof GardenPaintWood !== 'undefined' && GardenPaintWood && GardenPaintWood.trunks ? GardenPaintWood.trunks() : null;
  const orch = typeof GardenPaintVale !== 'undefined' && GardenPaintVale && typeof GardenPaintVale.orchardTrunks === 'function' ? GardenPaintVale.orchardTrunks() : null;
  const feetSig = list => { let h = list.length; for (const t of list) h = (Math.imul(h, 31) + Math.round(t[0] * 64) * 7 + Math.round(t[1] * 64)) | 0; return list.length + ':' + h; };
  const vale = (typeof GardenPaintVale !== 'undefined' && GardenPaintVale && GardenPaintVale.feetSig ? GardenPaintVale.feetSig() : '') + (typeof GardenPaintedTerrain !== 'undefined' && GardenPaintedTerrain && GardenPaintedTerrain.feetSig ? '~' + GardenPaintedTerrain.feetSig() : '');
  return vale + '/' + (nat ? nat.rev : 0) + '/' + (wood ? wood.sig : '') + '/' + feetSig(Array.isArray(orch) ? orch : []) + '/' + feetSig((typeof GardenPaintVale !== 'undefined' && GardenPaintVale && typeof GardenPaintVale.valleyTrunks === 'function' && GardenPaintVale.valleyTrunks()) || []) + '/' + feetSig(_gwFellTrunks()) + '/' + feetSig(_gwGateTrunks()) + '/' + feetSig(_gwForestTrunks()) + '/' + (typeof GardenPaintedTerrain !== 'undefined' && GardenPaintedTerrain && GardenPaintedTerrain.standSig ? GardenPaintedTerrain.standSig() : '');
}
function _gwPaintedTrunks(island) {
  if (!island) return [];
  const feet = [];
  const nat = typeof GardenNativePainted !== 'undefined' && GardenNativePainted && GardenNativePainted.trunks ? GardenNativePainted.trunks() : null;
  const wood = typeof GardenPaintWood !== 'undefined' && GardenPaintWood && GardenPaintWood.trunks ? GardenPaintWood.trunks() : null;
  const orch = typeof GardenPaintVale !== 'undefined' && GardenPaintVale && typeof GardenPaintVale.orchardTrunks === 'function' ? GardenPaintVale.orchardTrunks() : null;
  // the woods and the orchard are listed first: their boxes were measured against their own drawn trunks
  if (wood && wood.list) for (const b of wood.list) feet.push({ x: (b.x0 + b.x1) / 2, y: b.y1, w: Math.max(.3, b.x1 - b.x0), src: 'wood', sp: b.sp || '' });
  if (Array.isArray(orch)) for (const [x, y, w, sp] of orch) feet.push({ x, y: y + .04, w, src: 'orchard', sp: sp || '' });
  { const vt = typeof GardenPaintVale !== 'undefined' && GardenPaintVale && typeof GardenPaintVale.valleyTrunks === 'function' ? GardenPaintVale.valleyTrunks() : null; if (Array.isArray(vt)) for (const [x, y, w, sp] of vt) feet.push({ x, y: y + .04, w, src: 'valley', sp: sp || '' }); }   // (round 3: the valley's trees)
  if (nat && nat.list) for (const t of nat.list) feet.push({ x: t.x, y: t.y - .02, w: t.w, src: 'village', sp: t.sp || '' });
  for (const [x, y, w, sp] of _gwFellTrunks()) feet.push({ x, y, w, src: 'fells', sp: sp || '' });
  for (const [x, y, w, sp] of _gwGateTrunks()) feet.push({ x, y, w, src: 'gate', sp: sp || '' });
  for (const [x, y, w, sp] of _gwForestTrunks()) feet.push({ x, y, w, src: 'forest', sp: sp || '' });
  const out = [], seen = new Map();
  for (const f of feet) {
    const k = Math.floor(f.x) + ',' + Math.floor(f.y); let dup = false;
    for (let dy = -1; dy <= 1 && !dup; dy++) for (let dx = -1; dx <= 1 && !dup; dx++) for (const o of seen.get((Math.floor(f.x) + dx) + ',' + (Math.floor(f.y) + dy)) || []) if (Math.abs(o.x - f.x) < .5 && Math.abs(o.y - f.y) < .35) { dup = true; break; }
    if (dup) continue;
    (seen.get(k) || seen.set(k, []).get(k)).push(f);
    out.push({ x0: f.x - f.w / 2, y0: f.y - .28, x1: f.x + f.w / 2, y1: f.y, src: f.src, sp: f.sp });   // (sp: the tree's species, what it offers comes from that and its size: 94-garden-zz-7act-0kinds.js gardenTreeKind)
  }
  return out;
}
/** A painted trunk's box width in cells from its drawn width in px: a little wider than the bark, so you stop at it, never narrower than a post nor wider than a stout oak. */
function gardenTrunkBoxWidth(px) { return Math.max(.26, Math.min(.6, px / GARDEN_WORLD.cellW + .1)); }
/** The landforms that stop the feet, as outlines in cells: [{poly: [[x, y]...], x0, y0, x1, y1, src}] (full colliders only). */
const _GW_LANDFORM_NAME = Object.freeze({ 'ruin-wall': 'ruin wall', ruin: 'ruin', 'rock-wall': 'rock wall', 'terrace-wall': 'terrace wall', mountain: 'mountain', screen: 'hedge, wall or reeds' });
/** The old woodland's walls (ruin, postern, the walled garden's brick): their boxes stand in for their outline (_gwBuildSolids). */
function _gwOldWall(f) { return !!f && f.region === 'southwest-ruins' && f.kind === 'ruin-wall' && Array.isArray(f.polygon); }
/** Short boxes along each old-woodland wall's drawn centre line, in cells ({x0, y0, x1, y1, src}): a brick length is one box
 *  on its line, as thick as its brick; a ruin stretch is boxes a fifth of a cell apart along the line its painter draws (the
 *  middle of its outline), a third of a cell across, which is the stones' own foot. */
function _gwOldWallBoxes(island) {
  if (!island || island.version < 5) return [];
  if (island._oldWallBoxes) return island._oldWallBoxes;
  const out = [];
  for (const f of island.landforms || []) {
    if (!_gwOldWall(f)) continue;
    const src = (f.brick ? 'brick wall ' : 'ruin wall ') + f.id;
    if (f.brick && f.line) { const [[x0, y0], [x1, y1]] = f.line, hw = .2; out.push({ x0: Math.min(x0, x1) - (x0 === x1 ? hw : 0), y0: Math.min(y0, y1) - (y0 === y1 ? hw : 0), x1: Math.max(x0, x1) + (x0 === x1 ? hw : 0), y1: Math.max(y0, y1) + (y0 === y1 ? hw : 0), src }); continue; }
    const P = f.polygon, n = P.length >> 1, a = P.slice(0, n), b = P.slice(n).reverse(), m = Math.min(a.length, b.length), mid = [];
    for (let i = 0; i < m; i++) mid.push([(a[i][0] + b[i][0]) / 2, (a[i][1] + b[i][1]) / 2]);
    for (let i = 1; i < mid.length; i++) {
      const [px, py] = mid[i - 1], [qx, qy] = mid[i], L = Math.hypot(qx - px, qy - py), k = Math.max(1, Math.ceil(L / .2));
      for (let j = i === 1 ? 0 : 1; j <= k; j++) { const x = px + (qx - px) * j / k, y = py + (qy - py) * j / k; out.push({ x0: x - .15, y0: y - .17, x1: x + .15, y1: y + .2, src }); }
    }
  }
  try { Object.defineProperty(island, '_oldWallBoxes', { value: out, enumerable: false }); } catch (e) { /* a frozen layout: worked out again next time */ }
  return out;
}
function gardenWalkLandforms(island) {
  if (!island || island.version < 5) return [];
  if (island._walkForms) return island._walkForms;
  // A ruin wall's layout outline is a band a cell and a half thick; the painted garden stands a wall 14 px thick on that
  // band's middle line (94-garden-paint-vale-1places.js ruinWall, T = 7). The feet stopped at the band: up to a cell short
  // of the drawn wall on bare ground, on every one of the thirteen walls (the verifier, 18 Nov 2026). Where that painter
  // draws them, the feet stop at the wall it draws. (The old woodland's walls stop the feet by their own boxes: _gwOldWallBoxes.)
  const thin = typeof GardenPaintVale !== 'undefined' && GardenPaintVale && GardenPaintVale.owns && GardenPaintVale.owns('ruin-wall');
  const out = (island.landforms || []).filter(f => f.col === 'full' && f.polygon && f.polygon.length > 2 && !_gwOldWall(f)).map(f => _gwFormOf(thin && f.kind === 'ruin-wall' ? gardenRuinWallFoot(f.polygon) || f.polygon : f.polygon, (_GW_LANDFORM_NAME[f.kind] || 'rock') + ' ' + f.id));
  try { Object.defineProperty(island, '_walkForms', { value: out, enumerable: false }); } catch (e) { /* a frozen layout: worked out again next time */ }
  return out;
}
/** An outline that stops the feet, ready for the foot test: {poly, cells, x0, y0, x1, y1, src} (cells: 1 all inside, or the edges that cross it). */
function _gwFormOf(pts, src) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  // each cell of its box: 1 (all inside), the edges crossing it, or nothing (outside), so a foot test reads a cell, not the outline
  const cells = new Map();
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const e = [pts[j][0], pts[j][1], pts[i][0], pts[i][1]];
    for (let cy = Math.floor(Math.min(e[1], e[3])); cy <= Math.floor(Math.max(e[1], e[3])); cy++) for (let cx = Math.floor(Math.min(e[0], e[2])); cx <= Math.floor(Math.max(e[0], e[2])); cx++) { if (!_gwSegHitsBox(e, cx, cy, cx + 1, cy + 1)) continue; const k = cx + ',' + cy, l = cells.get(k); if (l) l.push(e); else cells.set(k, [e]); }
  }
  for (let cy = Math.floor(Math.min(...ys)); cy <= Math.floor(Math.max(...ys)); cy++) for (let cx = Math.floor(Math.min(...xs)); cx <= Math.floor(Math.max(...xs)); cx++) { const k = cx + ',' + cy; if (!cells.has(k) && _gwInPoly(cx + .5, cy + .5, pts)) cells.set(k, 1); }
  return Object.freeze({ poly: pts, cells, x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys), src });
}
/** The middle line of a ruin wall's layout band, in cells: the line its painter stands the wall on (the same points:
 *  94-garden-paint-vale-1places.js ruins()). The band's outline runs down one side and back up the other. */
function gardenRuinWallMid(polygon) {
  const n = polygon.length >> 1, a = polygon.slice(0, n), b = polygon.slice(n).reverse(), m = Math.min(a.length, b.length), mid = [];
  for (let i = 0; i < m; i += 2) mid.push([(a[i][0] + b[i][0]) / 2, (a[i][1] + b[i][1]) / 2]);
  if (m % 2 === 0 && m) mid.push([(a[m - 1][0] + b[m - 1][0]) / 2, (a[m - 1][1] + b[m - 1][1]) / 2]);
  return mid;
}
/** The drawn foot of a ruin wall as an outline in cells: its middle line, 8 px either side across and 5 px up and down
 *  (the painter's 7 and 4.2, and a pixel for the stones that stand proud of it). */
function gardenRuinWallFoot(polygon) {
  const W = GARDEN_WORLD, mid = gardenRuinWallMid(polygon); if (mid.length < 2) return null;
  const px = mid.map(p => ({ x: p[0] * W.cellW, y: p[1] * W.cellH })), left = [], right = [];
  for (let i = 0; i < px.length; i++) {
    const p = px[Math.max(0, i - 1)], q = px[Math.min(px.length - 1, i + 1)], L = Math.hypot(q.x - p.x, q.y - p.y) || 1, nx = -(q.y - p.y) / L * 8, ny = (q.x - p.x) / L * 5;
    // (the ends stand a few pixels past the last point, like the end faces the painter draws)
    const ex = i === 0 ? -(q.x - p.x) / L * 3 : i === px.length - 1 ? (q.x - p.x) / L * 3 : 0, ey = i === 0 ? -(q.y - p.y) / L * 3 : i === px.length - 1 ? (q.y - p.y) / L * 3 : 0;
    left.push([(px[i].x + nx + ex) / W.cellW, (px[i].y + ny + ey) / W.cellH]); right.push([(px[i].x - nx + ex) / W.cellW, (px[i].y - ny + ey) / W.cellH]);
  }
  return left.concat(right.reverse());
}
/** The fells' sheepfold rings as outlines that stop the feet: each ring's wall, 5 px either side of its line, open at its gateway. */
function gardenWalkFolds(island) {
  if (island._walkFolds) return island._walkFolds;
  const W = GARDEN_WORLD, out = [];
  for (const [fx, fy, frx, g0, g1] of GardenPaintedTerrain.folds() || []) {
    const RX = frx * W.cellW, RY = frx * W.cellH * .95, outer = [], inner = [];
    // (the painter's ring: 40 steps round, the steps g0..g1 left out for the gateway; the wall runs from g1 round to g0)
    for (let k = g1; k <= 40 + g0; k += .5) { const a = k / 40 * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a); outer.push([fx + c * (RX + 5) / W.cellW, fy + sn * (RY + 5) / W.cellH]); inner.push([fx + c * (RX - 5) / W.cellW, fy + sn * (RY - 5) / W.cellH]); }
    out.push(_gwFormOf(outer.concat(inner.reverse()), 'sheepfold wall'));
  }
  try { Object.defineProperty(island, '_walkFolds', { value: out, enumerable: false }); } catch (e) { /* a frozen layout: worked out again next time */ }
  return out;
}
/** A sight's painted base as boxes in cells, when its painting names one (ART[id].foot: [[left, right, depth]...] in px
 *  from the middle of its footprint's foot line; depth 0 = as deep as its footprint) and that painting is the one in
 *  use; else null and its layout cells stop the feet as before. */
// Sights drawn by a painter that does not say where its base is, with the base it draws ([left, right, depth] in px from
// the middle of the footprint's foot line, as ART[id].foot): their whole-cell blocks did not match the drawing (the
// verifier, 19 Nov 2026). The milestone is a stone a third of a cell wide, not a cell; the old watchtower's stump stands
// 0.4 of a cell in from each end of its three cells; the hollow oak's root flare is wider than its one cell; the charcoal
// clamp's turf mound is nearly two cells wide on one (its ART box runs 46 px each side).
// The summit cairn's bottom ring of stones is drawn a cell and a quarter wide on its one cell, and the woodcutter's hut
// a fifth of a cell past each end of its two (the collision audit).
// (vale final: re-measured on the new layout's drawings with the collision audit: the milestone, the hollow oak, the clamp and the
// watchtower are drawn wider than their old feet; the great stump, the old gardener, the moor gate and the beacon by their drawn bases)
const GW_PROP_FEET = Object.freeze({ 'ld-mile': [[-12, 42, 10]], 'ld-tower': [[-70, 72, 0]], 'ld-hollow': [[-44, 50, 0]], 'ld-clamp': [[-38, 52, 20]], 'ld-cairn': [[-31, 31, 0]], 'ld-woodhut': [[-58, 58, 0]], 'ld-stump': [[-60, 56, 14]], 'ld-statue': [[-26, 42, 10]], 'ld-moor-gate': [[-24, 52, 12]], 'ld-beacon': [[-24, 8, 12]] });
// soft things (a bench's seat) whose drawing is wider than the usual half their width: [w, d] in cells
const GW_SOFT_BLOCK = Object.freeze({ 'ld-bench-a': [1.2, .3], 'ld-bench-b': [1.5, .62], 'ld-cross': [.9, .32] });   // (vale final fix 1: the shore bench's drawn ends and the market cross's bottom step, measured by the collision audit)
function gardenPropPaintedFeet(p) {
  if (!p || typeof GardenPaintedMarks === 'undefined' || !GardenPaintedMarks || !GardenPaintedMarks.ART || GARDEN_WORLD.v < 5) return null;
  const art = GardenPaintedMarks.ART[p.id] && GardenPaintedMarks.ART[p.id].foot ? GardenPaintedMarks.ART[p.id] : GW_PROP_FEET[p.id] ? { foot: GW_PROP_FEET[p.id] } : null; if (!art || !art.foot || gardenPropCol(p) !== 'full') return null;
  if (!(typeof GardenNativePainted !== 'undefined' && GardenNativePainted && GardenNativePainted.wanted && GardenNativePainted.wanted())) return null;
  if (p.needs && !gardenWorkOwned(p.needs)) return null;
  if (typeof gardenBuildLookOf === 'function' && Object.values(gardenBuildLookOf(p.id) || {}).some(Boolean)) return null;   // (a look of your own choosing is drawn by another painter)
  const W = GARDEN_WORLD, cx = p.x + (p.w || 1) / 2, foot = p.y + (p.h || 1);
  return art.foot.map(([l, r, d]) => ({ x0: cx + l / W.cellW, y0: d ? foot - d / W.cellH : p.y, x1: cx + r / W.cellW, y1: foot - .02 }));
}
/** The village's shut fields as outlines (94-garden-paint-vale-1village.js fieldForms: the line each field's ground is drawn to),
 *  with the cells under each: a shut field stops the feet at its painted hedge, long grass or reeds, not at its square cells. */
function _gwFieldForms() {
  // (in a friend's garden their fields are shut by their level, not yours: whole cells, as before)
  if (typeof gardenVisitOn === 'function' && gardenVisitOn()) return [];
  const list = typeof GardenPaintVale !== 'undefined' && GardenPaintVale && GardenPaintVale.fieldForms ? GardenPaintVale.fieldForms() : [];
  if (_gw.fieldFormsOf === list) return _gw.fieldForms;
  const out = list.map(f => ({ form: _gwForm(f.poly, f.src), cells: f.cells }));
  _gw.fieldFormsOf = list; _gw.fieldForms = out; return out;
}
/** Is a landform cell solid only because of its landform (so the outline, not the cell, stops the feet)? */
function _gwLandformCell(x, y) { const c = typeof gardenIslandBaseCell === 'function' ? gardenIslandBaseCell(x, y) : null; return !!(c && c.solid && c.landformId && GARDEN_WORLD.v >= 5); }
function _gwInPoly(x, y, pts) { let on = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) on = !on; } return on; }
/** Does the segment e = [ax, ay, bx, by] touch the box x0..x1, y0..y1? */
function _gwSegHitsBox(e, x0, y0, x1, y1) {
  const ax = e[0], ay = e[1], bx = e[2], by = e[3];
  if (Math.max(ax, bx) < x0 || Math.min(ax, bx) > x1 || Math.max(ay, by) < y0 || Math.min(ay, by) > y1) return false;
  if (ax >= x0 && ax <= x1 && ay >= y0 && ay <= y1 || bx >= x0 && bx <= x1 && by >= y0 && by <= y1) return true;
  const cross = (px, py, qx, qy) => { const d = (bx - ax) * (qy - py) - (by - ay) * (qx - px); if (!d) return false; const t = ((px - ax) * (qy - py) - (py - ay) * (qx - px)) / d, u = ((px - ax) * (by - ay) - (py - ay) * (bx - ax)) / d; return t >= 0 && t <= 1 && u >= 0 && u <= 1; };
  return cross(x0, y0, x1, y0) || cross(x1, y0, x1, y1) || cross(x1, y1, x0, y1) || cross(x0, y1, x0, y0);
}
/** Do feet (the box x0..x1, y0..y1) touch a landform: a cell wholly inside, an edge crossing the feet, or the feet inside? */
function _gwFormHitsBox(f, x0, y0, x1, y1) {
  let edgy = false;
  for (let cy = Math.floor(y0); cy <= Math.floor(y1); cy++) for (let cx = Math.floor(x0); cx <= Math.floor(x1); cx++) {
    const c = f.cells.get(cx + ',' + cy); if (!c) continue; if (c === 1) return true; edgy = true;
    for (const e of c) if (_gwSegHitsBox(e, x0, y0, x1, y1)) return true;
  }
  return edgy && _gwInPoly((x0 + x1) / 2, (y0 + y1) / 2, f.poly);
}
/** Do feet (half width fx, half depth fy, in cells) at x, y touch one of the boxes (or a landform's outline)? */
function _gwSolidHit(x, y, fx, fy) {
  const S = _gw.solids; if (!S || !S.list.length) return false;
  for (let cy = Math.floor(y - fy); cy <= Math.floor(y + fy); cy++) for (let cx = Math.floor(x - fx); cx <= Math.floor(x + fx); cx++) {
    const rs = S.at.get(cx + ',' + cy); if (!rs) continue;
    for (const r of rs) if (x + fx > r.x0 && x - fx < r.x1 && y + fy > r.y0 && y - fy < r.y1 && (!r.form || _gwFormHitsBox(r.form, x - fx, y - fy, x + fx, y + fy))) return true;
  }
  return false;
}
/** Does a plot you have not bought yet let the feet through? It stops them where the painted garden draws its edge: a
 *  fence, wall or hedge ring in open country (94-garden-paint-vale-1valley.js), a knot of bramble and holly on every cell
 *  in the old woodland. In the light woods (Whispering woodland) the same land is drawn as more birch and bracken with no
 *  edge at all, so squares of open-looking wood stopped the feet for no reason you could see (the owner, 18 Nov 2026:
 *  collisions "so many random"; the audit: every one of those plots an invisible wall). There it is walked through like
 *  the wood round it: its small birches keep their trunk boxes (GardenPaintWood.trunks), and buying, planting and
 *  placing still ask whose land it is (gardenAreaAt), not whether the feet can stand on it. */
function gardenLockedPlotOpenToFeet(x, y, id) {
  if (!/^l[sc]-/.test(id) || GARDEN_WORLD.v < 5) return false;
  const wood = typeof GardenPaintWood !== 'undefined' && GardenPaintWood && GardenPaintWood.WOODS, painted = typeof GardenNativePainted !== 'undefined' && GardenNativePainted && GardenNativePainted.wanted && GardenNativePainted.wanted();
  if (!wood || !painted || typeof gardenIslandRegionAt !== 'function') return false;
  const region = gardenIslandRegionAt(x + .5, y + .5), def = region && wood[region.id];
  if (!def || def.mood === 'meadow') return false;
  if (def.mood === 'light') return true;
  // The old woodland: a knot on every cell of unbought land, except where its painter draws none (a pool site is bare
  // leaf litter until it is bought: two squares of open ground by the pond stopped the feet). Open where no knot is drawn.
  const knots = GardenPaintWood.thicketCells ? GardenPaintWood.thicketCells() : null;
  return !!knots && !knots.has(y * GARDEN_WORLD.cols + x);
}
function _gwBuildGrid(m) {
  const W = GARDEN_WORLD, g = new Uint8Array(W.cols * W.rows), otherWater = new Uint8Array(g.length), waterCover = new Uint8Array(g.length), shore = typeof gardenLakeGeometry === 'function' ? gardenLakeGeometry(m) : null;
  const lvl = m.level.level;
  // a shut village field stops the feet along its painted outline (_gwBuildSolids); its cells only steer the routes round it
  const fieldOf = new Map(); for (const ff of _gwFieldForms()) for (const c of ff.cells) { const i = c[1] * W.cols + c[0]; (fieldOf.get(i) || fieldOf.set(i, []).get(i)).push(ff.form); }
  const fieldShut = [];
  for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
    let blocked = false;
    const a = gardenAreaAt(x, y, lvl);
    if (a.startsWith('locked:zn-')) blocked = true;   // (vale final, east: land past a shut gate stops the feet at its cells, where its hedge is painted, even under a field's outline; 2 cells of the shut valley were walkable)
    else if (a.startsWith('locked:') && fieldOf.has(y * W.cols + x)) fieldShut.push(y * W.cols + x);
    else if (a.startsWith('locked:') && !(a === 'locked:' + GARDEN_LAND_THICKET.id && _gwLandformCell(x, y)) && !gardenLockedPlotOpenToFeet(x, y, a.slice(7))) blocked = true;   // behind the little fence (a landform stops the feet along its outline: _gwBuildSolids)
    const pr = gardenPropAt(x, y), pc = pr ? gardenPropCol(pr) : '';
    if (pc === 'full') blocked = true;                                // (a shop is a wall; a lectern is a box, the mooring post, the reeds and the boat nothing: _gwBuildSolids)
    const water = (!pr || pc === 'none' && !pr.walk) && gardenIsWater(x, y);
    if (water && !(shore && shore.cellContains(x, y))) otherWater[y * W.cols + x] = 1;
    const land = typeof gardenLandWaterAt === 'function' ? gardenLandWaterAt(x, y) : null;
    if (gardenPropWalk(x, y) || shore && shore.cellContains(x, y) && land === false) waterCover[y * W.cols + x] = 1;
    const c = m.occ.get(x + ',' + y);
    if (c && c.decor) { const d = gardenDecorById(m, c.decor); if (!d || gardenDecorCol(d.def) === 'full') blocked = true; }   // (a seat is full: you walk up to it to sit)
    // (a tree's trunk and a small decoration are boxes, not cells: _gwBuildSolids)
    g[y * W.cols + x] = blocked ? 1 : 0;
  }
  g.hard = g.slice();
  // (a painted fence, hedge or wall panel: the feet stop at the panel as drawn, _gwBuildSolids; its cell stays shut to the routes' planner)
  for (const dc of m.decor) { if (!gardenFenceBand(dc)) continue; const i = dc.y * W.cols + dc.x; if (dc.x >= 0 && dc.y >= 0 && dc.x < W.cols && dc.y < W.rows && !gardenAreaAt(dc.x, dc.y, lvl).startsWith('locked:') && !(gardenPropAt(dc.x, dc.y) && gardenPropCol(gardenPropAt(dc.x, dc.y)) === 'full')) g.hard[i] = 0; }
  // (a sight whose painting names its base: the feet stop at that base, _gwBuildSolids; its cells stay shut to the routes' planner)
  for (const p of gardenPropsNow()) { if (!gardenPropPaintedFeet(p)) continue; for (let y = p.y; y < p.y + (p.h || 1); y++) for (let x = p.x; x < p.x + (p.w || 1); x++) { if (x < 0 || y < 0 || x >= W.cols || y >= W.rows) continue; const a2 = gardenAreaAt(x, y, lvl), c2 = m.occ.get(x + ',' + y); if (!a2.startsWith('locked:') && !(c2 && c2.decor)) g.hard[y * W.cols + x] = 0; } }
  // (routes keep out of a field cell whose middle lies inside the painted line; the feet are stopped by the line itself)
  g.fieldSteer = new Set();
  for (const i of fieldShut) if (!g[i]) { const x = i % W.cols, y = (i - x) / W.cols; if (fieldOf.get(i).some(f => _gwInPoly(x + .5, y + .5, f.poly))) { g[i] = 1; g.fieldSteer.add(i); } }
  g.otherWater = otherWater; g.waterCover = waterCover; g.shore = shore; g.otherShapes = typeof gardenOtherWaterShapes === 'function' ? gardenOtherWaterShapes(m) : null; g.model = m; g.anchors = new Map(); g.probe = {}; g.contact = {};
  g.otherBuckets = new Map(); g.noShapes = [];
  if (g.otherShapes) for (const shape of g.otherShapes) { const b = shape.bounds; if (!b) continue; for (let y = Math.max(0, Math.floor(b.y - 1)); y <= Math.min(W.rows - 1, Math.ceil(b.y + b.height + 1)); y++) for (let x = Math.max(0, Math.floor(b.x - 1)); x <= Math.min(W.cols - 1, Math.ceil(b.x + b.width + 1)); x++) { const index = y * W.cols + x; let list = g.otherBuckets.get(index); if (!list) { list = []; g.otherBuckets.set(index, list); } list.push(shape); } }
  return g;
}
function _gwRouteSetSame(a, b) { if (!a || a.size !== b.size) return false; for (const value of b) if (!a.has(value)) return false; return true; }
function _gwRouteState() {
  const old = _gw.routeState, way = typeof _wdi !== 'undefined' && !!_wdi.open, decks = gardenPierDeckSignature();
  const land = old && _gwRouteSetSame(old.land, _GD_LAND), works = old && _gwRouteSetSame(old.works, _GD_WORKS), walk = old && _gwRouteSetSame(old.walk, _GD_WALK_EXTRA), ice = old && _gwRouteSetSame(old.ice, _GD_ICE);
  if (old && land && works && walk && ice && old.way === way && old.decks === decks) return old;
  return _gw.routeState = { land: land ? old.land : new Set(_GD_LAND), works: works ? old.works : new Set(_GD_WORKS), walk: walk ? old.walk : new Set(_GD_WALK_EXTRA), ice: ice ? old.ice : new Set(_GD_ICE), way, decks };
}
function _gwRouteArraySame(a, b) { if (a === b) return true; if (!a || !b || a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }
function _gwRoutePointsSame(a, b) { if (a === b) return true; if (!a || !b || a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i].x !== b[i].x || a[i].y !== b[i].y) return false; return true; }
function _gwRouteShapeSame(a, b) {
  if (a === b) return true;
  if (!a || !b || !_gwRoutePointsSame(a.points, b.points)) return false;
  const ah = a.holes || [], bh = b.holes || []; if (ah.length !== bh.length) return false;
  for (let i = 0; i < ah.length; i++) if (!_gwRoutePointsSame(ah[i], bh[i])) return false;
  return true;
}
function _gwRoutePhysicalSame(saved, grid, solids, state) {
  if (!saved || saved.state.walk !== state.walk || saved.state.ice !== state.ice || saved.state.way !== state.way) return false;
  const old = saved.grid;
  if (!_gwRouteArraySame(old.hard, grid.hard) || !_gwRouteArraySame(old.otherWater, grid.otherWater) || !_gwRouteArraySame(old.waterCover, grid.waterCover) || !_gwRouteShapeSame(old.shore, grid.shore)) return false;
  const a = old.otherShapes, b = grid.otherShapes;
  if (a !== b) { if (!a || !b || a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (!_gwRouteShapeSame(a[i], b[i])) return false; }
  const aa = saved.solids.list, bb = solids.list; if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i++) if (aa[i].x0 !== bb[i].x0 || aa[i].y0 !== bb[i].y0 || aa[i].x1 !== bb[i].x1 || aa[i].y1 !== bb[i].y1) return false;
  return true;
}
function _gwRouteSourceInputs(m) {
  // The land/zone and regional-water tables are fixed. Their live switches
  // are in routeState and the canonical contours; the remaining mutable
  // inputs are prop footprints, trunk/soft boxes and full-decor occupancy.
  // Compare exact values, not a model revision or a lossy geometry hash.
  const values = [m.level.level, m.visit ? 'visit:' + m.visit.fid : 'home'];
  let start = values.length, count = 0; values.push(0);
  for (const p of m.plants) if (gardenPlantBlocks(p)) { values.push(p.x, p.y, p.fp || 1); count++; }
  values[start] = count; start = values.length; count = 0; values.push(0);
  const decorCols = new Map();
  for (const d of m.decor) {
    const def = d.def, col = gardenDecorCol(def); if (!decorCols.has(d.uid)) decorCols.set(d.uid, col);
    if (!def || def.layer === 'ground' || col !== 'soft') continue;
    values.push(d.x, d.y, def.w || 1, def.h || 1); count++;
  }
  values[start] = count;
  const props = gardenPropsNow(); values.push(GARDEN_PROPS.length, props.length);
  for (const p of props) values.push(p.x, p.y, p.w, p.h, gardenPropCol(p), !!p.walk, p.needs || '', !p.needs || gardenWorkOwned(p.needs));
  start = values.length; count = 0; values.push(0);
  // Read the actual occupancy used by _gwBuildGrid, including its unknown
  // decoration fallback and first-occupant semantics for overlapping rows.
  for (const [cell, occupant] of m.occ) if (occupant && occupant.decor && (decorCols.get(occupant.decor) || 'full') === 'full') { values.push(cell); count++; }
  values[start] = count;
  values.push(_gwTrunkSig());   // the painted trees' trunks (_gwPaintedTrunks)
  values.push(gardenWeirShutBox(m) ? 'weir-shut' : 'weir-open');
  values.push(typeof gardenOrchardShortcutSig === 'function' ? gardenOrchardShortcutSig() : '');   // the orchard's shortcuts, shut or open
  return values;
}
function _gwGrid(m, groundOnly) {
  if (_gw.boat && !groundOnly) return _gwContinuousBoatGrid(m);
  const mm = m || gardenHere(), shore = typeof gardenLakeGeometry === 'function' ? gardenLakeGeometry(mm) : null, otherShapes = typeof gardenOtherWaterShapes === 'function' ? gardenOtherWaterShapes(mm) : null, state = _gwRouteState();
  const key = (mm.visit ? mm.visit.key : _gd.memoKey) + '|' + mm.level.level + '|' + (typeof gardenDesignRev === 'function' ? gardenDesignRev() : 0) + '|' + (shore && shore.revision || 0) + '|' + gardenPierDeckSignature() + '|' + (_gwTrunkSig() || '') + '|' + (typeof gardenOrchardShortcutSig === 'function' ? gardenOrchardShortcutSig() : '');
  if (!_gw.grid || _gw.gridKey !== key || _gw.grid.model !== mm || _gw.grid.routeState !== state || _gw.grid.otherShapes !== otherShapes) {
    const saved = _gw.routeSnapshot, inputs = _gwRouteSourceInputs(mm);
    const stats = _gw.routeGridStats || (_gw.routeGridStats = { coarseBuilds: 0, preparations: 0, reused: 0, boatPreparations: 0, preflightChecks: 0, preflightReused: 0 }); stats.preflightChecks++;
    if (saved && saved.state === state && saved.grid.shore === shore && saved.grid.otherShapes === otherShapes && _gwRouteArraySame(saved.inputs, inputs)) {
      _gw.grid = saved.grid; _gw.solids = saved.solids; _gw.grid.model = mm; _gw.gridKey = key; stats.preflightReused++; stats.reused++;
      return _gw.grid;
    }
    const grid = _gwBuildGrid(mm), solids = _gwBuildSolids(mm); stats.coarseBuilds++;
    // Model clocks, watering and Design paint invalidate presentation too. Keep
    // the prepared shoreline anchors when every physical input is unchanged,
    // even if a scene sync cleared the active grid and its soft-box index.
    if (_gwRoutePhysicalSame(saved, grid, solids, state)) {
      _gw.grid = saved.grid; _gw.solids = saved.solids;
      Object.assign(_gw.grid, { model: mm, shore: grid.shore, otherShapes: grid.otherShapes, otherBuckets: grid.otherBuckets });
      saved.state = state; saved.inputs = inputs; stats.reused++;
    } else {
      _gw.grid = grid; _gw.solids = solids; grid.routeRevision = ++stats.preparations;
      _gwPrepareRouteGrid(grid); _gw.routeSnapshot = { grid, solids, state, inputs };
    }
    _gw.grid.routeState = state; _gw.gridKey = key;
  }
  _gw.grid.model = mm;
  return _gw.grid;
}
function gardenWorldRouteGridStatus() {
  const stats = _gw.routeGridStats || {};
  return { coarseBuilds: stats.coarseBuilds || 0, preparations: stats.preparations || 0, reused: stats.reused || 0, preflightChecks: stats.preflightChecks || 0, preflightReused: stats.preflightReused || 0, boatPreparations: stats.boatPreparations || 0, physicalRevision: _gw.grid && _gw.grid.routeRevision || 0, anchors: _gw.grid && _gw.grid.anchors ? _gw.grid.anchors.size : 0 };
}
function _gwContinuousBoatGrid(m) {
  const land = _gwGrid(m || gardenHere(), true), to = gardenLakeOpenTo(), key = land.routeRevision + '|boat:' + to;
  if (_gw.boatGrid && _gw.boatGridKey === key && _gw.boatGrid.landGrid === land) { _gw.boatGrid.model = land.model; return _gw.boatGrid; }
  const grid = new Uint8Array(land.length); Object.assign(grid, { hard: land.hard, otherWater: land.otherWater, waterCover: land.waterCover, shore: land.shore, otherShapes: land.otherShapes, otherBuckets: land.otherBuckets, noShapes: land.noShapes, landGrid: land, model: land.model, anchors: new Map(), probe: {}, contact: {}, liquid: true, waterTo: to });
  _gwPrepareRouteGrid(grid); _gw.routeGridStats.boatPreparations++; _gw.boatGrid = grid; _gw.boatGridKey = key; return grid;
}
function _gwHardFeet(grid, x, y, fx, fy) {
  const W = GARDEN_WORLD, x0 = Math.floor(x - fx), x1 = Math.floor(x + fx), y0 = Math.floor(y - fy), y1 = Math.floor(y + fy);
  if (x0 < 0 || y0 < 0 || x1 >= W.cols || y1 >= W.rows) return false;
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) if ((grid.hard || grid)[cy * W.cols + cx]) return false;
  return true;
}
function _gwGridFeet(grid, x, y, fx, fy) {
  if (!_gwHardFeet(grid, x, y, fx, fy)) return false;
  if (grid.liquid && y + fy >= grid.waterTo) return false;
  if (!grid.liquid && !grid.otherShapes && grid.otherWater) { const W = GARDEN_WORLD; for (let cy = Math.floor(y - fy); cy <= Math.floor(y + fy); cy++) for (let cx = Math.floor(x - fx); cx <= Math.floor(x + fx); cx++) if (grid.otherWater[cy * W.cols + cx]) return false; }
  if (grid.shore && !gardenShoreFootProbe(grid.shore, x, y, fx, fy, !!grid.liquid, grid.waterCover, grid.probe).free) return false;
  if (!grid.liquid && grid.otherShapes) for (const shape of _gwOtherShoreCandidates(grid, x, y, fx, fy)) if (!gardenShoreFootProbe(shape, x, y, fx, fy, false, grid.waterCover, grid.probe).free) return false;
  return true;
}
function _gwOtherShoreCandidates(grid, x, y, fx, fy) { return fx > 1 || fy > 1 || !grid.otherBuckets ? grid.otherShapes || grid.noShapes : grid.otherBuckets.get(Math.floor(y) * GARDEN_WORLD.cols + Math.floor(x)) || grid.noShapes; }
function _gwWaterProbe(grid, x, y, fx, fy) {
  const result = grid.contact; result.free = true; result.distance = Infinity; result.edge = null; result.nx = result.ny = 0; result.side = 1;
  const inspect = shape => { const p = gardenShoreFootProbe(shape, x, y, fx, fy, !!grid.liquid, grid.waterCover, grid.probe); if (!p.free) { result.free = false; if (p.distance < result.distance) { result.distance = p.distance; result.edge = p.edge; result.nx = p.nx; result.ny = p.ny; result.side = p.side; } } };
  if (grid.shore) inspect(grid.shore);
  if (!grid.liquid && grid.otherShapes) for (const shape of _gwOtherShoreCandidates(grid, x, y, fx, fy)) inspect(shape);
  return result;
}
function _gwPrepareRouteGrid(grid) {
  // Only cells touched by a continuous shoreline need extra edge clearance.
  // Two dry cell centres can still have a wet bank tip between them.
  const shoreCells = grid.shoreCells = new Uint8Array(grid.length);
  // Eight directed neighbour links per cell; reset with physical preparation.
  // Grid reuse already compares solid boxes, shores, cover and wonder state.
  grid.shoreEdgeClear = new Uint8Array(grid.length * 8);
  for (const shape of [grid.shore, ...(grid.otherShapes || [])]) if (shape) for (const key of gardenShorePrepared(shape).cells.keys()) {
    const [x, y] = key.split(',').map(Number);
    if (x >= 0 && y >= 0 && x < GARDEN_WORLD.cols && y < GARDEN_WORLD.rows) shoreCells[y * GARDEN_WORLD.cols + x] = 1;
  }
  // So do cells a solid box or outline touches: a ruin wall drawn thin on its line, a sheepfold ring, a trunk or a
  // boulder can stand between two open cell centres, and the link between them went straight through it. Walking
  // to the driftwood arch, click-to-walk planned through ruin-wall-6 and stood at it (the collision audit, 19 Nov 2026).
  if (!grid.liquid && _gw.solids && _gw.solids.at) for (const key of _gw.solids.at.keys()) {
    const [x, y] = key.split(',').map(Number);
    if (x >= 0 && y >= 0 && x < GARDEN_WORLD.cols && y < GARDEN_WORLD.rows) shoreCells[y * GARDEN_WORLD.cols + x] = 1;
  }
  const W = GARDEN_WORLD, candidate = (x, y) => _gwGridFeet(grid, x, y, GW_FOOT.x, GW_FOOT.y) && !_gwSolidHit(x, y, GW_FOOT.x, GW_FOOT.y) && (grid.liquid || gardenWonderWalkFine(x, y, GW_FOOT.y));
  const offsets = [.5, .25, .75, .08, .92];
  for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
    const index = y * W.cols + x; grid[index] = 1;
    if (grid.hard[index] || !grid.liquid && !grid.otherShapes && grid.otherWater[index]) continue;
    if (candidate(x + .5, y + .5)) { grid[index] = 0; continue; }
    // Curved banks can leave usable dry ground in a centre-water cell. Keep a
    // real free anchor there rather than sending routes through a wet centre.
    const near = shape => { const b = shape.bounds; return b && x + 1 >= b.x && x <= b.x + b.width && y + 1 >= b.y && y <= b.y + b.height; };
    if (!(grid.shore && near(grid.shore)) && !(grid.otherShapes && _gwOtherShoreCandidates(grid, x + .5, y + .5, .5, .5).some(near))) { if (!grid.liquid) grid[index] = 0; continue; }
    search: for (const dy of offsets) for (const dx of offsets) if (candidate(x + dx, y + dy)) { grid[index] = 0; grid.anchors.set(index, { x: x + dx, y: y + dy }); break search; }
  }
  if (!grid.liquid && typeof gardenIslandCrossingGeometry === 'function') for (const crossing of gardenIslandCrossingGeometry()) {
    if (crossing.kind === 'hump-bridge') continue;
    // A narrow diagonal deck can pass between every coarse offset above, or
    // share a cell with a disconnected bank. Give each traversed cell a point
    // on the same centreline as the visible slabs/boards. Splitting at exact
    // cell boundaries keeps the anchors connected even at a short corner cut.
    const a = { x: crossing.a.x / W.cellW, y: (crossing.a.y - W.sky) / W.cellH }, b = { x: crossing.b.x / W.cellW, y: (crossing.b.y - W.sky) / W.cellH }, dx = b.x - a.x, dy = b.y - a.y, cuts = [0, 1];
    for (const [start, end] of [[a.x, b.x], [a.y, b.y]]) {
      if (Math.abs(end - start) < 1e-10) continue;
      for (let v = Math.floor(Math.min(start, end)) + 1; v < Math.max(start, end); v++) cuts.push((v - start) / (end - start));
    }
    cuts.sort((a, b) => a - b);
    for (let i = 1; i < cuts.length; i++) {
      if (cuts[i] - cuts[i - 1] < 1e-8) continue;
      const t = (cuts[i - 1] + cuts[i]) / 2, x = a.x + dx * t, y = a.y + dy * t, cx = Math.floor(x), cy = Math.floor(y);
      if (cx < 0 || cy < 0 || cx >= W.cols || cy >= W.rows || !candidate(x, y)) continue;
      const index = cy * W.cols + cx; grid[index] = 0; grid.anchors.set(index, { x, y });
    }
  }
}
function _gwCellPoint(cell, grid) { grid = grid || _gwGridNow(); return grid.anchors && grid.anchors.get(cell.y * GARDEN_WORLD.cols + cell.x) || { x: cell.x + .5, y: cell.y + .5 }; }
/** Neighbour links near banks use the same feet as the eventual walk. */
function _gwRouteEdgeClear(a, b, grid, forceFine) {
  const W = GARDEN_WORLD, anchors = grid.anchors;
  let fine = forceFine || anchors && (anchors.has(a.y * W.cols + a.x) || anchors.has(b.y * W.cols + b.x));
  if (!fine && grid.shoreCells) for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y) && !fine; y++) for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) if (grid.shoreCells[y * W.cols + x]) { fine = true; break; }
  if (!fine) return true;
  const dx = b.x - a.x, dy = b.y - a.y, adjacent = Number.isInteger(dx) && Number.isInteger(dy) && Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx || dy), slot = (dy + 1) * 3 + dx + 1;
  const memo = adjacent && grid.shoreEdgeClear, key = (a.y * W.cols + a.x) * 8 + slot - (slot > 4 ? 1 : 0);
  if (memo && memo[key]) return memo[key] === 1;
  const from = _gwCellPoint(a, grid), to = _gwCellPoint(b, grid), n = Math.max(1, Math.ceil(Math.hypot((to.x - from.x) * W.cellW, (to.y - from.y) * W.cellH) / 3));
  for (let i = 1; i <= n; i++) {
    const t = i / n, x = from.x + (to.x - from.x) * t, y = from.y + (to.y - from.y) * t;
    if (!_gwGridFeet(grid, x, y, GW_FOOT.x, GW_FOOT.y) || _gwSolidHit(x, y, GW_FOOT.x, GW_FOOT.y) || !grid.liquid && !gardenWonderWalkFine(x, y, GW_FOOT.y)) { if (memo) memo[key] = 2; return false; }
  }
  if (memo) memo[key] = 1;
  return true;
}
/** The grid, without working out the garden for every point tested (a walk tests hundreds a frame; this was a tenth of a core): the same one until the garden saves, the designer moves something, or a moment has passed. */
function _gwGridNow(groundOnly) {
  // A walk, a route and every creature share the same collision snapshot for a
  // simulation step. Checking the clock and rebuilding its revision string for
  // every corner of every foot made route sampling needlessly expensive.
  if (_gw.boat && !groundOnly) return _gwContinuousBoatGrid(null);
  if (_gw.frameActive && _gw.frameGrid && _gw.frameGrid === _gw.grid && _gw.frameRev === _gd.rev && _gw.frameWorks === _GD_WORKS_REV) return _gw.frameGrid;
  // Read the resident revision here; do not derive the shoreline for every
  // corner sampled by a route. _gwGrid resolves it when this memo expires.
  const shoreRev = typeof _gardenLakeShape !== 'undefined' && _gardenLakeShape.value ? _gardenLakeShape.value.revision : 0;
  const t = performance.now(), rev = _gd.rev + '|' + _gdv.on + '|' + (typeof gardenDesignRev === 'function' ? gardenDesignRev() : 0) + '|' + shoreRev + '|' + _GD_WALK_EXTRA.size + '|' + _GD_ICE.size + '|' + gardenPierDeckSignature();
  if (_gw.gq && _gw.gq === _gw.grid && _gw.gqRev === rev && t - _gw.gqAt < 250) {
    if (_gw.frameActive) { _gw.frameGrid = _gw.gq; _gw.frameRev = _gd.rev; _gw.frameWorks = _GD_WORKS_REV; }
    return _gw.gq;
  }
  _gw.gq = _gwGrid(gardenHere(), true); _gw.gqRev = rev; _gw.gqAt = t;
  if (_gw.frameActive) { _gw.frameGrid = _gw.gq; _gw.frameRev = _gd.rev; _gw.frameWorks = _GD_WORKS_REV; }
  return _gw.gq;
}
/** Four corners use one map lookup, including when a route probes hundreds of points. */
function _gwFootCells(x, y, fx, fy, groundOnly) { return _gwGridFeet(_gwGridNow(groundOnly), x, y, fx, fy); }
function gardenWalkable(x, y) {
  const W = GARDEN_WORLD;
  if (x < 0 || y < 0 || x >= W.cols || y >= W.rows) return false;
  return !_gwGridNow(true)[y * W.cols + x];
}
/** Every cell you can get to from where you stand (a flood over the same grid the routes use), so the cursor can tell you before you click. */
function _gwReach() {
  const W = GARDEN_WORLD, C = W.cols, R = W.rows, grid = _gwGrid(gardenHere());
  const sx = Math.max(0, Math.min(C - 1, Math.floor(_gw.px))), sy = Math.max(0, Math.min(R - 1, Math.floor(_gw.py)));
  if (_gw.reach && _gw.reachGrid === grid && _gw.reach[sy * C + sx]) return _gw.reach;
  const seen = new Uint8Array(C * R), stack = [sy * C + sx];
  seen[stack[0]] = 1;
  while (stack.length) {
    const i = stack.pop(), x = i % C, y = (i - x) / C;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= C || ny >= R) continue;
      const j = ny * C + nx; if (seen[j] || grid[j]) continue;
      if (!_gwRouteEdgeClear({ x, y }, { x: nx, y: ny }, grid)) continue;
      seen[j] = 1; stack.push(j);
    }
  }
  _gw.reach = seen; _gw.reachGrid = grid;
  return seen;
}
function gardenReachable(x, y) {
  const W = GARDEN_WORLD; if (x < 0 || y < 0 || x >= W.cols || y >= W.rows) return false;
  return !!_gwReach()[y * W.cols + x];
}
/** Can (x, y) be walked to from the layout's arrival point (anchors.start), over the land open now? Unlike gardenReachable this never
 *  depends on where the player happens to be (in a boat, on a pier): what a layout offers is the same whoever stands where. */
function gardenReachableFromArrival(x, y) {
  const W = GARDEN_WORLD, C = W.cols, R = W.rows; if (x < 0 || y < 0 || x >= C || y >= R) return false;
  const grid = _gwGrid(gardenHere());
  if (!_gw.reachA || _gw.reachAGrid !== grid) {
    let D = null; try { D = gardenIslandData(); } catch (e) { D = null; }
    const st = (D && D.anchors && D.anchors.start) || W.start || { x: C / 2, y: R / 2 };
    let s0 = -1; for (let r = 0; r <= 6 && s0 < 0; r++) for (let dy = -r; dy <= r && s0 < 0; dy++) for (let dx = -r; dx <= r; dx++) { const cx = Math.floor(st.x) + dx, cy = Math.floor(st.y) + dy; if (cx >= 0 && cy >= 0 && cx < C && cy < R && !grid[cy * C + cx]) { s0 = cy * C + cx; break; } }
    const seen = new Uint8Array(C * R);
    if (s0 >= 0) { const stack = [s0]; seen[s0] = 1; while (stack.length) { const i = stack.pop(), qx = i % C, qy = (i - qx) / C; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= C || ny >= R) continue; const j = ny * C + nx; if (seen[j] || grid[j]) continue; if (!_gwRouteEdgeClear({ x: qx, y: qy }, { x: nx, y: ny }, grid)) continue; seen[j] = 1; stack.push(j); } } }
    _gw.reachA = seen; _gw.reachAGrid = grid;
  }
  return !!_gw.reachA[y * C + x];
}
function _gwNearestFree(x, y, maxR) {
  // the nearest walkable cell to (x, y), by rings (the click was on a plant, a bench, the water...)
  const W = GARDEN_WORLD, grid = _gwGridNow(); let best = null, bd = 1e9;
  for (let r = 0; r <= (maxR || 8); r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const cx = x + dx, cy = y + dy;
      if (cx < 0 || cy < 0 || cx >= W.cols || cy >= W.rows || grid[cy * W.cols + cx]) continue;
      const d = Math.hypot(dx * W.cellW, dy * W.cellH) + (cy < y ? 6 : 0);   // a little prefer the near side
      if (d < bd) { bd = d; best = { x: cx, y: cy }; }
    }
    if (best) return best;
  }
  return best;
}

/* ---------- free movement: feet are a small oval, not a cell ---------- */
// half the width and depth of your feet, in cells: sized for the figure drawn at 0.8 of its old height (common rule 14,
// the ART-SHARED change), about 1.3 times the width of the shoes as before. At 0.2 x 0.12 the oval would have been 1.7
// times the smaller shoes and you would have stopped short of a wall, a trunk or a fence (the verifier, 19 Nov 2026).
const GW_FOOT = Object.freeze({ x: 0.16, y: 0.1 });
const GW_ACC = 1100;                                  // pixels a second, a second: how quickly you get going and stop
const GW_CLEAR = 0.07;                                // planning keeps this much (cells) of room round corners, so a route never scrapes one
/** Can the feet be here? Only the cells the oval touches count, so you can stand tight against a bench and slip past a plant. `m` fattens the feet (route planning). */
function _gwFree(x, y, m) {
  const fx = GW_FOOT.x + (m || 0), fy = GW_FOOT.y + (m || 0);
  return _gwFootCells(x, y, fx, fy)
    && !_gwSolidHit(x, y, fx, fy) && gardenWonderWalkFine(x, y, fy, m);   // (over the lake: the island's shape and the line of stones, not whole cells)
}
/** Can the feet go in a straight line from a to b? (`m`: with that much room to spare.) Sampled finer than a corner can hide in. */
function _gwLos(a, b, m) {
  const W = GARDEN_WORLD, n = Math.max(1, Math.ceil(Math.hypot((b.x - a.x) * W.cellW, (b.y - a.y) * W.cellH) / 3));
  for (let i = 1; i <= n; i++) { const t = i / n; if (!_gwFree(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, m)) return false; }
  return true;
}
/**
 * Move the feet by (dx, dy) cells without ever stopping dead on something: the whole step if it is open, else each axis on its own
 * (slide along the wall), else step sideways a few pixels round the corner that caught the feet. Returns whether they moved.
 */
function _gwMoveBy(dx, dy) {
  // (vf-perf, east coast) A diagonal press into a bent edge could find a way on both ways along it, one each frame: across and
  // down a few px, then up and back, then across again (the collision audit's slide-jitter by the east coast water). The feet
  // never turn back on themselves while the same press is held: a step that would undo the last one's way goes on the same way
  // as the last one instead (the same give again), or stops.
  const W = GARDEN_WORLD, x0 = _gw.px, y0 = _gw.py, sx = Math.sign(dx), sy = Math.sign(dy), L = _gw.slideLast;
  const moved = _gwMoveBy0(dx, dy), mx = (_gw.px - x0) * W.cellW, my = (_gw.py - y0) * W.cellH;
  if (!(dx && dy)) { _gw.slideLast = null; return moved; }
  const back = (ax, bx) => ax * bx < 0 && Math.abs(ax) > .5 && Math.abs(bx) > .5;
  if (L && L.sx === sx && L.sy === sy && L.x === x0 && L.y === y0 && (back(mx, L.mx) || back(my, L.my))) {   // (only straight on from the last step: never after a jump)
    _gw.px = x0; _gw.py = y0;
    const vx = dx * W.cellW, vy = dy * W.cellH, open3 = (ax, ay) => _gwFree(x0 + ax / W.cellW, y0 + ay / W.cellH) && _gwFree(x0 + 2 * ax / W.cellW, y0 + 2 * ay / W.cellH) && _gwFree(x0 + 3 * ax / W.cellW, y0 + 3 * ay / W.cellH);
    let g = L.kind ? _gwGiveSlide(x0, y0, dx, dy, L.kind) : null;
    if (g && (back((g.x - x0) * W.cellW, L.mx) || back((g.y - y0) * W.cellH, L.my))) g = null;
    if (!g && L.kind === 'y') for (let q = .5; q <= 3.5 && !g; q += .5) if (open3(vx, -sy * q)) g = { x: x0 + vx / W.cellW, y: y0 - sy * q / W.cellH, kind: 'y' };
    if (!g && L.kind === 'x') for (let q = .25; q <= .75 && !g; q += .25) if (open3(-sx * q, vy)) g = { x: x0 - sx * q / W.cellW, y: y0 + vy / W.cellH, kind: 'x' };
    if (!g) { _gw.slideHold = L.kind ? { sx, sy, kind: L.kind } : null; L.x = x0; L.y = y0; return false; }
    _gw.px = g.x; _gw.py = g.y; _gw.slideHold = { sx, sy, kind: g.kind };
    _gw.slideLast = { sx, sy, mx: (g.x - x0) * W.cellW, my: (g.y - y0) * W.cellH, kind: g.kind, x: g.x, y: g.y }; return true;
  }
  _gw.slideLast = Math.hypot(mx, my) > .2 ? { sx, sy, mx, my, kind: _gw.slideHold ? _gw.slideHold.kind : '', x: _gw.px, y: _gw.py } : L && L.sx === sx && L.sy === sy && L.x === x0 && L.y === y0 ? L : null;
  return moved;
}
function _gwMoveBy0(dx, dy) {
  const W = GARDEN_WORLD, x0 = _gw.px, y0 = _gw.py;
  const shore = _gwShoreSlide(x0, y0, dx, dy, GW_FOOT.x, GW_FOOT.y, _gwFree, _gwGridNow(), _gw.shoreMove || (_gw.shoreMove = {}));
  // how far a candidate gets the way you are pressing, as a share of the step
  const len2 = (dx * W.cellW) ** 2 + (dy * W.cellH) ** 2, gain = (px, py) => len2 ? ((px - x0) * W.cellW * dx * W.cellW + (py - y0) * W.cellH * dy * W.cellH) / len2 : 0;
  // the bank's own slide, unless it all but stops a diagonal press dead (a corner of the gorge bank or the Mere shore): then the
  // wall slide below gets its turn, and whichever goes further the way you are pressing wins (17 Nov 2026)
  if (shore.shore && (gain(shore.x, shore.y) >= .3 || !(dx && dy))) { _gw.px = shore.x; _gw.py = shore.y; _gw.slideHold = null; return shore.moved; }
  let x = x0, y = y0, held = '';
  const hold = _gw.slideHold;   // the give of the frame before, if any (_gwGiveSlide)
  if (_gwFree(x0 + dx, y0 + dy)) { x += dx; y += dy; }
  else {
    if (dx && _gwFree(x0 + dx, y0)) x = x0 + dx;
    if (dy && _gwFree(x, y0 + dy)) y = y0 + dy;
    if (x === x0 && y === y0) {
      const horiz = Math.abs(dx * W.cellW) >= Math.abs(dy * W.cellH), stepPx = Math.hypot(dx * W.cellW, dy * W.cellH);
      const unit = horiz ? 1 / W.cellH : 1 / W.cellW;   // one pixel across the way we are going, in cells
      // the smallest sideways offset (2 .. 24 px: far enough to round a small box head-on) that lets the step go on; walk toward it a step at a time, so it never jitters
      search: for (let k = 1; k <= 12; k++) for (const s of [1, -1]) {
        if (dx && dy && s !== Math.sign(horiz ? dy : dx)) continue;   // a diagonal press rounds a corner only the way it presses: stepping back the other way made you jitter on the spot
        const full = s * k * 2 * unit, part = s * Math.min(k * 2, Math.max(1, stepPx)) * unit, whole = Math.abs(part) >= Math.abs(full) - 1e-9;
        const ax = horiz ? x0 + dx : x0 + full, ay = horiz ? y0 + full : y0 + dy;   // sideways by the whole offset and on
        if (!_gwFree(ax, ay)) continue;
        const bx = horiz ? (whole ? ax : x0) : x0 + part, by = horiz ? y0 + part : (whole ? ay : y0);
        if (_gwFree(bx, by)) { x = bx; y = by; break search; }
      }
      // A diagonal press caught on the corner of a box, a slanted wall or a kink in a bank: neither axis is open on
      // its own, so you stopped dead where you plainly could slide on (the five corner stalls left on 17 Nov 2026,
      // and every ruin and terrace wall that runs at a slant). Give way a little against one part of the press and go
      // on along the other, at walking pace (_gwGiveSlide). A true inside corner, and a wall you press square into,
      // still stop you.
      if (x === x0 && y === y0 && dx && dy) {
        const g = hold && hold.sx === Math.sign(dx) && hold.sy === Math.sign(dy) && _gwGiveSlide(x0, y0, dx, dy, hold.kind) || _gwGiveSlide(x0, y0, dx, dy);   // (the kind it took the frame before, while that lasts)
        // Where the bank's own slide has just said this is a closed corner of the shore, only a way that really
        // leads on (the same step open twice more): any other only shuffled the feet about for a few frames before
        // they stopped anyway.
        if (g && (!(shore.shore && shore.blockedCorner) || _gwFree(2 * g.x - x0, 2 * g.y - y0) && _gwFree(3 * g.x - 2 * x0, 3 * g.y - 2 * y0))) { x = g.x; y = g.y; held = g.kind; }
      }
    }
    // (right after giving way, the part of the press you gave against does not pull the feet straight back into the
    // edge while the other part is still shut: that made you shake for a frame or two at the end of a slanted wall)
    else if (hold && hold.sx === Math.sign(dx) && hold.sy === Math.sign(dy) && (hold.kind === 'x' ? x !== x0 && y === y0 : x === x0 && y !== y0)) {
      const g = _gwGiveSlide(x0, y0, dx, dy, hold.kind); if (g) { x = g.x; y = g.y; held = g.kind; }
    }
  }
  _gw.slideHold = held ? { sx: Math.sign(dx), sy: Math.sign(dy), kind: held } : null;
  // (while the feet are giving way round a kink in a bank, the bank's own slide does not win a frame with a step back
  // the way they are getting on: it and the give took turns for four frames, a 2 px shake at one kink of the Millwater's
  // bank by the estuary, the last jitter the collision audit found, 18 Nov 2026)
  const backOnGive = held && (held === 'x' ? (shore.y - y0) * dy : (shore.x - x0) * dx) < 0;
  // (vale final fix 1) last of all, a diagonal press that would stop dead (or crawl) where the feet plainly could go on along the
  // edge: across with a give of up to 3.5 px against the up-and-down part (an edge up to about 50 degrees from level), or up and
  // down with a give under a pixel against the across part, open for three steps running. A wall met square and a true inside
  // corner are still honest stops. (The collision audit's slide-stall: 106 of them, most at banks the shore slide met at a kink.)
  const useShore = shore.shore && shore.moved && !backOnGive && gain(shore.x, shore.y) >= gain(x, y), mx = useShore ? shore.x : x, my = useShore ? shore.y : y;
  if (dx && dy && Math.hypot((mx - x0) * W.cellW, (my - y0) * W.cellH) < Math.hypot(dx * W.cellW, dy * W.cellH) * .15) {
    const vx = dx * W.cellW, vy = dy * W.cellH, sx = Math.sign(dx), sy = Math.sign(dy), open3 = (ax, ay) => _gwFree(x0 + ax / W.cellW, y0 + ay / W.cellH) && _gwFree(x0 + 2 * ax / W.cellW, y0 + 2 * ay / W.cellH) && _gwFree(x0 + 3 * ax / W.cellW, y0 + 3 * ay / W.cellH);
    let g2 = null;
    for (let g = .5; g <= 3.5 && !g2; g += .5) if (open3(vx, -sy * g)) g2 = { x: x0 + vx / W.cellW, y: y0 - sy * g / W.cellH, kind: 'y' };
    for (let g = .25; g <= .75 && !g2; g += .25) if (open3(-sx * g, vy)) g2 = { x: x0 - sx * g / W.cellW, y: y0 + vy / W.cellH, kind: 'x' };
    if (g2) { _gw.px = g2.x; _gw.py = g2.y; _gw.slideHold = { sx, sy, kind: g2.kind }; return true; }
  }
  if (useShore) { _gw.px = shore.x; _gw.py = shore.y; return true; }
  if (x === x0 && y === y0) return false;
  _gw.px = x; _gw.py = y; return true;
}
/**
 * Walking by the keys (or steering with the pointer) onto and along a crossing: where you press within 38 degrees of a
 * crossing's own direction, from just short of one of its ends or on it, you walk along its middle line, not the way you
 * press. A diagonal press runs at about 32 degrees (a cell across for a cell down), and stepping stones and footbridges
 * run at their own angles: down-left at the north end of the west brook stones, their own direction, met the bank beside
 * the first stone and slid you along it into the pump square (the verifier, 19 Nov 2026). (ux, uy): the direction you
 * press, in screen px, unit length; step: its length this frame, in px. Returns the direction to walk, or null to walk
 * as pressed.
 */
function _gwCrossingSteer(ux, uy, step) {
  if (GARDEN_WORLD.v < 5 || typeof gardenIslandCrossingGeometry !== 'function' || !(ux || uy)) return null;
  const W = GARDEN_WORLD, X = _gw.px * W.cellW, Y = W.sky + _gw.py * W.cellH;
  const shut = !!step && !_gwFree(_gw.px + ux * step / W.cellW, _gw.py + uy * step / W.cellH);
  for (const c of gardenIslandCrossingGeometry()) {
    const L = Math.hypot(c.b.x - c.a.x, c.b.y - c.a.y); if (!(L > 1)) continue;
    for (const [E, O] of [[c.a, c.b], [c.b, c.a]]) {
      const tx = (O.x - E.x) / L, ty = (O.y - E.y) / L, rx = X - E.x, ry = Y - E.y, along = rx * tx + ry * ty, across = rx * ty - ry * tx;
      if (along < -40 || along > L - 4 || Math.abs(across) > 34) continue;   // (from 40 px short of this end to the far end)
      const dot = ux * tx + uy * ty, cr = ux * ty - uy * tx, hw = c.halfWidth || 14;
      if (dot < .79) continue;   // (within 38 degrees of the way in)
      // Only where the press as it is would miss: short of the end, its line meets the end more than 0.6 of the half width
      // off the middle; on the crossing, the step is shut or leaves the stones or deck. Otherwise you walk as you press, so
      // changing keys on a deck never swings you about.
      const miss = along < 0 ? Math.abs(across + (-along / dot) * cr) > hw * .6 : shut || Math.abs(across + (step || 0) * cr) > hw * .7;
      if (!miss) return null;
      // aim at the middle line a little ahead of where you are along it
      const aim = Math.max(0, along) + 16, gx = E.x + tx * aim - X, gy = E.y + ty * aim - Y, gl = Math.hypot(gx, gy);
      if (gl < 1e-6) continue;
      return [gx / gl, gy / gl];
    }
  }
  return null;
}
/**
 * A diagonal step (dx, dy cells) that is shut whole and on each axis: the nearest way on along the edge that caught the
 * feet, or null. Two ways are tried, smallest give first: across (the x part of the press, giving g px against its y
 * part: kind 'y') and along y (giving g px against its x part: kind 'x'). A way that does not go on the way you press
 * (a wall met square) only counts where the edge falls away beyond it (the corner of a box, the end of a wall), so a
 * flat wall pressed square stops you and never slides you sideways.
 * Pace: walking pace where the edge runs within about 45 degrees of the press, less the squarer you meet it (down to a
 * third), the way a body pressed against a wall creeps along it; it used to run along a wall met almost square at full
 * pace, up the screen while you pressed down. Where the corner that caught you sticks out into that short step, the
 * step goes to the open point beyond it instead (it stopped dead there: five of the last stalls, 18 Nov 2026).
 * `want` ('x' or 'y') asks for that kind only: _gwMoveBy keeps to the kind it took the frame before while it lasts.
 */
function _gwGiveSlide(x0, y0, dx, dy, want) {
  const W = GARDEN_WORLD, vx = dx * W.cellW, vy = dy * W.cellH, sp = Math.hypot(vx, vy), maxGive = Math.max(10, sp * 4);   // (vale final: a give of a few px whatever the pace: at the planted walk's slower 150 px a second, 1.6 steps was under 4 px and 270 slanted edges stopped a diagonal press dead)
  const open = (px, py) => _gwFree(x0 + px / W.cellW, y0 + py / W.cellH);
  // the first way on of each kind (its smallest give, so the one that goes furthest the way you press)
  const best = [null, null];
  for (let way = 0; way < 2; way++) {
    if (want && want !== (way ? 'x' : 'y')) continue;
    for (let g = .25; g <= maxGive + 1e-9 && !best[way]; g += .25) {
      const tx = way ? -Math.sign(vx) * g : vx, ty = way ? vy : -Math.sign(vy) * g, L = Math.hypot(tx, ty), along = (vx * tx + vy * ty) / L;
      if (along < -.3 * sp) break;   // (back the way you came, and every bigger give more so)
      if (!open(tx, ty)) continue;
      // met nearly square: only round a corner (twice as far on for the same give is open), never slide along a flat wall
      if (along < .15 * sp && !(way ? open(tx, 2 * ty) : open(2 * tx, ty))) continue;
      const pace = sp * Math.max(.34, Math.min(1, along / sp / .7)), k = Math.min(1, pace / L);
      let ex = tx * k, ey = ty * k;
      if (!open(ex, ey)) { if (L > sp * 1.6) continue; ex = tx; ey = ty; }
      best[way] = { x: x0 + ex / W.cellW, y: y0 + ey / W.cellH, kind: way ? 'x' : 'y', along };
    }
  }
  // of the two, the one that goes on further the way you press (the other is usually a dead end one step long:
  // taking it first made a one-frame twitch the wrong way before the real slide began)
  return best[0] && best[1] ? (best[1].along > best[0].along + 1e-6 ? best[1] : best[0]) : best[0] || best[1];
}
/** Sweep to contact, then project the remaining stage velocity onto the bank
 * tangent. Obstacles keep their old box handling; no axis jitter at a curve. */
function _gwShoreSlide(x, y, dx, dy, fx, fy, free, grid, out) {
  out = out || {}; out.x = x; out.y = y; out.moved = false; out.shore = false; out.blockedCorner = false;
  if ((!grid.shore && !grid.otherShapes) || !free(x, y)) return out;
  const W = GARDEN_WORLD, count = Math.max(1, Math.ceil(Math.hypot(dx * W.cellW, dy * W.cellH) / 3)), vx = dx / count, vy = dy / count, skin = .025;
  // Dry endpoints can still straddle a curved bank or a narrow river tip.
  // Use the same spacing as route clearance before choosing the shore sweep;
  // keyboard movement and grounded companions must not skip that contact.
  let probe = null;
  for (let step = 1; step <= count; step++) {
    const px = x + vx * step, py = y + vy * step;
    if (free(px, py)) continue;
    const water = _gwWaterProbe(grid, px, py, fx, fy);
    if (!water.free) { probe = water; break; }
  }
  if (!probe) return out;
  if (!probe.edge && grid.waterCover[Math.floor(y) * W.cols + Math.floor(x)]) return out;
  let px = x, py = y, blocked = false; out.shore = true;
  for (let step = 0; step < count; step++) {
    if (free(px + vx, py + vy)) { px += vx; py += vy; continue; }
    let lo = 0, hi = 1;
    for (let i = 0; i < 10; i++) { const t = (lo + hi) / 2; if (free(px + vx * t, py + vy * t)) lo = t; else hi = t; }
    const cx = px + vx * lo, cy = py + vy * lo, hit = _gwWaterProbe(grid, px + vx * (hi + .0001), py + vy * (hi + .0001), fx, fy);
    if (!hit.edge) { px = cx; py = cy; break; }
    const nx = hit.nx, ny = hit.ny;
    let sx = vx * (1 - lo) * W.cellW, sy = vy * (1 - lo) * W.cellH; const inward = Math.min(0, sx * nx + sy * ny);
    sx -= nx * inward; sy -= ny * inward;
    if (Math.hypot(sx, sy) < 1e-5) { px = cx; py = cy; blocked = true; break; }
    let tx = cx + (sx + nx * skin) / W.cellW, ty = cy + (sy + ny * skin) / W.cellH;
    // A tangent can enter a concave offset bank a fraction of a pixel later.
    // Project its endpoint onto the same elliptical clearance, rather than
    // repeatedly bisecting a zero-length step and resetting walking speed.
    for (let iteration = 0; iteration < 4; iteration++) {
      const p = _gwWaterProbe(grid, tx, ty, fx, fy); if (p.free || !p.edge) break;
      if (nx * p.nx + ny * p.ny < .9) {
        const ux = vx * W.cellW, uy = vy * W.cellH, a = Math.min(0, ux * nx + uy * ny), b = Math.min(0, ux * p.nx + uy * p.ny);
        const alongA = (ux - nx * a) * p.nx + (uy - ny * a) * p.ny, alongB = (ux - p.nx * b) * nx + (uy - p.ny * b) * ny;
        // If neither face's tangent is allowed by the other face, the closest
        // admissible velocity is zero. Skin corrections must not walk a cape.
        if (alongA < -1e-7 && alongB < -1e-7) { blocked = true; out.blockedCorner = true; break; }
      }
      const radius = Math.hypot(fx * W.cellW * p.nx, fy * W.cellH * p.ny), amount = Math.max(skin, (1 - p.side * Math.sqrt(p.distance)) * radius + skin);
      tx += p.nx * amount / W.cellW; ty += p.ny * amount / W.cellH;
    }
    if (blocked) { px = cx; py = cy; break; }
    if (free(tx, ty)) { px = tx; py = ty; }
    else { px = cx; py = cy; break; }
  }
  if (blocked && Math.hypot((px - x) * W.cellW, (py - y) * W.cellH) < .03) return out;
  out.x = px; out.y = py; out.moved = Math.abs(px - x) + Math.abs(py - y) > 1e-7; return out;
}
/** Shared continuous bank sliding for land pets and grounded wildlife. */
function gardenWorldSlide(x, y, dx, dy, r, out) {
  const radius = r == null ? .1 : r, free = (px, py) => gardenWorldFree(px, py, radius), grid = _gwGridNow(true);
  out = _gwShoreSlide(x, y, dx, dy, radius, radius, free, grid, out);
  if (out.shore) return out;
  if (free(x + dx, y + dy)) { out.x = x + dx; out.y = y + dy; }
  else { if (free(x + dx, y)) out.x = x + dx; if (free(out.x, y + dy)) out.y = y + dy; }
  out.moved = Math.abs(out.x - x) + Math.abs(out.y - y) > 1e-7; return out;
}
/** The feet are inside something (a plant grew where you stood, a decoration was put down): glide out to the nearest open ground. */
function _gwPushOut(dt) {
  if (typeof gartActSeatHeld === 'function' && gartActSeatHeld()) return false;   // sat on a bench: the hips are over its footing on purpose (getting up glides you out)
  if (_gwFree(_gw.px, _gw.py)) {
    if (_gw.replan) { _gw.replan = false; _gw.repaths = 0; if (!_gwRepath()) { _gw.path = []; _gw.then = null; } }
    return false;
  }
  let f = _gwNearestFreePt(_gw.px, _gw.py, 3);
  if (!f) { const c = _gwNearestFree(Math.floor(_gw.px), Math.floor(_gw.py), 10) || _gwNearestFree(GARDEN_WORLD.start.x, GARDEN_WORLD.start.y, 30); f = c ? _gwCellPoint(c) : null; }
  if (!f) return false;   // nowhere to stand at all: nothing to do but let you move
  const W = GARDEN_WORLD, dxp = (f.x - _gw.px) * W.cellW, dyp = (f.y - _gw.py) * W.cellH, d = Math.hypot(dxp, dyp), step = 230 * dt;
  _gw.spd = 0; if (_gw.path.length) _gw.replan = true;   // a walk in progress carries on from the new spot once the feet are clear
  if (d <= step) { _gw.px = f.x; _gw.py = f.y; }
  else { _gw.px += dxp / d * step / W.cellW; _gw.py += dyp / d * step / W.cellH; }
  if (Math.abs(dxp) > 4) _gw.face = dxp > 0 ? 1 : -1;
  return true;
}
/** The way ahead is shut (it changed, or the feet were clipped): plan a new way to where you were going. False when there is none. */
function _gwRepath() {
  const g = _gw.goal; if (!g || (_gw.repaths = (_gw.repaths || 0) + 1) > 4) return false;
  const tgt = _gwFree(g.x, g.y) ? g : _gwNearestFreePt(g.x, g.y, 3); if (!tgt) return false;
  const route = _gwRoute({ x: _gw.px, y: _gw.py }, tgt); if (!route) return false;
  _gw.path = route; _gw.goal = tgt; return true;
}
/** The free point nearest to (x, y) (a click on a plant, a bench, the water...), or null. */
function _gwNearestFreePt(x, y, maxR) {
  const W = GARDEN_WORLD, R = maxR || 3;
  let best = null, bd = 1e9;
  for (let dy = -R; dy <= R; dy += 0.25) for (let dx = -R; dx <= R; dx += 0.25) {
    const d = Math.hypot(dx * W.cellW, dy * W.cellH) + (dy < 0 ? 4 : 0);
    if (d >= bd || !_gwFree(x + dx, y + dy)) continue;
    bd = d; best = { x: x + dx, y: y + dy };
  }
  return best;
}
/** A stable frontier for the two route searches. Each cell has one live slot;
 * lowering its cost updates that slot rather than scanning or queuing copies.
 * Equal costs keep first-in order, as in the earlier array frontier. */
function _gwPathFrontier(cost, capacity) {
  const heap = new Int32Array(capacity), positions = new Int32Array(capacity).fill(-1), order = new Uint32Array(capacity);
  let length = 0, serial = 0;
  const before = (a, b) => cost[a] < cost[b] || cost[a] === cost[b] && order[a] < order[b];
  const swap = (a, b) => { const value = heap[a]; heap[a] = heap[b]; heap[b] = value; positions[heap[a]] = a; positions[heap[b]] = b; };
  return {
    get length() { return length; },
    lower(cell) {
      let at = positions[cell];
      if (at < 0) { at = length++; heap[at] = cell; positions[cell] = at; order[cell] = ++serial; }
      while (at) { const parent = (at - 1) >> 1; if (!before(heap[at], heap[parent])) break; swap(at, parent); at = parent; }
    },
    take() {
      const cell = heap[0], last = heap[--length]; positions[cell] = -1;
      if (length) {
        heap[0] = last; positions[last] = 0; let at = 0;
        for (;;) { const left = at * 2 + 1; if (left >= length) break; const right = left + 1, child = right < length && before(heap[right], heap[left]) ? right : left; if (!before(heap[child], heap[at])) break; swap(at, child); at = child; }
      }
      return cell;
    },
  };
}
/** The cells A* goes through, eight ways, no cutting corners (raw: every cell; else string-pulled by cell). null when there is no way. */
function gardenPath(from, to, raw) {
  const W = GARDEN_WORLD, C = W.cols, R = W.rows, grid = _gwGrid(gardenHere());
  const sx = Math.max(0, Math.min(C - 1, Math.floor(from.x))), sy = Math.max(0, Math.min(R - 1, Math.floor(from.y)));
  const tx = to.x, ty = to.y;
  if (sx === tx && sy === ty) return [];
  const idx = (x, y) => y * C + x, came = new Int32Array(C * R).fill(-1), gs = new Float32Array(C * R).fill(1e9), closed = new Uint8Array(C * R);
  const hcost = (x, y) => Math.hypot((x - tx) * W.cellW, (y - ty) * W.cellH) / 40 * 1.6;   // (vale final: weighted, so a long way round the north range is found in a few thousand cells, not the whole map; the legs are straightened after)
  gs[idx(sx, sy)] = 0;
  const f = new Float32Array(C * R).fill(1e9), open = _gwPathFrontier(f, C * R); f[idx(sx, sy)] = hcost(sx, sy); open.lower(idx(sx, sy));
  const free = (x, y) => x >= 0 && y >= 0 && x < C && y < R && !grid[idx(x, y)];
  let guard = 0;
  while (open.length && guard++ < C * R) {   // (vale final: the whole map, not 4000 cells: the way round the north range to the warren bank and the moor gate needs more)
    const cur = open.take();
    if (cur === idx(tx, ty)) break;
    closed[cur] = 1;
    const cx = cur % C, cy = (cur - cx) / C;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      if (!free(nx, ny)) continue;
      if (dx && dy && (!free(cx + dx, cy) || !free(cx, cy + dy))) continue;   // no corner cutting
      const ni = idx(nx, ny); if (closed[ni]) continue;
      if (!_gwRouteEdgeClear({ x: cx, y: cy }, { x: nx, y: ny }, grid)) continue;
      const step = Math.hypot(dx * W.cellW, dy * W.cellH) / 40, ng = gs[cur] + step;
      if (ng < gs[ni]) { gs[ni] = ng; came[ni] = cur; f[ni] = ng + hcost(nx, ny); open.lower(ni); }
    }
  }
  const goal = idx(tx, ty);
  if (came[goal] < 0) return null;
  const cells = []; for (let c = goal; c >= 0 && c !== idx(sx, sy); c = came[c]) cells.push({ x: c % C, y: (c - (c % C)) / C });
  cells.reverse();
  if (raw) return cells;
  const out = []; let at = { x: sx, y: sy };
  for (let i = 0; i < cells.length; i++) {
    const nxt = cells[i + 1];
    if (nxt && _gwLineClear(at, nxt, grid)) continue;
    out.push(cells[i]); at = cells[i];
  }
  return out;
}
function _gwLineClear(a, b, grid) {
  if (grid.anchors && grid.anchors.size) return _gwRouteEdgeClear(a, b, grid, true);
  const W = GARDEN_WORLD, n = Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * 4);
  for (let i = 1; i < n; i++) {
    const t = i / n, x = Math.floor(a.x + 0.5 + (b.x - a.x) * t), y = Math.floor(a.y + 0.5 + (b.y - a.y) * t);
    if (x < 0 || y < 0 || x >= W.cols || y >= W.rows || grid[y * W.cols + x]) return false;
  }
  return _gwRouteEdgeClear(a, b, grid);
}
/** The way from one point to another: [waypoints] ending exactly at `to`, as straight as it can be, or null. */
function _gwRoute(from, to) {
  { const way = gardenWonderWayRoute(from, to); if (way) return way; }   // over the stones to the island: along the line of them
  if (_gwLos(from, to, GW_CLEAR) || _gwLos(from, to)) return [{ x: to.x, y: to.y }];
  const raw = gardenPath(from, { x: Math.floor(to.x), y: Math.floor(to.y) }, true);
  if (raw === null) return null;
  const grid = _gwGridNow(), pts = raw.map(c => _gwCellPoint(c, grid)); pts.push({ x: to.x, y: to.y });
  const out = []; let at = { x: from.x, y: from.y }, i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !_gwLos(at, pts[j], GW_CLEAR)) j--;
    out.push(pts[j]); at = pts[j]; i = j + 1;
  }
  // the cell route runs through the middle of each cell, and a small box (a lectern, a lantern) can stand right there: any leg the feet cannot take is planned again, finely, round it
  const fixed = []; at = { x: from.x, y: from.y };
  for (const p of out) {
    if (_gwLos(at, p)) fixed.push(p); else fixed.push(..._gwMend(at, p));
    at = p;
  }
  return fixed;
}
/** The points to walk from a to b when a small box stands in the straight leg: straight up to it, a fine way round it (_gwLocalPath), then on. Always ends at b. */
function _gwMend(a, b) {
  const out = []; let at = a;
  for (let round = 0; round < 4; round++) {
    if (_gwLos(at, b)) { out.push(b); return out; }
    const steps = Math.max(2, Math.ceil(Math.hypot(b.x - at.x, b.y - at.y) / 0.0625));
    const q = (i) => ({ x: at.x + (b.x - at.x) * i / steps, y: at.y + (b.y - at.y) * i / steps });
    let t1 = 0, t2 = steps;
    for (let i = 1; i <= steps; i++) { const p = q(i); if (!_gwFree(p.x, p.y)) { t1 = i; break; } }
    if (!t1) { out.push(b); return out; }
    for (let i = t1 + 1; i <= steps; i++) { const p = q(i); if (_gwFree(p.x, p.y, 0.08)) { t2 = i; break; } }
    const p0 = q(Math.max(0, t1 - 2)), p1 = t2 >= steps ? b : q(t2), way = _gwLocalPath(p0, p1);
    if (!way) { out.push(b); return out; }
    if (t1 > 2) out.push(p0);
    out.push(...way); at = p1;
    if (p1 === b) return out;
  }
  out.push(b); return out;
}
/** The way round a small box between a and b (a few cells apart at most): A* on a lattice of an eighth of a cell, half a cell or so either side, string-pulled. null when there is none (or it takes too long). */
function _gwLocalPath(a, b) {
  const S = 0.125, pad = 0.6, x0 = Math.min(a.x, b.x) - pad, y0 = Math.min(a.y, b.y) - pad, t0 = Date.now();   // clock-ok: a time budget
  const nx = Math.ceil((Math.abs(b.x - a.x) + 2 * pad) / S) + 1, ny = Math.ceil((Math.abs(b.y - a.y) + 2 * pad) / S) + 1;
  if (nx * ny > 2500) return null;
  const sI = Math.round((a.x - x0) / S), sJ = Math.round((a.y - y0) / S), gI = Math.round((b.x - x0) / S), gJ = Math.round((b.y - y0) / S);
  const id = (i, j) => j * nx + i, memo = new Int8Array(nx * ny);   // 0 not looked at, 1 open, 2 not
  const free = (i, j) => { if (i < 0 || j < 0 || i >= nx || j >= ny) return false; const k = id(i, j); if (!memo[k]) memo[k] = _gwFree(x0 + i * S, y0 + j * S) ? 1 : 2; return memo[k] === 1; };
  const g = new Float32Array(nx * ny).fill(1e9), came = new Int32Array(nx * ny).fill(-1), done = new Uint8Array(nx * ny), costs = new Float64Array(nx * ny).fill(1e9), open = _gwPathFrontier(costs, nx * ny);
  const start = id(sI, sJ); g[start] = 0; costs[start] = Math.hypot(sI - gI, sJ - gJ); open.lower(start);
  let guard = 0, end = -1;
  while (open.length && guard++ < 1200) {
    if ((guard & 63) === 0 && Date.now() - t0 > 15) return null;   // clock-ok: a time budget; the leg then stays as it was
    const cur = open.take(); if (done[cur]) continue; done[cur] = 1;
    const ci = cur % nx, cj = (cur - ci) / nx;
    if (Math.abs(ci - gI) <= 1 && Math.abs(cj - gJ) <= 1) { end = cur; break; }
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = ci + di, nj = cj + dj; if (!free(ni, nj)) continue;
      if (di && dj && (!free(ci + di, cj) || !free(ci, cj + dj))) continue;   // no corner cutting
      const k = id(ni, nj); if (done[k]) continue;
      const ng = g[cur] + Math.hypot(di, dj);
      if (ng < g[k]) { g[k] = ng; came[k] = cur; costs[k] = g[k] + Math.hypot(ni - gI, nj - gJ); open.lower(k); }
    }
  }
  if (end < 0) return null;
  const nodes = []; for (let k = end; k >= 0 && k !== id(sI, sJ); k = came[k]) nodes.push({ x: x0 + (k % nx) * S, y: y0 + ((k - k % nx) / nx) * S });
  nodes.reverse(); nodes.push({ x: b.x, y: b.y });
  const out = []; let at = { x: a.x, y: a.y }, i = 0;
  while (i < nodes.length) {
    let j = nodes.length - 1;
    while (j > i && !_gwLos(at, nodes[j], GW_CLEAR) && !_gwLos(at, nodes[j])) j--;
    out.push(nodes[j]); at = nodes[j]; i = j + 1;
  }
  return out;
}
/** Walk to a point (cells, fractions allowed); the nearest free one when it is blocked. `then(arrived)` runs on arrival. Returns whether there is a way. */
function gardenWalkToPoint(pt, then, o) {
  if (window.GardenNative && GardenNative.world() && !GardenNative.inRoom()) return GardenNative.world().walkTo(pt, then, o);
  o = o || {};
  // wherever you tell yourself to go, you stop creeping after the bug (its own chase passes net: true); the chase used to pull you back
  if (!o.net && _gw.netting && _gw.netting.state === 'chase') _gw.netting = null;
  const tgt = _gwFree(pt.x, pt.y) ? { x: pt.x, y: pt.y } : _gwNearestFreePt(pt.x, pt.y, o.radius || 3);
  if (!tgt) { _gw.path = []; _gw.then = null; return false; }
  const route = _gwRoute({ x: _gw.px, y: _gw.py }, tgt);
  if (route === null) { _gw.path = []; _gw.then = null; return false; }
  _gw.path = route; _gw.then = then || null; _gw.goal = tgt; _gw.sneak = !!o.sneak; _gw.replan = false;
  if (typeof gardenLiveWalked === 'function') gardenLiveWalked(tgt);   // friends here see where you are going
  _gw.repaths = 0; _gw.blockT = 0;
  _gwRouteShow(!!then);
  if (route.length) gardenBubbleClose();
  gardenWalkedOnce();
  if (typeof _gwFishCancelWalkAway === 'function') _gwFishCancelWalkAway();
  if (!route.length && typeof then === 'function') { _gw.then = null; then(true); }
  _gwEnsureLoop();
  return true;
}
function gardenWalkTo(cell, then, o) { return gardenWalkToPoint({ x: cell.x + 0.5, y: cell.y + 0.5 }, then, o); }
function gardenWorldFace(cell) { if (!cell) return; _gwFacePt({ x: cell.x + 0.5, y: cell.y + 0.5 }); }
function _gwFacePt(pt) { const dx = pt.x - (pt.x >= GARDEN_ROOM_X && _grm.me ? gardenRoomMeCell().x : _gw.px); if (Math.abs(dx) > 0.05) _gw.face = dx > 0 ? 1 : -1; _gwBody(); }
/** Where on the stage (in cells, fractions allowed) a pointer event is. */
function _gwPointAt(ev) {
  if (!ev || ev.clientX == null || ev.clientY == null || !_gw.svg) return null;
  if (window.GardenNative && GardenNative.active()) return GardenNative.point(ev.clientX, ev.clientY);
  if (window.GardenPhaser && GardenPhaser.active(_gw.svg)) return GardenPhaser.point(ev.clientX, ev.clientY);
  try {
    const ctm = _gw.svg.getScreenCTM(); if (!ctm) return null;
    const pt = _gw.svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    const p = pt.matrixTransform(ctm.inverse()), W = GARDEN_WORLD;
    return { x: p.x / W.cellW, y: (p.y - W.sky) / W.cellH };
  } catch (e) { return null; }
}
const _gwVisualPicks = new WeakMap();
/** Hover, tools, doors and pet capture share one hit lookup per pointer event. */
function gardenWorldVisualPick(ev) {
  if (ev && window.GardenNative && GardenNative.active()) return GardenNative.pick(ev.clientX, ev.clientY);
  if (!ev || typeof ev !== 'object' || ev.clientX == null || ev.clientY == null || !window.GardenPhaser || !GardenPhaser.active(_gw.svg)) return null;
  const cached = _gwVisualPicks.get(ev);
  if (cached && cached.svg === _gw.svg && cached.x === ev.clientX && cached.y === ev.clientY) return cached.hit;
  const hit = GardenPhaser.pick(ev.clientX, ev.clientY);
  _gwVisualPicks.set(ev, { svg: _gw.svg, x: ev.clientX, y: ev.clientY, hit });
  return hit;
}

/* ---------- where you are going: a dotted trail and a marker at the end of it (2.23) ---------- */
function _gwRouteG() {
  const layer = _gw.svg && _gw.svg.querySelector('.gd-actors'); if (!layer) return null;
  let g = layer.querySelector(':scope > .gd-route');
  if (!g) {
    g = gardenSceneElement('g'); g.setAttribute('class', 'gd-route');
    g.innerHTML = '<polyline class="gd-route-line" fill="none"/><g class="gd-route-end"><ellipse class="gd-route-pulse" rx="15" ry="6"/><ellipse class="gd-route-ring" rx="9" ry="3.600"/><path class="gd-route-pin" d="M0 -3c-4 -5 -6.500 -8 -6.500 -11.500a6.500 6.500 0 0 1 13 0c0 3.500 -2.500 6.500 -6.500 11.500z"/><circle class="gd-route-dot" cy="-14.500" r="2.400"/></g>';
    layer.insertBefore(g, layer.firstChild);
    _gw.routeEls = { line: g.querySelector('.gd-route-line'), end: g.querySelector('.gd-route-end') };
  }
  return g;
}
function _gwRouteShow(act) {
  const g = _gwRouteG(); if (!g) return;
  g.classList.toggle('is-act', !!act);
  g.classList.toggle('is-on', _gw.path.length > 0);
  _gw.routeOn = _gw.path.length > 0;
  _gwRouteFrame(true);
}
function _gwRouteFrame(force) {
  if (!_gw.routeOn && !force) return;
  const g = _gw.svg && _gw.svg.querySelector('.gd-actors > .gd-route'); if (!g) return;
  if (!_gw.path.length) { if (_gw.routeOn) { _gw.routeOn = false; g.classList.remove('is-on'); } return; }
  const W = GARDEN_WORLD, E = _gw.routeEls;
  if (!E || !E.line.isConnected) { _gw.routeEls = { line: g.querySelector('.gd-route-line'), end: g.querySelector('.gd-route-end') }; }
  // The route beyond the first point is immutable until a waypoint is passed
  // or a replan replaces the array. Only the player's point changes each frame.
  if (_gw.routePath !== _gw.path || _gw.routeLength !== _gw.path.length) {
    _gw.routePath = _gw.path; _gw.routeLength = _gw.path.length;
    _gw.routeTail = _gw.path.map(p => (p.x * W.cellW).toFixed(0) + ',' + (W.sky + p.y * W.cellH).toFixed(0)).join(' ');
  }
  const pts = (_gw.px * W.cellW).toFixed(0) + ',' + (W.sky + _gw.py * W.cellH).toFixed(0) + ' ' + _gw.routeTail;
  if (_gw.routePts !== pts) { _gw.routePts = pts; _gw.routeEls.line.setAttribute('points', pts); }
  const end = _gw.path[_gw.path.length - 1], tf = `translate(${(end.x * W.cellW).toFixed(1)} ${(W.sky + end.y * W.cellH).toFixed(1)})`;
  if (_gw.routeEnd !== tf) { _gw.routeEnd = tf; _gw.routeEls.end.setAttribute('transform', tf); }
}
/* ---------- the figure ---------- */
function _gwFigureInner(walk) {
  let svg = '';
  try {
    if (typeof profileFigureSvg === 'function' && typeof profileGet === 'function') svg = profileFigureSvg(profileGet().avatar, { size: 70, walk: !!walk, uid: 'gwp' + (walk ? 'w' : 'i') });
  } catch (e) { svg = ''; }
  const m = svg && /^<svg[^>]*>([\s\S]*)<\/svg>$/.exec(svg);
  if (m) return m[1];
  // no scene library on this page: a small gardener of our own
  return `<ellipse cx="0" cy="0.6" rx="11" ry="1.8" fill="#000000" opacity="0.14"/><g><rect x="-6" y="-40" width="12" height="26" rx="5" fill="#5a8a5a"/><circle cx="0" cy="-48" r="8" fill="#e8b890"/><path d="M-9 -50q9 -12 18 0z" fill="#c8a24a"/><rect x="-5" y="-14" width="4" height="14" rx="2" fill="#4a5a7a"/><rect x="1" y="-14" width="4" height="14" rx="2" fill="#4a5a7a"/></g>`;
}
function _gwBody() {
  if (!_gw.node) return;
  const moving = _gw.moving && gardenMotionOn();
  const key = (moving ? 'w' : 'i') + (_gw.face > 0 ? 'r' : 'l');
  const inner = _gw.node.querySelector('.gd-pl-in');
  if (!inner) return;
  if (typeof gartPlayerPaint === 'function' && gartPlayerPaint(inner, _gw)) return;   // agent 'garden-art': the storybook gardener, four ways round
  if (!_gw.fig.idle) { _gw.fig.idle = _gwFigureInner(false); _gw.fig.walk = _gwFigureInner(true); }
  if (_gw.bodyKey !== key) { _gw.bodyKey = key; inner.innerHTML = moving ? _gw.fig.walk : _gw.fig.idle; }
  inner.setAttribute('transform', `scale(${_gw.face > 0 ? GW_SCALE : -GW_SCALE} ${GW_SCALE})`);
  // you can always find yourself: a faint copy of the figure is drawn over everything, so a tree or a roof never swallows you
  const xr = _gwXray();
  if (xr) { const xi = xr.firstChild; if (xr._k !== _gw.fig.idle) { xr._k = _gw.fig.idle; xi.innerHTML = _gw.fig.idle; } xi.setAttribute('transform', `scale(${_gw.face > 0 ? GW_SCALE : -GW_SCALE} ${GW_SCALE})`); }
}
/** Make the figures again (the avatar changed, or the wardrobe was opened). */
function gardenWorldRedress() { _gw.fig = { idle: '', walk: '' }; _gw.bodyKey = ''; _gwBody(); }
function _gwXray() {
  if (_gw.xr && _gw.xr.isConnected && _gw.xr.ownerSVGElement === _gw.svg) return _gw.xr;
  const fx = _gw.svg && _gw.svg.querySelector('.gd-ui'); if (!fx) return null;
  let g = fx.querySelector(':scope > .gd-pl-xray');
  if (!g) { g = gardenSceneElement('g'); g.setAttribute('class', 'gd-pl-xray'); g.appendChild(gardenSceneElement('g')); fx.insertBefore(g, fx.firstChild); }
  _gw.xr = g;
  return g;
}
function _gwMakeNode() {
  const NS = 'http://www.w3.org/2000/svg';
  const g = gardenSceneElement('g');
  g.setAttribute('class', 'gd-player'); g.setAttribute('data-live', '1'); g.setAttribute('data-z', String(_gw.py));
  // The Painted village stands the figure in the scenes' soft contact shadow, without the pale halo (94-garden-art-g-paint.js).
  const painted = typeof gardenFigurePaintStyle === 'function' && gardenFigurePaintStyle() && typeof gardenFigureShadowSvg === 'function';
  g.innerHTML = '<g class="gd-pl-sh">' + (painted ? gardenFigureShadowSvg(11, 3.2) : '<ellipse class="gd-pl-halo" cx="0" cy="1" rx="17" ry="6"/><ellipse cx="0" cy="1" rx="12" ry="3.4" fill="#1a2a14" fill-opacity="0.2"/>') + '</g><g class="gd-pl-bob"><g class="gd-pl-in"></g></g>';
  return g;
}

/* ---------- depth: the player and the pet sit in the objects layer by row ---------- */
/*
 * Rows (the owner: "lag everywhere", "stuttery"). Anything that moves used to be taken out of the objects layer and put back whenever it changed row, and one insertion among 800
 * siblings restyled and laid out the whole layer: measured 330 ms on a full garden, several times a second. So the layer now holds one empty <g class="gd-row"> before each new depth,
 * made when the scene changes, and what moves goes in and out of those. A move touches a handful of nodes, whatever the size of the garden.
 * Row i holds what stands at a depth below zs[i] (and at or past zs[i - 1]), which draws things exactly where "before the first thing further forward" did.
 */
function _gwRowsBuild(layer) {
  const old = layer._gwRowMap || new Map(), map = new Map(), zs = [], slots = [], need = [];
  let max = -Infinity;
  for (const el of layer.children) {
    if (el.hasAttribute('data-live')) continue;
    const ez = Number(el.getAttribute('data-z'));
    if (Number.isFinite(ez) && ez > max) { max = ez; need.push([ez, el]); }
  }
  need.push([Infinity, null]);
  for (const [z, before] of need) {
    let g = old.get(z);
    if (!g) { g = gardenSceneElement('g'); g.setAttribute('class', 'gd-row'); g.setAttribute('data-live', '1'); }
    if (before ? before.previousElementSibling !== g : (g.parentNode !== layer || g.nextElementSibling)) layer.insertBefore(g, before);
    map.set(z, g); zs.push(z); slots.push(g);
  }
  layer._gwRowMap = map; layer._gwRows = { zs, slots };
  // a depth nothing stands at any more: what was in its row moves to the right one
  for (const [z, g] of old) {
    if (map.has(z)) continue;
    const kids = [...g.children]; g.remove();
    for (const n of kids) gardenRowPlace(layer, n, Number(n.getAttribute('data-z')) || 0);
  }
  // a new depth between two rows: whoever now belongs in it moves there
  for (const g of slots) for (const n of [...g.children]) gardenRowPlace(layer, n, Number(n.getAttribute('data-z')) || 0);
  return layer._gwRows;
}
/** Put a node in the row it stands in. Nothing happens when it is already there: only a real change of what is in front of it touches the page. */
function gardenRowPlace(layer, node, z) {
  if (node && node._native) { node.target.setDepth(GARDEN_WORLD.sky + z * GARDEN_WORLD.cellH); if (node.parentNode !== layer) layer.appendChild(node); const world = window.GardenNative && GardenNative.world(); if (world) world.depthChanged(); return; }
  // Native depth is independent of SVG document order. Keep the logical actor
  // attached where it was first inserted rather than moving its animated
  // subtree through the DOM whenever its feet cross a row.
  if (node.parentNode && layer.contains(node) && window.GardenPhaser && GardenPhaser.active(layer.ownerSVGElement)) return;
  const R = layer._gwRows || _gwRowsBuild(layer), zs = R.zs;
  let a = 0, b = zs.length - 1;
  while (a < b) { const m = (a + b) >> 1; if (zs[m] > z) b = m; else a = m + 1; }
  const row = R.slots[a];
  let ref = null;
  for (let c = row.firstElementChild; c; c = c.nextElementSibling) { if (c !== node && Number(c.getAttribute('data-z')) > z) { ref = c; break; } }
  if (node.parentNode === row && node.nextElementSibling === ref) return;
  // moving a node starts its CSS animations again from nothing: a walking leg or a beating wing would jump at every row. They carry on from where they were
  const was = node.parentNode && !node.classList.contains('gart-off') && node.getAnimations ? node.getAnimations({ subtree: true }) : null, at = was && was.length ? new Map() : null;
  if (at) for (const a of was) if (a.animationName) at.set(a.effect.target, Object.assign(at.get(a.effect.target) || {}, { [a.animationName]: a.currentTime }));
  row.insertBefore(node, ref);
  if (at) for (const a of node.getAnimations({ subtree: true })) { const t = a.animationName && at.get(a.effect.target); if (t && t[a.animationName] != null) a.currentTime = t[a.animationName]; }
}
/** Reconstruct painter order for a still photo or when returning to SVG. */
function gardenWorldCaptureDepth(svg) {
  const layer = svg && svg.querySelector('.gd-objects'); if (!layer) return;
  const actors = [...layer.querySelectorAll(':scope > .gd-row > [data-live]')];
  if (!actors.length) return;
  _gwRowsBuild(layer);
  for (const actor of actors) gardenRowPlace(layer, actor, Number(actor.getAttribute('data-z')) || 0);
  const keep = new Set(layer._gwRows.slots);
  for (const row of layer.querySelectorAll(':scope > .gd-row')) if (!row.firstChild && !keep.has(row)) row.remove();
}
function _gwPlace(node, z) {
  const layer = _gw.svg && _gw.svg.querySelector('.gd-objects'); if (!layer || !node) return;
  gardenRowPlace(layer, node, z);
}
function _gwApplyNode() {
  const W = GARDEN_WORLD;
  if (!_gw.node) return;
  if (typeof gartPlayerStep === 'function') gartPlayerStep(_gw);   // agent 'garden-art': a compare, redraws only on a turn
  const x = _gw.px * W.cellW, y = W.sky + _gw.py * W.cellH;
  const tf = `translate(${x.toFixed(1)} ${y.toFixed(1)})`;
  if (_gw.nodeTf !== tf || _gw.node._gwTf !== tf) { _gw.nodeTf = tf; _gw.node._gwTf = tf; _gw.node.setAttribute('transform', tf); _gw.node.setAttribute('data-z', (_gw.py + 0.001).toFixed(2)); const xr = _gwXray(); if (xr) xr.setAttribute('transform', tf); }
  const z = Math.floor(_gw.py * 2);
  if (z !== _gw.z || !_gw.node.parentNode) { _gw.z = z; _gwPlace(_gw.node, _gw.py); }
  const bob = _gw.bobEl && _gw.bobEl.isConnected ? _gw.bobEl : (_gw.bobEl = _gw.node.querySelector('.gd-pl-bob'));
  const bt = _gw.moving && gardenMotionOn() ? `translate(0 ${(-Math.abs(Math.sin(_gw.t * (_gw.sneak ? 7 : 11))) * 1.6).toFixed(2)})` : '';
  if (bob && _gw.bobTf !== bt) { _gw.bobTf = bt; bob.setAttribute('transform', bt); }
}

/* ---------- the camera ---------- */
function _gwSize() {
  // read once and again only when the box changes size: asking the page for it every frame forced a layout every frame
  if (_gw.sizeOk && _gw.size.w) return _gw.size;
  const box = _gw.box || (_gw.root && _gw.root.querySelector('.gd-stagebox'));
  if (box) { _gw.box = box; const w = box.clientWidth, h = box.clientHeight; if (w && h) { _gw.size.w = w; _gw.size.h = h; _gw.sizeOk = true; } }
  return _gw.size;
}
function _gwPrefsNow() { return _gw.frameActive && _gw.framePrefs || _gdpPrefs(); }
function gardenCamMode() { const world = window.GardenNative && GardenNative.world(); return world && world.cameraControls ? world.cameraControls().mode : _gwPrefsNow().cam === 'fit' ? 'fit' : 'follow'; }
function _gwCamZoomIdx() { const p = _gwPrefsNow(); const i = Number(p.zoom); return p.zoom != null && Number.isInteger(i) && i >= 0 && i < GW_ZOOMS.length ? i : _gwCamDefaultIdx(); }
/** Until you choose a zoom: close enough that the gardener stands about 135 px tall (a player's distance, not a map's), but always at least seven cells across (a phone). */
function _gwCamDefaultIdx() {
  const s = _gwSize(), k = s.w + 'x' + s.h;
  if (_gw.zoomKey === k) return _gw.zoomDef;
  if (!s.w || !s.h) return 2;
  const want = Math.max(s.h / (135 / (70 * GW_FIGURE_ART)),   /* (the camera keeps its distance: the figure is smaller, the view is the same) */ 7 * GARDEN_WORLD.cellW * s.h / s.w);
  let best = 0; GW_ZOOMS.forEach((z, i) => { if (Math.abs(z - want) < Math.abs(GW_ZOOMS[best] - want)) best = i; });
  _gw.zoomKey = k; _gw.zoomDef = best;
  return best;
}
function gardenCamSet(mode, zoomDelta) {
  if (window.GardenNative && GardenNative.world()) { GardenNative.world().cameraSet(mode, zoomDelta); _gwUpdateCamUi(); return; }
  const p = _gdpPrefs();
  if (zoomDelta) { const i = Math.max(0, Math.min(GW_ZOOMS.length - 1, _gwCamZoomIdx() + zoomDelta)); p.zoom = i; p.cam = 'follow'; }
  else if (mode) p.cam = mode;
  if (typeof saveUI === 'function') saveUI();
  _gw.cam.dirty = true; _gw.cam.snap = false; _gwEnsureLoop(); _gwUpdateCamUi();
}
function _gwCamTarget() {
  const W = GARDEN_WORLD, wpx = W.cols * W.cellW, hpx = W.sky + W.rows * W.cellH, s = _gwSize();
  if (!s.w || !s.h) return null;
  const ar = s.w / s.h;
  if (typeof gardenDesignCam === 'function') { const dc = gardenDesignCam(ar, wpx, hpx); if (dc) return dc; }   // the designer's own view, moved with its own buttons
  // fishing locks the camera onto you and the bobber: close in, and back out again when the line is in
  if (typeof _gwFishBusy === 'function' && _gwFishBusy() && _gw.fishing && _gw.fishing.bx < GARDEN_ROOM_X) {
    const F = _gw.fishing, bx = F.bx * W.cellW, by = W.sky + F.by * W.cellH, fx = _gw.px * W.cellW, fy = W.sky + _gw.py * W.cellH - 30;
    let vh = Math.max(190, Math.abs(by - fy) + 130, (Math.abs(bx - fx) + 170) / ar), vw = vh * ar;
    if (vh > hpx) { vh = hpx; vw = vh * ar; }
    if (vw > wpx) { vw = wpx; vh = vw / ar; }
    return { x: Math.max(0, Math.min(wpx - vw, (bx + fx) / 2 - vw / 2)), y: Math.max(0, Math.min(hpx - vh, (by + fy) / 2 - vh / 2 - 6)), w: vw, h: vh };
  }
  const fit = gardenCamMode() === 'fit';
  let vh = fit ? Math.max(hpx, wpx / ar) : GW_ZOOMS[_gwCamZoomIdx()];
  let vw = vh * ar;
  if (vw > wpx && !fit) { vw = wpx; vh = vw / ar; }
  if (vh > hpx && !fit) { vh = hpx; vw = vh * ar; }
  let x, y;
  if (fit) { x = (wpx - vw) / 2; y = vh > hpx ? hpx - vh : (hpx - vh) / 2; }
  else {
    const fx = _gw.px * W.cellW, fy = W.sky + _gw.py * W.cellH - 20;
    x = Math.max(0, Math.min(wpx - vw, fx - vw / 2)); y = Math.max(0, Math.min(hpx - vh, fy - vh * 0.56));
  }
  return { x, y, w: vw, h: vh };
}
function _gwApplyCam(dt, snap) {
  const svg = _gw.svg; if (!svg) return;
  const t = _gwCamTarget(); if (!t) return;
  const c = _gw.cam;
  c.goal = t;
  // a new view to go to (a zoom, a line cast, a catch): what it will show goes on the page now, before the camera moves, never in sight
  { const gk = (t.w | 0) + ',' + (t.h | 0); if (c.gk !== gk) { c.gk = gk; if (c.init && !_gwCalm.hid && typeof _gartRestItems === 'function') { _gw.restAt = _gw.t; _gartRestItems(svg); } } }
  if (!c.init || snap || !gardenMotionOn()) { c.x = t.x; c.y = t.y; c.w = t.w; c.h = t.h; c.init = true; }
  else { const k = 1 - Math.exp(-dt * 7); c.x += (t.x - c.x) * k; c.y += (t.y - c.y) * k; c.w += (t.w - c.w) * k; c.h += (t.h - c.h) * k; }
  const same = Math.abs(t.x - c.x) < 0.05 && Math.abs(t.y - c.y) < 0.05 && Math.abs(t.w - c.w) < 0.05;
  if (same) { c.x = t.x; c.y = t.y; c.w = t.w; c.h = t.h; }
  const vb = `${c.x.toFixed(2)} ${c.y.toFixed(2)} ${c.w.toFixed(2)} ${c.h.toFixed(2)}`;
  if (svg._gwVb !== vb) { svg._gwVb = vb; svg.setAttribute('viewBox', vb); }
  c.dirty = !same;
}
function _gwUpdateCamUi() {
  const box = _gw.root && _gw.root.querySelector('.gd-camui'); if (!box) return;
  const world = window.GardenNative && GardenNative.world(), controls = world && world.cameraControls ? world.cameraControls() : null, fit = controls ? controls.mode === 'fit' : gardenCamMode() === 'fit';
  const f = box.querySelector('[data-cam="fit"]'); if (f) { f.setAttribute('aria-pressed', fit ? 'true' : 'false'); }
  const i = _gwCamZoomIdx();
  const zi = box.querySelector('[data-cam="in"]'); if (zi) zi.disabled = controls ? !controls.canZoomIn : !fit && i <= 0;
  const zo = box.querySelector('[data-cam="out"]'); if (zo) zo.disabled = controls ? !controls.canZoomOut : !fit && i >= GW_ZOOMS.length - 1;
}
function _gwBuildCamUi(stagebox) {
  if (stagebox.querySelector('.gd-camui')) return;
  const bar = document.createElement('div'); bar.className = 'gd-camui'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Camera');
  const b = (cam, ic, tip, aria) => { const e = document.createElement('button'); e.type = 'button'; e.className = 'gd-cambtn'; e.dataset.cam = cam; e.innerHTML = icon(ic); e.setAttribute('data-tip', tip); e.setAttribute('aria-label', aria); e.onclick = (ev) => { ev.stopPropagation(); if (cam === 'in') gardenCamSet(null, -1); else if (cam === 'out') gardenCamSet(null, 1); else if (cam === 'fit') gardenCamSet(gardenCamMode() === 'fit' ? 'follow' : 'fit'); else if (cam === 'me') { gardenCamSet('follow'); } }; return e; };
  bar.append(b('in', 'plus', 'Closer (+)', 'Closer'), b('out', 'minus', 'Further away (−)', 'Further away'), b('me', 'locate-fixed', 'Back to me (C)', 'Back to me'));
  stagebox.appendChild(bar);
  // the mouse wheel zooms; a pinch or ctrl-wheel too
  stagebox.addEventListener('wheel', (ev) => {
    if (!/^garden(:|$)/.test(String(state.view || '')) || _gw.reel) return;
    if (!_gdp.svg || !_gdp.svg.contains(ev.target)) return;   // the bag and the bubble scroll by themselves
    ev.preventDefault();
    // a notch is one step; a trackpad's little deltas add up to one, rather than racing through them all
    _gw.wheel = (_gw.wheel || 0) + (ev.deltaMode === 1 ? ev.deltaY * 40 : ev.deltaY);
    if (Math.abs(_gw.wheel) < 60) return;
    const dir = _gw.wheel > 0 ? 1 : -1; _gw.wheel = 0;
    gardenCamSet(null, dir);
  }, { passive: false });
}

/* ---------- the loop ---------- */
/*
 * Calm (2.28; the owner, 31 Oct 2026: "optimize it to not consume CPU when it's not open ... graphics"). Measured on this stage: an open, idle garden kept
 * a core about 40% busy, almost all of it painting: 70-odd ambient CSS animations (clouds, leaves, wings, water, pets) each repaint the stage every frame
 * while the scripts take 2%. So when nobody is looking, the ambient motion rests: the window has not had the focus for 8 seconds, or there has been no
 * pointer or key for 90 seconds and nobody is in the garden with you. Any pointer, key or focus wakes it at once; it pauses and resumes in place.
 */
const _gwCalm = { on: false, input: Date.now(), blur: 0, hid: false };   // clock-ok: when you last did something
function _gwCalmSet(on) { if (_gwCalm.on === on) return; _gwCalm.on = on; if (_gw.root) _gw.root.classList.toggle('gd-calm', on); }
/**
 * Indoors (the owner: "all of the extra internal rooms seem to be incredibly slow and laggy"). A room covers the whole window, so once it has faded in the stage under it is taken out of the page's drawing altogether.
 * Measured before this: every pointer move in a room woke the garden and the next look put it back to rest, and flipping that class restyled the whole stage: about 90% of a core, frames down from 160 a second to 20.
 * Only the drawing goes: the loop still looks in twice a second, and the fish clock, the host's answers and friends' messages run on as they were.
 */
function _gwIndoors(on) {
  if (window.GardenPhaser && GardenPhaser.wanted()) GardenPhaser.indoor(on);
  if (!on && _gdp.owed) { _gdp.owed = false; gardenRepaintSoon(); }
  if (_gwCalm.hid === on) return;
  _gwCalm.hid = on; document.body.classList.toggle('gd-room-in', on);   // (on the body: the stage can be rebuilt while you are in a room, and the new one must stay hidden too)
  if (on) { if (typeof petGardenSuspend === 'function') petGardenSuspend(); _gwCalmSet(true); return; }
  _gwCalm.input = Date.now(); _gwCalmSet(false);   // clock-ok: idle time
}
function _gwCalmTick() {
  const t = Date.now(), focused = typeof document.hasFocus === 'function' ? document.hasFocus() : true;   // clock-ok: idle time
  if (focused) _gwCalm.blur = 0; else if (!_gwCalm.blur) _gwCalm.blur = t;
  const away = !focused && _gwCalm.blur > 0 && t - _gwCalm.blur > 8000;
  const company = typeof _gll !== 'undefined' && _gll.actors && _gll.actors.size > 0;   // friends here: you are watching them
  const idle = !!(away || (!company && t - _gwCalm.input > 90000));
  _gwCalmSet(idle || _gwCalm.hid);   // (in a room, the stage under it is not being drawn)
  if (_grm.root) _grm.root.classList.toggle('is-calm', idle);
}
if (typeof window !== 'undefined') {
  const wake = () => { _gwCalm.input = Date.now(); if (_gwCalm.hid) { if (_grm.root) _grm.root.classList.remove('is-calm'); return; } if (_gwCalm.on) { _gwCalmSet(false); if (_gw.idleT) { clearTimeout(_gw.idleT); _gw.idleT = 0; } if (typeof _gwEnsureLoop === 'function') _gwEnsureLoop(); } };   // clock-ok: idle time
  for (const ev of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart']) window.addEventListener(ev, wake, { passive: true, capture: true });
  window.addEventListener('focus', wake);   // (the pets' roaming loop, 97-pets-7roam.js, rests while it is calm too)
}
function _gwEnsureLoop() { if (window.GardenNative && GardenNative.active()) return; if (!_gw.on || _gw.raf || document.hidden || window.GardenPhaser && GardenPhaser.active(_gw.svg)) return; if (_gw.idleT) { clearTimeout(_gw.idleT); _gw.idleT = 0; } _gw.last = 0; _gw.raf = requestAnimationFrame(_gwFrame); }
/** Is anything in the view moving, or about to? Every frame asked for is a frame the whole stage paints, so an idle garden looks up only a few times a second. */
function _gwPace() {
  if (_grm.on || _ee.on) return _gw.reel || (_gw.fishing && _gw.fishing.state !== 'idle') ? 60 : 2;   // indoors: a line in a room's water still runs here, nothing else needs to
  if (_gw.keys.size || _gw.hold || _gw.path.length || _gw.moving || _gw.netting || _gw.reel || _gw.cam.dirty || _gw.routeOn || _gw.pet && _gw.pet.moving) return 60;
  if (_gw.fishing && _gw.fishing.state !== 'idle') return 60;
  if (_gw.bugsBusy) return 30;
  if (typeof _gll !== 'undefined') for (const A of _gll.actors.values()) if (A.fish || A.pose || (A.pp && (A.pp.busy > 0 || A.pp.tx != null))) return 60;   // someone's line, pose or pet in view (94-garden-live-4fx.js)
  for (const S of _gwSprites) if (!S.simulationOnly && S.update && !S.still && (S.quiet || 0) < 0.35 && _gwInView(S.x, S.y, 1.5)) return 30;   // one that has not moved for a moment, or is off screen, does not count
  return 10;
}
/**
 * What moves is taken off the page while it is well out of the view (3.5 cells past the edge, further than the camera goes in a look, so it is always back before you could see it).
 * Only the drawing: what it is doing carries on, so a friend's fish, a pet's errand and the host's decisions are not affected. `o` is whatever keeps its state. True when it is off.
 */
const GW_CULL = 3.5;
function _gwCullBoxView(box, x, y, lift, view) {
  const W = GARDEN_WORLD, margin = GW_CULL * W.cellW;
  // Unknown presentation geometry must remain visible, never become a
  // point-sized substitute for this long authored road.
  if (!view || !Number.isFinite(view.x) || !Number.isFinite(view.y) || !Number.isFinite(view.w) || !Number.isFinite(view.h) || view.w <= 0 || view.h <= 0 || !Number.isFinite(box.x) || !Number.isFinite(box.y) || !Number.isFinite(box.width) || !Number.isFinite(box.height) || box.width <= 0 || box.height <= 0 || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(lift)) return true;
  const left = x * W.cellW + box.x, top = W.sky + y * W.cellH - lift + box.y;
  if (!Number.isFinite(left + box.width) || !Number.isFinite(top + box.height)) return true;
  return left + box.width > view.x - margin && left < view.x + view.w + margin && top + box.height > view.y - margin && top < view.y + view.h + margin;
}
function gardenCull(o, node, x, y, view) {
  const box = o.id === 'wd-stones' && o.cullBox;
  // Only the stone road opts into body bounds. Existing actors keep their
  // point/goal policy. An explicit photo view uses that actual viewport.
  let off;
  if (box) {
    const lift = o.lift == null ? 0 : o.lift, visible = _gwCullBoxView(box, x, y, lift, view || _gw.cam);
    const goalVisible = !view && _gw.cam.goal && _gwCullBoxView(box, x, y, lift, _gw.cam.goal);
    off = !visible && !goalVisible;
  } else off = !_gwInView(x, y, GW_CULL) && !_gwInCamGoal(x, y);
  if (o._off !== off) { o._off = off; node.classList.toggle('gart-off', off); }
  return off;
}
/** Is this point (cells) in the view the camera is on its way to, zooming or following a catch? (With the margin: it is on the page before the view gets there.) */
function _gwInCamGoal(x, y) {
  const t = _gw.cam.goal, W = GARDEN_WORLD; if (!t) return false;
  const mg = GW_CULL * W.cellW, px = x * W.cellW, py = W.sky + y * W.cellH;
  return px > t.x - mg && px < t.x + t.w + mg && py > t.y - mg && py < t.y + t.h + mg;
}
/** Is this point (cells) on screen, give or take `m` cells? */
function _gwInView(x, y, m) {
  if (x >= GARDEN_ROOM_X) return true;   // a room's water: the room looks after itself
  const c = _gw.cam, W = GARDEN_WORLD, mg = (m || 0) * W.cellW, px = x * W.cellW, py = W.sky + y * W.cellH;
  return px > c.x - mg && px < c.x + c.w + mg && py > c.y - mg && py < c.y + c.h + mg;
}
function _gwFrame(ts, rendererTick) {
  _gw.raf = 0;
  if (window.GardenNative && GardenNative.active()) return;
  if (!rendererTick && window.GardenPhaser && GardenPhaser.active(_gw.svg)) return;
  if (!_gw.on || !_gw.root || !_gw.root.isConnected || !_gw.svg || !_gw.svg.isConnected) { _gw.on = _gw.on && !!_gw.root && _gw.root.isConnected; if (_gw.on) { _gw.raf = requestAnimationFrame(_gwFrame); } return; }
  if (document.hidden) return;
  _gw.frameActive = true; _gw.frameGrid = null;
  try {
  _gw.framePrefs = _gdpPrefs();
  _gwCalmTick();
  const dt = Math.min(0.11, _gw.last ? (ts - _gw.last) / 1000 : 0.016); _gw.last = ts; _gw.t = (_gw.t || 0) + dt;
  const W = GARDEN_WORLD;
  // 1. where you are going: the keys, or the way you clicked (a free line round whatever is in the way, with a soft start and stop)
  let mvx = 0, mvy = 0;
  const k = _gw.keys;
  if (k.has('left')) mvx -= 1; if (k.has('right')) mvx += 1; if (k.has('up')) mvy -= 1; if (k.has('down')) mvy += 1;
  const reeling = !!(_gw.fishing && ['reel', 'bite'].includes(_gw.fishing.state));
  const casting = !!_gw.fishing && _gw.fishing.state !== 'idle';
  const pushed = _gwPushOut(dt);   // standing inside something that grew or was put down: ease out first, then walk on
  const byKeys = !pushed && !!(mvx || mvy) && !casting;   // a line out locks you in: the keys do nothing until it is in (Esc)
  if (_gw.hold && (casting || byKeys)) _gw.hold = null;
  // holding the button for a moment (or dragging): steer straight at the pointer, sliding along whatever is in the way, like the keys do
  const H = _gw.hold;
  if (H && !H.steer && (_gw.t || 0) - H.t0 > 0.28) H.steer = true;
  let direct = byKeys, hpt = null;
  if (H && H.steer && !pushed && !byKeys) { hpt = _gwPointAt({ clientX: H.cx, clientY: H.cy }); direct = !!hpt; }
  let want = 0, ux = 0, uy = 0, sneak = _gw.sneak, tgt = null, dist = 0;
  if (pushed) { /* gliding out */ }
  else if (direct && !byKeys) {
    const dxp = (hpt.x - _gw.px) * W.cellW, dyp = (hpt.y - _gw.py) * W.cellH, d = Math.hypot(dxp, dyp);
    _gw.path = []; _gw.then = null; _gw.replan = false; sneak = false;
    if (_gw.netting && _gw.netting.state === 'chase') _gw.netting = null;
    if (d < 12) direct = false;   // right under the pointer: stand there
    else { ux = dxp / d; uy = dyp / d; want = Math.min(d > 150 ? GW_SPEED.run : GW_SPEED.walk, Math.sqrt(2 * GW_ACC * d) + 34); }
  }
  else if (byKeys) {
    if (casting) _gwFishCancel('You reeled in to walk.');
    _gw.netting = null; _gw.path = []; _gw.then = null; _gw.replan = false;
    sneak = k.has('shift');
    const len = Math.hypot(mvx * W.cellW, mvy * W.cellH); ux = mvx * W.cellW / len; uy = mvy * W.cellH / len;
    want = sneak ? GW_SPEED.sneak : GW_SPEED.walk * _gwWalkBonus();
  } else if (_gw.path.length && !casting) {
    // cut corners: as soon as you can see the waypoint after the next, head for that one (no visiting the middle of cells)
    while (_gw.path.length > 1 && _gwLos({ x: _gw.px, y: _gw.py }, _gw.path[1], GW_CLEAR)) _gw.path.shift();
    tgt = _gw.path[0];
    const dxp = (tgt.x - _gw.px) * W.cellW, dyp = (tgt.y - _gw.py) * W.cellH;
    dist = Math.hypot(dxp, dyp); ux = dxp / (dist || 1); uy = dyp / (dist || 1);
    let rem = dist; for (let i = 1; i < _gw.path.length; i++) rem += Math.hypot((_gw.path[i].x - _gw.path[i - 1].x) * W.cellW, (_gw.path[i].y - _gw.path[i - 1].y) * W.cellH);
    sneak = _gw.sneak;
    want = sneak ? GW_SPEED.sneak : (rem > 170 ? GW_SPEED.run : GW_SPEED.walk) * _gwWalkBonus();
    want = Math.min(want, Math.sqrt(2 * GW_ACC * rem) + 34);   // ease in to the stop
  }
  if (want && typeof gardenPlayWalk === 'function') want *= gardenPlayWalk();   // a dish that gives you light feet (94-garden-play-3cook.js)
  _gw.spd = _gw.spd || 0;
  if (!want) _gw.spd = 0;
  else if (!gardenMotionOn()) _gw.spd = want;
  else { const a = GW_ACC * dt; _gw.spd += Math.max(-a * 1.4, Math.min(a, want - _gw.spd)); }
  if (want && _gw.spd > 3) {
    const step = _gw.spd * dt;
    if (direct) {
      // slide along walls and round corners, never stop on them
      const moved = _gwMoveBy(ux * step / W.cellW, uy * step / W.cellH);
      _gw.moving = moved; if (!moved) _gw.spd = 0;
      if (Math.abs(ux) > 0.3) _gw.face = ux > 0 ? 1 : -1;
    } else {
      let arrived = false, remaining = step;
      // Spend this frame's distance across waypoints. Dropping the remainder
      // at each bend made a route slow down according to the frame rate.
      while (_gw.path.length && remaining > 1e-7) {
        tgt = _gw.path[0];
        const dxp = (tgt.x - _gw.px) * W.cellW, dyp = (tgt.y - _gw.py) * W.cellH;
        dist = Math.hypot(dxp, dyp); ux = dxp / (dist || 1); uy = dyp / (dist || 1);
        if (dist <= remaining && _gwLos({ x: _gw.px, y: _gw.py }, tgt)) {
          _gw.px = tgt.x; _gw.py = tgt.y; remaining -= dist;
          _gw.path.shift(); _gw.blockT = 0; arrived = !_gw.path.length;
          continue;
        }
        const px0 = _gw.px, py0 = _gw.py;
        // A changed obstacle can invalidate even the last short segment.
        const moved = dist > remaining && _gwMoveBy(ux * remaining / W.cellW, uy * remaining / W.cellH);
        // how much of the step went the way we are heading: sliding sideways along a wall that is in the way is not getting anywhere
        const gain = moved ? ((_gw.px - px0) * W.cellW * ux + (_gw.py - py0) * W.cellH * uy) / Math.max(remaining, 0.01) : 0;
        _gw.blockT = gain < 0.35 ? (_gw.blockT || 0) + dt * remaining / step : 0;
        if (!moved || _gw.blockT > 0.25) {
          // the way is shut (something grew, or a corner caught the feet): plan another way to the same place, and stop only if there is none
          _gw.spd = 0; _gw.blockT = 0;
          if (!_gwRepath()) { _gw.path = []; _gw.then = null; }
        }
        break;
      }
      _gw.moving = _gw.spd > 3 || arrived;
      // Arrival actions may turn toward their target; apply the walk heading first.
      if (Math.abs(ux) > 0.3) _gw.face = ux > 0 ? 1 : -1;
      if (arrived) { _gw.moving = false; _gw.spd = 0; const th = _gw.then; _gw.then = null; _gwSaveSoon(); if (typeof th === 'function') { try { th(true); } catch (e) { console.error('[garden]', e); } } }
    }
    _gw.sneak = sneak;
    if (_gw.moving) _gwSaveSoon();
  } else if (_gw.moving) { _gw.moving = false; _gwSaveSoon(); }
  if (pushed) { _gw.moving = true; _gwSaveSoon(); }
  if (_gw.moving !== _gw._wasMoving) { _gw._wasMoving = _gw.moving; _gwBody(); }
  _gwApplyNode();
  _gwRouteFrame();
  if (byKeys && (mvx || mvy)) { gardenWalkedOnce(); if (_gh.bubble) gardenBubbleClose(); if (_gw.routeOn) _gwRouteShow(false); }
  _gwFadeProps();
  // 2. the things that live in the actors layer
  if (typeof _gwFishFrame === 'function') _gwFishFrame(dt);
  if (typeof _gwBugsFrame === 'function') _gwBugsFrame(dt);
  _gwPetFrame(dt);
  _gwSpritesFrame(dt);
  if (typeof gardenLifeVisitFrame === 'function') gardenLifeVisitFrame(ts);
  // 3. the camera
  if (gardenCamMode() === 'fit' ? _gw.cam.dirty : true) _gwApplyCam(dt);
  if (_gw.cam.dirty && !_gwCalm.hid && typeof _gartRestItems === 'function' && _gw.t - (_gw.restAt || 0) > 0.12) { _gw.restAt = _gw.t; _gartRestItems(_gw.svg); }   // what is drawn follows the view
  gardenHudFrame();
  // (something in this frame may have asked for the loop already: a walk begun on arrival, a sprite added. Two chains of frames, the second with dt 0, stop you dead: a step of nothing looks like a wall)
  if (_gw.raf || window.GardenPhaser && GardenPhaser.active(_gw.svg)) return;
  let pace = _gwPace();
  if (_gwCalm.on && pace < 60) pace = 2;   // calm: nobody is looking: look in twice a second (anything you do wakes it, and the next look is then at once)
  if (pace >= 60) _gw.raf = requestAnimationFrame(_gwFrame);
  else if (!_gw.idleT) _gw.idleT = setTimeout(() => { _gw.idleT = 0; if (_gw.on && !_gw.raf && !document.hidden) _gw.raf = requestAnimationFrame(_gwFrame); }, pace >= 30 ? 26 : pace <= 2 ? 500 : 90);
  } finally { _gw.frameActive = false; _gw.frameGrid = null; _gw.framePrefs = null; }
}
/** Equipment changes with a garden revision, rather than every walking frame. */
function _gwWalkBonus() {
  const source = typeof state !== 'undefined' && state ? state.garden : null;
  if (_gw.walkBonusRev !== _gd.rev || _gw.walkBonusSource !== source) {
    _gw.walkBonus = gardenLandWalkK(); _gw.walkBonusRev = _gd.rev; _gw.walkBonusSource = source;
  }
  return _gw.walkBonus;
}
/** A building you walk behind turns see-through, so you never lose yourself behind the shop. */
function _gwFadeProps() {
  const key = Math.floor(_gw.px * 2) + ',' + Math.floor(_gw.py * 2) + ',' + (_gw.svg && _gw.svg._gwFadeGen);
  if (_gw._fadeKey === key || !_gw.svg) return;
  _gw._fadeKey = key;
  // (the nodes are remembered: a search of the stage per building, every half cell walked, was a tenth of the frame)
  const svg = _gw.svg; let els = svg._gwPropEls;
  if (!els || svg._gwPropGen !== svg._gwFadeGen || svg._gwPropN !== svg.querySelector('.gd-objects').childElementCount) {
    els = svg._gwPropEls = new Map(); svg._gwPropGen = svg._gwFadeGen; svg._gwPropN = svg.querySelector('.gd-objects').childElementCount;
    for (const n of svg.querySelectorAll('.gd-prop[data-prop]')) { const id = n.getAttribute('data-prop'); let nodes = els.get(id); if (!nodes) { nodes = []; els.set(id, nodes); } nodes.push(n); }
  }
  for (const p of gardenPropsNow()) {
    if (!p.kind) continue;
    const nodes = els.get(p.id); if (!nodes) continue;
    const tall = p.tall == null ? 2 : p.tall;
    const behind = _gw.px > p.x - 0.4 && _gw.px < p.x + p.w + 0.4 && _gw.py > p.y - tall + 0.7 && _gw.py < p.y + p.h - 0.05;
    for (const n of nodes) if (!!n._gwBehind !== behind) { n._gwBehind = behind; n.classList.toggle('gd-behind', behind); }
  }
}
const GW_POS_KEY = 'opendash.garden.pos'; // exact legacy value is retained for recovery.
function _gwPositionKey() {
  if (GARDEN_WORLD.v < 3) return GW_POS_KEY;
  return typeof GARDEN_WORLD.lh === 'string' && /^[0-9a-f]{24}$/.test(GARDEN_WORLD.lh) ? GW_POS_KEY + '.v' + GARDEN_WORLD.v + '.' + GARDEN_WORLD.lh : null;
}
function _gwOutdoorPosition(p) { return !!p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.y >= 0 && p.x < GARDEN_WORLD.cols && p.y < GARDEN_WORLD.rows; }
function _gwSaveSoon() {
  if (typeof gardenVisitOn === 'function' && gardenVisitOn()) return;
  const key = _gwPositionKey(); if (!key || !_gwOutdoorPosition({ x: _gw.px, y: _gw.py })) return;
  if (GARDEN_WORLD.v >= 3 && typeof gardenWorldReady === 'function' && !gardenWorldReady()) return;
  _gw.saveDue = performance.now() + 1200; _gw.savePosKey = key;
  _gw.saveX = Math.round(_gw.px * 10) / 10; _gw.saveY = Math.round(_gw.py * 10) / 10;
  if (!_gw.saveT) _gw.saveT = setTimeout(_gwSavePosition, 1200);
}
function _gwSavePosition() {
  _gw.saveT = 0;
  const wait = _gw.saveDue - performance.now();
  if (wait > 1) { _gw.saveT = setTimeout(_gwSavePosition, wait); return; }
  const key = _gwPositionKey(), point = { x: _gw.saveX, y: _gw.saveY };
  if (!key || key !== _gw.savePosKey || !_gwOutdoorPosition(point) || typeof gardenVisitOn === 'function' && gardenVisitOn()) return;
  if (GARDEN_WORLD.v >= 3 && typeof gardenWorldReady === 'function' && !gardenWorldReady()) return;
  const value = GARDEN_WORLD.v >= 3 ? { wv: GARDEN_WORLD.v, lh: GARDEN_WORLD.lh, ...point } : point;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private window: no position persistence */ }
}
function _gwRestorePosition(point) {
  if (!_gwOutdoorPosition(point)) return null; // room sentinel columns remain the room owner's coordinates.
  if (_gwFree(point.x, point.y)) return { x: point.x, y: point.y };
  let best = _gwNearestFreePt(point.x, point.y, 3), distance = best ? ((best.x - point.x) * GARDEN_WORLD.cellW) ** 2 + ((best.y - point.y) * GARDEN_WORLD.cellH) ** 2 : Infinity;
  const grid = _gwGridNow(), W = GARDEN_WORLD;
  for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
    if (grid[y * W.cols + x]) continue;
    const p = _gwCellPoint({ x, y }, grid), d = ((p.x - point.x) * W.cellW) ** 2 + ((p.y - point.y) * W.cellH) ** 2;
    if (d < distance && _gwFree(p.x, p.y)) { best = p; distance = d; }
  }
  return best ? { x: best.x, y: best.y } : null;
}
function _gwSavedPos() {
  if (typeof gardenVisitOn === 'function' && gardenVisitOn()) return null;
  const key = _gwPositionKey(); if (!key) return null;
  if (GARDEN_WORLD.v >= 3 && typeof gardenWorldReady === 'function' && !gardenWorldReady()) return null;
  try {
    const raw = localStorage.getItem(key), current = raw ? JSON.parse(raw) : null;
    if (GARDEN_WORLD.v < 3) return current && Number.isFinite(current.x) && Number.isFinite(current.y) ? current : null;
    const tagged = current && current.wv === GARDEN_WORLD.v && current.lh === GARDEN_WORLD.lh;
    const legacyRaw = tagged ? null : localStorage.getItem(GW_POS_KEY), legacy = legacyRaw ? JSON.parse(legacyRaw) : null;
    const before = tagged ? current : legacy;
    // A raw legacy foot becomes a current foot only after the real new coast,
    // solids and current owned access have accepted or relocated it.
    const point = _gwRestorePosition(before); if (!point) return null;
    _gw.positionLayout = key;
    if (!tagged || point.x !== before.x || point.y !== before.y) {
      const resolution = { wv: GARDEN_WORLD.v, lh: GARDEN_WORLD.lh, ...point, restoredFrom: { kind: tagged ? 'same-layout-obstruction' : 'legacy', x: before.x, y: before.y } };
      try { localStorage.setItem(key, JSON.stringify(resolution)); } catch (e) { /* accepted foot still works without persistence */ } // exact old key is never changed/removed.
    }
    return point;
  } catch (e) { return null; }
}

/* ---------- the pet: it trots after you, sits when you stop, and sits at the pier while you fish ---------- */
function _gwPetSprite() {
  if (typeof window === 'undefined' || typeof window.petGardenSprite !== 'function') return null;
  const m = gardenHere(), key = [m.season, m.tod, !!m.rain.now].join('|');
  if (_gw.petKey === key && _gw.petSvg !== undefined) return _gw.petSvg;
  let list = null;
  try { list = window.petGardenSprite({ season: m.season, tod: m.tod, size: 'm', readOnly: false, rain: !!m.rain.now }); } catch (e) { list = null; }
  if (list && !Array.isArray(list)) list = [list];
  const p = list && list[0];
  _gw.petKey = key; _gw.petSvg = p && typeof p.svg === 'string' && p.svg.length < 40000 ? p.svg : '';
  return _gw.petSvg;
}
function _gwPetFrame(dt) {
  if (typeof petGardenWorldOwns === 'function' && petGardenWorldOwns()) { if (_gw.pet && _gw.pet.node) _gw.pet.node.remove(); _gw.pet = null; return; }   // 97-pets-7roam.js: your pets are out
  const svg = _gwPetSprite();
  const W = GARDEN_WORLD;
  if (!svg) { if (_gw.pet && _gw.pet.node && _gw.pet.node.parentNode) _gw.pet.node.remove(); _gw.pet = null; return; }
  let P = _gw.pet;
  if (!P || !P.node || P.svg !== svg) {
    if (P && P.node && P.node.parentNode) P.node.remove();
    if (_gw.svg) for (const n of _gw.svg.querySelectorAll('.gd-pet-follow')) n.remove();
    const NS = 'http://www.w3.org/2000/svg', g = gardenSceneElement('g');
    g.setAttribute('class', 'gd-pet gd-pet-follow'); g.setAttribute('data-live', '1'); g.setAttribute('data-z', String(_gw.py));
    g.innerHTML = `<g class="gdp-body"><g class="gdp-face"><g transform="scale(${GW_PET_SCALE})">${svg}</g></g></g>`;
    P = _gw.pet = { node: g, svg, x: _gw.px - 1.2, y: _gw.py + 0.2, face: 1, z: -1, moving: false };
  }
  // follow: keep about a cell and a half behind, never on top of you
  const goal = typeof gardenLifePetGoal === 'function' ? gardenLifePetGoal(P, dt) : null;   // it has noticed something (94-garden-life-4react.js): null means carry on following
  const dx = ((goal ? goal.x : _gw.px) - P.x) * W.cellW, dy = ((goal ? goal.y : _gw.py) - P.y) * W.cellH, dist = Math.hypot(dx, dy), want = goal ? goal.near || 14 : 40;
  let mv = false;
  if (dist > want + 10 || (goal && dist > want)) {
    const sp = Math.min((goal && goal.fast ? 240 : _gw.moving ? 260 : 170), dist - want) * dt;
    const nx = P.x + dx / dist * sp / W.cellW, ny = P.y + dy / dist * sp / W.cellH;
    const slide = gardenWorldSlide(P.x, P.y, nx - P.x, ny - P.y, .1, P.shoreMove || (P.shoreMove = {})); P.x = slide.x; P.y = slide.y; mv = slide.moved;
    // caught on a corner: it hops to your heel rather than running on the spot
    P.stuck = mv ? 0 : (P.stuck || 0) + dt;
    if (P.stuck > 0.5) { const f = _gwNearestFreePt(_gw.px - 0.8, _gw.py + 0.2, 2); if (f) { P.x = f.x; P.y = f.y; } P.stuck = 0; }
    if (Math.abs(dx) > 4) P.face = dx > 0 ? 1 : -1;
  }
  if (Math.hypot((_gw.px - P.x) * W.cellW, (_gw.py - P.y) * W.cellH) > 320) { P.x = _gw.px - 1; P.y = _gw.py; }
  P.moving = mv;
  const x = P.x * W.cellW, y = W.sky + P.y * W.cellH;
  const hop = mv && gardenMotionOn() ? -Math.abs(Math.sin(_gw.t * 14)) * 2.2 : 0, tfp = `translate(${x.toFixed(1)} ${(y + hop).toFixed(1)})`;
  if (P.tf !== tfp || !P.node.parentNode) { P.tf = tfp; P.node.setAttribute('transform', tfp); P.node.setAttribute('data-z', (P.y + 0.001).toFixed(2)); }
  if (P.fk !== P.face) { P.fk = P.face; const face = P.node.querySelector('.gdp-face'); if (face) face.setAttribute('transform', P.face < 0 ? 'scale(-1 1)' : ''); }
  const z = Math.floor(P.y * 2); if (z !== P.z || !P.node.parentNode) { P.z = z; _gwPlace(P.node, P.y); }
}

/* ---------- clicks: you just click what you want ---------- */
/**
 * The building, board or box under the pointer: what is actually drawn there, so a click on the lawn beside a roof is a click on the lawn (2.22 used
 * a rectangle `tall` rows high, and the lawn in front of the shop opened the shop). Without a pointer: its footprint.
 */
function _gwPropAtPt(wx, wy, ev) {
  if (ev && (window.GardenNative && GardenNative.active() || window.GardenPhaser && GardenPhaser.active(_gw.svg))) { const hit = gardenWorldVisualPick(ev); if (!hit || !hit.prop) return null; const p = gardenPropsNow().find(x => x.id === hit.prop) || gardenLandSiteProp(hit.prop); return p && p.act ? p : null; }
  if (ev && ev.clientX != null && typeof document.elementFromPoint === 'function') {
    const el = document.elementFromPoint(ev.clientX, ev.clientY), g = el && el.closest ? el.closest('.gd-prop[data-prop]') : null;
    if (g) { const id = g.getAttribute('data-prop'), p = gardenPropsNow().find(x => x.id === id) || gardenLandSiteProp(id); if (p && p.act) return p; }
  }
  for (const p of gardenPropsNow()) { if (p.act && (!p.needs || gardenWorkOwned(p.needs)) && wx >= p.x && wx <= p.x + p.w && wy >= p.y && wy <= p.y + p.h) return p; }
  return null;
}
function _gwOpenProp(p) {
  if (!p) return;
  const go = {
    tackle: () => gardenPopupOpen('catch', { sub: 'tackle', title: 'Tackle shop' }), journal: () => gardenJournalOpen(),
    shop: () => gardenPopupOpen('shop'), basket: () => gardenPopupOpen('basket'), almanac: () => gardenPopupOpen('almanac'), friends: () => gardenPopupOpen('friends'),
    photo: () => { if (typeof gardenPhotoOpen === 'function') gardenPhotoOpen(); }, timelapse: () => { if (typeof gardenTimelapseOpen === 'function') gardenTimelapseOpen(); },
    sail: () => { if (typeof gardenBoatAsk === 'function' && gardenBoatAsk()) return; gardenPopupOpen('sail'); },
    hall: () => gardenPopupOpen('catch', { sub: 'hall', title: 'The lake hall' }), lake: () => gardenPopupOpen('catch', { sub: 'lake', title: 'The lake' }),
    angler: () => { if (typeof wdAnglerTalk === 'function' && wdAnglerTalk(p)) return; gardenPopupOpen('catch', { sub: 'lake', title: 'The old angler' }); },   // he talks first, once a day (94-garden-wonder-1kin.js) smoker: () => gardenPopupOpen('catch', { sub: 'lake', title: 'The smoker' }),
    craft: () => gardenPopupOpen('craft'),
    lands: () => gardenPopupOpen('lands'),
    lf: () => gardenLandPropOpen(p),
  }[p.act];
  if (go && p.door && typeof gardenSfx === 'function') gardenSfx('door');
  if (go) go();
}
/** The actual standing point for a prop, in continuous world cells. */
function _gwPropApproachPoint(p, fallback = true) {
  // The fixed little bridge shares the Vale crossing's boards. Its old
  // catalogue doorway was not moved by the layout's explicit null door.
  if (p.id === 'ld-bridge' && GARDEN_WORLD.v >= 5 && typeof gardenIslandCrossingGeometry === 'function' && !(typeof gardenBuildLookOf === 'function' && Object.values(gardenBuildLookOf(p.id) || {}).some(Boolean))) {
    const fixed = (gardenIslandData().static || []).find(row => row.id === p.id);
    if (fixed && p.x === fixed.x && p.y === fixed.y && p.w === fixed.w && p.h === fixed.h) {
      const crossing = gardenIslandCrossingGeometry().find(c => c.crossing.id === 'falls-footbridge');
      if (crossing) { const point = crossing.deckPoint(.5, 0), W = GARDEN_WORLD; return { x: point.x / W.cellW, y: (point.y - W.sky) / W.cellH }; }
    }
  }
  if (!p.door && !fallback) return null;
  const d = p.door || { x: Math.floor(p.x + p.w / 2), y: p.y + p.h };
  return { x: d.x + .5, y: d.y + .5 };
}
/** Walk to a building's door and go in. */
function _gwGoToProp(p) {
  const door = _gwPropApproachPoint(p);
  if (Math.hypot((door.x - _gw.px) * GARDEN_WORLD.cellW, (door.y - _gw.py) * GARDEN_WORLD.cellH) < 56) { _gw.path = []; _gwOpenProp(p); return; }
  if (!gardenWalkToPoint(door, () => _gwOpenProp(p), { radius: 1.5 })) gameDeny(_gdp.svg && _gdp.svg.querySelector(`.gd-prop[data-prop="${p.id}"]`), { say: 'You cannot get to the door.' });
}
function gardenGoToProp(id) { const p = GARDEN_PROPS.find(x => x.id === id); if (p) _gwGoToProp(p); }
/** Walk to whichever building does this (`act` in GARDEN_PROPS). */
function gardenGoToAct(act) { const p = GARDEN_PROPS.find(x => x.act === act); if (p) _gwGoToProp(p); }
/**
 * What a click here would do: ONE answer, used by the hover (what lights up, the cursor) and by the click and the press, so the
 * highlight never promises something else. {kind: 'prop' | 'seed' | 'bug' | 'plant' | 'decor' | 'land' | 'water' | 'spot' | 'ground' | 'none', ...}.
 * it: the plant or decoration under the pointer ({uid, kind}) or null; cell: the cell or null.
 */
const GW_BUG_PICK = Object.freeze({ open: 0.5, onPlant: 0.2 });   // how near in cells counts as clicking a bug: forgiving on open ground, exact on a plant
/** Tools can reach canonical beds beneath a roof's visual overhang. */
function _gwPlantPickIntent(m, pt) {
  const tool = _gdpTool(), cell = { x: Math.floor(pt.x), y: Math.floor(pt.y) }, W = GARDEN_WORLD;
  if (cell.x < 0 || cell.y < 0 || cell.x >= W.cols || cell.y >= W.rows) return { tool, cell, plant: null, plantTool: false, seed: false, emptyBed: false };
  const plant = _gdpPlantAtCell(m, cell), plantTool = ['water', 'feed', 'trim', 'dig'].includes(tool);
  const seedDef = tool === 'seed' && _gdp.seed ? gardenPlant(_gdp.seed) : null;
  const seed = !!seedDef && !_gdPlaceOk(m, seedDef, cell.x, cell.y, 'plant');
  const area = tool === 'hand' && !plant ? gardenArea(gardenAreaAt(cell.x, cell.y, m.level.level)) : null;
  const emptyBed = !!(area && area.cats && area.cats.length && !m.occ.has(cell.x + ',' + cell.y) && !(m.visit && m.visit.no.plant));
  return { tool, cell, plant, plantTool, seed, emptyBed };
}
function _gwPropOwnsPoint(prop, pt) {
  // An unbuilt site's artwork is its price marker. Its future building
  // footprint is empty ground and must not intercept plants or insects.
  if (prop.site) return false;
  // A small prop (a lectern, the sundial, a post box: 'soft') owns only the ground right under it; its painted pixels pick it
  // too (hitPoint). Owning its whole cell and the door cell in front made a strip of the green open the story (17 Nov 2026).
  if (gardenPropCol(prop) === 'soft') { const cx = prop.x + (prop.w || 1) / 2, foot = prop.y + (prop.h || 1) - .08, hw = prop.hit ? prop.hit[0] : .3, hh = prop.hit ? prop.hit[1] : .55; return Math.abs(pt.x - cx) <= hw && pt.y >= foot - hh && pt.y <= foot + .05; }   // (hit: [half width, height] in cells, for a tall thin prop such as a lamp post)
  if (pt.x >= prop.x && pt.x < prop.x + (prop.w || 1) && pt.y >= prop.y && pt.y < prop.y + (prop.h || 1)) return true;
  const door = prop.door;
  return !!door && Math.abs(pt.x - door.x - .5) <= .42 && Math.abs(pt.y - door.y - .5) <= .34;
}
function _gwExposedNativeBug(prop, pt) {
  const native = window.GardenNative, world = native && native.active() && native.world();
  if (!world || _gdpTool() !== 'hand' || typeof _gwBugNear !== 'function') return null;
  const bug = _gwBugNear(pt.x, pt.y, GW_BUG_PICK.onPlant), drawing = world.entities.get('prop:' + prop.id), node = bug && bug.node;
  if (!node || !node.isConnected || !node.target.visible || node.target.alpha <= .025 || !drawing) return null;
  // A visible insect can sit in front of a facade or show through its faded
  // overhang. Exact bug clicks keep their contextual net action there too.
  return node.target.depth >= drawing.depth || drawing.behind || drawing.root.alpha <= .45 ? bug : null;
}
function gardenWorldPick(it, cell, ev, m) {
  if (!_gw.on) return { kind: 'none' };
  const raw = _gwPointAt(ev) || (cell ? { x: cell.x + 0.5, y: cell.y + 0.5 } : null);
  if (!raw) return { kind: 'none' };
  // the sky above the garden and the edges are not dead: a click there is a click on the nearest ground
  const WD = GARDEN_WORLD, pt = { x: Math.max(0.2, Math.min(WD.cols - 0.2, raw.x)), y: Math.max(0.2, Math.min(WD.rows - 0.2, raw.y)) };
  const sprite = _gdpTool() === 'hand' ? _gwSpriteAt(raw) : null;   // first, even on a roof: a robin on the shop is the robin, not the shop (a tool in your hand means the plant)
  if (sprite) return { kind: 'sprite', sprite, pt };
  if (ev && (window.GardenNative && GardenNative.active() || window.GardenPhaser && GardenPhaser.active(_gw.svg)) && _gdpTool() === 'hand') { const hit = gardenWorldVisualPick(ev); if (hit && hit.land) return { kind: 'land', land: hit.land, pt, cell }; }
  const prop = _gwPropAtPt(pt.x, pt.y, ev);
  if (prop) { const bug = _gwExposedNativeBug(prop, pt); return bug ? { kind: 'bug', bug, pt } : { kind: 'prop', prop, pt }; }
  if (_gdpTool() === 'seed') return { kind: 'seed', pt };   // planting is its own click (the sweep)
  const c = cell || { x: Math.floor(pt.x), y: Math.floor(pt.y) };
  m = m || gardenHere();
  const plant = it && it.kind === 'plant' ? gardenPlantById(m, it.uid) : _gdpPlantAtCell(m, c);
  // bugs live on flowers: on a plant you have to mean the bug itself, or a bee beside a ripe daisy would keep you from ever picking it
  const bug = typeof _gwBugNear === 'function' ? _gwBugNear(pt.x, pt.y, plant ? GW_BUG_PICK.onPlant : GW_BUG_PICK.open) : null;
  if (bug) return { kind: 'bug', bug, pt };
  const decor = it && it.kind === 'decor' && (!it.ground || _gdpTool() === 'dig') ? gardenDecorById(m, it.uid) : null;   // you walk over a path, but the spade lifts it
  if (plant || decor) return { kind: plant ? 'plant' : 'decor', plant, decor, pt, cell: c };
  // a shut gate's way in (a bridge's far end is over the river): the click means the gate (94-garden-wonder-7gates.js)
  if (WD.v >= 4 && _gdpTool() === 'hand' && typeof gardenGateNearShut === 'function') { const gate = gardenGateNearShut(pt, m); if (gate) return { kind: 'land', land: 'zn-' + gate.n, pt, cell: c }; }
  // Island rivers share cells with growing-plot edges. Water follows region
  // permissions, not the neighbouring plot's planting unlock.
  if (WD.v >= 4 && typeof gardenWaterContainsPoint === 'function' && gardenWaterContainsPoint(pt.x, pt.y)) {
    const locked = gardenZoneLockOf(pt.x, pt.y, m.areas);
    return locked ? { kind: 'land', land: locked, pt, cell: c } : { kind: 'water', pt, cell: c };
  }
  const area = gardenAreaAt(c.x, c.y, m.level.level);
  if (area.startsWith('locked:')) return { kind: 'land', land: area.slice(7), pt, cell: c };
  { const sign = ev && ev.target && ev.target.closest ? ev.target.closest('.gd-locksign[data-land]') : null; if (sign) return { kind: 'land', land: sign.getAttribute('data-land'), pt, cell: c }; }   // (a sign stands on the path, in front of what it is about)
  if (typeof gardenWaterContainsPoint === 'function' ? gardenWaterContainsPoint(pt.x, pt.y) : gardenIsWater(c.x, c.y)) return { kind: 'water', pt, cell: c };
  const def = gardenArea(area), oc = m.occ.get(c.x + ',' + c.y);
  if (_gdpTool() === 'hand' && def && def.cats && def.cats.length && !oc && !(m.visit && m.visit.no.plant)) return { kind: 'spot', pt, cell: c };   // an empty spot in a bed: it offers planting right there
  return { kind: 'ground', pt, cell: c };
}
/** What is under the pointer: {kind, text} for a building, a bug or the water; null for anything else (plants are the page's own). */
function gardenWorldHover(ev, cell, it) {
  if (!_gw.on) return null;
  _gw.hoverBug = '';
  const k = gardenWorldPick(it || null, cell, ev, gardenHere());
  if (k.kind === 'prop') return { kind: 'prop', id: k.prop.id, text: k.prop.name };
  if (k.kind === 'bug') { _gw.hoverBug = k.bug.key; return { kind: 'bug', text: k.bug.def.name }; }
  if (k.kind === 'water') return { kind: 'water', text: '' };
  return null;
}
/** Walk up to a point and then do something; if you are already there, do it now. Returns false when there is no way there. */
function gardenWalkAct(stand, fn, o) {
  const W = GARDEN_WORLD, near = (o && o.near) || 62;
  if (Math.hypot((stand.x - _gw.px) * W.cellW, (stand.y - _gw.py) * W.cellH) < near) { _gw.path = []; _gwRouteShow(false); if (o && o.face) gardenWorldFace(o.face); fn(); return true; }
  return gardenWalkToPoint(stand, () => { if (o && o.face) gardenWorldFace(o.face); fn(); }, { radius: (o && o.radius) || 3 });
}
/**
 * A click on the stage (from _gdpClick, every mode but Decorate). Returns true when the world handled it.
 * Everything is done by walking up to it: you click what you want and the figure goes and does it (2.23). With nothing special in your hand a
 * ripe plant is picked, a thirsty one watered, a wild one trimmed, a happy one offers its bubble, and an empty spot in a bed offers the seeds that would grow there.
 * it: the item under the pointer ({uid, kind}) or null; cell: the cell or null; ev: the pointer event (its exact point is used).
 */
function gardenWorldClick(it, cell, ev, m) {
  if (!_gw.on || (!cell && !_gwPointAt(ev))) return false;
  const tool = _gdpTool(), at = ev && ev.clientX != null ? { x: ev.clientX, y: ev.clientY } : null;
  if (typeof _gwFishBusy === 'function' && _gwFishBusy()) { return typeof _gwFishClick === 'function' ? _gwFishClick(cell, ev) : true; }   // a line is out: a click reels
  // wherever you click next, you stop creeping after a bug (the chase used to win over your clicks until the bug got away)
  if (_gw.netting && _gw.netting.state === 'chase') _gw.netting = null;
  const k = gardenWorldPick(it, cell, ev, m);
  if (k.kind === 'decor' && tool === 'hand' && typeof gardenBackStep === 'function' && gardenBackStep(k.decor, m || gardenHere())) return true;
  // 1. a building, a board or a box: walk to its door and go in.
  // Picking already distinguishes its painted shape from transparent lawn;
  // use that same answer for hover, press and click, including a roof click.
  if (k.kind === 'prop' && typeof gartActForProp === 'function' && gartActForProp(k.prop)) return true;   // a bench, a pump, a bell: do it
  if (k.kind === 'prop') { _gwGoToProp(k.prop); return true; }
  if (k.kind === 'seed') return false;   // planting is its own click
  // 2. a bug: creep up on it
  if (k.kind === 'bug') { _gwNetChase(k.bug); return true; }
  if (k.kind === 'sprite') {
    const S = k.sprite;
    if (typeof S.onAim === 'function') S.onAim(S);   // you are coming over to it: it waits for you
    if (typeof S.onClick === 'function') { if (!gardenWalkAct({ x: S.x, y: S.y + 0.6 }, () => S.onClick(S), { radius: 2.5, near: 70 })) gameDeny(null, { at, say: 'You cannot get to it.' }); }
    return true;
  }
  // 3. the water: cast
  if (k.kind === 'water' && typeof gardenFishClickPt === 'function') return gardenFishClickPt(k.pt, m);
  // 4. a plant or a decoration: walk up, then do it
  if (k.kind === 'plant' || k.kind === 'decor') {
    const plant = k.plant, decor = k.decor;
    const stand = plant ? { x: plant.x + plant.fp / 2, y: plant.y + plant.fp + 0.4 } : { x: decor.x + (decor.def.w || 1) / 2, y: decor.y + (decor.def.h || 1) + 0.4 };
    const uid = plant ? plant.uid : decor.uid;
    if (m.visit && plant && gardenVisitCursor(plant, tool) === 'no') { gardenVisitClickNo(plant, tool); return true; }   // your level does not reach it: you are told now, and do not walk over for nothing
    if (!gardenWalkAct(stand, () => _gdpActOn(uid), { face: k.cell, near: plant ? 62 + plant.fp * 20 : 70 })) gameDeny(_ghNodeOf(uid), { at, say: 'You cannot get to it.' });
    return true;
  }
  // 5. land that is not yours
  if (k.kind === 'land') { gardenLandClick(k.land, ev); return true; }
  // 6. an empty spot in a bed, with your hand free: walk over and it offers planting right there
  if (k.kind === 'spot') {
    const c = k.cell;
    if (!gardenWalkAct({ x: c.x + 0.5, y: c.y + 1.3 }, () => gardenSpotBubble(c, gardenHere()), { radius: 2.5, face: c, near: 70 })) gameDeny(null, { at, say: 'You cannot get there.' });
    return true;
  }
  // 7. the ground (or the sky, or the far side of the water): walk to the nearest place you can stand to where you clicked
  if (!gardenWalkToPoint(k.pt, null, { radius: 8 })) gameDeny(null, { at, say: 'You cannot get there.' });
  return true;
}

/* ---------- press and hold: keep walking to the pointer ---------- */
/**
 * Pressing on bare ground starts you walking there (round whatever is in the way, like any click). Hold the button on and, after a moment
 * or as soon as you drag, you steer straight at the pointer and keep going for as long as it is down (the camera follows you, so the same
 * spot on the screen is always a little further on). Letting go while steering stops you; letting go of a quick click does not.
 */
function gardenHoldStart(ev) {
  if (!_gw.on || (typeof _gwFishBusy === 'function' && _gwFishBusy())) return false;
  const pt = _gwPointAt(ev); if (!pt) return false;
  if (_gw.netting && _gw.netting.state === 'chase') _gw.netting = null;
  _gw.hold = { cx: ev.clientX, cy: ev.clientY, x0: ev.clientX, y0: ev.clientY, t0: _gw.t || 0, steer: false };
  if (!gardenWalkToPoint(pt, null, { radius: 8 })) gameDeny({ x: ev.clientX, y: ev.clientY }, { say: 'You cannot get there.' });
  _gwEnsureLoop();
  return true;
}
function gardenHoldMove(ev) {
  const H = _gw.hold; if (!H) return;
  H.cx = ev.clientX; H.cy = ev.clientY;
  if (!H.steer && (Math.abs(H.cx - H.x0) > 6 || Math.abs(H.cy - H.y0) > 6)) H.steer = true;
  _gwEnsureLoop();
}
/** Let go: a quick click carries on to where you clicked; a held one stops you where you are. */
function gardenHoldEnd() {
  const H = _gw.hold; _gw.hold = null;
  if (H && H.steer) { _gw.path = []; _gw.then = null; }
}
const _GW_KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down', A: 'left', D: 'right', W: 'up', S: 'down' };
/** A key on the stage. Returns true when it was a world key (the page then does nothing else with it). */
function gardenWorldKey(ev, down, arrowsOnly) {
  if (!_gw.on) return false;
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return false;
  const dir = _GW_KEYMAP[ev.key] && (!arrowsOnly || ev.key.startsWith('Arrow')) ? _GW_KEYMAP[ev.key] : null;
  if (dir) {
    if (down && ev.key === 'W' && !_gw.keys.size) return false;   // Shift+W standing still is "water everything"; while walking it runs north (round 3: Shift runs)
    // up lifts the bar while you reel; otherwise it walks
    if (dir === 'up' && _gw.reel) { _gw.reel.hold = !!down; ev.preventDefault(); return true; }
    if (down && typeof gartActStop === 'function' && typeof gartActBusy === 'function' && gartActBusy()) gartActStop();   // any movement key ends what you are doing
    if (down) { _gw.keys.add(dir); if (ev.shiftKey) _gw.keys.add('shift'); else _gw.keys.delete('shift'); _gwEnsureLoop(); } else _gw.keys.delete(dir);
    ev.preventDefault(); return true;
  }
  if (ev.key === 'Shift') { if (down) _gw.keys.add('shift'); else _gw.keys.delete('shift'); return false; }
  if (ev.key === 'z' || ev.key === 'Z') { if (down) { _gw.keys.add('creep'); _gwEnsureLoop(); } else _gw.keys.delete('creep'); ev.preventDefault(); return true; }   // hold Z to creep up on something (Shift runs)
  if (down && ev.key === ' ' && _gw.moving && _gw.keys.size && typeof gartMoveHop === 'function' && !(typeof _gwFishBusy === 'function' && _gwFishBusy())) { if (!ev.repeat) gartMoveHop(); ev.preventDefault(); return true; }   // Space while walking: a little hop
  if (!down) { if (ev.key === ' ' || ev.key === 'e' || ev.key === 'E') { if (typeof _gwFishRelease === 'function') _gwFishRelease(); return true; } return false; }
  const k = ev.key;
  if (k === '+' || k === '=') { gardenCamSet(null, -1); ev.preventDefault(); return true; }
  if (k === '-' || k === '_') { gardenCamSet(null, 1); ev.preventDefault(); return true; }
  if (k === 'f' || k === 'F') { gardenCamSet(gardenCamMode() === 'fit' ? 'follow' : 'fit'); ev.preventDefault(); return true; }
  if ((k === 'c' || k === 'C') && ev.shiftKey) { if (typeof gardenCollideToggle === 'function') gardenCollideToggle(); ev.preventDefault(); return true; }   // what blocks walking (94-garden-world-7collide.js)
  if (k === 'c' || k === 'C') { gardenCamSet('follow'); ev.preventDefault(); return true; }
  if (k === 'q' || k === 'Q') { if (typeof gartEmoteWheel === 'function') gartEmoteWheel(); ev.preventDefault(); return true; }
  if ((k === 'j' || k === 'J') && !ev.ctrlKey && !ev.metaKey && !ev.altKey) { if (typeof gardenJournalOpen === 'function') gardenJournalOpen(); ev.preventDefault(); return true; }   // the Field Journal
  if (arrowsOnly) return false;
  if (k === ' ' || k === 'e' || k === 'E') { if (ev.repeat) { ev.preventDefault(); return true; } gardenWorldInteract(); ev.preventDefault(); return true; }
  return false;
}
/** Space / E: do the sensible thing right here: a bite, a door beside you, a bug in reach, a ripe plant, water in front of you. */
function gardenWorldInteract() {
  if (typeof _gwFishBusy === 'function' && _gwFishBusy()) { if (typeof _gwFishPress === 'function') _gwFishPress(); return; }
  if (typeof gartActInteract === 'function' && gartActInteract()) return;   // the prompt's action: sit, climb, ring... (94-garden-zz-7act-1core.js)
  const m = gardenHere(), W = GARDEN_WORLD;
  const px = Math.floor(_gw.px), py = Math.floor(_gw.py);
  for (const p of gardenPropsNow()) if (p.act) { const door = _gwPropApproachPoint(p, false); if (door && Math.abs(door.x - .5 - px) <= 1 && Math.abs(door.y - .5 - py) <= 1) { _gwOpenProp(p); return; } }
  // a way in to a side place beside you (the boat loft's doorway, the hothouse, the den's doors): E went past them to
  // fishing off the quay, or to nothing at all (hunter, round 3). The way in stands where its sight paints its door.
  if (typeof GRM_ROOMS !== 'undefined' && typeof _grd !== 'undefined' && typeof gardenRoomGo === 'function') {
    let best = null, bd = 1.3;
    for (const R of GRM_ROOMS) { const S = _grd.list.get(R.id); if (!S || !Number.isFinite(S.x) || !Number.isFinite(S.y)) continue; const d = Math.hypot(S.x - _gw.px, (S.y - _gw.py) * 1.3); if (d < bd) { bd = d; best = R; } }
    if (best) { gardenRoomGo(best); return; }
  }
  if (_gh.bubble) { const b = _gh.bubble.el.querySelector('.gd-bub-btn'); if (b) b.click(); return; }
  if (typeof gardenTravellerInteract === 'function' && gardenTravellerInteract()) return;
  if (_gw.bugs && _gw.bugs.size && typeof gardenNetSwing === 'function') { for (const b of _gw.bugs.values()) if (Math.hypot(b.x - _gw.px, (b.y - _gw.py) * 1.4) < gardenNet().st.reach * 1.35) { gardenNetSwing(null); return; } }
  const fx = px + (_gw.face > 0 ? 1 : -1), fy = py;
  const cells = [[fx, fy], [px, py + 1], [px, py - 1], [px + 1, py], [px - 1, py], [fx, fy + 1], [fx, fy - 1]];
  for (const [cx, cy] of cells) {
    if (cx < 0 || cy < 0 || cx >= W.cols || cy >= W.rows) continue;
    const c = m.occ.get(cx + ',' + cy), p = c && c.plant ? gardenPlantById(m, c.plant) : null;
    if (p) { _gdpActOn(p.uid); return; }
  }
  if (typeof gardenFishFront === 'function') {
    const wet = (x, y) => typeof gardenWaterContainsPoint === 'function' ? gardenWaterContainsPoint(x + .5, y + .5) : gardenIsWater(x, y);
    for (let r = 1; r <= gardenRod().st.range; r++) for (const dy of [1, 0, -1]) { const x = px + _gw.face * r, y = py + dy; if (x >= 0 && x < W.cols && y >= 0 && y < W.rows && wet(x, y)) { gardenFishFront(); return; } }
    for (let r = 1; r <= gardenRod().st.range; r++) if (py + r < W.rows && wet(px, py + r)) { gardenFishFront(); return; }
  }
  { const s = _ghProject(_gw.px, _gw.py - 1.4), r = _gw.box && _gw.box.getBoundingClientRect(); gameDeny(null, { at: s && r ? { x: r.left + s.x, y: r.top + s.y } : null, silent: true, say: 'Nothing in reach.' }); }
}

/* ---------- the world's API for anything that lives in it (docs/dev/GARDEN.md, "The world API") ---------- */
/** The one collision map, for feet of any size: can something this wide (r, in cells) stand at x, y? */
function gardenWorldFree(x, y, r) {
  const f = r == null ? 0.1 : r;
  return _gwFootCells(x, y, f, f, true) && !_gwSolidHit(x, y, f, f) && gardenWonderWalkFine(x, y, f);
}
function gardenWorldAmphibiousFree(x, y, r) {
  const f = r == null ? .14 : r, grid = _gwGridNow(true);
  if (!_gwHardFeet(grid, x, y, f, f) || _gwSolidHit(x, y, f, f)) return false;
  if (grid.shore && y + f >= gardenLakeOpenTo() && !gardenShoreFootProbe(grid.shore, x, y, f, f, false, grid.waterCover, grid.probe).free) return false;
  const W = GARDEN_WORLD; for (let cy = Math.floor(y - f); cy <= Math.floor(y + f); cy++) for (let cx = Math.floor(x - f); cx <= Math.floor(x + f); cx++) if (grid.otherWater[cy * W.cols + cx] && gardenWaterNo(cx, cy, grid.model)) return false;
  return true;   // a swimmer may straddle dry land and liquid at the bank
}
function gardenWorldNearestFree(x, y, radius, foot) {
  const W = GARDEN_WORLD, R = radius == null ? 3 : radius; let best = null, distance = Infinity;
  for (let dy = -R; dy <= R; dy += .25) for (let dx = -R; dx <= R; dx += .25) { const d = Math.hypot(dx * W.cellW, dy * W.cellH); if (d < distance && gardenWorldFree(x + dx, y + dy, foot == null ? .14 : foot)) { distance = d; best = { x: x + dx, y: y + dy }; } }
  return best;
}
/* How high up a thing's top surface is, as a share of its height, by behaviour (a seat is sat on below the top of its back). A catalogue row can say `perch: 0.8` for itself. */
const GARDEN_SURFACE_BY_EFFECT = Object.freeze({ sit: 0.55 });
/**
 * Everything standing in the garden: [{kind ('plant' | 'decor' | 'prop'), uid, id, name, x, y (top-left cell), w, h, z (the row it is sorted by), height (stage px), top: {x, y (cells), lift (px above the ground)}, node()}].
 * top is where something could land or sit. Flat things (paths, seedlings) are not listed. Worked out on demand: don't call it every frame.
 */
function gardenWorldObjects(mArg) {
  const m = mArg || gardenHere(), out = [], K = 0.75 * GARDEN_WORLD.unit;
  const row = (kind, uid, def, x, y, w, h, hgt, share) => {
    const height = Math.round(hgt * K);
    out.push({ kind, uid, id: def.id, name: def.name, x, y, w, h, z: y + h, height, top: { x: x + w / 2, y: y + h - 0.15, lift: Math.round(height * share) }, node: () => (_gdp.svg && uid ? _gdp.svg.querySelector(`.gd-it[data-uid="${CSS.escape(uid)}"], .gd-prop[data-prop="${CSS.escape(uid)}"]`) : null) });
  };
  for (const p of m.plants) { if (p.stage < 2) continue; const lk = p.def.look || {}; row('plant', p.uid, p.def, p.x, p.y, p.fp, p.fp, (lk.h || 0.7) * (0.4 + p.stage * 0.15), p.def.perch || 0.9); }
  for (const d of m.decor) { if (d.def.layer === 'ground') continue; const lk = d.def.look || {}; row('decor', d.uid, d.def, d.x, d.y, d.def.w || 1, d.def.h || 1, lk.h || 0.6, d.def.perch || (d.def.effect && GARDEN_SURFACE_BY_EFFECT[d.def.effect.kind]) || 0.95); }
  for (const p of GARDEN_PROPS) { if (!p.kind) continue; row('prop', p.id, p, p.x, p.y, p.w, p.h, p.tall == null ? 2 : p.tall, p.perch || 0.9); }
  return out;
}
/**
 * Add something that moves to the world. It is drawn by where its feet are, in with the plants and you, and the loop calls update(dt, sprite) each frame.
 * sprite: {id, svg (markup, its feet at 0,0), x, y (cells), lift (px off the ground), update(dt, s), ground (true: moveBy keeps it on the collision map), foot (its width in cells),
 *          hit (how near a click counts, cells; 0 or none: clicks go through), label, cursor ('hand', ...), onClick(s): you walk up and then this runs}
 * Returns the sprite with moveBy(dx, dy), perch(obj) (on top of a gardenWorldObjects row: it sorts with that thing, so a bird on a fence is hidden by what hides the fence), unperch() and remove().
 */
function gardenWorldAdd(sprite) {
  const S = sprite, W = GARDEN_WORLD;
  S.lift = S.lift || 0; S.z = S.z == null ? null : S.z;
  S.moveBy = (dx, dy) => {
    if (!S.ground) { S.x += dx; S.y += dy; return true; }
    const result = gardenWorldSlide(S.x, S.y, dx, dy, S.foot == null ? .1 : S.foot, S._shoreMove || (S._shoreMove = {}));
    S.x = result.x; S.y = result.y; return result.moved;
  };
  S.perch = (obj) => { S.x = obj.top.x; S.y = obj.top.y; S.lift = obj.top.lift; S.z = obj.z + 0.01; S.on = obj; };
  S.unperch = () => { S.lift = 0; S.z = null; S.on = null; };
  S.remove = () => { if (typeof _gdpSpriteHintChanged === 'function') _gdpSpriteHintChanged(S, true); _gwSprites.delete(S); if (S.node && S.node.remove) S.node.remove(); S.node = null; };
  _gwSprites.add(S);
  void W;
  _gwEnsureLoop();
  return S;
}
const _gwSprites = new Set();
function _gwSpritesFrame(dt) {
  if (typeof gardenTravellersFrame === 'function') gardenTravellersFrame(dt);
  if (!_gwSprites.size || !_gw.svg) return;
  const W = GARDEN_WORLD;
  for (const S of _gwSprites) {
    if (S.simulationOnly) { if (typeof S.update === 'function') { try { S.update(dt, S); } catch (e) { console.error('[garden sprite]', e); S.remove(); } } continue; }
    if (!S.node || !S.node.isConnected) {
      const native = window.GardenNative && GardenNative.active() && GardenNative.world();
      const retained = native && native.rootNode === _gw.svg && native.rootNode.isConnected && native.objectsNode && native.objectsNode.isConnected;
      const g = retained ? gardenSceneElement('g', Object.assign({ class: 'gd-sprite', 'data-live': '1' }, S.nodeAttrs)) : gardenSceneElement('g');
      // Compile native body selectors once in their real scene ancestry. The
      // Classic node still receives its body before the later depth placement.
      if (retained) native.objectsNode.appendChild(g); else { g.setAttribute('class', 'gd-sprite'); g.setAttribute('data-live', '1'); }
      g.innerHTML = S.svg || '';
      S.node = g; S.zk = null; S.tf = null;   // (a new node has no place yet: without this, someone standing still after a redraw sat at the world's top-left corner until they next moved)
    }
    if (typeof S.update === 'function') { try { S.update(dt, S); } catch (e) { console.error('[garden sprite]', e); S.remove(); continue; } }
    if (!S.node) continue;
    const culled = gardenCull(S, S.node, S.x, S.y);
    if (typeof _gdp !== 'undefined' && _gdp.hoverSprite === S) _gdpSpriteHintChanged(S, false);
    if (culled && S.node.parentNode) continue;   // out of the view: it goes on living (update above), and nothing is drawn or moved on the page
    const tf = `translate(${(S.x * W.cellW).toFixed(1)} ${(W.sky + S.y * W.cellH - S.lift).toFixed(1)})`;
    if (S.tf !== tf) { S.tf = tf; S.quiet = 0; S.node.setAttribute('transform', tf); } else S.quiet = (S.quiet || 0) + dt;
    const z = S.z != null ? S.z : S.y, zk = Math.floor(z * 3);
    if (S.zk !== zk || !S.node.parentNode) { S.zk = zk; S.node.setAttribute('data-z', z.toFixed(2)); _gwPlace(S.node, z); }
  }
}
function _gwSpriteAt(pt) {
  const W = GARDEN_WORLD; let best = null, bestDistance = Infinity, bestDepth = -Infinity;
  const visiting = typeof _gl !== 'undefined' && _gl.visit && _gl.visit.svg === _gw.svg && typeof _glVisitSprites !== 'undefined' ? _glVisitSprites : null;
  for (const sprites of visiting ? [_gwSprites, visiting] : [_gwSprites]) for (const S of sprites) {
    if (!S.hit || !S.node || !S.node.isConnected || S._off || S.node._native && (!S.node.target.visible || S.node.target.alpha <= .025)) continue;
    const distance = Math.hypot((S.x - pt.x) * W.cellW, (S.y - (S.lift + (S.hitUp || 0)) / W.cellH - pt.y) * W.cellH) / (S.hit * W.cellW);
    const depth = S.node._native ? S.node.target.depth : S.z == null ? S.y : S.z;
    // Overlapping door proxies and creatures share the numeric picker. Choose
    // the body under the point rather than whichever was registered first.
    if (distance < 1 && (distance < bestDistance || distance === bestDistance && depth > bestDepth)) { best = S; bestDistance = distance; bestDepth = depth; }
  }
  return best;
}
/* ---------- start, stop, paint ---------- */
function gardenWorldStart(root, m) {
  gardenWorldStop(true);
  _gw.on = true; _gw.root = root; _gw.box = root.querySelector('.gd-stagebox'); _gw.cam.init = false; _gw.cam.dirty = true; _gw.t = 0; _gw.sizeOk = false;
  // where you stood: this page's own position if the garden is drawn again (another tab wrote, the state was replaced), else the last one on this device
  const again = !!_gw.placed && (GARDEN_WORLD.v < 3 || _gw.positionLayout === _gwPositionKey());
  const sv = again ? { x: _gw.px, y: _gw.py } : _gwSavedPos();
  if (sv && (again || _gwFree(sv.x, sv.y))) { _gw.px = sv.x; _gw.py = sv.y; }   // (a redraw never moves you: the walk-out below does, if something is in the way)
  else { const st = GARDEN_WORLD.start, dx = typeof gardenVisitOn === 'function' && gardenVisitOn() ? -2 : 0; const f = _gwCellPoint(_gwNearestFree(st.x + dx, st.y, 8) || _gwNearestFree(st.x, st.y, 8) || st); _gw.px = f.x; _gw.py = f.y; }   // a visitor arrives a step beside the start, not inside a host who has not moved off it
  // the page being drawn again (another tab wrote, the state was replaced) used to stop a walk in progress: it now carries on
  _gw.positionLayout = _gwPositionKey(); _gw.placed = true; if (!again) { _gw.path = []; _gw.then = null; } _gw.moving = false; _gw.fig = { idle: '', walk: '' }; _gw.bodyKey = ''; _gw.node = null; _gw.pet = null; _gw.keys.clear();
  if (_gw.box) {
    _gwBuildCamUi(_gw.box);
    if (typeof ResizeObserver !== 'undefined') { _gw.ro = new ResizeObserver(() => { _gw.sizeOk = false; _gw.cam.dirty = true; _gw.cam.snap = true; _gwEnsureLoop(); }); _gw.ro.observe(_gw.box); }
    _gw.box.addEventListener('keyup', _gwKeyUp);
    _gw.box.addEventListener('blur', _gwBlur);
  }
  document.addEventListener('keydown', _gwDocKeyDown); document.addEventListener('keyup', _gwDocKeyUp);
  if (!_gw.vis) { _gw.vis = true; document.addEventListener('visibilitychange', () => { if (!document.hidden) { _gw.last = 0; _gwEnsureLoop(); } }); window.addEventListener('blur', _gwBlur); }
  gardenWorldPainted(m || gardenHere());
  _gwUpdateCamUi();
  if (typeof _gwFishResume === 'function') _gwFishResume();   // a line that was out when the garden was drawn again is still out
  _gwEnsureLoop();
}
function _gwKeyUp(ev) { gardenWorldKey(ev, false); }
/* The keys work wherever you are on the garden page (not only when the stage itself has focus): after you click a button or a tool the
   focus is elsewhere, and having to click the garden again before the keys work was the old garden's worst habit. Text fields, buttons,
   menus and dialogs keep their own keys. */
function _gwDocKeyDown(ev) {
  if (!_gw.on || !_gdp.root || !_gdpWorldView() || ev.defaultPrevented || ev.isComposing || _gdpPopOpen()) return;
  const t = ev.target;
  if (t && t.closest && (t.closest('.gd-stagebox') || t.closest('input, textarea, select, button, a, [contenteditable="true"], [role="dialog"], [role="menu"], [role="listbox"], .gd-guide, .modal, .popover, .cmdk, .palette'))) return;
  if (document.querySelector('.gd-guide, .modal-backdrop.is-open, .cmdk.is-open')) return;
  _gdpKey(ev);
}
function _gwDocKeyUp(ev) { if (_gw.on) gardenWorldKey(ev, false); }
function _gwBlur() { _gw.keys.clear(); _gw.hold = null; if (typeof _gwFishRelease === 'function') _gwFishRelease(); }
function gardenWorldStop(keepOn) {
  if (typeof gardenTravellersStop === 'function') gardenTravellersStop(!!keepOn);
  if (!keepOn && window.GardenNative && GardenNative.active()) GardenNative.destroy();
  if (!keepOn && window.GardenPhaser) GardenPhaser.destroy();
  if (_gw.raf) cancelAnimationFrame(_gw.raf);
  if (_gw.idleT) { clearTimeout(_gw.idleT); _gw.idleT = 0; }
  _gw.raf = 0; _gw.hold = null;   // the button's events went with the old stage: nothing would ever let go
  if (_gw.ro) { _gw.ro.disconnect(); _gw.ro = null; }
  if (_gw.box) { _gw.box.removeEventListener('keyup', _gwKeyUp); _gw.box.removeEventListener('blur', _gwBlur); }
  document.removeEventListener('keydown', _gwDocKeyDown); document.removeEventListener('keyup', _gwDocKeyUp);
  // leaving the garden ends your line; the garden only being drawn again (another tab or the server wrote the state) does not
  if (!keepOn && typeof _gwFishReset === 'function') _gwFishReset(); else _gw.fx = null;
  if (typeof _gwBugsReset === 'function') _gwBugsReset();
  gardenBubbleClose();
  if (!keepOn) { gardenMessageClear(); if (typeof gardenPlaySeekStop === 'function') gardenPlaySeekStop(); if (typeof gardenLiveHostGone === 'function') gardenLiveHostGone(); if (typeof gardenLifeStop === 'function') gardenLifeStop(); if (typeof gardenWonderStop === 'function') gardenWonderStop(); _gw.on = false; _gw.routeEls = null; _gw.reach = null; _gw.root = null; _gw.svg = null; _gw.box = null; _gw.node = null; _gw.pet = null; _gw.grid = null; }
}
/** After every paint of the stage: the svg may be a new element (a mount), or the patch may have dropped our nodes. */
function gardenWorldPainted(m) {
  if (window.GardenNative && GardenNative.active()) { GardenNative.sync(m || gardenHere()); return; }
  if (!_gw.on || !_gdp.svg) return;
  if (_gw.svg !== _gdp.svg) { _gw.svg = _gdp.svg; _gw.node = null; _gw.cam.init = false; _gw.cam.dirty = true; if (_gw.pet) { _gw.pet.node = null; _gw.pet = null; } if (typeof _gwBugsReset === 'function') _gwBugsReset(); }
  _gwGrid(m);
  if (!_gw.node || !_gw.node.isConnected) { for (const n of _gw.svg.querySelectorAll('.gd-player')) n.remove(); _gw.node = _gwMakeNode(); _gw.bodyKey = ''; _gwBody(); if (typeof gardenLiveMineRedraw === 'function') gardenLiveMineRedraw(); }
  else for (const n of _gw.svg.querySelectorAll('.gd-player')) if (n !== _gw.node) n.remove();
  // (boxed in by a new plant or decoration? _gwPushOut walks you out in the loop and carries your walk on)
  _gw.z = -1; _gw._fadeKey = ''; _gwApplyNode();
  if (_gw.pet && _gw.pet.node) { _gw.pet.z = -1; _gwPlace(_gw.pet.node, _gw.pet.y); }
  if (typeof _gwBugsSync === 'function') _gwBugsSync(m);
  _gwApplyCam(0.016, !_gw.cam.init);
  if (typeof gardenLifeSync === 'function') gardenLifeSync(m);   // the creatures (94-garden-life-*.js)
  if (typeof gardenWonderSync === 'function') gardenWonderSync(m);   // callers, the island, the sky (94-garden-wonder-*.js)
  if (typeof gardenLiveHostPainted === 'function') gardenLiveHostPainted(m);   // friends in your garden (94-garden-live-3host.js)
  _gwEnsureLoop();
}
/** (the village's name for the same thing: 94-garden-world-0walk.js _gwFieldForms) */
function _gwForm(pts, src) { return _gwFormOf(pts, src); }
