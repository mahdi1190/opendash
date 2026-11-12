/* ============================================================
   GARDEN, fish and bugs redrawn for the Painted village (Nov 2026, feat/painted-creatures). The owner: the fish and bugs only had shading
   laid over the 2.23 sticker drawings (an ink outline, a big googly eye). In the Painted village style they are drawn the opening scenes'
   way instead: no ink, the body built from its own colours (a dark back fading into the flank, a pale belly, the light along the back),
   fins you can see through with their rays, a small true eye with an iris, gill covers, scales and the lateral line. Each family keeps its
   body plan (94-garden-fish-1art3.js: the profile at seven stations, the fins, the tail), every fish keeps its colours and marks, and the
   joint classes the catch moment and the school animate (gcp-tail, gcp-back, gcp-fin, gcp-whisk) stay, so the held-up catch, the journal
   icon and the tray all move as before. Deterministic and pure (strings in, strings out), so a friend sees the same fish.
     _gcpSideFishPainted(def, look, fam, uid)  the side-on families (minnow, chub, salmon, perch, carp, bream, pike, catfish, sail, ...)
     _gfaEyePainted(x, y, r, iris)             the fish eye
   ============================================================ */
function _gfaPaintOn() { return typeof gardenFigurePaintStyle === 'function' && !!gardenFigurePaintStyle(); }
/** A true fish eye: a dark rim, a metallic iris (gold, silver or copper by the fish), a big pupil, one catch-light. */
function _gfaEyePainted(x, y, r, iris) {
  const n = _gfaN, ir = iris || '#c8a85a';
  return `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 1.12)}" fill="${_gfaDk(ir, 0.62)}" fill-opacity=".85"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${ir}"/>`
    + `<path d="M${n(x - r * 0.9)} ${n(y + r * 0.1)}A${n(r * 0.92)} ${n(r * 0.92)} 0 0 0 ${n(x + r * 0.9)} ${n(y + r * 0.1)}z" fill="${_gfaDk(ir, 0.3)}" fill-opacity=".6"/>`
    + `<circle cx="${n(x + r * 0.08)}" cy="${n(y + r * 0.04)}" r="${n(r * 0.6)}" fill="#14110e"/><circle cx="${n(x - r * 0.28)}" cy="${n(y - r * 0.32)}" r="${n(r * 0.24)}" fill="#ffffff" fill-opacity=".9"/>`;
}
/** The iris colour for a fish: gold for the carps and perches, silver for the silver ones, red for the roach and rudd. */
function _gfaIris(def, look, fam) {
  if (/roach|rudd|berry/.test(def.id)) return '#c8402e';
  if (/carp|tench|orfe|gold|perch|ruffe|pike|chub|barbel|gran|whisk|burbot|old-/.test(def.id + fam)) return '#d0a440';
  return '#c4c6c0';
}
function _gcpSideFishPainted(def, look, fam, uid) {
  const P = _gcpPlan(def, look, fam), { R, L, H, x0, x1, yT, yB, rnd, ex, ey, er, tail, tl } = P, n = _gfaN;
  const c = look.c, c2 = look.c2 || _gfaLt(c, 0.4), c3 = look.c3 || _gfaDk(c, 0.4);
  const deep = _gfaDk(c, 0.45), back = _gfaDk(c, 0.3), lit = _gfaLt(c, 0.35);
  const fin = R.red ? _gfaMix(c3, '#d8542a', 0.45) : _gfaMix(c, c3, 0.45), finE = _gfaDk(fin, 0.3), finH = 0.76 + rnd() * 0.5;
  const finFill = `fill="${fin}" fill-opacity=".72" stroke="${finE}" stroke-width=".45" stroke-opacity=".5" stroke-linejoin="round"`;
  const rays = (d, w) => `<path d="${d}" stroke="${finE}" stroke-width="${w || 0.45}" stroke-opacity=".55" fill="none" stroke-linecap="round"/>`;
  let behind = '', s = '';
  // dorsal fins, the anal fin and the tail: thin skin over rays, the light coming through
  const dors = R.dor.map((d) => d.slice());
  if (look.d === 'sail' && fam !== 'sail') { dors[0][0] = Math.max(0.2, dors[0][0] - 0.1); dors[0][1] = Math.min(0.82, dors[0][1] + 0.1); dors[0][2] *= 1.8; dors[0][3] = 'sail'; }
  if (look.d === 'spines') dors[0][3] = 'spiny';
  if (look.d === 'low') dors[0][2] *= 0.55;
  if (look.d === 'twin' && dors.length < 2) dors.push([dors[0][0] - 0.2, dors[0][0] - 0.06, dors[0][2] * 0.7, 'soft']);
  for (const [a, b, h0, k] of dors) {
    const xa = x0 + L * a, xb = x0 + L * b, base = (t) => yT(a + (b - a) * t) + 1.4, h = Math.min(h0 * finH, Math.max(5, 25 + base(0.5)));
    const kind = k || 'soft', nr = Math.max(4, Math.round((xb - xa) / 2.6));
    behind += _gcpJoint(0, 0, 'gcp-back', `<path d="${_gcpFinPath(kind, xa, xb, base, h, -1, rnd)}" ${finFill}/>` + (kind === 'adip' ? '' : rays(_gcpFinRays(xa, xb, base, h * (kind === 'spiny' ? 1.25 : 1), -1, nr), kind === 'spiny' ? 0.6 : 0.4)));
  }
  for (const [a, b, h0, k] of R.ana) { const xa = x0 + L * a, xb = x0 + L * b, base = (t) => yB(a + (b - a) * t) - 1.4, h = Math.min(h0 * finH, Math.max(4, 25 - base(0.5))); behind += `<path d="${_gcpFinPath(k || 'soft', xa, xb, base, h, 1, rnd)}" ${finFill}/>` + rays(_gcpFinRays(xa, xb, base, h, 1, Math.max(3, Math.round((xb - xa) / 2.6)))); }
  if (R.finlets) { let d = ''; for (let i = 0; i < 4; i++) { const x = x0 + L * (0.06 + i * 0.05); d += `M${n(x)} ${n(yT(0.06 + i * 0.05))}l-2 -3 3.4 .8zM${n(x)} ${n(yB(0.06 + i * 0.05))}l-2 3 3.4 -.8z`; } behind += `<path d="${d}" fill="${c3}" fill-opacity=".85"/>`; }
  { const pt = Math.max(1.8, H * R.top[0]); let tr = ''; for (let i = -3; i <= 3; i++) tr += `M-1 ${n(i * pt * 0.25)}L${n(-tl * (0.82 - Math.abs(i) * 0.02))} ${n(i * Math.max(H * 0.9, tl * 0.56) * 0.27)}`;
    behind += _gcpJoint(x0, 0, 'gcp-tail', `<path d="${_gcpTailPath(tail, tl, H, pt)}" ${finFill}/>` + rays(tr, 0.4) + `<path d="M1 ${n(-pt)}L${n(-tl * 0.22)} ${n(-pt * 1.4)}L${n(-tl * 0.22)} ${n(pt * 1.4)}L1 ${n(pt)}z" fill="${back}" fill-opacity=".5"/>`); }
  if (R.lobes) { const lobe = (x, y, r) => _gcpJoint(x, y, 'gcp-fin', `<path d="M0 0q-1 4.6 -5 7c-2.4 2 -5 1 -6 -1q4 -1 5 -6z" ${finFill} transform="rotate(${r})"/>`); behind += lobe(x0 + L * 0.72, yB(0.72) - 2, 0) + lobe(x0 + L * 0.42, yB(0.42) - 2, 8); }
  // the pelvic fin, under the belly behind the gill
  behind += `<path d="M${n(x0 + L * 0.52)} ${n(yB(0.52) - 1.2)}q${n(-L * 0.06)} ${n(H * 0.5)} ${n(-L * 0.12)} ${n(H * 0.55)}q${n(L * 0.06)} ${n(-H * 0.2)} ${n(L * 0.04)} ${n(-H * 0.6)}z" ${finFill}/>`;
  // the body: its own colour, a dark back fading down the flank, the pale belly, light along the back; no outline, only the deep tone at its edge
  s += `<defs><clipPath id="${uid}-pk"><path d="${P.body}"/></clipPath></defs><path d="${P.body}" fill="${c}" stroke="${deep}" stroke-width=".5" stroke-opacity=".45" stroke-linejoin="round"/>`;
  s += `<g clip-path="url(#${uid}-pk)">`;
  s += `<path d="M${n(x0 - 2)} ${n(-H * 1.4)}H${n(x1 + 3)}V${n(-H * 0.5)}Q${n(x0 + L * 0.5)} ${n(-H * 0.62)} ${n(x0 - 2)} ${n(-H * 0.24)}z" fill="${back}" fill-opacity=".55"/>`;
  s += `<path d="M${n(x0 - 2)} ${n(-H * 1.4)}H${n(x1 + 3)}V${n(-H * 0.22)}Q${n(x0 + L * 0.5)} ${n(-H * 0.36)} ${n(x0 - 2)} ${n(H * 0.02)}z" fill="${back}" fill-opacity=".22"/>`;
  const dx = x0 + L / 2, pk = look.p || R.mk[Math.floor(rnd() * R.mk.length)];
  if (pk) s += `<g transform="translate(${n(dx)} 0)" opacity=".85">${_gfaPattern(Object.assign({}, look, { p: pk }), { L, H, bel: 1 }, rnd)}</g>`;
  s += `<path d="M${n(x0 - 2)} ${n(H * 0.12)}Q${n(x0 + L * 0.5)} ${n(H * 0.18)} ${n(x1 + 2)} ${n(H * 0.02)}V${n(H * 1.5)}H${n(x0 - 2)}z" fill="${c2}" fill-opacity=".55"/>`;
  s += `<path d="M${n(x0 - 2)} ${n(H * 0.34)}Q${n(x0 + L * 0.5)} ${n(H * 0.4)} ${n(x1 + 2)} ${n(H * 0.2)}V${n(H * 1.5)}H${n(x0 - 2)}z" fill="${c2}"/>`;
  // scales: rows of small arcs, lit above the lateral line, in shade below; the bare-skinned families get mottling
  const bare = /cat|eel|loach|lamprey|sturgeon|shark|ray|oar|wels|newt/.test(fam), r = _gfaRng('pf|' + def.id);
  let sl = '', sd = '';
  if (bare) { for (let i = 0; i < 34; i++) { const t = 0.06 + r() * 0.84, x = x0 + L * t, y = yT(t) + (yB(t) - yT(t)) * (0.1 + r() * 0.5), w = 0.8 + r() * 1.8; const seg = `M${n(x)} ${n(y)}h${n(w)}`; if (r() < 0.6) sd += seg; else sl += seg; } }
  else {
    const rows = Math.max(4, Math.min(8, Math.round(H / 2))), cols = Math.max(8, Math.min(20, Math.round(L / 2.8)));
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const t = 0.08 + (i + (j % 2) * 0.5) / cols * 0.72; if (t > 0.8) continue;
      const top = yT(t), bot = yB(t), y = top + (bot - top) * (0.1 + j / rows * 0.8), x = x0 + L * t, w = Math.min(2.2, L / cols * 0.55);
      const arc = `M${n(x - w * 0.4)} ${n(y - w * 0.7)}Q${n(x + w * 0.6)} ${n(y)} ${n(x - w * 0.4)} ${n(y + w * 0.7)}`;
      if (j / rows < 0.5) sl += arc; else sd += arc;
    }
  }
  s += `<path d="${sl}" stroke="${lit}" stroke-width=".45" stroke-opacity=".5" fill="none" stroke-linecap="round"/><path d="${sd}" stroke="${deep}" stroke-width=".45" stroke-opacity=".35" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M${n(x1 - L * 0.22)} ${n(-H * 0.16)}Q${n(x0 + L * 0.5)} ${n(-H * 0.06)} ${n(x0 + L * 0.04)} ${n(H * 0.02)}" stroke="${deep}" stroke-width=".55" stroke-opacity=".55" fill="none" stroke-dasharray="1.2 .7"/>`;
  s += `<path d="M${n(x0 + L * 0.12)} ${n(-H * 0.5)}Q${n(x0 + L * 0.45)} ${n(-H * 0.98)} ${n(x1 - L * 0.1)} ${n(-H * 0.56)}Q${n(x0 + L * 0.45)} ${n(-H * 0.66)} ${n(x0 + L * 0.12)} ${n(-H * 0.5)}z" fill="#fff4d6" fill-opacity=".3"/>`;
  s += `<path d="M${n(x0 + L * 0.3)} ${n(H * 0.06)}Q${n(x0 + L * 0.55)} ${n(-H * 0.06)} ${n(x0 + L * 0.74)} ${n(H * 0.02)}" stroke="#ffffff" stroke-opacity=".35" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
  // the head: the gill cover a little darker, its curved edge, the cheek catching the light
  const gx = x1 - L * (R.pec ? 0.25 : 0.2);
  s += `<path d="M${n(gx)} ${n(-H * 1.4)}Q${n(gx - 3.2)} ${n(H * 0.05)} ${n(gx)} ${n(H * 1.5)}H${n(x1 + 4)}V${n(-H * 1.4)}z" fill="${back}" fill-opacity=".18"/>`;
  s += `<ellipse cx="${n(gx + L * 0.08)}" cy="${n(H * 0.12)}" rx="${n(L * 0.07)}" ry="${n(H * 0.22)}" fill="#fff4d6" fill-opacity=".18"/>`;
  if (R.gills) { let d = ''; for (let i = 0; i < 4; i++) d += `M${n(x0 + L * (0.7 + i * 0.03))} ${n(-H * 0.3)}q-1 ${n(H * 0.32)} 0 ${n(H * 0.62)}`; s += `<path d="${d}" stroke="${deep}" stroke-width=".7" stroke-opacity=".6" fill="none"/>`; }
  s += '</g>';
  s += `<path d="M${n(gx)} ${n(yT(0.75) * 0.55)}Q${n(gx - 3.2)} ${n(H * 0.04)} ${n(gx + 0.4)} ${n(yB(0.75) * 0.62)}" stroke="${deep}" stroke-width=".8" stroke-opacity=".55" fill="none" stroke-linecap="round"/>`;
  if (R.scutes) { let d = ''; for (let i = 0; i < 7; i++) { const t = 0.2 + i * 0.09, x = x0 + L * t; d += `M${n(x - 2.4)} ${n(yT(t) + 1.4)}l2.4 -3.4 2.4 3.4zM${n(x - 2)} ${n(-1)}l2 -2 2 2 -2 2z`; } s += `<path d="${d}" fill="${_gfaLt(c3, 0.3)}" fill-opacity=".85"/>`; }
  if (R.paddle) { const pl = 20 + rnd() * 4; s += `<path d="M${n(x1 - 2)} ${n(-H * 0.26)}C${n(x1 + pl * 0.5)} ${n(-H * 0.24)} ${n(x1 + pl * 0.8)} ${n(-H * 0.64)} ${n(x1 + pl)} ${n(-H * 0.5)}C${n(x1 + pl + 2)} ${n(-H * 0.3)} ${n(x1 + pl * 0.6)} ${n(H * 0.1)} ${n(x1 - 2)} ${n(H * 0.18)}Z" fill="${_gfaMix(c, c2, 0.3)}"/>`; }
  if (look.x === 'spikes') { let d = ''; for (let i = 0; i < 7; i++) { const t = 0.36 + i * 0.08; d += `M${n(x0 + L * t)} ${n(yB(t))}l-3 7`; } s += `<path d="${d}" stroke="${deep}" stroke-width="1" stroke-linecap="round"/>`; }
  // the pectoral fin, clear, over the flank
  if (R.pec) { const pl = H * 0.8 * R.pec, pd = R.pecBlade ? `M0 -1L${n(-pl * 0.7)} ${n(pl * 0.9)}Q${n(-pl * 0.1)} ${n(pl * 0.4)} 3 1z` : `M0 -2C${n(-pl * 0.5)} ${n(-pl * 0.05)} ${n(-pl)} ${n(pl * 0.3)} ${n(-pl)} ${n(pl * 0.5)}C${n(-pl * 0.6)} ${n(pl * 0.7)} ${n(-pl * 0.2)} ${n(pl * 0.5)} 1 2z`;
    s += _gcpJoint(gx - 2, H * 0.2, 'gcp-fin', `<path d="${pd}" fill="${fin}" fill-opacity=".6"/>` + rays(`M0 0L${n(-pl * 0.9)} ${n(pl * 0.25)}M0 0L${n(-pl * 0.85)} ${n(pl * 0.45)}M0 0L${n(-pl * 0.6)} ${n(pl * 0.55)}`, 0.35)); }
  // the eye, the mouth (thin, in the deep tone), whiskers
  if (R.bulge) s += `<circle cx="${n(ex)}" cy="${n(ey)}" r="${n(er + 1.6)}" fill="${_gfaLt(c, 0.15)}" fill-opacity=".8"/>`;
  s += _gfaEyePainted(ex, ey, Math.max(1.6, er * 0.68), _gfaIris(def, look, fam)) + _gcpMouth(P, look, deep).replace(/stroke-width="1\.[0-9]"/g, 'stroke-width=".8"');
  if (R.wh) { const y = H * P.nose + H * 0.26, x = x1 - (R.under ? 8 : 1.6), long = /whisk|king|wels|goonch|mekong|thunder/.test(def.id) ? 1.5 : 1, list = R.under ? [[-1, 7], [2, 8], [-4, 7]] : R.wh >= 6 ? [[6 * long, 9 * long], [-2, 11 * long], [-9, 9 * long], [10 * long, -3], [8 * long, 2], [-5, 8]] : R.wh >= 4 ? [[4, 6], [0, 7], [-3, 6], [5, 2]] : [[3, 6], [-1, 6.5]]; s += _gcpWhisk(x, y, list, deep, 0.9); }
  if (R.lure) s += `<path d="M${n(x1 - L * 0.34)} ${n(yT(0.66))}Q${n(x1 - 3)} ${n(yT(0.66) - 13)} ${n(x1 + 2)} ${n(yT(0.8) - 4)}" stroke="${deep}" stroke-width="1.1" fill="none" stroke-linecap="round"/>` + _gcpJoint(x1 + 2, yT(0.8) - 2, 'gcp-lure', `<circle class="gcp-glow" r="7.5" fill="${c3}" fill-opacity=".3"/><circle r="3" fill="${_gfaLt(c3, 0.3)}"/>`);
  const T = _gcpTraits(def, look, ex - 1, yT(R.eye[1]) - 0.5, yT(R.eye[1]) - 0.5, L * 0.72, deep, rnd);
  return `<g class="gfa-fish gcp gcf-${fam} gcp-painted">${T.back}${behind}${s}${T.over}</g>`;
}
