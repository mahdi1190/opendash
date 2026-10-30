// lib/pet-art.mjs - the pet drawing for Node (2.22).
//
// The pet kit's drawing files (src/app/97-pets-0kit.js, 97-pets-0kititems.js, 97-pets-0kitdraw.js, 97-pets-0kitspecies.js) are
// PURE (no DOM, nothing drawn at load), so Node evaluates them in one scope the way the page does: the same drawing, the same
// anchors. What it is for: telling the assistant where a pet's head and eyes really are (petFrameOf), and drawing a pet as an
// <svg> string (petSvg) for a look at the result without a browser.
//
//   petFrameOf(species)    {eyes: [x1, x2, y], r, neck: bool}: the eyes in the head frame of custom accessories (the head is a circle
//                          of radius 50 about (0, 0), +x towards the face, +y down), as the species draws them sitting
//   petSvg(look, o)        the pet as an <svg> string (o: {size, pose, mood, crop}); look.items {itemHead: design, ...} are drawn
//   petArt(look, pose, mood)
//
// Node stdlib only.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
const FILES = ['97-pets-0kit.js', '97-pets-0kititems.js', '97-pets-0kitdraw.js', '97-pets-0kitspecies.js'];
const NAMES = ['petArt', 'petSvg', 'petDefault', 'petNormalize', 'petSpecies', 'petItemClean', 'petItemShapes', 'PET_SPECIES'];
// eslint-disable-next-line no-new-func
const api = new Function(`"use strict";\n${FILES.map(f => readFileSync(join(APP, f), 'utf8')).join('\n;\n')}\nreturn { ${NAMES.join(', ')} };`)();

export const { petArt, petSvg, petDefault, petNormalize, petSpecies, petItemClean, petItemShapes, PET_SPECIES } = api;

const _frames = new Map();
export function petFrameOf(species) {
  if (_frames.has(species)) return _frames.get(species);
  let out = null;
  try {
    const A = petArt(petDefault(species), 'sit', { eyes: 'open', mouth: 'smile' });
    const a = A && A.acc, hc = a && a.hc, e = a && a.eyes;
    if (hc && e) {
      const k = 50 / hc[2], R = (v) => Math.round(v * 10) / 10;
      out = { eyes: [R((e[0] - hc[0]) * k), R((e[1] - hc[0]) * k), R((e[2] - hc[1]) * k)], r: R((e[3] || 3) * k), neck: !!a.neck };
    }
  } catch { out = null; }
  _frames.set(species, out);
  return out;
}
