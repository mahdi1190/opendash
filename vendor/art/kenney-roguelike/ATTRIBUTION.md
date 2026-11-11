# Roguelike/RPG pack, by Kenney (www.kenney.nl)

Source: https://kenney.nl/assets/roguelike-rpg-pack (version 1.0)
Licence: Creative Commons Zero, CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/); see License.txt.
Credit is not required by CC0; it is given here because it is deserved.

Only image data is used. `garden-atlas.png` holds just the tiles the garden draws, cut from
`roguelikeSheet_transparent.png` with a 1 px extruded border per tile and one gentle colour grade
over the whole sheet (softer, warmer meadow greens). `garden-atlas.json` names the blocks
(source column, row and size are listed in the generator note below).

Regenerate: `python atlas.py roguelikeSheet_transparent.png garden-atlas.png garden-atlas.json`
(the throwaway script lived outside the repo; the block table is mirrored in garden-atlas.json).
