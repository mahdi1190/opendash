# The US packs

Five regional packs cover the whole country. They are ordinary packs (read
`docs/dev/ANIMATION_PACKS.md` first) whose items all carry a `when(day, ctx)` rule, so none of
them is in the ordinary daily rotation and none plays outside the US.

| Pack | File | States |
| --- | --- | --- |
| `us-northeast` | `72-anim-pack-us-northeast.js` | CT DE ME MD MA NH NJ NY PA RI VT (+ Washington, DC) |
| `us-southeast` | `72-anim-pack-us-southeast.js` | AL AR FL GA KY LA MS NC SC TN VA WV |
| `us-midwest` | `72-anim-pack-us-midwest.js` | IL IN IA KS MI MN MO NE ND OH SD WI |
| `us-mountain` | `72-anim-pack-us-mountain.js` | AZ CO ID MT NV NM OK UT WY |
| `us-pacific` | `72-anim-pack-us-pacific.js` | AK CA HI OR WA |

Texas keeps its own pack (`docs/dev/TEXAS_PACK.md`), so every one of the 50 states has art.

## Where the user is (offline, no setting)

`src/app/71-anim-us.js` (pure, loads before the packs) holds `US_STATES` and `US_PLACES` and the US's
region config (`animRegionDefine`, see "Regions" in `docs/dev/ANIMATION_PACKS.md`): the lookups, the
builder and the scene kit are the generic framework in `src/app/71-anim-0region.js`, and `usPlace`,
`usStateOf`, `usWhere`, `usBuilder`, `usSceneAdd`, `usSceneKit` and `usSceneCss` are one-line wrappers
over it that keep the pack files and the scene files unchanged. `US_PLACES` rows are
`[id, name, state, lat, lon, kind]`, `kind` = `big` (a big city: a signature opening), `small` (a
small city or town: an element for the symbol slot) or `''` (an anchor, which only tells which state
a position is in).

- `usStateOf(ctx)`: the state of the nearest row within `US_STATE_KM` (190 km) of the weather town
  (`ctx.lat`, `ctx.lon`). While travelling, `ctx.city` = `<place id>-us` decides. Right beside a
  border the neighbour can win, and the edge of Canada or Mexico can read as a US state: add rows
  to sharpen a region.
- `usPlace(ctx)`: an art place within 50 km (big) or 30 km (small). A trip to New York is the
  world pack's (it already draws the Empire State skyline for travellers).
- `usWhere(ctx)`: where in the US (the town if there is one, else the state; Texas is the Texas pack's, DC
  is one fixed place). The opening sequence in `78-anim-wire.js` reaches it through the generic
  `animRegionWhere(animCtx())` ("Welcome to Seattle" with the day's US opening as the emblem).

## What is in a pack

| Kind | Priority | Slot | Items |
| --- | --- | --- | --- |
| state | 1 | opening | a signature scene per state (`usSignature: true`) |
| state | 1 | symbol | an element per state |
| city | 1.2 | opening | one per big city: the skyline or landmark |
| city | 1.2 | symbol | one per small city or town |

A city beats the state's art in its slot while you are there; a festival or the birthday
(priority 2+) still wins the day. Every item is a 64 x 64 drawing that moves
(`x-*` classes) and has a still variant for reduced motion.

## Full-screen openings

Every state signature and every big-city opening (88) is a **full-screen scene** (`full: true`, 1600 x 900,
sliced to fill any screen, <= 32 KB rendered), drawn in `src/app/71-anim-us2-scenes-1..8.js` with the shared
kit `animSceneKit()` / `animSceneCss()` in `71-anim-0region.js` (`usSceneKit()` / `usSceneCss()` in
`71-anim-us.js` are aliases; the Texas scenes' toolkit: layered sky, parallax,
ambient life, evening grade `.us-tint` / `.us-lit` / `.us-lamps` / `.us-star`). A scene file calls
`usSceneAdd({key: 'state:NY' | 'place:buffalo', label, site, colour, mood, season, tags, svg})` (the same as
`animRegionSceneAdd('us', {...})`) and `usBuilder` upgrades the matching item. The small 64 x 64 art in the pack files for those items is
superseded (kept as the item's source only). Elements (symbols) and small-town items stay small.

All other openings (core, festivals, world cities, Texas, the UK South West) are small items: the opening
sequence draws them on a full-screen landscape stage (`animOpeningStageHtml`, `.od-seq-stage` in
`02-splash.css`): the seasonal landscape of the hour, the item large in the middle with a glow.

## Adding a place or a state item

1. A new place: add a row to `US_PLACES` (give it `big` or `small`), then one
   `B.place('<id>', {id, label, colour, svg})` in the pack file for its group.
2. A new state item: `B.state('<ST>', 'signature' | 'element', {...})` in the group's file.
3. `usBuilder(group)` fills in the id prefix, the label suffix, `region: ['US']`, `reduced`, the
   `when` rule and the tags; it throws if a state or place belongs to another group.
4. `node --test tests/anim-packs.test.mjs tests/us-pack.test.mjs`.

No two items of a slot may draw the same thing (the gate checks), and never put a `transform`
attribute on an element with an `x-*` class (wrap it in a `<g transform>`).
