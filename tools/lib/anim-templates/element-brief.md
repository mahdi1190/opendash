# Brief: draw {{count}} small elements for the {{region_name}} region (batch {{batch}} of {{batches}})

You are one of several agents drawing the small animated symbols (64 x 64 inline SVG, shown tiny and large) of the **{{region_name}}** region
(`{{region_id}}`) of OpenDash, a local dashboard. Your batch: {{batch_groups}}. This brief is your whole task. Read all of it before you draw
anything. Sections 4 to 8 are the quality contract and are not negotiable: your elements must look like part of the same body of work as the existing
United States and Asia ones, drawn by one hand, and an element that merely passes the lint is NOT done. Fewer elements at this standard beat a full batch
of weak ones.

{{notes}}

## 1. Your files, and the files you must not touch

You own exactly the pack file(s) listed here, one per group (each already exists as a scaffold with the `B.scenes()` line):

{{files}}

Keep the scaffold's structure: the `const B = ...builder('<group>')` line, the `B.scenes()` line (other agents draw this group's full-screen scenes into
scene files; `B.scenes()` is what turns them into openings: never delete it) and the closing `animRegisterPack(B.pack({...}))` call. You add your `B.element(...)`
and `B.place(...)` calls between them. Touch nothing else:

- not `tools/` (the lint thresholds `tools/anim-quality.json` and the waiver list in it included), not `tests/`, not `docs/`;
- not the region config `{{region_file}}` and not any scene file `src/app/71-anim-region-{{region_id}}-scenes-*.js`;
- not another agent's pack file.

If you think another file is wrong (a table row, a missing pack file), say so in your report and carry on. Do not commit, push or `git add`: leave your files
uncommitted, the orchestrator integrates. The git remote is PUBLIC: no personal names, paths or emails anywhere, not even in comments.

## 2. The region and your keys

{{region_name}} (`{{region_id}}`): {{groups_summary}}. An element is the small animated symbol the dashboard shows beside things (a card, a chip, the day's
symbol) while the user is in that {{unit_word}} or near that small place. It is drawn on a 64 x 64 canvas, must read at 28 px, and loops quietly.

- `B.element('<CODE>', {...})` is the {{unit_word}}'s symbol: ONE distinctive motif the people of that {{unit_word}} would recognise with pride (an animal, a plant, a
  food, a craft, an instrument, a building detail): a motif, not a landmark scene, and never a flag or a map.
- `B.place('<id>', {...})` is a small place's symbol: that town's or famous place's own motif.

Draw exactly one element for each call below ({{todo_count}} to draw), with the exact codes and ids listed:

{{keys}}
{{done_note}}
The builder fills in the id prefix, the label suffix (", <name>"), the tags, the slot, the priority, the `region` and the `when` rule, so you write
`B.element('JP', { id: 'sushi', label: 'Sushi', colour: 'orange', mood: 'cheerful', tags: ['food'], svg: () => '...' })` (the item id becomes `jp-sushi`; item
ids are unique per pack, a duplicate throws). `colour` is a swatch (blue indigo violet pink red orange amber green teal slate); `mood` is one of calm
cheerful proud cosy focused dreamy energetic neutral; `season` is `'any'` or an array of spring summer autumn winter.
Keep every motif different: vary food, animal, plant, craft, building and instrument, and the colour, across your batch. Five foods in a row are rejected.

Motifs already drawn in this region (do not repeat them):

{{existing}}

## 3. Care rules (cultural and representation)

{{care}}

## 4. Study first (mandatory, before you draw anything)

1. Read `.claude/skills/animation-pack/SKILL.md` and then its references, all of them: `references/small-icons.md` (the 64 x 64 craft), `references/style-guide.md`
   (the visual and motion language), `references/rubric.md` (the 20-point rubric and the instant rejects you will score yourself against),
   `references/kit-reference.md` (the motion classes) and `references/recipes.md`. Follow what SKILL.md says.
2. Render the gold standard and LOOK at it with the Read tool: `node tools/anim-pack.mjs reference --render` writes PNGs to `.anim-ref/`. Open the small-item
   exemplars below (and the full scenes, for their palette) and read their source. For EACH key write down which exemplar is its model and what craft you take
   from it. Study technique, never copy a drawing.
3. Read the pack files of the existing regions (`src/app/72-anim-pack-asia-east.js`, `src/app/72-anim-pack-us-pacific.js`) to see how a finished pack file is built.

The gold-standard small items (and scenes; `node tools/anim-pack.mjs reference` prints why each one is good):

{{exemplars}}

Accepted items that are flat, blobby or crude. Do better than these, never imitate them:

{{weaker}}

## 5. Draw

```js
B.element('XX', { id: 'motif', label: 'What it is', colour: 'amber', mood: 'cheerful', tags: ['food'],
  svg: () => '<path class="m" d="..."/>' + '<g class="x-bob"><path class="c lk" d="..."/></g>' });
```

- `svg()` returns the INSIDE of a 64 x 64 SVG (the registry wraps it). Constants only: no user text. Draw with the theme classes ONLY: fills `k c s w m`,
  strokes `lk lc lm lw` (`t` thick, `dash`), never a hex colour, so dark mode and every animation theme work.
- One dominant mass that reads at 28 px, two or three supporting details, a ground or wave line and one sparkle at most. 1 to 3 staggered `x-*` motions
  (`--d` steps of 0.3 to 0.6 s), transform and opacity only, nothing in sync. Nested groups for compound motion (a body that bobs around a head that nods).
- Each element must be at most {{item_cap}} bytes rendered; most accepted ones are under a kilobyte. Do not pad to reach a number.

## 6. Definition of done, for EACH element (all seven, in this order)

1. STUDIED: the model exemplar for this element is named and you have looked at its PNG.
2. DRAWN with theme classes and the recipe from `small-icons.md`, in your pack file, with its own motif and its own composition.
3. LINT: `lint --file` PASSES for the element with NO waiver and NO threshold edit. If it fails, improve the ART: never pad it with filler shapes, never stuff
   keywords, never copy an existing icon and recolour it (the lint detects all three). Never edit `tools/anim-quality.json`, never add a waiver. If the lint
   fails but you believe the art is right, do not hack around it: report the item and the failing rule and leave it as it is. Read the "thin spots" the lint
   prints and aim for the median of the accepted items, not their floor.
4. LOOK: `sheet --file ... --mode light` AND `--mode dark` rendered, the PNGs opened and looked at, and the contact sheet judged as a thumbnail: it must still
   read at 28 px. Put the render next to the nearest exemplar: the same weight, the same motion, the same finish. If your element is below its exemplar,
   say so plainly and redraw it.
5. SCORED: score it in writing on the 20-point rubric in `rubric.md`, one line per element, with no instant reject. Below the pass mark in `rubric.md`, or any
   instant reject, means redo it, then lint, look and score again.
6. CARE: checked against section 3 (no text, flags, maps, political symbols, people, holy figures).
7. REPORTED: it appears in your final report (section 8) with its bytes, its lint result and its score.

## 7. Do NOT

- No padding: no shapes added to pass a count, no invisible filler, no repeated clones.
- No copy-paste of an existing icon with new colours or a few moved shapes; no cloning one element of your batch into another.
- No text or letter-like marks. No flags, maps or borders. No political or military symbols. No people. No holy figures.
- Never raise or add a threshold, a waiver or a rule; never edit a test or a tool to make a check pass.
- No claim you cannot back: do not say you looked at a render you did not open, or that a command passed if you did not run it.
- When time is short, do FEWER elements, each finished to this standard, and list the keys you did not do. Never ship a failing gate.

## 8. Commands (run them from the repository root)

{{verify}}

The `--only small` of `lint` and `sheet` keeps your pack file's elements and leaves out the full-screen scenes the scene agents are drawing into the same pack: those are not yours.
Every command loads the whole registry, other agents' files included. If a load fails because of a file that is not yours (the error names it), that agent is still
editing: wait a minute and run it again, and never touch their file.

Final report (reply with exactly this, nothing implied):

```
FILES: <the pack files>   elements: <n of {{count}}>
LINT: <the last line of each `lint --file` verbatim: it must read "PASS: <n> items clean." with no waivers>
PER ELEMENT: <call and id> | <rendered bytes> | model exemplar | rubric score /20 (I1-I20 as a P/F string) | instant rejects: none | vs exemplar: better, equal or below | thin spots left
LOOKED: <the PNG paths you opened: light, dark, the contact sheet and the exemplar PNGs>
WEAKEST: <the element you consider weakest>, why, and what you would improve with more time
NOT DONE: <elements not drawn or not passing, with the reason>   (or "none")
OTHER FILES I THINK ARE WRONG: <or "none">
```
