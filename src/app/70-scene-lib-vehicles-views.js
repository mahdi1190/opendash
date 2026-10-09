/* ============================================================
   SCENE LIBRARY: the FRONT and REAR views of the commonest movers (docs/dev/SCENE_ENGINE_V2.md 4.3 and 9.5; builder D).
   PURE: sceneObjDefine calls only, built lazily per variant.

   A side-view car on a road that runs straight away from the camera is wrong: the flows (70-scene-1flow.js) and the ground
   placements pick these views when the lane runs along the line of sight (sceneFlowViewOf; the links are SCENE_OBJ_VIEWS).
   A view object shares its side view's variants (a red car's rear is red) and real size, seen end-on:

     vehicle.car-front / vehicle.car-rear       5 paints as vehicle.car: windscreen, head lamps / tail lamps and a blank plate
     vehicle.taxi-front / vehicle.taxi-rear     2 as vehicle.taxi: the yellow cab with its roof light box
     vehicle.bus-front / vehicle.bus-rear       2 liveries as vehicle.bus: a double-decker, both decks lit, a blank blind
     vehicle.tram-front / vehicle.tram-rear     3 liveries (green, yellow, blue): the cab, a lit display, the pantograph
     person.cyclist-front / person.cyclist-rear 4 riders in seasonal clothes (faceless, a helmet), a front or rear lamp
     boat.narrowboat-bow / boat.narrowboat-stern 3 paints as boat.narrowboat: the stem and button fender, or the counter and tiller

   Every one has weight 0 (an archetype that picks by kit and role never picks a view; only the flows and the view choice use
   them), its real size (`real`, metres), night glows, and kit and role tags. No text, no numbers, no liveries of a real operator.
   Anchor: the ground (the water line for the boat) under the middle. Lit from the LEFT.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { rect, ell, define } = sceneDraw;
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];

  /* ---------- cars and taxis, end on ---------- */
  const CAR_PAINT = { paint: ['#c8d0d8', '#2a3a5a', '#8a2a2a', '#3a3e42', '#f0f0ec'], paintD: ['#8e98a2', '#1c2840', '#5e1c1c', '#24272a', '#c4c8cc'] };
  const CAR_BASE = { glass: ['#2e3a46', '#5a6e80'], tyre: '#1a1c1e', head: '#fff4d0', tail: '#e03a2a', trim: '#1e2226', plate: '#e6e4da', plateR: '#e8d24a', sign: '#fff6d8' };
  /** A car seen end on (rear: the back window and tail lamps; taxi: a taller cabin and the roof light box). */
  function carEnd(v, rear, taxi) {
    const P = taxi ? '@paint' : `@paint.${v}`, D = taxi ? '@paintD' : `@paintD.${v}`, roof = taxi ? -35 : -33, body = [];
    body.push(['@tyre', rect(-19.5, -7, 6, 7) + rect(13.5, -7, 6, 7)]);
    // the lower body (bonnet or boot face), the cabin with its pillars, the glass
    body.push([P, 'M-20.5 -5V-15.5Q-20.5 -19.5 -16.5 -19.5H16.5Q20.5 -19.5 20.5 -15.5V-5z']);
    body.push([P, `M-15.5 -19L-12.5 ${roof + 2}Q-11.5 ${roof} -9 ${roof}H9Q11.5 ${roof} 12.5 ${roof + 2}L15.5 -19z`]);
    body.push({ f: '@glass.0', d: `M-13.4 -20.2L-10.8 ${roof + 2.6}H10.8L13.4 -20.2z` }, ['@glass.1', `M-9.6 ${roof + 3.4}H-4L-8 -21H-12z`, 0.55]);
    body.push([D, rect(-20.5, -9.5, 41, 4.5)], ['@trim', rect(-21.5, -22, 3, 2.4) + rect(18.5, -22, 3, 2.4)]);   // the bumper, the mirrors
    body.push({ s: '@trim', w: 0.6, op: 0.5, d: 'M-20 -19.5H20' });
    if (!rear) {
      body.push(['@trim', rect(-8, -15, 16, 4.2)], { s: '#5a6068', w: 0.5, op: 0.7, d: 'M-7 -13.6H7M-7 -12.2H7' });                 // the grille
      body.push({ f: '@head', d: rect(-18.5, -16, 7, 3.4), glow: 'lamp' }, { f: '@head', d: rect(11.5, -16, 7, 3.4), glow: 'lamp' });
      body.push({ f: '@head', d: rect(-18, -9, 3, 1.6), glow: 'lamp' }, { f: '@head', d: rect(15, -9, 3, 1.6), glow: 'lamp' });     // fog lamps
      body.push(['@plate', rect(-5, -9.2, 10, 2.8)]);
    } else {
      body.push({ f: '@tail', d: rect(-19.5, -16.5, 6.5, 4), glow: 'tail' }, { f: '@tail', d: rect(13, -16.5, 6.5, 4), glow: 'tail' });
      body.push({ f: '@tail', d: rect(-19, -9.2, 2.6, 1.6), glow: 'tail' }, { f: '@tail', d: rect(16.4, -9.2, 2.6, 1.6), glow: 'tail' });
      body.push(['@plateR', rect(-5.5, -13.6, 11, 3)], { s: '@trim', w: 0.6, op: 0.5, d: 'M-11 -17.5H11' });
    }
    if (taxi) body.push({ f: '@sign', d: rect(-6, -40, 12, 4.6), glow: 'sign' }, ['@trim', rect(-7, -35.6, 14, 1)]);
    return { body };
  }
  for (const [id, rear] of [['vehicle.car-front', false], ['vehicle.car-rear', true]]) {
    define({
      id, category: 'vehicle', size: [42, 34], variants: 5, seasonal: false, flippable: true, weight: 0,
      real: { h: 1.5, l: 1.8, w: 4.2 },
      palette: { base: Object.assign({}, CAR_PAINT, CAR_BASE) },
      night: { glow: { lamp: '#fff2c8', tail: '#ff5a40' }, on: 1 },
      shadow: { rx: 22, ry: 3, h: 22 },
      tags: ['car', 'road', 'city', 'traffic', rear ? 'rear' : 'front', 'view', 'kit:vehicles', 'kit:urban', 'role:vehicle'],
      credit: 'native (scene engine v2): vehicle.car seen ' + (rear ? 'from behind' : 'head on'),
      build(v) { return carEnd(v, rear, false); },
    });
  }
  for (const [id, rear] of [['vehicle.taxi-front', false], ['vehicle.taxi-rear', true]]) {
    define({
      id, category: 'vehicle', size: [42, 40], variants: 2, seasonal: false, flippable: true, weight: 0,
      real: { h: 1.6, l: 1.8, w: 4.5 },
      palette: { base: Object.assign({ paint: '#f2c230', paintD: '#c89818' }, CAR_BASE) },
      night: { glow: { lamp: '#fff2c8', tail: '#ff5a40', sign: '#fff2c0' }, on: 1 },
      shadow: { rx: 22, ry: 3, h: 24 },
      tags: ['taxi', 'cab', 'road', 'city', 'traffic', rear ? 'rear' : 'front', 'view', 'kit:vehicles', 'kit:urban', 'role:vehicle'],
      credit: 'native (scene engine v2): vehicle.taxi seen ' + (rear ? 'from behind' : 'head on'),
      build(v) { return carEnd(v, rear, true); },
    });
  }

  /* ---------- the double-deck bus, end on ---------- */
  define({
    id: 'vehicle.bus-front', category: 'vehicle', size: [40, 66], variants: 2, seasonal: false, flippable: true, weight: 0,
    real: { h: 4.4, l: 2.55, w: 11 },
    palette: { base: { body: ['#c8281e', '#2a5a8a'], shade: ['#8a1a14', '#1a3a5a'], band: '#e8e4dc', glass: ['#2a343e', '#9ab0c0'], tyre: '#1e2024', lamp: '#fff4d0', blind: '#1a1c1e', trim: '#24282c' } },
    night: { glow: { window: '#ffe6a8', lamp: '#fff0c0', sign: '#ffb23a' }, on: 1 },
    shadow: { rx: 21, ry: 4, h: 66 },
    tags: ['bus', 'double-decker', 'road', 'front', 'view', 'kit:vehicles', 'kit:london', 'role:vehicle'],
    credit: 'native (scene engine v2): vehicle.bus seen head on (a generic double-decker, no operator livery, a blank blind)',
    build(v) {
      const b = `@body.${v}`, s = `@shade.${v}`, body = [];
      body.push(['@tyre', rect(-18, -4, 5, 4) + rect(13, -4, 5, 4)]);
      body.push([b, 'M-19.5 -2V-62Q-19.5 -66 -15.5 -66H15.5Q19.5 -66 19.5 -62V-2z'], [s, rect(-19.5, -8, 39, 6)], ['@band', rect(-19.5, -38.5, 39, 2.4)]);
      body.push({ f: '@glass.0', d: rect(-16.5, -61, 16, 15), glow: 'window' }, { f: '@glass.0', d: rect(0.5, -61, 16, 15), glow: 'window' });
      body.push({ f: '@blind', d: rect(-12, -44.5, 24, 5), glow: 'sign' });
      body.push({ f: '@glass.0', d: 'M-16.5 -35H-0.6V-12.5H-16.5z', glow: 'window' }, { f: '@glass.0', d: 'M0.6 -35H16.5V-12.5H0.6z', glow: 'window' }, ['@glass.1', 'M-14 -33H-9L-15 -16H-16z', 0.6]);
      body.push({ f: '@lamp', d: ell(-14.5, -10, 2.2, 1.8), glow: 'lamp' }, { f: '@lamp', d: ell(14.5, -10, 2.2, 1.8), glow: 'lamp' });
      body.push(['@trim', rect(-21, -40, 2.2, 3) + rect(18.8, -40, 2.2, 3)], { s: '@trim', w: 0.6, op: 0.5, d: 'M-19 -46H19M0 -61V-46' });
      return { body };
    },
  });
  define({
    id: 'vehicle.bus-rear', category: 'vehicle', size: [40, 66], variants: 2, seasonal: false, flippable: true, weight: 0,
    real: { h: 4.4, l: 2.55, w: 11 },
    palette: { base: { body: ['#c8281e', '#2a5a8a'], shade: ['#8a1a14', '#1a3a5a'], band: '#e8e4dc', glass: ['#2a343e', '#9ab0c0'], tyre: '#1e2024', tail: '#e03a2a', grille: '#2a2c30', trim: '#24282c' } },
    night: { glow: { window: '#ffe6a8', tail: '#ff5a40' }, on: 1 },
    shadow: { rx: 21, ry: 4, h: 66 },
    tags: ['bus', 'double-decker', 'road', 'rear', 'view', 'kit:vehicles', 'kit:london', 'role:vehicle'],
    credit: 'native (scene engine v2): vehicle.bus seen from behind',
    build(v) {
      const b = `@body.${v}`, s = `@shade.${v}`, body = [];
      body.push(['@tyre', rect(-18, -4, 5, 4) + rect(13, -4, 5, 4)]);
      body.push([b, 'M-19.5 -2V-62Q-19.5 -66 -15.5 -66H15.5Q19.5 -66 19.5 -62V-2z'], [s, rect(-19.5, -8, 39, 6)], ['@band', rect(-19.5, -38.5, 39, 2.4)]);
      body.push({ f: '@glass.0', d: rect(-15, -60, 30, 13), glow: 'window' }, { f: '@glass.0', d: rect(-12, -34, 24, 9), glow: 'window' });
      body.push(['@grille', rect(-14, -22, 28, 10)], { s: '#4a4e54', w: 0.5, op: 0.8, d: 'M-13 -20H13M-13 -17.5H13M-13 -15H13' });
      body.push({ f: '@tail', d: rect(-18.5, -24, 3, 10), glow: 'tail' }, { f: '@tail', d: rect(15.5, -24, 3, 10), glow: 'tail' });
      body.push({ f: '@tail', d: rect(-18, -63, 4, 2), glow: 'tail' }, { f: '@tail', d: rect(14, -63, 4, 2), glow: 'tail' });
      body.push({ s: '@trim', w: 0.6, op: 0.5, d: 'M-19 -44H19' });
      return { body };
    },
  });

  /* ---------- the tram, end on (generic liveries: green, yellow, blue) ---------- */
  const TRAM = { body: ['#d8dcd8', '#e8c41e', '#2a5aa8'], band: ['#2f7a4a', '#7a7e84', '#1a3a78'], skirt: ['#3a3e42', '#3a3e42', '#22283a'], glass: ['#25303a', '#8aa2b6'], lamp: '#fff4d0', tail: '#e03a2a', disp: '#1a1c1e', pant: '#30343a', trim: '#24282c' };
  for (const [id, rear] of [['vehicle.tram-front', false], ['vehicle.tram-rear', true]]) {
    define({
      id, category: 'vehicle', size: [80, 104], variants: 3, seasonal: false, flippable: true, weight: 0,
      real: { h: 3.4, l: 2.65, w: 30 },
      palette: { base: TRAM },
      night: { glow: { window: '#ffe8b0', lamp: '#fff2c8', tail: '#ff5a40', sign: '#ffb23a' }, on: 1 },
      shadow: { rx: 40, ry: 4, h: 100 },
      tags: ['tram', 'light-rail', 'rail', rear ? 'rear' : 'front', 'view', 'kit:vehicles', 'kit:urban', 'role:vehicle'],
      credit: 'native (scene engine v2): a generic low-floor tram seen ' + (rear ? 'from behind' : 'head on') + ' (no operator livery)',
      build(v) {
        const body = [];
        body.push({ s: '@pant', w: 1.6, d: 'M-14 -92L0 -103L14 -92M-10 -103H10' }, ['@pant', rect(-16, -93, 32, 2.4)]);
        body.push([`@body.${v}`, 'M-38 -3V-76Q-38 -90 -24 -92H24Q38 -90 38 -76V-3z'], [`@skirt.${v}`, rect(-38, -12, 76, 9)], [`@band.${v}`, rect(-38, -40, 76, 5)]);
        body.push({ f: '@glass.0', d: 'M-33 -44V-77Q-32 -86 -21 -87H-1V-44z', glow: 'window' }, { f: '@glass.0', d: 'M1 -44V-87H21Q32 -86 33 -77V-44z', glow: 'window' });
        body.push(['@glass.1', 'M-27 -82H-20L-30 -52H-31z', 0.5], { s: '@trim', w: 0.8, op: 0.6, d: 'M0 -87V-44' });
        body.push({ f: '@disp', d: rect(-17, -86, 34, 6), glow: 'sign' });
        if (!rear) body.push({ f: '@lamp', d: ell(-28, -22, 4, 2.6), glow: 'lamp' }, { f: '@lamp', d: ell(28, -22, 4, 2.6), glow: 'lamp' });
        else body.push({ f: '@tail', d: ell(-28, -22, 4, 2.6), glow: 'tail' }, { f: '@tail', d: ell(28, -22, 4, 2.6), glow: 'tail' });
        body.push(['@trim', rect(-8, -26, 16, 6)], ['@trim', rect(-36, -4, 72, 2)]);
        return { body };
      },
    });
  }

  /* ---------- the cyclist, end on (faceless: a plain head under a helmet; seasonal clothes) ---------- */
  const CYC = {
    jacket: { spring: ['#3a6a9a', '#c8b040', '#5a8a4a', '#b04a3a'], summer: ['#e0a030', '#3a8ac0', '#d8d8d0', '#c0405a'], autumn: ['#5a4a3a', '#2a4a6a', '#8a5a2a', '#3a5a3a'], winter: ['#1e2a3a', '#3a3a40', '#5a2a2a', '#2a3a2a'] },
    legs: { spring: ['#2a3040', '#3a3a40'], summer: ['#3a4250', '#6a5a48'], autumn: ['#2a2a30', '#3a3440'], winter: ['#1e2028', '#24262c'] },
    skin: { spring: ['#c89a78', '#8a6248'], summer: ['#d0a07a', '#8a6248'], autumn: ['#c09070', '#8a6248'], winter: ['#b88a6a', '#7a5640'] },
  };
  const cycPal = () => { const p = {}; for (const s of SEAS) p[s] = { jacket: CYC.jacket[s], legs: CYC.legs[s], skin: CYC.skin[s] }; p.base = { helmet: ['#e8e8e4', '#2a2e34', '#c83a2a', '#3a7ac0'], tyre: '#1c1e20', frame: ['#5a6068', '#2a2e34'], lamp: '#fff4d0', tail: '#e03a2a', strip: '#c8d0d0', hair: '#3a2a20' }; return p; };
  for (const [id, rear] of [['person.cyclist-front', false], ['person.cyclist-rear', true]]) {
    define({
      id, category: 'person', size: [24, 76], variants: 4, seasonal: true, flippable: true, weight: 0,
      real: { h: 1.75, l: 0.6, w: 1.75 },
      palette: cycPal(),
      night: { glow: { lamp: '#fff2c8', tail: '#ff4a3a', strip: '#e8f0f0' }, on: 1 },
      anim: { bob: { part: 'body', dy: 0.35, period: 0.9 } },
      shadow: { rx: 7, ry: 2, h: 70 },
      parts: ['bike', 'body'],
      tags: ['uk', 'people', 'anonymous', 'silhouette', 'cyclist', 'bike', 'path', 'towpath', rear ? 'rear' : 'front', 'view', 'kit:people', 'kit:temperate', 'kit:urban', 'role:walker'],
      credit: 'native (scene engine v2): a cyclist seen ' + (rear ? 'from behind' : 'head on') + '; faceless, as every person in the library',
      build(v) {
        const j = `@jacket.${v}`, h = `@helmet.${v}`, bike = [], body = [];
        // the wheel end on (a thin upright ellipse), the fork, the bars
        bike.push(['@tyre', ell(0, -16, 1.7, 16)], { s: '@frame.0', w: 1.1, d: 'M0 -16L0 -40M-8 -44H8' }, { s: '@frame.1', w: 0.8, d: 'M-8 -44V-42M8 -44V-42' });
        if (!rear) bike.push({ f: '@lamp', d: ell(0, -41, 1.6, 1.2), glow: 'lamp' });
        else bike.push({ f: '@tail', d: rect(-1, -36, 2, 2.6), glow: 'tail' });
        // legs: one pedal up, one down (seen end on, the knees out a little)
        body.push({ s: `@legs.${v % 2}`, w: 3.8, cap: 'round', d: 'M-3 -40L-5 -29L-2.6 -20' }, { s: `@legs.${v % 2}`, w: 3.8, cap: 'round', d: 'M3 -40L4.6 -33L2.6 -12' });
        body.push(['@tyre', ell(-2.6, -19, 2, 1.2) + ell(2.6, -11, 2, 1.2)]);
        // the torso (a jacket), the arms to the bar ends, the head under a helmet
        body.push([j, 'M-6 -40Q-7.5 -52 -6.2 -60Q0 -63 6.2 -60Q7.5 -52 6 -40Q0 -38 -6 -40z']);
        body.push({ s: j, w: 2.6, cap: 'round', d: 'M-6 -58L-8.2 -45M6 -58L8.2 -45' }, ['@skin.0', ell(-8.2, -44.4, 1.3, 1.3) + ell(8.2, -44.4, 1.3, 1.3)]);
        body.push(['@skin.0', rect(-1.4, -64, 2.8, 3)], ['@skin.1', ell(0, -67.5, 3.6, 4.4)]);
        if (rear) body.push(['@hair', 'M-3.4 -67Q0 -63.6 3.4 -67V-65Q0 -62.4 -3.4 -65z']);
        body.push([h, 'M-4.4 -68Q-4.4 -74.6 0 -74.8Q4.4 -74.6 4.4 -68Q0 -69.6 -4.4 -68z']);
        body.push({ f: '@strip', d: rect(-5.4, -47, 10.8, 1.2), glow: 'strip' });
        if (rear) body.push(['#2a3038', 'M-4.6 -59H4.6L4 -46H-4z'], { f: '@strip', d: rect(-3.6, -52, 7.2, 1), glow: 'strip' });   // a small backpack
        return { bike, body };
      },
    });
  }

  /* ---------- the narrowboat, end on ---------- */
  const NB = { cabin: ['#2f5a46', '#6a2a2e', '#22304a'], cabinD: ['#22443a', '#4e1e22', '#182438'], cabinL: ['#4a7a62', '#8a4248', '#3a4a6a'], trim: ['#e9c86a', '#efe2c4', '#c8402a'],
    panel: ['#b0402a', '#2f5a46', '#e9c86a'], hull: ['#1f2628', '#3a2a22'], port: ['#cfe0e0', '#8aa0a8'], roof: ['#3a2e28', '#5a4a3a'], stove: '#2a2a2e', rope: '#d8cdb8', tiller: '#3a2e28', plant: ['#4a8a3a', '#e05a6a'] };
  for (const [id, stern] of [['boat.narrowboat-bow', false], ['boat.narrowboat-stern', true]]) {
    define({
      id, category: 'boat', size: [116, 100], variants: 3, seasonal: false, flippable: true, weight: 0,
      real: { h: 1.9, l: 2.1, w: 18 },
      palette: { base: NB },
      night: { glow: { window: '#ffd68a' }, on: 0.8 },
      anim: { bob: { part: '*', dy: 1.2, period: 5 } },
      reflect: true,
      tags: ['uk', 'canal', 'narrowboat', 'boat', stern ? 'rear' : 'front', 'view', 'kit:boats', 'kit:temperate', 'kit:water', 'role:boat'],
      credit: 'native (scene engine v2): boat.narrowboat seen ' + (stern ? 'from the stern' : 'from the bow'),
      build(v) {
        const cab = `@cabin.${v}`, tr = `@trim.${v}`, body = [];
        // the hull (black, the dark red gunwale band); the bow's stem and button fender, or the stern's rounded counter
        if (!stern) body.push(['@hull.0', 'M-56 -16H56L49 8Q0 13 -49 8z'], ['@hull.1', rect(-56, -16, 112, 4)], { s: '#5a6a6e', w: 1, op: 0.5, d: 'M0 -12V8' }, ['@rope', ell(0, 5, 7, 5)], { s: '@rope', w: 2.2, op: 0.9, d: 'M-6 -16Q0 -24 6 -16' });
        else body.push(['@hull.0', 'M-56 -16H56Q55 6 0 11Q-55 6 -56 -16z'], ['@hull.1', rect(-56, -16, 112, 4)], ['@rope', ell(0, 6, 9, 4)], { s: '#5a6a6e', w: 1, op: 0.5, d: 'M-50 -6Q0 4 50 -6' });
        // the cabin end with its coachlines; the doors (bow: the front doors; stern: the back doors with a step)
        body.push([cab, rect(-48, -58, 96, 42)], [`@cabinD.${v}`, rect(-48, -26, 96, 10)], [`@cabinL.${v}`, 'M-52 -62H52L48 -58H-48z']);
        body.push({ s: tr, w: 1.6, d: 'M-45 -53H45M-45 -21H45' });
        body.push([`@panel.${v}`, rect(-17, -54, 16.4, 36) + rect(0.6, -54, 16.4, 36)], { s: tr, w: 1.2, d: 'M-15 -52h12.4v32h-12.4zM2.6 -52h12.4v32h-12.4z' });
        body.push({ f: '@port.0', d: rect(-12, -49, 6.4, 9), glow: 'window' }, { f: '@port.0', d: rect(5.6, -49, 6.4, 9), glow: 'window' });
        body.push([tr, ell(-33, -40, 6.4, 6.4) + ell(33, -40, 6.4, 6.4)], { f: '@port.0', d: ell(-33, -40, 4.6, 4.6), glow: 'window' }, { f: '@port.0', d: ell(33, -40, 4.6, 4.6), glow: 'window' });
        // the roof: the chimney with brass bands, a pot of flowers; the stern's tiller arm over the doors
        body.push(['@stove', rect(24, -86, 8, 24)], { s: tr, w: 1.6, d: 'M24 -80h8M24 -72h8' }, ['@roof.1', rect(-40, -66, 22, 4)], ['@plant.0', 'M-38 -66q5 -10 10 0z'], ['@plant.1', ell(-33, -70, 2.4, 2.4)]);
        if (stern) body.push({ s: '@tiller', w: 2.6, d: 'M0 -16V-66Q0 -74 -16 -76' }, ['@rope', rect(-3, -20, 6, 4)]);
        return { body };
      },
    });
  }
})();
