# World models: parametric models for everything repeatable

The user, 16 Oct: "we want models for everything repeatable". A library sprite is one drawing from one side. Anything seen from
another angle is a slab: ferries drawn as repeated rectangles, sailing boats as paper triangles, toy fishing boats. A **model** is
a small generator that builds real geometry (hull, cabin, mast, wheel, frame, lamp head, canopy) from a few parameters (size,
livery, age, season, seed). It is drawn correctly from any angle, coloured by the material pass, lit by the scene's sun, with lit
windows and lamps at night, sitting in the water where it floats, mirrored by the water pass, with a true footprint for the
engine. A scene then simply says what it wants and the library supplies it.

Files: `src/app/79-world-4models.js` (registry, builder kit, conformance check), `src/app/79-world-4model-<name>.js` (one model
each; the narrowboat is `79-world-4model-narrowboat.js`), `tools/lib/world/models.mjs` (the sheet), `tests/world-models.test.mjs`.

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
  solidity: 'solid', footprint(p) -> [[a, l]...],  // the nav footprint (default: the L x B rectangle)
  samples: [ { livery, age, size, seed } ],        // what the sheet shows as "many instances"
  faceCap: 2500,                      // faces a build may emit (extra faces are dropped, never thrown)
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
