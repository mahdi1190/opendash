# Rubric: the 20-point review, the 8 instant rejects, and how to score

Use this to score your own piece (the author's line) and, in a fresh context, to review someone else's (the reviewer's line). Part A is for full-screen scenes, part B for small 64 x 64 items.
Both are scored out of 20, both have 8 instant rejects, both have a pass mark. The lint is the floor; this is the bar.

Contents: 1 how to review, 2 pass marks, 3 scene rubric (R1 to R20), 4 scene instant rejects, 5 small-item rubric (I1 to I20), 6 item instant rejects, 7 the score line, 8 what a FAIL looks like, 9 the six recurring weaknesses (check each by name).

## 1. How to review (the protocol)

1. Run the lint yourself, do not trust a claim: `node tools/anim-pack.mjs lint --file <file> --rules` (or `--ref <ref>`). Anything but a last line of exactly `PASS: <n> items clean.` is a fail of R20 and of the gate; a line with "documented waivers" means something was waived: not allowed for new work.
2. Render and open the pictures (the Read tool shows PNGs):
   - scene: `node tools/anim-pack.mjs sheet --file <file> --mode light --out <dir> --contact`, then `--mode night`; open both full-size PNGs and the contact sheet (its ~200 px tiles are the thumbnail test of a scene); then `--mode light --crop phone` and `--crop square` (R2: what a portrait phone and a square tile show). Add `--still` (animations off) to judge R18 (a rising `sun(..., true)` takes 9 s: the default 6.5 s render shows it mid-rise) and `--key <key>` to render one scene of a file.
   - item: `sheet --file <file> --only small --mode light --still --sizes --contact --out <dir>` and `--mode dark`. **The 28 px test is the `--sizes` strip** (`<item>-<mode>-sizes.png`: the item at 28, 40, 64 and 128 px at its real pixel size; with `--contact` also one sheet of the strips). The contact-sheet tiles of icons are about 200 px: they show composition, not legibility. `--still` is the rest frame (reduced motion): without it `x-fall`, `x-twinkle` and `x-drop` are caught mid-animation and look like defects that are not.
   - the model exemplar: the orchestrator rendered `reference --render` (light, night and dark) ONCE: the PNGs are in `.anim-ref/`; open the exemplar's PNG for the same mode and hold it next to the piece (working alone, run `reference --render` yourself).
   - **An image that did not load has not been looked at.** The Read tool can answer with an error or with "[media removed: request limit]" instead of the picture: then re-open the PNG (and, if it keeps failing, say so and score the lines it carries as FAIL: "not looked at"). Score a line only after you have seen the picture; list in your report which PNGs actually loaded; never claim a look you did not make. An exemplar PNG that will not display can be replaced for the study step by the brief's written "what it shows" text, but never for the comparison of your own render.
3. Look at the picture FIRST (thumbnail, then full size), then at the numbers (`lint --rules`), then at the source for R12 to R20 and the hygiene lines.
4. A still render cannot show motion. Judge motion (R16 to R18) from the lint's motion rows (`movingGroups`, `motionKinds`, `driftGroups`, `ambientGroups`, `motionZones`, `distinctDurations`, `staggerDelays`) and from reading the `mv()` calls and `x-` classes in the source: which classes, which `--ad` / `--d` / `--dx`, whether any are shared by neighbours.
5. Score every line PASS or FAIL in writing, one short reason per FAIL, then list the instant rejects (or "none"), then give the craft verdict against the nearest exemplar (section 2 defines it).
   How to judge a contact sheet or a strip in a sentence each: **scene thumbnail (contact sheet, about 320 x 180 per tile):** squint, name the subject in one word (R1), count the focal points (one), name the three values (R9, R7), look for a hard bar or slab at the bottom and a missing frame at the sides (R5, R10); **item strip at 28 px (`--sizes`):** name the subject in one word (I1), find the dominant mass and its colour (I3, I5), check the outline survives (I2), then the same strip in dark (I9). "I can't tell what it is" at 28 px is a FAIL of I1, however nice it is at 128.
6. Reviewer independence: a reviewer scores BLIND. It is given the file path and the rendered PNGs, the exemplar, and this rubric; it is NOT given the author's scores or claims, and it never edits the piece.
   A reviewer that cannot render (no browser: `sheet` says "No Chrome, Edge or Chromium found") reviews nothing: it reports "not looked at" and the piece does not pass.

## 2. Pass marks

- Scene: at least 18 of 20 AND zero instant rejects AND every CORE line passes (R1, R2, R9, R11, R16, R19, R20) AND the craft verdict is not `below` AND the redraw targets are met (lint richness >= 0.90 and at most 4 thin spots).
- Small item: at least 18 of 20 AND zero instant rejects AND every CORE line passes (I1, I2, I6, I11, I15, I17) AND the craft verdict against the nearest icon exemplar is not `below` AND the same redraw targets.
- The redraw targets are advisory in `lint` (a miss is printed, never a failure): 68 % of the accepted scenes reach richness 0.90 and 75 % have 4 or fewer thin spots. A piece that still misses them after 3 redraws is reported with its numbers (TARGET MISSES) and the independent reviewer decides.
- The craft verdict has three values: `better`, `equal`, `below`. It compares the piece with its nearest exemplar by the craft SYSTEMS it uses, not by polish: the exemplars are the best ten of the corpus, so almost every new piece is a little less polished than its exemplar, and that is not `below`.
  `below` means a system the exemplar shows is MISSING from the piece: depth planes with haze between them, framing on both sides, a reflection where there is water, lights that come on at night, motion at three depths (items: the one dominant mass, the staggered motions, the ground line). A `below` piece is redrawn, whatever its score.
  The bar is the corpus MEDIAN, not its minimum: a scene that only matches `us-mountain/nm-white-sands` has passed nothing.
- The author's own score is a self-check, never an approval: only an independent blind reviewer's score counts.
- Anything not looked at is a FAIL of its lines. Do not score a line you did not check.

## 3. Part A: the scene rubric (full-screen 1600 x 900)

Render at 1600 x 900 (paused at 6.5 s) in light AND night, next to the model exemplar.

### Composition
| # | Line | PASS when | Check |
| --- | --- | --- | --- |
| R1 | Reads in one second (CORE) | at 320 x 180 the landmark is identifiable and there is ONE focal point | the contact sheet; FAIL if two things compete or the thumbnail is a mush |
| R2 | Landmark in the safe area (CORE) | the whole subject lives inside x 350..1250 and y 40..840 (a square tile shows the central 900 units), the part that identifies it inside x 590..1010 (a portrait phone shows only the central 420 to 506), covered by at most about 15 % foreground | `sheet --crop phone` and `--crop square`: it is still the picture in both |
| R3 | Horizon and weights | horizon or waterline between y 520 and 700; the focal weight is off-axis or centred deliberately; light behind or beside the landmark, not in front | |
| R4 | Five or more planes | at least 5 distinguishable planes (sky, far, mid, water or ground, landmark, near, frame) separated by a value step or a haze band | lint `bands` and `bandFills` near the median (8 and 6) |
| R5 | Framing and lead-in | a dark framing element on each side (or a perspective lead-in); the bottom 20 % has structure (rail, lamps, pier, path, reeds), not an empty slab | lint `bottomCover` 1 is only the floor |

### Colour and light
| # | Line | PASS when | Check |
| --- | --- | --- | --- |
| R6 | Sky built properly | 4 stops at dusk or dawn (3 by day), horizon >= .2 lighter, a sun or moon with halo, 1 to 2 streaks, 2 to 3 clouds with tinted bellies, rays or a glow overlay | lint `skyStops` |
| R7 | One palette, with a dark anchor | <= 9 hue families, <= 3 small saturated accents, tinted shadows (no black, no neutral grey), mean saturation near .5 to .6, ONE tinted value near L .10 to .15 in the frame at both edges; FAIL for rainbow fills or washed pastel with no dark (W4) | lint `hueSectors` <= 5 ideal (the 5-stop dusk sky already costs four), `tonalRange` >= .92; squint: three values read |
| R8 | One light | ONE sun or moon; rays, glow, glints, lit facets and cast shadows agree; no lens flare in the foreground; reflections under the light | |
| R9 | Value structure (CORE) | squint: lightest at the horizon glow, darkest at the frame edges (L <= .25), the landmark with the strongest local contrast | |
| R10 | Atmosphere | far planes lighter and greyer, a haze band at every plane change, a water reflection (.3 to .4) where water exists, no hard seams or bars; water and ground are not hard-edged slabs: a waterline glow, a light column, a wake or reef line, banks over the corners (W5) | the water recipe, `recipes.md` section 3 |

### Craft and detail
| # | Line | PASS when | Check |
| --- | --- | --- | --- |
| R11 | Landmark craft (CORE) | at least TWO detail systems (window grids, tiers, struts, arches, bands, finials) plus a lit-side facet; FAIL for stacked rectangles or a single-colour silhouette | |
| R12 | Organic forms shaped | crowns have a silhouette and a tone hierarchy (not coins: squint, you must not be able to count the circles); mountains have ridgelines, faces and a snow hem; ferns, palms and bushes are shaped; clouds come from `cloud()` (W2) | style-guide section 8, `crown3()` and the helpers of `recipes.md` section 6 |
| R13 | Lights are layered; the night is not a dim copy | windows and lamps are `lit()` or `dots(..., 'us-lamps')` over pale day glass, hero windows lit, `stars()` present; a night PICTURE paints its moon, stars and windows always-on and adds the classes on top; the NIGHT render comes alive: a moon-like light that is the only one, at least six hero windows and a lamp row, 24 or more stars, the landmark readable. FAIL when the night PNG is the day picture with a tint, the sun disc and rays still bright and nothing lit (W1) | open the night PNG beside the light PNG; `recipes.md` section 7 |
| R14 | No text-like or noise marks | no letters, no tiled boxes that read as writing, no strokes taller than about 90 px over the subject, no barcode flowers | |
| R15 | No clones, no crude figures | repeated objects vary in scale, pose, spacing AND a parameter (width, pitch, lean, tone): no stamped house rows, no identical buttes under one stripe pattern, no mirrored left and right pairs; creatures are smooth silhouettes or tiny; no portraits, faces or crowds (a tiny faceless scale-cue silhouette is fine) (W3) | lint `distinctRatio`, `distinctForms`, `sharedShare`; `recipes.md` section 4 |

### Motion
| # | Line | PASS when | Check |
| --- | --- | --- | --- |
| R16 | Alive at three depths (CORE) | at least 25 moving groups and 7 kit classes: sky (drift, birds), middle (glints, boats, parallax), foreground (sway), plus ONE place-specific motion | lint `movingGroups` >= 25, `motionKinds` >= 7, `motionZones` 3; the median is 60 and 9, so 25 is the p10-ish bar, not the target |
| R17 | Motion is tuned | parallax 6 to 26 px over 26 to 120 s; clouds +-90 px over 46 to 80 s; birds 500 to 700 px over 16 to 26 s; sway .8 deg / 3 deg over 5 to 9 s; every repeat has its own period and a NEGATIVE delay; loops hidden by `usglide` / `usfall` fades or off-screen `usmove` travel; only transform and opacity | lint `distinctDurations` >= 18, `staggerDelays` >= 13 |
| R18 | Still frame is a finished picture | with animation off the scene is complete: nothing important at opacity 0, the sun in its final place (`usrise` ends in place), nothing clipped | `sheet --still` IS the still frame (the default render is paused at 6.5 s, and a rising sun takes 9 s) |

### Technical
| # | Line | PASS when | Check |
| --- | --- | --- | --- |
| R19 | Finish and grade (CORE) | `finish(.28 to .38)` is the last element; `us-tint` present; the night render keeps the landmark readable with lights on | lint `evening-grade-last` |
| R20 | Budget and hygiene (CORE) | the lint's last line is `PASS: <n> items clean.` with no waiver; 14 to 29 KB rendered (hard cap 32,000); >= 5 gradients, >= 27 colours, >= 65 shapes; ids from `U()`; no `transform` on an `x-` element; none of the markup the lint rejects (text, image, `use`, pattern, mask, symbol, filter, style, SMIL, href); no `NaN`; balanced tags; the author edited no threshold, test or tool | `git diff -- tools/anim-quality.json tests` is empty for this work |

## 4. Part A: the 8 instant rejects (any one fails the scene, no scoring)

1. A flat sky: one or two stops, or no sun, glow or cloud layer.
2. Lettering of any kind, text-like tile arrays, flags, maps or borders, political or military symbols, portraits, faces, crowds or identifiable people (a tiny anonymous faceless silhouette as a scale cue is allowed), holy figures (the care rules apply to every region).
3. The landmark is hidden, cropped by the square crop (x 350..1250) or with nothing that identifies it inside the phone crop (x 590..1010), smaller than about 25 % of the height, or covered by foreground.
4. No framing foreground AND an empty bottom third; or a foreground that blocks the picture (tall dense strokes).
5. A dead scene: fewer than 25 moving groups, fewer than 5 kit classes, or no foreground motion.
6. Trees or crowns as plain stacked opaque circles, mountains as bare triangles, clouds from three circles, buildings as bare boxes with no windows or lit side.
7. No `finish()` or evening grade, or the night render is just a dim copy (no `us-lit`, `us-lamps` or `us-star`); or a scene of 31,000 bytes or more.
8. Clone-stamped or crude hero creatures or figures, incoherent light (sun and moon together), invalid markup (`transform` on an `x-` element, duplicate ids, `NaN`), or the piece is a recolour or re-dress of another scene (the lint's `sharedShare` measures it).

## 5. Part B: the small-item rubric (64 x 64 symbols and elements)

Render with `sheet --file <pack file> --only small --still --sizes --contact` in light AND dark; judge legibility on the `--sizes` strip (the real 28 px render), composition on the contact sheet; compare with the nearest icon exemplar (`small-icons.md` lists them).

### Read and silhouette
| # | Line | PASS when |
| --- | --- | --- |
| I1 | Reads at 28 px (CORE) | on the `--sizes` strip (the real 28 px render) the subject is identifiable at a glance and you can name it in one word; ONE idea and ONE dominant mass of at least 36 x 36 units; FAIL if it reads as a smudge, noise, a scene in a tile (W6) or the wrong object |
| I2 | Silhouette first (CORE) | drawn in one colour it is still the subject; features of at least 3 units; no hairlines |
| I3 | At most 3 big colour areas | hero `c`, ink `k`, tint `s`, surface `w`; the rest are small; the hero mass carries the swatch colour (`c`): FAIL for grey on grey |
| I4 | Composition | the mass is centred and clear of the tile edge (inside about x 4..60); anchored by a ground line (`lm`, y 54 to 62) or a wave band; one off-centre accent (sparkle, bubble, sun) balances it |
| I5 | Specific, not generic | the motif is the place's own (an animal, plant, food, craft, instrument or building detail its people recognise), a close-up for an element, a silhouette on a ground line for a signature |

### Style
| # | Line | PASS when |
| --- | --- | --- |
| I6 | Theme classes only (CORE) | fills `k c s w m`, strokes `lk lc lm lw`, `t`, `dash`, `o-b o-t o-l o-v`; ZERO hex, ZERO inline `fill=` / `stroke=` / `stroke-width=`, no gradient, no `<style>` (lint `colours`, `inlinePaint`, `gradients` = 0) |
| I7 | Stroke hierarchy | primary contour `t` (3.4), interior detail `lk` (2.4), highlights and wave tops `lw` (1.4); not everything the same weight |
| I8 | Tone budget | one hero colour plus ink, tint and surface; depth by `s / m / c` fills and opacity, not by new colours |
| I9 | Works in dark and in other swatches | the dark render has no invisible part and no black hole: `w` is the SURFACE (near-black in dark), so a pale mass is `w lk` / `w t` (outlined) or `s` / `c`, a large plain `w` area is a hole, and only small `w` features (eyes, highlights, beads) are plain; `s` is a 24 % tint, so overlapping `s` shapes darken; nothing relies on a colour the theme does not give (`small-icons.md` section 2, "pale objects") |
| I10 | Care | nothing text-like, no flag, map, political or military symbol, no portrait, face or identifiable person, no holy figure |

### Motion
| # | Line | PASS when |
| --- | --- | --- |
| I11 | Alive (CORE) | at least 3 moving groups and 2 motion kinds on different parts (corpus median 5 and 3; lint floor 1 and 1); not one global wobble |
| I12 | Staggered | `--d` steps of .3 to .6 s; no three things with the same delay; nothing in lockstep |
| I13 | No `transform` attribute on an `x-` element | wrap in `<g transform>`; the lint rule `x-transform` |
| I14 | Gentle, seamless | wave bands are wider than the tile with a 12-unit period; falls and rises fade at the ends; amplitudes small |
| I15 | Still frame complete (CORE) | with animation off the drawing is whole: nothing hidden at rest (lint `hiddenShapes` <= 3, ideal 0); judged on `sheet --still`, never on the 6.5 s paused frame |
| I16 | Nesting is correct | compound motion uses wrappers: a body that bobs around a head that nods; a flame inside a bobbing lamp |

### Technical
| # | Line | PASS when |
| --- | --- | --- |
| I17 | Budget and lint (CORE) | the lint's last line is `PASS: <n> items clean.` with no waiver; the ONE size table (`small-icons.md` section 4): `svg()` 780 to 1,700 B aimed at, rendered 1.0 to 1.9 KB (median 1.0, the exemplars 1.4 to 1.9), **the ceiling 1,800 B `svg()` / 2.0 KB rendered, the corpus maximum: above it FAIL** (the lint cannot see it, so the author reports the bytes and the reviewer fails it); hard cap 14,000 |
| I18 | Different from its siblings | no two items of a slot draw the same thing; not a recolour of another icon; its own composition |
| I19 | Looked at | the light and dark `--still` PNGs, the `--sizes` strips and the contact sheet were opened and LOADED (a PNG that did not display is not looked at), with one concrete observation and one defect per render written down, and the craft verdict against the exemplar is written |
| I20 | Hygiene | unique ids within the pack, the builder's id rules (`B.element('JP', {id: 'sushi'})` gives `jp-sushi`), `reduced` default `'static'` kept, no thresholds, tests or tools edited |

## 6. Part B: the 8 instant rejects for small items

1. Illegible at 28 px: a blob, noise, hairlines, or it reads as the wrong thing (the "four bottles" canal houses).
2. A hex colour, an inline paint attribute, a gradient, or a `<style>` in the item.
3. Text-like marks, a flag, a map, a political or military symbol, a portrait, face or identifiable person, a holy figure.
4. No motion, or all motion in lockstep (three or more things with the same `--d`).
5. A `transform` attribute on an `x-` element, a duplicate id, `NaN` or `undefined`, invalid markup.
6. A clone or recolour of another icon, or two items of one slot that draw the same thing.
7. A full-tile background rect (the page draws the tile) or the content outside about x 4..60 where the rounded tile crops it.
8. Padded: over the 2.0 KB rendered ceiling (`svg()` 1,800 B) with nothing to show for it, invisible filler shapes, or the lint needed a waiver or a threshold edit.

## 7. The score line (copy this format, one per piece)

Scene:
```
place:example | 24.3 KB | lint PASS (0 waivers) | model: us-midwest/mi-mackinac-bridge | R1-R20: PPPPFPPPPFPPPPPPPPPP (R5 fails: the bottom fifth is an empty slab; R10 fails: no haze at the far shore) = 18/20 | instant rejects: none | vs exemplar: equal | weakest: R5 | looked: light, night, contact
```
Item:
```
B.element('XX', 'motif') | 812 B | lint PASS (0 waivers) | model: asia-east/tw-bubble-tea | I1-I20: PPPPPPPPPPPPPPPPPPPP = 20/20 | instant rejects: none | vs exemplar: equal | looked: light, dark, contact at 28 px
```
A reviewer's line has the same fields plus `reviewer: <n>` and omits "weakest" only if there is none. Every FAIL has a reason. A line with a missing field, "looked" listing a render that was not opened, or a score without the 20-character string is not a score.

## 8. What a FAIL looks like (the "do better than these" list, printed by `reference`)

These are ACCEPTED scenes of the corpus that fall below the bar; they are why the rubric exists. Open their PNGs once so that you recognise the failure.

| Ref | What is wrong (rubric lines) |
| --- | --- |
| `asia-west/sa-signature` | five identical camels in a row (R15), a rock arch that is one fat blob with parallel stripes (R11, R12), flat ellipse clouds (R6, R12), an empty middle distance (R4) |
| `texas/el-paso-star-scene` | a flat purple mountain over a plain dark strip, almost no foreground or atmosphere, little moves (R4, R5, R10, R16) |
| `us-mountain/nm-white-sands` | pale blob dunes with no tonal contrast, two stick plants (R9, R12, R5); a sun and a moon together (R8) |
| `uk-north-west/derbyshire-stanage-edge` | a single beige slab with parallel stripes, muddy olive and grey, template sky (R7, R11, R12) |
| `asia-west/abu-dhabi-skyline` | white arcade on white: tonal range .82, no shadow side or depth layers (R9, R10, R11) |
| `uk-south-east/west-sussex-ardingly-show` | five identical white tents stamped in a row, grey dots for figures, a template sky (R15, R6) |

## 9. The six recurring weaknesses (check each by name)

Three fresh blind judges scored the pilot's pieces and a sample of the corpus (`workflow.md` section 18). The same six weaknesses came back in all three panels, on pilot, corpus and gold pieces alike (`style-guide.md` section 14 has the fixes and the examples). A reviewer names each one explicitly, as seen or not seen, for every piece, and the author checks them before scoring:

| # | Check (ask it of the PNGs, light AND night) | Lines | Fail looks like | One example of the fix |
| --- | --- | --- | --- | --- |
| W1 | Is the night render a different picture, or the day picture dimmed? | R13, R19, instant reject 7 | the sun disc and rays unchanged, no windows lit, few stars | a moon, 6+ hero windows, a lamp row, 24+ stars (`recipes.md` section 7) |
| W2 | Can you count the circles in a crown or a bush? Is a palm a mushroom? | R12, instant reject 6 | flat overlapping coins, one tone, fringed or domed palms | `crown3()`, `bush()`, `treeFern()` (`recipes.md` section 6) |
| W3 | Is any object stamped (same shape, same size, or mirrored)? Is any building a bare box? | R15, R11, instant reject 6 and 8 | identical houses or buttes in a row, a left and right pair, window-less blocks | a function with baked-in scale and a new width, pitch, lean and tone per instance; pale glass plus lamps |
| W4 | Is there ONE dark value, and does the landmark carry the strongest contrast? | R7, R9 | milky pastel, no value darker than L .5, a landmark that dissolves into its glow | tinted L .10 to .15 in the frame at both edges (`recipes.md` section 3) |
| W5 | Is the water or the ground a hard-edged slab with straight edges, no reflection, no glow on the waterline? Are the skyline rows in one value? | R10, R4, R5 | a gradient rect with a straight top and hard vertical seams at the canvas edges | the water recipe: ramp, waterline strip, light column, wake, reflection, banks over the corners |
| W6 (items) | Is it a scene in a tile (more than three supports, no dominant mass), grey on grey, or a hard water rectangle? | I1, I3, I5, I9, instant reject 1 | a cloud, rain, a palm, a boat, hills and two wave bands in 64 units; a pale blob that turns black in dark | one noun phrase, one mass of 36+ units in `c`, a plate whose top edge is the wave (`small-icons.md` section 5) |

Each weakness SEEN is a FAIL of the lines it names (a PASS needs a reason you can point at in the PNG), so the usual pass mark applies: 18 of 20, every core line, no instant reject, verdict not `below`. They are also the first place to look for the "three most valuable fixes" of a REDO, and a weakness that a piece shows while its nearest exemplar does not is a missing craft system: that is `below`.

