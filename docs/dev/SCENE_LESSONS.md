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

Run `node tools/anim-pack.mjs scene motion <ref> --out <png>` on every view and fix every red mark.

## C. Engine and rendering bugs already fixed (do not reintroduce)

- Blurry scenes on big or ultrawide screens: the backing store is capped by pixel count, not width.
- A train starting halfway: the scene clock restarts when the scene is shown.
- Unlit night windows: per-window random threshold (`_sccWindowU`).
- Black hole in the water near the camera, and huge jagged bank bands up close: fixed in the canvas and water passes.
- Snowflakes on every winter day, too-strong dawn frost: snow only on seeded snow days or real snow.
- Waterline clip cutting whole boats away: boats without a hull part do not sink.

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
