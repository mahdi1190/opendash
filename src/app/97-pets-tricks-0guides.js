/* Four observations for a requested walk. Travel and height remain real world
 * motion; these clips describe attention without moving authoritative feet. */
_pcR('guide-owl', 3600, 'sit', {
  only: { ids: ['owl'] }, face: { eyes: 'open', mouth: 'smile' },
  head: [[.1, { r: -15 }, 'io'], [.27, { r: -19 }, 'io'], [.39, { r: 17 }, 'io'], [.57, { r: 20 }, 'io'], [.7, { r: -6 }, 'io'], [.83, { r: 9 }, 'io'], [.96, {}]],
  body: _pcHold(.16, .78, { sy: 1.035, y: -1 }, .13),
  wingN: [[.06, {}, 'io'], [.19, { r: -18 }, 'io'], [.36, { r: -10 }, 'io'], [.52, { r: -17 }, 'io'], [.72, { r: -6 }, 'io'], [.9, {}]],
  wingB: _pcHold(.2, .64, { r: 8 }, .14), eyes: _pcBlink(.31, .75),
});
_pcR('guide-otter', 3500, 'walk', {
  only: { ids: ['otter'] }, face: { eyes: 'open', mouth: 'calm' },
  body: [[.1, { r: 9, sy: .94, sx: 1.04 }, 'io'], [.27, { r: 13, y: 2 }, 'io'], [.47, { r: 8, y: 1 }, 'io'], [.64, { r: -5, sy: 1.04, y: -2 }, 'io'], [.83, { r: -3 }, 'io'], [1, {}]],
  head: [[.12, { r: 14, y: 2 }, 'io'], [.29, { r: 21, y: 3 }, 'io'], [.4, { r: 11 }, 'io'], [.53, { r: 20, y: 2 }, 'io'], [.7, { r: -15 }, 'io'], [.88, { r: -5 }, 'io'], [1, {}]],
  paw: _pcHold(.2, .54, { r: -27, y: -1 }, .15), legsF: _pcHold(.2, .54, { r: -18 }, .15), tail: _pcSw(.12, .86, 4, { r: 13 }, { r: -6 }), ears: _pcSw(.1, .85, 3, { r: -5 }, { r: 6 }),
});
_pcR('guide-fox', 3300, 'walk', {
  only: { ids: ['fox'] }, face: { eyes: 'open', mouth: 'calm' },
  body: _pcHold(.12, .61, { r: 5, sy: .94, sx: 1.035, y: 1 }, .12),
  head: [[.1, { r: 15, y: 2 }, 'io'], [.22, { r: 22, y: 3 }, 'io'], [.28, { r: 18, y: 2 }, 'io'], [.34, { r: 23, y: 3 }, 'io'], [.43, { r: 17, y: 2 }, 'io'], [.55, { r: 23, y: 3 }, 'io'], [.68, { r: -18, y: -2 }, 'io'], [.85, { r: -10 }, 'io'], [1, {}]],
  ears: [[.08, { r: -8 }, 'io'], [.31, { r: 5 }, 'io'], [.5, { r: -9 }, 'io'], [.7, { r: -17 }, 'o'], [.94, {}]],
  tail: [[.12, { r: -5 }, 'io'], [.56, { r: -8 }, 'io'], [.7, { r: 20 }, 'io'], [.86, { r: 12 }, 'io'], [1, {}]], paw: _pcHold(.17, .5, { r: -9 }, .12),
});
_pcR('guide-rabbit', 3500, 'sit', {
  only: { ids: ['rabbit'] }, face: { eyes: 'open', mouth: 'smile' },
  body: [[.1, { sy: 1.04, sx: .98, y: -1 }, 'io'], [.29, { sy: 1.06, y: -2 }, 'io'], [.51, { sy: 1.04, y: -1 }, 'io'], [.69, { sy: .96, sx: 1.025 }, 'io'], [.86, { sy: 1.02 }, 'io'], [1, {}]],
  head: [[.1, { r: -7 }, 'io'], [.26, { r: 11 }, 'io'], [.43, { r: -12 }, 'io'], [.58, { r: 7 }, 'io'], [.76, { r: -5 }, 'io'], [1, {}]],
  ears: [[.08, { r: -19, sy: 1.04 }, 'io'], [.24, { r: 11 }, 'io'], [.42, { r: -14 }, 'io'], [.6, { r: 8 }, 'io'], [.77, { r: -9 }, 'io'], [.96, {}]],
  paw: _pcHold(.16, .58, { r: -18, y: -1 }, .12), eyes: _pcBlink(.35, .81),
});
