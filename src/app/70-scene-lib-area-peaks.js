/* ============================================================
   SCENE LIBRARY: the Peak District area objects (docs/dev/SCENE_ENGINE.md 2.1, 2.2).
   PURE: sceneObjDefine calls only (through sceneDraw.define), built lazily per (variant, season).
   One file for the area builder "peaks" (the area scenes are 71-scene-uk-peaks-*.js, the pack
   72-anim-pack-uk-area-peaks.js). Place-specific objects carry weight 0 so the role pickers of
   the generic archetypes never drop a Peak millstone or stepping stone into another region.

   Landmarks (one real place each; natural ones tagged 'natural'):
     landmark.stanage-edge      the gritstone escarpment above Hathersage: buttresses, bedding, boulder slope
     landmark.mam-tor           Mam Tor and the Great Ridge: the landslip face, ramparts, the flagged ridge path,
                                Hollins Cross, Back Tor's crag and Lose Hill
     landmark.peveril-castle    the ruined Norman keep on its crag above Castleton
     landmark.bakewell-bridge   the medieval five-arched bridge over the Wye
     landmark.hathersage-church St Michael's: the west tower and spire, the battlemented nave
     landmark.derwent-dam       the masonry dam with its two castellated towers and the overflow
     landmark.ladybower-viaduct the Ashopton viaduct across the reservoir
     landmark.thorpe-cloud      the limestone cone at the mouth of Dovedale
   Objects: rock.millstone, structure.stepping-stones, structure.bellmouth (Ladybower's overflow),
   building.peak-cottage (gritstone and limestone cottages), vehicle.paraglider, bird.curlew-flight.
   No text, no logos. Anchors: the ground (or the waterline) at the middle of the foot.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, circ, poly, blob, seasons, define } = sceneDraw;
  const rr = (r, a, b) => a + r() * (b - a);
  const line = pts => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L');
  /** Catmull-Rom samples through control points [[x, y], ...], n per span. */
  const smooth = (pts, n = 8) => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  };
  /** y of a sampled profile at x (linear between samples). */
  const yAt = (pts, x) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const a = pts[i - 1], b = pts[i], t = (x - a[0]) / ((b[0] - a[0]) || 1); return a[1] + (b[1] - a[1]) * t; }
    return pts[pts.length - 1][1];
  };
  const GRASS = { spring: ['#7d9c4e', '#5e7e3a', '#a0b866'], summer: ['#6a8a42', '#4e6c32', '#8aa856'], autumn: ['#94884c', '#6e6638', '#b0a05e'], winter: ['#8a8c7a', '#6a6e60', '#a8aa98'] };
  /** Quoins: alternating long and short dressed stones up a corner (one shape each). */
  const quoins = (out, x, y0, y1, dir, paint, h = 9) => { for (let y = y0, k = 0; y > y1 + h; y -= h, k++) out.push([paint, rect(dir > 0 ? x : x - (k % 2 ? 9 : 15), y - h + 1, k % 2 ? 9 : 15, h - 1.5), 0.75]); };

  /* ---------- landmark.stanage-edge: the gritstone escarpment (natural) ---------- */
  define({
    id: 'landmark.stanage-edge', category: 'landmark', size: [1500, 250], variants: 1, seasonal: true, flippable: false, parts: ['body'],
    palette: Object.assign({ base: { grit: ['#a49680', '#6f675a', '#d2c2a0', '#4a443b'], lichen: ['#9aa070', '#c2b884'] } }, seasons({
      moor: { spring: ['#6f7048', '#4f5236', '#8e8a58'], summer: ['#7c5e78', '#56435a', '#9d7a96'], autumn: ['#94673e', '#6a4a2e', '#b48452'], winter: ['#7e776a', '#5c564c', '#a8a294'] },
      top: { spring: '#7d8c4c', summer: '#6c7b42', autumn: '#a07c46', winter: '#eef2f5' },
    })),
    shadow: false, reflect: false,
    tags: ['landmark', 'natural', 'place:uk/stanage-edge', 'uk', 'peak-district', 'gritstone', 'edge'],
    credit: 'native (uk-rebuild, peaks area)',
    build(v, r) {
      // A long, nearly level escarpment: buttresses of rounded, bedded gritstone of every width and height, set
      // back or forward, broken by heathery gullies where the slope climbs almost to the top.
      const body = [], E = t => 1 - Math.pow(Math.min(1, Math.abs(t)), 3.4), bs = [];
      let x = -748;
      while (x < 748) {
        const gap = r() < 0.2, w = gap ? rr(r, 18, 46) : rr(r, 26, 112), t = (x + w / 2) / 750, e = E(t);
        const top = -(120 + 92 * e) - rr(r, 0, 12) + (gap ? rr(r, 6, 16) : 0), h = gap ? 14 : (24 + 50 * e) * rr(r, 0.7, 1.25);
        bs.push({ gap, back: !gap && r() < 0.3, x0: x, x1: Math.min(748, x + w), top, top2: top + rr(r, -7, 7), bot: top + h, bot2: top + h + rr(r, -5, 7) });
        x += w;
      }
      // the slope under the edge
      let sl = `M-772 6L-772 ${f1(bs[0].bot + 8)}`;
      for (const b of bs) sl += `L${f1(b.x0)} ${f1(b.bot)}L${f1(b.x1)} ${f1(b.bot2)}`;
      sl += 'L772 6z';
      // the moor top behind the edge (snow lies on it in winter)
      let tp = `M-772 ${f1(bs[0].top + 14)}`;
      for (const b of bs) tp += `L${f1(b.x0)} ${f1(b.top - 5)}L${f1(b.x1)} ${f1(b.top2 - 5)}`;
      tp += `L772 ${f1(bs[bs.length - 1].top2 + 14)}`;
      for (let i = bs.length - 1; i >= 0; i--) tp += `L${f1(bs[i].x1)} ${f1(bs[i].top2 + 10)}L${f1(bs[i].x0)} ${f1(bs[i].top + 10)}`;
      body.push(['@top', tp + 'z']);
      const face = b => { const w = b.x1 - b.x0, k = Math.min(10, w * 0.18); return `M${f1(b.x0)} ${f1(b.bot)}L${f1(b.x0 + 2)} ${f1(b.top + k)}Q${f1(b.x0 + 3)} ${f1(b.top)} ${f1(b.x0 + k + 3)} ${f1(b.top - 1)}L${f1(b.x1 - k)} ${f1(b.top2 - 1)}Q${f1(b.x1 - 1)} ${f1(b.top2)} ${f1(b.x1)} ${f1(b.top2 + k)}L${f1(b.x1 + 2)} ${f1(b.bot2)}z`; };
      // set-back buttresses first (paler, smaller), then the slope, then the front ones
      for (const b of bs) if (b.back) { body.push(['@grit.0', face(b)], ['@grit.2', face(b), 0.35]); }
      body.push([{ lin: [[0, '@moor.2'], [0.45, '@moor.0'], [1, '@moor.1']], x1: 0, y1: -210, x2: 0, y2: 0 }, sl]);
      for (let i = 0; i < 9; i++) { const xx = -650 + i * 160 + rr(r, -30, 30), y0 = -70 - rr(r, 0, 40); body.push({ s: '@moor.1', w: rr(r, 3, 7), op: 0.35, d: `M${f1(xx)} ${f1(y0)}Q${f1(xx + 20)} ${f1(y0 / 2)} ${f1(xx + rr(r, -10, 30))} -2` }); }
      for (const b of bs) {
        if (b.gap || b.back) continue;
        const w = b.x1 - b.x0;
        body.push(['@grit.0', face(b)]);
        body.push(['@grit.2', `M${f1(b.x0 + 2)} ${f1(b.bot)}L${f1(b.x0 + 3)} ${f1(b.top + 6)}Q${f1(b.x0 + 5)} ${f1(b.top)} ${f1(b.x0 + w * 0.4)} ${f1(b.top)}L${f1(b.x0 + w * 0.32)} ${f1(b.bot - 4)}z`, 0.5]);
        body.push(['@grit.1', poly([[b.x1 - w * 0.22, b.top2 + 4], [b.x1 - 2, b.top2 + 6], [b.x1 + 2, b.bot2], [b.x1 - w * 0.16, b.bot2 - 2]]), 0.7]);
        body.push(['@grit.3', poly([[b.x0 + 4, b.top + 5], [b.x1 - 4, b.top2 + 5], [b.x1 - 3, b.top2 + 9], [b.x0 + 4, b.top + 8]]), 0.35]);
        const n = Math.max(1, Math.round((b.bot - b.top) / 14)), bed = Array.from({ length: n }, (_, i) => (i + 1) / (n + 1)).map(k => `M${f1(b.x0 + 3)} ${f1(b.top + (b.bot - b.top) * k)}L${f1(b.x1 - 2)} ${f1(b.top2 + (b.bot2 - b.top2) * k + rr(r, -2, 2))}`).join('');
        body.push({ s: '@grit.3', w: 1.1, op: 0.42, d: bed, detail: true });
        if (w > 50) { const cx = b.x0 + w * rr(r, 0.35, 0.65); body.push({ s: '@grit.3', w: 1.8, op: 0.6, d: `M${f1(cx)} ${f1(b.top + 2)}l${f1(rr(r, -3, 3))} ${f1((b.bot - b.top) * rr(r, 0.5, 0.95))}` }); }
        if (r() < 0.5) body.push(['@lichen.' + (r() < 0.5 ? 0 : 1), ell(b.x0 + w * rr(r, 0.2, 0.8), b.top + (b.bot - b.top) * rr(r, 0.3, 0.8), rr(r, 3, 7), rr(r, 2, 4)), 0.55]);
      }
      // the boulder field below the edge: thick under it, thinning down the slope
      const botAt = xx => { for (const b of bs) if (xx >= b.x0 && xx <= b.x1) return Math.max(b.bot, b.bot2); return -60; };
      for (let i = 0; i < 52; i++) {
        const xx = rr(r, -720, 720), y0 = botAt(xx) + 6, k = Math.pow(r(), 1.7), y = y0 + (-6 - y0) * k, sz = 16 - 9 * k + rr(r, -3, 3);
        body.push(['@grit.' + (i % 3 === 0 ? 1 : 0), blob(r, xx, y - sz * 0.4, sz, sz * 0.55, 6, 0.35)]);
        if (sz > 10) body.push(['@grit.2', ell(xx - sz * 0.2, y - sz * 0.72, sz * 0.5, sz * 0.18), 0.6]);
      }
      return { body };
    },
  });

  /* ---------- rock.millstone: abandoned gritstone millstones (lying, upright, a pair) ---------- */
  define({
    id: 'rock.millstone', category: 'rock', size: [130, 96], variants: 3, seasonal: true, flippable: true, weight: 0, parts: ['body'],
    palette: Object.assign({ base: { grit: ['#a8987c', '#7a6e5c', '#d0c0a0', '#4a4238'] } }, seasons({
      moss: { spring: ['#6e8a3e', '#86a24a'], summer: ['#5e7a36', '#7a9446'], autumn: ['#8a7a3a', '#a08a44'], winter: ['#7a806c', '#e8ecef'] },
    })),
    shadow: { rx: 62, ry: 9, h: 40 }, reflect: true,
    tags: ['uk', 'peak-district', 'millstone', 'gritstone', 'kit:temperate', 'role:rock'],
    credit: 'native (uk-rebuild, peaks area)',
    build(v, r) {
      const body = [];
      const flat = (cx, by, rx) => {
        const ry = rx * 0.3, th = rx * 0.24, ty = by - th;
        body.push(['@grit.1', `M${f1(cx - rx)} ${f1(ty)}V${f1(by)}A${f1(rx)} ${f1(ry)} 0 0 0 ${f1(cx + rx)} ${f1(by)}V${f1(ty)}z`]);
        body.push(['@grit.0', ell(cx, ty, rx, ry)]);
        body.push(['@grit.2', ell(cx - rx * 0.2, ty - ry * 0.25, rx * 0.6, ry * 0.45), 0.5]);
        body.push(['@grit.3', ell(cx, ty, rx * 0.17, ry * 0.17)]);
        let g = ''; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g += `M${f1(cx + Math.cos(a) * rx * 0.25)} ${f1(ty + Math.sin(a) * ry * 0.25)}L${f1(cx + Math.cos(a) * rx * 0.9)} ${f1(ty + Math.sin(a) * ry * 0.9)}`; }
        body.push({ s: '@grit.1', w: 1, op: 0.55, d: g, detail: true });
        body.push(['@moss.0', blob(r, cx + rx * 0.55, by - th * 0.3, rx * 0.25, th * 0.35, 5, 0.4), 0.85]);
      };
      if (v === 0) flat(0, 0, 58);
      else if (v === 2) { flat(4, 0, 58); flat(-6, -15, 44); }
      else {
        const R = 46, cy = -R + 6;
        body.push(['@grit.1', ell(9, cy, R, R)]);
        body.push(['@grit.0', ell(0, cy, R, R)]);
        body.push({ s: '@grit.2', w: 3, op: 0.6, d: `M${-R + 6} ${f1(cy)}A${R - 6} ${R - 6} 0 0 1 0 ${f1(cy - R + 6)}` });
        body.push({ s: '@grit.1', w: 1.4, op: 0.5, d: ell(0, cy, R * 0.62, R * 0.62) });
        body.push(['@grit.3', circ(0, cy, 8)]);
        body.push(['@grit.2', ell(-14, cy - 18, 14, 8), 0.4]);
      }
      // grass and moss round the foot (snow-dusted in winter)
      let tuft = '';
      for (let i = 0; i < 12; i++) { const x = rr(r, -66, 66), h = rr(r, 6, 14); tuft += `M${f1(x - 3)} 2Q${f1(x - 1)} ${f1(-h / 2)} ${f1(x + rr(r, -3, 3))} ${f1(-h)}Q${f1(x + 1)} ${f1(-h / 2)} ${f1(x + 3)} 2z`; }
      body.push(['@moss.0', tuft], ['@moss.1', blob(r, -40, -2, 18, 5, 5, 0.3), 0.8]);
      return { body };
    },
  });

  /* ---------- structure.dry-wall: a Peak dry stone wall with its upright coping stones (light: one path per tone) ---------- */
  define({
    id: 'structure.dry-wall', category: 'structure', size: [300, 40], variants: 2, seasonal: false, flippable: true, weight: 0, parts: ['body'],
    palette: { base: { grit: ['#8a8070', '#625a4e', '#b0a68e', '#3e3a34'], lime: ['#bab4a4', '#8e887a', '#dcd6c6', '#5a564e'] } },
    shadow: { rx: 150, ry: 6, h: 30 }, reflect: true,
    tags: ['uk', 'peak-district', 'wall', 'unlit', 'kit:temperate', 'role:edge'],
    credit: 'native (uk-rebuild, peaks area)',
    build(v, r) {
      const st = v ? 'lime' : 'grit', body = [], W = 150;
      let top = `M${-W} 0L${-W} -30`;
      for (let x = -W; x <= W; x += 10) top += `L${f1(x)} ${f1(-30 - rr(r, 0, 3))}`;
      body.push([`@${st}.1`, top + `L${W} 0z`]);
      let stones = '', lights = '', cams = '';
      for (let row = 0; row < 3; row++) for (let x = -W + (row % 2) * 9; x < W - 6; x += rr(r, 14, 24)) { const w = rr(r, 10, 18), y = -8 - row * 9; stones += sceneDraw.rect(x, y - 3, w, 7); if (r() < 0.4) lights += sceneDraw.rect(x + 1, y - 3, w * 0.6, 2); }
      for (let x = -W + 2; x < W - 3; x += rr(r, 5, 7)) cams += `M${f1(x)} -30l${f1(rr(r, -1, 1))} ${f1(-rr(r, 6, 10))}l4 0l0 ${f1(rr(r, 6, 10))}z`;
      body.push([`@${st}.0`, stones], [`@${st}.2`, lights, 0.7], [`@${st}.0`, cams], { s: `@${st}.3`, w: 1, op: 0.5, d: `M${-W} -30H${W}` });
      body.push([`@${st}.3`, `M${-W} 0L${-W} -4L${W} -4L${W} 0z`, 0.4]);
      return { body };
    },
  });

  /* ---------- landmark.mam-tor: Mam Tor and the Great Ridge (natural) ---------- */
  define({
    id: 'landmark.mam-tor', category: 'landmark', size: [1700, 340], variants: 1, seasonal: true, flippable: false, parts: ['body'],
    palette: Object.assign({ base: { slip: ['#b8a07c', '#8e7a60', '#d6c4a0', '#6e5e4a'], path: '#cfc2a4', crag: ['#9a9282', '#6a6458'], wall: '#5e5a50' } }, seasons({
      hill: { spring: ['#86a258', '#5e7a40', '#a6bc70'], summer: ['#76944a', '#536e36', '#98b062'], autumn: ['#9c8650', '#74603a', '#b89e62'], winter: ['#9a9c8c', '#727466', '#eef2f5'] },
      field: { spring: ['#8cb05a', '#72984a', '#a0bc66'], summer: ['#7ea24c', '#6a8e40', '#94b458'], autumn: ['#a0a05a', '#8a8a4c', '#b0a866'], winter: ['#a4a898', '#8e9282', '#c0c4b6'] },
      wood: { spring: ['#5e8a44', '#7aa456'], summer: ['#3e6a34', '#557e40'], autumn: ['#a0662e', '#c08a3c'], winter: ['#5e5448', '#74685a'] },
    })),
    shadow: false, reflect: false,
    tags: ['landmark', 'natural', 'place:uk/mam-tor', 'uk', 'peak-district', 'ridge', 'hill'],
    credit: 'native (uk-rebuild, peaks area)',
    build(v, r) {
      const body = [];
      const ctrl = [[-856, -80], [-720, -138], [-580, -246], [-470, -322], [-420, -332], [-350, -304], [-240, -236], [-120, -196], [-60, -190], [40, -204], [180, -226], [300, -250], [338, -258], [372, -236], [430, -232], [540, -258], [620, -272], [680, -262], [770, -190], [856, -112]];
      const P = smooth(ctrl, 8), sky = P.map(p => [p[0], p[1]]);
      body.push([{ lin: [[0, '@hill.2'], [0.25, '@hill.0'], [1, '@hill.1']], x1: 0, y1: -330, x2: 0, y2: 0 }, line(sky) + 'L856 8L-856 8z']);
      // snow (winter) / pale summit grass on the tops: a band under the skyline
      const cap = sky.filter(p => yAt(sky, p[0]) < -200);
      if (cap.length > 2) body.push(['@hill.2', line(cap) + line(cap.slice().reverse().map(p => [p[0], p[1] + 14 + (p[0] % 7)])).replace('M', 'L') + 'z', 0.75]);
      // shaded eastern flanks of the three tops
      for (const [x0, x1] of [[-420, -150], [338, 470], [620, 856]]) { const top = sky.filter(p => p[0] >= x0 && p[0] <= x1); body.push(['@hill.1', line(top) + `L${f1(x1)} 8L${f1(x0 + (x1 - x0) * 0.25)} 8z`, 0.38]); }
      // the landslip: the shivering mountain's broken face, banded shale and grit
      // the slip scar runs from just under the summit to the foot of the east face, concave, ragged-edged
      const slip = [[-414, -326], [-370, -312], [-318, -282], [-268, -244], [-236, -200], [-214, -140], [-206, -80], [-236, -40], [-300, -30], [-372, -44], [-430, -78], [-462, -130], [-470, -200], [-452, -268]];
      body.push(['@slip.0', poly(slip)]);
      body.push(['@slip.2', poly([[-414, -326], [-380, -314], [-420, -250], [-446, -170], [-462, -130], [-470, -200], [-452, -268]]), 0.55]);
      body.push(['@slip.1', poly([[-430, -78], [-372, -44], [-300, -30], [-236, -40], [-210, -76], [-262, -96], [-330, -92], [-400, -100]]), 0.8]);
      body.push(['@hill.0', poly([[-330, -60], [-290, -84], [-250, -70], [-280, -48]]), 0.8]);
      for (let i = 0; i < 16; i++) { const y = -300 + i * 16 + rr(r, -3, 3), w = 1 - Math.abs(i - 7) / 14; body.push({ s: i % 2 ? '@slip.3' : '@slip.2', w: i % 2 ? 1.3 : 1.8, op: 0.5, d: `M${f1(-450 + (1 - w) * 30 + i * 2)} ${f1(y + 6)}Q${f1(-350 + i * 3)} ${f1(y - 8)} ${f1(-250 + i * 2.5 - (1 - w) * 20)} ${f1(y + 14)}`, detail: i % 3 === 2 }); }
      for (let i = 0; i < 12; i++) { const x = -440 + i * 19 + rr(r, -4, 4); body.push({ s: '@slip.3', w: 1.4, op: 0.45, d: `M${f1(x)} ${f1(yAt(slip.slice(0, 5), x) + 16)}l${f1(rr(r, -8, 8))} ${f1(rr(r, 90, 200))}` }); }
      // the Iron Age ramparts round the summit
      body.push({ s: '@hill.1', w: 2.4, op: 0.6, d: 'M-560 -250Q-470 -292 -380 -296T-268 -244' }, { s: '@hill.2', w: 1.6, op: 0.5, d: 'M-590 -226Q-470 -270 -370 -272T-238 -222' });
      // the flagged ridge path from the summit to Lose Hill, and the walkers' cairn at Hollins Cross
      const ridge = sky.filter(p => p[0] > -420 && p[0] < 640).map(p => [p[0], p[1] + 5]);
      body.push({ s: '@path', w: 3.2, op: 0.85, d: line(ridge) });
      let flags = ''; for (let i = 0; i < ridge.length; i += 2) flags += rect(ridge[i][0] - 3, ridge[i][1] - 1, 6, 2.4);
      body.push({ f: '@slip.3', d: flags, op: 0.5, detail: true });
      body.push(['@crag.1', poly([[-66, -192], [-58, -202], [-50, -192]])]);
      body.push(['@crag.0', rect(-423, -342, 6, 11)]);
      // Back Tor: the broken crag on its east face, with the wood below
      body.push(['@crag.0', poly([[338, -258], [372, -238], [380, -200], [366, -170], [348, -196], [342, -230]])], ['@crag.1', poly([[356, -248], [372, -238], [380, -200], [366, -170], [362, -210]]), 0.8]);
      for (let i = 0; i < 4; i++) body.push({ s: '@crag.1', w: 1, op: 0.6, d: `M${f1(342 + i * 2)} ${f1(-246 + i * 18)}l${f1(30 - i * 4)} ${f1(10)}`, detail: true });
      for (let i = 0; i < 16; i++) { const x = 340 + rr(r, 0, 90), y = -160 + rr(r, 0, 50) + (x - 340) * 0.3; body.push(['@wood.' + (i % 2), blob(r, x, y, rr(r, 9, 15), rr(r, 8, 12), 6, 0.3)]); }
      // patchwork fields and dry stone walls on the lower slopes
      const fy = x => Math.max(yAt(sky, x) + 110, -95);
      for (let i = 0; i < 22; i++) {
        const x0 = -840 + i * 76 + rr(r, -8, 8), x1 = x0 + rr(r, 64, 84), ya = fy(x0), yb = fy(x1);
        if (ya > -8 || yb > -8) continue;
        const mid = -10 - rr(r, 0, 22);
        body.push(['@field.' + (i % 3), poly([[x0, ya], [x1, yb], [x1, mid], [x0, mid + rr(r, -6, 6)]]), 0.85]);
        body.push({ s: '@wall', w: 1.4, op: 0.7, d: `M${f1(x0)} ${f1(ya)}L${f1(x0)} ${f1(mid)}M${f1(x0)} ${f1(ya)}L${f1(x1)} ${f1(yb)}` });
      }
      // trees along the field walls at the foot
      for (let i = 0; i < 18; i++) { const x = rr(r, -820, 820), y = -4 - rr(r, 0, 28); body.push(['@wood.' + (i % 2), blob(r, x, y - 8, rr(r, 8, 14), rr(r, 7, 11), 6, 0.3)]); }
      return { body };
    },
  });

  /* ---------- landmark.thorpe-cloud: the limestone cone at the mouth of Dovedale (natural) ---------- */
  define({
    id: 'landmark.thorpe-cloud', category: 'landmark', size: [760, 300], variants: 1, seasonal: true, flippable: false, parts: ['body'],
    palette: Object.assign({ base: { lime: ['#d8d2c2', '#a8a294', '#f0ece2', '#8a8476'] } }, seasons({
      hill: { spring: ['#84a456', '#5e7c3e', '#a8c272'], summer: ['#76964a', '#566e36', '#9cb466'], autumn: ['#a08c52', '#786a3e', '#bea66a'], winter: ['#9c9e90', '#76786a', '#eef2f5'] },
      scrub: { spring: ['#5a8240', '#76a050', '#e8eee0'], summer: ['#3e6830', '#557e3e', '#4a7436'], autumn: ['#9a5a2e', '#b87a3a', '#c0402e'], winter: ['#5a4e44', '#6e6052', '#7a6a5c'] },
    })),
    shadow: false, reflect: true,
    tags: ['landmark', 'natural', 'place:uk/dovedale', 'uk', 'peak-district', 'limestone', 'hill'],
    credit: 'native (uk-rebuild, peaks area)',
    build(v, r) {
      const body = [];
      const sky = smooth([[-384, -30], [-300, -70], [-200, -150], [-110, -240], [-40, -292], [0, -298], [40, -286], [110, -226], [210, -140], [300, -70], [384, -24]], 8);
      body.push([{ lin: [[0, '@hill.2'], [0.3, '@hill.0'], [1, '@hill.1']], x1: 0, y1: -300, x2: 0, y2: 0 }, line(sky) + 'L384 6L-384 6z']);
      body.push(['@hill.1', line(sky.filter(p => p[0] >= 0)) + 'L384 6L60 6z', 0.4]);
      // limestone scars and scree runs
      for (let i = 0; i < 16; i++) {
        const x = rr(r, -230, 240), top = yAt(sky, x) + rr(r, 10, 70), w = rr(r, 10, 30), h = rr(r, 8, 20);
        body.push(['@lime.' + (x > 20 ? 1 : 0), poly([[x - w, top + h], [x - w * 0.6, top], [x + w * 0.5, top + 2], [x + w, top + h * 0.8]])]);
        body.push(['@lime.2', poly([[x - w * 0.6, top], [x + w * 0.5, top + 2], [x + w * 0.2, top + 4], [x - w * 0.5, top + 3]]), 0.7]);
        body.push({ f: '@lime.3', d: poly([[x - w * 0.3, top + h], [x + w * 0.2, top + h], [x + w * 0.5 + 8, top + h + rr(r, 30, 60)], [x - w * 0.5, top + h + rr(r, 25, 50)]]), op: 0.35 });
      }
      // hawthorn and ash scrub on the lower flanks
      for (let i = 0; i < 26; i++) { const x = rr(r, -360, 360), y = Math.min(-4, yAt(sky, x) + rr(r, 90, 220)); if (y < yAt(sky, x) + 30) continue; body.push(['@scrub.' + (i % 3 === 0 ? 1 : 0), blob(r, x, y - 8, rr(r, 9, 18), rr(r, 7, 12), 6, 0.35)]); if (i % 4 === 0) body.push(['@scrub.2', circ(x + 3, y - 12, 2.5), 0.8]); }
      // the zig-zag path to the summit and a field wall at its foot
      body.push({ s: '@lime.2', w: 2.2, op: 0.6, d: 'M-200 -10L-150 -60L-120 -50L-70 -130L-40 -122L-10 -220L4 -290' });
      body.push({ s: '@lime.3', w: 2, op: 0.6, d: 'M-384 -12Q-100 -26 384 -8' });
      return { body };
    },
  });

  /* ---------- structure.stepping-stones: the Dovedale stepping stones across the Dove ---------- */
  define({
    id: 'structure.stepping-stones', category: 'structure', size: [620, 60], variants: 2, seasonal: false, flippable: true, weight: 0, parts: ['body'],
    palette: { base: { lime: ['#d4ccba', '#a49c8c', '#eee8da', '#6e6a5e'], wet: '#5e6a62', foam: '#eef4f4' } },
    shadow: false, reflect: true,
    tags: ['uk', 'peak-district', 'dovedale', 'limestone', 'unlit', 'kit:temperate', 'role:edge'],
    credit: 'native (uk-rebuild, peaks area)',
    build(v, r) {
      const body = [], n = v ? 12 : 16;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), x = -300 + t * 600, k = 1 - t * 0.45 * (v ? 1 : 0.6), w = rr(r, 15, 21) * k, h = rr(r, 18, 26) * k, top = -h - (v ? t * 30 : 0) + 6, by = (v ? -t * 30 : 0) + 6;
        body.push(['@wet', ell(x, by + 2, w * 1.3, 4 * k), 0.6]);
        body.push(['@lime.1', poly([[x - w, by], [x - w * 0.9, top + 4], [x + w * 0.9, top + 3], [x + w, by]])]);
        body.push(['@lime.0', poly([[x - w * 0.9, top + 4], [x - w * 0.6, top], [x + w * 0.7, top - 1], [x + w * 0.9, top + 3]])]);
        body.push(['@lime.2', poly([[x - w * 0.6, top], [x + w * 0.1, top - 1], [x - w * 0.1, top + 3]]), 0.7]);
        body.push(['@lime.3', poly([[x + w * 0.5, top + 3], [x + w * 0.9, top + 3], [x + w, by], [x + w * 0.6, by]]), 0.45]);
        body.push({ s: '@foam', w: 1.4, op: 0.7, d: `M${f1(x - w * 1.2)} ${f1(by + 1)}q${f1(w * 0.6)} -3 ${f1(w * 1.2)} 0`, detail: true });
      }
      return { body };
    },
  });

  /* ---------- structure.bellmouth: Ladybower's bellmouth overflow (the 'plughole') ---------- */
  define({
    id: 'structure.bellmouth', category: 'structure', size: [240, 40], variants: 1, seasonal: false, flippable: false, weight: 0, parts: ['body', 'spill'],
    palette: { base: { stone: ['#b8ae9a', '#8a8070', '#dcd4c2', '#4a4640'], hole: ['#141a1e', '#28343a'], foam: ['#f4f8f8', '#cfe0e4'] } },
    shadow: false, reflect: true,
    tags: ['uk', 'peak-district', 'ladybower', 'unlit', 'kit:water', 'role:edge'],
    anim: { flicker: { part: 'spill', op: [0.55, 1], period: 1.6 } },
    credit: 'native (uk-rebuild, peaks area)',
    build(v, r) {
      const body = [], spill = [], rx = 116, ry = 24;
      body.push(['@stone.1', `M${-rx} -12V0A${rx} ${ry} 0 0 0 ${rx} 0V-12z`]);
      body.push(['@stone.0', ell(0, -12, rx, ry)]);
      body.push(['@hole.1', ell(0, -12, rx * 0.84, ry * 0.8)]);
      body.push(['@hole.0', ell(0, -9, rx * 0.66, ry * 0.58)]);
      let blocks = ''; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; blocks += `M${f1(Math.cos(a) * rx * 0.86)} ${f1(-12 + Math.sin(a) * ry * 0.82)}L${f1(Math.cos(a) * rx)} ${f1(-12 + Math.sin(a) * ry)}`; }
      body.push({ s: '@stone.3', w: 1, op: 0.55, d: blocks });
      body.push({ s: '@stone.2', w: 2, op: 0.7, d: `M${-rx + 4} -14A${rx - 4} ${ry - 4} 0 0 1 ${rx - 4} -14` });
      // the water pouring over the lip, a white veil round the inside of the ring
      for (let i = 0; i < 18; i++) { const a = Math.PI * (1.05 + i / 18 * 0.9), x0 = Math.cos(a) * rx * 0.84, y0 = -12 + Math.sin(a) * ry * 0.8; spill.push({ s: '@foam.' + (i % 2), w: 2.2, op: 0.85, d: `M${f1(x0)} ${f1(y0)}L${f1(x0 * 0.82)} ${f1(y0 + 9)}` }); }
      spill.push({ s: '@foam.0', w: 2.5, op: 0.9, d: `M${-rx * 0.84} -12A${rx * 0.84} ${ry * 0.8} 0 0 1 ${rx * 0.84} -12` });
      return { body, spill };
    },
  });

  /* ---------- building.peak-cottage: gritstone and limestone cottages with stone-slate roofs ---------- */
  define({
    id: 'building.peak-cottage', category: 'building', size: [190, 130], variants: 3, seasonal: false, flippable: true, weight: 0, parts: ['body'],
    palette: { base: {
      grit: ['#a89474', '#7e6e56', '#c8b896', '#5a4e3e'], lime: ['#d8d0bc', '#ada490', '#ece6d6', '#7a7464'], roof: ['#6e6a62', '#4e4c46', '#8a867c'],
      door: ['#3e5a4a', '#7a3a2e', '#2e3e5a'], win: '#2c3036', frame: '#e8e2d2',
    } },
    night: { glow: { window: '#ffd58a' }, on: 0.75 },
    shadow: { rx: 96, ry: 10, h: 110 }, reflect: true,
    tags: ['uk', 'peak-district', 'cottage', 'stone', 'kit:temperate', 'role:building-mid'],
    credit: 'native (uk-rebuild, peaks area)',
    build(v, r) {
      const body = [], st = v === 2 ? 'lime' : 'grit';
      const house = (x0, w, h, roofH, door) => {
        body.push([`@${st}.0`, rect(x0, -h, w, h)]);
        body.push([`@${st}.1`, rect(x0 + w - 10, -h, 10, h), 0.6]);
        let course = ''; for (let y = -h + 9; y < -2; y += 9) course += `M${f1(x0)} ${f1(y)}h${f1(w)}`;
        body.push({ s: `@${st}.3`, w: 0.8, op: 0.3, d: course, detail: true });
        body.push(['@roof.0', poly([[x0 - 5, -h], [x0 + w * 0.12, -h - roofH], [x0 + w * 0.88, -h - roofH], [x0 + w + 5, -h]])]);
        body.push(['@roof.2', poly([[x0 + w * 0.12, -h - roofH], [x0 + w * 0.88, -h - roofH], [x0 + w * 0.86, -h - roofH + 4], [x0 + w * 0.14, -h - roofH + 4]]), 0.8]);
        let slates = ''; for (let y = -h - roofH + 9; y < -h; y += 7) slates += `M${f1(x0)} ${f1(y)}h${f1(w)}`;
        body.push({ s: '@roof.1', w: 0.9, op: 0.5, d: slates, detail: true });
        body.push([`@${st}.2`, rect(x0 + w * 0.7, -h - roofH - 14, 12, 18)], ['@roof.1', rect(x0 + w * 0.7 - 1, -h - roofH - 16, 14, 3)]);
        // windows: mullioned pairs with stone surrounds, upstairs and down, and the door
        const wins = [[x0 + w * 0.14, -h + 12], [x0 + w * 0.56, -h + 12], [x0 + w * 0.14, -h * 0.48]];
        if (!door) wins.push([x0 + w * 0.56, -h * 0.48]);
        for (const [wx, wy] of wins) {
          body.push([`@${st}.2`, rect(wx - 3, wy - 3, w * 0.26 + 6, 22)]);
          body.push({ f: '@win', d: rect(wx, wy, w * 0.26, 16), glow: 'window' });
          body.push({ s: '@frame', w: 1.2, op: 0.8, d: `M${f1(wx + w * 0.13)} ${f1(wy)}v16` });
        }
        if (door) { body.push([`@${st}.2`, rect(x0 + w * 0.6 - 3, -34, 26, 34)]); body.push(['@door.' + (v % 3), rect(x0 + w * 0.6, -31, 20, 31)]); body.push({ f: '@win', d: rect(x0 + w * 0.6 + 3, -29, 14, 5), glow: 'window' }); }
      };
      if (v === 1) { house(-96, 64, 70, 26, true); house(-32, 64, 70, 26, false); house(32, 64, 70, 26, true); }
      else if (v === 2) { house(-80, 120, 62, 30, true); body.push(['@roof.0', poly([[-20, -36], [0, -50], [20, -36]])], [`@${st}.1`, rect(-16, -36, 32, 36)]); }
      else house(-70, 140, 84, 32, true);
      body.push(['@grit.3', rect(-104, -3, 208, 4), 0.35]);
      return { body };
    },
  });

  /* ---------- landmark.peveril-castle: the ruined Norman keep on its crag above Castleton ---------- */
  define({
    id: 'landmark.peveril-castle', category: 'landmark', size: [380, 300], variants: 1, seasonal: true, flippable: false, parts: ['body', 'lit'],
    palette: Object.assign({ base: { stone: ['#c4b8a0', '#968a74', '#e2d8c2', '#5e5648'], crag: ['#a8a294', '#7a7468', '#cac4b6'], gap: '#2e2c2a', wash: '#ffcf8a' } }, seasons({
      grass: { spring: ['#7ea04e', '#5e7e3a'], summer: ['#6e8e44', '#506a32'], autumn: ['#98884a', '#746638'], winter: ['#e8ecef', '#9a9c8e'] },
      ivy: { spring: ['#4e7a3a'], summer: ['#3e6830'], autumn: ['#8a5a2a'], winter: ['#4a5440'] },
    })),
    shadow: { rx: 160, ry: 12, h: 160 }, reflect: false,
    tags: ['landmark', 'place:uk/castleton', 'uk', 'peak-district', 'castle', 'ruin'],
    credit: 'native (uk-rebuild, peaks area)',
    build(v, r) {
      const body = [], lit = [];
      // the crag: limestone faces dropping into Cave Dale and the Peak Cavern gorge
      const crag = [[-194, 4], [-180, -60], [-150, -96], [-110, -120], [-40, -132], [60, -130], [130, -116], [170, -84], [194, -30], [194, 4]];
      body.push(['@grass.0', poly(crag)]);
      for (let i = 0; i < 20; i++) { const x = -176 + i * 18.5 + rr(r, -6, 6), y = yAt(crag, x) + rr(r, 14, 60), w = rr(r, 10, 24), h = rr(r, 20, 50); body.push(['@crag.' + (x > 40 ? 1 : 0), poly([[x - w, y + h], [x - w * 0.6, y], [x + w * 0.7, y + 3], [x + w, y + h * 0.9]])], ['@crag.2', poly([[x - w * 0.6, y], [x + w * 0.7, y + 3], [x + w * 0.5, y + 6], [x - w * 0.5, y + 5]]), 0.7]); }
      body.push(['@grass.1', poly([[60, -130], [130, -116], [170, -84], [194, -30], [194, 4], [90, 4]]), 0.35]);
      // the curtain wall along the crag top, broken and stepped
      let cw = 'M-160 -100'; const cwPts = [];
      for (let x = -160; x <= 170; x += 12) { const y = yAt(crag, x) - 4, h = 16 + (r() < 0.3 ? rr(r, -10, 4) : rr(r, 0, 8)); cwPts.push([x, y, h]); }
      cw = 'M' + cwPts.map(p => `${f1(p[0])} ${f1(p[1])}`).join('L') + 'L' + cwPts.slice().reverse().map(p => `${f1(p[0])} ${f1(p[1] - p[2])}`).join('L') + 'z';
      body.push(['@stone.1', cw]);
      body.push({ s: '@stone.3', w: 0.8, op: 0.35, d: cwPts.map(p => `M${f1(p[0])} ${f1(p[1] - p[2] * 0.5)}h12`).join(''), detail: true });
      // the keep: a square tower with clasping buttresses, a ragged top, small round-headed openings
      const kx = -40, kw = 92, ky = yAt(crag, kx + kw / 2) - 2, kh = 170;
      body.push(['@stone.0', `M${kx} ${f1(ky)}V${f1(ky - kh + 10)}L${kx + 8} ${f1(ky - kh)}L${kx + 22} ${f1(ky - kh + 6)}L${kx + 36} ${f1(ky - kh - 4)}L${kx + 52} ${f1(ky - kh + 8)}L${kx + 70} ${f1(ky - kh + 2)}L${kx + kw} ${f1(ky - kh + 14)}V${f1(ky)}z`]);
      body.push(['@stone.1', rect(kx + kw - 22, ky - kh + 12, 22, kh - 12), 0.65]);
      body.push(['@stone.2', rect(kx, ky - kh + 10, 12, kh - 10), 0.6]);
      for (const bx of [kx - 4, kx + kw * 0.5 - 5, kx + kw - 6]) body.push(['@stone.1', rect(bx, ky - kh + 16, 10, kh - 16), 0.5]);
      quoins(body, kx, ky, ky - kh + 14, 1, '@stone.2'); quoins(body, kx + kw, ky, ky - kh + 14, -1, '@stone.1');
      for (let i = 0; i < 8; i++) body.push(['@stone.' + (i % 2), blob(r, kx - 30 + i * 22 + rr(r, -6, 6), ky + rr(r, 4, 14), rr(r, 5, 9), rr(r, 3, 5), 5, 0.4)]);
      let courses = ''; for (let y = ky - 8; y > ky - kh + 14; y -= 8) courses += `M${kx} ${f1(y)}h${kw}`;
      body.push({ s: '@stone.3', w: 0.7, op: 0.3, d: courses, detail: true });
      for (const [wx, wy] of [[kx + 20, ky - 120], [kx + 58, ky - 120], [kx + 36, ky - 74], [kx + 20, ky - 36], [kx + 64, ky - 40]]) body.push(['@gap', `M${wx} ${wy + 16}V${wy + 5}a5 5 0 0 1 10 0V${wy + 16}z`]);
      body.push(['@ivy.0', blob(r, kx + 80, ky - 30, 14, 26, 7, 0.4), 0.85], ['@ivy.0', blob(r, -130, yAt(crag, -130) - 14, 20, 10, 6, 0.4), 0.85]);
      // a warm wash on the walls from the village below after dark
      lit.push({ f: { lin: [[0, '@wash', 0], [1, '@wash', 0.35]], x1: 0, y1: ky - kh, x2: 0, y2: ky }, d: rect(kx, ky - kh, kw, kh) });
      lit.push({ f: '@wash', d: cw, op: 0.18 });
      return { body, lit };
    },
  });

  /* ---------- landmark.bakewell-bridge: the medieval five-arched bridge over the Wye ---------- */
  define({
    id: 'landmark.bakewell-bridge', category: 'landmark', size: [700, 130], variants: 1, seasonal: false, flippable: false, parts: ['body', 'lit'],
    palette: { base: { stone: ['#bca988', '#8e7c62', '#dccaa6', '#5a4c3c'], dark: '#2e2a26', lamp: '#ffd890', post: '#2a2a2c', moss: ['#6e8a3e'] } },
    shadow: false, reflect: true,
    tags: ['landmark', 'place:uk/bakewell', 'uk', 'peak-district', 'bridge', 'medieval'],
    credit: 'native (uk-rebuild, peaks area)',
    build(v, r) {
      const body = [], lit = [], deck = -96, W = 340;
      body.push(['@stone.0', `M${-W} ${deck}H${W}V0H${-W}z`]);
      body.push(['@stone.2', rect(-W, deck, 2 * W, 6), 0.8]);
      // the parapet and its coping
      body.push(['@stone.1', rect(-W - 6, deck - 26, 2 * W + 12, 26)], ['@stone.2', rect(-W - 8, deck - 30, 2 * W + 16, 6)], ['@moss.0', rect(-W - 8, deck - 31, 2 * W + 16, 2.5), 0.8]);
      let pc = ''; for (let x = -W; x < W; x += 22) pc += `M${x} ${deck - 24}v22`;
      body.push({ s: '@stone.3', w: 0.8, op: 0.35, d: pc, detail: true });
      // five pointed arches with voussoirs, the cutwaters between them
      const spans = 5, sw = (2 * W) / spans;
      for (let i = 0; i < spans; i++) {
        const cx = -W + sw * (i + 0.5), hw = sw * 0.36, top = deck + 18, foot = -6;
        const arch = `M${f1(cx - hw)} ${foot}V${f1(top + 34)}Q${f1(cx - hw)} ${f1(top)} ${f1(cx)} ${f1(top - 2)}Q${f1(cx + hw)} ${f1(top)} ${f1(cx + hw)} ${f1(top + 34)}V${foot}z`;
        body.push(['@dark', arch]);
        body.push(['@stone.1', `M${f1(cx - hw)} ${f1(top + 34)}Q${f1(cx - hw)} ${f1(top)} ${f1(cx)} ${f1(top - 2)}L${f1(cx)} ${f1(top + 10)}Q${f1(cx - hw + 10)} ${f1(top + 12)} ${f1(cx - hw + 10)} ${f1(top + 40)}V${foot}H${f1(cx - hw)}z`, 0.7]);
        for (let k = 0; k < 11; k++) {
          const a0 = Math.PI * (1 - k / 11), a1 = Math.PI * (1 - (k + 1) / 11), P = (a, rx, ry) => [cx + Math.cos(a) * rx, top + 34 - Math.sin(a) * ry];
          body.push([k % 2 ? '@stone.0' : '@stone.2', poly([P(a0, hw, 36), P(a0, hw * 1.25, 50), P(a1, hw * 1.25, 50), P(a1, hw, 36)]), 0.8]);
        }
        body.push({ s: '@stone.2', w: 2, op: 0.6, d: `M${f1(cx - hw - 6)} ${f1(top + 34)}Q${f1(cx - hw - 6)} ${f1(top - 12)} ${f1(cx)} ${f1(top - 14)}Q${f1(cx + hw + 6)} ${f1(top - 12)} ${f1(cx + hw + 6)} ${f1(top + 34)}` });
        if (i > 0) { const px = -W + sw * i; body.push(['@stone.1', poly([[px - 14, 0], [px - 14, deck + 50], [px, deck + 34], [px + 14, deck + 50], [px + 14, 0]])], ['@stone.2', poly([[px - 14, deck + 50], [px, deck + 34], [px, 0], [px - 14, 0]]), 0.5]); }
      }
      let courses = ''; for (let y = deck + 14; y < 0; y += 12) courses += `M${-W} ${y}H${W}`;
      body.push({ s: '@stone.3', w: 0.7, op: 0.22, d: courses, detail: true });
      for (let i = 0; i < 10; i++) body.push(['@moss.0', blob(r, rr(r, -W, W), rr(r, -12, -3), rr(r, 6, 14), 3, 5, 0.4), 0.7]);
      // two lamps on the parapet, lit after dark
      for (const x of [-W + 30, W - 30]) { body.push({ s: '@post', w: 3, d: `M${x} ${deck - 30}v-34` }, ['@post', rect(x - 5, deck - 72, 10, 9)]); lit.push({ f: '@lamp', d: ell(x, deck - 67, 4, 4) }, { f: { rad: [[0, '@lamp', 0.5], [1, '@lamp', 0]], cx: x, cy: deck - 66, r: 40 }, d: circ(x, deck - 66, 40) }); }
      return { body, lit };
    },
  });

  /* ---------- landmark.hathersage-church: St Michael and All Angels, the west tower and spire ---------- */
  define({
    id: 'landmark.hathersage-church', category: 'landmark', size: [400, 330], variants: 1, seasonal: false, flippable: false, parts: ['body'],
    palette: { base: { stone: ['#b8a888', '#8a7c64', '#d8caa8', '#5e5444'], roof: ['#6a665e', '#4a4842', '#8a867c'], glass: '#2e3440', lead: '#e0d6bc' } },
    night: { glow: { window: '#ffcf7e' }, on: 0.85 },
    shadow: { rx: 180, ry: 12, h: 300 }, reflect: false,
    tags: ['landmark', 'place:uk/hathersage', 'uk', 'peak-district', 'church', 'spire'],
    credit: 'native (uk-rebuild, peaks area)',
    build(v, r) {
      const body = [];
      const tx = -190, tw = 74, th = 170;
      // the nave and the lower chancel, battlemented, with a lead roof behind the parapet
      body.push(['@stone.0', rect(tx + tw, -110, 200, 110)], ['@stone.0', rect(tx + tw + 200, -86, 104, 86)]);
      body.push(['@stone.1', rect(tx + tw, -110, 200, 10), 0.6]);
      let bat = ''; for (let x = tx + tw; x < tx + tw + 200; x += 14) bat += rect(x, -120, 8, 10); for (let x = tx + tw + 200; x < tx + tw + 300; x += 14) bat += rect(x, -96, 8, 10);
      body.push(['@stone.0', bat]);
      body.push(['@roof.0', poly([[tx + tw, -110], [tx + tw + 100, -128], [tx + tw + 200, -110]]), 0.7]);
      let courses = ''; for (let y = -10; y > -110; y -= 9) courses += `M${tx + tw} ${y}h${y > -86 ? 304 : 200}`;
      body.push({ s: '@stone.3', w: 0.7, op: 0.28, d: courses, detail: true });
      for (let i = 0; i < 4; i++) body.push(['@stone.1', rect(tx + tw + 46 + i * 48, -110, 8, 110), 0.5]);
      // tall perpendicular windows in the aisle wall and the east end
      for (let i = 0; i < 4; i++) {
        const wx = tx + tw + 18 + i * 48;
        body.push(['@stone.2', `M${wx - 3} -18V-70a15 15 0 0 1 30 0V-18z`]);
        body.push({ f: '@glass', d: `M${wx} -22V-68a12 12 0 0 1 24 0V-22z`, glow: 'window' });
        body.push({ s: '@lead', w: 1, op: 0.6, d: `M${wx + 12} -22V-78M${wx} -48h24` });
      }
      for (let i = 0; i < 2; i++) { const wx = tx + tw + 220 + i * 42; body.push(['@stone.2', `M${wx - 3} -16V-56a13 13 0 0 1 26 0V-16z`]); body.push({ f: '@glass', d: `M${wx} -20V-54a10 10 0 0 1 20 0V-20z`, glow: 'window' }); }
      // the porch
      body.push(['@stone.1', rect(tx + tw + 120, -56, 40, 56)], ['@roof.0', poly([[tx + tw + 116, -56], [tx + tw + 140, -76], [tx + tw + 164, -56]])], ['@roof.1', `M${tx + tw + 130} 0V-30a10 10 0 0 1 20 0V0z`]);
      // the west tower: angle buttresses, belfry openings, battlements and pinnacles
      body.push(['@stone.0', rect(tx, -th, tw, th)], ['@stone.1', rect(tx + tw - 16, -th, 16, th), 0.6], ['@stone.2', rect(tx, -th, 10, th), 0.5]);
      for (const bx of [tx - 6, tx + tw - 4]) for (let k = 0; k < 3; k++) body.push(['@stone.1', rect(bx + k, -40 - k * 50, 10 - k * 2, 40 + (k ? 0 : 0) + 10)]);
      quoins(body, tx, 0, -th, 1, '@stone.2'); quoins(body, tx + tw + 304, 0, -86, -1, '@stone.1');
      let tc = ''; for (let y = -9; y > -th; y -= 9) tc += `M${tx} ${y}h${tw}`;
      body.push({ s: '@stone.3', w: 0.7, op: 0.28, d: tc, detail: true });
      body.push(['@stone.2', rect(tx - 4, -th - 4, tw + 8, 6)]);
      let tb = ''; for (let x = tx - 4; x < tx + tw + 4; x += 12) tb += rect(x, -th - 14, 7, 10);
      body.push(['@stone.0', tb]);
      for (const px of [tx - 4, tx + tw - 4]) body.push(['@stone.0', poly([[px, -th - 14], [px + 4, -th - 34], [px + 8, -th - 14]])]);
      for (const wx of [tx + 14, tx + 42]) { body.push(['@stone.2', `M${wx - 3} ${-th + 52}V${-th + 18}a10 10 0 0 1 20 0V${-th + 52}z`]); body.push({ f: '@glass', d: `M${wx} ${-th + 48}V${-th + 20}a7 7 0 0 1 14 0V${-th + 48}z`, glow: 'window' }); body.push({ s: '@lead', w: 1, op: 0.5, d: `M${wx} ${-th + 32}h14M${wx} ${-th + 40}h14` }); }
      body.push(['@stone.2', `M${tx + 22} -20V-72a15 15 0 0 1 30 0V-20z`]); body.push({ f: '@glass', d: `M${tx + 25} -24V-70a12 12 0 0 1 24 0V-24z`, glow: 'window' });
      body.push({ f: '@glass', d: rect(tx + 32, -112, 10, 14), glow: 'window' });
      // the octagonal spire with its lucarnes and bands
      const sx = tx + tw / 2, sb = -th - 6, st = -332;
      body.push(['@stone.0', poly([[sx - 26, sb], [sx - 1, st], [sx + 1, st], [sx + 26, sb]])]);
      body.push(['@stone.1', poly([[sx + 4, sb], [sx + 1, st], [sx + 26, sb]]), 0.7]);
      body.push(['@stone.2', poly([[sx - 26, sb], [sx - 1, st], [sx - 14, sb]]), 0.5]);
      for (const k of [0.3, 0.55, 0.78]) { const y = sb + (st - sb) * k, w = 26 * (1 - k); body.push({ s: '@stone.3', w: 1, op: 0.5, d: `M${f1(sx - w)} ${f1(y)}H${f1(sx + w)}` }); }
      for (const [k, d] of [[0.18, -1], [0.18, 1], [0.46, 0]]) { const y = sb + (st - sb) * k, x = sx + d * 10; body.push(['@stone.2', poly([[x - 5, y + 10], [x, y - 6], [x + 5, y + 10]])], { f: '@glass', d: rect(x - 2, y + 2, 4, 7), glow: 'window' }); }
      body.push({ s: '@roof.1', w: 1.4, d: `M${sx} ${st}v-8M${sx - 4} ${st - 5}h8` });
      return { body };
    },
  });

  /* ---------- landmark.derwent-dam: the masonry dam with its two castellated towers ---------- */
  define({
    id: 'landmark.derwent-dam', category: 'landmark', size: [940, 250], variants: 1, seasonal: false, flippable: false, parts: ['body', 'spill'],
    palette: { base: { stone: ['#b4a88e', '#867a64', '#d6caae', '#5a5244'], dark: '#2a2a2a', glass: '#30343a', foam: ['#f4f8fa', '#d4e4ea', '#a8c4d0'] } },
    night: { glow: { window: '#ffd48a' }, on: 0.6 },
    anim: { flicker: { part: 'spill', op: [0.7, 1], period: 1.3 } },
    shadow: false, reflect: true,
    tags: ['landmark', 'place:uk/ladybower', 'uk', 'peak-district', 'dam', 'reservoir'],
    credit: 'native (uk-rebuild, peaks area)',
    build(v, r) {
      const body = [], spill = [], W = 470, top = -150;
      body.push(['@stone.0', `M${-W} ${top}H${W}V0H${-W}z`]);
      body.push(['@stone.1', `M${-W} ${top + 20}H${W}V0H${-W}z`, 0.35]);
      let courses = ''; for (let y = top + 10; y < 0; y += 10) courses += `M${-W} ${y}H${W}`;
      for (let y = top + 10, k = 0; y < 0; y += 10, k++) for (let x = -W + (k % 2) * 20; x < W; x += 40) courses += `M${x} ${y}v10`;
      body.push({ s: '@stone.3', w: 0.6, op: 0.25, d: courses, detail: true });
      // the overflow: a white sheet down the face between the towers in a wet winter
      spill.push({ f: { lin: [[0, '@foam.0', 0.95], [0.7, '@foam.1', 0.85], [1, '@foam.2', 0.6]], x1: 0, y1: top, x2: 0, y2: 0 }, d: `M-220 ${top + 4}H220V-4H-220z` });
      for (let i = 0; i < 26; i++) { const x = -214 + i * 17 + rr(r, -3, 3); spill.push({ s: '@foam.2', w: 1.2, op: 0.5, d: `M${f1(x)} ${top + 10}l${f1(rr(r, -2, 2))} ${f1(rr(r, 80, 140))}` }); }
      spill.push({ f: '@foam.0', d: blob(r, 0, -4, 240, 12, 14, 0.4), op: 0.9 });
      // the parapet walkway and its arcade of corbels
      body.push(['@stone.2', rect(-W, top - 10, 2 * W, 10)]);
      let corb = ''; for (let x = -W + 10; x < W; x += 20) corb += `M${x} ${top}v6`;
      body.push({ s: '@stone.3', w: 2, op: 0.4, d: corb });
      // the two towers: tall, castellated, with lancet windows and a pointed arch through
      for (const cx of [-300, 300]) {
        const tw = 76, th = 250;
        body.push(['@stone.0', rect(cx - tw / 2, -th, tw, th)], ['@stone.1', rect(cx + tw / 2 - 18, -th, 18, th), 0.6], ['@stone.2', rect(cx - tw / 2, -th, 10, th), 0.55]);
        for (const bx of [cx - tw / 2 - 8, cx + tw / 2 - 4]) body.push(['@stone.1', rect(bx, -th + 30, 12, th - 30)]);
        let tb = ''; for (let x = cx - tw / 2 - 8; x < cx + tw / 2 + 8; x += 13) tb += rect(x, -th - 14, 8, 14);
        body.push(['@stone.0', tb], ['@stone.2', rect(cx - tw / 2 - 8, -th, tw + 16, 6)]);
        body.push(['@dark', `M${cx - 18} ${top}V${top - 40}Q${cx} ${top - 66} ${cx + 18} ${top - 40}V${top}z`]);
        quoins(body, cx - tw / 2, 0, -th, 1, '@stone.2'); quoins(body, cx + tw / 2, 0, -th, -1, '@stone.1');
        for (const [wx, wy] of [[cx - 22, -th + 34], [cx + 8, -th + 34], [cx - 22, -th + 74], [cx + 8, -th + 74], [cx - 22, -th + 114], [cx + 8, -th + 114]]) { body.push(['@stone.2', `M${wx - 2} ${wy + 26}V${wy + 6}l8-8 8 8v20z`]); body.push({ f: '@glass', d: `M${wx} ${wy + 24}V${wy + 7}l6-6 6 6v17z`, glow: 'window' }); }
        let tc = ''; for (let y = -10; y > -th; y -= 10) tc += `M${cx - tw / 2} ${y}h${tw}`;
        body.push({ s: '@stone.3', w: 0.6, op: 0.25, d: tc, detail: true });
      }
      return { body, spill };
    },
  });

  /* ---------- landmark.ladybower-viaduct: the Ashopton viaduct across the reservoir ---------- */
  define({
    id: 'landmark.ladybower-viaduct', category: 'landmark', size: [1100, 200], variants: 1, seasonal: false, flippable: false, parts: ['body', 'lit'],
    palette: { base: { conc: ['#c8c0b0', '#9a9284', '#e4ded0', '#6a6458'], dark: '#3a3e42', lamp: '#ffd68c', post: '#3a3c40' } },
    shadow: false, reflect: true,
    tags: ['landmark', 'place:uk/ladybower', 'uk', 'peak-district', 'viaduct', 'reservoir'],
    credit: 'native (uk-rebuild, peaks area)',
    build(v, r) {
      const body = [], lit = [], W = 550, deck = -150, n = 11, sw = (2 * W) / n;
      body.push(['@conc.0', `M${-W} ${deck}H${W}V0H${-W}z`]);
      for (let i = 0; i < n; i++) {
        const cx = -W + sw * (i + 0.5), hw = sw * 0.4;
        body.push(['@dark', `M${f1(cx - hw)} 0V${deck + 60}A${f1(hw)} ${f1(hw * 0.9)} 0 0 1 ${f1(cx + hw)} ${deck + 60}V0z`]);
        body.push(['@conc.1', `M${f1(cx - hw)} 0V${deck + 60}A${f1(hw)} ${f1(hw * 0.9)} 0 0 1 ${f1(cx - hw * 0.4)} ${f1(deck + 60 - hw * 0.72)}L${f1(cx - hw * 0.3)} ${deck + 70}V0z`, 0.6]);
        body.push({ s: '@conc.2', w: 2.4, op: 0.7, d: `M${f1(cx - hw - 4)} ${deck + 60}A${f1(hw + 4)} ${f1(hw * 0.9 + 4)} 0 0 1 ${f1(cx + hw + 4)} ${deck + 60}` });
        const px = -W + sw * i;
        if (i > 0) body.push(['@conc.2', rect(px - 6, deck + 20, 5, -deck - 20), 0.55], ['@conc.1', rect(px + 1, deck + 20, 5, -deck - 20), 0.5], ['@conc.2', rect(px - 9, deck + 56, 18, 5), 0.8]);
      }
      body.push(['@conc.2', rect(-W - 4, deck - 8, 2 * W + 8, 10)], ['@conc.1', rect(-W - 4, deck - 24, 2 * W + 8, 16)]);
      let rail = ''; for (let x = -W; x < W; x += 16) rail += `M${x} ${deck - 24}v14`;
      body.push({ s: '@conc.3', w: 1, op: 0.4, d: rail, detail: true });
      let courses = ''; for (let y = deck + 16; y < 0; y += 14) courses += `M${-W} ${y}H${W}`;
      body.push({ s: '@conc.3', w: 0.6, op: 0.18, d: courses, detail: true });
      for (let i = 0; i < 7; i++) { const x = -W + 60 + i * ((2 * W - 120) / 6); body.push({ s: '@post', w: 2.6, d: `M${f1(x)} ${deck - 24}v-38q0-6 10-6` }); lit.push({ f: '@lamp', d: ell(x + 10, deck - 66, 4, 2.5) }, { f: { rad: [[0, '@lamp', 0.45], [1, '@lamp', 0]], cx: x + 10, cy: deck - 60, r: 34 }, d: circ(x + 10, deck - 60, 34) }); }
      return { body, lit };
    },
  });

  /* ---------- vehicle.paraglider: a canopy over the ridge (unlit, a sky mover) ---------- */
  define({
    id: 'vehicle.paraglider', category: 'vehicle', size: [90, 80], variants: 3, seasonal: false, flippable: true, weight: 0, parts: ['body'],
    palette: { base: { canopy: ['#e0533a', '#f2b632', '#3a7ac0'], under: ['#a83a28', '#c48a1e', '#2a5a92'], line: '#4a4a4a', pilot: '#2a2e36' } },
    anim: { bob: { part: '*', dy: 3, period: 4 } },
    shadow: false, reflect: false,
    tags: ['uk', 'peak-district', 'paraglider', 'unlit', 'kit:vehicles', 'role:sky'],
    credit: 'native (uk-rebuild, peaks area)',
    build(v, r) {
      const body = [];
      body.push(['@under.' + v, 'M-46 -62Q0 -92 46 -62Q0 -78 -46 -62z']);
      body.push(['@canopy.' + v, 'M-46 -62Q0 -94 46 -62L42 -58Q0 -86 -42 -58z']);
      let cells = ''; for (let i = 1; i < 8; i++) { const x = -42 + i * 10.5; cells += `M${f1(x)} ${f1(-60 - Math.sin(i / 8 * Math.PI) * 22)}l0 6`; }
      body.push({ s: '@under.' + v, w: 1, op: 0.7, d: cells });
      body.push({ s: '@line', w: 0.6, op: 0.7, d: 'M-42 -59L-2 -6M-20 -70L-1 -6M0 -74L0 -6M20 -70L1 -6M42 -59L2 -6' });
      body.push(['@pilot', 'M-5 -8h10l-2 8h-6z'], ['@pilot', circ(0, -11, 3)]);
      return { body };
    },
  });

  /* ---------- bird.curlew-flight: a curlew over the moor, long down-curved bill ---------- */
  define({
    id: 'bird.curlew-flight', category: 'bird', size: [40, 18], variants: 1, seasonal: false, flippable: true, weight: 0, parts: ['wings', 'body'],
    palette: { base: { body: ['#8a7458', '#5e4e3a', '#c4b090'] } },
    anim: { flap: { part: 'wings', pivot: [0, -6], sy: [-0.6, 1], period: 0.7 } },
    shadow: false, reflect: false,
    tags: ['uk', 'peak-district', 'moorland', 'kit:birds', 'role:bird'],
    credit: 'native (uk-rebuild, peaks area)',
    build() {
      return {
        wings: [['@body.0', 'M-4 -6Q-14 -16 -22 -14Q-12 -10 -2 -4zM4 -6Q14 -16 22 -15Q12 -9 2 -4z'], ['@body.1', 'M-16 -14Q-20 -15 -22 -14L-14 -12zM16 -14Q20 -15 22 -15L14 -12z']],
        body: [['@body.0', 'M-10 -5Q-2 -9 8 -6L10 -4Q0 -2 -10 -4z'], ['@body.2', 'M-8 -4Q0 -3 8 -5L8 -4Q0 -2 -8 -3z', 0.7], { s: '@body.1', w: 1, d: 'M9 -5Q16 -4 19 0' }, ['@body.1', 'M-10 -5L-14 -4L-10 -3z']],
      };
    },
  });
})();
