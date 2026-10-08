# ai-objects/inbox: AI sprite sheets waiting to be imported

Working folder for agents with image generation (ChatGPT, Gemini, ...). Everything here except this README is git-ignored:
the sheets are raw material; what ships is the imported object in `assets/objects/` and the generated
`src/app/70-scene-lib-raster.js`. The agent does the whole job itself (docs/dev/agent-prompts/object-artist.md, mode B);
nobody imports by hand.

## Layout

```
ai-objects/inbox/<batch>/          one folder per batch: <yyyy-mm-dd>-<scene-or-theme>, e.g. 2026-10-08-fleet-pond
  manifest.csv                     one row per object (below)
  <name>.png                       one sprite sheet per object, in the template grid
```

## A painted scene's batch

`summer.png` (+ `spring`, `autumn`, `winter`, `night` edits), masks `sky.png`, `water.png`, `front.png`, and an optional
`paint.json`; imported with `node tools/anim-pack.mjs scene paint new <pack> <id> --images ai-objects/inbox/<batch>`
(docs/dev/PAINTED_SCENES.md). No manifest.

## The sheet (library objects)

Exactly the grid of `docs/dev/object-sheets/template-2x6-f4.png` (1840 x 920 for 2 variant rows plus a frames row; flat
#FF00FF background or transparent): 6 columns SPRING, SUMMER, AUTUMN, WINTER, NIGHT (lights off), LIT (lights on at dusk);
one row per variant; an optional last FRAMES row (the summer look of variant 1 in N poses). The full prompt is
`docs/dev/object-sheets/PROMPT.md`; filled examples are `docs/dev/object-sheets/example-*.png`.

## manifest.csv

```
id,file,category,size,anchor,kit,tags,parts,role,res,rows,frames
tree.fp-alder,alder.png,tree,x420,bottom-centre,temperate,uk;pond,,tree,1,2,0
person.fp-angler,angler.png,person,,bottom-centre,people,uk,,walker,1,1,4
```

- `id` `<category>.<scene-prefix>-<name>`; `file` relative to the batch folder; `size` world units `WxH`, `xH` or `Wx`
  (empty: the category default); `tags` separated by `;`; `rows` the variant rows (setting it marks the row as a sheet);
  `frames` the poses in the frames row (0: none).

## Import (the agent runs this itself)

```
node tools/anim-pack.mjs object import-batch ai-objects/inbox/<batch> --dry-run   # slice, align, lint; writes nothing
node tools/anim-pack.mjs object import-batch ai-objects/inbox/<batch>             # import, then object lint and object sheet
```
