/* ============================================================
   THINGS YOU CAN DO WITH THE WORLD (round 3, "player" branch). The owner: "everything should be interactable ... climb ladders, sit
   down on a bench, lie down, do all sorts of things and interact with the entire environment in so many ways."

   THREE TABLES, all data. A new object only adds a row.
   GARDEN_ACTS[id]       what the gardener does: words for the prompt, the way the figure faces (dir), how high it is lifted (lift, px),
                         an `enter` and a `loop` (tracks on the figure's named parts, the same form as the moves wheel, GART_EMOTES:
                         [t, {x y r sx sy s}, ease] per part: root, up, head, armL, armR, legL, legR), how long (ms; hold: until you move),
                         what it holds (prop: SVG in the figure's units, feet at 0,0, about 70 tall), what it does to the world (fx),
                         whether the pet comes (pet), the line it writes in your journal the first time (first), and a sound.
   GARDEN_KINDS / GARDEN_TERRAIN (94-garden-zz-7act-0kinds.js): which of these any kind of thing, or any type of ground, offers. Things are
                         found where they stand on whatever layout is loaded (94-garden-zz-7act-0scan.js); placeable things (a ball, a log
                         seat, a campfire) are rows of layout data (assets/garden/vale-things.json), never cells in code.
   ============================================================ */
const _GA_K = (n, f) => Array.from({ length: n }, (_, i) => f(i, n));
/* small held things, in the figure's units (front on: the right hand is near x 10, y -38 hanging; raised to the face, about y -50) */
const GA_PROPS = Object.freeze({
  letter: '<g transform="translate(0 -34)"><path d="M-9 -7h18v13h-18z" fill="#f4ecd8" stroke="#8a7a5a" stroke-width="0.8"/><path d="M-6 -3h12M-6 0h12M-6 3h8" stroke="#9a8a6a" stroke-width="0.7"/></g>',
  scope: '<g transform="translate(6 -55) rotate(-8)"><rect x="0" y="-2.6" width="16" height="5.2" rx="1.6" fill="#7a5a34" stroke="#3a2a14" stroke-width="0.7"/><rect x="13" y="-3.4" width="4" height="6.8" rx="1" fill="#c8a84a"/></g>',
  coin: '<g class="ga-coin" transform="translate(9 -52)"><circle r="2.6" fill="#f0cc50" stroke="#a8862a" stroke-width="0.7"/></g>',
  stone: '<g class="ga-stone" transform="translate(11 -40)"><ellipse rx="2.8" ry="1.7" fill="#9a968c" stroke="#5a564c" stroke-width="0.6"/></g>',
  crumbs: '<g transform="translate(9 -40)"><path d="M-3 0q3 -3 6 0q-3 3 -6 0z" fill="#d8b878" stroke="#9a7a48" stroke-width="0.5"/></g>',
  // (round 6) the toasting stick held out and down over the fire in front of you, a big marshmallow on its end just over the flames' tips (toasted on one side)
  stick: '<g transform="translate(10 -33) rotate(208)"><path d="M0 0L0 -44" stroke="#7a5432" stroke-width="1.8" stroke-linecap="round"/><path d="M0.5 -4L0.5 -40" stroke="#a87c4f" stroke-width="0.6" opacity="0.8"/><rect x="-3.6" y="-52" width="7.2" height="7.4" rx="2.4" fill="#fbf6ea" stroke="#b89a70" stroke-width="0.6"/><path d="M-3.6 -47q3.6 2.4 7.2 0v1.4q-3.6 2 -7.2 0z" fill="#c88a48" opacity="0.85"/><ellipse cx="-1.2" cy="-50.4" rx="1.3" ry="0.8" fill="#ffffff" opacity="0.9"/></g>',
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
  swimwater: '<g class="ga-wade" opacity="0"><ellipse cx="0" cy="-9" rx="15" ry="4.4" fill="#5aa4b8" opacity="0.75"/><ellipse cx="0" cy="-9.6" rx="18" ry="5" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.8"/><path d="M-20 -6q4 2 8 0M12 -5q4 2 8 0" stroke="#e8f6fa" stroke-width="0.9" fill="none" opacity="0.7"/></g><g class="ga-swim"><ellipse cx="0" cy="-25" rx="19" ry="6.4" fill="#4f98ae" opacity="0.7"/><ellipse cx="0" cy="-26" rx="17" ry="4.4" fill="#8ccbdc" opacity="0.55"/><ellipse class="ga-swim-r" cx="0" cy="-26" rx="22" ry="5.6" fill="none" stroke="#ffffff" stroke-width="1.1" opacity="0.75"/><path d="M-26 -22q5 2 10 0M14 -21q5 2 10 0" stroke="#e8f6fa" stroke-width="0.9" fill="none" opacity="0.7"/></g>',
  // (round 4) the fiddle on the left shoulder under the jaw (the face clear), its neck out to the side in the left hand; the bow across the strings
  fiddle: '<g transform="translate(-15 -44) rotate(-12)"><path d="M9 0Q9 -5.4 5 -5Q3 -5.2 2 -3.4Q0 -2.4 -2 -3.4Q-3 -5.2 -6 -5Q-9 -4.6 -9 0Q-9 4.6 -6 5Q-3 5.2 -2 3.4Q0 2.4 2 3.4Q3 5.2 5 5Q9 5.4 9 0z" fill="#b0602c" stroke="#4a2210" stroke-width="0.7"/><path d="M6 -2.6Q8 0 6 2.6" stroke="#e0a060" stroke-width="0.6" fill="none" opacity="0.7"/><path d="M-1.6 -1.6q0.8 1.6 0 3.2M1.6 -1.6q-0.8 1.6 0 3.2" stroke="#2a1208" stroke-width="0.6" fill="none"/><path d="M-9 0H-21" stroke="#2a1a10" stroke-width="2"/><path d="M-21 -1.4q-3 0 -3 1.4q0 1.4 3 1.4" fill="#5a2a12" stroke="#2a1208" stroke-width="0.5"/><path d="M8 -0.8H-21M8 0.8H-21" stroke="#f0e6c8" stroke-width="0.35" opacity="0.9"/><path d="M8 -2.4h2.4v4.8h-2.4z" fill="#2a1a10"/></g><g class="ga-bow" style="transform-origin:-14px -41px"><path d="M-1 -32L-29 -55" stroke="#5a3e22" stroke-width="1.1" stroke-linecap="round"/><path d="M-1.4 -33.8L-28.6 -56.4" stroke="#f4eee0" stroke-width="0.5" opacity="0.9"/></g>',
  // the rod held out over the water in front (you face it), the line down to a float out on the water
  bankrod: '<g><path d="M10 -30L30 -66" stroke="#7a5a34" stroke-width="1.8" stroke-linecap="round"/><path d="M30 -66Q36 -70 38 -96" stroke="#e8e8e0" stroke-width="0.6" fill="none" opacity="0.85"/><circle cx="38" cy="-97" r="2.2" fill="#d84a3a" stroke="#fff" stroke-width="0.6"/><ellipse class="ga-bob-r" cx="38" cy="-96" rx="7" ry="2.2" fill="none" stroke="#fff" stroke-width="0.7" opacity="0.6"/></g>',
  // the rod held out and down over water in front of you or to your side (a bank whose water is not to the north): the line drops to a float below the lip
  bankrodfront: '<g><path d="M9 -30L32 -16" stroke="#7a5a34" stroke-width="1.8" stroke-linecap="round"/><path d="M32 -16Q37 -10 38 20" stroke="#e8e8e0" stroke-width="0.6" fill="none" opacity="0.85"/><circle cx="38" cy="21" r="2.2" fill="#d84a3a" stroke="#fff" stroke-width="0.6"/><ellipse class="ga-bob-r" cx="38" cy="22" rx="7" ry="2.2" fill="none" stroke="#fff" stroke-width="0.7" opacity="0.6"/></g>',
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
    enter: { up: _GA_K(8, (i) => [0.1 + i * 0.1, { r: i % 2 ? 4 : -4, x: i % 2 ? 1 : -1 }, 'io']).concat([[1, {}]]), armL: [[0.1, { r: 16, sy: 0.5 }, 'o'], [0.9, { r: 16, sy: 0.5 }], [1, {}]], armR: [[0.1, { r: -16, sy: 0.5 }, 'o'], [0.9, { r: -16, sy: 0.5 }], [1, {}]], root: _GA_K(8, (i) => [0.1 + i * 0.1, { x: i % 2 ? 1.4 : -1.4 }, 'l']).concat([[1, {}]]) } },
  bell: { verb: 'Ring the bell', dir: 'n', ms: 2200, prop: 'rope', propBehind: true, propGround: true, first: 'Rang the bell. Half the vale looked up.', sound: 'bell', use: 'bell',
    enter: { armL: [[0.1, { r: 168 }, 'o'], [0.3, { r: 130 }, 'i'], [0.45, { r: 168 }, 'o'], [0.65, { r: 130 }, 'i'], [0.8, { r: 168 }, 'o'], [1, {}]], armR: [[0.1, { r: -168 }, 'o'], [0.3, { r: -130 }, 'i'], [0.45, { r: -168 }, 'o'], [0.65, { r: -130 }, 'i'], [0.8, { r: -168 }, 'o'], [1, {}]], root: [[0.3, { y: 3, sy: 0.94 }, 'i'], [0.45, { y: -2 }, 'o'], [0.65, { y: 3, sy: 0.94 }, 'i'], [0.8, { y: -2 }, 'o'], [1, {}]] } },
  // (round 6) side on, at the lever out on the pump's left: the near hand on the lever's end works it up and down three times (the lever really
  // moves: 94-garden-zz-7act-1core.js _gaPumpWorks draws the pump with it), water runs from the spout into the bucket, then a drink from the cupped hand
  pump: { verb: 'Work the pump and drink', dir: 'e', ms: 3400, first: 'Pumped cold water and drank it from my hands.', sound: 'splash', pumpWorks: true, fx: { at: [0.3, 0.45, 0.6], kind: 'water', spot: [0.32, -0.32], width: 12 },
    enter: { armR: [[0.08, { r: -104, sy: 0.98 }, 'io'], [0.2, { r: -62, sy: 1 }, 'io'], [0.32, { r: -104, sy: 0.98 }, 'io'], [0.44, { r: -62, sy: 1 }, 'io'], [0.56, { r: -104, sy: 0.98 }, 'io'], [0.66, { r: -70 }, 'io'], [0.74, { r: -168, sy: 0.5 }, 'io'], [0.92, { r: -168, sy: 0.5 }], [1, {}]],
      armL: [[0.08, { r: -30, sy: 0.9 }, 'io'], [0.66, { r: -30, sy: 0.9 }], [0.74, { r: -150, sy: 0.5 }, 'io'], [0.92, { r: -150, sy: 0.5 }], [1, {}]],
      up: [[0.08, { r: 4 }, 'io'], [0.2, { r: 10, y: 1 }, 'io'], [0.32, { r: 4 }, 'io'], [0.44, { r: 10, y: 1 }, 'io'], [0.56, { r: 4 }, 'io'], [0.66, { r: 8 }, 'io'], [0.74, { r: -2 }, 'io'], [0.92, { r: -2 }], [1, {}]],
      head: [[0.66, {}], [0.74, { r: -12 }, 'io'], [0.92, { r: -12 }], [1, {}]] } },
  wish: { verb: 'Throw a coin and make a wish', dir: 'n', ms: 2600, prop: 'coin', first: 'Threw a coin in the wishing well. It glowed.', sound: 'coin', use: 'wish', fx: { at: [0.55, 0.62, 0.7], kind: 'gold', dy: -1.25, width: 26 },
    enter: { armR: [[0.15, { r: -150 }, 'o'], [0.35, { r: -150 }], [0.45, { r: -40 }, 'b'], [0.7, { r: -20 }], [1, {}]], up: [[0.35, { r: -4 }], [0.45, { r: 6 }, 'o'], [0.7, {}], [1, {}]], head: [[0.45, { y: 2 }], [0.8, { y: 2 }], [1, {}]], armL: [[0.75, {}], [0.85, { r: 30 }, 'io'], [1, {}]] } },
  warm: { verb: 'Warm your hands', dir: 's', ms: 700, hold: true, pet: 'sit', first: 'Warmed my hands at the fire and toasted a marshmallow.', prop: 'stick', glow: true,
    // facing you over the fire (the fire is between you and the camera): hands out to it, a marshmallow on a stick now and then
    enter: { armL: [[0.6, { r: 34, sy: 0.8 }, 'o'], [1, { r: 34, sy: 0.8 }]], armR: [[0.6, { r: -30, sy: 0.82 }, 'o'], [1, { r: -30, sy: 0.82 }]], up: [[0.6, { y: 1.5, sy: 0.97, r: 2 }], [1, { y: 1.5, sy: 0.97, r: 2 }]] },
    loop: { ms: 1800, armL: [[0, { r: 34, sy: 0.8 }], [0.5, { r: 40, sy: 0.8 }, 'io'], [1, { r: 34, sy: 0.8 }, 'io']], armR: [[0, { r: -30, sy: 0.82 }], [1, { r: -30, sy: 0.82 }]], up: [[0, { y: 1.5, sy: 0.97, r: 2 }], [1, { y: 1.5, sy: 0.97, r: 2 }]], head: [[0, {}], [0.5, { r: 4 }, 'io'], [1, {}, 'io']] } },
  // (round 6) the orchard wall is taller than you: you lean back against it, facing out over the vale, arms folded, one ankle crossed over the
  // other, the weight shifting from hip to hip now and then while you look round (no arms out to the sides)
  lean: { verb: 'Lean on the wall and look out', dir: 's', ms: 700, hold: true, pet: 'sit', first: 'Leaned on the wall and looked out over the vale.',
    enter: _gaHoldPose({ root: { x: 1 }, up: { r: -3, x: -0.6 }, legR: { r: -12 }, kneeR: { r: 6 }, legL: { r: 3 }, armL: { r: -42, sy: 0.6 }, armR: { r: 46, sy: 0.58 }, head: { r: 3 } }, 0.6),
    loop: Object.assign({ ms: 6000 }, _gaHoldPose({ legR: { r: -12 }, kneeR: { r: 6 }, legL: { r: 3 }, armL: { r: -42, sy: 0.6 }, armR: { r: 46, sy: 0.58 } }, 0, 'l'), {
      root: [[0, { x: 1 }], [0.45, { x: 1 }], [0.55, { x: 2.2 }, 'io'], [0.9, { x: 2.2 }], [1, { x: 1 }, 'io']], up: [[0, { r: -3, x: -0.6 }], [0.45, { r: -3, x: -0.6 }], [0.55, { r: -5, x: -1.2 }, 'io'], [0.9, { r: -5, x: -1.2 }], [1, { r: -3, x: -0.6 }, 'io']],
      head: [[0, { r: 3 }], [0.25, { r: 10 }, 'io'], [0.45, { r: 10 }], [0.6, { r: -6 }, 'io'], [0.85, { r: -6 }], [1, { r: 3 }, 'io']] }) },
  read: { verb: 'Read it', dir: 's', ms: 600, hold: true, prop: 'letter', first: 'Read the notices. Someone has lost a hen.',
    enter: { armL: [[0.6, { r: -24, sy: 0.82 }, 'o'], [1, { r: -24, sy: 0.82 }]], armR: [[0.6, { r: 24, sy: 0.82 }, 'o'], [1, { r: 24, sy: 0.82 }]], head: [[0.6, { y: 1.5 }], [1, { y: 1.5 }]] },
    loop: { ms: 3000, head: [[0, { y: 1.5, r: -4 }], [0.5, { y: 1.5, r: 4 }, 'io'], [1, { y: 1.5, r: -4 }, 'io']], armL: [[0, { r: -24, sy: 0.82 }], [1, { r: -24, sy: 0.82 }]], armR: [[0, { r: 24, sy: 0.82 }], [1, { r: 24, sy: 0.82 }]] } },
  // (round 6) side on at the eyepiece (the brass telescope on its stand just in front: 94-garden-zz-7act-2world.js), bent to it with the eye on
  // the eyepiece, the near hand out along the barrel steadying it, the far hand up at the eyepiece; now and then a slow sweep along the hills
  look: { verb: 'Look through the telescope', dir: 'e', ms: 700, hold: true, first: 'Looked through the telescope at the far hills.',
    enter: _gaHoldPose({ up: { r: 12, x: 1.5, y: 1.5 }, head: { r: 6, y: 1 }, armR: { r: -116, sy: 0.84 }, armL: { r: -128, sy: 0.5 } }, 0.6),
    loop: Object.assign({ ms: 6000 }, _gaHoldPose({ armL: { r: -128, sy: 0.5 } }, 0, 'l'), { up: [[0, { r: 12, x: 1.5, y: 1.5 }], [0.5, { r: 14, x: 1.8, y: 1.8 }, 'io'], [1, { r: 12, x: 1.5, y: 1.5 }, 'io']], head: [[0, { r: 6, y: 1 }], [0.5, { r: 8, y: 1 }, 'io'], [1, { r: 6, y: 1 }, 'io']], armR: [[0, { r: -116, sy: 0.84 }], [0.5, { r: -119, sy: 0.85 }, 'io'], [1, { r: -116, sy: 0.84 }, 'io']] }) },
  feed: { verb: 'Feed the ducks', dir: 'n', ms: 5200, prop: 'ducks', propBehind: true, propGround: true, first: 'Fed the ducks. They came from all over.', sound: 'pat', fx: { at: [0.13, 0.31, 0.49], kind: 'feed', dy: -1.6, width: 30 }, gather: true,
    // a pinch from the bag, thrown underarm in an arc, three times; the ducks swim in and dabble (the prop's own motion)
    enter: { armR: [[0.04, { r: -40 }, 'o'], [0.1, { r: 20 }, 'io'], [0.13, { r: -150 }, 'b'], [0.2, { r: -40 }, 'io'], [0.27, { r: 20 }, 'io'], [0.31, { r: -150 }, 'b'], [0.38, { r: -40 }, 'io'], [0.45, { r: 20 }, 'io'], [0.49, { r: -150 }, 'b'], [0.6, { r: -20 }, 'io'], [1, {}]],
      armL: [[0.05, { r: 20, sy: 0.8 }, 'o'], [0.6, { r: 20, sy: 0.8 }], [0.7, {}, 'io'], [1, {}]], up: [[0.13, { r: 5 }], [0.2, {}], [0.31, { r: 5 }], [0.38, {}], [0.49, { r: 5 }], [0.6, {}], [1, {}]], head: [[0.55, {}], [0.65, { y: 2 }, 'io'], [0.95, { y: 2 }], [1, {}]] } },
  skim: { verb: 'Skim a stone', dir: 'n', ms: 3800, prop: 'stone', propGround: true, propBehind: true, first: 'Skimmed a stone across still water.', skim: true,
    enter: { root: [[0.2, { y: 3, sy: 0.94 }, 'io'], [0.36, { x: 3 }, 'o'], [1, {}]], up: [[0.2, { r: -10 }, 'io'], [0.36, { r: 12 }, 'o'], [0.6, { r: 4 }], [1, {}]], armR: [[0.2, { r: 60 }, 'io'], [0.36, { r: -100 }, 'b'], [0.6, { r: -60 }], [1, {}]], head: [[0.4, { r: 4 }], [0.9, { r: -4 }, 'io'], [1, {}]] } },
  shower: { verb: 'Stand under the falls', dir: 's', ms: 3600, first: 'Stood under the waterfall and came out dripping.', sound: 'splash', fx: { every: 220, kind: 'water', dy: -1.9, width: 34 }, after: 'drips',
    enter: { up: [[0.1, { sy: 0.94, y: 2 }, 'o'], [0.85, { sy: 0.94, y: 2 }], [1, {}]], armL: [[0.15, { r: 150 }, 'o'], [0.8, { r: 150 }], [0.9, { r: 30 }, 'io'], [1, {}]], armR: [[0.15, { r: -150 }, 'o'], [0.8, { r: -150 }], [0.9, { r: -30 }, 'io'], [1, {}]], head: _GA_K(8, (i) => [0.15 + i * 0.09, { r: i % 2 ? 5 : -5 }, 'io']).concat([[1, {}]]) } },
  // (round 4) behind the trunk, just to its right: most of you hidden by it (the tree does not fade while you hide), you lean out round its
  // edge, a hand on the bark at head height, and peek at the camera; now and then you lean further out to look, then duck back
  hide: { verb: 'Hide behind the tree', dir: 's', ms: 700, hold: true, first: 'Hid behind a tree. Nobody found me.', hideBehind: true,
    enter: { root: [[0.6, { x: -4, y: 2, sy: 0.96 }, 'o'], [1, { x: -4, y: 2, sy: 0.96 }]], up: [[0.6, { r: 13 }, 'o'], [1, { r: 13 }]], head: [[0.6, { r: 10, x: 1 }, 'o'], [1, { r: 10, x: 1 }]], armR: [[0.6, { r: -150, sy: 0.5 }, 'o'], [1, { r: -150, sy: 0.5 }]], armL: [[0.6, { r: 30, sy: 0.6 }], [1, { r: 30, sy: 0.6 }]], legR: [[0.6, { r: -6 }], [1, { r: -6 }]] },
    loop: { ms: 4200, root: [[0, { x: -4, y: 2, sy: 0.96 }], [1, { x: -4, y: 2, sy: 0.96 }]], armL: [[0, { r: 30, sy: 0.6 }], [1, { r: 30, sy: 0.6 }]], legR: [[0, { r: -6 }], [1, { r: -6 }]],
      up: [[0, { r: 13 }], [0.35, { r: 13 }], [0.45, { r: 20, x: 1.5 }, 'io'], [0.62, { r: 20, x: 1.5 }], [0.72, { r: 6 }, 'io'], [0.86, { r: 6 }], [1, { r: 13 }, 'io']],
      head: [[0, { r: 10, x: 1 }], [0.35, { r: 10, x: 1 }], [0.45, { r: 16, x: 2 }, 'io'], [0.52, { r: 4, x: 2 }, 'io'], [0.62, { r: 16, x: 2 }, 'io'], [0.72, { r: 2 }, 'io'], [0.86, { r: 2 }], [1, { r: 10, x: 1 }, 'io']],
      armR: [[0, { r: -150, sy: 0.5 }], [0.45, { r: -142, sy: 0.54 }, 'io'], [0.72, { r: -150, sy: 0.5 }, 'io'], [1, { r: -150, sy: 0.5 }]] } },
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
    enter: { root: [[0.04, {}], [0.16, { y: -10 }, 'io'], [0.28, { y: -22 }, 'io'], [0.45, { y: -46 }, 'io'], [0.8, { y: -50 }, 'io'], [1, { y: -50 }]], legL: [[0.04, {}], [0.1, { sy: 0.8 }, 'io'], [0.16, { sy: 0.62 }, 'io'], [0.22, { sy: 0.5 }, 'io'], [0.28, { sy: 0.38 }, 'io'], [0.42, { sy: 0.06 }, 'i'], [1, { sy: 0.06 }]], legR: [[0.07, {}], [0.13, { sy: 0.74 }, 'io'], [0.19, { sy: 0.58 }, 'io'], [0.25, { sy: 0.44 }, 'io'], [0.3, { sy: 0.34 }, 'io'], [0.42, { sy: 0.06 }, 'i'], [1, { sy: 0.06 }]],   // (round 4: wading out step by step, the water rising up the legs, before the deep)
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
    // (round 6) leaning in over the pet, the near arm out and down so the palm is on its tummy (not on your own knee), rubbing to and fro
    enter: _gaHoldPose({ root: { y: 12.4 }, up: { r: 26, x: 2 }, head: { r: 4 }, legR: { r: -82 }, kneeR: { r: 84 }, legL: { r: 8 }, kneeL: { r: 84, sy: 0.95 }, armR: { r: -66, sy: 1.12 }, armL: { r: -18, sy: 0.9 } }, 0.7),
    loop: Object.assign({ ms: 800 }, _gaHoldPose({ root: { y: 12.4 }, legR: { r: -82 }, kneeR: { r: 84 }, legL: { r: 8 }, kneeL: { r: 84, sy: 0.95 }, armL: { r: -18, sy: 0.9 } }, 0, 'l'), { up: [[0, { r: 26, x: 2 }], [0.5, { r: 28, x: 2.6 }, 'io'], [1, { r: 26, x: 2 }, 'io']], head: [[0, { r: 4 }], [0.5, { r: 8 }, 'io'], [1, { r: 4 }, 'io']], armR: [[0, { r: -60, sy: 1.12 }], [0.5, { r: -72, sy: 1.1 }, 'io'], [1, { r: -60, sy: 1.12 }, 'io']] }) },
  // (24) the busker's fiddle: under the chin, the bow arm saws; notes rise; a friend near you can dance (the moves wheel)
  play: { verb: 'Play the fiddle', dir: 's', ms: 600, hold: true, prop: 'fiddle', first: 'Played the busker’s fiddle. Somebody clapped.', sound: 'chime', fx: { every: 900, kind: 'gold', dy: -2, width: 18 }, bow: true,
    // (round 4) the left hand out holding the neck, the right hand across the body drawing the bow over the strings, the head tilted down on to the chinrest
    enter: { armL: [[0.6, { r: 72, sy: 0.86 }, 'o'], [1, { r: 72, sy: 0.86 }]], armR: [[0.6, { r: 40, sy: 0.9 }, 'o'], [1, { r: 40, sy: 0.9 }]], head: [[0.6, { r: -9, y: 1 }], [1, { r: -9, y: 1 }]] },
    loop: { ms: 900, armL: [[0, { r: 72, sy: 0.86 }], [1, { r: 72, sy: 0.86 }]], armR: [[0, { r: 30, sy: 0.92 }], [0.5, { r: 50, sy: 0.86 }, 'io'], [1, { r: 30, sy: 0.92 }, 'io']], head: [[0, { r: -9, y: 1 }], [0.5, { r: -6, y: 1 }, 'io'], [1, { r: -9, y: 1 }, 'io']], up: [[0, {}], [0.5, { r: -2 }, 'io'], [1, {}, 'io']], root: [[0, {}], [0.25, { y: 0.8 }, 'io'], [0.5, {}, 'io'], [0.75, { y: 0.8 }, 'io'], [1, {}, 'io']] } },
  // (25) pick up a small thing: bend, lift it, and walk off carrying it in both hands (E again sets it down where you stand)
  carry: { verb: 'Pick it up', dir: 's', ms: 900, first: 'Picked something up and carried it off.', carry: true,
    enter: { root: [[0.4, { y: 7 }, 'io'], [0.9, {}, 'io']], up: [[0.4, { r: 0, y: 3, sy: 0.92 }, 'io'], [0.9, {}, 'io']], legL: [[0.4, { sy: 0.72 }, 'io'], [0.9, {}, 'io']], kneeL: [[0.4, { sy: 1.2 }, 'io'], [0.9, {}, 'io']], legR: [[0.4, { sy: 0.72 }, 'io'], [0.9, {}, 'io']], kneeR: [[0.4, { sy: 1.2 }, 'io'], [0.9, {}, 'io']], armL: [[0.4, { r: -10, sy: 1.1 }, 'io'], [0.9, { r: -18, sy: 0.78 }, 'io'], [1, { r: -18, sy: 0.78 }]], armR: [[0.4, { r: 10, sy: 1.1 }, 'io'], [0.9, { r: 18, sy: 0.78 }, 'io'], [1, { r: 18, sy: 0.78 }]] } },
  // (29) sit on the bank with your legs over and fish; a friend on the other half of the bank sits beside you and fishes too
  fishsit: { verb: 'Sit on the bank and fish', dir: 'n', ms: 700, hold: true, pet: 'sit', prop: 'bankrod', first: 'Sat on the bank and fished, legs over the water.',
    // (round 4) facing the water, back to you, sat on the lip of the bank with the legs over the edge (down over the water, out of sight past the lip), the rod held out
    enter: _gaHoldPose({ root: { y: 25 }, legL: { sy: 0.12 }, legR: { sy: 0.12 }, kneeL: { sy: 0.4 }, kneeR: { sy: 0.4 }, up: { y: 0.5 }, armL: { r: 150, sy: 0.42 }, armR: { r: -150, sy: 0.42 } }, 0.6),
    loop: Object.assign({ ms: 4000 }, _gaHoldPose({ root: { y: 25 }, legL: { sy: 0.12 }, legR: { sy: 0.12 }, kneeL: { sy: 0.4 }, kneeR: { sy: 0.4 }, up: { y: 0.5 }, armL: { r: 150, sy: 0.42 } }, 0, 'l'), { armR: [[0, { r: -150, sy: 0.42 }], [0.45, { r: -146, sy: 0.44 }, 'io'], [0.5, { r: -160, sy: 0.4 }, 'b'], [0.6, { r: -150, sy: 0.42 }, 'io'], [1, { r: -150, sy: 0.42 }]], head: [[0, {}], [0.5, { r: -5 }, 'io'], [1, {}, 'io']] }) },
  // the same on a bank whose water lies towards you or to one side: sat on the lip facing it, shins down over the edge (the pier end's sit), the rod out over the water
  fishsitfront: { verb: 'Sit on the bank and fish', dir: 's', ms: 700, hold: true, pet: 'sit', prop: 'bankrodfront', first: 'Sat on the bank and fished, legs over the water.',
    enter: _gaHoldPose(Object.assign({}, _GA_SITP, { root: { y: 27 }, armL: { r: -40, sy: 0.8 }, armR: { r: -52, sy: 0.82 } }), 0.6),
    loop: Object.assign(_GA_SITLOOP(4000), { root: [[0, { y: 27 }], [1, { y: 27 }]], armL: [[0, { r: -40, sy: 0.8 }], [1, { r: -40, sy: 0.8 }]], armR: [[0, { r: -52, sy: 0.82 }], [0.45, { r: -48, sy: 0.84 }, 'io'], [0.5, { r: -62, sy: 0.8 }, 'b'], [0.6, { r: -52, sy: 0.82 }, 'io'], [1, { r: -52, sy: 0.82 }]] }) },
  laugh: { verb: 'Laugh', dir: 's', ms: 1500, first: '', enter: { up: _GA_K(8, (i) => [0.08 + i * 0.1, { y: i % 2 ? 1 : -1, r: i % 2 ? 3 : 1 }, 'io']).concat([[1, {}]]), head: [[0.1, { r: -8 }, 'o'], [0.8, { r: -8 }], [1, {}]], armL: [[0.1, { r: 30 }, 'o'], [0.8, { r: 30 }], [1, {}]], armR: [[0.1, { r: -50 }, 'o'], [0.8, { r: -50 }], [1, {}]] } },
});
/* What each KIND of thing offers (where you stand, which way you face, what it needs) is in 94-garden-zz-7act-0kinds.js (GARDEN_KINDS, and
   GARDEN_TERRAIN for the ground: the water's edge, deep water, open grass, sand, snow); the things are found where they stand
   (94-garden-zz-7act-0scan.js). Nothing here names a place. */

