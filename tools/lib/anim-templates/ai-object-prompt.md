# OpenDash AI object prompts (Gemini, ChatGPT): paste-ready

The full guide, with the reasons behind these rules, is docs/dev/AI_OBJECTS.md. The sprite-sheet layout and the importer are in
docs/dev/OBJECT_IMPORT.md. Replace every `{{...}}` before pasting. Attach the reference images named in each prompt.

Two routes, one style:

- **A. Sprite sheet (preferred): ONE image per object** with every season, night, lit and the animation frames. Attach
  `docs/dev/object-sheets/template-2x6-f4.png` (or the template for your row count: `node tools/anim-pack.mjs object template
  --rows N --frames K`) and the three `example-*.png` sheets. Import with `object import-sheet`.
- **B. Single images**: one summer image, then edits of it (night, lit, winter, moving parts) on the same canvas. Import a
  folder or a manifest row with `object import` / `object import-batch`.

---

## 1. House style block (paste at the top of every conversation)

```
You are drawing objects for a calm, flat-vector illustrated dashboard. Match this house style exactly in every image:

STYLE
- Flat vector illustration: clean geometric shapes with crisp edges, solid fills, at most a soft two-tone or gentle vertical
  gradient per surface. No outlines around shapes (edges come from colour contrast); thin dark lines only for genuinely thin
  things (railings, ironwork, wires, window glazing bars).
- Soft shading: light from the UPPER LEFT. Left and top faces a touch lighter, right faces and undersides 10 to 20 % darker.
  No hard cast shadows, no ambient-occlusion smudges.
- Muted, slightly warm, natural palette. Use these colours wherever they fit:
  stone and render #e8e4dc #d8d2c4 #ece4d0 #f8f4ec #aaa496 #8a8478; slate and steel #666563 #5a5a5e #3a3e44 #1e2226;
  brick and wood #845642 #7a5434 #6a5a48 #5a4a3a #5a3a2a #c04a2a #b8823a #8f7656; foliage #2f6a2c #4f8a3a #5a8a3a #7ab04a
  #2e5a3e #3e4a38 #56604a; glass #3a4a5a #5a7088 #c8ccd0 #d8e0e8; accents #ff4a3a #d8405a #f4a0c0 #f4d23a #e8b040 #d8782a;
  skin #f2cdb0 #e2b08c #c98f68 #91674b #604532; near-black #141012 #2a2420.
- Moderate detail that still reads when the object is 60 px tall: windows as simple framed rectangles, brick or stone as a few
  faint courses, foliage as 3 to 6 rounded clumps with lighter tops. No tiny clutter.
- Views: buildings and landmarks in a straight front elevation (a slight three-quarter view at most, roof slopes visible);
  vehicles, trains and boats in a pure side profile facing RIGHT; people and animals in side or three-quarter profile facing
  RIGHT; trees and plants straight on. Eye level, no perspective distortion, no bird's-eye view.
- Real-world proportions. People are slim, about 7 heads tall, FACELESS (a plain skin-coloured head with hair, no eyes, nose
  or mouth).

NEVER
- No text, letters, numbers, signs with words, clock numerals, logos, brand names, company liveries, flags, watermarks or
  signatures. Signs and boards are blank colour panels.
- No photographic texture, noise, grain, painterly brushwork, 3D render look, lens effects or glow halos in daylight images.
- No drop shadow, no ground, no grass strip, no floor line, no reflection, no sky, no scenery, no frame, no border.
- Never use bright magenta or pure green inside the object (they are the background key).
```

## 2. Technical block (paste after the style block for route B, single images)

```
TECHNICAL
- One single object, centred, nothing else in the image.
- Background: fully transparent if you can produce a transparent PNG; otherwise one perfectly flat pure magenta #FF00FF
  (use pure green #00FF00 instead if the object itself has pink, purple or magenta in it). No gradient, no vignette.
- Square canvas, 1024 x 1024 px. The object stands on an invisible baseline 40 px above the bottom edge, centred left to
  right, filling about 80 % of the height (wide objects: about 85 % of the width). Nothing touches or crosses an edge.
- The bottom-centre of the object (where it meets the ground) is the anchor: keep it at the same point in every version.
- PNG output.
```

---

## 3. Master prompts

### 3A. Sprite sheet (route A: one image per object)

Attach the template and the three example sheets, then paste the style block and this:

```
Make ONE image: a sprite sheet of {{SUBJECT}} ({{DETAILS: materials, colours, era, distinctive features}}), in exactly the
layout of the attached blank template and finished like the attached example sheets (copy their layout and finish, not
their subjects).

THE GRID, EXACTLY
- The whole image is {{W}} x {{H}} px (1 row: 1840 x 344; 2 rows, or 1 row + frames: 1840 x 632; 3 rows, or 2 rows +
  frames: 1840 x 920).
  If you cannot make that size, keep the proportions; the grid must stay regular.
- Flat pure magenta #FF00FF background everywhere (or full transparency). No gradient, floor, sky or scenery.
- Cells 256 x 256 px, 32 px empty gutters; the first cell starts 112 px from the left and 56 px from the top.
- 6 columns, left to right: SPRING, SUMMER, AUTUMN, WINTER, NIGHT, LIT AT DUSK.
- {{ROWS}} row(s), one per VARIANT (the same kind of object with a different design: {{VARIANT IDEAS, e.g. "row 1 red brick,
  row 2 yellow stock brick with a bay window"}}).
- {{FRAMES LINE: either "A last row of {{K}} animation frames from the left: the SUMMER look of row 1 in the poses of one loop
  ({{LOOP, e.g. a walk cycle: contact, passing, contact (other leg), passing}}), the rest of that row empty." or "No frames
  row."}}

IN EVERY CELL
- One object, identical in design, size, position and viewpoint across its row; only season, light and lamps change.
- Standing on an invisible baseline 16 px above the cell's bottom, centred, about 80 % of the cell's height. Nothing crosses
  a gutter.
- SPRING fresh light greens and blossom; SUMMER the master look; AUTUMN warm orange and brown foliage (#d8782a #b8823a);
  WINTER bare or dark foliage and a thin line of snow on roofs, ledges and branches.
- NIGHT: lights OFF, the whole object dark navy-grey (#1a1823 to #2d334d), low contrast, still on magenta.
- LIT AT DUSK: the night look with every real light ON: warm windows #ffd98a, lamps, headlights. Lights only where a real one
  would be.

Do not draw any labels, grid lines, captions or text: the template's labels are for you, not for the image.
```

### 3B. Single image (route B: the summer master)

```
Draw {{SUBJECT}} ({{DETAILS}}) as a single object in the house style above, summer daylight, following the technical rules.
{{VIEW, e.g. "front elevation" or "side profile facing right"}}. Real proportions: about {{W}} wide by {{H}} tall.
Output one PNG.
```

---

## 4. Variant prompts (route B; always EDIT the master image, never redraw from scratch)

Upload the summer master and use the tool's image-edit mode, so the canvas, size and position stay identical (the importer
trims every layer of an object with ONE shared box, so a moved or resized edit will be misaligned).

**Night, lights off** (`night.png`):

```
Edit this image: the same object at night with every light OFF. Keep the canvas size, the object's outline, position and scale
exactly the same, pixel for pixel. Darken and cool every colour to dark navy-grey (#1a1823 to #2d334d), lower the contrast,
keep the shapes readable. Same flat background. No sky, no moon, no stars, no glow.
```

**Night, lit at dusk** (`lit.png`):

```
Edit the night image: switch on every light a real {{SUBJECT}} would have: windows warm #ffd98a (vary a few to #ffe6b0 and
leave about a quarter dark), {{LAMPS / HEADLIGHTS / SIGNAL LAMPS}}. Change nothing else; same canvas, outline and position.
No light beams, halos or glow beyond the object's outline.
```

**Winter** (`winter.png`):

```
Edit this image: the same object in winter. Keep the canvas size, outline, position and scale exactly the same. Trees and
plants: bare branches or dark evergreen. Add a thin layer of snow (#f4f6f8 with #d8e0e8 shading) resting on the top edges:
roofs, ledges, sills, branches. Slightly cooler colours overall. No falling snow, no snow on the ground.
```

(Spring and autumn work the same way: "fresh light greens and blossom" / "warm orange, rust and brown foliage". Any season
you skip is derived automatically; the real ones always look better on trees and plants.)

**Separate moving part** (for example windmill sails, a watermill wheel, a tram pantograph, a crane jib, a flag-less mast):

```
Edit this image twice, keeping the canvas size and position exactly the same:
1. "base": the object WITHOUT the {{PART}}: remove it cleanly and fill what it covered with the object behind it.
2. "{{PART}}": ONLY the {{PART}}, alone on the same flat background, in exactly the position and size it had in the original.
Output two PNGs.
```

Save them as `base.png` and `{{part}}.png`, and give the motion in the manifest's `parts` column, e.g.
`sails=windmill/sails.png|spin` (sails and wheels `spin`, a pantograph `bob`, a jib `turn`, a lamp `flicker`, a branch or reed
`sway`; a part in a folder's `parts/` with no manifest entry sways).

**Walking-person frames A and B** (or any 2-frame loop: a waving arm, a nodding pony):

```
Edit this image twice, keeping the canvas, the figure's height, head position and baseline exactly the same:
A. mid-stride, LEFT leg forward and right arm forward;
B. mid-stride, RIGHT leg forward and left arm forward.
Same clothes, colours and facing direction (right). Output two PNGs.
```

Save them as `frames/a.png` and `frames/b.png` (2 to 6 frames, played in name order). On a sprite sheet this is the frames row
instead.

---

## 5. Batch prompt (many objects in one conversation)

Paste the style block (and the technical block for route B), attach the references once, then:

```
I will send you a numbered list of objects. For each one, make ONE image following everything above
({{"the sprite-sheet layout" or "the single-image rules"}}). Make only item 1 now. After each image, wait; when I write
"next", make the next item. Never put text in the image. Keep the same style for the whole list.

1. {{id}}: {{subject and details}}, {{rows}} row(s), {{frames}} frames
2. ...
```

Save each answer as `<id>.png` (for example `building.flint-cottage.png`) in one folder, next to a `manifest.csv`
(docs/dev/AI_OBJECTS.md section 4).

## 6. Then, in Claude Code

```
Import the new AI objects in {{folder}} and use them in {{area}} scenes.
```
