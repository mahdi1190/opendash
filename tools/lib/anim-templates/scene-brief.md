# Brief: draw {{todo_count}} full-screen scene{{todo_s}} for the {{region_name}} region (batch {{batch}} of {{batches}})

You are one of several agents drawing the full-screen opening scenes (1600 x 900 animated inline SVG) of the **{{region_name}}** region
(`{{region_id}}`) of OpenDash, a local dashboard. Your batch: {{batch_groups}}. This brief is your whole task. Read all of it before you draw
anything. Sections 3 to 8 are the quality contract and are not negotiable: your scenes must look like part of the same body of work as the existing
United States and Asia scenes, drawn by one hand, and a scene that merely passes the lint is NOT done. Fewer scenes at this standard beat a full batch
of weak ones. If you notice that you are rushing (shorter code, a skipped look, a borrowed helper, "good enough"), stop: finish the scene you are on,
and report the rest under NOT DONE.

{{notes}}

## 1. Your file, and the files you must not touch

You own exactly ONE file: `{{file}}`. Create it (it may exist as a generated stub, or hold part of your batch from an earlier run: build on it,
never delete a scene that is finished). Touch nothing else:

- not `tools/` (the lint thresholds `tools/anim-quality.json` and the waiver list in it included), not `tests/`, not `docs/`;
- not the region config `{{region_file}}` and not the pack files `src/app/72-anim-pack-{{region_id}}-*.js` (other agents draw the small elements there);
- not another agent's scene file `src/app/71-anim-region-{{region_id}}-scenes-*.js`.

If you think another file is wrong (a table row, a missing pack file), say so in your report and carry on. Do not commit, push or `git add`: leave your file
uncommitted, the orchestrator integrates. After you report, the orchestrator runs `{{guard}}`: any other changed file, and any change to a
threshold, a waiver, a test or the gold-standard list, rejects your whole batch. The git remote is PUBLIC: no personal names, paths or emails anywhere, not even in comments.

## 2. The region and your keys

{{region_name}} (`{{region_id}}`): {{groups_summary}}. A scene plays full screen as the day's opening for 2.4 to 4.2 seconds, only while the user is there,
so it must read at a glance and its first motion must already be visible. The opening shows the title "Welcome to <place>" (the place name comes from the
region's table, not from you) and, under it, your scene's `site` as a caption.

- `{{unit_word}}:<CODE>` is the {{unit_word}}'s SIGNATURE: it plays anywhere in that {{unit_word}} that has no scene of its own. Draw the {{unit_word}}'s most
  recognisable landscape or landmark, not a city skyline.
- `place:<id>` is a BIG CITY's opening: it plays within about 50 km of the city and wins over the {{unit_word}}'s signature. Draw that city: its skyline,
  harbour or best-known view.

Draw one scene for each key below, exactly these keys, each once ({{todo_count}} to draw of the {{count}} listed). Do not draw a key that is not in the
table: it would collide with another agent's scene (a key registered twice is reported by `lint`, `status` and `region.check()`, and the last one silently wins).

{{keys}}
{{done_note}}
The four last columns are SUGGESTIONS from a fixed rotation over the whole region, so that the agents of the other batches (who cannot see your work, and you
cannot see theirs) end up with different times of day, seasons, scene types and palettes. Keep them, or change one when the place demands it (a desert has no
forest, the tropics have no winter, a night scene needs lights) and give the reason in one line in your report. Inside your batch the old rule still holds:
five golden-hour harbours in a row are rejected.

Already drawn in this region when this brief was made. A snapshot only (other agents are drawing right now): it keeps you from repeating finished work, it does not coordinate the batches:

{{existing}}

## 3. Care rules (cultural and representation)

These are as binding as the quality contract. They override anything you see in older scenes.

{{care}}

## 4. Study first (mandatory, before you draw anything)

1. Read `{{skill}}` and then its references, all of them, with their full paths: `{{refs}}/style-guide.md` (the visual and motion language), `{{refs}}/rubric.md`
   (the 20 lines, the instant rejects and the pass mark you will check yourself against), `{{refs}}/recipes.md` (one recipe per scene type),
   `{{refs}}/kit-reference.md` (every helper of `animSceneKit()` and every motion class). Follow what SKILL.md says.
2. LOOK at the gold standard with the Read tool. The orchestrator has already rendered it to `.anim-ref/` (light and night): the PNG paths are listed below. If
   a PNG is missing, stop and say so in your report: do NOT render the exemplars yourself (several agents would write the same files at the same time). Open
   the ones nearest your subjects, light AND night, and read their source (listed below). For EACH of your keys write down which exemplar is its model and what craft
   you take from it (layers, haze between planes, a reflection, a framing foreground, motion at three depths, the evening grade). Study technique, never copy a drawing.
3. Read two or three existing scenes of this region or of the United States / Asia (`src/app/71-anim-us2-scenes-*.js`, `src/app/71-anim-asia2-scenes-*.js`)
   to see how a finished scene is built.

The gold-standard scenes (`node tools/anim-pack.mjs reference` prints why each one is good). They are the BEST ten of the corpus: use them for technique; the pass line is the median, in section 5:

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
    label: 'Terraced hills at dusk',    // what is drawn, without the place name: the region adds ", <name>" to it
    site: 'Rice terraces above a misty valley',   // the CAPTION under the "Welcome to <place>" title: a short description of what is shown (never just the place name again: the title says it)
    colour: 'orange', mood: 'calm', season: 'any', tags: ['landscape', 'sunrise'],   // colour: blue indigo violet pink red orange amber green teal slate
    svg: () => { /* the inside of a 1600 x 900 drawing, built with the kit, see the recipe */ },
  });
})();
```

- Build back to front in the house layers: sky, light, sky life, far plane, mid plane, water or ground, the landmark, life around the subject, near plane
  and framing, `finish()`. Use the recipe for your scene type from `recipes.md`. Gradients and the kit helpers for the sky, haze and light; hand-built
  paths (loops, computed curves, scale ladders) for the landmark; two or three flat values per object plus a translucent lit or shadow side.
- **Where things sit.** {{safe_zones}}
- **Time of day is yours** (the table only suggests one): dawn, day, golden hour, dusk or night are all fine. Whatever you choose, the scene must read clearly
  in the LIGHT theme exactly as drawn, and a night scene is painted as night (stars, a moon or an aurora, windows already lit), not as a daylight picture with a
  dark wash. `finish()` still goes last: the shared evening grade then darkens the scene in the dark theme and at night, and everything that should switch on at night
  (windows, lamps, stars) uses the kit's evening elements `lit()`, `dots(..., 'us-lamps')`, `stars()`, so give the scene something that lights up.
- Motion only through the kit's `x-*` classes and `mv()` (transform and opacity only), at three depths, every repeat with its own period and a negative
  delay so the picture is already mid-motion at t = 0. Nothing is in sync.
- {{markup_rules}} Fresh gradient ids come from `U()`, never typed.
- Each scene must be at most {{scene_cap}} bytes rendered. If you get near the cap, simplify repeated detail, never the quality of the composition.

{{targets}}

## 6. Definition of done, for EACH scene (all seven, in this order)

1. STUDIED: the model exemplar for this scene is named and you have looked at its PNG (light and night).
2. DRAWN with the kit and its recipe, in your file, inside the IIFE, with its own subject and its own composition.
3. LINT: `lint --file` PASSES for the scene (last line `PASS: <n> items clean.`, no waiver, no threshold edit) AND meets the targets of section 5 (richness >= {{min_richness}}, at most {{max_thin}} thin spots,
   both printed for every scene). If not, improve the ART: add real layers, detail systems, depth and motion; never pad it with filler shapes, never stuff keywords or invisible
   elements, never copy an existing scene or icon and recolour or nudge it (the lint measures shared shapes and detects all three). Never edit `tools/anim-quality.json`, never add
   a waiver, and never decide that a failing rule is wrong: only the orchestrator decides about waivers. A redraw is at most {{max_redraws}} attempts per scene.
   **After {{max_redraws}} attempts a scene that still fails the lint or the rubric pass mark is NOT DONE:** save its code to `.anim-ref/drafts/<key with ":" as "_">.js` (git-ignored; write the file with your editor tool),
   REMOVE it from your file (or comment it out) so that your file lints clean, and list it under NOT DONE with the failing rule and the draft path. A scene that passes both but still misses a redraw target stays in the file
   and is listed under TARGET MISSES with its numbers: the independent reviewer decides. You never ship a failing scene, and your report's LINT line must say PASS.
4. LOOK: `sheet --file ... --mode light` AND `--mode night` rendered and BOTH PNGs opened with the Read tool, then the phone and square crops, then the contact sheet as a thumbnail. Put the render next to the
   nearest exemplar's PNG and compare: the same depth layers, the same finish, the same life. Looking is proved in the report: for every render you opened, write ONE concrete thing you saw in it and ONE defect
   you found in it (and what you did about it); "none" is not accepted, an honest render always shows something to improve. A render you did not open is not looked at.
5. SELF-CHECK on the rubric: pass mark {{pass_mark}} Below it, or any instant reject: redo it (an attempt), then lint, look and check again.
6. CARE: checked against section 3 (no text, flags, maps, political symbols, identifiable people, holy figures).
7. REPORTED: it appears in your final report (section 8) with its bytes, its richness, its thin spots and its self-check.

## 7. Do NOT

- No padding: no shapes added to pass a count, no invisible or off-screen filler, no repeated clones to raise the element number.
- No copy-paste of an existing scene with new colours or a few moved shapes; no cloning one scene of your batch into another.
- No text or letter-like marks. No flags, maps or borders. No political or military symbols. No portraits, faces, crowds or identifiable people (a tiny faceless silhouette as a scale cue is allowed). No holy figures.
- Never raise or add a threshold, a waiver or a rule; never edit a test or a tool to make a check pass; never run a command that rewrites a file you do not own.
- No claim you cannot back: do not say you looked at a render you did not open, or that a command passed if you did not run it.
- When time is short, do FEWER scenes, each finished to this standard, and list the keys you did not do. Never ship a failing gate.

## 8. Commands (run them from the repository root) and the report

{{verify}}

Every command loads the whole registry, other agents' files included. If a load fails, the error names the file and the line. If the file is not yours, that agent is still
editing: wait a minute and run it again, and never touch their file; if it is yours, fix it. The orchestrator itself runs `node --test tests/anim-packs.test.mjs` (the reduced-variant, theme and size gates of the whole
registry) and `{{guard}}`.

Final report: reply with exactly this block, every field filled in:

```
FILE: {{file}}   scenes drawn and passing: <n of {{todo_count}}>   bytes of the file: <size>
LINT: <the last line of `lint --file`, verbatim: "PASS: <n> items clean." with no waivers>
GIT: <the output of `git status --short`, verbatim: only your file may be listed>
PER SCENE: <key> | rendered bytes | richness index | thin spots (n) | model exemplar | self-check R1-R20 as a P/F string = n/20 | instant rejects: none | suggested time/season/type/palette: kept, or changed (reason)
LOOKED: <per scene and render: png path | one concrete thing seen | one defect found (and the fix)>   for light, night, the phone and square crops, plus once the contact sheet and the exemplar PNGs you held it against
WEAKEST THREE: <per scene: its three weakest points and how you checked each in the render or the code>
TARGET MISSES: <key | the numbers>   (or "none")
NOT DONE: <key | failing rule or rubric lines | attempts used (n of {{max_redraws}}) | path of the saved draft>   (or "none")
OTHER FILES I THINK ARE WRONG: <or "none">
```
