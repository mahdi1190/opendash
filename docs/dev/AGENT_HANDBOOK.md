# Agent handbook: building OpenDash scenes and objects (ChatGPT, Gemini, any agent)

For an AI agent that can read and write files and run commands in this checkout. **The user never runs a command by hand:
you do every step yourself, from the first file to the local commit.** Copy-paste prompts: `docs/dev/agent-prompts/`
(`scene-builder.md`: one real place composed from library objects; `painted-scene.md`: one real place painted by image
generation and animated by the engine; `object-artist.md`: new library objects). Each runs end to end from one paste.

## 1. What a scene is

An OpenDash scene is a full-screen 1600 x 900 animated illustration of one real place, drawn live in the browser by the
scene engine v2 (`src/app/70-scene-*.js`, `78-scene-*.js`): a camera at a real latitude, longitude and heading; surfaces
(grass, water, roads, paths) as ground polygons in metres; library objects (trees, buildings, people, birds, vehicles)
placed on them; movers on paths. The engine does the light (the real sun and sky for that place and moment), water
reflections, shadows, haze, weather, seasons and night lighting. A scene is data, not pixels.

Objects come from the object library (`sceneObjDefine`, `docs/dev/SCENE_ENGINE.md` section 2): vector drawings with
variants, seasons, a night look and animation hooks. They can also be RASTER objects imported from AI sprite sheets
(`docs/dev/OBJECT_IMPORT.md`).

A PAINTED scene is the other kind: the whole place is one AI painting (summer plus aligned edit-variants for the seasons
and night, and sky, water and foreground masks), imported by `scene paint new`; the engine adds the live sky, the night
crossfade, water ripples and glints, weather, and library actors that walk behind the painted foreground
(`docs/dev/PAINTED_SCENES.md`). Its files: `71-scene-paint-<slug>.js`, `72-anim-pack-paint-<slug>.js` and
`assets/objects/ground/paint-<slug>*`. The quality bar below applies to the painting's composition and to its animations.

## 2. The quality bar: the three proof scenes

Study these before you write anything. They are the bar; nothing below them ships.

| scene | files | ref (for the tools) |
|---|---|---|
| Wyndham's Pool at dusk | `src/app/71-scene-proof-wyndhams-pool.js`, `70-scene-lib-proof-wyndhams-pool.js`, `72-anim-pack-proof-wyndhams-pool.js` | `proof-wyndhams-pool/hampshire-wyndhams-pool-dusk` |
| Yateley Green | `src/app/71-scene-proof-yateley-green.js`, `70-scene-lib-proof-yateley-green.js`, `72-anim-pack-proof-yateley-green.js` | `proof-yateley-green/hampshire-proof-yateley-green` |
| Fleet Pond | `src/app/71-scene-proof-fleet-pond.js`, `70-scene-lib-proof-fleet-pond.js`, `72-anim-pack-proof-fleet-pond.js` | `proof-fleet-pond/hampshire-fleet-pond-proof` |

Render them and LOOK at the PNGs: `node tools/anim-pack.mjs scene sheet <ref> --times` (writes `.anim-ref/scenes/`).

The rules they follow:

1. **Hand-composed.** Every surface, clump and mover is placed on purpose, for this place. No generator output.
2. **Curved, organic shapes.** Shorelines, paths and woods are smooth closed curves (Catmull-Rom through control points
   with a seeded wobble, as in the proof files), never polygons with straight edges or boxes.
3. **Clumps, not rows.** Trees, reeds and flowers grow in groups of uneven size with gaps (`cluster: { centres, spread }`);
   never evenly spaced lines, never one of everything.
4. **Foreground framing.** Something close to the camera frames the view: a bough over a top corner, reeds or bracken across
   the bottom, a trunk at one edge.
5. **Off-centre focus.** The subject (church, pool, bridge) sits on a third, not in the middle; the eye is led to it by a
   path, a shoreline or light.
6. **Five or more depth layers.** Foreground frame, near ground, mid subject, far treeline or town, skyline or hills; each
   with its own scale and haze.
7. **Real-place accuracy.** The real view from a real standpoint: the right buildings, water, trees, roads and railways in
   the right places for that heading. Check maps and photos; OpenStreetMap may be read as a REFERENCE for the layout only.
8. **Standout animations.** At least one choreographed moment a viewer remembers (the heron's stab and splash, the
   kingfisher's dive, the dog fetching the ball), plus ambient life (walkers, ducks, swallows by day; bats and mist at
   night), timed and seeded so the same second always looks the same.
9. **Trains on rails, cars on roads, boats on water, people on paths.** Movers follow their own surface; nothing floats,
   overlaps a wall or drives over grass. `scene lint --strict-placement` checks this.

## 3. Files and ownership

One scene owns exactly its own files and nothing else (`<slug>` = the place, e.g. `frensham-ponds`):

| file | holds |
|---|---|
| `src/app/71-scene-<slug>.js` | the scene: camera, surfaces, placements, actors, flows (data only) |
| `src/app/70-scene-lib-<slug>.js` | the scene's own objects (`sceneObjDefine` in an IIFE), ids `<category>.<prefix>-<name>` with a short scene prefix |
| `src/app/72-anim-pack-<slug>.js` | registers the pack (`animRegisterPack`): id, label, site, tags, county, when it plays |
| `assets/objects/<category>/<prefix>-<name>/` | raster objects you imported (mode B), one folder each |

**Never edit a shared file**: the engine (`70-scene-0*.js`, `70-scene-1*.js`, `78-scene-*.js`), the shared libraries
(`70-scene-lib-trees.js`, `-people.js` ...), another scene's files, `tools/`, `tests/`, `tools/anim-quality.json`,
`build.mjs`, `MODULES.md`. The one exception is `src/app/70-scene-lib-raster.js`, which `object import*` regenerates for
you (never edit it by hand). If the engine cannot do something, write it down in your final report instead of changing it.
`node tools/anim-pack.mjs guard --owned <file>,<file>` proves only your files changed.

Other agents may be working in the same checkout at the same time: never `git add -A`, `git stash`, `git checkout --`,
`git reset` or reformat files you do not own.

## 4. The commands

All from the repo root, `node tools/anim-pack.mjs <command>` (`--help` on any of them):

| command | what it does |
|---|---|
| `object list [--kit k] [--role r] [--category c]` | what the library holds (reuse before you draw) |
| `object new <cat>.<name> --kits k --role r` | prints a definition stub, but writes it into a SHARED library file: copy the stub into your own `70-scene-lib-<slug>.js` and revert the shared file |
| `object lint <id>[,<id>]` | the object rules; must PASS |
| `object sheet <id>[,<id>] [--mode night]` | a PNG per object: variants x seasons x night x lit (`.anim-ref/objects/`); look at it |
| `object import-sheet <sheet.png> --id <id> --rows N [--frames K] --kit k --role r [--size xH]` | one AI sprite sheet to a raster object |
| `object import-batch <folder> [--dry-run]` | every row of `<folder>/manifest.csv` (sheets and single images); then lint and sheet |
| `object template [--examples]` | regenerates the blank grid and the example sheets |
| `scene new <pack> <id> --lat .. --lon .. --heading ..` | a v2 recipe scaffold; fine as a starting skeleton, then compose by hand |
| `scene lint <ref> [--strict-placement] [--perf]` | the quality, placement and performance rules (see the note below) |
| `scene sheet <ref> --times` | dawn, noon, golden hour, dusk and night PNGs (`.anim-ref/scenes/`) |
| `scene perf <ref>` | frame times in the real renderer |
| `scene paint new <pack> <id> --images <folder>` | a painted scene from a painting, its edit-variants and masks (writes the objects and the scene scaffold) |
| `scene paint lint <ref>` | a painted scene's checks: sizes, bytes, masks, alignment drift, where the actors stand |

A ref is `<pack>/<item id>` (the item id the `72-anim-pack-*` file registers).

`scene lint` note: the hand-composed proof scenes themselves fail some older size and v1 bars (`dataBytes`,
`svgTileBytes`, `spriteMB`, `coverItems`, `tintUse`). Those are not blockers. Placement-sanity ERRORS, `problems`,
objects on the wrong surface, and any frame-time failure from `scene perf` are: fix them. Lint a proof scene once to
see the baseline.

**Do not use** `scene compose` (the auto-composer), `scene osm` / `scene new --osm` (OSM-to-scene drafts), `scene terrain
--into`, `scene street --into` or `scene upgrade` to make the scene: their output is not good enough. OSM (or `scene osm
--out f.json` / `--preview`) is allowed only as a reference for where things really are.

## 5. The light check routine (do this, not the full test suite)

1. `node build.mjs --syntax`: every script parses.
2. `node tools/anim-pack.mjs scene perf <ref>` once.
3. `node tools/anim-pack.mjs scene sheet <ref> --times` once; open the noon, golden and night PNGs and look at them
   against the proof renders and the rules in section 2.
4. ONE improvement round: fix the three worst things you saw, re-render once, then `scene lint <ref>` (no placement errors; see the note in section 4).

Objects: `object lint <ids>` and `object sheet <ids>` (and `--mode night`), and look at the sheets.

## 6. Commit rules

- Local commits only. **Never push**, never tag, never touch remotes or branches you did not create.
- Stage your own files by name (`git add <file> ...`), then `node tools/privacy-scan.mjs --staged` must be clean.
- Commit with the no-reply author, ending the message with a line naming you (for example
  `Co-Authored-By: Gemini <noreply@google.com>` or `Co-Authored-By: ChatGPT <noreply@openai.com>`):
  ```
  git -c user.name="<your name>" -c user.email="<your noreply email>" commit -m "<what and where>" -m "Co-Authored-By: <you>"
  ```
- **The repository is public.** No personal data anywhere: no real names of private people, e-mail addresses, home
  addresses, absolute paths (`C:/Users/...`), tokens or task text, in code, comments, file names or commit messages.
  Public places, landmarks and street names are fine.

## 7. Where to read more

`docs/dev/SCENE_ENGINE.md` (objects, section 2), `docs/dev/SCENE_ENGINE_V2.md` (camera, surfaces, placements, flows,
light), `docs/dev/OBJECT_IMPORT.md` (sprite-sheet import), `docs/dev/AI_OBJECTS.md` (the house style and palette for
images), `docs/dev/object-sheets/PROMPT.md` (the sheet prompt), `ai-objects/inbox/README.md` (the inbox and manifest), `docs/dev/PAINTED_SCENES.md` (painted scenes).
