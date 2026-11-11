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
  const bytes = readFileSync(join(root, 'assets/garden/island-v4.json'));
  const data = JSON.parse(bytes.toString('utf8'));
  if (data.version !== 4 || data.world?.v !== 4 || data.world.cols !== 96 || data.world.rows !== 96 || data.world.roomX !== 97)
    throw new Error('Unsupported garden island layout');
  const digest=createHash('sha256').update(bytes).digest('hex');
  if(digest!=='cbc9629edd7fb57272e9d21b6fc55842fc52cba2e6554a62861b6ac079d47e4d')throw new Error('Unsupported expanded island identity');
  const fingerprint=digest.slice(0,24);
  return Object.freeze({ data: freezeIsland(data), fingerprint });
}

export const gardenIsland = loadGardenIsland();
export const gardenIslandPredecessorFingerprint='c34545b986e497d5d9df5d51';
export const gardenIslandMechanicsRevision=2;
export const gardenIslandLayout = gardenIsland.data;
export const gardenIslandFingerprint = gardenIsland.fingerprint;
export const GARDEN_ISLAND_LAYOUT = gardenIslandLayout;
export const GARDEN_ISLAND_FINGERPRINT = gardenIslandFingerprint;

/** Embedded before the app; no runtime fetch or separate coordinate copy. */
export function gardenIslandScript(root = islandRoot) {
  const island = root === islandRoot ? gardenIsland : loadGardenIsland(root);
  return `(function(){'use strict';function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value)}return value}window.GardenIslandLayout=freeze(${JSON.stringify(island)});})();`;
}
