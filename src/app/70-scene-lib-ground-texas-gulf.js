/* Small irregular shell hash and wind ripples on the upper Gulf beach. */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const { define, ell, f1: F } = sceneDraw;
  define({
    id: 'ground.texas-shell-sand', category: 'ground', size: [100, 20], variants: 5, seasonal: true, flippable: true,
    palette: { base: { sand: ['#b6a585', '#f0dabc', '#c5baa4'] }, spring: { sand: ['#bda881', '#f5dfba', '#cabd9e'] }, summer: { sand: ['#bfac81', '#f5e5bf', '#d2c6a6'] }, autumn: { sand: ['#ad956e', '#e9cda3', '#b6a485'] }, winter: { sand: ['#9da49c', '#dbe1d3', '#b7c2b9'] } },
    parts: ['body'], tags: ['texas', 'gulf', 'beach', 'kit:water', 'kit:temperate', 'role:ground'],
    build(v, r) {
      let shell = '', dark = '', ripple = '';
      for (let j = 0; j < 13 + v; j++) { const x = (r() - .5) * 98, y = (r() - .5) * 14, w = 1 + r() * 3; if (j % 2) shell += ell(x, y, w, w * .43); else dark += ell(x, y, w * .6, w * .25); }
      for (let j = 0; j < 3; j++) { const x = -45 + r() * 45, y = -7 + j * 5; ripple += `M${F(x)} ${y}q15-2 ${F(29 + r() * 20)} 0`; }
      return { body: [['@sand.1', shell, .72], ['@sand.0', dark, .5], { s: '@sand.2', w: .8, d: ripple, op: .35 }] };
    },
  });
  define({
    id: 'ground.texas-sand-ripple', category: 'ground', size: [110, 18], variants: 4, seasonal: false, flippable: true,
    parts: ['body'], palette: { base: { light: '#ead4ad', dark: '#a5977b' } },
    tags: ['texas', 'gulf', 'wind-ripple', 'kit:water', 'role:ground'],
    build(v, r) {
      const body = [];
      for (let j = 0; j < 3 + v; j++) { const y = -8 + j * 3, x = -53 + r() * 21, w = 55 + r() * 36;
        body.push({ s: '@light', w: 1.2, op: .24, d: `M${F(x)} ${y}q${F(w * .42)} -2 ${F(w)} 1` });
        body.push({ s: '@dark', w: .8, op: .15, d: `M${F(x + 7)} ${y + 1.7}q${F(w * .38)} -1 ${F(w * .82)} 1` });
      }
      return { body };
    },
  });
})();
