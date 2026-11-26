/* ============================================================
   YOUR OWN HOUSE, the furniture's pictures: one painter for each piece of cat 'home' (94-garden-0catalog.js), painted in the
   room kit's hand (94-garden-native-roomart-0kit.js: soft light from the window side, no outlines, a contact shadow and a
   little wear at every foot). Room px round the piece's foot (0, 0); the player is about 88 tall indoors.

     HOUSE_ART[id] = { box: [x0, y0, x1, y1], draw(T, o) }    o = { v (its look), lit, icon }
     houseTexture(scene, id, v, lit) -> key | null          the texture (baked one to a task, between frames: null until it is)
     houseArtUrl(id, v, lit) -> data URL                    the same picture for the standard (SVG) room
     houseArtBox(id) -> [x0, y0, x1, y1]

   Functions and tables only: nothing runs at load.
   ============================================================ */
const _hsWood = (T, x, y, w, h, base, vertical, a) => { T.rect(x, y, w, h, T.lin(x, y, vertical ? x + w : x, vertical ? y : y + h, [[0, T.shade(base, .18)], [.5, base], [1, T.shade(base, -.3)]])); T.grain(x, y, w, h, T.shade(base, -.45), a == null ? .3 : a, vertical, 3.5); };
const _hsBrass = (T, x, y, w, h) => { T.rrect(x, y, w, h, Math.min(w, h) / 2.2, T.lin(x, y, x + w, y, [[0, '#f8e098'], [.35, '#d8a848'], [.75, '#8a5e22'], [1, '#c8963e']])); T.rect(x + w * .18, y + 1, Math.max(1, w * .16), Math.max(1, h - 2), '#fff4c8', .45); };
const _hsFlame = (T, x, y, k, lit) => { if (!lit) { T.stroke(`M${x} ${y}v-4`, '#2a1a10', 1.2); return; } T.glow(x, y - 8 * k, 30 * k, '#ffb050', .5); T.fill(`M${x} ${y - 16 * k}Q${x + 5 * k} ${y - 6 * k} ${x + 3 * k} ${y - 1.5 * k}Q${x} ${y + 1.5 * k} ${x - 3 * k} ${y - 1.5 * k}Q${x - 5 * k} ${y - 6 * k} ${x} ${y - 16 * k}Z`, '#ffc860'); T.ell(x, y - 5 * k, 1.6 * k, 3.6 * k, '#fff8d8'); };
const _hsQuilt = ['#c8584a', '#e8c878', '#5a7a9a', '#f0e6d0', '#7a9a5a', '#d88a6a', '#a8604a', '#8aa8c0'];
const HOUSE_ART = {
  'hf-cottage-bed': { box: [-100, -92, 100, 10], draw(T, o) {
    const Q = o && o.v ? _hsDyeQuilt(T, o.v) : _hsQuilt;
    T.soft(4, 2, 104, 9, .55);
    _hsWood(T, -94, -82, 12, 82, '#8a5a32', true); T.rrect(-96, -86, 16, 8, 3, '#a87444'); _hsWood(T, 82, -58, 12, 58, '#8a5a32', true); T.rrect(80, -62, 16, 7, 3, '#a87444');
    for (const x of [-86, 86]) T.rect(x - 4, -8, 8, 8, '#5a3a20');
    _hsWood(T, -84, -30, 168, 12, '#7a5030', false);
    T.rrect(-82, -46, 164, 18, 6, '#f0e8d8'); T.rect(-82, -46, 164, 4, '#ffffff', .5);
    T.rrect(-80, -62, 36, 18, 8, T.lin(0, -62, 0, -44, [[0, '#ffffff'], [1, '#d8d0c0']])); T.ell(-64, -58, 12, 3, '#ffffff', .7);
    // the quilt over the mattress and hanging over the rail, patch by patch
    const q = 'M-40 -50Q20 -54 80 -48L84 -14Q22 -6 -40 -12Z';
    T.fill(q, Q[0]); T.clip(q, () => { let i = 0; for (let y = -54; y < -6; y += 11) for (let x = -44; x < 88; x += 14) T.rect(x, y, 14, 11, Q[(i++ * 5 + Math.floor(y)) % Q.length], .95); for (let x = -44; x < 88; x += 14) T.stroke(`M${x} -56V-4`, '#3a2010', .7, .35); for (let y = -54; y < -6; y += 11) T.stroke(`M-44 ${y}H88`, '#3a2010', .7, .35); T.rect(-44, -56, 132, 8, '#ffffff', .2); T.rect(-44, -26, 132, 22, '#000', .18); });
    T.stroke('M-40 -12Q22 -6 84 -14', '#6a2a1a', 1.6, .5); T.stroke('M-40 -50Q20 -54 80 -48', '#ffffff', 1.4, .4);
  } },
  'hf-brass-bed': { box: [-98, -106, 98, 10], draw(T, o) {
    const band = houseDyeCol(o && o.v, '#5a7a9a');
    T.soft(4, 2, 100, 9, .55);
    for (const [x0, top] of [[-90, -96], [74, -66]]) { for (const x of [x0, x0 + 16]) _hsBrass(T, x - 2.5, top, 5, -top); T.rect(x0, top + 8, 16, 3, '#c8963e'); for (let i = 1; i < 4; i++) _hsBrass(T, x0 + i * 4 - 1, top + 12, 2, -top - 30); T.ell(x0, top - 2, 4.5, 4.5, '#e8c060'); T.ell(x0 + 16, top - 2, 4.5, 4.5, '#e8c060'); }
    T.rect(-74, -28, 148, 8, '#6a6a70');
    T.rrect(-76, -48, 152, 22, 7, '#f4f2ec');
    T.rrect(-74, -64, 34, 18, 8, '#ffffff'); T.ell(-58, -60, 12, 3, '#e8eef4');
    const q = 'M-40 -52Q20 -56 76 -50L80 -12Q20 -4 -40 -10Z'; T.fill(q, '#f4f6f8'); T.clip(q, () => { T.rect(-44, -26, 130, 6, band); T.rect(-44, -20, 130, 2, '#d8b45a'); for (let x = -36; x < 80; x += 18) T.ell(x, -40, 4, 3, T.shade(band, .5), .5); T.rect(-44, -26, 130, 22, '#000', .1); });
  } },
  'hf-stool': { box: [-22, -42, 22, 6], draw(T) {
    T.soft(0, 1, 22, 5, .5);
    for (const [x0, x1] of [[-10, -15], [10, 15]]) T.stroke(`M${x0} -28L${x1} 0`, '#6a4426', 4.4); T.stroke('M0 -28L1 -2', '#4a2e18', 4);
    T.stroke('M-12 -14H12', '#5a3a20', 2.6);
    T.ell(0, -30, 17, 5.5, '#5a3a20'); T.ell(0, -32, 17, 5.5, T.lin(-17, 0, 17, 0, [[0, '#c89a64'], [.5, '#a87c4f'], [1, '#7a5432']])); T.ell(-4, -33, 8, 2, '#e8c898', .45);
  } },
  'hf-ladder-chair': { box: [-26, -96, 28, 6], draw(T) {
    T.soft(2, 1, 26, 5, .5);
    const wood = '#8a5a32';
    _hsWood(T, -18, -92, 6, 92, wood, true); _hsWood(T, -12, -88, 4, 54, T.shade(wood, -.25), true, .2);
    for (const y of [-84, -70, -56]) { T.rrect(-17, y, 10, 6, 2, T.lin(0, y, 0, y + 6, [[0, '#b07a48'], [1, '#6a4426']])); }
    T.ell(-15, -94, 3.5, 3.5, '#a87444');
    _hsWood(T, 12, -34, 5, 34, wood, true); _hsWood(T, 6, -32, 4, 30, T.shade(wood, -.3), true, .2);
    T.stroke('M-14 -12H14', '#6a4426', 2.4); T.stroke('M-14 -20H12', '#5a3a20', 1.8, .7);
    // the rush seat, woven
    T.poly([[-18, -38], [18, -38], [20, -32], [-18, -32]], '#c8a860'); for (let i = 0; i < 9; i++) T.stroke(`M${-16 + i * 4} -38l2 6`, '#8a6a30', 1, .7); T.rect(-18, -39, 37, 2, '#e8d090', .7); T.rect(-18, -32, 38, 2.5, '#6a4426');
  } },
  'hf-armchair': { box: [-48, -96, 48, 8], draw(T, o) {
    T.soft(0, 2, 48, 8, .55);
    const c = houseDyeCol(o && o.v, '#7a3a3a'), d = T.shade(c, -.35), l = T.shade(c, .22);
    for (const x of [-34, 30]) T.rect(x, -6, 6, 6, '#3a2414');
    T.fill('M-40 -92Q-40 -100 -26 -100L16 -100Q30 -100 30 -86L30 -36L-40 -36Z', T.lin(-40, 0, 30, 0, [[0, l], [.6, c], [1, d]]));
    T.fill('M-30 -90Q-30 -94 -22 -94L12 -94Q20 -94 20 -86L20 -46L-30 -46Z', T.shade(c, .08)); T.stroke('M-5 -92V-50', d, 1.4, .4);
    T.rrect(-24, -92, 30, 22, 4, '#f0e6d0'); for (let i = 0; i < 5; i++) T.ell(-19 + i * 6, -70, 3, 2, '#f0e6d0');   // the lace antimacassar
    T.rrect(-44, -42, 88, 40, 8, T.lin(0, -42, 0, -2, [[0, l], [.4, c], [1, d]]));
    T.rrect(-38, -46, 74, 14, 6, T.lin(0, -46, 0, -32, [[0, T.shade(c, .35)], [1, c]])); T.rect(-36, -46, 70, 3, '#ffffff', .18);
    for (const x of [-46, 30]) { T.rrect(x, -58, 16, 50, 7, T.lin(x, 0, x + 16, 0, [[0, l], [.6, c], [1, d]])); T.ell(x + 8, -58, 8, 5, T.shade(c, .3)); }
    T.rect(-44, -12, 88, 8, d, .5); for (let x = -40; x < 44; x += 6) T.rect(x, -6, 3, 4, d, .6);
  } },
  'hf-rocking-chair': { box: [-36, -104, 36, 8], draw(T) {
    T.soft(0, 2, 36, 5, .45);
    const wood = '#6a4426';
    T.stroke('M-32 -4Q0 6 32 -6', wood, 5); T.stroke('M-32 -5Q0 5 32 -7', '#9a6a40', 1.4, .6);
    T.stroke('M-18 -2L-16 -40M14 -2L14 -40', wood, 4.4);
    for (let i = 0; i < 6; i++) T.stroke(`M${-20 + i * 2} -40L${-24 + i * 1.6} -98`, i % 5 ? T.shade(wood, -.15) : wood, i % 5 ? 2.2 : 4.2);
    T.stroke('M-25 -98Q-20 -103 -12 -100', wood, 4.4);
    T.rrect(-20, -46, 40, 8, 3, '#e8d8b0'); T.rect(-20, -40, 40, 3, T.shade(wood, -.2));
    T.stroke('M-18 -64Q0 -66 18 -56', wood, 3.4); T.stroke('M18 -56V-40', wood, 3.4);
  } },
  'hf-settle': { box: [-72, -112, 72, 8], draw(T, o) {
    const cush = houseDyeCol(o && o.v, '#a8603a');
    T.soft(0, 2, 72, 7, .55);
    const wood = '#6a4a2a';
    _hsWood(T, -66, -104, 132, 64, wood, true, .3); for (let i = 1; i < 4; i++) T.rect(-66 + i * 33, -104, 3, 64, '#000', .3);
    for (let i = 0; i < 4; i++) { T.rect(-60 + i * 33, -96, 24, 46, T.shade(wood, -.15)); T.rect(-60 + i * 33, -96, 24, 2, '#ffffff', .12); }
    T.rect(-70, -108, 140, 8, T.shade(wood, .2)); T.rect(-70, -108, 140, 2, '#ffffff', .2);
    _hsWood(T, -66, -40, 132, 8, T.shade(wood, .1), false); T.rrect(-60, -46, 120, 8, 3, cush); T.rect(-58, -46, 116, 2, T.shade(cush, .3), .6);
    _hsWood(T, -66, -32, 132, 32, T.shade(wood, -.2), false); for (const x of [-70, 62]) _hsWood(T, x, -70, 8, 70, wood, true);
  } },
  'hf-kitchen-table': { box: [-78, -70, 78, 8], draw(T) {
    T.soft(0, 2, 80, 8, .5);
    for (const [x, k] of [[-60, -.32], [54, -.32]]) _hsWood(T, x, -50, 7, 46, T.shade('#8a6a40', k), true, .2);   // the back legs, in shadow
    for (const x of [-68, 61]) _hsWood(T, x, -50, 8, 50, '#8a6a40', true); for (const x of [-68, 61]) T.rect(x - 1, -4, 10, 4, '#4a3420');
    _hsWood(T, -66, -52, 132, 10, '#7a5a34', false); T.rrect(-6, -48, 12, 4, 2, '#3a2814'); T.ell(0, -46, 2, 2, '#c8a050');
    T.poly([[-74, -58], [74, -58], [70, -64], [-70, -64]], T.lin(0, -64, 0, -58, [[0, '#e8dcc0'], [1, '#cdb894']]));
    for (let i = 0; i < 6; i++) T.stroke(`M${-68 + i * 26} -63.5l${-2 + i} 5`, '#b8a078', .8, .5);
    T.rect(-76, -58, 152, 6, T.lin(0, -58, 0, -52, [[0, '#d8c8a0'], [1, '#a88a60']])); T.rect(-76, -58, 152, 1.4, '#fff4dc', .6);
    T.ell(30, -61, 14, 2.4, '#fff8e8', .25);
  } },
  'hf-tea-table': { box: [-36, -66, 36, 8], draw(T) {
    T.soft(0, 2, 26, 5, .5);
    T.stroke('M0 -46V-6', '#6a4426', 6); T.stroke('M-1.5 -46V-6', '#9a6a40', 1.6, .6);
    for (const [dx, dy] of [[-16, 0], [16, 0], [4, -4]]) T.stroke(`M0 -8Q${dx * .4} -3 ${dx} ${dy}`, '#6a4426', 4);
    T.ell(0, -50, 32, 8, '#5a3a20'); T.ell(0, -53, 32, 8, T.lin(-32, 0, 32, 0, [[0, '#b07a48'], [.5, '#8a5a32'], [1, '#6a4426']]));
    const cloth = 'M-30 -54Q0 -64 30 -54L28 -40Q22 -36 18 -40Q12 -35 6 -39Q0 -34 -6 -39Q-12 -35 -18 -40Q-22 -36 -28 -40Z';
    T.fill(cloth, '#f4ecd8'); T.clip(cloth, () => { for (let i = 0; i < 8; i++) T.ell(-24 + i * 7, -44, 2, 2, '#d8c8a8', .7); T.rect(-32, -46, 64, 8, '#000', .08); });
  } },
  'hf-oak-chest': { box: [-48, -60, 48, 8], draw(T) {
    T.soft(0, 2, 48, 6, .55);
    const wood = '#7a5432';
    for (const x of [-40, 34]) T.rect(x, -6, 6, 6, '#3a2414');
    _hsWood(T, -42, -44, 84, 38, wood, false, .35);
    for (const x of [-36, 4]) { T.rect(x, -38, 32, 26, T.shade(wood, -.12)); T.rect(x, -38, 32, 2, '#ffffff', .12); T.rect(x + 30, -38, 2, 26, '#000', .25); }
    T.poly([[-46, -44], [46, -44], [44, -50], [-44, -50]], T.lin(0, -50, 0, -44, [[0, T.shade(wood, .3)], [1, wood]]));
    T.rect(-46, -46, 92, 4, T.shade(wood, -.2));
    for (const x of [-30, 22]) { T.rect(x, -46, 8, 16, '#2e2a26'); T.rect(x, -46, 8, 2, '#6a6660', .6); T.ell(x + 4, -36, 1.6, 1.6, '#8a8680'); T.ell(x + 4, -41, 1.6, 1.6, '#8a8680'); }   // iron straps over the lid's edge
    T.rrect(-6, -40, 12, 12, 2, '#d8b45a'); T.ell(0, -35, 1.6, 2.6, '#3a2814');
  } },
  'hf-dresser': { box: [-62, -162, 62, 8], draw(T) {
    T.soft(0, 2, 62, 8, .55);
    const c = '#5a7a8a', d = T.shade(c, -.35), l = T.shade(c, .2);
    // the rack: back boards and three shelves of plates and cups
    T.rect(-50, -150, 100, 90, T.shade(c, -.25)); T.planksV(-50, -150, 50, -60, { base: T.shade(c, -.2), w: 16, wMax: 20, var: .06, gap: .3, grainA: .15 });
    for (const x of [-54, 46]) T.rect(x, -152, 8, 92, T.lin(x, 0, x + 8, 0, [[0, l], [1, d]]));
    T.rect(-58, -158, 116, 10, T.lin(0, -158, 0, -148, [[0, l], [1, c]])); T.rect(-58, -158, 116, 2, '#ffffff', .25);
    const plate = (x, y, r, rim) => { T.ell(x, y, r, r, '#e8e4dc'); T.ell(x, y, r * .82, r * .82, '#f8f6f0'); T.ell(x, y, r * .55, r * .55, rim, .5); T.ell(x - r * .3, y - r * .35, r * .2, r * .14, '#ffffff', .8); T.stroke(`M${x - r} ${y + r * .2}A${r} ${r} 0 0 0 ${x + r} ${y + r * .2}`, '#b8b0a4', 1, .5); };
    for (const [y, n] of [[-120, 5], [-90, 5]]) { T.rect(-50, y + 14, 100, 4, l); T.rect(-50, y + 18, 100, 2, '#000', .3); for (let i = 0; i < n; i++) plate(-40 + i * 20, y + 2, 10, i % 2 ? '#3a64a8' : '#a83a3a'); T.stroke(`M-50 ${y + 9}H50`, '#3a2a1a', 1.2, .6); }
    for (let i = 0; i < 4; i++) { const x = -36 + i * 24, y = -138; T.stroke(`M${x} ${y - 6}v4`, '#2a2a2a', 1); T.rrect(x - 5, y - 2, 10, 9, 2, i % 2 ? '#f0ece0' : '#d8e4ec'); T.stroke(`M${x + 5} ${y + 1}q4 2 0 5`, '#b8b0a4', 1.2); }
    // the worktop and the base: two drawers, two doors
    T.rect(-60, -64, 120, 6, T.lin(0, -64, 0, -58, [[0, '#c8a878'], [1, '#8a6a44']])); T.rect(-60, -64, 120, 1.4, '#fff4dc', .5);
    T.rect(-56, -58, 112, 58, T.lin(-56, 0, 56, 0, [[0, l], [.5, c], [1, d]]));
    for (const x of [-52, 2]) { T.rect(x, -54, 50, 12, T.shade(c, -.12)); T.ell(x + 25, -48, 2.4, 2.4, '#d8b45a'); T.rect(x, -54, 50, 1.5, '#ffffff', .2); }
    for (const x of [-52, 2]) { T.rect(x, -38, 50, 34, T.shade(c, -.1)); T.rect(x + 5, -33, 40, 24, T.shade(c, -.22)); T.rect(x + 5, -33, 40, 1.5, '#ffffff', .2); T.ell(x + (x < 0 ? 44 : 6), -21, 2.2, 2.2, '#d8b45a'); }
    T.rect(-56, -4, 112, 4, d);
  } },
  'hf-bookcase': { box: [-50, -170, 50, 8], draw(T) {
    T.soft(0, 2, 50, 7, .55);
    const wood = '#6a4426'; T.rect(-46, -162, 92, 162, T.shade(wood, -.45));
    for (const x of [-46, 40]) _hsWood(T, x, -164, 6, 164, wood, true); _hsWood(T, -48, -168, 96, 8, T.shade(wood, .15), false);
    const cols = ['#a83a3a', '#3a5a8a', '#5a7a3a', '#c8963e', '#6a3a5a', '#2e4a4a', '#8a5a2a', '#d8c8a0'];
    for (let s = 0; s < 4; s++) {
      const by = -124 + s * 38; _hsWood(T, -40, by, 80, 5, T.shade(wood, .1), false);
      let x = -38; while (x < 36) { const w = 5 + T.r() * 6, h = 22 + T.r() * 10, lean = T.r() < .12 && x < 28; if (x + w > 38) break; const c = T.pick(cols); if (lean) { T.poly([[x, by], [x + w, by], [x + w + 8, by - h + 2], [x + 8 - 1, by - h]], T.shade(c, -.1)); x += w + 8; continue; } T.rect(x, by - h, w, h, T.lin(x, 0, x + w, 0, [[0, T.shade(c, .2)], [1, T.shade(c, -.3)]])); T.rect(x, by - h + 4, w, 1.6, '#e8c878', .6); T.rect(x, by - 8, w, 1.6, '#e8c878', .5); x += w + .6; }
    }
    _hsWood(T, -40, -6, 80, 6, wood, false);
  } },
  'hf-geranium': { box: [-30, -98, 30, 6], draw(T) {
    T.soft(0, 1, 20, 4, .5);
    for (const dx of [-12, 12]) T.stroke(`M${dx * .4} -48L${dx} 0`, '#6a4426', 3.4); T.stroke('M0 -48L0 -2', '#4a2e18', 3);
    T.ell(0, -48, 15, 4, '#7a5432'); T.ell(0, -50, 15, 4, '#a87444');
    T.fill('M-12 -50L-9 -68H9L12 -50Z', T.lin(-12, 0, 12, 0, [[0, '#d0784a'], [1, '#8a4a28']])); T.rrect(-13, -72, 26, 6, 2, '#c8724a');
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i - 4.5) * .3, r = 12 + T.r() * 4; T.ell(Math.cos(a) * r, -76 + Math.sin(a) * r * .6, 7, 5, T.pick(['#4f8a3a', '#5e9a44', '#3f7a32']), 1, a); }
    for (const [x, y] of [[-8, -92], [6, -94], [0, -86], [-14, -82], [12, -84]]) { for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; T.ell(x + Math.cos(a) * 3.4, y + Math.sin(a) * 3, 2.6, 2.6, k % 2 ? '#e04a4a' : '#f06a5a'); } T.ell(x - 1, y - 1, 1.4, 1.4, '#ffa0a0', .8); }
  } },
  'hf-standard-lamp': { box: [-34, -154, 34, 8], draw(T, o) {
    T.soft(0, 1, 20, 5, .5);
    T.ell(0, -3, 15, 4, '#3a2814'); T.ell(0, -5, 15, 4, '#6a5038');
    T.stroke('M0 -6V-108', '#5a4028', 4); T.stroke('M-1 -6V-108', '#9a7a58', 1.2, .6); for (const y of [-40, -76]) T.ell(0, y, 4.5, 3, '#7a5a3a');
    const lit = !!o.lit, shade = 'M-14 -138L14 -138L24 -108L-24 -108Z';
    if (lit) T.glow(0, -116, 56, '#ffd890', .28);
    T.fill(shade, lit ? T.lin(0, -138, 0, -108, [[0, '#f8e4b0'], [1, '#f0c878']]) : T.lin(-24, 0, 24, 0, [[0, '#f0dcb0'], [.6, '#d8c090'], [1, '#a8905e']]));
    if (lit) T.fill(shade, T.lin(-24, 0, 24, 0, [[0, '#fff8e0', .3], [.5, '#fff8e0', 0], [1, '#7a5020', .25]]));   // (lit from inside, still a shade with a light and a dark side)
    for (let i = 0; i < 12; i++) T.stroke(`M${-23 + i * 4.2} -108v6`, lit ? '#e8b860' : '#b8985a', 1.2, .9);
    T.stroke('M-14 -138L14 -138', '#8a6a3a', 1.6); if (lit) T.ell(0, -108, 18, 4, '#fff8e0', .8);
  } },
  'hf-candlestick': { box: [-14, -60, 14, 4], draw(T, o) {
    T.soft(0, 0, 10, 2.5, .45);
    T.ell(0, -2, 9, 3, '#8a5e22'); T.ell(0, -3.4, 9, 3, T.lin(-9, 0, 9, 0, [[0, '#f8e098'], [.5, '#d8a848'], [1, '#8a5e22']]));
    _hsBrass(T, -1.8, -16, 3.6, 13); T.ell(0, -16, 5, 1.8, '#d8a848');
    T.rrect(-3, -32, 6, 16, 1.5, T.lin(-3, 0, 3, 0, [[0, '#fff8ec'], [1, '#d8ccb4']])); T.fill('M-3 -32q2 4 3 0q1 3 3 0z', '#fffcf4');
    _hsFlame(T, 0, -34, 1, !!o.lit);
  } },
  'hf-oil-lamp': { box: [-16, -70, 16, 4], draw(T, o) {
    T.soft(0, 0, 13, 3, .45);
    T.ell(0, -3, 11, 3, '#2a4a40'); T.fill('M-11 -4Q-14 -16 -6 -22H6Q14 -16 11 -4Z', T.lin(-12, 0, 12, 0, [[0, '#7ab8a0'], [.4, '#3a6a5a'], [1, '#1a3a30']]));
    T.ell(-5, -14, 2.5, 5, '#ffffff', .35); _hsBrass(T, -6, -26, 12, 5);
    const lit = !!o.lit; if (lit) T.glow(0, -36, 34, '#ffd890', .5);
    T.fill('M-5 -27Q-7 -36 -3 -42V-48H3V-42Q7 -36 5 -27Z', lit ? 'rgba(255,244,210,.55)' : 'rgba(220,236,240,.45)'); T.stroke('M-3 -46V-30', '#ffffff', 1, .6);
    if (lit) { T.ell(0, -33, 2.4, 5, '#ffc860'); T.ell(0, -32, 1.2, 2.6, '#fff8e0'); }
  } },
  'hf-fern-pot': { box: [-36, -60, 36, 4], draw(T) {
    T.soft(0, 0, 16, 3.5, .45);
    T.fill('M-13 -20L-10 0H10L13 -20Z', T.lin(-13, 0, 13, 0, [[0, '#d0784a'], [1, '#8a4a28']])); T.rrect(-15, -24, 30, 6, 2, '#c8724a'); T.rect(-12, -10, 24, 2, '#a85a34', .6);
    for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * .34, len = 26 + (4 - Math.abs(i - 4)) * 3, ex = Math.cos(a) * len, ey = -22 + Math.sin(a) * len * .8; T.stroke(`M0 -22Q${ex * .4} ${-22 + Math.sin(a) * len * .9} ${ex} ${ey}`, '#3f7a3a', 1.6); for (let k = 1; k < 7; k++) { const t = k / 7, px = ex * t * (1 - .1 * t), py = -22 + (ey + 22) * t - Math.sin(t * 3.14) * 4; T.ell(px, py, 3.6 * (1 - t * .5), 1.6, T.pick(['#4f8f46', '#5ea050', '#3f7a3a']), 1, a + (k % 2 ? .8 : -.8)); } }
  } },
  'hf-rag-rug': { box: [-72, -48, 72, 4], draw(T, o) {
    const cx = T.cx; cx.save(); cx.translate(0, -21); cx.scale(1, 21 / 66);
    const d = o && o.v ? houseDyeCol(o.v, '#a8604a') : null, rings = d ? [T.shade(d, -.5), d, T.shade(d, .5), T.shade(d, -.25), d, T.shade(d, .6), T.shade(d, -.1), T.shade(d, .3)] : ['#6a4a3a', '#a8604a', '#c8b078', '#5a6a7a', '#a8604a', '#e0c898', '#7a8a5a', '#c8584a'];
    [66, 62, 55, 47, 39, 31, 22, 13].forEach((r, i) => T.ell(0, 0, r, r, rings[i]));
    for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283, r = 20 + (i % 5) * 9; T.ell(Math.cos(a) * r, Math.sin(a) * r, 3, 2, '#000', .12); }
    cx.restore();
    T.ell(0, -21, 66, 21, T.rad(-20, -30, 70, [[0, '#fff4e0', .12], [1, '#000', .18]]));
  } },
  'hf-braided-rug': { box: [-80, -56, 80, 4], draw(T, o) {
    const cx = T.cx; cx.save(); cx.translate(0, -25); cx.scale(1, 25 / 75);
    const d = o && o.v ? houseDyeCol(o.v, '#5a7a9a') : null, C3 = d ? [d, T.shade(d, .55), T.shade(d, -.35)] : ['#5a7a9a', '#e8c070', '#3a5a7a'];
    for (let i = 0; i < 9; i++) { const r = 75 - i * 8, c = C3[i % 3]; T.ell(0, 0, r, r, c); for (let k = 0; k < 28; k++) { const a = k / 28 * 6.283; T.ell(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4), 3.4, 1.8, T.shade(c, -.25), .35, a + 1); } }
    cx.restore(); T.ell(0, -25, 75, 25, T.rad(-20, -34, 80, [[0, '#fff4e0', .1], [1, '#000', .16]]));
  } },
  'hf-wall-shelf': { box: [-56, -48, 56, 6], draw(T) {
    T.soft(0, -8, 50, 4, .35);
    for (const x of [-38, 38]) T.fill(`M${x - 3} -14H${x + 3}V-10Q${x + 3} 2 ${x - 3} 4Z`, '#6a4426');
    _hsWood(T, -50, -16, 100, 6, '#8a5a32', false); T.rect(-50, -16, 100, 1.4, '#e8c898', .5);
    const jar = (x, h, c, lid) => { T.rrect(x - 7, -16 - h, 14, h, 3, c); T.rect(x - 5, -16 - h + 3, 3, h - 6, '#ffffff', .3); T.rect(x - 7.5, -16 - h - 3, 15, 4, lid); T.rect(x - 5, -16 - h * .55, 10, 6, '#f4ecd8', .85); };
    jar(-34, 18, '#c84a3a', '#e8d8b0'); jar(-16, 22, '#e8a83a', '#a83a3a'); jar(2, 16, '#7a9a4a', '#e8d8b0'); jar(20, 20, '#a85a7a', '#5a7a3a');
    T.rrect(32, -30, 14, 14, 3, 'rgba(200,228,232,.55)'); T.rect(31, -33, 16, 4, '#8a6a3a');
  } },
  'hf-picture': { box: [-38, -64, 38, 6], draw(T, o) {
    T.soft(0, -24, 34, 30, .3); T.stroke('M-16 -52L0 -62L16 -52', '#3a3a3a', .8, .7); T.ell(0, -62, 1.6, 1.6, '#2a2a2a');
    T.rect(-33, -54, 66, 54, T.lin(-33, -54, 33, 0, [[0, '#f0d080'], [.4, '#c8963e'], [1, '#7a5420']])); T.rect(-28, -49, 56, 44, '#3a2a14');
    T.clipRect(-27, -48, 54, 42, () => {
      const v = (o.v | 0) % 3;
      if (v === 0) { T.rect(-27, -48, 54, 42, T.lin(0, -48, 0, -6, [[0, '#a8cce4'], [1, '#e8f0e0']])); T.fill('M-27 -24Q-10 -34 4 -26T27 -28V-6H-27Z', '#7aa060'); T.fill('M-27 -16Q-6 -22 10 -16T27 -18V-6H-27Z', '#5a8a48'); T.blob(14, -40, 7, 2.4, '#ffffff', .9); }
      else if (v === 1) { T.rect(-27, -48, 54, 42, '#5a7a5a'); T.rect(-6, -48, 12, 34, T.lin(-6, 0, 6, 0, [[0, '#d8f0f4'], [.5, '#ffffff'], [1, '#a8d0dc']])); for (let i = 0; i < 4; i++) T.stroke(`M${-4 + i * 3} -48V-14`, '#ffffff', 1, .7); T.ell(0, -12, 18, 6, '#a8d8e4'); T.blob(-18, -30, 10, 14, '#3f6a3a'); T.blob(18, -26, 11, 16, '#4a7a42'); }
      else { T.rect(-27, -48, 54, 42, T.lin(0, -48, 0, -20, [[0, '#f4d0a0'], [1, '#e8b080']])); T.rect(-27, -20, 54, 14, '#5a7a9a'); T.rect(-22, -30, 18, 12, '#c8b090'); T.poly([[-23, -30], [-13, -38], [-3, -30]], '#8a4a3a'); T.stroke('M10 -20V-40M10 -40L20 -26H10', '#5a3a20', 1.4); T.fill('M4 -20H22L19 -16H7Z', '#8a5a32'); }
      T.rect(-27, -48, 54, 42, T.lin(-27, -48, 27, -6, [[0, '#ffffff', .18], [.4, '#ffffff', 0]]));
    });
    T.rect(-33, -54, 66, 2, '#fff4c8', .6);
  } },
  'hf-mirror': { box: [-28, -70, 28, 6], draw(T) {
    T.soft(0, -28, 22, 30, .3); T.stroke('M-10 -58L0 -66L10 -58', '#3a3a3a', .8, .7);
    T.ell(0, -30, 22, 29, T.lin(-22, -60, 22, 0, [[0, '#f8e098'], [.4, '#d8a848'], [1, '#8a5e22']]));
    T.ell(0, -30, 17, 24, T.lin(-17, -54, 17, -6, [[0, '#e8f4f8'], [.5, '#b8d4dc'], [1, '#7a98a4']]));
    T.fill('M-12 -44Q-6 -50 0 -48L-10 -20Q-14 -30 -12 -44Z', '#ffffff', .55); T.ell(6, -18, 5, 2, '#ffffff', .3);
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; T.ell(Math.cos(a) * 20, -30 + Math.sin(a) * 27, 2.2, 2.2, '#f8e8a8', .8); }
  } },
  'hf-wall-clock': { box: [-30, -74, 30, 6], draw(T) {
    T.soft(0, -30, 24, 34, .3);
    _hsWood(T, -14, -40, 28, 40, '#6a4426', true, .3); T.rrect(-8, -34, 16, 26, 3, '#2a1a10'); T.rrect(-6, -32, 12, 22, 2, 'rgba(200,220,228,.35)');
    T.stroke('M0 -32V-16', '#c8963e', 1.2); T.ell(0, -14, 4, 4, '#d8b45a');
    T.ell(0, -50, 23, 23, T.lin(-23, -73, 23, -27, [[0, '#9a6a40'], [1, '#4a2e18']])); T.ell(0, -50, 19, 19, '#f4ecd8'); T.ell(0, -50, 19, 19, T.rad(-6, -56, 22, [[0, '#ffffff', .3], [1, '#000', .12]]));
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; T.stroke(`M${Math.cos(a) * 15} ${-50 + Math.sin(a) * 15}L${Math.cos(a) * (i % 3 ? 16.5 : 17.5)} ${-50 + Math.sin(a) * (i % 3 ? 16.5 : 17.5)}`, '#3a2a1a', i % 3 ? 1 : 2); }
    T.ell(0, -50, 1.8, 1.8, '#2a1a10');
  } },
  'hf-guest-book': { box: [-24, -76, 24, 6], draw(T) {
    T.soft(0, 1, 20, 4.5, .5);
    // the stand: a turned post on a cross foot, a sloping desk
    for (const [x0, x1] of [[-14, -2], [14, 2]]) T.stroke(`M${x0} 0L${x1} -8`, '#5a3a20', 4);
    T.ell(0, -8, 5, 2.4, '#4a2e18');
    T.stroke('M0 -8V-50', '#6a4426', 5.5); T.stroke('M-1.2 -10V-50', '#a87444', 1.4, .6); for (const y of [-22, -38]) T.ell(0, y, 4.2, 2.6, '#7a5232');
    T.poly([[-22, -50], [22, -58], [22, -54], [-22, -46]], '#5a3a20'); T.poly([[-22, -52], [22, -60], [22, -58], [-22, -50]], '#8a5a32');
    // the open book on it, its pages and a few lines of writing, a ribbon down the middle
    T.poly([[-20, -54], [-1, -59], [-1, -72], [-20, -67]], '#f4ecd8'); T.poly([[1, -59], [20, -64], [20, -77], [1, -72]], '#fbf6ea');
    T.poly([[-20, -54], [-1, -59], [-1, -60], [-20, -55]], '#c8b894', .8);
    for (let i = 0; i < 4; i++) { T.stroke(`M${-17} ${-58.5 - i * 2.4 + 0}L${-4} ${-61.5 - i * 2.4}`, '#6a5a4a', .7, .7); T.stroke(`M${4} ${-62.5 - i * 2.4}L${17} ${-65.5 - i * 2.4}`, '#6a5a4a', .7, .55); }
    T.stroke('M0 -59V-50', '#a83a3a', 1.6);
    // a pen in a little ink pot on the desk's edge
    T.ell(17, -58, 3, 1.4, '#1a1a22'); T.rect(14, -63, 6, 5, '#2a2a34'); T.stroke('M17 -63L24 -80', '#e8e4d8', 1.4); T.fill('M24 -80q4 2 2 8q-2 -3 -4 -6z', '#f4f0e6');
  } },
  'hf-dye-pot': { box: [-36, -66, 36, 6], draw(T, o) {
    T.soft(0, 2, 32, 6, .55);
    // the iron trivet, three legs
    for (const [x0, x1] of [[-22, -16], [22, 16], [3, 2]]) T.stroke(`M${x0} 0L${x1} -16`, '#26262a', 3);
    T.ell(0, -16, 22, 4, '#3a3a40');
    // the copper pot: lit on its left, a dark rim, the dye inside, steam
    T.ell(0, -30, 26, 20, T.lin(-26, 0, 26, 0, [[0, '#e8a060'], [.3, '#c87a3a'], [.7, '#8a4a22'], [1, '#5a2e14']]));
    T.ell(-9, -34, 6, 9, '#ffd8a8', .35);
    T.ell(0, -46, 26, 6, '#5a2e14'); T.ell(0, -46, 22, 4.6, o && o.v ? houseDyeCol(o.v, '#3f6ea8') : '#6a5a7a');
    T.ell(-5, -47, 8, 1.6, '#ffffff', .25);
    for (const x of [-27, 27]) T.ell(x, -40, 3, 4, '#8a4a22');
    // a wooden paddle leaning in it
    T.stroke('M6 -46L22 -84', '#9a7448', 3.2); T.stroke('M6 -46L22 -84', '#c8a070', 1, .6);
    for (const [x, y] of [[-6, -54], [4, -60], [-2, -66]]) T.ell(x, y, 5, 3.4, '#f4f4f8', .28);
  } },
  'hf-banner': { box: [-32, -74, 32, 6], draw(T, o) {
    const bn = (o && o.bn) || (typeof _hsBannerNow === 'function' ? _hsBannerNow() : HOUSE_BANNER0), B = HOUSE_BANNER;
    T.soft(0, -30, 26, 34, .25);
    // a little iron bracket on the wall, its pole, and the banner hanging from it in folds
    T.rect(-28, -70, 5, 12, '#2a2a30'); T.ell(-25.5, -64, 1.4, 1.4, '#8a8a92');
    T.stroke('M-24 -66L28 -70', '#5a3a20', 3); T.ell(28, -70, 2.4, 2.4, '#d8b45a');
    const cw = 6, x0 = -22, y0 = -66;
    for (let r = 0; r < B.rows; r++) for (let c = 0; c < B.cols; c++) {
      const k = parseInt(bn[r * B.cols + c], 12) || 0, fold = Math.sin(c / (B.cols - 1) * Math.PI * 2) * 1.6, x = x0 + c * cw, y = y0 + r * cw + fold + c * -.5;
      T.rect(x, y, cw + .4, cw + .4, B.colours[k]);
      T.rect(x, y, cw + .4, cw + .4, c % 2 ? '#000' : '#fff', .07);
    }
    T.stroke(`M${x0} ${y0 + B.rows * cw + 1}l8 4l8 -4l8 4l8 -4l8 4l6 -3`, '#2a2418', .7, .25);
  } },
};
/** A quilt's patches in shades of one dye. */
function _hsDyeQuilt(T, v) { const d = houseDyeCol(v, '#c8584a'); return [d, T.shade(d, .45), T.shade(d, -.25), '#f0e6d0', T.shade(d, .2), T.shade(d, -.45), T.shade(d, .65), '#e8dcc0']; }
/** A swatch for the shop and your things: a roll of the paper, or a square of the floor. */
function _hsFinishArt(id) {
  const def = typeof gardenDecor === 'function' ? gardenDecor(id) : null; if (!def || !def.finish) return null;
  if (def.finish === 'wall') return { box: [-36, -66, 36, 4], draw(T) {
    T.soft(0, 0, 30, 4, .4);
    T.clip('M-26 -60H24V-2H-26Z', () => (HOUSE_WALLS[id] || HOUSE_WALLS['hfw-limewash'])(T, { x0: -26, x1: 24, y0: -60, y1: -2 }));
    T.rect(-26, -60, 50, 58, T.lin(-26, 0, 24, 0, [[0, '#ffffff', .14], [1, '#000', .16]]));
    T.ell(24, -31, 7, 29, T.lin(17, 0, 31, 0, [[0, def.look.c], [1, T.shade(def.look.c, -.3)]])); T.ell(24, -31, 3, 26, T.shade(def.look.c, -.4));   // the rest of the roll
  } };
  return { box: [-42, -34, 42, 4], draw(T) {
    T.soft(0, 0, 40, 4, .4);
    T.clip('M-30 -30H30L40 0H-40Z', () => { const cx = T.cx; cx.save(); cx.translate(0, -430); cx.scale(.25, 1); cx.translate(-480, 0); (HOUSE_FLOORS[id] || HOUSE_FLOORS['hff-boards'])(T, 400, 432); cx.restore(); });
    T.stroke('M-30 -30H30L40 0H-40Z', '#000', 1, .2);
  } };
}
/** The pieces are painted at a figure of 88 and drawn at the room's real one (about 72 room px: measured in the room, 26 Nov),
 *  so every piece stands at its true size beside you: a chair's back at your shoulder, the table at your waist. */
const HOUSE_ART_K = .82;
const _HS_BOXES = new Map();
function houseArt(id) { return HOUSE_ART[id] || _hsFinishArt(id); }
function houseArtBox(id) {
  if (_HS_BOXES.has(id)) return _HS_BOXES.get(id);
  const a = houseArt(id); if (!a) return [-30, -40, 30, 6];
  const b = HOUSE_ART[id] ? [Math.floor(a.box[0] * HOUSE_ART_K), Math.floor(a.box[1] * HOUSE_ART_K), Math.ceil(a.box[2] * HOUSE_ART_K), Math.ceil(a.box[3] * HOUSE_ART_K)] : a.box;
  _HS_BOXES.set(id, b); return b;
}
/** Paint a piece into a 2D context already set to room units round its foot. */
function housePaintPiece(cx, id, o) {
  const a = houseArt(id); if (!a || !window.GardenRoomArt) return false;
  const T = GardenRoomArt.kit(cx, 'hsart|' + id + '|' + ((o && o.v) | 0));
  cx.save(); if (HOUSE_ART[id]) cx.scale(HOUSE_ART_K, HOUSE_ART_K);
  try { a.draw(T, o || {}); } finally { cx.restore(); }
  return true;
}

/* ---------- textures: baked one to a task, kept a while ---------- */
const HOUSE_TEX_K = 2, HOUSE_TEX_MAX = 48;
const _hst = { queue: new Map(), pumping: false, keys: [], onReady: null, ms: [], urls: new Map() };
const houseTexKey = (id, v, lit) => 'gdhouse-' + id + '-' + ((v | 0) % 8) + (lit ? '-lit' : '') + (id === 'hf-banner' && typeof _hsBannerNow === 'function' ? '-' + _hsBannerNow() : '');
function _hsBakeCanvas(id, v, lit, K) {
  const a = houseArt(id); if (!a) return null;
  const [x0, y0, x1, y1] = houseArtBox(id), c = document.createElement('canvas');
  c.width = Math.ceil((x1 - x0) * K); c.height = Math.ceil((y1 - y0) * K);
  const cx = c.getContext('2d', { willReadFrequently: true }); cx.setTransform(K, 0, 0, K, -x0 * K, -y0 * K);
  try { housePaintPiece(cx, id, { v, lit }); cx.getImageData(0, 0, 1, 1); } catch (e) { console.error('[house art]', id, e); }   // (reading a pixel makes the canvas pay for its drawing now, not at upload)
  return c;
}
function _hsTexPump() {
  const scene = window.GardenNative && GardenNative.scene && GardenNative.scene();
  if (!scene || !_hst.queue.size) { _hst.pumping = false; _hst.queue.clear(); return; }
  const [key, job] = _hst.queue.entries().next().value; _hst.queue.delete(key);
  if (!scene.textures.exists(key)) {
    const t0 = performance.now(), c = _hsBakeCanvas(job.id, job.v, job.lit, HOUSE_TEX_K);
    if (c) { scene.textures.addCanvas(key, c); _hst.keys.push(key); }
    _hst.ms.push(Math.round((performance.now() - t0) * 10) / 10); if (_hst.ms.length > 40) _hst.ms.shift();
    while (_hst.keys.length > HOUSE_TEX_MAX) { const old = _hst.keys.shift(); if (typeof _hsTexInUse === 'function' && _hsTexInUse(old)) { _hst.keys.push(old); break; } if (scene.textures.exists(old)) scene.textures.remove(old); }
  }
  if (_hst.queue.size) setTimeout(_hsTexPump, 0);
  else { _hst.pumping = false; const f = _hst.onReady; if (f) { try { f(); } catch (e) { console.error('[house art]', e); } } }
}
/** The piece's texture key when it is baked; else null (it is queued, and onReady runs when the queue is empty). */
function houseTexture(scene, id, v, lit) {
  const key = houseTexKey(id, v, lit);
  if (!scene) return null;
  if (scene.textures.exists(key)) return key;
  if (!_hst.queue.has(key)) _hst.queue.set(key, { id, v: v | 0, lit: !!lit });
  if (!_hst.pumping) { _hst.pumping = true; setTimeout(_hsTexPump, 0); }
  return null;
}
/** The same picture as a data URL (the standard room draws spots as SVG). */
function houseArtUrl(id, v, lit) {
  const key = houseTexKey(id, v, lit); if (_hst.urls.has(key)) return _hst.urls.get(key);
  let url = ''; try { const c = _hsBakeCanvas(id, v, lit, 1.5); url = c ? c.toDataURL('image/png') : ''; } catch (e) { url = ''; }
  if (_hst.urls.size > 60) _hst.urls.delete(_hst.urls.keys().next().value);
  _hst.urls.set(key, url); return url;
}
