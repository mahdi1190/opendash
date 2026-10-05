# Kit reference: `animSceneKit()` and the scene motion and evening classes

Everything a full-screen scene (1600 x 900) is built from. Source of truth: `src/app/71-anim-0region.js`, functions `animSceneKit()` and
`animSceneCss()` (the legacy aliases `usSceneKit()` / `usSceneCss()` are the same functions). Verified against that file. The ranges quoted are the
ones measured over the 229 strict-set scenes (`tools/anim-quality.json` profile `scene`); stay inside them unless the picture needs otherwise and you can
say why.

Contents: 1 the shell of a scene file, 2 registering a scene, 3 the helpers, 4 the motion classes, 5 the evening grade, 6 what the kit lacks (local helpers),
7 mistakes the kit makes easy.

## 1. The shell of a scene file

A scene file is one classic script in `src/app/`, wrapped in an IIFE (every `src/app` file shares ONE script scope: a bare top-level `const K` in two
files is a SyntaxError). At load time it may use only `animSceneKit()` and `animRegionSceneAdd` (region configs and scene files load BEFORE the registry:
touching `ANIM_SLOTS` and the like throws "Cannot access ... before initialization").

```js
(function () {
  const K = animSceneKit();
  const { U, R, rnd, lin, linU, radU, mv, full, ridge, canopy, mesa, cloud, streak, haze, rays, sun, stars, birds, shimmer, puffs, dots, lit, star5, finish } = K;
  // local helpers here (section 6), then:
  animRegionSceneAdd('<region id>', {
    key: 'country:XX',          // '<unit word>:<CODE>' (the unit's signature) or 'place:<id>' (a big city), exactly as `brief` lists it
    label: 'What is drawn',     // "Kyoto at dusk": the region appends ", <name>"
    site: 'The place under "Welcome to ..."',
    colour: 'orange', mood: 'calm', season: 'any', tags: ['landscape', 'sunrise'],
    svg: () => { /* returns the inside of a 1600 x 900 drawing as ONE string */ },
  });
})();
```

- `colour`: blue indigo violet pink red orange amber green teal slate. `mood`: calm cheerful proud cosy focused dreamy energetic neutral. `season`: `'any'` or
  an array of spring summer autumn winter (a scene drawn in autumn colours says `['autumn']`). **`season` is only a LABEL** (the gallery card and the "picked for <season>" note): it never decides when a region scene plays (a region scene plays wherever the user is, in any month; only the plain daily pool filters on it). Use `'any'` unless the picture really shows one season: the tropics have no four seasons, so a scene there says `'any'` and shows no autumn leaves or snow; the app's calendar is the northern one, so a southern autumn picture (March to May) is labelled `['spring']`. `id` is optional (default `signature` for a unit, `skyline` for a place).
- The file must sort BEFORE the pack files and the registry when loaded (`71-anim-region-<id>-scenes-N.js`: use exactly the name `brief` gave you; a scratch
  file named `scratch.js` loads after the packs, so `B.scenes()` has already run and `lint --file` reports "registered no new or changed item").
- Call `U()` INSIDE `svg()`, never at file level: ids must be fresh on every render, or two live renders share ids.
- `svg()` must return a string with no `NaN` / `undefined`. Allowed markup: shapes, groups, gradients. Forbidden: text, image, `use`, `a` / href, `style`,
  script, `on*` handlers, remote `url(...)`, SMIL (`animate`, `set`), `foreignObject`. Gradients only through `lin / linU / radU` with ids from `U()`. `clipPath` is allowed (ids from `U()` too); the kit has no helper, `clipped(d, inner)` in `recipes.md` section 4 is the tested one (cone gullies, a reflection kept inside the river).
- The render of a scene must stay under 32,000 bytes (target <= 29,000). A scene at 31,000 is an instant reject.

## 2. Registering and what the builder adds

`animRegionSceneAdd` only stores the scene. It becomes an opening item when the pack file of its group calls `B.scenes()` (the scaffold already does). The
builder fills in: item id (`<code>-signature` or `<place>-skyline`), label suffix (", <name>"), tags, `slot: 'opening'`, `full: true`, priority, region fields
and the `when` rule. Never write those yourself. Small symbols: `B.element('<CODE>', {id, label, colour, mood, tags, season, svg})` and
`B.place('<id>', {...})` (see `small-icons.md`).

## 3. The helpers (every one, with parameters and sane ranges)

Colours are CSS strings. `stops` = `[[offset, colour, opacity?], ...]`, offset 0..1.

### Gradients, shapes and ids

| Call | Returns | Parameters and ranges |
| --- | --- | --- |
| `U()` | a fresh id (`us1`, `us2` ...) | one per gradient, inside `svg()` |
| `R(v)` | `Math.round(v)` | wrap every computed coordinate: it saves bytes (the 32 KB cap) |
| `rnd(seed)` | a seeded generator `() => 0..1` | `const r = rnd(7)`; the same seed gives the same picture every render; give every call its own seed |
| `lin(id, stops)` | a vertical `linearGradient` (top to bottom) | sky and water: 3 to 5 stops; the horizon end at least .2 lighter (median +.36) |
| `linU(id, stops, x1, y1, x2, y2)` | a gradient in user space | a ramp across a mountain face, a cloud belly, a haze band |
| `radU(id, stops, cx, cy, r)` | a radial gradient in user space | light glow: `[[0, '#ffd890', .55], [1, '#ffd890', 0]]`, r 560 to 900, laid over the whole picture with `<rect width="1600" height="900" fill="url(#id)"/>` |
| `stops(a)` | the `<stop>` elements | rarely needed directly |
| `full(fill, y)` | a rect from y (default 0) to 900 across 1600 | the sky first: `full('url(#sky)')`; ground slabs: `full(fill, 640)` |
| `star5(cx, cy, Ro, ri)` | the `d` of a five-point star | ornaments, a lit star on a tree |
| `st(o)` | the `style` string `mv` uses | not needed directly |

### Sky and light

| Call | What it draws | Parameters and ranges |
| --- | --- | --- |
| `sun(x, y, r, core, halo, rise)` | a halo (radius 6 r, stops .85 / .35 / 0) behind a disc, on `usglow` (6 s); with `rise` true on `usrise` (once over 9 s from 90 px lower) | r 36 to 60 (median 44); core near-white (`#fff4d8`); halo = the horizon colour; dusk y 440 to 590, day y 140 to 380; x usually the right half. The disc stays visible at night (the grade only dims it, there is no day-only class): a LOW sun then reads as a moon, a HIGH bright disc with rays looks wrong at night. A night scene has a moon, not a `sun()` (`recipes.md` section 7). With `rise` true the rise takes 9 s: a `sheet` paused at the default 6.5 s shows the sun mid-rise, so look at it with `sheet --still` (animations off: the rest frame reduced motion shows, the sun in its place) or `--at 9500` |
| `rays(x, y, len, col, op)` | 14 soft wedges fanning from (x, y), turning once per 40 s | len 700 to 1200, op .14 to .26; ALWAYS at the same (x, y) as the sun and the glow radial. **Care:** a sunburst tinted red and white (or red on white round a red disc) reads as a rising-sun ensign, a national flag. Tint the rays in the sky's own warm light (peach, gold, a pale tint of the horizon), as soft wedges with no stripes, and never in the colours of a flag |
| `streak(x, y, w, col, op, dur)` | two thin cloud ellipses drifting (dx 90 px) | y 90 to 300, w 190 to 380, col a pale tint of the sky, op .3 to .6, dur 60 to 90 s; 1 to 2 per scene (median 1) |
| `cloud(x, y, s, tone, op, dur, del, top)` | a six-puff cloud with a belly gradient, drifting (dx = 60 + 40 s px) | s .55 to 1.4, op .7 to .95, dur 46 to 80 s, `del` 0 to 40 (it is applied as a NEGATIVE delay: stagger the clouds 4 to 40 s apart), `tone` = the BELLY colour (dusk magenta or the horizon hue), `top` = the lit colour (default white); 2 to 3 per scene |
| `stars(seed, n, y1)` | n dots (r 1 to 2.6) in the top y1 px, class `us-star` (invisible by day, .8 at night) | n 24 to 44, y1 140 to 300; give every scene its own seed. They are NOT in a light-theme render: a scene painted as night adds always-on stars as well (`sst`, `recipes.md` section 7) |
| `birds(seed, n, x, y, col, size, dx)` | n birds, each a `usglide` (16 to 26 s, own negative delay) holding a `usflap` (.5 to .9 s) | n 3 to 7, around (x +-130, y +-60), y 200 to 420, size 1 to 1.3, dx 480 to 700, col = a dark tint of the sky (`#5a3a68`, `#34405a`); two calls at different sizes make a flock |
| `haze(y, h, col, op)` | a horizontal band, transparent at both ends and `op` in the middle, 2000 px wide | h 60 to 140, op .3 to .7, col = the horizon glow; place it at the TOP of each ground layer (y = layer top minus 40 to 100); every plane boundary gets one |

### Ground, water and life

| Call | What it draws | Parameters and ranges |
| --- | --- | --- |
| `ridge(fill, y, amp, n, seed, foot)` | a smooth range from x -160 to 1760 filled down to `foot` | y = top, amp 26 to 50, n 9 to 14 points, foot 640 to 740 (where the next plane starts); far planes lighter and greyer |
| `canopy(fill, y, amp, seed, x0, x1, foot)` | a tree-crown line of uneven bumps | amp 16 to 34, foot = y + 30; lighter row first, haze, darker row second |
| `mesa(x, y, w, h, fill, top, cap)` | a stepped flat-topped butte plus a lit top strip | build canyons from a loop of these or a local `butte()` with 4 to 6 ledges |
| `shimmer(seed, n, x0, x1, y0, y1, col, w)` | n water glints (`usshim`, own period 2 to 4.6 s, negative delay); length grows towards the viewer | n 20 to 110 (median 47), w 40 to 70, y range = the water; make TWO calls: warm and dense under the light (`#fff0cc`), cool and sparse everywhere (`#e2eef4`). 112 B per glint: 40 glints are 4.5 KB |
| `puffs(x, y, n, col, size, dx, dur, dy, sc)` | n circles on `uspuff` (smoke, steam, spray) | n 3 to 4, size 8 to 30, dur 3 to 6 s, dx default -120, dy default -260, sc default 2.6; with `dx: 0, dy: 0, sc: 1` it is a flash |
| `dots(d, col, w, gap, cls, extra)` | a round-capped DASHED stroke along path `d`: a string of lamps or window rows | `cls` `'us-lamps'` (night-only) or `''` (always on); lamp string w 4 to 8 and gap 12 to 120; window rows `w` 5 and gap 12; `extra` is a raw attribute string (`' opacity=".5"'`) |
| `lit(x, y, w, h)` | a rounded rect of class `us-lit` (yellow `#ffd27a`, appears with the evening grade) | a HERO window: a keeper's house, a villa, a lantern room, an aircraft light. A `<path>` that carries `class="us-lit"` and holds many pane subpaths (`M x y h w v h h -w z` per pane) is the cheap lit facade: the lint counts it as ONE shape and ONE lit pane group however many panes it holds (it does not raise `shapes`). It is invisible in a light render: paint the pane as well when the picture is a night one (`recipes.md` section 7) |
| `mv(cls, o, inner)` | `<g class="x-<cls>" style="...">` | see section 4 |
| `tint()` | the `us-tint` rect | only `finish()` calls it |
| `finish(op)` | a vignette (clear to 55 %, `#0b0d22` at the edge, up to `op`) plus the tint rect | op .28 to .38 (.30 in half the corpus, .34 or .38 for very dark scenes); ALWAYS the last thing in `svg()` |

### `mv(cls, o, inner)` in detail

`o` keys other than `to` become CSS custom properties (`{ad: '36s'}` writes `--ad:36s`); `to` writes `transform-box:view-box;transform-origin:<to>`.

| Key | Meaning | Notes |
| --- | --- | --- |
| `ad` | the duration (`'36s'`) | WITH the unit. Own value per element |
| `d` | the delay (`'-7s'`) | NEGATIVE, so the scene is already mid-motion at t = 0 |
| `dx`, `dy` | travel (`'12px'`) | drift, glide, move, puff, fall, bob (dy) |
| `sc` | end scale (puffs) | |
| `to` | the pivot in user space (`'230px 880px'`) | for sway: the FOOT of the trunk; for a flame: its base; for a wheel: its centre. Without it the pivot is the element's own box centre |

Rules: put a `transform` attribute on a WRAPPER group and the `x-` class on the child (`<g transform="translate(800 700)">` + `mv(...)` inside); never both on one element
(lint rule `x-transform`). Motion classes nest: a flapping bird is `usglide` > `usflap`; a lamp on a bobbing boat is `usmove` > `usbob`; a torch is `usflicker` plus a
separate `usglow` halo. Mirror a vehicle with `scale(-1 1)` in an INNER `<g transform>`.

## 4. The motion classes (transform and opacity only; live only while the scene is on screen; static under reduced motion)

Class = `x-us<name>`. Defaults are the CSS defaults; every use should override `--ad` (and `--d`). The corpus column is the median share of the 229 scenes that use it.

| Class | Motion | Use it for | Defaults and variables | Typical values |
| --- | --- | --- | --- | --- |
| `usdrift` | translateX -dx -> +dx -> -dx, ease | clouds, streaks, fog banks, dust ellipses | 46 s, `--dx` 80px | ad 50 to 80 s, dx 90 to 116 px; 100 % of scenes, about 4 per scene |
| `uspar` | the same keyframe | a WHOLE depth layer (parallax) | 30 s, `--dx` 80px | far ad 55 to 120 s dx 6 to 10 px; mid 34 to 48 s dx 10 to 14; near 26 to 32 s dx 14 to 26; 2 to 3 per scene |
| `usglide` | translate dx*(-.5 .. +.5) and dy, opacity 0 -> 1 -> 0, linear | birds crossing (nest `usflap` inside) | 18 s, `--dx` 500px, `--dy` -30px | ad 17 to 25 s, dx 500 to 700, dy -40 to +20; fades hide the loop seam |
| `usflap` | scaleY 1 -> -.35 | wings, INSIDE a glide | .7 s | ad .5 to .9 s, own delay |
| `usshim` | opacity .1 -> .9 and translateX -8 -> 8 | water glints (small rects) | 3 s | ad 2.3 to 4.3 s, own negative delay; 47 per water scene |
| `uspuff` | translate and scale .35 -> `--sc`, opacity 0 -> .95 -> 0 | chimney smoke, steam, spray, a camp fire's smoke, a flash | 3.6 s, `--dx` -120px, `--dy` -260px, `--sc` 2.6 | ad 2.4 to 7 s |
| `usmove` | translateX -dx/2 -> +dx/2, LINEAR, one way (wraps) | ships, trains, cars, motorbikes, a wave line | 24 s linear, `--dx` 400px | dx 1300 to 1900 for a full crossing from x -150 to 1750 (the jump back happens off the drawn world); ad 17 to 110 s, street traffic 14 to 32 s |
| `usbob` | translateY -dy -> +dy | boats, buoys, balloons, animals, fireflies | 3 s, `--dy` 5px | ad 3 to 6 s, dy 1.5 to 6 px |
| `usglow` | opacity .82 -> 1 and scale .97 -> 1.04 | halos, lamp glow, torch glow, a star-twinkle group | 6 s | ad 2.5 to 6 s |
| `usrise` | translateY 90 px -> 0 and opacity .6 -> 1, ONCE | the rising sun (`sun(..., true)`) | 9 s, `--ai` 1 | one per scene |
| `ussway` | skewX -3deg -> 3deg | grass, reeds, cattails, hanging moss, wheat | 4 s | ad 4 to 7 s; pivot at the foot (`to: 'x px 900px'`) |
| `ussway2` | rotate -.8deg -> .8deg | trees, palms, cacti, banners | 6 s | ad 4.7 to 9 s; pivot at the trunk foot |
| `usspin` | rotate one turn, linear | sun rays (40 s), a windmill (5 s), a propeller (.28 s), a wheel | 40 s linear | `rays()` already uses it |
| `usflag` | skewY 0 -> -4deg with scaleX .94 | flags on a pole (of a building: never a national flag), pennants, a windsock | 2 s | ad 2 to 4 s; pivot at the pole |
| `usflicker` | scaleY 1 -> 1.18 with opacity .95 -> .8 | flames, torches, beacons, aircraft lights, a lamp | .22 s (too fast: set it) | ad .4 to 2.1 s (median 1.3); pivot at the flame base |
| `uslift` | translateY 0 -> -620, ONCE | a rocket (one scene) | 14 s, `--ai` 1 | |
| `usfall` | translate (dx, 640) with rotate 380deg, opacity 0 -> 1 -> 0, linear | petals, leaves, snow, ash | 10 s, `--dx` 80px | ad 9 to 17 s, dx -120 to 120; 18 per scene when used (up to 62); two layers for snow |

Budgets from the corpus: distinct kit classes per scene median 9 (p10 7, p90 10); moving groups median 60 to 65 (lint floor 12, advisory p10 22, rubric bar 25); sky-and-light
groups (`usdrift`, `usspin`, `usglow`, `usrise`) are not "life": the lint's ambient count needs birds, glints, puffs, sway, boats, falls.

Amplitudes stay small and quiet: trees .8 degrees, grass 3 degrees, layers breathe 8 to 26 px over 30 to 120 s, boats bob 2 to 5 px. Large and fast motion only for things that
are fast in life: birds (28 px per second), traffic (60 to 135 px per second), a propeller.

## 5. The evening grade (why paint is for daylight)

`finish()` ends every scene with a vignette and `<rect class="us-tint">`. The page then grades the whole picture without a second drawing:

| Class | By day | Dark theme, `tod-dusk`, `tod-night` | Use |
| --- | --- | --- | --- |
| `us-tint` | opacity 0 | .6 (dark theme and dusk), .85 (night): multiplies `#4a4f94` over everything | only through `finish()` |
| `us-lit` | opacity 0 (fill and stroke `#ffd27a`) | .92 | window RECTS and hero lights: `lit(x, y, w, h)`, or a path of pane rects with `class="us-lit"` |
| `us-lamps` | opacity 0 | .92 | dashed lamp and window DOTS: `dots(d, col, w, gap, 'us-lamps')` (the stroke colour is yours) |
| `us-star` | opacity 0 | .8 | `stars(seed, n, y1)` |

`html .anim-scene.ap-full:is(.tod-day, .tod-dawn)` forces all four to 0: the clock wins over the theme. Consequences for drawing:

0. **The four classes are invisible in the LIGHT theme at the day clock, which is how most people see a scene.** So the rule below ("never paint for night") is about a daylight or dusk picture getting a night look from the page. A scene that is MEANT to be a night picture (a moon, stars, lit windows are the subject) paints them as always-on shapes and adds the classes on top: `recipes.md` section 7, with tested helpers (`sst`, `moon`, `pane`, `panes`, `lamp`).
1. Never paint "for night" a picture that is a daylight or dusk one. One daylight palette, one drawing, three looks.
2. Everything that should be lit at night is a SEPARATE element with `us-lit` / `us-lamps` / `us-star`, not part of a painted building. Draw pale day glass first (a dashed stroke at opacity .45
   in a dark blue-grey, or `fill` panes), the lit layer second. Two staggered dash patterns (`'8 10 8 10 8 28'` and `'8 28 8 10 8 10'`) keep the window rows from lining up.
3. A scene with no `us-lit`, `us-lamps` or `us-star` goes blue-purple and nothing comes on: every scene gets some lights (a farm: a lit window and a yard lamp; a forest: fireflies on
   `usglow`; a lake: a campfire on `usflicker` or a boat lantern; a mountain: a few lit windows in a hut and stars).
4. Fireflies, flames and halos are moving groups, not `us-lit`; they glow at all times, so keep them subtle by day (small, low opacity) or put them under a `us-lamps` parent group.
5. `finish()` is last, `us-tint` must cover the full canvas (lint rules `evening-grade` and `evening-grade-last`).

## 6. What the kit lacks: local helpers

The kit has no palm, pine, tower, city, window grid, reflection, fall, flies, blades or snow helper, and no rock, bush, crown, fern, mountain range, house, boat or clipPath helper. Every scene file defines the ones it needs inside its IIFE (twelve of the 20
corpus files each re-implement `win`, `city`, `palm`, and the pilot's six agents each rebuilt a rock, a bush, a tree, a fern, a house and a boat). `recipes.md` holds two tested sets to paste and adapt: section 5 (reflect, win, city, palm, pine, fall, snowflakes, flies, blades) and
section 6 (blob, crown3, rock, bush, rangePts / sharp / facets, frond / treeFern, hut, yacht), plus `clipped` (section 4) and the night helpers (section 7). Three cautions: output with the SAME seed and arguments as an existing scene
counts as shared shapes (lint `sharedShare` and `sharedShareAll`), so use your own seeds (unique per call, per scene and per file, above 1000), sizes and colours; instancing one helper with `<g transform="scale(s)">` repeats a `d` string (bake the scale into the coordinates); and keep helpers cheap: one path per fill colour, loops that append to one `d` string,
`R()` on every coordinate (what a layer costs: `recipes.md` section 1).

## 7. Mistakes the kit makes easy

| Mistake | Why it hurts | Instead |
| --- | --- | --- |
| `U()` at file level | every render shares ids | call it inside `svg()` |
| the same seed in two calls (`shimmer(5, ...)` twice), or the same seeds as another scene of the file or the region | the two layers coincide; identical shapes count as copies (`sharedShare`, `sharedShareAll`) | a new seed per call, per scene and per file, above 1000, never consecutive |
| `rays()` or a sunburst tinted red and white | reads as a rising-sun ensign (a national flag) | the sky's own warm light, soft wedges, no stripes |
| a night picture whose moon, stars and lit windows are only `us-star` / `us-lit` / `us-lamps` | invisible in a light render: a dark sky and a silhouette | paint them always-on and add the classes on top (`recipes.md` section 7) |
| one helper instanced with `<g transform="scale(s)">`, or `puffs()` with n above 3 | an identical `d` string per instance: `distinctRatio` counts it once, a clone row to the eye | bake the scale into the coordinates, vary a parameter per instance |
| `cloud(..., del)` with a negative number | the helper negates it | give a positive stagger (4 to 40) |
| `mv('usflicker', {})` with no `ad` | .22 s strobe | `ad: '1.3s'` |
| a `transform` attribute on an `x-` element | the animation replaces it; lint `x-transform` | wrapper group |
| `ussway2` with no `to` | it rotates about its own box centre, so a tree swings from the middle | `to: '<foot x>px <foot y>px'` |
| `usmove` with a small `dx` for a vehicle | it appears and disappears on screen | `dx: '1900px'` so it enters at x -150 and leaves at 1750 |
| window rows drawn as yellow squares | flat and always on | day glass plus `us-lamps` dashes |
| haze as a solid rect | a hard seam | `haze()` (gradient, transparent at both ends) |
| `finish()` early | the tint stops grading what is drawn after it | last, always |
