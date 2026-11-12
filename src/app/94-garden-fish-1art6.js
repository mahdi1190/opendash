/* ============================================================
   GARDEN, bugs redrawn for the Painted village (Nov 2026, feat/painted-creatures). See 94-garden-fish-1art5.js for the fish.
   Butterflies and moths first (the journal's loudest pages): seen from above, wings spread, drawn the way the scene kit paints: no ink
   outline, each wing dusted dark at its root and lit toward its edge, the veins running out from the body, a dark margin with pale spots
   on the butterflies, a soft fringe on the moths, the species' own marks (eyes, bands, tips, tails, checks) kept in their places and
   colours, a furred body in segments, a small head with dark compound eyes and clubbed (butterfly) or feathered (moth) antennae.
   Every other family keeps its body plan and is softened by the Painted village's grade; its cartoon eyes become small compound eyes.
   Classes the flutter and walk use (gba-bug, gba-wings, gcp-ant) stay. Pure and deterministic.
   ============================================================ */
/** Two compound eyes on a head at x of radius r (from above): dark, glossy, small. */
function _gfaEyesPainted(x, r) {
  const n = _gfaN, R = r * 0.36, y = r * 0.6, X = x + r * 0.38;
  return `<ellipse cx="${n(X)}" cy="${n(-y)}" rx="${n(R * 1.1)}" ry="${n(R * 0.9)}" fill="#1c1a1e"/><ellipse cx="${n(X)}" cy="${n(y)}" rx="${n(R * 1.1)}" ry="${n(R * 0.9)}" fill="#1c1a1e"/>`
    + `<circle cx="${n(X - R * 0.3)}" cy="${n(-y - R * 0.3)}" r="${n(R * 0.32)}" fill="#ffffff" fill-opacity=".7"/><circle cx="${n(X - R * 0.3)}" cy="${n(y - R * 0.3)}" r="${n(R * 0.32)}" fill="#ffffff" fill-opacity=".55"/>`;
}
function _gcbFlierPainted(b, L, uid, rnd) {
  const moth = b.shape === 'moth', kind = _gcbWingKind(b), c = L.c, c2 = L.c2, c3 = L.c3 || c2, n = _gfaN, k = 0.92 + rnd() * 0.14, K = _GCB_WINGS[kind];
  const p = L.p || (moth ? ['', 'speckle', 'band', 'stripe'][Math.floor(rnd() * 4)] : '');
  const deep = _gfaDk(c, 0.5), root = _gfaDk(c, moth ? 0.3 : 0.42), bodyC = moth ? _gfaLt(_gfaMix(c, '#8a7a68', 0.4), 0.15) : _gfaDk(c2 === c ? '#3a2a1a' : _gfaMix(c2, '#2a2420', 0.6), 0.2);
  const legend = b.rarity === 'legendary' ? `<circle class="gcp-glow" r="22" fill="${c3}" fill-opacity=".16"/>` : '';
  if (kind === 'tent') {   // a moth at rest, wings folded along its back like a roof, painted with soft bands
    const len = 18 * k, w = 5.4 + rnd() * 2;
    const one = (m) => { const d = `M7 0C2 ${n(-w * 1.1)} ${n(-len * 0.4)} ${n(-w * 1.5)} ${n(-len * 0.8)} ${n(-w * 1.25)}Q${n(-len - 2)} ${n(-w * 0.8)} ${n(-len)} 0Z`;
      return `<g transform="scale(1 ${m})"><path d="${d}" fill="${c}" stroke="${deep}" stroke-width=".4" stroke-opacity=".5"/><path d="M5 0C1 ${n(-w * 0.5)} ${n(-len * 0.4)} ${n(-w * 0.8)} ${n(-len * 0.9)} ${n(-w * 0.5)}L${n(-len)} 0z" fill="${_gfaDk(c, 0.18)}" fill-opacity=".6"/>`
        + `<path d="M${n(-len * 0.2)} ${n(-w * 0.4)}q-2 ${n(-w * 0.5)} -1 ${n(-w * 0.95)}M${n(-len * 0.55)} ${n(-w * 0.4)}q-2 ${n(-w * 0.5)} -1 ${n(-w * 1.1)}" stroke="${c2}" stroke-width=".9" stroke-opacity=".7" fill="none" stroke-linecap="round"/>`
        + `<path d="M3 ${n(-w * 0.7)}C${n(-len * 0.3)} ${n(-w * 1.25)} ${n(-len * 0.6)} ${n(-w * 1.25)} ${n(-len * 0.8)} ${n(-w * 1.05)}" stroke="${_gfaLt(c, 0.4)}" stroke-width="1" stroke-opacity=".5" fill="none" stroke-linecap="round"/></g>`; };
    return `<g class="gba-bug gcb gcb-moth gcb-painted">${legend}<g class="gba-wings gcp-tentw">${one(1)}${one(-1)}</g>${_gcbAntPainted(8, bodyC, true)}<circle cx="7" r="3.2" fill="${_gfaLt(c, 0.2)}"/><circle cx="6.4" cy="-0.6" r="1.6" fill="#ffffff" fill-opacity=".25"/>${_gfaEyesPainted(7, 3.2)}</g>`;
  }
  const fore = _gcbWing(K.fore, k, rnd), hind = _gcbWing(K.hind, k * (kind === 'wide' ? 1 : 0.98), rnd, true);
  const hindC = moth ? _gfaMix(c, c2, 0.34) : _gfaMix(c, c3, kind === 'tail' ? 0.1 : 0.14);
  const hm = _gcbWingMarks(p, hind, uid, 'ph', c, c2, c3, deep, rnd, false), fm = _gcbWingMarks(p, fore, uid, 'pf', c, c2, c3, deep, rnd, true);
  /** One wing, painted: its colour, the dark dusting at the root, the lit outer field, the veins, the margin, the marks, then the edge spots. */
  const paint = (W, col, tag, marks, front) => {
    const id = `${uid}-pw${tag}`, tip = W.P[Math.floor(W.P.length / 2)], far = Math.hypot(tip[0], tip[1]) || 10;
    let veins = ''; for (const o of W.P.slice(1)) veins += `M0 0Q${n(o[0] * 0.5 + o[1] * 0.06)} ${n(o[1] * 0.5 - o[0] * 0.06)} ${n(o[0] * 0.92)} ${n(o[1] * 0.92)}`;
    let s = `<defs><clipPath id="${id}"><path d="${W.d}"/></clipPath></defs><path d="${W.d}" fill="${col}"/><g clip-path="url(#${id})">`;
    s += `<circle r="${n(far * 0.48)}" fill="${root}" fill-opacity="${moth ? 0.35 : 0.55}"/><circle r="${n(far * 0.28)}" fill="${root}" fill-opacity=".4"/>`;
    s += `<circle cx="${n(tip[0] * 0.55)}" cy="${n(tip[1] * 0.55)}" r="${n(far * 0.32)}" fill="${_gfaLt(col, 0.35)}" fill-opacity=".35"/>`;
    s += marks.replace(/^<clipPath[^]*?<\/clipPath><g clip-path="url\([^)]*\)">/, '<g>');
    s += `<path d="${veins}" stroke="${_gfaDk(col, 0.4)}" stroke-width=".45" stroke-opacity=".55" fill="none"/>`;
    if (!moth) s += `<path d="${W.d}" fill="none" stroke="${_gfaDk(c, 0.62)}" stroke-width="${front ? 3 : 2.4}" stroke-opacity=".85"/>` + W.P.slice(2, -1).map((o) => `<circle cx="${n(o[0] * 0.95)}" cy="${n(o[1] * 0.95)}" r=".55" fill="#fbf6e8" fill-opacity=".85"/>`).join('');
    else s += `<path d="${W.d}" fill="none" stroke="${_gfaLt(col, 0.3)}" stroke-width="1.6" stroke-opacity=".45" stroke-dasharray=".6 .6"/>`;
    return s + '</g>';
  };
  const wing = (m) => `<g transform="scale(1 ${m})">${paint(hind, hindC, (m > 0 ? 'a' : 'b') + 'h', hm, false)}${paint(fore, c, (m > 0 ? 'a' : 'b') + 'f', fm, true)}</g>`;
  // the body: a furred thorax, the abdomen in segments, a small head; lit along its top
  const ab = moth ? 8 : 6.6, aw = moth ? 3.2 : 2.1;
  let body = `<ellipse cx="${n(-ab * 0.55)}" rx="${n(ab)}" ry="${n(aw)}" fill="${bodyC}"/>`;
  { let d = ''; for (let i = 1; i < 5; i++) { const x = -ab * 0.55 - ab + i * ab * 0.4; d += `M${n(x)} ${n(-aw * 0.85)}q.8 ${n(aw * 0.85)} 0 ${n(aw * 1.7)}`; } body += `<path d="${d}" stroke="${_gfaDk(bodyC, 0.35)}" stroke-width=".5" stroke-opacity=".6" fill="none"/>`; }
  body += `<ellipse cx="2.6" rx="${n(moth ? 4.4 : 3.6)}" ry="${n(moth ? 3.8 : 3)}" fill="${_gfaLt(bodyC, 0.1)}"/><ellipse cx="${n(-ab * 0.5)}" cy="${n(-aw * 0.35)}" rx="${n(ab * 0.7)}" ry="${n(aw * 0.3)}" fill="#ffffff" fill-opacity=".18"/>`;
  { const r2 = _gfaRng('fur|' + b.id); let d = ''; for (let i = 0; i < 14; i++) { const x = -1 + r2() * 7, y = (r2() - 0.5) * 6; d += `M${n(x)} ${n(y)}l${n(-0.8 - r2())} ${n((y > 0 ? 1 : -1) * 0.6)}`; } body += `<path d="${d}" stroke="${_gfaLt(bodyC, 0.35)}" stroke-width=".4" stroke-opacity=".6" fill="none" stroke-linecap="round"/>`; }
  body += `<circle cx="7" r="${moth ? 2.8 : 2.4}" fill="${_gfaDk(bodyC, 0.1)}"/>${_gfaEyesPainted(7, moth ? 2.8 : 2.4)}`;
  return `<g class="gba-bug gcb gcb-${moth ? 'moth' : 'butterfly'} gcb-painted">${legend}<g class="gba-wings">${wing(1)}${wing(-1)}</g>${body}${_gcbAntPainted(8.4, _gfaDk(bodyC, 0.2), moth)}</g>`;
}
/** Antennae: a butterfly's long and clubbed, a moth's feathered. */
function _gcbAntPainted(x, col, moth) {
  if (moth) { const f = (m) => `M${x} ${m * 1}Q${x + 5} ${m * 5} ${x + 7} ${m * 10}M${x + 2.2} ${m * 2.6}l1.6 -1.2M${x + 3.8} ${m * 4.6}l1.6 -1.2M${x + 5.2} ${m * 6.8}l1.4 -1M${x + 2.2} ${m * 2.6}l-.4 1.8M${x + 3.8} ${m * 4.6}l-.6 1.8M${x + 5.2} ${m * 6.8}l-.8 1.6`; return `<path class="gcp-ant" d="${f(-1)}${f(1)}" stroke="${col}" stroke-width=".55" fill="none" stroke-linecap="round"/>`; }
  return `<g class="gcp-ant"><path d="M${x} -1Q${x + 6} -4 ${x + 10} -10M${x} 1Q${x + 6} 4 ${x + 10} 10" stroke="${col}" stroke-width=".55" fill="none" stroke-linecap="round"/><ellipse cx="${x + 10.2}" cy="-10.3" rx="1" ry=".7" fill="${col}"/><ellipse cx="${x + 10.2}" cy="10.3" rx="1" ry=".7" fill="${col}"/></g>`;
}

/** A dragonfly or a damselfly from above, painted: four long clear wings with a net of veins and a dark spot near each tip (amber at the
 *  root on a darter, a dark band on a demoiselle), the thorax lit and striped, the abdomen in rings, two big glossy eyes that meet. */
function _gcbDragonPainted(x) {
  const { c, c2, c3, n, r, L } = x, slim = L.w === 'slim' || L.p === 'slim', band = L.p === 'band', big = L.p === 'big' || L.w === 'big';
  const len = slim ? 22 : 18 + r() * 3, wl = slim ? 12 : big ? 17 : 15, ww = slim ? 2.6 : 3.8, deep = _gfaDk(c, 0.5), membrane = _gfaMix('#eef4f2', c3, 0.25);
  const a = slim ? [-126, -140] : [-82, -100], amber = /darter|chaser|skimmer/.test(x.b.id);
  const W = (y, ang, k) => {
    const l = wl * k, d = `M0 0C${n(l * 0.2)} ${n(-ww * 1.1)} ${n(l * 0.8)} ${n(-ww)} ${n(l)} ${n(-ww * 0.25)}C${n(l * 1.02)} ${n(ww * 0.4)} ${n(l * 0.7)} ${n(ww * 0.9)} ${n(l * 0.3)} ${n(ww * 0.75)}C${n(l * 0.15)} ${n(ww * 0.6)} 0 ${n(ww * 0.3)} 0 0Z`;
    let v = `M0 0L${n(l * 0.98)} ${n(-ww * 0.3)}M0 0Q${n(l * 0.5)} ${n(ww * 0.1)} ${n(l * 0.9)} ${n(ww * 0.3)}M${n(l * 0.1)} ${n(ww * 0.3)}Q${n(l * 0.5)} ${n(ww * 0.6)} ${n(l * 0.7)} ${n(ww * 0.65)}`;
    for (let i = 1; i < 7; i++) { const t = i / 7; v += `M${n(l * t)} ${n(-ww * 0.85)}l${n(0.4)} ${n(ww * 1.5)}`; }
    return `<g transform="translate(4 ${y}) rotate(${ang})"><path d="${d}" fill="${membrane}" fill-opacity=".38" stroke="${_gfaDk(c3, 0.3)}" stroke-width=".35" stroke-opacity=".6"/>`
      + (amber ? `<path d="M0 0C${n(l * 0.1)} ${n(-ww * 0.8)} ${n(l * 0.25)} ${n(-ww * 0.7)} ${n(l * 0.28)} 0C${n(l * 0.2)} ${n(ww * 0.6)} ${n(l * 0.1)} ${n(ww * 0.5)} 0 0Z" fill="#d89a3a" fill-opacity=".45"/>` : '')
      + (band ? `<ellipse cx="${n(l * 0.6)}" cy="${n(-ww * 0.05)}" rx="${n(l * 0.24)}" ry="${n(ww * 0.8)}" fill="${c}" fill-opacity=".7"/>` : '')
      + `<path d="${v}" stroke="${_gfaDk(c3, 0.45)}" stroke-width=".25" stroke-opacity=".55" fill="none"/><path d="M${n(l * 0.84)} ${n(-ww * 0.7)}l${n(l * 0.08)} ${n(ww * 0.1)}" stroke="#2a2420" stroke-width="${n(ww * 0.35)}" stroke-opacity=".75"/></g>`;
  };
  let rings = ''; for (let i = 1; i < 8; i++) rings += `M${n(-i * len / 8)} ${slim ? -0.9 : -1.4}v${slim ? 1.8 : 2.8}`;
  const aw = slim ? 1.5 : 2.4;
  return `<g class="gba-wings gcp-df">${W(-1.4, a[0], 1)}${W(1.4, -a[0], 1)}${W(-0.6, a[1], 0.94)}${W(0.6, -a[1], 0.94)}</g><g class="gcp-df-body">`
    + `<path d="M3 0L${n(-len)} 0" stroke="${_gfaDk(c, 0.3)}" stroke-width="${n(aw * 1.25)}" stroke-linecap="round"/><path d="M3 -0.3L${n(-len)} -0.3" stroke="${c}" stroke-width="${n(aw)}" stroke-linecap="round"/><path d="M2 ${n(-aw * 0.35)}L${n(-len * 0.9)} ${n(-aw * 0.35)}" stroke="#fff4d6" stroke-width=".45" stroke-opacity=".45" stroke-linecap="round"/><path d="${rings}" stroke="${_gfaDk(c2 === c ? c : c2, 0.25)}" stroke-width=".7" stroke-opacity=".8"/>`
    + `<ellipse cx="5" rx="4.6" ry="3.2" fill="${_gfaDk(c, 0.15)}"/><ellipse cx="4.6" cy="-0.5" rx="4" ry="2.4" fill="${c}"/><path d="M2 -2.6l4.6 1.2M2 2.4l4.6 -1" stroke="${c2}" stroke-width=".8" stroke-opacity=".8"/>`
    + `<ellipse cx="10.6" cy="-2.6" rx="3" ry="3.2" fill="${_gfaDk(c2, 0.25)}"/><ellipse cx="10.6" cy="2.6" rx="3" ry="3.2" fill="${_gfaDk(c2, 0.25)}"/><ellipse cx="10.2" cy="-3" rx="2.4" ry="2.5" fill="${c2}"/><ellipse cx="10.2" cy="2.2" rx="2.4" ry="2.5" fill="${c2}"/>`
    + `<circle cx="9.4" cy="-4" r=".8" fill="#ffffff" fill-opacity=".75"/><circle cx="9.4" cy="1.4" r=".7" fill="#ffffff" fill-opacity=".6"/><path d="M8.4 -0.2h4" stroke="${deep}" stroke-width=".4" stroke-opacity=".6"/></g>`;
}
