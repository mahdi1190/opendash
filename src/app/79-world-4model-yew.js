/* ---------- a churchyard yew as a real 3D model (17 Oct, the Cotswold green: "no yews") ----------
   tree.churchyard-yew: the old English yew of a churchyard: a short, thick, fluted reddish trunk (several stems grown together), a
   dense dark crown of overlapping lobes of needles, broad and heavy with a skirt that reaches low, or (opts.form 'column') the narrow
   column of a clipped or Irish yew. Evergreen (material needle: it keeps its colour in autumn and carries snow). 8.5 m tall and 6.5 m
   across at size 1; scale it with model.size. Seeded: the lobes, their lean, the trunk's stems, the tone. */
if (typeof sceneObjDefine === 'function' && !(typeof sceneObj === 'function' && sceneObj('tree.churchyard-yew'))) sceneObjDefine({
  id: 'tree.churchyard-yew', category: 'tree', size: [190, 250], variants: 1, seasonal: false, flippable: true, real: { h: 8.5, l: 6.5, w: 6.5 },
  palette: { base: { crown: '#2c4630', trunk: '#6b4332' } }, parts: ['trunk', 'crown'], tags: ['uk', 'village', 'churchyard', 'evergreen', 'yew', 'kit:temperate', 'role:tree', 'class:tree'],
  credit: 'a churchyard yew (the parametric model draws it; this sprite is the fallback)',
  build() { return { trunk: [['@trunk', 'M-14 0L-9 -50H9L14 0Z']], crown: [['@crown', 'M-90 -40Q-95 -140 0 -240Q95 -140 90 -40Q0 -10 -90 -40Z']] }; },
});
worldModelDefine('churchyard-yew', {
  name: 'Churchyard yew', ids: ['tree.churchyard-yew'], sampleObj: 'tree.churchyard-yew', solidity: 'solid', faceCap: 900,
  dims() { return { L: 6.5, B: 6.5, H: 8.5 }; },
  liveries: [{ name: 'dark', tone: '#2c4630' }, { name: 'green', tone: '#35553a' }, { name: 'olive', tone: '#3a4d2e' }],
  samples: [{ livery: 'dark', seed: 2 }, { livery: 'green', seed: 5, opts: { form: 'column' } }, { livery: 'olive', seed: 8, size: 0.8 }, { livery: 'dark', seed: 11, age: 0.9 }],
  footprint(p) { const r = 0.55 * p.size; return [[-r, -r], [r, -r], [r, r], [-r, r]]; },
  build(p, h) {
    const k = p.size, H = 8.5 * k, R = 3.3 * k, column = (p.opts && p.opts.form === 'column') || h.u('form') < 0.12, rr = h.u('rr');
    const rn = (() => { let a = (p.seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
    h.contactShadow(-R * 0.9, R * 0.9, -R * 0.9, R * 0.9, 0.34);
    const bark = h.aged('#6e4533', 'timber', 0.4), bark2 = h.shade(bark, 0.82);
    h.part('trunk', { layer: 1 });
    // the trunk: three or four stems grown together, fluted, flaring at the foot
    const ns = 3 + Math.floor(rn() * 2);
    for (let i = 0; i < ns; i++) {
      const th = i / ns * Math.PI * 2 + rn() * 0.7, d = 0.16 * k, a = Math.cos(th) * d, l = Math.sin(th) * d, r0 = (0.4 + 0.1 * rn()) * k;
      h.cyl(a, l, 0, 1.0 * k, r0 * 1.25, r0, i % 2 ? bark : bark2, { mat: 'bark', role: 'trunk', n: 7, cap: false });
      h.cyl(a * 1.3, l * 1.3, 1.0 * k, 2.2 * k, r0, r0 * 0.7, i % 2 ? bark2 : bark, { mat: 'bark', role: 'trunk', n: 7 });
    }
    // the crown: overlapping rounded lobes (ellipsoids of needles), a central mass, a ring round it, a low skirt and a top
    const tone = p.livery.tone, lobes = [];
    if (column) {
      for (let i = 0; i < 6; i++) { const t = (i + 0.5) / 6; lobes.push([(rn() - 0.5) * 0.3 * k, (rn() - 0.5) * 0.3 * k, 0.9 * k + (H - 0.9 * k) * t, R * 0.42 * (0.6 + 0.5 * Math.sin(Math.PI * (0.15 + 0.8 * t))), (H - 0.9 * k) * 0.16]); }
    } else {
      lobes.push([0, 0, 0.56 * H, R * 0.78, 0.34 * H], [0, 0, 0.86 * H, R * 0.42, 0.17 * H]);
      for (let i = 0; i < 7; i++) { const th = i / 7 * Math.PI * 2 + rn() * 0.5, d = R * (0.5 + 0.2 * rn()); lobes.push([Math.cos(th) * d, Math.sin(th) * d, H * (0.34 + 0.3 * rn()), R * (0.46 + 0.12 * rn()), H * (0.17 + 0.05 * rn())]); }
      for (let i = 0; i < 6; i++) { const th = i / 6 * Math.PI * 2 + rn() * 0.7, d = R * (0.72 + 0.14 * rn()); lobes.push([Math.cos(th) * d, Math.sin(th) * d, H * (0.2 + 0.05 * rn()), R * (0.4 + 0.1 * rn()), H * 0.1]); }
      for (let i = 0; i < 3; i++) { const th = rn() * 6.28, d = R * 0.3; lobes.push([Math.cos(th) * d, Math.sin(th) * d, H * (0.74 + 0.1 * rn()), R * 0.34, H * 0.13]); }
    }
    const lats = [-72, -38, 0, 38, 72].map(d => d * Math.PI / 180), NS = 9;
    lobes.forEach(([la, ll, ly, lr, lh], i) => {
      h.part('lobe' + i, { layer: 2, key: h.depth(la, ll, ly) });
      const col = h.shade(tone, 0.8 + 0.36 * rn()), ph = rn() * 6.28, jit = Array.from({ length: NS }, () => 0.88 + 0.22 * rn());
      const ring = (la2) => jit.map((j, q) => [la + Math.cos(ph + q / NS * Math.PI * 2) * lr * Math.cos(la2) * j, ll + Math.sin(ph + q / NS * Math.PI * 2) * lr * Math.cos(la2) * j]);
      for (let q = 0; q < lats.length - 1; q++) h.frustum(ring(lats[q]), ly + lh * Math.sin(lats[q]), ring(lats[q + 1]), ly + lh * Math.sin(lats[q + 1]), col, { mat: 'needle', role: 'crown', cap: q === lats.length - 2 ? col : false, inside: h.P(la, ll, ly) });
      h.face(ring(lats[0]).map(([x, y]) => h.P(x, y, ly + lh * Math.sin(lats[0]))), h.shade(col, 0.7), 'needle', 'crown', h.P(la, ll, ly));
    });
    return { height: H };
  },
});
