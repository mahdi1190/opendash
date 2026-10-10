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
