/* ============================================================
   GARDEN, the gates: what opens each one (docs/dev/GARDEN_PLAN.md, "Gates you open with a find").
   The owner, 11 Nov 2026 (C:/tmp/gamedesign/FUN_PLAN.md #2): a gate opens with something you find; garden level stays as the fallback, so nobody is stuck.

     GARDEN_GATE_RULES   by gate id (the layout's gates[].id), or by the region it opens (gates[].district), so a new layout with new gate ids still finds its row:
                         {key (the GARDEN_GATE_ITEMS id it takes), who (a WD_FOLK id: who drops the hint), hint, block (what is in the way), verb (the button), done (said as it opens), help (said when the fallback opens it), will (said before, at the gate)}
     GARDEN_GATE_ITEMS   what you can find: {name, art (drawn in 94-garden-wonder-7gates.js), about}
     GARDEN_GATE_FINDS   where each one is: {id, gives, gate, near: [anchor ids, tried in turn], region (the region it lies in, when no anchor is there), who (a character gives it), needs ({fish: n kinds caught} or {item}), lines}
                         Anchors are ids the layout places: placementAnchors.sights / .features, or static props. Nothing here has a cell, so the vale moves them by moving its anchors.
     The fallback        a gate opens anyway at its zone's level + GARDEN_GATE_MARGIN (GARDEN_ZONES lv 3, 6, 10, 14, 18: so 5, 8, 12, 16, 20).
                         A find shows from GARDEN_GATE_EARLY levels below the zone's level, so the curious can go up to that much early and no further.

   SAVES: ledger lines, so they sync and stay per player: 'gk.<item>' {i: {'gk:<item>': 1}} for a find, 'gt.<gate>' {i: {'gate:<gate id>': 1}} for an opened gate.
   A friend sees your opened gates: the snapshot's `areas` carries 'zn-<n>' for each (gardenLandsWire), no new field.
   This file is pure data and small lookups (Node reads it too: lib/agent-engine.mjs).
   ============================================================ */
const GARDEN_GATE_MARGIN = 2;   // levels past a gate's own level before it opens without its find
const GARDEN_GATE_EARLY = 2;    // levels before a gate's own level that its find starts to show
const GARDEN_GATE_ITEMS = _gdF({
  shears: _gdF({ name: 'Garden shears', art: 'shears', about: 'Mother Thistle’s old shears, sharp enough for brambles.' }),
  plank: _gdF({ name: 'A stout plank', art: 'plank', about: 'Pip’s spare plank, long enough to mend the causeway.' }),
  lantern: _gdF({ name: 'An old lantern', art: 'lantern', about: 'A tin lantern that still lights. Tam dug it up.' }),
  cog: _gdF({ name: 'A wooden cog', art: 'cog', about: 'The cog the mill wheel lost. Somebody has been using it as a doorstop.' }),
  mill: _gdF({ name: 'The mill turning', art: 'mill', about: 'The wheel turns again, and the sluice to the orchard stair is up.' }),
  rope: _gdF({ name: 'A coil of rope', art: 'rope', about: 'Good hemp rope, for the steep bit of the pass.' }),
});
const GARDEN_GATE_RULES = _gdF({
  'island-woods': _gdF({ region: 'west-woods', key: 'shears', who: 'thistle', block: 'Brambles have grown right over the arch.', hint: 'My good shears are hanging on the bench by the reed bank, where you can hear the falls. Take them and cut those brambles back.', verb: 'Cut back the brambles', done: 'Snip, snip. The brambles fall away, and the woodland opens up.', help: 'cut the brambles back for you', will: 'will come and cut them back for you' }),
  'island-mill': _gdF({ region: 'east-mill', key: 'plank', who: 'pip', block: 'A plank is missing from the causeway, right in the middle.', hint: 'I’ve got a spare plank! I’ll swap it for a fish. Any fish. I’m by the old angler on the pier.', verb: 'Lay the plank', done: 'The plank fits. The causeway holds, and the valley is across it.', help: 'laid a plank across the causeway for you', will: 'will bring a plank anyway' }),
  'island-ruins': _gdF({ region: 'southwest-ruins', key: 'lantern', who: 'tam', block: 'It is too dark under the old arch to see the way.', hint: 'Dug up a lantern under the old stump in the woodland. Come and have it. I can’t see what I’d want with a light.', verb: 'Light the lantern', done: 'The lantern catches. The dark under the arch turns into a path.', help: 'left a lit lantern under the arch for you', will: 'will leave a lantern lit under the arch' }),
  'island-orchard': _gdF({ region: 'orchard-headland', key: 'mill', who: 'bramble', block: 'The stair gate is shut by the mill’s sluice, and the wheel is still.', hint: 'The wheel lost a cog. I saw one propping a door open at the boathouse. Fit it at the mill and the sluice comes up.', verb: 'Go up the stair', done: 'Water runs, the sluice lifts, and the stair to the orchard is clear.', help: 'mended the mill wheel for you, and the sluice is up', will: 'will mend the wheel for you' }),
  'island-headland': _gdF({ region: 'north-headland', key: 'rope', who: 'wick', block: 'The last climb to the pass is too steep without a rope.', hint: 'Someone left a coil of rope on the old orchard wall, by the cider barrels. I watched them forget it.', verb: 'Tie on the rope', done: 'The rope holds. You pull yourself up, and the mountains are ahead.', help: 'tied a rope on the steep bit for you', will: 'will tie a rope on for you' }),
});
const GARDEN_GATE_FINDS = _gdF([
  _gdF({ id: 'shears', gives: 'shears', gate: 'island-woods', near: _gdF(['reed-bank', 'ld-falls']), region: 'home-island', lines: _gdF(['A pair of old shears hangs from the bench, by a string.', 'Garden shears. Sharp enough for brambles.']) }),
  _gdF({ id: 'plank', gives: 'plank', gate: 'island-mill', near: _gdF(['old-angler', 'pier']), region: 'home-island', who: 'pip', needs: _gdF({ fish: 1 }), ask: 'A fish, any fish, and the plank is yours. The lake is right there. I’m not going anywhere. Well, I am, but not yet.', lines: _gdF(['A fish! For me? You shouldn’t have. You should, actually, we agreed.', 'Here is the plank. Mind the end, it bites.']) }),
  _gdF({ id: 'lantern', gives: 'lantern', gate: 'island-ruins', near: _gdF(['ld-stump', 'ld-hollow']), region: 'west-woods', who: 'tam', lines: _gdF(['Here it is. Came up with the worms. It still has oil in it, which is more than I can say for the worms.', 'Go on, take it. Under that arch it is darker than my tunnels.']) }),
  _gdF({ id: 'cog', gives: 'cog', gate: 'island-orchard', near: _gdF(['ld-boathouse', 'ld-bridge']), region: 'east-mill', lines: _gdF(['A wooden cog is propping the boathouse door open.', 'It has the same teeth as the mill wheel. You prop the door with a stone instead.']) }),
  _gdF({ id: 'mill', gives: 'mill', gate: 'island-orchard', near: _gdF(['ld-mill', 'ld-churn']), region: 'east-mill', needs: _gdF({ item: 'cog' }), ask: 'The wheel is still. There is a gap in its teeth where a cog should be.', lines: _gdF(['You fit the cog. It drops into place with a clunk.', 'The wheel creaks, turns, and keeps turning. Far off, the sluice lifts.']) }),
  _gdF({ id: 'rope', gives: 'rope', gate: 'island-headland', near: _gdF(['ld-barrels', 'ld-orchard-wall']), region: 'orchard-headland', lines: _gdF(['A coil of rope lies on the wall by the barrels.', 'Good hemp rope, long enough for a steep climb.']) }),
]);
function _gggData() { return typeof GardenIslandLayout !== 'undefined' && GardenIslandLayout.data ? GardenIslandLayout.data : null; }
/** The layout's gate row: by its id, or a zone number. */
function gardenGateOf(idOrZone) {
  const D = _gggData(); if (!D || !Array.isArray(D.gates)) return null;
  return D.gates.find(g => typeof idOrZone === 'number' ? g.n === idOrZone : g.id === String(idOrZone)) || null;
}
/** What opens a gate: the row by gate id, else by the region the gate leads to. null: it opens by level, as before. */
function gardenGateRule(gateOrId) {
  const g = typeof gateOrId === 'object' && gateOrId ? gateOrId : gardenGateOf(gateOrId); if (!g) return null;
  if (GARDEN_GATE_RULES[g.id]) return GARDEN_GATE_RULES[g.id];
  const region = g.district || (typeof gardenIslandRegionForZone === 'function' && gardenIslandRegionForZone(g.n) || {}).id;
  for (const r of Object.values(GARDEN_GATE_RULES)) if (r.region === region) return r;
  return null;
}
/** The level at which a zone opens with nothing found. */
function gardenZoneOpenLv(zone) { const z = typeof zone === 'number' ? GARDEN_ZONES[zone] : zone; if (!z || !z.n) return 1; return z.lv + (gardenGateRule(gardenGateOf(z.n)) ? GARDEN_GATE_MARGIN : 0); }
/** The level a gate's finds start to show at. */
function gardenGateFindLv(gate) { const g = typeof gate === 'object' ? gate : gardenGateOf(gate), z = g && GARDEN_ZONES[g.n]; return z ? Math.max(1, z.lv - GARDEN_GATE_EARLY) : 1; }
/** Is a gate open, from a set of what is open ('zn-<n>')? */
function gardenGateIsOpen(gate, open) { return !!gate && !!open && (open instanceof Set ? open.has('zn-' + gate.n) : Array.isArray(open) && open.includes('zn-' + gate.n)); }
/** An anchor's world point (cell units, the middle of its foot), or null when this layout has none by that id. */
function gardenGateAnchor(id) {
  const D = _gggData(); if (!D) return null;
  const pa = D.placementAnchors || {}, row = (pa.sights || {})[id] || (pa.features || {})[id] || (D.static || []).find(s => s.id === id);
  if (!row) { const p = D.presentation && D.presentation.storyAnchors && D.presentation.storyAnchors[id]; if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) return { x: p.x, y: p.y }; }   // (the layout's story points)
  if (!row || !Number.isFinite(row.x) || !Number.isFinite(row.y)) return null;
  return { x: row.x + (row.w || 1) / 2, y: row.y + (row.h || 1) + 0.6 };
}
/** Where a find lies: its first anchor this layout has, else the middle of its region. */
function gardenGateFindPoint(find) {
  for (const id of find.near || []) { const p = gardenGateAnchor(id); if (p) return p; }
  const D = _gggData(), region = D && (D.regions || []).find(r => r.id === find.region), poly = region && region.polygons && region.polygons[0];
  if (!poly || !poly.length) return null;
  const pts = poly.map(p => Array.isArray(p) ? p : [p.x, p.y]);
  return { x: pts.reduce((s, p) => s + p[0], 0) / pts.length, y: pts.reduce((s, p) => s + p[1], 0) / pts.length };
}
