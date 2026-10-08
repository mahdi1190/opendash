/* ============================================================
   COMPOSED SCENES: the New Forest coast (archetype 'newforest').
   - hurst-castle-batteries / -gun-tower / -tide / -beacon (rebuilt; the ids,
     places and views of the hand-drawn items): Hurst Castle at the tip of
     the shingle spit, the round Tudor keep and its bastions, the long
     Victorian batteries, the lighthouse, the Solent and the Isle of Wight.
   - keyhaven-marshes: the saltmarsh and creeks at Keyhaven, egrets and
     moorings, the castle and the lighthouse out on the spit.
   - lymington-harbour: yachts on the Lymington River, the town above with
     St Thomas's tower and cupola, the Isle of Wight ferry, gulls.
   https://www.hurstcastle.co.uk/  https://www.english-heritage.org.uk/visit/places/hurst-castle/
   ============================================================ */
(function () {
  if (typeof nfSceneAdd !== 'function') return;
  const HC = { ukPlace: 'hurst-castle', ukTown: 'Lymington', ukLocality: 'Hurst Spit', ukKind: 'landmark', site: 'Hurst Castle, Hurst Spit', colour: 'slate', tags: ['hurst', 'shingle', 'solent'] };
  const hc = (view, reason, mood) => Object.assign({ id: 'hurst-castle-' + view, label: 'Hurst Castle — ' + reason, mood: mood || 'calm', ukView: view, viewReason: reason }, HC);
  const castle = (x, y, s, v, layer) => ({ obj: 'landmark.hurst-castle', x, y, s, variant: v, layer, seed: 41 });
  const light = (x, y, s, layer) => ({ obj: 'building.lighthouse', x, y, s, layer, variant: 0, seed: 42 });
  const gulls = (x, y, seed) => ({ obj: 'bird.herring-gull', x, y, s: 0.5, layer: 'near', seed, flip: seed % 2 === 1, variant: seed % 3 });

  nfSceneAdd(hc('batteries', 'the keep and long coastal batteries'),
  { id: 'hurst-castle-batteries', lat: 50.706, lon: -1.551, heading: 190, horizon: 440, at: 'afternoon', land: 'shingle', water: 'sea', wh: 120, hills: 40,
    trees: ['none'], frame: ['none', 'none'], yachts: 2, walkers: 2, walkY: 700, features: ['nowoods', 'gulls'] },
  { place: [castle(800, 610, 1.12, 0, 'mid'), light(1420, 600, 0.42, 'mid'), gulls(420, 760, 51), gulls(1180, 790, 52), gulls(300, 820, 53)] });

  nfSceneAdd(hc('gun-tower', 'the curved Tudor gun tower'),
  { id: 'hurst-castle-gun-tower', lat: 50.706, lon: -1.551, heading: 210, horizon: 470, at: 'morning', land: 'shingle', water: 'sea', wh: 90, hills: 30,
    trees: ['none'], frame: ['none', 'none'], yachts: 2, walkers: 2, walkY: 780, features: ['nowoods', 'gulls'] },
  { place: [castle(800, 740, 2.5, 1, 'near'), gulls(300, 820, 51), gulls(1320, 840, 52), gulls(1460, 800, 53)] });

  nfSceneAdd(hc('tide', 'the shingle spit and tidal channels'),
  { id: 'hurst-castle-tide', lat: 50.71, lon: -1.56, heading: 170, horizon: 470, at: 'afternoon', land: 'marsh', water: 'river', wy: 520, wh: 60, hills: 34,
    trees: ['none'], frame: ['none', 'none'], yachts: 2, walkers: 2, walkY: 690, features: ['nowoods', 'egrets', 'gulls'] },
  { place: [castle(760, 512, 0.5, 0, 'far'), light(1200, 510, 0.34, 'far'), { obj: 'bird.heron', x: 520, y: 600, s: 0.4, layer: 'mid', seed: 51, reflect: true }] });

  nfSceneAdd(hc('beacon', 'the lighthouse above the evening tide', 'dreamy'),
  { id: 'hurst-castle-beacon', lat: 50.706, lon: -1.551, heading: 250, horizon: 460, at: 'dusk', land: 'shingle', water: 'sea', wh: 110, hills: 30,
    trees: ['none'], frame: ['none', 'none'], yachts: 2, walkers: 1, walkY: 700, features: ['nowoods', 'gulls'] },
  { place: [light(1080, 830, 0.98, 'near'), castle(480, 600, 0.6, 0, 'mid'), gulls(380, 800, 51), gulls(760, 850, 52)] });

  nfSceneAdd({ id: 'keyhaven-marshes', label: 'Keyhaven Marshes', colour: 'blue', mood: 'calm', ukKind: 'landscape', ukPlace: 'keyhaven', ukTown: 'Lymington', ukLocality: 'Keyhaven', ukView: 'marshes',
    viewReason: 'egrets over the saltmarsh, the castle out on the spit', site: 'Keyhaven, New Forest coast', tags: ['new forest', 'saltmarsh', 'egrets', 'hurst'] },
  { id: 'keyhaven-marshes', lat: 50.72, lon: -1.57, heading: 160, horizon: 470, at: 'golden', land: 'marsh', water: 'river', wy: 530, wh: 80, hills: 36,
    trees: ['none'], frame: ['none', 'none'], yachts: 4, walkers: 2, walkY: 700, features: ['nowoods', 'egrets', 'gulls'] },
  { place: [castle(1120, 524, 0.42, 0, 'far'), light(1440, 522, 0.34, 'far'), { obj: 'bird.heron', x: 380, y: 640, s: 0.42, layer: 'mid', seed: 51, reflect: true }, { obj: 'bird.heron', x: 820, y: 650, s: 0.36, layer: 'mid', variant: 1, seed: 52, reflect: true, flip: true }] });

  nfSceneAdd({ id: 'lymington-harbour', label: 'Lymington', colour: 'blue', mood: 'cheerful', ukKind: 'town', ukPlace: 'lymington', ukTown: 'Lymington', ukLocality: 'Lymington', ukView: 'harbour',
    viewReason: 'yachts on the river below the town', site: 'Lymington harbour', tags: ['new forest', 'lymington', 'yachts', 'harbour'] },
  { id: 'lymington-harbour', lat: 50.757, lon: -1.537, heading: 290, horizon: 460, at: 'afternoon', land: 'lawn', water: 'river', wy: 500, wh: 150,
    trees: ['oak', 'birch'], ntrees: 5, frame: ['none', 'none'], yachts: 6, walkers: 3, walkY: 690, features: ['gulls'] },
  { place: [
    { obj: 'landmark.st-thomas-lymington', x: 1000, y: 498, s: 0.82, layer: 'far', seed: 41, reflect: true },
    { obj: 'building.terrace', x: 560, y: 500, s: 0.8, layer: 'far', variant: 0, seed: 42, reflect: true }, { obj: 'building.terrace', x: 780, y: 500, s: 0.76, layer: 'far', variant: 2, seed: 43, reflect: true },
    { obj: 'building.terrace', x: 1240, y: 502, s: 0.8, layer: 'far', variant: 4, seed: 44, reflect: true }, { obj: 'building.cottage', x: 1420, y: 502, s: 0.4, layer: 'far', variant: 1, seed: 45, reflect: true },
    gulls(300, 770, 51), gulls(1260, 790, 52),
  ], actors: [{ obj: 'boat.ferry', layer: 'mid', path: [[1900, 560], [-300, 560]], speed: 8, loop: 'loop', s: 0.9, seed: 61, offset: 0.4, flip: true }] });
})();
