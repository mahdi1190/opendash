# Recipes: ten scene types, the skeleton, the byte budget and the tested local helpers

How to build a full-screen scene (1600 x 900) of a given type. Read the recipe for your type, then OPEN the model exemplar's PNG and its source (the `file` and key are given), then plan your own picture.
The calls and numbers below are quoted from the model scenes so that you see the right scale. **Do not paste them.** The same seed, geometry and palette reproduce that scene's shapes and the lint fails the piece
(`sharedShare`, `sharedShareAll`); a copy with new colours is an instant reject. A skeleton built only from the numbers here passes most lint rules and still looks like a flat dusk with no subject (it fails R1 and R11):
the landmark, the foreground and the place-specific motion are YOUR drawing.

Contents: 1 the skeleton and what each layer costs, 2 choosing a recipe, 3 recipes C1 to C10 and mountains, cones and strata, 4 computed structure (scale ladders, clipPath, seeds), 5 local helpers (tested),
6 helper patterns from the pilot: rock, bush, crowns, ferns, ranges, house, boat (tested), 7 a night scene painted for the LIGHT theme (tested), 8 night lights and motion checklist.

## 1. The skeleton (z-order top to bottom of the string = back to front)

```js
animRegionSceneAdd('<id>', { key: 'place:<id>', label: '<Subject> at <light>', site: '...', colour: 'violet', mood: 'proud', season: 'any', tags: ['skyline', 'dusk'],
  svg: () => {
    const s1 = U(), w1 = U(), l1 = U(), B = 640;                                  // gradient ids (fresh per render); B = waterline or ground top, 520..700
    return '<defs>' + lin(s1, [[0, top], [.3, violet], [.55, coral], [.75, peach], [1, cream]]) + lin(w1, [[0, glow], [.15, mid], [.5, deep], [1, deeper]])
      + radU(l1, [[0, '#ffd890', .6], [1, '#ffd890', 0]], sx, sy, 760) + '</defs>'
      + full('url(#' + s1 + ')') + stars(seed, 24, 200)                            // 1  sky + night stars        (the sky gradient FIRST: lint `sky-gradient`)
      + rays(sx, sy, 900, warm, .14) + sun(sx, sy, 50, core, halo)                 // 2  the one light source
      + streak(...) + cloud(...) + cloud(...) + birds(seed, 6, x, y, ink, 1, 700)  // 3  sky life
      + mv('uspar', { ad: '55s', dx: '8px' }, farPlane) + haze(...)                // 4  far plane: lightest, greyest
      + mv('uspar', { ad: '38s', dx: '12px' }, midPlane) + haze(...)               // 5  mid plane
      + '<rect y="' + B + '" width="1600" height="' + (900 - B) + '" fill="url(#' + w1 + ')"/>' + shimmer(...) + shimmer(...) + reflect(B, landmarkPaths, .3)   // 6  water or ground
      + landmark                                                                   // 7  the subject: the highest detail budget, lit() / dots(..., 'us-lamps'), a facet
      + mv('usmove', { ad: '90s', d: '-60s', dx: '1900px' }, ship) + puffs(...)    // 8  subject-specific life
      + mv('uspar', { ad: '28s', dx: '20px' }, nearPlane) + frames                 // 9  near plane + framing (the darkest tinted value) at both edges, swaying
      + finish(0.34);                                                              // 10 vignette + evening grade: ALWAYS last
  } });
```
Plan it in writing before you code: for each of the ten layers, which calls, which colours, which motion, what lights up at night. A scene drawn as "sky, a cloud and a subject on a slab" is the weak end of the corpus.

**What each layer costs.** A median scene is 22.8 KB rendered (p10 14.8, p90 29.0), the cap is 32,000 and the target is at most 29,000. The pilot's first drafts were 34 to 42 KB and needed several trimming passes: plan the bytes with this table (measured on the kit and on the helpers of sections 5 and 6, rendered bytes, 1 KB = 1,000) so that the first draft is already inside it.

| Layer | Budget | What the usual calls cost |
| --- | --- | --- |
| 1 sky | 1.0 to 1.5 KB | `lin` with 5 stops .27, `full` .05, `stars(seed, 24, 200)` .87 |
| 2 light | 1.5 to 2.2 KB | `sun` .43, `rays` .75, a `radU` glow .21, two `streak` .2 each |
| 3 sky life | 2.5 to 3.5 KB | `cloud` .6 each (three), `birds(seed, 5, ...)` 1.3, a second flock .7 |
| 4, 5 far and mid planes | 3 to 5 KB | `ridge` .2, `canopy` .6, `haze` .36 per plane boundary, a `city()` run of 1,000 units 1.4 KB without windows and 5.5 KB with window rows: the windows cost 4 KB, so one `dots()` path per row set, never a rect per window |
| 6 water or ground | 3 to 5 KB | a ramp .3, a sun-column quad .1, `shimmer` 112 B per glint (24 + 16 glints = 4.5 KB), a reflection costs as much as the paths it mirrors |
| 7 landmark | 4 to 7 KB | the highest budget, a quarter to a third of the scene |
| 8 subject life | 1.5 to 3 KB | a boat or a vehicle .4 to .6, `puffs` .37, a lamp string .15 |
| 9 near plane and framing | 3 to 5 KB | a palm .6 to 1.0 each (a left and a right pair 1.2 to 2), a row of 10 pines 5, `blades` (30) .7, a tree fern with 7 fronds 2.2, falling petals 113 B each (18 = 2 KB), fireflies 200 B each (16 = 3.2 KB) |
| 10 finish | .3 KB | `finish(.34)` |

The rows add up to 20 to 32 KB: spend the top of a range only where the picture needs it (the landmark, the near plane), and cut counts first when a draft is over (glints, window rows, instances, flies), never the composition or the motion.

## 2. Choosing a recipe

| The place is known for | Recipe | Model (`reference` prints the gold set; others are in the corpus) |
| --- | --- | --- |
| a city seen from water or a bridge approach, towers | C1 skyline at dusk | `us-northeast/new-york-skyline`; also `asia-southeast/ho-chi-minh-city-skyline`, `us-northeast/ny-statue` |
| a mountain over a lake, a volcano, a peak | C2 mountain lake | `us-mountain/co-maroon-bells` (silhouette x3 and reflection); `asia-east/jp-signature` (Fuji); `us-mountain/id-sawtooth-lake` (night); `asia-south/np-signature` |
| a monument, palace, temple on a plaza, a mosque | C3 monument | `asia-southeast/th-signature`; `texas/austin-capitol-walk` (perspective); `us-northeast/washington-monument`; `asia-south/in-signature` |
| a bridge, harbour, port, ferries | C4 harbour or bridge | `us-midwest/mi-mackinac-bridge`; `us-northeast/new-york-skyline`; `us-northeast/ny-statue` |
| desert, canyon, red rock, dunes | C5 desert or canyon | `us-mountain/az-grand-canyon` (do better than `us-mountain/nm-white-sands`) |
| forest, jungle, bayou, swamp, wildlife | C6 forest | `us-southeast/la-bayou-camp`; `us-southeast/fl-everglades-airboat`; `us-midwest/mn-loon` (wildlife) |
| snow, winter city, aurora | C7 snow or winter | `us-pacific/anchorage-aurora-moose`; `us-northeast/buffalo-deco-tower` (the thinnest corpus area: raise the bar) |
| tropical coast, lagoon, beach, islands | C8 tropical coast | `asia-south/mv-signature`; `us-southeast/virginia-beach-pier-lighthouse` (day) |
| temple town, pagodas, stupas, a lit cliff town | C9 temple or pagoda town | `asia-southeast/bangkok-skyline`, `th-signature`; `asia-southeast/mm-signature`; `asia-east/chongqing-skyline` (a night exemplar) |
| a quiet water scene: a lake or river with a pavilion, a small bridge, boats, willows or reeds, mist | C3 water variant (the landmark on a platform, `reflect()`) with C2's reflection and C6's mist layers | `asia-southeast/th-signature`, `us-midwest/mn-loon`; an accepted example: `asia-southeast/hanoi-skyline` |
| farmland, plains, windmills, steppe | C10 countryside | `us-midwest/oh-wright-flyer`; `us-southeast/ky-bluegrass-farm` (fences, barn) |

A subject that mixes two (a mosque on a harbour): take the recipe of the LANDMARK (C3) and borrow the water layer of the other (C4). Vary the type, the time of day, the season and the palette across a batch: five golden-hour harbours in a row are rejected.

## 3. The recipes

All ten follow the skeleton. Parameter ranges: `kit-reference.md`. "Pitfalls" are the corpus's own failures. They are drawn for day, golden hour or dusk, and the "Night:" line of each says what the evening classes light up; a scene PAINTED as night (the moon, stars and lit windows drawn as always-on shapes, because the evening classes are invisible in the light theme) follows section 7.

### C1. Skyline at dusk. Models: `us-northeast/new-york-skyline` (`src/app/71-anim-us2-scenes-2.js`, key `place:new-york`), `asia-southeast/ho-chi-minh-city-skyline` (`src/app/71-anim-asia2-scenes-11.js`, `place:ho-chi-minh-city`)

1. Waterline `B = 640`. Five-stop dusk sky (`0:#4f4a92 .3:#b26aa0 .55:#ff8a7e .78:#ffc080 1:#ffe4a0`); water `lin(w1, [[0,'#d98a82'],[.15,'#8a6a98'],[.5,'#4a5a8a'],[1,'#26305e']])`.
2. `full(sky) + stars(61, 24, 200) + rays(1280, 520, 900, '#ffd29a', .14) + sun(1280, 520, 52, '#fff0c8', '#ff9a68')`: the sun low in the right third just above the skyline.
3. `streak(260,170,330,'#ffb0b4',.5) + streak(1340,230,290,'#ff9a96',.5,70) + cloud(420,330,1.4,'#c8649a',.88,64,6,'#ff9488') + cloud(1100,250,1.2,'#cc6a9a',.88,58,26,'#ffa08e')`: magenta bellies, coral tops, delays 6 and 26.
4. Far row `mv('uspar', {ad:'55s', dx:'8px'}, city(seed, -160, 1760, B, 50, 180, 28, 60, '#a86a9a', .12)) + haze(540, 120, '#ffb894', .55)`: lilac, almost no windows.
5. Mid row and HERO towers `mv('uspar', {ad:'38s', dx:'12px'}, city(..., 90, 250, 36, 70, '#7a5a92', .25))`. A hero tower: a tapering path with a white-to-steel gradient (`linU`), a second path on its shadow half (`fill="#9fb0cc" opacity=".35"`), a 4 px antenna, `win()` rows (pale day glass plus `us-lamps`), floor lines (`stroke-width 2 opacity .35`).
6. Beacons `mv('usflicker', {ad:'1.6s', to:'520px 40px'}, '<circle cx="520" cy="38" r="5" fill="#ff5a4a"/>')`.
7. River: a dark quay band, the water rect, `shimmer(7, 22, 300, 1300, B+16, 740, '#ffd0b0', 70)`, two ships on `usmove` 90 s and 120 s (delay -60 s, `dx:'1900px'`), `reflect(B, towers, .3)`.
8. Street life: motorbikes, each `mv('usmove', {ad: 14+3*i + 's', d: -2.3*i + 's', dx:'1900px'})`, mirrored with an inner `scale(-1 1)`, sizes .8 to 1.16; a lamp string `dots('M136 664Q800 700 1476 664', '#ffd890', 6, 34, 'us-lamps')`.
9. Frame: two palms or pines in the darkest tint (`#1c1428`) at x about 80 and 1540, `birds(...)`, `finish(.34)`.
Night: window rows (`us-lamps`), a lamp string, the beacons, a lit ferry window; most of the skyline switches on.
Pitfalls: a skyline of bare rects (`texas/dallas-skyline`: 81 % rects, no day windows); no haze between rows; only one row; hero towers with one flat colour.

### C2. Mountain lake. Models: `us-mountain/co-maroon-bells` (`71-anim-us2-scenes-6.js`, `state:CO`), `asia-east/jp-signature` (`71-anim-asia2-scenes-7.js`, `country:JP`), night `us-mountain/id-sawtooth-lake`

1. Sky 4 stops (`[0,'#4a5a9c'],[.35,'#b08cc0'],[.65,'#ffb4b0'],[1,'#ffe2b8']`); `stars(14, 44, 220) + sun(800, 320, 30, '#fff4d8', '#ffc4a0', true)` BEHIND the summit; two cloud ellipses wrapped round the peak.
2. The mountain: ONE cone path used three times: body (`linU` ramp), snow cap with a 7-tooth hem, a shadow face (opacity .6), then `haze(540, 110, '#ffd8d0', .55)` over its base, all inside `mv('uspar', {ad:'70s', dx:'6px'}, ...)`.
3. Foothills `mv('uspar', {ad:'48s', dx:'10px'}, ridge('#6a78a8', 610, 50, 9, seed, 700) + canopy('#4e6a78', 630, 16, seed, -160, 1760, 700))`.
4. Lake at y 650 with a sunset ramp; the REFLECTION is the same paths flipped, `<g opacity=".4" transform="translate(0 1300) scale(1 -1)">` (translate by 2 x waterline); 34 glints; a boat on `usbob` (3.4 s, dy 3 px) with a lantern.
5. Near shore: a green gradient, `canopy` x2, a small structure built by a loop (a pagoda: `rect` tiers, eave paths with `Q`, `lit()` per tier), `dots(..., 'us-lamps')`.
6. Framing: two boughs or pines each `mv('ussway2', {ad:'9s', to:'-100px 100px'}, ...)`; falling petals or leaves `fall(seed, 34, [...], 4, 7, 8, 15)`.
Night: lit windows, a campfire on `usflicker` with `uspuff` smoke, stars; keep the sun low so it reads as a moon.
Pitfalls: a bare triangle with an "arrow" cap (`asia-west/lb-signature`); a cone with ellipse "clouds" across it (`asia-southeast/davao-skyline`); aspen or maple crowns as coins (the aspens of the Maroon Bells model are exactly E1: copy its peaks and reflection, not its crowns).

### C3. Monument on a plaza. Models: `asia-southeast/th-signature` (`71-anim-asia2-scenes-10.js`), `texas/austin-capitol-walk` (`71-anim-texas-scenes.js`), `us-northeast/washington-monument`

1. Day or golden sky; `streak` + 3 clouds; `birds(8, 5, 760, 250, '#34405a', 1, 600)`.
2. Horizon y 500 and ONE vanishing point (800, 500). Far trees `mv('uspar', {ad:'36s', dx:'6px'}, canopy('#6f9a6a', 470, 26, 7) + haze(440, 70, '#e8f0e0', .55))`; lawn `linU(g1, [[0,'#7aa04c'],[1,'#3f6a2c']], ...)` plus 8 translucent mowing stripes (opacity .18).
3. The monument as a FUNCTION of its base (`capitol(cx, base)`: wings, pediment, 8 columns via `Array.from`, a door arch, a dome with 5 rib strokes, a lantern, `star5(...)`, one `lit()` window): lit tone vs shade tone, a soft radial glow behind it. A tiered tower: a loop of tapered tier rects with a shaded half and a dashed tile line, repeated at 2 smaller scales (th-signature).
4. The path: `M780 500H820L1180 900H420z` plus edge strips and cross-lines computed with `k = (y - 500) / 400`, a dark gradient overlay on the lawn.
5. A scale LADDER of identical props: statues and lamps at s .5 (y 556), .9 (y 690), 1.3 (y 820); oaks at .62, 1.0 and 2.3.
6. Light `radU(l1, ..., 1300, 40, 900)` + `rays(1300, 40, 1000, '#fff6d4', .18)`; framing oaks or palms at the edges, `ussway2` 8 to 9 s.
7. Water variant (Wat Arun): the monument on a platform, `reflect()` at .3, two boats at different scales.
Night: `us-lit` windows and a lamp row along the path, lantern glow on `usglow`, stars.
Pitfalls: a flat front elevation with no depth (`asia-west/jo-signature`); a monument off the vanishing point; a landmark smaller than a quarter of the height.

### C4. Harbour or bridge. Models: `us-midwest/mi-mackinac-bridge` (`71-anim-us2-scenes-5.js`, `state:MI`), `us-northeast/new-york-skyline`, `us-northeast/ny-statue`

1. Five-stop pale sunrise; `sun(330, 438, 46, '#fff4d6', '#ffc58a', true)`; 3 streaks; 3 clouds; the far shore as a 2-path `uspar` (120 s, 40 px).
2. Water `rect y=436` (`#f4c3a6 -> #7c9ec4 -> #1f4777`); a sun column quad; `shimmer(11, 34, 190, 470, 450, 880, '#ffe6b8', 44)` + `shimmer(12, 26, 0, 1600, 470, 890, '#bcd3ee', 50)`.
3. A freighter `mv('usmove', {ad:'110s', dx:'500px'}, '<g transform="translate(900 640)">hull, cabin, lit() windows, puffs(...)</g>')`.
4. The bridge is MATHS (section 4): towers, 3 quadratic cables, 31 + 9 + 9 hangers from `qy`, a deck gradient, a truss `M${x} ${DY+16}l13 -22l13 22` repeated every 26 px, tower cross-braces, `lit()` aircraft lights. Cables run off both edges (x -160 and 1760).
5. A car crossing `mv('usmove', {ad:'40s', dx:'1500px'}, ...)`; deck lamps `dots('M-150 538H1750', '#ffd98a', 4, 70, 'us-lamps')`.
6. Near plane: `mv('uspar', {ad:'36s', dx:'26px'}, pines(...))`, static near pines `#0b1b2d`, a dark headland; a sailboat on `usbob` (5 s, dy 4 px); `birds` x2 + `finish(.34)`.
Pitfalls: a bridge from a few straight lines; a bridge that stops short of the frame edge; ships at one speed.

### C5. Desert or canyon. Model: `us-mountain/az-grand-canyon` (`71-anim-us2-scenes-6.js`, `state:AZ`). Do better than: `us-mountain/nm-white-sands`, `asia-west/sa-signature`

1. Sky `[0,'#4a3f86'],[.3,'#b05a8c'],[.55,'#ff8f5c'],[.75,'#ffcb7a']`; the glow radial `radU(l1, ..., 1180, 440, 700)` painted TWICE (over the sky, then at opacity .5 after the ground); `rays(1180, 440, 1200, '#ffe6b0', .26) + sun(1180, 440, 46, ...)`.
2. Strata are HARD-STOP gradients (`bands(id, y0, y1, cols)`, section 5): 10 warm colours for the lit layer, 8 darker and redder for the near layer.
3. Buttes from a loop (`butte(x, base, w, h, fill, steps, seed)`, 4 to 6 ledges, seeded jitter); three `uspar` layers (44 / 38 / 32 s, dx 8 / 12 / 16) each darker and redder, `haze(540, 100, '#f7b189', .5)` between them.
4. A river `M-160 720Q150 690 ...` filled teal with `shimmer(21, 28, ...)`; dust `mv('usdrift', {ad:'50s', dx:'120px'}, ellipses at .12 to .14)`.
5. Foreground rock `#3a1f26` with a thin lit rim stroke (`#ffa860`, .55), saguaros as one path each, `ussway2` 7 and 9 s pivoting at the foot, a rim-light stroke down one side.
Dunes (no good exemplar yet): each dune = TWO paths (lit face, shadow face) meeting on a crest; 3 rows at decreasing scale; a rim of light along each crest; wind sand = thin `usdrift` ellipses at .5; ripple strokes; footprints in the foreground. NOT one pale colour.
Night: stars, a campfire or a lit lodge window, a low sun as a moon.

### C6. Forest, jungle, bayou. Model: `us-southeast/la-bayou-camp` (`71-anim-us2-scenes-3.js`, `state:LA`); also `us-southeast/fl-everglades-airboat`, `us-midwest/mn-loon`

1. A glowing dusk sky with the sun IN the trees: `sun(800, 536, 54, ...)`, `rays(800, 540, 1000, '#ffd9a0', .2)`, two streaks, two clouds.
2. Far tree line `mv('uspar', {ad:'38s', dx:'8px'}, canopy('#4a3a6a', 548, 34, 12) + haze(500, 90, '#ffbc90', .45) + canopy('#35305a', 556, 24, 13, -160, 1760, 560))`: lighter row, haze, darker row.
3. Water + the glow radial + two shimmers (34 warm, 18 cool); a mid-ground subject (a stilt shack with `lit()` windows, a dock, a `us-lamps` string).
4. HERO TREES as silhouettes at four scales (1.35, 1.2, .55, .5): swollen base, knees, a crown of 12 ellipses, hanging moss strokes in `mv('ussway', {ad: 5 + seed % 3 + 's', to: ...})`.
5. Life: a pole boat on `usbob` (5 s), 16 fireflies (`flies(...)`), cattails and `blades(...)` in `ussway` 6 s, lily pads; a heron or gator eyes as a smooth tiny silhouette.
6. `finish(.38)`.
Pitfalls: crowns as stacked circles (E1); foreground blades taller than 150 px that cover the subject (`us-midwest/ia-farmland`, `ks-wheat`).

### C7. Snow or winter city. Models: `us-pacific/anchorage-aurora-moose` (`71-anim-us2-scenes-8.js`), `us-northeast/buffalo-deco-tower` (`71-anim-us2-scenes-2.js`, `place:buffalo`). The corpus is thinnest here: raise the bar.

1. Cold dusk `[0,'#2b3558'],[.45,'#5a6894'],[.74,'#b19ab4'],[1,'#e9c0a8']` with three pale streaks; two grey-violet clouds (belly `#8d9cc2`, top `#bac4de`).
2. A WARM glow behind the landmark inside a cold scene: `radU(f1, [[0,'#ffd890',.55],[1,'#ffd890',0]], 800, 400, 560)` over the sky: the one focal point.
3. Far city in two `city()` runs `#6b7aa2` + `haze(520, 140, '#d8e0f0', .5)`.
4. The landmark: stacked blocks plus shade rects at .35 to .55, rib strokes, `lit()` window columns, a lantern on `usglow`; give it a lit-side facet path and a taller silhouette (the model still reads as slabs).
5. Ground: snow gradient (`#e8eef8 -> #aebbd6`) plus a white overlay at .75, a road band, two cars (`usmove` 22 and 30 s, one mirrored), 4 lamps (`us-lit` ellipses) with `dots('M-160 815H1760', '#fff1c0', 4, 60, 'us-lamps')`, bare trees with snow caps.
6. TWO snow layers: `snowflakes(41, 44, 2, 4.5, 8, 16)` small and slow, `snowflakes(42, 18, 5, 8, 6, 11)` big and fast; a final frost veil `<rect fill="#dce6f6" opacity=".12">`.
7. Aurora (Anchorage): wavy gradient curtain paths plus vertical ray strokes (`stroke="#b8ffe0" opacity=".14"`) inside `ussway` 9 s > `usdrift` 18 s; a second curtain at 12 s and 26 s with a different phase; twinkling star groups on `usglow` (5 s and 6.4 s); dark `firs()` framing on `ussway`; breath puffs from an animal.
Rule: snow stays luminous (ground L >= .9, shadows `#aebbd6`); warm lights are the only saturated accents.

### C8. Tropical coast. Models: `asia-south/mv-signature` (`71-anim-asia2-scenes-6.js`, `country:MV`); day: `us-southeast/virginia-beach-pier-lighthouse` (`71-anim-us2-scenes-3.js`, `place:virginia-beach`)

1. Sky `[0,'#2f5a9a'],[.3,'#b278b0'],[.55,'#ff9a72'],[.72,'#ffd08a'],[1,'#ffe9b0']`; `rays(1180, 440, 1000, '#ffd9a0', .18) + sun(1180, 444, 46, ...)` at the vanishing point of the jetty.
2. Lagoon `lin(w1, [[0,'#ffb98a'],[.14,'#43c6c4'],[.5,'#16a2b4'],[1,'#0c6f94']])` (warm horizon to turquoise to deep teal), two lighter shallows (`<ellipse fill="#9be8d4" opacity=".4">`), ripples, a sun-column quad.
3. A perspective repeat: `pts = [[1180,470,.42],[1100,486,.5],[1010,506,.6],[900,534,.74],[770,574,.92],[610,630,1.14],[400,716,1.46]]` (scale grows about x1.2 per step), one `villa(x, y, s)` function (piles, deck, walls, two `lit()` windows, a thatched roof with a lit facet, a reflection strip); the far set in its own `uspar`, the near set in `usbob` (5 s, dy 2 px); the jetty is one skewed quad.
4. Ambient: `mv('usglide', {ad:'34s', d:'-6s', dx:'1500px', dy:'-60px'}, seaplane)`, 5 birds, far islands in `uspar`.
5. Frame: sand curves + 3 leaning palms.
Day beach (Virginia Beach): a 3-stop day sky, a HIGH sun `sun(1250, 140, 36, ...)` with `rays(..., '#fff', .14)`, `bld()` towers in 3 tones with pale window rows, a pier on piles, dolphins on `usbob` (3.4 to 4.2 s, dy 26 px) wrapped in `ussway2`, a white-water line on `usmove` (dx 220), striped umbrellas, a kite, a sailboat, a boardwalk foreground: 128 moving groups and it never hides the subject.

### C9. Temple, pagoda or stupa town. Models: `asia-southeast/bangkok-skyline` (`71-anim-asia2-scenes-11.js`, `place:bangkok`) and `asia-southeast/th-signature` (`71-anim-asia2-scenes-10.js`), `asia-southeast/mm-signature`, `asia-east/chongqing-skyline` (a lit cliff town)

1. Sky 5 stops, `B = 640`, the sun at (1240, 560) beside the temple, three clouds scale .9 to 1.4 (belly `#d4608e`, top `#ff8a80`).
2. Skyline far and mid `city()` runs at BOTH SIDES only (the centre stays open for the temple) inside `uspar` 55 s, `haze(540, 110, '#ffb890', .5)`, `canopy('#3a2a4a', 624, 22, seed, -160, 1760, 650)`.
3. The temple by FUNCTION: `prang(x, b, h, w, col, dark, det)`: 5 tiers via quadratic curves, niches (a rule line and 3 circles at .55), a half-shadow quad (opacity .3), a spire stroke with two gold bands and a trident finial; a platform of 3 stacked rects with arcades; the SAME tower drawn at 3 sizes (h 360 / 150 / 100) and 2 platform tones for depth.
4. Reflection `reflect(B+18, '<g fill="#e6d8c2">...</g>', .3)`; water ramp; a sun column; 34 + 28 glints.
5. Boats: a long-tail boat on `usmove` 40 s (dx 1900) with `puffs(...)`, a ferry on `usmove` 130 s mirrored with `us-lit` windows.
6. Frame: a dark pier with `dots(..., 'us-lamps')`, three palms, birds, `finish(.34)`.
Town version (cliff town): tiered stilt houses with curved eaves, rows of `lit()` windows, red lantern ellipses, a lamp string along the boardwalk, a cable-stayed bridge behind, 51 lit + 23 lamps so the grade turns the hillside on. Improve on it: its windows exist only at night, so by day the houses are flat tan slabs: add pale day glass under every lit row.
Care: sacred architecture only as respectful architecture; no figures, no statues, no deities.

### C10. Countryside or farmland. Model: `us-midwest/oh-wright-flyer` (`71-anim-us2-scenes-5.js`, `state:OH`); fences and a barn: `us-southeast/ky-bluegrass-farm`

1. Day sky 4 stops (`#4a8ad6 -> #8ec4f0 -> #d6ebf6 -> #fbf0d2`); a sun left; 4 clouds; `mv('uspar', {ad:'110s', dx:'24px'}, ridge('#9db8cc', 450, 30, 9, 3) + ridge('#7ea0a0', 470, 20, 9, 8))`.
2. Fields in one-point perspective: `VP = 430`, `ys = [436, 470, 520, 590, 690, 900]`, 5 bands each filled with random-width patches in 4 greens and golds; every quad projected with `xAt(x0, y) = R(800 + (x0 - 800) * (y - VP) / (900 - VP))`; 30 furrow lines `M xAt(x0,520) 520 L xAt(x0,900) 900`.
3. A far homestead small and hazy (a red barn and a silo), treeline blobs, a windsock on `usflag`.
4. The hero object (a windmill, a barn, a plane: wings, struts, cross-wires, propellers as `usspin` .28 s ellipses) on `usbob`, with a thin contrail.
5. Foreground: thin blades (30 to 70 px) in `ussway` 5 to 9 s, a darker green rim.
Pitfalls: foreground stalks 100 to 400 px tall and thick (they cover half the picture and read as hair); animals as stick-legged ovals; terraces or fields as parallel stripes with no vanishing point and a tiny landmark (`asia-east/tw-signature`).

### Mountains, cones and strata (the kit has `ridge` and `mesa` only; the helpers are in section 6)

The pilot's mountain scenes needed a range, a cone and strata helper that the kit does not have, and the judges still named "repeated buttes with parallel stripes" and "sheet-like hills" as weaknesses. What works:

- **A range** is `rangePts(seed, y, amp, x0, x1, step)` (peaks and saddles from a seed) drawn through `sharp(pts, foot)`, then `facets(pts, foot)` at opacity .26 to .3 in a darker tint of the same hue (the slopes turned from the light) and an open rim line `sharp(pts)` stroked 2.5 at opacity .3 in the light colour. Draw THREE ranges, each darker and redder than the one behind (`linU` ramps `a1`, `a2`, `a3`), each in its own `uspar` (110 s, 70 s, 52 s), with a `haze()` band between every pair. Never one range, never a triangle with an arrow cap, never parallel bars.
- **A cone** (a volcano, Fuji, a lone peak): ONE cone path drawn three times, the body (a `linU` ramp lit to shade), the shadow face (a second path at opacity .8), and a rim-light stroke down the lit edge; then the gullies as wedge triangles (`M x0 y0 L x1-w y1 L x1+w y1 z`, lit side reddish, shade side darker, opacity .3) trimmed to the cone's own outline with `clipped()` (section 4), so they never spill into the sky; a plume of overlapping circles in two tones on a slow `usdrift`; the reflection in a river or lake again through `clipped()`.
- **Strata** (a canyon, a mesa, sandstone): hard-stop gradient bands (`bands()`, section 4) painted INSIDE each butte with `clipped(buttePath, bandsRect)` and a different start colour or offset per butte, with the ledge lines following the form. A whole row of identical buttes under ONE shared stripe pattern is what the judges call "repeated buttes with parallel stripes": vary the width (80 to 260), the height, the number of ledges (3 to 6), the lean, the tone and the band phase of every butte, and let the near ones carry a lit rim.
- **A rock face** is `rock(corner points, seed, jit, run)` plus a few wavy bedding lines; a weathered boulder is `blob()`.
- **Snow** is a cap with a toothed hem (seven teeth in `asia-east/jp-signature`), a lit highlight stroke and haze at the base, never an arrow-shaped hat. Snow stays luminous (style-guide section 8).

### Water and ground that are not slabs, and the dark anchor (what the judges missed most, after the night render)

**A water slab** is one gradient rect from the waterline to the bottom edge with a straight top and nothing on it; the judges named "hard-edged water slabs", "water or ground with no reflection" and "hard vertical seams" in all three panels. What `us-northeast/new-york-skyline` (do better: its water is flat under the bridge), `us-mountain/co-maroon-bells` and the pilot's Fiji lagoon do instead, in this order:
1. a ramp that starts warm at the waterline and ends deep (`lin(w1, [[0, warm], [.1, rose], [.3, violet], [.7, indigo], [1, deepest]])`);
2. a thin glowing strip ON the waterline, `<rect y="B - 3" width="1600" height="6" fill="url(#wl)" opacity=".7"/>` with `wl = lin(wl, [[0, glow, 0], [.5, glow, .9], [1, glow, 0]])` (transparent at the top and the bottom edge, brightest in the middle: it hides the straight edge); `haze()` on the far shore just above it;
3. the light's column (a quad under the sun or moon, opacity .2 to .3), a warm `shimmer` under it and a cool sparse one everywhere;
4. a reef crest, a wake or a surf line: a dashed stroke (`stroke-dasharray="90 26 40 18 150 34"`) on `usmove` (48 s, dx 358 px) along the waterline; shallows as two translucent ellipses (`#3a8ccc` .26 and `#72b8e8` .16) under the landmark;
5. the landmark's reflection, `reflect(B, paths, .3 to .5)`, through `clipped()` when the water is a shaped bank or river;
6. foreground banks or framing silhouettes that overlap the lower corners, so that the rectangle's edges never show.
Ground slabs get the same treatment: contour paths, a lit rim stroke along the near edge, a path or a wheel track that leads in, scrub on the edge (`bush`).

**A dark anchor.** A palette with nothing darker than lightness .5 reads as milk and the landmark has no contrast (the judges: "washed pastel or low-contrast palettes with no dark anchor", the pilot's silver-morning harbour: "milky, with little dark"). Every scene, whatever the time of day, has ONE value near lightness .10 to .15 (tinted, never black: a plum `#170c27`, a deep teal `#1c2c2a`) in the framing silhouettes at both edges and in the near plane; the landmark has the strongest LOCAL contrast (a lit face against a darker sky behind it, or a dark silhouette against the glow); and lint `tonalRange` is at least .92 (median .977, floor .824). A deliberately pale scene (a fog, a silver morning) keeps its pale sky and gets its dark from the frame, a dark mid-ground and deep shadows in the water. Squint test: three values must read.

## 4. Computed structure (draw engineering with maths, not by hand)

```js
const qy = (t, a, b, c) => (1 - t) * (1 - t) * a + 2 * t * (1 - t) * b + t * t * c;                       // a point on a quadratic cable
let hang = ''; for (let i = 1; i < 32; i++) { const t = i / 32, x = R(T1 + (T2 - T1) * t), y = R(qy(t, TY, 828, TY)); hang += `M${x} ${y + 2}V${DY}`; }   // hangers: one path
const xAt = (x0, y) => R(800 + (x0 - 800) * (y - VP) / (900 - VP));                                        // one-point perspective: a vertical line x0 projected at depth y
const bands = (id, y0, y1, cols) => { const n = cols.length; return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${y1}">`
  + cols.map((c, i) => `<stop offset="${(i / n).toFixed(3)}" stop-color="${c}"/><stop offset="${((i + 1) / n).toFixed(3)}" stop-color="${c}"/>`).join('') + '</linearGradient>'; };   // strata: hard stops
```
A scale ladder: an array of `[x, y, s]` with s growing about x1.2 per step toward the viewer, one function per object (`villa(x, y, s)`), the far set inside a `uspar`, the near set inside a `usbob`. A tiered tower: `for (let i = 0; i < n; i++)` with tier width `w * (1 - i * k)`, a shaded half at opacity .3, a dashed line `stroke-dasharray` per tier. One path per fill colour: append to ONE `d` string in the loop.

**Ladders without clones.** `distinctRatio` and `distinctForms` count identical `d` strings once. Two habits make them identical without anyone noticing: instancing one helper with `<g transform="scale(s)">` (ten huts are ONE `d` string), and `puffs()` with n above 3 (an identical circle repeated). The same goes for a left palm and its mirrored twin and for a row of equal buttes. Bake the scale into the coordinates (`const u = (v) => R(v * s)`, as `hut()` in section 6 does) and give every instance its own parameter: a width factor, a pitch, a lean, a seed, a tone. A ladder of villas, huts, boats or palms that differ only by `s` is the weakest form of repetition: the exemplars use one object at several scales to carry DEPTH along a perspective line (`asia-south/mv-signature`: one villa from 1.46 down to .42), and spacing, haze and perspective carry it; in a row at one depth it is a clone row (rubric R15).

**clipPath.** `clipPath` is in the allowed markup and `refs-resolve` accepts it, but the kit has no helper. Use `clipped(d, inner)`: it makes the clip with a fresh id from `U()` (call it inside `svg()`) and returns the clipped group. Uses: volcano gullies and strata that must stay inside their own silhouette, a reflection that stays inside the river or the lake shape, hill scrub that must not spill past the hill.

<!-- tested -->
```js
  /** `inner` trimmed to the shape `d`: a clipPath with a fresh id, then the clipped group (cone gullies, strata inside one butte, a reflection kept inside the river). */
  const clipped = (d, inner) => { const id = U(); return `<defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs><g clip-path="url(#${id})">${inner}</g>`; };
  // use: clipped('M500 592Q690 572 772 426L846 260L956 426Q1030 556 1230 592H500z', '<path fill="#a4405c" opacity=".3" d="M884 300L927 566H945z"/><path fill="#2c1240" opacity=".3" d="M852 300L790 574H810z"/>')
  // use: clipped('M600 700Q800 660 1000 700V780H600z', reflect(740, '<path fill="#6a2a58" d="M700 640L800 560L900 640z"/>', 0.36))
```

**Seeds.** `stars`, `birds`, `shimmer`, `puffs`, `ridge`, `canopy` and every helper that calls `rnd(seed)` draw the SAME shapes for the same seed, and identical shapes count as copies (`sharedShare`, `sharedShareAll`) against the other scenes of the file, of the region and of the whole corpus. So a seed is unique per CALL, per scene AND per file, not just inside one scene: the corpus uses seeds up to about 270, so start above 1000, and take your batch number as the thousands (batch 2: 2000 and up), never two consecutive numbers (the first number drawn from consecutive seeds is almost the same).

## 5. Local helpers (tested: they run, produce valid markup and pass the structural lint rules)

Paste what you need inside your IIFE, after the `const { ... } = K;` line, then CHANGE seeds, sizes and colours. Output with the same arguments as another scene counts as shared shapes. Bytes per helper: section 1 (a palm .6 to 1.0 KB).

<!-- tested -->
```js
  /** Reflection in still water: a mirrored copy of `inner` about the line y = b, at op .3 to .4. */
  const reflect = (b, inner, op) => `<g transform="translate(0 ${2 * b}) scale(1 -1)" opacity="${op}">${inner}</g>`;
  /** Window rows on a facade: pale day glass plus a us-lamps layer that lights at dusk (x, y = top left, w x h = the facade, sx = dash gap, sy = row pitch). */
  const win = (x, y, w, h, sx, sy, glass) => {
    let d = '';
    for (let yy = y; yy < y + h; yy += sy) d += `M${x} ${yy}h${w}`;
    return dots(d, glass || '#2c3a55', 5, sx, '', ' opacity=".5"') + dots(d, '#ffd27a', 5, sx, 'us-lamps');
  };
  /** A run of filler buildings from x0 to x1 standing on y = base; wc = the share of them that get window rows (0 to 1). */
  const city = (seed, x0, x1, base, hmin, hmax, wmin, wmax, fill, wc) => {
    const r = rnd(seed); let x = x0, o = '', w = '';
    while (x < x1) {
      const bw = wmin + r() * (wmax - wmin), bh = hmin + r() * (hmax - hmin);
      o += `<rect x="${R(x)}" y="${R(base - bh)}" width="${R(bw)}" height="${R(bh)}"/>`;
      if (r() < 0.3) o += `<rect x="${R(x + bw * 0.3)}" y="${R(base - bh - 14 - r() * 14)}" width="${R(bw * 0.4)}" height="22"/>`;
      if (wc && r() < wc && bw > 22) w += win(R(x + 6), R(base - bh + 12), R(bw - 12), R(bh - 24), 12, 22);
      x += bw + r() * 4;
    }
    return `<g fill="${fill}">${o}</g>${w}`;
  };
  /** A palm, foot at (x, y), h tall, leaning `lean` px, crown scale s (about 1 to 1.7); it sways about its foot. */
  const palm = (x, y, h, col, lean, s, dur) => {
    const tx = x + lean, ty = y - h; let f = '';
    for (const a of [-172, -146, -118, -90, -62, -34, -8, 18, 160]) {
      const rd = a * Math.PI / 180, L = (70 + (a % 3) * 8) * s, ex = tx + Math.cos(rd) * L, ey = ty + Math.sin(rd) * L * 0.55 + 34 * s, cx = tx + Math.cos(rd) * L * 0.5, cy = ty + Math.sin(rd) * L * 0.5 - 12 * s;
      f += `M${tx} ${ty}Q${R(cx)} ${R(cy - 8 * s)} ${R(ex)} ${R(ey)}Q${R(cx)} ${R(cy + 10 * s)} ${tx} ${ty}z`;
    }
    return mv('ussway2', { ad: (dur || 6) + 's', d: -R(x % 5) + 's', to: `${x}px ${y}px` }, `<path d="M${x - 6 * s} ${y}Q${x + lean * 0.2} ${y - h * 0.5} ${tx - 3 * s} ${ty}h${6 * s}Q${x + lean * 0.3 + 8 * s} ${y - h * 0.5} ${x + 6 * s} ${y}z" fill="${col}"/><path fill="${col}" d="${f}"/>`);
  };
  /** One conifer: five stacked tiers, foot (x, y), h tall, w the widest tier; pines() plants a row of them. */
  const pine = (x, y, h, w, col) => {
    let d = '';
    for (let i = 0; i < 5; i++) { const top = y - h + i * h * 0.19, base = top + h * 0.34, hw = w * (0.32 + 0.68 * i / 4) / 2; d += `M${R(x)} ${R(top)}L${R(x + hw)} ${R(base)}L${R(x - hw)} ${R(base)}z`; }
    return `<path fill="${col}" d="${d}"/><rect fill="${col}" x="${R(x - w * 0.04)}" y="${R(y - h * 0.1)}" width="${R(w * 0.08)}" height="${R(h * 0.1)}"/>`;
  };
  const pines = (seed, x0, x1, y, h, col, step, w) => {
    const r = rnd(seed); let o = '';
    for (let x = x0; x < x1; x += step * (0.7 + r() * 0.6)) o += pine(x, y + r() * 6, h * (0.6 + r() * 0.6), (w || h * 0.42) * (0.8 + r() * 0.4), col);
    return o;
  };
  /** Falling petals, leaves or ash: n shapes, each with its own fall time and sideways drift. */
  const fall = (seed, n, cols, smin, smax, dmin, dmax) => {
    const r = rnd(seed); let o = '';
    for (let i = 0; i < n; i++) o += `<ellipse class="x-usfall" style="--ad:${R(dmin + r() * (dmax - dmin))}s;--d:-${R(r() * 16)}s;--dx:${R(-80 + r() * 160)}px" cx="${R(-40 + r() * 1700)}" cy="${R(r() * 160)}" rx="${(smin + r() * (smax - smin)).toFixed(1)}" ry="${(smin * 0.6 + r() * (smax - smin) * 0.6).toFixed(1)}" fill="${cols[i % cols.length]}"/>`;
    return o;
  };
  /** Snow: two layers read as depth, snowflakes(41, 44, 2, 4.5, 8, 16) small and slow, snowflakes(42, 18, 5, 8, 6, 11) big and fast. */
  const snowflakes = (seed, n, smin, smax, dmin, dmax) => {
    const r = rnd(seed); let o = '';
    for (let i = 0; i < n; i++) o += `<circle class="x-usfall" style="--ad:${R(dmin + r() * (dmax - dmin))}s;--d:-${R(r() * 14)}s;--dx:${R(-60 + r() * 120)}px" cx="${R(-40 + r() * 1700)}" cy="${R(r() * 260)}" r="${(smin + r() * (smax - smin)).toFixed(1)}" fill="#fff"/>`;
    return `<g opacity=".9">${o}</g>`;
  };
  /** Fireflies: each one a bob around a glow, with its own periods. */
  const flies = (seed, n, x0, x1, y0, y1, col) => {
    const r = rnd(seed); let o = '';
    for (let i = 0; i < n; i++) { const x = R(x0 + r() * (x1 - x0)), y = R(y0 + r() * (y1 - y0));
      o += `<g class="x-usbob" style="--ad:${(3 + r() * 3).toFixed(1)}s;--d:-${(r() * 4).toFixed(1)}s;--dy:${R(6 + r() * 14)}px"><circle class="x-usglow" style="--ad:${(1.6 + r() * 2).toFixed(1)}s;--d:-${(r() * 3).toFixed(1)}s;transform-box:fill-box;transform-origin:center" cx="${x}" cy="${y}" r="${(2.4 + r() * 2).toFixed(1)}" fill="${col}"/></g>`; }
    return o;
  };
  /** Short grass or reed blades (keep hMax <= 120: tall dense strokes over the picture read as hair); wrap the result in mv('ussway', ...). */
  const blades = (seed, n, x0, x1, y0, y1, col, w, hMin, hMax) => {
    const r = rnd(seed); let d = '';
    for (let i = 0; i < n; i++) { const x = R(x0 + r() * (x1 - x0)), y = R(y0 + r() * (y1 - y0)), h = R((hMin || 24) + r() * ((hMax || 52) - (hMin || 24))); d += `M${x} ${y}q${R(r() * 10 - 5)} ${-R(h / 2)} ${R(r() * 14 - 7)} ${-h}`; }
    return `<path fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" d="${d}"/>`;
  };
  // use: win(100, 400, 100, 120, 12, 22) + city(1003, 100, 1100, 640, 50, 180, 28, 60, '#a86a9a', 0.6) + palm(200, 800, 300, '#1c2c2a', 30, 1.2, 7) + pines(1005, 0, 1600, 760, 160, '#0b1b2d', 70)
  // use: fall(1007, 18, ['#f6c0c8'], 4, 7, 9, 15) + snowflakes(1009, 44, 2, 4.5, 8, 16) + flies(1011, 16, 100, 1500, 560, 760, '#ffe08a') + mv('ussway', { ad: '5.4s', to: '120px 900px' }, blades(1013, 30, 0, 400, 880, 900, '#160c24', 5, 24, 52))
```
`shimmer` is the kit's water-glint helper; the corpus aliases it as `glints` or `ripples`. A generic `tower`, `bld`, `crown`, `cypress`, `balloon`, `stupa`, `minaret`, `ship`, `sail`: read the version in the model scene (`grep -n "const tower" src/app/71-anim-*-scenes-*.js`) and write your own: they are the landmark craft, not boilerplate.

## 6. Helper patterns from the pilot: rock, bush, crowns, ferns, ranges, house, boat (tested)

The pilot drew a whole region (Oceania: nine scenes, seven icons) as the skill's first user; six agents each rebuilt a rock, a bush, a tree, a fern, a house and a boat from scratch inside their IIFE, and the judges then found "flat coin-circle foliage" and "cloned house rows" in the result. These are the tested versions of the pilot's best helpers (the pilot's `71-anim-region-oceania-scenes-1.js` and `-scenes-2.js`, which are not kept in the repo; the code below is the tested copy). Paste what you need, then CHANGE the seeds, sizes, colours and proportions: the pilot's own pieces have no `sharedShare` against each other because every call had its own seed. The `// use:` lines are run by `tests/anim-pack-cli.test.mjs`.

<!-- tested -->
```js
  /** An organic closed shape around (cx, cy), radii rx and ry, n points (7 to 18), wob how ragged (0.2 to 0.45): a boulder, a crown base, a bank. Not a circle. */
  const blob = (cx, cy, rx, ry, seed, n, wob) => {
    const r = rnd(seed), p = [];
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, k = 1 - (wob || 0.2) * r(); p.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    let d = `M${R((p[n - 1][0] + p[0][0]) / 2)} ${R((p[n - 1][1] + p[0][1]) / 2)}`;
    for (let i = 0; i < n; i++) { const q = p[(i + 1) % n]; d += `Q${R(p[i][0])} ${R(p[i][1])} ${R((p[i][0] + q[0]) / 2)} ${R((p[i][1] + q[1]) / 2)}`; }
    return d + 'z';
  };
  /** A broad crown in THREE tones (dark mass, mid clump, lit top: each its own blob) on a trunk: the answer to coin crowns. Foot (x, y), h to the crown centre, s the scale; it sways about its foot. */
  const crown3 = (x, y, h, s, seed, dark, mid, lite) => {
    const cy = y - h;
    return mv('ussway2', { ad: (6 + seed % 4) + 's', d: -(seed % 5) + 's', to: `${x}px ${y}px` },
      `<path fill="${dark}" d="M${R(x - 14 * s)} ${y}Q${R(x - 8 * s)} ${R(y - h * 0.5)} ${R(x - 8 * s)} ${R(cy + 40 * s)}h${R(16 * s)}Q${R(x + 9 * s)} ${R(y - h * 0.5)} ${R(x + 14 * s)} ${y}z"/>`
      + `<path fill="${dark}" d="${blob(x, cy, 150 * s, 92 * s, seed, 18, 0.42)}"/><path fill="${mid}" d="${blob(x - 22 * s, cy - 14 * s, 112 * s, 62 * s, seed + 1, 14, 0.44)}"/><path fill="${lite}" opacity=".8" d="${blob(x - 44 * s, cy - 34 * s, 62 * s, 28 * s, seed + 2, 11, 0.38)}"/>`);
  };
  /** A weathered rock mass from hand-placed corner points: each edge is cut into short jittered runs (jit 6 to 14, run 30 to 60), so a face reads as rock, not as ruled lines. */
  const rock = (pts, seed, jit, run) => {
    const r = rnd(seed); let d = `M${R(pts[0][0])} ${R(pts[0][1])}`;
    for (let i = 1; i <= pts.length; i++) {
      const a = pts[i - 1], b = pts[i % pts.length], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / (run || 40)));
      for (let k = 1; k <= n; k++) { const t = k / n, e = k < n ? jit : 0; d += `L${R(a[0] + (b[0] - a[0]) * t + (r() - 0.5) * 2 * e)} ${R(a[1] + (b[1] - a[1]) * t + (r() - 0.5) * e)}`; }
    }
    return d + 'z';
  };
  /** A ragged hedge or bush crown exactly from x0 to x1 sitting on y (lumps of 20 to 40 units, hidden foot). */
  const bush = (x0, x1, y, seed, col) => {
    const r = rnd(seed), k = Math.max(2, Math.round((x1 - x0) / 30));
    let d = `M${R(x0)} ${R(y + 20)}V${R(y)}`;
    for (let i = 0; i < k; i++) { const a = x0 + (x1 - x0) * i / k, b = x0 + (x1 - x0) * (i + 1) / k; d += `Q${R(a + (b - a) * 0.15)} ${R(y - 10 - r() * 12)} ${R(b)} ${R(y - r() * 4)}`; }
    return `<path fill="${col}" d="${d}V${R(y + 20)}z"/>`;
  };
  /** A jagged range as [x, y] points left to right (peaks and saddles); sharp(pts, foot) closes and fills it, sharp(pts) is the open top line (a rim light), facets(pts, foot) are the slopes turned from the light (opacity .26 to .3). */
  const rangePts = (seed, y, amp, x0, x1, step) => {
    const q = rnd(seed), pts = []; let x = x0, up = true;
    while (x < x1) { pts.push([R(x), R(y - (up ? amp * (0.5 + q() * 0.5) : amp * q() * 0.28))]); up = !up; x += step * (0.7 + q() * 0.6); }
    pts.push([x1, pts[pts.length - 1][1]]);
    return pts;
  };
  const sharp = (pts, foot) => {
    let d = foot == null ? `M${pts[0][0]} ${pts[0][1]}` : `M${pts[0][0]} ${foot}V${pts[0][1]}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i - 1], b = pts[i], c = pts[i + 1];
      d += `L${R(b[0] + (a[0] - b[0]) * 0.22)} ${R(b[1] + (a[1] - b[1]) * 0.22)}Q${b[0]} ${b[1]} ${R(b[0] + (c[0] - b[0]) * 0.22)} ${R(b[1] + (c[1] - b[1]) * 0.22)}`;
    }
    const e = pts[pts.length - 1];
    return d + `L${e[0]} ${e[1]}` + (foot == null ? '' : `V${foot}z`);
  };
  const facets = (pts, foot) => {
    let d = '';
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i - 1], b = pts[i], c = pts[i + 1];
      if (b[1] < a[1] && b[1] < c[1]) d += `M${b[0]} ${b[1]}L${a[0]} ${a[1]}L${R(a[0] + (b[0] - a[0]) * 0.35)} ${foot}H${R(b[0] + (c[0] - b[0]) * 0.1)}z`;
    }
    return d;
  };
  /** A fern frond: a filled blade from (x, y) to (x + dx, y + dy) arching by `arch`, with a deep pinnate edge (w = half width, n = 8 to 11 teeth). */
  const frond = (x, y, dx, dy, arch, w, n) => {
    const cx = x + dx * 0.5, cy = y + dy * 0.5 - arch, tx = x + dx, ty = y + dy, up = [], lo = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, px = (1 - t) * (1 - t) * x + 2 * t * (1 - t) * cx + t * t * tx, py = (1 - t) * (1 - t) * y + 2 * t * (1 - t) * cy + t * t * ty;
      const vx = 2 * (1 - t) * (cx - x) + 2 * t * (tx - cx), vy = 2 * (1 - t) * (cy - y) + 2 * t * (ty - cy), l = Math.hypot(vx, vy) || 1;
      const ww = w * Math.sin(Math.PI * (0.08 + 0.86 * t)) * (i % 2 ? 1 : 0.55) + 1.5;
      up.push(`${R(px - vy / l * ww)} ${R(py + vx / l * ww)}`); lo.push(`${R(px + vy / l * ww)} ${R(py - vx / l * ww)}`);
    }
    return `M${up.join('L')}L${lo.reverse().join('L')}z`;
  };
  /** A tree fern: a trunk from (x, y), h tall, a crown of arching fronds fr = [[dx, dy, arch], ...] and a skirt of hanging dead fronds; it sways about its foot. */
  const treeFern = (x, y, h, s, col, dead, fr, dur, seed) => {
    const r = rnd(seed), cx = x + 10 * s, cy = y - h; let f = '', dd = '';
    fr.forEach(([ax, ay, ar]) => { const k = 0.9 + r() * 0.2; f += frond(cx, cy, ax * s * k, ay * s * k, ar * s, 11 * s, 11); });
    for (const [ax, ay] of [[-34, 96], [30, 110], [-70, 80], [62, 84]]) dd += frond(cx + ax * 0.3 * s, cy + 14 * s, ax * s, ay * s, -8 * s, 8 * s, 8);
    return mv('ussway2', { ad: dur + 's', d: -R(r() * 5) + 's', to: `${x}px ${y}px` },
      `<path fill="${col}" d="M${R(x - 15 * s)} ${y}Q${R(x - 6 * s)} ${R(y - h * 0.5)} ${R(cx - 11 * s)} ${cy}h${R(22 * s)}Q${R(x + 14 * s)} ${R(y - h * 0.5)} ${R(x + 17 * s)} ${y}z"/>`
      + `<path fill="${dead}" d="${dd}"/><path fill="${col}" d="${f}"/>`);
  };
  /** A house on posts, nobody there: foot centre (x, y), the scale s BAKED INTO THE COORDINATES by u() (an instanced <g transform=scale> repeats one d string), wide = body width factor; give each house its own wide, s and tone. */
  const hut = (x, y, s, wide) => {
    const u = (v) => R(v * s), bw = 22 * wide;
    return `<path fill="none" stroke="#2a1428" stroke-width="${Math.max(2, R(4 * s))}" d="M${x - u(bw)} ${y}v${-u(16)}M${x - u(bw / 3)} ${y}v${-u(16)}M${x + u(bw / 3)} ${y}v${-u(16)}M${x + u(bw)} ${y}v${-u(16)}"/>`
      + `<rect x="${x - u(bw + 6)}" y="${y - u(22)}" width="${u(2 * bw + 12)}" height="${u(6)}" fill="#3a2036"/><rect x="${x - u(bw)}" y="${y - u(46)}" width="${u(2 * bw)}" height="${u(24)}" fill="#6a3a50"/>`
      + `<path fill="#2a1428" d="M${x - u(bw + 10)} ${y - u(44)}L${x} ${y - u(72)}L${x + u(bw + 10)} ${y - u(44)}z"/>`
      + `<rect x="${x - u(8)}" y="${y - u(42)}" width="${u(12)}" height="${u(16)}" rx="2" fill="#ffc872"/>${lit(x - u(8), y - u(42), u(12), u(16))}`;
  };
  /** A sailing yacht centred on x = 0 at the waterline (hull, mast, mainsail and jib, a shade side each); mir flips it, heel tilts it. Place it with <g transform="translate(x y)"> and mv('usbob', ...) inside. */
  const yacht = (sc, mir, heel, hull, sailL, sailD) =>
    `<g transform="scale(${mir ? -sc : sc} ${sc}) rotate(${heel})"><path fill="${hull}" d="M-46 0h92l-14 12h-64z"/><path fill="${sailL}" d="M-3 -98Q-34 -52 -50 -8L-3 -8z"/><path fill="${sailD}" opacity=".6" d="M-3 -98Q-18 -50 -26 -8L-3 -8z"/><path fill="${sailL}" d="M5 -88Q30 -48 46 -10L5 -10z"/><path fill="${sailD}" opacity=".5" d="M5 -88Q22 -48 30 -10L5 -10z"/><path stroke="${hull}" stroke-width="2.4" d="M0 -8V-104"/></g>`;
  // use: '<path fill="#2a3a20" d="' + blob(800, 600, 90, 50, 1031, 14, 0.3) + '"/>' + crown3(300, 800, 180, 1, 1033, '#1c2c2a', '#2e4a42', '#4a7a60')
  // use: '<path fill="#6a4a40" d="' + rock([[100, 700], [160, 560], [300, 520], [420, 600], [460, 700]], 1037, 10, 40) + '"/>' + bush(100, 400, 700, 1039, '#2a3a20')
  // use: (() => { const p = rangePts(1041, 534, 78, -160, 1760, 150); return '<path fill="#b84e6a" d="' + sharp(p, 610) + '"/><path fill="#6a2858" opacity=".26" d="' + facets(p, 610) + '"/><path fill="none" stroke="#ffc090" stroke-width="2.5" opacity=".3" d="' + sharp(p) + '"/>'; })()
  // use: treeFern(300, 800, 160, 1, '#244a40', '#6a5a30', [[-80, -20, 30], [-50, -60, 30], [0, -80, 20], [50, -60, 30], [80, -20, 30]], 7, 1043) + hut(470, 704, 0.62, 1) + hut(530, 712, 0.5, 1.2)
  // use: '<g transform="translate(900 640)">' + mv('usbob', { ad: '5.4s', d: '-1.5s', dy: '3px' }, yacht(0.8, false, 0, '#274b56', '#fbf8ec', '#8a9ab0')) + '</g>'
```
What each one solves, and what it costs (rendered bytes):

| Helper | Use it for | Cost | What to vary per instance |
| --- | --- | --- | --- |
| `blob` | boulders, banks, shrubs, the base mass of a crown | .25 KB | `n`, `wob`, `rx` / `ry`, seed |
| `crown3` | broad foliage (rainforest, plane, fig, gum): ONE dark mass, a mid clump and a lit top on the sun side, a trunk that carries into it | 1.0 KB | the three tones, `s`, the lean of the lit clump |
| `rock`, `bush` | cliff faces, outcrops, hedges and scrub lines | .2 KB each | `jit`, `run`, the corner points; the lump size |
| `rangePts`, `sharp`, `facets` | a mountain range with a shadow side (section 3, "Mountains, cones and strata") | .36 + .19 KB | seed, `amp`, `step`, one per plane |
| `frond`, `treeFern` | ferns, cycads, palms with feathered fronds | .2 KB per frond; a tree fern of 7 fronds 2.2 KB | the frond list, `s`, the dead skirt |
| `hut` | a house, hut or shed: scale baked in | .4 KB | `wide`, `s`, the roof pitch and the tones |
| `yacht` | a sailing boat; for a canoe or a ferry write your own hull and keep the `usbob` wrapper | .4 KB | `sc`, `mir`, `heel`, sail tones |

The kit's own `ridge` and `canopy` are enough for FAR planes; the helpers above are for the planes you look at (mid, landmark, near). They are starting points, not finished art: the pilot's judges still named "mushroom or fringed palms" and crude ferns in the pilot's own pieces, so shape the frond list, the lean, `s` and the dead skirt for YOUR subject, and look at the result at full size (a toy scene built from every helper above renders as a believable range, cone, crowns, huts and a boat, with a rough fern: tune it).

## 7. A night scene painted for the LIGHT theme (tested)

`us-star`, `us-lit` and `us-lamps` are opacity 0 unless the dark theme, `tod-dusk` or `tod-night` is on, and `tod-day` / `tod-dawn` force them back to 0 (`kit-reference.md` section 5). Most users see a scene in the LIGHT theme, so a scene meant to be night that gets its moon, stars and lit windows from those classes alone is, in a light render, a dark sky and a silhouette with nothing lit (the pilot's setup agent only learned the pattern from the Anchorage exemplar's source). The pattern, used by `us-pacific/anchorage-aurora-moose` and by the pilot's Fiji scene:

1. **Paint the night as always-on shapes**: stars as plain circles in a `usglow` group (`sst`), the moon with its halo (`moon`: ONE light, never a `sun()` as well), lit windows as warm panes drawn as ordinary shapes (`pane`, `panes`), lamp heads and their glow (`lamp`).
2. **Add the evening classes on top of the painted lights**, never instead of them: `lit()` over every painted pane (`pane()` and `panes()` do it), `dots(..., 'us-lamps')` over a lamp string, `stars()` next to `sst()`. At the day clock they are 0 and the painted picture stands alone; at dusk and night they ADD to it: more stars, a full-strength `#ffd27a` core over each painted pane (so paint the panes a little more muted, `#d9a05a` to `#ffc872`, and the night window is brighter than the light one) and a lit lamp string. Know what the wash does: `finish()` is last and its `us-tint` (a multiply of `#4a4f94`, .6 in the dark theme and at dusk, .85 at night) multiplies EVERYTHING drawn before it, the evening layers included: at night every colour is multiplied by about .40, .41 and .64 (red, green, blue), in the dark theme and at dusk by .57, .59 and .75. So the night render is a darker, bluer version of the picture and a light stays a light only by contrast: keep the buildings, the foreground and the water dark, the panes warm and light, and give the night render MORE lit things, not fewer (a hero window, a lamp string, 24 extra stars).
3. A `<path>` that carries `us-lit` and holds many pane subpaths counts as ONE shape and ONE lit pane group for the lint, however many panes it has: the cheap lit facade is two paths (`panes()`: one painted, one `us-lit`), not forty rects. It does not raise the shape count.

<!-- tested -->
```js
  /** Always-on stars: plain circles (the kit's stars() is us-star, opacity 0 by day, so it is NOT in a light render). Own seed per call; wrap in mv('usglow', ...) so they twinkle. */
  const sst = (seed, n, y1, op) => { const r = rnd(seed); let o = ''; for (let i = 0; i < n; i++) o += `<circle cx="${R(r() * 1600)}" cy="${R(r() * y1)}" r="${(0.9 + r() * 1.5).toFixed(1)}"/>`; return `<g fill="#fff3e0" opacity="${op}">${o}</g>`; };
  /** A crescent moon with its halo, always on (r 28 to 40; tilt turns the horns toward the afterglow). */
  const moon = (x, y, r, tilt) => {
    const g = U();
    return `<defs>${radU(g, [[0, '#ffe2c0', 0.5], [1, '#ffe2c0', 0]], x, y, R(r * 4.6))}</defs>` + mv('usglow', { ad: '8s', d: '-3s' }, `<circle cx="${x}" cy="${y}" r="${R(r * 4.6)}" fill="url(#${g})"/>`)
      + `<g transform="rotate(${tilt} ${x} ${y})"><path fill="#fff0d6" d="M${x} ${y - r}A${r} ${r} 0 0 0 ${x} ${y + r}A${R(r * 0.56)} ${r} 0 0 1 ${x} ${y - r}z"/></g>`;
  };
  /** A window painted lit (a warm pane, always on) with the lit() overlay above it: at dusk and night the overlay adds the full-strength core (paint the pane a little more muted than #ffd27a). */
  const pane = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#ffc872"/>` + lit(x, y, w, h);
  /** A grid of panes as TWO paths, one painted lit and one us-lit (the lint counts a us-lit path as ONE shape): cols x rows panes of w x h at pitch gx, gy. */
  const panes = (x, y, cols, rows, w, h, gx, gy) => { let d = ''; for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) d += `M${x + i * gx} ${y + j * gy}h${w}v${h}h${-w}z`; return `<path fill="#ffc872" d="${d}"/><path class="us-lit" d="${d}"/>`; };
  /** A street lamp: a dark post, a painted warm head that is always on, a breathing glow, and the lit() head over it. */
  const lamp = (px, py) => `<path fill="none" stroke="#2a1630" stroke-width="4" d="M${px} ${py}V${py - 62}"/>` + mv('usglow', { ad: (2.4 + (px % 7) / 3).toFixed(1) + 's', d: -(px % 5) / 2 + 's' }, `<circle cx="${px}" cy="${py - 74}" r="20" fill="#ffd27a" opacity=".14"/>`) + pane(px - 5, py - 82, 10, 13);
  // use: mv('usglow', { ad: '5.2s', d: '-1.3s' }, sst(1051, 12, 330, 0.9)) + stars(1053, 12, 340) + moon(330, 200, 32, -135)
  // use: pane(756, 640, 14, 18) + panes(560, 600, 6, 3, 8, 10, 14, 18) + lamp(900, 676) + dots('M470 696Q640 716 860 716Q1080 712 1236 696', '#ffd27a', 4, 38, 'us-lamps')
```
The order of a night scene painted this way (the pilot's Fiji scene, a thatched house on a sand cay after sunset): the sky ramp from indigo through magenta to a coral afterglow; `mv('usglow', ..., sst(...))` stars and `stars()`; the moon (a thin crescent, low in the left third, turned toward the afterglow); a radial afterglow `radU` over the sky; streaks and clouds tinted by the afterglow; the far island and the reef; the lagoon ramp with the afterglow in the shallows and the glow column; the house with `pane()` / `panes()` and `lamp()` posts; a `dots(..., 'us-lamps')` string along the sand; framing palms and reeds in the darkest tinted value; `finish(.34)` last. No `sun()` and no `rays()`.

Check it in BOTH renders: the light PNG reads as night (moon, stars, lit windows, lamps) and the night PNG is darker and bluer (the wash multiplies everything), the moon and the lights still read as lights by contrast, and the extra stars are out. For a DAY or DUSK scene do the opposite: windows are pale day glass plus `us-lamps` / `us-lit` only (a painted-lit window turns a day picture into a night one), and the night render keeps the disc of the `sun()`: the grade cannot hide it (there is no day-only class), so a day scene needs what makes its night render a different picture: a low, small sun (r up to 46, y 440 to 590) that reads as a moon, `rays()` no stronger than .18, at least six hero `lit()` windows, a `us-lamps` row on every lit group of buildings, `stars()` with 24 or more, and a landmark that silhouettes against its sky under the wash. A night render with the same bright sun, rays and no windows lit is a "dim copy of the day picture" (E16, rubric R13, instant reject 7).

## 8. Night lights and motion checklist (before you render)

Night: at least one of each that fits: `lit()` hero windows; `dots(..., 'us-lamps')` window rows over pale day glass and a lamp string; `stars()`; a flame on `usflicker`; fireflies or a lantern on `usglow`; lit boat or vehicle windows with `class="us-lit"`. A scene painted as night: section 7.
Motion, three depths: sky (`cloud`, `streak`, `birds`, `rays`), middle (`shimmer` x2, a vehicle on `usmove`, `uspar` planes, `puffs`), foreground (`ussway` / `ussway2` framing, falling things), plus ONE place-specific motion. Every repeat has its own `--ad` and a negative `--d`.
Count before you lint: `movingGroups` >= 25 (aim 50 to 70), kit classes >= 7 (aim 9).
