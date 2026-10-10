# World engine (scene format v3): a world-first, game-style core

Status: design, 10 Oct 2026. Sits ON TOP of scene engine v2 (`SCENE_ENGINE_V2.md`) and reuses its camera
maths, sprite cache, object library, live sky, seasons, weather and the water / shadow passes. Read
`SCENE_LESSONS.md` first: every row of its tables A-C maps to a construction rule below (section 10).

## 0. The one principle

**A scene describes a WORLD, never a picture.** The author says what exists where, in metres, and what lives
there. Everything you see (screen position, scale, facing, layer, draw order, shadow, reflection, light,
haze, backdrop, motion) is DERIVED by the engine every frame. The format has no field that could express a
past mistake: there is no pixel, no scale, no layer, no y for grounded things, no shadow, no reflection, no
light, no colour grade, no hand path. A v3 scene that the validator accepts cannot float a duck, put a dog
inside a wall, draw a far boat over a near walker, or leave the background empty.

Visual style and budget are unchanged: flat-vector 2D sprites from the object library, seasons, live sky;
cold load < 5 s at `--gpu --throttle=4`, frame < 14 ms (target 8 ms), distinct sprites < 600.

## 1. World model

### 1.1 Axes and units

All metres, right-handed, camera-relative ground frame (identical to v2 ground coords):

| axis | meaning | v2 name |
|---|---|---|
| `x` | right of the camera axis | `x` |
| `z` | forward depth along the axis (`z > 0`) | `d` |
| `y` | height above the ground plane (relief from `sceneGroundHeight`) | `h` |

The camera (`camera` block, same fields as v2 2.1: `eye, fov, horizon, heading, x0, lat, lon, alt, water`)
projects with `sceneProject(cam, x, z, y)` from `70-scene-1ground.js`. Nothing else ever converts world to
screen. The world store keeps no screen values; renderers ask the camera.

### 1.2 Entity

```js
// the runtime record (built by the core from the scene's entity entries + the object library)
{
  id, obj,                  // object library id, e.g. 'boat.narrowboat'
  variant,                  // optional library variant (livery, species, colour); never a size
  x, z,                     // world position of the anchor (ground contact centre)
  y,                        // DERIVED from attachment (author may give y only for attach 'air' and 'wall')
  facing,                   // world heading, degrees (0 = away from camera, 90 = to the right); statics only
  foot: [[x, z], ...],      // DERIVED: world footprint polygon = library footprint rotated by facing
  height,                   // DERIVED: real height from the library size class (metres)
  solidity,                 // DERIVED from library class: 'solid' | 'walkable' | 'water' | 'passable'
  attach,                   // 'ground' | 'water' | 'deck:<hostId>' | 'rail:<surfaceId>' | 'air' | 'wall:<hostId>'
  deck,                     // optional DERIVED walkable top (boat decks, boardwalk, bridge) as a surface polygon + y
  waterline,                // DERIVED: y of the contact with water (floaters, waders, piles), else null
  lights,                   // DERIVED from library glow parts: [{ x, y, z, r, col, kind }]
  static: true | false,
}
```

### 1.3 Size, solidity and attachment come from the library, not the scene

Each object id gets a world descriptor from `worldObjectInfo(id)` (A, section 9), built once from the
existing library metadata (`sceneReal` sizes, v2 classes in 4.2-4.4, `sceneMoverSize`) plus a small table
for gaps:

```js
{ cls: 'person' | 'dog' | 'duck' | 'swan' | 'heron' | 'boat' | 'train' | 'tree' | 'building' | 'reed' | 'bench' | ...,
  size: { w, d, h },                 // metres; true scale, never scaled by the scene
  foot: 'box' | 'disc' | [[x, z], ...],
  solidity, attachOk: ['ground', 'water', ...],
  sink: metres,                      // waterline depth below the deck for floaters (0 for no hull part)
  views: ['side', 'q-front', 'front', 'q-back', 'back'] | ['side'],   // 5 drawn views, the other 3 are mirrors
  deck: { poly, y } | null,          // walkable top
  seasonal: true | false }
```

An object with no descriptor cannot be placed (validator error `unknownSize`). This kills "wrong scale"
by construction.

### 1.4 Surfaces

Polygons in metres (`poly: [[x, z], ...]`) or centre lines (`path` + `width`). Kinds and who may use them:

| kind | walk | swim | drive | rail | notes |
|---|---|---|---|---|---|
| `path`, `pavement`, `towpath`, `plaza`, `boardwalk`, `bridge-deck`, `deck` | people, dogs | | | | `deck` = a host's top |
| `grass`, `heath`, `field`, `sand` | people, dogs, grazers, birds | | | | |
| `road` | crossing only at `crossing` | | vehicles | | |
| `water` (`kind`: pond, lake, canal, river, sea, harbour, puddle) | waders within `shallow` m of the edge | swimmers, boats | | | colour, mirror and ripple from kind only (the water lock) |
| `rail`, `tram` | | | | trains, trams | a centre line |
| `reeds`, `bed`, `hedge` | | waders, small birds | | | `hedge` is solid to people |
| `weir` | | | | | solid to swimmers; animates as falling water |

Overlap rule: later surfaces override earlier ones; `water` is cut by any solid footprint over it.

## 2. Derived rendering

### 2.1 Pipeline (per scene load, then per frame)

```
load:   validate -> world store -> nav (3) -> static chunks (2.2) -> bake chunks + reflections + shadows (2.4-2.6)
frame:  life tick (4) -> movers' screen boxes -> merge into chunk order (2.3) -> blit / draw -> water fx -> light post
```

### 2.2 Static entities in depth-sorted chunks

- Sort key of an entity: `zKey = min z over its footprint front edge` (the nearest ground contact).
  Tie-break: larger `y` later, then id.
- Chunks: walk statics in `zKey` order (far to near); start a new chunk when
  (a) the span exceeds `max(0.5, 0.04 * z)` m, or
  (b) a nav cell that any mover can occupy lies inside the span (from the nav map, 3.2), or
  (c) the chunk count would exceed the cap (24; then merge the two chunks with the fewest mover-reachable
  cells between them).
- Each chunk bakes to its own bitmap clipped to its screen bounding box (not full frame), via the existing
  sprite cache (`78-scene-canvas.js` rasteriser, called through the pass env). Haze per entity from its
  own depth (v2 7.1); never per layer. Near and far are never merged into one bitmap because rule (a)
  bounds the span.
- Horizon, far and backdrop bands (2.7) are one extra chunk at the back.

### 2.3 Frame order (movers interleave by true depth)

1. Draw order list = chunks (by their nearest `zKey`) + movers (by their own `zKey` = foot z).
2. A mover whose `zKey` falls inside a chunk's span is drawn after that chunk, then every entity of that
   chunk that is nearer than the mover AND overlaps its screen box is re-blitted from the sprite cache
   (the "occluder redraw"; typically 0-2 sprites).
3. Footprint test, not anchor test, for big things: a mover is behind a solid when the mover's foot z is
   greater than the solid's footprint front edge at the mover's x (`worldFrontZ(foot, x)`). This handles
   long boats, walls and buildings seen at an angle.
4. Attached movers draw immediately after their host (a person on a deck, a duck on a boat roof, a heron
   on a post), regardless of key.
5. Debug invariant (tests): for every pair whose screen boxes overlap, the one with the smaller
   footprint-front z is drawn later. `worldOrderCheck(frame)` returns violations; must be 0.

### 2.4 Shadows (engine only)

- Sun azimuth / elevation from the live sky (`K.live` via the existing sky code) and the camera heading.
- Static casters: the footprint extruded to `height`, projected along the sun onto the ground surfaces
  under it; baked into the chunk that holds the receiving ground (reuses the v2 shadow pass silhouette
  code in `78-scene-shadow.js`). Not cast onto water as dark shapes; water gets a darkened-reflection
  zone instead (the water pass).
- Contact shadows for every grounded or decked entity and mover, always.
- Mover shadows per frame, projected (blobs under the governor).
- Night: shadows from the moon (weak) and from lamps within `r` (v2 6.5).

### 2.5 Reflections (engine only, per entity about its own waterline)

For each entity or mover whose mirror image reaches a water surface:

- The mirror plane is `y = water level` at the entity's own position. A point `(x, y, z)` reflects to
  `(x, 2*yw - y, z)`; for an upright sprite this is a vertical flip about the projected row of
  `(x, yw, zFoot)` with the same scale.
- Floaters (boats, ducks, swans): mirror only the art above the `sink` line, about the same row the canvas
  clips at (the 10 Oct fix). Perspective boat pieces with `waterSlope`: shear about the sloped waterline.
- Standing in water (heron, post, snag, pile): mirror about its own foot.
- On the bank: mirror about the projected water level at its foot z (so a bank tree reflects starting at
  the bank's water edge, not offset).
- Clipped to the water polygon's screen projection; tinted and broken up by the kind (ripple, clarity).
- Static reflections bake into the water chunk; mover reflections draw per frame (reuses
  `sceneWaterMoverReflect`).

### 2.6 Light, haze, night lights

- Grade, exposure, ambient and tint come from the live sky only (`sceneLightV2`, `78-scene-host.js`).
- Haze from depth (v2 7.1) per entity.
- Night lights from library glow parts (windows, lamps, boat portholes, signals) with per-window random
  thresholds (`_sccWindowU`); pools of light on the ground surfaces beneath lamps.
- The scene has NO light key. The validator rejects `grade`, `light`, `tint`, `exposure`, `ambient`,
  `shadow`, `reflect`, `mirror`, `ripple`, `glint`, `colour` anywhere.

### 2.7 Backdrop bands (no empty backgrounds)

`backdrop: { style, skyline? }` is REQUIRED. Styles are engine presets that generate 2-4 bands at fixed
depths (e.g. 300, 800, 2500 m) from library objects with seeded clustered scatter: `heath`, `woodland`,
`downs`, `farmland`, `town-low`, `city-victorian`, `city-sheffield-hills`, `city-manchester-towers`,
`canal-wooded`, `coast`. `skyline` lists real far landmarks (object id + bearing + distance) placed
in world coordinates. The load check `worldCoverage` measures the share of the frame below the horizon
row that is sky-only or bare ground; > 15 % bare is an error with the offending screen region named.

## 3. Navigation

### 3.1 The walkable map

`worldNavBuild(world)` rasterises surfaces into per-layer grids (cell = 0.5 m to z 60 m, 2 m from 60 to
300 m; nothing beyond 300 m moves except flyers and far trains on rails):

| layer | made from | used by |
|---|---|---|
| `walk` | walk surfaces, decks (with their y) | people, dogs |
| `graze` | grass, field, heath | grazers, ground birds |
| `swim` | water minus solids, minus `shallow` margin for boats | ducks, swans, coots, grebes, boats (boats use a dilated solid mask: their half-beam) |
| `wade` | water within `shallow` of edges, reeds | herons, egrets |
| `drive` | roads | vehicles |
| `rail` | rail centre lines (1D, no grid) | trains, trams |

Solid footprints are cut out of every layer, dilated by the mover's radius (person 0.25 m, dog 0.2,
duck 0.15, swan 0.3, boat half-beam). Gates are solid unless `open: true`. Hedges are solid. Edge cells at
the frame edge and cells behind cover (screen-occluded by a solid nearer than them) are marked `spawn`.

### 3.2 Paths

- Goals are few (frame edges, benches, moorings, points of interest), so each goal gets a cached
  **flow field** (Dijkstra over the layer, lazy, at most 32 per scene). Per-agent cost is O(1) per tick.
- Ad-hoc goals (a dog chasing a stick, a heron's next stalk spot) use A* on the same grid, capped at
  2,000 expansions, then string-pulled.
- Cost weights: paths 1, grass 1.6, crossing 1.2, deck 1; avoid cells near the camera that break the near
  band (`moverNear`: depth < `f * h / 405`) with cost infinity unless the entity is `framed`.
- A path is valid only if every cell is on the agent's layer; an agent can never be stepped into a
  non-layer cell (the integrator clamps: a step that would enter a forbidden cell slides along the edge).

### 3.3 Local avoidance

Velocity-obstacle lite (RVO-style, 6 neighbours, 1.5 s horizon) between agents on the same layer, in a
uniform spatial hash (2 m cells). Pairs on different layers do not interact (a duck under a bridge, a
walker above). Groups (a couple, a dog and walker) share a leader and keep formation offsets. A stuck
detector (speed < 10 % of desired for 3 s) re-plans; after two re-plans the agent idles then leaves.

## 4. Characters

### 4.1 State machines

States: `walk, turn, idle, look, sit, chat, graze, swim, dabble, dive, fly, stalk, perch, ride`.
Each class has a table (`worldBrains[cls]`): allowed states, durations, speeds and animation clip names
from the object library (walk cycle, peck, dip). Transitions are data, e.g. for `duck`:

```js
duck: { start: 'swim', states: {
  swim:   { speed: [0.2, 0.5], next: { swim: 0.6, dabble: 0.25, idle: 0.15 }, dur: [4, 12] },
  dabble: { speed: 0, dur: [1.5, 4], next: { swim: 1 } },
  idle:   { speed: 0, dur: [2, 6], next: { swim: 1 } } } }
```

`turn` is automatic: heading changes over 0.25-0.6 s depending on class; no instant turns.

### 4.2 Goals

A character runs a goal list: `[{ go: 'bench-1' }, { do: 'sit', for: 20 }, { leave: 'E' }]`. Goal verbs:
`go <target>`, `do <state> for <s>`, `wander <surface> for <s>`, `follow <id>`, `meet <id>` (then chat),
`leave <edge|cover>`. Targets are entity ids, surface ids, edge letters or `[x, z]`.

### 4.3 Facing and scale

- Facing from velocity in WORLD space projected to the camera: the angle between the velocity and the view
  ray selects one of 8 directions = 5 drawn views (`side, q-front, front, q-back, back`) + 3 mirrors.
  Hysteresis 15 degrees. Classes with only `side` views get turned only side-on paths by the brain.
- Scale is `f * size.h / z` from the descriptor. There is no scale knob anywhere.
- Statics: `facing` (world degrees) picks the view in the same way.

### 4.4 Spawn and despawn

Only at `spawn` cells (frame edges or behind cover). A population that cannot find a spawn cell on its
layer is a load error. Despawn on reaching a leave goal. No in-frame loops; no popping. For stills and
captures, the life sim is warmed up deterministically (seed + scene time, fixed 0.25 s step, 90 s).

## 5. Scene format v3

### 5.1 Shape

```js
worldAdd('uk-south-east', { id: 'fleet-canal-2-w3', label: 'Basingstoke Canal', site: 'Basingstoke Canal, Fleet',
  tags: [...], liveSky: { lat: 51.279, lon: -0.836 } }, {
  v: 3,
  place: { lat: 51.279, lon: -0.836, alt: 68, region: 'hampshire' },
  camera: { eye: 1.65, fov: 62, horizon: 455, heading: 70 },
  surfaces: [
    { id: 'cut', kind: 'water', water: 'canal', poly: [[-30, 8], [6, 8], [40, 140], [10, 160]], shallow: 0.6 },
    { id: 'tow', kind: 'towpath', path: [[8, 5], [14, 60], [30, 160]], width: 2.4 },
    { id: 'verge', kind: 'grass', poly: [...] },
    { id: 'hedge-r', kind: 'hedge', path: [...], width: 1.2, obj: 'hedge.canal-hawthorn' },
  ],
  entities: [
    { obj: 'boat.narrowboat', at: [-2, 14], facing: 20, attach: 'water', variant: 'green-cream', id: 'nb1' },
    { obj: 'bench.wood', at: [11, 22], facing: 250, id: 'bench-1' },
    { obj: 'tree.canal-willow', at: [-12, 18] },
    { cluster: 'reed.canal', on: 'cut', edge: true, n: 40, seed: 3 },   // clustered scatter, world metres
  ],
  landmarks: [ { obj: 'bridge.pondtail', at: [4, 120], facing: 0, src: 'listing / OS map' } ],
  life: [
    { who: 'walkers', on: 'tow', rate: '6/min', mix: { stroll: 0.6, brisk: 0.2, 'dog-walker': 0.2 }, edges: ['S', 'N'] },
    { who: 'visit', mix: { elderly: 1 }, rate: '1/3min', goals: [{ go: 'bench-1' }, { do: 'sit', for: [20, 60] }, { leave: 'N' }] },
    { who: 'mallard', count: 8, on: 'cut' },
    { who: 'mute-swan', count: 2, on: 'cut', group: 'pair' },
    { who: 'heron', count: 1, on: 'cut', state: 'stalk' },
    { who: 'narrowboat-cruising', on: 'cut', every: '6min' },
  ],
  backdrop: { style: 'canal-wooded' },
  seed: 2,
});
```

### 5.2 Rules (the validator, `worldValidate(spec) -> { ok, errors: [{ path, rule, msg, fix }] }`)

- Closed key sets at every level. Unknown key = error. Any of `X, Y, px, s, scale, layer, flip, tint,
  shadow, reflect, light, grade, mirror, ripple, glint, clarity, colour, path` (on an entity), `y` (on a
  grounded entity) = error `screenOrLookField`.
- Every `obj` has a descriptor (`unknownSize`); every `variant` exists (`unknownVariant`).
- Attachment legal for the class and the surface under `at` (`badAttach`: a duck on grass with
  `attach: 'water'`, a boat on a towpath, a train off rail). Default attach = the class's first legal one.
- Solid footprints do not overlap other solids (`overlap`, tolerance 5 cm) and do not cover a whole
  path width (`blocksPath`, unless `blocks: true`).
- Every life population resolves: its layer exists, it has a spawn and a leave cell, its goals are
  reachable (`unreachable`).
- `backdrop.style` is a known preset; `worldCoverage` passes (`emptyBackground`).
- Layout uniqueness across views of the same place (`templated`): the four cameras must differ by
  >= 25 degrees heading or >= 30 m position, and the entity layout signature (a 6x6 grid of
  object-class histograms in screen space) must differ by Jaccard >= 0.35 between any two views.
- Grid lint for clusters (v2 rule reused) and the composition rules of `SCENE_LESSONS.md` A
  (bare area <= 15 %; landmarks carry `src`).

A spec that fails does not load: the registry keeps the scene's previous version (v2) and logs the errors.

## 6. Converter v2 / v1 -> v3

`node tools/world.mjs convert <pack>/<id> [--out src/app/79-world-zscene-<id>.js] [--report]`

1. Load the scene sources in Node (`tools/lib/world/load.mjs`, same evaluation as `scene-page.mjs` plus
   `79-world-*`), call the item's builder to get its expanded data (v2 views are built by functions such as
   `sceneCanalViewV2`).
2. v2: `camera` copied; `surfaces[].polyM` -> `poly` (d -> z); water regions -> `kind: 'water'` with only
   geometry and kind; ground placements `(x, d)` -> `at: [x, z]` with `facing` from their view;
   scatter / cover -> `cluster` entries; flows and `sceneBehave` actors -> `life` populations (rate from
   density, mix from the flow mix); landmarks kept with `src` from the header comment.
3. Pixel placements (v1 or v2 `pixel`): unproject the foot row with `sceneUnproject`; sky and horizon-layer
   art (no foot) -> a `backdrop.skyline` entry or dropped; each one is listed under `review` in the report.
4. v1 scenes: synthesize a camera from `view` (horizon, fov, heading, eye 1.65) and do step 3 for all.
5. Dropped fields (light, tint, reflect, layer, scale, hand paths) are listed in the report, never kept.
6. The output is validated; failures are listed with the `fix` hints. Converted scenes are new items
   (`<id>-w3`) and never replace or delete the original until the user approves.

## 7. Performance plan and budget

| item | budget | how |
|---|---|---|
| cold load (validate + nav + chunks + bake) | < 5 s at `--gpu --throttle=4`; world part < 600 ms | nav grids are typed arrays; flow fields lazy; bake sliced with `env.slice()` |
| frame total | < 14 ms (target 8) at throttle 4 | |
| life sim | < 1.5 ms for 60 agents at 15 Hz, interpolated per frame | flow fields, spatial hash, no allocation in tick |
| sort + interleave | < 0.7 ms | chunks pre-sorted; movers insertion-sorted (nearly sorted frame to frame) |
| occluder redraws | < 40 per frame | sprite cache blits |
| chunk bitmaps | <= 24, total <= 1.5 x frame area of pixels | clipped to bbox; backdrop chunk shared across seasons only when no seasonal objects |
| distinct sprites | < 600 | movers share clip frames across instances; clusters use clump sprites |
| agents on screen | <= 60 (cities), <= 25 (nature) | populations scaled by the v2 time-of-day density profile |
| governor | reuse v2 13.2 step-down order, then agents x 0.7, then sim 10 Hz | |

`node tools/world.mjs perf <ref>` reports each line; tests fail at 1.2x budget.

## 8. Modules (6 builders + integrator)

Load order: `79-world-0core < 79-world-1nav < 79-world-2life < 79-world-3order < 79-world-4light <
79-world-5host < 79-world-zscene-*`. Files 0-2 and the scenes are pure (Node + browser); 3-5 are browser
plus a pure part guarded by `typeof document`. Every function is prefixed `world`. No builder edits an
existing file; the integrator makes the few hook edits (8.7).

### 8.1 A: core, descriptors and validator

- Files: `src/app/79-world-0core.js`, `tools/lib/world/load.mjs`, `tests/world-core.test.mjs`,
  `tests/fixtures/world/bad-*.json` (>= 30 rejected fixtures).
- Interface:
  `worldObjectInfo(id) -> Desc | null`; `worldValidate(spec) -> { ok, errors }`;
  `worldBuild(spec, { season }) -> World { cam, surfaces, entities, life, backdrop, seed, problems }`;
  `worldSurfaceAt(world, x, z) -> surface | null`; `worldFrontZ(foot, x) -> z`;
  `worldAdd(pack, meta, spec)` (registers through `sceneAdd` with data `{ v: 3, spec }`; integration: the item keeps the spec in `item.worldSpec` and, with F loaded, its `scene` becomes a thunk of the derived v2 data, `worldHostData`, so the host's live canvas, the prebaked player, the bake cache, `sceneSvg` and the tools all draw it unchanged).
- Acceptance: every bad fixture rejected with the right `rule`; a grounded entity's `y` equals
  `sceneGroundHeight`; a floater's waterline equals the water level; every library id used by the three
  test scenes has a descriptor; `load.mjs` evaluates sources in < 1.5 s in Node.

### 8.2 B: navigation

- Files: `src/app/79-world-1nav.js`, `tests/world-nav.test.mjs`.
- Interface: `worldNavBuild(world) -> Nav`; `worldNavLayer(nav, layer) -> Grid { w, h, cell, ox, oz, data }`;
  `worldFlowField(nav, layer, goal) -> Field`; `worldPath(nav, layer, from, to) -> [[x, z], ...] | null`;
  `worldStep(nav, layer, pos, vel, r, dt) -> pos` (clamped slide); `worldSpawnCells(nav, layer) -> cells`.
- Acceptance: on synthetic worlds, no path cell intersects any dilated solid; boats keep half-beam off
  banks; closed gate blocks, open gate passes; flow-field build < 15 ms for a 160 x 120 m grid at 0.5 m;
  `worldStep` never returns a forbidden cell over 10^5 random steps.

### 8.3 C: life (characters, populations, avoidance)

- Files: `src/app/79-world-2life.js`, `src/app/79-world-2brains.js` (class tables), `tests/world-life.test.mjs`.
- Interface: `worldLifeInit(world, nav, t0) -> Life`; `worldLifeTick(life, dt)`;
  `worldAgents(life) -> [{ id, cls, obj, variant, x, y, z, vx, vz, state, clip, phase, view, mirror, host }]`;
  `worldBrains` (data). Uses only B for movement.
- Acceptance (600 s simulated per test scene): 0 agents ever on a forbidden cell; 0 floaters with
  `y != water level`; no agent appears or vanishes except on a spawn cell; turn rate within class limit;
  view matches the velocity bucket; stuck agents leave within 15 s; tick < 1.5 ms for 60 agents in Node;
  same seed + time -> identical positions.

### 8.4 D: depth order and chunks

- Files: `src/app/79-world-3order.js`, `tests/world-order.test.mjs`.
- Interface: `worldChunks(world, nav, cam) -> [{ i, z0, z1, ents, bbox }]`;
  `worldFrameOrder(chunks, agents, cam) -> [{ kind: 'chunk' | 'agent' | 'redraw', ref }]`;
  `worldOrderCheck(order, boxes) -> violations`.
- Acceptance: random worlds of 500 statics and 60 agents: `worldOrderCheck` = 0 violations over 1,000
  frames; long boat seen at 30 degrees correctly in front of / behind a swan on either side; chunks <= 24;
  order < 0.7 ms.

### 8.5 E: light, shadow, reflection, backdrop

- Files: `src/app/79-world-4light.js`, `src/app/79-world-4backdrop.js`, `tests/world-light.test.mjs`.
- Interface: `worldBackdrop(world, cam, season) -> entities[]` (far bands in world metres);
  `worldCoverage(world, cam) -> { bare, regions }`;
  `worldReflectPlan(world, cam) -> [{ ref, rowY, clip, shear }]`;
  `worldShadowPlan(world, cam, sun) -> [{ ref, poly }]`; `worldLights(world) -> lights[]`.
  The renderer half registers passes with `sceneRenderPassDefine` (v2 13.1) and reuses
  `78-scene-water.js` / `78-scene-shadow.js` functions; it does not edit them.
- Acceptance: a heron, a post and a boat each reflect about their own waterline (pixel row equality
  within 1 unit); a bank tree's reflection starts at the projected bank edge; no reflection outside water;
  shadow direction rotates with sun azimuth across a day; a night render lights only library glow parts;
  every backdrop style passes `worldCoverage` for the three test cameras.

### 8.6 F: host, renderer glue, tools, converter

- Files: `src/app/79-world-5host.js` (the v3 renderer: bake chunks, frame loop calling C/D/E, stats, the
  governor; SVG still fallback = statics only via the v2 SVG path), `tools/world.mjs`,
  `tools/lib/world/convert.mjs`, `tools/lib/world/perf.mjs`, `tests/world-convert.test.mjs`.
- Interface: `worldRendererFor(item, canvas, o) -> r` with the same surface as the v2 renderer
  (`start, stop, setTime, stats, still`); CLI `world validate | convert | render | motion | perf <ref>`.
- Acceptance: the three converted specs validate; `world render` produces PNGs for 3 dates and night;
  `world motion` overlays agent tracks with 0 red marks; perf report within budget.

### 8.7 The integrator

1. Hook edits (only after other agents finish with these files): in `78-scene-player.js` (or the host)
   route `data.v === 3` to `worldRendererFor`; add `79-world-*` to `SCENE_SRC_RE` / `SCENE_BROWSER_RE` in
   `tools/lib/scene-page.mjs` and `tools/lib/anim-sources.mjs`; register v3 items in a dev pack
   `world-test` (hidden from users) until approved.
2. Build the three test scenes (8.8) as `src/app/79-world-zscene-*.js`, first by `world convert`, then by
   hand to the rich bar (`feedback`: Yateley-rich, never templated).
3. Run: `node build.mjs --syntax`, `node --test tests/world-*.test.mjs`, `world render` (3 seasons +
   night), `world motion`, `world perf`; compare side by side with the v2 view and proof Fleet Pond.
4. Write the lessons back into `SCENE_LESSONS.md` (new section E: what v3 makes impossible).

### 8.8 Test scenes

| id | place | must show | life |
|---|---|---|---|
| `fleet-canal-2-w3` (`79-world-zscene-fleet-canal-2.js`) | Basingstoke Canal at Pondtail, towpath right | moored narrowboats nose to tail with deck walkable, willow, loosestrife and meadowsweet, bridge in distance, `canal-wooded` backdrop | towpath walkers 6/min (20 % dog), a boater stepping on deck, 8 mallards, swan pair, heron stalking the offside, a cruising boat every 6 min that ducks avoid |
| `fleet-pond-2-w3` (`79-world-zscene-fleet-pond-2.js`) | Fleet Pond, the boardwalk through the reed bed | boardwalk as a deck surface over water, reeds as `reeds` surface, birch and sallow, railway embankment behind the pond | walkers on the boardwalk only, a train on the rail every 4 min (lit windows at night), heron in `wade`, kingfisher `perch` -> `dive` -> `perch` on a real post, coots |
| `sheffield-kelham-1-w3` (`79-world-zscene-sheffield-kelham-1.js`) | Kelham Island, the Don by the weir | river with `weir` surface, riverside path, mill and brick buildings from the library, `city-sheffield-hills` backdrop with real skyline entries | crowds on paths 20/min with chat groups, cyclists on the road, ducks above and below the weir (weir solid to swimmers), goosanders diving |

## 9. API summary (names are a contract)

```
A  worldObjectInfo, worldValidate, worldBuild, worldSurfaceAt, worldFrontZ, worldAdd
B  worldNavBuild, worldNavLayer, worldFlowField, worldPath, worldStep, worldSpawnCells
C  worldLifeInit, worldLifeTick, worldAgents, worldBrains
D  worldChunks, worldFrameOrder, worldOrderCheck
E  worldBackdrop, worldCoverage, worldReflectPlan, worldShadowPlan, worldLights
F  worldRendererFor; tools/world.mjs validate | convert | render | motion | perf
```

## 10. Past mistakes and the rule that makes each impossible

| mistake (SCENE_LESSONS) | v3 construction |
|---|---|
| ducks floating | no `y` for floaters; `y` = water level - sink, derived |
| through walls, boats, hedges, gates | nav cuts dilated solids; `worldStep` cannot enter a forbidden cell |
| wrong layering, far boat over near walker | per-frame true-depth order with footprint fronts; no layers in the format; `worldOrderCheck` = 0 |
| people inside objects / stuck | solids never overlap walk cells; stuck detector re-plans or leaves |
| wrong scale | size only from descriptors; no scale field |
| wrong facing / sliding sideways | view from world velocity, 5 views + mirrors, hysteresis |
| popping mid-frame | spawn only at edge / cover cells |
| giant walker at the lens | near band costs infinity in nav |
| hand shadows, reflections, light | no such fields; engine passes only |
| reflection offsets, missing under herons | mirror per entity about its own waterline |
| trains off the line | trains attach to `rail` only |
| kingfisher on a floating twig | `perch` needs a host entity with a perch point |
| empty backgrounds, bare paving | backdrop required; `worldCoverage` <= 15 % bare |
| templated layouts | `templated` rule across a place's views |
| off-season objects | `seasonal` from descriptors; scenes cannot pin season |
| slow loads | budget table, enforced by `world perf` in tests |
