# Scene engine (future idea)

Status: an idea for a later version, not built. Written 6 Oct 2026.

## The problem

Full-screen scenes are written out in full. Every heather clump, tree and
duck in a scene is a complete drawing, so detailed scenes run to hundreds of
kilobytes or more. Making variations (another angle, another season, another
place) means drawing again.

## The idea: build scenes the way 2D games do

1. **An object library.** Draw each object once, in detail, with a few
   variants and the four seasonal colourings. Examples: a birch, a Scots pine,
   an oak, a heather clump, gorse, reeds, a duck, a swan, a dog walker, a
   narrowboat, a footbridge. Unique landmarks (a particular church, the Fleet
   Pond boardwalk) are library objects too, used by one place.
2. **Scenes are placement lists.** A scene is a small data file: the backdrop
   (sky, land shape, water line) plus a list of placed objects with position,
   scale, flip, season or colour shift and depth layer, like a game level
   file. Hundreds of placements cost a few kilobytes.
3. **Instancing.** Each library object is drawn once and stamped out for every
   copy. In SVG that means `<symbol>` with `<use>`. Very busy scenes render to a
   canvas with pre-drawn sprites, as 2D games do, which keeps animation smooth
   with thousands of objects.
4. **Variation for free.** Seeded scatter, so clumps grow naturally rather
   than in rows. Each copy gets its own size, flip, tint and sway timing. New
   variations of a scene (season, time of day, angle, weather) become small
   edits to the placement list, not new drawings.
5. **Animation lives in the objects.** A duck paddles and a walker's legs
   swing wherever they are placed. One wind field sways every grass and reed
   object, and the live sky (sun, moon, stars, light) applies to all of them.

## Why

- **Size:** scenes would be roughly 20–50 KB each, plus a shared library that
  is downloaded once, instead of up to about 1 MB per scene.
- **Quality:** effort goes into making each object excellent once, and every
  scene that uses it improves.
- **Speed:** a new place or a variation is mostly composing objects, so
  covering every UK county, the US, Asia and the world becomes much quicker.
- **Tools:** it opens the way to a simple scene editor (drag objects into a
  view) and to community-made object packs.

## Rough plan

1. Define the object format (SVG symbol plus metadata: anchor point,
   variants, seasonal palettes, animation hooks) and the scene file format.
2. Build the renderer, SVG first, with a canvas path for heavy scenes. Hook it
   into the live sky and the wind field, and keep a reduced-motion still.
3. Turn the rich nature kit (`71-anim-uk-nature-kit.js`) into the first object
   library.
4. Convert the Yateley and Fleet scenes as the pilot, then the other packs.
5. Optionally, build a scene editor in the gallery.
