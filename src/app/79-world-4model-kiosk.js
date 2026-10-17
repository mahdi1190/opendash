/* ---------- a seafront KIOSK as a real 3D model (17 Oct, detail/pier) ----------
   building.kiosk: the little serving hut of an English promenade or pier: a timber box on a plinth with a serving hatch, a striped
   canopy (an awning with a scalloped valance) over the counter, a gabled roof, a roof sign on posts (a board with a painted ring and
   bands, never lettering), a menu board beside the hatch, a side window. `opts.kind` chooses what it sells: 'icecream' (a big cone and
   scoops on the roof), 'tea' (a chimney and a cup sign), 'arcade' (a deeper hall with two arched lights and a border of bulbs that is lit at
   night), 'tackle' (rods leaning at the wall, a net, a bait-box sign). Seeded by the entity when no kind is given. Its door/hatch faces along
   `facing`; it is a solid on the nav grid (a walker never crosses it), so it can stand on a promenade or on a pier deck.
   Scale with `model: { size }`; the liveries are the paint and the canopy colours. */
const _WMD_KIOSK_LIVERIES = Object.freeze([
  { name: 'cream-red', wall: '#efe6cc', trim: '#fbf8ef', awn: ['#c9423a', '#f6f2e6'], roof: '#4a4e57', sign: '#c9423a', sign2: '#f6f2e6' },
  { name: 'mint-white', wall: '#a8d8c4', trim: '#fbf8ef', awn: ['#2f8a86', '#f6f2e6'], roof: '#59626c', sign: '#2f8a86', sign2: '#fbf8ef' },
  { name: 'pink-cream', wall: '#f2c4cf', trim: '#fbf8ef', awn: ['#e0708f', '#f6f2e6'], roof: '#6c4a40', sign: '#e0708f', sign2: '#fbf8ef' },
  { name: 'blue-white', wall: '#fbf8ef', trim: '#2c4f86', awn: ['#2c4f86', '#f6f2e6'], roof: '#4a4e57', sign: '#2c4f86', sign2: '#f2cf68' },
  { name: 'butter-green', wall: '#f0d878', trim: '#fbf8ef', awn: ['#3c8a5a', '#f6f2e6'], roof: '#59626c', sign: '#3c8a5a', sign2: '#f6f2e6' },
  { name: 'navy-cream', wall: '#35527a', trim: '#efe6cc', awn: ['#efe6cc', '#35527a'], roof: '#3f4850', sign: '#efe6cc', sign2: '#c9423a' },
]);
if (typeof sceneObjDefine === 'function' && !(typeof sceneObj === 'function' && sceneObj('building.kiosk'))) sceneObjDefine({
  id: 'building.kiosk', category: 'building', size: [300, 340], variants: 1, seasonal: false, flippable: true, real: { h: 3.8, l: 2.6, w: 3.2 },
  palette: { base: { wall: '#efe6cc', roof: '#4a4e57', awn: '#c9423a' } }, parts: ['body'],
  tags: ['uk', 'coast', 'seaside', 'promenade', 'kiosk', 'unlit', 'kit:temperate', 'kit:water', 'role:building-near', 'class:building'],
  credit: 'detail/pier: a seafront kiosk (the parametric model draws it; this sprite is the fallback)',
  build() { return { body: [['@wall', 'M-130 0V-230H130V0Z'], ['@roof', 'M-150 -228L0 -300L150 -228Z'], ['@awn', 'M-110 -200H110L125 -150H-125Z']] }; },
});
worldModelDefine('kiosk', {
  name: 'Seafront kiosk', ids: ['building.kiosk', 'landmark.kiosk-uk'], sampleObj: 'building.kiosk', solidity: 'solid', faceCap: 900,
  dims() { return { L: 2.6, B: 3.2, H: 3.4 }; },
  liveries: () => _WMD_KIOSK_LIVERIES,
  samples: [{ livery: 'cream-red', seed: 2 }, { livery: 'mint-white', seed: 9 }, { livery: 'pink-cream', seed: 4, size: 1.2 }, { livery: 'blue-white', age: 0.5, seed: 11 }],
  footprint(p) { const k = p.size; return [[-1.2 * k, -1.6 * k], [2.1 * k, -1.6 * k], [2.1 * k, 1.6 * k], [-1.2 * k, 1.6 * k]]; },
  build(p, h) {
    const k = p.size, o = p.opts, liv = p.livery, A = (c, m) => h.aged(c, m || 'paint');
    const kinds = ['icecream', 'tea', 'arcade', 'tackle'], kind = typeof o.kind === 'string' ? o.kind : kinds[Math.min(3, Math.floor(h.u('kind') * 4))];
    const hw = 1.4 * k, a0 = -1.1 * k * (kind === 'arcade' ? 1.15 : 1), a1 = 1.0 * k, yF = 0.15 * k, yE = 2.3 * k;
    const wall = A(liv.wall), trim = A(liv.trim), roofC = A(liv.roof, 'metal'), awn = [A(liv.awn[0]), A(liv.awn[1])];
    h.contactShadow(a0 - 0.2 * k, 2.0 * k, -hw - 0.3 * k, hw + 0.3 * k, 0.3);
    h.part('plinth', { layer: 1 });
    const timber = h.aged('#8f7a5e', 'timber');
    h.box(a0 - 0.06 * k, a1 + 0.1 * k, -hw - 0.06 * k, hw + 0.06 * k, 0, yF, timber, timber, 'timber', 'plinth');
    h.part('body', { layer: 2 });
    h.box(a0, a1, -hw, hw, yF, yE, wall, wall, 'paint', 'wall');
    const FS = h.surface((u, v, off) => h.P(a1 + off, u, v), { normal: [1, 0, 0] });
    const SS = (sg) => h.surface((u, v, off) => h.P(0.1 * k + u, sg * (hw + off), v), { normal: [0, sg, 0] });
    const front = h.sees([1, 0, 0], [a1, 0, 1]), sides = [-1, 1].filter(sg => h.sees([0, sg, 0], [0, sg * hw, 1]));
    // corner boards, a skirting and a cornice
    for (const sg of [-1, 1]) h.box(a1 - 0.02 * k, a1 + 0.05 * k, sg * hw - 0.06 * k, sg * hw + 0.06 * k, yF, yE, trim, trim, 'paint', 'corner');
    if (front) FS.rect(-hw, hw, yE - 0.14 * k, yE, trim, 'paint', 'cornice', 0.01);
    // the serving hatch: a dark opening, a counter, shutters thrown back, things on the shelf
    const hwid = (kind === 'arcade' ? 1.1 : 0.82) * k, dc = kind === 'arcade' ? 0 : (h.u('hpos') - 0.5) * 0.5 * k, yh0 = 0.98 * k, yh1 = 1.95 * k;
    if (front) {
      FS.rect(dc - hwid - 0.07 * k, dc + hwid + 0.07 * k, yh0 - 0.07 * k, yh1 + 0.07 * k, trim, 'paint', 'frame', 0.008);
      FS.rect(dc - hwid, dc + hwid, yh0, yh1, '#2a211c', 'timber', 'hatch', 0.012, h.litFx(false, '#ffcf80'));
      if (h.fine) {
        FS.rect(dc - hwid, dc + hwid, yh0 + 0.55 * k, yh0 + 0.58 * k, '#6b5a48', 'timber', 'shelf', 0.016);
        const cols = ['#c9423a', '#f2cf68', '#2f8a86', '#f6f2e6', '#e0708f'];
        for (let i = 0; i < 6; i++) { const u = dc - hwid + 0.15 * k + i * (hwid * 2 - 0.3 * k) / 5; FS.rect(u - 0.05 * k, u + 0.05 * k, yh0 + 0.58 * k, yh0 + 0.58 * k + (0.14 + 0.08 * h.u('bt' + i)) * k, cols[(i + Math.floor(h.u('bc') * 5)) % 5], 'paint', 'goods', 0.018); }
      }
      for (const sg of [-1, 1]) FS.rect(dc + sg * hwid, dc + sg * (hwid + 0.34 * k), yh0, yh1, A(liv.sign), 'paint', 'shutter', 0.02);   // the shutters, thrown back flat on the wall
      // a menu board beside the hatch: a blackboard of painted bars (never lettering)
      const mb = dc + (dc > 0 ? -1 : 1) * (hwid + 0.62 * k);
      if (Math.abs(mb) < hw - 0.28 * k) {
        FS.rect(mb - 0.24 * k, mb + 0.24 * k, 1.0 * k, 1.75 * k, '#2d3a35', 'paint', 'menu', 0.012);
        if (h.fine) for (let i = 0; i < 5; i++) FS.rect(mb - 0.18 * k, mb - 0.18 * k + (0.14 + 0.2 * h.u('mb' + i)) * k, 1.6 * k - i * 0.13 * k, 1.64 * k - i * 0.13 * k, '#efe6cc', 'paint', 'menu-line', 0.016);
      }
    }
    // side light
    for (const sg of sides) SS(sg).windows({ u0: -0.2 * k, u1: 0.1 * k, v: 1.45 * k, step: 9, kind: 'rect', w: 0.25 * k, h: 0.28 * k, glass: '#7da0ae', trim, dark: 0.3 });
    if (kind === 'arcade') {
      for (const sg of sides) { SS(sg).windows({ u0: -0.95 * k, u1: -0.5 * k, v: 1.5 * k, step: 9, kind: 'rect', w: 0.22 * k, h: 0.45 * k, glass: '#7da0ae', trim, dark: 0.2 }); }
    }
    if (kind === 'tackle' && h.fine) {   // rods leaning at the front wall, a net
      for (let i = 0; i < 3; i++) h.line([h.P(a1 + 0.1 * k, hw - 0.3 * k - i * 0.1 * k, 0.2 * k), h.P(a1 + 0.02 * k, hw - 0.35 * k - i * 0.1 * k, 2.2 * k)], 0.02 * k, ['#3b3028', '#5a4634', '#2a2a2a'][i], 'timber', 'rod');
      h.disc(h.P(a1 + 0.06 * k, -hw + 0.4 * k, 1.5 * k), 0.26 * k, '#8d8a52', 'fabric', 'net', 1);
    }
    // ---- the canopy over the counter: a striped awning with a scalloped valance ----
    h.part('awning', { layer: 3 });
    const ac0 = dc - hwid - 0.35 * k, ac1 = dc + hwid + 0.35 * k, ya0 = yh1 + 0.22 * k, ya1 = yh1 - 0.35 * k, aOut = a1 + 1.05 * k;
    h.cloth([[a1, ac0, ya0], [a1, ac1, ya0], [aOut, ac1, ya1], [aOut, ac0, ya1]], 0.035 * k, awn[0], { stripe: awn, nu: Math.max(6, Math.round((ac1 - ac0) / (0.2 * k))), nv: 2, role: 'awning' });
    // the valance: a short hanging strip with a scalloped lower edge (little triangles)
    const nvl = Math.max(6, Math.round((ac1 - ac0) / (0.2 * k)));
    for (let i = 0; i < nvl; i++) {
      const u0 = ac0 + (ac1 - ac0) * i / nvl, u1 = ac0 + (ac1 - ac0) * (i + 1) / nvl, c = awn[i % 2];
      h.face([h.P(aOut, u0, ya1), h.P(aOut, u1, ya1), h.P(aOut, (u0 + u1) / 2, ya1 - 0.2 * k)], c, 'fabric', 'valance', null);
      h.face([h.P(aOut, u0, ya1), h.P(aOut, u1, ya1), h.P(aOut, u1, ya1 - 0.1 * k), h.P(aOut, u0, ya1 - 0.1 * k)], c, 'fabric', 'valance', null);
    }
    if (kind === 'arcade') for (let i = 0; i <= nvl; i++) { const u = ac0 + (ac1 - ac0) * i / nvl; h.disc(h.P(aOut + 0.02 * k, u, ya1 + 0.06 * k), 0.045 * k, '#fff2c0', 'glass', 'bulb', 1, { theta: 0, lit: '#ffe9a0', halo: true }); }
    // ---- the roof, the roof sign on posts, and what stands on the ridge ----
    h.part('roof', { layer: 4 });
    const ov = 0.2 * k, pitch = 0.32 + 0.2 * h.u('pitch'), yR = yE + (a1 - a0 + 2 * ov) / 2 * pitch;
    h.gable(a0, a1, -hw, hw, yE, yR, roofC, { mat: 'tile', over: ov, ridge: 'l', end: wall, endMat: 'paint', role: 'roof' });
    // a sign board standing on the front of the roof
    const sw = hw * 0.62, sy0 = yE + 0.12 * k, sy1 = yE + 0.95 * k, sa = a1 + ov - 0.05 * k;
    for (const sg of [-1, 1]) h.line([h.P(sa, sg * sw * 0.85, yE), h.P(sa, sg * sw * 0.85, sy0)], 0.05 * k, trim, 'paint', 'post');
    h.box(sa - 0.03 * k, sa + 0.03 * k, -sw, sw, sy0, sy1, A(liv.sign), A(liv.sign), 'paint', 'sign');
    const SG = h.surface((u, v, off) => h.P(sa + 0.03 * k + off, u, v), { normal: [1, 0, 0] });
    if (h.sees([1, 0, 0], [sa, 0, sy1])) {
      SG.rect(-sw, sw, sy1 - 0.07 * k, sy1, A(liv.sign2), 'paint', 'band', 0.006); SG.rect(-sw, sw, sy0, sy0 + 0.07 * k, A(liv.sign2), 'paint', 'band', 0.006);
      if (kind === 'icecream') { SG.ring(0, (sy0 + sy1) / 2, 0.24 * k, A(liv.sign2), 'paint', 'emblem', 0.01); SG.ring(0, (sy0 + sy1) / 2, 0.15 * k, A(liv.sign), 'paint', 'emblem', 0.012); }
      else if (kind === 'tea') { SG.rect(-0.2 * k, 0.2 * k, sy0 + 0.2 * k, sy0 + 0.42 * k, A(liv.sign2), 'paint', 'emblem', 0.01); SG.ring(0.26 * k, sy0 + 0.31 * k, 0.1 * k, A(liv.sign2), 'paint', 'emblem', 0.01); }
      else if (kind === 'tackle') { SG.rect(-0.4 * k, 0.4 * k, (sy0 + sy1) / 2 - 0.03 * k, (sy0 + sy1) / 2 + 0.03 * k, A(liv.sign2), 'paint', 'emblem', 0.01); SG.ring(0.4 * k, (sy0 + sy1) / 2 - 0.12 * k, 0.1 * k, A(liv.sign2), 'paint', 'emblem', 0.01, null, [Math.PI, 2 * Math.PI]); }
      else for (let i = -3; i <= 3; i++) SG.rect(i * sw * 0.26 - 0.05 * k, i * sw * 0.26 + 0.05 * k, sy0 + 0.2 * k, sy1 - 0.2 * k, A(liv.sign2), 'paint', 'emblem', 0.01);
      if (kind === 'arcade') for (let i = 0; i <= 8; i++) h.disc(h.P(sa + 0.07 * k, -sw + (2 * sw) * i / 8, sy1 + 0.07 * k), 0.04 * k, '#fff2c0', 'glass', 'bulb', 1, { theta: 0, lit: '#ffe9a0', halo: true });
    }
    h.part('crown', { layer: 5 });
    const rm = (a0 + a1) / 2;
    if (kind === 'icecream') {   // a big cone with two scoops and a cherry on the ridge
      const cone = A('#d9a85a', 'paint'), cy = yR + 0.02 * k;
      h.frustum(h.ngon(rm, 0, 0.03 * k, 8), cy, h.ngon(rm, 0, 0.3 * k, 8), cy + 0.7 * k, cone, { mat: 'paint', role: 'cone', cap: false });
      h.disc(h.P(rm, 0, cy + 0.82 * k), 0.33 * k, A('#f2c4cf'), 'paint', 'scoop', 0.9); h.disc(h.P(rm, 0, cy + 1.12 * k), 0.27 * k, A('#f6f2e6'), 'paint', 'scoop', 0.9); h.disc(h.P(rm, 0, cy + 1.38 * k), 0.07 * k, '#c9423a', 'paint', 'cherry', 1);
    } else if (kind === 'tea') {
      h.box(rm - 0.5 * k, rm - 0.15 * k, 0.5 * k, 0.85 * k, yR - 0.35 * k, yR + 0.55 * k, h.aged('#8a6a52', 'paint'), h.aged('#8a6a52', 'paint'), 'brick', 'chimney');
    } else {
      h.line([h.P(rm, 0, yR), h.P(rm, 0, yR + 0.7 * k)], 0.04 * k, trim, 'metal', 'finial'); h.disc(h.P(rm, 0, yR + 0.75 * k), 0.06 * k, trim, 'paint', 'ball', 1);
    }
    return { height: (yR + (kind === 'icecream' ? 1.5 : 0.8) * k) };
  },
});
