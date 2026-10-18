/* ============================================================
   SCENE LIBRARY: the open moor (the Peak, the Pennines, the North York Moors): a carpet of ling heather (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls inside this IIFE and nothing else; every build runs lazily, once per (variant, season), memoised by the core.

     plant.ling-heather   a low patch of ling heather (Calluna) as a real moor carpet: a dark mat of fine wiry sprigs, each with its short
                          side shoots, 30 to 45 cm high and up to 1.8 m across, never a ball. Summer: the first purple bells on a few sprigs
                          (the full bloom of August is the moor's own carpet, 79-world-4terrain _wtrMoorCols); autumn: bronze, the dead flower
                          spikes grey-brown; winter: dark russet-brown (snow is the terrain's, on snow days); spring: dark, with fresh green tips.
                          4 variants. Replaces the domed plant.moor-heather near the lens (18 Oct, Stanage: "giant cartoonish purple balls").
     bird.buzzard-flight  a common buzzard soaring (broad fingered wings in a shallow V, a slow flap): the moor's bird of prey, all year
   Lit from the LEFT.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;
  const SD = sceneDraw, f1 = SD.f1, ell = SD.ell;
  SD.define({
    id: 'plant.ling-heather', category: 'plant', size: [140, 32], variants: 4, seasonal: true, shapeBySeason: true, flippable: true,
    palette: Object.assign({ base: { stem: ['#3a2e24', '#4a3a2c'] } }, SD.seasons({
      leaf: { spring: ['#4f5636', '#3d4229', '#6f7a45'], summer: ['#4c5534', '#3a4128', '#62703f'], autumn: ['#6a5136', '#523e2a', '#86683f'], winter: ['#57402f', '#413024', '#6e5038'] },
      flower: { spring: ['#6a5a48', '#7a6a58'], summer: ['#a35fa1', '#c487c0'], autumn: ['#7e6a64', '#968078'], winter: ['#6a5848', '#7a6858'] },
    })),
    parts: ['body', 'flowers'], anim: { sway: { part: 'body', pivot: [0, 0], deg: 0.8 } },
    tags: ['uk', 'peak', 'moor', 'heather', 'ling', 'kit:temperate', 'role:ground'],
    credit: 'native: ling heather (Calluna vulgaris), a moorland carpet',
    build(v, r, ctx) {
      const s = ctx.season, W = 54 + v * 6, body = [], flowers = [];
      // the shade under the shoots: a low ragged band (top and foot both broken), never a slab with a ruled edge
      const top = [], foot = [];
      for (let i = 0; i <= 18; i++) { const t = i / 18, x = -W + 2 * W * t, env = Math.pow(Math.sin(Math.PI * t), 0.6); top.push([x, -(2 + 6 * env + (r() - 0.5) * 4 * env)]); foot.push([x, 1.5 - r() * 2.5 * env]); }
      body.push({ f: '@leaf.1', d: 'M' + top.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'L' + foot.slice().reverse().map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'z', op: 0.9 });
      // the sprigs: a thin wiry stem, the tiny scale leaves as short dashes along its upper part (the fine texture of a heather carpet)
      const stems = '', dash = ['', '', ''], tips = [];
      let st = stems;
      const n = 74 + v * 10;
      for (let i = 0; i < n; i++) {
        const t = r(), x = -W + 2 * W * t, env = Math.pow(Math.sin(Math.PI * t), 0.5), h = (7 + r() * 14) * (0.4 + 0.6 * env), lean = (r() - 0.5) * 5 + (t - 0.5) * 4, y0 = -1 - r() * 3;
        const ex = x + lean, ey = y0 - h;
        st += `M${f1(x)} ${f1(y0)}Q${f1(x + lean * 0.25)} ${f1(y0 - h * 0.55)} ${f1(ex)} ${f1(ey)}`;
        const k = r() < 0.34 ? 2 : r() < 0.5 ? 0 : 1, nd = 7 + Math.floor(r() * 5);
        for (let j = 0; j < nd; j++) {
          const u = 0.25 + 0.75 * (j + r() * 0.8) / nd, bx = x + lean * u * u + (r() - 0.5) * 1.2, by = y0 - h * u, side = r() < 0.5 ? -1 : 1, L = 0.9 + r() * 1.3, an = 0.25 + r() * 1.1;
          dash[j > nd - 3 ? Math.max(k, 1) : k] += `M${f1(bx)} ${f1(by)}l${f1(side * L * Math.sin(an))} ${f1(-L * Math.cos(an))}`;
        }
        tips.push([ex, ey, x]);
      }
      body.push({ s: '@stem.0', w: 0.6, d: st, op: 0.9 }, { s: '@leaf.1', w: 1.1, d: dash[0] }, { s: '@leaf.0', w: 1.0, d: dash[1] }, { s: '@leaf.2', w: 0.9, d: dash[2], op: 0.9 });
      if (s === 'spring') { let d = ''; for (const [ex, ey] of tips) if (r() < 0.45) d += ell(ex, ey + 0.8, 1.1, 0.8); body.push({ f: '#7f9a4a', d, op: 0.8 }); }
      // the flowers: spikes of tiny bells on a few sprigs in summer (the start of the bloom), grey-brown dead spikes after
      if (s !== 'spring') {
        const share = s === 'summer' ? 0.14 : s === 'autumn' ? 0.35 : 0.2;
        let d0 = '', d1 = '';
        for (const [ex, ey, x] of tips) {
          if (r() > share) continue;
          const dx = (ex - x) / 16;
          for (let j = 0; j < 3; j++) { const yy = ey + 0.8 + j * 1.1, xx = ex - dx * j * 1.1 + (r() - 0.5) * 0.9; if (j % 2) d1 += ell(xx, yy, 0.5, 0.6); else d0 += ell(xx, yy, 0.55, 0.65); }
        }
        flowers.push({ f: '@flower.0', d: d0 }, { f: '@flower.1', d: d1, op: 0.9 });
      }
      return { body, flowers };
    },
  });

  /* bird.buzzard-flight: a common buzzard soaring over the edge and the valley (resident all year): broad wings held in a shallow V with fingered
     tips, a short fanned tail, pale bands under the wings; a slow lazy flap. v0 dark, v1 a paler bird. */
  SD.define({
    id: 'bird.buzzard-flight', category: 'bird', size: [64, 18], variants: 2, seasonal: false, flippable: true, parts: ['body', 'wings'],
    palette: { base: { bird: ['#4a3a2c', '#6a5440'], light: ['#b8a68a', '#d2c3a6'], dark: ['#2a221c'] } },
    anim: { flap: { part: 'wings', pivot: [0, -2], sy: [-0.35, 0.5], period: 1.6 } },
    tags: ['uk', 'sky', 'raptor', 'buzzard', 'flight', 'moor', 'kit:birds', 'kit:temperate', 'role:bird'],
    credit: 'native: common buzzard soaring',
    build(v) {
      const c = v ? 1 : 0;
      const wing = (sg) => `M0 -2C${10 * sg} -5 ${20 * sg} -8 ${27 * sg} -9l${2 * sg} -1l${1 * sg} 1.6l${1.6 * sg} -0.6l${0.4 * sg} 1.8l${1.2 * sg} 0.2l${-2 * sg} 2.6C${22 * sg} -5 ${12 * sg} -1 0 1z`;
      return {
        body: [['@bird.' + c, 'M-9 -1q4 -3 12 -2.6l4 1.2-4 1.6q-7 1.6-12 -0.2z'], ['@bird.' + c, 'M-9 -1l-5 -2.4 0.6 4.6z'], ['@light.' + c, 'M-6 0.6q5 1.4 10 0-5 1-10 0z', 0.7]],
        wings: [['@bird.' + c, wing(1)], ['@bird.' + c, wing(-1)], ['@light.' + c, 'M3 -2.4C10 -4.4 17 -6.6 22 -7.4 17 -5.4 10 -3.2 3 -1.6z', 0.55], ['@light.' + c, 'M-3 -2.4C-10 -4.4 -17 -6.6 -22 -7.4 -17 -5.4 -10 -3.2 -3 -1.6z', 0.55]],
      };
    },
  });
})();
