/* ============================================================
   SCENE LIBRARY: Texas longhorns, facing right, feet at the origin.
   Adapted from the Fort Worth Stockyards cattle-drive drawing.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const R = Math.round;
  const ell = (x, y, rx, ry) => `M${x - rx} ${y}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0`;
  sceneObjDefine({
    id: 'animal.texas-longhorn', category: 'animal', size: [280, 140], variants: 3,
    seasonal: false, flippable: true,
    parts: ['legsFar', 'tail', 'body', 'legsNear', 'head'],
    palette: { base: {
      coat: ['#8d5942', '#744a3d', '#e2c5a1'], patch: ['#ebcca6', '#e9d0ad', '#844d38'],
      far: '#49312e', hoof: '#29272c', tail: '#35282c', muzzle: '#392d31',
      hornD: '#69493d', horn: '#f6dfb5', highlight: '#f5d8b3', eye: '#242631',
    } },
    night: { glow: { rim: '#9c9584' }, on: .6 },
    anim: {
      walk: { parts: ['legsNear', 'legsFar'], pivot: [0, -45], deg: 7, period: 1.45, bob: 1.3 },
      sway: { part: 'tail', pivot: [-86, -63], deg: 7 },
      bob: { part: 'body', dy: 1.3, period: 1.45 },
      turn: { part: 'head', pivot: [77, -69], deg: 3, period: 8.5, hold: .72 },
    },
    shadow: { rx: 111, ry: 11, h: 110 },
    tags: ['texas', 'fort-worth', 'stockyards', 'longhorn', 'cattle', 'cattle-drive', 'kit:animals', 'role:animal'],
    credit: 'Fort Worth Stockyards opening: individual Texas longhorns',
    build(v, rnd) {
      const hip = R(26 + rnd() * 5), headY = R(-75 - rnd() * 5), span = R(48 + rnd() * 13);
      const coat = `@coat.${v}`, patch = `@patch.${v}`;
      const leg = (x, far) => [
        [far ? '@far' : coat, `M${x - 5} -57q5 7 8 18l-2 27 5 9h-13l-1-9-3-27z`],
        ['@hoof', `M${x - 3} -10h9l3 7H${x - 4}z`],
      ];
      const parts = {
        legsFar: [...leg(-61, true), ...leg(51, true)],
        tail: [
          { s: coat, w: 4, cap: 'round', d: 'M-86 -66q-20 8-18 32t-7 15' },
          ['@tail', 'M-111 -23q-8 5-5 14q9-2 9-11z'],
        ],
        body: [
          [coat, `M-90 -66Q-94 -93 -63 -99Q-36 -104 ${hip} -99Q59 -100 76 -85L93 -75L92 -52Q77 -44 58 -43Q8 -34-45 -44Q-69 -41-83 -50z`],
          [patch, 'M-68 -95q20 -8 36 -4l-5 15 14 13-12 17-23-3-7-19zM12 -97q20 -2 34 5l-6 16-13 6-18-10z', .88],
          ['@highlight', 'M-78 -91q57-15 127 3l8 5q-65-12-135 2z', .22],
          { f: '@highlight', op: .62, glow: 'rim', d: `M-88 -80Q-92 -95 -63 -99Q-36 -104 ${hip} -99Q59 -100 76 -85l-.8 1.2Q59 -98.6 ${hip} -97.8Q-36 -102.8 -63 -97.8Q-90.7 -93.8 -86.8 -80z` },
        ],
        legsNear: [...leg(-49, false), ...leg(62, false)],
        head: [
          [coat, 'M71 -86q8-12 18-14l18 10 9 22-5 18-13 5-16-12-6-15z'],
          [patch, 'M87 -96l12 6 3 29-9 6-6-18z'],
          ['@muzzle', 'M97 -55l15-1-3 9-9 2z'],
          [coat, 'M88 -92l-19-6 4 10 13 4zM102 -92l17-7-3 12-11 2z'],
          { s: '@hornD', w: 7, cap: 'round', d: `M89 ${headY}q-${span} -1-${span + 20} -26M103 ${headY - 1}q${span - 16} -9 ${span - 9} -36` },
          { s: '@horn', w: 4.5, cap: 'round', d: `M88 ${headY - 2}q-${span} -1-${span + 20} -26M104 ${headY - 3}q${span - 16} -9 ${span - 9} -36` },
          { f: '@highlight', op: .72, glow: 'rim', d: `M88 ${headY - 4}Q${88 - span} ${headY - 5} ${68 - span} ${headY - 30}l-.8 1Q${87.4 - span} ${headY - 4} 88 ${headY - 3}zM104 ${headY - 5}Q${88 + span} ${headY - 14} ${95 + span} ${headY - 41}l1 .7Q${88.5 + span} ${headY - 13} 104 ${headY - 3.9}z` },
          ['@eye', ell(105, -76, 1.7, 1.7)],
        ],
      };
      // The source hoof bottoms sit at -3: translate the complete animal to
      // make the object anchor coincide with the pavement and its cast shadow.
      for (const name of Object.keys(parts)) parts[name] = parts[name].map(sh => Array.isArray(sh)
        ? { f: sh[0], d: sh[1], op: sh[2], m: [1, 0, 0, 1, 0, 3] }
        : Object.assign({}, sh, { m: [1, 0, 0, 1, 0, 3] }));
      return parts;
    },
  });
})();
