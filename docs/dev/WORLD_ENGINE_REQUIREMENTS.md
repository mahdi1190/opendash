# World engine: complete requirements and acceptance tests

This is the contract the world engine (v3, `src/app/79-world-*.js`, `docs/dev/WORLD_ENGINE.md`) must meet BEFORE any scene is
shown to the user. It collects every problem found in Oct 2026 (`docs/dev/SCENE_LESSONS.md`) and the ones not hit yet. Where
WORLD_ENGINE.md disagrees with this file, THIS FILE WINS (for example, reflections come from the water surface, not per entity).

The aim, in the user's words: building scenes must be easy, fast and not buggy, like a game engine. The engine must know what
is weird. Bad or lazy input makes a scene plainer, never wrong. It must work first time.

Each requirement has an id. `[T]` marks one that the automated acceptance suite (section 16) must check; the rest are
checked by looking at the renders.

---

## 1. World model

- W1 [T] Every entity lives in world metres: x (across), z (depth), y (height). There is no screen-pixel placement anywhere
  in the v3 format; the validator rejects it.
- W2 [T] The terrain has height: slopes, banks, embankments, cuttings. Ground height `h(x,z)` is defined everywhere in view;
  nothing is placed through it or floating above it.
- W3 [T] Raised walkable surfaces are first class: decks, bridges, platforms, boardwalks, jetties, pontoons, stairs and
  ramps (stairs and ramps join levels). Movers stand on them at their height. A bridge deck is NOT a blocker for what passes
  under it.
- W4 [T] Water has a level per region, and it can step at a weir or a lock.
- W5 The camera has a real position, height, heading, fov, lat/lon and date/time. The horizon, scale and backdrop bearings all
  come from it.

## 2. Knowledge base: every object class knows itself

Each library object class has a descriptor that the ENGINE reads; scenes never repeat it.

- K1 [T] Habitat: where it may exist. Boats: water (the whole footprint inset from the banks). Ducks and swans: water, or bank
  when grazing. Cars, vans and buses: road lanes. Trams: tram rails. Trains: rail. People: walkable surfaces. Benches,
  bins and lamps: paving or grass edge, never across a path line. Trees: soil or grass, never on paving unless in a pit or
  planter. Reeds: the water margin or wet ground. Lilies: water. Fish rings: water. Moored boats: alongside a bank or a pontoon.
- K2 [T] Footprint (a real ground outline, not the picture box), height, solidity (`solid | walkable | water | passable |
  overhead`) and clearance.
- K3 [T] Orientation rules. Boats run parallel to the bank or channel. Cars align with their lane in the UK direction (they
  drive on the LEFT). Benches face the path or the view. Buildings face their street. Trains and trams align with the rails.
  Gates sit in their fence line. Moored boats face either way, parallel to the bank.
- K4 [T] Attachment (parent). Boughs, branches and fronds belong to a tree, whose trunk is in frame or just outside it on the
  same side and at a plausible height. A dog lead joins a walker and a dog. Lamps, signs and cameras sit on a post or wall.
  Mooring lines go from a boat to a bollard or ring. Smoke comes from a chimney. Washing lines run between two supports.
  Window lights belong to a building. Orphans are re-attached or dropped at load, and logged.
- K5 Grouping: ducks in loose groups, swans in pairs, trees in clumps with gaps, reeds in stands, people as singles, pairs,
  families or groups, cars in traffic with gaps, boats moored nose to tail.
- K6 [T] When: season, months, hours, weather and day of week for every class. Flowers bloom in their months. Insects fly
  Apr-Sep in warmth. Swallows come in summer. Market stalls only on their dates. Picnics in warm months. Umbrellas in rain.
  Café tables come out in fine weather. Fewer people at night, more at weekends in parks and at rush hour in cities.
- K7 Region validity: no palms in Sheffield, no US school buses in Manchester. Local transport liveries: Metrolink yellow and
  grey; Supertram, buses and trains in plausible UK styles.
- K8 [T] Real size ranges per class, pose and age: adult standing 1.6-1.9 m, child 1.0-1.4 m, seated about 1.3 m to the head,
  dog 0.3-0.7 m, duck 0.35 m, swan 0.6 m on water, heron 0.9 m, cow 1.4 m, narrowboat 2.1 m beam by 15-21 m long, car
  1.5 m tall.
- K9 [T] Care rules carry over: no readable text, flags, faces or political or military symbols. People are anonymous
  silhouettes.

## 3. Placement solver (the engine places sensibly whatever the input)

- P1 [T] Snap: every entity is snapped to its habitat surface at the right height. If it cannot be placed, it is moved to the
  nearest valid spot within a small radius, else dropped. Every action is logged with a reason.
- P2 [T] No overlaps: solid footprints never intersect. Clearance is kept round paths, doors and gates.
- P3 [T] Paths stay clear: no tree, bench, lamp or bin stands on a walking line, and no object blocks a gate or a bridge.
- P4 [T] No rows or grids unless real (a street of terraces, an avenue, a row of moorings): clustered, jittered distributions.
- P5 Edges are dressed automatically: water edges get banks, reeds and coping by kind; paths get verges; roads get kerbs and
  pavements; walls get bases; fields get hedgerows.
- P6 [T] Auto-fill: any visible surface area with no dressing gets the surface's default planting or scatter by place style and
  season (grass gets tussocks and flowers in season, heath gets heather and gorse, paving gets texture and leaf litter, water
  gets lilies and rings where calm). The author can switch this off with `fill: false`.
- P7 [T] Richness floor: per frame band (near, mid, far), a minimum coverage and object variety. A converted scene must have at
  least the source scene's richness score.
- P8 Landmark protection: nothing auto-placed may hide a declared landmark's main face.

## 4. Composition and framing

- C1 [T] No entity larger than about 25% of the frame is cut by the frame edge, unless it is a declared framing element
  (bough, trunk, hedge, wall edge).
- C2 [T] No mover idles or spawns inside the near clip band, and no half-person is left at the frame edge.
- C3 Automatic framing foreground: if the author gives none, the engine adds a natural frame from the place style (bough,
  reeds, hedge, railing, lamp post).
- C4 [T] Landmark check: each declared landmark is visible (at least 60% of its face) and not dwarfed or cropped.
- C5 Horizon and backdrop: the backdrop shows wherever sky meets ground, and it never duplicates a skyline the scene already
  has.
- C6 [T] Empty-area check: no bare region larger than 15% of the frame (sky excluded) after auto-fill.
- C7 Views of one place must differ (camera position or heading or subject); the validator warns when two views of a place are
  near-identical.

## 5. Rendering and depth

- R1 [T] Draw order is true depth for everything, every frame. The parts of one entity draw in tiers (hull, cabin, roof).
  There are no baked layers that merge near and far: static chunks are depth-sorted and movers interleave between them.
- R2 [T] Occlusion: a mover behind a reed stand, boat, wall, tree or person is hidden by it, and in front of what is behind it.
- R3 Sharp at any size: the backing store is capped by pixel count and the drawing is crisp on 21:9 ultrawide, 4K, 16:9,
  phone and tile.
- R4 [T] Determinism: the same scene, date and seed give the same frame. The loop is seamless.
- R5 [T] The clock starts at first show, not during hidden preparation.

## 6. Light and shadow (engine only)

- L1 [T] Sun and moon from the real almanac. Sky, ambient and light colour from sun elevation: dawn, noon, golden hour, dusk,
  night.
- L2 [T] Shadows from geometry: direction from the sun azimuth, length from its elevation, ONE direction for the whole scene,
  cast on ground and walls, never on water (water darkens subtly instead). Movers' shadows move with them and only exist
  while the mover is visible.
- L3 [T] No light, shadow or tint in object art or scenes: the validator rejects hand shadows, hand reflections and per-scene
  light settings.
- L4 Night: windows lit per window (random, varied, not all at once), street lamps with light pools, headlights and tail
  lights, lit tram and train windows, the moon's glitter on water.
- L5 Weather light: overcast flattens shadows, fog hazes by depth, rain darkens and wets.

## 7. Water (engine only)

- H1 [T] Reflections come FROM THE WATER SURFACE: each water region mirrors the already composited scene above it about its
  own waterline (per column, following banks in perspective), then applies ripple, fade with distance, a Fresnel falloff and
  tint. Objects never make their own reflection, so multi-piece objects (boats, bridges, viaducts) can never repeat or double.
- H2 [T] Things standing in water (herons, posts, snags, reeds, piers, people on jetties) reflect because they are drawn
  above it. Nothing reflects outside water.
- H3 [T] Floaters sit in the water: a waterline cut, a slight sink by class, a wake when moving, rings when bobbing.
- H4 Flowing water: rivers have a flow direction (ripple drift). Weirs and waterfalls draw as falling water with foam and
  spray at the step, never as a flat slab. Canals are still.
- H5 Water kinds (pond, lake, canal, river, sea or harbour) set colour, clarity, mirror and ripple. Scenes may only give
  `hint: calm | breezy`.
- H6 [T] No black holes or gaps at the frame edge, near the camera or where water meets an occluder.

## 8. Seasons and weather

- S1 [T] Deciduous trees bare in winter with twigs, budding in spring, full in summer, turning unevenly in autumn. Evergreens
  stay.
- S2 [T] Seeded frost and snow days by date and place. Snow lies on the ground, roofs and boughs on snow days, and flakes fall
  only while it snows.
- S3 Wind sways trees, reeds and water by the same wind, in the same direction.
- S4 [T] Seasonal life and props follow K6.

## 9. Life: agents, navigation and behaviour

- A1 [T] Populations, not paths: scenes declare who lives there (for example "towpath walkers 6/min, 20% with dogs",
  "ducks 8", "tram every 3 min"); the engine spawns, routes and despawns them. Density scales by place type, time, day,
  season and weather.
- A2 [T] Navigation on the walkable map of K1 and W3, with solids cut out: A* or navmesh routing, local avoidance, no
  passing through anything solid, no walking on water, no mid-air.
- A3 [T] Spawn and despawn only at frame edges, doors, behind cover or at stops. No popping.
- A4 [T] Goals and destinations: walk through, walk to a bench and sit (respecting bench capacity), stop at a viewpoint, wait
  at a stop and board, go into a shop, fish from a swim, feed ducks. Movers are never stuck, walking on the spot or going
  nowhere.
- A5 [T] Facing: 8 directions from the actual velocity (5 views and mirror), with hysteresis so nothing flickers. A standing
  mover keeps its last facing or faces its point of interest.
- A6 [T] Animation matches motion: stride rate from speed (no sliding feet), idle micro-motion when still, easing on start,
  stop and turn.
- A7 Groups move as units: couples, families, dog and walker (the lead stays attached, the dog roams within the lead length),
  friends chatting.
- A8 [T] Water animals swim inside water regions, clear of hulls, moving in loose groups. They dabble, preen and take off.
  Herons stalk at margins. Birds perch only on valid perches (branches, roofs, posts, wires, rails) and fly round buildings
  and trees, never through them.
- A9 [T] Vehicles stay in their lanes in the UK direction, keep gaps, stop at crossings and stops (buses at stops, trams at
  platforms), turn on curves with their views, and never pass through each other. Trains run on rails on a timetable, at a
  plausible speed. Boats under way travel mid-channel at walking pace with wakes; moored boats never move.
- A10 [T] Scale from K8 at true depth, through the camera. No giants near the camera: the near band is reserved for framing.
- A11 Variety: outfits, colours, gaits, ages and breeds are varied by seed, with no clones walking together.

## 10. Backdrop

- B1 [T] Place-styled depth bands (city vernacular or nature) fill any bare horizon. Landmarks sit at their real bearings.
  Bands haze by distance, follow the seasons and light at night.
- B2 No duplicate skylines: the backdrop yields to anything the scene declares in that bearing range.

## 11. Time and loops

- T1 [T] Seamless loop. Schedules (trams, trains, boats) fit the loop. No visible restart.
- T2 Time of day and date come from the live clock in the app, or fixed in previews.

## 12. Performance (average machine: GPU on, CPU throttled 4x, 1920x1080 at 1.25, and 3440x1440)

- F1 [T] Cold load under 5 s and warm load under 1 s for every test scene. Frame median under 8 ms, p95 under 14 ms.
- F2 [T] Sprite memory and distinct-sprite budgets are met, by caching and sharing sprites between instances.
- F3 Prebaked static layers where they help, invalidated correctly by season, time band and weather.
- F4 [T] Reduced motion is respected.

## 13. Authoring (the reason for all this)

- U1 A v3 scene is short: place, camera, surfaces, landmarks, key entities, populations, style. Defaults fill the rest.
- U2 [T] The validator gives friendly errors with a fix suggestion; the load log lists every snap, drop and auto-fill.
- U3 Tools: `world sheet` (dates x times x sizes), `world motion` (paths, footprints, violations), `world capture --full`
  (the WHOLE loop, not just 20 s), `world critic` (richness, emptiness, framing scores), `world compare <v3> <original>`
  (side by side).
- U4 A converter from v2 and v1 carries over everything visible, with no loss of richness (P7).

## 14. App integration

- I1 [T] v3 scenes register like other packs: ukPlace, ukView, county, rotation, gallery "all versions", pins, blocks, the
  splash prebake, the bake cache and sceneHostRestartClock.
- I2 [T] Old v1 and v2 scenes keep working until they are converted.
- I3 No personal data. Privacy scan clean.

## 15. Process

- X1 Builders own explicit files. Shared files are edited by one agent at a time. Run a syntax check before saving.
- X2 Checkpoint commits after each phase (only the phase's own files, noreply author) so a session restart loses nothing.
- X3 Every new class of mistake gets a row in SCENE_LESSONS.md and, where possible, a requirement here with a test.
- X4 Nothing is shown to the user until the acceptance suite passes and a fresh-eyes reviewer has compared the renders with
  the originals and the gold reference (proof Fleet Pond).

## 16. Acceptance suite (must pass before showing the user)

1. Unit tests: `node --test tests/world-*.test.mjs` all green.
2. Invariant checker (`worldInvariants`, run every frame in test mode over the FULL loop, at 3 dates x 5 times): zero
   violations of every [T] item that can be checked per frame. That covers habitat, footprint overlap, mover in solid,
   mover on water, floating, orphan attachment, reflection outside water, shadow on water, shadow direction consistency, mover
   cut at the edge, giant near mover, popping, stuck mover (no progress for 10 s while not in an idle goal), sliding feet,
   facing mismatch, and lane direction.
3. Adversarial scenes (`tests/fixtures/world/adversarial/*.json`), written deliberately wrong:
   - boats on the towpath;
   - a bough with no tree;
   - willow fronds in mid-air;
   - people placed inside a hedge and a wall;
   - a bench across the path;
   - cars driving on the right;
   - a duck on a roof;
   - a train off its rails;
   - an empty scene with only a camera and a water polygon;
   - a scene with hand-set light and reflections;
   - a landmark behind a tree wall;
   - a giant person at 2 m;
   - a population larger than the space;
   - a camera looking straight into a wall.

   Each must render plain-but-sensible, with zero invariant violations and a load log explaining every fix.
4. The test scenes (fleet-canal-2, fleet-pond-2, kelham-1) are at least as rich as their originals (critic score), have zero
   invariant violations, and look right in `world compare` side by side at 3 dates x 5 times and in full-loop captures.
5. Performance gates (F1, F2) at both average-machine sizes.
6. A fresh-context reviewer (not an author) looks at every compare sheet and full-loop strip and lists anything weird; the
   list must be empty.
