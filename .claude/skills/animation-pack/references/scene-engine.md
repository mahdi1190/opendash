# Scene engine cheat sheet (docs/dev/SCENE_ENGINE.md sections 2, 3, 10, 15, 16)

## Objects (section 2)

- One object, drawn once: `id` `<category>.<name>`, `size [w, h]`, `variants`, `seasonal` (palettes per season: base, spring,
  summer, autumn, winter; or `shapeBySeason`), `parts` (draw order; a part named `lit` is the night-lit variant, baked only after
  real dusk), `anim` hooks (sway, bob, flap, walk, paddle, turn, flicker, spin: ONE part, ONE transform), `shadow`, `reflect`,
  `night.glow` (window and lamp colours for shapes with `glow`), `tags` (at least one `kit:<kit>`, exactly one `role:<role>`).
- Coordinates are object-local, the anchor at 0, 0 where it touches the ground. Paints: `#rrggbb`, `@slot`, `@slot.N`, linear or
  radial gradients. No text, images or url().
- Limits: at most 600 shapes and 60 KB of path data per variant; a landmark at least 80 shapes with a night look; buildings and
  vehicles at least 4 glow shapes; people tagged silhouette, at most 60 shapes.

```bash
node tools/anim-pack.mjs object list --kit tropical
node tools/anim-pack.mjs object new plant.banana --kits tropical --role shrub
node tools/anim-pack.mjs object lint plant.banana
node tools/anim-pack.mjs object sheet plant.banana --mode night
```

## Scenes (section 3)

A scene is DATA: `view` (lat, lon, heading, horizon), `setting` (natural, urban, mixed, interior), `layers` (horizon, far, mid,
near, fore, front), `ground`, `water` (`reflect`, `shimmer`, `lightPath`), `place` (hand placements), `scatter` (seeded rules:
`obj` weights, `area`, `n` or `density`, `minGap`, `s` and `sByY`, `flip`, `variant`, `tint`, `mask`, `anim: 'strip'`),
`actors` (paths), `flocks`, `signs` (only with `signage: true`), `season: 'auto'`, `weather: 'live'`, `particles: 'season'`.
Seasons, the live sky (sun, moon and its phase, stars, shadows, lit windows at real dusk) and weather are automatic.

## The bar (section 15) and the budget

| rule | floor |
| --- | --- |
| depth layers holding something | 5 or more |
| ground cover (40-unit columns of the lower band) | 0.85 natural / mixed, 0.75 urban; 300 / 120 cover placements |
| movers / crossing the scene / kinds of motion | 15 / 6 / 4 |
| signature (landmark or signature object, not in front, s x h >= 180) | 1 |
| live sky, season auto, weather live, particles season | required |
| seasons (nature colours, summer to winter and to autumn, outside the tropics) | delta E >= 6 |
| shadows on the mid to fore casters | 0.6 |
| reflections (with water) / night lights (with buildings, lamps, vehicles) | required / 12 |
| placement variety | scale spread, flips, variants, tints, no grids, no stacks |
| animated draws / dynMs / drawMs (laptop; x 1.75 in software) | 300 / 6 ms / 8 ms |

Static placements are FREE per frame (baked); only animated draws cost.

```bash
node tools/anim-pack.mjs scene lint <pack>/<id> --perf
node tools/anim-pack.mjs scene sheet <pack>/<id> --times --seasons --contact
node tools/anim-pack.mjs scene perf <pack>/<id>
node tools/anim-pack.mjs status --all --standard
```

## Archetypes and tables (section 8)

`sceneArchetypeDefine(id, { params, kits, slots, meta, build })`; `sceneFromArchetype(id, params, patch)` (arrays in the patch are
appended, `drop` removes, other keys replace, `view` merges); `sceneTableDefine` rows; `sceneBatch(arch, table)` one item per row,
built only when needed.

```bash
node tools/anim-pack.mjs scene lint --archetype station --table london-demo --rows 200
node tools/anim-pack.mjs scene sheet --archetype station --table london-demo --sample 3 --times --contact
```

## Upgrades (section 16)

```bash
node tools/anim-pack.mjs scene upgrade asia-southeast/singapore-skyline
node tools/anim-pack.mjs scene upgrade asia-southeast/singapore-skyline --box 560,160,1120,640
node tools/anim-pack.mjs scene sheet asia-southeast/singapore-skyline --compare --upgrades --times
node tools/anim-pack.mjs scene lint asia-southeast/singapore-skyline --upgrades --perf
```

The draft keeps the item's identity; `state: 'live'` only at GOLD, after looking at the compare sheet in light and night.

## Signs and the legal note (8.3, 8.4)

Place-name signs only where the archetype declares `signs: true`: a plain board (or fascia, or totem) with the name in the system
font and line-colour bars, 1 to 40 characters, escaped, with a deny-list. Never the TfL roundel, the Underground logotype, the
line-diagram style or New Johnston; line names are colour bars, never words.
