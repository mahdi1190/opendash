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

- **Movement** (lessons J, requirements 26): hard personal space, keep-left passing, queues, squeeze in one-body lanes, a watchdog,
  leashes that never teleport a dog, shown velocity, a crowd that never covers more than 7 % of the frame, bench stand-up spots
  that are legal cells. `node tools/world.mjs invariants <ref> --browser` checks the frames the page really drew.
- **Terrain** (lessons K, requirements 27): ground features are drawn as depth strips of shaded quads; buildings stand on the
  slope; what lies behind a rise is dropped; a water below the ground is hidden behind the near bank.
- **Style kits and the strict critic** (lessons I): short specs get fill, edges, framing and backdrop from a kit.
- **Render glitches** (lessons H): discs, winter trees, T-pier decks, night key, ripple zigzag.
- **No-example places**: Whitby harbour is built from a 45-line spec and reads well in every season, time and rain. York,
  Liverpool and Malham are in progress on the branches uk-york, uk-liverpool and uk-malham (timber-framed jetty style and frontage
  expansion; civic towers, domes and clock faces; a cliff feature with strata, ledges and scree).

Still not right:

- **Frame time.** At 4x CPU throttle the compositor takes about 140 ms a frame (budget 8 ms) and a warm remount 1.7 to 2.6 s (budget
  1 s); the cold first bake is fine (well under 5 s). The cost is the chunk blits and the occluder redraws in
  `_wfrDraw` (the `depth` section of `stats().prof`); idea: pre-composite the run of chunks behind the farthest mover once per bake.
- (fixed 16 Oct, fix/pond: the pond's reflection steps, the boardwalk across the lake, the flat marsh slab; see SCENE_LESSONS U.) The nav map does not treat extruded buildings as
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

## Fixed 15 Oct (evening)
- Capture and review frames now really advance in time: `worldHostScrub(t)` / `window.__worldSetTime(t)` in `79-world-5host.js`;
  before, still frames always showed the base moment, so no tool had ever shown motion. [Merge of 15 Oct: not kept. main already
  advanced captures another way (a LIVE page, `page.frameAt(t)` pins the scene clock, `page.rewind()`; SCENE_LESSONS J); `world
  capture` and `world check` use it.]
- People no longer walk into each other: following (match the pace of a slower walker ahead with no room to pass) and a hard
  push-apart at shoulder width (0.28 m) in `79-world-2life.js` (`_wlfFollowCap`, `_wlfResolve`, `_wlfBody`). On the canal over
  5 min: pairs closer than 0.55 m went from 52 to 15 (brief overtakes by joggers). [Merge of 15 Oct: not kept; main's crowd
  (hard personal space `_wlfSeparate`, keep-left, queues, squeeze) is, see the merge section below.]
- Ducks and moorhens were drawn all along; they were only "missing" because every capture was frozen at moment zero, when
  they sit far away.

## Boat hulls (next fix, precise)
`worldExtrudeHull` (`79-world-4extrude.js`): for nb2 on fleet-canal-2 the end face spans y 484-606 (corners at y0..y0+h)
while the first side strip at the joint spans y 504-625. The side strips map the side art box (by0..by1, which reaches
about 11 units below the foot), but the end face uses y0..y0+h. So the side sits about 20 px lower than the end, its lower
hull falls under the waterline cut, and the two read as separate pieces. Fix: map the end face and the side strips onto
the SAME vertical frame (the hull from the waterline up, with the below-foot part of the art clipped consistently), and
check the boat in `world render` at noon and night.

## 15 Oct (late): canal boats are a 3D model
`worldExtrudeBoatModel` in `79-world-4extrude.js` draws narrowboats as real 3D geometry: a hull with bow sweep and counter,
decks, a cabin with coachlines, portholes and doors, a roof and a chimney, faces culled and sorted. Any obj matching
narrowboat, widebeam or boat.canal uses it. It looks right from any angle on the canal test scene.
TODO:
- Two tests in `tests/world-extrude.test.mjs` still expect the old sprite-hull prim shape (Q4 end-on/angle, and
  worldExtrudeDraw draws every prim kind). Update them to the model (end.which, faces).
- The user wants the boats to look BETTER still: rounded bow and tumblehome, cratch at the bow, tiller and rudder, roof
  clutter (plants, bike, coal bags, solar panel), mooring ropes to the bollards, curtains in the windows, night glow,
  name panel shapes (no text), more liveries, slight bob on water.

## The goal (the user, 15 Oct)
Mass-produce NEW scenes from scratch with the world engine. Old scenes are not the reference (many are weak); the bar is the
gold proof Fleet Pond. After the fix-all run, the next step is the from-scratch test: several never-drawn places (for
example Liverpool Pier Head, York's Shambles, Whitby harbour, Malham Cove, a Manchester street, a Sheffield park), each from
a short spec with the style kits, judged against the gold reference, timing the authoring. Then a scene factory: briefs ->
specs -> render -> automatic checks -> review sheet, so many scenes can be built in parallel.

## Fix-all, round 1 (15 Oct, late): six area fixers plus a verifier
Fixed in the engine (see SCENE_LESSONS sections O, P and R; reports kept outside the repo):
- Trees keep their crowns in every season: one source of seasonal state (the leaf state picks the library's seasonal art).
  Herbs go dormant in winter. Flower parts are flowers. Rime follows the weather.
- Water: overlapping water surfaces merge into one region (no seams). Calm canals ripple less. On a high quay, bank owners
  mirror about the water plane and the quay's own wall image hides what stands beyond it. Sunk channels draw coursed stone
  walls and their reflection (Kelham's flat dark slabs are gone).
- Night: light pools are additive and lie on the ground under everything. Halos are baked with their owners. Panes glow.
  Lamps are off at dawn. The v2 seasonal screen particles are off in v3. [Merge: main's lights kept (SCENE_LESSONS H); the
  halo on the drawn sprite's glow point and particles off are kept.]
- Boats: the narrowboat is a full 3D model with true K8 proportions, liveries, roof clutter, ropes, night glow and a bob.
  Walkways are modelled from the nav deck, and their deck sits under the railing. [Merge: the boat model and the deck height are
  kept; the walkway model is not (main's end-on walkway drawing is).]
- Placement: there is a near band for low statics (no bramble blobs). The solver re-checks every move. Reeds keep to the real
  margin. Logs stay off paths. A sky window is kept open. Near-band moves slide along their line (bollards). [Merge: all kept
  but the sky window, the fill's z-buffer and the tree budget (main's vista rule and strict-measure occlusion are kept).]
- Life: the push-apart really runs (the duplicate `_wlfNear`), with passing, following and spawn spacing. Outfits are drawn
  and picked least-worn, so no clones. [Merge: main's crowd kept; spawn spacing, outfits and the clone fix kept.]
- Checks: `node tools/world.mjs check <ref>` runs the pixel checks on real frames. Captures are 1600x900. The matrix has a
  snow day. Snow on a warm date is refused.

Still open (details in the round-1 verify notes): spring golden hour is a lemon wash and dawn and dusk are mauve (the shared
v2 grade). The pond at night is near black. Willow fronds read as streaks, and near willows hang from the frame top. The
canal's near bollard is a big dark post at the lens, and the boat is seen end-on (v2 shows it side-on). The canal in
mid-October is still mostly green where v2 is autumnal. Brambles show winter berries and white flowers. The pond's near
boardwalk is a flat deck surface with no rails or piles (a deck surface and a walkway entity overlap: one deck rule needed).
The chunking (2 chunks for 700 statics) and the order cost still fail the browser frame budget. The richness box measure
fails for the pond and Kelham (two todo tests). The narrowboat standing deck is still a slab over the whole boat (a stern-only
deck broke specs that put people mid-boat).

## Merge of 15 Oct: `integrate-main` (main after PR #19, plus this branch)
main (the reviewed line its places depend on) is the base; from this branch came what main lacked. Where both lines had fixed the
same thing, one implementation was kept, chosen by renders, captures and the browser checks (the per-file record, with the PNG
evidence, is in the merge report kept outside the repo):
- Kept from here: the 3D narrowboat model, the v2-engine copies (`78-scene-x-*`), the season mechanism (ONE source of seasonal
  state, `worldMaterialArtSeason`: it replaced main's `worldMaterialForm`; herbs dormant in winter), bollard habitat and the
  slide-along-the-line near band, the low-static near band, the margin rules, hedge sections, the walkway deck height, water
  regions merged (no seam), the high-quay mirror clip with the walls' own image in the water, shadows only from what is drawn,
  silhouette shadows, line-weight LOD for thin tree strokes, outfits drawn and the clone fix, particles off, the pixel checks
  (`world check`), 1600 x 900 captures, the snow-day matrix cell, wet factors, the fresh bud green, crown-cut framing.
- Kept from main instead of this branch's version: capture timing (live page, pinned clock), the crowd (now also: a couple keeps
  0.96 x its radii, a squeeze only in a lane a body wide), lights, ripple, walkway drawing, channel walls, fill vista and
  occlusion, the strict critic as the one emptiness gate, a demoted landmark as the critic's advice note (not a failure).
- SCENE_LESSONS was renumbered (both lines' rows kept): A-F as before, G user review, H render glitches, I detail defaults,
  J movement, K terrain, L the Shambles, M the Pier Head, N Malham Cove, O light and water, P trees and seasons, Q looking,
  R fix-all verify, S this merge.

## Whitby harbour with its landmarks (branch fix/whitby, 15 Oct)
`world-test/whitby-harbour-1-w3` now has the ruined abbey on the East Cliff, St Mary's church at the head of the 199 steps (with railings and
tread lines), red-pantiled houses stepping up the cliff in `along` rules on five lanes, and the swing bridge across the upper harbour that
bends away to the right; the piers and lighthouses are behind the left shoulder (out of the frame). Built from reusable generators, not from
art: `70-scene-gen-3ruin.js` (+ style `gothic-ruin`), `70-scene-gen-4bridge.js` (+ `swing-bridge`), styles `parish-church` and
`pantile-cottage`, the `steps` ground look, and `landmark: true` on a building (`79-world-0core.js`, `79-world-1fill.js`). SCENE_LESSONS T,
requirements section 30, tests `tests/scene-gen-ruin.test.mjs`. Not done: the harbour mouth (piers, lighthouses) needs a second view; the
church has no dormers; the abbey's east end is seen at a grazing angle from this camera.

## Malham Cove pass (15 Oct, branch fix/malham)
The cliff generator (`79-world-4cliff.js`), the terrain strips (`79-world-4terrain.js`) and the Malham spec were reworked so that
every cliff benefits (SCENE_LESSONS N, the rows marked "the Malham pass"): `rough` (default 1; 0 is the old ruled face) makes the
plan, the rim and the scree irregular and cuts a stained scoop into a long limestone face; beds wander and step at faults; ledges
break into runs and some overhang; the lip is pavement; the face rises out of a hill instead of being painted over by it; a pasture
hillside has patches, sheep trods, tussocks and scars. `tests/world-terrain.test.mjs` pins the ruled geometry with `rough: 0` and
tests the irregular defaults. Open: a wall that passes behind a face is drawn over it (a line is not clipped by a face).

## 16 Oct, fix/pond: Fleet Pond rebuilt, reflections smooth, a walkway never crosses open water
- `worldWalkwayWater` + invariant / validator rule `walkwayWater`; surface key `over: 'water'` (jetty, pier, pontoon, landing stage).
- Water: nonzero winding spans (a cut inside a lowered pond no longer leaves a hole), resampled mirror (no one-pixel staircases),
  channel walls never over a low deck.
- Natural edges for `reeds` and pond / lake polygons in the built world; `worldMarsh` (`79-world-4marsh.js`) for reed-bed walks.
- `fleet-pond-2-w3` is built with it: the walk, a 3 m footbridge over the stream, the reed bed and a platform at the reed edge.
- Liverpool's `stage` now says `over: 'water'` (a floating landing stage).
