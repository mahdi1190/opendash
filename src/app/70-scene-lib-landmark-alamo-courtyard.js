/* The Alamo's limestone facade as respectful architecture, without statuary,
   religious or military symbols, flags, lettering or people in the object. */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const { rect, ell } = sceneDraw, R = Math.round;
  sceneObjDefine({
    id: 'landmark.alamo-courtyard', category: 'landmark', size: [820, 335], variants: 1,
    seasonal: false, flippable: false, parts: ['body', 'lit'],
    palette: { base: { stone: ['#d3bc94', '#baa17b', '#e6d2ac', '#a58d6c'], mortar: '#9d896f', door: ['#4c3b30', '#765439'], glass: '#50676a', metal: '#4c4e44' } },
    night: { glow: { lamp: '#ffe3a9', window: '#f4cd91' }, on: .95 },
    shadow: { rx: 94, ry: 9, h: 100 },
    tags: ['landmark', 'signature', 'place:texas/place:san-antonio', 'texas', 'san-antonio', 'alamo', 'limestone', 'kit:urban'],
    credit: 'native: Alamo limestone facade and low courtyard walls',
    build(v, rnd) {
      const body = [], lit = [];
      const f = (col, d, extra) => body.push(Object.assign({ f: col, d }, extra));
      const st = (col, w, d, op) => body.push({ s: col, w, d, op: op == null ? 1 : op, cap: 'round', detail: true });
      // The low enclosing walls step behind the church; the main mass has a
      // distinctive broken, scalloped parapet, whose central crest is unadorned.
      f('@stone.1', 'M-407 0V-132h40v-8h122V0zM245 0v-160h114v22h48V0z');
      f('@stone.2', 'M-412-135h49v-8h123v9h-118v8h-54zM240-164h124v21h48v9h-57v-22H240z');
      const crest = 'M-235-234h62Q-153-234-153-256Q-153-276-130-272Q-101-268-96-291Q-88-315-57-311Q-35-330 0-330Q35-330 57-311Q88-315 96-291Q101-268 130-272Q153-276 153-256Q153-234 173-234H235';
      const facade = crest + 'V0H-235z';
      f('@stone.0', facade);
      f('@stone.1', 'M179-234h56V0h-56z');
      st('@stone.2', 4, crest, .9);
      st('@stone.3', 1.5, crest, .7);
      // Tightly controlled limestone courses, individual blocks at varied widths.
      for (let row = 0; row < 13; row++) {
        const y = -217 + row * 16, width = row % 3 === 0 ? 51 : 43;
        let d = `M-231 ${y}h462`;
        for (let x = -228 + (row % 2) * 21; x < 225; x += width + R(rnd() * 11)) d += `M${x} ${y}v15`;
        st('@mortar', 1, d, .23);
        for (let i = 0; i < 3; i++) {
          const x = -223 + R(rnd() * 405), w = 17 + R(rnd() * 28);
          f(i % 2 ? '@stone.2' : '@stone.3', rect(x, y + 2, w, 12), { op: i % 2 ? .15 : .1, detail: true });
        }
      }
      for (const [x0, x1, top] of [[-402, -248, -129], [248, 402, -132]]) {
        for (let row = 0; row < 8; row++) {
          const y = top + row * 16;
          st('@mortar', .8, `M${x0} ${y}H${x1}`, .26);
          for (let x = x0 + 14 + (row % 2) * 22; x < x1; x += 42) st('@mortar', .8, `M${x} ${y}v15`, .22);
        }
      }
      // Sculpted portal: five recessed archivolts, a wood door and stone voussoirs.
      const arch = (x, y, w, h) => `M${x} 0V${y + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0V0z`;
      f('@stone.3', arch(-72, -171, 144, 171));
      f('@stone.2', arch(-66, -163, 132, 163));
      f('@stone.1', arch(-59, -155, 118, 155));
      f('@stone.3', arch(-53, -148, 106, 148));
      f('@door.0', arch(-46, -141, 92, 141));
      f('@door.1', 'M-43 0V-93a43 43 0 0 1 42-43V0z');
      for (let i = 0; i < 10; i++) st('@door.0', 1.2, `M${-40 + i * 8} ${-100 - Math.sin(i / 9 * Math.PI) * 28}V-2`, .7);
      st('@stone.1', 1.3, 'M0-135V-1M-43-80h86M-43-26h86', .6);
      for (const x of [-7, 7]) f('@metal', ell(x, -55, 2.4, 3));
      for (let i = 0; i < 13; i++) {
        const a = Math.PI + (i + .5) / 13 * Math.PI, x = R(Math.cos(a) * 64), y = R(-99 + Math.sin(a) * 64);
        st('@stone.3', 1, `M${x} ${y}l${R(Math.cos(a) * 8)} ${R(Math.sin(a) * 8)}`, .6);
      }
      // Paired pilasters, banded capitals and empty niches; no figures.
      for (const x of [-112, 112]) {
        f('@stone.3', rect(x - 12, -184, 24, 184));
        f('@stone.2', rect(x - 10, -181, 13, 175));
        f('@stone.0', rect(x + 3, -181, 6, 175));
        for (const y of [-183, -171, -36, -24, -8]) { f('@stone.2', rect(x - 15, y, 30, 5)); st('@stone.1', 1.1, `M${x - 15} ${y + 5}h30`, .7); }
        st('@stone.3', 1, `M${x - 5}-166V-42M${x}-166V-42`, .5);
      }
      for (const x of [-169, 169]) {
        f('@stone.3', `M${x - 21}-68v-67q21-33 42 0v67z`);
        f('@stone.1', `M${x - 15}-72v-59q15-24 30 0v59z`);
        f('@stone.2', rect(x - 27, -69, 54, 6));
        st('@stone.0', 2, `M${x - 20}-73v-60q20-31 40 0v60`, .7);
      }
      // Upper window and carved horizontal cornices define the facade's proportions.
      f('@stone.3', 'M-27-199v-29q27-30 54 0v29z');
      f('@stone.2', 'M-22-203v-23q22-25 44 0v23z');
      f('@glass', 'M-17-207v-17q17-20 34 0v17z');
      f('@glass', 'M-15-220q5-9 13-11v12h-13zM2-231q8 2 13 11v1H2zM-15-216h13v7h-13zM2-216h13v7H2z', { glow: 'window' });
      st('@stone.1', 2, 'M0-241v34M-17-218h34', .95);
      f('@stone.2', rect(-126, -193, 252, 9));
      f('@stone.3', rect(-126, -184, 252, 3));
      f('@stone.2', 'M-245 0h490l11 8H-256z');
      f('@stone.1', 'M-263 8h526l15 9H-278z');
      // Twelve low fixtures give the porous stone a warm night, without making
      // invented windows in the blank masonry or a large ungrounded glow.
      for (const x of [-348, -282, -216, -150, -84, -28, 28, 84, 150, 216, 282, 348]) {
        f('@metal', rect(x - 3, 4, 6, 5));
        f('#e7ce98', rect(x - 2, 3, 4, 2), { glow: 'lamp' });
      }
      // The real site uses neutral white facade illumination. Keep the stone
      // material warm, but the light itself neutral and confined to the masonry.
      lit.push({ f: { lin: [[0, '#f4f0df', .17], [.55, '#f4f0df', .36], [1, '#f4f0df', .56]], x1: 0, y1: -330, x2: 0, y2: 0 }, d: facade + 'M-46 0H46V-95a46 46 0 0 0-92 0V0z' });
      lit.push({ f: '#f4f0df', op: .18, d: 'M-404 0v-130h157V0zM247 0v-158h111v20h46V0z' });
      return { body, lit };
    },
  });
})();
