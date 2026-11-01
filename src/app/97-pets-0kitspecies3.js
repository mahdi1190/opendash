/* ============================================================
   PETS, more species: the ones with a body all of their own (2.23, agent
   'pets'). PURE. Birds on legs, bugs, sea creatures and the mythical ones. The
   parts are the same as everywhere (97-pets-0kitdraw.js), so the same CSS
   gaits, scene sprites and accessories work; wingB / wingN flap, legsN / legsF /
   paw step or wiggle, ears twitch, tail sways.
   ============================================================ */
const _ptP0 = () => ({ wingB: [], legsF: [], legsG: [], tail: [], body: [], legsN: [], paw: [], wingN: [], neck: [], ears: [], head: [], eyes: [], fx: [] });
const _PT_ORD = Object.freeze(['wingB', 'legsF', 'legsG', 'tail', 'body', 'legsN', 'paw', 'wingN', 'neck', 'ears', 'head', 'eyes', 'fx']);
/** The usual return of a drawing. */
function _ptOwn(parts, x, y, r, eyesAt, o) {
  o = o || {};
  return { parts, order: o.order || _PT_ORD.slice(), piv: Object.assign({ head: [x, y + r * 0.8], eyes: [x, eyesAt[2]], ears: [x, y - r * 0.6], body: [50, 90], tail: [x - r, y], paw: [x, y + r], legsN: [x, 80], legsF: [x, 80] }, o.piv || {}),
    acc: Object.assign({ hc: [x, y, r], neck: { x: x - r * 0.04, y: y + r * 0.86, w: r * 1.05, rot: 0 }, top: [x + r * 0.02, y - r * 0.84, r * 1.2, 3], eyes: eyesAt, ear: [x - r * 0.62, y - r * 0.8, r * 0.24] }, o.acc || {}),
    top: o.top == null ? y - r * 1.5 : o.top, bird: !!o.bird, flap: o.flap || '' };
}
const _ptSleepMood = (pose, mood) => (pose === 'sleep' ? Object.assign({}, mood, { eyes: 'closed' }) : mood);

/* ---------- birds on legs: the robin, the chick, the goose, the flamingo, the penguin, the peacock ---------- */
function _ptUpBird(pet, pose, mood, X, k) {
  const parts = _ptP0(), sleep = pose === 'sleep', walk = pose === 'walk', G = 90, a = k.t || X.a;
  const ll = sleep ? 0 : k.ll * (walk ? 0.96 : 1), ry = k.ry * (sleep ? 0.86 : 1), rx = k.rx * (walk ? 1.05 : 1), cx = k.cx || 46, cy = G - ll - ry * (sleep ? 0.98 : 0.95);
  const md = _ptSleepMood(pose, mood), feet = k.feet || '#e8a24a', tilt = walk ? (k.tilt == null ? 10 : k.tilt) : 0;
  const c = { pet, pose, mood: md, X, cx, cy, rx, ry, a, sleep, walk };
  if (!sleep) {
    const leg = (x0, far) => {
      const col = far ? _ptMix(feet, '#000000', 0.18) : feet, y0 = cy + ry * 0.72, out = [_pL(_pP`M${x0} ${y0}L${x0} ${G - 1.2}`, col, k.lw || 2)];
      if (k.web) out.push(_pF(_pP`M${x0 - 2} ${G - 1.8}L${x0 + 6.4} ${G - 1}L${x0 + 5.8} ${G + 0.6}Q${x0 + 2} ${G + 0.2} ${x0 - 2} ${G + 0.6}z`, col));
      else out.push(_pL(_pP`M${x0 - 2.2} ${G}L${x0 + 3.6} ${G}M${x0 + 0.4} ${G}L${x0 + 2.6} ${G - 1.6}`, col, (k.lw || 2) * 0.72));
      return out;
    };
    parts.legsF.push(...leg(cx + (k.legs || 4) + 1, true));
    parts.legsN.push(...leg(cx - (k.legs || 4) + 1));
  }
  if (k.tail) parts.tail.push(...k.tail(c));
  const bodyRot = tilt ? -tilt : 0;
  parts.body.push(..._ptBlob(cx, cy, rx, ry, a, bodyRot));
  if (k.belly) k.belly(c).forEach(s => parts.body.push(s));
  // the near wing
  const wc = k.wing || a[1], wx = cx - rx * 0.1, wy = cy - ry * 0.05, wl = k.wingL || 1;
  parts.paw.push(_pF(_pP`M${wx + rx * 0.42} ${wy - ry * 0.42}Q${wx - rx * 0.5 * wl} ${wy - ry * 0.5} ${wx - rx * 0.86 * wl} ${wy + ry * 0.52 * wl}Q${wx - rx * 0.14} ${wy + ry * 0.6} ${wx + rx * 0.42} ${wy + ry * 0.12}z`, wc));
  parts.paw.push(_pL(_pP`M${wx - rx * 0.1} ${wy - ry * 0.1}Q${wx - rx * 0.4} ${wy + ry * 0.1} ${wx - rx * 0.6} ${wy + ry * 0.4}`, _ptMix(wc, '#000000', 0.25), 0.9, 0.5));
  // the head
  const r = k.r, hxk = k.hx == null ? rx * 0.42 : k.hx, hyk = k.hy == null ? ry * 0.7 : k.hy;
  const x = sleep ? cx + rx * 0.5 : cx + hxk, y = sleep ? cy - ry * 0.5 : cy - hyk;
  if (k.neck && !sleep) {
    const n = _pP`M${cx + rx * 0.5} ${cy - ry * 0.42}Q${x + (k.neckBend || -8)} ${(cy - ry * 0.42 + y) / 2} ${x - r * 0.1} ${y + r * 0.5}`;
    parts.neck.unshift(_pL(n, a[0], k.neck), _pL(n, a[2], k.neck * 0.22, 0.32));
  }
  const ht = k.ht || a;
  parts.head.push(..._ptHeadShape(x, y, r, ht, { w: k.hw || 1.0, h: 0.98, jaw: 0.94 }));
  if (k.decor) k.decor(c, x, y, r).forEach(s => parts.head.push(s));
  const eyesAt = _ptEyeAt(x, y, r, { s: k.es || 0.21, dy: -0.1 });
  parts.eyes.push(..._ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], md, X));
  const bx = x + r * 0.09, by = y + r * 0.22, bc = _ptTone(k.bill || X.nose || '#f2b33d');
  if (k.beak === 'long') {
    parts.head.push(_pF(_pP`M${bx - r * 0.36} ${by + r * 0.02}Q${bx + r * 0.3} ${by - r * 0.14} ${bx + r * 1.02} ${by + r * 0.18}Q${bx + r * 0.3} ${by + r * 0.6} ${bx - r * 0.36} ${by + r * 0.42}z`, bc[0]), _pL(_pP`M${bx - r * 0.3} ${by + r * 0.24}Q${bx + r * 0.3} ${by + r * 0.28} ${bx + r * 0.92} ${by + r * 0.2}`, bc[1], r * 0.06, 0.7));
    if (k.tipC) parts.head.push(_pF(_pP`M${bx + r * 0.5} ${by - r * 0.02}Q${bx + r * 0.84} ${by + r * 0.04} ${bx + r * 1.02} ${by + r * 0.18}Q${bx + r * 0.8} ${by + r * 0.38} ${bx + r * 0.46} ${by + r * 0.42}z`, k.tipC));
  } else {
    parts.head.push(_pF(_pP`M${bx - r * 0.24} ${by}L${bx + r * 0.3} ${by + r * 0.12}L${bx - r * 0.04} ${by + r * 0.32}Q${bx - r * 0.24} ${by + r * 0.24} ${bx - r * 0.24} ${by}z`, bc[0]), _pF(_pE(bx - r * 0.1, by + r * 0.04, r * 0.07, r * 0.035), '#ffffff', 0.5));
    if (mood.mouth === 'open' && !sleep) parts.head.push(_pF(_pP`M${bx - r * 0.2} ${by + r * 0.26}L${bx + r * 0.12} ${by + r * 0.3}L${bx - r * 0.06} ${by + r * 0.46}z`, bc[1]));
  }
  parts.head.push(..._ptBlush(eyesAt[0] - r * 0.14, eyesAt[1] + r * 0.14, y + r * 0.26, r * 0.14, 0.3));
  const tallTop = Math.min(y - r * 1.5, k.top == null ? 100 : k.top(c));
  return _ptOwn(parts, x, y, r, eyesAt, { top: tallTop, bird: true, piv: { paw: [wx + rx * 0.3, wy - ry * 0.3], legsN: [cx - 3, cy + ry * 0.7], legsF: [cx + 5, cy + ry * 0.7], tail: [cx - rx * 0.7, cy], head: [x, y + r * 0.8] } });
}
function _ptRobin(pet, pose, mood, X) {
  const breast = X.b, m = pet.marks;
  return _ptUpBird(pet, pose, mood, X, { rx: 19, ry: 19, ll: 7, r: 12.5, hx: 7, hy: 13, lw: 1.4, feet: '#7a5a48', bill: '#3a2e2a', wing: X.a[1], es: 0.24, legs: 3,
    tail(c) { const d = _pP`M${c.cx - c.rx * 0.7} ${c.cy + 4}Q${c.cx - c.rx * 1.3} ${c.cy - 2} ${c.cx - c.rx * 1.5} ${c.cy - 12}`; return [_pL(d, c.a[1], 6.4), _pL(d, c.a[0], 2.6)]; },
    belly(c) { const b = [_pF(_pE(c.cx + c.rx * 0.3, c.cy + c.ry * 0.28, c.rx * 0.66, c.ry * 0.68), '#fbf4ea')]; b.push(_pF(_pE(c.cx + c.rx * 0.42, c.cy - c.ry * 0.14, c.rx * 0.56, c.ry * 0.56), breast[0])); if (m === 'speckle') for (const [u, v] of [[0.1, 0.4], [0.4, 0.55], [0.65, 0.35], [0.25, 0.7]]) b.push(_pF(_pC(c.cx + u * c.rx, c.cy + v * c.ry, 0.9), '#7a5a48', 0.8)); return b; },
    decor(c, x, y, r) { return [_pF(_pP`M${x - r * 0.22} ${y + r * 0.92}Q${x + r * 0.5} ${y + r * 0.86} ${x + r * 0.92} ${y + r * 0.1}Q${x + r * 0.62} ${y - r * 0.32} ${x + r * 0.14} ${y - r * 0.2}Q${x - r * 0.42} ${y + r * 0.22} ${x - r * 0.22} ${y + r * 0.92}z`, breast[0])]; },
  });
}
function _ptChick(pet, pose, mood, X) {
  const m = pet.marks;
  return _ptUpBird(pet, pose, mood, X, { rx: 20, ry: 20, ll: 6, r: 14, hx: 6, hy: 14, lw: 1.8, feet: '#ee9a3a', bill: '#ef8f2e', wing: X.a[1], es: 0.24, legs: 5, wingL: 0.72,
    tail(c) { return [_pF(_pP`M${c.cx - c.rx * 0.8} ${c.cy - 4}L${c.cx - c.rx * 1.3} ${c.cy - 12}L${c.cx - c.rx * 1.05} ${c.cy - 4}L${c.cx - c.rx * 1.4} ${c.cy - 2}L${c.cx - c.rx * 0.8} ${c.cy + 4}z`, c.a[0])]; },
    belly(c) { const b = [_pF(_pE(c.cx + c.rx * 0.22, c.cy + c.ry * 0.3, c.rx * 0.6, c.ry * 0.56), X.b[0], 0.9)]; if (m === 'speckle') for (const [u, v] of [[-0.5, -0.4], [-0.1, -0.6], [-0.5, 0.2], [0.4, 0.5]]) b.push(_pF(_pC(c.cx + u * c.rx, c.cy + v * c.ry, 1.3), X.c[0], 0.85)); return b; },
    decor(c, x, y, r) {
      const out = [];
      if (m === 'comb') for (const [u, s] of [[-0.16, 0.2], [0.1, 0.24], [0.36, 0.18]]) out.push(_pF(_pC(x + r * u, y - r * 1.02, r * s), '#e0473e'));
      else if (m === 'shell') out.push(_pF(_pP`M${x - r * 0.8} ${y - r * 0.42}L${x - r * 0.52} ${y - r * 0.8}L${x - r * 0.28} ${y - r * 0.5}L${x} ${y - r * 0.92}L${x + r * 0.3} ${y - r * 0.5}L${x + r * 0.58} ${y - r * 0.8}L${x + r * 0.84} ${y - r * 0.42}Q${x + r * 0.72} ${y - r * 1.22} ${x} ${y - r * 1.24}Q${x - r * 0.72} ${y - r * 1.22} ${x - r * 0.8} ${y - r * 0.42}z`, '#fbf6ea'), _pL(_pP`M${x - r * 0.5} ${y - r * 1.0}l${r * 0.12} ${r * 0.1}`, '#d6cdb8', 0.8));
      else out.push(_pF(_pP`M${x - r * 0.1} ${y - r * 0.88}Q${x - r * 0.24} ${y - r * 1.3} ${x + r * 0.08} ${y - r * 1.36}Q${x + r * 0.02} ${y - r * 1.12} ${x + r * 0.22} ${y - r * 0.88}z`, c.a[0]));
      return out;
    },
  });
}
function _ptGoose(pet, pose, mood, X) {
  const m = pet.marks;
  return _ptUpBird(pet, pose, mood, X, { cx: 40, rx: 21, ry: 15.5, ll: 10, r: 11, hx: 22, hy: 37, neck: 7.6, neckBend: -5, lw: 2.2, feet: X.nose || '#f08a3c', bill: X.nose || '#f08a3c', web: true, wing: X.a[1], es: 0.2, legs: 5, beak: 'long', tilt: 4,
    tail(c) { return [_pF(_pP`M${c.cx - c.rx * 0.72} ${c.cy - 5}L${c.cx - c.rx * 1.34} ${c.cy - 12}L${c.cx - c.rx * 1.06} ${c.cy + 2}z`, c.a[0])]; },
    belly(c) { return [_pF(_pE(c.cx + c.rx * 0.1, c.cy + c.ry * 0.5, c.rx * 0.74, c.ry * 0.42), X.b[0], 0.85)]; },
    decor(c, x, y, r) { const out = []; if (m === 'bow') out.push(_pF(_pP`M${x - r * 0.3} ${y + r * 1.5}l${-r * 0.6} ${-r * 0.36}l0 ${r * 0.72}z`, '#3b74d6'), _pF(_pP`M${x - r * 0.3} ${y + r * 1.5}l${r * 0.6} ${-r * 0.36}l0 ${r * 0.72}z`, '#3b74d6'), _pF(_pC(x - r * 0.3, y + r * 1.5, r * 0.15), '#2f5ab0')); if (m === 'cap') out.push(_pF(_pE(x - r * 0.04, y - r * 0.62, r * 0.82, r * 0.44), X.c[0])); return out; },
  });
}
function _ptFlamingo(pet, pose, mood, X) {
  const m = pet.marks;
  return _ptUpBird(pet, pose, mood, X, { cx: 38, rx: 17, ry: 12.5, ll: 34, r: 8.6, hx: 18, hy: 32, neck: 5, neckBend: 10, lw: 1.8, feet: X.c[0], bill: '#f4e6d6', tipC: '#2a2124', beak: 'long', wing: X.a[1], es: 0.22, legs: 2, tilt: 2,
    tail(c) { return [_pF(_pP`M${c.cx - c.rx * 0.7} ${c.cy - 3}Q${c.cx - c.rx * 1.3} ${c.cy - 2} ${c.cx - c.rx * 1.42} ${c.cy + 5}Q${c.cx - c.rx * 1.02} ${c.cy + 6} ${c.cx - c.rx * 0.7} ${c.cy + 4}z`, c.a[1])]; },
    belly(c) { const b = [_pF(_pE(c.cx + c.rx * 0.14, c.cy + c.ry * 0.44, c.rx * 0.7, c.ry * 0.44), X.b[0], 0.7)]; if (m === 'tips') b.push(_pF(_pE(c.cx - c.rx * 0.76, c.cy + c.ry * 0.3, c.rx * 0.22, c.ry * 0.3), '#2a2124')); return b; },
    decor(c, x, y, r) { return m === 'shades' ? [_pF(_pE(x + r * 0.2, y - r * 0.08, r * 0.82, r * 0.26), '#2a2124', 0.9)] : []; },
  });
}
function _ptPenguin(pet, pose, mood, X) {
  const belly = X.b, m = pet.marks, parts = null;
  const A = _ptUpBird(pet, pose, mood, X, { cx: 48, rx: 17, ry: 27, ll: 3, r: 14, hx: 4, hy: 25, lw: 2.8, feet: X.nose || '#f08a3c', bill: X.nose || '#f08a3c', web: true, wing: X.a[1], es: 0.2, legs: 7, wingL: 0.8, tilt: 3,
    tail(c) { return [_pF(_pP`M${c.cx - c.rx * 0.76} ${c.cy + c.ry * 0.7}L${c.cx - c.rx * 1.3} ${c.cy + c.ry * 0.98}L${c.cx - c.rx * 0.4} ${c.cy + c.ry * 0.92}z`, c.a[0])]; },
    belly(c) { return [_pF(_pP`M${c.cx + 1} ${c.cy - c.ry * 0.74}Q${c.cx + c.rx * 0.98} ${c.cy - c.ry * 0.5} ${c.cx + c.rx * 0.84} ${c.cy + c.ry * 0.5}Q${c.cx + c.rx * 0.5} ${c.cy + c.ry * 0.98} ${c.cx + 1} ${c.cy + c.ry * 0.96}Q${c.cx - c.rx * 0.66} ${c.cy + c.ry * 0.9} ${c.cx - c.rx * 0.6} ${c.cy + c.ry * 0.2}Q${c.cx - c.rx * 0.5} ${c.cy - c.ry * 0.5} ${c.cx + 1} ${c.cy - c.ry * 0.74}z`, belly[0])]; },
    decor(c, x, y, r) {
      const out = [_pF(_pP`M${x - r * 0.62} ${y - r * 0.1}Q${x - r * 0.26} ${y - r * 0.5} ${x + r * 0.08} ${y - r * 0.12}Q${x + r * 0.42} ${y - r * 0.5} ${x + r * 0.8} ${y - r * 0.1}Q${x + r * 0.9} ${y + r * 0.72} ${x + r * 0.08} ${y + r * 0.86}Q${x - r * 0.76} ${y + r * 0.72} ${x - r * 0.62} ${y - r * 0.1}z`, belly[0])];
      if (m === 'crest') for (const side of [-1, 1]) out.push(_pF(_pP`M${x + side * r * 0.5} ${y - r * 0.5}Q${x + side * r * 1.1} ${y - r * 0.76} ${x + side * r * 1.2} ${y - r * 0.28}Q${x + side * r * 0.92} ${y - r * 0.5} ${x + side * r * 0.5} ${y - r * 0.28}z`, '#f2c23a'));
      if (m === 'scarf') out.push(_pF(_pE(x, y + r * 1.0, r * 0.9, r * 0.26), '#d9534a'), _pF(_pP`M${x - r * 0.5} ${y + r * 1.02}l${-r * 0.1} ${r * 0.6}l${r * 0.36} ${-r * 0.06}l${r * 0.06} ${-r * 0.5}z`, '#c0433c'));
      return out;
    },
  });
  return A;
}
function _ptPeacock(pet, pose, mood, X) {
  const a = X.a, fan = X.b, eye = X.c, m = pet.marks;
  return _ptUpBird(pet, pose, mood, X, { cx: 50, rx: 13, ry: 14.5, ll: 14, r: 9.5, hx: 7, hy: 22, neck: 6.4, neckBend: -3, lw: 1.7, feet: '#8a7a68', bill: '#d9c090', wing: _ptMix(a[0], fan[0], 0.45), es: 0.22, legs: 3, tilt: 2,
    top: (c) => (c.pose === 'sit' ? 28 : 100),
    tail(c) {
      const out = [], cx = c.cx - 3, cy = c.cy + 2;
      const dot = (ex, ey, s) => [_pF(_pC(ex, ey, s), fan[0]), _pF(_pC(ex, ey, s * 0.62), eye[0]), _pF(_pC(ex + s * 0.08, ey, s * 0.28), a[3])];
      if (c.pose === 'sit' && m !== 'folded') {
        const n = 9, R = 42;
        for (let i = 0; i < n; i++) {
          const t = -Math.PI * (0.06 + 0.88 * i / (n - 1)), ex = cx + Math.cos(t) * R, ey = cy + Math.sin(t) * R * 0.92, wa = 6.6;
          out.push(_pF(_pP`M${cx} ${cy}Q${cx + Math.cos(t - 0.2) * R * 0.6} ${cy + Math.sin(t - 0.2) * R * 0.6} ${ex + Math.cos(t - 1.57) * wa} ${ey + Math.sin(t - 1.57) * wa}Q${ex + Math.cos(t) * wa} ${ey + Math.sin(t) * wa} ${ex + Math.cos(t + 1.57) * wa} ${ey + Math.sin(t + 1.57) * wa}Q${cx + Math.cos(t + 0.2) * R * 0.6} ${cy + Math.sin(t + 0.2) * R * 0.6} ${cx} ${cy}z`, i % 2 ? a[1] : _ptMix(a[0], fan[0], 0.55)));
          out.push(...dot(ex, ey, 4.1));
          if (i < n - 1) { const t2 = t - Math.PI * 0.05, e2 = R * 0.68; out.push(...dot(cx + Math.cos(t2) * e2, cy + Math.sin(t2) * e2 * 0.92, 2.5)); }
        }
      } else {
        // the train, trailing
        const ex = cx - 38, ey = 88;
        out.push(_pF(_pP`M${cx + 3} ${cy - 5}Q${cx - 18} ${cy + 2} ${ex} ${ey - 3}Q${ex + 2} ${ey + 2} ${ex + 7} ${ey + 1}Q${cx - 14} ${cy + 16} ${cx + 4} ${cy + 8}z`, _ptMix(a[0], fan[0], 0.5)));
        for (const [u, v] of [[-26, 6], [-16, 2], [-32, 9], [-22, 10]]) out.push(...dot(cx + u, cy + v + 2, 2.3));
      }
      return out;
    },
    belly(c) { return [_pF(_pE(c.cx + c.rx * 0.2, c.cy + c.ry * 0.3, c.rx * 0.5, c.ry * 0.5), a[2], 0.3)]; },
    decor(c, x, y, r) { const out = []; for (const u of [-0.28, 0, 0.28]) out.push(_pL(_pP`M${x + r * u * 0.5} ${y - r * 0.86}L${x + r * u} ${y - r * 1.5}`, a[3], 0.8), _pF(_pC(x + r * u, y - r * 1.56, r * 0.14), fan[0])); out.push(_pF(_pE(x + r * 0.5, y - r * 0.18, r * 0.42, r * 0.18), '#fbf8f2', 0.9)); return out; },
  });
}

/* ---------- the mole ---------- */
function _ptMole(pet, pose, mood, X) {
  const parts = _ptP0(), a = X.a, sleep = pose === 'sleep', walk = pose === 'walk', m = pet.marks, md = _ptSleepMood(pose, mood);
  const cx = 44, cy = sleep ? 76 : walk ? 73 : 69, rx = walk ? 26 : 22, ry = sleep ? 14 : walk ? 16 : 20, pink = _ptMix(_PTK_PINK, '#ffffff', 0.12);
  parts.tail.push(_pL(_pP`M${cx - rx * 0.9} ${cy + ry * 0.5}q-6 1 -8 -3`, pink, 2));
  if (!sleep) parts.legsF.push(_pF(_pE(cx - rx * 0.4 + 3, 88.6, 5, 2), _ptMix(pink, '#000000', 0.12)), _pF(_pE(cx + rx * 0.5 + 3, 88.6, 5.4, 2), _ptMix(pink, '#000000', 0.12)));
  parts.body.push(..._ptBlob(cx, cy, rx, ry, a), _pF(_pE(cx + rx * 0.2, cy + ry * 0.5, rx * 0.6, ry * 0.36), a[1], 0.5));
  const r = 13.5, x = sleep ? cx + rx * 0.7 : walk ? cx + rx * 0.78 : cx + rx * 0.3, y = sleep ? cy + 1 : walk ? cy - 2 : cy - ry * 0.62;
  // the great spade hands
  const hand = (hx, hy, q) => [_pF(_pE(hx, hy, 6.2 * q, 4.4 * q), pink), _pL(_pP`M${hx + 2} ${hy + 2 * q}l1.6 3M${hx - 0.6} ${hy + 3 * q}l0.4 3.2M${hx - 3.4} ${hy + 2.4 * q}l-0.8 3`, _ptMix(pink, '#6a3a40', 0.4), 1.1)];
  if (sleep) parts.paw.push(...hand(x + 3, 85.6, 0.9));
  else { parts.legsN.push(...hand(cx - rx * 0.46, 85.8, 1)); parts.paw.push(...hand(walk ? x + 4 : x + 7, walk ? 85.8 : cy + 11, 1.05)); }
  const head = _ptHeadShape(x, y, r, a, { w: 1.1, h: 0.94, jaw: 0.9 });
  if (m === 'miner') head.push(_pF(_pP`M${x - r * 0.82} ${y - r * 0.5}Q${x} ${y - r * 1.5} ${x + r * 0.82} ${y - r * 0.5}L${x + r * 1.0} ${y - r * 0.36}L${x - r * 1.0} ${y - r * 0.36}z`, '#f2c23a'), _pF(_pC(x + r * 0.1, y - r * 0.76, r * 0.18), '#fff4c0'));
  const eyesAt = _ptEyeAt(x, y, r, { s: 0.09, dy: 0 });
  parts.eyes.push(..._ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], md, X));
  // the pink star of a nose
  const nx = x + r * 0.09, ny = y + r * 0.42;
  head.push(_pF(_ptStar(nx, ny, r * 0.42, r * 0.2, 9), pink), _pF(_pC(nx, ny, r * 0.16), _ptMix(pink, '#c05a6a', 0.5)));
  head.push(..._ptMouth(nx, ny + r * 0.42, r * 0.14, mood), ..._ptBlush(eyesAt[0] - r * 0.1, eyesAt[1] + r * 0.1, y + r * 0.22, r * 0.15, 0.3));
  parts.head.push(...head);
  return _ptOwn(parts, x, y, r, eyesAt, { piv: { legsN: [cx - rx * 0.46, 82], paw: [x + 3, cy + 6], tail: [cx - rx * 0.9, cy + ry * 0.5] }, top: Math.min(cy - ry - 3, y - r * 1.2) });
}

/* ---------- the snail ---------- */
function _ptSnail(pet, pose, mood, X) {
  const parts = _ptP0(), shell = X.a, skin = X.b, band = X.c, sleep = pose === 'sleep', walk = pose === 'walk', md = _ptSleepMood(pose, mood), m = pet.marks;
  const G = 90, stretch = walk ? 1.08 : 1;
  // the soft foot along the ground
  parts.body.push(_pF(_pP`M${14} ${G - 0.5}Q${40} ${G - 2} ${sleep ? 60 : 74 * stretch} ${G - 0.5}Q${sleep ? 72 : 88 * stretch} ${G - 2} ${sleep ? 72 : 86 * stretch} ${sleep ? G - 9 : G - 16}Q${sleep ? 66 : 74} ${sleep ? G - 16 : G - 12} ${40} ${G - 10}Q${24} ${G - 8} ${14} ${G - 0.5}z`, skin[0]), _pF(_pP`M${20} ${G - 1}Q${50} ${G - 3} ${72} ${G - 1}Q${50} ${G} ${20} ${G - 1}z`, skin[1], 0.45));
  const sx = 42, sy = sleep ? 66 : 62, R = sleep ? 21 : 23;
  parts.body.push(..._ptBlob(sx, sy, R, R * 0.98, shell, 0, { shadeOp: 0.3, lightOp: 0.4 }));
  let d = '', th = 0;
  for (let i = 0; i <= 26; i++) { th = i / 26 * Math.PI * 4.4 + 0.6; const q = R * (0.88 - i / 26 * 0.8); d += (i ? 'L' : 'M') + _ptR(sx + Math.cos(th) * q) + ' ' + _ptR(sy + Math.sin(th) * q * 0.98); }
  parts.body.push(_pL(d, band[0], m === 'bold' ? 3.2 : 2.2, 0.9), _pL(d, shell[2], 0.8, 0.5));
  if (m === 'dots') for (const [u, v] of [[-0.62, -0.5], [0.5, -0.62], [0.72, 0.2], [-0.72, 0.3], [0.1, 0.7]]) parts.body.push(_pF(_pC(sx + u * R, sy + v * R, 1.6), skin[0]));
  const r = 11, x = sleep ? 68 : 78 * stretch, y = sleep ? G - 12 : G - 21;
  if (!sleep) {
    for (const [u, top] of [[-0.34, 1.9], [0.52, 2.0]]) parts.ears.push(_pL(_pP`M${x + r * u} ${y - r * 0.5}Q${x + r * (u + 0.04)} ${y - r * (top - 0.4)} ${x + r * (u + 0.14)} ${y - r * top}`, skin[u < 0 ? 1 : 0], 2.4));
    for (const [u, top] of [[-0.2, 2.0], [0.66, 2.1]]) parts.ears.push(_pF(_pC(x + r * u, y - r * top, 2.2), skin[0]));
  }
  parts.head.push(..._ptHeadShape(x, y, r, skin, { w: 1.02, h: 0.92, jaw: 1 }));
  const eyesAt = _ptEyeAt(x, y, r, { s: 0.22, dy: -0.12 });
  parts.eyes.push(..._ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], md, X));
  parts.head.push(..._ptBlush(eyesAt[0] - r * 0.12, eyesAt[1] + r * 0.12, y + r * 0.34, r * 0.16, 0.35), ..._ptMouth(x + r * 0.09, y + r * 0.46, r * 0.22, mood));
  return _ptOwn(parts, x, y, r, eyesAt, { top: sy - R - 3, piv: { body: [50, 90], tail: [14, G - 2] }, acc: { neck: { x: x - r * 0.2, y: y + r * 0.84, w: r * 1.1, rot: -14 }, top: [sx + 4, sy - R * 0.92, R * 1.2, -6] } });
}

/* ---------- the ladybird ---------- */
function _ptLadybird(pet, pose, mood, X) {
  const parts = _ptP0(), shell = X.a, spot = X.c, sleep = pose === 'sleep', md = _ptSleepMood(pose, mood), m = pet.marks;
  const cx = 42, cy = sleep ? 76 : 72, rx = 25, ry = sleep ? 14 : 17, ink = _ptTone('#26212a');
  if (!sleep) {
    parts.legsF.push(_pL(_pP`M${cx - 10} ${cy + ry * 0.7}L${cx - 12} ${89}`, ink[1], 2.2), _pL(_pP`M${cx + 10} ${cy + ry * 0.7}L${cx + 12} ${89}`, ink[1], 2.2));
    parts.legsN.push(_pL(_pP`M${cx - 16} ${cy + ry * 0.66}L${cx - 20} ${89}`, ink[0], 2.4));
    parts.paw.push(_pL(_pP`M${cx + 2} ${cy + ry * 0.8}L${cx + 3} ${89.4}`, ink[0], 2.4), _pL(_pP`M${cx + 16} ${cy + ry * 0.7}L${cx + 19} ${89}`, ink[0], 2.4));
  }
  parts.body.push(_pF(_pP`M${cx - rx} ${cy + ry * 0.74}Q${cx - rx * 1.04} ${cy - ry} ${cx} ${cy - ry}Q${cx + rx * 1.04} ${cy - ry} ${cx + rx} ${cy + ry * 0.74}Q${cx} ${cy + ry * 1.05} ${cx - rx} ${cy + ry * 0.74}z`, shell[0]));
  parts.body.push(_pF(_pE(cx + 5, cy + ry * 0.38, rx * 0.8, ry * 0.46), shell[1], 0.36), _pF(_pE(cx - 9, cy - ry * 0.56, rx * 0.36, ry * 0.2), shell[2], 0.55));
  parts.body.push(_pL(_pP`M${cx + 7} ${cy - ry * 0.98}Q${cx + 1} ${cy} ${cx + 5} ${cy + ry * 0.86}`, ink[0], 1.5, 0.85));
  const sp = m === 'many' ? [[-0.66, -0.15], [-0.38, -0.62], [-0.3, 0.1], [-0.68, 0.38], [-0.2, 0.52], [0.5, -0.56], [0.72, -0.05], [0.42, 0.14], [0.58, 0.52]] : m === 'two' ? [[-0.42, -0.1], [0.56, -0.1]] : [[-0.56, -0.22], [-0.3, 0.3], [-0.2, -0.56], [0.52, -0.42], [0.64, 0.22]];
  for (const [u, v] of sp) parts.body.push(_pF(_pE(cx + u * rx, cy + v * ry, m === 'two' ? 5.4 : 3.4, m === 'two' ? 5 : 3.1), spot[0]));
  const r = 12, x = cx + rx * 0.98, y = cy + (sleep ? 3 : 1);
  if (!sleep) for (const u of [-0.3, 0.46]) parts.ears.push(_pL(_pP`M${x + r * u} ${y - r * 0.76}Q${x + r * (u + 0.1)} ${y - r * 1.4} ${x + r * (u + 0.42)} ${y - r * 1.56}`, ink[0], 1.4), _pF(_pC(x + r * (u + 0.42), y - r * 1.58, 1.5), ink[0]));
  parts.head.push(..._ptHeadShape(x, y, r, ink, { w: 1.02, h: 0.94, jaw: 1 }));
  parts.head.push(_pF(_pE(x + r * 0.09, y + r * 0.5, r * 0.44, r * 0.28), '#f6efe2', 0.9));
  const eyesAt = _ptEyeAt(x, y, r, { s: 0.25, dy: -0.12 });
  for (const ex of [eyesAt[0], eyesAt[1]]) parts.head.push(_pF(_pC(ex, eyesAt[2], r * 0.31), '#fbf8f2'));
  parts.eyes.push(..._ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], md, X));
  parts.head.push(..._ptMouth(x + r * 0.09, y + r * 0.52, r * 0.2, mood), ..._ptBlush(eyesAt[0] - r * 0.2, eyesAt[1] + r * 0.2, y + r * 0.4, r * 0.15, 0.5));
  return _ptOwn(parts, x, y, r, eyesAt, { top: cy - ry - 3, bird: false, piv: { legsN: [cx - 16, cy + ry * 0.66], paw: [cx + 8, cy + ry * 0.8], legsF: [cx, cy + ry * 0.7], tail: [cx - rx, cy] } });
}

/* ---------- the bumblebee ---------- */
function _ptBee(pet, pose, mood, X) {
  const parts = _ptP0(), a = X.a, band = _ptTone(X.c[0]), sleep = pose === 'sleep', walk = pose === 'walk', md = _ptSleepMood(pose, mood), m = pet.marks;
  const cx = 44, cy = sleep ? 76 : walk ? 58 : 62, rx = 22, ry = sleep ? 13 : 16;
  // the wings
  const wy = cy - ry * 0.74, wing = '#dff2fb';
  const W = (x0, s, op) => [_pF(_pP`M${x0} ${wy + 2}Q${x0 - 5 * s} ${wy - 22 * s} ${x0 - 22 * s} ${wy - 24 * s}Q${x0 - 28 * s} ${wy - 10 * s} ${x0} ${wy + 2}z`, wing, op), _pL(_pP`M${x0 - 2} ${wy}Q${x0 - 10 * s} ${wy - 12 * s} ${x0 - 20 * s} ${wy - 20 * s}`, '#a8cfe0', 0.8, 0.8)];
  if (sleep) parts.wingN.push(_pF(_pE(cx - 8, cy - ry * 0.8, 15, 5), wing, 0.85, _ptRot(10, cx - 8, cy - ry * 0.8)));
  else { parts.wingB.push(...W(cx + 2, 0.9, 0.7)); parts.wingN.push(...W(cx - 3, 1.05, 0.85)); }
  // the sting and the fuzzy body
  parts.tail.push(_pF(_pP`M${cx - rx * 0.92} ${cy - 3}L${cx - rx * 1.34} ${cy + 1}L${cx - rx * 0.92} ${cy + 4}z`, band[1]));
  parts.body.push(..._ptBlob(cx, cy, rx, ry, a, 0, { shadeOp: 0.25 }));
  const st = m === 'tail' ? [-0.62, -0.2] : [-0.62, -0.18, 0.28];
  for (const u of st) parts.body.push(_pF(_pP`M${cx + u * rx - 4} ${cy - ry * Math.sqrt(1 - u * u) * 0.99}Q${cx + u * rx + 3} ${cy} ${cx + u * rx - 4} ${cy + ry * Math.sqrt(1 - u * u) * 0.99}L${cx + u * rx + 4} ${cy + ry * Math.sqrt(1 - (u + 0.18) * (u + 0.18)) * 0.97}Q${cx + u * rx + 11} ${cy} ${cx + u * rx + 4} ${cy - ry * Math.sqrt(1 - (u + 0.18) * (u + 0.18)) * 0.97}z`, band[0]));
  if (m === 'tail') parts.body.push(_pF(_pE(cx - rx * 0.78, cy, rx * 0.22, ry * 0.5), '#fbf6ea', 0.95));
  // fuzz along the back
  let d = `M${_ptR(cx - rx * 0.9)} ${_ptR(cy - ry * 0.44)}`;
  for (let i = 0; i < 8; i++) { const t = Math.PI * (1.12 + i / 7 * 0.76); d += `L${_ptR(cx + Math.cos(t) * rx * (i % 2 ? 0.98 : 1.1))} ${_ptR(cy + Math.sin(t) * ry * (i % 2 ? 0.98 : 1.12))}`; }
  parts.body.push(_pL(d, a[2], 1.1, 0.75));
  // the little legs, hanging
  parts.legsF.push(_pL(_pP`M${cx - 6} ${cy + ry * 0.84}l-2 ${sleep ? 2 : 6}`, band[1], 1.8), _pL(_pP`M${cx + 7} ${cy + ry * 0.84}l1 ${sleep ? 2 : 6}`, band[1], 1.8));
  parts.legsN.push(_pL(_pP`M${cx} ${cy + ry * 0.92}l-1 ${sleep ? 2 : 7}`, band[0], 2));
  const r = 13.5, x = cx + rx * 0.84, y = cy - ry * 0.26 + (sleep ? 2 : 0);
  for (const side of [-0.32, 0.52]) parts.ears.push(_pL(_pP`M${x + r * side} ${y - r * 0.76}Q${x + r * (side - 0.1)} ${y - r * 1.4} ${x + r * (side + 0.3)} ${y - r * 1.64}`, band[0], 1.5), _pF(_pC(x + r * (side + 0.3), y - r * 1.66, 1.7), band[0]));
  parts.head.push(..._ptHeadShape(x, y, r, a, { w: 1.04, h: 0.98, jaw: 1 }));
  const eyesAt = _ptEyeAt(x, y, r, { s: 0.26, dy: -0.08 });
  parts.eyes.push(..._ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], md, X));
  parts.head.push(..._ptBlush(eyesAt[0] - r * 0.14, eyesAt[1] + r * 0.14, y + r * 0.4, r * 0.17, 0.42), ..._ptMouth(x + r * 0.09, y + r * 0.52, r * 0.2, mood));
  return _ptOwn(parts, x, y, r, eyesAt, { bird: true, flap: sleep ? '' : 'buzz', top: Math.min(y - r * 1.9, wy - 26), piv: { wingB: [cx + 2, wy + 2], wingN: [cx - 3, wy + 2], legsN: [cx, cy + ry * 0.8], legsF: [cx, cy + ry * 0.8], tail: [cx - rx, cy] } });
}

/* ---------- the butterfly (front on: both wings open, a face between them) ---------- */
function _ptButterfly(pet, pose, mood, X) {
  const parts = _ptP0(), a = X.a, spot = X.b, edge = X.c, sleep = pose === 'sleep', md = _ptSleepMood(pose, mood), m = pet.marks;
  const cx = 50, cy = sleep ? 72 : 60, k = sleep ? 0.8 : 1;
  const wing = (side, into) => {
    const s = side * k, up = _pP`M${cx + s * 2} ${cy - 2}Q${cx + s * 10} ${cy - 30 * k} ${cx + s * 32} ${cy - 30 * k}Q${cx + s * 42} ${cy - 18 * k} ${cx + s * 32} ${cy - 2 * k}Q${cx + s * 16} ${cy + 3} ${cx + s * 2} ${cy + 1}z`;
    const lo = _pP`M${cx + s * 2} ${cy + 1}Q${cx + s * 14} ${cy + 3} ${cx + s * 25} ${cy + 4 * k}Q${cx + s * 32} ${cy + 16 * k} ${cx + s * 21} ${cy + 26 * k}Q${cx + s * 10} ${cy + 26 * k} ${cx + s * 2} ${cy + 8}z`;
    into.push(_pF(up, edge[0]), _pF(lo, edge[0]));
    into.push(_pF(_pP`M${cx + s * 3} ${cy - 2}Q${cx + s * 11} ${cy - 26 * k} ${cx + s * 30} ${cy - 26 * k}Q${cx + s * 37} ${cy - 16 * k} ${cx + s * 29} ${cy - 4 * k}Q${cx + s * 15} ${cy} ${cx + s * 3} ${cy}z`, a[0]));
    into.push(_pF(_pP`M${cx + s * 3} ${cy + 2}Q${cx + s * 13} ${cy + 4} ${cx + s * 23} ${cy + 6 * k}Q${cx + s * 28} ${cy + 15 * k} ${cx + s * 20} ${cy + 22 * k}Q${cx + s * 11} ${cy + 22 * k} ${cx + s * 3} ${cy + 8}z`, a[side < 0 ? 1 : 0]));
    into.push(_pF(_pC(cx + s * 25, cy - 16 * k, 5.6 * k), spot[0]), _pF(_pC(cx + s * 16, cy + 13 * k, 4 * k), spot[0]));
    if (m === 'eyes') into.push(_pF(_pC(cx + s * 25, cy - 16 * k, 3 * k), edge[0]), _pF(_pC(cx + s * 16, cy + 13 * k, 2.1 * k), edge[0]));
    if (m === 'stripes') into.push(_pL(_pP`M${cx + s * 8} ${cy - 5}L${cx + s * 22} ${cy - 24 * k}M${cx + s * 6} ${cy + 4}L${cx + s * 14} ${cy + 18 * k}`, edge[0], 1.5, 0.75));
    for (const [u, v] of [[34, -24], [38, -12], [30, 18]]) into.push(_pF(_pC(cx + s * u * 0.94, cy + v * k, 1.1), '#fbf8f2', 0.85));
  };
  wing(-1, parts.wingB); wing(1, parts.wingN);
  const body = _ptTone(_ptMix(edge[0], '#3a2e38', 0.5));
  parts.body.push(_pF(_pE(cx, cy + 10 * k, 4, 17 * k), body[0]), _pF(_pE(cx - 1, cy + 6 * k, 1.3, 10 * k), body[2], 0.5));
  for (const dy of [0, 7, 14]) parts.body.push(_pL(_pP`M${cx - 3.4} ${cy + (6 + dy) * k}q3.4 1.6 6.8 0`, body[3], 0.9, 0.5));
  const r = 12.5, x = cx, y = cy - 8 * k;
  for (const side of [-1, 1]) parts.ears.push(_pL(_pP`M${x + side * r * 0.3} ${y - r * 0.8}Q${x + side * r * 0.5} ${y - r * 1.6} ${x + side * r * 1.1} ${y - r * 1.84}`, body[0], 1.3), _pF(_pC(x + side * r * 1.14, y - r * 1.86, 1.7), body[0]));
  parts.head.push(..._ptHeadShape(x, y, r, _ptTone(_ptMix(a[0], '#fbf6ee', 0.72)), { w: 1, h: 0.96, jaw: 0.96 }));
  const eyesAt = [x - r * 0.38, x + r * 0.38, y - r * 0.02, r * 0.24];
  parts.eyes.push(..._ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], md, X));
  parts.head.push(..._ptBlush(eyesAt[0] - r * 0.14, eyesAt[1] + r * 0.14, y + r * 0.4, r * 0.16, 0.45), ..._ptMouth(x, y + r * 0.5, r * 0.18, mood));
  return _ptOwn(parts, x, y, r, eyesAt, { bird: true, flap: 'fold', top: y - r * 2, piv: { wingB: [cx, cy], wingN: [cx, cy], tail: [cx, cy] }, acc: { neck: null } });
}

/* ---------- the crab ---------- */
function _ptCrab(pet, pose, mood, X) {
  const parts = _ptP0(), a = X.a, b = X.b, sleep = pose === 'sleep', md = _ptSleepMood(pose, mood), m = pet.marks;
  const cx = 50, cy = sleep ? 79 : 72, rx = 25, ry = sleep ? 10.5 : 14;
  // the legs
  for (const [u, far] of [[-1, 0], [1, 0]]) for (const i of [0, 1, 2]) {
    const x0 = cx + u * (rx * 0.66 + i * 2), x1 = cx + u * (rx * 0.98 + i * 3.8), mid = cx + u * (rx * 1.02 + i * 2.8);
    (i === 1 ? parts.legsF : u < 0 ? parts.legsN : parts.legsG).push(_pL(_pP`M${x0} ${cy + ry * 0.4}Q${mid} ${cy + ry * 0.2} ${x1} ${89}`, i === 1 ? a[1] : a[0], 2.4));
  }
  // the claws
  const claw = (sx, into, q) => {
    const px = cx + sx * (rx * 0.9), py = cy - 2, ex = cx + sx * (rx * 1.2), ey = sleep ? cy - 2 : cy - ry * 1.3, s = sx;
    into.push(_pL(_pP`M${px} ${py}Q${ex + s * 3} ${py - 2} ${ex} ${ey + 4}`, a[0], 3.8));
    into.push(_pF(_pP`M${ex - s * 6} ${ey + 2}Q${ex - s * 8} ${ey - 9} ${ex + s * 1} ${ey - 10 * q}Q${ex - s * 1.5} ${ey - 4} ${ex + s * 1} ${ey - 1}Q${ex + s * 6} ${ey - 7 * q} ${ex + s * 8} ${ey - 3}Q${ex + s * 7} ${ey + 6} ${ex} ${ey + 7}Q${ex - s * 5} ${ey + 6} ${ex - s * 6} ${ey + 2}z`, a[0]), _pF(_pE(ex - s * 2, ey + 1, 2.6, 2), a[2], 0.6));
  };
  claw(-1, parts.tail, 1); claw(1, parts.paw, m === 'bigclaw' ? 1.25 : 1);
  parts.body.push(_pF(_pP`M${cx - rx} ${cy}Q${cx - rx * 0.9} ${cy - ry} ${cx} ${cy - ry}Q${cx + rx * 0.9} ${cy - ry} ${cx + rx} ${cy}Q${cx + rx * 0.84} ${cy + ry} ${cx} ${cy + ry}Q${cx - rx * 0.84} ${cy + ry} ${cx - rx} ${cy}z`, a[0]));
  parts.body.push(_pF(_pE(cx + 2, cy + ry * 0.42, rx * 0.8, ry * 0.46), a[1], 0.34), _pF(_pE(cx - 8, cy - ry * 0.56, rx * 0.4, ry * 0.22), a[2], 0.5));
  if (m === 'spots') for (const [u, v] of [[-0.55, -0.3], [-0.2, -0.55], [0.5, -0.36], [0.68, 0.1], [-0.7, 0.2]]) parts.body.push(_pF(_pC(cx + u * rx, cy + v * ry, 1.7), b[0], 0.9));
  if (m === 'shell') parts.body.push(_pF(_pP`M${cx - 15} ${cy - ry * 0.8}Q${cx} ${cy - ry * 2.4} ${cx + 15} ${cy - ry * 0.8}z`, b[0]), _pL(_pP`M${cx} ${cy - ry * 0.8}L${cx} ${cy - ry * 1.72}M${cx - 7} ${cy - ry * 0.8}L${cx - 3} ${cy - ry * 1.56}M${cx + 7} ${cy - ry * 0.8}L${cx + 3} ${cy - ry * 1.56}`, X.c[0], 0.9, 0.8));
  // eyes on stalks
  const eyesAt = [cx - 7, cx + 8, cy - ry - (sleep ? 1 : 7), 4.2];
  if (!sleep) for (const ex of [eyesAt[0], eyesAt[1]]) parts.ears.push(_pL(_pP`M${ex} ${cy - ry + 2}L${ex} ${eyesAt[2] + 2}`, a[1], 2.2));
  for (const ex of [eyesAt[0], eyesAt[1]]) parts.head.push(_pF(_pC(ex, eyesAt[2], 5.4), '#fbf8f2'));
  parts.eyes.push(..._ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], md, X));
  const head = parts.head;
  head.push(..._ptMouth(cx + 1, cy + 2, 3.4, mood), ..._ptBlush(cx - 14, cx + 16, cy + 1, 3, 0.45));
  return _ptOwn(parts, cx, cy - ry * 0.4, ry * 1.1, eyesAt, { top: eyesAt[2] - 10, piv: { paw: [cx + rx * 0.9, cy - 2], tail: [cx - rx * 0.9, cy - 2], legsN: [cx - rx * 0.7, cy], legsG: [cx + rx * 0.7, cy], legsF: [cx, cy], head: [cx, cy] }, acc: { neck: { x: cx, y: cy + ry * 0.6, w: rx * 1.1, rot: 0 }, top: [cx, cy - ry * 0.94, rx * 0.9, 0], ear: [cx - 16, cy - ry * 0.7, 3.4] } });
}

/* ---------- the octopus ---------- */
function _ptOctopus(pet, pose, mood, X) {
  const parts = _ptP0(), a = X.a, b = X.b, sleep = pose === 'sleep', walk = pose === 'walk', md = _ptSleepMood(pose, mood), m = pet.marks;
  const cx = 50, cy = sleep ? 66 : 54, rx = 21, ry = sleep ? 19 : 25;
  const arm = (x0, x1, into, t, w) => {
    const y0 = cy + ry * 0.5, d = _pP`M${x0} ${y0}Q${x0 + (x1 - x0) * 0.5} ${y0 + (89 - y0) * 0.5 + 4} ${x1} ${86}Q${x1 + (x1 - x0) * 0.4} ${90} ${x1 + (x1 - x0) * 0.7} ${84}`;
    into.push(_pL(d, t[0], w));
    if (w > 5) for (const k of [0.45, 0.7, 0.9]) into.push(_pF(_pC(x0 + (x1 - x0) * k, y0 + (86 - y0) * k + 0.4 + (k > 0.8 ? 2 : 0), 1.1), b[0], 0.9));
  };
  const spread = walk ? 1.06 : 1;
  arm(cx - 9, cx - 26 * spread, parts.legsF, a.map((q) => _ptMix(q, '#000000', 0.14)), 5.2);
  arm(cx + 9, cx + 26 * spread, parts.legsG, a.map((q) => _ptMix(q, '#000000', 0.14)), 5.2);
  arm(cx - 14, cx - 38 * spread, parts.legsN, a, 6.4);
  arm(cx + 14, cx + 38 * spread, parts.paw, a, 6.4);
  arm(cx - 3, cx - 12, parts.tail, a, 6.4); arm(cx + 3, cx + 12, parts.tail, a, 6.4);
  // the dome (the head is the body)
  const r = rx, x = cx, y = cy;
  parts.head.push(_pF(_pP`M${x - rx} ${y + ry * 0.2}Q${x - rx * 1.12} ${y - ry} ${x} ${y - ry}Q${x + rx * 1.12} ${y - ry} ${x + rx} ${y + ry * 0.2}Q${x + rx * 0.98} ${y + ry * 0.74} ${x} ${y + ry * 0.74}Q${x - rx * 0.98} ${y + ry * 0.74} ${x - rx} ${y + ry * 0.2}z`, a[0]));
  parts.head.push(_pF(_pE(x + rx * 0.32, y + ry * 0.1, rx * 0.5, ry * 0.56), a[1], 0.22), _pF(_pE(x - rx * 0.32, y - ry * 0.56, rx * 0.34, ry * 0.2), a[2], 0.55));
  if (m === 'spots') for (const [u, v] of [[-0.5, -0.6], [0, -0.78], [0.5, -0.55], [-0.68, -0.15], [0.7, -0.1]]) parts.head.push(_pF(_pC(x + u * rx, y + v * ry, 2.4), X.c[0], 0.75));
  if (m === 'stripes') for (const v of [-0.74, -0.52]) parts.head.push(_pL(_pP`M${x - rx * Math.sqrt(1 - v * v)} ${y + v * ry}Q${x} ${y + (v - 0.14) * ry} ${x + rx * Math.sqrt(1 - v * v)} ${y + v * ry}`, X.c[0], 2.2, 0.7));
  const ey = y + ry * 0.1, eyesAt = [x - rx * 0.36, x + rx * 0.42, ey, 4.6];
  parts.eyes.push(..._ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], md, X));
  parts.head.push(..._ptBlush(eyesAt[0] - 3, eyesAt[1] + 3, ey + 6, 3.2, 0.42), ..._ptMouth(x + 1, ey + 7.4, 3.4, mood));
  return _ptOwn(parts, x, y, r, eyesAt, { top: y - ry - 2, piv: { head: [x, y + ry * 0.7], legsN: [cx - 14, cy + ry * 0.5], legsF: [cx - 9, cy + ry * 0.5], legsG: [cx + 9, cy + ry * 0.5], paw: [cx + 14, cy + ry * 0.5], tail: [cx, cy + ry * 0.5], ears: [x, y] }, acc: { neck: { x, y: y + ry * 0.72, w: rx * 1.3, rot: 0 }, top: [x, y - ry * 0.94, rx * 1.1, 2], ear: [x - rx * 0.6, y - ry * 0.74, 3.6] } });
}

/* ---------- the bat ---------- */
function _ptBat(pet, pose, mood, X) {
  const parts = _ptP0(), a = X.a, wing = _ptTone(X.c[0]), b = X.b, sleep = pose === 'sleep', walk = pose === 'walk', md = _ptSleepMood(pose, mood), m = pet.marks;
  const cx = 50, cy = sleep ? 72 : walk ? 58 : 68, rx = 12.5, ry = 15;
  const WS = (side, into, t) => {
    const s = side;
    if (walk) into.push(_pF(_pP`M${cx + s * 6} ${cy - 10}Q${cx + s * 24} ${cy - 26} ${cx + s * 44} ${cy - 16}Q${cx + s * 39} ${cy - 5} ${cx + s * 40} ${cy + 6}Q${cx + s * 32} ${cy - 2} ${cx + s * 26} ${cy + 8}Q${cx + s * 20} ${cy - 2} ${cx + s * 12} ${cy + 8}Q${cx + s * 9} ${cy} ${cx + s * 6} ${cy - 10}z`, t[0]), _pL(_pP`M${cx + s * 6} ${cy - 10}L${cx + s * 26} ${cy + 6}M${cx + s * 8} ${cy - 12}L${cx + s * 38} ${cy + 2}`, t[3], 0.9, 0.5));
    else into.push(_pF(_pP`M${cx + s * 7} ${cy - 11}Q${cx + s * 22} ${cy - 14} ${cx + s * 22} ${cy + 2}Q${cx + s * 21} ${cy + 15} ${cx + s * 10} ${cy + 18}Q${cx + s * 4} ${cy + 8} ${cx + s * 7} ${cy - 11}z`, t[0]), _pL(_pP`M${cx + s * 10} ${cy - 8}L${cx + s * 15} ${cy + 12}`, t[3], 0.9, 0.5));
  };
  WS(-1, parts.wingB, wing); WS(1, parts.wingN, wing);
  parts.body.push(..._ptBlob(cx, cy, rx, ry, a), _pF(_pE(cx + 1, cy + 3, rx * 0.6, ry * 0.62), b[0], 0.9));
  if (!sleep) { parts.legsF.push(_pL(_pP`M${cx + 4} ${cy + ry * 0.86}L${cx + 5} ${walk ? cy + ry * 1.3 : 88.6}`, a[1], 2)); parts.legsN.push(_pL(_pP`M${cx - 4} ${cy + ry * 0.86}L${cx - 5} ${walk ? cy + ry * 1.3 : 88.6}`, a[0], 2)); }
  const r = 14, x = cx, y = cy - ry * 0.98;
  for (const side of [-1, 1]) parts.ears.push(..._ptEarTri(x, y, r, side, 1.9, a, _ptMix(_PTK_PINK, a[0], 0.3), { in: 0.14, out: 0.98, tipX: 0.84 }));
  parts.head.push(..._ptHeadShape(x, y, r, a, { w: 1.04, h: 0.92, jaw: 0.92 }));
  parts.head.push(_pF(_pE(x, y + r * 0.42, r * 0.5, r * 0.34), b[0]));
  const eyesAt = [x - r * 0.38, x + r * 0.4, y - r * 0.06, r * 0.22];
  parts.eyes.push(..._ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], md, X));
  parts.head.push(_pF(_pE(x + r * 0.02, y + r * 0.26, r * 0.1, r * 0.07), '#3a2a2c'), ..._ptMouth(x + r * 0.02, y + r * 0.44, r * 0.18, mood), ..._ptBlush(eyesAt[0] - r * 0.12, eyesAt[1] + r * 0.12, y + r * 0.34, r * 0.14, 0.34));
  if (m !== 'nofang') parts.head.push(_pF(_pP`M${x - r * 0.18} ${y + r * 0.5}l${r * 0.07} ${r * 0.2}l${r * 0.07} ${-r * 0.2}z`, '#fbf8f2'), _pF(_pP`M${x + r * 0.08} ${y + r * 0.5}l${r * 0.07} ${r * 0.2}l${r * 0.07} ${-r * 0.2}z`, '#fbf8f2'));
  return _ptOwn(parts, x, y, r, eyesAt, { bird: true, flap: walk ? 'beat' : '', top: y - r * 2, piv: { wingB: [cx - 6, cy - 10], wingN: [cx + 6, cy - 10], legsN: [cx - 4, cy + ry * 0.86], legsF: [cx + 4, cy + ry * 0.86] } });
}

/* ---------- the ghost ---------- */
function _ptGhost(pet, pose, mood, X) {
  const parts = _ptP0(), a = X.a, b = X.b, sleep = pose === 'sleep', walk = pose === 'walk', md = _ptSleepMood(pose, mood), m = pet.marks;
  const cx = 50, top = sleep ? 56 : walk ? 26 : 30, bot = sleep ? 88 : 86, rx = sleep ? 26 : 20;
  const lean = walk ? -6 : 0;
  let hem = `M${_ptR(cx - rx + lean)} ${_ptR(top + (bot - top) * 0.44)}Q${_ptR(cx - rx - 1)} ${_ptR(bot - 8)} ${_ptR(cx - rx + lean * 1.6 - 2)} ${_ptR(bot)}`;
  const wv = 4;
  for (let i = 0; i < wv; i++) { const x0 = cx - rx + lean * 1.6 - 2 + (i + 0.5) * (2 * rx + 2) / wv, x1 = cx - rx + lean * 1.6 - 2 + (i + 1) * (2 * rx + 2) / wv; hem += `Q${_ptR(x0)} ${_ptR(bot - 8)} ${_ptR(x1)} ${_ptR(bot)}`; }
  hem += `Q${_ptR(cx + rx + 1)} ${_ptR(bot - 8)} ${_ptR(cx + rx + lean)} ${_ptR(top + (bot - top) * 0.44)}Q${_ptR(cx + rx * 1.02 + lean)} ${_ptR(top)} ${_ptR(cx + lean)} ${_ptR(top)}Q${_ptR(cx - rx * 1.02 + lean)} ${_ptR(top)} ${_ptR(cx - rx + lean)} ${_ptR(top + (bot - top) * 0.44)}z`;
  parts.body.push(_pF(hem, a[0], 0.94));
  parts.body.push(_pF(_pE(cx + rx * 0.36 + lean, top + (bot - top) * 0.56, rx * 0.5, (bot - top) * 0.34), a[1], 0.26), _pF(_pE(cx - rx * 0.36 + lean, top + (bot - top) * 0.16, rx * 0.34, (bot - top) * 0.1), a[2], 0.7));
  if (m === 'stripes') for (const k of [0.6, 0.76]) parts.body.push(_pL(_pP`M${cx - rx * 0.92 + lean} ${top + (bot - top) * k}Q${cx} ${top + (bot - top) * (k + 0.05)} ${cx + rx * 0.92 + lean} ${top + (bot - top) * k}`, X.c[0], 2.6, 0.7));
  if (m === 'chain') parts.fx.push(_pL(_pP`M${cx - rx - 4} ${bot - 16}q-4 6 2 12`, '#8a8e9a', 1.8, 0.8));
  // little arms
  if (!sleep) { parts.paw.push(_pF(_pE(cx + rx * 0.96 + lean, top + (bot - top) * 0.46, 4.4, 5.4), a[0]), _pF(_pE(cx + rx * 1.02 + lean, top + (bot - top) * 0.5, 2.2, 3), a[1], 0.3)); parts.legsF.push(_pF(_pE(cx - rx * 0.96 + lean, top + (bot - top) * 0.46, 4.2, 5.2), a[1])); }
  const r = rx, x = cx + lean, y = top + (bot - top) * (sleep ? 0.46 : 0.34);
  const eyesAt = [x - r * 0.34, x + r * 0.42, y, r * 0.22];
  parts.eyes.push(..._ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], md, X));
  parts.head.push(..._ptBlush(eyesAt[0] - r * 0.12, eyesAt[1] + r * 0.12, y + r * 0.36, r * 0.17, 0.5), ..._ptMouth(x + r * 0.04, y + r * 0.46, r * 0.17, mood));
  return _ptOwn(parts, x, y, r, eyesAt, { bird: true, top: top - 2, piv: { head: [x, y + r], paw: [cx + rx * 0.9, top + (bot - top) * 0.44], legsF: [cx - rx * 0.9, top + (bot - top) * 0.44] }, acc: { neck: { x, y: y + r * 0.82, w: r * 1.5, rot: 0 }, top: [x, top + 3, r * 1.3, 2], ear: [x - r * 0.62, top + 7, r * 0.2] } });
}

/* ---------- the wisp ---------- */
function _ptWisp(pet, pose, mood, X) {
  const parts = _ptP0(), a = X.a, b = X.b, c3 = X.c, sleep = pose === 'sleep', walk = pose === 'walk', md = _ptSleepMood(pose, mood), m = pet.marks;
  const cx = 50, cy = sleep ? 72 : 60, k = sleep ? 0.72 : 1, lean = walk ? -5 : 0;
  const flame = (s, col, op) => _pF(_pP`M${cx} ${cy + 24 * k * s}Q${cx - 24 * k * s} ${cy + 22 * k * s} ${cx - 21 * k * s} ${cy}Q${cx - 18 * k * s + lean} ${cy - 13 * k * s} ${cx - 9 * k * s + lean} ${cy - 18 * k * s}Q${cx - 10 * k * s + lean} ${cy - 27 * k * s} ${cx + lean * 2} ${cy - 40 * k * s}Q${cx + 2 * k * s + lean} ${cy - 28 * k * s} ${cx + 10 * k * s + lean} ${cy - 22 * k * s}Q${cx + 22 * k * s + lean} ${cy - 10 * k * s} ${cx + 21 * k * s} ${cy + 2 * k * s}Q${cx + 22 * k * s} ${cy + 22 * k * s} ${cx} ${cy + 24 * k * s}z`, col, op);
  parts.tail.push(flame(1.14, a[0], 0.28));
  parts.body.push(flame(1, a[0]), flame(0.76, b[0]));
  parts.body.push(_pF(_pE(cx, cy + 9 * k, 13 * k, 12 * k), c3[0]));
  if (m === 'twin') parts.fx.push(_pF(_pE(cx + 30, cy - 14, 4, 6), a[0], 0.9), _pF(_pE(cx + 30, cy - 13, 2, 3), c3[0]));
  if (m === 'sparks') for (const [u, v, s] of [[-28, -18, 2.4], [28, -22, 2], [-22, 14, 1.8], [30, 10, 2.2], [-6, -44, 1.8]]) parts.fx.push(_pF(_ptStar(cx + u, cy + v * k, s * 1.5, s * 0.5, 4), c3[0]));
  const r = 17 * k, x = cx, y = cy + 6 * k;
  const eyesAt = [x - r * 0.36, x + r * 0.4, y, r * 0.24];
  parts.eyes.push(..._ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], md, X));
  parts.head.push(..._ptBlush(eyesAt[0] - r * 0.14, eyesAt[1] + r * 0.14, y + r * 0.4, r * 0.17, 0.42), ..._ptMouth(x + r * 0.03, y + r * 0.5, r * 0.18, mood));
  return _ptOwn(parts, x, y, r, eyesAt, { bird: true, top: cy - 44 * k, piv: { tail: [cx, cy + 20], head: [x, y + r] }, acc: { neck: { x, y: cy + 21 * k, w: r * 1.4, rot: 0 }, top: [x, cy - 16 * k, r * 1.2, 0], ear: [x - r * 0.72, y - r * 0.8, r * 0.22] } });
}

/* ---------- the yeti ---------- */
function _ptYeti(pet, pose, mood, X) {
  const parts = _ptP0(), a = X.a, face = X.b, sleep = pose === 'sleep', walk = pose === 'walk', md = _ptSleepMood(pose, mood), m = pet.marks, horn = '#e8dcc6';
  const cx = 50, cy = sleep ? 72 : 62, rx = sleep ? 28 : 23, ry = sleep ? 17 : 24;
  const shag = (x0, y0, x1, y1, n, col) => { let d = `M${_ptR(x0)} ${_ptR(y0)}`; for (let i = 1; i <= n; i++) { const t = i / n, px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t; d += `L${_ptR(px - (x1 - x0) / n * 0.5)} ${_ptR(py + 3.4)}L${_ptR(px)} ${_ptR(py)}`; } return _pL(d, col, 1, 0.65); };
  if (!sleep) {
    parts.legsF.push(_pF(_pE(cx + 10, 85, 8, 5), a[1]), _pF(_pE(cx + 12, 88.4, 7, 2.2), face[1]));
    parts.legsN.push(_pF(_pE(cx - 9, 85, 9, 5.4), a[0]), _pF(_pE(cx - 7, 88.4, 8, 2.2), face[0]));
  }
  parts.body.push(..._ptBlob(cx, cy, rx, ry, a));
  if (m === 'plain' || m === 'belly') parts.body.push(_pF(_pE(cx + 3, cy + ry * 0.26, rx * 0.56, ry * 0.5), m === 'belly' ? face[0] : a[2], m === 'belly' ? 0.9 : 0.35));
  parts.body.push(shag(cx - rx * 0.8, cy + ry * 0.05, cx - rx * 0.1, cy + ry * 0.08, 4, a[1]), shag(cx - rx * 0.5, cy + ry * 0.5, cx + rx * 0.3, cy + ry * 0.56, 4, a[1]));
  if (!sleep) {
    const sw = walk ? 4 : 0;
    parts.legsG.push(_pL(_pP`M${cx + rx * 0.76} ${cy - ry * 0.34}Q${cx + rx * 1.18} ${cy} ${cx + rx * 1.02 - sw} ${cy + ry * 0.62}`, a[1], 10), _pF(_pC(cx + rx * 1.02 - sw, cy + ry * 0.72, 5.6), face[1]));
    parts.paw.push(_pL(_pP`M${cx - rx * 0.76} ${cy - ry * 0.34}Q${cx - rx * 1.24} ${cy} ${cx - rx * 1.06 + sw} ${cy + ry * 0.62}`, a[0], 11), _pF(_pC(cx - rx * 1.06 + sw, cy + ry * 0.74, 6), face[0]));
  }
  const r = 16.5, x = cx + (sleep ? rx * 0.56 : 2), y = sleep ? cy + 2 : cy - ry * 0.74;
  for (const side of [-1, 1]) parts.ears.push(_pF(_pP`M${x + side * r * 0.5} ${y - r * 0.74}Q${x + side * r * 0.72} ${y - r * 1.34} ${x + side * r * 1.1} ${y - r * 1.5}Q${x + side * r * 1.16} ${y - r * 0.96} ${x + side * r * 0.9} ${y - r * 0.52}z`, m === 'nohorn' ? a[0] : horn));
  parts.head.push(..._ptHeadShape(x, y, r, a, { w: 1.12, h: 1.0, fluff: true }));
  parts.head.push(_pF(_pP`M${x - r * 0.7} ${y - r * 0.02}Q${x - r * 0.3} ${y - r * 0.56} ${x + r * 0.09} ${y - r * 0.16}Q${x + r * 0.46} ${y - r * 0.56} ${x + r * 0.84} ${y - r * 0.02}Q${x + r * 0.9} ${y + r * 0.72} ${x + r * 0.09} ${y + r * 0.78}Q${x - r * 0.76} ${y + r * 0.72} ${x - r * 0.7} ${y - r * 0.02}z`, face[0]));
  const eyesAt = _ptEyeAt(x, y, r, { s: 0.19, dy: 0.02 });
  parts.eyes.push(..._ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], md, X));
  parts.head.push(_pF(_pE(x + r * 0.09, y + r * 0.26, r * 0.1, r * 0.07), face[3]), ..._ptMouth(x + r * 0.09, y + r * 0.4, r * 0.22, mood), ..._ptBlush(eyesAt[0] - r * 0.1, eyesAt[1] + r * 0.1, y + r * 0.3, r * 0.17, 0.38));
  if (mood.mouth === 'open' && !sleep) parts.head.push(_pF(_pP`M${x - r * 0.02} ${y + r * 0.42}l${r * 0.06} ${r * 0.14}l${r * 0.06} ${-r * 0.14}z`, '#fbf8f2'));
  return _ptOwn(parts, x, y, r, eyesAt, { top: y - r * 1.7, piv: { legsN: [cx - 9, 80], legsF: [cx + 10, 80], legsG: [cx + rx * 0.76, cy - ry * 0.34], paw: [cx - rx * 0.76, cy - ry * 0.34], head: [x, y + r * 0.86] } });
}

/* ---------- the mushroom sprite ---------- */
function _ptMoosh(pet, pose, mood, X) {
  const parts = _ptP0(), cap = X.a, stalk = X.b, dots = X.c, sleep = pose === 'sleep', walk = pose === 'walk', md = _ptSleepMood(pose, mood), m = pet.marks;
  const cx = 50, y0 = sleep ? 88 : 83, h = sleep ? 22 : 30, sw = 16;
  if (!sleep) { parts.legsF.push(_pF(_pE(cx + 7, 87, 5, 3.2), stalk[1])); parts.legsN.push(_pF(_pE(cx - 7, 87.4, 5.4, 3.2), stalk[0])); }
  parts.body.push(_pF(_pP`M${cx - sw} ${y0 - h}Q${cx - sw - 3} ${y0 - h * 0.4} ${cx - sw + 1} ${y0 - 2}Q${cx} ${y0 + 3} ${cx + sw - 1} ${y0 - 2}Q${cx + sw + 3} ${y0 - h * 0.4} ${cx + sw} ${y0 - h}z`, stalk[0]));
  parts.body.push(_pF(_pE(cx + sw * 0.4, y0 - h * 0.42, sw * 0.5, h * 0.42), stalk[1], 0.22));
  if (!sleep) { parts.paw.push(_pL(_pP`M${cx + sw * 0.88} ${y0 - h * 0.56}q5 2 6 7`, stalk[0], 3.4)); parts.legsG.push(_pL(_pP`M${cx - sw * 0.88} ${y0 - h * 0.56}q-5 2 -6 7`, stalk[1], 3.4)); }
  // the cap
  const cy = y0 - h - (sleep ? -3 : 1), Rx = sleep ? 32 : 31, Ry = sleep ? 23 : 28;
  parts.head.push(_pF(_pP`M${cx - Rx} ${cy}Q${cx - Rx * 1.02} ${cy - Ry} ${cx} ${cy - Ry}Q${cx + Rx * 1.02} ${cy - Ry} ${cx + Rx} ${cy}Q${cx + Rx * 0.5} ${cy + 7} ${cx} ${cy + 7}Q${cx - Rx * 0.5} ${cy + 7} ${cx - Rx} ${cy}z`, cap[0]));
  parts.head.push(_pF(_pE(cx + Rx * 0.26, cy - Ry * 0.26, Rx * 0.62, Ry * 0.5), cap[1], 0.24), _pF(_pE(cx - Rx * 0.36, cy - Ry * 0.68, Rx * 0.3, Ry * 0.13), cap[2], 0.55));
  if (m === 'dots') for (const [u, v, s] of [[-0.56, -0.34, 5], [-0.08, -0.62, 6], [0.5, -0.42, 5.6], [0.14, -0.16, 3.6], [-0.3, -0.1, 3], [0.78, -0.1, 3]]) parts.head.push(_pF(_pE(cx + u * Rx, cy + v * Ry, s, s * 0.86), dots[0]));
  if (m === 'rings') for (const k of [0.3, 0.55]) parts.head.push(_pL(_pP`M${cx - Rx * (1 - k * 0.5)} ${cy - Ry * k}Q${cx} ${cy - Ry * (k - 0.2)} ${cx + Rx * (1 - k * 0.5)} ${cy - Ry * k}`, dots[0], 2.6, 0.75));
  parts.head.push(_pF(_pP`M${cx - Rx * 0.6} ${cy + 3}Q${cx} ${cy + 9} ${cx + Rx * 0.6} ${cy + 3}Q${cx} ${cy + 5} ${cx - Rx * 0.6} ${cy + 3}z`, stalk[1], 0.5));
  const r = 13, x = cx + 1, y = y0 - h * 0.5;
  const eyesAt = [x - r * 0.44, x + r * 0.5, y, r * 0.23];
  parts.eyes.push(..._ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], md, X));
  parts.body.push(..._ptBlush(eyesAt[0] - r * 0.14, eyesAt[1] + r * 0.14, y + r * 0.34, r * 0.16, 0.45), ..._ptMouth(x + r * 0.02, y + r * 0.42, r * 0.18, mood));
  return _ptOwn(parts, x, y, r, eyesAt, { top: cy - Ry - 2, order: ['wingB', 'legsF', 'legsG', 'tail', 'legsN', 'paw', 'body', 'wingN', 'neck', 'ears', 'head', 'eyes', 'fx'], piv: { head: [cx, cy + 5], legsN: [cx - 7, 82], legsF: [cx + 7, 82], paw: [cx + sw * 0.88, y0 - h * 0.56], legsG: [cx - sw * 0.88, y0 - h * 0.56], eyes: [x, y] }, acc: { neck: { x, y: y0 - 3, w: sw * 1.7, rot: 0 }, top: [cx, cy - Ry * 0.9, Rx * 0.8, 0], ear: [cx - Rx * 0.5, cy - Ry * 0.5, 4] } });
}

/* ---------- the cloudling ---------- */
function _ptCloud(pet, pose, mood, X) {
  const parts = _ptP0(), a = X.a, b = X.b, sleep = pose === 'sleep', md = _ptSleepMood(pose, mood), m = pet.marks;
  const cx = 50, cy = sleep ? 72 : 56, k = sleep ? 0.86 : 1;
  const puffs = [[-22, 4, 14], [-10, -8, 17], [8, -11, 19], [24, 1, 14], [-4, 8, 19], [12, 8, 16]];
  for (const [u, v, s] of puffs) parts.body.push(_pF(_pC(cx + u * k, cy + v * k, s * k), a[1], 0.55));
  for (const [u, v, s] of puffs) parts.body.push(_pF(_pC(cx + u * k - 0.8, cy + v * k - 1.2, s * k * 0.97), a[0]));
  parts.body.push(_pF(_pE(cx - 10 * k, cy - 13 * k, 10 * k, 5 * k), a[2], 0.6), _pF(_pE(cx + 8 * k, cy + 12 * k, 22 * k, 7 * k), b[0], 0.28));
  if (!sleep) {
    if (m === 'rain') for (const [u, dy] of [[-16, 26], [0, 31], [15, 27]]) parts.legsN.push(_pF(_pP`M${cx + u} ${cy + dy - 5}Q${cx + u + 3.4} ${cy + dy} ${cx + u} ${cy + dy + 2}Q${cx + u - 3.4} ${cy + dy} ${cx + u} ${cy + dy - 5}z`, '#7cc0ea'));
    if (m === 'bolt') parts.legsN.push(_pF(_pP`M${cx + 3} ${cy + 22}L${cx - 6} ${cy + 33}L${cx} ${cy + 33}L${cx - 5} ${cy + 43}L${cx + 8} ${cy + 29}L${cx + 2} ${cy + 29}L${cx + 7} ${cy + 22}z`, '#f6cf4a'));
    if (m === 'rainbow') ['#f27a8a', '#f6b25a', '#f4dd6a', '#7fd1ae', '#7cb2ea'].forEach((col, i) => parts.tail.push(_pL(_pP`M${cx - 22} ${cy + 6}Q${cx - 34} ${cy + 12 + i * 3} ${cx - 44 + i * 2.6} ${cy + 34}`, col, 2.6)));
  }
  const r = 18 * k, x = cx + 1, y = cy + 1;
  const eyesAt = [x - r * 0.42, x + r * 0.46, y - r * 0.04, r * 0.23];
  parts.eyes.push(..._ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], md, X));
  parts.head.push(..._ptBlush(eyesAt[0] - r * 0.12, eyesAt[1] + r * 0.12, y + r * 0.32, r * 0.16, 0.45), ..._ptMouth(x + r * 0.02, y + r * 0.38, r * 0.16, mood));
  return _ptOwn(parts, x, y, r, eyesAt, { bird: true, top: cy - 32 * k, piv: { head: [x, y + r], legsN: [cx, cy + 22], tail: [cx - 22, cy + 6] }, acc: { neck: { x, y: cy + 20 * k, w: r * 1.5, rot: 0 }, top: [cx + 4, cy - 29 * k, r * 1.2, 0], ear: [cx - 14, cy - 18 * k, r * 0.22] } });
}

/* ---------- the pebble golem ---------- */
function _ptGolem(pet, pose, mood, X) {
  const parts = _ptP0(), a = X.a, moss = X.c, glow = X.b, sleep = pose === 'sleep', walk = pose === 'walk', md = _ptSleepMood(pose, mood), m = pet.marks;
  const cx = 50, cy = sleep ? 76 : 64, rx = sleep ? 28 : 21, ry = sleep ? 14 : 18;
  const stone = (x0, y0, w, h, t, rot) => [_pF(_pP`M${x0 - w} ${y0 - h * 0.3}Q${x0 - w * 0.8} ${y0 - h} ${x0} ${y0 - h}Q${x0 + w * 0.86} ${y0 - h} ${x0 + w} ${y0 - h * 0.2}Q${x0 + w * 1.02} ${y0 + h * 0.8} ${x0 + w * 0.2} ${y0 + h}Q${x0 - w * 0.9} ${y0 + h} ${x0 - w} ${y0 - h * 0.3}z`, t[0], 1, rot ? _ptRot(rot, x0, y0) : null), _pF(_pE(x0 + w * 0.3, y0 + h * 0.34, w * 0.6, h * 0.5), t[1], 0.32, rot ? _ptRot(rot, x0, y0) : null), _pF(_pE(x0 - w * 0.34, y0 - h * 0.5, w * 0.34, h * 0.18), t[2], 0.5, rot ? _ptRot(rot, x0, y0) : null)];
  if (!sleep) { parts.legsF.push(...stone(cx + 9, 83, 8, 7, a.map(q => _ptMix(q, '#000000', 0.16)))); parts.legsN.push(...stone(cx - 9, 83.6, 9, 6.6, a)); }
  parts.body.push(...stone(cx, cy, rx, ry, a));
  parts.body.push(_pL(_pP`M${cx - rx * 0.5} ${cy - ry * 0.1}l${rx * 0.3} ${ry * 0.26}l${-rx * 0.1} ${ry * 0.4}M${cx + rx * 0.5} ${cy + ry * 0.1}l${-rx * 0.24} ${ry * 0.3}`, a[3], 1, 0.45));
  if (!sleep) {
    const sw = walk ? 3 : 0;
    parts.legsG.push(...stone(cx + rx * 1.02 - sw, cy + 3, 7, 9, a.map(q => _ptMix(q, '#000000', 0.12)), -8));
    parts.paw.push(...stone(cx - rx * 1.06 + sw, cy + 3, 8, 10, a, 8));
  }
  const r = 14.5, x = cx + (sleep ? rx * 0.5 : 2), y = sleep ? cy - 1 : cy - ry * 1.1;
  parts.head.push(...stone(x, y, r * 1.06, r * 0.94, a));
  // the moss and a sprout
  if (m !== 'bare') {
    parts.head.push(_pF(_pP`M${x - r * 1.0} ${y - r * 0.32}Q${x - r * 0.72} ${y - r * 1.06} ${x + r * 0.06} ${y - r * 1.0}Q${x + r * 0.9} ${y - r * 0.96} ${x + r * 1.0} ${y - r * 0.3}Q${x + r * 0.68} ${y - r * 0.5} ${x + r * 0.4} ${y - r * 0.26}Q${x + r * 0.1} ${y - r * 0.58} ${x - r * 0.26} ${y - r * 0.3}Q${x - r * 0.6} ${y - r * 0.56} ${x - r * 1.0} ${y - r * 0.32}z`, moss[0]), _pF(_pE(x - r * 0.3, y - r * 0.84, r * 0.34, r * 0.1), moss[2], 0.6));
    if (m === 'sprout') parts.ears.push(_pL(_pP`M${x} ${y - r * 0.94}L${x + r * 0.04} ${y - r * 1.36}`, moss[1], 1.6), _pF(_pE(x + r * 0.32, y - r * 1.5, r * 0.32, r * 0.14), moss[0], 1, _ptRot(-28, x + r * 0.32, y - r * 1.5)), _pF(_pE(x - r * 0.24, y - r * 1.46, r * 0.3, r * 0.13), moss[1], 1, _ptRot(28, x - r * 0.24, y - r * 1.46)));
    if (m === 'flower') parts.ears.push(_pF(_pC(x - r * 0.46, y - r * 1.02, r * 0.2), '#f6a5c0'), _pF(_pC(x - r * 0.46, y - r * 1.02, r * 0.08), '#f6d35e'));
  }
  const eyesAt = [x - r * 0.3, x + r * 0.46, y - r * 0.02, r * 0.2];
  if (md.eyes === 'closed' || md.eyes === 'happy') parts.eyes.push(..._ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], md, X, { ink: glow[0] }));
  else for (const ex of [eyesAt[0], eyesAt[1]]) parts.eyes.push(_pF(_pC(ex, eyesAt[2], r * 0.24), glow[0]), _pF(_pC(ex - r * 0.06, eyesAt[2] - r * 0.07, r * 0.09), '#ffffff', 0.9));
  parts.head.push(..._ptMouth(x + r * 0.08, y + r * 0.38, r * 0.22, mood, { ink: a[3] }), ..._ptBlush(eyesAt[0] - r * 0.12, eyesAt[1] + r * 0.1, y + r * 0.26, r * 0.15, 0.22));
  return _ptOwn(parts, x, y, r, eyesAt, { top: y - r * 1.5, piv: { legsN: [cx - 9, 78], legsF: [cx + 9, 78], legsG: [cx + rx * 1.02, cy - 4], paw: [cx - rx * 1.06, cy - 4] } });
}

Object.assign(_PT_ART, { robin: _ptRobin, chick: _ptChick, goose: _ptGoose, flamingo: _ptFlamingo, penguin: _ptPenguin, peacock: _ptPeacock, mole: _ptMole, snail: _ptSnail, ladybird: _ptLadybird, bee: _ptBee,
  butterfly: _ptButterfly, crab: _ptCrab, octopus: _ptOctopus, bat: _ptBat, ghost: _ptGhost, wisp: _ptWisp, yeti: _ptYeti, moosh: _ptMoosh, cloud: _ptCloud, golem: _ptGolem });
