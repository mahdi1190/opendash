/* ============================================================
   SCENE LIBRARY: landmark.longfellow-bridge (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   The Longfellow Bridge over the Charles between Cambridge and Boston, seen broadside. Drawn by
   hand after its form:
   - eleven steel arch spans on granite piers, the widest in the middle and the spans shortening
     towards each shore; the outer arch ribs and the inner ones behind them, the open spandrels
     with their posts, the deck's steel fascia and cornice, the balustrade and its lamp standards
   - the four granite towers on the two middle piers (the "salt and pepper shakers"), a pair each
     side of the deck: a round shaft, a ring of arched openings under the cornice, a domed cap
     and finial; the near towers lit from the left, the far pair darker behind them
   - the masonry abutments at each shore
   - night: the lamps (glow) and the 'lit' part: warm floodlight on the towers, their lit caps and
     the lamplight along the balustrade
   No text, no flags. Anchor: the waterline at the middle of the central span (the towers stand on
   the piers at x = +-68).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const DB = -27, DT = -33, RT = -37, YS = -6, YC = -25, E = 652;   // fascia bottom, deck top, balustrade top, arch springing and crown, the ends
  // the piers from the middle outwards (x of the centre, half width): the two tower piers, then five more each side
  const PX = [68, 196, 314, 422, 520, 608], PW = [14, 8, 8, 7, 7, 6];
  define({
    id: 'landmark.longfellow-bridge', category: 'landmark', size: [1304, 124], box: [-654, -124, 654, 4], variants: 1, seasonal: false, flippable: false, parts: ['body', 'lit'],
    palette: { base: {
      gran: ['#bfb3a0', '#978b7a', '#6c6356', '#dcd0bc'], steel: ['#7e868c', '#545c62', '#aab2b8', '#3c4248'], cap: ['#5e6c68', '#46524e'],
      dark: '#2e3438', flood: '#ffd9a0', lampL: '#fff0c8',
    } },
    night: { glow: { lamp: '#ffe1a0' }, on: 0.9 },
    reflect: true,
    tags: ['landmark', 'place:us/place:boston', 'us', 'us-northeast', 'bridge', 'arch-bridge', 'river'],
    credit: 'native, drawn for the composed boston-charles scene',
    build() {
      const body = [], lit = [];
      const piers = [];
      for (let i = 0; i < PX.length; i++) for (const sg of [-1, 1]) piers.push([sg * PX[i], PW[i]]);
      piers.sort((a, b) => a[0] - b[0]);
      // the spans: from the right face of one pier to the left face of the next (the middle span between the tower piers)
      const spans = [];
      for (let i = 0; i < piers.length - 1; i++) spans.push([piers[i][0] + piers[i][1], piers[i + 1][0] - piers[i + 1][1]]);
      // the far ribs (inner arches, darker), then the spandrel posts, then the outer ribs
      let far = '', near = '', hi = '', posts = '';
      for (const [a, b] of spans) {
        const m = (a + b) / 2, cy = 2 * YC - YS, at = x => { const t = (x - a) / (b - a); return (1 - t) * (1 - t) * YS + 2 * (1 - t) * t * cy + t * t * YS; };
        far += `M${f1(a + 2)} ${YS - 1}Q${f1(m + 2)} ${cy - 1} ${f1(b + 2)} ${YS - 1}`;
        near += `M${f1(a)} ${YS}Q${f1(m)} ${cy} ${f1(b)} ${YS}`;
        hi += `M${f1(a + 1)} ${YS - 1.4}Q${f1(m)} ${cy - 1.4} ${f1(b - 1)} ${YS - 1.4}`;
        for (let x = a + 6; x < b - 3; x += 7) posts += `M${f1(x)} ${f1(at(x) - 1)}V${DB}`;
      }
      body.push({ s: '@steel.3', w: 2.6, op: 0.7, d: far }, { s: '@steel.1', w: 0.8, op: 0.7, d: posts, detail: true }, { s: '@steel.0', w: 3.2, d: near });
      body.push({ s: '@steel.2', w: 0.8, op: 0.6, d: hi, detail: true });
      // the piers: granite, lit on the left; the waterline band; the abutments at each shore
      for (const [x, w] of piers) {
        const top = Math.abs(x) === PX[0] ? DT : YS - 2;
        body.push(['@gran.1', rect(x - w, top, w * 2, -top)], ['@gran.3', rect(x - w, top, Math.max(2, w * 0.45), -top), 0.55], ['@gran.2', rect(x + w * 0.5, top, w * 0.5, -top), 0.6]);
      }
      body.push({ f: '@dark', d: piers.map(([x, w]) => rect(x - w, -3, w * 2, 3)).join(''), op: 0.35, detail: true });
      for (const sg of [-1, 1]) {
        const x0 = sg < 0 ? -E : PX[5] + PW[5];
        body.push(['@gran.1', rect(x0, DT, E - PX[5] - PW[5], -DT)], ['@gran.2', rect(x0, DT, E - PX[5] - PW[5], 4), 0.6]);
        body.push({ s: '@gran.2', w: 0.5, op: 0.4, d: `M${x0} -10h${E - PX[5] - PW[5]}M${x0} -20h${E - PX[5] - PW[5]}`, detail: true });
      }
      // the deck: the steel fascia, its cornice, the balustrade with its posts and top rail
      body.push(['@steel.1', rect(-E, DT, E * 2, DB - DT)], ['@steel.2', rect(-E, DT - 1.5, E * 2, 1.8)], ['@steel.3', rect(-E, DB - 1.4, E * 2, 1.4), 0.7]);
      let dent = ''; for (let x = -E + 2; x < E; x += 5) dent += `M${x} ${DT + 1.5}v2`;
      body.push({ s: '@steel.2', w: 0.7, op: 0.5, d: dent, detail: true });
      let bal = ''; for (let x = -E + 2; x < E; x += 4) bal += `M${x} ${DT - 1.5}V${RT + 1}`;
      body.push({ s: '@gran.2', w: 0.7, op: 0.7, d: bal, detail: true }, ['@gran.0', rect(-E, RT, E * 2, 1.6)]);
      // the lamp standards along the balustrade (the heads light at dusk, in three groups)
      let poles = ''; const heads = ['', '', ''];
      for (let x = -E + 22, i = 0; x < E; x += 44, i++) { if (Math.abs(Math.abs(x) - PX[0]) < 18) continue; poles += `M${x} ${RT}V${RT - 10}`; heads[i % 3] += ell(x, RT - 11.5, 1.6, 2); }
      body.push({ s: '@steel.3', w: 0.9, d: poles });
      heads.forEach(d => body.push({ f: '@steel.2', d, glow: 'lamp' }));
      // the towers: the far pair behind (darker), the near pair on the middle piers
      const tower = (cx, far) => {
        const w = far ? 10 : 11, sh = far ? '@gran.2' : '@gran.1', g = { lin: [[0, '@gran.3'], [0.45, '@gran.0'], [1, '@gran.2']], x1: cx - w, y1: 0, x2: cx + w, y2: 0 };
        body.push({ f: far ? '@gran.2' : g, d: poly([[cx - w - 1, RT], [cx - w, -86], [cx + w, -86], [cx + w + 1, RT]]), op: far ? 0.85 : 1 });
        body.push([sh, rect(cx - w - 2, -98, w * 2 + 4, 12), far ? 0.85 : 1], [far ? '@steel.3' : '@gran.0', rect(cx - w - 3, -101, w * 2 + 6, 3)]);
        body.push([far ? '@cap.1' : '@cap.0', `M${cx - w - 1} -101Q${cx - w} -112 ${cx} -116Q${cx + w} -112 ${cx + w + 1} -101Z`]);
        body.push([far ? '@cap.1' : '@steel.3', rect(cx - 0.8, -122, 1.6, 7)]);
        if (far) return;
        // the ring of arched openings, the bands of the shaft, the cap's shading and the finial ball
        body.push(['@dark', [-6, 0, 6].map(dx => `M${cx + dx - 2} -88V-94Q${cx + dx} -97 ${cx + dx + 2} -94V-88Z`).join(''), 0.8]);
        body.push({ s: '@gran.2', w: 0.7, op: 0.5, d: `M${cx - w} -50H${cx + w}M${cx - w} -68H${cx + w}M${cx - w} -86H${cx + w}`, detail: true });
        body.push(['@cap.1', `M${cx} -116Q${cx + w} -112 ${cx + w + 1} -101H${cx + 3}Q${cx + 3} -110 ${cx} -116Z`, 0.7], ['@gran.0', ell(cx, -123, 1.6, 1.6)]);
        body.push(['@gran.3', rect(cx - w, -86, 2.4, RT + 86), 0.4]);
      };
      for (const sg of [-1, 1]) tower(sg * PX[0] + 9, true);
      for (const sg of [-1, 1]) tower(sg * PX[0], false);
      // night: floodlight up the near towers, their caps, the lamplight along the balustrade
      for (const sg of [-1, 1]) {
        const cx = sg * PX[0];
        lit.push({ f: { lin: [[0, '@flood', 0.05], [1, '@flood', 0.42]], x1: 0, y1: -116, x2: 0, y2: 0 }, d: poly([[cx - 12, RT], [cx - 11, -86], [cx - 13, -101], [cx, -116], [cx + 13, -101], [cx + 11, -86], [cx + 12, RT]]) + rect(cx - 14, RT, 28, -RT) });
      }
      lit.push({ s: '@lampL', w: 1.4, op: 0.5, d: `M${-E} ${RT + 0.6}H${E}` }, { f: { lin: [[0, '@flood', 0.3], [1, '@flood', 0]], x1: 0, y1: DT, x2: 0, y2: -10 }, d: rect(-E, DT, E * 2, 23) });
      return { body, lit };
    },
  });
})();
