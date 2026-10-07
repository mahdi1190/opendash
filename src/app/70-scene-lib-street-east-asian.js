/* ============================================================
   SCENE LIBRARY: street, the east-asian kit (docs/dev/SCENE_ENGINE.md,
   sections 2 and 2.7). PURE: sceneObjDefine calls only, built lazily per
   variant.

   street.lantern-string  paper lanterns hung on a sagging cord between two
                          timber poles: v0 round red lanterns with gold caps
                          and tassels, v1 tall cream lanterns with dark
                          ribs and a red band, v2 a festival string of
                          mixed colours. No characters on the paper.

   The lanterns bob a little on the cord (the 'lanterns' part). Each one
   has a glowing core (glow 'lamp') and a soft halo in the 'lit' part after
   real dusk. Anchor: the ground at the middle of the span.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  defineObj({
    id: 'street.lantern-string', category: 'street', size: [330, 130], variants: 3, seasonal: false, flippable: true, parts: ['poles', 'lanterns', 'lit'],
    palette: { base: {
      pole: ['#4a3a2e', '#2e241c', '#6a5644'], cord: '#2a2420', gold: ['#d8a838', '#a87a20'], tassel: ['#c0302a', '#e8b040'],
      lan: ['#c8302a', '#e8dcc0', '#e8a030', '#d84a7a', '#3a8a6a', '#c8302a', '#f0d040'], lanD: ['#8a1a16', '#b8a888', '#b06a18', '#9a2a54', '#245a44', '#8a1a16', '#b8981c'],
      lanL: ['#e85a44', '#fbf4e0', '#f8c460', '#f084a8', '#5aaa88', '#e85a44', '#fbe880'], rib: ['#6a1410', '#2a2420'], band: '#b02a22', ground: '#5a5040',
    } },
    night: { glow: { lamp: '#ffc070' }, on: 1 },
    anim: { bob: { part: 'lanterns', dy: .9, period: 3.4 } },
    shadow: { rx: 150, ry: 5, h: 120 },
    tags: ['asia', 'east-asia', 'festival', 'street', 'night-market', 'lantern', 'kit:east-asian', 'kit:shophouse', 'kit:urban', 'role:street'],
    credit: 'drawn for the east-asian and shophouse kits',
    build(v) {
      const poles = [], lanterns = [], lit = [];
      const X = 158, Y = -116, sag = -64;
      for (const sd of [-1, 1]) {
        const x = sd * X;
        poles.push({ f: '@ground', d: ell(x, 0, 8, 2), op: .5, detail: true }, ['@pole.0', rect(x - 2.6, -124, 5.2, 124)], { f: '@pole.1', d: rect(x + .4, -124, 2.2, 124), op: .7, detail: true }, { f: '@pole.2', d: rect(x - 2.6, -124, 1.2, 124), op: .6, detail: true }, { f: '@pole.1', d: rect(x - 4, -126, 8, 3), detail: true });
      }
      poles.push({ s: '@cord', w: 1, d: `M${-X} ${Y}Q0 ${sag} ${X} ${Y}` });
      const n = v === 1 ? 6 : 8;
      for (let i = 0; i < n; i++) {
        const t = (i + 1) / (n + 1), x = -X + 2 * X * t, y = (1 - t) * (1 - t) * Y + 2 * (1 - t) * t * sag + t * t * Y;
        const c = v === 0 ? 0 : v === 1 ? 1 : [0, 2, 3, 4, 6, 0, 3, 2][i];
        // a tile still (LOD < .5) draws each lantern's body and band; the shading, ribs, caps and tassels are detail
        lanterns.push({ s: '@cord', w: .7, d: `M${f1(x)} ${f1(y)}v4`, detail: true });
        if (v === 1) {
          // a tall cream lantern: rounded body, dark ribs, black rims, a red band
          const cy = y + 18;
          lanterns.push([`@lan.${c}`, `M${f1(x - 6)} ${f1(cy - 11)}q-2.4 11 0 22h12q2.4 -11 0 -22z`], { f: `@lanD.${c}`, d: `M${f1(x + 2)} ${f1(cy - 11)}h4q2.4 11 0 22h-4q2 -11 0 -22z`, op: .8, detail: true }, { f: `@lanL.${c}`, d: `M${f1(x - 4)} ${f1(cy - 8)}q-1.4 8 0 16h4q-1 -8 0 -16z`, glow: 'lamp', detail: true });
          let rb = ''; for (let k = 1; k < 7; k++) rb += `M${f1(x - 7)} ${f1(cy - 11 + k * 22 / 7)}h14`;
          lanterns.push({ s: '@rib.1', w: .5, op: .5, d: rb, detail: true }, ['@band', rect(x - 7.4, cy + 2, 14.8, 4)], { f: '@rib.1', d: rect(x - 4.5, cy - 13, 9, 2.4) + rect(x - 4.5, cy + 11, 9, 2.4), detail: true }, { s: '@rib.1', w: .8, d: `M${f1(x)} ${f1(cy + 13.4)}v3`, detail: true });
          lit.push({ f: { rad: [[0, '@lanL.1', .45], [1, '@lanL.1', 0]], cx: x, cy, r: 26 }, d: rect(x - 26, cy - 26, 52, 52) }, { f: { rad: [[0, '#fff2c8', .95], [1, '@lanL.1', .75]], cx: x - 1, cy, r: 12 }, d: `M${f1(x - 6)} ${f1(cy - 11)}q-2.4 11 0 22h12q2.4 -11 0 -22z` }, ['@band', rect(x - 7.4, cy + 2, 14.8, 4), .8]);
        } else {
          // a round lantern: body, shaded right, lit core, ribs, gold caps, a tassel
          const cy = y + 14;
          lanterns.push([`@lan.${c}`, ell(x, cy, 9.5, 8.4)], { f: `@lanD.${c}`, d: `M${f1(x + 2)} ${f1(cy - 8.2)}a9.5 8.4 0 0 1 0 16.4q4 -8.2 0 -16.4z`, op: .85, detail: true }, { f: `@lanL.${c}`, d: ell(x - 2, cy - 1, 4.4, 4.6), glow: 'lamp', op: .9, detail: true });
          lanterns.push({ s: '@rib.0', w: .6, op: .55, d: `M${f1(x - 5)} ${f1(cy - 7)}q-3 7 0 14M${f1(x)} ${f1(cy - 8.4)}v16.8M${f1(x + 5)} ${f1(cy - 7)}q3 7 0 14`, detail: true });
          lanterns.push({ f: '@gold.0', d: rect(x - 4.4, cy - 10.4, 8.8, 2.6) + rect(x - 4.4, cy + 7.8, 8.8, 2.6), detail: true }, { f: '@gold.1', d: rect(x, cy - 10.4, 4.4, 2.6), op: .6, detail: true }, { s: '@tassel.' + (c === 0 ? 1 : 0), w: 1.6, d: `M${f1(x)} ${f1(cy + 10.4)}v8`, detail: true });
          lit.push({ f: { rad: [[0, `@lan.${c}`, .4], [.5, `@lanL.${c}`, .14], [1, `@lanL.${c}`, 0]], cx: x, cy, r: 24 }, d: rect(x - 24, cy - 24, 48, 48) }, { f: { rad: [[0, '#fff0c0', .95], [.45, `@lanL.${c}`, .9], [1, `@lan.${c}`, .85]], cx: x - 1.5, cy: cy - 1, r: 10 }, d: ell(x, cy, 9.5, 8.4) });
        }
      }
      return { poles, lanterns, lit };
    },
  });
})();
