/* ============================================================
   GARDEN, fishing and bug catching: THE ART (2.22). PURE (no DOM, no state): strings in, strings out.

     gardenFishArt(id, o)   -> an SVG fragment ('<g>…</g>') of a fish, side view, facing right, centred on (0, 0),
                               about 80 units long (viewBox -44 -26 88 52). o {uid (a safe id prefix), q 0..3, still}
     gardenBugArt(id, o)    -> an SVG fragment of a bug seen from above, facing right, centred on (0, 0), about 30 units
                               long (viewBox -18 -18 36 36). o {uid, flap (wings up), glow}
     gardenGearArt(kind, id, o)  rods, nets, bait, bobbers (viewBox 0 0 64 64)
     gardenCatchSvg(kind, id, px, o)  one of them as a standalone <svg> (cards, tray, collection)

   Every fish and bug is drawn from a few templates (shapes) and its look {s, c, c2, c3, p} in the catalogue, so the whole
   book looks like one hand. Explicit colours only, no references outside the fragment, no text: the photo mode paints
   the garden onto a canvas. Deterministic.
   ============================================================ */
function _gfaHex(c) { const n = parseInt(String(c).slice(1), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function _gfaMix(a, b, t) { const A = _gfaHex(a), B = _gfaHex(b); return '#' + A.map((v, i) => Math.max(0, Math.min(255, Math.round(v + (B[i] - v) * t))).toString(16).padStart(2, '0')).join(''); }
function _gfaDk(c, k) { return _gfaMix(c, '#1a1410', k == null ? 0.25 : k); }
function _gfaLt(c, k) { return _gfaMix(c, '#fffbea', k == null ? 0.25 : k); }
function _gfaN(v) { return Math.round(v * 10) / 10; }
function _gfaRng(seed) { let a = gardenHash(seed) >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function _gfaUid(o, id) { return String((o && o.uid) || 'gf' + (gardenHash(id) % 99999).toString(36)).replace(/[^A-Za-z0-9_-]/g, ''); }

/* ---------- fish ---------- */
/* shape tables: L length, H half-height (max), pt peduncle half-thickness, sn snout taper, bel belly fullness, tail kind, dorsal {x0, x1, h}, anal, eye size */
const _GFA_SHAPES = {
  slim: { L: 74, H: 10, pt: 2.6, sn: 12, bel: 0.85, tail: 'fork', dor: [-0.04, 0.2, 7], ana: [-0.2, -0.04, 4], eye: 2.0, eyeX: 0.34 },
  round: { L: 62, H: 17, pt: 3.4, sn: 11, bel: 1.0, tail: 'fork', dor: [-0.22, 0.2, 9], ana: [-0.2, 0.0, 6], eye: 2.6, eyeX: 0.3 },
  flat: { L: 62, H: 21, pt: 3.2, sn: 10, bel: 1.05, tail: 'fork', dor: [-0.12, 0.12, 9], ana: [-0.3, 0.1, 9], eye: 2.3, eyeX: 0.3 },
  carp: { L: 72, H: 16, pt: 4, sn: 10, bel: 0.92, tail: 'fork', dor: [-0.28, 0.2, 10], ana: [-0.2, -0.04, 4], eye: 2.3, eyeX: 0.33, barb: 1 },
  koi: { L: 72, H: 15, pt: 3.4, sn: 11, bel: 0.9, tail: 'fan', dor: [-0.26, 0.14, 8], ana: [-0.2, -0.04, 4], eye: 2.2, eyeX: 0.34 },
  fancy: { L: 52, H: 17, pt: 3, sn: 9, bel: 1.05, tail: 'veil', dor: [-0.16, 0.18, 12], ana: [-0.2, 0, 8], eye: 2.8, eyeX: 0.3 },
  pike: { L: 82, H: 9, pt: 3.2, sn: 20, bel: 0.8, tail: 'fork', dor: [-0.4, -0.24, 8], ana: [-0.38, -0.22, 7], eye: 2.2, eyeX: 0.32 },
  eel: { L: 84, H: 5.4, pt: 3.4, sn: 7, bel: 0.9, tail: 'none', dor: [-0.45, 0.28, 3.4], ana: [-0.45, 0.1, 3], eye: 1.7, eyeX: 0.44 },
  cat: { L: 76, H: 15, pt: 3.2, sn: 6, bel: 0.9, tail: 'fan', dor: [0.0, 0.1, 6], ana: [-0.32, 0.02, 6], eye: 1.9, eyeX: 0.34, barb: 4, flatHead: 1 },
  sturgeon: { L: 84, H: 11, pt: 2.8, sn: 22, bel: 0.78, tail: 'shark', dor: [-0.32, -0.16, 7], ana: [-0.3, -0.18, 5], eye: 1.8, eyeX: 0.26, barb: 2 },
  angler: { L: 60, H: 23, pt: 3.4, sn: 4, bel: 1.0, tail: 'fan', dor: [-0.24, 0.12, 9], ana: [-0.2, 0.0, 6], eye: 3.2, eyeX: 0.32, lure: 1 },
  crayfish: { L: 60, H: 9, pt: 4, sn: 8, bel: 1, tail: 'none', dor: [0, 0, 0], ana: [0, 0, 0], eye: 1.6, eyeX: 0.4 },
};
function _gfaBody(S) {
  const L = S.L, H = S.H, x0 = -L / 2, x1 = L / 2, pt = S.pt, sn = S.sn, b = S.bel;
  return `M${_gfaN(x0)} ${-pt}C${_gfaN(x0 + L * 0.22)} ${_gfaN(-H * 0.95)} ${_gfaN(x0 + L * 0.6)} ${_gfaN(-H * 1.02)} ${_gfaN(x1 - sn)} ${_gfaN(-H * 0.34)}`
    + `Q${_gfaN(x1)} ${_gfaN(-H * 0.12)} ${_gfaN(x1)} 0Q${_gfaN(x1)} ${_gfaN(H * 0.16 * b)} ${_gfaN(x1 - sn)} ${_gfaN(H * 0.4 * b)}`
    + `C${_gfaN(x0 + L * 0.6)} ${_gfaN(H * 1.0 * b)} ${_gfaN(x0 + L * 0.22)} ${_gfaN(H * 0.9 * b)} ${_gfaN(x0)} ${pt}Z`;
}
function _gfaTail(S, fin, edge) {
  const x0 = -S.L / 2, pt = S.pt;
  const t = S.tail;
  if (t === 'none') return '';
  if (t === 'fork') return `<path d="M${_gfaN(x0 + 2)} ${-pt}L${_gfaN(x0 - 15)} ${-S.H * 0.9}Q${_gfaN(x0 - 9)} 0 ${_gfaN(x0 - 15)} ${_gfaN(S.H * 0.9)}L${_gfaN(x0 + 2)} ${pt}Z" fill="${fin}" stroke="${edge}" stroke-width="0.6" stroke-linejoin="round"/>`;
  if (t === 'fan') return `<path d="M${_gfaN(x0 + 2)} ${-pt}Q${_gfaN(x0 - 14)} ${-S.H * 1.0} ${_gfaN(x0 - 15)} 0Q${_gfaN(x0 - 14)} ${_gfaN(S.H * 1.0)} ${_gfaN(x0 + 2)} ${pt}Z" fill="${fin}" stroke="${edge}" stroke-width="0.6"/>`;
  if (t === 'shark') return `<path d="M${_gfaN(x0 + 2)} ${-pt}L${_gfaN(x0 - 16)} ${-S.H * 1.5}L${_gfaN(x0 - 7)} 0L${_gfaN(x0 - 11)} ${S.H * 0.7}L${_gfaN(x0 + 2)} ${pt}Z" fill="${fin}" stroke="${edge}" stroke-width="0.6" stroke-linejoin="round"/>`;
  // veil: a flowing double tail
  return `<path class="gfa-tail" d="M${_gfaN(x0 + 3)} ${-pt}C${_gfaN(x0 - 6)} ${-S.H * 1.5} ${_gfaN(x0 - 20)} ${-S.H * 1.1} ${_gfaN(x0 - 17)} ${-S.H * 0.2}C${_gfaN(x0 - 12)} ${S.H * 0.1} ${_gfaN(x0 - 22)} ${S.H * 0.7} ${_gfaN(x0 - 15)} ${S.H * 1.4}C${_gfaN(x0 - 6)} ${S.H * 1.3} ${_gfaN(x0 + 1)} ${S.H * 0.5} ${_gfaN(x0 + 3)} ${pt}Z" fill="${fin}" fill-opacity="0.9" stroke="${edge}" stroke-width="0.5"/>`;
}
function _gfaPattern(look, S, rnd, body, uid, id) {
  const p = look.p, L = S.L, H = S.H, x0 = -L / 2;
  const dark = _gfaDk(look.c, 0.4), light = _gfaLt(look.c, 0.35);
  let s = '';
  switch (p) {
    case 'bars': for (let i = 0; i < 5; i++) { const x = x0 + L * (0.3 + i * 0.1); s += `<path d="M${_gfaN(x)} ${_gfaN(-H)}Q${_gfaN(x + 2)} 0 ${_gfaN(x - 1)} ${_gfaN(H * S.bel)}" stroke="${look.c3 && /^#(2|3|4|5)/.test(look.c3) ? look.c3 : dark}" stroke-width="3" stroke-opacity="0.5" fill="none"/>`; } break;
    case 'stripe': s += `<path d="M${_gfaN(x0 + L * 0.14)} ${_gfaN(H * 0.04)}Q${_gfaN(x0 + L * 0.5)} ${_gfaN(-H * 0.06)} ${_gfaN(x0 + L * 0.9)} ${_gfaN(-H * 0.02)}" stroke="${look.c3}" stroke-width="${_gfaN(Math.max(1.6, H * 0.26))}" stroke-opacity="0.75" fill="none" stroke-linecap="round"/>`; break;
    case 'spots': for (let i = 0; i < 14; i++) s += `<circle cx="${_gfaN(x0 + L * (0.22 + rnd() * 0.62))}" cy="${_gfaN((rnd() - 0.6) * H * 1.2)}" r="${_gfaN(0.9 + rnd() * 1.1)}" fill="${look.c3}" fill-opacity="0.8"/>`; break;
    case 'speckle': for (let i = 0; i < 22; i++) s += `<circle cx="${_gfaN(x0 + L * (0.18 + rnd() * 0.68))}" cy="${_gfaN((rnd() - 0.5) * H * 1.5)}" r="${_gfaN(0.5 + rnd() * 0.5)}" fill="${look.c3}" fill-opacity="0.7"/>`; break;
    case 'patches': for (let i = 0; i < 4; i++) { const cx = x0 + L * (0.3 + i * 0.16 + rnd() * 0.05), cy = (rnd() - 0.5) * H * 0.9; s += `<ellipse cx="${_gfaN(cx)}" cy="${_gfaN(cy)}" rx="${_gfaN(5 + rnd() * 5)}" ry="${_gfaN(3.5 + rnd() * 3)}" fill="${look.c2}" fill-opacity="0.95" transform="rotate(${Math.round((rnd() - 0.5) * 50)} ${_gfaN(cx)} ${_gfaN(cy)})"/>`; } break;
    case 'scales': for (let r = -2; r <= 2; r++) for (let c = 0; c < 7; c++) { const cx = x0 + L * 0.28 + c * 7 + (r % 2 ? 3 : 0), cy = r * 5.4; if (Math.abs(cy) < H * 0.82 * (1 - Math.abs(c - 3) * 0.04)) s += `<path d="M${_gfaN(cx)} ${_gfaN(cy - 2.6)}q3 2.6 0 5.2" stroke="${dark}" stroke-width="0.6" stroke-opacity="0.45" fill="none"/>`; } break;
    case 'mirror': for (let i = 0; i < 6; i++) s += `<ellipse cx="${_gfaN(x0 + L * (0.3 + rnd() * 0.5))}" cy="${_gfaN((rnd() - 0.55) * H * 1.1)}" rx="${_gfaN(3 + rnd() * 2.2)}" ry="${_gfaN(2.6 + rnd() * 1.6)}" fill="${light}" fill-opacity="0.55" stroke="${dark}" stroke-width="0.5" stroke-opacity="0.5"/>`; break;
    case 'scutes': for (let i = 0; i < 9; i++) { const x = x0 + L * (0.18 + i * 0.075); s += `<path d="M${_gfaN(x)} ${_gfaN(-H * 0.3)}l2.2 -2.6 2.2 2.6z" fill="${look.c3}" fill-opacity="0.9"/>`; s += `<path d="M${_gfaN(x)} ${_gfaN(H * 0.32)}l2.2 2.4 2.2 -2.4z" fill="${look.c3}" fill-opacity="0.7"/>`; } break;
    case 'glow': s += `<ellipse cx="${_gfaN(x0 + L * 0.5)}" cy="0" rx="${_gfaN(L * 0.34)}" ry="${_gfaN(H * 0.72)}" fill="${look.c2}" fill-opacity="0.45"/>`; break;
    case 'belly': s += `<path d="M${_gfaN(x0 + L * 0.12)} ${_gfaN(S.pt)}C${_gfaN(x0 + L * 0.3)} ${_gfaN(H * 0.5)} ${_gfaN(x0 + L * 0.7)} ${_gfaN(H * 0.5)} ${_gfaN(L / 2 - S.sn)} ${_gfaN(H * 0.3)}L${_gfaN(L / 2 - S.sn)} ${_gfaN(H * 0.42 * S.bel)}C${_gfaN(x0 + L * 0.6)} ${_gfaN(H * 1.0 * S.bel)} ${_gfaN(x0 + L * 0.22)} ${_gfaN(H * 0.9 * S.bel)} ${_gfaN(x0 + L * 0.1)} ${S.pt}Z" fill="${look.c2}" fill-opacity="0.7"/>`; break;
    default: break;
  }
  void uid; void id; void body;
  return s;
}
function gardenFishArt(id, o) {
  o = o || {};
  const f = gardenFishDef(id);
  if (!f) return '';
  const look = f.look, uid = _gfaUid(o, id), rnd = _gfaRng('fish|' + id);
  if (f.cat !== 'fish') return _gfaFind(f, uid);
  const S = _GFA_SHAPES[look.s] || _GFA_SHAPES.slim;
  if (look.s === 'crayfish') return _gfaCrayfish(look, uid);
  const body = _gfaBody(S), edge = _gfaDk(look.c, 0.45);
  const fin = look.s === 'koi' || look.s === 'fancy' ? _gfaMix(look.c2 === look.c ? look.c : look.c2, '#ffffff', 0.25) : _gfaMix(look.c, look.c3 || look.c2, 0.45);
  const finc = (look.p === 'belly' && look.c3) ? _gfaMix(look.c, look.c3, 0.5) : fin;
  const x0 = -S.L / 2, x1 = S.L / 2, H = S.H;
  let s = `<defs><linearGradient id="${uid}-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${_gfaDk(look.c, 0.2)}"/><stop offset="0.5" stop-color="${look.c}"/><stop offset="1" stop-color="${look.c2}"/></linearGradient><clipPath id="${uid}-k"><path d="${body}"/></clipPath></defs>`;
  s += '<g class="gfa-fish">';
  // fins behind the body: dorsal, anal, tail
  const sail = look.p === 'sail';
  const dx0 = x0 + S.L * (0.5 + S.dor[0]), dx1 = x0 + S.L * (0.5 + S.dor[1]), dh = S.dor[2] * (sail ? 2.1 : 1);
  if (S.dor[2]) s += `<path d="M${_gfaN(dx0)} ${_gfaN(-H * 0.85)}Q${_gfaN((dx0 + dx1) / 2)} ${_gfaN(-H * 0.85 - dh * 1.2)} ${_gfaN(dx1)} ${_gfaN(-H * 0.7)}Z" fill="${finc}" stroke="${edge}" stroke-width="0.5" stroke-linejoin="round"/>`;
  if (S.ana[2]) s += `<path d="M${_gfaN(x0 + S.L * (0.5 + S.ana[0]))} ${_gfaN(H * 0.8 * S.bel)}q${_gfaN(S.L * 0.06)} ${_gfaN(S.ana[2])} ${_gfaN(S.L * (S.ana[1] - S.ana[0]))} ${_gfaN(-S.ana[2] * 0.2)}z" fill="${finc}" stroke="${edge}" stroke-width="0.5"/>`;
  s += _gfaTail(S, finc, edge);
  if (look.s === 'eel') {
    // a ribbon: the body is thin, give it a gentle S so it reads as an eel
    s += `<path d="M${x0} 0C${_gfaN(x0 + 18)} -9 ${_gfaN(x0 + 30)} 9 ${_gfaN(x0 + 50)} 0S${_gfaN(x1 - 8)} -3 ${_gfaN(x1)} -1" stroke="${edge}" stroke-width="${_gfaN(S.H * 2 + 1.4)}" stroke-linecap="round" fill="none"/><path d="M${x0} 0C${_gfaN(x0 + 18)} -9 ${_gfaN(x0 + 30)} 9 ${_gfaN(x0 + 50)} 0S${_gfaN(x1 - 8)} -3 ${_gfaN(x1)} -1" stroke="url(#${uid}-b)" stroke-width="${_gfaN(S.H * 2)}" stroke-linecap="round" fill="none"/>`;
    s += `<circle cx="${_gfaN(x1 - 6)}" cy="-1.6" r="1.5" fill="#f8f4e8"/><circle cx="${_gfaN(x1 - 5.6)}" cy="-1.6" r="0.8" fill="#14120e"/>`;
    return s + '</g>';
  }
  s += `<path d="${body}" fill="url(#${uid}-b)" stroke="${edge}" stroke-width="0.9" stroke-linejoin="round"/>`;
  s += `<g clip-path="url(#${uid}-k)">${_gfaPattern(look, S, rnd, body, uid, id)}<path d="M${_gfaN(x0 + S.L * 0.2)} ${_gfaN(-H * 0.55)}Q${_gfaN(x0 + S.L * 0.55)} ${_gfaN(-H * 0.8)} ${_gfaN(x1 - S.sn)} ${_gfaN(-H * 0.28)}" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>`;
  // gill line, pectoral fin, eye, mouth
  const gx = x1 - S.L * 0.3;
  s += `<path d="M${_gfaN(gx)} ${_gfaN(-H * 0.5)}Q${_gfaN(gx - 2.6)} 0 ${_gfaN(gx)} ${_gfaN(H * 0.5 * S.bel)}" stroke="${edge}" stroke-width="0.8" fill="none" stroke-opacity="0.7"/>`;
  s += `<path d="M${_gfaN(gx - 1)} ${_gfaN(H * 0.18)}q${_gfaN(-S.L * 0.08)} ${_gfaN(H * 0.34)} ${_gfaN(-S.L * 0.14)} ${_gfaN(H * 0.5)}q${_gfaN(S.L * 0.04)} ${_gfaN(-H * 0.4)} ${_gfaN(S.L * 0.14)} ${_gfaN(-H * 0.5)}z" fill="${finc}" fill-opacity="0.9" stroke="${edge}" stroke-width="0.4"/>`;
  const ex = x1 - S.L * (1 - S.eyeX - 0.5) - S.L * 0.5 + S.L * 0.0, ey = -H * 0.2;
  const exx = x0 + S.L * (S.eyeX + 0.5) + S.L * 0.0;
  void ex;
  s += `<circle cx="${_gfaN(exx)}" cy="${_gfaN(ey)}" r="${S.eye}" fill="#fbf8ee" stroke="${edge}" stroke-width="0.5"/><circle cx="${_gfaN(exx + 0.4)}" cy="${_gfaN(ey)}" r="${_gfaN(S.eye * 0.55)}" fill="#14120e"/><circle cx="${_gfaN(exx + 0.9)}" cy="${_gfaN(ey - 0.7)}" r="0.55" fill="#ffffff"/>`;
  s += `<path d="M${_gfaN(x1 - 1.4)} ${_gfaN(H * 0.07)}q${_gfaN(-3)} ${_gfaN(1.4)} ${_gfaN(-5.4)} 0.6" stroke="${edge}" stroke-width="0.8" fill="none" stroke-linecap="round"/>`;
  if (S.barb) { const n = S.barb; for (let i = 0; i < n; i++) s += `<path d="M${_gfaN(x1 - 3)} ${_gfaN(H * 0.18)}q${_gfaN(2 + i * 0.4)} ${_gfaN(5 + i)} ${_gfaN(-3 - i * 1.5)} ${_gfaN(7 + i * 0.6)}" stroke="${edge}" stroke-width="0.8" fill="none" stroke-linecap="round"/>`; }
  if (S.lure) s += `<path d="M${_gfaN(x1 - 12)} ${_gfaN(-H * 0.95)}Q${_gfaN(x1 + 2)} ${_gfaN(-H * 1.9)} ${_gfaN(x1 + 6)} ${_gfaN(-H * 1.1)}" stroke="${edge}" stroke-width="1" fill="none"/><circle cx="${_gfaN(x1 + 6)}" cy="${_gfaN(-H * 1.1)}" r="3.2" fill="${look.c3}"/><circle cx="${_gfaN(x1 + 6)}" cy="${_gfaN(-H * 1.1)}" r="7" fill="${look.c3}" fill-opacity="0.28"/>`;
  if (look.p === 'glow') s += `<ellipse cx="0" cy="0" rx="${_gfaN(S.L * 0.62)}" ry="${_gfaN(H * 1.5)}" fill="${look.c2}" fill-opacity="0.16"/>`;
  return s + '</g>';
}
function _gfaCrayfish(look, uid) {
  const c = look.c, c2 = look.c2, e = _gfaDk(c, 0.4);
  let s = '<g class="gfa-fish">';
  s += `<path d="M-30 0Q-36 -6 -34 -10Q-26 -8 -22 -3M-30 0Q-36 6 -34 10Q-26 8 -22 3" fill="${c2}" stroke="${e}" stroke-width="0.7"/>`;
  s += `<path d="M-24 0C-24 -8 -10 -9 4 -7 14 -6 20 -3 22 0 20 3 14 6 4 7 -10 9 -24 8 -24 0Z" fill="${c}" stroke="${e}" stroke-width="0.9"/>`;
  for (let i = 0; i < 5; i++) s += `<path d="M${-20 + i * 7} -7.4q2 7.4 0 14.8" stroke="${e}" stroke-width="0.6" fill="none" stroke-opacity="0.6"/>`;
  s += `<path d="M20 -3Q30 -12 38 -8Q34 -4 30 -4Q34 0 28 0M20 3Q30 12 38 8Q34 4 30 4Q34 0 28 0" fill="${c2}" stroke="${e}" stroke-width="0.8" stroke-linejoin="round"/>`;
  for (let i = 0; i < 4; i++) s += `<path d="M${-8 + i * 7} -6l${i % 2 ? 1 : -1} -7M${-8 + i * 7} 6l${i % 2 ? 1 : -1} 7" stroke="${e}" stroke-width="1" stroke-linecap="round" fill="none"/>`;
  s += `<path d="M22 -2Q30 -8 34 -14M22 2Q30 8 34 14" stroke="${e}" stroke-width="0.6" fill="none"/><circle cx="21" cy="-2.6" r="1.4" fill="#14120e"/><circle cx="21" cy="2.6" r="1.4" fill="#14120e"/>`;
  void uid;
  return s + '</g>';
}
/** A find: boot, can, driftwood, weed, orb (float or pearl), key, purse, bottle. */
function _gfaFind(f, uid) {
  const c = f.look.c, c2 = f.look.c2, e = _gfaDk(c, 0.45);
  void uid;
  switch (f.look.s) {
    case 'boot': return `<g><path d="M-10 -22v26l-8 4q-6 3 -2 8h34q8 0 6 -7l-7 -4 -3 -7h-6l-2 -12v-6z" fill="${c}" stroke="${e}" stroke-width="1.2" stroke-linejoin="round"/><path d="M-10 -22h12v6h-12z" fill="${c2}"/><path d="M-12 12h28" stroke="${c2}" stroke-width="2.4"/><path d="M-8 -6l8 3M-8 -1l8 3" stroke="${c2}" stroke-width="1.2" stroke-linecap="round"/></g>`;
    case 'can': return `<g><path d="M-12 -14h24v28a4 3 0 0 1 -24 0z" fill="${c}" stroke="${e}" stroke-width="1.2"/><ellipse cx="0" cy="-14" rx="12" ry="3.4" fill="${c2}" stroke="${e}" stroke-width="1"/><path d="M-12 -4h24M-12 6h24" stroke="${c2}" stroke-width="1.6"/><path d="M-4 -2l6 -2v10l-6 -1z" fill="#d85a3a" fill-opacity="0.8"/></g>`;
    case 'wood': return `<g><path d="M-30 4Q-14 -10 4 -2 18 -12 30 -6 24 2 6 4 -8 12 -30 8z" fill="${c}" stroke="${e}" stroke-width="1.1" stroke-linejoin="round"/><path d="M-18 2Q-8 -2 0 2M6 -2q8 -4 16 -2" stroke="${c2}" stroke-width="1.2" fill="none"/></g>`;
    case 'weed': return `<g fill="none" stroke-linecap="round"><path d="M-14 16Q-24 -2 -8 -14M-4 16Q-10 -6 6 -18M8 16Q4 0 16 -10M16 16Q14 4 26 -2" stroke="${c}" stroke-width="3.2"/><path d="M-14 16Q-24 -2 -8 -14M-4 16Q-10 -6 6 -18" stroke="${c2}" stroke-width="1" stroke-opacity="0.7"/></g>`;
    case 'orb': return `<g><circle cx="0" cy="0" r="15" fill="${c}" stroke="${e}" stroke-width="1"/><circle cx="0" cy="0" r="15" fill="${c2}" fill-opacity="0.35"/><ellipse cx="-5" cy="-6" rx="5" ry="3" fill="#ffffff" fill-opacity="0.8" transform="rotate(-30 -5 -6)"/><circle cx="6" cy="6" r="3" fill="#ffffff" fill-opacity="0.25"/></g>`;
    case 'key': return `<g stroke-linejoin="round"><circle cx="-14" cy="0" r="9" fill="none" stroke="${c}" stroke-width="5"/><circle cx="-14" cy="0" r="9" fill="none" stroke="${c2}" stroke-width="1" stroke-opacity="0.5"/><path d="M-5 0H26M16 0v9M22 0v7" stroke="${c}" stroke-width="5" stroke-linecap="round"/><path d="M-5 -1H24" stroke="${c2}" stroke-opacity="0.5" stroke-width="1"/></g>`;
    case 'purse': return `<g><path d="M-14 -4Q-18 14 -8 16h16q10 -2 6 -20z" fill="${c}" stroke="${e}" stroke-width="1.2" stroke-linejoin="round"/><path d="M-9 -6l-3 -9h24l-3 9z" fill="${c}" stroke="${e}" stroke-width="1"/><path d="M-9 -6Q0 -2 9 -6" stroke="${c2}" stroke-width="2" fill="none"/><circle cx="0" cy="5" r="4.4" fill="${c2}" stroke="${e}" stroke-width="0.8"/></g>`;
    case 'bottle': return `<g transform="rotate(-24)"><path d="M-6 -8h22q8 0 8 8t-8 8h-22q-8 0 -8 -8t8 -8z" fill="${c}" fill-opacity="0.75" stroke="${e}" stroke-width="1"/><rect x="-22" y="-5" width="6" height="10" rx="2" fill="#c8a06a"/><rect x="-6" y="-4" width="20" height="8" rx="1" fill="${c2}"/><path d="M-4 -1h14M-4 2h10" stroke="#8a7a5a" stroke-width="0.8"/></g>`;
    default: return `<g><circle r="10" fill="${c}"/></g>`;
  }
}

/* ---------- bugs ---------- */
function _gfaWing(c, c2, c3, p, big, big2, fore) {
  // a forewing pointing back-and-out from the body on the upper side: the caller mirrors it
  const w = fore ? `M2 -1C3 -8 -1 -15 -9 -${big}C-15 -${big * 0.55} -9 -1 -1 -0.5Z` : `M0 -0.5C-2 -5 -8 -8 -13 -${big2}C-15 -${big2 * 0.45} -9 -1.5 -1 0Z`;
  let s = `<path d="${w}" fill="${c}" stroke="${_gfaDk(c, 0.35)}" stroke-width="0.6" stroke-linejoin="round"/>`;
  if (fore) {
    if (p === 'dots') s += `<circle cx="-5" cy="-7" r="1.7" fill="${c2}"/><circle cx="-8" cy="-4" r="1.3" fill="${c2}"/>`;
    else if (p === 'edge') s += `<path d="M-9 -${big}C-15 -${big * 0.55} -9 -1 -1 -0.5" stroke="${c2}" stroke-width="1.6" fill="none"/><circle cx="-10" cy="-8" r="1" fill="${c3}"/><circle cx="-7" cy="-11" r="1" fill="${c3}"/>`;
    else if (p === 'tip') s += `<path d="M-3 -${big - 3}Q-9 -${big} -9 -${big - 1}Q-13 -${big * 0.6} -12 -6Q-6 -9 -3 -${big - 3}z" fill="${c2}"/>`;
    else if (p === 'band') s += `<path d="M-1 -2Q-5 -9 -3 -${big - 3}" stroke="${c3}" stroke-width="2.6" stroke-opacity="0.9" fill="none"/>`;
    else if (p === 'eyes') s += `<circle cx="-8" cy="-8" r="2.6" fill="${c3}" stroke="${c2}" stroke-width="1"/><circle cx="-8" cy="-8" r="1" fill="#1a1a2a"/>`;
    else if (p === 'veins') s += `<path d="M0 -1L-12 -${big - 3}M-2 -2L-14 -7M-1 -1L-9 -3" stroke="${c2}" stroke-width="1" fill="none"/>`;
    else if (p === 'sheen') s += `<path d="M2 -2C0 -8 -4 -12 -10 -${big - 2}" stroke="${c3}" stroke-width="3.2" stroke-opacity="0.6" fill="none" stroke-linecap="round"/>`;
    else if (p === 'tiger') s += `<path d="M-3 -3l-2 -4 3 -1 -1 -5M-8 -2l-1 -4 3 -2" stroke="${c2}" stroke-width="2.2" fill="none"/>`;
    else if (p === 'leaf') s += `<path d="M1 -1L-12 -${big - 3}" stroke="${c2}" stroke-width="0.9" fill="none"/><circle cx="-5" cy="-6" r="1.2" fill="${c3}"/>`;
    else if (p === 'tails') s += `<path d="M-12 -${big - 4}q-4 3 -5 9" stroke="${c}" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="-6" cy="-8" r="1.5" fill="${c3}"/>`;
    else if (p === 'fur') s += `<path d="M2 -3L-5 -7M3 -1L-6 -4" stroke="${_gfaLt(c, 0.4)}" stroke-width="1.4" stroke-opacity="0.8" fill="none"/>`;
  }
  return s;
}
function gardenBugArt(id, o) {
  o = o || {};
  const b = gardenBugDef(id);
  if (!b) return '';
  const L = b.look, c = L.c, c2 = L.c2, c3 = L.c3 || c2, e = _gfaDk(c, 0.45), p = L.p || '';
  const flap = o.flap ? 0.42 : 1;
  let s = '<g class="gba-bug">';
  switch (b.shape) {
    case 'butterfly': {
      const big = p === 'big' ? 17 : 15, tail = p === 'tails';
      const wing = (m) => `<g transform="scale(1 ${m})">${_gfaWing(c, c2, c3, p, big, 12, true)}${_gfaWing(_gfaMix(c, c2, 0.1), c2, c3, p === 'dots' || p === 'eyes' || p === 'tails' ? p : '', 12, 12, false)}${tail ? `<path d="M-12 -6q-6 2 -8 7" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round"/>` : ''}</g>`;
      s += `<g class="gba-wings" style="transform-origin:0 0">${wing(1)}${wing(-1)}</g>`;
      s += `<ellipse cx="-3" cy="0" rx="9" ry="1.9" fill="${_gfaDk(c2 === c ? '#3a2a1a' : c2, 0.3)}"/><circle cx="7" cy="0" r="2.2" fill="${_gfaDk(c2, 0.2)}"/><path d="M8 -1Q13 -5 16 -4M8 1Q13 5 16 4" stroke="${e}" stroke-width="0.7" fill="none"/>`;
      break;
    }
    case 'moth': {
      const wing = (m) => `<g transform="scale(1 ${m})"><path d="M3 -1C5 -9 -2 -16 -11 -14C-16 -9 -10 -1 -1 -0.5Z" fill="${c}" stroke="${e}" stroke-width="0.6"/><path d="M0 -1C-3 -5 -10 -6 -14 -4C-14 -2 -8 -1 -1 0Z" fill="${_gfaMix(c, c2, 0.3)}"/>${p === 'tiger' ? `<path d="M-3 -3l-2 -4 3 -1 -1 -5M-8 -2l-1 -4 3 -2" stroke="${c2}" stroke-width="2.2" fill="none"/><path d="M-2 -2Q-6 -5 -9 -3" stroke="${c3}" stroke-width="2.4" fill="none"/>` : ''}${p === 'tails' ? `<path d="M-12 -4q-6 2 -9 9" stroke="${c}" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="-7" cy="-7" r="2" fill="${c3}" fill-opacity="0.7"/>` : ''}${p === 'fur' ? `<path d="M2 -3L-5 -7M3 -1L-6 -4" stroke="${c2}" stroke-width="2.4" stroke-opacity="0.8" fill="none"/>` : ''}</g>`;
      s += `<g class="gba-wings">${wing(1)}${wing(-1)}</g><ellipse cx="-2" cy="0" rx="9" ry="2.6" fill="${_gfaMix(c, '#ffffff', 0.25)}"/><circle cx="7" cy="0" r="2.4" fill="${e}"/><path d="M8 -1Q12 -6 16 -5L14 -3M8 1Q12 6 16 5L14 3" stroke="${e}" stroke-width="0.8" fill="none"/>`;
      break;
    }
    case 'bee': {
      s += `<g class="gba-wings"><ellipse cx="-2" cy="-7" rx="8" ry="4" fill="${c3}" fill-opacity="0.55" stroke="${e}" stroke-width="0.4" transform="rotate(-18 -2 -7)"/><ellipse cx="-2" cy="7" rx="8" ry="4" fill="${c3}" fill-opacity="0.55" stroke="${e}" stroke-width="0.4" transform="rotate(18 -2 7)"/></g>`;
      s += `<ellipse cx="-3" cy="0" rx="9" ry="5.6" fill="${c}" stroke="${e}" stroke-width="0.7"/><path d="M-5 -5q2 5 0 10M-0.5 -5.4q2 5.4 0 10.8M-9 -3q1 3 0 6" stroke="${c2}" stroke-width="2.6" fill="none"/>`;
      if (p === 'fur') s += `<circle cx="4" cy="0" r="4.6" fill="${_gfaLt(c, 0.25)}"/>`;
      s += `<circle cx="7" cy="0" r="3.6" fill="${c2}"/><circle cx="9" cy="-1.6" r="1.1" fill="#f4f0e6"/><circle cx="9" cy="1.6" r="1.1" fill="#f4f0e6"/><path d="M10 -1Q14 -5 16 -3M10 1Q14 5 16 3" stroke="${c2}" stroke-width="0.8" fill="none"/>`;
      break;
    }
    case 'ladybird':
      s += `<path d="M-9 -3.6Q-7 -10 2 -10Q12 -9 12 0Q12 9 2 10Q-7 10 -9 3.6Z" fill="${c}" stroke="${e}" stroke-width="0.9"/><path d="M-9 0H11" stroke="${c2}" stroke-width="1"/>`;
      for (const [x, y] of [[-3, -5], [4, -6], [-4, 5], [4, 6], [-1, 0], [8, -2], [8, 2]]) s += `<circle cx="${x}" cy="${y}" r="1.7" fill="${c2}"/>`;
      s += `<path d="M12 -3Q15 0 12 3Z" fill="${c2}"/><path d="M-12 -2Q-10 0 -12 2" stroke="${c2}" stroke-width="1" fill="none"/>`;
      break;
    case 'beetle':
    case 'stag': {
      const stag = b.shape === 'stag';
      s += `<g stroke="${e}" stroke-width="1.1" stroke-linecap="round" fill="none"><path d="M-3 -9l-5 -5M2 -10l0 -6M7 -8l5 -5M-3 9l-5 5M2 10l0 6M7 8l5 5"/></g>`;
      s += `<path d="M-13 -5Q-13 -10 -2 -10Q8 -10 8 0Q8 10 -2 10Q-13 10 -13 5Z" fill="${c}" stroke="${e}" stroke-width="0.9"/><path d="M-12 0H7" stroke="${e}" stroke-width="0.7" stroke-opacity="0.7"/><path d="M-9 -6Q-4 -9 2 -8" stroke="${c2}" stroke-width="1.6" stroke-opacity="0.8" fill="none" stroke-linecap="round"/>`;
      s += `<path d="M8 -5Q14 -5 14 0Q14 5 8 5Z" fill="${_gfaDk(c, 0.2)}" stroke="${e}" stroke-width="0.8"/>`;
      if (stag) s += `<path d="M13 -3Q19 -9 22 -4Q19 -6 16 -2M13 3Q19 9 22 4Q19 6 16 2" stroke="${c2}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      else s += `<path d="M13 -2Q17 -4 18 -7M13 2Q17 4 18 7" stroke="${e}" stroke-width="0.9" fill="none"/>`;
      if (p === 'metal') s += `<ellipse cx="-3" cy="-3" rx="6" ry="3.2" fill="${c2}" fill-opacity="0.55"/>`;
      break;
    }
    case 'hopper':
    case 'cicada': {
      const ci = b.shape === 'cicada';
      s += `<path d="M-6 -3L-16 -12L-9 -9M-6 3L-16 12L-9 9" stroke="${e}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M0 -4l3 -7M0 4l3 7" stroke="${e}" stroke-width="1.2" stroke-linecap="round"/>`;
      if (ci) s += `<g class="gba-wings"><ellipse cx="-4" cy="-6" rx="12" ry="4.4" fill="${c2}" fill-opacity="0.6" stroke="${e}" stroke-width="0.5" transform="rotate(-8 -4 -6)"/><ellipse cx="-4" cy="6" rx="12" ry="4.4" fill="${c2}" fill-opacity="0.6" stroke="${e}" stroke-width="0.5" transform="rotate(8 -4 6)"/></g>`;
      s += `<ellipse cx="-3" cy="0" rx="${ci ? 11 : 12}" ry="${ci ? 5.4 : 3.6}" fill="${c}" stroke="${e}" stroke-width="0.8"/>`;
      if (!ci) s += `<path d="M-14 -1Q-4 -5 6 -1" stroke="${c2}" stroke-width="1.6" fill="none"/>`;
      s += `<ellipse cx="${ci ? 9 : 10}" cy="0" rx="${ci ? 4.4 : 4}" ry="${ci ? 5 : 3.4}" fill="${_gfaDk(c, 0.1)}"/><circle cx="${ci ? 11 : 12}" cy="-2" r="1.2" fill="${c2}"/><circle cx="${ci ? 11 : 12}" cy="2" r="1.2" fill="${c2}"/><path d="M13 -1Q18 -6 21 -5M13 1Q18 6 21 5" stroke="${e}" stroke-width="0.7" fill="none"/>`;
      break;
    }
    case 'snail':
      s += `<path d="M-14 6Q-16 -1 -10 -2H10Q18 -2 16 3Q14 6 4 6Z" fill="${c3}" stroke="${e}" stroke-width="0.8"/><circle cx="-4" cy="-3" r="9" fill="${c}" stroke="${e}" stroke-width="1"/><path d="M-4 -3m-6 0a6 6 0 1 1 10 4a3.6 3.6 0 1 1 -5 -3" stroke="${c2}" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M14 -2Q16 -8 14 -11M16 -1Q20 -7 19 -10" stroke="${e}" stroke-width="0.9" fill="none"/><circle cx="14" cy="-11" r="1" fill="${e}"/><circle cx="19" cy="-10" r="1" fill="${e}"/>`;
      break;
    case 'caterpillar':
      for (let i = 0; i < 6; i++) s += `<circle cx="${-14 + i * 5.6}" cy="${(i % 2 ? -0.8 : 0.8)}" r="${i === 5 ? 4.2 : 4.4 - Math.abs(i - 2) * 0.22}" fill="${i === 5 ? _gfaDk(c, 0.15) : i % 2 ? c : _gfaLt(c, 0.12)}" stroke="${e}" stroke-width="0.7"/>`;
      s += `<circle cx="14.6" cy="-1.4" r="0.9" fill="#1a1a1a"/><circle cx="14.6" cy="1.8" r="0.9" fill="#1a1a1a"/><path d="M-14 3.8h25" stroke="${c2}" stroke-width="1" stroke-dasharray="1.2 3.2"/>`;
      break;
    case 'stick':
      s += `<path d="M-18 0Q-6 -3 4 0T18 0" stroke="${e}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M-18 0Q-6 -3 4 0T18 0" stroke="${c}" stroke-width="2.8" fill="none" stroke-linecap="round"/><path d="M-8 -2l-3 -8M0 0l1 -9M-8 -1l-4 8M2 1l3 8M8 0l6 -6M8 1l6 6" stroke="${e}" stroke-width="1" fill="none" stroke-linecap="round"/><circle cx="18" cy="-0.4" r="1.2" fill="${c2}"/>`;
      break;
    case 'mantis':
      s += `<path d="M-16 0Q-4 -4 8 -1" stroke="${e}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M-16 0Q-4 -4 8 -1" stroke="${c}" stroke-width="4.6" fill="none" stroke-linecap="round"/><path d="M-12 -2l-2 -8M-6 -3l0 -9M-12 2l-2 8M-6 2l0 9" stroke="${e}" stroke-width="1" fill="none"/><ellipse cx="-4" cy="-1.4" rx="9" ry="2.4" fill="${c2}" fill-opacity="0.7"/><path d="M8 -1l6 -6 5 4-4 0-3 3M8 0l6 6 5 -4-4 0-3 -3" stroke="${e}" stroke-width="1.4" fill="${c}" stroke-linejoin="round"/><path d="M8 -2.6L12 0 8 2.6Z" fill="${c}" stroke="${e}" stroke-width="0.8"/><circle cx="11" cy="-1.6" r="1.2" fill="#1a1a1a"/><circle cx="11" cy="1.6" r="1.2" fill="#1a1a1a"/>`;
      break;
    case 'dragonfly': {
      const big = p === 'big', slim = p === 'slim', wl = big ? 17 : 13;
      s += `<g class="gba-wings"><ellipse cx="3" cy="-${wl * 0.55}" rx="3.4" ry="${wl * 0.62}" fill="${c3}" fill-opacity="0.55" stroke="${e}" stroke-width="0.5" transform="rotate(-12 3 -${wl * 0.55})"/><ellipse cx="3" cy="${wl * 0.55}" rx="3.4" ry="${wl * 0.62}" fill="${c3}" fill-opacity="0.55" stroke="${e}" stroke-width="0.5" transform="rotate(12 3 ${wl * 0.55})"/><ellipse cx="-3" cy="-${wl * 0.5}" rx="3.2" ry="${wl * 0.58}" fill="${c3}" fill-opacity="0.5" stroke="${e}" stroke-width="0.5" transform="rotate(-8 -3 -${wl * 0.5})"/><ellipse cx="-3" cy="${wl * 0.5}" rx="3.2" ry="${wl * 0.58}" fill="${c3}" fill-opacity="0.5" stroke="${e}" stroke-width="0.5" transform="rotate(8 -3 ${wl * 0.5})"/></g>`;
      s += `<path d="M-22 0H8" stroke="${e}" stroke-width="${slim ? 3 : 4.4}" stroke-linecap="round"/><path d="M-22 0H8" stroke="${c}" stroke-width="${slim ? 2 : 3.2}" stroke-linecap="round"/><path d="M-16 0h2M-10 0h2M-4 0h2" stroke="${c2}" stroke-width="${slim ? 2 : 3.2}"/><ellipse cx="7" cy="0" rx="4.4" ry="3.6" fill="${c2 === '#1a1a2a' ? c : c2}" stroke="${e}" stroke-width="0.6"/><circle cx="10" cy="-2.4" r="2.2" fill="${_gfaLt(c, 0.2)}" stroke="${e}" stroke-width="0.5"/><circle cx="10" cy="2.4" r="2.2" fill="${_gfaLt(c, 0.2)}" stroke="${e}" stroke-width="0.5"/>`;
      break;
    }
    case 'skater':
      s += `<g stroke="${e}" stroke-width="0.9" fill="none" stroke-linecap="round"><path d="M-2 -1L-14 -10M0 -1L8 -12M-2 1L-14 10M0 1L8 12M-1 0L-18 0M2 0L16 3"/></g><ellipse cx="0" cy="0" rx="8" ry="2.6" fill="${c}" stroke="${e}" stroke-width="0.6"/><circle cx="8" cy="0" r="2" fill="${c2}"/>`;
      break;
    case 'firefly': {
      const glow = o.glow !== false;
      s += `<g stroke="${e}" stroke-width="1" stroke-linecap="round" fill="none"><path d="M-2 -5l-3 -6M2 -5l1 -7M-2 5l-3 6M2 5l1 7"/></g><g class="gba-wings"><ellipse cx="-4" cy="-5" rx="9" ry="3.6" fill="${c3}" fill-opacity="0.35" transform="rotate(-10 -4 -5)"/><ellipse cx="-4" cy="5" rx="9" ry="3.6" fill="${c3}" fill-opacity="0.35" transform="rotate(10 -4 5)"/></g>`;
      s += `<ellipse cx="2" cy="0" rx="8" ry="4.4" fill="${c}" stroke="${e}" stroke-width="0.7"/><ellipse cx="-9" cy="0" rx="6.4" ry="4" fill="${c2}" stroke="${_gfaDk(c2, 0.4)}" stroke-width="0.6"/>${glow ? `<circle cx="-9" cy="0" r="12" fill="${c2}" fill-opacity="0.22" class="gba-glow"/>` : ''}<circle cx="9" cy="0" r="3" fill="${e}"/><path d="M6 -3q1 -2 4 -1.4M6 3q1 2 4 1.4" stroke="${c3}" stroke-width="1.4" fill="none"/><path d="M10 -1Q14 -5 16 -4M10 1Q14 5 16 4" stroke="${e}" stroke-width="0.7" fill="none"/>`;
      break;
    }
    case 'spider':
      s += `<g stroke="${e}" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M5 -2L10 -10L14 -8M5 -1L12 -5L17 -3M5 1L12 5L17 3M5 2L10 10L14 8M-1 -3L-6 -11L-9 -9M-1 3L-6 11L-9 9M-3 -1L-11 -4L-14 -2M-3 1L-11 4L-14 2"/></g><ellipse cx="-5" cy="0" rx="8" ry="6.4" fill="${c}" stroke="${e}" stroke-width="0.8"/>`;
      if (p === 'cross') s += `<path d="M-11 0H1M-5 -4V4" stroke="${c2}" stroke-width="1.6" stroke-linecap="round"/><circle cx="-8" cy="-3" r="1" fill="${c2}"/><circle cx="-3" cy="3" r="1" fill="${c2}"/>`;
      s += `<ellipse cx="6" cy="0" rx="4.4" ry="3.6" fill="${_gfaDk(c, 0.2)}" stroke="${e}" stroke-width="0.7"/><circle cx="9" cy="-1.2" r="0.8" fill="#f4f0e6"/><circle cx="9" cy="1.2" r="0.8" fill="#f4f0e6"/>`;
      break;
    default:
      s += `<ellipse rx="9" ry="5" fill="${c}"/>`;
  }
  return s + '</g>';
}

/* ---------- gear ---------- */
function gardenGearArt(kind, id, o) {
  o = o || {};
  if (kind === 'rod') {
    const d = gardenGearDef(id), t = d ? d.tier : 1;
    const wood = ['#c8a46a', '#4a8ab4', '#2a2a32', '#7a3a8a', '#f2c432'][t - 1] || '#c8a46a', e = _gfaDk(wood, 0.4);
    return `<g stroke-linecap="round"><path d="M6 58L52 8" stroke="${e}" stroke-width="4.6"/><path d="M6 58L52 8" stroke="${wood}" stroke-width="3"/><path d="M10 53L18 44" stroke="#3a2a1a" stroke-width="6"/><path d="M52 8Q58 12 56 26" stroke="#e8e4d8" stroke-width="0.9" fill="none"/><circle cx="26" cy="38" r="5" fill="#9aa0a4" stroke="${e}" stroke-width="1.2"/><circle cx="26" cy="38" r="1.6" fill="${e}"/>${t >= 4 ? `<circle cx="40" cy="22" r="1.6" fill="#ffe27a"/><circle cx="32" cy="30" r="1.6" fill="#ffe27a"/>` : ''}<circle cx="56" cy="28" r="2.6" fill="#d8301a" stroke="#f4f0e6" stroke-width="1"/></g>`;
  }
  if (kind === 'net') {
    const d = gardenGearDef(id), t = d ? d.tier : 1;
    const hoop = ['#8a6a3a', '#4aa86a', '#4a7ab4', '#f2c432'][t - 1] || '#8a6a3a';
    return `<g stroke-linecap="round"><path d="M8 58L36 30" stroke="#6a4a2a" stroke-width="4"/><ellipse cx="44" cy="22" rx="${12 + t}" ry="${10 + t}" fill="#f4f0e6" fill-opacity="0.6" stroke="${hoop}" stroke-width="2.6" transform="rotate(-40 44 22)"/><path d="M34 28Q46 40 56 18" stroke="${_gfaDk(hoop, 0.1)}" stroke-width="0.9" fill="none" opacity="0.6"/><path d="M38 20Q46 30 52 14M44 12Q42 28 48 32" stroke="${_gfaDk(hoop, 0.1)}" stroke-width="0.7" fill="none" opacity="0.5"/></g>`;
  }
  if (kind === 'bait') {
    const col = { worm: '#d88a8a', dough: '#f0dca8', maggot: '#f4ecc8', 'glow-lure': '#7affb4', 'golden-fly': '#f2c432' }[id] || '#d88a8a';
    if (id === 'golden-fly') return `<g><path d="M14 40Q32 14 50 40Q32 34 14 40z" fill="${col}" stroke="${_gfaDk(col, 0.4)}" stroke-width="1.4"/><circle cx="32" cy="38" r="5" fill="#a8761a"/><path d="M32 43v12" stroke="#a8a8a0" stroke-width="2"/></g>`;
    if (id === 'glow-lure') return `<g><ellipse cx="32" cy="34" rx="22" ry="22" fill="${col}" fill-opacity="0.22"/><path d="M20 44Q32 14 44 44Z" fill="${col}" stroke="#2a8a5a" stroke-width="1.6"/><circle cx="32" cy="30" r="4" fill="#ffffff" fill-opacity="0.8"/><path d="M32 46v10" stroke="#a8a8a0" stroke-width="2"/></g>`;
    if (id === 'worm') return `<g fill="none" stroke-linecap="round"><path d="M12 44Q20 24 28 40T44 34T54 42" stroke="${_gfaDk(col, 0.3)}" stroke-width="7"/><path d="M12 44Q20 24 28 40T44 34T54 42" stroke="${col}" stroke-width="5"/><path d="M26 40q3 -3 6 0M40 36q3 -3 6 1" stroke="${_gfaLt(col, 0.4)}" stroke-width="1.4"/></g>`;
    return `<g><rect x="14" y="22" width="36" height="30" rx="6" fill="#c8a46a" stroke="#7a5a34" stroke-width="1.6"/><rect x="10" y="18" width="44" height="8" rx="3" fill="#a8845a" stroke="#7a5a34" stroke-width="1.4"/>${id === 'dough' ? `<circle cx="26" cy="38" r="5.6" fill="${col}"/><circle cx="38" cy="40" r="6.4" fill="${col}"/>` : `<g fill="${col}"><ellipse cx="24" cy="38" rx="3.6" ry="1.8"/><ellipse cx="36" cy="36" rx="3.6" ry="1.8" transform="rotate(30 36 36)"/><ellipse cx="32" cy="44" rx="3.6" ry="1.8"/><ellipse cx="42" cy="42" rx="3.6" ry="1.8" transform="rotate(-30 42 42)"/></g>`}</g>`;
  }
  if (kind === 'bobber') {
    const d = gardenBobberDef(id);
    return `<g><path d="M32 6v10" stroke="#a8a8a0" stroke-width="2"/><circle cx="32" cy="34" r="17" fill="${d.c}" stroke="${_gfaDk(d.c, 0.4)}" stroke-width="1.6"/><path d="M15.4 30Q32 40 48.6 30Q48 18 32 17Q16 18 15.4 30Z" fill="${d.c2}"/><ellipse cx="25" cy="26" rx="4" ry="2.4" fill="#ffffff" fill-opacity="0.7" transform="rotate(-30 25 26)"/><path d="M32 51v8" stroke="#a8a8a0" stroke-width="2"/></g>`;
  }
  return '';
}

/** Any of them as a standalone <svg>. kind: 'fish' | 'bug' | 'rod' | 'net' | 'bait' | 'bobber'. */
function gardenCatchSvg(kind, id, px, o) {
  o = Object.assign({ uid: 'ci' + (gardenHash(kind + id) % 99999).toString(36) }, o || {});
  px = px || 48;
  if (kind === 'fish') {
    const f = gardenFishDef(id); if (!f) return '';
    const big = f.cat === 'fish';
    return `<svg class="gd-catch-ico" viewBox="${big ? '-46 -28 92 56' : '-32 -28 64 56'}" width="${px}" height="${Math.round(px * (big ? 56 / 92 : 0.875))}" aria-hidden="true" focusable="false"${o.silhouette ? ' style="filter:brightness(0) opacity(.3)"' : ''}>${gardenFishArt(id, o)}</svg>`;
  }
  if (kind === 'bug') { if (!gardenBugDef(id)) return ''; return `<svg class="gd-catch-ico" viewBox="-22 -20 44 40" width="${px}" height="${Math.round(px * 40 / 44)}" aria-hidden="true" focusable="false"${o.silhouette ? ' style="filter:brightness(0) opacity(.3)"' : ''}>${gardenBugArt(id, o)}</svg>`; }
  return `<svg class="gd-catch-ico" viewBox="0 0 64 64" width="${px}" height="${px}" aria-hidden="true" focusable="false">${gardenGearArt(kind, id, o)}</svg>`;
}
