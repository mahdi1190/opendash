/* ============================================================
   SCENE LIBRARY: buildings, coast-country kit (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   Coast and countryside buildings: a lighthouse, a row of beach huts, an oast
   house, a windmill (smock, tower and post) and a thatched cottage. Generic
   designs, no names, liveries or lettering. Front elevations lit from the
   LEFT; windows light at real dusk (glow 'window'); roofs carry snow in
   winter and the grass at the foot follows the season. Anchor: the ground
   at the middle of the front.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const circ = (x, y, r) => ell(x, y, r, r);
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const poly = pts => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'z';
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  const bySeason = (o) => { const p = {}; for (const s of SEAS) p[s] = {}; for (const [slot, v] of Object.entries(o)) for (const s of SEAS) p[s][slot] = v[s]; return p; };
  const hx = c => { const n = parseInt(String(c).slice(1), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  /** A colour set [base, shade, light, deep] from one colour. */
  const tone4 = c => [c, mix(c, '#000000', .28), mix(c, '#ffffff', .25), mix(c, '#000000', .52)];
  /** Structural randomness that does NOT change with the season (shapeBySeason objects re-seed r per season). */
  const srnd = k => sceneRnd(sceneHash(k));
  /** A rotation matrix of deg degrees about (cx, cy), and shapes with a matrix applied. */
  const rot = (deg, cx, cy) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, f1(cx - c * cx + s * cy), f1(cy - s * cx - c * cy)].map(n => Math.round(n * 1e4) / 1e4); };
  const withM = (shapes, m) => shapes.filter(Boolean).map(sh => Array.isArray(sh) ? { f: sh[0], d: sh[1], op: sh[2], m } : Object.assign({}, sh, { m }));
  /** A scalloped clump outline (foliage, fleece, rubble): n lobes round an ellipse. */
  const lobed = (r, cx, cy, rx, ry, n, rag = .3) => {
    const a = i => (i / n) * Math.PI * 2 - Math.PI / 2, k = Array.from({ length: n }, () => 1 - rag * r());
    const P = i => [cx + Math.cos(a(i)) * rx * k[i % n], cy + Math.sin(a(i)) * ry * k[i % n]];
    let d = `M${f1(P(0)[0])} ${f1(P(0)[1])}`;
    for (let i = 0; i < n; i++) { const am = (a(i) + a(i + 1)) / 2, km = (k[i] + k[(i + 1) % n]) / 2 * 1.32, q = P(i + 1); d += `Q${f1(cx + Math.cos(am) * rx * km)} ${f1(cy + Math.sin(am) * ry * km)} ${f1(q[0])} ${f1(q[1])}`; }
    return d + 'z';
  };
  /** Seasonal grass: the palette slot 'grass' [mid, light, deep] for the four seasons. */
  const GRASS = { spring: ['#5f9a3a', '#8ab84e', '#3e6e2a'], summer: ['#4d7f2e', '#78a040', '#345a22'], autumn: ['#7d7a3a', '#a8954c', '#585428'], winter: ['#5e6450', '#7c7c64', '#40463a'] };
  /** Grass tufts along the ground from x0 to x1 at y (blades h tall): three shapes. */
  const tufts = (r, x0, x1, n, h, y = 0) => {
    const p = ['', '', ''];
    for (let i = 0; i < n; i++) {
      const x = x0 + (x1 - x0) * (i + r()) / n, hh = h * rr(r, .5, 1.2), l = rr(r, -3, 3);
      p[i % 3] += `M${f1(x - 3)} ${f1(y + 1)}Q${f1(x - 2 + l * .3)} ${f1(y - hh * .5)} ${f1(x - 3 + l)} ${f1(y - hh)}Q${f1(x + l * .2)} ${f1(y - hh * .45)} ${f1(x + 1)} ${f1(y + 1)}z`
        + `M${f1(x)} ${f1(y + 1)}Q${f1(x + 2 + l * .3)} ${f1(y - hh * .4)} ${f1(x + 4 + l)} ${f1(y - hh * .8)}Q${f1(x + 3)} ${f1(y - hh * .35)} ${f1(x + 3)} ${f1(y + 1)}z`;
    }
    return [['@grass.2', p[2]], ['@grass.0', p[0]], ['@grass.1', p[1]]];
  };

  const PAL_FOOT = bySeason({ grass: GRASS });
  /** A casement window (frame, glass that lights at dusk, glazing bars, sill). */
  const win = (x, y, w, h, o = {}) => {
    const out = [['@frame', rect(x - 1.5, y - 1.5, w + 3, h + 3)], { f: '@glass.0', d: rect(x, y, w, h), glow: 'window' }, ['@glass.1', `M${f1(x)} ${f1(y)}h${f1(w * .45)}l${f1(-w * .45)} ${f1(h * .55)}z`, .35]];
    if (o.lead) { let d = ''; for (let i = -3; i <= 3; i++) d += `M${f1(x + w / 2 + i * w / 3.5)} ${f1(y)}l${f1(h * .5)} ${f1(h)}M${f1(x + w / 2 + i * w / 3.5)} ${f1(y)}l${f1(-h * .5)} ${f1(h)}`; out.push({ s: '@frame', w: .5, op: .45, d, detail: true }); }
    if (o.bars !== false) out.push({ s: '@frame', w: 1, d: `M${f1(x + w / 2)} ${f1(y)}v${f1(h)}` + (o.lead ? '' : `M${f1(x)} ${f1(y + h / 2)}h${f1(w)}`) });
    if (o.sill !== false) out.push(['@sill', rect(x - 3, y + h + 1.4, w + 6, 2.4)]);
    return out;
  };
  const SNOW = '#f2f6fa';

  /* ---------- building.lighthouse: v0 white with red bands and a keeper's cottage, v1 tall plain white with a black lantern, v2 black and white bands with a cottage ---------- */
  defineObj({
    id: 'building.lighthouse', category: 'building', size: [340, 560], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['body', 'lantern', 'lit'],
    palette: Object.assign({ base: {
      wall: ['#f3f0e8', '#d0ccc2', '#ffffff'], band: ['#b8322a', '#d8d4ca', '#1f2326'], iron: ['#23282d', '#3a4148', '#6a747c'], glass: ['#7f9eaa', '#c8dde4'], lamp: '#f2ecd2',
      stone: ['#8a8478', '#6a655c', '#a8a294'], render: ['#f0ece2', '#c8c2b4'], slate: ['#4a4f58', '#3a3e46', '#6a707a'], door: ['#2f4a5a', '#1f2a30'], frame: '#f4f2ec', sill: '#d8d2c4',
      chimney: ['#8a8478', '#5e5a50'], rock: ['#7a7568', '#5e5a50', '#9a958a', '#4a463e'], shade: '#1c2230', snow: SNOW,
    } }, PAL_FOOT),
    night: { glow: { window: '#ffd98a', lamp: '#fff4c0' }, on: .85 },
    anim: { flicker: { part: 'lantern', op: [.72, 1], period: 6 } },
    shadow: { rx: 70, ry: 9, h: 420 },
    reflect: true,
    tags: ['uk', 'coast', 'seaside', 'headland', 'lighthouse', 'signature', 'kit:temperate', 'kit:water', 'role:building-mid'],
    credit: 'coast-country kit (a generic British lighthouse; no real station copied)',
    build(v, r, ctx) {
      const s = ctx.season, H = [380, 430, 350][v], B = [44, 40, 48][v], T = [27, 23, 30][v];
      const hw = y => B - (B - T) * Math.min(1, -y / H), trap = (y0, y1) => poly([[-hw(y0), y0], [hw(y0), y0], [hw(y1), y1], [-hw(y1), y1]]);
      const body = [], sr = srnd('lighthouse|' + v);
      // the keeper's cottage on the left (v0, v2), drawn first so the tower stands in front of its gable
      if (v !== 1) {
        const cx0 = -B - 116, cw = 112, ch = 54;
        body.push(['@render.0', rect(cx0, -ch, cw, ch)], ['@render.1', rect(cx0 + cw * .8, -ch, cw * .2, ch), .6], ['@render.1', rect(cx0, -6, cw, 6), .6]);
        body.push(['@slate.0', poly([[cx0 - 6, -ch + 2], [cx0 + 18, -ch - 34], [cx0 + cw - 18, -ch - 34], [cx0 + cw + 6, -ch + 2]])], ['@slate.1', poly([[cx0 + cw - 18, -ch - 34], [cx0 + cw + 6, -ch + 2], [cx0 + cw - 30, -ch + 2]]), .6], ['@slate.2', rect(cx0 + 18, -ch - 35, cw - 36, 2.5), .8]);
        body.push(['@chimney.0', rect(cx0 + 22, -ch - 50, 12, 24)], ['@chimney.1', rect(cx0 + 20, -ch - 52, 16, 4)]);
        if (s === 'winter') body.push(['@snow', `M${cx0 + 14} ${-ch - 30}L${cx0 + 20} ${-ch - 35}H${cx0 + cw - 20}L${cx0 + cw - 12} ${-ch - 26}q-8 3 -14 -1q-10 4 -20 0q-12 4 -24 0q-12 4 -22 0q-8 3 -14 -2z`]);
        body.push(...win(cx0 + 12, -ch + 12, 18, 18), ...win(cx0 + 74, -ch + 12, 18, 18), ['@door.0', rect(cx0 + 44, -36, 16, 36)], { f: '@glass.0', d: rect(cx0 + 47, -33, 10, 6), glow: 'window' });
        body.push(['@render.1', rect(cx0 - 14, -14, 18, 14)], ['@render.0', rect(cx0 - 16, -16, 22, 3)]);
      }
      // the stone plinth
      body.push(['@stone.0', rect(-B - 12, -16, 2 * B + 24, 16)], ['@stone.1', rect(B - 6, -16, 18, 16), .7], { s: '@stone.1', w: .8, op: .6, d: `M${-B - 12} -8h${2 * B + 24}` + Array.from({ length: 7 }, (_, i) => `M${f1(-B - 4 + i * (2 * B + 8) / 6)} ${i % 2 ? -16 : -8}v8`).join('') });
      // the tower: a tapered drum, lit from the left
      body.push(['@wall.0', trap(-16, -H)]);
      if (v === 0) for (const [a, b] of [[.2, .32], [.52, .64], [.84, .96]]) body.push(['@band.0', trap(-H * a, -H * b)]);
      if (v === 2) for (let i = 0; i < 4; i++) body.push(['@band.2', trap(-16 - (H - 16) * (i * .25 + .125), -16 - (H - 16) * (i * .25 + .25))]);
      body.push(['@wall.2', poly([[-hw(-16) + 3, -16], [-hw(-16) + 11, -16], [-hw(-H) + 8, -H], [-hw(-H) + 3, -H]]), .35]);
      body.push(['@shade', poly([[B * .28, -16], [hw(-16), -16], [hw(-H), -H], [T * .28, -H]]), .2], ['@shade', poly([[B * .66, -16], [hw(-16), -16], [hw(-H), -H], [T * .66, -H]]), .16]);
      // windows up the stair, staggered, and the door with its hood
      for (const [k, sd] of [[.2, -1], [.42, 1], [.62, -1], [.8, 1]]) { const y = -H * k, x = sd * hw(y) * .28; body.push(['@iron.0', rect(x - 4.5, y - 8, 9, 15)], { f: '@glass.0', d: rect(x - 3, y - 6.5, 6, 12), glow: 'window' }); }
      body.push(['@door.0', 'M-8 -16v-24q8-9 16 0v24z'], ['@door.1', 'M2 -16v-24q4 2 6 4v20z', .6], ['@stone.2', 'M-12 -42q12-14 24 0h-3q-9-9-18 0z']);
      // the gallery: corbels, the deck, the railing
      const gy = -H;
      body.push(['@iron.0', poly([[-hw(gy) - 2, gy + 10], [hw(gy) + 2, gy + 10], [T + 12, gy - 1], [-T - 12, gy - 1]])], ['@iron.1', rect(-T - 14, gy - 6, 2 * T + 28, 6)], ['@iron.2', rect(-T - 14, gy - 6, 2 * T + 28, 1.6), .7]);
      let rail = `M${-T - 13} ${gy - 20}h${2 * T + 26}M${-T - 13} ${gy - 13}h${2 * T + 26}`; for (let x = -T - 12; x <= T + 12; x += 6) rail += `M${f1(x)} ${gy - 6}v-14`;
      body.push({ s: '@iron.0', w: 1.3, d: rail });
      // the lantern room: pedestal, glazing (lights at dusk), astragals, the domed cap, ball vent, rod and vane
      const lw = T * .78, ly0 = gy - 16, ly1 = gy - 50;
      body.push([v === 1 ? '@iron.0' : '@wall.0', rect(-lw - 2, gy - 18, 2 * lw + 4, 12)], ['@shade', rect(lw * .3, gy - 18, lw * .7 + 2, 12), .2]);
      body.push({ f: '@glass.0', d: rect(-lw, ly1, 2 * lw, ly0 - ly1 - 2), glow: 'lamp' }, ['@glass.1', `M${f1(-lw)} ${ly1}h${f1(lw * .7)}l${f1(-lw * .7)} 20z`, .3]);
      body.push({ s: '@iron.0', w: 1.6, d: `M${f1(-lw)} ${ly1}v${ly0 - ly1}M${f1(-lw / 3)} ${ly1}v${ly0 - ly1}M${f1(lw / 3)} ${ly1}v${ly0 - ly1}M${f1(lw)} ${ly1}v${ly0 - ly1}M${f1(-lw)} ${ly1 + 15}h${f1(2 * lw)}` }, { s: '@iron.0', w: .7, op: .5, d: `M${f1(-lw)} ${ly1}L${f1(lw)} ${ly0 - 2}M${f1(lw)} ${ly1}L${f1(-lw)} ${ly0 - 2}`, detail: true });
      body.push(['@iron.0', `M${f1(-lw - 4)} ${ly1 + 1}Q${f1(-lw)} ${ly1 - 20} 0 ${ly1 - 24}Q${f1(lw)} ${ly1 - 20} ${f1(lw + 4)} ${ly1 + 1}z`], ['@iron.2', `M${f1(-lw)} ${ly1 - 2}Q${f1(-lw + 2)} ${ly1 - 16} ${f1(-lw * .2)} ${ly1 - 21}Q${f1(-lw * .6)} ${ly1 - 14} ${f1(-lw * .55)} ${ly1 - 2}z`, .45]);
      if (s === 'winter') body.push(['@snow', `M${f1(-lw * .8)} ${ly1 - 12}Q${f1(-lw * .3)} ${ly1 - 23} 0 ${ly1 - 24}Q${f1(lw * .3)} ${ly1 - 23} ${f1(lw * .8)} ${ly1 - 12}q-6 3 -10 0q-6 3 -12 0q-6 3 -12 0z`, .95]);
      body.push(['@iron.0', circ(0, ly1 - 29, 4.5)], ['@iron.2', circ(-1.5, ly1 - 30.5, 1.5), .6], { s: '@iron.0', w: 1.2, d: `M0 ${ly1 - 33}v-16M-7 ${ly1 - 42}h14M7 ${ly1 - 42}l-3 -2.5M7 ${ly1 - 42}l-3 2.5` });
      // rocks round the foot and a fringe of grass
      const rk = ['', '', ''];
      for (let i = 0; i < 9; i++) { const x = -B - 40 + i * (2 * B + 80) / 8 + rr(sr, -6, 6); if (v !== 1 && x < -B - 4) continue; rk[i % 3] += lobed(sr, x, -4, rr(sr, 9, 16), rr(sr, 5, 8), 6, .25); }
      body.push(['@rock.0', rk[0]], ['@rock.2', rk[1]], ['@rock.1', rk[2]], ['@rock.3', `M${-B - 44} 1h${2 * B + 88}v2h${-2 * B - 88}z`, .5]);
      body.push(...tufts(r, v === 1 ? -B - 40 : -B - 130, B + 40, v === 1 ? 14 : 26, 10));
      // the lamp itself (flickers as the optic turns), and the night beams
      const cy = (ly0 + ly1) / 2 - 1;
      const lantern = [{ f: '@lamp', d: ell(0, cy, lw * .42, 9), glow: 'lamp' }, { f: '@lamp', d: ell(0, cy, lw * .2, 4), glow: 'lamp' }];
      const beam = (x2, half) => ({ f: { lin: [[0, '#fff3c4', .5], [1, '#fff3c4', 0]], x1: 0, y1: cy, x2, y2: cy }, d: `M0 ${f1(cy - 4)}L${x2} ${f1(cy - half)}L${x2} ${f1(cy + half * .7)}L0 ${f1(cy + 4)}z` });
      const lit = [beam(250, 30), beam(-170, 18), { f: { rad: [[0, '#fff6d0', .55], [1, '#fff6d0', 0]], cx: 0, cy, r: 46 }, d: circ(0, cy, 46) }];
      return { body, lantern, lit };
    },
  });

  /* ---------- building.beach-huts: a row of painted timber huts on a low deck; v0 five, v1 four, v2 six; some doors open ---------- */
  defineObj({
    id: 'building.beach-huts', category: 'building', size: [300, 104], variants: 3, seasonal: false, flippable: true,
    palette: { base: {
      paint: ['#e2554e', '#f2c64e', '#5aa6d6', '#7cc8a4', '#f2a0b8', '#f6f4ee', '#2f6f9f', '#a8d8cc', '#f08a3c'],
      paintD: ['#b03c36', '#c89a30', '#3a7fae', '#56a07e', '#c87890', '#cfcabe', '#1f4f74', '#7eb0a4', '#c0662a'],
      trim: ['#fbfaf6', '#d8d4ca'], roof: ['#4a4e56', '#6a6e78', '#2e3238'], inside: ['#2a2420', '#4a3e34'], deck: ['#a8957a', '#7a6a54', '#c4b498'], glass: ['#8aa4b0', '#cfe0e6'],
      sand: ['#e2d1a8', '#c8b48a'], towel: ['#e8e2d0', '#4a8ac8', '#e85a50'],
    } },
    shadow: { rx: 150, ry: 8, h: 90 },
    tags: ['uk', 'coast', 'seaside', 'promenade', 'beach-huts', 'unlit', 'kit:temperate', 'kit:water', 'role:building-near'],
    credit: 'coast-country kit (generic beach huts)',
    build(v) {
      const n = [5, 4, 6][v], hw = 44, gap = 6, tot = n * (hw + gap) - gap, x0 = -tot / 2, sr = srnd('huts|' + v), body = [];
      const order = [0, 1, 2, 3, 4, 5, 6, 7, 8]; for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(sr() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      body.push(['@sand.0', `M${x0 - 16} 3q${tot / 2 + 16} -9 ${tot + 32} 0z`]);
      for (let i = 0; i < n; i++) {
        const x = x0 + i * (hw + gap), c = order[i], open = sr() < .3, stripe = !open && sr() < .22, roofC = `@roof.${Math.floor(sr() * 3)}`;
        body.push(['@deck.1', rect(x - 2, -9, hw + 4, 6)], ['@deck.0', rect(x - 2, -9, hw + 4, 2)], ['@deck.1', rect(x + 2, -3, 3, 3) + rect(x + hw - 5, -3, 3, 3)]);
        body.push([`@paint.${c}`, rect(x + 1, -66, hw - 2, 57)]);
        if (stripe) { let d = ''; for (let k = 0; k < 6; k++) d += rect(x + 1 + k * 7.3 + 3.6, -66, 3.6, 57); body.push([c === 5 ? '@paint.6' : '@trim.0', d]); }
        let boards = ''; for (let k = 1; k < 9; k++) boards += `M${f1(x + 1 + k * (hw - 2) / 9)} -66v57`;
        body.push({ s: `@paintD.${c}`, w: .7, op: .45, d: boards, detail: true }, [`@paintD.${c}`, rect(x + hw - 9, -66, 8, 57), .55], ['@trim.0', rect(x, -66, 2.4, 57) + rect(x + hw - 2.4, -66, 2.4, 57), .9]);
        // the doors: open (a dark interior, a towel on a hook, a folded chair) or shut with two small lights
        if (open) {
          body.push(['@inside.0', rect(x + 7, -58, hw - 14, 49)], ['@inside.1', rect(x + 7, -58, hw - 14, 6), .8], [`@towel.${1 + (i % 2)}`, rect(x + 11, -48, 7, 16)], ['@towel.0', rect(x + 23, -36, 8, 27)], ['@towel.2', rect(x + 23, -32, 8, 4) + rect(x + 23, -24, 8, 4) + rect(x + 23, -16, 8, 4)], ['@inside.1', rect(x + 22, -38, 10, 2.5)]);
          body.push([`@paint.${c}`, rect(x - 7, -58, 10, 49)], [`@paintD.${c}`, rect(x - 7, -58, 3, 49), .6], [`@paint.${c}`, rect(x + hw - 3, -58, 10, 49)], [`@paintD.${c}`, rect(x + hw + 4, -58, 3, 49), .6]);
        } else {
          body.push({ s: '@trim.1', w: 1.4, d: `M${x + 7} -9v-49h${hw - 14}v49M${x + hw / 2} -58v49` }, ['@glass.0', rect(x + 10, -54, 8, 10) + rect(x + hw - 18, -54, 8, 10)], ['@glass.1', rect(x + 10, -54, 4, 4) + rect(x + hw - 18, -54, 4, 4), .5], ['@trim.1', ell(x + hw / 2 - 3, -32, 1.2, 1.2) + ell(x + hw / 2 + 3, -32, 1.2, 1.2)]);
        }
        // the gable roof with white bargeboards and a little finial
        body.push([roofC, poly([[x - 5, -64], [x + hw / 2, -92], [x + hw + 5, -64]])], ['#000000', poly([[x + hw / 2, -92], [x + hw + 5, -64], [x + hw / 2 + 8, -64]]), .18], [`@paint.${c}`, poly([[x + 4, -66], [x + hw / 2, -86], [x + hw - 4, -66]])], [`@paintD.${c}`, poly([[x + hw / 2, -86], [x + hw - 4, -66], [x + hw / 2 + 6, -66]]), .5]);
        body.push({ s: '@trim.0', w: 2.6, d: `M${x - 5} -63L${x + hw / 2} -92L${x + hw + 5} -63` }, ['@trim.0', rect(x + hw / 2 - 1.2, -100, 2.4, 9)], ['@glass.0', `M${x + hw / 2 - 4} -72l4 -6 4 6z`, .9]);
      }
      body.push(['@sand.1', `M${x0 - 10} 1q${tot / 2 + 10} -4 ${tot + 20} 0v2h${-tot - 20}z`, .7]);
      return { body };
    },
  });

  /* ---------- building.oast-house: a Kentish hop kiln with its white cowl and the stowage barn; v0 one round kiln, v1 a pair, v2 a square kiln ---------- */
  defineObj({
    id: 'building.oast-house', category: 'building', size: [330, 260], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['body', 'cowl'],
    palette: Object.assign({ base: {
      brick: ['#a65a3e', '#84432e', '#c27a58', '#5e2e20'], tile: ['#8e4a32', '#6a3424', '#b0664a', '#4e2618'], board: ['#f2efe6', '#cfcabd', '#ffffff'], cowl: ['#f6f4ee', '#cdc8bc', '#2a2622'],
      frame: '#f1ede4', glass: ['#3a4a5a', '#c8dce8'], sill: '#d8d0c0', door: ['#2f4a3a', '#1f2e26'], snow: SNOW,
    } }, PAL_FOOT),
    night: { glow: { window: '#ffd98a' }, on: .6 },
    anim: { turn: { part: 'cowl', pivot: [-60, -206], deg: 12, period: 12, hold: .7 } },
    shadow: { rx: 130, ry: 10, h: 220 },
    tags: ['uk', 'kent', 'countryside', 'farm', 'oast-house', 'hops', 'signature', 'kit:temperate', 'role:building-mid'],
    credit: 'coast-country kit (a generic Kent / Sussex oast house)',
    build(v, r, ctx) {
      const s = ctx.season, body = [];
      // the Kentish cowl: a hood bent over its mouth, a fly-board behind, a vane on top ($n = cx + n)
      const cowlShapes = cx => { const P = d => d.replace(/\$(-?[\d.]+)/g, (_, n) => f1(cx + +n)); return [
        ['@board.1', P('M$-12 -192L$-9 -201H$9L$12 -192z')], ['@cowl.1', P('M$-12 -192H$12L$11.4 -194.5H$-11.4z'), .8], 
        ['@cowl.0', P('M$-8 -243L$-36 -247V-231L$-8 -225z')], ['@cowl.1', P('M$-36 -235L$-8 -230V-225L$-36 -231z'), .7], { s: '@cowl.1', w: .6, op: .6, d: P('M$-36 -243L$-9 -239M$-36 -239L$-9 -234'), detail: true },
        ['@cowl.0', P('M$-13 -199L$-12 -224Q$-12 -246 $5 -246Q$19 -245 $24 -229L$25 -219Q$19 -217 $14 -213L$13 -199z')],
        ['@cowl.1', P('M$3 -246Q$19 -245 $24 -229L$25 -219Q$19 -217 $14 -213L$13 -199H$5L$6 -224Q$7 -240 $3 -246z'), .55],
        ['@cowl.2', P('M$14 -213Q$19 -217 $25 -219Q$24 -212 $18 -208Q$15 -207 $14 -208z'), .7], ['@board.2', P('M$-12 -200L$-11 -224Q$-11 -240 $-5 -244Q$-8 -236 $-8 -224L$-9 -200z'), .8],
        { s: '@cowl.1', w: .7, op: .6, d: P('M$-12 -207Q$0 -205 $13 -207M$-12 -215Q$0 -213 $13.5 -215M$-12 -223Q$2 -221 $18 -224M$-10 -232Q$4 -231 $21 -235'), detail: true },
        { s: '@cowl.2', w: 1.3, d: P('M$4 -246V-260M$-6 -256H$12'), detail: true }, ['@cowl.2', P('M$16 -256L$10 -259.5V-252.5zM$-8 -259L$-3 -256L$-8 -253H$-10L$-6 -256L$-10 -259z'), .9],
      ]; };
      const kiln = (cx, square, ownCowl) => {
        const x = cx - 36;
        body.push(['@brick.0', rect(x, -98, 72, 98)]);
        body.push({ s: '@brick.3', w: .8, op: .28, d: Array.from({ length: 15 }, (_, i) => `M${x} ${-4 - i * 6.4}h72`).join(''), detail: true });
        if (square) body.push(['@brick.1', rect(cx + 14, -98, 22, 98), .7], ['@brick.2', rect(x, -98, 6, 98), .45]);
        else body.push({ f: { lin: [[0, '#000000', 0], [1, '#000000', .4]], x1: cx - 6, y1: 0, x2: cx + 36, y2: 0 }, d: rect(cx - 6, -98, 42, 98) }, { f: { lin: [[0, '#ffffff', .22], [1, '#ffffff', 0]], x1: x, y1: 0, x2: cx - 12, y2: 0 }, d: rect(x, -98, 24, 98) });
        body.push(['@brick.3', rect(x - 2, -100, 76, 4)], ['@door.0', rect(cx - 8, -26, 16, 26)], ['@door.1', rect(cx + 3, -26, 5, 26), .6]);
        if (square) body.push(['@tile.0', poly([[x - 5, -96], [cx - 5, -194], [cx + 5, -194], [x + 77, -96]])], ['@tile.1', poly([[cx, -194], [cx + 5, -194], [x + 77, -96], [cx + 6, -96]]), .75]);
        else body.push(['@tile.0', `M${x - 5} -96Q${cx - 18} -118 ${cx - 6} -194H${cx + 6}Q${cx + 18} -118 ${x + 77} -96z`], { f: { lin: [[0, '#000000', 0], [1, '#000000', .42]], x1: cx - 4, y1: 0, x2: cx + 40, y2: 0 }, d: `M${cx} -194H${cx + 6}Q${cx + 18} -118 ${x + 77} -96H${cx + 4}z` });
        let tl = ''; for (let i = 1; i < 9; i++) { const t = i / 9, y = -194 + 98 * t, hw = 6 + 35 * Math.pow(t, square ? 1 : 1.9); tl += `M${f1(cx - hw)} ${f1(y)}Q${cx} ${f1(y + 3 * t)} ${f1(cx + hw)} ${f1(y)}`; }
        body.push({ s: '@tile.3', w: .9, op: .4, d: tl, detail: true }, ['@tile.2', `M${x - 3} -97Q${cx - 16} -120 ${cx - 5} -192h3Q${cx - 12} -120 ${x + 8} -97z`, .35]);
        if (s === 'winter') body.push(['@snow', `M${cx - 9} -178Q${cx - 4} -186 ${cx} -186Q${cx + 4} -186 ${cx + 9} -178q-3 3 -6 0q-3 3 -6 0q-3 3 -6 0z`, .9]);
        if (!ownCowl) body.push(...cowlShapes(cx));
      };
      kiln(-60, v === 2, true);
      if (v === 1) kiln(14, false, false);
      // the stowage barn: brick below, white weatherboard above, a tiled roof, the loading lucam
      const bx = v === 1 ? 50 : -24, bw = v === 1 ? 118 : 144, bh = 104;
      body.push(['@brick.0', rect(bx, -50, bw, 50)], ['@brick.1', rect(bx + bw - 16, -50, 16, 50), .6], { s: '@brick.3', w: .8, op: .28, d: Array.from({ length: 7 }, (_, i) => `M${bx} ${-4 - i * 6.4}h${bw}`).join(''), detail: true });
      body.push(['@board.0', rect(bx, -bh, bw, bh - 50)], ['@board.1', rect(bx + bw - 16, -bh, 16, bh - 50), .6], { s: '@board.1', w: .8, op: .7, d: Array.from({ length: 9 }, (_, i) => `M${bx} ${-bh + 6 + i * 5.6}h${bw}`).join('') }, ['@brick.3', rect(bx, -52, bw, 3), .6]);
      body.push(['@tile.0', poly([[bx - 6, -bh + 2], [bx + 10, -bh - 40], [bx + bw - 10, -bh - 40], [bx + bw + 6, -bh + 2]])], ['@tile.1', poly([[bx + bw - 10, -bh - 40], [bx + bw + 6, -bh + 2], [bx + bw - 22, -bh + 2]]), .7], { s: '@tile.3', w: .9, op: .35, d: Array.from({ length: 6 }, (_, i) => { const t = (i + 1) / 7, y = -bh - 40 + 42 * t; return `M${f1(bx + 10 - 16 * t)} ${f1(y)}H${f1(bx + bw - 10 + 16 * t)}`; }).join(''), detail: true }, ['@tile.2', rect(bx + 10, -bh - 41, bw - 20, 2.5), .7]);
      if (s === 'winter') body.push(['@snow', `M${bx + 4} ${-bh - 28}L${bx + 10} ${-bh - 40}H${bx + bw - 10}L${bx + bw - 4} ${-bh - 28}q-10 4 -20 0q-12 5 -24 0q-12 5 -26 0q-12 5 -24 0q-12 5 -24 0z`]);
      const lx = bx + bw * .42;
      body.push(['@board.0', rect(lx - 14, -bh - 8, 28, 30)], ['@tile.0', poly([[lx - 18, -bh - 6], [lx, -bh - 22], [lx + 18, -bh - 6]])], ['@door.0', rect(lx - 9, -bh + 2, 18, 20)], ['@door.1', rect(lx + 3, -bh + 2, 6, 20), .6]);
      body.push(...win(bx + 14, -bh + 18, 16, 16), ...win(bx + bw - 32, -bh + 18, 16, 16), ...win(bx + 14, -40, 16, 18), ...win(bx + bw - 32, -40, 16, 18));
      body.push(['@door.0', rect(bx + bw * .45, -38, 24, 38)], { s: '@frame', w: 1, op: .6, d: `M${f1(bx + bw * .45 + 12)} -38v38M${f1(bx + bw * .45)} -38l24 38` });
      body.push(...tufts(r, -110, bx + bw + 6, 30, 11));
      return { body, cowl: cowlShapes(-60) };
    },
  });

  /* ---------- building.windmill: v0 a white smock mill, v1 a black tower mill with a white cap, v2 a post mill on its roundhouse; the sails turn ---------- */
  const HUB = [0, -236];
  defineObj({
    id: 'building.windmill', category: 'building', size: [310, 390], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['body', 'sails'],
    palette: Object.assign({ base: {
      board: ['#f2efe6', '#cfcabd', '#ffffff', '#a8a294'], tar: ['#2e2c2a', '#1a1918', '#55504a'], brick: ['#a65a3e', '#84432e', '#c27a58', '#5e2e20'], cap: ['#f4f2ec', '#c8c4b8', '#2e3a44'],
      sail: ['#f1ece0', '#cfc8b6'], cloth: ['#e8dcc0', '#c4b48e'], wood: ['#6a5a48', '#4a3e32', '#8a7a64'], iron: '#2a2e33', frame: '#f1ede4', glass: ['#3a4a5a', '#c8dce8'], sill: '#d8d0c0', door: ['#2f4a3a', '#1f2e26'], snow: SNOW,
    } }, PAL_FOOT),
    night: { glow: { window: '#ffd98a' }, on: .6 },
    anim: { spin: { part: 'sails', pivot: HUB, period: 16 } },
    shadow: { rx: 70, ry: 9, h: 300 },
    tags: ['uk', 'countryside', 'downs', 'windmill', 'mill', 'signature', 'kit:temperate', 'role:building-mid'],
    credit: 'coast-country kit (generic English smock, tower and post mills)',
    build(v, r, ctx) {
      const s = ctx.season, body = [], [hx0, hy] = HUB;
      if (v === 0) {
        // brick base, a stage gallery, the tapered eight-sided smock, the boat-shaped cap
        body.push(['@brick.0', poly([[-56, 0], [-52, -64], [52, -64], [56, 0]])], ['@brick.1', poly([[24, 0], [24, -64], [52, -64], [56, 0]]), .6], { s: '@brick.3', w: .8, op: .3, d: Array.from({ length: 10 }, (_, i) => `M-54 ${-4 - i * 6.2}h108`).join(''), detail: true });
        body.push(['@board.0', poly([[-46, -64], [-27, -214], [27, -214], [46, -64]])], ['@board.1', poly([[10, -64], [8, -214], [27, -214], [46, -64]]), .8], ['@board.3', poly([[30, -64], [21, -214], [27, -214], [46, -64]]), .5]);
        body.push({ s: '@board.3', w: .7, op: .55, d: Array.from({ length: 24 }, (_, i) => { const y = -70 - i * 6.1, w = 46 - 19 * ((-y - 64) / 150); return `M${f1(-w)} ${f1(y)}h${f1(2 * w)}`; }).join(''), detail: true });
        body.push({ s: '@board.3', w: 1, op: .6, d: 'M-14 -64L-9 -214M14 -64L9 -214' });
        body.push(['@wood.1', rect(-64, -70, 128, 6)], { s: '@wood.1', w: 1.2, d: 'M-63 -84h126' + Array.from({ length: 12 }, (_, i) => `M${f1(-62 + i * 11.3)} -70v-14`).join('') }, { s: '@wood.1', w: 1.4, d: 'M-60 -64l14 -10M60 -64l-14 -10' });
        body.push(['@cap.0', 'M-32 -212Q-34 -240 0 -246Q34 -240 32 -212z'], ['@cap.1', 'M6 -245Q34 -240 32 -212H6z', .7], ['@cap.1', rect(-34, -214, 68, 4)]);
        for (const [x, y] of [[-6, -110], [4, -160], [-4, -196]]) body.push(...win(x - 5, y, 10, 12, { sill: false }));
        body.push(['@door.0', rect(-10, -30, 20, 30)], ['@door.1', rect(4, -30, 6, 30), .6], ...win(-40, -44, 12, 14), ...win(28, -44, 12, 14));
        if (s === 'winter') body.push(['@snow', 'M-26 -236Q0 -250 26 -236q-4 4 -9 1q-5 4 -10 0q-6 4 -12 0q-6 3 -11 -1z', .95]);
      } else if (v === 1) {
        // the tarred brick tower, its white ogee cap and gallery
        body.push(['@tar.0', poly([[-48, 0], [-30, -216], [30, -216], [48, 0]])], ['@tar.2', poly([[-46, 0], [-38, 0], [-25, -216], [-29, -216]]), .7], ['@tar.1', poly([[12, 0], [10, -216], [30, -216], [48, 0]]), .7]);
        body.push({ s: '@tar.2', w: .6, op: .35, d: Array.from({ length: 30 }, (_, i) => { const y = -6 - i * 7, w = 48 - 18 * (-y / 216); return `M${f1(-w)} ${f1(y)}h${f1(2 * w)}`; }).join(''), detail: true });
        body.push(['@cap.0', 'M-36 -214Q-38 -232 -18 -240Q-4 -246 -2 -262h4Q4 -246 18 -240Q38 -232 36 -214z'], ['@cap.1', 'M2 -262Q4 -246 18 -240Q38 -232 36 -214H6z', .7], ['@cap.0', circ(0, -266, 4)], ['@wood.1', rect(-42, -218, 84, 5)], { s: '@cap.0', w: 1.1, d: 'M-41 -228h82' + Array.from({ length: 9 }, (_, i) => `M${-40 + i * 10} -218v-10`).join('') });
        for (const [x, y] of [[-14, -60], [8, -110], [-8, -160], [4, -196]]) body.push(['@cap.0', rect(x - 7, y - 2, 14, 18)], ...win(x - 5, y, 10, 14, { sill: false }));
        body.push(['@cap.0', 'M-12 0v-34q12-12 24 0v34z'], ['@door.0', 'M-9 0v-32q9-9 18 0v32z']);
        if (s === 'winter') body.push(['@snow', 'M-30 -226Q-14 -244 -2 -256h4Q12 -244 30 -226q-6 3 -10 0q-6 3 -12 -1q-6 4 -12 0q-6 3 -12 0z', .95]);
      } else {
        // the brick roundhouse, the trestle post, the white weatherboarded buck and its tailpole ladder
        body.push({ s: '@wood.1', w: 3.2, d: 'M40 -176L118 -6M48 -184L128 -8' }, { s: '@wood.1', w: 1.8, d: Array.from({ length: 10 }, (_, i) => { const t = (i + 1) / 11; return `M${f1(40 + 78 * t)} ${f1(-176 + 170 * t)}l9 -3`; }).join('') }, { s: '@wood.0', w: 3.6, d: 'M30 -166L150 -18' });
        body.push(['@brick.0', poly([[-50, 0], [-48, -56], [48, -56], [50, 0]])], { f: { lin: [[0, '#000000', 0], [1, '#000000', .38]], x1: 0, y1: 0, x2: 50, y2: 0 }, d: poly([[0, 0], [0, -56], [48, -56], [50, 0]]) }, { s: '@brick.3', w: .8, op: .3, d: Array.from({ length: 8 }, (_, i) => `M-49 ${-4 - i * 6.4}h98`).join(''), detail: true });
        body.push(['@tar.0', 'M-56 -54Q-30 -84 0 -88Q30 -84 56 -54z'], ['@tar.1', 'M0 -88Q30 -84 56 -54H0z', .6], ['@door.0', rect(-8, -28, 16, 28)], ...win(-36, -40, 10, 12, { sill: false }), ...win(26, -40, 10, 12, { sill: false }));
        body.push(['@wood.1', rect(-7, -176, 14, 92)], ['@wood.0', rect(-7, -176, 5, 92), .6]);
        body.push(['@board.0', 'M-44 -170V-280Q-44 -296 0 -300Q44 -296 44 -280V-170z'], ['@board.1', 'M14 -298Q44 -296 44 -280V-170H14z', .75], { s: '@board.3', w: .7, op: .5, d: Array.from({ length: 19 }, (_, i) => `M-44 ${-176 - i * 6}h88`).join(''), detail: true }, ['@board.3', rect(-46, -172, 92, 4)]);
        body.push(...win(-30, -206, 12, 14, { sill: false }), ...win(18, -200, 12, 14, { sill: false }), ...win(-30, -282, 10, 10, { sill: false }));
        if (s === 'winter') body.push(['@snow', 'M-40 -284Q-30 -296 0 -300Q30 -296 40 -284q-8 4 -14 0q-8 4 -16 0q-8 4 -14 0q-8 4 -14 0q-6 3 -10 -1z', .95], ['@snow', 'M-46 -62Q-24 -84 0 -86Q24 -84 46 -62q-8 3 -14 -1q-8 4 -16 0q-8 4 -16 0q-8 3 -14 0z', .9]);
      }
      body.push(...tufts(r, -80, v === 2 ? 150 : 80, 24, 11));
      // the four sails: stock, whips and lattice, with shutters (v0, v1) or cloth half-spread (v2); one arm drawn along +x then rotated
      const arm = [], top = -24, bot = 8;
      arm.push(['@wood.1', rect(14, -3, 138, 6)]);
      if (v === 2) arm.push(['@cloth.0', poly([[34, top + 1], [148, top + 1], [148, -3], [34, -3]]), .92], ['@cloth.1', poly([[34, -10], [148, -10], [148, -3], [34, -3]]), .6]);
      else arm.push(['@sail.0', rect(30, top, 120, -3 - top)], ['@sail.1', rect(30, top, 120, 5), .6], { s: '@sail.1', w: 1, op: .8, d: Array.from({ length: 14 }, (_, i) => `M${f1(34 + i * 8.4)} ${top}v${-3 - top}`).join('') });
      let lat = `M30 ${top}h120M30 ${f1(top / 2)}h120M30 -3h120M30 ${bot}h120`; for (let x = 30; x <= 150; x += 10) lat += `M${x} ${top}V${bot}`;
      arm.push({ s: '@wood.0', w: 1.1, d: lat }, { s: '@wood.1', w: 2, d: `M30 ${top}V${bot}M150 ${top}V${bot}` });
      const sails = [];
      for (let k = 0; k < 4; k++) { const m = rot(k * 90 + 30, 0, 0); m[4] = f1(m[4] + hx0); m[5] = f1(m[5] + hy); sails.push(...withM(arm, m)); }
      sails.push(['@iron', circ(hx0, hy, 9)], ['@cap.1', circ(hx0 - 2, hy - 2, 4), .8], ['@iron', circ(hx0, hy, 2)]);
      return { body, sails };
    },
  });

  /* ---------- building.thatched-cottage: long and low under deep thatch with a block-cut ridge; v0 whitewashed cob with eyebrow dormers, v1 timber-framed, v2 flint and brick ---------- */
  defineObj({
    id: 'building.thatched-cottage', category: 'building', size: [300, 200], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    palette: Object.assign({ base: {
      render: ['#f1ece0', '#cdc5b4', '#fbf8f0', '#a89c88'], timber: ['#2a2420', '#4a3e34'], flint: ['#7c8088', '#5a5e66', '#a8aab0', '#3e4048'], brick: ['#b0603e', '#86442c', '#cc7c58'],
      thatch: ['#a88a4c', '#7a6234', '#c8aa6c', '#5a4624'], ligger: '#d8c08a', frame: '#f1ede4', glass: ['#3a4a5a', '#c8dce8'], sill: '#d8d0c0', door: ['#2f4a3a', '#5a2a2a', '#2a3a5a'], step: '#a8a094',
      chimney: ['#a65a3e', '#6a3424'], pot: '#a0522d', path: '#b8ac94', stem: '#4a3a2a', snow: SNOW,
    } }, bySeason({
      grass: GRASS,
      leaf: { spring: ['#3f7a32', '#79aa45'], summer: ['#2f6a2c', '#4f8a38'], autumn: ['#7a6a2a', '#a8803a'], winter: ['#4a5038', '#5e6048'] },
      bloom: { spring: ['#f6d21e', '#fbf6f0', '#b8d870'], summer: ['#e0607a', '#f6b0c0', '#e8e0f0'], autumn: ['#c0402a', '#d8a040', '#9a5a2a'], winter: ['#8a3a2a', '#5a4a3a', '#4a3e30'] },
    })),
    night: { glow: { window: '#ffd98a' }, on: .65 },
    shadow: { rx: 130, ry: 10, h: 150 },
    tags: ['uk', 'village', 'countryside', 'cottage', 'thatched', 'house', 'kit:temperate', 'role:building-mid'],
    credit: 'coast-country kit (a generic English thatched cottage)',
    build(v, r, ctx) {
      const s = ctx.season, w = [236, 216, 252][v], h = 62, x0 = -w / 2, x1 = w / 2, body = [], sr = srnd('thatch|' + v);
      // the walls
      if (v === 2) {
        body.push(['@flint.0', rect(x0, -h, w, h)]);
        const fl = ['', '', '']; for (let i = 0; i < 260; i++) { const x = x0 + sr() * w, y = -h + sr() * h; fl[i % 3] += ell(x, y, rr(sr, 1.6, 3.2), rr(sr, 1.2, 2.2)); }
        body.push(['@flint.1', fl[0], .8], ['@flint.2', fl[1], .7], ['@flint.3', fl[2], .6]);
        let q = ''; for (let i = 0; i < 7; i++) q += rect(x0, -h + i * 9, i % 2 ? 8 : 13, 4.5) + rect(x1 - (i % 2 ? 8 : 13), -h + i * 9, i % 2 ? 8 : 13, 4.5);
        body.push(['@brick.0', q], ['@brick.0', rect(x0, -8, w, 8)], ['@brick.1', rect(x0, -8, w, 1.5), .7]);
      } else {
        body.push(['@render.0', rect(x0, -h, w, h)], ['@render.3', rect(x0, -7, w, 7), .45], ['@render.2', rect(x0, -h, 8, h), .5]);
        if (v === 1) {
          let tf = `M${x0 + 2} ${-h}v${h}M${x1 - 2} ${-h}v${h}M${x0} ${-h / 2}h${w}M${x0} -3h${w}`;
          for (let i = 1; i < 6; i++) tf += `M${f1(x0 + i * w / 6)} ${-h}v${h}`;
          tf += `M${f1(x0 + w / 6)} ${-h / 2}l${f1(w / 12)} ${f1(-h / 2)}M${f1(x1 - w / 6)} ${-h / 2}l${f1(-w / 12)} ${f1(-h / 2)}`;
          body.push({ s: '@timber.0', w: 3.4, d: tf });
        }
      }
      body.push(['#000000', rect(x1 - w * .2, -h, w * .2, h), .12]);
      // the chimney at the right end (behind the thatch ridge)
      body.push(['@chimney.0', rect(x1 - 52, -h - 118, 18, 50)], ['@chimney.1', rect(x1 - 40, -h - 118, 6, 50), .6], ['@chimney.1', rect(x1 - 54, -h - 120, 22, 4)], ['@pot', rect(x1 - 49, -h - 128, 5, 8) + rect(x1 - 42, -h - 127, 5, 7)]);
      // the thatch: deep eaves, half-hipped ends, a rounded body
      const ey = -h + 10, ry = -h - 92;
      body.push(['@thatch.0', `M${x0 - 18} ${ey}Q${x0 - 20} ${ey - 14} ${x0 - 8} ${ey - 30}Q${x0 + 14} ${ry + 26} ${x0 + 40} ${ry}H${x1 - 40}Q${x1 - 14} ${ry + 26} ${x1 + 8} ${ey - 30}Q${x1 + 20} ${ey - 14} ${x1 + 18} ${ey}Q0 ${ey + 6} ${x0 - 18} ${ey}z`]);
      body.push({ f: { lin: [[0, '#000000', 0], [1, '#000000', .3]], x1: 0, y1: 0, x2: x1 + 20, y2: 0 }, d: `M${f1(x1 * .4)} ${ry}H${x1 - 40}Q${x1 - 14} ${ry + 26} ${x1 + 8} ${ey - 30}Q${x1 + 20} ${ey - 14} ${x1 + 18} ${ey}H${f1(x1 * .4)}z` });
      let straw = ''; for (let i = 0; i < 46; i++) { const t = (i + .5) / 46, xt = x0 + 30 + t * (w - 60), xb = x0 - 14 + t * (w + 28); straw += `M${f1(xt + rr(sr, -2, 2))} ${f1(ry + 14 + rr(sr, 0, 8))}L${f1(xb)} ${f1(ey - 4 - rr(sr, 0, 10))}`; }
      body.push({ s: '@thatch.1', w: 1.1, op: .45, d: straw, detail: true }, ['@thatch.3', `M${x0 - 18} ${ey}Q0 ${ey + 6} ${x1 + 18} ${ey}l-1 -5Q0 ${ey} ${x0 - 17} ${ey - 5}z`, .7], ['@thatch.2', `M${x0 - 6} ${ey - 30}Q${x0 + 16} ${ry + 26} ${x0 + 40} ${ry + 2}l4 4Q${x0 + 20} ${ry + 30} ${x0 - 1} ${ey - 26}z`, .5]);
      // eyebrow dormers (the thatch sweeps over the upper windows)
      const dorm = v === 1 ? [x0 + w * .3, x0 + w * .7] : [x0 + w * .25, x0 + w * .55, x0 + w * .8];
      for (const dx of dorm) { body.push(['@thatch.2', `M${f1(dx - 26)} ${ey - 16}Q${f1(dx)} ${ey - 58} ${f1(dx + 26)} ${ey - 16}z`], ['@thatch.3', `M${f1(dx - 13)} ${ey - 16}h26v-4h-26z`, .5]); body.push(...win(dx - 9, ey - 34, 18, 14, { lead: true, sill: false })); }
      // the block-cut ridge with its scalloped edge and liggers
      const rx0 = x0 + 38, rx1 = x1 - 38, rw = rx1 - rx0, nS = Math.round(rw / 14);
      let sc = `M${rx0} ${ry - 4}H${rx1}V${ry + 8}`; for (let i = nS; i > 0; i--) sc += `L${f1(rx0 + (i - .5) * rw / nS)} ${ry + 15}L${f1(rx0 + (i - 1) * rw / nS)} ${ry + 8}`; sc += 'z';
      body.push(['@thatch.2', sc], ['@thatch.1', sc, .25]);
      let lg = `M${rx0} ${ry - 1}H${rx1}M${rx0} ${ry + 6}H${rx1}`; for (let i = 0; i < nS * 2; i++) { const x = rx0 + i * rw / (nS * 2); lg += `M${f1(x)} ${ry - 1}l${f1(rw / (nS * 4))} 7l${f1(rw / (nS * 4))} -7`; }
      body.push({ s: '@ligger', w: .9, op: .9, d: lg, detail: true });
      if (s === 'winter') {
        // snow on the upper pitch with a ragged, tongued hem; dormer caps; an eaves lip with drips
        const z = srnd('snow|' + v), F = (x, y) => f1(x) + ' ' + f1(y), xr = x1 - 13.5, yb = (ey + 3 * ry) / 4 + 4;
        let d = `M${F(-xr, yb)}Q${x0 + 25.5} ${ry + 11.5} ${x0 + 36} ${ry - 4}Q${x0 + 42} ${ry - 7} ${x0 + 50} ${ry - 7}H${x1 - 50}Q${x1 - 42} ${ry - 7} ${x1 - 36} ${ry - 4}Q${x1 - 25.5} ${ry + 11.5} ${F(xr, yb)}`;
        for (let i = 1; i < 17; i++) { const x = xr - xr * i / 8, y = yb - 4 + Math.sin(i * 1.7) * 3 + rr(z, -2, 3); if (i < 16 && z() < .55) { const L = rr(z, 9, 26); d += `L${F(x + 3, y)}Q${F(x + x / x1 * L / 2, y + L)} ${F(x - 3, y + 1)}`; } else d += 'L' + F(x, y); }
        body.push({ f: '#7e8c9c', d: d += 'z', op: .3, m: [1, 0, 0, 1, 1.5, 2.5] }, ['@snow', d, .96]);
        for (const dx of dorm) body.push(['@snow', `M${F(dx - 25, ey - 17)}q25 -46 50 0q-25 -39 -50 0z`, .95]);
        let lip = `M${x0 - 18} ${ey - 1}q0 -5 6 -5Q0 ${ey} ${x1 + 12} ${ey - 6}q6 0 6 5`;
        for (let k = 15; k >= 0; k--) { const t = (k + .5) / 16, x = x0 - 18 + t * (w + 36), y = ey + 12 * t * (1 - t), L = k % 3 == 1 ? rr(z, 6, 11) : rr(z, 2, 4); lip += `L${F(x + 3, y)}Q${F(x, y + L)} ${F(x - 3, y)}`; }
        body.push(['@snow', lip + 'z', .92]);
      }
      // the ground floor: leaded casements and the door under a little thatched hood
      const gw = v === 1 ? [x0 + w * .14, x0 + w * .72] : [x0 + w * .1, x0 + w * .32, x0 + w * .74];
      for (const gx of gw) body.push(...win(gx, -h + 22, 22, 20, { lead: true }));
      const dx = v === 1 ? x0 + w * .44 : x0 + w * .55;
      body.push([`@door.${v}`, rect(dx, -38, 22, 38)], ['@frame', rect(dx - 2, -40, 26, 2.4)], ['#d8b84a', ell(dx + 17, -19, 1.3, 1.3)], ['@step', rect(dx - 5, -3, 32, 3)], { f: '@glass.0', d: `M${f1(dx + 5)} -35h12v7h-12z`, glow: 'window' });
      body.push(['@thatch.0', `M${f1(dx - 10)} -38Q${f1(dx + 11)} -60 ${f1(dx + 32)} -38q-21 -4 -42 0z`], ['@thatch.3', `M${f1(dx - 10)} -38q21 -4 42 0v2q-21 -4 -42 0z`, .6]);
      if (s === 'winter') body.push(['@snow', `M${f1(dx - 9)} -39q20 -23 40 0q-20 -16 -40 0z`, .95]);
      // the rose round the door, by season (bare stems and a few hips in winter)
      const lf = ['', ''], bl = ['', '', ''];
      for (let i = 0; i < 26; i++) { const t = i / 26, side = i % 2, x = side ? dx + 28 + Math.sin(t * 7) * 3 : dx - 6 + Math.sin(t * 6) * 3, y = -t * 46; if (s !== 'winter') lf[i % 2] += lobed(r, x + rr(r, -3, 3), y, 3.5, 2.6, 5, .3); if (s !== 'winter' || i % 4 === 0) bl[i % 3] += circ(x + rr(r, -3, 3), y + rr(r, -2, 2), s === 'summer' ? 2.2 : 1.4); }
      body.push({ s: '@stem', w: 1.1, d: `M${f1(dx - 6)} 0q-4 -20 2 -40q10 -14 22 -4M${f1(dx + 28)} 0q4 -22 -2 -40` }, ['@leaf.0', lf[0]], ['@leaf.1', lf[1]], ['@bloom.0', bl[0]], ['@bloom.1', bl[1]]);
      // a cottage-garden border along the front
      const fl = ['', ''], fb = ['', '', ''];
      for (let i = 0; i < 26; i++) { const x = x0 + 4 + i * (w - 8) / 26 + rr(r, -2, 2); if (Math.abs(x - dx - 11) < 20) continue; const hh = s === 'winter' ? rr(r, 4, 6) : rr(r, 8, 16); fl[i % 2] += lobed(r, x, -hh * .45, rr(r, 4, 7), hh * .55, 6, .3); if (s !== 'winter') for (let j = 0; j < 2; j++) fb[(i + j) % 3] += circ(x + rr(r, -4, 4), -hh * rr(r, .6, 1.05), 1.9); }
      body.push(['@leaf.0', fl[0]], ['@leaf.1', fl[1]], ['@bloom.0', fb[0]], ['@bloom.1', fb[1]], ['@bloom.2', fb[2]], ['@path', `M${f1(dx - 4)} 0h30l6 6h-42z`, .9]);
      body.push(...tufts(r, x0 - 20, x1 + 20, 24, 8, 4));
      return { body };
    },
  });
})();
