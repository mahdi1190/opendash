/* ---------- a seaside beach hut as a real 3D model, and a generator for varied ROWS of them (17 Oct, detail/pier) ----------
   building.beach-hut: one painted timber hut of the English seafront, about 2 m wide and 2 m deep, 2.2 m to the eaves, on a low timber
   plinth, a front-gabled felt or tile roof with white bargeboards and a ball finial. Everything that makes two huts different is a
   parameter (model.opts, else seeded by the entity): the paint (solid, vertical stripes, or a darker clapboard skirt), the door (single,
   double, stable, or standing open on a dark interior with a towel on a hook), a window (a side light, a front porthole, or none), the
   roof pitch, a little VERANDA (the roof carried forward on two posts over a deck), the number plate (marks, never lettering), a deck
   chair in front, a striped windbreak beside it, a towel line. A hut faces along `facing` (its door looks that way).
   worldBeachHutRow({ from, to, facing, ... }) returns the entities of a row of huts that do not repeat: a seeded mix of paint,
   pitch, doors, gaps for a deck chair or a windbreak, small size jitter, drawn along a line (a scene spreads it into `entities`). */
const _WMD_BH_LIVERIES = Object.freeze([
  { name: 'mint', body: '#9bd3bd', alt: '#f6f2e6', trim: '#fbf8ef', door: '#2f7f86', roof: '#59626c' },
  { name: 'coral', body: '#e9695d', alt: '#f6f2e6', trim: '#fbf8ef', door: '#f6f2e6', roof: '#4a4e57' },
  { name: 'sky', body: '#79b4de', alt: '#f6f2e6', trim: '#fbf8ef', door: '#e9695d', roof: '#6c4a40' },
  { name: 'butter', body: '#f2cf68', alt: '#f6f2e6', trim: '#fbf8ef', door: '#356f9c', roof: '#59626c' },
  { name: 'navy-stripe', body: '#f6f2e6', alt: '#2c4f86', trim: '#fbf8ef', door: '#2c4f86', roof: '#4a4e57' },
  { name: 'pink-stripe', body: '#f6f2e6', alt: '#ec86a4', trim: '#fbf8ef', door: '#ec86a4', roof: '#6c4a40' },
  { name: 'red-stripe', body: '#f6f2e6', alt: '#c9423a', trim: '#fbf8ef', door: '#c9423a', roof: '#59626c' },
  { name: 'tangerine', body: '#f09240', alt: '#f6f2e6', trim: '#fbf8ef', door: '#2c6aa0', roof: '#4a4e57' },
  { name: 'teal', body: '#3c9a9a', alt: '#f6f2e6', trim: '#fbf8ef', door: '#f2cf68', roof: '#3f4850' },
  { name: 'lilac', body: '#b6a2d8', alt: '#f6f2e6', trim: '#fbf8ef', door: '#fbf8ef', roof: '#59626c' },
  { name: 'sage', body: '#a9be8e', alt: '#f6f2e6', trim: '#fbf8ef', door: '#8a3d3a', roof: '#6c4a40' },
  { name: 'cream-blue', body: '#efe6cc', alt: '#5a8fbd', trim: '#fbf8ef', door: '#5a8fbd', roof: '#4a4e57' },
]);
if (typeof sceneObjDefine === 'function' && !(typeof sceneObj === 'function' && sceneObj('building.beach-hut'))) sceneObjDefine({
  id: 'building.beach-hut', category: 'building', size: [120, 130], variants: 1, seasonal: false, flippable: true, real: { h: 3.0, l: 2.1, w: 2.1 },
  palette: { base: { wall: '#9bd3bd', roof: '#59626c', trim: '#fbf8ef', door: '#2f7f86' } }, parts: ['body'],
  tags: ['uk', 'coast', 'seaside', 'promenade', 'beach-huts', 'unlit', 'kit:temperate', 'kit:water', 'role:building-near', 'class:building'],
  credit: 'detail/pier: one beach hut (the parametric model draws it; this sprite is the fallback)',
  build() { return { body: [['@wall', 'M-50 0V-90H50V0Z'], ['@roof', 'M-58 -88L0 -125L58 -88Z'], ['@door', 'M-16 0V-70H16V0Z'], ['@trim', 'M-58 -88L0 -125L58 -88L54 -84L0 -118L-54 -84Z']] }; },
});
/** A deck chair at (a, l) in the hut's frame, front toward +a: a striped sling on a wooden frame. */
function _wmdBhChair(h, k, a, l, c1, c2, open) {
  const w = 0.27 * k, wood = h.aged('#b08a5a', 'timber');
  const front = [a + 0.32 * k, 0.4 * k], low = [a - 0.02 * k, 0.2 * k], back = [a - 0.5 * k, open ? 0.78 * k : 0.55 * k], foot = a - 0.58 * k;
  for (const sg of [-1, 1]) {
    h.line([h.P(a + 0.36 * k, l + sg * w, 0), h.P(front[0], l + sg * w, front[1])], 0.035 * k, wood, 'timber', 'chair');
    h.line([h.P(foot, l + sg * w, 0), h.P(back[0], l + sg * w, back[1])], 0.035 * k, wood, 'timber', 'chair');
    h.line([h.P(a - 0.2 * k, l + sg * w, 0), h.P(a + 0.1 * k, l + sg * w, 0.32 * k)], 0.03 * k, wood, 'timber', 'chair');
  }
  const cl = (p0, p1) => [[p0[0], l - w, p0[1]], [p0[0], l + w, p0[1]], [p1[0], l + w, p1[1]], [p1[0], l - w, p1[1]]];
  h.cloth(cl(front, low), 0.012 * k, c1, { stripe: [c1, c2], nu: 6, nv: 1, role: 'deckchair' });
  h.cloth(cl(low, back), 0.012 * k, c1, { stripe: [c1, c2], nu: 6, nv: 2, role: 'deckchair' });
}
/** A windbreak: a zigzag of striped panels on posts, `n` panels from (a, l) running across `dl` per panel. */
function _wmdBhWindbreak(h, k, a, l, n, dl, c1, c2) {
  const ph = 1.05 * k, wood = h.aged('#a98f6a', 'timber');
  let cl = l;
  for (let i = 0; i < n; i++) {
    const a0 = a + (i % 2 ? 0.16 * k : 0), a1 = a + (i % 2 ? 0 : 0.16 * k), l1 = cl + dl;
    h.cloth([[a0, cl, 0.05 * k], [a1, l1, 0.05 * k], [a1, l1, ph], [a0, cl, ph]], 0.0, c1, { stripe: [c1, c2], nu: 4, nv: 1, role: 'windbreak' });
    h.line([h.P(a0, cl, 0), h.P(a0, cl, ph + 0.08 * k)], 0.04 * k, wood, 'timber', 'post');
    cl = l1;
  }
  h.line([h.P(a + (n % 2 ? 0.16 * k : 0), cl, 0), h.P(a + (n % 2 ? 0.16 * k : 0), cl, ph + 0.08 * k)], 0.04 * k, wood, 'timber', 'post');
}
worldModelDefine('beach-hut', {
  name: 'Seaside beach hut', ids: ['building.beach-hut'], sampleObj: 'building.beach-hut', solidity: 'solid', faceCap: 700,
  dims() { return { L: 2.2, B: 2.2, H: 3.0 }; },
  liveries: () => _WMD_BH_LIVERIES,
  samples: [{ livery: 'mint' }, { livery: 'navy-stripe', age: 0.5 }, { livery: 'coral', size: 1.1 }, { livery: 'butter', age: 0.2 }, { livery: 'pink-stripe' }],
  footprint(p) {
    const k = p.size, o = p.opts || {}, vr = o.veranda === true || (o.veranda == null && _wmdU(p.seed, 'veranda') < 0.3);
    return [[-1.05 * k, -1.05 * k], [(vr ? 1.95 : 1.1) * k, -1.05 * k], [(vr ? 1.95 : 1.1) * k, 1.05 * k], [-1.05 * k, 1.05 * k]];
  },
  build(p, h) {
    const k = p.size, o = p.opts, liv = p.livery, A = (c, m) => h.aged(c, m || 'paint'), S = (c) => A(c, 'paint');
    const hw = 0.95 * k, yF = 0.2 * k, yE = 2.15 * k, a1 = 1.0 * k, a0 = -1.0 * k;
    const pick = (key, opts, w) => { if (o[key] != null) return o[key]; let r = h.u(key) * (w ? w.reduce((s, v) => s + v, 0) : opts.length), i = 0; if (w) { while (i < opts.length - 1 && r > w[i]) { r -= w[i]; i++; } } else i = Math.min(opts.length - 1, Math.floor(r)); return opts[i]; };
    const striped = liv.name.indexOf('stripe') >= 0, style = pick('style', striped ? ['stripe', 'stripe', 'solid'] : ['solid', 'skirt', 'solid', 'stripe'], null);
    const door = pick('door', ['single', 'double', 'stable', 'open'], [3.4, 3.2, 1.2, 0.8]);
    const win = pick('window', ['side', 'porthole', 'none', 'both'], [3, 1.4, 1, 1]);
    const pitch = typeof o.pitch === 'number' ? o.pitch : 0.38 + 0.42 * h.u('pitch');
    const veranda = o.veranda != null ? o.veranda === true : h.u('veranda') < 0.3;
    const plate = o.plate != null ? o.plate !== false : h.u('plate') < 0.8;
    const chair = o.chair != null ? o.chair === true : h.u('chair') < 0.22;
    const wbreak = o.windbreak != null ? o.windbreak === true : h.u('wbreak') < 0.12;
    const towel = o.towel != null ? o.towel === true : h.u('towel') < 0.25;
    const base = style === 'stripe' && !striped ? liv.body : liv.body, alt = liv.alt;
    const bodyC = S(base), altC = S(alt), trimC = S(liv.trim), doorC = S(liv.door), roofC = A(liv.roof, 'metal');
    const stripeCol = striped ? [bodyC, altC] : [bodyC, S(h.mix(liv.body, '#ffffff', 0.78))];
    const frontA = veranda ? 1.9 * k : a1;
    h.contactShadow(a0 - 0.15 * k, frontA + 0.2 * k, -hw - 0.2 * k, hw + 0.2 * k, 0.3);
    // ---- the plinth (and the veranda deck, or one step) ----
    h.part('plinth', { layer: 1 });
    const timber = h.aged('#8f7a5e', 'timber');
    h.box(a0 - 0.05 * k, (veranda ? 1.95 : 1.1) * k, -hw - 0.06 * k, hw + 0.06 * k, 0, yF, timber, h.shade(timber, 1.08), 'timber', 'plinth');
    if (h.fine) for (let s = a0; s < (veranda ? 1.95 : 1.1) * k; s += 0.28 * k) h.line([h.P(s, -hw - 0.06 * k, yF + 0.004), h.P(s, hw + 0.06 * k, yF + 0.004)], 0.012 * k, h.shade(timber, 0.75), 'timber', 'seam');
    // ---- the walls ----
    h.part('body', { layer: 2 });
    h.box(a0, a1, -hw, hw, yF, yE, bodyC, bodyC, 'paint', 'wall');
    const front = h.sees([1, 0, 0], [a1, 0, 1]);
    const sides = [-1, 1].filter(sg => h.sees([0, sg, 0], [0, sg * hw, 1]));
    const FS = h.surface((u, v, off) => h.P(a1 + off, u, v), { normal: [1, 0, 0] });
    const SS = (sg) => h.surface((u, v, off) => h.P(u, sg * (hw + off), v), { normal: [0, sg, 0] });
    const stripeN = Math.max(5, Math.round(hw * 2 / (0.2 * k)));
    // vertical stripes on the front, then on the seen sides (alternate boards in the second colour)
    if (style === 'stripe') {
      if (front) for (let i = 0; i < stripeN; i += 2) FS.rect(-hw + i * hw * 2 / stripeN, -hw + (i + 1) * hw * 2 / stripeN, yF, yE, stripeCol[1], 'paint', 'stripe');
      for (const sg of sides) { const n = Math.round(2 * k * 5); for (let i = 0; i < n; i += 2) SS(sg).rect(a0 + i * (a1 - a0) / n, a0 + (i + 1) * (a1 - a0) / n, yF, yE, stripeCol[1], 'paint', 'stripe'); }
      if (h.sees([-1, 0, 0], [a0, 0, 1])) { const BS = h.surface((u, v, off) => h.P(a0 - off, u, v), { normal: [-1, 0, 0] }); for (let i = 0; i < stripeN; i += 2) BS.rect(-hw + i * hw * 2 / stripeN, -hw + (i + 1) * hw * 2 / stripeN, yF, yE, stripeCol[1], 'paint', 'stripe'); }
    } else if (style === 'skirt') {
      const sk = S(h.shade(liv.body, 0.8));
      if (front) FS.rect(-hw, hw, yF, yF + 0.5 * k, sk, 'paint', 'skirt');
      for (const sg of sides) SS(sg).rect(a0, a1, yF, yF + 0.5 * k, sk, 'paint', 'skirt');
    }
    // clapboard seams where they can be seen
    if (h.fine && style !== 'stripe') {
      const sm = h.shade(liv.body, 0.84);
      for (let y = yF + 0.2 * k; y < yE - 0.05 * k; y += 0.2 * k) {
        if (front) h.line([h.P(a1 + 0.004, -hw, y), h.P(a1 + 0.004, hw, y)], 0.008 * k, sm, 'paint', 'board');
        for (const sg of sides) h.line([h.P(a0, sg * (hw + 0.004), y), h.P(a1, sg * (hw + 0.004), y)], 0.008 * k, sm, 'paint', 'board');
      }
    }
    // corner boards
    for (const sg of [-1, 1]) h.box(a1 - 0.03 * k, a1 + 0.03 * k, sg * hw - 0.05 * k, sg * hw + 0.05 * k, yF, yE, trimC, trimC, 'paint', 'corner');
    // ---- the door ----
    const dw = door === 'double' ? 0.62 * k : 0.4 * k, dc = (door === 'double' ? 0 : (h.u('dpos') - 0.5) * 0.28 * k), dh = 1.85 * k, y0 = yF;
    if (front) {
      FS.rect(dc - dw - 0.06 * k, dc + dw + 0.06 * k, y0, y0 + dh + 0.06 * k, trimC, 'paint', 'frame', 0.008);
      if (door === 'open') {
        FS.rect(dc - dw, dc + dw, y0, y0 + dh, '#2b221d', 'timber', 'inside', 0.012);
        FS.rect(dc - dw, dc + dw, y0 + dh - 0.14 * k, y0 + dh, '#3a2f27', 'timber', 'inside', 0.013);
        FS.rect(dc + dw * 0.1, dc + dw * 0.7, y0 + 0.2 * k, y0 + 1.3 * k, S(h.pick(['#c9423a', '#2c6aa0', '#f2cf68'])), 'fabric', 'towel', 0.018);
        FS.rect(dc - dw * 0.8, dc - dw * 0.35, y0 + 0.05 * k, y0 + 0.9 * k, stripeCol[1], 'fabric', 'chair', 0.016);
        FS.rect(dc - dw * 0.8, dc - dw * 0.35, y0 + 0.05 * k, y0 + 0.25 * k, stripeCol[0], 'fabric', 'chair', 0.017);
        // the leaf swung back against the wall
        FS.rect(dc + dw, dc + dw + 0.16 * k, y0, y0 + dh, doorC, 'paint', 'door-leaf', 0.02);
      } else {
        FS.rect(dc - dw, dc + dw, y0, y0 + dh, doorC, 'paint', 'door', 0.012);
        const dk = h.shade(liv.door, 0.78);
        if (door === 'double') { FS.rect(dc - 0.012 * k, dc + 0.012 * k, y0, y0 + dh, h.shade(doorC, 0.7), 'paint', 'door-gap', 0.014); }
        if (door === 'stable') FS.rect(dc - dw, dc + dw, y0 + dh * 0.5 - 0.012 * k, y0 + dh * 0.5 + 0.012 * k, h.shade(doorC, 0.7), 'paint', 'door-split', 0.014);
        if (h.fine) {   // door panels and a handle
          const pn = (u0, u1, v0, v1) => FS.rect(u0, u1, v0, v1, S(dk), 'paint', 'panel', 0.014);
          for (const [c0, c1] of door === 'double' ? [[-dw + 0.1 * k, -0.07 * k], [0.07 * k, dw - 0.1 * k]] : [[dc - dw + 0.09 * k, dc + dw - 0.09 * k]]) {
            pn(c0 + (door === 'double' ? 0 : 0), c1, y0 + 0.14 * k, y0 + dh * 0.45); pn(c0, c1, y0 + dh * 0.55, y0 + dh - 0.14 * k);
          }
          FS.rect(dc + dw - 0.14 * k + (door === 'double' ? -dw * 0.97 : 0), dc + dw - 0.1 * k + (door === 'double' ? -dw * 0.97 : 0), y0 + dh * 0.45, y0 + dh * 0.58, '#d8cfa0', 'metal', 'handle', 0.02);
        }
      }
      // the window: a pair of small lights beside the door when there is room, or a porthole in the gable
      if (win === 'side' || win === 'both') {
        const wc = dc < 0 ? (dc + dw + hw) / 2 + 0.02 * k : (dc - dw - hw) / 2 - 0.02 * k;
        if (Math.abs(wc - dc) > dw + 0.2 * k) FS.windows({ u0: wc - 0.01, u1: wc + 0.01, v: y0 + 1.45 * k, step: 9, kind: 'rect', w: 0.15 * k, h: 0.17 * k, glass: '#7da0ae', trim: trimC, dark: 0.5 });
      }
      if (plate) {
        const pu = dc + (dc >= 0 ? -dw - 0.34 * k : dw + 0.34 * k), pv = y0 + 1.7 * k;
        FS.rect(pu - 0.11 * k, pu + 0.11 * k, pv - 0.07 * k, pv + 0.07 * k, '#fbf8ef', 'paint', 'plate', 0.016);
        const bars = 1 + Math.floor(h.u('bars') * 3);
        for (let i = 0; i < bars; i++) FS.rect(pu - 0.08 * k + i * 0.065 * k, pu - 0.05 * k + i * 0.065 * k, pv - 0.045 * k, pv + 0.045 * k, '#1f2a3a', 'paint', 'plate-mark', 0.02);
      }
    }
    // a side light on the seen side walls
    for (const sg of sides) if (win === 'side' || win === 'both') SS(sg).windows({ u0: -0.14 * k, u1: 0.1 * k, v: yF + 1.35 * k, step: 9, kind: 'rect', w: 0.2 * k, h: 0.22 * k, glass: '#7da0ae', trim: trimC, dark: 0.4 });
    // ---- the roof: a front gable on bargeboards, over the veranda when there is one ----
    h.part('roof', { layer: 3 });
    const ov = 0.13 * k, rr = (hw + ov) * pitch, yR = yE + rr, rA1 = veranda ? 1.82 * k : a1;
    h.gable(a0, rA1, -hw, hw, yE, yR, roofC, { mat: 'tile', over: ov, end: bodyC, endMat: 'paint', role: 'roof' });
    // the bargeboards and a ball finial on the front gable
    const fa = rA1 + ov, yo = yE - ov * pitch;
    for (const sg of [-1, 1]) h.line([h.P(fa + 0.01 * k, sg * (hw + ov), yo), h.P(fa + 0.01 * k, 0, yR)], 0.07 * k, trimC, 'paint', 'bargeboard');
    h.line([h.P(fa + 0.01 * k, -hw - ov, yo), h.P(fa + 0.01 * k, hw + ov, yo)], 0.05 * k, trimC, 'paint', 'tie');
    h.disc(h.P(fa + 0.02 * k, 0, yR + 0.05 * k), 0.06 * k, trimC, 'paint', 'finial', 1);
    if (veranda) {
      for (const sg of [-1, 1]) h.line([h.P(1.82 * k, sg * (hw - 0.03 * k), yF), h.P(1.82 * k, sg * (hw - 0.03 * k), yE)], 0.09 * k, trimC, 'paint', 'post');
      h.line([h.P(1.82 * k, -hw, yF + 0.9 * k), h.P(1.82 * k, hw, yF + 0.9 * k)], 0.035 * k, trimC, 'paint', 'veranda-rail');
    }
    if (h.finer && (win === 'porthole' || win === 'both')) {
      const GS = h.surface((u, v, off) => h.P(rA1 + off, u, v), { normal: [1, 0, 0] });
      if (front || veranda) { GS.ring(0, yE + rr * 0.32, 0.17 * k, trimC, 'paint', 'port-ring', 0.012); GS.ring(0, yE + rr * 0.32, 0.12 * k, '#6f93a3', 'glass', 'window', 0.016, h.litFx(h.u('pdark') < 0.5)); }
    }
    // ---- things at the front: a deck chair, a windbreak, a towel line ----
    h.part('front', { layer: 4, key: h.depth(frontA + 0.8 * k, 0, 0.5 * k) });
    const fx = frontA + 0.2 * k;
    if (chair) { const c1 = h.pick(['#e9695d', '#2c6aa0', '#f2cf68', '#4a9a7a']), c2 = '#f6f2e6'; _wmdBhChair(h, k, fx + 0.55 * k, (h.u('cpos') - 0.5) * 0.6 * k, c1, c2, h.u('copen') < 0.7); }
    if (wbreak) { const sg = h.u('wside') < 0.5 ? -1 : 1, c1 = h.pick(['#c9423a', '#2c4f86', '#2f8a6a']); _wmdBhWindbreak(h, k, 0.5 * k, sg * (hw + 0.5 * k), 3, sg * 0.75 * k, c1, '#f6f2e6'); }
    if (towel && !chair) { const c1 = h.pick(['#e9695d', '#2c6aa0', '#f2cf68']); h.line([h.P(a1 + 0.6 * k, -hw, 1.6 * k), h.P(a1 + 0.6 * k, hw, 1.4 * k)], 0.012 * k, '#7a6a52', 'fabric', 'line'); h.cloth([[a1 + 0.6 * k, -0.3 * k, 1.58 * k], [a1 + 0.6 * k, 0.2 * k, 1.5 * k], [a1 + 0.6 * k, 0.2 * k, 0.95 * k], [a1 + 0.6 * k, -0.3 * k, 1.05 * k]], 0.02 * k, c1, { stripe: [c1, '#f6f2e6'], nu: 4, nv: 2, role: 'towel' }); }
    return { height: 3.0 * k };
  },
});
/**
 * A row of beach huts that does not repeat. o: { from: [x, z], to: [x, z], facing (degrees; the door side), id (prefix), seed,
 * gap: [min, max] metres between huts (default 0.12 to 0.5), size: [min, max] scale (0.92 to 1.08), mix: { stripe: 0.4 } (the
 * share of striped paints), chair, windbreak, veranda: shares (0 to 1), skip: the share of places left empty (a chair or a gap),
 * jitter: metres of wobble across the row, only: [livery names], turn: [from, to] degrees the huts are turned from the row's own
 * normal, along the row (a fan toward the viewer shows fronts as well as sides; spacing follows the turn so footprints never overlap) }. Returns an array of entities (each `row: true`).
 */
function worldBeachHutRow(o) {
  o = o || {};
  const from = o.from || [0, 10], to = o.to || [0, 40], seed = o.seed | 0, id = o.id || 'huts';
  const dx = to[0] - from[0], dz = to[1] - from[1], len = Math.hypot(dx, dz) || 1, ux = dx / len, uz = dz / len;
  let s = (seed * 2654435761 + 12345) >>> 0;
  const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gap = o.gap || [0.12, 0.5], sz = o.size || [0.92, 1.08], mix = o.mix || {}, jit = o.jitter == null ? 0.12 : o.jitter;
  const names = o.only || _WMD_BH_LIVERIES.map(l => l.name);
  const stripeNames = names.filter(n => n.indexOf('stripe') >= 0), plain = names.filter(n => n.indexOf('stripe') < 0);
  const facing = o.facing == null ? 270 : o.facing, out = [], turn = o.turn || [0, 0];
  let d = 0, last = null, i = 0;
  while (true) {
    const k = sz[0] + (sz[1] - sz[0]) * rnd(), tn = (turn[0] + (turn[1] - turn[0]) * Math.min(1, d / len)) * Math.PI / 180, w = (2.1 * Math.abs(Math.sin(tn)) + 2.15 * Math.abs(Math.cos(tn))) * k;
    if (d + w > len + 0.01) break;
    let pool = (stripeNames.length && rnd() < (mix.stripe == null ? 0.3 : mix.stripe)) ? stripeNames : (plain.length ? plain : names);
    let nm = pool[Math.floor(rnd() * pool.length)], tries = 0;
    while (nm === last && tries++ < 6) nm = pool[Math.floor(rnd() * pool.length)];
    last = nm;
    const skip = rnd() < (o.skip == null ? 0.07 : o.skip);
    const c = d + w / 2, wob = (rnd() - 0.5) * 2 * jit, fx = facing + (turn[0] + (turn[1] - turn[0]) * Math.min(1, c / len)) + (rnd() - 0.5) * 3;
    const px = from[0] + ux * c + (-uz) * wob, pz = from[1] + uz * c + ux * wob;
    if (skip) { d += w + gap[1] + rnd() * 1.2; i++; continue; }
    const opts = { };
    const v = rnd(); if (v < (o.veranda == null ? 0.28 : o.veranda)) opts.veranda = true; else opts.veranda = false;
    if (rnd() < (o.chair == null ? 0.2 : o.chair)) opts.chair = true; else opts.chair = false;
    if (rnd() < (o.windbreak == null ? 0.1 : o.windbreak)) opts.windbreak = true; else opts.windbreak = false;
    out.push({ id: id + '-' + i, obj: 'building.beach-hut', at: [Math.round(px * 100) / 100, Math.round(pz * 100) / 100], facing: Math.round(fx * 10) / 10, row: true,
      model: { livery: nm, size: Math.round(k * 100) / 100, seed: (seed * 131 + i * 17) | 0, age: Math.round((0.05 + 0.3 * rnd()) * 100) / 100, opts } });
    d += w + gap[0] + (gap[1] - gap[0]) * rnd(); i++;
  }
  return out;
}
