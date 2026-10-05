# Small icons: the 64 x 64 craft (elements, place symbols, signatures)

A small item is the animated symbol the dashboard shows beside things (a card, a chip, the day's symbol) at 28 px up to 132 px. It is a monoline-plus-tint drawing in THEME CLASSES ONLY, so light and dark mode,
the swatch colour and all seven animation themes work with no extra drawing. Everything here is measured on the 245 US and Asia symbols (the strict `item` profile) and on 24 icons looked at on 28 / 64 / 132 px sheets.

Contents: 1 what you are making, 2 the vocabulary, 3 motion, 4 the build recipe, 5 composition and readability, 6 patterns worth copying, 7 helpers used in the pack files, 8 exemplars, 9 mistakes, 10 gates.

## 1. What you are making

| Kind | Builder call | The viewer's question | Shape of the drawing |
| --- | --- | --- | --- |
| Element (the unit's symbol, slot `symbol`) | `B.element('<CODE>', {...})` | "what is this place like" | ONE hero object, centred, usually a close-up (a bubble tea, a turtle, a lantern string, a chairlift), 3 to 5 independent micro-motions and one sparkle. Median regional element: 778 bytes, 13 shapes, 5 animated |
| Place symbol (a small town or famous place) | `B.place('<id>', {...})` | "what is this town known for" | that place's own motif: a craft, a food, a building detail, an animal |
| Signature (the place's landmark, slot `opening`) | in the US and Asia packs superseded by a full-screen scene | "where am I" | a recognisable silhouette on a ground line (`M6 58h52`) with a sky accent (a pulsing sun `<circle class="s x-pulse" cx="50" cy="12" r="6"/>` or 1 to 3 `x-twinkle` stars) and a beacon `x-blink`. Median 462 bytes, 7 shapes, 2 animated |

A motif, never a flag or a map; never text; a new region draws scenes for signatures and elements only for symbols. No two items of a slot draw the same thing (the tests check it). The builder fills in the id prefix
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
| `s` | fill = soft tint of the swatch (24 %) | secondary plates, water, sky shapes, clouds |
| `w` | fill = surface (white or the dark surface) | highlights, cup glass, snow, eyes (943) |
| `m` | fill = muted border colour | far or inactive shapes, ground bands (412) |
| `lk lc lm lw` | stroke only (ink / swatch / mute / surface), width 2.4 (`lw` 1.4), round caps and joins | contours, details, the ground line (`lm`), highlights and wave tops (`lw`) |
| `t` | thick stroke 3.4 | the primary silhouette contour, rope, mast |
| `dash` | `stroke-dasharray: 1.5 5` | a dotted path, a wake, rain |
| `lsoft` | 9-wide soft tint stroke | halos |
| `o-b o-t o-l o-v` | transform origin bottom / top / left / view-box | sway pivots (`x-swing o-t` hangs from the top) |

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
| `x-blink` | 1.1 s | opacity 1 to 0, stepped | an eye, a light, an aircraft beacon |
| `x-flicker` | .9 s | squash and stretch with opacity | flames |
| `x-swing` | 2.8 s | rotate -5 to +6 deg | lanterns, banners, a bell (with `o-t`) |
| `x-tree` | 4.6 s | rotate +-2.5 deg | trees, plants |
| `x-steam` | 2.4 s | rise 4 px, widen, fade | steam, smoke |
| `x-rise` | 4 s | rise 8 px at a point in the cycle | bubbles, sparks |
| `x-fall` | 3.2 s linear | fall 46 px with a turn, fade | petals, snow, rain, leaves |
| `x-wave` | 1.6 s linear | translateX -12 px | a wave band (see section 6) |
| `x-flap` | 4 s | scaleY -1 between 45 % and 70 % | wings, flippers, a flag |
| `x-spin` / `x-spin-slow` | 1.6 s / 14 s linear | a full turn | a wheel, a fan, a clock hand |
| `x-breathe` | 4.4 s | scale .86 to 1.08 | a chest, an animal at rest |
| `x-pop` | 4.2 s | scale 0 to 1.12 to 1, once per cycle | a thing appearing |
| `x-bounce` | 1.9 s | a hop with squash | a ball, a creature |
| `x-wobble` | 1.4 s | a rattle of rotations | a toy, a pin |
| `x-flag` | 1.2 s | scaleX .84 with skewY | a pennant on a building (never a national flag) |

About 60 classes exist; `grep -n "^\.anim-scene \.x-" src/styles/71-anim-library.css` lists them with their defaults. The lint (`classes-defined`, `unknownClasses`) rejects a class the CSS does not define.

Stagger rules (measured over the 245 symbols: every one moves; median 5 animated elements, 3 motion kinds; 209 use a stagger `--d`, median .5 s, p90 1.4 s, max 3.6 s):
- steps of .3 to .6 s are the norm (`0 .25 .5 .75 1 1.25` for six beans; `0 .5 1 1.6 .9` for five lamps); never three things with the same delay (the rubric rejects lockstep: I12, instant reject 4);
- the class default duration is usually right (an explicit `--ad` appears in only about 60 places, median 3.2 s); set one when five items must share a rhythm (`--ad:2.4s` for five lanterns) or to detune two neighbours;
- nest motions with wrappers: `<g class="x-bob" style="--d:.5s"><path .../><g class="x-flicker" style="--d:.5s"><path .../></g></g>` (a floating lamp with a flame);
- motion belongs to PARTS (a flipper, a flame, a bean, a wave, a wing), not to the whole picture; one global wobble is the lowest-effort fake and reads as one.

## 4. The build recipe (silhouette first)

1. STUDY: render the exemplars (`node tools/anim-pack.mjs reference --render`) and open the icon PNGs nearest your motif; name the model and the craft you take (section 8).
2. SILHOUETTE: draw the motif as ONE mass in one class (`k`) on the 64 x 64 grid, at least 36 x 36 units, centred, inside about x 4..60 and y 4..60. If it does not read as the thing at 28 px in one colour, redraw before adding anything.
3. TONES: add `c` (hero), `s` (secondary plate), `w` (highlight), `m` (far or ground). At most three big colour areas; a depth cue by an `s` plate behind or an `m` band below. Nothing smaller than 3 units that matters.
4. STROKES: primary contour `t` (3.4) only where the silhouette needs an edge, interior detail `lk` (2.4), highlights and wave tops `lw` (1.4). Keep a clear weight hierarchy.
5. ANCHOR: a ground line `<path class="lm" d="M3 60h58"/>` (y 54 to 62) or a wave band; ONE off-centre accent (a sparkle, a bubble, a sun) as counterweight in an empty corner.
6. MOTION: pick 3 to 7 parts (the median accepted icon has 5 moving groups, the exemplars 7 to 14) in at least 2 and usually 3 motion kinds; give each its own `--d` (steps .3 to .6); wrap every transformed or nested thing; add a wave band or a sparkle.
7. GATES: `lint --file <pack file> --only small` must pass (floors: 7 shapes, 3 paths, bytes 600 to 14,000; read the thin spots: median 12 shapes, 9 paths, 1,018 B rendered, 5 moving groups, 3 kinds); render light AND dark and judge the contact sheet; score `rubric.md` part B.

Bytes: `svg()` p10 288, median 652, p90 1,183; regional symbols p10 555, median 778, p90 1,202, 13 shapes median (p10 9, p90 18). Above about 1.7 KB is an outlier (one core item reaches 3,454 B). The lint measures the RENDERED item, which adds the span and svg wrapper (about 250 bytes): median 1.0 KB, 0.8 to 1.4 KB between the 10th and 90th percentile, exemplars 1.4 to 1.9 KB; the hard cap is 14,000.
Do not pad to reach a number: the lint measures hidden shapes, tiny specks and copies.

## 5. Composition and readability at 28 px

At 28 px the svg occupies 92 % of the tile, 0.40 px per unit: a 2.4 stroke is a 1 px line and anything under about 3 units disappears. What survives: ONE big mass (40+ units), 2 or 3 flat colour areas, a clear outline, one accent.

| Reads well at 28 and 132 px | Fails at 28 px |
| --- | --- |
| `asia-east/tw-bubble-tea` (cup, straw, amber fill), `us-pacific/hi-sea-turtle`, `asia-east/cn-panda`, `us-southeast/natchez-steamboat-wheel`, `us-northeast/nj-tomato`, `core/sym-heart`, `asia-east/nagasaki-lanterns` | `us-northeast/ma-cranberries` (23 shapes become noise), `world/tokyo-jp-sakura` (a hairline branch), `world/rome-it-colosseum` (a smudge), `world/amsterdam-nl-canal-houses` (reads as four bottles), `us-pacific/lahaina-banyan-whale` (an illegible blob), `asia-south/varanasi-floating-diyas` (a grey slab and orange bars) |

Rules: dominant shape >= 36 x 36 units; <= 3 big colour areas; minimum feature 3 units; primary contour `t`, interior `lk`, highlights `lw`; extent: the drawing fills at least about 59 % of the width and 53 % of the height of the frame (median 100 % and 88 %; lint `extentW`, `extentH`). At 128 px the extras show (inner `lk` details, glints, bubbles, the second wave band): they are the reward, never what makes the motif readable.
The tile's rounded corners crop anything outside about x 4..60.

## 6. Patterns worth copying

- Stagger one motion over a set: five lanterns, each its own `x-swing o-t` group with the same `--ad:2.4s` and `--d` 0 to .8 (`asia-east/nagasaki-lanterns`): one staggered class makes a festival.
- Wave band: a path WIDER than the tile with a 12-unit period, so `translateX(-12px)` loops seamlessly (77 of 245 items; usually two bands with `--d` 0 and .5, one `lc`, one `lw`):
  `<path class="lc x-wave" d="M-2 58q3-2 6 0t6 0q3-2 6 0t6 0 ..."/>`: `M-2 58` then `q3-2 6 0t6 0` repeated 12 times (the `wv()` helper in section 7; the corpus repeats it 11 to 12 times), so the path is wider than the tile after the 12 px shift.
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
const wv = (y, d, cls) => `<path class="${cls || 'lc'} x-wave" style="--d:${d || 0}s" d="M-2 ${y}${'q3-2 6 0t6 0'.repeat(12)}"/>`; // a wave band
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
| generic motifs (a tree, a sun) for a place | says nothing about the place | the place's own animal, plant, food, craft, instrument or building detail |

## 10. Gates (the same as for scenes, in this order)

STUDIED (model named, PNG opened) -> DRAWN (recipe above) -> `node tools/anim-pack.mjs lint --file src/app/72-anim-pack-<id>-<group>.js --only small` PASS with no waiver -> LOOK: `sheet --file <that file> --only small --mode light --out .anim-ref/<name> --contact`
and `--mode dark`, open the PNGs, judge the contact sheet as a 28 px thumbnail, compare with the exemplar -> SCORED on `rubric.md` part B -> reviewed by an independent reviewer for a batch. A pack file also carries the scenes other agents draw into it
(`B.scenes()`): `--only small` keeps your elements and leaves their scenes out.
