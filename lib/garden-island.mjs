import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const islandRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const freezeIsland = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeIsland(child);
    Object.freeze(value);
  }
  return value;
};

/** One authored layout for the page, authoritative multiplayer and migration. */
export function loadGardenIsland(root = islandRoot) {
  const bytes = readFileSync(join(root, 'assets/garden/island-v3.json'));
  const data = JSON.parse(bytes.toString('utf8'));
  if (data.version !== 3 || data.world?.v !== 3 || data.world.cols !== 52 || data.world.rows !== 56 || data.world.roomX !== 53)
    throw new Error('Unsupported garden island layout');
  const digest=createHash('sha256').update(bytes).digest('hex');
  const mechanics=data.mechanics, prior={...data};delete prior.mechanics;
  if(digest!=='c34545b986e497d5d9df5d51378e945dbbf288fe7dee48dfbb7ef814b566c518'||mechanics?.revision!==1||mechanics.predecessorLayout!=='94f5b2dbe4dce765cafb2b40'||mechanics.contract!=='optional-side-pier-walk-cover-v1'||Object.keys(mechanics).length!==3||createHash('sha256').update(JSON.stringify(prior)).digest('hex')!=='51f5ca7aaee9d71682d51b5e29180a674ac9616f3169832b6080c0924cf406fe')throw new Error('Unsupported island mechanics identity or changed predecessor geometry');
  const fingerprint=digest.slice(0,24);
  return Object.freeze({ data: freezeIsland(data), fingerprint });
}

export const gardenIsland = loadGardenIsland();
export const gardenIslandPredecessorFingerprint='94f5b2dbe4dce765cafb2b40';
export const gardenIslandMechanicsRevision=1;
export const gardenIslandLayout = gardenIsland.data;
export const gardenIslandFingerprint = gardenIsland.fingerprint;
export const GARDEN_ISLAND_LAYOUT = gardenIslandLayout;
export const GARDEN_ISLAND_FINGERPRINT = gardenIslandFingerprint;

/** Embedded before the app; no runtime fetch or separate coordinate copy. */
export function gardenIslandScript(root = islandRoot) {
  const island = root === islandRoot ? gardenIsland : loadGardenIsland(root);
  return `(function(){'use strict';function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value)}return value}window.GardenIslandLayout=freeze(${JSON.stringify(island)});})();`;
}
