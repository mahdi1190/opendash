// UK_SCENE_PART: uk-south-east/basingstoke-canal-fleet-v4
/* Basingstoke Canal at Fleet: a narrow, tree-lined cut, a gravel towpath and moored narrowboats.
     https://www.hart.gov.uk/sites/default/files/2023-04/Bas%20Canal%20appraisal%20and%20character.pdf
     https://www.hants.gov.uk/thingstodo/basingstokecanal
     https://canalplan.uk/place/y5i4 (Old Pondtail Bridge)
   View 4 of 4 (evening), drawn with the rich nature kit T.K (71-anim-uk-nature-kit.js).
   Brief: the canal (1794) runs along Fleet's northern edge between Pondtail Bridge (an old brick
   arch beside the newer road bridge) and Reading Road Wharf, a narrow cut about 12-13 m wide; the
   back gardens of Fleet houses run down to the offside, where boats moor; the gravel towpath runs
   between the water and a line of oak, birch and alder. This view: from the towpath near Pondtail,
   looking west-south-west along the cut into the evening sun, the brick arch ahead with the
   towpath passing under it, lit house and boat windows from real dusk.
   Live: sky, sun, moon (real phase), stars, light, reflections, lit windows and the bridge lamp
   from real dusk, all from K.live (the user's clock and location). */
function ukSouthEastFleetCanalV4(T) {
  const { add, U, R, rnd, mv } = T;
  const K = T.K;   // the rich nature kit (71-anim-uk-nature-kit.js); null only if that file is missing
  if (!K) return;
  const sec = v => (Math.round(v * 100) / 100) + 's';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- the canal in one-point perspective ----------
     World metres: X across the cut (the towpath runs from TP0 to TP1, the water from WE to WF, the
     offside bank from WF), Y up (the towpath is 0, the water surface WY), Z ahead of the viewer.
     The Basingstoke Canal through Fleet is about 12-13 m wide (two narrowboats side by side with
     room to pass), with a 2.5-3 m gravel towpath between the water and a hedge or tree line, and
     the bridge holes narrow to one boat's width under the old brick road bridges. */
  const W = { HEDGE: -3.6, TP0: -1.5, TP1: 1.3, WE: 1.9, WF: 14.4, OFF: 16.6, WY: -.45, HOLE: 7.6 };
  const canal = V => {
    const F = V.F || 900, H = V.h, HOR = V.hor, VX = V.vx, SIDE = V.side || 1, EX = V.eyeX || 0, ZM = V.zMax || 700;
    const BZ = V.bridge ? V.bridge.z : 1e6, BD = 7;   // the bridge's near face and its depth (the barrel)
    const bendX = z => V.bend ? V.bend * Math.pow(Math.max(0, z - (V.bendFrom || 60)), 2) : 0;
    const sz = z => F / z;                             // pixels per metre at depth z
    const px = (X, Y, z) => [VX + (SIDE * (X - EX) + bendX(z)) * F / z, HOR + (H - Y) * F / z];
    const Z0 = Math.max(1, F * H / (980 - HOR));        // the nearest depth drawn (just below the frame)
    const pt = p => `${R(p[0])} ${R(p[1])}`;
    const poly = a => 'M' + a.map(p => pt(px(p[0], p[1], p[2]))).join('L') + 'z';
    const fx = v => typeof v === 'function' ? v : () => v;
    const extra = V.bridge ? [BZ - 12, BZ - 4, BZ, BZ + BD, BZ + BD + 4, BZ + BD + 12] : [];
    const zs = (z0, z1, n = 34) => { if (K.lod() < 1) n = Math.ceil(n * .5); const a = []; for (let i = 0; i < n; i++) a.push(z0 * Math.pow(z1 / z0, i / (n - 1))); for (const e of extra) if (e > z0 && e < z1) a.push(e); return a.sort((p, q) => p - q); };
    // the offside water edge: full width, narrowing to the bridge hole under the bridge
    const WF = z => { const d = z - BZ; if (d < -12 || d > BD + 12) return W.WF; if (d < -4) return W.WF + (W.HOLE - W.WF) * (d + 12) / 8; if (d <= BD + 4) return W.HOLE; return W.HOLE + (W.WF - W.HOLE) * (d - BD - 4) / 8; };
    const strip = (Xa, Ya, Xb, Yb, z0 = Z0, z1 = ZM, n) => { const A = fx(Xa), AY = fx(Ya), B = fx(Xb), BY = fx(Yb), Z = zs(z0, z1, n); return 'M' + Z.map(z => pt(px(A(z), AY(z), z))).join('L') + 'L' + Z.slice().reverse().map(z => pt(px(B(z), BY(z), z))).join('L') + 'z'; };
    const refY = Y => 2 * W.WY - Y;                     // the mirror image in the water surface
    const rr = (r, a, b) => a + r() * (b - a);

    /* a tree mass along one bank: crowns (bumpy top) over trunks or an understorey; split into
       clumps (gaps where o.gap) and hazed with distance; the mirror image for the water */
    const mass = (o, L, refl) => {
      const r = rnd(o.seed), out = [], hzc = L.haze;
      const ym = refl ? refY : (Y => Y);
      let z = Math.max(o.z0 || Z0, Z0), clump = [];
      const flush = () => {
        if (clump.length < 2) { clump = []; return; }
        const zmid = clump[Math.floor(clump.length / 2)][0], hz = clamp(Math.log(zmid / 35) / Math.log(18), 0, 1) * (o.haze != null ? o.haze : .6);
        const base = clump.map(([zz]) => px(o.x, ym(o.yb || 0), zz)), top = clump.map(([zz, hh, ov]) => px(o.x + ov, ym(hh), zz));
        let d = 'M' + base.map(pt).join('L');
        for (let i = top.length - 1; i >= 0; i--) {
          const p = top[i];
          if (i === top.length - 1) { d += 'L' + pt(p); continue; }
          const q = top[i + 1], dd = Math.hypot(p[0] - q[0], p[1] - q[1]), up = refl ? 1 : -1;
          d += `Q${R((p[0] + q[0]) / 2)} ${R((p[1] + q[1]) / 2 + up * dd * .55)} ${pt(p)}`;
        }
        out.push({ z: zmid, d: d + 'z', hz, crowns: clump.slice() });
        clump = [];
      };
      while (z < (o.z1 || ZM)) {
        const near = z < 120, hh = o.h0 + (o.h1 - o.h0) * Math.pow(r(), .8) * (o.taper ? clamp((o.z1 - z) / o.taper, .3, 1) : 1), c = [z, hh, (o.ov || 0) * rr(r, .6, 1.2)];
        clump.push(c);
        const step = Math.max(rr(r, 2.5, 6) * (o.sk || o.k || 1), z * .05);
        if (o.gap && near && clump.length > 2 && r() < o.gap) { flush(); z += step * rr(r, 1, 2.5); }
        else if ([30, 70, 160, 330].some(b => z < b && z + step >= b)) { flush(); clump.push(c); }
        z += step;
      }
      flush();
      return out.reverse();   // far clumps first
    };
    const drawMass = (o, L, cols, refl, opa) => {
      let out = '';
      for (const m of mass(o, L, refl)) {
        const c = K.mix(cols[0], L.haze, m.hz);
        out += `<path fill="${c}"${opa != null ? ` opacity="${opa}"` : ''} d="${m.d}"/>`;
        if (!refl && o.lobes !== false && m.z < 260) {   // the crowns break the skyline: shade, mid and lit lobes
          const r = rnd(o.seed + R(m.z)), ds = ['', '', ''], op = opa != null ? ` opacity="${opa}"` : '', lo = K.lod() < 1;
          for (const [zz, hh, ov] of m.crowns.slice().reverse()) {
            if (lo && (r() < .45 || zz > 120)) continue;   // small tiles: fewer, bigger leaf masses
            const k = sz(zz), rm = rr(r, 2, 3.6) * (o.k || 1), rx = Math.min(rm * k, 240);
            if (rx < (lo ? 6 : 2.5)) continue;
            const p = px(o.x + ov, hh - rm * .5, zz);
            if (p[1] + rx * .8 < -40) continue;
            ds[r() < .5 ? 0 : 1] += K.lobed(r, p[0], p[1], rx, rx * .82, 10, .32);
            if (r() < .6) { const q = px(o.x + ov * 1.05, hh - rm * .2, zz - rm * .3); ds[2] += K.lobed(r, q[0] - L.side * rx * .2, q[1] - rx * .15, rx * .55, rx * .45, 8, .3); }
            if (zz < 45) for (let j = 0; j < (lo ? 2 : zz < 25 ? 5 : 3); j++) {   // close by: leaf masses through the whole body, not a flat wall
              const q = px(o.x + (o.ov || 0) * rr(r, .1, .9), (o.yb || 0) + (hh - (o.yb || 0)) * rr(r, .15, .85), zz + rr(r, -1, 1));
              if (q[0] < -300 || q[0] > 1900 || q[1] < -300 || q[1] > 1000) continue;
              const bx = Math.min(rx * rr(r, .5, .9), 210); ds[j === 2 ? 2 : r() < .5 ? 0 : 1] += K.lobed(r, q[0], q[1], bx, bx * rr(r, .7, .85), 10, .35);
            }
            if (zz < 70 && o.yb > 1 && r() < .7) { const q = px(o.x + ov * 1.1, o.yb + rm * .35, zz); ds[r() < .5 ? 0 : 1] += K.lobed(r, q[0], q[1], rx * .7, rx * .5, 9, .3); }
          }
          out += K.P(K.mix(K.mix(cols[0], cols[1], .35), L.haze, m.hz), ds[0], op) + K.P(K.mix(cols[1], L.haze, m.hz), ds[1], op) + K.P(K.mix(cols[2] || cols[1], L.haze, m.hz), ds[2], ` opacity="${R(((opa != null ? opa : 1) * .8) * 100) / 100}"`);
        }
        if (!refl && o.trunks && m.z < 200) {   // trunks under the crowns
          let td = ''; const r = rnd(o.seed + 7);
          for (const [zz] of m.crowns) { if (r() < .4 || zz < 10) continue; const a = px(o.x - .25, 0, zz), b = px(o.x + .25, 0, zz), c2 = px(o.x + (o.ov || 0) * .25, o.yb + 1, zz), w = (b[0] - a[0]) * .5; td += `M${R(a[0])} ${R(a[1])}L${R(c2[0] - w * .6)} ${R(c2[1])}h${R(w * 1.2)}L${R(b[0])} ${R(b[1])}z`; }
          out = K.P(K.mix(o.bark || '#4a3f36', L.haze, .2), td) + out;
        }
      }
      return out;
    };

    /* a narrowboat moored or cruising, built from its faces in perspective */
    const boat = (b, L, refl) => {
      const ym = refl ? refY : (Y => Y), P2 = (X, Y, z) => px(X, ym(Y), z), Q = a => 'M' + a.map(p => pt(P2(p[0], p[1], p[2]))).join('L') + 'z';
      const x0 = b.x, x1 = b.x + 2.1, z1 = b.z, z2 = b.z + (b.len || 18), cz1 = z1 + 1.3, cz2 = z2 - 2.6;
      const near = EX < x0, xf = near ? x0 : x1, xc = near ? x0 + .1 : x1 - .1, c = b.col, trim = b.trim || '#e9c86a', hull = '#1c2224';
      let out = '';
      out += `<path fill="${hull}" d="${Q([[xf, W.WY, z1 + .8], [xf, .35, z1], [xf, .55, z2], [xf, W.WY, z2 - 1.4]])}"/>`;
      out += K.S(refl ? '#2a3436' : '#5a2a22', Math.max(1, .07 * sz(z1 + 4)), Q([[xf, .2, z1 + .2], [xf, .3, z2 - .4]]).slice(0, -1));
      if (b.cratch) out += `<path fill="${K.mix(b.cratch, '#000', .1)}" d="${Q([[xc, .35, cz2], [xc, 1.45, cz2], [xc + (near ? 1 : -1) * .9, .45, z2 - .6]])}"/>`;
      out += `<path fill="${c}" d="${Q([[xc, .35, cz1], [xc, 1.75, cz1], [xc, 1.75, cz2], [xc, .35, cz2]])}"/>`;
      out += `<path fill="${K.mix(c, '#000', .28)}" d="${Q([[xc, .35, cz1], [xc, .62, cz1], [xc, .62, cz2], [xc, .35, cz2]])}"/>`;
      if (!refl) {
        out += K.S(trim, Math.max(.8, .05 * sz(cz1 + 3)), Q([[xc, 1.56, cz1 + .2], [xc, 1.56, cz2 - .2]]).slice(0, -1) + Q([[xc, .72, cz1 + .2], [xc, .72, cz2 - .2]]).slice(0, -1));
        // a painted panel near the stern, then portholes or windows along the cabin
        out += `<path fill="${b.panel || K.mix(c, trim, .25)}" d="${Q([[xc, .82, cz1 + .35], [xc, 1.45, cz1 + .35], [xc, 1.45, cz1 + 2.2], [xc, .82, cz1 + 2.2]])}"/>`;
        let ports = '', glow = '';
        for (let zz = cz1 + 3, i = 0; zz < cz2 - .8; zz += b.rect ? 1.6 : 1.15, i++) {
          const p = P2(xc, 1.12, zz), a = P2(xc, 1.12, zz - .16), e = P2(xc, 1.12, zz + .16), rx = Math.abs(a[0] - e[0]) / 2 + .4, ry = .16 * sz(zz);
          if (ry < .8) continue;
          ports += b.rect ? Q([[xc, .95, zz - .35], [xc, 1.35, zz - .35], [xc, 1.35, zz + .35], [xc, .95, zz + .35]]) : K.ell(p[0], p[1], rx, ry);
          if (L.windows && (i * 5 + (b.seed || 1)) % 3) glow += b.rect ? Q([[xc, .95, zz - .35], [xc, 1.35, zz - .35], [xc, 1.35, zz + .35], [xc, .95, zz + .35]]) : K.ell(p[0], p[1], rx, ry);
        }
        out += `<path fill="${K.mix(L.low, '#1c2630', .5)}" stroke="${trim}" stroke-width="${R(Math.max(.6, .04 * sz(cz1 + 4)) * 10) / 10}" d="${ports}"/>`;
        if (glow) { const g = P2(xc, 1.1, (cz1 + cz2) / 2); out += K.keep(`<path fill="#ffd27a" d="${glow}"/>` + K.glow(g[0], g[1], 2.2 * sz((cz1 + cz2) / 2) + 30, '#ffc870', .16 * L.dark + .06)); }
        // the roof (seen from above the boat), with a chimney, a plank, plants, a bike
        if (H > 2) {
          out += `<path fill="${K.mix(c, '#d8d4cc', .45)}" d="${Q([[x0 + .1, 1.75, cz1], [x1 - .1, 1.75, cz1], [x1 - .1, 1.75, cz2], [x0 + .1, 1.75, cz2]])}"/>`;
          out += `<path fill="#6a5440" d="${Q([[x0 + .7, 1.8, cz1 + 2.5], [x0 + 1.0, 1.8, cz1 + 2.5], [x0 + 1.0, 1.8, cz2 - 3], [x0 + .7, 1.8, cz2 - 3]])}"/>`;
          const pp = P2(x0 + 1.4, 1.75, cz2 - 1.5), k = sz(cz2 - 1.5);
          out += `<path fill="#4a8a3a" d="${K.circ(pp[0], pp[1] - .25 * k, .3 * k)}"/><path fill="#e05a6a" d="${K.circ(pp[0] - .15 * k, pp[1] - .4 * k, .1 * k)}"/>`;
        }
        // the chimney and its smoke (a soft wisp that leans downwind, no puffs)
        const ch = P2(x0 + 1.05, 1.75, cz2 - 3.2), k = sz(cz2 - 3.2), cw = Math.max(1.6, .14 * k), chH = .55 * k;
        out += `<path fill="#22262a" d="M${R(ch[0] - cw)} ${R(ch[1])}v${R(-chH)}h${R(cw * 2)}v${R(chH)}z"/>` + K.S('#c9a24a', Math.max(.8, .04 * k), `M${R(ch[0] - cw)} ${R(ch[1] - chH * .7)}h${R(cw * 2)}`);
        if (b.smoke) {
          const lean = (b.lean || 1) * 2.2 * k, len = 2.6 * k, top = ch[1] - chH;
          out += K.sway(R(ch[0]), `<path fill="${b.smokeCol || '#e4e0dc'}" opacity="${b.smokeOp || .32}" d="M${R(ch[0] - cw * .8)} ${R(top)}Q${R(ch[0] - cw + lean * .2)} ${R(top - len * .5)} ${R(ch[0] + lean)} ${R(top - len)}q${R(cw * 3)} ${R(len * .1)} ${R(cw * 2.4)} ${R(len * .3)}Q${R(ch[0] + cw + lean * .3)} ${R(top - len * .4)} ${R(ch[0] + cw * .8)} ${R(top)}z"/>`, 'soft');
        }
      }
      // the near end: the stern deck, the cabin's back doors, the hull's rounded stern, the tiller
      out += `<path fill="#3a2a22" d="${Q([[x0, .35, z1], [x1, .35, z1], [x1, .35, cz1], [x0, .35, cz1]])}"/>`;
      out += `<path fill="${K.mix(c, '#000', .12)}" d="${Q([[x0 + .1, .35, cz1], [x0 + .1, 1.75, cz1], [x1 - .1, 1.75, cz1], [x1 - .1, .35, cz1]])}"/>`;
      if (!refl) out += K.S(trim, Math.max(.8, .04 * sz(cz1)), Q([[x0 + .45, .45, cz1], [x0 + .45, 1.5, cz1], [x0 + 1.0, 1.5, cz1], [x0 + 1.0, .45, cz1]]) + Q([[x0 + 1.1, .45, cz1], [x0 + 1.1, 1.5, cz1], [x1 - .45, 1.5, cz1], [x1 - .45, .45, cz1]]));
      out += `<path fill="${hull}" d="${Q([[x0, W.WY, z1 + .5], [x0, .35, z1], [x1, .35, z1], [x1, W.WY, z1 + .5]])}"/>`;
      if (!refl) out += K.S('#2a1e18', Math.max(1, .06 * sz(z1)), Q([[x0 + 1.05, .35, z1], [x0 + 1.05, 1.1, z1 - .2], [x0 + 1.4, 1.2, z1 + .6]]).slice(0, -1));
      // a mooring line to the bank (moored boats)
      if (b.moored && !refl) { const a = P2(x0 + 1.05, .4, z1 + .1), e = P2(b.bank, .1, z1 - 1.2); out += K.S('#d8cdb8', Math.max(.8, .03 * sz(z1)), `M${pt(a)}Q${R((a[0] + e[0]) / 2)} ${R(Math.max(a[1], e[1]) + 4)} ${pt(e)}`); }
      return out;
    };

    const wake = b => { const ze = Math.max(b.z - 6, Z0 * 1.1), t = (b.z - ze) / 6, a = px(b.x - .1, W.WY, b.z + .3), c = px(b.x + 2.2, W.WY, b.z + .3), e = px(b.x - .1 - 1.1 * t, W.WY, ze), f = px(b.x + 2.2 + 1.1 * t, W.WY, ze); return mv('uknwake', { ad: '2.8s' }, K.S('#eefaf6', 1.6, `M${pt(a)}L${pt(e)}M${pt(c)}L${pt(f)}`, ' opacity=".55"')); };
    /* the brick road bridge, face-on at BZ: a segmental arch over the narrowed water and the towpath */
    const bridge = (L, season) => {
      const z = BZ, k = sz(z), zf = BZ + BD, A0 = W.TP0 - .4, A1 = W.HOLE + .1, SP = .9, CR = 3.3, YD = 3.9, YP = 4.9;
      const XL = W.HEDGE - 5, XR = W.OFF + 5;
      const arch = zz => { const a = px(A0, W.WY, zz), b = px(A0, SP, zz), c = px((A0 + A1) / 2, 2 * CR - SP, zz), e = px(A1, SP, zz), f = px(A1, W.WY, zz); return `M${pt(a)}L${pt(b)}Q${pt(c)} ${pt(e)}L${pt(f)}z`; };
      const face = zz => poly([[XL, W.WY, zz], [XL, YP, zz], [XR, YP, zz], [XR, W.WY, zz]]).slice(0, -1) + 'z' + arch(zz);
      const brick = K.mix(season === 'winter' ? '#8e5a48' : '#9a5a40', L.haze, .12), dark = '#5a3428', cope = '#cfc6b4';
      let out = `<path fill="${K.mix('#3a2620', L.haze, .2)}" fill-rule="evenodd" d="${face(zf)}"/>`;
      // traffic and people behind the parapet (only their tops show over it)
      const road = px(0, YD, z), m = k / 60;
      out += K.at(px(XL + 4, YD, z)[0], road[1], m * 2.2, mv('uknglide', { ad: '21s', d: '-4s', dx: R((XR - XL) * k / (m * 2.2)) + 'px', dy: '0px' }, `<path fill="#3a5a8a" d="M-60 0v-22q6-18 26-20h44q20 2 30 20l14 6v16z"/><path fill="#b8d0e0" d="M-30-36h32v14h-34zM10-36q14 2 20 14h-20z"/>`));
      out += K.at(px(XR - 4, YD, z)[0], road[1], m * 2.2, mv('uknglide', { ad: '29s', d: '-17s', dx: R(-(XR - XL) * k / (m * 2.2)) + 'px', dy: '0px' }, `<path fill="#e8e4dc" d="M-70 0v-48h90l22 18 12 6v24z"/><path fill="#9ab8c8" d="M24-42h12l12 14h-24z"/>`));
      out += K.walker(px(A1 + 3, YD, z)[0], road[1], 1.7 * k / 64, { dx: -R(14 * 64 / 1.7), dur: 46, d: 9, seed: 31 });
      const fid = U();
      out += `<defs><clipPath id="${fid}"><path clip-rule="evenodd" d="${face(z)}"/></clipPath></defs>`;
      out += `<path fill="${brick}" fill-rule="evenodd" d="${face(z)}"/>`;
      // brick courses and joints (clipped to the face), the arch ring, the string course, coping
      let crs = ''; const step = Math.max(.25, 3.5 / k);
      for (let Y = W.WY + step; Y < YP; Y += step) { const a = px(XL, Y, z), b = px(XR, Y, z); crs += `M${R(a[0])} ${R(a[1])}H${R(b[0])}`; }
      out += `<g clip-path="url(#${fid})">` + K.S(K.mix(dark, brick, .3), Math.max(.5, .02 * k), crs, ' opacity=".45"');
      const r = rnd(41); let mot = '';
      if (K.lod() === 1) for (let i = 0; i < 90; i++) { const a = px(rr(r, XL + 4, XR - 4), rr(r, 0, YP), z); mot += `M${R(a[0])} ${R(a[1])}h${R(rr(r, .3, .8) * k)}`; }
      out += K.S(K.mix(brick, '#d08a6a', .5), Math.max(.6, .05 * k), mot, ' opacity=".5"') + '</g>';
      const ring = (() => { const b = px(A0 - .1, SP, z), c = px((A0 + A1) / 2, 2 * (CR + .25) - SP, z), e = px(A1 + .1, SP, z); return `M${pt(b)}Q${pt(c)} ${pt(e)}`; })();
      out += K.S(dark, .5 * k, ring) + K.S(K.mix(brick, '#e0b090', .35), .44 * k, ring, ` stroke-dasharray="${R(.08 * k * 10) / 10} ${R(.28 * k * 10) / 10}" stroke-linecap="butt"`);
      out += `<path fill="${K.mix(cope, '#8a8070', .3)}" d="${poly([[XL, YD - .1, z], [XL, YD + .15, z], [XR, YD + .15, z], [XR, YD - .1, z]])}"/>`;
      out += `<path fill="${cope}" d="${poly([[XL, YP, z], [XL, YP + .2, z], [XR, YP + .2, z], [XR, YP, z]])}"/>`;
      if (season === 'winter') out += `<path fill="#f4f6f8" opacity=".85" d="${poly([[XL, YP + .2, z], [XL, YP + .3, z], [XR, YP + .3, z], [XR, YP + .2, z]])}"/>`;
      // the shade inside the arch on the water side, and a lamp on the bridge
      out += `<path fill="#120a08" opacity=".22" d="${arch(z)}"/>`;
      const lp = px(W.OFF + 3, YP, z);
      out += K.S('#2a2a2e', Math.max(1, .12 * k), `M${R(lp[0])} ${R(lp[1])}v${R(-4.2 * k)}h${R(.6 * k)}`) + K.lamp(L, lp[0] + .6 * k, lp[1] - 4.2 * k, Math.max(2, .22 * k));
      // the road embankments either side, grassed, sloping down to the banks
      const emb = season === 'winter' ? '#7a7a68' : K.mix(K.pal(season).grass[0], '#1e2a1e', .3);
      out += `<path fill="${emb}" d="${poly([[XL, YP + .2, z], [XL - 16, 0, z], [XL, 0, z]])}${poly([[XR, YP + .2, z], [XR + 16, 0, z], [XR, 0, z]])}"/>`;
      return out;
    };

    /* a big trunk close by, rising out of the frame (its crown is the canopy overhead) */
    const trunk = (L, X, z, d, season) => {
      const top = H + (HOR + 40) * z / F, a = px(X - d / 2, 0, z), b = px(X + d / 2, 0, z), c = px(X - d * .36, top, z), e = px(X + d * .36, top, z), w = b[0] - a[0], lean = SIDE * (X > 8 ? -1 : 1) * w * .5;
      const bark = K.mix(season === 'winter' ? '#5a524c' : '#4e4238', L.haze, .05);
      let out = `<ellipse cx="${R((a[0] + b[0]) / 2)}" cy="${R(a[1])}" rx="${R(w * 1.6)}" ry="${R(w * .25)}" fill="#14201a" opacity=".3"/>`;
      out += `<path fill="${bark}" d="M${R(a[0] - w * .25)} ${R(a[1])}Q${R(a[0] + w * .1)} ${R(a[1] - w * .4)} ${R(a[0] + w * .05)} ${R(a[1] - w)}L${R(c[0] + lean)} ${R(c[1])}L${R(e[0] + lean)} ${R(e[1])}L${R(b[0] - w * .05)} ${R(b[1] - w)}Q${R(b[0] - w * .1)} ${R(b[1] - w * .4)} ${R(b[0] + w * .25)} ${R(b[1])}z"/>`;
      const r = rnd(R(z * 31)); let marks = '';
      for (let i = 0; i < 10; i++) { const t = rr(r, .05, .9), x = a[0] + (c[0] + lean - a[0]) * t + w * rr(r, .15, .85) * (1 - t * .3), y = a[1] + (c[1] - a[1]) * t; marks += `M${R(x)} ${R(y)}q${R(rr(r, -3, 3))} ${R(-w * .3)} 0 ${R(-w * rr(r, .4, .9))}`; }
      out += K.S(K.mix(bark, '#000', .35), Math.max(1, w * .04), marks, ' opacity=".6"') + K.S(K.mix(bark, '#a8a088', .3), w * .14, `M${R(b[0] - w * .2)} ${R(b[1] - w)}L${R(e[0] + lean - w * .1)} ${R(e[1])}`, ' opacity=".35"');
      if (season !== 'winter') out += K.S('#5a7a3a', w * .2, `M${R(a[0] + w * .15)} ${R(a[1] - w * .6)}L${R(c[0] + lean + w * .1)} ${R(c[1])}`, ' opacity=".35"');
      // a limb reaching out over the path or the water
      const lb = px(X, Math.min(4.5, H + (HOR - 120) * z / F), z), dir = (X > 8 ? -1 : 1) * SIDE;
      out += K.S(bark, w * .3, `M${R(lb[0] + lean * .5)} ${R(lb[1])}q${R(dir * w * 2)} ${R(-w * 1.2)} ${R(dir * w * 4.5)} ${R(-w * 1.6)}`);
      return out;
    };
    /* small water and bank plants along an edge (X), reeds, sweet-grass and yellow flag */
    const margin = (X, Yb, z0, z1, seed, cols, hm, n0, skip = []) => {
      const r = rnd(seed), ds = ['', '', ''], lo = K.lod() < 1;
      for (let z = z0; z < z1; z += Math.max(rr(r, .5, 1.6) * (lo ? 4 : 1), z * (lo ? .06 : .02))) {
        if (r() < .25 || skip.some(([a, b]) => z > a - 1 && z < b + 1)) continue;
        const k = sz(z), p = px(X + rr(r, -.4, .4), Yb, z), h = hm * rr(r, .4, 1) * k, w = .5 * k, c = Math.floor(r() * 3);
        if (h < 2) continue;
        let d = ''; for (let i = 0; i < (lo ? 2 : n0 || 4); i++) { const bx = p[0] + rr(r, -w, w), lean = rr(r, -.35, .35) * h; d += `M${R(bx)} ${R(p[1])}q${R(lean * .2)} ${R(-h * .5)} ${R(lean)} ${R(-h * rr(r, .7, 1))}`; }
        ds[c] += d;
      }
      return ds.map((d, i) => K.S(cols[i % cols.length], 1.4, d)).join('');
    };
    const groundSpots = (X0, X1, z0, z1, n, seed, col, wm, op, Y = 0) => {
      const r = rnd(seed); let d = '';
      for (let i = 0; i < (K.lod() < 1 ? n * .08 : n); i++) { const z = z0 * Math.pow(z1 / z0, Math.pow(r(), 1.4)), p = px(rr(r, X0, X1), Y, z), k = sz(z), w = wm * rr(r, .5, 1.3) * k; if (w < .7) continue; d += K.ell(p[0], p[1], w, Math.max(.5, w * (H - Y) / z)); }
      return K.P(col, d, op ? ` opacity="${op}"` : '');
    };
    const blades = (X0, X1, z0, z1, n, seed, cols, hm) => {
      const r = rnd(seed), ds = ['', ''];
      for (let i = 0; i < (K.lod() < 1 ? n * .12 : n); i++) { const z = z0 * Math.pow(z1 / z0, Math.pow(r(), 1.3)), p = px(rr(r, X0, X1), 0, z), h = hm * rr(r, .5, 1.2) * sz(z); if (h < 2) continue; ds[i % 2] += `M${R(p[0])} ${R(p[1])}l${R(rr(r, -.3, .3) * h)} ${R(-h)}`; }
      return K.S(cols[0], 1.3, ds[0]) + K.S(cols[1], 1.3, ds[1]);
    };
    /* a house in a Fleet back garden on the offside: side wall, roof slope, the gable end facing us */
    const house = (L, X, z, len, o) => {
      const h = o.h || 5.4, rh = h + 2.6, w = 8, r = rnd(R(z * 7));
      let out = `<path fill="${o.wall}" d="${poly([[X, 0, z], [X, h, z], [X, h, z + len], [X, 0, z + len]])}"/>`;
      out += `<path fill="${o.roof}" d="${poly([[X, h, z], [X + w / 2, rh, z], [X + w / 2, rh, z + len], [X, h, z + len]])}"/>`;
      out += `<path fill="${K.mix(o.wall, '#000', .18)}" d="${poly([[X, 0, z], [X, h, z], [X + w / 2, rh, z], [X + w, h, z], [X + w, 0, z]])}"/>`;
      out += `<path fill="#4a3a32" d="${poly([[X + w * .7, rh - .6, z + 1], [X + w * .7, rh + 1.1, z + 1], [X + w * .7 + .6, rh + 1.1, z + 1], [X + w * .7 + .6, rh - .6, z + 1]])}"/>`;
      let glass = '', lit = '';
      for (let row = 0; row < 2; row++) for (let zz = z + 1.2; zz < z + len - 1; zz += 2.6) {
        const y0 = row ? 3.2 : .9, q = poly([[X, y0, zz], [X, y0 + 1.2, zz], [X, y0 + 1.2, zz + 1.1], [X, y0, zz + 1.1]]);
        if (L.windows && r() < .65) lit += q; else glass += q;
      }
      out += K.P(K.mix(L.low, '#1c2630', .55), glass) + K.S('#e8e4da', 1, glass, ' opacity=".7"');
      if (lit) { const c = px(X, 2.5, z + len / 2); out += K.keep(K.P('#ffd27a', lit) + K.glow(c[0], c[1], len * sz(z + len / 2) * .7, '#ffc870', .12 + .14 * L.dark)); }
      return out;
    };

    /* ---------- the scene ---------- */
    return (season, o = {}) => K.scene(o, () => {
      const L = K.live(o, { heading: V.heading, fov: R(2 * Math.atan(800 / F) * 180 / Math.PI), horizon: HOR, season, at: V.moment[season], lat: V.lat, lon: V.lon });
      const p = K.pal(season), win = season === 'winter', aut = season === 'autumn', spr = season === 'spring', sum = season === 'summer', SI = ['spring', 'summer', 'autumn', 'winter'].indexOf(season);
      const leaf = p.leaf, bare = p.bare || '#5a4f4a', lo = K.lod() < 1;
      const col3 = kind => win ? (kind === 'pine' ? leaf.pine : [K.mix(bare, '#6a6272', .3), K.mix(bare, '#8a7a86', .4), K.mix(bare, '#a89aa4', .4)]) : leaf[kind] || leaf.oak;
      let sky = K.liveBackdrop(L, { seed: 61 + SI * 7 + (V.seed || 0), cloudY: [30, HOR - 150] });
      if (L.dark < .6) sky += K.flock({ seed: 21 + SI, n: 5, x: -100, y: HOR - 230, s: .7, v: true, col: '#2f3438', dx: 1900, dy: -60, dur: 58, d: 10 });

      /* far: the horizon wood where the cut bends away, then the land */
      let g = K.woods({ seed: 31 + (V.seed || 0), y: HOR + 3, h: [14, 30], mix: { oak: .4, pine: .3, birch: .3 }, season, haze: .62, hazeCol: L.haze, sway: 0, foot: 8, snow: win, rows: 1 });
      g += `<path fill="${K.mix(p.grass[0], '#1e2a1e', .35)}" d="M-160 ${HOR + 2}H1760V960H-160z"/>`;
      // ground strips: beyond the hedge, the hedge verge, the towpath, its water verge, the offside land
      const verge = K.mix(p.grass[1], '#2a3a22', .15), tp = win ? K.mix(p.ground[1], '#e8ecee', .3) : p.ground[1];
      g += `<path fill="${K.mix(p.grass[0], '#1a2418', .4)}" d="${strip(-60, 0, W.HEDGE, 0)}"/>`;
      g += `<path fill="${verge}" d="${strip(W.HEDGE, 0, W.TP0, 0)}"/>`;
      g += `<path fill="${tp}" d="${strip(W.TP0, 0, W.TP1, 0)}"/>`;
      g += `<path fill="${p.ground[2]}" opacity=".45" d="${strip(-.5, 0, .5, 0)}"/>`;
      g += `<path fill="${win ? K.mix(verge, '#f2f4f6', .35) : verge}" d="${strip(W.TP1, 0, W.WE, 0)}"/>`;
      g += `<path fill="${V.gardens ? K.mix(p.grass[2], '#2a3a22', .15) : K.mix(p.grass[0], '#1e2a1e', .2)}" d="${strip(z => WF(z) + .3, .1, 70, .1)}"/>`;
      // the water, with the banks, trees, boats and the bridge mirrored in it
      const clip = U(), wd = strip(W.WE, W.WY, WF, W.WY, Z0, ZM, 40), yw0 = px(0, W.WY, ZM)[1];
      const wcols = L.water(win ? ['#8ea89e', '#4f6e62', '#2a4238'] : ['#90b49e', '#4c7a5e', '#23443a']);
      g += K.keep(K.water({ d: wd, y0: yw0, y1: 960, cols: wcols, clip, seed: 41, lines: lo ? 20 : 70, shimmer: lo ? 16 : 50, glints: L.dark > .6 ? 0 : 10, sky: L.low }));
      const offCols = V.offCols || { a: 'alder', b: 'oak', c: 'willow' }, tpCols = V.tpCols || { a: 'oak', b: 'hawthorn', c: 'birch' };
      const offM = Object.assign({ z0: V.massZ0 || Z0, x: W.OFF, ov: -4.5, h0: 9, h1: 17, yb: 2.6, seed: 71, trunks: true, bark: '#4a3f36' }, V.offMass || {});
      const tpM = Object.assign({ z0: V.massZ0 || Z0, x: W.HEDGE, ov: 2.4, h0: 8, h1: 15, yb: 2.4, seed: 72, trunks: true, bark: '#4a3f36' }, V.tpMass || {});
      const split = (m, near) => V.bridge ? Object.assign({}, m, near ? { z1: BZ, taper: 25 } : { z0: BZ + BD + 1 }) : (near ? m : null);
      let refl = '';
      for (const m of [offM].concat(EX > 4 ? [tpM] : [])) {
        const cA = col3(m === offM ? offCols.a : tpCols.a);
        for (const part of [split(m, true), split(m, false)]) if (part) refl += drawMass(part, L, [K.mix(cA[0], wcols[2], .35)], true);
      }
      const boats = V.boats(season, L);
      const glide = (b, s) => { if (!b.move) return s; const a = px(b.x, 0, b.z), e = px(b.x, 0, b.z + b.move); return mv('uknglide', { ad: sec(b.dur || 120), d: sec(-(b.d || 30)), dx: R(e[0] - a[0]) + 'px', dy: R(e[1] - a[1]) + 'px' }, s); };
      for (const b of boats) refl += glide(b, boat(b, L, true));
      const brId = U();
      if (V.bridge) refl += `<use href="#${brId}" transform="matrix(1 0 0 -1 0 ${R(2 * px(0, W.WY, BZ)[1])})"/>`;
      g += (`<g clip-path="url(#${clip})">` + mv('uknwobble', { ad: '7s' }, `<g opacity=".42">${refl}</g>`) + `<path fill="${wcols[1]}" opacity=".18" d="${wd}"/></g>`);
      // pondweed tint and lilies along the margins (not in winter), autumn leaves, the light path
      if (!win) {
        const r = rnd(44); let lil = '', fl = '';
        for (let i = 0; i < (lo ? 14 : 60); i++) {
          const z = Z0 * 1.3 * Math.pow(140 / (Z0 * 1.3), Math.pow(r(), 1.2)), X = r() < .6 ? WF(z) - rr(r, .2, 2.2) : W.WE + rr(r, .2, 1.4), q = px(X, W.WY, z), w = rr(r, .25, .45) * sz(z);
          if (w < 1) continue;
          lil += K.ell(q[0], q[1], w, Math.max(.6, w * (H - W.WY) / z));
          if (sum && r() < .3) fl += K.circ(q[0], q[1] - w * .3, Math.max(1, w * .3));
        }
        g += K.P(spr ? '#6a9a4a' : sum ? '#4f8a3a' : '#7a8a3a', lil, ' opacity=".9"') + K.P(r() < .5 ? '#f2c62a' : '#f6f2e6', fl);
      }
      if (aut) g += groundSpots(W.WE + .3, W.WF - .3, Z0 * 1.2, 120, 70, 48, leaf.oak[1], .09, .85, W.WY);
      g += K.lightPath(L, { y0: yw0 + 2, y1: 900, w: 30, clip, seed: 42, n: lo ? 20 : 60 });
      if (aut || win || spr) g += K.mist({ seed: 43, y: yw0 + 6, h: 22, n: 5, op: aut ? .4 : .28, col: K.mix('#f2f4f2', L.low, .3) });
      // the bank faces: the offside bank's low edge (and the wing walls by the bridge)
      g += `<path fill="${K.mix(p.ground[0], '#1a1a14', .35)}" d="${strip(WF, .1, WF, W.WY)}"/>`;
      if (EX > W.WE) g += `<path fill="${K.mix(p.ground[0], '#1a1a14', .25)}" d="${strip(W.WE, 0, W.WE, W.WY)}"/>`;
      // towpath texture: gravel, the worn centre, puddles in autumn and winter, verges
      g += groundSpots(W.TP0 + .1, W.TP1 - .1, Z0, 70, 260, 51, K.mix(p.ground[0], '#3a3028', .2), .05, .6) + groundSpots(W.TP0 + .1, W.TP1 - .1, Z0, 70, 160, 52, p.ground[2], .04, .7);
      if (aut || win) { const r = rnd(53); let pd = ''; for (let i = 0; i < 4; i++) { const z = rr(r, Z0 * 1.6, 30), q = px(rr(r, -.6, .6), 0, z), w = rr(r, .4, .8) * sz(z); pd += K.ell(q[0], q[1], w, w * H / z); } g += K.P(K.mix(L.low, '#5a6a70', .3), pd, ' opacity=".8"'); }
      if (aut) g += groundSpots(W.TP0, W.TP1, Z0, 50, 140, 54, leaf.oak[1], .07, .9) + groundSpots(W.HEDGE, W.TP0, Z0, 50, 90, 55, leaf.oak[2], .08, .9);
      const gb = [p.grass[1], p.grass[2]];
      g += blades(W.TP1, W.WE, Z0, 60, 260, 56, gb, .3) + blades(W.HEDGE, W.TP0, Z0, 60, 300, 57, gb, .4);

      /* the offside: gardens and houses behind the bank trees, fences and a jetty */
      const far = [], nearL = [];   // [z, markup]: beyond the bridge, and this side of it
      const put = (z, s, key) => (z > BZ ? far : nearL).push([key != null ? key : z, s]);
      for (const hz of V.houses || []) put(hz[1], house(L, hz[0], hz[1], hz[2], hz[3]), 2e5 + hz[1]);
      if (V.gardens) {
        let fd = ''; for (let z = Math.max(Z0 + 1, 5); z < 140; z += 2.4) { if (Math.abs(z - BZ - 3) < 9) continue; const a = px(W.WF + 1.4, 0, z), b = px(W.WF + 1.4, 1.4, z); fd += `M${pt(a)}L${pt(b)}`; }
        const f1 = zs(Math.max(Z0, 5), Math.min(140, BZ - 6), 24).map(z => pt(px(W.WF + 1.4, 1.2, z))).join('L');
        put(10, K.S('#6a5440', 1.4, fd + 'M' + f1, ' opacity=".85"'), 9e4);
      }
      // the bank trees as masses, then a few single trees near
      const cO = col3(offCols.a), cO2 = col3(offCols.b), cT = col3(tpCols.a), cT2 = col3(tpCols.b);
      const offFar = split(offM, false), offNear = split(offM, true), tpFar = split(tpM, false), tpNear = split(tpM, true);
      const mOp = win ? .6 : null;   // winter: the bare twiggy crowns let the sky through
      // the wood behind the bank trees (darker, no overhang), so the cut runs through woodland
      const back = (m, dx) => Object.assign({}, m, { x: m.x + dx, ov: 0, h0: m.h0 + 2, h1: m.h1 + 4, yb: 0, seed: m.seed + 20, trunks: false });
      const dk = c => [K.mix(c[0], '#0a160e', .35), K.mix(c[1], '#0a160e', .3), K.mix(c[2] || c[1], '#0a160e', .25)];
      for (const [m, dx, cc] of [[tpM, -6, col3('oak')]].concat(V.gardens ? [] : [[offM, 6, col3('oak')]])) {
        const bm = Object.assign(back(m, dx), { z0: Math.max(m.z0 || 6, 10) }), bf = split(bm, false), bn = split(bm, true);
        if (bf) far.push([bf.z0 + 2000, drawMass(bf, L, dk(cc), false, mOp)]);
        nearL.push([1e5 + 1, drawMass(bn, L, dk(cc), false, mOp)]);
      }
      if (offFar) far.push([offFar.z0 + 1000, drawMass(offFar, L, [K.mix(cO[0], '#102018', .15), cO[1], cO2[2]], false, mOp)]);
      if (tpFar) far.push([tpFar.z0 + 1000, drawMass(tpFar, L, [K.mix(cT[0], '#102018', .15), cT[1], cT2[2]], false, mOp)]);
      nearL.push([1e5, drawMass(offNear, L, [K.mix(cO[0], '#102018', .15), cO[1], cO2[2]], false, mOp)]);
      nearL.push([1e5 - 1, drawMass(tpNear, L, [K.mix(cT[0], '#102018', .15), cT[1], cT2[2]], false, mOp)]);
      // the understorey along both banks: shrubs, bramble, holly
      const und = (x, ov, seed) => ({ z0: 10, x, ov, h0: .8, h1: 2, yb: 0, seed, z1: V.bridge ? BZ : ZM, k: .32, sk: .6, lobes: !lo });
      const uc0 = win ? K.mix(bare, '#3a3436', .3) : K.mix(p.grass[0], '#16261a', .35), uc = [uc0, K.mix(uc0, win ? '#8a7a80' : p.grass[1], .3), K.mix(uc0, win ? '#a89aa0' : p.grass[2], .3)];
      nearL.push([1e5 - 2, drawMass(und(W.OFF + .4, -1.4, 73), L, uc, false) + drawMass(und(W.HEDGE - .2, 1.2, 74), L, uc, false)]);
      // single trees: big ones near the viewer, sized by distance
      for (const t of V.trees || []) {
        const [kind, X, z, hm, opt] = t, q = px(X, X > 8 ? .1 : 0, z), k = hm * sz(z) / 400;
        if (kind === 'trunk') { put(z, trunk(L, X, z, hm, season)); continue; }
        put(z, K.tree(kind, q[0], q[1], k, Object.assign({ season, seed: R(z * 13 + X), still: k < .4, flutter: k > .6 ? 4 : 0, fall: aut && k > .6 ? 6 : 0, ground: q[1], snow: win, shadow: false, blossom: spr && kind === 'hawthorn', flip: X < 0 === (SIDE > 0) }, opt || {})));
      }
      // boats
      for (const b of boats) put(b.z + (b.x > 8 ? .5 : 0), glide(b, boat(b, L, false) + (b.move ? wake(b) : '')));
      // waterbirds and wildlife on the water (sized by distance)
      for (const [kind, X, z, mm, oo] of V.birds(season)) { const q = px(X, W.WY, z); put(z, K.duck(kind, q[0], q[1], mm * sz(z) / 60, Object.assign({ dx: R(60 / mm), dur: 40 }, oo || {}))); }
      // people on the towpath: they walk along it, towards or away from us
      for (const f of V.folk(season)) {
        const [fn, X, z, dz, oo] = f, a = px(X, 0, z), b = px(X, 0, z + dz), k = (fn === 'cyclist' ? 1.75 / 64 : 1.7 / 64) * sz(z);
        put(z, K[fn](a[0], a[1], k, Object.assign({ dx: R((b[0] - a[0]) / k), dy: R((b[1] - a[1]) / k) }, oo)));
      }
      if (V.extra) for (const [z, s] of V.extra({ season, L, px, sz, W, p, BZ, K })) put(z, s);
      // reeds and sweet-grass at both water margins (thin in winter)
      const rc = win ? [p.reed[1], p.reed[2], p.plume[0]] : [p.reed[0], p.reed[1], p.reed[2]];
      put(10, margin(W.WF + .1, .05, Math.max(Z0, 4), Math.min(160, BZ - 4), 81, rc, win ? .8 : 1.3, 3), 9e4 - 1);
      put(1, margin(W.WE - .1, 0, Z0, Math.min(140, BZ - 2), 82, rc, win ? .6 : 1.0, 3, boats.filter(b => b.x < 6).map(b => [b.z, b.z + (b.len || 18) + (b.move || 0)])), -1);
      if (V.bridge) far.push([BZ + 200, margin(W.WF + .1, .05, BZ + BD + 6, 300, 83, rc, 1.2, 3)]);

      let land = g;
      for (const [, s] of far.sort((a, b) => b[0] - a[0])) land += s;
      if (V.bridge) land += `<g id="${brId}">${bridge(L, season)}</g>`;
      for (const [, s] of nearL.sort((a, b) => b[0] - a[0])) land += s;
      if (V.fore) land += V.fore({ season, L, p, px, sz, W });

      // seasonal air
      let air = '';
      if (spr) air += K.petals({ seed: 91, n: 16, x0: 0, x1: 1600, y0: 300, y1: 800 });
      if (sum && L.dark < .4) air += K.dragonfly(px(5, .6, 9)[0], px(5, .6, 9)[1], .8, { col: '#2a4ac0', dx: 160, dy: 20 }) + K.dragonfly(px(9, .5, 16)[0], px(9, .5, 16)[1], .6, { col: '#c43a2a', dx: -120, dy: 16 }) + K.butterfly(px(-2.2, .8, 8)[0], px(-2.2, .8, 8)[1], .8, { kind: 'admiral', dx: 140 });
      if (aut) air += K.falling({ seed: 93, n: 26, x0: -100, x1: 1700, y0: 60, y1: 760, dy: 420, dx: -180, cols: [leaf.oak[1], leaf.oak[2], leaf.birch[2], leaf.alder[1]] });
      if (win) air += K.snow({ seed: 94, n: 18, layers: 2 });
      if (L.dark > .5) air += K.bats({ seed: 95, n: 4, x: VX, y: HOR - 80, spread: 260, s: .8 });
      return sky + K.tone(L, land) + air + K.weather(L) + K.grade(L);
    });
  };

  const LAT = 51.29, LON = -0.83;
  const VIEW = {
    heading: 250, h: 1.6, hor: 520, vx: 760, F: 900, side: 1, eyeX: 0, zMax: 700, bend: -.0012, bendFrom: 80, lat: LAT, lon: LON, seed: 4,
    moment: { spring: 'sunset', summer: 'sunset', autumn: 'sunset', winter: 'sunset' },
    bridge: { z: 46 }, gardens: true,
    houses: [[25, 18, 9, { wall: '#c8a888', roof: '#6a4038' }], [23, 30, 8, { wall: '#b4705a', roof: '#5a4a48' }], [22, 62, 9, { wall: '#d0bca0', roof: '#7a4a3a' }], [24, 84, 10, { wall: '#b07a5e', roof: '#5e3e36' }]],
    offMass: { gap: .45, h0: 5, h1: 11, ov: -2.5 }, tpMass: { h0: 10, h1: 17, ov: 3 },
    offCols: { a: 'hawthorn', b: 'willow' }, tpCols: { a: 'oak', b: 'birch' },
    trees: [['trunk', -4.4, 6.5, .65], ['willow', 17.5, 17, 10], ['oak', -4.8, 21, 15], ['birch', -4.2, 30, 14], ['alder', -4.4, 40, 12]],
    boats: (season, L) => [
      { x: W.WF - 2.5, z: 9, len: 19, col: '#2f5a46', trim: '#e9c86a', moored: true, bank: W.WF + .4, seed: 3, smoke: season !== 'summer', cratch: '#3a2a20', lean: -1 },
      { x: W.WF - 2.5, z: 30, len: 12, col: '#7a1f2a', trim: '#f0c040', moored: true, bank: W.WF + .4, seed: 5, rect: true },
      { x: W.WF - 2.5, z: 62, len: 18, col: '#1f3a6a', trim: '#e9c86a', moored: true, bank: W.WF + .4, seed: 7, smoke: true },
    ],
    birds: season => [['swan', 6, 20, 1, { dx: 30, dur: 70 }], ['swan', 7, 22, 1, { dx: 30, dur: 70, d: 6 }], ['mallard', 4, 13, .6, {}], ['moorhen', 3, 30, .4, {}]].concat(season === 'spring' ? [['swan', 6.4, 21.5, .6, { dx: 30, dur: 70, d: 3 }]] : []),
    folk: season => [['walker', .2, 9, 4, { dog: true, dur: 54, seed: 41 }], ['cyclist', -.3, 20, 10, { dur: 34, d: 9, seed: 43 }], ['jogger', .3, 32, -6, { dur: 30, d: 3, seed: 42, flip: true }]],
  };

  const scene = canal(VIEW);
  const place = 'fleet-canal', label = 'Basingstoke Canal', town = 'Fleet', kind = 'heritage', tags = ['canal', 'towpath', 'narrowboat'];
  const reasons = {
    spring: 'Cygnets and cow parsley on a spring evening towpath',
    summer: 'Lit cabin windows at dusk',
    autumn: 'Woodsmoke and falling leaves by Pondtail Bridge',
    winter: 'A frosty towpath and a chimney smoking at dusk',
  };
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const reason = reasons[season];
    add('hampshire', kind, { id: `${place}-4${season !== 'summer' ? '-' + season : ''}`, label, site: `${label} — ${reason}`,
      colour: 'slate', mood: 'dreamy', tags: tags.concat(season),
      ukPlace: place, ukLocality: town, ukTown: town, ukView: 'evening', viewReason: reason,
      ukSeason: season, season: [season], rich: true, liveSky: { lat: LAT, lon: LON },
      svg: (o = {}) => scene(season, o) });
  }
}
