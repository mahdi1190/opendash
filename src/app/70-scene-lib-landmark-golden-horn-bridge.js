/* ============================================================
   SCENE LIBRARY: landmark.golden-horn-bridge (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Refined from the cable-stayed bridge in the hand-drawn vladivostok-skyline art
   (`scene upgrade asia-central/vladivostok-skyline --box 330,225,1270,600`; its two pylons and its
   computed fans of stays), redrawn by hand:
   - the real structure: the Golden Horn (Zolotoy) bridge across the Golden Horn bay, a cable-stayed
     bridge with two tall white pylons, each a pair of legs straddling the deck and joining into one
     head that carries the stays; semi-fan stays in two planes on both sides of each pylon; the
     slightly cambered deck high over the bay (the span drawn foreshortened, as seen at an angle);
     the side spans on slim piers
   - lit from the left: the near leg and the head's sunlit side, the far leg in shade; the stays'
     anchorages; the deck's fascia, rail and underside
   - night: the pylons floodlit, the stays picked out, the deck's lamps (glow) and the aviation
     lights on the pylon tops (the 'lit' part)
   No text, no flags. Anchor: the waterline at the middle of the main span (the pylons at x +-300).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const PX = 300, TOP = -372, JN = -292, END = 784;   // pylon x, pylon top, where the legs join the head, the box edge
  const dk = x => -100 - 12 * (1 - Math.pow(x / END, 2));   // the deck's top (cambered: highest at mid-span)
  define({
    id: 'landmark.golden-horn-bridge', category: 'landmark', size: [1568, 380], box: [-786, -378, 786, 4], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      pylon: ['#f0f2f4', '#c6ccd4', '#9ca4b0', '#7c8490'], cable: ['#eef2f6', '#aab4c0'], deck: ['#d8dce0', '#8e96a2', '#5c6470', '#b4bac2'],
      pier: ['#aab0b6', '#7e868e', '#5e666e'], flood: '#ffe2a8', stay: '#f4ecd8', lamp: '#ffe6b0', beacon: '#ff4a3a',
    } },
    night: { glow: { lamp: '#ffe6b0' }, on: 0.9 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:vladivostok', 'asia', 'asia-central', 'bridge', 'cable-stayed-bridge', 'signature'],
    credit: 'native (scene engine upgrade), after the hand-drawn vladivostok-skyline art (its fans of stays)',
    build() {
      const body = [], lit = [];
      // the side spans' piers (behind the deck), with their caps and shaded sides
      for (const x of [-660, -500, 500, 660]) {
        const y = dk(x) + 9;
        body.push(['@pier.0', poly([[x - 7, 0], [x - 5, y], [x + 5, y], [x + 7, 0]])], ['@pier.1', poly([[x + 1, 0], [x + 1, y], [x + 5, y], [x + 7, 0]]), 0.8], ['@pier.2', rect(x - 8, y - 2, 16, 3)]);
      }
      // the stays: semi-fans from the head's upper part, in two planes (the far plane fainter, a little to the right)
      const fan = (cx, sg, dx) => { let d = ''; for (let k = 0; k < 12; k++) { const ay = TOP + 10 + k * 6.4, xd = cx + sg * (34 + k * 23); d += `M${f1(cx + dx)} ${f1(ay)}L${f1(xd + dx)} ${f1(dk(xd) - 1)}`; } return d; };
      for (const cx of [-PX, PX]) body.push({ s: '@cable.1', w: 0.7, op: 0.5, d: fan(cx, -1, 5) + fan(cx, 1, 5), detail: true });
      // the far legs (in shade, behind the deck), their crossbeam under the deck
      for (const cx of [-PX, PX]) {
        body.push(['@pylon.3', poly([[cx + 6, -4], [cx + 24, -4], [cx + 6, JN], [cx + 1, JN]])], { s: '@pylon.2', w: 0.8, op: 0.8, d: `M${cx + 6} -4L${cx + 1} ${JN}` });
        body.push(['@pylon.2', rect(cx - 20, dk(cx) + 10, 42, 7)], ['@pylon.3', rect(cx - 20, dk(cx) + 15, 42, 2), 0.7]);
      }
      // the deck: the girder, its fascia in the light, the underside in shade, the rail, the joints
      const xs = []; for (let x = -END; x <= END; x += 49) xs.push(x);
      const top = xs.map(x => [x, dk(x)]), bot = xs.map(x => [x, dk(x) + 9]).reverse();
      body.push(['@deck.1', poly(top.concat(bot))], ['@deck.0', poly(top.concat(xs.map(x => [x, dk(x) + 3.4]).reverse()))]);
      body.push(['@deck.2', poly(xs.map(x => [x, dk(x) + 6.6]).concat(bot)), 0.8]);
      body.push({ s: '@deck.3', w: 0.6, op: 0.7, d: 'M' + xs.map(x => f1(x) + ' ' + f1(dk(x) - 3)).join('L') }, { s: '@deck.0', w: 0.8, op: 0.5, d: 'M' + xs.map(x => f1(x) + ' ' + f1(dk(x) - 1.4)).join('L') });
      let posts = '', joints = ''; for (let x = -END + 8; x < END; x += 16) posts += `M${x} ${f1(dk(x))}v-3`;
      for (let x = -END + 98; x < END; x += 98) joints += `M${x} ${f1(dk(x))}v9`;
      body.push({ s: '@deck.3', w: 0.5, op: 0.5, d: posts, detail: true }, { s: '@deck.2', w: 0.6, op: 0.6, d: joints, detail: true });
      // the near plane of stays, a pair of fans per pylon, over the deck
      for (const cx of [-PX, PX]) body.push({ s: '@cable.0', w: 0.9, op: 0.85, d: fan(cx, -1, 0) }, { s: '@cable.0', w: 0.9, op: 0.85, d: fan(cx, 1, 0) });
      // the lamp standards along the deck (glow), in six groups
      const lampsD = ['', '', '', '', '', ''];
      for (let x = -760, i = 0; x <= 760; x += 38, i++) lampsD[(i * 5) % 6] += ell(x, dk(x) - 6, 1.3, 1.3);
      lampsD.forEach(d => body.push({ f: '@deck.2', d, glow: 'lamp' }));
      for (const cx of [-PX, PX]) {
        // the pier at the waterline: the footing, its shaded side and the wash round it
        body.push(['@pier.1', rect(cx - 34, -10, 68, 10)], ['@pier.0', rect(cx - 34, -10, 22, 10), 0.8], ['@pier.2', rect(cx - 36, -12, 72, 2.4)], ['@pier.2', rect(cx - 39, -7, 4, 7) + rect(cx + 35, -7, 4, 7)]);
        body.push({ s: '@cable.0', w: 1.2, op: 0.5, d: `M${cx - 40} -1Q${cx} 2 ${cx + 40} -1` });
        // the near leg (in the light), from the pier through the deck to the junction, its sunlit edge and its inner edge
        body.push(['@pylon.1', poly([[cx - 24, -12], [cx - 6, -12], [cx - 1, JN], [cx - 7, JN]])], ['@pylon.0', poly([[cx - 24, -12], [cx - 18, -12], [cx - 6.4, JN], [cx - 7, JN]])]);
        body.push({ s: '@pylon.2', w: 0.8, op: 0.7, d: `M${cx - 6} -12L${cx - 1} ${JN}` });
        // the head: one shaft from the junction to the top, its shaded right side, the anchorage zone, the cap
        body.push(['@pylon.0', poly([[cx - 7, JN], [cx - 5, TOP + 3], [cx + 5, TOP + 3], [cx + 7, JN]])], ['@pylon.2', poly([[cx + 1, JN], [cx + 1, TOP + 3], [cx + 5, TOP + 3], [cx + 7, JN]]), 0.8]);
        body.push(['@pylon.1', rect(cx - 5.2, TOP + 8, 10.4, 76), 0.55], ['@pylon.1', poly([[cx - 5, TOP + 3], [cx, TOP - 4], [cx + 5, TOP + 3]])]);
        // the junction's knee and the head's edge in the light
        body.push(['@pylon.1', poly([[cx - 7, JN + 22], [cx, JN - 4], [cx + 7, JN + 22], [cx, JN + 10]]), 0.9], { s: '@pylon.0', w: 0.8, op: 0.9, d: `M${cx - 6.6} ${JN}L${cx - 4.6} ${TOP + 4}` });
        // the anchorages, a row of dots down the head, and the stays' anchor plates along the deck
        let an = '', ad = ''; for (let k = 0; k < 12; k++) { an += ell(cx, TOP + 10 + k * 6.4, 0.9, 0.9); for (const sg of [-1, 1]) { const xd = cx + sg * (34 + k * 23); ad += rect(xd - 1.2, dk(xd) - 1.6, 2.4, 1.6); } }
        body.push({ f: '@pylon.3', d: an, detail: true }, { f: '@deck.2', d: ad, op: 0.8, detail: true });
        body.push(['@beacon', ell(cx, TOP - 4.6, 1.1, 1.1)]);
        // night: a warm floodlight wash up the legs and the head, the beacon's glow
        lit.push({ f: { lin: [[0, '@flood', 0.05], [1, '@flood', 0.5]], x1: 0, y1: TOP, x2: 0, y2: -12 }, d: poly([[cx - 24, -12], [cx - 7, JN], [cx - 5, TOP + 3], [cx + 5, TOP + 3], [cx + 7, JN], [cx + 24, -4], [cx + 6, -4], [cx, JN + 24], [cx - 6, -12]]) });
        lit.push({ f: { rad: [[0, '@beacon', 0.75], [1, '@beacon', 0]], cx, cy: TOP - 4.6, r: 4.6 }, d: ell(cx, TOP - 4.6, 4.6, 4.6) });
        // night: the anchorage zone lit from below, where the stays leave the head
        lit.push({ f: { lin: [[0, '@stay', 0.6], [1, '@stay', 0.1]], x1: 0, y1: TOP + 84, x2: 0, y2: TOP + 8 }, d: rect(cx - 5.2, TOP + 8, 10.4, 76) });
      }
      // night: the stays picked out in light, the deck's edge as a line of lamps
      for (const cx of [-PX, PX]) lit.push({ s: '@stay', w: 0.8, op: 0.55, d: fan(cx, -1, 0) + fan(cx, 1, 0) });
      lit.push({ s: '@lamp', w: 2.2, op: 0.9, d: 'M' + xs.map(x => f1(x) + ' ' + f1(dk(x) + 1)).join('L') });
      return { body, lit };
    },
  });
})();
