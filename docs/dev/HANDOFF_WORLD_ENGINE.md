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

## Findings from 15 Oct (for the next session)

- The particle system (`79-world-6particles.js`: `worldParticles`, smoke, steam, leaves, spray) is never drawn: no renderer
  calls it. So the glowing white disc by the canal boats is NOT a particle. Look for its source elsewhere: the boat object's
  own `smoke` part (`70-scene-lib-boats-canal.js`), an auto-filled entity, or a lamp or window glow from the light pass that
  is drawn without its object. Wiring particles into the frame (`79-world-5frame.js`) is its own task.
- No smoke, stove or lamp entity appears in `79-world-zscene-fleet-canal-2.js`, so the disc comes from defaults (the fill,
  the kit or object parts), which is exactly the kind of engine-default bug to fix once.

## Findings, 15 Oct (later): the DRAWING step loses things the simulation has. Fix this first.

Checked on world-test/fleet-canal-2-w3 at 2026-10-15 13:00 (`node tools/world.mjs render ... --dates=autumn,night`):
- Fixed since 10 Oct: the glowing white disc by the boats and the head cut off in the bottom-left corner are gone.
- The life sim spawns everything the spec asks for: mallard 8, moorhen 2, heron 1, mute-swan 2, walkers, dog-walkers,
  boater, narrowboat-cruising. `worldFrameAt` lists them all with sane boxes (ducks about 25x20 px at z 24 m, beside the
  swans). But the rendered PNG shows ONLY the swans and the heron. The ducks and coots/moorhens are lost between the frame
  record and the canvas: check `_wfrRec` / the agent draw in `79-world-5frame.js` (near-band test, `culled`, the waterline cut
  `_wfrCutOf` / `worldWaterCut` for small floaters, sprite availability for `bird.mallard` variants 2 and 3, which are the
  dabbling variants), then the per-agent draw at line ~886.
- Moored narrowboats (`boat.narrowboat`) lose their hull body: one reads as a cabin box, the next as just a red railing.
  The library narrowboat is a side-view sprite; seen obliquely, the engine squeezes or slices it. Requirement Q4 says objects
  choose a view by camera angle and are drawn end-on when end-on. The canal needs a proper perspective boat (one object,
  extruded like buildings in `79-world-4extrude.js`) instead of a side sprite.
- Reeds are placed in open water in front of moored boats (margin clusters with `edge: true` spill into the channel).
- The invariant checker reports 0 violations while all of this is visibly wrong: it validates the simulation, not the
  drawn pixels. Add a "drawn vs simulated" check: every agent and static in the frame record must produce non-empty pixels
  in its box (or be explicitly occluded), so missing drawings fail a test.
- `tools/lib/world/sheet.mjs` `worldPageOpen` needs `{ ref, spec, id }` (as `world.mjs` passes it); with `{ ref }` alone
  it fails with "no scene host".
- `worldPageOpen(...).frameAt(t)` does not advance the scene. After `frameAt(60)` the frame stats report `tau: 0`, and the
  frames of `world capture` look identical across the strip. So the full-loop captures and the reviewer have NOT been
  watching motion. Fix the frame clock in capture first, otherwise no motion bug (bunching, walking into each other) can be
  seen or tested in the browser.
- In the browser frame the engine reports 34 agents drawn (`world-frame.agents`), yet the PNG shows 2 swans, a heron and
  people, and no ducks or moorhens. Compare the agent draw records with the pixels at the same t.
