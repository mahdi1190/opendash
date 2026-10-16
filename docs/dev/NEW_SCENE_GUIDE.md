# A new place in under 15 minutes

The goal (the user, 16 Oct): "make sure we can generate new scenes fast". A new place takes a short description and a few minutes to a
good first render, with no engine work, at the quality of Whitby, York and Malham. The layout only has to be plausible (not map
accurate); the landmarks have to be recognisable; it has to LOOK good.

Read first, once: `SCENE_LESSONS.md` (every mistake and its cause), `WORLD_ENGINE.md` 5 (the spec) and 12.3 (kits), `WORLD_MODELS.md`.

## 1. The five steps

```
node tools/world.mjs new <slug> --setting <kit> --place "<name>" --lat <n> --lon <n> --view "<words>" \
     [--landmarks=church-tower:cotswold-church,pub:cotswold-stone,pond] [--houses=<style>] [--county=<c>] [--force]
node tools/world.mjs render world-test/<slug>-1-w3 --dir=D --dates=summer,autumn,night       # flags need =
```

1. **Scaffold** (seconds). `new` writes `src/app/79-world-zscene-<slug>-1.js`, a 35 to 45 line spec built from the kit's recipe, validates
   it and prints what the engine dropped (an unknown object, a bad attach). The place is in the hidden pack `world-test`, so it shows in
   the Animations gallery at once (its meta carries `ukPlace`, `county`, `ukTown`, `ukView`: `79-world-zzgallery.js` groups by them; no
   edit anywhere else).
2. **Render** summer noon, autumn golden and winter night. Crop the details with any image tool.
3. **Look and describe** (section 5). Find the ONE weakest thing.
4. **Fix at the cause**: the spec if it is this place's layout; the kit, the style, the generator or a model if the next place would
   suffer the same (the way each fix of the two test places was made, section 8).
5. **Re-render** once per tweak. Finish with one privacy scan on the files you changed.

`--view` is plain words: a compass word sets the heading (`looking north`), `high`, `above`, `cliff`, `hill`, `bridge` raise the eye,
`wide` widens the lens, `close` narrows it. Everything else is the recipe's and then yours.

## 2. What you give, what the engine gives

You give: the kit, the place, the view, the landmarks you want, a seed. The engine gives the fill (trees, plants, reeds, rocks by the
kit's pools and the richness tier), edge dressing (banks, kerbs, quay posts), the framing foreground, the backdrop, the sky, the seasons,
the light and weather, people and animals by the kit's life, reflections, night lights. A spec never says a colour, a season or a time.

## 3. The kits (`--setting`)

| kit | the place | layout family | houses by default |
|---|---|---|---|
| `village-green` | a green with a lane round it, houses on three sides, a pond | green | stone-cottage |
| `park`, `pond` | a park or a pond with its trees and reeds | green | georgian / stone-cottage |
| `coast` | a promenade by a beach and the sea, a headland | coast | georgian |
| `quayside`, `canal`, `river-city`, `waterfront-city` | a quay or towpath, water, houses on the far bank | water-edge | pantile-cottage / victorian-terrace / mill / baroque-civic |
| `terraced-street`, `old-town-lane`, `civic-square` | a street seen along its length | street | victorian-terrace / timber-framed / georgian |
| `moor`, `heath`, `woodland`, `farmland`, `downs`, `dale` | open country, a path, walls, grazing | open | stone-cottage |

Each kit (`79-world-0kits.js`) is the curated set of the best library objects for that kind of place: near, mid, far and distant
dressing, edges, framing, backdrop, sky share, life. Do not name a weak object (blobs, lollipops, stacked balls): `worldKitCheck` fails.

## 4. Landmarks (`--landmarks`) and styles

`kind` or `kind:style`. Known kinds: `church-tower`, `pub` (with its sign), `pond` (with ducks), `minster`, `abbey` (green, street,
water-edge families), `pier`, `lighthouse`, `beach-huts` (coast), `bridge` (swing bridge, water-edge). An unknown kind or one that
has no recipe in that layout is printed as a note, never dropped silently. To add one: an entry in `LANDMARKS` in
`tools/lib/world/scaffold.mjs` (a function returning buildings, entities, surfaces or lines at the recipe's slots).

Building styles (`style:`) that exist: `stone-cottage`, `cotswold-stone` (honey limestone, steep stone-slate roof), `pantile-cottage`,
`timber-framed`, `victorian-terrace`, `edwardian`, `georgian`, `baroque-civic` (crowns), `mill`, `station`, `norfolk-flint`, `semi-1930s`,
`interwar-shops`, `brutalist`, `modern-glass`, `parish-church`, `cotswold-church` (crown `pinnacled-tower`), `gothic-minster`
(`twin-towers`), `gothic-ruin` (`abbey`), `swing-bridge`. A row of houses is `{ along: <surface id>, side: 'left' | 'right', style, from, to }`
(`left` of a path that runs along +z is -x). Pick a style that matches the region and era; stone, brick and render colour come with it.

Models (`entities: [{ obj, at, facing, attach, model: { livery, size, age, seed } }]`, `WORLD_MODELS.md`): boats (`boat.narrowboat`,
`boat.fishing-boat`, `boat.dinghy`, `boat.yacht`, `boat.tug`, `boat.lifeboat`, `boat.paddle-steamer`, `boat.canal-barge`, ferries ...),
`structure.pier` (a Victorian pier with a pavilion, kiosks, lamps; 150 m at size 1), `structure.lighthouse` (banded tower, gallery, lit
lantern, keeper's cottage), `street.pub-sign` (a two-post inn sign, blank board). Other library objects: `building.beach-huts`, benches,
lamp posts, bollards, lifebuoys, trees, rocks, a stone/dry-stone/hedge/railing `lines` kind (a wall takes `stone: '#hex'` for the local
stone). `node tools/world.mjs models <id> --full --out D` draws a model from every angle.

## 5. The review checklist (the describe-then-judge rule)

Look at the render and the crops before anything else. **Describe in plain words first: what is where, and what it stands on.** Only
then judge: would a local find it strange? Is it as good as Whitby, York, Malham? Then tick:

- [ ] The landmark you asked for is the first thing the eye finds, whole in the frame (not cut by an edge), and recognisable by its shape.
- [ ] Everything stands on something (a ground, a quay, a deck): no floating, no sinking, no gaps in the water, no object across a path.
- [ ] Scale is right: a person against a door, a bench against a wall, a boat against a quay.
- [ ] No weak or wrong thing: a tree where it cannot grow (a hawthorn at the tide line), a flat brick wall that should have windows,
      a lone slab, a repeated clone, a lamp in the middle of a lawn.
- [ ] The foreground is dressed, the middle layers are rich, the sky is not empty (kit sky share), the backdrop fits the region.
- [ ] Night: lit windows (some, not all), lamps with pools, the landmark still reads.
- [ ] Autumn and winter are different places: leaves turn, bare boughs, people in coats, snow on the right surfaces.
- [ ] `node tools/world.mjs validate world-test/<id> --log` shows no drop you do not understand.
- [ ] Nothing personal, no readable text on signs, no flags (the care rules; `worldKbCare`).

## 6. Asking for a missing thing ("engine work needed")

If the place needs a thing the kits, styles and models do not have (a pier, beach huts, a lighthouse, a church tower in a local
stone): do not fake it with a stretched sprite. Say it in one line, the way the two test places did, and add it as a REUSABLE piece in
its own new file so the next place benefits:

| need | where | how |
|---|---|---|
| a building type (a church, a pub, a barn) | `src/app/70-scene-gen-style-<name>.js` | `sceneBuildingStyleDefine(id, Object.assign({}, sceneBuildingStyle('stone-cottage'), { wall, roofMat, win, pitch ... }))`; crowns for towers |
| a repeatable object (a pier, a lamp, a sign) | `src/app/79-world-4model-<name>.js` | a library object with `real: { h, l, w }` and `worldModelDefine(id, { ... })` (`WORLD_MODELS.md` section 2); `node tools/world.mjs models <id> --check --full` |
| a kind of place | `79-world-0kits.js` and `tools/lib/world/scaffold.mjs` | a kit, a layout family in `FAMILIES`, `KIT_FAMILY` |
| a landmark word | `tools/lib/world/scaffold.mjs` `LANDMARKS` | a function of the recipe's slots |

`dims()` of a model must return constants (the library's sprite size is not its true size).

## 7. Measured timings (16 Oct, one agent, wall clock from `date` at each milestone)

Both places were made with ONLY the scaffold, the kits and existing models; whatever was missing was added as reusable engine work (section 8) and is
INCLUDED in the "to a version I would show" column.

| place (kit) | scaffold command to first render | first render to a version to show | engine work inside that time |
|---|---|---|---|
| Cotswold village green (`village-green`) | 26 s (scaffold 14 s, render 12 s) | about 8 min | 2 honey-stone styles, the pub sign model, a `stone` colour for walls |
| Victorian seaside pier (`coast`) | 6 s (scaffold and render) | about 5.5 min (plus about 4 min of model work done just before it: lighthouse, pier, and the sign) | pier and lighthouse models, a kit fix, a model-check fix |

First render to a version to show, in total, was 13.5 minutes for both places, including all engine work. A render is 4 to 6 s.
With no missing piece, a place is a scaffold, a render and two or three layout tweaks: under 15 minutes.

## 8. What the two test places showed (and where each was fixed)

| found | cause | fixed in |
|---|---|---|
| houses, church and pub came out as red brick | no honey-stone style | new `70-scene-gen-style-village-cotswold.js` |
| a church tower too squat to read | the parish church crown is 2x the nave | crown `pinnacled-tower` (tall, battlemented, four pinnacles) |
| a pub is a house | nothing says "pub" | model `street.pub-sign` and a paved forecourt in the pub landmark |
| a churchyard wall in grey slab | a wall had one colour | `stone` on a wall line (`79-world-4extrude.js`, `79-world-0core.js`) |
| a pier crossing the whole view as a thick grey slab | the model read the library size (a length) as its width | `dims()` constants; recipe puts the pier root off the promenade |
| hawthorns on the beach | the coast kit's richness pools held trees; they are placed on any ground | no trees in the coast `rich` pools (`79-world-0kits.js`) |
| a seafront of blank red gables | the Edwardian gable style seen at a grazing angle | the coast recipe uses `georgian` (a cream and stone terrace); a view at a slant needs a style with its fronts to the eye |
| `worldModelCheck` failed a 2.9 m sign | the near view stood 3 m from a camera 6 m up | the check keeps a small thing in shot (`79-world-4models.js`) |

## 9. Known gaps (not done)

Church nave: no buttresses, porch or clerestory; the churchyard wall is a flat colour (no coursing) and the headstones are not seen. Pier
kiosks are plain boxes, the pier has no people on it. The sea is a small part of the coast view (the layout looks along the promenade).
The `street`, `water-edge` and `open` families are validated but not rendered in this pass (the guide's checklist applies to them first).
`tests/world-kit-fixtures.test.mjs` has one failure that is on `main` too (a fishing boat in the quayside fixture is 6 m tall).
