# Scene engine v2: the engine does the hard parts

Status: SPEC, revision 1 (8 Oct 2026), branch `uk-rebuild`. This is the contract
for the v2 build round. Eight builders (A to H) work in parallel; an
integration review and a showcase stage follow. Briefs cite sections as
"V2 n.m".

It builds on `docs/dev/SCENE_ENGINE.md` ("the v1 spec", cited as "v1 n.m").
Everything in v1 stays valid unless this document says otherwise: the object
format (v1 2), the scene format (v1 3), the compiled form (v1 4), the light
model (v1 5), the renderers (v1 6), the tool (v1 10), the budgets (v1 12) and
the standard (v1 15).

Read first:

- `CLAUDE.md` and `MODULES.md` (the scene engine rows)
- v1 sections 2 to 6, 10, 12 and 15
- the header comments of `src/app/70-scene-0core.js`,
  `src/app/78-scene-canvas.js` and `src/app/70-scene-svg.js`
- `tools/lib/scene-lint.mjs`
- for H only: `git show object-import:docs/dev/OBJECT_IMPORT.md`, about the
  raster objects

## 0. Why, and the one principle

**The request (user, 8 Oct).** Scenes built by cheaper models and by hand keep
getting placement, scale, water and lighting wrong:

- a car on grass
- a canal drawn as a lake
- see-through "ghost" trees
- a cluttered station
- floating objects
- the wrong scale
- too much haze

The user asked to "stop everything and rebuild the engine", so that the
engine does the hard parts automatically and every scene comes out right
whoever builds it. Existing composed scenes must keep working, and the speed
budgets still hold: a frame at 1600 x 900 takes at most 8 ms (median).

**Diagnosis.** This comes from reading the v1 engine, about 385 composed
items, and the batch-2 WIP scenes (commit `6dbf24f`).

1. **Placement is in screen pixels.** In v1 the author chooses `x`, `y`, `s`
   and `layer`. Nothing knows that a row of pixels is a road or a lawn, so:
   - a car can sit on grass;
   - two people side by side can differ in size by 2x;
   - a tree's foot can be in the sky.

   The depth ladder (v1 2.8) fixes people, and nothing else.
2. **Water is a screen polygon.** It is a gradient, plus a mirror of
   everything above its FAR EDGE at alpha 0.35, plus 40 shimmer strokes.
   - There is no channel in perspective, so a canal becomes a band (a lake).
   - Mirroring everything about the far edge is wrong for anything not
     standing on that edge.
3. **Shadows are two ellipses per object.** Nothing is cast from a
   silhouette, so a building's shadow is an oval.
4. **Haze is set per layer, by hand.** The default horizon haze is 0.65.
   - A large, near object in a hazy layer reads as a ghost.
   - The haze authors choose is often far too much.
5. **Every builder makes these physical decisions again.** The lint measures
   richness (the v1 bar), not sanity, so a scene that is rich and wrong
   passes.

**The principle: AUTHORS DECLARE, THE ENGINE DECIDES.** An author states WHAT
is WHERE ON THE GROUND, for example:

- "a car on the road, 24 m away, heading away"
- "a heron on the bank"
- "a canal 9 m wide that runs away to the left"

The engine then computes, by itself:

- the screen position, scale, baseline, draw order, layer and haze;
- the shadow, the reflection, the light and the weather;
- the life (crowds and traffic).

It refuses, or corrects with a warning, anything that is physically wrong.
The same rules apply to a hand-written recipe, a Haiku-built one, an
OpenStreetMap import and the auto-composer.

**Delivered this round.** Each feature, its section and its owner:

| # | feature | section | builder |
|---|---|---|---|
| 1 | ground grid, camera, surfaces, ground placements, snapping | 2 to 4 | A |
| 2 | automatic water: mirror, ripples, depth fade, tint, glint, edges, wakes, rings; canals | 5 | B (A compiles the geometry) |
| 3 | automatic shadows: silhouette, sun-true, contact, actors, lamps | 6 | B |
| 4 | atmosphere and light: aerial perspective, rim light, shading, night sources | 7 | C |
| 5 | weather: rain, wet ground, puddles, snow and accumulation, fog banks, wind, frost | 8 | C |
| 6 | crowds and traffic flows | 9 | D |
| 7 | seasonal ground cover | 10 | A |
| 8 | smarter scatter | 11 | A |
| 9 | placement-sanity lint, `--strict-placement` | 15 | D |
| 10 | real layouts from OpenStreetMap (authoring only) | 17 | E |
| 11 | real terrain and horizons | 18 | E |
| 12 | procedural buildings and streets | 19 | F |
| 13 | camera presets, the auto-composer, the composition lint | 20 | G |
| 14 | the automatic visual critic | 21 | G |
| 15 | the drag-and-drop scene editor | 23 | H |
| 16 | the style normaliser for imported raster objects | 24 | H |
| 17 | the golden set | 22 | G |

**Not this round:**

- WebGL or a 3D renderer. The engine stays Canvas 2D with baked sprites.
- Any network access at runtime: the app stays offline.
- New npm dependencies.
- Redrawing hand-drawn scenes.
- Migrating all 385 composed items. The tool is built and run on a sample;
  the packs migrate in a later stage.

### Ground rules (all builders)

The v1 ground rules still apply (v1 1, "Ground rules"): zero dependencies,
Node >= 20, PURE `70-scene-*` files, the load order, IIFEs for local
helpers, no personal data, never port 4173 or the live data. This round adds
the rules below.

- **One tree, no worktrees.** Everyone works in `C:/Users/bob/T3/opendash` on
  branch `uk-rebuild`.
  - Commit ONLY your own files, by explicit path:
    `git -c user.name="Mahdi Ahmed" -c
    user.email="97956683+mahdi1190@users.noreply.github.com" commit -m "..."
    -- <your files>`. End the message with `Co-Authored-By: Claude Opus 5.5
    <noreply@anthropic.com>`.
  - If `.git/index.lock` exists, another builder is committing: wait and
    retry. Never delete the lock.
  - Run `node tools/anim-pack.mjs guard --owned <your files>` first and
    report its output verbatim. Its known false alarms on `tests/*` and the
    quality JSON files are the only acceptable failures (v1 1).
  - Never push, tag or touch a remote. Never `git stash`.
- **`index.html` is shared.** Build with `node build.mjs --syntax` or
  `node build.mjs --out C:/tmp/v2-<x>/index.html`.
  - Only H builds the default `index.html` (for the editor's app check), and
    only in its final hour.
- **Tests.** Run your own new test files plus `node --test
  tests/scene-*.test.mjs`. The reviewer runs the full `npm test`.
- **No network in tests.** E's and G's tools take an injected `fetch` and
  `run`; their tests use fixtures.
- **Your own port, Chrome debug port and temp dir:**

  | builder | port | Chrome debug port | temp dir | private prefix |
  |---|---|---|---|---|
  | A | 4401 | 9341 | `C:/tmp/v2-a` | `_scgr` (ground), `_scsc` (scatter), `_scre` (real), `_scrc` (recipe) |
  | B | 4402 | 9342 | `C:/tmp/v2-b` | `_scps` (passes), `_scwa` (water), `_scsh` (shadow) |
  | C | 4403 | 9343 | `C:/tmp/v2-c` | `_scat` (atmos), `_scwx` (weather) |
  | D | 4404 | 9344 | `C:/tmp/v2-d` | `_scfl` (flow) |
  | E | 4405 | 9345 | `C:/tmp/v2-e` | `_sccr` (credit) |
  | F | 4406 | 9346 | `C:/tmp/v2-f` | `_scbg` (generator) |
  | G | 4407 | 9347 | `C:/tmp/v2-g` | `_sccm` (camera) |
  | H | 4408 | 9348 | `C:/tmp/v2-h` | `_sced` (editor) |

- **Names.** Every new top-level name starts with `scene` or `SCENE_`.
  - Private top-level names use your prefix from the table, because every
    classic script shares one scope.
  - Anything else stays inside the file's IIFE.
- **Lazy calls.** A `70-scene-1*.js` file may call `70-scene-0core.js` at
  load time. It may call the OTHER `70-scene-1*` files, the generator and
  the 71 files only lazily, inside functions, and always behind a
  `typeof fn === 'function'` guard. Any builder can then land first.
- **Backward compatibility is a hard gate** (section 14). Each builder proves
  it for their own part.

## 1. Architecture at a glance

```
 authoring (tools, Node)                 recipe (plain JSON data)        pure engine (Node + browser)                    browser only
 -----------------------                 ------------------------        ----------------------------                    ------------
 scene new / migrate (D)  ------------>  camera (2)                      sceneCompile, v2 branch (A)                     78-scene-0pass.js    pass registry (B)
 scene osm (E) ------------------------> surfaces (3)                      70-scene-1ground.js  camera, projection,      78-scene-canvas.js   hooks only (B)
 scene terrain (E) --------------------> place: ground or pixel (4)                             surfaces, snapping,      78-scene-water.js    water pass (B)
 scene street / building (F) ----------> water v2 (5)                                           depth order (A)          78-scene-shadow.js   shadow pass (B)
 scene compose (G) --------------------> buildings, streets (19)           70-scene-1scatter.js scatter, cover (A)       78-scene-atmos.js    atmos pass (C)
 the scene editor (H) -----------------> scatter v2, cover (10, 11)        70-scene-1real.js    real sizes (A)           78-scene-weather.js  weather pass (C)
                                         flows (9)                         70-scene-1recipe.js  recipes (A)              78-scene-flow.js     flow pass (D)
                                         atmos, weather (7, 8)             70-scene-gen-*.js    buildings (F)            78-scene-host.js     v2 light, env overrides (C)
                                         source: osm / terrain (17, 18)    70-scene-1flow.js    flows (D)                78-scene-editor.js   editor (H)
                                                                           70-scene-1atmos.js, -1weather.js (C)
                                                                           70-scene-1camera.js  presets (G)
                                                                           70-scene-1credit.js  credits (E)
                                                                           = the COMPILED scene v2 (12) ---------------> canvas (passes) / SVG still (B)
 lint: data, bar (v1) + sanity (D, 15) + composition (G, 20.4); critique (G, 21); golden (G, 22); object normalise (H, 24)
```

**File order.** Build concatenation and Node loading use file-name order:

```
70-scene-0core < 70-scene-0kit < 70-scene-1atmos < 70-scene-1camera < 70-scene-1credit < 70-scene-1flow < 70-scene-1ground
  < 70-scene-1real < 70-scene-1recipe < 70-scene-1scatter < 70-scene-1weather < 70-scene-arch-* < 70-scene-data-*
  < 70-scene-gen-0building < 70-scene-gen-style-* < 70-scene-lib-* < 70-scene-retro < 70-scene-select < 70-scene-svg
  < 71-* < 72-* < 78-scene-0pass < 78-scene-atmos < 78-scene-canvas < 78-scene-editor < 78-scene-flow < 78-scene-host
  < 78-scene-shadow < 78-scene-water < 78-scene-weather
```

- `tools/lib/anim-sources.mjs` already matches `7[01]-scene-*`, so the
  `70-scene-1*` and `70-scene-gen-*` files are picked up with no edit.
- The browser-only `78-scene-*` files must also be in the page harness. B
  makes `tools/lib/scene-page.mjs` include every `78-scene-*.js` in name order
  (not a fixed list).

**The v2 switch.** A scene is v2 when its data has a `camera` (section 2).
`sceneCompile` sends v2 data down the v2 branch (A, section 12). v1 data
compiles exactly as today, byte for byte (section 14).

## 2. Ground and camera (builder A)

### 2.1 The camera

```js
camera: {
  eye: 1.65,          // metres above the ground under the camera (street 1.5 to 1.8; a bridge 5 to 8; an upper window 8 to 12)
  fov: 66,            // horizontal degrees across the 1600-unit frame
  horizon: 470,       // the screen row of eye level (the camera always looks level; see below)
  heading: 120,       // compass degrees it looks toward (the sun, the moon, OSM and terrain need it)
  x0: 800,            // optional: the principal point, the column of the vanishing point (default the centre)
  lat: 53.3897, lon: -1.4747,   // optional: where the camera stands (default view.lat / view.lon)
  alt: 41,            // optional: ground elevation above sea level in metres (terrain, 18; snow climatology, 8.4)
  water: -0.4,        // optional: the height of still water relative to the ground plane (a canal 0.3 to 0.5 below its coping)
  preset: 'street',   // optional: the preset that filled the defaults (G, 20.1); informational
}
```

**The camera always looks LEVEL (pitch 0).** Looking up or down is modelled as
a shifted lens: the horizon row moves, and verticals stay vertical, as in
architectural photography.

- This is what makes upright sprites correct at any horizon row.
- A low horizon (a row near 300) looks up at a tower. A high one (a row near
  650) looks down over a town from a hill.

**View sync.** In a v2 scene, `view.horizon`, `view.fov` and `view.heading`
are FILLED FROM the camera (`view` keeps `lat`, `lon` and `lift`). The sky,
sun, moon and stars (`K.live`) therefore stand on the same horizon as the
ground. If an author gives both and they differ, the camera wins and the
compile reports a `viewSync` problem (a warning).

### 2.2 Projection: the exact maths (`70-scene-1ground.js`)

Ground coordinates are in metres:

- `x`: to the right of the camera's axis
- `d`: forward distance along the axis (`d > 0`)
- `h`: height above the ground plane (0 on flat ground; relief, 2.4)

All of these come from the camera:

```
f      = 800 / tan(fov / 2)                       // focal length, in scene units
X      = x0 + f * x / d                           // the screen column
Y      = horizon + f * (eye - h) / d              // the screen row of a ground point
size   = f * H / d                                // the on-screen height of something H metres tall at depth d
dMin   = f * eye / (900 - horizon)                // the ground depth at the bottom edge of the frame
x(X,d) = (X - x0) * d / f                         // inverse: the ground x of a column at depth d (X from -160 to 1760)
d(Y)   = f * (eye - h) / (Y - horizon)            // inverse of a row (h from relief; 0 on flat ground)
```

Some numbers. With `eye 1.65`, `fov 66` and `horizon 470`:

- `f = 1232` and `dMin = 4.7 m`.
- A 1.72 m person 20 m away is 106 units tall.
- The same person 8 m away is 265 units tall: over the 150-unit care cap,
  so 4.5 below applies.
- A 4.4 m double-decker bus 40 m away is 136 units tall.

**API** (pure, A):

```js
sceneCamera(data)                     // -> Cam {eye, fov, horizon, heading, x0, f, dMin, dMax: 20000, water, lat, lon, alt, bands, relief}; memoised per data
sceneProject(cam, x, d, h = null)     // -> {X, Y, k: f / d}; h null = the relief height at (x, d)
sceneUnproject(cam, X, Y)             // -> {x, d} on the ground (relief: 6 Newton steps); null above the horizon
sceneGroundHeight(cam, x, d)          // -> metres (0 without relief)
sceneDepthBand(cam, d)                // -> the layer index for a depth (2.3)
```

### 2.3 Depth bands are the layers

In a v2 scene, each layer gets a depth range, and placements are sorted into
layers BY DEPTH. Authors no longer choose layers.

```js
SCENE_BANDS_DEFAULT = [               // metres; replaces SCENE_LAYERS_DEFAULT for v2 scenes
  { id: 'horizon', d: [800, Infinity] }, { id: 'far', d: [200, 800] }, { id: 'mid', d: [50, 200] },
  { id: 'near', d: [15, 50] }, { id: 'fore', d: [0, 15] }, { id: 'front', d: null },   // front: only explicit (framing, 20.3)
]
```

- `layers` in a v2 recipe may override the `d` ranges. A street that ends at
  120 m might use `mid: [35, 120]`. There are at most 8 layers, as in v1.
- **Layer haze is NOT used in v2.** Haze comes from the depth itself (C, 7.1).
- A placement may force `layer: 'front'` (framing) or another layer. The
  lint warns when that disagrees with its depth by more than one band.
- The bake plan (v1 6.3) still merges static layers into at most 5 land
  bitmaps. The bands cost nothing per frame.

### 2.4 Relief (optional)

```js
ground: { relief: { x: [-300, 300], d: [5, 1200], nx: 7, nd: 9, h: [/* nx * nd metres, row-major by d */], src: 'terrain' } }
```

Heights are sampled bilinearly in `(x, log d)`.

- E's terrain tool (18) writes this grid; an author may also write one by
  hand (a gentle rise to a church).
- A placement on relief gets `Y` from `eye - h`. Surfaces are subdivided
  along `d` (8 steps per band) so that their edges follow the relief.
- Water is always flat at `camera.water + h(at its near edge)`.
- Relief is meant for gentle slopes in the near and middle distance. Hills
  on the skyline are ridges (18.3), not relief.

## 3. Surfaces (builder A)

### 3.1 Kinds

`SCENE_SURFACE_KINDS` (pure data in `70-scene-1ground.js`) defines each
kind's flags, its default paint slot (with colours in four seasons, which a
scene's `palette` may override), and the factors that weather and seasonal
cover use. The paint slot is the kind's name unless the table says otherwise.

| kind | walk | drive | rail | plant | hard | wet | snow | leaves | default look |
|---|---|---|---|---|---|---|---|---|---|
| `road` | | car, bus, bike, tractor | | | yes | 0.8 | slush | 0.3 | tarmac; markings `centre`, `edge`, `bus`, `zebra`, `none` |
| `parking` | yes | car | | | yes | 0.7 | slush | 0.3 | tarmac, bay lines |
| `driveway` | yes | car | | | yes | 0.6 | slush | 0.4 | block paving |
| `track` | yes | tractor, car | | | | 0.3 | full | 0.5 | dirt ruts with a grass centre |
| `pavement` | yes | | | | yes | 0.6 | slush | 0.5 | flags, kerb at the road edge |
| `plaza` | yes | | | | yes | 0.7 | slush | 0.4 | setts or large flags |
| `platform` | yes | | | | yes | 0.6 | slush | 0.2 | flags, a yellow edge line |
| `path` | yes | bike | | | | 0.3 | full | 0.8 | gravel or earth |
| `towpath` | yes | bike | | | | 0.3 | full | 0.8 | gravel, the coping edge on the water side |
| `cycleway` | yes | bike | | | yes | 0.5 | slush | 0.4 | red or green tarmac |
| `steps` | yes | | | | yes | 0.5 | full | 0.5 | treads in perspective |
| `bridge` | as declared | as declared | | | yes | 0.6 | full | 0.3 | a deck over water, rail or road (`over`) |
| `rail` | | | train | | | 0.2 | full | 0.2 | ballast, sleepers, two rails per track |
| `tramway` | | car, bus | tram | | yes | 0.8 | slush | 0.3 | road with embedded rails |
| `grass` / `lawn` / `park` | yes | | | yes | | 0.2 | full | 1 | grass; a lawn has mowing stripes |
| `verge` | | | | yes | | 0.2 | full | 1 | rough grass |
| `field` | | tractor | | yes | | 0.1 | full | 0.6 | crop rows or pasture (`crop`) |
| `meadow` | yes | | | yes | | 0.1 | full | 0.8 | long grass and wild flowers |
| `heath` | yes | | | yes | | 0.1 | full | 0.6 | heather, sand and bracken |
| `wood` | yes | | | yes | | 0.1 | partial | 1.2 | leaf litter under canopy |
| `garden` | yes | | | yes | | 0.2 | full | 1 | lawn and beds |
| `bank` | yes | | | yes | | 0.4 | full | 0.8 | the grassy or muddy edge of water |
| `reedbed` | | | | reeds only | | 0.6 | partial | 0.3 | reeds |
| `beach` / `sand` / `shingle` | yes | | | | | 0.5 | full | 0.1 | sand or pebbles |
| `rock` | yes | | | | yes | 0.4 | full | 0.1 | rock |
| `mud` | birds | | | | | 0.9 | full | 0.2 | mud flats |
| `edge` | | | | | yes | 0.5 | full | 0.2 | coping, kerb or wall top (decoration only) |
| `rooftop` | birds | | | | yes | 0.4 | full | 0.3 | flat roof |
| `plot` | | | | | | 0.2 | full | 0.6 | ground for buildings (yards, forecourts) |
| `water` | | | | | | | | | registered by the water regions (5); never painted as a surface |

The `wet`, `snow` and `leaves` columns are read by C (8) and by seasonal
cover (10). `wet` is how mirror-like the surface is when wet, from 0 to 1.
`snow`: `full` means it lies white; `slush` means grey with tyre tracks;
`partial` means it is patchy under a canopy.

### 3.2 Declaring surfaces

Surfaces are listed far to near in paint order. A later entry paints over an
earlier one, so lookup takes the LAST surface that contains a point. All
coordinates are ground metres.

```js
surfaces: [
  { id: 'land', kind: 'grass', rest: true },                                     // everything not covered (at most one; default kind grass)
  { id: 'fields', kind: 'field', band: [120, 900], crop: 'stubble' },            // a depth band across the whole width
  { id: 'green', kind: 'park', poly: [[-80, 14], [-9, 14], [-9, 160], [-80, 160]] },  // a polygon
  { id: 'road', kind: 'road', path: [[2, 4], [3, 90], [-30, 400]], width: 7.3, markings: 'centre' },   // a strip along a centreline
  { id: 'pave-l', kind: 'pavement', beside: 'road', side: 'left', width: 2.6, kerb: 0.12 },            // a strip along another strip's edge
  { id: 'pave-r', kind: 'pavement', beside: 'road', side: 'right', width: 2.6, kerb: 0.12 },
  { id: 'xing', kind: 'road', path: [[-40, 30], [40, 30]], width: 7, markings: 'zebra', crossing: true },  // people may stand on it
]
```

- **Path strips** are Catmull-Rom smoothed (0.5 m tolerance), then offset
  `width / 2` to each side. `beside` offsets from the parent strip's edge,
  with an optional `gap` (a verge between them).
- **Clipping.** Every strip and polygon is clipped to the view frustum: `d`
  from `dMin * 0.9` to `dMax`, and `|x|` up to `d * tan(fov / 2) * 1.2`.
- **Ids** are unique per scene and match `/^[a-z0-9-]{1,30}$/`. Placements,
  flows and `beside` refer to them.
- **The default ground.** With no `rest` surface, a `grass` rest is assumed.
  A v2 scene therefore never has holes where the sky shows through the
  ground.

### 3.3 What the compile emits for a surface

Surfaces become entries in `C.ground`, so both renderers draw them with no
change. One entry is emitted per surface per depth band, cut at the band
edges, so a long road is drawn partly in `near` and partly in `mid`.

- **The fill.** A vertical linear gradient from the far colour to the near
  colour, with aerial perspective already in it: the far stop is hazed by
  C's `sceneHazeAt` (7.1). Without C, there is no haze.
- **Edges.** Kerbs (a light top strip and a dark face), the coping on the
  water side of a towpath, and platform edge lines are all extra `C.ground`
  entries. They are drawn only where they are at least 1.2 units tall on
  screen.
- **Markings.** Road lines are dashed in perspective: 3 m dashes, 6 m gaps,
  0.1 m wide. Zebra stripes, bay lines and rails with sleepers come from the
  same projection.
  - Thin far markings are dropped below 0.6 units.
  - Rails are two lines. Sleepers are drawn only in the `near` and `fore`
    bands.
- **Texture** (lawn stripes, field rows, paving joints) is a few dozen
  projected lines per surface, kept only in the near bands. Fine texture is
  seasonal cover's job (10).

Each entry carries `surf: <id>`, so the lint and the editor can tell which
surface a pixel belongs to.

**API:**

```js
sceneSurfaceAt(C, x, d)          // -> {id, kind, flags} | null  (water regions count, as kind 'water')
sceneSurfaceNearest(C, x, d, kinds, maxM)   // -> {id, kind, x, d, m} | null: the nearest point of an allowed kind
sceneSurfaceKinds()              // the table of 3.1
```

## 4. Ground placements (builder A)

### 4.1 Forms

A v2 scene may mix ground and pixel placements in `place`:

```js
place: [
  { obj: 'vehicle.car', on: 'road', d: 24, dir: 'away' },              // the engine picks the lane (keep-left in the UK), the view, the scale
  { obj: 'vehicle.bus', on: 'road', d: 55, u: 0.8 },                    // u: 0..1 across the surface at that depth (snapped to a lane centre)
  { obj: 'person.walker', on: 'towpath', along: 0.4, u: 0.5 },          // along: 0..1 along a strip's centreline (or alongM: metres)
  { obj: 'tree.oak', at: [-14, 38] },                                    // ground metres [x, d]; the surface is found
  { obj: 'street.bench', on: 'pave-l', d: 12, u: 0.85, face: 'right' },
  { obj: 'bird.swan', on: 'canal', d: 30, u: 0.6, k: 1.05 },             // k: a size factor over the object's real size
  { obj: 'landmark.cathedral', at: [40, 420], fix: true },              // fix: never snapped; refused (an error) when invalid
  { obj: 'bird.gull', x: 300, y: 140, s: 0.4, layer: 'far' },           // a PIXEL placement (v1 form), allowed in v2 (4.7)
]
```

How a position is resolved:

- `on` + `d` (+ `u`): take the surface's span at depth `d` (the horizontal
  slice of the surface polygon at `d`). `u` is the fraction across it, left
  to right. The default `u` is seeded, from 0.2 to 0.8.
- `on` + `along` (strips only): the point on the centreline at that
  fraction. `u` is then the fraction across, from the strip's left edge to
  its right edge, in the path's direction.
- `at: [x, d]`: the position given straight away.
- Common to all forms:
  - `seed` (default: hashed from the scene id and the index), `variant`,
    `flip` (only for objects without facing, 4.3), `anim`, `tint` and
    `shadow` behave as in v1.
  - `layer` is optional (2.3).
  - `face: 'left' | 'right' | 'away' | 'toward'` (4.3).

### 4.2 Real sizes

Every library object gets a REAL size in metres. The scale is then never the
author's choice:

```
s = k * (f / d) * (real.h / size[1])          // k: the size factor (default seeded per class, below)
```

- **The object field** (new, optional): `real: { h, l, w }` in metres. `h` is
  the height that `size[1]` stands for; `l` is the length that `size[0]`
  stands for, in the object's view.
- **The table.** `SCENE_REAL_SIZE` (`70-scene-1real.js`, pure data, A) covers
  every existing library object by id, by glob (`'person.*'`) or by role.
  Examples:

  | objects | real height (m) |
  |---|---|
  | people | 1.72 |
  | `vehicle.car` | 1.5 |
  | double-decker bus | 4.4 |
  | tram | 3.4 |
  | `rail.train` | 3.8 |
  | narrowboat | 1.9 above the water |
  | `bird.mallard` | 0.35 |
  | `bird.swan` (swimming) | 0.8 |
  | `tree.oak` | 18 |
  | `tree.birch` | 15 |
  | `tree.pine` | 20 |
  | `tree.plane` | 24 |
  | `plant.grass` | 0.35 |
  | `plant.heather` | 0.4 |
  | `plant.gorse` | 1.4 |
  | `plant.reed` | 1.8 |
  | `street.lamp` | 5.5 |
  | `street.bench` | 0.85 |
  | `building.terrace` | 9 |

  - Landmarks use their real height, which A looks up for each one and notes
    in the table.
- **Lookup.** `sceneObjReal(id)` returns `{ h, l, w, src: 'def' | 'table' |
  'class' }`. A test checks that every library object resolves, and that
  none falls back to the class default without a warning line.
- **The default `k`, by class:**
  - people 0.94 to 1.06 (seeded)
  - trees 0.75 to 1.25
  - shrubs 0.7 to 1.3
  - vehicles, boats and buildings exactly 1, unless the variant says
    otherwise
  - landmarks always 1, and `k` is ignored for them
- **The care cap.** A person whose scale would pass the 150-unit cap (v1
  8.5) is pushed back along the ray from the camera to the depth where it is
  150 units tall. A `capped` problem (an info) is recorded.

### 4.3 Classes, facing and views

**The class.** `sceneObjClass(id)` gives one of these classes: `car bus tram
train bike tractor boat person cyclist animal-graze animal-dog animal
bird-water bird-ground bird-air tree shrub cover street rail building
structure landmark rock air`.

- An explicit `class:<c>` tag wins.
- Otherwise it comes from the category, role and tags. For example
  `vehicle` with the tag `tram` gives `tram`; `bird` with the tag `water`
  gives `bird-water`.
- The class drives the surface rules (4.4), the default `k` (4.2), contact
  shadows (6.3) and flows (9).

**Views.** Library vehicles, boats and people are drawn side-on. A side-view
car on a road that runs straight away from the camera is wrong. Objects may
declare their other views:

```js
views: { front: 'vehicle.car-front', rear: 'vehicle.car-rear', q: null }   // q: a three-quarter view
```

- **Choosing a view.** Project the lane or path tangent at the placement to
  the screen. Its angle from horizontal decides:
  - under 35 degrees: `side` (flipped to face the direction of travel)
  - over 55 degrees: `front` (moving toward the camera) or `rear` (moving
    away)
  - in between: `q` if the object has one, else whichever is nearer
- **A missing view** keeps the side view and records a `view` problem (a
  warning). This is how the lint finds the library gaps.
- **Facing.** `face` (or `dir` on a road) sets the facing. The engine sets
  `flip` itself for anything with a class that moves.

### 4.4 Which surfaces each class may stand on

`SCENE_PLACE_RULES` (pure data, A) lists, per class, the surface kinds it may
stand on:

| class | allowed kinds | notes |
|---|---|---|
| `car` | road, parking, driveway, tramway, track | snapped to a lane centre; never on a pavement or grass |
| `bus` | road, tramway | |
| `tram` | tramway, rail tagged `tram` | |
| `train` | rail | |
| `bike`, `cyclist` | road, cycleway, path, towpath, park paths | |
| `tractor` | field, track, road | |
| `boat` | water (inset by half the beam + 0.3 m from every bank) | `beached` tag: beach, sand, shingle, mud |
| `person` | pavement, plaza, platform, path, towpath, cycleway (a warning), steps, bridge, grass, lawn, park, garden, heath, meadow, wood, bank, beach, sand, shingle, rock | road only with `cross: true` or on a `crossing` strip |
| `animal-graze` | field, meadow, heath, grass, park | |
| `animal-dog` | everything a person may stand on | |
| `bird-water` | water, bank, reedbed, mud, beach, grass | on water it floats (4.5) |
| `bird-ground` | anything walkable, rooftop, edge | |
| `bird-air`, `air` | none: pixel or flock only | exempt from the ground checks |
| `tree` | grass, lawn, park, verge, field, meadow, heath, wood, garden, bank | pavement only with `pit: true` (a street tree in a pit) |
| `shrub` | as `tree`, plus reedbed for `role:edge` objects | |
| `cover` | any non-water surface whose `leaves` / `snow` factor is above 0 (10) | |
| `street` | pavement, plaza, platform, path, towpath, park | `kerbside` tag: also within 0.6 m of a road edge |
| `rail` | rail, platform | |
| `building` | plot, grass, park, field, garden; not road, rail or water | projected buildings (19) have their own footprints |
| `structure` | as building, plus plaza and bank | `over: 'water' / 'road' / 'rail'` (bridges, jetties) span it |
| `landmark` | as structure | never snapped; invalid = an error |
| `rock` | every non-hard surface, beach, and water within 3 m of a bank | |

### 4.5 Snapping, refusal and floating

A placement at an invalid position (as resolved in 4.1) is moved to the
nearest point of an allowed kind (`sceneSurfaceNearest`), within the class's
snap radius:

| class | snap radius (m) | snapped to |
|---|---|---|
| people | 2 | |
| cars, buses, trams | 3 | the lane centre |
| boats | 3 | inside the inset water |
| animals, shrubs | 3 | |
| trees | 4 | |
| street furniture | 1.5 | |
| buildings, structures | 6 | |
| landmarks, `fix: true` | 0 | never moved |

- **Snapped.** The move is recorded as a `snapped` problem (a warning: from,
  to, distance).
- **Refused.** If nothing allowed lies within the radius, the placement is
  REFUSED: not drawn, and recorded as a `refused` problem (an error). The
  browser stays quiet: refused placements just do not draw. The lint prints
  every problem.
- **Water.** Objects of class `boat` or `bird-water` on water (and anything
  with the new object field `float: { level, beam }`) sit at the water
  level: `camera.water + float.level`.
  - Their `Y` comes from that level, not the ground.
  - They get `reflect: true` automatically, and rings or a wake (5.4).
- **Floating** cannot happen to a ground placement: its anchor is ON a
  surface by construction.

`C.problems` (12) collects every problem. Each is `{ rule, sev: 'info' |
'warn' | 'error', i (item index), obj, at: [x, d], msg, fix }`.

### 4.6 Draw order

The compile computes the order, in three steps.

1. **The layer** is the depth band of `d` (2.3), unless the placement forces
   `layer`.
2. **Within a layer** the key is `z = Y(d)` on flat ground: nearer is drawn
   later.
   - On relief, `z` still comes from the flat-ground `Y` of `d`, so a figure
     on a rise is not drawn behind the ground in front of it.
   - Pixel placements keep `z = y`, as in v1.
3. **Buildings and the things beside them.**
   `sceneDepthOrder(items, buildings)` makes a stable topological sort with
   two rules:
   - If the ray from the camera to an item's ground point crosses a
     building's footprint, the item is BEHIND that building and drawn before
     it.
   - Otherwise, an item whose screen box overlaps the building's is drawn
     after it.

   Building-to-building order uses the same ray test on the footprint
   centroids. If there is a cycle (it should not happen with footprints that
   do not overlap), the order falls back to `z`, and an `order` problem is
   recorded.

The sorted list and `z` then go into the compiled form, as in v1. The
renderers keep drawing in that order.

### 4.7 Pixel placements inside a v2 scene

A pixel placement (`x, y, s`) in a v2 scene is drawn as in v1 and CHECKED.
The compile infers its ground position from the camera: `d = d(y)`, `x =
(X - x0) * d / f`. Then:

- the surface rule (4.4) is checked;
- its implied real height is compared with `real.h` (the `scale` rule,
  15.1);
- it is NOT moved. The author must convert it, or mark it `pin: true` (sky
  objects, things off the ground plane), which skips the checks.

`scene migrate` (16.4) converts pixel placements in bulk.

### 4.8 Actors on the ground

`actors[]` (v1) take an optional `ground: [[x, d], ...]` path in metres, or
`on: '<surface id>'` (the strip's centreline, a lane, or a seeded line inside
a polygon). The actor's `Y`, scale and view come from depth on every frame,
through the pure `sceneActorAtV2(a, t, cam)`. Pixel paths keep working.
Flows (9) are the usual way to get moving people and traffic. Actors stay
for single, specific movers: a heron flying along the canal, a ferry on a
route.

## 5. Water (B renders, A compiles the geometry)

### 5.1 Declaring water

```js
water: [
  { id: 'canal', kind: 'canal', path: [[-3, 5], [-2, 60], [12, 420]], width: 9,      // a channel in perspective, from a centreline
    banks: { left: { surface: 'towpath', width: 2.4, edge: 'coping' }, right: { surface: 'garden', width: 0, edge: 'wall' } } },
  { id: 'river', kind: 'river', path: [...], width: 32, flow: 0.4 },                  // flow: m/s along the path (ripples drift)
  { id: 'pond', kind: 'pond', poly: [[x, d], ...] },
  { id: 'lake', kind: 'lake', poly: [...], ripple: 0.3 },
  { id: 'sea', kind: 'sea', band: [180, Infinity], foam: 'shore' },                   // to the horizon
  { id: 'dock', kind: 'harbour', poly: [...], edge: 'quay' },
]
```

**Options**, with defaults by kind:

| option | meaning | default |
|---|---|---|
| `base` | three colours, far / mid / near (palette slots allowed) | by kind: canal `#4a5a48 #3a4a3e #2a362e` (greener and murkier), river `#5a7480 #3f5e6a #2d4652`, lake and pond `#6a8a9a #446a7c #2a4a5a`, sea `#5f8aa6 #3a6a8c #234a66` |
| `clarity` | how much of the bed shows near the camera, 0 to 1 | canal 0.05, pond 0.15, sea 0.1 |
| `bed` | the bed colour | `#4a4030` |
| `mirror` | reflection strength, 0 to 1 | canal 0.85 (still water), river 0.6, sea 0.35 |
| `ripple` | ripple amplitude, 0 to 1, multiplied by `L.wind` | canal 0.15, pond 0.2, lake 0.3, river 0.35, sea 0.6 |
| `glint` | the sun's or moon's glitter road | true |
| `edge` | the bank edge | canal: `coping` (stone with a dark wet band); `quay`; `wall`; `natural` (a muddy, reedy band); `beach` (a wet sand band) |
| `foam` | `auto`, `none` or `shore` | sea and beach: `shore` (animated surf rows) |
| `wakes` | wakes behind moving boats | true |
| `rings` | ripple rings round ducks and swans | true |

**A canal is trivial to declare:** a path, a width and its banks.

- The compile turns `banks` into surfaces (`towpath`, its coping `edge`
  strip and a `wall`) beside the water, so a towpath walk is one declaration.
- A `lock: { at: 0.4, gates: 2 }` adds lock-gate structures from the library
  when they exist (`structure.lock-gate`). When they do not, the compile
  records a `missing` problem.

### 5.2 What the compile gives B

Each v2 water region is ALSO a `C.water` entry, so the v1 path still draws it
(a gradient and the v1 reflection). It gains a `v2` record that B's pass
reads:

```js
C.water[i] = { layer, d: '<screen path>', y0, y1, base, reflect: true, shimmer: 0, lightPath: true,
  v2: { id, kind, polyM: [[x, d], ...], dNear, dFar, level,          // level: water height (camera.water)
        rowAt: [[d, Y], ...],                                       // the waterline row by depth (16 samples) for reflections
        edges: [{ pts: [[X, Y], ...], kind: 'coping' | 'quay' | 'wall' | 'natural' | 'beach' }],   // land edges only (not frame edges)
        mirror, ripple, clarity, bed, glint, foam, wakes, rings, flow: [vx, vd] } }
```

A water region's LAYER is the band of its FAR edge, so everything nearer is
drawn over it. When a region spans several bands, the bake plan splits it
like any other layer content. The lint warns when a water region spans more
than two bands: better to declare it as two regions.

### 5.3 The bake (`78-scene-water.js`, the water pass)

Water is baked in this order:

1. **The base.** The water polygon is filled with:
   - a vertical gradient of `L.water(base)` (the sky tint, v1 5.2), from the
     far edge to the near edge;
   - mixed toward the bed colour by `clarity * (1 - depth fade)`, strongest
     at the near edge;
   - darker at the near edge (looking down into the water) and lighter at
     the far edge (a grazing view reflects the sky).
2. **Edges.**
   - `coping`: a 0.3 m light stone strip, then a dark wet band 0.15 m high
     on the water side.
   - `natural`: a muddy band with a few reed tufts, if the scene's kits give
     `role:edge` objects.
   - `beach`: a wet sand band.
   - `quay`: a dark wall face.

   Edges are drawn in projected widths and dropped under 1 unit.
3. **The reflection bitmap.** One cropped canvas per region (its screen box),
   holding what the water mirrors. This is not drawn into the group bitmap
   when the region ripples.
   - **The sky.** A gradient mirrored about the HORIZON row: water near the
     horizon reflects the low sky (`L.low`), near water the high sky
     (`L.top`).
   - **Placements** farther than the region's near edge, whose mirror image
     would land in the water. Each is drawn FLIPPED ABOUT ITS OWN WATERLINE
     ROW `Yw(d) = horizon + f * (eye - level) / d`. Its base, `hb` metres
     above the water, is mirrored to `Yw + f * hb / d`. This is the physics
     of a flat mirror: a far bank tree, a boat mid-channel and a near-bank
     reed each mirror about their own line, never about the far edge.
     - Static placements reuse their cached sprites.
     - Direct (projected) buildings (19) are re-filled flipped.
     - Pixel placements in v2 scenes, and v1 scenes, flip about the far
       edge, as before.
   - **Ground and groups farther than the water** (land bands beyond the far
     bank) are blitted flipped about `Yw(dFar)`.
   - **Fresnel.** An alpha mask from `mirror * 0.25` at the near edge to
     `mirror * 0.8` at the far edge.
   - **Tint.** 25 % of the water's mid colour, on top.
   - **Calm water.** If `ripple * L.wind < 0.05`, the reflection is
     composited straight into the group bitmap, and nothing is drawn per
     frame.
4. **The mask.** A coverage mask the size of the region: the water polygon
   MINUS everything of the same group drawn after the water (near-bank
   reeds, a moored boat, a bridge pier). The per-frame ripple goes through
   this mask, so it never paints over what stands in front of the water.
5. **Glint.** The glitter road at the column of the sun (or the moon when
   it is up, visible and over 0.3 illuminated). It narrows toward the far
   edge and widens near the camera, in three twinkle groups (as v1's
   `_sccWaterFx`). The moon road is pale (`#e8eef6`) at `0.6 * illum +
   0.2`.

### 5.4 Each frame

1. **Ripple.** The reflection bitmap is drawn in horizontal BANDS into a
   scratch canvas the size of the region.
   - Band `j` sits at row `Y_j` with an x offset of
     `A(Y_j) * sin(k * Y_j + w * t + phase)`.
   - The amplitude `A` grows toward the camera: `ripple * L.wind * (2 + 10 *
     (Y - y0) / (y1 - y0))` device px.
   - Band heights are 2 px at the far edge and 6 px near the camera.
   - The scratch is then masked (`destination-in` with the mask) and blitted
     once.
   - **Amortised.** The scratch is re-made at 15 Hz (`t` quantised to 1/15
     s) and blitted every frame. Captures stay deterministic, because the
     content depends on the quantised `t` only.
2. **Glint and shimmer.** As in v1, at most 30 glints.
3. **Wakes.** For each boat actor or flow agent on water:
   - one pre-rendered V-wake sprite behind it, per scale bucket;
   - squashed vertically by the water's foreshortening at its depth (`eye /
     d`);
   - its alpha follows the boat's speed.
4. **Rings.** For each `bird-water` placement, actor or agent on water: two
   concentric pre-rendered ellipse strokes, scaled and faded by phase. At
   most 16 per scene, nearest first.
5. **Reflections of movers.** For each actor or agent standing on water or
   within 3 m of an edge: one flipped `drawImage` about its own `Yw(d)`, at
   `alpha = mirror * 0.5`, with the ripple offset of its band.
6. **Surf.** Sea `foam: 'shore'`: up to 6 pre-rendered foam rows sliding in
   and out along the beach edge.

### 5.5 Cost, the SVG still, and v1 water

- **Per frame, per rippling region:**
  - band draws at 15 Hz (about 40 to 70 for a typical canal; at most 90 per
    region and 160 per scene);
  - 2 blits;
  - up to 30 glints;
  - 1 per wake, ring and mover reflection.

  `sceneFrameDraws` (v1 6.5, B) counts all of these. The lint caps the
  scene's total animated draws at 300.
- **The SVG still** draws the reflection bitmap's content as `<use>` flips
  (sky gradient, placements) inside a `clipPath` of the water, with the
  Fresnel as a gradient mask. There are no ripples, wakes or rings, and the
  glint is drawn at t = 0.
- **v1 water** (no `v2` record) is drawn EXACTLY as today.
  - A v1 scene can opt in with `fx: { water: 2 }` (14.2). Its water then
    gets the depth fade, the mask and the ripple, and still mirrors about
    its far edge `y0` (there is no camera).

## 6. Shadows (builder B)

### 6.1 The sun on the ground

C's `sceneLightV2` (7.5) adds to `L`:

- `L.sunG`: the unit vector on the ground plane, in camera space, pointing
  away from the sun (the way shadows fall):
  `[-sin(rel), -cos(rel)]`, where `rel` is the sun's azimuth relative to the
  heading.
- `L.sunTan`: `1 / tan(alt)`, clamped to at most 12.

A caster of height `H` at `(x, d)` throws its tip to `(x + sunG[0] * H *
sunTan, d + sunG[1] * H * sunTan)`, projected with the camera. This holds for
every object, in every scene, at every time of day.

**Opacity and softness, by the sky:**

| sky | shadow opacity | blur | length |
|---|---|---|---|
| clear noon (alt over 45) | 0.42 | 1.5 px | short |
| golden hour (alt 3 to 12) | 0.34 | 4 px | up to 12x the height, faded with distance from the foot |
| alt under 3 | fades to 0 at alt -1 | | |
| overcast (cover over 0.75) | x 0.25 | 10 px | (almost only contact shadows remain) |
| moonlit night (moon alt over 15, illum over 0.6, clear) | 0.12 | 6 px | along `L.moonG` |
| night, otherwise | none | | lamp shadows only (6.5) |

### 6.2 Static casters: silhouettes, baked

In every layer's bake, after the water and before the sprites:

1. The layer's casters (items with `shadow` true, and the classes in 6.3)
   are drawn into ONE scratch canvas the size of the group, each with its
   own sprite and an affine SHEAR transform:
   - sprite x is mapped to screen x at the item's scale;
   - sprite "up" is mapped to the projected shadow vector per unit of height
     (the tip of 6.1, minus the foot).
2. The scratch is filled with the shadow colour (`#14202e` mixed 30 % toward
   `L.shade`), using `source-in`. Every caster becomes a silhouette in ONE
   fill.
3. It is composited onto the group bitmap at the opacity of 6.1, through
   `ctx.filter = 'blur(..)'` where supported. Without filter support, four
   offset draws at a quarter of the alpha stand in for the blur.
   - Overlapping shadows never darken twice, because they merge in the
     scratch before the composite.
   - **The fade.** A long golden-hour shadow fades away from its foot: the
     scratch is multiplied by a gradient along `sunG` per caster group,
     approximated by fading each draw's alpha in two steps.
4. **Buildings** (projected, 19) cast prism shadows:
   `sceneBuildingShadow(b, L.sunG, L.sunTan, cam)` (F) returns the screen
   polygon of the footprint swept by the sun vector times the height. It is
   filled into the same scratch.
5. Shadows fall on the GROUND of their layer. They are drawn before that
   layer's objects, so the objects stand on them. Shadows on walls and water
   are not modelled; shadows on water are hidden by the reflection anyway.

v1 casters (with an `obj.shadow` ellipse spec) use the silhouette method only
in v2 scenes, or with `fx: { shadows: 2 }`. Otherwise v1's two ellipses
stay.

### 6.3 Contact shadows (always on)

Every caster of class `person animal-* car bus tram bike tractor tree
building structure landmark street rock` gets a small, dark, soft ellipse
under its foot:

- its size is the object's `foot` (new object field `foot: [rx, ry]` in
  metres; the default comes from the class and `real.l`), projected;
- its opacity is 0.35 by day, and 0.25 at night or under overcast.

This is ambient occlusion. It is what makes objects SIT on the ground in
every light, which is the cure for floating. Vehicles get one ellipse per
axle (two), from `real.l`.

### 6.4 Moving casters (each frame)

Actors and flow agents get:

- **`blob`** (the default): one pre-rendered soft ellipse sprite, scaled to
  the object's foot and sheared slightly along `sunG`. One draw.
- **`projected`**: the actor's REST sprite drawn as a silhouette through the
  same shear as 6.2.
  - The silhouette is made once, per sprite key, at bake time.
  - One draw.
  - The default for vehicles and boats nearer than 40 m, and for people
    nearer than 20 m, when the sun is out.

Shadows are drawn in `frameGroup` (13.2), BEFORE the group's movers, so every
mover stands on its own shadow.

### 6.5 Lamps and the moon

- **Lamp shadows.** After dusk, every caster within a lamp's pool radius
  (7.3) casts a short shadow AWAY from that lamp:
  - its length is the caster's height x 0.8;
  - its opacity is 0.25, faded with distance to the lamp;
  - it is baked, for at most 40 caster-lamp pairs, nearest first.
- **Moon shadows** are as in 6.1.

## 7. Atmosphere and light (builder C)

### 7.1 Aerial perspective by depth

```js
atmos: 'auto' | 'clear' | 'haze' | 'city' | 'mist' | 'coast' | 'mountain' | { V: 4000, max: 0.6, tint: '#c8d0d8' }
```

`SCENE_ATMOS` (pure, `70-scene-1atmos.js`):

| preset | V (visibility, m) | max | colour |
|---|---|---|---|
| `clear` | 9000 | 0.7 | `L.haze` |
| `haze` (a summer heat haze) | 4000 | 0.7 | `L.haze` with 15 % warm |
| `city` | 3000 | 0.6 | `L.haze` with 20 % grey-brown `#9a958c` |
| `mist` (a dawn river) | 900 | 0.8 | `L.haze` with 30 % white; stronger low over water |
| `coast` | 5000 | 0.65 | 20 % `#dfe8f0` |
| `mountain` | 15000 | 0.75 | a cool blue |

**Weather overrides the preset:** fog sets `V` to 150 to 400, mist to 600 to
900, rain to `V x 0.5`, snow falling to `V x 0.4`.

- **`auto`** means:
  - `city` when the setting is urban;
  - `coast` when there is sea water;
  - `mist` at dawn over water on about 30 % of dates (seeded by the date);
  - `clear` otherwise.
- **The haze of a point at depth `d`:**

  ```
  hazeAt(d) = max * (1 - exp(-d / V))
  ```

  The haze colour also leans toward the sun's side of the low sky,
  `L.lowSun`, by `L.backlit`.
  - Some values in `clear`: 0.008 at 100 m, 0.14 at 2 km, 0.47 at 10 km.
  - Near objects get NO visible haze, which is the cure for the ghosts and
    the overdone haze.
- **Placements.** For a v2 placement, the haze is computed at BAKE time:
  `sceneHazeAt(it.dz, C.atmos, L)`, bucketed to steps of 0.1 for the sprite
  key (v1 4). Weather can change it, and a light-key change re-bakes.
  - The compiled `it.haze` is `null` for v2 items.
  - The SVG still uses the authored moment.
- **Surfaces** carry the haze in their far gradient stop (3.3).
- **The atmos pass** may also draw one very subtle depth veil per group: a
  vertical gradient of the haze colour over the far band, at most 0.12
  alpha. It is baked.

### 7.2 Rim light and soft shading (a sprite pass)

After a sprite of class `tree building structure landmark vehicle person
animal rock` is rasterised:

1. **Soft shading.** A horizontal gradient across the sprite box, `source-
   atop`:
   - transparent on the sun's side;
   - `L.shade` at `0.10 + 0.12 * (1 - cover)` on the far side.
2. **Rim light.** When `L.backlit > 0.15`, or at golden hour:
   - The sprite's alpha, shifted 1.5 to 3 px AWAY from the sun, is cut
     (`destination-out`) from a copy of the sprite filled with `L.lowSun` or
     `L.light`.
   - What is left is a thin band on the sun's edge. It is composited
     `source-atop` at `0.35 * backlit`.
3. **Snow, frost and wet** (C's weather, 8) are further sprite passes in the
   same chain.

- **Flips.** A placement drawn flipped would reverse the light. For these
  classes the sprite key therefore includes the flip bit (`f`), and the
  sprite is shaded for its on-screen orientation.
- **Light key.** The pass adds the sun's relative azimuth, in 30-degree
  buckets, to the light key. It changes about every 2 hours, and each change
  re-bakes.
- **Opt out.** An object with `shade: false` is skipped (flat graphics,
  signs, glow-only objects).

### 7.3 Night light sources

`sceneLightsOf(C)` (pure, C) collects the static sources from the compiled
scene:

- **The object field** `light: { kind: 'lamp' | 'spill' | 'halo', r (m), h
  (m), col }` (new, optional).
- **The table.** `SCENE_LIGHT_SOURCES` (C) gives the defaults:
  - `street.lamp*`: a pool of 7 m at 5.5 m;
  - station and platform lamps: 9 m;
  - shopfronts: spill;
  - pub and station windows: spill.
- **Derived sources.** Any object with `glow: 'lamp'` shapes gets a 5 m
  pool. Buildings with ground-floor `glow: 'window'` shapes get spill.

What the bake draws after dusk (`L.lamps` or `L.windows`), in the atmos pass
`layer(over)` stage:

- **Lamp pools.**
  - A circle of radius `r` on the ground, projected as a perspective ellipse
    (16 projected points), filled with a radial gradient in `col`
    (`#ffd9a0` sodium-white by default).
  - Composited `lighter` at `0.5 * L.dark`.
  - Wet ground also gets a vertical streak below each lamp (8.3).
- **Window spill.** A trapezoid of light on the pavement in front of each
  lit ground-floor window or shopfront, 1.5 to 3 m deep, in the window's
  glow colour at 0.25. It is baked.
- **Halos.** A soft glow round each lamp head and lit sign. Baked.
- **Lit windows by the hour** (B applies this; C provides the curve). In v2,
  `glowOn` gives each window a seeded threshold `theta`. The window is lit
  when `theta < share(localHour)`. The share runs from about 0.55 at dusk
  and 0.7 at 21h, to 0.4 at 23h, 0.12 at 1h and 0.08 at 5h, and back to 0.2
  at dawn. The share comes from `SCENE_WINDOW_SHARE` (C). Late at night a
  town goes dark the way a real one does.
- **Vehicles at night** (D's flows and actors). Per frame:
  - a headlight cone sprite ahead, and a red tail glow;
  - one draw each, pre-rendered by C's `sceneHeadlightSprite(scaleBucket,
    view)`.
- **Lit trams, trains and buses.** Their window glows are lit. A moving
  spill strip on the ground alongside them is one draw per vehicle.
- **The moon on water** is B's glint (5.3).

### 7.4 Lift near lights

At night, a static placement within a pool gets a LIFT: its sprite colours
are mixed toward the light colour, un-graded, by `lift`.

- `lift` is bucketed to 0, 0.15, 0.3 or 0.45, and is part of the sprite key.
- It is computed per item at bake by `sceneLiftAt(item, lights, L)` (C).
  B's sprite colour function applies it.

People under a lamp, a bench and a tree trunk then stand visibly in the
light. Lift comes at no frame cost (it is baked).

### 7.5 `sceneLightV2(o, view, data)`

This is what the host calls for v2 scenes. It is `sceneLight` (v1 5.2, the
kit's `K.live`, UNCHANGED) plus these fields:

```js
L.sunG, L.sunTan, L.moonG, L.moonTan          // 6.1
L.localHour, L.weekday                        // local solar time at the scene (lon / 15) and the weekday there (flows, windows)
L.wx = sceneWeather(data.weather, L, o)       // the resolved weather (8.1)
L.atmos = { V, max, col }                     // the resolved preset (7.1)
```

- C edits `78-scene-host.js` so that v2 scenes are relit with it every 120
  s, as v1 scenes are relit with `sceneLight`.
- `sceneLightKey` (B, `70-scene-svg.js`) appends the pass keys (13.1) for v2
  scenes ONLY. v1 keys are unchanged.

## 8. Weather (builder C)

### 8.1 Input

```js
weather: 'live'      // default: from the live forecast (o.sky.wx) and L; deterministic without it (the authored moment, clear)
weather: 'none'      // interiors: nothing
weather: { kind: 'rain', intensity: 0.7, wind: 1.2, snowDepth: 'auto', wet: 'auto', frost: 'auto', banks: 'auto' }   // fixed (a scene of one weather)
```

- **Kinds:** `clear partly cloudy rain drizzle showers thunder snow sleet fog
  mist frost`.
- **The resolver.** `sceneWeather(input, L, o)` (pure) returns:

  ```js
  { kind, rain: 0..1, snow: 0..1, fog: 0..1, wind: 0.4..1.8, wet: 0..1, snowDepth: 0..1, frost: 0..1, banks: 0..4, temp }
  ```

- **Live input** comes from `o.sky.wx` = `{ cond, wind, temp }`. The host
  already passes `temp`.
- **Overrides.** The tools pass `--weather <kind>` (16.3). The editor and
  the gallery pass `{ wx }` to the host (`sceneHostSet`, C).
- **Wet ground** = rain or drizzle now (1 or 0.6), showers (0.5), or thunder
  (1).

### 8.2 Rain

- **Falling rain.** v1's up-to-250 lines, now slanted by the wind (`dx =
  wind * 0.35 * dy`). Two depth tiers: near rain is longer and faster, far
  rain is shorter and fainter.
- **Wet ground** (baked, the weather pass):
  - Hard surfaces darken: multiplied by `1 - 0.18 * wet`.
  - They get a faint sky tint: 10 % of `L.low`.
  - They get vertical light STREAKS: each light source (7.3) and lit window
    within the frame leaves a soft streak straight below it on wet ground.
    Its length is 2 to 6 times the source's height on screen; its alpha is
    `wet * kind.wet * 0.4`.
- **Puddles.** Seeded small water regions (kind `puddle`: mirror 0.7, ripple
  0.25, clarity 0) on `road`, `pavement`, `path`, `towpath`, `track` and
  `plaza`.
  - 3 to 12 per scene, by `wet` and the surfaces' area.
  - Generated in the weather pass's `prebake` and handed to B's water pass
    as extra regions.
  - Only within 60 m, where a puddle is at least 6 units across.
- **Rain rings.** Per frame, on puddles and on rippling water: at most 20
  small rings that expand and fade.

### 8.3 Snow

- **Falling snow.** v1's up-to-200 dots, in two depth tiers, drifting with
  the wind.
- **Accumulation.** `snowDepth` from 0 to 1:
  - If it is snowing now, `snowDepth` rises to 0.8.
  - With a live temperature above 4 degrees C it decays to 0.3 (patchy), and
    above 7 degrees to 0.
  - **Without live data:** `sceneSnowCover(lat, lon, alt, ms)`, a pure
    climatology. A seeded share of winter DAYS is snowy, by latitude band and
    elevation (`SCENE_SNOW_CLIMATE`):

    | where | snowy days, December to February |
    |---|---|
    | UK lowland (under 150 m, south of 54 N) | 4 % |
    | UK lowland north of 54 N | 8 % |
    | 150 to 400 m (the Peaks) | 15 % |
    | over 400 m | 30 % |
    | Scottish Highlands over 600 m | 50 % |
    | Alpine | 70 % |

    The seed is the DATE and the place, so every scene of one area agrees on
    the same day, and the result is deterministic. Southern-hemisphere
    winters are June to August. In the tropics it is 0.
- **What snow does on the ground.** Surfaces mix toward the snow white
  (`#eef2f6`, graded by the light) by `snowDepth`:
  - `full` kinds: completely, beyond 0.5;
  - `slush` kinds: toward grey `#c8ccd0`, with two darker tyre tracks per
    lane;
  - `partial` kinds: in seeded patches.

  The scene's winter palette still sets the base, and snow lies over it.
- **On objects.** A sprite pass ("snow cap"). For classes `building
  structure landmark tree shrub street vehicle` (and any object with
  `snowCap: true`):
  - the sprite's alpha shifted DOWN 2 to 4 px is cut from a white-filled
    copy;
  - the remaining top edges are composited `source-atop` at `snowDepth`.

  So snow lies on roofs, on the top of branches, and on walls, cars and
  benches. Generated buildings (19) also draw their roof planes white
  (`snowParts`).

### 8.4 Fog banks, wind, frost and thunder

- **Fog banks.** 2 to 4 large, soft, horizontal sprites, pre-rendered and
  placed in depth BETWEEN bands (at about 60, 150 and 400 m), drifting
  sideways at `wind * 4` units per second. One draw each. They go with the
  lowered `V` (7.1). `banks` controls the number.
- **Wind.** `L.wind` (0.4 to 1.8) already drives sway (v1 5.4). Here it also
  slants the rain, drifts the fog, sets the snow's direction and drives the
  ripple amplitude (5.4).
- **Frost.** `frost` is above 0 when:
  - the temperature is at or below 0 degrees C (live), or seeded on 35 % of
    clear winter mornings (without live data);
  - and the sun's altitude is under 12 degrees in the morning.

  Grass-like surfaces are lightened and desaturated toward `#dfe6ea` by
  `0.35 * frost`. A thin white rime sprite pass is applied to plants and
  shrubs.
- **Thunder.** A full-frame flash (`framePost`, white at 0.25 for 120 ms)
  at seeded times, 1 to 3 times a minute. It is skipped under reduced
  motion, in stills and in captures.

### 8.5 Cost

| what | baked | per frame (cap) |
|---|---|---|
| wet ground, streaks, snow cover, snow caps, frost | yes | 0 |
| rain | | 250 lines in one path |
| snow | | 200 dots in batched fills |
| rings | | 20 |
| fog banks | | 4 |
| lightning | | 1 rectangle |

The weather pass reports its draws. All of it follows the light key: a
change in the weather re-bakes in idle slices (v1 6.3).

## 9. Crowds and traffic (builder D)

### 9.1 Flows

```js
flows: [
  { id: 'walkers', kind: 'walk', on: ['pave-l', 'pave-r', 'towpath'], density: 1, profile: 'town', mix: 'kit',        // mix: 'kit' = people of the scene's kits
    speed: [1.1, 1.5], both: true, max: 14 },
  { id: 'cycles', kind: 'cycle', on: 'towpath', density: 0.3, profile: 'leisure', mix: { 'person.cyclist': 1 }, max: 3 },
  { id: 'traffic', kind: 'drive', on: 'road', density: 1, profile: 'commuter', mix: { 'vehicle.car': 6, 'vehicle.taxi': 1, 'vehicle.van': 1 },
    bus: { obj: 'vehicle.bus', every: 8, stops: [{ along: 0.45, dwell: 18 }] }, max: 10 },                                // every: minutes
  { id: 'trams', kind: 'tram', on: 'tramline', timetable: { every: 6, dwell: 25, stops: [{ along: 0.5 }] }, obj: 'vehicle.tram' },
  { id: 'boats', kind: 'boat', on: 'canal', density: 0.4, profile: 'boats', mix: { 'boat.narrowboat': 3, 'boat.kayak': 1 }, speed: [0.9, 1.3], max: 3 },
]
```

**What each field means:**

- **`kind`.** One of `walk cycle drive tram train boat graze`. `graze` is
  animals that wander slowly inside a polygon.
- **`on`.** Surface or water ids. The lanes come from the surface:
  - strips: lanes along the centreline;
  - roads: `floor(width / 3.2)` lanes;
  - pavements: 2 to 3 walking sub-lanes;
  - polygons: seeded wander lines.
  - An explicit `lanes: [{ path: [[x, d], ...], dir: 1 | -1 }]` also works.
- **`density`.** Agents per 100 m of lane at the profile's peak (1 = a
  normal town street). It is scaled each hour by the profile.
- **`max`.** The most agents visible at once.

**Driving side.** `scene.drive: 'left' | 'right'`.

- The default is `left` inside `SCENE_DRIVE_LEFT`, a small table of country
  boxes (GB, IE, JP, AU, NZ, IN, ZA, HK, SG, MY, TH, ID, ...). Otherwise it
  is `right`.
- With `left`, the lanes on the left of the path's direction travel along
  it. Buses and trams stop on their own side.

### 9.2 Density by time

`SCENE_FLOW_PROFILES` (pure): 24 hourly multipliers per profile, for
weekdays and weekends, plus factors for weather and season.

| profile | shape |
|---|---|
| `commuter` | peaks at 8 and 17.5 h (1.0); midday 0.6; night 0.05 |
| `town` | 10 to 17 h at 1.0; evening 0.5; night 0.05; Saturday x 1.3 |
| `leisure` | weekend afternoons 1.0; weekdays 0.4; dusk falls away |
| `nightlife` | 19 to 1 h at 1.0; daytime 0.3 |
| `boats` | daylight only; summer x 1.5, winter x 0.2; none at night |
| `rail` | from a `timetable`, not a density |

- **Weather.** Rain sets walkers to x 0.5 (and the people object gets its
  umbrella variant where it has one), cyclists to x 0.3 and boats to x 0.5.
  Snow sets walkers to x 0.4 and boats to 0.
- **Time.** `L.localHour` and `L.weekday` (7.5) choose the multiplier.
  Without a clock (Node, QA), the authored moment `at` is used.

### 9.3 A deterministic schedule (no state, any frame)

For each lane, the bake builds a SPAWN LIST for one period `P` (600 s):

- spawn times are seeded from the flow, lane and density;
- a minimum headway is kept: 6 m between vehicles at their speed, 0.8 m for
  people;
- each agent has a seeded speed, variant and sub-lane;
- there is no overtaking within a lane.

`sceneFlowAt(flow, k, t)` (pure, `70-scene-1flow.js`) returns `{ x, d, X, Y,
s, view, flip, alpha }`. The value depends only on `t`.

- Agents enter and leave at the frame edge or at the band limit (`d` over
  the flow's `dMax`, default 400 m), fading over 1 s.
- Stops add a dwell to the curve of position against time.
- The active set is found with a moving window over the sorted spawn list,
  so it costs time in proportion to the visible agents.
- `t = 0` is `P / 2` into the schedule, so a still frame, a capture or a
  reduced-motion frame shows a street already in motion.
- `relight` (the light refresh every 120 s) rebuilds only the spawn lists,
  for the new hour and weather. It never re-bakes a bitmap.

### 9.4 Rendering (`78-scene-flow.js`, the flow pass)

- **The pool.** At bake time, for each object and variant of a flow's mix:
  - a sprite for each scale bucket the lanes cover (v1 4: 19 % steps from
    the farthest to the nearest depth), times its views;
  - walk-cycle parts as in v1 actors.

  This is bounded by a sprite cap (`flowSprites` at most 120 per scene).
- **Each frame.** `frameGroup` computes the agents' positions for that time
  (shared in `env.flowNow`). B's shadow and water passes read them (6.4,
  5.4). Then `movers()` pushes each agent into the GROUP whose bands contain
  its depth, y-sorted with that group's other movers. An agent walking
  toward the camera crosses from `mid` to `near` in the right order.
- **Each agent costs:**
  - 1 to 3 draws for its body and walk parts;
  - 1 for its shadow;
  - at night, 1 for each headlight or spill;
  - on water, 1 for its reflection and 1 for its wake.
- **Budget.**
  - At most 60 visible agents across all flows.
  - `flowDraws` (an estimate from the compile: `max` x parts) counts toward
    the 300 animated draws.
  - When the scene's draws would pass the budget, the compile scales every
    `max` down in proportion and records a `flowBudget` problem (an info).
- **LOD.** `max` is multiplied by the LOD. The tiles (LOD 0.3) show a few
  agents, still.
- **The SVG still** draws the agents at `t = 0` through `sceneFlowAt`.

### 9.5 The objects flows need (D)

`70-scene-lib-vehicles-views.js` (new, D) holds the front and rear views (and
`q` where cheap) of the commonest movers, linked through `views` (4.3):

- `vehicle.car` (4 colour variants), `vehicle.bus`, `vehicle.taxi`,
  `vehicle.tram`;
- `person.cyclist`;
- `boat.narrowboat` (bow and stern).

Each has its `real` size, night glows (head and tail lights), the kit and
role tags, and passes `object lint`.

Front and back views of `person.walker` are on the cut list. A person walking
toward the camera far away reads fine side-on, and the view rule warns only
below 30 m.

## 10. Seasonal ground cover (builder A)

`cover: 'auto'` (the default in v2; `false` turns it off; `{ density: 0.5 }`
scales it) adds generated scatter rules at compile time. It depends on the
season (the compile is memoised per season) and on the surfaces:

| season | on | what |
|---|---|---|
| autumn | grass, park, lawn, path, towpath, pavement (by the `leaves` factor) | leaf litter (`ground.leaf-litter`, 3 variants in autumn colours), x 3 density within the crown radius of deciduous trees |
| winter | grass, heath, field, verge | winter tufts; frost and snow come from the weather (8), not from cover |
| spring | grass, park, lawn, verge, meadow | daisies and celandines (`plant.daisies`); blossom petals (`ground.petals`) under blossom trees (`tag: blossom`) |
| summer | verge, meadow, field edge, bank, park edges | long grass tufts (`plant.grass-long`), wild flowers (`plant.wildflowers` when the library has it) |

- **Where.** Cover is distributed in SCREEN space: an even density per screen
  area, with sizes by depth. It is cut beyond 60 m, or where an object is
  under 3 units tall; the surface's texture covers it from there.
- **Budget.** At most 1,500 placements, all static, so they bake and cost
  nothing per frame.
- **The objects.** A adds `70-scene-lib-ground-cover.js` with the four
  objects above (reusing any existing `ground.*` objects first). Each has
  four seasons, `real` sizes, `kit:temperate`, `role:ground`.

## 11. Smarter scatter (builder A)

v2 scatter rules accept these new fields. v1 rules compile exactly as before.

```js
scatter: [
  { obj: { 'plant.heather': 3, 'plant.gorse': 1, 'plant.grass': 2 }, on: ['heath', 'verge'], avoid: ['path', 'road'],
    d: [6, 140], n: 420, dist: 'screen', cluster: { centres: 9, spread: 7 }, gap: 'foot', k: [0.8, 1.2], seed: 4, anim: 'strip' },
  { obj: 'tree.birch', on: 'heath', d: [25, 300], n: 30, dist: 'ground', cluster: { centres: 4, spread: 25 }, gap: 'foot' },
]
```

- **`on` / `avoid`.** Surface kinds or ids.
  - A candidate point must lie on an `on` surface, on none of the `avoid`
    surfaces, and satisfy the class rule (4.4). No shrubs on roads, ever.
  - With no `on`, any surface the class allows will do.
- **`dist`.** Where the candidates come from:
  - `ground`: an even density per square metre (real spacing: trees,
    boulders);
  - `screen`: an even density per screen area (ground cover).
- **Poisson-disk sampling.** Bridson's algorithm, in metres for `ground` and
  units for `screen`, replaces rejection sampling. The result is even but
  never a grid, and the variety rule's `grid` check passes by construction.
- **`gap: 'foot'`.** Footprints (`foot`, in metres) must not overlap the
  footprints of this rule, or of any earlier placement with a footprint
  (hand placements first, then the rules in order). Cover objects are
  exempt.
- **`cluster`.** A Thomas process: seeded centres, then points spread round
  them (Gaussian, sd = `spread`). Clumps of gorse, a copse of birches. When
  `cluster` is given, 20 % of the points stay unclustered.
- **Species.** A rule with a category of 15 or more points and only one
  object is filled out automatically to 2 species: the same `kit` and `role`
  through `sceneKitPick`, at a weight of 0.25, and an info problem is
  recorded. The author can block this with `species: 1`.
- **Size.** `k` is the size factor over the real size (4.2). There is no `s`
  and no `sByY` in ground rules: the depth gives the scale.

## 12. The compiled scene v2 (the contract between A and the others)

For v2 data, `sceneCompile(data, { season, lod })` returns the v1 form (v1 4)
PLUS the fields below. For v1 data it returns EXACTLY the v1 form, byte for
byte.

```js
C.v = 2
C.cam = { eye, fov, horizon, heading, x0, f, dMin, dMax, water, lat, lon, alt,
          bands: [{ id, i, d0, d1 }], relief: { x, d, nx, nd, h } | null }
C.surfaces = [{ id, kind, flags, polyM: [[x, d], ...], groundIdx: [indices into C.ground] }]   // C.ground holds the drawable fills (3.3)
C.water[i].v2 = { ... }                                        // 5.2
C.items[i] (v2 placements) += {
  g: { x, d, h, surf, snapped: metres | 0 } | null,            // null for pixel placements without inference
  dz: d,                                                        // depth in metres (pixel placements: inferred, 4.7)
  cls, view: 'side' | 'front' | 'rear' | 'q',
  haze: null,                                                   // computed at bake (7.1); v1 items keep their number
  direct: { shapes, lit, glow, box, foot, h, src } | null,      // a projected building (19): drawn as fills, not a sprite
  shade: true,                                                  // the sprite pass applies (7.2)
}
C.buildings = [{ i, foot: [[x, d], ...], h, roof, style, seed }]     // i: the item index of its direct record
C.flows = [{ id, kind, lanes: [{ path: [[x, d], ...], dir, len, speedRange }], density, profile, mix: { id: w }, max, bus?, timetable?, dMax, seed }]
C.atmos = { preset, V, max, tint }                                  // the authored preset (7.1)
C.weather = { input }                                               // the authored input (8.1); resolved at bake from L
C.lights = [{ kind, x, d, X, Y, r, h, col, i }]                     // static sources (7.3)
C.cover = { auto, n }
C.problems = [{ rule, sev, i, obj, at, msg, fix }]                   // 4.5; also lint input (15)
C.source = { osm: { fetched, bbox, hash } | null, terrain: { src, fetched } | null }   // credits (17.6)
C.stats.v2 = { groundItems, pixelItems, snapped, refused, surfaces, waterV2, flows, flowMax, flowDraws, fxDraws,
               lights, buildings, coverItems, problems: { info, warn, error } }
C.stats.animatedDraws (v2) = the v1 sum + flowDraws + fxDraws        // fxDraws: ripple bands, glints, rings, wakes, fog banks, puddle rings (estimates)
```

**How the compile runs (A).** For v2 data, `sceneCompile` runs these
stages, each guarded by `typeof` so that a missing builder only removes its
feature:

1. `sceneCamera` (A)
2. `sceneSurfacesCompile` (A)
3. `sceneWaterCompile` (A, the geometry)
4. `sceneGenExpand` (F, buildings and streets)
5. the placements: ground and pixel (A)
6. `sceneScatterV2` and `sceneCoverAuto` (A)
7. `sceneFlowCompile` (D)
8. `sceneAtmosCompile`, `sceneWeatherCompile` and `sceneLightsOf` (C)
9. `sceneDepthOrder` (A)
10. the v1 bookkeeping: strips, actors, flocks, signs and stats

**Memoisation.** As in v1, on `(data, season, lod)`. Nothing in the compiled
scene depends on `L`. Whatever depends on the light is done at bake.

## 13. Renderer integration: passes, bake and frame (builder B)

### 13.1 The pass registry (`78-scene-0pass.js`)

`78-scene-canvas.js` keeps the v1 machinery (sprites, bake groups, the frame
loop). It gains named HOOK POINTS. The features plug in as PASSES, so C and D
never edit B's file.

```js
sceneRenderPassDefine({
  id: 'water', order: 20,
  applies(C) { return C.v === 2 || !!(C.fx && C.fx.water === 2); },   // v1 scenes: no pass applies unless the scene opts in (14.2)
  key(L, C) {},                    // optional: a string joined to the light key (a change re-bakes)
  spriteKey(L, C, req) {},         // optional: joined to a sprite's key (req = {o, v, part, season, haze, tint, scale, flip, cls})
  prebake(env) {},                 // before the bake: derive data (puddles, lights, item haze and lift)
  sprite(env, cx, req) {},         // after a sprite is rasterised (shading, rim, snow cap, frost)
  ground(env, layer, gx) {},       // after a layer's ground fills (wet sheen, snow cover, frost)
  layer(env, layer, gx, when) {},  // when 'under': before the layer's sprites (water, shadows); 'over': after them (pools, spill, halos, streaks)
  group(env, grp) {},              // after a group bitmap is complete (reflection bitmaps, masks)
  frameGroup(env, grp, ctx, t, below) {},   // per frame, after the group's blit and strips, before its movers; returns draws
  movers(env, grp, t, push) {},             // per frame: push({ y, draw(ctx) -> draws }) into the group's y-sorted movers
  framePost(env, ctx, t) {},                // per frame, after every group (weather, fog banks, flashes); returns draws
  relight(env, L) {},              // a light refresh that needs no re-bake (flow density)
  stats(env) {},                   // merged into r.stats().passes[id]
});
sceneRenderPasses(stage, C)        // the applicable passes of a stage, in order
```

**`env`.** One per bake, kept for its frames:

```js
{ C, L, W, H, vs, ox, oy, T, lod, still, cam: C.cam, groups, bitmapOf(layer),
  sprite(req) -> spr, keep(spr), slice() (yield inside the bake), placeM(x, y, s, flip),
  lights: [], waterExtra: [], itemHaze: Float32Array, itemLift: Float32Array, flowNow: [], actorsNow: [], profile }
```

**The pass orders** (ids and their `order` values):

| stage | passes, in order |
|---|---|
| `prebake` | weather 10 (puddles, wet, snow); atmos 20 (haze and lift per item, lights); flow 30 (pools of sprites, schedules) |
| `sprite` | atmos 10 (shade, rim); weather 20 (snow cap, frost) |
| `ground` | weather 10 (wet sheen, snow and frost cover) |
| `layer` under | water 20; shadow 30 |
| `layer` over | atmos 40 (pools, spill, halos); weather 50 (streaks) |
| `group` | water 60 (reflection bitmaps, masks); atmos 70 (depth veil) |
| `frameGroup` | flow 10 (positions); water 20 (ripple, glint, rings, wakes, mover reflections); shadow 25 (actor and agent shadows); weather 50 (puddle rings) |
| `movers` | flow (agents) |
| `framePost` | particles (v1); weather 50 (rain, snow v2); atmos 60 (fog banks); weather 90 (lightning) |

### 13.2 The hooks B adds to `78-scene-canvas.js`

All of them are inert for v1 scenes.

1. `sceneRenderPasses(...)` called at each stage above.
2. **Direct items.** `it.direct` items are drawn as `Path2D` fills straight
   into the layer bitmap at bake (with `sceneColour`, haze and lift), not
   through the sprite cache. A projected building is used once, and a sprite
   for it would waste memory.
3. **Sprite keys and colours.**
   - Sprite keys get `spriteKey()` from the passes, plus `f` and `lift` for
     v2.
   - The sprite colour function takes `lift` (7.4).
4. **v2 haze.** For v2 items, haze comes from `env.itemHaze[i]`, not
   `it.haze`.
5. **Glow shares.** For v2 scenes, glow shapes are lit by the window share
   (7.3).
6. **Movers.** Positions are computed BEFORE the frame passes (`actorsNow`).
   Movers of kind `custom` from `movers()` are drawn by their own `draw`.
7. **Stats.**
   - `r.stats().passes`: per pass, bake ms, frame ms and draws.
   - `animatedDraws` includes the draws the passes report.
8. **The v2 water and shadow code** goes in the passes. v1 scenes keep the
   v1 water and shadow code path UNTOUCHED, and are tested pixel-identical
   (14.3).
9. **The quality governor** (optional; never in stills, captures or
   `o.governor === false`). When the median `dynMs` over the last 2 s is
   above 6 ms (or `swFactor` x 6 ms under software raster), it steps down,
   in this order:
   1. ripple at 7.5 Hz;
   2. rings off;
   3. projected actor shadows become blobs;
   4. flow `max` x 0.7.

   It steps back up after 10 s under 4 ms. Each step is logged once in
   `stats().governor`.

### 13.3 What is baked and what is drawn each frame

| feature | compile (pure) | bake (once per light key) | each frame |
|---|---|---|---|
| surfaces (3) | polygons, paints, markings | fills with depth haze; wet, snow and frost overlays | none |
| ground placements (4) | x, y, s, layer, z, view | sprites, lift, shading | none |
| projected buildings (19) | shapes | direct fills; prism shadows | none |
| water (5) | geometry, edges | base, depth fade, edges, reflection bitmap, mask, glint plan | ripple bands at 15 Hz (at most 90 per region, 160 per scene) + 2 blits; glints (at most 30); wakes, rings (at most 16), mover reflections (1 each) |
| shadows (6) | casters, feet | silhouette shadows, contact shadows, lamp shadows | actor and agent shadows (1 each) |
| atmosphere (7) | preset | haze per item, rim and shading in sprites, depth veil | none |
| night lights (7.3) | sources | pools, spill, halos, lit windows by the hour | headlights and tail lights (1 per vehicle), moving spill (1 per lit tram, train or bus) |
| weather (8) | input | wet sheen, streaks, puddles (as water), snow cover, snow caps, frost | rain (at most 250 lines in one path), snow (at most 200), puddle rings (at most 20), fog banks (at most 4), lightning |
| flows (9) | lanes, profiles | sprite pools, spawn lists | agents (at most 60 visible; 1 to 3 draws each, plus shadow, lights, reflection) |
| cover and scatter (10, 11) | placements | baked | none |
| v1 features | as v1 | as v1 | as v1 |

**The budgets are unchanged** (section 25):

- `drawMs` median at most 8 ms and `dynMs` median at most 6 ms on a laptop
  at 1600 x 900;
- at most 300 animated draws;
- the first bake at most 300 ms to warn and 600 ms to fail;
- times `swFactor` (1.75) under headless software raster.

**What the v2 bake adds:**

- the reflection redraws: one `drawImage` per placement mirrored;
- the shadow scratch: one draw per caster, plus one fill and one composite
  per layer;
- the sprite passes: about 4 extra operations per sprite;
- the lights: one gradient per pool.

The perf tests (27) measure the showcase scenes. If a first bake goes over,
the fix comes from this list:

- cap the mirrored placements per region at 600, nearest first;
- skip the rim on sprites under 24 px;
- merge pools under 6 px into one glow.

### 13.4 The SVG still (`70-scene-svg.js`, B)

The SVG still follows the compiled v2 form as one deterministic still. It
has:

- the surfaces (they are ordinary ground entries);
- direct items as `<path>` fills;
- silhouette shadows as sheared `<use>` elements inside one `<g
  filter="url(#shadow)">`, with an `feFlood` + `feComposite` silhouette and
  an `feGaussianBlur`;
- static reflections (5.5);
- agents at `t = 0`;
- lights as radial gradients;
- snow and wet as fills, with no sprite passes.

The 1 MB fill budget and the 150 KB tile budget still hold.

## 14. Backward compatibility (every builder; a hard gate)

### 14.1 What must not change

About 385 composed items in 28 packs exist today. All of them are v1 data,
and all of them must look and behave EXACTLY as before:

- **The compile.** For every composed item (each item's own season, plus
  summer, at LOD 1 and at 0.3), `JSON.stringify(sceneCompile(data, ...))` is
  byte-identical before and after v2.
  - A FIRST (in the first 20 minutes, before any engine edit) generates
    `tests/fixtures/scene-compiled-v1-hashes.json`: `{ ref: sha1 }`, from the
    current HEAD, with a small script `tools/scene-v1-hashes.mjs` (A owns
    it).
  - `tests/scene-compat.test.mjs` (A) checks every hash.
- **The renderer.** v1 scenes take the v1 bake and frame path. No pass
  applies, light keys are unchanged, and sprite keys are unchanged.
  - B's Chrome test renders 8 sample scenes before and after, at noon and at
    night, and requires identical PNG bytes. The "before" PNGs are made
    from a temp `git archive` of the base commit, not a worktree.
  - The samples: two Yateley scenes, Fleet Pond, Woking Commercial Way,
    Sheffield, a Norwich scene, the station demo and the Singapore pilot.
- **The SVG still.** Byte-identical markup for v1 scenes, apart from the
  fresh ids (the existing test rule).
- **APIs.** `sceneItem`, `sceneAdd`, `sceneItems`, `sceneFromArchetype`,
  `sceneBatch`, the archetypes, the retrofit and the region hooks keep their
  signatures and results.
- **The lint.** v1 scenes keep their GOLD or composed status under the
  existing rules. The new sanity rules (15.1) apply to v1 scenes as
  WARNINGS. They block GOLD only with `--strict-placement`, until the packs
  are migrated (section 29 and later).

### 14.2 Opt-in effects for v1 scenes

A v1 scene (or a whole pack, through its scene files) can take single v2
effects without migrating:

```js
fx: { shadows: 2, water: 2, atmos: 2, weather: 2 }   // each optional
```

- `shadows: 2`: silhouette and contact shadows (6). The sun vector comes
  from the camera that `scene migrate` would infer (16.4), or from v1's
  `L.shadow` when no camera can be inferred.
- `water: 2`: the depth fade, mask and ripple (5.5).
- `atmos: 2`: rim light and shading (7.2). v1 layer haze is kept.
- `weather: 2`: wet ground, snow caps and fog banks.

**The gallery dev toggle.** In the browser, `?scenefx=2` (gallery only, read
by the host, C) previews every v1 scene with all four effects on, for review.
No stored data changes.

### 14.3 Superseding an item without editing old files

A migrated recipe (16.4) registers the SAME pack and id as the old scene.
`sceneItems(pack)` (A, core edit) resolves duplicates as follows:

- A recipe item (`item.recipe === true`) wins over a v1 item with the same
  id.
- `sceneItemDups()` (new, A) lists the pair as `superseded`, which is information,
  not an error.

Migration is therefore additive. The old multi-scene JS files are cleaned by
hand later, and pins, favourites and rotation keep the same id.

## 15. Lint integration

### 15.1 The placement-sanity rules (`tools/lib/scene-sanity.mjs`, builder D)

There was no earlier placement-sanity code: `git log` and the current
`tools/lib/scene-lint.mjs` hold only the v1 data, bar, variety, care, perf
and object rules. D builds this from scratch and REUSES the v1 parts that
measure related things:

- `placementVariety`'s nearest-neighbour `grid` measure, for `stamp`;
- `careCheck`'s people counting, for `scale`.

`sanityRules(C, data, { E, thresholds, item })` returns lint rules in the v1
format (`rule(group, name, ok, value, limit, message, extra)`) in the group
`sanity`.

- It reads `C.problems` (the ground placements: exact) and INFERS the same
  facts for pixel placements and v1 scenes (approximate).
- **Inferring a v1 scene's surfaces:**
  - A placement's anchor is hit-tested against the scene's `C.ground` and
    `C.water` paths. Those are the paths in its own layer and nearer layers,
    with water drawn over ground, and the last one that contains the anchor
    counts.
  - The fill's palette SLOT gives the kind, through a dictionary
    (`SLOT_KINDS`):
    - `road`, `tarmac`, `asphalt`, `street`, `lane`: drive
    - `pave`, `kerb`, `plaza`, `square`, `platform`, `flag`, `sett`: walk-hard
    - `path`, `gravel`, `towpath`, `track`: walk
    - `grass`, `lawn`, `green`, `meadow`, `field`, `heath`, `bank`, `verge`,
      `turf`, `moss`: soft
    - `water`, `canal`, `river`, `lake`, `pond`, `sea`, `dock`: water
    - `sand`, `beach`, `shingle`: beach
    - `rail`, `ballast`: rail
    - anything else: unknown (not judged)
- **Inferring a v1 scene's camera:** `horizon = view.horizon`, and the eye
  height is fitted to the depth ladder (v1 2.8): `eye = 1.72 * (900 -
  horizon) / 132`. The `fov` comes from the view.

| rule | measure | default | strict |
|---|---|---|---|
| `vehicleSurface` | car, bus, tram, train, bike or tractor anchors on a kind their class does not allow (4.4) | error | error |
| `boatSurface` | boats off water (unless `beached`) | error | error |
| `floating` | anchors on no ground or water path of their layer or any farther layer (in the sky); classes `bird-air` and `air` and `pin: true` are exempt | error | error |
| `refused` | ground placements the compile refused (4.5) | error | error |
| `personSurface` | people on water, rail, or a road that is not a crossing | warn | error |
| `plantSurface` | trees, shrubs or plants on drive, rail, walk-hard (unless `pit`) or water | warn | error |
| `snapped` | ground placements moved by more than half their snap radius | warn | error |
| `scale` | implied real height / `real.h` outside `[0.7, 1.45]` (people `[0.85, 1.2]`), from the camera (v2) or the inferred camera (v1) | warn | error |
| `scalePairs` | two people (or two cars) within 40 units of baseline whose height ratio is over 1.3 | warn | error |
| `landmarkOccluded` | the share of a landmark's or signature's box covered by NEARER placements, at 1/8 resolution, each weighted by class opacity (building 1, tree 0.75, person 0.5, plant 0.6) | warn above 0.3 | error |
| `ghost` | a placement whose haze bucket is at least 0.4 while it is at least 25 % of the frame tall or in the near or fore bands; or an object whose main parts (not `lit` or glow) have opacity under 0.7 over more than 30 % of its area | warn | error |
| `stamp` | at least 4 hand placements of one (object, variant) with scales within 5 % and equal spacing within 5 % along a line (a repetition grid); objects tagged `row` are exempt | warn | error |
| `haze` | the area-weighted mean haze of the placements outside the horizon band is over 0.12 (v2; v1: any non-horizon layer haze over 0.45, or that mean over 0.25), unless the weather is fixed to fog or mist | warn | error |
| `clutter` | the most "salient" placements (at least 40 units tall, not cover) in any 400 x 300 window of the lower half is over 9; or the overlap of salient boxes is over 0.5 | warn | error |
| `view` | a mover drawn side-on where 4.3 wants front or rear, nearer than 30 m | warn | warn |
| `viewSync` | the camera and the view disagree (2.1) | warn | error |

**The message.** Every rule names the item and its object, says where it is
(x and d, or x and y), and gives the FIX. For example:

```
vehicleSurface: place[14] vehicle.car stands on grass (slot @lawn) at x 820 y 742: move it onto the road (on: 'road'), or run scene migrate
```

**Thresholds** live in `tools/anim-quality.json` under `composed.sanity` (D),
marked `designed`. G's golden calibration (22.3) proposes the calibrated
values, and the reviewer applies raises only.

### 15.2 Wiring the lint (D: `tools/lib/scene-lint.mjs`)

- `lintScene` adds the `sanity` group, and the `composition` group when
  `tools/lib/scene-composition.mjs` exists (G, 20.4; imported dynamically,
  never statically).
- **`--strict-placement`** (on `scene lint`, `scene sheet` and `scene
  critique`) makes every warning of both groups a failure.
- **GOLD now also requires** no sanity ERRORS (strict or not) and no
  `refused` problems.
- **Data rules gain:**
  - `flowMax` at most 60;
  - `fxDraws` counted in `animatedDraws`;
  - `problems.error` must be 0 for GOLD.
- **The bar (v1 15.2) for v2 scenes:**
  - `layersUsed` counts the bands that hold content.
  - `movers` counts each flow's `max` agents (capped at 15 per flow).
  - `travellers` counts flows as travellers.
  - `shadows` and `reflections` are satisfied by v2's automatic shadows and
    water.
  - `nightLights` counts glow groups plus light sources.
- **Output.** As v1: PASS or FAIL per rule, `--json`, and the last line. A v2
  scene that passes everything prints `GOLD v2`.

## 16. Recipes and the tool (builder D; A for the runtime half)

### 16.1 The recipe file

A v2 scene lives in its OWN file, `src/app/71-scene-<pack>-r-<id>.js`, as
JSON between markers. The editor (23), the composer (20), `scene new` and
`scene migrate` all read and write it the same way:

```js
/* Scene recipe v2: v2-demo/castlefield-basin (docs/dev/SCENE_ENGINE_V2.md 16).
   Data only. Edit with the scene editor or by hand; tools rewrite the block between the markers.
   Contains OpenStreetMap data, (c) OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright). */
typeof sceneAddRecipe === 'function' && sceneAddRecipe(/*@recipe*/{
"v":2,
"pack":"v2-demo",
"meta":{"id":"castlefield-basin","label":"Castlefield Basin","site":"Manchester","tags":["canal","manchester","basin","viaduct","boats","towpath"],"mood":"calm","colour":"teal","region":["GB-ENG"]},
"scene":{
 "id":"castlefield-basin",
 "view":{"lat":53.4746,"lon":-2.2556},
 "camera":{"eye":1.7,"fov":64,"horizon":452,"heading":290,"water":-0.45},
 "surfaces":[
  {"id":"land","kind":"grass","rest":true},
  {"id":"towpath","kind":"towpath","path":[[-4,5],[-5,80]],"width":2.6,"src":"osm"}
 ],
 "water":[
  {"id":"canal","kind":"canal","path":[[2,5],[3,90],[18,260]],"width":11,"src":"osm"}
 ],
 "place":[
  {"obj":"boat.narrowboat","on":"canal","d":28,"u":0.25,"face":"right"}
 ],
 "flows":[],
 "atmos":"auto","weather":"live","cover":"auto","season":"auto","at":"golden","setting":"mixed",
 "source":{"osm":{"fetched":"2026-10-09","hash":"4c1f0a"}}
}
}/*@end*/);
```

**The format rules:**

- The block between `/*@recipe*/` and `/*@end*/` is STRICT JSON (`JSON.parse`
  must accept it): no comments, no functions, finite numbers.
- Formatting is canonical (`formatRecipe`, D):
  - top-level keys and scene keys in a fixed order;
  - each element of a list of objects on its own line, as compact JSON;
  - numbers rounded: metres to 0.1, rows and columns to 1, factors to 0.01.

  A save that changes nothing changes no bytes, and diffs show one changed
  line per changed placement.
- **The runtime half** (A, `70-scene-1recipe.js`, pure):
  - `sceneAddRecipe(rec)` calls `sceneAdd(rec.pack, rec.meta, () =>
    sceneFromRecipe(rec.scene))`, with `item.recipe = true` and
    `item.recipeV = 2`.
  - `sceneFromRecipe(scene)` returns the scene data (defaults filled, a deep
    freeze in Node tests).
  - `sceneRecipeCheck(rec)` returns the problems: the v1 `sceneValidate`
    plus the v2 keys and types, the surface and water ids, and the
    references.
- **The data budget.** `dataBytes` is the length of the JSON block, at most
  24,000 bytes, as v1. OSM imports simplify until they fit (17.4).
- **The pack file.** Recipe scenes still need their pack file
  (`72-anim-pack-<pack>.js`, `items: sceneItems('<pack>')`).
  - A NEW pack is scaffolded by `scene new`, as in v1.
  - A recipe added to an EXISTING pack needs no pack edit: `sceneItems`
    reads the recipes of that pack.

**The Node half** (D, `tools/lib/scene-recipe.mjs`):

```js
findRecipes(root)                    // -> [{ ref, file, start, end }] from the markers in src/app/71-scene-*-r-*.js
readRecipe(root, ref)                // -> { rec, file, version (sha1 of the block) }
formatRecipe(rec)                    // -> the canonical text of the block
writeRecipe(root, rec, { version, file, write })   // replaces only the block; refuses (409-style error) if the block's sha1 is not `version`; atomic
newRecipeFile(root, rec)             // writes 71-scene-<pack>-r-<id>.js with the header (and the OSM line when rec.scene.source.osm)
```

E (`--into`), F (`scene street --into`), G (`scene compose`) and H (the
editor route) all write recipes ONLY through this module. The editor route
writes atomically with `lib/fsutil.mjs`, passed in as `write`.

### 16.2 Subcommands without collisions

`scene` is one module (`tools/lib/anim-cmd/scene.mjs`, owned by D). D adds a
DELEGATION:

- `scene <sub>`, where `<sub>` is not built in, loads
  `tools/lib/scene-cmd/<sub>.mjs`, which exports `default { summary, usage,
  options, run(args, ctx, lib) }`.
- `lib = { loadRegistry, engineOf, lintScene, recipes: scene-recipe.mjs,
  harness: scene-page.mjs, times: scene-times.mjs }`.
- `scene.mjs` merges every sub-module's `options` into its own at module
  load (top-level `await import`), so the option parser accepts them.
- Usage lists the subcommands with their summaries.

Each builder then owns its own subcommand files:

| file | command | owner |
|---|---|---|
| `scene-cmd/migrate.mjs` | `scene migrate` | D |
| `scene-cmd/osm.mjs` | `scene osm` | E |
| `scene-cmd/terrain.mjs` | `scene terrain` | E |
| `scene-cmd/street.mjs` | `scene street` | F |
| `scene-cmd/building.mjs` | `scene building` | F |
| `scene-cmd/compose.mjs` | `scene compose` | G |
| `scene-cmd/critique.mjs` | `scene critique` | G |
| `scene-cmd/golden.mjs` | `scene golden` | G |
| `scene-cmd/compare-to-golden.mjs` | `scene compare-to-golden` | G |

The same pattern applies to `object`: H adds the delegation to `object.mjs`,
with `tools/lib/object-cmd/<sub>.mjs`, for `object normalise`.

### 16.3 `scene new`, `scene lint` and the shared flags (D)

```
scene new <pack> <id> [--preset street|raised|across-water|from-hill|down-street|through-arch|close-up|panorama]
                      [--lat .. --lon .. --heading ..] [--osm] [--terrain] [--setting natural|urban|mixed] [--v1]
```

- `scene new` writes a v2 recipe file (16.1). The camera comes from the
  preset (G's `SCENE_CAMERA_PRESETS`, else the street defaults of 2.2). The
  file has a `rest` surface, `atmos: 'auto'`, `weather: 'live'`, `cover:
  'auto'` and empty lists.
- `--osm` and `--terrain` run E's commands into the new recipe.
- `--v1` keeps the old scaffold.
- **New on `lint`, `sheet`, `perf`, `capture` and `critique`:**
  - `--weather <kind>`: the page harness passes `wx` to the host (B adds the
    `wx` option to `scenePageHtml`).
  - `--fx 2`: v1 scenes with every opt-in effect (14.2).
  - `--strict-placement` (15.2).
- **Sheets.** `scene sheet --weather rain,snow,fog,clear` renders one row per
  weather. `scene sheet --flows` renders three moments (8 h, 13 h and 23 h)
  to show the traffic changing.

### 16.4 `scene migrate` (D, `tools/lib/scene-cmd/migrate.mjs`)

```
scene migrate <ref>[,...] | --pack <id> [--dry-run] [--report] [--keep-pixels] [--out dir]
```

**What it does:**

1. **Compile the v1 scene.** Infer its camera: `horizon` from the view, the
   eye fitted to the depth ladder (15.1), and the `fov` from the view.
2. **Ground fills become surfaces.** Each v1 ground path becomes a polygon
   surface (unprojected with the inferred camera), with its kind from the
   slot dictionary (15.1). An unknown slot becomes `grass` or `plot`, with a
   note.
   - v1 water becomes v2 water of kind `lake`. When a v1 water polygon is
     long and narrow in perspective (aspect after unprojection over 6:1),
     its kind becomes `canal` and its centreline is fitted.
3. **Placements become ground placements.** For each placement with its
   anchor below the horizon (more than 2 units below): `at: [x, d]` from the
   inferred camera, and `k` = the placement's scale divided by the scale
   from depth, so it keeps its look (`k` is then judged by the `scale`
   rule).
   - Placements on or above the horizon stay as pixel placements with `pin:
     true` (the skyline backdrop).
   - Scatter rules are converted to `dist: 'screen'` ground rules over the
     unprojected area, keeping `n`, seed and mix.
   - Actors get `ground` paths.
4. **Run the compile and the sanity lint.** Write the recipe file (16.1)
   with `meta` copied, which supersedes the item (14.3). Print a report:
   - every snapped and refused placement;
   - every vehicle that was on grass;
   - every water region that became a canal;
   - the scale ratios.
5. **`--dry-run`** prints the report and writes nothing. **`--report`** also
   writes `<out>/migrate-<pack>.json`, for the critic and for review.

Migration is how the existing defects are FOUND: the report lists each car on
grass, each oversized person and each floating object, with a fix. The tool
never "fixes" by guessing a surface. A refused placement stays out until a
person or an agent decides.

## 17. Real layouts from OpenStreetMap (builder E; authoring time only)

### 17.1 The command

```
scene osm --at <lat,lon> --heading <deg> [--fov 66] [--eye 1.65] [--horizon 470] [--range 700]
          [--place "<name>"] [--into <pack>/<id> | --out file.json] [--refresh] [--offline] [--dry-run] [--json]
```

- **The viewpoint.** `--at` with `--heading` is the deterministic form.
  - `--place` instead geocodes with Nominatim (`nominatim.openstreetmap.org`,
    at most 1 request per second, cached for 90 days) and asks for
    `--heading`.
  - Without `--heading`, it prints the 8 compass headings with the named
    features in each, so the author can choose.
- **`--into`** merges the imported sections into a recipe through
  `scene-recipe.mjs` (16.1).
  - It REPLACES only entries carrying `"src": "osm"`. Hand-made entries (no
    `src`) and hand edits on imported ones (the tool sets `src: 'osm*'` when
    an entry's bytes no longer match the import) are kept.
  - Running the import again is therefore safe.
- **Output.** `--out` writes the sections as JSON. `--dry-run` prints a
  summary: counts by kind, the nearest named features, the data size and
  the problems.
- **The app never fetches.** The imported geometry is plain data in the
  recipe. `npm test` never touches the network: the tests inject `fetch` and
  use fixtures.

### 17.2 Fetching (`tools/lib/osm-fetch.mjs`)

- **Overpass API.** POST to `https://overpass-api.de/api/interpreter` (or
  `--overpass <url>`), with `[out:json][timeout:60]`.
  - The bbox is the view wedge's bounding box (the camera position, plus
    `range` along the heading, widened by the fov and 20 %).
  - One query per run fetches:
    - `highway`, `railway`, `waterway`, `natural` (`water`, `tree`, `wood`,
      `heath`, `beach`, `scrub`), `landuse`, `leisure`, `building`,
      `building:part`, `amenity`, `historic`, `tourism`, `man_made`,
      `bridge`, `barrier`, `public_transport=platform`, `place=square`, and
      `area:highway`;
    - with `out geom;` for ways and relations.
- **Etiquette.**
  - The User-Agent is `OpenDash scene tool (https://github.com/mahdi1190/opendash)`.
  - At most 1 request per run, and no parallel requests.
  - A 429 or 504 response waits 30 s and retries once, then fails with a
    clear message.
- **The cache.** `.anim-ref/cache/osm/<sha1 of the query>.json`
  (`.anim-ref/` is already git-ignored), holding `{ fetched, query,
  response }`.
  - It is valid for 30 days. `--refresh` re-fetches; `--offline` refuses to
    fetch.
  - The cache is a developer cache only: never committed, never read by the
    app.

### 17.3 Projecting (`tools/lib/osm-project.mjs`, `tools/lib/osm-tags.mjs`, `tools/lib/geo.mjs`)

1. **Ground coordinates.** Each latitude and longitude goes to local metres
   (ENU, equirectangular about the camera: `east = (lon - lon0) * cos(lat0)
   * 111320`, `north = (lat - lat0) * 110540`). It is then rotated by the
   heading to camera ground coordinates: `x` to the right, `d` forward.
2. **Clipping.** Everything is clipped to the frustum wedge (`d` from 0.5
   to `range`, `|x|` up to `d * tan(fov / 2) * 1.2`) with Sutherland-
   Hodgman.
3. **Classification** (`osm-tags.mjs`, data tables):

   | OSM | becomes | width or size |
   |---|---|---|
   | `highway=motorway, trunk, primary, secondary, tertiary, unclassified, residential, service, living_street` | a `road` strip | `width`, or `lanes * 3.2`, or by class: 11 / 10 / 9 / 7.5 / 7 / 6 / 6 / 4 / 5 m |
   | `sidewalk=*` (urban roads default to both) | `pavement` strips `beside` the road | 2 m |
   | `highway=footway, path, bridleway, cycleway, pedestrian, steps, track` | `path` / `cycleway` / `plaza` (`pedestrian` areas, `area:highway`) / `steps` / `track` | 2 / 1.5 / 3 / 2.5 / 3 m |
   | `towpath` (`highway=*` along a `waterway=canal` within 6 m) | `towpath` | |
   | `railway=rail, light_rail, narrow_gauge` | `rail` | 3.5 m per track |
   | `railway=tram` | `tramway`, embedded when it shares a road | |
   | `railway=platform`, `public_transport=platform` | `platform` | |
   | `waterway=canal, river, stream` (centrelines) | water strips | `width`, else canal 10, river 25, stream 3 |
   | `natural=water` + `water=river, canal, lake, pond, reservoir, basin` (areas) | water polygons of that kind | |
   | the sea (`natural=coastline` near the view) | `sea` | a band beyond the coastline |
   | `leisure=park, garden, common, recreation_ground`, `landuse=grass, village_green` | `park`, `garden`, `grass` | |
   | `landuse=farmland, meadow`, `natural=heath, scrub, wood`, `landuse=forest` | `field`, `meadow`, `heath`, `wood` (+ a tree scatter rule) | |
   | `natural=beach, sand`, `landuse=railway`, `amenity=parking` | `beach`, `sand`, `rail` (yards), `parking` | |
   | `building=*` (+ `building:part`) | `buildings[]` footprints for F (19) | height: `height`, `building:levels * 3 + roof`, else by type |
   | named and notable features | `place[]` landmarks (17.5) | |

4. **Layering.** The surfaces are ordered as they paint, far to near (the
   OSM `layer` tag breaks ties). Areas come first, then strips, then
   pavements, then crossings.
5. **Simplification.** Douglas-Peucker with a tolerance of `1.5 * d / f`
   metres (1.5 screen units at that depth). Numbers are rounded to 0.1 m.
   Features under 2 units on screen are dropped. If the recipe is still over
   budget (16.1), the tolerance goes up and far features are dropped first.

### 17.4 Buildings from OSM

Each footprint becomes `{ foot, h, storeys, roof, style, seed, front, shop,
src: 'osm' }` for F (19).

- **`front`** is the footprint edge that faces the nearest street; it is
  where the door goes.
- **`style`** is guessed by `osm-tags.mjs`:
  - `building:architecture` when present;
  - else `start_date` to an era: before 1840 Georgian; 1840 to 1900
    Victorian; 1900 to 1918 Edwardian; 1919 to 1939 interwar (`1930s-semi`
    for `semidetached_house`, `interwar-shops` with `shop=*`); 1945 to 1979
    with `building:material=concrete`, brutalist; after 1990, modern glass;
  - plus `building=` (`terrace`, `house`, `semidetached_house`,
    `industrial`, `warehouse`, `train_station`, `church`);
  - plus `building:material` (`flint`: Norfolk flint; `stone`: stone
    cottage; `brick`);
  - plus the region: Norfolk and Suffolk lean flint, the Pennines lean
    stone;
  - else by type and area.
- **No brands, ever.** Shop and amenity names come from OSM `name`, `brand`
  and `operator`, and are often trademarks. The import NEVER copies them.
  - A shop gets `shop: { kind: <shop tag> }`, and its fascia shows a GENERIC
    word from a fixed table (`bakery`: "Bakery", `cafe`: "Cafe", `books`:
    "Books", ... at most 40 kinds), and only in scenes with `signage: true`.
  - Features with a `brand*` tag get no sign at all.
  - Region scenes have no signs (v1 8.5).

### 17.5 Landmarks and amenities

Named or notable features (`amenity=place_of_worship`, `railway=station`,
`historic=*`, `tourism=attraction`, `man_made=tower, windmill, lighthouse,
bridge`, `amenity=fountain, clock`, `memorial` and `statue` artworks,
`natural=tree` with `denotation`, `bridge=yes` spans over water) become
placements AT their real positions.

- **The object.** It is chosen through `SCENE_OSM_OBJECTS` (in
  `osm-tags.mjs`):
  1. an existing `landmark.*` whose `place:` tag or name slug matches;
  2. else a generic library object of the type (`structure.fountain`,
     `tree.*` by `species` or `genus`, F's `station` style for stations);
  3. else it is listed as MISSING in the report ("a church tower, 120 m,
     30 m tall: no library object").
- **The scale.** Real heights come from the `height` tag when present. They
  set `k` against the object's `real.h`, clamped to 0.6 to 1.6.
- **Bridges** over water become `structure` placements with `over: 'water'`
  spanning their real length (a bridge object with `real.l`).
- **Names** go in the import report and in `meta.site` suggestions, never in
  drawn text.

### 17.6 Credits and the licence

- **ODbL.** A recipe holding projected OSM geometry is a derivative of the
  database. It carries the OSM line in its file header (16.1), and its
  `scene.source.osm`.
  - `THIRD_PARTY_NOTICES.md` (E) states: "Scene layouts marked as containing
    OpenStreetMap data: (c) OpenStreetMap contributors, available under the
    Open Database License 1.0 (ODbL); https://www.openstreetmap.org/copyright".
  - The derived data is offered under the ODbL. The rest of the repository
    stays MIT.
- **The rendered scenes** are produced works and are credited where they
  show:
  - `sceneCredits(itemOrData)` (pure, E, `70-scene-1credit.js`) returns
    `['(c) OpenStreetMap contributors']` plus the terrain credits (18.4)
    from `source`.
  - The gallery (H) shows them as a small caption line under a scene that
    has any.
  - Settings > About (E, `57-settings.js`) gains one row: `Maps`: "Scene
    layouts from OpenStreetMap, (c) OpenStreetMap contributors (ODbL 1.0);
    terrain from the sources in THIRD_PARTY_NOTICES.md". It links to
    `https://www.openstreetmap.org/copyright` (a link, not a fetch).
- **The docs.** `docs/dev/SCENE_ENGINE_V2.md` (this section) and the
  reviewer's `MODULES.md` row repeat the credit.

## 18. Real terrain and horizons (builder E)

### 18.1 The command

```
scene terrain --at <lat,lon> --heading <deg> [--fov 66] [--eye 1.65] [--horizon 470] [--range 25000]
              [--dem terrarium | os50 --dem-dir <folder of OS Terrain 50 .asc tiles>] [--into <pack>/<id> | --out file.json] [--refresh] [--offline]
```

### 18.2 Sources (`tools/lib/terrain.mjs`, `tools/lib/geo.mjs`)

- **`terrarium`** (the default): the open "Terrain Tiles" dataset (AWS Open
  Data, from the Mapzen project), as `terrarium` PNG tiles:
  `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`.
  - Zoom 12 is used for the skyline and zoom 14 for near relief.
  - Each tile is decoded with the zero-dependency PNG decoder
    (`pngDecode`, `tools/lib/scene-capture.mjs`): `height = R * 256 + G +
    B / 256 - 32768`.
  - Tiles are cached in `.anim-ref/cache/terrain/` for a year.
  - The dataset combines SRTM, OS Terrain 50 (in Great Britain) and other
    sources. E copies its attribution requirements VERBATIM from the
    dataset's attribution document (the tilezen/joerd `attribution.md`)
    into `THIRD_PARTY_NOTICES.md`. Do not paraphrase a licence.
- **`os50`**: local OS Terrain 50 ASCII-grid tiles (`.asc`, 50 m, the
  British National Grid), for offline work in Great Britain.
  - `geo.mjs` implements WGS84 to OSGB36 (a Helmert transform) and to
    Transverse Mercator easting and northing, tested against published
    control points to within 5 m.
  - Licence: the Open Government Licence v3; the credit is "Contains OS
    data (c) Crown copyright and database right <year>".

### 18.3 What it computes

- **The camera altitude.** `camera.alt` is the ground elevation at the
  camera. The eye's height above sea level is `alt + eye`.
- **Rays.** 161 rays across `fov * 1.1`, each sampled every 30 m out to
  `range`, with the curvature-and-refraction drop `d^2 / (2R) * (1 -
  0.13)`.
  - For each ray, the elevation angle of each sample:
    `atan((h - eyeAlt - drop) / d)`.
- **Ridges.** For each depth band (0.5 to 2 km, 2 to 6 km, 6 to 25 km), the
  maximum angle per ray gives one silhouette.
  - A silhouette that never rises above the farther ones is dropped.
  - It is converted to screen rows: `Y = horizon - f * tan(angle)`.
  - It is simplified to about 60 points, rounded to 1 unit.
- **The skyline.** The overall maximum per ray. It is written into the
  recipe for the critic, and used to check that buildings do not poke
  through hills wrongly.
- **Near relief** (optional, `--relief`): a 7 x 9 grid (2.4) of heights
  relative to the camera's ground, from zoom 14.

**Output** (recipe sections, `src: 'terrain'`):

```js
terrain: { src: 'terrarium', ridges: [{ band: 'far', d: 9000, pts: [[X, Y], ...] }, ...], skyline: [[X, Y], ...] },
ground: { relief: {...} },            // when --relief
camera: { alt: 182 }
```

- **The compile (A)** turns `terrain.ridges` into ground fills in the
  `horizon` and `far` bands. Each fill is the area under the ridge, painted
  from the palette slot `hill` (default greens and browns by season), and
  hazed by C's `sceneHazeAt(d)` at the band's depth. This gives layered
  hills with real aerial perspective.

### 18.4 Credits

`scene.source.terrain = { src, fetched }`. `sceneCredits` (17.6) adds the
dataset credit lines from a table in `70-scene-1credit.js`:

- `terrarium`: "Terrain: Terrain Tiles (AWS Open Data), with data from SRTM
  and others" (E puts the exact required wording here from the attribution
  document);
- `os50`: "Contains OS data (c) Crown copyright and database right".

## 19. Procedural buildings and streets (builder F)

### 19.1 Two modes

- **Elevation mode.** A reusable library object: a facade seen front-on,
  for buildings that face the camera (across a square or across water).
  - `sceneBuildingObject(params)` registers, lazily and memoised, an object
    `building.gen-<style>-<hash8>` through `sceneObjDefine`.
  - It has a deterministic `build(v, rnd, ctx)`; `real.h` set exactly;
    `seasonal: true`; parts `body`, `roof`, `win` (glow), `lit`, `snow`.
  - It is drawn at 20 units per metre (`SCENE_GEN_UPM`).
  - It works in pixel and ground placements alike, and in v1 scenes.
- **Projected mode.** For buildings seen at an angle (a street in
  perspective, OSM footprints):
  - `sceneBuildingProject(b, cam, ctx)` takes a footprint polygon (metres),
    a height, a roof and a style.
  - It returns screen-space shapes for the faces visible from the camera:
    walls whose outward normal points toward the camera, then the roof
    planes, then the windows, doors and details, ALL laid out in metres on
    each wall plane and projected through the camera.
  - The compile places it as a `direct` item (12, 13.2): drawn once into the
    bake bitmap, with no sprite.
  - This is how a whole real street sits in true perspective.

### 19.2 Parameters

```js
{ style: 'victorian-terrace', frontage: 5.2, storeys: 2, depth: 9, roof: 'gable' | 'hip' | 'mansard' | 'flat' | 'butterfly' | 'pitched-side',
  seed: 17, bays: 'auto', party: 'both' | 'left' | 'right' | 'none',      // shared walls with neighbours (no side windows, chimney stacks on the party line)
  shop: { kind: 'bakery', sign: 'Bakery' } | false,                         // sign text only through sceneSignText and only when the scene has signage: true
  corner: false, door: 'left' | 'right' | 'centre' | 'auto', front: 2 }     // front: the footprint edge with the door (projected mode)
```

**Seeded variation**, so that no two houses are the same:

- the door colour, from the style's door palette;
- the window lit pattern and curtain colours;
- the wear and dirt tone (5 % to 15 %);
- chimney pots (1 to 4);
- the bay window or flat front, as the style allows;
- small additions: a satellite-free roofline, a downpipe side, a burglar
  alarm box, window boxes in summer, a wreath-free door.

**No brands, no flags, no religious symbols**, and no house numbers that
could be read as real addresses.

### 19.3 Styles (one data file each, `70-scene-gen-style-<id>.js`)

`sceneBuildingStyleDefine(id, style)` registers a style as DATA plus small
drawing helpers:

- the wall materials and bond (brick colours in 4 seasons and wet);
- the window types and proportions, the doors;
- the roof material and pitch;
- the chimneys, the shopfront type;
- the seasonal details;
- the night look.

| style | key features |
|---|---|
| `victorian-terrace` | red or yellow stock brick, canted bay windows on the ground floor, 2-over-2 sashes, slate roof, a stack on each party wall, recessed doors with fanlights |
| `georgian` | Flemish bond or stucco, 6-over-6 sashes graded smaller upward, fanlight door with a doorcase, parapet, railings |
| `edwardian` | red brick with render or tile-hung gables, wide bays with gables over, leaded upper lights, a porch canopy |
| `1930s-semi` | pebbledash or render over brick, a two-storey curved or square bay, a hipped tiled roof, a sunrise gate, metal-framed windows with horizontal bars |
| `interwar-shops` | a parade: shopfronts with pilasters, fascia and stall riser, flats over with metal windows, a brick parapet |
| `mill` | red brick, 4 to 6 storeys, a regular grid of segmental-arched windows, a loading-door bay, an engine-house chimney (optional) |
| `norfolk-flint` | knapped or cobble flint panels with brick quoins and window dressings, pantile roof, Dutch gables (seeded) |
| `stone-cottage` | coursed stone (gritstone or limestone by region), stone slate roof, small mullioned windows, a low door |
| `modern-glass` | a curtain wall grid (mullions and transoms), spandrel panels, a lit core at night, a podium |
| `brutalist` | board-marked concrete, a deep window grid with recessed glazing, a cantilevered upper floor, a flat roof |
| `station` | a Victorian or interwar station building: canopy with valance, clock-free gable, booking-hall windows, a platform face; signs only through 8.3 |

**Details by scale.** The level of detail comes from the projected size of
one storey:

| storey height on screen | what is drawn |
|---|---|
| under 6 units | tone bands only |
| under 14 | plain window rectangles |
| under 30 | frames, glazing bars, sills and lintels |
| 30 and over | brick coursing hints, door panels and fanlights |

A projected building has at most 900 shapes. An elevation object stays within
the object limits (v1 2.6).

**Seasons and night:**

- **Spring and summer:** window boxes and hanging baskets.
- **Autumn:** ivy turns red (when the seed gives ivy).
- **Winter:** the `snow` parts show on roofs, ledges and sills by C's
  `snowDepth` (8.3, `snowParts`); chimney anchors (`smoke` points) let C add
  smoke later (cut list).
- **Night:** window glows with a seeded threshold for the lit share by the
  hour (7.3), curtains drawn on some (a warm or blue-TV tint), and a `lit`
  part for shopfronts and the station canopy.

### 19.4 Streets

```js
streets: [
  { side: 'left', along: 'road', from: 8, to: 140, style: { 'victorian-terrace': 4, 'interwar-shops': 1 }, storeys: [2, 3],
    frontage: [4.6, 6.2], setback: 2.5, gaps: 0.08, shops: 'ground' | 'none' | 'corner', seed: 3 },
]
```

`sceneStreetExpand(rule, C, cam)` walks the edge of the named strip (plus its
pavement and the setback), from `from` to `to` metres along it. It places
buildings one after another:

- each frontage is seeded within the range;
- the style mix is weighted, and runs of a style continue (terraces come in
  rows);
- gaps (alleys, driveways) appear at `gaps`.

**Output.** `buildings[]` footprints facing the street, in projected mode.
OSM buildings (17.4) use the same path, with real footprints.

**`scene street` and `scene building`** (F, `scene-cmd/street.mjs` and
`building.mjs`) preview the generator:

- `scene building sheet --style mill --storeys 5 [--seasons] [--night]`
  renders the elevation objects as a sheet.
- `scene street --style victorian-terrace,interwar-shops [--into ref]` makes
  a street recipe draft or merges a `streets` rule.

### 19.5 The other APIs F provides

```js
sceneBuildingShadow(b, sunG, sunTan, cam)    // -> the screen polygon of the prism's shadow (6.2)
sceneGenExpand(data, C, cam)                 // -> { items: [Placed with direct], buildings: [...] }: the compile hook (12)
sceneBuildingStyles()                         // -> [{ id, label, eras, regions }]
```

## 20. Camera presets and the auto-composer (builder G)

### 20.1 Presets (`70-scene-1camera.js`, pure)

`SCENE_CAMERA_PRESETS`:

| preset | eye (m) | fov | horizon | composition defaults |
|---|---|---|---|---|
| `street` | 1.65 | 64 | 470 | the vanishing point at 0.38 or 0.62 of the width; a framing object on one side |
| `raised` | 7 | 68 | 400 | the landmark on a third; the street or square as a leading diagonal |
| `across-water` | 1.7 | 66 | 440 | the water fills 18 % to 32 % of the frame height; the far bank at 30 to 250 m; the landmark mirrored |
| `from-hill` | 1.7 above the terrain | 72 | 330 | ridges in 3 or more bands; the town in the middle distance; the sky 35 % to 45 % |
| `down-street` | 1.6 | 58 | 480 | the axis along the street or canal; the vanishing point off-centre; strong leading lines |
| `through-arch` | 1.6 | 54 | 470 | an arch or tree frame in `front`, covering 25 % to 40 % of the edges |
| `close-up` | 1.5 | 42 | 500 | the subject at 8 to 15 m, filling 35 % to 55 % of the height; a shallow scene |
| `panorama` | 2.2 | 96 | 500 | a wide horizon; the landmark off-centre; the sky 30 % to 40 % |

`sceneCameraPreset(id, { heading, lat, lon, alt })` returns a camera (2.1).
`scene new --preset`, the composer and the editor's camera panel all use it.

### 20.2 The composition rules

`sceneCompositionOf(C)` (pure, so the editor can draw the overlays too)
measures the compiled scene, and G's rules (20.4) judge it:

- **Rule of thirds.** The main subject's (landmark or signature) visual
  centre lies within 0.08 of a third line in x, and is NOT in the central
  band (0.45 to 0.55) unless it is tagged `symmetric` (a facade seen
  head-on, a pagoda).
- **Leading lines.** At least one strip (road, canal, towpath, rail or path)
  whose projected edges converge toward within 0.15 of the frame width of
  the subject or its third line.
- **Foreground framing.** In presets that want it: `front`-band placements
  covering 8 % to 25 % of the frame width at one or both sides.
- **The sky.** Its share is 22 % to 45 % (`from-hill` and `panorama` 30 %
  to 50 %; `close-up` 10 % to 35 %).
- **The subject's size.** 18 % to 45 % of the frame height (`close-up` 35 %
  to 60 %).
- **The horizon height.** Varied ACROSS a pack: the standard deviation of
  the horizon rows over the pack's scenes is at least 40 units.

### 20.3 The auto-composer (`scene compose`, `tools/lib/scene-compose.mjs`)

```
scene compose "<brief>" --pack <id> [--id <id>] [--at lat,lon] [--date ISO] [--candidates 24] [--critic] [--dry-run]
   e.g. scene compose "Kelham Island, golden hour, across the river" --pack uk-area-sheffield
```

**1. Parse the brief** (deterministic: keyword tables, no model):

- the place: a name, or `--at`;
- the moment (`golden hour` gives `at: 'golden'`; also `dawn`, `noon`,
  `dusk`, `night`, ...);
- the preset (`across the river` or `lake` gives `across-water`; `down the
  canal` or `street` gives `down-street`; `from the hill` gives
  `from-hill`; `through the arch` gives `through-arch`);
- the weather (`in the rain`, `snow`, `fog`);
- the season (`autumn`: a fixed `season`, else `auto`);
- the subject (`the cathedral`, `the mill`, `the station`).

Unknown words are listed back to the author.

**2. Locate.** The place is geocoded (E's Nominatim helper, cached) or taken
from the region tables (`UK_PLACES` rows and the region places). The OSM
data comes from E's `osmFetch` for a 1.5 km box.

**3. Find the viewpoint.**

- Candidate camera positions are seeded: a ring of points 60 to 600 m from
  the subject (or the place centre). They stand on walkable surfaces (or a
  bridge for `raised`), with headings that put the subject on a third.
- Each candidate is scored on:
  - **visibility:** rays to the subject's outline are not blocked by
    building footprints (with heights); the occlusion stays under 30 %;
  - **the preset's needs:** water between the camera and the subject for
    `across-water`; a street axis for `down-street`; elevation for
    `from-hill` (E's terrain);
  - **the composition rules** (20.2) on a quick projection;
  - **uniqueness:** the similarity to the pack's other scenes (20.4) is
    penalised.
- The best `--candidates` are kept. The top one is built, and the other two
  of the top 3 are written as alternatives in the report.

**4. Build.**

- E's projection gives the surfaces, water, buildings and landmarks.
- E's terrain gives the ridges (for `from-hill`, `panorama`, or any range
  over 2 km).
- F's styles come from the region and era.
- A's cover is `auto`.
- Scatter rules come from the region's kits: `u.kit`-like selection through
  `sceneKitPick` and `SCENE_REGION_KITS`.
- Flows for every road, pavement, towpath and waterway in view, with
  densities by road class: primary 1.2, residential 0.4, footway 0.6,
  canal 0.4.
- Flocks by the kits; `atmos: 'auto'`; `weather: 'live'` unless the brief
  fixes it; `at` from the brief.

**5. Write and render.**

- The recipe file is written (16.1) with `meta` (label and site from the
  OSM names; 6 tags from the brief and the content).
- `scene lint --strict-placement` is run, and the contact sheet is rendered
  (noon, golden, night).
- With `--critic`, `scene critique` (21) runs, and fixes it can apply
  mechanically (21.4) are applied in up to 2 rounds.

**Output.** A DRAFT that already passes the sanity rules and the composition
rules, for a person or an agent to refine in the editor. The composer is
deterministic for a given cache and date. It never uses a model; the critic
is the only model step, and it is optional.

### 20.4 The composition lint (`tools/lib/scene-composition.mjs`, G)

`compositionRules(C, data, { pack, siblings, thresholds })` adds the group
`composition` (wired by D, 15.2):

| rule | default |
|---|---|
| `thirds`, `leadingLine`, `framing`, `skyShare`, `subjectSize` (20.2) | warn |
| `horizonVariety` across the pack | warn |
| `tooSimilar` | warn |

**`tooSimilar`.** For each scene, a composition FINGERPRINT is made from the
compiled scene alone, with no rendering:

- the preset, the horizon row bucket, the heading class;
- the subject's x third;
- a 16 x 9 coverage grid by class group (sky, water, hard ground, soft
  ground, buildings, trees, people and vehicles; from the boxes and surface
  polygons);
- the share of each surface kind.

The similarity is the cosine of the class grids, plus the matches of the
discrete features. If it is over 0.9 with any other scene of the same pack,
`tooSimilar` names that scene and the shared features.

## 21. The visual critic (builder G)

### 21.1 The command

```
scene critique [<ref>,... | --pack <id> | --region <id>] [--times noon,golden,night] [--weather clear] [--ai | --no-ai]
               [--model claude-sonnet-5] [--only-weak] [--strict-placement] [--out dir] [--json] [--calibrate]
```

**1. Render** a contact sheet per scene: the times from `sceneTimesFor` (v1
10), at 800 x 450, through the page harness (10.1). One PNG per scene, 3
panes, plus the 3 single panes.

**2. Measure** the automatic facts:

- the lint (data, bar, sanity, composition);
- perf (with `--perf`);
- the migrate report, if there is one.

**3. Judge** each scene against the rubric
(`tools/lib/anim-templates/scene-critique-rubric.md`, G):

| criterion | 5 means | 1 means |
|---|---|---|
| `placement` | every object stands on the right ground | cars on grass, boats on land, floating things |
| `scale` | sizes are believable and consistent with depth | giants, toys, inconsistent people |
| `clutter` | a clear focus and breathing room | too many salient things competing |
| `lighting` | sun, shadows, haze and night lights all agree | contradictory light, ghosts, too much haze |
| `uniqueness` | unmistakably this place, unlike its siblings | a generic template |
| `realism` | it reads as the real place at that time and season | wrong materials, wrong era, wrong landscape |
| `life` | natural movement fitting the place and the hour | empty or a crowd at 3 am |
| `composition` | thirds, leading lines, framing, a varied horizon | centred, flat, the subject hidden |

Each criterion is scored 1 to 5, with a one-line reason. The rubric gives
examples per score, and the golden set (22) gives the calibration images.

**4. Report.** Only the WEAK scenes: any criterion at 2 or less, or a total
under 30 of 40. Each comes with SPECIFIC fixes:

```json
{ "ref": "...", "scores": { "placement": 2, ... }, "total": 27, "weak": true,
  "fixes": [ { "criterion": "placement", "what": "the red car stands on the verge", "where": { "item": 14, "at": [3.1, 22] },
               "how": { "op": "move", "on": "road", "d": 22 } },
             { "criterion": "lighting", "what": "the far trees look washed out", "how": { "op": "set", "path": "scene.atmos", "value": "clear" } } ] }
```

The report goes to `.anim-ref/critique/<run>/report.json`, versioned
`{ v: 1, run, refs, weak: [...], passed: [refs], calibration? }`. The build
workflows LOOP on it: apply the fixes, run again with `--only` on the weak
refs, and stop when `weak` is empty or after N rounds.

### 21.2 The model run (`lib/claude-runner.mjs`, a new profile `scene-critique`, G)

- **Read-only.**
  - The ONLY allowed tool is `Read`, restricted to the run's image folder
    (`--allowedTools "Read(<dir>/**)"`), started in that folder (copied
    into a temp folder only this user can write, as the other profiles do).
  - `--setting-sources ""`, `--permission-mode dontAsk`, no MCP
    (`--strict-mcp-config` with an empty config), and the profile's
    explicit deny list (Bash, Write, Edit, WebFetch, WebSearch, every
    `mcp__*`).
- **The model allowlist.** `claude-sonnet-5` (the default) and
  `claude-opus-5-5` (from the runner's `MODELS`).
- **Output.** `--json-schema` with the report schema of one scene; a timeout
  of 5 min per scene; queued like every run.
- **The prompt.** A fixed system prompt: the rubric plus "the images are
  renders of data; judge only what you see; answer in the schema". The
  user turn holds the image file names, the scene's facts (lint results,
  real sizes, problems) as DATA, and its golden neighbours (22.3).
- **Tests.** `tests/scene-critic.test.mjs` checks the profile's arguments
  (only `Read`, the folder rule, no MCP, the schema), and a fake run's JSON
  through the report builder.

### 21.3 With no model

When the `claude` CLI is unavailable (`aiStatus()` is false) or with
`--no-ai`, the critic writes a REVIEW PAGE instead:
`.anim-ref/critique/<run>/review.html`.

- It shows the contact sheets, the rubric, the automatic facts and the
  golden neighbours side by side.
- Each scene gets a JSON template (`pending.json`) that a person or an agent
  fills in.
- `scene critique --ingest pending.json` turns a filled template into the
  same `report.json`. The loop works either way.

### 21.4 Fixes the tools can apply

The fix ops are `move` (to a surface and depth), `delete`, `swap` (an object
of the same role), `set` (a scene key: `atmos`, `camera.horizon`,
`weather`), `add-flow` and `density`.

- `scene critique --apply` applies the ops that are unambiguous through
  `scene-recipe.mjs`, and lists the rest for a person.
- Every applied fix is re-linted. A fix that creates a sanity error is
  rolled back.

### 21.5 Calibration

`scene critique --calibrate` runs the critic over the golden set (22).

- Every golden scene must score 4 or more on every criterion.
- A golden scene marked weak means the rubric or the prompt is
  miscalibrated. The run reports the disagreement and exits 2.
- Run it whenever the rubric or the model changes.

## 22. The golden set (builder G)

### 22.1 What it is

About 20 reference pieces (14 scenes and 6 objects) that are EXCELLENT, and
that the user has approved. They calibrate:

- the sanity and composition thresholds (22.3);
- the critic (21.5);
- the "compare to golden" view.

**`tools/scene-golden.json`:**

```json
{ "v": 1,
  "entries": [
    { "ref": "uk-area-yateley/hampshire-yateley-common-1", "kind": "scene", "why": "depth, dense natural cover, light", "approved": false,
      "scores": null, "metrics": null },
    { "object": "person.walker", "kind": "object", "why": "the faceless figure at every size", "approved": false }
  ],
  "calibration": null }
```

### 22.2 The candidates

G proposes them; the user approves.

- **Scenes, from today's GOLD items.** G looks at their sheets and keeps
  the 10 best, at least 4 of them urban:
  - Yateley Common 1 and 4 (the evening);
  - Wyndham's Pool in winter;
  - Yateley Green in spring;
  - Fleet Pond 1, and Fleet Pond 2 in autumn;
  - Basingstoke Canal at Fleet;
  - two each from Winchester, Norwich, Sheffield and the Peaks, chosen for
    being clean in the new sanity lint.
- **The 3 showcase scenes** of section 29, once built.
- **One OSM-composed street**, from the composer.
- **Objects:** `person.walker`, `tree.oak`, a vehicle with front and rear
  views (9.5), `boat.narrowboat`, a generated `victorian-terrace` and one
  landmark.

`approved` is set to true ONLY by the user. G prepares a contact sheet of the
candidates (`scene golden sheet`) and lists them in its report. Until they
are approved, calibration runs but proposes nothing.

### 22.3 Commands (`scene-cmd/golden.mjs`, `scene-cmd/compare-to-golden.mjs`)

```
scene golden list | sheet | measure | calibrate [--apply-to <file>]
scene compare-to-golden <ref> [--n 3] [--out dir]
```

- **`measure`** stores each approved entry's metrics in `metrics`: the
  sanity measures, the composition fingerprint and measures, the bar
  metrics and perf.
- **`calibrate`** proposes thresholds for `composed.sanity` and
  `composition`:
  - for "at most" rules, the golden maximum plus 15 %;
  - for "at least" rules, the minimum minus 15 %.

  It prints a patch. The reviewer applies only TIGHTER values than the
  designed ones (the v1 re-basing rule, v1 15.4), unless a golden scene
  would fail them.
- **`compare-to-golden`** finds the 3 nearest approved scenes by
  composition fingerprint. It prints metric deltas (for example: "haze 0.31
  against golden p90 0.11; people scale 1.4 against golden 0.95 to 1.08;
  clutter 12 against at most 7"), and renders a side-by-side sheet (the
  scene and its neighbours, at noon and at night).

## 23. The scene editor (builder H)

### 23.1 Enabling it (developer and advanced mode)

- The server route file `server/routes/scene-editor.mjs` registers
  `/api/scene-editor/*`. Every route answers 404 (the same as an unknown
  route) unless ALL of these hold:
  - the environment has `OPENDASH_SCENE_EDITOR=1` when the server starts;
  - the repo root has `.git` and `src/app/` (a developer checkout, never a
    packaged release);
  - the request passes the existing guards (Host 421, same-origin 403, JSON
    415, body limit 413), which the router applies to every route.
- `GET /api/scene-editor/status` returns `{ enabled: true, version }`. The
  gallery shows "Edit scene" on composed items only after it answers 200.
- `node serve.mjs --data-dir C:/tmp/v2-h/data --port 4408 --no-open` with
  the environment variable set is the way to run it. `serve.mjs` and
  `server/index.mjs` are NOT edited.

### 23.2 The routes

| route | does |
|---|---|
| `GET /api/scene-editor/recipe?ref=<pack>/<id>` | `{ rec, version, file }` through `readRecipe`. The file comes ONLY from the marker scan of `src/app/71-scene-*-r-*.js`, never from a client path. A v1 scene answers 409 with "not a recipe: run scene migrate <ref> first" |
| `POST /api/scene-editor/recipe` `{ ref, version, rec }` (at most 256 KB) | validates, then `writeRecipe` with `lib/fsutil.mjs`'s atomic write |
| `POST /api/scene-editor/lint` `{ rec }` | the lint result (data, bar, sanity, composition) as JSON, from a cached registry |
| `POST /api/scene-editor/rebuild` | runs `node build.mjs` through the existing `runNodeStep` (`server/lifecycle.mjs`), so a reload shows the saved scene |

**What the save route validates:**

- the shape: only known keys, types and patterns, through
  `sceneRecipeCheck` run in a `vm` registry loaded once (the tool's
  `loadRegistry`);
- the object ids exist;
- the data budget;
- that `ref` matches `rec.pack` and `rec.meta.id`;
- that the version matches (409 when the file changed on disk).

**Logs** carry codes and counts only.

### 23.3 The UI (`78-scene-editor.js`, `76-scene-editor.css`)

The editor opens over the gallery stage, which plays the scene through the
normal host. It adds an overlay `<canvas>` and side panels.

- **The ground grid.** Projected lines every 5 m (near) and 25 m (far),
  using `sceneProject`.
- **Surfaces** are outlined in a colour per kind, with their ids. Water is
  outlined, and the flows' lanes are drawn as arrows.
- **Placements.** Each is a handle at its anchor (a dot plus a footprint
  ellipse), coloured by its problem state (ok, snapped, refused, warning).

**Interaction:**

| action | what happens |
|---|---|
| **move** | Drag a handle. The pointer is unprojected to ground `(x, d)` (`sceneUnproject`). The live snap preview uses `sceneGroundSnap` with the class rule; an invalid drop shows red and is refused. A ghost of the sprite follows during the drag; the real recompile happens on drop. |
| **swap** | Choose another object of the same role, kit and class. |
| **add** | A library palette filtered to the classes valid on the clicked surface: click to place `{ obj, on, d, u }`. |
| **delete** | Delete or Backspace. |
| **nudge** | Arrow keys move 0.25 m (Shift: 1 m). |
| **undo / redo** | Ctrl+Z and Ctrl+Y, a stack of 100. |
| **inspect** | obj, variant, `k`, face, anim on or off, a layer override, seed. |

**Panels:**

- **Camera:** eye, fov, horizon, heading, x0; the preset buttons (20.1);
  the thirds and leading-line overlays (`sceneCompositionOf`).
- **Environment:**
  - a time slider (sun times from the almanac in the browser:
    `almSunTimes`);
  - weather (clear, rain, snow, fog, frost);
  - season (auto, spring, summer, autumn, winter).

  All of these are previews through `sceneHostSet(el, { at, wx, season })`
  (C), and are not saved unless "Save as authored" is pressed for `at`,
  `weather` or `season`.
- **Problems:** `C.problems` live. "Lint" calls the lint route and lists
  the rules, with click-to-select.
- **Credits:** `sceneCredits` (E) under the stage.
- **Save:** a summary of the changes (moved, added, removed, camera), then
  POST. A 409 offers a reload.

**Escaping.** All text from recipes, object ids and server messages is
escaped with `esc()` before `innerHTML`.

The editor is keyboard reachable. Reduced motion holds the stage still while
editing.

### 23.4 The gallery hook (H edits `78-anim-gallery.js`)

- One "Edit scene" button on composed items, only when the status route
  answered 200.
- The credits line under scenes that have any (17.6).

Nothing else in the gallery changes.

## 24. The style normaliser for imported raster objects (builder H)

### 24.1 Context

The raster import (branch `object-import`, merged later; commit `cd4785a`)
adds objects backed by PNG images: `sceneObjDefine({ kind: 'raster',
images, size, anchor, parts, frames })`, with assets in
`assets/objects/<category>/<name>/` (a `meta.json` plus PNGs).

- AI-drawn images come in with foreign palettes, baked-in lighting, black
  outlines, cast shadows and loose anchors.
- They clash with the house look, and with v2's own shading and shadows.

### 24.2 `object normalise` (`tools/lib/style-normalise.mjs`, `tools/lib/object-cmd/normalise.mjs`)

```
object normalise <id>[,...] | --dir assets/objects/<cat>/<name> | --all-raster [--write] [--report] [--palette tools/scene-house-palette.json]
```

These are pure functions over RGBA buffers, so they can be tested on
synthetic images. Decoding and encoding use `pngDecode` and `pngEncode` from
`tools/lib/scene-capture.mjs` until the branch's `tools/lib/png.mjs` lands.

1. **Palette mapping.**
   - k-means in CIELAB (6 to 12 clusters, weighted by alpha).
   - Each cluster maps to the nearest HOUSE colour of its material group
     (`tools/scene-house-palette.json`, H: about 60 colours grouped as
     foliage by season, bark, brick, stone, slate, render, timber, metal,
     glass, water, fabric and paint; extracted from the golden objects and
     the library palettes by `object normalise --build-palette`).
   - The mapping keeps the luminance ORDER and the gradations: each pixel
     moves by its cluster's delta, at 0.6 strength, so texture is kept.
   - Seasonal images map to the same group's seasonal entries.
2. **Shading.**
   - The baked light direction is estimated from the left and right
     luminance means inside the silhouette.
   - If the imbalance is over 12 %, it is flattened back to neutral, so v2's
     rim and shading (7.2) are the only directional light.
   - Strong specular highlights over 0.95 luminance are clamped.
3. **Baked cast shadows are removed.** Dark, low-saturation pixels outside
   the object's body, below its lowest structural row and toward one side
   are cut to alpha 0. The engine draws shadows (6).
4. **Outlines.** Dark edge pixels (over 35 % darker than the interior next
   to them) are recoloured to the cluster's darkest house tone. Outlines
   are thinned to at most 1.5 px at the native size. There are no black
   outlines in the house style.
5. **The alpha fringe.** Matte fringes (white or black halos) are removed
   by colour decontamination of semi-transparent edge pixels.
6. **Checks** (a report; failures with `--strict`):
   - **The anchor:** the lowest opaque row's contact centre (wheels for
     vehicles, the trunk base for trees, the feet for people) against
     `meta.anchor`, within 2 % of the height.
   - **The size:** the aspect and `real` (metres) against the class table
     (4.2), within 25 %.
   - **Padding** at most 4 px.
   - **The background** is fully transparent.
   - **The image** is at most `SCENE_RASTER_BUDGET`.
7. **`--write`** replaces the PNGs after backing up the originals to
   `.anim-ref/normalise-backup/<id>/`, and writes a `normalised: { v: 1,
   palette, deltaE, ops }` block into `meta.json`. **`--report`** prints the
   before and after mean delta E to the house palette, and the checks.

**After the merge.** When `object-import` merges, `object import` runs
normalise automatically (`--no-normalise` to skip). That is the merge
reviewer's one-line hook, not H's.

## 25. Budgets (v2; one table)

Everything in v1 12 still holds. v2 adds or changes these rows:

| what | limit | enforced by |
|---|---|---|
| frame at 1600 x 900 (v2 scenes included) | `drawMs` median at most 8 ms, p95 at most 12 ms; `dynMs` median at most 6 ms (x 1.75 in software raster) | `scene perf`, the showcase acceptance |
| animated draws per frame | at most 300, now including `flowDraws` and `fxDraws` (ripple bands, glints, rings, wakes, mover reflections, actor shadows, headlights, fog banks, puddle rings) | `scene lint` (estimate), `r.stats()` (measured) |
| ripple | at most 90 bands per region and 160 per scene, re-made at 15 Hz | water pass |
| rings | at most 16; puddle rings at most 20 | water and weather passes |
| flow agents | at most 60 visible per scene; at most 120 flow sprites | flow pass, `scene lint` |
| fog banks | at most 4 | weather pass |
| first bake (v2) | at most 300 ms to warn, 600 ms to fail (x 1.75 in software); mirrored placements at most 600 per region | `scene perf` |
| shadow pairs at night | at most 40 lamp-caster pairs | shadow pass |
| auto cover | at most 1,500 placements | compile |
| scene data (a recipe block) | at most 24,000 bytes | `scene lint` |
| projected building | at most 900 shapes | F's test, `scene lint` |
| sprite memory | one scene at most 64 MB at dpr 2 (the flip bit for shaded classes counted) | `scene lint` |
| editor save | at most 256 KB per request | the route |
| OSM fetch | 1 request per run; cache 30 days; never at runtime | `osm-fetch.mjs`, tests |

## 26. Ownership map

Every file has exactly ONE owner this round. If you need a change in a file
you do not own, say so in your report: name the file, the function and the
exact change. Do NOT edit it.

### 26.1 Shared files that nobody edits this round

- **Build and server:** `build.mjs`, `package.json`, `serve.mjs`,
  `server/index.mjs`, `server/router.mjs`, `server/http.mjs`,
  `server/lifecycle.mjs`, `lib/fsutil.mjs`.
- **Animation framework:** `src/app/71-anim-registry.js`,
  `src/app/71-anim-0region.js`, `src/app/71-anim-continuity.js`,
  `src/app/78-anim-wire.js`, `src/app/12-home-w-animday.js`,
  `src/app/71-anim-uk-nature-kit.js` (v2 wraps `K.live`; it never edits
  it), `src/app/71-anim-almanac.js`.
- **Existing scene files:** every `src/app/70-scene-lib-*.js` except the two
  new ones below; every `70-scene-arch-*`, `70-scene-data-*`, `71-scene-*`
  and `72-anim-pack-*` file. Migrations come later (29.4).
- **Tooling:** `tools/anim-pack.mjs`, `tools/anim-reference.json`,
  `tools/lib/anim-quality.mjs`, `tools/lib/anim-render.mjs`,
  `tools/lib/anim-sources.mjs`, `tools/lib/scene-capture.mjs`,
  `tools/lib/scene-times.mjs`, `tools/lib/scene-upgrade.mjs`,
  `tools/lib/scene-briefs.mjs`, `tools/lib/scene-svg.mjs`.
- **Docs and config:** `MODULES.md`, `CHANGELOG.md`, every `docs/**` file
  (this spec: the reviewer corrects it), `.claude/skills/**`, `.gitignore`.

### 26.2 Builder A: ground grid, surfaces, placements, snapping, scatter, cover, recipes (runtime), compile

| file | what |
|---|---|
| `src/app/70-scene-0core.js` (edit) | the v2 branch of `sceneCompile` (12: the stage calls, guarded); `sceneValidate` accepts the v2 keys (deferring to `sceneRecipeCheck`); `sceneItems` superseding and `sceneItemDups()` (14.3); the v1 path untouched |
| `src/app/70-scene-1ground.js` (new) | `SCENE_BANDS_DEFAULT`, `SCENE_SURFACE_KINDS`, `SCENE_PLACE_RULES`, `SCENE_DRIVE_LEFT`; `sceneCamera`, `sceneProject`, `sceneUnproject`, `sceneGroundHeight`, `sceneDepthBand`; `sceneSurfacesCompile`, `sceneSurfaceAt`, `sceneSurfaceNearest`, `sceneSurfaceKinds`; `sceneWaterCompile` (the geometry, 5.2: canals, banks, `rowAt`, edges); terrain ridges to ground fills (18.3); `sceneObjClass`, `scenePlaceResolve`, `sceneGroundSnap`, view choice (4.3), the care cap; `sceneActorAtV2`; `sceneDepthOrder` |
| `src/app/70-scene-1real.js` (new) | `SCENE_REAL_SIZE` for the whole library, `sceneObjReal` |
| `src/app/70-scene-1scatter.js` (new) | `sceneScatterV2` (on, avoid, dist, Poisson disk, clusters, footprints, species), `sceneCoverAuto` (10) |
| `src/app/70-scene-1recipe.js` (new) | `sceneAddRecipe`, `sceneFromRecipe`, `sceneRecipeCheck` (16.1) |
| `src/app/70-scene-lib-ground-cover.js` (new) | `ground.leaf-litter`, `ground.petals`, `plant.daisies`, `plant.grass-long` (10), unless equivalents already exist |
| `tools/scene-v1-hashes.mjs` (new) | writes the v1 compile hashes (14.1) |
| `tests/fixtures/scene-compiled-v1-hashes.json` (new) | made FIRST, from the untouched HEAD |
| `tests/scene-ground.test.mjs`, `tests/scene-scatter.test.mjs`, `tests/scene-recipe-core.test.mjs`, `tests/scene-compat.test.mjs` (new) | 27.1 |

### 26.3 Builder B: the pass registry, the water and shadow renderers, renderer hooks, the SVG still

| file | what |
|---|---|
| `src/app/78-scene-0pass.js` (new) | `sceneRenderPassDefine`, `sceneRenderPasses`, the `env` contract (13.1) |
| `src/app/78-scene-canvas.js` (edit) | the hooks of 13.2 only; v1 paths untouched |
| `src/app/78-scene-water.js` (new) | the water pass (5.3, 5.4), with helpers for D (`sceneWaterMoverReflect`, the wake and ring sprites) |
| `src/app/78-scene-shadow.js` (new) | the shadow pass (6), with helpers for D (`sceneShadowBlob`, `sceneShadowProjected`) |
| `src/app/70-scene-svg.js` (edit) | the v2 still (13.4); `sceneLightKey` with the pass keys for v2 only; `sceneFrameDraws` with `flowDraws` and `fxDraws` |
| `tools/lib/scene-page.mjs` (edit) | include every `78-scene-*.js` in name order; the options `wx`, `fx` and `governor: false` |
| `src/styles/76-scene.css` (edit, only if needed) | |
| `tests/scene-water.test.mjs`, `tests/scene-shadow.test.mjs`, `tests/scene-render-v2.test.mjs` (new) | 27.2 |

### 26.4 Builder C: atmosphere, light, night sources, weather, live-sky hooks

| file | what |
|---|---|
| `src/app/70-scene-1atmos.js` (new) | `SCENE_ATMOS`, `sceneHazeAt`, `sceneAtmosCompile`, `SCENE_LIGHT_SOURCES`, `sceneLightsOf`, `sceneLiftAt`, `SCENE_WINDOW_SHARE`, `sceneLightV2` (7.5) |
| `src/app/70-scene-1weather.js` (new) | `sceneWeather`, `sceneWeatherCompile`, `SCENE_SNOW_CLIMATE`, `sceneSnowCover`, the frost rule, `scenePuddles` (seeded) |
| `src/app/78-scene-atmos.js` (new) | the atmos pass: sprite shading and rim (7.2), depth veil, pools, spill, halos (7.3), fog banks (8.4), `sceneHeadlightSprite` for D |
| `src/app/78-scene-weather.js` (new) | the weather pass: wet sheen and streaks, puddles (handed to the water pass), snow cover and caps, frost, v2 rain and snow, puddle rings, lightning |
| `src/app/78-scene-host.js` (edit) | `sceneLightV2` for v2 scenes; `sceneHostSet(el, { at, wx, season })`; `?scenefx=2` (14.2); `data-sc-wx` |
| `tests/scene-atmos.test.mjs`, `tests/scene-weather.test.mjs` (new) | 27.3 |

### 26.5 Builder D: crowds and traffic, placement sanity, recipes (Node), the tool

| file | what |
|---|---|
| `src/app/70-scene-1flow.js` (new) | `SCENE_FLOW_PROFILES`, `sceneFlowCompile`, `sceneFlowAt`, `sceneFlowCount`, the schedules (9.3) |
| `src/app/78-scene-flow.js` (new) | the flow pass (9.4) |
| `src/app/70-scene-lib-vehicles-views.js` (new) | front and rear views (9.5) |
| `tools/lib/scene-sanity.mjs` (new) | `sanityRules`, `SLOT_KINDS`, the v1 inference (15.1) |
| `tools/lib/scene-lint.mjs` (edit) | the wiring of 15.2 |
| `tools/lib/scene-recipe.mjs` (new) | 16.1 (Node) |
| `tools/lib/anim-cmd/scene.mjs` (edit) | 16.2 delegation; 16.3 (`new` v2; `--weather`, `--fx`, `--strict-placement`, `--flows`) |
| `tools/lib/scene-cmd/migrate.mjs` (new) | 16.4 |
| `tools/anim-quality.json` (edit) | `composed.sanity`, `composed.flows`, `composed.fx` (designed) |
| `tests/scene-flow.test.mjs`, `tests/scene-sanity.test.mjs`, `tests/scene-recipe.test.mjs`, `tests/scene-migrate.test.mjs` (new) | 27.4 |

### 26.6 Builder E: the OSM layout and terrain import tool

| file | what |
|---|---|
| `tools/lib/geo.mjs` (new) | ENU, WGS84 to OSGB36 and BNG, haversine |
| `tools/lib/osm-fetch.mjs` (new) | Overpass and Nominatim, the cache, etiquette (17.2) |
| `tools/lib/osm-tags.mjs` (new) | the classification, widths, styles, `SCENE_OSM_OBJECTS`, the generic shop words (17.3 to 17.5) |
| `tools/lib/osm-project.mjs` (new) | the projection, clipping, buffering, simplification, sections (17.3) |
| `tools/lib/terrain.mjs` (new) | the sources, rays, ridges, relief (18) |
| `tools/lib/scene-cmd/osm.mjs`, `tools/lib/scene-cmd/terrain.mjs` (new) | the commands |
| `src/app/70-scene-1credit.js` (new) | `sceneCredits`, the credit table (17.6, 18.4) |
| `src/app/57-settings.js` (edit) | ONE About row (17.6) |
| `THIRD_PARTY_NOTICES.md` (edit) | the ODbL and terrain notices (verbatim sources) |
| `tests/geo.test.mjs`, `tests/osm-project.test.mjs`, `tests/terrain.test.mjs` (new); `tests/fixtures/osm-sample.json`, `tests/fixtures/terrarium-sample.png` (new, SYNTHETIC: hand-made, not copied from OSM) | 27.5 |

### 26.7 Builder F: the procedural building and street generator

| file | what |
|---|---|
| `src/app/70-scene-gen-0building.js` (new) | `SCENE_GEN_UPM`, `sceneBuildingStyleDefine`, `sceneBuildingStyles`, `sceneBuildingObject`, `sceneBuildingProject`, `sceneBuildingShadow`, `sceneStreetExpand`, `sceneGenExpand` |
| `src/app/70-scene-gen-style-victorian-terrace.js`, `-georgian.js`, `-edwardian.js`, `-semi-1930s.js`, `-interwar-shops.js`, `-mill.js`, `-norfolk-flint.js`, `-stone-cottage.js`, `-modern-glass.js`, `-brutalist.js`, `-station.js` (new) | the 11 styles (19.3) |
| `tools/lib/scene-cmd/street.mjs`, `tools/lib/scene-cmd/building.mjs` (new) | the previews (19.4) |
| `tests/scene-gen-building.test.mjs` (new) | 27.6 |

### 26.8 Builder G: camera presets, the auto-composer, the composition lint, the critic, the golden set

| file | what |
|---|---|
| `src/app/70-scene-1camera.js` (new) | `SCENE_CAMERA_PRESETS`, `sceneCameraPreset`, `sceneCompositionOf` |
| `tools/lib/scene-composition.mjs` (new) | `compositionRules`, the fingerprint, the similarity (20.4) |
| `tools/lib/scene-compose.mjs` (new) | the brief parser, the viewpoint search, the pipeline (20.3) |
| `tools/lib/scene-critic.mjs` (new) | sheets, facts, the runner call, the review page, ingest, apply, calibrate (21) |
| `tools/lib/anim-templates/scene-critique-rubric.md` (new) | the rubric (21.1) |
| `tools/lib/scene-cmd/compose.mjs`, `critique.mjs`, `golden.mjs`, `compare-to-golden.mjs` (new) | the commands |
| `tools/scene-golden.json` (new) | the golden set (22) |
| `lib/claude-runner.mjs` (edit) | the `scene-critique` profile ONLY (21.2): its block, its timeout, its header comment line |
| `tests/scene-composition.test.mjs`, `tests/scene-compose.test.mjs`, `tests/scene-critic.test.mjs` (new) | 27.7 |

### 26.9 Builder H: the gallery scene editor and the style normaliser

| file | what |
|---|---|
| `src/app/78-scene-editor.js` (new) | the editor (23.3) |
| `src/styles/76-scene-editor.css` (new) | its styles |
| `src/app/78-anim-gallery.js` (edit) | the "Edit scene" hook and the credit line (23.4) |
| `server/routes/scene-editor.mjs` (new) | the routes (23.1, 23.2) |
| `tools/lib/style-normalise.mjs` (new) | 24.2 |
| `tools/lib/object-cmd/normalise.mjs` (new) | the command |
| `tools/lib/anim-cmd/object.mjs` (edit) | the `object <sub>` delegation only |
| `tools/scene-house-palette.json` (new) | the house palette |
| `tests/scene-editor.test.mjs`, `tests/style-normalise.test.mjs` (new) | 27.8 |

### 26.10 Who calls whom (code against these; guard with `typeof` or a dynamic import)

| caller | callee |
|---|---|
| A compile | F `sceneGenExpand`, `sceneStreetExpand`; D `sceneFlowCompile`; C `sceneAtmosCompile`, `sceneWeatherCompile`, `sceneLightsOf`, `sceneHazeAt` (surface gradients); G nothing |
| B canvas and passes | A `sceneProject`, `sceneUnproject`; C `sceneLightV2` fields (`sunG`, `sunTan`, `localHour`), `sceneLiftAt`, `SCENE_WINDOW_SHARE`; F `sceneBuildingShadow` |
| C passes | B's `env` (13.1) and the water pass's `waterExtra` (puddles); A `sceneSurfaceAt` (puddle placement) |
| D flow pass | B `sceneShadowBlob`, `sceneShadowProjected`, `sceneWaterMoverReflect`; C `sceneHeadlightSprite`; A `sceneProject` |
| D lint | G `compositionRules` (dynamic import) |
| E, F, G tools | D `scene-recipe.mjs` (`newRecipeFile`, `writeRecipe`) |
| G composer | E `osmFetch`, `osmProject`, `terrainSample`; F style names; A presets through `sceneCompile` |
| H editor | A `sceneUnproject`, `sceneGroundSnap`, `sceneSurfaceAt`; G `sceneCameraPreset`, `sceneCompositionOf`; C `sceneHostSet`; E `sceneCredits`; D `scene-recipe.mjs` and `lintScene` (server side) |

Until a callee lands, the caller degrades. Without F, buildings are skipped
with an info problem. Without C, there is no haze or lift. Without D, there
are no flows. Each builder's tests include a "callee absent" case.

### 26.11 Time boxes and cut lists

Each builder has about 3 hours. A, B, D and F have the largest shares. Cut in
this order, and say so in the report:

| builder | cut list |
|---|---|
| A | relief (2.4) to a flat ground; `q` views; species auto-fill; cluster process to plain Poisson |
| B | sea surf rows; moon shadows; lamp shadows; the governor; the SVG reflections (keep v1's) |
| C | thunder; fog banks to a static veil; window spill; the frost sprite pass (keep the ground frost) |
| D | front and back walkers; bus stops' dwell; `graze` flows; `scene sheet --flows` |
| E | `os50` (keep terrarium); `--place` geocoding; near relief |
| F | `corner` buildings; `butterfly` and `mansard` roofs; the street gaps; ivy |
| G | `--apply` fixes; `--calibrate`; candidate alternatives in the report |
| H | undo and redo beyond 20; the lint route; the normaliser's outline thinning |

## 27. Test plans

All tests are `node:test`, have no network, and use fixtures and inline
objects (`sceneObjDefine` in the test) where the library is not needed.
Chrome tests skip when `findBrowser()` is null, and use your own debug port.

### 27.1 A

- **Projection.**
  - Round trips (`sceneUnproject(sceneProject(x, d))` within 1e-6).
  - `dMin`, and the 2.2 worked numbers.
  - Relief: Newton converges on a slope of 1:5.
  - View sync: the camera wins, and the problem is recorded.
- **Surfaces.**
  - A strip's span at a depth is the right width.
  - `beside` offsets and `rest` coverage (no hole: every sampled frame
    point below the horizon is on some surface).
  - Paint order and lookup (the last wins).
  - Markings are dashed at 3 m and 6 m in perspective.
- **Placements.**
  - All 4.1 forms resolve correctly.
  - The scale follows `real.h`.
  - A car on grass snaps to the lane centre within 3 m, and is refused
    beyond.
  - A boat stays inside the inset.
  - A landmark is never moved.
  - The care cap pushes a near person back.
  - The view choice follows the angle (side, front, rear).
  - A pixel placement is checked, not moved.
- **Draw order.** A walker in front of a long terrace is drawn after it;
  one behind a building is drawn before it. Cycles fall back to `z`.
- **Scatter.**
  - Nothing lands on avoided surfaces; footprints never overlap.
  - Poisson-disk passes the variety `grid` rule.
  - Clusters show (a nearest-neighbour index under 0.8).
  - Determinism, and the LOD keeps a seeded share.
- **Cover.** Autumn leaves appear only on leaf-holding surfaces, denser
  under deciduous crowns; none in summer; at most 1,500.
- **Recipe.** `sceneAddRecipe` makes an item that passes `animValidatePack`.
  Superseding works (the recipe wins, the pair is listed). `sceneRecipeCheck`
  catches bad ids, kinds and references.
- **Compat.** Every hash in `scene-compiled-v1-hashes.json` matches.
- **Real sizes.** Every library object resolves; a `def` value beats the
  table, and the table beats the class.

### 27.2 B

- **The pass registry.** Order by stage, `applies`, and that no pass runs on
  a v1 compiled scene.
- **Water (Node, pure helpers):**
  - the flip row `Yw(d)` maths;
  - band count and heights;
  - Fresnel alpha monotone from near to far;
  - the canal's mask excludes a same-group reed in front;
  - the glint column at `L.sun.x`, or at the moon when the sun is down.
- **Shadows (Node):**
  - the shear matrix maps the sprite top to the projected tip for 3 sun
    positions;
  - lengths at alt 5, 30 and 60 against `1 / tan`;
  - overcast and night opacities as in the table;
  - contact shadows present at night.
- **Chrome:**
  - a v2 fixture scene (inline objects) renders non-blank;
  - a still equals the frame at t = 0;
  - ripple frames differ over t while the masked near-bank object's pixels
    do not;
  - shadows point away from the sun (the centroid of dark pixels relative
    to the foot);
  - `r.stats().passes` reports draws;
  - v1 pixel identity on the 8 samples (14.1);
  - `drawMs` and `dynMs` within budget on the fixture at 1600 x 900.
- **SVG still.** Deterministic; v1 markup unchanged; v2 markup has the
  shadow filter group and stays within 1 MB and 150 KB.

### 27.3 C

- **`sceneHazeAt`.** The values in 7.1; monotone in `d`; weather overrides.
- **`sceneLightV2`.** `sunG` against the sun's azimuth for headings 0, 90
  and 200; `localHour` from the longitude; `L` otherwise equal to
  `sceneLight`.
- **Lights.** `sceneLightsOf` finds lamps, glow lamps and shop spill; the
  lift buckets.
- **`sceneWeather`.** Every kind maps; live `wx` overrides; temperature
  decay of snow; frost conditions.
- **`sceneSnowCover`.** Deterministic per date and place; neighbours agree;
  southern winter in July; the tropics give 0.
- **Puddles.** Only on hard and path kinds, within 60 m; seeded.
- **Chrome (the fixture).**
  - Rain darkens hard surfaces and adds streaks under lamps.
  - Snow whitens roofs (the top-edge pixels) and the grass.
  - A night frame has pools brighter than the surrounding ground.
  - The rim appears on the sun's side only, with the flip handled.
  - Fog banks drift.
  - The v1 scene is unchanged with `?scenefx` off.

### 27.4 D

- **Flows.**
  - `sceneFlowAt` is a pure function of `t`.
  - No two vehicles in one lane closer than the headway, at 200 sampled
    times.
  - Keep-left lanes travel the right way; buses dwell at stops.
  - Profiles: the 8 h peak is above 13 h, and 3 h is near 0.
  - Rain halves the walkers.
  - The `t = 0` still is populated.
  - At most 60 agents; the draw estimate is within 10 % of the measured
    draws (Chrome).
- **Sanity.**
  - On crafted v1 scenes: a car on `@lawn` gives `vehicleSurface`; a tree in
    the sky gives `floating`; a person twice its neighbour gives
    `scalePairs`; haze 0.6 in `near` gives `ghost` and `haze`; 5 stamped
    benches give `stamp`; 12 salient objects in one window give `clutter`; a
    landmark 40 % behind trees gives `landmarkOccluded`.
  - Each comes with its fix line.
  - `--strict-placement` turns warnings into failures.
  - A v2 scene's `refused` problem gives an error.
- **Recipes.** Format round trips are byte-stable; `writeRecipe` refuses a
  stale version; only the block changes; `findRecipes` ignores other files.
- **Migrate.**
  - On 3 real v1 scenes (`--dry-run`): every placement is converted or
    pinned; the compile of the migrated recipe reproduces each converted
    placement's screen x and y within 1.5 units and its scale within 3 %
    (`k` keeps the look).
  - The report lists every defect the sanity lint finds.
  - It writes nothing on `--dry-run`.
- **CLI.**
  - `scene new --preset street` writes a recipe that lints.
  - The delegation loads a dummy `scene-cmd` module in a temp `commandsDir`.
  - `scene lint --strict-placement --json`.

### 27.5 E

- **`geo.mjs`.** ENU round trips; BNG control points within 5 m.
- **`osm-project.mjs`** on the synthetic fixture (a crossroads, a canal with
  a towpath, a park, a terrace of 6 footprints, a church, a tram line):
  - the kinds, widths and `beside` pavements are right;
  - the canal has a towpath;
  - frustum clipping works;
  - the simplification tolerance grows with depth;
  - the budget is respected;
  - re-import with `--into` keeps hand entries;
  - no `name`, `brand` or `operator` text reaches any sign;
  - the styles are guessed from `start_date` and material;
  - landmarks are matched or listed as missing.
- **Fetch.** An injected `fetch`: one request; the cache hit on the second
  run; `--offline` refuses; a 429 retries once.
- **`terrain.mjs`.**
  - A synthetic terrarium tile decodes to the right heights.
  - Ridge extraction over a synthetic cone gives one silhouette at the
    expected rows.
  - The curvature drop at 20 km is about 27.3 m.
- **Credits.** `sceneCredits` lists OSM and terrain from `source`. The About
  row renders (a DOM-less string test of the markup).

### 27.6 F

- **Determinism.** Every style builds deterministically for 3 seeds and 4
  seasons. Seeds differ (door colour, lit pattern, chimney count).
- **Object lint.** Elevation objects pass `object lint`, including the glow
  rule.
- **Projection.**
  - A rectangular footprint at 30 degrees shows exactly two walls.
  - Windows lie on their wall planes: their projected corners stay inside
    the projected wall quad.
  - The detail tiers switch at the 6, 14 and 30 thresholds.
  - At most 900 shapes.
- **Shadow.** `sceneBuildingShadow` lengthens as the sun lowers, and points
  along `sunG`.
- **Streets.** Expansion fills `from` to `to` without overlap; runs of a
  style; gaps at about the rate.
- **Signs and night.** No sign text without `signage: true`; generic words
  only. At night, lit windows follow the share.
- **Snow.** `snowParts` appear at `snowDepth > 0`.

### 27.7 G

- **Presets.** Each preset compiles a fixture scene within its composition
  targets.
- **Composition rules.** On crafted scenes: centred fails `thirds`; a
  missing leading line is flagged; sky share out of range is flagged.
- **Fingerprints.** Two near-identical scenes are `tooSimilar`; two
  different ones are not.
- **The brief parser.** On 20 briefs: places, moments, presets, weather,
  seasons, subjects, and the list of unknown words.
- **The viewpoint search.** On the E fixture: picks a candidate with the
  subject visible and on a third; deterministic.
- **The critic.**
  - The runner arguments for `scene-critique` (only `Read`, the folder rule,
    no MCP, the schema, the model allowlist).
  - A fake run gives the report; only weak scenes are listed.
  - `--no-ai` writes the review page and `pending.json`; `--ingest`
    round-trips it.
  - `--apply` applies a `move` and rolls back a fix that creates a sanity
    error.
- **Golden.** `scene-golden.json` parses; calibrate proposes nothing while
  nothing is approved; `compare-to-golden` ranks by fingerprint.

### 27.8 H

- **The route** (a temp copy root and an in-process server, as
  `tests/anim-make.test.mjs` does):
  - disabled: every path gives 404; enabled without `.git`: 404;
  - cross-origin POST: 403; wrong content type: 415; too big: 413;
  - a ref with `..` or a path: 400, and the file comes only from the scan;
  - a stale version: 409;
  - an unknown key or object id: 422;
  - a good save changes only the block, atomically;
  - the lint route returns rules.
- **The UI** (Chrome, port 4408, test data from `make-test-data.mjs`):
  - open a recipe scene; drag a car onto grass (refused, red); drag it onto
    the road (snapped);
  - swap, add from the palette, delete, undo;
  - change the eye height; preview the weather and the time;
  - save, then reload: the change persists;
  - no console errors;
  - all text escaped (an object id with `<` in a crafted recipe is
    refused by the validator anyway).
- **The normaliser** (synthetic RGBA):
  - a foreign green maps to the house foliage green with the luminance
    order kept;
  - a strong left-lit gradient is flattened;
  - a baked shadow blob below the base is removed;
  - a 3 px black outline is recoloured and thinned;
  - a white matte fringe is cleaned;
  - an anchor off by 10 % is reported;
  - `--write` backs up and annotates `meta.json` (in a temp dir).

## 28. The integration review (after the builders)

1. **Build.** `node build.mjs --syntax`, then `node build.mjs --out
   C:/tmp/v2-review/index.html`. Check there is no "before initialization"
   error in Node (`tests/anim-packs.test.mjs` loads every animation file) or
   in the browser.
2. **Tests.** Run `npm test` four times; every run passes. Run the new suite
   files alone, in a loop of 5.
3. **Compat.**
   - `tests/scene-compat.test.mjs` passes.
   - B's 8-scene pixel identity passes.
   - `node tools/anim-pack.mjs scene lint --pack <each composed pack>` gives
     the same GOLD count as before, plus the new sanity warnings.
   - Record the sanity warnings per pack in the review report: that is the
     migration worklist.
4. **Engine.** In the gallery (port 4401, test data), open the 3 showcase
   scenes (29) at noon, golden hour, night, and in rain, snow and fog
   (`sceneHostSet` from the console). Check:
   - the reflections ripple, and objects in front of the water stay crisp;
   - the shadows follow the real sun;
   - the lamp pools appear at dusk, and the windows go dark late at night;
   - the trams run, and the crowds thin at night;
   - no console errors.
5. **Perf.**
   - `scene perf` on the 3 showcases in software raster and with `--gpu`.
     Record `drawMs`, `dynMs`, `firstBakeMs` and the pass breakdown.
   - Correct `swFactor` if the measured ratio is more than 20 % off (v1 14).
   - Run `--rebake` (a light change) with no frame over 16 ms.
6. **Tools.**
   - `scene osm` and `scene terrain` with the network ON, for the 3
     showcase viewpoints. The caches fill and the credits appear.
   - `scene compose` on two briefs.
   - `scene critique --pack v2-demo`, with the CLI if available, else the
     review page.
   - `scene migrate --pack uk-area-woking-b --dry-run --report`.
   - `object normalise` on the object-import demo assets, copied to a temp
     folder from `git show object-import:<path>`.
7. **Privacy.** Run `node tools/privacy-scan.mjs`, and grep the diff for
   personal data. Recipes hold public places only, and no OSM names in
   drawn text.
8. **Docs.**
   - Correct this spec where the build deviated, and say so in the commit.
   - `MODULES.md` rows for every new file.
   - `docs/dev/ANIMATION_PACKS.md` and the skill: a "v2 recipes" section
     pointing here (the workflow becomes compose or new, then osm, then
     edit, then lint `--strict-placement`, then critique, then
     compare-to-golden).
   - `THIRD_PARTY_NOTICES.md` (checked).
   - `CHANGELOG` (Unreleased).

## 29. The showcase stage (the demo plan)

After the review, three showcase builders (S1, S2, S3) each build ONE scene
with the v2 tools, as an author would:

- they start from `scene compose` or `scene new --osm`;
- they refine in the editor or by hand;
- they fix the friction they meet in the tools, reporting it, and editing
  only with the owner's file list in hand (the reviewer assigns).

| | port | Chrome debug port | temp dir |
|---|---|---|---|
| S1 | 4411 | 9351 | `C:/tmp/v2-s1` |
| S2 | 4412 | 9352 | `C:/tmp/v2-s2` |
| S3 | 4413 | 9353 | `C:/tmp/v2-s3` |

**The files.** Each builder writes its own recipe file,
`src/app/71-v2-demo-r-<id>.js`. S1 also writes
`src/app/72-anim-pack-v2-demo.js` (`animRegisterPack({ id: 'v2-demo', name:
'Scene engine v2 showcase', items: sceneItems('v2-demo').map(it =>
Object.assign(it, { when: () => false })) })`). The items are gallery only,
never in rotation, and tagged `demo`.

### 29.1 S1: a canal in perspective (Castlefield Basin, Manchester; the Bridgewater Canal)

- **The view.** The `down-street` preset along the canal.
  - The canal is a channel in perspective, receding to the left third.
  - The towpath is on one side, with walkers, cyclists and a dog walker
    (flows).
  - Narrowboats are moored along the edge, and one is moving with a wake.
  - Ducks with rings; a heron as an actor.
  - Red-brick warehouses come from F's `mill` style on OSM footprints.
  - The railway viaducts come from the Manchester area library objects
    where they exist, or are listed as missing.
- **The moment.** Late afternoon to golden hour.
- **What to see.** Reflections of the viaducts and warehouses rippling,
  long shadows across the towpath, coping stones, and lamp pools on the
  towpath at dusk.
- **The OSM import** gives the basin's real shape and the towpath.

### 29.2 S2: a city square with trams, crowds, rain and night lights (Old Market Square, Nottingham)

- **The view.** `street` or `raised` (the first-floor view), toward the
  Council House dome. The dome is the landmark on a third: the Nottingham
  area library's object, if there is one, else F's `georgian` or `station`
  style as a stand-in, marked to be replaced.
- **What moves.**
  - Trams cross along the tram line (verify the line in the OSM import; if
    it does not cross the chosen view, the reviewer switches to St Peter's
    Square, Manchester, with the Central Library as the landmark).
  - Crowds by the hour: walkers, with umbrellas in rain.
  - Buses on the road edge.
- **The sheets** (`--weather rain`, `--weather clear` and `snow`):
  - the wet setts mirror the lamps, the lit tram windows and the shopfronts;
  - puddles with rain rings;
  - lamp pools, and window spill from the lit ground floors;
  - headlights;
  - at 23 h the square thins and the windows go dark.

### 29.3 S3: a heath at golden hour, with long shadows and a pond (Frensham Common and the Great Pond, Surrey)

- **The view.** `across-water` or `from-hill` from the common's sandy ridge,
  across the pond.
  - Heather, gorse and birch clusters (smart scatter); sandy paths.
  - The pond with its sandy beach edge.
  - Sailing dinghies on the water (boats flow, daylight and summer
    weighted); ducks; walkers and dog walkers on the paths; a few swans.
  - Terrain ridges behind, from E's terrain tool, hazed in layers.
- **The heading** is chosen so that at golden hour in October the sun is 50
  to 110 degrees to one side. The shadows of birches, gorse and walkers
  then run long across the heath, and the glitter road lies on the pond.
- **The seasons.** Autumn cover (bracken browns, leaf litter under the
  birches); in winter, the occasional seeded frost morning and snow day.

### 29.4 Acceptance (for each showcase)

- `scene lint <ref> --strict-placement --perf` prints `GOLD v2`, with zero
  sanity or composition warnings.
- `scene perf` meets section 25 in software raster AND with `--gpu`, and the
  numbers are recorded.
- `scene critique <ref>` (the model if available, else a filled review page)
  gives no criterion under 4.
- `scene compare-to-golden <ref>` reports no metric outside the golden range,
  once the golden set has approved entries.
- These sheets are SHOWN to the user, in `C:/tmp/v2-showcase/`:
  - `scene sheet <ref> --times --seasons --contact`;
  - `--weather rain,snow,fog,clear`;
  - `--flows`;
  - a 3 s `scene capture` GIF.
- The three scenes go into `tools/scene-golden.json` as candidates; the user
  approves them.

**Later stages** (not this round):

1. **Migrate the packs.** `scene migrate --pack <id>` per pack, fixing what
   the sanity report lists, and re-linting with `--strict-placement` until
   GOLD v2. Order: the packs with the most sanity errors first; the
   batch-2 WIP packs (commit `6dbf24f`) before any new art.
2. **Rebuild the area packs with the composer** where a migration is not
   worth it.
3. **Merge `object-import`.** Expect conflicts in `70-scene-0core.js`,
   `70-scene-svg.js`, `78-scene-canvas.js` and `78-scene-host.js` (the
   raster paths): the merge reviewer resolves them against 13.2's hooks.
   Then run `object import` with normalise on.

## 30. Risks and open questions

- **External services.** Overpass, Nominatim and the terrain tiles are
  external and can be slow, rate-limited or gone. The tools cache
  aggressively, work offline from the cache, and fail with a clear message.
  The app never depends on them.
- **ODbL.** Recipes with OSM geometry are derived data under the ODbL (17.6).
  If the user prefers the repository to hold NO ODbL data, the alternative
  is to keep OSM-derived recipes generated locally and git-ignored. That
  defeats sharing, so this spec chooses attribution plus the ODbL notice.
  The reviewer confirms this with the user before the first OSM recipe is
  committed.
- **Canvas `filter`.** Blur is missing in some browsers. The multi-draw
  fallback (6.2) covers the bake; nothing per frame depends on it.
- **First-bake time** grows with reflections, silhouettes and sprite passes.
  The cut levers are listed in 13.3, and perf is measured on all three
  showcases.
- **Memory.** The flip bit doubles the shaded sprites, bounded by the 64 MB
  per-scene budget. The lint estimates it, and the governor never touches
  the bake.
- **Local time.** It comes from the longitude (solar time). It can be an
  hour off in summer time, which is acceptable for crowds and windows. Using
  the IANA zone of the place is a later refinement.
- **Library gaps.** Front and rear views, church and station landmarks per
  town, and lock gates are not covered yet. The composer and the import LIST
  what is missing rather than faking it. Those lists are the object backlog.
- **The sanity warnings on v1 packs** will be many. That is intended: it is
  the fix list, not a regression. GOLD for v1 is kept until the strict flag
  is turned on per pack after its migration.
