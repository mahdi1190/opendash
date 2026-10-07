# Scene engine: object library, composed scenes, canvas renderer, tools

Status: SPEC, the contract for the first build round (7 Oct 2026), on the
`scene-engine` branch after the merge of the region framework and the
animation-pack tooling. Three builders (A, B, C) implement it in parallel; each
part should take one to two hours. The section numbers below are referenced by
the builders' briefs and by the integration review.

Read first: `CLAUDE.md`, `MODULES.md` (Animation library rows),
`docs/dev/ANIMATION_PACKS.md` (Regions, the quality gate, `scene-rich`),
`docs/dev/UK_PACK.md` ("Rich local scenes") and the header of
`src/app/71-anim-uk-nature-kit.js` (the kit and the `K.live` light model).

## 0. Why, and what this round delivers

The rich Yateley and Fleet scenes look right, but they lag. Each one renders
about 16,000 SVG nodes, many of them `<use>`, and a frame takes 50 to 100 ms
full screen. Every new place also means drawing a whole new scene. The
friend's tooling (lint, sheet, brief, guard, status) keeps hand-drawn art
consistent. However, it scores reused shapes DOWN and has no performance
limits.

The engine combines the two approaches, like a 2D game:

- **Objects are drawn once.** Each one has variants, seasonal palettes and
  animation parts, and is stored in a library.
- **Scenes are data.** A scene has a backdrop, layers, placements, seeded
  scatter rules, actors and signs.
- **A Canvas 2D renderer draws them.** Each object is rasterised once into a
  cached sprite. Static layers are baked into bitmaps. Each frame draws only
  what moves.
- **The tool helps authors.** It scaffolds, lints, renders, times and
  batch-generates scenes from data tables. The lint REWARDS reuse and measures
  how varied the placements are.

Every scene in the app, composed or hand-drawn, follows the Yateley rules
(section 5):

- Four seasons, chosen by date.
- The real sun and moon: sky, light, shadows, positions, the real moon phase,
  stars, windows lit at real dusk, and reflections.
- Ready for weather.

Delivered this round:

1. The object format and library, including the nature kit's objects through
   an adapter. A starter set of nature and urban objects.
2. The scene format, a deterministic compiler, and scene items in the
   registry.
3. The Canvas 2D renderer with its host integration (opening, animation of
   the day, gallery), plus the SVG fallback renderer.
4. The tool commands `object ...` and `scene ...`, the lint profile
   `composed` (performance and placement variety), briefs and the skill.
5. The retrofit path that gives the existing hand-drawn region scenes (US,
   Asia and every region added since) the live sky, seasons and weather,
   without redrawing them.
6. Archetypes, data tables, batch generation and a safe signage exception.
   A demo: one `station` archetype instantiated from a 3-row table.
7. Pluggable per-region selection rules, with the dense-city (London) rule
   designed, implemented as a pure function and stubbed into the region
   framework.

Not this round:

- The London pack itself.
- Converting the 20 Yateley and Fleet view files (the pilot, section 15).
- Retrofitting the UK legacy, Texas and World packs (section 7.5).
- A scene editor.

### Ground rules (all builders)

- Zero npm dependencies; Node >= 20; vanilla browser JS. Classic scripts are
  concatenated by `build.mjs` in file-name order into ONE scope.
  - Every new top-level name starts with `scene` / `SCENE_` (or `_sc` when
    private).
  - Files that hold local helpers wrap them in an IIFE, so their consts do not
    clash.
- PURE files (`70-scene-*.js`) touch no DOM and no page globals at load. They
  define functions and consts only; anything expensive runs lazily. They are
  loaded by Node (`tools/lib/anim-sources.mjs`) exactly as the browser loads
  them.
- Load order: `70-scene-0core.js` < `70-scene-arch-*` < `70-scene-data-*` <
  `70-scene-lib-*` < `70-scene-retro.js` < `70-scene-select.js` <
  `70-scene-svg.js` < `71-anim-0region.js` < ... < `71-anim-registry.js` <
  `71-anim-uk-nature-kit.js` < `71-scene-<pack>-N.js` < `72-anim-pack-*.js` <
  `78-scene-*.js`.
  - At load, a 70 file may call `70-scene-0core.js` functions and consts
    (they are already initialised).
  - It may call 71 functions (`ukNatureKit`, `animSceneKit`, `almSceneLight`,
    `animItem` ...) ONLY lazily, inside functions that run after load.
    Otherwise it hits "Cannot access ... before initialization".
- No personal data anywhere: the repo is PUBLIC. The demo uses three famous
  public London stations, none of them related to the user.
- Never use port 4173 or the live data folder. Builders use their own ports
  and temp dirs:

  | builder | port | Chrome debug port | temp dir |
  |---|---|---|---|
  | A | 4391 | 9331 | `C:/tmp/scene-a` |
  | B | 4392 | 9332 | `C:/tmp/scene-b` |
  | C | 4393 | 9333 | `C:/tmp/scene-c` |

- Each builder commits only its own files (section 13). Run
  `node tools/anim-pack.mjs guard --owned <your files>` before committing.
  Never push, tag or touch remotes.

## 1. Architecture at a glance

```
 authoring                         pure engine (Node + browser)                 browser only
 ---------                         ----------------------------                 ------------
 70-scene-lib-<cat>.js  --sceneObjDefine-->  object registry  --sceneObjShapes-->  sprite cache (78-scene-canvas.js)
 (native shapes or                         (70-scene-0core.js)                       |
  the nature kit via sceneObjFromKit)                                                 v
 71-scene-<pack>-N.js / archetype+table --sceneItem--> registry item {composed, scene}  --> animItemHtml
                                            |                                          |  canvas sizes: host span + <canvas>
                                            v                                          |  (78-scene-host.js mounts it)
                                   sceneCompile(data, {season, lod, L})                |  other sizes / Node: sceneSvg()
                                   = the COMPILED scene (section 4)  -----------------> both renderers draw THIS
 hand-drawn region scenes --sceneRetrofit--> same art + live sky / grade / season overlay (SVG, section 7)
 region config {select} --sceneSelect('dense', input)--> which place plays (section 9)
 tools/anim-pack.mjs object|scene ... --> lint (composed profile), sheet (headless Chrome), perf (draw ms in the real renderer)
```

## 2. Object library

### 2.1 Files and naming

- **Files.** Use one file per category: `src/app/70-scene-lib-<category>.js`.
  - Starter files this round: `trees`, `plants`, `water`, `people`,
    `buildings`, `street`, `rail`.
  - A file holds `sceneObjDefine(...)` calls inside an IIFE, and nothing else.
- **Object ids.** The form is `<category>.<name>`, matching
  `/^[a-z]+\.[a-z0-9-]{1,40}$/`. Examples: `tree.oak`, `plant.heather`,
  `bird.mallard`, `person.walker`, `building.station-holden`, `rail.platform`.
  - An id is stable forever. Rename an object by defining a new one; scenes
    reference ids.
- **Categories** (`SCENE_CATEGORIES`): `tree plant ground rock water bird
  animal person vehicle boat building street rail structure prop sky`.
  - Signs are NOT objects: they are an engine primitive (section 8.3).
- **One-place landmarks** (a particular church, the Fleet Pond boardwalk) are
  ordinary objects in their category, tagged `landmark` and `place:<id>`.

### 2.2 The definition

Coordinates are object-local world units, at scale 1. The ANCHOR is the
origin (0, 0), where the object touches the ground (the foot of a trunk, the
waterline of a duck). The drawing extends upward into negative y. One world
unit is one scene pixel of the 1600 x 900 scene at scale 1.

```js
sceneObjDefine({
  id: 'tree.oak',
  category: 'tree',
  size: [260, 400],              // natural width, height (world units at s = 1): used by depth sizing and the lint
  box: [-140, -410, 140, 8],     // optional local bounds [x0, y0, x1, y1] of everything drawn; default: computed from the shapes (+2)
  variants: 3,                   // build() runs for v = 0 .. variants-1
  seasonal: true,                // palettes (or shapes) differ by season; false = one look all year (a bench)
  shapeBySeason: false,          // true: build() is called per (v, season) (a bare winter tree); false: per v, the palette alone changes
  flippable: true,               // may be mirrored (buildings with readable asymmetry: false)
  palette: {                     // slot -> '#rrggbb' or ['#rrggbb', ...]; seasons override base
    base:   { bark: ['#5a4632', '#3e3022', '#7a6448'] },
    spring: { leaf: ['#5f8a3a', '#86b04a', '#b6d66a'] },
    summer: { leaf: ['#2f5a2a', '#4a7a34', '#79a04a'] },
    autumn: { leaf: ['#8a4a1e', '#c0702a', '#e0a040'] },
    winter: { leaf: ['#4a5a44', '#5a6a50', '#6a7a5a'] },
  },
  night: { glow: { window: '#ffd98a', lamp: '#ffe2a0' }, on: 0.7 },   // optional: shapes flagged glow light up from real dusk; `on` = seeded share lit
  parts: ['trunk', 'crown'],     // draw order; default ['body']
  anim: { sway: { part: 'crown', pivot: [0, -170], deg: 2.2 } },     // the animation hooks (2.4)
  shadow: { rx: 110, ry: 14, h: 400 },   // optional: a ground shadow cast along the live sun (h: height for its length)
  reflect: true,                 // mirrored in water areas it stands beside
  tags: ['uk', 'heath', 'deciduous'],
  credit: 'adapted from the nature kit K.tree("oak")',
  build(v, rnd, ctx) {           // runs LAZILY, once per variant (or per variant and season); MUST be deterministic for (v, ctx.season)
    return { trunk: [['@bark.0', 'M-12 0 ...z'], ['@bark.1', 'M...']], crown: [/* shapes */] };
  },
});
```

**Authoring shapes.** A part is an array of shapes. Each shape is one of:

- `[paint, d]`
- `[paint, d, opacity]`
- `{ f: paint, d, op, s: strokePaint, w: strokeWidth, cap: 'round', m: [a, b, c, d, e, f], glow: 'window' | 'lamp', detail: true }`

`d` is SVG path data. Use `sceneD` (2.5) for circles, ellipses, lobes and
leaves.

**Paint** is one of:

- `'#rrggbb'`
- `'@slot'`: the first colour of the slot.
- `'@slot.N'`: the colour at index N.
- `{ lin: [[0, paint, op?], [1, paint, op?]], x1, y1, x2, y2 }` or
  `{ rad: [...], cx, cy, r }`: gradients in local coordinates.

There is no `url()`, no text and no images.

**Detail.** `detail: true` shapes are dropped at LOD < 0.5, in tiles.

**Resolved form.** `sceneObjShapes(id, v, season)` returns:

```js
{ box, parts: { trunk: [Shape], crown: [Shape] }, order: ['trunk', 'crown'], anim: [AnimTemplate] }
```

Each `Shape` is `{ f, d, op, s, w, cap, m, glow, detail }`, with paints
resolved to `'#rrggbb'` or a gradient object. The result is memoised per
`(id, v, season)`. This is what both renderers rasterise.

### 2.3 The existing nature kit becomes library objects

The kit (`71-anim-uk-nature-kit.js`) generates SVG strings that use `<use>`
of `<g id>` symbols, `currentColor`, gradients and `x-ukn*` motion
wrappers. Rather than redraw it, the core provides:

- `sceneKit(name)`: a memoised `ukNatureKit(animSceneKit())` instance, made
  lazily.
  - `name: 'obj'` is used only for object builds: `K.live` is NEVER called
    on it, so no light leaks into the drawings.
  - `name: 'light'` is used only by `sceneLight`.
- `sceneShapesFromSvg(markup, { parts })`: a small SVG-subset parser. It
  returns `{ parts: { name: [Shape] }, anim: [AnimTemplate] }`.
  - It handles `<defs>`, `<g id>`, `<use href="#id" transform>`, `<g
    transform fill color opacity class style>`, `<path>`, `<circle>`,
    `<ellipse>`, `<rect>`, `<polygon>`, `fill-opacity`, `stroke*`,
    `currentColor`, and `linearGradient` / `radialGradient` (userSpaceOnUse
    or bounding box).
  - Transforms accumulate into the shape's `m` matrix.
  - Shapes inside an `x-ukn<cls>` group go to the part mapped by `KIT_PARTS`
    (below). The group's `transform-origin` becomes the part pivot.
  - Anything it cannot parse is reported (it throws with the tag), so
    `object lint` names it.
- `sceneObjFromKit({ id, category, size, variants, seasonal, flippable,
  shadow, reflect, tags, kit: (K, v, season) => markup, parts })` defines an
  object whose `build` parses the kit's markup.
  - Call kit generators at the origin with `shadow: false` and `still: false`.
  - Example: `kit: (K, v, season) => K.tree('oak', 0, 0, 1, { season, seed:
    11 + v * 7, shadow: false })`.

**`KIT_PARTS` (default mapping of `x-ukn*` classes to animation kinds):**

| kit classes | becomes |
|---|---|
| `tree`, `gust`, `gust2`, `gust3`, `sway`, `weep` | `sway` |
| `leg`, `step`, `arm` | `walk` |
| `bob` | `bob` |
| `flap`, `wing` | `flap` |
| `tail`, `wag`, `ear`, `look`, `peck`, `nibble`, `graze` | `turn` |
| `glow`, `twinkle`, `shim` | `flicker` |
| `spin` | `spin` |

Travel and particle classes (`pace drift glide dart hop leap flit buzz fall
snow wake splash ring wobble shaft flutter`) are dropped: the drawing stays
at its rest position. Actors and particles provide that motion instead.

**Starter set this round** (builder C):

- Kit adapters:
  - `tree.oak`, `tree.birch`, `tree.pine` (3 variants each)
  - `plant.heather`, `plant.grass`, `plant.reed`, `plant.gorse`
  - `bird.mallard`, `bird.swan`
  - `person.walker` (kit walker without its travel; legs = `walk`)
- Native objects:
  - `tree.plane` (a London plane)
  - `building.station-victorian`, `building.station-holden`,
    `building.station-modern`
  - `building.terrace`, `building.tower`
  - `street.lamp`, `street.bench`, `street.bus`
  - `rail.platform`, `rail.track`, `rail.train`

### 2.4 Animation hooks (cheap by construction)

Each hook moves ONE part with ONE transform or opacity per frame. The renderer
never re-rasterises for motion.

| kind | parameters (object-local) | per frame |
|---|---|---|
| `sway` | `part, pivot, deg (2), k (1)` | rotate about the pivot by `deg * k * sceneWind(t, xWorld, L)` |
| `bob` | `part ('*' = whole), dy (2), period (3 s)` | translate y by `dy * sin` |
| `flap` | `part, pivot, sy: [0.3, 1], period (0.5 s)` | scale y about the pivot |
| `walk` | `parts: [legA, legB], pivot, deg (22), period (0.9 s), bob (1.5)` | legs rotate in opposite phase; the body bobs |
| `paddle` | `dy (1.5), deg (2), period (2.4 s)` | whole object: bob plus rock |
| `turn` | `part, pivot, deg (14), period (6 s), hold (0.6)` | a head or tail turns, then holds (peck, look) |
| `flicker` | `part, op: [0.6, 1], period (2 s)` | opacity (lamps, glints) |
| `spin` | `part, pivot, period (4 s)` | rotate 360 degrees |

Each placement gets its phase from its seed. Each placement or actor may
scale the hook (`anim: { sway: { k: 1.4 } }`) or switch it off
(`anim: false`).

### 2.5 Helpers for drawing objects (in `70-scene-0core.js`)

`sceneD.circ(x, y, r)`, `sceneD.ell(x, y, rx, ry)`,
`sceneD.rect(x, y, w, h, r?)` and `sceneD.poly(pts)` return path strings.
`sceneD.lobed(rnd, cx, cy, rx, ry, n, ragged)` and
`sceneD.leaf(x, y, angle, len, w)` call the kit's `K.lobed` / `K.leafD` on
`sceneKit('obj')`, lazily. `sceneRnd(seed)` and `sceneHash(str)` give
deterministic randomness.

### 2.6 Adding an object (and how it is linted)

1. Scaffold it:
   `node tools/anim-pack.mjs object new <category>.<name> [--kit "K.tree('alder')"] [--variants 3]`.
   This appends a stub to `70-scene-lib-<category>.js`, creating the file
   with its IIFE if it is missing. The stub has palettes for all four
   seasons, or a `sceneObjFromKit` call.
2. Draw it in `build()`.
3. Lint it: `node tools/anim-pack.mjs object lint <id>`. With no id, it lints
   every object. Rules (exit 2 on a failure):
   - **Identity:** the id and category are valid, and the id is unique.
   - **Size:** `size` is within 4 to 2000 units, and `box` covers every
     shape.
   - **Determinism:** `build()` gives the same result twice for every
     `(v, season)`.
   - **Palettes:** every `@slot` resolves in every season. A seasonal object
     has at least one slot (or shape) that differs between summer and
     autumn, and between summer and winter.
   - **Animation parts:** every hook's part exists, and its pivot lies inside
     the box.
   - **Shape limits:** at most 600 shapes and 60 KB of path data per
     variant, so build time stays at most 25 ms per `(v, season)`.
   - **Content:** no `url()`, text, images or non-hex colours.
   - **No roundel:** street, rail and building objects may not contain a
     ring with a bar across its centre (section 8.4).
4. Look at it:
   `node tools/anim-pack.mjs object sheet <id> [--out dir] [--canvas]`.
   - The grid has a row per variant and a column per season, plus a night
     column graded with the night light and a 0.4x size strip.
   - It also shows three animation phases.
   - It is rendered by the SVG renderer by default, or by the canvas
     renderer with `--canvas`.

`tests/scene-lib.test.mjs` runs `object lint` over the whole library, so a
broken object fails `npm test`.

## 3. Scene format

A composed scene is plain data (the object ids in this example are illustrative). It is JSON-safe, apart from the optional
thunk wrapper described below.

```js
{
  v: 1,
  id: 'yateley-common-wide',           // unique within its pack
  view: { lat: 51.34, lon: -0.83, heading: 205, fov: 78, horizon: 500, lift: 1 },   // the K.live view: where it is and which way it looks
  at: 'afternoon',                      // the authored moment for QA when there is no live sky (dawn|morning|day|noon|afternoon|golden|sunset|dusk|night)
  season: 'auto',                       // 'auto' (from the date, section 5) or a fixed season (a picture of one season only)
  tropic: 'summer',                     // the palette used at |lat| < 23.5 (no four seasons there)
  palette: { base: { ground: ['#6a7a3a', '#55652e'] }, autumn: { ground: ['#7a6a32', '#5f5226'] } },   // scene-level slots for ground and water fills
  sky: { stars: 180, clouds: { n: 5, y: [60, 320], speed: 6 }, sunR: 26, moonR: 20 },   // false = no open sky (an interior)
  layers: [                             // far to near; default: SCENE_LAYERS_DEFAULT (below)
    { id: 'far', depth: 0.15, haze: 0.55 },
    { id: 'mid', depth: 0.45, haze: 0.2 },
    { id: 'near', depth: 1, haze: 0 },
    { id: 'front', depth: 1.25, haze: 0 },
  ],
  ground: [                             // terrain bands and polygons, drawn first in their layer
    { layer: 'far', d: 'M-160 500 Q400 470 900 492 T1760 488 V900 H-160 Z', fill: { lin: [[0, '@ground.0'], [1, '@ground.1']], y1: 480, y2: 640 } },
  ],
  water: [                              // water areas: live sky colours, reflections, shimmer, the glitter road
    { layer: 'mid', d: 'M...Z', y0: 610, y1: 720, base: ['#7fb0c0', '#3f7e96', '#1d4c64'], reflect: true, shimmer: 30, lightPath: true },
  ],
  place: [                              // hand-placed objects
    { obj: 'tree.oak', x: 420, y: 640, s: 1.1, flip: false, variant: 1, layer: 'near', seed: 3, tint: ['#c08040', 0.12], anim: { sway: { k: 1.2 } } },
    { obj: 'building.station-holden', x: 800, y: 700, s: 1, layer: 'mid', season: 'winter' },   // season: override the scene's season for this one object
  ],
  scatter: [                            // seeded rules that expand to placements deterministically
    {
      obj: { 'plant.heather': 3, 'plant.grass': 1 },   // or 'plant.heather' or ['a', 'b'] (equal weights)
      layer: 'near', seed: 7,
      area: { poly: [[-160, 700], [1760, 690], [1760, 900], [-160, 900]] },   // or { rect: [x0, y0, x1, y1] }
      n: 220,                           // or density: per 100 x 100 units
      minGap: 14,                       // minimum distance between anchors (scaled with size)
      s: [0.7, 1.15], sByY: [[690, 0.55], [900, 1.25]],   // size: random range times depth (interpolated on y)
      mask: { noise: { scale: 280, cut: 0.42 }, avoid: [{ rect: [700, 680, 900, 760] }] },
      flip: 0.5, variant: 'random',     // or [0, 2] (a range) or 1
      tint: { col: '#8a7a40', k: [0, 0.16] },
      anim: 'strip',                    // wind strips (cheap mass sway, 6.3); or { sway: { k: [0.6, 1.2] } } per object; or false
    },
  ],
  actors: [                             // things that move along paths
    { obj: 'person.walker', layer: 'near', path: [[-60, 790], [700, 772], [1660, 800]], speed: 22, loop: 'pingpong', s: 0.9, sByY: true, seed: 5, offset: 0.3 },
    { obj: 'boat.narrowboat', layer: 'mid', path: [[1700, 668], [-100, 668]], speed: 6, loop: 'loop' },
  ],
  flocks: [ { obj: 'bird.gull', n: 5, area: [200, 80, 1400, 260], speed: 30, s: 0.5, seed: 9 } ],
  signs: [ { layer: 'mid', x: 800, y: 520, w: 360, h: 46, text: 'Arnos Grove', bars: ['#003688'], style: 'board' } ],   // section 8.3
  particles: 'season',                  // 'season' (petals / motes / leaves / snow by season) | 'none' | { kind, n }
  weather: 'live',                      // rain / snow / fog / wind from the live weather (o.sky.wx) | 'none'
  camera: { pan: 0, period: 90 },       // optional parallax drift (px at depth 1); 0 = off (cheapest)
}
```

**Defaults.** `SCENE_LAYERS_DEFAULT` is far (depth 0.15, haze 0.55), mid
(0.45, 0.2), near (1, 0) and front (1.25, 0). At most 6 layers are allowed.

**Coordinates.** The scene space is 1600 x 900, with x from -160 to 1760 for
drift, as in the kit. A placement's y is its anchor (ground contact). Its z
(draw order within a layer) is y, then the declaration order.

**Determinism.** Expanding the same data with the same season and LOD always
gives the same placements:

- Every random draw comes from `sceneRnd(sceneHash(scene.id + '|' + rule
  index + '|' + seed))`.
- LOD thins scatter rules by keeping a seeded fraction (`n * lod`).
  Hand-placed objects and actors are always kept.

**Registering a composed scene.**

- Scene files are named `src/app/71-scene-<pack>-<n>.js`. Each is an IIFE
  that calls `sceneAdd('<pack>', meta, data)`.
- The pack file `src/app/72-anim-pack-<pack>.js` registers them:
  `animRegisterPack({ id, name, items: sceneItems('<pack>') })`.
- `meta` holds the usual item fields:
  - required: `id`, `label`, `site`, `tags` (6 or more), `mood`, `colour`
  - optional: `intensity`, `region`, `when`, `priority`, place fields
    (`county`, `ukPlace`, ...)
- `sceneItem(meta, data)` builds the registry item:

```js
{ ...meta, slot: meta.slot || 'opening', full: true, rich: true, composed: true,
  scene: data,                               // the object, or a thunk () => data (evaluated once, cached: sceneData(item))
  liveSky: { lat: data.view.lat, lon: data.view.lon },
  season: 'any', theme: meta.theme || 'any', intensity: meta.intensity || 'standard',
  svg: (o) => sceneSvg(data, o), reduced: 'static' }
```

The registry, rotation, pins, favourites, blocks, gallery, the opening and
the animation of the day all keep working, because it is a normal item.
`season: 'any'` is used because the scene adapts to the date by itself.

`sceneValidate(data)` returns a list of problems. These are:

- unknown object ids
- layers that do not exist
- an empty or out-of-range area
- `n` above 2000 per rule
- paths with fewer than 2 points
- more than 6 signs
- bad sign text (8.3)
- a missing `view.lat` / `view.lon`

## 4. The compiled scene (the A to B contract)

`sceneCompile(data, { season, lod, L })` is PURE and deterministic. It is
memoised on `(data, season, lod)`. `L` is only used to bucket the lit
windows and the shadow switch. Both renderers and the lint consume ONLY this
form:

```js
C = {
  v: 1, id, w: 1600, h: 900, season, lod,
  view: { lat, lon, heading, fov, horizon, lift },
  sky: { stars, clouds: { n, y0, y1, speed }, sunR, moonR } | null,
  layers: [{ id, i, depth, haze }],                       // far -> near
  ground: [{ layer: i, d, fill: Paint }],                 // paints resolved for the season ('#hex' or gradient object)
  water: [{ layer: i, d, y0, y1, base: [far, mid, near], reflect, shimmer, lightPath }],
  items: [Placed],                                        // sorted by layer i, then z, then order
  strips: [{ layer: i, x0, x1, y0, y1, items: [indexInItems], amp }],
  actors: [Actor], flocks: [Flock], signs: [Sign],
  particles: { kind: 'petals' | 'motes' | 'leaves' | 'snow' | 'none', n },
  camera: { pan, period },
  stats: { placements, staticItems, animatedParts, stripItems, strips, actors, flockBirds, signs,
           objects: { id: count }, categories: { cat: count }, layersUsed, distinctSprites, dataBytes },
}
Placed = { o: 'tree.oak', v, x, y, s, flip, layer: i, haze, tint: ['#hex', kBucket] | null, season, seed, z,
           strip: stripIndex | -1, anim: [Anim], glowOn: [bool per glow shape group] | null, shadow: bool, reflect: bool }
Anim   = { kind, part, parts?, pivot: [x, y], deg?, dy?, sy?, op?, period, phase, k, hold? }    // object-local; phase 0..1 from the seed
Actor  = { o, v, layer: i, path: [[x, y], ...], len, speed, loop: 'pingpong' | 'loop' | 'fade', s, sByY: [[y, s], ...] | null, seed, offset, anim: [Anim] }
Flock  = { o, n, area: [x0, y0, x1, y1], speed, s, seed, layer: i }
Sign   = { layer: i, x, y, w, h, text, bars: ['#hex'], style: 'board' | 'fascia' | 'totem', ink: '#hex', board: '#hex', seed }
```

**Bucketing, so the sprite cache stays bounded.**

- Tints are bucketed to k in {0, 0.08, 0.16, 0.24}.
- Haze is bucketed to steps of 0.1.
- `sceneScaleBucket(s) = 2 ** (Math.round(Math.log2(s) * 4) / 4)`, a step
  of about 19 %. The renderer draws the remainder with `drawImage` scaling.
- `stats.distinctSprites` counts the `(o, v, part, season, haze, tint,
  scaleBucket)` keys at view scale 1.

## 5. The Yateley rules for every scene: seasons, the live sky, weather

### 5.1 Seasons by date

`sceneSeason(ms, lat, scene)` returns the season for the date:

- If `scene.season` is fixed, it returns that.
- At |lat| < 23.5, it returns `scene.tropic`.
- Otherwise it uses the northern months (`animSeasonOf`), flipped in the
  southern hemisphere.

Without a clock (Node, QA), it uses `o.season`, else the authored
`scene.season`, else `'summer'`. Tools pass `--season`.

### 5.2 The light model

`sceneLight(o, view)` returns `sceneKit('light').live(o, view)`. This is
EXACTLY the `L` of the Yateley scenes:

- `L.alt`, `L.az`, `L.tod`, `L.phase`, `L.dark`
- `L.sun` and `L.moon`, including the real phase and limb
- sky colours `L.top`, `L.mid`, `L.low`, `L.lowSun`, `L.lowAway`
- `L.light`, `L.shade`, `L.shadeOp`, `L.haze`, `L.cloud`, `L.cover`
- weather flags `L.rain`, `L.snow`, `L.fog`, and `L.wind`
- `L.stars`, `L.lamps`, `L.windows`
- `L.shadow`, `L.water()`

The registry already passes `o.sky` for `liveSky` items:
`almSceneLight(clock, location or the scene's lat/lon, zone)` plus the
weather. With no `o.sky`, `L` is the authored moment `scene.at` on a fixed
date in the season, which is deterministic.

### 5.3 Colours: one grade function for everyone

`sceneTone(L)` returns a memoised `(hex) => hex`. It is the same maths as
the kit's `K.toneStr`: night desaturation toward blue, then multiplication
toward the shade colour by `shadeOp`, then golden-hour warmth.
`tests/scene-core.test.mjs` asserts parity against `K.toneStr` for 200
seeded colours at 6 light moments.

`sceneColour(hex, { L, haze, hazeCol, tint })` applies, in order:

1. the tint mix
2. the haze mix toward `hazeCol || L.haze`
3. `sceneTone(L)`

Shapes with `glow` are not graded. When `L.windows` is true and the
placement's seeded `glowOn` says lit, they take the object's
`night.glow[...]` colour. Otherwise they take their day paint, which is
graded.

### 5.4 Wind

`sceneWind(t, x, L)` is one shared field. `t` is in seconds and `x` is the
world x. The result is about -1.6 to 1.6:

```
w = L ? L.wind : 1                 // 0.4 .. 1.8 from the live weather
base = 0.55 sin(0.9t + 0.0035x) + 0.3 sin(2.1t + 0.011x + 1.7) + 0.15 sin(5.3t + 0.031x)
gust = 0.8 * max(0, sin(2 pi (t - x / 420) / 9)) ^ 6      // a gust travelling left to right every 9 s
return w * (base + gust)
```

The canvas renderer evaluates it per animated part. The SVG renderer
approximates it with CSS delays that grow with x, as `K.wind` does.

### 5.5 Weather

The live weather comes from `L.rain`, `L.snow`, `L.fog` and `L.wind`, and
from `o.sky.wx` (the brief's forecast):

- Rain: up to 250 short lines per frame.
- Snow: up to 200 dots.
- Fog: a veil plus 4 mist bands baked into the near layer.
- Wind: scales every sway.

`weather: 'none'` turns it off, for interiors. A scene is "ready for
weather" by default.

## 6. Renderers

### 6.1 Which renderer draws what

`sceneRendererFor(it, o)` (pure) decides:

| size / mode | renderer |
|---|---|
| `xs` to `md` (badges, chips) | SVG at LOD 0.15, still |
| `lg`, `xl` (gallery tiles, cards) | canvas, still at LOD 0.3; with `hover`, it plays on hover |
| `hero`, `fill` live (opening, gallery stage) | canvas, live at LOD 1 |
| `fill` with `detail: 'tile'` (Home's animation of the day) | canvas, live at LOD 0.5 |
| `reduced` (any size) | canvas still frame (SVG still for xs to md) |
| `o.renderer === 'svg'`, Node, or no canvas support | SVG (`sceneSvg`) |

The canvas is used only when `typeof sceneCanvasSupported === 'function' &&
sceneCanvasSupported()`. Those functions exist only in the browser bundle
(`78-scene-canvas.js`), so Node and the quality gate always get SVG.

### 6.2 Registry integration (`animItemHtml`, builder A edits it)

After the existing live-sky block, add:

```js
if (it.composed && sceneRendererFor(it, o) === 'canvas') {
  // same span and classes as any item (anim-scene ap-art c-* sz-* ap-<slot> ap-full ap-rich is-live|ap-still, tod-*),
  // plus 'ap-composed'; no <svg>: a canvas the host fills
  return `<span class="${cls.join(' ')} ap-composed" data-anim="${ref}"${theme}${aria}${sceneHostAttrs(it, o)}><canvas class="sc-canvas" aria-hidden="true"></canvas></span>`;
}
// otherwise the normal path: body = it.svg(ao), which for a composed item is sceneSvg(data, ao)
```

`sceneHostAttrs(it, o)` returns ` data-sc-lod="1|.5|.3" data-sc-still="0|1"
data-sc-hover="0|1" style="--sc-top:#..;--sc-low:#.."`. The two colours are
the sky's top and low colours for `L`, used as a placeholder gradient until
the first frame.

`animValidatePack` gains these checks:

- `composed` must be true or false.
- A composed item needs `full: true` and a `scene` object or function.
- `retro` must be an object.

Everything else is unchanged: pins, favourites, blocks, rotation, the
gallery and `when` rules.

### 6.3 The Canvas 2D renderer (`78-scene-canvas.js`, builder B)

```js
const r = sceneRendererCreate(canvas, sceneDataOrItem, { lod: 1, still: false, season: null, dpr: devicePixelRatio, key: '...' });
r.resize(cssW, cssH);        // dpr-aware; the backing store is capped at 2560 x 1440 device pixels (above that it renders smaller and CSS scales)
r.setLight(L);               // from sceneLight(); re-bakes in idle slices if the light key changed (below)
r.start(); r.stop();         // the rAF loop
r.frame(tSec);               // draw one frame at time t (used by still, tests and perf)
r.stats();                   // { drawMs: { median, p95, max, n }, bakeMs, firstBakeMs, bakes, sprites, spriteBytes, bitmaps, animatedDraws, actors }
r.destroy();                 // frees bitmaps (width = 0) and releases sprite references
sceneCanvasSupported();      // HTMLCanvasElement with a 2d context and Path2D
sceneSprites;                // the shared sprite cache { get(key, build), bytes, trim(maxBytes), clear() }, LRU, cap 96 MB
```

**Sprites.**

- One sprite is made for each `(obj, v, part, season, hazeBucket,
  tintBucket, scaleBucket x viewScale x dpr, lightKey)`.
- It is an `OffscreenCanvas` (or a detached `<canvas>`) sized to the part's
  box at that scale, plus 2 px of padding.
- It is filled with `Path2D(d)`, with colours from `sceneColour` (so the
  live grade is already in the pixels), strokes and gradients. A shape's `m`
  is applied with `setTransform`.
- Glow shapes are rasterised in their lit or day colour, as a separate glow
  sprite.

**The light key.** `lightKey` is the quantised light:

- `alt` rounded to 1 degree while |alt| < 12, else to 5 degrees
- `cover` to 0.1
- `moonUp` to 0.2
- `windows` and the season

It changes at most every few minutes at twilight, and about hourly by day
or night.

**Baking.**

- The **sky bitmap** holds the gradient (`L.top` / `L.mid` / `L.low`), the
  sun glow, the sun disc, and the moon. The moon is drawn as
  `Path2D(almMoonDiscPath(f, r))`, rotated by `limb - 90`, with the real
  phase.
- **Land bitmaps** are merged into as few as possible. A new bitmap starts at
  a layer boundary only when the farther layer has animated parts, strips,
  actors or water shimmer, or when `camera.pan > 0` and the depths differ.
  There are at most 4 bitmaps including the sky.
- A layer bakes, in order: its ground, its water (gradient from
  `L.water(base)`), the shadows of its objects (an ellipse skewed along
  `L.shadow`), its static sprites, and the static parts of animated objects.
- Wind strips are baked separately: one bitmap per strip, with only its
  y-range.
- Reflections: after baking, each `reflect` water area gets a flipped copy of
  everything above its waterline, clipped to the water, at alpha 0.35 and
  tinted with the water colours. This is baked into the water's layer.
- Re-bakes (light key, season, resize, LOD) run in idle slices of 8 ms or
  less (`requestIdleCallback`, else `setTimeout`) into new bitmaps. The old
  ones keep drawing until the swap, so there is no frame over 16 ms and no
  flash.

**Each frame.** Nothing else is drawn; there is no `clearRect`, because the
sky covers the whole canvas.

1. The sky bitmap.
2. Stars, if `L.stars > 0`: up to 220 `fillRect`s with seeded twinkle alpha.
3. Clouds: up to 10 cloud sprites drifting at `clouds.speed`.
4. For each land bitmap, far to near:
   1. the bitmap (offset by `camera.pan * depth * sin(2 pi t / period)`
      when the camera is on)
   2. its wind strips, each with `setTransform(1, 0, skew, 1, -skew * yBase,
      0)`, where `skew = amp * sceneWind(t, xMid, L) * 0.02`
   3. its animated parts, actors and flocks, y-sorted together, each with one
      `setTransform` and one `drawImage`
   4. its water shimmer (up to 40 short strokes) and the light path (up to
      30 glints)
5. Particles.
6. Weather.

Grade glow and vignette: a CSS `::after` on the host span (`--sc-vig`,
`--sc-warm`). They are composited for free, never drawn per frame.

**The wind.** One `sceneWind` evaluation per strip or part per frame.

**Time.** `t` is the age of the scene's key in seconds, using the same key
as `animSceneKey(el)` (71-anim-continuity.js), minus the time the tab spent
hidden. A re-render continues the same motion, and a re-mounted host with
the same key reuses its renderer, so there is no re-bake (6.4).

**Reduced motion** (`data-sc-still="1"` or `prefers-reduced-motion`): one
frame at t = 0, with every actor at its offset. That frame is the complete
still. It is re-drawn only when the light key changes.

### 6.4 The host (`78-scene-host.js`, builder B)

- **Mount.** One `MutationObserver` on `document.documentElement` (childList,
  subtree, plus `class` attributes on `.ap-composed`).
  - Each new `.ap-composed[data-anim]` with a `canvas.sc-canvas` is
    mounted: `animItem(ref)`, then `sceneRendererCreate`.
  - Removed hosts are released after 2.5 s (`_ASC_FORGET_MS`). A host
    re-added with the same `animSceneKey` within that time takes over the
    old renderer and its bitmaps.
  - `sceneHostScan(root)` does the same on demand.
- **Size.** Read with a `ResizeObserver`. A resize re-bakes (debounced 150
  ms; meanwhile CSS stretches the old canvas).
- **Light.** `sceneLight({ sky: almSceneLight(Clock.now(), lat, lon, zone) +
  wx }, data.view)` uses the same inputs as `animItemHtml`'s live-sky block.
  It is refreshed every 120 s while the scene is visible.
- **Pausing.** The loop stops when any of these hold:
  - the element is offscreen (an `IntersectionObserver` adds
    `.is-offscreen`)
  - `document.hidden` is true
  - the element has `.is-held` (only one rich scene plays at a time;
    `_ascRich` in `71-anim-continuity.js` already marks the others, and
    composed hosts carry `ap-rich`)
  - the element has `.is-rested` (the animation-of-the-day card rests after
    60 s)
  - `html.anim-paused` is set

  The loop restarts when the condition clears (watched through the same
  class mutations).
- **Hover.** `data-sc-hover="1"` plays on `pointerenter` and stops on
  `pointerleave`, back to the still frame.
- **Fallback.** If `getContext('2d')` fails or a bake throws, the host
  replaces its content with `<svg viewBox="0 0 1600 900"
  preserveAspectRatio="xMidYMid slice">` holding
  `sceneSvg(data, {size, reduced})`. Nothing is left blank.
- **Debug and perf.** `window.__sceneStats()` returns
  `[{ ref, ...r.stats() }]` for every live host.

The opening sequence (`78-anim-wire.js`), the county welcome, the gallery
stage and tiles (`78-anim-gallery.js`) and Home's animation-of-the-day card
(`12-home-w-animday.js`) need NO changes. They insert `animItemHtml` markup,
and the host mounts it. The animday card's node is kept across re-renders,
and the host keeps its renderer.

### 6.5 The SVG fallback renderer (`70-scene-svg.js`, builder B, pure)

`sceneSvg(dataOrThunk, o)` returns the inner markup of the `<svg>`. The
same compiled scene is drawn with symbols plus `<use>`:

- **Defs.** One `<g id>` per `(obj, v, part, season, haze, tint)` actually
  used, with toned colours. The ids are fresh per render (`U()` style), so
  the tests' "fresh ids" rule holds.
- **Placements.** `<use href="#id" transform="translate(x y) scale(+-s s)">`.
  Animated parts are wrapped in `<g class="x-sc<kind>" style="--d:..;
  --ad:..; transform-box:view-box; transform-origin:Xpx Ypx">`.
- **Wind strips.** These become one `x-scsway` group per strip.
- **Actors.** Straight-line `x-sctravel` loops from the first to the last
  path point, with the walk hook on the legs.
- **The sky.** The kit's own `K.liveSky(L)` / `K.liveClouds(L)`, plus
  `K.weather(L)` and `K.grade(L)` from `sceneKit('svg')`. This gives
  identical skies.
- **Signs.** 8.3.
- **LOD.** From `o.size`: `fill` / `hero` is 1, `lg` / `xl` is 0.3, and
  smaller sizes are 0.15.
- **Budget.** At most 1,000,000 bytes at `fill` and 150,000 bytes at `lg`
  (the rich budgets).

It is used by tests, PNG review sheets, tiny sizes, and environments without
a canvas. `sceneSvgCss()` returns nothing: the `x-sc*` keyframes live in the
global stylesheet `src/styles/76-scene.css` (6.6). There they count as "app
css" for the lint's `classes-defined` rule.

### 6.6 CSS (`src/styles/76-scene.css`, builder B)

- `.ap-composed { position: relative; background: linear-gradient(var(--sc-top), var(--sc-low)); }`
- `.ap-composed .sc-canvas { width: 100%; height: 100%; display: block; opacity: 0; transition: opacity .2s; }`
- `.ap-composed.sc-ready .sc-canvas { opacity: 1; }`
- `.ap-composed::after { /* vignette + warm glow from --sc-vig / --sc-warm */ }`
- SVG renderer keyframes, transform and opacity only: `x-scsway`, `x-scbob`,
  `x-scflap`, `x-scwalk`, `x-scpaddle`, `x-scturn`, `x-scflicker`,
  `x-scspin`, `x-sctravel`.
- Retrofit (section 7):
  - `.sr-retro .us-tint { opacity: 0 !important; }` (the live grade replaces
    the old evening tint)
  - keyframes `x-srtw` (star twinkle), `x-srfall` (particles), `x-srglow`
- Reduced motion: `.ap-still` and `@media (prefers-reduced-motion: reduce)`
  stop every `x-sc*` / `x-sr*` animation.

## 7. Retrofit: every existing hand-drawn scene gets the Yateley rules

### 7.1 Principle

Hand-drawn region scenes (US, Asia and every region since) stay as they are,
as SVG. They are already light: at most 32 KB each.

`sceneRetrofit(item, retro)` wraps the item. With a live sky (`o.sky`), its
`svg(o)` returns the original art plus a small overlay. With no `o.sky`
(Node, the lint corpus, sheets without `--at`), it returns the original art
BYTE-IDENTICAL. So the calibrated corpus, the tests and the existing lint
results do not move.

### 7.2 The overlay (`70-scene-retro.js`, builder A; at most 6,000 bytes, `SCENE_RETRO_MAX_BYTES`)

```
<g class="sr-retro">
  <g class="sr-back">ORIGINAL ART</g>                   the drawing as the backdrop layer
  sky veil     clip = retro.sky: the live sky gradient (L.top, L.mid, L.low) at opacity clamp(L.dark * 1.1, 0, .92);
               at golden hour a glow of L.lowSun at .25 round the real sun position (the painted day sky becomes the real dusk / night sky)
  stars        up to retro.stars dots in the sky path, opacity L.stars, in 3 groups with x-srtw twinkle
  moon         at L.moon (real azimuth / altitude through retro.heading / fov / horizon), real phase and limb (almMoonDiscPath), glow
  sun          only with retro.sun === 'live': the disc and glow at L.sun
  land grade   below the sky: rect fill = 1 - shadeOp * (1 - shade) per channel, mix-blend-mode: multiply  (the K.tone multiply, exact);
               night: rect #2a3a6a, mix-blend-mode: multiply, opacity L.dark * .35; warm: rect L.light at the K.tone warm factor
  lamps        copies of the art's .us-lit / .us-lamps elements ABOVE the grade (they light at real dusk via the tod-* class
               animItemHtml sets from the live sky), so windows and lamps glow instead of being darkened
  season       when retro.season === 'auto', the item's season label is 'any' and |lat| >= 23.5:
               spring #cfe8a0 soft-light .10 + 12 petals; summer: 8 motes; autumn #d27a2c soft-light .20 + 16 leaves;
               winter #e8eef6 screen .18 + a grey saturation rect .25 + 30 snowflakes (more when L.snow)
  weather      rain lines / snow / fog veil from L (shared with the canvas renderer's constants)
</g>
```

`sceneRetrofitSvg(markup, L, retro, { season, lat })` builds it.

`SCENE_RETRO_DEFAULTS`:

```js
{ horizon: 520, sky: null /* default: the rect above the horizon */, heading: 180, fov: 80,
  sun: 'painted' /* 'live' | 'painted' | 'off' */, moon: true, stars: 160, veil: true, grade: true,
  season: 'auto', particles: true, weather: true, lamps: true }
```

- `sky` is a path (`'M-160 -80H1760V520H-160z'`) when the skyline is not
  flat. For example, mountains need the sky to stop at the ridge.
- `sun: 'painted'` keeps the painted sun by day, which is the safe default.
  `'live'` is for art without a sun.

### 7.3 The region hook (`71-anim-0region.js`, builder A)

- **Config.** `animRegionDefine(cfg)` accepts `retrofit: {...defaults} |
  false`. Default `{}` means ON with `SCENE_RETRO_DEFAULTS`.
- **Scene entries.** `animRegionSceneAdd(id, { ..., retro: { horizon: 610,
  sky: 'M...', sun: 'live' } | false })` tunes one scene.
- **Upgrade.** In `builder().upgrade(o, sc)`, the upgraded full item gets
  `liveSky: { lat, lon }`. For a place, that is its row. For a unit, it is
  the unit's first big row, else the mean of its rows. The item's `svg` is
  wrapped by `sceneRetrofit`.

The registry then passes `o.sky` in the browser (the user's location, else
the scene's own lat/lon, at the computer's clock), and `tod` follows the
real sky. One edit retrofits EVERY US and Asia scene, and every region made
later with `tools/anim-pack.mjs new`.

### 7.4 Review

1. Run `node tools/anim-pack.mjs sheet --pack us-northeast --at 2026-10-07T21:30:00Z --mode night --contact`.
   `sheet` and `lint` gain `--at <ISO>` and `--location lat,lon`, which pass
   `o.sky` (builder C).
2. Run the same at dawn, noon and golden hour, and in each season.
3. Run `lint --pack us-northeast --at <ISO>`. With the overlay present it
   checks the retro rules: overlay at most 6,000 bytes, classes defined,
   transform and opacity only.

The base art is still judged by its own profile, without the overlay.

### 7.5 Later (follow-up, not this round)

`sceneRetrofitPack(manifest, defaults)` will be a one-line wrap for:

- the UK legacy packs (`uk-south-east` non-rich items, `uk-south-west`,
  `uk-north-west`)
- `texas`
- `world`

The rich Yateley and Fleet scenes already follow the rules natively. They
become composed scenes in the pilot (section 15).

## 8. Archetypes, data tables, batch generation, signage

### 8.1 Archetypes

```js
sceneArchetypeDefine('station', {
  params: { id: 'id', name: 'sign', lines: 'list', lat: 'number', lon: 'number', era: ['victorian', 'edwardian-tiled', 'holden', 'postwar', 'jubilee-modern', 'elizabeth-modern', 'dlr-elevated', 'overground-brick', 'terminus'], features: 'list' },
  meta: (p) => ({ id: 'station-' + p.id, label: p.name + ' station', site: p.name, tags: ['london', 'station', 'rail', p.era, ...p.lines], mood: 'calm', colour: 'red', region: ['GB-ENG'] }),
  build: (p, u) => ({ v: 1, id: 'station-' + p.id, view: { lat: p.lat, lon: p.lon, heading: u.pick([150, 180, 210]), fov: 70, horizon: 520 }, /* ... scene data from p ... */ }),
});
```

- `build` is pure, and its seeds come from `u.hash(p.id)`.
- `u` provides `{ hash, rnd, pick, line(id) (from sceneLine), has(feature)
  }`.
- Types:
  - `id`: `/^[a-z0-9-]{1,40}$/`
  - `sign`: passes `sceneSignText` (8.3)
  - `list`: in a table, `|`-separated
  - `number`
  - an array means an enum
- An unknown enum value is a problem in `sceneArchetypeCheck(id, row)`. The
  build falls back to the first value, so the app never breaks.

### 8.2 Data tables and batches

```js
sceneLinesDefine({ piccadilly: { name: 'Piccadilly', col: '#003688', net: 'tube' }, /* ... */ });   // public line colours; net: tube | dlr | overground | elizabeth | thameslink | national
sceneTableDefine('london-demo', {
  cols: ['id', 'name', 'lines', 'lat', 'lon', 'era', 'features'],
  rows: [
    ['baker-street', 'Baker Street', 'bakerloo|circle|hammersmith-city|jubilee|metropolitan', 51.5226, -0.1571, 'victorian', 'terrace|plane-trees|bus'],
    ['arnos-grove', 'Arnos Grove', 'piccadilly', 51.6164, -0.1331, 'holden', 'suburb|trees'],
    ['canary-wharf', 'Canary Wharf', 'jubilee', 51.5035, -0.0187, 'jubilee-modern', 'towers|water|glass-canopy'],
  ],
});
// in the pack file:
animRegisterPack({ id: 'scene-demo', name: 'Scene engine demo', items: sceneBatch('station', 'london-demo', { when: () => false }) });
```

- `sceneTable(id)` returns the rows as objects, with lists split.
- `sceneBatch(archetypeId, tableId, { filter, when, extra })` returns one
  `sceneItem` per row. `scene` is a THUNK, so hundreds of rows cost nothing
  at boot: a row is built only when it is shown or linted.
- A London pack is then:
  - one archetype file per scene type (station, terminus, journey, area,
    borough)
  - the tables (about 150 bytes per station row; about 400 stations is
    about 60 KB)
  - one pack file
  - NO generated code

### 8.3 Signage: the safe exception to "no text"

The pack rules forbid text in drawings, and that stays true for every drawn
object. The ONE exception is the engine's sign primitive. Renderers draw
place-name text from DATA:

- `sceneSignText(s)` returns `{ ok, text, problem }`:
  - It trims and collapses spaces.
  - It allows 1 to 40 characters of `/^[\p{L}\p{N} '&.,()\-\/]+$/u`.
  - It rejects (case-insensitive) the deny-list `SCENE_SIGN_DENY`:
    `underground`, `tfl`, `transport for london`, `johnston`,
    `mind the gap`, `oyster`, `roundel`, `london overground`,
    `elizabeth line`, `docklands light railway`.
  - The line names are given only as colour bars, never as words.
  - Real station names ("King's Cross St. Pancras", "Elephant & Castle")
    pass.
- **Font.** `SCENE_SIGN_FONT = '600 {px}px system-ui, -apple-system, "Segoe
  UI", Roboto, "Helvetica Neue", Arial, sans-serif'`. Never Johnston or any
  lookalike webfont. No webfont is loaded.
- **Styles.**
  - `board`: a plain rectangle (cream or white board, dark ink, thin frame)
    with the name centred. Up to 6 line-colour bars run as stripes above or
    below it.
  - `fascia`: lettering on a building's fascia band, in the building's
    palette.
  - `totem`: a post with a small board.
  - NO circles, rings, discs or a bar crossing a ring in any sign style.
  - NO line-diagram style (no route map strip with ticks or interchange
    circles).
- **SVG.** The renderer emits `<g class="sc-sign"><rect .../><rect
  bars.../><text x y font-family="system-ui, ..."
  font-weight="600">ESCAPED</text></g>`, escaped like `_animAttr`. The
  `composed` lint allows `<text>` ONLY as a direct child of `g.sc-sign`, and
  only when its content equals an escaped `signs[].text` of that scene.
- **Canvas.** `fillText` of the same string, fitted with `measureText` (it
  shrinks to fit, with a minimum of 9 px at view scale). It is baked into
  its layer bitmap. `fillText` never parses HTML.

### 8.4 Legal and style note (keep it in every London brief)

The TfL roundel, the "Underground" logotype, the line-diagram style and the
New Johnston typeface are TfL trademarks or otherwise protected. Do NOT
reproduce them, approximate them, or draw them as "decoration".

What evokes a real station without copying the marks:

- coloured bars in the line colours
- a plain sans-serif name board in the system font
- the period architecture: Victorian brick and canopy, Edwardian tiled
  frontage, Holden brick and glass drum or box, Jubilee-extension steel and
  glass
- real nearby surface features from the data

The object lint's no-roundel rule fails any `street`, `rail` or `building`
object that has a ring (an annulus, or a stroked circle or ellipse) with a
filled bar across its centre spanning more than 80 % of its diameter. The
sign primitive offers no circle at all.

## 9. Selection rules per region (London and dense cities)

### 9.1 Why

The county logic ("the nearest town within 25 to 40 km", `placeKm`) is right
for counties, but wrong in a city where stations are 400 m apart. Selection
becomes a pluggable rule per region, and it is DATA-driven so other dense
cities can reuse it.

### 9.2 API (`70-scene-select.js`, builder A, pure)

```js
sceneSelectRuleDefine(id, fn);          // fn(input) -> Result | null
sceneSelect(ruleId, input);             // runs a rule; unknown id -> 'nearest'
// built in: 'nearest' (today's behaviour: the nearest place within placeKm) and 'dense'
input = {
  now,                                  // ms
  places: [{ id, name, kind: 'station' | 'area' | 'borough', lat, lon, unit, lines?: [] }],
  fix: { lat, lon, acc, at } | null,    // the latest device fix (full precision, IN MEMORY ONLY)
  track: [{ lat, lon, acc, at }],       // the in-memory fixes of the last 2 hours (never stored)
  seen: { [placeId]: { days30, lastAt } },   // per place: distinct days it was the ARRIVAL in the last 30 days, last shown time
  params,                               // the region's numbers (below)
  seed,                                 // e.g. the day and the rotation slot
}
Result = { kind: 'arrival' | 'rotation' | 'journey' | 'area' | 'borough' | 'region', id, ids?, km, reason }
```

### 9.3 The dense rule (London defaults: `SCENE_SELECT_DENSE_DEFAULTS`)

```js
{ arriveM: 300, nearM: 400, dwellMin: 3, freshFixS: 120, maxAccM: 150, walkM: 900, areaM: 1500,
  journeyAfter: 4, journeyWindowMin: 90, commuteDays: 6, commuteWeight: 0.25, newWeight: 2.5,
  recentHours: 24, recentWeight: 0.3, rotateMin: 60 }
```

1. **Arrival.** The nearest station within `arriveM` of the fix counts as an
   arrival when either of these holds:
   - the track has fixes within `nearM` of it spanning `dwellMin` minutes or
     more
   - the fix is fresh (age `freshFixS` or less, accuracy `maxAccM` or less)

   The station just arrived at wins, and keeps winning while the user
   stays near it.
2. **Journey.** If the track passed `journeyAfter` or more distinct stations
   (each within `nearM` of a fix) in the last `journeyWindowMin` minutes, the
   result is `{ kind: 'journey', ids }`, in order. Until a journey archetype
   exists, the opening plays the last station's scene.
3. **Rotation.** Among the stations within `walkM`, each gets a weight:
   - base 1
   - times `commuteWeight` for commute stations (`seen.days30 >=
     commuteDays`: home and work, inferred, never configured)
   - times `newWeight` if it was never shown
   - times `recentWeight` if it was shown in the last `recentHours`

   The pick is seeded by `seed` (the day plus the `rotateMin` slot), so it is
   stable within a slot.
4. **Fallback.** With no station within `walkM`, the nearest area within
   `areaM` is used, then the borough (the unit whose row is nearest), then
   `region` (the general London scenes).

### 9.4 The region hook (builder A, in `71-anim-0region.js`)

- **Config.** `cfg.select = { rule: 'dense', params: {...}, kinds: ['station',
  'area'] }`. The extra row kinds are allowed in `places`, alongside
  `big` / `small` / `''`.
- **`region.select(ctx)`.** It builds `input` from `ctx`:
  - `fix` from `ctx.fix`; `track` from `ctx.track`; `seen` from `ctx.seen`
  - else a coarse fix from `ctx.lat` / `ctx.lon` with `at: 0`, which is
    never an arrival

  It returns the Result, cached per `(ctx object, minute)`.
- **`placeWhen(pid)`.** For a region with `select` and a rule other than
  `'nearest'`, it becomes `(day, ctx) => { const s = region.select(ctx);
  return !!s && s.id === pid; }`. Unit items use `s.kind === 'borough' &&
  s.id === unit`.
- **Default.** Regions without `select` behave exactly as today. The US and
  Asia tests are unchanged.

### 9.5 Privacy (binding)

- The full-precision fix and the track live in memory only. Stored location
  history keeps its 1 km rounding (`77-location-history-logic.js`).
- `seen` stores station IDS and day counts only, never coordinates. It is
  kept in localStorage (`dashboard-anim-place-seen`, at most 500 entries, 30
  days).
- Commute stations are inferred from `seen`, never asked for, never synced
  and never committed.
- Feeding `ctx.fix`, `ctx.track` and `ctx.seen` from `animCtx()` is a
  follow-up for the London pack. The stub works without them, through the
  coarse fallback.

## 10. The tool (`tools/anim-pack.mjs`, builder C)

The new commands are modules in `tools/lib/anim-cmd/`, found automatically.
`anim-pack.mjs` is edited only for the `composed` routing in `lintRegistry`
and for the usage header.

```
object new <cat>.<name> [--kit "<K call>"] [--variants N]          scaffold into 70-scene-lib-<cat>.js
object lint [<id>,...] [--json]                                     section 2.6 rules
object sheet <id>[,...] [--out dir] [--canvas] [--mode light|night]  variants x seasons (+ night) grid, size strip, 3 animation phases
object list [--category c] [--tag t]                                id, category, variants, seasons, parts, anim kinds, used by N scenes
scene new <pack> <id> [--brief file.md | --archetype <id> --row '<json>'] [--lat .. --lon .. --heading ..]   writes 71-scene-<pack>-<n>.js (+ the pack file if missing)
scene lint [<ref>,... | --pack <id> | --archetype <id> --table <id> [--rows N]] [--json]   the composed profile (data rules + variety); exit 2 on a failure
scene sheet [<ref>,... | --pack | --archetype --table] [--times] [--seasons] [--crop phone|square] [--contact] [--svg]   canvas render in headless Chrome
scene perf [<ref>,... | --pack | --archetype --table [--sample N]] [--seconds 3] [--gpu] [--rebake] [--json]   frame draw ms in the real renderer (--rebake forces a light change mid-run and reports the worst frame)
```

- `--rows N` adds N synthetic rows (seeded, in memory) to stress-test an
  archetype in batch.
- `--times` renders dawn, noon, golden hour, dusk and night. `--seasons`
  renders all four.
- The existing `lint` and `sheet` accept `--at <ISO>` and
  `--location lat,lon` (live sky; retrofit overlay included), and
  `--season <s>`.
- `brief` accepts `--kind object|composed|archetype`, using the new templates
  `tools/lib/anim-templates/{object-brief.md, composed-scene-brief.md,
  archetype-brief.md}`.

### 10.1 The page harness (`tools/lib/scene-page.mjs`, builder B; used by C)

```js
scenePageHtml({ root, refs | data, size: { w, h }, dpr: 1, mode: 'light' | 'dark', at: ISO | null, location: [lat, lon] | null, season, still, renderer: 'canvas' | 'svg' })
  // a self-contained page: the animation registry files (animRegistryFiles) + 70-scene-* + 78-scene-canvas.js + 78-scene-host.js,
  // the app css the scenes need (reg.pageCss()) + 76-scene.css; mounts each scene in a box of `size`; window.__sceneReady resolves after the first bake
sceneRenderPng(chrome, opts, file)    // waits for __sceneReady, screenshots
scenePerf(chrome, opts)               // waits, runs `seconds` of rAF, returns window.__sceneStats(): { drawMs: { median, p95, max, n }, firstBakeMs, bakeMs, sprites, spriteBytes, bitmaps, animatedDraws, actors }
```

Chrome comes from `tools/release-chrome.mjs` `launchChrome({ port })`. The
debug ports are 9331 to 9333 for the builders.

### 10.2 The `composed` lint profile (`tools/lib/scene-lint.mjs` + `tools/anim-quality.json` "composed")

**Routing.** `profileFor(it)` returns `'composed'` when `it.composed`. This
is checked first, before `scene-rich`. The thresholds are DESIGNED, not
calibrated: `"composed": { "designed": true, ... }`, which `calibrate`
skips.

**Data and performance rules** (from `sceneCompile` stats at LOD 1, in the
default season):

| rule | limit |
|---|---|
| `placements` | at most 4,000 |
| `animatedDraws` (animated parts + strips + actor parts + flock birds) | at most 350 |
| `actors` | at most 30 |
| `flockBirds` | at most 24 |
| `particles` | at most 250 |
| `layersUsed` | 3 to 6 |
| `bitmaps` (bake groups including the sky) | at most 4 |
| `distinctSprites` | warn above 300, fail above 600 |
| `spriteMB` (estimated at dpr 2) | at most 64 |
| `dataBytes` (`JSON.stringify` of the scene; an archetype row is its row) | at most 24,000 |
| `svgFillBytes` | at most 1,000,000 |
| `svgTileBytes` | at most 150,000 |
| `liveSky` (`view.lat` / `view.lon` set) | required |
| `seasons` (every seasonal object has 4 seasons) | required |
| `signs` (text rule 8.3, deny-list, at most 6) | required |

**Perf rules** (`scene perf`, or `scene lint --perf`; skipped without
Chrome; measured at 1600 x 900, dpr 1):

| rule | limit |
|---|---|
| `drawMs.median` | at most 8 (with `--gpu`), at most 14 (software raster, the pessimistic default in headless Chrome) |
| `drawMs.p95` | at most 12 (`--gpu`), at most 21 (software) |
| `firstBakeMs` | at most 300 (warn), 600 (fail) |

**The placement-variety rule** (`variety`). This replaces the shared-shape
penalty: REUSE of library objects is GOOD. What is measured is how varied
the placements are:

- **Per object** placed 6 or more times:
  - `scaleSpread`: (p90 - p10) / median of s, at least 0.25
  - `flipShare`: within 0.2 to 0.8 (flippable objects only)
  - `variantUse`: distinct variants at least min(variants, 2)
  - `grid`: the share of nearest-neighbour distances within 5 % of the
    median, at most 0.5 (no rows or stamps)
- **Per category** with 15 or more placements: `species` (distinct ids) at
  least 2, and `topShare` at most 0.8.
- **`stacked`**: no two placements of the same (obj, v, flip, scaleBucket)
  within 6 units. A fail.
- **Composition** (advisory): at least 4 categories, at least one focal
  placement (s x size.h of 160 or more in mid or near), at least 2 anim
  kinds, and at least 1 actor or flock.

The output form matches the friend's lint: PASS / FAIL per rule, thin spots,
and `--json`. The last line is `PASS: <n> items clean.` or the failures.

### 10.3 Briefs and the skill

**Templates.**

- `composed-scene-brief.md` tells an agent to:
  1. Read this spec's sections 3 and 5.
  2. Run `object list` and compose from the library.
  3. Add objects only when the subject truly needs a new one (`object new`,
     `object lint`, `object sheet`).
  4. Run `scene lint`, `scene sheet --times --seasons` and `scene perf`.
  5. Report the variety and perf numbers.
- `archetype-brief.md` covers the data table and the legal note (8.4).
- `object-brief.md` covers the object rules (2.6) and the sheet.

**The skill.** `.claude/skills/animation-pack/SKILL.md` gains a "Composed
scenes and the object library" section, plus
`references/scene-engine.md` (a one-page cheat sheet of sections 2, 3 and
10).

- The hand-drawn gates still apply to hand-drawn art.
- Composed scenes are judged by the `composed` profile, and the LOOK gate
  stays: sheets in light and night, and in all four seasons.
- The CARE rules gain the signage exception (8.3) and the legal note (8.4).

**Docs.**

- `docs/dev/ANIMATION_PACKS.md` gains a "Composed scenes" section that
  points here.
- `MODULES.md` gains rows for every new file. Builder C writes all of them
  from this spec.

## 11. The demo (builder C)

- `src/app/70-scene-data-london-demo.js`:
  - `sceneLinesDefine` for the six lines the three rows use (Bakerloo,
    Circle, Hammersmith and City, Jubilee, Metropolitan, Piccadilly), with
    the public colours
  - `sceneTableDefine('london-demo', ...)` with the 3 rows of 8.2
- `src/app/70-scene-arch-station.js`: `sceneArchetypeDefine('station',
  ...)`.
  - The building by era: `victorian` uses `building.station-victorian`,
    `holden` uses `building.station-holden`, `jubilee-modern` uses
    `building.station-modern`, and the others fall back to victorian.
  - A board sign with the name and the line bars.
  - Platform or street foreground, lamps and benches.
  - Plane-tree scatter (`plane-trees`, `trees`, `suburb`).
  - Far-layer terraces (`terrace`, `suburb`) or towers (`towers`).
  - A dock water area with reflections (`water`).
  - 3 to 6 walker actors.
  - A bus actor (`bus`).
  - Sky, seasons and weather all automatic.
- `src/app/72-anim-pack-scene-demo.js`:
  `animRegisterPack({ id: 'scene-demo', name: 'Scene engine demo', items:
  sceneBatch('station', 'london-demo', { when: () => false }) })`.
  - The items appear in the gallery, but never in the daily rotation,
    because their `when` is false.
  - Their tags include `demo`.

**Acceptance:**

- `scene lint --pack scene-demo` passes.
- `scene perf --pack scene-demo` meets 10.2.
- `scene sheet --pack scene-demo --times --seasons --contact` shows three
  clearly different stations: era, line colours and surroundings.
- The gallery stage plays each one through the canvas host with no console
  errors.

## 12. Budgets (one table)

| what | limit | enforced by |
|---|---|---|
| frame draw, 1600 x 900, normal laptop or `--gpu` | median at most 8 ms, p95 at most 12 ms | `scene perf` |
| frame draw, headless software raster | median at most 14 ms, p95 at most 21 ms | `scene perf` default |
| first bake | at most 300 ms (warn), 600 ms (fail) | `scene perf` |
| re-bake slice | at most 8 ms per idle slice; no frame over 16 ms while re-baking | renderer design, `scene perf --rebake` |
| animated draws per frame | at most 350 | `scene lint` |
| placements | at most 4,000 | `scene lint` |
| sprite cache | 96 MB LRU (all hosts); one scene at most 64 MB at dpr 2 | renderer / `scene lint` |
| backing store | at most 2560 x 1440 device px | renderer |
| scene data | at most 24 KB; archetype row at most 400 B | `scene lint` |
| SVG fallback | at most 1 MB at fill, at most 150 KB at tile | `scene lint`, `tests/anim-packs.test.mjs` |
| object | at most 600 shapes, at most 60 KB path data, at most 25 ms build per (v, season) | `object lint` |
| retrofit overlay | at most 6,000 B; none without a live sky | `tests/scene-retrofit.test.mjs` |

## 13. Ownership map

Every file has exactly one owner. Shared files that NOBODY edits this round:

- `build.mjs`, `package.json`, `serve.mjs`
- `71-anim-continuity.js`, `78-anim-wire.js`, `78-anim-gallery.js`,
  `12-home-w-animday.js`
- `71-anim-uk-nature-kit.js`
- all `72-anim-pack-*` files except the demo
- `tools/anim-reference.json`

If one of these needs a change, ask in your report instead.

### Builder A: the engine core (pure), retrofit, selection, integration hooks

| file | what |
|---|---|
| `src/app/70-scene-0core.js` (new) | constants (`SCENE_W/H`, `SCENE_CATEGORIES`, `SCENE_ANIM_KINDS`, `SCENE_LAYERS_DEFAULT`); `sceneHash`, `sceneRnd`, `sceneD`; the object registry `sceneObjDefine / sceneObj / sceneObjs / sceneObjShapes / sceneObjCheck`; `sceneKit`, `sceneShapesFromSvg`, `sceneObjFromKit`, `KIT_PARTS`; `sceneSeason`, `sceneLight`, `sceneTone`, `sceneColour`, `sceneWind`, `sceneScaleBucket`; `sceneValidate`, `sceneCompile`, `sceneData`; `sceneItem`, `sceneAdd`, `sceneItems`; `sceneArchetypeDefine / sceneArchetype / sceneArchetypeCheck`, `sceneTableDefine / sceneTable`, `sceneBatch`, `sceneLinesDefine / sceneLine`; `sceneSignText`, `SCENE_SIGN_FONT`, `SCENE_SIGN_DENY` |
| `src/app/70-scene-retro.js` (new) | `sceneRetrofit`, `sceneRetrofitSvg`, `SCENE_RETRO_DEFAULTS`, `SCENE_RETRO_MAX_BYTES` |
| `src/app/70-scene-select.js` (new) | `sceneSelectRuleDefine`, `sceneSelect`, the rules `nearest` and `dense`, `SCENE_SELECT_DENSE_DEFAULTS` |
| `src/app/71-anim-0region.js` (edit) | `cfg.retrofit`, `entry.retro`, `liveSky` on upgraded items, `cfg.select`, `region.select(ctx)`, the `placeWhen` and `unitWhen` hook, extra row kinds |
| `src/app/71-anim-registry.js` (edit) | `animValidatePack` (`composed`, `scene`, `retro`); the composed branch in `animItemHtml` (6.2); doc comment lines |
| `tools/lib/anim-sources.mjs` (edit) | `SCENE_FILE_RE = /^7[01]-scene-[a-z0-9-]+\.js$/`, included in `animRegistryFiles` |
| `tests/scene-core.test.mjs` (new) | object define, check and shapes; parser on 3 kit outputs; compile determinism and LOD; scatter minGap and masks; tone parity with `K.toneStr`; seasons (north, south, tropic); wind; archetype, table and batch (thunks not built at load); `sceneSignText` deny-list and escaping; `sceneItem` passes `animValidatePack` |
| `tests/scene-retrofit.test.mjs` (new) | no `o.sky` gives byte-identical art for every US and Asia scene; with a night sky: the overlay is at most 6,000 B, there is a moon with the real phase, and the lamps are copied above the grade; region items carry `liveSky` |
| `tests/scene-select.test.mjs` (new) | arrival (dwell; fresh fix), the station just arrived at wins; journey after 4 stations; rotation weights (commute less, new more, recent less) and seeded stability; fallback to area, borough and region; a fake dense region through `region.select` and `placeWhen` |

Time box: core (about 60 min), parser (20), retro (20), select (20), hooks
and tests. A stubs nothing from B or C.

`sceneItem`'s `svg` calls `sceneSvg` (B). Until B lands, A's tests call
`sceneCompile` directly, and `animItemHtml` for composed items is tested
with a `typeof sceneSvg === 'function'` guard.

### Builder B: the renderers, the host, CSS, the page harness

| file | what |
|---|---|
| `src/app/70-scene-svg.js` (new, pure) | `sceneSvg`, `sceneRendererFor`, `sceneHostAttrs`, `sceneSvgCss` (returns ''), the sign drawing (SVG) |
| `src/app/78-scene-canvas.js` (new, browser) | `sceneCanvasSupported`, `sceneRendererCreate`, `sceneSprites` (6.3), the sign drawing (canvas), sky, clouds, stars, water, reflections, particles, weather |
| `src/app/78-scene-host.js` (new, browser) | mount and unmount, renderer reuse by key, ResizeObserver, IntersectionObserver, visibility, hold and rest, hover, re-light timer, fallback to SVG, `sceneHostScan`, `window.__sceneStats` (6.4) |
| `src/styles/76-scene.css` (new) | 6.6, including the retrofit classes A's overlay uses (`sr-retro`, `x-srtw`, `x-srfall`, `x-srglow`) |
| `tools/lib/scene-page.mjs` (new) | `scenePageHtml`, `sceneRenderPng`, `scenePerf` (10.1) |
| `tests/scene-render.test.mjs` (new) | Node: `sceneSvg` is deterministic apart from fresh ids, has the slice viewBox via `animItemHtml`, fits the budgets, has the sign `<text>` only in `g.sc-sign`, and LOD thins; `sceneRendererFor` table; host markup. Chrome (skipped when `findBrowser()` is null; use port 9332): a fixture scene renders non-blank, a still frame equals a frame at t = 0, and `drawMs` is reported. |

B develops against a hand-written COMPILED fixture (`tests/fixtures/scene-compiled.json`, B's file; section 4 form, with about 10 inline test objects via `sceneObjDefine` in the test) until A lands. Time box: SVG renderer (30 min), canvas bake and frame (60), host (25), harness and tests (25).

### Builder C: the library, the demo, the tool, the lint, briefs, skill and docs

| file | what |
|---|---|
| `src/app/70-scene-lib-trees.js`, `-plants.js`, `-water.js`, `-people.js`, `-buildings.js`, `-street.js`, `-rail.js` (new) | the starter set (2.3) |
| `src/app/70-scene-data-london-demo.js`, `src/app/70-scene-arch-station.js`, `src/app/72-anim-pack-scene-demo.js` (new) | the demo (section 11) |
| `tools/lib/anim-cmd/object.mjs`, `tools/lib/anim-cmd/scene.mjs` (new) | the commands (section 10) |
| `tools/lib/scene-lint.mjs` (new) | `lintScene(dataOrItem, thresholds, { perf })`, `lintObject(id)`, `placementVariety(compiled)`, `retroCheck(markup)` |
| `tools/anim-quality.json` (edit) | `composed` and `object` sections (`designed: true`) |
| `tools/lib/anim-quality.mjs` (edit) | `profileFor` gives `composed` first; `RULE_PLAN.composed`; `calibrate` skips designed profiles; `structure` allows `<text>` only in `g.sc-sign` for composed |
| `tools/anim-pack.mjs` (edit) | `lintRegistry` routes composed items to `lintScene`; `--at`, `--location` and `--season` on `lint` and `sheet`; usage header |
| `tools/lib/anim-render.mjs` (edit) | pass `o.sky` (`almSceneLight`) and `o.season` through `reg.html` when given |
| `tools/lib/anim-cmd/brief.mjs` (edit), `tools/lib/anim-templates/object-brief.md`, `composed-scene-brief.md`, `archetype-brief.md` (new) | 10.3 |
| `.claude/skills/animation-pack/SKILL.md` (edit), `.claude/skills/animation-pack/references/scene-engine.md` (new) | 10.3 |
| `docs/dev/ANIMATION_PACKS.md` (edit), `MODULES.md` (edit) | 10.3 |
| `tests/scene-lib.test.mjs`, `tests/scene-tool.test.mjs` (new) | every object lints; demo items lint; the variety rule on crafted placements (rows fail, stamps fail, varied passes); CLI `object list`, `object lint --json`, `scene lint --pack scene-demo --json` and `scene lint --archetype station --table london-demo --rows 50` (in under 10 s) |

C develops library objects and the demo against the API above. Its lint and
CLI tests become green when A lands; its sheets and perf when B lands. Time
box: library (45 min), demo (25), commands and lint (50), docs, skill and
templates (20).

### Order of landing

Each builder works in its own git worktree from the spec commit (`git
worktree add C:/tmp/scene-<x>/wt scene-engine`) on branch `scene-<x>`, and
commits there. The reviewer merges A, then B, then C into `scene-engine`.
Every builder runs `guard --owned <its files>` before its final commit.

## 14. Integration test plan (the reviewer, after the merge)

1. Build: `node build.mjs --syntax`, then `node build.mjs`. Check there are
   no "before initialization" errors at load, either in Node
   (`tests/anim-packs.test.mjs` loads every animation file) or in the
   browser.
2. Tests:
   - Run `npm test` FOUR times. Every run must pass.
   - KNOWN ISSUE to find and fix: `tests/anim-pack-cli.test.mjs` sometimes
     crashes node on Windows (exit 3221225477, an access violation) when
     run in the full suite. It passes alone.
     - Reproduce it with `node --test` (full suite) and with
       `--test-concurrency=1`.
     - Then fix the cause in the test or the tool: for example a child
       process or headless Chrome left running or killed mid-write, a
       shared port or profile dir, or a temp dir removed under a running
       process.
     - Never skip the test or remove it.
3. Existing corpus unchanged:
   - `node tools/anim-pack.mjs lint --pack uk-south-east` is still 208/208.
   - `lint` for every `us-*` and `asia-*` pack still passes.
   - `status us` and `status asia` are complete.
   - The retrofit must not change markup without `o.sky`.
4. Library: `object lint` passes. Then `object sheet tree.oak,building.station-holden --out C:/tmp/scene-review` and LOOK at it: the variants differ, the seasons differ, and the night column is graded.
5. Demo:
   - `scene lint --pack scene-demo` passes.
   - `scene perf --pack scene-demo` meets section 12.
   - `scene sheet --pack scene-demo --times --seasons --contact`: LOOK at
     it. The three stations are clearly different, the sky is real at each
     time, and the signs are plain sans with line bars and no roundel.
   - `scene lint --archetype station --table london-demo --rows 200`
     finishes in under 20 s, and the batch passes.
6. Retrofit:
   - `sheet --pack us-northeast --at 2026-10-07T21:30:00Z --location
     43.66,-70.26 --mode night` shows the real night sky with the moon in
     its real phase, lit windows and lamps, and no double darkening.
   - `--at` at noon shows the original painted look plus the season tint.
   - `lint --pack us-northeast --at ...` passes the retro rules.
7. Browser, on port 4391 with test data (`make-test-data.mjs`, never the
   live data):
   - Gallery: demo tiles are canvas stills that play on hover; the stage
     plays live.
   - Pin a demo item as the opening, reload, and check the opening plays it
     full screen.
   - Animation of the day card (pinned): it plays and rests after 60 s, and
     a re-render does not restart or re-bake it (`__sceneStats().bakes`
     unchanged).
   - Reduced motion gives one still frame.
   - Hiding the tab stops the frames; scrolling it offscreen stops them.
   - A resize re-bakes once.
   - No console errors.
   - Check a US scene at the real time of day: the live grade, and the lamps
     after dusk.
8. Privacy: run `node tools/privacy-scan.mjs`. Grep the diff for anything
   personal; the demo rows are public stations only.
9. Docs: `MODULES.md` rows exist for every new file, and this spec matches
   what was built. Correct the spec where the build deviated, and say so in
   the commit.

## 15. Later phases (after this round)

1. **Pilot.** Convert the Yateley Common and Fleet Pond views into composed
   scenes, from the same kit objects, keeping the item ids, `ukPlace`,
   `ukView` and `ukSeason`.
   - The 4 seasonal copies per view collapse into one auto-season scene
     each, keeping one alias per old id.
   - Target: 16,000 nodes at 50 to 100 ms becomes a frame under 8 ms.
2. **Retrofit the rest.** Apply `sceneRetrofitPack` to the UK legacy packs,
   Texas and World (7.5), each with a review sheet.
3. **The London pack.**
   - A `71-anim-region-london.js` config with `select: { rule: 'dense' }`.
     The units are boroughs, and the rows are stations (about 400:
     Underground per line, DLR, Overground, the Elizabeth line, Thameslink
     and the national rail termini) plus areas.
   - Archetypes `station`, `terminus`, `elevated` (DLR), `journey`, `area`
     and `borough`, with tables built from public data: id, name, lines,
     lat/lon, era and surface features.
   - Feed `ctx.fix`, `ctx.track` and `ctx.seen` in `animCtx()`, under 9.5.
   - The London region claims Greater London, and the UK county opening for
     `greater-london` defers to it.
4. **More objects and packs.** Every new place adds objects to the library
   (community packs later). See `docs/dev/GROWTH_PLAN.md`: performance
   budgets, small fun details and gamification.
5. **A scene editor** in the gallery: drag library objects onto layers, save
   as scene data.
