/* ============================================================
   COMPOSED SCENES: Beaulieu and Buckler's Hard (archetype 'newforest').
   - beaulieu-mill-pond: Palace House across the mill pond at Beaulieu,
     swans and ducks, the village's brick cottages, oaks on the banks.
   - bucklers-hard-street / -quay / -autumn / -lamplight (rebuilt; the
     ids, places and views of the hand-drawn items): the two Georgian
     cottage rows stepping down the wide grass street to the Beaulieu
     River, the moorings below, an old oak on the bank, lamplight.
   https://bucklershard.co.uk/about-us/  https://www.beaulieu.co.uk/
   ============================================================ */
(function () {
  if (typeof nfSceneAdd !== 'function') return;
  const BH = { ukPlace: 'bucklers-hard', ukTown: 'Lyndhurst', ukLocality: "Buckler's Hard", ukKind: 'heritage', site: "Buckler's Hard", colour: 'red', tags: ['beaulieu river', 'cottages', 'shipbuilding'] };
  const bh = (view, reason, mood) => Object.assign({ id: 'bucklers-hard-' + view, label: "Buckler's Hard — " + reason, mood: mood || 'calm', ukView: view, viewReason: reason }, BH);
  const row = (x, y, s, v, layer, seed) => ({ obj: 'landmark.bucklers-hard-row', x, y, s, v, variant: v, layer, seed });
  const sw = (x, y, s, v, seed) => ({ obj: 'bird.swan', x, y, s, layer: 'mid', variant: v, seed, reflect: true, flip: seed % 2 === 1 });

  nfSceneAdd({ id: 'beaulieu-mill-pond', label: 'Beaulieu', colour: 'blue', mood: 'calm', ukKind: 'heritage', ukPlace: 'beaulieu', ukTown: 'Lyndhurst', ukLocality: 'Beaulieu', ukView: 'mill-pond',
    viewReason: 'Palace House across the mill pond', site: 'Beaulieu, New Forest', tags: ['new forest', 'beaulieu', 'palace house', 'swans'] },
  { id: 'beaulieu-mill-pond', lat: 50.816, lon: -1.452, heading: 160, horizon: 480, at: 'afternoon', land: 'lawn', water: 'river', wy: 520, wh: 120,
    trees: ['oak', 'willow', 'alder'], ntrees: 7, frame: ['willow', 'none'], walkers: 2, walkY: 672 },
  { place: [
    { obj: 'landmark.palace-house-beaulieu', x: 820, y: 518, s: 0.78, layer: 'far', seed: 41, reflect: true },
    { obj: 'building.cottage', x: 360, y: 520, s: 0.36, layer: 'far', variant: 0, seed: 42, reflect: true }, { obj: 'building.cottage', x: 470, y: 522, s: 0.34, layer: 'far', variant: 1, seed: 43, flip: true, reflect: true },
    sw(600, 580, 0.36, 0, 44), sw(980, 600, 0.4, 1, 45), sw(1180, 572, 0.3, 0, 46), { obj: 'bird.mallard', x: 420, y: 610, s: 0.3, layer: 'mid', seed: 47, reflect: true }, { obj: 'bird.mallard', x: 1340, y: 596, s: 0.28, layer: 'mid', variant: 1, seed: 48, reflect: true, flip: true },
  ] });

  nfSceneAdd(bh('street', 'the sloping village street'),
  { id: 'bucklers-hard-street', lat: 50.799, lon: -1.423, heading: 160, horizon: 470, at: 'afternoon', land: 'village', water: 'river', wy: 478, wh: 30, track: 800,
    trees: ['oak'], ntrees: 4, frame: ['none', 'none'], walkers: 4, walkY: 650 },
  { place: [row(270, 770, 1.15, 0, 'near', 41), row(1330, 770, 1.15, 1, 'near', 42), row(530, 604, 0.6, 0, 'mid', 43), row(1070, 604, 0.6, 1, 'mid', 44),
    { obj: 'animal.dog', x: 720, y: 690, s: 0.5, layer: 'near', seed: 45 }, { obj: 'bird.robin', x: 980, y: 700, s: 0.7, layer: 'near', seed: 46, flip: true }],
    flocks: [{ obj: 'bird.gull', n: 4, area: [400, 200, 1200, 400], speed: 20, s: 0.6, seed: 47, layer: 'mid' }] });

  nfSceneAdd(bh('quay', 'moored boats below the cottages'),
  { id: 'bucklers-hard-quay', lat: 50.799, lon: -1.423, heading: 30, horizon: 470, at: 'morning', land: 'lawn', water: 'river', wy: 510, wh: 120,
    trees: ['oak', 'alder'], ntrees: 6, frame: ['oak', 'none'], yachts: 5, walkers: 2, walkY: 664 },
  { place: [row(760, 508, 0.95, 0, 'far', 41), row(1330, 512, 0.62, 1, 'far', 42)] });

  nfSceneAdd(bh('autumn', 'the riverbank beneath an autumn oak'),
  { id: 'bucklers-hard-autumn', lat: 50.799, lon: -1.423, heading: 60, horizon: 480, at: 'golden', land: 'lawn', water: 'river', wy: 520, wh: 110,
    trees: ['oak', 'oak', 'birch'], ntrees: 6, frame: ['none', 'oak'], yachts: 3, walkers: 2, walkY: 670 },
  { place: [row(1040, 518, 0.95, 1, 'far', 41), { obj: 'tree.ancient-oak', x: 250, y: 760, s: 0.74, layer: 'near', seed: 42 }] });

  nfSceneAdd(bh('lamplight', 'the cottage rows at lamplight', 'cosy'),
  { id: 'bucklers-hard-lamplight', lat: 50.799, lon: -1.423, heading: 340, horizon: 470, at: 'dusk', land: 'village', water: 'river', wy: 478, wh: 30, track: 800,
    trees: ['oak'], ntrees: 3, frame: ['none', 'none'], walkers: 3, walkY: 650 },
  { place: [row(280, 770, 1.1, 0, 'near', 41), row(1320, 770, 1.1, 1, 'near', 42), row(540, 606, 0.58, 0, 'mid', 43), row(1060, 606, 0.58, 1, 'mid', 44),
    { obj: 'street.lamp', x: 660, y: 712, s: 0.62, layer: 'near', seed: 45 }, { obj: 'street.lamp', x: 950, y: 712, s: 0.62, layer: 'near', seed: 46, flip: true },
    { obj: 'animal.fox', x: 860, y: 740, s: 0.5, layer: 'near', seed: 47, flip: true }],
    flocks: [{ obj: 'bird.gull', n: 4, area: [400, 180, 1200, 380], speed: 18, s: 0.6, seed: 48, layer: 'mid' }] });
})();
