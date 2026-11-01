/* ============================================================
   THE THEMED DECORATIONS: seaside, cottage, spooky, festive, ruins. Their rows are in GARDEN_DECOR (the server checks against that file); those made at the yard are in GR_DESIGN.
   Plain fills: gardenArt adds the ink line and a soft shadow. y goes up from the ground at 0.
   ============================================================ */
(function () {
  if (typeof gartDefine !== 'function') return;
  const def = (id, box, draw) => gartDefine('decor:' + id, { box, fit: 'none', draw(o, r, A) { const night = !!(o.night || o.dusk); return draw(A, A.P, A.S, night, o, r); } });
  const stone = ['#8a8476', '#a39b8c', '#c4bdae'];
  const stonePile = (A, P, list) => list.map(([x, y, w, h], i) => P(stone[i % 2 ? 1 : 2], A.rrect(x, y, w, h, 2))).join('');

  /* ---------- seaside ---------- */
  def('dc-beach-hut', [72, 92], (A, P, S) => {
    let s = A.shadow(30, 4) + P('#fbf5ec', A.rect(-26, -60, 52, 60));
    for (let i = 0; i < 4; i++) s += P('#3a8ac4', A.rect(-26 + i * 13, -60, 6.5, 60));
    return s + P('#d8452a', 'M-32 -58L0 -84L32 -58z') + P('#a83a22', 'M0 -84L32 -58H14z', 0.6) + P('#f2c432', A.rrect(-10, -40, 20, 40, 2)) + S('#a8841a', 1, 'M0 -40V0') + P('#6a4a2a', A.circ(5, -20, 1.5)) + P('#c8a46a', A.rect(-30, -4, 60, 4));
  });
  def('dc-lighthouse', [60, 124], (A, P, S, night) => {
    let s = A.shadow(20, 4) + P('#fbf5ec', 'M-17 0L-11 -84H11L17 0z') + P('#d8352a', 'M-16 -22L-14.5 -42H14.500L16 -22z') + P('#d8352a', 'M-13.400 -62L-12 -82H12L13.400 -62z');
    s += P('#2a2a32', A.rect(-14, -88, 28, 4)) + P(night ? '#ffe28a' : '#bfe0f0', A.rect(-8, -104, 16, 16)) + S('#2a2a32', 1.2, 'M-8 -104V-88M0 -104V-88M8 -104V-88') + P('#d8352a', 'M-12 -104L0 -118L12 -104z');
    if (night) s += P('#ffe9a8', 'M8 -100L58 -112V-84z', 0.32) + P('#ffe9a8', 'M-8 -100L-58 -112V-84z', 0.32);
    return s + P('#2a2a32', A.rrect(-5, -18, 10, 18, 4));
  });
  def('dc-anchor', [60, 76], (A, P, S) => A.shadow(20, 3) + S('#4a525c', 5, 'M0 -60V-10') + S('#4a525c', 5, 'M-14 -50H14') + S('#4a525c', 5.4, 'M-24 -22Q-20 -2 0 -4Q20 -2 24 -22') + P('#4a525c', 'M-24 -28L-30 -16L-18 -19zM24 -28L30 -16L18 -19z') + `<circle cx="0" cy="-65" r="5" fill="none" stroke="#4a525c" stroke-width="3"/>` + S('#d8c48e', 2, 'M3 -62Q16 -48 6 -36T14 -12') + S('#7a828c', 1.2, 'M-1 -58V-12', 0.8));
  def('dc-lobster-pots', [68, 60], (A, P, S) => {
    const pot = (x, y, w) => P('#8a6642', A.rect(x - w / 2, y - 3, w, 3)) + S('#c8a46a', 1.6, `M${x - w / 2} ${y - 2}Q${x} ${y - 26} ${x + w / 2} ${y - 2}M${x - w * 0.25} ${y - 2}Q${x} ${y - 28} ${x + w * 0.25} ${y - 2}M${x - w * 0.42} ${y - 10}H${x + w * 0.42}M${x - w * 0.3} ${y - 17}H${x + w * 0.3}`);
    return A.shadow(28, 3) + pot(-13, 0, 28) + pot(14, 0, 28) + pot(0, -19, 28) + P('#d8352a', A.ell(25, -10, 5, 7)) + P('#fbf5ec', A.rect(20, -11, 10, 3));
  });
  def('dc-buoy', [44, 56], (A, P, S) => A.shadow(14, 3) + P('#d8352a', 'M-13 -6Q-14 -24 0 -30Q14 -24 13 -6Q0 2 -13 -6z') + P('#fbf5ec', 'M-13.500 -14Q0 -8 13.500 -14L12.500 -21Q0 -15 -12.500 -21z') + P('#ffffff', A.ell(-6, -24, 2.4, 3), 0.5) + S('#3a3a42', 2, 'M0 -30V-42') + P('#f2c432', A.circ(0, -44, 3)));
  def('dc-sandcastle', [76, 62], (A, P, S) => {
    const tw = (x, h) => P('#e4d6ae', A.rect(x - 8, -h, 16, h)) + P('#d3c294', `M${x - 9} ${-h}h4v-4h3v4h3v-4h3v4h4v3h-17z`);
    return A.shadow(30, 3) + P('#d3c294', A.ell(0, -3, 34, 5)) + tw(-20, 24) + tw(20, 24) + tw(0, 38) + P('#e4d6ae', A.rect(-14, -20, 28, 20)) + P('#a89a70', A.rrect(-5, -14, 10, 14, 4)) + S('#7a5a3a', 1, 'M0 -42V-54') + P('#d8452a', 'M0 -54L10 -50L0 -46z') + P('#f0d8c0', 'M-30 -1Q-27 -7 -24 -1z') + P('#e8a0a0', A.circ(29, -2, 2));
  });
  def('dc-shell-pile', [56, 34], (A, P, S) => {
    const sh = (x, y, c) => P(c, `M${x - 8} ${y}Q${x} ${y - 15} ${x + 8} ${y}Q${x} ${y + 3} ${x - 8} ${y}z`) + S('#8a6a5a', 0.7, `M${x} ${y - 9}V${y + 1}M${x - 3.4} ${y - 7}L${x - 3} ${y + 1}M${x + 3.4} ${y - 7}L${x + 3} ${y + 1}`, 0.7);
    return A.shadow(20, 3) + sh(-12, -1, '#f0d8c0') + sh(13, -1, '#e8b8b0') + sh(0, -8, '#fbeee0') + P('#3a6a8a', A.ell(21, -2, 3, 2)) + P('#f2c432', 'M-23 -1L-20 -7L-17 -1L-22 -4H-18z');
  });
  def('dc-net-rack', [120, 76], (A, P, S) => {
    let m = ''; for (let x = -38; x <= 38; x += 8) m += `M${x} -56Q${x + 2} -28 ${x * 0.8} -14`; for (let y = -48; y <= -18; y += 7) m += `M-41 ${y}Q0 ${y + 9} 41 ${y}`;
    return A.shadow(46, 3) + P('#7a5a3a', A.rect(-48, -62, 5, 62)) + P('#7a5a3a', A.rect(43, -62, 5, 62)) + P('#8a6642', A.rect(-52, -62, 104, 5)) + S('#c8b68a', 0.8, m, 0.85) + P('#c89a5a', A.ell(-30, -18, 3, 2)) + P('#c89a5a', A.ell(0, -13, 3, 2)) + P('#c89a5a', A.ell(30, -18, 3, 2));
  });

  /* ---------- cottage ---------- */
  def('dc-milk-churns', [64, 58], (A, P, S) => {
    const churn = (x, h) => P('#b8c0c6', `M${x - 9} 0V${-h + 12}Q${x - 9} ${-h + 7} ${x - 4.5} ${-h + 4}V${-h}H${x + 4.5}V${-h + 4}Q${x + 9} ${-h + 7} ${x + 9} ${-h + 12}V0z`) + P('#8a9298', A.rect(x - 6, -h - 3, 12, 3)) + P('#ffffff', A.rect(x - 7, -h + 13, 2.4, h - 16), 0.5) + S('#6a747c', 1, `M${x - 9} -5H${x + 9}M${x - 9} ${-h + 14}H${x + 9}`);
    return A.shadow(22, 3) + churn(-11, 34) + churn(12, 28);
  });
  def('dc-washing-line', [130, 84], (A, P, S) => {
    const sway = (s) => `<g class="gda-sway">${s}</g>`;
    return A.shadow(52, 2) + P('#7a5a3a', A.rect(-58, -72, 4, 72)) + P('#7a5a3a', A.rect(54, -72, 4, 72)) + S('#e8e4d8', 1, 'M-56 -68Q0 -58 56 -68') + sway(P('#e8607a', 'M-44 -64L-30 -62L-28 -36L-46 -38z') + P('#fbf5ec', 'M-22 -60L-2 -59L-1 -48L-6 -48L-6 -24L-19 -24L-19 -48L-24 -49z') + P('#3a7ac4', 'M6 -59L24 -60L26 -32L18 -32L15 -46L12 -32L4 -32z') + P('#f2c432', 'M32 -62L46 -64L48 -44L34 -42z'));
  });
  def('dc-clay-oven', [74, 66], (A, P, S, night) => A.shadow(28, 3) + P('#a39b8c', A.rect(-30, -14, 60, 14)) + P('#c8855a', 'M-27 -14Q-26 -52 0 -52Q26 -52 27 -14z') + P('#dda070', 'M-22 -16Q-20 -44 -4 -48Q-14 -34 -14 -16z', 0.7) + P(night ? '#ff9a3a' : '#3a2018', 'M-11 -14Q-11 -32 0 -32Q11 -32 11 -14z') + P(night ? '#ffd97a' : '#5a3a28', A.ell(0, -16, 7, 3)) + S('#6a7078', 4, 'M16 -44V-58') + S('#ffffff', 1.4, 'M16 -62q3 -3 0 -6t0 -6', 0.45));
  def('dc-cottage-gate', [64, 64], (A, P, S, night, o) => {
    const side = (o.r || 0) % 2 === 1;
    if (side) return A.shadow(8, 3) + P('#efe8d8', A.rrect(-4, -50, 8, 50, 2));
    let s = A.shadow(30, 3) + P('#6a4a2a', A.rect(-31, -52, 6, 52)) + P('#6a4a2a', A.rect(25, -52, 6, 52)) + P('#8a6642', A.circ(-28, -54, 4)) + P('#8a6642', A.circ(28, -54, 4));
    for (let x = -21; x <= 19; x += 8) { const h = 44 - Math.abs(x + 1) * 0.3; s += P('#efe8d8', `M${x} 0V${-h}l3 -4l3 4V0z`); }
    return s + P('#d8d0be', A.rect(-24, -32, 48, 4)) + P('#d8d0be', A.rect(-24, -12, 48, 4)) + P('#c8352a', A.circ(-28, -40, 2.4)) + P('#e8607a', A.circ(29, -35, 2.4));
  });
  def('dc-tea-table', [64, 62], (A, P, S) => A.shadow(22, 3) + S('#7a5a3a', 2.6, 'M-14 0L-10 -26M14 0L10 -26') + P('#fbf5ec', 'M-20 -28H20L25 -14Q20 -18 14 -14T0 -14T-14 -14T-25 -14z') + P('#3a8ac4', A.ell(-2, -36, 8, 7)) + P('#3a8ac4', 'M6 -38L14 -43L12 -36L6 -33z') + S('#3a8ac4', 1.8, 'M-10 -39Q-16 -36 -10 -32') + P('#2a6a9a', A.circ(-2, -44, 1.6)) + P('#fbf5ec', A.rrect(9, -34, 8, 5, 1.6)) + S('#ffffff', 1, 'M-2 -48q2 -3 0 -6', 0.6));
  def('dc-sleeping-cat', [60, 36], (A, P, S) => A.shadow(22, 3) + P('#e8903a', 'M-22 0Q-26 -18 -4 -19Q18 -20 22 -6Q23 0 16 0z') + P('#e8903a', A.ell(-15, -8, 9, 8)) + P('#e8903a', 'M-22 -14L-20 -22L-15 -16zM-12 -15L-8 -22L-7 -13z') + S('#b8641a', 1.4, 'M-2 -18Q0 -10 -3 -5M7 -17Q9 -10 6 -5M15 -13Q16 -9 14 -6') + S('#3a2010', 0.9, 'M-20 -9q1.4 1 2.8 0M-14 -9q1.4 1 2.8 0') + P('#e8607a', A.circ(-16, -5.4, 1)) + S('#e8903a', 4, 'M20 -3Q26 0 22 4Q12 6 2 2') + P('#fbf5ec', A.ell(-1, -2, 5, 2)));
  def('dc-lavender-tub', [58, 56], (A, P, S, n, o, r) => {
    let st = '', fl = ''; for (let i = 0; i < 11; i++) { const x = -16 + i * 3.2 + (r() - 0.5), h = 24 + r() * 10; st += `M${x * 0.5} -18Q${x * 0.8} ${-18 - h * 0.5} ${x} ${-18 - h}`; fl += A.ell(x, -18 - h, 1.8, 4); }
    return A.shadow(16, 3) + `<g class="gda-sway">${S('#6f8a5a', 1.2, st)}${P('#8a6ac8', fl)}</g>` + P('#a87c4f', 'M-16 -20H16L13 0H-13z') + S('#6a7078', 1.8, 'M-15.500 -14H15.500M-13.700 -5H13.700');
  });

  /* ---------- spooky ---------- */
  def('dc-gravestone', [52, 58], (A, P, S) => A.shadow(18, 3) + P(stone[1], 'M-14 0V-30Q-14 -44 0 -44Q14 -44 14 -30V0z') + P(stone[2], 'M-11 -2V-30Q-11 -40 -2 -41Q-8 -34 -8 -2z', 0.7) + S(stone[0], 1.5, 'M0 -36V-22M-5 -31H5') + S(stone[0], 1, 'M-7 -16H7M-5 -11H5') + P('#5a8a4a', A.ell(-11, -1, 7, 2.4)) + P('#6f9a4a', A.ell(11, -1, 5, 2)));
  def('dc-crooked-fence', [64, 56], (A, P, S, n, o) => {
    if ((o.r || 0) % 2 === 1) return A.shadow(8, 3) + P('#3a3a42', A.rect(-2, -42, 4, 42));
    return A.shadow(30, 3) + S('#3a3a42', 2.6, 'M-30 -30Q0 -38 30 -28M-30 -14Q0 -18 30 -12') + [[-28, -42, -2], [-16, -38, 3], [-5, -46, -3], [7, -36, 2], [18, -44, -1], [28, -38, 4]].map(([x, y, l]) => S('#3a3a42', 3.4, `M${x} 0L${x + l} ${y}`) + P('#3a3a42', `M${x + l - 3.4} ${y}L${x + l} ${y - 8}L${x + l + 3.4} ${y}z`)).join('');
  });
  def('dc-cauldron', [60, 62], (A, P, S, night) => A.shadow(22, 3) + P('#ff8a3a', A.ell(0, -2, 15, 4), night ? 0.9 : 0.4) + P('#ffd97a', A.ell(0, -2, 7, 2), night ? 0.9 : 0.4) + S('#22222a', 2.4, 'M-18 0L-13 -10M18 0L13 -10') + P('#2a2a32', 'M-21 -30Q-25 -6 0 -5Q25 -6 21 -30z') + P('#4a4a58', 'M-16 -26Q-18 -12 -8 -9Q-12 -18 -11 -26z', 0.7) + P('#7ae84a', A.ell(0, -30, 21, 5)) + P('#22222a', A.rrect(-24, -34, 48, 4, 2), 0) + P('#a8ff7a', A.circ(-8, -33, 2.6)) + P('#a8ff7a', A.circ(5, -36, 3.2)) + P('#a8ff7a', A.circ(11, -31, 1.8)) + `<g class="gda-bob">${P('#a8ff7a', A.circ(-2, -46, 1.8), 0.7)}${P('#a8ff7a', A.circ(7, -52, 1.3), 0.5)}</g>`);
  def('dc-raven-post', [50, 84], (A, P, S) => A.shadow(10, 3) + P('#54392a', 'M-3 0L-4 -58H4L3 0z') + P('#22222a', 'M-13 -60Q-8 -76 6 -73Q14 -72 15 -66L22 -64L14 -62Q10 -56 0 -56L-14 -50z') + P('#3a3a48', 'M-8 -64Q-2 -71 6 -69Q0 -62 -8 -60z') + P('#f2c432', A.circ(9, -68, 1.3)) + S('#54392a', 1.6, 'M3 -44L13 -50'));
  def('dc-sheet-ghost', [52, 76], (A, P, S, night) => `<g class="gda-bob">${(night ? P('#cfe8ff', A.ell(0, -32, 26, 34), 0.2) : '')}${P('#f6f6fb', 'M-15 -6Q-14 -44 -13 -52Q-9 -68 0 -68Q9 -68 13 -52Q14 -44 15 -6L10 -13L5 -5L0 -13L-5 -5L-10 -13z')}${P('#1a1a22', A.ell(-5, -50, 2.6, 3.6))}${P('#1a1a22', A.ell(5, -50, 2.6, 3.6))}${P('#1a1a22', A.ell(0, -41, 3, 3.6))}${P('#f6f6fb', 'M-14 -38L-22 -28L-14 -26zM14 -38L22 -28L14 -26z')}</g>` + A.shadow(14, 2));
  def('dc-dead-tree', [96, 120], (A, P, S) => A.shadow(26, 4) + P('#3a2a22', 'M-9 0Q-5 -28 -6 -50H6Q5 -28 11 0z') + S('#3a2a22', 5.4, 'M-2 -48Q-16 -60 -28 -82M2 -50Q14 -62 22 -92') + S('#3a2a22', 3, 'M-16 -62L-36 -66M-22 -74L-16 -94M14 -62L34 -70M18 -78L6 -100') + P('#1a1210', A.ell(1, -28, 3.4, 5)) + P('#22222a', 'M26 -68Q31 -72 35 -67L40 -66L35 -64Q30 -62 26 -64z'));
  def('dc-pumpkin-stack', [60, 66], (A, P, S, night) => {
    const pk = (x, y, rx, ry) => P('#e87a1a', A.ell(x, y, rx, ry)) + S('#a8501c', 1, `M${x - rx * 0.4} ${y - ry * 0.9}Q${x - rx * 0.6} ${y} ${x - rx * 0.4} ${y + ry * 0.9}M${x + rx * 0.4} ${y - ry * 0.9}Q${x + rx * 0.6} ${y} ${x + rx * 0.4} ${y + ry * 0.9}`);
    const face = night ? '#ffd36a' : '#3a1a0a';
    return A.shadow(24, 3) + pk(-11, -11, 14, 11) + pk(13, -9, 11, 9) + pk(1, -30, 11, 9) + S('#5f7a3a', 2.6, 'M1 -39V-46') + P(face, 'M-4 -32l3 -2v4zM6 -32l-3 -2v4zM-4 -27q5 3 10 0q-5 5 -10 0z') + P(face, 'M-16 -14l3 -2v4zM-6 -14l-3 -2v4zM-16 -8q5 3 10 0q-5 5 -10 0z');
  });

  /* ---------- festive ---------- */
  def('dc-fir-tree', [76, 110], (A, P, S, night) => {
    const lit = night ? '#ffe98a' : '#f2c432';
    return A.shadow(24, 4) + P('#6a4426', A.rect(-5, -14, 10, 14)) + P('#2f6a3a', 'M-30 -12L0 -46L30 -12z') + P('#3a7a42', 'M-25 -34L0 -66L25 -34z') + P('#4a8a4a', 'M-18 -56L0 -88L18 -56z') + S('#d8352a', 1.6, 'M-22 -20Q0 -12 22 -24M-15 -42Q0 -36 17 -46M-9 -62Q0 -58 10 -66') + [[-14, -18, '#d8352a'], [10, -20, '#3a7ac4'], [-8, -38, lit], [10, -42, '#d8352a'], [-3, -60, '#3a7ac4'], [6, -64, lit], [20, -16, lit], [-22, -14, lit]].map(([x, y, c]) => P(c, A.circ(x, y, 2.4))).join('') + P(lit, 'M0 -100L2.600 -93L9.500 -92.500L4 -88L6 -81L0 -85L-6 -81L-4 -88L-9.500 -92.500L-2.600 -93z');
  });
  def('dc-gift-pile', [70, 50], (A, P, S) => {
    const box = (x, w, h, y, c, c2) => P(c, A.rect(x - w / 2, y - h, w, h)) + P(c2, A.rect(x - 2, y - h, 4, h)) + P(c2, A.rect(x - w / 2, y - h / 2 - 2, w, 4)) + P(c2, `M${x} ${y - h}q-7 -7 -8 -1t8 1q7 -7 8 -1t-8 1z`);
    return A.shadow(28, 3) + box(-15, 26, 20, 0, '#d8352a', '#f2c432') + box(14, 22, 16, 0, '#3a7ac4', '#fbf5ec') + box(0, 18, 13, -17, '#3f8a4a', '#fbf5ec');
  });
  def('dc-candy-cane', [52, 76], (A, P, S) => {
    const d = 'M0 0V-48Q0 -62 -11 -62Q-20 -62 -20 -52';
    return A.shadow(8, 3) + S('#b8301e', 9, d) + S('#fbf5ec', 7.4, d) + `<path d="${d}" fill="none" stroke="#d8352a" stroke-width="7.4" stroke-dasharray="6 7"/>`;
  });
  def('dc-maypole', [96, 132], (A, P, S) => {
    const rib = (c, x, y) => S(c, 1.8, `M0 -112Q${x * 0.7} -60 ${x} ${y}`);
    return A.shadow(32, 4) + rib('#d8352a', -36, -8) + rib('#3a7ac4', -18, -2) + rib('#f2c432', 18, -2) + rib('#3f8a4a', 36, -8) + P('#c8a46a', A.rect(-2.6, -114, 5.200, 114)) + P('#3f8a4a', A.ell(0, -112, 10, 4)) + P('#e8607a', A.circ(-6, -113, 2.4)) + P('#fbf5ec', A.circ(0, -115, 2.4)) + P('#f2c432', A.circ(6, -113, 2.4)) + P('#d8352a', 'M0 -118V-128L12 -124L0 -120z');
  });
  def('dc-bell-arch', [120, 100], (A, P, S) => A.shadow(46, 3) + P('#3f6a3a', 'M-50 0V-52Q-50 -86 0 -86Q50 -86 50 -52V0H38V-52Q38 -74 0 -74Q-38 -74 -38 -52V0z') + P('#4f8a4a', 'M-48 -54Q-46 -82 -6 -84Q-34 -76 -40 -50z', 0.7) + [[-44, -30], [44, -30], [-40, -62], [40, -62], [0, -80], [-22, -76], [22, -76]].map(([x, y]) => P('#d8352a', A.circ(x, y, 2.6))).join('') + `<g class="gda-sway">${S('#d8352a', 1.3, 'M0 -74V-64')}${P('#e0b43a', 'M-8 -48Q-7 -64 0 -64Q7 -64 8 -48z')}${P('#a8841a', A.circ(0, -46, 2.4))}</g>` + P('#d8352a', 'M0 -80L-10 -84V-76zM0 -80L10 -84V-76z'));
  def('dc-snow-globe', [56, 64], (A, P, S) => {
    let f = ''; for (const [x, y] of [[-10, -34], [8, -40], [-3, -22], [12, -26], [-12, -22], [3, -46]]) f += A.circ(x, y, 1);
    return A.shadow(18, 3) + P('#6a4426', 'M-17 0L-14 -12H14L17 0z') + P('#e0b43a', A.rect(-15, -13, 30, 2)) + P('#cfe8f2', A.circ(0, -33, 20), 0.75) + P('#fbfdff', 'M-18 -24Q0 -32 18 -24Q10 -13 0 -13Q-10 -13 -18 -24z') + P('#2f6a3a', 'M-6 -21L0 -40L6 -21z') + P('#ffffff', f) + P('#ffffff', A.ell(-9, -44, 3.4, 5), 0.6);
  });
  def('dc-carousel-horse', [64, 86], (A, P, S) => `<g class="gda-bob">${S('#e0b43a', 2.6, 'M0 -82V0')}${P('#fbf5ec', 'M-17 -38Q-18 -28 -8 -28H9Q15 -28 16 -36L21 -46L23 -56L16 -59L12 -48Q2 -42 -10 -42Q-15 -42 -17 -38z')}${P('#fbf5ec', 'M16 -59L25 -55L27 -50L21 -49z')}${S('#fbf5ec', 3.2, 'M-12 -30L-16 -16M-6 -30L-4 -14M7 -30L11 -14M12 -30L18 -18')}${P('#d8352a', 'M-8 -43H6L8 -33H-9z')}${P('#3a7ac4', 'M15 -60L8 -47L13 -46L19 -58z')}${S('#3a7ac4', 3, 'M-17 -38Q-24 -32 -22 -22')}${P('#2a2a32', A.circ(21, -55, 1))}</g>` + P('#d8352a', A.ell(0, -2, 15, 4)) + P('#e0b43a', A.ell(0, -3.4, 11, 2.4)));

  /* ---------- ruins ---------- */
  def('dc-broken-column', [52, 90], (A, P, S) => A.shadow(18, 3) + P(stone[0], A.rect(-17, -7, 34, 7)) + P(stone[1], 'M-12 -7L-11 -62L-5 -68L2 -60L7 -66L11 -60L12 -7z') + P(stone[2], 'M-10 -8L-9 -60L-5 -64V-8z', 0.8) + S(stone[0], 1, 'M-2 -8V-60M4 -8V-60M9 -8V-58') + P('#5a8a4a', A.ell(-10, -4, 9, 3.4)) + S('#4f8a3a', 1.6, 'M10 -8Q16 -26 8 -44') + P('#5a9a4a', A.ell(12, -28, 2.4, 1.4)) + P('#5a9a4a', A.ell(10, -38, 2.4, 1.4)));
  def('dc-ruin-arch', [128, 104], (A, P, S) => A.shadow(50, 3) + P(stone[1], 'M-52 0V-54Q-52 -88 -10 -92L-8 -80Q-38 -76 -38 -52V0z') + P(stone[2], 'M-50 -2V-54Q-50 -80 -24 -88Q-44 -70 -44 -50V-2z', 0.7) + P(stone[1], 'M38 0V-32L41 -40L46 -36L52 -44V0z') + S(stone[0], 1, 'M-52 -14H-38M-52 -30H-38M-52 -46H-38M-48 -66L-36 -60M-34 -82L-27 -72M38 -14H52M38 -28H52') + P('#5a8a4a', A.ell(-44, -1, 12, 3.4)) + P('#6f9a4a', A.ell(-22, -86, 11, 3.2)) + P(stone[1], A.rrect(4, -9, 18, 9, 2)) + P(stone[2], A.rrect(-14, -6, 11, 6, 2)));
  def('dc-stone-head', [80, 72], (A, P, S) => A.shadow(30, 3) + P(stone[1], 'M-26 0Q-30 -30 -24 -44Q-14 -60 4 -58Q24 -56 27 -36Q30 -18 26 0z') + P(stone[2], 'M-22 -2Q-26 -30 -20 -42Q-12 -54 -2 -55Q-14 -34 -12 -2z', 0.7) + S(stone[0], 3, 'M-16 -32Q-10 -36 -3 -32M8 -33Q14 -37 20 -32') + S(stone[0], 2, 'M-13 -28h7M11 -28h7') + P(stone[0], 'M2 -30L-3 -14H6z') + S(stone[0], 2.6, 'M-9 -7Q2 -3 13 -7') + P('#5a8a4a', A.ell(-4, -55, 13, 4)) + P('#5a8a4a', A.ell(24, -1, 11, 3)) + S(stone[0], 1, 'M18 -50L12 -42L16 -34'));
  def('dc-old-wall', [64, 58], (A, P, S, n, o) => {
    if ((o.r || 0) % 2 === 1) return A.shadow(8, 3) + stonePile(A, P, [[-7, -12, 14, 12], [-7, -24, 14, 12], [-6, -34, 11, 10]]);
    return A.shadow(30, 3) + stonePile(A, P, [[-31, -11, 21, 11], [-9, -11, 20, 11], [12, -11, 19, 11], [-31, -22, 14, 11], [-16, -22, 20, 11], [5, -22, 18, 11], [-29, -33, 18, 11], [-10, -33, 14, 11], [-24, -42, 13, 9]]) + P('#5a8a4a', A.ell(-22, -44, 8, 2.4)) + P('#6f9a4a', A.ell(16, -24, 8, 2.4)) + S('#4f8a3a', 1.4, 'M-6 -33Q-2 -20 -8 -8') + P(stone[1], A.rrect(26, -6, 7, 6, 1.6));
  });
  def('dc-fallen-capital', [70, 38], (A, P, S) => A.shadow(26, 3) + P(stone[1], 'M-26 0V-13H26V0z') + P(stone[2], 'M-30 -13H30V-20H-30z') + P(stone[1], A.ell(-23, -21, 8.4, 7.4)) + P(stone[1], A.ell(23, -21, 8.4, 7.4)) + `<circle cx="-23" cy="-21" r="3.4" fill="none" stroke="${stone[0]}" stroke-width="1.4"/><circle cx="23" cy="-21" r="3.4" fill="none" stroke="${stone[0]}" stroke-width="1.4"/>` + S(stone[0], 1, 'M-18 -13V0M-8 -13V0M2 -13V0M12 -13V0') + P('#5a8a4a', A.ell(0, -1, 14, 2.4)));
  def('dc-mossy-steps', [68, 44], (A, P, S) => A.shadow(28, 3) + P(stone[0], A.rrect(-30, -9, 60, 9, 1.4)) + P(stone[1], A.rrect(-24, -18, 48, 9, 1.4)) + P(stone[2], A.rrect(-18, -27, 34, 9, 1.4)) + P('#5a8a4a', A.ell(-22, -9, 8, 2)) + P('#6f9a4a', A.ell(15, -18, 8, 2)) + P('#5a8a4a', A.ell(-6, -27, 7, 1.6)) + P('#e8e4d0', A.circ(24, -11, 1.2)) + P('#f2c432', A.circ(-27, -11, 1.2)));
  def('dc-stone-lion', [66, 66], (A, P, S) => A.shadow(26, 3) + P(stone[0], A.rect(-26, -8, 52, 8)) + P(stone[1], 'M-23 -8Q-26 -28 -6 -30H10L16 -8z') + P(stone[1], 'M10 -8V-20H18V-8z') + P(stone[2], A.circ(9, -36, 14)) + P(stone[1], A.circ(9, -35, 9)) + P(stone[0], A.circ(5, -37, 1.2)) + P(stone[0], A.circ(13, -37, 1.2)) + P(stone[0], 'M7 -33h4l-2 3z') + S(stone[1], 3, 'M-22 -14Q-32 -20 -28 -30') + P(stone[2], A.circ(-28, -32, 3)) + P('#5a8a4a', A.ell(-18, -8, 9, 2.4)));
})();
