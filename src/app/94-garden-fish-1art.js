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

/* ---------- fish (2.23: plump, big-eyed, flat tones; a book of them should make you smile) ---------- */
/* shape tables: L length, H half-height (max), pt tail-root half-thickness, sn snout taper, bel belly fullness, tail kind, dorsal {x0, x1, h}, anal, eye size */
const _GFA_SHAPES = {
  slim: { L: 62, H: 13, pt: 3, sn: 13, bel: 0.92, tail: 'fork', dor: [-0.1, 0.16, 7], ana: [-0.24, -0.04, 5], eye: 3.4, eyeX: 0.3 },
  round: { L: 56, H: 20, pt: 3.6, sn: 13, bel: 1.0, tail: 'fork', dor: [-0.24, 0.16, 9], ana: [-0.24, 0.0, 7], eye: 4.2, eyeX: 0.26 },
  flat: { L: 54, H: 24, pt: 3.4, sn: 12, bel: 1.0, tail: 'fork', dor: [-0.2, 0.12, 9], ana: [-0.3, 0.08, 9], eye: 4.2, eyeX: 0.25 },
  carp: { L: 62, H: 19, pt: 4.2, sn: 13, bel: 0.98, tail: 'fork', dor: [-0.3, 0.16, 10], ana: [-0.24, -0.04, 5], eye: 3.8, eyeX: 0.29, barb: 1 },
  koi: { L: 62, H: 18, pt: 3.6, sn: 13, bel: 0.96, tail: 'fan', dor: [-0.28, 0.12, 8], ana: [-0.24, -0.04, 5], eye: 3.8, eyeX: 0.29 },
  fancy: { L: 44, H: 20, pt: 3.2, sn: 11, bel: 1.06, tail: 'veil', dor: [-0.2, 0.18, 12], ana: [-0.22, 0, 9], eye: 4.6, eyeX: 0.24 },
  pike: { L: 72, H: 11.5, pt: 3.4, sn: 18, bel: 0.86, tail: 'fork', dor: [-0.4, -0.2, 8], ana: [-0.38, -0.2, 7], eye: 3.2, eyeX: 0.28 },
  eel: { L: 78, H: 6.5, pt: 3.4, sn: 7, bel: 0.9, tail: 'none', dor: [-0.45, 0.28, 3.4], ana: [-0.45, 0.1, 3], eye: 2.8, eyeX: 0.44 },
  cat: { L: 64, H: 17, pt: 3.4, sn: 8, bel: 0.96, tail: 'fan', dor: [-0.04, 0.12, 7], ana: [-0.34, 0.02, 6], eye: 3, eyeX: 0.32, barb: 4, flatHead: 1 },
  sturgeon: { L: 74, H: 13, pt: 3, sn: 20, bel: 0.82, tail: 'shark', dor: [-0.32, -0.14, 7], ana: [-0.3, -0.16, 5], eye: 2.8, eyeX: 0.24, barb: 2 },
  angler: { L: 52, H: 24, pt: 3.4, sn: 6, bel: 1.0, tail: 'fan', dor: [-0.26, 0.1, 9], ana: [-0.22, 0.0, 6], eye: 5, eyeX: 0.26, lure: 1 },
  crayfish: { L: 60, H: 9, pt: 4, sn: 8, bel: 1, tail: 'none', dor: [0, 0, 0], ana: [0, 0, 0], eye: 1.6, eyeX: 0.4 },
  torpedo: { L: 70, H: 14, pt: 2.6, sn: 15, bel: 0.9, tail: 'shark', dor: [-0.12, 0.08, 9], ana: [-0.3, -0.16, 5], eye: 3.4, eyeX: 0.32 },
  disc: { L: 44, H: 26, pt: 3, sn: 10, bel: 1.0, tail: 'fan', dor: [-0.3, 0.2, 7], ana: [-0.3, 0.14, 7], eye: 4.6, eyeX: 0.24 },
  tall: { L: 38, H: 22, pt: 2.6, sn: 8, bel: 1.0, tail: 'fan', dor: [-0.3, 0.14, 20], ana: [-0.3, 0.1, 18], eye: 4.2, eyeX: 0.24 },
  chunky: { L: 60, H: 22, pt: 4, sn: 9, bel: 1.02, tail: 'round', dor: [-0.32, 0.14, 8], ana: [-0.26, -0.02, 6], eye: 3.8, eyeX: 0.3 },
  needle: { L: 78, H: 7, pt: 2.6, sn: 24, bel: 0.9, tail: 'round', dor: [-0.42, -0.26, 6], ana: [-0.42, -0.26, 5], eye: 2.8, eyeX: 0.26 },
  loach: { L: 60, H: 8, pt: 3.4, sn: 7, bel: 0.86, tail: 'round', dor: [-0.12, 0.04, 5], ana: [-0.3, -0.18, 3.6], eye: 2.6, eyeX: 0.36, barb: 3 },
  goby: { L: 46, H: 11, pt: 2.6, sn: 7, bel: 1.0, tail: 'round', dor: [-0.3, 0.12, 8], ana: [-0.24, -0.04, 5], eye: 4.4, eyeX: 0.28 },
  herring: { L: 56, H: 11, pt: 2.4, sn: 12, bel: 1.0, tail: 'fork', dor: [-0.08, 0.1, 6], ana: [-0.3, -0.18, 3.6], eye: 4, eyeX: 0.3 },
  puffer: { L: 42, H: 21, pt: 2.6, sn: 8, bel: 1.08, tail: 'fan', dor: [-0.34, -0.14, 5], ana: [-0.34, -0.16, 4], eye: 5.4, eyeX: 0.22, spike: 1 },
  hump: { L: 62, H: 23, pt: 3.6, sn: 15, bel: 0.86, tail: 'fork', dor: [-0.3, 0.1, 8], ana: [-0.24, -0.06, 6], eye: 3.4, eyeX: 0.31 },
  paddle: { L: 56, H: 12, pt: 2.6, sn: 9, bel: 0.9, tail: 'shark', dor: [-0.32, -0.16, 8], ana: [-0.3, -0.16, 5], eye: 2.6, eyeX: 0.3, paddle: 1 },
  shark: { L: 76, H: 13, pt: 2.6, sn: 20, bel: 0.85, tail: 'shark', dor: [-0.1, 0.06, 16], ana: [-0.32, -0.24, 5], eye: 2.6, eyeX: 0.34, gill: 1 },
  mola: { L: 44, H: 28, pt: 8, sn: 8, bel: 1.0, tail: 'round', dor: [-0.34, -0.14, 22], ana: [-0.34, -0.14, 20], eye: 4.2, eyeX: 0.24 },
};
function _gfaBody(S) {
  const L = S.L, H = S.H, x0 = -L / 2, x1 = L / 2, pt = S.pt, sn = S.sn, b = S.bel;
  return `M${_gfaN(x0)} ${-pt}C${_gfaN(x0 + L * 0.2)} ${_gfaN(-H * 0.86)} ${_gfaN(x0 + L * 0.52)} ${_gfaN(-H * 1.16)} ${_gfaN(x1 - sn)} ${_gfaN(-H * 0.62)}`
    + `Q${_gfaN(x1 + 0.6)} ${_gfaN(-H * 0.34)} ${_gfaN(x1)} ${_gfaN(H * 0.02)}Q${_gfaN(x1 + 0.4)} ${_gfaN(H * 0.36 * b)} ${_gfaN(x1 - sn)} ${_gfaN(H * 0.66 * b)}`
    + `C${_gfaN(x0 + L * 0.52)} ${_gfaN(H * 1.16 * b)} ${_gfaN(x0 + L * 0.2)} ${_gfaN(H * 0.84 * b)} ${_gfaN(x0)} ${pt}Z`;
}
function _gfaTail(S, fin, edge) {
  const x0 = -S.L / 2, pt = S.pt, H = S.H, t = S.tail, A = `fill="${fin}" stroke="${edge}" stroke-width="1" stroke-linejoin="round"`;
  if (t === 'none') return '';
  if (t === 'fork') return `<path d="M${_gfaN(x0 + 3)} ${-pt}C${_gfaN(x0 - 6)} ${_gfaN(-H * 0.5)} ${_gfaN(x0 - 15)} ${_gfaN(-H * 1.02)} ${_gfaN(x0 - 16)} ${_gfaN(-H * 0.72)}Q${_gfaN(x0 - 10)} 0 ${_gfaN(x0 - 16)} ${_gfaN(H * 0.72)}C${_gfaN(x0 - 15)} ${_gfaN(H * 1.02)} ${_gfaN(x0 - 6)} ${_gfaN(H * 0.5)} ${_gfaN(x0 + 3)} ${pt}Z" ${A}/>`;
  if (t === 'fan') return `<path d="M${_gfaN(x0 + 3)} ${-pt}C${_gfaN(x0 - 10)} ${_gfaN(-H * 1.06)} ${_gfaN(x0 - 18)} ${_gfaN(-H * 0.6)} ${_gfaN(x0 - 16)} 0C${_gfaN(x0 - 18)} ${_gfaN(H * 0.6)} ${_gfaN(x0 - 10)} ${_gfaN(H * 1.06)} ${_gfaN(x0 + 3)} ${pt}Z" ${A}/>`;
  if (t === 'shark') return `<path d="M${_gfaN(x0 + 3)} ${-pt}L${_gfaN(x0 - 14)} ${_gfaN(-H * 1.3)}Q${_gfaN(x0 - 11)} ${_gfaN(-H * 0.4)} ${_gfaN(x0 - 7)} 0L${_gfaN(x0 - 10)} ${_gfaN(H * 0.7)}L${_gfaN(x0 + 3)} ${pt}Z" ${A}/>`;
  const t2 = _gfaTail2(t, x0, pt, H, A); if (t2) return t2;
  // veil: a flowing double tail
  return `<path class="gfa-tail" d="M${_gfaN(x0 + 4)} ${-pt}C${_gfaN(x0 - 6)} ${_gfaN(-H * 1.5)} ${_gfaN(x0 - 22)} ${_gfaN(-H * 1.2)} ${_gfaN(x0 - 18)} ${_gfaN(-H * 0.2)}C${_gfaN(x0 - 13)} ${_gfaN(H * 0.1)} ${_gfaN(x0 - 23)} ${_gfaN(H * 0.7)} ${_gfaN(x0 - 15)} ${_gfaN(H * 1.3)}C${_gfaN(x0 - 6)} ${_gfaN(H * 1.3)} ${_gfaN(x0 + 1)} ${_gfaN(H * 0.5)} ${_gfaN(x0 + 4)} ${pt}Z" ${A}/>`;
}
function _gfaPattern(look, S, rnd) {
  const p = look.p, L = S.L, H = S.H, x0 = -L / 2;
  const dark = _gfaDk(look.c, 0.42), light = _gfaLt(look.c, 0.4), mark = look.c3 || dark;
  let s = '';
  const dots = (n, r0, r1, col, op) => { let d = ''; for (let i = 0; i < n; i++) { const x = x0 + L * (0.24 + rnd() * 0.5), y = (rnd() - 0.62) * H * 1.2, R = r0 + rnd() * (r1 - r0); d += `M${_gfaN(x - R)} ${_gfaN(y)}a${_gfaN(R)} ${_gfaN(R)} 0 1 0 ${_gfaN(R * 2)} 0a${_gfaN(R)} ${_gfaN(R)} 0 1 0 ${_gfaN(-R * 2)} 0z`; } return `<path d="${d}" fill="${col}"${op ? ` fill-opacity="${op}"` : ''}/>`; };
  switch (p) {
    case 'bars': { let d = ''; for (let i = 0; i < 4; i++) { const x = x0 + L * (0.26 + i * 0.15); d += `M${_gfaN(x)} ${_gfaN(-H * 1.1)}Q${_gfaN(x + 3)} 0 ${_gfaN(x - 1)} ${_gfaN(H * 0.5)}`; } s += `<path d="${d}" stroke="${look.c3 && /^#(2|3|4|5)/.test(look.c3) ? look.c3 : dark}" stroke-width="${_gfaN(H * 0.28)}" stroke-opacity="0.6" stroke-linecap="round" fill="none"/>`; break; }
    case 'stripe': s += `<path d="M${_gfaN(x0 + L * 0.06)} ${_gfaN(H * 0.04)}Q${_gfaN(x0 + L * 0.5)} ${_gfaN(-H * 0.1)} ${_gfaN(x0 + L * 0.84)} ${_gfaN(-H * 0.02)}" stroke="${mark}" stroke-width="${_gfaN(Math.max(2.6, H * 0.34))}" fill="none" stroke-linecap="round"/>`; break;
    case 'spots': s += dots(8, 1.4, 2.4, mark); break;
    case 'speckle': s += dots(11, 0.9, 1.4, mark); break;
    case 'patches': for (let i = 0; i < 3; i++) { const cx = x0 + L * (0.32 + i * 0.2 + rnd() * 0.05), cy = (rnd() - 0.7) * H * 0.8; s += `<ellipse cx="${_gfaN(cx)}" cy="${_gfaN(cy)}" rx="${_gfaN(6.5 + rnd() * 4)}" ry="${_gfaN(5 + rnd() * 3)}" fill="${look.c2}" transform="rotate(${Math.round((rnd() - 0.5) * 50)} ${_gfaN(cx)} ${_gfaN(cy)})"/>`; } break;
    case 'scales': { let d = ''; for (let r = -1; r <= 1; r++) for (let c = 0; c < 4; c++) { const cx = x0 + L * 0.3 + c * 8.4 + (r % 2 ? 4 : 0), cy = r * 7 - 2; d += `M${_gfaN(cx)} ${_gfaN(cy - 3.4)}q4 3.4 0 6.8`; } s += `<path d="${d}" stroke="${dark}" stroke-width="1.1" stroke-opacity="0.5" stroke-linecap="round" fill="none"/>`; break; }
    case 'mirror': for (let i = 0; i < 4; i++) s += `<ellipse cx="${_gfaN(x0 + L * (0.3 + i * 0.13))}" cy="${_gfaN((rnd() - 0.65) * H)}" rx="${_gfaN(3.6 + rnd() * 2)}" ry="${_gfaN(3 + rnd() * 1.6)}" fill="${light}" fill-opacity="0.75" stroke="${dark}" stroke-width="0.7" stroke-opacity="0.5"/>`; break;
    case 'scutes': { let d = ''; for (let i = 0; i < 6; i++) { const x = x0 + L * (0.16 + i * 0.1); d += `M${_gfaN(x)} ${_gfaN(-H * 0.28)}l3 -3.4 3 3.4z`; } s += `<path d="${d}" fill="${mark}"/>`; break; }
    case 'glow': s += `<ellipse cx="${_gfaN(x0 + L * 0.5)}" cy="0" rx="${_gfaN(L * 0.34)}" ry="${_gfaN(H * 0.72)}" fill="${look.c2}" fill-opacity="0.55"/>`; break;
    default: s += _gfaPattern2(p, look, S, rnd); break;
  }
  return s;
}
function gardenFishArt(id, o) {
  o = o || {};
  const f = gardenFishDef(id);
  if (!f) return '';
  const look = f.look, uid = _gfaUid(o, id), rnd = _gfaRng('fish|' + id);
  if (f.cat !== 'fish') return _gfaFind(f, uid);
  const S0 = _GFA_SHAPES[look.s] || _GFA_SHAPES.slim;
  if (look.s === 'crayfish') return _gfaCrayfish(look);
  const own = _gfaCustom(look, rnd); if (own) return own;
  const S = Object.assign({}, S0, look.k ? { L: S0.L * look.k[0], H: S0.H * look.k[1] } : null, look.t ? { tail: look.t } : null);
  const body = _gfaBody(S), edge = _gfaDk(look.c, 0.5);
  const fin = look.s === 'koi' || look.s === 'fancy' ? _gfaMix(look.c2 === look.c ? look.c : look.c2, '#ffffff', 0.25) : _gfaMix(look.c, look.c3 || look.c2, 0.45);
  const finc = (look.p === 'belly' && look.c3) ? _gfaMix(look.c, look.c3, 0.5) : fin;
  const x0 = -S.L / 2, x1 = S.L / 2, H = S.H, finLine = `stroke="${edge}" stroke-width="1" stroke-linejoin="round"`;
  let s = '<g class="gfa-fish">';
  // fins behind the body: dorsal, anal, tail
  const sail = look.p === 'sail' || look.d === 'sail';
  const dx0 = x0 + S.L * (0.5 + S.dor[0]), dx1 = x0 + S.L * (0.5 + S.dor[1]), dh = S.dor[2] * (sail ? 1.9 : 1.1);
  const dor2 = S.dor[2] ? _gfaDorsal2(look.d, dx0, dx1, H, dh, finc, finLine) : '';
  if (dor2) s += dor2;
  else if (S.dor[2]) s += `<path d="M${_gfaN(dx0)} ${_gfaN(-H * 0.76)}C${_gfaN(dx0 + 2)} ${_gfaN(-H - dh)} ${_gfaN(dx1)} ${_gfaN(-H - dh * 0.9)} ${_gfaN(dx1 + 2)} ${_gfaN(-H * 0.7)}Z" fill="${finc}" ${finLine}/>`;
  if (S.ana[2]) s += `<path d="M${_gfaN(x0 + S.L * (0.5 + S.ana[0]))} ${_gfaN(H * 0.72 * S.bel)}q${_gfaN(S.L * 0.05)} ${_gfaN(S.ana[2] * 1.3)} ${_gfaN(S.L * (S.ana[1] - S.ana[0]))} ${_gfaN(S.ana[2] * 0.1)}z" fill="${finc}" ${finLine}/>`;
  s += _gfaTail(S, finc, edge);
  if (look.s === 'eel') {
    // a ribbon with a gentle S, and a friendly round head
    const d = `M${x0} 1C${_gfaN(x0 + 16)} -10 ${_gfaN(x0 + 28)} 10 ${_gfaN(x0 + 46)} 1S${_gfaN(x1 - 10)} -4 ${_gfaN(x1 - 6)} -2`;
    s += `<path d="${d}" stroke="${edge}" stroke-width="${_gfaN(S.H * 2 + 1.6)}" stroke-linecap="round" fill="none"/><path d="${d}" stroke="${look.c}" stroke-width="${_gfaN(S.H * 2 - 0.4)}" stroke-linecap="round" fill="none"/><path d="M${x0 + 2} 3C${_gfaN(x0 + 16)} -7 ${_gfaN(x0 + 28)} 13 ${_gfaN(x0 + 46)} 4S${_gfaN(x1 - 10)} 0 ${_gfaN(x1 - 6)} 1" stroke="${look.c2}" stroke-width="${_gfaN(S.H * 0.7)}" stroke-linecap="round" fill="none"/>` + _gfaEelMarks(look, x0) + (look.x === 'frill' ? `<path d="M${_gfaN(x1 - 10)} -7l-3 -7M${_gfaN(x1 - 6)} -7l0 -8M${_gfaN(x1 - 2)} -6l3 -7" stroke="${look.c3}" stroke-width="2.2" stroke-linecap="round"/>` : '') + (look.m === 'tube' ? `<circle cx="${_gfaN(x1 - 1)}" cy="0" r="2.6" fill="${_gfaDk(look.c, 0.2)}" stroke="${edge}" stroke-width="0.9"/>` : '');
    s += `<circle cx="${_gfaN(x1 - 5)}" cy="-2.4" r="3.4" fill="#fbf8ee" stroke="${edge}" stroke-width="0.7"/><circle cx="${_gfaN(x1 - 4.2)}" cy="-2.4" r="2.1" fill="#1a1712"/><circle cx="${_gfaN(x1 - 3.5)}" cy="-3.3" r="0.8" fill="#ffffff"/>`;
    return s + '</g>';
  }
  // the body, a darker back and a pale belly in flat tones, the pattern, a soft highlight: all kept inside the outline
  s += `<defs><clipPath id="${uid}-k"><path d="${body}"/></clipPath></defs><path d="${body}" fill="${look.c}" stroke="${edge}" stroke-width="1.3" stroke-linejoin="round"/>`;
  s += `<g clip-path="url(#${uid}-k)"><path d="M${_gfaN(x0)} ${_gfaN(-H * 1.3)}H${_gfaN(x1 + 2)}V${_gfaN(-H * 0.4)}Q${_gfaN(x0 + S.L * 0.5)} ${_gfaN(-H * 0.5)} ${_gfaN(x0)} ${_gfaN(-H * 0.05)}z" fill="${_gfaDk(look.c, 0.2)}" fill-opacity="0.55"/>`;
  s += _gfaPattern(look, S, rnd);
  s += `<path d="M${_gfaN(x0)} ${_gfaN(H * 0.2)}Q${_gfaN(x0 + S.L * 0.5)} ${_gfaN(H * 0.26)} ${_gfaN(x1 + 1)} ${_gfaN(H * 0.04)}V${_gfaN(H * 1.4)}H${_gfaN(x0)}z" fill="${look.c2}"/>`;
  s += `<path d="M${_gfaN(x0 + S.L * 0.3)} ${_gfaN(-H * 0.62)}Q${_gfaN(x0 + S.L * 0.5)} ${_gfaN(-H * 0.82)} ${_gfaN(x0 + S.L * 0.68)} ${_gfaN(-H * 0.68)}" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>`;
  // cheek line, a little pectoral fin, a big kind eye, a smile
  const gx = x1 - S.L * 0.27;
  s += `<path d="M${_gfaN(gx)} ${_gfaN(-H * 0.46)}Q${_gfaN(gx - 3.4)} ${_gfaN(H * 0.02)} ${_gfaN(gx)} ${_gfaN(H * 0.5 * S.bel)}" stroke="${edge}" stroke-width="1" fill="none" stroke-opacity="0.55" stroke-linecap="round"/>`;
  s += `<path d="M${_gfaN(gx - 2.4)} ${_gfaN(H * 0.2)}q${_gfaN(-S.L * 0.09)} ${_gfaN(H * 0.2)} ${_gfaN(-S.L * 0.15)} ${_gfaN(H * 0.44)}q${_gfaN(S.L * 0.08)} ${_gfaN(H * 0.1)} ${_gfaN(S.L * 0.15)} ${_gfaN(-H * 0.44)}z" fill="${finc}" stroke="${edge}" stroke-width="0.9" stroke-linejoin="round"/>`;
  const ex = x0 + S.L * (S.eyeX + 0.5), ey = -H * 0.24;
  s += `<circle cx="${_gfaN(ex)}" cy="${_gfaN(ey)}" r="${S.eye}" fill="#fbf8ee" stroke="${edge}" stroke-width="0.8"/><circle cx="${_gfaN(ex + S.eye * 0.2)}" cy="${_gfaN(ey + S.eye * 0.06)}" r="${_gfaN(S.eye * 0.66)}" fill="#1a1712"/><circle cx="${_gfaN(ex + S.eye * 0.44)}" cy="${_gfaN(ey - S.eye * 0.26)}" r="${_gfaN(S.eye * 0.24)}" fill="#ffffff"/>`;
  if (look.m !== 'tube') s += `<path d="M${_gfaN(x1 - 1.2)} ${_gfaN(H * 0.16)}q${_gfaN(-2.6)} ${_gfaN(2.6)} ${_gfaN(-5.6)} 1.2" stroke="${edge}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
  s += _gfaFishMore(look, S, edge, x0, x1);
  if (S.barb) { const n = S.barb; for (let i = 0; i < n; i++) s += `<path d="M${_gfaN(x1 - 2.6)} ${_gfaN(H * 0.28)}q${_gfaN(2.4 + i * 0.4)} ${_gfaN(4 + i)} ${_gfaN(-2 - i * 1.8)} ${_gfaN(6 + i * 0.6)}" stroke="${edge}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`; }
  if (S.lure) s += `<path d="M${_gfaN(x1 - 12)} ${_gfaN(-H * 0.86)}Q${_gfaN(x1 + 1)} ${_gfaN(-H * 1.5)} ${_gfaN(x1 + 4)} ${_gfaN(-H * 0.86)}" stroke="${edge}" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="${_gfaN(x1 + 4)}" cy="${_gfaN(-H * 0.8)}" r="8" fill="${look.c3}" fill-opacity="0.26"/><circle cx="${_gfaN(x1 + 4)}" cy="${_gfaN(-H * 0.8)}" r="3.8" fill="${look.c3}" stroke="${edge}" stroke-width="0.7"/>`;
  if (look.p === 'glow') s += `<ellipse cx="0" cy="0" rx="${_gfaN(S.L * 0.66)}" ry="${_gfaN(H * 1.4)}" fill="${look.c2}" fill-opacity="0.18"/>`;
  return s + '</g>';
}
function _gfaCrayfish(look) {
  const c = look.c, c2 = look.c2, e = _gfaDk(c, 0.45), L = `stroke="${e}" stroke-width="1.2" stroke-linejoin="round"`;
  let s = '<g class="gfa-fish">';
  s += `<path d="M-10 -7l-3 -8M-2 -8l-1 -9M6 -8l1 -8M-10 7l-3 8M-2 8l-1 9M6 8l1 8" stroke="${e}" stroke-width="2.2" stroke-linecap="round" fill="none"/>`;
  s += `<path d="M-30 0Q-38 -8 -33 -13Q-24 -11 -20 -3M-30 0Q-38 8 -33 13Q-24 11 -20 3" fill="${c2}" ${L}/>`;
  s += `<path d="M14 -5Q22 -16 34 -14Q41 -10 36 -6Q32 -8 29 -6Q33 -3 29 -1L18 -1zM14 5Q22 16 34 14Q41 10 36 6Q32 8 29 6Q33 3 29 1L18 1z" fill="${c2}" ${L}/>`;
  s += `<path d="M-26 0C-26 -9 -10 -11 4 -9 14 -8 22 -5 24 0 22 5 14 8 4 9 -10 11 -26 9 -26 0Z" fill="${c}" ${L}/>`;
  s += `<path d="M-20 -7q3 7 0 14M-13 -8q3 8 0 16M-6 -9q3 9 0 18" stroke="${e}" stroke-width="1" stroke-opacity="0.55" fill="none" stroke-linecap="round"/><path d="M-18 -5Q-4 -8 14 -4" stroke="#ffffff" stroke-opacity="0.45" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  s += `<circle cx="17" cy="-4" r="3" fill="#fbf8ee" stroke="${e}" stroke-width="0.7"/><circle cx="17.6" cy="-4" r="1.9" fill="#1a1712"/><circle cx="17" cy="4" r="3" fill="#fbf8ee" stroke="${e}" stroke-width="0.7"/><circle cx="17.6" cy="4" r="1.9" fill="#1a1712"/>`;
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

/* ---------- bugs (2.23: seen from above, chunky and cute: they draw small in the garden, so no thin line anywhere) ---------- */
/** Big eyes on a round head at (x, 0), radius r, looking the way the bug faces (right). */
function _gfaEyes(x, r, e) { const R = r * 0.42, y = r * 0.52; return `<circle cx="${_gfaN(x + r * 0.34)}" cy="${_gfaN(-y)}" r="${_gfaN(R)}" fill="#fbf8ee" stroke="${e}" stroke-width="0.5"/><circle cx="${_gfaN(x + r * 0.34)}" cy="${_gfaN(y)}" r="${_gfaN(R)}" fill="#fbf8ee" stroke="${e}" stroke-width="0.5"/><circle cx="${_gfaN(x + r * 0.46)}" cy="${_gfaN(-y)}" r="${_gfaN(R * 0.62)}" fill="#1a1712"/><circle cx="${_gfaN(x + r * 0.46)}" cy="${_gfaN(y)}" r="${_gfaN(R * 0.62)}" fill="#1a1712"/>`; }
/** Two short, thick feelers with a knob, from a head at x. */
function _gfaFeel(x, e, r, k) { const K = k || 1; return `<path d="M${_gfaN(x)} ${_gfaN(-r * 0.5)}q${_gfaN(3 * K)} ${_gfaN(-2.4 * K)} ${_gfaN(5 * K)} ${_gfaN(-4.2 * K)}M${_gfaN(x)} ${_gfaN(r * 0.5)}q${_gfaN(3 * K)} ${_gfaN(2.4 * K)} ${_gfaN(5 * K)} ${_gfaN(4.2 * K)}" stroke="${e}" stroke-width="1.5" stroke-linecap="round" fill="none"/><circle cx="${_gfaN(x + 5 * K)}" cy="${_gfaN(-r * 0.5 - 4.2 * K)}" r="1.3" fill="${e}"/><circle cx="${_gfaN(x + 5 * K)}" cy="${_gfaN(r * 0.5 + 4.2 * K)}" r="1.3" fill="${e}"/>`; }
/** Six short legs, mirrored. pts: pairs of [x, y, dx, dy]. */
function _gfaLegs(pts, e, w) { let d = ''; for (const [x, y, dx, dy] of pts) d += `M${x} ${y}l${dx} ${dy}M${x} ${-y}l${dx} ${-dy}`; return `<path d="${d}" stroke="${e}" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`; }
function _gfaWing(c, c2, c3, p, e, fore, w) {
  // one side's wing above the body (the caller mirrors it): big, round forewings over small hindwings
  const line = `stroke="${e}" stroke-width="1" stroke-linejoin="round"`;
  if (!fore) return `<path d="M-1 -1C-5 -3 -17 -3 -17 -9C-17 -14 -9 -14 -5 -9C-3 -6 -1 -3 -1 -1Z" fill="${_gfaMix(c, c2, 0.14)}" ${line}/>` + (p === 'dots' || p === 'eyes' ? `<circle cx="-12" cy="-9" r="1.9" fill="${c3}"/>` : '') + (p === 'tails' ? `<path d="M-15 -5q-4 3 -5 8" stroke="${c}" stroke-width="2.6" fill="none" stroke-linecap="round"/>` : '');
  const fo = p === 'glass' ? ' fill-opacity="0.45"' : '';
  let s = w === 'scallop' ? `<path d="M3 -1C7 -6 6 -9 5 -11C6 -13 4 -15 3 -16C1 -19 -2 -17 -4 -19C-7 -17 -9 -19 -11 -16C-13 -13 -11 -9 -3 -1Z" fill="${c}"${fo} ${line}/>` : `<path d="M3 -1C7 -9 4 -19 -5 -19C-13 -19 -14 -9 -3 -1Z" fill="${c}"${fo} ${line}/>`;
  if (p === 'check') s += `<path d="M1 -6h2M-4 -6h2M-9 -7h2M1 -11h2M-4 -11h2M-9 -11h2M-4 -16h2" stroke="${c2}" stroke-width="2.6" stroke-linecap="round"/>`;
  else if (p === 'stripe') s += `<path d="M3 -5L-9 -8M3 -10L-11 -12M1 -15L-10 -16" stroke="${c2}" stroke-width="2.2" stroke-linecap="round"/>`;
  else if (p === 'marble') s += `<ellipse cx="-1" cy="-7" rx="3.4" ry="2.4" fill="${c2}"/><ellipse cx="-7" cy="-11" rx="3" ry="2.2" fill="${c2}"/><ellipse cx="0" cy="-15" rx="2.8" ry="2" fill="${c2}"/>`;
  else if (p === 'ring') s += `<circle cx="-3" cy="-12" r="3.4" fill="none" stroke="${c2}" stroke-width="1.8"/><circle cx="-3" cy="-12" r="1" fill="${c2}"/><circle cx="1.5" cy="-7" r="1.3" fill="none" stroke="${c2}" stroke-width="1.2"/>`;
  else if (p === 'glass') s += `<path d="M3 -3C5 -9 3 -17 -5 -18C-12 -18 -12 -10 -3 -2" stroke="${c2}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  else if (p === 'ombre') s += `<path d="M5 -11C5 -16 0 -19 -5 -19C-13 -19 -14 -9 -8 -6Q-2 -11 5 -11Z" fill="${c2}" fill-opacity="0.8"/><circle cx="-6" cy="-12" r="2" fill="${c3}"/>`;
  else if (p === 'spots') s += `<circle cx="-1" cy="-9" r="1.8" fill="${c3}"/><circle cx="-6" cy="-13" r="2.2" fill="${c3}"/><circle cx="1" cy="-15" r="1.4" fill="${c3}"/>`;
  if (p === 'dots') s += `<circle cx="-3" cy="-13" r="2.3" fill="${c2}"/><circle cx="-5" cy="-8" r="1.5" fill="${c2}"/>`;
  else if (p === 'edge') s += `<path d="M5 -8C5 -14 1 -18 -5 -18C-11 -18 -12 -12 -9 -8" stroke="${c2}" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="-3" cy="-15.6" r="1.1" fill="${c3}"/><circle cx="2" cy="-13" r="1.1" fill="${c3}"/>`;
  else if (p === 'tip') s += `<path d="M5 -11C5 -16 0 -19 -5 -19C-9 -19 -11 -16 -11 -13Q-3 -9 5 -11Z" fill="${c2}"/>`;
  else if (p === 'band') s += `<path d="M2 -7Q-2 -12 -9 -13" stroke="${c3}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
  else if (p === 'eyes') s += `<circle cx="-3" cy="-12" r="4" fill="${c3}" stroke="${c2}" stroke-width="1.6"/><circle cx="-3" cy="-12" r="1.5" fill="#1a1a2a"/>`;
  else if (p === 'veins') s += `<path d="M2 -3L-2 -16M0 -3L-8 -13M-1 -2L-9 -8" stroke="${c2}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
  else if (p === 'sheen') s += `<path d="M2 -6C2 -11 -1 -15 -6 -16" stroke="${c3}" stroke-width="3.6" stroke-opacity="0.75" fill="none" stroke-linecap="round"/>`;
  else if (p === 'leaf') s += `<path d="M2 -2L-5 -17" stroke="${c2}" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="-2" cy="-11" r="1.6" fill="${c3}"/>`;
  else if (p === 'tails') s += `<circle cx="-3" cy="-12" r="2.2" fill="${c3}"/><path d="M5 -9C4 -15 0 -18 -5 -18" stroke="${c2}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M-1 -5C-2 -10 -4 -14 -8 -16" stroke="#ffffff" stroke-opacity="0.32" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  return s;
}
function gardenBugArt(id, o) {
  o = o || {};
  const b = gardenBugDef(id);
  if (!b) return '';
  const L = b.look, c = L.c, c2 = L.c2, c3 = L.c3 || c2, e = _gfaDk(c, 0.5), p = L.p || '', line = `stroke="${e}" stroke-width="1.1" stroke-linejoin="round"`;
  let s = '<g class="gba-bug">';
  switch (b.shape) {
    case 'butterfly': {
      const ws = L.w === 'long' ? 'scale(1.3 0.74)' : L.w === 'wide' ? 'scale(1.1 1.16)' : '', wing = (m) => `<g transform="scale(1 ${m})${ws ? ' ' + ws : ''}">${_gfaWing(c, c2, c3, p, e, false, L.w)}${_gfaWing(c, c2, c3, p, e, true, L.w)}</g>`;
      s += `<g class="gba-wings" style="transform-origin:0 0">${wing(1)}${wing(-1)}</g>`;
      const bd = _gfaDk(c2 === c ? '#3a2a1a' : c2, 0.35);
      s += `<ellipse cx="-2.6" cy="0" rx="8.6" ry="2.8" fill="${bd}"/><circle cx="7" cy="0" r="3.4" fill="${bd}"/>${_gfaEyes(7, 3.4, bd)}${_gfaFeel(9, bd, 2.4)}`;
      break;
    }
    case 'moth': {
      const wing = (m) => `<g transform="scale(1 ${m})"><path d="M-1 -1C-5 -4 -16 -5 -16 -10C-15 -13 -8 -12 -4 -8Z" fill="${_gfaMix(c, c2, 0.3)}" ${line}/><path d="M4 -1C8 -9 2 -18 -8 -17C-15 -15 -11 -5 -2 -1Z" fill="${c}" ${line}/>${p === 'tiger' ? `<path d="M1 -5l-3 -4 3 -2 -2 -5M-5 -5l-2 -4 3 -3" stroke="${c2}" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : ''}${p === 'tails' ? `<path d="M-14 -7q-5 3 -6 9" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="-3" cy="-11" r="2.6" fill="${c3}"/>` : ''}${p === 'fur' ? `<path d="M2 -5L-5 -12M3 -2L-7 -7" stroke="${c2}" stroke-width="3" stroke-opacity="0.85" fill="none" stroke-linecap="round"/>` : ''}${p === 'band' ? `<path d="M3 -9Q-3 -14 -11 -13" stroke="${c2}" stroke-width="3" fill="none" stroke-linecap="round"/>` : p === 'stripe' ? `<path d="M2 -4L-8 -7M2 -9L-10 -12" stroke="${c2}" stroke-width="2.2" stroke-linecap="round"/>` : p === 'eyes' || p === 'ring' ? `<circle cx="-3" cy="-11" r="3.4" fill="${c3}" stroke="${c2}" stroke-width="1.4"/><circle cx="-3" cy="-11" r="1.2" fill="${c2}"/>` : p === 'spots' ? `<circle cx="-1" cy="-7" r="2" fill="${c2}"/><circle cx="-6" cy="-12" r="2" fill="${c2}"/><circle cx="1" cy="-13" r="1.6" fill="${c2}"/>` : p === 'speckle' ? `<path d="M1 -6h.1M-3 -9h.1M-7 -12h.1M1 -12h.1M-4 -14h.1M-9 -8h.1" stroke="${c2}" stroke-width="1.8" stroke-linecap="round"/>` : p === 'edge' ? `<path d="M4 -7C5 -13 0 -17 -7 -17" stroke="${c2}" stroke-width="2.2" fill="none" stroke-linecap="round"/>` : ''}</g>`;
      const bd = _gfaMix(c, '#ffffff', 0.25);
      s += `<g class="gba-wings">${wing(1)}${wing(-1)}</g><ellipse cx="-2" cy="0" rx="9" ry="3.8" fill="${bd}" ${line}/><path d="M9 -2Q14 -7 16 -3L12 -3M9 2Q14 7 16 3L12 3" stroke="${e}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="0" r="3.8" fill="${bd}" ${line}/>${_gfaEyes(7, 3.8, e)}`;
      break;
    }
    case 'bee': {
      s += `<g class="gba-wings"><ellipse cx="-1" cy="-9" rx="8" ry="5" fill="${c3}" fill-opacity="0.75" stroke="${e}" stroke-width="0.9" transform="rotate(-18 -1 -9)"/><ellipse cx="-1" cy="9" rx="8" ry="5" fill="${c3}" fill-opacity="0.75" stroke="${e}" stroke-width="0.9" transform="rotate(18 -1 9)"/></g>`;
      s += `<ellipse cx="-3" cy="0" rx="11" ry="8" fill="${c}" ${line}/><path d="M-9 -6.6q3 6.6 0 13.2M-3 -8q3 8 0 16" stroke="${c2}" stroke-width="3.8" fill="none"/>`;
      if (p === 'fur') s += `<circle cx="5" cy="0" r="6" fill="${_gfaLt(c, 0.25)}"/>`;
      else if (p === 'metal') s += _gbMarks('metal', -3, 10, 7, c3, c3);
      s += `<path d="M-9 -4Q-4 -7 2 -5" stroke="#ffffff" stroke-opacity="0.5" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="9" cy="0" r="5" fill="${c2}"/>${_gfaEyes(9, 5, c2)}${_gfaFeel(12, c2, 3.4, 0.8)}`;
      break;
    }
    case 'ladybird':
      s += _gfaLegs([[-5, 9, -2, 4], [1, 10, 0, 4], [6, 9, 2, 4]], c2);
      s += `<path d="M-13 -5Q-12 -13 0 -13Q13 -12 13 0Q13 12 0 13Q-12 13 -13 5Q-14 0 -13 -5Z" fill="${c}" ${line}/><path d="M-13 0H12" stroke="${c2}" stroke-width="1.5"/>`;
      for (const [x, y, r] of p === 'spots2' ? [[-3, -6.4, 3.4], [-3, 6.4, 3.4]] : p === 'spots14' ? [[-9, -5, 1.7], [-4, -9, 1.7], [2, -9.6, 1.7], [7, -6, 1.7], [-3, -4, 1.7], [3, -4, 1.7], [-9, 5, 1.7], [-4, 9, 1.7], [2, 9.6, 1.7], [7, 6, 1.7], [-3, 4, 1.7], [3, 4, 1.7]] : [[-6, -7, 2.6], [3, -8, 2.6], [-6, 7, 2.6], [3, 8, 2.6], [-1, 0, 0]]) if (r) s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c2}"/>`;
      s += `<path d="M-9 -9Q-3 -12 4 -11" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="12" cy="0" r="5.4" fill="${c2}"/>${_gfaEyes(12, 5.4, c2)}`;
      break;
    case 'beetle':
    case 'stag': {
      const stag = b.shape === 'stag', hd = _gfaDk(c, 0.2);
      s += _gfaLegs([[-5, 9, -3, 5], [1, 10, 0, 5], [6, 9, 3, 4]], e, 2.2);
      if (stag) s += `<path d="M13 -4Q20 -11 22 -5Q19 -6 17 -2M13 4Q20 11 22 5Q19 6 17 2" stroke="${c2}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      else s += _gfaFeel(12, e, 3.4, 0.8);
      s += `<path d="M-14 -6Q-14 -12 -3 -12Q8 -12 8 0Q8 12 -3 12Q-14 12 -14 6Z" fill="${c}" ${line}/><path d="M-13 0H7" stroke="${e}" stroke-width="1.1" stroke-opacity="0.7"/><path d="M-10 -7Q-5 -10.5 2 -9" stroke="${c2}" stroke-width="2.4" stroke-opacity="0.9" fill="none" stroke-linecap="round"/>`;
      if (p === 'metal') s += `<ellipse cx="-3" cy="-5" rx="6" ry="3" fill="${c2}" fill-opacity="0.6"/><ellipse cx="-3" cy="5" rx="5" ry="2" fill="${c2}" fill-opacity="0.35"/>`;
      else if (p) s += _gbMarks(p, -3, 10, 11, c2, c3);
      s += `<circle cx="10" cy="0" r="5.6" fill="${hd}" ${line}/>${_gfaEyes(10, 5.6, e)}`;
      break;
    }
    case 'hopper':
    case 'cicada': {
      const ci = b.shape === 'cicada';
      s += `<path d="M-4 -4L-14 -12L-19 -9M-4 4L-14 12L-19 9" stroke="${e}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` + _gfaLegs([[2, 4, 2, 6]], e, 2);
      if (ci) s += `<g class="gba-wings"><ellipse cx="-4" cy="-8" rx="13" ry="5.4" fill="${c2}" fill-opacity="0.8" stroke="${e}" stroke-width="0.9" transform="rotate(-8 -4 -8)"/><ellipse cx="-4" cy="8" rx="13" ry="5.4" fill="${c2}" fill-opacity="0.8" stroke="${e}" stroke-width="0.9" transform="rotate(8 -4 8)"/></g>`;
      s += `<ellipse cx="-3" cy="0" rx="${ci ? 11 : 13}" ry="${ci ? 6.4 : 5}" fill="${c}" ${line}/>`;
      if (!ci) s += `<path d="M-13 0Q-4 -3 7 0" stroke="${c2}" stroke-width="2.4" fill="none" stroke-linecap="round"/>` + (p === 'stripe' ? `<path d="M-11 -3H5M-11 3H5" stroke="${c3}" stroke-width="1.6" stroke-linecap="round"/>` : p === 'band' ? `<path d="M-7 -4.4V4.4M0 -4.6V4.6" stroke="${c3}" stroke-width="2.4"/>` : '');
      s += `<ellipse cx="${ci ? 10 : 11}" cy="0" rx="5" ry="${ci ? 5.4 : 4.6}" fill="${_gfaDk(c, 0.1)}" ${line}/>${_gfaEyes(ci ? 10 : 11, ci ? 5.4 : 4.8, e)}`;
      if (!ci) s += _gfaFeel(14, e, 3, 0.7);
      break;
    }
    case 'snail':
      s += `<path d="M-16 7Q-18 0 -10 -1H10Q19 -1 18 4Q16 8 4 8Z" fill="${c3}" ${line}/><path d="M13 -1Q14 -7 13 -11M17 0Q20 -6 20 -10" stroke="${e}" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="13" cy="-12" r="2.1" fill="#fbf8ee" stroke="${e}" stroke-width="0.6"/><circle cx="13.5" cy="-12" r="1.2" fill="#1a1712"/><circle cx="20" cy="-11" r="2.1" fill="#fbf8ee" stroke="${e}" stroke-width="0.6"/><circle cx="20.5" cy="-11" r="1.2" fill="#1a1712"/>`;
      s += `<circle cx="-3" cy="-4" r="11" fill="${c}" ${line}/><path d="M-3 -4m-7.4 0a7.4 7.4 0 1 1 12 5a4.4 4.4 0 1 1 -6 -4" stroke="${c2}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M-9 -10Q-6 -13 -2 -13" stroke="#ffffff" stroke-opacity="0.55" stroke-width="1.8" fill="none" stroke-linecap="round"/>` + (p === 'stripe' ? `<path d="M-13 -4h20M-11 -9Q-3 -12 5 -9M-11 1Q-3 4 5 1" stroke="${c3}" stroke-width="1.8" fill="none" stroke-linecap="round"/>` : p === 'ring' ? `<circle cx="-3" cy="-4" r="14" fill="${c2}" fill-opacity="0.2"/>` : '');
      break;
    case 'caterpillar':
      for (let i = 0; i < 5; i++) { const x = -15 + i * 6.4, y = i % 2 ? -1 : 1, r = 5.4 - Math.abs(i - 2) * 0.2; s += `<circle cx="${_gfaN(x)}" cy="${y}" r="${_gfaN(r)}" fill="${i % 2 ? c : _gfaLt(c, 0.14)}" ${line}/><circle cx="${_gfaN(x - r * 0.3)}" cy="${_gfaN(y - r * 0.34)}" r="${_gfaN(r * 0.24)}" fill="#ffffff" fill-opacity="0.5"/>`; }
      s += `<circle cx="14" cy="0" r="6" fill="${_gfaDk(c, 0.1)}" ${line}/>${_gfaEyes(14, 6, e)}`;
      break;
    case 'stick':
      s += _gfaLegs([[-8, 2, -4, 8], [0, 2, 1, 8], [8, 2, 5, 7]], e, 2);
      s += `<path d="M-19 0Q-6 -3 4 0T15 0" stroke="${e}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M-19 0Q-6 -3 4 0T15 0" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="16" cy="-0.4" r="3.4" fill="${c}" ${line}/>${_gfaEyes(16, 3.4, e)}`;
      break;
    case 'mantis':
      s += _gfaLegs([[-10, 2, -3, 8], [-4, 2, 0, 8]], e, 2);
      s += `<path d="M-17 0Q-4 -4 7 -1" stroke="${e}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M-17 0Q-4 -4 7 -1" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round"/><ellipse cx="-5" cy="-1.4" rx="9" ry="2.8" fill="${c2}" fill-opacity="0.8"/><path d="M6 -2l6 -8 6 4-4 1-3 3zM6 1l6 8 6 -4-4 -1-3 -3z" fill="${c}" stroke="${e}" stroke-width="1.2" stroke-linejoin="round"/><path d="M9 -5L15 0 9 5Z" fill="${c}" ${line}/>${_gfaEyes(11, 5, e)}`;
      break;
    case 'dragonfly': {
      const big = p === 'big', slim = p === 'slim', wl = big ? 18 : 15, wing = (x, y, rot) => `<ellipse cx="${x}" cy="${_gfaN(y)}" rx="4.4" ry="${_gfaN(wl * 0.6)}" fill="${c3}" fill-opacity="0.72" stroke="${e}" stroke-width="0.9" transform="rotate(${rot} ${x} ${_gfaN(y)})"/>`;
      s += `<g class="gba-wings">${wing(4, -wl * 0.6, -12)}${wing(4, wl * 0.6, 12)}${wing(-3, -wl * 0.55, -8)}${wing(-3, wl * 0.55, 8)}</g>` + (p === 'band' ? `<path d="M1 -14h8M1 14h8" stroke="${c}" stroke-width="5" stroke-linecap="round" stroke-opacity="0.8"/>` : '');
      s += `<path d="M-21 0H6" stroke="${e}" stroke-width="${slim ? 4.6 : 6}" stroke-linecap="round"/><path d="M-21 0H6" stroke="${c}" stroke-width="${slim ? 3 : 4.2}" stroke-linecap="round"/><path d="M-16 0h2.4M-9 0h2.4M-2 0h2.4" stroke="${c2}" stroke-width="${slim ? 3 : 4.2}"/><ellipse cx="6" cy="0" rx="5" ry="4.4" fill="${c2 === '#1a1a2a' ? c : c2}" stroke="${e}" stroke-width="0.9"/><circle cx="11" cy="0" r="4.6" fill="${_gfaLt(c, 0.1)}" stroke="${e}" stroke-width="0.9"/>${_gfaEyes(11, 4.6, e)}`;
      break;
    }
    case 'skater':
      s += _gfaLegs([[-3, 2, -12, 11], [2, 2, 8, 12]], e, 2) + `<path d="M4 0H17" stroke="${e}" stroke-width="2" stroke-linecap="round"/>`;
      s += `<ellipse cx="-2" cy="0" rx="10" ry="4" fill="${c}" ${line}/><circle cx="9" cy="0" r="3.8" fill="${c2}" ${line}/>${_gfaEyes(9, 3.8, e)}`;
      break;
    case 'firefly': {
      const glow = o.glow !== false;
      s += _gfaLegs([[-1, 4, -3, 5], [3, 4, 1, 5]], e, 1.8);
      if (glow) s += `<circle cx="-9" cy="0" r="13" fill="${c2}" fill-opacity="0.26" class="gba-glow"/>`;
      s += `<g class="gba-wings"><ellipse cx="-4" cy="-7" rx="9" ry="4.4" fill="${c3}" fill-opacity="0.6" stroke="${e}" stroke-width="0.7" transform="rotate(-10 -4 -7)"/><ellipse cx="-4" cy="7" rx="9" ry="4.4" fill="${c3}" fill-opacity="0.6" stroke="${e}" stroke-width="0.7" transform="rotate(10 -4 7)"/></g>`;
      s += `<ellipse cx="-9" cy="0" rx="7" ry="5" fill="${c2}" stroke="${_gfaDk(c2, 0.4)}" stroke-width="0.9"/><ellipse cx="-11" cy="-1.6" rx="3" ry="1.6" fill="#ffffff" fill-opacity="0.7"/><ellipse cx="2" cy="0" rx="7.6" ry="5" fill="${c}" ${line}/><circle cx="9" cy="0" r="4.2" fill="${e}"/>${_gfaEyes(9, 4.2, e)}`;
      break;
    }
    case 'spider':
      s += `<path d="M4 -3L10 -10L15 -8M4 -1L12 -5L18 -3M4 1L12 5L18 3M4 3L10 10L15 8M-2 -4L-7 -12L-11 -10M-2 4L-7 12L-11 10M-4 -2L-12 -5L-16 -3M-4 2L-12 5L-16 3" stroke="${e}" stroke-width="1.9" fill="none" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="-5" cy="0" rx="9.4" ry="8" fill="${c}" ${line}/>`;
      if (p === 'cross') s += `<path d="M-11 0H1M-5 -5V5" stroke="${c2}" stroke-width="2.4" stroke-linecap="round"/>`;
      else if (p) s += _gbMarks(p, -5, 8, 7, c2, c3);
      s += `<path d="M-11 -4Q-7 -7 -3 -6" stroke="#ffffff" stroke-opacity="0.45" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="7" cy="0" r="5" fill="${_gfaDk(c, 0.2)}" ${line}/>${_gfaEyes(7, 5, e)}`;
      break;
    default:
      s += _gbaMore(b.shape, c, c2, c3, e, p, line) || `<ellipse rx="9" ry="6" fill="${c}" ${line}/>`;
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
