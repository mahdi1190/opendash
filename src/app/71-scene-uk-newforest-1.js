/* ============================================================
   COMPOSED SCENES: the New Forest heaths, lawns and woods (archetype 'newforest').
   - new-forest-ponies (the signature, rebuilt): commoners' ponies grazing the
     open heath in golden light, gorse, heather, a veteran Scots pine.
   - bratley-view-dawn: the wide heath from Bratley View, cattle and ponies,
     the woods rolling away under the dawn.
   - hatchet-pond-ponies: ponies at the edge of Hatchet Pond near Beaulieu,
     swans on the water, the heath behind.
   - brockenhurst-balmer-lawn: the grazed lawn by the Lymington River at
     Balmer Lawn, ancient oaks, ponies at the water.
   - bolderwood-deer: fallow deer in a glade of the ancient woods at
     Bolderwood, holly and bracken under old oaks.
   https://www.newforestnpa.gov.uk/  https://www.forestryengland.uk/bolderwood
   ============================================================ */
(function () {
  if (typeof nfSceneAdd !== 'function') return;
  const sw = (x, y, s, v, seed) => ({ obj: 'bird.swan', x, y, s, layer: 'mid', variant: v, seed, reflect: true });

  nfSceneAdd({ id: 'new-forest-ponies', label: 'New Forest ponies', colour: 'green', mood: 'calm', ukKind: 'signature',
    tags: ['new forest', 'ponies', 'heath', 'national park'] },
  { id: 'new-forest-ponies', lat: 50.87, lon: -1.6, heading: 250, horizon: 500, at: 'golden', land: 'heath', water: 'none', hills: 26, track: 760,
    trees: ['pine', 'birch', 'pine'], ntrees: 10, shrubs: 8, frame: ['pine', 'none'], ponies: 6, walkers: 2, features: ['stonechats'] },
  { place: [
    { obj: 'tree.pine-veteran', x: 1290, y: 712, s: 0.62, layer: 'fore', seed: 31, flip: true },
    { obj: 'animal.pony', x: 640, y: 830, s: 0.8, layer: 'near', variant: 1, seed: 32 },
    { obj: 'animal.pony', x: 880, y: 812, s: 0.7, layer: 'near', variant: 0, seed: 33, flip: true },
  ] });

  nfSceneAdd({ id: 'bratley-view-dawn', label: 'Bratley View', colour: 'amber', mood: 'dreamy', ukKind: 'landscape', ukPlace: 'bratley-view', ukTown: 'Lyndhurst', ukLocality: 'Bratley View', ukView: 'dawn',
    viewReason: 'the wide heath rolling away at dawn', site: 'Bratley View, New Forest', tags: ['new forest', 'heath', 'ponies', 'cattle'] },
  { id: 'bratley-view-dawn', lat: 50.905, lon: -1.675, heading: 110, horizon: 470, at: 'dawn', land: 'heath', water: 'none', hills: 34, track: 980,
    trees: ['pine', 'birch'], ntrees: 7, shrubs: 8, frame: ['none', 'pine'], ponies: 3, cattle: 3, walkers: 2, features: ['stonechats'] },
  { place: [{ obj: 'tree.pine-veteran', x: 330, y: 690, s: 0.56, layer: 'near', seed: 31 }] });

  nfSceneAdd({ id: 'hatchet-pond-ponies', label: 'Hatchet Pond', colour: 'green', mood: 'calm', ukKind: 'landscape', ukPlace: 'hatchet-pond', ukTown: 'Lyndhurst', ukLocality: 'Beaulieu', ukView: 'ponies',
    viewReason: 'ponies at the water on the open heath', site: 'Hatchet Pond, Beaulieu', tags: ['new forest', 'pond', 'ponies', 'swans'] },
  { id: 'hatchet-pond-ponies', lat: 50.80, lon: -1.50, heading: 300, horizon: 490, at: 'afternoon', land: 'heath', water: 'pond', wy: 560, wh: 96, wx: 720, wr: 430,
    trees: ['pine', 'birch'], ntrees: 8, shrubs: 10, frame: ['pine', 'none'], ponies: 4, walkers: 2, walkY: 690 },
  { place: [
    { obj: 'tree.pine-veteran', x: 1360, y: 700, s: 0.6, layer: 'fore', seed: 31, flip: true },
    { obj: 'animal.pony', x: 520, y: 668, s: 0.6, layer: 'near', variant: 2, seed: 34, reflect: true },
    { obj: 'animal.pony', x: 1000, y: 664, s: 0.4, layer: 'near', variant: 0, seed: 35, flip: true, reflect: true },
    sw(640, 600, 0.3, 0, 36), sw(820, 616, 0.34, 1, 37), { obj: 'bird.mallard', x: 460, y: 626, s: 0.3, layer: 'mid', seed: 38, reflect: true },
  ] });

  nfSceneAdd({ id: 'brockenhurst-balmer-lawn', label: 'Balmer Lawn', colour: 'green', mood: 'calm', ukKind: 'landscape', ukPlace: 'brockenhurst', ukTown: 'Lyndhurst', ukLocality: 'Brockenhurst', ukView: 'balmer-lawn',
    viewReason: 'ponies on the lawn by the Lymington River', site: 'Balmer Lawn, Brockenhurst', tags: ['new forest', 'lawn', 'river', 'ponies'] },
  { id: 'brockenhurst-balmer-lawn', lat: 50.825, lon: -1.565, heading: 200, horizon: 480, at: 'morning', land: 'lawn', water: 'river', wy: 560, wh: 44,
    trees: ['oak', 'alder', 'oak'], ntrees: 10, shrubs: 6, frame: ['oak', 'none'], ponies: 6, walkers: 3, walkY: 650 },
  { place: [{ obj: 'tree.ancient-oak', x: 1230, y: 700, s: 0.72, layer: 'near', seed: 31, flip: true }] });

  nfSceneAdd({ id: 'bolderwood-deer', label: 'Bolderwood', colour: 'green', mood: 'calm', ukKind: 'landscape', ukPlace: 'bolderwood', ukTown: 'Lyndhurst', ukLocality: 'Bolderwood', ukView: 'deer',
    viewReason: 'fallow deer in a glade of the ancient woods', site: 'Bolderwood, New Forest', tags: ['new forest', 'woodland', 'deer', 'ancient oaks'] },
  { id: 'bolderwood-deer', lat: 50.87, lon: -1.65, heading: 160, horizon: 520, at: 'morning', land: 'wood', water: 'none',
    trees: ['oak', 'oak', 'birch'], ntrees: 9, shrubs: 6, frame: ['oak', 'oak'], deer: 7, walkers: 2, walkY: 720 },
  { place: [
    { obj: 'tree.ancient-oak', x: 420, y: 690, s: 0.78, layer: 'near', seed: 31 },
    { obj: 'tree.ancient-oak', x: 1180, y: 640, s: 0.5, layer: 'mid', variant: 1, seed: 32, flip: true },
  ] });
})();
