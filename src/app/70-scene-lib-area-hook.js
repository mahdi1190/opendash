/* ============================================================
   SCENE LIBRARY + ARCHETYPE: the Hook area, Hampshire
   (docs/dev/SCENE_ENGINE.md sections 2 and 8). PURE: sceneObjDefine and
   sceneArchetypeDefine calls inside IIFEs and nothing else; every build
   runs lazily (objects once per variant and season, scenes once when shown).

   The area: Hook village (the London Road high street and its Georgian
   coaching inn), Hook station on the South Western main line, the
   Basingstoke Canal at North Warnborough and Greywell (Odiham Castle, the
   Greywell Tunnel and its bat roost, an SSSI), the River Whitewater (a chalk
   stream through Greywell and North Warnborough), and the farmland and woods
   round Hook (Hook Common, Butter Wood).
     https://www.basingstoke-canal.org.uk/
     https://www.hants.gov.uk/thingstodo/basingstokecanal
     https://www.hart.gov.uk/

   Objects (this area's own):
     landmark.greywell-tunnel-portal   the brick east portal of the Greywell Tunnel: the canal runs into a dark arch
                                       in a wooded cutting, ivy over the face; bats leave the mouth at dusk (lit part)
     landmark.odiham-castle            the octagonal flint keep of Odiham (King John's) Castle, a roofless ruin by the canal
     landmark.hook-coaching-inn        a Georgian red-brick coaching inn on the London Road (no sign, no lettering)
     landmark.hook-station             a small brick station building with a platform canopy
   Archetype (the scenes are data rows in 71-scene-uk-hook-*.js):
     hook-country  form: tunnel (the canal to the portal) | canal (side-on canal) | river (a chalk stream) |
                   fields (farmland and a wood edge, the main line on its embankment) | station | street
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const R = v => Math.round(v * 10) / 10;
  const P = (x, y) => R(x) + ' ' + R(y);
  /** A bat silhouette (wings spread) at x, y, span w. */
  const bat = (x, y, w, up) => { const h = w * 0.32, u = up ? -1 : 1; return `M${P(x, y)}q${R(-w * 0.18)} ${R(-h * u)} ${R(-w * 0.5)} ${R(-h * 0.4 * u)}q${R(w * 0.12)} ${R(h * 0.5)} ${R(w * 0.06)} ${R(h * 0.9)}q${R(w * 0.2)} ${R(-h * 0.35)} ${R(w * 0.44)} ${R(-h * 0.1)}q${R(w * 0.24)} ${R(-h * 0.25)} ${R(w * 0.44)} ${R(h * 0.1)}q${R(-w * 0.06)} ${R(-h * 0.4)} ${R(w * 0.06)} ${R(-h * 0.9)}q${R(-w * 0.32)} ${R(-h * 0.6 * u + h * 0.4 * u)} ${R(-w * 0.5)} ${R(h * 0.4 * u)}z`; };

  /* ---------- the Greywell Tunnel, east portal ---------- */
  sceneObjDefine({
    id: 'landmark.greywell-tunnel-portal',
    category: 'landmark',
    size: [760, 330],
    variants: 1,
    seasonal: true,
    flippable: false,
    palette: {
      base: { brick: ['#8e4a34', '#6c3626', '#a85c42'], cope: ['#a8a294', '#868074'], dark: ['#0e1210', '#1c2420', '#2a3430'], bank: ['#4e6a34', '#3c5428', '#5e7a3e'], ivy: ['#2e4a26', '#3e5e2e', '#4e6e36'], soil: ['#5a4a34'], moss: ['#6a7a3a'], bat: ['#1a1614'], dusk: ['#ffcf8a'] },
      spring: { bank: ['#5a7a38', '#46622c', '#6c8a40'], ivy: ['#34522a', '#46663a', '#5e7e3e'] },
      autumn: { bank: ['#7a7038', '#5e562c', '#8e7e40'], ivy: ['#3a4e2a', '#7a4a26', '#9a6a2e'] },
      winter: { bank: ['#6a7060', '#56594c', '#7c8070'], ivy: ['#2e4226', '#3a5030', '#4a5c3c'], moss: ['#7a8060'] },
    },
    night: { glow: { lamp: '#ffd890' }, on: 1 },
    parts: ['body', 'lit'],
    shadow: { rx: 260, ry: 10, h: 80 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/greywell-tunnel', 'uk', 'hook', 'greywell', 'canal', 'tunnel', 'bats', 'brick', 'kit:temperate'],
    credit: 'drawn for the Hook area pack: the east portal of the Greywell Tunnel on the Basingstoke Canal',
    build(v, rnd) {
      const b = [], lit = [];
      const span = 62, spring = -58, crown = -150, ry = spring - crown;
      // the cutting: earth banks rising either side and over the portal, a soil scar under the coping
      b.push({ f: { lin: [[0, '@bank.2'], [1, '@bank.1']], x1: 0, y1: -330, x2: 0, y2: 0 }, d: 'M-380 0L-380-120Q-300-200-220-250Q-120-312 0-318Q130-314 230-252Q310-200 380-120L380 0z' });
      b.push({ f: '@bank.1', d: 'M-380 0L-380-120Q-330-150-290-140L-250 0z', op: 0.7 }, { f: '@bank.0', d: 'M380 0L380-120Q330-152 290-142L252 0z', op: 0.6 });
      for (let i = 0; i < 26; i++) { const x = -360 + i * 28.8, y = -110 - Math.sin((i / 25) * Math.PI) * 190 + (i % 3) * 6; b.push({ f: i % 2 ? '@bank.0' : '@bank.2', d: `M${P(x - 8, y + 14)}l4-16l4 12l5-18l3 20z`, op: 0.8 }); }
      // the brick face, battered slightly, wing walls sloping down to the water
      b.push({ f: '@brick.0', d: 'M-210 0L-200-60L-150-196H150L200-60L210 0z' });
      b.push({ f: '@brick.1', d: 'M120-196H150L200-60L210 0H170z', op: 0.55 });
      for (let y = -190; y < -4; y += 8) { const w = R(Math.min(205, 150 + Math.max(0, y + 196) * 0.36)); b.push({ s: '@brick.1', w: 0.7, op: 0.4, detail: true, d: `M${-w} ${y}H${w}` }); }
      for (let i = 0; i < 18; i++) { const y = -186 + (i % 9) * 20, x = (i < 9 ? -1 : 1) * (128 - (i % 3) * 30); b.push({ s: '@brick.1', w: 0.7, op: 0.35, detail: true, d: `M${x} ${y}v8M${x + 14} ${y + 8}v8` }); }
      // the arch: the dark mouth, a faint inner ring, the water running in
      const arc = (r, k) => Array.from({ length: 21 }, (_, i) => { const a = Math.PI - Math.PI * i / 20; return [Math.cos(a) * r, spring - Math.sin(a) * ry * k]; });
      const mouth = arc(span, 1);
      b.push({ f: '@dark.0', d: `M${-span} 0V${spring}` + mouth.map(q => 'L' + P(q[0], q[1])).join('') + `V0z` });
      const inner = arc(span * 0.7, 0.8);
      b.push({ f: '@dark.1', d: `M${-span * 0.7} 0V${spring + 8}` + inner.map(q => 'L' + P(q[0], q[1] + 8)).join('') + `V0z`, op: 0.6 });
      b.push({ f: '@dark.0', d: `M${-span * 0.42} 0V${spring + 20}` + arc(span * 0.42, 0.62).map(q => 'L' + P(q[0], q[1] + 20)).join('') + `V0z` });
      b.push({ f: '@dark.2', d: `M${-span} -6H${span}V0H${-span}z`, op: 0.6 });
      // the voussoir ring (alternating headers) and a keystone
      for (let i = 0; i < 22; i++) {
        const a0 = Math.PI - Math.PI * i / 22, a1 = Math.PI - Math.PI * (i + 1) / 22, r0 = span, r1 = span + 20;
        const q = (a, r) => [Math.cos(a) * r, spring - Math.sin(a) * ry * (r / span)];
        b.push({ f: i % 2 ? '@brick.2' : '@brick.1', d: sceneD.poly([q(a0, r0), q(a0, r1), q(a1, r1), q(a1, r0)]) });
      }
      b.push({ f: '@cope.0', d: `M-9 ${crown - 26}H9L7 ${crown + 2}H-7z` });
      // the string course and the coping over the face; pilasters at the ends
      b.push({ f: '@cope.1', d: sceneD.rect(-156, -200, 312, 8) }, { f: '@cope.0', d: sceneD.rect(-160, -208, 320, 9) });
      for (let i = 0; i < 12; i++) b.push({ f: i % 2 ? '@cope.0' : '@cope.1', d: sceneD.rect(-160 + i * 26.7, -210, 26, 3), op: 0.7 });
      for (const x of [-150, 126]) b.push({ f: '@brick.2', d: sceneD.rect(x, -196, 24, 196), op: 0.9 }, { f: '@brick.1', d: sceneD.rect(x + 18, -196, 6, 196), op: 0.5 });
      // moss and damp streaks down the face
      for (let i = 0; i < 10; i++) { const x = -130 + i * 28 + (i % 2) * 6; if (Math.abs(x) < span + 26) continue; b.push({ f: '@moss.0', d: `M${x} -192q-3 ${40 + (i % 3) * 20} 2 ${70 + (i % 4) * 22}q4-30 2-70z`, op: 0.35 }); }
      // ivy curtains falling from the coping and climbing the wings
      for (let i = 0; i < 46; i++) {
        const side = i % 2 ? 1 : -1, k = Math.floor(i / 2), x = side * (60 + (k * 37) % 150), y = -200 + (k % 5) * 18 + Math.floor(k / 5) * 9;
        if (Math.abs(x) < span + 24 && y > crown - 40) continue;
        b.push({ f: ['@ivy.0', '@ivy.1', '@ivy.2'][i % 3], d: sceneD.ell(x, y, 13 + (i % 4) * 3, 9 + (i % 3) * 2), op: 0.92 });
      }
      for (let i = 0; i < 14; i++) { const x = -200 + i * 30, y = -50 - (i % 4) * 12; if (Math.abs(x) < span + 30) continue; b.push({ f: ['@ivy.0', '@ivy.1', '@ivy.2'][(i + 1) % 3], d: sceneD.ell(x, y, 14, 10), op: 0.9 }); }
      // ferns at the waterline, either side of the mouth
      for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) b.push({ s: '@bank.2', w: 2, d: `M${sx * (span + 26 + i * 18)} -2q${sx * (6 + i)} -18 ${sx * (16 + i * 2)} -24`, op: 0.85 });
      // dusk: bats leaving the tunnel mouth (Natterer's and Daubenton's), drawn only at real dusk; a faint warm sky in the arch
      const bats = [[-20, -120, 16], [24, -138, 14], [-52, -170, 13], [70, -190, 12], [-110, -222, 11], [130, -236, 12], [10, -250, 10], [-170, -268, 10], [190, -282, 9], [60, -300, 9], [-40, -312, 8], [160, -330, 8]];
      bats.forEach(([x, y, w], i) => lit.push({ f: '@bat', d: bat(x, y, w, i % 2 === 0) }));
      lit.push({ f: { rad: [[0, '@dusk', 0.18], [1, '@dusk', 0]], cx: 0, cy: -100, r: 140 }, d: sceneD.circ(0, -100, 140) });
      return { body: b, lit };
    },
  });

  /* ---------- Odiham Castle: the octagonal flint keep ---------- */
  sceneObjDefine({
    id: 'landmark.odiham-castle',
    category: 'landmark',
    size: [420, 300],
    variants: 1,
    seasonal: true,
    flippable: false,
    palette: {
      base: { flint: ['#8e8a80', '#6e6a62', '#a8a49a'], dress: ['#c8bea6', '#a89c84'], dark: ['#2a2826', '#3e3a36'], ivy: ['#34522a', '#46663a'], mound: ['#5e7e3c', '#4a6830'], dot: ['#4e4a44', '#bab6ac'], bat: ['#1a1614'], wash: ['#c8d0e0'] },
      spring: { mound: ['#6a8a40', '#527234'] }, autumn: { mound: ['#8a8040', '#6e6632'], ivy: ['#6a4a26', '#8a6a2e'] }, winter: { mound: ['#7a8070', '#62685a'], ivy: ['#34462c', '#46583a'] },
    },
    night: { glow: { lamp: '#ffd890' }, on: 1 },
    parts: ['body', 'lit'],
    shadow: { rx: 180, ry: 10, h: 200 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/odiham-castle', 'uk', 'hook', 'north warnborough', 'castle', 'ruin', 'flint', 'canal', 'kit:temperate'],
    credit: "drawn for the Hook area pack: the ruined keep of Odiham (King John's) Castle by the Basingstoke Canal",
    build(v, rnd) {
      const b = [], lit = [];
      // the grassy motte and its foot
      b.push({ f: { lin: [[0, '@mound.0'], [1, '@mound.1']], x1: 0, y1: -60, x2: 0, y2: 0 }, d: 'M-210 0Q-170-46-110-58H110Q170-46 210 0z' });
      for (let i = 0; i < 16; i++) b.push({ f: i % 2 ? '@mound.0' : '@mound.1', d: `M${-180 + i * 24} ${-14 - Math.sin(i / 15 * Math.PI) * 36}l3-10l3 8l4-12l2 14z`, op: 0.8 });
      // three visible faces of the octagon, each with a ragged broken top
      const top = (x0, x1, y, seed) => { let d = ''; const n = 8; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, dy = ((i * 37 + seed) % 5) * 7 - (i === 0 || i === n ? 6 : 0); d += `L${R(x)} ${R(y + dy)}`; } return d; };
      const faces = [[-150, -80, -228, '@flint.1', 3], [-80, 80, -262, '@flint.0', 11], [80, 150, -236, '@flint.1', 5]];
      for (const [x0, x1, y, f, s] of faces) {
        b.push({ f, d: `M${x0} -54` + top(x0, x1, y, s) + `L${x1} -54z` });
      }
      b.push({ f: '@flint.2', d: 'M-80-54V-250L-74-256V-54z', op: 0.6 }, { f: '@dark.1', d: 'M80-54V-240L86-236V-54z', op: 0.4 });
      // flint texture: knapped nodules as small dots, and the dressed stone quoins at the angles
      for (let i = 0; i < 90; i++) { const x = -146 + ((i * 53) % 292), y = -60 - ((i * 29) % 170); b.push({ f: i % 3 ? '@dot.0' : '@dot.1', d: sceneD.ell(x, y, 2.4 + (i % 3), 1.6 + (i % 2)), op: 0.45, detail: true }); }
      for (const x of [-84, 76]) for (let k = 0; k < 9; k++) b.push({ f: k % 2 ? '@dress.0' : '@dress.1', d: sceneD.rect(x, -70 - k * 20, k % 2 ? 12 : 8, 12) });
      // window and door openings: tall round-headed lights, a gaping lower breach
      const opening = (x, y, w, h) => ({ f: '@dark.0', d: `M${x} ${y + h}V${y + w / 2}Q${x + w / 2} ${y - w / 3} ${x + w} ${y + w / 2}V${y + h}z` });
      b.push(opening(-30, -210, 22, 54), opening(14, -210, 22, 54), opening(-12, -128, 26, 48), opening(-128, -180, 14, 40), opening(108, -176, 14, 40));
      for (const [x, y, w] of [[-30, -210, 22], [14, -210, 22], [-12, -128, 26]]) b.push({ s: '@dress.0', w: 2, d: `M${x - 2} ${y + w / 2}Q${x + w / 2} ${y - w / 2} ${x + w + 2} ${y + w / 2}` });
      b.push({ f: '@dark.1', d: 'M-40-54L-34-92Q-10-110 14-94L22-54z' });
      // putlog holes in rows
      for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) b.push({ f: '@dark.0', d: sceneD.rect(-70 + i * 26, -84 - r * 60, 4, 4), op: 0.7 });
      // ivy on the left face and creeping over the top of the right
      for (let i = 0; i < 18; i++) b.push({ f: i % 2 ? '@ivy.0' : '@ivy.1', d: sceneD.ell(-140 + (i % 6) * 10, -70 - Math.floor(i / 6) * 30 - (i % 3) * 8, 12, 9), op: 0.9 });
      for (let i = 0; i < 8; i++) b.push({ f: i % 2 ? '@ivy.1' : '@ivy.0', d: sceneD.ell(96 + i * 7, -224 + (i % 3) * 8 + i * 4, 10, 7), op: 0.9 });
      // grass tufts at the foot of the walls
      for (let i = 0; i < 12; i++) b.push({ s: '@mound.0', w: 1.6, d: `M${-140 + i * 25} -54l${2 + (i % 3)} -10M${-136 + i * 25} -54l-2 -8` });
      // dusk: pipistrelles round the ruin, and a pale moonlit wash on the flint
      [[-180, -250, 10], [170, -270, 9], [-40, -300, 8], [120, -296, 8], [-120, -290, 9], [40, -282, 10]].forEach(([x, y, w], i) => lit.push({ f: '@bat', d: bat(x, y, w, i % 2 === 1) }));
      lit.push({ f: '@wash', d: 'M-80-54V-250H80V-54z', op: 0.08 });
      return { body: b, lit };
    },
  });

  /* ---------- a Georgian coaching inn on the London Road, Hook (no sign, no lettering) ---------- */
  sceneObjDefine({
    id: 'landmark.hook-coaching-inn',
    category: 'landmark',
    size: [600, 290],
    variants: 1,
    seasonal: false,
    flippable: false,
    palette: { base: { brick: ['#a4503a', '#84402e', '#bc6a50'], roof: ['#7a4a38', '#5e3a2c', '#946050'], dress: ['#ece6d6', '#cfc6b2'], glass: ['#38424e', '#90a2b4'], door: ['#2e3a34'], chim: ['#8a4434'], flood: ['#ffe2a8'], bench: ['#6a5a48'], basket: ['#5a7a3a', '#c0405a'] } },
    night: { glow: { window: '#f8cf80', lamp: '#ffe2a0' }, on: 0.9 },
    parts: ['body', 'lit'],
    shadow: { rx: 290, ry: 12, h: 220 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/hook-high-street', 'uk', 'hook', 'high street', 'inn', 'georgian', 'brick', 'kit:temperate'],
    credit: 'drawn for the Hook area pack: a Georgian red-brick coaching inn on the London Road, Hook',
    build() {
      const b = [], lit = [];
      // the lower wing (left) and the main block
      b.push({ f: '@brick.1', d: sceneD.rect(-290, -120, 110, 120) }, { f: '@roof.1', d: 'M-296-118L-270-170H-186L-176-118z' });
      b.push({ f: '@brick.0', d: sceneD.rect(-180, -200, 440, 200) });
      for (let y = -194; y < 0; y += 7) b.push({ s: '@brick.1', w: 0.6, op: 0.3, detail: true, d: `M-180 ${y}H260` });
      // the hipped tile roof, its courses, two tall chimney stacks
      b.push({ f: '@roof.0', d: 'M-190-198L-140-272H210L270-198z' }, { f: '@roof.1', d: 'M170-272H210L270-198H226z', op: 0.6 });
      for (let i = 1; i < 8; i++) b.push({ s: '@roof.1', w: 0.8, op: 0.4, detail: true, d: `M${R(-190 + i * 6.2)} ${-198 - i * 9.2}H${R(270 - i * 7.5)}` });
      for (const x of [-120, 180]) b.push({ f: '@chim', d: sceneD.rect(x, -300, 26, 40) }, { f: '@dress.1', d: sceneD.rect(x - 3, -304, 32, 6) }, { f: '@roof.1', d: sceneD.rect(x + 4, -312, 7, 9) }, { f: '@roof.1', d: sceneD.rect(x + 15, -312, 7, 9) });
      // a dentil cornice and the plat band between the storeys
      b.push({ f: '@dress.0', d: sceneD.rect(-186, -206, 452, 8) });
      for (let i = 0; i < 38; i++) b.push({ f: '@dress.1', d: sceneD.rect(-182 + i * 12, -198, 6, 4) });
      b.push({ f: '@dress.1', d: sceneD.rect(-180, -104, 440, 4), op: 0.8 });
      // sash windows: three storeys of bays, white frames and glazing bars (they light at dusk)
      const sash = (x, y, w, h) => {
        b.push({ f: '@dress.0', d: sceneD.rect(x - 3, y - 3, w + 6, h + 6) }, { f: '@glass.0', d: sceneD.rect(x, y, w, h), glow: 'window' });
        b.push({ s: '@dress.0', w: 1.4, d: `M${x} ${y + h / 2}H${x + w}M${x + w / 3} ${y}V${y + h}M${x + 2 * w / 3} ${y}V${y + h}` });
        b.push({ f: '@brick.2', d: sceneD.rect(x - 4, y - 8, w + 8, 5) }, { f: '@dress.1', d: sceneD.rect(x - 4, y + h + 3, w + 8, 3) });
      };
      for (let i = 0; i < 7; i++) { const x = -160 + i * 60; sash(x, -186, 26, 34); sash(x, -150, 26, 40); if (i !== 3) sash(x, -82, 28, 50); }
      // the central doorway: columns, a pediment, a panelled door, a carriage lamp each side
      b.push({ f: '@dress.0', d: sceneD.rect(10, -96, 64, 96) }, { f: '@door', d: sceneD.rect(26, -80, 32, 80) }, { f: '@glass.1', d: 'M26-80Q42-96 58-80z', glow: 'window' });
      b.push({ f: '@dress.1', d: sceneD.rect(14, -90, 6, 90) }, { f: '@dress.1', d: sceneD.rect(64, -90, 6, 90) }, { f: '@dress.0', d: 'M2-94L42-116L82-94z' });
      for (const x of [0, 84]) b.push({ f: '@door', d: sceneD.rect(x - 4, -76, 8, 12) }, { f: '@dress.0', d: sceneD.rect(x - 3, -74, 6, 8), glow: 'lamp' });
      // the wing: a carriage arch (dark), small windows, the hanging baskets
      b.push({ f: '@door', d: 'M-270 0V-60Q-235-90-200-60V0z' }, { f: '@dress.0', d: 'M-272-60Q-235-94-198-60', op: 0.9 });
      for (const x of [-276, -216]) sash(x + 4, -110, 18, 22);
      for (const x of [-120, 200]) b.push({ f: '@basket.0', d: sceneD.ell(x, -98, 12, 8) }, { f: '@basket.1', d: sceneD.ell(x - 4, -100, 3, 3) }, { f: '@basket.1', d: sceneD.ell(x + 5, -97, 3, 3) });
      // a bench on the forecourt
      b.push({ f: '@bench', d: sceneD.rect(110, -22, 60, 5) }, { f: '@bench', d: sceneD.rect(112, -18, 4, 18) }, { f: '@bench', d: sceneD.rect(164, -18, 4, 18) }, { f: '@bench', d: sceneD.rect(110, -36, 60, 4) });
      // dusk: the warm spill from the doorway and the ground-floor windows
      lit.push({ f: { rad: [[0, '@flood', 0.4], [1, '@flood', 0]], cx: 42, cy: -10, r: 130 }, d: sceneD.ell(42, -10, 130, 40) });
      for (const x of [-160, -40, 140, 200]) lit.push({ f: { rad: [[0, '@flood', 0.22], [1, '@flood', 0]], cx: x + 14, cy: -4, r: 60 }, d: sceneD.ell(x + 14, -4, 60, 18) });
      return { body: b, lit };
    },
  });

  /* ---------- Hook station: a small brick station building and a platform canopy ---------- */
  sceneObjDefine({
    id: 'landmark.hook-station',
    category: 'landmark',
    size: [520, 170],
    variants: 1,
    seasonal: false,
    flippable: false,
    palette: { base: { brick: ['#9a5440', '#7a4030', '#b46a52'], roof: ['#4a4e54', '#363a40', '#5e646a'], steel: ['#2e5a4a', '#244638', '#e8e2d2'], glass: ['#38424e', '#90a2b4'], door: ['#2a3036'], trim: ['#e8e2d2'], flood: ['#ffe8b0'] } },
    night: { glow: { window: '#f6d48a', lamp: '#fff0c0' }, on: 0.95 },
    parts: ['body', 'lit'],
    shadow: { rx: 250, ry: 8, h: 120 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/hook-station', 'uk', 'hook', 'station', 'railway', 'brick', 'kit:temperate'],
    credit: 'drawn for the Hook area pack: a small station building with a platform canopy on the South Western main line',
    build() {
      const b = [], lit = [];
      // the building: brick walls, a pitched slate roof, a gable to the right
      b.push({ f: '@brick.0', d: sceneD.rect(-80, -96, 240, 96) });
      for (let y = -90; y < 0; y += 6) b.push({ s: '@brick.1', w: 0.6, op: 0.3, detail: true, d: `M-80 ${y}H160` });
      b.push({ f: '@roof.0', d: 'M-90-94L-60-140H150L172-94z' }, { f: '@roof.1', d: 'M120-140H150L172-94H150z', op: 0.6 });
      for (let i = 1; i < 6; i++) b.push({ s: '@roof.1', w: 0.7, op: 0.4, detail: true, d: `M${-90 + i * 5} ${-94 - i * 7.6}H${172 - i * 3.6}` });
      b.push({ f: '@brick.2', d: sceneD.rect(40, -160, 20, 30) }, { f: '@roof.1', d: sceneD.rect(37, -164, 26, 5) });
      b.push({ f: '@brick.1', d: sceneD.rect(-80, -14, 240, 14), op: 0.6 });
      // tall windows and a pair of doors, all with brick arches (they light at dusk)
      const win = (x, w, h) => { b.push({ f: '@brick.2', d: `M${x - 4} ${-20 - h}Q${x + w / 2} ${-34 - h} ${x + w + 4} ${-20 - h}V${-16 - h}H${x - 4}z` }, { f: '@glass.0', d: sceneD.rect(x, -18 - h, w, h), glow: 'window' }, { s: '@trim.0', w: 1.2, d: `M${x} ${-18 - h / 2}H${x + w}M${x + w / 2} ${-18 - h}V-18` }, { f: '@trim.0', d: sceneD.rect(x - 3, -18, w + 6, 3) }); };
      for (const x of [-64, -24, 96, 130]) win(x, 22, 40);
      b.push({ f: '@door', d: sceneD.rect(16, -66, 28, 66) }, { f: '@door', d: sceneD.rect(52, -66, 28, 66) }, { f: '@glass.1', d: sceneD.rect(20, -60, 20, 22), glow: 'window' }, { f: '@glass.1', d: sceneD.rect(56, -60, 20, 22), glow: 'window' });
      // the platform canopy to the left: green steel columns, a ridged roof, a valance
      b.push({ f: '@roof.2', d: 'M-260-112H-80V-100H-260z' }, { f: '@roof.0', d: 'M-262-120H-80V-110H-262z' });
      for (let i = 0; i < 18; i++) b.push({ f: '@steel.2', d: `M${-260 + i * 10} -100l5 7l5-7z` });
      for (const x of [-244, -184, -124]) b.push({ f: '@steel.0', d: sceneD.rect(x, -100, 6, 100) }, { f: '@steel.1', d: `M${x - 14} -100Q${x + 3} -86 ${x + 20} -100z` });
      // lamps under the canopy and on the platform
      for (const x of [-214, -154]) b.push({ f: '@steel.1', d: sceneD.rect(x - 1, -100, 2, 10) }, { f: '@trim.0', d: sceneD.ell(x, -86, 6, 4), glow: 'lamp' });
      b.push({ f: '@steel.1', d: sceneD.rect(196, -110, 4, 110) }, { f: '@steel.1', d: sceneD.rect(190, -116, 16, 8) }, { f: '@trim.0', d: sceneD.rect(192, -114, 12, 5), glow: 'lamp' });
      // a cycle rack and planters by the entrance
      for (let i = 0; i < 5; i++) b.push({ s: '@steel.1', w: 2, d: `M${100 + i * 12} 0V-14q4-6 8 0V0` });
      for (const x of [-4, 88]) b.push({ f: '@brick.1', d: sceneD.rect(x, -14, 18, 14) }, { f: '@steel.0', d: sceneD.ell(x + 9, -16, 11, 7) });
      lit.push({ f: { rad: [[0, '@flood', 0.36], [1, '@flood', 0]], cx: -170, cy: -40, r: 150 }, d: sceneD.ell(-170, -40, 150, 70) });
      lit.push({ f: { rad: [[0, '@flood', 0.3], [1, '@flood', 0]], cx: 48, cy: -20, r: 100 }, d: sceneD.ell(48, -20, 100, 34) });
      return { body: b, lit };
    },
  });
})();

/* ============================================================
   ARCHETYPE hook-country (8.1): the repeated scene types of the Hook area.
   Pure and seeded from the row id; the rows live in 71-scene-uk-hook-*.js.
   Row params: id, lat, lon, heading, horizon, at, form, landmark, lmx, lmy, lms,
   lmlayer, vx, side, wy0, wy1, fronty, sign, features (moored boat angler heron
   cattle trout train bluebells deer tractor walkers bench swans).
   ============================================================ */
const _hookArch = (function () {
  const R = v => Math.round(v);
  const has = (p, f) => (p.features || []).includes(f);
  const band = (y, amp, ph, foot = 905) => `M-160 ${R(foot)}V${R(y)}Q${R(300 + ph)} ${R(y - amp)} ${R(800 + ph / 2)} ${R(y + amp * 0.4)}T1760 ${R(y - amp * 0.3)}V${R(foot)}Z`;
  const pal = {
    base: { wood: ['#4e6844', '#3c5436'], ground: ['#6a8a44', '#557236', '#42602c'], bank: ['#5d6a3a', '#4a5530'], path: ['#b49c76', '#9a8462'], road: ['#5e6062', '#7a7c7c'], pave: ['#b0aaa0', '#948e84'], gravel: ['#a8a090', '#8a8476'],
      fieldA: ['#8cae5a', '#7c9e4e'], fieldB: ['#c8b86a', '#b0a25c'], hedge: ['#4e6e3a'], meadow: ['#86ae4e', '#6a9440'] },
    spring: { wood: ['#5f7e48', '#486640'], ground: ['#74983e', '#5a7a30', '#466228'], fieldA: ['#9cc060', '#86b052'], fieldB: ['#d8d060', '#c4bc52'], meadow: ['#94bc52', '#76a044'] },
    autumn: { wood: ['#8a6a3a', '#6a5232'], ground: ['#8a7e40', '#6e6232', '#54502a'], bank: ['#7a6c3a', '#5f5428'], path: ['#a88a5e', '#8a7050'], fieldA: ['#a8a058', '#948c4c'], fieldB: ['#a8845a', '#8e6e4a'], hedge: ['#7a5a2e'], meadow: ['#a89c54', '#8a8244'] },
    winter: { wood: ['#5a5a50', '#47483f'], ground: ['#8a9080', '#6e766a', '#586058'], bank: ['#7c7e70', '#62645a'], path: ['#a49882', '#8a806e'], fieldA: ['#8a9478', '#7a8468'], fieldB: ['#8a7e66', '#766a56'], hedge: ['#5a4e42'], meadow: ['#949a82', '#7c826e'] },
  };
  const layers = () => [{ id: 'horizon', depth: 0.08, haze: 0.45 }, { id: 'far', depth: 0.2, haze: 0.24 }, { id: 'mid', depth: 0.45, haze: 0.1 }, { id: 'near', depth: 0.75, haze: 0 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 }];
  const base = (p, setting) => ({
    v: 1, id: String(p.id), view: { lat: p.lat, lon: p.lon, heading: Number.isFinite(p.heading) ? p.heading : 200, fov: 78, horizon: p.horizon || 480, lift: 1 },
    at: p.at || 'afternoon', season: 'auto', tropic: 'summer', setting, signage: false, palette: JSON.parse(JSON.stringify(pal)),
    layers: layers(), sky: { stars: 200, clouds: { n: 4, y: [40, Math.max(200, (p.horizon || 480) - 140)], speed: 5 }, sunR: 24, moonR: 18 },
    ground: [], water: [], place: [], scatter: [], actors: [], flocks: [], signs: [], particles: 'season', weather: 'live', camera: { pan: 0, period: 90 },
  });
  const ppl = (d, id, y) => scenePersonScale((sceneObj(id) || { size: [30, 64] }).size[1], y, d.view);
  const farWood = (d, H, seed, n) => {
    d.ground.push({ layer: 'horizon', d: band(H - 8, 10, seed * 7 % 200, H + 40), fill: '@wood.0' });
    d.scatter.push({ obj: 'tree.pond-wood', layer: 'horizon', seed, area: { rect: [-150, H - 2, 1750, H + 16] }, n: n || 22, minGap: 24, s: [0.2, 0.58], flip: 0.5, variant: [0, 1], tint: { col: '#7a8a9a', k: [0, 0.1] }, mask: { noise: { scale: 200, cut: 0.25 } }, anim: false });
  };
  const flocks = (d, H, seed, water) => {
    d.flocks.push({ obj: water ? 'bird.goose-flight' : 'bird.small-flight', n: 5, area: [100, 120, 1500, Math.max(220, H - 140)], speed: 32, s: water ? 0.32 : 0.5, seed, layer: 'horizon' });
    d.flocks.push({ obj: 'bird.small-flight', n: 3, area: [500, 180, 1500, Math.max(260, H - 60)], speed: 44, s: 0.42, seed: seed + 1, layer: 'horizon' });
  };
  const landmark = (d, p, y, layer) => {
    if (!p.landmark || !sceneObj(p.landmark)) return;
    d.place.push({ obj: p.landmark, x: Number.isFinite(p.lmx) ? p.lmx : 800, y, s: Number.isFinite(p.lms) ? p.lms : 1, layer: layer || 'mid', seed: 3, reflect: !!d.water.length, anim: false });
  };
  const finish = (d) => {
    const out = [];
    d.scatter.forEach((r, i) => {
      if (r.n >= 30 && !r.tint && Array.isArray(r.variant) && r.variant[0] === 0 && r.variant[1] === 1) {
        const h = Math.round(r.n / 2);
        out.push(Object.assign({}, r, { n: h, variant: 0 }), Object.assign({}, r, { n: r.n - h, variant: 1, seed: r.seed + 500, anim: r.anim === 'strip' ? false : r.anim, tint: { col: i % 2 ? '#8a7a40' : '#6a7a3a', k: [0.08, 0.08] } }));
      } else { if (!r.tint && r.n >= 20) r.tint = { col: '#7a8a6a', k: [0, 0.1] }; out.push(r); }
    });
    d.scatter = out;
    if (d.water.length) for (const e of d.scatter.concat(d.place)) if (['horizon', 'far', 'mid'].includes(e.layer) && e.reflect == null) e.reflect = true;
    if (!d.signs.length) delete d.signs;
    return d;
  };

  /* ---- tunnel: the canal receding straight into the portal in its wooded cutting ---- */
  function tunnel(p, d) {
    const H = d.view.horizon, vx = Number.isFinite(p.vx) ? p.vx : 800, tow = p.side || 'left', y0 = H + 40;
    const wl = (y) => { const t = (y - y0) / (905 - y0); return [vx - 40 - t * 640, vx + 40 + t * 640]; };
    const [a1, b1] = wl(905);
    // the cutting: wooded banks rising high on both sides toward the portal
    d.ground.push({ layer: 'horizon', d: `M-160 ${H + 60}L-160 ${H - 160}Q${vx - 300} ${H - 120} ${vx - 160} ${H - 30}L${vx} ${H - 40}L${vx + 160} ${H - 30}Q${vx + 300} ${H - 120} 1760 ${H - 170}V${H + 60}Z`, fill: '@wood.0' });
    d.scatter.push({ obj: { 'tree.bank-oak': 2, 'tree.bank-alder': 1, 'tree.bank-birch': 1, 'tree.far-broad': 2 }, layer: 'far', seed: 11, area: { rect: [-150, H - 40, vx - 200, H + 20] }, n: 9, minGap: 70, s: [0.4, 0.8], flip: 0.5, variant: [0, 1], anim: false });
    d.scatter.push({ obj: { 'tree.bank-oak': 2, 'tree.bank-alder': 1, 'tree.bank-birch': 1, 'tree.far-broad': 2 }, layer: 'far', seed: 12, area: { rect: [vx + 200, H - 40, 1750, H + 20] }, n: 9, minGap: 70, s: [0.4, 0.8], flip: 0.5, variant: [0, 1], anim: false });
    d.scatter.push({ obj: 'tree.pond-wood', layer: 'horizon', seed: 13, area: { rect: [vx - 260, H - 70, vx + 260, H - 40] }, n: 8, minGap: 40, s: [0.3, 0.55], flip: 0.5, variant: [0, 1], tint: { col: '#6a7a6a', k: [0, 0.1] }, anim: false });
    d.water.push({ layer: 'far', d: `M${vx - 40} ${y0}H${vx + 40}L${R(b1)} 905H${R(a1)}Z`, y0, y1: 905, base: ['#7aa49c', '#3e6e64', '#22463e'], reflect: true, shimmer: 18, lightPath: false });
    const L = `M-160 905V${y0 - 2}H${vx - 40}L${R(a1)} 905Z`, Rr = `M1760 905V${y0 - 2}H${vx + 40}L${R(b1)} 905Z`;
    d.ground.push({ layer: 'far', d: L, fill: { lin: [[0, '@bank.0'], [1, '@ground.2']], y1: y0, y2: 900 } }, { layer: 'far', d: Rr, fill: { lin: [[0, '@bank.0'], [1, '@ground.2']], y1: y0, y2: 900 } });
    const towD = tow === 'left' ? `M${vx - 44} ${y0}L${vx - 70} ${y0}L${R(a1 - 420)} 905H${R(a1 - 10)}Z` : `M${vx + 44} ${y0}L${vx + 70} ${y0}L${R(b1 + 420)} 905H${R(b1 + 10)}Z`;
    d.ground.push({ layer: 'mid', d: towD, fill: { lin: [[0, '@path.1'], [1, '@path.0']], y1: y0, y2: 900 } });
    // trees lining the cutting, growing toward the viewer
    for (const [sgn, seed] of [[-1, 70], [1, 71]]) {
      for (let i = 0; i < 8; i++) {
        const t = Math.pow((i + 1) / 8, 1.5), y = R(y0 + 6 + t * 300), xs = wl(y), off = (sgn < 0 ? (tow === 'left' ? 300 : 60) : (tow === 'right' ? 300 : 60)) * (0.3 + t);
        const id = ['tree.bank-oak', 'tree.bank-alder', 'tree.bank-birch', 'tree.bank-willow'][(i + seed) % 4];
        d.place.push({ obj: id, x: R(sgn < 0 ? xs[0] - off : xs[1] + off), y, s: Math.round((0.22 + t * 1.0) * 100) / 100, flip: sgn > 0, variant: t < 0.45 ? 0 : 1, layer: t < 0.45 ? 'mid' : 'near', seed: seed * 10 + i, anim: false, reflect: true });
      }
    }
    // reeds and weed along the clear shallow water, cover on the banks
    for (const [sgn, seed] of [[-1, 72], [1, 73]]) {
      const poly = sgn < 0 ? [[vx - 42, y0], [vx - 90, y0], [R(a1 - 180), 905], [R(a1), 905]] : [[vx + 42, y0], [vx + 90, y0], [R(b1 + 180), 905], [R(b1), 905]];
      d.scatter.push({ obj: { 'plant.reed': 3, 'plant.bulrush': 1, 'plant.towpath-hedge': 0.6, 'plant.fern': 0.6 }, layer: 'mid', seed, area: { poly }, n: 150, minGap: 10, s: [0.2, 1.1], sByY: [[y0, 0.3], [900, 1.3]], flip: 0.5, variant: [0, 1], anim: false, reflect: true });
    }
    d.scatter.push({ obj: 'plant.water-crowfoot', layer: 'mid', seed: 74, area: { poly: [[vx - 30, y0 + 30], [vx + 30, y0 + 30], [R(b1 - 120), 880], [R(a1 + 120), 880]] }, n: 26, minGap: 30, s: [0.3, 1.0], sByY: [[y0, 0.3], [900, 1.1]], variant: [0, 1], anim: false, tint: { col: '#a0a050', k: [0, 0.1] } });
    const chAvoid = [{ poly: [[vx - 50, y0], [vx + 50, y0], [R(b1 + 20), 905], [R(a1 - 20), 905]] }, { poly: tow === 'left' ? [[vx - 70, y0], [vx - 40, y0], [R(a1), 905], [R(a1 - 440), 905]] : [[vx + 40, y0], [vx + 70, y0], [R(b1 + 440), 905], [R(b1), 905]] }];
    d.scatter.push({ obj: { 'plant.grass': 4, 'plant.wildflowers': 1, 'plant.bracken': 1, 'plant.fern': 1 }, layer: 'near', seed: 75, area: { rect: [-160, H + 150, 1760, H + 300] }, n: 170, minGap: 14, s: [0.5, 0.9], flip: 0.5, variant: [0, 1], anim: false, mask: { avoid: chAvoid } });
    d.scatter.push({ obj: { 'plant.grass': 4, 'plant.wildflowers': 1, 'plant.bracken': 1 }, layer: 'fore', seed: 76, area: { rect: [-160, H + 300, 1760, 905] }, n: 200, minGap: 18, s: [0.9, 1.4], sByY: [[H + 300, 0.85], [900, 1.2]], flip: 0.5, variant: [0, 1], anim: 'strip', mask: { avoid: chAvoid } });
    d.scatter.push({ obj: { 'plant.grass': 3, 'plant.fern': 1 }, layer: 'far', seed: 77, area: { rect: [-160, y0 - 2, 1760, H + 150] }, n: 150, minGap: 15, s: [0.2, 0.6], sByY: [[y0, 0.4], [H + 150, 1]], flip: 0.5, variant: [0, 1], anim: false, mask: { avoid: [{ poly: [[vx - 90, y0 - 4], [vx + 90, y0 - 4], [R(wl(H + 150)[1] + 60), H + 150], [R(wl(H + 150)[0] - 60), H + 150]] }] } });
    // life: a swan pair, mallards, a moorhen, a kingfisher down the cut; walkers on the towpath
    d.actors.push({ obj: 'bird.swan', layer: 'mid', path: [[vx - 6, y0 + 40], [vx + 30, H + 220]], speed: 3, loop: 'pingpong', s: 0.32, seed: 78, offset: 0.6 });
    d.actors.push({ obj: 'bird.mallard', layer: 'near', path: [[R(a1 + 300), 860], [R(b1 - 300), 830]], speed: 6, loop: 'pingpong', s: 0.45, seed: 79 });
    d.actors.push({ obj: 'bird.kingfisher-flight', layer: 'near', path: [[R(b1), 700], [vx, y0 + 60]], speed: 150, loop: 'loop', s: 0.8, seed: 80 });
    d.place.push({ obj: 'bird.moorhen', x: vx - 60, y: H + 200, s: 0.34, layer: 'mid', seed: 86, flip: true, reflect: true }, { obj: 'bird.mallard', x: vx + 50, y: H + 140, s: 0.28, layer: 'mid', seed: 87, reflect: true });
    const tp = (t) => { const y = y0 + t * (905 - y0), xs = wl(y); return [R(tow === 'left' ? xs[0] - 34 - t * 160 : xs[1] + 34 + t * 160), R(y)]; };
    const walkPath = [tp(0.1), tp(0.95)];
    d.actors.push({ obj: 'person.dog-walker', layer: 'near', path: walkPath, speed: 10, loop: 'pingpong', s: ppl(d, 'person.dog-walker', 760), sByY: true, seed: 81, offset: 0.2 });
    d.actors.push({ obj: 'person.walker', layer: 'near', path: walkPath, speed: 8, loop: 'pingpong', s: ppl(d, 'person.walker', 700), sByY: true, seed: 83, offset: 0.65, variant: 3 });
    if (has(p, 'angler')) { const [ax, ay] = tp(0.55); d.place.push({ obj: 'person.angler', x: tow === 'left' ? ax + 90 : ax - 90, y: ay, s: ppl(d, 'person.angler', ay) * 0.75 * 64 / 83, flip: tow !== 'left', layer: 'near', seed: 84 }); }
    if (has(p, 'birdwatcher')) { const [bx, by] = tp(0.4); d.place.push({ obj: 'person.birdwatcher', x: bx, y: by, s: ppl(d, 'person.birdwatcher', by), layer: 'near', seed: 85 }); }
    landmark(d, p, Number.isFinite(p.lmy) ? p.lmy : y0 + 4, p.lmlayer || 'far');
    flocks(d, H, 88, false);
  }

  /* ---- canal / river: water across the scene between a far bank and the near towpath or meadow ---- */
  function water(p, d, river) {
    const H = d.view.horizon;
    farWood(d, H, 21);
    const wy0 = Number.isFinite(p.wy0) ? p.wy0 : H + 150, wy1 = Number.isFinite(p.wy1) ? p.wy1 : H + (river ? 230 : 270);
    d.ground.push({ layer: 'far', d: band(H + 4, 6, 60), fill: { lin: [[0, river ? '@meadow.0' : '@ground.0'], [1, river ? '@meadow.1' : '@ground.1']], y1: H, y2: wy0 } });
    const lmAvoid = p.landmark ? [{ rect: [(p.lmx || 800) - 260, H - 40, (p.lmx || 800) + 260, wy0 + 4] }] : [];
    d.scatter.push({ obj: { 'tree.bank-oak': 2, 'tree.bank-alder': 2, 'tree.bank-birch': 1, 'tree.bank-distant': 2 }, layer: 'far', seed: 90, area: { rect: [-150, H + 10, 1750, H + 40] }, n: 16, minGap: 44, s: [0.24, 0.56], flip: 0.5, variant: [0, 1], anim: false, mask: { noise: { scale: 220, cut: 0.3 }, avoid: lmAvoid } });
    if (has(p, 'cattle')) d.scatter.push({ obj: 'animal.cattle', layer: 'far', seed: 89, area: { rect: [-100, H + 50, 1700, wy0 - 40] }, n: 6, minGap: 110, s: [0.22, 0.32], sByY: [[H + 50, 0.8], [wy0 - 40, 1.15]], flip: 0.5, variant: [0, 1], mask: { noise: { scale: 220, cut: 0.35 }, avoid: lmAvoid } });
    d.ground.push({ layer: 'mid', d: band(wy0 - 30, 4, 30, wy0 + 6), fill: '@bank.0' });
    d.scatter.push({ obj: river ? { 'tree.green-willow': 2, 'tree.green-alder': 3 } : { 'tree.bank-oak': 2, 'tree.bank-alder': 2, 'tree.bank-willow': 1, 'tree.bank-birch': 1 }, layer: 'mid', seed: 91, area: { rect: [-150, wy0 - 26, 1750, wy0 - 8] }, n: 9, minGap: 90, s: river ? [0.4, 0.62] : [0.34, 0.9], flip: 0.5, variant: [0, 1], anim: false, reflect: true, mask: { avoid: p.landmark ? [{ rect: [(p.lmx || 800) - 330, wy0 - 60, (p.lmx || 800) + 330, wy0] }] : [] } });
    d.scatter.push({ obj: { 'plant.towpath-hedge': river ? 0.3 : 1, 'plant.reed': 2, 'plant.grass': 3, 'plant.bulrush': river ? 1 : 0.3 }, layer: 'mid', seed: 92, area: { rect: [-150, wy0 - 28, 1750, wy0 + 2] }, n: 160, minGap: 12, s: [0.3, 0.85], sByY: [[wy0 - 28, 0.75], [wy0 + 2, 1.25]], flip: 0.5, variant: [0, 1], anim: false, reflect: true, mask: { avoid: p.landmark ? [{ rect: [(p.lmx || 800) - 300, wy0 - 60, (p.lmx || 800) + 300, wy0 + 4] }] : [] } });
    d.water.push({ layer: 'mid', d: `M-160 ${wy0}H1760V${wy1}H-160Z`, y0: wy0, y1: wy1, base: river ? ['#a8ccc4', '#5e9e98', '#2e6a6a'] : ['#7aa49c', '#4a7a70', '#2a5048'], reflect: true, shimmer: 26, lightPath: true });
    if (river) {
      d.scatter.push({ obj: 'plant.water-crowfoot', layer: 'mid', seed: 93, area: { rect: [-150, wy0 + 14, 1750, wy1 - 8] }, n: 18, minGap: 44, s: [0.7, 1.3], sByY: [[wy0, 0.7], [wy1, 1.3]], variant: [0, 1], anim: false, tint: { col: '#c0b060', k: [0, 0.1] } });
      for (let i = 0; i < 3; i++) { const y = wy0 + 24 + i * 14, x0 = 240 + ((i * 397) % 1000); d.actors.push({ obj: 'animal.trout', layer: 'mid', path: [[x0, y], [x0 + 30 + i * 8, y + 2]], speed: 2.5, loop: 'pingpong', s: 0.9 + i * 0.15, seed: 31 + i, variant: i % 2, offset: i * 0.23 }); }
      d.place.push({ obj: 'water.fish-ring', x: 980, y: wy0 + 40, s: 0.5, layer: 'mid', seed: 30 });
    }
    // the near bank: a towpath (canal) or a water meadow edge (river), and its cover
    d.ground.push({ layer: 'near', d: band(wy1 - 2, 3, 80), fill: river ? { lin: [[0, '@bank.0'], [0.12, '@meadow.0'], [1, '@ground.2']], y1: wy1, y2: 905 } : { lin: [[0, '@path.1'], [0.25, '@path.0'], [0.4, '@ground.1'], [1, '@ground.2']], y1: wy1, y2: 905 } });
    d.scatter.push({ obj: { 'plant.reed': 2, 'plant.grass': 3, 'plant.bulrush': 1 }, layer: 'near', seed: 94, area: { rect: [-150, wy1 - 2, 1750, wy1 + 10] }, n: 70, minGap: 22, s: [0.25, 1.0], flip: 0.5, variant: [0, 1], anim: false, reflect: true, mask: { noise: { scale: 200, cut: 0.4 } } });
    d.scatter.push({ obj: { 'plant.grass': 4, 'plant.wildflowers': has(p, 'flowers') ? 2 : 1, 'plant.fern': 1, 'plant.bracken': river ? 0 : 1 }, layer: 'fore', seed: 95, area: { rect: [-150, wy1 + 60, 1750, 905] }, n: 300, minGap: 16, s: [0.8, 1.4], sByY: [[wy1 + 60, 0.8], [900, 1.3]], flip: 0.5, variant: [0, 1], anim: 'strip' });
    d.place.push({ obj: river ? 'tree.green-willow' : 'tree.bank-oak', x: -40, y: 905, s: river ? 0.95 : 1.6, variant: 1, layer: 'front', seed: 96, anim: false }, { obj: 'tree.bank-alder', x: 1690, y: 905, s: 1.7, flip: true, variant: 2, layer: 'front', seed: 97, anim: false });
    // boats and birds on the water; people along the bank
    const mid = (k) => R(wy0 + (wy1 - wy0) * k);
    if (has(p, 'moored')) d.place.push({ obj: 'boat.narrowboat', x: Number.isFinite(p.boatx) ? p.boatx : 1180, y: mid(0.35), s: 0.6, variant: 1, layer: 'mid', seed: 98, reflect: true });
    if (has(p, 'boat')) d.actors.push({ obj: 'boat.narrowboat', layer: 'mid', path: [[-400, mid(0.62)], [2000, mid(0.62)]], speed: 6, loop: 'loop', s: 0.72, seed: 99, offset: 0.3, variant: 0 });
    if (has(p, 'canoe')) d.actors.push({ obj: 'person.kayaker', layer: 'mid', path: [[1800, mid(0.5)], [-200, mid(0.5)]], speed: 12, loop: 'loop', s: ppl(d, 'person.kayaker', mid(0.5)) * 0.8, seed: 100, offset: 0.6, flip: true });
    d.actors.push({ obj: 'bird.swan', layer: 'mid', path: [[300, mid(0.3)], [900, mid(0.25)]], speed: 4, loop: 'pingpong', s: 0.3, seed: 101, offset: 0.5 });
    d.actors.push({ obj: river ? 'bird.moorhen' : 'bird.mallard', layer: 'mid', path: [[1300, mid(0.8)], [800, mid(0.76)]], speed: 5, loop: 'pingpong', s: 0.36, seed: 102, offset: 0.2 });
    d.actors.push({ obj: 'bird.kingfisher-flight', layer: 'mid', path: [[1800, mid(0.2)], [-200, mid(0.3)]], speed: 170, loop: 'loop', s: 0.7, seed: 103 });
    const ty = R(wy1 + 30);
    d.actors.push({ obj: 'person.dog-walker', layer: 'near', path: [[-80, ty], [1680, ty]], speed: 12, loop: 'loop', s: ppl(d, 'person.dog-walker', ty), seed: 104, offset: 0.1 });
    d.actors.push({ obj: river ? 'person.hiker' : 'person.cyclist', layer: 'near', path: [[1700, ty + 8], [-100, ty + 8]], speed: river ? 10 : 34, loop: 'loop', s: ppl(d, river ? 'person.hiker' : 'person.cyclist', ty + 8), seed: 105, offset: 0.55, flip: true });
    if (has(p, 'angler')) d.place.push({ obj: 'person.angler', x: 360, y: ty - 6, s: ppl(d, 'person.angler', ty) * 0.75 * 64 / 83, layer: 'near', seed: 106 });
    if (has(p, 'heron')) d.place.push({ obj: 'bird.heron', x: 1380, y: wy1 + 2, s: 0.55, layer: 'near', seed: 107, reflect: true });
    if (has(p, 'bench')) d.place.push({ obj: 'street.bench', x: 1240, y: ty + 40, s: 0.9, layer: 'near', seed: 108 });
    if (has(p, 'bridge')) d.place.push({ obj: 'structure.bridge-brick', x: Number.isFinite(p.brx) ? p.brx : 1250, y: mid(0.9), s: 0.62, layer: 'mid', seed: 109, reflect: true });
    d.actors.push({ obj: 'animal.dragonfly', layer: 'near', path: [[500, wy1 - 20], [700, wy1 - 50], [620, wy1 + 10]], speed: 40, loop: 'pingpong', s: 0.6, seed: 110 });
    landmark(d, p, Number.isFinite(p.lmy) ? p.lmy : wy0 - 6, p.lmlayer || 'mid');
    flocks(d, H, 111, true);
  }

  /* ---- fields: arable fields and hedgerows to a wood edge; the main line on its embankment ---- */
  function fields(p, d) {
    const H = d.view.horizon;
    farWood(d, H, 31, 26);
    const fy0 = H + 2, fy1 = H + 80;
    d.ground.push({ layer: 'far', d: `M-160 ${fy0}H1760V${fy1 + 40}H-160Z`, fill: '@fieldA.0' });
    let x = -160, k = 0, fd = '', hd = '';
    while (x < 1760) { const w = 140 + ((k * 97) % 220), x1 = Math.min(1760, x + w), yA = fy0 + 8 + ((k * 31) % 20), yB = yA + 16 + ((k * 17) % 22); if (k % 2) fd += `M${R(x)} ${R(yA)}L${R(x1)} ${R(yA - 4)}L${R(x1 + 30)} ${R(yB)}L${R(x - 20)} ${R(yB + 3)}Z`; hd += `M${R(x1)} ${fy0}l${30 + (k * 13) % 30} ${fy1 - fy0}h3l${-(30 + (k * 7) % 20)} ${fy0 - fy1}Z`; x = x1; k++; }
    d.ground.push({ layer: 'far', d: fd, fill: '@fieldB.0' }, { layer: 'far', d: hd, fill: '@hedge.0' });
    d.scatter.push({ obj: { 'tree.distant': 3, 'tree.far-broad': 2 }, layer: 'far', seed: 32, area: { rect: [-150, fy0 - 2, 1750, fy0 + 50] }, n: 16, minGap: 40, s: [0.2, 0.46], variant: [0, 1], anim: false, mask: { noise: { scale: 200, cut: 0.35 } } });
    const lx = Number.isFinite(p.lmx) ? p.lmx : 1150;
    // the main line across the middle distance on a low embankment, trains both ways
    if (has(p, 'train')) {
      const ry = fy1 + 40, rt = ry - 30;
      d.ground.push({ layer: 'mid', d: `M-160 ${ry + 6}L-160 ${rt + 8}Q800 ${rt + 4} 1760 ${rt + 8}L1760 ${ry + 6}Z`, fill: { lin: [[0, '@ground.0'], [1, '@ground.1']], y1: rt, y2: ry } },
        { layer: 'mid', d: `M-160 ${rt + 8}L-160 ${rt - 1}H1760V${rt + 8}Z`, fill: '@gravel.1' }, { layer: 'mid', d: `M-160 ${rt - 3}H1760V${rt - 1}H-160Z`, fill: '#6a6460' }, { layer: 'mid', d: `M-160 ${rt + 2}H1760V${rt + 4}H-160Z`, fill: '#8a8480' });
      d.actors.push({ obj: 'rail.train-mainline', layer: 'mid', path: [[-700, rt - 1], [2300, rt - 1]], speed: 110, loop: 'loop', s: 0.56, seed: 34, offset: 0.25, variant: 1 });
      d.actors.push({ obj: 'rail.train-mainline', layer: 'mid', path: [[2300, rt - 5], [-700, rt - 5]], speed: 90, loop: 'loop', s: 0.54, seed: 35, offset: 0.75, variant: 4, flip: true });
      d.scatter.push({ obj: { 'plant.shrub': 2, 'plant.hedge': 1, 'plant.bracken': 1 }, layer: 'mid', seed: 36, area: { rect: [-150, ry, 1750, ry + 10] }, n: 18, minGap: 60, s: [0.3, 0.55], variant: [0, 1], anim: false, tint: { col: '#6a5a30', k: [0, 0.1] }, mask: { noise: { scale: 240, cut: 0.35 } } });
    }
    // the near meadow, a field margin path, the wood edge on one side
    const midTop = H + (has(p, 'train') ? 140 : 100);
    d.ground.push({ layer: 'mid', d: band(midTop, 8, 120), fill: { lin: [[0, '@meadow.0'], [1, '@meadow.1']], y1: midTop, y2: 905 } });
    d.ground.push({ layer: 'near', d: `M${lx - 60} ${midTop + 10}Q${lx - 260} ${midTop + 160} ${lx - 520} 905H${lx - 300}Q${lx - 160} ${midTop + 160} ${lx - 40} ${midTop + 10}Z`, fill: { lin: [[0, '@path.1'], [1, '@path.0']], y1: midTop, y2: 905 } });
    const woodLeft = p.side !== 'right';
    d.ground.push({ layer: 'mid', d: woodLeft ? `M-160 905V${midTop - 120}Q160 ${midTop - 150} 360 ${midTop - 40}Q420 ${midTop + 120} 300 905Z` : `M1760 905V${midTop - 120}Q1440 ${midTop - 150} 1240 ${midTop - 40}Q1180 ${midTop + 120} 1300 905Z`, fill: { lin: [[0, '@wood.0'], [1, '@wood.1']], y1: midTop - 150, y2: 905 } });
    d.scatter.push({ obj: { 'tree.green-oak': 2, 'tree.bank-oak': 2, 'tree.bank-birch': 1, 'tree.green-chestnut': 1 }, layer: 'mid', seed: 37, area: { rect: woodLeft ? [-150, midTop - 40, 330, midTop + 10] : [1270, midTop - 40, 1750, midTop + 10] }, n: 6, minGap: 70, s: [0.6, 0.9], flip: 0.5, variant: [0, 1], anim: false });
    if (has(p, 'bluebells')) d.scatter.push({ obj: 'plant.bluebells', layer: 'near', seed: 38, area: { rect: woodLeft ? [-150, midTop + 20, 340, midTop + 260] : [1260, midTop + 20, 1750, midTop + 260] }, n: 40, minGap: 20, s: [0.5, 1.0], sByY: [[midTop, 0.6], [midTop + 260, 1.1]], variant: [0, 1], anim: false });
    d.scatter.push({ obj: { 'plant.grass': 4, 'plant.wildflowers': 1 }, layer: 'mid', seed: 39, area: { rect: [-150, midTop + 6, 1750, midTop + 140] }, n: 160, minGap: 13, s: [0.25, 0.5], sByY: [[midTop, 0.6], [midTop + 140, 1.1]], flip: 0.5, variant: [0, 1], anim: false, mask: { avoid: [{ poly: [[lx - 70, midTop], [lx - 30, midTop], [lx - 290, 905], [lx - 530, 905]] }] } });
    d.scatter.push({ obj: { 'plant.grass': 3, 'plant.wildflowers': 2, 'plant.hedgerow-blackberry': 0.5 }, layer: 'fore', seed: 40, area: { rect: [-150, midTop + 150, 1750, 905] }, n: 240, minGap: 15, s: [0.8, 1.3], sByY: [[midTop + 150, 0.8], [900, 1.25]], flip: 0.5, variant: [0, 1], anim: 'strip', mask: { avoid: [{ poly: [[lx - 160, midTop + 150], [lx - 100, midTop + 150], [lx - 290, 905], [lx - 530, 905]] }] } });
    d.scatter.push({ obj: { 'plant.hedge': 2, 'plant.hedgerow-blackberry': 1, 'plant.shrub': 1 }, layer: 'near', seed: 41, area: { rect: [-150, midTop + 60, 1750, midTop + 80] }, n: 12, minGap: 70, s: [0.5, 0.9], flip: 0.5, variant: [0, 1], anim: false, mask: { noise: { scale: 160, cut: 0.35 }, avoid: [{ rect: [lx - 560, midTop + 40, lx + 120, midTop + 100] }] } });
    if (has(p, 'tractor')) d.actors.push({ obj: 'vehicle.tractor', layer: 'far', path: [[300, fy0 + 30], [1300, fy0 + 34]], speed: 8, loop: 'pingpong', s: 0.22, seed: 42, offset: 0.4 });
    if (has(p, 'deer')) d.place.push({ obj: 'animal.deer', x: woodLeft ? 440 : 1160, y: midTop + 70, s: 0.42, flip: !woodLeft, layer: 'mid', seed: 43 }, { obj: 'animal.deer', x: woodLeft ? 500 : 1100, y: midTop + 84, s: 0.38, flip: !woodLeft, variant: 1, layer: 'mid', seed: 44 });
    if (has(p, 'sheep')) d.scatter.push({ obj: 'animal.sheep', layer: 'mid', seed: 45, area: { rect: [500, midTop + 20, 1500, midTop + 110] }, n: 9, minGap: 70, s: [0.3, 0.45], sByY: [[midTop, 0.8], [midTop + 110, 1.2]], variant: [0, 1], mask: { noise: { scale: 200, cut: 0.4 } } });
    d.place.push({ obj: 'structure.field-gate', x: lx - 120, y: midTop + 70, s: 0.6, layer: 'near', seed: 46 });
    d.actors.push({ obj: 'animal.rabbit', layer: 'near', path: [[lx + 200, midTop + 200], [lx + 260, midTop + 206]], speed: 4, loop: 'pingpong', s: 0.5, seed: 47 });
    const wp = [[lx - 50, midTop + 20], [lx - 400, 900]];
    d.actors.push({ obj: 'person.hiker', layer: 'near', path: wp, speed: 8, loop: 'pingpong', s: ppl(d, 'person.hiker', 700), sByY: true, seed: 48, offset: 0.3 });
    d.actors.push({ obj: 'person.dog-walker', layer: 'near', path: wp.slice().reverse(), speed: 9, loop: 'pingpong', s: ppl(d, 'person.dog-walker', 700), sByY: true, seed: 49, offset: 0.8 });
    d.place.push({ obj: 'tree.bank-oak', x: woodLeft ? -40 : 1690, y: 905, s: 1.6, variant: 1, flip: !woodLeft, layer: 'front', seed: 50, anim: false });
    landmark(d, p, Number.isFinite(p.lmy) ? p.lmy : midTop + 40, p.lmlayer || 'mid');
    flocks(d, H, 51, false);
  }

  /* ---- station and street: the urban views ---- */
  function town(p, d, kind) {
    const H = d.view.horizon;
    farWood(d, H, 61, 16);
    const fy = Number.isFinite(p.fronty) ? p.fronty : H + 150, lx = Number.isFinite(p.lmx) ? p.lmx : 800;
    d.ground.push({ layer: 'far', d: band(H + 4, 4, 20), fill: { lin: [[0, '@ground.0'], [1, '@ground.1']], y1: H, y2: fy } });
    const lmBox = [{ rect: [lx - 340, H - 20, lx + 340, fy + 4] }];
    d.scatter.push({ obj: { 'building.terrace': 2, 'building.cottage': 2 }, layer: 'far', seed: 62, area: { rect: [-150, H + 20, 1750, H + 40] }, n: 10, minGap: 130, s: [0.36, 0.54], flip: 0.5, variant: [0, 1], tint: { col: '#9aa8b4', k: [0, 0.12] }, mask: { avoid: lmBox } });
    d.scatter.push({ obj: { 'tree.plane': 1, 'tree.bank-oak': 2, 'tree.bank-distant': 1, 'tree.bank-birch': 1 }, layer: 'far', seed: 63, area: { rect: [-150, H + 30, 1750, H + 50] }, n: 10, minGap: 140, s: [0.28, 0.42], flip: 0.5, variant: [0, 1], anim: false, mask: { avoid: lmBox } });
    if (kind === 'station') {
      const ty = fy + 30;
      d.ground.push({ layer: 'mid', d: `M-160 ${fy}H1760V${ty + 110}H-160Z`, fill: { lin: [[0, '@gravel.1'], [1, '@gravel.0']], y1: fy, y2: ty + 110 } });
      d.ground.push({ layer: 'mid', d: `M-160 ${fy - 14}H1760V${fy + 4}H-160Z`, fill: '@pave.1' }, { layer: 'mid', d: `M-160 ${fy + 2}H1760V${fy + 6}H-160Z`, fill: '#e6d36a' });
      for (const y of [ty, ty + 22]) d.ground.push({ layer: 'mid', d: `M-160 ${y}H1760V${y + 3}H-160Z`, fill: '#5a5450' }, { layer: 'mid', d: `M-160 ${y + 9}H1760V${y + 12}H-160Z`, fill: '#5a5450' });
      d.ground.push({ layer: 'mid', d: `M-160 ${ty + 15}H1760V${ty + 17}H-160Z`, fill: '#9a9488' });   // the third rail
      d.scatter.push({ obj: { 'plant.grass': 3, 'plant.wildflowers': 1 }, layer: 'mid', seed: 64, area: { rect: [-150, ty + 30, 1750, ty + 50] }, n: 80, minGap: 18, s: [0.24, 0.45], flip: 0.5, variant: [0, 1], tint: { col: '#6a6460', k: [0, 0.1] }, anim: false });
      d.actors.push({ obj: 'rail.train-mainline', layer: 'mid', path: [[-900, ty + 20], [2500, ty + 20]], speed: 90, loop: 'loop', s: 1.0, seed: 65, offset: 0.2, variant: 1 });
      d.ground.push({ layer: 'near', d: `M-160 ${ty + 56}H1760V${ty + 112}H-160Z`, fill: { lin: [[0, '@gravel.1'], [1, '@gravel.0']], y1: ty + 56, y2: ty + 112 } });
      for (const y of [ty + 64, ty + 88]) d.ground.push({ layer: 'near', d: `M-160 ${y}H1760V${y + 3}H-160Z`, fill: '#5a5450' }, { layer: 'near', d: `M-160 ${y + 9}H1760V${y + 12}H-160Z`, fill: '#5a5450' });
      d.ground.push({ layer: 'near', d: `M-160 ${ty + 80}H1760V${ty + 82}H-160Z`, fill: '#9a9488' });
      d.actors.push({ obj: 'rail.train-mainline', layer: 'near', path: [[2500, ty + 100], [-900, ty + 100]], speed: 70, loop: 'loop', s: 1.1, seed: 66, offset: 0.7, variant: 4, flip: true });
      const py = ty + 130;
      d.ground.push({ layer: 'fore', d: `M-160 905V${py}H1760V905Z`, fill: { lin: [[0, '@pave.0'], [1, '@pave.1']], y1: py, y2: 905 } }, { layer: 'fore', d: `M-160 ${py}H1760V${py + 10}H-160Z`, fill: '#e6d36a' });
      d.scatter.push({ obj: { 'plant.planter': 2, 'plant.grass': 2, 'street.bollard': 1, 'street.bench': 1 }, layer: 'fore', seed: 67, area: { rect: [-150, py + 60, 1750, 905] }, n: 60, minGap: 40, s: [0.6, 1.0], sByY: [[py + 40, 0.8], [900, 1.2]], flip: 0.5, variant: [0, 1], anim: false, mask: { noise: { scale: 160, cut: 0.45 } } });
      const waiting = ['person.commuter-station', 'person.commuter', 'person.student', 'person.phone-idler'].filter(id => sceneObj(id));
      for (let i = 0; i < 4 && waiting.length; i++) { const y = py + 50 + (i % 2) * 40, id = waiting[i % waiting.length]; d.place.push({ obj: id, x: 150 + i * 360, y, s: ppl(d, id, y), variant: i, layer: 'fore', seed: 68 + i, anim: false }); }
      d.actors.push({ obj: 'person.walker', layer: 'fore', path: [[-80, py + 120], [1680, py + 130]], speed: 16, loop: 'loop', s: ppl(d, 'person.walker', py + 120), seed: 72, offset: 0.3, variant: 5 });
      d.place.push({ obj: 'bird.pigeon', x: 980, y: py + 90, s: 0.9, layer: 'fore', seed: 73 }, { obj: 'street.lamppost', x: 420, y: py + 30, s: 0.9, layer: 'fore', seed: 74 }, { obj: 'street.lamppost', x: 1180, y: py + 30, s: 0.9, layer: 'fore', seed: 75 }, { obj: 'street.station-clock', x: 820, y: py + 24, s: 0.8, layer: 'fore', seed: 76 });
      if (p.sign) { d.signage = true; d.signs.push({ layer: 'fore', x: Number.isFinite(p.signx) ? p.signx : 600, y: py + 4, w: 220, h: 44, text: String(p.sign), bars: ['#d03a2f'], style: 'board' }); }
    } else {
      const ry = fy + 70;
      d.ground.push({ layer: 'mid', d: band(fy - 4, 3, 40, ry), fill: '@pave.0' });
      d.scatter.push({ obj: { 'building.shopfront': 2, 'building.cottage': 1, 'building.terrace': 1 }, layer: 'mid', seed: 77, area: { rect: [-150, fy - 4, 1750, fy] }, n: 8, minGap: 160, s: [0.36, 0.5], flip: 0.5, variant: [0, 1], mask: { avoid: [{ rect: [lx - 340, fy - 10, lx + 340, fy + 4] }] } });
      d.ground.push({ layer: 'near', d: `M-160 ${ry}H1760V${ry + 90}H-160Z`, fill: { lin: [[0, '@road.0'], [1, '@road.1']], y1: ry, y2: ry + 90 } });
      d.ground.push({ layer: 'near', d: `M-160 ${ry + 43}H1760V${ry + 46}H-160Z`, fill: '#d8d4c8' }, { layer: 'near', d: `M-160 ${ry - 8}H1760V${ry}H-160Z`, fill: '#8a867e' });
      d.ground.push({ layer: 'fore', d: `M-160 905V${ry + 90}H1760V905Z`, fill: { lin: [[0, '@pave.0'], [1, '@pave.1']], y1: ry + 90, y2: 905 } });
      d.actors.push({ obj: 'vehicle.car', layer: 'near', path: [[-260, ry + 30], [1860, ry + 30]], speed: 50, loop: 'loop', s: 1.1, seed: 78, offset: 0.1 });
      d.actors.push({ obj: 'vehicle.car', layer: 'near', path: [[1860, ry + 72], [-260, ry + 72]], speed: 44, loop: 'loop', s: 1.2, seed: 79, offset: 0.6, flip: true, variant: 2 });
      d.actors.push({ obj: 'vehicle.bus', layer: 'near', path: [[-300, ry + 34], [1900, ry + 34]], speed: 36, loop: 'loop', s: 1.2, seed: 80, offset: 0.45 });
      d.actors.push({ obj: 'person.cyclist', layer: 'near', path: [[1800, ry + 82], [-200, ry + 82]], speed: 26, loop: 'loop', s: ppl(d, 'person.cyclist', ry + 82), seed: 81, offset: 0.25, flip: true });
      for (let i = 0; i < 6; i++) d.place.push({ obj: i % 2 ? 'tree.plane' : 'street.lamppost', x: -60 + i * 340, y: ry + 140, s: i % 2 ? 0.75 : 1.0, flip: i % 3 === 0, variant: i % 3, layer: 'fore', seed: 82 + i, anim: false });
      const wy = ry + 120;
      d.actors.push({ obj: 'person.shopper', layer: 'fore', path: [[-80, wy + 30], [1680, wy + 30]], speed: 10, loop: 'loop', s: ppl(d, 'person.shopper', wy + 30), seed: 88, offset: 0.2 });
      d.actors.push({ obj: 'person.dog-walker', layer: 'fore', path: [[1680, wy + 50], [-80, wy + 50]], speed: 9, loop: 'loop', s: ppl(d, 'person.dog-walker', wy + 50), seed: 89, offset: 0.65, flip: true });
      d.actors.push({ obj: 'person.buggy-walker', layer: 'mid', path: [[-80, fy + 30], [1680, fy + 34]], speed: 6, loop: 'loop', s: ppl(d, 'person.buggy-walker', fy + 30), seed: 90, offset: 0.4 });
      d.place.push({ obj: 'person.cafe-goer', x: lx + 260, y: fy + 20, s: ppl(d, 'person.cafe-goer', fy + 20), layer: 'mid', seed: 91, anim: false });
      d.scatter.push({ obj: { 'plant.grass': 3, 'plant.planter': 1, 'street.bollard': 1, 'street.bench': 0.6 }, layer: 'fore', seed: 92, area: { rect: [-150, ry + 100, 1750, 905] }, n: 120, minGap: 24, s: [0.6, 1.05], sByY: [[ry + 100, 0.8], [900, 1.2]], flip: 0.5, variant: [0, 1], anim: false });
      d.place.push({ obj: 'bird.pigeon', x: 540, y: wy + 60, s: 0.9, layer: 'fore', seed: 93 }, { obj: 'bird.pigeon', x: 590, y: wy + 66, s: 0.85, flip: true, variant: 1, layer: 'fore', seed: 94 });
    }
    d.scatter.push({ obj: { 'plant.grass': 4, 'plant.hedge': 0.6, 'plant.shrub': 0.4 }, layer: 'far', seed: 95, area: { rect: [-150, H + 40, 1750, fy - 10] }, n: 180, minGap: 12, s: [0.22, 0.6], sByY: [[H + 40, 0.8], [fy, 1.2]], flip: 0.5, variant: [0, 1], anim: false, mask: { avoid: lmBox } });
    landmark(d, p, Number.isFinite(p.lmy) ? p.lmy : (kind === 'station' ? fy - 12 : fy), p.lmlayer || 'mid');
    flocks(d, H, 96, false);
  }

  function build(p) {
    const form = p.form || 'canal';
    const d = base(p, form === 'station' || form === 'street' ? 'urban' : 'natural');
    if (form === 'tunnel') tunnel(p, d);
    else if (form === 'canal' || form === 'river') water(p, d, form === 'river');
    else if (form === 'fields') fields(p, d);
    else town(p, d, form);
    return finish(d);
  }
  const AT = ['afternoon', 'dawn', 'morning', 'day', 'noon', 'golden', 'sunset', 'dusk', 'night'];
  const params = { id: 'id', lat: 'number', lon: 'number', heading: 'number', horizon: 'number', at: AT, form: ['tunnel', 'canal', 'river', 'fields', 'station', 'street'], side: ['left', 'right'],
    landmark: 'string', lmx: 'number', lmy: 'number', lms: 'number', lmlayer: ['mid', 'far', 'near', 'fore', 'horizon'], vx: 'number', wy0: 'number', wy1: 'number', fronty: 'number', boatx: 'number', brx: 'number', signx: 'number', sign: 'sign', features: 'list' };
  return { build, params };
})();
(function () {
  if (typeof sceneArchetypeDefine !== 'function') return;
  sceneArchetypeDefine('hook-country', { params: _hookArch.params, signs: true, kits: ['temperate', 'water', 'birds', 'boats', 'people', 'urban', 'vehicles'], meta: () => null, build: (p, u) => _hookArch.build(p, u) });
})();
