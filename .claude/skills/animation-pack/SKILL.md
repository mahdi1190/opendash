---
name: animation-pack
description: Make, extend and review OpenDash animation packs, regions and pieces - full-screen 1600x900 scenes (openings, signatures, "Welcome to <place>"), small 64x64 symbols and elements, place icons - at the exact style and quality of the existing US and Asia work. Use whenever someone adds, draws, redraws, extends or reviews animations for a place, country, state, city or region ("make animations for <place>", "add a Europe pack", "draw a scene for <city>", "an icon for <town>"), touches src/app/71-anim-*.js, 72-anim-pack-*.js or tools/anim-pack.mjs, or scores animation art. Enforces hard gates - study the gold standard, draw with the kit, lint pass with no waiver, look at light and night renders, score the rubric, independent review - so nothing below the corpus median ships.
---

# Animation packs (OpenDash)

OpenDash plays a full-screen animated scene when the user opens the day and is somewhere (the US, Asia, ...), and shows small animated symbols beside things. There are 397 scenes and 575 small items; the strict hand-drawn set
(229 scenes, 245 symbols) is ONE consistent body of work: flat-vector painting built back to front in ten layers, one daylight palette graded for evening by the page, motion in the kit's classes at three depths. New work must be
indistinguishable in craft from it. The tools (`node tools/anim-pack.mjs`) and the gates below are what keep it so.

**The bar is the median of the existing corpus, not its minimum.** The lint is calibrated at the minimum, so a piece can pass it and still be below the existing work. A skeleton built from the recipe numbers passes almost every lint rule and is a flat dusk with no subject.
"Good enough" is a FAIL. The targets are measurable: lint richness >= 0.90 (1.0 = the median accepted piece) and at most 4 thin spots, both printed for every piece by `lint`; the exemplars are the BEST ten, used for technique. When a craft system the exemplar shows is missing from your piece, say so plainly and redraw it (at most 3 attempts).

## Quick checklist (one page; every box is a gate, none is optional)

Per piece (a scene or a small item):

- [ ] **0 Care.** No text or letter-like marks, flags, maps or borders, political or military symbols, portraits, faces, crowds or identifiable people (a tiny anonymous faceless silhouette as a scale cue is allowed), holy figures. Sacred architecture only as respectful architecture. These rules override what older scenes show (a few carry flags). No personal data anywhere (the repo is PUBLIC).
- [ ] **1 STUDY** (before drawing anything): `node tools/anim-pack.mjs reference --render` and `reference --render --mode night`; OPEN with the Read tool the exemplars nearest your subject (scene: at least 3, the model in light AND night; item: at least 2 icons); read the model's source (`file` and key in `recipes.md`).
  Write down: `MODEL: <ref>`, the 3 crafts you take from it, your plan for the ten layers, what lights up at night, the motion at three depths, and what you will NOT copy.
- [ ] **2 DRAW** with the kit (`animSceneKit()`, `kit-reference.md`) and the recipe of the scene type (`recipes.md`); small items with theme classes only (`small-icons.md`). Your own geometry, seeds and palette: never paste numbers, never copy and recolour.
- [ ] **3 LINT**: `node tools/anim-pack.mjs lint --file <your file>` ends with exactly `PASS: <n> items clean.`, no "documented waivers", no threshold edited, no test edited, and meets the targets (richness >= 0.90, at most 4 thin spots: it prints both and the thin spots of every piece). If it fails, improve the ART (never pad, stuff or copy), at most 3 attempts; then REMOVE the piece from the file, save its draft under `.anim-ref/drafts/` and report it as NOT DONE with the failing rule. Only the orchestrator decides about waivers.
- [ ] **4 LOOK**: `sheet --file <file> --mode light --contact` AND `--mode night`, and for scenes `--crop phone` and `--crop square` (items: `--only small`, `--mode light` and `--mode dark`); open every PNG and the contact sheet (it is the thumbnail test); put the exemplar's PNG beside yours and compare layers, finish and life. Looking is evidenced: per render ONE concrete thing you saw and ONE defect you found ("none" is not accepted).
- [ ] **5 SELF-CHECK** in writing on `rubric.md`: all 20 lines P/F with a reason per F, instant rejects (none), the craft verdict against the exemplar `better | equal | below` (`below` = a craft system the exemplar shows is missing). Pass: >= 18/20, every CORE line, zero instant rejects, verdict not `below`. Otherwise redo from step 2. Your score is a self-check, never an approval.
- [ ] **6 REPORT** honestly: bytes, the lint's last line verbatim (it must be a PASS), `git status --short`, per render the PNG you opened with its observation and defect, the three weakest points per piece, the self-check, what is not done (with the draft path).

Per batch or region, additionally:

- [ ] **7 INDEPENDENT REVIEW**: a fresh-context, blind reviewer scores each piece against the exemplars (`workflow.md` section 10). The author never approves a batch. A piece passes only if EVERY reviewer passes it.
- [ ] **8 The orchestrator re-runs the lint itself**, runs `node --test tests/anim-packs.test.mjs`, and PROVES with `node tools/anim-pack.mjs guard --owned <the batch's files>` that only those files changed and no tool, test, threshold, waiver or gold-standard file was touched (exit 2 otherwise: reject the batch). It renders the gold standard ONCE before fanning out (`reference --render`, `--mode night`, `--mode dark`) so that agents never write the same PNGs.
- [ ] **9 Integrate**: `node tools/anim-pack.mjs status <id> --strict` exits 0, `npm test` green, `node build.mjs --syntax`, `node tools/privacy-scan.mjs` clean.

If time is short: do FEWER pieces, each through every gate. Never ship a failing gate. Never claim a render you did not open or a command you did not run.

## What to read, and when (progressive disclosure)

Read this file fully. Then, for the job:

| Job | Read | Why |
| --- | --- | --- |
| Draw ANY scene | `references/style-guide.md` (sections 1 to 10), `references/recipes.md` (the recipe of your type), `references/kit-reference.md` | the visual and motion language with numbers; the build order and exact kit calls; every helper and class |
| Draw a small icon or an element | `references/small-icons.md`, `references/style-guide.md` section 1 and 10, `references/rubric.md` part B | the 64 x 64 craft |
| Review or score anything | `references/rubric.md` (all), `references/style-guide.md` section 12 and 13 | the 20 lines, the 8 instant rejects, how to score blind |
| Make a whole region, or fan work out to agents | `references/workflow.md` (all) | scaffold, tables, briefs, agents, panel, fix loop, integration |
| A lint rule fails | the "Failure handling" section below, `workflow.md` section 17, `tools/lib/anim-quality.mjs` `RULE_HINTS` | what each rule wants |

Agent briefs are generated, not written: `node tools/anim-pack.mjs brief <region> --kind scene|element` fills `tools/lib/anim-templates/scene-brief.md` and `element-brief.md`; they cite this skill, so a drawing agent reads it.

## The gates in detail

### Gate 1 - STUDY (before any drawing)

1. `node tools/anim-pack.mjs reference` prints the gold-standard scenes and icons with the reason each is good and the "do better than these" list. `reference --render` (and `--render --mode night`, or `--mode dark` for icons) writes PNGs to `.anim-ref/` (git-ignored), named `<pack>__<item>-<mode>.png`,
   for example `.anim-ref/asia-southeast__th-signature-night.png`. **Open them**; text is not a substitute for looking.
2. Choose the MODEL: the exemplar nearest your subject (`recipes.md` section 2 maps subject to recipe and model). Read its source: `file` and key are printed by `reference` and listed in the recipe.
3. Write the study note (in the report, or in a scratch file) in this form and do not start drawing before it exists:
   `MODEL: us-midwest/mi-mackinac-bridge | TAKE: computed cables and hangers; parallax pines framing; three traffic speeds | LAYERS: sky 4 stops + low sun right; far shore; water ramp; bridge; ship; pines both sides | NIGHT: deck lamps, tower aircraft lights, a lit ship | MOTION: sky drift + birds / glints, ship, car / pine sway, gulls + one wake | NOT COPYING: its geometry, seeds, palette`.
4. For a batch, one note per key. The notes are checked by the reviewer: a note that names no exemplar, or an exemplar whose PNG was not opened, fails the gate.

### Gate 2 - DRAW

- Scenes: one classic script, wrapped in an IIFE, using only `animSceneKit()` and `animRegionSceneAdd` at load time (`kit-reference.md` section 1). Build in the ten layers back to front (`recipes.md` section 1): sky, light, sky life, far plane, mid plane, water or ground, LANDMARK, subject life, near plane and framing, `finish()` LAST.
  The landmark has the highest detail budget: two or more detail systems and a lit-side facet, computed (loops, catenaries, scale ladders), not scribbled. Every plane boundary gets `haze()`; both sides are framed in the darkest tinted value; the bottom 20 % has structure. Safe zones: a portrait phone shows only the central 420 to 506 units of the 1600 and a square tile the central 900, so the part that identifies the subject sits inside x 590 to 1010 and the whole subject and its story inside x 350 to 1250 (`sheet --crop phone` / `--crop square` render them).
  The time of day is free (any of dawn, day, golden hour, dusk, night) as long as the scene reads in the light theme as drawn; a night scene is painted as night, and everything that should light at night is a separate `us-lit` / `us-lamps` / `us-star` element (`lit()`, `dots(..., 'us-lamps')`, `stars()`) under the last `finish()`. Motion only through the kit's `x-us*` classes and `mv()`, at three depths, every repeat with its own period and a NEGATIVE delay.
  Target the median (14 to 29 KB; hard cap 32,000; at 31,000 it is an instant reject). Markup: exactly the lint's vocabulary (path circle rect ellipse polygon line polyline g defs clipPath linearGradient radialGradient stop); text, image, script, style, a, SMIL, `use`, pattern, mask, symbol and filter are rejected.
- Small items: 64 x 64, theme classes only (`k c s w m`, `lk lc lm lw`, `t`, `dash`; zero hex), one dominant mass that reads at 28 px, a ground line or wave band, one sparkle, a median of 5 independently staggered moving groups in 3 kinds (the exemplars 7 to 14; `small-icons.md`), about 12 shapes and 1.0 KB (0.8 to 1.4).
- Draw your OWN picture: your composition, your seeds and your palette. The lint measures shared shapes against every other scene AND every other small item (`sharedShare`, `sharedShareAll`: an icon copied and recoloured or nudged shares all its shapes) and detects padding (hidden, off-canvas and tiny shapes) and clones (`distinctRatio`, `distinctForms`).

### Gate 3 - LINT (hard)

```
node tools/anim-pack.mjs lint --file src/app/71-anim-region-<id>-scenes-N.js            # scenes: every piece with its thin spots and redraw target (--rules: every rule; --quiet: failures only)
node tools/anim-pack.mjs lint --file src/app/72-anim-pack-<id>-<group>.js --only small   # elements
node tools/anim-pack.mjs lint --ref us-midwest/mi-mackinac-bridge --rules                # an existing item, for comparison
```
- Exit 0 and a last line of exactly `PASS: <n> items clean.` is the only pass. A last line with "documented waivers" means a waiver applied: not allowed for new work. Exit 2 = FAIL. Exit 1 with nothing linted means the file registers nothing, registers a scene key that does not exist or that no pack item uses, or registers a key another file registers too: fix the file first.
- The legacy US and Asia scene files are `src/app/71-anim-us2-scenes-N.js` and `71-anim-asia2-scenes-N.js` (new regions: `71-anim-region-<id>-scenes-N.js`). `--file` on a legacy file also lints the OTHER scenes in it, and a few of them carry documented waivers:
  when you redraw one scene there, lint it alone with `--ref <pack>/<item> --rules` and make sure ITS line has no waiver.
- Never edit `tools/anim-quality.json` (thresholds or waivers), `tools/lib/anim-quality.mjs`, a test, or any tool to get green. Never add a waiver. The lint is a floor calibrated on 229 accepted scenes; the right reaction to a failure is a better drawing.
- Read the "thin spots" (printed for every selected piece; `--quiet` hides them): a pass thinner than the 10th percentile of the corpus. Aim for the median of each metric (`style-guide.md` section 11); the target is richness >= 0.90 and at most 4 thin spots.
- What the lint cannot see: composition, taste, readability. That is gate 4.

### Gate 4 - LOOK (hard)

```
node tools/anim-pack.mjs sheet --file <file> --mode light --out .anim-ref/<name> --contact     # then the same with --mode night (items: --only small, --mode light / dark)
node tools/anim-pack.mjs reference --render                                                     # the exemplar PNGs, if not rendered yet
```
Open (Read tool) the full-size light PNG, the night PNG, the phone and square crops and `contact-light.png` (the 320 px thumbnail test: does the landmark read in one second?). Then the exemplar's PNG. For every PNG write ONE concrete thing you saw in it and ONE defect you found in it (and what you did); a render you did not open is not looked at. Ask, side by side: the same number of depth planes? haze at every boundary? a reflection where there is water?
framing on both sides and structure in the bottom fifth? does the night render come alive (lights on, stars, the landmark still readable)? is the motion plan as rich (read the `mv()` calls: classes, `--ad`, `--d`, `--dx`)? is the palette one family with three small accents?
A PNG cannot show motion: judge it from the lint's motion rows and the source. State the craft verdict `better | equal | below`: it compares the SYSTEMS the exemplar uses (the exemplars are the best ten, so a little less polish is not `below`); `below` = one of them is missing, redraw whatever the score.

### Gate 5 - SELF-CHECK

Check `rubric.md` in writing: the 20 lines as a 20-character P/F string with a reason per F, the instant rejects, the verdict. Pass: >= 18/20, every CORE line (scenes R1, R2, R9, R11, R16, R19, R20; items I1, I2, I6, I11, I15, I17), zero instant rejects, verdict not `below`.
Lines you did not check are F. An author's score is a self-check, never an approval: an independent reviewer scores it blind.

### Gate 6 - INDEPENDENT REVIEW (batches, and any piece someone else will rely on)

`workflow.md` section 10: reviewers with a fresh context, blind (no author score or claim), who run the lint, open the PNGs (including the crops) and the exemplars, and score by the rubric; the pass rule is the MIN over reviewers. A single piece done without an agent available is reported as "self-scored only, not independently reviewed".

### Gate 7 - INTEGRATE

`guard --owned <files>` exit 0 for every batch; `status <id> --strict` exit 0; `node --test tests/anim-packs.test.mjs tests/<id>-pack.test.mjs tests/region-framework.test.mjs tests/anim-quality.test.mjs`; `npm test`; `node build.mjs --syntax`; `node tools/privacy-scan.mjs` clean; look at the pack in Settings > Animations > gallery on a TEST copy (light and dark, Subtle and Playful, reduced motion; never port 4173 or live data).
Docs and the MODULES.md row: `workflow.md` section 14. Changes stay uncommitted unless the owner asks; never push.

## Never

- Text or lettering of any kind (including pseudo-script and tile arrays that read as letters); flags, maps, borders, coats of arms; political or military symbols; portraits, faces, crowds or identifiable people (a tiny anonymous faceless silhouette as a scale cue is allowed); holy figures, deities, prophets and religious statues; brands and logos.
- Personal data in any tracked file, comment or test: no names, paths, emails, money or task text. The git remote is public.
- Padding (invisible or off-canvas shapes, specks, repeated clones to raise a count), keyword stuffing, copying a scene and recolouring or nudging it, cloning one piece of your batch into another.
- A threshold, waiver, test, tool or foreign file edit to get green. Running a command that rewrites a file you do not own. Registering a stub, a skeleton or a failing piece.
- A night scene painted as a daylight picture under a dark wash (paint what the time of day looks like; the lights that switch on at night are the evening classes), a scene that does not read in the light theme, a sun and a moon together, a flat sky, an empty bottom third, coin crowns, bare box buildings, hair-like foreground strokes, clone rows of animals, crude figures.
- `transform` on an element that has an `x-*` class; `U()` outside `svg()`; hex colours, gradients or inline paint in a small item; a `finish()` that is not last.
- Claiming something you did not do: a render not opened, a lint not run, a review not made, a score for a line you did not check. Report what is true.

## Failure handling

**The lint fails but the art looks right.** First do the honest check: open your PNG beside the exemplar's (gate 4) and ask whether the failing rule is telling the truth (a thin piece, a copied template, padding, a missing layer). Read the rule's hint (`lint` prints "how to fix"; `RULE_HINTS` in `tools/lib/anim-quality.mjs`).
Fix the ART, at most 3 attempts per piece: add the missing layers, detail, depth and life, never filler. Rules that name copying (`sharedShare`, `sharedShareAll`, `distinctRatio`, `distinctForms`) want your own geometry and seeds; rules that name padding (`hiddenShare`, `tinyShare`, `hiddenShapes`) want fewer fakes and more real shapes;
count rules (`shapes`, `paths`, `detailShapes`, `gradients`, `colours`, `movingGroups`, `motionKinds`) want a richer picture. If it still fails after 3 attempts, the piece is NOT DONE: do not hack, tune, pad or waive, and never decide that the rule is wrong. Save its code to `.anim-ref/drafts/<key with ":" as "_">.js` (git-ignored), REMOVE it from the file (or comment it out) so that the file lints clean, and report it under NOT DONE with the failing rule, the value against the threshold and the draft path; your report's LINT line must say PASS.
Only the orchestrator decides about waivers or about a rule being wrong. A lint failure you hid is worse than any weak picture. A piece that passes the lint but misses a redraw target (richness 0.90, 4 thin spots) after 3 attempts stays and is listed under TARGET MISSES with its numbers; the independent reviewer decides.

**A scene is near the 32 KB cap (target <= 29,000; 31,000 is an instant reject).** Trim by simplifying REPEATED elements, never the composition or the motion: window grids as one `dots()` dash path per row set (not a rect per window); `R()` on every computed coordinate; loops that append to ONE `d` string per fill colour;
shared gradients through `U()` ids; no duplicate near-identical paths (draw the far skyline once and fade it with `haze()`); fewer but longer strokes; drop the third decorative row of a far plane before you drop a framing silhouette. Re-lint and re-look after trimming: the trimmed picture must still pass gate 4.

**Time is short.** Do fewer, better. Finish pieces to every gate in order: whole groups before a thin layer across all of them. List every key not done and why. A region stays red (its generated tests fail) until complete; that is the honest state, not a problem to patch.

**You cannot render** (no browser). Gate 4 cannot be met: the piece cannot pass. Set `CHROME_PATH`, or report "not looked at" and do not integrate.

**A piece scores below the bar.** Redo from the weakest line, not from scratch, unless the composition itself is wrong (R1, R2, R4, R9, R11). After 3 attempts (and, with a reviewer, 3 rounds), remove it, list it as NOT DONE with the failing lines and the draft path, and move on.

**Another agent's file breaks your load.** The error names the file and the line. Wait a minute and retry; never touch it. If it names YOUR file, fix it (a top-level `const` in a scene file means the IIFE is missing).

**You do not know what a place looks like.** Draw what you are sure of (the landscape, the skyline) rather than a guess; never a stereotype, never a cliche stacked with every symbol of the place; the right season, climate and architecture.

## Commands (all run from the repository root; `--root <dir>` works on another checkout)

| Command | Use |
| --- | --- |
| `node tools/anim-pack.mjs reference [--render] [--mode light\|dark\|night]` | the gold standard and the do-better list; `--render` writes PNGs to `.anim-ref/` |
| `node tools/anim-pack.mjs lint [--file <path>] [--ref <ref,ref>] [--pack <id>] [--only small\|scenes] [--rules] [--quiet] [--json]` | the calibrated gate (exit 2 on failure; exit 1 and nothing linted for a file that registers nothing or a key that does not exist); prints the thin spots and the redraw targets of every selected piece |
| `node tools/anim-pack.mjs sheet <ref,ref> \| --file <path> \| --pack <id> [--only small\|scenes] [--mode light\|dark\|night] [--crop square\|phone] [--out <dir>] [--contact]` | render PNGs to look at (scenes 1600 x 900 paused at 6.5 s; items 512 x 512; `--crop` the central 900 or 420 units a square tile or a portrait phone shows) |
| `node tools/anim-pack.mjs calibrate [--propose]` | thresholds against the corpus (never lower one) |
| `node tools/anim-pack.mjs new <id> "<Name>" [--unit-word w] [--groups a,b]` | scaffold a region (tables, stubs, test, doc skeleton; no art) |
| `node tools/anim-pack.mjs status [<id>] [--strict] [--short] [--json] [--no-lint]` | what is missing, orphaned, failing; `--strict` exits 2 unless complete and clean |
| `node tools/anim-pack.mjs brief <id> --kind scene\|element [--batch N] [--of M] [--group g] [--out dir [--clean]] [--note t]` | the agent briefs (about 7 scenes each; they cite this skill) and a `plan.json` to dispatch from |
| `node tools/anim-pack.mjs guard --owned <file>[,<file>...] [--base <ref>]` | the orchestrator's proof that only the batch's own files changed (exit 2 on any other file, a threshold, waiver, gold-standard or test change) |
| `node build.mjs --syntax` / `node build.mjs` / `npm test` / `node tools/privacy-scan.mjs` | the repo gates |

Files: `src/app/71-anim-0region.js` (framework and the kit), `71-anim-region-<id>.js` (config), `71-anim-region-<id>-scenes-N.js` (scenes), `72-anim-pack-<id>-<group>.js` (packs); US scenes `71-anim-us2-scenes-*.js`, Asia `71-anim-asia2-scenes-*.js`;
`tools/anim-quality.json` (calibrated thresholds: read only), `tools/anim-reference.json` (the gold standard), `tools/lib/anim-templates/` (the briefs and the scaffold), `docs/dev/ANIMATION_PACKS.md` ("Regions").

## Final report (what a drawing agent returns; the briefs fix the exact form)

```
FILE: <path>   pieces drawn and passing: <n of m to draw>   bytes of the file: <size>
LINT: <last line of lint --file, verbatim: PASS: <n> items clean.>
GIT: <git status --short, verbatim: only the agent's own file(s)>
PER PIECE: <key> | <rendered bytes> | richness | thin spots | model exemplar | self-check R1-R20 string = n/20 | instant rejects: none | suggested variety kept or changed (reason)
LOOKED: <per piece and render: png path | one concrete thing seen | one defect found (and the fix)>
WEAKEST THREE: <per piece: three weakest points and how each was checked>
TARGET MISSES: <key | numbers>  (or "none")
NOT DONE: <key | failing rule | attempts (n of 3) | draft path>  (or "none")
OTHER FILES I THINK ARE WRONG: <or "none">
```
