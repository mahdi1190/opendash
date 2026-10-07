# Brief: compose {{subject}} (pack `{{pack}}`) at the new standard

You are composing a full-screen opening scene for OpenDash, a local dashboard, with the SCENE ENGINE: library objects placed by
scene data, drawn by the canvas renderer (docs/dev/SCENE_ENGINE.md). You do not draw a picture by hand: you COMPOSE one from the
object library, starting from an archetype when one fits, and you add an object only when the subject truly needs one. This brief is
your whole task; read all of it before you start. A scene that merely passes the lint is not done: it must look like it belongs next
to the bar (section 2) when you hold the two renders side by side.

{{notes}}

## 1. What to read first

- docs/dev/SCENE_ENGINE.md sections 3 (the scene format), 5 (seasons, the live sky, weather) and 15 (the new standard).
- The object library: `node tools/anim-pack.mjs object list` (by kit: `node tools/anim-pack.mjs object list --kit temperate`).
- The archetypes (section 8.5 of the spec): {{archetypes}}

## 2. The bar: the look to match

The rich Yateley and Fleet scenes are THE BAR. A scene looks bad next to them when it is flat (one or two depth layers), bare (no
ground cover), still (a few moving things), generic (no signature) or lit wrong. The orchestrator rendered them once
(`node tools/anim-pack.mjs reference --render`); open these PNGs before you compose, and again before you report:

{{bar}}

## 3. Your scene card and your files

Fill in this card (the `scene new --brief` command reads it), then scaffold the scene from it:

```scene
id: {{scene_id}}
label: {{subject}}
site: {{subject}}
lat:
lon:
heading: 180
setting: natural
kits: {{kits}}
archetype:
landmark:
tags:
mood: calm
colour: teal
```

```bash
node tools/anim-pack.mjs scene new {{pack}} {{scene_id}} --brief <this brief file>
```

That writes `src/app/71-scene-{{pack}}-N.js` (and the pack file `src/app/72-anim-pack-{{pack}}.js` when the pack is new): a scene that
compiles at once, composed from the kits by role. You own that scene file (and, if you add objects, the library file `object new` names).
Touch nothing else: not the engine (`src/app/70-scene-*` other than the library file you add to), not `tools/`, `tests/` or `docs/`.
Do not commit, push or `git add`. The git remote is PUBLIC: no personal names, paths or emails anywhere, not even in comments.

## 4. Compose: the bar rules, and why static detail is free

{{budget}}

- **Depth**: at least 5 layers holding ground, water or placements (horizon, far, mid, near, fore; front for framing). Haze between
  them is automatic.
- **Ground cover**: dense scatter rules across the WHOLE width of the near and fore ground (role ground: grass, heather, reeds;
  urban: planters, hedges, street furniture). Thousands of static placements cost nothing per frame: they are baked.
- **Life**: at least 15 movers (actors on paths, a flock, birds and animals with a bob or turn hook), at least 6 of them crossing
  the scene, and at least 4 kinds of motion. Wind strips (`anim: 'strip'`) give mass sway for almost nothing.
- **A signature**: the place's landmark or a signature object in the mid or far layers, big enough to read.
- **Light and seasons are automatic**: `season: 'auto'`, `weather: 'live'`, `particles: 'season'`, `view.lat` / `view.lon` set.
  Give the ground palette and every seasonal object four seasons; buildings and lamps light at real dusk (glow shapes, a lit part);
  water areas reflect (`reflect: true`), objects at their edge too; trees, buildings and people cast shadows.
- **Variety, not stamps**: vary scale (`s: [a, b]`, `sByY`), mirror about half (`flip: 0.5`), use every variant
  (`variant: 'random'`), tint big repeats (`tint`), never rows or grids (`minGap`, a noise mask).

## 5. Objects: only when the subject needs one

If the library lacks something the place truly needs (its landmark, a local tree, a regional building), add it:

```bash
node tools/anim-pack.mjs object new <category>.<name> --kits <kit> --role <role>
node tools/anim-pack.mjs object lint <category>.<name>
node tools/anim-pack.mjs object sheet <category>.<name> --mode night
```

Draw it once, well: variants, four seasons where nature or clothing changes, its hooks (sway, bob, turn ...), glow on windows.
It joins every scene of its kit. A landmark is refined: at least 80 shapes, the real structure (be factual), a night look.

## 6. Care

{{care}}

## 7. Verify (run these; paste the last lint line in your report)

```bash
{{verify}}
```

Look at every sheet, at every moment and in every season, next to the bar. Iterate until the lint prints GOLD and the sheets
hold up. Report: the bar, variety and perf numbers (the lint and perf output), what you added to the library, and anything you
think is wrong elsewhere (under OTHER FILES I THINK ARE WRONG).
