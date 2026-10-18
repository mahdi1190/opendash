/* Scene engine v2, building style: TUDOR COLOURWASH (East Anglia: Elm Hill in Norwich, Lavenham, Dedham, Pin Mill, Woodbridge).
   The same timber machinery as 'timber-framed' (70-scene-gen-1timber.js: jetties, leaning storeys, oriels, shopfronts, signs, baskets) but a
   different TOWN: the plaster is limewashed in the pastel tones of East Anglia (Suffolk pink, cream, pale ochre, pale blue-grey, sage, white)
   instead of one cream, the studs are a softer brown-black, and the roofs are mostly gables to the street (a row of gable ends is the rhythm of
   the place, where York is a canyon of long eaves) in red pantile and old plain clay tile. More fronts are flush (rebuilt) and the paint of the
   shopfronts is the muted heritage range (dark green, oxblood, slate blue, putty). Pure data; sorts after 'timber-framed', whose hooks it reuses. */
(function () {
  if (typeof sceneBuildingStyleDefine !== 'function' || typeof sceneBuildingStyle !== 'function') return;
  const base = sceneBuildingStyle('timber-framed');
  if (!base) return;
  const WASH = ['#eee5cc', '#e9d8b0', '#e0b3a0', '#e6c4b0', '#d3dabf', '#c8d4d2', '#f1ece0', '#e7d39a', '#ecd6c8', '#d4ded2'];
  const OAK = ['#31261c', '#3a2c20', '#2b2118', '#43342a', '#352a20'];
  const PAINT = ['#27403a', '#5a2a30', '#2f405a', '#6b6048', '#3b3b3b', '#5a4a30', '#41524a', '#6a3a42'];
  sceneBuildingStyleDefine('tudor-colourwash', Object.assign({}, base, {
    label: 'Tudor colourwash (East Anglia: pastel limewash, gables to the street)', eras: [1450, 1700], regions: ['uk', 'east-anglia'],
    storeys: [2, 3], storeyH: [2.9, 2.45, 2.2], frontage: [4.4, 7.2], depth: [6, 9],
    roof: 'gable', roofs: ['gable', 'gable', 'gable', 'gable', 'pitched-side'], pitch: 49,
    wall: { cols: WASH, grime: '#4a4234', texture: 'render' },
    roofMat: { cols: ['#a8553a', '#b4603e', '#9a4a34', '#8a4430', '#9a6a4c', '#7c4a38', '#a5573a'], kind: 'pantile' },
    timber: { oak: OAK, plaster: WASH, paint: PAINT, flush: 0.2, plastered: 0.4, basket: 0.8, lantern: 0.5 },
    win: Object.assign({}, base.win, { frames: ['#2d231a', '#33261b', '#e8e2d2'] }),
    door: Object.assign({}, base.door, { cols: ['#2a3a2e', '#5a2a30', '#2f405a', '#41524a', '#6b6048', '#2a2a2a', '#6a3a42'] }),
    details: { downpipe: 0.1, alarm: 0, boxes: 0.15, ivy: 0.2 },
  }));
  // the one thatched house of the lane (the Briton's Arms of Elm Hill is the last medieval thatch in the city): straw tones, a steeper pitch, ragged courses
  sceneBuildingStyleDefine('tudor-thatch', Object.assign({}, sceneBuildingStyle('tudor-colourwash'), {
    label: 'Tudor colourwash under thatch', storeys: [1, 2], storeyH: [2.9, 2.3], roof: 'gable', roofs: ['gable'], pitch: 54,
    roofMat: { cols: ['#a89158', '#9c8650', '#b39c64', '#8f7a48'], kind: 'thatch' },
  }));
})();
