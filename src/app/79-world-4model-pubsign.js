/* ---------- a village pub sign as a real 3D model (16 Oct, "engine work needed" of the fast-scene test) ----------
   street.pub-sign: the freestanding inn sign of an English village: two timber posts with turned finials, a cross beam, and a
   painted board hanging between them on two irons (a double-sided board: its two faces are painted, an emblem on each: a ring
   and a bar, never lettering). 2.9 m tall, 1.5 m wide; it faces along `facing` (the board's face looks that way). */
const _WMD_PUBSIGN_LIVERIES = Object.freeze([
  { name: 'red', post: '#2e2a26', board: '#8a2a24', emblem: '#e9d39a', trim: '#e9d39a' },
  { name: 'green', post: '#2e2a26', board: '#2f5a3e', emblem: '#f0e4b8', trim: '#d9b44a' },
  { name: 'blue', post: '#2b2d33', board: '#27456b', emblem: '#f1ead2', trim: '#d9b44a' },
  { name: 'cream', post: '#2e2a26', board: '#e8dcb8', emblem: '#7a1f2b', trim: '#2f5a3e' },
]);
if (typeof sceneObjDefine === 'function' && !(typeof sceneObj === 'function' && sceneObj('street.pub-sign'))) sceneObjDefine({
  id: 'street.pub-sign', category: 'street', size: [90, 290], variants: 1, seasonal: false, flippable: true, real: { h: 2.9, l: 1.5, w: 0.25 },
  palette: { base: { post: '#2e2a26', board: '#8a2a24' } }, parts: ['body'],
  tags: ['uk', 'pub', 'blank', 'kit:urban', 'role:street', 'class:street'],
  credit: 'fast-scene test: a village inn sign (the parametric model draws it; this sprite is the fallback)',
  build() { return { body: [['@post', 'M-38 0V-280H-32V0Z'], ['@post', 'M32 0V-280H38V0Z'], ['@post', 'M-40 -280H40V-272H-40Z'], ['@board', 'M-30 -262H30V-170H-30Z']] }; },
});
worldModelDefine('pub-sign', {
  name: 'Village pub sign', ids: ['street.pub-sign'], sampleObj: 'street.pub-sign', solidity: 'passable', faceCap: 400,
  dims() { return { L: 0.3, B: 1.5, H: 2.9 }; },
  liveries: () => _WMD_PUBSIGN_LIVERIES,
  samples: [{ livery: 'red' }, { livery: 'green' }, { livery: 'blue', age: 0.6 }, { livery: 'cream', size: 1.15 }],
  build(p, h) {
    const k = p.size, liv = p.livery, post = h.aged(liv.post, 'timber'), hw = 0.72 * k, H = 2.9 * k;
    h.contactShadow(-0.3 * k, 0.3 * k, -hw - 0.2 * k, hw + 0.2 * k, 0.25);
    h.part('posts', { layer: 1 });
    for (const l of [-hw, hw]) {
      h.box(-0.07 * k, 0.07 * k, l - 0.07 * k, l + 0.07 * k, 0, H, post, post, 'timber', 'post');
      h.cyl(0, l, H, H + 0.16 * k, 0.1 * k, 0.07 * k, post, { mat: 'timber', role: 'finial', n: 6 });
    }
    h.box(-0.05 * k, 0.05 * k, -hw - 0.05 * k, hw + 0.05 * k, H - 0.12 * k, H, post, post, 'timber', 'beam');
    // the board hangs on two irons; both faces are painted (the one the eye is on is drawn last)
    h.part('board', { layer: 2 });
    const y0 = H - 1.08 * k, y1 = H - 0.2 * k, bw = hw - 0.14 * k, board = h.aged(liv.board, 'paint');
    for (const l of [-bw * 0.7, bw * 0.7]) h.line([h.P(0, l, H - 0.12 * k), h.P(0, l, y1)], 0.02 * k, '#1a1a1c', 'metal', 'iron');
    h.box(-0.025 * k, 0.025 * k, -bw, bw, y0, y1, board, board, 'paint', 'board');
    for (const sg of [-1, 1]) {
      const S = h.surface((u, v, off) => h.P(sg * (0.027 * k + off), u, v), { normal: [sg, 0, 0] });
      S.rect(-bw, bw, y1 - 0.06 * k, y1, liv.trim, 'paint', 'border');
      S.rect(-bw, bw, y0, y0 + 0.06 * k, liv.trim, 'paint', 'border');
      S.ring(0, (y0 + y1) / 2, 0.27 * k, liv.emblem, 'paint', 'emblem');
      S.ring(0, (y0 + y1) / 2, 0.17 * k, board, 'paint', 'emblem');
      S.rect(-0.05 * k, 0.05 * k, y0 + 0.12 * k, y1 - 0.12 * k, liv.emblem, 'paint', 'emblem');
    }
    return { height: H + 0.16 * k };
  },
});
