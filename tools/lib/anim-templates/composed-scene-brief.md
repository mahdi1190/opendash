# Brief: compose {{subject}} (pack `{{pack}}`) at the new standard

You are composing a full-screen opening scene for OpenDash, a local dashboard, with the SCENE ENGINE v2
(docs/dev/SCENE_ENGINE_V2.md). You do not draw a picture by hand and you do not place things in screen pixels: you DECLARE what is
where on the ground (a camera, surfaces, water, ground placements, flows) and the engine computes the screen position, the scale
from the real size and the depth, the draw order, the shadows, the reflections, the light, the weather and the life. It refuses or
snaps anything physically wrong (a car on grass, a boat on land, a tree on the road). This brief is your whole task; read all of
it before you start. A scene that merely passes the lint is not done: it must look like it belongs next to the bar (section 2)
when you hold the renders side by side.

{{notes}}

## 1. What to read first

- docs/dev/SCENE_ENGINE_V2.md sections 2 to 5 (camera, surfaces, ground placements, water), 9 (flows), 16 (the recipe file),
  17 and 20 (the OpenStreetMap import and the composer), and docs/dev/SCENE_ENGINE.md section 15 (the new standard).
- The object library: `node tools/anim-pack.mjs object list` (by kit: `node tools/anim-pack.mjs object list --kit temperate`).
  Every object has a REAL size in metres; the depth sizes it. Never set a pixel scale.
- The archetypes (v1 scenes only; a v2 recipe starts from the composer or `scene new`): {{archetypes}}

## 2. The bar: the look to match

The rich Yateley and Fleet scenes are THE BAR. A scene looks bad next to them when it is flat (one or two depth bands), bare (no
ground cover), still (a few moving things), generic (no signature) or lit wrong. The orchestrator rendered them once
(`node tools/anim-pack.mjs reference --render`); open these PNGs before you compose, and again before you report:

{{bar}}

## 3. Your scene card and your files

Start from the composer (a one-line brief: the place, the moment, the viewpoint words, the subject), or from `scene new` with the
real place and heading. Both write a v2 RECIPE, `src/app/71-scene-{{pack}}-r-{{scene_id}}.js`: strict JSON between markers.

```scene
id: {{scene_id}}
label: {{subject}}
site: {{subject}}
lat:
lon:
heading: 180
preset: street
setting: natural
kits: {{kits}}
landmark:
tags:
mood: calm
colour: teal
```

```bash
node tools/anim-pack.mjs scene compose "<place>, golden hour, <across the water | down the street | from the hill>, the <subject>" --pack {{pack}} --id {{scene_id}} --at <lat,lon>
# or: node tools/anim-pack.mjs scene new {{pack}} {{scene_id}} --brief <this brief file> --osm
node tools/anim-pack.mjs scene osm --at <lat,lon> --heading <deg> --into {{pack}}/{{scene_id}}      # move the camera: re-import the real layout
node tools/anim-pack.mjs scene terrain --into {{pack}}/{{scene_id}}                                  # real hills on the skyline
```

Choose the CAMERA first (where you stand, the heading, the eye height, the horizon row), then refine: every ground position is
relative to the camera, so moving it means re-importing. You own that recipe file (and, if you add objects, the library file
`object new` names). Edit it with the scene editor (the gallery, `OPENDASH_SCENE_EDITOR=1`) or by hand through
`tools/lib/scene-recipe.mjs`. Touch nothing else: not the engine (`src/app/70-scene-*` other than the library file you add to), not
`tools/`, `tests/` or `docs/`. Do not commit, push or `git add`. The git remote is PUBLIC: no personal names, paths or emails
anywhere, not even in comments. A recipe built from OpenStreetMap is ODbL data: it carries the credit line the tools write.

## 4. Compose: declare, the engine decides; static detail is free

{{budget}}

- **Ground placements only**: `{ obj, on: '<surface>', d, u }`, `{ obj, on: '<strip>', along, u }` or `{ obj, at: [x, d] }` in
  metres. The engine picks the lane (keep-left in the UK), the view, the scale, the layer and the haze. A refused or snapped
  placement is a lint failure under `--strict-placement`: put it where its class may stand (V2 4.4).
- **Water is declared, not drawn**: a canal is a path, a width and its banks; ponds and lakes are polygons. Reflections,
  ripples, wakes, rings, glints and the bank edges are automatic. Boats and water birds go ON the water.
- **Ground cover**: scatter rules on the surfaces that take plants (`on`, `avoid` the hard ones), clustered, with `minGap` and two
  or more species; seasonal cover (leaves, blossom, snow) is automatic. Hard surfaces (a plaza, a road) need no cover.
- **Life**: flows on the roads, pavements, towpaths and water (`kind`, `on`, `density`, `profile`, `max`); trams and trains on
  a timetable. Density follows the hour, the weekday, the weather and the season by itself.
- **A signature**: the place's landmark (a library landmark at its real position, `fix: true`) or the subject building
  (`subject: true` on a generated building) in the mid or far bands, between 18 % and 45 % of the frame height, on a third.
- **Light, weather and seasons are automatic**: `atmos: 'auto'`, `weather: 'live'`, `cover: 'auto'`, `season: 'auto'`.
  Shadows follow the real sun; lamps, windows and vehicles light at real dusk.
- **Variety, not stamps**: `k: [a, b]`, `flip: 0.5`, `variant: 'random'`, `tint`, never rows or grids. Prefer the lighter
  trees for far woods (the SVG still has a 150 KB tile budget).

## 5. Objects: only when the subject needs one

If the library lacks something the place truly needs (its landmark, a local tree, a regional building), add it:

```bash
node tools/anim-pack.mjs object new <category>.<name> --kits <kit> --role <role>
node tools/anim-pack.mjs object lint <category>.<name>
node tools/anim-pack.mjs object sheet <category>.<name> --mode night
```

Give it its real size (`real: { h }`). Draw it once, well: variants, four seasons where nature or clothing changes, its hooks
(sway, bob, turn ...), glow on windows. It joins every scene of its kit. A landmark is refined: at least 80 shapes, the real
structure (be factual), a night look. Ordinary buildings come from the building generator (`buildings` in the recipe, or
`scene street`), not from new objects.

## 6. Care

{{care}}

## 7. Verify (run these; paste the last lint line in your report)

```bash
{{verify}}
```

Look at every sheet, at every moment, in every weather and season, next to the bar. Iterate until the lint prints GOLD with
`--strict-placement` and the critic scores nothing under 4. Report: the bar, sanity, composition and perf numbers (the lint and
perf output), the critic's scores, what you added to the library, what the import listed as missing, and anything you think is
wrong elsewhere (under OTHER FILES I THINK ARE WRONG).
