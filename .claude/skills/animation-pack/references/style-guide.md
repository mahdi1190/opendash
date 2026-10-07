# Style guide: the visual and motion language of OpenDash animations

Measured on the real corpus (397 full scenes: US 88, Asia 132, Texas 9, UK 168; 575 small items) and checked by rendering and looking at 73 scenes in light, 8 at night and 24 icons at 28 /
64 / 132 px. The UK scenes are templated (their own `hx-` kit, "legacy"): do not learn from them. The strict set is the 229 hand-drawn US, Asia and Texas scenes; new work is judged by it.
Numbers are medians unless marked (p10 / p90 = the 10th / 90th percentile). Refs are `pack/item` as `node tools/anim-pack.mjs reference` prints them.

Contents: 1 the twelve sentences, 2 ground facts, 3 composition, 4 sky and light, 5 depth and atmosphere, 6 palette, 7 landmarks, 8 organic forms and creatures, 9 night,
10 motion, 11 budgets, 12 defect catalogue, 13 exemplars and their weak spots, 14 the six weaknesses the pilot's judges found again and again.

## 1. The house style in twelve sentences

1. A scene is a 1600 x 900 flat-vector painting of 5 to 14 gradients and 90 to 500 drawn elements (median about 250, 23 KB), always built back to front in the same ten layers: sky, light, sky life, far plane, mid plane, water or ground, landmark, subject life, near plane and framing, `finish()`.
2. The sky is the palette: 3 to 5 stops, lighter by about .35 in lightness at the horizon, a low halo-and-rays sun, 1 to 2 streaks, 2 to 3 gradient clouds with tinted bellies, birds.
3. Depth: planes get darker, more saturated and less hazy toward the viewer, with a `haze()` band at every boundary and a mirrored reflection (.3 to .4) in water. The darkest value (lightness <= .15, tinted, never black) is the framing foreground at both edges.
4. The subject sits in the middle (its identifying part inside x 590 to 1010, the whole of it inside x 350 to 1250: what a portrait phone and a square tile show), lit from behind or beside, with at least two detail systems (window rows, tiers, struts, arches) and a translucent lit-side or shadow-side facet; structures are computed (loops, catenaries, scale ladders), not scribbled.
5. Palette: one dominant hue family (sky, haze, water, far planes), one or two secondary families, at most three small saturated accents; mean saturation about .54; no pure black, no grey.
6. Any time of day is fine and the scene must read in the LIGHT theme as drawn (most are daylight, golden hour or dusk; a night scene is painted as night: `us-pacific/anchorage-aurora-moose`); one `finish(.30)` goes last and adds a vignette and the evening grade (it darkens the scene in the dark theme and at night), and the lights that should switch on at night are separate `us-lit` / `us-lamps` / `us-star` elements.
7. Everything alive uses the 17 kit classes, transform and opacity only: drift and parallax, birds, glints, boats and traffic, bobs, sways, flames, falls; median 65 moving groups and 9 kit classes per scene.
8. Nothing is in sync: every repeat has its own period and a negative delay, so the picture is already mid-motion at t = 0 and the loops are invisible.
9. Small icons are 64 x 64 drawings in theme classes only (`k c s w m`, `lk lc lm lw`, `t`, `dash`; zero hex), aimed at 1.0 to 1.9 KB rendered (median 1.0, the exemplars 1.4 to 1.9, ceiling 2.0 KB: the one size table is in `small-icons.md` section 4), about 12 shapes, ONE idea and one dominant mass, a median of 5 independently staggered `x-*` groups in 3 kinds (the exemplars 7 to 14), a wave band or ground line and one sparkle; they must read at 28 px (the `--sizes` strip) and in the dark theme.
10. Never: flat skies, stacked-coin crowns, bare box buildings, an empty bottom third, hair-like foreground strokes, letter-like marks, clone-stamped creatures, sun and moon together, a scene with nothing to light at night, a scene near the 32,000-byte cap.
11. Review means rendering and looking: light and night, a 320 px thumbnail, side by side with the model exemplar, against the rubric (`rubric.md`).
12. Passing the lint is the floor; the bar is the corpus median.

## 2. Ground facts

| Fact | Value |
| --- | --- |
| Canvas | `viewBox="0 0 1600 900"`, `preserveAspectRatio="xMidYMid slice"`; layers run x -160 to 1760 so they can drift; the subject lives inside y 40 to 840, its identifying part inside x 590 to 1010 and the whole of it inside x 350 to 1250 (next row) |
| Crops | the scene fills the screen, so a screen of the same height and width W shows the central W of the 1600 units: 16:9 on a desktop (all 1600), 4:3 the middle 1200, a square tile the middle 900 (x 350 to 1250), a portrait phone only the middle 420 to 506 (x 590 to 1010 at the narrowest, x 547 to 1053 at 9:16). The outer 350 units carry framing (foliage, cables, lamps), water, sky and distance, not the story. `sheet --crop phone` and `--crop square` render those crops: look at them |
| Time on screen | the opening plays full screen for 2.4 s (subtle), 3.4 s (standard), 4.2 s (playful): the picture must read at a glance and its first motion must already be visible |
| Byte cap | 32,000 rendered bytes per scene, 14,000 per small item (`ANIM_FULL_ITEM_MAX_BYTES`, `ANIM_ITEM_MAX_BYTES`) |
| Markup | exactly what the lint accepts: path circle rect ellipse polygon line polyline g defs clipPath linearGradient radialGradient stop. The lint rejects text, tspan, image, script, style, a, foreignObject, SMIL (animate, set, animateMotion, animateTransform), and for new packs also `use`, `pattern`, `mask`, `symbol`, `filter` (only the frozen UK scenes use them); no `NaN`, `undefined` |
| Paint | scenes: any hex colour; any time of day, but it must read in the light theme as drawn (a dusk or golden-hour sky is typical, a night scene is painted as night). Small items: theme classes only |
| Tile | the page draws the rounded tile behind a small item (radius .28 x size, background `color-mix(--c 11%, surface)`); an item never draws a full-tile rect |

## 3. Composition

| Rule | Evidence |
| --- | --- |
| Horizon or waterline at 60 to 72 % of the height: median y 610 (p25 560, p75 650, p10 520, p90 700) | the sky gets two thirds of the picture because the sky is where the palette lives |
| Landmark centred or on a third, its identifying part inside x 590 to 1010 and all of it inside x 350 to 1250 (the phone and square crops), the tallest and strongest-contrast thing | Bangkok prang x 800, the Mackinac span x 520 to 1080 (its centre, cables and a ship stay in the phone crop), Austin Capitol at the vanishing point (800, 500) |
| The light source BEHIND or BESIDE the landmark, never in front; the sky glow is the lightest area right where the silhouette needs contrast | sun (1240, 560) beside Wat Arun; the sun framed in the arch of St. Louis |
| Both sides framed: a dark foreground object at each side, 150 to 450 px wide, swaying (`ussway2`, 5 to 11 s) | palms (`asia-southeast/ho-chi-minh-city-skyline`), pines (`us-midwest/mi-mackinac-bridge`), blossom boughs (`asia-east/jp-signature`), live oaks at scale 2.3 (`texas/austin-capitol-walk`), cypress (`us-southeast/la-bayou-camp`) |
| 4 to 7 depth planes: sky, far, mid, ground or water, landmark, near, frame | the lint's `bands` / `bandFills` see them |
| Scale cues: the same kind of object repeated at decreasing size | villas 1.46 to .42 (`asia-south/mv-signature`), statues and lamps .5 / .9 / 1.3 (Austin), ships at two scales |
| Perspective is faked with ONE vanishing point and linear scale | Austin path `M780 500H820L1180 900H420z` with cross-lines at `k = (y - 500) / 400`; fields projected with `xAt(x0, y) = 800 + (x0 - 800) * (y - VP) / (900 - VP)`; the Maldives jetty |
| The ground in front of the subject is NEVER an empty slab: a lamp string, rail, quay, pier, path, reeds or darker silhouettes | the lint's `bottomCover` and rubric R5 |
| Keep the central x 350 to 1250 free of near-plane clutter; foreground strokes over the subject <= 90 px tall | rubric R2, R14 |

## 4. Sky and light: the stack every scene starts with

| Layer | Kit call | Corpus | Typical |
| --- | --- | --- | --- |
| Sky gradient, full canvas | `full('url(#sky)')` with `lin(sky, [...])` | 100 % | 3 to 5 stops (median 4); top stop lightness .50, horizon .85 |
| Stars | `stars(seed, n, y1)` | 67 % | n 24 to 44, y1 140 to 300 |
| Rays | `rays(x, y, len, col, op)` | 56 % | len 700 to 1200, op .14 to .26 |
| Sun | `sun(x, y, r, core, halo, rise)` | 90 % | median (1040, 470), r 36 to 60 |
| Streaks | `streak(...)` | 78 % | 1 (max 5), y 90 to 300, op .3 to .6 |
| Clouds | `cloud(...)` | 98 % | 2 to 3, belly tinted to the horizon colour |
| Birds | `birds(...)` | 96 % | n 3 to 7, y 200 to 420 |
| Haze | `haze(y, h, col, op)` | 80 % | one per plane boundary |

Palette families for skies: pick one, do not invent a new one (stops `offset:colour`).

```
DUSK / DAWN (5 stops: indigo -> violet or magenta -> coral -> peach -> pale gold)
  asia-southeast/ho-chi-minh-city-skyline  0:#4f4a92 .3:#b26aa0 .55:#ff8a7e .78:#ffc080 1:#ffe4a0
  us-midwest/mi-mackinac-bridge            0:#4f6fb4 .34:#a58ec0 .62:#f2a6a0 .8:#ffd3a1 1:#ffe7be
  us-northeast/ny-statue                   0:#4a6aa8 .3:#9a8ec0 .55:#f2a8a0 .75:#ffd29a 1:#ffe8b6
DAY (3 stops: cobalt -> sky -> near-white; warm cream at the very horizon in 4-stop versions)
  us-southeast/virginia-beach-pier-lighthouse  0:#3a8ed8 .55:#8ccdee 1:#e6f6fa
  us-midwest/chicago-l-train                   0:#2f7ad0 .5:#7fbcee .85:#dff0fa 1:#f6f6e6
  texas/austin-capitol-walk                    0:#5e9bd8 .55:#a8cdee 1:#e8f0f4
NIGHT-PAINTED (3 to 4 stops; the grade still lays on top)
  us-mountain/id-sawtooth-lake  0:#0f1a4e .4:#2f3c86 .7:#7a6aa8 .88:#e8a58a
  us-pacific/anchorage-aurora-moose  0:#02061a .5:#0a2038 1:#17455a (+ two aurora gradients)
FOG / SOFT (low contrast, still 3+ stops)  us-pacific/san-francisco-bridge-fog: lilac-grey -> peach
```

How light is built: the sun sits LOW at dusk and dawn (y 440 to 590, waterline median 610), usually in the right half; DAY scenes put it high (y 140 to 380). `sun()` is a radial halo
(radius 6 r) behind a disc; `rays()` fan from the same point; a SECOND radial gradient (`radU(l1, [[0,'#ffd890',.55],[1,'#ffd890',0]], sx, sy, 560..900)` as a full-canvas rect) warms the ground,
and the Grand Canyon lays it twice (over the sky, then at .5 after the ground). Water gets a pale "sun column" quad under the light (`<path fill="#ffd9a0" opacity=".22" d="M1150 470H1220L1300 900H1000z"/>`) and warm
glints concentrated in that column plus cool glints elsewhere. ONE light source only: never a sun and a moon, never rays from another point.

## 5. Depth and atmosphere

- Far planes lighter and greyer, near planes darker and a little more saturated. Measured: layers darken back to front in 62 % of scenes with 3+ ground layers; the farthest layer has median L .58 / S .26; typical ramp (Fuji):
  `#6a78a8` ridge, `#4e6a78` canopy, `#3e5a40` shore, `#2e4a34` near trees; framing silhouettes at L <= .15 (`#0b1b2d`, `#1c1428`, `#102338`).
- A `haze()` band at EVERY plane boundary, in the horizon glow colour; nothing is a hard seam. Haze is a gradient transparent at both ends, never a solid rect (E13).
- Water: a ramp from warm horizon reflection to deep indigo or teal (`[[0,'#d98a82'],[.15,'#8a6a98'],[.5,'#4a5a8a'],[1,'#26305e']]`), a sun column, two shimmer layers, and a mirrored reflection of the landmark at opacity .3 to .4:
  `<g transform="translate(0 2B) scale(1 -1)" opacity=".4">` (B = the waterline).
- Shadow is a translucent tinted shape, not a darker colour: an ellipse under an object (`fill="#1b2a14" opacity=".35"`), a second tone of the landmark at opacity .35 to .55 on the shadow side, a long dark quad across the ground.
- NO outlines on landscape shapes. Strokes only where a thin real thing exists: cables, hangers, truss zig-zags, rails, reeds, mooring lines, antennas, wave lines (widths: 4 to 6 cables and rails, 1.6 to 3 hangers and details, 3 to 5 grass).
- Gradients are for: the sky, water, a radial glow, haze bands, cloud bellies, mountain faces (lit to shadow), tower faces (`[[0,'#dfe8f6'],[1,'#8fa4c8']]`) and strata (hard-stop gradients). Never as decoration on small props.

## 6. Palette

Measured over 229 scenes: mean fill saturation .54 (p10 .43, p90 .62); 6 hue families (p10 4, p90 9); strongly saturated mid-tones (S > .8) median 1, p90 3.

- ONE dominant hue family for sky + haze + cloud bellies + water + far layers (violet and coral at dusk, blue and cream by day); one or two secondary families for ground and landmark (teal, green, tan, stone);
  at most THREE saturated accents, small, warm against a cool field (a red boat, an orange ferry, umbrellas, a lit lantern).
- NO black (0 of 28,997 colour attributes in the strict set is `#000000`) and no grey: the darkest fills are tinted (`#2a1a20` plum, `#0b1b2d` navy, `#1d1a2a` violet, `#102418` forest, `#16302f` teal). White only as a highlight (1.7 % of uses).
- What makes a scene look finished: (1) a clear value structure: lightest at the horizon glow, darkest at the frame edges, the landmark in the middle values with the strongest local contrast (squint test: three values read);
  (2) one colour temperature story: warm light against cool shadow; (3) every plane boundary softened by haze; (4) highlights and reflections; (5) restraint: few accents, placed where the eye should land.
- What makes a scene muddy: every plane at one mid value under the same grey haze (`uk-north-west/derbyshire-stanage-edge`); piles of translucent overlay strips (`us-pacific/wa-rainier`, 7 strips);
  pastel everything with no dark (`us-mountain/nm-white-sands`); saturated fills unrelated to the sky (`asia-east/xian-skyline`: 62 % of colour mentions S > .75).
- Lint numbers to read against the median: `colours` 43, `colourClusters` 27, `hueSectors` <= 5 (floor 7), `tonalRange` .977 (floor .824). The 5-stop dusk sky (indigo, violet, coral, peach, gold) already spends four of the five hue sectors, so a warm accent can push a piece to six or seven: the advisory is about the AREA the extra families cover, so keep the ground and the water in ONE more family and the accents small (under about 4 % of the painted area).

## 7. Landmarks

The landmark gets the highest detail budget; the scenery gets shape and gradient only. A landmark has at least TWO of these systems plus a lit-side facet:

| System | How it is drawn | Example |
| --- | --- | --- |
| Window rows | dashed round-capped strokes, one per floor: `dots(d, col, 5, 12, 'us-lamps')` or `stroke-width="9" stroke-dasharray="8 10"`; pale day glass at opacity .45 plus a lamps layer, two staggered dash patterns | `win()` in 12 of 20 scene files; the 3-tone tower `bld()` in `us-southeast/virginia-beach-pier-lighthouse` |
| Tiers and setbacks | a loop of tapered rectangles or quadratic paths; niches (a rule line and 3 circles at .55); the same tower repeated at 3 sizes | `prang()` in `asia-southeast/bangkok-skyline` and `th-signature` |
| Struts and cables | COMPUTED: quadratic cables with 31 + 9 + 9 hangers from `qy(t, a, b, c)`, a truss zig-zag `l13 -22 l13 22` every 26 px, tower cross-braces | `us-midwest/mi-mackinac-bridge`, `us-northeast/new-york-skyline` |
| Floor bands | horizontal lines at stroke 2, opacity .35, evenly spaced | `asia-southeast/ho-chi-minh-city-skyline` |
| Facets | the same silhouette path again at opacity .35 to .55 on one half | NY skyline `#f4cfa8` at .35 |
| Crown or finial | stepped crown, spire, pyramid, an antenna with a red beacon on `usflicker` (1.6 s) | `tower(..., 'step' | 'spire' | 'pyr')`, HCMC beacon |
| Reflections | a mirrored copy at .3 | Bangkok, `asia-east/jp-signature` |

Repeat a tower or villa at 3 to 7 scales along a perspective line for depth. A skyline is three rows of different heights separated by `haze()`, each with window rows (pale day glass plus lamps), never one row of bare `rect`s (E2).

## 8. Organic forms and creatures

- Crowns: ONE silhouette with a dark base mass, then clumps in a 1 : .5 : .25 size ratio (dark mass r 62 to 96 x 8, mid clumps r 30 to 56 x 6, highlights r 16 to 30 x 4, light only on the sun side), tonal steps of the SAME hue, a trunk that carries into the crown, `ussway2` pivoting at the foot. The tested helper is `crown3()` (three `blob()`s in three tones on a trunk, `recipes.md` section 6); ferns and palms are `treeFern()` / `palm()`, hedges and scrub `bush()`. Squint at your crowns: if you can count the circles, they are coins (E1).
  Pastel blossom of SMALL (r 14 to 32), close-toned circles on a visible branch, cropped by the frame, passes (`jp-signature`); large opaque high-contrast discs do not (E1).
- Mountains: a multi-point ridgeline, ONE shadow-side path and ONE lit-highlight path following the ridge, a hem-shaped snow cap (the 7-tooth cap in `jp-signature`), haze at the base; never a triangle with an arrow cap, never 4 to 7 translucent overlay bars (E12, E15).
  Canyon strata: hard-stop gradients (each stop written twice at `i/n` and `(i+1)/n`), three parallax layers that darken, haze between them (`us-mountain/az-grand-canyon`).
- Clouds only through `cloud()` (never three circles that look like ears, never giant opaque domes).
- Creatures: one smooth silhouette path with 12 or more control points in a single dark tone (the loon in `us-midwest/mn-loon`), or tiny and far (<= 40 px). Never straight-stroke legs and ovals for a hero animal, never mannequin faces, never portraits, crowds or identifiable people (a tiny anonymous faceless silhouette, a few pixels tall, is allowed as a scale cue).
  Repeated animals vary pose, size (x .85 per step), spacing and tone (E10).
- Snow stays luminous (ground L >= .9, shadows in blue `#aebbd6`), warm lights are the only saturated accents.

## 9. Night: what must light up, whatever the time of day

See `kit-reference.md` section 5 for the classes and `recipes.md` section 7 for the tested helpers. Rules: (a) the time of day is free, but a scene is painted AS it looks (a day or dusk scene as day or dusk; a night scene as night, like `us-pacific/anchorage-aurora-moose`), never as a daylight picture under a dark wash, and it must read in the light theme; `finish()` goes last and the page's evening grade is laid on top; (b) every light that should appear only at night, in a day or dusk picture, is a separate `us-lit` / `us-lamps` / `us-star` element, pale day glass first and the lit layer second;
(c) a scene with none of the three just goes blue-purple at night (render `us-pacific/wa-rainier` at night: nothing comes on); (d) a LOW sun reads as a moon at night (lovely in `us-southeast/la-bayou-camp`), a HIGH bright disc with rays looks odd;
(e) **a scene that IS a night picture paints its moon, stars and lit windows as always-on shapes** (the evening classes are invisible in a light render) and adds the classes on top (`recipes.md` section 7: `sst`, `moon`, `pane`, `panes`, `lamp`).
Measured use: `us-lit` in 161 of 229 scenes (median 3), `us-lamps` in 125 (median 1, p90 19), stars in 152. 21 scenes light nothing (E16): the do-better list. Windows are not yellow squares: `lit()` for a few HERO windows, `dots()` rows for the rest.

**The night render must not be a dim copy of the day picture.** The pilot's judges wrote it in all three panels, on scenes of the pilot AND of the corpus (two of the three gold scenes included): "night renders are mostly a dim tint over the day picture, the sun disc is kept as a pale moon, stars are sparse, and only a few windows or lamps come on". The grade only multiplies a wash over what you drew; it adds light only where you put an evening class. Look at your night PNG next to the light one and ask four questions: is there a moon-like light and is it the ONLY one (the `sun()` disc survives the night: low and small, or hidden behind the landmark; `rays()` at .18 or less)? are at least six hero windows (`lit()`) and a lamp row on every lit group of buildings on? are there 24 or more stars? does the landmark still silhouette (lighter or darker than the sky behind it) under the wash? Any "no" is a fail of rubric R13. Examples: `us-pacific/anchorage-aurora-moose` is a night painted for the light theme that also lights up in the night render; `asia-southeast/singapore-skyline` shows the technique (everything that glows is on the evening classes, so the bay switches on) but its night render is dim: keep your lit layers at full strength.

## 10. Motion

The classes, defaults and ranges are in `kit-reference.md` section 4. The language:

- Every repeated element has its OWN period and delay (`--d:-${(r() * 3).toFixed(1)}s` and `--ad:${(2 + r() * 2.6).toFixed(1)}s` per glint; birds `16 + r() * 10` s; motorbikes `ad: 14 + 3 i`, `d: -2.3 i`). Never one `--ad` shared by neighbours.
- Delays are NEGATIVE so t = 0 is mid-motion. Clouds are staggered 4 to 40 s apart.
- Loop seams are hidden by the keyframes: `usglide` and `usfall` fade at the ends; `usmove` runs from -dx/2 to +dx/2 around the object's own x, so with `dx: 1900px` a boat enters at x -150 and leaves at 1750, beyond the drawn world.
- Amplitude small and quiet (trees .8 deg, grass 3 deg, layers 8 to 26 px over 30 to 120 s, boats 2 to 5 px); fast only where life is fast.
- Motion at three depths: SKY (drift, birds, rays), MIDDLE (glints, boats, traffic, parallax, smoke), FOREGROUND (sway, falling things, fireflies), plus ONE place-specific motion (a ferry, a fountain, a balloon, a flag on a building, a waterwheel, a wake).

Ambient life every scene type needs (always / often):

| Scene type | Always | Often | Refs |
| --- | --- | --- | --- |
| Skyline | clouds, birds, a glint field, 2 ships or a train at different speeds, a beacon or lamp glow | traffic (`usmove` x 7), planes, balloons | `asia-southeast/ho-chi-minh-city-skyline`, `us-midwest/chicago-l-train` |
| Mountain or lake | drifting cloud and mist, birds, glints, a boat | campfire smoke, falling blossom or leaves | `asia-east/jp-signature`, `us-mountain/id-sawtooth-lake` |
| Monument | cloud, birds, tree sway at 2 depths, small figures only if tiny silhouettes | fountain spray (`uspuff`), flags on buildings, fallen petals | `texas/austin-capitol-walk`, `us-northeast/washington-monument` |
| Harbour or bridge | ships and cars at 3 speeds, wake and glints, gulls | sails, buoys, aircraft lights | `us-midwest/mi-mackinac-bridge`, `us-northeast/ny-statue` |
| Desert or canyon | drifting dust ellipses, birds, cacti sway, river glints | heat shimmer, tumbleweed | `us-mountain/az-grand-canyon` |
| Forest, jungle, bayou | fireflies or pollen, leaf fall, hanging moss, reeds, mist | wildlife, a boat | `us-southeast/la-bayou-camp`, `us-southeast/fl-everglades-airboat` |
| Snow or winter | two snow layers (small slow, big fast), lamp glow, vehicles | breath puffs, aurora curtains | `us-northeast/buffalo-deco-tower`, `us-pacific/anchorage-aurora-moose` |
| Tropical coast | waves, glints, palm sway, a seaplane or boats | umbrellas, a kite, dolphins | `asia-south/mv-signature`, `us-southeast/virginia-beach-pier-lighthouse` |
| Temple or pagoda | glints, boats, birds, lantern glow, incense | balloons, petals | `asia-southeast/bangkok-skyline`, `asia-southeast/mm-signature` |
| Countryside | wheat or grass sway, windmills (`usspin`), grazing animals, birds | tractor, plane, windsock | `us-midwest/oh-wright-flyer`, `us-southeast/ky-bluegrass-farm` |

## 11. Budgets: what a reviewer should find (strict set)

| Metric | Floor (lint) | p10 | Median | p90 | Max |
| --- | --- | --- | --- | --- | --- |
| Rendered bytes | 9,622 | 14.8k | 22.8k | 29.0k | 31.7k (cap 32,000; target <= 29,000) |
| Gradients | 5 | 7 | 9 | 11 | 14 |
| Distinct colours | 27 | 33 | 43 | 52 | 68 |
| Shapes | 65 | 113 | 210 | 302 | 409 |
| Moving groups | 12 | 22 | 60 | 90 to 110 | 134 |
| Motion kinds (kit classes) | 5 | 7 | 9 | 10 | 13 |
| Distinct durations | 11 | 18 | 37 | | |
| Stagger delays | 6 | 13 | 35 | | |

The floors are what the lint enforces; the rubric bar (rubric.md R16) is 25 moving groups and 7 kit classes; the target is the median. `node tools/anim-pack.mjs lint ... ` prints "thin spots" wherever a pass is below the p10.

## 12. Defect catalogue (what it looks like, where it exists today, the fix)

| Code | Defect | Seen in | Fix |
| --- | --- | --- | --- |
| E1 | Blobby crowns: big opaque circles (r 40 to 110) in 3 to 4 saturated hues, edges visible, no base mass; also, in the pilot, flat overlapping coin circles for foreground bushes, aspen and cherry crowns, and mushroom or fringed palms and pines | `us-southeast/wv-new-river-gorge` (185 coins), `us-northeast/ct-charter-oak`, `us-mountain/co-maroon-bells` aspens | one silhouette, tiers 1 : .5 : .25, tonal steps, sway at the foot (section 8); `crown3()`, `treeFern()`, `bush()` (`recipes.md` section 6) |
| E2 | Plain boxes for buildings: bare rects, no day windows, no setbacks, no lit side; pale-on-pale slabs; stamped house rows | `texas/dallas-skyline`, `us-pacific/seattle-needle-ferry` background, `asia-east/chongqing-skyline` by day | tapered or stepped silhouettes, a facet at .35 to .55, pale glass plus a lamps row, a crown, three haze-separated rows; houses by a function with baked-in scale and a different width, pitch and tone each (`hut()`) |
| E3 | Flat or unlayered sky | none in the strict set (an instant reject) | the stack in section 4 |
| E4 | Missing foreground: an empty slab at the bottom | `texas/el-paso-star-scene`, `us-mountain/nm-white-sands`, `asia-southeast/davao-skyline` | a near plane at y >= 780 in the darkest tinted value, two framing silhouettes that sway, one scale-carrying object; the bottom 20 % always has structure |
| E5 | Dead scene: 12 to 22 moving groups, only drift and birds | `asia-west/jo-signature` (12), `asia-west/sa-signature`, `us-midwest/sd-rushmore` | >= 25 groups, >= 7 classes, three depths, one place-specific motion |
| E6 | Over-saturated or un-harmonised palette, or pastel mush with no dark anchor (the landmark has weak value contrast against its glow) | `asia-east/xian-skyline`, `us-southeast/va-shenandoah-skyline`; `us-mountain/nm-white-sands` | S near .54, <= 3 small accents, far layers S .15 to .35, one value near L .1 at both edges; `tonalRange` >= .92 (`recipes.md` section 3, "the dark anchor") |
| E7 | Text-like or noise marks: tiles in a row that read as letters, barcode flowers, fur-like tufts | `us-pacific/los-angeles-palms-searchlights`, `us-pacific/wa-rainier`, `us-midwest/ks-wheat` | no arrays of >= 5 near-identical boxes; blades <= 120 px; strokes over the subject <= 90 px tall |
| E8 | Near-cap byte size (14 scenes >= 30,000 B) | `asia-east/macau-skyline` 31,724 | target <= 29 KB: `dots()` and dash arrays for windows, `R()`, one `d` per fill colour, no duplicate near-identical paths |
| E9 | Hidden landmark or hidden light | `texas/el-paso-star-scene`, `asia-west/jo-signature`, `us-midwest/ia-farmland` | landmark 25 to 55 % of the height, its identifying part inside x 590 to 1010 and all of it inside x 350 to 1250, glow behind it, foreground only at the edges and below y 780 |
| E10 | Clone-stamped repeats at one scale on one line; mirrored left and right pairs (palms, huts), five identical mesas with parallel stripes, tiled-box or lattice patterns | `asia-west/sa-signature` (5 identical camels), `asia-west/ae-signature` | vary pose, size (x .85 per step), spacing, tone, lean and parameters (not only the scale: an instanced `<g transform=scale>` repeats one `d` string, `recipes.md` section 4); shadow ellipses |
| E11 | Crude creatures and figures; real people | `us-southeast/ky-bluegrass-farm` horses, `us-midwest/sd-rushmore` faces (never draw portraits or identifiable people) | one smooth silhouette path with 12+ points, or tiny and far |
| E12 | Translucent overlay strips and glitch facets; a lens-flare group in the foreground | `us-pacific/wa-rainier`, `texas/west-texas-sunset` | ONE shadow-side path and ONE highlight path following the form; flares only around the sun |
| E13 | Hard seams and bars: solid haze or fog rects cutting objects | `us-mountain/ut-bryce-hoodoos`, `asia-west/lb-signature` | `haze()` or bands that follow the object; check every plane boundary |
| E14 | Incoherent light: sun and moon together, rays from another origin | `us-mountain/nm-white-sands` | one source; rays, glow, glints, facets and shadows agree |
| E15 | Primitive forms for natural things: triangle mountains, ear clouds, domes of cloud | `asia-west/lb-signature`, `asia-southeast/davao-skyline`, `asia-east/tw-signature` | ridgelines and hem snow caps, `cloud()` only |
| E16 | A night grade with nothing to light (21 scenes), or a night render that is a dim copy of the day picture (the sun disc and rays stay, few windows or stars come on) | `us-pacific/wa-rainier`, `us-midwest/ks-wheat`, `asia-southeast/cebu-skyline` | some `lit()`, `us-lamps`, `stars()` in every scene; six hero windows, a lamp row, 24 stars, a moon-like light; a night PICTURE is painted always-on (`recipes.md` section 7) |
| E17 | Small icons that read as the wrong thing or as noise; scenes in a tile (no dominant mass, five ideas), grey-only palettes, text-like rows of marks | `world/amsterdam-nl-canal-houses` (four bottles), `us-northeast/ma-cranberries`, `world/tokyo-jp-sakura` | silhouette first, one idea, check on the `--sizes` strip at 28 px (`small-icons.md` sections 5 and 10) |
| E18 | Shell mistakes the gate catches: `transform` on an `x-` element, duplicate ids, `NaN`, text, hex in an icon, missing `finish()` | | `kit-reference.md` section 7 |
| E19 | Water or ground as a hard-edged slab: one gradient rect with a straight top, no waterline glow, no haze, reflection or shimmer, hard vertical seams at the canvas edges | the pilot's and the corpus's flat water (`us-northeast/new-york-skyline` under the bridge) | the ramp, the waterline strip, the light column, a wake or reef line, `reflect()` through `clipped()`, banks over the corners (`recipes.md` section 3) |
| E20 | A sunburst or striped rays that read as a flag (a rising-sun ensign in red and white) | | `rays()` in the sky's own warm light, soft wedges, no stripes (`kit-reference.md` section 3) |

## 13. Exemplars: what to take and what NOT to copy

`node tools/anim-pack.mjs reference` prints the gold set with the reason for each; render it and LOOK (`workflow` step "study"). The set is the best of the corpus, not perfect. Having rendered all of it, these are the limits to know:

| Exemplar | Take | Do not copy |
| --- | --- | --- |
| `us-northeast/new-york-skyline` | three skyline rows with window dots, computed catenary cables, haze bands, one violet-pink-amber palette | the water is a flat band under the bridge: give yours a sun column and a mirrored reflection |
| `us-mountain/co-maroon-bells` | one silhouette drawn three times (shadow, lit face, snow), a haze band at the base, the mirrored reflection at half opacity | the aspen crowns are exactly the E1 coin pile: build crowns by section 8 |
| `asia-southeast/th-signature` | a tiered tower built by a loop, repeated at two smaller scales, reflection, two boats at different scales | the foreground palms are plain; give yours more weight |
| `us-midwest/mi-mackinac-bridge` | maths-built cables and hangers, truss, three speeds of traffic, parallax pines against a pale sunrise | |
| `us-mountain/az-grand-canyon` | strata as hard-stop gradients, three darkening layers, haze between them | the cacti are plain stems: add arms and rim light |
| `us-pacific/anchorage-aurora-moose` | aurora curtains that sway and drift at different speeds, twinkling stars, dark silhouette framing | the moose has straight stick legs (E11): use a smooth silhouette path |
| `asia-south/mv-signature` | one villa at seven scales along a jetty, lagoon ramp warm to deep teal, a sun column, a seaplane | |
| `asia-southeast/singapore-skyline` | everything that glows is on the evening classes, so the dark theme switches the bay on | the night render is dim: keep your lit layers at full strength |
| `us-midwest/mn-loon` | one patterned animal, smooth silhouette, reflection, three haze bands, a limited palette | |
| `us-southeast/virginia-beach-pier-lighthouse` | a day scene as rich as a dusk one: 128 moving groups that never hide the subject | |

Small-item exemplars and their craft are in `small-icons.md`. The "do better than these" list (`reference` prints it) is in `rubric.md` as the examples of what a FAIL looks like.

## 14. The six weaknesses the pilot's judges found again and again

A pilot of this skill (`workflow.md` section 18: a made-up region of nine scenes and seven icons, drawn by agents who only had the skill) was judged blind against a sample of the corpus by three fresh judges. The pilot passed (scenes 7.1 against the corpus 4.8, icons 6.5 against 4.6), and the judges' notes agree across all three panels on the same six weaknesses. They are not only the pilot's: they were found in the corpus and in the gold set too, which is why the rubric names them as checks (`rubric.md` section 9). Each has a concrete fix and an example:

| # | Weakness (the judges' words) | Defect | The fix, concretely | Example |
| --- | --- | --- | --- | --- |
| W1 | "Night renders are mostly a dim tint over the day picture: the sun disc is kept as a pale moon, stars are sparse, few windows or lamps come on" | E16 | six hero `lit()` windows, a `us-lamps` row on every lit group, 24 stars, a low small sun or a moon; a night PICTURE painted always-on (`recipes.md` section 7); section 9 above | `us-pacific/anchorage-aurora-moose`; the pilot's Fiji scene (a crescent, stars, painted and `lit()` windows) |
| W2 | "Foliage and organic forms are flat overlapping coin circles or crude silhouettes: aspen and cherry crowns, foreground bushes, mushroom palms" | E1 | `crown3()` (dark mass, mid clump, lit top), `bush()`, `treeFern()`, a feathered `palm()`; clumps in the ratio 1 : .5 : .25 (section 8) | `asia-east/jp-signature` (blossom), `recipes.md` section 6 |
| W3 | "Cloned or template shapes and window-less bare boxes: stamped house rows, repeated buttes with parallel stripes, flat skyline blocks, left and right palm pairs" | E10, E2 | a function per object with the scale baked in and a new parameter per instance (width, pitch, lean, tone, seed); strata clipped inside each butte; day glass plus lamps on every block | `recipes.md` section 4 ("Ladders without clones"), `hut()`; do better than `asia-west/sa-signature` (five identical camels) and `uk-south-east/west-sussex-ardingly-show` (five identical tents) |
| W4 | "Washed pastel or low-contrast palettes with no dark anchor, so the landmark has weak value contrast against its glow" | E6 | one tinted value near L .10 to .15 in the frame at both edges, the landmark with the strongest local contrast, `tonalRange` >= .92; squint test | `recipes.md` section 3 ("the dark anchor"); the Fiji palms in `#170c27` |
| W5 | "Flat slabs where depth should be: water or ground with no reflection, hard vertical seams, skylines in one value with no haze steps" | E19, E13 | the water recipe (ramp, waterline strip, light column, wake, reflection, banks over the corners); a `haze()` at every plane boundary; three skyline rows in three values | `us-northeast/new-york-skyline` (the skyline rows), the Fiji lagoon, `recipes.md` section 3 |
| W6 | "Icons are scene-in-a-tile clutter, grey-on-grey, ambiguous, text-like marks, hard-edged water rectangles, muddy translucent smoke" | E17 | one noun phrase, one dominant mass of 36 units or more, at most three supports, `c` on the hero, a plate whose top edge is the wave, `s` shapes kept apart; judge the 28 px strip | `asia-east/tw-bubble-tea`, `us-pacific/hi-sea-turtle` (`small-icons.md` section 5) |

