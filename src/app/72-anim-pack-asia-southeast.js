/* ============================================================
   ANIMATION PACK "asia-southeast": Southeast Asia (Indonesia, Malaysia, Singapore, Thailand, Vietnam,
   Philippines, Myanmar, Cambodia, Laos, Brunei, Timor-Leste). PURE classic script. The full-screen
   scenes come from B.scenes(); here: one small symbol per country and one per small city or town.
   Each item is a constant 64x64 drawing with its own motion. Built with asiaBuilder (71-anim-asia.js).
   ============================================================ */
(function () {
  const B = asiaBuilder('southeast');
  B.scenes();
  // ---- small local helpers (constants only) ----
  const stars = (pts) => pts.map(([x, y], i) => `<circle class="k x-twinkle" style="--d:${((i * 0.37) % 2).toFixed(2)}s" cx="${x}" cy="${y}" r="0.9"/>`).join('');
  const gnd = (y, x1 = 2, x2 = 62) => `<path class="lm" d="M${x1} ${y}H${x2}"/>`;
  const sun = (x, y, r) => `<g class="x-pulse"><circle class="c" cx="${x}" cy="${y}" r="${r}"/></g>`;
  const wave = (y, cls) => `<path class="${cls} x-wave" d="M-12 ${y}q3-3 6 0${'t6 0'.repeat(14)}"/>`;
  const bird = (x, y, d) => `<g class="x-bob" style="--d:${d}s"><path class="lk" d="M${x} ${y}q3-4 6 0q3-4 6 0"/></g>`;
  const cloud = (x, y, d) => `<g class="x-slidel" style="--d:${d}s"><path class="w" d="M${x} ${y}q0-4 4-4 1-4 5-3 4-1 5 3 4 0 4 4z"/></g>`;
  const palm = (x, y, h) => `<path class="lm t" d="M${x} ${y}q2-${h / 2} -1-${h}"/><g class="x-swing o-t"><path class="c" d="M${x - 1} ${y - h}q-8-2-12 4q7-3 12-1zM${x - 1} ${y - h}q8-2 12 4q-7-3-12-1zM${x - 1} ${y - h}q-3-7-9-7q6 1 9 7zM${x - 1} ${y - h}q3-7 9-7q-6 1-9 7z"/></g>`;
  const wheel = (x, y, r, d) => `<g class="x-spin" style="--d:${d || 0}s"><circle class="w lk" cx="${x}" cy="${y}" r="${r}"/><path class="lk" d="M${x - r} ${y}h${2 * r}M${x} ${y - r}v${2 * r}"/></g>`;

  // ================= INDONESIA =================
  B.element('ID', { id: 'gamelan-gong', label: 'Gamelan gong', colour: 'amber', mood: 'proud', tags: ['instrument', 'music'], intensity: 'standard',
    svg: () => '<path class="lk t" d="M8 58V10h48v48M8 12h48"/><path class="s" d="M8 10h48l-4 4H12z"/>' +
      '<g class="x-swing o-t"><path class="lk" d="M32 12v6"/><circle class="c" cx="32" cy="32" r="14"/><circle class="w" cx="32" cy="32" r="9"/><circle class="c" cx="32" cy="32" r="4.5"/><path class="lk" d="M20 28a13 13 0 0 1 5-8"/></g>' +
      '<g class="x-pulse"><path class="lc" d="M10 32q-3 0-5 3M54 32q3 0 5 3M12 26q-4-2-6-6M52 26q4-2 6-6"/></g>' +
      '<circle class="m" cx="16" cy="54" r="3"/><circle class="m" cx="48" cy="54" r="3"/>' + gnd(58, 4, 60) });
  // ================= MALAYSIA =================
  B.element('MY', { id: 'wau-kite', label: 'Wau kite', colour: 'red', mood: 'cheerful', tags: ['kite', 'craft'], intensity: 'standard',
    svg: () => cloud(2, 14, 0) + '<g class="x-float"><path class="c" d="M32 4l7 6 14 4-3 8-4 3-4 12-6-6h-8l-6 6-4-12-4-3-3-8 14-4z"/>' +
      '<path class="w" d="M32 11l5 6-5 6-5-6z"/><path class="k" d="M32 14l2.2 3-2.2 3-2.2-3z"/><path class="lk" d="M32 24v14M20 18l12 6 12-6"/><circle class="s" cx="22" cy="14" r="2"/><circle class="s" cx="42" cy="14" r="2"/>' +
      '<path class="lc x-wave" d="M32 38q-5 5 0 9t0 8q-3 3 0 7"/></g>' + gnd(62, 4, 60) });
  // ================= SINGAPORE =================
  B.element('SG', { id: 'orchid', label: 'Orchid bloom', colour: 'violet', mood: 'calm', tags: ['flower', 'orchid'],
    svg: () => '<path class="lm t" d="M32 62q-6-14 0-26"/><path class="c" d="M31 52q-12-4-18-14q10 0 18 8zM33 56q12-4 17-14q-10 1-17 9z"/>' +
      '<g class="x-breathe"><path class="c" d="M32 36q-14-4-14-18q10 2 14 18zM32 36q14-4 14-18q-10 2-14 18z"/><path class="w lc" d="M32 34q-12 2-22-6q10-6 22 6zM32 34q12 2 22-6q-10-6-22 6z"/>' +
      '<path class="s" d="M32 32q-6-8 0-24q6 16 0 24z"/><path class="w" d="M26 36q6 8 12 0q-3-5-6-4q-3-1-6 4z"/><path class="k" d="M30 33h4v3h-4z"/><circle class="c" cx="32" cy="42" r="2"/></g>' +
      '<g class="x-pop" style="--d:0.8s"><circle class="w" cx="12" cy="12" r="1.6"/></g><g class="x-pop" style="--d:1.6s"><circle class="w" cx="54" cy="10" r="1.6"/></g>' });
  // ================= THAILAND =================
  B.element('TH', { id: 'longtail-boat', label: 'Longtail boat', colour: 'teal', mood: 'cheerful', tags: ['boat', 'sea'], intensity: 'standard',
    svg: () => sun(50, 14, 6) + bird(8, 12, 0) +
      '<g class="x-bob"><path class="c" d="M4 36q14 10 36 8l12-12-2 14q-18 8-44-2z"/><path class="s" d="M10 38q14 6 30 4v-4q-16 2-30-2z"/>' +
      '<path class="lk t" d="M12 36l-4-6M40 42l16-14"/><path class="k" d="M44 36l14-6v4l-14 6z"/><path class="lw" d="M62 26l-4 6"/>' +
      '<path class="lc" d="M26 38v-8h-6M26 30h8"/><path class="w x-flap" style="--d:0.4s" d="M16 36l4-3 4 3z"/></g>' +
      '<g class="x-trail"><circle class="w lk" cx="56" cy="34" r="2"/></g>' + wave(52, 'lc') + wave(58, 'lw') });
  // ================= VIETNAM =================
  B.element('VN', { id: 'pho-bowl', label: 'Bowl of pho', colour: 'orange', mood: 'cosy', tags: ['food', 'soup'],
    svg: () => '<path class="lm x-steam" d="M22 24q-4-5 0-9t0-8"/><path class="lm x-steam" style="--d:0.7s" d="M32 24q-4-5 0-9t0-8"/><path class="lm x-steam" style="--d:1.4s" d="M42 24q-4-5 0-9t0-8"/>' +
      '<path class="c" d="M6 32h52q-2 18-14 22H20Q8 50 6 32z"/><path class="w" d="M10 32h44l-1 4H11z"/>' +
      '<path class="s" d="M12 36q10 4 20 0t20 0v-3H12z"/><path class="lk" d="M16 34q8 3 14-1M30 34q10 3 18-1"/>' +
      '<circle class="w lk" cx="24" cy="31" r="3"/><path class="m" d="M36 30l5-2 4 3-5 2z"/><g class="x-bob"><circle class="c" cx="44" cy="30" r="2"/></g>' +
      '<path class="lk t x-wobble" d="M44 8L30 34M50 10L36 34"/><path class="lw" d="M18 50h28"/><path class="c" d="M22 56h20v4H22z"/>' });
  // ================= PHILIPPINES =================
  B.element('PH', { id: 'jeepney', label: 'Jeepney', colour: 'red', mood: 'energetic', tags: ['vehicle', 'transport'], intensity: 'standard',
    svg: () => '<g class="x-runbob"><path class="c" d="M4 28h10l4-8h34q6 0 8 6v20H4z"/><path class="s" d="M4 38h56v6H4z"/>' +
      '<path class="w" d="M20 22h10v8H18zM33 22h9v8H33zM45 22h8l3 8H45z"/><path class="lk" d="M30 22v8M42 22v8"/>' +
      '<path class="k" d="M6 30h6v4H6z"/><circle class="w" cx="9" cy="42" r="1.4"/><path class="lw" d="M18 36h38"/><circle class="s" cx="56" cy="36" r="1.6"/>' +
      '<path class="lk" d="M30 14h4M26 14l-4 6M40 14l4 6"/><g class="x-flag"><path class="s" d="M32 6v8"/></g></g>' +
      wheel(16, 50, 6) + wheel(48, 50, 6, 0.2) + '<g class="x-trail"><circle class="s" cx="2" cy="52" r="2"/></g>' + gnd(58) });
  // ================= MYANMAR =================
  B.element('MM', { id: 'paper-parasol', label: 'Paper parasol', colour: 'pink', mood: 'dreamy', tags: ['parasol', 'craft'],
    svg: () => '<g class="x-swing o-t"><path class="c" d="M4 32Q8 8 32 8t28 24z"/><path class="w" d="M16 32Q18 12 32 8Q22 14 22 32z"/><path class="s" d="M42 32Q42 14 32 8Q46 12 48 32z"/>' +
      '<path class="lk" d="M4 32q7 6 14 0t14 0 14 0 14 0"/><path class="lk" d="M32 8v-3M32 32v22q0 6-6 6"/><circle class="w lk" cx="32" cy="4.5" r="1.8"/>' +
      '<path class="lc" d="M12 20q4 2 8-1M44 19q4 2 8 1"/></g>' +
      '<g class="x-fall"><circle class="s" cx="10" cy="40" r="1.4"/></g><g class="x-fall" style="--d:1s"><circle class="s" cx="54" cy="38" r="1.4"/></g><g class="x-fall" style="--d:2s"><circle class="s" cx="46" cy="42" r="1.4"/></g>' });
  // ================= CAMBODIA =================
  B.element('KH', { id: 'sugar-palm', label: 'Sugar palm', colour: 'green', mood: 'calm', tags: ['tree', 'palm'],
    svg: () => sun(48, 14, 6) + cloud(2, 12, 0) + '<path class="s" d="M0 52q16-8 32-2t32-2v14H0z"/><path class="m" d="M0 58q20-5 32 0t32-2v8H0z"/>' +
      '<path class="lk t" d="M30 58q3-20 0-38"/><path class="lk" d="M28 28h5M28 38h5M28 48h5"/>' +
      '<g class="x-swing o-t"><path class="c" d="M30 20q-14-2-22 8q12-6 22-4zM30 20q14-2 22 8q-12-6-22-4zM30 20q-10-10-20-6q12-1 20 6zM30 20q10-10 20-6q-12-1-20 6zM30 20q-2-8 0-14q3 6 0 14z"/></g>' +
      '<g class="x-drop"><circle class="k" cx="36" cy="24" r="1.8"/></g>' });
  // ================= LAOS =================
  B.element('LA', { id: 'sticky-rice-basket', label: 'Sticky rice basket', colour: 'amber', mood: 'cosy', tags: ['food', 'basket'],
    svg: () => '<path class="lm x-steam" d="M26 22q-4-4 0-8t0-8"/><path class="lm x-steam" style="--d:0.8s" d="M38 22q-4-4 0-8t0-8"/>' +
      '<path class="w" d="M16 34q0-14 16-14t16 14z"/><path class="s" d="M20 32q2-8 12-8t12 8z"/><circle class="w lk" cx="26" cy="28" r="1.2"/><circle class="w lk" cx="33" cy="26" r="1.2"/><circle class="w lk" cx="39" cy="29" r="1.2"/>' +
      '<path class="c" d="M12 34h40l-4 22q-16 6-32 0z"/><path class="lk" d="M16 40h32M17 46h30M18 52h28M24 34l-1 22M32 34v24M40 34l1 22"/>' +
      '<path class="lc" d="M6 36q-2 8 4 8M58 36q2 8-4 8"/><g class="x-pop" style="--d:0.4s"><circle class="w" cx="12" cy="18" r="1.4"/></g><g class="x-pop" style="--d:1.4s"><circle class="w" cx="52" cy="16" r="1.4"/></g>' });
  // ================= BRUNEI =================
  B.element('BN', { id: 'hornbill', label: 'Rhinoceros hornbill', colour: 'amber', mood: 'proud', tags: ['bird', 'animal'],
    svg: () => '<path class="lm t" d="M4 52h30M34 52l8 8"/><g class="x-bob"><path class="k" d="M10 40q8-16 24-12l10 6q-4 12-16 14l-8 8z"/><path class="w" d="M10 40l8 2 6-4-2 8-8-2z"/>' +
      '<path class="c" d="M36 18q4-6 12-4q6 3 6 8l-6 2z"/><path class="c" d="M30 20q4-8 14-6l-4 8z"/><path class="k" d="M46 22l14 4q-4 6-12 5z"/><path class="c" d="M44 20l10 3-8 3z"/>' +
      '<circle class="w" cx="42" cy="22" r="2"/><circle class="k" cx="42.4" cy="22.2" r="1"/>' +
      '<g class="x-flap" style="--d:0.3s"><path class="s" d="M20 30q12-14 22-6q-6 8-22 6z"/></g><path class="lk" d="M24 44l-3 9M30 46l-1 7"/></g>' });
  // ================= TIMOR-LESTE =================
  B.element('TL', { id: 'tais-cloth', label: 'Tais woven cloth', colour: 'red', mood: 'proud', tags: ['textile', 'weaving'],
    svg: () => '<path class="lm t" d="M4 6h56"/><g class="x-swing o-t"><path class="c" d="M8 6h48v40q-6 4-12 0t-12 0-12 0-12 0z"/>' +
      '<path class="k" d="M8 14h48v4H8zM8 38h48v4H8z"/>' +
      '<path class="w" d="M16 28l8-8 8 8-8 8zM32 28l8-8 8 8-8 8z"/><path class="c" d="M20 28l4-4 4 4-4 4zM36 28l4-4 4 4-4 4z"/>' +
      '<path class="s" d="M8 20h48v2H8zM8 34h48v2H8z"/>' +
      '<path class="lk" d="M12 46v6M20 46v8M28 46v6M36 46v8M44 46v6M52 46v8"/></g>' +
      '<g class="x-twinkle"><circle class="w" cx="12" cy="58" r="1.2"/></g><g class="x-twinkle" style="--d:0.9s"><circle class="w" cx="52" cy="58" r="1.2"/></g>' });

  // ================= SMALL PLACES =================
  B.place('denpasar', { id: 'penjor', label: 'Penjor pole', colour: 'amber', mood: 'cheerful', tags: ['festival', 'bamboo'],
    svg: () => '<path class="s" d="M0 52h64v12H0z"/>' + '<path class="lk t" d="M12 58V12q0-8 12-8t22 10"/><g class="x-swing o-t">' +
      '<path class="c" d="M46 14l-3 14q-4 8-1 16 4-8 4-16z"/><path class="w" d="M42 20l-2 12q-3 6 0 12 3-6 2-12z"/><path class="c" d="M50 18l4 10-2 12-4-10z"/></g>' +
      '<path class="c" d="M16 54h22l-2 6H18z"/><path class="w" d="M20 54q5-8 10 0z"/><circle class="c x-pop" style="--d:0.5s" cx="25" cy="49" r="2"/>' +
      '<path class="lc x-flicker" d="M56 54v-5"/><circle class="k x-flicker" cx="56" cy="47" r="1.3"/>' + bird(8, 8, 0.6) });
  B.place('yogyakarta', { id: 'wayang-puppet', label: 'Wayang shadow puppet', colour: 'indigo', mood: 'focused', tags: ['puppet', 'craft'],
    svg: () => '<path class="w" d="M6 4h52v44H6z"/><path class="lk t" d="M6 4h52v44H6z"/><g class="x-glow"><circle class="c" cx="10" cy="10" r="3"/></g>' +
      '<path class="lk" d="M32 62V30"/><g class="x-swing o-t"><path class="k" d="M32 6q5 0 5 5-1 4-3 5l2 4q5 3 6 12l-4 2-2-6v16h-8V38l-2 6-4-2q1-9 6-12l2-4q-2-1-3-5 0-5 5-5z"/>' +
      '<path class="w" d="M30 9h1.5v2H30zM30 22l2 2 2-2zM30 28h4M29 33h6"/></g>' +
      '<g class="x-wave-hand"><path class="lk t" d="M24 42L12 56M12 56l2-4"/></g><path class="lk" d="M12 56v6M52 56v6"/>' + gnd(62, 6, 58) });
  B.place('labuan-bajo', { id: 'komodo-dragon', label: 'Komodo dragon', colour: 'green', mood: 'proud', tags: ['animal', 'lizard'],
    svg: () => sun(52, 10, 5) + '<path class="m" d="M0 40l12-12 8 8 10-10 14 14z"/><path class="s" d="M0 52h64v12H0z"/>' +
      '<g class="x-wobble"><path class="c" d="M2 50q8-2 14-6l8-4h18l8-2q6-4 12-1l4 3-4 4-6 1-6 4H30q-8 4-14 6-8 1-14-1z"/>' +
      '<path class="lk t" d="M22 46l-4 8M32 48l-3 7M44 46l4 8M52 44l6 8"/><path class="k" d="M28 40l2-3M34 39l2-3M40 39l2-3"/>' +
      '<circle class="w" cx="55" cy="41" r="1.3"/><circle class="k" cx="55.3" cy="41.2" r="0.6"/></g>' +
      '<path class="lc x-blink" style="--d:0.2s" d="M60 44h3l1-2M63 44l1 2"/>' + gnd(54, 2, 62) });
  B.place('george-town', { id: 'trishaw', label: 'Trishaw', colour: 'pink', mood: 'cheerful', tags: ['vehicle', 'streetart'],
    svg: () => '<path class="s" d="M0 12h64v40H0z" opacity="0.5"/><path class="lk" d="M6 18q4-6 8 0M50 16h8M50 22h8"/><g class="x-runbob"><path class="c" d="M8 34q2-12 16-12v14H8z"/><path class="w" d="M12 30q2-6 8-6v8z"/>' +
      '<path class="lk t" d="M24 36h18l6-10M42 36l-6 12"/><path class="k" d="M42 22h6l2 8"/><path class="lc" d="M8 36h16"/><path class="m" d="M48 24h6v12h-6z"/>' +
      '<g class="x-pop"><circle class="w lc" cx="16" cy="22" r="2"/></g></g>' + wheel(14, 46, 7) + wheel(46, 46, 7, 0.3) + gnd(54, 2, 62) });
  B.place('kota-kinabalu', { id: 'kinabalu-peak', label: 'Mount Kinabalu', colour: 'slate', mood: 'calm', tags: ['mountain', 'mist'],
    svg: () => sun(50, 12, 5) + stars([[8, 8], [20, 14]]) + '<path class="m" d="M0 50l8-12 4 4 6-8 6 8 5-4z"/>' +
      '<path class="s" d="M6 56L24 28l5 6 3-12 5-2 3 8 6-4 12 36z"/><path class="c" d="M16 56l12-16 4 6 4-18 5 2 3 8 8 18z" opacity="0.7"/><path class="w" d="M32 22l3-4 2 4-2 2zM28 28l4-2-1 4z"/>' +
      '<path class="lk" d="M26 36l-4 8M42 28l3 10"/>' + cloud(2, 36, 0) + cloud(34, 46, 1.2) + '<path class="c" d="M0 56h64v8H0z"/>' + gnd(56) });
  B.place('kuching', { id: 'cat-statue', label: 'Cat statue', colour: 'orange', mood: 'cheerful', tags: ['cat', 'statue'],
    svg: () => '<path class="s" d="M0 54h64v10H0z"/><path class="c" d="M14 56V50h36v6z"/><path class="w" d="M16 52h32"/>' +
      '<g class="x-breathe"><path class="w lk" d="M20 50q0-14 6-18h12q6 4 6 18z"/></g>' +
      '<g class="x-bob"><path class="w lk" d="M20 8l4 6h16l4-6v18q0 6-12 6t-12-6z"/><path class="c" d="M22 12l2 3-3 1zM42 12l-2 3 3 1z"/>' +
      '<g class="x-blink"><circle class="k" cx="27" cy="21" r="2"/><circle class="k" cx="37" cy="21" r="2"/></g><path class="k" d="M30 25h4l-2 2z"/><path class="lk" d="M32 27v2M24 25l-6-1M24 28l-6 2M40 25l6-1M40 28l6 2"/></g>' +
      '<g class="x-swing o-t"><path class="lc t" d="M46 50q10 0 10-12"/></g>' });
  B.place('malacca', { id: 'clock-tower', label: 'Red clock tower', colour: 'red', mood: 'proud', tags: ['tower', 'heritage'],
    svg: () => cloud(2, 10, 0) + bird(40, 10, 0.4) + '<path class="c" d="M14 56V28h36v28z"/><path class="s" d="M10 56h44v4H10z"/>' +
      '<path class="w" d="M18 34h6v8h-6zM40 34h6v8h-6zM18 46h6v10h-6zM40 46h6v10h-6z"/><path class="lk" d="M21 34v8M43 34v8"/>' +
      '<path class="c" d="M22 28V16h20v12z"/><path class="m" d="M20 16l12-10 12 10z"/><path class="lk" d="M32 6V2"/>' +
      '<circle class="w lk" cx="32" cy="22" r="5.5"/><g class="x-spin-slow"><path class="lk" d="M32 22V18"/></g><g class="x-spin"><path class="lk" d="M32 22h3"/></g>' +
      '<path class="k x-pop" style="--d:0.5s" d="M30 49h4v7h-4z"/>' + gnd(60, 2, 62) });
  B.place('langkawi', { id: 'sea-eagle', label: 'Sea eagle', colour: 'orange', mood: 'proud', tags: ['bird', 'sea'],
    svg: () => sun(12, 12, 6) + '<path class="m" d="M30 44l8-10 4 4 6-8 8 14z"/><path class="s" d="M0 44h64v20H0z"/>' + wave(48, 'lc') + wave(54, 'lw') + wave(60, 'lc') +
      '<g class="x-bob"><path class="c" d="M28 20l4-6 4 6 6 2-4 3 2 4-8-2-8 2 2-4-4-3z"/><path class="w" d="M30 18l2-3 2 3z"/><path class="k" d="M30 22l2 2 2-2z"/>' +
      '<g class="x-flap"><path class="k" d="M26 22q-8-10-22-6q10 0 16 10zM38 22q8-10 22-6q-10 0-16 10z"/></g></g><g class="x-drop"><circle class="w" cx="32" cy="38" r="1.3"/></g>' });
  B.place('chiang-mai', { id: 'sky-lanterns', label: 'Sky lanterns', colour: 'amber', mood: 'dreamy', tags: ['lantern', 'festival'],
    svg: () => '<path class="s" d="M0 56h64v8H0z"/>' + stars([[6, 8], [28, 6], [52, 10], [58, 30], [10, 36]]) + '<g class="x-glow"><circle class="w lc" cx="50" cy="14" r="4"/></g>' +
      [[16, 44, 0, 8], [30, 30, 1.1, 10], [46, 40, 2.2, 8], [10, 20, 0.7, 6]].map(([x, y, d, w]) => `<g class="x-rise" style="--d:${d}s"><path class="c" d="M${x - w / 2} ${y}l1 ${w * 0.9}h${w - 2}l1-${w * 0.9}q-${w / 2}-${w / 2}-${w} 0z"/><circle class="w x-flicker" cx="${x}" cy="${y + w * 0.9}" r="1.4"/></g>`).join('') +
      '<path class="m" d="M2 56l8-6 6 6 8-8 8 8z"/>' + gnd(56) });
  B.place('phuket', { id: 'shophouse-row', label: 'Old town shophouses', colour: 'pink', mood: 'cheerful', tags: ['street', 'heritage'],
    svg: () => cloud(2, 8, 0) + '<path class="c" d="M2 22h18v36H2z"/><path class="w" d="M22 16h20v42H22z"/><path class="s" d="M44 24h18v34H44z"/>' +
      '<path class="m" d="M2 22l9-5 9 5zM44 24l9-5 9 5z"/><path class="lc" d="M22 16h20M22 20q10-4 20 0"/>' +
      '<path class="w lk" d="M6 28h4v8H6zM13 28h4v8h-4zM48 30h4v8h-4zM55 30h4v8h-4z"/><path class="c" d="M26 24h12v8H26z"/><path class="k x-blink" style="--d:0.3s" d="M28 26h3v4h-3zM33 26h3v4h-3z"/>' +
      '<path class="lk" d="M6 46q2-6 4 0M48 48q2-6 4 0"/><path class="k" d="M27 42q5-6 10 0v16H27z"/><path class="w x-pop" style="--d:0.8s" d="M4 44h14v14H4z"/><path class="lc" d="M4 48h14M4 52h14"/>' +
      '<g class="x-swing o-t"><path class="c" d="M31 38v-3"/><circle class="c" cx="31" cy="39.5" r="2.4"/></g>' + gnd(58, 0, 64) });
  B.place('ayutthaya', { id: 'ruined-prang', label: 'Ruined prang', colour: 'orange', mood: 'dreamy', tags: ['temple', 'ruin'],
    svg: () => sun(12, 14, 6) + bird(34, 8, 0) + bird(44, 16, 0.9) + '<path class="m" d="M0 52q32-6 64 0v12H0z"/>' +
      '<path class="c" d="M18 56V46h28v10z"/><path class="s" d="M22 46V36h20v10z"/><path class="c" d="M26 36V26h12v10z"/>' +
      '<path class="c" d="M32 8q5 8 6 18H26q1-10 6-18z"/><path class="lk" d="M32 8v-4M29 20h6M28 26h8"/>' +
      '<path class="k" d="M29 46v-6h6v6zM29 56v-6h6v6z"/><path class="s" d="M4 56V42l6-4 4 6v12zM50 56V44l6-2 4 4v10z"/>' +
      '<g class="x-pulse"><path class="lc" d="M30 14l2-3 2 3z"/></g>' + gnd(56) });
  B.place('hoi-an', { id: 'silk-lanterns', label: 'Silk lanterns', colour: 'red', mood: 'cheerful', tags: ['lantern', 'festival'],
    svg: () => '<path class="lk" d="M0 10q32 10 64 0"/>' +
      [[10, 14, 0, 'c'], [26, 19, 0.5, 'w'], [42, 19, 1, 'c'], [56, 14, 1.5, 'w']].map(([x, y, d, f]) => `<g class="x-swing o-t" style="--d:${d}s"><path class="lk" d="M${x} ${y}v4"/><ellipse class="${f} lk" cx="${x}" cy="${y + 10}" rx="6" ry="7"/><path class="lk" d="M${x - 3} ${y + 5}q-1 6 0 10M${x + 3} ${y + 5}q1 6 0 10"/><path class="lc" d="M${x} ${y + 17}v7"/></g>`).join('') +
      '<path class="m" d="M0 46h64v18H0z"/>' + wave(52, 'lw') + wave(58, 'lc') + '<g class="x-glow"><ellipse class="w" cx="26" cy="49" rx="4" ry="1.6"/></g><g class="x-glow" style="--d:1s"><ellipse class="w" cx="42" cy="49" rx="4" ry="1.6"/></g>' });
  B.place('hue', { id: 'seven-tier-pagoda', label: 'Seven-tier pagoda', colour: 'amber', mood: 'calm', tags: ['pagoda', 'river'],
    svg: () => stars([[8, 6], [54, 8]]) + '<g class="x-glow"><circle class="w lc" cx="52" cy="14" r="4"/></g>' +
      [0, 1, 2, 3, 4, 5, 6].map(i => `<path class="${i % 2 ? 's' : 'c'}" d="M${32 - 7 + i * 0.6} ${46 - i * 5.5}h${14 - i * 1.2}v4h-${14 - i * 1.2}z"/><path class="lk" d="M${27 + i * 0.7} ${46 - i * 5.5}l-2 2M${37 - i * 0.7} ${46 - i * 5.5}l2 2"/>`).join('') +
      '<path class="lk" d="M32 8V3"/><path class="s" d="M10 52h44v4H10z"/>' + '<path class="m" d="M0 56h64v8H0z"/>' + wave(58, 'lw') + wave(62, 'lc') + bird(8, 18, 0.5) + '<g class="x-rise"><path class="lm" d="M20 50q-3-4 0-7"/></g>' });
  B.place('ha-long', { id: 'karst-junk', label: 'Karst and junk boat', colour: 'teal', mood: 'calm', tags: ['bay', 'boat'],
    svg: () => sun(50, 12, 5) + '<path class="m" d="M0 44V30l4-10 6 6 4-14 6 10 4 4v18z"/><path class="s" d="M30 44V32l5-6 3-12 6 8 4 2 6 20z"/><path class="lk" d="M10 36v6M38 34v8"/>' +
      '<path class="c" d="M0 44h64v20H0z" opacity="0.5"/><g class="x-bob"><path class="k" d="M18 54q14 4 30 0l3-5H16z"/><path class="lk" d="M30 49V32M40 49V36"/>' +
      '<path class="c" d="M30 33l-10 12h10zM40 37l-8 8h8z"/><path class="lk" d="M30 33l-10 12M40 37l-8 8"/></g>' + wave(56, 'lw') + wave(61, 'lc') + bird(8, 10, 0) });
  B.place('sapa', { id: 'rice-terraces', label: 'Rice terraces', colour: 'green', mood: 'calm', tags: ['terraces', 'mist'],
    svg: () => sun(14, 12, 5) + '<path class="m" d="M0 28l14-8 12 6 14-10 24 14v10H0z"/>' +
      '<path class="c" d="M0 34q16-6 32-2t32-4v8q-16 4-32 2T0 40z"/><path class="s" d="M0 40q16-4 32 0t32-4v6q-16 4-32 2T0 46z" opacity="0.8"/>' +
      '<path class="c" d="M0 46q16-4 32 0t32-4v8q-16 4-32 2T0 52z"/><path class="s" d="M0 52q16-4 32 0t32-4v6q-16 4-32 2T0 58z"/><path class="c" d="M0 58q16-4 32 0t32-4v10H0z"/>' +
      '<path class="lw" d="M4 36q10-3 20 0M34 44q10-3 22 0M8 54q10-3 20 0"/>' + cloud(0, 30, 0) + cloud(30, 44, 1.5) + '<g class="x-bob" style="--d:0.5s"><path class="lk" d="M46 28q3-3 6 0q3-3 6 0"/></g>' });
  B.place('puerto-princesa', { id: 'underground-river', label: 'Underground river cave', colour: 'slate', mood: 'dreamy', tags: ['cave', 'river'],
    svg: () => '<path class="m" d="M0 0h64v64H0z"/><path class="w" d="M10 64V34Q10 14 32 14t22 20v30z"/><path class="s" d="M16 64V36q0-16 16-16t16 16v28z"/>' +
      '<path class="k" d="M14 14l3 12 3-9 4 12 3-14 4 12 4-10 4 14 3-10 4 10 3-12 2 8V14z"/>' +
      '<g class="x-glow"><path class="w" d="M26 28l-2 8h4zM38 26l-2 10h4z"/></g>' +
      '<g class="x-flap"><path class="k" d="M20 22q3-4 6 0q-3-1-6 0zM42 30q3-4 6 0q-3-1-6 0z"/></g>' +
      '<path class="c" d="M0 48h64v16H0z" opacity="0.7"/><g class="x-bob"><path class="k" d="M22 49h20l-3 5H25z"/><path class="lk" d="M32 49v-6"/><circle class="w lk" cx="32" cy="41" r="2"/></g>' + wave(56, 'lw') + wave(61, 'lc') });
  B.place('boracay', { id: 'paraw-sail', label: 'Paraw sailboat', colour: 'orange', mood: 'cheerful', tags: ['boat', 'beach'],
    svg: () => sun(32, 28, 9) + '<path class="w" d="M0 38h64v6H0z"/><path class="c" d="M0 44h64v20H0z" opacity="0.5"/>' +
      '<g class="x-bob"><path class="lk t" d="M32 10v34"/><path class="c" d="M32 10l-14 26h14z"/><path class="w" d="M32 14l12 22H32z"/><path class="lk" d="M32 10l12 26"/>' +
      '<path class="k" d="M10 46q22 6 44 0l-4 6q-18 4-36 0z"/><path class="lk" d="M6 44l8 2M58 44l-8 2"/></g>' + wave(55, 'lw') + wave(60, 'lc') + bird(6, 12, 0.5) + bird(44, 8, 1.1) +
      palm(54, 40, 14) });
  B.place('vigan', { id: 'calesa', label: 'Calesa carriage', colour: 'amber', mood: 'cosy', tags: ['carriage', 'horse'],
    svg: () => '<path class="s" d="M0 52h64v12H0z"/><path class="lk" d="M2 56h6M14 60h6M30 57h6M46 59h6"/><path class="c" d="M2 20h14v30H2z"/><path class="w" d="M5 24h8v10H5z"/>' +
      '<g class="x-runbob"><path class="c" d="M18 24h20l2 18H16z"/><path class="m" d="M14 22h28l-4-6H18z"/><path class="w" d="M20 28h8v8h-8zM30 28h8v8h-8z"/>' +
      '<path class="lk" d="M40 40h8"/><g class="x-bob"><path class="k" d="M48 34q6-2 9 0l2-6-3-6 4-1 3 4v8l-3 4v12h-3V42h-5v10h-3V40z"/><path class="lk" d="M50 34q-2 2 0 6"/></g></g>' +
      wheel(26, 48, 7) + gnd(56, 0, 64) });
  B.place('bagan', { id: 'balloons-temples', label: 'Balloons over the plain', colour: 'orange', mood: 'dreamy', tags: ['balloons', 'temples'], intensity: 'standard',
    svg: () => sun(50, 40, 7) + '<path class="s" d="M0 50h64v14H0z"/>' +
      '<path class="m" d="M4 50V44l5-8 5 8v6zM22 50V42l6-10 6 10v8zM44 50V46l4-6 4 6v4z"/><path class="lk" d="M28 32v-4M9 36v-3"/>' +
      '<g class="x-float"><path class="c" d="M16 6q10 0 10 10t-5 14h-10q-5-4-5-14t10-10z"/><path class="w" d="M14 8q-4 6-3 14M22 8q4 6 3 14"/><path class="lk" d="M13 30v4h6v-4"/></g>' +
      '<g class="x-float" style="--d:1.1s"><path class="w lk" d="M44 4q8 0 8 8t-4 11h-8q-4-3-4-11t8-8z"/><path class="c" d="M44 5v18M38 14h12"/><path class="lk" d="M42 23v3h4v-3"/></g>' +
      '<g class="x-float" style="--d:2s"><path class="s" d="M32 22q5 0 5 5t-2 7h-6q-2-2-2-7t5-5z"/></g>' + gnd(50) });
  B.place('inle-lake', { id: 'leg-rower', label: 'Fisherman with a cone net', colour: 'teal', mood: 'calm', tags: ['boat', 'fishing'],
    svg: () => sun(12, 12, 5) + '<path class="m" d="M0 32l10-8 8 6 10-8 12 10 10-6 14 8v6H0z"/><path class="c" d="M0 34h64v30H0z" opacity="0.5"/>' +
      '<g class="x-bob"><path class="k" d="M6 46q26 6 52 0l-4 6q-22 4-44 0z"/>' +
      '<path class="lk t" d="M30 46V32"/><circle class="k" cx="30" cy="27" r="3.5"/><path class="s" d="M26 25q4-4 8 0z"/><path class="lk" d="M30 34l-4 12M30 34l5 5l-3 7"/>' +
      '<g class="x-swing o-t"><path class="lk" d="M38 26l12 20"/><path class="w lk" d="M38 22l14 2-2 20-12-6z"/><path class="lk" d="M43 23l-1 18M47 23l0 20"/></g></g>' + wave(54, 'lw') + wave(59, 'lc') + bird(40, 8, 0.5) });
  B.place('siem-reap', { id: 'lotus-towers', label: 'Lotus-bud towers', colour: 'amber', mood: 'proud', tags: ['temple', 'sunrise'],
    svg: () => sun(32, 28, 12) + bird(6, 10, 0) + bird(44, 12, 0.8) + '<path class="m" d="M0 52h64v12H0z"/>' +
      [[32, 8, 1], [22, 18, 0.8], [42, 18, 0.8], [13, 26, 0.6], [51, 26, 0.6]].map(([x, y, s]) => `<path class="k" d="M${x} ${y}q${5 * s} ${8 * s} ${5 * s} ${22 * s}h-${10 * s}q0-${14 * s} ${5 * s}-${22 * s}z"/>`).join('') +
      '<path class="s" d="M6 52V40h52v12z"/><path class="k" d="M12 52V44h6v8zM26 52V44h12v8zM46 52V44h6v8z"/><path class="lk" d="M6 40h52M6 36h52"/>' +
      '<path class="lm x-wave" d="M-6 58q3-3 6 0t6 0t6 0t6 0t6 0t6 0t6 0t6 0t6 0t6 0t6 0t6 0"/>' + '<g class="x-glow"><path class="lc" d="M20 20l-3-3M44 20l3-3M32 2v-3"/></g>' });
  B.place('luang-prabang', { id: 'falls-tiers', label: 'Turquoise waterfall', colour: 'teal', mood: 'calm', tags: ['waterfall', 'forest'],
    svg: () => '<path class="c" d="M0 0h6q4 12 0 26-2 12 4 38H0z"/><path class="c" d="M58 0h6v64h-8q4-26 2-38-2-12 0-26z"/><path class="s" d="M6 0h6l-4 14zM52 0h6l-4 14z"/>' +
      '<path class="s" d="M14 14h36v6H14zM8 30h48v6H8zM6 46h52v6H6z"/>' +
      '<path class="w" d="M20 14h24v6H20z"/><g class="x-fall"><path class="lw" d="M24 8v12M32 8v12M40 8v12"/></g>' +
      '<g class="x-fall" style="--d:0.5s"><path class="lw" d="M16 20v10M26 20v10M36 20v10M46 20v10"/></g><g class="x-fall" style="--d:1s"><path class="lw" d="M12 36v10M22 36v10M32 36v10M42 36v10M52 36v10"/></g>' +
      '<path class="c" d="M6 52h52v12H6z" opacity="0.8"/>' + wave(56, 'lw') + wave(61, 'lw') + '<g class="x-pop"><circle class="w" cx="20" cy="30" r="2"/></g><g class="x-pop" style="--d:1s"><circle class="w" cx="46" cy="44" r="2"/></g>' });
  B.place('vang-vieng', { id: 'river-tube', label: 'River tubing among karst', colour: 'green', mood: 'cheerful', tags: ['river', 'karst'],
    svg: () => sun(52, 10, 5) + '<path class="m" d="M0 40V22q4-12 10-10t6 14v14zM30 40V26q4-14 12-12t8 14l4 12z"/><path class="c" d="M0 38q8-8 18-4v6zM28 40q10-10 24-4l8 4z"/><path class="s" d="M20 40V30q4-8 8-4v14z"/>' +
      '<path class="c" d="M0 40h64v24H0z" opacity="0.5"/><path class="s" d="M0 42q16-4 32 0t32 0v4q-16 4-32 0T0 46z" opacity="0.6"/>' +
      '<g class="x-bob"><circle class="c lk" cx="30" cy="52" r="8"/><circle class="w" cx="30" cy="52" r="3.2"/><path class="lk" d="M24 46q6-4 12 0"/></g>' + wave(58, 'lw') + wave(62, 'lc') + bird(8, 8, 0.6) });

  animRegisterPack(B.pack({ id: 'asia-southeast', name: 'Asia: Southeast', description: 'Southeast Asia: an opening scene per country and big city, a small symbol for each country (gamelan, wau kite, orchid, longtail boat, pho and more) and one for every small town.' }));
})();
