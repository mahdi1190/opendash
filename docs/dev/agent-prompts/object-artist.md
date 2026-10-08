# Prompt: object artist (new library objects, end to end)

Paste everything below the line into a ChatGPT or Gemini agent working in this checkout. Fill in the two `<...>` fields.
The agent does the whole job, including the import, the checks and the commit; nobody runs anything by hand.

---

You are working in the OpenDash repository (this folder; vanilla JavaScript, Node >= 20, no dependencies). Do the whole job
yourself: write the files, run every command, look at the output images, fix problems, and finish with a local commit.
Never ask me to run anything.

**Task:** add these objects to the scene object library: `<list: e.g. "a Hampshire flint-and-brick cottage (2 variants), an
alder tree (3 variants), an angler sitting on a stool (with a 4-frame casting loop)">`, for the scene or theme
`<slug, e.g. frensham-ponds>`. Give every id a short prefix from the slug: `<category>.<prefix>-<name>` (e.g.
`tree.frp-alder`).

**First read:** `docs/dev/AGENT_HANDBOOK.md` (rules, file ownership, commit rules), `docs/dev/SCENE_ENGINE.md` section 2
(the object definition), `docs/dev/AI_OBJECTS.md` section 1 (the house style and palette). Look at how the proof scenes
draw their own objects: `src/app/70-scene-lib-proof-yateley-green.js` and `src/app/70-scene-lib-proof-wyndhams-pool.js`.
Run `node tools/anim-pack.mjs object list` and reuse what exists rather than redrawing it.

**Pick the mode per object yourself:**

**Mode A (the default, for most objects): draw it in code.** Write `sceneObjDefine({...})` calls inside one IIFE in
`src/app/70-scene-lib-<slug>.js` (create it if missing; copy the header and helpers pattern of the proof lib files). Give
each object: `id`, `category`, `size`, `variants`, `real` (metres), `palette` with seasonal entries, `tags` (at least one
`kit:<kit>` and exactly one `role:<role>`), a `credit`, and `build(v, r, ctx)` returning named parts of shapes (SVG path
data, `@palette.N` colours). Buildings and vehicles need glow shapes for windows and lamps (they light at dusk); animals
and people face RIGHT; light comes from the upper left; curved organic outlines, no straight-edged blobs; animation
through the hooks (`anim`: sway, walk, turn, spin ...), not per-frame code.

**Mode B (only if you can generate images): sprite sheets.** For an object that is hard to draw in paths (a complex
landmark, a detailed vehicle), and only if you have image generation:
1. Generate ONE image per object in exactly the template grid. Attach or follow these:
   - the prompt: `docs/dev/object-sheets/PROMPT.md` (copy its prompt section, fill the subject);
   - the blank grid: `docs/dev/object-sheets/template-2x6-f4.png` (1840 x 920: 6 columns SPRING, SUMMER, AUTUMN, WINTER,
     NIGHT with lights off, LIT at dusk; one row per variant; a last FRAMES row with the summer look in N poses; flat
     #FF00FF background; cells 256 px with 32 px gutters, first cell at 112, 56);
   - filled examples: `docs/dev/object-sheets/example-building-terrace.png`, `example-tree-oak.png`,
     `example-person-walker.png` (copy their layout and finish, not their subjects).
   For a different number of rows or frames, run `node tools/anim-pack.mjs object template --rows N --frames K --out
   ai-objects/inbox/<batch>` and use that grid.
2. Save the images to `ai-objects/inbox/<yyyy-mm-dd>-<slug>/` and write `manifest.csv` there (format:
   `ai-objects/inbox/README.md`; columns `id,file,category,size,anchor,kit,tags,parts,role,res,rows,frames`).
3. Run `node tools/anim-pack.mjs object import-batch ai-objects/inbox/<batch> --dry-run`, fix any FAIL (regenerate the one
   bad cell or sheet), then run it without `--dry-run`. It writes `assets/objects/<category>/<name>/` and regenerates
   `src/app/70-scene-lib-raster.js` (generated: never edit it by hand).

**Always finish with:**
1. `node build.mjs --syntax`.
2. `node tools/anim-pack.mjs object lint <ids>`: must PASS; fix every failure in your own files (mode A) or by
   re-importing with better options or a regenerated sheet (mode B).
3. `node tools/anim-pack.mjs object sheet <ids>` and `--mode night`: open the PNGs in `.anim-ref/objects/` and look. Fix
   what looks wrong (wrong proportions, flat seasons, no lit windows, a figure facing left), once.
4. Commit only your files (handbook section 6): `git add` them by name (your `70-scene-lib-<slug>.js`, your
   `assets/objects/...` folders, `src/app/70-scene-lib-raster.js` if you imported), `node tools/privacy-scan.mjs --staged`
   clean, then
   `git -c user.name="Mahdi Ahmed" -c user.email="97956683+mahdi1190@users.noreply.github.com" commit -m "Objects: <ids>" -m "Co-Authored-By: <your name> <noreply address>"`.
   Never push. Never edit shared engine or library files, tests or tools.

**Report:** the ids, the mode used for each, the sheet PNG paths, the lint result and the commit hash.
