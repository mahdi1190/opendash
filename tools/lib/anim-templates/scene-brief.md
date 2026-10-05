# Brief: draw {{todo_count}} full-screen scene{{todo_s}} for the {{region_name}} region (batch {{batch}} of {{batches}})

You are one of several agents drawing the full-screen opening scenes (1600 x 900 animated inline SVG) of the **{{region_name}}** region
(`{{region_id}}`) of OpenDash, a local dashboard. Your batch: {{batch_groups}}. This brief is your whole task. Read all of it before you draw
anything. Sections 3 to 8 are the quality contract and are not negotiable: your scenes must look like part of the same body of work as the existing
United States and Asia scenes, drawn by one hand, and a scene that merely passes the lint is NOT done. Fewer scenes at this standard beat a full batch
of weak ones. If you notice that you are rushing (shorter code, a skipped look, a borrowed helper, "good enough"), stop: finish the scene you are on,
and report the rest under NOT DONE.

{{notes}}

## 1. Your file, and the files you must not touch

You own exactly ONE file: `{{file}}`. It exists as a generated stub (an empty IIFE), or holds part of your batch from an earlier run: build on it, never delete a scene that is finished (if it does not exist, create it like the stub). The orchestrator
COMMITTED the scaffold and the stubs before you started, so everything you change shows in `git status` and `guard`. Touch nothing else:

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
cannot see theirs) end up with different times of day, seasons, scene types and palettes. The rotation knows nothing about the place or about section 3: **when a suggestion collides with the care text or with the place** (a type the place does not have, a bridge for a city without one,
an autumn in the tropics, a palette the notes forbid), the care text and the place win: change it, give the reason in one line in your report (and say it so that the orchestrator can put it once into the region doc's "Scene suggestions", where it replaces the rotation for every brief). Otherwise keep it,
or change one when the place demands it (a desert has no forest, the tropics have no winter, a night scene needs lights). Inside your batch the old rule still holds:
five golden-hour harbours in a row are rejected.

Already drawn in this region when this brief was made. A snapshot only (other agents are drawing right now): it keeps you from repeating finished work, it does not coordinate the batches:

{{existing}}

## 3. Care rules (cultural and representation)

These are as binding as the quality contract. They override anything you see in older scenes. The general rules come first and the region's own notes (if any) after them: **the region's notes may only be STRICTER than the general rules, never looser** (the general rules ALLOW a tiny
anonymous silhouette as a scale cue; a region note that bans every figure bans that silhouette too, and where two statements seem to differ you follow the stricter one). A rule never allows what another forbids. The kit's `rays()` tinted red and white reads as a rising-sun flag: tint it in the sky's own warm light.

{{care}}

## 4. Study first (mandatory, before you draw anything)

1. Read `{{skill}}`, then exactly these four references, with their full paths (a scene agent does not need `small-icons.md`, which is for icons, or `workflow.md`, which is the orchestrator's): `{{refs}}/style-guide.md` (sections 1 to 10: the visual and motion language),
   `{{refs}}/rubric.md` (part A, the 20 lines, the instant rejects, the six recurring weaknesses of section 9 and the pass mark you will check yourself against), `{{refs}}/recipes.md` (the byte budget of section 1, the recipe of your scene type, then sections 4 to 8: scale ladders without clones, clipPath, seeds, the tested helpers, the night scene painted for the light theme, the night and motion checklist),
   `{{refs}}/kit-reference.md` (every helper of `animSceneKit()` and every motion class). Follow what SKILL.md says.
2. LOOK at the gold standard with the Read tool. The orchestrator rendered it ONCE (light and night) into `.anim-ref/` before you started: you OPEN those PNGs, you do not render them; the paths are listed below. If a PNG is missing, stop and say so in your report: do NOT render the exemplars yourself (several agents would write the same files at the same time). Open
   the ones nearest your subjects, light AND night, and read their source (listed below). **An image that did not load has not been looked at**: the Read tool can answer with an error or "[media removed: request limit]" instead of the picture; open it again, and if it still does not display say so (the written "what it shows" under each exemplar is the study fallback for the EXEMPLARS only, never for your own renders). For EACH of your keys write a study note: `MODEL: <exemplar> | TAKE: <3 crafts> | LAYERS / NIGHT / MOTION: <your plan> | NOT COPYING: <what>` (the layers, haze between planes, a reflection, a framing foreground, motion at three depths, what lights up at night). The notes go into your report. Study technique, never copy a drawing.
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
- **A scene that IS a night picture** (a moon, stars and lit windows are the subject) paints them as always-on shapes and adds the evening classes on top, because `stars()`, `lit()` and `us-lamps` are invisible in a light render: the tested pattern and its helpers are in `recipes.md` section 7. For a day or dusk scene the night render must still be a different picture, not a dim copy of the day (a low small sun or a moon, six hero windows, lamp rows, 24 or more stars).
- Seeds: unique per call, per scene and per file, above 1000, never consecutive (identical shapes count as copies against every other scene). Repeated objects (houses, palms, buttes, boats) differ in a parameter, not only in scale: an instanced `<g transform=scale>` repeats one `d` string (`recipes.md` section 4). Every scene has ONE dark tinted anchor value in the frame, water and ground are never hard-edged slabs, and crowns are never flat coins.
- Each scene must be at most {{scene_cap}} bytes rendered; plan the bytes per layer with the table in `recipes.md` section 1 (the pilot's first drafts were 34 to 42 KB). If you get near the cap, simplify repeated detail (windows, glints, instances), never the quality of the composition.

{{targets}}

## 6. Definition of done, for EACH scene (all seven, in this order)

1. STUDIED: the model exemplar for this scene is named, its PNG (light and night) was opened and loaded, and the study note exists.
2. DRAWN with the kit and its recipe, in your file, inside the IIFE, with its own subject and its own composition.
3. LINT: `lint --file` PASSES for the scene (last line `PASS: <n> items clean.`, no waiver, no threshold edit) AND meets the targets of section 5 (richness >= {{min_richness}}, at most {{max_thin}} thin spots,
   both printed for every scene). If not, improve the ART: add real layers, detail systems, depth and motion; never pad it with filler shapes, never stuff keywords or invisible
   elements, never copy an existing scene or icon and recolour or nudge it (the lint measures shared shapes and detects all three). Never edit `tools/anim-quality.json`, never add
   a waiver, and never decide that a failing rule is wrong: only the orchestrator decides about waivers. **Attempts:** you have {{max_redraws}} per scene. An attempt is a whole drawing of the scene from a fresh start: the first draft is attempt 1, and EVERY redraw from scratch counts, whatever made you redraw it: a failed lint, a failed rubric line, or a failed LOOK (the picture reads as the wrong thing, the night render is a dim copy). Polish edits to a scene that already passed the lint and a clean look (a colour, a trim, a detail, a defect you wrote in LOOKED) do not count; a polish pass that needs a different composition is a redraw.
   **After {{max_redraws}} attempts a scene that still fails the lint or the rubric pass mark is NOT DONE:** save its code to `.anim-ref/drafts/<key with ":" as "_">.js` (git-ignored; write the file with your editor tool),
   REMOVE it from your file (or comment it out) so that your file lints clean, and list it under NOT DONE with the failing rule and the draft path. A scene that passes both but still misses a redraw target stays in the file
   and is listed under TARGET MISSES with its numbers: the independent reviewer decides. You never ship a failing scene, and your report's LINT line must say PASS.
4. LOOK: `sheet --file ... --mode light` AND `--mode night` rendered and BOTH PNGs opened with the Read tool, then the phone and square crops, then the contact sheet as a thumbnail (about 320 px a tile: name the subject in one word, count the focal points, name the three values). Add `--still` (animations off) for the rest frame: the default render is paused at 6.5 s and a rising `sun(..., true)` takes 9 s; `--key <key>` renders one scene of your file. Put the render next to the
   nearest exemplar's PNG and compare: the same depth layers, the same finish, the same life. A PNG that did not load has NOT been looked at: open it again before you write about it, and list the PNGs that loaded in the report. Looking is proved in the report: for every render you opened, write ONE concrete thing you saw in it and ONE defect
   you found in it (and what you did about it); "none" is not accepted, an honest render always shows something to improve. A render you did not open is not looked at.
5. SELF-CHECK on the rubric: pass mark {{pass_mark}} Below it, or any instant reject: redo it (an attempt), then lint, look and check again. Say for each of the six recurring weaknesses of rubric section 9 whether you saw it in your own render (a night render that is a dim copy of the day, coin foliage, cloned shapes, no dark anchor, a hard-edged water slab).
6. CARE: checked against section 3, the general rules AND the region's own notes, whichever is stricter (no text, flags or ensign-like rays, maps, political symbols, identifiable people, holy figures).
7. REPORTED: it appears in your final report (section 8) with its study note, its bytes, its richness, its thin spots and its self-check.

## 7. Do NOT

- No padding: no shapes added to pass a count, no invisible or off-screen filler, no repeated clones to raise the element number.
- No copy-paste of an existing scene with new colours or a few moved shapes; no cloning one scene of your batch into another.
- No text or letter-like marks. No flags, maps or borders. No political or military symbols. No portraits, faces, crowds or identifiable people (a tiny faceless silhouette as a scale cue is allowed, unless the region's own notes forbid it). No holy figures. No sunburst in red and white.
- Never raise or add a threshold, a waiver or a rule; never edit a test or a tool to make a check pass; never run a command that rewrites a file you do not own.
- No claim you cannot back: do not say you looked at a render you did not open or that did not load, or that a command passed if you did not run it.
- When time is short, do FEWER scenes, each finished to this standard, and list the keys you did not do. Never ship a failing gate.

## 8. Commands (run them from the repository root) and the report

{{verify}}

Every command loads the whole registry, other agents' files included. If a load fails, the error names the file and the line. If the file is not yours, that agent is still
editing: wait a minute and run it again, and never touch their file; if it is yours, fix it. Before you report, run `{{guard}}` yourself and paste its output under GIT (what to expect: the report block below). The orchestrator itself runs `node --test tests/anim-packs.test.mjs` (the reduced-variant, theme and size gates of the whole
registry) and the same guard over the files of every agent that ran.

Final report: reply with exactly this block, every field filled in:

```
FILE: {{file}}   scenes drawn and passing: <n of {{todo_count}}>   bytes of the file: <size>
LINT: <the last line of `lint --file`, verbatim: "PASS: <n> items clean." with no waivers>
GIT: <the output of `git status --short`, verbatim: only your file may be listed (a shared tree also shows other agents' files: name them as theirs)>, then <the output of `{{guard}}`, verbatim: `guard: OK` when you work alone or in your own worktree; in a shared tree it fails only on the files of the agents working at the same time, which you name>
STUDY: <key> | MODEL: <exemplar> | TAKE: <3 crafts> | LAYERS / NIGHT / MOTION: <your plan> | NOT COPYING: <what>   (one line per scene, written before you drew it)
PER SCENE: <key> | rendered bytes | richness index | thin spots (n) | model exemplar | self-check R1-R20 as a P/F string = n/20 | instant rejects: none | weaknesses seen (rubric section 9): none or W1 to W5 | suggested time/season/type/palette: kept, or changed (reason)
LOOKED: <per scene and render: png path | one concrete thing seen | one defect found (and the fix)>   for light, night, the phone and square crops, plus once the contact sheet and the exemplar PNGs you held it against
PNGS LOADED: <every PNG that actually displayed, and any that failed to load: re-opened (say so) or never displayed (then the lines it carries are FAIL: not looked at)>
WEAKEST THREE: <per scene: its three weakest points and how you checked each in the render or the code>
TARGET MISSES: <key | the numbers>   (or "none")
NOT DONE: <key | failing rule or rubric lines | attempts used (n of {{max_redraws}}) | path of the saved draft>   (or "none")
OTHER FILES I THINK ARE WRONG: <or "none">
```
