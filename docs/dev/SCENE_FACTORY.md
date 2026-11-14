# The scene factory

> **No tests (owner's rule, 23 Oct 2026).** Nothing here is a gate. The checks below are numbers printed beside a picture for the
> author; the verdict is always the author looking at the renders. See CLAUDE.md.

The user asked (14 Nov) for the opening scenes to be redone to the standard of the two world-engine scenes Manchester (Albert
Square) and Fleet Pond 2, and for "a system to be able to make these scenes fast". This is that system, and the path that puts world
scenes into the real opening rotation.

## 1. The loop

```
node tools/world.mjs archetypes                                   # what there is, and the brief each one takes
node tools/world.mjs new <slug> --archetype <a> --place "<name>" --lat <n> --lon <n> --county <id> --town <Town> [brief flags] [--dir=D]
      -> a DRAFT spec (D/<slug>-1.json, never src/app) and a REVIEW SHEET (D/<slug>-1-w3--review.png)
node tools/world.mjs accept D/<slug>-1.json                       # writes src/app/79-world-zscene-<slug>-1.js (gallery at once)
node tools/world.mjs promote <slug>-1                             # into the opening rotation (section 2)
node build.mjs --syntax && node build.mjs
```

The review sheet puts the draft at **summer noon, autumn golden hour and winter night** above the archetype's gold scene at the same
moments (the gold renders are cached in `<tmp>/opendash-world/gold`), with the gold-relative checks (section 4), the solver and fill
drops and the load budget under each row. Measured on this box (4 cores, software raster, three other builders rendering): **13 to 34 s
from the brief to the sheet** (checks 4-9 s, three renders 7-25 s; the first run also draws the gold's three cells).

Iterate at most three times a scene: look first, describe what is where and what it stands on, find the ONE weakest thing, fix it at
the cause (the brief if it is this place, the archetype if the next place would suffer it too), render again. After `accept` the scene
file is yours to edit by hand like any other.

## 2. Promotion: world scenes in the opening rotation

`src/app/79-world-zzgallery.js` holds ONE table (`OPENING`, between `@opening-begin` and `@opening-end`), one line a promoted world
scene. `node tools/world.mjs promote <id>[,<id>...]` writes the line, `demote <id>` removes it. Two kinds:

* **A world version of a registered opening** (`{"supersedes": [refs]}`): found by the id without `-w3` (with a county prefix), plus
  the seasonal siblings of a base view (`-spring`, `-summer`, `-autumn`, `-winter`) unless another promoted scene claims them; or given
  with `--supersedes=<ref,...>` (the Winter Garden takes the old Winter Garden view, `south-yorkshire-sheffield-centre-2`). At load,
  `animSupersede` (`71-anim-registry.js`) swaps the item's PICTURE only: the item keeps its ref, id, pack, `when()`, county, place,
  view, caption, season and priority, so pins, favourites, blocks and the synced rotation (`seen.openingLast`) keep working, and the
  still is drawn in the item's own season. The old gallery ref `world-preview/<id>` now opens that item (`animRefNow`).
  `animSupersededOriginal(ref)` gives tools the item it replaced.
* **A place that only has a world scene** (`{"county", "ukTown", "ukPlace", "ukView", "ukLat", "ukLon", "months"?}`): registered in
  the real pack `uk-world` (priority 1, intensity subtle) with a `when()` that holds within 25 km of the place (the same rule as every
  UK pack; the scene's own lat/lon) in its months. `--county`, `--town`, `--place`, `--view`, `--months=4,5,6` override.

Everything not promoted stays exactly as before: pack `world-preview`, `when()` false, gallery only. `WORLD_OPENING_ON = false` at
the top of `79-world-zzgallery.js` turns every promotion off at once.

Town anchors for places with openings but no main town in the county table (`71-uk-counties.js`) are in `78-anim-uk.js`
(`ANIM_UK_PLACE_ANCHORS`: Malham, Hathersage, Reepham, Bibury), so a device there is "at" the place and its scene is the local intro.

### The promoted set (14 Nov, decided by looking at every world scene at summer noon beside the two gold ones)

| scene | decision | why |
|---|---|---|
| fleet-pond-2, greater-manchester-manchester-centre-1, greater-manchester-castlefield-basin | promote | the gold (Castlefield's bare near quay accepted) |
| fleet-canal-1, -2, -3, -4 | promote (each with its seasonal siblings) | towpath or water leading line, framing both sides, boats, a bridge subject |
| greater-manchester-ancoats-canal, -castlefield-viaducts, -castlefield-warehouses, -manchester-centre-3, -manchester-centre-4, -mediacity-piazza, -stevenson-square | promote | subject present, framed, dressed, people and a mover |
| sheffield-centre-1, -centre-3, -kelham-1, -kelham-2, -kelham-3, -parks-2, -parks-4 | promote | as above |
| sheffield-winter-garden-1 | promote over `south-yorkshire-sheffield-centre-2` | the Winter Garden itself (centre-2's world version lost it) |
| hampshire-wyndhams-pool-dusk | promote (the proof item) | framed pool, reeds, waterfowl |
| whitby-harbour-1, york-shambles-1, liverpool-pier-head-1, malham-cove-1, norwich-elm-hill-1, manchester-castlefield-1 | promote as places of their own | each a clear landmark and a good frame; no older scene there |
| hampshire-yateley-green-1, hampshire-wyndhams-pool-1 (NEW, factory) | promote over the v1 Yateley Green and Wyndham's Pool view 1 | section 5 |
| cotswold-green-1 (rebuilt through `village-green`) | promote near Bibury | section 5 |
| fleet-pond-1 | not yet | the right half is open water and sky: no framing on that side |
| fleet-pond-3 | not yet | no clear subject (the pond is a thin strip behind heath) |
| fleet-pond-proof | not yet | framing on one side only (the proof item stays as it is) |
| the converted seasonal copies (fleet-pond-2-*, fleet-canal-2-*) | not promoted | their base view's world scene draws every season |
| greater-manchester-castlefield-fort, -manchester-centre-2, -manchester-centre-market, -salford-quays-lowry, sheffield-centre-2, -kelham-4, -parks-1, hampshire-proof-yateley-green, norfolk-reepham-churchyard, -station | not yet | the landmark was lost in conversion (the fort gate, the library rotunda and Cenotaph, the market chalets, the Lowry, the Winter Garden, the Works gateway, the pavilions, St Peter's, both churches, the station) |
| norfolk-reepham-whitwell | not yet | the locomotive is a dark block; bins in the near band |
| sheffield-centre-4 | not yet | a canopy blob covers half the frame |
| sheffield-parks-3 | not yet | the bandstand is cut by the frame; the museum does not read |
| seaside-pier-1 | not yet | the pier is not in view; a generic promenade |
| peak-stanage-edge-1 | not yet | load: its valley expands to a 727 KB spec, worldBuild 4.4-4.8 s |

## 3. Archetypes (`tools/lib/world/archetypes.mjs`)

Each archetype is distilled from a scene at the bar and owns the camera (eye, lens, horizon), the leading line to the subject, the
framing on both sides, the dressed near band, a mover in the far band in the first seconds and life in the near-mid band. It takes a
short brief and emits a v3 spec; the engine (solver, fill, kits, backdrop) does the rest.

| archetype | gold | what it lays out | brief |
|---|---|---|---|
| `boardwalk-wetland` | fleet-pond-2 | a railed walk (the marsh generator) through carr and reeds to a deck with a bench; the open pond; a far-shore mover (a timetabled train on its embankment, traffic on a causeway, or walkers on a shore path); framing trees both sides; waterfowl, heron, kingfisher, a birdwatcher who walks to the deck and looks | `--trees carr|heath`, `--far rail|road|path`, `--side right|left`, `--deck 14-24`, `--farZ 120-260`, `--stream false`, `--landmark '{json}'` |
| `village-green` | hampshire-yateley-green-1 | a diagonal path from the frame's foot to the churchyard gate; the parish-church model (yard, wall, lychgate, yews, headstones) on a third; a pond on the other third; houses along the lane; framing trees; a lamp on the path; walkers on the lane, cars; a sitter on the bench | `--side`, `--stone flint|honey|grey-limestone|ironstone|red-sandstone`, `--crown parapet|spire`, `--houses <style>`, `--pond false`, `--backdrop` |
| `canal-basin` | greater-manchester-castlefield-basin | the basin up the middle to a footbridge; warehouses (an `along` row) on one quay, a towpath and grass on the other; moored narrowboats along both quays; a viaduct across the far band; a boat cruising | `--side left|right`, `--houses mill`, `--viaduct false`, `--bridge 40-80`, `--backdrop`, `--kit` |
| `civic-square-facade` | greater-manchester-manchester-centre-1 | a square corner-on: the landmark (a generated building with a crown, or a library object) at three-quarters on a third; a receding street of shops (the leading line); a statue and a lamp framing; tree pits with benches and bins; a tram (or buses) across the far side | `--side`, `--landmark '{"style","crown","storeys","w","d","z"}'` or `'{"obj"}'`, `--houses`, `--tram false` |

Frame-relative placement (`tools/lib/world/frame.mjs`): `at(cam, { frame: 'left', z, w, reach })` puts a framing element so its inner
edge reaches that share of the frame in from its side; `{ third, z }`, `{ bearing, dist }`, `{ screen: [X, Y] }`, `{ band }`;
`leadingLine(cam, path)` says whether a ground line runs from the frame's foot into the vista. The camera model is sceneProject's:
`f = 800 / tan(fov / 2)`, `X = 800 + f x / z`, `Y = horizon + f (eye - h) / z`. A tree's sprite canopy is about 0.9 of its library
width. Framing entities carry `framed: true`, so the fill's C3 framing does not add its own (it added a lamp post at 6 m, a giant at
the frame's edge, until it did).

Not done yet: `harbour-under-cliff` (Whitby), `edge-over-valley` (Stanage), `medieval-lane` (York, Norwich), `waterfront-civic`
(Liverpool). The scaffold families (`new --setting`, `scaffold.mjs`) are still there; the green family is superseded by
`village-green`.

## 4. Gold-relative checks (`tools/lib/world/goldcheck.mjs`; `node tools/world.mjs gold <ref> [--archetype a]`)

They replace the box critic's verdict (`critic --box` still prints the box measure): that score put a scene that had lost its
subject level with Fleet Pond. Measured on the BUILT world (after the solver and the fill), printed beside the gold's numbers:

| check | ok when |
|---|---|
| subject in view | the landmark (or the archetype's subject) is in the built world, >= 60 % of it inside the frame, its centre 10-90 % across, >= 5 % of the height (a drawn 2D landmark is measured by its descriptor box, which can disagree with the picture: Albert Square's Town Hall) |
| leading line | a ground line from the bottom fifth of the frame to the middle 70 % near the horizon |
| framing both sides | tall things within 40 m cut by both sides of the frame |
| sky share | open sky on the summer-noon RENDER (blue and white pixels above the horizon) within 0.15 of the gold's |
| near band dressed | the near band's box cover at least 60 % of the gold's |
| no blank facade | no single (non-landmark) building over 30 % of the frame |
| a far mover early | something beyond the archetype's far depth moves in the first 10 s (after the host's warm-up: 60 s of life first) |
| life near-mid | people or animals at 3-40 m in frame in the first 12 s |
| landmarks kept | every authored landmark is in the built world |
| no static people | no `person.*` entity: standing and sitting people come from populations with goals |

The load budget beside them: statics, buildings, chunks and the biggest chunk's share of the statics, live statics, agents, distinct
sprites, build ms (Node). Fleet Pond 2: 1112 statics, one chunk holding 81 % of them, 1.8-2.0 s build.

## 5. The scenes made with it (14 Nov)

| scene | archetype | attempts | result |
|---|---|---|---|
| hampshire-yateley-green-1 | village-green | 3 | 9/10 checks (sky 0.14 under a big chestnut); the flint church with its spire on the right third, the diagonal path, the pond and reeds, walkers and a dog |
| hampshire-wyndhams-pool-1 | boardwalk-wetland (heath trees, a shore path for the far mover, no stream) | 1 | 10/10; a railed walk to the anglers' deck through reedmace and loosestrife, Scots pines round the pool |
| cotswold-green-1 (rebuilt in place) | village-green (refined: tree widths, one lamp, one bench), cell-seeded fill | 1 | 10/10; honey church on a third, Cotswold stone houses along the lane |

## 6. The fill seeded per cell

A world whose seed is 10000 or more (every `new --archetype` scene unless `--seed` says otherwise) gets the cell-seeded fill
(`79-world-1fill.js`, `WORLD_FILL_CELL_SEED_MIN`): each cover cell draws its picks, positions and variants from its own stream (the
seed, the kit, the tier, the cell), the cells are ordered by a hash, and the accents and the richness tier have streams of their own.
Older scenes keep the one stream, so their reviewed look does not change. Measured once (re-seeding one authored reed cluster at
Wyndham's Pool): one stream moved 69 % of the fill (271 pieces nearer than 30 m); the cell-seeded fill 48 % (134 near). The rest
still moves because the coverage grid and the edge dressing are shared; making those per cell is the next step.

## 7. Files

`tools/world.mjs` (archetypes, new --archetype, accept <draft>, promote, demote, contact, gold), `tools/lib/world/archetypes.mjs`,
`frame.mjs`, `goldcheck.mjs`, `factory.mjs` (draft, review sheet, scene file), `contact.mjs` (many scenes in one Chrome, contact
sheets), `promote.mjs` (the table), `critic.mjs` (exports its box helpers); `src/app/79-world-zzgallery.js`, `71-anim-registry.js`
(`animSupersede`), `78-anim-uk.js` (anchors), `79-world-1fill.js` (cell seeds).
