/* ============================================================
   SCENE LIBRARY: landmark.mount-fuji (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   A NATURAL landmark (tag 'natural': no lit part needed), refined from the hand-drawn
   jp-signature art:
   - the real form: the broad, symmetrical stratovolcano with concave lower slopes rising to
     steeper upper slopes and a FLAT, slightly notched crater rim; the gullies (the long
     ravines) running down from the rim; the dark forest belt at its foot
   - lit from the left: the right-hand flank in shade, the gullies as darker streaks
   - seasons (shapeBySeason): the snow cap reaches far down in winter and spring, retreats to
     a few streaks near the summit in summer, and returns as a small fresh cap in autumn; the
     forest belt green, autumn-tinted, snow-dusted in winter
   No text. Anchor: the ground at the middle of the foot (the mountain is placed in the
   horizon layer, where the haze softens it).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, define, seasons } = sceneDraw;
  const W = 760, H = 400, RIM = 58;                 // half width at the foot, height, half width of the crater rim
  const profile = (t) => { const u = Math.abs(t); return -H * (0.55 * Math.pow(1 - u, 2.6) + 0.45 * Math.pow(1 - u, 1.5)); };   // a concave volcano profile, t in -1..1
  define({
    id: 'landmark.mount-fuji', category: 'landmark', size: [1520, 400], box: [-764, -406, 764, 4], variants: 1, seasonal: true, shapeBySeason: true, flippable: false, parts: ['body'],
    palette: Object.assign({ base: {
      rock: ['#6e78a0', '#4e5680', '#8a92b8'], gully: ['#454c74', '#5a6288'], snow: ['#f6f8fc', '#d8deec', '#b8c2da'],
    } }, seasons({
      forest: { spring: ['#4a6a54', '#5e7e5a'], summer: ['#36584a', '#466a50'], autumn: ['#6a5a40', '#7e6a44'], winter: ['#4a5664', '#6a7484'] },
      flank: { spring: ['#6a74a0', '#4e5680'], summer: ['#5e6a8e', '#465074'], autumn: ['#74708e', '#565474'], winter: ['#7a84aa', '#5a6288'] },
    })),
    shadow: false,
    reflect: true,
    tags: ['landmark', 'natural', 'place:asia/country:JP', 'asia', 'asia-east', 'mountain', 'volcano'],
    credit: 'native (scene engine pilot), after the hand-drawn jp-signature art',
    build(v, r, ctx) {
      const s = ctx.season, body = [];
      // the outline: foot to rim to foot, the rim flat with small notches
      let d = `M${-W} 0`;
      for (let i = 1; i <= 40; i++) { const t = -1 + i / 40 * (1 - RIM / W); d += `L${f1(t * W)} ${f1(profile(t))}`; }
      const rimY = profile(RIM / W);
      d += `L${-RIM + 14} ${f1(rimY - 3)}L${-RIM + 22} ${f1(rimY + 2)}L${-6} ${f1(rimY - 2)}L8 ${f1(rimY + 1)}L${RIM - 16} ${f1(rimY - 3)}L${RIM} ${f1(rimY)}`;
      for (let i = 0; i <= 40; i++) { const t = (RIM / W) + i / 40 * (1 - RIM / W); d += `L${f1(t * W)} ${f1(profile(t))}`; }
      d += 'z';
      body.push(['@flank.0', d]);
      // the shaded right flank
      let sd = `M${RIM * 0.3} ${f1(rimY + 2)}`;
      for (let i = 0; i <= 40; i++) { const t = (RIM / W) + i / 40 * (1 - RIM / W); sd += `L${f1(t * W)} ${f1(profile(t))}`; }
      sd += `L${f1(W * 0.18)} 0Q${f1(W * 0.05)} ${f1(-H * 0.5)} ${RIM * 0.3} ${f1(rimY + 2)}z`;
      body.push(['@flank.1', sd, 0.8]);
      // gullies: long streaks from near the rim
      // each gully (the radial ravines of the cone) its own stroke, heavier on the shaded side
      let gl = '';
      for (let k = 0; k < 22; k++) {
        const side = k % 2 ? 1 : -1, t0 = side * (RIM / W) * (0.2 + r() * 0.8), t1 = side * (0.18 + r() * 0.5);
        const x0 = t0 * W, y0 = rimY + 5, x1 = t1 * W, y1 = profile(Math.abs(t1)) * 0.94, g = `M${f1(x0)} ${f1(y0)}Q${f1(x0 + (x1 - x0) * 0.35)} ${f1(y0 + (y1 - y0) * 0.55)} ${f1(x1)} ${f1(y1)}`;
        gl += g;
        body.push({ s: side > 0 ? '@gully.0' : '@gully.1', w: side > 0 ? 1.8 : 1.3, op: 0.45, d: g });
      }
      // the lava ridges between the gullies on the lower flanks, the lit left shoulder, the Hoei crater on the right flank
      for (let k = 0; k < 14; k++) { const t = (k < 7 ? -1 : 1) * (0.3 + (k % 7) * 0.08 + r() * 0.03), x = t * W, y = profile(Math.abs(t)); body.push({ s: k < 7 ? '@rock.2' : '@gully.0', w: 1, op: 0.35, d: `M${f1(x)} ${f1(y + 2)}Q${f1(x * 1.06)} ${f1(y * 0.6)} ${f1(x * 1.12)} ${f1(y * 0.25)}` }); }
      body.push(['@rock.2', `M${-RIM} ${f1(rimY)}Q${f1(-W * 0.2)} ${f1(-H * 0.55)} ${f1(-W * 0.5)} ${f1(profile(0.5))}L${f1(-W * 0.46)} ${f1(profile(0.46))}Q${f1(-W * 0.16)} ${f1(-H * 0.6)} ${-RIM + 10} ${f1(rimY + 4)}z`, 0.35]);
      const hx = W * 0.3, hy = profile(0.3);
      body.push(['@flank.1', `M${f1(hx - 40)} ${f1(hy + 6)}Q${f1(hx)} ${f1(hy - 14)} ${f1(hx + 44)} ${f1(hy + 10)}z`, 0.9], ['@gully.0', `M${f1(hx - 14)} ${f1(hy + 2)}Q${f1(hx + 2)} ${f1(hy - 6)} ${f1(hx + 16)} ${f1(hy + 4)}z`, 0.7]);
      // the tree line (where the forest gives way to bare cinder, about a third of the way up), the summit huts on the rim
      const tl = 0.62; let tld = '';
      for (let i = 0; i <= 24; i++) { const t = -tl + i / 24 * 2 * tl; tld += (i ? 'L' : 'M') + f1(t * W) + ' ' + f1(profile(Math.abs(t)) * 0.92 + (i % 2 ? 3 : -2)); }
      body.push({ s: '@forest.0', w: 3, op: 0.35, d: tld }, ['@rock.1', rect(-RIM + 18, rimY - 5, 7, 4) + rect(RIM - 30, rimY - 6, 8, 5)], { s: '@rock.2', w: 1.4, op: 0.4, d: `M${f1(-W * 0.62)} ${f1(profile(0.62))}Q${f1(-W * 0.35)} ${f1(profile(0.35) - 6)} ${f1(-W * 0.12)} ${f1(profile(0.12) - 4)}` });
      // scree bands just under the rim
      for (let k = 0; k < 8; k++) { const t = -0.11 + k * 0.03, x = t * W, y = profile(Math.abs(t)); body.push({ s: '@rock.0', w: 1, op: 0.3, d: `M${f1(x)} ${f1(y + 4)}l${f1(t * 30)} ${f1(18 + k % 3 * 6)}`, detail: true }); }
      // the snow by season: how far down the cap reaches (a share of the height), and how ragged its edge
      const reach = { winter: 0.62, spring: 0.5, autumn: 0.24, summer: 0.1 }[s];
      const capY = rimY + H * reach, edge = [];
      const tAt = (y) => { let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (profile(m) < y) lo = m; else hi = m; } return lo; };   // the profile inverted: where the slope reaches height y
      const tc = tAt(capY);
      let cap = `M${f1(-tc * W)} ${f1(capY)}`;
      const pts = [];
      for (let i = 0; i <= 30; i++) { const x = -tc * W + i / 30 * (2 * tc * W), end = i === 0 || i === 30, dip = H * reach * (0.03 + Math.pow(r(), 2.2) * 0.42); const yy = end ? capY : i % 2 ? capY - dip * 0.3 : capY + dip * (s === 'summer' ? 0.5 : 1); pts.push([x, Math.max(yy, profile(Math.min(0.999, Math.abs(x) / W)) + 1)]); }
      for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], q = pts[i]; cap += `Q${f1(p[0])} ${f1(p[1])} ${f1((p[0] + q[0]) / 2)} ${f1((p[1] + q[1]) / 2)}`; }
      cap += `L${f1(pts[pts.length - 1][0])} ${f1(pts[pts.length - 1][1])}`;
      for (let i = 40; i >= 0; i--) { const t = (RIM / W) + i / 40 * (tc - RIM / W); cap += `L${f1(t * W)} ${f1(profile(t))}`; }
      cap += `L${RIM} ${f1(rimY)}L${RIM - 16} ${f1(rimY - 3)}L8 ${f1(rimY + 1)}L-6 ${f1(rimY - 2)}L${-RIM + 22} ${f1(rimY + 2)}L${-RIM + 14} ${f1(rimY - 3)}L${-RIM} ${f1(rimY)}`;
      for (let i = 0; i <= 40; i++) { const t = -(RIM / W) - i / 40 * (tc - RIM / W); cap += `L${f1(t * W)} ${f1(profile(t))}`; }
      cap += 'z';
      if (s === 'summer') {
        // summer: only streaks of old snow in the gullies near the top
        for (let k = 0; k < 14; k++) { const x = -RIM * 1.4 + k * RIM * 0.2 + (r() - 0.5) * 8, y = rimY + 6 + r() * 8; body.push({ s: '@snow.0', w: 2.6, op: 0.9, d: `M${f1(x)} ${f1(y)}l${f1((x < 0 ? -1 : 1) * (6 + r() * 18))} ${f1(14 + r() * 34)}` }); }
        body.push(['@snow.1', cap, 0.25]);
      } else {
        body.push(['@snow.0', cap], ['@snow.2', `M${RIM * 0.3} ${f1(rimY + 2)}L${f1(tc * W)} ${f1(capY)}L${f1(tc * W * 0.4)} ${f1(capY + 6)}z`, 0.55]);
        body.push({ s: '@snow.2', w: 1.2, op: 0.5, d: gl, detail: true });
      }
      // the forest belt at the foot
      // the forest belt at the foot: a band (what a tile shows), then its crowns in twelve stands (full size)
      body.push(['@forest.1', `M${-W} 0Q${f1(-W * 0.5)} -16 0 -12Q${f1(W * 0.5)} -16 ${W} 0z`]);
      const fo = new Array(12).fill('');
      for (let k = 0; k < 60; k++) { const x = -W * 0.95 + k * W * 1.9 / 60 + (r() - 0.5) * 10, y = -2 - r() * 6; fo[Math.floor(k / 5)] += sceneDraw.blob(r, x, y, 18 + r() * 10, 9 + r() * 6, 7, 0.4); }
      fo.forEach((d, i) => body.push({ f: i % 2 ? '@forest.0' : '@forest.1', d, detail: true }));
      return { body };
    },
  });
})();
