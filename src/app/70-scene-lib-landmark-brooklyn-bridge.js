/* ============================================================
   SCENE LIBRARY: landmark.brooklyn-bridge (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Extracted in spirit from the hand-drawn new-york-skyline art (its towers and its cables,
   computed as curves as the old scene did), then refined:
   - the real structure: two granite towers, each pierced by a PAIR of tall pointed (Gothic)
     arches, with a cornice; the four main cables hanging between the towers and down to the
     anchorages; the vertical suspenders; the diagonal stays radiating from each tower top
     (the bridge's web); the stiffened deck with its truss and railing; the masonry piers in
     the river
   - granite courses and the arches' depth, lit from the left
   - night: the deck lamps (glow) and the 'lit' part: warm floodlight washes on both towers and
     the "necklace" of lights along the main cables
   No text, no flags. Anchor: the waterline at the middle of the main span (the towers stand at
   x = +-380). The side spans run off to the box edges.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const TX = 380, TOP = -330, DECK = -150, CAB = -312, BASE = -40;   // tower x, tower top, deck level (the roadway at about 45 % of the towers' height, as built), cable saddle height, the top of the river piers
  define({
    id: 'landmark.brooklyn-bridge', category: 'landmark', size: [1240, 340], box: [-624, -342, 624, 4], variants: 1, seasonal: false, flippable: false, parts: ['body', 'lit'],
    palette: { base: {
      granite: ['#b4a48e', '#8a7a66', '#d4c6b0', '#5e5244'], arch: ['#3a3440', '#55505e'], cable: ['#5a5058', '#3e383e'], deck: ['#6a5e5c', '#4a4042', '#8a7e78'],
      flood: '#ffd9a0', neck: '#fff1c8',
    } },
    night: { glow: { lamp: '#ffe1a0', window: '#ffe1a0' }, on: 0.9 },
    reflect: true,
    tags: ['landmark', 'place:us/place:new-york', 'us', 'us-northeast', 'bridge', 'suspension-bridge', 'signature'],
    credit: 'native (scene engine pilot), after the hand-drawn new-york-skyline art (its cable curves)',
    build() {
      const body = [], lit = [];
      // cable curves: the main span (parabola between the saddles, low point just above the deck) and the side spans
      const main = x => CAB + (DECK - 8 - CAB) * (1 - Math.pow(x / TX, 2));
      const sideY = x => { const u = (Math.abs(x) - TX) / (620 - TX); return CAB + (DECK - 6 - CAB) * (1 - Math.pow(1 - u, 2)); };
      let mc = `M${-TX} ${CAB}`, sc = '';
      for (let x = -TX + 10; x <= TX; x += 10) mc += `L${x} ${f1(main(x))}`;
      for (const sg of [-1, 1]) { sc += `M${sg * TX} ${CAB}`; for (let k = 10; k <= 240; k += 10) sc += `L${sg * (TX + k)} ${f1(sideY(TX + k))}`; }
      // the stays: diagonals from each tower top fanning to the deck
      let stays = '';
      for (const sg of [-1, 1]) for (let k = 1; k <= 9; k++) { const dx = k * 30; stays += `M${sg * TX} ${CAB + 6}L${sg * (TX - dx)} ${DECK}M${sg * TX} ${CAB + 6}L${sg * (TX + dx * 0.8)} ${DECK}`; }
      // suspenders: verticals from the cables to the deck
      let sus = '';
      for (let x = -TX + 14; x < TX; x += 14) sus += `M${x} ${f1(main(x))}V${DECK}`;
      for (const sg of [-1, 1]) for (let k = 14; k < 240; k += 14) sus += `M${sg * (TX + k)} ${f1(sideY(TX + k))}V${DECK}`;
      // the suspenders of the main span and of the side spans, and each tower's web of stays, as separate strokes
      const susSide = sus.split('M').filter(Boolean).filter(seg => Math.abs(parseFloat(seg)) > TX).map(seg => 'M' + seg).join('');
      const susMain = sus.split('M').filter(Boolean).filter(seg => Math.abs(parseFloat(seg)) <= TX).map(seg => 'M' + seg).join('');
      body.push({ s: '@cable.0', w: 0.6, op: 0.55, d: susMain }, { s: '@cable.0', w: 0.6, op: 0.5, d: susSide });
      for (const sg of [-1, 1]) { let st = ''; for (let k = 1; k <= 9; k++) { const dx = k * 30; st += `M${sg * TX} ${CAB + 6}L${sg * (TX - dx)} ${DECK}M${sg * TX} ${CAB + 6}L${sg * (TX + dx * 0.8)} ${DECK}`; } body.push({ s: '@cable.0', w: 0.7, op: 0.65, d: st }); }
      // the deck: truss band, the promenade rail, the lamps along it
      body.push(['@deck.1', rect(-624, DECK, 1248, 14)], ['@deck.0', rect(-624, DECK, 1248, 4)], ['@deck.2', rect(-624, DECK - 1, 1248, 1.6)]);
      let truss = '';
      for (let x = -620; x < 620; x += 12) truss += `M${x} ${DECK + 4}L${x + 6} ${DECK + 14}L${x + 12} ${DECK + 4}`;
      body.push({ s: '@deck.2', w: 0.6, op: 0.5, d: truss, detail: true }, { s: '@deck.0', w: 0.8, d: `M-624 ${DECK - 6}H624`, op: 0.8 });
      // the roadway under the promenade (darker), the promenade's railing, the lamp standards in nine groups
      body.push(['@deck.1', rect(-624, DECK + 6, 1248, 5), 0.9], { s: '@deck.2', w: 0.5, op: 0.6, d: `M-624 ${DECK - 3}H624`, detail: true });
      const lampsD = ['', '', '', '', '', '', '', '', ''];
      for (let x = -600, i = 0; x <= 600; x += 40, i++) lampsD[(i * 4) % 9] += ell(x, DECK - 9, 1.5, 1.5);
      lampsD.forEach(d => body.push({ f: '@deck.2', d, glow: 'lamp' }));
      // the main cables drawn over the deck, a pair (the near one heavier)
      // the far pair of the four main cables, lighter, a little above; the near cable's wrapping bands (full size)
      body.push({ s: '@cable.0', w: 1.6, op: 0.45, d: (mc + sc).replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${x} ${f1(+y - 3)}`) });
      let bands = ''; for (let x = -TX + 7; x < TX; x += 14) bands += `M${x} ${f1(main(x) - 2)}v4`;
      body.push({ s: '@cable.0', w: 1, op: 0.7, d: bands, detail: true }, { s: '@deck.0', w: 1, op: 0.7, d: `M-624 ${DECK + 14}H624` });
      body.push({ s: '@cable.1', w: 2.8, d: mc + sc }, { s: '@cable.0', w: 1.4, op: 0.7, d: mc.replace(/L(-?\d+) (-?[\d.]+)/g, (_, x, y) => `L${x} ${f1(+y + 4)}`) });
      // the towers and their piers
      for (const sg of [-1, 1]) {
        const cx = sg * TX, hw = 38;
        body.push(['@granite.3', rect(cx - hw - 6, BASE, (hw + 6) * 2, -BASE)], ['@granite.1', rect(cx - hw - 6, BASE, 14, -BASE), 0.6]);
        body.push(['@granite.0', `M${cx - hw} ${BASE}V${TOP + 22}H${cx + hw}V${BASE}z`], ['@granite.1', rect(cx + hw * 0.45, TOP + 22, hw * 0.55, -TOP - 22 + BASE), 0.55]);
        body.push(['@granite.2', rect(cx - hw, TOP + 22, 3, -TOP - 22 + BASE), 0.9]);
        // the cornice and the cap
        body.push(['@granite.2', rect(cx - hw - 5, TOP + 14, hw * 2 + 10, 8)], ['@granite.1', rect(cx - hw - 3, TOP + 6, hw * 2 + 6, 8)], ['@granite.0', rect(cx - hw + 2, TOP, hw * 2 - 4, 6)]);
        // the twin pointed arches (the deck runs through them)
        for (const ax of [cx - hw * 0.48, cx + hw * 0.48]) {
          const aw = hw * 0.32, ab = DECK + 2, at = TOP + 96;
          body.push(['@arch.0', `M${f1(ax - aw)} ${ab}V${at}Q${f1(ax - aw)} ${at - 34} ${f1(ax)} ${at - 46}Q${f1(ax + aw)} ${at - 34} ${f1(ax + aw)} ${at}V${ab}z`]);
          body.push(['@arch.1', `M${f1(ax - aw)} ${ab}V${at}Q${f1(ax - aw)} ${at - 34} ${f1(ax)} ${at - 46}L${f1(ax - aw + 4)} ${at}V${ab}z`, 0.7]);
        }
        // granite courses, the buttress lines
        let c = '';
        for (let y = BASE - 4; y > TOP + 24; y -= 9) c += `M${cx - hw} ${y}H${cx + hw}`;
        body.push({ s: '@granite.3', w: 0.6, op: 0.28, d: c, detail: true }, { s: '@granite.3', w: 1.2, op: 0.45, d: `M${cx - hw * 0.08} ${TOP + 22}V${BASE}M${cx + hw * 0.08} ${TOP + 22}V${BASE}` });
        // the arches' keystones, the blind Gothic panels above them, the waterline stain and the fenders of the pier
        for (const ax of [cx - hw * 0.48, cx + hw * 0.48]) body.push(['@granite.2', poly([[ax - 3, TOP + 50], [ax, TOP + 44], [ax + 3, TOP + 50], [ax, TOP + 54]])]);
        body.push(['@arch.1', `M${cx - hw * 0.62} ${TOP + 40}V${TOP + 30}Q${cx - hw * 0.62} ${TOP + 26} ${cx - hw * 0.48} ${TOP + 24}Q${cx - hw * 0.34} ${TOP + 26} ${cx - hw * 0.34} ${TOP + 30}V${TOP + 40}zM${cx + hw * 0.34} ${TOP + 40}V${TOP + 30}Q${cx + hw * 0.34} ${TOP + 26} ${cx + hw * 0.48} ${TOP + 24}Q${cx + hw * 0.62} ${TOP + 26} ${cx + hw * 0.62} ${TOP + 30}V${TOP + 40}z`, 0.8]);
        body.push(['@granite.3', rect(cx - hw - 6, -10, (hw + 6) * 2, 10), 0.7], ['@deck.1', rect(cx - hw - 9, -16, 4, 16) + rect(cx + hw + 5, -16, 4, 16)]);
        body.push(['@granite.0', rect(cx - hw - 5, TOP + 10, 6, 4) + rect(cx + hw - 1, TOP + 10, 6, 4)]);
        lit.push({ s: '@flood', w: 1.6, op: 0.7, d: `M${cx - hw - 4} ${TOP + 14}H${cx + hw + 4}` });
        // the saddles where the cables cross the top
        body.push(['@cable.1', rect(cx - hw + 4, CAB - 2, 10, 5)], ['@cable.1', rect(cx + hw - 14, CAB - 2, 10, 5)]);
        // night: a warm floodlight wash up the tower
        lit.push({ f: { lin: [[0, '@flood', 0.04], [1, '@flood', 0.38]], x1: 0, y1: TOP, x2: 0, y2: BASE }, d: `M${cx - hw} ${BASE}V${TOP}H${cx + hw}V${BASE}z` });
        // the arches glow from the lamps on the walkway inside them
        for (const ax of [cx - hw * 0.48, cx + hw * 0.48]) { const aw = hw * 0.32, at = TOP + 96; lit.push({ f: { lin: [[0, '@flood', 0], [1, '@flood', 0.45]], x1: 0, y1: at - 46, x2: 0, y2: DECK }, d: `M${f1(ax - aw)} ${DECK + 2}V${at}Q${f1(ax - aw)} ${at - 34} ${f1(ax)} ${at - 46}Q${f1(ax + aw)} ${at - 34} ${f1(ax + aw)} ${at}V${DECK + 2}z` }); }
      }
      // night: the necklace lights along the main cables
      let neck = '';
      for (let x = -TX + 18; x < TX; x += 26) neck += ell(x, main(x), 1.6, 1.6);
      lit.push(['@neck', neck]);
      for (const sg of [-1, 1]) { let sn = ''; for (let k = 18; k < 240; k += 26) sn += ell(sg * (TX + k), sideY(TX + k), 1.6, 1.6); lit.push(['@neck', sn]); }
      return { body, lit };
    },
  });
})();
