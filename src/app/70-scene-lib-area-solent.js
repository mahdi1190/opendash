/* ============================================================
   SCENE LIBRARY: the Solent area kit (Portsmouth, Gosport, Southsea, Southampton and the
   Isle of Wight crossings; docs/dev/SCENE_ENGINE.md 2). PURE: sceneObjDefine calls only,
   every build runs lazily per variant (and season), memoised by the core.

   landmark.solent-spinnaker-tower   the 170 m sail-shaped observation tower at Gunwharf Quays:
                                     the bowed white sail of ribs between two arcing arms, the
                                     concrete column, the three viewing decks and the spire
   landmark.solent-hms-victory       the first-rate ship of the line in her dry dock at the
                                     Historic Dockyard: black and ochre bands, gunports, the stern
                                     galleries, three masts with yards and shrouds (no flags)
   boat.solent-cruise-liner          a large white cruise ship (unbranded): balconied decks, funnel
   boat.solent-car-ferry             an Isle of Wight car ferry: white, a dark band, the bridge
   boat.solent-hovercraft            the passenger hovercraft: a dark skirt, a white cabin, twin fans
   boat.solent-yacht                 a cruising yacht under sail (3 variants), heeling with the bob
   boat.solent-container-ship        a container ship: deep hull, stacked boxes, the aft house
   building.solent-dock-crane        a ship-to-shore container crane: gantry legs, the boom
   building.solent-containers        a stack of shipping containers (unlit)
   building.solent-storehouse        a Georgian brick dockyard storehouse with sash windows
   building.solent-harbour-fort      a round stone harbour tower on a curtain wall (Round Tower,
                                     Southsea Castle)
   building.solent-sea-fort          a round granite Solent sea fort standing in the water
   structure.solent-pier             a seaside pier: iron piles, the deck, a pavilion at its head
   building.solent-seafront-villa    a stucco seafront terrace house with bays and balconies
   All FACE RIGHT where they have a bow. Lit from the LEFT. Unbranded: no names, numbers,
   flags, ensigns, liveries or logos. Military history only as respectful architecture.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;
  const { f1, rect, ell, poly, define } = sceneDraw;
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];

  /* ---------- landmark.solent-spinnaker-tower ---------- */
  define({
    id: 'landmark.solent-spinnaker-tower', category: 'landmark', size: [200, 560], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      sail: ['#f4f6f8', '#d6dde4', '#b4c0cc'], arm: ['#ffffff', '#c8d2dc'], col: ['#c8c4bc', '#a8a49c', '#8a867e'],
      deck: ['#e8ecf0', '#9aa6b2'], glass: ['#3e5468', '#6a8aa6'], spire: ['#dfe4ea', '#9aa4ae'], base: ['#6a7078', '#4a5058'],
      led: ['#8ec8ff', '#ffffff'], beacon: '#ff5a4a',
    } },
    night: { glow: { window: '#ffe0a0', lamp: '#fff2c8' }, on: 0.9 },
    shadow: { rx: 70, ry: 10, h: 560 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk-area-coast/portsmouth', 'uk', 'portsmouth', 'tower', 'harbour', 'kit:urban', 'kit:water'],
    credit: 'native (Solent area kit)',
    build() {
      const b = [], lit = [];
      const top = -400;
      // the sail: outer arm x(t), front arm x(t), column x(t); t from 0 (ground) to 1 (the deck)
      const xo = t => -34 + 30 * t - 78 * Math.sin(Math.PI * Math.pow(t, 0.9));
      const xf = t => -6 + 10 * t - 40 * Math.sin(Math.PI * t);
      const xcL = t => 14 - 6 * t, xcR = t => 36 - 12 * t;
      const N = 40;
      const pts = (fx) => Array.from({ length: N + 1 }, (_, i) => [fx(i / N), top * i / N]);
      const outer = pts(xo), front = pts(xf), colL = pts(xcL), colR = pts(xcR);
      // the plinth and the base hall
      b.push(['@base.1', 'M-70 0h130v-8h-122z'], ['@base.0', rect(-60, -16, 110, 9)], { f: '@glass.0', d: rect(-54, -14, 30, 5) + rect(-16, -14, 26, 5), glow: 'window' });
      // the sail membrane: the bowed face between the outer arm and the column, shaded toward the column
      b.push(['@sail.1', poly(outer.concat(colL.slice().reverse()))]);
      b.push(['@sail.0', poly(outer.concat(front.slice().reverse()))]);
      b.push(['@sail.2', poly(front.concat(colL.slice().reverse())), 0.75]);
      // the ribs: bowed hoops across the sail (each one shape: the lint counts the structure)
      for (let i = 1; i < 26; i++) {
        const t = i / 26, y = top * t, x0 = xo(t), x1 = xcL(t), sag = 4 + 6 * Math.sin(Math.PI * t);
        b.push({ s: i % 2 ? '@sail.2' : '@arm.1', w: i % 2 ? 1.1 : 0.8, d: `M${f1(x0)} ${f1(y)}Q${f1((x0 + x1) / 2)} ${f1(y + sag)} ${f1(x1)} ${f1(y)}` });
      }
      // the two arms: white tubes, a lit edge on the left
      const line = a => 'M' + a.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L');
      b.push({ s: '@arm.1', w: 7, d: line(outer) }, { s: '@arm.0', w: 4, d: line(outer) });
      b.push({ s: '@arm.1', w: 5, d: line(front) }, { s: '@arm.0', w: 2.6, d: line(front) });
      // the column: concrete, a lit face and a shaded face, the lift shaft line, rings of fixings
      b.push(['@col.0', poly(colL.concat(colR.slice().reverse()))], ['@col.1', poly(colL.map(p => [p[0] + 12 - 4 * (-p[1] / 400), p[1]]).concat(colR.slice().reverse()))]);
      b.push({ s: '@col.2', w: 1, d: 'M25 0L24 -400' });
      for (let i = 1; i < 12; i++) { const t = i / 12; b.push({ s: '@col.2', w: 0.8, op: 0.6, d: `M${f1(xcL(t))} ${f1(top * t)}H${f1(xcR(t))}` }); }
      // the viewing decks: three stacked discs with glazing (each window bay a glow shape)
      const decks = [[-400, 54, 16], [-418, 50, 14], [-434, 44, 12]];
      decks.forEach(([y, w, h], k) => {
        b.push(['@deck.1', `M${f1(-w / 2 + 8)} ${y}h${w}l-4 ${-h}h${-w + 8}z`]);
        b.push(['@deck.0', `M${f1(-w / 2 + 8)} ${y}h${w}l-1 -3h${-w + 2}z`]);
        for (let j = 0; j < 6; j++) b.push({ f: j % 2 ? '@glass.0' : '@glass.1', d: rect(-w / 2 + 12 + j * (w - 12) / 6, y - h + 3, (w - 12) / 6 - 1.5, h - 6), glow: 'window' });
        b.push({ s: '@deck.1', w: 0.8, d: `M${f1(-w / 2 + 10)} ${y - h}h${w - 4}` });
        if (k === 0) b.push(['@deck.1', 'M-8 -400l-10 10h56l-6 -10z', 0.6]);
      });
      // the crown and the spire
      b.push(['@spire.0', 'M8 -436L28 -436L22 -470L14 -470z'], ['@spire.1', 'M20 -436L28 -436L22 -470L18 -470z']);
      b.push(['@spire.0', 'M14 -470L22 -470L19 -556L17 -556z'], ['@spire.1', 'M18 -470L22 -470L19 -556L18 -556z']);
      for (let i = 0; i < 8; i++) b.push({ s: '@spire.1', w: 0.6, d: `M${f1(14 + i * 0.4)} ${-474 - i * 10}h${f1(8 - i * 0.8)}` });
      b.push({ f: '@beacon', d: ell(18, -558, 2.2, 2.2), glow: 'lamp' });
      // night: the arms traced in light, the sail washed blue, the column edge lit
      lit.push({ s: '@led.0', w: 2.2, op: 0.9, d: line(outer) }, { s: '@led.0', w: 1.6, op: 0.8, d: line(front) });
      lit.push(['@led.0', poly(outer.concat(colL.slice().reverse())), 0.18]);
      lit.push({ s: '@led.1', w: 1.4, op: 0.7, d: 'M14 -436L17 -556' }, ['@led.1', ell(18, -558, 6, 6), 0.35]);
      return { body: b, lit };
    },
  });

  /* ---------- landmark.solent-hms-victory ---------- */
  define({
    id: 'landmark.solent-hms-victory', category: 'landmark', size: [460, 330], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      hull: ['#22242a', '#16181c', '#3a3c42'], band: ['#d8a84a', '#b88a36'], port: ['#1a1a1e'], stern: ['#c89a48', '#8a6a2e'],
      mast: ['#6a4e30', '#4a3420'], yard: ['#3a2a1a'], sailF: ['#e8e0cc', '#c8bea6'], rig: ['#2a2420'], dock: ['#a8a090', '#8a8272', '#c4bcaa'],
      glass: ['#4a3a24', '#7a6440'], lamp: '#ffd890', flood: ['#ffe4b0'],
    } },
    night: { glow: { window: '#ffcf80', lamp: '#ffe2a0' }, on: 0.9 },
    shadow: { rx: 200, ry: 14, h: 300 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk-area-coast/historic-dockyard', 'uk', 'portsmouth', 'ship', 'heritage', 'kit:urban', 'kit:water'],
    credit: 'native (Solent area kit)',
    build() {
      const b = [], lit = [];
      // the dry dock: stone steps (altars) either side, the ship's keel below the quay line (0)
      b.push(['@dock.1', 'M-230 0H230V22H-230z'], ['@dock.0', 'M-230 0H230V4H-230z']);
      for (let i = 0; i < 5; i++) b.push({ s: '@dock.2', w: 1, op: 0.7, d: `M-230 ${6 + i * 3.6}H230` });
      // the hull: a long sheer, the tumblehome, the beak head at the bow (right), the stern (left)
      const hull = 'M-196 -86Q-200 -40 -176 8H170Q196 -30 206 -64L196 -70Q120 -60 0 -62Q-110 -66 -190 -96z';
      b.push(['@hull.0', hull], ['@hull.1', 'M-178 4H168L178 -10H-186z']);
      // the ochre bands at the gun decks, the gunports on them (the chequer)
      const bands = [[-74, -66, 6], [-48, -42, 6], [-24, -18, 5]];
      bands.forEach(([y0], k) => {
        b.push(['@band.0', `M${-190 + k * 4} ${y0}Q0 ${y0 + 6} ${196 - k * 4} ${y0 - 6}v7Q0 ${y0 + 13} ${-190 + k * 4} ${y0 + 7}z`]);
        let d = '';
        for (let i = 0; i < 16 - k; i++) { const x = -168 + k * 6 + i * (22 - k * 0.6), y = y0 + 1.5 + (x / 196) * -3 + 2.5; d += rect(x, y, 7, 5); }
        b.push(['@port', d]);
      });
      b.push(['@band.1', 'M-188 -70Q0 -60 194 -76v2Q0 -58 -188 -68z', 0.7]);
      // the stern galleries: tiers of windows, gilded rails (glow)
      b.push(['@stern.1', 'M-206 -110L-190 -60L-176 -60L-188 -112z'], ['@stern.0', 'M-210 -114H-184V-108H-210z']);
      for (let r = 0; r < 3; r++) for (let i = 0; i < 3; i++) b.push({ f: (r + i) % 2 ? '@glass.0' : '@glass.1', d: rect(-202 + r * 3 + i * 5, -104 + r * 15, 4, 9), glow: 'window' });
      b.push({ s: '@stern.0', w: 1.2, d: 'M-206 -94H-186M-203 -79H-184M-200 -64H-182' });
      // the beak head, bowsprit and jib boom
      b.push(['@band.1', 'M190 -72L214 -88L218 -80L198 -64z'], { s: '@mast.1', w: 4, d: 'M196 -78L300 -138' }, { s: '@mast.1', w: 2.4, d: 'M290 -132L340 -162' });
      // the masts: fore (right), main, mizzen (left); tops, topmasts, topgallants
      const masts = [[110, 280], [10, 300], [-110, 236]];
      masts.forEach(([x, h], k) => {
        b.push({ s: '@mast.0', w: 6, d: `M${x} -64V${-64 - h * 0.45}` }, { s: '@mast.0', w: 4, d: `M${x} ${-64 - h * 0.43}V${-64 - h * 0.76}` }, { s: '@mast.1', w: 2.4, d: `M${x} ${-64 - h * 0.74}V${-64 - h}` });
        b.push(['@mast.1', rect(x - 12, -64 - h * 0.46, 24, 4)], ['@mast.1', rect(x - 8, -64 - h * 0.77, 16, 3)]);
        // the yards: four per mast (fewer on the mizzen), with furled sails along them
        const ys = [0.3, 0.52, 0.8, 0.94].slice(0, k === 2 ? 3 : 4);
        ys.forEach((t, j) => {
          const y = -64 - h * t, w = (k === 2 ? 70 : 92) * (1 - t * 0.55);
          b.push({ s: '@yard', w: 2.6 - j * 0.4, d: `M${f1(x - w)} ${f1(y)}H${f1(x + w)}` });
          b.push(['@sailF.0', `M${f1(x - w + 4)} ${f1(y + 1)}Q${x} ${f1(y + 6)} ${f1(x + w - 4)} ${f1(y + 1)}z`], ['@sailF.1', `M${f1(x - w + 6)} ${f1(y + 3)}Q${x} ${f1(y + 6)} ${f1(x + w - 6)} ${f1(y + 3)}z`, 0.8]);
        });
        // the shrouds: fans from the channels to the tops, with ratlines
        let sh = '';
        for (let i = 0; i < 5; i++) sh += `M${x - 20 + i * 2} -70L${x - 8} ${f1(-64 - h * 0.45)}M${x + 20 - i * 2} -70L${x + 8} ${f1(-64 - h * 0.45)}`;
        b.push({ s: '@rig', w: 0.7, op: 0.8, d: sh });
        let rl = '';
        for (let i = 1; i < 7; i++) { const y = -70 - i * (h * 0.45 - 6) / 7, k2 = i / 7; rl += `M${f1(x - 20 + 12 * k2)} ${f1(y)}H${f1(x - 8 + 0 * k2)}M${f1(x + 8)} ${f1(y)}H${f1(x + 20 - 12 * k2)}`; }
        b.push({ s: '@rig', w: 0.5, op: 0.6, d: rl });
      });
      // the stays between the mastheads and down to the bowsprit
      b.push({ s: '@rig', w: 0.8, op: 0.8, d: 'M-110 -300L10 -330M10 -364L110 -344M110 -344L320 -150M110 -280L240 -112M10 -300L110 -190M-110 -240L-196 -90' });
      // the stern lanterns and the quay lamps (glow); the floodlit night wash
      b.push({ f: '@lamp', d: ell(-208, -124, 3, 4), glow: 'lamp' }, { f: '@lamp', d: ell(-196, -128, 2.4, 3.2), glow: 'lamp' });
      b.push({ s: '@rig', w: 1.4, d: 'M-226 0V-30M226 0V-30' }, { f: '@lamp', d: ell(-226, -32, 2.4, 2.4), glow: 'lamp' }, { f: '@lamp', d: ell(226, -32, 2.4, 2.4), glow: 'lamp' });
      lit.push(['@flood.0', 'M-200 -96Q0 -70 200 -76V6H-180z', 0.22], ['@flood.0', ell(10, -200, 120, 120), 0.08]);
      return { body: b, lit };
    },
  });

  /* ---------- boat.solent-cruise-liner ---------- */
  define({
    id: 'boat.solent-cruise-liner', category: 'boat', size: [720, 200], variants: 2, seasonal: false, flippable: true, parts: ['body'],
    palette: { base: {
      hull: ['#f6f8fa', '#d8dee4', '#b0bac4'], band: ['#1e2a3c', '#2a3a54'], keel: ['#7a2a24', '#1a2230'], glass: ['#3a4c62', '#5c7896'],
      balc: ['#c4ccd6'], funnel: ['#eef1f4', '#2a3240'], wake: '#f4fbfc', boat: '#f0a020', lamp: '#fff2c8',
    } },
    night: { glow: { window: '#ffe2a8', lamp: '#fff2c8' }, on: 0.8 },
    anim: { bob: { part: '*', dy: 0.8, period: 7 } },
    reflect: true,
    tags: ['harbour', 'cruise', 'liner', 'ship', 'boat', 'signature', 'kit:boats', 'kit:water', 'role:boat'],
    credit: 'native (Solent area kit)',
    build(v, rnd) {
      const b = [];
      b.push({ s: '@wake', w: 2, op: 0.5, d: 'M-380 4h300M120 6h180M300 2Q340 -2 370 4' });
      // the hull: a raked bow on the right, a transom stern, the boot topping
      b.push(['@hull.0', 'M-350 -70H300Q350 -70 362 -56L340 0H-344z'], [`@keel.${v}`, 'M-344 -10H346L340 0H-344z'], ['@band.0', 'M-350 -40H354l-2 6H-350z']);
      // the superstructure: tiers stepping back at both ends
      const tiers = [[-70, -330, 320], [-92, -310, 300], [-114, -290, 270], [-136, -250, 230], [-156, -200, 170], [-174, -120, 90]];
      const r = rnd;
      tiers.forEach(([y, x0, x1], k) => {
        b.push([k % 2 ? '@hull.0' : '@hull.1', `M${x0} ${y}V${y - 22}H${x1 - 6}Q${x1 + 6} ${y - 22} ${x1 + 10} ${y}z`]);
        // the window rows: two glow groups per tier
        const cells = [];
        for (let x = x0 + 8; x < x1 - 8; x += 9) cells.push([x, y - 15, 6, 7]);
        const g = sceneDraw.winGroups(r, cells, 2);
        b.push({ f: '@glass.0', d: g[0], glow: 'window' }, { f: '@glass.1', d: g[1], glow: 'window' });
        if (k < 3) b.push({ s: '@balc', w: 0.8, d: `M${x0 + 4} ${y - 6}H${x1 - 4}` });
      });
      // the hull's cabin rows (portholes) and the lifeboats along the promenade deck
      const cells = [];
      for (let x = -330; x < 320; x += 11) cells.push([x, -60, 5, 4]);
      const g = sceneDraw.winGroups(r, cells, 2);
      b.push({ f: '@glass.0', d: g[0], glow: 'window' }, { f: '@glass.1', d: g[1], glow: 'window' });
      let boats = '';
      for (let x = -280; x < 240; x += 34) boats += `M${x} -98h24q2 6 -3 8h-18q-5 -2 -3 -8z`;
      b.push(['@boat', boats]);
      // the bridge wings and the funnel
      b.push(['@hull.1', 'M200 -176H262V-170H200z'], { f: '@glass.0', d: rect(204, -174, 52, 3), glow: 'window' });
      b.push(['@funnel.0', 'M-150 -174L-140 -218H-94L-96 -174z'], ['@funnel.1', 'M-140 -218H-94L-95 -210H-141z'], ['@hull.2', 'M-118 -174L-110 -218H-94L-96 -174z', 0.5]);
      b.push({ s: '@band.1', w: 1.2, d: 'M-60 -196V-226M-60 -222H-40' }, { f: '@lamp', d: ell(-60, -228, 1.8, 1.8), glow: 'lamp' }, { f: '@lamp', d: ell(350, -64, 2, 2), glow: 'lamp' });
      return { body: b };
    },
  });

  /* ---------- boat.solent-car-ferry ---------- */
  define({
    id: 'boat.solent-car-ferry', category: 'boat', size: [300, 110], variants: 2, seasonal: false, flippable: true, parts: ['body'],
    palette: { base: {
      hull: ['#f4f6f6', '#d4dadf', '#a6b0b8'], band: ['#1e3e74', '#a42a2a'], glass: ['#2e3e50', '#56708a'], deck: '#8a949c', funnel: ['#e8ecee', '#1e2a38'], wake: '#f4fbfc', lamp: '#fff2c8',
    } },
    night: { glow: { window: '#ffe0a0', lamp: '#fff2c8' }, on: 0.85 },
    anim: { bob: { part: '*', dy: 1.2, period: 5.2 } },
    reflect: true,
    tags: ['harbour', 'ferry', 'car ferry', 'boat', 'signature', 'kit:boats', 'kit:water', 'role:boat'],
    credit: 'native (Solent area kit)',
    build(v) {
      const b = [];
      b.push({ s: '@wake', w: 2, op: 0.55, d: 'M-170 3h120M60 5h90M140 0Q150 -4 162 2' });
      b.push(['@hull.1', 'M-146 -34H134Q148 -34 154 -24L146 0H-142L-150 -24z'], [`@band.${v}`, 'M-148 -14H150l-2 6H-146z'], ['@hull.2', 'M-142 -6H148L146 0H-142z']);
      // the car deck opening and the vehicle decks
      b.push(['@hull.0', 'M-136 -34V-58H128Q138 -58 140 -44L142 -34z'], ['@deck', rect(-128, -30, 250, 10), 0.6]);
      const cells = [];
      for (let x = -124; x < 122; x += 12) cells.push([x, -52, 8, 8]);
      const g = sceneDraw.winGroups(sceneRnd(17 + v), cells, 2);
      b.push({ f: '@glass.0', d: g[0], glow: 'window' }, { f: '@glass.1', d: g[1], glow: 'window' });
      b.push(['@hull.0', 'M-80 -58V-76H70Q80 -76 82 -66L84 -58z'], { f: '@glass.0', d: rect(-74, -72, 140, 6), glow: 'window' });
      b.push(['@hull.1', 'M20 -76V-88H70V-76z'], { f: '@glass.1', d: rect(24, -86, 42, 5), glow: 'window' });
      b.push(['@funnel.0', 'M-50 -76L-46 -96H-28L-30 -76z'], ['@funnel.1', 'M-46 -96H-28L-28.5 -92H-46.5z']);
      b.push({ s: '@deck', w: 1, d: 'M46 -88V-104M40 -98H52' }, { f: '@lamp', d: ell(46, -105, 1.6, 1.6), glow: 'lamp' }, { s: '@hull.2', w: 0.8, op: 0.6, d: 'M-136 -58H136' });
      return { body: b };
    },
  });

  /* ---------- boat.solent-hovercraft ---------- */
  define({
    id: 'boat.solent-hovercraft', category: 'boat', size: [130, 52], variants: 1, seasonal: false, flippable: true, parts: ['body'],
    palette: { base: { skirt: ['#22262c', '#3a4048'], cabin: ['#f4f6f8', '#c8d0d8'], band: '#1e6aa8', glass: ['#2a3a4c', '#4e6a86'], fan: ['#3a4048', '#e04a2a'], spray: '#f4fbfc', lamp: '#fff2c8' } },
    night: { glow: { window: '#ffe0a0', lamp: '#fff2c8' }, on: 0.9 },
    anim: { bob: { part: '*', dy: 1.4, period: 1.6 } },
    reflect: true,
    tags: ['harbour', 'hovercraft', 'boat', 'signature', 'kit:boats', 'kit:water', 'role:boat'],
    credit: 'native (Solent area kit)',
    build() {
      const b = [];
      b.push(['@spray', 'M-70 2Q-40 -10 -10 2Q20 -8 60 2Q70 6 -70 6z', 0.7]);
      b.push(['@skirt.0', 'M-62 0Q-66 -12 -56 -16H54Q66 -12 62 0z'], ['@skirt.1', 'M-60 -12H58v3H-60z']);
      b.push(['@cabin.0', 'M-52 -16V-30Q-40 -36 30 -36Q48 -34 56 -16z'], ['@band', 'M-52 -20H56l-1 3H-52z']);
      b.push({ f: '@glass.0', d: rect(-44, -31, 8, 6) + rect(-32, -31, 8, 6) + rect(-20, -31, 8, 6), glow: 'window' }, { f: '@glass.1', d: rect(-8, -31, 8, 6) + rect(4, -31, 8, 6) + 'M20 -31h14l8 6h-22z', glow: 'window' });
      // the twin ducted fans and fins at the stern (left)
      b.push(['@fan.0', 'M-58 -30h18v-18h-18z'], ['@fan.0', 'M-36 -30h14v-16h-14z'], { s: '@fan.1', w: 1.2, d: 'M-49 -48V-30M-29 -46V-30' });
      b.push(['@cabin.1', 'M-60 -48H-38V-50H-60z'], { f: '@lamp', d: ell(54, -20, 1.6, 1.6), glow: 'lamp' }, { f: '@fan.1', d: ell(-49, -50, 1.4, 1.4), glow: 'lamp' });
      return { body: b };
    },
  });

  /* ---------- boat.solent-yacht ---------- */
  define({
    id: 'boat.solent-yacht', category: 'boat', size: [90, 130], variants: 3, seasonal: false, flippable: true, parts: ['body'],
    palette: { base: { hull: ['#f6f6f2', '#1e2a44', '#8a2a24'], hullD: ['#c8ccd0', '#141c2e', '#5e1c18'], sail: ['#fbfaf4', '#e8e6dc'], jib: ['#f2f0e6', '#d84a2a', '#2a6aa8'], mast: '#5a6068', wake: '#f4fbfc', lamp: '#fff2c8' } },
    night: { glow: { lamp: '#fff2c8', window: '#ffe0a0' }, on: 1 },
    anim: { bob: { part: '*', dy: 1.6, period: 3.4 } },
    reflect: true,
    tags: ['harbour', 'yacht', 'sailing', 'boat', 'kit:boats', 'kit:water', 'role:boat'],
    credit: 'native (Solent area kit)',
    build(v) {
      const b = [];
      b.push({ s: '@wake', w: 1.6, op: 0.6, d: 'M-48 2h30M20 3h26' });
      b.push([`@hull.${v}`, 'M-40 -10H34Q42 -10 46 -6L38 0H-36z'], [`@hullD.${v}`, 'M-38 -3H42L38 0H-36z']);
      b.push({ s: '@mast', w: 1.6, d: 'M-2 -10V-124' }, { s: '@mast', w: 1.2, d: 'M-2 -24H-34' });
      b.push(['@sail.0', 'M0 -122Q20 -70 30 -14H0z'], ['@sail.1', 'M0 -122Q12 -70 16 -14H0z', 0.5]);
      b.push([`@jib.${v}`, 'M-4 -116L-36 -16H-6z'], { s: '@sail.1', w: 0.6, op: 0.7, d: 'M2 -96L20 -94M2 -70L25 -68M2 -44L28 -42' });
      b.push({ f: '@lamp', d: ell(-2, -126, 1.4, 1.4), glow: 'lamp' }, { f: '@lamp', d: rect(-20, -16, 14, 3), glow: 'window' });
      return { body: b };
    },
  });

  /* ---------- boat.solent-container-ship ---------- */
  define({
    id: 'boat.solent-container-ship', category: 'boat', size: [640, 170], variants: 2, seasonal: false, flippable: true, parts: ['body'],
    palette: { base: {
      hull: ['#2a3a4a', '#6a2a24'], hullD: ['#1a2430', '#44181a'], keel: '#9a2a22', house: ['#f2f2ee', '#c8ccd0'], glass: ['#2e3e50', '#4e6680'],
      box: ['#b8402a', '#2a6a9a', '#d8a030', '#4a7a4a', '#8a8e92', '#e6e2d8', '#6a4a8a', '#1e5a7a'], wake: '#f4fbfc', lamp: '#fff2c8',
    } },
    night: { glow: { window: '#ffe0a0', lamp: '#fff2c8' }, on: 0.85 },
    anim: { bob: { part: '*', dy: 0.6, period: 8 } },
    reflect: true,
    tags: ['harbour', 'container ship', 'ship', 'boat', 'kit:boats', 'kit:water', 'role:boat'],
    credit: 'native (Solent area kit)',
    build(v, rnd) {
      const b = [];
      b.push({ s: '@wake', w: 2, op: 0.5, d: 'M-340 4h260M200 4h120M290 0Q310 -4 330 2' });
      b.push([`@hull.${v}`, 'M-310 -60H276Q310 -64 322 -50L300 0H-300L-314 -30z'], [`@hullD.${v}`, 'M-306 -14H310L300 0H-300z'], ['@keel', 'M-302 -6H306L300 0H-300z']);
      // the boxes: bays of stacks, each container its own shape so the stack reads as boxes
      const r = rnd;
      for (let bay = 0; bay < 15; bay++) {
        const x = -200 + bay * 32, tiers = 3 + Math.floor(r() * 3);
        for (let t = 0; t < tiers; t++) b.push([`@box.${Math.floor(r() * 8)}`, rect(x, -72 - t * 13, 30, 12)]);
        b.push({ s: '@hullD.0', w: 0.5, op: 0.5, d: `M${x + 15} -60V${-60 - tiers * 13}` });
      }
      // the aft accommodation house with its bridge (left), the funnel
      b.push(['@house.0', 'M-290 -60V-150H-226V-60z'], ['@house.1', 'M-240 -150H-226V-60H-240z'], ['@house.0', 'M-300 -150H-216V-158H-300z']);
      const cells = [];
      for (let y = -144; y < -66; y += 12) for (let x = -284; x < -232; x += 10) cells.push([x, y, 6, 6]);
      const g = sceneDraw.winGroups(r, cells, 2);
      b.push({ f: '@glass.0', d: g[0], glow: 'window' }, { f: '@glass.1', d: g[1], glow: 'window' }, { f: '@glass.0', d: rect(-298, -156, 80, 4), glow: 'window' });
      b.push(['@hullD.0', 'M-220 -60L-214 -110H-198L-200 -60z'], { f: '@lamp', d: ell(312, -66, 1.8, 1.8), glow: 'lamp' }, { s: '@house.1', w: 1, d: 'M-260 -158V-176' }, { f: '@lamp', d: ell(-260, -177, 1.6, 1.6), glow: 'lamp' });
      return { body: b };
    },
  });

  /* ---------- building.solent-dock-crane ---------- */
  define({
    id: 'building.solent-dock-crane', category: 'building', size: [300, 330], variants: 2, seasonal: false, flippable: true, parts: ['body'],
    palette: { base: { steel: ['#d8dce0', '#3a7aa8'], steelD: ['#9aa2aa', '#2a5878'], cab: ['#e8a030', '#f2f2ee'], glass: ['#2e3e50'], lamp: '#fff2c8', cable: '#3a4048' } },
    night: { glow: { window: '#ffe0a0', lamp: '#fff4d0' }, on: 1 },
    shadow: { rx: 90, ry: 8, h: 300 },
    reflect: true,
    tags: ['harbour', 'docks', 'crane', 'signature', 'kit:urban', 'kit:water', 'role:building-mid'],
    credit: 'native (Solent area kit)',
    build(v) {
      const b = [], s = `@steel.${v}`, sd = `@steelD.${v}`;
      // the gantry: two pairs of legs, the portal beam, the sill beam
      b.push({ s: sd, w: 7, d: 'M-60 0V-170M40 0V-170' }, { s, w: 6, d: 'M-56 0V-170M44 0V-170' });
      b.push({ s: sd, w: 3, d: 'M-56 -60L44 -150M44 -60L-56 -150' }, [s, rect(-70, -182, 126, 14)], [sd, rect(-70, -170, 126, 3)]);
      b.push([sd, rect(-74, -6, 30, 6)], [sd, rect(26, -6, 30, 6)]);
      // the A-frame and the boom reaching out over the water (right) and the back-reach (left)
      b.push({ s, w: 5, d: 'M-50 -182L-10 -290L30 -182' }, { s: sd, w: 2, d: 'M-10 -290L150 -200M-10 -290L-110 -210' });
      b.push([s, 'M-130 -200H150V-212H-130z'], [sd, 'M-130 -200H150V-203H-130z']);
      let lat = '';
      for (let x = -124; x < 146; x += 14) lat += `M${x} -212l7 12l7 -12`;
      b.push({ s: sd, w: 1, d: lat });
      b.push([`@cab.${v}`, rect(60, -200, 20, 18)], { f: '@glass.0', d: rect(63, -196, 14, 7), glow: 'window' }, ['@cab.0', rect(-128, -226, 40, 14)]);
      b.push({ s: '@cable', w: 0.8, d: 'M70 -182V-80' }, ['@cable', rect(62, -82, 16, 6)]);
      b.push({ f: '@lamp', d: ell(-10, -294, 2, 2), glow: 'lamp' }, { f: '@lamp', d: ell(148, -214, 2, 2), glow: 'lamp' }, { f: '@lamp', d: ell(-128, -214, 2, 2), glow: 'lamp' }, { f: '@lamp', d: ell(-6, -186, 2.4, 2.4), glow: 'lamp' });
      return { body: b };
    },
  });

  /* ---------- building.solent-containers ---------- */
  define({
    id: 'building.solent-containers', category: 'building', size: [200, 60], variants: 3, seasonal: false, flippable: true, parts: ['body'],
    palette: { base: { box: ['#b8402a', '#2a6a9a', '#d8a030', '#4a7a4a', '#8a8e92', '#e6e2d8', '#6a4a8a', '#1e5a7a'], rib: '#1a2028' } },
    shadow: { rx: 100, ry: 6, h: 60 },
    tags: ['harbour', 'docks', 'containers', 'unlit', 'kit:urban', 'kit:water', 'role:building-near'],
    credit: 'native (Solent area kit)',
    build(v, rnd) {
      const b = [], r = rnd;
      for (let c = 0; c < 4; c++) {
        const tiers = 1 + Math.floor(r() * 3) + (v === 2 ? 1 : 0);
        for (let t = 0; t < tiers; t++) {
          const x = -100 + c * 50, y = -(t + 1) * 19;
          b.push([`@box.${Math.floor(r() * 8)}`, rect(x, y, 48, 18)]);
          let ribs = '';
          for (let i = 1; i < 8; i++) ribs += `M${x + i * 6} ${y + 1}v16`;
          b.push({ s: '@rib', w: 0.6, op: 0.35, d: ribs });
        }
      }
      return { body: b };
    },
  });

  /* ---------- building.solent-storehouse ---------- */
  define({
    id: 'building.solent-storehouse', category: 'building', size: [360, 150], variants: 2, seasonal: false, flippable: true, parts: ['body'],
    palette: { base: { brick: ['#a4553c', '#8a4630', '#b86a4e'], roof: ['#4a5058', '#5e646c'], stone: ['#e0d6c0'], glass: ['#2e3a46', '#4a5a6a'], door: '#2a3a30', lamp: '#fff0c0' } },
    night: { glow: { window: '#ffd890', lamp: '#ffe8b0' }, on: 0.6 },
    shadow: { rx: 180, ry: 10, h: 150 },
    reflect: true,
    tags: ['harbour', 'dockyard', 'georgian', 'brick', 'kit:urban', 'kit:water', 'role:building-mid'],
    credit: 'native (Solent area kit)',
    build(v, rnd) {
      const b = [], W = 180, H = v ? 104 : 120;
      b.push(['@brick.0', rect(-W, -H, W * 2, H)], ['@brick.1', rect(W - 40, -H, 40, H)]);
      b.push(['@roof.0', `M${-W - 4} ${-H}L${-W + 20} ${-H - 26}H${W - 20}L${W + 4} ${-H}z`], ['@roof.1', `M${W - 30} ${-H - 26}H${W - 20}L${W + 4} ${-H}H${W - 6}z`]);
      b.push(['@stone.0', rect(-W, -H, W * 2, 4)], ['@stone.0', rect(-W, -H * 0.5, W * 2, 2.5)]);
      let courses = '';
      for (let y = -H + 10; y < 0; y += 8) courses += `M${-W} ${y}H${W}`;
      b.push({ s: '@brick.2', w: 0.6, op: 0.35, d: courses });
      const cells = [];
      for (let row = 0; row < (v ? 3 : 4); row++) for (let x = -W + 14; x < W - 14; x += 24) cells.push([x, -H + 12 + row * 27, 10, 16]);
      const g = sceneDraw.winGroups(rnd, cells, 3);
      b.push({ f: '@glass.0', d: g[0], glow: 'window' }, { f: '@glass.1', d: g[1], glow: 'window' }, { f: '@glass.0', d: g[2], glow: 'window' });
      b.push(['@stone.0', rect(-22, -38, 44, 38)], ['@door', 'M-16 0V-28Q0 -38 16 -28V0z'], { f: '@lamp', d: ell(-28, -40, 2, 2), glow: 'lamp' }, { f: '@lamp', d: ell(28, -40, 2, 2), glow: 'lamp' });
      // chimneys and the clock-less cupola on the long variant
      b.push(['@brick.1', rect(-120, -H - 40, 10, 20)], ['@brick.1', rect(110, -H - 40, 10, 20)]);
      if (!v) b.push(['@stone.0', rect(-10, -H - 46, 20, 20)], ['@roof.0', `M-14 ${-H - 46}L0 ${-H - 62}L14 ${-H - 46}z`]);
      return { body: b };
    },
  });

  /* ---------- building.solent-harbour-fort ---------- */
  define({
    id: 'building.solent-harbour-fort', category: 'building', size: [300, 150], variants: 2, seasonal: true, flippable: true, parts: ['body'],
    palette: sceneDraw.seasons({ moss: { spring: '#6a8a44', summer: '#5a7a3a', autumn: '#7a6a3a', winter: '#7a8070' } }),
    night: { glow: { window: '#ffd890', lamp: '#ffe8b0' }, on: 1 },
    shadow: { rx: 150, ry: 10, h: 150 },
    reflect: true,
    tags: ['harbour', 'fort', 'stone', 'heritage', 'signature', 'kit:urban', 'kit:water', 'role:building-mid'],
    credit: 'native (Solent area kit)',
    build(v) {
      const b = [];
      const stone = ['#c8bea8', '#a89e88', '#8a8070', '#e0d8c4'];
      // the curtain wall with its walkway and embrasures
      b.push([stone[1], 'M-150 0V-52H150V0z'], [stone[3], rect(-150, -56, 300, 5)], ['@moss', rect(-150, -6, 300, 6), 0.7]);
      let crenel = '';
      for (let x = -146; x < 146; x += 16) crenel += rect(x, -64, 9, 8);
      b.push([stone[0], crenel]);
      let joints = '';
      for (let y = -46; y < 0; y += 9) joints += `M-150 ${y}H150`;
      b.push({ s: stone[2], w: 0.6, op: 0.4, d: joints });
      // the round tower (left of centre on v0, right on v1): a lit and a shaded half, string course, parapet
      const tx = v ? 70 : -60, R = 46, H = 120;
      b.push([stone[0], `M${tx - R} 0V${-H}H${tx + R}V0z`], [stone[2], `M${tx + R * 0.35} 0V${-H}H${tx + R}V0z`, 0.55]);
      b.push([stone[3], rect(tx - R - 4, -H - 4, 2 * R + 8, 6)]);
      let cr2 = '';
      for (let i = 0; i < 7; i++) cr2 += rect(tx - R - 2 + i * 14, -H - 14, 8, 10);
      b.push([stone[1], cr2]);
      let tj = '';
      for (let y = -H + 10; y < 0; y += 10) tj += `M${tx - R} ${y}Q${tx} ${y + 4} ${tx + R} ${y}`;
      b.push({ s: stone[2], w: 0.6, op: 0.45, d: tj });
      b.push({ f: '#2a3038', d: rect(tx - 6, -H + 30, 8, 14) + rect(tx - 6, -H + 70, 8, 14), glow: 'window' }, { f: '#2a3038', d: rect(tx - 30, -90, 7, 12), glow: 'window' }, { f: '#2a3038', d: rect(tx + 22, -60, 7, 12), glow: 'window' });
      b.push({ s: '#3a3a3a', w: 1.2, d: `M${tx + 36} ${-H - 4}V${-H - 34}` }, { f: '#fff0c0', d: ell(tx + 36, -H - 36, 2.2, 2.2), glow: 'lamp' });
      b.push({ s: '#3a3a3a', w: 1, d: 'M120 -56V-80M-130 -56V-80' }, { f: '#fff0c0', d: ell(120, -82, 2, 2), glow: 'lamp' }, { f: '#fff0c0', d: ell(-130, -82, 2, 2), glow: 'lamp' });
      return { body: b };
    },
  });

  /* ---------- building.solent-sea-fort ---------- */
  define({
    id: 'building.solent-sea-fort', category: 'building', size: [240, 120], variants: 1, seasonal: false, flippable: false, parts: ['body'],
    palette: { base: { granite: ['#9a9a94', '#7a7a74', '#b8b6ae', '#5e5e58'], iron: ['#3a3e44', '#5a5e64'], glass: ['#2a3038'], lamp: '#fff0c0', weed: '#3a4a30' } },
    night: { glow: { window: '#ffd890', lamp: '#ffe8b0' }, on: 0.8 },
    reflect: true,
    tags: ['sea', 'fort', 'solent', 'heritage', 'signature', 'kit:urban', 'kit:water', 'role:building-mid'],
    credit: 'native (Solent area kit)',
    build() {
      const b = [], R = 116, H = 70;
      b.push(['@weed', `M${-R} 0Q0 8 ${R} 0V-6H${-R}z`]);
      b.push(['@granite.0', `M${-R} 0V${-H}Q0 ${-H - 12} ${R} ${-H}V0Q0 8 ${-R} 0z`], ['@granite.1', `M${R * 0.4} ${-H - 6}Q${R * 0.8} ${-H - 3} ${R} ${-H}V0Q${R * 0.7} 4 ${R * 0.4} 6z`, 0.6]);
      let courses = '';
      for (let y = -H + 8; y < 0; y += 8) courses += `M${-R} ${y}Q0 ${y + 6} ${R} ${y}`;
      b.push({ s: '@granite.3', w: 0.6, op: 0.4, d: courses });
      // two tiers of iron-shuttered casements around the drum
      for (let tier = 0; tier < 2; tier++) {
        let d = '';
        for (let i = 0; i < 11; i++) { const a = -1.3 + i * 0.26, x = Math.sin(a) * R * 0.94, w = 9 * Math.cos(a) + 2; d += rect(x - w / 2, -H + 14 + tier * 26 + Math.cos(a) * 3, w, 9); }
        b.push(['@iron.0', d]);
      }
      // the roof: the parapet, the central lighthouse turret and huts
      b.push(['@granite.2', `M${-R + 4} ${-H}Q0 ${-H - 14} ${R - 4} ${-H}v-6Q0 ${-H - 20} ${-R + 4} ${-H - 6}z`]);
      b.push(['@granite.2', rect(-10, -H - 34, 20, 26)], ['@iron.1', `M-14 ${-H - 34}L0 ${-H - 46}L14 ${-H - 34}z`], { f: '@lamp', d: rect(-6, -H - 32, 12, 8), glow: 'lamp' });
      b.push(['@granite.2', rect(-70, -H - 20, 34, 14)], ['@granite.2', rect(40, -H - 20, 28, 14)]);
      b.push({ f: '@lamp', d: ell(-R + 10, -H - 8, 1.8, 1.8), glow: 'lamp' }, { f: '@lamp', d: ell(R - 10, -H - 8, 1.8, 1.8), glow: 'lamp' });
      b.push({ f: '@glass.0', d: rect(-64, -H - 16, 8, 6) + rect(-50, -H - 16, 8, 6), glow: 'window' }, { f: '@glass.0', d: rect(46, -H - 16, 8, 6) + rect(58, -H - 16, 6, 6), glow: 'window' });
      return { body: b };
    },
  });

  /* ---------- structure.solent-pier ---------- */
  define({
    id: 'structure.solent-pier', category: 'structure', size: [520, 120], variants: 2, seasonal: false, flippable: true, parts: ['body'],
    palette: { base: { pile: ['#5a5e64', '#3a3e44'], deck: ['#8a7a64', '#6a5c48'], rail: '#e8e6e0', pav: ['#f2ece0', '#d8d0c0', '#5a7a8a', '#3a5a6a'], glass: ['#3a4a5a'], lamp: '#fff2c8' } },
    night: { glow: { window: '#ffe0a0', lamp: '#fff2c8' }, on: 1 },
    reflect: true,
    tags: ['seaside', 'pier', 'southsea', 'signature', 'kit:urban', 'kit:water', 'role:building-mid'],
    credit: 'native (Solent area kit)',
    build(v) {
      const b = [];
      // the pavilion at the shore end (left), the deck running out to sea (right)
      let piles = '';
      for (let x = -150; x < 260; x += 18) piles += `M${x} -34V8M${x + 6} -34V8`;
      b.push({ s: '@pile.0', w: 2.4, d: piles });
      let brace = '';
      for (let x = -150; x < 250; x += 18) brace += `M${x} -6L${x + 18} -30M${x} -30L${x + 18} -6`;
      b.push({ s: '@pile.1', w: 0.8, op: 0.7, d: brace });
      b.push(['@deck.0', rect(-160, -38, 420, 6)], ['@deck.1', rect(-160, -33, 420, 2)]);
      let rail = '';
      for (let x = -40; x < 260; x += 8) rail += `M${x} -38v-8`;
      b.push({ s: '@rail', w: 0.8, d: rail + 'M-40 -46H260' });
      // the pavilion: a long hall, a domed roof (v0) or a pitched roof with turrets (v1)
      b.push(['@pav.0', rect(-250, -86, 200, 52)], ['@pav.1', rect(-110, -86, 60, 52)]);
      if (v) b.push(['@pav.3', 'M-256 -86L-150 -112L-44 -86z'], ['@pav.2', rect(-262, -110, 18, 24)], ['@pav.2', rect(-56, -110, 18, 24)], ['@pav.3', 'M-264 -110L-253 -124L-242 -110zM-58 -110L-47 -124L-36 -110z']);
      else b.push(['@pav.2', 'M-200 -86Q-150 -130 -100 -86z'], ['@pav.3', 'M-252 -86H-48V-92H-252z'], ['@pav.0', rect(-154, -122, 8, 10)]);
      const cells = [];
      for (let x = -240; x < -60; x += 16) cells.push([x, -76, 10, 14], [x, -54, 10, 12]);
      const g = sceneDraw.winGroups(sceneRnd(311 + v), cells, 2);
      b.push({ f: '@glass.0', d: g[0], glow: 'window' }, { f: '@pav.2', d: g[1], glow: 'window' });
      let lamps = '', posts = '';
      for (let x = -20; x < 260; x += 46) { posts += `M${x} -46V-66`; lamps += ell(x, -68, 2.2, 2.2); }
      b.push({ s: '@pile.1', w: 1.2, d: posts }, { f: '@lamp', d: lamps, glow: 'lamp' });
      b.push(['@pav.1', rect(-250, -36, 200, 4)]);
      return { body: b };
    },
  });

  /* ---------- building.solent-seafront-villa ---------- */
  define({
    id: 'building.solent-seafront-villa', category: 'building', size: [140, 170], variants: 3, seasonal: false, flippable: true, parts: ['body'],
    palette: { base: { wall: ['#f2ece0', '#e8d8c0', '#dce4e8'], wallD: ['#cfc6b4', '#c4b498', '#b4c0c8'], roof: ['#4a5058', '#6a4a3a'], trim: '#ffffff', iron: '#2a3440', glass: ['#3a4a5a', '#5a7088'], door: ['#2a4a6a', '#6a2a2a', '#2a5a3a'] } },
    night: { glow: { window: '#ffd890', lamp: '#ffe8b0' }, on: 0.55 },
    shadow: { rx: 70, ry: 8, h: 170 },
    tags: ['seafront', 'villa', 'regency', 'southsea', 'kit:urban', 'role:building-mid'],
    credit: 'native (Solent area kit)',
    build(v) {
      const b = [], W = 66, H = 132;
      b.push([`@wall.${v}`, rect(-W, -H, 2 * W, H)], [`@wallD.${v}`, rect(W - 22, -H, 22, H)]);
      b.push([`@roof.${v % 2}`, `M${-W - 2} ${-H}L${-W + 14} ${-H - 30}H${W - 14}L${W + 2} ${-H}z`], [`@wallD.${v}`, rect(-W + 10, -H - 46, 14, 22)], [`@wallD.${v}`, rect(W - 26, -H - 46, 14, 22)]);
      // the bay: a canted two-storey bay on the left, a balcony with railings across the first floor
      b.push([`@wallD.${v}`, `M${-W + 6} 0V-84L${-W + 14} -90H-6L2 -84V0z`]);
      b.push(['@trim', rect(-W, -H, 2 * W, 4)], ['@trim', rect(-W, -64, 2 * W, 3)]);
      const cells = [[-W + 14, -78, 12, 22], [-W + 30, -78, 12, 22], [-W + 14, -40, 12, 24], [-W + 30, -40, 12, 24], [16, -112, 12, 20], [36, -112, 12, 20], [16, -78, 12, 22], [36, -78, 12, 22], [-W + 18, -116, 12, 20], [-W + 36, -116, 12, 20]];
      cells.forEach((c, i) => b.push({ f: i % 3 ? '@glass.0' : '@glass.1', d: rect(c[0], c[1], c[2], c[3]), glow: 'window' }));
      b.push({ s: '@trim', w: 0.8, op: 0.8, d: cells.map(c => `M${c[0] + c[2] / 2} ${c[1]}v${c[3]}M${c[0]} ${c[1] + c[3] / 2}h${c[2]}`).join('') });
      let rail = '';
      for (let x = 8; x < W - 4; x += 4) rail += `M${x} -64v-10`;
      b.push({ s: '@iron', w: 0.7, d: rail + `M8 -74H${W - 4}` }, ['@iron', `M6 -64H${W - 2}v2H6z`]);
      b.push([`@door.${v}`, rect(22, -36, 16, 36)], ['@trim', rect(18, -40, 24, 4)]);
      return { body: b };
    },
  });
})();
