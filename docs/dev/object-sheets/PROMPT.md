# Prompt pack: one OpenDash object as ONE sprite sheet (Gemini, ChatGPT)

Attach these images to the chat, then paste the prompt below (fill in the subject):

1. `template-2x6-f4.png` (the blank, labelled grid; `node tools/anim-pack.mjs object template --rows 2 --frames 4` makes it)
2. `example-building-terrace.png`, `example-tree-oak.png`, `example-person-walker.png` (filled examples drawn from the library: copy their LAYOUT and finish, not their subjects)

Then import the answer with:

```
node tools/anim-pack.mjs object import-sheet <the-image.png> --id <category>.<name> --rows 2 [--frames 4] --kit <kit> [--role <role>] [--size WxH]
```

It slices the grid, aligns the cells, lints them (a missing cell, size or position drift, a cell of another shape) and builds the
object with its real seasons, night and lit versions. Check the printed WARN and FAIL lines and the object sheet PNG it writes.

---

## The prompt (paste it, with the subject filled in)

Make ONE image: a sprite sheet of **<the object>**, in exactly the layout of the attached template, finished like the attached
examples. It is for a flat-vector, softly shaded illustration style (clean shapes, gentle gradients, no outlines, no texture noise),
seen from the front at eye level, lit from the upper left.

The grid, exactly:

- The whole image is 1840 x 920 pixels (if you cannot make that size, keep the proportions; the grid must stay regular).
- A flat, single-colour background of pure magenta #FF00FF everywhere (or a fully transparent background). No gradient, no
  shadow on the background, no floor, no sky, no scenery.
- Cells of 256 x 256 pixels with 32-pixel empty gutters between them; the first cell starts 112 px from
  the left and 56 px from the top (the margins stay empty).
- 6 columns, left to right: SPRING, SUMMER, AUTUMN, WINTER, NIGHT, LIT AT DUSK.
- 2 row(s), one per VARIANT (the same kind of object with a different design: colour, details, size), top to bottom.
- Then ONE more row at the bottom, FRAMES: 4 cells from the left, the SUMMER look of variant 1 in 4 poses of one smooth animation loop (a walk cycle: contact, passing, contact, passing; or sails at evenly turned angles; or branches swaying left, centre, right, centre), each pose the same size and on the same baseline. The other cells of that row stay empty.

In every cell:

- Exactly one object, the same object as the rest of its row: the same design, size, position and viewpoint in all six columns
  (only the season, the light and the lights change). Do not move, rotate or resize it between columns.
- It stands on an invisible baseline 16 px above the bottom of its cell, centred left to right, filling about 80 % of the
  cell's height (wide objects: 85 % of its width). Nothing touches the cell's edges or crosses a gutter.
- SPRING: fresh light greens, blossom where the object has plants. SUMMER: the full, normal look (this one is the master).
  AUTUMN: warm oranges and browns on foliage. WINTER: bare or dark-green foliage, a little snow resting on the top edges (roofs,
  ledges, branches).
- NIGHT: the object at night with its lights OFF: darker, bluer, lower contrast; still on the magenta background (no night sky).
- LIT AT DUSK: the same night look with every light ON: warm windows (#ffd98a), lamps, headlights, lit signs without words.
  Lights only where a real one would be.

Never: text, letters, numbers, signs with words, logos, brands, flags, faces with features (people are faceless figures), a
ground shadow, a border, labels, grid lines or captions in the output. The labels in the template are for you, not for the image.

---

## Notes for the person running it

- The importer tolerates small misalignments (it finds the cells from the gutters and the objects' bounding boxes), a resized
  image, and a missing cell (a missing season is derived: a colour matrix and a snow cap; a missing night uses the live grade; a
  missing lit column auto-detects windows). It FAILS on a row with no season at all and on a cell more than 20 % off the row's size.
- The AI's accuracy for real landmarks is accepted as it is; for anything else, read the lint's text and palette warnings.
- Generate once per object. If a cell is wrong, ask the AI to redraw that one cell "in the same position and size" rather than
  the whole sheet, or fix it in an editor on the same grid.
- Budgets: about 60 to 200 KB per object after import (`--res 1`); the whole raster library is embedded in the page, so keep it
  to the objects scenes really use (docs/dev/OBJECT_IMPORT.md, "Install size").
