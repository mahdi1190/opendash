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
  stick: '<g transform="translate(13 -24) rotate(28)"><path d="M0 0L0 -22" stroke="#7a5432" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="0" cy="-23.5" rx="2.4" ry="2" fill="#f6f0e2" stroke="#c8b89a" stroke-width="0.5"/></g>',
  oars: '<g><path d="M-26 -30L26 -22" stroke="#8a6438" stroke-width="2" stroke-linecap="round"/><path d="M-30 -31l-6 -1l1 4z M30 -21l6 1l-1 -4z" fill="#a07a48"/></g>',
  ladder: '<g transform="translate(0 2)"><path d="M-9 0L-7 -136M9 0L7 -136" stroke="#7a5a36" stroke-width="2.4" stroke-linecap="round"/><path d="M-7.6 -133L-9.4 -138M7.6 -133L9.4 -138" stroke="#5a3e22" stroke-width="2"/>' + _GA_K(14, (i) => `<path d="M${-8.8 + i * 0.13} ${-6 - i * 9.4}H${8.8 - i * 0.13}" stroke="#8a6a40" stroke-width="1.8"/>`).join('') + '<ellipse cx="0" cy="0" rx="13" ry="2.4" fill="#000" opacity="0.12"/></g>',
  zzz: '<g transform="translate(16 -62) rotate(90)"><g class="ga-zzz"><text x="0" y="0" font-size="8" font-weight="700" fill="#f4f0ff" stroke="#5a5a8a" stroke-width="0.4">z</text><text x="6" y="-7" font-size="10" font-weight="700" fill="#f4f0ff" stroke="#5a5a8a" stroke-width="0.4">z</text></g></g>',
  blanket: '<g><path d="M-46 2Q-44 -5 -20 -6L22 -5Q40 -4 42 3Q20 7 -2 7Q-30 7 -46 2z" fill="#c8584a" stroke="#7a3028" stroke-width="0.7"/><path d="M-36 -2L32 -1M-38 3L36 3" stroke="#f0d8b8" stroke-width="1" opacity="0.7"/></g>',
  drips: '<g class="ga-drips">' + _GA_K(6, (i) => `<path d="M${-8 + i * 3.2} ${-30 + (i % 3) * 9}q1 2 0 3q-1 -1 0 -3z" fill="#9ad4ee"/>`).join('') + '</g>',
  peek: '',
});
/* Parts: front on, root (feet at 0,0) / up (from the hips) / head / armL armR (hang from the shoulders: + turns the left arm out, - the right) / legL legR. */
const _GA_SIT = { root: [[0.5, { y: 14 }, 'o'], [1, { y: 14 }]], legL: [[0.5, { sy: 0.52, r: 6 }, 'o'], [1, { sy: 0.52, r: 6 }]], legR: [[0.5, { sy: 0.52, r: -6 }, 'o'], [1, { sy: 0.52, r: -6 }]], armL: [[0.5, { r: 16 }, 'o'], [1, { r: 16 }]], armR: [[0.5, { r: -16 }, 'o'], [1, { r: -16 }]] };
const GARDEN_ACTS = Object.freeze({
  sit: { verb: 'Sit down', dir: 's', ms: 600, hold: true, pet: 'sit', sound: 'pat', first: 'Sat a while and watched the vale go by.',
    enter: _GA_SIT,
    // swinging legs and a fidget: one leg, then the other, a look round now and then
    loop: { ms: 4200, legL: [[0, { sy: 0.52, r: 6 }], [0.12, { sy: 0.5, r: 18 }, 'io'], [0.24, { sy: 0.52, r: 4 }, 'io'], [0.36, { sy: 0.5, r: 16 }, 'io'], [0.48, { sy: 0.52, r: 6 }, 'io'], [1, { sy: 0.52, r: 6 }]], legR: [[0, { sy: 0.52, r: -6 }], [0.5, { sy: 0.52, r: -6 }], [0.62, { sy: 0.5, r: -18 }, 'io'], [0.74, { sy: 0.52, r: -4 }, 'io'], [0.86, { sy: 0.5, r: -16 }, 'io'], [1, { sy: 0.52, r: -6 }, 'io']], head: [[0, {}], [0.3, {}], [0.4, { r: 8 }, 'io'], [0.58, { r: 8 }], [0.68, { r: -4 }, 'io'], [0.8, {}, 'io'], [1, {}]], root: [[0, { y: 14 }], [1, { y: 14 }]], armL: [[0, { r: 16 }], [1, { r: 16 }]], armR: [[0, { r: -16 }], [1, { r: -16 }]] } },
  dangle: { verb: 'Sit on the end and dangle your feet', dir: 's', ms: 700, hold: true, pet: 'sit', first: 'Sat at the end of the pier, feet over the water.',
    // the hips on the deck's edge, the legs hanging down over the water (the feet go below the planks)
    enter: { root: [[0.6, { y: 25 }, 'o'], [1, { y: 25 }]], legL: [[0.6, { r: 4 }, 'o'], [1, { r: 4 }]], legR: [[0.6, { r: -4 }, 'o'], [1, { r: -4 }]], armL: [[0.6, { r: 30 }, 'o'], [1, { r: 30 }]], armR: [[0.6, { r: -30 }, 'o'], [1, { r: -30 }]] },
    loop: { ms: 2400, root: [[0, { y: 25 }], [1, { y: 25 }]], legL: [[0, { r: 4 }], [0.25, { r: 16, sy: 0.92 }, 'io'], [0.5, { r: 4 }, 'io'], [1, { r: 4 }]], legR: [[0, { r: -4 }], [0.5, { r: -4 }], [0.75, { r: -16, sy: 0.92 }, 'io'], [1, { r: -4 }, 'io']], armL: [[0, { r: 30 }], [1, { r: 30 }]], armR: [[0, { r: -30 }], [1, { r: -30 }]], head: [[0, {}], [0.5, { r: -5 }, 'io'], [1, {}, 'io']] }, fx: { every: 1200, kind: 'water', dy: 0.9, width: 30 } },
  lie: { verb: 'Lie down and watch the clouds', dir: 's', ms: 900, hold: true, pet: 'sleep', first: 'Lay in the grass and watched the clouds go over.', blanket: false,
    enter: { root: [[0.35, { y: 6, sy: 0.9 }, 'io'], [0.8, { r: -90, x: 34, y: -8 }, 'o'], [1, { r: -90, x: 34, y: -8 }]], armL: [[0.8, { r: 150 }, 'o'], [1, { r: 150 }]], armR: [[0.8, { r: -150 }, 'o'], [1, { r: -150 }]], legL: [[0.8, { r: 4 }], [1, { r: 4 }]], legR: [[0.8, { r: 10 }], [1, { r: 10 }]] },
    loop: { ms: 5000, root: [[0, { r: -90, x: 34, y: -8 }], [0.5, { r: -90, x: 34, y: -8.6, sx: 1.01 }, 'io'], [1, { r: -90, x: 34, y: -8 }, 'io']], armL: [[0, { r: 150 }], [1, { r: 150 }]], armR: [[0, { r: -150 }], [1, { r: -150 }]], legR: [[0, { r: 10 }], [0.5, { r: 18 }, 'io'], [1, { r: 10 }, 'io']], legL: [[0, { r: 4 }], [1, { r: 4 }]] } },
  nap: { verb: 'Have a nap', dir: 's', ms: 1100, hold: true, pet: 'sleep', first: 'Had a nap in the open air. Woke up with grass in my hair.', prop: 'zzz', nap: 6000,
    enter: { root: [[0.4, { y: 10 }, 'io'], [0.85, { r: -90, x: 34, y: -8 }, 'o'], [1, { r: -90, x: 34, y: -8 }]], armL: [[0.85, { r: 20 }], [1, { r: 20 }]], armR: [[0.85, { r: -170 }], [1, { r: -170 }]], head: [[0.85, { r: -10 }], [1, { r: -10 }]] },
    loop: { ms: 3600, root: [[0, { r: -90, x: 34, y: -8 }], [0.5, { r: -90, x: 34, y: -9, sx: 1.02 }, 'io'], [1, { r: -90, x: 34, y: -8 }, 'io']], armL: [[0, { r: 20 }], [1, { r: 20 }]], armR: [[0, { r: -170 }], [1, { r: -170 }]], head: [[0, { r: -10 }], [1, { r: -10 }]] } },
  ladder: { verb: 'Climb the ladder', dir: 'n', ms: 5600, prop: 'ladder', propBehind: true, propGround: true, first: 'Climbed up for a look over the rooftops.', sound: 'step',
    enter: { root: [[0, {}], [0.08, { y: -8 }, 'io'], ..._GA_K(6, (i) => [0.14 + i * 0.06, { y: -14 - i * 9 }, 'io']), [0.5, { y: -62 }, 'io'], [0.62, { y: -62 }], ..._GA_K(6, (i) => [0.66 + i * 0.05, { y: -54 + i * 9 }, 'io']), [1, {}]],
      armL: _GA_K(14, (i) => [i / 14, { r: i % 2 ? 150 : 172 }, 'io']).concat([[1, {}]]), armR: _GA_K(14, (i) => [i / 14, { r: i % 2 ? -172 : -150 }, 'io']).concat([[1, {}]]),
      legL: _GA_K(14, (i) => [i / 14, { sy: i % 2 ? 0.72 : 1 }, 'io']).concat([[1, {}]]), legR: _GA_K(14, (i) => [i / 14, { sy: i % 2 ? 1 : 0.72 }, 'io']).concat([[1, {}]]), head: [[0.5, { r: -6 }], [0.56, { r: 6 }, 'io'], [0.62, {}, 'io']] } },
  shake: { verb: 'Shake the tree', dir: 'n', ms: 1700, first: 'Shook a fruit tree. Something fell out.', sound: 'rustle', shake: true,
    enter: { up: _GA_K(8, (i) => [0.1 + i * 0.1, { r: i % 2 ? 4 : -4, x: i % 2 ? 1 : -1 }, 'io']).concat([[1, {}]]), armL: [[0.1, { r: 120 }, 'o'], [0.9, { r: 120 }], [1, {}]], armR: [[0.1, { r: -120 }, 'o'], [0.9, { r: -120 }], [1, {}]], root: _GA_K(8, (i) => [0.1 + i * 0.1, { x: i % 2 ? 1.4 : -1.4 }, 'l']).concat([[1, {}]]) } },
  bell: { verb: 'Ring the bell', dir: 'n', ms: 2200, first: 'Rang the bell. Half the vale looked up.', sound: 'bell', use: 'bell',
    enter: { armL: [[0.1, { r: 168 }, 'o'], [0.3, { r: 130 }, 'i'], [0.45, { r: 168 }, 'o'], [0.65, { r: 130 }, 'i'], [0.8, { r: 168 }, 'o'], [1, {}]], armR: [[0.1, { r: -168 }, 'o'], [0.3, { r: -130 }, 'i'], [0.45, { r: -168 }, 'o'], [0.65, { r: -130 }, 'i'], [0.8, { r: -168 }, 'o'], [1, {}]], root: [[0.3, { y: 3, sy: 0.94 }, 'i'], [0.45, { y: -2 }, 'o'], [0.65, { y: 3, sy: 0.94 }, 'i'], [0.8, { y: -2 }, 'o'], [1, {}]] } },
  pump: { verb: 'Work the pump and drink', dir: 'n', ms: 3000, first: 'Pumped cold water and drank it from my hands.', sound: 'splash', fx: { at: [0.3, 0.45, 0.6], kind: 'water', dy: -0.3, width: 18 },
    enter: { armR: [[0.08, { r: -165 }, 'o'], [0.2, { r: -105 }, 'io'], [0.32, { r: -165 }, 'io'], [0.44, { r: -105 }, 'io'], [0.56, { r: -165 }, 'io'], [0.66, { r: -30 }, 'io'], [1, {}]], up: [[0.2, { r: 6, y: 1 }, 'io'], [0.32, {}, 'io'], [0.44, { r: 6, y: 1 }, 'io'], [0.56, {}, 'io'], [0.7, { r: 14, y: 3 }, 'io'], [0.9, { r: 14, y: 3 }], [1, {}]], armL: [[0.66, {}], [0.72, { r: 70 }, 'o'], [0.9, { r: 70 }], [1, {}]], head: [[0.7, { y: 3 }, 'io'], [0.9, { y: 3 }], [1, {}]] } },
  wish: { verb: 'Throw a coin and make a wish', dir: 'n', ms: 2600, prop: 'coin', first: 'Threw a coin in the wishing well. It glowed.', sound: 'coin', use: 'wish', fx: { at: [0.55, 0.62, 0.7], kind: 'gold', dy: -0.4, width: 22 },
    enter: { armR: [[0.15, { r: -150 }, 'o'], [0.35, { r: -150 }], [0.45, { r: -40 }, 'b'], [0.7, { r: -20 }], [1, {}]], up: [[0.35, { r: -4 }], [0.45, { r: 6 }, 'o'], [0.7, {}], [1, {}]], head: [[0.45, { y: 2 }], [0.8, { y: 2 }], [1, {}]], armL: [[0.75, {}], [0.85, { r: 30 }, 'io'], [1, {}]] } },
  warm: { verb: 'Warm your hands', dir: 'n', ms: 600, hold: true, pet: 'sit', first: 'Warmed my hands at the fire.', prop: 'stick',
    enter: { armL: [[0.6, { r: 32, sy: 0.86 }, 'o'], [1, { r: 32, sy: 0.86 }]], armR: [[0.6, { r: -32, sy: 0.86 }, 'o'], [1, { r: -32, sy: 0.86 }]], up: [[0.6, { y: 1.5, sy: 0.97 }], [1, { y: 1.5, sy: 0.97 }]] },
    loop: { ms: 1600, armL: [[0, { r: 32, sy: 0.86 }], [0.5, { r: 38, sy: 0.86 }, 'io'], [1, { r: 32, sy: 0.86 }, 'io']], armR: [[0, { r: -32, sy: 0.86 }], [0.5, { r: -38, sy: 0.86 }, 'io'], [1, { r: -32, sy: 0.86 }, 'io']], up: [[0, { y: 1.5, sy: 0.97 }], [1, { y: 1.5, sy: 0.97 }]] } },
  lean: { verb: 'Lean on the wall and look out', dir: 'n', ms: 700, hold: true, pet: 'sit', first: 'Leaned on the wall and looked out over the vale.',
    enter: { up: [[0.6, { r: 0, y: 4, sy: 0.92 }, 'o'], [1, { y: 4, sy: 0.92 }]], armL: [[0.6, { r: 38, sy: 0.7 }, 'o'], [1, { r: 38, sy: 0.7 }]], armR: [[0.6, { r: -38, sy: 0.7 }, 'o'], [1, { r: -38, sy: 0.7 }]], legL: [[0.6, { r: -6 }], [1, { r: -6 }]] },
    loop: { ms: 6000, up: [[0, { y: 4, sy: 0.92 }], [1, { y: 4, sy: 0.92 }]], armL: [[0, { r: 38, sy: 0.7 }], [1, { r: 38, sy: 0.7 }]], armR: [[0, { r: -38, sy: 0.7 }], [1, { r: -38, sy: 0.7 }]], head: [[0, {}], [0.3, { r: 8 }, 'io'], [0.55, { r: 8 }], [0.7, { r: -6 }, 'io'], [0.9, {}, 'io'], [1, {}]], legL: [[0, { r: -6 }], [1, { r: -6 }]] } },
  read: { verb: 'Read it', dir: 's', ms: 600, hold: true, prop: 'letter', first: 'Read the notices. Someone has lost a hen.',
    enter: { armL: [[0.6, { r: -24, sy: 0.82 }, 'o'], [1, { r: -24, sy: 0.82 }]], armR: [[0.6, { r: 24, sy: 0.82 }, 'o'], [1, { r: 24, sy: 0.82 }]], head: [[0.6, { y: 1.5 }], [1, { y: 1.5 }]] },
    loop: { ms: 3000, head: [[0, { y: 1.5, r: -4 }], [0.5, { y: 1.5, r: 4 }, 'io'], [1, { y: 1.5, r: -4 }, 'io']], armL: [[0, { r: -24, sy: 0.82 }], [1, { r: -24, sy: 0.82 }]], armR: [[0, { r: 24, sy: 0.82 }], [1, { r: 24, sy: 0.82 }]] } },
  look: { verb: 'Look through the telescope', dir: 'n', ms: 600, hold: true, prop: 'scope', first: 'Looked through the telescope at the far hills.',
    enter: { armR: [[0.6, { r: -150 }, 'o'], [1, { r: -150 }]], armL: [[0.6, { r: 140 }, 'o'], [1, { r: 140 }]] },
    loop: { ms: 5000, root: [[0, {}], [0.5, { r: 3 }, 'io'], [1, {}, 'io']], armR: [[0, { r: -150 }], [1, { r: -150 }]], armL: [[0, { r: 140 }], [1, { r: 140 }]] } },
  feed: { verb: 'Feed the ducks', dir: 'n', ms: 2400, prop: 'crumbs', first: 'Fed the ducks. They came from all over.', sound: 'pat', fx: { at: [0.32, 0.62], kind: 'feed', dy: -1.4, width: 30 }, gather: true,
    enter: { armR: [[0.15, { r: -60 }, 'o'], [0.3, { r: -150 }, 'b'], [0.45, { r: -60 }, 'io'], [0.6, { r: -150 }, 'b'], [0.75, { r: -40 }, 'io'], [1, {}]], up: [[0.3, { r: 5 }], [0.45, {}], [0.6, { r: 5 }], [1, {}]] } },
  skim: { verb: 'Skim a stone', dir: 'n', ms: 2600, prop: 'stone', first: 'Skimmed a stone across still water.', skim: true,
    enter: { root: [[0.2, { y: 3, sy: 0.94 }, 'io'], [0.36, { x: 3 }, 'o'], [1, {}]], up: [[0.2, { r: -10 }, 'io'], [0.36, { r: 12 }, 'o'], [0.6, { r: 4 }], [1, {}]], armR: [[0.2, { r: 60 }, 'io'], [0.36, { r: -100 }, 'b'], [0.6, { r: -60 }], [1, {}]], head: [[0.4, { r: 4 }], [0.9, { r: -4 }, 'io'], [1, {}]] } },
  shower: { verb: 'Stand under the falls', dir: 's', ms: 3600, first: 'Stood under Fleet Falls and came out dripping.', sound: 'splash', fx: { every: 220, kind: 'water', dy: -1.9, width: 34 }, after: 'drips',
    enter: { up: [[0.1, { sy: 0.94, y: 2 }, 'o'], [0.85, { sy: 0.94, y: 2 }], [1, {}]], armL: [[0.15, { r: 150 }, 'o'], [0.8, { r: 150 }], [0.9, { r: 30 }, 'io'], [1, {}]], armR: [[0.15, { r: -150 }, 'o'], [0.8, { r: -150 }], [0.9, { r: -30 }, 'io'], [1, {}]], head: _GA_K(8, (i) => [0.15 + i * 0.09, { r: i % 2 ? 5 : -5 }, 'io']).concat([[1, {}]]) } },
  hide: { verb: 'Hide behind the tree', dir: 'n', ms: 600, hold: true, first: 'Hid behind a tree. Nobody found me.', hideBehind: true,
    enter: { root: [[0.6, { y: 6, sy: 0.84 }, 'o'], [1, { y: 6, sy: 0.84 }]], armL: [[0.6, { r: 40 }], [1, { r: 40 }]], armR: [[0.6, { r: -40 }], [1, { r: -40 }]] },
    loop: { ms: 4000, root: [[0, { y: 6, sy: 0.84 }], [0.35, { y: 6, sy: 0.84 }], [0.45, { y: 6, sy: 0.84, x: 9 }, 'io'], [0.6, { y: 6, sy: 0.84, x: 9 }], [0.7, { y: 6, sy: 0.84 }, 'io'], [1, { y: 6, sy: 0.84 }]], head: [[0.45, {}], [0.5, { r: 10 }, 'io'], [0.6, { r: 10 }], [0.66, {}, 'io']], armL: [[0, { r: 40 }], [1, { r: 40 }]], armR: [[0, { r: -40 }], [1, { r: -40 }]] } },
  climbtree: { verb: 'Climb up and sit on a branch', dir: 'n', ms: 2200, hold: true, first: 'Climbed a tree and sat on a branch, legs dangling.', perch: 26,
    enter: { root: _GA_K(6, (i) => [i / 7, { y: -i * 7 }, 'io']).concat([[0.86, { y: -44 }, 'io'], [1, { y: -30 }]]), armL: _GA_K(7, (i) => [i / 7, { r: i % 2 ? 150 : 170 }, 'io']).concat([[1, { r: 30 }]]), armR: _GA_K(7, (i) => [i / 7, { r: i % 2 ? -170 : -150 }, 'io']).concat([[1, { r: -30 }]]), legL: [[0.86, {}], [1, { sy: 0.55 }]], legR: [[0.86, {}], [1, { sy: 0.55 }]] },
    loop: { ms: 2600, root: [[0, { y: -30 }], [1, { y: -30 }]], armL: [[0, { r: 30 }], [1, { r: 30 }]], armR: [[0, { r: -30 }], [1, { r: -30 }]], legL: [[0, { sy: 0.55 }], [0.25, { sy: 0.5, r: 14 }, 'io'], [0.5, { sy: 0.55 }, 'io'], [1, { sy: 0.55 }]], legR: [[0, { sy: 0.55 }], [0.5, { sy: 0.55 }], [0.75, { sy: 0.5, r: -14 }, 'io'], [1, { sy: 0.55 }, 'io']] } },
  row: { verb: 'Take the oars', dir: 's', ms: 700, hold: true, prop: 'oars', first: 'Took the boat out on the water.', sound: 'splash', fx: { every: 1300, kind: 'water', dy: 0.2, width: 40 },
    enter: _GA_SIT,
    loop: { ms: 1300, root: [[0, { y: 14 }], [1, { y: 14 }]], legL: [[0, { sy: 0.52 }], [1, { sy: 0.52 }]], legR: [[0, { sy: 0.52 }], [1, { sy: 0.52 }]], up: [[0, { r: 0, y: 0 }], [0.45, { y: -3, sy: 1.02 }, 'io'], [1, { y: 0 }, 'io']], armL: [[0, { r: 70 }], [0.45, { r: 30 }, 'io'], [1, { r: 70 }, 'io']], armR: [[0, { r: -70 }], [0.45, { r: -30 }, 'io'], [1, { r: -70 }, 'io']] } },
  photo: { verb: 'Strike a pose for a photo', dir: 's', ms: 2600, first: 'Posed for a photo by the harbour.', sound: 'shutter', use: 'photo',
    enter: { armR: [[0.2, { r: -150 }, 'b'], [0.85, { r: -150 }], [1, {}]], armL: [[0.2, { r: 40 }, 'o'], [0.85, { r: 40 }], [1, {}]], root: [[0.2, { r: -4, y: 1 }, 'o'], [0.85, { r: -4, y: 1 }], [1, {}]], head: [[0.2, { r: 8 }, 'o'], [0.85, { r: 8 }], [1, {}]] } },
  laugh: { verb: 'Laugh', dir: 's', ms: 1500, first: '', enter: { up: _GA_K(8, (i) => [0.08 + i * 0.1, { y: i % 2 ? 1 : -1, r: i % 2 ? 3 : 1 }, 'io']).concat([[1, {}]]), head: [[0.1, { r: -8 }, 'o'], [0.8, { r: -8 }], [1, {}]], armL: [[0.1, { r: 30 }, 'o'], [0.8, { r: 30 }], [1, {}]], armR: [[0.1, { r: -50 }, 'o'], [0.8, { r: -50 }], [1, {}]] } },
});
/** The fixed things of the layout and what each offers. stand: where the feet go (cells from the foot's middle), deg: the way you face. */
const GARDEN_ACT_BY_PROP = Object.freeze({
  'ld-bench-a': [{ act: 'sit', name: 'the bench', stand: [0, 0.08], deg: 90, lift: 4 }],
  'ld-bench-b': [{ act: 'sit', name: 'the bench', stand: [0, 0.08], deg: 90, lift: 4 }],
  'ld-stump': [{ act: 'sit', name: 'the stump', stand: [0, 0.06], deg: 90, lift: 5 }],
  'ld-driftwood': [{ act: 'sit', name: 'the driftwood', stand: [0, 0.1], deg: 90, lift: 1 }],
  'ld-boles': [{ act: 'sit', name: 'the log', stand: [0, 0.1], deg: 90, lift: 2 }],
  'ld-pump': [{ act: 'pump', name: 'the pump', stand: [0, 0.5], deg: -90 }],
  'ld-wish': [{ act: 'wish', name: 'the wishing well', stand: [0, 0.5], deg: -90 }],
  'ld-chapel': [{ act: 'bell', name: 'the chapel bell', stand: [0, 0.6], deg: -90 }],
  'ld-lighthouse': [{ act: 'ladder', name: 'the lighthouse ladder', stand: [0.12, 0.1], deg: -90 }],
  'ld-treehouse': [{ act: 'ladder', name: 'the treehouse ladder', stand: [0, 0.4], deg: -90 }],
  'ld-barn': [{ act: 'ladder', name: 'the hay loft ladder', stand: [1.1, 0.4], deg: -90 }],
  pier: [{ act: 'dangle', name: 'the pier end', painted: true, pierEnd: true, stand: [0, -0.22], deg: 90, lift: -7 }],   // (the pier is painted with the coast, not a prop of its own)
  boat: [{ act: 'row', name: 'the boat', stand: [0.9, 0.2], deg: 180, boat: true }],   // the rowing boat you own (94-garden-fish-9world.js) takes you out
  'notice-board': [{ act: 'read', name: 'the notices', stand: [0, 0.6], deg: 90 }],
  'lake-board': [{ act: 'read', name: 'the board', stand: [0, 0.6], deg: 90 }],
  'ld-sign-c': [{ act: 'read', name: 'the sign', stand: [0, 0.6], deg: 90 }],
  'ld-mile': [{ act: 'read', name: 'the milestone', stand: [0, 0.6], deg: 90 }],
  'ld-orchard-wall': [{ act: 'lean', name: 'the wall', stand: [0, 0.35], deg: -90 }],
  'ld-folly': [{ act: 'look', name: 'the telescope', stand: [0, 0.6], deg: -90 }],
  'ld-beacon': [{ act: 'warm', name: 'the beacon fire', stand: [0, 0.7], deg: -90 }],
  smoker: [{ act: 'warm', name: 'the fire', stand: [0, 0.7], deg: -90 }],
  'ld-falls': [{ act: 'shower', name: 'the falls', stand: [0, 0.4], deg: 90 }],
  'reed-bank': [{ act: 'feed', name: 'the ducks', stand: [0, 0.6], deg: -90 }],
  'camera-tripod': [{ act: 'photo', name: 'the camera', stand: [0, 1.4], deg: 90 }],
});
/** Placed decorations, by their effect kind (gardenDecor(id).effect.kind). */
const GARDEN_ACT_BY_DECOR = Object.freeze({ sit: [{ act: 'sit', name: 'the seat', stand: [0, 0.06], deg: 90, lift: 4 }], wish: [{ act: 'wish', name: 'the well', stand: [0, 0.5], deg: -90 }] });
/** Trees, by which painter drew them (_gwPaintedTrunks). */
const GARDEN_ACT_BY_TREE = Object.freeze({
  orchard: [{ act: 'shake', name: 'the fruit tree', stand: [0, 0.32], deg: -90 }, { act: 'nap', name: 'under the tree', stand: [0.9, 0.45], deg: 90 }],
  wood: [{ act: 'climbtree', name: 'the tree', stand: [0, 0.3], deg: -90, big: 0.3 }, { act: 'hide', name: 'the tree', stand: [0, -0.5], deg: -90 }, { act: 'nap', name: 'under the tree', stand: [0.9, 0.45], deg: 90 }],
  village: [{ act: 'hide', name: 'the tree', stand: [0, -0.5], deg: -90 }, { act: 'nap', name: 'under the tree', stand: [0.9, 0.45], deg: 90 }],
  fells: [{ act: 'nap', name: 'under the tree', stand: [0.9, 0.45], deg: 90 }],
});
/** The water's edge: wherever water is within reach in front of you (feed and skim face it; skim only on still water). */
const GARDEN_ACT_WATER = Object.freeze([{ act: 'skim', name: 'still water' }, { act: 'feed', name: 'the ducks' }]);
/** Anywhere on open ground: these are on the moves wheel too. */
const GARDEN_ACT_GROUND = Object.freeze(['lie', 'nap', 'laugh']);
/** Not in the world yet. A painter places each (art: true once drawn) and it joins the prompts; cells are suggestions from the region plans. */
const GARDEN_ACT_SPOTS = Object.freeze([
  { id: 'rope-swing', act: 'swing', region: 'west-woods', near: 'ld-bridge', cell: [36, 34], art: false, note: 'a rope swing from an oak over the brook by the footbridge; swing, or let go and splash in' },
  { id: 'hammock', act: 'nap', region: 'orchard-headland', near: 'ld-treehouse', cell: [84, 47], art: false, note: 'a hammock slung between two orchard trees' },
  { id: 'campfire', act: 'warm', region: 'west-woods', near: 'ld-woodhut', cell: [15, 78], art: false, note: 'a ring of stones and a fire by Hollin\'s hut (marshmallows)' },
  { id: 'harbour-bell', act: 'bell', region: 'home-island', near: 'tackle-shop', cell: [50, 78], art: false, note: 'a ship\'s bell on a post at the head of the pier' },
  { id: 'telescope-quay', act: 'look', region: 'home-island', near: 'ld-lighthouse', cell: [60, 86], art: false, note: 'a coin telescope on the harbour wall, looking out to sea' },
  { id: 'busker', act: 'play', region: 'home-island', near: 'market-stall', cell: [52, 60], art: false, note: 'a busker\'s pitch with a fiddle and an open case; play, and a friend can dance' },
  { id: 'ball', act: 'kick', region: 'home-island', near: 'sundial', cell: [47, 52], art: false, note: 'a ball on the green' },
  { id: 'leaf-pile', act: 'kick', region: 'home-island', near: 'sundial', cell: [45, 53], art: false, note: 'an autumn leaf pile that bursts' },
  { id: 'grass-slope', act: 'roll', region: 'north-headland', near: 'ld-cairn', cell: [50, 12], art: false, note: 'a grassy slope to roll down (needs a height in the layout)' },
  { id: 'shallows-mere', act: 'paddle', region: 'home-island', near: 'reed-bank', cell: [40, 37], art: false, note: 'shallows to paddle and wade in, ripples round the legs (needs a depth in the water data)' },
  { id: 'swim-mere', act: 'swim', region: 'home-island', near: 'lake-hall', cell: [48, 36], art: false, note: 'deep enough to swim and float on your back (swimming needs the walker to allow water)' },
  { id: 'mast', act: 'ladder', region: 'home-island', near: 'ld-hull', cell: [42, 80], art: false, note: 'a boat\'s mast with rungs' },
  { id: 'hay-loft', act: 'ladder', region: 'east-mill', near: 'ld-barn', cell: [83, 66], art: false, note: 'a ladder drawn on the barn\'s side up to the loft door' },
  { id: 'fishing-bank', act: 'fishpair', region: 'home-island', near: 'reed-bank', cell: [41, 39], art: false, note: 'a grassy bank to sit and fish side by side, legs over' },
]);
