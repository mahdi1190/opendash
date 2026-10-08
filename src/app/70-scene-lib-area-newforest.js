/* ============================================================
   SCENE LIBRARY: area-newforest (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls inside this IIFE and nothing else; every build
   runs lazily, once per (variant, season), memoised by the core.
   The New Forest objects the shared library does not have yet:
   - landmark.st-michaels-lyndhurst: St Michael and All Angels on its knoll
     above Lyndhurst, a Victorian Gothic church in red brick banded with
     yellow brick, a long steep slate nave and the tall west tower and spire.
   - landmark.hurst-castle: the round Tudor keep with its three bastions at
     the tip of Hurst Spit, and (variant 0) the long Victorian granite
     batteries either side with their casemate ports.
   - landmark.bucklers-hard-row: one of the two Georgian brick cottage rows
     that step down the wide grass street to the Beaulieu River (variant 0
     steps down to the right, variant 1 to the left).
   - landmark.palace-house-beaulieu: Palace House, the medieval abbey
     gatehouse made a house: grey stone, steep gables, corner turrets.
   - landmark.st-thomas-lymington: the church at the top of Lymington High
     Street, its stone tower crowned by the white cupola.
   - boat.yacht: a moored cruising yacht (sail under a cover).
   Lit from the LEFT. Anchors at the ground (the waterline for the yacht).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const f1 = (n) => Math.round(n * 10) / 10;
  const rect = (x0, y0, x1, y1) => { const a = Math.min(x0, x1), b = Math.min(y0, y1), w = Math.abs(x1 - x0), h = Math.abs(y1 - y0); return `M${f1(a)} ${f1(b)}h${f1(w)}v${f1(h)}h${f1(-w)}z`; };
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0z`;
  const poly = (pts) => 'M' + pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L') + 'z';
  /** A pointed lancet: surround, glass (lit at dusk), a highlight and the mullion. */
  const lancet = (x, y, w, h, dress, glass) => [
    [dress, `M${f1(x - 1.6)} ${f1(y + h + 1)}V${f1(y + w * .4)}Q${f1(x + w / 2)} ${f1(y - w * 1.0)} ${f1(x + w + 1.6)} ${f1(y + w * .4)}V${f1(y + h + 1)}z`],
    { f: glass + '.0', d: `M${f1(x)} ${f1(y + h)}V${f1(y + w * .45)}Q${f1(x + w / 2)} ${f1(y - w * .7)} ${f1(x + w)} ${f1(y + w * .45)}V${f1(y + h)}z`, glow: 'window' },
    { f: glass + '.1', d: `M${f1(x)} ${f1(y + h * .5)}V${f1(y + w * .45)}Q${f1(x + w * .3)} ${f1(y - w * .2)} ${f1(x + w * .5)} ${f1(y - w * .1)}z`, op: .4, detail: true },
  ];
  /** A sash window: frame, glass (lit at dusk), the glazing bars. */
  const sash = (x, y, w, h, frame, glass, bars) => [
    [frame, rect(x - 2.5, y - 2.5, x + w + 2.5, y + h + 3)],
    { f: glass + '.0', d: rect(x, y, x + w, y + h), glow: 'window' },
    { s: bars, w: 1, d: `M${f1(x + w / 2)} ${f1(y)}V${f1(y + h)}M${f1(x)} ${f1(y + h / 2)}H${f1(x + w)}M${f1(x)} ${f1(y + h / 4)}H${f1(x + w)}M${f1(x)} ${f1(y + h * .75)}H${f1(x + w)}`, detail: true },
  ];
  /** Headstones in a churchyard (detail). */
  const stones = (b, xs) => { for (const [x, h] of xs) b.push({ f: '@grave.0', d: `M${x} 0V${-h + 2}q3.5-4 7 0V0z`, detail: true }, { f: '@grave.1', d: `M${x + 5} 0V${-h + 2}q1.5-2 2-1.2V0z`, op: .7, detail: true }); };

  /* ---------- landmark.st-michaels-lyndhurst ---------- */
  sceneObjDefine({
    id: 'landmark.st-michaels-lyndhurst',
    category: 'landmark',
    size: [470, 440],
    variants: 1,
    seasonal: false,
    flippable: false,
    palette: {
      base: {
        brick: ['#a24c36', '#7c3626', '#bc6a50'], band: ['#dcc48e', '#b9a274'], stone: ['#d4c9b0', '#a99e86', '#ece4d0'],
        slate: ['#4c505c', '#383b46', '#646a78'], glass: ['#384454', '#a4b6ca'], door: ['#3a2a22'], yew: ['#22402c', '#2e5236', '#3e6a44'],
        grave: ['#aaa496', '#8a8478'], flood: ['#ffe0a4'], vane: ['#c8a040'],
      },
    },
    night: { glow: { window: '#f4c674', lamp: '#ffe2a0' }, on: 0.85 },
    parts: ['body', 'lit'],
    shadow: { rx: 230, ry: 16, h: 440 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/lyndhurst', 'uk', 'new-forest', 'lyndhurst', 'church', 'spire', 'village', 'kit:temperate'],
    credit: 'area-newforest: St Michael and All Angels, Lyndhurst (drawn from the public view of the church)',
    build() {
      const b = [], lit = [];
      // yews in the churchyard, behind
      b.push(['@yew.0', 'M-252 0C-272-10-276-60-258-86C-244-106-220-104-212-84C-202-58-206-16-220 0z'], ['@yew.1', 'M-248-10C-262-24-262-62-250-80C-240-92-228-90-222-76C-216-58-222-26-232-10z'], ['@yew.2', 'M-244-46C-248-62-242-76-234-78C-230-70-230-56-236-46z', .8]);
      b.push(['@yew.0', 'M180 0C164-8 160-48 174-70C186-86 206-84 212-66C220-44 216-12 204 0z'], ['@yew.2', 'M182-36C182-52 188-64 196-66C200-58 198-44 192-36z', .7]);
      // the chancel (east end, lower)
      b.push(['@brick.1', rect(-236, 0, -196, -72)], ['@band.1', rect(-236, -40, -196, -35)], ['@slate.1', poly([[-242, -70], [-216, -124], [-196, -124], [-196, -70]])]);
      b.push(...lancet(-226, -60, 12, 40, '@stone.0', '@glass'));
      // the nave: red brick with yellow bands, brick courses (detail), the steep slate roof
      b.push(['@brick.0', rect(-198, 0, 64, -96)], { f: '@brick.1', d: rect(-198, -14, 64, 0), op: .6 });
      for (const y of [-26, -52, -78]) b.push(['@band.0', rect(-198, y - 4, 64, y)]);
      b.push({ s: '@brick.1', w: .6, op: .45, detail: true, d: Array.from({ length: 12 }, (_, i) => `M-198 ${-6 - i * 7.5}H64`).join('') });
      b.push(['@slate.0', poly([[-206, -94], [-176, -178], [64, -178], [64, -94]])], ['@slate.2', poly([[-206, -94], [-176, -178], [-160, -178], [-188, -94]]), .6]);
      b.push({ s: '@slate.1', w: .8, op: .55, detail: true, d: Array.from({ length: 8 }, (_, i) => `M${f1(-203 + i * 3.7)} ${f1(-104 - i * 10)}H64`).join('') });
      b.push(['@stone.1', rect(-178, -180, 64, -176)]);
      // the east gable end (lit) and its cross-less finial
      b.push(['@brick.2', poly([[-206, -94], [-176, -178], [-176, -94]])], ['@stone.2', rect(-180, -186, -172, -178)]);
      // buttresses and the nave lancets (paired)
      for (const x of [-196, -146, -96, 4, 54]) b.push(['@stone.1', `M${x} 0V-58l4-8h6V0z`], ['@brick.2', `M${x} 0V-58l4-8h2V0z`, .8]);
      for (const x of [-182, -132, 18]) { b.push(...lancet(x, -76, 9, 46, '@stone.0', '@glass')); b.push(...lancet(x + 14, -76, 9, 46, '@stone.0', '@glass')); }
      // the south porch: a gabled brick porch, stone arch, a lamp
      b.push(['@brick.2', rect(-84, 0, -38, -54)], ['@slate.0', poly([[-90, -52], [-61, -86], [-32, -52]])], ['@stone.0', poly([[-92, -50], [-61, -88], [-30, -50], [-34, -50], [-61, -82], [-88, -50]])]);
      b.push(['@stone.2', 'M-72 0V-28q11-18 22 0V0z'], ['@door', 'M-68 0V-27q7-12 14 0V0z']);
      b.push({ f: '@glass.1', d: rect(-63, -46, -59, -40), glow: 'lamp' });
      // the west tower: three stages, clasping buttresses, bands, the west window, belfry openings
      const T0 = 64, T1 = 136;
      b.push(['@brick.0', rect(T0, 0, T1, -262)], { f: '@brick.1', d: rect(T0 + 46, 0, T1, -262), op: .5 });
      for (const y of [-30, -64, -120, -186, -224]) b.push(['@band.0', rect(T0, y - 5, T1, y)]);
      b.push({ s: '@brick.1', w: .6, op: .4, detail: true, d: Array.from({ length: 30 }, (_, i) => `M${T0} ${-6 - i * 8.5}H${T1}`).join('') });
      for (const [x, k] of [[T0 - 6, '@brick.2'], [T1 - 4, '@brick.1']]) b.push([k, `M${x} 0V-236l5-10h5V0z`], { f: '@stone.1', d: `M${x} -112h10v-6h-10zM${x} -180h10v-6h-10z` });
      b.push(...lancet(T0 + 22, -112, 28, 62, '@stone.0', '@glass'), { s: '@stone.0', w: 1.4, d: `M${T0 + 36} -116V-50M${T0 + 22} -78H${T0 + 50}`, detail: true });
      b.push(['@stone.2', `M${T0 + 24} 0V-24q12-16 24 0V0z`], ['@door', `M${T0 + 27} 0V-23q9-12 18 0V0z`]);
      b.push(...lancet(T0 + 30, -168, 12, 30, '@stone.0', '@glass'));
      for (const x of [T0 + 14, T0 + 42]) b.push(['@stone.0', `M${x - 2} -190V-212q8-14 18 0V-190z`], ['@slate.1', `M${x} -192V-210q7-10 14 0V-192z`], { s: '@stone.1', w: 1, op: .8, d: `M${x} -196h14M${x} -200h14M${x} -204h14`, detail: true });
      b.push(['@stone.0', rect(T0 - 6, -262, T1 + 6, -270)], ['@stone.1', rect(T0 - 6, -262, T1 + 6, -265)]);
      // corner pinnacles
      for (const x of [T0 - 4, T1 + 4]) b.push(['@stone.2', poly([[x - 7, -270], [x, -300], [x + 7, -270]])], { f: '@stone.1', d: poly([[x, -300], [x + 7, -270], [x + 2, -270]]), op: .8 });
      // the broach spire: the lit face, the shaded face, banding, lucarnes, the vane
      const cx = (T0 + T1) / 2, top = -436;
      b.push(['@slate.2', poly([[T0 + 2, -270], [cx, top], [cx + 2, -270]])], ['@slate.0', poly([[cx + 2, -270], [cx, top], [T1 - 2, -270]])]);
      b.push(['@slate.1', poly([[T0 + 2, -270], [T0 + 12, -270], [T0 + 2, -282]]), .9], ['@slate.1', poly([[T1 - 2, -270], [T1 - 12, -270], [T1 - 2, -282]]), .9]);
      b.push({ s: '@slate.1', w: .9, op: .6, detail: true, d: Array.from({ length: 9 }, (_, i) => { const y = -290 - i * 16, k = (y - top) / (-270 - top); return `M${f1(cx - 34 * k)} ${y}H${f1(cx + 34 * k)}`; }).join('') });
      for (const [y, w] of [[-300, 14], [-358, 9]]) b.push(['@stone.0', poly([[cx - w, y], [cx, y - w * 1.6], [cx + w, y]])], { f: '@glass.0', d: rect(cx - w * .45, y, cx + w * .45, y - w * .9), glow: 'window' });
      b.push({ s: '@vane', w: 1.6, d: `M${cx} ${top}V${top - 16}M${cx - 7} ${top - 10}H${cx + 7}` }, { f: '@vane', d: ell(cx, top - 16, 2.4, 2.4) });
      // the churchyard wall and headstones
      stones(b, [[-186, 10], [-164, 8], [-128, 11], [-110, 8], [-26, 9], [-10, 12], [150, 9], [166, 8]]);
      b.push(['@stone.1', rect(-262, 0, 224, -7)], ['@stone.2', rect(-262, -7, 224, -10)], { s: '@stone.1', w: .6, op: .6, d: Array.from({ length: 24 }, (_, i) => `M${-256 + i * 20} -7V0`).join(''), detail: true });
      // night: a soft floodlight on the tower and the spire, the porch lamp's pool
      lit.push({ f: '@flood', op: .22, d: poly([[T0 - 8, 0], [T0 + 4, -270], [cx, top + 10], [T1 - 4, -270], [T1 + 8, 0]]) }, { f: '@flood', op: .3, d: ell(-61, -6, 26, 6) });
      return { body: b, lit };
    },
  });

  /* ---------- landmark.hurst-castle ---------- */
  sceneObjDefine({
    id: 'landmark.hurst-castle',
    category: 'landmark',
    size: [940, 170],
    variants: 2,
    seasonal: false,
    flippable: false,
    palette: {
      base: {
        stone: ['#cbc2aa', '#8e8672', '#e4dcc6'], gran: ['#b4ac98', '#7e7866', '#d2cab6'], dark: ['#3e4442', '#2a2e2e'], port: ['#4a5250'],
        grass: ['#7c8c5c', '#5e6e46'], glass: ['#3a4650', '#a8b8c4'], flood: ['#ffe2a8'], door: ['#3a3430'], shingle: ['#b8ab90', '#9a8e74'],
      },
    },
    night: { glow: { window: '#f4c674', lamp: '#ffe6b0' }, on: 0.9 },
    parts: ['body', 'lit'],
    shadow: { rx: 300, ry: 10, h: 30 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/hurst-castle', 'uk', 'new-forest', 'lymington', 'castle', 'fort', 'coast', 'kit:temperate', 'kit:water'],
    credit: 'area-newforest: Hurst Castle on Hurst Spit (drawn from public views; no flags)',
    build(v) {
      const b = [], lit = [];
      const drum = (cx, r, h, k0, k1) => ({ lin: [[0, k0], [0.35, '@stone.0'], [1, k1]], x1: cx - r, y1: 0, x2: cx + r, y2: 0 });
      // the long batteries (variant 0): granite casemate walls with an earth bank and parapet on top
      if (v === 0) {
        for (const [x0, x1, s] of [[-470, -138, -1], [138, 470, 1]]) {
          const lo = Math.min(x0, x1), hi = Math.max(x0, x1), end = s < 0 ? lo : hi;
          b.push(['@grass.1', poly([[lo + (s < 0 ? 18 : 0), -78], [lo + (s < 0 ? 30 : 0), -92], [hi - (s > 0 ? 30 : 0), -92], [hi - (s > 0 ? 18 : 0), -78]])]);
          b.push([{ lin: [[0, '@gran.2'], [1, '@gran.0']], x1: 0, y1: -80, x2: 0, y2: 0 }, poly([[lo, 0], [lo + (s < 0 ? 16 : 0), -80], [hi - (s > 0 ? 16 : 0), -80], [hi, 0]])]);
          b.push({ f: '@gran.1', d: rect(lo + 4, -80, hi - 4, -86), op: .9 });
          b.push({ s: '@gran.1', w: .7, op: .5, detail: true, d: Array.from({ length: 6 }, (_, i) => `M${lo + 8} ${-10 - i * 12}H${hi - 8}`).join('') });
          // casemate ports: dressed arches, dark openings, a few lit
          const n = 8, step = (hi - lo - 60) / n;
          for (let i = 0; i < n; i++) {
            const x = lo + 30 + i * step + step / 2;
            b.push(['@gran.2', `M${f1(x - 14)} -14V-40q14-18 28 0V-14z`], ['@port.0', `M${f1(x - 10)} -16V-38q10-13 20 0V-16z`]);
            if (i % 3 === 1) b.push({ f: '@glass.0', d: rect(x - 4, -32, x + 4, -22), glow: 'window' });
          }
          b.push({ f: '@gran.1', d: poly([[end - s * 2, 0], [end + s * 14, -80], [end + s * 4, -80], [end - s * 12, 0]]), op: .6 });
          // the earth bank's grass top and a parapet line
          b.push(['@grass.0', poly([[lo + 24, -92], [lo + 40, -100], [hi - 40, -100], [hi - 24, -92]])], { s: '@grass.1', w: 1, op: .6, d: `M${lo + 40} -96H${hi - 40}`, detail: true });
        }
      }
      // the three semicircular bastions round the keep
      for (const [cx, r, h] of [[-104, 58, 92], [104, 58, 92], [0, 64, 78]]) {
        b.push([drum(cx, r, h, '@stone.2', '@stone.1'), `M${cx - r} 0V${-h}Q${cx} ${-h - 10} ${cx + r} ${-h}V0z`]);
        b.push(['@stone.2', `M${cx - r - 2} ${-h}Q${cx} ${-h - 12} ${cx + r + 2} ${-h}V${-h + 6}Q${cx} ${-h - 4} ${cx - r - 2} ${-h + 6}z`]);
        b.push({ s: '@stone.1', w: .7, op: .45, detail: true, d: Array.from({ length: 5 }, (_, i) => { const y = -12 - i * (h - 20) / 5; return `M${cx - r + 2} ${f1(y)}Q${cx} ${f1(y + 8)} ${cx + r - 2} ${f1(y)}`; }).join('') });
        for (const dx of [-r * .5, 0, r * .5]) b.push(['@port.0', rect(cx + dx - 5, -h + 30, cx + dx + 5, -h + 42)]);
      }
      // the twelve-sided keep: facets (lit on the left), the parapet, the windows
      const R = 82, H = 168;
      b.push([drum(0, R, H, '@stone.2', '@stone.1'), `M${-R} -70V${-H}H${R}V-70z`]);
      for (let i = 1; i < 6; i++) { const x = -R + i * (2 * R / 6); b.push({ s: '@stone.1', w: 1, op: .35, d: `M${f1(x)} -72V${-H}` }); }
      b.push({ s: '@stone.1', w: .7, op: .4, detail: true, d: Array.from({ length: 8 }, (_, i) => `M${-R} ${-80 - i * 11}H${R}`).join('') });
      b.push(['@stone.2', rect(-R - 5, -H, R + 5, -H - 10)], ['@stone.1', rect(-R - 5, -H, R + 5, -H - 3)]);
      for (let i = 0; i < 9; i++) b.push(['@stone.0', rect(-R - 4 + i * 20, -H - 10, -R + 6 + i * 20, -H - 18)]);
      b.push(['@stone.1', rect(R - 34, -H - 10, R + 5, -H - 18), .5]);
      for (const [x, y] of [[-46, -140], [-14, -140], [18, -140], [50, -140], [-30, -108], [34, -108]]) b.push(['@stone.2', rect(x - 6, y - 2, x + 6, y + 16)], { f: '@glass.0', d: rect(x - 4, y, x + 4, y + 14), glow: 'window' });
      // the gateway in the front bastion, a lamp over it
      b.push(['@stone.2', 'M-14 0V-30q14-16 28 0V0z'], ['@door', 'M-10 0V-28q10-11 20 0V0z'], { f: '@glass.1', d: rect(-3, -50, 3, -44), glow: 'lamp' });
      // the shingle at the foot
      b.push({ f: '@shingle.0', d: poly([[v === 0 ? -480 : -170, 2], [v === 0 ? 480 : 170, 2], [v === 0 ? 470 : 164, -4], [v === 0 ? -470 : -164, -4]]) });
      lit.push({ f: '@flood', op: .2, d: poly([[-R - 10, 0], [-R, -H - 18], [R, -H - 18], [R + 10, 0]]) });
      return { body: b, lit };
    },
  });

  /* ---------- landmark.bucklers-hard-row ---------- */
  sceneObjDefine({
    id: 'landmark.bucklers-hard-row',
    category: 'landmark',
    size: [520, 190],
    variants: 2,
    seasonal: false,
    flippable: false,
    palette: {
      base: {
        brick: ['#a8563e', '#8c4430', '#b8664a', '#9c5038', '#c07454'], shade: ['#6e3426'], roof: ['#7a4a38', '#5c3628', '#946452'],
        frame: ['#ece6d6'], glass: ['#3c4a58', '#a8b8c8'], bar: '#e8e2d2', door: ['#2f3a34', '#4a2e26', '#2c3446'], chim: ['#8c4430', '#a85a40'], pot: '#b0603c', step: '#c8bca4',
      },
    },
    night: { glow: { window: '#f6c878', lamp: '#ffe2a0' }, on: 0.7 },
    parts: ['body'],
    shadow: { rx: 250, ry: 12, h: 180 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/bucklers-hard', 'uk', 'new-forest', 'beaulieu', 'bucklers-hard', 'cottages', 'georgian', 'village', 'kit:temperate'],
    credit: "area-newforest: the Georgian cottage rows of Buckler's Hard (drawn from public views)",
    build(v) {
      const b = [], s = v === 1 ? -1 : 1, W = 100, n = 5;
      for (let i = 0; i < n; i++) {
        // cottage i: left to right (mirrored for v1), stepping down 9 units each
        const xa = (-n * W / 2 + i * W) * s, xb = xa + W * s, x0 = Math.min(xa, xb), x1 = Math.max(xa, xb), g = -(n - 1 - i) * 9;
        const top = g - 108 + (i % 2) * 4, two = i % 2 === 0;
        b.push(['@brick.' + (i % 5), rect(x0, 0, x1, top)], { f: '@shade.0', d: rect(x0, 0, x1, g - 10), op: .35 });
        b.push({ s: '@shade.0', w: .5, op: .35, detail: true, d: Array.from({ length: 10 }, (_, k) => `M${x0} ${f1(g - 14 - k * 9.4)}H${x1}`).join('') });
        // the roof: eaves to ridge, a lit slope and tile courses
        b.push(['@roof.0', poly([[x0 - 4, top + 1], [x0 + 10, top - 48], [x1 - 10, top - 48], [x1 + 4, top + 1]])], { f: '@roof.2', d: poly([[x0 - 4, top + 1], [x0 + 10, top - 48], [x0 + 22, top - 48], [x0 + 8, top + 1]]), op: .6 });
        b.push({ s: '@roof.1', w: .8, op: .5, detail: true, d: `M${x0} ${top - 12}H${x1}M${x0 + 4} ${top - 24}H${x1 - 4}M${x0 + 7} ${top - 36}H${x1 - 7}` });
        b.push(['@frame.0', rect(x0 - 4, top + 1, x1 + 4, top + 4)]);
        // the chimney on the uphill gable
        const cx = s > 0 ? x0 + 14 : x1 - 14;
        b.push(['@chim.0', rect(cx - 9, top - 40, cx + 9, top - 70)], ['@chim.1', rect(cx - 9, top - 70, cx - 2, top - 40), .8], ['@chim.1', rect(cx - 11, top - 70, cx + 11, top - 75)], ['@pot', rect(cx - 6, top - 75, cx - 1, top - 84)], ['@pot', rect(cx + 2, top - 75, cx + 7, top - 82)]);
        // windows: two above, one or two below, the door with a light over it
        const m = (x0 + x1) / 2;
        b.push(...sash(x0 + 16, top + 18, 20, 26, '@frame.0', '@glass', '@bar'), ...sash(x1 - 36, top + 18, 20, 26, '@frame.0', '@glass', '@bar'));
        if (two) b.push(...sash(x0 + 16, g - 58, 20, 30, '@frame.0', '@glass', '@bar'), ...sash(x1 - 36, g - 58, 20, 30, '@frame.0', '@glass', '@bar'));
        else b.push(...sash(s > 0 ? x0 + 16 : x1 - 36, g - 58, 20, 30, '@frame.0', '@glass', '@bar'));
        const dx = two ? m - 9 : (s > 0 ? x1 - 34 : x0 + 16);
        b.push(['@frame.0', rect(dx - 3, g, dx + 21, g - 46)], ['@door.' + (i % 3), rect(dx, g, dx + 18, g - 43)], { f: '@glass.1', d: rect(dx + 2, g - 43, dx + 16, g - 40), glow: 'lamp', detail: true });
        b.push(['@step', rect(dx - 4, g, dx + 22, g - 3)]);
        // the plinth down to the slope
        b.push(['@shade.0', rect(x0, 0, x1, g + 0.5), .7]);
      }
      return { body: b };
    },
  });

  /* ---------- landmark.palace-house-beaulieu ---------- */
  sceneObjDefine({
    id: 'landmark.palace-house-beaulieu',
    category: 'landmark',
    size: [420, 270],
    variants: 1,
    seasonal: false,
    flippable: false,
    palette: {
      base: {
        stone: ['#bdb6a4', '#8e8878', '#d6d0c0'], roof: ['#5c5450', '#423c38', '#766c66'], glass: ['#3a4652', '#a4b4c4'], dress: ['#e0dacb'],
        door: ['#3a2c24'], ivy: ['#3e5a34', '#56743e'], flood: ['#ffe2a8'],
      },
    },
    night: { glow: { window: '#f4c674', lamp: '#ffe2a0' }, on: 0.75 },
    parts: ['body', 'lit'],
    shadow: { rx: 200, ry: 14, h: 260 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/beaulieu', 'uk', 'new-forest', 'beaulieu', 'house', 'abbey', 'gatehouse', 'kit:temperate'],
    credit: 'area-newforest: Palace House, Beaulieu, from the public view across the mill pond (no signs or emblems)',
    build() {
      const b = [], lit = [];
      const win = (x, y, w, h, n) => { b.push(['@dress.0', rect(x - 3, y - 3, x + w + 3, y + h + 3)]); for (let i = 0; i < n; i++) { const ww = (w - (n - 1) * 3) / n, xx = x + i * (ww + 3); b.push({ f: '@glass.0', d: `M${f1(xx)} ${y + h}V${y + 5}q${f1(ww / 2)}-6 ${f1(ww)} 0V${y + h}z`, glow: 'window' }); } b.push({ s: '@dress.0', w: 1.2, d: `M${x} ${f1(y + h * .5)}H${x + w}`, detail: true }); };
      // the lower wings
      for (const [x0, x1] of [[-200, -112], [112, 200]]) {
        b.push(['@stone.0', rect(x0, 0, x1, -112)], { f: '@stone.1', d: rect(x0, 0, x1, -18), op: .4 });
        b.push(['@roof.0', poly([[x0 - 4, -110], [x0 + 8, -150], [x1 - 8, -150], [x1 + 4, -110]])], ['@roof.2', poly([[x0 - 4, -110], [x0 + 8, -150], [x0 + 18, -150], [x0 + 8, -110]]), .6]);
        const m = (x0 + x1) / 2;
        b.push(['@stone.2', poly([[m - 22, -118], [m, -160], [m + 22, -118]])], ['@roof.1', poly([[m - 26, -116], [m, -164], [m + 26, -116], [m + 20, -116], [m, -156], [m - 20, -116]])]);
        win(m - 14, -142, 28, 18, 2); win(m - 26, -86, 52, 34, 3); win(m - 26, -44, 52, 30, 3);
      }
      // the main gatehouse block: tall walls, the steep main gable, the arch
      b.push(['@stone.0', rect(-114, 0, 114, -162)], { f: '@stone.1', d: rect(40, 0, 114, -162), op: .3 }, { s: '@stone.1', w: .6, op: .4, detail: true, d: Array.from({ length: 14 }, (_, i) => `M-114 ${-8 - i * 11}H114`).join('') });
      b.push(['@roof.0', poly([[-120, -160], [-60, -238], [60, -238], [120, -160]])], ['@roof.2', poly([[-120, -160], [-60, -238], [-40, -238], [-96, -160]]), .55], { s: '@roof.1', w: .8, op: .5, detail: true, d: 'M-110-172H110M-100-186H100M-88-200H88M-78-214H78M-68-226H68' });
      b.push(['@stone.2', poly([[-46, -160], [0, -246], [46, -160]])], ['@stone.1', poly([[0, -246], [46, -160], [30, -160]]), .5], ['@roof.1', poly([[-52, -158], [0, -252], [52, -158], [44, -158], [0, -240], [-44, -158]])]);
      win(-20, -222, 40, 36, 2);
      // corner turrets with steep caps
      for (const x of [-114, 114]) b.push(['@stone.2', rect(x - 12, -150, x + 12, -206)], ['@stone.1', rect(x + 2, -150, x + 12, -206), .5], ['@roof.1', poly([[x - 15, -204], [x, -250], [x + 15, -204]])], ['@roof.2', poly([[x - 15, -204], [x, -250], [x - 4, -204]]), .7], { f: '@glass.0', d: rect(x - 3, -186, x + 3, -172) });
      // chimneys
      for (const x of [-72, 62]) b.push(['@stone.2', rect(x - 7, -214, x + 7, -258)], ['@stone.1', rect(x - 9, -258, x + 9, -263)]);
      // the great windows over the arch, then the gate arch
      win(-60, -140, 40, 44, 3); win(20, -140, 40, 44, 3); win(-60, -84, 40, 34, 2); win(20, -84, 40, 34, 2);
      b.push(['@dress.0', 'M-26 0V-40q26-34 52 0V0z'], ['@door.0', 'M-20 0V-38q20-28 40 0V0z'], { f: '@glass.1', d: rect(-3, -56, 3, -50), glow: 'lamp' });
      // ivy on the left wall
      b.push({ f: '@ivy.0', d: 'M-200 0V-60q8-20 18-10q6 14 2 30q-6 24-20 40z', op: .9 }, { f: '@ivy.1', d: 'M-196-10q4-30 10-44q8 10 2 30z', op: .8, detail: true });
      lit.push({ f: '@flood', op: .2, d: poly([[-130, 0], [-114, -170], [0, -250], [114, -170], [130, 0]]) });
      return { body: b, lit };
    },
  });

  /* ---------- landmark.st-thomas-lymington ---------- */
  sceneObjDefine({
    id: 'landmark.st-thomas-lymington',
    category: 'landmark',
    size: [300, 330],
    variants: 1,
    seasonal: false,
    flippable: false,
    palette: {
      base: {
        stone: ['#cfc4a8', '#a49a80', '#e6dcc4'], render: ['#e8e2d4', '#c8c0ae'], roof: ['#6a5a50', '#4c4038', '#86766a'], cup: ['#f2efe6', '#c8c4ba'],
        dome: ['#3e4a4e', '#56646a'], glass: ['#3a4652', '#a4b4c4'], vane: ['#c8a040'], door: ['#3a2c24'], flood: ['#ffe2a8'], grave: ['#aaa496', '#8a8478'],
      },
    },
    night: { glow: { window: '#f4c674', lamp: '#ffe2a0' }, on: 0.85 },
    parts: ['body', 'lit'],
    shadow: { rx: 140, ry: 12, h: 320 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/lymington', 'uk', 'new-forest', 'lymington', 'church', 'cupola', 'town', 'kit:temperate'],
    credit: 'area-newforest: St Thomas the Apostle, Lymington, its tower and cupola (drawn from public views)',
    build() {
      const b = [], lit = [];
      // the nave (rendered, round-arched Georgian windows) to the left
      b.push(['@render.0', rect(-150, 0, -40, -96)], { f: '@render.1', d: rect(-150, 0, -40, -12), op: .6 });
      b.push(['@roof.0', poly([[-156, -94], [-140, -140], [-40, -140], [-40, -94]])], ['@roof.2', poly([[-156, -94], [-140, -140], [-128, -140], [-142, -94]]), .6], { s: '@roof.1', w: .8, op: .5, d: 'M-152-106H-40M-148-118H-40M-144-130H-40', detail: true });
      for (const x of [-136, -104, -72]) b.push(['@stone.0', `M${x - 3} -24V-70q13-18 26 0V-24z`], { f: '@glass.0', d: `M${x} -26V-68q10-14 20 0V-26z`, glow: 'window' }, { s: '@stone.0', w: 1, d: `M${x + 10} -26V-74M${x} -46H${x + 20}`, detail: true });
      // the tower: three stages of stone, string courses, belfry louvres
      const x0 = -40, x1 = 40;
      b.push(['@stone.0', rect(x0, 0, x1, -224)], { f: '@stone.1', d: rect(14, 0, x1, -224), op: .5 });
      b.push({ s: '@stone.1', w: .6, op: .4, detail: true, d: Array.from({ length: 22 }, (_, i) => `M${x0} ${-8 - i * 10}H${x1}`).join('') });
      for (const y of [-80, -150, -220]) b.push(['@stone.2', rect(x0 - 4, y, x1 + 4, y - 6)]);
      // quoins up both corners (the lit corner pale), nave buttresses and sills
      for (let i = 0; i < 11; i++) { const y = -4 - i * 20, w = i % 2 ? 8 : 13; b.push({ f: '@stone.2', d: rect(x0, y, x0 + w, y - 9), detail: true }, { f: '@stone.1', d: rect(x1 - w, y, x1, y - 9), op: .8, detail: true }); }
      for (const x of [-150, -116, -84, -52]) b.push(['@render.1', rect(x, 0, x + 6, -40)], { f: '@stone.1', d: rect(x - 1, -40, x + 7, -44), detail: true });
      b.push(['@stone.2', 'M-14 0V-36q14-18 28 0V0z'], ['@door', 'M-10 0V-34q10-13 20 0V0z']);
      b.push(['@stone.2', 'M-12-96V-132q12-16 24 0V-96z'], { f: '@glass.0', d: 'M-9-98V-130q9-12 18 0V-98z', glow: 'window' });
      b.push(['@stone.2', 'M-16-160V-200q16-20 32 0V-160z'], ['@dome.0', 'M-12-162V-198q12-15 24 0V-162z'], { s: '@stone.1', w: 1.2, d: 'M-12-168h24M-12-174h24M-12-180h24M-12-186h24', detail: true });
      // the parapet with corner urns
      b.push(['@stone.2', rect(x0 - 4, -226, x1 + 4, -238)], ['@stone.1', rect(x0 - 4, -226, x1 + 4, -229)]);
      for (const x of [x0, x1]) b.push(['@stone.2', ell(x, -244, 5, 7)], ['@stone.2', rect(x - 2, -251, x + 2, -256)]);
      // the white cupola: an octagonal lantern with arched openings, the lead dome, ball and vane
      b.push(['@cup.1', rect(-26, -238, 26, -248)], ['@cup.0', rect(-22, -248, 22, -290)], { f: '@cup.1', d: rect(8, -248, 22, -290), op: .7 });
      for (const x of [-18, -4, 10]) b.push({ f: '@dome.0', d: `M${x} -254V-280q4-6 8 0V-254z` });
      b.push({ f: '@glass.1', d: 'M-3-256V-278q3-4 6 0V-256z', glow: 'lamp' });
      b.push(['@cup.0', rect(-26, -290, 26, -296)], ['@dome.0', 'M-24-296Q-22-326 0-332Q22-326 24-296z'], ['@dome.1', 'M-24-296Q-22-326 0-332Q-10-322-12-296z', .7]);
      b.push(['@cup.0', ell(0, -338, 4, 4)], { s: '@vane', w: 1.6, d: 'M0-342V-358M-8-352H8' });
      // the churchyard wall and stones
      stones(b, [[-140, 9], [-118, 8], [60, 10], [80, 8]]);
      b.push(['@stone.1', rect(-160, 0, 120, -6)], ['@stone.2', rect(-160, -6, 120, -9)]);
      lit.push({ f: '@flood', op: .22, d: poly([[-46, 0], [-40, -238], [-26, -300], [0, -334], [26, -300], [40, -238], [46, 0]]) });
      return { body: b, lit };
    },
  });

  /* ---------- boat.yacht: a moored cruising yacht ---------- */
  sceneObjDefine({
    id: 'boat.yacht', category: 'boat', size: [190, 320], variants: 3, seasonal: false, flippable: true,
    palette: { base: {
      hull: ['#f4f2ec', '#24324a', '#f0ece0'], hullD: ['#c8c6c0', '#16203a', '#c8c2b0'], stripe: ['#2a4a7a', '#e8e4d8', '#7a2a2a'], anti: ['#3a3a3a', '#8a2a22', '#2a3a5a'],
      deck: ['#d8d0bc'], cabin: ['#f2f0ea', '#d0ccc2'], glass: ['#2e3a46', '#9fb4c4'], mast: ['#c8ccd0', '#8a9098'], cover: ['#2a3a5c', '#7a2a2a', '#3a5a4a'], rope: '#8a8e94', lamp: '#fff2c0',
    } },
    night: { glow: { window: '#ffd68a', lamp: '#fff4c8' }, on: .6 },
    anim: { paddle: { dy: 1.2, deg: 1.4, period: 4.6 } },
    reflect: true,
    tags: ['uk', 'coast', 'harbour', 'estuary', 'marina', 'sailing', 'yacht', 'kit:boats', 'kit:water', 'role:boat'],
    credit: 'area-newforest: a generic moored yacht (no names or sail numbers)',
    build(v) {
      const body = [];
      // rigging behind: the forestay and backstay, then the mast
      body.push({ s: '@rope', w: .8, op: .8, d: 'M6 -312L88 -30M6 -312L-82 -26', detail: true }, { s: '@mast.1', w: 4, d: 'M6 -30V-314' }, { s: '@mast.0', w: 1.6, d: 'M5 -30V-314' });
      body.push({ s: '@mast.1', w: 1.2, d: 'M-6 -230H18M-2 -150H14', detail: true }, { f: '@lamp', d: rect(3, -318, 9, -313), glow: 'lamp' });
      // the boom with the sail furled under its cover
      body.push({ s: '@mast.1', w: 3, d: 'M6 -72H-70' }, ['@cover.' + v, 'M2 -70Q-30 -84 -66 -74L-68 -66Q-30 -70 4 -64z'], { s: '@rope', w: .7, op: .7, d: 'M-20 -74v6M-40 -76v6M-56 -74v6', detail: true });
      // the hull: sheer, the boot stripe, antifouling, a shade along the bottom
      body.push(['@hull.' + v, 'M-90 -34L84 -38Q98 -38 96 -30L80 2H-80Q-94 -14 -90 -34z'], { f: '@hullD.' + v, d: 'M-86 -12L90 -16L80 2H-80z', op: .55 }, ['@stripe.' + v, 'M-88 -26L92 -30L90 -25L-87 -21z'], ['@anti.' + v, 'M-80 -2H82L80 2H-80z']);
      body.push(['@deck.0', 'M-90 -34L84 -38L84 -41L-90 -37z']);
      // the cabin top with windows (lit at dusk), the sprayhood and the pulpit rails
      body.push(['@cabin.0', 'M-46 -40L-36 -58H34L42 -40z'], { f: '@cabin.1', d: 'M20 -58H34L42 -40H28z', op: .7 }, { f: '@glass.0', d: rect(-30, -52, -16, -46), glow: 'window' }, { f: '@glass.0', d: rect(-10, -52, 4, -46), glow: 'window' }, { f: '@glass.0', d: rect(10, -52, 22, -46), glow: 'window' });
      body.push(['@cover.' + v, 'M-58 -40Q-56 -60 -42 -62L-40 -40z'], { s: '@mast.0', w: 1.2, d: 'M70 -38V-52L92 -38M-86 -36V-50H-62V-38', detail: true });
      body.push({ s: '@rope', w: 1, d: 'M94 -32q10 14 6 34', detail: true });
      return { body };
    },
  });

  /* ---------- tree.ancient-oak: a veteran pollard oak of the Forest's ancient woods (the Knightwood Oak kind) ---------- */
  sceneObjDefine({
    id: 'tree.ancient-oak', category: 'tree', size: [620, 520], variants: 2, seasonal: true, shapeBySeason: true, flippable: true,
    palette: {
      base: { bark: ['#5a4a3a', '#3e3228', '#7a6a56'], moss: ['#6a7a3e'], leaf: ['#2f5a2a', '#47732f', '#6f9a42', '#94b858'] },
      spring: { leaf: ['#4a7a30', '#6a9a3a', '#94bc4a', '#c0da6a'] },
      summer: { leaf: ['#2a5226', '#406c2e', '#62903e', '#86ae50'] },
      autumn: { leaf: ['#6e4a1e', '#9a6426', '#c08a34', '#dcb04a'] },
      winter: { leaf: ['#6a5a40', '#7e6c4e', '#94825e', '#a89874'] },
    },
    parts: ['trunk', 'crown'],
    anim: { sway: { part: 'crown', pivot: [0, -220], deg: 1.4 } },
    shadow: { rx: 260, ry: 22, h: 500 },
    reflect: true,
    tags: ['uk', 'new-forest', 'woodland', 'deciduous', 'oak', 'veteran', 'ancient', 'pollard', 'signature', 'kit:temperate', 'role:tree'],
    credit: 'area-newforest: an ancient pollard oak of the New Forest woods',
    build(v, rnd, ctx) {
      const r = sceneRnd(7100 + v * 37), season = (ctx && ctx.season) || 'summer', bare = season === 'winter';
      const trunk = [], crown = [];
      // the short massive bole with burrs and fluting, flaring at the foot; the pollard head where the limbs spring
      trunk.push(['@bark.0', 'M-90 0C-70-30-62-90-68-150C-72-190-58-214-30-222H34C62-214 74-190 70-150C64-90 72-30 96 0z']);
      trunk.push({ f: '@bark.1', d: 'M20 0C34-50 40-120 34-200L56-200C70-160 62-80 96 0z', op: .7 }, { f: '@bark.2', d: 'M-80-4C-62-40-56-100-60-160L-44-170C-46-110-48-50-60-4z', op: .6 });
      trunk.push({ s: '@bark.1', w: 2.4, op: .55, d: 'M-30-10C-26-70-34-130-24-200M6-6C10-80 2-150 10-210M-56-30C-48-70-50-110-44-150', detail: true });
      for (let i = 0; i < 6; i++) { const x = -50 + r() * 100, y = -40 - r() * 150; trunk.push({ f: '@bark.' + (i % 2 ? 1 : 2), d: `M${f1(x - 10)} ${f1(y)}a10 8 0 1 0 20 0a10 8 0 1 0 -20 0z`, op: .8, detail: true }); }
      trunk.push({ f: '@moss.0', d: 'M-86-2C-74-20-70-50-72-80L-62-80C-62-50-64-20-70-2z', op: .7 });
      // the great limbs: low, spreading, twisting out from the pollard head
      const limbs = [[-30, -210, -250, -330, 22], [-10, -220, -120, -420, 18], [20, -220, 140, -440, 18], [30, -210, 270, -320, 22], [0, -222, 20, -470, 14]];
      for (const [x0, y0, x1, y1, w] of limbs) {
        const mx = (x0 + x1) / 2 + (r() - .5) * 60, my = (y0 + y1) / 2 - 30;
        trunk.push({ s: '@bark.0', w, cap: 'round', d: `M${x0} ${y0}Q${f1(mx)} ${f1(my)} ${x1} ${y1}` });
        trunk.push({ s: '@bark.2', w: w * .3, cap: 'round', op: .5, d: `M${x0 - w * .3} ${y0}Q${f1(mx - w * .3)} ${f1(my)} ${x1 - w * .2} ${y1}`, detail: true });
        // twigs
        for (let k = 0; k < (bare ? 5 : 2); k++) { const a = r() * Math.PI - Math.PI, l = 40 + r() * 70; trunk.push({ s: '@bark.1', w: Math.max(2, w * .25), cap: 'round', d: `M${x1} ${y1}l${f1(Math.cos(a) * l)} ${f1(Math.sin(a) * l * .7)}`, detail: !bare }); }
      }
      // the crown: big lobed masses, darker below, lit on the left; in winter a few dead leaves only
      const lobes = [];
      for (let i = 0; i < 15; i++) { const t = -1 + 2 * i / 14 + (r() - .5) * .08, x = t * 270 + (r() - .5) * 30, y = -290 - (1 - t * t) * 160 + (r() - .5) * 50 - (i % 2) * 30; lobes.push([Math.round(x), Math.round(y), 58 + Math.round(r() * 40), 44 + Math.round(r() * 28)]); }
      for (let i = 0; i < 4; i++) lobes.push([Math.round(-150 + i * 100 + (r() - .5) * 40), Math.round(-360 - r() * 60), 80, 56]);
      if (!bare) {
        for (const [x, y, rx, ry] of lobes) crown.push(['@leaf.0', `M${x - rx} ${y + 10}a${rx} ${ry} 0 1 1 ${2 * rx} 0q-${rx * .5} ${ry * .5}-${rx} ${ry * .4}t-${rx} -${ry * .4}z`]);
        for (const [x, y, rx, ry] of lobes) crown.push(['@leaf.1', `M${x - rx * .85} ${y}a${rx * .85} ${ry * .75} 0 1 1 ${1.7 * rx} 0q-${rx * .4} ${ry * .3}-${rx * .85} ${ry * .25}t-${rx * .85} -${ry * .25}z`]);
        for (const [x, y, rx, ry] of lobes) crown.push(['@leaf.2', `M${x - rx * .7} ${y - ry * .2}a${rx * .55} ${ry * .5} 0 1 1 ${1.1 * rx} 0q-${rx * .3} ${ry * .2}-${rx * .55} ${ry * .15}t-${rx * .55} -${ry * .15}z`, .9]);
        for (let i = 0; i < 22; i++) { const [x, y, rx, ry] = lobes[(i * 7) % lobes.length], px = x - rx * .7 + r() * rx * .9, py = y - ry * .6 + r() * ry * .5; crown.push({ f: '@leaf.3', d: `M${f1(px - 14)} ${f1(py)}a14 9 0 1 1 28 0z`, op: .8, detail: true }); }
      } else {
        for (let i = 0; i < 14; i++) { const [x, y, rx, ry] = lobes[i % lobes.length], px = x - rx * .6 + r() * rx * 1.2, py = y - ry * .4 + r() * ry * .7; crown.push({ f: '@leaf.' + (i % 4), d: `M${f1(px - 6)} ${f1(py)}a6 4 0 1 1 12 0z`, op: .7 }); }
      }
      // ivy and a hollow at the foot
      trunk.push({ f: '#1e1814', d: 'M-14 0C-12-24-4-40 4-40C12-40 16-20 18 0z', op: .85 }, { f: '@moss.0', d: 'M40-20C46-60 44-120 50-160L58-158C54-110 56-60 50-20z', op: .5, detail: true });
      return { trunk, crown };
    },
  });
})();
