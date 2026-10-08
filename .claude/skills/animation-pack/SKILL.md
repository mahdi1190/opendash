---
name: animation-pack
description: Make, extend and review OpenDash animation packs, regions and pieces - full-screen 1600x900 scenes (openings, signatures, "Welcome to <place>"), small 64x64 symbols and elements, place icons - at the exact style and quality of the existing US and Asia work. Use whenever someone adds, draws, redraws, extends or reviews animations for a place, country, state, city or region ("make animations for <place>", "add a Europe pack", "draw a scene for <city>", "an icon for <town>"), touches src/app/71-anim-*.js, 72-anim-pack-*.js or tools/anim-pack.mjs, or scores animation art; also composing scenes from the object library at THE NEW STANDARD (object, scene new / upgrade / lint / sheet / perf, archetypes, data tables). Enforces hard gates - study the gold standard, draw with the kit, lint pass with no waiver, look at light and night renders, score the rubric, independent review - so nothing below the corpus median ships.
---

# Animation packs (OpenDash)

OpenDash plays a full-screen animated scene when the user opens the day and is somewhere (the US, Asia, ...), and shows small animated symbols beside things. There are 397 scenes and 575 small items; the strict hand-drawn set
(229 scenes, 245 symbols) is ONE consistent body of work: flat-vector painting built back to front in ten layers, one daylight palette graded for evening by the page, motion in the kit's classes at three depths. New work must be
indistinguishable in craft from it. The tools (`node tools/anim-pack.mjs`) and the gates below are what keep it so.

**The bar is the median of the existing corpus, not its minimum.** The lint is calibrated at the minimum, so a piece can pass it and still be below the existing work. A skeleton built from the recipe numbers passes almost every lint rule and is a flat dusk with no subject.
"Good enough" is a FAIL. The targets are measurable: lint richness >= 0.90 (1.0 = the median accepted piece) and at most 4 thin spots, both printed for every piece by `lint`; the exemplars are the BEST ten, used for technique. When a craft system the exemplar shows is missing from your piece, say so plainly and redraw it (at most 3 attempts, counted as "Attempts" below says).

## Quick checklist (ten boxes; every box is a gate, none is optional)

Per piece (a scene or a small item): **seven steps, the same seven in the same order as the agent briefs' "Definition of done"** (the care rules are READ before step 1, in section 3 of the brief, and CHECKED at step 6):

- [ ] **1 STUDY** (before drawing anything). The gold standard is rendered ONCE by the orchestrator (`reference --render`: light, night and dark in one run) into `.anim-ref/`; **you OPEN the PNGs, you do not render them** (several agents would write the same files; the brief warns when one is missing; working alone, run it yourself). Open the exemplars nearest your subject with the Read tool (scene: at least 3, the model in light AND night; item: at least 2 icons, light AND dark) and read the model's source. Read exactly what "What to read" below lists for your kind of piece, no more.
  Write the study note (form in Gate 1): `MODEL: <ref>`, the 3 crafts you take from it, your plan for the ten layers, what lights up at night, the motion at three depths, and what you will NOT copy. It goes into the report.
- [ ] **2 DRAW** with the kit (`animSceneKit()`, `kit-reference.md`) and the recipe of the scene type (`recipes.md`); small items with theme classes only (`small-icons.md`). Your own geometry, seeds and palette: never paste numbers, never copy and recolour.
- [ ] **3 LINT**: `node tools/anim-pack.mjs lint --file <your file>` ends with exactly `PASS: <n> items clean.`, no "documented waivers", no threshold edited, no test edited, and meets the targets (richness >= 0.90, at most 4 thin spots: it prints both and the thin spots of every piece). If it fails, improve the ART (never pad, stuff or copy), at most 3 attempts; then REMOVE the piece from the file, save its draft under `.anim-ref/drafts/` and report it as NOT DONE with the failing rule. Only the orchestrator decides about waivers.
- [ ] **4 LOOK**: render `sheet --file <file> --mode light --contact` AND `--mode night`, and for scenes `--crop phone` and `--crop square` (items: `--only small --still --sizes`, `--mode light` and `--mode dark`); **open every PNG and the contact sheet** and compare with the exemplar's PNG: layers, finish and life. Looking is evidenced: per render ONE concrete thing you saw and ONE defect you found ("none" is not accepted).
  **An image that did not load has NOT been looked at.** The Read tool can fail with an error or "[media removed: request limit]": open that PNG again before you write a word about it, and before you score any line it carries; the report lists the PNGs that actually loaded; never claim a look you did not make. If an image will not load after retries, say so: the lines it carries are FAIL ("not looked at"), not guessed.
- [ ] **5 SELF-CHECK** in writing on `rubric.md`: all 20 lines P/F with a reason per F, instant rejects (none), the six recurring weaknesses (rubric section 9) seen or not, the craft verdict against the exemplar `better | equal | below` (`below` = a craft system the exemplar shows is missing). Pass: >= 18/20, every CORE line, zero instant rejects, verdict not `below`. Otherwise redo from step 2. Your score is a self-check, never an approval.
- [ ] **6 CARE**: no text or letter-like marks, flags, maps or borders, political or military symbols, portraits, faces, crowds or identifiable people (a tiny anonymous faceless silhouette as a scale cue is allowed, unless the region's own care notes forbid it: a region may only be STRICTER), holy figures. Sacred architecture only as respectful architecture; rays that are not an ensign. These rules override what older scenes show (a few carry flags). No personal data anywhere (the repo is PUBLIC).
- [ ] **7 REPORT** honestly in the fixed form (last section): bytes, the lint's last line verbatim (it must be a PASS), `git status --short` AND the `guard --owned <your file>` output, the study note per piece, per render the PNG you opened with its observation and defect, the PNGs that loaded, the three weakest points per piece, the self-check, what is not done (with the draft path).

Per batch or region, additionally:

- [ ] **8 INDEPENDENT REVIEW**: a fresh-context, blind reviewer scores each piece against the exemplars (`workflow.md` section 10). The author never approves a batch. A piece passes only if EVERY reviewer passes it.
- [ ] **9 The orchestrator's gates**: re-runs the lint itself, runs `node --test tests/anim-packs.test.mjs`, and PROVES with `node tools/anim-pack.mjs guard --owned <the batch's files>` that only those files changed and no tool, test, threshold, waiver or gold-standard file was touched (exit 2 otherwise: reject the batch). Before fanning out it COMMITS the scaffold (the config, the doc, the generated test, the pack files and the scene stubs: `brief --out` prints the command) and renders the gold standard ONCE.
- [ ] **10 Integrate**: `node tools/anim-pack.mjs status <id> --declare-complete` (it refuses while anything is missing, overlapping or failing), then `status <id> --strict` exits 0 (it also fails while the flag is still `complete: false`), `npm test` green, `node build.mjs --syntax`, `node tools/privacy-scan.mjs` clean.

If time is short: do FEWER pieces, each through every gate. Never ship a failing gate. Never claim a render you did not open or a command you did not run.

**Attempts.** You have 3 attempts per piece. An ATTEMPT is a whole drawing of the piece from a fresh start: the first draft is attempt 1, and EVERY redraw from scratch counts as the next (a new composition, or a rewrite of most of the piece), whatever made you redraw: a failed lint, a failed rubric line or a failed LOOK (it read as a face, as dice, as rabbit ears; the night render was a dim copy) all count. Polish edits to a piece that already passed the lint and a clean look (nudging a colour, trimming bytes, adding a detail, fixing a defect you wrote in LOOKED) do not count; a polish pass that needs a different composition IS a redraw. After 3, the piece is NOT DONE.

## What to read, and when (progressive disclosure)

Read this file fully. Then exactly this, by job (the brief for each job lists the same files with their full paths):

| Job | Read | Do NOT read | Why |
| --- | --- | --- | --- |
| Draw a SCENE | `references/style-guide.md` (sections 1 to 10), `references/recipes.md` (the recipe of your type, then sections 4 to 8: scale ladders, clipPath, seeds, the tested helpers, the night-for-light pattern, the night and motion checklist), `references/kit-reference.md`, `references/rubric.md` part A | `small-icons.md` (icons), `workflow.md` (the orchestrator's) | the visual and motion language with numbers; the build order, the byte budget and the helpers; every kit helper and class; the bar |
| Draw a small icon or an element | `references/small-icons.md` (all), `references/style-guide.md` sections 1 and 10, `references/rubric.md` part B | `recipes.md` and `kit-reference.md` (scene craft: the `x-us*` classes and scene helpers are not the icon classes), `workflow.md` | the 64 x 64 craft: the vocabulary, the one size table, the 28 px test |
| Review or score anything | `references/rubric.md` (all, including section 9), `references/style-guide.md` sections 12 to 14 (and 3 to 10 for scenes) | | the 20 lines, the 8 instant rejects, the six recurring weaknesses, how to score blind |
| Make a whole region, or fan work out to agents | `references/workflow.md` (all) | | scaffold, tables, briefs, agents, panel, fix loop, integration, validating a change to the skill |
| A lint rule fails | the "Failure handling" section below, `workflow.md` section 17, `tools/lib/anim-quality.mjs` `RULE_HINTS` | | what each rule wants |

Agent briefs are generated, not written: `node tools/anim-pack.mjs brief <region> --kind scene|element` fills `tools/lib/anim-templates/scene-brief.md` and `element-brief.md`; they cite this skill, so a drawing agent reads it.

## The gates in detail

### Gate 1 - STUDY (before any drawing)

1. `node tools/anim-pack.mjs reference` prints the gold-standard scenes and icons with the reason each is good and the "do better than these" list. The PNGs are `.anim-ref/<pack>__<item>-<mode>.png` (git-ignored), for example `.anim-ref/asia-southeast__th-signature-night.png`, written by `reference --render`
   (no `--mode`: every exemplar in light, night and dark in one run, which covers every PNG the briefs cite; one `--mode` renders only that mode for everything). The orchestrator runs it ONCE before the agents start. **Open the PNGs** (the Read tool shows them); text is not a substitute for looking. If a PNG is missing, stop and say so: do not render the exemplars yourself in a shared tree.
2. Choose the MODEL: the exemplar nearest your subject (`recipes.md` section 2 maps subject to recipe and model). Read its source: `file` and key are printed by `reference` and listed in the recipe. Every exemplar also has a written "what it shows" paragraph in the brief: it is the study fallback when a PNG will not display, never the substitute for looking at your OWN renders.
3. Write the study note in this form and do not start drawing before it exists:
   `MODEL: us-midwest/mi-mackinac-bridge | TAKE: computed cables and hangers; parallax pines framing; three traffic speeds | LAYERS: sky 4 stops + low sun right; far shore; water ramp; bridge; ship; pines both sides | NIGHT: deck lamps, tower aircraft lights, a lit ship | MOTION: sky drift + birds / glints, ship, car / pine sway, gulls + one wake | NOT COPYING: its geometry, seeds, palette`.
4. For a batch, one note per key, **in the report** (the `STUDY:` lines): the reviewer checks them, and a note that names no exemplar, or an exemplar whose PNG was not opened, fails the gate.

### Gate 2 - DRAW

- Scenes: one classic script, wrapped in an IIFE, using only `animSceneKit()` and `animRegionSceneAdd` at load time (`kit-reference.md` section 1). Build in the ten layers back to front (`recipes.md` section 1, with what each layer costs in bytes): sky, light, sky life, far plane, mid plane, water or ground, LANDMARK, subject life, near plane and framing, `finish()` LAST.
  The landmark has the highest detail budget: two or more detail systems and a lit-side facet, computed (loops, catenaries, scale ladders), not scribbled. Every plane boundary gets `haze()`; both sides are framed in the darkest tinted value; the bottom 20 % has structure. Safe zones: a portrait phone shows only the central 420 to 506 units of the 1600 and a square tile the central 900, so the part that identifies the subject sits inside x 590 to 1010 and the whole subject and its story inside x 350 to 1250 (`sheet --crop phone` / `--crop square` render them).
  The time of day is free (any of dawn, day, golden hour, dusk, night) as long as the scene reads in the LIGHT theme as drawn. A day or dusk scene gets its night look from separate `us-lit` / `us-lamps` / `us-star` elements (`lit()`, `dots(..., 'us-lamps')`, `stars()`) under the last `finish()`; **a scene that IS a night picture paints its moon, stars and lit windows as always-on shapes (the evening classes are invisible in the light theme) and adds the classes on top: the tested pattern is `recipes.md` section 7.** Motion only through the kit's `x-us*` classes and `mv()`, at three depths, every repeat with its own period and a NEGATIVE delay.
  Target the median (14 to 29 KB; hard cap 32,000; at 31,000 it is an instant reject; plan the bytes per layer with the table in `recipes.md` section 1). Markup: exactly the lint's vocabulary (path circle rect ellipse polygon line polyline g defs clipPath linearGradient radialGradient stop); text, image, script, style, a, SMIL, `use`, pattern, mask, symbol and filter are rejected.
  Seeds: unique per call, per scene and per file, above 1000, never consecutive (the lint counts identical shapes across the whole corpus as copies). Instancing one helper with `<g transform=scale>` repeats a `d` string: bake the scale in (`recipes.md` section 4).
- Small items: 64 x 64, theme classes only (`k c s w m`, `lk lc lm lw`, `t`, `dash`; zero hex; the `opacity` attribute is allowed), ONE idea and one dominant mass that reads at 28 px, a ground line or wave band, one sparkle, a median of 5 independently staggered moving groups in 3 kinds (the exemplars 7 to 14), about 12 shapes; **size: aim at 1.0 to 1.9 KB rendered (`svg()` 780 to 1,700 B), ceiling 2.0 KB / 1,800 B: the one table is `small-icons.md` section 4.** `s` is a 24 % tint (overlaps darken) and `w` is the surface (near-black in dark): a pale mass is `w lk`, never a plain large `w` (`small-icons.md` section 2).
- Draw your OWN picture: your composition, your seeds and your palette. The lint measures shared shapes against every other scene AND every other small item (`sharedShare`, `sharedShareAll`: an icon copied and recoloured or nudged shares all its shapes) and detects padding (hidden, off-canvas and tiny shapes) and clones (`distinctRatio`, `distinctForms`).

### Gate 3 - LINT (hard)

```
node tools/anim-pack.mjs lint --file src/app/71-anim-region-<id>-scenes-N.js            # scenes: every piece with its thin spots and redraw target (--rules: every rule; --quiet: failures only)
node tools/anim-pack.mjs lint --file src/app/71-anim-region-<id>-scenes-N.js --key place:<id>   # one scene of a file (--key: an item id, a ref or a region key; * is a wildcard)
node tools/anim-pack.mjs lint --file src/app/72-anim-pack-<id>-<group>.js --only small   # elements
node tools/anim-pack.mjs lint --ref us-midwest/mi-mackinac-bridge --rules                # an existing item, for comparison
```
- Exit 0 and a last line of exactly `PASS: <n> items clean.` is the only pass. A last line with "documented waivers" means a waiver applied: not allowed for new work. Exit 2 = FAIL. Exit 1 with nothing linted means the file registers nothing, registers a scene key that does not exist or that no pack item uses, or registers a key another file registers too: fix the file first.
- The legacy US and Asia scene files are `src/app/71-anim-us2-scenes-N.js` and `71-anim-asia2-scenes-N.js` (new regions: `71-anim-region-<id>-scenes-N.js`). `--file` on a legacy file also lints the OTHER scenes in it, and a few of them carry documented waivers:
  when you redraw one scene there, lint it alone with `--ref <pack>/<item> --rules` and make sure ITS line has no waiver.
- Never edit `tools/anim-quality.json` (thresholds or waivers), `tools/lib/anim-quality.mjs`, a test, or any tool to get green. Never add a waiver. The lint is a floor calibrated on 229 accepted scenes; the right reaction to a failure is a better drawing.
- Read the "thin spots" (printed for every selected piece; `--quiet` hides them): a pass thinner than the 10th percentile of the corpus; each prints what to do about it. Aim for the median of each metric (`style-guide.md` section 11); the target is richness >= 0.90 and at most 4 thin spots. Thin spots and the new advisories (`detailPerKB`, `sameDelay`) are advice, never a failure.
- What the lint cannot see: composition, taste, readability, the size ceiling of an icon, the night render. That is gate 4.

### Gate 4 - LOOK (hard)

```
node tools/anim-pack.mjs sheet --file <file> --mode light --out .anim-ref/<name> --contact     # then the same with --mode night, and --crop phone / --crop square
node tools/anim-pack.mjs sheet --file <file> --only small --mode light --still --sizes --contact --out .anim-ref/<name>   # items; then --mode dark
node tools/anim-pack.mjs sheet --file <file> --key place:<id> --mode light --still              # one piece while you iterate; --at <ms> pauses at another time
node tools/anim-pack.mjs reference --render                                                      # the exemplar PNGs, if not rendered yet (the orchestrator does it once before the agents start)
```
Open (Read tool) the full-size light PNG, the night PNG, the phone and square crops and `contact-light.png` (the thumbnail test: does the landmark read in one second?). Then the exemplar's PNG. For every PNG write ONE concrete thing you saw in it and ONE defect you found in it (and what you did); a render you did not open, or that did not load, is not looked at (checklist step 4). Ask, side by side: the same number of depth planes? haze at every boundary? a reflection where there is water?
framing on both sides and structure in the bottom fifth? does the night render come alive (a moon-like light, six hero windows, lamps, stars, the landmark still readable: not a dim copy of the day)? is the motion plan as rich (read the `mv()` calls: classes, `--ad`, `--d`, `--dx`)? is the palette one family with three small accents and ONE dark anchor?
A PNG cannot show motion: judge it from the lint's motion rows and the source. The default render is frozen at 6.5 s: a rising `sun(..., true)` takes 9 s, and an `x-fall` leaf or an `x-twinkle` sparkle is caught mid-animation, so judge "the still frame is a finished picture" on `--still` (animations off, what reduced motion shows).
**Judging a contact sheet:** a scene's tile (about 320 x 180) is the thumbnail test: name the subject in one word, count the focal points, name the three values; an item's tile (about 200 px) is composition only: **the 28 px test is the `--sizes` strip** (the item at 28, 40, 64 and 128 px at real size): name the subject in one word at 28 px and find its dominant mass, in light and in dark.
State the craft verdict `better | equal | below`: it compares the SYSTEMS the exemplar uses (the exemplars are the best ten, so a little less polish is not `below`); `below` = one of them is missing, redraw whatever the score.

### Gate 5 - SELF-CHECK

Check `rubric.md` in writing: the 20 lines as a 20-character P/F string with a reason per F, the instant rejects, the six recurring weaknesses of rubric section 9 (night render a dim copy, coin foliage, cloned shapes, no dark anchor, hard-edged water, scene-in-a-tile icons), the verdict. Pass: >= 18/20, every CORE line (scenes R1, R2, R9, R11, R16, R19, R20; items I1, I2, I6, I11, I15, I17), zero instant rejects, verdict not `below`.
Lines you did not check are F. An author's score is a self-check, never an approval: an independent reviewer scores it blind.

### Gate 6 - CARE and REPORT

Check section 3 of the brief (the general care rules and the region's own notes) against the finished render, then write the report (the last section). The region's notes may only be STRICTER than the general rules: where they ban every figure, the scale-cue silhouette is banned too, and nothing a region note says allows what a general rule forbids.
When the rotation's suggested motif, type or season collides with the care text (a "craft" the care notes forbid, a "bridge" a city does not have, an autumn in the tropics), the care text and the place win: change the suggestion, give the reason in one line, and ask the orchestrator to put it once into the doc's "Scene suggestions" so that no other agent spends a line on it.

### Gate 7 - INDEPENDENT REVIEW (batches, and any piece someone else will rely on)

`workflow.md` section 10: reviewers with a fresh context, blind (no author score or claim), who run the lint, open the PNGs (including the crops) and the exemplars, and score by the rubric; the pass rule is the MIN over reviewers. A single piece done without an agent available is reported as "self-scored only, not independently reviewed".
To check that a CHANGE to this skill or to a brief really improves the work, `workflow.md` section 18 is a pilot procedure with a blind comparison against the corpus and a pass rule.

### Gate 8 - INTEGRATE

`guard --owned <files>` exit 0 for every batch; `status <id> --declare-complete`, then `status <id> --strict` exit 0; `node --test tests/anim-packs.test.mjs tests/<id>-pack.test.mjs tests/region-framework.test.mjs tests/anim-quality.test.mjs`; `npm test`; `node build.mjs --syntax`; `node tools/privacy-scan.mjs` clean; look at the pack in Settings > Animations > gallery on a TEST copy (light and dark, Subtle and Playful, reduced motion; never port 4173 or live data).
Docs and the MODULES.md row: `workflow.md` section 14. Changes stay uncommitted unless the owner asks; never push.

## A region in one paragraph (the order; `workflow.md` has the detail)

`new <id> "<Name>"` scaffolds with `complete: false`, so the repo stays GREEN while the region is drawn: the generated test, the "every region" tests and the pack-registration test report their coverage checks as todo and keep the structural ones (sound tables, no overlap, no dead art, unique travel ids) hard. Fill the tables, then read `status <id>`: it lists overlaps with other regions (a row inside another region's reach: move or drop it), the travel cities of your countries that have no row (a trip there plays nothing) and the reach. Write `## Cultural care` (and, if the rotation does not fit a place, `## Scene suggestions`) BEFORE any brief. `reference --render` once, then `brief --out` (it creates the empty scene file of every batch, stores your `--note` texts in `plan.json`, warns about missing PNGs and about an uncommitted scaffold), then **COMMIT the scaffold and the stubs** (it prints the line) and run `brief --out` again so that `plan.json` carries the base commit for `guard`. The agents draw, `guard --owned <all their files>` proves the union, a blind panel reviews, then `status --declare-complete` (the coverage tests become hard), `status --strict` and `npm test`.

## Never

- Text or lettering of any kind (including pseudo-script and tile arrays that read as letters); flags, maps, borders, coats of arms; political or military symbols; portraits, faces, crowds or identifiable people (a tiny anonymous faceless silhouette as a scale cue is allowed, unless the region's care notes forbid it); holy figures, deities, prophets and religious statues; brands and logos; a sunburst in red and white that reads as an ensign.
- Personal data in any tracked file, comment or test: no names, paths, emails, money or task text. The git remote is public.
- Padding (invisible or off-canvas shapes, specks, repeated clones to raise a count), keyword stuffing, copying a scene and recolouring or nudging it, cloning one piece of your batch into another.
- A threshold, waiver, test, tool or foreign file edit to get green. Running a command that rewrites a file you do not own. Registering a stub, a skeleton or a failing piece.
- A night picture painted as a daylight picture under a dark wash (paint what the time of day looks like; the lights that switch on at night in a day or dusk scene are the evening classes), a night render that is a dim copy of the day (the same bright sun, nothing lit), a scene that does not read in the light theme, a sun and a moon together, a flat sky, an empty bottom third, coin crowns, bare box buildings, stamped or mirrored clones, hard-edged water slabs, hair-like foreground strokes, clone rows of animals, crude figures.
- `transform` on an element that has an `x-*` class; `U()` outside `svg()`; hex colours, gradients or inline paint in a small item; a `finish()` that is not last.
- Claiming something you did not do: a render not opened (or that did not load), a lint not run, a review not made, a score for a line you did not check. Report what is true.

## Failure handling

**The lint fails but the art looks right.** First do the honest check: open your PNG beside the exemplar's (gate 4) and ask whether the failing rule is telling the truth (a thin piece, a copied template, padding, a missing layer). Read the rule's hint (`lint` prints "how to fix"; `RULE_HINTS` in `tools/lib/anim-quality.mjs`).
Fix the ART, at most 3 attempts per piece (counted as "Attempts" above): add the missing layers, detail, depth and life, never filler. Rules that name copying (`sharedShare`, `sharedShareAll`, `distinctRatio`, `distinctForms`) want your own geometry and seeds (unique seeds, baked-in scale, a parameter per instance); rules that name padding (`hiddenShare`, `tinyShare`, `hiddenShapes`) want fewer fakes and more real shapes;
count rules (`shapes`, `paths`, `detailShapes`, `gradients`, `colours`, `movingGroups`, `motionKinds`) want a richer picture. If it still fails after 3 attempts, the piece is NOT DONE: do not hack, tune, pad or waive, and never decide that the rule is wrong. Save its code to `.anim-ref/drafts/<key with ":" as "_">.js` (git-ignored), REMOVE it from the file (or comment it out) so that the file lints clean, and report it under NOT DONE with the failing rule, the value against the threshold and the draft path; your report's LINT line must say PASS.
Only the orchestrator decides about waivers or about a rule being wrong. A lint failure you hid is worse than any weak picture. A piece that passes the lint but misses a redraw target (richness 0.90, 4 thin spots) after 3 attempts stays and is listed under TARGET MISSES with its numbers; the independent reviewer decides.

**A scene is near the 32 KB cap (target <= 29,000; 31,000 is an instant reject).** Trim by simplifying REPEATED elements, never the composition or the motion: window grids as one `dots()` path per row set (not a rect per window; the windows of a 1,000-unit city run cost 4 KB); `R()` on every computed coordinate; loops that append to ONE `d` string per fill colour;
shared gradients through `U()` ids; no duplicate near-identical paths (draw the far skyline once and fade it with `haze()`); fewer but longer strokes; fewer glints (112 B each) and flies (200 B each); drop the third decorative row of a far plane before you drop a framing silhouette. Re-lint and re-look after trimming: the trimmed picture must still pass gate 4.

**A small icon is over its size ceiling (2.0 KB rendered, `svg()` 1,800 B).** Trim in this order (`small-icons.md` section 4): the wave band to 14 segments, one decimal of precision, a second sparkle, details under 3 units; never the dominant mass or the motion.

**Time is short.** Do fewer, better. Finish pieces to every gate in order: whole groups before a thin layer across all of them. List every key not done and why. A region stays unfinished (`complete: false`: its coverage checks are todo, `status --strict` fails) until everything is drawn; that is the honest state, not a problem to patch, and the repo stays green meanwhile.

**You cannot render** (no browser). Gate 4 cannot be met: the piece cannot pass. Set `CHROME_PATH`, or report "not looked at" and do not integrate. The same holds for a PNG that will not load: it is not looked at.

**A piece scores below the bar.** Redo from the weakest line, not from scratch, unless the composition itself is wrong (R1, R2, R4, R9, R11). After 3 attempts (and, with a reviewer, 3 rounds), remove it, list it as NOT DONE with the failing lines and the draft path, and move on.

**Another agent's file breaks your load.** The error names the file and the line. Wait a minute and retry; never touch it. If it names YOUR file, fix it (a top-level `const` in a scene file means the IIFE is missing).

**You do not know what a place looks like.** Draw what you are sure of (the landscape, the skyline) rather than a guess; never a stereotype, never a cliche stacked with every symbol of the place; the right season, climate and architecture.

## Composed scenes, the object library and the new standard

**The new standard (docs/dev/SCENE_ENGINE.md section 15).** The rich Yateley and Fleet scenes are THE BAR (`node tools/anim-pack.mjs reference` prints it first). Every NEW scene is COMPOSED: library objects placed by scene data and drawn by the canvas renderer, judged by the `composed` lint profile (data, the bar, placement variety, care; perf with `--perf`) and GOLD when it passes. Hand-drawn scenes are the LEGACY tier: they keep their own floors and are maintained, not added. A scene looks bad next to the bar when it is flat (one or two depth layers), bare (no ground cover), still (a few movers), generic (no signature) or lit wrong; the bar rules measure exactly those.

**The workflow:** brief -> compose from the library (an archetype when one fits) -> add objects only if the subject needs one -> lint (quality + perf) -> sheet -> review.

1. Brief: `node tools/anim-pack.mjs brief <pack> --kind composed` (a new scene), `brief <region> --kind upgrade` (hand-drawn region scenes, batches of 7 by suggested archetype), `brief <archetype> --kind archetype`, `brief <kit> --kind object`.
2. Compose: `node tools/anim-pack.mjs object list --kit <kit>` shows what there is; `node tools/anim-pack.mjs scene new <pack> <id> --brief <file>` (or `--archetype <id> --row '<json>'`) writes a scene that compiles at once. Archetypes name ROLES, never object ids, so a new object reaches every scene of its kit.
3. Objects (only when needed): `node tools/anim-pack.mjs object new <cat>.<name> --kits <kit> --role <role>`, then `object lint` and `object sheet <id> --mode night` (variants x seasons x night). Draw it once, well: variants, four seasons, hooks, glow on windows; a landmark has at least 80 shapes, the real structure and a night look.
4. Lint: `node tools/anim-pack.mjs scene lint <ref> --perf` until it prints GOLD. Each failing rule says how far off it is and the fix.
5. Look: `node tools/anim-pack.mjs scene sheet <ref> --times --seasons --contact` (dawn, noon, golden hour, dusk and night from the real sun; the four seasons), `--crop phone`, and for an upgrade `--compare --upgrades` (old vs new at noon and night). The LOOK gate stays: hold every sheet next to the bar.
6. Batches (a London pack of hundreds of stations): `node tools/anim-pack.mjs scene lint --archetype station --table <table> --rows 200` prints one summary table; `scene perf --archetype ... --sample 3`, `scene sheet --archetype ... --sample 6 --contact`.

**Performance: static is free, motion is budgeted.** Thousands of static placements are baked into at most 6 layer bitmaps and cost nothing per frame. Only animated sprites and effects cost: at most 300 animated draws and 6 ms of dynamic drawing in an 8 ms frame (x 1.75 under headless software raster). A rich look is dense static detail plus a measured number of well-chosen movers; when a scene is over budget the fix is in the DATA (wind strips instead of per-plant sway, fewer flock birds and particles), never a lower frame rate.

**Upgrading a hand-drawn region scene:** `node tools/anim-pack.mjs scene upgrade <ref>` lists the old art's largest shape clusters; `--box x0,y0,x1,y1` extracts the landmark into a library object, suggests the archetype and writes a DRAFT (the app keeps the old art). Refine the landmark, compose around it, compare, lint; set `state: 'live'` only at GOLD with the compare sheet looked at in light and night. The item keeps its id, key, place fields, label, site, tags and `when`.

**Care for composed scenes** (the same rules, the care text and the place win): people are tiny anonymous silhouettes (at most 8 per scene, 10 at a station, no crowds); life comes from animals, birds, boats and vehicles; no flags, emblems, holy figures or brands. The ONE exception to "no text" is the engine's place-name sign, only where the archetype declares signs (a station): a plain sans-serif board with line-colour bars, drawn from data. Never the TfL roundel, the Underground logotype, the line-diagram style or New Johnston, not even as decoration (the object lint rejects a ring with a bar across it).

Cheat sheet: `references/scene-engine.md`. The spec: `docs/dev/SCENE_ENGINE.md`.

### Scene engine v2: the default for every new scene

Since 8 Oct 2026 a new scene is a v2 RECIPE (`docs/dev/SCENE_ENGINE_V2.md`; `src/app/71-scene-<pack>-r-<id>.js`, strict JSON
between markers). **Authors declare, the engine decides**: you state WHAT is WHERE ON THE GROUND in metres; the engine computes
the screen position, the scale from the object's real size and the depth, the draw order, the shadows along the real sun, the
reflections, the haze, the night lights, the weather and the crowds, and it refuses or snaps anything physically wrong. Never
place in pixels, never choose a layer or a haze, never scale by hand.

1. **Start from reality.** `scene compose "<place>, <moment>, <viewpoint words>, the <subject>" --pack <p> --id <id> --at <lat,lon>`
   (the auto-composer: OpenStreetMap layout, the building generator, the library, flows, a viewpoint search with the composition
   rules), or `scene new <pack> <id> --lat .. --lon .. --heading .. --preset <p> --osm` (`scene new` writes a v2 recipe unless `--v1`).
2. **Choose the camera, then import.** `scene osm --at <lat,lon> --heading <deg> [--eye m --fov deg --horizon row] --into <pack>/<id>`
   re-imports the real roads, pavements, water outlines, buildings (as generator footprints), trees and landmarks for that
   viewpoint; `scene terrain --into <pack>/<id>` adds the real skyline. Every ground position is relative to the camera: settle it
   first, refine after. The import lists what the library lacks (the object backlog) and never copies brand names.
3. **Refine.** In the gallery's scene editor (`OPENDASH_SCENE_EDITOR=1`) or by hand through `tools/lib/scene-recipe.mjs`:
   ground placements (`{ obj, on, d, u }`, `{ obj, on: '<strip>', along }`, `{ obj, at: [x, d] }`), scatter rules on the surfaces
   that take plants, flows on roads, pavements, towpaths and water (trams on a timetable), `subject: true` on the subject.
4. **Lint strictly.** `scene lint <ref> --perf --strict-placement` until it prints GOLD with no sanity or composition warning
   (cars on grass, floating or ghost objects, wrong scale, clutter, a hidden landmark, the subject off the thirds or too big).
5. **Look.** `scene sheet <ref> --times --seasons --contact`, `--weather rain,snow,fog`, `--flows`; and the critic:
   `scene critique <ref>` (the local Claude CLI when it is there, else a review page) and `scene compare-to-golden <ref>`.
6. **Old scenes:** `scene migrate <ref>|--pack <id> --dry-run --report` lists every defect of a v1 scene; a written migration
   supersedes the item under the same id. Review its sheet before keeping it: the report is the worklist, not a fix.

Credits: a recipe built from OpenStreetMap carries "(c) OpenStreetMap contributors, ODbL 1.0" (the tools write it; Settings >
About shows it); terrain carries the tile credit. Confirm with the user before committing OSM-derived recipes (V2 17.6).

## Commands (all run from the repository root; `--root <dir>` works on another checkout)

| Command | Use |
| --- | --- |
| `node tools/anim-pack.mjs reference [--render] [--mode light\|dark\|night]` | the gold standard and the do-better list; `--render` writes PNGs to `.anim-ref/` (without `--mode`: light, night and dark: every PNG the briefs cite) |
| `node tools/anim-pack.mjs lint [--file <path>] [--ref <ref,ref>] [--pack <id>] [--key <key,key>] [--only small\|scenes] [--rules] [--quiet] [--json]` | the calibrated gate (exit 2 on failure; exit 1 and nothing linted for a file that registers nothing or a key that does not exist); prints the thin spots and the redraw targets of every selected piece |
| `node tools/anim-pack.mjs sheet <ref,ref> \| --file <path> \| --pack <id> [--key <key,key>] [--only small\|scenes] [--mode light\|dark\|night] [--crop square\|phone] [--still] [--at <ms>] [--sizes] [--out <dir>] [--contact]` | render PNGs to look at (scenes 1600 x 900, items 512 x 512, paused at 6.5 s unless `--at`; `--still` = animations off, the rest frame; `--sizes` = a strip of an item at 28, 40, 64 and 128 px at real size; `--crop` the central 900 or 420 units a square tile or a portrait phone shows; `--contact` a contact sheet on a page of the same mode) |
| `node tools/anim-pack.mjs calibrate [--propose]` | thresholds against the corpus (never lower one) |
| `node tools/anim-pack.mjs new <id> "<Name>" [--unit-word w] [--groups a,b]` | scaffold a region (tables, stubs, test, doc skeleton; no art; `complete: false`) |
| `node tools/anim-pack.mjs status [<id>] [--strict] [--short] [--json] [--no-lint] [--declare-complete]` | what is missing, orphaned, overlapping, failing; trips with no row; the reach; `--strict` exits 2 unless complete and clean (and the flag is set); `--declare-complete` sets `complete: true` |
| `node tools/anim-pack.mjs brief <id> --kind scene\|element [--batch N] [--of M] [--group g] [--out dir [--clean]] [--note t] [--clear-notes]` | the agent briefs (about 7 scenes each; `--of M` is the number of batches, cut at group boundaries where that costs little, so sizes can differ; they cite this skill) and a `plan.json` to dispatch from; `--out` creates the scene stubs and stores the notes |
| `node tools/anim-pack.mjs guard --owned <file>[,<file>...] [--base <ref>]` | the orchestrator's proof that only the batch's own files changed (exit 2 on any other file, a threshold, waiver, gold-standard or test change); an agent runs it on its own file for the GIT line |
| `node tools/anim-pack.mjs object new\|lint\|sheet\|list ...` | the object library (`object new <cat>.<name> --kits k --role r`, `object lint [<id>]`, `object sheet <id> [--mode night] [--canvas]`, `object list [--kit k] [--role r]`) |
| `node tools/anim-pack.mjs scene new\|upgrade\|lint\|sheet\|perf ...` | composed scenes: `scene new <pack> <id> --brief f` (a v2 recipe; `--v1` the old scaffold), `scene upgrade <ref> --box ...`, `scene lint <ref> --perf --strict-placement` (GOLD), `scene sheet <ref> --times --seasons --weather rain,snow --compare`, `scene perf`; batches with `--archetype a --table t [--rows N] [--sample N]` |
| `node tools/anim-pack.mjs scene compose\|osm\|terrain\|street\|building\|migrate\|critique\|golden\|compare-to-golden ...` | scene engine v2: the auto-composer from a one-line brief, the OpenStreetMap and terrain imports, the building and street generator, the v1-to-v2 migration (and its defect report), the visual critic, the golden set |
| `node tools/anim-pack.mjs object normalise <id>\|--dir d\|--all-raster [--write]` | the style normaliser for imported raster objects (palette, shading, outline, size and anchor checks) |
| `node build.mjs --syntax` / `node build.mjs` / `npm test` / `node tools/privacy-scan.mjs` | the repo gates |

Files: `src/app/71-anim-0region.js` (framework and the kit), `71-anim-region-<id>.js` (config), `71-anim-region-<id>-scenes-N.js` (scenes), `72-anim-pack-<id>-<group>.js` (packs); US scenes `71-anim-us2-scenes-*.js`, Asia `71-anim-asia2-scenes-*.js`;
`tools/anim-quality.json` (calibrated thresholds: read only), `tools/anim-reference.json` (the gold standard), `tools/lib/anim-templates/` (the briefs and the scaffold), `docs/dev/ANIMATION_PACKS.md` ("Regions").

## Final report (what a drawing agent returns; the briefs fix the exact form)

```
FILE: <path>   pieces drawn and passing: <n of m to draw>   bytes of the file: <size>
LINT: <last line of lint --file, verbatim: PASS: <n> items clean.>
GIT: <git status --short, verbatim> then <guard --owned <your file(s)>, verbatim>   (the scaffold was committed first: only your file(s) are changed; in a shared tree name the files of other agents as theirs)
STUDY: <key> | MODEL: <ref> | TAKE: <3 crafts> | LAYERS / NIGHT / MOTION: <plan> | NOT COPYING: <what>   (one line per piece)
PER PIECE: <key> | <rendered bytes> | richness | thin spots | model exemplar | self-check R1-R20 string = n/20 | instant rejects: none | the six weaknesses seen: none|<W1..W6> | suggested variety kept or changed (reason)
LOOKED: <per piece and render: png path | one concrete thing seen | one defect found (and the fix)>
PNGS LOADED: <every PNG that actually displayed; any that failed to load and was re-opened, or never loaded (then its lines are FAIL: not looked at)>
WEAKEST THREE: <per piece: three weakest points and how each was checked>
TARGET MISSES: <key | numbers>  (or "none")
NOT DONE: <key | failing rule | attempts (n of 3) | draft path>  (or "none")
OTHER FILES I THINK ARE WRONG: <or "none">
```
