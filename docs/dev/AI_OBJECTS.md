# Growing the object library with AI image tools (Gemini, ChatGPT -> Claude)

User request, 8 Oct: "make the infrastructure for this, then pass a prompt or tool to Gemini or ChatGPT to expand the library
of objects, and then use Claude to put it all together". This page is the prompt pack and the workflow. The machinery it
relies on (the sprite-sheet template, the slicer, the importer, the lint, storage and budgets) is in
[OBJECT_IMPORT.md](OBJECT_IMPORT.md); the object library itself is SCENE_ENGINE.md section 2.

- **Paste-ready prompts**: `tools/lib/anim-templates/ai-object-prompt.md` (the style block, the technical block, the master
  prompts, the variant prompts and the batch prompt). This page explains them.
- **Reference images to attach**: `docs/dev/object-sheets/` (the blank template and three filled example sheets).
- The user accepts the AI's likeness for landmarks, so nothing gates on accuracy. The import gates on STRUCTURE (the grid,
  transparency, budgets) and warns on consistency, palette and text.

Contents: 1 the house style, 2 the technical rules, 3 the prompts, 4 batches and the manifest, 5 the Claude side.

## 1. The house style

Derived from the vector library (`node tools/anim-pack.mjs object sheet <id>` on `building.oast-house`,
`vehicle.bus-double-decker`, `street.station-entrance`, `building.terrace`, `person.walker`, `tree.oak`; the palette is
`housePalette()` in `tools/lib/raster-lint.mjs`, the commonest colours of the vector objects).

| aspect | the rule |
|---|---|
| technique | flat vector illustration: solid fills with crisp edges, at most a soft two-tone or a gentle vertical gradient per surface |
| outline | none: edges come from colour contrast. Thin dark lines only for genuinely thin things (railings, ironwork, glazing bars, wires) |
| shading | soft; light from the UPPER LEFT. Left and top faces slightly lighter, right faces and undersides 10 to 20 % darker; no hard cast shadows |
| views | buildings and landmarks: a straight front elevation (a slight three-quarter at most, roof slopes visible). Vehicles, trains and boats: a pure side profile facing RIGHT. People and animals: side or three-quarter, facing RIGHT. Trees and plants: straight on. Eye level, no perspective distortion |
| proportions | real-world. People are slim, about 7 heads tall and FACELESS (plain head, hair, no features; the importer tags people `silhouette`). Default heights in world units: person 62, vehicle 60, building 260, tree 300, landmark 380, street prop 110 |
| detail | moderate, readable at 0.4x (about 60 px tall): windows as framed rectangles, brick as a few faint courses, foliage as 3 to 6 rounded clumps with lighter tops |
| seasons | spring fresh light greens and blossom; summer the master; autumn orange, rust and brown foliage; winter bare or dark foliage with a thin snow line on top edges |
| night | lights off: the whole object dark navy-grey (#1a1823 to #2d334d), low contrast. Lit at dusk: the same with warm windows #ffd98a (some #ffe6b0, about a quarter left dark), lamps and headlights |

**The palette** (hex; the importer's palette lint measures the share of pixels within Lab dE 14 of these and
`--palette 0.3` pulls an image toward them):

| family | colours |
|---|---|
| stone, render, paper | #e8e4dc #d8d2c4 #ece4d0 #f8f4ec #aaa496 #8a8478 |
| slate, steel, roads | #666563 #5a5a5e #3a3e44 #1e2226 |
| brick, timber, earth | #845642 #7a5434 #6a5a48 #5a4a3a #5a3a2a #c04a2a #b8823a #8f7656 |
| foliage | #2f6a2c #4f8a3a #5a8a3a #7ab04a #2e5a3e #3e4a38 #56604a |
| glass, sky tints, snow | #3a4a5a #5a7088 #c8ccd0 #d8e0e8 #f2f6fa #f4f6f8 |
| accents | #ff4a3a (bus and post-box red) #d8405a #f4a0c0 (blossom) #f4d23a #e8b040 #d8782a (autumn) #5a3a5e |
| skin | #f2cdb0 #e2b08c #c98f68 #91674b #604532 |
| near-black | #141012 #2a2420 #1e1814 |
| lights | #ffd98a #ffd890 #ffe6b0 |

**Avoid**: text, letters, numbers (blank sign panels, clock faces without numerals); logos, brand names and company liveries
(a generic red bus or a purple-striped train is fine, a named operator's livery is not); flags; watermarks and signatures;
photographic texture, grain, painterly brushwork or a 3D-render look; drop shadows, ground, grass strips, reflections, sky and
scenery (the engine adds the ground shadow and the water reflection live); glows in daylight images; bright magenta or pure
green inside the object (they are the background keys).

## 2. The technical rules

| what | rule | why |
|---|---|---|
| background | transparent PNG if the tool offers it (ChatGPT can); else ONE perfectly flat #FF00FF magenta; #00FF00 green if the object has pink, purple or magenta | magenta and green are chroma keys, removed everywhere and despilled; any other flat colour is removed only by flood fill from the edges, and a non-flat opaque background is an error |
| content | one object, centred, nothing else | the importer trims to the object's bounding box |
| sheet size | 1840 px wide; 344 tall for 1 row, 632 for 2 rows (or 1 row + frames), 920 for 3 rows (or 2 rows + frames). Cells 256, gutters 32, margins top 56 / left 112 / right 32 / bottom 32 | `sheetSize()` in `tools/lib/sprite-sheet.mjs`; the slicer tolerates a resized or slightly misaligned answer |
| single image | square 1024 x 1024, object about 80 % of the height, standing 40 px above the bottom | stored at about 1 px per world unit, never upscaled, at most 1024 px a side |
| anchor | bottom-centre: where the object meets the ground, identical in every version | all layers of an object share ONE trim box, so a moved edit is misaligned |
| format | PNG (8-bit RGBA or RGB). WebP is passed through unprocessed, so avoid it | |
| naming | sheets: `<id>.png`; single objects: a folder `<id>/` with `base.png` (or `summer.png`) plus any of `spring`, `autumn`, `winter`, `night`, `lit`, `mask_lit` `.png`, `v1/`, `v2/` (more variants), `parts/<name>.png`, `frames/*.png` | ids are `<category>.<name>`, lower-case with hyphens; the category is one of tree plant ground rock water bird animal person vehicle boat building street rail structure prop sky landmark |
| budget | about 10 to 70 KB per object after import, warn at 192 KB, fail at 512 KB; the whole raster library warns at 2 MB | every image is embedded in the page (OBJECT_IMPORT.md section 6) |

## 3. The prompts

All of them are in `tools/lib/anim-templates/ai-object-prompt.md`, ready to paste. In short:

1. **The style block** (always first): section 1 of this page as instructions, with the palette and the "never" list.
2. **The technical block** (single images only): section 2 as instructions.
3. **Master prompt A, the sprite sheet** (preferred: one image gives every season, night, lit and the frames). Attach
   `template-2x6-f4.png` (or `object template --rows N --frames K` for another shape) and the three `example-*.png` sheets.
   Placeholders: `{{SUBJECT}}`, `{{DETAILS}}`, `{{W}} x {{H}}`, `{{ROWS}}`, the variant ideas per row, and the frames line.
4. **Master prompt B, a single summer image**: `{{SUBJECT}}`, `{{DETAILS}}`, `{{VIEW}}`, real proportions.
5. **Variant prompts** (route B; always in the tool's image-EDIT mode on the master, so the canvas does not move):
   night with lights off, lit at dusk (windows #ffd98a), winter (thin snow line on top edges), spring and autumn, a separate
   moving part (the object without the part plus the part alone on the same canvas: windmill sails and mill wheels `spin`, a
   tram pantograph `bob`, a crane jib `turn`, a lamp `flicker`, reeds `sway`), and walking-person frames A and B (left leg
   forward, right leg forward; same head height and baseline).

Tips that matter:

- ChatGPT: ask for "a transparent background" for single images; for sheets ask for magenta (transparency on a big grid is
  less reliable). Gemini: always magenta.
- Fix a bad cell by asking for "only the {{column}} cell of row {{n}}, redrawn at exactly the same position and size", not a
  whole new sheet.
- Skipped seasons are derived (colour matrices and a snow cap), a missing night uses the live grade, and a missing lit column
  auto-detects windows, so a summer-only answer still imports. Real seasons look much better on trees and plants.

## 4. Batches and the manifest

**Asking for a list.** Image tools make one image per turn, so batch by conversation, not by image:

1. Start one conversation per family (London stations, Hampshire, the North). Attach the references once, paste the style
   block, then the batch prompt with a numbered list (section 5 of the prompt file).
2. The tool makes item 1; reply "next" for each further item. Every 8 to 10 images, paste the style block again (long chats
   drift).
3. Download each answer as `<id>.png` (sheets) or into `<id>/` (single-image folders) inside ONE folder, for example
   `<folder>/london-stations/`, and write `manifest.csv` there.

**`manifest.csv`** (read by `object import-batch`; header row required; columns in any order; unknown columns are ignored):

| column | meaning |
|---|---|
| `id` | `<category>.<name>` |
| `file` | the PNG or the folder, relative to the manifest's folder |
| `category` | optional (the id's prefix) |
| `size` | world units: `WxH`, `xH` (height only, the usual) or `Wx` |
| `anchor` | `bottom-centre` (default), `centre`, `bottom-left`, `bottom-right`, `top-centre` |
| `kit` | `;` list from SCENE_KITS: temperate urban london towers people vehicles boats birds animals water ... |
| `tags` | `;` list. A landmark needs `landmark;place:<region>/<key>` (it is never mirrored) |
| `parts` | `;` list of `name=file|x,y|kind`; the pivot is in world units from the anchor (y up is negative) and optional (spin, bob and turn default to the part's centre, sway to its bottom-centre); kind is sway, spin, bob, turn or flicker |
| `role` | one of SCENE_ROLES: tree shrub ground edge rock building-far building-mid building-near street walker vehicle boat bird animal (a landmark needs none) |
| `res` | pixels per world unit, default 1 |
| `rows`, `frames` | **sprite sheets**: the number of variant rows and of frames (0 = no frames row). A row with `rows` set (or `frames` above 0 on a PNG file) is sliced, aligned and linted as `object import-sheet` would; a row without them is a single image or folder (`object import`). Sheets and singles share ONE manifest |
| `period` | optional: the frames animation's period in seconds (default 0.9) |
| `subject` | the description for the AI prompt (ignored by the importer) |

**An example: 40 suggested objects** (London stations, Hampshire, the North). Rows with `rows` are sprite sheets; the rest
are folders with moving parts. Place keys are suggestions; check them against the region's pack before release.

```csv
id,file,category,size,anchor,kit,tags,parts,role,res,rows,frames,subject
landmark.kings-cross,landmark.kings-cross.png,landmark,x300,bottom-centre,london,landmark;place:uk/kings-cross;uk;london;station,,,1,1,0,"King's Cross station front: twin yellow-brick arches and the central clock tower, blank clock faces"
landmark.st-pancras,landmark.st-pancras.png,landmark,x420,bottom-centre,london,landmark;place:uk/st-pancras;uk;london;station;gothic,,,1,1,0,"St Pancras: red-brick Gothic hotel front with the tall clock tower and pointed spires"
landmark.paddington,landmark.paddington.png,landmark,x220,bottom-centre,london,landmark;place:uk/paddington;uk;london;station,,,1,1,0,"Paddington: the three wrought-iron and glass train-shed arches seen end on"
landmark.battersea-power-station,landmark.battersea-power-station.png,landmark,x400,bottom-centre,london,landmark;place:uk/battersea;uk;london,,,1,1,0,"Battersea Power Station: brick block with four white fluted chimneys"
building.tube-oxblood,building.tube-oxblood.png,building,x170,bottom-centre,london;urban,uk;london;station,,building-mid,1,2,0,"Edwardian Underground station: two-storey ox-blood glazed terracotta front with big semicircular first-floor windows; row 2 a corner version"
building.station-booking-hall,building.station-booking-hall.png,building,x200,bottom-centre,london;urban,uk;london;station,,building-mid,1,2,0,"Victorian suburban station booking hall: yellow stock brick, slate roof, round-headed windows, a glazed canopy"
building.arches-shops,building.arches-shops.png,building,x180,bottom-centre,london;urban,uk;london;railway,,building-near,1,2,0,"railway viaduct brick arches with small shopfronts and cafes under them, blank fascia boards"
building.signal-box,building.signal-box.png,building,x150,bottom-centre,london;temperate,uk;railway,,building-mid,1,2,0,"Victorian railway signal box: brick base, timber upper floor with a band of windows, slate roof"
street.k6-phone-box,street.k6-phone-box.png,street,x95,bottom-centre,london;urban,uk;london,,street,1,1,0,"red K6 telephone box with a domed roof, crown and lettering left blank"
street.pillar-box,street.pillar-box.png,street,x60,bottom-centre,london;urban;temperate,uk;london,,street,1,2,0,"red cylindrical post box with a black base; row 2 a lamp-post wall box"
street.news-kiosk,street.news-kiosk.png,street,x110,bottom-centre,london;urban,uk;london,,street,1,1,0,"small green station newspaper kiosk with a striped awning and blank boards"
street.cycle-hire-dock,street.cycle-hire-dock.png,street,x60,bottom-centre,london;urban,uk;london,,street,1,1,0,"a row of five generic grey hire bicycles at a docking rail, no branding"
street.platform-bench,street.platform-bench.png,street,x45,bottom-centre,london;urban;temperate,uk;railway,,street,1,2,0,"Victorian cast-iron and timber platform bench"
person.commuter-umbrella,person.commuter-umbrella.png,person,x62,bottom-centre,people;london;urban,uk,,walker,1,1,4,"commuter in a dark coat walking with a black umbrella; frames: a 4-pose walk cycle"
person.traveller-suitcase,person.traveller-suitcase.png,person,x62,bottom-centre,people;london;urban,uk,,walker,1,1,4,"traveller pulling a wheeled suitcase; frames: a 4-pose walk cycle"
person.station-staff,person.station-staff.png,person,x62,bottom-centre,people;london;urban,uk,,walker,1,1,2,"station staff member in a high-visibility orange vest, frames A and B: a slow walk"
vehicle.delivery-van,vehicle.delivery-van.png,vehicle,x55,bottom-centre,vehicles;london;urban,uk,,vehicle,1,2,0,"white unbranded delivery van, side view facing right; row 2 a dark green one"
rail.train-commuter-electric,rail.train-commuter-electric.png,rail,x60,bottom-centre,london;vehicles,uk;railway,,vehicle,1,2,0,"modern electric commuter train car, side profile, generic white and grey with a coloured door band, no logos"
building.flint-cottage,building.flint-cottage.png,building,x170,bottom-centre,temperate,uk;hampshire;village,,building-mid,1,2,0,"Hampshire flint-and-brick cottage with brick quoins, tiled roof, small casement windows; row 2 a semi-detached pair"
building.thatched-cottage-long,building.thatched-cottage-long.png,building,x175,bottom-centre,temperate,uk;hampshire;village;thatch,,building-mid,1,2,0,"long whitewashed cottage under a thick rounded thatch with eyebrow dormers"
building.watermill,building.watermill,building,x230,bottom-centre,temperate;water,uk;hampshire;mill,wheel=building.watermill/wheel.png|spin,building-mid,1,,,"brick watermill on a chalk stream with a timber undershot wheel (the wheel as a separate part)"
building.village-pub,building.village-pub.png,building,x190,bottom-centre,temperate,uk;village;pub,,building-mid,1,2,0,"half-timbered village pub with hanging baskets and a blank swinging sign"
building.barn-timber,building.barn-timber.png,building,x200,bottom-centre,temperate,uk;farm,,building-far,1,2,0,"black weatherboarded timber barn on a brick plinth with a clay-tile roof"
landmark.winchester-cathedral,landmark.winchester-cathedral.png,landmark,x360,bottom-centre,temperate,landmark;place:uk/winchester;uk;hampshire;cathedral,,,1,1,0,"Winchester Cathedral: long Norman nave and the squat central tower, grey stone"
landmark.spinnaker-tower,landmark.spinnaker-tower.png,landmark,x520,bottom-centre,temperate;water,landmark;place:uk/portsmouth;uk;hampshire;tower,,,1,1,0,"Spinnaker Tower: white sail-shaped steel tower with the viewing decks near the top"
landmark.hms-victory,landmark.hms-victory.png,landmark,x300,bottom-centre,water;boats,landmark;place:uk/portsmouth;uk;hampshire;ship,,,1,1,0,"HMS Victory: three-masted wooden warship, black and ochre hull, bare rigging, no flags"
boat.solent-yacht,boat.solent-yacht,boat,x140,bottom-centre,boats;water,uk;sailing,,boat,1,,,"white sailing yacht with a single mast and sail (the sail as a separate part that sways)"
tree.beech,tree.beech.png,tree,x300,bottom-centre,temperate,uk;deciduous,,tree,1,2,0,"New Forest beech tree with a smooth grey trunk; row 2 a younger, narrower one"
tree.yew-churchyard,tree.yew-churchyard.png,tree,x220,bottom-centre,temperate,uk;evergreen,,tree,1,1,0,"ancient churchyard yew, dark evergreen, broad and low, red-brown trunk"
animal.donkey,animal.donkey.png,animal,x42,bottom-centre,animals;temperate,uk,,animal,1,1,2,"grey-brown donkey grazing, side view facing right; frames A and B: head down and head up"
landmark.angel-of-the-north,landmark.angel-of-the-north.png,landmark,x400,bottom-centre,temperate,landmark;place:uk/gateshead;uk;north-east;sculpture,,,1,1,0,"Angel of the North: rust-brown steel figure with straight wide wings, seen from the front"
landmark.tyne-bridge,landmark.tyne-bridge.png,landmark,x260,bottom-centre,urban;water,landmark;place:uk/newcastle;uk;north-east;bridge,,,1,1,0,"Tyne Bridge: green steel through-arch bridge with stone towers at each end"
landmark.blackpool-tower,landmark.blackpool-tower.png,landmark,x520,bottom-centre,urban,landmark;place:uk/blackpool;uk;north-west;tower,,,1,1,0,"Blackpool Tower: red-brown lattice steel tower on a brick building"
landmark.ribblehead-viaduct,landmark.ribblehead-viaduct.png,landmark,x200,bottom-centre,temperate,landmark;place:uk/ribblehead;uk;yorkshire;viaduct,,,1,1,0,"Ribblehead Viaduct: long grey stone railway viaduct of tall round arches"
landmark.york-minster,landmark.york-minster.png,landmark,x400,bottom-centre,temperate;urban,landmark;place:uk/york;uk;yorkshire;cathedral,,,1,1,0,"York Minster: pale limestone Gothic west front with two towers and a great window"
building.mill-chimney,building.mill-chimney.png,building,x380,bottom-centre,urban;temperate,uk;north;industrial,,building-far,1,2,0,"Victorian textile mill: five-storey red-brick block with rows of windows and a tall square chimney"
building.back-to-back,building.back-to-back.png,building,x170,bottom-centre,urban;temperate,uk;north;terrace,,building-mid,1,2,0,"northern back-to-back terrace in dark red brick with slate roofs and chimney pots; row 2 in sandstone"
building.dales-barn,building.dales-barn.png,building,x150,bottom-centre,temperate,uk;yorkshire;farm,,building-far,1,1,0,"Yorkshire Dales stone field barn with a stone-slab roof"
structure.lime-kiln,structure.lime-kiln.png,structure,x120,bottom-centre,temperate,uk;north;industrial,,building-far,1,1,0,"old stone lime kiln with an arched draw hole"
person.fell-walker,person.fell-walker.png,person,x62,bottom-centre,people;temperate,uk;hiking,,walker,1,1,4,"fell walker with a rucksack and walking poles; frames: a 4-pose walk cycle"
```

The two folder rows need these files: `building.watermill/base.png` (the mill without its wheel) and
`building.watermill/wheel.png`; `boat.solent-yacht/base.png` (the hull and mast) and `boat.solent-yacht/parts/sail.png` (a
folder part with no manifest entry sways).

## 5. The Claude side

**The steps** (from the repository root):

1. Drop the files into one folder outside the repository (sheets as `<id>.png`, single objects as `<id>/` folders), with
   `manifest.csv`.
2. Check, then import everything in one go (sprite sheets and single images from the same manifest):
   ```
   node tools/anim-pack.mjs object import-batch <folder> --dry-run
   node tools/anim-pack.mjs object import-batch <folder>
   ```
   `--dry-run` slices and lints every sheet and reads every single image, writing nothing. A row that fails (a sheet FAIL,
   a missing file) is reported and the others still import (exit code 1); `--force` imports sheets in spite of their FAILs.
   One object on its own: `object import-sheet <folder>/<id>.png --id <id> --rows <rows> [--frames <frames>] --kit <kit,kit>`
   (the manifest's `;` lists become `,` lists on the command line).
3. Review: read the printed `cells xxxxxx` line, every FAIL and WARN (missing, size, position, shape, palette, text), then
   look at each `object sheet` PNG in light and in night (`node tools/anim-pack.mjs object sheet <id> --mode night`). Fix a
   FAIL by asking the AI for that one cell again; a palette WARN with `--palette 0.3`; then re-import (it replaces the
   object's folder).
4. Use them in scenes: they carry `kit:` and `role:` tags, so archetypes and `scatter` pick them up automatically; place
   landmarks and specific objects by id (`place`, `actors`; SCENE_ENGINE.md sections 3 and 8). Then
   `scene lint`, `scene sheet --times`, `scene perf` as for any composed scene (the animation-pack skill's gates).
5. `node build.mjs`, `npm test` (a test checks that the generated `src/app/70-scene-lib-raster.js` matches the metas), and
   check the install-size budget (OBJECT_IMPORT.md section 6).

**The short prompt for Claude Code:**

```
Import the new AI objects in <folder> and use them in <area> scenes.
```

Claude then: reads `<folder>/manifest.csv`; runs `object import-batch <folder>` (sheets and singles together); reports each
object's lint (and asks the AI-side fixes it needs as one list of "redraw cell X of <id>" lines); looks at every object sheet
in light and night; and adds or upgrades the `<area>` scenes with the new objects through the
animation-pack skill (study, lint with no waiver, light and night renders, rubric, review).
