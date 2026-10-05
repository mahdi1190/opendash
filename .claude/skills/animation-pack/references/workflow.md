# Workflow: making a whole region (or extending one)

From nothing to a released region: scaffold, tables, briefs, a fan-out of drawing agents, a lint gate per batch, an INDEPENDENT review panel against the gold standard, a fix loop, integration, docs, release.
The tools (`node tools/anim-pack.mjs --help`) do the bookkeeping; this file is the order of work and the gates. Read `docs/dev/ANIMATION_PACKS.md` ("Regions") once first. Examples use a made-up region `eu`.

Contents: 1 the stages at a glance, 2 preconditions, 3 scaffold, 4 tables, 5 care notes, 6 plan the batches, 7 pilot, 8 fan out, 9 what the orchestrator checks after every agent, 10 the review panel,
11 the fix loop, 12 elements, 13 integrate, 14 docs and release, 15 extending an existing region or redrawing a scene, 16 when time is short, 17 troubleshooting.

## 1. The stages at a glance

| # | Stage | Command or action | Gate to leave the stage |
| --- | --- | --- | --- |
| 1 | Preconditions | clean branch, `npm test` green, a browser for `sheet` | all true |
| 2 | Scaffold | `node tools/anim-pack.mjs new eu "Europe" --unit-word country --groups west,east,north,south` | scaffold loads, `region.check()` empty |
| 3 | Tables | fill `src/app/71-anim-region-eu.js` (units, places, `unitKm`, `worldTravel`) | `status eu` shows no table problem and no `example-` rows |
| 4 | Care notes | write `## Cultural care` in `docs/dev/EU_PACK.md` | present before any brief is written (`brief` notes it while the section is still the skeleton) |
| 5 | Gold standard and briefs | `reference --render` (light, night, dark) ONCE, then `brief eu --kind scene --out .anim-ref/briefs` (and `--kind element`) | the exemplar PNGs exist; one brief per agent, and a `plan.json` |
| 6 | Pilot | ONE scene batch and ONE element batch first | review panel passes the pilot; briefs tuned |
| 7 | Fan out | one agent per brief, each owns one file | each report in the fixed format |
| 8 | Per-batch check | the orchestrator re-runs `lint --file` itself, runs `node --test tests/anim-packs.test.mjs` and `guard --owned <the batch's files>` | `PASS: <n> items clean.` with no waiver, `guard` exit 0: no foreign file, threshold, waiver, gold-standard or test touched |
| 9 | Review panel | fresh, blind reviewers score against the exemplars | every piece PASS from every reviewer |
| 10 | Fix loop | redraw only what the notes name; re-lint; fresh re-review | max 3 attempts / rounds per piece, then NOT DONE (removed, draft saved) |
| 11 | Integrate | `status eu --strict`, `npm test`, `node build.mjs --syntax`, privacy scan | all green |
| 12 | Docs and release | `docs/dev/EU_PACK.md`, `MODULES.md` row, changelog, version | the owner asks for it |

## 2. Preconditions

- Branch: not the default branch; `git status --short` clean.
- Baseline: `npm test` is green BEFORE you start (so a red later is yours). `node build.mjs --syntax` passes.
- A browser for the LOOK gate: `node tools/anim-pack.mjs sheet asia-south/mv-signature --out /tmp/x` renders a PNG. If it prints "No Chrome, Edge or Chromium found", set `CHROME_PATH` (or `PLAYWRIGHT_BROWSERS_PATH`). Without a browser nothing can be looked at, so nothing can pass: stop and report.
- Study the gold standard yourself once: `node tools/anim-pack.mjs reference --render` and `reference --render --mode night` (and `--mode dark` for the icons; PNGs in `.anim-ref/`, git-ignored), open ten of them with the Read tool.
- Never touch live data or port 4173; test the app on a copy (CLAUDE.md).

## 3. Scaffold

```
node tools/anim-pack.mjs new eu "Europe" --unit-word country --groups west,east,north,south     # 1 to 8 groups; --root <dir> scaffolds into another checkout
```
It writes `src/app/71-anim-region-eu.js` (the config), `src/app/71-anim-region-eu-scenes-1.js` (an empty IIFE stub), one `src/app/72-anim-pack-eu-<group>.js` per group (`B.scenes()` and commented element calls),
`tests/eu-pack.test.mjs` (data-driven) and `docs/dev/EU_PACK.md`, prints the `MODULES.md` row and the next steps, refuses to overwrite anything or to use a reserved id (`uk texas world core seasons sky moments rewards mine`),
and proves the scaffold loads. It ships NO example art on purpose: the generated test, the "every region" test of `tests/region-framework.test.mjs` and the "every pack file registered a valid pack" test of `tests/anim-packs.test.mjs`
are RED until every unit that opens has a scene and an element, every big place a scene and every small place an element. A half-built region cannot be committed; `status` is the progress bar.

## 4. Fill the tables

Edit ONLY `src/app/71-anim-region-eu.js` (read its comments; they explain every field):
- `EU_UNITS = { CODE: [name, group] }` (use the ISO code for countries); `EU_PLACES = [[id, name, unit, lat, lon, kind]]` with `kind` `'big'` (a full-screen scene), `'small'` (an element) or `''` (an anchor that only tells which unit a position is in).
  Every unit needs at least one row. Pick the list you can FINISH WELL: the work is units x 2 (scene and element) plus big places (scene) plus small places (element).
- `unitKm` (the reach of a row), `placeKm`, `worldTravel` (EVERY travel city the world pack draws that a row maps to: `region.check({worldCities})` and the tests name a missing one). The travel id of a row is `<place id>-<country code lower case>` and must match
  `src/app/69-travel-data.js`; the check command is in the config's comments.
- REGIONS MUST NOT OVERLAP: no row inside another region's reach (US 190 km, Asia 300 km). Never add rows outside the region to "sharpen" its edge.
- Delete the `example-` rows. `node build.mjs --syntax && node tools/anim-pack.mjs status eu`: no table problems, no starter data, the MISSING list is your work list.
- Group choice matters: a group is one pack and a batch of agents; keep groups culturally and geographically coherent (5 to 25 units each).

## 5. Care notes (before any brief)

The brief template adds a general care block (no text of any kind, no flags, maps or borders, no political or military symbols, no portraits, faces, crowds or identifiable people (a tiny anonymous faceless silhouette as a scale cue is allowed), no holy figures, sacred architecture only respectfully, disputed places neutral, no stereotypes, no brands, be factual; it overrides what older scenes show). Add the REGION-specific notes in
the `## Cultural care` section of `docs/dev/EU_PACK.md` as short "Draw ..." and "Never draw ..." lines: sensitive places and how to draw them neutrally, motifs to avoid, local conventions. The section runs to the next heading of the same or a higher level (sub-headings belong to it). `brief` appends it to every brief, and prints a note when the section is still the skeleton: do this step BEFORE you make the briefs. Check them against what the places really look like; when unsure what a place looks like, draw something you are sure of (the landscape).

## 6. Plan the batches

```
node tools/anim-pack.mjs brief eu --kind scene                          # the plan: batches of about 7 keys, cut at group boundaries, with the file each agent owns
node tools/anim-pack.mjs brief eu --kind element                        # one batch per group (an element batch is a whole pack file, which has one owner)
node tools/anim-pack.mjs brief eu --kind scene --of 14                  # more, smaller batches: fewer scenes per agent means more care per scene
node tools/anim-pack.mjs brief eu --kind scene --group west --out .anim-ref/briefs     # one group; files become 71-anim-region-eu-scenes-west-N.js
node tools/anim-pack.mjs brief eu --kind scene --batch 3 --note "Prefer morning light." # print one brief with an extra instruction (repeatable)
node tools/anim-pack.mjs brief eu --kind scene --out .anim-ref/briefs   # write scene-brief-N.md for every batch (element-brief-N.md with --kind element) and plan.json: the index to dispatch from
node tools/anim-pack.mjs brief eu --kind scene --of 14 --out .anim-ref/briefs --clean   # a different plan in a folder that already has briefs of that kind: refused without --clean (a stale brief would give two agents the same keys)
```
Keys that already have art are marked `done (leave alone)` in the brief; redrawing a finished piece is the orchestrator's decision and the orchestrator names its file. About 7 scenes per agent is the default (a scene at the median bar is about 23 KB of drawing code and four or five renders to look at): quality drops with fatigue and a long batch tempts an agent to cut corners, and the brief tells the agent to stop and report at the first sign of rushing; `--of M` makes batches smaller still.
Every key in the table carries a SUGGESTED time of day, season, scene type and palette (elements: motif kind and colour) from a fixed rotation over the whole region, so that agents who cannot see each other end up with different pictures; an agent may change one with a reason. The "already drawn" list is a snapshot and is not a coordination mechanism. The briefs name the files (`src/app/71-anim-region-eu-scenes-N.js`);
a scene file MUST keep that name so it sorts before the pack files (a file called `scratch.js` loads after them and `B.scenes()` never sees it). For the legacy US and Asia regions the briefs print new-style file names that do not exist there (their files are `71-anim-us2-scenes-*.js` and `71-anim-asia2-scenes-*.js`); use the briefs for new regions only.

## 7. Pilot first

Run ONE scene batch and ONE element batch (a group with few units) end to end through stages 8 to 10 before fanning out the rest. Read the pilot's pieces yourself against the exemplars. What the pilot teaches goes into `--note` lines for the other briefs
(a palette that keeps repeating, a missing foreground, windows that do not light, a recurring care slip). A pilot that fails the panel in round 1 is normal; a region fanned out without a pilot fails the panel in bulk.

## 8. Fan out

Render the gold standard ONCE first: `node tools/anim-pack.mjs reference --render`, `--mode night` and `--mode dark` (the PNGs in `.anim-ref/` are what the briefs point to; agents must not render them, several would write the same files at the same time).
One agent per brief (`plan.json` lists them), each with a fresh context, with the Agent tool or a Workflow script (see the `workflow-authoring` skill when you script it). The prompt can be one line:
`Your complete task brief is the file .anim-ref/briefs/scene-brief-3.md. Read all of it first, then follow it exactly. Reply with the final report the brief asks for.`
Rules for the fan-out:
- Each agent owns exactly ONE file (`scene-brief` and `element-brief` section 1). Scene agents and element agents of the same group never touch the same file (`B.scenes()` in the pack file is theirs to leave alone).
- Run at most about 4 to 6 at a time: every command loads the whole registry, other agents' files included, and a half-written file of one agent breaks another's load. The error names the file; wait a minute, run again, never touch it.
- Agents do not commit, push or `git add`. Only the orchestrator integrates. Agents of one checkout share one working tree: to prove ONE agent alone touched only its files, give each agent its own git worktree; otherwise guard the union of the files of everyone who ran.
- Give every agent the same quality contract (it is in the brief): study, kit and recipe, lint with no waiver, look at light AND night, rubric, care, report; fewer pieces beat weak ones.

## 9. What the orchestrator checks after EVERY agent (never trust the report)

```
node tools/anim-pack.mjs lint --file src/app/71-anim-region-eu-scenes-3.js          # last line must be exactly: PASS: <n> items clean.
node tools/anim-pack.mjs status eu --short                                          # what is still missing, orphans, table problems
node tools/anim-pack.mjs guard --owned src/app/71-anim-region-eu-scenes-3.js        # PROOF: exit 0 only if nothing else changed; exit 2 names every other file and any threshold, waiver, gold-standard or test edit
node --test tests/anim-packs.test.mjs                                               # the reduced-variant, theme-wrap and size-cap gates of the whole registry (agents do not run it: half-written files of others break it)
```
- `lint --file` for a scene file reports the scenes that `B.scenes()` turns into items (it exits 1 and lints nothing when the file registers nothing, a key that is not in the region's tables, a scene no pack uses or a key another file registers too); for a pack file add `--only small` for its elements. The PASS line must carry NO "documented waivers" suffix. A waiver, a threshold edit, an edited test or a foreign file (`guard` fails): reject the batch.
- Open the contact sheet yourself: `node tools/anim-pack.mjs sheet --file <file> --mode light --out .anim-ref/<name> --contact`. Eleven thumbnails side by side expose sameness (five golden-hour harbours), clones and weak compositions at once.
- Compare the report with the facts: bytes under 29 KB, `PER SCENE` lines complete, every instant-reject field present, NOT DONE listed honestly with a draft path and the scene really removed from the file, `GIT:` equal to what `git status --short` shows now, one observation and one defect per render in `LOOKED`.
- A claim you cannot back (an uncited render, a missing PNG path, a LOOKED line with no defect) is a failed report.

## 10. The independent review panel

The author does not approve a batch. Spawn REVIEWERS with a fresh context (they have not seen the brief, the drawing, the author's notes or scores). Per batch: two reviewers, each with at most 6 pieces (split the batch), a different emphasis per reviewer
(art direction: composition, colour, light, craft; technical: motion, night, hygiene, budget), and a pass rule of MIN, not average: a piece passes only if every reviewer who saw it passes it and nobody names an instant reject.
Render the sheets yourself first so that all reviewers see the same pictures: `sheet --file <file> --mode light --out .anim-ref/<name> --contact` and `--mode night`, the crops (`--crop phone`, `--crop square`), and `reference --render` (light and night) for the exemplars.

Reviewer prompt (paste, fill the paths and the keys; give NO author score or claim):

```
You are an independent reviewer of OpenDash animation pieces. You did not draw them. Your job is to find what is below the bar, not to be kind.
Read .claude/skills/animation-pack/references/rubric.md (all of it) and references/style-guide.md sections 3 to 10.
Pieces: <file> keys <key, key, ...>. Renders (open every one with the Read tool): <dir>/*-light.png, <dir>/*-night.png, <dir>/contact-light.png. Gold standard: .anim-ref/*-light.png and *-night.png from `reference --render`; pick the exemplar nearest each piece.
Do: (1) run `node tools/anim-pack.mjs lint --file <file> --rules` yourself and copy the last line; (2) for each piece look at the contact sheet, then the light PNG, then the night PNG, then the phone and square crops, then the exemplar's PNG, then read its source for motion and hygiene;
(3) score R1-R20 PASS/FAIL one by one with a reason for every FAIL, list instant rejects, and give the craft verdict against the exemplar: better, equal or below. The exemplars are the best ten of the corpus, so a little less polish is not "below": `below` means a craft system the exemplar shows (depth planes with haze, framing, a reflection, lights that come on, motion at three depths) is missing. Do not score a line you did not check.
Never edit any file. If you cannot render, say "not looked at" and stop: that piece does not pass.
Reply per piece in exactly this form, then a one-paragraph summary of the batch (repeated weaknesses, sameness across pieces):
<key> | lint: <last line> | model: <exemplar ref> | R1-R20: <20 characters P/F> = <n>/20 | core lines: pass|FAIL <which> | instant rejects: none|<numbers> | vs exemplar: better|equal|below | verdict: PASS|REDO | the three most valuable concrete fixes
```
The orchestrator reads the reports, computes the pass rule, and sends REDO pieces to the fix loop. A reviewer who passes everything or gives no FAIL reasons is not a reviewer: re-run with a stricter instruction and a different reviewer. Elements: the same with rubric part B, the `--only small` sheets in light AND dark, and the icon exemplars.

## 11. The fix loop

For each REDO piece: one drawing agent (a fresh one is fine, or the author) receives the file, the brief's quality contract, the exemplar and the reviewers' numbered fixes, and redraws only what the notes name; it must lint, look and score again. Then the orchestrator re-runs stage 9, and a reviewer who did not see the previous round re-reviews.
At most 3 rounds per piece (and at most 3 attempts inside a round's agent). A piece that still fails is NOT DONE: remove it from the file (never leave a failing scene registered), keep its draft under `.anim-ref/drafts/`, list the key in the final report with the failing lines, and let the owner decide. Never relax a threshold, add a waiver, edit a test or a tool to make a piece pass: only the orchestrator, on the owner's word, decides about waivers.
If the same defect keeps appearing across pieces (flat skies, nothing lights at night, clone rows), it is a brief problem: add a `--note` and re-issue the batch rather than fixing each piece by hand.

## 12. Elements (small symbols)

The same stages with `element-brief` and `references/small-icons.md`: one agent per GROUP (a pack file has one owner); the lint is `node tools/anim-pack.mjs lint --file src/app/72-anim-pack-eu-west.js --only small`; the look is `sheet --file <that file> --only small --mode light` and `--mode dark` (+ `--contact`)
judged as 28 px thumbnails; the score is rubric part B. Motifs must differ inside the group (five foods in a row are rejected) and from the existing icons of the slot; no two items of a slot draw the same thing (the tests check).

## 13. Integrate

```
node tools/anim-pack.mjs status eu --strict                       # exit 0: nothing missing, orphaned, wrong, failing, waived or starter
node --test tests/anim-packs.test.mjs tests/eu-pack.test.mjs tests/region-framework.test.mjs tests/anim-quality.test.mjs
node build.mjs --syntax && node build.mjs                          # the whole app builds
npm test                                                           # the whole suite
node tools/privacy-scan.mjs                                        # no personal data, no private path, no email (also in comments and tests)
```
Then look at the result in the real app on a TEST COPY, never the live data: `node tools/make-test-data.mjs /tmp/<you>/data --finance-from <finance folder>` and `node serve.mjs --data-dir /tmp/<you>/data --port <your port> --no-open`
(never 4173). Settings > Animations > Animation gallery > By pack: open every new item in light and dark, at Subtle and Playful, and with reduced motion; no console errors; the still frame is a finished picture.
Check `git status`: only the region's files, the docs and the MODULES.md row changed; `tools/anim-quality.json` and every test other than the generated one are untouched.

## 14. Docs and release

- `docs/dev/EU_PACK.md`: replace every TODO and angle-bracket paragraph, delete the skeleton note, fill `## Cultural care`; make it read like `docs/dev/ASIA_PACK.md`.
- `MODULES.md`: paste the row `new` printed into the Animation library table (and refresh it when counts change).
- Changelog and version only when the owner asks for a release (`docs/dev/RELEASING.md`: set `"version"` in `package.json`, rename `## [Unreleased]` in the changelog, tag). CLAUDE.md: leave changes uncommitted unless the owner asks for a commit; never push.
- The pack's data lives in source, so there is no migration; user pins and favourites refer to item refs `<pack id>/<item id>`: never rename an id that has shipped.

## 15. Extending an existing region, or redrawing a scene

- A new place or unit in an existing region: add the row to the config table, then the scene (`place:<id>` or `<unit word>:<CODE>`) or element; `status <id>` lists what is missing; the same gates apply to the new piece only.
- The legacy regions: US scenes are `src/app/71-anim-us2-scenes-N.js` (`usSceneAdd` and `usSceneKit()` are aliases of `animRegionSceneAdd('us', ...)` and `animSceneKit()`), Asia's are `71-anim-asia2-scenes-N.js` (`asiaSceneAdd`). Do not rename anything.
- Redrawing a weak accepted scene (the "do better" list, `reference` prints it): `lint --ref <ref> --rules` to see its thin spots, redraw in place in its own file (the scene store keeps the last registration of a key), then lint with `--ref <ref> --rules` (a legacy file also holds other scenes, some with documented waivers: yours must carry none), look, score and review as for a new piece. If it needs a waiver today, a redraw that passes without it lets you remove the waiver
  (`lint` prints "no longer needed" for a stale waiver): that is the one legitimate edit of `tools/anim-quality.json`, and only when the owner asked for it.
- Raising the bar after better scenes land: `node tools/anim-pack.mjs calibrate` compares each threshold with the corpus; `calibrate --propose` prints thresholds from today's corpus. Never lower one.

## 16. When time is short

Do FEWER pieces, each finished to the full standard, and list every key not done. Never register a stub, a skeleton or a piece that has not passed the gates: the region tests stay red until the region is complete, which is the honest state. Order the work so that
what is finished is a whole group (its scenes and its elements) rather than a thin layer across all groups. A report that says "9 of 11 passed the panel, 2 NOT DONE with reasons" is a good report; one that says "11 of 11 drawn" without the review is not.

## 17. Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `lint --file`: "registered no new or changed item" | the file registers no scene yet (the generated stub), or its name sorts after the packs (use `71-anim-region-<id>-scenes-N.js`), or no pack file calls `B.scenes()` for its group, or the key is not in the tables (`status` lists orphans) |
| `Identifier 'K' has already been declared` | a scene file without its IIFE |
| `Cannot access 'ANIM_SLOTS' before initialization` | a config or scene file touched a registry const at load time: use only `animSceneKit()` and `animRegionSceneAdd` there |
| a failed load names another agent's file | that agent is mid-edit: wait a minute and retry; never edit it |
| `sheet`: "No Chrome, Edge or Chromium found" | set `CHROME_PATH`; no render, no pass |
| lint FAIL `sharedShare` / `sharedShareAll` | too much of the piece is identical to another scene: you copied numbers or a template; draw your own geometry, seeds and palette (`recipes.md` intro) |
| lint FAIL `hiddenShare`, `tinyShare`, `distinctRatio` | padding or clones: remove them and improve the real drawing |
| lint FAIL on a structural rule (`x-transform`, `unique-ids`, `classes-defined`, `evening-grade-last`, `sky-gradient`) | a hygiene bug: `kit-reference.md` section 7 |
| lint FAIL only on counts, but the picture looks finished | the picture is thinner than the corpus floor: the lint is calibrated at the minimum of 229 accepted scenes, so look again, honestly, beside the exemplar. If it still fails after 3 attempts, the piece is NOT DONE: remove it, save the draft, report the rule, value and threshold (SKILL.md "Failure handling") |
| the load error names a file and a line | that file is at fault: `Identifier 'K' has already been declared` is a scene file without its IIFE (the message names the file that declared it first); a `ReferenceError` is code that ran at load time. Another agent's file: wait and retry, never touch it |
| `lint --file`: "problem(s) in the scene file(s)" | a scene key that is not in the region's tables (`province:ZZ`), a scene for a small place, dead art (no pack item uses it) or a key registered twice: fix the key, draw only the batch's keys |
| `guard` exits 2 | a file outside the batch changed (or a threshold, waiver, gold-standard or test): restore it or send the batch back |
| the render is black or empty | the markup threw (`NaN`), a gradient id is missing, or `svg()` returned nothing: run `lint` for the structure rows |
| `status` shows "starter data" | an `example-` row of the scaffold remains in the tables |
| a scene is at 31 KB | simplify repeated elements (SKILL.md "Failure handling"), not the composition |
