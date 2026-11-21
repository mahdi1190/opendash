/* ============================================================
   THE FOLK'S SMALL HOMES, painted into their ground (rule 13: drawn in, not placed). Each is one picture with the land it is in:
     burrow  a door in a grassy bank: the bank rises out of the lawn (its turf over the top, soil showing round the door), a round
             plank door with a brass knob in a frame of roots, a worn flat step, a rag mat, a pipe chimney through the turf with its
             smoke, pebbles and tufts and two flowers where feet have not worn the grass away
     holt    an otter's holt in the roots of a bank at the water: a hump of earth held in a cage of old roots, the dark way in at its
             foot, a driftwood door half open, a mooring post with a coil of rope, reeds and a few stones in the wet at its toe
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
    s += '<path d="M-56 2C-52 -10 -42 -30 -20 -40C-4 -47 16 -46 32 -36C46 -27 54 -12 58 2Z" fill="#4e6430"/>';
    s += '<path d="M-53 1C-49 -10 -40 -28 -20 -38C-5 -44.5 14 -44 29 -35C42 -27 50 -13 53 1Z" fill="#6a8640"/>';
    s += '<path d="M-46 -12C-38 -26 -26 -35 -12 -39C-24 -31 -33 -22 -38 -10Z" fill="#9ab45e" opacity=".55"/>';
    s += _vfaStrokes(r, -2, -26, 40, 14, 70, 3.2, -0.3, '#8eaa52', 0.9, 0.55) + _vfaStrokes(r, 10, -18, 38, 12, 40, 2.6, 0.4, '#465a2a', 0.8, 0.45);
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
  holt: () => {
    const r = _vfaR('holt');
    let s = '<ellipse cx="0" cy="1.5" rx="52" ry="7" fill="#102018" opacity=".22"/>';
    // the wet at its toe: dark mud and a few stones, reeds that lean
    s += '<path d="M-48 2Q-30 6 0 6.4Q30 6 50 2Q32 9 0 9.6Q-32 9 -48 2Z" fill="#4a3e2e" opacity=".75"/>';
    s += '<ellipse cx="-30" cy="5" rx="3.6" ry="2" fill="#7e786a"/><ellipse cx="-24" cy="6.4" rx="2.4" ry="1.4" fill="#948e80"/><ellipse cx="33" cy="5.6" rx="3" ry="1.8" fill="#86806f"/>';
    // the hump of earth, shade then lit
    s += '<path d="M-44 2C-40 -14 -26 -34 -2 -38C20 -40 38 -24 44 2Z" fill="#5a4630"/><path d="M-41 1C-37 -13 -24 -31 -2 -35C18 -37 34 -22 40 1Z" fill="#7a6040"/>';
    s += '<path d="M-34 -14C-28 -24 -18 -31 -6 -34C-17 -27 -24 -20 -28 -11Z" fill="#a8885a" opacity=".5"/>';
    s += _vfaStrokes(r, 0, -18, 34, 13, 40, 2.4, 0.8, '#4a3820', 0.8, 0.5);
    // grass on top, overhanging
    s += '<path d="M-30 -24C-22 -36 4 -42 26 -30C18 -34 -6 -36 -22 -26Z" fill="#5e7a36"/>' + _vfaStrokes(r, -2, -33, 26, 5, 34, 3.6, 0, '#7e9a48', 1, 0.7);
    // the cage of old roots over it, dark under, lit on top
    let roots = '';
    for (let i = 0; i < 7; i++) { const x0 = -36 + i * 12 + r() * 4, y0 = -6 - r() * 10, x1 = x0 + (r() - 0.5) * 16, y1 = -30 - r() * 6; roots += `M${_vfaN(x0)} ${_vfaN(y0)}Q${_vfaN((x0 + x1) / 2 + (r() - 0.5) * 10)} ${_vfaN((y0 + y1) / 2)} ${_vfaN(x1)} ${_vfaN(y1)}`; }
    s += `<path d="${roots}" stroke="#3e2a18" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="${roots}" stroke="#8a6a46" stroke-width=".8" fill="none" opacity=".8" transform="translate(-.6 -.6)"/>`;
    // the dark way in, a driftwood door half open, a lantern hook
    s += '<path d="M-14 2C-15 -8 -10 -17 -1 -18C8 -18 13 -9 12 2Z" fill="#1e140c"/><path d="M-12 2C-12.6 -7 -8.4 -14.6 -1 -15.4" stroke="#4a3420" stroke-width="1.2" fill="none"/>';
    s += '<path d="M3 2L4 -15.6L13.4 -11L12.8 2Z" fill="#9a8a72"/><path d="M5 -12L12.6 -9M5 -6L12.8 -4.4M5 0L12.8 .4" stroke="#6a5a46" stroke-width=".7"/><circle cx="10.6" cy="-5" r=".9" fill="#c0a050"/>';
    s += '<ellipse cx="-1" cy="-6" rx="3" ry="2.2" fill="#f0c860" opacity=".0" class="vfa-win"/>';
    // the mooring post and its rope, the reeds
    s += '<path d="M30 3V-20" stroke="#4a3420" stroke-width="3.6" stroke-linecap="round"/><path d="M29.2 3V-20" stroke="#8a6a46" stroke-width="1"/><path d="M27 -12q3 2 6 0M27 -9q3 2 6 0" stroke="#c8b07a" stroke-width="1.2" fill="none"/>';
    s += '<g class="vfa-reeds"><path d="M-42 3Q-44 -12 -47 -20M-39 3Q-39 -14 -37 -24M-36 3Q-34 -10 -31 -17" stroke="#6a7a36" stroke-width="1.1" fill="none" stroke-linecap="round"/><ellipse cx="-37.2" cy="-25.6" rx="1.2" ry="3" fill="#6a4a2a"/></g>';
    s += _vfaTufts(r, 14, 26, 2, 3, ['#5e7a36', '#4a6a2c']) + _vfaTufts(r, 36, 48, 2, 3, ['#5e7a36', '#4a6a2c']);
    return s;
  },
});
