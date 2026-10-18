# World models: parametric models for everything repeatable

The user, 16 Oct: "we want models for everything repeatable". A library sprite is one drawing from one side. Anything seen from
another angle is a slab: ferries drawn as repeated rectangles, sailing boats as paper triangles, toy fishing boats. A **model** is
a small generator that builds real geometry (hull, cabin, mast, wheel, frame, lamp head, canopy) from a few parameters (size,
livery, age, season, seed). It is drawn correctly from any angle, coloured by the material pass, lit by the scene's sun, with lit
windows and lamps at night, sitting in the water where it floats, mirrored by the water pass, with a true footprint for the
engine. A scene then simply says what it wants and the library supplies it.

Files: `src/app/79-world-4models.js` (registry, builder kit, conformance check), `src/app/79-world-4model-<name>.js` (one model
each; the narrowboat is `79-world-4model-narrowboat.js`; the landing stage and the shared seated and standing figures are `79-world-4models-landing.js`), `tools/lib/world/models.mjs` (the sheet), `tests/world-models.test.mjs`.

## 1. How a scene asks for a model

An entity whose object id has a registered model is drawn by the model. Nothing else is needed:

```js
{ id: 'ferry-1', obj: 'boat.ferry', at: [20, 90], facing: 80, attach: 'water' }              // seeded size, livery, age
{ id: 'ferry-2', obj: 'boat.ferry', at: [-30, 120], facing: 260, attach: 'water',
  model: { livery: 'red-funnel', size: 1.3, age: 0.7, seed: 4, opts: { decks: 2 } } }       // the scene says what it wants
```

| `model` key | meaning |
|---|---|
| `livery` | a name or an index into the model's palette list (`def.liveries`); omitted: seeded per entity |
| `size` | a scale (0.2 to 5) of the library size, or `{ l, w, h }` metres (the other dims follow the length) |
| `age` | 0 new .. 1 old: paint fades, metal rusts, timber silvers (`h.aged`); omitted: seeded 0.1 to 0.65 |
| `seed` | an integer that changes the entity's own random details |
| `opts` | free parameters for the model (strings, numbers, booleans) |

The strict validator checks the key (`worldModelSpecCheck`; an unknown key, a size out of range, a `model` on an object that has
no model are reported). The entity's `size`, `height` and `foot` follow the model's own dimensions (`worldModelFit`, called from
the engine's entity record), so the nav grid, the solver and the occlusion order see the true footprint of a 1.3 x ferry.

Moving things (agents of the life sim) take seeded parameters (a scene cannot name a livery for one yet). Cluster members
(`cluster:`) are seeded per member.

## 2. Add a model in 20 lines

Create `src/app/79-world-4model-lamp.js`. It runs at load; nothing else in the engine changes.

```js
worldModelDefine('street-lamp', {
  name: 'Street lamp', ids: ['street.lamp'],                       // the library objects it draws
  dims: () => ({ L: 0.5, B: 0.5, H: 4.6 }),                        // metres at scale 1 (a, l, up); default: the library's
  liveries: [{ name: 'black', post: '#26282b' }, { name: 'green', post: '#2f5a43' }, { name: 'cream', post: '#d8d0b4' }],
  build(p, h) {                                                    // p: parameters, h: the kit
    const k = p.size, post = h.aged(p.livery.post, 'paint');       // everything scales by p.size
    h.contactShadow(-0.35 * k, 0.35 * k, -0.35 * k, 0.35 * k);
    h.cyl(0, 0, 0, 0.5 * k, 0.17 * k, 0.12 * k, post, { role: 'plinth' });         // a base, then the column
    h.cyl(0, 0, 0.5 * k, 4.0 * k, 0.07 * k, 0.045 * k, post, { mat: 'metal', role: 'post' });
    h.cyl(0, 0, 4.0 * k, 4.1 * k, 0.11 * k, 0.11 * k, post, { role: 'collar' });
    h.line([h.P(0, 0, 4.0 * k), h.P(0.5 * k, 0, 4.2 * k), h.P(0.62 * k, 0, 4.15 * k)], 0.04 * k, post, 'metal', 'arm');
    h.frustum(h.ngon(0.62 * k, 0, 0.13 * k, 6), 4.05 * k, h.ngon(0.62 * k, 0, 0.19 * k, 6), 4.45 * k, '#e8e2c8', { mat: 'glass', role: 'lantern', cap: post });
    h.lamp(0.62 * k, 0, 4.22 * k, 0.1 * k);                        // lit after dusk, glow, and a world light
    return { height: 4.6 * k };
  },
});
```

That is the whole model: it is registered, drawn from every angle, sun-toned, lit at night, held to the conformance rules by
`tests/world-models.test.mjs` (which runs `worldModelCheck` over every registered model), and visible on the sheet:

```
node tools/world.mjs models street-lamp --full --out C:/tmp/sheets     # 8 angles, 4 seasons, noon / golden / night, sizes, liveries, the old sprite
node tools/world.mjs models street-lamp --check-only                   # the conformance check alone, with its problems
node tools/world.mjs models all --seasons --night --water             # every model
```

## 3. The definition

```js
worldModelDefine(id, {
  ids: [ 'boat.ferry', 'boat.ferry-*', /river-ferry/ ],   // exact ids beat 'prefix*' globs beat RegExps; a later definition wins a tie
  name, sampleObj,                    // a title; the object the sheet and the checks stand in (default: the first exact id)
  float: true,                        // sits at the waterline (ent.waterline), bobs, the hull starts there and is never cut
  hullFallback: true,                 // a failed build falls back to the library's art hull (a floater does); land models fall back to the sprite
  dims(info, ent) -> { L, B, H },     // metres at scale 1: L along the facing, B across, H up. Default: the library's w, d (d, w for a "front" class), h
  params(ent, o, p) -> { ... },       // overrides: liveryKey, age, anything the build reads (p.opts has the scene's opts)
  liveries: [ { name, ...colours } ] | { name: {...} } | () => [...],
  sunLit: true,                       // faces carry their normal and the scene sun tones them (the narrowboat opts out: baked sky light only)
  bob: { heave, roll, pitch, period } | false,   // the floater's bob (metres, radians, seconds); only with a time (agents, o.t)
  moor: { heave, roll, pitch, period },          // a floater MOORED in a swell (a static in rough water: the frame passes o.t and o.sea): larger than the idle bob; default 4x the heave, 3x the roll and pitch
  solidity: 'solid', footprint(p) -> [[a, l]...],  // the nav footprint (default: the L x B rectangle)
  samples: [ { livery, age, size, seed } ],        // what the sheet shows as "many instances"
  faceCap: 2500,                      // faces a build may emit (extra faces are dropped, never thrown)
  deck(p) -> { y, poly: [[a, l]...] },  // a walkable deck the model carries (17 Oct): the entity gets `deck`, things attach to it ('deck:<id>'), people walk on it as a raised level
  build(p, h) -> { height, footprint?, lights?, extra?, faces? } | void
});
```

`p` (the parameters, pure: `worldModelParams(ent, o)`): `seed` (an integer from the entity id and variant, or `model.seed`),
`season`, `L B H` (metres, scaled), `size` (the scale), `age`, `livery` (the chosen entry), `liveryIndex`, `liveryName`,
`variant`, `facing` (degrees; a mover's velocity), `moving`, `speed`, `t` (seconds: the caller's `o.t`, else an agent's own
clock, else null: a baked static never moves), `static`, `opts`, `info` (the library descriptor).

`build` returns `{ height }` at least. `faces` (an array) replaces the automatic order, `extra` fields are merged into the prim,
`lights` replaces the lamps' world lights.

## 4. The kit (`h`)

Model coordinates: **a** along the facing (+ forward), **l** across (+ to the right of the facing), **y** up in metres **from
the base** (the ground, or the waterline for a floater). `h.P(a, l, y)` gives camera metres `[x, y, z]`; every emitter takes
those 3D points, so a face is projected, clipped at the near plane and sorted correctly from any camera.

| helper | draws |
|---|---|
| `h.face(pts3, hex, mat, role, inside, extra)` | a polygon. `inside`: a 3D point inside the solid (default `h.centre`) so the face is culled by its outward normal; `null` a flat piece seen from both sides (never culled); `'two'` both sides, shaded toward the eye |
| `h.quad` is `h.face` of four points; `h.line(pts3, widthM, hex, mat, role)` | a rope, rail, stay, tiller: its width in metres at its own depth |
| `h.disc(c3, r, hex, mat, role, squash)` | a disc facing the eye: a fender, a pot plant, a lamp glass |
| `h.box(a0, a1, l0, l1, y0, y1, hex, top, mat, role)` | a box: its seen sides then its top |
| `h.prism(plan, y0, y1, hex, o)`, `h.frustum(plan0, y0, plan1, y1, hex, o)` | a plan outline `[[a, l]...]` extruded, or tapered between two outlines: a cabin, a funnel, a tower, a hull block |
| `h.cyl(a, l, y0, y1, r0, r1, hex, o)`, `h.ngon(a, l, r, n)` | a vertical cylinder or cone frustum, facets chosen by size; the regular polygon |
| `h.tube(p0, p1, r, hex, mat, role)` | a tube between two model points: a boom, a pipe, a tyre, a log |
| `h.wheel(a, l, y, r, { w, tyre, rim, spokes, axis })` | a tyre, a rim disc, spokes on the side the eye sees, a hub; axis `'l'` (a cart wheel) or `'a'` |
| `h.gable(a0, a1, l0, l1, yEave, yRidge, hex, { ridge, over, end })`, `h.hip(...)` | a gable roof with its end triangles, a hip roof (a pyramid when square) |
| `h.cloth([c00, c10, c11, c01], belly, hex, { nu, nv, stripe, side, seams })` | a sail, awning, flag, tarpaulin: a bilinear patch pushed out by a belly (m), cut into cells by size on screen (smooth shading, never facets), optionally striped, with `seams` panel lines |
| `h.rail(path, y, height, hex, { post, mid })` | a rail run along a plan path on posts |
| `h.mast(a, l, y0, y1, { r, rake, spreader, stays })` | a mast with a rake, a spreader with shrouds, stays to model points |
| `h.hullSides(outline, yBot, yTop \| fn(a, l), hex, mat, role, { keel })`, `h.deck(outline, y \| fn, hex)` | the sides of a hull from a plan outline (`keel`: the half-width at the water relative to the deck, about 0.6 for a V hull; returns the seen edges, for strakes), a deck over it |
| `worldModelOutline({ L, B, bowLen, bowPow, sternLen, stern: 'round' \| 'transom' \| 'point' })` | `{ outline, half(a), R }`: a hull's plan outline |
| `h.surface((u, v, off) => p3, { normal })` | decals on a surface: `.rect`, `.ring`, `.windows({ u0, u1, v, step, kind: 'port' \| 'rect', ... })` (lit panes by the seeded rule) |
| `h.lamp(a, l, y, r, { col, theta })`, `h.litFx(dark)` | a lamp (lit after dusk, with a halo and a world light); the extra of a lit pane |
| `h.contactShadow(a0, a1, l0, l1, alpha)` | a soft shadow on the ground, drawn first |

Parts and order. Faces are emitted into the current **part** (`h.part(name, { layer, key })`, default part `body`). The model
is drawn by `layer` (low first), and within a layer far to near by the part's centre (or `key`, a distance you give with
`h.depth(a, l, y)`). Inside a part faces keep the order they were emitted: make a part one convex solid or a set of faces that
cannot overlap (a box and its decals, a hull, a sail). Put things that are always under (a hull, a shadow) in a lower layer,
things that stand on them (cabin, mast) above, rigging last. When the order depends on the view (a boat's far end, the roof
when the eye is above it), set `layer`/`key` from `h.sees`, `h.above`, `h.depth` per build.

Tests of the view: `h.sees([da, dl, dy], [a, l, y])` (does a face with that outward direction at that point face the eye?),
`h.above(y)` (is the eye above that height?), `h.depth(a, l, y)`, `h.eyeY` (eye above the base), `h.nOf(dir)` (a model direction
in the camera frame).

Colour. Give every face its **material** (`mat`: one of `WORLD_MATERIALS`: paint, metal, glass, timber, fabric, slate, tile,
brick, stone, render, bark, leaf, grass, flower, reed, ...) and a **role** (free text: `window`, `hull`, `rail`). The material
pass then colours it by season (leaf, grass), weather (wet, frost, snow), light and haze; do not bake a season, a time or a
weather into a colour. Livery colours come from `p.livery`; wear from `h.aged(hex, 'paint' | 'metal' | 'timber' | 'fabric' |
'stone')`; `h.shade(hex, k)` and `h.mix(a, b, t)`.

Detail by distance. `h.px(m)` is the pixels that `m` metres span at the model's nearest point; `h.fine` (10 cm >= 1.5 px) and
`h.finer` (5 cm) say whether small detail is worth drawing. `h.lod(zMin)` recomputes them if you know a better nearest depth.
A model drawn at 40 m must not emit its rivets: the budget is 1600 faces (`worldModelCheck`), a typical model 150 to 300.

Randomness. `h.rnd()` is the model's own sequence (seeded by entity, variant and `model.seed`): the Nth call always gives the
same number, so **a new `h.rnd()` call in the middle shifts everything after it**. For a feature that must leave the others alone
use `h.u('key')` (a separate seeded value per key). `h.pick(list)`, `h.between(a, b)`, `h.chance(p)`. A model with no seeded
variation fails the conformance check ("instances are clones").

Floaters (`float: true`). The base is the waterline, so `y = 0` is the water. Build nothing below it (the hull starts at 0 and
the model is never cut). A bob is applied through `h.P` when there is a time (`h.bob({ heave, roll, pitch, period })` is called
for you; `h.pose` holds the current values). The water pass mirrors the model by its footprint like any hull.

Night. A face with `theta` (0 always lit after dusk, a number below the scene's window share lit, 2 never), `lit` (the colour)
and `halo: true` is emissive: the renderer draws it in its lit colour with a glow and never grades it. `h.lamp` and `h.surface`
windows do this for you. A model with `sunLit` (the default) carries each face's normal: the sun tones it by the real sun
(lighter and warmer toward a low sun, cooler away), and the chunk is rebaked per sun bucket.

## 5. What the engine does with a model

* `worldExtrudeHull` (79-world-4extrude.js) asks `worldModelBuild` first; the frame record `_wfrRec` (79-world-5frame.js) takes
  that path for any entity that has a model, at any angle (not only long hulls). A failed build (a throw, or no faces) is kept in
  `worldModelError()` and falls back: a land model to its library sprite, a floater (`float` or `hullFallback`) to the art hull.
* The prim is `{ kind: 'hull', model: true, faces, foot, zKey, height, box, waterline, noCut, solidity, lights, ... }`: it sorts
  with the statics by its footprint, is baked into chunks, mirrored by the water pass, hidden by what stands in front of it and
  redrawn behind movers like any prim; `worldExtrudeDraw` draws it (fills, strokes, lit panes with their glow).
* `foot` is the model's own footprint (`def.footprint` or L x B), `solidity` its class (`'solid'`), `height` what `build` returns.
* The entity's own `size`, `height`, `foot` are set from the model at build (`worldModelFit`), so placement and navigation know
  the real size.

Rocking at a mooring (17 Oct). A static floater (a ferry, a landing stage, a dinghy on a mooring) in ROUGH water (a water region whose
look has `chop` of 0.5 or more: an estuary, the sea) is drawn live: `_wfrRocks` (79-world-5frame.js) marks it in the plan, takes it out of
the baked chunks, and every 1/3 s the frame builds the model again with `o.t` (the scene time) and `o.sea` (0 flat calm .. 1 a fresh breeze
.. 1.6 a gale, from the light's wind: `_wfrSea`) and draws it once into its own bitmap that the frames between blit. With a sea the kit's
`h.bob` uses the def's `moor` (the sea scales it), so a ferry heaves about 10 cm and rolls about a degree, the 120 m pontoon of a landing
stage less, and a flat calm is still. The baked mirror in the water stays at the rest pose (a pixel at most). A canal, a pond and a harbour
never rock, and a model built without `o.sea` (an agent's, the sheet's) keeps its small idle bob. The build's `pose` ({ heave, roll, pitch }) is
on the prim for checks. Test: `tests/world-river-detail.test.mjs` X3.

The white water of a big hull (a ferry, a stage): `_wmdVesWash` (79-world-4models-vessels.js) draws a broken skirt of foam standing against
the hull at the waterline and a bow wave at each stem. A flat collar is a sliver under a pixel from a quay 100 m away; upright pieces read.

## 6. Rules (what the review looks for)

1. **Real form from every angle.** Look at the sheet: from 8 angles, end-on and from above. A flat panel with a paper outline
   fails the review whether or not a check covers it. Describe each sheet cell in words first, then ask "is this how it is in the
   real world? would someone who knows it find it strange?"
2. **Right size.** `dims` are real metres (a ferry deck, a cabin height, a lamp's reach). The library's size is only a default.
3. **Scales.** Everything is built from `p.L p.B p.H` or multiplied by `p.size`: a scene's `size` must change the model (the check builds it at 1.5 x and fails a model whose picture does not grow).
3a. **No clones.** Two instances differ in livery, age, details, equipment, by seed. A model that always draws the same picture
   fails `worldModelCheck`.
4. **Sits where it floats.** The waterline is the base; the hull's lowest line is at 0; nothing under the water is drawn over it.
5. **Lit.** Windows, lamps, navigation lights, screens: emissive after dusk with a seeded share lit (someone aboard), not all.
6. **Cheap.** Under 1600 faces, usually 150 to 300; small detail drops by distance (`h.fine`); no per-frame allocation outside the
   build; a build under 40 ms (the check measures it).
7. **Deterministic.** The same entity gives the same picture (no `Math.random`, no `Date.now`).
8. **Seasons and weather by material**, never baked colours. A seasonal feature (flowers, snow load, leaves) reads `p.season`.
9. **Private names** `_wmd<Name>` for helpers at the top level of your file; model ids are lower-case words; one model, one file.
10. A model that is not drawn at all must fall back (a thrown build never leaves a hole): test it with a bad build.

## 7. Known limits (16 Oct)

* Agents (the life sim's movers) build their model every frame; keep them cheap. Their parameters are seeded; a life entry cannot
  name a livery yet.
* A model's lights reach the night glow of its own faces and `prim.lights` (world lights), but the engine's light-pool pass takes
  only sprite records: no pool on the ground under a model's lamp yet (put a faint `contactShadow`-style disc if the pool matters).
* The engine's cast shadows come from sprite records; a model carries its own `h.contactShadow`.
* Faces are sorted by part, not by BSP: two parts that interlock (a mast through a sail) must be one part or ordered by `key`.

## 8. Working in parallel

Several people (or agents) add models at once without touching each other:

* One model, one file: `src/app/79-world-4model-<name>.js` (the name sorts after the extruder and before the frame; the registry
  is created on first use, so the file order never matters). Private helpers are `_wmd<Name><Thing>`. A test for a particular
  model goes in `tests/world-model-<name>.test.mjs`; the conformance test of `world-models.test.mjs` already runs over yours.
* Do not edit `79-world-4models.js`, `79-world-4extrude.js` or `79-world-5frame.js` for a model. If the kit lacks a helper, write
  it in your own file as a function that takes `h` (`function _wmdFerryFunnel(h, a, l, y, r) { ... }`) and say so in your report:
  the architect folds the useful ones into the kit.
* Claim object ids that are yours. Two models that claim one id: the one defined later (file name order) wins, silently.
* Check your work on the sheet before anything else: `node tools/world.mjs models <id> --full --out <dir>`, and put the PNG
  path in your report. Review every cell by describing it in words first (what is where, on what, joined to what), then ask
  whether someone who knows the thing would find it strange.
* Then in a scene: an entity of the object (a plain `{ obj, at, facing, attach }`) is already drawn by your model; `model:`
  chooses livery, size, age.
* Add one row for your model class to SCENE_LESSONS section W when you find a mistake worth keeping.

## 11. Seafront models and generators (17 Oct, detail/pier)

| model / generator | file | what it is | scene use |
|---|---|---|---|
| `building.beach-hut` | `79-world-4model-beachhut.js` | one hut: solid, vertical stripes or a darker skirt; door single / double / stable / standing open on a dark interior with a towel; side lights, a front porthole; roof pitch 0.38 to 0.8; an optional veranda on posts; a number plate (bars, never digits); a deck chair, a striped windbreak, a towel line. All seeded, all overridable in `model.opts` | `{ obj: 'building.beach-hut', model: { livery, size, seed, opts: { door: 'open', veranda: true } } }` |
| `worldBeachHutRow({ from, to, facing, turn, seed, gap, size, mix, skip, chair, windbreak, veranda })` | same | the entities of a row that does not repeat: a paint never twice in a line, size and wobble jitter, spacing from the footprint of each (so a fan turned toward the viewer never overlaps), gaps for a chair | `entities: [...worldBeachHutRow({ ... })]` |
| `building.kiosk` | `79-world-4model-kiosk.js` | a promenade or pier kiosk: hatch with goods on the shelf and shutters thrown back, a striped canopy with a scalloped valance, a menu board of painted bars, a gabled roof, a roof sign on posts (ring and bands, no lettering); `opts.kind`: `icecream` (a cone and two scoops on the ridge), `tea` (a chimney), `arcade` (a deeper hall, lit bulb border), `tackle` (rods, a net). A solid; kb class `market-stall` (paving or a deck) | `{ obj: 'building.kiosk', model: { livery: 'pink-cream', opts: { kind: 'icecream' } } }` |
| `street.bunting` | `79-world-4model-bunting.js` | pennants on a sagging cord between two poles; `opts.span`, `height`, `sag`, `posts: false`; four palettes; flutters by `p.t`; passable | `{ obj: 'street.bunting', blocks: true, model: { opts: { span: 8.4, height: 3.9 } } }` |
| `structure.pier` (reworked) | `79-world-4model-pier.js` | piles with a tide-stained weed band and a ring of foam at the water, X braces, a plank deck with boards across, rails with lamp standards alternating from side to side and festoon bulbs between them (lit at night), lifebuoys, a pavilion with arched lit windows, a roof sign edged with bulbs, an eave bulb row, a door canopy, turrets, a vane (never a flag). `opts`: `deck` (m above the water), `ramp` (a rising approach), `beachLen` / `beachRise` (piles stand on a beach), `extL` / `extR` (an apron back to the wall), `gate: false`, `festoon: false`, `kiosks: true` (three plain inline ones) | `worldPierPlan(...)` |
| `worldPierPlan({ id, root, facing, size, waterY, level, wallX, benches, anglers, kiosks, seed })` | same | the pier entity (a model that carries its own deck), the apron to the promenade wall, a ramp portal onto the deck, and kiosks, benches and anglers on it (`attach: 'deck:<id>'`: solid kiosks block the walkers, everything is drawn after the pier) | spread `entity`, `entities` and `surfaces` into the spec; visitors use `{ go: '<pier id>' }, { wander: '<pier id>', for: [..] }` |
| `seafront-regency`, `seafront-parade` | `70-scene-gen-style-seafront.js` | building styles: a pastel stucco terrace of 4 storeys with a hidden flat roof (the end of a taller house is a rectangle, not a gable), first-floor iron balconies, a bow over three floors on half the houses, fanlight doors; and a parade of three storeys over shopfronts with a deep striped canopy and lamps | `buildings: [{ along, style: 'seafront-regency', storeys: 4 }, { style: 'seafront-parade', shops: ['tea', 'gift'] }]` |

Engine hooks added for them (small, general):
* `def.deck(p)` on a model (registry `worldModelFit`): the entity carries a walkable deck; a thing attached `deck:<entity id>` stands on it, the validator accepts the host, and a ramp or stairs may name it (`from: 'ground', to: '<id>'`).
* `ent.orderZ` (set in `_wcEntity` for a thing on a host's deck, read by the order memo and the frame record): ordered as if it stood at the host's nearest edge, so it is drawn after a long model it stands on.
* kb overrides in `79-world-0kb.js`: `building.kiosk` is a `market-stall`, `building.beach-hut` has `orient: 'free'` (a row may fan toward the viewer), `street.bunting` is passable, `structure.lighthouse` may be 16 to 48 m.
* `79-world-2life.js` `_wlfToLevel`: a mover that reaches a portal 0.6 m short of the painted ramp steps onto it (spread by its id); on a level whose host is an entity it is hosted by it.

## 10. The English village set (17 Oct, detail/cotswold): a church, a churchyard, a green

The Cotswold green's church was a blank wall of tall windows under a flat grey slab, with a bare wall, no headstones and no yews. These are the
reusable pieces that replaced it (all seeded, scalable by `model.size`, sheet with `node tools/world.mjs models <id> --full --out D`):

| model (object id) | what it is | the parameters |
|---|---|---|
| `parish-church` (`structure.parish-church`) | west tower in three stages with set-back corner buttresses, a belfry with louvred openings, a corbel table, a crenellated parapet with pinnacles, a stair turret and a weathercock (or a broach spire); a nave under stone slates laid in courses that shrink to the ridge, a clerestory over one or two aisles, a lower chancel, a gabled south porch, a priest's door, stepped buttresses, quoins, mottled coursed stone, tracery by era, lit glass after dusk (never on a wall seen edge-on) | `opts.era` norman / early-english / perpendicular, `opts.aisle` both / south / none, `opts.crown` parapet / spire / none, `opts.porch`, `opts.clerestory`; liveries honey, grey-limestone, ironstone, red-sandstone, flint (clay tiles). 34 x 14 x 19.4 m at size 1; `facing: 90` puts the tower on the left and the porch toward a camera looking north |
| `headstone` (`structure.headstone`) | an upright slab with a round, pointed, square, shouldered or ogee head, or a chest tomb; leans a few degrees, lichen and moss, a sunk base, faint rows where text would be (never readable) | `opts.shape`, `opts.lean`; liveries limestone, slate, sandstone, granite, marble |
| `lychgate` (`structure.lychgate`) | four oak posts on footings, a pitched stone-slate or tile roof with barge boards, a timber-framed gable at each end, seat rails, two slatted gates shut or ajar | liveries oak, black-white, red-tile; `facing` is the line of the path through it. The kb gives it its own class (`lychgate`: overhead, stands on a path, faces as told) |
| `churchyard-yew` (`tree.churchyard-yew`) | a fluted multi-stemmed trunk and a crown of overlapping needle lobes (material `needle`: evergreen, it does not turn in autumn) | `opts.form: 'column'` for a clipped or Irish yew; liveries dark, green, olive |
| `noticeboard` (`street.noticeboard`) | two posts, a glazed cabinet with a pitched cap, a cork back with pinned sheets (blank paper) | liveries oak, green, black |

Also in the set (not models): `lines: [{ kind: 'wall', laid: 'coursed' | 'rubble' | 'drystone', cope: 'saddle' | 'flat' | 'upright', stone, h, width }]`
(`79-world-4masonry.js`: a tone per stone, staggered joints, long stones, a coping row; a wall with no `laid` keeps the plain courses), and the
scaffold landmark `parish-church[:livery]` (`--landmarks=parish-church:honey,pub,pond`), which writes the church (as a `landmarks` entry with its
`model`), a coursed wall round three sides with a gap, the lychgate, three yews, about 30 headstones in rows and a path from the lane to the porch.

Engine changes that came with it (each has a line in `tests/world-churchyard.test.mjs`): a landmark that has a model is drawn by the model (it was
always the sprite); `landmarks` entries take `model`; a model line honours `alpha` (faces did, lines did not); kb: a per-object `ov.cls`, `ov.solidity`
and `ov.size` (a headstone's class range is 0.6 to 1.3 m); a wall piece is cut at a bend (a corner piece was concave and its footprint covered the
ground inside the corner); the model check keeps a small thing beyond the camera's near plane. Note for authors: a wall's `gaps` should be arc lengths
`[[s0, s1]]` (the `{ at, w }` form is read by the extruder but not by the placement obstacles, so a lychgate in such a gap was dropped as overlapping).

## 9. The landing stage and seated figures (16 Oct)

`boat.landing-stage` (`landing-stage`) is a floating pontoon moored off a river wall: a hull, deck lines, fenders, bollards, guide piles, lamp standards, a terminal shed, a hinged gangway down from the wall (its height is read from the waterline the entity floats at), brows to the ferries' gates and people waiting. A scene places it like a boat (`attach: 'water'`) and says where its gangway and brows are: `model: { opts: { gap: 14, gangway: 5, shed: 5, berthA: -30, berthB: 40, people: 0.8 } }` (metres along the stage from its middle; `gap` is the stage's inland edge to the wall). `shedSide: 1` puts the terminal shed on the INLAND edge instead of down the middle: seen along the wall, a shed on the stage's centre line hides the hull of a ferry lying behind it (the Pier Head's second ferry); on the inland edge it stands clear of the berth side. The scene leaves the wall's railing open at the gangway and lays the ferries alongside the berth side. `_wmdLdgSeated(d, o)` and `_wmdLdgStanding(d, o)` draw a seated or standing person through any `{ line, disc }` pair (the kit's `h` or a vessel's `V`): a person who sits has a thigh, a shin, arms and a head, so a dinghy's crew, a rower or someone on a bench is never a column.

## 12. Railway viaducts and the canal warehouse (17 Oct, detail/castlefield)

| piece | file | what it is | scene use |
|---|---|---|---|
| `structure.viaduct` | `79-world-4model-viaduct.js` | a Victorian viaduct seen from below, any length. `opts.kind` `arcade` (default): brick arches on pilastered piers with a stone plinth, a voussoir ring, spandrels with soot streaks and repair patches, a string course, a coped parapet, buddleia on the ledge, arches that are open, bricked up with a unit door (a lit window after dusk) or barred, uplighters on the piers; `gap` (m, at `gapAt`) replaces the middle by a steel plate-girder span between two abutment piers. `girder`: through Warren lattice girders (riveted plate band, posts, diagonals, a cambered chord, gussets, cross bracing, the deck underside with its cross beams and stringers) on brick piers with panels and a stone cap; `masts` adds overhead-line masts, arms and wires. Other opts: `len` 96, `width` 9.2, `h` (rail level) 10, `span` (pier pitch), `pier`. Liveries red-cream, soot-grey, blue-black, buff-green | `{ obj: 'structure.viaduct', at, facing (ALONG the viaduct), attach: 'ground', framed: true, model: { livery, seed, opts: { kind: 'arcade', len: 150, gap: 29, gapAt: 10.5 } } }`. The entity's `at` must be on land (the middle of a run may be a quay); `gap` and `gapAt` put the abutments on the two banks |
| `def.legs(p)` | `79-world-4models.js` (`worldModelFit`), `79-world-1nav.js` | a model may stand on solid legs under an overhead body: `ent.legs` (world polygons) are cut out of the ground and swim grids, so a walker or a boat never passes through a pier though the deck, the arches and the girders are overhead. `world-1place` never treats an overhead thing as blocking a path (`_wplOffline`) | `legs(p) { return piers.map(...) }` in the model definition |
| `canal-warehouse` | `70-scene-gen-style-warehouse-canal.js` | a building style: 4 to 5 storeys of dark red brick, tall ground floor of round-headed loading arches (cart doors, steel shutters, open dark bays), a stone string course, arched cast-iron windows to the second floor then segment and flat heads, stacked taking-in doors and a `lucam` (the timber hoist hood and beam above them, a block kind), the same bays on the gable ends; `party: 'none'` | `buildings: [{ along, side, style: 'canal-warehouse', storeys: [4, 5], party: 'none', spacing: 2.5, from, to }]` |
| `party`, `spacing` | `79-world-1frontage.js` | an `along` rule is a terrace by default (party walls `both`, blank end walls); `party: 'none'` (or `left` / `right`) stands the buildings free, and `spacing` leaves metres between them so every end wall is drawn with windows | see above |

Generator fixes that came with it (`70-scene-gen-0building.js`): a window's glazing bars and the sky's streak on the glass are cut to the opening (seen along a deep reveal they hung outside the window, a grid of dark lines beside every pane): a style opts in with `win.clipBars: true`; brick walls carry patches of repointing and of weathered brick (a wall was one flat tone): `wall.patches: true`. Both are opt-in because turning them on for a style changes every compiled scene that uses it (`tests/scene-compat.test.mjs`: a documented hash refresh); setts on a strip are laid in a running bond (`79-world-4ground.js`); the fill keeps a prop's foot inside the frame (`79-world-1fill.js`: a bin whose base is below the bottom edge was a dark cut blob). Test: `tests/world-model-viaduct.test.mjs`.
