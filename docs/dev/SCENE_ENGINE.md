# Scene engine: object library, composed scenes, canvas renderer, tools

Status: SPEC, revision 2 (7 Oct 2026), the contract for the first build round,
on the `scene-engine` branch after the merge of the region framework and the
animation-pack tooling. Revision 2 adds the NEW QUALITY STANDARD (section 15),
the UPGRADE PATH for the hand-drawn region scenes (section 16), the region
object kits (2.7), the region archetypes (8.5) and the convert stage with its
pilot (section 17). Three builders (A, B, C) implement it in parallel; each
part should take about two hours (each builder has a cut list in section 13
for anything that overruns). The section numbers below are referenced by the
builders' briefs and by the integration review.

Read first: `CLAUDE.md`, `MODULES.md` (Animation library rows),
`docs/dev/ANIMATION_PACKS.md` (Regions, the quality gate, `scene-rich`),
`docs/dev/UK_PACK.md` ("Rich local scenes") and the header of
`src/app/71-anim-uk-nature-kit.js` (the kit and the `K.live` light model).

> **Engine v2 is the default for new scenes (8 Oct 2026).** This document
> stays the reference for the object format, the v1 scene format, the
> compiled form, the light model, the renderers and the standard; everything
> below still holds for v1 scenes, which compile byte for byte as before.
> A NEW scene is a v2 recipe: `docs/dev/SCENE_ENGINE_V2.md`. Authors declare
> the ground (a camera, surfaces, water, ground placements in metres, flows,
> buildings) and the engine decides the screen position, scale, draw order,
> shadows, reflections, light, weather and crowds, refusing what is
> physically wrong. The workflow: `scene compose "<brief>"` (or `scene new`,
> which writes a v2 recipe unless `--v1`), `scene osm` and `scene terrain`
> for the real layout and skyline, refine in the scene editor or by hand,
> `scene lint --perf --strict-placement` to GOLD, `scene sheet --times
> --weather rain,snow,fog`, `scene critique`, `scene compare-to-golden`.
> `scene migrate` turns a v1 scene into a recipe and lists its defects (the
> worklist; review its sheet before keeping it). Section 31 of V2 has the
> integration notes: what the build changed against that spec.

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

**The new quality standard (section 15).** The rich Yateley and Fleet scenes
are now THE BAR. Every scene must reach it and still run fast:

- The gold-standard reference (`tools/anim-reference.json`) and the lint
  calibration (`tools/anim-quality.json`) are re-based on the rich and
  composed Yateley and Fleet scenes. The `composed` profile measures depth
  layers, dense ground cover, independent moving actors, a signature or
  landmark object, the live sky and seasons, placement variety, lighting
  (sun, shadows, reflections, lit windows) and performance.
- Every other profile's floors stay, but only as the LEGACY tier. `status`
  flags legacy scenes as "below the new standard".
- **The performance principle.** Static objects are baked into layer
  bitmaps, so thousands of static placements cost nothing per frame. Only
  ANIMATED sprites and effects cost per frame. Their budget is at most 300
  animated sprites and at most 6 ms of dynamic drawing per frame (8 ms for
  the whole frame). The lint measures both.
- **The upgrade path (section 16).** The ~220 hand-drawn US, Asia, Texas and
  world scenes reach the bar without being redrawn from scratch:
  - their landmark is extracted into a refined library object;
  - the scene is recomposed around it from one of about 13 ARCHETYPES (8.5);
  - region object kits (2.7) fill it in;
  - its id, key, place fields and caption are kept, so rotation and pins keep
    working.

Delivered this round:

1. The object format and library, including the nature kit's objects through
   an adapter. A starter set of nature and urban objects, and the plan of
   the region object kits (2.7).
2. The scene format, a deterministic compiler, and scene items in the
   registry.
3. The Canvas 2D renderer with its host integration (opening, animation of
   the day, gallery), plus the SVG fallback renderer.
4. The tool commands `object ...` and `scene ...` (with batch lint, perf
   and sheet over data tables), the lint profile `composed` (performance
   and placement variety). Briefs and the skill follow from the reviewer
   (10.3).
5. The retrofit path that gives the existing hand-drawn region scenes (US,
   Asia and every region added since) the live sky, seasons and weather,
   without redrawing them.
6. Archetypes (with the generic `basic` one), data tables, batch
   generation and a safe signage exception. A demo: one `station` archetype
   instantiated from a 3-row table, at the new standard.
7. Pluggable per-region selection rules, with the dense-city (London) rule
   designed, implemented as a pure function and stubbed into the region
   framework.
8. The new quality standard: the `composed` profile with the bar rules and
   the perf rules, the legacy tier, the re-based reference, and `status`
   reporting gold, upgrading and legacy per pack and region (section 15).
9. The upgrade machinery: `animRegionSceneUpgrade` (draft and live
   upgrades that keep the item's identity), `sceneFromArchetype`, the kit
   tags and `sceneKitPick`, the archetype index, `scene upgrade <ref>` and
   `scene sheet --compare` (section 16).

Not this round (the convert stage, section 17, does the first two):

- Converting the Yateley and Fleet view files into composed scenes.
- The three pilot upgrades: Singapore, New York, and Mount Fuji with the
  Chureito Pagoda. Their landmarks, kits and archetypes are built there.
- The London pack itself.
- Upgrading the other ~215 region scenes, and retrofitting the UK legacy,
  Texas and World packs (section 7.5).
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
- Load order: `70-scene-0core.js` < `70-scene-0kit.js` < `70-scene-arch-0list.js`
  < `70-scene-arch-*` < `70-scene-data-*` < `70-scene-lib-*` (including
  `70-scene-lib-landmark-*`) < `70-scene-retro.js` < `70-scene-select.js` <
  `70-scene-svg.js` < `71-anim-0region.js` < ... < `71-anim-registry.js` <
  `71-anim-uk-nature-kit.js` < `71-scene-<pack>-N.js` and
  `71-scene-upgrade-<region>-<slug>.js` < `72-anim-pack-*.js` <
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
  - `guard` always reports `tests/*`, `tools/anim-quality.json` and
    `tools/anim-reference.json` as forbidden, even when they are listed as
    owned (it was built for drawing agents). This round, the ONLY acceptable
    guard failures are those reasons on files section 13 gives you. Any other
    path in the report is a stray: remove it before committing. Report the
    guard output verbatim.

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
 hand-drawn region scenes --sceneRetrofit--> same art + live sky / grade / season overlay (SVG, section 7)       = LEGACY tier
 hand-drawn region scene --scene upgrade--> landmark object + archetype + kits --animRegionSceneUpgrade--> composed item,
                                            same id / key / place / caption (section 16)                         = GOLD when it passes the bar
 region config {select} --sceneSelect('dense', input)--> which place plays (section 9)
 tools/anim-pack.mjs object|scene ... --> lint (composed profile = THE BAR, section 15), sheet (headless Chrome; --compare old vs new),
                                          perf (frame and dynamic ms in the real renderer), status (gold / upgrading / legacy)
```

## 2. Object library

### 2.1 Files and naming

- **Files.** `src/app/70-scene-lib-<name>.js`, where `<name>` is a category
  in the plural (`trees`) or a category plus a kit (`trees-tropical`,
  `buildings-towers`, section 2.7). Every object in a file has the same
  category, so two authors never edit the same file for different kits.
  - Starter files this round: `trees`, `plants`, `birds`, `people`,
    `vehicles`, `buildings`, `street`, `rail`.
  - A file holds `sceneObjDefine(...)` / `sceneObjFromKit(...)` calls inside
    an IIFE, and nothing else.
  - **Landmarks** get one file EACH: `70-scene-lib-landmark-<slug>.js`
    (`70-scene-lib-landmark-marina-bay-sands.js`). They are large and
    unique, and the upgrade agents work on them in parallel.
- **Object ids.** The form is `<category>.<name>`, matching
  `/^[a-z]+\.[a-z0-9-]{1,40}$/`. Examples: `tree.oak`, `plant.heather`,
  `bird.mallard`, `person.walker`, `building.station-holden`, `rail.platform`,
  `landmark.marina-bay-sands`.
  - An id is stable forever. Rename an object by defining a new one; scenes
    reference ids.
- **Categories** (`SCENE_CATEGORIES`): `tree plant ground rock water bird
  animal person vehicle boat building street rail structure prop sky
  landmark`.
  - Signs are NOT objects: they are an engine primitive (section 8.3).
- **Landmarks** (`landmark.*`): one real, named place's signature structure
  (Marina Bay Sands, the Empire State Building, the Chureito Pagoda, the
  Fleet Pond boardwalk). Tags: `landmark`, `place:<region>/<key>` (for
  example `place:asia/place:singapore`; a UK landmark uses
  `place:uk/<ukPlace>`) and its region. A landmark is refined: real
  structure and window detail, a night-lit `lit` part (2.2), and at least 80
  shapes. Smaller one-place features (a particular church on a green) may be
  ordinary objects in their category with the `landmark` tag.
- **Kit and role tags** (section 2.7): every library object except landmarks
  carries at least one `kit:<kit>` tag and exactly one `role:<role>` tag.
  Archetypes pick objects by these tags, so a new object joins every scene
  that uses its kit without any scene being edited.

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
  parts: ['trunk', 'crown'],     // draw order; default ['body']. A part named 'lit' is the NIGHT-LIT VARIANT (below)
  weight: 1,                     // optional: relative weight when an archetype picks by kit and role (2.7)
  anim: { sway: { part: 'crown', pivot: [0, -170], deg: 2.2 } },     // the animation hooks (2.4)
  shadow: { rx: 110, ry: 14, h: 400 },   // optional: a ground shadow cast along the live sun (h: height for its length)
  reflect: true,                 // mirrored in water areas it stands beside
  tags: ['uk', 'heath', 'deciduous', 'kit:temperate', 'role:tree'],
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
**Size-tiered detail.** An object that sets `detailPx` (`true` for
`SCENE_DETAIL_PX`, 48, or a number of pixels) also drops them wherever it is
drawn shorter than that: its box height times the drawing's scale, in device
pixels on the canvas (the sprite bake) and in scene units in the SVG still
(`sceneDetailAt(id, sh, scale)` in the core, used by both). The test is a
function of (object, variant, season, scale), and the sprite key carries all
four, so cached sprites stay valid; the SVG keys its symbols by tier too. The
people set it: a far walker is its 20 to 30 silhouette shapes, a near one its
100 to 150. Why 48: the people's fine strokes are 0.3 to 0.6 units wide on a
62-unit figure, so under about 48 px they are under half a pixel (noise, and
bytes). Objects without `detailPx` keep the old rule only.

**The night-lit variant.** A part named `lit` holds what only shows after
real dusk (`L.windows` true): floodlight washes, light beams, LED outlines,
lit signs on a tower's crown. Its shapes are NOT graded (like `glow`). The
canvas renderer bakes it into its layer bitmap only while lit (the light key
includes `windows`, 6.3), so it costs nothing per frame. The SVG renderer
emits it only when `L.windows`. Window and lamp shapes with `glow` light up as
before; `lit` is for everything else that changes at night.

**Objects that move keep their night look** (both renderers). The glow
shapes of a moving part are lit inside that part's sprite or symbol (all of
them when any of the placement's `glowOn` is on; an actor has no `glowOn`, so
all its glows light). The parts that stay light as a static placement's. The
`lit` part rides with the motion: on the canvas it is baked into an actor's
rest sprite, or into the whole-object sprite of a placement with a `'*'`
hook (no extra draw); in the SVG it is one more `<use>` with the same pose.
By day nothing changes (the night variants are separate cache keys).

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
wrappers. Rather than redraw it:

- `sceneKit(name)` (in the core, builder A): a memoised
  `ukNatureKit(animSceneKit())` instance, made lazily, one per name.
  - `name: 'obj'` is used only for object builds: `K.live` is NEVER called
    on it, so no light leaks into the drawings.
  - `name: 'light'` is used only by `sceneLight`; `name: 'svg'` only by the
    SVG renderer's sky (6.5).

`src/app/70-scene-0kit.js` (builder C; pure, loaded right after the core)
provides:

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
  - The same parser reads the hand-drawn REGION scenes for the landmark
    extraction of `scene upgrade` (16.3). There, with `{ flatten: true }`:
    every motion wrapper (`x-ukn*`, `us*` classes such as `usdrift`,
    `ussway`, `usbob`) is flattened at its rest position; shapes in a
    `us-lit` group get `glow: 'window'` and shapes in a `us-lamps` group get
    `glow: 'lamp'`; `us-star` and `us-tint` groups are dropped. Each returned
    shape also carries its world bounding box `bb: [x0, y0, x1, y1]`
    (approximate: from the path's points through `m`).
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

**Starter set this round** (builder C), with their kit and role tags:

- Kit adapters (`sceneObjFromKit`):
  - `tree.oak`, `tree.birch`, `tree.pine` (3 variants each;
    `kit:temperate role:tree`)
  - `plant.heather`, `plant.grass`, `plant.gorse` (`kit:temperate
    role:ground`), `plant.reed` (`kit:temperate role:edge`)
  - `bird.mallard`, `bird.swan` (`kit:birds role:bird`)
  - `person.walker` (the kit walker without its travel; legs = `walk`; 4
    variants; `shapeBySeason: true` so coats in winter and shirts in summer;
    `kit:people role:walker`)
- Native objects:
  - `tree.plane` (a London plane; `kit:urban kit:temperate role:tree`)
  - `plant.planter`, `plant.hedge` (`kit:urban role:ground`): the dense
    ground cover of urban scenes
  - `building.station-victorian`, `building.station-holden`,
    `building.station-modern` (`kit:london role:building-mid`, tagged
    `signature`; with window `glow` and a `lit` part)
  - `building.terrace` (6 variants; `kit:london role:building-far`),
    `building.tower` (8 variants; `kit:towers role:building-far`)
  - `street.lamp`, `street.bench` (`kit:urban role:street`)
  - `vehicle.bus` (`kit:london role:vehicle`; 2 variants, lit windows)
  - `bird.pigeon` (`kit:urban kit:birds role:bird`)
  - `rail.platform`, `rail.track`, `rail.train` (`kit:london`; roles
    `street`, `street`, `vehicle`)

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
   `node tools/anim-pack.mjs object new <category>.<name> [--kit "K.tree('alder')"] [--variants 3] [--kits tropical,urban] [--role tree]`.
   This appends a stub to `70-scene-lib-<plural>[-<first kit>].js`
   (`70-scene-lib-landmark-<name>.js` for a landmark), creating the file with
   its IIFE if it is missing. The stub has palettes for all four seasons, the
   kit and role tags, or a `sceneObjFromKit` call.
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
   - **Tags:** at least one `kit:<kit>` from `SCENE_KITS` (2.7) and exactly
     one `role:<role>` from `SCENE_ROLES`, except for landmarks.
   - **Landmarks:** at least 80 shapes in variant 0; a `lit` part or at
     least 10 `glow` shapes (a natural landmark, such as a mountain, is
     exempt from this and tagged `natural`); tags `landmark` and
     `place:<region>/<key>`; `flippable: false`.
   - **Buildings and vehicles:** at least 4 `glow` shapes (windows lit at
     real dusk), unless tagged `unlit`.
4. Look at it:
   `node tools/anim-pack.mjs object sheet <id> [--out dir] [--canvas]`.
   - The grid has a row per variant and a column per season, plus a night
     column graded with the night light and a 0.4x size strip.
   - It also shows three animation phases.
   - It is rendered by the SVG renderer by default, or by the canvas
     renderer with `--canvas`.

`tests/scene-lib.test.mjs` runs `object lint` over the whole library, so a
broken object fails `npm test`.

### 2.7 Region object kits (the library plan)

The library is not only UK nature. A KIT is a set of objects for a climate,
an architecture or a common subject, joined by tags (2.1). The constants live
in `70-scene-arch-0list.js` (builder C, pure data):

```js
SCENE_KITS = ['temperate', 'tropical', 'arid', 'alpine', 'mediterranean', 'polar', 'urban',
              'towers', 'shophouse', 'east-asian', 'south-asian', 'islamic', 'adobe', 'brownstone', 'colonial', 'london',
              'people', 'vehicles', 'boats', 'birds', 'animals', 'water']
SCENE_ROLES = ['tree', 'shrub', 'ground', 'edge', 'rock', 'building-far', 'building-mid', 'building-near',
               'street', 'walker', 'vehicle', 'boat', 'bird', 'animal', 'sky']
SCENE_REGION_KITS = {                      // the default kits for a region scene, by region group (first match wins), then by climate
  'asia-southeast': ['tropical', 'shophouse', 'urban'], 'asia-east': ['temperate', 'east-asian', 'urban'],
  'asia-south': ['tropical', 'south-asian', 'urban'], 'asia-west': ['arid', 'islamic', 'urban'], 'asia-central': ['arid', 'alpine'],
  'us-northeast': ['temperate', 'brownstone', 'towers', 'urban'], 'us-southeast': ['temperate', 'colonial', 'urban'],
  'us-midwest': ['temperate', 'towers', 'urban'], 'us-mountain': ['alpine', 'arid'], 'us-pacific': ['temperate', 'alpine', 'towers'],
  texas: ['arid', 'adobe', 'towers'], 'uk-*': ['temperate', 'london', 'urban'],
  climate: { tropical: ['tropical'], arid: ['arid'], alpine: ['alpine'], temperate: ['temperate'], polar: ['polar'] },
  always: ['people', 'vehicles', 'boats', 'birds', 'water'],
}
```

`sceneKitPick(kits, role, { tags, exclude })` (builder A, core) returns
`{ id: weight }`: every object with one of the `kit:<k>` tags and the
`role:<role>` tag (and every extra tag in `tags`), weighted by `weight`
(default 1; `weight: 0` excludes the object, so only a scene that names it
gets it), keyed in id order. It is memoised per call signature and EMPTY-SAFE: with no match
it returns `{}`, and the archetype skips that rule (the lint's ground-cover
and mover rules then say what is thin).

The plan below names the objects each kit needs. `*` = this round (starter
set), `P` = the convert stage's pilot (section 17), the rest = later, added
as region upgrades need them. Every object follows 2.2 to 2.6, with four
seasons where nature or clothing changes (a palm's fronds dry in the
tropical dry season; snow lies on roofs and on a pagoda in winter).

| kit | objects |
|---|---|
| `temperate` | `tree.oak*`, `tree.birch*`, `tree.pine*`, `tree.plane*`, `tree.cherry P`, `tree.maple-japanese P`, `tree.cedar P`, `tree.willow`, `tree.elm`, `plant.grass*`, `plant.heather*`, `plant.gorse*`, `plant.reed*`, `plant.wildflowers`, `plant.bramble` |
| `tropical` | `tree.rain-tree P`, `plant.palm-coconut P`, `plant.palm-royal P`, `plant.banana P`, `plant.bougainvillea P`, `plant.grass-tropical P`, `plant.frangipani`, `plant.fern-tree`, `plant.lotus` |
| `arid` | `plant.saguaro`, `plant.agave`, `plant.joshua-tree`, `plant.sagebrush`, `plant.date-palm`, `rock.mesa`, `rock.boulder-red` |
| `alpine` / `polar` | `tree.spruce`, `tree.larch`, `rock.boulder`, `plant.alpine-flowers`, `ground.snowdrift` |
| `mediterranean` | `tree.olive`, `tree.cypress`, `plant.lavender`, `plant.agave` |
| `urban` | `tree.plane*`, `plant.planter*`, `plant.hedge*`, `street.lamp*`, `street.bench*`, `street.bin`, `street.bollard`, `street.railing`, `street.traffic-light` |
| `towers` | `building.tower*` (generic), `building.tower-glass P` (a GENERATOR: 16 seeded variants of height class, setbacks, crown and curtain-wall window grid, lit windows), `building.tower-stone P` (masonry, punched windows), `building.tower-deco` |
| `shophouse` | `building.shophouse P` (8 variants: pastel facades, shutters, the five-foot way, lit at night), `street.hawker-stall` |
| `east-asian` | `building.pagoda P` (3 and 5 tiers), `building.machiya P`, `building.temple-hall`, `structure.lantern-stone`, `street.lantern-string` |
| `south-asian` / `islamic` | `building.ghat-steps`, `building.mosque-dome`, `building.minaret`, `building.haveli` |
| `adobe` / `colonial` / `brownstone` | `building.adobe`, `building.mission`, `building.colonial-house`, `building.brownstone P` (row houses with stoops), `structure.water-tower P` |
| `london` | `building.station-victorian*`, `building.station-holden*`, `building.station-modern*`, `building.terrace*`, `vehicle.bus*`, `rail.platform*`, `rail.track*`, `rail.train*`, `building.mansion-block`, `vehicle.taxi-black` |
| `people` | `person.walker*` (8 variants on the shared builder, 2.8), `person.cyclist`, `person.jogger`, `person.dog-walker`, `person.sitter` |
| `vehicles` | `vehicle.car P` (6 variants), `vehicle.taxi P`, `vehicle.tram`, `vehicle.tuk-tuk`, `vehicle.bike` |
| `boats` | `boat.ferry P`, `boat.bumboat P`, `boat.tug P`, `boat.yacht P`, `boat.longtail`, `boat.sampan`, `boat.narrowboat`, `boat.kayak` |
| `birds` / `animals` | `bird.mallard*`, `bird.swan*`, `bird.pigeon*`, `bird.gull P`, `bird.egret P`, `bird.kite`, `bird.swift`, `animal.deer`, `animal.dog` |
| `water` | `water.lily`, `water.lotus`, `water.buoy P`, `water.jetty P` |

Landmarks are not in kits: each upgraded scene adds its own (16.3).

### 2.8 People: the depth ladder, the size tier and the shared builder

**The depth ladder** (`70-scene-0core.js`). A person is 1.72 m
(`SCENE_PERSON.metres`), and one pure function says how tall that is on
screen: `scenePersonHeight(view, y)` gives the height in units of a person
whose feet are on row y: 16 at the view's horizon row (`view.horizon`), 132
at the ground row (the frame's foot, y 900), linear in y between (a flat
ground in perspective: the height grows with the distance below the vanishing
line), never more than 150 (the care limit, 8.5) nor less than 6.
`scenePersonScale(objHeight, y, view)` is the scale that draws a person
object of that height (its `size[1]` stands for 1.72 m) at row y. The four
archetypes (`basic`, `skyline-water`, `temple-mountain`, `station` through
`basic`) place their walkers with it instead of hand-set scales (a walker
on a slope gets the ladder's ratio as `sByY`); the care lint checks the same
150 cap. With the default horizon 520 a walker is about 76 units at y 720 and
85 to 93 on the station forecourt; Fleet's canal views keep their own metric
(1.72 m over the distance) and the hand-placed named scenes keep their scales.

**The size tier** (2.2): people set `detailPx: true`, so under 48 px their
`detail: true` shapes (folds, seams, straps, cuffs, soles, laces, hair
strands, buttons) are not drawn: far people are cheap (20 to 30 shapes), near
people detailed (100 to 150).

**The shared builder** (`70-scene-lib-people-0figure.js`, `scenePeople`,
sorted before the other people files). One faceless figure for every
`person.*` object: `scenePeople.figure(o)` returns the walk-cycle parts
`legB`, `body`, `legA` (the walk hook `scenePeople.walkAnim()` swings the legs
about the hip, `scenePeople.HIP`, and bobs the body), the head's ellipse and
the hands' positions (for leads, rods, handlebars). The body plan: an adult
62 units to the crown, side view facing right, the head a plain egg (hair, a
hat or a hood; never eyes, a nose, ears or a mouth: a test checks the face
side of every preset's head), neck, shoulders, torso, two-segment arms and
legs, feet. Builds: slim, average, broad, stout; ages young, adult, older (a
slight stoop). Tops: tee, blouse, shirt, jumper, cardigan, hoodie (hood up or
down), jacket, rain, parka, coat (a belt); bottoms: trousers, jeans, joggers,
shorts, skirt (knee or midi, with tights or bare legs); shoes: trainer, shoe,
boot, sandal; accessories: beanie (a pompom), cap, flat cap, sun hat, scarf,
gloves, crossbody or shoulder bag, backpack, an open umbrella, a closed one
or a walking stick (held in the FAR hand), a phone. `scenePeople.PRESETS` are
8 people (body and a wardrobe per season) and `scenePeople.outfit(preset,
season)` dresses one for the season. Colours are tone4 palette slots
(`scenePeople.palette()`: `@navy.0` base, `.1` dark, `.2` light, `.3` deep).
The night look (`scenePeople.NIGHT` as the object's `night`): glow shapes, so
after dusk a cool rim light runs along the back of the head and the back,
reflective strips and an umbrella's edge catch the lamps and a phone screen
shines; by day they take the colour under them. Layering that holds in every
renderer (they draw the moving legs after the body): the legs start below the
lowest body edge they meet, no hand or held thing hangs over a thigh, and
things that reach the ground are held in the far hand. `scenePeople` also
holds the one `tidy`, `define` and colour helpers for every people file.
`person.walker` is the reference object (8 presets); the other `person.*`
objects move onto the builder next.

### 2.9 Raster objects (images and AI sprite sheets)

An object can be backed by PNG (or WebP) images instead of shapes:
`sceneObjDefine({ id, kind: 'raster', images: { base, night?, spring?, summer?, autumn?, winter?, lit?, snow?, mask_lit? },
anchor, size, parts?: [{ name, image, box, pivot, anim }], frames?: { images, period } })` (`src/app/70-scene-0raster.js`).

- It resolves to ordinary parts whose shapes carry an `img`, so hooks, scatter, actors, sprite keys and the compiled
  scene are unchanged.
- Missing seasons are derived by colour matrices, and winter adds a snow cap made at import. Night is the live grade
  unless there is a real night image. Lit windows come from the sheet's lit column, `mask_lit` or auto-detection.
- A new hook kind, `frames`, swaps between 2 and 6 frame images.
- The images live in `assets/objects/<category>/<name>/`. They are embedded in the page as non-running blocks and
  decoded lazily, the first time a scene draws them.
- `src/app/70-scene-lib-raster.js` is GENERATED from their `meta.json` files by `object import`, `import-batch` and
  `import-sheet`.

The whole design is in **docs/dev/OBJECT_IMPORT.md**: the fixed sprite-sheet template an AI fills (rows = variants, columns =
spring, summer, autumn, winter, night and lit, plus a frames row), the slicer and its consistency lint, the commands, the
derivations, the budgets and the demo.

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
  setting: 'natural',                   // 'natural' | 'urban' | 'mixed' | 'interior': picks the ground-cover and lighting floors of the bar (15.2)
  signage: false,                       // true allows signs[] (8.3); archetypes that declare signs: true set it. Region upgrades: always false (8.5)
  sky: { stars: 180, clouds: { n: 5, y: [60, 320], speed: 6 }, sunR: 26, moonR: 20 },   // false = no open sky (only with setting 'interior')
  layers: [                             // far to near; default: SCENE_LAYERS_DEFAULT (below)
    { id: 'horizon', depth: 0.08, haze: 0.65 },
    { id: 'far', depth: 0.2, haze: 0.45 },
    { id: 'mid', depth: 0.45, haze: 0.2 },
    { id: 'near', depth: 0.75, haze: 0.06 },
    { id: 'fore', depth: 1, haze: 0 },
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
  signs: [ { layer: 'mid', x: 800, y: 520, w: 360, h: 46, text: 'Arnos Grove', bars: ['#003688'], style: 'board' } ],   // section 8.3; only with signage: true
  particles: 'season',                  // 'season' (petals / motes / leaves / snow by season) | 'none' | { kind, n }
  particleSeasons: { winter: 'motes' },  // optional climate overrides for seasonal decoration; live weather stays independent
  weather: 'live',                      // rain / snow / fog / wind from the live weather (o.sky.wx) | 'none'
  camera: { pan: 0, period: 90 },       // optional parallax drift (px at depth 1); 0 = off (cheapest)
}
```

**Defaults.** `SCENE_LAYERS_DEFAULT` is the six layers of the example:
horizon (depth 0.08, haze 0.65), far (0.2, 0.45), mid (0.45, 0.2), near
(0.75, 0.06), fore (1, 0) and front (1.25, 0). At most 8 layers are allowed.
The bar (15.2) needs at least 5 of them USED (holding ground, water or
placements). Many layers cost nothing per frame: static layers merge into
the same bake bitmap unless something animated sits between them (6.3).

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
- layers that do not exist, or more than 8 layers
- an unknown `setting`
- an empty or out-of-range area
- `n` above 3000 per rule
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
  v: 1, id, w: 1600, h: 900, season, lod, setting,
  arch: { id, params } | null,                            // set by sceneFromArchetype (8.1), for the lint and status
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
           animatedDraws,                                 // animatedParts + strips + actor parts + flockBirds: the sprites drawn per frame (budget 300)
           objects: { id: count }, categories: { cat: count }, layersUsed, distinctSprites, dataBytes },
}
Placed = { o: 'tree.oak', v, x, y, s, flip, layer: i, haze, tint: ['#hex', kBucket] | null, season, seed, z,
           strip: stripIndex | -1, anim: [Anim], glowOn: [bool per glow shape group] | null, shadow: bool, reflect: bool,
           lit: bool }                                    // the object has a 'lit' part (2.2), drawn only while L.windows
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

Raster objects (2.9) draw through both renderers. The canvas renderer draws each image once per sprite (its scale bucket, season and light), with the season derivation and the fitted light grade applied to its pixels, and bakes again when a lazily decoded image becomes ready (`r.waiting`). The SVG still embeds the images as `<image>` elements with one `feColorMatrix` per grade (docs/dev/OBJECT_IMPORT.md section 4).

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
r.stats();                   // { drawMs: { median, p95, max, n }, dynMs: { median, p95, max, n }, bakeMs, firstBakeMs, bakes,
                             //   sprites, spriteBytes, bitmaps, blitPx, animatedDraws, actors }
                             // drawMs = the whole frame; dynMs = the frame minus the bitmap blits (sky and land bitmaps):
                             // what the animated sprites, strips, actors, flocks, shimmer, particles and weather cost.
                             // Both are CPU time around the frame's 2D calls (performance.now()), measured every frame.
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
- `detail: true` shapes are left out at LOD < 0.5, and for an object with
  `detailPx` (the people) when the sprite is under that many device pixels
  tall (`sceneDetailAt`, 2.2): a function of the key's scale, so the cache
  stays valid.
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
  There are at most 6 bitmaps including the sky (the lint's `bitmaps` rule).
  Each land bitmap is CROPPED to the bounding box of what its layers draw
  (plus the sprite padding), so a far band blits a strip, not the whole
  screen. `stats().blitPx` reports the blitted device pixels per frame.
- **Thousands of static placements are free per frame.** They cost only at
  bake time (one `drawImage` each), which is why the bar asks for dense
  ground cover and the lint counts only animated draws against the frame.
- A layer bakes, in order: its ground, its water (gradient from
  `L.water(base)`), the shadows of its objects (an ellipse skewed along
  `L.shadow`), its static sprites, and the static parts of animated objects.
- Wind strips are baked separately: one bitmap per strip, with only its
  y-range.
- Reflections: after baking, each `reflect` water area gets a flipped copy of
  everything above its waterline, clipped to the water, at alpha 0.35 and
  tinted with the water colours. This is baked into the water's layer.
- Lit parts (2.2) and lit glow shapes are baked only while `L.windows`; the
  light key changes at real dusk, so the night look costs one re-bake.
- Re-bakes (light key, season, resize, LOD) run in idle slices of 8 ms or
  less (`requestIdleCallback`, else `setTimeout`) into new bitmaps. The old
  ones keep drawing until the swap, so there is no frame over 16 ms and no
  flash.

**Each frame.** Nothing else is drawn; there is no `clearRect`, because the
sky covers the whole canvas.

1. The sky bitmap.
2. Stars, if `L.stars > 0`: up to 220 `fillRect`s with seeded twinkle alpha.
3. Clouds: up to 10 cloud sprites drifting at `clouds.speed`, one
   `drawImage` each at whole device pixels. `sceneCloudPlan(C, L)` (the
   core, pure and seeded by the scene id) picks the kinds by cover and
   weather (cumulus heaps, low stratus strips, a few cirrus wisps in a clear
   sky), 2 or 3 depth bands (far: small, pale, slow; near: larger, brighter,
   faster) and the colours from `L.cloud` (a rim on the sun's or moon's
   side, a glowing base round sunrise and sunset); the bake paints each
   cloud once. `sceneCloudX(c, t)` wraps a cloud on its own width, so it
   enters and leaves fully off-screen; at t = 0 every cloud is in the frame.
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

**Budget.** At 1600 x 900, dpr 1, on a normal laptop (or headless Chrome
with `--gpu`): `drawMs` median at most 8 ms and `dynMs` median at most 6 ms,
with at most 300 animated draws. Under headless software raster the limits
are multiplied by `swFactor` (1.75, in `tools/anim-quality.json`; the
reviewer re-measures it on the demo and corrects it). If a scene exceeds
the dynamic budget, the fix is in the DATA (fewer animated placements, more
in wind strips, fewer particles), never a lower frame rate.

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
same compiled scene is drawn with symbols plus `<use>`, as ONE STILL FRAME
(the frame at t = 0: every actor at its offset, every hook at its phase).
A still keeps this renderer small, keeps the fallback cheap, and makes PNG
sheets and tests deterministic. Animated SVG output is a later option
(section 18), not this round.

- **Defs.** One `<g id>` per `(obj, v, part, season, haze, tint, detail
  tier)` actually used, with toned colours (the tier: `sceneDetailAt` at the
  placement's scale, 2.2). The ids are fresh per render (`U()` style), so
  the tests' "fresh ids" rule holds.
- **Placements.** `<use href="#id" transform="translate(x y) scale(+-s s)">`.
  An animated part is drawn at its t = 0 pose (one extra `rotate` /
  `translate` / `scale` in its transform).
- **Actors and flocks.** At their t = 0 positions along their paths and
  areas.
- **Lit.** `lit` parts and lit glow colours only when `L.windows` (2.2).
- **The sky.** The kit's own `K.liveSky(L)` / `K.liveClouds(L)`, plus
  `K.weather(L)` and `K.grade(L)` from `sceneKit('svg')`. This gives
  identical skies.
- **Signs.** 8.3.
- **LOD.** From `o.size`: `fill` / `hero` is 1, `lg` / `xl` is 0.3, and
  smaller sizes are 0.15.
- **Budget.** At most 1,000,000 bytes at `fill` and 150,000 bytes at `lg`
  (the rich budgets).

It is used by tests, PNG review sheets, tiny sizes, and environments without
a canvas. `sceneSvgCss()` returns '' (the still needs no keyframes).

### 6.6 CSS (`src/styles/76-scene.css`, builder B)

- `.ap-composed { position: relative; background: linear-gradient(var(--sc-top), var(--sc-low)); }`
- `.ap-composed .sc-canvas { width: 100%; height: 100%; display: block; opacity: 0; transition: opacity .2s; }`
- `.ap-composed.sc-ready .sc-canvas { opacity: 1; }`
- `.ap-composed::after { /* vignette + warm glow from --sc-vig / --sc-warm */ }`
- Retrofit (section 7):
  - `.sr-retro .us-tint { opacity: 0 !important; }` (the live grade replaces
    the old evening tint)
  - keyframes `x-srtw` (star twinkle), `x-srfall` (particles), `x-srglow`,
    transform and opacity only
- Reduced motion: `.ap-still` and `@media (prefers-reduced-motion: reduce)`
  stop every `x-sr*` animation.

## 7. Retrofit: every existing hand-drawn scene gets the Yateley rules

### 7.1 Principle

Hand-drawn region scenes (US, Asia and every region since) stay as they are,
as SVG. They are already light: at most 32 KB each.

`sceneRetrofit(item, retro)` wraps the item. With a live sky (`o.sky`), its
`svg(o)` returns the art re-lit by that sky plus a small overlay. With no `o.sky`
(Node, the lint corpus, sheets without `--at`), it returns the original art
BYTE-IDENTICAL. So the calibrated corpus, the tests and the existing lint
results do not move.

The retrofit gives a scene the RULES (seasons, live sky, weather), cheaply
and at once. It does not give it the QUALITY: a retrofitted scene is still
LEGACY tier (15.3), "below the new standard", until it is upgraded (section
16). A retrofitted scene that is later upgraded drops the overlay: the
composed renderer does all of it natively.

### 7.2 The re-lit art and the overlay (`70-scene-retro.js`, builder A; at most 6,000 bytes added, `SCENE_RETRO_MAX_BYTES`)

The art is re-lit in place, never veiled. A veil over the art (a flat sky
rect above the horizon) buried every skyline, mountain and landmark above
y = 520 at night with a hard band, and copies of the lit windows (`<use>`)
rendered black and drifted (they lose the ancestors' parallax, motion and
transforms). Two ways were prototyped on twelve scenes in round 2: grading
the art's own colours (below) and one multiply blend over the whole drawing.
The blend darkens the lit windows to brown and dims the real moon and stars
(only copies above it could escape it), so grading won; it also costs no
blend layer per frame.

```
<g class="sr-retro">
  <g class="sr-back">                                   the art, re-lit
    <g class="sr-lamps">                                at real dusk (L.windows): lights the art's own .us-lit / .us-lamps (76-scene.css)
      SKY          the art's first element, the kit's full(sky) (a 1600 x 900 rect with a gradient): its stops turn into
                   the live sky (L.top, L.mid, L.low by height over retro.horizon) by k = clamp(L.dark * 1.15, 0, 1); never graded
      <g class="sr-sky">                                straight after the sky, so the land, skyline and clouds drawn later stand in front
        glow       at golden hour, L.lowSun at .25 round the real sun position
        stars      up to retro.stars round dots (zero-length strokes), opacity L.stars, 3 groups with x-srtw twinkle
        moon       at L.moon (real azimuth / altitude through retro.heading / fov / horizon), real phase and limb, soft glow
        sun        only with retro.sun === 'live': the disc and glow at L.sun
      </g>
      LAND         every fill / stroke / stop-color after the sky graded in place: toward night blue and darker by the real
                   darkness the painting does not already have (a sky painted at night is graded less), the K.tone shade
                   multiply and golden warmth by day; the lit pieces (us-lit, us-lamps) are left exactly as drawn
      PAINTED SUN  the kit's sun() and rays() fade out by k (gone at night)
    </g>
  </g>
  season       when retro.season === 'auto', the item's season label is 'any' and the scene's own |lat| >= 23.5:
               spring #cfe8a0 soft-light .10 + 12 petals; summer: 8 motes; autumn #d27a2c soft-light .20 + 16 leaves;
               winter #e8eef6 screen .18 (fading to a fifth at night, where it would grey the dark sky) + a grey
               saturation rect .25 + 30 snowflakes (more when L.snow); winter is graded by the scene's own |lat|
               (sceneRetroSeason): 23.5..35 (Florida, the Gulf, the deserts) only the saturation rect at half
               strength, no frost and no flakes; 35..45 the frost and flakes ramp in; 45 and over the full winter
  weather      rain lines / snow / fog veil from L (shared with the canvas renderer's constants)
</g>
```

- A sky painted at night (its top luminance under 0.13) or with a painted
  moon (a pale disc high in the first third of the drawing) keeps its own
  moon: no second, live one. This covers the painted night, dusk and moon
  scenes centrally (Sawtooth, Palmetto crescent, Memphis, Pyramid Lake, Las
  Vegas, Hawaii volcano, Crater Lake, Anchorage aurora, Jeddah and others),
  so no scene needs a `retro` exemption.
- Art can only be darkened, never brightened: a painted sunset stays a
  sunset at noon, and a painted night stays a night by day.
- The budget counts every byte the retrofit adds (the graded art's growth
  and the live sky inside `sr-back` included); over it, particles, stars,
  weather and the season go first. `lint --at` measures what is outside
  `sr-back` and checks every `sr-*` class has css.
- Reduced motion (`.ap-still`): stars hold a steady .75, the falling
  particles are hidden (frozen they would sit in a band at the top).

`sceneRetrofitSvg(markup, L, retro, { season, lat })` builds it.
`sceneRetroSeason(lat, ms[, season])` is the pure season rule it uses:
`{ season, tint, desat, fall }`, each the share (0..1) of the full colour
layer (winter's white frost), winter's saturation layer and the falling
particles, by the scene's own latitude and the date (hemisphere aware:
a southern scene's winter is June to August). Within the tropics all
are 0; the other seasons are 1; winter is graded as above, so snow only
falls where winter snow is plausible.

`SCENE_RETRO_DEFAULTS`:

```js
{ horizon: 520, sky: null /* default: the rect above the horizon */, heading: 180, fov: 80,
  sun: 'painted' /* 'live' | 'painted' | 'off' */, moon: true, stars: 160, veil: true, grade: true,
  season: 'auto', particles: true, weather: true, lamps: true }
```

- `veil` restyles the art's own sky and fades its painted sun; `grade`
  grades its land; `lamps` lights its own lit pieces at real dusk.
- `horizon` places the live sun, moon and stars. `sky` (a path) is optional:
  it clips the live sky pieces; without it the art itself hides them behind
  its land, skyline and mountains.
- `sun: 'painted'` keeps the painted sun by day, which is the safe default.
  `'live'` is for art without a sun.

### 7.3 The region hook (`71-anim-0region.js`, builder A)

- **Config.** `animRegionDefine(cfg)` accepts `retrofit: {...defaults} |
  false`. Default `{}` means ON with `SCENE_RETRO_DEFAULTS`.
- **Scene entries.** `animRegionSceneAdd(id, { ..., retro: { horizon: 610,
  sky: 'M...', sun: 'live' } | false })` tunes one scene.
- **Full items.** In `builder().upgrade(o, sc)` and `scenesToItems()` (the
  two places a scene entry becomes a full item), the item gets
  `liveSky: { lat, lon }`. For a place, that is its row. For a unit, it is
  the unit's first big row, else the mean of its rows. The item's `svg` is
  wrapped by `sceneRetrofit`, UNLESS a live upgrade replaces it (16.2).

The registry then passes `o.sky` in the browser (the user's location, else
the scene's own lat/lon, at the computer's clock), and `tod` follows the
real sky. One edit retrofits EVERY US and Asia scene, and every region made
later with `tools/anim-pack.mjs new`.

### 7.4 Review

1. Run `node tools/anim-pack.mjs sheet --pack us-northeast --at 2026-10-07T21:30:00Z --mode night --contact`.
   `sheet` and `lint` gain `--at <ISO>` and `--location lat,lon`, which pass
   `o.sky` (builder C).
2. Run the same at dawn, noon and golden hour, and in each season, and for
   one pack of every region: `asia-east` (Japan's Fuji ridge),
   `asia-southeast` (tropical: no season tint), `asia-west`, `us-mountain`
   (mountain skylines, painted night and moon scenes) and `us-pacific` (the
   aurora scene). Every region scene gets the rules from the one region hook;
   no scene needs a `retro` entry since round 2 (the sky is restyled, not
   veiled, so ridges and skylines need no `sky` path).
3. Run `lint --pack us-northeast --at <ISO>`. With the overlay present it
   checks the retro rules: overlay at most 6,000 bytes, classes defined,
   transform and opacity only. `tests/scene-retrofit.test.mjs` holds every
   scene to the 6,000 bytes added in 4 seasons x 12 hours and reports the
   html with a sky over the 32,000-byte full budget (none over 40,000).

The base art is still judged by its own profile, without the overlay.

### 7.5 Later (follow-up, not this round)

`sceneRetrofitPack(manifest, defaults)` will be a one-line wrap for:

- the UK legacy packs (`uk-south-east` non-rich items, `uk-south-west`,
  `uk-north-west`)
- `texas`
- `world`

The rich Yateley and Fleet scenes already follow the rules natively. They
become composed scenes in the convert stage (section 17).

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
- `u` provides `{ hash, rnd, pick, line(id) (from sceneLine), has(feature),
  kit(role, tags?) }`. `u.kit(role)` is `sceneKitPick(p.kits || arch.kits,
  role, { tags })` (2.7): an archetype names ROLES, never object ids, except
  for its signature slot, so new kit objects reach every scene.
- An archetype may declare `kits: [...]` (its defaults) and `slots: [{ id:
  'landmark', layer, x, y, s }]` (where params' `landmarks` go).
- Types:
  - `id`: `/^[a-z0-9-]{1,40}$/`
  - `sign`: passes `sceneSignText` (8.3)
  - `list`: in a table, `|`-separated
  - `number`
  - an array means an enum
- An unknown enum value is a problem in `sceneArchetypeCheck(id, row)`. The
  build falls back to the first value, so the app never breaks.

**`sceneFromArchetype(archId, params, patch)`** (builder A, core, pure) is
how ONE scene is made from an archetype plus its own touches (an upgraded
region scene, section 16; a hand-tuned London terminus). It returns scene
data:

1. `data = archetype.build(params, u)`, then `data.arch = { id: archId,
   params }`.
2. The patch is applied:
   - `place`, `scatter`, `actors`, `flocks`, `signs`, `ground`, `water`:
     APPENDED to the archetype's arrays.
   - `drop: { place: [objId | index], scatter: [index], actors: [index] }`:
     removes archetype entries first (an object id drops every placement
     of it).
   - `view` is merged shallowly; any other top-level key (`sky`, `palette`,
     `at`, `layers`, `particles`, `weather`, `camera`, `setting`, `tropic`)
     REPLACES the archetype's.
3. `sceneValidate` runs on the result (problems are thrown in Node and
   logged once in the browser).

It is memoised per `(archId, params object, patch object)`. Scene data from
`sceneFromArchetype` is what `scene upgrade` scaffolds (16.3): small (the
params and the patch, not thousands of placements), and the archetype's
improvements reach every scene built from it.

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

### 8.5 Region archetypes (for the upgrade path)

About 13 archetypes cover most of the ~220 hand-drawn region scenes. Their
INDEX is data in `src/app/70-scene-arch-0list.js` (builder C, this round):

```js
SCENE_ARCHETYPE_INDEX = [
  { id: 'skyline-water', what: 'a city skyline over a bay, harbour or wide river', hints: ['skyline', 'bay', 'harbour', 'towers', 'tower', 'river', 'waterfront', 'supertrees', 'bridge'], water: 'bay', setting: 'urban' },
  ...
]
SCENE_REGION_PARAMS = { id: 'id', lat: 'number', lon: 'number', heading: 'number', at: SCENE_MOMENTS,
  climate: ['temperate', 'tropical', 'arid', 'alpine', 'mediterranean', 'polar'], kits: 'list', landmarks: 'list',
  water: ['none', 'bay', 'river', 'lake', 'sea', 'pond', 'canal'], horizon: 'number', density: 'number', palette: 'object' }
```

Every region archetype takes `SCENE_REGION_PARAMS` (`palette` is the scene
palette that `scene upgrade` lifts from the old art, so the new scene keeps
its colour identity). Its build is `sceneArchetypeDefine(id, { params:
SCENE_REGION_PARAMS, kits, slots, meta: () => null, build })`. Region
archetypes have no `meta`: the region entry supplies the item fields (16.2).

| id | for | layers used (at least 5) | landmark slots | fill (by kit role) | movers (at least 15) |
|---|---|---|---|---|---|
| `skyline-water` | Singapore, New York, Hong Kong, Shanghai, Sydney, Chicago | horizon towers, far towers, mid landmark row, near promenade, fore planting, front framing tree | 1 to 3 in mid | `building-far` x 40 to 80 (generator variants), `tree`, `ground` on the promenade, `street` | boats 4 to 6, a ferry, gulls, cars on a bridge, up to 8 tiny walkers |
| `river-city` | Bangkok, Paris-style river towns | far skyline, mid far bank, water, near bank, fore | 1 to 2 on the far bank | `building-mid`, `tree`, `edge` | longtails and barges, egrets and gulls, a few tiny walkers |
| `harbour` | Mumbai, Busan, working ports | far hills, mid quays and cranes, water, near quay, fore | 1 | `building-mid`, `street` | boats 6+, gulls, cranes turning |
| `historic-street` | Macau, Hoi An, Charleston, old towns | far roofs, mid facades row, street, near facades, fore | 1 at the vanishing point | `building-near` (shophouse, brownstone, colonial), `street`, `ground` planters | vehicles, cyclists, pigeons, swifts, lanterns, up to 8 tiny walkers |
| `plaza` | the Vientiane stupa, Durbar Square, old-town squares | far skyline, mid landmark, plaza, near edge, fore | 1 central | `tree`, `street`, `ground` | pigeons, sparrows, a fountain, up to 8 tiny walkers |
| `temple-mountain` | Mount Fuji with a pagoda, Gergeti, Khor Virap | horizon mountain (landmark or terrain), far ridges, mid temple, near slope, fore | 2 (mountain, temple) | `tree` (cherry, maple, cedar), `ground`, `building-mid` | birds, lanterns flicker, petals or leaves, cloud shadows, a few tiny walkers on the steps |
| `temple-water` | Wat Arun, Angkor Wat, the Chennai tank, Kaohsiung | far sky band, mid temple, water with reflection, near bank, fore | 1 to 2 | `tree` (palms), `edge` (lotus, reeds) | boats, egrets, kingfishers, fish rings, a few tiny figures in boats |
| `desert` | Grand Canyon, White Sands, Petra, Wadi Rum | horizon mesas, far, mid, near, fore | 0 to 1 (a natural landmark) | `rock`, `shrub`, `ground` (arid) | birds of prey, lizards, a hiker line, dust devils |
| `beach-coast` | the Maldives, Virginia Beach, Big Sur | horizon sea, far headland, mid surf, beach, fore | 0 to 1 (pier, lighthouse) | `tree` (palms), `ground`, `edge` | surf rows, boats, gulls, dolphins, a few tiny walkers |
| `mountain-lake` | Maroon Bells, alpine lakes | horizon peaks, far forest, lake with reflection, near shore, fore | 1 (a peak) | `tree` (spruce, larch), `rock`, `ground` | canoes, ducks, elk, birds |
| `park` | Central Park, Gardens by the Bay, city parks | far skyline, mid trees, lawn, near paths, fore | 0 to 2 | `tree`, `ground`, `street` | dogs, birds, squirrels, a kite, a few tiny walkers and joggers |
| `snow-town` | Anchorage, Hokkaido, alpine villages | far peaks, mid town, near street, fore, sky aurora | 0 to 1 | `building-mid` (lit), `tree` (snow spruce) | sleds, chimney smoke, snowfall, ravens, a few tiny walkers |
| `plains` | prairie, farmland, rice terraces, savannah | horizon, far fields, mid farm, near crop rows, fore | 0 to 1 (a barn, a lone tree) | `ground` (crops), `tree`, `animal` | animals, a tractor, birds, wind waves over the crop |
| `station` | London rail stations (section 11) | far terraces / towers, mid station, street, platform, fore | 1 (the station building) | `building-far`, `street`, `ground` (planters, hedges) | a bus, a train, cars, pigeons, up to 10 walkers (sized by the depth ladder, 2.8) |

**The care rules hold for composed scenes too** (`CARE_RULES` in
`tools/lib/anim-region.mjs`). Life comes mostly from animals, birds, boats
and ordinary vehicles. People are anonymous, FACELESS silhouettes (no eyes,
nose, ears or mouth, no portraits, nobody identifiable), used as a scale cue
and sized by the depth ladder (2.8): `person.*` objects are tagged
`silhouette`, have at most 180 shapes in variant 0 (the size tier drops the
fine ones far away), and are placed at most 150 world units tall (the
ladder's cap, in the near foreground). The
`composed` lint enforces `people` at most 8 per region scene (10 for
`station`) and `crowd`: no 4 people within 120 units of each other. No
flags, emblems, holy figures or brands in any object. Region upgrades have
NO signs (the region care rules forbid text): the signage exception (8.3)
applies only to scenes with `signage: true`, which an archetype that
declares `signs: true` (`station`, and later the London pack's) sets. The
lint fails a sign anywhere else.

This round only `basic` (the generic fallback) and `station` are BUILT
(builder C, section 11); the index lists
all of them so `scene upgrade` can suggest one (16.3). The convert stage
builds `skyline-water` and `temple-mountain` (section 17); the others follow
as upgrades need them, each in `src/app/70-scene-arch-<id>.js`.

### 8.6 How archetypes pick objects (order never matters)

Library files load in file-name order, and a new file can sort anywhere
(`-` sorts before `.`, so `...-more.js` loads before `....js`). An archetype's
output must therefore be a function of the scene's own params (its id) and
of the SET of objects eligible by kit and role, never of load order:
`sceneKitPick` keys its result in id order, so a scatter's weighted mix is
order-free, and every FIXED slot (the framing trees, the lamp, the bench,
the lanterns, the boats, the flock birds, the vehicles, the walkers' order)
comes from `sceneSlotRank(w, '<scene id>|<slot>')` (or `sceneSlotPick`, its
first): a weighted rendezvous hash of (slot key, object id). A new object
moves a slot only when it is eligible for that slot's kit and role AND wins
the hash there; adding or removing any other object moves nothing. A light
`weight` (0.3) makes a heavy object rare in slots and scatters alike;
`weight: 0` keeps it out. Tests register the library reversed and shuffled
and require identical compiled pilots and station demo
(`tests/scene-core.test.mjs`). A scatter rule's `maxH` (units) caps the
placed height of each of its objects by scaling that object's placements
down together (their spread kept); `skyline-water` and `basic` cap their far
row at 0.8 (`skyline-water` its horizon haze at 0.5) of the horizon-to-top
space, so a 1,700-unit tower never overtops the sky or the landmarks.

A scene that must not move at all (a GOLD scene near its tile budget) names
its own picks in its PATCH, never its params row (a row stays under
`rowBytes`): `picks: { <slot>: [ids] }` puts those ids first in that slot,
in that order (`u.slot`), and `mix: { <role>: { id: weight } }` replaces the
kit's dict for that role, in the scene's own order and weights (`u.mix`).
Both are cut to the ids the archetype allows there (kit, role, its own
filters); a named id that is gone or not allowed falls back to the hash or
to the kit's dict. The pilots name their framing trees, lamps, lanterns and
their heaviest mixes this way, and the `station` archetype names London's
dock boats, town birds and the avenue plane first for every station.

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
`anim-pack.mjs` is edited only for the `composed` routing in `lintRegistry`,
the `--at` / `--location` / `--season` options and the usage header.

```
object new <cat>.<name> [--kit "<K call>"] [--variants N] [--kits a,b] [--role r]   scaffold (2.6) into 70-scene-lib-<plural>[-<kit>].js
object lint [<id>,...] [--json]                                     section 2.6 rules
object sheet <id>[,...] [--out dir] [--canvas] [--mode light|night]  variants x seasons (+ night, + lit) grid, size strip, 3 animation phases
object list [--category c] [--kit k] [--role r] [--tag t]           id, category, kits, role, variants, seasons, parts, anim kinds, used by N scenes
object import <file-or-folder> --id <id> [--size WxH] [--kit k] ...   a RASTER object from images (docs/dev/OBJECT_IMPORT.md)
object import-batch <folder> [--manifest m.csv] [--dry-run] [--force]  many raster objects from ONE CSV (rows with `rows` set are sheets)
object import-sheet <sheet.png> --id <id> --rows N [--frames K]       one AI sprite sheet -> a raster object with real seasons, night, lit and frames
object template [--rows 2] [--frames 4] [--examples]                the blank sheet template, example sheets and the prompt pack
scene new <pack> <id> [--brief file.md | --archetype <id> --row '<json>'] [--lat .. --lon .. --heading ..]   writes 71-scene-<pack>-<n>.js (+ the pack file if missing)
scene upgrade <ref> [--archetype <id>] [--box x0,y0,x1,y1 | --landmark <obj id>] [--slug s] [--dry-run] [--force]   section 16.3
scene lint [<ref>,... | --pack <id> | --region <id> | --archetype <id> --table <id> [--rows N]] [--upgrades] [--perf] [--json]
                                                                    the composed profile: data, bar (15.2), variety, care; exit 2 on a failure
scene sheet [<ref>,... | --pack | --region | --archetype --table [--sample N]] [--times] [--seasons] [--compare] [--crop phone|square] [--contact] [--svg] [--upgrades]
                                                                    canvas render in headless Chrome; --compare: old vs new (16.4)
scene perf [<ref>,... | --pack | --region | --archetype --table [--sample N]] [--seconds 3] [--gpu] [--rebake] [--upgrades] [--json]
                                                                    drawMs and dynMs in the real renderer (--rebake forces a light change mid-run and reports the worst frame)
scene capture <ref> [--seconds 3] [--fps 12] [--width 640] [--at <ISO> | --mode light|night] [--date D] [--dither] [--frames] [--upgrades] [--out file.gif]
                                                                    a looping animated GIF of one scene, deterministic (10.4)
```

- **Batches.** `--archetype <id> --table <id>` runs over every row of a data
  table (`sceneBatch`); `--sample N` picks N seeded rows (perf and sheet);
  `--rows N` adds N synthetic rows (seeded, in memory) to stress-test an
  archetype. The batch output ends with one summary table: rows, pass, fail,
  the worst `animatedDraws`, the worst `dynMs`, mean placements, mean data
  bytes, and the 5 rows nearest to failing. This is how a London pack of
  hundreds of stations is linted, timed and looked at in one go.
- `--upgrades` includes DRAFT upgrades (16.2): `scene lint <ref> --upgrades`
  lints the draft's composed scene instead of the legacy art.
- `--region <id>` is every pack of a region.
- `--times` renders dawn, noon, golden hour, dusk and night, found from the
  real sun at the scene's lat/lon on `--date` (default today):
  `sceneTimesFor(lat, lon, dateISO)` in `tools/lib/scene-times.mjs`
  (builder C) scans the sun altitude in 5-minute steps with the almanac (dawn:
  -3 degrees rising; noon: the maximum; golden: 6 degrees setting; dusk: -4
  degrees setting; night: the minimum). `--seasons` renders all four (the
  15th of January, April, July and October; flipped south of the equator).
- The existing `lint` and `sheet` accept `--at <ISO>` and
  `--location lat,lon` (live sky; retrofit overlay included), and
  `--season <s>`.
- `status` and `reference` change as section 15 says.
- `brief` (the reviewer's edit, 10.3) accepts `--kind object|composed|archetype|upgrade`, using the new
  templates `tools/lib/anim-templates/{object-brief.md,
  composed-scene-brief.md, archetype-brief.md, upgrade-brief.md}`. The
  hand-drawn `--kind scene` brief gains a first line: "Hand-drawn scenes are
  the LEGACY tier; prefer `--kind composed` or `--kind upgrade`."

### 10.1 The page harness (`tools/lib/scene-page.mjs`, builder B; used by C)

```js
scenePageHtml({ root, refs | data, size: { w, h }, dpr: 1, mode: 'light' | 'dark', at: ISO | null, location: [lat, lon] | null,
                season, still, renderer: 'canvas' | 'svg', upgrades: false, compare: false })
  // a self-contained page: the animation registry files (animRegistryFiles) + 70-scene-* + 78-scene-canvas.js + 78-scene-host.js,
  // the app css the scenes need (reg.pageCss()) + 76-scene.css; mounts each scene in a box of `size`; window.__sceneReady resolves after the first bake
  // upgrades: true mounts a DRAFT upgrade's composed scene (item.upgrade.scene) instead of the legacy art
  // compare: true mounts, per ref, TWO boxes side by side with a 1-line caption each ("old: hand-drawn (legacy)" / "new: composed"):
  //   left the legacy art (item.legacySvg wrapped by sceneRetrofit for a live upgrade, else item.svg; through animItemHtml: the retrofit overlay at the same sky),
  //   right the composed scene (live, or the draft's) on the canvas renderer, both at the same `at` / `location` / `season`
sceneRenderPng(chrome, opts, file)    // waits for __sceneReady, screenshots
scenePerf(chrome, opts)               // waits, runs `seconds` of rAF, returns window.__sceneStats():
                                      // { drawMs, dynMs: { median, p95, max, n }, firstBakeMs, bakeMs, sprites, spriteBytes, bitmaps, blitPx, animatedDraws, actors }
```

Chrome comes from `tools/release-chrome.mjs` `launchChrome({ port })`. The
debug ports are 9331 to 9333 for the builders. Every caller closes Chrome in
a `finally` and waits for the process to exit before it removes the profile
directory (see the crash note in section 14).

### 10.2 The `composed` lint profile (`tools/lib/scene-lint.mjs` + `tools/anim-quality.json` "composed")

**Routing.** `profileFor(it)` returns `'composed'` when `it.composed`. This
is checked first, before `scene-rich`. The thresholds are DESIGNED, not
calibrated: `"composed": { "designed": true, ... }`, which `calibrate`
skips until the convert stage re-bases it (15.4).

The profile has four rule groups, all in `lintScene(dataOrItem, thresholds,
{ perf, item })`: the DATA and PERF rules (below), the BAR rules (15.2), the
VARIETY rule (below) and the CARE rules (8.5).

**Data rules** (from `sceneCompile` stats at LOD 1, in the default season):

| rule | limit |
|---|---|
| `placements` | at most 8,000 (static placements are free per frame, 6.3; this bounds the bake and the memory) |
| `animatedDraws` (animated parts + strips + actor parts + flock birds) | at most 300 |
| `actors` | at most 40 |
| `flockBirds` | at most 30 |
| `particles` | at most 250 |
| `layersUsed` | 5 to 8 (the bar) |
| `bitmaps` (bake groups including the sky) | at most 6 |
| `distinctSprites` | warn above 300, fail above 600 |
| `spriteMB` (estimated at dpr 2) | at most 64 |
| `dataBytes` (`JSON.stringify` of the scene; for `sceneFromArchetype` and table rows: the params plus the patch) | at most 24,000 |
| `svgFillBytes` | at most 1,000,000 |
| `svgTileBytes` | at most 150,000 |
| `signs` (text rule 8.3, deny-list, at most 6; none unless `signage: true`, never in a region upgrade) | required |

**Perf rules** (`scene perf`, or `scene lint --perf`; skipped with a note
when there is no Chrome; measured at 1600 x 900, dpr 1, over 3 s):

| rule | limit (`--gpu`) | limit (software raster, the default in headless Chrome: x `swFactor` 1.75) |
|---|---|---|
| `dynMs.median` (the animated part of the frame) | at most 6 | at most 10.5 |
| `drawMs.median` (the whole frame) | at most 8 | at most 14 |
| `drawMs.p95` | at most 12 | at most 21 |
| `firstBakeMs` | warn above 300, fail above 600 | warn above 525, fail above 1,050 |

**The placement-variety rule** (`variety`). This replaces the shared-shape
penalty for composed scenes: REUSE of library objects is GOOD. What is
measured is how varied the placements are:

- **Per object** placed 6 or more times:
  - `scaleSpread`: (p90 - p10) / median of s, at least 0.25
  - `flipShare`: within 0.2 to 0.8 (flippable objects only)
  - `variantUse`: distinct variants at least min(variants, 2)
  - `tintUse`: at least 2 tint buckets when placed 20 or more times
  - `grid`: the share of nearest-neighbour distances within 5 % of the
    median, at most 0.5 (no rows or stamps). Objects tagged `row` (a
    terrace, a track, a fence) are exempt.
- **Per category** with 15 or more placements: `species` (distinct ids) at
  least 2, and `topShare` at most 0.8.
- **`stacked`**: no two placements of the same (obj, v, flip, scaleBucket)
  within 6 units. A fail.

The output form matches the friend's lint: PASS / FAIL per rule, thin spots,
and `--json`. The last line is `PASS: <n> items clean.` or the failures. A
composed scene that passes prints `GOLD` after its ref.

### 10.3 Briefs and the skill (written by the reviewer after the merge, section 14 step 10)

These are written once the commands exist, so they quote real output. The
builders only leave notes for them in their reports.

**Templates** (`tools/lib/anim-templates/`):

- `composed-scene-brief.md` tells an agent to:
  1. Read this spec's sections 3, 5 and 15.
  2. Run `reference` and render the bar (`reference --render`); that is the
     look to match.
  3. Run `object list --kit <kit>` and compose from the library, starting
     from an archetype when one fits (8.5).
  4. Add objects only when the subject truly needs a new one (`object new`,
     `object lint`, `object sheet`), with the kit and role tags (2.7).
  5. Run `scene lint`, `scene sheet --times --seasons` and `scene perf`.
  6. Report the bar, variety and perf numbers, and paste the last lint line.
- `upgrade-brief.md` (one scene or a batch of up to 7 with the same
  suggested archetype): `scene upgrade <ref> --box ...`, refine the landmark
  (the checklist in 16.3), compose around it, then `scene sheet <ref>
  --compare --upgrades`, `scene lint <ref> --upgrades --perf`, and set
  `state: 'live'` only when it passes. It quotes the care rules.
- `archetype-brief.md` covers the data table, batch lint / perf / sheet and
  the legal note (8.4).
- `object-brief.md` covers the object rules (2.6), the kits (2.7) and the
  sheet.

**The skill.** `.claude/skills/animation-pack/SKILL.md` gains a "Composed
scenes, the object library and the new standard" section, plus
`references/scene-engine.md` (a one-page cheat sheet of sections 2, 3, 10,
15 and 16).

- The bar (section 15) is the gate for all NEW scenes. Hand-drawn scenes
  are legacy and are only maintained, not added.
- The LOOK gate stays: sheets in light and night, in all four seasons, and
  `--compare` for upgrades.
- The CARE rules gain the signage exception (8.3), the legal note (8.4) and
  the people rule for composed scenes (8.5).

**Docs.**

- `docs/dev/ANIMATION_PACKS.md` gains a "Composed scenes and the new
  standard" section that points here.
- `MODULES.md` gains rows for every new file.

### 10.4 Scene capture (`scene capture`, `tools/lib/scene-capture.mjs`)

```
node tools/anim-pack.mjs scene capture uk-south-east/hampshire-yateley-green-2 --at 2026-10-07T17:25:00Z
  -> .anim-ref/capture/uk-south-east__hampshire-yateley-green-2.gif   640 x 360, 36 frames at 12 fps, 255 colours, about 0.4 MB
```

A few seconds of ONE composed scene as a looping animated GIF, with no
dependencies: headless Chrome draws the frames, Node (`node:zlib`) does the rest.

- **Deterministic.** The scene loads once through the page harness (10.1) in a
  box of `--width` x 9/16 of it; the host's clock is stopped and frame k is
  drawn with the renderer's own `frame(k / fps)`, then captured. The time does
  not depend on the machine's speed, so the same command writes the same bytes.
  The loop jumps from the last frame back to t = 0 (the scene's motion is not
  periodic).
- **The sky.** `--at <ISO>` is the live sky of that moment at the scene's place
  (or `--location lat,lon`); `--mode night` takes the real night moment on
  `--date` (default today) and a dark page; without either, the authored moment.
- **Encoders** (each exported and tested in `tests/scene-capture.test.mjs`):
  `pngDecode` (8-bit RGB / RGBA, all five filters), `quantise` (variance-based
  median cut over a sample of every frame, then 3 k-means steps: one global
  palette of up to 256 colours), `indexFrame` (nearest colour with the same
  channel weights, optional 4 x 4 ordered dither with `--dither`, off by
  default), `lzwEncode` and `gifEncode` (GIF89a, NETSCAPE2.0 loop, delays from
  fps in 1/100 s: 8, 9, 8 at 12 fps). After the first frame only the changed
  rectangle is stored, unchanged pixels transparent (255 colours + 1).
- **Looking at it.** `--frames` also writes every frame as the viewer sees it
  (after quantising) to `<out>-frames/frame-NNN.png`. Banding in a smooth sky
  is the usual defect of a 256-colour GIF; `--dither` trades it for a fine
  pattern.
- Output stays out of the repository: `.anim-ref/` is git-ignored.

## 11. The demo (builder C)

- `src/app/70-scene-data-london-demo.js`:
  - `sceneLinesDefine` for the six lines the three rows use (Bakerloo,
    Circle, Hammersmith and City, Jubilee, Metropolitan, Piccadilly), with
    the public colours
  - `sceneTableDefine('london-demo', ...)` with the 3 rows of 8.2
- `src/app/70-scene-arch-basic.js`: `sceneArchetypeDefine('basic', ...)`,
  the GENERIC archetype that takes `SCENE_REGION_PARAMS` (8.5). It is the
  fallback of `scene upgrade` while the suggested archetype is not built yet
  (16.3), and `station` builds on it.
  - Six layers: a horizon band and a far band from `palette` (or the
    climate's defaults), a mid band, near and fore ground, a front framing
    layer.
  - Water from `water` (a band between the mid and near layers, with
    reflection, shimmer and the light path).
  - Landmark slots: one landmark centred in mid; two at x 560 and 1080;
    three spread. Each at the scale that makes it about 380 units tall.
  - Fill by role through `u.kit`: `building-far` along the far band (when
    the kits have any), `tree` scatter in mid and near, dense `ground`
    scatter in near and fore (wind strips), `edge` along the water, `bird`
    flocks, `boat` actors on water, `vehicle` actors on a road band when
    `setting` is urban, up to 6 `walker` actors.
  - `density` (default 1) scales every scatter `n`.
- `src/app/70-scene-arch-station.js`: `sceneArchetypeDefine('station', {
  signs: true, ... })`, built as `basic` plus the station:
  - The building by era: `victorian` uses `building.station-victorian`,
    `holden` uses `building.station-holden`, `jubilee-modern` uses
    `building.station-modern`, and the others fall back to victorian. It is
    the signature (tagged `signature`).
  - A board sign with the name and the line bars (8.3).
  - A street and a platform band; lamps, benches, planters and hedges as
    the dense urban ground cover.
  - Plane-tree scatter (`plane-trees`, `trees`, `suburb`).
  - Far-layer terraces (`terrace`, `suburb`) or towers (`towers`).
  - A dock water area with reflections (`water`).
  - Movers (at least 15): up to 8 walker actors, a bus actor (`bus`), a
    train on the platform side, a pigeon flock of 6, and pecking pigeons
    (`turn`) on the pavement.
  - Sky, seasons and weather all automatic.
- `src/app/72-anim-pack-scene-demo.js`:
  `animRegisterPack({ id: 'scene-demo', name: 'Scene engine demo', items:
  sceneBatch('station', 'london-demo', { when: () => false }) })`.
  - The items appear in the gallery, but never in the daily rotation,
    because their `when` is false.
  - Their tags include `demo`.

**Acceptance:**

- `scene lint --pack scene-demo` passes the WHOLE composed profile,
  including the bar (15.2): an archetype batch can reach the new standard.
- `scene perf --pack scene-demo` meets 10.2.
- `scene sheet --pack scene-demo --times --seasons --contact` shows three
  clearly different stations: era, line colours and surroundings.
- `scene lint --archetype station --table london-demo --rows 200` runs the
  batch and prints the summary table.
- The gallery stage plays each one through the canvas host with no console
  errors.

## 12. Budgets (one table)

| what | limit | enforced by |
|---|---|---|
| frame, 1600 x 900, normal laptop or `--gpu` | `drawMs` median at most 8 ms, p95 at most 12 ms | `scene perf` |
| dynamic part of the frame (animated sprites and effects) | `dynMs` median at most 6 ms (`--gpu`) | `scene perf` |
| headless software raster | the two rows above x `swFactor` (1.75): 14 / 21 / 10.5 ms | `scene perf` default |
| first bake | at most 300 ms (warn), 600 ms (fail); x 1.75 in software | `scene perf` |
| re-bake slice | at most 8 ms per idle slice; no frame over 16 ms while re-baking | renderer design, `scene perf --rebake` |
| animated draws per frame | at most 300 | `scene lint` |
| static placements | at most 8,000 (free per frame; bounded for bake time and memory) | `scene lint` |
| bake bitmaps | at most 6 including the sky, each cropped to its content | `scene lint`, renderer |
| sprite cache | 96 MB LRU (all hosts); one scene at most 64 MB at dpr 2 | renderer / `scene lint` |
| backing store | at most 2560 x 1440 device px | renderer |
| scene data | at most 24 KB; archetype row at most 400 B | `scene lint` |
| SVG fallback (a still) | at most 1 MB at fill, at most 150 KB at tile | `scene lint`, `tests/anim-packs.test.mjs` |
| object | at most 600 shapes, at most 60 KB path data, at most 25 ms build per (v, season) | `object lint` |
| landmark | at least 80 shapes, at most 600; night-lit (`lit` or 10+ glow shapes) | `object lint` |
| retrofit overlay | at most 6,000 B; none without a live sky | `tests/scene-retrofit.test.mjs` |
| people | at most 8 per region scene (10 per station), no 4 within 120 units; faceless silhouettes of at most 180 shapes (variant 0), at most 150 units tall (the depth ladder, 2.8) | `scene lint` (care) |

## 13. Ownership map

Every file has exactly one owner. Shared files that NOBODY edits this round:

- `build.mjs`, `package.json`, `serve.mjs`
- `71-anim-continuity.js`, `78-anim-wire.js`, `78-anim-gallery.js`,
  `12-home-w-animday.js`
- `71-anim-uk-nature-kit.js`
- all hand-drawn scene files (`71-anim-*-scenes-*`, `71-anim-texas-scenes.js`)
  and all `72-anim-pack-*` files except the demo
- `.claude/skills/**`, `docs/dev/ANIMATION_PACKS.md`, the brief templates
  (the reviewer writes them, 10.3)

If one of these needs a change, ask in your report instead.

### Builder A: the engine core (pure), retrofit, selection, the upgrade registry, integration hooks

| file | what |
|---|---|
| `src/app/70-scene-0core.js` (new) | constants (`SCENE_W/H`, `SCENE_CATEGORIES`, `SCENE_ANIM_KINDS`, `SCENE_LAYERS_DEFAULT`, `SCENE_MOMENTS`, `SCENE_SETTINGS`); `sceneHash`, `sceneRnd`, `sceneD`; the object registry `sceneObjDefine / sceneObj / sceneObjs / sceneObjShapes / sceneObjCheck`; `sceneKit`, `sceneSeason`, `sceneLight`, `sceneTone`, `sceneColour`, `sceneWind`, `sceneScaleBucket`; `sceneValidate`, `sceneCompile`, `sceneData`; `sceneItem`, `sceneAdd`, `sceneItems`; `sceneArchetypeDefine / sceneArchetype / sceneArchetypeCheck`, `sceneFromArchetype` (8.1), `sceneKitPick` (2.7), `sceneTableDefine / sceneTable`, `sceneBatch`, `sceneLinesDefine / sceneLine`; `sceneSignText`, `SCENE_SIGN_FONT`, `SCENE_SIGN_DENY` |
| `src/app/70-scene-retro.js` (new) | `sceneRetrofit`, `sceneRetrofitSvg`, `SCENE_RETRO_DEFAULTS`, `SCENE_RETRO_MAX_BYTES` |
| `src/app/70-scene-select.js` (new) | `sceneSelectRuleDefine`, `sceneSelect`, the rules `nearest` and `dense`, `SCENE_SELECT_DENSE_DEFAULTS` |
| `src/app/71-anim-0region.js` (edit) | `cfg.retrofit`, `entry.retro`, `liveSky` on full items (7.3); `animRegionSceneUpgrade`, the upgrade store, the draft / live merge and `region.upgrades()` (16.2); orphan upgrades in `region.check()`; `cfg.select`, `region.select(ctx)`, the `placeWhen` and `unitWhen` hook, extra row kinds (9.4) |
| `src/app/71-anim-registry.js` (edit) | `animValidatePack` (`composed`, `scene`, `retro`, `upgrade`); the composed branch in `animItemHtml` (6.2); doc comment lines |
| `tools/lib/anim-sources.mjs` (edit) | `SCENE_FILE_RE = /^7[01]-scene-[a-z0-9-]+\.js$/`, included in `animRegistryFiles` (this covers `70-scene-*`, `71-scene-<pack>-N` and `71-scene-upgrade-*`) |
| `tests/scene-core.test.mjs` (new) | object define, check and shapes; compile determinism and LOD; scatter minGap and masks; tone parity with `K.toneStr`; seasons (north, south, tropic); wind; archetype, table and batch (thunks not built at load); `sceneFromArchetype` patch semantics (append, drop, replace, view merge); `sceneKitPick` (tags, weights, empty-safe); `sceneSignText` deny-list and escaping; `sceneItem` passes `animValidatePack` |
| `tests/scene-retrofit.test.mjs` (new) | no `o.sky` gives byte-identical art for every US and Asia scene; with a night sky: the overlay is at most 6,000 B, there is a moon with the real phase, and the lamps are copied above the grade; region items carry `liveSky` |
| `tests/scene-upgrade.test.mjs` (new) | with a fake region and a fixture upgrade (inline test objects): a draft keeps the legacy item byte-identical and adds `upgrade`; a live upgrade gives a composed item with the SAME id, kind / unit / place fields, label, site, tags, priority and `when`, plus `legacySvg`; a live upgrade is not retrofitted; an upgrade with no scene entry is reported by `region.check()`; nothing is built at load (thunks) |
| `tests/scene-select.test.mjs` (new) | arrival (dwell; fresh fix), the station just arrived at wins; journey after 4 stations; rotation weights (commute less, new more, recent less) and seeded stability; fallback to area, borough and region; a fake dense region through `region.select` and `placeWhen` |

Time box (about 2 h 15): core (55 min), retro (20), select (15), region and
registry hooks with the upgrade registry (20), tests (25). Cut list if over
time (say so in the report; the reviewer finishes it): the journey result of
the dense rule; radial gradients in `sceneColour`; the camera pan.

A stubs nothing from B or C. `sceneItem`'s `svg` calls `sceneSvg` (B). Until
B lands, A's tests call `sceneCompile` directly, and `animItemHtml` for
composed items is tested with a `typeof sceneSvg === 'function'` guard. A's
kit-based tests wait for C's `70-scene-0kit.js`: guard them with `typeof
sceneObjFromKit === 'function'` and use native inline objects otherwise.

### Builder B: the renderers, the host, CSS, the page harness

| file | what |
|---|---|
| `src/app/70-scene-svg.js` (new, pure) | `sceneSvg` (one still frame, 6.5), `sceneRendererFor`, `sceneHostAttrs`, `sceneSvgCss` (returns ''), the sign drawing (SVG) |
| `src/app/78-scene-canvas.js` (new, browser) | `sceneCanvasSupported`, `sceneRendererCreate`, `sceneSprites` (6.3); the sign drawing (canvas); sky, clouds, stars, water, reflections, lit parts, particles, weather; cropped bitmaps; the `drawMs`, `dynMs` and `blitPx` stats |
| `src/app/78-scene-host.js` (new, browser) | mount and unmount, renderer reuse by key, ResizeObserver, IntersectionObserver, visibility, hold and rest, hover, re-light timer, fallback to SVG, `sceneHostScan`, `window.__sceneStats` (6.4) |
| `src/styles/76-scene.css` (new) | 6.6, including the retrofit classes A's overlay uses (`sr-retro`, `x-srtw`, `x-srfall`, `x-srglow`) |
| `tools/lib/scene-page.mjs` (new) | `scenePageHtml` (with `upgrades` and `compare`), `sceneRenderPng`, `scenePerf` (10.1) |
| `tests/scene-render.test.mjs` (new) | Node: `sceneSvg` is deterministic apart from fresh ids, has the slice viewBox via `animItemHtml`, fits the budgets, has the sign `<text>` only in `g.sc-sign`, draws `lit` parts only when lit, and LOD thins; `sceneRendererFor` table; host markup; the compare page has two boxes per ref. Chrome (skipped when `findBrowser()` is null; use port 9332): a fixture scene renders non-blank, a still frame equals a frame at t = 0, and `drawMs` and `dynMs` are reported. |
| `tests/fixtures/scene-compiled.json` (new) | a hand-written COMPILED fixture (section 4 form) |

B develops against the fixture, with about 10 inline test objects via
`sceneObjDefine` in the test, until A lands. Time box (about 2 h): SVG still
renderer (20 min), canvas bake and frame (60), host (25), harness with
compare, and tests (25). Cut list: `--rebake` mode, hover play, the camera
pan, weather particles beyond rain and snow.

### Builder C: the library, the kits index, the demo, the tool, the lint, the standard

| file | what |
|---|---|
| `src/app/70-scene-0kit.js` (new, pure) | `sceneShapesFromSvg` (with `flatten` and `bb`, 2.3), `sceneObjFromKit`, `KIT_PARTS` |
| `src/app/70-scene-arch-0list.js` (new, pure data) | `SCENE_KITS`, `SCENE_ROLES`, `SCENE_REGION_KITS` (2.7), `SCENE_ARCHETYPE_INDEX`, `SCENE_REGION_PARAMS` (8.5) |
| `src/app/70-scene-lib-trees.js`, `-plants.js`, `-birds.js`, `-people.js`, `-vehicles.js`, `-buildings.js`, `-street.js`, `-rail.js` (new) | the starter set (2.3) |
| `src/app/70-scene-arch-basic.js`, `src/app/70-scene-arch-station.js`, `src/app/70-scene-data-london-demo.js`, `src/app/72-anim-pack-scene-demo.js` (new) | the generic archetype and the demo (section 11) |
| `tools/lib/anim-cmd/object.mjs`, `tools/lib/anim-cmd/scene.mjs` (new) | the commands (section 10) |
| `tools/lib/scene-upgrade.mjs` (new) | `suggestArchetype(item)`, `extractLandmark(markup, box, R)`, `paletteOf(shapes)`, `upgradeScaffold(ref, opts)` (16.3) |
| `tools/lib/scene-times.mjs` (new) | `sceneTimesFor(lat, lon, dateISO)`, `seasonDates(lat, year)` (section 10) |
| `tools/lib/scene-lint.mjs` (new) | `lintScene(dataOrItem, thresholds, { perf, item })`, `lintObject(id)`, `placementVariety(compiled)`, `barMetrics(compiled, data)` (15.2), `careCheck(compiled, data, item)` (8.5), `retroCheck(markup)`, `standardOf(entry, lint, perf)` (15.3) |
| `tools/anim-quality.json` (edit) | the `composed` profile (`designed: true`) with its data, perf (`swFactor`), bar and variety thresholds; an `object` section; a `standard` block (15.3) |
| `tools/anim-reference.json` (edit) | the `bar` list and the `_about` text (15.1); `scenes` stays (now the legacy exemplars) |
| `tools/lib/anim-quality.mjs` (edit) | `profileFor` gives `composed` first; `RULE_PLAN.composed`; `calibrate` skips designed profiles; `structure` allows `<text>` only in `g.sc-sign` for composed |
| `tools/anim-pack.mjs` (edit) | `lintRegistry` routes composed items to `lintScene`; legacy results carry `tier: 'legacy'`; `--at`, `--location` and `--season` on `lint` and `sheet`; `reference` prints the bar first; usage header |
| `tools/lib/anim-cmd/status.mjs`, `tools/lib/anim-region.mjs` (edit) | the STANDARD line and columns, `--standard`, `--all` (15.3) |
| `tools/lib/anim-render.mjs` (edit) | pass `o.sky` (`almSceneLight`) and `o.season` through `reg.html` when given |
| `tests/scene-lib.test.mjs`, `tests/scene-tool.test.mjs` (new) | every object lints (kit and role tags, landmark rules); the parser on 3 kit outputs and on one US and one Asia scene with `flatten` (glow from `us-lit`); demo items pass the whole composed profile; the variety rule on crafted placements (rows fail, stamps fail, varied passes); the bar rules on crafted scenes (4 layers fail, 14 movers fail, no signature fails, 9 people fail); `standardOf`; CLI `object list`, `object lint --json`, `scene lint --pack scene-demo --json`, `scene lint --archetype station --table london-demo --rows 50` (in under 10 s), `scene upgrade asia-southeast/singapore-skyline --box 560,160,1120,640 --dry-run` (suggests `skyline-water`, falls back to `basic`, lists the two files), `status asia --json` has the `standard` block |

C develops library objects and the demo against the API above. Its lint and
CLI tests become green when A lands; its sheets and perf when B lands. Time
box (about 2 h 30, the largest share): kit parser (20 min), library and kits
index (40), basic archetype and demo (25), commands with upgrade (35), lint
with the bar and the standard (30). Cut list: `object list` "used by"
counts, `--rows`, the batch "nearest to failing" rows, `scene new --brief`,
palette lifting in `scene upgrade` (use the climate defaults).

### Order of landing

Each builder works in its own git worktree from the spec commit (`git
worktree add C:/tmp/scene-<x>/wt scene-engine`) on branch `scene-<x>`, and
commits there. The reviewer merges A, then B, then C into `scene-engine`.
Every builder runs `guard --owned <its files>` before its final commit (see
the ground rules for the expected forbidden-file reasons).

## 14. Integration test plan (the reviewer, after the merge)

1. Build: `node build.mjs --syntax`, then `node build.mjs`. Check there are
   no "before initialization" errors at load, either in Node
   (`tests/anim-packs.test.mjs` loads every animation file) or in the
   browser.
2. Tests:
   - Run `npm test` FOUR times. Every run must pass.
   - KNOWN ISSUE to find and fix: `tests/anim-pack-cli.test.mjs` sometimes
     crashes node on Windows (exit 3221225477, `0xC0000005`, an access
     violation) when run in the full suite. It passes alone.
     - Reproduce it with `node --test` (full suite), with
       `--test-concurrency=1`, and with the file alone in a loop of 10.
     - Suspects to check, in this order: the nested `node --test` the file
       spawns (`spawnSync(process.execPath, ['--test', ...])`) while the
       outer runner runs other files in parallel; the many `vm` contexts
       from repeated `loadRegistry()` calls in one process (memory; reuse
       one registry per root where the test does not change files); a temp
       dir removed by `after()` while a child still has it open; headless
       Chrome or another child left running or killed mid-write; a shared
       port or profile dir.
     - Fix the cause in the test or the tool. Never skip the test or remove
       it, and do not paper over it with retries.
3. Existing corpus unchanged:
   - `node tools/anim-pack.mjs lint --pack uk-south-east` is still 208/208.
   - `lint` for every `us-*` and `asia-*` pack still passes (legacy floors).
   - `status us` and `status asia` are complete, and now print the
     STANDARD line: 0 gold, every scene legacy.
   - The retrofit must not change markup without `o.sky`.
4. Library: `object lint` passes. Then `object sheet
   tree.oak,building.station-holden,person.walker --out C:/tmp/scene-review`
   and LOOK at it: the variants differ, the seasons differ (coats in
   winter), and the night column is graded, with lit windows.
5. Demo:
   - `scene lint --pack scene-demo` passes the whole composed profile,
     including the bar.
   - `scene perf --pack scene-demo` meets section 12. Record the measured
     software and `--gpu` numbers; correct `swFactor` in
     `tools/anim-quality.json` if the measured ratio differs from it by
     more than 20 %.
   - `scene sheet --pack scene-demo --times --seasons --contact`: LOOK at
     it. The three stations are clearly different, the sky is real at each
     time, and the signs are plain sans with line bars and no roundel.
   - `scene lint --archetype station --table london-demo --rows 200`
     finishes in under 20 s, and the batch passes.
6. Retrofit, for every region the friend's agent drew (7.4):
   - `sheet --pack us-northeast --at 2026-10-07T21:30:00Z --location
     43.66,-70.26 --mode night` shows the real night sky with the moon in
     its real phase, lit windows and lamps, and no double darkening.
   - `--at` at noon shows the original painted look plus the season tint.
   - Contact sheets at night and at noon for `asia-east`,
     `asia-southeast`, `asia-west`, `us-mountain` and `us-pacific`. Add
     `retro: { sky, horizon }` entries where a skyline needs them.
   - `lint --pack us-northeast --at ...` passes the retro rules.
7. The standard and the upgrade machinery:
   - `reference` prints THE BAR first (the rich Yateley and Fleet scenes),
     then the legacy exemplars.
   - `status --all` prints the tiers for every pack: the rich UK scenes as
     `rich`, the demo as `gold`, everything else as `legacy`.
   - In a scratch copy (`--root <tmp>/scene-review/root`, never this
     checkout): `scene upgrade asia-southeast/singapore-skyline --box
     560,160,1120,640`, then `node build.mjs --syntax`, then `scene sheet
     asia-southeast/singapore-skyline --compare --upgrades` writes old vs
     new at noon and night, and `status asia` counts 1 upgrading. The
     draft need not pass the bar yet.
8. Browser, on port 4391 with test data (`make-test-data.mjs`, never the
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
   - Check a US and an Asia scene at the real time of day: the live grade,
     and the lamps after dusk.
9. Privacy: run `node tools/privacy-scan.mjs`. Grep the diff for anything
   personal; the demo rows are public stations only.
10. Docs: write 10.3 (templates, skill, `ANIMATION_PACKS.md`) and the
    `MODULES.md` rows for every new file; correct this spec where the build
    deviated, and say so in the commit.

## 15. The new quality standard (the bar)

### 15.1 The bar and the gold-standard reference

User decision, 7 Oct: the rich Yateley and Fleet scenes are the bar; a
hand-drawn region scene such as the Singapore skyline "looks bad compared to
the new scenes". A scene looks bad next to them when it is flat (one or two
depth layers), bare (no ground cover), still (a few moving things), generic
(no signature), or lit wrong. The new standard measures exactly those, and
adds performance.

`tools/anim-reference.json` (builder C) gains, without breaking its
readers:

```json
{ "standard": 2,
  "bar": [
    { "ref": "uk-south-east/hampshire-yateley-common-1", "kind": "rich", "why": "...", "tags": ["heath", "depth-layers", "dense-cover", "live-sky"] }
  ],
  "scenes": ["... the hand-drawn exemplars, unchanged: now the LEGACY exemplars ..."],
  "weaker": ["... unchanged ..."] }
```

- This round, `bar` holds six rich hand-drawn scenes, one per place plus an
  evening and a winter view, all in `uk-south-east/`:
  `hampshire-yateley-common-1`, `hampshire-yateley-common-4` (evening),
  `hampshire-wyndhams-pool-1-winter`, `hampshire-yateley-green-2-spring`,
  `hampshire-fleet-pond-1` and `hampshire-fleet-pond-2-autumn`. Each `why`
  says what to match: the depth, the cover, the life and the light.
- The convert stage (section 17) replaces them with their composed versions
  (`kind: 'composed'`) and adds the three pilot upgrades.
- `reference` prints THE BAR first, then the legacy exemplars ("hand-drawn
  craft to learn from; below the new bar"), then `weaker`. `reference
  --render` renders the bar in light, night and the four seasons.

### 15.2 The bar rules (in the `composed` profile)

`barMetrics(compiled, data)` (builder C, `scene-lint.mjs`) measures these
from the compiled scene at LOD 1 in the default season (and in all four
seasons for the season rule). The floors are DESIGNED; `anim-quality.json`
holds them as `composed.bar` so the convert stage can re-base them (15.4).

| rule | measure | floor |
|---|---|---|
| `depthLayers` | layers holding ground, water or placements (the sky not counted) | at least 5 |
| `groundCover` | the band from the horizon + 35 % of the land height down to y 900, in 40-unit columns: the share of columns holding the anchors of at least 3 cover placements (`natural` / `mixed`: categories `plant ground rock tree`, or water; `urban`: also `street rail person vehicle` and the `ground` role) | natural / mixed at least 0.85; urban at least 0.75 |
| `coverItems` | the number of cover placements in that band | natural / mixed at least 300; urban at least 120 |
| `movers` | actors + flock birds + placements whose hooks include `bob`, `paddle`, `turn`, `walk` or `flap` (creatures, people, boats, vehicles: things that move by themselves) | at least 15 |
| `travellers` | actors + flock birds (things that cross the scene) | at least 6 |
| `motionKinds` | distinct hook kinds, plus `travel` when there are actors, plus `wind` when there are strips or `sway` | at least 4 |
| `signature` | placements of an object tagged `landmark` or `signature`, outside the `front` layer, with `s x size.h` at least 180 | at least 1 |
| `liveSky` | `view.lat` / `view.lon` set; `sky` not false (unless `setting: 'interior'`); `season: 'auto'`; `weather: 'live'`; `particles: 'season'` | required |
| `seasons` | every seasonal object has 4 seasons; and where abs(lat) is 23.5 or more, the area-weighted mean colour difference (CIE76 delta E) of the `tree plant ground` fills between summer and winter, and between summer and autumn | delta E at least 6 each |
| `sun` | `sky.sunR` above 0 (the disc and glow at `L.sun`) | required with an open sky |
| `shadows` | the share of `tree building person vehicle structure landmark animal` placements in the mid to fore layers with `shadow: true` | at least 0.6 |
| `reflections` | with water areas: at least one with `reflect: true`, and the objects within 40 units of its edge have `reflect: true` | required with water |
| `nightLights` | with any `building street structure landmark vehicle` placements (or `setting: 'urban'`): glow shape groups across placements | at least 12 |
| `variety` | 10.2 | required |
| `perf` | the 10.2 perf rules (with `--perf`) | required for GOLD |

A scene that fails a bar rule prints which, how far off, and the fix (for
example `movers 11 of 15: add a flock (flocks[]) or boats on the water`).

### 15.3 The legacy tier, and `status`

- Every OTHER profile (`scene`, `scene-legacy`, `scene-rich`, `item`,
  `item-classic`) keeps its floors and keeps passing, so the build stays
  green. Those floors are now the LEGACY tier: a full scene judged by them
  is "below the new standard", whatever its score.
- `standardOf(entry, lint, perf)` (builder C) returns:
  - `gold`: a composed item that passes the whole composed profile (perf
    included when measured);
  - `composed`: composed, but failing a bar or perf rule;
  - `upgrading`: a legacy item with a DRAFT upgrade (16.2);
  - `rich`: a hand-drawn rich scene (`item.rich`: the Yateley and Fleet
    views), at the look of the bar but too slow; converted in section 17;
  - `legacy`: everything else.
- `anim-quality.json` gains `"standard": { "profile": "composed",
  "legacyProfiles": ["scene", "scene-legacy", "scene-rich"], "note": "..."
  }`.
- `lint` prints `(legacy floors: below the new standard)` after each
  passing legacy full scene, and `GOLD` after each gold one. Small items
  (symbols) are not scenes and are not tiered.
- `status <region>` prints, after the scenes line, for example:
  `standard  0 of 28 scenes at the new standard (gold); 1 upgrading; 27
  legacy (below the new standard)`, and per pack the columns `gold`,
  `upgr` and `legacy`. `--standard` lists every non-gold scene with its tier
  and its suggested archetype (`suggestArchetype`): the upgrade worklist,
  grouped by archetype so batches of 7 can be briefed together. `--json`
  carries `standard: { gold, composed, upgrading, rich, legacy, list }`.
- `status --all` prints the tier table for EVERY pack, regions or not (UK,
  Texas, world, the demo).

### 15.4 Re-basing (the convert stage)

The `composed` floors are designed now, because no composed scene exists
yet. After the convert stage:

1. The composed Yateley and Fleet scenes replace the rich ones in `bar`
   (15.1).
2. `calibrate --profile composed --on bar` (converter X adds the
   `--profile` and `--on bar` options to `calibrate`) measures the bar
   scenes and proposes, per rule, the floor = the bar's minimum. The reviewer applies
   it only where it is HIGHER than the designed floor (never lower), and
   records the measured distribution in each rule's `note`, as the friend's
   calibrated profiles do.
3. The pilot upgrades must still pass after the re-base. If one does not,
   it is improved, not waived.

### 15.5 The performance principle

Static is free; motion is budgeted. Thousands of static placements are baked
into at most 6 cropped layer bitmaps (6.3) and cost nothing per frame. Only
animated sprites and effects cost per frame: at most 300 animated draws and
6 ms of dynamic drawing (`dynMs`), within an 8 ms frame (`drawMs`), at 1600 x
900 on a normal laptop. `scene lint` counts the draws from the data; `scene
perf` times both in the real renderer. A rich look therefore comes from
DENSE STATIC DETAIL plus a measured number of well-chosen movers, not from
animating everything.

## 16. The upgrade path for hand-drawn region scenes

### 16.1 Overview

For each of the ~220 hand-drawn US, Asia, Texas and world scenes, without
redrawing from scratch:

1. **Extract the landmark** (Marina Bay Sands, the Flyer, the Supertrees,
   the Empire State Building) from the old art into a library object, then
   REFINE it: windows, structure, lighting, a night-lit variant.
2. **Recompose** the scene around it from an archetype (8.5), with the
   region's kits (2.7) filling it in.
3. **Keep its identity**: id, key, place fields, label and site (the
   caption), tags, `when` and priority, so rotation, pins, favourites, the
   opening and the gallery keep working.
4. **Compare** old and new at noon and at night (16.4).
5. **Go live** when it passes the bar and the perf budget.

The landmark extraction is a STARTING POINT that saves redrawing the
silhouette and keeps the scene recognisable. The refinement is real work:
most hand-drawn landmarks are a few dozen shapes; a library landmark needs
at least 80 and a night look.

### 16.2 The upgrade registry (builder A, in `71-anim-0region.js`)

```js
// src/app/71-scene-upgrade-<region>-<slug>.js   (one file per upgraded scene; slug = the key's ref: 'singapore', 'jp')
(function () {
  animRegionSceneUpgrade('asia', 'place:singapore', {
    state: 'draft',                                // 'draft' (the tool only; the app keeps the hand-drawn art) | 'live'
    archetype: 'skyline-water',                    // what it is built from (also in data.arch); 'basic' while the archetype is not built
    landmarks: ['landmark.marina-bay-sands', 'landmark.supertrees', 'landmark.singapore-flyer'],
    scene: () => sceneFromArchetype('skyline-water',
      { id: 'singapore', lat: 1.2834, lon: 103.8607, heading: 20, at: 'dusk', climate: 'tropical',
        kits: ['tropical', 'towers', 'urban', 'boats', 'birds'],
        landmarks: ['landmark.marina-bay-sands', 'landmark.supertrees', 'landmark.singapore-flyer'],
        water: 'bay', horizon: 520, density: 1, palette: { base: { water: ['#3f6f8e', '#20445e'] } } },
      { place: [ /* the scene's own touches */ ], scatter: [], actors: [] }),
  });
})();
```

- `animRegionSceneUpgrade(regionId, key, up)` stores `up` in
  `_ANIM_REGION_UPGRADES[regionId][key]`. It works before or after the
  region is defined, like `animRegionSceneAdd`. A second upgrade for the
  same key is a duplicate, reported like duplicate scenes.
- The `scene` thunk runs only when the item is shown, linted or sheeted,
  never at load.
- `view.lat` / `view.lon` default to the region row of the key (for a unit
  key, the unit's first big row) when the params leave them out.
- **Draft.** The item is built exactly as today (the retrofitted legacy
  art), plus `upgrade: { state: 'draft', archetype, landmarks, scene }`.
  The app never shows the draft. The tool shows it with `--upgrades`.
- **Live.** Where a scene entry becomes a full item (`upgrade(o, sc)` and
  `scenesToItems()`), the item is built as today and then merged with
  `{ composed: true, rich: true, scene: up.scene, liveSky, svg: (o) =>
  sceneSvg(sceneData(item), o), legacySvg: <the entry's svg>, reduced:
  'static', upgrade: { state: 'live', archetype, landmarks } }`. Nothing
  else changes: the same `id`, the region's kind / unit / place / size /
  signature fields, `label`, `site`, `tags`, `priority`, `when` and `slot`.
  It is NOT retrofitted.
- `region.upgrades()` returns `[{ key, state, archetype, landmarks }]` for
  the tools. `region.check()` reports an upgrade whose key has no scene
  entry.
- The UK, Texas and world packs are not regions: their items upgrade in
  their own pack files with the same item fields (section 17 does the UK
  ones). Such a pack can still use the registry: it registers under its
  pack id (`animRegionSceneUpgrade('texas', 'place:dallas', up)`, in
  `71-scene-upgrade-texas-dallas.js`) and calls
  `animSceneUpgradeFinish(packId, key, item, sky, retro)` where it builds
  its full items. That is the same merge a region's items get: live makes
  the item composed and skips `retro`; otherwise `retro(item)` runs and a
  draft adds `item.upgrade`. `region.upgrades()` and `region.check()` do
  not list these upgrades.

### 16.3 `scene upgrade <ref>` (builder C, `tools/lib/scene-upgrade.mjs`)

```
node tools/anim-pack.mjs scene upgrade asia-southeast/singapore-skyline --box 560,160,1120,640 [--archetype skyline-water] [--landmark <obj id>] [--slug singapore] [--dry-run] [--force]
```

1. Load the item. It must be a full legacy scene of a region (any other
   item: a clear error that points to 16.2's last bullet). With an existing
   upgrade, it stops unless `--force`.
2. **Suggest the archetype.** `suggestArchetype(item)` scores every
   `SCENE_ARCHETYPE_INDEX` entry: +2 per hint found in the tags, +1 per hint
   in the label or site words. It prints the top 3 with their scores.
   `--archetype` overrides. If the chosen archetype is not built yet
   (`sceneArchetype(id)` is null), the scaffold uses `basic` and writes
   `// suggested: <id> (not built yet; switch when it lands)`.
3. **Extract the landmark** (unless `--landmark` names an existing object).
   `extractLandmark(markup, box, R)`:
   - parses the legacy svg with `sceneShapesFromSvg(markup, { flatten: true
     })` (2.3);
   - keeps the shapes whose bounding-box centre lies inside `--box` and
     whose width is at most 90 % of the box, dropping the sky and haze
     (shapes wider than 1100 units, and translucent shapes over 400 units
     wide);
   - re-anchors them at (box centre x, box bottom), so y 0 is the ground;
   - writes `src/app/70-scene-lib-landmark-<slug>.js`: a native
     `sceneObjDefine({ id: 'landmark.<slug>', category: 'landmark', size,
     variants: 1, seasonal: false, flippable: false, parts: ['body', 'lit'],
     night: {...}, tags: ['landmark', 'place:<region>/<key>', <region>],
     build() { return { body: [...shapes], lit: [] }; } })`, keeping `glow`
     from `us-lit` / `us-lamps`;
   - puts a REFINE checklist in the file header: the real structure (look
     up its form, and be factual), window grids or tiers, edge highlights and
     shaded sides consistent with one light direction, the `lit` part
     (floodlights, crown lighting, the Supertrees' night glow), snow on
     roofs in winter if the place has snow (then `seasonal: true`), at least
     80 shapes, and `object sheet` in light and night.
   - Without `--box` (this round), it prints the 5 largest non-sky shape
     clusters with their boxes, so the author can choose one. The automatic
     box is a later option (section 18).
4. **Lift the palette.** `paletteOf(shapes)` gives the 6 most area-weighted
   fills of the landmark (its `palette.base`), and the old art's lowest
   bands give the scene palette's `ground` and `water`, so the new scene
   keeps the old one's colour identity.
5. **Write** `src/app/71-scene-upgrade-<region>-<slug>.js` as in 16.2, with
   `state: 'draft'`, the params filled in, and an empty patch. `climate`
   comes from the latitude and tags (abs(lat) under 23.5: tropical; tags
   `desert` / `arid`, `alpine` / `mountain`, `snow`: arid, alpine, polar;
   else temperate); `kits` from `SCENE_REGION_KITS`; `water` from the tags
   and the archetype; `at` from the old scene's tags (`dusk`, `sunrise`,
   `night`).
6. Print the next steps: `object sheet landmark.<slug>`; refine; `scene
   sheet <ref> --compare --upgrades --times`; `scene lint <ref> --upgrades
   --perf`; set `state: 'live'` when it passes.

`--dry-run` prints the suggestion, the box, the shape count and the two
file paths, and writes nothing.

### 16.4 Old versus new (`scene sheet --compare`)

`scene sheet <ref>[,...] --compare [--upgrades] [--times] [--date D]`
(builder C's command over builder B's compare page, 10.1) writes, per ref,
`<out>/<ref>--compare.png`: a 2 x 2 grid of 800 x 450 panes, old on the
left and new on the right, at NOON (top) and at NIGHT (bottom), both from
`sceneTimesFor` at the scene's lat/lon. The legacy side includes the
retrofit overlay at the same sky, so the comparison is fair. With `--times`
there is one row per moment (dawn, noon, golden, dusk, night) instead of
two. `--contact` puts every ref's grid on one contact sheet. The default
`--out` is `.anim-ref/compare/` (gitignored).

### 16.5 Going live, and the tests

- An upgrade goes `live` only when `scene lint <ref> --upgrades --perf`
  prints GOLD and its compare sheet has been looked at, in light and night.
- `tests/scene-upgrade.test.mjs` (A) covers the 16.2 semantics. From the
  convert stage on, `tests/scene-upgrades-live.test.mjs` (written there)
  checks that every LIVE upgrade passes the composed data, bar, variety and
  care rules (not perf, which needs Chrome) and keeps its item identity
  against the legacy entry.
- Drafts may fail anything: they are work in progress, counted as
  `upgrading` by `status`.

## 17. The convert stage (after the review): the pilot

Three converters (X, Y, Z) work in parallel once the reviewer has merged
and fixed this round. Each uses the tool as an author would, and fixes the
friction it finds in the tool (reported, and owned per file as below). Same
ground rules as the builders; ports 4394 to 4396, Chrome debug ports 9334 to
9336, temp dirs `C:/tmp/scene-convert-<x>`.

### Converter X: Yateley Common and Fleet Pond, and the re-base

- Convert the 8 views of Yateley Common and Fleet Pond (4 views each) into
  composed scenes from the kit objects:
  `src/app/71-scene-uk-south-east-<place>-<view>.js`, plus the heath and
  pond objects they need (`70-scene-lib-plants-heath.js`,
  `70-scene-lib-water.js`, `70-scene-lib-landmark-fleet-pond-boardwalk.js`).
- Each view's 4 seasonal items collapse into ONE auto-season composed item
  with the view's main (summer) id, keeping `ukPlace` and `ukView` (with
  `season: 'any'`). The other three ids stay registered as items with
  `when: () => false` that point at the same scene, so pins and favourites
  on them keep working. X edits only the 8 view pack files
  `72-anim-pack-uk-south-east-{yateley-common,fleet-pond}-v1..v4.js`.
- Target: from ~16,000 nodes and 50 to 100 ms per frame to `drawMs` under 8
  ms and `dynMs` under 6 ms, with the same look (compare sheets against the
  rich versions in all four seasons, at noon and at night).
- Then the re-base (15.4): `bar` takes the composed views; `calibrate
  --profile composed --on bar`; apply raises only.

### Converter Y: Singapore and New York (`skyline-water`)

- `src/app/70-scene-arch-skyline-water.js` (8.5).
- Kits: `70-scene-lib-buildings-towers.js` (the `building.tower-glass`
  generator, `building.tower-stone`), `70-scene-lib-trees-tropical.js`,
  `70-scene-lib-plants-tropical.js`, `70-scene-lib-boats.js`,
  `70-scene-lib-vehicles-city.js` (`vehicle.car`, `vehicle.taxi`),
  `70-scene-lib-birds-coast.js` (`bird.gull`, `bird.egret`),
  `70-scene-lib-buildings-brownstone.js`.
- Landmarks (one file each): `marina-bay-sands`, `supertrees`,
  `singapore-flyer`, `empire-state`, `chrysler`, `one-wtc`,
  `brooklyn-bridge` (its cables computed as catenaries, as the old scene
  did).
- Upgrades: `71-scene-upgrade-asia-singapore.js` for
  `asia-southeast/singapore-skyline` (key `place:singapore`), and
  `71-scene-upgrade-us-new-york.js` for `us-northeast/new-york-skyline`
  (key `place:new-york`).

### Converter Z: Mount Fuji and the Chureito Pagoda (`temple-mountain`)

- `src/app/70-scene-arch-temple-mountain.js` (8.5).
- Kits: `70-scene-lib-trees-east-asian.js` (`tree.cherry`,
  `tree.maple-japanese`, `tree.cedar`), `70-scene-lib-buildings-east-asian.js`
  (`building.pagoda`, `building.machiya`),
  `70-scene-lib-structures-east-asian.js` (`structure.lantern-stone`).
- Landmarks: `chureito-pagoda`, and `mount-fuji` (a natural landmark, with
  its snow cap by season).
- Upgrade: `71-scene-upgrade-asia-jp.js` for `asia-east/jp-signature` (key
  `country:JP`). This is the pilot's temple scene because Japan has four
  strong seasons (blossom, green, maples, snow), so it proves the season
  rules as well as the bar. If the reviewer prefers an old town instead,
  `asia-east/macau-skyline` with `historic-street` is the alternative.

### Acceptance for every pilot scene

- `scene lint <ref> --upgrades --perf` prints GOLD (the bar, variety, care,
  data and perf rules); then the upgrade is set to `state: 'live'`.
- `scene sheet <ref> --compare --times --contact` (old vs new at dawn, noon,
  golden hour, dusk and night) and `scene sheet <ref> --seasons` are saved in
  `<tmp>/scene-convert/compare/` and SHOWN to the user, side by side.
- The item id, label, site and place fields are unchanged, and pinning the
  old id opens the new scene.
- `status asia` and `status us` report the upgrades as gold.
- After the re-base (X), all three still pass.
- `npm test` passes four times, and `tests/scene-upgrades-live.test.mjs`
  exists and passes.

## 18. Later phases

1. **The rest of Yateley and Fleet**: the Wyndham's Pool, Yateley Green and
   Basingstoke Canal views, converted the same way as X's.
2. **Upgrade the region scenes at scale.** `status <region> --standard`
   gives the worklist grouped by suggested archetype; `brief <region> --kind
   upgrade` makes batches of 7 per archetype; each new archetype (8.5) and
   kit object lands with its first batch. Order: the big cities first (they
   open most often), then the signatures, then the rest.
3. **Retrofit the rest.** `sceneRetrofitPack(manifest, defaults)` for the
   UK legacy packs, Texas and World (7.5), each with a review sheet, while
   they wait for their upgrades.
4. **The London pack.**
   - A `71-anim-region-london.js` config with `select: { rule: 'dense' }`.
     The units are boroughs, and the rows are stations (about 400:
     Underground per line, DLR, Overground, the Elizabeth line, Thameslink
     and the national rail termini) plus areas.
   - Archetypes `station`, `terminus`, `elevated` (DLR), `journey`, `area`
     and `borough`, with tables built from public data: id, name, lines,
     lat/lon, era and surface features. Batch lint, perf and sheet with
     `--archetype --table` (section 10).
   - Feed `ctx.fix`, `ctx.track` and `ctx.seen` in `animCtx()`, under 9.5.
   - The London region claims Greater London, and the UK county opening for
     `greater-london` defers to it.
5. **Tool options deferred from this round**: the automatic landmark box in
   `scene upgrade`; animated SVG output (`sceneSvg(..., { animate: true })`)
   for environments without canvas.
6. **More objects and packs.** Every new place adds objects to the library
   (community packs later). See `docs/dev/GROWTH_PLAN.md`: performance
   budgets, small fun details and gamification.
7. **A scene editor** in the gallery: drag library objects onto layers, save
   as scene data.
