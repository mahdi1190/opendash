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

## Known state of v3 (honest)

When it works it looks good (see the fleet-pond-2 capture), but the renders still have many glitches and are worse than the
v2 originals. The open list is in the orchestrator review notes (kept outside the repo); the same items are
repeated here:

- A huge glowing white disc next to moored boats at dawn and night: the stove smoke particle is drawn as a lit disc.
- A dark round head cut off in the bottom-left near band in every canal cell (C2 is not enforced in render).
- Winter birches render as bare white poles; some winter trees have flat dark disc canopies.
- The original composition is lost on conversion (QP3), and night is murky (QP4).
- The richness critic is too lenient: a bare channel passed it.

## What is next

1. Fix the list above in the ENGINE, never per scene.
2. Run the test phase: the adversarial red team, plus four places never drawn before, each from a short spec with no example:
   Liverpool Pier Head, York (the Shambles), Whitby harbour and Malham Cove. Compare each against the gold proof Fleet Pond and
   the best Castlefield view.
3. Refine plus fresh-eyes verify rounds until `node tools/world.mjs accept --browser` passes AND a reviewer finds nothing weird
   across the season x time x weather matrix (requirements section 16, 20, 24 and 25).
4. Then convert Hampshire, Manchester and Sheffield to v3, and release.

## Rules

- No personal data: run `tools/privacy-scan.mjs` before any push.
- Nothing goes live or to `main` without the owner seeing contact sheets.
- Never delete good scenes; improve them in place.
- Every new class of mistake gets a row in SCENE_LESSONS.md.
