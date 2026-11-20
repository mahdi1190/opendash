/* ============================================================
   PETS, THE HUNDRED THINGS: the things a row brings with it (round 3, the critic's pass). A row that needs a puddle, a flower clump, a leaf
   pile, long grass, a dug hole or a little campfire, played where the world has none in view, draws that thing at the pet's feet for the
   length of the row: painted in the pet kit's own flat cute style, sized against the pet (a puddle a little longer than the pet), faded in
   and out, and gone after. Nothing is saved, nothing goes to friends (their copy plays the clip by id and draws the same thing).
   _plProp(P, kind, ms)   draws it in the pet's own picture: 'back' parts behind the body, 'front' parts in front (the pile it dives into)
   ============================================================ */
const _PLP_ONE = {};
const _PLP_ART = Object.freeze({
  _one: _PLP_ONE,
  // feet are at (50, 90) in a pet's units; it faces +x (the picture flips with the pet)
  puddle: {
    back: '<ellipse cx="62" cy="91.5" rx="50" ry="10.5" fill="#6b5a3e" opacity="0.32"/><ellipse cx="62" cy="91" rx="45" ry="8.6" fill="#5f8299"/><ellipse cx="60" cy="90.2" rx="38" ry="6.2" fill="#8fb8cf"/><path d="M34 89.2q12-3.4 26-0.6" stroke="#e8f6fd" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M76 92.4q8 1.6 16-0.4" stroke="#d6ecf6" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
    anim: 'ripple',
  },
  pool: {   // a drink: the puddle out in front of the nose
    back: '<ellipse cx="88" cy="91.5" rx="30" ry="8.5" fill="#6b5a3e" opacity="0.3"/><ellipse cx="88" cy="91" rx="26" ry="6.8" fill="#5f8299"/><ellipse cx="87" cy="90.3" rx="21" ry="4.8" fill="#8fb8cf"/><path d="M74 89.4q8-2.4 16-0.4" stroke="#e8f6fd" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
    anim: 'ripple',
  },
  flowers: {
    back: '<g stroke="#4f8a34" stroke-width="2.2" stroke-linecap="round"><path d="M84 92q-2-14 1-26"/><path d="M94 92q3-12 0-30"/><path d="M104 92q-1-10 3-20"/><path d="M76 92q4-8 1-16"/></g><g fill="#6aa846"><ellipse cx="88" cy="80" rx="6" ry="2.6" transform="rotate(-30 88 80)"/><ellipse cx="99" cy="78" rx="6" ry="2.6" transform="rotate(30 99 78)"/><ellipse cx="80" cy="84" rx="5" ry="2.2" transform="rotate(-20 80 84)"/></g>'
      + '<g><circle cx="85" cy="64" r="6.4" fill="#f2a7c3"/><circle cx="85" cy="64" r="2.6" fill="#f6d35e"/><circle cx="94" cy="60" r="7" fill="#fff4f8"/><circle cx="94" cy="60" r="2.8" fill="#f6c03e"/><circle cx="107" cy="70" r="5.8" fill="#c9a6e8"/><circle cx="107" cy="70" r="2.3" fill="#f6d35e"/><circle cx="77" cy="75" r="5" fill="#f6d35e"/><circle cx="77" cy="75" r="2" fill="#e08a2a"/></g>'
      + '<ellipse cx="92" cy="92" rx="22" ry="4" fill="#2f4a22" opacity="0.18"/>',
    anim: 'sway',
  },
  leaves: {
    back: '<ellipse cx="52" cy="91" rx="46" ry="7" fill="#3a2a1a" opacity="0.18"/>',
    front: '<g><path d="M8 92q4-16 22-19q14-8 30-3q16-6 30 4q14 4 14 18z" fill="#c8662a"/><path d="M14 92q8-12 22-13q12-6 26 0q14-4 26 6q8 3 10 7z" fill="#e0953a"/>'
      + '<g fill="#b8502a"><ellipse cx="26" cy="80" rx="6" ry="3" transform="rotate(-24 26 80)"/><ellipse cx="66" cy="76" rx="6.4" ry="3" transform="rotate(18 66 76)"/><ellipse cx="88" cy="83" rx="5.6" ry="2.8" transform="rotate(-10 88 83)"/></g>'
      + '<g fill="#f2c04a"><ellipse cx="44" cy="78" rx="5.6" ry="2.6" transform="rotate(30 44 78)"/><ellipse cx="78" cy="86" rx="5" ry="2.4" transform="rotate(-36 78 86)"/><ellipse cx="18" cy="88" rx="5" ry="2.4" transform="rotate(12 18 88)"/></g>'
      + '<g fill="#9a3e22"><ellipse cx="56" cy="86" rx="5" ry="2.4" transform="rotate(-50 56 86)"/><ellipse cx="34" cy="88" rx="4.6" ry="2.2" transform="rotate(40 34 88)"/></g></g>',
  },
  grass: {
    back: '<g stroke="#4f8f36" stroke-width="2.6" stroke-linecap="round" fill="none"><path d="M70 92q2-14-4-26"/><path d="M78 92q0-18 6-30"/><path d="M88 92q-3-16 2-28"/><path d="M96 92q2-12 8-22"/></g>',
    front: '<g stroke-linecap="round" fill="none"><g stroke="#5fa040" stroke-width="2.8"><path d="M66 93q-2-12 3-22"/><path d="M74 93q3-14-1-24"/><path d="M83 93q-1-10 5-20"/><path d="M91 93q4-12 0-22"/><path d="M100 93q-2-8 3-16"/></g><g stroke="#86c45a" stroke-width="2"><path d="M70 93q1-8-2-15"/><path d="M87 93q-2-9 1-16"/><path d="M96 93q2-7 6-12"/></g></g><g fill="#f2f0e6"><circle cx="79" cy="70" r="2"/><circle cx="92" cy="73" r="1.8"/></g>',
    anim: 'sway',
  },
  tall: {   // long grass to hide in: it covers the whole pet but the ears
    back: '<g stroke="#4f8f36" stroke-width="3" stroke-linecap="round" fill="none"><path d="M18 92q-4-30 4-52"/><path d="M84 92q6-30-2-54"/></g>',
    front: '<g stroke-linecap="round" fill="none"><g stroke="#5c9c3e" stroke-width="3.4"><path d="M10 93q2-22-6-40"/><path d="M20 93q-2-26 6-46"/><path d="M30 93q4-24-2-44"/><path d="M40 93q-3-22 4-42"/><path d="M50 93q3-26-3-46"/><path d="M60 93q-2-24 5-44"/><path d="M70 93q4-22-3-42"/><path d="M80 93q-3-26 4-46"/><path d="M90 93q3-20-4-38"/></g><g stroke="#86c45a" stroke-width="2.4"><path d="M15 93q1-18-3-32"/><path d="M35 93q-2-20 3-34"/><path d="M55 93q2-22-2-36"/><path d="M75 93q-1-18 4-32"/><path d="M95 93q2-14-2-26"/></g></g><g fill="#e8e0b0"><ellipse cx="26" cy="47" rx="2.6" ry="5"/><ellipse cx="66" cy="49" rx="2.6" ry="5"/></g>',
    anim: 'sway',
  },
  hole: {
    back: '<ellipse cx="66" cy="92" rx="22" ry="6" fill="#5a3e24"/><ellipse cx="66" cy="92.6" rx="16" ry="3.8" fill="#2e1f12"/><path d="M14 93q6-14 18-14q10 0 16 14z" fill="#8a6440"/><path d="M20 93q5-9 13-9q7 0 11 9z" fill="#a47a4e"/><g fill="#6e4e30"><circle cx="40" cy="86" r="2"/><circle cx="12" cy="90" r="1.6"/><circle cx="86" cy="90" r="1.8"/></g>',
  },
  fire: {   // a little campfire in front of the pet: a ring of stones, crossed logs, a flame that flickers
    back: '<ellipse cx="112" cy="93" rx="26" ry="6" fill="#2a1e14" opacity="0.25"/><g fill="#8e8a82" stroke="#5e5a54" stroke-width="1"><ellipse cx="92" cy="92" rx="5" ry="3.4"/><ellipse cx="132" cy="92" rx="5" ry="3.4"/><ellipse cx="102" cy="95" rx="5.4" ry="3.4"/><ellipse cx="122" cy="95" rx="5.4" ry="3.4"/><ellipse cx="112" cy="96" rx="5" ry="3.2"/></g>'
      + '<g stroke-linecap="round"><path d="M96 92l32-8" stroke="#6a4024" stroke-width="5.4"/><path d="M96 84l32 8" stroke="#7d4c2a" stroke-width="5.4"/></g>'
      + '<g class="plp-flame"><path d="M112 88q-12-6-6-22q2 8 6 6q-2-12 6-20q0 12 6 16q4 10-4 20z" fill="#f08a2a"/><path d="M113 88q-7-4-3-13q2 5 4 3q0-7 4-10q1 9 3 11q1 7-4 9z" fill="#f8d046"/></g>'
      + '<circle cx="112" cy="80" r="24" fill="#ffb84a" opacity="0.14"/>',
    anim: 'flicker',
  },
});
/** The old way, in the pet's own picture and units (the treehouse sill only: it belongs with the perched pose). */
function _plPropIn(P, kind, ms) {
  const art = _PLP_ART[kind], root = P && P.root; if (!art || !root || !root.querySelector) return;
  try {
    const fxp = (root.querySelector('.pt-fx') || {}).parentNode || root;
    const native = typeof gardenVisualIsNative === 'function' && gardenVisualIsNative(fxp);
    const make = (html, front) => {
      const g = native ? gardenSceneElement('g') : document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'pt-lprop'); g.innerHTML = html;
      if (front) fxp.appendChild(g); else fxp.insertBefore(g, fxp.firstChild);
      const total = Math.max(1200, ms + 300), fade = Math.min(0.12, 260 / total);
      const a = gardenVisualAnimate(g, [{ offset: 0, opacity: 0 }, { offset: fade, opacity: 1 }, { offset: 1 - fade, opacity: 1 }, { offset: 1, opacity: 0 }], { duration: total, easing: 'linear', fill: 'both' });
      a.onfinish = () => g.remove(); a.oncancel = () => g.remove();
      return g;
    };
    if (art.back) make(art.back, false);
    if (art.front) make(art.front, true);
  } catch (e) { /* a thing it can do without */ }
}
/* ---------- round 3 (the critic): the things, painted to the vale's standard, on the pet's OUTER node ----------
   The thing is a child of the pet's own place in the world (P.node), not of its pose picture, so a clip that changes the pose (sit, lie, doze)
   no longer takes the campfire away, and a dive does not squash the leaf pile with the pet. World px, the pet's feet at (0, 0), +x away from you
   (the pet stands beside you, so the thing goes on its far side and never reaches your feet). Sized from the pet (u: a dog is 1) but never to a
   speck. Built once per kind and size, kept as text. */
const _PLQ = { cache: new Map(), live: [] };
function _plRnd(seed) { let a = seed >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }
const _plF = (v) => (Math.round(v * 10) / 10).toString();
/** A small leaf, pointed both ends, at (x, y), rotated a degrees, length l. */
function _plLeaf(x, y, a, l, fill, vein) { const w = l * 0.42; return `<g transform="translate(${_plF(x)} ${_plF(y)}) rotate(${Math.round(a)})"><path d="M${_plF(-l / 2)} 0Q0 ${_plF(-w)} ${_plF(l / 2)} 0Q0 ${_plF(w)} ${_plF(-l / 2)} 0z" fill="${fill}"/>${vein ? `<path d="M${_plF(-l / 2.4)} 0H${_plF(l / 2.4)}" stroke="${vein}" stroke-width="0.35" opacity="0.6"/>` : ''}</g>`; }
const _PLQ_ART = {
  // a real muddy puddle on soil: a darker wet rim, the mud, water holding the sky, a glint, tufts of grass and pebbles at its edge
  puddle(u) {
    const r = _plRnd(7), W = 24 * u, Hh = 6.2 * u, blob = (k, dy) => { let d = ''; for (let i = 0; i <= 12; i++) { const t = i / 12 * Math.PI * 2, w = i === 12 ? 1 : 1 + (r() - 0.5) * 0.16; d += (i ? 'L' : 'M') + _plF(Math.cos(t) * W * k * w) + ' ' + _plF(Math.sin(t) * Hh * k * w + dy); } return d + 'z'; };
    return { back: `<ellipse cx="0" cy="0.6" rx="${_plF(W * 1.22)}" ry="${_plF(Hh * 1.4)}" fill="#5c4630" opacity="0.32"/><path d="${blob(1.08, 0.3)}" fill="#6a5034" opacity="0.85"/><path d="${blob(0.96, 0.2)}" fill="#4a3826"/>`
      + `<path d="${blob(0.86, 0.1)}" fill="#5d7f90"/><path d="M${_plF(-W * 0.72)} ${_plF(-Hh * 0.18)}Q${_plF(-W * 0.1)} ${_plF(-Hh * 0.95)} ${_plF(W * 0.66)} ${_plF(-Hh * 0.3)}Q${_plF(W * 0.1)} ${_plF(Hh * 0.05)} ${_plF(-W * 0.72)} ${_plF(-Hh * 0.18)}z" fill="#a9cbd9" opacity="0.9"/>`
      + `<path d="M${_plF(-W * 0.5)} ${_plF(Hh * 0.38)}Q0 ${_plF(Hh * 0.72)} ${_plF(W * 0.55)} ${_plF(Hh * 0.3)}" stroke="#3e5a68" stroke-width="${_plF(1.1 * u)}" fill="none" opacity="0.55"/>`
      + `<path d="M${_plF(-W * 0.42)} ${_plF(-Hh * 0.42)}q${_plF(W * 0.16)} ${_plF(-Hh * 0.22)} ${_plF(W * 0.34)} ${_plF(-Hh * 0.1)}" stroke="#f4fbff" stroke-width="${_plF(1.1 * u)}" stroke-linecap="round" fill="none"/><circle cx="${_plF(W * 0.36)}" cy="${_plF(-Hh * 0.2)}" r="${_plF(0.8 * u)}" fill="#f4fbff"/>`
      + `<g stroke="#5b8f3a" stroke-width="${_plF(1.1 * u)}" stroke-linecap="round" fill="none"><path d="M${_plF(-W * 0.98)} ${_plF(-Hh * 0.2)}q-1 -5 1 -8M${_plF(-W * 0.9)} ${_plF(-Hh * 0.3)}q1 -4 3 -6M${_plF(-W * 1.04)} ${_plF(-Hh * 0.1)}q-2 -3 -3 -5M${_plF(W * 0.94)} ${_plF(-Hh * 0.6)}q0 -4 -2 -7M${_plF(W * 1.0)} ${_plF(-Hh * 0.5)}q2 -3 3 -5"/></g>`
      + `<ellipse cx="${_plF(W * 0.82)}" cy="${_plF(Hh * 0.62)}" rx="${_plF(2.2 * u)}" ry="${_plF(1.4 * u)}" fill="#9a958a"/><ellipse cx="${_plF(W * 0.8)}" cy="${_plF(Hh * 0.5)}" rx="${_plF(1.3 * u)}" ry="${_plF(0.6 * u)}" fill="#c9c4b8"/><ellipse cx="${_plF(-W * 0.72)}" cy="${_plF(Hh * 0.82)}" rx="${_plF(1.6 * u)}" ry="${_plF(1 * u)}" fill="#8a857a"/>`,
      rings: [[-W * 0.25, 0.2, W * 0.32, Hh * 0.32], [W * 0.3, -0.4, W * 0.24, Hh * 0.26]], w: W * 1.1 };
  },
  // a drink: a smaller puddle out in front of the nose
  pool(u) { const Q = _PLQ_ART.puddle(u * 0.62); return { back: `<g transform="translate(${_plF(17 * u)} 0)">${Q.back}</g>`, rings: Q.rings.map(([x, y, a, b]) => [x + 17 * u, y, a, b]), w: 17 * u + Q.w, off: 17 * u }; },
  // a heaped pile of autumn leaves: separate leaves on a dark mound, more spilled round its foot; the back half behind the pet, the front half over it
  leaves(u) {
    const r = _plRnd(21), W = 25 * u, Ht = 13 * u, cols = ['#c8642a', '#e0913a', '#b8452a', '#f0c048', '#9a3e22', '#d47a2e', '#e8a840'];
    let back = `<ellipse cx="0" cy="0.8" rx="${_plF(W * 1.25)}" ry="${_plF(4.4 * u)}" fill="#3a2a1a" opacity="0.26"/><path d="M${_plF(-W)} 1Q${_plF(-W * 0.7)} ${_plF(-Ht)} 0 ${_plF(-Ht * 1.05)}Q${_plF(W * 0.7)} ${_plF(-Ht)} ${_plF(W)} 1z" fill="#7a3a1e"/>`, front = '';
    for (let i = 0; i < 70; i++) {
      const x = (r() * 2 - 1) * W, top = -Ht * Math.sqrt(Math.max(0, 1 - (x / W) ** 2)), y = top + r() * (-top + 1.5 * u);
      const leaf = _plLeaf(x, y, r() * 360, (3.4 + r() * 2.2) * u, cols[Math.floor(r() * cols.length)], '#5a2a14');
      if (y > top * 0.45) front += leaf; else back += leaf;
    }
    for (let i = 0; i < 9; i++) { const a = r() * Math.PI * 2, d = W * (1.05 + r() * 0.35); front += _plLeaf(Math.cos(a) * d, Math.sin(a) * 4 * u + 1.5 * u, r() * 360, 3.6 * u, cols[i % cols.length], '#5a2a14'); }
    return { back, front, w: W * 1.4, burst: [W, Ht, u, cols] };
  },
  // a clump of real flowers: leafy foot, stems, five-petal blooms in several colours and a spray of forget-me-nots, in front of the nose
  flowers(u) { return _PLQ_ART.flowers0(u * 1.55); },   // (round 4: a clump about the pet's height, not a sprig)
  hole(u) { return _PLQ_ART.hole0(u * 1.4); },
  flowers0(u) {
    const r = _plRnd(5), cx = 15 * u; let s = `<ellipse cx="${_plF(cx)}" cy="0.6" rx="${_plF(10 * u)}" ry="${_plF(2.6 * u)}" fill="#2f4a22" opacity="0.26"/>`;
    let stems = '', leaves = '', blooms = '';
    const kinds = [['#f2a7c3', '#f6d35e'], ['#fff6f0', '#f2b83a'], ['#c9a6e8', '#f6d35e'], ['#f6c845', '#d0702a'], ['#f28a9a', '#f6d35e']];
    for (let i = 0; i < 6; i++) {
      const x = cx + (i - 2.5) * 2.6 * u + (r() - 0.5) * 1.5 * u, hgt = (9 + r() * 7) * u, bx = x + (r() - 0.5) * 3 * u, [pc, cc] = kinds[i % kinds.length], pr = (2.0 + r() * 0.6) * u;
      stems += `<path d="M${_plF(x)} 0Q${_plF(x + (bx - x) * 0.2)} ${_plF(-hgt * 0.5)} ${_plF(bx)} ${_plF(-hgt)}" stroke="#4f8a34" stroke-width="${_plF(0.9 * u)}" fill="none" stroke-linecap="round"/>`;
      leaves += _plLeaf(x + (r() < 0.5 ? -1 : 1) * 1.8 * u, -hgt * (0.25 + r() * 0.25), r() < 0.5 ? -35 : 35, 4.4 * u, i % 2 ? '#6aa846' : '#5a9a3c');
      let pet = ''; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + r(); pet += `<ellipse cx="${_plF(bx + Math.cos(a) * pr * 0.75)}" cy="${_plF(-hgt + Math.sin(a) * pr * 0.6)}" rx="${_plF(pr * 0.62)}" ry="${_plF(pr * 0.48)}" fill="${pc}"/>`; }
      blooms += `<g class="plq-bloom">${pet}<circle cx="${_plF(bx)}" cy="${_plF(-hgt)}" r="${_plF(pr * 0.42)}" fill="${cc}"/></g>`;
    }
    for (let i = 0; i < 6; i++) leaves += _plLeaf(cx + (r() - 0.5) * 16 * u, -(0.6 + r() * 2.4) * u, (r() - 0.5) * 70, 5 * u, i % 2 ? '#5f9e40' : '#4f8a34');
    let fmn = ''; for (let i = 0; i < 7; i++) fmn += `<circle cx="${_plF(cx + 6 * u + r() * 4 * u)}" cy="${_plF(-(5 + r() * 4) * u)}" r="${_plF(0.9 * u)}" fill="#7fb2e6"/>`;
    return { back: s + stems + leaves + blooms + fmn, w: cx + 11 * u, off: cx };
  },
  // swaying grass to bat at, with seed heads
  grass(u) {
    const r = _plRnd(11), cx = 12 * u; let b = '', f = '';
    for (let i = 0; i < 14; i++) { const x = cx + (r() - 0.5) * 16 * u, h = (8 + r() * 9) * u, bend = (r() - 0.5) * 7 * u, line = `<g><path d="M${_plF(x)} 0Q${_plF(x + bend * 0.2)} ${_plF(-h * 0.6)} ${_plF(x + bend)} ${_plF(-h)}" stroke="${i % 3 ? '#5fa040' : '#86c45a'}" stroke-width="${_plF(1.1 * u)}" fill="none" stroke-linecap="round"/>` + (i % 4 === 0 ? `<ellipse cx="${_plF(x + bend)}" cy="${_plF(-h - 1.4 * u)}" rx="${_plF(0.9 * u)}" ry="${_plF(2 * u)}" fill="#d8cf96"/>` : '') + '</g>'; if (i % 2) f += line; else b += line; }
    return { back: `<ellipse cx="${_plF(cx)}" cy="0.5" rx="${_plF(10 * u)}" ry="${_plF(2.2 * u)}" fill="#2f4a22" opacity="0.2"/>` + b, front: f, sway: true, w: cx + 10 * u, off: cx };
  },
  // long grass to hide in: it covers the whole pet but the ears
  tall(u, ph) {
    const r = _plRnd(13), W = 15 * u, top = Math.max(10 * u, ph * 0.8); let b = '', f = '';
    for (let i = 0; i < 34; i++) { const x = (r() * 2 - 1) * W, h = top * (0.75 + r() * 0.4) * (1 - Math.abs(x / W) * 0.35), bend = (r() - 0.5) * 6 * u, line = `<g><path d="M${_plF(x)} 0.5Q${_plF(x + bend * 0.2)} ${_plF(-h * 0.6)} ${_plF(x + bend)} ${_plF(-h)}" stroke="${['#5c9c3e', '#4f8a34', '#86c45a', '#6fae48'][i % 4]}" stroke-width="${_plF(1.4 * u)}" fill="none" stroke-linecap="round"/>` + (i % 6 === 0 ? `<ellipse cx="${_plF(x + bend)}" cy="${_plF(-h - 1.6 * u)}" rx="${_plF(1 * u)}" ry="${_plF(2.3 * u)}" fill="#d8cf96"/>` : '') + '</g>'; if (i < 10) b += line; else f += line; }
    return { back: `<ellipse cx="0" cy="0.6" rx="${_plF(W * 1.15)}" ry="${_plF(3 * u)}" fill="#2f4a22" opacity="0.24"/>` + b, front: f, sway: true, w: W * 1.2 };
  },
  // a dug hole: thrown-back soil, the dark hole, crumbs
  hole0(u) {
    const cx = 13 * u, r = _plRnd(3); let crumbs = ''; for (let i = 0; i < 8; i++) crumbs += `<ellipse cx="${_plF(-6 * u + (r() - 0.5) * 18 * u)}" cy="${_plF((r() - 0.5) * 3 * u)}" rx="${_plF((0.7 + r() * 0.7) * u)}" ry="${_plF(0.6 * u)}" fill="${r() < 0.5 ? '#7a5634' : '#5a3e24'}"/>`;
    return { back: `<ellipse cx="${_plF(cx)}" cy="0.3" rx="${_plF(8.5 * u)}" ry="${_plF(3 * u)}" fill="#6e4e30"/><ellipse cx="${_plF(cx)}" cy="0.5" rx="${_plF(6.4 * u)}" ry="${_plF(2 * u)}" fill="#2a1a0e"/><path d="M${_plF(cx - 8.5 * u)} 0.3Q${_plF(cx)} ${_plF(-3.6 * u)} ${_plF(cx + 8.5 * u)} 0.3" stroke="#3c2816" stroke-width="${_plF(0.7 * u)}" fill="none"/>`
      + `<path d="M${_plF(-14 * u)} 1Q${_plF(-10 * u)} ${_plF(-6 * u)} ${_plF(-4 * u)} ${_plF(-5.4 * u)}Q${_plF(1 * u)} ${_plF(-4 * u)} ${_plF(3 * u)} 1z" fill="#8a6440"/><path d="M${_plF(-11 * u)} 0Q${_plF(-8 * u)} ${_plF(-4.4 * u)} ${_plF(-4 * u)} ${_plF(-4 * u)}Q${_plF(-1 * u)} ${_plF(-3 * u)} 0 0z" fill="#a47a4e"/>` + crumbs, w: cx + 9 * u, off: 0, lo: -15 * u };
  },
  // a little ring-of-stones fire: stones lit on the fire side, crossed charred logs, a three-colour flame that flickers, smoke that rises, glow on the ground
  fire(u) {
    const cx = 22 * u, r = _plRnd(17); let stones = '';
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, x = cx + Math.cos(a) * 8.6 * u, y = Math.sin(a) * 3.4 * u, sz = (2.2 + r() * 0.8) * u; stones += `<ellipse cx="${_plF(x)}" cy="${_plF(y)}" rx="${_plF(sz)}" ry="${_plF(sz * 0.7)}" fill="${i % 2 ? '#8e8a82' : '#7a766e'}"/><ellipse cx="${_plF(x - sz * 0.15)}" cy="${_plF(y - sz * 0.3)}" rx="${_plF(sz * 0.6)}" ry="${_plF(sz * 0.3)}" fill="${Math.sin(a) < 0 ? '#e8b070' : '#b8b2a6'}" opacity="0.8"/>`; }
    const back = `<ellipse cx="${_plF(cx)}" cy="0.5" rx="${_plF(19 * u)}" ry="${_plF(6.5 * u)}" fill="#ffb24a" opacity="0.16"/><ellipse cx="${_plF(cx)}" cy="0" rx="${_plF(7.4 * u)}" ry="${_plF(2.6 * u)}" fill="#2a1e14"/>` + stones
      + `<path d="M${_plF(cx - 6 * u)} ${_plF(0.6 * u)}L${_plF(cx + 6 * u)} ${_plF(-2.2 * u)}" stroke="#4a2c18" stroke-width="${_plF(2.4 * u)}" stroke-linecap="round"/><path d="M${_plF(cx - 6 * u)} ${_plF(-2.2 * u)}L${_plF(cx + 6 * u)} ${_plF(0.6 * u)}" stroke="#5e3a20" stroke-width="${_plF(2.4 * u)}" stroke-linecap="round"/><circle cx="${_plF(cx - 4 * u)}" cy="${_plF(-0.4 * u)}" r="${_plF(0.9 * u)}" fill="#f06a2a"/><circle cx="${_plF(cx + 3.6 * u)}" cy="${_plF(-0.6 * u)}" r="${_plF(0.8 * u)}" fill="#f8a03a"/>`
      + `<g transform="translate(${_plF(cx)} ${_plF(-1 * u)})"><g class="plq-flame"><path d="M0 0C${_plF(-6 * u)} 0 ${_plF(-6 * u)} ${_plF(-7 * u)} ${_plF(-2 * u)} ${_plF(-12 * u)}C${_plF(-2 * u)} ${_plF(-8 * u)} 0 ${_plF(-8 * u)} ${_plF(0.6 * u)} ${_plF(-15 * u)}C${_plF(2.6 * u)} ${_plF(-9 * u)} ${_plF(6 * u)} ${_plF(-6 * u)} ${_plF(4.6 * u)} ${_plF(-2 * u)}C${_plF(4 * u)} 0 ${_plF(2 * u)} 0 0 0z" fill="#e8562a"/>`
      + `<path d="M0 0C${_plF(-4 * u)} 0 ${_plF(-4 * u)} ${_plF(-5 * u)} ${_plF(-1 * u)} ${_plF(-9 * u)}C0 ${_plF(-6 * u)} ${_plF(1 * u)} ${_plF(-7 * u)} ${_plF(1.6 * u)} ${_plF(-11 * u)}C${_plF(3 * u)} ${_plF(-6 * u)} ${_plF(4 * u)} ${_plF(-3 * u)} ${_plF(3 * u)} ${_plF(-1 * u)}C${_plF(2 * u)} 0 ${_plF(1 * u)} 0 0 0z" fill="#f8a03a"/><path d="M0 0C${_plF(-2 * u)} 0 ${_plF(-2 * u)} ${_plF(-3 * u)} 0 ${_plF(-6 * u)}C${_plF(1 * u)} ${_plF(-3 * u)} ${_plF(2 * u)} ${_plF(-2 * u)} ${_plF(1.4 * u)} ${_plF(-0.6 * u)}z" fill="#ffe27a"/></g></g>`;
    return { back, smoke: [cx, -16 * u, u], w: cx + 10 * u, off: cx, lo: cx - 10 * u };
  },
};
function _plU(P) { const h = typeof _ptwH === 'function' ? _ptwH(P.look.species) : 30; return Math.max(0.8, Math.min(1.5, h / 32)); }
function _plArtAt(kind, u, P) {
  const ph = P && typeof _ptwH === 'function' ? _ptwH(P.look.species) * 0.6 : 18, key = kind + '|' + u.toFixed(2) + '|' + Math.round(ph);
  let a = _PLQ.cache.get(key); if (!a) { a = _PLQ_ART[kind](u, ph); _PLQ.cache.set(key, a); if (_PLQ.cache.size > 60) _PLQ.cache.delete(_PLQ.cache.keys().next().value); }
  return a;
}
/** The thing's reach in cells either side of the pet's feet, drawn on side (+1: towards +x). */
function _plPropReach(P, kind, side) {
  if (!_PLQ_ART[kind]) return [0, 0];
  const art = _plArtAt(kind, _plU(P), P), W = typeof GARDEN_WORLD !== 'undefined' ? GARDEN_WORLD.cellW : 48;
  const lo = (art.lo != null ? art.lo : art.off != null ? Math.min(-8, art.off - (art.w - art.off)) : -art.w) / W, hi = art.w / W;
  return side > 0 ? [lo, hi] : [-hi, -lo];
}
/** True where the vale is painted with laid stone or a worn way, measured on the painter's own geometry in world px (round 3, the critic: the
 *  layout's route widths in cells are two to three times what is painted, so open grass beside a trail read as stone and no thing was ever drawn).
 *  Every route at its painted width (GardenPaintGround.layoutPaths + centreLine, the same lines the ground painter strokes) plus its soft edge,
 *  the region plazas' paved capsules, drawn yard outlines, the green's compass stone and the arrival setts. */
let _plStoneD = null;
function _plStoneGeo() {
  if (_plStoneD) return _plStoneD;
  const D = GardenIslandLayout.data, W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, cpt = (x, y) => ({ x: x * cw, y: W.sky + y * ch });
  const segs = [], caps = [], polys = [], rects = [], G = window.GardenPaintGround;
  if (G && G.layoutPaths && G.centreLine) {
    const laid = G.layoutPaths(W, D);
    for (const r of laid.routes) { const L = G.centreLine(r.points, r.width || 26, r.closed); const soft = r.kind === 'earth' || r.kind === 'gravel' ? 1 : 0; for (let i = 1; i < L.length; i += 1) segs.push([L[i - 1].x, L[i - 1].y, L[i].x, L[i].y, (L[i - 1].w + L[i].w) / 4 + 9, soft]); }
    for (const a of laid.areas || []) if (a.points && a.points.length > 2) polys.push(a.points);
  }
  const STY = { 'cider-square': 1, 'mill-yard': 1, 'ruin-court': 1, 'lakeside-terrace': 1, 'great-oak-clearing': 1 };
  const rts = new Map((D.routes || []).map(r => [r.id, r]));
  for (const pz of (D.presentation && D.presentation.plazas) || []) {
    const rt = rts.get(pz.route); if (!STY[pz.id] || !rt || !rt.points || rt.points.length < 2) continue;
    const a = cpt(rt.points[0][0], rt.points[0][1]), b = cpt(rt.points[rt.points.length - 1][0], rt.points[rt.points.length - 1][1]), w = rt.widthCells || 4;
    caps.push([a.x, a.y, b.x, b.y, w / 2 * cw * 0.95 + 8 + 14, w / 2 * ch * 1.05 + 4 + 10]);
  }
  const green = ((D.presentation && D.presentation.plazas) || []).find(p => p.id === 'the-green');
  if (green) { const c = cpt(green.x + 0.9, green.y + 3.3); rects.push([c.x - 4 * cw - 12, c.y - 3.3 * ch - 10, c.x + 4 * cw + 12, c.y + 3.3 * ch + 10]); }
  const st = D.anchors && D.anchors.start; if (st) { const c = cpt(st.x + 0.5, st.y + 0.5); rects.push([c.x - 125 - 12, c.y - 65 - 10, c.x + 125 + 12, c.y + 65 + 10]); }
  _plStoneD = { segs, caps, polys, rects };
  return _plStoneD;
}
/** soft: a worn earth trail or a gravel lane does not count (a muddy puddle or a drift of leaves lies on one naturally). */
function _plStoneAt(x, y, soft) {
  try {
    const S = _plStoneGeo(), W = GARDEN_WORLD, px = x * W.cellW, py = W.sky + y * W.cellH;
    for (const [x0, y0, x1, y1] of S.rects) if (px > x0 && px < x1 && py > y0 && py < y1) return true;
    for (const [ax, ay, bx, by, half, sf] of S.segs) {
      if (soft && sf) continue;
      if (px < Math.min(ax, bx) - half || px > Math.max(ax, bx) + half || py < Math.min(ay, by) - half || py > Math.max(ay, by) + half) continue;
      const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l));
      if (Math.hypot(ax + t * dx - px, ay + t * dy - py) < half) return true;
    }
    for (const [ax, ay, bx, by, rx, ry] of S.caps) {
      const dx = (bx - ax) / rx, dy = (by - ay) / ry, qx = (px - ax) / rx, qy = (py - ay) / ry, l = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, (qx * dx + qy * dy) / l));
      if (Math.hypot(t * dx - qx, t * dy - qy) < 1) return true;
    }
    for (const P of S.polys) { let inside = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a.y > py) !== (b.y > py) && px < (b.x - a.x) * (py - a.y) / (b.y - a.y || 1e-9) + a.x) inside = !inside; } if (inside) return true; }
  } catch (e) { return false; }
  return false;
}
/** Where the thing may lie: open soil or grass nobody walks through (no road, lane, plaza, beach or water), clear of anything that blocks
 *  walking, clear of you and of another thing already drawn. */
function _plGroundOk(kind, x, y, side, P) {
  try {
    const [x0, x1] = _plPropReach(P, kind, side), pl = _ptwPlayer();
    for (let k = 0; k <= 4; k++) {
      const gx = x + x0 + (x1 - x0) * k / 4;
      // laid stone or a worn way, measured on what is painted (the edge of the thing too: a little above and below its foot line)
      const soft = kind === 'puddle' || kind === 'leaves';
      if (_plStoneAt(gx, y, soft) || _plStoneAt(gx, y - 0.22, soft) || _plStoneAt(gx, y + 0.18, soft)) return false;
      // water, the shore or something solid in the cell (a beach takes a puddle or a hole, nothing else)
      for (const [ox, oy] of [[0, 0], [0, -0.3], [0, 0.3]]) {
        const cx = Math.floor(gx + ox), cy = Math.floor(y + oy);
        const c = typeof gardenIslandBaseCell === 'function' ? gardenIslandBaseCell(cx, cy) : null;
        if (!c || c.ocean || c.freshwater || c.solid || c.beach && kind !== 'puddle' && kind !== 'hole') return false;
      }
      // clear where it lies, and of anything standing just in front of it whose top would cover it (the campfire was laid against the sundial)
      if (typeof gardenWorldFree === 'function' && (!gardenWorldFree(gx, y, 0.1) || !gardenWorldFree(gx, y + 0.45, 0.2) || !gardenWorldFree(gx, y + 0.9, 0.25) || !gardenWorldFree(gx, y + 1.35, 0.25))) return false;
      if (pl && Math.abs(gx - pl.x) < 0.32 && Math.abs(y - pl.y) < 0.4) return false;
    }
    for (const q of _PLQ.live) if (q.g.isConnected && Math.abs(q.y - y) < 0.5 && x + x1 > q.x0 && x + x0 < q.x1) return false;
    return true;
  } catch (e) { return true; }
}
/** Draw a row's thing beside the pet for ms, on its outer node, on the side away from you; faded in and out, then gone. */
function _plProp(P, kind, ms) {
  if (kind === '_one') return _plPropIn(P, kind, ms);
  if (!_PLQ_ART[kind] || !P || !P.node || !P.lift) return;
  try {
    const u = _plU(P), art = _plArtAt(kind, u, P), native = typeof gardenVisualIsNative === 'function' && gardenVisualIsNative(P.node);
    const pl = _ptwPlayer(), side = P.propSide || (pl ? (P.x >= pl.x ? 1 : -1) : P.dir || 1);
    if (art.off) P.dir = side;   // a thing in front of the nose: it faces the thing
    const total = Math.max(1400, ms + 500), fade = Math.min(0.12, 300 / total), motion = typeof _pcMotionOn !== 'function' || _pcMotionOn();
    const reach = _plPropReach(P, kind, side), rec = { x0: P.x + reach[0], x1: P.x + reach[1], y: P.y, g: null };
    const make = (html, front) => {
      const g = native ? gardenSceneElement('g') : document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'pt-lprop plq-' + kind); if (side < 0) g.setAttribute('transform', 'scale(-1 1)');
      g.innerHTML = html;
      if (front) P.node.appendChild(g); else P.node.insertBefore(g, P.lift);
      const a = gardenVisualAnimate(g, [{ offset: 0, opacity: 0 }, { offset: fade, opacity: 1 }, { offset: 1 - fade, opacity: 1 }, { offset: 1, opacity: 0 }], { duration: total, easing: 'linear', fill: 'both' });
      const gone = () => { g.remove(); _PLQ.live = _PLQ.live.filter(q => q.g !== g); };
      a.onfinish = gone; a.oncancel = gone;
      return g;
    };
    const mk = (tag) => native ? gardenSceneElement(tag) : document.createElementNS('http://www.w3.org/2000/svg', tag);
    // one thing at a time for a pet: a row that stages again draws its thing afresh, so the last one goes (round 4: two campfires)
    for (const q of _PLQ.live.slice()) if (q.g && q.g.parentNode === P.node) { try { q.g.remove(); } catch (x) { /* gone */ } _PLQ.live = _PLQ.live.filter(z => z !== q); }
    const back = make(art.back, false); rec.g = back; _PLQ.live.push(rec);
    const front = art.front ? make(art.front, true) : null;
    P.propUntil = performance.now() + total;
    if (!motion) return;
    const reps = Math.ceil(total / 900);
    // rings on the puddle's water
    for (const [i, [x, y, rx, ry]] of (art.rings || []).entries()) {
      const at = mk('g'); at.setAttribute('transform', `translate(${_plF(x)} ${_plF(y)})`);
      const e = mk('ellipse'); e.setAttribute('cx', '0'); e.setAttribute('cy', '0'); e.setAttribute('rx', _plF(rx)); e.setAttribute('ry', _plF(ry)); e.setAttribute('fill', 'none'); e.setAttribute('stroke', '#eaf6fc'); e.setAttribute('stroke-width', _plF(0.8 * u));
      at.appendChild(e); back.appendChild(at);
      try { gardenVisualAnimate(e, [{ transform: 'scale(0.2)', opacity: 0.95 }, { transform: 'scale(1)', opacity: 0 }], { duration: 1100 + i * 260, delay: i * 420, iterations: reps, easing: 'ease-out' }); } catch (x) { /* still */ }
    }
    if (art.sway) for (const [i, k] of [...(front || back).children].slice(0, 10).entries()) { try { if (!native) { k.style.transformBox = 'fill-box'; k.style.transformOrigin = '50% 100%'; } gardenVisualAnimate(k, [{ transform: 'rotate(0deg)' }, { transform: `rotate(${i % 2 ? 3 : -3}deg)` }, { transform: 'rotate(0deg)' }], { duration: 1300 + i * 170, iterations: Math.ceil(total / 1300), easing: 'ease-in-out' }); } catch (x) { /* still */ } }
    const fl = back.querySelector && back.querySelector('.plq-flame');
    if (fl) { try { gardenVisualAnimate(fl, [{ transform: 'scale(1,1)' }, { transform: 'scale(1.1,0.88)' }, { transform: 'scale(0.92,1.12)' }, { transform: 'scale(1,1)' }], { duration: 420, iterations: Math.ceil(total / 420), easing: 'ease-in-out' }); } catch (x) { /* still */ } }
    // 21: the burst, as separate leaves that fly up out of the pile and tumble down round it (round 3, the critic: the clip's own burst read as
    // thin orange slivers); timed to the clip's leap out (0.62 of l-leafpile), each its own size, colour, spin and arc
    if (art.burst && kind === 'leaves') {
      const [BW, BH, bu, cols] = art.burst, r = _plRnd(Math.floor(performance.now()) & 1023), at0 = Math.max(0, (P.clipLeap || 1600));
      for (let i = 0; i < 16; i++) {
        const sx = (r() * 2 - 1) * BW * 0.5, sy = -BH * (0.6 + r() * 0.4), dx = (r() * 2 - 1) * BW * 1.6, up = (18 + r() * 22) * bu, land = (r() * 3 - 0.5) * bu, rot = (r() < 0.5 ? -1 : 1) * (240 + r() * 420);
        const at = mk('g'); at.setAttribute('transform', `translate(${_plF(sx)} ${_plF(sy)})`);
        const lf = mk('g'); lf.innerHTML = _plLeaf(0, 0, 0, (5.2 + r() * 2.4) * bu, cols[i % cols.length], '#5a2a14'); lf.setAttribute('opacity', '0');
        (front || back).appendChild(at);
        const dur = 1300 + r() * 700, delay = at0 + r() * 160;
        // (two simple moves, never one combined transform: the native renderer stretched a leaf whose path and spin were one keyframe list)
        // (it flutters as it falls: a flip across, never a spin. The native renderer stretched leaves whose spin was animated)
        const mv = mk('g'); at.appendChild(mv); const tilt = mk('g'); tilt.setAttribute('transform', `rotate(${Math.round(r() * 360)})`); mv.appendChild(tilt); tilt.appendChild(lf);
        const o = { duration: dur, delay, easing: 'ease-out', fill: 'both' };
        try { gardenVisualAnimate(mv, [
          { offset: 0, transform: 'translate(0px,0px)' },
          { offset: 0.3, transform: `translate(${_plF(dx * 0.45)}px,${_plF(-up)}px)` },
          { offset: 0.62, transform: `translate(${_plF(dx * 0.8)}px,${_plF(-up * 0.55 - sy * 0.3)}px)` },
          { offset: 0.9, transform: `translate(${_plF(dx)}px,${_plF(-sy + land)}px)` },
          { offset: 1, transform: `translate(${_plF(dx)}px,${_plF(-sy + land)}px)` }], o);
          gardenVisualAnimate(lf, [{ transform: 'scale(1,1)', opacity: 1 }, { transform: 'scale(-1,1)', opacity: 1 }, { transform: 'scale(1,1)', opacity: 1 }], { duration: 380 + Math.round(r() * 200), delay, iterations: 3, easing: 'ease-in-out', fill: 'both' }); } catch (x) { /* still */ }
      }
    }
    if (art.smoke) {
      const [sx, sy, su] = art.smoke;
      for (let i = 0; i < 3; i++) {
        const at = mk('g'); at.setAttribute('transform', `translate(${_plF(sx)} ${_plF(sy)})`);
        const c = mk('circle'); c.setAttribute('cx', '0'); c.setAttribute('cy', '0'); c.setAttribute('r', _plF(2.6 * su)); c.setAttribute('fill', '#c8c2ba'); c.setAttribute('opacity', '0');
        at.appendChild(c); back.appendChild(at);
        try { gardenVisualAnimate(c, [{ transform: 'translate(0px,0px) scale(0.6)', opacity: 0.55 }, { transform: `translate(${_plF((2 + i) * su)}px,${_plF(-14 * su)}px) scale(1.6)`, opacity: 0 }], { duration: 1800, delay: i * 600, iterations: Math.ceil(total / 1800), easing: 'ease-out' }); } catch (x) { /* still */ }
      }
    }
  } catch (e) { /* a thing it can do without */ }
}
/** 85: the treehouse window, drawn in. The painted window (94-garden-paint-terrain-3orchard.js: 12 by 11 world px, its foot 121 px up) gets a
 *  plank sill along its bottom and the cabin's own wall below it, in front of the pet, so only its head and paws show in the window. Sized in
 *  world px (the pet's picture is scaled to its species, so this is scaled back by the same amount). */
function _plSill(P, ms) {
  const k = (typeof _ptwH === 'function' ? _ptwH(P.look.species) : 25) / 100, u = 1 / Math.max(0.05, k);
  const wall = `<g transform="translate(50 90) scale(${u.toFixed(3)}) translate(0 -4)"><path d="M-9 -1.6H9V10H-9z" fill="#9a7a54"/><path d="M-5.5 -1.6V10M0.5 -1.6V10M6.5 -1.6V10" stroke="#6e5438" stroke-width="0.5" opacity="0.7"/>`
    + `<path d="M-7.6 -2.6H7.6V-0.4H-7.6z" fill="#6e5438"/><path d="M-7.6 -2.6H7.6V-1.9H-7.6z" fill="#c4a478"/><path d="M-6 -0.4H6V0.4H-6z" fill="#3e2c1c" opacity="0.35"/></g>`;
  _PLP_ONE.front = wall; _PLP_ONE.back = ''; _PLP_ONE.anim = '';
  _plProp(P, '_one', ms);
}
