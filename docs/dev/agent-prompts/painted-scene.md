# Prompt: painted scene (a whole real place from image generation, end to end)

Paste everything below the line into a ChatGPT or Gemini agent that can generate images AND work in this checkout. Fill in the
`<...>` fields. The agent does the whole job; nobody runs anything by hand.

---

You are working in the OpenDash repository (this folder; vanilla JavaScript, Node >= 20). Do the whole job yourself: generate
the images, save them, run every command, look at the renders, fix problems, and finish with a local commit. Never ask me to
run anything.

**Task:** a painted scene of `<place, e.g. "Frensham Great Pond, Surrey, from the sailing club beach looking south-west">`,
slug `<slug>`, pack `paint-<slug>`.

**1. Read** `docs/dev/PAINTED_SCENES.md` (the format and the commands), `docs/dev/AGENT_HANDBOOK.md` sections 2 and 6 (the
quality bar and the commit rules) and `docs/dev/AI_OBJECTS.md` section 1 (the house style). Look at one proof render for the
look: `node tools/anim-pack.mjs scene sheet proof-yateley-green/hampshire-proof-yateley-green --times` (PNGs in
`.anim-ref/scenes/`).

**2. Research the place:** the standpoint (lat, lon), the heading, and what is really in view (water, paths, buildings,
landmarks, trees). Maps and photos; OpenStreetMap only as a reference.

**3. Generate the images** (save each as PNG in `ai-objects/inbox/<yyyy-mm-dd>-<slug>/`):
- `summer.png`: 1600 x 900 (16:9), the real view from the standpoint, summer midday, in the house style: flat vector
  illustration, soft shading lit from the upper left, no outlines, no text, no logos, no people or animals (the engine adds
  them), a clear open sky with at most two small clouds. Compose it like the proof scenes: a foreground frame (reeds, a bough,
  a wall) at one edge, the subject off-centre, five or more depth layers, curved organic shapes, trees in clumps.
- `spring.png`, `autumn.png`, `winter.png`, `night.png`: EDITS of summer.png with the image tool's edit mode ("the same
  image, same composition and framing, only change the season to ..."; night: "the same view at night, dark blue sky,
  warm lights in the windows and lamps"). Never a fresh generation: the variants must line up pixel for pixel.
- Masks, as EDITS too ("make every sky pixel pure white and everything else pure black"): `sky.png`, `water.png` (if there
  is water), `front.png` (the near foreground things a person could walk behind). If a mask comes out poor, write the area as
  a polygon in `paint.json` instead (`{"water": [[x, y], ...], "front": [...]}`, 1600 x 900 px), and add
  `"label"`, `"lat"`, `"lon"`, `"heading"` there.

**4. Import:** `node tools/anim-pack.mjs scene paint new paint-<slug> <slug> --images ai-objects/inbox/<batch>`. Read its
output: an alignment WARN means regenerate that variant as an edit; then re-run the same command (the scene file is kept).

**5. Animate:** in `src/app/71-scene-paint-<slug>.js` fill `actors` (and `flocks`) with 3 to 5 STANDOUT animations using
library objects (`node tools/anim-pack.mjs object list`): people and dogs on the painting's paths, boats on its water
(inside the water mask), birds in its sky, a train on its railway, cars on its roads; use `sByY` so figures grow toward the
viewer, and route at least one behind the foreground occluder. Coordinates are the painting's pixels: look at summer.png to
place them. Set the pack's `when` like `72-anim-pack-proof-yateley-green.js` if it should play in its county.

**6. Light checks:** `node build.mjs --syntax`; `node tools/anim-pack.mjs scene paint lint paint-<slug>/<slug>` (no FAIL);
`node tools/anim-pack.mjs scene perf paint-<slug>/<slug>` once; `node tools/anim-pack.mjs scene sheet paint-<slug>/<slug>
--times` once: open the noon, golden and night PNGs; ONE improvement round (actor placement and scale, a mask fix or a
regenerated variant), re-render once.

**7. Commit** only your files by name: `assets/objects/ground/paint-<slug>*`, `src/app/70-scene-lib-raster.js`,
`src/app/71-scene-paint-<slug>.js`, `src/app/72-anim-pack-paint-<slug>.js`. `node tools/privacy-scan.mjs --staged` clean, then
`git -c user.name="<your name>" -c user.email="<your noreply email>" commit -m "Painted scene: <place>" -m "Co-Authored-By: <your name> <noreply address>"`.
Never push. Never edit shared engine files, other scenes, tests or tools.

**Report:** the files, the ref, the lint result, the perf numbers, the render PNG paths and the commit hash.
