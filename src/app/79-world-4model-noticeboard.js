/* ---------- a village noticeboard as a real 3D model (17 Oct, the Cotswold green: "a noticeboard") ----------
   street.noticeboard: the parish noticeboard on a village green: two timber posts, a glazed cabinet with a pitched cap and a header
   board, a cork back with pinned sheets (paper rectangles at slight angles in off-white, pale blue, yellow: never any lettering), a
   small shelf. 2.1 m tall, 1.3 m wide at size 1. The glazed face looks along `facing`; both faces are the same (a board on posts). */
const _WMD_NB_LIVERIES = Object.freeze([
  { name: 'oak', post: '#6d5a44', frame: '#5c4a38', cork: '#b98d5b', cap: '#4e5a52' },
  { name: 'green', post: '#35503f', frame: '#2c4535', cork: '#b58a58', cap: '#2c4535' },
  { name: 'black', post: '#2b2b2c', frame: '#242526', cork: '#a9824f', cap: '#3a3d40' },
]);
if (typeof sceneObjDefine === 'function' && !(typeof sceneObj === 'function' && sceneObj('street.noticeboard'))) sceneObjDefine({
  id: 'street.noticeboard', category: 'street', size: [60, 105], variants: 1, seasonal: false, flippable: true, real: { h: 2.1, l: 1.3, w: 0.25 },
  palette: { base: { post: '#6d5a44', cork: '#b98d5b' } }, parts: ['body'], tags: ['uk', 'village', 'blank', 'unlit', 'kit:temperate', 'role:street', 'class:street'],
  credit: 'a village noticeboard (the parametric model draws it; this sprite is the fallback)',
  build() { return { body: [['@post', 'M-28 0V-100H-24V0Z'], ['@post', 'M24 0V-100H28V0Z'], ['@cork', 'M-26 -96H26V-48H-26Z']] }; },
});
worldModelDefine('noticeboard', {
  name: 'Village noticeboard', ids: ['street.noticeboard'], sampleObj: 'street.noticeboard', solidity: 'passable', faceCap: 300,
  dims() { return { L: 0.25, B: 1.3, H: 2.1 }; },
  liveries: () => _WMD_NB_LIVERIES,
  samples: [{ livery: 'oak', seed: 2 }, { livery: 'green', seed: 4 }, { livery: 'black', seed: 7, age: 0.6 }, { livery: 'oak', size: 1.2, seed: 9 }],
  build(p, h) {
    const k = p.size, liv = p.livery, post = h.aged(liv.post, 'timber'), frame = h.aged(liv.frame, 'timber'), hw = 0.64 * k, yb = 0.95 * k, yt = 1.95 * k;
    const rn = (() => { let a = (p.seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
    h.contactShadow(-0.3 * k, 0.3 * k, -hw - 0.1 * k, hw + 0.1 * k, 0.28);
    h.part('posts', { layer: 1 });
    for (const l of [-hw + 0.05 * k, hw - 0.05 * k]) h.box(-0.05 * k, 0.05 * k, l - 0.055 * k, l + 0.055 * k, 0, yt + 0.12 * k, post, post, 'timber', 'post');
    h.part('cabinet', { layer: 2 });
    h.box(-0.07 * k, 0.07 * k, -hw, hw, yb, yt, frame, frame, 'timber', 'cabinet');
    h.gable(-0.12 * k, 0.12 * k, -hw - 0.06 * k, hw + 0.06 * k, yt, yt + 0.22 * k, h.aged(liv.cap, 'paint'), { mat: 'slate', ridge: 'l', over: 0.04 * k });
    h.box(-0.12 * k, 0.12 * k, -hw, hw, yb - 0.08 * k, yb, frame, frame, 'timber', 'shelf');
    for (const sg of [-1, 1]) {
      if (!h.sees([sg, 0, 0], [sg * 0.07 * k, 0, (yb + yt) / 2])) continue;
      const S = h.surface((u, v, off) => h.P(sg * (0.07 * k + off), u, v), { normal: [sg, 0, 0] });
      S.rect(-hw + 0.07 * k, hw - 0.07 * k, yb + 0.07 * k, yt - 0.07 * k, liv.cork, 'timber', 'cork', 0.006);
      S.rect(-hw + 0.04 * k, hw - 0.04 * k, yt - 0.2 * k, yt - 0.05 * k, h.shade(frame, 1.1), 'timber', 'header', 0.01);
      const cols = ['#ece6d4', '#dfe4e8', '#efe2a6', '#e8d7d0', '#f2efe6'], n = 5 + Math.floor(rn() * 4);
      for (let i = 0; i < n; i++) {
        const u = -hw + 0.18 * k + rn() * (2 * hw - 0.36 * k), v = yb + 0.18 * k + rn() * (yt - yb - 0.5 * k), w = (0.13 + 0.1 * rn()) * k, hh = (0.17 + 0.12 * rn()) * k, tilt = (rn() - 0.5) * 0.12 * k;
        S.rect(u - w / 2, u + w / 2, v - hh / 2 + tilt * 0.3, v + hh / 2 - tilt * 0.3, cols[Math.floor(rn() * cols.length)], 'fabric', 'sheet', 0.012);
        if (h.fine) S.rect(u - w * 0.35, u + w * 0.35, v + hh * 0.2, v + hh * 0.3, '#7a7466', 'fabric', 'sheet-mark', 0.014);
      }
      S.rect(-hw + 0.07 * k, hw - 0.07 * k, yb + 0.07 * k, yt - 0.07 * k, '#bcd0d8', 'glass', 'glazing', 0.02, { alpha: 0.12 });
    }
    return { height: yt + 0.3 * k };
  },
});
