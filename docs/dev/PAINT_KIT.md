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
- Memory is bounded by `budgetMB`: past it, chunks away from the screen are let go, the sharpest first.

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

Each is painted the same way: a colour field at three scales (broad light and shade, patches of richer and thinner
growth, a fine grain), then its own brushwork by hashed tiles (the sward and clover of a lawn, the leaning grass and
flower drifts of a meadow, leaf litter and moss, heather and tussocks, pools and rushes, furrows, wind ripples and
shells, packed pebbles). No flat fill, no repeat, no seam.

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
- `castShadow(ctx, x, y, width, height, { a, len })`: the same soft shadow drawn straight into a canvas you are painting
  (the foot laid over along the light, with a dark contact). For baked ground detail only; anything that stands goes
  through `sprite(..., shade)` or `cast.blobs`, or its shadow ends up under a region's own ground.
- A sprite stood with `sprite()` also **follows the zoom**: close up it is painted again at the level the camera needs
  (one sprite every 90 ms, nearest first; while you walk only sprites whose first painting took a few milliseconds),
  and goes back to its first picture 12 s after it leaves the screen. So `draw` must paint the same picture every time:
  make its random numbers inside `draw` from a fixed seed, and scale any `ctx.filter` blur by the canvas scale.
- `contact(ctx, x, y, rx, ry, a)`: the contact shadow alone.
- `lightPool(ctx, x, y, rx, ry, a, colour)`: a soft pool of warm light for art baked for dusk and night. Lamps and
  windows that are lit live are the light module's (`pointLights`); do not paint a second pool under them.

Light a thing from the upper left: lit face and highlights up and left, shade down and right.

## The rules

1. Drive everything from layout data: regions, routes, statics, landforms, `presentation`. **No hard-coded cells.**
   The layouts are being redesigned; a painter that names cells will paint the wrong place.
2. Do not fill ground or draw routes yourself. Use `paintKind` and `paths`, or leave it to the shared ground.
3. Anything baked goes through `layer()` (or `GardenPaintTerrainKit.chunked`, which is the same thing), so it follows
   the zoom and the memory budget. No fixed-resolution ground textures.
4. Scatter by `tiles`, shade by `noise`: a chunk must paint the same picture as its neighbour along their edge.
5. No hard outlines, no rectangles, no square ends. Edges are masks, fringes or the shapes of the things themselves.
6. One light. Use `castShadow` and `contact`; never a shadow that falls another way.
7. If a thing a player can bump into moves, its collision moves with it: read the same placement data the walking
   code reads, and check with Shift+C.

## Numbers (1500 x 900 window, 1x screen, headless Edge with the GPU on, 18 Nov 2026)

| | Walking zoom (2.0, level 2) | Closest zoom (3.9, level 3) | Whole map (0.87, level .75) |
| --- | --- | --- | --- |
| Shared ground (budget 64 MB, whole map kept at level .75 underneath) | 64 MB | 64 MB | 29 MB |
| Vale places ground (budget 20 MB) | 21 to 24 MB | 26 MB | 20 MB |
| Fells ground (budget 40 MB) | up to 34 MB | 11 MB | 12 MB |
| Shadow layer (budget 10 MB, level .75) | 5 to 9 MB | 3 MB | 9 MB |
| Sharpened sprites (bound 20 MB) | 1 to 2 MB | 2 to 4 MB | 0 |
| **All paint-kit textures** | **about 105 to 130 MB** | **about 105 MB** | **about 70 MB** |

A budget is what a layer holds when it has a choice: the chunks on screen and in the margin round it are always
kept, so a layer can run over its budget at a high level (the vale ground does, by about 6 MB). A chunk is 0.15 MB at
level .75, 1.1 MB at level 2, 2.4 MB at level 3 and 4.3 MB at level 4 (a 2x screen close up; not measured in this pass).

Bake times, per 256 px chunk of the shared ground: median 16 to 23 ms and 95th percentile 33 to 43 ms in total, spread
over slices on a timer; the longest single slice was 22 ms, the longest single op 18 ms. The shadow layer: under 1 ms
median, 6 ms worst slice at rest.

Walking with real keys round the green and down the harbour road for 24 s: at zoom 2.0 no long task (over 50 ms) and no
frame gap over 50 ms (95th percentile frame 12 ms, longest 48 ms); at zoom 3.9 no long task and one frame gap over 50 ms
(60 ms). Headless frame rates are not a measure of a real screen; the long tasks and gaps are.
