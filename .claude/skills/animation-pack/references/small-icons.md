# Small icons: the 64 x 64 craft (elements, place symbols, signatures)

A small item is the animated symbol the dashboard shows beside things (a card, a chip, the day's symbol) at 28 px up to 132 px. It is a monoline-plus-tint drawing in THEME CLASSES ONLY, so light and dark mode,
the swatch colour and all seven animation themes work with no extra drawing. Everything here is measured on the 245 US and Asia symbols (the strict `item` profile) and on 24 icons looked at on 28 / 64 / 132 px sheets.

**What an element agent reads, and nothing else:** this file (all), `style-guide.md` sections 1 and 10 (the house style and the motion language), `rubric.md` part B (sections 1, 2 and 5 to 7). Not `recipes.md` and not `kit-reference.md`: those are the full-screen scene craft (the `x-us*` classes and the scene helpers), and the motion classes of a small item are in section 3 below. `workflow.md` is the orchestrator's.

Contents: 1 what you are making, 2 the vocabulary (and what `s` and `w` really are), 3 motion, 4 the build recipe and the one size table, 5 composition, readability and one idea per tile, 6 patterns worth copying, 7 helpers used in the pack files, 8 exemplars, 9 mistakes, 10 gates.

## 1. What you are making

| Kind | Builder call | The viewer's question | Shape of the drawing |
| --- | --- | --- | --- |
| Element (the unit's symbol, slot `symbol`) | `B.element('<CODE>', {...})` | "what is this place like" | ONE hero object, centred, usually a close-up (a bubble tea, a turtle, a lantern string, a chairlift), 3 to 5 independent micro-motions and one sparkle. Median regional element: 778 bytes, 13 shapes, 5 animated |
| Place symbol (a small town or famous place) | `B.place('<id>', {...})` | "what is this town known for" | that place's own motif: a craft, a food, a building detail, an animal |
| Signature (the place's landmark, slot `opening`) | in the US and Asia packs superseded by a full-screen scene | "where am I" | a recognisable silhouette on a ground line (`M6 58h52`) with a sky accent (a pulsing sun `<circle class="s x-pulse" cx="50" cy="12" r="6"/>` or 1 to 3 `x-twinkle` stars) and a beacon `x-blink`. Median 462 bytes, 7 shapes, 2 animated |

A motif, never a flag or a map; never text; a new region draws scenes for signatures and elements only for symbols. No two items of a slot draw the same thing (the tests check it).
**A sensitive region** (the region doc's "Cultural care" section forbids the art, patterns, masks, craft or ceremony of a people, or the obvious national animal or instrument) still needs an element for every unit: name the SAFE motif kinds and draw one of them. Safe by default: a food or drink in a plain vessel, a plant or crop (a coffee plant, a coconut, a fern), a real animal in its habitat that is not an emblem or a mascot, a tool of daily work (a net, a paddle, a kettle), a natural feature (a reef, a volcano cone, a waterfall), a weather or a sea scene of the place. Not safe unless the care text allows it: carvings, masks, patterns, dress, ceremonial objects, a national bird or animal used as an emblem, any instrument or craft tied to one people. When the rotation's suggested motif kind collides with the care section, the care section wins: change the kind, say so in one line in the report (or ask the orchestrator to put it once into the doc's "Scene suggestions"). The builder fills in the id prefix
(`B.element('JP', {id: 'sushi'})` gives `jp-sushi`), the label suffix (", Japan"), the tags, the slot, the priority, the region and the `when` rule, and throws on a duplicate id.

```js
B.element('XX', { id: 'motif', label: 'What it is', colour: 'amber', mood: 'cheerful', tags: ['food'],   // colour: blue indigo violet pink red orange amber green teal slate
  svg: () => '<path class="m" d="..."/>' + '<g class="x-bob"><path class="c lk" d="..."/></g>' });          // season: 'any' (default) or ['winter']
```
`svg()` returns the INSIDE of a 64 x 64 SVG (the registry wraps it). Constants only: no user text. `reduced: 'static'` (the default) means the same drawing, paused.

## 2. The vocabulary (CSS in `src/styles/71-anim-library.css`)

The page draws a rounded tile behind the item (radius .28 x size, background the swatch at 11 % over the surface, 14 % at hero size); never draw a full-tile rect. The `svg` fills 84 % of the tile (92 % at xs).

| Class | Meaning | Use |
| --- | --- | --- |
| `k` | fill = ink (muted foreground) | the dark mass: hulls, wheels, beans, pupils, tower bodies (625 uses in the corpus) |
| `c` | fill = the swatch colour | the HERO colour (1,477 uses, the commonest) |
| `s` | fill = the swatch at **24 % alpha over whatever is behind it** (translucent, not an opaque pale colour) | secondary plates, water, sky shapes, clouds. Two `s` shapes that overlap DARKEN where they overlap, and anything behind an `s` shape shows through it (a lime slice tinting through an `s` chunk, a dark lens where two chunks meet): keep `s` shapes apart, or let that overlap be the point (a shadow) |
| `w` | fill = the tile's **surface**: white in the light theme, the DARK surface (near-black) in the dark theme | highlights, cup glass, snow, eyes (943 uses in the 575 items). See "pale objects" below |
| `m` | fill = muted border colour | far or inactive shapes, ground bands (412) |
| `lk lc lm lw` | stroke only (ink / swatch / mute / surface), width 2.4 (`lw` 1.4), round caps and joins | contours, details, the ground line (`lm`), highlights and wave tops (`lw`; note it is the surface colour too, so in dark it is a dark groove, not a bright line) |
| `t` | thick stroke 3.4 | the primary silhouette contour, rope, mast |
| `dash` | `stroke-dasharray: 1.5 5` | a dotted path, a wake, rain |
| `lsoft` | 9-wide soft tint stroke (the `s` colour: 24 % swatch, so it overlaps like `s`) | halos, a soft glow round a lantern or a sun. None of the 245 regional symbols uses it: at most one |
| `o-b o-t o-l o-v` | transform origin bottom / top / left / view-box | sway pivots (`x-swing o-t` hangs from the top) |

**Pale objects.** No class is "always pale": `w` is the surface (white by day, near-black in dark), `k` is the ink (dark in light, light in dark), `s` is a tint that reads as pale in light and as a soft glow in dark. A pale thing drawn `w` alone, on a `w` or `s` field, turns into a near-black hole in the dark theme (look at the dark renders of `us-southeast/natchez-steamboat-wheel` and `asia-east/tw-bubble-tea`: the cabin and the glass are near-black, and they read only because an ink outline draws them). The corpus's answer, which is the sanctioned one (measured on the 245 hand-drawn symbols: 209 use `w`, and 164 of its 561 `w` shapes, 29 %, also carry an outline class; the rest are small features or sit on a `c` / `s` / `m` shape):
1. a pale MASS (a cup, a cabin, a sail, a snow cap, an egg, a pearl, a cloud) is drawn `w` WITH an ink outline: `w lk`, or `w t` for the primary contour, as the bubble-tea glass is. In dark it is a surface-coloured shape with a light outline: it still reads as that object;
2. a pale area that must not rely on the surface colour is drawn `s` (a tint over the tile) with an outline, or in `c` (the swatch), `m` or `k` at a low `opacity` (`class="k" opacity=".16"` is a shadow; `w` is never the way to a shadow);
3. a small `w` feature (an eye, a highlight, a bead, a window, anything under about 6 units) can stay a plain `w` shape: it is a cut-out in both themes, and most of the `w` shapes of the corpus are exactly that;
4. never a large plain `w` area (over about 10 units across) with no outline and no `c` / `s` / `m` shape under it: look at the dark render, a black hole there is rubric I9.

`opacity` as an attribute is allowed (51 of the 245 symbols use it, 61 times, as `opacity=".6"`; the lint accepts it and the exemplars use it): it is how a shadow, a highlight or a depth step is made without a new colour. Colour attributes stay forbidden.

- ZERO hex colours, no inline `fill=` / `stroke=` / `stroke-width=`, no gradients, no `<style>` (0 of 575 small items has a hex colour; lint rules `colours`, `inlinePaint`, `gradients` allow none).
- Fill and stroke on one element is normal: `w lk` (surface fill with an ink outline: the cup of `asia-east/tw-bubble-tea`), `c lk` (swatch fill with an ink outline: the turtle shell), `w lc` (surface with an accent outline).
- Strokes first, then fills in the CSS: `.w.lc` works as written. Stroke widths come from the classes; do not set them.
- A `transform` ATTRIBUTE is fine on a static element (the panda's ear ellipses) but NEVER on an element that has an `x-*` class (the animation replaces it): wrap it, `<g transform="translate(52 40)"><g class="x-spin">...</g></g>`.

## 3. Motion

`x-*` classes name a keyframe (`--an`), a default duration (`--ad`) and an easing; override with `style="--ad:3.2s"` and delay with `--d`. Only transform and opacity move. They run only while the scene is live (on screen, paused when the tab
is hidden, static under reduced motion). Frequency over the 575 items: `x-twinkle` 370, `x-bob` 200, `x-wave` 186, `x-pulse` 164, `x-fall` 160, `x-swing` 104, `x-steam` 101, `x-blink` 88, `x-pop` 87, `x-glow` 86, `x-float` 84, `x-rise` 55, `x-flicker` 53, `x-flap` 50, `x-spin` 45.

| Class | Default | What it does | Use |
| --- | --- | --- | --- |
| `x-bob` | 2.6 s | translateY 0 to -2.5 px | bodies, boats, beans, floating things |
| `x-float` / `x-float2` | 2.8 / 3.4 s | rise 9 px and fade / a gentle tilt | balloons, bubbles, lamps |
| `x-twinkle` | 2.2 s | scale .5 and opacity .35 | sparkles, stars (a 4-point star) |
| `x-pulse` | 1.8 s | scale 1.35 and opacity .55 | a sun, a beacon, a heart |
| `x-glow` | 3 s | scale 1.06 and opacity .6 | halos, lantern cores, windows |
| `x-blink` | 1.1 s | opacity 1 to 0 at 50 %, stepped | a light, a beacon, a lit window. **It is off for half the cycle** (1.1 s default: on .55 s, off .55 s), so it cannot make an eye blink briefly; give an eye a glint on `x-twinkle` or leave it still |
| `x-flicker` | .9 s | squash and stretch with opacity | flames |
| `x-swing` | 2.8 s | rotate -5 to +6 deg | lanterns, banners, a bell (with `o-t`) |
| `x-tree` | 4.6 s | rotate +-2.5 deg | trees, plants |
| `x-steam` | 2.4 s | rise 4 px, widen, fade | steam, smoke |
| `x-rise` | 4 s | rise 8 px at a point in the cycle | bubbles, sparks |
| `x-fall` | 3.2 s linear | fall 46 px with a turn, fade | petals, snow, rain, leaves |
| `x-wave` | 1.6 s linear | translateX -12 px | a wave band (see section 6) |
| `x-ring` | 1.4 s ease-out | scale .6 to 1.15 with opacity 0 to 1 to 0 | a ripple, a pulse ring |
| `x-drop` | 2.4 s | falls 14 px, vanishes, reappears 10 px above, settles | a drip, a raindrop, a berry |
| `x-shadow` | 2.2 s | opacity .85 to .45 with scaleX .7 | the ground shadow under a bobbing or floating thing (none of the 245 symbols uses it: at most one) |
| `x-flap` | 4 s | scaleY -1 between 45 % and 70 % | wings, flippers, a flag |
| `x-spin` / `x-spin-slow` | 1.6 s / 14 s linear | a full turn | a wheel, a fan, a clock hand |
| `x-breathe` | 4.4 s | scale .86 to 1.08 | a chest, an animal at rest |
| `x-pop` | 4.2 s | scale 0 to 1.12 to 1, once per cycle | a thing appearing |
| `x-bounce` | 1.9 s | a hop with squash | a ball, a creature |
| `x-wobble` | 1.4 s | a rattle of rotations | a toy, a pin |
| `x-flag` | 1.2 s | scaleX .84 with skewY | a pennant on a building (never a national flag) |

About 60 classes exist; `grep -n "^\.anim-scene \.x-" src/styles/71-anim-library.css` lists them with their defaults. The lint (`classes-defined`, `unknownClasses`) rejects a class the CSS does not define.

Stagger rules (measured over the 245 symbols: every one moves; median 5 animated elements, 3 motion kinds; 209 use a stagger `--d`, median .5 s, p90 1.4 s, max 3.6 s):
- steps of .3 to .6 s are the norm (`0 .25 .5 .75 1 1.25` for six beans; `0 .5 1 1.6 .9` for five lamps); never three things with the same delay (the rubric rejects lockstep: I12, instant reject 4). A bare `x-glow`, `x-twinkle` or `x-bob` with no `--d` counts as delay 0, so three of them are three things in lockstep: the lint reports it as the advisory `sameDelay` (more than 5 movers on one delay; the accepted median is 3), but only you and the reviewer enforce the rule of three;
- the class default duration is usually right (an explicit `--ad` appears in only about 60 places, median 3.2 s); set one when five items must share a rhythm (`--ad:2.4s` for five lanterns) or to detune two neighbours;
- nest motions with wrappers: `<g class="x-bob" style="--d:.5s"><path .../><g class="x-flicker" style="--d:.5s"><path .../></g></g>` (a floating lamp with a flame);
- motion belongs to PARTS (a flipper, a flame, a bean, a wave, a wing), not to the whole picture; one global wobble is the lowest-effort fake and reads as one.

## 4. The build recipe (silhouette first)

1. STUDY: the exemplar PNGs are in `.anim-ref/` (the orchestrator renders them once with `node tools/anim-pack.mjs reference --render`: light, night and dark; working alone, run it yourself). OPEN the icon PNGs nearest your motif, in light AND dark (an image that did not load has not been looked at: open it again); name the model and the craft you take, and what you will NOT copy (section 8).
2. SILHOUETTE: draw the motif as ONE mass in one class (`k`) on the 64 x 64 grid, at least 36 x 36 units, centred, inside about x 4..60 and y 4..60. If it does not read as the thing at 28 px in one colour, redraw before adding anything.
3. TONES: add `c` (hero), `s` (secondary plate), `w` (highlight), `m` (far or ground). At most three big colour areas; a depth cue by an `s` plate behind or an `m` band below. Nothing smaller than 3 units that matters.
4. STROKES: primary contour `t` (3.4) only where the silhouette needs an edge, interior detail `lk` (2.4), highlights and wave tops `lw` (1.4). Keep a clear weight hierarchy.
5. ANCHOR: a ground line `<path class="lm" d="M3 60h58"/>` (y 54 to 62) or a wave band; ONE off-centre accent (a sparkle, a bubble, a sun) as counterweight in an empty corner.
6. MOTION: pick 3 to 7 parts (the median accepted icon has 5 moving groups, the exemplars 7 to 14) in at least 2 and usually 3 motion kinds; give each its own `--d` (steps .3 to .6); wrap every transformed or nested thing; add a wave band or a sparkle.
7. GATES: `lint --file <pack file> --only small` must pass (floors: 7 shapes, 3 paths, bytes 600 to 14,000; read the thin spots: median 12 shapes, 9 paths, 1,018 B rendered, 5 moving groups, 3 kinds); render light AND dark with `--still` (the rest frame) and `--sizes` (the 28 px strip) and judge THOSE, not the 200 px contact tiles; score `rubric.md` part B (section 10).

**The one size table** (measured on the 245 accepted hand-drawn symbols and the six icon exemplars; `svg()` is what you write, RENDERED is what `lint` measures and what the brief's target table prints: `svg()` plus the span and svg wrapper, about 250 bytes):

| | p10 | median | p90 | maximum | the 6 exemplars |
| --- | --- | --- | --- | --- | --- |
| `svg()` bytes | 555 | 778 | 1,196 | 1,780 | 1,217 to 1,694 |
| rendered bytes | 786 | 1,018 | 1,443 | 2,003 | 1,449 to 1,931 |

So: **aim at 1.0 to 1.9 KB rendered (`svg()` about 780 to 1,700 B)**. The median 1.0 KB is the bar of the richness target (richness >= 0.90); the exemplars at 1.4 to 1.9 KB are the upper end of GOOD; **the ceiling is 2.0 KB rendered (`svg()` 1,800 B), the corpus maximum**, and a piece above it is bloat (rubric I17 fails it). The hard cap of the registry is 14,000 and the lint's floor is 600. The lint cannot enforce the ceiling (its richness index stops counting bytes at 125 % of the median, so a bloated icon scores as well as a rich one): the author checks it in the report and the reviewer fails it. When a draft is over, trim in this order: the wave band (14 segments, section 6, saves about 90 bytes per band), coordinate precision (one decimal, whole units where the eye cannot tell), a second sparkle, small details under 3 units; never the dominant mass or the motion.
Do not pad to reach a number: the lint measures hidden shapes, tiny specks and copies.

## 5. Composition and readability at 28 px

At 28 px the svg occupies 92 % of the tile, 0.40 px per unit: a 2.4 stroke is a 1 px line and anything under about 3 units disappears. What survives: ONE big mass (40+ units), 2 or 3 flat colour areas, a clear outline, one accent.

| Reads well at 28 and 132 px | Fails at 28 px |
| --- | --- |
| `asia-east/tw-bubble-tea` (cup, straw, amber fill), `us-pacific/hi-sea-turtle`, `asia-east/cn-panda`, `us-southeast/natchez-steamboat-wheel`, `us-northeast/nj-tomato`, `core/sym-heart`, `asia-east/nagasaki-lanterns` | `us-northeast/ma-cranberries` (23 shapes become noise), `world/tokyo-jp-sakura` (a hairline branch), `world/rome-it-colosseum` (a smudge), `world/amsterdam-nl-canal-houses` (reads as four bottles), `us-pacific/lahaina-banyan-whale` (an illegible blob), `asia-south/varanasi-floating-diyas` (a grey slab and orange bars) |

Rules: dominant shape >= 36 x 36 units; <= 3 big colour areas; minimum feature 3 units; primary contour `t`, interior `lk`, highlights `lw`; extent: the drawing fills at least about 59 % of the width and 53 % of the height of the frame (median 100 % and 88 %; lint `extentW`, `extentH`). At 128 px the extras show (inner `lk` details, glints, bubbles, the second wave band): they are the reward, never what makes the motif readable.
The tile's rounded corners crop anything outside about x 4..60.

**One idea per tile (an icon is not a scene).** The pilot's blind judges named "small icons are scene-in-a-tile clutter" in all three panels, on 8 of the 15 icons they saw (2 of the pilot's 7 and 6 of the 8 corpus icons: it is a weakness of the corpus too, which is why it is in the rubric): a cloud, rain, a palm, a boat, hills and two wave bands in one 64 x 64 (the pilot's weakest piece, a rain squall over a harbour: no dominant mass, rain strokes that vanish at 28 px), hard-edged water rectangles, grey-only palettes, text-like rows of marks, an object nobody can name. The fix is arithmetic, not taste:
1. say the picture in ONE noun phrase before you draw ("a palm in the rain", "a kookaburra on a branch"); if it has two "and"s, cut until it has none;
2. ONE dominant mass of at least 36 x 36 units, centred, in the swatch colour `c` or the ink `k`; everything else is support: at most THREE of {a ground line or wave band, a sky or water plate (`s`), one accent (a sparkle, a bubble), one small secondary object};
3. weather is a few bold marks: three or four dashes of 3 units or more (`dash` or short `lc` strokes), never twelve hairlines; rain, steam and smoke are `s` or `lc`, not grey mush;
4. the swatch colour carries the subject: an icon drawn only in `k`, `m` and `w` is grey on grey (rubric I3, I5); give the hero mass `c`;
5. no row of three or more parallel short strokes or small boxes (it reads as text or a barcode, instant reject 3), and no object that reads as the wrong thing (a face from two dots and a mouth, a pair of rabbit ears, dice): look at the 28 px strip for "what is it?" and ask someone, or ask yourself with the colours squinted away;
6. water, ground and sky plates are shaped by the picture (the wave is the top edge, section 6), never a hard rectangle to the tile's edge.
Exemplar for one idea: `asia-east/tw-bubble-tea` (a cup, six pearls, two sparkles); for a whole landscape that still works, `us-pacific/bellingham-ferry-baker`, which gets there by fills alone and keeps ONE ferry as the subject.

## 6. Patterns worth copying

- Stagger one motion over a set: five lanterns, each its own `x-swing o-t` group with the same `--ad:2.4s` and `--d` 0 to .8 (`asia-east/nagasaki-lanterns`): one staggered class makes a festival.
- Wave band: a path WIDER than the tile with a 12-unit period, so `translateX(-12px)` loops seamlessly (77 of 245 items; usually two bands with `--d` 0 and .5, one `lc`, one `lw`):
  `<path class="lc x-wave" d="M-2 58q3-2 6 0t6 0t6 0 ..."/>`: `M-2 58q3-2 6 0` and then `t6 0` 13 times, 14 segments in all (the `wv()` helper in section 7). That is 84 units wide: from x -2 to 82, and after the 12 px slide it still covers x 0 to 64, so it loops with no seam and costs about 90 bytes less per band than the 24 segments (`q3-2 6 0t6 0` twelve times, 144 units) the corpus repeats.
- Water that is not a hard rectangle: a plate whose top edge IS the wave (`<path class="s" d="M0 48q4-2 8 0t8 0t8 0t8 0t8 0t8 0t8 0t8 0V64H0z"/>`, 8 segments of 8 units) under an `x-wave` line, not a `<path class="s" d="M0 46h64v18H0z"/>` slab with a straight top and hard corners (the judges' "hard-edged water rectangle"). Remember that `s` is translucent: the plate tints what is behind it.
- Sparkle: a 4-point star on `x-twinkle`, `M x y-3 l1 2 2 1-2 1-1 2-1-2-2-1 2-1z`, in an empty corner (35 of 245).
- Nested: a lamp that bobs holds a flame that flickers; a body that bobs around a head that nods.
- Depth by fills alone (`us-pacific/bellingham-ferry-baker`): an `s` sky plate, a snow cap, an `m` hill band, trees on `x-tree`, translucent water, a ferry on `x-bob`, gulls on `x-flap`.
- A loop for generated structure (`asia-southeast/hue-seven-tier-pagoda`: seven tiers alternating `c` and `s` with `lk` eaves).
- Frame with waves top and bottom (`hi-sea-turtle`) or a ground line plus a wave band (`natchez-steamboat-wheel`).

## 7. Helpers the pack files define

A pack file may define small local helpers inside its IIFE (these are the ones `src/app/72-anim-pack-asia-east.js` uses; adapt, do not rely on them existing):

```js
const tw = (x, y, d) => `<path class="c x-twinkle" style="--d:${d || 0}s" d="M${x} ${y - 3}l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>`;     // a sparkle
const gr = (y) => `<path class="lm" d="M3 ${y || 58}h58"/>`;                                                                     // a ground line
const wv = (y, d, cls) => `<path class="${cls || 'lc'} x-wave" style="--d:${d || 0}s" d="M-2 ${y}q3-2 6 0${'t6 0'.repeat(13)}"/>`; // a wave band, 14 segments
const steam = (x, y) => `<path class="lm x-steam" d="M${x} ${y}q-2-3 0-6"/><path class="lm x-steam" style="--d:0.8s" d="M${x + 4} ${y}q2-3 0-6"/>`;
```
Keep `const B = <REGION>.builder('<group>')`, the `B.scenes()` line and the closing `animRegisterPack(B.pack({...}))` call exactly as the scaffold has them; add `B.element(...)` / `B.place(...)` calls between.

## 8. The icon exemplars (render them and look)

| Ref | Bytes | What to learn |
| --- | --- | --- |
| `us-southeast/natchez-steamboat-wheel` | 1,402 | a silhouette that reads at 28 px (decks, two stacks, a wheel), two `x-steam` puffs, a wheel on `x-spin` inside a `<g transform>` wrapper, two staggered `x-wave` bands, every colour a theme class |
| `us-pacific/hi-sea-turtle` | 1,217 | an animal with a patterned shell, two flippers on `x-flap` with a .6 s offset, a bobbing body, three bubbles on `x-rise` at 1 s steps, wave lines framing top and bottom |
| `asia-east/tw-bubble-tea` | 961 | the cleanest silhouette: a glass (`w lk`), an amber fill (`c`), six pearls each on `x-bob` with .25 s steps, two bubbles, two sparkles; reads at 28 px in light and dark |
| `asia-east/cn-panda` | 917 | an iconic mass (`w` body, `k` patches) plus bamboo (`c`), three gentle motions: how little an iconic silhouette needs |
| `asia-east/nagasaki-lanterns` | 1,694 | five lanterns each in an `x-swing` group (same duration, `--d` 0 to 1.2) with glowing cores on a curved thick rope |
| `us-pacific/bellingham-ferry-baker` | 1,532 | a whole landscape in 64 units by fills alone; depth from `s / m / c` and opacity |
| `asia-southeast/hue-seven-tier-pagoda` | | seven tiers by a loop, four independent motions on a still building |

Not recommended despite their metrics: `asia-south/varanasi-floating-diyas` (reads as a slab; keep its nesting idea only), `world/amsterdam-nl-canal-houses`. `node tools/anim-pack.mjs reference` prints the set with the reason for each.

## 9. Mistakes

| Mistake | Why | Instead |
| --- | --- | --- |
| a hex colour or `fill="..."` | breaks dark mode and the themes; lint | `k c s w m` |
| 15 or more tiny shapes (cranberries) | noise at 28 px | one mass, 3 big areas |
| a hairline motif (a single branch) | disappears | thick contour `t`, bigger shapes |
| everything the same stroke | no hierarchy | `t` for the contour, `lk` for detail, `lw` for highlights |
| `transform` on an `x-` element | the animation replaces it | wrapper group |
| three things with the same `--d` | lockstep | .3 to .6 s steps |
| one `x-bob` on the whole drawing | no life in the parts | motion on parts, 2 to 3 kinds |
| a full-tile background rect | the page draws the tile | nothing behind the motif except an `s` plate with margins |
| copy and recolour another icon | the lint and the reviewer detect it; the slot test fails | a new motif and composition |
| a scene in a tile: cloud + rain + palm + boat + hills + two wave bands | no dominant mass; the weakest class of the pilot | one noun phrase, one mass, at most three supports (section 5) |
| a pale mass drawn `w` with no outline, or a `w` area on an `s` field | a near-black hole in the dark render | `w lk` / `w t`, or `s` / `c` with an outline (section 2, "pale objects") |
| two `s` shapes overlapping by accident | the overlap darkens (`s` is a 24 % tint) and shows what is behind | keep them apart, or put the overlap where a shadow belongs |
| `x-blink` on an eye | it is off for half the cycle: the eye is closed half the time | a glint on `x-twinkle`, or no blink |
| a flat `M0 46h64v18H0z` water slab | a hard-edged rectangle | a plate whose top edge is the wave, plus an `x-wave` line (section 6) |
| generic motifs (a tree, a sun) for a place | says nothing about the place | the place's own animal, plant, food, craft, instrument or building detail |

## 10. Gates (the same as for scenes, in this order)

STUDIED (model named, PNG opened) -> DRAWN (recipe above) -> `node tools/anim-pack.mjs lint --file src/app/72-anim-pack-<id>-<group>.js --only small` PASS with no waiver -> LOOK -> SCORED on `rubric.md` part B -> reviewed by an independent reviewer for a batch. A pack file also carries the scenes other agents draw into it
(`B.scenes()`): `--only small` keeps your elements and leaves their scenes out.

LOOK, with the options that make it honest (all of them exist now):
```
node tools/anim-pack.mjs sheet --file src/app/72-anim-pack-<id>-<group>.js --only small --mode light --still --sizes --contact --out .anim-ref/<name>
node tools/anim-pack.mjs sheet --file src/app/72-anim-pack-<id>-<group>.js --only small --mode dark --still --sizes --contact --out .anim-ref/<name>
node tools/anim-pack.mjs sheet --file src/app/72-anim-pack-<id>-<group>.js --only small --key place:<id> --mode light     # one item while you iterate: --key takes an item id, a ref or a region key
```
- `--still` renders the REST frame (animations off, what reduced motion shows): without it the PNG is frozen at 6.5 s, so an `x-fall` leaf, an `x-twinkle` sparkle or an `x-drop` is caught mid-animation and looks like a defect (a stray dot over a wave band, a half-faded drop). Judge "the still frame is complete" (I15) on `--still`.
- `--sizes` writes `<item>-<mode>-sizes.png`: the item at 28, 40, 64 and 128 px at its REAL pixel size, and with `--contact` a contact sheet of those strips. **That strip is the 28 px test (I1, I2).** The ordinary contact-sheet tiles are about 200 px: they are the thumbnail test for scenes, not for icons. Open the strip and answer in writing: at 28 px, what is it (one word), where is the dominant mass, and is any part a smudge? An answer you cannot give is a fail of I1.
- Open every PNG with the Read tool. An image that did not load (the tool answers with an error or "[media removed: request limit]", or you see nothing) has NOT been looked at: open it again before you score a line; the report lists the PNGs that actually loaded; never claim a look you did not make.
