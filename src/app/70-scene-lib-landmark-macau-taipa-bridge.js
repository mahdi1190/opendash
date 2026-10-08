/* ============================================================
   SCENE LIBRARY: landmark.macau-taipa-bridge (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Drawn by hand after the long bridge across the water in the hand-drawn macau-skyline art (its
   gently curved deck on a row of piers; `scene upgrade asia-east/macau-skyline --dry-run` cannot
   parse that art, so nothing was extracted):
   - the real structure: the Governor Nobre de Carvalho Bridge, the first bridge from the Macau
     peninsula to Taipa, a long, low concrete viaduct on slender twin-column piers that climbs into
     its hump, the high navigation spans near the peninsula end where the piers grow tall, and
     drops back to the low deck; lamp standards along both parapets
   - seen from the side, lit from the left: the columns' lit faces, the girder's fascia, the
     shaded underside, the parapet and its posts; the navigation lights under the hump
   - night: the lamps along the deck (glow and the 'lit' line), the hump's piers washed from
     below, the navigation lights
   No text, no flags. Anchor: the waterline under the middle of the drawing (the hump's crest at
   x 250, the deck from x -960 to 960).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const XC = 250, HW = 300, LOW = -24, RISE = 58, END = 960, T = 7;   // the hump's crest and half-width, the low deck, the rise, the ends, the girder depth
  const dk = x => { const u = Math.min(1, Math.abs(x - XC) / HW); return LOW - RISE * Math.pow(Math.cos(u * Math.PI / 2), 2); };   // the deck's top
  define({
    id: 'landmark.macau-taipa-bridge', category: 'landmark', size: [1920, 92], box: [-962, -92, 962, 4], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      conc: ['#e2ddd2', '#bdb6aa', '#8e887e', '#646058'], pier: ['#c8c2b6', '#9a948a', '#6e6a62'], rail: ['#7a7a78', '#a8a8a4'],
      lamp: '#ffe6b0', wash: '#ffd8a0', red: '#ff4a3a', green: '#46d07a',
    } },
    night: { glow: { lamp: '#ffe6b0' }, on: 0.88 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:macau', 'asia', 'asia-east', 'bridge', 'viaduct', 'signature'],
    credit: 'native (scene engine upgrade), after the hand-drawn macau-skyline art (its long bridge on piers)',
    build() {
      const body = [], lit = [];
      const xs = []; for (let x = -END; x <= END; x += 20) xs.push(x);
      const line = (dy) => 'M' + xs.map(x => f1(x) + ' ' + f1(dk(x) + dy)).join('L');
      // the far parapet and its lamp standards, behind the deck
      body.push({ s: '@rail.0', w: 0.9, op: 0.7, d: line(-2.6) });
      // the piers: twin slender columns with a cap, every 64 units; those of the hump one by one (tall, lit
      // and shaded), the low ones in groups (one path per tone)
      const P = []; for (let x = -END + 32; x < END; x += 64) P.push(x);
      const hump = P.filter(x => Math.abs(x - XC) < HW), low = P.filter(x => Math.abs(x - XC) >= HW);
      for (const x of hump) {
        const y = dk(x) + T;
        body.push(['@pier.1', rect(x - 6, y, 4.4, -y) + rect(x + 1.6, y, 4.4, -y)], ['@pier.0', rect(x - 6, y, 1.6, -y) + rect(x + 1.6, y, 1.6, -y), 0.85]);
        body.push(['@pier.2', rect(x - 8, y, 16, 3)], ['@pier.2', rect(x - 2, y + 3, 4, -y - 3), 0.25]);
      }
      for (let g = 0; g < 4; g++) {
        let a = '', b = '', c = '';
        low.filter((x, i) => i % 4 === g).forEach(x => { const y = dk(x) + T; a += rect(x - 5, y, 3.6, -y) + rect(x + 1.4, y, 3.6, -y); b += rect(x - 5, y, 1.3, -y) + rect(x + 1.4, y, 1.3, -y); c += rect(x - 6.5, y, 13, 2.4); });
        body.push(['@pier.1', a], ['@pier.0', b, 0.85], ['@pier.2', c]);
      }
      // the water round the piers' feet (fine)
      let wash = ''; for (const x of P) wash += `M${x - 9} -0.4Q${x} 1.6 ${x + 9} -0.4`;
      body.push({ s: '@conc.0', w: 0.9, op: 0.45, d: wash, detail: true });
      // the girder: its fascia in the light, the shaded underside, the lit top edge
      const top = xs.map(x => [x, dk(x)]), bot = xs.map(x => [x, dk(x) + T]).reverse();
      body.push(['@conc.1', poly(top.concat(bot))], ['@conc.0', poly(top.concat(xs.map(x => [x, dk(x) + 2.6]).reverse()))]);
      body.push(['@conc.2', poly(xs.map(x => [x, dk(x) + T - 2]).concat(bot)), 0.85], { s: '@conc.3', w: 0.6, op: 0.6, d: line(T + 0.3) });
      // the near parapet: its rail and posts, the deck's joints (fine)
      body.push({ s: '@rail.0', w: 1.1, op: 0.85, d: line(-3) });
      let posts = '', joints = '';
      for (let x = -END + 4; x < END; x += 8) posts += `M${x} ${f1(dk(x))}v-3`;
      for (let x = -END + 64; x < END; x += 64) joints += `M${x} ${f1(dk(x) + 2.6)}V${f1(dk(x) + T)}`;
      body.push({ s: '@rail.1', w: 0.5, op: 0.6, d: posts, detail: true }, { s: '@conc.2', w: 0.6, op: 0.6, d: joints, detail: true });
      // the lamp standards with their double arms, on both parapets, the lamp heads (glow, in five groups)
      let poles = ''; const heads = ['', '', '', '', ''];
      for (let x = -END + 24, i = 0; x < END; x += 48, i++) { const y = dk(x); poles += `M${x} ${f1(y - 3)}V${f1(y - 15)}m-3.4 0h6.8`; heads[(i * 2) % 5] += ell(x - 3.4, y - 14.6, 1.4, 0.9) + ell(x + 3.4, y - 14.6, 1.4, 0.9); }
      body.push({ s: '@rail.0', w: 0.8, op: 0.9, d: poles });
      heads.forEach(d => body.push({ f: '@rail.0', d, glow: 'lamp' }));
      // the navigation lights under the hump's middle span
      body.push(['@red', ell(XC - 40, dk(XC - 40) + T + 2, 1.2, 1.2)], ['@green', ell(XC + 40, dk(XC + 40) + T + 2, 1.2, 1.2)]);
      // night: the lamps as lines of light on both parapets, the hump's piers washed from below, the navigation lights
      lit.push({ s: '@lamp', w: 1.6, op: 0.8, d: line(-14.6) }, { s: '@lamp', w: 1.2, op: 0.5, d: line(-1) });
      for (const x of hump) { const y = dk(x) + T; lit.push({ f: { lin: [[0, '@wash', 0.5], [1, '@wash', 0]], x1: 0, y1: 0, x2: 0, y2: y }, d: rect(x - 6, y, 12, -y) }); }
      lit.push({ f: { rad: [[0, '@red', 0.7], [1, '@red', 0]], cx: XC - 40, cy: dk(XC - 40) + T + 2, r: 5 }, d: ell(XC - 40, dk(XC - 40) + T + 2, 5, 5) }, { f: { rad: [[0, '@green', 0.7], [1, '@green', 0]], cx: XC + 40, cy: dk(XC + 40) + T + 2, r: 5 }, d: ell(XC + 40, dk(XC + 40) + T + 2, 5, 5) });
      return { body, lit };
    },
  });
})();
