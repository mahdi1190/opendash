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
from the brief to the sheet** (checks 4-9 s, three renders 7-25 s; the first run also draws the gold's three cells). Second wave
(14 Nov, eight archetypes): 12 to 33 s over 27 sheets, 33 s only when the gold's cells were drawn fresh.

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
| `canal-basin` | greater-manchester-castlefield-basin | the basin up the middle to a BRICK HUMP BRIDGE (`structure.bridge-brick`, the library's elevation seen face-on, a landmark; the walkers' deck raised to its hump, `y: 2.4`); warehouses (an `along` row) on one quay, a towpath and grass on the other; moored narrowboats along both quays; a viaduct across the far band; the framing tree kept on land; no boat under way (one cruised past the lens and filled 40 % of the frame) | `--side left|right`, `--houses mill|canal-warehouse`, `--viaduct false`, `--bridge 40-80`, `--backdrop`, `--kit`, `--bridgeObj` |
| `civic-square-facade` | greater-manchester-manchester-centre-1 | a square corner-on on ALBERT SQUARE'S CAMERA (horizon 660, 76 degrees: the trial's 600 left 0.22 of sky against 0.39): the landmark at three-quarters on a third, placed far enough that its top keeps 8 % of the frame (`heightOf`); a receding street (the leading line); a statue (or a tree) and a lamp framing; tree pits with benches and bins on paving, or a LAWN with a path across it to the landmark's front (a close); a tram, buses or cars across the far side | `--side`, `--landmark '{"style","crown","storeys","w","d","z"}'` or `'{"obj"}'`, `--houses`, `--rows a-b`, `--tram false`, `--far tram|buses|cars`, `--ground plaza|grass`, `--frame statue|tree` |
| `medieval-lane` | norwich-elm-hill-1 (York Shambles the other) | a cobbled lane TURNED OFF THE VIEW AXIS by the bearing of a third, so its vista gap and the great church in it stand on the third (the gold lanes are dead centre); only the rich lane fronts at the lens (jettied timber, colour-washed plaster, thatch) with the lane's shops in the first runs; narrow plots at the lens; a slight kink; a little square at the head with lower houses so the whole front shows above the roofs; walkers across the head (the far mover); visitors stop at a shop window | `--side`, `--landmark '{"style","crown","w","d","z","turn"}'` or `'{"obj","model","facing"}'`, `--houses a,b,c`, `--rise m`, `--length m (70)`, `--width m`, `--head m`, `--kit cobbled-lane|old-town-lane`, `--shops` |
| `harbour-under-cliff` | whitby-harbour-1 | a harbour basin from its inner corner (Whitby is frontal): the quay edge from the frame's foot to the far shore (the leading line) with fishing boats moored along it and harbour-front shops framing that side; a finger quay with a lamp and a yacht whose mast frames the other; across the water a beach, the shore street, a rock cliff with a cliff-top terrace (or a green slope with lanes stepping up it), the landmark on the cliff top on a third with the terrace broken in front of it; rows only across the frame's width | `--side`, `--cliff rock|slope`, `--h 14-40`, `--rock limestone|sandstone|granite|slate|chalk`, `--houses`, `--top seafront-regency`, `--landmark`, `--far 90-170`, `--beach false` |
| `waterfront-civic` | liverpool-pier-head-1 | a promenade along the water seen along its length: the river wall and railing from the frame's foot (Liverpool's entered at 60 % of the height), a yacht moored broadside at the frame's water-side edge (its mast frames it: a lamp on the wall cannot reach the edge) and a plane tree on the land side; the frontage fanned out (about 250 m of it); the landmark on the land-side third sized into the frame; an optional bank raising the land behind into a terrace; lookers at the railing, sitters, buses as the far mover; extents to 420 m (the fill of 700 m cost 0.7 s) | `--side`, `--landmark '{"obj","model","z"}'` (default the lighthouse, seed 23: no keeper's cottage) or a building, `--houses a,b,c`, `--back m`, `--bank m`, `--ground plaza|grass`, `--boats yachts|ferries`, `--water`, `--backdrop` |
| `edge-over-valley` | peak-stanage-edge-1 | on a moor at a valley's shoulder: a tor (big 'stack' and 'block' gritstone-model blocks 10 m apart on a low `bank` mound; a crag arc read as one smooth boulder) on the right third; ONE path from behind the lens past the tor and on beyond the walk grid's far edge (300 m); a valley turned 22 degrees (`bearing`) so it opens ahead-left, its slope starting at the lens (a 70 m shoulder hid it all); a thorn and a big block framing; ponies or sheep on the mid moor; the near carpet authored, the fill off; a lighter valley (six rows of 420 m fields, eight woods, a hamlet of nine) | `--tor 3-8`, `--torZ 40-90`, `--bearing`, `--drop 120-300`, `--grazers ponies|sheep|cattle`, `--houses`, `--church false`, `--trees`, `--backdrop` (the valley falls left only) |

Frame-relative placement (`tools/lib/world/frame.mjs`): `at(cam, { frame: 'left', z, w, reach })` puts a framing element so its inner
edge reaches that share of the frame in from its side; `{ third, z }`, `{ bearing, dist }`, `{ screen: [X, Y] }`, `{ band }`;
`leadingLine(cam, path)` says whether a ground line runs from the frame's foot into the vista. The camera model is sceneProject's:
`f = 800 / tan(fov / 2)`, `X = 800 + f x / z`, `Y = horizon + f (eye - h) / z`. A tree's sprite canopy is about 0.9 of its library
width. Framing entities carry `framed: true`, so the fill's C3 framing does not add its own (it added a lamp post at 6 m, a giant at
the frame's edge, until it did).

All eight are built (14 Nov, second wave). The scaffold families (`new --setting`, `scaffold.mjs`) are still there for kinds of place
no archetype covers (a seaside promenade, open farmland); the green family is superseded by `village-green`.

Rules the second wave added to every archetype (each found on a draft, fixed in the archetype so the next place does not suffer it):

* **Size the landmark into the frame**: `heightOf(E, landmark)` (a model's real height times its size, a great church by its plan and
  width) and a distance `f (H - eye) / (horizon - 72)`, so its top keeps 8 % of the frame. A guessed distance cut the towers off.
* **Rows only across the frame's width at their depth** plus a margin (`span(z, x0)`), and extents capped where the far end is a few
  pixels from the horizon. 600 m rows built 189 houses for a harbour and 1.8 s; the fill of a 700 m promenade cost 0.7 s of 1 s.
* **A population on a path needs that path to meet two edges of the walk grid** (behind the lens, and the far edge at 300 m or a
  side): a path that ends mid-ground (at a tor) gives its walkers one edge, and they spawn and leave on the spot.
* **The archetype's own subject**: the brick bridge, the tor's top block or the landmark is the plan's subject, so the gold check
  measures what the eye is meant to find.
* **A model's seeded options are hashed from the entity id**: the lighthouse's keeper's cottage, a block's form. Choose the seed for
  the id the archetype gives it (`seed 23` for id `landmark`: no cottage) and say so in a comment.

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

Second wave: a landmark the build DEMOTED to scenery (rule C4: too little of its face in view) is now found by its id and reported as
`(demoted by C4)` instead of `LOST` (the gold Norwich Elm Hill's church is demoted: 14 % of its face shows up the lane). `gold <an
accepted factory scene>` rebuilds the plan (the subject, the leading line) from the archetype and brief `accept` wrote into the scene
file's header, so it measures what the review sheet measured. On a scene with a valley the biggest chunk is 90 % or more whatever the
scene holds: the frame plan merges every depth the valley's terrain strips span (222 terrain lines in one chunk of the Dartmoor tor);
that is the frame planner's behaviour, not the scene's. A valley farm's box reads as a "blank facade" of 190 %: a box artefact.

## 5. The scenes made with it (14 Nov)

| scene | archetype | attempts | result |
|---|---|---|---|
| hampshire-yateley-green-1 | village-green | 3 | 9/10 checks (sky 0.14 under a big chestnut); the flint church with its spire on the right third, the diagonal path, the pond and reeds, walkers and a dog |
| hampshire-wyndhams-pool-1 | boardwalk-wetland (heath trees, a shore path for the far mover, no stream) | 1 | 10/10; a railed walk to the anglers' deck through reedmace and loosestrife, Scots pines round the pool |
| cotswold-green-1 (rebuilt in place) | village-green (refined: tree widths, one lamp, one bench), cell-seeded fill | 1 | 10/10; honey church on a third, Cotswold stone houses along the lane |

Second wave (14 Nov): one new scene through each new archetype and one through each fixed trial archetype, placed where they add
most to the rotation (four take over hand-drawn county openings of `uk-south-west`, which had no world scene at all; three are places
of their own in counties with none). Each was looked at on its sheet and at summer, autumn and night (`world.mjs render`).

| scene | archetype | attempts | status |
|---|---|---|---|
| kent-canterbury-mercery-lane-1 | medieval-lane | 2 (after 3 on Lincoln's Steep Hill, not accepted: plain stone fronts at the lens, one tower in a slot; the archetype was fixed instead) | promoted, a place of its own near Canterbury. A bookshop with its sign at the lens, the cathedral's west towers on the right third, floodlit at night. Defect: a leaver fading mid-lane can be caught in a still |
| pembrokeshire-tenby-harbour-1 | harbour-under-cliff | 3 (+ one re-draft to clear two boat overlaps) | promoted, a place of its own near Tenby. The quay leading in, harbour-front shops, a yacht's mast framing, pastel cliff-top terrace, the spire on the third. Defect: the limestone face is a plain pale band |
| devon-plymouth-hoe-1 | waterfront-civic | 3 (+ one for the lighthouse seed: attempt 3's seed change did nothing, the seed is hashed with the id) | promoted over `uk-south-west/devon-smeatons-tower`. The river wall leading in, the red-and-white tower alone on the Hoe's bank on the third, lit lantern at night. Defect: the far shore is the estuary backdrop's cranes, not green headlands |
| devon-dartmoor-tor-1 | edge-over-valley | 5 sheets (two spent on the walkers' routing, which no still shows; the factory's rule of three was exceeded) | promoted over `uk-south-west/devon-dartmoor-tor`. The path to the stacked granite tor on the third, ponies, the valley's walled fields ahead-left. Defects: the tor's stacks read a little like mushrooms; the night is as dark as Stanage's |
| west-midlands-gas-street-basin-1 | canal-basin (fixed) | 3 | promoted, a place of its own near Birmingham. The brick hump bridge with the viaduct behind, boats along both quays. Defect: the near wharf is bare and few people show at once |
| wiltshire-salisbury-close-1 | civic-square-facade (fixed) | 3 | promoted over `uk-south-west/wiltshire-salisbury-spire`. The path across the Close's lawn to the cathedral, its spire on the third, floodlit at night. Defect: the left half is heavy with canopy (the fill's trees on the lawn's edge) |
| hampshire-yateley-green-1 (re-drafted in place) | village-green (fixed) | 1 | replaced in place (same id, same OPENING line): framing trees set back, sky 0.26 against 0.14, one bench by the path. Defect: a fill bench still sits just behind ours |

Load (Node, warm, this box): Canterbury 149 statics, 0.9-1.0 s; Tenby 215-295 statics, 86 buildings, 0.9-1.3 s; Plymouth 184 statics,
59 agents, 0.8-1.4 s; Dartmoor 595 statics, 22 agents, 0.5-0.7 s (the fill off); Gas Street 117-169 statics, 0.7-0.9 s; Salisbury 699
statics, 1.0-1.5 s; Yateley 713 statics, 1.0-1.4 s. Salisbury and Yateley are over the 600-static mark: on an open green the fill
covers more bare ground. All builds measured noisy (six builders on four cores).

## 6. The fill seeded per cell

A world whose seed is 10000 or more (every `new --archetype` scene unless `--seed` says otherwise) gets the cell-seeded fill
(`79-world-1fill.js`, `WORLD_FILL_CELL_SEED_MIN`): each cover cell draws its picks, positions and variants from its own stream (the
seed, the kit, the tier, the cell), the cells are ordered by a hash, and the accents and the richness tier have streams of their own.
Older scenes keep the one stream, so their reviewed look does not change. Measured once (re-seeding one authored reed cluster at
Wyndham's Pool): one stream moved 69 % of the fill (271 pieces nearer than 30 m); the cell-seeded fill 48 % (134 near). The rest
still moves because the coverage grid and the edge dressing are shared; making those per cell is the next step.

Second wave: a cell-seeded world now runs each stage before the cover passes (edges, framing, near band, paving, people, life) on a
stream of its own, and dresses each edge from its own stream (the surface id and ring for a water's bank, the path and side for a
verge, the wall or line, the field), so an edit that changes how much one stage or one surface draws no longer shifts the rest.
Measured once (`stable2.mjs`, scratch): moving one vertex of a pond 1 m re-rolled 31 % of the Cotswold green's fill before, 14 % after
(near pieces 122 -> 72); the same on Yateley Green with a cell seed 27 % -> 13 %; re-seeding Wyndham's Pool's reed cluster (with a cell
seed) 51 % -> 38 % (near 149 -> 74). What still moves is the edited surface's own edge (its stands and gaps run as one rhythm along
the ring) and the coverage the edit changes. This re-rolled the fill of the cell-seeded scenes once (all looked at again on the
contact sheet of the promoted factory scenes).

## 7. Files

`tools/world.mjs` (archetypes, new --archetype, accept <draft>, promote, demote, contact, gold: the plan of an accepted scene from its
header), `tools/lib/world/archetypes.mjs` (eight archetypes; `heightOf`, `widthOf`),
`frame.mjs`, `goldcheck.mjs`, `factory.mjs` (draft, review sheet, scene file), `contact.mjs` (many scenes in one Chrome, contact
sheets), `promote.mjs` (the table), `critic.mjs` (exports its box helpers); `src/app/79-world-zzgallery.js`, `71-anim-registry.js`
(`animSupersede`), `78-anim-uk.js` (anchors), `79-world-1fill.js` (cell seeds).
