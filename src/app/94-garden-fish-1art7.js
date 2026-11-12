/* ============================================================
   GARDEN, the fish families with their own plans, redrawn for the Painted village (Nov 2026, feat/painted-creatures; see
   94-garden-fish-1art5.js). No ink: each body built from its own colours, lit along the top, in shade underneath, with true small eyes.
   The joints the moves use stay (gcp-seg in the chain, gcp-leg, gcp-claw, gcp-tail), so an eel slithers and a crab scuttles as before.
   Pure and deterministic.
   ============================================================ */
/** The eel side on: one long smooth body tapering to a point, the fin running round it like a ribbon, a dark back, a yellowish belly, a small head. */
function _gcpEelPainted(def, look, fam, uid, rnd) {
  const c = look.c, c2 = look.c2 || _gfaLt(c, 0.4), c3 = look.c3 || _gfaDk(c, 0.4), n = _gfaN, big = Math.min(1.25, 0.85 + (def.cm[1] / 300) * 0.5);
  const W = 9 * big * (0.86 + rnd() * 0.28), segs = 7, l = 74 / segs, hx = 30, back = _gfaDk(c, 0.3), fin = _gfaMix(c, c3, 0.4), p = look.p;
  const seg = (i, w) => {
    let m = `<path d="M0 ${n(-w * 0.5 - 1.2)}L${n(-l)} ${n(-w * 0.5 - 1.2)}" stroke="${fin}" stroke-opacity=".7" stroke-width="${n(i < 2 ? 0.6 : 2.4)}" stroke-linecap="round"/><path d="M0 ${n(w * 0.5 + 1)}L${n(-l)} ${n(w * 0.5 + 1)}" stroke="${fin}" stroke-opacity=".6" stroke-width="${n(i < 3 ? 0.4 : 2)}" stroke-linecap="round"/>`;
    m += `<path d="M0 ${n(-w * 0.2)}L${n(-l)} ${n(-w * 0.2)}" stroke="${back}" stroke-width="${n(w * 0.5)}" stroke-opacity=".7" stroke-linecap="round"/><path d="M0 ${n(w * 0.26)}L${n(-l)} ${n(w * 0.26)}" stroke="${c2}" stroke-width="${n(w * 0.32)}" stroke-opacity=".9" stroke-linecap="round"/>`;
    m += `<path d="M0 ${n(-w * 0.34)}L${n(-l)} ${n(-w * 0.34)}" stroke="#fff4d6" stroke-opacity=".22" stroke-width="${n(Math.max(0.6, w * 0.12))}" stroke-linecap="round"/>`;
    if (p === 'spots' || p === 'speckle' || p === 'patches') m += `<circle cx="${n(-l * 0.3)}" cy="${n(-w * 0.1)}" r="${n(w * 0.12)}" fill="${c3}" fill-opacity=".8"/>`;
    if (p === 'bars') m += `<path d="M${n(-l / 2)} ${n(-w * 0.5)}V${n(w * 0.1)}" stroke="${c3}" stroke-width="1.8" stroke-opacity=".8" stroke-linecap="round"/>`;
    return m;
  };
  let s = `<g transform="translate(${hx} 0)">${_gcpChain(segs, l, (t) => W * (1 - t * t * 0.8), c, _gfaDk(c, 0.12), seg)}`;
  const H0 = W * 0.62;
  s += `<path d="M-6 ${n(-H0)}C3 ${n(-H0 * 1.05)} 11 ${n(-H0 * 0.55)} 14 ${n(-H0 * 0.05)}L12 ${n(H0 * 0.35)}C9 ${n(H0 * 0.85)} 1 ${n(H0)} -6 ${n(H0 * 0.9)}Z" fill="${c}"/>`;
  s += `<path d="M-6 ${n(-H0)}C3 ${n(-H0 * 1.05)} 11 ${n(-H0 * 0.55)} 14 ${n(-H0 * 0.05)}L8 ${n(-H0 * 0.1)}C2 ${n(-H0 * 0.3)} -3 ${n(-H0 * 0.3)} -6 ${n(-H0 * 0.2)}Z" fill="${back}" fill-opacity=".6"/><path d="M-6 ${n(H0 * 0.3)}C1 ${n(H0 * 0.3)} 7 ${n(H0 * 0.35)} 12 ${n(H0 * 0.35)}C9 ${n(H0 * 0.85)} 1 ${n(H0)} -6 ${n(H0 * 0.9)}Z" fill="${c2}" fill-opacity=".85"/>`;
  s += `<path d="M13 ${n(H0 * 0.1)}Q7 ${n(H0 * 0.45)} 1 ${n(H0 * 0.25)}" stroke="${_gfaDk(c, 0.5)}" stroke-width=".7" fill="none" stroke-linecap="round"/><path d="M-2 ${n(-H0 * 0.6)}q-2 ${n(H0 * 0.7)} 0 ${n(H0 * 1.3)}" stroke="${_gfaDk(c, 0.4)}" stroke-width=".6" stroke-opacity=".5" fill="none"/>`;
  s += `<path d="M-4 ${n(H0 * 0.1)}q-4 ${n(H0 * 0.4)} -7 ${n(H0 * 0.7)}q4 0 7 ${n(-H0 * 0.4)}z" fill="${fin}" fill-opacity=".7"/>`;
  s += _gfaEyePainted(6, -H0 * 0.38, Math.max(1.3, W * 0.15), '#c8a85a');
  const T = _gcpTraits(def, look, hx + 3, -W * 0.8, -W * 0.8, 26, _gfaDk(c, 0.5), rnd);
  return `<g class="gfa-fish gcp gcf-${fam} gcp-painted">${T.back}${s}</g>${T.over}</g>`;
}
/** A newt from above: a smooth body and head, a long tail, four splayed legs with spread toes, the skin's spots; the crest when it has one. */
function _gcpNewtPainted(def, look, rnd) {
  const c = look.c, c3 = look.c3 || _gfaDk(c, 0.4), n = _gfaN, fr = look.x === 'frill', ax = /axolotl/.test(def.id), deep = _gfaDk(c, 0.42), l1 = 10, p = look.p;
  const leg = (x, m, d) => _gcpJoint(x, m * 3, 'gcp-leg', `<path d="M0 0l${d * 3} ${m * 7}l${d * 4} ${m * 2}" stroke="${deep}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M0 0l${d * 3} ${m * 7}l${d * 4} ${m * 2}" stroke="${c}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M${d * 7} ${m * 9}l${d * 2} ${m * -1}M${d * 7} ${m * 9}l${d * 2} ${m * 1.6}M${d * 7} ${m * 9}l${d * 0.4} ${m * 2.4}" stroke="${c}" stroke-width=".9" stroke-linecap="round"/>`);
  const seg = (i, w) => `<path d="M0 0L${-l1} 0" stroke="${_gfaDk(c, 0.22)}" stroke-width="${n(w * 0.34)}" stroke-opacity=".6" stroke-linecap="round"/><path d="M0 ${n(-w * 0.3)}L${-l1} ${n(-w * 0.3)}" stroke="#fff4d6" stroke-width="${n(Math.max(0.5, w * 0.12))}" stroke-opacity=".25" stroke-linecap="round"/>`
    + (p === 'spots' || !p ? `<circle cx="-4" cy="${n(w * 0.16)}" r="${n(Math.max(0.7, w * 0.11))}" fill="${c3}" fill-opacity=".85"/><circle cx="-8" cy="${n(-w * 0.18)}" r="${n(Math.max(0.6, w * 0.09))}" fill="${c3}" fill-opacity=".75"/>` : '')
    + (fr && i < 4 ? `<path d="M0 0L${-l1} 0" stroke="${c3}" stroke-width="1.4" stroke-dasharray="1.6 1" stroke-linecap="round"/>` : '');
  return `<g class="gfa-fish gcp gcf-newt gcp-painted">${leg(-22, 1, -1)}${leg(-22, -1, -1)}${leg(11, 1, 1)}${leg(11, -1, 1)}<g transform="translate(14 0)">${_gcpChain(6, l1, (t) => 9.5 * (1 - t * t * 0.82), c, _gfaDk(c, 0.15), seg)}</g>`
    + `<path d="M14 -7.4C20 -8.6 30 -6 32 0C30 6 20 8.6 14 7.4Z" fill="${c}"/><path d="M15 -6C21 -7 28 -4.6 30.6 -1.4C25 -3 20 -3.4 15 -2.6Z" fill="#fff4d6" fill-opacity=".25"/><path d="M15 4C21 5 27 4.6 31 1C28 6 20 8 15 6.6Z" fill="${_gfaDk(c, 0.2)}" fill-opacity=".5"/>`
    + (ax ? `${_gcpWhisk(16, -5, [[-7, -10], [-1, -11], [4, -10]], c3, 2.2)}${_gcpWhisk(16, 5, [[-7, 10], [-1, 11], [4, 10]], c3, 2.2)}` : '')
    + `${_gfaEyePainted(26, -4.4, 1.5, '#c8a040')}${_gfaEyePainted(26, 4.4, 1.5, '#c8a040')}</g>`;
}
/** A crayfish from above: the carapace and the tail in plates, lit along the middle, claws with paler tips, long feelers. */
function _gcpCrayPainted(def, look) {
  const c = look.c, c2 = look.c2 || _gfaLt(c, 0.4), deep = _gfaDk(c, 0.4), lit = _gfaLt(c, 0.3);
  const claw = (m) => _gcpJoint(16, m * 4, 'gcp-claw' + (m < 0 ? ' gcp-clawl' : ''), `<g transform="scale(1 ${m})"><path d="M0 -1Q6 8 18 9Q25 6 21 2Q17 4 14 2Q18 -1 14 -3L4 -4z" fill="${c2}"/><path d="M4 -2Q8 4 17 6Q21 5 21 3Q16 3 12 0z" fill="${_gfaDk(c2, 0.25)}" fill-opacity=".6"/><path d="M18 8.4Q24 6 21.4 2.4" stroke="${_gfaLt(c2, 0.5)}" stroke-width="1.2" fill="none"/></g>`);
  let legs = ''; for (let i = 0; i < 4; i++) legs += `M${-10 + i * 6} -6l-2.4 -8l-1.4 -1.6M${-10 + i * 6} 6l-2.4 8l-1.4 1.6`;
  const plates = [-21, -16, -11, -6].map((x) => `M${x} -7.6Q${x + 2.6} 0 ${x} 7.6`).join('');
  return `<g class="gfa-fish gcp gcf-crayfish gcp-painted">${_gcpJoint(-26, 0, 'gcp-tail', `<path d="M1 0Q-9 -9 -5 -14Q4 -12 7 -3M1 0Q-9 9 -5 14Q4 12 7 3" fill="${c2}"/><path d="M1 0L-5 -11M1 0L-6 0M1 0L-5 11" stroke="${deep}" stroke-width=".5" stroke-opacity=".6"/>`)}`
    + `<g class="gcp-leg"><path d="${legs}" stroke="${deep}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>${claw(-1)}${claw(1)}`
    + `<path d="M-26 0C-26 -9 -10 -11 4 -9 14 -8 22 -5 24 0 22 5 14 8 4 9 -10 11 -26 9 -26 0Z" fill="${c}"/><path d="M-25 -3C-20 -7 -6 -9 6 -7.6 16 -6.4 21 -3.6 23 -1 14 -2.4 0 -3 -25 -3Z" fill="${lit}" fill-opacity=".55"/><path d="M-25 4C-14 8 4 8.4 22 3 18 7 8 9 -4 9 -16 9 -24 7 -25 4Z" fill="${deep}" fill-opacity=".45"/>`
    + `<path d="${plates}" stroke="${deep}" stroke-width=".7" stroke-opacity=".6" fill="none"/><path d="M-2 -8.6Q2 0 -2 8.6" stroke="${deep}" stroke-width=".8" stroke-opacity=".55" fill="none"/><path d="M4 0H20" stroke="${deep}" stroke-width=".6" stroke-opacity=".45"/>`
    + `${_gcpWhisk(22, -2, [[15, -10]], deep, 0.7)}${_gcpWhisk(22, 2, [[15, 10]], deep, 0.7)}${_gfaEyesPainted(16, 4.6)}</g>`;
}
/** A crab from above: a broad carapace lit toward the front, its ridges, jointed legs, claws with dark tips, eyes on stalks. */
function _gcpCrabPainted(def, look, rnd) {
  const c = look.c, c2 = look.c2 || _gfaLt(c, 0.4), n = _gfaN, deep = _gfaDk(c, 0.45), w = 22 + rnd() * 3, fiddler = /fiddler/.test(def.id);
  const claw = (m, k) => _gcpJoint(m * 16, -3, m < 0 ? 'gcp-claw gcp-clawl' : 'gcp-claw', `<g transform="scale(${m * k} ${k})"><path d="M0 0Q8 0 11 -8Q7 -13 12 -17Q19 -15 19 -9Q16 -8 15 -6Q18 -5 17 -2Q11 3 0 4Z" fill="${c2}"/><path d="M2 2Q10 1 15 -4Q17 -2 16 -1Q10 3 2 3.4z" fill="${_gfaDk(c2, 0.3)}" fill-opacity=".55"/><path d="M12 -17Q15 -17 17 -14L14 -12zM17 -2L19 -9 17 -8z" fill="#2a2420" fill-opacity=".8"/></g>`);
  const legs = (m) => [0, 1, 2].map((i) => _gcpJoint(m * (15 + i), 3 + i * 3, 'gcp-leg', `<path d="M0 0l${m * 8} 2 ${m * 3} 7" stroke="${deep}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M0 0l${m * 8} 2" stroke="${c}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`, '', `animation-delay:${n(-i * 0.14)}s`)).join('');
  return `<g class="gfa-fish gcp gcf-crab gcp-painted"><g transform="translate(0 2)">${legs(1)}${legs(-1)}${claw(-1, fiddler ? 0.72 : 1)}${claw(1, fiddler ? 1.38 : 1)}`
    + `<path d="M${n(-w)} 2C${n(-w)} -12 ${n(w)} -12 ${n(w)} 2C${n(w)} 13 ${n(-w)} 13 ${n(-w)} 2Z" fill="${c}"/><path d="M${n(-w * 0.9)} -1C${n(-w * 0.6)} -10 ${n(w * 0.6)} -10 ${n(w * 0.9)} -1C${n(w * 0.4)} -4 ${n(-w * 0.4)} -4 ${n(-w * 0.9)} -1Z" fill="${_gfaLt(c, 0.3)}" fill-opacity=".5"/><path d="M${n(-w)} 4C${n(-w * 0.6)} 12 ${n(w * 0.6)} 12 ${n(w)} 4C${n(w * 0.5)} 9 ${n(-w * 0.5)} 9 ${n(-w)} 4Z" fill="${deep}" fill-opacity=".45"/>`
    + `<path d="M-12 -1Q-6 1 -3 6M12 -1Q6 1 3 6M-6 -4Q0 -6 6 -4" stroke="${deep}" stroke-width=".7" stroke-opacity=".6" fill="none" stroke-linecap="round"/><path d="M-5 -8l-1 -5M5 -8l1 -5" stroke="${deep}" stroke-width="1.2"/>${_gfaEyePainted(-6, -14, 1.8, '#3a3430')}${_gfaEyePainted(6, -14, 1.8, '#3a3430')}</g></g>`;
}
