/* ============================================================
   PETS, the Painted village redraw (Nov 2026, feat/painted-creatures). The owner: every pet must be truly redrawn the scene kit's way,
   with the side-on duck (97-pets-0kitpaint.js) as the bar, not shading over the old sticker drawings. In the garden's Painted village only
   (a pet card, the pet page and the old style keep their own drawing), every species is drawn here SIDE ON, the way the opening scenes'
   animals are (70-scene-lib-animals*.js): a small head in profile with one eye, a long body, legs with knees and hocks, a real tail, the
   coat built up from a shade mass, a lit mass offset toward the upper left and short brush strokes along the lie of the fur.
     - one painter per body plan: four-legged (_ppQuad), bird (_ppBird), and a few of their own (snail, ladybird, bee, butterfly, crab,
       octopus, frog, tortoise, robot, ghost, wisp, cloud, and the upright ones: yeti, golem, moosh)
     - each species is a row of proportions and pieces (_PP_SPEC): ears, snout, tail, neck, legs, hooves, wings, horns, spines, manes
     - every coat (a, b, c of the species' coat row, or a custom colour) and every mark keeps its colours and its place, and breeds keep
       their silhouettes (a dachshund is long and low, a pug flat-faced, a husky's tail curls over), so an owned look stays recognisable
       and a friend sees the same drawing
   Parts, pivots and accessory anchors keep the rig's names (legsN near hind, paw near fore, legsF far hind, legsG far fore, tail, head,
   ears, eyes, neck, body, wingB/wingN), so every gait, idle clip, trick and act (97-pets.css, PET_CLIPS) plays on the new drawing, and
   reduced motion stills it the same way. PURE: functions and tables only; nothing runs at load.
   ============================================================ */

/* ---------- painting helpers ---------- */
const _PP_G = 90;
/** A scale about (cx, cy) shifted toward the upper left: the lit mass laid over the shade mass. */
function _ppLitM(cx, cy, k, up, left) { return [k, 0, 0, k, cx * (1 - k) - (left == null ? 0.5 : left), cy * (1 - k) - (up == null ? 1 : up)]; }
/** A painted mass: the shape in shade, the same shape lit and a little smaller toward the light, a soft highlight. */
function _ppMass(out, d, T, cx, cy, o) {
  o = o || {};
  out.push(_pF(d, T[1], o.op));
  out.push(_pF(d, T[0], o.op, _ppLitM(cx, cy, Math.max(o.k || 0.88, 0.93), o.up, o.left)));
  if (o.soft !== false) out.push(_pF(d, _ptMix(T[0], T[2], 0.35), (o.op || 1) * 0.3, _ppLitM(cx, cy - (o.hiUp || 0), 0.66, (o.up || 1) * 2.2, (o.left == null ? 0.5 : o.left) * 2.4)));
  if (o.hi) out.push(_pF(o.hi, _ptMix(T[2], '#fff6e0', 0.15), o.hiOp || 0.5));
}
/** A limb: a thick shade stroke and a thinner lit one along the same points, toward the light. */
function _ppLimb(out, pts, w, T, o) {
  o = o || {};
  const d = 'M' + pts.map(p => _ptR(p[0]) + ' ' + _ptR(p[1])).join('L');
  const dl = 'M' + pts.map(p => _ptR(p[0] - w * 0.14) + ' ' + _ptR(p[1] - w * 0.06)).join('L');
  out.push(Object.assign(_pL(d, T[1], w), { cap: 'round' }));
  out.push(Object.assign(_pL(dl, T[0], w * 0.62), { cap: 'round' }));
}
/** A tapering stroke as a filled path from a to b (w0 at a, w1 at b), bent by bend toward the left of travel. */
function _ppTaper(a, b, w0, w1, bend) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, bb = bend || 0;
  const mx = (a[0] + b[0]) / 2 + nx * bb, my = (a[1] + b[1]) / 2 + ny * bb, wm = (w0 + w1) / 2;
  return _pP`M${a[0] + nx * w0 / 2} ${a[1] + ny * w0 / 2}Q${mx + nx * wm / 2} ${my + ny * wm / 2} ${b[0] + nx * w1 / 2} ${b[1] + ny * w1 / 2}L${b[0] - nx * w1 / 2} ${b[1] - ny * w1 / 2}Q${mx - nx * wm / 2} ${my - ny * wm / 2} ${a[0] - nx * w0 / 2} ${a[1] - ny * w0 / 2}z`;
}
/** Short fur strokes (the duck's painter), skipped when small. */
function _ppFur(out, seed, cx, cy, rx, ry, n, len, a, col, w, op) { const s = _ptPaintStrokes(seed, cx, cy, rx, ry, n, len, a, col, w, op); if (s) out.push(s); }
/** One eye side on: open (dark, a catch-light), happy, closed, sparkle; r is small (the kit's animals have small eyes). */
function _ppEye(out, x, y, r, mood, X, sleep) {
  const k = sleep ? 'closed' : mood.eyes === 'wink' ? 'happy' : (mood.eyes || 'open');
  if (k === 'happy' || k === 'closed') { out.push(..._ptEye(x, y, r * 1.2, k, null)); return; }
  const col = X.eye && /^#[0-9a-f]{6}$/i.test(X.eye) ? X.eye : null;
  out.push(_pF(_pE(x, y, r * 1.18, r * 1.08), _PTK_INK, 0.55));
  if (col && r > 1.1) { out.push(_pF(_pE(x, y, r, r * 0.96), col)); out.push(_pF(_pE(x + r * 0.15, y, r * 0.55, r * 0.7), _PTK_INK)); }
  else out.push(_pF(_pE(x, y, r * 0.92, r * 0.92), _PTK_INK));
  out.push(_pF(_pC(x - r * 0.3, y - r * 0.38, r * 0.34), '#ffffff', 0.92));
  if (k === 'sparkle') out.push(_pF(_ptStar(x + r * 1.5, y - r * 1.6, r * 0.9, r * 0.3, 4), '#ffffff', 0.9));
}
function _ppParts() { return { wingB: [], legsF: [], legsG: [], tail: [], body: [], legsN: [], paw: [], wingN: [], neck: [], ears: [], head: [], eyes: [], fx: [] }; }
const _PP_ORDER = ['wingB', 'legsF', 'legsG', 'tail', 'body', 'legsN', 'paw', 'wingN', 'neck', 'ears', 'head', 'eyes', 'fx'];

/* ---------- the four-legged painter ---------- */
/**
 * S: L body half-length, D body half-depth, leg (length), lw (leg width), slope (+: shoulders higher), arch, tuck (belly tucked up),
 * neck [length, angle deg from level, width], hr head radius, sl snout length, sd snout depth, droop, ear {t, s}, tail {t, s, lift},
 * hoof, muzzle (light muzzle), es eye size, plus extras: wings, horn, antlers, mane, spines, shell, stripes, nine.
 */
function _ppQuad(pet, pose, mood, X, S) {
  const parts = _ppParts(), G = _PP_G;
  const m = pet.marks || 'plain', brs = pet.breed || '';
  const A = S.furT ? S.furT(X) : X.a, B = X.b, C = X.c;
  const pts = m === 'points' || S.points;
  const legT = S.legT ? S.legT(X, m) : (m === 'socks' || S.socks) ? B : pts ? C : A;
  const L = S.L, D = S.D, legH = S.leg, lw = S.lw;
  const nk = S.neck || [6, 55, D * 1.1];
  const sleep = pose === 'sleep', sit = pose === 'sit';
  const seed = pet.species + (pet.coat || '') + (pet.breed || '') + pose;
  let hx, hy, hr = S.hr, headTilt = 0, tailRoot, neckPiv, collar;
  const bx = 47, by = G - legH - D * 0.55;
  const xr = bx - L, xc = bx + L;
  const furLit = _ptMix(A[2], '#fff6e0', 0.2);
  if (!sleep && !sit) {
    // ---- walking: body, four legs, neck, head
    const yrT = by - D + (S.slope || 0) * 0.5, ysT = by - D - (S.slope || 0) * 0.5, yb = by + D * 0.85 - (S.tuck || 0), ar = S.arch || 0;
    const body = _pP`M${xr} ${by + D * 0.25}C${xr - D * 0.2} ${by - D * 0.6} ${xr + L * 0.12} ${yrT - ar} ${xr + L * 0.45} ${yrT - ar * 0.6}C${bx} ${(yrT + ysT) / 2 - ar} ${xc - L * 0.55} ${ysT - ar * 0.4} ${xc - L * 0.3} ${ysT}C${xc - L * 0.05} ${ysT + 0.4} ${xc + D * 0.4} ${by - D * 0.55} ${xc + D * 0.32} ${by + D * 0.1}C${xc + D * 0.2} ${by + D * 0.85} ${xc - L * 0.25} ${yb + 1} ${bx + L * 0.05} ${yb}C${xr + L * 0.45} ${yb - 0.5} ${xr + L * 0.12} ${by + D * 0.95} ${xr} ${by + D * 0.25}z`;
    const hipX = xr + L * 0.32, hipY = by + D * 0.15, shX = xc - L * 0.22, shY = by + D * 0.1;
    const footY = G - 0.6;
    const hind = (dx, dy, T, w, k) => {
      const p = [[hipX + dx, hipY + dy], [hipX + dx + lw * 0.7, hipY + dy + (footY - hipY) * 0.5], [hipX + dx - lw * 0.5, footY + dy - legH * 0.3], [hipX + dx - lw * 0.15 + k, footY + dy]];
      return p;
    };
    const fore = (dx, dy, k) => [[shX + dx, shY + dy], [shX + dx - lw * 0.15, shY + dy + (footY - shY) * 0.5], [shX + dx + lw * 0.1, footY + dy - legH * 0.2], [shX + dx + lw * 0.2 + k, footY + dy]];
    const drawLeg = (out, p, T, w, front) => {
      _ppLimb(out, p.slice(1), w, T);
      const f = p[p.length - 1];
      if (S.hoof) { out.push(_pF(_pP`M${f[0] - w * 0.55} ${f[1] - w * 0.7}L${f[0] + w * 0.6} ${f[1] - w * 0.7}L${f[0] + w * 0.75} ${f[1] + 0.5}L${f[0] - w * 0.6} ${f[1] + 0.5}z`, S.hoofCol || '#3a2e28')); }
      else out.push(_pF(_pE(f[0] + w * 0.3, f[1] - w * 0.25, w * 0.78, w * 0.5), T[1]), _pF(_pE(f[0] + w * 0.22, f[1] - w * 0.38, w * 0.6, w * 0.34), T[0]));
      if (S.claws && !S.hoof) out.push(_pL(_pP`M${f[0] + w * 0.8} ${f[1] - 0.2}l${w * 0.5} 0.3`, '#efe6d8', 0.5, 0.8));
    };
    const farT = [legT[1], legT[3], legT[1], legT[3]];
    // far legs: behind the body, a step out of phase, in shade
    const fh = hind(3.2, -1.2, farT, lw, 1.2); _ppLimb(parts.legsF, [[hipX + 2, hipY - 3], fh[1]], lw * 1.25, farT); drawLeg(parts.legsF, fh, farT, lw * 0.92);
    const ff = fore(3.2, -1.2, -1.4); _ppLimb(parts.legsG, [ff[0], ff[1]], lw * 1.1, farT); drawLeg(parts.legsG, ff, farT, lw * 0.92, true);
    // the body
    _ppMass(parts.body, body, A, bx, by, { k: 0.9, up: 1.4, hi: _pE(bx - L * 0.1, by - D * 0.62, L * 0.55, D * 0.16) });
    if (S.belly !== false) parts.body.push(_pF(_pP`M${xr + L * 0.5} ${yb - 1.2}C${bx} ${yb + 0.6} ${xc - L * 0.3} ${yb} ${xc} ${by + D * 0.4}C${xc - L * 0.2} ${by + D * 0.4} ${bx} ${by + D * 0.45} ${xr + L * 0.5} ${yb - 1.2}z`, B[0], S.bellyOp || 0.75));
    if (!S.noFur) {
      _ppFur(parts.body, seed + 'b1', bx - L * 0.05, by - D * 0.45, L * 0.82, D * 0.38, Math.round(L * 1.2), S.furLen || 2.6, 1.95, furLit, 0.7, 0.42);
      _ppFur(parts.body, seed + 'b2', bx, by + D * 0.45, L * 0.8, D * 0.3, Math.round(L * 0.8), (S.furLen || 2.6) * 0.9, 2.7, A[1], 0.7, 0.4);
    }
    // the haunch, the thigh into the near hind leg
    { const ch = S.ch || 1, th = _pP`M${hipX - D * 0.7 * ch} ${hipY - D * 0.5}C${hipX - D * 0.6 * ch} ${hipY - D * 1.05} ${hipX + D * 0.5 * ch} ${hipY - D * 1.0} ${hipX + D * 0.62 * ch} ${hipY - D * 0.2}C${hipX + D * 0.7 * ch} ${hipY + D * 0.5} ${hipX + lw * 0.9} ${hipY + D * 1.2} ${hipX + lw * 0.3} ${hipY + D * 1.5}C${hipX - lw} ${hipY + D * 1.2} ${hipX - D * 0.8 * ch} ${hipY + D * 0.4} ${hipX - D * 0.7 * ch} ${hipY - D * 0.5}z`;
      parts.legsN.push(_pF(th, A[1], 0.55, [1, 0, 0, 1, 0.5, 0.6]), _pF(th, A[0]), _pF(_pE(hipX - D * 0.15, hipY - D * 0.55, D * 0.4 * ch, D * 0.25), _ptMix(A[0], A[2], 0.5), 0.5)); }
    if (!S.noFur) _ppFur(parts.legsN, seed + 'hh', hipX, hipY - D * 0.3, D * 0.5, D * 0.6, 8, 2.2, 2.6, furLit, 0.6, 0.35);
    const nh = hind(0, 0, legT, lw, -1.4); drawLeg(parts.legsN, nh, legT, lw);
    // the near fore leg, the shoulder over it
    const nf = fore(0, 0, 1.2); parts.paw.push(_pF(_ppTaper([shX + 0.4, shY - D * 0.55], nf[1], D * 0.95, lw * 1.05, -0.6), A[0])); drawLeg(parts.paw, nf, legT, lw, true);
    hx = xc + (S.nx != null ? S.nx : nk[0] * Math.cos(nk[1] * Math.PI / 180)) ; hy = ysT - nk[0] * Math.sin(nk[1] * Math.PI / 180) - hr * 0.2 + (S.ny || 0);
    neckPiv = [hx - hr * 0.3, hy + hr * 0.8];
    // the neck: chest to the back of the head
    const nb = [xc - L * 0.25, by - D * 0.25], nt = [hx - hr * 0.35, hy + hr * 0.15];
    const nd = _ppTaper(nb, nt, nk[2] * 1.15, hr * 1.25, -1.2);
    parts.neck.push(_pF(nd, A[0]), _pF(nd, A[1], 0.45, [0.9, 0, 0, 0.9, (nb[0] + nt[0]) / 2 * 0.1 + 1.2, (nb[1] + nt[1]) / 2 * 0.1 + 1.0]));
    if (!S.noFur) _ppFur(parts.neck, seed + 'nk', (nb[0] + nt[0]) / 2, (nb[1] + nt[1]) / 2 - 1, nk[2] * 0.4, Math.max(2, (nb[1] - nt[1]) * 0.4), 8, 2.2, 0.4, furLit, 0.6, 0.35);
    collar = { x: (nb[0] * 0.3 + nt[0] * 0.7) + 1, y: (nb[1] * 0.3 + nt[1] * 0.7) + 1.5, w: Math.max(nk[2] * 0.62, hr * 0.85), rot: -14 };
    tailRoot = [xr + 1, by - D * 0.45];
    if (S.extra) S.extra({ parts, X, A, B, C, m, pose, body: { bx, by, L, D, xr, xc, yb, ysT, yrT }, seed, S, pet });
    _ppMarks(parts, { pose, m, brs, A, B, C, X, S, bx, by, L, D, xr, xc, yb, nh, nf, hipX, hipY, seed });
    if (S.mane) S.mane(parts, { pose, nb, nt, hx, hy, hr, X, A, B, C, m, seed, bx, by, L, D });
  } else if (sit) {
    // ---- sitting: the haunch on the ground, the chest up, the fore legs straight, the tail round the feet
    const H = legH + D * 1.7, hrx = D * 1.05 * (S.ch || 1), hry = D * 1.0 * (S.ch || 1);
    const hcx = 42 - L * 0.12, hcy = G - hry * 0.98;
    const shX = 55 + L * 0.06, shY = G - H * 0.88, chX = shX + D * 0.5;
    const torso = _pP`M${hcx - hrx * 0.75} ${hcy - hry * 0.55}C${hcx - hrx * 0.5} ${hcy - hry * 1.25} ${shX - D * 1.1} ${shY - D * 0.1} ${shX - D * 0.3} ${shY - D * 0.65}C${shX + D * 0.4} ${shY - D * 0.9} ${chX + D * 0.25} ${shY - D * 0.2} ${chX} ${shY + D * 0.5}C${chX - 0.2} ${shY + D * 1.6} ${shX + 1} ${G - H * 0.25} ${shX - 1} ${G - 2}L${hcx + hrx * 0.4} ${G - 1}z`;
    // far fore leg
    const ffl = [[shX + 2.6, shY + D * 0.6], [shX + 3.2, G - legH * 0.3], [shX + 3.6, G - 0.8]];
    _ppLimb(parts.legsF, ffl, lw * 0.95, [legT[1], legT[3]]);
    parts.legsF.push(_pF(_pE(shX + 4.2, G - lw * 0.35, lw * 0.75, lw * 0.45), legT[1]));
    _ppMass(parts.body, torso, A, (hcx + shX) / 2, (hcy + shY) / 2, { k: 0.88, up: 1.2 });
    // the haunch, folded
    _ppMass(parts.body, _pE(hcx, hcy, hrx, hry), A, hcx, hcy, { k: 0.86, up: 1.4, hi: _pE(hcx - hrx * 0.2, hcy - hry * 0.6, hrx * 0.55, hry * 0.2) });
    // the chest, lit, and the belly where it shows
    if (S.belly !== false) parts.body.push(_pF(_pP`M${chX - 0.6} ${shY + D * 0.2}C${chX + 0.4} ${shY + D * 1.4} ${shX + 1} ${G - H * 0.3} ${shX - 0.4} ${G - 3}L${shX - 3} ${G - 4}C${shX - 2} ${G - H * 0.4} ${chX - 2.4} ${shY + D * 1.2} ${chX - 0.6} ${shY + D * 0.2}z`, B[0], S.bellyOp || 0.8));
    if (!S.noFur) {
      _ppFur(parts.body, seed + 's1', hcx - hrx * 0.1, hcy - hry * 0.3, hrx * 0.7, hry * 0.55, 14, S.furLen || 2.6, 2.3, furLit, 0.7, 0.4);
      _ppFur(parts.body, seed + 's3', hcx + hrx * 0.2, hcy + hry * 0.4, hrx * 0.6, hry * 0.3, 8, 2.2, 2.0, A[1], 0.6, 0.35);
    }
    // the hind foot along the ground in front of the haunch
    parts.legsN.push(_pF(_pE(hcx + hrx * 0.62, G - lw * 0.42, lw * 1.5, lw * 0.5), legT[1]), _pF(_pE(hcx + hrx * 0.58, G - lw * 0.55, lw * 1.3, lw * 0.36), legT[0]));
    if (S.hoof) parts.legsN.push(_pF(_pE(hcx + hrx * 0.62 + lw * 1.3, G - lw * 0.4, lw * 0.5, lw * 0.45), S.hoofCol || '#3a2e28'));
    // near fore leg, straight
    const nfl = [[shX, shY + D * 0.4], [shX + 0.4, G - legH * 0.3], [shX + 0.8, G - 0.6]];
    _ppLimb(parts.paw, nfl, lw, legT);
    if (S.hoof) parts.paw.push(_pF(_pP`M${shX - lw * 0.4} ${G - lw * 0.7}L${shX + lw * 1.2} ${G - lw * 0.7}L${shX + lw * 1.35} ${G + 0.4}L${shX - lw * 0.5} ${G + 0.4}z`, S.hoofCol || '#3a2e28'));
    else parts.paw.push(_pF(_pE(shX + 1.4, G - lw * 0.32, lw * 0.85, lw * 0.5), legT[1]), _pF(_pE(shX + 1.3, G - lw * 0.45, lw * 0.66, lw * 0.34), legT[0]));
    hx = chX + (S.sitNx != null ? S.sitNx : 0.5); hy = shY - D * 0.7 - hr * 0.6 - nk[0] * 0.5 + (S.sitNy || 0);
    neckPiv = [hx - hr * 0.2, hy + hr * 0.9];
    const nb = [shX - D * 0.2, shY], nt = [hx - hr * 0.3, hy + hr * 0.2];
    { const nd2 = _ppTaper(nb, nt, nk[2] * 1.2, hr * 1.25, -0.8); parts.neck.push(_pF(nd2, A[0]), _pF(nd2, A[1], 0.4, [0.9, 0, 0, 0.9, (nb[0] + nt[0]) / 2 * 0.1 + 1.2, (nb[1] + nt[1]) / 2 * 0.1 + 1.0])); }
    collar = { x: nt[0] + 0.8, y: nt[1] + (nb[1] - nt[1]) * 0.35, w: Math.max(nk[2] * 0.62, hr * 0.85), rot: -6 };
    tailRoot = [hcx - hrx * 0.7, G - 3];
    if (S.extra) S.extra({ parts, X, A, B, C, m, pose, body: { hcx, hcy, hrx, hry, shX, shY, chX, H }, seed, S, pet });
    _ppMarks(parts, { pose, m, brs, A, B, C, X, S, hcx, hcy, hrx, hry, shX, shY, chX, H, D, L, seed, nfl });
    if (S.mane) S.mane(parts, { pose, nb, nt, hx, hy, hr, X, A, B, C, m, seed, D, L });
  } else {
    // ---- asleep: a loaf, the head laid down along the front paws, the tail round
    const rx = Math.min(L * 1.08, 24), ry = Math.min(D * 1.15, 16), cx = 45, cy = G - ry;
    const loaf = _pP`M${cx - rx} ${G - 0.5}C${cx - rx * 1.05} ${cy - ry * 0.7} ${cx - rx * 0.4} ${cy - ry * 1.05} ${cx} ${cy - ry}C${cx + rx * 0.55} ${cy - ry * 0.95} ${cx + rx} ${cy - ry * 0.4} ${cx + rx} ${G - 0.5}z`;
    _ppMass(parts.body, loaf, A, cx, cy, { k: 0.95, up: 0.7, hi: _pE(cx - rx * 0.15, cy - ry * 0.65, rx * 0.5, ry * 0.18) });
    parts.body.push(_pF(_pE(cx - rx * 0.45, cy + ry * 0.05, ry * 0.75, ry * 0.75), A[1], 0.35));
    if (!S.noFur) _ppFur(parts.body, seed + 'z1', cx - rx * 0.05, cy - ry * 0.35, rx * 0.8, ry * 0.45, 22, S.furLen || 2.6, 1.9, furLit, 0.7, 0.4);
    parts.paw.push(_pF(_pE(cx + rx * 0.85, G - lw * 0.4, lw * 1.25, lw * 0.5), legT[1]), _pF(_pE(cx + rx * 0.82, G - lw * 0.52, lw * 1.05, lw * 0.36), legT[0]));
    hr = hr * 0.98; hx = cx + rx * 0.82; hy = G - hr * 0.95; headTilt = 1;
    neckPiv = [hx - hr * 0.5, hy + hr * 0.4];
    collar = { x: hx - hr * 0.7, y: hy + hr * 0.4, w: hr * 0.9, rot: 60 };
    tailRoot = [cx - rx * 0.9, G - 3];
    if (S.extra) S.extra({ parts, X, A, B, C, m, pose, body: { cx, cy, rx, ry }, seed, S, pet });
    _ppMarks(parts, { pose, m, brs, A, B, C, X, S, cx, cy, rx, ry, D, L, seed });
    if (S.mane) S.mane(parts, { pose, hx, hy, hr, X, A, B, C, m, seed, cx, cy, rx, ry });
  }
  // ---- the tail
  _ppTail(parts.tail, S.tail || { t: 'long' }, pose, tailRoot, A, B, C, X, m, seed, S);
  // ---- the head in profile
  const Hd = _ppHead(parts, pet, pose, mood, X, S, hx, hy, hr, A, B, C, m, seed, headTilt);
  const top = Math.min(Hd.top, 20);
  return {
    parts, order: _PP_ORDER.slice(),
    piv: { tail: tailRoot, head: neckPiv, eyes: [Hd.ex, Hd.ey], ears: Hd.earPiv, paw: pose === 'walk' ? [xc - L * 0.22, by] : [hx, G], legsN: pose === 'walk' ? [xr + L * 0.32, by] : [45, G - 6], legsF: pose === 'walk' ? [xr + L * 0.32 + 3, by - 1] : [50, G - 10], legsG: pose === 'walk' ? [xc - L * 0.22 + 3, by - 1] : null, wingB: Hd.wing || null, wingN: Hd.wing || null, body: [50, 90] },
    acc: { neck: collar, top: Hd.topAt, eyes: [Hd.ex, Hd.ex, Hd.ey, Math.max(1.6, Hd.er * 1.3)], ear: Hd.earAt, hc: [hx, hy, hr] },
    top, legsAt: null, long: S.long,
  };
}

/** The head side on: the skull, the snout to a nose, one eye, the ears behind, a muzzle, the mouth for the mood. */
function _ppHead(parts, pet, pose, mood, X, S, hx, hy, hr, A, B, C, m, seed, tilt) {
  const sleep = pose === 'sleep', H = parts.head, E = parts.eyes, EA = parts.ears;
  const pts = m === 'points' || S.points, faceT = pts ? C : S.faceT ? S.faceT(X, m) : A;
  const sl = S.sl != null ? S.sl : hr * 0.6, sd = S.sd != null ? S.sd : hr * 0.5, dr = (S.droop || 0) + (sleep ? hr * 0.25 : 0);
  const tipX = hx + hr * 0.72 + sl, tipY = hy + hr * 0.2 + dr;
  // ears first, behind the skull (the far ear a step back and in shade)
  const ear = S.ear || { t: 'point', s: 1 };
  const earPiv = [hx - hr * 0.2, hy - hr * 0.5];
  _ppEars(EA, ear, hx, hy, hr, A, B, C, X, m, pts, sleep, pet);
  // skull and snout
  const skull = _pE(hx, hy, hr * (S.hw || 1.0), hr * (S.hh || 0.88));
  const snout = _pP`M${hx + hr * 0.05} ${hy - hr * 0.62}C${hx + hr * 0.7} ${hy - hr * 0.62} ${tipX - sd * 0.6} ${tipY - sd * 1.0} ${tipX} ${tipY - sd * 0.45}C${tipX + sd * 0.35} ${tipY - sd * 0.1} ${tipX + sd * 0.2} ${tipY + sd * 0.5} ${tipX - sd * 0.2} ${tipY + sd * 0.55}C${tipX - sd * 0.8} ${tipY + sd * 0.9} ${hx + hr * 0.6} ${hy + hr * 0.82} ${hx + hr * 0.1} ${hy + hr * 0.8}z`;
  H.push(_pF(skull, A[1]), _pF(snout, faceT[1]));
  H.push(_pF(skull, A[0], 1, _ppLitM(hx, hy, 0.88, 0.7, 0.6)), _pF(snout, faceT[0], 1, _ppLitM((hx + tipX) / 2, tipY, 0.9, 0.6, 0.3)));
  if (pts) H.push(_pF(_pE(hx - hr * 0.35, hy - hr * 0.1, hr * 0.55, hr * 0.62), A[0], 0.85));
  if (S.muzzle !== false) H.push(_pF(_pP`M${hx + hr * 0.35} ${hy + hr * 0.25}C${hx + hr * 0.8} ${tipY + sd * 0.1} ${tipX - sd * 0.2} ${tipY + sd * 0.2} ${tipX - sd * 0.15} ${tipY + sd * 0.5}C${tipX - sd * 0.8} ${tipY + sd * 0.85} ${hx + hr * 0.5} ${hy + hr * 0.8} ${hx + hr * 0.2} ${hy + hr * 0.7}z`, B[0], S.muzOp || 0.8));
  H.push(_pF(_pE(hx - hr * 0.2, hy - hr * 0.5, hr * 0.5, hr * 0.18), _ptMix(A[2], '#fff6e0', 0.2), 0.5));
  if (!S.noFur) _ppFur(H, seed + 'hd', hx - hr * 0.25, hy - hr * 0.25, hr * 0.55, hr * 0.4, 8, 1.6, -0.4, _ptMix(A[2], '#fff6e0', 0.2), 0.5, 0.35);
  // a cheek of shade under the eye, the jaw line
  H.push(_pF(_pE(hx + hr * 0.1, hy + hr * 0.5, hr * 0.6, hr * 0.2), A[1], 0.25));
  // nose and mouth
  const nose = X.nose || S.nose || '#3a2a2a';
  if (S.beak) {
    H.push(_pF(_pP`M${hx + hr * 0.6} ${hy - hr * 0.35}Q${tipX + 2} ${tipY - sd * 0.4} ${tipX + 1} ${tipY + sd * 0.8}Q${hx + hr * 0.9} ${hy + hr * 0.4} ${hx + hr * 0.6} ${hy + hr * 0.3}z`, S.beak));
  } else if (S.noseKind !== 'none') {
    H.push(_pF(_pE(tipX - sd * 0.05, tipY - sd * 0.32, sd * 0.32, sd * 0.24), nose), _pF(_pE(tipX - sd * 0.12, tipY - sd * 0.42, sd * 0.12, sd * 0.06), '#ffffff', 0.4));
  }
  if (!S.beak) {
    const mouthOpen = mood.mouth === 'open' && !sleep;
    if (mouthOpen) H.push(_pF(_pP`M${tipX - sd * 0.3} ${tipY + sd * 0.2}Q${tipX - sd * 0.9} ${tipY + sd * 1.4} ${tipX - sd * 1.8} ${tipY + sd * 0.45}z`, '#7a3438', 0.9), _pF(_pE(tipX - sd * 0.9, tipY + sd * 0.75, sd * 0.4, sd * 0.2), '#e8848e', 0.9));
    else H.push(_pL(_pP`M${tipX - sd * 0.15} ${tipY + sd * 0.15}Q${tipX - sd * 0.8} ${tipY + sd * (mood.mouth === 'smile' ? 0.65 : 0.45)} ${tipX - sd * 1.6} ${tipY + sd * 0.3}`, _ptMix(faceT[3], '#000000', 0.2), 0.6, 0.7));
    if (S.whisk) H.push(_pL(_pP`M${tipX - sd * 0.6} ${tipY}l${sd * 1.6} -${sd * 0.5}M${tipX - sd * 0.6} ${tipY + sd * 0.15}l${sd * 1.7} ${sd * 0.15}`, _ptMix(B[0], '#ffffff', 0.4), 0.35, 0.7));
    if (S.tusk) H.push(_pF(_pP`M${tipX - sd * 0.6} ${tipY + sd * 0.3}q${sd * 0.3} -${sd * 1.2} ${sd * 0.9} -${sd * 1.1}q-${sd * 0.4} ${sd * 0.5} -${sd * 0.5} ${sd * 1.1}z`, '#f2ead8'));
  }
  // the eye
  const ex = hx + hr * (S.ex != null ? S.ex : 0.38), ey = hy - hr * (S.ey != null ? S.ey : 0.18), er = Math.max(0.9, hr * (S.es || 0.15));
  if ((m === 'mask' || m === 'bandit') && !S.headExtra) H.push(_pF(_pP`M${hx - hr * 0.2} ${hy - hr * 0.5}Q${ex + hr * 0.4} ${hy - hr * 0.6} ${tipX - sd * 0.4} ${tipY - sd * 0.2}L${tipX - sd * 0.6} ${tipY + sd * 0.4}Q${ex} ${hy + hr * 0.5} ${hx - hr * 0.3} ${hy + hr * 0.1}z`, C[0], 0.9));
  if (m === 'blaze') H.push(_pL(_pP`M${hx + hr * 0.1} ${hy - hr * 0.75}Q${hx + hr * 0.8} ${hy - hr * 0.6} ${tipX - sd * 0.5} ${tipY - sd * 0.7}`, B[0], Math.max(1.2, hr * 0.22), 0.92));
  if (m === 'star') H.push(_pF(_ptStar(hx + hr * 0.3, hy - hr * 0.5, hr * 0.28, hr * 0.1, 4), B[0], 0.95));
  if (S.eyePatch) H.push(_pF(_pE(ex - er * 0.2, ey + er * 0.3, er * 2.4, er * 2.0), S.eyePatch(X), 0.95));
  _ppEye(E, ex, ey, er, mood, X, sleep);
  if (S.headExtra) S.headExtra({ H, E, EA, hx, hy, hr, tipX, tipY, sd, A, B, C, X, m, pose, pet, seed, ex, ey, er });
  const earTop = hy - hr * (ear.t === 'long' || ear.t === 'tall' ? 2.6 * (ear.s || 1) : ear.t === 'point' ? 1.5 * (ear.s || 1) : 1.1);
  return { top: Math.min(earTop, hy - hr * 1.2) - (S.topPad || 0), ex, ey, er, earPiv, earAt: [hx - hr * 0.35, hy - hr * 0.8, hr * 0.28], topAt: [hx - hr * 0.05, hy - hr * 0.82, hr * 1.15, -6] };
}

/** Ears: point (cat, fox), tall (rabbit), flop (lab, beagle), lop, round (bear, mouse), tiny, fold, none; horns and antlers are extras. */
function _ppEars(EA, ear, hx, hy, hr, A, B, C, X, m, pts, sleep, pet) {
  const s = ear.s || 1, eT = pts || ear.dark ? C : A, inner = ear.inner || _PTK_PINK;
  const one = (dx, dy, far) => {
    const T = far ? [eT[1], eT[3], eT[1], eT[3]] : eT, bx = hx - hr * 0.25 + dx, by = hy - hr * 0.55 + dy;
    switch (ear.t) {
      case 'point': {
        const h = hr * 1.05 * s, w = hr * 0.5 * s, lean = ear.lean != null ? ear.lean : 0.15;
        const d = _pP`M${bx - w} ${by + 1}Q${bx - w * 0.6 + h * lean} ${by - h * 0.6} ${bx - w * 0.1 + h * lean} ${by - h}Q${bx + w * 0.6 + h * lean * 0.5} ${by - h * 0.4} ${bx + w * 0.9} ${by + 1.5}z`;
        EA.push(_pF(d, T[1]), _pF(d, T[0], 1, _ppLitM(bx, by, 0.84, 0.3, 0.3)));
        if (!far) EA.push(_pF(_pP`M${bx - w * 0.45} ${by}Q${bx - w * 0.3 + h * lean} ${by - h * 0.5} ${bx - w * 0.1 + h * lean} ${by - h * 0.78}Q${bx + w * 0.3} ${by - h * 0.3} ${bx + w * 0.4} ${by + 0.6}z`, ear.innerB ? B[0] : inner, 0.75));
        break;
      }
      case 'tall': {
        const h = hr * 2.3 * s, w = hr * 0.42 * s, back = ear.back != null ? ear.back : 0.35;
        const d = _pP`M${bx - w * 0.6} ${by + 1}C${bx - w * 1.4 - h * back * 0.4} ${by - h * 0.5} ${bx - h * back - w * 0.4} ${by - h} ${bx - h * back} ${by - h}C${bx - h * back + w * 1.0} ${by - h * 0.98} ${bx + w * 0.8} ${by - h * 0.4} ${bx + w * 0.7} ${by + 1}z`;
        EA.push(_pF(d, T[1]), _pF(d, T[0], 1, _ppLitM(bx, by - h / 2, 0.84, 0.3, 0.2)));
        if (!far) EA.push(_pF(_pP`M${bx - w * 0.2} ${by - 1}C${bx - w * 0.6 - h * back * 0.4} ${by - h * 0.5} ${bx - h * back} ${by - h * 0.86} ${bx - h * back + w * 0.2} ${by - h * 0.86}C${bx - h * back + w * 0.6} ${by - h * 0.8} ${bx + w * 0.3} ${by - h * 0.4} ${bx + w * 0.3} ${by - 1}z`, inner, 0.6));
        break;
      }
      case 'flop': case 'lop': {
        const len = hr * (ear.t === 'lop' ? 1.7 : 1.15) * s, w = hr * 0.5 * s;
        const d = _pP`M${bx - w * 0.6} ${by + 0.5}C${bx - w * 1.3} ${by + len * 0.2} ${bx - w * 1.1} ${by + len * 0.9} ${bx - w * 0.3} ${by + len}C${bx + w * 0.5} ${by + len * 0.95} ${bx + w * 0.7} ${by + len * 0.3} ${bx + w * 0.7} ${by - 0.4}z`;
        EA.push(_pF(d, T[1]), _pF(d, T[0], 1, _ppLitM(bx, by + len / 2, 0.86, 0.4, 0.4)));
        break;
      }
      case 'fold': {
        const w = hr * 0.42 * s;
        EA.push(_pF(_pP`M${bx - w} ${by + 0.6}Q${bx - w * 0.3} ${by - w * 1.1} ${bx + w * 0.9} ${by - w * 0.2}Q${bx + w * 0.2} ${by - w * 0.1} ${bx + w * 0.4} ${by + 0.8}z`, T[far ? 1 : 0]));
        break;
      }
      case 'round': case 'tiny': {
        const r = hr * (ear.t === 'tiny' ? 0.24 : 0.42) * s;
        EA.push(_pF(_pC(bx, by - r * 0.4, r), T[1]), _pF(_pC(bx - 0.3, by - r * 0.55, r * 0.8), T[0]));
        if (!far && ear.t === 'round') EA.push(_pF(_pC(bx + r * 0.1, by - r * 0.35, r * 0.48), ear.innerB ? B[0] : inner, 0.6));
        break;
      }
      default: break;
    }
  };
  one(-hr * 0.38, 0.6, true);
  one(0, 0, false);
}

/** Tails: long (cat), thin (rat), bushy (fox, squirrel), curl (husky, pug, pig), stub, pom (rabbit), tuft (lion, cow), flat (otter, beaver), fan, plume (horse). */
function _ppTail(out, T0, pose, r, A, B, C, X, m, seed, S) {
  const t = T0.t, s = T0.s || 1, sleep = pose === 'sleep', sit = pose === 'sit';
  const tip = (T0.tip === 'b' ? B : T0.tip === 'c' ? C : null) || ((m === 'points' || S.points) ? C : null);
  const [x, y] = r, Tc = T0.col ? T0.col(X, m) : A;
  if (t === 'none') return;
  if (t === 'long' || t === 'thin') {
    const w = (t === 'thin' ? 1.4 : 2.8) * s * (T0.w || 1), Ln = 22 * s;
    const d = sleep ? _pP`M${x} ${y}C${x - 6} ${y + 2} ${x - 2} ${_PP_G - 1} ${x + 10} ${_PP_G - 1.5}C${x + 20} ${_PP_G - 1.6} ${x + 28} ${_PP_G - 2.4} ${x + 34} ${_PP_G - 3.5}`
      : sit ? _pP`M${x} ${y}C${x - 8} ${y + 1} ${x - 6} ${_PP_G - 1} ${x + 6} ${_PP_G - 1.2}C${x + 14} ${_PP_G - 1.4} ${x + 20} ${_PP_G - 2.4} ${x + 24} ${_PP_G - 5}`
      : _pP`M${x} ${y}C${x - Ln * 0.35} ${y - (T0.lift || 2)} ${x - Ln * 0.55} ${y + Ln * 0.3 - (T0.lift || 0) * 3} ${x - Ln * 0.62} ${y - Ln * 0.25 - (T0.lift || 0) * 4}`;
    out.push(_pL(d, Tc[1], w + 0.6), _pL(d, Tc[0], w * 0.6, 1, [1, 0, 0, 1, -0.3, -0.4]));
    if (tip) { const end = d.split(/[ C]/).slice(-2).map(Number); out.push(_pF(_pC(end[0], end[1], w * 0.55), tip[0])); }
    if (m === 'tabby' || T0.ringed) for (let i = 1; i < 4; i++) out.push(_pL(d, Tc[3], w + 0.7, 0.55, null)), out[out.length - 1].dash = `1.4 ${3 + i}`;
    return;
  }
  if (t === 'bushy' || t === 'nine' || t === 'squirrel') {
    const n = t === 'nine' ? (m === 'nine' ? 5 : 3) : 1;
    for (let i = 0; i < n; i++) {
      const sp = (i - (n - 1) / 2) * 8, k = s * (n > 1 ? 0.85 : 1);
      let d;
      if (t === 'squirrel' && !sleep) d = _pP`M${x + 1} ${y + 2}C${x - 14 * k} ${y + 4} ${x - 18 * k} ${y - 14 * k} ${x - 10 * k} ${y - 26 * k}C${x - 4 * k} ${y - 34 * k} ${x + 8 * k} ${y - 30 * k} ${x + 6 * k} ${y - 22 * k}C${x - 2 * k} ${y - 24 * k} ${x - 6 * k} ${y - 16 * k} ${x - 2 * k} ${y - 8 * k}C${x} ${y - 4 * k} ${x + 2} ${y} ${x + 1} ${y + 2}z`;
      else if (sleep || sit) d = _pP`M${x + 1} ${y - 1}C${x - 10 * k} ${y - 2} ${x - 10 * k} ${_PP_G + 0.5} ${x + 4} ${_PP_G - 0.4}C${x + 14 * k} ${_PP_G - 0.6} ${x + 22 * k} ${_PP_G - 3} ${x + 26 * k} ${_PP_G - 6 * k}C${x + 18 * k} ${_PP_G - 8 * k} ${x + 6} ${_PP_G - 8 * k} ${x + 1} ${y - 1}z`;
      else d = _pP`M${x + 1} ${y - 1.5}C${x - 8 * k} ${y - 4 - sp * 0.3} ${x - 20 * k} ${y - 2 + sp} ${x - 26 * k} ${y + 4 * k + sp}C${x - 22 * k} ${y + 9 * k + sp} ${x - 10 * k} ${y + 7 * k + sp * 0.5} ${x + 1} ${y + 3}z`;
      out.push(_pF(d, Tc[1]), _pF(d, Tc[0], 1, _ppLitM(x - 10, y, 0.86, 0.8, 0.4)));
      _ppFur(out, seed + 'tl' + i, x - 12 * k, y + 1 + sp * 0.5, 8 * k, 3 * k, 10, 2.4, 1.3, _ptMix(Tc[2], '#fff6e0', 0.2), 0.6, 0.4);
      if (tip || T0.tipW) { const tc = tip ? tip[0] : B[0]; const tp = (sleep || sit) ? [x + 24 * k, _PP_G - 4.4 * k] : t === 'squirrel' ? [x - 6 * k, y - 28 * k] : [x - 24 * k, y + 4 * k + sp]; out.push(_pF(_pE(tp[0], tp[1], 3.4 * k, 2.6 * k), tc, 0.95)); }
    }
    return;
  }
  if (t === 'curl') {
    const k = s, d = _pP`M${x + 1} ${y}C${x - 4 * k} ${y - 8 * k} ${x + 4 * k} ${y - 14 * k} ${x + 9 * k} ${y - 9 * k}C${x + 12 * k} ${y - 5 * k} ${x + 7 * k} ${y - 1 * k} ${x + 4 * k} ${y - 4 * k}`;
    out.push(_pL(d, Tc[1], 4.4 * k * (T0.w || 1)), _pL(d, Tc[0], 2.6 * k * (T0.w || 1), 1, [1, 0, 0, 1, -0.3, -0.5]));
    if (T0.fluff) _ppFur(out, seed + 'cu', x + 4 * k, y - 8 * k, 5 * k, 4 * k, 10, 2.2, 0.4, _ptMix(Tc[2], '#fff6e0', 0.2), 0.7, 0.5);
    return;
  }
  if (t === 'stub' || t === 'pom') {
    const r0 = (t === 'pom' ? 3.6 : 2.4) * s;
    out.push(_pF(_pC(x - r0 * 0.4, y - r0 * 0.3, r0), (tip || (t === 'pom' ? B : Tc))[1]), _pF(_pC(x - r0 * 0.5, y - r0 * 0.5, r0 * 0.8), (tip || (t === 'pom' ? B : Tc))[0]));
    return;
  }
  if (t === 'tuft' || t === 'plume') {
    const plume = t === 'plume', Ln = 20 * s;
    const d = sleep || sit ? _pP`M${x} ${y}C${x - 6} ${y + 4} ${x - 4} ${_PP_G - 1} ${x + 8} ${_PP_G - 1.2}` : _pP`M${x} ${y}C${x - 5} ${y + 1} ${x - Ln * 0.45} ${y + Ln * 0.5} ${x - Ln * 0.42} ${y + Ln}`;
    if (plume) {
      const pd = sleep || sit ? _pP`M${x} ${y - 2}C${x - 10} ${y} ${x - 8} ${_PP_G} ${x + 10} ${_PP_G - 0.6}C${x + 2} ${_PP_G - 4} ${x - 2} ${y + 4} ${x} ${y + 2}z` : _pP`M${x + 1} ${y - 2}C${x - 8} ${y - 3} ${x - Ln * 0.6} ${y + Ln * 0.4} ${x - Ln * 0.5} ${y + Ln * 1.05}C${x - Ln * 0.25} ${y + Ln * 0.8} ${x - Ln * 0.15} ${y + Ln * 0.3} ${x + 1} ${y + 2.5}z`;
      const Tp = T0.col ? T0.col(X, m) : C;
      out.push(_pF(pd, Tp[1]), _pF(pd, Tp[0], 1, _ppLitM(x - 6, y + 8, 0.84, 0.4, 0.5)));
      _ppFur(out, seed + 'pl', x - Ln * 0.3, y + Ln * 0.45, 3, Ln * 0.35, 10, 3.2, 3.0, Tp[2], 0.5, 0.5);
      return;
    }
    out.push(_pL(d, Tc[1], 1.6 * s), _pL(d, Tc[0], 1, 1));
    const e = d.split(/[ C]/).slice(-2).map(Number);
    out.push(_pF(_pE(e[0], e[1], 2.6 * s, 3.4 * s), (T0.col ? Tc : C)[1]), _pF(_pE(e[0] - 0.4, e[1] - 0.6, 2 * s, 2.8 * s), (T0.col ? Tc : C)[0]));
    return;
  }
  if (t === 'flat') {
    const k = s, d = sleep || sit ? _pP`M${x} ${y - 1}C${x - 8} ${y} ${x - 6} ${_PP_G} ${x + 10} ${_PP_G - 0.5}L${x + 10} ${_PP_G - 3}C${x} ${_PP_G - 3} ${x - 2} ${y + 4} ${x} ${y + 2}z` : _pP`M${x + 1} ${y - 2}C${x - 10 * k} ${y - 1} ${x - 20 * k} ${y + 4 * k} ${x - 26 * k} ${y + 8 * k}C${x - 18 * k} ${y + 7 * k} ${x - 8 * k} ${y + 5 * k} ${x + 1} ${y + 3}z`;
    out.push(_pF(d, Tc[1]), _pF(d, Tc[0], 1, _ppLitM(x - 8, y + 2, 0.84, 0.6, 0.3)));
  }
}

/** Marks on the walking, sitting and sleeping body: stripes, spots, patches, socks, bib, tuxedo, saddle, mask, blaze, points, belt, bands. */
function _ppMarks(parts, c) {
  const { pose, m, A, B, C, S } = c, P = parts.body, H = parts.head, sleep = pose === 'sleep', sit = pose === 'sit';
  const stripes = m === 'tabby' || m === 'stripes' || m === 'bold' || S.stripes;
  const r = GART.rng('ppm|' + c.seed);
  if (stripes) {
    const col = S.stripeCol ? S.stripeCol(c) : (m === 'tabby' ? A[3] : C[0]), w = m === 'bold' || S.stripes === 'bold' ? 1.8 : 1.2;
    if (pose === 'walk') for (let i = 0; i < 7; i++) { const x = c.xr + c.L * (0.25 + i * 0.24), y0 = c.by - c.D * 0.95; P.push(_pL(_pP`M${x} ${y0}q${-1.5 + r() * 1} ${c.D * 0.6} ${-0.6} ${c.D * (0.9 + r() * 0.35)}`, col, w, 0.75)); }
    else if (sit) for (let i = 0; i < 5; i++) { const y = c.hcy - c.hry * 0.75 + i * 2.6; P.push(_pL(_pP`M${c.hcx - c.hrx * 0.5 + i * 1.5} ${y - 3}q${c.hrx * 0.4} ${-1} ${c.hrx * 0.7} ${2.4}`, col, w, 0.7)); }
    else for (let i = 0; i < 6; i++) { const x = c.cx - c.rx * 0.6 + i * c.rx * 0.24; P.push(_pL(_pP`M${x} ${c.cy - c.ry * 0.95}q-1 ${c.ry * 0.6} 0 ${c.ry * 0.9}`, col, w, 0.7)); }
  }
  if (m === 'spots' || m === 'patches' || m === 'patch' || m === 'dapple' || m === 'speckle' || m === 'spot') {
    const big = m === 'patches' || m === 'patch', col = m === 'dapple' ? B[0] : C[0], n = big ? 3 : 7;
    const box = pose === 'walk' ? [c.bx, c.by - c.D * 0.2, c.L * 0.8, c.D * 0.55] : sit ? [c.hcx + 2, c.hcy - 2, c.hrx * 0.7, c.hry * 0.6] : [c.cx, c.cy - c.ry * 0.3, c.rx * 0.7, c.ry * 0.5];
    for (let i = 0; i < n; i++) { const x = box[0] + (r() - 0.5) * 2 * box[2], y = box[1] + (r() - 0.5) * 2 * box[3], s = big ? 3 + r() * 3 : 1 + r() * 1.3; P.push(_pF(_pE(x, y, s * 1.3, s), col, big ? 0.92 : 0.8)); }
  }
  if (m === 'saddle') {
    if (pose === 'walk') P.push(_pF(_pP`M${c.xr + c.L * 0.25} ${c.by - c.D * 0.85}C${c.bx - 4} ${c.by - c.D * 1.15} ${c.bx + c.L * 0.4} ${c.by - c.D * 1.05} ${c.xc - c.L * 0.25} ${c.by - c.D * 0.85}C${c.bx + c.L * 0.3} ${c.by - c.D * 0.1} ${c.bx - c.L * 0.3} ${c.by - c.D * 0.1} ${c.xr + c.L * 0.25} ${c.by - c.D * 0.85}z`, C[0], 0.9));
    else if (sleep) P.push(_pF(_pE(c.cx - 2, c.cy - c.ry * 0.55, c.rx * 0.55, c.ry * 0.38), C[0], 0.9));
    else P.push(_pF(_pE(c.hcx - 1, c.hcy - c.hry * 0.4, c.hrx * 0.6, c.hry * 0.45), C[0], 0.9));
  }
  if (m === 'belt' || m === 'banded' || m === 'dutch') {
    const col = m === 'dutch' ? B[0] : m === 'banded' ? B[0] : C[0];
    if (pose === 'walk') P.push(_pF(_pP`M${c.bx - 3} ${c.by - c.D * 1.0}L${c.bx + 4} ${c.by - c.D * 1.0}L${c.bx + 5} ${c.yb}L${c.bx - 3} ${c.yb}z`, col, 0.92));
    else if (sleep) P.push(_pF(_pP`M${c.cx} ${c.cy - c.ry}L${c.cx + 6} ${c.cy - c.ry * 0.95}L${c.cx + 7} ${_PP_G - 0.6}L${c.cx} ${_PP_G - 0.6}z`, col, 0.9));
    else P.push(_pF(_pE(c.shX - 2, c.shY + c.D * 0.6, c.D * 0.8, c.D * 0.6), col, 0.9));
  }
  if (m === 'tuxedo' || m === 'bib' || m === 'socks' || m === 'tips' || m === 'frost' || m === 'pale') {
    // the light chest (the bib) shows on every pose; socks are the legs (legT)
    if (m !== 'socks' && pose === 'walk') P.push(_pF(_pE(c.xc - 1, c.by + c.D * 0.1, c.D * 0.5, c.D * 0.7), B[0], 0.95));
    if (m !== 'socks' && sit) P.push(_pF(_pE(c.chX - 1.5, c.shY + c.D * 0.6, c.D * 0.45, c.D * 0.9), B[0], 0.95));
    if (m === 'frost' || m === 'tips') P.push(_ptPaintStrokes(c.seed + 'fr', pose === 'walk' ? c.bx : sleep ? c.cx : c.hcx, pose === 'walk' ? c.by - c.D * 0.6 : sleep ? c.cy - c.ry * 0.6 : c.hcy - c.hry * 0.5, 14, 4, 22, 2.4, 0.2, '#ffffff', 0.6, 0.55) || _pF('', '#fff'));
  }
  if (m === 'mask' || m === 'bandit' || m === 'points' || m === 'tears' || m === 'blaze' || m === 'star') {
    // face marks are drawn by the head (points) or here as an overlay on the head part, after the skull
    c.faceMark = m;
  }
}

/* ---------- the bird painter (the duck generalised) ---------- */
/**
 * S: len (body half-length), dep (body half-depth), tilt (deg: 0 level like a duck, 50 upright like an owl), neck (length), hr, bill {t: flat,
 * cone, hook, long, bent, l}, leg (length), legCol, tail {t: cocked, fan, long, train, short, wedge}, crest, breast (colour fn), owl (disc).
 */
function _ppBird(pet, pose, mood, X, S) {
  const parts = _ppParts(), G = _PP_G, m = pet.marks || 'plain', sleep = pose === 'sleep';
  const A = S.furT ? S.furT(X) : X.a, B = X.b, C = X.c, seed = pet.species + (pet.coat || '') + pose;
  const len = S.len, dep = S.dep, legH = sleep ? 0 : S.leg, tilt = (sleep ? Math.min(S.tilt, 10) : S.tilt) * Math.PI / 180;
  const cx = 47, cy = G - legH - dep * Math.cos(tilt) * 0.95 - (sleep ? 0 : 1);
  const ca = Math.cos(tilt), sa = Math.sin(tilt);
  const R = (u, v) => [cx + u * ca + v * sa, cy - u * sa + v * ca];   // body frame: u forward along the body, v down
  const P = (u, v) => { const p = R(u, v); return _ptR(p[0]) + ' ' + _ptR(p[1]); };
  // legs and feet
  if (!sleep) {
    const leg = (du, T, far) => { const hip = R(du, dep * 0.6), foot = [hip[0] + (far ? 1.2 : 0), G - 0.6]; _ppLimb(far ? parts.legsF : parts.legsN, [hip, [hip[0] - 0.6, (hip[1] + G) / 2], foot], S.legW || 1.6, T);
      const out = far ? parts.legsF : parts.legsN; out.push(_pL(_pP`M${foot[0] - 2.4} ${G - 0.2}L${foot[0] + 3.4} ${G - 0.2}M${foot[0]} ${G - 0.4}l2.4 -1.2`, T[1], S.webbed ? 1.8 : 0.9)); };
    const lc = _ptTone(S.legCol ? S.legCol(X) : '#c08a4a');
    leg(len * 0.05 + 2, [lc[1], lc[3]], true);
    leg(len * 0.05 - 1, lc, false);
  }
  // the tail
  const tr = R(-len * 0.92, -dep * 0.1); const Ttail = S.tailT ? S.tailT(X, m) : A;
  const tt = (S.tail || {}).t || 'short', tl = (S.tail || {}).l || 1;
  let td;
  if (tt === 'cocked') td = _pP`M${P(-len * 0.7, -dep * 0.4)}L${tr[0] - 8 * tl} ${tr[1] - 12 * tl}Q${tr[0] - 4 * tl} ${tr[1] - 4} ${P(-len * 0.6, dep * 0.4)}z`;
  else if (tt === 'long') td = _pP`M${P(-len * 0.6, -dep * 0.3)}L${tr[0] - 18 * tl * ca} ${tr[1] + 18 * tl * sa + 4}L${tr[0] - 15 * tl * ca} ${tr[1] + 18 * tl * sa + 7}L${P(-len * 0.5, dep * 0.4)}z`;
  else if (tt === 'train') td = sleep ? _pP`M${P(-len * 0.6, -dep * 0.5)}C${tr[0] - 10} ${tr[1]} ${tr[0] - 20} ${G - 4} ${tr[0] - 24} ${G - 1}L${tr[0]} ${G - 0.6}z` : _pP`M${P(-len * 0.6, -dep * 0.5)}C${tr[0] - 12} ${tr[1] - 2} ${tr[0] - 26} ${G - 8} ${tr[0] - 30} ${G - 0.8}L${tr[0] - 6} ${G - 0.6}C${tr[0] - 4} ${G - 8} ${tr[0]} ${tr[1] + 4} ${P(-len * 0.4, dep * 0.5)}z`;
  else if (tt === 'fanup') td = _pP`M${P(-len * 0.7, -dep * 0.2)}C${tr[0] - 16} ${tr[1] - 30} ${tr[0] + 24} ${tr[1] - 44} ${tr[0] + 22} ${tr[1] - 14}z`;
  else td = _pP`M${P(-len * 0.7, -dep * 0.4)}L${tr[0] - 7 * tl * ca} ${tr[1] + 7 * tl * sa - 2}L${tr[0] - 6 * tl * ca} ${tr[1] + 7 * tl * sa + 2}L${P(-len * 0.6, dep * 0.5)}z`;
  parts.tail.push(_pF(td, Ttail[1]), _pF(td, Ttail[0], 1, _ppLitM(tr[0], tr[1], 0.86, 0.6, 0.3)));
  if (tt === 'train' || tt === 'fanup') { const r = GART.rng('ppe|' + seed); const n = tt === 'fanup' && !sleep && m !== 'folded' ? 9 : 5; for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; const p = tt === 'fanup' ? [tr[0] - 8 + t * 30 + (r() - 0.5) * 2, tr[1] - 34 + Math.abs(t - 0.5) * 30] : [tr[0] - 4 - t * 24, G - 3 - (1 - t) * 6]; parts.tail.push(_pF(_pE(p[0], p[1], 2.2, 1.7), '#3a8a8a', 0.95), _pF(_pE(p[0], p[1], 1.2, 0.95), '#1d3a6a'), _pF(_pC(p[0] - 0.2, p[1] - 0.2, 0.5), '#f4d264')); } }
  // the body
  const body = _pP`M${P(-len, 0)}C${P(-len, -dep * 0.9)} ${P(-len * 0.3, -dep * 1.05)} ${P(len * 0.2, -dep)}C${P(len * 0.75, -dep * 0.95)} ${P(len * 1.02, -dep * 0.5)} ${P(len, dep * 0.05)}C${P(len * 0.98, dep * 0.75)} ${P(len * 0.3, dep * 1.05)} ${P(-len * 0.1, dep)}C${P(-len * 0.6, dep * 0.95)} ${P(-len, dep * 0.6)} ${P(-len, 0)}z`;
  _ppMass(parts.body, body, A, cx, cy, { k: 0.9, up: 1.2 });
  const brT = S.breastT ? S.breastT(X, m) : null;
  if (brT) parts.body.push(_pF(_pP`M${P(len * 0.35, -dep * 0.75)}C${P(len * 0.95, -dep * 0.6)} ${P(len * 1.05, dep * 0.4)} ${P(len * 0.6, dep * 0.85)}C${P(len * 0.2, dep * 1.0)} ${P(-len * 0.1, dep * 0.9)} ${P(-len * 0.1, dep * 0.6)}C${P(len * 0.3, dep * 0.4)} ${P(len * 0.45, -dep * 0.2)} ${P(len * 0.35, -dep * 0.75)}z`, brT[0], 0.95));
  else parts.body.push(_pF(_pP`M${P(len * 0.6, dep * 0.1)}C${P(len * 0.7, dep * 0.8)} ${P(-len * 0.2, dep * 1.05)} ${P(-len * 0.4, dep * 0.6)}C${P(-len * 0.1, dep * 0.6)} ${P(len * 0.3, dep * 0.5)} ${P(len * 0.6, dep * 0.1)}z`, B[0], 0.7));
  _ppFur(parts.body, seed + 'bf', cx, cy + dep * 0.1, len * 0.6, dep * 0.5, 22, 2.0, 1.6 - tilt, _ptMix(A[2], '#ffffff', 0.2), 0.6, 0.38);
  if (m === 'spots' || m === 'speckle' || m === 'bars') { const r = GART.rng('pps|' + seed); for (let i = 0; i < 12; i++) { const u = (r() - 0.4) * len * 1.3, v = (r() - 0.2) * dep; const p = R(u, v); parts.body.push(m === 'bars' ? _pL(_pP`M${p[0] - 1.6} ${p[1]}l3.2 0.4`, C[0], 0.8, 0.7) : _pF(_pE(p[0], p[1], 0.9, 0.7), C[0], 0.7)); } }
  // the folded wing (the owl, the parrot and the rest: layered feather ends)
  const W = S.wingT ? S.wingT(X, m) : [A[1], A[3], A[2], A[3]];
  const wa = R(len * 0.45, -dep * 0.5), wb = R(-len * 0.95, dep * 0.15), wc = R(len * 0.1, dep * 0.6);
  const wing = _pP`M${wa[0]} ${wa[1]}C${P(-len * 0.2, -dep * 0.85)} ${P(-len * 0.75, -dep * 0.3)} ${wb[0]} ${wb[1]}C${P(-len * 0.6, dep * 0.55)} ${wc[0] - 2} ${wc[1]} ${wc[0]} ${wc[1]}C${P(len * 0.45, dep * 0.3)} ${P(len * 0.55, -dep * 0.1)} ${wa[0]} ${wa[1]}z`;
  parts.paw.push(_pF(wing, W[0]), _pF(wing, _ptMix(W[0], W[2], 0.35), 1, _ppLitM(wa[0], wa[1], 0.86, 0.6, 0.6)));
  for (let i = 0; i < 4; i++) { const p = R(-len * (0.3 + i * 0.18), dep * (0.15 + i * 0.05)); parts.paw.push(_pL(_pP`M${p[0] + 3} ${p[1] - 1.2}L${p[0] - 1} ${p[1] + 0.6}`, W[1], 0.6, 0.5)); }
  if (S.speculum) parts.paw.push(_pF(_pE(R(-len * 0.2, dep * 0.3)[0], R(-len * 0.2, dep * 0.3)[1], 3.4, 1.2), S.speculum, 0.9));
  // neck and head
  const hr = S.hr, nb = R(len * 0.75, -dep * 0.55);
  let hx, hy;
  if (sleep) { hx = nb[0] - 2; hy = nb[1] - hr * 0.5; }
  else { const na = (S.neckA != null ? S.neckA : 70) * Math.PI / 180; hx = nb[0] + Math.cos(na) * (S.neck || 0) + hr * 0.25; hy = nb[1] - Math.sin(na) * (S.neck || 0) - hr * 0.5; }
  const HT = S.headT ? S.headT(X, m) : A;
  if ((S.neck || 0) > 2 && !sleep) { const nd = _ppTaper(nb, [hx - hr * 0.2, hy + hr * 0.3], dep * 0.95, hr * 1.2, S.neckBend || -2); _ppMass(parts.neck, nd, HT, (nb[0] + hx) / 2, (nb[1] + hy) / 2, { k: 0.84, up: 0.6 }); if (S.neckMark) S.neckMark(parts.neck, nb, [hx, hy], hr, X, m); }
  const H = parts.head;
  _ppMass(H, _pE(hx, hy, hr * (S.hw || 1), hr * (S.hh || 0.92)), HT, hx, hy, { k: 0.88, up: 0.6, hi: _pE(hx - hr * 0.3, hy - hr * 0.55, hr * 0.5, hr * 0.2) });
  if (S.owl) { H.push(_pF(_pE(hx + hr * 0.35, hy + hr * 0.05, hr * 0.62, hr * 0.72), _ptMix(B[0], '#ffffff', 0.2), 0.95), _pL(_pE(hx + hr * 0.35, hy + hr * 0.05, hr * 0.62, hr * 0.72), A[1], 0.6, 0.7)); }
  if (S.cheek) H.push(_pF(_pE(hx + hr * 0.25, hy + hr * 0.3, hr * 0.32, hr * 0.24), S.cheek(X, m), 0.9));
  if (S.crest && (S.crest !== 'mark' || m === 'crest' || m === 'tuft' || m === 'tufts' || m === 'comb' || m === 'plume')) {
    const cc = S.crestT ? S.crestT(X, m) : HT;
    if (S.crestKind === 'comb') H.push(_pF(_pP`M${hx - hr * 0.5} ${hy - hr * 0.7}q${hr * 0.15} -${hr * 0.7} ${hr * 0.4} -${hr * 0.25}q${hr * 0.15} -${hr * 0.6} ${hr * 0.4} -${hr * 0.1}q${hr * 0.25} -${hr * 0.5} ${hr * 0.35} ${hr * 0.15}z`, '#d8443a'));
    else if (S.crestKind === 'tufts') H.push(_pF(_pP`M${hx - hr * 0.6} ${hy - hr * 0.55}l-${hr * 0.25} -${hr * 0.75}l${hr * 0.6} ${hr * 0.45}z`, cc[1]));
    else if (S.crestKind === 'crown') for (let i = 0; i < 3; i++) H.push(_pL(_pP`M${hx - hr * 0.1} ${hy - hr * 0.8}l${-1 + i * 1.2} -${hr * 0.9}`, cc[1], 0.5), _pF(_pC(hx - hr * 0.1 - 1 + i * 1.2, hy - hr * 1.75, 1), cc[0]));
    else { const d = _pP`M${hx - hr * 0.1} ${hy - hr * 0.85}C${hx - hr * 0.4} ${hy - hr * 2.2} ${hx - hr * 1.6} ${hy - hr * 1.9} ${hx - hr * 1.5} ${hy - hr * 1.2}C${hx - hr * 1.1} ${hy - hr * 1.5} ${hx - hr * 0.8} ${hy - hr * 1.2} ${hx - hr * 0.7} ${hy - hr * 0.6}z`; H.push(_pF(d, cc[1]), _pF(d, cc[0], 1, _ppLitM(hx - hr * 0.6, hy - hr * 1.3, 0.8, 0.3, 0.2))); }
  }
  // the bill
  const bc = _ptTone(S.billCol ? S.billCol(X) : (X.nose || '#e8a040')), bt = (S.bill || {}).t || 'cone', bl = ((S.bill || {}).l || 1) * hr;
  const bx0 = hx + hr * 0.82, by0 = hy + hr * (sleep ? 0.25 : 0.05);
  if (sleep && !S.owl) H.push(_pF(_pP`M${bx0 - 2} ${by0 - 1}l${bl * 0.6} ${1.4}l-${bl * 0.55} ${1.2}z`, bc[1]));
  else if (bt === 'hook') H.push(_pF(_pP`M${bx0 - 1} ${by0 - hr * 0.35}Q${bx0 + bl * 0.9} ${by0 - hr * 0.45} ${bx0 + bl * 0.75} ${by0 + bl * 0.55}Q${bx0 + bl * 0.4} ${by0 + bl * 0.1} ${bx0 - 1} ${by0 + hr * 0.3}z`, bc[0]), _pL(_pP`M${bx0} ${by0 + hr * 0.05}l${bl * 0.4} 0.2`, bc[3], 0.5, 0.7));
  else if (bt === 'long') H.push(_pF(_pP`M${bx0 - 1} ${by0 - hr * 0.25}L${bx0 + bl * 1.6} ${by0 + 0.6}L${bx0 - 1} ${by0 + hr * 0.25}z`, bc[0]), _pL(_pP`M${bx0} ${by0 + 0.1}L${bx0 + bl * 1.5} ${by0 + 0.6}`, bc[3], 0.4, 0.7));
  else if (bt === 'bent') H.push(_pF(_pP`M${bx0 - 1} ${by0 - hr * 0.3}Q${bx0 + bl * 0.9} ${by0 - hr * 0.3} ${bx0 + bl} ${by0 + bl * 0.6}L${bx0 + bl * 0.7} ${by0 + bl * 0.9}Q${bx0 + bl * 0.4} ${by0 + hr * 0.25} ${bx0 - 1} ${by0 + hr * 0.25}z`, bc[0]), _pF(_pP`M${bx0 + bl * 0.75} ${by0 + bl * 0.15}L${bx0 + bl} ${by0 + bl * 0.6}L${bx0 + bl * 0.7} ${by0 + bl * 0.9}z`, '#2a2124'));
  else if (bt === 'flat') H.push(_pF(_pP`M${bx0 - 1} ${by0 - hr * 0.3}C${bx0 + bl * 0.6} ${by0 - hr * 0.35} ${bx0 + bl * 1.1} ${by0 - 0.2} ${bx0 + bl * 1.15} ${by0 + hr * 0.2}C${bx0 + bl * 0.6} ${by0 + hr * 0.4} ${bx0} ${by0 + hr * 0.35} ${bx0 - 1} ${by0 + hr * 0.3}z`, bc[0]), _pF(_pE(bx0 + bl * 1.05, by0 + hr * 0.12, 0.8, 0.6), bc[3], 0.6));
  else H.push(_pF(_pP`M${bx0 - 1} ${by0 - hr * 0.3}L${bx0 + bl * 0.7} ${by0 + 0.4}L${bx0 - 1} ${by0 + hr * 0.3}z`, bc[0]), _pL(_pP`M${bx0} ${by0 + 0.2}l${bl * 0.6} 0.3`, bc[3], 0.4, 0.6));
  if (mood.mouth === 'open' && !sleep && bt !== 'hook') H.push(_pF(_pP`M${bx0} ${by0 + 0.6}l${bl * 0.55} 0.4l-${bl * 0.5} 1.4z`, '#a84a4a', 0.8));
  if (S.wattle) H.push(_pF(_pE(bx0 - 0.4, by0 + hr * 0.55, hr * 0.15, hr * 0.28), '#d8443a'));
  // the eye
  const ex = hx + hr * (S.owl ? 0.45 : 0.35), ey = hy - hr * (S.owl ? 0.05 : 0.15), er = Math.max(0.9, hr * (S.es || 0.15));
  if (S.owl && !sleep) parts.eyes.push(_pF(_pC(ex, ey, er * 1.6), '#f2b632'));
  if (S.eyeRing) parts.eyes.push(_pF(_pC(ex, ey, er * 1.7), S.eyeRing, 0.9));
  _ppEye(parts.eyes, ex, ey, er, mood, X, sleep);
  if (S.extra) S.extra({ parts, X, A, B, C, m, pose, R, P, len, dep, hx, hy, hr, seed, cx, cy, pet });
  const topY = Math.min(hy - hr * (S.crest ? 1.9 : 1.1), cy - dep * 1.1);
  return {
    parts, order: _PP_ORDER.slice(),
    piv: { head: [hx - hr * 0.3, hy + hr * 0.7], eyes: [ex, ey], paw: wa, legsN: R(len * 0.05, dep * 0.6), legsF: R(len * 0.05 + 2, dep * 0.6), tail: R(-len * 0.7, 0), wingB: wa, wingN: wa, ears: [hx, hy - hr], body: [50, 90] },
    acc: { hc: [hx, hy, hr], neck: S.neck > 2 ? { x: (nb[0] + hx) / 2, y: (nb[1] + hy) / 2 + 2, w: hr * 0.95, rot: -10 } : { x: hx - hr * 0.2, y: hy + hr * 0.92, w: hr * 1.05, rot: -10 }, top: [hx - hr * 0.1, hy - hr * 0.82, hr * 1.15, -6], eyes: [ex, ex, ey, Math.max(1.6, er * 1.3)], ear: [hx - hr * 0.5, hy - hr * 0.6, hr * 0.26] },
    top: Math.min(topY, 20), bird: true, flap: S.flap || null,
  };
}

/* ---------- the species ---------- */
const _ppT = (c) => _ptTone(c);
const _ppDark = (X) => X.c;
const _ppFixed = (c) => () => _ptTone(c);
/** Shared extras. */
function _ppWings(c, o) {
  // folded or half-raised feathered (or leathery) wings on the back, in wingB/wingN for the flap clips
  const { parts, X, pose } = c, b = c.body, T = o.T ? o.T(X, c.m) : X.b, sleep = pose === 'sleep';
  let ax, ay; if (pose === 'walk') { ax = b.bx + b.L * 0.25; ay = b.by - b.D * 0.9; } else if (pose === 'sit') { ax = b.shX - 3; ay = b.shY - 1; } else { ax = b.cx + 3; ay = b.cy - b.ry * 0.8; }
  const s = (o.s || 1) * (sleep ? 0.7 : 1), bat = o.bat;
  const wing = (dx, dy, k, out, far) => {
    const tip = [ax - 22 * s * k + dx, ay - 18 * s * k + dy];
    const d = bat ? _pP`M${ax + dx} ${ay + dy}L${tip[0]} ${tip[1]}Q${tip[0] + 2} ${tip[1] + 8} ${tip[0] + 6} ${tip[1] + 12}Q${tip[0] + 8} ${tip[1] + 14} ${tip[0] + 12} ${tip[1] + 17}Q${ax - 6 + dx} ${ay + 4 + dy} ${ax + dx} ${ay + dy + 3}z`
      : _pP`M${ax + dx} ${ay + dy}C${ax - 6 * s + dx} ${ay - 10 * s + dy} ${tip[0] + 6} ${tip[1] - 2} ${tip[0]} ${tip[1]}C${tip[0] + 2} ${tip[1] + 6} ${tip[0] + 4} ${tip[1] + 10} ${tip[0] + 6} ${tip[1] + 16}C${ax - 10 * s + dx} ${ay + 4 + dy} ${ax - 2 + dx} ${ay + 5 + dy} ${ax + dx} ${ay + dy + 3}z`;
    const Tw = far ? [T[1], T[3], T[1], T[3]] : T;
    out.push(_pF(d, Tw[1]), _pF(d, Tw[0], 1, _ppLitM(ax - 10 * s + dx, ay - 6 * s + dy, 0.84, 0.6, 0.5)));
    if (!bat) for (let i = 0; i < 4; i++) out.push(_pL(_pP`M${tip[0] + 2 + i * 3.6 * s} ${tip[1] + 4 + i * 3.4 * s}l${-4 * s} ${3 * s}`, Tw[3], 0.6, 0.55));
    else out.push(_pL(_pP`M${ax + dx} ${ay + dy}L${tip[0] + 6} ${tip[1] + 12}M${ax + dx} ${ay + dy}L${tip[0] + 12} ${tip[1] + 17}`, Tw[3], 0.5, 0.6));
  };
  wing(4, -2, 0.85, parts.wingB, true);
  wing(0, 0, 1, parts.wingN, false);
}
function _ppHornX(c, col, kind) {
  const { H, hx, hy, hr } = c;
  if (kind === 'unicorn') { const d = _pP`M${hx + hr * 0.15} ${hy - hr * 0.7}L${hx + hr * 0.9} ${hy - hr * 2.5}L${hx + hr * 0.55} ${hy - hr * 0.6}z`; H.push(_pF(d, col[0]), _pL(_pP`M${hx + hr * 0.3} ${hy - hr * 1.0}l${hr * 0.35} -0.4M${hx + hr * 0.45} ${hy - hr * 1.5}l${hr * 0.28} -0.3M${hx + hr * 0.62} ${hy - hr * 2}l${hr * 0.2} -0.2`, col[1], 0.6, 0.8)); return; }
  if (kind === 'antler') { const d = _pP`M${hx - hr * 0.1} ${hy - hr * 0.7}L${hx - hr * 0.3} ${hy - hr * 2.0}M${hx - hr * 0.22} ${hy - hr * 1.4}L${hx + hr * 0.4} ${hy - hr * 1.9}M${hx - hr * 0.28} ${hy - hr * 1.8}L${hx - hr * 0.9} ${hy - hr * 2.4}M${hx - hr * 0.6} ${hy - hr * 2.1}L${hx - hr * 0.6} ${hy - hr * 2.6}`; H.push(_pL(d, col[1], 1.5), _pL(d, col[0], 0.8)); return; }
  if (kind === 'goat') { const d = _pP`M${hx - hr * 0.1} ${hy - hr * 0.7}C${hx - hr * 0.6} ${hy - hr * 1.8} ${hx - hr * 1.5} ${hy - hr * 1.6} ${hx - hr * 1.5} ${hy - hr * 0.9}`; H.push(_pL(d, col[1], hr * 0.32), _pL(d, col[0], hr * 0.18)); return; }
  // two small swept horns (the dragon, the yeti)
  const d = _pP`M${hx - hr * 0.05} ${hy - hr * 0.7}Q${hx - hr * 0.4} ${hy - hr * 1.5} ${hx - hr * 1.1} ${hy - hr * 1.6}Q${hx - hr * 0.6} ${hy - hr * 1.1} ${hx - hr * 0.5} ${hy - hr * 0.55}z`;
  H.push(_pF(d, col[1]), _pF(d, col[0], 1, _ppLitM(hx - hr * 0.5, hy - hr, 0.8, 0.3, 0.3)));
}
/** A mane down the neck (pony, lion, unicorn): locks of hair along the crest. */
function _ppMane(T, o) {
  return (parts, c) => {
    const Tm = T(c.X, c.m), out = parts.neck, r = GART.rng('ppmane|' + c.seed);
    if (c.pose === 'sleep') { out.push(_pF(_pE(c.hx - c.hr * 0.9, c.hy - c.hr * 0.3, c.hr * 0.9, c.hr * 0.6), Tm[0])); return; }
    if (o && o.lion) {
      const d = _pE(c.hx - c.hr * 0.25, c.hy + c.hr * 0.15, c.hr * 1.55, c.hr * 1.5);
      parts.ears.unshift(_pF(d, Tm[1]), _pF(d, Tm[0], 1, _ppLitM(c.hx, c.hy, 0.86, 0.8, 0.6)));
      _ppFur(parts.ears, c.seed + 'ln', c.hx - c.hr * 0.4, c.hy, c.hr * 1.2, c.hr * 1.2, 26, 3.4, 2.4, _ptMix(Tm[2], '#fff6e0', 0.2), 0.8, 0.5);
      return;
    }
    const [a, b] = [c.nb, c.nt], dx = b[0] - a[0], dy = b[1] - a[1], L0 = Math.hypot(dx, dy) || 1, nx = dy / L0, ny = -dx / L0, off = (c.D || 6) * 0.5;
    // the crest of the neck (its back edge) from the withers to the poll
    const p0 = [a[0] + nx * off - 2, a[1] + ny * off], p1 = [b[0] + nx * c.hr * 0.55, b[1] + ny * c.hr * 0.55 - c.hr * 0.4];
    const strip = _pP`M${p1[0] + 1.6} ${p1[1] - 1}C${p1[0] - 2} ${p1[1] + L0 * 0.3} ${p0[0] - 1} ${p0[1] - L0 * 0.25} ${p0[0] - 3} ${p0[1] + 2}L${p0[0] + 2} ${p0[1] + 3}C${p0[0] + 3} ${p0[1] - L0 * 0.3} ${p1[0] + 4} ${p1[1] + L0 * 0.3} ${p1[0] + 4} ${p1[1] + 1}z`;
    out.push(_pF(strip, Tm[1]), _pF(strip, Tm[0], 1, [1, 0, 0, 1, -0.4, -0.5]));
    for (let i = 0; i < 6; i++) { const t = (i + 0.5) / 6, x = p0[0] + (p1[0] - p0[0]) * t - 1, y = p0[1] + (p1[1] - p0[1]) * t; const L2 = 3 + r() * 3; out.push(_pF(_pP`M${x + 1.5} ${y - 1}Q${x - 2} ${y + 1} ${x - 2.4 - r()} ${y + L2}Q${x} ${y + L2 * 0.5} ${x + 2.4} ${y + 1}z`, i % 2 ? Tm[1] : Tm[0])); }
    out.push(_pF(_pP`M${p1[0] + 1} ${p1[1]}Q${p1[0] + c.hr * 0.8} ${p1[1] - c.hr * 0.6} ${p1[0] + c.hr * 1.2} ${p1[1] + c.hr * 0.1}Q${p1[0] + c.hr * 0.5} ${p1[1] + 0.2} ${p1[0] + c.hr * 0.6} ${p1[1] + c.hr * 0.6}z`, Tm[0]));
  };
}
const _ppRainbow = ['#e85a5a', '#f2a443', '#f4d65a', '#6cc070', '#5aa0e0', '#9a6ad8'];
/** Spines along the back (the dragon), quills (the hedgehog). */
function _ppSpines(c, kind) {
  const { parts, pose, A, C, X } = c, b = c.body, out = parts.body;
  if (kind === 'quills') {
    const T = X.c, r = GART.rng('ppq|' + c.seed), box = pose === 'walk' ? [b.bx - 1, b.by - b.D * 0.3, b.L * 1.05, b.D * 1.05] : pose === 'sit' ? [b.hcx + 3, b.hcy - b.hry * 0.4, b.hrx * 1.3, b.hry * 1.1] : [b.cx, b.cy - b.ry * 0.2, b.rx * 1.02, b.ry * 1.05];
    const d = _pP`M${box[0] - box[2]} ${box[1] + box[3] * 0.7}C${box[0] - box[2] * 1.1} ${box[1] - box[3] * 0.8} ${box[0] - box[2] * 0.2} ${box[1] - box[3] * 1.25} ${box[0] + box[2] * 0.6} ${box[1] - box[3] * 0.7}C${box[0] + box[2] * 0.95} ${box[1] - box[3] * 0.3} ${box[0] + box[2] * 0.9} ${box[1] + box[3] * 0.4} ${box[0] + box[2] * 0.75} ${box[1] + box[3] * 0.65}z`;
    out.push(_pF(d, T[1]), _pF(d, T[0], 1, _ppLitM(box[0], box[1], 0.88, 1, 0.6)));
    let s = '';
    for (let i = 0; i < 70; i++) { const t = r() * Math.PI, q = 0.35 + r() * 0.65, x = box[0] - Math.cos(t) * box[2] * 0.9 * q, y = box[1] + box[3] * 0.4 - Math.sin(t) * box[3] * 1.15 * q; s += _pP`M${x} ${y}l${-2.6 - r() * 1.4} ${-1.6 + r() * 1.4}`; }
    out.push(_pL(s, T[3], 0.8, 0.8), Object.assign(_pL(s, c.m === 'tips' ? '#f4ece0' : T[2], 0.4, 0.6, [1, 0, 0, 1, -0.6, -0.5]), { detail: true }));
    return;
  }
  const T = X.c, n = 6;
  for (let i = 0; i < n; i++) {
    let x, y; if (pose === 'walk') { x = b.xr + b.L * (0.2 + i * 0.3); y = b.by - b.D * (0.95 + Math.sin(i / n * Math.PI) * 0.1); } else if (pose === 'sit') { x = b.hcx - 4 + i * 3; y = b.hcy - b.hry - 1 - i * 3.6; } else { x = b.cx - b.rx * 0.7 + i * b.rx * 0.28; y = b.cy - b.ry * 1.0 + Math.abs(i - 2.5) * 0.8; }
    out.push(_pF(_pP`M${x - 2} ${y + 1.4}L${x - 0.6} ${y - 3.2}L${x + 2} ${y + 1.4}z`, T[0]));
  }
}

/** The species table: proportions and pieces. Dog breeds pick their own rows. */
const _PP_DOG = {
  lab: { L: 17, D: 8.5, leg: 17, lw: 4.2, hr: 6.4, sl: 5, sd: 3.6, ear: { t: 'flop', s: 1 }, tail: { t: 'long', s: 0.9, w: 1.2, lift: 1 }, neck: [6, 58, 7] },
  corgi: { L: 18, D: 8, leg: 8, lw: 4, hr: 6.6, sl: 4.2, sd: 3.2, ear: { t: 'point', s: 1.25, lean: 0.1 }, tail: { t: 'pom', s: 0.8, tip: 'b' }, neck: [5, 55, 6.8], long: true, socks: true },
  dachshund: { L: 21, D: 6.6, leg: 7, lw: 3.4, hr: 5.8, sl: 5.6, sd: 2.8, ear: { t: 'lop', s: 0.9 }, tail: { t: 'long', s: 0.8, w: 0.8, lift: 1 }, neck: [6, 55, 5.6], long: true },
  pug: { L: 13, D: 8, leg: 11, lw: 3.8, hr: 7, sl: 1.4, sd: 4, ear: { t: 'fold', s: 1, dark: true }, tail: { t: 'curl', s: 0.8 }, neck: [3, 55, 7.4], muzzle: false, faceT: (X) => X.c },
  husky: { L: 17, D: 8.4, leg: 17, lw: 4, hr: 6.4, sl: 5, sd: 3.2, ear: { t: 'point', s: 1.1, lean: 0.05 }, tail: { t: 'curl', s: 1.2, w: 1.4, fluff: true }, neck: [6, 58, 7.2], socks: true },
  poodle: { L: 14, D: 8, leg: 19, lw: 3.6, hr: 6, sl: 5, sd: 2.8, ear: { t: 'lop', s: 0.9 }, tail: { t: 'pom', s: 1.0 }, neck: [9, 66, 5.6], furLen: 1.6 },
  shiba: { L: 15, D: 8, leg: 15, lw: 3.8, hr: 6.2, sl: 4.2, sd: 3, ear: { t: 'point', s: 1.0, lean: 0.1 }, tail: { t: 'curl', s: 1.0, w: 1.3, fluff: true }, neck: [6, 58, 6.6] },
  beagle: { L: 15, D: 8, leg: 13, lw: 3.8, hr: 6.2, sl: 4.6, sd: 3.4, ear: { t: 'lop', s: 0.85 }, tail: { t: 'long', s: 0.7, w: 1.1, lift: 3, tip: 'b' }, neck: [5, 58, 6.6], extra: (c) => _ppSaddle(c) },
};
function _ppSaddle(c) { if (c.m === 'plain' || c.m === 'saddle') { const b = c.body; if (c.pose === 'walk') c.parts.body.push(_pF(_pE(b.bx - 3, b.by - b.D * 0.5, b.L * 0.55, b.D * 0.5), c.X.c[0], 0.85)); } }
const _PP_SPEC = {
  cat: (pet) => Object.assign({ L: 14, D: 6.8, leg: 15, lw: 3, hr: 5.6, sl: 2.2, sd: 2.4, ear: { t: pet.breed === 'fold' ? 'fold' : 'point', s: 1.0 }, tail: { t: pet.breed === 'fluffy' ? 'bushy' : 'long', s: pet.breed === 'fluffy' ? 0.75 : 1, lift: 3 }, neck: [3, 55, 5.6], whisk: true, slope: -1, furLen: pet.breed === 'fluffy' ? 3.4 : 2.2, nose: '#d88a92', es: 0.17 }),
  dog: (pet) => Object.assign({ nose: '#2a2224', es: 0.15, whisk: false }, _PP_DOG[pet.breed] || _PP_DOG.lab),
  rabbit: (pet) => ({ L: 12, D: 8, leg: 6, lw: 3.2, hr: 6, sl: 2.2, sd: 3.2, ear: { t: pet.breed === 'lop' ? 'lop' : 'tall', s: 0.95, back: 0.3 }, tail: { t: 'pom', s: 1.1 }, neck: [2, 45, 7], slope: 4, arch: 3, nose: '#e88a9a', whisk: true, ch: 1.3 }),
  hamster: () => ({ L: 9.5, D: 7.5, leg: 3, lw: 2.6, hr: 6, sl: 2, sd: 3, ear: { t: 'round', s: 0.75 }, tail: { t: 'none' }, neck: [0.5, 30, 7], arch: 2, nose: '#e88a9a', whisk: true, ch: 1.1, hh: 0.95 }),
  guinea: (pet) => ({ L: 12, D: 8, leg: 3, lw: 3, hr: 6.6, sl: 2.8, sd: 3.6, ear: { t: 'fold', s: 1.1 }, tail: { t: 'none' }, neck: [0.5, 25, 8], arch: 3, nose: '#4a3a3a', whisk: true, ch: 1.1, furLen: pet.marks === 'swirls' ? 3.6 : 2.6,
    headExtra: (c) => { if (c.m === 'crest') c.H.push(_pF(_ptStar(c.hx - c.hr * 0.3, c.hy - c.hr * 0.8, c.hr * 0.5, c.hr * 0.2, 7), c.B[0])); } }),
  fox: (pet) => ({ L: 15, D: 6.6, leg: 15, lw: 2.8, hr: 5.6, sl: 5.2, sd: 2.4, ear: { t: 'point', s: pet.marks === 'bigears' ? 1.6 : 1.2, dark: false, innerB: true }, tail: { t: 'bushy', s: 0.95, tip: 'b' }, neck: [5, 55, 5.4], legT: (X, m) => (m === 'socks' ? X.c : X.a), nose: '#2a2224', muzOp: 0.95 }),
  redpanda: (pet) => ({ L: 14, D: 7.4, leg: 10, lw: 3.4, hr: 6.4, sl: 2.6, sd: 3, ear: { t: 'point', s: 0.85, innerB: true }, tail: { t: 'bushy', s: 0.95, ringed: true }, neck: [3, 50, 6.4], legT: (X) => X.c, nose: '#2a2224',
    headExtra: (c) => { c.H.push(_pF(_pE(c.hx + c.hr * 0.45, c.hy + c.hr * 0.3, c.hr * 0.55, c.hr * 0.5), c.B[0], 0.95)); if (c.m === 'tears' || c.m === 'bright') c.H.push(_pL(_pP`M${c.ex} ${c.ey + c.er}q-0.4 ${c.hr * 0.5} -1.4 ${c.hr * 0.75}`, c.C[0], 1.2, 0.9)); c.H.push(_pF(_pE(c.hx + c.hr * 0.3, c.hy - c.hr * 0.45, c.hr * 0.4, c.hr * 0.2), c.B[0], 0.9)); } }),
  ferret: () => ({ L: 19, D: 5.4, leg: 7, lw: 2.6, hr: 4.8, sl: 3.4, sd: 2.4, ear: { t: 'round', s: 0.7, innerB: true }, tail: { t: 'long', s: 0.7, w: 1.2, lift: 0 }, neck: [5, 40, 4.8], arch: 3, long: true, whisk: true, nose: '#e88a9a', eyePatch: (X) => X.c[0], legT: (X) => X.c }),
  mouse: () => ({ L: 9, D: 5.6, leg: 3.6, lw: 2, hr: 4.6, sl: 3.4, sd: 2.2, ear: { t: 'round', s: 1.25 }, tail: { t: 'thin', s: 1.1, lift: 0 }, neck: [1, 30, 5], arch: 2, whisk: true, nose: '#e88a9a', es: 0.2 }),
  squirrel: () => ({ L: 10, D: 6, leg: 7, lw: 2.4, hr: 5, sl: 2.6, sd: 2.6, ear: { t: 'point', s: 0.9 }, tail: { t: 'squirrel', s: 0.95 }, neck: [2, 50, 5], slope: 3, arch: 2, ch: 1.2, whisk: true, nose: '#3a2a2a',
    headExtra: (c) => { if (c.m === 'tufts') c.EA.push(_pL(_pP`M${c.hx - c.hr * 0.3} ${c.hy - c.hr * 1.4}l-1 -2.4M${c.hx - c.hr * 0.2} ${c.hy - c.hr * 1.4}l0.4 -2.6`, c.A[1], 0.8)); } }),
  mole: () => ({ L: 11, D: 6.6, leg: 2.6, lw: 3.2, hr: 5, sl: 4.6, sd: 2.2, ear: { t: 'none' }, tail: { t: 'stub', s: 0.6 }, neck: [0.5, 20, 6.6], arch: 3, noFur: false, furLen: 1.4, nose: '#e88a9a', es: 0.07, muzzle: false, claws: true, legT: () => _ptTone('#e8a8a8'),
    headExtra: (c) => { if (c.m === 'miner') { c.H.push(_pF(_pP`M${c.hx - c.hr * 0.9} ${c.hy - c.hr * 0.4}Q${c.hx} ${c.hy - c.hr * 1.8} ${c.hx + c.hr * 0.9} ${c.hy - c.hr * 0.4}z`, '#e2b23a'), _pF(_pC(c.hx + c.hr * 0.4, c.hy - c.hr * 0.9, 1.1), '#fff6c0')); } } }),
  badger: () => ({ L: 16, D: 7.6, leg: 7, lw: 3.6, hr: 5.6, sl: 4.4, sd: 2.6, ear: { t: 'round', s: 0.6, innerB: true }, tail: { t: 'stub', s: 0.9 }, neck: [2, 30, 6.6], arch: 2, claws: true, legT: (X) => X.c, nose: '#2a2224', muzzle: false,
    headExtra: (c) => { c.H.push(_pF(_pP`M${c.hx - c.hr * 0.9} ${c.hy - c.hr * 0.2}Q${c.hx} ${c.hy - c.hr * 1.1} ${c.tipX - c.sd * 0.3} ${c.tipY - c.sd * 0.4}L${c.tipX - c.sd * 0.3} ${c.tipY}Q${c.hx} ${c.hy - c.hr * 0.4} ${c.hx - c.hr * 0.9} ${c.hy + c.hr * 0.2}z`, '#f4f0ea', 0.95), _pF(_pP`M${c.hx - c.hr * 0.8} ${c.hy + c.hr * 0.1}Q${c.hx + c.hr * 0.3} ${c.hy - c.hr * 0.4} ${c.tipX - c.sd} ${c.tipY - c.sd * 0.1}L${c.tipX - c.sd} ${c.tipY + c.sd * 0.5}Q${c.hx} ${c.hy + c.hr * 0.2} ${c.hx - c.hr * 0.8} ${c.hy + c.hr * 0.5}z`, '#2a2628', 0.95)); } }),
  otter: () => ({ L: 18, D: 6.2, leg: 6, lw: 3, hr: 5.2, sl: 2.8, sd: 2.8, ear: { t: 'tiny', s: 1 }, tail: { t: 'flat', s: 0.9 }, neck: [4, 40, 6], arch: 2, long: true, whisk: true, nose: '#2a2224', furLen: 1.6,
    extra: (c) => { if (c.m === 'shell' && c.pose === 'sit') c.parts.paw.push(_pF(_pE(c.body.chX, c.body.shY + 5, 2.6, 2), '#e8d8c8')); } }),
  raccoon: () => ({ L: 14, D: 7.6, leg: 9, lw: 3.2, hr: 5.8, sl: 3, sd: 2.6, ear: { t: 'point', s: 0.7, innerB: true }, tail: { t: 'bushy', s: 0.85, ringed: true }, neck: [2, 40, 6.4], arch: 4, legT: (X) => X.c, nose: '#2a2224',
    headExtra: (c) => { c.H.push(_pF(_pE(c.ex, c.ey + 0.3, c.er * 3.2, c.er * 1.9), c.m === 'bandit' ? '#1d1a1c' : '#2a2628', 0.95), _pF(_pE(c.ex, c.ey - c.er * 2.3, c.er * 2.8, c.er * 0.8), '#f4f0ea', 0.9)); }, stripes: false,
    tailRing: true }),
  fawn: (pet) => ({ L: 13, D: 6.4, leg: 21, lw: 2.2, hr: 5, sl: 4, sd: 2.6, ear: { t: 'point', s: 1.3, lean: -0.2, innerB: true }, tail: { t: 'stub', s: 0.9, tip: 'b' }, neck: [9, 62, 4.4], hoof: true, slope: 1, nose: '#2a2224',
    extra: (c) => { if (c.m === 'spots') { const b = c.body, r = GART.rng('fawn' + c.seed); for (let i = 0; i < 10; i++) { const x = c.pose === 'walk' ? b.bx + (r() - 0.5) * b.L * 1.4 : c.pose === 'sit' ? b.hcx + (r() - 0.3) * 10 : b.cx + (r() - 0.5) * b.rx; const y = c.pose === 'walk' ? b.by - b.D * (0.2 + r() * 0.5) : c.pose === 'sit' ? b.hcy - r() * 8 : b.cy - b.ry * (0.2 + r() * 0.5); c.parts.body.push(_pF(_pE(x, y, 1.1, 0.8), '#fbf4e6', 0.95)); } } },
    headExtra: (c) => { if (c.m === 'stag') _ppHornX(c, _ptTone('#b89a72'), 'antler'); } }),
  lamb: () => ({ L: 13, D: 8.4, leg: 13, lw: 2.4, hr: 5, sl: 2.6, sd: 2.6, ear: { t: 'flop', s: 0.7 }, tail: { t: 'stub', s: 1.1 }, neck: [3, 50, 6], hoof: true, noFur: true, faceT: (X) => _ptTone('#3a3236'), legT: () => _ptTone('#3a3236'), muzzle: false, nose: '#2a2224',
    extra: (c) => { const b = c.body, r = GART.rng('lamb' + c.seed), box = c.pose === 'walk' ? [b.bx, b.by, b.L * 1.05, b.D * 1.05] : c.pose === 'sit' ? [b.hcx + 4, b.hcy - 4, b.hrx * 1.5, b.hry * 1.4] : [b.cx, b.cy, b.rx, b.ry]; for (let i = 0; i < 24; i++) { const t = r() * Math.PI * 2, q = Math.sqrt(r()); const x = box[0] + Math.cos(t) * box[2] * q * 0.85, y = box[1] + Math.sin(t) * box[3] * q * 0.8; c.parts.body.push(_pF(_pC(x, y, 2.2 + r()), c.A[1], 0.9), _pF(_pC(x - 0.4, y - 0.5, 1.8 + r() * 0.6), c.A[0], 0.95)); }
      if (c.m === 'patch') c.parts.body.push(_pF(_pE(box[0] - 2, box[1] - 2, 4, 3), c.C[0], 0.85)); } }),
  piglet: () => ({ L: 14, D: 8, leg: 7, lw: 3, hr: 6.2, sl: 3.2, sd: 3.8, ear: { t: 'flop', s: 0.7, inner: '#e88a9a' }, tail: { t: 'curl', s: 0.5 }, neck: [1, 30, 7.6], hoof: true, hoofCol: '#a8645a', noFur: true, nose: '#e88a9a', muzzle: false, belly: false,
    headExtra: (c) => { c.H.push(_pF(_pE(c.tipX + 0.4, c.tipY - c.sd * 0.1, c.sd * 0.3, c.sd * 0.55), _ptMix(c.A[0], '#c05a6a', 0.3)), _pF(_pE(c.tipX + 0.5, c.tipY - c.sd * 0.25, 0.4, 0.6), '#7a3a4a')); } }),
  goat: () => ({ L: 14, D: 7.2, leg: 16, lw: 2.4, hr: 5, sl: 4.6, sd: 2.6, ear: { t: 'flop', s: 0.75 }, tail: { t: 'stub', s: 0.8 }, neck: [6, 60, 5], hoof: true, nose: '#2a2224',
    headExtra: (c) => { _ppHornX(c, _ptTone('#b0a08a'), 'goat'); c.H.push(_pF(_pP`M${c.tipX - c.sd * 1.4} ${c.tipY + c.sd * 0.5}l-0.4 ${c.hr * 0.9}l2.2 -${c.hr * 0.7}z`, c.A[1])); if (c.m === 'blaze') c.H.push(_pL(_pP`M${c.hx + c.hr * 0.2} ${c.hy - c.hr * 0.7}L${c.tipX - 1} ${c.tipY - c.sd * 0.5}`, c.B[0], 1.6, 0.9)); } }),
  pony: (pet) => ({ L: 16, D: 8, leg: 20, lw: 3, hr: 5.2, sl: 6.8, sd: 3.2, ear: { t: 'point', s: 0.8, lean: 0.25 }, tail: { t: 'plume', s: 1.0 }, neck: [12, 64, 6.4], hoof: true, nose: '#3a2e2e', mane: _ppMane((X) => X.c), muzzle: false,
    headExtra: (c) => { if (c.m === 'blaze') c.H.push(_pL(_pP`M${c.hx + c.hr * 0.3} ${c.hy - c.hr * 0.7}L${c.tipX - 1} ${c.tipY - c.sd * 0.4}`, '#fbf8f2', 1.6, 0.95)); if (c.m === 'star') c.H.push(_pF(_ptStar(c.hx + c.hr * 0.4, c.hy - c.hr * 0.45, 1.6, 0.6, 4), '#fbf8f2')); },
    legT: (X, m) => (m === 'socks' ? X.b : X.a), extra: (c) => { if (c.m === 'dapple') { const b = c.body, r = GART.rng('dap' + c.seed); if (c.pose === 'walk') for (let i = 0; i < 12; i++) c.parts.body.push(_pL(_pC(b.bx - b.L * 0.6 + r() * b.L * 1.3, b.by - b.D * 0.6 + r() * b.D, 1.2), c.B[0], 0.6, 0.6)); } } }),
  unicorn: (pet) => Object.assign(_PP_SPEC.pony(pet), { mane: _ppMane((X, m) => _ptTone(m === 'gold' ? '#e8c35a' : m === 'silver' ? '#c8ccd6' : m === 'pastel' ? '#f2b6d8' : '#c86ad8')), tail: { t: 'plume', s: 1.0, col: (X, m) => _ptTone(m === 'gold' ? '#e8c35a' : m === 'silver' ? '#c8ccd6' : m === 'pastel' ? '#b6c8f2' : '#6aa0e0') },
    headExtra: (c) => _ppHornX(c, _ptTone(c.m === 'silver' ? '#d8dce6' : '#f2d27a'), 'unicorn') }),
  pegasus: (pet) => Object.assign(_PP_SPEC.pony(pet), { extra: (c) => { _ppWings(c, { s: 1.0, T: (X) => _ptTone(_ptMix(X.b[0], '#ffffff', 0.3)) }); if (c.m === 'stars') { const r = GART.rng('peg' + c.seed); for (let i = 0; i < 5; i++) c.parts.fx.push(_pF(_ptStar(20 + r() * 50, 20 + r() * 30, 1.6, 0.5, 4), '#f4e27a', 0.8)); } } }),
  capybara: () => ({ L: 16, D: 9, leg: 7, lw: 3.6, hr: 6.6, sl: 4.6, sd: 4.6, hh: 1.0, ear: { t: 'tiny', s: 1.3 }, tail: { t: 'none' }, neck: [1, 30, 8.6], arch: 1, nose: '#2a2224', muzzle: false, es: 0.11, furLen: 1.6,
    headExtra: (c) => { if (c.m === 'yuzu') c.H.push(_pF(_pC(c.hx - c.hr * 0.1, c.hy - c.hr * 1.2, c.hr * 0.5), '#f2c43a'), _pF(_pE(c.hx, c.hy - c.hr * 1.6, 0.8, 0.4), '#5a9a3a')); if (c.m === 'bird') c.H.push(_pF(_pE(c.hx - c.hr * 0.2, c.hy - c.hr * 1.3, 2.4, 1.6), '#8a6a50'), _pF(_pC(c.hx + 1.4, c.hy - c.hr * 1.7, 1.2), '#8a6a50'), _pF(_pP`M${c.hx + 2.4} ${c.hy - c.hr * 1.7}l1.2 0.3l-1.2 0.3z`, '#e8a040')); } }),
  bear: () => ({ L: 17, D: 10, leg: 11, lw: 5, hr: 6.6, sl: 3.6, sd: 3.4, ear: { t: 'round', s: 0.7 }, tail: { t: 'stub', s: 0.8 }, neck: [2, 35, 8.6], slope: 2, arch: 3, nose: '#2a2224', es: 0.12, furLen: 3,
    extra: (c) => { if (c.m === 'moon' && c.pose !== 'sleep') { const p = c.pose === 'walk' ? [c.body.xc - 1, c.body.by - 1] : [c.body.chX - 1, c.body.shY + 3]; c.parts.body.push(_pF(_pP`M${p[0] - 3} ${p[1] - 2}Q${p[0]} ${p[1] + 2} ${p[0] + 3} ${p[1] - 2}Q${p[0]} ${p[1] + 0.4} ${p[0] - 3} ${p[1] - 2}z`, '#f4ecd8', 0.95)); } } }),
  panda: () => ({ L: 17, D: 10, leg: 11, lw: 5, hr: 6.8, sl: 2.6, sd: 3.2, ear: { t: 'round', s: 0.8, dark: true }, tail: { t: 'stub', s: 0.8 }, neck: [2, 35, 8.6], slope: 1, arch: 3, nose: '#2a2224', es: 0.11, legT: (X) => X.c, eyePatch: (X) => X.c[0], muzzle: false,
    extra: (c) => { const b = c.body; if (c.pose === 'walk') c.parts.body.push(_pF(_pP`M${b.xc - b.L * 0.45} ${b.by - b.D * 1.0}C${b.xc} ${b.by - b.D * 1.05} ${b.xc + 3} ${b.by} ${b.xc - 1} ${b.by + b.D * 0.6}L${b.xc - b.L * 0.4} ${b.by + b.D * 0.6}z`, c.C[0], 0.95)); if (c.m === 'bamboo' && c.pose === 'sit') c.parts.paw.push(_pL(_pP`M${b.chX - 4} ${b.shY + 8}l10 -14`, '#6a9a3a', 1.6), _pF(_pE(b.chX + 6, b.shY - 7, 3, 1), '#7aaa4a')); } }),
  koala: () => ({ L: 12, D: 9, leg: 8, lw: 4, hr: 7, sl: 1.6, sd: 3.2, ear: { t: 'round', s: 1.3, innerB: true }, tail: { t: 'none' }, neck: [2, 45, 8], slope: 4, arch: 2, nose: '#3a3438', noseBig: true, es: 0.11, muzzle: false, furLen: 3,
    headExtra: (c) => { c.H.push(_pF(_pE(c.tipX - 0.4, c.tipY - c.sd * 0.2, c.sd * 0.5, c.sd * 0.75), '#3a3438')); if (c.m === 'leaf') c.H.push(_pF(_pE(c.tipX, c.tipY + c.sd, 3, 1.2), '#6a9a4a')); } }),
  wolf: () => ({ L: 17, D: 7.6, leg: 18, lw: 3.2, hr: 6, sl: 6, sd: 2.8, ear: { t: 'point', s: 1.05, lean: 0.05, innerB: true }, tail: { t: 'bushy', s: 0.85, tip: 'c' }, neck: [6, 50, 7], slope: 2, nose: '#2a2224', furLen: 3, socks: false,
    extra: (c) => { if (c.m === 'saddle') { } } }),
  lion: () => ({ L: 17, D: 8, leg: 17, lw: 3.8, hr: 5.8, sl: 3.8, sd: 3.4, ear: { t: 'round', s: 0.6 }, tail: { t: 'tuft', s: 1.0 }, neck: [5, 55, 7.4], nose: '#8a4a3a', whisk: true, mane: _ppManeLion }),
  tiger: () => ({ L: 18, D: 8, leg: 16, lw: 3.8, hr: 6, sl: 3.6, sd: 3.2, ear: { t: 'round', s: 0.6, innerB: true }, tail: { t: 'long', s: 1.0, w: 1.2, lift: 2, ringed: true, tip: 'c' }, neck: [4, 50, 7.4], stripes: 'bold', stripeCol: (c) => c.C[0], whisk: true, nose: '#d88a7a' }),
  alpaca: () => ({ L: 13, D: 8, leg: 17, lw: 2.8, hr: 4.8, sl: 2.8, sd: 2.6, ear: { t: 'point', s: 1.1, lean: -0.1 }, tail: { t: 'stub', s: 1.1 }, neck: [18, 82, 6], hoof: true, furLen: 3.4, nose: '#3a2e2e', muzzle: false,
    headExtra: (c) => { c.H.push(_pF(_pE(c.hx - c.hr * 0.1, c.hy - c.hr * 0.9, c.hr * 0.8, c.hr * 0.5), c.A[0])); _ppFur(c.H, c.seed + 'tf', c.hx - c.hr * 0.1, c.hy - c.hr * 0.9, c.hr * 0.7, c.hr * 0.4, 8, 1.6, 0, c.A[2], 0.6, 0.6); },
    extra: (c) => { if (c.m === 'scarf' && c.pose !== 'sleep') { } } }),
  griffin: (pet) => ({ L: 16, D: 8, leg: 16, lw: 3.6, hr: 5.4, sl: 3, sd: 3, ear: { t: 'point', s: 0.7 }, tail: { t: 'tuft', s: 1.0 }, neck: [6, 60, 7], nose: '#2a2224', beak: '#e8b84a', muzzle: false, noFur: false, faceT: (X) => _ptTone(pet.marks === 'gold' ? '#e8c87a' : '#f4f0ea'),
    extra: (c) => _ppWings(c, { s: 1.05, T: (X) => X.b }), headExtra: (c) => { c.H.push(_pF(_pE(c.hx, c.hy, c.hr * 0.95, c.hr * 0.85), (c.m === 'gold' ? _ptTone('#e8c87a') : _ptTone('#f4f0ea'))[0])); c.H.push(_pF(_pP`M${c.hx + c.hr * 0.5} ${c.hy - c.hr * 0.4}Q${c.hx + c.hr * 1.9} ${c.hy - c.hr * 0.4} ${c.hx + c.hr * 1.7} ${c.hy + c.hr * 0.75}Q${c.hx + c.hr * 1.3} ${c.hy + c.hr * 0.2} ${c.hx + c.hr * 0.6} ${c.hy + c.hr * 0.4}z`, '#e8b84a')); }, noseKind: 'none', sl: 0.4 }),
  dragon: () => ({ L: 16, D: 7.6, leg: 13, lw: 3.6, hr: 5.6, sl: 5, sd: 3, ear: { t: 'none' }, tail: { t: 'long', s: 1.3, w: 1.5, lift: 1 }, neck: [8, 55, 6], noFur: true, nose: '#2a2a2a', muzzle: false, claws: true,
    extra: (c) => { _ppWings(c, { s: 0.85, bat: true, T: (X) => X.c }); _ppSpines(c, 'spines'); const b = c.body, r = GART.rng('scl' + c.seed); if (c.pose === 'walk') for (let i = 0; i < 14; i++) c.parts.body.push(_pL(_pP`M${b.bx - b.L * 0.8 + r() * b.L * 1.6} ${b.by - b.D * 0.5 + r() * b.D * 0.9}q1 1 2 0`, c.A[3], 0.5, 0.5)); if (c.m === 'spots' || c.m === 'stripes') {} },
    headExtra: (c) => { _ppHornX(c, _ptTone('#f0e6c8'), 'horns'); c.H.push(_pF(_pE(c.tipX - 1, c.tipY - c.sd * 0.4, 0.5, 0.4), '#2a2a2a')); } }),
  kitsune: () => ({ L: 15, D: 6.6, leg: 15, lw: 2.8, hr: 5.6, sl: 5, sd: 2.4, ear: { t: 'point', s: 1.3, innerB: true }, tail: { t: 'nine', s: 0.85, tip: 'b' }, neck: [5, 55, 5.4], nose: '#2a2224',
    headExtra: (c) => { c.H.push(_pL(_pP`M${c.hx + c.hr * 0.1} ${c.hy - c.hr * 0.5}q${c.hr * 0.4} -0.6 ${c.hr * 0.7} 0.3`, '#d8443a', 0.8, 0.9)); if (c.m === 'wisp' && c.pose !== 'sleep') c.parts.fx.push(_pF(_pE(c.hx - 14, c.hy - 6, 2.4, 3.2), '#8ac8f2', 0.75), _pF(_pE(c.hx - 14, c.hy - 5.4, 1.2, 1.8), '#e6f6ff', 0.9)); } }),
  jackalope: (pet) => Object.assign(_PP_SPEC.rabbit(pet), { ear: { t: 'tall', s: 0.8, back: 0.35 }, headExtra: (c) => _ppHornX(c, _ptTone('#b89a72'), 'antler') }),
};
function _ppManeLion(parts, c) { if (c.m === 'plain') return; _ppMane((X, m) => (m === 'dark' ? _ptTone(_ptMix(X.c[0], '#1a1420', 0.25)) : X.c), { lion: true })(parts, c); }

/** The birds' rows. */
const _PP_BIRDS = {
  owl: { len: 9, dep: 11, tilt: 62, neck: 0, hr: 8, leg: 3, bill: { t: 'hook', l: 0.32 }, billCol: () => '#6a5a4a', tail: { t: 'short', l: 0.7 }, owl: true, crest: 'mark', crestKind: 'tufts', es: 0.2, legCol: () => '#c8a070', flap: null },
  parrot: { len: 9, dep: 7.4, tilt: 58, neck: 2, hr: 6, leg: 6, bill: { t: 'hook', l: 0.55 }, billCol: () => '#3a3436', tail: { t: 'long', l: 1.3 }, crest: 'mark', es: 0.15, eyeRing: '#f4f0ea', legCol: () => '#7a7a80', wingT: (X) => X.c, cheek: (X, m) => (m === 'cheeks' ? '#f28a3a' : X.a[0]) },
  wren: { len: 8, dep: 6.4, tilt: 15, neck: 1, hr: 5, leg: 8, bill: { t: 'long', l: 0.55 }, billCol: () => '#4a3a30', tail: { t: 'cocked', l: 0.9 }, es: 0.16, legCol: () => '#c09a7a' },
  robin: { len: 8.4, dep: 7.4, tilt: 30, neck: 1, hr: 5.6, leg: 8, bill: { t: 'cone', l: 0.5 }, billCol: () => '#3a3030', tail: { t: 'short', l: 1.1 }, es: 0.16, legCol: () => '#a07a5a', breastT: (X) => X.b },
  chick: { len: 8.4, dep: 8.2, tilt: 25, neck: 1, hr: 6.4, leg: 6, bill: { t: 'cone', l: 0.4 }, billCol: () => '#f0a03a', tail: { t: 'short', l: 0.5 }, es: 0.15, legCol: () => '#f0a03a', crest: 'mark', crestKind: 'comb',
    extra: (c) => { if (c.m === 'shell') c.parts.body.push(_pF(_pP`M${c.cx - c.len * 1.1} ${c.cy + 2}L${c.cx - 6} ${c.cy - 1}L${c.cx - 2} ${c.cy + 2}L${c.cx + 2} ${c.cy - 1}L${c.cx + 6} ${c.cy + 2}L${c.cx + c.len * 1.1} ${c.cy}Q${c.cx + c.len} ${_PP_G} ${c.cx} ${_PP_G}Q${c.cx - c.len} ${_PP_G} ${c.cx - c.len * 1.1} ${c.cy + 2}z`, '#f6f1e6', 0.98)); } },
  goose: { len: 13, dep: 8, tilt: 8, neck: 13, neckA: 82, neckBend: -3, hr: 5, leg: 8, bill: { t: 'flat', l: 0.85 }, billCol: () => '#f0903a', tail: { t: 'cocked', l: 0.6 }, legCol: () => '#f0903a', webbed: true, es: 0.13,
    extra: (c) => { if (c.m === 'bow' && c.pose !== 'sleep') c.parts.neck.push(_pF(_pP`M${c.hx - 4} ${c.hy + 8}l-3 -2l0 4z M${c.hx - 4} ${c.hy + 8}l3 -2l0 4z`, '#5a8ae0')); if (c.m === 'cap') c.parts.head.push(_pF(_pP`M${c.hx - c.hr} ${c.hy - c.hr * 0.3}Q${c.hx} ${c.hy - c.hr * 1.5} ${c.hx + c.hr} ${c.hy - c.hr * 0.3}z`, '#3a6ab0')); } },
  flamingo: { len: 10, dep: 7, tilt: 12, neck: 15, neckA: 78, neckBend: -5, hr: 4.4, leg: 26, legW: 1.4, bill: { t: 'bent', l: 1.0 }, billCol: () => '#f4ece0', tail: { t: 'short', l: 0.6 }, legCol: (X) => X.a[0], es: 0.14,
    wingT: (X, m) => (m === 'tips' ? _ptTone('#2a2224') : X.c), extra: (c) => { if (c.m === 'shades' && c.pose !== 'sleep') c.parts.eyes.push(_pF(_pE(c.hx + c.hr * 0.4, c.hy - c.hr * 0.15, c.hr * 0.5, c.hr * 0.3), '#1d1a1c', 0.92)); } },
  penguin: { len: 8, dep: 10, tilt: 80, neck: 0, hr: 6, leg: 2, bill: { t: 'long', l: 0.6 }, billCol: () => '#2a2224', tail: { t: 'short', l: 0.6 }, legCol: () => '#f0903a', webbed: true, es: 0.14, breastT: (X) => X.b, crest: 'mark', crestKind: 'crown', crestT: () => _ptTone('#f4c43a'),
    extra: (c) => { if (c.m === 'scarf' && c.pose !== 'sleep') c.parts.neck.push(_pF(_pE(c.hx - 1, c.hy + c.hr * 0.95, c.hr * 0.95, c.hr * 0.35), '#d84a4a'), _pF(_pP`M${c.hx - 4} ${c.hy + c.hr}l-2 6l3 -0.6z`, '#d84a4a')); } },
  peacock: { len: 10, dep: 7, tilt: 20, neck: 7, neckA: 80, hr: 4.4, leg: 12, bill: { t: 'cone', l: 0.5 }, billCol: () => '#6a5a4a', tail: { t: 'fanup' }, legCol: () => '#8a7a6a', crest: true, crestKind: 'crown', es: 0.15, wingT: (X) => X.c },
  phoenix: { len: 9, dep: 7.4, tilt: 45, neck: 3, hr: 5.6, leg: 8, bill: { t: 'hook', l: 0.5 }, billCol: () => '#f4c43a', tail: { t: 'long', l: 1.5 }, crest: true, es: 0.15, legCol: () => '#f4a43a', wingT: (X) => X.c, tailT: (X) => X.b,
    extra: (c) => { if (c.pose !== 'sleep' && c.m !== 'plain') { const r = GART.rng('phx' + c.seed); for (let i = 0; i < 6; i++) c.parts.fx.push(_pF(_pE(c.cx - 14 - r() * 14, c.cy + 6 + r() * 16, 0.9, 1.4), i % 2 ? '#f4d24a' : '#f27a3a', 0.85)); } } },
  bat: { len: 6.6, dep: 7, tilt: 70, neck: 0, hr: 5.4, leg: 2, bill: { t: 'cone', l: 0.15 }, billCol: (X) => X.c[0], tail: { t: 'short', l: 0.1 }, es: 0.16, legCol: (X) => X.c[0], flap: 'beat',
    extra: (c) => { const { parts, hx, hy, hr, X } = c; parts.head.unshift(_pF(_pP`M${hx - hr * 0.7} ${hy - hr * 0.4}L${hx - hr * 0.9} ${hy - hr * 1.9}L${hx - hr * 0.05} ${hy - hr * 0.8}z`, X.c[1]), _pF(_pP`M${hx - hr * 0.1} ${hy - hr * 0.6}L${hx + hr * 0.1} ${hy - hr * 1.9}L${hx + hr * 0.55} ${hy - hr * 0.65}z`, X.c[0]));
      const ax = c.cx, ay = c.cy - c.dep * 0.4; const w = (dx, k, out, T) => { const d = _pP`M${ax + dx} ${ay}L${ax - 16 * k + dx} ${ay - 12 * k}Q${ax - 15 * k + dx} ${ay - 4} ${ax - 18 * k + dx} ${ay + 4 * k}Q${ax - 12 * k + dx} ${ay + 2} ${ax - 12 * k + dx} ${ay + 8 * k}Q${ax - 6 + dx} ${ay + 4} ${ax + dx} ${ay + 6}z`; out.push(_pF(d, T[1]), _pF(d, T[0], 0.9, _ppLitM(ax, ay, 0.86, 0.5, 0.5))); };
      if (c.pose !== 'sleep') { w(3, 0.85, parts.wingB, [X.c[1], X.c[3]]); w(0, 1, parts.wingN, X.c); }
      if (c.m !== 'nofang' && c.pose !== 'sleep') parts.head.push(_pF(_pP`M${hx + hr * 0.75} ${hy + hr * 0.35}l0.4 1.4l0.5 -1.4z`, '#ffffff')); } },
};

/* ---------- the ones of their own ---------- */
function _ppOwn(fn) { return fn; }
/** A result with the rig's pivots (no legs to swing: the body bobs, the head tilts). */
function _ppPack(parts, o) {
  return { parts, order: _PP_ORDER.slice(), piv: Object.assign({ head: [o.hx, o.hy + 3], eyes: [o.ex, o.ey], paw: [o.hx, 88], legsN: [45, 84], legsF: [48, 84], legsG: null, tail: [30, 80], ears: [o.hx, o.hy - 4], wingB: o.wing || [45, 70], wingN: o.wing || [45, 70], body: [50, 90] }, o.piv || {}),
    acc: { hc: [o.hx, o.hy, o.hr], neck: o.neck || { x: o.hx - o.hr * 0.2, y: o.hy + o.hr * 0.9, w: o.hr, rot: -8 }, top: [o.hx - o.hr * 0.1, o.hy - o.hr * 0.85, o.hr * 1.15, -6], eyes: [o.ex, o.ex, o.ey, 1.8], ear: [o.hx - o.hr * 0.4, o.hy - o.hr * 0.6, o.hr * 0.26] },
    top: Math.min(o.top, 20), flap: o.flap || null, long: o.long };
}
const _PP_OWN = {
  tortoise(pet, pose, mood, X) {
    const P = _ppParts(), sleep = pose === 'sleep', A = X.a, B = X.b, C = X.c, m = pet.marks || 'plain', G = _PP_G;
    const skin = _ptTone(_ptMix(X.c[0], '#8a9a5a', 0.5)), cx = 45, cy = G - 13;
    if (!sleep) for (const [x, far, out] of [[33, 1, P.legsF], [56, 1, P.legsG], [31, 0, P.legsN], [54, 0, P.paw]]) { const T = far ? [skin[1], skin[3]] : skin; _ppLimb(out, [[x + far * 3, cy + 4], [x + far * 3 + 0.5, G - 1]], 5, T); }
    const shell = _pP`M${cx - 18} ${cy + 6}C${cx - 18} ${cy - 10} ${cx - 8} ${cy - 16} ${cx + 2} ${cy - 16}C${cx + 14} ${cy - 16} ${cx + 20} ${cy - 6} ${cx + 19} ${cy + 6}z`;
    _ppMass(P.body, shell, A, cx, cy, { k: 0.9, up: 1.6, hi: _pE(cx - 4, cy - 12, 9, 2.4) });
    P.body.push(_pF(_pP`M${cx - 19} ${cy + 5}L${cx + 20} ${cy + 5}L${cx + 19} ${cy + 8}L${cx - 18} ${cy + 8}z`, B[1]));
    const sc = [[cx - 9, cy - 4], [cx + 1, cy - 9], [cx + 10, cy - 3], [cx, cy + 1], [cx - 13, cy + 2], [cx + 13, cy + 3]];
    for (const [x, y] of sc) { P.body.push(_pF(_ptStar(x, y, 4.6, 4.0, 6), C[1], 0.5), _pF(_ptStar(x - 0.4, y - 0.5, 3.6, 3.2, 6), m === 'rings' ? C[0] : A[2], 0.55)); if (m === 'spots') P.body.push(_pF(_pC(x, y, 1.2), B[0], 0.9)); if (m === 'rings') P.body.push(_pL(_ptStar(x, y, 2.4, 2.1, 6), A[3], 0.5, 0.6)); }
    P.tail.push(_pF(_pP`M${cx - 18} ${cy + 3}l-4 2l4 1.4z`, skin[0]));
    const hx = sleep ? cx + 19 : cx + 25, hy = sleep ? G - 4 : cy - 3, hr = 4.4;
    if (!sleep) _ppMass(P.neck, _ppTaper([cx + 14, cy + 3], [hx - 2, hy + 1], 5, 6, -1), skin, cx + 20, cy, { k: 0.86 });
    _ppMass(P.head, _pE(hx, hy, hr * 1.2, hr * 0.9), skin, hx, hy, { k: 0.86, up: 0.5 });
    P.head.push(_pL(_pP`M${hx + hr * 1.1} ${hy + 1}q-2 1.4 -4 0.6`, skin[3], 0.5, 0.8));
    _ppEye(P.eyes, hx + 1.6, hy - 1.2, 0.9, mood, X, sleep);
    return _ppPack(P, { hx, hy, hr, ex: hx + 1.6, ey: hy - 1.2, top: cy - 22, long: true, piv: { legsN: [31, cy + 4], paw: [54, cy + 4], legsF: [36, cy + 3], legsG: [59, cy + 3] } });
  },
  hedgehog(pet, pose, mood, X) {
    const S = { L: 12, D: 7, leg: 3, lw: 2.4, hr: 5, sl: 4, sd: 2.4, ear: { t: 'tiny', s: 1 }, tail: { t: 'none' }, neck: [0.5, 20, 6], nose: '#2a2224', faceT: (X2) => X2.b, muzzle: false, noFur: true, legT: (X2) => X2.b,
      extra: (c) => _ppSpines(c, 'quills'), headExtra: (c) => { if (c.m === 'mask') c.H.push(_pF(_pE(c.ex, c.ey + 0.4, c.er * 3, c.er * 2), c.C[1], 0.7)); } };
    return _ppQuad(pet, pose, mood, Object.assign({}, X, { a: X.b }), S);
  },
  axolotl(pet, pose, mood, X) {
    const S = { L: 15, D: 5, leg: 4, lw: 2, hr: 6, sl: 1.6, sd: 3.4, hw: 1.1, ear: { t: 'none' }, tail: { t: 'flat', s: 1.1 }, neck: [0.5, 10, 5.6], nose: '#2a2224', noseKind: 'none', muzzle: false, noFur: true, long: true, es: 0.1,
      extra: (c) => { if (c.m !== 'plain') { const r = GART.rng('axo' + c.seed), b = c.body; for (let i = 0; i < 12; i++) { const x = c.pose === 'walk' ? b.bx + (r() - 0.5) * b.L * 1.6 : c.pose === 'sit' ? b.hcx + (r() - 0.3) * 10 : b.cx + (r() - 0.5) * b.rx * 1.4; const y = c.pose === 'walk' ? b.by + (r() - 0.6) * b.D : c.pose === 'sit' ? b.hcy - r() * 6 : b.cy - r() * b.ry * 0.6; c.parts.body.push(_pF(_pC(x, y, c.m === 'freckles' ? 0.5 : 0.8), c.X.c[0], 0.75)); } } },
      headExtra: (c) => { for (let i = 0; i < 3; i++) { const a = -0.6 - i * 0.55, x0 = c.hx - c.hr * 0.6, y0 = c.hy - c.hr * 0.2 + i * 1.6; const d = _pP`M${x0} ${y0}q${Math.cos(a + Math.PI) * 4} ${Math.sin(a) * 4} ${Math.cos(a + Math.PI) * 6.4} ${Math.sin(a) * 6 - 1}`; c.EA.push(_pL(d, c.X.c[1], 1.6), _pL(d, c.X.c[0], 0.9)); for (let j = 1; j < 4; j++) c.EA.push(_pL(_pP`M${x0 + Math.cos(a + Math.PI) * 1.6 * j} ${y0 + Math.sin(a) * 1.5 * j}l-0.4 -1.2`, c.X.c[0], 0.5, 0.8)); }
        c.H.push(_pL(_pP`M${c.hx + c.hr * 0.4} ${c.hy + c.hr * 0.45}q${c.hr * 0.5} ${c.hr * 0.2} ${c.hr * 0.9} -${c.hr * 0.1}`, c.X.a[3], 0.6, 0.7)); } };
    return _ppQuad(pet, pose, mood, X, S);
  },
  frog(pet, pose, mood, X) {
    const P = _ppParts(), A = X.a, B = X.b, C = X.c, G = _PP_G, sleep = pose === 'sleep', m = pet.marks || 'plain';
    const cx = 45, cy = sleep ? G - 8 : G - 11;
    // the folded hind leg, the body sloping up to the head, the fore leg propping it
    const thigh = _pP`M${cx - 12} ${G - 1}C${cx - 16} ${G - 10} ${cx - 6} ${G - 14} ${cx} ${G - 8}C${cx + 2} ${G - 4} ${cx - 2} ${G - 0.6} ${cx - 6} ${G - 0.6}z`;
    const body = sleep ? _pP`M${cx - 15} ${G - 1}C${cx - 16} ${G - 14} ${cx + 10} ${G - 18} ${cx + 16} ${G - 6}C${cx + 17} ${G - 1} ${cx + 12} ${G - 0.6} ${cx} ${G - 0.6}z`
      : _pP`M${cx - 15} ${G - 3}C${cx - 14} ${G - 16} ${cx + 4} ${G - 26} ${cx + 14} ${G - 22}C${cx + 20} ${G - 19} ${cx + 18} ${G - 10} ${cx + 12} ${G - 7}C${cx + 4} ${G - 2} ${cx - 8} ${G - 1} ${cx - 15} ${G - 3}z`;
    _ppMass(P.body, body, A, cx, cy, { k: 0.9, up: 1.5, hi: _pE(cx + 2, G - 20, 7, 2) });
    P.body.push(_pF(_pP`M${cx - 6} ${G - 2}C${cx + 4} ${G - 3} ${cx + 12} ${G - 6} ${cx + 15} ${G - 11}C${cx + 14} ${G - 6} ${cx + 6} ${G - 1} ${cx - 6} ${G - 1}z`, B[0], 0.9));
    if (m === 'spots') { const r = GART.rng('frog' + pet.coat); for (let i = 0; i < 7; i++) P.body.push(_pF(_pE(cx - 10 + r() * 20, G - 8 - r() * 12, 1.4, 1), C[0], 0.85)); }
    if (m === 'stripe') P.body.push(_pL(_pP`M${cx - 13} ${G - 10}C${cx - 6} ${G - 18} ${cx + 4} ${G - 22} ${cx + 12} ${G - 21}`, B[0], 1.4, 0.9));
    _ppMass(P.legsN, thigh, A, cx - 6, G - 6, { k: 0.86, up: 1 });
    P.legsN.push(_pF(_pP`M${cx - 6} ${G - 0.6}L${cx + 4} ${G - 0.6}L${cx + 6} ${G}L${cx - 6} ${G}z`, A[1]));
    if (!sleep) { _ppLimb(P.paw, [[cx + 10, G - 10], [cx + 12, G - 1]], 2.4, A); P.paw.push(_pL(_pP`M${cx + 10} ${G - 0.4}l4 0M${cx + 12} ${G - 0.6}l1.4 -1`, A[1], 0.8)); _ppLimb(P.legsG, [[cx + 13, G - 11], [cx + 15, G - 1.4]], 2, [A[1], A[3]]); }
    const hx = cx + 14, hy = sleep ? G - 10 : G - 22, hr = 6;
    P.head.push(_pL(_pP`M${hx - 1} ${hy + 3}Q${hx + 4} ${hy + 4.6} ${hx + 7} ${hy + 2}`, A[3], 0.7, 0.8));
    if (mood.mouth === 'open' && !sleep) P.head.push(_pF(_pP`M${hx} ${hy + 3}Q${hx + 4} ${hy + 6} ${hx + 7} ${hy + 2}z`, '#a84a5a', 0.9));
    P.eyes.push(_pF(_pC(hx - 1.4, hy - 3.6, 3), A[1]), _pF(_pC(hx - 1.6, hy - 4, 2.5), A[0]));
    _ppEye(P.eyes, hx - 1, hy - 4, 1.6, mood, Object.assign({}, X, { eye: '#d8b84a' }), sleep);
    return _ppPack(P, { hx, hy, hr, ex: hx - 1, ey: hy - 4, top: hy - 8, piv: { legsN: [cx - 6, G - 8], paw: [cx + 10, G - 10] } });
  },
  snail(pet, pose, mood, X) {
    const P = _ppParts(), A = X.a, B = X.b, C = X.c, G = _PP_G, m = pet.marks || 'plain', sleep = pose === 'sleep';
    const skin = _ptTone(X.b[0]);
    const foot = _pP`M${22} ${G - 0.5}C${24} ${G - 6} ${50} ${G - 7} ${62} ${G - 6}C${68} ${G - 6} ${70} ${G - 12} ${70} ${G - (sleep ? 6 : 16)}C${74} ${G - (sleep ? 6 : 17)} ${77} ${G - 12} ${75} ${G - 3}C${74} ${G} ${60} ${G} ${22} ${G - 0.5}z`;
    _ppMass(P.body, foot, skin, 50, G - 4, { k: 0.9, up: 0.8 });
    const sx = 44, sy = G - 17, R = 15;
    _ppMass(P.body, _pC(sx, sy, R), A, sx, sy, { k: 0.88, up: 1.6, hi: _pE(sx - 5, sy - 9, 6, 2) });
    let sp = `M${sx} ${sy}`; for (let t = 0; t < 14.5; t += 0.4) { const r = R * 0.9 * t / 14.5; sp += `L${_ptR(sx + Math.cos(t) * r)} ${_ptR(sy + Math.sin(t) * r)}`; }
    P.body.push(_pL(sp, A[3], m === 'bold' ? 2.2 : 1.3, 0.75), Object.assign(_pL(sp, A[2], 0.6, 0.5, [1, 0, 0, 1, -0.6, -0.6]), { detail: true }));
    if (m === 'dots') { for (let i = 0; i < 8; i++) { const t = i * 0.8; P.body.push(_pF(_pC(sx + Math.cos(t) * R * 0.6, sy + Math.sin(t) * R * 0.6, 1.2), C[0], 0.85)); } }
    const hx = 72, hy = sleep ? G - 5 : G - 15, hr = 4;
    if (!sleep) for (const [dx, far] of [[-2, 1], [1.4, 0]]) { const d = _pP`M${hx + dx} ${hy - 2}Q${hx + dx - 1} ${hy - 8} ${hx + dx + 2} ${hy - 11}`; P.ears.push(_pL(d, far ? skin[1] : skin[0], 1.2), _pF(_pC(hx + dx + 2, hy - 11, 1.3), skin[1])); }
    _ppEye(P.eyes, hx + 3.4, hy - 11, sleep ? 0.8 : 0.85, mood, X, sleep);
    P.head.push(_pL(_pP`M${hx + 1} ${hy + 2}q2 1 3.6 0`, skin[3], 0.5, 0.8));
    return _ppPack(P, { hx, hy, hr, ex: hx + 3.4, ey: hy - 11, top: sy - R - 2, long: true });
  },
  ladybird(pet, pose, mood, X) {
    const P = _ppParts(), A = X.a, C = X.c, G = _PP_G, m = pet.marks || 'five', sleep = pose === 'sleep';
    const cx = 46, cy = G - 12, ink = _ptTone('#2a2426');
    for (const [x, far] of [[36, 1], [46, 1], [56, 1], [34, 0], [44, 0], [54, 0]]) { const out = far ? P.legsF : x < 40 ? P.legsN : x < 50 ? P.paw : P.legsG; out.push(_pL(_pP`M${x + far * 2} ${cy + 4}l${-1.6} ${5}l${1.4} ${G - cy - 9.4}`, far ? ink[1] : ink[0], 1.1)); }
    const shell = _pP`M${cx - 17} ${cy + 5}C${cx - 18} ${cy - 10} ${cx - 4} ${cy - 15} ${cx + 6} ${cy - 13}C${cx + 15} ${cy - 11} ${cx + 17} ${cy - 2} ${cx + 15} ${cy + 5}z`;
    P.body.push(_pF(_pP`M${cx - 16} ${cy + 4}L${cx + 15} ${cy + 4}L${cx + 14} ${cy + 7.6}L${cx - 15} ${cy + 7.6}z`, ink[1]));
    _ppMass(P.body, shell, A, cx, cy, { k: 0.9, up: 1.4, hi: _pE(cx - 4, cy - 10, 7, 2.2) });
    P.body.push(_pL(_pP`M${cx + 6} ${cy - 13}Q${cx - 2} ${cy - 4} ${cx - 2} ${cy + 5}`, A[3], 0.7, 0.7));
    const spots = m === 'two' ? [[cx - 6, cy - 4, 3.4]] : m === 'many' ? [[cx - 10, cy - 2, 1.8], [cx - 4, cy - 8, 1.8], [cx + 4, cy - 8, 1.8], [cx - 6, cy + 1, 1.6], [cx + 3, cy - 2, 1.8], [cx + 10, cy - 3, 1.6], [cx - 12, cy + 3, 1.4]] : [[cx - 9, cy - 3, 2.6], [cx - 1, cy - 7, 2.4], [cx + 7, cy - 3, 2.2]];
    for (const [x, y, r] of spots) P.body.push(_pF(_pE(x, y, r, r * 0.86), C[0], 0.95));
    const hx = cx + 17, hy = cy + 1, hr = 4.4;
    _ppMass(P.head, _pE(hx, hy, hr * 1.05, hr * 0.85), ink, hx, hy, { k: 0.86 });
    P.head.push(_pF(_pE(hx - 1.6, hy - 2.6, 1.6, 0.9), '#f4f0ea', 0.9));
    if (!sleep) P.ears.push(_pL(_pP`M${hx} ${hy - 3}q2 -5 5 -5`, ink[0], 0.7), _pF(_pC(hx + 5, hy - 8, 0.8), ink[0]));
    _ppEye(P.eyes, hx + 1.8, hy - 0.6, 1.0, mood, X, sleep);
    return _ppPack(P, { hx, hy, hr, ex: hx + 1.8, ey: hy - 0.6, top: cy - 16 });
  },
  bee(pet, pose, mood, X) {
    const P = _ppParts(), A = X.a, C = X.c, G = _PP_G, sleep = pose === 'sleep', m = pet.marks || 'plain';
    const cx = 46, cy = sleep ? G - 9 : G - 22, ink = _ptTone('#2a2426');
    const abd = _pE(cx - 6, cy + 1, 12, 9);
    _ppMass(P.body, abd, A, cx - 6, cy, { k: 0.88, up: 1.4 });
    for (const x of [-8, -1]) P.body.push(_pF(_pP`M${cx + x - 2.4} ${cy - 8.4}Q${cx + x - 4} ${cy + 1} ${cx + x - 2.4} ${cy + 9.6}L${cx + x + 1.4} ${cy + 9.8}Q${cx + x} ${cy + 1} ${cx + x + 1.4} ${cy - 8.6}z`, C[0], 0.92));
    if (m === 'tail') P.body.push(_pF(_pE(cx - 16, cy + 1, 3, 5), '#f4ece0', 0.95));
    _ppFur(P.body, 'bee' + pet.coat, cx - 6, cy - 3, 10, 5, 22, 1.6, 0.2, A[2], 0.5, 0.5);
    _ppMass(P.body, _pC(cx + 8, cy - 1, 6.4), A, cx + 8, cy - 1, { k: 0.86 });
    _ppFur(P.body, 'beet' + pet.coat, cx + 8, cy - 2, 5, 4, 14, 1.6, 0.3, A[2], 0.5, 0.5);
    if (!sleep) for (const [x, far] of [[cx + 4, 1], [cx + 8, 0], [cx + 12, 0]]) (far ? P.legsF : P.legsN).push(_pL(_pP`M${x} ${cy + 4}l-1.6 4l1 4.4`, far ? ink[1] : ink[0], 0.9));   // hovering: the legs dangle
    const wing = (dx, out, op) => out.push(_pF(_pP`M${cx + 4 + dx} ${cy - 6}C${cx - 2 + dx} ${cy - 22} ${cx - 16 + dx} ${cy - 20} ${cx - 12 + dx} ${cy - 10}C${cx - 8 + dx} ${cy - 6} ${cx} ${cy - 5} ${cx + 4 + dx} ${cy - 6}z`, '#e8f2f8', op), _pL(_pP`M${cx + 3 + dx} ${cy - 6.4}L${cx - 10 + dx} ${cy - 14}`, '#a8b8c8', 0.4, 0.7));
    wing(3, P.wingB, 0.55); wing(0, P.wingN, 0.75);
    const hx = cx + 17, hy = cy, hr = 4.6;
    _ppMass(P.head, _pC(hx, hy, hr), ink, hx, hy, { k: 0.86 });
    P.ears.push(_pL(_pP`M${hx - 1} ${hy - 4}q1 -5 4 -6`, ink[0], 0.7));
    _ppEye(P.eyes, hx + 1.6, hy - 0.8, 1.1, mood, X, sleep);
    return _ppPack(P, { hx, hy, hr, ex: hx + 1.6, ey: hy - 0.8, top: cy - 22, flap: 'buzz', wing: [cx + 3, cy - 6], piv: { body: [50, 90] } });
  },
  butterfly(pet, pose, mood, X) {
    const P = _ppParts(), A = X.a, B = X.b, C = X.c, G = _PP_G, sleep = pose === 'sleep', m = pet.marks || 'plain';
    const cx = 50, cy = sleep ? G - 4 : G - 6, ink = _ptTone('#2e2a2c');   // perched on the ground, wings up
    // wings raised over the back, side on, the far pair a shade behind (the kit's butterflies sit with wings up)
    const wing = (dx, out, far) => {
      const T = far ? [A[1], A[3], A[1], A[3]] : A;
      const fw = _pP`M${cx + dx} ${cy}C${cx - 4 + dx} ${cy - 14} ${cx - 2 + dx} ${cy - 26} ${cx + 10 + dx} ${cy - 27}C${cx + 16 + dx} ${cy - 22} ${cx + 10 + dx} ${cy - 8} ${cx + 2 + dx} ${cy}z`;
      const hw = _pP`M${cx + dx} ${cy + 1}C${cx - 12 + dx} ${cy - 4} ${cx - 16 + dx} ${cy - 14} ${cx - 10 + dx} ${cy - 18}C${cx - 4 + dx} ${cy - 18} ${cx + 1 + dx} ${cy - 6} ${cx + 1 + dx} ${cy + 1}z`;
      out.push(_pF(hw, T[1]), _pF(hw, T[0], 1, _ppLitM(cx - 6 + dx, cy - 8, 0.86, 0.5, 0.4)), _pF(fw, T[1]), _pF(fw, T[0], 1, _ppLitM(cx + 6 + dx, cy - 14, 0.86, 0.5, 0.4)));
      if (!far) {
        out.push(_pL(_pP`M${cx + 10 + dx} ${cy - 27}C${cx + 16 + dx} ${cy - 22} ${cx + 10 + dx} ${cy - 8} ${cx + 2 + dx} ${cy}`, C[0], 1.6, 0.9), _pL(_pP`M${cx - 10 + dx} ${cy - 18}C${cx - 16 + dx} ${cy - 14} ${cx - 12 + dx} ${cy - 4} ${cx + dx} ${cy + 1}`, C[0], 1.4, 0.9));
        if (m === 'eyes') out.push(_pF(_pC(cx + 8 + dx, cy - 20, 2.4), C[0]), _pF(_pC(cx + 8 + dx, cy - 20, 1.4), B[0]), _pF(_pC(cx - 8 + dx, cy - 11, 2), C[0]), _pF(_pC(cx - 8 + dx, cy - 11, 1.1), B[0]));
        else if (m === 'stripes') out.push(_pL(_pP`M${cx + 2 + dx} ${cy - 6}L${cx + 8 + dx} ${cy - 22}M${cx - 2 + dx} ${cy - 4}L${cx - 10 + dx} ${cy - 13}`, C[0], 1.2, 0.85));
        else out.push(_pF(_pE(cx + 6 + dx, cy - 18, 2.2, 3.6), B[0], 0.85), _pF(_pC(cx - 7 + dx, cy - 10, 1.8), B[0], 0.8));
        for (let i = 0; i < 3; i++) out.push(_pF(_pC(cx + 13 - i * 2.4 + dx, cy - 24 + i * 5, 0.6), '#ffffff', 0.85));
      }
    };
    wing(3, P.wingB, true); wing(0, P.wingN, false);
    P.body.push(_pF(_pE(cx - 4, cy + 1.6, 7, 1.8), ink[1]), _pF(_pE(cx - 4.2, cy + 1.2, 6.4, 1.3), ink[0]));
    _ppFur(P.body, 'bfb' + pet.coat, cx - 4, cy + 1, 5, 1, 8, 1, 0.2, ink[2], 0.4, 0.5);
    if (!sleep) for (const [x, far] of [[cx - 2, 1], [cx + 1, 0], [cx + 3, 0]]) (far ? P.legsF : P.legsN).push(_pL(_pP`M${x} ${cy + 2}L${x + 1} ${G - 0.6}`, ink[far ? 1 : 0], 0.5));
    const hx = cx + 4.4, hy = cy, hr = 2.2;
    P.head.push(_pF(_pC(hx, hy, hr), ink[0]));
    P.ears.push(_pL(_pP`M${hx} ${hy - 1.4}q3 -6 7 -7M${hx - 0.4} ${hy - 1.6}q1 -6 5 -8`, ink[0], 0.45), _pF(_pC(hx + 7, hy - 8.4, 0.7), ink[0]), _pF(_pC(hx + 4.6, hy - 9.6, 0.7), ink[0]));
    _ppEye(P.eyes, hx + 0.8, hy - 0.4, 0.8, mood, X, sleep);
    return _ppPack(P, { hx, hy, hr: 4, ex: hx + 0.8, ey: hy - 0.4, top: cy - 28, flap: 'fold', wing: [cx, cy] });
  },
  crab(pet, pose, mood, X) {
    const P = _ppParts(), A = X.a, B = X.b, C = X.c, G = _PP_G, sleep = pose === 'sleep', m = pet.marks || 'plain';
    const cx = 48, cy = G - (sleep ? 7 : 13);
    if (!sleep) for (let i = 0; i < 4; i++) { const x = cx - 8 + i * 4; P.legsF.push(_pL(_pP`M${x + 2} ${cy + 2}l-3 ${-3}l-2 ${G - cy + 1}`, A[1], 1.4)); P.legsN.push(_pL(_pP`M${x} ${cy + 3}l-4 ${-2}l-2 ${G - cy - 1}`, A[0], 1.6)); }
    const shell = _pP`M${cx - 15} ${cy + 3}C${cx - 16} ${cy - 8} ${cx + 14} ${cy - 9} ${cx + 15} ${cy + 3}C${cx + 8} ${cy + 6} ${cx - 8} ${cy + 6} ${cx - 15} ${cy + 3}z`;
    _ppMass(P.body, shell, A, cx, cy, { k: 0.9, up: 1.4, hi: _pE(cx - 3, cy - 5, 7, 1.6) });
    P.body.push(_pF(_pP`M${cx - 14} ${cy + 3}C${cx - 6} ${cy + 6} ${cx + 6} ${cy + 6} ${cx + 14} ${cy + 3}L${cx + 12} ${cy + 5}C${cx + 4} ${cy + 8} ${cx - 4} ${cy + 8} ${cx - 12} ${cy + 5}z`, B[0], 0.9));
    if (m === 'spots') for (let i = 0; i < 5; i++) P.body.push(_pF(_pC(cx - 8 + i * 4, cy - 3 + (i % 2) * 2, 1), C[0], 0.8));
    if (m === 'shell') { P.body.push(_pF(_pP`M${cx - 10} ${cy - 5}Q${cx} ${cy - 22} ${cx + 10} ${cy - 5}z`, '#f2e2d0'), _pL(_pP`M${cx} ${cy - 5}L${cx} ${cy - 16}M${cx - 4} ${cy - 5}L${cx - 2} ${cy - 15}M${cx + 4} ${cy - 5}L${cx + 2} ${cy - 15}`, '#c8a890', 0.6)); }
    const big = m === 'bigclaw' ? 1.4 : 1;
    const claw = (x, y, k, out, T) => { out.push(_pL(_pP`M${x - 6} ${y + 2}L${x} ${y - 3}`, T[0], 2.2 * k)); const d = _pP`M${x - 1} ${y - 3}C${x + 2 * k} ${y - 9 * k} ${x + 8 * k} ${y - 8 * k} ${x + 7 * k} ${y - 3}L${x + 3 * k} ${y - 4 * k}L${x + 5 * k} ${y - 0.4}C${x + 2 * k} ${y + 1} ${x - 1} ${y} ${x - 1} ${y - 3}z`; out.push(_pF(d, T[1]), _pF(d, T[0], 1, _ppLitM(x + 3, y - 4, 0.86, 0.5, 0.3))); };
    claw(cx + 14, cy - 2, 0.9, P.legsG, [A[1], A[3], A[1], A[3]]); claw(cx + 12, cy, big, P.paw, A);
    const hx = cx + 6, hy = cy - 8, hr = 3;
    for (const [dx, far] of [[-3, 1], [0, 0]]) P.ears.push(_pL(_pP`M${hx + dx} ${cy - 5}L${hx + dx + 0.6} ${hy - 1}`, far ? A[1] : A[0], 1.1), _pF(_pC(hx + dx + 0.6, hy - 2, 1.5), '#f4f0ea'));
    _ppEye(P.eyes, hx + 0.8, hy - 2, 1.0, mood, X, sleep);
    P.head.push(_pL(_pP`M${cx + 9} ${cy - 1}q2 1 4 0`, A[3], 0.5, 0.8));
    return _ppPack(P, { hx, hy, hr, ex: hx + 0.8, ey: hy - 2, top: hy - 6, piv: { paw: [cx + 8, cy + 1], legsG: [cx + 9, cy] } });
  },
  octopus(pet, pose, mood, X) {
    const P = _ppParts(), A = X.a, B = X.b, C = X.c, G = _PP_G, sleep = pose === 'sleep', m = pet.marks || 'plain';
    const cx = 50, cy = G - (sleep ? 12 : 22);
    for (let i = 0; i < 6; i++) { const x = cx - 12 + i * 4.8, far = i % 2 === 0, out = far ? P.legsF : (i < 3 ? P.legsN : P.paw); const d = _pP`M${x} ${cy + 5}C${x - 2} ${cy + 12} ${x + 4} ${G - 6} ${x + (i < 3 ? -5 : 5)} ${G - 1.4}`; out.push(_pL(d, far ? A[1] : A[0], 3.4), _pL(d, B[0], 1.0, 0.5, [1, 0, 0, 1, 0.6, 0.4])); }
    const mantle = _pP`M${cx - 13} ${cy + 6}C${cx - 16} ${cy - 10} ${cx - 8} ${cy - 22} ${cx + 2} ${cy - 21}C${cx + 12} ${cy - 20} ${cx + 15} ${cy - 6} ${cx + 13} ${cy + 6}z`;
    _ppMass(P.body, mantle, A, cx, cy - 6, { k: 0.88, up: 1.6, hi: _pE(cx - 3, cy - 16, 6, 2.4) });
    if (m === 'spots') for (let i = 0; i < 6; i++) P.body.push(_pF(_pC(cx - 8 + (i * 5) % 14, cy - 14 + i * 2.6, 1.3), C[0], 0.8));
    if (m === 'stripes') for (let i = 0; i < 3; i++) P.body.push(_pL(_pP`M${cx - 12 + i} ${cy - 6 - i * 5}Q${cx} ${cy - 8 - i * 5} ${cx + 12 - i} ${cy - 6 - i * 5}`, C[0], 1.2, 0.75));
    const hx = cx + 4, hy = cy, hr = 7;
    _ppEye(P.eyes, hx + 4, hy - 1, 1.4, mood, X, sleep);
    P.head.push(_pL(_pP`M${hx + 6} ${hy + 3}q2 1 4 -0.4`, A[3], 0.6, 0.8));
    return _ppPack(P, { hx, hy, hr, ex: hx + 4, ey: hy - 1, top: cy - 22 });
  },
  robot(pet, pose, mood, X) {
    const P = _ppParts(), A = X.a, B = X.b, C = X.c, G = _PP_G, sleep = pose === 'sleep', m = pet.marks || 'plain';
    const cx = 48, wy = G - 6;
    P.legsF.push(_pF(_pC(cx + 3, wy, 6), '#3a3a40'));
    P.legsN.push(_pF(_pC(cx, wy, 6), '#2a2a30'), _pF(_pC(cx, wy, 3.6), '#8a8e98'), _pF(_pC(cx - 0.6, wy - 0.6, 1.4), '#c8ccd6'));
    const by = wy - 6, body = _pP`M${cx - 10} ${by}L${cx - 9} ${by - 18}Q${cx - 9} ${by - 20} ${cx - 7} ${by - 20}L${cx + 9} ${by - 20}Q${cx + 11} ${by - 20} ${cx + 11} ${by - 18}L${cx + 10} ${by}z`;
    _ppMass(P.body, body, A, cx, by - 10, { k: 0.9, up: 1.2, hi: _pE(cx - 3, by - 17, 6, 1.4) });
    P.body.push(_pF(_pP`M${cx - 4} ${by - 14}h10v8h-10z`, B[0], 0.95), _pF(_pC(cx - 1, by - 10, 1.2), '#5ad06a'), _pF(_pC(cx + 3, by - 10, 1.2), sleep ? '#5a5a60' : '#f2c43a'));
    if (m === 'stripe') P.body.push(_pF(_pP`M${cx - 9.6} ${by - 4}h20v2.4h-20z`, C[0]));
    if (m === 'bolts') for (const [x, y] of [[cx - 7, by - 17], [cx + 8, by - 17], [cx - 7, by - 2], [cx + 8, by - 2]]) P.body.push(_pF(_pC(x, y, 0.8), '#c8ccd6'));
    _ppLimb(P.paw, [[cx + 8, by - 15], [cx + 13, by - 8], [cx + 15, by - 10]], 2, _ptTone('#8a8e98'));
    const hx = cx + 1, hy = by - 27, hr = 6.4;
    const head = _pP`M${hx - 8} ${hy + 5}L${hx - 8} ${hy - 4}Q${hx - 8} ${hy - 6} ${hx - 6} ${hy - 6}L${hx + 7} ${hy - 6}Q${hx + 9} ${hy - 6} ${hx + 9} ${hy - 4}L${hx + 9} ${hy + 5}z`;
    _ppMass(P.head, head, A, hx, hy, { k: 0.9, up: 0.8 });
    P.head.push(_pF(_pP`M${hx - 3} ${hy - 3}h11v6h-11z`, '#2a3a4a'));
    P.ears.push(_pL(_pP`M${hx} ${hy - 6}l0 -5`, '#6a6e78', 0.8), _pF(_pC(hx, hy - 11.6, 1.4), sleep ? '#7a6a6a' : '#e85a5a'));
    if (sleep) P.eyes.push(_pL(_pP`M${hx + 2} ${hy}h2M${hx + 5.4} ${hy}h2`, '#5ac8f2', 0.8));
    else P.eyes.push(_pF(_pE(hx + 3, hy, 1, mood.eyes === 'happy' ? 0.4 : 1.2), '#5ac8f2'), _pF(_pE(hx + 6.4, hy, 1, mood.eyes === 'happy' ? 0.4 : 1.2), '#5ac8f2'));
    return _ppPack(P, { hx, hy, hr, ex: hx + 4.6, ey: hy, top: hy - 12, neck: { x: hx, y: hy + 6, w: 7, rot: 0 } });
  },
  ghost(pet, pose, mood, X) {
    const P = _ppParts(), A = X.a, C = X.c, G = _PP_G, sleep = pose === 'sleep', m = pet.marks || 'plain';
    const cx = 48, top = sleep ? G - 24 : G - 46, bot = sleep ? G - 2 : G - 10;
    const sheet = _pP`M${cx - 14} ${bot}C${cx - 16} ${top + 20} ${cx - 12} ${top} ${cx + 2} ${top}C${cx + 14} ${top} ${cx + 18} ${top + 14} ${cx + 16} ${bot - 2}Q${cx + 13} ${bot + 3} ${cx + 9} ${bot - 1}Q${cx + 5} ${bot + 3} ${cx + 1} ${bot - 0.6}Q${cx - 3} ${bot + 3.4} ${cx - 7} ${bot}Q${cx - 10} ${bot + 4} ${cx - 14} ${bot}z`;
    P.body.push(_pF(sheet, A[1], 0.85), _pF(sheet, A[0], 0.9, _ppLitM(cx, (top + bot) / 2, 0.88, 1.2, 0.6)), _pF(_pE(cx - 3, top + 6, 6, 2.4), '#ffffff', 0.5));
    if (m === 'stripes') for (let i = 0; i < 3; i++) P.body.push(_pL(_pP`M${cx - 14} ${top + 16 + i * 7}Q${cx} ${top + 14 + i * 7} ${cx + 16} ${top + 16 + i * 7}`, C[0], 1.6, 0.5));
    if (m === 'chain') P.body.push(_pL(_pP`M${cx - 10} ${bot - 4}Q${cx} ${bot + 2} ${cx + 12} ${bot - 6}`, '#8a8e98', 1, 0.8, null)), P.body[P.body.length - 1].dash = '1.6 1';
    P.paw.push(_pF(_pP`M${cx + 12} ${top + 18}q6 2 7 7q-4 -2 -7 -3z`, A[0], 0.9));
    const hx = cx + 6, hy = top + 12;
    _ppEye(P.eyes, hx + 3, hy, 1.6, mood, Object.assign({}, X, { eye: null }), sleep);
    if (mood.mouth === 'open' && !sleep) P.head.push(_pF(_pE(hx + 5, hy + 5, 1.4, 1.8), '#3a3440', 0.8));
    return _ppPack(P, { hx, hy, hr: 9, ex: hx + 3, ey: hy, top });
  },
  wisp(pet, pose, mood, X) {
    const P = _ppParts(), A = X.a, B = X.b, G = _PP_G, sleep = pose === 'sleep', m = pet.marks || 'plain';
    const flame = (cx, cy, s, out) => { const d = _pP`M${cx} ${cy + 10 * s}C${cx - 10 * s} ${cy + 10 * s} ${cx - 10 * s} ${cy - 2 * s} ${cx - 4 * s} ${cy - 8 * s}C${cx - 2 * s} ${cy - 4 * s} ${cx} ${cy - 6 * s} ${cx + 1 * s} ${cy - 18 * s}C${cx + 6 * s} ${cy - 10 * s} ${cx + 10 * s} ${cy - 2 * s} ${cx + 8 * s} ${cy + 4 * s}C${cx + 7 * s} ${cy + 9 * s} ${cx + 3 * s} ${cy + 10 * s} ${cx} ${cy + 10 * s}z`; out.push(_pF(d, A[0], 0.55), _pF(d, B[0], 0.85, _ppLitM(cx, cy + 4 * s, 0.7, 0.5, 0)), _pF(_pE(cx, cy + 4 * s, 3.6 * s, 4 * s), '#ffffff', 0.85)); };
    const cy = sleep ? G - 12 : G - 30;
    flame(48, cy, 1.2, P.body); if (m === 'twin') flame(32, cy + 8, 0.7, P.tail);
    if (m === 'sparks') for (let i = 0; i < 5; i++) P.fx.push(_pF(_ptStar(30 + i * 9, cy - 16 + (i % 2) * 8, 1.4, 0.5, 4), B[0], 0.85));
    _ppEye(P.eyes, 51, cy + 4, 1.3, mood, Object.assign({}, X, { eye: null }), sleep);
    return _ppPack(P, { hx: 48, hy: cy + 2, hr: 8, ex: 51, ey: cy + 4, top: cy - 22 });
  },
  cloud(pet, pose, mood, X) {
    const P = _ppParts(), A = X.a, B = X.b, C = X.c, G = _PP_G, sleep = pose === 'sleep', m = pet.marks || 'plain';
    const cy = sleep ? G - 10 : G - 30, cx = 48;
    const puffs = [[cx - 12, cy + 2, 7], [cx - 4, cy - 4, 9], [cx + 7, cy - 2, 8], [cx + 13, cy + 3, 6], [cx, cy + 4, 8]];
    for (const [x, y, r] of puffs) P.body.push(_pF(_pC(x, y, r), A[1]));
    for (const [x, y, r] of puffs) P.body.push(_pF(_pC(x - 0.6, y - 1, r * 0.86), A[0]));
    P.body.push(_pF(_pE(cx - 4, cy - 8, 5, 2), '#ffffff', 0.6));
    if (m === 'rain' && !sleep) for (let i = 0; i < 5; i++) P.fx.push(_pL(_pP`M${cx - 10 + i * 5} ${cy + 12 + (i % 2) * 3}l-0.6 3`, '#7aaee0', 1, 0.8));
    if (m === 'bolt' && !sleep) P.fx.push(_pF(_pP`M${cx + 2} ${cy + 10}l-3 6h3l-2 6l6 -8h-3l2 -4z`, '#f4d24a'));
    if (m === 'rainbow') _ppRainbow.forEach((c, i) => P.tail.push(_pL(_pP`M${cx - 26 + i * 1.6} ${G - 1}Q${cx - 26 + i * 1.6} ${cy - 2} ${cx - 14} ${cy - 2 + i * 1.6}`, c, 1.6, 0.8)));
    const hx = cx + 6, hy = cy;
    _ppEye(P.eyes, hx + 2, hy, 1.3, mood, Object.assign({}, X, { eye: null }), sleep); _ppEye(P.eyes, hx + 7, hy, 1.2, mood, Object.assign({}, X, { eye: null }), sleep);
    if (!sleep) P.head.push(_pL(_pP`M${hx + 3} ${hy + 4}q2 1.4 3.6 0`, C[1], 0.7, 0.8));
    return _ppPack(P, { hx, hy, hr: 9, ex: hx + 4.6, ey: hy, top: cy - 14 });
  },
};
/** The upright ones: yeti, golem, moosh (two legs, arms). */
function _ppUpright(pet, pose, mood, X, S) {
  const P = _ppParts(), A = S.furT ? S.furT(X) : X.a, B = X.b, C = X.c, G = _PP_G, sleep = pose === 'sleep', m = pet.marks || 'plain', seed = pet.species + pet.coat + pose;
  const cx = 48, H = sleep ? S.H * 0.5 : S.H, W = S.W, by = G - S.leg - H * 0.5;
  if (!sleep) {
    _ppLimb(P.legsF, [[cx + 2, by + H * 0.3], [cx + 3, G - 1]], S.lw, [A[1], A[3]]); P.legsF.push(_pF(_pE(cx + 4.4, G - 1.2, S.lw * 0.8, S.lw * 0.4), S.footCol ? S.footCol(X) : A[3]));
    _ppLimb(P.legsN, [[cx - 2, by + H * 0.3], [cx - 2, G - 1]], S.lw, A); P.legsN.push(_pF(_pE(cx - 0.4, G - 1.2, S.lw * 0.85, S.lw * 0.45), S.footCol ? S.footCol(X)[0] : A[1]));
  }
  const body = sleep ? _pP`M${cx - W} ${G - 0.5}C${cx - W * 1.1} ${G - H * 1.3} ${cx + W * 1.1} ${G - H * 1.3} ${cx + W} ${G - 0.5}z` : S.shape(cx, by, W, H);
  _ppMass(P.body, body, A, cx, by, { k: 0.9, up: 1.6, hi: _pE(cx - W * 0.3, by - H * 0.35, W * 0.4, H * 0.08) });
  if (S.fur) _ppFur(P.body, seed + 'u', cx, by, W * 0.8, H * 0.4, 30, 3.2, 3.0, A[2], 0.7, 0.45);
  if (S.bodyExtra) S.bodyExtra({ P, A, B, C, X, m, cx, by, W, H, sleep, seed });
  if (!sleep) { _ppLimb(P.wingB, [[cx + W * 0.2, by - H * 0.25], [cx + W * 0.5, by + H * 0.15]], S.aw, [A[1], A[3]]); _ppLimb(P.paw, [[cx - W * 0.3, by - H * 0.25], [cx + W * 0.4, by + H * 0.22]], S.aw, A); }
  const hx = cx + W * 0.25, hy = sleep ? G - H - 4 : by - H * 0.5 - S.hr * 0.6, hr = S.hr;
  if (S.head) S.head({ P, A, B, C, X, m, hx, hy, hr, sleep, mood, seed });
  else _ppMass(P.head, _pE(hx, hy, hr * 1.05, hr), A, hx, hy, { k: 0.88 });
  const ex = hx + hr * 0.45, ey = hy - hr * 0.1;
  _ppEye(P.eyes, ex, ey, Math.max(1, hr * 0.14), mood, X, sleep);
  if (!sleep && mood.mouth === 'open') P.head.push(_pF(_pE(hx + hr * 0.6, hy + hr * 0.45, hr * 0.18, hr * 0.14), '#5a2a30', 0.85));
  return _ppPack(P, { hx, hy, hr, ex, ey, top: hy - hr * (S.topK || 1.4), piv: { legsN: [cx - 2, by + H * 0.3], legsF: [cx + 2, by + H * 0.3], paw: [cx - W * 0.3, by - H * 0.25], wingB: [cx + W * 0.2, by - H * 0.25], wingN: [cx, by] } });
}
const _PP_UPRIGHT = {
  yeti: { H: 34, W: 13, leg: 9, lw: 5, aw: 5, hr: 7, fur: true, footCol: () => _ptTone('#6a7a8a'), shape: (cx, by, W, H) => _pP`M${cx - W} ${by + H * 0.4}C${cx - W * 1.2} ${by - H * 0.4} ${cx - W * 0.5} ${by - H * 0.62} ${cx} ${by - H * 0.6}C${cx + W * 0.6} ${by - H * 0.6} ${cx + W * 1.15} ${by - H * 0.3} ${cx + W} ${by + H * 0.4}Q${cx} ${by + H * 0.55} ${cx - W} ${by + H * 0.4}z`,
    bodyExtra: (c) => { if (c.m === 'belly') c.P.body.push(_pF(_pE(c.cx + c.W * 0.35, c.by + 2, c.W * 0.45, c.H * 0.3), c.B[0], 0.9)); },
    head: (c) => { _ppMass(c.P.head, _pE(c.hx, c.hy, c.hr * 1.05, c.hr), c.A, c.hx, c.hy, { k: 0.88 }); c.P.head.push(_pF(_pE(c.hx + c.hr * 0.45, c.hy + c.hr * 0.1, c.hr * 0.55, c.hr * 0.6), _ptTone('#8aa0b8')[0])); if (c.m !== 'nohorn') _ppHornX({ H: c.P.head, hx: c.hx, hy: c.hy, hr: c.hr }, _ptTone('#e8e0d0'), 'horns'); } },
  golem: { H: 32, W: 13, leg: 9, lw: 6, aw: 6, hr: 6.4, topK: 1.2, shape: (cx, by, W, H) => _pP`M${cx - W} ${by + H * 0.45}L${cx - W * 1.1} ${by - H * 0.3}L${cx - W * 0.6} ${by - H * 0.6}L${cx + W * 0.7} ${by - H * 0.58}L${cx + W * 1.1} ${by - H * 0.2}L${cx + W} ${by + H * 0.45}z`,
    bodyExtra: (c) => { c.P.body.push(_pL(_pP`M${c.cx - c.W * 0.6} ${c.by - c.H * 0.2}l5 3l-2 6M${c.cx + c.W * 0.4} ${c.by}l-4 4`, c.A[3], 0.7, 0.6)); if (c.m !== 'bare') { const mo = '#6a9a4a'; c.P.body.push(_pF(_pE(c.cx - c.W * 0.4, c.by - c.H * 0.56, 6, 2), mo, 0.95)); if (c.m === 'sprout') c.P.body.push(_pL(_pP`M${c.cx - c.W * 0.4} ${c.by - c.H * 0.6}q0 -4 2 -6`, mo, 0.8), _pF(_pE(c.cx - c.W * 0.4 + 2.4, c.by - c.H * 0.6 - 6, 1.6, 0.8), '#8aca5a')); if (c.m === 'flower') c.P.body.push(_pF(_ptStar(c.cx - c.W * 0.3, c.by - c.H * 0.62, 2.4, 1, 5), '#f2a4c4'), _pF(_pC(c.cx - c.W * 0.3, c.by - c.H * 0.62, 0.8), '#f4d24a')); } },
    head: (c) => { _ppMass(c.P.head, _pP`M${c.hx - c.hr} ${c.hy + c.hr * 0.8}L${c.hx - c.hr * 1.1} ${c.hy - c.hr * 0.6}L${c.hx + c.hr * 0.9} ${c.hy - c.hr * 0.8}L${c.hx + c.hr * 1.1} ${c.hy + c.hr * 0.8}z`, c.A, c.hx, c.hy, { k: 0.86 }); } },
  moosh: { H: 18, W: 9, leg: 5, lw: 3.6, aw: 2.6, hr: 11, topK: 1.0, shape: (cx, by, W, H) => _pP`M${cx - W} ${by + H * 0.5}C${cx - W * 1.1} ${by} ${cx - W * 0.7} ${by - H * 0.5} ${cx} ${by - H * 0.5}C${cx + W * 0.7} ${by - H * 0.5} ${cx + W * 1.1} ${by} ${cx + W} ${by + H * 0.5}z`, furT: (X) => X.b,
    head: (c) => { const { hx, hy, hr } = c, cap = _pP`M${hx - hr * 1.3} ${hy + hr * 0.4}C${hx - hr * 1.4} ${hy - hr * 0.9} ${hx + hr * 1.3} ${hy - hr * 1.0} ${hx + hr * 1.4} ${hy + hr * 0.4}Q${hx} ${hy + hr * 0.75} ${hx - hr * 1.3} ${hy + hr * 0.4}z`; _ppMass(c.P.head, cap, c.A, hx, hy, { k: 0.9, up: 1.2 }); c.P.head.push(_pF(_pE(hx, hy + hr * 0.45, hr * 1.2, hr * 0.22), c.B[1], 0.8)); if (c.m === 'dots') for (const [x, y, r] of [[-0.6, -0.3, 0.26], [0.3, -0.5, 0.2], [0.8, 0, 0.18], [-0.1, 0.1, 0.16]]) c.P.head.push(_pF(_pE(hx + hr * x, hy + hr * y, hr * r, hr * r * 0.8), '#fbf8f2', 0.95)); if (c.m === 'rings') c.P.head.push(_pL(_pP`M${hx - hr} ${hy}Q${hx} ${hy - hr * 0.5} ${hx + hr} ${hy}`, c.C[0], 1.2, 0.8)); } },
};
/** Moosh's face sits on the stalk under the cap; its eye anchors there. */

/** The Painted village's drawing of a species: its own, its body plan's, or null (the rig's). */
function _ppArtFor(sp) {
  const id = sp && sp.id;
  if (!id) return null;
  if (id === 'duck') return null;
  if (_PP_OWN[id]) return _PP_OWN[id];
  if (_PP_SPEC[id]) return (pet, pose, mood, X) => _ppQuad(pet, pose, mood, X, _PP_SPEC[id](pet));
  if (_PP_BIRDS[id]) return (pet, pose, mood, X) => _ppBird(pet, pose, mood, X, _PP_BIRDS[id]);
  if (_PP_UPRIGHT[id]) return (pet, pose, mood, X) => _ppUpright(pet, pose, mood, X, _PP_UPRIGHT[id]);
  return null;
}
