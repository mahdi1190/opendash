/* Scene engine v2, building styles: a northern CITY CENTRE's public buildings (21 Oct, the Sheffield Winter Garden and Tudor Square).
   Four styles on the existing generators (pure data plus one crown), so any northern city gets them:
     'civic-sandstone'     a Victorian town hall, library or court in warm Yorkshire sandstone (the baroque-civic facade: a rusticated base,
                           a giant order, a deep cornice, a balustrade), with crown 'town-hall-tower': ONE slender corner clock tower of
                           about 60 m to the finial (a tall shaft with clock faces, a cornice, an open belfry, a colonnaded cupola, an ogee
                           dome, a lantern and a spike), and the other crowns of baroque-civic
     'theatre-edwardian'   an Edwardian theatre in cream stucco and stone (an 1890s playhouse: arched ground floor, pilasters, a deep
                           cornice), crown 'corner-dome' (a square corner turret and an ogee dome) by default
     'theatre-brick-1970s' a 1970s brick theatre or arts centre: brown brick with a cantilevered upper block over a recessed glazed foyer,
                           deep window strips (the brutalist generator with brick, not board-marked concrete)
     'gallery-portal'      a late-1990s gallery front: white portal frames over tall glass bays, two lofty storeys, a white canopy slab;
                           few windows lit after hours (galleries close at five), no lit stair core
   No names, no lettering, no emblems: a finial is a spike, a ball or an urn. */
(function () {
  if (typeof sceneBuildingStyleDefine !== 'function' || typeof sceneBuildingStyle !== 'function') return;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const baroque = sceneBuildingStyle('baroque-civic');
  if (baroque) {
    const crowns = Object.assign({}, baroque.crowns || {}, {
      // one slender clock tower at the front left corner, rising about 60 m from the ground (whatever the block's height)
      'town-hall-tower': (K) => {
        const w = clamp(K.W * 0.13, 7, 9.5), T = clamp(60 - K.E, 28, 48);
        return [{ at: [w / 2 + 1.2, w / 2 + 1.2], w, d: w, z0: K.E, stages: [
          { k: 'shaft', h: T * 0.5, rows: [0.18, 0.46], cols: [0.5], clock: { r: w * 0.26, at: 0.86 } },
          { k: 'cornice', h: 1.0, out: 0.55 },
          { k: 'belfry', h: T * 0.17, inset: 0.7, bays: 2 },
          { k: 'cornice', h: 0.8, out: 0.45 },
          { k: 'cupola', h: T * 0.1, r: w * 0.3, cols: 8 },
          { k: 'dome', r: w * 0.36, h: w * 0.42, shape: 'ogee', ribs: 8, seg: 20 },
          { k: 'lantern', r: w * 0.06, h: T * 0.05 },
          { k: 'finial', kind: 'spike', h: 3.2 },
        ] }];
      },
    });
    sceneBuildingStyleDefine('civic-sandstone', Object.assign({}, baroque, {
      label: 'Victorian civic in Yorkshire sandstone (town hall, library)', eras: [1880, 1915], regions: ['uk', 'yorkshire', 'north'],
      storeys: [4, 4], storeyH: [5.6, 4.8, 4.4, 4.0], parapet: 1.2,
      wall: { cols: ['#c4a676', '#c9ab7c', '#bfa071', '#ccb084'], grime: '#4e4232', texture: 'stone', mortar: '#b8996a' },
      roofMat: { cols: ['#5f6468'], kind: 'slate' },
      dress: { cols: ['#d6bd90', '#dbc396'] },
      night: { on: 0.35, curtain: 0, tv: 0, flood: 0.16 },
      civic: Object.assign({}, baroque.civic, { bay: 4.2, order: 'pilaster', entab: 1.9, course: 1.0, pil: 0.8, copper: '#6d8f7d' }),
      crowns,
    }));
    sceneBuildingStyleDefine('theatre-edwardian', Object.assign({}, baroque, {
      label: 'Edwardian theatre (cream stucco and stone, a domed corner turret)', eras: [1890, 1914], regions: ['uk'],
      storeys: [3, 3], storeyH: [6.2, 5.0, 4.4], parapet: 1.1,
      wall: { cols: ['#e6dcc4', '#e9dfc9', '#e2d7be'], grime: '#5a5244', texture: 'render', mortar: '#d4c9b0' },
      roofMat: { cols: ['#5c6266'], kind: 'slate' },
      dress: { cols: ['#f2ead8', '#efe6d2'] },
      night: { on: 0.6, curtain: 0, tv: 0, flood: 0.18 },
      civic: Object.assign({}, baroque.civic, { bay: 3.8, order: 'pilaster', entab: 1.6, course: 0.9, pil: 0.7, copper: '#6f9585' }),
      crowns,
    }));
  }
  const brut = sceneBuildingStyle('brutalist');
  if (brut) sceneBuildingStyleDefine('theatre-brick-1970s', Object.assign({}, brut, {
    label: '1970s brick theatre (brown brick, cantilevered block over a glazed foyer)', eras: [1965, 1985], regions: ['uk'],
    storeys: [3, 3], storeyH: [5.2, 4.2], parapet: 1.0,
    wall: { cols: ['#6f4c3c', '#76503f', '#6a4838', '#7a5444'], grime: '#2e221c', texture: 'brick', mortar: '#9a8878' },
    dress: { cols: ['#b8b0a2'] }, coping: '#a8a294',
    win: Object.assign({}, brut.win, { frames: ['#2a2c2e'], glass: ['#2c3844', '#323e4a'] }),
    grid: { col: 3.2, cantilever: 2.2 },
    night: { on: 0.55, curtain: 0, tv: 0 },
  }));
  const glass = sceneBuildingStyle('modern-glass');
  if (glass) sceneBuildingStyleDefine('gallery-portal', Object.assign({}, glass, {
    label: 'Gallery front (white portal frames over tall glass bays)', eras: [1995, 2010], regions: ['uk'],
    storeys: [2, 2], storeyH: [6.4, 5.2], parapet: 1.4,
    wall: { cols: ['#e9e8e3', '#ecebe6', '#e5e4de'], grime: '#6a6a66', texture: 'glass' },
    roofMat: { cols: ['#8a8e90'], kind: 'metal' },
    dress: { cols: ['#f2f1ec'] }, coping: '#f4f3ee',
    win: { glass: ['#3c5566', '#38526a', '#44606f'], frames: ['#eeede8'] },
    grid: { col: 4.2, spandrel: 1.1, mullion: '#f1f0eb', slab: '#f3f2ed', canopy: 2.4, spandrelCol: '#e8e7e1' },
    core: false,
    night: { on: 0.18, curtain: 0, tv: 0 },
  }));
  // a slim white residential tower of the 2000s (white cladding bands between ribbons of glass): flats, so a share of windows lit at night
  if (glass) sceneBuildingStyleDefine('tower-white', Object.assign({}, glass, {
    label: 'White residential tower (white bands and glass)', eras: [2000, 2030], regions: ['uk'],
    storeys: [18, 32], storeyH: [5.0, 3.1], parapet: 1.6,
    wall: { cols: ['#eeeeea', '#f0f0ec', '#e8e8e4'], grime: '#7a7c7c', texture: 'glass' },
    roofMat: { cols: ['#9a9ea0'], kind: 'metal' },
    dress: { cols: ['#f6f6f2'] }, coping: '#f6f6f2',
    win: { glass: ['#4a6274', '#466078', '#52687a'], frames: ['#f2f2ee'] },
    grid: { col: 2.2, spandrel: 1.2, mullion: '#f3f3ef', slab: '#f6f6f2', canopy: 1.2, spandrelCol: '#f0f0ec' },
    core: false,
    night: { on: 0.32, curtain: 0.4, tv: 0.12 },
  }));
})();
