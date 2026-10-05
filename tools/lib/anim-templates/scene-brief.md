# Brief: draw {{count}} full-screen scenes for the {{region_name}} region (batch {{batch}} of {{batches}})

You are one of several agents drawing the full-screen opening scenes (1600 x 900 animated inline SVG) of the **{{region_name}}** region
(`{{region_id}}`) of OpenDash, a local dashboard. Your batch: {{batch_groups}}. This brief is your whole task. Read all of it before you draw
anything. Sections 4 to 8 are the quality contract and are not negotiable: your scenes must look like part of the same body of work as the existing
United States and Asia scenes, drawn by one hand, and a scene that merely passes the lint is NOT done. Fewer scenes at this standard beat a full batch
of weak ones.

{{notes}}

## 1. Your file, and the files you must not touch

You own exactly ONE file: `{{file}}`. Create it (it may exist as a generated stub, or hold part of your batch from an earlier run: build on it,
never delete a scene that is finished). Touch nothing else:

- not `tools/` (the lint thresholds `tools/anim-quality.json` and the waiver list in it included), not `tests/`, not `docs/`;
- not the region config `{{region_file}}` and not the pack files `src/app/72-anim-pack-{{region_id}}-*.js` (other agents draw the small elements there);
- not another agent's scene file `src/app/71-anim-region-{{region_id}}-scenes-*.js`.

If you think another file is wrong (a table row, a missing pack file), say so in your report and carry on. Do not commit, push or `git add`: leave
your file uncommitted, the orchestrator integrates. The git remote is PUBLIC: no personal names, paths or emails anywhere, not even in comments.

## 2. The region and your keys

{{region_name}} (`{{region_id}}`, shown to the user as "Welcome to <place>" over "{{over}}"): {{groups_summary}}. A scene plays full screen as
the day's opening for 2.4 to 4.2 seconds, only while the user is there, cropped to the screen (16:9 on a desktop, the middle of the picture on a
phone), so it must read at a glance and its first motion must already be visible:

- `{{unit_word}}:<CODE>` is the {{unit_word}}'s SIGNATURE: it plays anywhere in that {{unit_word}} that has no scene of its own. Draw the {{unit_word}}'s most
  recognisable landscape or landmark, not a city skyline.
- `place:<id>` is a BIG CITY's opening: it plays within about 50 km of the city and wins over the {{unit_word}}'s signature. Draw that city: its skyline,
  harbour or best-known view.

Draw one scene for each key below, exactly these keys, each once ({{todo_count}} to draw):

{{keys}}
{{done_note}}
Keep every subject different: vary the time of day, the season, the scene type (skyline, mountains, coast, monument, desert, forest, farmland,
lights at night) and the palette across your batch. Five golden-hour harbours in a row are rejected.

Subjects already drawn in this region (do not repeat them):

{{existing}}

## 3. Care rules (cultural and representation)

{{care}}

## 4. Study first (mandatory, before you draw anything)

1. Read `.claude/skills/animation-pack/SKILL.md` and then its references, all of them: `references/style-guide.md` (the visual and motion language),
   `references/rubric.md` (the 20-point rubric and the instant rejects you will score yourself against), `references/recipes.md` (one recipe per scene
   type), `references/kit-reference.md` (every helper of `animSceneKit()` and every motion class). Follow what SKILL.md says.
2. Render the gold standard and LOOK at it with the Read tool: `node tools/anim-pack.mjs reference --render` and
   `node tools/anim-pack.mjs reference --render --mode night` write PNGs to `.anim-ref/`. Open the ones nearest your subjects, light AND night, and
   read their source (listed below). For EACH of your keys write down which exemplar is its model and what craft you take from it (layers, haze
   between planes, a reflection, a framing foreground, motion at three depths, the evening grade). Study technique, never copy a drawing.
3. Read two or three existing scenes of this region or of the United States / Asia (`src/app/71-anim-us2-scenes-*.js`, `src/app/71-anim-asia2-scenes-*.js`)
   to see how a finished scene is built.

The gold-standard scenes (`node tools/anim-pack.mjs reference` prints why each one is good):

{{exemplars}}

Accepted scenes that are flat, blobby or crude. Do better than these, never imitate them:

{{weaker}}

## 5. Draw

The file is one classic script wrapped in an IIFE (every `src/app` file shares one script scope: a bare top-level `const K` would clash with the next
agent's file) and uses ONLY `animSceneKit()` and `animRegionSceneAdd` at load time:

```js
(function () {
  const K = animSceneKit();
  const { U, R, rnd, lin, linU, radU, mv, full, ridge, canopy, cloud, streak, haze, rays, sun, stars, birds, shimmer, puffs, dots, lit, finish } = K;
  animRegionSceneAdd('{{region_id}}', {
    key: '{{unit_word}}:XX',            // one of your keys, exactly as listed
    label: 'What is drawn',             // "Kyoto at dusk": the region adds ", <name>" to it
    site: 'The place named under "Welcome to ..."',
    colour: 'orange', mood: 'calm', season: 'any', tags: ['landscape', 'sunrise'],   // colour: blue indigo violet pink red orange amber green teal slate
    svg: () => { /* the inside of a 1600 x 900 drawing, built with the kit, see the recipe */ },
  });
})();
```

- Build back to front in the house layers: sky, light, sky life, far plane, mid plane, water or ground, the landmark, life around the subject, near plane
  and framing, `finish()`. Use the recipe for your scene type from `recipes.md`. Gradients and the kit helpers for the sky, haze and light; hand-built
  paths (loops, computed curves, scale ladders) for the landmark; two or three flat values per object plus a translucent lit or shadow side.
- Keep the subject inside the middle 1200 x 800; the outer edges carry framing, not the story. Paint for daylight (a dusk or golden-hour sky counts); the
  shared evening grade lays on top in the dark theme and at night, and night-only lights are the kit's `lit()` / `us-lamps` / `us-star` elements: give the
  scene something that lights up.
- Motion only through the kit's `x-*` classes and `mv()` (transform and opacity only), at three depths, every repeat with its own period and a negative
  delay so the picture is already mid-motion at t = 0. Nothing is in sync.
- Allowed markup: shapes, groups, gradients. No text, images, `<use>`, links, styles, scripts, SMIL. Fresh gradient ids come from `U()`, never typed.
- Each scene must be at most {{scene_cap}} bytes rendered. If you get near the cap, simplify repeated detail, never the quality of the composition.

## 6. Definition of done, for EACH scene (all seven, in this order)

1. STUDIED: the model exemplar for this scene is named and you have looked at its PNG (light and night).
2. DRAWN with the kit and its recipe, in your file, inside the IIFE, with its own subject and its own composition.
3. LINT: `lint --file` PASSES for the scene with NO waiver and NO threshold edit. If it fails, improve the ART: never pad it with filler shapes, never stuff
   keywords or invisible elements, never copy an existing scene and recolour it (the lint measures shared shapes and detects all three). Never edit
   `tools/anim-quality.json`, never add a waiver. If the lint fails but you believe the art is right, do not hack around it: report the scene and the failing
   rule in your report and leave the scene as it is. Read the "thin spots" the lint prints and aim for the median of the accepted scenes, not their floor.
4. LOOK: `sheet --file ... --mode light` AND `--mode night` rendered and BOTH PNGs opened and looked at (also the contact sheet, as a thumbnail). Put the
   render next to the nearest exemplar's PNG and compare: the same depth layers, the same finish, the same life. "Good enough" is not a pass: the bar is the
   median of the existing scenes. If your scene is below its exemplar, say so plainly and redraw it.
5. SCORED: score it in writing on the 20-point rubric in `rubric.md`, one line per scene, with no instant reject. Below the pass mark in `rubric.md`, or any
   instant reject, means redo it, then lint, look and score again.
6. CARE: checked against section 3 (no text, flags, maps, political symbols, people, holy figures).
7. REPORTED: it appears in your final report (section 8) with its bytes, its lint result and its score.

## 7. Do NOT

- No padding: no shapes added to pass a count, no invisible or off-screen filler, no repeated clones to raise the element number.
- No copy-paste of an existing scene with new colours or a few moved shapes; no cloning one scene of your batch into another.
- No text or letter-like marks. No flags, maps or borders. No political or military symbols. No people. No holy figures.
- Never raise or add a threshold, a waiver or a rule; never edit a test or a tool to make a check pass; never run a command that rewrites a file you do not own.
- No claim you cannot back: do not say you looked at a render you did not open, or that a command passed if you did not run it.
- When time is short, do FEWER scenes, each finished to this standard, and list the keys you did not do. Never ship a failing gate.

## 8. Commands (run them from the repository root)

{{verify}}

Every command loads the whole registry, other agents' files included. If a load fails because of a file that is not yours (the error names it), that agent is still
editing: wait a minute and run it again, and never touch their file.

Final report (reply with exactly this, nothing implied):

```
FILE: {{file}}   scenes: <n of {{count}}>   bytes: <size of the file>
LINT: <the last line of `lint --file` verbatim: it must read "PASS: <n> items clean." with no waivers>
PER SCENE: <key> | <rendered bytes> | model exemplar | rubric score /20 (R1-R20 as a P/F string) | instant rejects: none | vs exemplar: better, equal or below | thin spots left
LOOKED: <the PNG paths you opened: light, night, the contact sheet and the exemplar PNGs>
WEAKEST: <the key you consider weakest>, why, and what you would improve with more time
NOT DONE: <keys not drawn or not passing, with the reason>   (or "none")
OTHER FILES I THINK ARE WRONG: <or "none">
```
