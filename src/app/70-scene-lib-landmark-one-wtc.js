/* ============================================================
   SCENE LIBRARY: landmark.one-wtc (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Refined from the spired tower in the hand-drawn new-york-skyline art:
   - the real structure: a glass-finned podium, then a square tower whose edges are chamfered
     into eight tall triangles, so the faces read as triangles pointing up and down and the
     tower tapers to a square parapet (turned 45 degrees to the base), then the spire with its
     rings and maintenance platforms
   - blue-grey glass with the facets catching the light differently: the left-hand facets lit,
     the right in shade, floor lines and a sky reflection
   - night: floors lit in seeded groups (glow); the 'lit' part: the parapet ring, the spire's
     white light and the beacon at its tip
   No text, no logos. Anchor: the ground at the middle of the front.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  define({
    id: 'landmark.one-wtc', category: 'landmark', size: [100, 470], variants: 1, seasonal: false, flippable: false, parts: ['body', 'lit'],
    palette: { base: {
      glass: ['#a9c4dc', '#6e90b0', '#46607e', '#d6e6f2'], fin: ['#c8d2dc', '#8a98a8'], spire: ['#d8dde2', '#9aa2ac'], lightW: '#f4fbff', beacon: '#ff5040',
    } },
    night: { glow: { window: '#dfe8ff' }, on: 0.62 },
    shadow: { rx: 46, ry: 5, h: 60 },
    reflect: true,
    tags: ['landmark', 'place:us/place:new-york', 'us', 'us-northeast', 'skyline', 'skyscraper'],
    credit: 'native (scene engine pilot), after the hand-drawn new-york-skyline art',
    build(v, r) {
      const body = [], lit = [];
      const B = -54, T = -344, bw = 44, tw = 31;
      // the podium: a concrete base clad in glass fins, in six bays (lit side left), the lobby band at the foot
      body.push(['@fin.1', rect(-46, B, 92, -B)]);
      for (let k = 0; k < 6; k++) { const x = -46 + k * 92 / 6; body.push([k < 4 ? '@fin.0' : '@fin.1', rect(x + 0.6, B + 1, 92 / 6 - 1.2, -B - 2), k < 4 ? 1 : 0.8]); }
      let fins = ''; for (let x = -44; x < 46; x += 4) fins += `M${x} ${B + 2}v${-B - 4}`;
      body.push({ s: '@fin.1', w: 0.8, op: 0.8, d: fins, detail: true }, ['@fin.0', rect(-48, B - 2, 96, 2.4)], ['@glass.2', rect(-14, -16, 28, 3), 0.9]);
      // the tower: an outline tapering to the parapet; facets: two up-triangles at the sides, a down-triangle in the middle
      body.push({ f: { lin: [[0, '@glass.3'], [1, '@glass.1']], x1: 0, y1: T, x2: 0, y2: B }, d: poly([[-bw, B], [-tw, T], [tw, T], [bw, B]]) });
      body.push(['@glass.0', poly([[-bw, B], [-tw, T], [0, B]]), 0.9], ['@glass.2', poly([[bw, B], [tw, T], [0, B]]), 0.85]);
      body.push(['@glass.1', poly([[-tw, T], [tw, T], [0, B]]), 0.55], ['@glass.3', poly([[-tw, T], [-tw * 0.4, T], [0, B]]), 0.25]);
      // floor lines and the facet edges
      // floor lines; the window bays by facet (left up-triangle, middle down-triangle, right up-triangle), each facet in
      // ten seeded groups so the night pattern follows the faceting
      let fl = ''; const cells = [[], [], []];
      const facet = (x, y) => { const t = (y - B) / (T - B); return Math.abs(x) < tw * t ? 1 : x < 0 ? 0 : 2; };
      for (let y = B - 6; y > T + 2; y -= 5.5) { const t = (y - B) / (T - B), hw = bw + (tw - bw) * t; fl += `M${f1(-hw)} ${f1(y)}H${f1(hw)}`; for (let x = -hw + 2; x < hw - 6; x += 8) cells[facet(x + 3, y)].push([x, y - 3, 6, 2.6]); }
      body.push({ s: '@glass.2', w: 0.6, op: 0.4, d: fl, detail: true }, { s: '@glass.3', w: 1, op: 0.8, d: `M${-bw} ${B}L${-tw} ${T}M${-tw} ${T}L0 ${B}L${tw} ${T}` });
      cells.forEach((cs, k) => sceneDraw.winGroups(r, cs, 12).forEach(d => { if (d) body.push({ f: k === 1 ? '@glass.1' : k ? '@glass.2' : '@glass.0', d, op: 0.35, glow: 'window', detail: true }); }));
      // the three mechanical floors (louvred bands) and the sky glints down each facet
      for (const t of [0.25, 0.5, 0.82]) { const y = B + (T - B) * t, hw = bw + (tw - bw) * t; body.push(['@fin.1', rect(-hw, y - 2.5, hw * 2, 3), 0.8]); }
      body.push(['@glass.3', poly([[-bw + 3, B], [-tw + 2, T], [-tw + 8, T], [-bw + 14, B]]), 0.18], ['@glass.3', poly([[-tw + 6, T], [-tw + 12, T], [-2, B + 20]]), 0.15], ['@glass.0', poly([[bw - 6, B], [tw - 3, T], [tw - 1, T], [bw - 2, B]]), 0.2]);
      // the parapet and the spire with rings and platforms
      body.push(['@fin.0', rect(-tw - 1, T - 8, tw * 2 + 2, 8)], ['@fin.1', rect(tw * 0.3, T - 8, tw * 0.7 + 1, 8), 0.7]);
      body.push(['@spire.1', rect(-5, T - 16, 10, 8)], ['@spire.0', poly([[-2.4, T - 16], [0, -468], [2.4, T - 16]])], ['@spire.1', poly([[0, -468], [2.4, T - 16], [0.6, T - 16]]), 0.6]);
      [[4, 34], [3.4, 58], [2.8, 82], [2, 104]].forEach(([w, dy]) => body.push({ s: '@spire.1', w: 1.4, d: `M${-w} ${T - dy}h${w * 2}` }));
      body.push(['@beacon', ell(0, -466, 1.6, 1.6)], ['@spire.1', rect(-tw + 4, T - 12, 8, 4) + rect(tw - 12, T - 12, 8, 4)]);
      body.push({ f: '@glass.2', d: rect(-40, -14, 80, 8), glow: 'window' });
      // night: the parapet ring, the spire light, the beacon
      lit.push(['@lightW', rect(-tw - 1, T - 8, tw * 2 + 2, 2.4), 0.9], { f: { lin: [[0, '@lightW', 0.9], [1, '@lightW', 0.2]], x1: 0, y1: -468, x2: 0, y2: T - 16 }, d: poly([[-3, T - 16], [0, -468], [3, T - 16]]) },
        { f: { rad: [[0, '@lightW', 0.35], [1, '@lightW', 0]], cx: 0, cy: T - 60, r: 34 }, d: rect(-34, T - 100, 68, 90) }, ['@beacon', ell(0, -466, 3.4, 3.4), 0.9]);
      // the spire's ring lights, each its own, and the podium's lit lobby glass
      [[4, 34], [3.4, 58], [2.8, 82], [2, 104]].forEach(([w, dy]) => lit.push({ s: '@lightW', w: 1.6, op: 0.95, d: `M${-w - 1} ${T - dy}h${w * 2 + 2}` }));
      lit.push({ f: { lin: [[0, '@lightW', 0], [1, '@lightW', 0.35]], x1: 0, y1: B, x2: 0, y2: 0 }, d: rect(-46, B, 92, -B) });
      return { body, lit };
    },
  });
})();
