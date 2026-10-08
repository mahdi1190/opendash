/* ============================================================
   SCENE LIBRARY: landmark.roebling-bridge (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   The John A. Roebling Suspension Bridge over the Ohio between Covington and Cincinnati (1866),
   seen broadside. Drawn by hand (the box extraction of the hand-drawn cincinnati-flying-pig art
   was only a reference):
   - the real structure: two sandstone towers on limestone piers at the river's edges, each
     with blind round-arched panels, string courses, a cornice and the small ornamental cupolas
     over the cable saddles (the near one and, a little behind it, the far one); the two pairs
     of main cables (the second pair added in the 1890s) hanging between the towers and back to
     the masonry anchorages on each bank; the vertical suspenders; the diagonal stays fanning
     from each tower top; the steel stiffening truss along the deck, painted blue like the
     cables; the lamp standards along the walkway
   - stone lit from the left (the shade on the right of each tower), the courses and arches'
     depth, the waterline stain on the piers
   - night: the walkway lamps (glow) and the 'lit' part: a warm floodlight up each tower, the
     lit cupolas and the necklace of lights along the main cables
   No text, no flags. Anchor: the waterline at the middle of the main span (the towers stand at
   x = +-330, the anchorages at +-540 to +-600).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const TX = 330, TOP = -204, DECK = -80, CAB = -198, AX = 540, E = 600;   // tower x, tower top (the cornice), deck level, cable saddles, the anchorages, the ends
  define({
    id: 'landmark.roebling-bridge', category: 'landmark', size: [1200, 250], box: [-600, -248, 600, 2], variants: 1, seasonal: false, flippable: false, parts: ['body', 'lit'],
    palette: { base: {
      sand: ['#c4a77e', '#9a7f5c', '#dcc8a2', '#64523c'], lime: ['#b9b3a7', '#8f897d', '#d2ccc0'], steel: ['#5a8cb4', '#3c6890', '#8ab6d6', '#28465e'],
      cup: ['#5a7a96', '#3a5470', '#d8b868'], dark: '#2c2a2e', flood: '#ffdcaa', neck: '#fff2cc',
    } },
    night: { glow: { lamp: '#ffe1a0' }, on: 0.9 },
    reflect: true,
    tags: ['landmark', 'place:us/place:cincinnati', 'us', 'us-midwest', 'bridge', 'suspension-bridge', 'river'],
    credit: 'native, drawn for the composed cincinnati-flying-pig scene (after the hand-drawn art)',
    build() {
      const body = [], lit = [];
      // the cable curves: the main span (low point just above the deck) and the back spans down to the anchorages
      const main = x => CAB + (DECK - 6 - CAB) * (1 - Math.pow(x / TX, 2));
      const side = x => { const u = (Math.abs(x) - TX) / (AX - TX); return CAB + (DECK - 4 - CAB) * (1 - Math.pow(1 - u, 2)); };
      let mc = `M${-TX} ${CAB}`, sc = '';
      for (let x = -TX + 10; x <= TX; x += 10) mc += `L${x} ${f1(main(x))}`;
      for (const sg of [-1, 1]) { sc += `M${sg * TX} ${CAB}`; for (let k = 10; k <= AX - TX; k += 10) sc += `L${sg * (TX + k)} ${f1(side(TX + k))}`; }
      // suspenders: the main span and the two back spans
      let susM = '', susS = '';
      for (let x = -TX + 12; x < TX; x += 12) susM += `M${x} ${f1(main(x))}V${DECK}`;
      for (const sg of [-1, 1]) for (let k = 12; k < AX - TX; k += 12) susS += `M${sg * (TX + k)} ${f1(side(TX + k))}V${DECK}`;
      body.push({ s: '@steel.3', w: 0.6, op: 0.6, d: susM }, { s: '@steel.3', w: 0.6, op: 0.55, d: susS });
      // the stays fanning from each tower top, inwards over the main span and outwards over the back span
      for (const sg of [-1, 1]) { let st = ''; for (let k = 1; k <= 7; k++) st += `M${sg * TX} ${CAB + 8}L${sg * (TX - k * 34)} ${DECK}M${sg * TX} ${CAB + 8}L${sg * (TX + k * 26)} ${DECK}`; body.push({ s: '@steel.3', w: 0.7, op: 0.55, d: st }); }
      // the far cables of each pair (lighter, a little higher), then the deck, then the near cables over it
      body.push({ s: '@steel.0', w: 1.6, op: 0.5, d: (mc + sc).replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${x} ${f1(+y - 3)}`) });
      // the deck: the stiffening truss (top and bottom chords, its lattice), the roadway edge, the walkway railing
      body.push(['@steel.1', rect(-E, DECK, E * 2, 12)], ['@steel.2', rect(-E, DECK - 1.5, E * 2, 2)], ['@steel.3', rect(-E, DECK + 10, E * 2, 2.4)]);
      let lat = '';
      for (let x = -E; x < E; x += 10) lat += `M${x} ${DECK + 1}L${x + 5} ${DECK + 10}L${x + 10} ${DECK + 1}`;
      body.push({ s: '@steel.2', w: 0.7, op: 0.55, d: lat, detail: true }, { s: '@steel.3', w: 0.5, op: 0.5, d: `M${-E} ${DECK - 5}H${E}`, detail: true });
      let rail = ''; for (let x = -E + 3; x < E; x += 6) rail += `M${x} ${DECK - 1.5}V${DECK - 5}`;
      body.push({ s: '@steel.3', w: 0.5, op: 0.45, d: rail, detail: true });
      // the lamp standards along the walkway, their heads lit at dusk in three groups
      let poles = ''; const heads = ['', '', ''];
      for (let x = -E + 20, i = 0; x < E; x += 40, i++) { if (Math.abs(Math.abs(x) - TX) < 30) continue; poles += `M${x} ${DECK - 1}V${DECK - 12}`; heads[i % 3] += ell(x, DECK - 13.5, 1.6, 2); }
      body.push({ s: '@steel.3', w: 0.9, d: poles });
      heads.forEach(d => body.push({ f: '@steel.2', d, glow: 'lamp' }));
      // the near main cables, heavier, their wrapping bands
      body.push({ s: '@steel.1', w: 2.6, d: mc + sc }, { s: '@steel.2', w: 0.8, op: 0.6, d: mc.replace(/L(-?\d+) (-?[\d.]+)/g, (_, x, y) => `L${x} ${f1(+y - 1)}`) });
      let bands = ''; for (let x = -TX + 6; x < TX; x += 12) bands += `M${x} ${f1(main(x) - 2)}v4`;
      body.push({ s: '@steel.3', w: 0.8, op: 0.6, d: bands, detail: true });
      // the masonry anchorages on each bank: the block, its lit face, its cap and courses
      for (const sg of [-1, 1]) {
        const x0 = sg < 0 ? -E : AX - 20, w = E - AX + 20, top = DECK - 10;
        body.push(['@lime.1', rect(x0, top, w, -top)], ['@lime.0', rect(x0, top, w * 0.55, -top), 0.8], ['@lime.2', rect(x0 - 2, top - 3, w + 4, 4)]);
        body.push({ s: '@lime.1', w: 0.5, op: 0.45, d: `M${x0} -20h${w}M${x0} -40h${w}M${x0} -60h${w}`, detail: true }, ['@dark', rect(x0, -4, w, 4), 0.3]);
      }
      // the towers
      for (const sg of [-1, 1]) {
        const cx = sg * TX, hw = 26, tw = 22;   // half widths at the deck and at the top (the towers batter)
        // the limestone pier from the waterline to the deck, lit from the left, its waterline stain and cutwater
        body.push(['@lime.1', rect(cx - hw - 6, DECK, (hw + 6) * 2, -DECK)], ['@lime.0', rect(cx - hw - 6, DECK, hw + 2, -DECK), 0.85], ['@lime.2', rect(cx - hw - 6, DECK, 3, -DECK), 0.8]);
        body.push(['@dark', rect(cx - hw - 6, -8, (hw + 6) * 2, 8), 0.35], ['@lime.2', rect(cx - hw - 8, DECK - 2, (hw + 8) * 2, 3)]);
        body.push({ s: '@lime.1', w: 0.5, op: 0.5, d: `M${cx - hw - 6} -24h${(hw + 6) * 2}M${cx - hw - 6} -44h${(hw + 6) * 2}M${cx - hw - 6} -64h${(hw + 6) * 2}`, detail: true });
        // the sandstone shaft (a gradient from the lit left to the shaded right), its shaded right flank and lit left edge
        const g = { lin: [[0, '@sand.2'], [0.4, '@sand.0'], [1, '@sand.1']], x1: cx - hw, y1: 0, x2: cx + hw, y2: 0 };
        body.push({ f: g, d: poly([[cx - hw, DECK], [cx - tw, TOP], [cx + tw, TOP], [cx + hw, DECK]]) });
        body.push(['@sand.1', poly([[cx + hw * 0.45, DECK], [cx + tw * 0.45, TOP], [cx + tw, TOP], [cx + hw, DECK]]), 0.6], ['@sand.2', poly([[cx - hw, DECK], [cx - tw, TOP], [cx - tw + 2, TOP], [cx - hw + 2, DECK]]), 0.8]);
        // the courses of stone and the pilaster lines at the corners
        let c = ''; for (let y = DECK - 8; y > TOP + 6; y -= 8) { const k = (y - DECK) / (TOP - DECK), w = hw + (tw - hw) * k; c += `M${f1(cx - w)} ${y}H${f1(cx + w)}`; }
        body.push({ s: '@sand.3', w: 0.5, op: 0.25, d: c, detail: true }, { s: '@sand.3', w: 0.8, op: 0.35, d: `M${cx - hw + 5} ${DECK}L${cx - tw + 4} ${TOP}M${cx + hw - 5} ${DECK}L${cx + tw - 4} ${TOP}` });
        // the blind round-arched panels: a tall one over the deck, a short one under the cornice; their recess and lit jamb
        const arch = (y0, y1, w) => `M${cx - w} ${y0}V${y1 + w}A${w} ${w} 0 0 1 ${cx + w} ${y1 + w}V${y0}Z`;
        body.push(['@sand.3', arch(DECK - 8, DECK - 70, 9), 0.75], ['@sand.1', arch(DECK - 8, DECK - 70, 6), 0.8], ['@sand.2', rect(cx - 9, DECK - 61, 1.6, 53), 0.6]);
        body.push(['@sand.3', arch(TOP + 44, TOP + 14, 7), 0.75], ['@sand.1', arch(TOP + 44, TOP + 14, 4.5), 0.8]);
        // the keystones and the sills, the impost band between the two panels
        body.push(['@sand.2', poly([[cx - 2.5, DECK - 71], [cx + 2.5, DECK - 71], [cx + 1.6, DECK - 64], [cx - 1.6, DECK - 64]])], ['@sand.2', rect(cx - 11, DECK - 9, 22, 2.4)]);
        body.push(['@sand.2', poly([[cx - 2, TOP + 13], [cx + 2, TOP + 13], [cx + 1.3, TOP + 19], [cx - 1.3, TOP + 19]])], ['@sand.1', rect(cx - tw - 1, TOP + 52, tw * 2 + 2, 3), 0.8]);
        // the cornice and the cap
        body.push(['@sand.2', rect(cx - tw - 4, TOP - 2, tw * 2 + 8, 5)], ['@sand.1', rect(cx - tw - 2, TOP + 3, tw * 2 + 4, 3), 0.9], ['@sand.0', rect(cx - tw - 1, TOP - 7, tw * 2 + 2, 5)]);
        // the saddles where the cables cross the top
        body.push(['@steel.3', rect(cx - tw + 1, CAB - 3, 7, 5)], ['@steel.3', rect(cx + tw - 8, CAB - 3, 7, 5)]);
        // the cupolas over the saddles: the far one first (a little to the right, darker), then the near one
        const cup = (x, far) => {
          body.push([far ? '@cup.1' : '@cup.0', rect(x - 8, TOP - 17, 16, 10), far ? 0.85 : 1], [far ? '@cup.1' : '@cup.0', `M${x - 9} ${TOP - 17}Q${x - 9} ${TOP - 29} ${x} ${TOP - 34}Q${x + 9} ${TOP - 29} ${x + 9} ${TOP - 17}Z`, far ? 0.85 : 1]);
          if (far) return;
          body.push(['@cup.1', `M${x} ${TOP - 34}Q${x + 9} ${TOP - 29} ${x + 9} ${TOP - 17}H${x + 3}Q${x + 3} ${TOP - 28} ${x} ${TOP - 34}Z`, 0.7], ['@cup.2', rect(x - 0.7, TOP - 40, 1.4, 6)], ['@cup.2', ell(x, TOP - 41, 1.5, 1.5)]);
          body.push(['@cup.1', rect(x - 5, TOP - 15, 3, 6), 0.8], ['@cup.1', rect(x + 2, TOP - 15, 3, 6), 0.8], ['@cup.2', rect(x - 9.5, TOP - 18, 19, 1.8)]);
        };
        cup(cx + 9, true); cup(cx - 1, false);
        // night: floodlight up the tower, the cupolas lit
        lit.push({ f: { lin: [[0, '@flood', 0.1], [1, '@flood', 0.55]], x1: 0, y1: TOP, x2: 0, y2: DECK }, d: poly([[cx - hw, DECK], [cx - tw, TOP], [cx + tw, TOP], [cx + hw, DECK]]) });
        lit.push({ f: { rad: [[0, '@flood', 0.55], [1, '@flood', 0]], cx: cx - 1, cy: TOP - 18, r: 16 }, d: rect(cx - 17, TOP - 36, 34, 34) }, { s: '@neck', w: 1.2, op: 0.6, d: `M${cx - tw - 4} ${TOP - 1}H${cx + tw + 4}` });
      }
      // night: the necklace lights along the main cables and the walkway in the lamplight
      let neck = ''; for (let x = -TX + 18; x < TX; x += 24) neck += ell(x, main(x), 2.2, 2.2);
      lit.push(['@neck', neck]);
      for (const sg of [-1, 1]) { let sn = ''; for (let k = 18; k < AX - TX; k += 24) sn += ell(sg * (TX + k), side(TX + k), 2.2, 2.2); lit.push(['@neck', sn]); }
      lit.push({ f: { lin: [[0, '@flood', 0.32], [1, '@flood', 0]], x1: 0, y1: DECK - 14, x2: 0, y2: DECK + 6 }, d: rect(-E, DECK - 14, E * 2, 20) });
      return { body, lit };
    },
  });
})();
