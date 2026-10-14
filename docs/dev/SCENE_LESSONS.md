# Scene lessons: what went wrong, why, and the rule that prevents it

Read this BEFORE building or editing any scene. Every item below cost at least one full
review round in Oct 2026. Most are now enforced by the engine or the lint; the rest are
rules for the author. Skipping them is the main reason a scene takes three rounds instead of one.

Gold reference: proof Fleet Pond (`--pack proof-fleet-pond`). Judge every view against it.

## A. Composition (author rules; the reviewer rejects on sight)

| Mistake | Why it happened | Rule |
|---|---|---|
| All views of a place were the same layout (path up the middle, pond, birches either side) | The author drew view 1, then cloned its plan for views 2-4 | Before drawing, write the 4 viewpoints in the scene header: camera position and heading, the landmark, the leading line, the framing foreground. They must differ in all four. |
| Big empty paving, roads or grass (city squares, fields, the near half of the frame) | Surfaces get nothing unless the author scatters them; authors framed too wide | No bare area larger than about 15 % of the frame. Fill near ground with real dressing (people flows, street furniture, planters, trees, litter of leaves, paving texture), or move the camera closer so buildings fill the frame. |
| Too few people in city scenes | Single hand-placed walkers instead of flows | Cities use crowd flows on every walkable surface, plus traffic, buses and trams where real. |
| Blob, lollipop and stacked-ball trees | Old cheap tree objects were reused | Do not use `tree.pond-wood`, `tree.pond-oak`, `tree.pool-oak`, `tree.birch-heath` or other round-dome trees near the camera. Use structured trees with limbs and sky gaps: `tree.pool-birch`, `tree.canal-oak`, `tree.canal-willow`, `tree.wyv-far-oak`, `tree.wyv-far-sallow`, or draw one to that standard. |
| Objects in rows or grids (reeds in lines, trees at even spacing) | Uniform scatter or hand loops | Use clustered scatter (`cluster`) or the clump helpers; the grid lint must pass. |
| Generic or wrong landmarks | The author guessed instead of checking the real place | Every landmark must be a real building, with its real shape, material and position. Name it in the header with its source (listing entry, map, photo description). |
| Things that look like planks, poles or slabs (a fallen tree, a flat green rectangle) | Placeholder shapes were left in | No placeholder geometry in a finished view; render and inspect every object at full size. |
| Off-season things (daffodils in autumn, insects in winter, flowers in snow) | Objects without seasonal rules | Leave seasons to the engine and the seasonal objects; never pin a flower or insect to a scene without `season`. |
| Empty backgrounds | Scenes only drew the near subject; the horizon was left as sky | The engine fills the background with place-styled city or nature bands by default (`70-scene-lib-backdrops.js`; a scene declares at most `backdrop: { style }`, never its own skyline); the `emptyBackdrop` lint warns when more than 20 % of the horizon band is bare. |
| Painted backdrops (whole AI-painted scenes) | Tried as a shortcut | Rejected: off-style and nothing moves. Only library objects, composed by the engine. |
| Water, light and reflections tuned per scene (own water colours, `mirror`, `ripple`, `clarity`, `bed`, `glint`, `shimmer`, `lightPath`, `reflect: true/false` on placements, hand-drawn reflections or shade on water, a scene's own grade) | Authors tweaked each view until it looked right in one light; the next light, season or engine fix broke it (reflections offset, doubled, missing under herons and snags) | **Locked (10 Oct).** A water region declares only its geometry (`poly` / `path` + `width`, `edge`) and a `kind` (pond, lake, canal, river, sea, harbour, puddle), at most `hint: 'calm' \| 'breezy'`. The water pass takes colour, mirror, ripple, clarity and glitter from the kind and decides what reflects from geometry (anything whose mirror image reaches the water; anything standing in it about its own foot). A v1 view opts in with `fx: { water: 2 }`. Never draw a reflection or a shadow; never set light. Lint: `waterOverride` (below). |
| A walker routed past the camera renders giant, cut by the frame, faceless | Routes ran to 3 m from the eye after the true-scale change | No person on screen may stand nearer than the depth where 1.7 m fills 45 % of the frame (`f * 1.7 / d <= 405`) unless the view says `framed: true`; end the route there or run it off the frame's side. Lint: `moverNear`. |
| A bird or prop pinned in pixels sits on open water (a kingfisher on a floating twig) | Pixel placements ignore the water | Perches are real objects placed in ground metres (a snag, a post, a branch); pinned birds only on a drawn perch. |

## B. Animation (engine guards plus `scene motion`; must be clean)

| Mistake | Why | Now |
|---|---|---|
| Ducks floating above the water | Bird paths were screen pixels with no water surface | Floaters sit in the water with a waterline (`sceneMoverSize().sink`). Boats sink only a little and never when they have no hull part. |
| Ducks swimming through boats, dogs and walkers through walls, fences and gates | Paths ignored solid objects | Solid placements have ground footprints; paths are routed round them or the lint fails. Gates block unless `open: true`. |
| A mover in the right place but drawn in front of nearer things | Movers drew in one layer above the bake | Movers sort by depth every frame and nearer occluders are redrawn over them. |
| People too small, birds too big | Hand-chosen scales | Movers are scaled from depth and a real size class (person 1.7 m, dog 0.5, duck 0.35, swan 0.6, cow 1.4). Do not set `s` by hand on movers. |
| Popping in and out mid-frame | Loop paths with both ends inside the frame | Enter and leave at the frame edge or behind cover; the engine turns visible loops into there-and-back paths. |
| Sliding feet, frozen animals, instant turns, teleports | Ad hoc paths | Build every mover with a `sceneBehave` preset (70-scene-lib-behaviours.js): stroll, brisk, jogger, child, elderly, dog-walker, chat, duck, swan, coot, grebe, heron-stalk, cattle-graze... |
| Hand-drawn shadows (the ghost dog shadow) | Authors drew shadow shapes | Never draw shadows; the shadow pass does it, and only for visible movers. |
| Trains floating off the line | Train placed by eye | Trains must sit on a rail surface (lint). |
| Movers slid sideways on angled paths | Only side views were drawn | Movers face their ground heading; objects that walk paths need side/q-front/front/q-back/back views; `scene motion` warns `moverFacing`. |

Run `node tools/anim-pack.mjs scene motion <ref> --out <png>` on every view and fix every red mark.

## C. Engine and rendering bugs already fixed (do not reintroduce)

- Blurry scenes on big or ultrawide screens: the backing store is capped by pixel count, not width.
- A train starting halfway: the scene clock restarts when the scene is shown.
- Unlit night windows: per-window random threshold (`_sccWindowU`).
- Black hole in the water near the camera, and huge jagged bank bands up close: fixed in the canvas and water passes.
- Snowflakes on every winter day, too-strong dawn frost: snow only on seeded snow days or real snow.
- Waterline clip cutting whole boats away: boats without a hull part do not sink.
- Boat reflections repeated (a staircase of hulls): boats drawn in slices, each mirrored separately about its own level anchor row. Multi-piece objects reflect once as a group: the water pass (`_scwaMirrorScene`, 78-scene-water.js) composites the pieces of one thing (a def's `waterGroup(v)`, or overlapping placements of the same built object) and mirrors that composite once, each pixel about its piece's line (a perspective hull gives its footprint with `waterLine(v)`). Never mirror pieces one by one, and never flatten the whole view into one composite (farther things lose the parts nearer ones hide: holes in the water).
- Boat reflections starting below the hull with a gap, doubled and stretched (10 Oct): a floater's mirror is the art above its sink, flipped about the SAME waterline row the canvas clips it at; a perspective boat piece (`waterSlope(v)` on its object) is anchored at its near-side waterline and mirrored about that sloped line (a shear), with no sink.
- v1 ponds mirrored about one level row (y0): the reflection band sat offset from a curving bank, and herons, snags and posts standing in the water had no reflection. The legacy water path now mirrors each column about the region's own top there, and anything whose foot is in the water about its own foot, whatever its layer; reflect flags are ignored.
- Per-scene water colours and mirror / ripple / clarity overrides: ignored by the water pass (`sceneWaterPlanOf` reads the kind only).

### Lint rules for the lock (tools owner: `tools/lib/scene-cmd`, rule ids)

- `waterOverride` (error): in a scene file or a view builder (`71-scene-*.js`, `70-scene-lib-*-views.js`, recipes), a water region (an entry of `water: [...]` or `water.push(...)`) with any key outside `{ id, kind, poly, path, width, edge, d, layer, y0, y1, level, hint, rings, wakes, flow, lock, foam }`; or `hint` not in `calm | breezy`; or a v1 region without `kind`. Also: any placement, scatter or actor with a `reflect` key; any v1 scene with a water region and no `fx.water === 2`.
- `lightOverride` (error): a scene's `grade`, `light`, `exposure`, `ambient`, `shadowCol` or a scene-level `tint` of the whole frame; a placement `tint` whose colour varies with the time of day; any drawn shape with fill `@shade` / `@shadow` / a `shadow` part on water in a scene-local object (`70-scene-lib-*-views.js`).
- `handReflection` (error): in a scene-local library or pass (`70-scene-lib-*.js`, not `78-scene-*`), a `setTransform` / `scale` whose y scale is negative (a flipped draw) inside a function that also reads the water (`sceneWaterRow`, `sceneWaterMirrorY`, `W.water(`): reflections come from the water pass (`sceneWaterMoverReflect` for a pass's own movers).
- `moverNear` (warn; error in `--strict`): a person or animal whose route has an on-screen point (projected X in -80..1680) at depth d with `f * h / d > 0.45 * 900` (h its real height: 1.7 m for a person), unless the actor has `framed: true`. The engine side (behaviour owner, `70-scene-lib-behaviours.js` / `sceneBehave`): clamp a route's on-screen points to the near band `d >= f * h / 405` by ending the route there (the engine then plays it there-and-back).

## D. Process (orchestrators and integrators)

| Mistake | Why | Rule |
|---|---|---|
| An integrator deleted 20 good views | "Replace" was read as "delete" | Never delete a scene unless the user said so; improve in place. |
| Unpushed scene work was wiped when the app updated from GitHub | Work sat on a local branch only | Push scene work (after the privacy scan) soon after approval, or warn before any update. |
| Parallel agents clashed | Shared files edited by several agents | Give each agent an explicit list of files it owns; new objects go in a new per-place library file. |
| Rounds took hours | Heavy test suites and repeated profiling during drawing | While drawing: `build --syntax`, renders, `scene lint`, `scene motion`. Profile once at the end. Full tests only at integration. |
| Slow cold loads | Too many sprites and distinct objects (one proof had 944 sprites) | Budget: cold load under 5 s at `--gpu --throttle=4`, distinct sprites under 600. Prefer one clump sprite over ten tufts. |
| Fast cheap models produced templated, misplaced scenes | Under-powered models for composition | Composition needs a strong model; cheap models only for mechanical fixes. |
| Fixes judged by the agent's own report | Reports were optimistic | The orchestrator looks at the renders itself, side by side with the gold reference, and names weak views honestly. |

## The order for a new place (fastest path)

1. Read this file, the skill (`.claude/skills/animation-pack/SKILL.md`) and the worked examples (Fleet Pond views, canal views, Yateley Common 1-4).
2. Render the gold reference.
3. Write the 4 viewpoints and their real landmarks in the header.
4. Compose from library objects; draw only what is missing, in your own library file.
5. Loop: `build --syntax`, `scene sheet` for three dates, `scene lint`, `scene motion`. Fix the weakest view each loop.
6. Profile once. Report with honest weak spots.

## E. Found in the Manchester/Sheffield pass (10 Oct); the world engine must solve these by design

| Mistake | Why | Rule for the world engine |
|---|---|---|
| Pinned perspective pieces (viaducts, boats end-on) became giant blockers | Blockers came from the picture box, not a real footprint | Every entity has a true ground footprint and height; overhead structures (bridges, viaducts) block nothing beneath them |
| People on a bridge deck "walked in mid-air" | No idea of raised walkable surfaces | Walkable surfaces carry a height (decks, bridges, platforms, stairs); movers stand on them |
| No adults within ~15 m of the camera; empty foregrounds | A fixed on-screen height cap | Near foreground filled by framing and low dressing by design; size limits come from the camera, not a fixed cap |
| Seated people and children drawn at adult height | One size class for all people | Size class per pose and age (seated, child, picnicker) |
| Picnickers on a January lawn | Placed people had no season | Every population has seasons, hours and weather |
| City crowds failed the people/crowd lint | Limits set for rural scenes | Lint profiles per setting (rural, village, city centre) |
| Stacked faces drew in the wrong order (deck over cabin) | Plain centroid depth sort | Parts of one entity draw in tiers, entities by depth |
| Scene data far over budget from long timed paths | Movers stored as long point lists | Store goals and populations, not paths; the engine generates motion |
| Another agent's half-written edit broke everyone's renders | A shared working tree | Builders work in their own files or worktrees; syntax-check before saving shared files |

## F. World engine v3 (10 Oct): what the format makes impossible, and what the first integration found

Section E is the list of problems the world engine had to solve. This section records what the v3 format
(`docs/dev/WORLD_ENGINE.md`) now rules out by construction, and what the first three v3 scenes
(`79-world-zscene-*`, hidden pack `world-test`) showed.

| Mistake class | Now impossible because |
|---|---|
| Floating ducks, boats at the wrong waterline | Floaters have no `y`; it comes from the water level less the descriptor's `sink` (`badAttach` if the surface under `at` is not water) |
| Wrong scale | No `s`, `scale` or `px` key exists (`screenOrLookField`); size comes only from `worldObjectInfo` (`unknownSize` if an object has none) |
| Hand layers, shadows, reflections, tints | Those keys are rejected; depth order, shadows, reflections and light are engine passes |
| Solids overlapping or blocking a path | `overlap` (5 cm) and `blocksPath` at load; the first Kelham draft failed both (a landmark through two mills, a block across the pavement) and never loaded |
| A tree in the water, a fence on a pond | `badAttach` against the surface under `at` (caught twice in the first Fleet Pond draft) |
| Made-up variants and objects | `unknownVariant` / `unknownSize`: variants are library indices, so livery names in a scene fail |
| Unknown life ("cyclist", a perch host key) | `unknownWho` / `unknownKey`: populations come from `WORLD_POPULATIONS`; the key sets are closed |
| Landmarks and skyline entries without a source | `landmarkSrc` |
| A spec that fails | `worldAdd` does not register it; the error list names path, rule and fix |

Found in the first integration (to fix in the engine, not in scenes):

- Spawn edges: the `S` edge falls inside the near band, so populations with `edges: ['S', ...]` (towpath, boardwalk) never
  spawn; spawn cells should be the first row beyond the near band and the real frustum sides, not the grid box.
- A failed `worldPath` (A* cap 2,000) is retried every tick: life ticks of 13-19 ms (budget 1.5 ms) in the canal and
  Kelham scenes. Edge and surface goals must use the cached flow fields; a failed route must back off.
- No library object is a perch host (`worldLifePerches` matches `post|perch|mooring|stake` by name and none exists): a
  kingfisher needs a `structure.post` descriptor with a perch point.
- The 1 m walk grid breaks narrow diagonal paths (a 2.6 m towpath) into pieces; use 0.5 m cells to 60 m as specified.

## F. User review of the first world-engine render (10 Oct, fleet-canal-2 w3)

These must be fixed IN THE ENGINE before any test scene is shown again:
- Boats overlap the towpath. A boat's footprint must lie inside a water region, with its hull edge at the bank; the engine must refuse or snap any floating entity whose footprint touches land.
- The scene is much emptier than the original. The engine must carry over or generate the original's density: hedgerow and bank planting, scatter, people and backdrop. A converted scene must be at least as rich as its source, judged side by side.
- The near boat is a flat side-on slab cropped by the frame edge. Large near entities must be drawn in perspective and framed, never left as flat, cropped slabs.
- The horizon is a thin flat tree line: the backdrop must be on.
- A mover was cut off at the bottom edge (a dark head). Movers must not spawn or idle inside the near clip band.

**The principle (the user): the world engine itself must KNOW what is weird, whatever the scene says.** Build a world-sense layer into the engine, not into scenes or lint:
- Every object class carries its own rules: where it can exist (boats on water, cars on roads, trains on rails, people on walkable ground, trees on soil), clearance, typical neighbours and scale.
- The engine enforces these at load: it snaps, re-routes or drops anything impossible and logs it, so a bad scene still renders sensibly.
- It fills what the author leaves empty: bank and hedge planting, scatter, people and the backdrop are generated from the surfaces and the place style unless the author says otherwise.
- It frames sensibly: no cropped flat slabs and no half movers at the edges.
- An author error can make a scene plainer, never wrong.
- Foliage hanging from nothing (willow fronds, boughs, branches with no tree). World sense: every attached thing declares its PARENT (a bough needs a trunk, either in frame or clearly just outside it on the same side; fronds need a willow; lamps need a post; lead lines need a dog and a walker). The engine drops or re-attaches orphans at load and logs them.

## G. Render glitches (14 Oct)

The user on the first v3 test scenes: "SO SO buggy ... it's an engine problem". Every row was fixed at its cause in the engine (no
scene was edited) and has a check that failed on the engine as it was: `node --test tests/world-glitch.test.mjs` (one section per
class) and the pixel checks on real renders, `node tools/world.mjs glitch <ref | png ...>` (tools/lib/world/glitch.mjs: flat bright
discs, a sawtooth in the water's reflection, an unreadable night). Run `world glitch` on the season x time x weather matrix of any
scene the engine change touches; all 180 cells of the three test scenes pass.

| Mistake | Why it happened | Rule |
|---|---|---|
| Lamp pools drawn as huge, flat, opaque cream ellipses on the quay | A pool was a filled ellipse of the lamp's whole reach at a fixed alpha, one per lamp head, painted over everything at the end of the frame | Every light is a soft additive falloff within `WORLD_LIGHT_CAPS` (pool: peak alpha 0.3, at most 480 scene units wide, a physical falloff from the head's height; halo: at most 26 units, peak 0.5). One pool per lamp, on the ground under what stands there, never on the water (`worldLightDraws`, G1) |
| Glowing white blobs over walkers and boaters at dawn and night | Every library glow part was a light source with a halo of a fixed reach, including a figure's reflective strips, phone screen and watch LED | A glow part is a source (lamp, head, tail, sign ...) or a lit surface (window, screen). Things that carry glow parts (people, animals) never emit, except a cyclist's opaque lamps; a halo is the glowing part's own size (G1) |
| Lit windows painted over the trees in front of the building (found while fixing the pools) | The lights were one layer drawn after every chunk | Lit glass is drawn over each member's own sprite inside its chunk, so depth order holds; the chunk is keyed by its lit set and drawn again on a relight when windows come on |
| Winter trees as bare trunk slabs, birches as white poles, far tree lines gone | Materials came from the part name: the whole `crown` (and `body`) part was leaf and was dropped when bare, though the library's winter form draws its limbs and twig haze in that part | A plant with seasonal art is drawn in the FORM of its own leaf state (`worldMaterialForm`); nothing is dropped from a bare form; the palette's wood colours are bark wherever they are drawn (G2) |
| A tree bare in late November drawn as its summer art with the crown cut away; budding never shown | The shapes followed the calendar season while the leaves followed the tree's own state | The form follows the leaf state: bare and early bud -> winter form (the twig haze greens as buds break), bud -> spring, turn -> autumn until most leaves are down, full -> summer (G2) |
| White frost on every winter twig on a mild afternoon (pale lavender limbs at the lens) | The library paints hoar frost with its palette's `frost` colour; the engine drew it as art | Painted frost is the material `rime`: shown on frosty and snowy days only (G6) |
| Bracken and dock bright orange in January | The autumn turning pick stayed all winter | What stands dead in December to February weathers to a dull russet (G6) |
| Night as one murky blue-grey soup | The v2 night grade compresses everything into 0.07 to 0.15; the mirror was tinted with the water's DAYLIGHT body colour (a grey veil over every reflection); sun motes stayed ungraded and glowed | The night key (`worldSkyOf(...).nightKey`, a floor of sky light plus the moon): foliage and trunks sink to silhouettes, pale materials catch the key by their own lightness, the paths read as pale ribbons, the mirror is tinted by the water's night colour, motes are graded after dark, the moon's glitter road is drawn. Readability on renders: darks to lights spread >= 0.105 below the horizon (G3) |
| Moored narrowboats dark at night | A static boat was treated as a vehicle (lit only while moving); hulls in perspective never got lit windows | A moored boat is a home: its windows light by the seeded per-window rule; a hull in perspective by one seeded draw per boat (G6) |
| Vertical sawtooth zigzag in reflections near the camera | The ripple grew to about 8 px near the camera (wind x 12) on a 27 px period and was blitted in 3-row bands, so each band jumped several pixels | The ripple's shear is capped (at most 0.45 px a row), its amplitude never exceeds the middle distance's cap and shrinks near the camera, bands are 2 rows (G4) |
| A boardwalk's rails and piles floating across the water as a T with no deck | A walkway with only a side elevation was drawn square to the eye even when it ran away from it (the view fell back to `side`), and an entity's deck was never drawn (only deck surfaces were) | An elevation-only walkway within about 20 degrees of end-on is drawn in perspective: handrails along its real long edges and its deck planks (unless a deck surface already lies there) (G5) |
| Reflections of a platform or a boat sprite hanging far below it | The near edge of a long footprint was used as the waterline for anything in the water, but a sprite is drawn about its anchor | A sprite mirrors about its own waterline at its anchor; only pieces drawn in perspective mirror about their footprint (G5) |

## I. Movement, and the checker that looked clean while the page did not (14 Oct)

The user: "people walking into each other ... all the animations are SO SO buggy". The unit tests and the Node invariant run were all
green, and the page was not. Every row below is fixed in the engine (life, host, anim, tools; no scene was edited) and has a check:
`node --test tests/world-crowd.test.mjs` (hand-made towpaths and boardwalks), `tests/world-invariants.test.mjs` (the rules), and
`node tools/world.mjs invariants <ref> --browser` (the checker on the frame record of what Chrome DREW, over the whole loop).

| Mistake | Why it happened | Rule |
|---|---|---|
| Walkers, dogs and ducks walked through each other (0 m apart on a 1.6 m boardwalk for thousands of frames) | Avoidance was soft steering only (a velocity obstacle and a push); nothing stopped two movers sharing a spot, and no invariant looked at mover against mover | A hard floor under the steering: after every move pass two movers on one layer are pushed apart (`_wlfSeparate`, standing ones give way less, one against a wall gives its share to the other). The checker's `personalSpace` rule (overlap and walk-through between frames) fails on it |
| Two walkers meeting head on stopped dead face to face for ever | Once queueing was added the oncoming one was queued behind too; the sidestep and the keep-left bias only worked while moving forward | Oncoming movers are passed, not waited for: keep to the LEFT (UK), a sideways shuffle at up to 0.9 m/s that needs no forward speed, a queue only behind a mover going the same way |
| A jam fed itself: a blocked walker stood still and became the next blockage, for minutes | The stuck handler made it idle for 2 to 6 s in the lane | Never stop in the lane to wait: a new plan at once, then the later arrival of a knot turns back, then a squeeze (a lane a body wide: they turn sideways and pass through each other for a step), and a watchdog retires a mover with somewhere to go that makes no headway for 10 s (`stuckRetired` in the life problems) |
| Statues: a heron that stood for the whole loop, a boater in a far field, a walker facing the wrong way for ever | A wanderer chose targets on another bank (no route: fail, back off, idle); a resident was placed at a random cell of its layer, not near its first goal; a leaving walker kept the point of interest it had been looking at and turned back to it every tick | Wander targets are only places in the mover's own connected component; a resident starts beside the entity its first goal names; leaving forgets the point of interest and a mover that wants to go never turns back to look; an unreachable `go` is given up on the second failure |
| The checker said "stuck" never happened | A stuck mover is DRAWN idle (it is not moving), and idle states were excused | `stuck` is about intent, not pose: life says `intent: 'travel'` and such a mover has 20 s whatever pose it shows; one without somewhere to go is a statue after 90 s (herons and residents more) |
| A dog was dragged 0.6 m in one tick (a teleport at 6 to 9 m/s), or put exactly on its walker | The leash fell back to snapping the dog to 0.7 or 0.4 of the lead's length, then to the walker's own spot, when the pull point was blocked | The lead pulls at most 6 m/s through the navigation's own step (it slides round a post), the walker waits while the lead is taut, and nothing is ever snapped onto its walker |
| Feet stepped in place or slid; a dog trotted while standing | The record's clip came from the BRAIN state ('sniff') instead of the presented one; the speed spiked for one tick (a sidestep, a leash); a frame on a tick boundary showed last tick's state beside this tick's animation | The record carries the presented clip; the shown velocity is the real one low-passed over 0.2 s (steering keeps the real one); positions interpolate but every other field is the latest tick's; `slidingFeet` judges the feet's ground speed against the range the mover covered in the last 0.8 s |
| `capture --full` showed the same frame 60 times | The capture page was a still page: the renderer shows the base moment in every frame; the "advance" call it used did not exist | A capture opens a LIVE page and pins the scene clock for every frame (`page.frameAt(t)`); `page.rewind()` starts the loop again from its seed |
| People popped in and out in the real page when the machine was slow | The governor thinned 30 % of the movers by their place in the list, which shifts whenever anyone arrives or leaves | Thinning is by a hash of the id and only for the far ones (under 40 m); captures and the real-frame checker run with the governor off |
| The scene clock jumped back to the base mid-capture | A stray frame of the host (a relight, a media-query change) redrew at host time 0 while the clock was pinned, and the pinned clock followed it | A pinned clock moves only for frames at the pinned time (`clock.pin(t)`); the real-frame checker stops with "the clock drifted" instead of reporting every mover as popping |
| The Node invariant run fell back to the checker's own frame record on a slow machine and reported habitat violations that were not there | `worldFrameAt` over 60 ms twice switched to `worldInvariantFrame` for the rest of the process | The tools always ask for the real record (`frameAt: 'render'`); a run that cannot is an error, never a different checker |
| The Node simulation and the page ran different sims (different ids, different people) | The page builds its world with its own options and date | Check the page. `invariants --browser` and `accept --browser` (item 16.2b) draw every frame of the loop in Chrome and check what was drawn |
