# Brief: draw {{todo_count}} small element{{todo_s}} for the {{region_name}} region (batch {{batch}} of {{batches}})

You are one of several agents drawing the small animated symbols (64 x 64 inline SVG, shown tiny and large) of the **{{region_name}}** region
(`{{region_id}}`) of OpenDash, a local dashboard. Your batch: {{batch_groups}}. This brief is your whole task. Read all of it before you draw
anything. Sections 3 to 8 are the quality contract and are not negotiable: your elements must look like part of the same body of work as the existing
United States and Asia ones, drawn by one hand, and an element that merely passes the lint is NOT done. Fewer elements at this standard beat a full batch
of weak ones. If you notice that you are rushing (a thinner drawing than the last one, a skipped look, "good enough"), stop: finish the element you are on,
and report the rest under NOT DONE.

{{notes}}

## 1. Your files, and the files you must not touch

You own exactly the pack file(s) listed here, one per group (the scaffold made them with the `B.scenes()` line; one for a group added later may not exist yet, and the list says so: create it like the others). The orchestrator COMMITTED the scaffold before you started, so everything you change shows in `git status` and `guard`:

{{files}}

Keep the structure: the `const B = ...builder('<group>')` line, the `B.scenes()` line (other agents draw this group's full-screen scenes into
scene files; `B.scenes()` is what turns them into openings: never delete it) and the closing `animRegisterPack(B.pack({...}))` call. You add your `B.element(...)`
and `B.place(...)` calls between them. Touch nothing else:

- not `tools/` (the lint thresholds `tools/anim-quality.json` and the waiver list in it included), not `tests/`, not `docs/`;
- not the region config `{{region_file}}` and not any scene file `src/app/71-anim-region-{{region_id}}-scenes-*.js`;
- not another agent's pack file.

If you think another file is wrong (a table row, a missing pack file), say so in your report and carry on. Do not commit, push or `git add`: leave your files
uncommitted, the orchestrator integrates. After you report, the orchestrator runs `{{guard}}`: any other changed file, and any change to a threshold,
a waiver, a test or the gold-standard list, rejects your whole batch. The git remote is PUBLIC: no personal names, paths or emails anywhere, not even in comments.

## 2. The region and your keys

{{region_name}} (`{{region_id}}`): {{groups_summary}}. An element is the small animated symbol the dashboard shows beside things (a card, a chip, the day's
symbol) while the user is in that {{unit_word}} or near that small place. It is drawn on a 64 x 64 canvas, must read at 28 px, and loops quietly.

- `B.element('<CODE>', {...})` is the {{unit_word}}'s symbol: ONE distinctive motif the people of that {{unit_word}} would recognise with pride (an animal, a plant, a
  food, a craft, an instrument, a building detail): a motif, not a landmark scene, and never a flag or a map.
- `B.place('<id>', {...})` is a small place's symbol: that town's or famous place's own motif.

Draw exactly one element for each call below ({{todo_count}} to draw of the {{count}} listed), with the exact codes and ids listed. Do not draw one that is not in the table:

{{keys}}
{{done_note}}
The last two columns are SUGGESTIONS from a fixed rotation over the whole region, so that the agents of the other groups (who cannot see your work) draw different kinds of motif in different colours. The rotation knows nothing about section 3: **when a suggested motif kind collides with the care text** (a "craft" or an "instrument" the notes forbid, an animal that is an emblem) **or with the place** (it has no famous instrument, the colour does not fit), the care text and the place win: change it, give the reason in one line in your report (so that the orchestrator can put it once into the region doc's "Scene suggestions"). Safe motif kinds when the care notes are strict: a food or drink in a plain vessel, a plant or crop, a real animal in its habitat that is not an emblem or a mascot, a tool of daily work, a natural feature; never a carving, mask, pattern, dress or ceremonial object of a people. Inside your batch the old rule still holds: five foods in a row are rejected.

The builder fills in the id prefix, the label suffix (", <name>"), the tags, the slot, the priority, the `region` and the `when` rule, so you write
`B.element('XX', { id: 'motif', label: 'A quiet motif', colour: 'amber', mood: 'cheerful', tags: ['craft'], svg: () => '...' })` (the item id becomes `xx-motif`; item
ids are unique per pack, a duplicate throws). `colour` is a swatch (blue indigo violet pink red orange amber green teal slate); `mood` is one of calm
cheerful proud cosy focused dreamy energetic neutral; `season` is `'any'` or an array of spring summer autumn winter.

Already drawn in this region when this brief was made. A snapshot only (other agents are drawing right now): it keeps you from repeating finished work, it does not coordinate the batches:

{{existing}}

## 3. Care rules (cultural and representation)

These are as binding as the quality contract. They override anything you see in older items. The general rules come first and the region's own notes (if any) after them: **the region's notes may only be STRICTER than the general rules, never looser** (the general rules ALLOW a tiny anonymous silhouette as a scale cue; a region note that bans every figure bans that silhouette too, a note that bans a motif bans it, and where two statements seem to differ you follow the stricter one).

{{care}}

## 4. Study first (mandatory, before you draw anything)

1. Read `{{skill}}`, then exactly these three references, with their full paths, and nothing else: `{{refs}}/small-icons.md` (all of it: the 64 x 64 craft, what `s` and `w` really are, the one size table, one idea per tile, the 28 px test), `{{refs}}/style-guide.md` (sections 1 and 10 only: the house style and the motion language),
   `{{refs}}/rubric.md` (part B: sections 1, 2 and 5 to 7, the 20 lines, the instant rejects, the six recurring weaknesses of section 9 and the pass mark you will check yourself against). **You do NOT need `{{refs}}/recipes.md` or `{{refs}}/kit-reference.md`**: they are the full-screen scene craft (the `x-us*` classes and the scene helpers are not the icon classes; the motion classes of a small item are in section 3 of `small-icons.md`), and `workflow.md` is the orchestrator's. Follow what SKILL.md says.
2. LOOK at the gold standard with the Read tool. The orchestrator rendered it ONCE (light, night and dark) into `.anim-ref/` before you started: you OPEN those PNGs, you do not render them; the paths are listed below. If a PNG is missing, stop and say so in your report: do NOT render the exemplars yourself (several agents would write the same files at the same time). Open the small-item exemplars (light and dark) and read their
   source. **An image that did not load has not been looked at**: the Read tool can answer with an error or "[media removed: request limit]" instead of the picture; open it again, and if it still does not display say so (the written "what it shows" under each exemplar is the study fallback for the EXEMPLARS only, never for your own renders). For EACH key write a study note: `MODEL: <exemplar> | TAKE: <craft> | NOT COPYING: <what>`. The notes go into your report. Study technique, never copy a drawing.
   The full scenes listed after the icons are only for the idea of a finished picture: an icon draws with theme classes and never takes their colours, so look at them last, or not at all.
3. Read the pack files of the existing regions (`src/app/72-anim-pack-asia-east.js`, `src/app/72-anim-pack-us-pacific.js`) to see how a finished pack file is built.

The gold-standard small items (and scenes; `node tools/anim-pack.mjs reference` prints why each one is good). They are the best of the corpus: use them for technique; the pass line is the median, in section 5:

{{exemplars}}

Accepted small items that are flat, blobby or crude. Do better than these, never imitate them:

{{weaker}}

## 5. Draw

```js
B.element('XX', { id: 'motif', label: 'A quiet motif', colour: 'amber', mood: 'cheerful', tags: ['craft'],
  svg: () => '<path class="m" d="..."/>' + '<g class="x-bob"><path class="c lk" d="..."/></g>' });
```

- `svg()` returns the INSIDE of a 64 x 64 SVG (the registry wraps it). Constants only: no user text. Draw with the theme classes ONLY: fills `k c s w m`,
  strokes `lk lc lm lw` (`t` thick, `dash`), never a hex colour, so dark mode and every animation theme work. {{markup_rules}}
- One dominant mass that reads at 28 px, supporting details, a ground or wave line and one sparkle at most. Several independently staggered `x-*` groups (`--d` steps of 0.3 to 0.6 s), transform and
  opacity only, nothing in sync; the table below says how many accepted icons have and how many the exemplars have. Nested groups for compound motion (a body that bobs around a head that nods).
- **One idea per tile**: say the picture in one noun phrase (no two "and"s), ONE dominant mass of at least 36 x 36 units in the swatch colour `c`, at most three supports (a ground line or wave band, a plate, one accent). A scene in a tile (a cloud, rain, a palm, a boat, hills and two wave bands) is the pilot's weakest class of icon.
- **What the classes really are**: `s` is the swatch at 24 % alpha over what is behind it, so overlapping `s` shapes darken and show through; `w` is the tile's surface, near-black in the dark theme, so a pale mass is `w lk` or `w t` (outlined), or `s` / `c` with an outline, and only small `w` features (eyes, highlights, beads) are plain; `opacity` as an attribute is allowed (a shadow, a highlight, a depth step); `x-blink` is off for half its cycle (no brief eye blink: give an eye a glint on `x-twinkle`); a wave band is `M-2 y q3-2 6 0` and `t6 0` 13 times (14 segments, 84 units wide). Water is a plate whose top edge is the wave, never a hard rectangle.
- **Size, one table** (`small-icons.md` section 4): aim at 1.0 to 1.9 KB rendered (`svg()` 780 to 1,700 B); the ceiling is 2.0 KB rendered / 1,800 B `svg()` (the corpus maximum): above it is bloat, and the lint cannot see it, so you report your bytes and the reviewer fails it. The hard cap is {{item_cap}} bytes rendered, far above any accepted icon; the numbers below are the median and the exemplars. Do not pad to reach one.

{{targets}}

## 6. Definition of done, for EACH element (all seven, in this order)

1. STUDIED: the model exemplar for this element is named, its PNG (light and dark) was opened and loaded, and the study note exists.
2. DRAWN with theme classes and the recipe from `small-icons.md`, in your pack file, with its own motif and its own composition.
3. LINT: `lint --file ... --only small` PASSES for the element (last line `PASS: <n> items clean.`, no waiver, no threshold edit) AND meets the targets of section 5 (richness >= {{min_richness}}, at most {{max_thin}} thin spots,
   both printed for every element). If not, improve the ART: more real forms and motion, never filler shapes, never keyword stuffing, never an existing icon copied and recoloured or nudged (the lint measures
   shared shapes against every other icon, `sharedShare` and `sharedShareAll`, and detects all of it). Never edit `tools/anim-quality.json`, never add a waiver, and never decide that a failing rule is wrong: only the
   orchestrator decides about waivers. **Attempts:** you have {{max_redraws}} per element. An attempt is a whole drawing of the element from a fresh start: the first draft is attempt 1, and EVERY redraw from scratch counts, whatever made you redraw it: a failed lint, a failed rubric line, or a failed LOOK (it reads as the wrong thing: a face, rabbit ears, dice; it is a scene in a tile; it is illegible at 28 px). Polish edits to an element that already passed the lint and a clean look (a colour, a trim, a detail, a defect you wrote in LOOKED) do not count; a polish pass that needs a different composition is a redraw. **After {{max_redraws}} attempts an element that still fails the lint or the rubric pass mark is NOT DONE:** save its code to
   `.anim-ref/drafts/<call and id, e.g. B.element_XX_motif>.js` (git-ignored; write the file with your editor tool), REMOVE it from your pack file (or comment it out) so that the file lints clean, and list it under NOT DONE
   with the failing rule and the draft path. An element that passes both but still misses a redraw target stays and is listed under TARGET MISSES with its numbers: the independent reviewer decides.
   You never ship a failing element, and your report's LINT line must say PASS.
4. LOOK: `sheet --file ... --only small --mode light` AND `--mode dark` rendered and BOTH PNGs opened with the Read tool. Add `--still` (animations off: the rest frame; the default render is paused at 6.5 s, so an `x-fall` leaf, a sparkle or an `x-drop` is caught mid-animation and looks like a defect) and `--sizes` (a strip of each item at 28, 40, 64 and 128 px at its real pixel size) with `--contact`: for example `node tools/anim-pack.mjs sheet --file <your pack file> --only small --mode dark --still --sizes --contact --out .anim-ref/<name>`. **The 28 px test is the `--sizes` strip**, not the contact-sheet tiles (about 200 px): name the subject in one word at 28 px, find the dominant mass, check the dark render has no black hole (a plain large `w`). Put the render next to the
   nearest exemplar: the same weight, the same motion, the same finish. A PNG that did not load has NOT been looked at: open it again before you write about it, and list the PNGs that loaded in the report. Looking is proved in the report: for every render you opened, write ONE concrete thing you saw in it and ONE defect you found in it (and what you
   did about it); "none" is not accepted. A render you did not open is not looked at.
5. SELF-CHECK on the rubric: pass mark {{pass_mark}} Below it, or any instant reject: redo it (an attempt), then lint, look and check again. Say whether you saw the weakness that applies to icons (rubric section 9, W6: a scene in a tile, grey on grey, a hard water rectangle, a pale mass that turns black in dark).
6. CARE: checked against section 3, the general rules AND the region's own notes, whichever is stricter (no text, flags, maps, political symbols, identifiable people, holy figures, no motif the notes forbid).
7. REPORTED: it appears in your final report (section 8) with its study note, its bytes (against the ceiling), its richness, its thin spots and its self-check.

## 7. Do NOT

- No padding: no shapes added to pass a count, no invisible filler, no repeated clones.
- No copy-paste of an existing icon with new colours or a few moved shapes; no cloning one element of your batch into another.
- No text or letter-like marks (no rows of three or more parallel short marks). No flags, maps or borders. No political or military symbols. No portraits, faces, crowds or identifiable people. No holy figures.
- Never raise or add a threshold, a waiver or a rule; never edit a test or a tool to make a check pass.
- No claim you cannot back: do not say you looked at a render you did not open or that did not load, or that a command passed if you did not run it.
- When time is short, do FEWER elements, each finished to this standard, and list the keys you did not do. Never ship a failing gate.

## 8. Commands (run them from the repository root) and the report

{{verify}}

The `--only small` of `lint` and `sheet` keeps your pack file's elements and leaves out the full-screen scenes the scene agents are drawing into the same pack: those are not yours.
Every command loads the whole registry, other agents' files included. If a load fails, the error names the file and the line. If the file is not yours, that agent is still
editing: wait a minute and run it again, and never touch their file; if it is yours, fix it. Before you report, run `{{guard}}` yourself and paste its output under GIT (what to expect: the report block below). The orchestrator itself runs `node --test tests/anim-packs.test.mjs` (the reduced-variant, theme and size gates of the whole
registry) and the same guard over the files of every agent that ran.

Final report: reply with exactly this block, every field filled in:

```
FILES: <the pack files>   elements drawn and passing: <n of {{todo_count}}>
LINT: <the last line of each `lint --file ... --only small`, verbatim: "PASS: <n> items clean." with no waivers>
GIT: <the output of `git status --short`, verbatim: only your pack file(s) may be listed (a shared tree also shows other agents' files: name them as theirs)>, then <the output of `{{guard}}`, verbatim: `guard: OK` when you work alone or in your own worktree; in a shared tree it fails only on the files of the agents working at the same time, which you name>
STUDY: <call and id> | MODEL: <exemplar> | TAKE: <craft> | NOT COPYING: <what>   (one line per element, written before you drew it)
PER ELEMENT: <call and id> | rendered bytes (ceiling 2.0 KB) | svg() bytes | richness index | thin spots (n) | model exemplar | self-check I1-I20 as a P/F string = n/20 | instant rejects: none | W6 seen: none or yes | suggested motif kind/colour: kept, or changed (reason)
LOOKED: <per element and render: png path | one concrete thing seen | one defect found (and the fix)>   for light and dark (`--still`), the `--sizes` strip (judged at 28 px), plus once the exemplar PNGs you held it against
PNGS LOADED: <every PNG that actually displayed, and any that failed to load: re-opened (say so) or never displayed (then the lines it carries are FAIL: not looked at)>
WEAKEST THREE: <per element: its three weakest points and how you checked each in the render or the code>
TARGET MISSES: <call and id | the numbers>   (or "none")
NOT DONE: <call and id | failing rule or rubric lines | attempts used (n of {{max_redraws}}) | path of the saved draft>   (or "none")
OTHER FILES I THINK ARE WRONG: <or "none">
```
