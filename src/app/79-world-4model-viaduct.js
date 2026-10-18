/* ---------- a Victorian railway viaduct as a real 3D model (17 Oct, detail/castlefield: "the viaducts crossing overhead") ----------
   structure.viaduct: a railway or tram viaduct striding across a canal, a river or a street, seen from BELOW (the eye is under the
   deck). Two families, any length, from one model:
     kind 'arcade'  (default)  brick arches on piers: pilastered piers on a stone plinth, a voussoir ring of darker brick, a spandrel with
                               soot streaks and patches of repair, a stone string course and a coped parapet, buddleia on the ledge,
                               some arches bricked up with a unit door (and a lit window after dusk), some left open, uplighters on
                               the piers. `gap` (m) replaces the middle of the run by a steel plate-girder span between two stout
                               abutment piers (the arcade's span over the water).
     kind 'girder'             through lattice (Warren) girders on brick piers: a riveted plate band, verticals and alternating diagonals
                               to a cambered top chord, cross-bracing, the underside of the deck with its cross beams, a stone-capped
                               pier with panels. `masts` adds tram overhead-line masts, their arms and the wires.
   Everything is metres on the entity: `at` is the middle of the run, `facing` runs ALONG the viaduct. The entity is an `overhead`
   walkway (people, boats and the fill pass under it); the engine's own piers stand on the ground at both banks.
   opts: kind, len (m, 96), width (deck, 9.2), h (rail level above the ground, 10), span (pier pitch, arcade 11.5 / girder 27),
         pier (pier width in the run, arcade 2.5 / girder 3.4), gap (m, the steel span of an arcade), gapAt (m from the middle), masts
   Liveries: red-cream (red brick, cream steel), soot-grey (sooted brick, grey-blue steel), blue-black (blue brick, black steel),
   buff-green (buff brick, green steel). No lettering, no names, no signs. */
const _WMD_VD_LIVERIES = Object.freeze([
  { name: 'red-cream', brick: '#8a4a38', ring: '#6c3b2e', patch: '#9c5a42', stone: '#a9a393', steel: '#d9d3bc', steelDk: '#9a9582' },
  { name: 'soot-grey', brick: '#6d4a3c', ring: '#4f372f', patch: '#85584a', stone: '#8d897d', steel: '#6c7a84', steelDk: '#454f57' },
  { name: 'blue-black', brick: '#566073', ring: '#3d4658', patch: '#6a7487', stone: '#9b978a', steel: '#2d3033', steelDk: '#1d1f21' },
  { name: 'buff-green', brick: '#a08558', ring: '#7d6643', patch: '#b49866', stone: '#b0aa98', steel: '#44604f', steelDk: '#2c4136' },
]);
if (typeof sceneObjDefine === 'function' && !(typeof sceneObj === 'function' && sceneObj('structure.viaduct'))) sceneObjDefine({
  id: 'structure.viaduct', category: 'structure', size: [900, 120], variants: 1, seasonal: false, flippable: true, real: { h: 11.5, l: 96, w: 9.2 },
  palette: { base: { brick: '#8a4a38', stone: '#a9a393' } }, parts: ['body'], tags: ['uk', 'city', 'canal', 'railway', 'viaduct', 'kit:temperate', 'role:structure', 'class:walkway'],
  credit: 'a Victorian railway viaduct (the parametric model draws it; this sprite is the fallback)',
  build() { return { body: [['@brick', 'M-450 0V-80H450V0Z']] }; },
});
function _wmdVdOpt(p, key, dflt) { const v = p.opts ? p.opts[key] : null; return typeof v === 'number' && Number.isFinite(v) ? v : dflt; }
worldModelDefine('viaduct', {
  name: 'Railway viaduct', ids: ['structure.viaduct', 'structure.viaduct-*'], sampleObj: 'structure.viaduct', solidity: 'overhead', faceCap: 3000,
  dims(info, ent) {
    const o = (ent && ent.model && ent.model.opts) || {}, n = (k, d) => (typeof o[k] === 'number' && Number.isFinite(o[k]) && o[k] > 0 ? o[k] : d);
    const girder = o.kind === 'girder';
    return { L: n('len', 96), B: n('width', 9.2), H: n('h', 10) + (girder ? 4.0 + (o.masts ? 2.6 : 0) : 1.2) };
  },
  liveries: () => _WMD_VD_LIVERIES,
  samples: [{ livery: 'red-cream', seed: 3 }, { livery: 'soot-grey', seed: 6, age: 0.8 }, { livery: 'blue-black', seed: 9, opts: { kind: 'girder' } }, { livery: 'red-cream', seed: 12, opts: { kind: 'girder', masts: true } },
    { livery: 'buff-green', seed: 15, opts: { gap: 22 } }],
  build(p, h) {
    const k = p.size, o = p.opts, kind = o.kind === 'girder' ? 'girder' : 'arcade', liv = p.livery;
    const L = p.L, B = p.B, yR = _wmdVdOpt(p, 'h', 10) * k, hw = B / 2;
    const pitch = _wmdVdOpt(p, 'span', kind === 'girder' ? 27 : 11.5) * k, pw = _wmdVdOpt(p, 'pier', kind === 'girder' ? 3.4 : 2.5) * k;
    const gap = Math.max(0, _wmdVdOpt(p, 'gap', 0)) * k, gapAt = _wmdVdOpt(p, 'gapAt', 0) * k;
    const brick = h.aged(liv.brick, 'stone', 0.7), ring = h.aged(liv.ring, 'stone', 0.7), patch = h.aged(liv.patch, 'stone', 0.7), stone = h.aged(liv.stone, 'stone', 0.6);
    const steel = h.aged(liv.steel, 'paint', 0.8), steelDk = h.aged(liv.steelDk, 'metal', 0.8), sootK = 0.18 + 0.3 * h.u('soot');
    const rn = (key) => { let a = (h.u(key) * 4294967296) >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    const x0 = -L / 2, x1 = L / 2;
    // ---- the piers along the run: centres, and the span that carries the steel plate girders (the gap) ----
    const piers = [];
    if (gap > 0) {
      const g0 = gapAt - gap / 2 - pw * 0.7, g1 = gapAt + gap / 2 + pw * 0.7;
      for (let x = g0; x > x0 - pw; x -= pitch) piers.push({ x, ab: x === g0 });
      for (let x = g1; x < x1 + pw; x += pitch) piers.push({ x, ab: x === g1 });
      piers.sort((a, b) => a.x - b.x);
    } else {
      const n = Math.max(1, Math.round(L / pitch)), p0 = -n * pitch / 2;
      for (let i = 0; i <= n; i++) piers.push({ x: p0 + i * pitch, ab: false });
    }
    const spans = [];
    for (let i = 0; i + 1 < piers.length; i++) {
      const A = piers[i], Bp = piers[i + 1], a0 = A.x + (A.ab ? pw * 0.7 : pw / 2), a1 = Bp.x - (Bp.ab ? pw * 0.7 : pw / 2);
      spans.push({ i, a0, a1, c: (A.x + Bp.x) / 2, steelSpan: gap > 0 && A.ab && Bp.ab && A.x < gapAt });
    }
    const yStrG = yR - 0.4 * k, crownG = yStrG - 1.15 * k, riseG = Math.min((pitch - pw) / 2, crownG - 2.6 * k), ysG = crownG - riseG;
    const eyeSide = h.sees([0, 1, 0], [0, hw, yR * 0.5]) ? 1 : -1;     // the +l or -l face is the one nearer the eye
    const LDF = (hex, kk) => h.shade(hex, kk);
    // ============================================================ piers
    const pierBox = (px, name, wide) => {
      h.part(name, { layer: 3 });
      const w = (wide ? pw * 0.7 : pw / 2), yT = kind === 'girder' ? yR - 1.4 * k : yR - 0.4 * k;
      const batter = 0.28 * k, plinthH = 1.1 * k;
      h.box(px - w - batter, px + w + batter, -hw - batter, hw + batter, 0, plinthH, stone, LDF(stone, 1.05), 'stone', 'plinth');
      h.box(px - w, px + w, -hw, hw, plinthH, kind === 'girder' || wide ? yT : Math.min(yT, ysG), brick, brick, 'brick', 'pier');
      if (kind === 'girder') {
        // recessed panels on the long faces and a stone cornice cap
        if (h.px(1) >= 3) for (const sl of [-1, 1]) {
          if (!h.sees([0, sl, 0], [px, sl * hw, yT * 0.5])) continue;
          const S = h.surface((u, v, off) => h.P(px + u, sl * (hw + off), v), { normal: [0, sl, 0] });
          S.rect(-w * 0.55, w * 0.55, plinthH + 0.7 * k, yT - 1.5 * k, LDF(brick, 0.86), 'brick', 'panel', 0.012);
          S.rect(-w * 0.55, w * 0.55, yT - 1.5 * k - 0.1 * k, yT - 1.5 * k, stone, 'stone', 'panel-cill', 0.02);
        }
        h.box(px - w - 0.2 * k, px + w + 0.2 * k, -hw - 0.2 * k, hw + 0.2 * k, yT - 0.5 * k, yT, stone, LDF(stone, 1.1), 'stone', 'cornice');
        h.box(px - w * 0.8, px + w * 0.8, -hw - 0.1 * k, hw + 0.1 * k, yT - 0.68 * k, yT - 0.5 * k, LDF(stone, 0.85), LDF(stone, 0.9), 'stone', 'cornice-shadow');
      }
    };
    // ============================================================ the arcade: arches between piers
    const archSpan = (S) => {
      const rr = rn('arch' + S.i), w = S.a1 - S.a0, xm = (S.a0 + S.a1) / 2;
      const yStr = yR - 0.4 * k;                           // string course
      const crown = yStr - 1.15 * k;
      const rise = Math.min(w / 2, crown - 2.6 * k), ys = crown - rise;
      const Nn = h.px(w) > 150 ? 14 : 9;
      const cv = [];
      for (let q = 0; q <= Nn; q++) { const th = Math.PI * q / Nn; cv.push([xm - (w / 2) * Math.cos(th), ys + rise * Math.sin(th)]); }
      const arcP = (c, l) => h.P(c[0], l, c[1]);
      const kindA = (sl) => { const r = rr(); return r < 0.5 ? 'open' : r < 0.82 ? 'unit' : 'gate'; };
      const side = { '-1': kindA(-1), '1': kindA(1) };
      const nearSl = eyeSide;
      const infilled = (sl) => side[String(sl)] === 'unit' || side[String(sl)] === 'gate';
      const setback = 0.7 * k;
      h.part('arch' + S.i, { layer: 3 });
      const infill = (sl) => {
        const lp = sl * (hw - setback), kd = side[String(sl)];
        if (!h.sees([0, sl, 0], [xm, lp, ys])) return;      // (a face looking into the tunnel is hidden from the other side)
        const pts = cv.map(c => arcP(c, lp)).concat([h.P(S.a1, lp, 0), h.P(S.a0, lp, 0)]);
        const inside = h.P(xm, sl * (hw - setback - 2), ys * 0.5);
        if (kd === 'unit') {
          h.face(pts, LDF(patch, 0.82), 'brick', 'infill', inside);
          const S2 = h.surface((u, v, off) => h.P(xm + u, sl * (hw - setback + off), v), { normal: [0, sl, 0] });
          const dw = Math.min(1.5 * k, w * 0.2), dx = (rr() - 0.5) * (w * 0.3);
          S2.rect(dx - dw, dx + dw, 0, 2.5 * k, ['#3f4d45', '#4b4f56', '#5a3e32', '#2f3f4a'][Math.floor(rr() * 4)], 'metal', 'door', 0.02);
          if (h.fine) for (let yy = 0.2 * k; yy < 2.5 * k; yy += 0.17 * k) S2.rect(dx - dw, dx + dw, yy, yy + 0.04 * k, LDF('#3f4d45', 0.8), 'metal', 'door-slat', 0.03, { alpha: 0.5 });
          S2.rect(dx - dw - 0.15 * k, dx + dw + 0.15 * k, 2.5 * k, 2.68 * k, stone, 'stone', 'lintel', 0.02);
          const wx = dx + dw + 0.9 * k;
          if (wx + 0.5 * k < w / 2) { const fx = h.litFx(rr() < 0.3, '#ffd9a0'); S2.rect(wx - 0.45 * k, wx + 0.45 * k, 1.35 * k, 2.15 * k, '#8fa3ad', 'glass', 'window', 0.02, fx); }
        } else {
          h.face(pts, LDF(brick, 0.4), 'brick', 'void', inside, { alpha: 0.9 });
          // a steel gate of vertical bars across the arch
          if (h.px(1) >= 2.5) for (let xx = S.a0 + 0.5 * k; xx < S.a1; xx += 0.5 * k) {
            const hh = ys + rise * Math.sqrt(Math.max(0, 1 - ((xx - xm) / (w / 2)) ** 2));
            h.line([h.P(xx, lp, 0), h.P(xx, lp, hh)], 0.04 * k, '#2a2d2f', 'metal', 'bar');
          }
          h.line([h.P(S.a0, lp, 2.2 * k), h.P(S.a1, lp, 2.2 * k)], 0.06 * k, '#2a2d2f', 'metal', 'bar-rail');
        }
      };
      // the tunnel: farthest first, as the infills allow
      const soffit = (l0, l1) => {
        for (let q = 0; q < Nn; q++) {
          const c0 = cv[q], c1 = cv[q + 1], cm = [(c0[0] + c1[0]) / 2, (c0[1] + c1[1]) / 2];
          const rx = cm[0] - xm, ry = (cm[1] - ys) * (w / 2) / Math.max(rise, 0.5), rl = Math.hypot(rx, ry) || 1;
          const ref = h.P(cm[0] + rx / rl * 1.2, (l0 + l1) / 2, cm[1] + ry / rl * 1.2);
          h.face([arcP(c0, l0), arcP(c1, l0), arcP(c1, l1), arcP(c0, l1)], LDF(brick, 0.62 + 0.16 * Math.sin(Math.PI * q / Nn)), 'brick', 'soffit', ref);
        }
      };
      const fl = -nearSl;                                      // the far side
      const lN = nearSl * hw, lN2 = nearSl * (hw - setback), lF = fl * hw, lF2 = fl * (hw - setback);
      if (!infilled(nearSl)) {
        if (!infilled(fl)) soffit(lF, lF2); else infill(fl);
        soffit(lF2, lN2);
        soffit(lN2, lN);
      } else { infill(nearSl); soffit(lN2, lN); }
      // the facades: spandrel above the arch, the ring of voussoirs, soot and patches
      for (const sl of [fl, nearSl]) {
        const l = sl * hw;
        if (!h.sees([0, sl, 0], [xm, l, yR * 0.5])) continue;
        const inside = h.P(xm, 0, yR * 0.6);
        h.face(cv.map(c => arcP(c, l)).concat([h.P(S.a1, l, yStr), h.P(S.a0, l, yStr)]), brick, 'brick', 'spandrel', inside);
        // the voussoir ring: a band of darker brick one course thick following the arch
        const rv = 0.6 * k, inner = cv, outer = cv.map(c => { const rx = c[0] - xm, ry = (c[1] - ys) * (w / 2) / Math.max(rise, 0.5), rl = Math.hypot(rx, ry) || 1; return [c[0] + rx / rl * rv * 0.95, c[1] + ry / rl * rv * (rise / (w / 2))]; });
        for (let q = 0; q < Nn; q++) {
          const alt = h.fine && q % 2 ? LDF(ring, 1.12) : ring;
          h.face([arcP(inner[q], l), arcP(inner[q + 1], l), arcP(outer[q + 1], l), arcP(outer[q], l)], alt, 'brick', 'voussoir', inside);
        }
        // keystone
        if (h.px(1) >= 3) h.face([arcP([xm - 0.3 * k, inner[Nn >> 1][1]], l), arcP([xm + 0.3 * k, inner[Nn >> 1][1]], l), arcP([xm + 0.34 * k, inner[Nn >> 1][1] + rv * 1.5], l), arcP([xm - 0.34 * k, inner[Nn >> 1][1] + rv * 1.5], l)], stone, 'stone', 'keystone', inside);
        // soot streaks falling from the string course, patches of repair and the odd lighter course
        if (h.px(1) >= 1.6) {
          for (let sx = S.a0 + 0.6 * k; sx < S.a1 - 0.4 * k; sx += (1.3 + 2 * rr()) * k) {
            const hgt = Math.min(yStr - 0.5 * k - (ys + rise * Math.sqrt(Math.max(0, 1 - ((sx - xm) / (w / 2)) ** 2))) - rv * 1.1, (0.8 + 2.4 * rr()) * k * sootK * 2.5);
            if (hgt < 0.4 * k) continue;
            h.line([h.P(sx, l + sl * 0.01, yStr - 0.45 * k), h.P(sx + (rr() - 0.5) * 0.2 * k, l + sl * 0.01, yStr - 0.45 * k - hgt)], (0.12 + 0.2 * rr()) * k, '#1d1a18', 'stone', 'soot', { alpha: 0.2 + 0.25 * sootK });
          }
          for (let t = 0; t < 2; t++) if (rr() < 0.55) {
            const px = S.a0 + (0.4 + 0.5 * rr()) * (S.a1 - S.a0) - 0.4 * k, py = ys + rise * (0.9 + 0.2 * rr()) + rv + 0.1 * k, pwid = (0.7 + 1.2 * rr()) * k, phei = (0.5 + 0.8 * rr()) * k;
            if (py + phei < yStr - 0.5 * k) h.face([h.P(px, l + sl * 0.01, py), h.P(px + pwid, l + sl * 0.01, py), h.P(px + pwid, l + sl * 0.01, py + phei), h.P(px, l + sl * 0.01, py + phei)], patch, 'brick', 'patch', null);
          }
        }
        // brick courses, only where they read
        if (h.px(0.3) >= 4.5) for (let yy = 0.9 * k; yy < yStr - 0.4 * k; yy += 0.45 * k) h.line([h.P(S.a0, l + sl * 0.005, yy), h.P(S.a1, l + sl * 0.005, yy)], 0.02 * k, LDF(brick, 0.82), 'brick', 'course', { alpha: 0.4 });
        // a buddleia seeded in the string course (the viaduct's own garden)
        if (rr() < 0.42) { const bx = S.a0 + (0.15 + 0.7 * rr()) * (S.a1 - S.a0); for (let t = 0; t < 4; t++) h.disc(h.P(bx + (rr() - 0.5) * 0.7 * k, l + sl * 0.1 * k, yStr + (0.1 + 0.5 * rr()) * k), (0.22 + 0.25 * rr()) * k, '#5d7a46', 'leaf', 'weed', 0.8); }
      }
    };
    // ============================================================ the steel plate-girder span (the arcade's gap)
    const plateSpan = (S) => {
      h.part('plate' + S.i, { layer: 3 });
      const aa = S.a0 - pw * 0.3, bb = S.a1 + pw * 0.3, yB = yR - 2.2 * k, yTp = yR + 0.12 * k;
      // underside, with its cross beams
      h.face([h.P(aa, -hw, yB), h.P(bb, -hw, yB), h.P(bb, hw, yB), h.P(aa, hw, yB)], LDF(steelDk, 0.9), 'metal', 'underside', h.P((aa + bb) / 2, 0, yB + 1));
      if (h.px(1) >= 2.5) for (let xx = aa + 1.6 * k; xx < bb; xx += 1.6 * k) h.line([h.P(xx, -hw, yB - 0.02), h.P(xx, hw, yB - 0.02)], 0.18 * k, LDF(steelDk, 0.7), 'metal', 'cross-beam');
      for (const sl of [-eyeSide, eyeSide]) {
        const l = sl * hw;
        if (!h.sees([0, sl, 0], [(aa + bb) / 2, l, yB + 1])) continue;
        const inside = h.P((aa + bb) / 2, 0, yB + 1);
        h.face([h.P(aa, l, yB), h.P(bb, l, yB), h.P(bb, l, yTp), h.P(aa, l, yTp)], steel, 'paint', 'plate', inside);
        h.line([h.P(aa, l + sl * 0.03, yB + 0.12 * k), h.P(bb, l + sl * 0.03, yB + 0.12 * k)], 0.22 * k, steelDk, 'metal', 'flange');
        h.line([h.P(aa, l + sl * 0.03, yTp - 0.1 * k), h.P(bb, l + sl * 0.03, yTp - 0.1 * k)], 0.22 * k, steelDk, 'metal', 'flange');
        if (h.px(1) >= 2.2) for (let xx = aa + 1.4 * k; xx < bb - 0.5; xx += 1.7 * k) h.line([h.P(xx, l + sl * 0.03, yB + 0.2 * k), h.P(xx, l + sl * 0.03, yTp - 0.2 * k)], 0.12 * k, steelDk, 'metal', 'stiffener');
        // a steel parapet of vertical railings over the girder
        h.face([h.P(aa, l, yTp), h.P(bb, l, yTp), h.P(bb, l, yTp + 1.05 * k), h.P(aa, l, yTp + 1.05 * k)], LDF(steel, 0.92), 'paint', 'parapet-plate', inside);
        h.line([h.P(aa, l, yTp + 1.08 * k), h.P(bb, l, yTp + 1.08 * k)], 0.12 * k, steelDk, 'metal', 'handrail');
      }
    };
    // ============================================================ the through lattice girder spans
    const girderSpan = (S, A, Bp) => {
      h.part('girder' + S.i, { layer: 3 });
      const aa = A.x, bb = Bp.x, Ls = bb - aa, yB = yR - 1.4 * k, yD = yR + 0.35 * k, gh = 3.3 * k, cam = 0.5 * k;
      const top = (a) => yD + gh + cam * Math.sin(Math.PI * (a - aa) / Ls);
      // the underside of the deck: belt plate, longitudinal stringers and cross beams
      h.face([h.P(aa, -hw, yB), h.P(bb, -hw, yB), h.P(bb, hw, yB), h.P(aa, hw, yB)], LDF(steelDk, 0.82), 'metal', 'underside', h.P((aa + bb) / 2, 0, yB + 1));
      if (h.px(1) >= 2.2) {
        for (let xx = aa + 1.5 * k; xx < bb - 0.3; xx += 1.5 * k) h.line([h.P(xx, -hw, yB - 0.03), h.P(xx, hw, yB - 0.03)], 0.2 * k, LDF(steelDk, 0.65), 'metal', 'cross-beam');
        for (const lj of [-hw * 0.5, 0, hw * 0.5]) h.line([h.P(aa, lj, yB - 0.03), h.P(bb, lj, yB - 0.03)], 0.24 * k, LDF(steelDk, 0.65), 'metal', 'stringer');
      }
      const panels = Math.max(4, Math.round(Ls / (3.1 * k))), pl = Ls / panels, Nz = 8;
      const girder = (sl) => {
        const l = sl * (hw - 0.2 * k), lo = sl * (hw - 0.2 * k + 0.02);
        // the plate band: a riveted web with its flanges
        h.face([h.P(aa, l, yB), h.P(bb, l, yB), h.P(bb, l, yD), h.P(aa, l, yD)], steel, 'paint', 'web', null);
        h.line([h.P(aa, lo, yB + 0.14 * k), h.P(bb, lo, yB + 0.14 * k)], 0.28 * k, steelDk, 'metal', 'flange');
        h.line([h.P(aa, lo, yD - 0.1 * k), h.P(bb, lo, yD - 0.1 * k)], 0.26 * k, steelDk, 'metal', 'flange');
        if (h.px(0.15) >= 2) for (let xx = aa + 0.6 * k; xx < bb; xx += 0.6 * k) { h.disc(h.P(xx, lo, yB + 0.36 * k), 0.035 * k, steelDk, 'metal', 'rivet', 1); h.disc(h.P(xx, lo, yD - 0.34 * k), 0.035 * k, steelDk, 'metal', 'rivet', 1); }
        // the top chord, a camber of short pieces
        const topPts = []; for (let q = 0; q <= Nz; q++) { const a = aa + Ls * q / Nz; topPts.push(h.P(a, lo, top(a))); }
        h.line(topPts, 0.46 * k, steel, 'paint', 'top-chord');
        h.line(topPts, 0.2 * k, steelDk, 'metal', 'top-chord-edge', { alpha: 0.6 });
        // verticals and Warren diagonals
        for (let q = 0; q <= panels; q++) { const a = aa + pl * q; h.line([h.P(a, lo, yD), h.P(a, lo, top(a))], q === 0 || q === panels ? 0.42 * k : 0.22 * k, steel, 'paint', 'post'); }
        for (let q = 0; q < panels; q++) {
          const a0 = aa + pl * q, a1 = a0 + pl, up = q % 2 === 0;
          h.line([h.P(up ? a0 : a1, lo, yD), h.P(up ? a1 : a0, lo, top(up ? a1 : a0))], 0.2 * k, steel, 'paint', 'diagonal');
        }
        // gusset plates where the diagonals meet the chords
        if (h.px(0.4) >= 3) for (let q = 1; q < panels; q++) { const a = aa + pl * q; h.disc(h.P(a, lo, yD + 0.25 * k), 0.34 * k, steelDk, 'metal', 'gusset', 0.9); h.disc(h.P(a, lo, top(a) - 0.25 * k), 0.34 * k, steelDk, 'metal', 'gusset', 0.9); }
      };
      girder(-eyeSide);
      // the cross bracing between the top chords, seen through the lattice
      if (h.px(1) >= 2) for (let q = 1; q < panels; q += 2) { const a = aa + pl * q; h.line([h.P(a, -hw + 0.2 * k, top(a)), h.P(a + pl, hw - 0.2 * k, top(a + pl))], 0.12 * k, steelDk, 'metal', 'brace'); h.line([h.P(a, hw - 0.2 * k, top(a)), h.P(a + pl, -hw + 0.2 * k, top(a + pl))], 0.12 * k, steelDk, 'metal', 'brace'); }
      girder(eyeSide);
    };
    // ============================================================ assemble
    if (kind === 'arcade') {
      for (const pr of piers) pierBox(pr.x, 'pier' + Math.round(pr.x * 10), pr.ab);
      // the arcade piers above the plinth are drawn by the facade (the pilaster and the spandrel): the body of each pier face, first
      for (const S of spans) {
        if (S.steelSpan) plateSpan(S);
        else archSpan(S);
      }
      // the pilasters, the string course, the parapet: one part at the front
      h.part('top', { layer: 4 });
      const yStr = yR - 0.4 * k, aEnd0 = piers[0].x - pw / 2 - 0.1, aEnd1 = piers[piers.length - 1].x + pw / 2 + 0.1;
      for (const sl of [-1, 1]) {
        if (!h.sees([0, sl, 0], [0, sl * hw, yR * 0.5])) continue;
        // the pier faces up to the string course (the brick between the arches), and a pilaster in the middle of each
        for (const pr of piers) {
          const w = pr.ab ? pw * 0.7 : pw / 2, inside = h.P(pr.x, 0, 3);
          if (pr.ab && gap > 0) h.face([h.P(pr.x - w, sl * hw, 1.1 * k), h.P(pr.x + w, sl * hw, 1.1 * k), h.P(pr.x + w, sl * hw, yR + 0.12 * k), h.P(pr.x - w, sl * hw, yR + 0.12 * k)], brick, 'brick', 'pier-face', inside);
          else h.face([h.P(pr.x - w, sl * hw, 1.1 * k), h.P(pr.x + w, sl * hw, 1.1 * k), h.P(pr.x + w, sl * hw, yStr), h.P(pr.x - w, sl * hw, yStr)], brick, 'brick', 'pier-face', inside);
          h.box(pr.x - w * 0.55, pr.x + w * 0.55, sl * hw, sl * (hw + 0.32 * k), 1.1 * k, yStr - 1.4 * k, brick, LDF(brick, 1.1), 'brick', 'pilaster');
          h.box(pr.x - w * 0.7, pr.x + w * 0.7, sl * hw, sl * (hw + 0.4 * k), yStr - 1.4 * k, yStr - 1.25 * k, stone, stone, 'stone', 'pilaster-cap');
          if (h.px(1) >= 2.5) h.line([h.P(pr.x + w * 0.25, sl * (hw + 0.4 * k), 0.6 * k), h.P(pr.x + w * 0.25, sl * (hw + 0.4 * k), yStr - 0.6 * k)], 0.1 * k, '#2a2c2a', 'metal', 'downpipe', { alpha: rn('dp' + pr.x)() < 0.45 ? 1 : 0 });
        }
        // the string course, a band proud of the wall; the parapet with its coping
        const inside = h.P(0, 0, yR * 0.5);
        h.box(aEnd0, aEnd1, sl * (hw - 0.05), sl * (hw + 0.14 * k), yStr, yR - 0.02 * k, stone, LDF(stone, 1.12), 'stone', 'string-course');
        h.face([h.P(aEnd0, sl * (hw + 0.1 * k), yR), h.P(aEnd1, sl * (hw + 0.1 * k), yR), h.P(aEnd1, sl * (hw + 0.1 * k), yR + 1.1 * k), h.P(aEnd0, sl * (hw + 0.1 * k), yR + 1.1 * k)], LDF(brick, 1.02), 'brick', 'parapet', inside);
        h.box(aEnd0, aEnd1, sl * (hw - 0.3 * k), sl * (hw + 0.3 * k), yR + 1.1 * k, yR + 1.25 * k, stone, LDF(stone, 1.15), 'stone', 'coping');
      }
      // the uplighters at the pier feet (lit after dusk)
      for (const pr of piers) if (!pr.ab || gap === 0) if (rn('up' + pr.x)() < 0.55) { const sl = eyeSide; h.lamp(pr.x, sl * (hw + 0.45 * k), 0.55 * k, 0.1 * k, { col: '#cfe0ff', kind: 'uplight', theta: 0.5 }); }
    } else {
      for (let i = 0; i < piers.length; i++) pierBox(piers[i].x, 'pier' + i, false);
      for (let i = 0; i + 1 < piers.length; i++) girderSpan(spans[i], piers[i], piers[i + 1]);
      if (o.masts) {
        h.part('masts', { layer: 5 });
        const ph = 5.4 * k;
        for (let xx = piers[0].x + pitch / 2; xx < piers[piers.length - 1].x; xx += pitch / 2) {
          const sl = eyeSide, lm = sl * (hw + 0.5 * k);
          h.line([h.P(xx, lm, yR + 0.3 * k), h.P(xx, lm, yR + ph + 0.2 * k)], 0.22 * k, '#7b8186', 'metal', 'mast');
          h.line([h.P(xx, lm, yR + ph), h.P(xx, sl * 1.8 * k, yR + ph - 0.25 * k)], 0.1 * k, '#7b8186', 'metal', 'arm');
        }
        const wire = (ll, yy, w) => h.line([h.P(piers[0].x, ll, yy), h.P(piers[piers.length - 1].x, ll, yy)], w, '#2c2e30', 'metal', 'wire');
        wire(eyeSide * 1.8 * k, yR + ph - 0.25 * k, 0.05 * k); wire(eyeSide * 1.6 * k, yR + ph - 1.1 * k, 0.04 * k);
      }
    }
    return { height: (kind === 'girder' ? yR + 4.0 * k + (o.masts ? 2.6 * k : 0) : yR + 1.3 * k), lights: h.lights };
  },
});
