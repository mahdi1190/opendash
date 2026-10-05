# Brief: draw {{todo_count}} small element{{todo_s}} for the {{region_name}} region (batch {{batch}} of {{batches}})

You are one of several agents drawing the small animated symbols (64 x 64 inline SVG, shown tiny and large) of the **{{region_name}}** region
(`{{region_id}}`) of OpenDash, a local dashboard. Your batch: {{batch_groups}}. This brief is your whole task. Read all of it before you draw
anything. Sections 3 to 8 are the quality contract and are not negotiable: your elements must look like part of the same body of work as the existing
United States and Asia ones, drawn by one hand, and an element that merely passes the lint is NOT done. Fewer elements at this standard beat a full batch
of weak ones. If you notice that you are rushing (a thinner drawing than the last one, a skipped look, "good enough"), stop: finish the element you are on,
and report the rest under NOT DONE.

{{notes}}

## 1. Your files, and the files you must not touch

You own exactly the pack file(s) listed here, one per group (the scaffold made them with the `B.scenes()` line; one for a group added later may not exist yet, and the list says so: create it like the others):

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
The last two columns are SUGGESTIONS from a fixed rotation over the whole region, so that the agents of the other groups (who cannot see your work) draw different kinds of motif in different colours. Keep them,
or change one when the place demands it (it has no famous instrument, the colour does not fit) and give the reason in one line in your report. Inside your batch the old rule still holds: five foods in a row are rejected.

The builder fills in the id prefix, the label suffix (", <name>"), the tags, the slot, the priority, the `region` and the `when` rule, so you write
`B.element('XX', { id: 'motif', label: 'A quiet motif', colour: 'amber', mood: 'cheerful', tags: ['craft'], svg: () => '...' })` (the item id becomes `xx-motif`; item
ids are unique per pack, a duplicate throws). `colour` is a swatch (blue indigo violet pink red orange amber green teal slate); `mood` is one of calm
cheerful proud cosy focused dreamy energetic neutral; `season` is `'any'` or an array of spring summer autumn winter.

Already drawn in this region when this brief was made. A snapshot only (other agents are drawing right now): it keeps you from repeating finished work, it does not coordinate the batches:

{{existing}}

## 3. Care rules (cultural and representation)

These are as binding as the quality contract. They override anything you see in older items.

{{care}}

## 4. Study first (mandatory, before you draw anything)

1. Read `{{skill}}` and then its references, all of them, with their full paths: `{{refs}}/small-icons.md` (the 64 x 64 craft), `{{refs}}/style-guide.md`
   (the visual and motion language), `{{refs}}/rubric.md` (the 20 lines, the instant rejects and the pass mark you will check yourself against),
   `{{refs}}/kit-reference.md` (the motion classes) and `{{refs}}/recipes.md`. Follow what SKILL.md says.
2. LOOK at the gold standard with the Read tool. The orchestrator has already rendered it to `.anim-ref/`: the PNG paths are listed below. If a PNG is missing, stop and say so in your report:
   do NOT render the exemplars yourself (several agents would write the same files at the same time). Open the small-item exemplars (and the full scenes, for their palette) and read their
   source. For EACH key write down which exemplar is its model and what craft you take from it. Study technique, never copy a drawing.
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
- Each element must be at most {{item_cap}} bytes rendered (the hard cap, far above any accepted icon): aim at the numbers below. Do not pad to reach one.

{{targets}}

## 6. Definition of done, for EACH element (all seven, in this order)

1. STUDIED: the model exemplar for this element is named and you have looked at its PNG.
2. DRAWN with theme classes and the recipe from `small-icons.md`, in your pack file, with its own motif and its own composition.
3. LINT: `lint --file ... --only small` PASSES for the element (last line `PASS: <n> items clean.`, no waiver, no threshold edit) AND meets the targets of section 5 (richness >= {{min_richness}}, at most {{max_thin}} thin spots,
   both printed for every element). If not, improve the ART: more real forms and motion, never filler shapes, never keyword stuffing, never an existing icon copied and recoloured or nudged (the lint measures
   shared shapes against every other icon, `sharedShare` and `sharedShareAll`, and detects all of it). Never edit `tools/anim-quality.json`, never add a waiver, and never decide that a failing rule is wrong: only the
   orchestrator decides about waivers. A redraw is at most {{max_redraws}} attempts per element. **After {{max_redraws}} attempts an element that still fails the lint or the rubric pass mark is NOT DONE:** save its code to
   `.anim-ref/drafts/<call and id, e.g. B.element_XX_motif>.js` (git-ignored; write the file with your editor tool), REMOVE it from your pack file (or comment it out) so that the file lints clean, and list it under NOT DONE
   with the failing rule and the draft path. An element that passes both but still misses a redraw target stays and is listed under TARGET MISSES with its numbers: the independent reviewer decides.
   You never ship a failing element, and your report's LINT line must say PASS.
4. LOOK: `sheet --file ... --only small --mode light` AND `--mode dark` rendered and BOTH PNGs opened with the Read tool, and the contact sheet judged as a thumbnail: it must still read at 28 px. Put the render next to the
   nearest exemplar: the same weight, the same motion, the same finish. Looking is proved in the report: for every render you opened, write ONE concrete thing you saw in it and ONE defect you found in it (and what you
   did about it); "none" is not accepted. A render you did not open is not looked at.
5. SELF-CHECK on the rubric: pass mark {{pass_mark}} Below it, or any instant reject: redo it (an attempt), then lint, look and check again.
6. CARE: checked against section 3 (no text, flags, maps, political symbols, identifiable people, holy figures).
7. REPORTED: it appears in your final report (section 8) with its bytes, its richness, its thin spots and its self-check.

## 7. Do NOT

- No padding: no shapes added to pass a count, no invisible filler, no repeated clones.
- No copy-paste of an existing icon with new colours or a few moved shapes; no cloning one element of your batch into another.
- No text or letter-like marks. No flags, maps or borders. No political or military symbols. No portraits, faces, crowds or identifiable people. No holy figures.
- Never raise or add a threshold, a waiver or a rule; never edit a test or a tool to make a check pass.
- No claim you cannot back: do not say you looked at a render you did not open, or that a command passed if you did not run it.
- When time is short, do FEWER elements, each finished to this standard, and list the keys you did not do. Never ship a failing gate.

## 8. Commands (run them from the repository root) and the report

{{verify}}

The `--only small` of `lint` and `sheet` keeps your pack file's elements and leaves out the full-screen scenes the scene agents are drawing into the same pack: those are not yours.
Every command loads the whole registry, other agents' files included. If a load fails, the error names the file and the line. If the file is not yours, that agent is still
editing: wait a minute and run it again, and never touch their file; if it is yours, fix it. The orchestrator itself runs `node --test tests/anim-packs.test.mjs` (the reduced-variant, theme and size gates of the whole
registry) and `{{guard}}`.

Final report: reply with exactly this block, every field filled in:

```
FILES: <the pack files>   elements drawn and passing: <n of {{todo_count}}>
LINT: <the last line of each `lint --file ... --only small`, verbatim: "PASS: <n> items clean." with no waivers>
GIT: <the output of `git status --short`, verbatim: only your pack file(s) may be listed>
PER ELEMENT: <call and id> | rendered bytes | richness index | thin spots (n) | model exemplar | self-check I1-I20 as a P/F string = n/20 | instant rejects: none | suggested motif kind/colour: kept, or changed (reason)
LOOKED: <per element and render: png path | one concrete thing seen | one defect found (and the fix)>   for light and dark, plus once the contact sheet (judged at 28 px) and the exemplar PNGs you held it against
WEAKEST THREE: <per element: its three weakest points and how you checked each in the render or the code>
TARGET MISSES: <call and id | the numbers>   (or "none")
NOT DONE: <call and id | failing rule or rubric lines | attempts used (n of {{max_redraws}}) | path of the saved draft>   (or "none")
OTHER FILES I THINK ARE WRONG: <or "none">
```
