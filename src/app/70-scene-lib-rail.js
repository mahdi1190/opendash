/* ============================================================
   SCENE LIBRARY: railway (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   After the Fleet Pond views (the main line on its embankment along the
   north shore): a stretch of grassed embankment with ballast, sleepers and
   rails, and a four-car electric multiple unit in a GENERIC livery (no
   operator's colours, logos or lettering). The train FACES RIGHT; its
   windows light at real dusk (glow 'window'). Anchor: the rail head (the
   train) or the foot of the bank (the embankment), at the middle.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  const bySeason = (o) => { const p = {}; for (const s of SEAS) p[s] = {}; for (const [slot, v] of Object.entries(o)) for (const s of SEAS) p[s][slot] = v[s]; return p; };
  const GRASS = { spring: ['#4c7a37', '#6f9f40', '#a6c95e'], summer: ['#3f6b31', '#5f8f3a', '#8db352'], autumn: ['#5f6a35', '#8a8a45', '#b5a65c'], winter: ['#6b735a', '#8d9277', '#b3b59c'] };
  const SCRUB = { spring: ['#2f5a2e', '#4d8040', '#f4eef0'], summer: ['#25502a', '#3f7a34', '#3f7a34'], autumn: ['#6a5a2a', '#9a7a34', '#b04a2c'], winter: ['#4a4038', '#5e5248', '#6a3a2a'] };

  /* ---------- rail.embankment: a stretch of railway embankment with the track on top (400 long, 70 high) ---------- */
  defineObj({
    id: 'rail.embankment', category: 'rail', size: [468, 137], variants: 2, seasonal: true, shapeBySeason: true, flippable: true,
    palette: Object.assign({ base: { ballast: ['#8a8278', '#6a645c', '#aaa298'], sleeper: '#4a3a2e', rail: ['#9aa0a6', '#5a5e62'], post: '#3a3a3e', wire: '#2a2a2e', cable: '#6a6a6a' } }, bySeason({ grass: GRASS, scrub: SCRUB })),
    tags: ['uk', 'railway', 'embankment', 'track', 'kit:temperate', 'kit:london', 'role:street'],
    credit: 'the Fleet Pond view art (the main line embankment)',
    build(v, r, ctx) {
      const W = 220, top = -64, body = [];
      body.push(['@grass.0', `M${-W} 0L${-W + 4} ${top + 12}H${W - 4}L${W} 0z`], ['@grass.1', `M${-W + 4} ${top + 12}H${W - 4}l-1 14H${-W + 5}z`, .8]);
      // rough grass texture and a line of lineside scrub along the foot
      let tf = ''; for (let i = 0; i < 70; i++) { const x = rr(r, -W + 6, W - 6), y = rr(r, top + 18, -2), h = rr(r, 4, 9), a = rr(r, -.5, .5); tf += `M${f1(x)} ${f1(y)}l${f1(a * h)} ${f1(-h)}`; }
      body.push({ s: '@grass.2', w: 1.2, op: .6, d: tf, detail: true });
      const sc = ['', ''], bl = []; for (let i = 0; i < 14; i++) { const x = rr(r, -W + 10, W - 10), w = rr(r, 12, 26), h = rr(r, 10, 20); sc[i % 2] += sceneD.lobed(r, x, -h * .5, w, h * .6, 8, .3); if (ctx.season !== 'summer' && r() < .6) bl.push(sceneD.ell(x + rr(r, -w * .5, w * .5), -h * .7, 1.8, 1.8)); }
      body.push(['@scrub.0', sc[0]], ['@scrub.1', sc[1]]);
      if (ctx.season !== 'winter' || v) body.push(['@scrub.2', bl.join('')]);
      // ballast shoulder, sleepers, two rails
      body.push(['@ballast.1', `M${-W + 2} ${top + 12}L${-W + 8} ${top}H${W - 8}L${W - 2} ${top + 12}z`], ['@ballast.0', rect(-W + 8, top - 1, 2 * W - 16, 5)]);
      let sl = ''; for (let x = -W + 10; x < W - 10; x += 9) sl += rect(x, top - 3, 5, 3);
      body.push(['@sleeper', sl], ['@rail.1', rect(-W + 8, top - 6, 2 * W - 16, 3)], ['@rail.0', rect(-W + 8, top - 6, 2 * W - 16, 1.2)]);
      // overhead line masts on the second variant (the third rail is the norm here; the masts are for other lines)
      if (v) { let m = ''; for (let x = -W + 30; x < W; x += 140) m += `M${x} ${top}v-64h26`; body.push({ s: '@post', w: 3, d: m }, { s: '@wire', w: .8, d: `M${-W} ${top - 60}H${W}` }); }
      else body.push({ s: '@cable', w: 2.4, d: `M${-W + 8} ${top + 7}H${W - 8}` });   // the cable trough beside the track
      return { body };
    },
  });

  /* ---------- rail.train: a four-car electric unit, generic livery; v0 blue and grey, v1 white and green, v2 dark grey and yellow ---------- */
  defineObj({
    id: 'rail.train', category: 'rail', size: [649, 43], variants: 3, seasonal: false, flippable: true,
    palette: { base: {
      body: ['#3a4a64', '#e8e8e2', '#4a4e56'], stripe: ['#c8c8c4', '#2f7a4a', '#e8c030'], roof: ['#7a8088', '#8a9098', '#6a6e74'], under: '#20262c',
      glass: ['#33404e', '#4a5a6a'], door: ['#2a3448', '#c8c8c0', '#3a3e44'], nose: '#f2c431', cab: '#1c2430', bogie: '#2a2a2e', lamp: '#f4f2e8',
    } },
    night: { glow: { window: '#ffdf9a' }, on: .95 },
    anim: { bob: { part: 'body', dy: .6, period: .9 } },
    shadow: { rx: 320, ry: 6, h: 50 },
    tags: ['uk', 'railway', 'train', 'commuter', 'kit:london', 'kit:vehicles', 'kit:temperate', 'role:vehicle'],
    credit: 'the Fleet Pond view art (the train on the main line), redrawn with cars, doors and bogies',
    build(v) {
      const cars = 4, cw = 160, gap = 3, ch = 34, L = cars * cw + (cars - 1) * gap, x0 = -L / 2, body = [];
      for (let i = 0; i < cars; i++) {
        const cx = x0 + i * (cw + gap), front = i === cars - 1, back = i === 0;
        const shell = front ? `M${cx} -6V${-ch - 6}h${cw - 16}q10 0 14 10l2 ${ch - 4}H${cx}z` : back ? `M${cx + 4} -6V${-ch - 2}q0-4 6-4h${cw - 10}V-6z` : rect(cx, -ch - 6, cw, ch);
        body.push([`@body.${v}`, shell], [`@roof.${v}`, rect(cx + (back ? 6 : 0), -ch - 8, cw - (front ? 18 : back ? 6 : 0), 3)], [`@stripe.${v}`, rect(cx + (back ? 4 : 0), -14, cw - (front ? 2 : back ? 4 : 0), 3)]);
        // windows (glow) in bays between the two pairs of doors
        for (let j = 0; j < 9; j++) { const wx = cx + 12 + j * 15.5; if (j === 2 || j === 6) { body.push([`@door.${v}`, rect(wx - 1, -ch - 2, 12, ch - 6)], { f: '@glass.0', d: rect(wx + 1.5, -ch, 7, 9), glow: 'window' }); continue; } body.push({ f: '@glass.0', d: rect(wx, -ch + 2, 11, 11), glow: 'window' }, ['@glass.1', `M${f1(wx)} ${f1(-ch + 2)}h5l-5 6z`, .5]); }
        body.push(['@bogie', rect(cx + 14, -6, 26, 6) + rect(cx + cw - 40, -6, 26, 6)], ['@under', rect(cx + 2, -6, cw - 4, 2)]);
        if (i < cars - 1) body.push(['@under', rect(cx + cw, -ch, gap, ch - 6)]);
      }
      // the cab: a yellow warning nose, the windscreen, headlamps
      const fx = x0 + L;
      body.push(['@nose', `M${fx - 2} -6V-22l2 0q2 0 2 2v14z`], ['@nose', rect(fx - 14, -14, 12, 8)], ['@cab', `M${fx - 14} ${-ch - 2}h8q6 2 8 10v4h-16z`], ['@lamp', rect(fx - 6, -12, 4, 2.4)]);
      body.push({ f: '@glass.0', d: rect(fx - 30, -ch + 2, 12, 11), glow: 'window' });
      return { body };
    },
  });
})();
