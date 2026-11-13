import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const islandRoot = dirname(dirname(fileURLToPath(import.meta.url)));
// The saved-world identity: change only together with assets/garden/island-v5.json.
const GARDEN_VALE_SHA256='6e944bb9572a554637db86844f692ad019c1b877cfb173c98b17b6aef7b8c1fc';
const freezeIsland = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeIsland(child);
    Object.freeze(value);
  }
  return value;
};

/** The generator's dense ribbon samples alternate their width rapidly. Smooth
 * each open bank once here, before either the page or server sees the layout.
 * The four cap endpoints stay exact, so bridges retain their authored dry gaps.
 * Every water query and painter receives this same derived contour. */
function deriveRiverBanks(layout) {
  if (layout.version !== 5) return layout;
  const W = layout.world;
  const bank = points => {
    let q = points;
    for (let pass = 0; pass < 3; pass++) q = q.map((p, i) => i === 0 || i === q.length - 1 ? p : [(q[i - 1][0] + p[0] * 2 + q[i + 1][0]) / 4, (q[i - 1][1] + p[1] * 2 + q[i + 1][1]) / 4]);
    for (let pass = 0; pass < 2; pass++) {
      const next = [q[0]];
      for (let i = 1; i < q.length; i++) { const a = q[i - 1], b = q[i]; next.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); }
      next.push(q[q.length - 1]); q = next;
    }
    // Thin only the interiors; never remove or move a crossing's cap corners.
    const result = [q[0]];
    for (let i = 1; i < q.length - 1; i++) { const p = q[i], a = result[result.length - 1]; if (Math.hypot((p[0] - a[0]) * W.cellW, (p[1] - a[1]) * W.cellH) >= 5) result.push(p); }
    result.push(q[q.length - 1]); return result;
  };
  const freshwater = layout.freshwater.map(basin => {
    const ring = basin.boundary;
    if (!basin.river || !Array.isArray(ring) || ring.length < 6 || ring.length % 2) return basin;
    const half = ring.length / 2;
    return { ...basin, boundary: bank(ring.slice(0, half)).concat(bank(ring.slice(half))) };
  });
  return { ...layout, freshwater };
}

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
  return Object.freeze({ data: freezeIsland(deriveRiverBanks(data)), fingerprint });
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
