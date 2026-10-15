# Handoff: branch `uk-rebuild` (14 Oct 2026)

For whoever picks this up next (a person or an agent). Read in this order: this file, `docs/dev/SCENE_LESSONS.md`,
`docs/dev/WORLD_ENGINE_REQUIREMENTS.md` (the contract), then `docs/dev/WORLD_ENGINE.md` (the design).

## What is on this branch

1. **The current scene engine (v2), improved.**
   - Hampshire: Fleet Pond, the canal, Wyndham's Pool, Yateley Common and Yateley Green, with 4 views each plus 3 proofs.
   - Animation overhaul: depth order, floaters sit in water, blockers, true scale, `sceneBehave` presets, 8-direction facing.
   - Lighting, water and shadows locked to the engine.
   - Boat reflections mirrored once per object.
   - Place-styled backdrops.
2. **Manchester and Sheffield drafts.** Six places (Castlefield, the civic centre, Quays/NQ, Sheffield centre, Kelham Island,
   parks) with 4 views each, on v2. They are not final: they wait for conversion to the world engine.
3. **The world engine (v3)** in `src/app/79-world-*.js`, `tools/world.mjs` and `tools/lib/world/`. All 8 packages are built and
   integrated (commit 99d3f90). 329 tests pass. The invariant checker and the 14 adversarial fixtures pass. The browser perf
   gates and the visual review are NOT done.

## Known state of v3 (honest, 15 Oct)

What now holds, by default, in the engine (each with a test and a SCENE_LESSONS row):

- **Movement** (lessons I, requirements 26): hard personal space, keep-left passing, queues, squeeze in one-body lanes, a watchdog,
  leashes that never teleport a dog, shown velocity, a crowd that never covers more than 7 % of the frame, bench stand-up spots
  that are legal cells. `node tools/world.mjs invariants <ref> --browser` checks the frames the page really drew.
- **Terrain** (lessons J, requirements 27): ground features are drawn as depth strips of shaded quads; buildings stand on the
  slope; what lies behind a rise is dropped; a water below the ground is hidden behind the near bank.
- **Style kits and the strict critic** (lessons H): short specs get fill, edges, framing and backdrop from a kit.
- **Render glitches** (lessons G): discs, winter trees, T-pier decks, night key, ripple zigzag.
- **No-example places**: Whitby harbour is built from a 45-line spec and reads well in every season, time and rain. York,
  Liverpool and Malham are in progress on the branches uk-york, uk-liverpool and uk-malham (timber-framed jetty style and frontage
  expansion; civic towers, domes and clock faces; a cliff feature with strata, ledges and scree).

Still not right:

- **Frame time.** At 4x CPU throttle the compositor takes about 140 ms a frame (budget 8 ms) and a warm remount 1.7 to 2.6 s (budget
  1 s); the cold first bake is fine (well under 5 s). The cost is the chunk blits and the occluder redraws in
  `_wfrDraw` (the `depth` section of `stats().prof`); idea: pre-composite the run of chunks behind the farthest mover once per bake.
- The pond's boardwalk reflection has a stair-stepped edge on its diagonals; the nav map does not treat extruded buildings as
  solid in every case; a walker can still pass through a jogger for one frame (swept check) in the canal at night.
- Library art gaps: no timber or jettied style until uk-york merges, no landmark art for the Liver Building or the Abbey.

## What is next

1. Merge the three place branches, fix whatever the matrix shows, then the frame-time work above.
2. Run `node tools/world.mjs accept --browser` until it passes and review the season x time x weather matrix with fresh eyes
   (requirements sections 16, 20, 24, 25).
3. Then convert Hampshire, Manchester and Sheffield to v3, and release.

## Rules

- No personal data: run `tools/privacy-scan.mjs` before any push.
- Nothing goes live or to `main` without the owner seeing contact sheets.
- Never delete good scenes; improve them in place.
- Every new class of mistake gets a row in SCENE_LESSONS.md.
