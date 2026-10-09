/* Upper Texas Gulf fishing pier: an unbranded timber pavilion, piles and a perspective boardwalk. */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const { define, rect, ell, poly, f1: F } = sceneDraw, M = [1, 0, 0, 1, -800, -580];
  define({
    id: 'landmark.texas-gulf-pier', category: 'landmark', size: [860, 488], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'], palette: { base: { window: '#345b67', lamp: '#d7c7a3', warm: '#ffe0a2' } },
    night: { glow: { window: '#f9cf8c', lamp: '#ffe7b5' }, on: 1 }, reflect: true, shadow: { rx: 62, ry: 6, h: 80 },
    tags: ['landmark', 'texas', 'gulf', 'pier', 'galveston', 'place:texas/place:gulf-coast-sunrise'],
    build() {
      const body = [], lit = [], add = (f, d, x) => body.push(Object.assign({ f, d, m: M }, x));
      const stroke = (s, w, d, x) => body.push(Object.assign({ s, w, d, m: M }, x));
      const edges = y => { const t = (y - 582) / 318; return [720 - t * 340, 886 + t * 294]; };
      // Piles emerge beneath the seaward platform; their heights vary with perspective.
      for (let j = 0; j < 9; j++) {
        const y = 595 + j * j * 3.3, e = edges(y), w = 7 + j * .8;
        for (const x of e) { add('#594d3c', rect(x, y, w, 48 + j * 6)); add('#a78b62', rect(x + w * .18, y, w * .22, 42 + j * 6), { op: .65 }); stroke('#3f4540', 1.2, `M${F(x)} ${F(y + 30)}h${F(w)}`, { detail: true }); }
      }
      add('#79654b', 'M720 582H886L1180 900H380Z');
      add('#ad9470', 'M724 582H882L1169 900H391Z');
      add('#c9af83', 'M734 582H774L639 900H482Z', { op: .38 });
      // Plank courses follow the boardwalk vanishing point, with grain and nails.
      for (let j = 0; j < 33; j++) {
        const t = j / 32, y = 583 + Math.pow(t, 1.7) * 317, e = edges(y), width = e[1] - e[0];
        stroke('#6e5c45', 1.2 + t * 1.2, `M${F(e[0] + 3)} ${F(y)}H${F(e[1] - 3)}`);
        stroke('#ead1a3', .8 + t, `M${F(e[0] + 9)} ${F(y + 2.6)}h${F(width * (.32 + j % 3 * .11))}`, { op: .5, detail: true });
        if (j % 2 === 0) { add('#5e5748', ell(e[0] + width * .1, y - 3, 1 + t, .7 + t * .4), { detail: true }); add('#5e5748', ell(e[1] - width * .1, y - 3, 1 + t, .7 + t * .4), { detail: true }); }
      }
      stroke('#66573f', 1.5, 'M758 584L565 900M821 584L859 900M866 584L1080 900', { op: .52 });
      // Side rails become heavier toward the viewer, giving a clear lead-in.
      for (let j = 0; j < 11; j++) {
        const t = j / 10, y = 586 + t * t * 314, e = edges(y), h = 22 + t * 63, w = 4 + t * 7;
        for (const x of e) {
          add('#4a5045', rect(x - w * .5, y - h, w, h + 5));
          add('#b4a17d', rect(x - w * .4, y - h, w * .25, h), { op: .7 });
          if (j > 0 && j < 10) { add('@lamp', ell(x, y - h - 3, 2 + t * 2.5, 3 + t * 2), { glow: 'lamp' }); }
        }
      }
      stroke('#c3af88', 6, 'M720 562Q580 637 380 815M886 562Q1036 664 1180 815');
      stroke('#4b5147', 4, 'M720 575Q580 664 380 856M886 575Q1036 695 1180 856');
      // A broad platform and timber shelter, with clapboard and four-pane windows.
      add('#4f5144', rect(676, 573, 252, 13)); add('#c0a578', rect(676, 570, 252, 7));
      add('#d8c9a2', 'M708 478H890V570H708Z'); add('#9a9c86', 'M858 479H890V570H858Z');
      for (let j = 0; j < 11; j++) stroke('#a7ac93', 1.3, `M710 ${487 + j * 7}H888`, { detail: true });
      add('#526962', 'M680 481L797 413L916 481Z');
      add('#7c8d75', 'M680 481L797 413L799 427L705 481Z');
      add('#3b5454', 'M797 413L916 481H888L799 427Z');
      stroke('#bac0a0', 3.2, 'M678 481L797 411L918 481');
      for (let j = 0; j < 9; j++) stroke('#9ba78a', 1.2, `M${710 + j * 12} 477L${797 + j * 2.1} ${427 + j * 5}`, { detail: true, op: .5 });
      for (let j = 0; j < 3; j++) {
        const x = 724 + j * 48; add('#8e9e8a', rect(x - 4, 495, 33, 42)); add('@window', rect(x, 499, 25, 34));
        for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 2; xx++) add('@window', rect(x + 1 + xx * 13, 500 + yy * 17, 10, 14), { glow: 'window' });
        add('#c5c8a8', rect(x - 5, 536, 35, 4)); stroke('#c0c4a5', 2.5, `M${x + 12} 499v34M${x} 516h25`);
      }
      add('#6c7f70', rect(867, 511, 16, 59)); add('#c4c6a0', ell(880, 544, 1.6, 1.6));
      for (const x of [696, 909]) { add('#695f46', rect(x, 476, 6, 94)); add('#c6b48a', rect(x, 476, 2, 94)); }
      // Subtle eave lamps cast a warm shelf of light after dusk.
      for (let j = 0; j < 7; j++) add('@lamp', ell(709 + j * 29, 480, 2.4, 2), { glow: 'lamp' });
      lit.push({ f: '#ffdf9d', d: 'M712 482H887V491H712Z', op: .12, m: M });
      return { body, lit };
    },
  });
})();
