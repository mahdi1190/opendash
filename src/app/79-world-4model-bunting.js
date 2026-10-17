/* ---------- seafront BUNTING as a model (17 Oct, detail/pier) ----------
   street.bunting: a line of small triangular pennants hung in a shallow catenary between two points: it runs along `facing` for
   `opts.span` metres (default 8), centred on the entity, `opts.height` (default 3.4) at the ends, sagging by `opts.sag` (default 0.45).
   Two slim poles hold it (`opts.posts: false` leaves them out when a scene hangs it between lamp posts or a kiosk and a post). Pennants
   are plain colours (red, white, blue, yellow, green in a seeded order); never a national flag, never lettering. They flutter a little
   by `p.t` when the engine gives the model a time. Passable (a walker goes under it). */
const _WMD_BUNTING_LIVERIES = Object.freeze([
  { name: 'primary', cols: ['#d9423a', '#f6f2e6', '#2f6fb0', '#f2c94c'], line: '#6b5f50', pole: '#d8d2c2' },
  { name: 'pastel', cols: ['#f2a7b8', '#fff3c4', '#9fd6c2', '#a9c7ee', '#f5c08a'], line: '#7a6c5a', pole: '#e8e2d2' },
  { name: 'nautical', cols: ['#fbf8ef', '#c9423a', '#2c4f86'], line: '#5e5548', pole: '#f1ede2' },
  { name: 'garden', cols: ['#e06a3a', '#f2c94c', '#6fae5a', '#e8e2d2'], line: '#6b5f50', pole: '#c9bfa8' },
]);
if (typeof sceneObjDefine === 'function' && !(typeof sceneObj === 'function' && sceneObj('street.bunting'))) sceneObjDefine({
  id: 'street.bunting', category: 'street', size: [800, 340], variants: 1, seasonal: false, flippable: true, real: { h: 4.2, l: 8, w: 0.3 },
  palette: { base: { flag: '#d9423a', line: '#6b5f50' } }, parts: ['body'],
  tags: ['uk', 'coast', 'seaside', 'bunting', 'unlit', 'kit:temperate', 'role:street', 'class:street'],
  credit: 'detail/pier: bunting (the parametric model draws it; this sprite is the fallback)',
  build() { return { body: [['@line', 'M-400 -330Q0 -260 400 -330V-326Q0 -256 -400 -326Z'], ['@flag', 'M-200 -290L-176 -290L-188 -250Z M0 -275L24 -275L12 -235Z M200 -290L224 -290L212 -250Z']] }; },
});
worldModelDefine('bunting', {
  name: 'Bunting', ids: ['street.bunting'], sampleObj: 'street.bunting', solidity: 'passable', faceCap: 400,
  dims() { return { L: 8, B: 0.3, H: 4.2 }; },
  liveries: () => _WMD_BUNTING_LIVERIES,
  samples: [{ livery: 'primary' }, { livery: 'pastel', seed: 3 }, { livery: 'nautical', seed: 5 }, { livery: 'garden', size: 1.4 }],
  footprint(p) { const r = 0.2 * p.size; return [[-r, -r], [r, -r], [r, r], [-r, r]]; },   // the line itself is overhead: only a small mark on the ground (its poles are slim)
  build(p, h) {
    const k = p.size, o = p.opts, S = (typeof o.span === 'number' ? o.span : 8) * k / 2, Y = (typeof o.height === 'number' ? o.height : 3.4) * k, sag = (typeof o.sag === 'number' ? o.sag : 0.45) * k, liv = p.livery;
    const yAt = (a) => Y - sag * (1 - (a / S) * (a / S));
    h.part('line', { layer: 2 });
    if (o.posts !== false) for (const sg of [-1, 1]) h.line([h.P(sg * S, 0, 0), h.P(sg * S, 0, Y + 0.18 * k)], 0.06 * k, h.aged(liv.pole, 'paint'), 'metal', 'pole');
    const pts = []; const n = Math.max(6, Math.min(24, Math.round(S * 2 / (0.8 * k))));
    for (let i = 0; i <= n; i++) { const a = -S + 2 * S * i / n; pts.push(h.P(a, 0, yAt(a))); }
    h.line(pts, 0.012 * k, liv.line, 'fabric', 'cord');
    h.part('flags', { layer: 3 });
    const step = 0.42 * k, nf = Math.max(4, Math.floor(2 * S / step)), off = h.u('off') * 3 | 0;
    for (let i = 0; i < nf; i++) {
      const a = -S + (i + 0.5) * 2 * S / nf, w = 0.17 * k, hh = (0.3 + 0.04 * h.u('fh' + i)) * k, y = yAt(a), sw = p.t == null ? 0 : Math.sin(p.t * 2.2 + i * 0.9 + h.u('ph') * 6) * 0.05 * k;
      const c = h.aged(liv.cols[(i + off) % liv.cols.length], 'fabric');
      h.face([h.P(a - w, 0, y), h.P(a + w, 0, y), h.P(a + sw, 0.02 * k, y - hh)], c, 'fabric', 'pennant', 'two');
    }
    return { height: Y + 0.2 * k };
  },
});
