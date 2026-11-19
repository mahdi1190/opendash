# The paint kit: shared foundations for painting the vale

One file, `src/app/94-garden-paint-ground-0kit.js`, gives every region painter the same four things:
a ground layer that stays sharp at every zoom, one set of ground kinds, one set of path surfaces, and one light.
It is `window.GardenPaintGround`. Nothing in it names a cell: it paints what the layout data says.

Read this before you paint a region. The older helpers still exist (`GardenPaintTerrainKit` for rock, walls and
occluder sprites, `GardenPaintTrees` for trees) and sit on top of this.

## What is already painted for you

`GardenNativePainted.ground()` (called from `packLayers` in `94-garden-native-world.js`) paints **the whole map** once,
at depth -9600, under every other painter:

1. the ground kind of every cell (shore first, then land), with soft broken transitions;
2. the tide's damp edge, dug beds, owned plots, inland water under the painted water;
3. every layout route that is not a plaza, through the path kit;
4. the start square's setts and compass rose, and flower drifts on lawn and meadow.

So a region painter does **not** fill its own ground or draw its own trails any more. It adds what is particular to
the place, on a layer above, and leaves it transparent where the shared ground should show.

## 1. Sharpness: `layer(scene, parent, ops, opts)`

A chunked layer whose bake level follows the camera.

- The map is cut into 256 px chunks. A chunk is baked at the smallest level in `.75, 1, 1.5, 2, 3, 4` (canvas px per
  world px) that is within a quarter of the camera's own pixel density (`levelFor(zoom)`), so nothing on screen is stretched
  by more than about a quarter. The camera's zoom is in device pixels, so a 2x screen gets level 4 close up; a 1x screen
  tops out at level 3.
- The level changes when the zoom has rested for a fifth of a second. The old picture stays up until the new one is
  ready, so zooming never shows a hole.
- Baking runs on a 34 ms timer, never inside a frame: one slice of one chunk a tick (`slice`, 8 to 10 ms), chunks on
  screen first, then a margin round the screen. With `prebake: true` the rest of the layer bakes at the lowest level
  while the player stands still, so the whole-map view is ready.
- Memory is bounded by `budgetMB`, and the bound is real. A layer is never sharper than its budget can hold over one
  screen (it drops a level instead). The margin round the screen is painted at the full level only while that fits; a
  bare chunk in the margin is painted at the lowest level, so nothing walks on to the screen unpainted. Past the budget,
  chunks off the screen are let go, the farthest and sharpest first. Budgets today: shared ground 64 MB, vale places 28,
  fells 32, shadows 10.
- No single op should take long: a slice cannot stop inside one. The kit lays each ground kind in three bands for that
  reason. If your op paints a whole chunk of fine brushwork, split it the same way (a clip on whole canvas pixels).
  `GardenPaintGround.status().slow` names the slowest op and tick since `resetSlow()`.

`ops` is a list of `{ bb: [x0, y0, x1, y1], seed, draw(B, r, chunkBB), clip?, tag? }` in world px, exactly what
`GardenPaintTerrainKit.chunked` takes. **`chunked` now uses this layer by itself** for any layer baked at 1 px a
world px or more, so the fells and the vale ground follow the zoom with no change to their painters. Pass
`follow: false` to keep a fixed level (the far mainland does, by baking under 1).

The handle: `add(op)` paints an op over what is already baked and into every later bake; `set(tag, op, sig)`
replaces the op with that tag and repaints only the chunks it touches (the same `sig` again does nothing);
`detach()` / `attach(parent)` take the pictures off the stage and put them back without baking again;
`destroy()`. `GardenPaintGround.status()` lists every live layer with its level, chunks, megabytes and bake times.

Two rules for an op, or chunks will not meet:

- **Draw from the place, not from the chunk.** Scatter with `tiles(chunkBB, size, margin, salt, (tx, ty, r) => ...)`:
  it hands you a seeded generator for every tile that can reach the chunk, so two neighbouring chunks paint the same
  tuft on their shared edge. Use `noise` / `fbm` for anything smooth.
- **Do not use `ctx.filter` blur for soft edges inside an op** unless the blur is scaled by the level
  (`blur(' + 9 * K + 'px)'`): a fixed blur gets thinner as the level rises. The kit's own soft edges are masks
  made at low resolution and smoothed up, which cost almost nothing.

## 2. Ground kinds: `paintKind(ctx, kind, bb, season)` and `ground(env)`

Kinds: `lawn`, `meadow`, `forest`, `oldwood`, `moor`, `marsh`, `soil`, `sand`, `shingle`.

Each is painted the same way: a colour field at four scales (whole sunlit and shaded reaches several screens across,
broad light and shade, patches of richer and thinner growth, a fine grain), its lit swells going towards a sunny straw
and its hollows towards a deep cool green, then its own brushwork by hashed tiles (the sward and clover of a lawn, the leaning grass and
flower drifts of a meadow, leaf litter and moss, heather and tussocks, pools and rushes, furrows, wind ripples and
shells, packed pebbles). No flat fill, no repeat, no seam.

- Where two kinds meet they are laid in one fixed order (the order of the list above, later on top), never by which is
  commoner in a chunk, so the line between them is one picture across a chunk's edge.
- `paintKind` paints one kind over any box of any canvas. Use it wherever you used to fill a flat colour: under a
  clip for a glade, a paddock, a yard of bare soil. The wood's floor does this for its base.
- `ground(env)` returns the ops for a whole area from a kind grid. Where two kinds meet, each is laid through a soft
  mask (lumpy, a cell wide, cut by noise), so the edge is broken and never follows the cell grid. Sand and shingle are
  cut by the coast's own outline; land kinds by the same outline set back past the beach.

Which kind lies where comes from the layout, in `layoutKinds(W, data)`:

| Layout data | Ground |
| --- | --- |
| region theme `village` | lawn |
| region theme `valley`, `orchard` | meadow |
| region theme `forest` / `ruin` | forest / oldwood |
| region theme `mountain` | moor |
| a beach cell | sand (shingle in `mountain` and `ruin` regions) |
| valley land beside fresh water; land round a route whose id says `marsh` | marsh |
| `presentation.ground = [{ kind, polygon: [[x, y], ...] }]` (cells) | that kind, over everything above |

To change the ground of a place, change the layout data (add a `presentation.ground` polygon), not the painter.

A region layer that dresses ground (mowing bands, tufts) leaves the kit's ground showing: `GardenPaintVale.lawn(...,
{ noBase: true })` adds the drifts and tufts without its old flat fill (the orchard does this). Broad colour a region lays
over the kit's ground (heather drifts, the rises round a peak, scree aprons) is laid soft, at low resolution and
stretched (`soft()` in `94-garden-paint-terrain-1fells.js`), never as hard-edged translucent ellipses. A dressing scatter
(litter, flowers) is in drifts by noise, each mark its own size and turn, never one mark repeated evenly.

A terrace wall that runs north and south (the orchard's banks) is drawn as a turf bank with a low dry-stone foot along
its low side (`bankOps`), because this camera sees such a wall edge on; one that runs east and west keeps its face.

## 3. Paths: `paths(env)`

`env = { routes: [{ id, kind, width, points: [{ x, y, w? }], closed? }], areas: [{ kind, points | ellipse }], season,
allow?, within?, kindAt?, box }` in world px. It returns ops for a layer.

Surfaces: `cobble` (main road), `gravel` (lane), `earth` (trail), `setts` (yards and squares), `boardwalk`, `steps`.
`routeKind(route)` picks one from the layout: the route's own `surface` if it has one, else `boardwalk` or `steps`
when its id says so, else by tier (main, plaza, lane, trail). `ROUTE_WIDTH` has the painted widths.

How it paints: all the lines and areas of one surface are drawn into one coverage picture and blurred, and the path
is where that coverage passes a half. So:

- a path may be any curve, with a different width at every point (`w` on a point): today's straight routes and the
  hand-drawn curves of the new layouts paint the same way;
- where paths meet, the corners fill in by themselves (and a pad is added where one path ends on another), ends are
  round, and an `area` joins the roads that run into it;
- the edge is soft and a little broken, the ground thins and browns before the path begins, grass grows in over the
  edge and flowers stand in runs just outside it. Cobbles and setts are separate stones laid in courses, and a stone
  is laid only where its middle is on the road, so the road's edge is the stones' own edge.

`allow` and `within` are `Path2D` clips (both must hold); `kindAt(px, py)` tells the kit what grows at an edge.

Cobbles and setts change stone in patches a few strides across (greyer granite, darker honey), are worn paler down the
middle, and towards the edge are smaller, sunk and now and then missing, so a big square is not wallpaper. A yard on the
fells (a plaza route there) is the kit's gravel at the route's width. A layer that paints lawn over the roads (the
harbour) fades it off each road in a soft band a little narrower than the road (`destination-out` with a blur scaled by
the level, on a canvas of its own so nothing else on the layer is erased), so the shared road shows with its own edge:
never a road of its own inside a kerb ribbon, never a lawn cut on a ribbon's hard outline.

A region painter that has painted something opaque over the shared ground (a rise, a terrace) can lay the same
paths again on its own layer: the fells do, in `94-garden-paint-terrain-1fells.js`.

## 4. Light: `LIGHT`, `cast`, `castShadow`, `contact`, `lightPool`

One light for the whole world. The sun is upper left; `LIGHT.sx, LIGHT.sy` is the unit vector a shadow falls along
(to the right and a little down). The moving shadows of `94-garden-native-light.js` read the same vector, so a
shadow that moves and a shadow that is painted fall the same way at every hour; the hour changes length and strength.

- **Standing sprites: `GardenPaintTerrainKit.sprite(scene, parent, key, box, draw, x, y, K, shade)`.** Pass `shade: true`
  (or `{ a }`) for anything that stands on the ground at its base line. The kit then lays the sprite's **own silhouette**
  over on the ground along the light, squashed and blurred, with a dark contact along its foot: a wall throws a wall's
  shadow, a lamp post a lamp post's. `GardenPaintVale` things do this by themselves (`shade: false` on a thing opts
  out; a thing with its own `depth`, or afloat, has none); so do the fells' peaks, crags and pines and every painted
  landmark. The shadows live on one soft layer, `GardenPaintGround.cast`, at depth -9340: over every region's ground,
  under everything that stands. Do not paint a second cast shadow inside the sprite (a small contact is fine).
- `cast.blobs([{ id, x, y, w, h, a }])`: for things with no sprite of their own to lay over (library buildings, benches,
  boards). `compose` in `94-garden-native-painted.js` calls it for every painted prop: `w` is the width of what stands on
  the ground (the footprint, not the eaves or a lamp's glow), `h` its height.
- `GardenPaintedProps.kit.castOf(scene, image, x, y, flip, a)`: for a Phaser image you placed yourself (decorations,
  painted props). It lays that picture's own silhouette on the shadow layer and takes it away when the image is
  destroyed, so a decoration picked up or moved leaves no shadow behind. Every placed decoration and every painted prop
  goes through it.
- `castShadow(ctx, x, y, width, height, { a, len })`: the same soft shadow drawn straight into a canvas you are painting
  (the foot laid over along the light, with a dark contact). For baked ground detail only; anything that stands goes
  through `sprite(..., shade)` or `cast.blobs`, or its shadow ends up under a region's own ground.
- `castRuns(ctx, [[x0, y0, x1, y1, height], ...], { a })`: the shadows of low runs painted into the ground (a fence, a
  hedge, a field wall, a plot's boundary) in one soft fill along the light. Lay them before the runs themselves.
- A sprite stood with `sprite()` also **follows the zoom**: close up it is painted again at the level the camera needs
  (one sprite every 90 ms, nearest first; while you walk only sprites whose first painting took a few milliseconds),
  and goes back to its first picture 12 s after it leaves the screen. So `draw` must paint the same picture every time:
  make its random numbers inside `draw` from a fixed seed, and scale any `ctx.filter` blur by the canvas scale.
- `contact(ctx, x, y, rx, ry, a)`: the contact shadow alone.
- `lightPool(ctx, x, y, rx, ry, a, colour)`: a soft pool of warm light for art baked for dusk and night. Lamps and
  windows that are lit live are the light module's (`pointLights`); do not paint a second pool under them. Every painted
  cottage and hall gets a lit window there at night, not only the shops and the land office.
- **The turning hour** is the light module's, over the whole view (`paintEvening` in `94-garden-native-light.js`): a
  multiply gradient stretched over the camera every frame, gold on the sun's side (upper left), rose along the top, amber
  low on the left and violet on the far side while the sun is low (daylight about .5); rose, lilac and indigo once it has
  set (about .2); and a warm glow added from the sun's side. The night's blue comes in only under daylight .22, so the
  hour turns through violet and never through grey. Shadows stay long and readable at sunset. Paint nothing of your own
  for dusk; a baked dusk picture is only for windows and lamp pools.

Light a thing from the upper left: lit face and highlights up and left, shade down and right.

## 5. Scale: `GARDEN_ACTOR_SCALE`, `GARDEN_SIZE`, `gardenSizePx(name, t)`

Everything is sized against **H, the player's height** (`GARDEN_H`, about 41 world px). Both numbers live in
`src/app/94-garden-0camera.js` and nowhere else.

- **Actors.** `GARDEN_ACTOR_SCALE = 0.8` draws every actor at 0.8 of the size its art was made at: you, friends, the
  vale's folk, travellers, pets, creatures and bugs, indoors and out, with what they hold (rod, net, a catch held up),
  their name labels, speech bubbles, contact shadows, reflections and footprints in snow. The camera keeps its distance
  (`_gwCamDefaultIdx` reads the figure's art size, not the drawn size), so the player is smaller in the same view. Wrap a
  new actor's drawing in `gardenActorSized(svg)` or multiply by the constant; never size an actor anywhere else.
- **The world.** `gardenSizePx(name, t)` gives a size in world px, `t` from 0 (least) to 1 (most) between the two ends
  of its row. A painter asks for a size by name and never writes a height of its own. If a thing cannot grow to its
  size without covering something (nothing overlaps), it keeps the most height that leaves the other thing clear, as
  the village planting does (`fitTree` in `94-garden-native-painted.js`), and its region's layout should give it the
  ground it needs.

| Name | Size in H | World px | Applied today in the shared kits |
| --- | --- | --- | --- |
| (the player) | 1 | 41 | every actor, `GARDEN_ACTOR_SCALE` |
| `door` | 1.25 | 52 | library buildings are not resized here; their doors measure about 1.1 H now |
| `eaves` / `ridge` (a cottage) | 1.8 / 3 to 3.5 | 75 / 124 to 145 | library cottages measure about 1.9 / 3.5 |
| `hall` (shops, the hall, the barn, the boathouse) | 3.5 to 4.5 | 145 to 186 | region painters |
| `tower` (mill, lighthouse, folly, tower, windmill) | 5 to 8 | 207 to 331 | region painters |
| `tree` (mature) / `crown` | 3.5 to 5 / 2.5 to 4 wide | 145 to 207 / 104 to 166 | the village planting (`GardenPaintTrees` draws any size asked) |
| `young` (a fruit tree, a young birch) | 2 to 2.5 | 83 to 104 | region painters (the orchard) |
| `greatOak`, `falls` | at least 8 | 331 | the woods and the water chain (today about 3 H: not met) |
| `cliff` (cliffs, the scarp) | at least 3 | 124 | the fells |
| `lamp` (a lamp post) | 1.8 to 2 | 75 to 83 | street lamps, building lamps, the lantern decoration |
| `fence`, `hedge` | 0.5 to 0.6 | 21 to 25 | plot fences and field hedges on unbought land; placed fences and hedges |
| `wall` | 0.8 to 1.2 | 33 to 50 | dry-stone plot walls on the fells; placed walls |
| `barrel`, `well` (a well head) | 0.5 | 21 | region painters |
| `seat` (a bench seat) | 0.3 | 12 | region painters |
| `boulder` | 0.5 to 1.5 | 21 to 62 | region painters |
| `mainRoad` / `lane` / `trail` (painted width) | 1.1 / 0.75 / 0.5 at least | 46 / 32 / 22 | the path kit's `ROUTE_WIDTH` (three figures abreast, two, one and a half) |

A fence, hedge or wall placed as a decoration is drawn to its row by a vertical factor (`stand: [name, art height]`
on its decoration row); its view along the run is drawn deeper first so a turned run still meets the next cell.
Anything painted into the ground that stands up (a plot's fence along its north edge) stands far enough inside its
plot that its top meets the plot's edge: a player behind it is never drawn over it.

## 6. Sights and what a player builds: `GardenPaintSeat` and `GardenPaintedMarks.ART`

`src/app/94-garden-paint-terrain-5sights.js` paints the sights (`ld-*`), the things a player builds or wins (`lf-*`) and
seats every one of them, and every painted prop, in the ground it stands on.

- **A painting** is a row in `GardenPaintedMarks.ART[id]`: `{ box, draw(B, o), seat, lit, lights, flat, shade }`, drawn in
  the fells' brush with its base on y = 0 at the middle of its footprint. It wins over the older painted-prop drawing
  of the same thing. No shadow is painted inside a standing picture: the shared light lays its silhouette. `lit` gives
  it a second picture for dusk and night; `lights` are its warm live lights, as offsets from its foot. `flat: true`
  is for a thing that lies in the ground (a sunken pool, a turf maze, a ring of low stones): it is drawn with its seat,
  under every actor.
- **A seat** (`GardenPaintSeat.add(scene, layer, prop, W, o)`) is one picture at depth -9345, over every region's
  ground and under the shadows and every actor: trodden earth or laid flags round the foot (`kind`: `flags`, `earth`,
  `moss`, `sand`, `turf`), foundation stones, a dark contact exactly as wide as what stands there, grass grown in over
  the edges, and a worn way from the thing's door to the nearest path or plaza of the layout (`way: false` for none).
  It follows the zoom like any sprite. `seat: false` on an art row, or `false` in `SEATS` in
  `94-garden-native-painted-props.js`, leaves a thing unseated (afloat, in reeds).
- Sizes come from `gardenSizePx`; a thing keeps its footprint, door and collision. If it needs more ground than its
  footprint, say so for the region's layout instead of drawing over a neighbour.

## The rules

1. Drive everything from layout data: regions, routes, statics, landforms, `presentation`. **No hard-coded cells.**
   The layouts are being redesigned; a painter that names cells will paint the wrong place.
2. Do not fill ground or draw routes yourself. Use `paintKind` and `paths`, or leave it to the shared ground.
3. Anything baked goes through `layer()` (or `GardenPaintTerrainKit.chunked`, which is the same thing), so it follows
   the zoom and the memory budget. No fixed-resolution ground textures.
4. Scatter by `tiles`, shade by `noise`: a chunk must paint the same picture as its neighbour along their edge.
5. No hard outlines, no rectangles, no square ends. Edges are masks, fringes or the shapes of the things themselves.
6. One light. Stand things with `sprite(..., shade)` or hand them to `cast.blobs`; never a shadow that falls another
   way, and never a round blob under a thing in place of its shadow.
7. If a thing a player can bump into moves, its collision moves with it: read the same placement data the walking
   code reads, and check with Shift+C.
8. Sizes come from `gardenSizePx`, never a number of your own; actors only from `GARDEN_ACTOR_SCALE`.

## Numbers (1500 x 900 window, headless Edge with the GPU on, 19 Nov 2026, the final build of this round)

The default camera stands at zoom 2.5 on this window (the walking zoom); the closest is 3.9 on a 1x screen and 7.8 in
device pixels on a 2x screen. Texture memory held by the kit (`GardenPaintGround.status()`,
`GardenPaintTerrainKit.sharpStatus()`):

| | Walking (2.5, level 2) | Closest (3.9, level 3) | Whole map (0.87, level .75) | 2x walking (level 4) | 2x closest (level 4) |
| --- | --- | --- | --- | --- | --- |
| Shared ground (budget 64 MB; the whole map is kept at level .75 underneath) | 63 MB | 62 MB | 29 MB | 62 MB | 63 MB |
| Vale places ground (budget 28 MB) | 27 MB | 26 MB | 10 MB | 28 MB | 26 MB |
| Fells ground (budget 32 MB) | 12 MB | 18 MB | 6 MB | 29 MB | 29 MB |
| Shadow layer (budget 10 MB, level .75) | 4 MB | 4 MB | 8 MB | 4 MB | 4 MB |
| Sharpened sprites (bound 20 MB) | under 1 MB | under 1 MB | 0 | under 1 MB | under 1 MB |
| **All paint-kit textures** | **107 MB** | **110 MB** | **53 MB** | **123 MB** | **122 MB** |

A chunk is 0.15 MB at level .75, 1.1 MB at level 2, 2.4 MB at level 3 and 4.3 MB at level 4. Spare chunk canvases are
kept and painted into again (at most four of a size, twelve in all): after five walks and two zooms on the 2x screen
460 canvases had been made and 296 reused. Not the kit's and not counted: the trees, 30 MB (the village's bigger trees
share a picture every 48 px of height), and the woods' own floor (14 MB of a 44 MB cap).

Bake times for a 256 px chunk of the shared ground, in total, spread over slices on a 34 ms timer: median 24 to 27 ms,
95th percentile 59 to 61 ms, worst chunk 89 to 97 ms on a 1x screen; median 36 to 40 ms, 95th percentile 62 to 67 ms,
worst chunk 91 ms on a 2x screen (level 4). A slice is 8 to 10 ms by design but cannot stop inside an op. While you
walk, a bare or repainted chunk is painted no sharper than level 2 when one of its ops is costly there or has never been
timed, and nothing is re-painted sharper; it is made sharp when you stop. The kit's slowest timer tick during walks was
21 to 33 ms. Standing still, one op can still take up to 48 ms at level 3 (a band of ground where three kinds meet). The
plot fences are painted per chunk, only the runs a chunk shows, each from its own random stream. The shadow layer: 0 to
1 ms median, 2 to 6 ms worst slice.

Walking with real keys round the green and down the harbour road, 24 s a run:

| Run | Long tasks (over 50 ms) | Frame gaps over 50 ms | Longest frame gap |
| --- | --- | --- | --- |
| 1x, walking zoom, straight after loading and opening the gates | 1 (56 ms) | 11 | 170 ms |
| 1x, walking zoom, three more runs | 0, 0, 0 | 1, 0, 1 | 85, 37, 73 ms |
| 1x, closest zoom, two runs | 0; 1 (52 ms) | 1; 3 | 55; 67 ms |
| 2x screen, walking zoom, three runs | 0, 0, 0 | 3, 3, 3 | 55, 67, 67 ms |
| 2x screen, closest zoom, two runs | 0, 0 | 1, 4 | 61, 73 ms |

After the art director's round-1 fixes (19 Nov 2026, 1x, walking zoom, one 23.5 s real-key walk round the green): 0 long
tasks, 0 frame gaps over 50 ms, longest gap 36 ms. Standing still, two ops are slow and were not fixed in that round: a
vale-layer op with seed 61 near the mill (the marsh margin in `94-garden-paint-vale-1coast.js` or the mill footbridge in
`-1places.js`) took 252 ms in one bake, and the shared ground's worst slice was 104 ms; neither ran during the walk.

Before this round's last fixes the same walks had 1 to 3 long tasks a run on a 1x screen and 3 to 5 (50 to 94 ms) on a
2x screen. A Chrome trace named them: `gl.checkFramebufferStatus` waiting 28 to 69 ms for the graphics process inside a
frame (now skipped for framebuffers that are always complete: `noFramebufferWait` in `94-garden-native-runtime.js`),
memory-reducing whole-heap collections of 60 to 100 ms (fewer now that chunk canvases are reused), and a read-back of a
graphics-card canvas for a decoration icon, 47 ms (icons are drawn in memory now). What is left is an ordinary
whole-heap collection now and then (46 ms of collector in a 52 to 59 ms frame). The page allocates about 176 MB a second
while walking, almost all of it in the per-frame render path (`renderNeutralInner` and Phaser's batching, in
`94-garden-native-art.js`); the paint kit's share is about 1 percent. Headless frame rates are not a measure of a real
screen; the long tasks and gaps are.