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
/** Draw a row's thing at the pet's feet for ms, faded in and out. The pet's picture flips with it, so the thing stays in front of its nose. */
function _plProp(P, kind, ms) {
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
      if (art.anim && typeof _pcMotionOn === 'function' && _pcMotionOn()) {
        const kids = g.querySelectorAll ? [...g.querySelectorAll(art.anim === 'flicker' ? '.plp-flame' : 'g, path')].slice(0, 6) : [];
        for (const [i, k] of kids.entries()) { try { if (!native) { k.style.transformBox = 'fill-box'; k.style.transformOrigin = '50% 100%'; } gardenVisualAnimate(k, art.anim === 'flicker' ? [{ transform: 'scale(1,1)' }, { transform: 'scale(1.08,0.9)' }, { transform: 'scale(0.94,1.1)' }, { transform: 'scale(1,1)' }] : art.anim === 'ripple' ? [{ opacity: 1 }, { opacity: 0.7 }, { opacity: 1 }] : [{ transform: 'rotate(0deg)' }, { transform: `rotate(${i % 2 ? 4 : -4}deg)` }, { transform: 'rotate(0deg)' }], { duration: art.anim === 'flicker' ? 420 + i * 60 : 1400 + i * 170, iterations: Math.ceil(total / 400), easing: 'ease-in-out' }); } catch (e) { /* still */ } }
      }
      return g;
    };
    if (art.back) make(art.back, false);
    if (art.front) make(art.front, true);
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
