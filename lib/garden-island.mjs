import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const islandRoot = dirname(dirname(fileURLToPath(import.meta.url)));
// The saved-world identity: change only together with assets/garden/island-v5.json.
const GARDEN_VALE_SHA256='a3b499e46a3e8c25effb38017f609dce1cd312013fa6b3690ef54c0a8b120f1f';
const freezeIsland = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeIsland(child);
    Object.freeze(value);
  }
  return value;
};

/** One authored layout for the page, authoritative multiplayer and migration. */
export function loadGardenIsland(root = islandRoot) {
  // Fleetwater Vale (tools/garden-vale-layout.mjs writes it). Gardens from earlier
  // layouts start fresh in this world; nothing is carried over (owner, 11 Nov 2026).
  const bytes = readFileSync(join(root, 'assets/garden/island-v5.json'));
  const data = JSON.parse(bytes.toString('utf8'));
  if (data.version !== 5 || data.world?.v !== 5 || data.world.cols !== 96 || data.world.rows !== 96 || data.world.roomX !== 97)
    throw new Error('Unsupported garden island layout');
  const digest=createHash('sha256').update(bytes).digest('hex');
  if(digest!==GARDEN_VALE_SHA256)throw new Error('Unsupported Fleetwater Vale identity');
  const fingerprint=digest.slice(0,24);
  return Object.freeze({ data: freezeIsland(data), fingerprint });
}

export const gardenIsland = loadGardenIsland();
export const gardenIslandPredecessorFingerprint='cbc9629edd7fb57272e9d21b';
export const gardenIslandMechanicsRevision=3;
export const gardenIslandLayout = gardenIsland.data;
export const gardenIslandFingerprint = gardenIsland.fingerprint;
export const GARDEN_ISLAND_LAYOUT = gardenIslandLayout;
export const GARDEN_ISLAND_FINGERPRINT = gardenIslandFingerprint;

/** Embedded before the app; no runtime fetch or separate coordinate copy. */
export function gardenIslandScript(root = islandRoot) {
  const island = root === islandRoot ? gardenIslandScriptSource : loadGardenIsland(root);
  // Earlier layouts are no longer drawn: a garden saved on one starts fresh here.
  return `(function(){'use strict';function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value)}return value}window.GardenIslandLayout=freeze(${JSON.stringify(island)});window.GardenIslandCanonicalLayout=window.GardenIslandLayout;window.GardenIslandLegacyLayouts=freeze({});})();`;
}
const gardenIslandScriptSource = gardenIsland;
