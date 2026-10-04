/* ============================================================
   ANIMATION PACK "asia-west": Western Asia (Turkey, the Caucasus, the Levant, Iraq, Iran, the Arabian Peninsula).
   PURE classic script. The full-screen openings come from the scenes registered by the 71-anim-asia2 files (B.scenes());
   this file adds one small 64x64 symbol per country and one per small city or town. Everyday and architectural
   subjects only: food, plants, craft, music, buildings. Built with asiaBuilder (71-anim-asia.js).
   ============================================================ */
(function () {
  const B = asiaBuilder('west');
  B.scenes();
  // ---- small local helpers (constants only) ----
  const stars = (pts) => pts.map(([x, y], i) => `<circle class="k x-twinkle" style="--d:${((i * 0.37) % 2).toFixed(2)}s" cx="${x}" cy="${y}" r="0.9"/>`).join('');
  const gnd = (y, x1 = 2, x2 = 62) => `<path class="lm" d="M${x1} ${y}H${x2}"/>`;
  const sun = (x, y, r) => `<g class="x-pulse"><circle class="c" cx="${x}" cy="${y}" r="${r}"/></g>`;
  const moon = (x, y, r) => `<g class="x-glow"><circle class="w lc" cx="${x}" cy="${y}" r="${r}"/></g>`;
  const wave = (y, cls) => `<path class="${cls} x-wave" d="M-12 ${y}q3-3 6 0${'t6 0'.repeat(14)}"/>`;
  const bird = (x, y, d) => `<g class="x-bob" style="--d:${d}s"><path class="lk" d="M${x} ${y}q3-4 6 0q3-4 6 0"/></g>`;
  const steam = (x, y, d) => `<path class="lm x-steam" style="--d:${d}s" d="M${x} ${y}q-3-3 0-6t0-6"/>`;
  const dunes = (y) => `<path class="s" d="M0 ${y}q14-8 28-2t36-3v${64 - y}H0z"/>`;
  const palm = (x, y, h, d) => `<path class="lk t" d="M${x} ${y}q1-${h / 2} -1-${h}"/><g class="x-swing o-b" style="--d:${d}s"><path class="c" d="M${x - 1} ${y - h}q-8-2-11 4 6-3 11-1zM${x - 1} ${y - h}q8-2 11 4-6-3-11-1zM${x - 1} ${y - h}q-3-8-9-8 5 2 9 8zM${x - 1} ${y - h}q3-8 9-8-5 2-9 8z"/></g>`;

  // ================= TURKEY =================
  B.element('TR', { id: 'tulip', label: 'Tulip', colour: 'red', mood: 'cheerful', tags: ['flower', 'spring'], season: ['spring'],
    svg: () => '<g class="x-swing o-b"><path class="lc t" d="M32 62V30"/><path class="c" d="M32 56q-12-2-16-14 11 0 16 14zM32 50q10-2 14-12-9 0-14 12z"/>' +
      '<path class="c" d="M20 14l6 7 6-10 6 10 6-7v14q0 14-12 14t-12-14z"/><path class="w" d="M32 11l-3 14q3 6 3 14 0-8 3-14z" opacity="0.55"/><path class="lk" d="M26 21l2 14M38 21l-2 14"/></g>' +
      '<g class="x-float"><circle class="s" cx="52" cy="22" r="2"/></g><g class="x-float" style="--d:1s"><circle class="s" cx="10" cy="30" r="1.6"/></g>' + gnd(62, 6, 58) });
  B.place('goreme', { id: 'balloons', label: 'Hot-air balloons', colour: 'orange', mood: 'dreamy', tags: ['balloon', 'rocks'],
    svg: () => sun(52, 40, 5) +
      '<g class="x-float"><path class="c" d="M12 6q-8 0-8 9 0 6 6 11h4q6-5 6-11 0-9-8-9z"/><path class="lk" d="M10 26l-1 3M14 26l1 3"/><rect class="m" x="9" y="29" width="6" height="3"/><path class="w" d="M12 6v20M7 10q5 3 10 0" opacity="0.5"/></g>' +
      '<g class="x-float" style="--d:0.9s"><path class="s" d="M42 8q-7 0-7 8 0 5 5 9h4q5-4 5-9 0-8-7-8z"/><path class="lk" d="M40 25l-1 3M44 25l1 3"/><rect class="m" x="39" y="28" width="6" height="3"/></g>' +
      '<g class="x-float" style="--d:1.7s"><path class="w lk" d="M28 20q-5 0-5 6 0 4 4 7h2q4-3 4-7 0-6-5-6z"/><rect class="c" x="26" y="34" width="4" height="2.5"/></g>' +
      '<path class="m" d="M0 62V50l8-6 4 6 4-14 5 14 3-6 6 8 6-12 6 12 4-8 6 14v8z"/><path class="c" d="M8 62V44l4-10 4 10v18zM46 62V46l4-12 4 12v16z"/>' +
      '<rect class="k x-blink" x="11" y="48" width="2" height="3"/><rect class="k x-blink" style="--d:0.6s" x="49" y="48" width="2" height="3"/>' + gnd(62) });

  // ================= CYPRUS =================
  B.element('CY', { id: 'halloumi', label: 'Grilled halloumi', colour: 'amber', mood: 'cosy', tags: ['food', 'cheese'],
    svg: () => steam(20, 30, 0) + steam(32, 28, 0.7) + steam(44, 30, 1.4) +
      '<g class="x-bob" style="--ad:3.4s"><path class="s" d="M6 40q0-8 8-8h36q8 0 8 8z"/><path class="c" d="M10 38l8-4h28l8 4v6H10z"/><path class="w" d="M12 44h40v4H12z"/>' +
      '<path class="lk t" d="M20 36l3 6M28 35l3 7M36 35l3 7M44 36l3 6"/></g>' +
      '<g class="x-swing o-b"><path class="w lk" d="M50 20q4-6 8-3-2 6-8 3z"/><path class="lc" d="M54 18l-2 4"/></g>' +
      '<path class="k" d="M4 54h56v4H4z"/><g class="x-flicker"><path class="lm" d="M10 60q2-3 4 0M26 60q2-3 4 0M42 60q2-3 4 0"/></g>' });
  B.place('paphos', { id: 'aphrodite-rock', label: "Aphrodite's rock", colour: 'teal', mood: 'dreamy', tags: ['sea', 'rocks', 'shell'],
    svg: () => sun(14, 14, 6) + bird(34, 12, 0.4) + bird(44, 20, 1.2) +
      '<path class="s" d="M0 38h64v26H0z"/>' +
      '<path class="m" d="M16 48q0-12 6-14 4-8 10-4 6 0 6 10l5 8z"/><path class="m" d="M44 48q0-8 5-9 3-5 7-1 3 2 2 10z"/><path class="lk" d="M24 36l3 10M34 36l-2 10"/>' +
      wave(46, 'lw') + wave(52, 'lc') + wave(58, 'lw') +
      '<g class="x-pop" style="--d:0.5s"><path class="w lk" d="M8 56q4-6 8 0-4 3-8 0zM12 56v-3"/></g><g class="x-rise"><circle class="w" cx="30" cy="52" r="1.3"/></g>' });

  // ================= GEORGIA =================
  B.element('GE', { id: 'khachapuri', label: 'Khachapuri boat', colour: 'orange', mood: 'cosy', tags: ['food', 'bread'],
    svg: () => steam(22, 24, 0) + steam(34, 22, 0.6) + steam(46, 24, 1.2) +
      '<g class="x-bob" style="--ad:3.6s"><path class="c" d="M3 38q10-14 29-14t29 14q-10 14-29 14T3 38z"/>' +
      '<path class="w" d="M13 38q8-8 19-8t19 8q-8 8-19 8t-19-8z"/><path class="s" d="M16 38q7-6 16-6t16 6q-7 6-16 6t-16-6z"/>' +
      '<g class="x-pulse" style="--ad:2.4s"><circle class="c" cx="32" cy="38" r="5.5"/></g><circle class="w" cx="30.5" cy="36.5" r="1.4"/>' +
      '<path class="lk" d="M8 40l3 1M54 40l-3 1M20 48l2-2M44 48l-2-2"/><rect class="w" x="42" y="33" width="4" height="3" rx="0.6"/></g>' + gnd(58, 8, 56) });

  // ================= ARMENIA =================
  B.element('AM', { id: 'apricot', label: 'Apricot branch', colour: 'orange', mood: 'cheerful', tags: ['fruit', 'tree'], season: ['summer'],
    svg: () => '<path class="lk t" d="M2 10q18 4 30 2t30 8"/>' +
      '<g class="x-swing o-t"><path class="lk" d="M20 12v8"/><circle class="c" cx="20" cy="29" r="9"/><path class="lk" d="M20 21q-2 8 0 17"/><circle class="w" cx="16" cy="25" r="1.8"/></g>' +
      '<g class="x-swing o-t" style="--d:0.8s"><path class="lk" d="M44 14v10"/><circle class="c" cx="44" cy="34" r="10"/><path class="lk" d="M44 24q-2 9 0 20"/><circle class="w" cx="40" cy="30" r="2"/></g>' +
      '<path class="m" d="M30 12q-6 4-4 12 6-2 4-12zM52 20q-2 7 4 10 3-6-4-10zM8 12q6 0 8 6-6 0-8-6z"/>' +
      '<g class="x-pop" style="--d:0.4s"><circle class="w lc" cx="32" cy="8" r="2.2"/></g><g class="x-fall" style="--d:1s"><path class="w" d="M56 36q2 2 0 4-2-2 0-4z"/></g>' + gnd(60, 8, 56) });

  // ================= AZERBAIJAN =================
  B.element('AZ', { id: 'tea-glass', label: 'Pear-shaped tea glass', colour: 'red', mood: 'cosy', tags: ['tea', 'drink'],
    svg: () => steam(28, 20, 0) + steam(36, 18, 0.8) +
      '<ellipse class="c" cx="32" cy="55" rx="22" ry="5"/><ellipse class="w" cx="32" cy="53" rx="15" ry="3"/>' +
      '<g class="x-bob" style="--ad:3.8s"><path class="w lk" d="M22 22h20q-1 6-5 9 5 4 5 11 0 9-10 9t-10-9q0-7 5-11-4-3-5-9z"/>' +
      '<path class="c" d="M24 38q8-3 16 0 2 4 0 7-3 6-8 6t-8-6q-2-3 0-7z"/><path class="w" d="M26 24h3v6h-3z" opacity="0.7"/></g>' +
      '<g class="x-pop" style="--d:0.6s"><rect class="w lk" x="48" y="46" width="5" height="5" rx="0.8"/></g><path class="lk" d="M30 36v4"/>' });

  // ================= LEBANON =================
  B.element('LB', { id: 'cedar', label: 'Cedar of Lebanon', colour: 'green', mood: 'proud', tags: ['tree', 'mountain'],
    svg: () => stars([[8, 8], [54, 10], [46, 20]]) + moon(14, 18, 4) +
      '<path class="m" d="M0 56l12-14 8 8 12-18 14 20 6-8 12 12v10H0z" opacity="0.6"/><path class="w" d="M32 32l-3 5 3-1 3 2z"/>' +
      '<path class="lk t" d="M30 62q1-10 0-18M33 62q-1-10 0-16"/>' +
      '<g class="x-swing o-b"><path class="c" d="M8 40q12-4 24-3 12-1 24 3-6 3-12 2 7 2 8 6-8 0-14-3 6 4 4 8-8-2-14-6-6 4-14 6-2-4 4-8-6 3-14 3 1-4 8-6-6 0-10-2z"/>' +
      '<path class="lk" d="M14 41q18-3 36 0"/></g>' + gnd(62, 6, 58) });

  // ================= SYRIA =================
  B.element('SY', { id: 'damask-rose', label: 'Damask rose', colour: 'pink', mood: 'dreamy', tags: ['flower', 'rose'],
    svg: () => '<g class="x-swing o-b"><path class="lc t" d="M32 60V38"/><path class="c" d="M32 56q-12-2-16-12 11 0 16 12z" opacity="0.8"/><path class="m" d="M32 50q9-1 13-9-8 0-13 9z"/><path class="lk" d="M30 52l-3 2M34 46l3 1"/>' +
      '<circle class="c" cx="32" cy="24" r="15"/><path class="w" d="M20 22q6-8 14-5 6 3 6 9-4 8-12 7-8-3-8-11z"/><path class="c" d="M25 24q4-6 9-3 4 3 2 8-5 4-10 0z"/>' +
      '<path class="w lk" d="M29 24q3-3 6 0t-1 5"/></g>' +
      '<g class="x-fall"><path class="c" d="M50 8q3 2 2 6-4-1-2-6z"/></g><g class="x-fall" style="--d:1.3s"><path class="c" d="M12 10q3 2 2 6-4-1-2-6z"/></g>' });
  B.place('palmyra', { id: 'colonnade', label: 'Colonnade at sunset', colour: 'amber', mood: 'calm', tags: ['columns', 'ruins', 'desert'],
    svg: () => '<g class="x-pulse" style="--ad:4s"><circle class="c" cx="32" cy="30" r="12"/></g><circle class="w" cx="32" cy="30" r="7"/>' + bird(8, 10, 0.2) + bird(44, 8, 1) +
      '<path class="s" d="M0 52q16-6 32-2t32-3v17H0z"/>' +
      [6, 17, 28, 39, 50].map((x, i) => `<rect class="${i % 2 ? 'm' : 'c'}" x="${x}" y="${i === 2 ? 34 : 30 + (i % 2) * 3}" width="5" height="${i === 2 ? 20 : 24 - (i % 2) * 3}"/><rect class="c" x="${x - 1}" y="${i === 2 ? 32 : 28 + (i % 2) * 3}" width="7" height="2.4"/><rect class="c" x="${x - 1}" y="${i === 2 ? 52 : 52}" width="7" height="2.4"/>`).join('') +
      '<rect class="m" x="4" y="26" width="26" height="2.4"/><rect class="m" x="38" y="26" width="22" height="2.4"/>' +
      '<g class="x-slidel"><path class="lm" d="M4 58h10M24 60h14M44 58h12"/></g>' + gnd(55, 2, 62) });

  // ================= ISRAEL =================
  B.element('IL', { id: 'jaffa-orange', label: 'Jaffa orange', colour: 'orange', mood: 'cheerful', tags: ['fruit', 'citrus'],
    svg: () => '<g class="x-wobble"><circle class="c" cx="24" cy="38" r="17"/><circle class="w" cx="17" cy="31" r="2.6" opacity="0.8"/>' +
      '<path class="lk" d="M20 44h0M28 46h0M26 30h0M32 40h0"/><circle class="k" cx="24" cy="21.5" r="1.4"/><g class="x-swing o-l"><path class="m" d="M25 21q10-10 20-4-8 8-20 4z"/><path class="lk" d="M26 21l14-3"/></g></g>' +
      '<g class="x-bob" style="--d:0.6s"><circle class="w lk" cx="46" cy="44" r="11"/><circle class="c" cx="46" cy="44" r="8.4"/>' +
      '<path class="w" d="M46 36v16M38 44h16M40.4 38.4l11.2 11.2M51.6 38.4L40.4 49.6" opacity="0.8"/></g>' +
      '<g class="x-twinkle"><path class="w" d="M52 12l1.4 3 3 1.4-3 1.4-1.4 3-1.4-3-3-1.4 3-1.4z"/></g>' + gnd(60, 4, 60) });

  // ================= PALESTINE =================
  B.element('PS', { id: 'tatreez', label: 'Cross-stitch embroidery', colour: 'red', mood: 'proud', tags: ['textile', 'embroidery', 'craft'],
    svg: () => {
      let s = '<rect class="s" x="4" y="8" width="56" height="44" rx="2"/><path class="lm" d="M4 14h56M4 46h56"/>';
      const cx = (x, y, cls, d) => `<g class="${cls}" style="--d:${d}s"><path class="lc" d="M${x - 2} ${y - 2}l4 4M${x + 2} ${y - 2}l-4 4"/></g>`;
      const pts = [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1], [0, -2], [0, 2], [-2, 0], [2, 0], [-3, 0], [3, 0], [0, -3], [0, 3]];
      pts.forEach(([a, b], i) => { s += cx(32 + a * 5.4, 30 + b * 4.6, i % 3 ? 'x-twinkle' : 'x-pulse', (i * 0.23).toFixed(2)); });
      for (let i = 0; i < 8; i++) { s += `<path class="lk" d="M${8 + i * 7} 11l3 0M${8 + i * 7} 49l3 0"/>`; }
      s += '<g class="x-bob"><path class="k" d="M44 6l8 16" /><path class="lm" d="M52 22q6 8-2 14"/></g>';
      return s;
    } });
  B.place('bethlehem', { id: 'star-over-town', label: 'Star over the hill town', colour: 'indigo', mood: 'calm', tags: ['star', 'hills', 'night'],
    svg: () => stars([[8, 8], [18, 20], [48, 6], [58, 22], [38, 24]]) +
      '<g class="x-spin-slow" style="transform-origin:32px 14px"><path class="w" d="M32 2l2.5 9 9 3-9 3-2.5 9-2.5-9-9-3 9-3z"/></g><g class="x-pulse"><circle class="c" cx="32" cy="14" r="3"/></g>' +
      '<path class="m" d="M0 52q10-12 22-8t20-6 22 8v18H0z"/>' +
      '<rect class="s" x="8" y="44" width="10" height="10"/><rect class="c" x="20" y="40" width="9" height="14"/><rect class="s" x="31" y="43" width="10" height="11"/><rect class="c" x="43" y="38" width="8" height="16"/><rect class="s" x="52" y="45" width="9" height="9"/>' +
      '<path class="m" d="M8 44q5-5 10 0zM31 43q5-5 10 0z"/>' +
      '<rect class="w x-blink" x="12" y="48" width="2.4" height="3"/><rect class="w x-blink" style="--d:0.5s" x="23" y="46" width="2.4" height="3"/><rect class="w x-blink" style="--d:1s" x="35" y="48" width="2.4" height="3"/><rect class="w x-blink" style="--d:0.3s" x="46" y="44" width="2.4" height="3"/>' +
      '<path class="lk t" d="M4 60q10-4 20 0 10 4 20 0 10-4 16 0"/>' });

  // ================= JORDAN =================
  B.element('JO', { id: 'coffee-pot', label: 'Dallah coffee pot', colour: 'amber', mood: 'cosy', tags: ['coffee', 'craft', 'drink'],
    svg: () => steam(20, 16, 0) +
      '<g class="x-wobble" style="--ad:3.2s"><path class="c" d="M16 58l4-22h14l4 22z"/><path class="m" d="M20 36l3-18h8l3 18z"/><path class="c" d="M22 18h10l-1-5h-8z"/><circle class="w" cx="27" cy="11" r="2.4"/>' +
      '<path class="lc t" d="M34 44q8-2 12-14l6-4"/><path class="lk" d="M16 58h22"/><path class="w" d="M20 44h14M21 50h12" opacity="0.6"/><path class="lk" d="M10 38q-6 0-6 8t8 8"/></g>' +
      '<g class="x-drop"><circle class="c" cx="52" cy="34" r="1.5"/></g><g class="x-drop" style="--d:0.5s"><circle class="c" cx="52" cy="38" r="1.2"/></g>' +
      '<path class="w lk" d="M46 52h14l-2 8h-10z"/><path class="c" d="M47 54h12l-.5 2h-11z"/>' });
  B.place('petra', { id: 'treasury', label: 'Rock-cut Treasury', colour: 'red', mood: 'proud', tags: ['rock', 'facade', 'canyon'],
    svg: () => '<path class="c" d="M0 0h64v64H0z" opacity="0.35"/><path class="c" d="M0 0h14l-3 22 5 14-4 28H0zM64 0H50l3 20-4 16 5 28h10z"/>' +
      '<path class="m" d="M14 64l-3-28 4-14L14 0zM50 64l4-28-4-16 1-20z" opacity="0.5"/>' +
      '<g class="x-glow"><path class="s" d="M19 64V26h26v38z"/></g>' +
      '<rect class="c" x="20" y="24" width="24" height="3"/><path class="c" d="M19 24l13-8 13 8z"/><path class="lk" d="M23 24l9-5 9 5"/>' +
      '<path class="m" d="M24 40h4v24h-4zM36 40h4v24h-4z"/><rect class="m" x="22" y="38" width="20" height="2.4"/>' +
      '<path class="s" d="M26 38h12v-8q-6-4-12 0z"/><path class="lk" d="M32 30v8"/><path class="k" d="M29 64V52q3-4 6 0v12z"/>' +
      '<path class="c" d="M25 21h14v3H25z"/><circle class="w" cx="32" cy="22" r="1.6"/>' +
      '<g class="x-float"><circle class="w" cx="10" cy="48" r="1"/></g><g class="x-float" style="--d:1.2s"><circle class="w" cx="54" cy="52" r="1"/></g>' });

  // ================= IRAQ =================
  B.element('IQ', { id: 'oud', label: 'Oud', colour: 'amber', mood: 'dreamy', tags: ['instrument', 'music'],
    svg: () => '<g class="x-wobble" style="--ad:3.4s"><path class="c" d="M22 36q-8 8-4 18 6 8 16 6 12-2 14-12 0-10-10-14z" transform="rotate(-8 30 46)"/>' +
      '<circle class="k" cx="30" cy="46" r="5"/><circle class="w lk" cx="30" cy="46" r="7"/><path class="lw" d="M26 42l8 8M34 42l-8 8" opacity="0.6"/>' +
      '<path class="lc t" d="M38 38L52 14"/><path class="m" d="M50 14l6-4 3 6-5 4z"/><path class="lk" d="M36 52l-6 6"/>' +
      '<g class="x-wave"><path class="lk" d="M32 44L53 15M34 46L54 17"/></g><circle class="w" cx="55" cy="13" r="1.3"/></g>' +
      '<g class="x-rise"><path class="lc" d="M10 30q0-4 3-4v-6"/><circle class="c" cx="9" cy="31" r="2"/></g><g class="x-rise" style="--d:1.4s"><path class="lc" d="M4 40q0-4 3-4v-6"/><circle class="c" cx="3.4" cy="41" r="2"/></g>' });

  // ================= IRAN =================
  B.element('IR', { id: 'carpet', label: 'Persian carpet', colour: 'red', mood: 'proud', tags: ['textile', 'carpet', 'craft'],
    svg: () => stars([[8, 10], [54, 8], [56, 54]]) +
      '<g class="x-float"><path class="lk" d="M10 14l-3 2M10 20l-3 1M10 26l-3 0M10 32l-3-1M10 38l-3-2M54 14l3 2M54 20l3 1M54 26l3 0M54 32l3-1M54 38l3-2"/>' +
      '<rect class="c" x="10" y="12" width="44" height="30" rx="1"/><rect class="w" x="14" y="16" width="36" height="22" rx="1"/><rect class="s" x="17" y="19" width="30" height="16"/>' +
      '<path class="c" d="M32 20l9 7-9 7-9-7z"/><path class="w" d="M32 23l5 4-5 4-5-4z"/><circle class="k" cx="32" cy="27" r="1.6"/>' +
      '<path class="c" d="M18 20l4 3-4 3zM46 20l-4 3 4 3zM18 28l4 3-4 3zM46 28l-4 3 4 3z"/></g>' +
      '<g class="x-wave"><path class="lm" d="M8 52q6-3 12 0t12 0 12 0 12 0"/></g>' });
  B.place('isfahan', { id: 'bridge-arches', label: 'Two-tier arched bridge', colour: 'amber', mood: 'calm', tags: ['bridge', 'arches', 'river'],
    svg: () => sun(52, 12, 5) + bird(8, 10, 0.4) +
      '<rect class="c" x="2" y="26" width="60" height="4"/><rect class="m" x="2" y="30" width="60" height="16"/>' +
      [4, 15, 26, 37, 48].map(x => `<path class="s" d="M${x} 46V38q4.5-8 9 0v8z"/>`).join('') +
      [9, 20, 31, 42].map(x => `<path class="k" d="M${x} 28v-2"/>`).join('') +
      '<path class="c" d="M2 26q4-5 8 0 4-5 8 0 4-5 8 0 4-5 8 0 4-5 8 0 4-5 8 0 4-5 8 0" />' +
      '<g class="x-blink"><rect class="w" x="16" y="30" width="2" height="3"/></g><g class="x-blink" style="--d:0.7s"><rect class="w" x="38" y="30" width="2" height="3"/></g>' +
      '<path class="s" d="M0 46h64v18H0z"/>' + wave(50, 'lw') + wave(55, 'lc') + wave(60, 'lw') });
  B.place('shiraz', { id: 'cypress-nightingale', label: 'Cypress and nightingale', colour: 'green', mood: 'dreamy', tags: ['cypress', 'bird', 'poetry', 'garden'],
    svg: () => moon(50, 12, 5) + stars([[8, 8], [20, 16], [36, 6], [58, 28]]) +
      '<g class="x-swing o-b"><path class="c" d="M16 62q-9-14-4-30 4-12 4-24 4 12 8 24 5 16-8 30z" transform="translate(0 0)"/><path class="lk" d="M16 14v46"/></g>' +
      '<path class="lk t" d="M30 40q8-4 18-3"/><g class="x-bob"><ellipse class="s" cx="40" cy="35" rx="6" ry="4"/><circle class="s" cx="46" cy="32" r="2.8"/><path class="k" d="M48 31l4 1-4 1z"/><circle class="k" cx="46" cy="31.4" r="0.7"/><path class="m" d="M34 36l-6 3 7-1z"/></g>' +
      '<g class="x-rise"><path class="lc" d="M54 28q0-3 2-3"/><circle class="c" cx="53.4" cy="29" r="1.4"/></g><g class="x-rise" style="--d:1.1s"><path class="lc" d="M58 34q0-3 2-3"/><circle class="c" cx="57.4" cy="35" r="1.4"/></g>' +
      '<g class="x-pop" style="--d:0.4s"><circle class="c" cx="36" cy="54" r="3"/><circle class="w" cx="36" cy="54" r="1.4"/></g><path class="lk" d="M36 57v5"/>' + gnd(62) });

  // ================= SAUDI ARABIA =================
  B.element('SA', { id: 'date-palm', label: 'Date palm', colour: 'green', mood: 'calm', tags: ['palm', 'dates', 'tree'],
    svg: () => sun(12, 12, 5) + dunes(54) +
      '<path class="lk t" d="M30 56q3-12 0-26"/><path class="lm" d="M28 50l4 1M28 44l4 1M29 38l4 1"/>' +
      '<g class="x-swing o-b"><path class="c" d="M30 28q-12-2-18 8 9-6 18-4zM30 28q12-2 18 8-9-6-18-4zM30 28q-8-8-18-6 10 0 18 6zM30 28q8-8 18-6-10 0-18 6zM30 28q-2-10 0-16 2 6 0 16z"/></g>' +
      '<g class="x-bob" style="--d:0.5s"><circle class="m" cx="27" cy="33" r="2"/><circle class="m" cx="31" cy="35" r="2"/><circle class="m" cx="34" cy="32" r="2"/><circle class="m" cx="29" cy="37" r="2"/></g>' +
      '<g class="x-fall" style="--d:0.8s"><circle class="m" cx="40" cy="38" r="1.8"/></g>' });
  B.place('alula', { id: 'elephant-rock', label: 'Elephant rock', colour: 'orange', mood: 'dreamy', tags: ['rock', 'desert', 'sunset'],
    svg: () => stars([[8, 8], [22, 14], [48, 6], [58, 20]]) + sun(50, 40, 7) +
      '<path class="s" d="M0 52q16-6 32-2t32-4v18H0z"/>' +
      '<path class="c" d="M14 56V42q-6-4-4-14 3-8 14-9 12-2 20 6 4 6 0 12-2 6-8 6-4 0-4-4v-6q-5 2-5 8v18z"/>' +
      '<path class="m" d="M16 30q10-6 24-2" opacity="0.6"/><path class="lk" d="M20 28q2 8 0 16M34 24l-2 8"/>' +
      '<path class="k" d="M30 56V46q2-6 6-2l-2 12z" opacity="0.3"/>' +
      '<g class="x-slidel"><path class="lm" d="M4 58h8M40 60h12"/></g><g class="x-bob"><path class="lk" d="M44 14q3-4 6 0q3-4 6 0"/></g>' + gnd(56, 4, 60) });

  // ================= YEMEN =================
  B.element('YE', { id: 'tower-house', label: 'Mud-brick tower house', colour: 'amber', mood: 'proud', tags: ['architecture', 'tower', 'mud-brick'],
    svg: () => stars([[8, 8], [54, 12], [22, 6]]) + moon(52, 22, 4) +
      '<path class="c" d="M18 62V14l4-4h20l4 4v48z"/><path class="m" d="M18 62V14l4-4v52z" opacity="0.5"/>' +
      '<path class="w" d="M18 22h28v2H18zM18 34h28v2H18zM18 46h28v2H18z"/><path class="w" d="M20 10h4v-2h-4zM28 10h4v-2h-4zM36 10h4v-2h-4z"/>' +
      '<path class="k" d="M30 62V54q3-4 6 0v8z"/>' +
      [[24, 16], [34, 16], [24, 28], [34, 28], [24, 40], [34, 40]].map(([x, y], i) => `<path class="s" d="M${x} ${y + 5}v-4q2.5-3 5 0v4z"/><g class="x-blink" style="--d:${(i * 0.4).toFixed(1)}s"><path class="w" d="M${x + 1} ${y + 4}v-2.6q1.5-1.4 3 0v2.6z"/></g>`).join('') +
      '<path class="m" d="M6 62V44l6-4 6 4v18zM46 62V48l6-4 6 4v14z"/>' + gnd(62) });
  B.place('socotra', { id: 'dragon-blood-tree', label: 'Dragon blood tree', colour: 'red', mood: 'dreamy', tags: ['tree', 'island', 'rare'],
    svg: () => sun(52, 12, 5) + bird(8, 12, 0.5) +
      '<path class="m" d="M0 52l10-8 8 4 10-6 12 8 8-4 16 8v10H0z" opacity="0.7"/>' +
      '<path class="lk t" d="M32 58V42M32 44q-6-4-10-8M32 44q6-4 10-8M32 42q-2-4-2-8M32 42q2-4 2-8"/>' +
      '<g class="x-breathe"><path class="c" d="M8 32q4-14 24-14t24 14q-8-4-24-4t-24 4z"/><path class="m" d="M12 31q20-6 40 0" opacity="0.6"/></g>' +
      '<g class="x-drop"><circle class="c" cx="26" cy="36" r="1.4"/></g><g class="x-drop" style="--d:0.8s"><circle class="c" cx="40" cy="36" r="1.4"/></g><g class="x-drop" style="--d:1.5s"><circle class="c" cx="33" cy="38" r="1.4"/></g>' +
      '<path class="s" d="M0 56q16-4 32-1t32-3v12H0z"/>' + gnd(58, 4, 60) });

  // ================= OMAN =================
  B.element('OM', { id: 'incense-burner', label: 'Frankincense burner', colour: 'amber', mood: 'calm', tags: ['incense', 'craft', 'smoke'],
    svg: () => steam(26, 28, 0) + steam(32, 26, 0.6) + steam(38, 28, 1.2) +
      '<path class="c" d="M20 34h24q-1 8-6 10l2 8H24l2-8q-5-2-6-10z"/><path class="m" d="M16 34h32v3H16z"/><path class="w" d="M22 54h20v3H22z"/>' +
      '<path class="lk" d="M26 40q6 4 12 0M25 46q7 4 14 0"/><circle class="w" cx="32" cy="37" r="1.6"/>' +
      '<g class="x-flicker"><path class="k" d="M26 34l2-4 2 3 2-5 2 5 2-3 2 4z"/></g>' +
      '<g class="x-glow"><circle class="c" cx="32" cy="32" r="3" opacity="0.7"/></g><path class="lc t" d="M10 59h44"/>' });
  B.place('nizwa', { id: 'round-fort', label: 'Round fort tower', colour: 'orange', mood: 'proud', tags: ['fort', 'tower', 'palm'],
    svg: () => '<g class="x-rise" style="--ad:6s"><circle class="c" cx="52" cy="14" r="5"/></g>' + bird(8, 12, 0.3) +
      '<path class="m" d="M0 52l12-10 10 6 10-8 12 8 10-4 10 8v12H0z" opacity="0.5"/>' +
      '<path class="c" d="M12 62V26h30v36z"/><path class="m" d="M12 26h30v4H12z"/><path class="c" d="M12 26v-4h4v4zM20 26v-4h4v4zM28 26v-4h4v4zM36 26v-4h4v4z"/>' +
      '<path class="s" d="M16 62V40q4-4 8 0v22z"/><path class="k" d="M18 62V44q2-2 4 0v18z"/><path class="lk" d="M30 36v8M36 36v8"/>' +
      '<g class="x-blink"><rect class="w" x="30" y="32" width="3" height="3"/></g><g class="x-blink" style="--d:0.8s"><rect class="w" x="36" y="46" width="3" height="3"/></g>' +
      palm(52, 62, 22, 0) + gnd(62) });

  // ================= UNITED ARAB EMIRATES =================
  B.element('AE', { id: 'falcon', label: 'Falcon', colour: 'slate', mood: 'proud', tags: ['bird', 'falcon', 'animal'],
    svg: () => sun(12, 12, 5) + dunes(56) + '<path class="lk t" d="M32 62V40"/><path class="lc t" d="M24 56h16"/>' +
      '<g class="x-breathe o-b"><path class="m" d="M20 38q-4-14 8-20 8-3 14 2 4 6 0 14l4 8-8-2q-4 10-12 8z" transform="translate(0 4)"/>' +
      '<path class="s" d="M24 36q0-10 8-12 8 0 10 8-2 10-8 14-8 0-10-10z"/><path class="lk" d="M28 34l4 1M28 38l5 1M29 42l4 1"/>' +
      '<path class="m" d="M20 30q-8 8-4 22l6-2-1-8z"/><circle class="w" cx="30" cy="24" r="3.2"/><g class="x-blink"><circle class="k" cx="30" cy="24" r="1.6"/></g><path class="k" d="M24 24l-5 3 6 1z"/></g>' +
      '<g class="x-slidel"><path class="lm" d="M44 14h8M48 18h8"/></g>' });

  // ================= QATAR =================
  B.element('QA', { id: 'oryx', label: 'Arabian oryx', colour: 'slate', mood: 'calm', tags: ['animal', 'oryx', 'desert'],
    svg: () => sun(52, 12, 5) + dunes(52) +
      '<g class="x-bob" style="--ad:3.4s"><path class="lk t" d="M40 12L26 4M42 14L32 2"/>' +
      '<path class="w lk" d="M12 34q0-8 10-8h16q6 0 8 6l2-12 8 2-6 14-2 12H44l-2-8H22l-2 8h-6l-2-8z"/>' +
      '<path class="w" d="M42 24l6-10 4 1-3 12z"/><path class="k" d="M44 24l5 1-4 6z"/><circle class="k" cx="47" cy="19" r="1"/>' +
      '<path class="m" d="M24 28v8M34 28v8" opacity="0.5"/><path class="k" d="M14 34l-4 4"/></g>' +
      '<path class="lk" d="M18 52v6M24 52v6M38 52v6M44 52v6"/>' + gnd(58, 2, 62) });

  // ================= BAHRAIN =================
  B.element('BH', { id: 'pearl', label: 'Pearl in the shell', colour: 'blue', mood: 'dreamy', tags: ['pearl', 'sea', 'shell'],
    svg: () => '<g class="x-rise"><circle class="w" cx="12" cy="44" r="2"/></g><g class="x-rise" style="--d:0.8s"><circle class="w" cx="52" cy="40" r="2.4"/></g><g class="x-rise" style="--d:1.6s"><circle class="w" cx="46" cy="52" r="1.5"/></g>' +
      '<g class="x-breathe o-b"><path class="m" d="M8 40q4-20 24-20t24 20z"/><path class="lk" d="M32 20v20M20 24l5 16M44 24l-5 16M13 32l8 8M51 32l-8 8"/></g>' +
      '<path class="c" d="M6 40q4 16 26 16t26-16z"/><path class="w" d="M12 40q4 10 20 10t20-10z"/>' +
      '<g class="x-pulse"><circle class="w lm" cx="32" cy="40" r="6"/></g><circle class="s" cx="30" cy="38" r="1.8"/>' +
      '<g class="x-twinkle"><path class="w" d="M32 26l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/></g>' + wave(60, 'lw') });

  // ================= KUWAIT =================
  B.element('KW', { id: 'dhow', label: 'Traditional dhow', colour: 'teal', mood: 'cheerful', tags: ['boat', 'sail', 'sea'],
    svg: () => sun(50, 12, 6) + bird(8, 10, 0.3) +
      '<g class="x-bob" style="--ad:3.4s"><path class="lk t" d="M30 46V8"/><path class="w" d="M30 10l24 32H30z"/><path class="c" d="M28 14L10 42h18z"/><path class="lk" d="M30 24l16 18M20 28l8 14" opacity="0.5"/>' +
      '<path class="m" d="M4 46h50l-6 8q-8 4-22 4t-18-4z"/><path class="lk" d="M10 50h38"/><path class="c" d="M2 44l5 2h-5z"/></g>' +
      wave(54, 'lw') + wave(59, 'lc') + wave(63, 'lw') });

  animRegisterPack(B.pack({ id: 'asia-west', name: 'Asia: West', description: 'Western Asia: one small symbol for every country (tulip, khachapuri, cedar, carpet, falcon, dhow and more) and for its towns (Goreme balloons, the Petra Treasury, Palmyra colonnade, the Isfahan bridge).' }));
})();
