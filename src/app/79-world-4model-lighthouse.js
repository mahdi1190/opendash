/* ---------- a lighthouse as a real 3D model (16 Oct, "engine work needed" of the fast-scene test) ----------
   structure.lighthouse: a tapering round masonry tower in bands (white, white with a red band, black and white hoops, plain
   stone), a stone plinth, small slit windows on the side the eye sees, a corbelled gallery with a railing, a glazed lantern room
   with its lamp (lit after dusk), a domed copper roof with a ball and vane, and (by seed) a keeper's cottage against the foot.
   Seen from any angle; 22 m at size 1. Scale it with `model: { size }`; the liveries are the bands. */
const _WMD_LH_LIVERIES = Object.freeze([
  { name: 'white', bands: ['#f1eee4'], stone: '#8d877b', dome: '#2d3b3a', gallery: '#2a2e2f', cottage: '#efe9da', roof: '#4d5558' },
  { name: 'white-red', bands: ['#f1eee4', '#f1eee4', '#b8322a', '#f1eee4'], stone: '#8d877b', dome: '#b8322a', gallery: '#2a2e2f', cottage: '#efe9da', roof: '#5a4640' },
  { name: 'hoops', bands: ['#e9e5da', '#222426', '#e9e5da', '#222426', '#e9e5da'], stone: '#767168', dome: '#222426', gallery: '#222426', cottage: '#e9e5da', roof: '#44474a' },
  { name: 'stone', bands: ['#b9ae95'], stone: '#8a8070', dome: '#3c4a46', gallery: '#34383a', cottage: '#c9bea4', roof: '#5a5a58' },
]);
// the library object the model stands on: a plain sprite (the fallback if the model fails) with its real size
if (typeof sceneObjDefine === 'function' && !(typeof sceneObj === 'function' && sceneObj('structure.lighthouse'))) sceneObjDefine({
  id: 'structure.lighthouse', category: 'structure', size: [90, 240], variants: 1, seasonal: false, flippable: false, real: { h: 22, l: 13, w: 8.6 },
  palette: { base: { tower: '#f1eee4', band: '#b8322a', dark: '#2a2e2f' } }, parts: ['body'],
  tags: ['uk', 'coast', 'lighthouse', 'kit:temperate', 'kit:water', 'role:landmark', 'class:structure'],
  credit: 'fast-scene test: a generic lighthouse (the parametric model draws it; this sprite is the fallback)',
  build() { return { body: [['@tower', 'M-26 0L-15 -200L15 -200L26 0Z'], ['@band', 'M-21 -70L-18 -110L18 -110L21 -70Z'], ['@dark', 'M-19 -200H19V-214H-19Z'], ['@dark', 'M-13 -214L0 -236L13 -214Z']] }; },
});
worldModelDefine('lighthouse', {
  name: 'Lighthouse and keeper\'s cottage', ids: ['structure.lighthouse', 'landmark.lighthouse-uk'], sampleObj: 'structure.lighthouse', solidity: 'solid', faceCap: 1200,
  dims() { return { L: 14, B: 8.6, H: 22 }; },
  liveries: () => _WMD_LH_LIVERIES,
  params(ent, o, p) { return p.liveryKey != null ? null : { liveryKey: Math.abs(ent.variant | 0) % 2 === 0 ? 1 : (p.seed >>> 2) % 4 }; },
  samples: [{ livery: 'white-red' }, { livery: 'white', age: 0.6 }, { livery: 'hoops', size: 1.2 }, { livery: 'stone' }],
  footprint(p) { const r = 3.5 * p.size; return [[-r - 3.2 * p.size, -r], [r, -r], [r, r], [-r - 3.2 * p.size, r]]; },
  build(p, h) {
    const k = p.size, liv = p.livery, age = (c, m) => h.aged(c, m || 'paint');
    const tA = -3.4 * k, H = 22 * k, yBase = 1.0 * k, yG = 16.6 * k, rB = 3.3 * k, rT = 2.25 * k;   // the tower's axis (a), plinth top, gallery floor, radius at the foot and the top
    const r = (y) => rB + (rT - rB) * Math.max(0, Math.min(1, (y - yBase) / (yG - yBase)));
    h.contactShadow(tA - 4.2 * k, tA + 4.2 * k + 7 * k, -4.2 * k, 4.2 * k, 0.3);
    h.part('tower', { layer: 1 });
    h.cyl(tA, 0, 0, yBase, rB + 0.9 * k, rB + 0.5 * k, age(liv.stone, 'stone'), { mat: 'stone', role: 'plinth', n: 16 });
    const bands = liv.bands, nb = bands.length;
    for (let i = 0; i < nb; i++) {
      const y0 = yBase + (yG - yBase) * i / nb, y1 = yBase + (yG - yBase) * (i + 1) / nb;
      h.frustum(h.ngon(tA, 0, r(y0), 16), y0, h.ngon(tA, 0, r(y1), 16), y1, age(bands[i]), { mat: 'render', role: 'tower', cap: false });
    }
    // slit windows on the side the eye sees, and a door at the foot
    const th0 = h.u('wnd') * 6.28;
    for (const [y, ang] of [[4.6 * k, 0.9], [8.2 * k, 3.1], [11.8 * k, 5.2], [14.6 * k, 2.0]]) {
      const th = th0 + ang, rr = r(y);
      if (!h.sees([Math.cos(th), Math.sin(th), 0], [tA + Math.cos(th) * rr, Math.sin(th) * rr, y])) continue;
      const c = h.P(tA + Math.cos(th) * (rr + 0.02), Math.sin(th) * (rr + 0.02), y);
      h.disc(c, 0.2 * k, '#1d2327', 'glass', 'window', 2.6, { theta: 2 });
    }
    // gallery: a corbelled floor, then a railing
    h.part('gallery', { layer: 2 });
    h.frustum(h.ngon(tA, 0, rT + 0.15 * k, 16), yG - 0.7 * k, h.ngon(tA, 0, rT + 1.15 * k, 16), yG, age(liv.stone, 'stone'), { mat: 'stone', role: 'corbel', cap: age(liv.gallery, 'metal') });
    h.part('lantern', { layer: 3 });
    const yL0 = yG, yL1 = yG + 3.1 * k, rL = 1.55 * k;
    h.cyl(tA, 0, yL0, yL0 + 0.55 * k, rL + 0.1 * k, rL + 0.1 * k, age(liv.gallery, 'metal'), { mat: 'metal', role: 'lantern-base', n: 12 });
    h.cyl(tA, 0, yL0 + 0.55 * k, yL1, rL, rL, '#b9d3d8', { mat: 'glass', role: 'lantern', n: 12, cap: false });
    h.lamp(tA, 0, (yL0 + yL1) / 2 + 0.2 * k, 0.62 * k, { col: '#fff3c0', kind: 'lighthouse' });
    for (let i = 0; i < 12; i++) { const th = i / 12 * 6.283; h.line([h.P(tA + Math.cos(th) * (rL + 0.03), Math.sin(th) * (rL + 0.03), yL0 + 0.55 * k), h.P(tA + Math.cos(th) * (rL + 0.03), Math.sin(th) * (rL + 0.03), yL1)], 0.07 * k, age(liv.gallery, 'metal'), 'metal', 'glazing-bar'); }
    h.cyl(tA, 0, yL1, yL1 + 0.3 * k, rL + 0.35 * k, rL + 0.2 * k, age(liv.dome, 'metal'), { mat: 'metal', role: 'eaves', n: 12 });
    h.frustum(h.ngon(tA, 0, rL + 0.2 * k, 12), yL1 + 0.3 * k, h.ngon(tA, 0, 0.25 * k, 12), yL1 + 1.7 * k, age(liv.dome, 'metal'), { mat: 'metal', role: 'dome' });
    h.line([h.P(tA, 0, yL1 + 1.6 * k), h.P(tA, 0, yL1 + 2.8 * k)], 0.06 * k, age(liv.gallery, 'metal'), 'metal', 'vane');
    h.disc(h.P(tA, 0, yL1 + 1.75 * k), 0.17 * k, age(liv.gallery, 'metal'), 'metal', 'ball', 1);
    // the gallery railing is drawn last of the tower (it stands in front of the lantern from low eyes)
    h.part('rail', { layer: 4 });
    const ring = []; for (let i = 0; i <= 16; i++) { const th = i / 16 * 6.283; ring.push([tA + Math.cos(th) * (rT + 1.05 * k), Math.sin(th) * (rT + 1.05 * k)]); }
    h.rail(ring, yG, 1.05 * k, age(liv.gallery, 'metal'), { post: 0.9 * k, mid: true, w: 0.035 * k });
    // the keeper's cottage against the foot (some lighthouses have none)
    if (h.u('cottage') < 0.8) {
      h.part('cottage', { layer: 1, key: h.depth(tA + 6 * k, 0, 2) });
      const a0 = tA + rB * 0.6, a1 = a0 + 6.2 * k, l0 = -2.6 * k, l1 = 2.6 * k, ye = 2.9 * k;
      h.box(a0, a1, l0, l1, 0, ye, age(liv.cottage), age(liv.cottage), 'render', 'wall');
      h.gable(a0 - 0.2 * k, a1 + 0.2 * k, l0 - 0.2 * k, l1 + 0.2 * k, ye, ye + 1.5 * k, age(liv.roof, 'paint'), { mat: 'slate', ridge: 'a' });
      h.box(a1 - 0.5 * k, a1 - 0.1 * k, -0.35 * k, 0.35 * k, ye, ye + 2.1 * k, '#8a6a52', '#8a6a52', 'brick', 'chimney');
      const S = h.surface((u, v, off) => h.P(a1 + off, u, v), { normal: [1, 0, 0] });
      S.windows({ u0: -1.6 * k, u1: 1.9 * k, v: 1.55 * k, step: 2.2 * k, kind: 'rect', w: 0.38 * k, h: 0.5 * k, glass: '#2c3a44', trim: '#f4f1e6', dark: 0.3 });
      S.rect(-0.45 * k, 0.45 * k, 0, 1.9 * k, '#3a4a3e', 'timber', 'door');
    }
    return { height: (yL1 + 2.8 * k) };
  },
});
