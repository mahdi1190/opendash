/* ============================================================
   THE FOLK'S SMALL HOMES, painted into their ground (rule 13: drawn in, not placed). Each is one picture with the land it is in:
     burrow  a door in a grassy bank: the bank rises out of the lawn (its turf over the top, soil showing round the door), a round
             plank door with a brass knob in a frame of roots, a worn flat step, a rag mat, a pipe chimney through the turf with its
             smoke, pebbles and tufts and two flowers where feet have not worn the grass away
     holt    an otter's holt: a turfed bank in the roots of the tree it is under, the dark way in dug at its foot, a driftwood door
             stood open, a sill of flat stones, a mooring post with its rope and a fish on a nail, reeds, ferns and tufts all round
   VALE_FOLK_ART[art](o) -> SVG in world px, the foot's middle at 0,0 (looked up beside _GAW_ART, 94-garden-zz-7act-2world.js). Seeded:
   the same strokes every time. The smoke and the reeds have their own small motion (CSS, transforms only); reduced motion stops them.
   Sizes against H, the player's height after the 0.8 change (about 33 world px): the burrow's door 0.9 H (a mole's door: Tam is 0.6 H),
   the bank 1.5 H high and 3.2 H wide; the holt's hump 1.3 H.
   ============================================================ */
function _vfaR(seed) { let a = 0; for (let i = 0; i < seed.length; i++) a = (a * 31 + seed.charCodeAt(i)) | 0; a = a || 7; return () => { a ^= a << 13; a ^= a >> 17; a ^= a << 5; return ((a >>> 0) % 100000) / 100000; }; }
const _vfaN = (v) => String(Math.round(v * 10) / 10);
/** Short painted strokes in an ellipse (grass, turf texture). */
function _vfaStrokes(r, cx, cy, rx, ry, n, len, lean, col, w, op) {
  let d = '';
  for (let i = 0; i < n; i++) { const t = r() * Math.PI * 2, k = Math.sqrt(r()), x = cx + Math.cos(t) * rx * k, y = cy + Math.sin(t) * ry * k, a = lean + (r() - 0.5) * 0.8, L = len * (0.6 + r() * 0.7); d += `M${_vfaN(x)} ${_vfaN(y)}l${_vfaN(Math.sin(a) * L)} ${_vfaN(-Math.cos(a) * L)}`; }
  return `<path d="${d}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" fill="none" opacity="${op}"/>`;
}
/** Tufts of grass along the foot of a thing, from x0 to x1, at y (growth round the base). */
function _vfaTufts(r, x0, x1, y, n, cols) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = x0 + (x1 - x0) * (i + r() * 0.8) / n, h = 3 + r() * 4, c = cols[i % cols.length];
    s += `<path d="M${_vfaN(x - 2)} ${_vfaN(y)}q${_vfaN(-0.6)} ${_vfaN(-h * 0.7)} ${_vfaN(-1.6)} ${_vfaN(-h)}M${_vfaN(x)} ${_vfaN(y)}q0.4 ${_vfaN(-h)} ${_vfaN(0.6)} ${_vfaN(-h * 1.2)}M${_vfaN(x + 2)} ${_vfaN(y)}q0.8 ${_vfaN(-h * 0.6)} ${_vfaN(2)} ${_vfaN(-h * 0.9)}" stroke="${c}" stroke-width="1" stroke-linecap="round" fill="none"/>`;
  }
  return s;
}
function _vfaSmoke(x, y) {
  // three puffs that rise and fade in turn (gda-ripple's softness, a rise of their own)
  return `<g class="vfa-smoke" transform="translate(${_vfaN(x)} ${_vfaN(y)})"><circle class="vfa-puff vfa-p1" cx="0" cy="-4" r="3.2" fill="#e8e4dc" opacity=".55"/><circle class="vfa-puff vfa-p2" cx="2" cy="-11" r="4.2" fill="#e4e0d8" opacity=".4"/><circle class="vfa-puff vfa-p3" cx="-1" cy="-19" r="5.2" fill="#dedad2" opacity=".26"/></g>`;
}
const VALE_FOLK_ART = Object.freeze({
  burrow: () => {
    const r = _vfaR('burrow');
    let s = '<ellipse cx="2" cy="1.5" rx="58" ry="7.5" fill="#1a2010" opacity=".2"/>';
    // the bank: shade silhouette, then the lit turf laid over it toward the sun (upper left), then the light glaze
    s += '<path d="M-56 2C-52 -10 -42 -30 -20 -40C-4 -47 16 -46 32 -36C46 -27 54 -12 58 2Z" fill="#55602e"/>';
    s += '<path d="M-53 1C-49 -10 -40 -28 -20 -38C-5 -44.5 14 -44 29 -35C42 -27 50 -13 53 1Z" fill="#77843e"/>';
    s += '<path d="M-46 -12C-38 -26 -26 -35 -12 -39C-24 -31 -33 -22 -38 -10Z" fill="#a8ae5a" opacity=".55"/>';
    s += _vfaTufts(r, -40, 40, -38, 9, ['#5e6a2c', '#7a8a3a', '#8e9440']).replace(/<path /g, '<path opacity=".9" ') + _vfaStrokes(r, -2, -26, 40, 14, 70, 3.2, -0.3, '#98a050', 0.9, 0.55) + _vfaStrokes(r, 10, -18, 38, 12, 40, 2.6, 0.4, '#465a2a', 0.8, 0.45);
    // soil worn bare round the door, the roots that frame it
    s += '<path d="M-22 2C-24 -10 -20 -27 -2 -31C16 -33 24 -18 24 2Z" fill="#7a5a3a"/><path d="M-19 2C-21 -9 -17 -24 -2 -28C13 -29.6 20 -17 20.4 2Z" fill="#94704a"/>';
    s += _vfaStrokes(r, 0, -12, 18, 14, 26, 2, 1.2, '#6a4a2e', 0.7, 0.55);
    s += '<path d="M-21 -10Q-26 -18 -31 -17M-16 -25Q-20 -34 -27 -35M18 -22Q24 -29 31 -27M21 -9Q27 -12 33 -9" stroke="#5a3a20" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M-21 -10Q-26 -18 -31 -17M18 -22Q24 -29 31 -27" stroke="#8a6440" stroke-width=".7" fill="none"/>';
    // the round door: a dark frame, planks, the knob, a little round window
    s += '<path d="M-13 1V-12A13 13 0 0 1 13 -12V1Z" fill="#2e1e12"/><path d="M-11 1V-12A11 11 0 0 1 11 -12V1Z" fill="#8a5630"/>';
    s += '<path d="M-5.5 1V-21.6M0 1V-23M5.5 1V-21.6" stroke="#5e3a1e" stroke-width=".9"/><path d="M-11 -6H11M-11 -15H11" stroke="#6a4426" stroke-width=".7" opacity=".7"/>';
    s += '<path d="M-10 -12A10 10 0 0 1 -2 -21.6" stroke="#b07a48" stroke-width="1.1" fill="none" opacity=".8"/>';
    s += '<circle cx="0" cy="-16.5" r="3.4" fill="#3a2a18"/><circle cx="0" cy="-16.5" r="2.5" fill="#f0c860" class="vfa-win"/><path d="M0 -19V-14M-2.5 -16.5H2.5" stroke="#3a2a18" stroke-width=".6"/>';
    s += '<circle cx="6.8" cy="-7.4" r="1.4" fill="#d8b050"/><circle cx="6.4" cy="-7.8" r=".5" fill="#fff4c8"/>';
    // the step worn smooth, the mat, pebbles; tufts and two flowers where nobody treads
    s += '<path d="M-15 1.6Q-14 -1 0 -1.2Q14 -1 15.6 1.6Q14 4.6 0 4.8Q-14 4.6 -15 1.6Z" fill="#8a8072"/><path d="M-13 1Q-11 -.4 0 -.4Q8 -.4 12 .6" stroke="#c0b6a4" stroke-width="1.1" fill="none"/>';
    s += '<path d="M-8 5.2L9 5.2L10 8.8L-9 8.8Z" fill="#a85a34"/><path d="M-7 6.4H8.6M-7.6 7.6H9.2" stroke="#e0a868" stroke-width=".6"/>';
    s += '<ellipse cx="-22" cy="3" rx="2.6" ry="1.6" fill="#9a9284"/><ellipse cx="20" cy="4" rx="2" ry="1.3" fill="#8a8478"/><ellipse cx="25" cy="2" rx="1.4" ry="1" fill="#a8a092"/>';
    s += _vfaTufts(r, -54, -24, 2, 7, ['#4e6a2c', '#6a8a3a', '#3e5a24']) + _vfaTufts(r, 24, 56, 2, 7, ['#4e6a2c', '#6a8a3a', '#3e5a24']);
    s += '<path d="M-36 0V-7M-31 1V-5" stroke="#4e6a2c" stroke-width=".8"/><circle cx="-36" cy="-7.6" r="1.6" fill="#f4f0e0"/><circle cx="-36" cy="-7.6" r=".6" fill="#e8b830"/><circle cx="-31" cy="-5.6" r="1.4" fill="#e8c040"/>';
    // the pipe chimney up through the turf, its smoke
    s += '<path d="M24 -36V-52" stroke="#3e3830" stroke-width="4.4" stroke-linecap="round"/><path d="M23 -36V-52" stroke="#6a6258" stroke-width="1.4"/><path d="M20.6 -52.6H27.4V-55.6H20.6Z" fill="#4a443c"/><path d="M20 -35Q24 -38 28 -35" stroke="#5a7434" stroke-width="2" fill="none"/>';
    s += _vfaSmoke(24, -57);
    return s;
  },
  holt: (o, inUse, row) => {
    const r = _vfaR('holt');
    // the tree it is dug under (the nearest standing tree behind its foot, from the layout as drawn): its roots come down over the bank
    // from the trunk's foot, so the holt is IN the roots, one picture with the tree; with no tree near, the roots rise to an old stump
    let tx = -10, ty = -34, tree = false;
    try {
      if (row && typeof gardenAffordThings === 'function') {
        let bd = 2.2;
        for (const t of gardenAffordThings()) {
          if (!/tree/.test(t.kind || '') || t.y > row.y + 0.2) continue;
          const d = Math.hypot(t.x - row.x, (t.y - row.y) * 0.8);
          if (d < bd) { bd = d; tx = Math.max(-30, Math.min(30, (t.x - row.x) * 48)); ty = Math.max(-44, Math.min(-22, (t.y - row.y) * 30)); tree = true; }
        }
      }
    } catch (e) { /* no tree */ }
    // (round 2) the bank rises from the lawn to the tree's own foot, so the trunk stands on top of it and grows out of it (no strip of lawn
    // between them, no collar), and the roots come out of the bank under the trunk and run down its face either side of the way in,
    // half buried in the turf: one picture with the tree. The crown of the bank is the trunk foot (tx, ty).
    const L = -56, R = 54, py = ty - 7;   // (the painted trunk stands on its thing a little above its foot row: the bank rises to meet it)
    const top = (t) => {   // a point on the bank's skyline, t 0 (left foot) .. 1 (right foot), through the trunk's foot
      const seg = t < 0.5 ? [[L, 3], [L + 10, -10], [tx - 22, py + 2], [tx, py]] : [[tx, py], [tx + 26, py - 1], [R - 14, -16], [R, 3]], u = t < 0.5 ? t * 2 : t * 2 - 1, v = 1 - u;
      return [0, 1].map(k => v * v * v * seg[0][k] + 3 * v * v * u * seg[1][k] + 3 * v * u * u * seg[2][k] + u * u * u * seg[3][k]);
    };
    const bankD = `M${L} 3C${L + 10} -10 ${_vfaN(tx - 22)} ${_vfaN(py + 2)} ${_vfaN(tx)} ${_vfaN(py)}C${_vfaN(tx + 26)} ${_vfaN(py - 1)} ${R - 14} -16 ${R} 3Z`;
    let s = '<ellipse cx="0" cy="1.5" rx="60" ry="8.5" fill="#26301a" opacity=".22"/><ellipse cx="-2" cy="2.4" rx="22" ry="4" fill="#1a1208" opacity=".3"/>';
    s += `<path d="${bankD}" fill="#56602a"/>`;
    // the lit body of the turf, toward the sun at the upper left, and the shaded right flank: the same lawn heaped up
    s += `<path d="M${L + 4} 2C${L + 13} -8 ${_vfaN(tx - 20)} ${_vfaN(py + 4)} ${_vfaN(tx - 1)} ${_vfaN(py + 2.4)}C${_vfaN(tx + 22)} ${_vfaN(py + 2)} ${R - 18} -12 ${R - 6} 2Z" fill="#7c8638"/>`;
    s += `<path d="M${L + 6} 0C${L + 12} -8 ${_vfaN(tx - 18)} ${_vfaN(py + 5)} ${_vfaN(tx - 2)} ${_vfaN(py + 4)}C${_vfaN(tx - 14)} ${_vfaN(py + 9)} ${L + 20} -4 ${L + 16} 1Z" fill="#a4aa52" opacity=".55"/>`;
    s += `<path d="M${_vfaN(tx + 18)} ${_vfaN(py + 3)}C${R - 16} -12 ${R - 8} -6 ${R - 4} 2L${R - 18} 2C${R - 20} -6 ${_vfaN(tx + 24)} ${_vfaN(py + 9)} ${_vfaN(tx + 18)} ${_vfaN(py + 3)}Z" fill="#4a5424" opacity=".5"/>`;
    // tussocks laid along the turf, lighter on the lit side
    for (let i = 0; i < 18; i++) { const t = 0.06 + 0.88 * (i / 17), [x, y] = top(t), dy = 5 + r() * 12, lit = x < tx + 6; s += `<ellipse cx="${_vfaN(x + (r() - 0.5) * 6)}" cy="${_vfaN(Math.min(-3, y + dy))}" rx="${_vfaN(6 + r() * 6)}" ry="${_vfaN(3 + r() * 2.4)}" fill="${lit ? (i % 2 ? '#8e983e' : '#98a044') : (i % 2 ? '#6c7632' : '#747e36')}" opacity=".85"/>`; }
    s += _vfaStrokes(r, -4, -14, 46, 12, 110, 3.2, -0.25, '#b4b860', 0.9, 0.5) + _vfaStrokes(r, 12, -10, 40, 10, 70, 2.8, 0.35, '#48521f', 0.8, 0.45);
    // the old roots: out of the bank under the trunk, thick there, down the bank's face either side of the way in, sinking into the turf
    const taper = (P, w0, w1) => {   // a tapered root along a cubic P (4 points): the two edges, then closed
      const pt = (u) => { const v = 1 - u; return [0, 1].map(k => v * v * v * P[0][k] + 3 * v * v * u * P[1][k] + 3 * v * u * u * P[2][k] + u * u * u * P[3][k]); };
      const A = [], B = [];
      for (let i = 0; i <= 12; i++) { const u = i / 12, p = pt(u), q = pt(Math.min(1, u + 0.02)), o = pt(Math.max(0, u - 0.02)), dx = q[0] - o[0], dy = q[1] - o[1], n = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * u) / 2; A.push([p[0] - dy / n * w, p[1] + dx / n * w]); B.push([p[0] + dy / n * w, p[1] - dx / n * w]); }
      return 'M' + A.concat(B.reverse()).map(p => _vfaN(p[0]) + ' ' + _vfaN(p[1])).join('L') + 'Z';
    };
    const roots = [
      [[[tx - 3, py + 1], [tx - 8, py + 12], [-27, -18], [-21, 3]], 13, 3.4],    // down the left of the door
      [[[tx + 5, py + 2], [tx + 20, py + 9], [13, -25], [17, 2]], 12, 3],        // over the door and down its right
      [[[tx - 7, py + 1], [tx - 18, py + 3], [-38, -10], [-44, -1]], 8, 1.6],    // out to the left, sinking in
    ];
    for (const [P, w0, w1] of roots) {
      const d = taper(P, w0, w1), m = P.map(p => [p[0] - 0.9, p[1] - 1.2]);
      s += `<path d="${d}" fill="#4a3624"/><path d="${taper(m, w0 * 0.66, w1 * 0.6)}" fill="#785c40"/><path d="${taper(m.map(p => [p[0] - 1, p[1] - 0.8]), w0 * 0.26, w1 * 0.3)}" fill="#957652" opacity=".7"/><path d="M${_vfaN(m[0][0])} ${_vfaN(m[0][1])}C${_vfaN(m[1][0])} ${_vfaN(m[1][1])} ${_vfaN(m[2][0])} ${_vfaN(m[2][1])} ${_vfaN(m[3][0])} ${_vfaN(m[3][1])}" stroke="#a08058" stroke-width=".8" fill="none" opacity=".7" transform="translate(-1 -1)"/>`;
      s += `<path d="M${_vfaN(P[0][0])} ${_vfaN(P[0][1] - 1)}C${_vfaN(P[1][0])} ${_vfaN(P[1][1] - 1.6)} ${_vfaN(P[2][0])} ${_vfaN(P[2][1] - 1.6)} ${_vfaN(P[3][0])} ${_vfaN(P[3][1] - 1)}" pathLength="100" stroke="#7e8e3c" stroke-width="2" stroke-dasharray="5 13" stroke-dashoffset="-${Math.round(r() * 12)}" fill="none" opacity=".7"/>`;   // moss on their backs
      // turf grown back over them in places (half buried)
      for (const u of [0.86]) { const v = 1 - u, x = v * v * v * P[0][0] + 3 * v * v * u * P[1][0] + 3 * v * u * u * P[2][0] + u * u * u * P[3][0], y = v * v * v * P[0][1] + 3 * v * v * u * P[1][1] + 3 * v * u * u * P[2][1] + u * u * u * P[3][1]; s += `<ellipse cx="${_vfaN(x)}" cy="${_vfaN(y + 1)}" rx="${_vfaN(w0 * 0.55)}" ry="2.2" fill="#7c8638"/>` + _vfaTufts(r, x - 4, x + 4, y + 1.6, 2, ['#7e8a36', '#9aa246']); }
    }
    // the trunk's foot flares into the roots at the top of the bank: bark the colour of the tree's, its base lost in the grass
    s += `<path d="M${_vfaN(tx - 13)} ${_vfaN(py + 3)}C${_vfaN(tx - 7)} ${_vfaN(py)} ${_vfaN(tx - 6)} ${_vfaN(py - 4)} ${_vfaN(tx - 5.5)} ${_vfaN(py - 7)}L${_vfaN(tx + 5.5)} ${_vfaN(py - 7)}C${_vfaN(tx + 6)} ${_vfaN(py - 4)} ${_vfaN(tx + 8)} ${_vfaN(py)} ${_vfaN(tx + 14)} ${_vfaN(py + 3)}Z" fill="#664d36" opacity="${tree ? 0.95 : 1}"/><path d="M${_vfaN(tx - 9)} ${_vfaN(py + 2)}C${_vfaN(tx - 5)} ${_vfaN(py - 1)} ${_vfaN(tx - 4)} ${_vfaN(py - 4)} ${_vfaN(tx - 4)} ${_vfaN(py - 6.6)}" stroke="#8a6a48" stroke-width="1" fill="none" opacity=".8"/>`;
    if (!tree) s += `<ellipse cx="${_vfaN(tx)}" cy="${_vfaN(py - 7)}" rx="5.6" ry="2" fill="#a88a62"/><ellipse cx="${_vfaN(tx)}" cy="${_vfaN(py - 7)}" rx="3.4" ry="1.1" fill="#c8ac80"/>`;
    // grass blades standing proud along the whole skyline (the bank's edge is grass, not a drawn line), thick round the trunk's foot
    let bl = '';
    for (let i = 0; i < 54; i++) { const t = 0.03 + 0.94 * r(), [x, y] = top(t), h = 4 + r() * 6, l = (r() - 0.5) * 3; bl += `M${_vfaN(x)} ${_vfaN(y + 2)}q${_vfaN(l * 0.4)} ${_vfaN(-h * 0.6)} ${_vfaN(l)} ${_vfaN(-h)}`; }
    for (let i = 0; i < 12; i++) { const x = tx - 12 + 24 * r(), h = 3 + r() * 5; bl += `M${_vfaN(x)} ${_vfaN(py + 3)}q0.4 ${_vfaN(-h * 0.6)} ${_vfaN((r() - 0.5) * 2)} ${_vfaN(-h)}`; }
    s += `<path d="${bl}" stroke="#7a8634" stroke-width="1.1" fill="none" stroke-linecap="round"/><path d="${bl}" stroke="#b8bc62" stroke-width=".5" fill="none" opacity=".7" transform="translate(-.5 -.4)"/>`;
    // the way in, dug at the foot between two roots: warm dark earth going back into shadow, not a black hole; a lip of bare soil
    s += '<path d="M-19 3C-20 -6 -15 -15 -3 -17C9 -18 16 -9 16 3Z" fill="#7a5a3a"/><path d="M-15 3C-16 -4 -12 -12 -3 -13.4C6 -14 12 -7 12 3Z" fill="#3a2816"/>';
    s += '<path d="M-11 3C-11.6 -3 -8.6 -9 -3 -10C3 -10.4 7.6 -5 8 3Z" fill="#24180c"/><path d="M-13 -2C-12 -8 -8 -11.6 -3 -12.2" stroke="#9a7a54" stroke-width="1" fill="none" opacity=".8"/>';
    s += _vfaStrokes(r, -2, -8, 16, 9, 22, 1.8, 1.1, '#5a4028', 0.7, 0.45);
    // a driftwood door stood open against the bank, a sill of flat stones worn pale in the middle
    s += '<path d="M9 3L10.6 -11.6L18 -8.4L17.4 3Z" fill="#a8987e"/><path d="M11 -9L17.4 -6.6M11 -4.4L17.6 -2.8M11 .4L17.6 1" stroke="#6a5a46" stroke-width=".7"/><circle cx="15.6" cy="-4.2" r=".9" fill="#c0a050"/>';
    s += '<path d="M-17 3.4Q-8 1 0 1.2Q9 1 16 3.4Q9 6.2 0 6.2Q-9 6.2 -17 3.4Z" fill="#8e877a"/><path d="M-12 2.8Q-4 1.6 4 1.8" stroke="#c4bca8" stroke-width="1.1" fill="none"/><ellipse cx="-20" cy="5" rx="2.6" ry="1.5" fill="#9a9284"/><ellipse cx="21" cy="5.4" rx="2" ry="1.2" fill="#8a8478"/>';
    // a mooring post with its rope and a fish on a nail (an otter's front door is the water's), reeds and ferns, tufts and two flowers
    s += '<path d="M33 4V-16" stroke="#4a3420" stroke-width="3.4" stroke-linecap="round"/><path d="M32.2 4V-16" stroke="#8a6a46" stroke-width="1"/><path d="M30 -9q3 2 6 0M30 -6q3 2 6 0" stroke="#c8b07a" stroke-width="1.2" fill="none"/>';
    s += '<path d="M25 -12q3 -2 6 0q-3 2 -6 0zM31 -12l2 -1.6v3.2z" fill="#8ca0a8"/><circle cx="26.4" cy="-12.2" r=".5" fill="#1a1a1a"/>';
    s += '<g class="vfa-reeds"><path d="M-46 4Q-50 -8 -54 -14M-43 4Q-44 -10 -42 -18M-40 4Q-37 -7 -34 -12" stroke="#5e7a36" stroke-width="1.1" fill="none" stroke-linecap="round"/><path d="M-53 -13q-3 -1 -4 -4M-42.4 -17q-2 -3 -1 -6" stroke="#7e9a48" stroke-width="1" fill="none"/></g>';
    s += '<path d="M42 4Q40 -4 34 -7M42 4Q44 -5 50 -8M42 4Q46 0 52 -1" stroke="#5a7030" stroke-width="1.4" fill="none" stroke-linecap="round"/>';
    s += _vfaTufts(r, -58, -18, 4, 10, ['#6e7a30', '#8a9440', '#5a6628']) + _vfaTufts(r, 18, 58, 4, 10, ['#6e7a30', '#8a9440', '#5a6628']);
    s += '<path d="M-28 2V-5M-24 3V-3" stroke="#4e6a2c" stroke-width=".8"/><circle cx="-28" cy="-5.6" r="1.5" fill="#f4f0e0"/><circle cx="-28" cy="-5.6" r=".6" fill="#e8b830"/><circle cx="-24" cy="-3.6" r="1.3" fill="#d8a0c8"/>';
    return s;
  },
});
