# Prompt: scene builder (one real place, end to end)

Paste everything below the line into a ChatGPT or Gemini agent working in this checkout. Fill in the `<...>` fields.
The agent does the whole job, including any new objects, the checks and the commit; nobody runs anything by hand.

---

You are working in the OpenDash repository (this folder; vanilla JavaScript, Node >= 20, no dependencies). Do the whole job
yourself: write the files, run every command, look at the rendered images, fix problems, and finish with a local commit.
Never ask me to run anything.

**Task:** build ONE hand-composed scene of a real place: `<place, e.g. "Frensham Great Pond, Surrey, from the sailing club
beach looking south-west">`, slug `<slug, e.g. frensham-ponds>`, county `<county id, e.g. surrey>`, best moment
`<e.g. golden hour in summer>`. It must be as good as the three proof scenes, and unique: its own view, its own life.

**1. Study (do not skip).** Read `docs/dev/AGENT_HANDBOOK.md` in full (the quality bar, file ownership, commands, commit
rules). Read the three proof scenes (`src/app/71-scene-proof-*.js`, their `70-scene-lib-proof-*.js` and
`72-anim-pack-proof-*.js`) and render one: `node tools/anim-pack.mjs scene sheet
proof-yateley-green/hampshire-proof-yateley-green --times`, then open the PNGs in `.anim-ref/scenes/`. Skim
`docs/dev/SCENE_ENGINE_V2.md` for the recipe format (camera, surfaces, placements, actors, flows).

**2. Research the real place.** The standpoint (lat, lon), the heading, what is really in view at that heading: water,
paths, roads, railways, buildings, tree species, landmarks, the wildlife and people you would see. Use maps and photos;
OpenStreetMap may be used only as a reference for the layout (`scene osm --out` or `--preview` to read it). Never use
`scene compose`, `scene osm --into`, `scene new --osm` or `scene upgrade` to make the scene: compose it by hand.

**3. Objects.** `node tools/anim-pack.mjs object list` and reuse what fits. Create every missing object yourself, exactly as
`docs/dev/agent-prompts/object-artist.md` describes: mode A (draw it in code with `sceneObjDefine` in
`src/app/70-scene-lib-<slug>.js`; the default) or mode B (only if you can generate images: sprite sheets in the template
grid saved to `ai-objects/inbox/<yyyy-mm-dd>-<slug>/` with a `manifest.csv`, then `node tools/anim-pack.mjs object
import-batch ai-objects/inbox/<batch>`). Ids: `<category>.<prefix>-<name>`. `object lint` must pass for each new object.

**4. Compose.** Write `src/app/71-scene-<slug>.js` (the scene) and `src/app/72-anim-pack-<slug>.js` (the pack registration,
modelled on `72-anim-pack-proof-yateley-green.js`: a county-prefixed id, label, site, tags, county, when it plays). Follow
the rules of handbook section 2: curved organic surfaces, clumps not rows, a foreground frame, an off-centre focus, five
or more depth layers, the real layout, at least one standout choreographed animation plus ambient life by day and night,
trains on rails, cars on roads, boats on water, people on paths.

**5. Check (light, handbook section 5).** `node build.mjs --syntax`; `node tools/anim-pack.mjs scene perf <ref>` once;
`node tools/anim-pack.mjs scene sheet <ref> --times` once; open the noon, golden and night PNGs and compare them honestly
with the proof renders; ONE improvement round on the three worst things; then `scene lint <ref>` (no placement errors).
Do not run the full test suite.

**6. Commit.** Only your files, staged by name; `node tools/anim-pack.mjs guard --owned <your files>`;
`node tools/privacy-scan.mjs --staged` clean; then
`git -c user.name="<your name>" -c user.email="<your noreply email>" commit -m "Scene: <place>" -m "Co-Authored-By: <your name> <noreply address>"`.
Never push. Never edit shared engine or library files, other scenes, tests or tools; if the engine is missing something,
say so in the report.

**Report:** the files, the scene ref, the new object ids (and their mode), the render PNG paths, the perf numbers, what you
improved in the improvement round, and the commit hash.
