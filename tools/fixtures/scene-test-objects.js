/* ============================================================
   PLACEHOLDER OBJECTS for the renderer tests and the perf scene (builder B, test-only).
   Ten small objects in the section 2.2 form, one per kind of thing the renderers must draw:
   a swaying tree (3 variants, four seasons, shadow, reflection), ground cover for wind strips, a
   lit building (glow windows + a 'lit' part), a walker (walk legs), a paddling duck, a flapping
   gull, a car with lamps, a stone, a flickering street lamp. The library builder supplies the
   real objects (src/app/70-scene-lib-*.js); these ids all end in -test so they never clash.
   Classic script, loaded after the core (or tests/fixtures/scene-core-shim.js).
   ============================================================ */
(function () {
  const C = sceneD.circ, E = sceneD.ell, Rc = sceneD.rect;
  const seasons = (leaf) => ({ spring: { leaf: leaf[0] }, summer: { leaf: leaf[1] }, autumn: { leaf: leaf[2] }, winter: { leaf: leaf[3] } });
  sceneObjDefine({
    id: 'tree.oak-test', category: 'tree', size: [200, 300], variants: 3, seasonal: true, flippable: true,
    palette: Object.assign({ base: { bark: ['#5a4632', '#3e3022'] } }, seasons([['#5f8a3a', '#86b04a', '#b6d66a'], ['#2f5a2a', '#4a7a34', '#79a04a'], ['#8a4a1e', '#c0702a', '#e0a040'], ['#5a5a4a', '#6a6a5a', '#7a7a6a']])),
    parts: ['trunk', 'crown'], anim: { sway: { part: 'crown', pivot: [0, -120], deg: 2.2 } }, shadow: { rx: 80, ry: 10, h: 300 }, reflect: true,
    tags: ['test', 'kit:temperate', 'role:tree'],
    build(v, rnd) {
      const crown = [];
      for (let i = 0; i < 14 + v * 4; i++) { const a = rnd() * Math.PI * 2, r = rnd() * 70; crown.push(['@leaf.' + (i % 3), E(Math.round(Math.cos(a) * r), Math.round(-190 + Math.sin(a) * r * 0.8), 30 + Math.round(rnd() * 26), 24 + Math.round(rnd() * 18))]); }
      return { trunk: [['@bark.0', 'M-10 0L-7-140H7L10 0z'], ['@bark.1', 'M2 0L4-140H7L10 0z', 0.7]], crown };
    },
  });
  sceneObjDefine({
    id: 'plant.grass-test', category: 'plant', size: [40, 30], variants: 2, seasonal: true, flippable: true,
    palette: seasons([['#6f9f40', '#a6c95e'], ['#5f8f3a', '#8db352'], ['#8a8a45', '#b5a65c'], ['#8d9277', '#b3b59c']]),
    tags: ['test', 'kit:temperate', 'role:ground'],
    build(v, rnd) { const out = []; for (let i = 0; i < 5 + v; i++) { const x = Math.round(rnd() * 30 - 15), h = 14 + Math.round(rnd() * 16); out.push(['@leaf.' + (i % 2), `M${x - 3} 0Q${x} ${-h / 2} ${x + 2} ${-h}Q${x + 2} ${-h / 2} ${x + 3} 0z`]); } return { body: out }; },
  });
  sceneObjDefine({
    id: 'plant.bush-test', category: 'plant', size: [70, 44], variants: 2, seasonal: true, flippable: true,
    palette: seasons([['#4c7a37', '#79aa45'], ['#3f6b31', '#5f8f3a'], ['#7a5a2a', '#a07a3a'], ['#5a5a48', '#6e6e5c']]),
    tags: ['test', 'kit:temperate', 'role:ground'],
    build(v) { return { body: [['@leaf.0', E(0, -18, 34, 20)], ['@leaf.1', E(-10 + v * 6, -26, 18, 12)]] }; },
  });
  sceneObjDefine({
    id: 'building.house-test', category: 'building', size: [220, 180], variants: 2, seasonal: false, flippable: false,
    palette: { base: { wall: ['#c8b08a', '#b49a74'], roof: ['#6a4636'], glass: ['#33414c'] } }, night: { glow: { window: '#ffd98a' }, on: 0.7 },
    parts: ['body', 'lit'], shadow: { rx: 110, ry: 12, h: 160 }, reflect: true,
    tags: ['test', 'kit:urban', 'role:building-mid'],
    build(v) {
      const body = [['@wall.' + v, Rc(-100, -120, 200, 120)], ['@roof.0', 'M-110-118L0-180L110-118z']];
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) body.push({ f: '@glass.0', d: Rc(-80 + c * 44, -100 + r * 50, 22, 28), glow: 'window' });
      return { body, lit: [{ f: '#ffd98a', d: E(0, -60, 120, 70), op: 0.12 }] };
    },
  });
  sceneObjDefine({
    id: 'person.walker-test', category: 'person', size: [20, 56], variants: 2, seasonal: true, flippable: true,
    palette: { base: { skin: ['#c99a7a'], leg: ['#2c3440'] }, spring: { coat: ['#6a7a8a', '#8a5a4a'] }, summer: { coat: ['#d8d0c0', '#5a8aa0'] }, autumn: { coat: ['#7a5a3a', '#4a5a3a'] }, winter: { coat: ['#2a3040', '#5a2a2a'] } },
    parts: ['legA', 'legB', 'body'], anim: { walk: { parts: ['legA', 'legB'], pivot: [0, -24], deg: 22 } }, shadow: { rx: 9, ry: 3, h: 56 },
    tags: ['test', 'silhouette', 'kit:people', 'role:walker'],
    build(v) { return { legA: [['@leg.0', 'M-4-24h5v24h-5z']], legB: [['@leg.0', 'M0-24h5v24h-5z']], body: [['@coat.' + v, 'M-7-48h14l2 26h-18z'], ['@skin.0', C(0, -52, 5)]] }; },
  });
  sceneObjDefine({
    id: 'bird.duck-test', category: 'bird', size: [40, 22], variants: 1, seasonal: false, flippable: true,
    palette: { base: { body: ['#6a5a4a', '#2a6a4a'], bill: ['#e0a030'] } }, anim: { paddle: { dy: 1.5, deg: 3 } }, reflect: true,
    tags: ['test', 'kit:birds', 'role:bird'],
    build() { return { body: [['@body.0', E(0, -7, 18, 7)], ['@body.1', C(13, -16, 6)], ['@bill.0', 'M18-16l8 2-8 2z']] }; },
  });
  sceneObjDefine({
    id: 'bird.gull-test', category: 'bird', size: [44, 14], variants: 1, seasonal: false, flippable: true,
    palette: { base: { wing: ['#f4f4f0', '#9aa4ac'] } }, parts: ['wings', 'body'], anim: { flap: { part: 'wings', pivot: [0, -6], sy: [-0.6, 1], period: 0.5 } },
    tags: ['test', 'kit:birds', 'role:bird'],
    build() { return { wings: [['@wing.0', 'M-22-12Q-10-20 0-6Q10-20 22-12Q10-10 0-3Q-10-10-22-12z']], body: [['@wing.1', E(0, -6, 6, 3)]] }; },
  });
  sceneObjDefine({
    id: 'vehicle.car-test', category: 'vehicle', size: [90, 34], variants: 3, seasonal: false, flippable: true,
    palette: { base: { paint: ['#a83a32', '#2a5a8a', '#e8e4dc'], dark: ['#1e2328'], lamp: ['#d8d4c8'] } }, night: { glow: { lamp: '#fff2c0', window: '#ffd98a' }, on: 1 },
    shadow: { rx: 44, ry: 5, h: 30 },
    tags: ['test', 'kit:vehicles', 'role:vehicle'],
    build(v) { return { body: [['@paint.' + v, 'M-44-8V-18L-30-20L-18-32H16L30-20L44-18V-8z'], ['@dark.0', C(-26, -6, 7) + C(26, -6, 7)], { f: '@lamp.0', d: Rc(38, -17, 6, 4), glow: 'lamp' }, { f: '@dark.0', d: 'M-14-30H12L22-21H-24z', glow: 'window' }, { f: '@lamp.0', d: Rc(-44, -17, 4, 4), glow: 'lamp' }, { f: '@lamp.0', d: Rc(-40, -12, 3, 3), glow: 'lamp' }] }; },
  });
  sceneObjDefine({
    id: 'rock.stone-test', category: 'rock', size: [50, 24], variants: 2, seasonal: false, flippable: true,
    palette: { base: { stone: ['#8a8680', '#6a665e', '#a8a49c'] } },
    tags: ['test', 'kit:temperate', 'role:ground'],
    build(v) { return { body: [['@stone.1', 'M-24 0Q-22-20 0-24Q20-22 25 0z'], ['@stone.2', 'M-14-6Q-10-18 2-20Q-4-12-14-6z', 0.7], ['@stone.0', E(6 + v * 3, -2, 12, 2), 0.5]] }; },
  });
  sceneObjDefine({
    id: 'street.lamp-test', category: 'street', size: [20, 120], variants: 1, seasonal: false, flippable: false,
    palette: { base: { iron: ['#2a2e33'], glass: ['#d8dcd0'] } }, night: { glow: { lamp: '#ffe2a0' }, on: 1 },
    parts: ['post', 'head'], anim: { flicker: { part: 'head', op: [0.85, 1], period: 3 } }, shadow: { rx: 6, ry: 2, h: 120 },
    tags: ['test', 'kit:urban', 'role:street'],
    build() { return { post: [['@iron.0', 'M-2 0V-110H2V0z']], head: [['@iron.0', 'M-7-110H7L5-122H-5z'], { f: '@glass.0', d: Rc(-4, -120, 8, 8), glow: 'lamp' }] }; },
  });
})();
