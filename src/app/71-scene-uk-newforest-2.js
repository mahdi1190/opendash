/* ============================================================
   COMPOSED SCENES: Lyndhurst and Brockenhurst (archetype 'newforest').
   - lyndhurst-boltons-bench: from Bolton's Bench, the yew-topped knoll on
     the edge of Lyndhurst, across the grazed lawn to St Michael and All
     Angels and its tall spire above the village; ponies on the lawn.
   - lyndhurst-village: the forest road through Lyndhurst, cottages, the
     church on its hill behind, ponies wandering the verge as they do.
   - brockenhurst-watersplash: the ford on the edge of Brockenhurst, the
     stream over the lane, thatched and brick cottages, ponies and an old oak.
   https://www.thenewforest.co.uk/explore/towns-and-villages/lyndhurst
   https://www.thenewforest.co.uk/explore/towns-and-villages/brockenhurst
   ============================================================ */
(function () {
  if (typeof nfSceneAdd !== 'function') return;
  const cot = (obj, x, y, s, v, seed, flip) => ({ obj, x, y, s, layer: 'mid', variant: v, seed, flip: !!flip });

  nfSceneAdd({ id: 'lyndhurst-boltons-bench', label: "Bolton's Bench", colour: 'green', mood: 'calm', ukKind: 'landscape', ukPlace: 'lyndhurst', ukTown: 'Lyndhurst', ukLocality: 'Lyndhurst', ukView: 'boltons-bench',
    viewReason: 'the spire of St Michael\'s above the grazed lawn', site: "Bolton's Bench, Lyndhurst", tags: ['new forest', 'lyndhurst', 'church', 'ponies'] },
  { id: 'lyndhurst-boltons-bench', lat: 50.871, lon: -1.567, heading: 280, horizon: 500, at: 'afternoon', land: 'lawn', water: 'none', track: 520,
    trees: ['oak', 'holly', 'oak'], ntrees: 8, shrubs: 6, frame: ['none', 'pine'], ponies: 4, walkers: 3 },
  { place: [
    { obj: 'landmark.st-michaels-lyndhurst', x: 1010, y: 532, s: 0.62, layer: 'far', seed: 41 },
    cot('building.cottage', 760, 540, 0.34, 0, 42), cot('building.cottage', 1290, 544, 0.32, 1, 43, true), cot('building.cottage', 600, 546, 0.28, 0, 44, true),
    { obj: 'tree.ancient-oak', x: 260, y: 700, s: 0.6, layer: 'near', seed: 45 },
  ] });

  nfSceneAdd({ id: 'lyndhurst-village', label: 'Lyndhurst', colour: 'red', mood: 'calm', ukKind: 'town', ukPlace: 'lyndhurst', ukTown: 'Lyndhurst', ukLocality: 'Lyndhurst', ukView: 'village',
    viewReason: 'ponies on the verge of the village road', site: 'Lyndhurst, New Forest', tags: ['new forest', 'lyndhurst', 'village', 'ponies'] },
  { id: 'lyndhurst-village', lat: 50.872, lon: -1.574, heading: 20, horizon: 480, at: 'morning', land: 'village', water: 'none', road: 640,
    trees: ['oak', 'birch'], ntrees: 6, shrubs: 6, frame: ['oak', 'none'], ponies: 3, walkers: 3, walkY: 668, features: ['cars'] },
  { place: [
    { obj: 'landmark.st-michaels-lyndhurst', x: 1120, y: 548, s: 0.8, layer: 'mid', seed: 41 },
    cot('building.cottage', 300, 610, 0.62, 0, 42), cot('building.cottage', 470, 606, 0.56, 1, 43, true), cot('building.terrace', 690, 606, 0.9, 1, 44),
    cot('building.cottage', 1420, 612, 0.6, 0, 46, true), { obj: 'street.lamp', x: 860, y: 620, s: 0.5, layer: 'mid', seed: 47 }, { obj: 'street.lamp', x: 1340, y: 624, s: 0.5, layer: 'mid', seed: 48, flip: true },
  ] });

  nfSceneAdd({ id: 'brockenhurst-watersplash', label: 'Brockenhurst Watersplash', colour: 'green', mood: 'cheerful', ukKind: 'landscape', ukPlace: 'brockenhurst', ukTown: 'Lyndhurst', ukLocality: 'Brockenhurst', ukView: 'watersplash',
    viewReason: 'the ford across the lane, ponies at the water', site: 'The Watersplash, Brockenhurst', tags: ['new forest', 'brockenhurst', 'ford', 'ponies'] },
  { id: 'brockenhurst-watersplash', lat: 50.815, lon: -1.575, heading: 140, horizon: 480, at: 'noon', land: 'lawn', water: 'stream', wx: 1120,
    trees: ['oak', 'alder', 'birch'], ntrees: 8, shrubs: 6, frame: ['oak', 'none'], ponies: 4, walkers: 3, walkY: 660 },
  { place: [
    { obj: 'tree.ancient-oak', x: 1380, y: 712, s: 0.62, layer: 'near', seed: 41, flip: true },
    cot('building.cottage', 300, 580, 0.46, 0, 42), cot('building.cottage', 520, 572, 0.42, 1, 43), cot('building.cottage', 160, 588, 0.4, 0, 44, true),
    { obj: 'animal.pony', x: 900, y: 760, s: 0.66, layer: 'near', variant: 2, seed: 45, reflect: true },
  ] });
})();
