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
2. Invariant checker (`worldInvariants`, run every frame in test mode over the FULL loop, at 3 dates x 5 times, in Node over the
   life sim AND in Chrome over the frame record of what the page really drew: `world invariants <ref> --browser`, accept item
   16.2b; section 26): zero
   violations of every [T] item that can be checked per frame. That covers habitat, footprint overlap, mover in solid,
   mover on water, floating, orphan attachment, reflection outside water, shadow on water, shadow direction consistency, mover
   cut at the edge, giant near mover, popping, stuck mover (no progress for 10 s while not in an idle goal), sliding feet,
   facing mismatch, lane direction, animating while still or still while moving (M1, M2), synchronised clones (M4) and
   wind direction disagreement (M3).
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

## 17. Animation state: things animate only when they should (added on the user's request)

- M1 [T] One animation state per entity, driven by what it is DOING, never by a timer:
  - moving: walk, run, pedal, swim, fly or drive cycles, at a rate tied to the actual speed;
  - still: idle micro-motion only (breathing, head turns, a tail swish);
  - sitting or lying: a seated pose, no leg motion;
  - stopped vehicles: wheels still, no wake, no exhaust drift unless idling;
  - moored boats: no wake and no motion beyond a slight bob.
- M2 [T] Static things never animate: buildings, walls, benches, parked cars, rocks, paving, signs, bridges.
- M3 [T] Things move only by cause:
  - trees, reeds, grass, washing and water ripples move with the scene's ONE wind (shared strength and direction, gusts that
    travel across the scene), in proportion to size and stiffness;
  - smoke and steam drift downwind;
  - falling leaves only in autumn and in wind.
- M4 [T] No synchronised clones: animation phases and periods are varied per entity, so no two ducks bob in step and no two
  walkers swing arms together.
- M5 Secondary motion: leads swing between dog and walker, coats and scarves lag slightly, a dog's ears and tail react to its
  gait, boats rock in wakes passing by, reeds part as a heron walks through. All of it is cheap and optional by budget.
- M6 Reactions and events: ducks paddle away from a dog at the bank; pigeons lift when someone walks through them and settle
  again; people wait for a tram, board when it stops, and get off; a heron freezes, then strikes; a cyclist rings and passes.
  Events are scripted by the engine from populations, not hand-timed.
- M7 [T] Transitions: walk to stop, stand to sit, swim to take-off, each eased and with the right view, never instant.
- M8 [T] Frame-rate independence: motion uses real time, not frames. The scene pauses when hidden or the tab is inactive,
  and resumes without a jump.

## 18. Game-engine fundamentals (what a real engine gives you for free)

- G1 Entity and component model: an entity has a transform, a descriptor (K), a renderer, an animator, a brain, a
  collider and attachments. Systems run over components in a fixed order: input/time, brains, navigation, movement,
  animation, attachments, wind and particles, lighting, render.
- G2 Scene graph: children inherit their parent's transform (a lead on a dog, a rider on a bike, a person on a boat deck, a
  lamp on a bridge). Moving the parent moves the children.
- G3 [T] Spatial index (a grid or quadtree) for placement, collision, avoidance and occlusion queries; no O(n^2) scans each
  frame.
- G4 [T] Deterministic random streams per system and entity, so changing one entity does not reshuffle the whole scene.
- G5 Event bus: arrivals, departures, a sunset threshold (lights on), weather changes and schedules; systems subscribe.
- G6 Particles: leaves, snow, rain, spray at weirs, smoke, chimney steam, splashes when a kingfisher dives. Pooled and capped.
- G7 Level of detail: far entities use simpler sprites, no secondary motion, and lower update rates. Off-screen and fully
  occluded entities are culled.
- G8 [T] Error isolation: one bad entity or object never crashes a scene. It is dropped, logged and the rest renders.
- G9 Debug overlays: footprints, nav map, paths, depth order, light direction, wind field, water mirror lines and
  invariant violations, toggled in tools and in a dev URL flag.
- G10 [T] State continuity: re-renders of the app (saving tasks, live sync) do not restart the scene or re-roll its life.
- G11 Format versioning: the scene format carries a version; migrations upgrade old scenes; the validator knows every
  version.
- G12 Profiling hooks per system (ms per frame), surfaced by the perf tool, so regressions are visible.

## 19. Things that commonly go wrong in 2D engines (check each)

- Z-fighting between objects at the same depth: a stable tie-break by id.
- Sprites popping between LOD or view sets: cross-fade or hysteresis.
- Outlines and anti-aliasing seams between chunks or tiles: overlap bleed, integer snapping of chunk edges.
- Colour banding in the sky and water gradients: dither.
- Shadows and reflections of transparent or thin things (railings, wires, reeds): handled, not solid blocks.
- Moving shadows on moving surfaces (a person on a moving boat).
- Things under bridges in shade: the bridge casts its shadow by geometry; no hand shade.
- Wide aspect ratios revealing unfinished scene edges: the world extends beyond the default frame (overscan) so 21:9 never shows
  an edge.
- Tiny screens: the subject stays readable in the tile crop (C4 at tile size).

## 20. Variation is free: time, season and weather are parameters, not work (the user, 10 Oct)

One v3 scene renders correctly at ANY date, time and weather with zero extra authoring.
- V1 [T] A scene spec contains no per-season, per-time or per-weather data: no seasonal variants, no night copies, no
  colour lists. The validator rejects them.
- V2 [T] Colour comes from materials, not baked colours. Every object part has a material (bark, leaf, brick, stone,
  water, glass, paint, skin, fabric and so on). The engine colours each material from:
  - the season (leaf and grass colour by month, bare and budding states);
  - the light (sun colour and elevation, sky ambient, overcast, night);
  - the weather (wet darkening, frost or snow overlay);
  - the haze of its depth.
- V3 [T] Object state comes from descriptors (K6):
  - trees leaf out, turn and drop by date;
  - flowers bloom in their months;
  - snow sits on surfaces on snow days;
  - windows and lamps light by sun elevation, varied per window;
  - café furniture and markets appear by season and dates;
  - populations change by hour, weekday and weather.
- V4 [T] Light is computed from the almanac for the scene's lat/lon and date/time: sun and moon positions, shadow direction
  and length, sky gradient, golden hour and twilight.
- V5 [T] Changing the date, time or weather invalidates only what it affects (season sprites, light grade, lit windows,
  snow overlays) and reuses the rest from cache, so a change of time or season is fast.
- V6 Tools: `world sheet <ref> --matrix` renders the same scene across 4 seasons x 5 times x 3 weathers in one go. A dev
  time/season/weather scrubber in the gallery preview lets the user drag through a day or a year live.
- V7 [T] Acceptance: every test scene renders at every cell of that matrix with zero invariant violations, and a fresh
  reviewer checks the matrix for wrong colours (green trees in January, lit windows at noon, shadows at night, snow in July).

## 21. Physics and simulation plug in cleanly (the user, 10 Oct)

The engine is a set of SYSTEMS over components (G1), so new physics plugs in without touching scenes or other systems.
- Y1 [T] A documented system interface: `worldSystem({ id, after, before, components, init(world), update(world, dt),
  onEvent })`, with a fixed tick (for example 30 Hz) and render interpolation. Systems declare their order and the
  components they read and write.
- Y2 [T] The built-in systems use that same interface, as proof that it works: time and almanac, wind field, water (surface,
  ripple, waves, flow, wakes, rings, buoyancy for floaters), navigation and avoidance (people, animals, vehicles), animation
  state, attachments (leads, mooring lines), particles, lighting, render.
- Y3 Water physics: buoyancy bob from waves and wakes (a boat rocks when another passes), wakes spreading and fading, rings
  from paddling birds, flow advecting floating leaves, rain rings on the surface in rain.
- Y4 People and crowd physics: steering (seek, arrive, separate, avoid), personal space, queues at stops and benches, groups
  keeping formation, speeds by age and gait.
- Y5 Wind as a field (strength, direction and gusts travelling across the scene) read by trees, reeds, grass, water, smoke,
  leaves and washing.
- Y6 Simple rigid bodies where useful: a thrown ball for a dog (an arc and bounces), falling leaves and seeds, a heron's
  splash. All cheap and capped.
- Y7 [T] Budgets per system (ms per frame); a system over budget degrades (lower rate, LOD) instead of slowing the frame.

## 22. Perspective is automatic (the user, 10 Oct)

The author never thinks about perspective. They describe the world in metres and pick a viewpoint; the engine projects it.
- Q1 Camera by intent: `camera: { at: [lat, lon] or [x, z], height, lookAt: <landmark id or bearing>, fov }`, or
  `camera: { frame: [<landmark ids>] }` to fit chosen subjects. The engine sets the heading, horizon and framing (C3, C4).
- Q2 [T] Linear features are given as centrelines and widths (roads, canals, rivers, paths, towpaths, rails, kerbs, walls,
  hedges, fences, railings). The engine draws them in correct perspective, with converging edges and correct widths at every
  depth, including curves and slopes.
- Q3 [T] Buildings are given as footprints, heights and a style (terrace, mill, warehouse, civic, glass tower, cottage, church).
  The engine extrudes them in perspective: visible faces, roofs, windows in courses, foreshortened correctly. Landmarks can
  use their hand-drawn art but are still placed and scaled by the camera.
- Q4 [T] Objects choose their view from the camera's angle to them (front, three-quarter or side; the same 5 views as
  movers) and keep their real size at their depth. A boat seen end-on is drawn end-on and never as a flat side slab.
- Q5 [T] Ground textures, paving courses, mowing stripes and water ripples foreshorten with depth.
- Q6 Wide and tall frames (21:9, 4K, phone) extend the same world. Nothing is stretched, and the frame shows more of it (overscan).
- Q7 [T] Changing the camera (a new viewpoint of the same place) needs no other change to the scene. That is how the 4
  views of a place are made: one world, four cameras.

## 23. Speed (render and authoring)

- Z1 Render: the targets in F1-F2 hold for every test scene and at the matrix extremes (snowy night with many lights).
- Z2 Authoring: a new place (one world plus 4 cameras) should take an agent under 30 minutes to a first good render, with
  no glitch rounds. Measure and report it for each test scene.

## 24. Visual quality parity (the user, 10 Oct: the first v3 renders are "significantly worse")

- QP1 The acceptance bar is VISUAL, not a score: each v3 test scene must look at least as good as its original (and the
  gold proof Fleet Pond) to a fresh reviewer at the same date and time. Richness numbers are only a guide.
- QP2 v3 must reuse the existing high-quality library art: hero trees, boughs, reeds, boats, buildings, landmarks,
  people. It must not swap in simpler stand-ins. Converted scenes keep every hero object of the source.
- QP3 Composition carries over: camera, framing foreground, leading line, landmark placement and depth layering match the
  source within a small tolerance (`world compare` overlays both).
- QP4 No untextured or unlit surfaces (flat white or flat colour bands), no missing materials, and night keeps every
  structure readable.
- QP5 Stills must show life: the simulation is pre-warmed so populations are on screen at t = 0.

## 25. Quality without an example (the user, 10 Oct: "how do we make sure new scenes with no examples match the quality")

Quality has to live in the engine, the library and the gate, never in having a reference scene to copy.
- N1 Style kits: per setting (canal, lake or pond, heath, woodland, village green, river city, civic square, quayside,
  terraced street, park, moor, coast), a curated kit of the BEST library objects (hero trees, boughs, reeds, boats, street
  furniture, buildings, people mixes) with density and grouping targets. Fill, framing and backdrop draw from the kit, so a
  new place inherits gold-standard parts automatically. Weak objects (blob trees, placeholder shapes) are excluded from
  kits.
- N2 Composition rules as engine defaults: a framing foreground, a leading line toward the subject, the subject placed off
  centre, at least 5 depth layers, near/mid/far coverage targets and sky share by setting. Camera-by-intent (Q1) applies
  them, so an author picks a place and a subject and gets a well-composed frame.
- N3 Life defaults per setting: populations, wildlife and traffic at real densities by time, so no scene ships lifeless.
- N4 A gold set as a benchmark, not a template: the proof Fleet Pond and the approved best views are scored by the critic
  and a reviewer. A new scene must reach the gold set's band on every critic axis: coverage, layering, framing, variety,
  life, light, motion cleanliness.
- N5 [T] The no-example test: the acceptance suite builds at least one brand-new place that has never been drawn, from a short
  spec only, and a fresh reviewer compares it with the gold set at the same date and time. It must pass with no glitch
  rounds. This is repeated for each new setting kit.
- N6 Object quality gate: any new library object must pass object lint, look right at near, mid and far sizes in all four
  seasons and at night, and be approved before it can join a kit.

## 26. Movement holds in the rendered frames (the user, 14 Oct: "people walking into each other ... SO SO buggy")

The unit tests and the Node run were green while the page was not. The contract now is on what the PAGE draws.

- MV1 [T] The checker runs on the real frames: Chrome draws every frame of the loop at a pinned scene time and the record of
  what it drew (`worldFrameDrawn`: the same agents at the same scene time, after the draw's own drops) goes to `worldInvariants`.
  A run whose clock drifts (the page restarted its life mid-run) is an ERROR of the run, never a clean or a dirty result.
- MV2 [T] Personal space is a hard floor: no two unrelated movers on one layer overlap or pass through each other (invariant
  `personalSpace`, 85 % of the sum of their body radii; a walker and its dog never share a spot). The one exception is a lane
  a body wide, where a pair that stalled for 2.5 s turns sideways and passes through each other for a step (`squeeze`).
- MV3 [T] Oncoming movers pass side by side, keeping to the LEFT; a mover going the same way slower is followed (queue) or
  overtaken on the right; a sideways shuffle needs no forward speed.
- MV4 [T] Nobody stands in a lane to wait (a standing mover is the next blockage). A mover with somewhere to go that makes no
  headway for 10 s is retired and logged (`stuckRetired`); the checker's `stuck` rule is about intent, not pose: 20 s for a
  mover with somewhere to go whatever pose it is drawn in, 90 s for a statue (herons and residents longer).
- MV5 [T] Targets are reachable: a wanderer only picks places in its own connected component; a resident starts beside the
  entity its first goal names; an unreachable `go` is given up on the second failure; leaving forgets the point of interest.
- MV6 [T] Nothing teleports: no walker or dog moves more than 0.45 m in one tick; the lead pulls at most 6 m/s, slides round
  solids, and the walker waits while it is taut.
- MV7 [T] What is drawn matches what the mover does: the record's clip is the presented clip, the shown velocity is the real one
  low-passed over 0.2 s, positions interpolate but every other field is the latest tick's, and `slidingFeet` compares the feet's
  ground speed with the range the mover covered over the last 0.8 s.
- MV8 [T] Nobody pops: the governor thins movers by a hash of the id and only beyond 40 m; captures and the real-frame checker
  run with it off; a pinned scene clock moves only for frames at the pinned time.
- MV9 `capture --full` is the whole loop: a live page, the clock pinned per frame, `rewind()` per pass; a capture that shows the
  same frame twice is broken.
- MV10 [T] A converted view keeps its composition (QP3): the pinned perspective pieces of a v2 canal view become the real
  objects they are parts of (the near narrowboat as a framing element, the willow the fronds hang from, the bridge).


## 27. Terrain is drawn, and what it hides is not (the first no-example place, 14 Oct)

- TR1 [T] A hill inside a surface polygon is drawn: `ground.features` and `ground.relief` become strips of the relief (far first,
  3 % depth steps, quads shaded by slope, rock when steep, grass or the surface's own colour otherwise), ordered with every
  other static, so a house stands on its strip and a hill hides what lies behind it. Flat ground draws nothing.
- TR2 [T] An entity wholly behind a nearer rise of the ground is dropped and logged (`terrain`); floaters on water are exempt.
- TR3 [T] A prop never fills more than about 12 % of the frame at the lens (a 1.3 m reference height), a person or animal 45 %.
- TR4 [T] A water below the ground level is hidden behind the near bank: its visible footprint is the polygon cut by the water openings
  scaled by (eye - level) / eye about the camera's foot, so a quay never shows the harbour over its own paving, and two waters
  side by side are one opening.
- TR5 [T] A cliff is a ground feature (`kind: 'cliff'`: a `path` or an `arc`, `h`, `scree`, `batter`, `rim`, `high`, `fade`, `rock`) whose shape is analytic (`worldCliffHeight`): a vertical
  face of the full height, a talus skirt below it, a rounded lip and the plateau behind; the relief grid carries a coarse copy (rows every 1 % of the depth, columns every metre) for
  everything else, and the strips take their heights from the analytic function.
- TR6 [T] The face is drawn with true geometry in depth-binned columns (far first, each prim with a footprint in metres along the face): beds of rock, ledges, joints, weathering streaks,
  lichen, tufts and small trees on the ledges, turf and thorns on the rim, and a talus of stones and tussocks placed in metres. It reads as the rock of the spec (`rock`), at every light.
- TR7 [T] The strips are cut at the face foot and lip; what the face hides is exact (the sight line against the face top: `worldCliffHides`), so a plateau behind it is not drawn from
  below and is from above, and a hill beside its horn is; terrain hides a mover only where its upper edge reaches above the mover feet (the occluder redraws stay under budget).
- TR8 [T] The texture is stable: the same ops for the same cliff in every build and frame (it lives in metres along the face and up it, from one seed), and no seam between depth groups.
- TR9 [T] The face follows the light and the weather by the materials: lit by the real sun column by column, darker when wet, snow along the ledges on snow days, trees bare in winter;
  an upland wall is dry-stone, a narrow river a beck, the `dale` kit an open limestone pasture (the 13th kit).
