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
    // contact shadow under the bank, soft and wide, darker at the dug mouth's foot
    let s = '<ellipse cx="0" cy="1" rx="58" ry="8" fill="#26301a" opacity=".22"/><ellipse cx="-2" cy="2" rx="22" ry="4" fill="#1a1208" opacity=".3"/>';
    // the bank: no single hard outline. A shade body, then turf laid in overlapping tussocks toward the light (upper left), in the
    // lawn's own olive and straw, so it is the same ground heaped up and not a brighter thing set on it
    s += '<path d="M-54 3C-50 -6 -42 -18 -30 -26C-18 -33 -2 -36 12 -34C28 -31 42 -20 52 3Z" fill="#5f6a2e"/>';
    let tus = '';
    for (let i = 0; i < 16; i++) {
      const a = Math.PI * (0.06 + 0.88 * i / 15), cx = -Math.cos(a) * 44, cy = -Math.sin(a) * 28 + 3, rx = 9 + r() * 6, ry = 6 + r() * 4, lit = cx < 8;
      tus += `<ellipse cx="${_vfaN(cx)}" cy="${_vfaN(cy + 5)}" rx="${_vfaN(rx)}" ry="${_vfaN(ry)}" fill="${lit ? (i % 2 ? '#8e983e' : '#9aa246') : (i % 2 ? '#727c34' : '#7a8438')}"/>`;
    }
    s += tus + '<path d="M-26 -4C-24 -14 -12 -22 4 -22C18 -22 28 -14 30 -2C20 -8 -10 -10 -26 -4Z" fill="#848e3a"/>';
    s += '<path d="M-42 -4C-36 -16 -24 -26 -8 -30C-20 -22 -30 -13 -34 -2Z" fill="#b0b45a" opacity=".45"/><path d="M14 -28C28 -24 40 -14 46 0C38 -10 28 -20 14 -24Z" fill="#4e5826" opacity=".45"/>';
    s += _vfaStrokes(r, -4, -18, 44, 15, 90, 3.4, -0.25, '#b4b860', 0.9, 0.5) + _vfaStrokes(r, 10, -12, 40, 12, 60, 2.8, 0.35, '#4a5424', 0.8, 0.45) + _vfaStrokes(r, -10, -24, 30, 8, 40, 2.4, -0.5, '#c8c474', 0.7, 0.4);
    // grass blades standing proud along the whole crown (the skyline is grass, not a drawn line)
    let bl = '';
    for (let i = 0; i < 46; i++) { const a = Math.PI * (0.03 + 0.94 * r()), x = -Math.cos(a) * 50, y = -Math.sin(a) * 33 + 2, h = 4 + r() * 6, l = (r() - 0.5) * 3; bl += `M${_vfaN(x)} ${_vfaN(y)}q${_vfaN(l * 0.4)} ${_vfaN(-h * 0.6)} ${_vfaN(l)} ${_vfaN(-h)}`; }
    s += `<path d="${bl}" stroke="#7e8a36" stroke-width="1.1" fill="none" stroke-linecap="round"/><path d="${bl}" stroke="#b8bc62" stroke-width=".5" fill="none" opacity=".7" transform="translate(-.5 -.4)"/>`;
    // the old roots: from the tree's foot down over the bank and into the ground on both sides, bark-coloured with a lit edge and moss
    // on their backs; the root collar at the top is the trunk's own foot flaring into them
    let rt = '', rl = '';
    for (const [ex, ey] of [[-50, 2], [-36, -1], [-22, -5], [22, -5], [38, -1], [52, 2]]) {
      const sx = tx + (ex > tx ? 3 : -3), mx = (tx + ex) / 2 + (r() - 0.5) * 8, my = ty + (ey - ty) * 0.3 - 4;
      rt += `M${_vfaN(sx)} ${_vfaN(ty + 2)}Q${_vfaN(mx)} ${_vfaN(my)} ${_vfaN(ex)} ${_vfaN(ey)}`;
      rl += `M${_vfaN(sx)} ${_vfaN(ty + 1)}Q${_vfaN(mx)} ${_vfaN(my - 1.4)} ${_vfaN(ex)} ${_vfaN(ey - 1.2)}`;
    }
    s += `<path d="${rt}" stroke="#3e2c1a" stroke-width="6" fill="none" stroke-linecap="round"/><path d="${rt}" stroke="#6a4c30" stroke-width="4" fill="none" stroke-linecap="round"/><path d="${rl}" stroke="#987654" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".85"/><path d="${rl}" stroke="#7a8a3a" stroke-width="1.8" fill="none" stroke-dasharray="3 9" opacity=".7"/>`;
    const top = tree ? 12 : 9;
    s += `<path d="M${_vfaN(tx - 13)} ${_vfaN(ty + 6)}Q${_vfaN(tx - 8)} ${_vfaN(ty - 4)} ${_vfaN(tx - 6)} ${_vfaN(ty - top)}L${_vfaN(tx + 6)} ${_vfaN(ty - top)}Q${_vfaN(tx + 8)} ${_vfaN(ty - 4)} ${_vfaN(tx + 13)} ${_vfaN(ty + 6)}Z" fill="#5c4228"/><path d="M${_vfaN(tx - 9)} ${_vfaN(ty + 4)}Q${_vfaN(tx - 6)} ${_vfaN(ty - 4)} ${_vfaN(tx - 4.5)} ${_vfaN(ty - top)}" stroke="#8e6c4a" stroke-width="1.4" fill="none"/>`;
    if (!tree) s += `<ellipse cx="${_vfaN(tx)}" cy="${_vfaN(ty - 9)}" rx="6" ry="2.2" fill="#a88a62"/><ellipse cx="${_vfaN(tx)}" cy="${_vfaN(ty - 9)}" rx="3.6" ry="1.2" fill="#c8ac80"/>`;
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
    s += _vfaSmoke(tx + 16, ty - 2);
    return s;
  },
});
