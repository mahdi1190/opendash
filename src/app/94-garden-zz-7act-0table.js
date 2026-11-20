/* ============================================================
   THINGS YOU CAN DO WITH THE WORLD (round 3, "player" branch). The owner: "everything should be interactable ... climb ladders, sit
   down on a bench, lie down, do all sorts of things and interact with the entire environment in so many ways."

   THREE TABLES, all data. A new object only adds a row.
   GARDEN_ACTS[id]       what the gardener does: words for the prompt, the way the figure faces (dir), how high it is lifted (lift, px),
                         an `enter` and a `loop` (tracks on the figure's named parts, the same form as the moves wheel, GART_EMOTES:
                         [t, {x y r sx sy s}, ease] per part: root, up, head, armL, armR, legL, legR), how long (ms; hold: until you move),
                         what it holds (prop: SVG in the figure's units, feet at 0,0, about 70 tall), what it does to the world (fx),
                         whether the pet comes (pet), the line it writes in your journal the first time (first), and a sound.
   GARDEN_ACT_BY_PROP    the layout's fixed things (island-v5.json static ids) and what each offers, with where you stand (dx, dy from the
                         foot's middle, cells) and which way you face (deg: 0 east, 90 south, 180 west, -90 north). Moving a thing in the
                         layout moves its action with it: positions are read from the layout row at run time, never written here.
   GARDEN_ACT_BY_DECOR   placed decorations by their effect kind (a bench is effect 'sit'), and trees by their painter (the trunk lists
                         the walker already reads: orchard trees shake, wood trees can be climbed, hidden behind, slept under).
   GARDEN_ACT_SPOTS      things the world does not have yet: a row each, with a suggested cell, for the painters to place (art: false
                         keeps them out of the prompts until they are drawn; nothing invisible can be used).
   ============================================================ */
const _GA_K = (n, f) => Array.from({ length: n }, (_, i) => f(i, n));
/* small held things, in the figure's units (front on: the right hand is near x 10, y -38 hanging; raised to the face, about y -50) */
const GA_PROPS = Object.freeze({
  letter: '<g transform="translate(0 -34)"><path d="M-9 -7h18v13h-18z" fill="#f4ecd8" stroke="#8a7a5a" stroke-width="0.8"/><path d="M-6 -3h12M-6 0h12M-6 3h8" stroke="#9a8a6a" stroke-width="0.7"/></g>',
  scope: '<g transform="translate(6 -55) rotate(-8)"><rect x="0" y="-2.6" width="16" height="5.2" rx="1.6" fill="#7a5a34" stroke="#3a2a14" stroke-width="0.7"/><rect x="13" y="-3.4" width="4" height="6.8" rx="1" fill="#c8a84a"/></g>',
  coin: '<g class="ga-coin" transform="translate(9 -52)"><circle r="2.6" fill="#f0cc50" stroke="#a8862a" stroke-width="0.7"/></g>',
  stone: '<g class="ga-stone" transform="translate(11 -40)"><ellipse rx="2.8" ry="1.7" fill="#9a968c" stroke="#5a564c" stroke-width="0.6"/></g>',
  crumbs: '<g transform="translate(9 -40)"><path d="M-3 0q3 -3 6 0q-3 3 -6 0z" fill="#d8b878" stroke="#9a7a48" stroke-width="0.5"/></g>',
  stick: '<g transform="translate(10 -33) rotate(148)"><path d="M0 0L0 -27" stroke="#7a5432" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="0" cy="-28.5" rx="2.6" ry="2.2" fill="#f6efe0" stroke="#c8a878" stroke-width="0.5"/><ellipse cx="0.8" cy="-27.6" rx="1.2" ry="0.9" fill="#d8a060" opacity="0.7"/></g>',
  oars: '<g><path d="M-26 -30L26 -22" stroke="#8a6438" stroke-width="2" stroke-linecap="round"/><path d="M-30 -31l-6 -1l1 4z M30 -21l6 1l-1 -4z" fill="#a07a48"/></g>',
  // a ladder to a real landing: 14 rungs from 6 up, 9.4 apart (GA_LADDER), a plank landing with a rail at 134 the feet step on to
  ladder: '<g transform="translate(0 2)"><path d="M-21 -134h42v5h-42z" fill="#8a6438" stroke="#4a3218" stroke-width="0.8"/><path d="M-21 -129h42" stroke="#5a3e22" stroke-width="1.4"/><path d="M-19 -129l6 10M19 -129l-6 10" stroke="#6a4a2a" stroke-width="2"/><path d="M-20 -134V-160M20 -134V-160M-20 -158H20M-20 -147H20" stroke="#7a5a36" stroke-width="2" stroke-linecap="round"/><path d="M-9 0L-8 -134M9 0L8 -134" stroke="#7a5a36" stroke-width="2.4" stroke-linecap="round"/>' + _GA_K(14, (i) => `<path d="M${-8.8 + i * 0.06} ${-6 - i * 9.4}H${8.8 - i * 0.06}" stroke="#8a6a40" stroke-width="1.9"/>`).join('') + '<ellipse cx="0" cy="0" rx="13" ry="2.4" fill="#000" opacity="0.14"/></g>',
  // the ducks: three mallards that swim in from further out and dabble where the crumbs land (94-garden-zz-7act-1core.js moves them)
  ducks: [[-30, -88, 1], [6, -108, -1], [34, -84, -1]].map(([x, y, f], i) => `<g class="ga-duck ga-duck-${i}" transform="translate(${x} ${y})"><g transform="scale(${f} 1)"><ellipse cx="0" cy="3" rx="11" ry="2.4" fill="#0a2a46" opacity="0.22"/><path class="ga-duck-b" d="M-9 0Q-10 -7 -2 -7L5 -6Q10 -5 9 0Q0 3 -9 0z" fill="${i === 1 ? '#a07a52' : '#9a8a72'}" stroke="#4a3a2a" stroke-width="0.7"/><path d="M-6 -4Q-1 -6 4 -4" stroke="#e8e0d0" stroke-width="0.9" fill="none" opacity="0.7"/><g class="ga-duck-h" style="transform-origin:6px -5px"><path d="M5 -6Q5 -13 9 -13Q12 -13 12 -9L11 -6z" fill="${i === 1 ? '#8a6a4a' : '#2f6a3a'}" stroke="#1f3a22" stroke-width="0.6"/><path d="M11.5 -10l4 1l-4 1z" fill="#e0a830"/><circle cx="9.6" cy="-10.4" r="0.7" fill="#111"/>${i === 1 ? '' : '<path d="M5.4 -7h5" stroke="#f4f2e8" stroke-width="0.9"/>'}</g></g><ellipse class="ga-duck-r" cx="0" cy="2" rx="13" ry="3" fill="none" stroke="#ffffff" stroke-width="0.8" opacity="0.5"/></g>`).join('') + [[-10, -72, 20], [8, -80, -30], [18, -66, 150]].map(([x, y, r], i) => `<g class="ga-fish ga-fish-${i}" opacity="0" transform="translate(${x} ${y}) rotate(${r})"><path d="M-8 0Q-2 -3.4 5 0Q-2 3.4 -8 0zM5 0l4 -2.6v5.2z" fill="#1a3a4a" opacity="0.55"/></g>`).join(''),
  // a branch from the trunk under the hips (perched: the figure sits on it), bark and a tuft of leaves at its end
  branch: '<g><path d="M-5 -30Q14 -29 34 -25Q50 -22 60 -21Q61 -19.4 59 -19Q44 -19 30 -20Q12 -21 -5 -21z" fill="#6a4a2e" stroke="#3a2818" stroke-width="0.8"/><path d="M-3 -28Q18 -27 40 -23" stroke="#9a7a52" stroke-width="1.1" fill="none" opacity="0.75"/><path d="M-5 -30q-2 4 0 9" stroke="#3a2818" stroke-width="1.2" fill="none" opacity="0.6"/><path d="M38 -23q6 -9 12 -14M48 -21q5 -4 8 -10" stroke="#5a3e24" stroke-width="1.5" fill="none"/><g fill="#5a8a3a" stroke="#2f5a22" stroke-width="0.5"><ellipse cx="52" cy="-38" rx="8" ry="5"/><ellipse cx="60" cy="-33" rx="7" ry="4.6"/><ellipse cx="57" cy="-41" rx="6" ry="4"/><ellipse cx="64" cy="-24" rx="5" ry="3.4"/></g><g fill="#8ab84a"><ellipse cx="50" cy="-40" rx="3.6" ry="2"/><ellipse cx="59" cy="-35" rx="3" ry="1.8"/></g></g>',   // (round 3) a bough out of the trunk's side; you sit along it, astride, a hand either side
  // the fire's light on you (warming your hands)
  glow: '<g class="ga-glow"><ellipse cx="0" cy="2" rx="22" ry="7" fill="#ffb050" opacity="0.16"/><ellipse cx="0" cy="-16" rx="13" ry="16" fill="#ffb860" opacity="0.06"/></g>',
  zzz: '<g transform="translate(16 -62) rotate(90)"><g class="ga-zzz"><text x="0" y="0" font-size="8" font-weight="700" fill="#f4f0ff" stroke="#5a5a8a" stroke-width="0.4">z</text><text x="6" y="-7" font-size="10" font-weight="700" fill="#f4f0ff" stroke="#5a5a8a" stroke-width="0.4">z</text></g></g>',
  blanket: '<g><path d="M-46 2Q-44 -5 -20 -6L22 -5Q40 -4 42 3Q20 7 -2 7Q-30 7 -46 2z" fill="#c8584a" stroke="#7a3028" stroke-width="0.7"/><path d="M-36 -2L32 -1M-38 3L36 3" stroke="#f0d8b8" stroke-width="1" opacity="0.7"/></g>',
  drips: '<g class="ga-drips">' + _GA_K(6, (i) => `<path d="M${-8 + i * 3.2} ${-30 + (i % 3) * 9}q1 2 0 3q-1 -1 0 -3z" fill="#9ad4ee"/>`).join('') + '</g>',
  // the bell rope, hanging from the bell above to the hands (stays put while the arms pull)
  rope: '<g><path d="M0 -150Q1.4 -110 0 -66" stroke="#b08a58" stroke-width="2.2" fill="none"/><path d="M-2 -70h4l-.6 9h-2.8z" fill="#c84a3a" stroke="#7a2a20" stroke-width="0.5"/></g>',
  // the water round a swimmer: the surface at the chest, a ripple ring, the body below it seen through the water
  swimwater: '<g class="ga-swim"><ellipse cx="0" cy="-25" rx="19" ry="6.4" fill="#4f98ae" opacity="0.7"/><ellipse cx="0" cy="-26" rx="17" ry="4.4" fill="#8ccbdc" opacity="0.55"/><ellipse class="ga-swim-r" cx="0" cy="-26" rx="22" ry="5.6" fill="none" stroke="#ffffff" stroke-width="1.1" opacity="0.75"/><path d="M-26 -22q5 2 10 0M14 -21q5 2 10 0" stroke="#e8f6fa" stroke-width="0.9" fill="none" opacity="0.7"/></g>',
  fiddle: '<g transform="translate(-4 -49) rotate(-30) scale(0.55)"><path d="M-3 -2Q-6 -2 -6 2Q-6 5 -3 5Q-4 8 -1 9L9 9Q12 8 11 5Q14 5 14 2Q14 -2 11 -2Q12 -5 9 -6L-1 -6Q-4 -5 -3 -2z" fill="#a8582a" stroke="#4a2210" stroke-width="0.7"/><path d="M14 1.6L27 1.6" stroke="#2a1a10" stroke-width="2.2"/><path d="M1 -2v7M7 -2v7" stroke="#2a1a10" stroke-width="0.6"/></g><g class="ga-bow"><path d="M4 -40L20 -52" stroke="#7a5a36" stroke-width="0.9"/></g>',
  // the rod held out over the water in front (you face it), the line down to a float out on the water
  bankrod: '<g><path d="M10 -30L30 -66" stroke="#7a5a34" stroke-width="1.8" stroke-linecap="round"/><path d="M30 -66Q36 -70 38 -96" stroke="#e8e8e0" stroke-width="0.6" fill="none" opacity="0.85"/><circle cx="38" cy="-97" r="2.2" fill="#d84a3a" stroke="#fff" stroke-width="0.6"/><ellipse class="ga-bob-r" cx="38" cy="-96" rx="7" ry="2.2" fill="none" stroke="#fff" stroke-width="0.7" opacity="0.6"/></g>',
  peek: '',
});
/* Parts: front on, root (feet at 0,0) / up (from the hips) / head / armL armR (hang from the shoulders: + turns the left arm out, - the right) / legL legR. */
/* SEATED, with knees (round 2). Front on, the figure's legs are 28 units from hip to sole: a thigh of 12.7 down to the knee and a shin of 15.3.
   Sitting, the thigh comes forward at you (drawn at 0.6 of its length) and the shin hangs straight: the hips are then 23 units above the soles,
   and the root drops 5.1 so the soles stay on the ground. A seat higher than that lifts the whole figure (the spot's `seat`, as a share of the
   figure's height, read by the core: lift = GW_SCALE * (70 * seat - 23)), so the hips are on the seat and the feet hang just clear. */
const _GA_TH = 0.55, _GA_SH = 1 / _GA_TH, GA_SEAT_HIP = _GA_TH * 12.7 + 15.3;   // (round 3: the thighs a little longer, so the knees come forward over the feet and the lap reads)
const _GA_SITP = { root: { y: 28 - GA_SEAT_HIP }, up: { y: 0.4 }, legL: { sy: _GA_TH, r: 13 }, legR: { sy: _GA_TH, r: -13 }, kneeL: { sy: _GA_SH, r: -21 }, kneeR: { sy: _GA_SH, r: 21 }, armL: { r: 6, sy: 0.86 }, armR: { r: -6, sy: 0.86 } };   // (knees apart, feet in: the bend at the knee shows; hands on the lap)
const _gaHoldPose = (P, at, e) => Object.fromEntries(Object.entries(P).map(([k, v]) => [k, [[at, v, e || 'o'], [1, v]]]));
const _GA_SIT = _gaHoldPose(_GA_SITP, 0.55);
/* the sitting loop: the shins swing in turn (foreshortened as they come forward), a look round now and then */
const _GA_SITLOOP = (ms) => Object.assign({ ms }, _gaHoldPose(_GA_SITP, 0, 'l'), {
  kneeL: [[0, { sy: _GA_SH, r: -21 }], [0.12, { sy: _GA_SH * 0.72, r: -26 }, 'io'], [0.24, { sy: _GA_SH, r: -21 }, 'io'], [0.36, { sy: _GA_SH * 0.76, r: -25 }, 'io'], [0.48, { sy: _GA_SH, r: -21 }, 'io'], [1, { sy: _GA_SH, r: -21 }]],
  kneeR: [[0, { sy: _GA_SH, r: 21 }], [0.5, { sy: _GA_SH, r: 21 }], [0.62, { sy: _GA_SH * 0.72, r: 26 }, 'io'], [0.74, { sy: _GA_SH, r: 21 }, 'io'], [0.86, { sy: _GA_SH * 0.76, r: 25 }, 'io'], [1, { sy: _GA_SH, r: 21 }, 'io']],
  head: [[0, {}], [0.3, {}], [0.4, { r: 8 }, 'io'], [0.58, { r: 8 }], [0.68, { r: -4 }, 'io'], [0.8, {}, 'io'], [1, {}]] });
/* the ladder: 14 rungs 9.4 apart from 6 up, the landing at 134 (the world draws both: 94-garden-zz-7act-2world.js) */
const GA_LADDER = Object.freeze({ rungs: 14, first: 6, gap: 9.4, top: 134 });
const _gaLadder = (top) => {   // top: the landing's height in the figure's units (the rungs keep their spacing; round 3: one per ladder's height)
  const T = top || GA_LADDER.top, N = Math.max(4, Math.round((T - GA_LADDER.first) / GA_LADDER.gap) + 1), up0 = 0.04, up1 = 0.44, dn0 = 0.62, dn1 = 0.97, root = [[0, {}]], legL = [[0, {}]], legR = [[0, {}]], kneeL = [[0, {}]], kneeR = [[0, {}]], armL = [[0, {}]], armR = [[0, {}]];
  const step = (t, k, last) => {   // feet on rung k (0: the ground), the leg that steps next bent up to the rung above, the opposite hand up a rung
    const y = k >= N ? -T : k <= 0 ? 0 : -(GA_LADDER.first + (k - 1) * GA_LADDER.gap), odd = k % 2;
    root.push([t, { y }, 'io']);
    const bent = { sy: 0.62 }, kb = { sy: 1.15 }, flat = {};
    legL.push([t, last ? flat : odd ? bent : flat, 'io']); kneeL.push([t, last ? flat : odd ? kb : flat, 'io']);
    legR.push([t, last ? flat : odd ? flat : bent, 'io']); kneeR.push([t, last ? flat : odd ? flat : kb, 'io']);
    armL.push([t, last ? { r: 22 } : { r: odd ? 166 : 150, sy: odd ? 1 : 0.86 }, 'io']); armR.push([t, last ? { r: -22 } : { r: odd ? -150 : -166, sy: odd ? 0.86 : 1 }, 'io']);
  };
  for (let k = 1; k <= N; k++) step(up0 + (up1 - up0) * k / N, k, k === N);
  step(dn0, N, true);
  for (let k = N - 1; k >= 0; k--) step(dn0 + (dn1 - dn0) * (N - k) / N, k, k === 0);
  root.push([1, {}]); for (const a of [legL, legR, kneeL, kneeR, armL, armR]) a.push([1, {}]);
  return { root, legL, legR, kneeL, kneeR, armL, armR, head: [[0.47, {}], [0.5, { r: -9 }, 'io'], [0.54, { r: -9 }], [0.57, { r: 9 }, 'io'], [0.6, {}, 'io']] };
};
const GARDEN_ACTS = Object.freeze({
  sit: { verb: 'Sit down', dir: 's', ms: 600, hold: true, pet: 'sit', sound: 'pat', first: 'Sat a while and watched the vale go by.',
    enter: _GA_SIT, loop: _GA_SITLOOP(4200) },
  dangle: { verb: 'Sit on the end and dangle your feet', dir: 's', ms: 700, hold: true, pet: 'sit', first: 'Sat at the end of the pier, feet over the water.',
    // the hips on the deck's edge (the root drops the whole leg: the hips where the soles were), thighs on the boards, shins down over the water
    enter: _gaHoldPose(Object.assign({}, _GA_SITP, { root: { y: 27 }, armL: { r: 26, sy: 0.8 }, armR: { r: -26, sy: 0.8 } }), 0.6),
    loop: Object.assign(_GA_SITLOOP(2400), { root: [[0, { y: 27 }], [1, { y: 27 }]], armL: [[0, { r: 26, sy: 0.8 }], [1, { r: 26, sy: 0.8 }]], armR: [[0, { r: -26, sy: 0.8 }], [1, { r: -26, sy: 0.8 }]] }), fx: { every: 1200, kind: 'water', dy: 0.9, width: 30 } },
  lie: { verb: 'Lie down and watch the clouds', dir: 's', ms: 900, hold: true, lying: true, clouds: true, pet: 'sleep', first: 'Lay in the grass and watched the clouds go over.', blanket: false,
    enter: { root: [[0.35, { y: 6, sy: 0.9 }, 'io'], [0.8, { r: -90, x: 34, y: -8 }, 'o'], [1, { r: -90, x: 34, y: -8 }]], armL: [[0.8, { r: 150 }, 'o'], [1, { r: 150 }]], armR: [[0.8, { r: -150 }, 'o'], [1, { r: -150 }]], legL: [[0.8, { r: 4 }], [1, { r: 4 }]], legR: [[0.8, { r: 10 }], [1, { r: 10 }]] },
    loop: { ms: 5000, root: [[0, { r: -90, x: 34, y: -8 }], [0.5, { r: -90, x: 34, y: -8.6, sx: 1.01 }, 'io'], [1, { r: -90, x: 34, y: -8 }, 'io']], armL: [[0, { r: 150 }], [1, { r: 150 }]], armR: [[0, { r: -150 }], [1, { r: -150 }]], legR: [[0, { r: 10 }], [0.5, { r: 18 }, 'io'], [1, { r: 10 }, 'io']], legL: [[0, { r: 4 }], [1, { r: 4 }]] } },
  nap: { verb: 'Have a nap', dir: 's', ms: 1100, hold: true, lying: true, clouds: true, pet: 'sleep', first: 'Had a nap in the open air. Woke up with grass in my hair.', prop: 'zzz', nap: 6000,
    enter: { root: [[0.4, { y: 10 }, 'io'], [0.85, { r: -90, x: 34, y: -8 }, 'o'], [1, { r: -90, x: 34, y: -8 }]], armL: [[0.85, { r: 20 }], [1, { r: 20 }]], armR: [[0.85, { r: -170 }], [1, { r: -170 }]], head: [[0.85, { r: -10 }], [1, { r: -10 }]] },
    loop: { ms: 3600, root: [[0, { r: -90, x: 34, y: -8 }], [0.5, { r: -90, x: 34, y: -9, sx: 1.02 }, 'io'], [1, { r: -90, x: 34, y: -8 }, 'io']], armL: [[0, { r: 20 }], [1, { r: 20 }]], armR: [[0, { r: -170 }], [1, { r: -170 }]], head: [[0, { r: -10 }], [1, { r: -10 }]] } },
  ladder: { verb: 'Climb the ladder', dir: 'n', ms: 9000, prop: 'ladder', propBehind: true, propGround: true, first: 'Climbed up for a look over the rooftops.', sound: 'step', enter: _gaLadder() },
  // (round 3) the same climb up the treehouse's own painted ladder to its platform (192), and up the barn's side to the hay-loft door (96)
  ladderhi: { verb: 'Climb up to the treehouse', dir: 'n', ms: 11500, first: 'Climbed up into the treehouse.', sound: 'step', enter: _gaLadder(192) },
  ladderlo: { verb: 'Climb up to the hay loft', dir: 'n', ms: 7000, first: 'Climbed the ladder to the hay loft. It smells of summer.', sound: 'step', enter: _gaLadder(96) },
  shake: { verb: 'Shake the tree', dir: 'n', ms: 1700, first: 'Shook a fruit tree. Something fell out.', sound: 'rustle', shake: true,
    enter: { up: _GA_K(8, (i) => [0.1 + i * 0.1, { r: i % 2 ? 4 : -4, x: i % 2 ? 1 : -1 }, 'io']).concat([[1, {}]]), armL: [[0.1, { r: 120 }, 'o'], [0.9, { r: 120 }], [1, {}]], armR: [[0.1, { r: -120 }, 'o'], [0.9, { r: -120 }], [1, {}]], root: _GA_K(8, (i) => [0.1 + i * 0.1, { x: i % 2 ? 1.4 : -1.4 }, 'l']).concat([[1, {}]]) } },
  bell: { verb: 'Ring the bell', dir: 'n', ms: 2200, prop: 'rope', propBehind: true, propGround: true, first: 'Rang the bell. Half the vale looked up.', sound: 'bell', use: 'bell',
    enter: { armL: [[0.1, { r: 168 }, 'o'], [0.3, { r: 130 }, 'i'], [0.45, { r: 168 }, 'o'], [0.65, { r: 130 }, 'i'], [0.8, { r: 168 }, 'o'], [1, {}]], armR: [[0.1, { r: -168 }, 'o'], [0.3, { r: -130 }, 'i'], [0.45, { r: -168 }, 'o'], [0.65, { r: -130 }, 'i'], [0.8, { r: -168 }, 'o'], [1, {}]], root: [[0.3, { y: 3, sy: 0.94 }, 'i'], [0.45, { y: -2 }, 'o'], [0.65, { y: 3, sy: 0.94 }, 'i'], [0.8, { y: -2 }, 'o'], [1, {}]] } },
  pump: { verb: 'Work the pump and drink', dir: 'n', ms: 3000, first: 'Pumped cold water and drank it from my hands.', sound: 'splash', fx: { at: [0.3, 0.45, 0.6], kind: 'water', dy: -0.3, width: 18 },
    enter: { armR: [[0.08, { r: -165 }, 'o'], [0.2, { r: -105 }, 'io'], [0.32, { r: -165 }, 'io'], [0.44, { r: -105 }, 'io'], [0.56, { r: -165 }, 'io'], [0.66, { r: -30 }, 'io'], [1, {}]], up: [[0.2, { r: 6, y: 1 }, 'io'], [0.32, {}, 'io'], [0.44, { r: 6, y: 1 }, 'io'], [0.56, {}, 'io'], [0.7, { r: 14, y: 3 }, 'io'], [0.9, { r: 14, y: 3 }], [1, {}]], armL: [[0.66, {}], [0.72, { r: 70 }, 'o'], [0.9, { r: 70 }], [1, {}]], head: [[0.7, { y: 3 }, 'io'], [0.9, { y: 3 }], [1, {}]] } },
  wish: { verb: 'Throw a coin and make a wish', dir: 'n', ms: 2600, prop: 'coin', first: 'Threw a coin in the wishing well. It glowed.', sound: 'coin', use: 'wish', fx: { at: [0.55, 0.62, 0.7], kind: 'gold', dy: -1.25, width: 26 },
    enter: { armR: [[0.15, { r: -150 }, 'o'], [0.35, { r: -150 }], [0.45, { r: -40 }, 'b'], [0.7, { r: -20 }], [1, {}]], up: [[0.35, { r: -4 }], [0.45, { r: 6 }, 'o'], [0.7, {}], [1, {}]], head: [[0.45, { y: 2 }], [0.8, { y: 2 }], [1, {}]], armL: [[0.75, {}], [0.85, { r: 30 }, 'io'], [1, {}]] } },
  warm: { verb: 'Warm your hands', dir: 's', ms: 700, hold: true, pet: 'sit', first: 'Warmed my hands at the fire and toasted a marshmallow.', prop: 'stick', glow: true,
    // facing you over the fire (the fire is between you and the camera): hands out to it, a marshmallow on a stick now and then
    enter: { armL: [[0.6, { r: 34, sy: 0.8 }, 'o'], [1, { r: 34, sy: 0.8 }]], armR: [[0.6, { r: -30, sy: 0.82 }, 'o'], [1, { r: -30, sy: 0.82 }]], up: [[0.6, { y: 1.5, sy: 0.97, r: 2 }], [1, { y: 1.5, sy: 0.97, r: 2 }]] },
    loop: { ms: 1800, armL: [[0, { r: 34, sy: 0.8 }], [0.5, { r: 40, sy: 0.8 }, 'io'], [1, { r: 34, sy: 0.8 }, 'io']], armR: [[0, { r: -30, sy: 0.82 }], [1, { r: -30, sy: 0.82 }]], up: [[0, { y: 1.5, sy: 0.97, r: 2 }], [1, { y: 1.5, sy: 0.97, r: 2 }]], head: [[0, {}], [0.5, { r: 4 }, 'io'], [1, {}, 'io']] } },
  lean: { verb: 'Lean on the wall and look out', dir: 'n', ms: 700, hold: true, pet: 'sit', first: 'Leaned on the wall and looked out over the vale.',
    enter: { up: [[0.6, { r: 0, y: 4, sy: 0.92 }, 'o'], [1, { y: 4, sy: 0.92 }]], armL: [[0.6, { r: 38, sy: 0.7 }, 'o'], [1, { r: 38, sy: 0.7 }]], armR: [[0.6, { r: -38, sy: 0.7 }, 'o'], [1, { r: -38, sy: 0.7 }]], legL: [[0.6, { r: -6 }], [1, { r: -6 }]] },
    loop: { ms: 6000, up: [[0, { y: 4, sy: 0.92 }], [1, { y: 4, sy: 0.92 }]], armL: [[0, { r: 38, sy: 0.7 }], [1, { r: 38, sy: 0.7 }]], armR: [[0, { r: -38, sy: 0.7 }], [1, { r: -38, sy: 0.7 }]], head: [[0, {}], [0.3, { r: 8 }, 'io'], [0.55, { r: 8 }], [0.7, { r: -6 }, 'io'], [0.9, {}, 'io'], [1, {}]], legL: [[0, { r: -6 }], [1, { r: -6 }]] } },
  read: { verb: 'Read it', dir: 's', ms: 600, hold: true, prop: 'letter', first: 'Read the notices. Someone has lost a hen.',
    enter: { armL: [[0.6, { r: -24, sy: 0.82 }, 'o'], [1, { r: -24, sy: 0.82 }]], armR: [[0.6, { r: 24, sy: 0.82 }, 'o'], [1, { r: 24, sy: 0.82 }]], head: [[0.6, { y: 1.5 }], [1, { y: 1.5 }]] },
    loop: { ms: 3000, head: [[0, { y: 1.5, r: -4 }], [0.5, { y: 1.5, r: 4 }, 'io'], [1, { y: 1.5, r: -4 }, 'io']], armL: [[0, { r: -24, sy: 0.82 }], [1, { r: -24, sy: 0.82 }]], armR: [[0, { r: 24, sy: 0.82 }], [1, { r: 24, sy: 0.82 }]] } },
  look: { verb: 'Look through the telescope', dir: 'n', ms: 700, hold: true, first: 'Looked through the telescope at the far hills.',
    // the eye to the eyepiece (the world draws the brass telescope on its stand just in front: 94-garden-zz-7act-2world.js), a hand on the tube, one on the stand
    enter: { up: [[0.6, { y: 2.5, r: 3 }, 'o'], [1, { y: 2.5, r: 3 }]], head: [[0.6, { y: 1.5 }, 'o'], [1, { y: 1.5 }]], armR: [[0.6, { r: -128, sy: 0.82 }, 'o'], [1, { r: -128, sy: 0.82 }]], armL: [[0.6, { r: 60, sy: 0.9 }, 'o'], [1, { r: 60, sy: 0.9 }]] },
    loop: { ms: 6000, up: [[0, { y: 2.5, r: 3 }], [0.5, { y: 2.5, r: 5 }, 'io'], [1, { y: 2.5, r: 3 }, 'io']], head: [[0, { y: 1.5 }], [1, { y: 1.5 }]], armR: [[0, { r: -128, sy: 0.82 }], [0.5, { r: -122, sy: 0.82 }, 'io'], [1, { r: -128, sy: 0.82 }, 'io']], armL: [[0, { r: 60, sy: 0.9 }], [1, { r: 60, sy: 0.9 }]] } },
  feed: { verb: 'Feed the ducks', dir: 'n', ms: 5200, prop: 'ducks', propBehind: true, propGround: true, first: 'Fed the ducks. They came from all over.', sound: 'pat', fx: { at: [0.13, 0.31, 0.49], kind: 'feed', dy: -1.6, width: 30 }, gather: true,
    // a pinch from the bag, thrown underarm in an arc, three times; the ducks swim in and dabble (the prop's own motion)
    enter: { armR: [[0.04, { r: -40 }, 'o'], [0.1, { r: 20 }, 'io'], [0.13, { r: -150 }, 'b'], [0.2, { r: -40 }, 'io'], [0.27, { r: 20 }, 'io'], [0.31, { r: -150 }, 'b'], [0.38, { r: -40 }, 'io'], [0.45, { r: 20 }, 'io'], [0.49, { r: -150 }, 'b'], [0.6, { r: -20 }, 'io'], [1, {}]],
      armL: [[0.05, { r: 20, sy: 0.8 }, 'o'], [0.6, { r: 20, sy: 0.8 }], [0.7, {}, 'io'], [1, {}]], up: [[0.13, { r: 5 }], [0.2, {}], [0.31, { r: 5 }], [0.38, {}], [0.49, { r: 5 }], [0.6, {}], [1, {}]], head: [[0.55, {}], [0.65, { y: 2 }, 'io'], [0.95, { y: 2 }], [1, {}]] } },
  skim: { verb: 'Skim a stone', dir: 'n', ms: 3800, prop: 'stone', propGround: true, propBehind: true, first: 'Skimmed a stone across still water.', skim: true,
    enter: { root: [[0.2, { y: 3, sy: 0.94 }, 'io'], [0.36, { x: 3 }, 'o'], [1, {}]], up: [[0.2, { r: -10 }, 'io'], [0.36, { r: 12 }, 'o'], [0.6, { r: 4 }], [1, {}]], armR: [[0.2, { r: 60 }, 'io'], [0.36, { r: -100 }, 'b'], [0.6, { r: -60 }], [1, {}]], head: [[0.4, { r: 4 }], [0.9, { r: -4 }, 'io'], [1, {}]] } },
  shower: { verb: 'Stand under the falls', dir: 's', ms: 3600, first: 'Stood under Fleet Falls and came out dripping.', sound: 'splash', fx: { every: 220, kind: 'water', dy: -1.9, width: 34 }, after: 'drips',
    enter: { up: [[0.1, { sy: 0.94, y: 2 }, 'o'], [0.85, { sy: 0.94, y: 2 }], [1, {}]], armL: [[0.15, { r: 150 }, 'o'], [0.8, { r: 150 }], [0.9, { r: 30 }, 'io'], [1, {}]], armR: [[0.15, { r: -150 }, 'o'], [0.8, { r: -150 }], [0.9, { r: -30 }, 'io'], [1, {}]], head: _GA_K(8, (i) => [0.15 + i * 0.09, { r: i % 2 ? 5 : -5 }, 'io']).concat([[1, {}]]) } },
  hide: { verb: 'Hide behind the tree', dir: 'n', ms: 600, hold: true, first: 'Hid behind a tree. Nobody found me.', hideBehind: true,
    enter: { root: [[0.6, { y: 6, sy: 0.84 }, 'o'], [1, { y: 6, sy: 0.84 }]], armL: [[0.6, { r: 40 }], [1, { r: 40 }]], armR: [[0.6, { r: -40 }], [1, { r: -40 }]] },
    loop: { ms: 4000, root: [[0, { y: 6, sy: 0.84 }], [0.35, { y: 6, sy: 0.84 }], [0.45, { y: 6, sy: 0.84, x: 9 }, 'io'], [0.6, { y: 6, sy: 0.84, x: 9 }], [0.7, { y: 6, sy: 0.84 }, 'io'], [1, { y: 6, sy: 0.84 }]], head: [[0.45, {}], [0.5, { r: 10 }, 'io'], [0.6, { r: 10 }], [0.66, {}, 'io']], armL: [[0, { r: 40 }], [1, { r: 40 }]], armR: [[0, { r: -40 }], [1, { r: -40 }]] } },
  climbtree: { verb: 'Climb up and sit on a branch', dir: 'n', ms: 2600, first: 'Climbed a tree and sat on a branch, legs dangling.', then: 'perch',
    // hand over hand up the trunk (the hips end at the branch, 1.25 of the figure's height up), then turn and sit (perch)
    enter: { root: _GA_K(7, (i) => [0.08 + i * 0.13, { y: -(i + 1) * 8.4 }, 'io']).concat([[1, { y: -59.5 }]]), armL: _GA_K(7, (i) => [0.08 + i * 0.13, { r: i % 2 ? 150 : 172 }, 'io']).concat([[1, { r: 160 }]]), armR: _GA_K(7, (i) => [0.08 + i * 0.13, { r: i % 2 ? -172 : -150 }, 'io']).concat([[1, { r: -160 }]]),
      legL: _GA_K(7, (i) => [0.08 + i * 0.13, { sy: i % 2 ? 0.62 : 1 }, 'io']).concat([[1, {}]]), legR: _GA_K(7, (i) => [0.08 + i * 0.13, { sy: i % 2 ? 1 : 0.62 }, 'io']).concat([[1, {}]]),
      kneeL: _GA_K(7, (i) => [0.08 + i * 0.13, { sy: i % 2 ? 1.15 : 1 }, 'io']).concat([[1, {}]]), kneeR: _GA_K(7, (i) => [0.08 + i * 0.13, { sy: i % 2 ? 1 : 1.15 }, 'io']).concat([[1, {}]]) } },
  perch: { verb: 'Sit on the branch', dir: 's', ms: 400, hold: true, prop: 'branch', propBehind: true, propGround: true, first: '', seat: 1.25,
    // out along the bough from the trunk (the figure sits 16 to the right of it), hands down on the wood either side, the shins swinging
    enter: _gaHoldPose(Object.assign({}, _GA_SITP, { root: { x: 16, y: 28 - GA_SEAT_HIP }, armL: { r: 18, sy: 0.84 }, armR: { r: -18, sy: 0.84 } }), 0.5),
    loop: Object.assign(_GA_SITLOOP(2600), { root: [[0, { x: 16, y: 28 - GA_SEAT_HIP }], [1, { x: 16, y: 28 - GA_SEAT_HIP }]], armL: [[0, { r: 18, sy: 0.84 }], [1, { r: 18, sy: 0.84 }]], armR: [[0, { r: -18, sy: 0.84 }], [1, { r: -18, sy: 0.84 }]] }) },
  row: { verb: 'Take the oars', dir: 's', ms: 700, hold: true, prop: 'oars', first: 'Took the boat out on the water.', sound: 'splash', fx: { every: 1300, kind: 'water', dy: 0.2, width: 40 },
    enter: _GA_SIT,
    loop: { ms: 1300, root: [[0, { y: 14 }], [1, { y: 14 }]], legL: [[0, { sy: 0.52 }], [1, { sy: 0.52 }]], legR: [[0, { sy: 0.52 }], [1, { sy: 0.52 }]], up: [[0, { r: 0, y: 0 }], [0.45, { y: -3, sy: 1.02 }, 'io'], [1, { y: 0 }, 'io']], armL: [[0, { r: 70 }], [0.45, { r: 30 }, 'io'], [1, { r: 70 }, 'io']], armR: [[0, { r: -70 }], [0.45, { r: -30 }, 'io'], [1, { r: -70 }, 'io']] } },
  photo: { verb: 'Strike a pose for a photo', dir: 's', ms: 2600, first: 'Posed for a photo by the harbour.', sound: 'shutter', use: 'photo',
    enter: { armR: [[0.2, { r: -150 }, 'b'], [0.85, { r: -150 }], [1, {}]], armL: [[0.2, { r: 40 }, 'o'], [0.85, { r: 40 }], [1, {}]], root: [[0.2, { r: -4, y: 1 }, 'o'], [0.85, { r: -4, y: 1 }], [1, {}]], head: [[0.2, { r: 8 }, 'o'], [0.85, { r: 8 }], [1, {}]] } },
  angel: { verb: 'Make a snow angel', dir: 's', ms: 900, hold: true, lying: true, first: 'Made a snow angel. It is still there, a bit wonky.', winter: true,
    enter: { root: [[0.4, { y: 6 }, 'io'], [0.85, { r: -90, x: 34, y: -8 }, 'o'], [1, { r: -90, x: 34, y: -8 }]], armL: [[0.85, { r: 60 }], [1, { r: 60 }]], armR: [[0.85, { r: -60 }], [1, { r: -60 }]] },
    loop: { ms: 1400, root: [[0, { r: -90, x: 34, y: -8 }], [1, { r: -90, x: 34, y: -8 }]], armL: [[0, { r: 60 }], [0.5, { r: 150 }, 'io'], [1, { r: 60 }, 'io']], armR: [[0, { r: -60 }], [0.5, { r: -150 }, 'io'], [1, { r: -60 }, 'io']], legL: [[0, {}], [0.5, { r: 20 }, 'io'], [1, {}, 'io']], legR: [[0, {}], [0.5, { r: -20 }, 'io'], [1, {}, 'io']] }, fx: { every: 1400, kind: 'place', dy: 0, width: 44 } },
  // (7) swim: wade out from the bank until the water is at your chest, a few strokes, then float with your arms out (the water drawn round you)
  swim: { verb: 'Go for a swim', dir: 'n', ms: 5200, hold: true, prop: 'swimwater', first: 'Went for a swim and floated on my back for a while.', sound: 'splash', fx: { every: 1500, kind: 'water', dy: -1.2, width: 34 }, deep: true,
    enter: { root: [[0.05, {}], [0.45, { y: -46 }, 'io'], [0.8, { y: -50 }, 'io'], [1, { y: -50 }]], legL: [[0.05, {}], [0.12, { sy: 0.7 }, 'io'], [0.2, {}, 'io'], [0.42, { sy: 0.06 }, 'i'], [1, { sy: 0.06 }]], legR: [[0.1, {}], [0.17, { sy: 0.7 }, 'io'], [0.25, {}, 'io'], [0.42, { sy: 0.06 }, 'i'], [1, { sy: 0.06 }]],
      armL: [[0.45, { r: 30 }], [0.52, { r: 170 }, 'io'], [0.6, { r: 40 }, 'io'], [0.68, { r: 170 }, 'io'], [0.76, { r: 40 }, 'io'], [0.9, { r: 84, sy: 0.9 }, 'io'], [1, { r: 84, sy: 0.9 }]], armR: [[0.45, { r: -30 }], [0.56, { r: -170 }, 'io'], [0.64, { r: -40 }, 'io'], [0.72, { r: -170 }, 'io'], [0.8, { r: -40 }, 'io'], [0.9, { r: -84, sy: 0.9 }, 'io'], [1, { r: -84, sy: 0.9 }]],
      head: [[0.85, {}], [0.95, { y: 2, r: 4 }, 'io'], [1, { y: 2, r: 4 }]] },
    loop: { ms: 3200, root: [[0, { y: -50 }], [0.5, { y: -48.6 }, 'io'], [1, { y: -50 }, 'io']], legL: [[0, { sy: 0.06 }], [1, { sy: 0.06 }]], legR: [[0, { sy: 0.06 }], [1, { sy: 0.06 }]], armL: [[0, { r: 84, sy: 0.9 }], [0.5, { r: 78, sy: 0.9 }, 'io'], [1, { r: 84, sy: 0.9 }, 'io']], armR: [[0, { r: -84, sy: 0.9 }], [0.5, { r: -78, sy: 0.9 }, 'io'], [1, { r: -84, sy: 0.9 }, 'io']], head: [[0, { y: 2, r: 4 }], [0.5, { y: 2, r: -4 }, 'io'], [1, { y: 2, r: 4 }, 'io']] } },
  // (18) kick: a step, the knee comes through and the foot swings (the ball, or the leaves, fly: the core moves them)
  kick: { verb: 'Kick it', dir: 's', ms: 1300, first: 'Kicked a ball across the green.', sound: 'pat', kick: true,
    enter: { legR: [[0.15, { r: -14 }, 'io'], [0.35, { r: 30 }, 'b'], [0.5, { r: 22 }, 'o'], [0.8, {}, 'io']], kneeR: [[0.15, { r: 50 }, 'io'], [0.35, { r: -4 }, 'b'], [0.8, {}, 'io']], legL: [[0.35, { sy: 0.96 }], [0.8, {}]], armL: [[0.35, { r: 40 }, 'o'], [0.8, {}, 'io']], armR: [[0.35, { r: -30 }, 'o'], [0.8, {}, 'io']], up: [[0.15, { r: 4 }], [0.35, { r: -6 }, 'o'], [0.8, {}, 'io']] } },
  // (20) throw a stick for your pet: wind up, the stick flies, the pet runs for it and brings it back (the core moves the pet)
  throwstick: { verb: 'Throw a stick', dir: 's', ms: 1500, hold: true, first: 'Threw a stick. It came back, very wet.', fetch: true,   // (the stick itself: 94-garden-zz-7act-1core.js _gaFetchDraw, in hand, flying, in the grass, in the pet's mouth)

    loop: { ms: 3000, head: [[0, {}], [0.5, { r: 5 }, 'io'], [1, {}, 'io']], armL: [[0, {}], [1, {}]] },
    enter: { armR: [[0.15, { r: 50 }, 'io'], [0.32, { r: -170 }, 'b'], [0.5, { r: -120 }, 'o'], [0.9, {}, 'io']], up: [[0.15, { r: 6 }], [0.32, { r: -6 }, 'o'], [0.9, {}, 'io']], legL: [[0.32, { r: 6 }], [0.9, {}]] } },
  // (20) belly rubs (round 3): side on, down on one knee on the grass beside your pet, which lies on its back (the pet's own clip, l-belly); one hand rubs its tummy
  rub: { verb: 'Give your pet a belly rub', dir: 'e', ms: 700, hold: true, rubPet: true, first: 'Gave my pet a belly rub. Its leg went.',
    enter: _gaHoldPose({ root: { y: 12.4 }, up: { r: 16, x: 1 }, head: { r: 8 }, legR: { r: -82 }, kneeR: { r: 84 }, legL: { r: 8 }, kneeL: { r: 84, sy: 0.95 }, armR: { r: -50, sy: 1.04 }, armL: { r: -18, sy: 0.9 } }, 0.7),
    loop: Object.assign({ ms: 800 }, _gaHoldPose({ root: { y: 12.4 }, legR: { r: -82 }, kneeR: { r: 84 }, legL: { r: 8 }, kneeL: { r: 84, sy: 0.95 }, armL: { r: -18, sy: 0.9 } }, 0, 'l'), { up: [[0, { r: 16, x: 1 }], [0.5, { r: 19, x: 1.6 }, 'io'], [1, { r: 16, x: 1 }, 'io']], head: [[0, { r: 8 }], [0.5, { r: 12 }, 'io'], [1, { r: 8 }, 'io']], armR: [[0, { r: -44, sy: 1.04 }], [0.5, { r: -58, sy: 1.0 }, 'io'], [1, { r: -44, sy: 1.04 }, 'io']] }) },
  // (24) the busker's fiddle: under the chin, the bow arm saws; notes rise; a friend near you can dance (the moves wheel)
  play: { verb: 'Play the fiddle', dir: 's', ms: 600, hold: true, prop: 'fiddle', first: 'Played the busker\u2019s fiddle. Somebody clapped.', sound: 'chime', fx: { every: 900, kind: 'gold', dy: -2, width: 18 },
    enter: { armL: [[0.6, { r: -120, sy: 0.8 }, 'o'], [1, { r: -120, sy: 0.8 }]], armR: [[0.6, { r: -60, sy: 0.86 }, 'o'], [1, { r: -60, sy: 0.86 }]], head: [[0.6, { r: -10, x: -1 }], [1, { r: -10, x: -1 }]] },
    loop: { ms: 900, armL: [[0, { r: -120, sy: 0.8 }], [1, { r: -120, sy: 0.8 }]], armR: [[0, { r: -50, sy: 0.86 }], [0.5, { r: -80, sy: 0.86 }, 'io'], [1, { r: -50, sy: 0.86 }, 'io']], head: [[0, { r: -10, x: -1 }], [0.5, { r: -6, x: -1 }, 'io'], [1, { r: -10, x: -1 }, 'io']], up: [[0, {}], [0.5, { r: 2 }, 'io'], [1, {}, 'io']], root: [[0, {}], [0.25, { y: 0.8 }, 'io'], [0.5, {}, 'io'], [0.75, { y: 0.8 }, 'io'], [1, {}, 'io']] } },
  // (25) pick up a small thing: bend, lift it, and walk off carrying it in both hands (E again sets it down where you stand)
  carry: { verb: 'Pick it up', dir: 's', ms: 900, first: 'Picked something up and carried it off.', carry: true,
    enter: { root: [[0.4, { y: 7 }, 'io'], [0.9, {}, 'io']], up: [[0.4, { r: 0, y: 3, sy: 0.92 }, 'io'], [0.9, {}, 'io']], legL: [[0.4, { sy: 0.72 }, 'io'], [0.9, {}, 'io']], kneeL: [[0.4, { sy: 1.2 }, 'io'], [0.9, {}, 'io']], legR: [[0.4, { sy: 0.72 }, 'io'], [0.9, {}, 'io']], kneeR: [[0.4, { sy: 1.2 }, 'io'], [0.9, {}, 'io']], armL: [[0.4, { r: -10, sy: 1.1 }, 'io'], [0.9, { r: -18, sy: 0.78 }, 'io'], [1, { r: -18, sy: 0.78 }]], armR: [[0.4, { r: 10, sy: 1.1 }, 'io'], [0.9, { r: 18, sy: 0.78 }, 'io'], [1, { r: 18, sy: 0.78 }]] } },
  // (29) sit on the bank with your legs over and fish; a friend on the other half of the bank sits beside you and fishes too
  fishsit: { verb: 'Sit on the bank and fish', dir: 'e', ms: 700, hold: true, pet: 'sit', prop: 'bankrod', first: 'Sat on the bank and fished, legs over the water.',
    // (round 3) side on, sat on the grass of the bank with your knees up and your feet planted, the rod held out over the water; a friend sits along the bank beside you
    enter: _gaHoldPose({ root: { y: 28 }, up: { r: -5 }, legR: { r: -135 }, kneeR: { r: 81 }, legL: { r: -128 }, kneeL: { r: 78 }, armL: { r: -48, sy: 0.9 }, armR: { r: -62, sy: 0.86 } }, 0.6),
    loop: Object.assign({ ms: 4000 }, _gaHoldPose({ root: { y: 28 }, up: { r: -5 }, legR: { r: -135 }, kneeR: { r: 81 }, legL: { r: -128 }, kneeL: { r: 78 }, armL: { r: -48, sy: 0.9 }, armR: { r: -62, sy: 0.86 } }, 0, 'l'), { armR: [[0, { r: -62, sy: 0.86 }], [0.45, { r: -58, sy: 0.86 }, 'io'], [0.5, { r: -72, sy: 0.86 }, 'b'], [0.6, { r: -62, sy: 0.86 }, 'io'], [1, { r: -62, sy: 0.86 }]], head: [[0, {}], [0.5, { r: -5 }, 'io'], [1, {}, 'io']] }) },
  laugh: { verb: 'Laugh', dir: 's', ms: 1500, first: '', enter: { up: _GA_K(8, (i) => [0.08 + i * 0.1, { y: i % 2 ? 1 : -1, r: i % 2 ? 3 : 1 }, 'io']).concat([[1, {}]]), head: [[0.1, { r: -8 }, 'o'], [0.8, { r: -8 }], [1, {}]], armL: [[0.1, { r: 30 }, 'o'], [0.8, { r: 30 }], [1, {}]], armR: [[0.1, { r: -50 }, 'o'], [0.8, { r: -50 }], [1, {}]] } },
});
/** The fixed things of the layout and what each offers. stand: where the feet go (cells from the foot's middle), deg: the way you face. */
const GARDEN_ACT_BY_PROP = Object.freeze({
  'ld-bench-a': [{ act: 'sit', name: 'the bench', stand: [0, -0.16], deg: 90, seat: 0.36 }],
  'ld-bench-b': [{ act: 'sit', name: 'the bench', stand: [0, -0.16], deg: 90, seat: 0.36 }],   // seat: the seat's height as drawn today, a share of the figure's height (the size standard asks 0.3 H: a painter who lowers it changes this one number)
  'ld-stump': [{ act: 'sit', name: 'the stump', stand: [-0.34, 0.45], deg: 90, seat: 0.9 }],   // up on the top, to the left of its little door, legs down the front
  'ld-pump': [{ act: 'pump', name: 'the pump', stand: [0, 0.5], deg: -90 }],
  'ld-wish': [{ act: 'wish', name: 'the wishing well', stand: [0, 0.95], deg: -90 }],   // (far enough back not to stand on its stones)
  'ld-chapel': [{ act: 'bell', name: 'the chapel bell', stand: [0, 0.6], deg: -90 }],
  'ld-lighthouse': [{ act: 'ladder', name: 'the lighthouse ladder', stand: [0.12, 0.1], deg: -90 }],
  pier: [{ act: 'dangle', name: 'the pier end', painted: true, pierEnd: true, stand: [0, -0.3], deg: 90, lift: 0 }],   // (the pier is painted with the coast, not a prop of its own)
  boat: [{ act: 'row', name: 'the boat', stand: [0.9, 0.2], deg: 180, boat: true }],   // the rowing boat you own (94-garden-fish-9world.js) takes you out
  'notice-board': [{ act: 'read', name: 'the notices', stand: [0, 0.6], deg: 90 }],
  'lake-board': [{ act: 'read', name: 'the board', stand: [0, 0.6], deg: 90 }],
  'ld-sign-c': [{ act: 'read', name: 'the sign', stand: [0, 0.6], deg: 90 }],
  'ld-mile': [{ act: 'read', name: 'the milestone', stand: [0, 0.6], deg: 90 }],
  'ld-orchard-wall': [{ act: 'lean', name: 'the wall', stand: [0, 0.35], deg: -90 }],
  'ld-falls': [{ act: 'shower', name: 'the falls', stand: [0, 0.4], deg: 90, reach: 3.4 }],   // (its prompt reaches all the way under it)
  'camera-tripod': [{ act: 'photo', name: 'the camera', stand: [-1.3, 1.5], deg: 90 }],
});
/** Placed decorations, by their effect kind (gardenDecor(id).effect.kind). */
const GARDEN_ACT_BY_DECOR = Object.freeze({ sit: [{ act: 'sit', name: 'the seat', stand: [0, 0.06], deg: 90, seat: 0.45 }], wish: [{ act: 'wish', name: 'the well', stand: [0, 0.5], deg: -90 }] });
/** Trees, by which painter drew them (_gwPaintedTrunks). */
const GARDEN_ACT_BY_TREE = Object.freeze({
  orchard: [{ act: 'shake', name: 'the fruit tree', stand: [0, 0.32], deg: -90 }, { act: 'nap', name: 'under the tree', stand: [0.9, 0.45], deg: 90 }],
  wood: [{ act: 'climbtree', name: 'the tree', stand: [0, 0.3], deg: -90, big: 0.3 }, { act: 'hide', name: 'the tree', stand: [0, -0.5], deg: -90 }, { act: 'nap', name: 'under the tree', stand: [0.9, 0.45], deg: 90 }],
  village: [{ act: 'hide', name: 'the tree', stand: [0, -0.5], deg: -90 }, { act: 'nap', name: 'under the tree', stand: [0.9, 0.45], deg: 90 }],
  fells: [{ act: 'nap', name: 'under the tree', stand: [0.9, 0.45], deg: 90 }],
});
/** The water's edge: wherever water is within reach in front of you (feed and skim face it; skim only on still water). */
const GARDEN_ACT_WATER = Object.freeze([{ act: 'feed', name: 'the ducks' }, { act: 'skim', name: 'still water' }, { act: 'swim', name: 'the water', deep: true }]);   // (they take turns: do one and the other is offered)
/** Anywhere on open ground: these are on the moves wheel too. */
const GARDEN_ACT_GROUND = Object.freeze(['lie', 'nap', 'laugh', 'throwstick', 'rub']);
/** Not in the world yet. A painter places each (art: true once drawn) and it joins the prompts; cells are suggestions from the region plans. */
const GARDEN_ACT_SPOTS = Object.freeze([
  { id: 'rope-swing', act: 'swing', region: 'west-woods', near: 'ld-bridge', cell: [36, 34], art: false, note: 'a rope swing from an oak over the brook by the footbridge; swing, or let go and splash in' },
  { id: 'hammock', act: 'nap', region: 'orchard-headland', near: 'ld-treehouse', cell: [84, 47], art: false, note: 'a hammock slung between two orchard trees' },
  { id: 'campfire', act: 'warm', region: 'west-woods', near: 'ld-woodhut', cell: [15, 78], art: true, drawnBy: '94-garden-zz-7act-2world.js', note: 'a ring of stones and a fire by Hollin\'s hut (marshmallows)' },
  { id: 'harbour-bell', act: 'bell', region: 'home-island', near: 'tackle-shop', cell: [50, 78], art: false, note: 'a ship\'s bell on a post at the head of the pier' },
  { id: 'telescope-folly', act: 'look', region: 'east', near: 'ld-folly', cell: [86, 30], art: true, drawnBy: '94-garden-zz-7act-2world.js', note: 'the brass telescope on the folly lookout' },
  { id: 'telescope-quay', act: 'look', region: 'home-island', near: 'ld-lighthouse', cell: [60, 86], art: false, note: 'a coin telescope on the harbour wall, looking out to sea' },
  { id: 'busker', act: 'play', drawnBy: '94-garden-zz-7act-2world.js (or the water rows)', region: 'home-island', near: 'market-stall', cell: [52, 60], art: false, note: 'a busker\'s pitch with a fiddle and an open case; play, and a friend can dance' },
  { id: 'ball', act: 'kick', drawnBy: '94-garden-zz-7act-2world.js (or the water rows)', region: 'home-island', near: 'sundial', cell: [47, 52], art: false, note: 'a ball on the green' },
  { id: 'leaf-pile', act: 'kick', drawnBy: '94-garden-zz-7act-2world.js (or the water rows)', region: 'home-island', near: 'sundial', cell: [45, 53], art: false, note: 'an autumn leaf pile that bursts' },
  { id: 'grass-slope', act: 'roll', region: 'north-headland', near: 'ld-cairn', cell: [50, 12], art: false, note: 'a grassy slope to roll down (needs a height in the layout)' },
  { id: 'shallows-mere', act: 'paddle', region: 'home-island', near: 'reed-bank', cell: [40, 37], art: false, note: 'shallows to paddle and wade in, ripples round the legs (needs a depth in the water data)' },
  { id: 'swim-mere', act: 'swim', drawnBy: '94-garden-zz-7act-2world.js (or the water rows)', region: 'home-island', near: 'lake-hall', cell: [48, 36], art: false, note: 'deep enough to swim and float on your back (swimming needs the walker to allow water)' },
  { id: 'mast', act: 'ladder', region: 'home-island', near: 'ld-hull', cell: [42, 80], art: false, note: 'a boat\'s mast with rungs' },
  { id: 'hay-loft', act: 'ladder', region: 'east-mill', near: 'ld-barn', cell: [83, 66], art: false, note: 'a ladder drawn on the barn\'s side up to the loft door' },
  { id: 'fishing-bank', act: 'fishpair', drawnBy: '94-garden-zz-7act-2world.js (or the water rows)', region: 'home-island', near: 'reed-bank', cell: [41, 39], art: false, note: 'a grassy bank to sit and fish side by side, legs over' },
]);
