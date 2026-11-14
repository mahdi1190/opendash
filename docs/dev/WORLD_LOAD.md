# World scenes: loading fast, never blocking

How a world (v3) scene gets onto the screen quickly and without freezing the page. It covers the opening, the gallery
tiles and stage, the Home card and the cine overlays.

Files:

- `src/app/79-world-5persist.js` (new): what a world scene keeps between page loads.
- `src/app/78-scene-cache.js`: the persistent scene store (IndexedDB).
- `src/app/78-scene-host.js`: the mount, the kept still, the idle prepare.
- `src/app/79-world-5host.js`: the world memo, `worldHostWorldPrepare` and the sliced life.
- `src/app/79-world-5frame.js`: `_wfrBakeJob`, `_wfrRun` and the pass's prebake.
- `src/app/79-world-4ground.js` and `79-world-4water.js`: the steps.
- `src/app/78-scene-canvas.js`: the cache version, the size buckets and `onStillKept`.
- `src/app/78-anim-wire.js`, `src/body.html` and `src/styles/02-splash.css`: the still-first opening.
- `build.mjs`: the world engine's version.
- The tool is `tools/scene-load-profile.mjs`.

## 1. Never block

No world is built while markup is generated or when a host mounts.

- **Markup.** `sceneHostAttrs` (70-scene-svg.js) takes a world item's placeholder sky from its place alone. Its derived
  data has the camera's place, 'afternoon' and the live season. The world is never built for it.
- **SVG stills.** A world item at an SVG size (xs, sm, md, tip, dense, or reduced motion) gets its markup from
  `worldStillSvg` (5persist), which `animItemHtml` calls:
  - from memory when the world of that season is in memory;
  - otherwise a placeholder of the scene's sky over plain ground (`<g data-wst="n">`) is drawn now.

  The real still replaces every placeholder of it later, one at a time in idle periods: the world is restored or built,
  then its SVG is drawn.
- **Mount.** `_schMount` (78-scene-host.js) asks `worldHostItemReady(item)` first. When the item's world is not in memory:
  1. the host shows its kept still at once (`_schWorldStill`: `W|<id>|still|<season>|<tod>`, see 2);
  2. `worldHostItemPrepare(item)` restores the world from the store, or builds it in an idle period;
  3. only then is the renderer made (`_schCreate`).

  `sceneHostReady` counts such a host as waiting, so tool pages still wait for it. The world memo now keeps 6 worlds, and
  a spec's text is memoised per spec object, so a lazy spec is read once.
- **The bake** (`_wfrBakeJob`) runs in the renderer's slices of a few ms:
  - the ground-detail plan through `worldGroundDetailSteps`, and its two layers through `worldGroundDetailDrawSteps`;
  - the water through `worldWaterCompositeSteps` and `worldWaterMirrorSteps`.

  All four are generators that yield every few lines, a few hundred marks or 64 to 128 rows. `worldGroundDetail`,
  `worldGroundDetailDraw`, `worldWaterComposite` and `worldWaterMirror` run them to the end, with the same result: the
  ground plans of Albert Square, the Fleet Pond and Castlefield Basin compare equal, byte for byte.
- **The life** is built through `worldHostLifeSteps(rec)` (5host):
  - when the life package offers its sliced build (interface C1: `worldLifeBuildJob(world, { nav })`, then
    `step(budgetMs) -> done`), it is stepped in the bake's slices, and the driver adopts the life it leaves on the world;
  - otherwise it is the one-shot build, as before.

  One build per record: the bake and the idle builder (`_wh5LifeIdle`, 4 s after the record when no bake has started)
  share the same steps.
- **A chunk's sprites** are made on first use (`_wfrLazySprite`). A chunk restored whole from memory or the store
  rasterises none of its members until an occluder redraw, the mirror or the shadows ask for one.

Still on the critical path:

- `worldBuild` itself, once, when nothing is kept. It is one call with no steps (0.7 to 2.6 s in Node): an idle period at
  mount, or the idle prepare. A returning load restores the world instead.
- `worldFramePlan`: 70 to 190 ms in Node (Albert Square, Fleet Pond). It is the stage builder's function (see merge notes).
- The life build until C1 is merged: 0.6 to 0.9 s.

## 2. What is kept between loads

The store is `78-scene-cache.js` (IndexedDB 'opendash-scenes'). A world scene's records are keyed by its own content:

```
<id> = <world engine version (16 hex)> . <spec hash (16 hex)> . WORLD_PERSIST_FORMAT
```

- **The engine version** is `<meta name="freeflo-world-version">`, which build.mjs writes. It hashes:
  - every file that draws a world's pixels: `70-scene-*` except `70-scene-data-*`, `78-scene-*` except
    cache/host/editor/player, and `79-world-*` except the specs (`zscene-`), the registry (`zzgallery`), the stage
    (`7stage-`), the debug files and this file;
  - `08-utils-dates.js` (the sun), the fonts and the raster objects.

  Tool pages have no meta tag; they use the scene version, a hash of the app script.
- **The spec hash** is FNV of the spec's JSON.

Editing one scene, a v2 pack, the registry or the rest of the app keeps every other scene's records. The renderer's own
records for a world scene (`C|` and `B|`, the v2 base layers) use the same id (`o.cacheVersion`).

| key | what | made | read |
|---|---|---|---|
| `W\|<id>\|world\|<season or ->` | the built world (a structured clone, pristine: before the life) | `worldHostWorld`, after a build, in idle time | `worldHostWorldPrepare` |
| `W\|<id>\|gplan` | the ground-detail plan (geometry, per world) | the bake, when it made it | the bake's prefetch |
| `W\|<id>\|p\|<product key>` | one bake product, keyed exactly like the bake's in-memory cache: `gd\|` ground layers, `ch\|` chunks, `sh\|` the static shadow (and the shadows' holes over the water), `wa\|` each water region's base and reflection, `li\|` the night lights (pools, halos per chunk) | the bake's end + 3 s, in idle time; PNG in the store's worker, four at a time | the bake's prefetch |
| `W\|<id>\|m\|<geometry>` | the manifest: the products kept at that canvas geometry, with their season, band and light key (96 at most, newest first) | after every few products | the bake's prefetch |
| `W\|<id>\|still\|<season>\|<tod>` | the scene's first frame (WebP, at most 2560 wide), per time of day (dawn, day, dusk, night) | `onStillKept`: the renderer's own kept still, after a bake | the mount, before anything is built |

The bake's flow:

- **Prebake.** `worldPersistPrefetch` reads the manifest and the plan in one transaction. It then reads every product of
  this bake's season with its band (or its exact light key; lights only by the light key), and decodes the bitmaps off the
  main thread. This happens while the life is built.
- **The first product the bake does not have in memory.** The bake waits for that reading, at most
  `WORLD_PERSIST_WAIT_MS` (2.5 s). It yields `'wait'`, so the slice ends and nothing spins.
- **Each product** comes from memory first, then from the store (`worldPersistTake`: the bitmaps become CPU canvases in
  the bake's slices), and only then is it made.
- **The end.** What was made is kept (`worldPersistSaveSoon`).
- **Who keeps.** Only a renderer with a cache id (`env.cacheId`: the host's live library scenes and its idle prepare)
  reads or keeps. Tool pages without a cache, and stills, never touch the store.

The water's own key takes the sun by the degree of elevation and 4 degrees of azimuth, and not at all once it is 12 degrees
down. It was half a degree until 14 Nov, so a night bake two minutes after the idle prepare missed the kept water. The static
shadow keeps its half-degree key, because shadows visibly move. A bake lists what it did not find in
`stats.persist.missed`.

Store policy (78-scene-cache.js):

- Evicted least recently used past 300 MB (`SCENE_STORE_MAX_BYTES`).
- An entry unused for 30 days goes too.
- The use time is touched on every read, at most once an hour.

Until 14 Nov entries expired 4 days after they were stored, however often they were used, and the budget was 480 MB.

**Size buckets.** A kept scene's backing store is snapped to a width bucket (`sceneSizeBucket`, 78-scene-canvas.js:
960, 1280, 1600, 1920, 2240, 2560, 2880, 3440, 3840):

- the nearest bucket at or above the width, or within 6 % below it;
- the height follows at the same aspect, rounded to 8 px;
- the css box scales the canvas;
- sizes under 960 wide (cards, tiles) keep their own size.

A window a few pixels different now restores the same bake.

**The stage (C2).** The world stage's baker gets the host's options through `sceneHostCacheOpts(el)`: the cache id, the
version, the buckets, `onStill`, `onLive` and `onStillKept`. A world scene on the stage therefore restores its bake and
shows its kept still on reload, as the canvas does. The still is captured with `env.capture = 'still'`, which never moves
the world's clock (WORLD_FLICKER.md 1; `worldHostClock` returns early for a capture).

Not kept:

- The world-frame plan (`worldFramePlan`): its records hold the world's entities.
- The nav and the life: the nav is rebuilt by the life build.
- The occluder prim bitmaps: they are made on first use.

## 3. Prepare ahead

The idle prepare in 78-scene-host.js runs 20 s after load and then every 10 minutes, only while no scene plays and nobody
types or clicks. Any key, pointer, touch or wheel holds it for 3 s; a running job ends and its renderer is destroyed.

For a world scene it now:

- restores or builds the world first (`worldHostItemPrepare`), in an idle period;
- bakes it in idle slices with the kept options, so the bake's products, its `B|` record and its kept still are all
  kept.

What it prepares:

- the next openings (`animOpeningPeek`) at now, +20 and +45 min;
- the live hosts on the page;
- the next opening once more at tomorrow's moment. The daily opening has already played, so the rotation's next one is
  tomorrow's. The time is when today's opening played (78-anim-wire.js keeps it in localStorage `freeflo-opening-at`),
  plus 24 h; with none, now plus 24 h.

That job (`boot`) also keeps the bootstrap still (5).

## 4. Still-first opening

- **The welcome.** `_awSceneReady` (78-anim-wire.js) counts a host showing its kept still (`sc-shown`) as ready. The
  welcome starts over the still, and the live scene's canvas fades in over it (0.2 s) when it is ready.
- **The still.** It is the first frame at the base moment, the same frame the live scene starts from: the host restarts
  its clock on `onLive`, and the world's clock starts at its first visible frame. The still goes once the canvas or the
  stage is ready (`_schUpdate` drops it on sc-ready).
- **The bootstrap still** (src/body.html, 02-splash.css). After the idle prepare, the next opening's first frame is kept
  in localStorage `freeflo-opening-still` (`animOpeningBootKeep`):
  - WebP, 960 wide, as a data URL of at most 250 KB (quality 0.72, then 0.56, then 0.4);
  - with its ref, when it was made, and the local hour it was made for.

  The splash script paints it behind the brand (`.od-boot`, under a soft veil of the splash's own colour so the brand
  stays legible) from the first painted frame, before the app script parses. It does so only when:
  - the full opening holds;
  - the still is under 36 hours old;
  - the still was made for within 3 hours of the time now;
  - it is our own data URL (checked by pattern).

  At the welcome the veil lifts and the live scene fades in over it; the still is removed after the fade. When another
  scene is chosen, it fades out as the scene is staged. Reduced motion removes the splash, and the still with it. No new
  static route is involved: it is localStorage only.

## 5. Measured (14 Nov 2026)

The scenes are Albert Square (Manchester centre 1) and Fleet Pond 2, as the superseded opening items. Every number is
from headless Chrome with software raster on a 4-core box shared by six builders: single runs, and noisy.

**`tools/scene-load-profile.mjs`** at 1536 x 864 @ 1.25 (1920 x 1080 device). Each cell is time to ready in ms, with the
first picture and the longest main-thread task in brackets. A warm run is a new page in the same profile.

| scene | cold before → after | warm before → after | reopen before → after |
|---|---|---|---|
| Albert Square | 4042 (4042, 1416) → 3841 (3841, 787) | 3839 (3051, 1926) → 1552 (994, 891) | 179 → 171 |
| Fleet Pond 2 | 5991 (5991, 1173) → 5381 (5381, 1604) | 4994 (1879, 1208) → 1707 (805, 701) | 513 → 541 |

- Prepared: 217 ms (Albert Square) and 491 ms (Fleet Pond 2) in the same page. The earlier tool baked its prepare at
  the device size, not the css size, so its "before" was not comparable.
- The warm load gives back 12 of 13 products and 7 of 8, plus the ground plan.
- The longest task left is the life build, 0.6-0.9 s (interface C1 slices it). It was the ground plan, 1.9 s.
- A cold load's longest task is the one idle `worldBuild`, 0.6-1.6 s.
- The pixel check (`--check`: the restored frame at the base moment against the still the cold bake kept) differs by
  at most 3 levels except:
  - 29 pixels at Albert Square;
  - the boardwalk's people at Fleet Pond 2, who differ just as much with `--no-world-persist` (their draw memory, not
    the kept bake).

**The real app** (port 4392, a test data copy, the opening pinned, Opening: every load). Load 2 comes after an idle
period, in which the app's own prepare kept the next opening and the bootstrap still. All times are in ms from the
navigation, or after the host's mount (+).

| | before: load 2 | after: load 2 |
|---|---|---|
| Albert Square, the first picture | the live canvas, +4463 after mount | the bootstrap still at 424 (behind the brand, while the 1.4 s app script parses); the kept still +909 |
| Albert Square, the host mounts | +805 after DOMContentLoaded (the world built in markup) | +16 |
| Albert Square, the welcome starts | +3230 after mount | +909 after mount |
| Albert Square, live (sc-ready) | +4463 | +3571 |
| Fleet Pond 2, the first picture | the live canvas, +4799 | the bootstrap still at 423; the kept still +466 |
| Fleet Pond 2, the host mounts | +1438 after DOMContentLoaded | +17 |
| Fleet Pond 2, the welcome starts | +3385 | +484 |
| Fleet Pond 2, live | +4799 | +3772 |

The longest task after DOMContentLoaded stayed at 1.2-1.6 s. A CPU profile of the after load 2 at Fleet Pond 2 puts it
here:

- the life build: `worldHostDriver` 1131 ms inclusive, of which `worldLifeInit` 615 and `worldNavBuild` 362 (C1);
- `worldFramePlan`: 466 ms (the bake runs `worldFramePlanSteps` when it exists);
- the stage's texture uploads: `texImage2D` 402 ms self;
- the app's own render: 836 ms.

**Fleet Pond 2 against the old prebaked v2 Fleet Pond** (first picture 259 ms, live 758 ms in the tool page):

- The first picture is now the bootstrap still, painted with the splash before the app has parsed. In the tool page the
  kept still shows 129 ms (prepared) or 142 ms (reopen) after the request.
- Live: 491 ms prepared and 541 ms reopen in the tool page, but 1.7 s on a new page and 3.8 s in the real app. The life
  build and the stage's uploads stand between the still and the live scene.

**A world item's markup:**

- the canvas host takes 0.4 ms (it was the world build, about 1.5 s for Fleet Pond 2);
- the SVG still at md takes 37 ms as a placeholder. The real still replaces it 2 s later, after an idle `worldBuild` of
  that season and its SVG, a 1.3 MB string.

## 6. Tools

- `node tools/scene-load-profile.mjs --refs=<ref,...> [--stage] [--runs=cold,warm,reopen,prepared] [--check]`. Per run it
  prints `world {persist: {hits, misses, made, readMs, plan}, persistWaitMs, groundPlanMs, chunksRestored, ...}`, the world
  builds of the page (`worldHostBuilds()`) and the longest task.
- In a page:
  - `await worldPersistStats(spec)` lists a scene's records;
  - `worldHostBuilds()` lists the world builds (ms, idle or not);
  - `__sceneStats()[i].passes['world-frame'].persist` shows what a bake got back.
- Switches:
  - `window.__worldPersistOff = true` turns this file off for a page;
  - `window.__sceneStoreOff = true` turns off the whole store.
