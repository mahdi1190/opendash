# Rubric: the 20-point review, the 8 instant rejects, and how to score

Use this to score your own piece (the author's line) and, in a fresh context, to review someone else's (the reviewer's line). Part A is for full-screen scenes, part B for small 64 x 64 items.
Both are scored out of 20, both have 8 instant rejects, both have a pass mark. The lint is the floor; this is the bar.

Contents: 1 how to review, 2 pass marks, 3 scene rubric (R1 to R20), 4 scene instant rejects, 5 small-item rubric (I1 to I20), 6 item instant rejects, 7 the score line, 8 what a FAIL looks like.

## 1. How to review (the protocol)

1. Run the lint yourself, do not trust a claim: `node tools/anim-pack.mjs lint --file <file> --rules` (or `--ref <ref>`). Anything but a last line of exactly `PASS: <n> items clean.` is a fail of R20 and of the gate; a line with "documented waivers" means something was waived: not allowed for new work.
2. Render and open the pictures (the Read tool shows PNGs):
   - scene: `node tools/anim-pack.mjs sheet --file <file> --mode light --out <dir> --contact`, then `--mode night`; open both full-size PNGs and the contact sheet (the contact sheet is the 320 px thumbnail test).
   - item: `sheet --file <file> --only small --mode light --out <dir> --contact` and `--mode dark`; open them AND judge the contact sheet (it is the nearest thing to 28 px).
   - the model exemplar: `node tools/anim-pack.mjs reference --render` (and `--mode night`) writes `.anim-ref/*.png`; open the exemplar's PNG for the same mode and hold it next to the piece.
3. Look at the picture FIRST (thumbnail, then full size), then at the numbers (`lint --rules`), then at the source for R12 to R20 and the hygiene lines.
4. A still render cannot show motion. Judge motion (R16 to R18) from the lint's motion rows (`movingGroups`, `motionKinds`, `driftGroups`, `ambientGroups`, `motionZones`, `distinctDurations`, `staggerDelays`) and from reading the `mv()` calls and `x-` classes in the source: which classes, which `--ad` / `--d` / `--dx`, whether any are shared by neighbours.
5. Score every line PASS or FAIL in writing, one short reason per FAIL, then list the instant rejects (or "none"), then give the verdict against the exemplar.
6. Reviewer independence: a reviewer scores BLIND. It is given the file path and the rendered PNGs, the exemplar, and this rubric; it is NOT given the author's scores or claims, and it never edits the piece.
   A reviewer that cannot render (no browser: `sheet` says "No Chrome, Edge or Chromium found") reviews nothing: it reports "not looked at" and the piece does not pass.

## 2. Pass marks

- Scene: at least 18 of 20 AND zero instant rejects AND every CORE line passes (R1, R2, R9, R11, R16, R19, R20) AND the side-by-side verdict is "equal or better than the exemplar".
- Small item: at least 18 of 20 AND zero instant rejects AND every CORE line passes (I1, I2, I6, I11, I15, I17) AND the verdict against the nearest icon exemplar is "equal or better".
- The verdict has three values: `better`, `equal`, `below`. "Slightly below" is `below`. A `below` piece is redrawn, whatever its score. The bar is the corpus MEDIAN, not its minimum: a scene that only matches `us-mountain/nm-white-sands` has passed nothing.
- Anything not looked at is a FAIL of its lines. Do not score a line you did not check.

## 3. Part A: the scene rubric (full-screen 1600 x 900)

Render at 1600 x 900 (paused at 6.5 s) in light AND night, next to the model exemplar.

### Composition
| # | Line | PASS when | Check |
| --- | --- | --- | --- |
| R1 | Reads in one second (CORE) | at 320 x 180 the landmark is identifiable and there is ONE focal point | the contact sheet; FAIL if two things compete or the thumbnail is a mush |
| R2 | Landmark in the safe area (CORE) | the subject lives inside x 200..1400 and y 40..840, covered by at most about 15 % foreground | check the 4:3 (middle 1200 wide) and 1:1 (middle 900 wide) crops by eye |
| R3 | Horizon and weights | horizon or waterline between y 520 and 700; the focal weight is off-axis or centred deliberately; light behind or beside the landmark, not in front | |
| R4 | Five or more planes | at least 5 distinguishable planes (sky, far, mid, water or ground, landmark, near, frame) separated by a value step or a haze band | lint `bands` and `bandFills` near the median (8 and 6) |
| R5 | Framing and lead-in | a dark framing element on each side (or a perspective lead-in); the bottom 20 % has structure (rail, lamps, pier, path, reeds), not an empty slab | lint `bottomCover` 1 is only the floor |

### Colour and light
| # | Line | PASS when | Check |
| --- | --- | --- | --- |
| R6 | Sky built properly | 4 stops at dusk or dawn (3 by day), horizon >= .2 lighter, a sun or moon with halo, 1 to 2 streaks, 2 to 3 clouds with tinted bellies, rays or a glow overlay | lint `skyStops` |
| R7 | One palette | <= 9 hue families, <= 3 small saturated accents, tinted shadows (no black, no neutral grey), mean saturation near .5 to .6; FAIL for rainbow fills or washed pastel with no dark | lint `hueSectors` <= 5 ideal, `tonalRange` >= .92 |
| R8 | One light | ONE sun or moon; rays, glow, glints, lit facets and cast shadows agree; no lens flare in the foreground; reflections under the light | |
| R9 | Value structure (CORE) | squint: lightest at the horizon glow, darkest at the frame edges (L <= .25), the landmark with the strongest local contrast | |
| R10 | Atmosphere | far planes lighter and greyer, a haze band at every plane change, a water reflection (.3 to .4) where water exists, no hard seams or bars | |

### Craft and detail
| # | Line | PASS when | Check |
| --- | --- | --- | --- |
| R11 | Landmark craft (CORE) | at least TWO detail systems (window grids, tiers, struts, arches, bands, finials) plus a lit-side facet; FAIL for stacked rectangles or a single-colour silhouette | |
| R12 | Organic forms shaped | crowns have a silhouette and a tone hierarchy (not coins); mountains have ridgelines, faces and a snow hem; clouds come from `cloud()` | style-guide section 8 |
| R13 | Lights are layered | windows and lamps are `lit()` or `dots(..., 'us-lamps')` over pale day glass, hero windows lit, `stars()` present; the NIGHT render comes alive (lights on, tint, stars) | open the night PNG |
| R14 | No text-like or noise marks | no letters, no tiled boxes that read as writing, no strokes taller than about 90 px over the subject, no barcode flowers | |
| R15 | No clones, no crude figures | repeated objects vary in scale, pose and spacing; creatures are smooth silhouettes or tiny; no people | lint `distinctRatio`, `sharedShare` |

### Motion
| # | Line | PASS when | Check |
| --- | --- | --- | --- |
| R16 | Alive at three depths (CORE) | at least 25 moving groups and 7 kit classes: sky (drift, birds), middle (glints, boats, parallax), foreground (sway), plus ONE place-specific motion | lint `movingGroups` >= 25, `motionKinds` >= 7, `motionZones` 3; the median is 60 and 9, so 25 is the p10-ish bar, not the target |
| R17 | Motion is tuned | parallax 6 to 26 px over 26 to 120 s; clouds +-90 px over 46 to 80 s; birds 500 to 700 px over 16 to 26 s; sway .8 deg / 3 deg over 5 to 9 s; every repeat has its own period and a NEGATIVE delay; loops hidden by `usglide` / `usfall` fades or off-screen `usmove` travel; only transform and opacity | lint `distinctDurations` >= 18, `staggerDelays` >= 13 |
| R18 | Still frame is a finished picture | with animation off the scene is complete: nothing important at opacity 0, the sun in its final place (`usrise` ends in place), nothing clipped | the PNG IS the still frame |

### Technical
| # | Line | PASS when | Check |
| --- | --- | --- | --- |
| R19 | Finish and grade (CORE) | `finish(.28 to .38)` is the last element; `us-tint` present; the night render keeps the landmark readable with lights on | lint `evening-grade-last` |
| R20 | Budget and hygiene (CORE) | the lint's last line is `PASS: <n> items clean.` with no waiver; 14 to 29 KB rendered (hard cap 32,000); >= 5 gradients, >= 27 colours, >= 65 shapes; ids from `U()`; no `transform` on an `x-` element; no text, image, `use`, style, SMIL, href; no `NaN`; balanced tags; the author edited no threshold, test or tool | `git diff -- tools/anim-quality.json tests` is empty for this work |

## 4. Part A: the 8 instant rejects (any one fails the scene, no scoring)

1. A flat sky: one or two stops, or no sun, glow or cloud layer.
2. Lettering of any kind, text-like tile arrays, flags, maps or borders, political or military symbols, real people, holy figures (the care rules apply to every region).
3. The landmark is hidden, cropped by the safe area, smaller than about 25 % of the height, or covered by foreground.
4. No framing foreground AND an empty bottom third; or a foreground that blocks the picture (tall dense strokes).
5. A dead scene: fewer than 25 moving groups, fewer than 5 kit classes, or no foreground motion.
6. Trees or crowns as plain stacked opaque circles, mountains as bare triangles, clouds from three circles, buildings as bare boxes with no windows or lit side.
7. No `finish()` or evening grade, or the night render is just a dim copy (no `us-lit`, `us-lamps` or `us-star`); or a scene of 31,000 bytes or more.
8. Clone-stamped or crude hero creatures or figures, incoherent light (sun and moon together), invalid markup (`transform` on an `x-` element, duplicate ids, `NaN`), or the piece is a recolour or re-dress of another scene (the lint's `sharedShare` measures it).

## 5. Part B: the small-item rubric (64 x 64 symbols and elements)

Render with `sheet --file <pack file> --only small` in light AND dark; judge the contact sheet as a 28 px thumbnail; compare with the nearest icon exemplar (`small-icons.md` lists them).

### Read and silhouette
| # | Line | PASS when |
| --- | --- | --- |
| I1 | Reads at 28 px (CORE) | on the contact sheet the subject is identifiable at a glance; ONE dominant mass of at least 36 x 36 units; FAIL if it reads as a smudge, noise or the wrong object |
| I2 | Silhouette first (CORE) | drawn in one colour it is still the subject; features of at least 3 units; no hairlines |
| I3 | At most 3 big colour areas | hero `c`, ink `k`, tint `s`, surface `w`; the rest are small |
| I4 | Composition | the mass is centred and clear of the tile edge (inside about x 4..60); anchored by a ground line (`lm`, y 54 to 62) or a wave band; one off-centre accent (sparkle, bubble, sun) balances it |
| I5 | Specific, not generic | the motif is the place's own (an animal, plant, food, craft, instrument or building detail its people recognise), a close-up for an element, a silhouette on a ground line for a signature |

### Style
| # | Line | PASS when |
| --- | --- | --- |
| I6 | Theme classes only (CORE) | fills `k c s w m`, strokes `lk lc lm lw`, `t`, `dash`, `o-b o-t o-l o-v`; ZERO hex, ZERO inline `fill=` / `stroke=` / `stroke-width=`, no gradient, no `<style>` (lint `colours`, `inlinePaint`, `gradients` = 0) |
| I7 | Stroke hierarchy | primary contour `t` (3.4), interior detail `lk` (2.4), highlights and wave tops `lw` (1.4); not everything the same weight |
| I8 | Tone budget | one hero colour plus ink, tint and surface; depth by `s / m / c` fills and opacity, not by new colours |
| I9 | Works in dark and in other swatches | the dark render has no invisible part and no black hole; nothing relies on a colour the theme does not give |
| I10 | Care | nothing text-like, no flag, map, political or military symbol, no real person, no holy figure |

### Motion
| # | Line | PASS when |
| --- | --- | --- |
| I11 | Alive (CORE) | at least 3 moving groups and 2 motion kinds on different parts (corpus median 5 and 3; lint floor 1 and 1); not one global wobble |
| I12 | Staggered | `--d` steps of .3 to .6 s; no three things with the same delay; nothing in lockstep |
| I13 | No `transform` attribute on an `x-` element | wrap in `<g transform>`; the lint rule `x-transform` |
| I14 | Gentle, seamless | wave bands are wider than the tile with a 12-unit period; falls and rises fade at the ends; amplitudes small |
| I15 | Still frame complete (CORE) | with animation off the drawing is whole: nothing hidden at rest (lint `hiddenShapes` <= 3, ideal 0) |
| I16 | Nesting is correct | compound motion uses wrappers: a body that bobs around a head that nods; a flame inside a bobbing lamp |

### Technical
| # | Line | PASS when |
| --- | --- | --- |
| I17 | Budget and lint (CORE) | the lint's last line is `PASS: <n> items clean.` with no waiver; `svg()` of 600 to about 1,700 bytes (median 650 to 780; above about 1.7 KB is an outlier), hard cap 14,000 rendered |
| I18 | Different from its siblings | no two items of a slot draw the same thing; not a recolour of another icon; its own composition |
| I19 | Looked at | light and dark PNGs and the contact sheet were opened, at xs and large, and the verdict against the exemplar is written |
| I20 | Hygiene | unique ids within the pack, the builder's id rules (`B.element('JP', {id: 'sushi'})` gives `jp-sushi`), `reduced` default `'static'` kept, no thresholds, tests or tools edited |

## 6. Part B: the 8 instant rejects for small items

1. Illegible at 28 px: a blob, noise, hairlines, or it reads as the wrong thing (the "four bottles" canal houses).
2. A hex colour, an inline paint attribute, a gradient, or a `<style>` in the item.
3. Text-like marks, a flag, a map, a political or military symbol, a real person, a holy figure.
4. No motion, or all motion in lockstep (three or more things with the same `--d`).
5. A `transform` attribute on an `x-` element, a duplicate id, `NaN` or `undefined`, invalid markup.
6. A clone or recolour of another icon, or two items of one slot that draw the same thing.
7. A full-tile background rect (the page draws the tile) or the content outside about x 4..60 where the rounded tile crops it.
8. Padded: over about 1.7 KB with nothing to show for it, invisible filler shapes, or the lint needed a waiver or a threshold edit.

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
