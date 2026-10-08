/* ============================================================
   SCENE LIBRARY: landmark.maiden-tower (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Refined from the stone tower and the old walls in the hand-drawn baku-skyline art
   (`scene upgrade asia-west/baku-skyline --box 250,420,390,672 --dry-run`: 19 shapes, a reference):
   - the real structure: the Maiden Tower of Baku's walled old city, a tall round tower of pale
     limestone with the long buttress that projects from its east side (seen in profile on the
     right), horizontal courses of stone, a few narrow slit windows, a low parapet round its flat
     top (no roof); in front, a stretch of the old city wall with its merlons and two round
     bastions
   - one light direction: the drum lit on the left, rounding into shade on the right
   - night: the warm floodlighting on the tower and the walls, the uplights at their foot (the
     'lit' part); the slits and the gate glowing (glow)
   No text, no flags, no emblems. Anchor: the foot of the wall at the middle of the front.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const TX0 = -50, TX1 = 46, TOP = 186, BX = 72;              // the drum, its top, the buttress's outer face
  const merlons = (x0, x1, y, w, gap, h) => { let d = ''; for (let x = x0; x + w <= x1 + 0.1; x += w + gap) d += rect(x, y - h, w, h); return d; };
  define({
    id: 'landmark.maiden-tower', category: 'landmark', size: [340, 196], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      stone: ['#ece0c8', '#d6c4a2', '#b8a27e', '#8e7a5c'], joint: '#7e6c52', wall: ['#d2bf9c', '#b29e7a', '#8a7758'],
      dark: '#4a3e30', warm: '#ffcf8a', glowW: '#fff0d0',
    } },
    night: { glow: { window: '#ffcf86' }, on: 0.8 },
    shadow: { rx: 170, ry: 5, h: 40 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:baku', 'asia', 'asia-west', 'historic'],
    credit: 'native (scene engine upgrade), after the hand-drawn baku-skyline art',
    build(v, r) {
      const body = [], lit = [];
      // the drum: lit left, shaded right (two faces for the small still), and the buttress in profile
      body.push({ f: { lin: [[0, '@stone.1'], [0.3, '@stone.0'], [0.75, '@stone.2'], [1, '@stone.3']], x1: TX0, y1: 0, x2: TX1, y2: 0 }, d: rect(TX0, -TOP, TX1 - TX0, TOP) });
      body.push({ f: { lin: [[0, '@stone.2'], [1, '@stone.3']], x1: TX1, y1: 0, x2: BX, y2: 0 }, d: poly([[TX1, 0], [TX1, -TOP + 8], [BX - 6, -TOP + 14], [BX, -TOP + 22], [BX + 4, 0]]) });
      // the courses of stone on the drum: bands of slightly different tone, each with its joints
      for (let i = 0; i < 12; i++) {
        const y0 = -6 - i * 15, h = 15;
        body.push({ f: { lin: [[0, '@stone.0', 0.0], [0.35, '@stone.0', 0.35], [1, '@stone.3', 0.25]], x1: TX0, y1: 0, x2: TX1, y2: 0 }, d: rect(TX0, y0 - h + 1, TX1 - TX0, h - 2), op: i % 2 ? 0.6 : 0.35, detail: true });
        let j = `M${TX0} ${y0}H${TX1}`;
        for (let x = TX0 + 4 + (i % 2) * 6; x < TX1 - 2; x += 11 + ((x * 7 + i) % 5)) j += `M${f1(x)} ${y0}v${-h}`;
        body.push({ s: '@joint', w: 0.6, op: 0.45, d: j, detail: true });
      }
      // the buttress's own courses, and its sunlit edge
      let bc = ''; for (let y = -10; y > -TOP + 18; y -= 12) bc += `M${TX1} ${y}L${f1(BX + 4 - (-y) * 4 / (TOP - 22))} ${y}`;
      body.push({ s: '@joint', w: 0.7, op: 0.5, d: bc, detail: true }, { s: '@stone.1', w: 1.2, op: 0.8, d: `M${TX1 + 1} 0V${-TOP + 9}` });
      // weathering: a few faint vertical streaks down the drum
      for (const [x, a, b] of [[-38, 30, 120], [-22, 60, 170], [-4, 20, 90], [14, 70, 150], [30, 40, 110]]) body.push({ s: '@stone.3', w: 2, op: 0.12, d: `M${x} ${-a}V${-b}`, detail: true });
      // the parapet round the flat top, its shadow line and the merlon-like stones of the rim
      body.push(['@stone.1', rect(TX0 - 3, -TOP - 8, TX1 - TX0 + 6, 8)], ['@stone.3', rect(TX0 - 3, -TOP - 1, TX1 - TX0 + 6, 2), 0.6]);
      body.push({ f: '@stone.2', d: merlons(TX0 - 3, TX1 + 3, -TOP - 8, 7, 4, 4) });
      // the slit windows, the doorway at the foot
      for (const [x, y] of [[-30, 60], [-12, 104], [6, 146], [-26, 150], [20, 82], [-6, 40], [30, 124]]) body.push({ f: '@dark', d: rect(x, -y - 9, 2.6, 9), glow: 'window' });
      // the old city wall in front: two runs with merlons, a walkway shadow, the courses
      for (const [a, b] of [[-170, -78], [-40, 170]]) {
        body.push({ f: { lin: [[0, '@wall.0'], [1, '@wall.1']], x1: 0, y1: -46, x2: 0, y2: 0 }, d: rect(a, -40, b - a, 40) });
        body.push({ f: '@wall.0', d: merlons(a + 2, b - 2, -40, 8, 6, 8) }, ['@wall.2', rect(a, -34, b - a, 2.5), 0.5]);
        let c = ''; for (let y = -8; y > -32; y -= 8) c += `M${a} ${y}H${b}`;
        body.push({ s: '@joint', w: 0.6, op: 0.4, d: c, detail: true });
      }
      // a gate in the wall below the tower: the dark arch in its stone surround (glows at night)
      body.push({ f: '@dark', d: 'M4 0V-20Q4 -28 12 -28Q20 -28 20 -20V0Z', glow: 'window' }, ['@stone.0', 'M1 0V-20Q1 -31 12 -31Q23 -31 23 -20V0H20V-20Q20 -28 12 -28Q4 -28 4 -20V0Z', 0.9]);
      // the bastions: round towers in the wall, lit left, shaded right, with their merlons and slits
      for (const [x, w, h] of [[-96, 20, 58], [-48, 16, 52], [120, 22, 62]]) {
        body.push({ f: { lin: [[0, '@wall.0'], [0.4, '@stone.0'], [1, '@wall.2']], x1: x - w, y1: 0, x2: x + w, y2: 0 }, d: rect(x - w, -h, 2 * w, h) });
        body.push({ f: '@wall.0', d: merlons(x - w, x + w, -h, 6, 4.5, 7) }, ['@wall.2', rect(x - w, -h + 4, 2 * w, 2), 0.5]);
        let c = ''; for (let y = -9; y > -h + 6; y -= 9) c += `M${x - w} ${y}H${x + w}`;
        body.push({ s: '@joint', w: 0.6, op: 0.35, d: c, detail: true }, { f: '@dark', d: rect(x - 1.2, -h + 16, 2.4, 8), glow: 'window' });
      }
      // night: warm floodlight on the drum (strongest at the foot), on the buttress, on the walls and bastions; uplight pools
      lit.push({ f: { lin: [[0, '@warm', 0.55], [1, '@warm', 0.1]], x1: 0, y1: 0, x2: 0, y2: -TOP }, d: rect(TX0, -TOP - 8, TX1 - TX0, TOP + 8) },
        { f: { lin: [[0, '@warm', 0.4], [1, '@warm', 0.05]], x1: 0, y1: 0, x2: 0, y2: -TOP }, d: poly([[TX1, 0], [TX1, -TOP + 8], [BX, -TOP + 22], [BX + 4, 0]]) },
        { s: '@glowW', w: 1.2, op: 0.7, d: `M${TX0 - 3} ${-TOP - 8}H${TX1 + 3}` });
      for (const [a, b] of [[-170, -78], [-40, 170]]) lit.push({ f: { lin: [[0, '@warm', 0.5], [1, '@warm', 0.1]], x1: 0, y1: 0, x2: 0, y2: -48 }, d: rect(a, -48, b - a, 48) });
      for (const [x, w, h] of [[-96, 20, 58], [-48, 16, 52], [120, 22, 62]]) lit.push({ f: { lin: [[0, '@warm', 0.55], [1, '@warm', 0.08]], x1: 0, y1: 0, x2: 0, y2: -h }, d: rect(x - w, -h - 7, 2 * w, h + 7) });
      for (const x of [-140, -96, -20, 40, 120]) lit.push({ f: { rad: [[0, '@glowW', 0.6], [1, '@warm', 0]], cx: x, cy: -2, r: 16 }, d: ell(x, -2, 16, 8) });
      return { body, lit };
    },
  });
})();
