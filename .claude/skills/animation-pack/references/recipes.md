# Recipes: ten scene types, the skeleton, and the tested local helpers

How to build a full-screen scene (1600 x 900) of a given type. Read the recipe for your type, then OPEN the model exemplar's PNG and its source (the `file` and key are given), then plan your own picture.
The calls and numbers below are quoted from the model scenes so that you see the right scale. **Do not paste them.** The same seed, geometry and palette reproduce that scene's shapes and the lint fails the piece
(`sharedShare`, `sharedShareAll`); a copy with new colours is an instant reject. A skeleton built only from the numbers here passes most lint rules and still looks like a flat dusk with no subject (it fails R1 and R11):
the landmark, the foreground and the place-specific motion are YOUR drawing.

Contents: 1 the skeleton, 2 choosing a recipe, 3 recipes C1 to C10, 4 computed structure, 5 local helpers (tested), 6 night lights and motion checklist.

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

All ten follow the skeleton. Parameter ranges: `kit-reference.md`. "Pitfalls" are the corpus's own failures.

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

## 4. Computed structure (draw engineering with maths, not by hand)

```js
const qy = (t, a, b, c) => (1 - t) * (1 - t) * a + 2 * t * (1 - t) * b + t * t * c;                       // a point on a quadratic cable
let hang = ''; for (let i = 1; i < 32; i++) { const t = i / 32, x = R(T1 + (T2 - T1) * t), y = R(qy(t, TY, 828, TY)); hang += `M${x} ${y + 2}V${DY}`; }   // hangers: one path
const xAt = (x0, y) => R(800 + (x0 - 800) * (y - VP) / (900 - VP));                                        // one-point perspective: a vertical line x0 projected at depth y
const bands = (id, y0, y1, cols) => { const n = cols.length; return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${y1}">`
  + cols.map((c, i) => `<stop offset="${(i / n).toFixed(3)}" stop-color="${c}"/><stop offset="${((i + 1) / n).toFixed(3)}" stop-color="${c}"/>`).join('') + '</linearGradient>'; };   // strata: hard stops
```
A scale ladder: an array of `[x, y, s]` with s growing about x1.2 per step toward the viewer, one function per object (`villa(x, y, s)`), the far set inside a `uspar`, the near set inside a `usbob`. A tiered tower: `for (let i = 0; i < n; i++)` with tier width `w * (1 - i * k)`, a shaded half at opacity .3, a dashed line `stroke-dasharray` per tier. One path per fill colour: append to ONE `d` string in the loop.

## 5. Local helpers (tested: they run, produce valid markup and pass the structural lint rules)

Paste what you need inside your IIFE, after the `const { ... } = K;` line, then CHANGE seeds, sizes and colours. Output with the same arguments as another scene counts as shared shapes.

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
```
`shimmer` is the kit's water-glint helper; the corpus aliases it as `glints` or `ripples`. A generic `tower`, `bld`, `crown`, `cypress`, `balloon`, `stupa`, `minaret`, `ship`, `sail`: read the version in the model scene (`grep -n "const tower" src/app/71-anim-*-scenes-*.js`) and write your own: they are the landmark craft, not boilerplate.

## 6. Night lights and motion checklist (before you render)

Night: at least one of each that fits: `lit()` hero windows; `dots(..., 'us-lamps')` window rows over pale day glass and a lamp string; `stars()`; a flame on `usflicker`; fireflies or a lantern on `usglow`; lit boat or vehicle windows with `class="us-lit"`.
Motion, three depths: sky (`cloud`, `streak`, `birds`, `rays`), middle (`shimmer` x2, a vehicle on `usmove`, `uspar` planes, `puffs`), foreground (`ussway` / `ussway2` framing, falling things), plus ONE place-specific motion. Every repeat has its own `--ad` and a negative `--d`.
Count before you lint: `movingGroups` >= 25 (aim 50 to 70), kit classes >= 7 (aim 9).
