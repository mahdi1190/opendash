/* ============================================================
   GARDEN ART, the kit (2.23, agent 'garden-art'). The owner, 30 Oct 2026: adding content must be adding one data entry, with no
   engine code; art comes from reusable kit parts and named animation clips. docs/dev/GARDEN.md section 15 has the recipe.

   A catalogue row with `look.parts` needs no drawing of its own: gardenArt builds it from these parts.

     look: {c, c2, h, clip: 'bob', parts: [['post', {h: 40}], ['lantern', {y: -40, r: 8}], ['bush', {x: 12, w: 16, clip: 'sway'}]]}

   A part is [name, spec]. spec: x, y (where it stands, art units, y is negative going up; 0, 0 is the ground anchor), w, h, r (its size),
   c, c2 (colours, default look.c / look.c2), clip (a name from GART_CLIPS, for this part alone). look.clip moves the whole thing.
   Unknown part or clip names are skipped, never an error: a row from a newer version still draws what this one knows.

     gartClip(name, inner, r)   wrap markup in a named clip (a seeded phase, so a row of them is never in step)
     gartPart(name, draw)       add a part: draw(spec, tones, tones2, A, o, r) -> markup. Parts are light from the upper left: base, lit left, shaded right.

   Everything still gets the shared finish in gardenArt (the ink line); plants and decorations get a soft shadow automatically.
   PURE: nothing drawn at load.
   ============================================================ */
/** The named clips: name -> the CSS class that runs it (94-garden.css, 94-garden-art.css). Stopped by reduced motion and the Fun level like all the rest. */
const GART_CLIPS = Object.freeze({
  sway: 'gda-sway', flutter: 'gda-flutter', glow: 'gda-glow', ripple: 'gda-ripple', flicker: 'gda-flicker', spin: 'gda-spin', bob: 'gda-bob', blink: 'gda-blink',
  swing: 'gart-swing', buzz: 'gart-buzz', hop: 'gart-hop', peck: 'gart-peck', wag: 'gart-wag', shuffle: 'gart-shuffle', creep: 'gart-creep', breathe: 'gart-breathe', ear: 'gart-ear', step: 'gart-step', flick: 'gart-flick',
});
function gartClip(name, inner, r) {
  const cls = Object.prototype.hasOwnProperty.call(GART_CLIPS, name) ? GART_CLIPS[name] : '';
  if (!cls || !inner) return inner;
  return `<g class="${cls}" style="${GART.T(r || GART.rng(1), 0, 5)}">${inner}</g>`;
}
const _GART_PARTS = Object.create(null);
function gartPart(name, draw) { if (name && typeof draw === 'function') _GART_PARTS[name] = draw; }

/* ---------- things that stand ---------- */
gartPart('post', (p, T, T2, A, o) => { const w = p.w || 6, h = p.h || 40, x = p.x || 0, y = p.y || 0; return A.P(T[1], A.rrect(x - w / 2, y - h, w, h, 1.8)) + A.P(T[2], A.rect(x - w / 2 + 0.8, y - h + 1.2, w * 0.3, h - 2.4), 0.85) + A.P(T[0], A.rect(x + w * 0.16, y - h + 1.2, w * 0.28, h - 2.4), 0.45) + (o.season === 'winter' && h > 16 ? gartSnowCap(A, x, y - h, w * 1.5, 0.7) : ''); });
gartPart('block', (p, T, T2, A) => { const w = p.w || 24, h = p.h || 12, x = p.x || 0, y = p.y || 0; return A.P(T[1], A.rrect(x - w / 2, y - h, w, h, 2.4)) + A.P(T[2], A.rrect(x - w / 2 + 1.4, y - h + 1.2, w * 0.36, h - 2.6, 1.4), 0.75) + A.P(T[0], A.rect(x + w * 0.22, y - h + 1.4, w * 0.24, h - 2.8), 0.5); });
gartPart('box', (p, T, T2, A) => { const w = p.w || 30, h = p.h || 20, x = p.x || 0, y = p.y || 0; let s = A.P(T[1], A.rrect(x - w / 2, y - h, w, h, 2)), l = ''; for (let k = 1; k < 4; k++) l += `M${A.f1(x - w / 2)} ${A.f1(y - h + k * h / 4)}h${A.f1(w)}`; s += A.S(T[0], 0.8, l, 0.7) + A.P(T[2], A.rect(x - w / 2 + 1, y - h + 1, w - 2, 2), 0.7); return s; });
gartPart('pot', (p, T, T2, A) => { const w = p.w || 22, h = p.h || 18, x = p.x || 0, y = p.y || 0; return A.P(T[1], `M${A.f1(x - w / 2)} ${A.f1(y - h)}h${A.f1(w)}l${A.f1(-w * 0.14)} ${A.f1(h)}h${A.f1(-w * 0.72)}z`) + A.P(T[2], `M${A.f1(x - w * 0.4)} ${A.f1(y - h + 2)}h${A.f1(w * 0.18)}l${A.f1(-w * 0.03)} ${A.f1(h - 3)}h${A.f1(-w * 0.1)}z`, 0.75) + A.P(T[0], A.rrect(x - w * 0.55, y - h - 2.4, w * 1.1, 4.4, 1.6)); });
gartPart('roof', (p, T, T2, A, o) => { const w = p.w || 36, h = p.h || 16, x = p.x || 0, y = p.y || 0; return A.P(T[1], `M${A.f1(x - w / 2)} ${A.f1(y)}L${A.f1(x)} ${A.f1(y - h)}L${A.f1(x + w / 2)} ${A.f1(y)}Q${A.f1(x)} ${A.f1(y + 2)} ${A.f1(x - w / 2)} ${A.f1(y)}z`) + A.P(T[2], `M${A.f1(x - w * 0.42)} ${A.f1(y - 1)}L${A.f1(x - 1)} ${A.f1(y - h + 2)}L${A.f1(x - w * 0.1)} ${A.f1(y - 1)}z`, 0.7) + (o.season === 'winter' ? gartSnowCap(A, x, y - h + 2, w * 0.6, 0.9) : ''); });
gartPart('bowl', (p, T, T2, A) => { const w = p.w || 28, h = p.h || 8, x = p.x || 0, y = p.y || 0; return A.P(T[1], `M${A.f1(x - w / 2)} ${A.f1(y - h)}Q${A.f1(x)} ${A.f1(y + h * 0.6)} ${A.f1(x + w / 2)} ${A.f1(y - h)}z`) + A.P(T2[2], A.ell(x, y - h, w * 0.42, h * 0.3)); });
gartPart('orb', (p, T, T2, A) => { const r = p.r || 8, x = p.x || 0, y = p.y || 0; return A.P(T[1], A.circ(x, y - r, r)) + A.P(T[0], `M${A.f1(x + r * 0.1)} ${A.f1(y)}A${A.f1(r)} ${A.f1(r)} 0 0 0 ${A.f1(x + r)} ${A.f1(y - r)}Q${A.f1(x + r * 0.5)} ${A.f1(y - r * 0.3)} ${A.f1(x + r * 0.1)} ${A.f1(y)}z`, 0.5) + A.P('#ffffff', A.ell(x - r * 0.35, y - r * 1.35, r * 0.28, r * 0.2), 0.8); });
gartPart('lantern', (p, T, T2, A, o, r) => { const R = p.r || 7, x = p.x || 0, y = p.y || 0, lit = o.night || o.dusk, g = lit ? '#ffe9a8' : T2[2]; return gartHalo(o, r, x, y - R, R * 3.6, T2[1]) + A.P(T[1], A.rrect(x - R * 0.82, y - R * 0.22, R * 1.64, R * 0.34, 0.6)) + A.P(g, A.rrect(x - R * 0.72, y - R * 1.7, R * 1.44, R * 1.5, 1.6)) + A.P('#fffbea', A.rrect(x - R * 0.5, y - R * 1.54, R * 0.34, R * 0.74, 0.6), 0.8) + A.S(T[1], Math.max(0.8, R * 0.12), `M${A.f1(x)} ${A.f1(y - R * 1.7)}V${A.f1(y - R * 0.2)}`) + A.P(T[1], `M${A.f1(x - R * 1.04)} ${A.f1(y - R * 1.66)}Q${A.f1(x)} ${A.f1(y - R * 2.9)} ${A.f1(x + R * 1.04)} ${A.f1(y - R * 1.66)}z`) + A.P(T[1], A.circ(x, y - R * 2.5, R * 0.17)) + (o.season === 'winter' ? gartSnowCap(A, x, y - R * 2.2, R * 1.5, 0.7) : ''); });
gartPart('flag', (p, T, T2, A) => { const w = p.w || 14, h = p.h || 9, x = p.x || 0, y = p.y || 0; return A.P(T[1], `M${A.f1(x)} ${A.f1(y)}Q${A.f1(x + w * 0.5)} ${A.f1(y - 2)} ${A.f1(x + w)} ${A.f1(y + h * 0.3)}L${A.f1(x + w)} ${A.f1(y + h)}Q${A.f1(x + w * 0.5)} ${A.f1(y + h - 2)} ${A.f1(x)} ${A.f1(y + h)}z`) + A.P(T[2], `M${A.f1(x)} ${A.f1(y)}Q${A.f1(x + w * 0.4)} ${A.f1(y - 1.4)} ${A.f1(x + w * 0.55)} ${A.f1(y)}V${A.f1(y + h * 0.4)}H${A.f1(x)}z`, 0.7); });
gartPart('bush', (p, T, T2, A, o, r) => { const w = p.w || 18, x = p.x || 0, y = p.y || 0, L = gartSeasonLeaf(o, 'herb'), h = p.h || w * 0.8; return A.P(L[0], A.blob(r, x, y - h * 0.5, w, h * 0.62, 9, 0.25)) + A.P(L[1], A.blob(r, x - w * 0.12, y - h * 0.62, w * 0.72, h * 0.44, 8, 0.25)) + A.P(L[2], A.blob(r, x - w * 0.3, y - h * 0.8, w * 0.36, h * 0.2, 7, 0.25), 0.9); });
gartPart('stone', (p, T, T2, A, o, r) => { const w = p.w || 14, x = p.x || 0, y = p.y || 0, S = GART_PAL.stone; return A.P(S[1], A.blob(r, x, y - w * 0.34, w * 0.6, w * 0.4, 8, 0.2)) + A.P(S[2], A.ell(x - w * 0.16, y - w * 0.48, w * 0.24, w * 0.12), 0.85); });
gartPart('mushroom', (p, T, T2, A) => { const r = p.r || 7, x = p.x || 0, y = p.y || 0; return A.P('#f4ecd8', A.rrect(x - r * 0.3, y - r * 1.1, r * 0.6, r * 1.1, 1)) + A.P(T[1], `M${A.f1(x - r)} ${A.f1(y - r)}Q${A.f1(x)} ${A.f1(y - r * 2.6)} ${A.f1(x + r)} ${A.f1(y - r)}z`) + A.P(T2[2], A.circ(x - r * 0.3, y - r * 1.4, r * 0.18) + A.circ(x + r * 0.3, y - r * 1.5, r * 0.14)); });
/* ---------- creatures (body, head and so on are small round shapes: a face reads at any size) ---------- */
gartPart('body', (p, T, T2, A) => { const w = p.w || 10, h = p.h || 7, x = p.x || 0, y = p.y || -8; return A.P(T[1], A.ell(x, y, w, h)) + A.P(T[2], A.ell(x - w * 0.3, y - h * 0.32, w * 0.5, h * 0.42), 0.8) + A.P(T2[1], A.ell(x + w * 0.1, y + h * 0.44, w * 0.56, h * 0.42), 0.85); });
gartPart('head', (p, T, T2, A) => { const r = p.r || 5, x = p.x || 8, y = p.y || -13; return A.P(T[1], A.circ(x, y, r)) + A.P(T[2], A.circ(x - r * 0.3, y - r * 0.3, r * 0.5), 0.75) + A.P('#1a1410', A.circ(x + r * 0.32, y - r * 0.12, r * 0.34)) + A.P('#ffffff', A.circ(x + r * 0.44, y - r * 0.26, r * 0.13)) + A.P('#f08a8a', A.ell(x + r * 0.02, y + r * 0.42, r * 0.28, r * 0.18), 0.45); });
gartPart('beak', (p, T, T2, A) => { const w = p.w || 4, x = p.x || 12.6, y = p.y || -13; return A.P(p.c || '#f2a832', `M${A.f1(x)} ${A.f1(y - w * 0.4)}L${A.f1(x + w)} ${A.f1(y)}L${A.f1(x)} ${A.f1(y + w * 0.4)}z`); });
gartPart('legs', (p, T, T2, A) => { const h = p.h || 6, x = p.x || 0, y = p.y || 0, g = p.w || 3; return A.S(p.c || '#6a4a2e', 1.7, `M${A.f1(x - g)} ${A.f1(y - h)}V${A.f1(y)}h2M${A.f1(x + g)} ${A.f1(y - h)}V${A.f1(y)}h2`); });
gartPart('tail', (p, T, T2, A) => { const L = p.w || 9, x = p.x || -9, y = p.y || -9; return A.P(T[0], `M${A.f1(x)} ${A.f1(y - 2)}L${A.f1(x - L)} ${A.f1(y - 4)}L${A.f1(x - L * 0.9)} ${A.f1(y + 1)}L${A.f1(x)} ${A.f1(y + 2)}z`); });
gartPart('wings', (p, T, T2, A) => { const w = p.w || 8, x = p.x || 0, y = p.y || -8; const d = s => `M${A.f1(x)} ${A.f1(y)}C${A.f1(x + s * w * 0.3)} ${A.f1(y - w * 0.8)} ${A.f1(x + s * w)} ${A.f1(y - w * 0.9)} ${A.f1(x + s * w)} ${A.f1(y - w * 0.3)}C${A.f1(x + s * w)} ${A.f1(y + w * 0.1)} ${A.f1(x + s * w * 0.4)} ${A.f1(y + w * 0.3)} ${A.f1(x)} ${A.f1(y)}z`; return `<g class="gart-wing">${A.P(T[1], d(-1))}${A.P(T2[1], A.circ(x - w * 0.62, y - w * 0.42, w * 0.13))}</g><g class="gart-wing is-r">${A.P(T[1], d(1))}${A.P(T2[1], A.circ(x + w * 0.62, y - w * 0.42, w * 0.13))}</g>`; });

/** Draw a list of parts ([[name, spec], ...]): unknown names are skipped. c0, c20 the colours they default to. */
function gartPartsDraw(list, o, r, A, c0, c20) {
  let s = '';
  for (const entry of Array.isArray(list) ? list.slice(0, 24) : []) {
    if (!Array.isArray(entry)) continue;
    const draw = _GART_PARTS[entry[0]], p = entry[1] && typeof entry[1] === 'object' ? entry[1] : {};
    if (!draw) continue;
    const T = GART.tone3(GART.HEX.test(String(p.c)) ? p.c : c0), T2 = GART.tone3(GART.HEX.test(String(p.c2)) ? p.c2 : c20);
    s += gartClip(p.clip, draw(p, T, T2, A, o, r), r);
  }
  return s;
}
/** The drawing for every catalogue row with look.parts (0core's _gartFind falls back to it). */
gartDefine('kit:parts', {
  box: [64, 64], fit: 'none',
  draw(o, r, A) {
    const look = o.look || {}, c0 = GART.HEX.test(String(look.c)) ? o.main || look.c : '#b08a60', c20 = GART.HEX.test(String(look.c2)) ? look.c2 : A.lt(c0, 0.3);
    const list = Array.isArray(look.parts) ? look.parts : [];
    const s = gartPartsDraw(list, o, r, A, c0, c20);
    let foot = 0;
    for (const entry of list.slice(0, 24)) { const p = Array.isArray(entry) && entry[1] && typeof entry[1] === 'object' ? entry[1] : {}; foot = Math.max(foot, Math.abs(p.x || 0) + (p.w || p.r || 8) * 0.6); }
    if (!s) return '';
    // a plant made of parts grows like any other: a mound first, then the whole drawing scaled by the shared young-plant rule
    if (o.kind === 'plant' && o.stage === 0) return gartSeed(o, A, 'seed', c0);
    const k = o.kind === 'plant' ? [0, 0.45, 0.65, 0.85, 1][o.stage] : 1;
    const body = gartClip(look.clip, k === 1 ? s : `<g transform="scale(${k})">${s}</g>`, r);
    return (o.kind === 'visitor' ? '' : A.shadow(foot + 4, 3)) + body;
  },
});
