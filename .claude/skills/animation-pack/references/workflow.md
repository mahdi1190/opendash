# Workflow: making a whole region (or extending one)

From nothing to a released region: scaffold, tables, briefs, a fan-out of drawing agents, a lint gate per batch, an INDEPENDENT review panel against the gold standard, a fix loop, integration, docs, release.
The tools (`node tools/anim-pack.mjs --help`) do the bookkeeping; this file is the order of work and the gates. Read `docs/dev/ANIMATION_PACKS.md` ("Regions") once first. Examples use a made-up region `eu`.

Contents: 1 the stages at a glance, 2 preconditions, 3 scaffold, 4 tables, 5 care notes, 6 plan the batches, 7 pilot, 8 fan out, 9 what the orchestrator checks after every agent, 10 the review panel,
11 the fix loop, 12 elements, 13 integrate, 14 docs and release, 15 extending an existing region or redrawing a scene, 16 when time is short, 17 troubleshooting, 18 validating a change to the skill or the briefs (the pilot procedure, optional).

## 1. The stages at a glance

| # | Stage | Command or action | Gate to leave the stage |
| --- | --- | --- | --- |
| 1 | Preconditions | clean branch, `npm test` green, a browser for `sheet` | all true |
| 2 | Scaffold | `node tools/anim-pack.mjs new eu "Europe" --unit-word country --groups west,east,north,south` | scaffold loads, `region.check()` empty |
| 3 | Tables | fill `src/app/71-anim-region-eu.js` (units, places, `unitKm`, `worldTravel`, the travel cities of your countries) | `status eu` shows no table problem, no `example-` rows, no overlap with another region, and you decided about every trip it lists with no row |
| 4 | Care notes | write `## Cultural care` in `docs/dev/EU_PACK.md` | present before any brief is written (`brief` notes it while the section is still the skeleton) |
| 5 | Gold standard and briefs | `reference --render` (light, night, dark) ONCE, then `brief eu --kind scene --out .anim-ref/briefs` (and `--kind element`; it creates the scene stub of every batch), then **COMMIT the scaffold and the stubs** (`brief` prints the `git add ... && git commit` line) and run the same `brief` again so that `plan.json` carries the base commit | `plan.json` says `git.committed: true` and `missingPng` is empty; one brief per agent, every scene file exists, and the guard commands carry `--base <commit>` |
| 6 | Pilot | ONE scene batch and ONE element batch first | review panel passes the pilot; briefs tuned |
| 7 | Fan out | one agent per brief, each owns one file | each report in the fixed format |
| 8 | Per-batch check | the orchestrator re-runs `lint --file` itself, runs `node --test tests/anim-packs.test.mjs` and `guard --owned <the batch's files>` | `PASS: <n> items clean.` with no waiver, `guard` exit 0: no foreign file, threshold, waiver, gold-standard or test touched; every PNG the report claims loaded |
| 9 | Review panel | fresh, blind reviewers score against the exemplars | every piece PASS from every reviewer |
| 10 | Fix loop | redraw only what the notes name; re-lint; fresh re-review | max 3 attempts / rounds per piece, then NOT DONE (removed, draft saved) |
| 11 | Integrate | `status eu --declare-complete` (refuses while anything is missing, orphaned, overlapping, failing or starter), then `status eu --strict`, `npm test`, `node build.mjs --syntax`, privacy scan | `--strict` exits 0 (it also fails while the config still says `complete: false`), everything green |
| 12 | Docs and release | `docs/dev/EU_PACK.md`, `MODULES.md` row, changelog, version | the owner asks for it |

## 2. Preconditions

- Branch: not the default branch; `git status --short` clean.
- Baseline: `npm test` is green BEFORE you start (so a red later is yours). `node build.mjs --syntax` passes.
- A browser for the LOOK gate: `node tools/anim-pack.mjs sheet asia-south/mv-signature --out /tmp/x` renders a PNG. If it prints "No Chrome, Edge or Chromium found", set `CHROME_PATH` (or `PLAYWRIGHT_BROWSERS_PATH`). Without a browser nothing can be looked at, so nothing can pass: stop and report.
- Study the gold standard yourself once: `node tools/anim-pack.mjs reference --render` (no `--mode`: every exemplar in light, night AND dark in one run; PNGs in `.anim-ref/`, git-ignored), open ten of them with the Read tool. An image that does not load (an error, "[media removed: request limit]") has not been looked at: open it again.
- Never touch live data or port 4173; test the app on a copy (CLAUDE.md).

## 3. Scaffold

```
node tools/anim-pack.mjs new eu "Europe" --unit-word country --groups west,east,north,south     # 1 to 8 groups; --root <dir> scaffolds into another checkout
```
It writes `src/app/71-anim-region-eu.js` (the config, `complete: false`), `src/app/71-anim-region-eu-scenes-1.js` (an empty IIFE stub; the stubs of batches 2, 3 ... are created later by `brief --out`), one `src/app/72-anim-pack-eu-<group>.js` per group (`B.scenes()` and commented element calls),
`tests/eu-pack.test.mjs` (data-driven) and `docs/dev/EU_PACK.md`, prints the `MODULES.md` row and the next steps, refuses to overwrite anything or to use a reserved id (`uk texas world core seasons sky moments rewards mine`),
and proves the scaffold loads. It ships NO example art on purpose. **While the config says `complete: false` the repo stays GREEN**: the generated test, the "every region" tests of `tests/region-framework.test.mjs` and the "every pack file registered a valid pack" test of `tests/anim-packs.test.mjs`
run their STRUCTURAL checks as hard failures from the first second (sound tables, no overlap with another region, no dead art, unique travel ids, the lookups) and report their COVERAGE checks (every unit that opens has a scene and an element, every big place a scene, every small place an element, no starter data) as node:test `todo`.
`status` is the progress bar; `status eu --strict` also fails while everything is drawn but the flag is still false, and `status eu --declare-complete` (when nothing is missing, orphaned, overlapping, failing or starter; it refuses otherwise) sets `complete: true`, after which the coverage checks are hard failures: a half-built region cannot be declared complete.
`new` ends by telling the orchestrator to COMMIT THE SCAFFOLD before any agent starts (stage 5); an uncommitted scaffold makes `guard` list its files as strays.

## 4. Fill the tables

Edit ONLY `src/app/71-anim-region-eu.js` (read its comments; they explain every field):
- `EU_UNITS = { CODE: [name, group] }` (use the ISO code for countries); `EU_PLACES = [[id, name, unit, lat, lon, kind]]` with `kind` `'big'` (a full-screen scene), `'small'` (an element) or `''` (an anchor that only tells which unit a position is in, no art).
  Every unit needs at least one row. Pick the list you can FINISH WELL: the work is units x 2 (scene and element) plus big places (scene) plus small places (element). A list written as prose ("small places: a, b, c, d is NOT needed") is read as exactly the places it names: ask when it is ambiguous.
- **Travel ids and travelling.** The travel id of a row is `<place id>-<country code lower case>` and must equal the id in `src/app/69-travel-data.js` (the config's comment has a one-line check). While the user travels, the engine uses ONLY the row whose travel id is the trip's city: **a travel city that is not a row matches nothing at all**, so no opening plays for that trip. `status eu` therefore lists the travel cities of your countries that have no row (the nearest row, and a line to paste: an anchor `''` is enough to give the trip the unit's art). Add the ones that should open; a row whose id the travel tables lack is harmless (it is still reached from home). The id of a row is the travel id only if you named it so: `maroochydore` is not the travel id `sunshine-coast-au`.
- `unitKm` (the reach of a row, default 150: dense rows 100 to 150, sparse regions 250 to 300), `placeKm`, `worldTravel` (EVERY travel city the world pack draws that a row maps to: `region.check()` and the tests name a missing one; the list in the config comment is only a snapshot of the world pack, which is read live). `status eu` prints a REACH line (the farthest travel city of your countries from its nearest row, and the ones beyond `unitKm`): read it when you choose `unitKm`; there is no population data, so decide by what lies inside the reach and what does not (a remote island that stays uncovered is fine).
- **REGIONS MUST NOT OVERLAP**: no row inside another region's reach (US 190 km, Asia 300 km) and no other region's row inside yours. `status eu` lists every violation under OVERLAP WITH OTHER REGIONS, and `region.check()` reports it as `overlap: ...` with the ways out. Never add rows outside the region to "sharpen" its edge. **The border case**: a small town just across a border from a neighbour's row (a town of Papua New Guinea 70 km from Asia's Jayapura row) cannot be a row of yours; a position there resolves to the neighbour. Leave it without a row, or lower the neighbour's `unitKm` after running both regions' tests.
- Delete the `example-` rows **and the `>>> STARTER DATA` banner** with the how-to comments you no longer need (keep one line per column and the region's own notes: Asia's config is the model). `node build.mjs --syntax && node tools/anim-pack.mjs status eu`: no table problems, no starter data, the MISSING list is your work list.
- Group choice matters: a group is one pack and a batch of agents; keep groups culturally and geographically coherent (5 to 25 units each).

## 5. Care notes (before any brief)

The brief template adds a general care block (no text of any kind, no flags, maps or borders, no political or military symbols, no portraits, faces, crowds or identifiable people (a tiny anonymous faceless silhouette as a scale cue is allowed), no holy figures, sacred architecture only respectfully, disputed places neutral, no stereotypes, no brands, be factual; it overrides what older scenes show). Add the REGION-specific notes in
the `## Cultural care` section of `docs/dev/EU_PACK.md` as short "Draw ..." and "Never draw ..." lines: sensitive places and how to draw them neutrally, motifs to avoid, local conventions. The section runs to the next heading of the same or a higher level (sub-headings belong to it). `brief` appends it to every brief, and prints a note when the section is still the skeleton: do this step BEFORE you make the briefs. Check them against what the places really look like; when unsure what a place looks like, draw something you are sure of (the landscape).

Three things the pilot's agents had to work out for themselves, now stated:
1. **The region's notes may only be STRICTER than the general rules, never looser.** The general rule ALLOWS a tiny anonymous silhouette as a scale cue; a region whose notes say "no figure of the region's peoples" bans it, and the stricter statement wins. Say it plainly in the doc ("no person silhouette at all") instead of leaving two statements that seem to differ; both briefs say that the region's notes can only add to the general rules, and a reviewer applies the stricter.
2. **Name the SAFE motifs for a sensitive unit.** When the care notes forbid a people's art, patterns, carvings, masks, dress, ceremony or the obvious national animal or instrument, an element agent still has to draw something: say what is safe, one line per sensitive unit (foods and drinks in plain vessels, plants and crops, a real animal in its habitat that is not an emblem or a mascot, a tool of daily work, a natural feature, a weather scene, a landscape), and what is not (a carving, a mask, a national bird used as an emblem). Otherwise every agent infers it (the pilot's agents decided that a coconut-shell dish and a coffee plant were safe, and that a bird of paradise would read as the national emblem).
3. **The rotation is blind to the care text.** The suggested type, season, scene kind and motif of every key come from a fixed rotation, so it will suggest a "craft" the notes forbid, a "bridge" for a city without one, an "autumn" in the tropics. Do not leave each agent to override it in a report line: write the right suggestion ONCE in the doc's `## Scene suggestions` section, one line per key (`- place:<id>: type = harbour; palette = warm amber and rose`), and `brief` applies it to every brief. An agent whose suggestion still collides with the care text lets the care text and the place win, and says so in one line.
Also: `rays()` (the kit's sunburst) tinted red and white reads as a rising-sun ensign, a national flag: say it in the notes of a region where it could, and see `kit-reference.md`.

## 6. Plan the batches

```
node tools/anim-pack.mjs brief eu --kind scene                          # the plan: batches of about 7 keys, cut at group boundaries, with the file each agent owns
node tools/anim-pack.mjs brief eu --kind element                        # one batch per group (an element batch is a whole pack file, which has one owner)
node tools/anim-pack.mjs brief eu --kind scene --of 14                  # more, smaller batches: fewer scenes per agent means more care per scene
node tools/anim-pack.mjs brief eu --kind scene --group west --out .anim-ref/briefs     # one group; files become 71-anim-region-eu-scenes-west-N.js
node tools/anim-pack.mjs brief eu --kind scene --batch 3 --note "Prefer morning light." # print one brief with an extra instruction (repeatable)
node tools/anim-pack.mjs brief eu --kind scene --out .anim-ref/briefs   # write scene-brief-N.md for every batch (element-brief-N.md with --kind element) and plan.json: the index to dispatch from
node tools/anim-pack.mjs brief eu --kind scene --of 14 --out .anim-ref/briefs --clean   # a different plan in a folder that already has briefs of that kind: refused without --clean (a stale brief would give two agents the same keys)
node tools/anim-pack.mjs brief eu --kind scene --out .anim-ref/briefs --clear-notes     # forget the notes stored in plan.json
```
- **Numbers.** About 7 scenes per agent is the default (a scene at the median bar is about 23 KB of drawing code and four or five renders to look at): quality drops with fatigue and a long batch tempts an agent to cut corners, and the brief tells the agent to stop and report at the first sign of rushing. `--of M` is the NUMBER of batches, not a size: scene batches are cut at group boundaries where that costs little, so the sizes can differ (9 keys in groups of 6 and 3 with `--of 2` gives 6 and 3, not 5 and 4). Element batches are whole groups and never split one.
- **Stubs.** `--out` creates the empty scene file (the IIFE stub) of every batch that has none, so `guard --owned <file>` and the agent's `lint` always name a file that exists; they are listed in `plan.json` as `created`. It also re-reads the `--note` texts stored in `plan.json` on every later run (`--clear-notes` forgets them): re-issuing a brief after a fix never drops an earlier note, and a scene plan and an element plan written into one folder share one `plan.json`.
- **Commit, then dispatch.** The stubs are new files: **COMMIT the scaffold and the stubs** (the line `brief` prints), then run the same `brief` again; `plan.json` then says `git.committed: true` and carries the base commit in its guard commands. It also lists `missingPng`: the gold-standard PNGs the briefs cite that do not exist yet (render them once, section 8).
- Keys that already have art are marked `done (leave alone)` in the brief; redrawing a finished piece is the orchestrator's decision and the orchestrator names its file.
- Every key in the table carries a SUGGESTED time of day, season, scene type and palette (elements: motif kind and colour) from a fixed rotation over the whole region, so that agents who cannot see each other end up with different pictures; an agent may change one with a reason. The rotation does not know the place or the care text: put the right suggestion once in the doc's `## Scene suggestions` (section 5). The season is only a LABEL (the gallery card and the "picked for ..." note; it never decides when a region scene plays): the table suggests `any` in the tropics and, in the southern hemisphere, the local season with the label to write.
  The "already drawn" list is a snapshot and is not a coordination mechanism. The briefs name the files (`src/app/71-anim-region-eu-scenes-N.js`);
a scene file MUST keep that name so it sorts before the pack files (a file called `scratch.js` loads after them and `B.scenes()` never sees it). For the legacy US and Asia regions the briefs print new-style file names that do not exist there (their files are `71-anim-us2-scenes-*.js` and `71-anim-asia2-scenes-*.js`); use the briefs for new regions only.

## 7. Pilot first

Run ONE scene batch and ONE element batch (a group with few units) end to end through stages 8 to 10 before fanning out the rest. Read the pilot's pieces yourself against the exemplars. What the pilot teaches goes into `--note` lines for the other briefs
(a palette that keeps repeating, a missing foreground, windows that do not light, a recurring care slip). A pilot that fails the panel in round 1 is normal; a region fanned out without a pilot fails the panel in bulk. To test a CHANGE to the skill or the briefs the same way, on a made-up region, with a blind comparison against the corpus: section 18.

## 8. Fan out

Before the first agent starts: the scaffold and the scene stubs are COMMITTED (stage 5; `plan.json` says `git.committed: true`), and the gold standard is rendered ONCE: `node tools/anim-pack.mjs reference --render` (no `--mode`: light, night and dark in one run; the PNGs in `.anim-ref/` are what the briefs point to; agents must not render them, several would write the same files at the same time; `plan.json` `missingPng` is empty).
One agent per brief (`plan.json` lists them), each with a fresh context, with the Agent tool or a Workflow script (see the `workflow-authoring` skill when you script it). The prompt can be one line:
`Your complete task brief is the file .anim-ref/briefs/scene-brief-3.md. Read all of it first, then follow it exactly. Reply with the final report the brief asks for.`
Rules for the fan-out:
- Each agent owns exactly ONE file (`scene-brief` and `element-brief` section 1). Scene agents and element agents of the same group never touch the same file (`B.scenes()` in the pack file is theirs to leave alone).
- Run at most about 4 to 6 at a time: every command loads the whole registry, other agents' files included, and a half-written file of one agent breaks another's load. The error names the file; wait a minute, run again, never touch it.
- Agents do not commit, push or `git add`. Only the orchestrator integrates. Agents of one checkout share one working tree: to prove ONE agent alone touched only its files, give each agent its own git worktree (`git worktree add ../agent-1 <the scaffold commit>`); otherwise guard the union of the files of everyone who ran.
- **The GIT line of the report.** Because the scaffold is committed, `git status --short` lists only the agent's own file(s) when it works alone (or in its own worktree), and ends with the output of `guard --owned <its file>`, which must say `guard: OK`. In a shared tree it also lists the files of the agents working at the same time, and `guard --owned <only my file>` then fails naming exactly those files ("not one of the owned files"): the agent copies both outputs verbatim and names the files that are not its own. Anything else in either output (a tool, a threshold, a test, an untracked scaffold, a file the agent did not touch) is reported, never fixed by the agent. The orchestrator re-runs the guard over the union (section 9).
- Give every agent the same quality contract (it is in the brief): study (the PNGs are opened, one reading list per kind), kit and recipe, lint with no waiver, look at light AND night (a PNG that did not load is not looked at), rubric, care, report; fewer pieces beat weak ones. Scene agents read the four scene references, element agents `small-icons.md`, `style-guide.md` sections 1 and 10 and `rubric.md` part B (not `recipes.md`).

## 9. What the orchestrator checks after EVERY agent (never trust the report)

```
node tools/anim-pack.mjs lint --file src/app/71-anim-region-eu-scenes-3.js          # last line must be exactly: PASS: <n> items clean.
node tools/anim-pack.mjs status eu --short                                          # what is still missing, orphans, table problems
node tools/anim-pack.mjs guard --owned src/app/71-anim-region-eu-scenes-3.js        # PROOF: exit 0 only if nothing else changed; exit 2 names every other file and any threshold, waiver, gold-standard or test edit (add the files of every agent that ran in this tree; plan.json has the command with --base)
node --test tests/anim-packs.test.mjs                                               # the reduced-variant, theme-wrap and size-cap gates of the whole registry (agents do not run it: half-written files of others break it)
```
- `lint --file` for a scene file reports the scenes that `B.scenes()` turns into items (it exits 1 and lints nothing when the file registers nothing, a key that is not in the region's tables, a scene no pack uses or a key another file registers too); for a pack file add `--only small` for its elements. The PASS line must carry NO "documented waivers" suffix. A waiver, a threshold edit, an edited test or a foreign file (`guard` fails): reject the batch.
- While iterating, `lint --key` and `sheet --key` take an item id, a ref or a region key (`place:<id>`, `country:XX`; `*` is a wildcard), so one scene of a file is linted or rendered, not all of them; `sheet --at <ms>` pauses the animations at another time and `--still` shows the rest frame.
- Open the contact sheet yourself: `node tools/anim-pack.mjs sheet --file <file> --mode light --out .anim-ref/<name> --contact`. Eleven thumbnails side by side expose sameness (five golden-hour harbours), clones and weak compositions at once.
- Compare the report with the facts: bytes under 29 KB, `PER SCENE` lines complete, every instant-reject field present, NOT DONE listed honestly with a draft path and the scene really removed from the file, `GIT:` equal to what `git status --short` shows now, one observation and one defect per render in `LOOKED`.
- A claim you cannot back (an uncited render, a missing PNG path, a LOOKED line with no defect, a PNG the agent says it looked at that is not in `PNGS LOADED`, a `STUDY:` line that names no exemplar) is a failed report. While the region's `complete` flag is false the repo's tests stay green with the coverage checks as todo: a green `node --test tests/<id>-pack.test.mjs` is not a sign that the region is done; `status <id>` is.

## 10. The independent review panel

The author does not approve a batch. Spawn REVIEWERS with a fresh context (they have not seen the brief, the drawing, the author's notes or scores). Per batch: two reviewers, each with at most 6 pieces (split the batch), a different emphasis per reviewer
(art direction: composition, colour, light, craft; technical: motion, night, hygiene, budget), and a pass rule of MIN, not average: a piece passes only if every reviewer who saw it passes it and nobody names an instant reject.
Render the sheets yourself first so that all reviewers see the same pictures: `sheet --file <file> --mode light --out .anim-ref/<name> --contact` and `--mode night`, the crops (`--crop phone`, `--crop square`), `--still` for the rest frame, and for items `--only small --mode light --still --sizes --contact` and `--mode dark` (the `--sizes` strip is the 28 px test); the exemplars are the PNGs `reference --render` wrote once (light, night, dark).

Reviewer prompt (paste, fill the paths and the keys; give NO author score or claim):

```
You are an independent reviewer of OpenDash animation pieces. You did not draw them. Your job is to find what is below the bar, not to be kind.
Read .claude/skills/animation-pack/references/rubric.md (all of it, including section 9, the six recurring weaknesses) and references/style-guide.md sections 3 to 10 and 12 to 14.
Pieces: <file> keys <key, key, ...>. Renders (open every one with the Read tool): <dir>/*-light.png, <dir>/*-night.png, <dir>/contact-light.png. Gold standard: .anim-ref/*-light.png and *-night.png from `reference --render`; pick the exemplar nearest each piece.
An image that did not load has NOT been looked at: if the Read tool answers with an error or "[media removed: request limit]", open the PNG again; if it still does not display, score the lines it carries as FAIL "not looked at" and say so. List in your reply which PNGs actually loaded. Never describe a picture you did not see.
Do: (1) run `node tools/anim-pack.mjs lint --file <file> --rules` yourself and copy the last line; (2) for each piece look at the contact sheet, then the light PNG, then the night PNG, then the phone and square crops, then the exemplar's PNG, then read its source for motion and hygiene;
(3) score R1-R20 PASS/FAIL one by one with a reason for every FAIL, list instant rejects, say for each of W1 to W6 (rubric section 9: night render a dim copy, coin foliage, cloned shapes, no dark anchor, hard-edged water, scene-in-a-tile icons) whether you SAW it, and give the craft verdict against the exemplar: better, equal or below. The exemplars are the best ten of the corpus, so a little less polish is not "below": `below` means a craft system the exemplar shows (depth planes with haze, framing, a reflection, lights that come on, motion at three depths) is missing. Do not score a line you did not check.
Never edit any file. If you cannot render, say "not looked at" and stop: that piece does not pass.
Reply per piece in exactly this form, then a one-paragraph summary of the batch (repeated weaknesses, sameness across pieces):
<key> | lint: <last line> | model: <exemplar ref> | R1-R20: <20 characters P/F> = <n>/20 | core lines: pass|FAIL <which> | instant rejects: none|<numbers> | weaknesses seen: none|<W1..W6> | vs exemplar: better|equal|below | verdict: PASS|REDO | the three most valuable concrete fixes | PNGs loaded: <list>
```
The orchestrator reads the reports, computes the pass rule, and sends REDO pieces to the fix loop. A reviewer who passes everything or gives no FAIL reasons is not a reviewer: re-run with a stricter instruction and a different reviewer. Elements: the same with rubric part B, the `--only small` sheets in light AND dark, and the icon exemplars.

## 11. The fix loop

For each REDO piece: one drawing agent (a fresh one is fine, or the author) receives the file, the brief's quality contract, the exemplar and the reviewers' numbered fixes, and redraws only what the notes name; it must lint, look and score again. Then the orchestrator re-runs stage 9, and a reviewer who did not see the previous round re-reviews.
At most 3 rounds per piece (and at most 3 attempts inside a round's agent). A piece that still fails is NOT DONE: remove it from the file (never leave a failing scene registered), keep its draft under `.anim-ref/drafts/`, list the key in the final report with the failing lines, and let the owner decide. Never relax a threshold, add a waiver, edit a test or a tool to make a piece pass: only the orchestrator, on the owner's word, decides about waivers.
If the same defect keeps appearing across pieces (flat skies, nothing lights at night, clone rows), it is a brief problem: add a `--note` and re-issue the batch rather than fixing each piece by hand.

## 12. Elements (small symbols)

The same stages with `element-brief` and `references/small-icons.md`: one agent per GROUP (a pack file has one owner); the lint is `node tools/anim-pack.mjs lint --file src/app/72-anim-pack-eu-west.js --only small`; the look is `sheet --file <that file> --only small --mode light --still --sizes --contact` and `--mode dark`:
judge legibility on the `--sizes` strips (the real 28 px render), the rest frame on `--still`; the score is rubric part B. An element agent reads `small-icons.md`, `style-guide.md` sections 1 and 10 and `rubric.md` part B, not `recipes.md` or `kit-reference.md`. The size table, the meaning of `s` and `w`, and the one-idea rule are in `small-icons.md` (sections 2, 4, 5). Motifs must differ inside the group (five foods in a row are rejected) and from the existing icons of the slot; no two items of a slot draw the same thing (the tests check).

## 13. Integrate

```
node tools/anim-pack.mjs status eu --declare-complete             # when nothing is missing, orphaned, wrong, overlapping, failing or starter: sets complete: true in the config (refuses, exit 2, otherwise); the coverage tests become hard failures
node tools/anim-pack.mjs status eu --strict                       # exit 0: nothing missing, orphaned, wrong, overlapping, failing, waived or starter, and the flag is set
node --test tests/anim-packs.test.mjs tests/eu-pack.test.mjs tests/region-framework.test.mjs tests/anim-quality.test.mjs
node build.mjs --syntax && node build.mjs                          # the whole app builds
npm test                                                           # the whole suite
node tools/privacy-scan.mjs                                        # no personal data, no private path, no email (also in comments and tests); "private terms: none (generic rules only)" means the owner's own term list (`data/privacy-terms.txt`, or one in the data folder) is not present here, so "clean" means clean by the generic rules only; the owner's list applies wherever it exists
```
Then look at the result in the real app on a TEST COPY, never the live data: `node tools/make-test-data.mjs /tmp/<you>/data --finance-from <finance folder>` and `node serve.mjs --data-dir /tmp/<you>/data --port <your port> --no-open`
(never 4173). Settings > Animations > Animation gallery > By pack: open every new item in light and dark, at Subtle and Playful, and with reduced motion; no console errors; the still frame is a finished picture.
Check `git status`: only the region's files, the docs and the MODULES.md row changed; `tools/anim-quality.json` and every test other than the generated one are untouched.

## 14. Docs and release

- `docs/dev/EU_PACK.md`: replace every TODO and angle-bracket paragraph, delete the skeleton note, fill `## Cultural care` (stricter than the general rules, never looser; the safe motifs named) and keep or delete `## Scene suggestions`; make it read like `docs/dev/ASIA_PACK.md`.
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

Do FEWER pieces, each finished to the full standard, and list every key not done. Never register a stub, a skeleton or a piece that has not passed the gates: the region stays `complete: false` until everything is drawn (its coverage checks are todo and `status --strict` fails), which is the honest state, and the repo stays green meanwhile. Order the work so that
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
| the Read tool answers with an error or "[media removed: request limit]" instead of a PNG | the image did not load, so it has NOT been looked at: open it again; if it keeps failing say so, and the lines it carries are FAIL "not looked at" (no guessing from the file name or the source); the report lists the PNGs that loaded |
| `brief` or `plan.json` says PNGs the briefs cite do not exist (`missingPng`) | render the gold standard once: `node tools/anim-pack.mjs reference --render` (light, night and dark) |
| an agent's `guard` lists the region's own scaffold files as untracked (`??`) | the scaffold (and the stubs `brief --out` made) was not committed before the agents started: commit it (`brief` prints the line) and re-run `brief` so that the guard commands carry `--base <commit>` |
| an agent's `guard` lists files of OTHER agents | a shared tree: guard proves the union; the agent names them as not its own, and the orchestrator guards the files of every agent that ran (or each agent works in its own worktree) |
| `npm test` is red during a scaffold | the structural checks are hard even while `complete: false`: an overlap with another region, a duplicate travel id, dead art, a table edited after `animRegionDefine`; the coverage checks are todo and are never the cause |
| `status --strict` exits 2 although everything is drawn | the config still says `complete: false`: `status <id> --declare-complete`, then `--strict` again |
| a rising sun is half up, a leaf or a drop is caught mid-fall in a PNG | the default render is paused at 6.5 s and `sun(..., true)` takes 9 s: `sheet --still` (animations off, the rest frame) or `--at <ms>` |
| the night PNG looks like the day picture with a tint | W1: add a moon-like light, six hero windows, lamps and stars, or paint the night (`recipes.md` section 7) |

## 18. Validating a change to the skill or the briefs (the pilot procedure, optional)

Use it when a change to the skill, a reference, a brief or a tool should make the agents' output better and you want evidence, not an opinion: a made-up region is drawn by agents that have only the skill, then judged blind against the corpus. It costs a few hours of agents. The first run found 60 points of friction and six recurring craft weaknesses; each was resolved or recorded (the tooling ones in code with regression tests, the rest in this skill, the briefs and the docs: `style-guide.md` section 14 and `rubric.md` section 9 hold the weaknesses).

**What the first pilot looked like, as evidence.** A made-up region of four countries in two groups (nine scenes, seven icons: two scene batches, two element batches, four drawing agents), real geography so that the travel ids, the border case and the care notes were real:
1. *Setup agent, a first user.* It followed SKILL.md and `workflow.md` literally, defined the region (`new`, tables, care, `status`), made the briefs and logged every place where the skill or the tools were unclear, wrong, missing or contradictory: 60 items. They were resolved BEFORE the drawing was judged, or recorded as deliberately not fixed with the reason.
2. *Drawing agents*, one file each, from the generated briefs; the orchestrator gated them (lint, `guard`, `status`).
3. *Blind judging.* Three fresh judges scored 20 scenes (the pilot's 9, 8 sampled from the corpus, the 3 first gold scenes) and 15 icons (the pilot's 7, 8 sampled), shuffled, unlabelled.
4. *Result.* Scenes: pilot mean 7.06 against the corpus sample's 4.77 (the sample plus the gold scenes, n = 11); icons: 6.55 against 4.63 (n = 8). Passing by the rule below: 9 of 9 and 7 of 7; no instant-reject vote on any pilot piece; the weakest was 4.5 (a scene-in-a-tile icon). The judges' recurring weaknesses (night renders that are dim copies, coin foliage, cloned shapes, washed palettes, hard-edged water, icons that are scenes in a tile) were found in pilot, corpus and gold pieces alike: they are quality of the house style, which is why they became rubric checks rather than rules for the new work only.

**The procedure.**
1. *Pick the pilot*: a region the corpus does not have (`new <id> "<Name>"`), two groups, about four units, nine scenes and seven icons (one scene batch and one element batch per group), commit the scaffold. Keep every drawn file OUTSIDE the repo afterwards (an archive): the pilot is a test, not a region to ship.
2. *Setup agent.* Prompt: "You are NOT the author of the skill: you are its first user. Follow SKILL.md and references/workflow.md literally. Do the define-the-region part only (scaffold, tables, care notes, `status`, the briefs), draw nothing, and report every place where the skill or the tools were unclear, wrong, missing or contradictory: file, step, what you expected, what happened." Triage the list: fixed in the tooling with a regression test, fixed in the skill, the briefs or the docs, or deliberately not fixed with the reason; never ignore one.
3. *Draw and gate* as stages 8 to 10, with the changed skill and briefs.
4. *Blind comparison.* (a) Render the pilot pieces (scenes light and night, icons light) and a CORPUS sample taken by rule, not by taste: every Nth piece of the accepted hand-drawn scenes and of the symbols, N = ceil(count / 8), starting at N / 2, plus the three first gold scenes as the top reference. (b) Blind them: copy every PNG to one folder under neutral shuffled names (`S01-light.png`, `S01-night.png`, ..., `I01-light.png`), shuffle with `crypto.randomInt`, set every file's modified time to one fixed date, keep the key (blind name, source, ref) OUTSIDE the folder. (c) Three fresh judges (no skill, no brief, no author notes; each sees every piece) give each piece an overall mark (the pilot used 1 to 10 with half points), an instant-reject vote with the reason, and one weakest point; then each lists the weaknesses they saw again and again. A judge who marks everything alike, or gives no reasons, is replaced. (d) Unblind and average per kind.

```js
// the blinding step, a sketch (pieces = [{ source, ref, png: { light, night } }], Node >= 20, no dependencies)
import { copyFileSync, mkdirSync, utimesSync, writeFileSync } from 'node:fs';
import { randomInt } from 'node:crypto';
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const every = (list, n = 8) => { const N = Math.ceil(list.length / n); return Array.from({ length: n }, (_, i) => list[Math.floor(N / 2) + i * N]).filter(Boolean); };   // the corpus sample, by rule
const when = new Date('2026-01-01T00:00:00Z');
mkdirSync('blind', { recursive: true });
const key = shuffle(pieces).map((p, i) => ({ ...p, blind: 'S' + String(i + 1).padStart(2, '0') }));   // use 'I' for icons
for (const p of key) for (const [mode, src] of Object.entries(p.png)) { const dst = `blind/${p.blind}-${mode}.png`; copyFileSync(src, dst); utimesSync(dst, when, when); }
writeFileSync('blind-KEY.json', JSON.stringify(key, null, 1));   // OUTSIDE the folder the judges see
```
5. *The pass rule* (per kind, scenes and icons separately): the pilot's mean is at least the corpus mean minus 0.75; every pilot piece is at least the corpus mean minus 1.0; and no pilot piece has more than ONE instant-reject vote of the three. The rule says "no worse than the corpus"; it does not say "good": the corpus sample includes pieces the judges themselves marked low, so read the judges' weaknesses as well as the numbers.
6. *Feed it back.* Each recurring weakness is a change to a rubric line, a recipe or a brief (that is how W1 to W6 reached `rubric.md` section 9); after a large change, repeat the pilot (or only the kind that failed). A pilot that fails the rule means the CHANGE is not ready, not that the judges are wrong.

