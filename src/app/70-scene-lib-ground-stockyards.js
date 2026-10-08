/* Stockyards street materials: authored for the Fort Worth opening. */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const R = Math.round;
  sceneObjDefine({
    id: 'ground.stockyards-paving', category: 'ground', size: [1600, 260], variants: 1,
    seasonal: false, flippable: false, parts: ['body'],
    tags: ['texas', 'fort-worth', 'brick', 'kit:urban', 'role:ground'],
    credit: 'native: Exchange Avenue perspective brick courses',
    build() {
      const paths = ['', '', ''];
      const r = sceneRnd(48713);
      for (let row = 0; row < 10; row++) {
        const a = row / 10, b = (row + 1) / 10, yy = R(-260 + a * a * 260), next = R(-260 + b * b * 260), cell = 28 + R(a * 88);
        const left = R(-(.98 * (yy + 500))), right = R(1.15 * (yy + 500));
        paths[0] += `M${left} ${yy}H${right}`;
        for (let x = left + 3 + (row % 2) * cell / 2; x < right - cell; x += cell) {
          paths[0] += `M${R(x)} ${yy}l${R(x * .025)} ${next - yy}`;
          if (r() > .73) paths[r() > .55 ? 1 : 2] += `M${R(x + 3)} ${yy + 2}h${cell - 6}l${R(x * .025)} ${Math.max(2, next - yy - 4)}h-${cell - 6}z`;
        }
      }
      return { body: [{ s: '#493a3d', w: 1.2, op: .25, d: paths[0] }, ['#e5bc94', paths[1], .28], ['#614b46', paths[2], .25]] };
    },
  });
  // Small irregular weathering and exposed aggregate between the regular brick courses.
  // A thin finish rather than repeated miniature street furniture across an open roadway.
  sceneObjDefine({
    id: 'ground.stockyards-wear', category: 'ground', size: [72, 12], variants: 4,
    seasonal: false, flippable: true, parts: ['body'],
    tags: ['texas', 'fort-worth', 'brick', 'weathering', 'kit:urban', 'role:ground'],
    credit: 'native: worn brick texture and sandy joints',
    build(v, r) {
      const d = ['', ''];
      for (let i = 0; i < 3 + v; i++) {
        const x = R(-34 + r() * 64), y = R(-9 + r() * 9), w = R(3 + r() * 11);
        d[i % 2] += `M${x} ${y}l${w} -1 2 2-${w + 1} 1z`;
      }
      return { body: [['#f2cda2', d[0], .19], ['#5f433d', d[1], .13]] };
    },
  });
  sceneObjDefine({
    id: 'ground.stockyards-sand', category: 'ground', size: [64, 12], variants: 4,
    seasonal: false, flippable: true, parts: ['body'],
    tags: ['texas', 'fort-worth', 'sandy-joints', 'kit:urban', 'role:ground'],
    credit: 'native: sand brushed into the brick joints',
    build(v, r) {
      let d = '';
      for (let i = 0; i < 4 + v; i++) {
        const x = R(-30 + r() * 58), y = R(-9 + r() * 9), w = R(3 + r() * 6);
        d += `M${x} ${y}q${w} -2 ${w + 4} 0l-2 1-${w} 1z`;
      }
      return { body: [['#c9ab7f', d, .25]] };
    },
  });
})();
