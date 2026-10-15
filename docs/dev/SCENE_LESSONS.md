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

## G. User review of the first world-engine render (10 Oct, fleet-canal-2 w3)

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

## H. Render glitches (14 Oct)

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
| Winter trees as bare trunk slabs, birches as white poles, far tree lines gone | Materials came from the part name: the whole `crown` (and `body`) part was leaf and was dropped when bare, though the library's winter form draws its limbs and twig haze in that part | A plant with seasonal art is drawn in the FORM of its own leaf state (`worldMaterialForm`); nothing is dropped from a bare form; the palette's wood colours are bark wherever they are drawn (G2) Merge of 15 Oct: ONE mechanism, section P's (the leaf state picks the library's seasonal art, `worldMaterialArtSeason`; a brown or grey stroke in a crown is bark) |
| A tree bare in late November drawn as its summer art with the crown cut away; budding never shown | The shapes followed the calendar season while the leaves followed the tree's own state | The form follows the leaf state: bare and early bud -> winter form (the twig haze greens as buds break), bud -> spring, turn -> autumn until most leaves are down, full -> summer (G2) Merge of 15 Oct: section P's mapping (bud -> spring art from the first bud; turn -> autumn art from 15 % turned) |
| White frost on every winter twig on a mild afternoon (pale lavender limbs at the lens) | The library paints hoar frost with its palette's `frost` colour; the engine drew it as art | Painted frost is the material `rime`: shown on frosty and snowy days only (G6) Merge of 15 Oct: `worldMaterialRime` fades painted rime and snow by the day's frost and snow (section P) |
| Bracken and dock bright orange in January | The autumn turning pick stayed all winter | What stands dead in December to February weathers to a dull russet (G6) Merge of 15 Oct: herbs go dormant about seven weeks after they turn and draw the library's winter art (section P): no orange in January or in April |
| Night as one murky blue-grey soup | The v2 night grade compresses everything into 0.07 to 0.15; the mirror was tinted with the water's DAYLIGHT body colour (a grey veil over every reflection); sun motes stayed ungraded and glowed | The night key (`worldSkyOf(...).nightKey`, a floor of sky light plus the moon): foliage and trunks sink to silhouettes, pale materials catch the key by their own lightness, the paths read as pale ribbons, the mirror is tinted by the water's night colour, motes are graded after dark, the moon's glitter road is drawn. Readability on renders: darks to lights spread >= 0.105 below the horizon (G3) |
| Moored narrowboats dark at night | A static boat was treated as a vehicle (lit only while moving); hulls in perspective never got lit windows | A moored boat is a home: its windows light by the seeded per-window rule; a hull in perspective by one seeded draw per boat (G6) |
| Vertical sawtooth zigzag in reflections near the camera | The ripple grew to about 8 px near the camera (wind x 12) on a 27 px period and was blitted in 3-row bands, so each band jumped several pixels | The ripple's shear is capped (at most 0.45 px a row), its amplitude never exceeds the middle distance's cap and shrinks near the camera, bands are 2 rows (G4) |
| A boardwalk's rails and piles floating across the water as a T with no deck | A walkway with only a side elevation was drawn square to the eye even when it ran away from it (the view fell back to `side`), and an entity's deck was never drawn (only deck surfaces were) | An elevation-only walkway within about 20 degrees of end-on is drawn in perspective: handrails along its real long edges and its deck planks (unless a deck surface already lies there) (G5) |
| Reflections of a platform or a boat sprite hanging far below it | The near edge of a long footprint was used as the waterline for anything in the water, but a sprite is drawn about its anchor | A sprite mirrors about its own waterline at its anchor; only pieces drawn in perspective mirror about their footprint (G5) |

## I. Detail and composition defaults (14 Oct)

The user: "the scenes are missing so many details ... we iterate on them way too much, so it's an engine problem". Every row is
fixed in the engine's defaults (kits, fill, ground detail, critic; no scene was edited) and has a check that failed on the engine
as it was: `node --test tests/world-kits.test.mjs tests/world-critic.test.mjs tests/world-ground.test.mjs
tests/world-kit-fixtures.test.mjs`, and `node tools/world.mjs critic <ref | spec.json>` (exit 1 on any FAIL).

| Mistake | Why it happened | Rule |
|---|---|---|
| The fill named objects that do not exist (`plant.rph-hazel-coppice`) and quietly used weaker stand-ins | The fill styles were hand lists with no check against the library | The fill styles ARE the style kits; `worldKitCheck` fails loudly on a missing, weak, dome, foreign or wrong-class entry; a missing object is skipped and logged, never replaced |
| Blob and lollipop trees, placeholder logs and planks in new places | The fill drew from everything the library holds | Kits list curated objects per band; `WORLD_KIT_WEAK` never appears; dome trees only beyond 120 m (`WORLD_KIT_DISTANT_ONLY`) |
| Sunken rivers with flat dark slab walls; flat towpaths, paving and lawns | The ground was drawn as flat colour and the old critic counted lived surfaces as dressed | Every visible surface is textured by its look; a channel gets stone, brick or earth walls with coping; the strict critic fails `bareChannel`, `flatSurface`, `bareQuay` |
| The critic passed empty foregrounds, bare lawns and scenes with no framing | It judged entity boxes (an oak's box is 93 % of its picture) | The strict measure uses art silhouettes and fails `emptyForeground`, `bareGround`, `bareRegion`, `fewLayers`, `noFraming`, `noBough`, `lowVariety`, `noLife`, each naming the fix |
| No framing foreground, or a bough with no tree, or a domed crown cut by the frame top | Framing was a token clump in the near band | A natural kit frames with a hanging bough whose trunk stands just outside the frame on the same side, plus reeds, a shrub, a hedge, a railing or a lamp at the sides; buildings, lines and walls count as side frames |
| An overfilled canal (a jungle) once the fill was driven by the strict measure | Nothing kept the view open | The vista where the leading lines meet the horizon stays at most 35 % covered; the sky keeps the kit's share (where the author left less, the fill closes at most a third of it) |
| Flower carpets, heaps of picnic rugs and giant seated figures at the lens | Open lawns were sampled like rough grass; seated scenery took the standing mover height (1.7 m) | An open look (mown, ripple) is half dressed by its texture and gets sparse single things; seated figures keep their seated height, at most 8, apart, never filling more than a fifth of the frame |
| Benches stacked on screen, two bandstands in one view | Furniture was spaced in metres only | Like furniture never overlaps another's picture at a like depth; a feature (`structure.*`) stands once |
| A 90 m blank wall for a long terrace footprint | The extruder drew one footprint as one house | A long terrace footprint is split into houses with their own seeds and fronts facing the street |
| A green with willows, a beach of stones, a civic square chosen for a grass field with a 4 m plaza | The chooser looked at which kinds exist, not at what the view shows | Kits per setting (no willows on a dry green); the chooser weighs the surfaces the camera's cone shows |
| Reeds at a quay's foot, a framing trunk and a birch overlapping, walkers through a house | Placement checked a floater's anchor only; the fill's index skipped ground-standing 'air' art; people were added to paving that carries a building | A floater's whole footprint is in the water; anything on the ground is indexed; the kit's people never go on paving with a building on it |

## J. Movement, and the checker that looked clean while the page did not (14 Oct)

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
| Two walkers met head on in a gap between a bollard and a bench and stood nose to nose for 4 to 5 s, then were put through each other (a squeeze); the browser run's `crowd` and `personalSpace` fired at the same spot all loop long (Whitby, 15 Oct) | "Oncoming" was judged by the other's VELOCITY, and a mover held up by the hard floor has none: each saw a standing obstacle, queued behind it, and the pair only broke by squeezing | Oncoming is judged by where the other WANTS to go (its planned direction). At a gap two cannot pass in (`_wlfOneBodyAt`) the one nearer to it goes first and the other waits a metre short of its mouth, at most 6 s (`_wlfPinchYield`); two strangers in such a gap keep their shoulder width, not 1.2 x the radii |
| The same quay had a bollard 2 m from the authored bench, a second bench 1.1 m behind it and a lifebuoy half a metre off the lowest row people may stand on: the only ways along it were one person wide | The fill placed street furniture one piece at a time and never looked at what the pieces left between them | After the tiers the fill measures every walked surface (`worldFillLane`): a way for the centres of two people abreast (1.0 m) in the space the nav leaves a mover (0.6 m off a solid, 0.5 m off a bank) must exist across the width the frame shows; the last-placed fill piece that closes it is taken away, never an authored one. A slot one body wide costs 3 x in the nav, so routes go round by open ground |
| A dog stood pressed against a lifebuoy at the frame edge for 10 s, "walking" with a route that ran through it | Routes were planned for 0.25 m (the layer's radius; flow fields are shared by every body up to 0.05 m over it) but the dog was stepped and tested at its own 0.30 m: a cell with 0.25 to 0.30 m of clear space was on the route and not steppable | A mover is stepped and tested at the radius it is planned for (`_wlfNavR`); a dog or a group member whose straight line to its spot is blocked is routed round the solid; a member catches its slot up at a stride (at most 1.5 x the leader and a step), not a sprint |
| `popping` fired for a family member walking in at the frame side (Whitby, Liverpool) | The real-frame run samples at 2 Hz: a mover walking in at 1.5 m/s comes in 100 px between two samples, and the draw keeps boxes only up to 50 px past the side. The mover was at the edge a moment before, but 100 px inside the frame at the sample | "At the edge" is as wide as the draw's margin plus what the mover walks between two samples (its speed x the gap x f / z); a pop is a mover that appears or vanishes farther in than that |
| A flock's leader grazed half out of the frame side for its whole pause (Pier Head pigeons: `edgeCut`) | The C2 rule changed the state only when the state's timer ran out | A wanderer idling in an edge zone ends its pause at once |
| People carried umbrellas OPEN under a blue sky in York by day | A wardrobe said "umbrella up" for a whole season (autumn, winter): the weather never reached the library's art | The frame draws a person in the weather of the day: the form is `autumn~wet` or `autumn~dry` (`sceneObjShapes` reads it for people only). Up only in rain, showers, drizzle or thunder (the v2 light's own reading); furled when dry; a furled one opens in the rain. A build that is not told keeps its season (the v2 scenes) |

## K. Terrain, and a place nobody drew (14 Oct, the first no-example place: Whitby harbour under a 36 m cliff)

| Mistake | Why it happened | Rule |
|---|---|---|
| Houses on a cliff hung in the sky above a flat green plain | The v2 ground follows a relief only along the EDGES of a surface polygon; a hill inside a polygon (the face between its near and far edge) was never drawn, so what stood on it floated | Terrain is drawn by the world: the relief is cut into depth strips (3 % steps) of shaded quads (grass on a slope, bare rock on a steep face) that go through the normal chunk order (`79-world-4terrain.js`). Flat ground draws nothing; water is never painted over |
| A church and a lighthouse behind the rim of the hill were drawn in the sky | The ground truly hid them (the cliff's back slope falls away), but nothing checked what the terrain hides | Placement step 3c drops an entity wholly behind a nearer rise of the ground, with a logged `terrain` reason; a floater on water is exempt (the relief does not apply under water). The author fixes the spec: put the church ON the crest, end the cliff where the sea opens |
| Bollards and lamp posts at 4 to 5 m from the lens were black blobs filling a corner | The near band was sized by the object's REAL height (a 5 m lamp is thin: it is the 1.3 m of its base that makes a blob) | A prop (post, bench, lamp, street furniture, gate, rock, vehicle) keeps to where a 1.3 m thing is about 20 % of the frame (`cam.f * min(h, 1.3) / 180`), people and animals to 45 % |
| The "three test scenes" tests broke when a fourth place was added | They read every `79-world-zscene-*.js` file | A new place must pass the same checks: its style must exist (a kit), its entities must place without a drop, its landmarks must stand on land. Fix the spec or the engine, never the test |
| People walked on the water at a quay | The water below the ground (a quay 3 m above a harbour) was projected at its own level, so its near edge fell lower on the screen than the quay's own far edge and the water was drawn over the paving in front of it | A lowered water is seen only through an opening: the sight line to a point of it crosses the ground level nearer by k = (eye - level) / eye and the point is seen only when it crosses inside a water polygon. `worldWaterPlan` cuts every region by the openings scaled by k (convex pieces, one outline), never by list order |
| A terrace on a cliff stood at the cliff's foot, and a long row of cottages was a 60 m pyramid | The generator measures every building from a flat ground (the world's relief was ignored), and a long footprint with no street in reach, or whose nearest "street" was the sea beside it, was fronted on its gable end | A building is projected from an eye lowered by the ground height at its lowest corner; a terrace is always fronted on its long side facing the camera; a street of terraces is never one height (a house in seven a storey lower or higher) |
| A quay crowd of giants hid the harbour (22 people, the nearest 350 px tall, on a 9 m quay) | People were limited one by one (never a giant), not together; a crowd's screen area was not budgeted | The people on foot together cover at most 7 % of the frame (`_wlfCrowdFull`: a group's members count too); arrivals wait, nobody is removed |
| A sitter who stood up from a quay bench stepped into the harbour and stood there as a statue | The stand-up spot was fixed in front of the bench, which faces the view, which on a quay is the water | A seat's stand-up spot is a legal walking cell (front, behind, beside, outward to 2.2 m); sit and stand steps last as long as their distance needs |
| Short posts cut by the bottom edge were dark blobs at both corners; a sandwich board stood at the lens | The quayside kit offered a bollard as its framing and the fill's props had no near band | The kit's framing is never a short post; the fill keeps every prop out of the near band (also `signage`); the placement solver already did |
| The invariant checker called a church on a cliff floating and every terrace through the ground | The frame record's camera has no relief, so the ground was 0 everywhere | The checker takes the ground from the world's camera, a drawn piece stands on the ground at its lowest corner, the terrain's own strips are not judged |
| The strict critic failed a raised camera for an empty 0 to 6 m layer | The layer test assumed the ground starts at the lens | A layer wholly nearer than the ground at the frame's bottom edge is credited, not missing |
| A frame took 140 ms at 4x CPU throttle, 1.75 s of it vector redraws of walls and buildings | An occluder redraw (a static nearer than a mover) re-ran the vector drawing of a drawn piece for every mover every frame | A static prim is rasterised once per bake (`_wfrPrimCache`, at most 48 bitmaps of 2.5 M px) and every redraw blits it. Profile with a CPU profile of the page (`flush` is the software GPU in a Chrome without one, not the engine) |
| Mounting a scene again took 2 to 4 s at 4x throttle | The whole world (validate, build, fill, nav) was built again for the same spec | `worldHostWorld` keeps the three last built worlds by spec text and season and hands out a structured clone |

## L. A medieval street from a short spec (14 Oct, the second no-example place: the Shambles, York)

`node --test tests/world-frontage.test.mjs` (one test per row) and `node tools/world.mjs invariants york-shambles-1-w3 --browser`. No scene was edited to fix a row.

| Mistake | Why it happened | Rule |
|---|---|---|
| A lane between two rows of houses read as 66 % bare ground, and the fill planted 261 trees and tufts behind the houses to make up for it | The coverage, richness and fill measures counted entity boxes only; extruded buildings are not entities | `worldPrimEntities` (4backdrop) hands every measure the extruded buildings and walls as cover (their screen boxes, memoised); a street of generated houses is eight kinds of thing at most (one per seed class), not one |
| The strict critic failed a closed street on `fewLayers` | A street shows no backdrop and no 120 m layer; its sky is a slot of 1 to 2 % of the frame and the rule wanted 4 % | A street walled by buildings at both sides counts a slot of 1.5 % sky as its farthest layer |
| `edgeCut` flagged every house of the lane (3,000 frames: a building filling 35 % of the frame, cut at the side, top and bottom) | The invariant allowed a building cut at the top only | An extruded building is the place and is never moved (C1): a street frontage runs out of the frame at its sides, top and bottom corner |
| A person walked 11 cm into a house that stood 30 cm proud of the lane's edge | The navigation took its solids from entities only; extruded buildings were never solid to it (they had always stood beside the surfaces) | `worldNavBuild` cuts every building footprint out of the ground, swim and drive grids |
| A shop's A-board stood 5.8 m from the lens, a third of the frame high; a parasol or cafe table could too | The near band named the prop classes it knew (post, bench, lamp, street furniture ...) and not signage, umbrella or cafe-table; and the fill's furniture bypassed the band | `signage`, `umbrella` and `cafe-table` are props with the near band; `worldPlaceOk` applies it to them for every placement (the kits' own low dressing keeps its tier) |
| Pigeons in a packed lane lifted at every pass and played 'fly' on the spot (`animStill`, 52 frames a minute) | Their lift reaction retriggers from every walker within 1.4 m and a lane leaves them nowhere to land | The `old-town-lane` kit has no pigeons. Not fixed in the engine: a pigeon that cannot land should stay down (open) |
| Bins, a bench, a bollard and a Victorian lamp post stood in the middle of a 3.8 m lane | The `terraced-street` kit dresses a street 7 m wide with a pavement each side | A lane has its own kit (`old-town-lane`): tubs and A-boards at the walls, nothing in the lane; the fittings belong to the buildings |
| Setts drawn as a tile grid with spaghetti cracks | One look drew continuous long joints and random cracks | The `lane` look: a running bond (the cuts along the lane are one course long, offset per course), no cracks, a worn central drain |
| A medieval street of identical boxes with flat walls | The generator had no building style with overhangs: one footprint, one wall plane, full height | `timber-framed`: a stack of storeys on their own planes (jetties, soffits, bressummer, brackets), frames laid out around the openings, plaster limewash patches; heights, overhangs, roofs and fittings vary per seed |
| Studs turned a wall seen along the street into a dark smear | A stud every 0.3 m is under a pixel apart at a grazing angle | The stud pitch is drawn only where it is at least 2.6 px on screen; below that the zone is one toned panel |
| Stall boards, awnings and signs as huge slabs in the foreground corners | Fittings were laid out in metres on the wall with no idea of the camera | A fitting keeps beyond its own near depth (stall and awning 9 m, basket 8 m, sign and lantern 6 m) in a perspective view; the elevation keeps them all |
| A raised camera made the lane a thin strip of paving | The horizon row stayed where a street view of open ground wants it | A lane camera looks up a little (the horizon below the middle row): the jetties and the sky slot show, the paving keeps the near third |
| Family and chat groups overlapped (0.00 to 0.1 m apart) in the first second and now and then later; the browser checker's `personalSpace` fired in 12 of 15 cells | A group member whose formation slot was blocked (a wall, a step of a house) was put exactly on its leader's spot | The slot is tried mirrored, then behind and beside the leader, nearer each time; a member with no free spot is not made (`_wlfGroupSpawn`); separation runs up to six passes |

## M. A grand civic building and a wide river from a short spec (14 Oct, the third no-example place: the Pier Head, Liverpool)

The place: a broad brown tidal river, a ferry landing stage, and three huge Edwardian offices in Portland stone (twin clock towers with copper
cupolas and bird finials, a corner tower with a dome, a great dome). The spec is short (`79-world-zscene-liverpool-pier-head-1.js`: five
surfaces, three buildings with a `crown`, a ferry, life) and the engine draws everything else. Every row is fixed in the engine and has a
check: `node --test tests/scene-gen-civic.test.mjs tests/world-waterfront.test.mjs`.

| Mistake | Why it happened | Rule |
|---|---|---|
| A civic building was impossible: only a hand-drawn landmark or a flat box with a gable could stand for a town hall, a domed bank or a clock tower | The generator made row houses (gable, hip, mansard, flat roofs; bays, porches, chimneys) and had no tower, dome, clock, giant order, balustrade or finial | A building's `crown` names a preset of its style's `crowns`: a list of STACKS built stage by stage (shaft with clock, cornice, louvred belfry, window drum or colonnaded cupola, dome, lantern, spire, pyramid, finial). `70-scene-gen-1civic.js`; the `baroque-civic` style (data plus presets); any style may define crowns. Care: finials are a bird, urn, ball or spike, never a flag, a religious symbol, a name or a number |
| A dome read as a faceted blob, and cost one shape per facet (190 for one dome) | A surface of revolution was drawn as quads, each with its own tone | One base shape for every visible quad in the mid tone (no seams), one merged shape per light level (six rings at most), the ribs and the drum's openings as merged paths: a dome is 5 to 12 shapes. A tower or dome is the same model in both views (projected and elevation) |
| A tower stood in front of the parapet that hides its foot | Stacks set back from the front wall were drawn after the walls | A stack inside the footprint of a convex block is behind every visible wall of it: drawn BEFORE the walls (far to near among stacks); one that overhangs is drawn after |
| Stone read flat at golden hour and in the morning: every wall one tone whatever the sun did | The generator's shade is a fixed studio light; the world lit a whole building by one material grade | Each shape of a generated face carries the face's outward normal; the world lights it by the REAL sun (`worldSunLight`, `worldSunTone`, `79-world-4suntone.js`): lighter and warmer toward the sun, darker and cooler away from it, by how directional the light is (none at night or under thick cloud). The bake key carries a COARSE sun bucket (45 degrees by 15) and only on chunks that hold a building, so a change of time inside a band still reuses every other bitmap (V5) |
| A 12-storey facade was 380 shapes before any detail | Each window pane had its own sky-reflection colour, so no two panes merged | A style may quantise the reflection (`win.reflQ`); the tier of every element follows the size of its storey on screen (`hm`); a facade stays under the shape budget at every distance (checked at 45 to 600 m) |
| A mile of river was one flat grey plane with a reflection | Water had a gradient, the sky's mirror and the reflections; nothing on the surface | Open, choppy water (`chop` in its look: the sea 0.7, an estuary 1) carries wavelets in its base bake: pale streaks and dark troughs, long across the view and short in depth, their size fixed in METRES (they converge like the paving) and faded where a streak is under a pixel (`79-world-4chop.js`). Glassy water (canal, pond, lake, river) has none |
| The Mersey rendered as a blue lake | There was no estuary: `estuary` aliased to `river`, and the v2 light mixes 40 to 55 % of the sky into every water base | `estuary` is a kind of its own: a silt-brown opaque water with a poor mirror and a tide's flow (`WORLD_WATER_LOOK`, `SCENE_WATER_KINDS`, the host map, the kits' quay rules). A kind must be in EVERY table indexed by kind: `world-waterfront` K1 fails on one that is missing. A brown must be saturated in the table: the sky mix greys it |
| A ferry seen along its length ended in a flat dark slab | A hull in perspective draws its end from the object's bow or stern view; most boats have none | A hull with no end art gets a STEPPED silhouette from its side art (hull across the beam, house, deck, mast, each in the colour of the largest shape at that height, rows of windows when the art has lit glass). `boat.river-ferry` (a generic double-ended passenger ferry for any port) has real end views (`70-scene-lib-boats-river-ferry.js`) |
| The far shore of a mile-wide river left the horizon open sky (the coverage check) | The backdrop bands were town-low (terraces at 200 m, trees at 600) | The `estuary` backdrop: a low line of terraces, mills, a church, warehouses and trees at 1.1 km, a hazy skyline band at 2.4 km. Bands never start nearer than the scene's far edge, so a scene that wants a near far shore keeps its water polygon short |
| A great plaza failed the strict critic (bare paving 18 %, bare ground 38 %) | The `quayside` kit's limits are a small harbour's | The `waterfront-city` kit: the civic square's dressing and limits (bare paving 22 %) with the quay's posts, railings, lamps, gulls and the `estuary` backdrop. Its fixture is `tests/fixtures/world/kits/waterfront-city.json` |
| Pigeons were drawn flying while still, 55 frames a minute | A hop, a flight or a step aboard moved a mover but never updated the SHOWN velocity (the animation and the checkers read it), so it stayed the 0 of the moment before | Every path that moves a mover (hop, air move, step aboard) keeps the shown velocity; a lift sets it at once |
| Paving cracks drawn as long black wires crossing the foreground | Cracks were random 3 to 5 segment walks anywhere within 25 m, one to two pixels wide at 40 % | Cracks are short (2 to 4 segments), faint, at most 0.9 px, and never nearer than 8 m |
| The facades met the camera at a grazing angle and the three buildings merged into one | The camera looked along the waterfront: the river facades are almost edge-on and a row of three overlaps into one mass | Choose the view for the facades: the trio fans out when the camera is within about 60 degrees of their normals; the towers of one block stay apart when the line of sight crosses the facade at 35 degrees or more. The scene file keeps its positions in a waterfront frame and turns them into the camera frame with `at()`, so the camera is re-aimed by changing three numbers |

Open item (the kit and strict-measure owners decide): the strict measure demands things standing in the bottom third of the frame (about the
first 6 m), while the near band (TR3) keeps a 1.3 m prop beyond about 13 m; the kits' near furniture (a bench, a bollard, a planter) therefore
stands at 3 to 6 m and fills a corner. A tighter fill rule fails the kit fixtures (`civic-square`, `coast`, `terraced-street`: `emptyForeground`).

## N. A cliff nobody drew (14 Oct, the second no-example place: Malham Cove, a 70 m limestone amphitheatre)

The terrain of K drew a hill with houses. A 70 m face of rock is another thing, and the place showed a dozen more engine gaps. Every row was
fixed at its cause (cliff: `79-world-4cliff.js`; strips and drawing: `79-world-4terrain.js`; dry-stone walls: `79-world-4drystone.js`; the beck:
`79-world-4beck.js`) and has a test in `tests/world-terrain.test.mjs`; the scene is a short spec, `79-world-zscene-malham-cove-1.js`.

| Mistake | Why it happened | Rule |
|---|---|---|
| A 70 m face was a smooth green ramp | The relief grid is x by log depth: at 200 m one row is 2 to 8 m deep, so a face that is vertical over a metre can only be a ramp, and the strips' 3 % depth steps put its foot and its rim 6 m off | A cliff is a ground feature of its own kind (`kind: 'cliff'`: an `arc` or a `path`, `h`, `scree`, `batter`, `rim`, `high`, `fade`, `rock`), ANALYTIC: `worldCliffHeight` is its shape, the compiler samples it into a finer grid (1 % rows, 1 m columns) for everything else, and the face itself is drawn by `worldCliffPrims` with true geometry (a vertical face is a vertical face on the screen) |
| The rock read as concrete, as stacked terraces, as a stadium | One tone per band, dark ledge lines across the whole cliff, joints the same everywhere, nothing larger than a bed | Beds are seeded (thickness, tone, prominence, dip); a bed's tone is one smooth gradient fill along it (never tiles); ledges are runs of 8 to 90 m on the beds that stand proud, each with a soft shade under it; joints are vertical and jog at the beds, a few run the full height; long dark water streaks, lichen, grass tufts in clumps and small trees on the ledges, turf and thorns on the rim; the face normal wobbles (pillars and recesses) so the real sun lights some columns and shades others. All placed in (metres along, metres up) from one seeded texture, so it is the same in every group and frame and never shimmers |
| A hairline seam or a bright bar at the edge of a depth group | The face is drawn in depth-binned groups (so each orders against what stands in front of it); antialiasing left a half-covered pixel at the shared edge, a per-group translucent overlay stacked there, and a group extended into its FARTHER neighbour painted over that neighbour's marks | A group's beds reach two columns into a NEARER neighbour (drawn after, so it covers them) and never into a farther one; no translucent overlay is drawn per group (the ambient shade is in the beds' own tone) |
| Stripes at the tapering end of a face, sky showing between them | Beds that pinch out to nothing were still grown by half a unit, and the plateau behind a face that tapers to nothing was cut by the zone of a face that is no longer drawn | A face is drawn only where it stands at least a fifth of its height (`WORLD_CLIFF_MIN_M`); a pinched bed is not grown; what is left is ground, drawn by the strips |
| The foot of the cliff was a mosaic of grey and green blocks | Each strip quad took its slope from its own four corners, which straddle the face's jump (a slope of 30), so it was painted as rock; the talus was a few big quads | The strips cut every quad the face crosses at the foot and at the lip (what is between belongs to the face), take the slope at the middle of each piece, use finer quads where the talus is, and the stones and tussocks are placed in plan metres (`worldCliffStones`) so a walker stands among them |
| Ground behind the face was drawn, or ground beside it was not | The plateau behind a face taller than the eye is never seen; the first rule said "behind the nearest face" and dropped a hill that lies beside the horn too | `worldCliffHides` is the exact test: the sight line from the eye crosses the face plan at some point and the point is hidden only while the line is still below the face top there (never from above the rim, never beyond a tapering end) |
| Frames cost three times as much with the cliff | The chunk order redraws every nearer static that overlaps a mover; 84 of 103 redraws a frame were terrain strips (a strip footprint is a whole row, so every mover behind a row had it redrawn) | Terrain records carry an occlusion rule (`worldTerrainOccludes`): a strip can hide a mover only where its upper edge over the mover columns reaches above the mover feet. The order and the order check both ask it; strips cover only the frustum (the frame and its 21:9 crop), terrain prims are made once per world, a long plan is searched in two steps |
| "89 % of the horizon is open sky" with a cliff across it | The coverage measure looked at entity boxes only | A rise of the ground across the horizon row hides the horizon: the measure unprojects the horizon row against the relief |
| `floating`, `edgeCut`, `shadowOnWater` on every terrain scene | The Node checker used a frame camera without the relief (everything on a hill was "above the ground"), counted extruded ground as objects (a hill fills 26 % of the frame and is cut by the edges), and judged a stream by a round-jointed band while the world draws a mitred polygon (a shadow at a bend was "on the water") | The checker takes the world camera for the ground, never judges `line.*` prims (extruded lines, buildings and terrain follow the ground by construction), and judges a path surface by the polygon the world draws |
| A `gaps: [{ at, w }]` on a wall vanished | The validator accepted only `[[s0, s1]]`, the extruder reads both | The validator accepts both forms |
| Wet rock looked dry, snow lay nowhere on the cliff, ledge trees were green in January | The material wet is a few percent of a pale surface; stone has no snow | Rock is darker in rain (a face is the wettest thing in a frame), snow lies along proud ledges and on the stones on snow days only, a ledge tree is in leaf from May to September, in bud in April and bare limbs and twigs the rest of the year |
| Hedgerow bushes, oaks and ferns in an upland field; walls drawn as a flat brown band | The kit was a copy of the chalk downs; the wall had only horizontal courses | An upland place is a `dale` or `moor` kit (open turf, rush, boulders; no hedgerow bushes, no trees in the pools, no ferns by the water); a wall there is DRY-STONE by default (0.6 m thick, 1.3 m high: irregular courses and joints, through-stones, a row of upright cope stones on top) and a narrow river (4.5 m or less) is a beck: shallow and clear over a pale stony bed, riffled, mirroring little |
| A sheep stood and walked inside a dry-stone wall; any fence could be crossed | The nav had never read `lines`: only entities, hedge surfaces and (since York) buildings were solid | Walls, fences, hedges and railings are solid to everything that walks, cut at their gaps (a gate); kerbs and coping are edges (`_wnavLineParts`) |
| The accept run failed on movers "idling half out of the frame" and on two walkers "walking through" each other | A visit goal named a bench 30 m off the side of the frame; the real-frame run samples at 2 Hz, so a straight-line sweep between two frames cannot judge a pass that bends | Goals name things in view (an author rule); `edgeCut` needs 1.5 s of idling at an edge; the sweep half of `personalSpace` runs only on frames 0.3 s apart or less (the Node run's 5 Hz), the floor half at every rate |
| `order` failed one frame in a minute for a bus, a car and a fern | The footprint relation is not transitive (each hides the next), so no drawing order satisfies a cycle: one pair is always the wrong way round | The checker does not flag a pair that lies on a cycle of overlapping drawn things (`_wivOrderCycle`) |
| A shadow "fell on the water" from a person at a quay edge | The shadow plan is on the ground plane; the water is 3 m below it | A water 0.5 m or more below the ground cannot take a ground shadow; the compositor clips it from the visible water |
| A narrow lane held walkers 0.27 m apart | 14 a minute, a third of them families walking abreast, in a lane 3.8 m wide | A lane's population is set for its width (singles and couples, 9 a minute) |
| Every scene measured at 100 to 500 ms a frame, and the pond at 0.6 s on a machine with a real GPU | The perf harness forced a `getImageData` after every blit so the draw time was "honest"; Chrome then rendered that canvas in software (the whole cost showed up as one `save()` a frame) | Frame times are taken as the page runs, with no forced readback: 3 to 4 ms a frame natively, 5 to 50 ms at a 4x CPU throttle. The gates are the cold load and the time to a fully drawn scene (under 5 s at a 4x throttle); frame and warm-load times are reported, not failed. Profile with `Profiler` plus a counter on the canvas calls, never with a flush |
| A mover's material context was rebuilt for every mover every frame | `worldMaterialFor` and its key were called per draw | One context per entity and 2 m of distance per bake (`_wfrMc`), its key kept on it |

## O. Light and water (audit of 15 Oct, world engine v3)

| Mistake | Why | Rule (test: tests/world-lightwater.test.mjs) |
|---|---|---|
| Petals, summer motes (fireflies at night) and autumn leaves fell from an empty sky in every world scene | The world host asked the v2 base for its seasonal screen particles | A world scene has no v2 particles (`particles: 'none'`); its particles come from the world (trees, chimneys) |
| Lamp pools painted as opaque cream discs over grass, shrubs and kerbs, even at dawn | Pools and halos were one layer drawn over the finished frame at a fixed strength | Light on the ground is drawn under every static and mover, as a soft additive falloff scaled by how dark it is (`worldLightNightK`) |
| Window halos read as fireflies in the trees and floated between dark panes | Halos were drawn after everything, from a world-space guess of the pane | A halo is drawn with its owner in depth order, on the drawn sprite's own glow point; the lit pane itself glows |
| A straight glass-slab seam across a pond | Two overlapping water surfaces were two regions: the second painted its base over the first one's mirror | Water surfaces that overlap or touch at one level are one region (one wet mask, base and mirror) |
| Reflections broken into zigzag chevrons; canals rippling like rivers | The v2 ripple table (2 + 10 u px) over a whole channel of tall reflected facades | A quiet shimmer (1 + 5 u px), still water at half again |
| Night reflections paler than the trees they mirror | The day tint of the water was mixed into the night reflection | The reflection takes its tint from the graded (night) water |
| A dark rectangle on the grass with nothing above it | Every planned static cast its footprint prism, drawn or not | Only what draws pixels now casts (`worldShadowPlan` o.drawn) |
| Green ghosts of trees across a boardwalk at golden hour | Thin casters' shadows drew the sprite itself (its own colours) at the shadow's alpha | A shadow is the sprite's silhouette in the shadow colour |

## P. Trees, plants and seasons (audit of 15 Oct, world engine v3)

- ONE source of seasonal state. The library draws plants per season (winter branch skeletons, spring blossom, autumn
  crowns, dead winter herbs); the material layer must never season that art again. Each entity's leaf state (kb
  `worldKbState`, seeded per entity) picks WHICH seasonal art it is drawn in (`worldMaterialArtSeason`); the material season
  step only touches the summer reference art of objects whose art does not change. Seasoning twice beheaded every tree in
  winter (the winter crown, part `crown` = material `leaf`, was dropped as "leaves on a bare tree"), made far trees, hedges
  and brambles vanish, and painted reeds and shrubs orange in January and April. Test: `tests/world-season.test.mjs`.
- Herbs (reeds, bracken, buddleia, meadow) are dormant ('bare', the winter art) from mid November until they bud; never
  'turn' all winter.
- Name flower parts as flowers (`spikes`, `tops`, `heads`, `blossom` ... are material `flower`, never `leaf`).
- A brown or grey stroke inside a crown is bark (the winter skeleton), whatever the part is called.
- Weather is never baked into art in v3: the kit's winter frost and snow strokes (`@frost`, `@snow`) show only as much as
  the day is frosty or snowy (`worldMaterialRime`).
- Thin tree strokes (twigs, fronds) must not be magnified with a near tree: at most 1.6x their art width in device pixels
  (`_wfrLineK`), or a near willow's fronds become flat bars.
- A plant's record box is the union of its seasonal arts (`_wfrArtBox`): each plant is drawn in its own season, and chunk
  bitmaps and culling are cut to the record box.

## Q. Looking, not only rules (15 Oct)
| Mistake | Why | Rule |
|---|---|---|
| A boardwalk crossed open water to a platform mid-lake; every check passed and reviewers called it "better" | Reviews judged by scores, test counts and their own reports, and only checked what a rule anticipated | Every review first DESCRIBES each image in plain words (what is where, on what, connected to what), then asks of each sentence "is this how it is in real life at this place?". Anything implausible fails, rule or no rule. Then turn it into an engine fix and, where possible, a check. |

## R. Fix-all verify, round 1 (15 Oct, world engine v3)
| Mistake | Why | Rule |
|---|---|---|
| The crowd push-apart and the following cap never ran | Two top-level functions shared the name `_wlfNear`; in the concatenated build the later one replaced the earlier | No two top-level functions of one name in src/app (test: `tests/world-life-crowd.test.mjs`) |
| Two strangers walked together as clones | Life chose an outfit per person but nothing drew it, so a crowd of 40 had only 8 looks | A look the simulation tracks must be drawn: the outfit recolours the top (`worldMaterialOutfit`), and life picks the least-worn (variant, outfit) |
| Mills 20 m behind a 2.6 m quay mirrored down the whole near water as huge sheared facades | A bank owner's reflection base was laid on the water's edge, whatever the bank height; the quay's own wall never hid anything | Mirror about the water plane (2 x water row - ground row) on high banks; the image of the bank's wall hides what stands beyond it (`worldWaterContactClip`). Low banks (under 0.4 m) keep the edge rule |
| Quay walls drew as flat dark slabs over a quarter of the frame | The v2 base layer filled a sunk channel with one dark colour | Sunk channels draw coursed stone walls and their mirrored image (`_wfrQuayWalls`) |
| A bollard slid down the camera ray onto the canal edge | The near-band move only knew the line of sight | Things set by a line slide back ALONG it and may not come nearer the water or leave their path; people and animals keep their screen place (A10) |
| A bollard stood in the canal and no check caught it | The `post` class lists `water` in its habitat, and bollards inherited it | A thing that is never in the water says so in its kb entry |
| Margin reeds clustered on seams between two water regions, on decks, or half on the towpath | Core edge clusters measured distance to ANY polygon edge at their anchor | Water edge clusters use sense's probe (real banks only) and keep the whole footprint inside the margin |
| Timing tests failed only when the whole suite ran | Files run side by side; wall time doubled under load | Timing tests take the quietest round or the process CPU time and wait for a quiet moment before failing |
| Checks passed while the picture was wrong | Every check read the simulation or the plan, none the drawn pixels | Run `node tools/world.mjs check <ref>` (drawn vs simulated, crowns, orphan shadows, walkers off planks, night lights); no scene is shown with a violation there |

## S. Merging two lines that fixed the same bugs (15 Oct, main after PR #19 and uk-rebuild)
| Mistake | Why | Rule |
|---|---|---|
| Two winter-tree mechanisms, two crowd systems, two light systems and two capture clocks met in one merge | Both lines fixed the same reported bugs on their own, a day apart | Keep ONE implementation per fix, chosen by renders of both on the same base (season x scene), browser invariants and full-loop captures; the other one's tests are rewritten to check the same behaviour on the kept one, never deleted or loosened. The record of each choice goes in the merge report |
| Herbs and grasses bright orange in mid-April and orange carpets over a January dale | The dead-russet rule only covered December to February and painted every herb (grass included) with the autumn pick | Herbs are dormant from about seven weeks after they turn until they bud, and draw the library's winter art (section P) |
| A walker squeezed through an idle family on the Pier Head's wide plaza | The lane squeeze (turn sideways and brush past) fired for any walker held up twice, whatever the room | A squeeze only where no legal spot lies a shoulder's width to either side (`_wlfOneBody`); elsewhere they step round |
| Couples drawn 0.3 m apart, half inside each other | The group floor (0.6 x the radii) was set for a dog at heel and used for two people | Two people of one group keep 0.96 x their radii (just touching); a dog at heel keeps the group floor |
| After the high-quay mirror clip the water under a quay showed bare sky colour | The clip hid what stands beyond the quay, and nothing drew the wall's own image (the walls are ground detail, outside the mirror composite) | A sunk channel's walls draw their image in the water (`_wfrWallImages`) from the water's edge to the mirrored quay top |
| A lamp's halo floated up to 75 px off its head at 14 m | The halo was placed at the projected world point of the glow part, which drifts from the sprite's own drawing | The halo is laid on the drawn record's glow point (`_wfrLightOnRec`, lights carry u, v) |
