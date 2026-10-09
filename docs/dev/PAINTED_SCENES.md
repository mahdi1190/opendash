# Painted scenes: a whole location from AI image generation, animated by the engine

User request, 8 Oct: a whole location can be painted by ChatGPT image generation in about a minute, then animated. A painted
scene is ONE 1600 x 900 painting of a real place plus edit-variants of that same image; the engine supplies everything that
moves. The agent prompt is `docs/dev/agent-prompts/painted-scene.md`; the user never runs the commands by hand.

## 1. The inputs (one folder: `ai-objects/inbox/<yyyy-mm-dd>-<slug>/`)

| file | what | required |
|---|---|---|
| `summer.png` | the master painting, 16:9 (1600 x 900 or larger), the house style (`docs/dev/AI_OBJECTS.md` section 1) | yes |
| `spring.png` `autumn.png` `winter.png` | EDITS of the summer image (the image tool's edit mode, so the composition stays aligned) | no: derived by colour matrices |
| `night.png` | an edit: the same view at night, lights on in windows and lamps | no, but far better than the derived night |
| `sky.png` | mask: white = sky, black = not | no: derived (flood fill of the top band's colours; supply it for complex skylines) |
| `water.png` | mask: white = water | no: or a `water` polygon in paint.json; without either, no ripples |
| `front.png` | mask: white = the near foreground that actors pass BEHIND (reeds, a wall, a bough, a fence) | no: or a `front` polygon |
| `paint.json` | `{ "label", "lat", "lon", "heading", "horizon"?, "water": [[x, y], ...], "front": [...], "sky": [...] }` (1600 x 900 px) | no |

Masks are flat colour PNGs at the painting's size: inside = bright and opaque, outside = black or transparent.

## 2. The command

```
node tools/anim-pack.mjs scene paint new <pack> <id> --images ai-objects/inbox/<batch> [--lat N --lon N --heading N] [--label "..."]
node tools/anim-pack.mjs scene paint lint <pack>/<id>
node tools/anim-pack.mjs scene sheet <pack>/<id> --times          # dawn, noon, golden, dusk, night PNGs
node tools/anim-pack.mjs scene perf <pack>/<id>
```

`paint new` (`tools/lib/scene-cmd/paint.mjs`, `tools/lib/scene-paint.mjs`) decodes and resizes the inputs in headless Chrome,
measures the alignment drift of each variant against summer, builds the masks, and writes:

- `assets/objects/ground/paint-<id>/` the painting with the sky cut out (WebP per season and night) and `masks/*.png` (for the lint);
  `paint-<id>-water/` the water pixels; `paint-<id>-front/` the occluder pixels: raster library objects tagged `painted`;
- `src/app/70-scene-lib-raster.js` (regenerated);
- `src/app/71-scene-<pack>.js` (the scene, with an empty `actors` list to fill) and `src/app/72-anim-pack-<pack>.js`, only when
  they do not exist (re-running the import after a new painting keeps the actors).

`paint lint` checks: every image 1600 x 900; bytes (720 KB an image, 3.2 MB a scene; warn at 360 KB / 1.6 MB); the sky mask
and its share (3 to 75 %); water and front masks (warnings when missing); alignment drift (warn over 8 px, fail over 24 px:
regenerate that variant as an edit); where the actors stand (boats inside the water mask; walkers, animals and vehicles
not on water or in the sky; birds anywhere); at least 3 animations.

## 3. What the engine does (`src/app/78-scene-paint.js`, the `paint` render pass)

- The painting is a raster object at 0, 0 in the first layer, so the season images, the live grade (golden hour warmth, dusk)
  and the night image after real dusk come from the raster path (`70-scene-0raster.js`).
- The sky is cut out: the live sky (real sun and moon positions, stars, drifting clouds) shows through.
- Day to night: the night painting cross-fades in over the graded day one while the live sky darkens (L.dark .12 to .5).
- Water: per frame the water pixels are displaced a pixel or two in rows (more toward the viewer) and glint (sun by day, moon
  and lamps at night).
- Actors, flocks, particles and weather are the engine's own; the occluder is drawn after every actor, so they pass behind it.
- Layers: `back` (the painting), `mid`, `near`, `fore`, `front` (the occluder). Actor coordinates are the painting's pixels;
  use `sByY` so a figure grows as it comes toward the viewer.

## 4. The placeholder proof

`ai-objects/inbox/2026-10-08-placeholder-yateley/` (git-ignored) held the Yateley Green proof scene rendered to PNG at noon
and at night, with water and front polygons in paint.json; `scene paint new paint-yateley-placeholder yateley-placeholder`
made `src/app/71-scene-paint-yateley-placeholder.js` (a dog walker on the winding path, a walker passing behind the reeds,
swans, swallows). Import, lint, the five-moment sheet and perf took about 15 s together; the image generation itself
(about a minute an image) is the slow part.
