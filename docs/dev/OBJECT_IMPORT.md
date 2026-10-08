# Raster objects and AI sprite sheets

The object library (docs/dev/SCENE_ENGINE.md section 2) can hold objects backed by PNG (or WebP) images as well as vector
shapes. The aim (user request, 8 Oct) is to grow the library quickly with AI image tools: Gemini or ChatGPT draws, Claude puts
it together. The key piece is the **sprite sheet**: ONE image per object, in a fixed grid that copies the structure of our
own object sheets (variants as rows; spring, summer, autumn, winter, night and lit-at-dusk as columns; one row of animation
frames). The importer slices it and builds an object with REAL seasonal and night versions. The automatic derivations only
fill gaps.

The user accepts the AI's accuracy for landmarks, so the import does not gate on likeness. It does gate on structure
(the grid, transparency, budgets), and it warns about consistency, palette and text.

Contents: the workflow, the sprite-sheet template, the commands, the engine API, the derivations, storage and install
size, the lint, the demo, and the files.

## 1. The workflow (Gemini or ChatGPT draws, Claude assembles)

1. Make the template and the examples (they are committed already, in `docs/dev/object-sheets/`):
   `node tools/anim-pack.mjs object template --rows 2 --frames 4 --examples`
2. In Gemini or ChatGPT, attach `template-2x6-f4.png` and the three `example-*.png` sheets, then paste the prompt from
   `docs/dev/object-sheets/PROMPT.md` with the subject filled in ("a red telephone box", "a Thai spirit house"). Generate
   one image per object.
3. Import it:
   `node tools/anim-pack.mjs object import-sheet answer.png --id prop.phone-box --rows 2 --frames 0 --kit london --role street`
   This prints the grid it found (`cells xxxxxx xx.xxx`), every WARN or FAIL of the sheet lint, the derivations, then runs
   `object lint` and `object sheet` on the new object. Look at the sheet PNG.
4. If a cell is wrong, ask the AI to redraw that one cell "at the same position and size", or fix it in an editor on the
   same grid, and import again (a re-import replaces the object's folder).
5. Use it in scenes like any library object (`place`, `scatter`, `actors`; archetypes pick it by its `kit:` and `role:` tags).

Many objects go through `object import-batch <folder>` and ONE `manifest.csv`: a row with `rows` set (or `frames` above 0 on
a PNG) is a sprite sheet and is imported exactly as `import-sheet` would; any other row is a single image or folder, as
`object import`.

## 2. The sprite-sheet template (`tools/lib/sprite-sheet.mjs` SHEET)

| what | value |
|---|---|
| cell | 256 x 256 px |
| gutters | 32 px between cells |
| margins | top 56, left 112, right 32, bottom 32 px (labels go here on the blank template; nothing in the answer) |
| columns, left to right | spring, summer, autumn, winter, night (lights off), lit (dusk, lights on) |
| rows | one per variant, top to bottom; then an optional FRAMES row |
| frames row | 2 to 6 cells from the left: the summer look of variant 1 in the poses of one loop (walk cycle, sails, sway) |
| object in its cell | centred, standing on a baseline 16 px above the cell's bottom, about 80 % of the cell's height |
| background | one flat colour, #FF00FF (magenta) by default, or full transparency |
| never | text, logos, labels, grid lines, a ground shadow, scenery or a sky |

Size: `sheetSize(rows, frames)`; for example, 2 rows plus frames is 1840 x 920 px. An AI that returns another size is
fine, because the slicer does not rely on the exact geometry (below).

**Slicing (`sliceSheet`)** works without the exact geometry, so a resized or slightly misaligned answer still imports:

- Find the background: transparency, else the border's commonest flat colour. A chroma key is removed everywhere, any other
  colour by flood fill from the edges. Edges are un-mixed from the background: an edge pixel's alpha is its projection on
  the line from the background to the nearest interior colour, then the edge rings are despilled. This leaves no magenta
  fringe, even on dark night cells.
- Label the marks (connected components), drop specks, and group them into row bands by their vertical extents. Label-sized
  bands are dropped, and bands are merged or split to the expected row count. A frames row is detected when there is one
  more band.
- Find the column centres from the rows that have all six groups (or six equal parts of the marks' width), then assign each
  group to the nearest centre. A missing cell stays empty in its own column and does not shift the others.

**Alignment (`alignSheet`)**: every cell of a row is scaled to the row's reference (the summer cell, else the first present)
when it is within 20 %. All cells go on one canvas, bottom-centre (so every variant and season shares one size and anchor),
and are then shifted by at most 4 % to the best alpha-mask overlap with the reference. Frames use the same canvas.

**The consistency lint (`lintSheet`)**:

| severity | rule | when |
|---|---|---|
| FAIL | missing | a variant row with no season cell at all |
| FAIL | size | a cell more than 20 % taller or shorter than the row's median (not normalised: redraw it) |
| FAIL | frames | a frames row of 1 frame, or more than 6 |
| WARN | missing | a missing spring, autumn or winter (derived), night (the live grade) or lit (auto windows) |
| WARN | size | 8 to 20 % height drift (normalised) |
| WARN | position | the cells' bottoms differ by more than 6 % of a cell (aligned to one baseline) |
| WARN | shape | a cell's outline overlaps the reference less than 55 % (trees and plants: autumn and winter are exempt down to 12 %) |

`--force` imports in spite of FAILs; `--dry-run` slices, aligns and lints only.

## 3. The commands (`tools/anim-pack.mjs object ...`, `tools/lib/object-import.mjs`)

```
object import <file-or-folder> --id <cat>.<name> [--category c] [--anchor bottom-centre] [--size 300x400 | x400 | 300x]
              [--kit a,b] [--role r] [--tags t,u] [--res 1] [--palette 0.3] [--keep-bg] [--lit auto|none] [--snow auto|none]
              [--period 0.9] [--no-sheet]
object import-batch <folder> [--manifest <folder>/manifest.csv] [--dry-run] [--force] [--no-sheet]
object import-sheet <sheet.png> --id <cat>.<name> --rows N [--frames K] [--force] [--dry-run] [...the import options]
object template [--rows 2] [--frames 4] [--examples] [--out docs/dev/object-sheets]
```

- **A file** is the base image. **A folder** holds `base.png` (or `summer.png`) plus any of `spring`, `autumn`, `winter`,
  `night`, `lit` and `mask_lit` (`.png`), the folders `v1/`, `v2/` and so on (more variants, with the same names), `parts/<name>.png`
  (moving parts drawn on the same canvas) and `frames/*.png` (2 to 6 animation frames on the same canvas).
- **Every image**: the transparency is checked. A flat background is removed (and reported); an opaque, non-flat background
  is an error unless `--keep-bg` is given. All layers share one trim, so they stay registered. The result is scaled to `--size`
  in world units with the aspect kept (the default height is per category: a person 62, a building 260, a tree 300). It is
  stored at `--res` pixels per world unit (default 1), never upscaled, at most 1024 px a side. `--palette k` pulls each pixel
  a share k of the way to its nearest house-palette colour (Lab). The PNGs are re-encoded, so no metadata is carried over.
- **The manifest** (CSV with a header row) has the columns `id, file, category, size, anchor, kit, tags, parts, role, res`,
  plus `rows`, `frames` and `period` for sprite sheets (other columns, such as `subject`, are ignored).
  Files are relative to the folder; `kit` and `tags` take `;` lists; `parts` is a `;` list of `name=file|x,y|kind` (the pivot
  in world units from the anchor, optional; the kind defaults to sway, or use spin, bob, turn or flicker). A sheet row is
  imported like `object import-sheet` (its sheet lint is printed; a FAIL skips that row unless `--force`), any other row like
  `object import`. A failing row is reported and the others still import (exit code 1). `--dry-run` lints every sheet and
  reads every single image, writing nothing.
- **After the write**: `src/app/70-scene-lib-raster.js` is regenerated from every `meta.json`, then `object lint` and
  `object sheet` run on what was imported (`--no-sheet` skips the sheet).
- **Defaults by category**: people get the `silhouette` tag (the prompt asks for faceless figures). Buildings, trees,
  people, vehicles, structures, landmarks, street props and animals that stand bottom-centre get a ground shadow along the
  live sun. Trees, boats, landmarks and structures reflect in water (a building opts in with `--tags reflect`). A landmark is
  never mirrored (`flippable: false`).
- **WebP** is passed through unprocessed, with a warning: there is no WebP decoder here, so there is no trim, scale,
  transparency check or derivation, and it needs `--size`. Prefer PNG.

`object template` writes the blank labelled template, `PROMPT.md` (the prompt pack, from
`tools/lib/anim-templates/object-sheet-prompt.md`) and, with `--examples`, three filled example sheets drawn from the vector
library with the same grid:

- `building.terrace`: 2 variants, night and lit windows
- `tree.oak`: 2 variants, four real seasons
- `person.walker`: 1 variant, seasonal clothes, and 4 walk frames

## 4. The engine API (`src/app/70-scene-0raster.js`)

```js
sceneObjDefine({ id: 'building.cottage-ai', kind: 'raster', category: 'building', size: [174, 184], anchor: 'bottom-centre',
  images: { base, spring?, summer?, autumn?, winter?, night?, lit?, snow?, mask_lit? }   // asset keys; or an array, one per variant
  parts?: [{ name, image, box: [x, y, w, h], pivot: [x, y], anim: { kind: 'spin' | 'sway' | 'bob' | 'turn' | 'flicker', ... } }],
  frames?: { images: [key, ...] (2 to 6), period: 0.9 },
  tags, shadow, reflect, flippable, weight, means });
```

- An image value is an **asset key**: the path under `assets/objects/` (`building/cottage-ai/base.png`). The generated
  library file writes these calls from the `meta.json` files, so you never write them by hand.
- `sceneObjDefine` sees `kind: 'raster'` and turns the definition into an ordinary one (`sceneRasterPrep`). Its `build()`
  returns IMAGE SHAPES: `{ d: <the image rectangle>, img: { key, x, y, w, h, fx, night, mask, day } }`. Boxes, hooks, scatter,
  actors, the sprite cache keys, the SVG symbols and the compiled scene all work unchanged.
- **Parts**: `body` (the image for the season), one part per animation part, `f0` to `fN` (the frames) and `lit`. A still and
  a whole-object sprite draw `sceneObjShapes(...).still`: every part except `lit` and the frames.
- **Animation**: the parts use the existing cheap hooks (sway, spin, bob, turn, flicker) about their pivot. The frames use a
  new hook kind, `frames`: `sceneAnimPose` returns `alphas`, one per part, so exactly one frame shows at a time (walk-swap
  between 2 to 4 frames, or up to 6). Each frame is its own cached sprite, so a frame costs one draw, like any moving part.
- `sceneRasterKeys(id)`, `sceneRasterUrl(key)`, `sceneRasterSource(fn)` (the Node tools install a file reader),
  `sceneRasterPick(img, L)`, `sceneRasterFit(col)`, `sceneRasterMatrix(col, fx)`, `sceneRasterApply(M, px)`,
  `sceneRasterFilter(M)`, `SCENE_RASTER_FX`, `SCENE_RASTER_BUDGET`, `SCENE_RASTER_ANCHORS`.

**Renderers.**

- **Canvas** (`78-scene-canvas.js`): `sceneRasterImage(key)` decodes an embedded image the first time a scene draws it
  (`img.decode()`, off the main thread). The sprite bake draws each image ONCE per sprite: at device size into a scratch
  canvas, its pixels through the colour matrix (the season derivation, then the fitted light grade), `mask_lit` applied as
  alpha. The sprite key `(object, variant, part, season, haze, tint, scale bucket, light key)` caches the result, so an
  image is rescaled once per size bucket and never per frame. While an image is still decoding, its sprite is not cached;
  the renderer reports `r.waiting`, bakes again when every pending image is ready (`sceneRasterWhenReady`, at most 4 tries),
  and `sceneHostReady` waits for that.
- **SVG fallback** (`70-scene-svg.js`): each image is put in the `<defs>` once per render as `<image href="data:...">` and
  placed with `<use>`. The grade and the season derivation become ONE `feColorMatrix` filter (shared by every use with the
  same matrix), and `mask_lit` becomes a luminance mask.
- **The live-sky grade** applies to raster objects as it does to vector ones. `sceneColour` (tint, haze, the grade) is affine
  per channel up to the clamp, so `sceneRasterFit` fits it exactly to a 3 x 4 matrix from four probe colours (the tests
  check it against `sceneColour` within 3 levels). A real night image is drawn without the light's darkening (it is already
  a night picture), but with haze and tint.

## 5. The derivations (only where an image is missing)

| missing | derived from | how |
|---|---|---|
| spring | the base | `SCENE_RASTER_FX.spring`: slightly fresher, yellow-green |
| autumn | the base | `SCENE_RASTER_FX.autumn`: R + 0.75 (G - B), so greens turn ochre and rust while greys stay grey |
| winter | the base | `SCENE_RASTER_FX.winter`: 45 % toward the luminance, cooler and a little lighter; plus a SNOW CAP image made at import (`snowCap`: a white band under every near-level top edge such as roofs, ledges and branches; not for people, vehicles, birds, animals, boats, water or sky) |
| night | the base | after real dusk (`L.dark >= 0.5`) the night image is drawn when there is one; otherwise the live grade darkens, desaturates and cools the base exactly like a vector object |
| lit | sheet cells, a mask, or detection | lit windows show from `L.windows`. In order of preference: the sheet's lit cell minus its night cell (`litFromPair`); a folder's `lit.png`; `mask_lit` over a warm copy of the base; or, for buildings, vehicles, boats, structures, landmarks and rail, AUTO-DETECTED windows (`litWindows`: blobs darker or lighter than the wall around them, after an erosion that removes mortar and board lines; small, rectangular, not in the object's bottom band of wheels, hulls and flower beds, not foliage-green; a seeded 75 % of them lit warm) |

`meta.json` records what was derived (`derived: { lit: 'auto (19 windows)', snow: 'auto', seasons: ['spring', 'autumn', 'winter'] }`).

## 6. Storage, embedding and install size

```
assets/objects/<category>/<name>/      one folder per raster object (the id is <category>.<name>)
    meta.json                          size, anchor, res, variants (file names), parts, frames, tags, derived, provenance, bytes, means
    base.png [spring|winter|...|night|lit|snow|mask_lit].png   variant 0; v1/, v2/ ... the other variants
    parts/*.png                        animation parts (parts/<name>.png) and frames (parts/f0.png ...)
src/app/70-scene-lib-raster.js         GENERATED from the metas (never edit it; a test checks it is in step)
```

**The choice: embedded in the page, decoded lazily.**

- `build.mjs` embeds every referenced image in `index.html` as a base64 block inside a non-running
  `<script type="application/octet-stream" data-scene-raster="<key>">` element, placed before the app script.
- Why embed:
  - The server serves only `index.html` and `/sw.js` statically (a hard rule in CLAUDE.md), so a static
    `/assets/objects/` route would weaken a safeguard.
  - Every pack must stay installed and work offline (travel), which an on-demand download would break.
- Why it does not slow the first load:
  - The HTML parser copies these blocks as text; nothing is parsed as script and nothing is decoded.
  - An image becomes a `data:` URL and is decoded (`img.decode()`) only when a scene first draws that object.
  - Scenes that use no raster object pay nothing but the bytes.
- Node tools read the files directly (`installRasterSource`, `sceneRasterSource`). The scene page harness embeds the same
  blocks as the app.

**Budgets** (`SCENE_RASTER_BUDGET`, enforced by `object lint` and the tests):

| what | warn | fail |
|---|---|---|
| one image | 96 KB | 256 KB |
| one object (all its files) | 192 KB | 512 KB |
| the whole raster library | 2 MB | 6 MB |
| an image side | | 1024 px |
| density | outside 0.5 to 3 px per world unit (a warning) | |

**Install-size note.** The page carries the files as base64, which is 4/3 of their size. The seven demo objects are 38
files and 224 KB (299 KB in the page), against a built `index.html` of about 13.5 MB. A typical imported object at
`--res 1` is 10 to 70 KB. The 6 MB library ceiling would add 8 MB to the page, so keep to the objects that scenes really
use. The SVG still of a scene that uses raster objects carries their images as `data:` URLs, so a raster-heavy scene can
exceed the 150 KB tile budget of the SVG fallback (the demo's tile is about 265 KB, a documented waiver in `tools/anim-quality.json`). The canvas host is the normal path; the
SVG still is only the fallback.

## 7. The lint for raster objects (`tools/lib/raster-lint.mjs`, run by `object lint`)

- **FAIL**:
  - identity (`<category>.<name>`, a known category) and unique (one meta per id)
  - size: 4 to 2000 units
  - files: every image is present and decodes
  - transparency: the base has a transparent background (at least 2 %)
  - bytes: per image and per object, as in the budget table
  - pixels: at most 1024 px a side
  - anim: every hook's part exists and its pivot is inside the box
  - frames: 2 to 6
  - tags: a `kit:` and exactly one `role:`; for a landmark, `landmark`, `place:<region>/<key>` and `flippable: false`
- **WARN** (never a fail):
  - bytes over the warn budgets
  - density outside 0.5 to 3 px per unit
  - palette: under 35 % of the pixels are near the house palette (the commonest vector colours, Lab dE 14); fix it with
    `--palette 0.3`
  - text: lettering-like rows of glyph-shaped marks, checked one polarity at a time. A run of identical marks at an even
    pitch is architecture (windows, railings), not text.
  - night: a lit category with no lit part and no night image (tag it `unlit`)
  - webp: passed through unprocessed

Raster objects count as four-season objects in the composed scene lint (they have real or derived seasons).

## 8. The demo

Make it with `node tools/object-import-demo.mjs --import`, which does two things:

1. It renders five vector objects to PNG with headless Chrome into `docs/dev/object-import-demo/source/`. These stand in
   for AI images, and each one exercises a different path:

   | object | what it exercises |
   |---|---|
   | `building.cottage-ai` | a flat #00ff00 background (removed); auto-lit windows; derived seasons and snow |
   | `tree.cherry-ai` | a folder with REAL spring, summer, autumn and winter images |
   | `building.windmill-ai` | a sails PART from the manifest's parts column, spinning about its centre |
   | `vehicle.bus-ai` | a transparent PNG; auto-lit windows |
   | `boat.narrowboat-ai` | a REAL night image and a lit overlay |

2. It writes ONE `manifest.csv` with those five rows plus two sprite-sheet rows (`rows` and `frames` set) that point at the
   prompt pack's example sheets, and imports all seven with one `object import-batch`, exactly as a folder of AI answers
   would be imported:
   - `building.terrace-ai`: 2 variants, with real night and lit columns
   - `person.walker-ai`: real seasonal clothes and 4 walk frames

The composed scene is `src/app/71-scene-raster-demo-0.js`, pack `raster-demo` (`72-anim-pack-raster-demo.js`). It shows a
village by a canal built from the seven raster objects, mixed with vector ground cover, water and birds. It is in the
gallery but never in the daily rotation. Render it with:

- `node tools/anim-pack.mjs scene sheet --pack raster-demo --times` (dawn, noon, golden hour, dusk and night)
- `node tools/anim-pack.mjs object sheet building.terrace-ai --mode night`

It passes the composed lint like a real scene (the windmill is tagged `signature`; lamps, tint rules, two flocks), with
one documented waiver: its SVG still is over the tile budget because it carries the images (section 6).

## 9. Files

| file | what |
|---|---|
| `src/app/70-scene-0raster.js` | the engine side: definitions, keys, bytes, colour matrices, derivations (pure) |
| `src/app/70-scene-lib-raster.js` | GENERATED: one `sceneObjDefine` per `assets/objects/*/*/meta.json` |
| `src/app/78-scene-canvas.js` | lazy decoding (`sceneRasterImage`, `sceneRasterWhenReady`), `_sccRasterDraw`, the re-bake on decode |
| `src/app/70-scene-svg.js` | `_scImgSvg` (the SVG still), the `frames` pose, `_scStillParts` |
| `build.mjs` | embeds the images (`rasterAssetBlocks`) |
| `tools/lib/png.mjs` | the PNG decoder and encoder (node:zlib only) |
| `tools/lib/raster-image.mjs` | image operations: background removal, trim, resize, palette, lit windows, snow cap, text score |
| `tools/lib/sprite-sheet.mjs` | the template, the slicer, the aligner, the sheet lint |
| `tools/lib/object-import.mjs` | `object import`, `import-batch`, `import-sheet` and `template` |
| `tools/lib/raster-assets.mjs` | storage, embedding, the generated library file |
| `tools/lib/raster-lint.mjs` | the object lint for raster objects |
| `tools/lib/anim-templates/object-sheet-prompt.md` | the prompt pack template |
| `docs/dev/object-sheets/` | the blank template, the three example sheets, `PROMPT.md` |
| `tools/object-import-demo.mjs`, `docs/dev/object-import-demo/source/` | the demo's stand-in source images and manifest |
| `tests/raster-objects.test.mjs` | PNG codec, image operations, slicing and the sheet lint, the import, the engine, the cache keys, the SVG still, page safety, the canvas in Chrome |
