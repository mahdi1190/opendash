/* Two different civic surfaces: Houston exhibit-court concrete and the Alamo's
   broad limestone plaza. Small weathering marks sit within those real materials. */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const { rect } = sceneDraw, R = Math.round;
  sceneObjDefine({
    id: 'ground.space-plaza-joints', category: 'ground', size: [1200, 260], variants: 1,
    seasonal: false, flippable: false, parts: ['body'],
    tags: ['houston', 'concrete', 'kit:urban', 'role:ground'], credit: 'native: space exhibit court expansion joints',
    build() {
      let d = '';
      for (const y of [-235, -202, -156, -91, -3]) { const k = (y + 420) / 420; d += `M${R(-600 * k)} ${y}H${R(600 * k)}`; }
      for (const x of [-540, -360, -180, 0, 180, 360, 540]) d += `M${R(x * .38)}-260L${x} 0`;
      return { body: [{ s: '#6a7979', w: 1.4, op: .28, d }, { s: '#d8dfd6', w: 1, op: .2, d: 'M-540-88H540M-256-201H256' }] };
    },
  });
  sceneObjDefine({
    id: 'ground.space-plaza-fleck', category: 'ground', size: [80, 10], variants: 4,
    seasonal: false, flippable: true, parts: ['body'],
    tags: ['houston', 'aggregate', 'concrete', 'kit:urban', 'role:ground'], credit: 'native: exposed concrete aggregate',
    build(v, r) {
      const d = ['', ''];
      for (let i = 0; i < 4 + v; i++) {
        const x = R(-37 + r() * 70), y = R(-7 + r() * 6), w = 2 + R(r() * 5);
        d[i % 2] += `M${x} ${y}l${w} -1 2 1-${w + 1} 2z`;
      }
      return { body: [['#e2ded0', d[0], .23], ['#526c70', d[1], .12]] };
    },
  });
  sceneObjDefine({
    id: 'ground.alamo-courtyard-joints', category: 'ground', size: [1600, 260], variants: 1,
    seasonal: false, flippable: false, parts: ['body'],
    tags: ['san-antonio', 'limestone', 'paving', 'kit:urban', 'role:ground'], credit: 'native: limestone courtyard perspective paving',
    build() {
      const paths = ['', '', ''], r = sceneRnd(92479);
      let prev = -260;
      for (let row = 0; row < 9; row++) {
        const y = R(-260 + Math.pow((row + 1) / 9, 1.9) * 260), k = (prev + 400) / 400, nextK = (y + 400) / 400, cell = 95 + row * 14;
        paths[0] += `M-800 ${prev}H800`;
        for (let x = -1000 + (row % 2) * cell / 2; x < 1000; x += cell) {
          const xx = R(x * k), xn = R(x * nextK), w = R(cell * k);
          paths[0] += `M${xx} ${prev}L${xn} ${y}`;
          if (r() > .66) paths[r() > .5 ? 1 : 2] += `M${xx + 2} ${prev + 2}h${Math.max(3, w - 4)}l${xn - xx} ${Math.max(2, y - prev - 4)}h-${Math.max(3, R(cell * nextK) - 4)}z`;
        }
        prev = y;
      }
      return { body: [{ s: '#998064', w: 1.1, op: .3, d: paths[0] }, ['#ede0c5', paths[1], .15], ['#a68a69', paths[2], .1]] };
    },
  });
  sceneObjDefine({
    id: 'ground.alamo-limestone-wear', category: 'ground', size: [90, 12], variants: 4,
    seasonal: false, flippable: true, parts: ['body'],
    tags: ['san-antonio', 'limestone', 'weathering', 'kit:urban', 'role:ground'], credit: 'native: limestone grain and weathered edges',
    build(v, r) {
      let d = '', light = '';
      for (let i = 0; i < 3 + v; i++) {
        const x = R(-42 + r() * 79), y = R(-10 + r() * 9), w = 4 + R(r() * 11);
        d += `M${x} ${y}q${w} -2 ${w + 4} 0l-3 1-${w} 1z`;
        light += rect(x + 2, y + 1, Math.max(2, w - 2), 1);
      }
      return { body: [['#927b61', d, .13], ['#f0e1bf', light, .18]] };
    },
  });
  for (const type of ['concrete', 'limestone']) sceneObjDefine({
    id: 'ground.' + (type === 'concrete' ? 'space-plaza-fine' : 'alamo-limestone-grain'),
    category: 'ground', size: [70, 9], variants: 4, seasonal: false, flippable: true, parts: ['body'],
    tags: ['texas', type, 'surface-grain', 'kit:urban', 'role:ground'],
    credit: 'native: fine mineral grain within the civic paving',
    build(v, r) {
      let d = '';
      for (let i = 0; i < 4 + v; i++) { const x = R(-32 + r() * 62), y = R(-7 + r() * 6), w = 2 + R(r() * 4); d += `M${x} ${y}l${w} -1 2 1-${w} 1z`; }
      return { body: [[type === 'concrete' ? '#e7e1d1' : '#f2e3c4', d, .2]] };
    },
  });
})();
