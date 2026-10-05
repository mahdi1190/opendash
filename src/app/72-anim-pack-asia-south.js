/* ============================================================
   ANIMATION PACK "asia-south": South Asia (IN PK BD LK NP BT MV AF).
   PURE classic script. Opening scenes come from the registered full-screen scenes;
   this file adds one small symbol per country and one per small town.
   ============================================================ */
(function () {
  const B = asiaBuilder('south');
  B.scenes();
  const stars = (pts) => pts.map(([x, y], i) => `<circle class="k x-twinkle" style="--d:${((i * 0.37) % 2).toFixed(2)}s" cx="${x}" cy="${y}" r="0.9"/>`).join('');
  const gnd = (y, x1 = 2, x2 = 62) => `<path class="lm" d="M${x1} ${y}H${x2}"/>`;
  const sun = (x, y, r) => `<g class="x-pulse"><circle class="c" cx="${x}" cy="${y}" r="${r}"/></g>`;
  const moon = (x, y, r) => `<g class="x-glow"><circle class="w lc" cx="${x}" cy="${y}" r="${r}"/></g>`;
  const wave = (y, cls) => `<path class="${cls} x-wave" d="M-12 ${y}q3-3 6 0${'t6 0'.repeat(14)}"/>`;
  const bird = (x, y, d) => `<g class="x-bob" style="--d:${d}s"><path class="lk" d="M${x} ${y}q3-4 6 0q3-4 6 0"/></g>`;
  const steam = (x, y, d) => `<path class="lk x-steam" style="--d:${d}s" d="M${x} ${y}q-2-3 0-6t0-6"/>`;
  const flags = (x1, y1, x2, y2) => ['c', 'w', 's', 'c', 'w'].map((f, i) => { const t = (i + 0.5) / 5; return `<g class="x-flag" style="--d:${(i * 0.3).toFixed(1)}s"><rect class="${f}" x="${(x1 + (x2 - x1) * t - 2).toFixed(1)}" y="${(y1 + (y2 - y1) * t).toFixed(1)}" width="4" height="5"/></g>`; }).join('');

  // ---- countries ----
  B.element('IN', { id: 'diya', label: 'Diya lamp', colour: 'orange', mood: 'cheerful', tags: ['light', 'festival'],
    svg: () => stars([[10, 10], [52, 8], [58, 24], [8, 28]]) +
      '<g class="x-glow"><circle class="c" cx="32" cy="30" r="12"/></g>' +
      '<g class="x-flicker"><path class="c" d="M32 14q9 9 0 20-9-11 0-20z"/><path class="w" d="M32 22q4 5 0 10-4-5 0-10z"/></g>' +
      '<path class="k" d="M10 38h44q-2 14-22 14T10 38z"/><path class="c" d="M18 40h28" /><path class="lw" d="M16 44q16 5 32 0"/>' +
      '<g class="x-pop"><circle class="c" cx="8" cy="54" r="2"/></g><g class="x-pop" style="--d:0.6s"><circle class="w" cx="56" cy="54" r="2"/></g>' + gnd(56, 8, 56) });
  B.element('PK', { id: 'truck-art', label: 'Truck art', colour: 'pink', mood: 'cheerful', tags: ['vehicle', 'craft'], intensity: 'standard',
    svg: () => '<g class="x-runbob"><rect class="c" x="6" y="22" width="40" height="24" rx="2"/><path class="k" d="M46 30h10q4 0 4 6v10H46z"/><rect class="w" x="49" y="32" width="8" height="7"/>' +
      '<path class="w" d="M10 26h32v6H10z"/><circle class="k" cx="16" cy="29" r="1.6"/><circle class="k" cx="26" cy="29" r="1.6"/><circle class="k" cx="36" cy="29" r="1.6"/>' +
      '<path class="s" d="M10 36l5-3 5 3-5 3zM24 36l5-3 5 3-5 3z"/><path class="lw" d="M6 42h40"/>' +
      '<g class="x-swing o-t"><path class="lk t" d="M12 46v6M20 46v6M28 46v6"/></g></g>' +
      '<g class="x-spin"><circle class="k" cx="18" cy="52" r="6"/><path class="lw" d="M18 47v10M13 52h10"/></g>' +
      '<g class="x-spin"><circle class="k" cx="50" cy="52" r="6"/><path class="lw" d="M50 47v10M45 52h10"/></g>' + gnd(59) });
  B.element('BD', { id: 'water-lily', label: 'Water lily', colour: 'pink', mood: 'calm', tags: ['flower', 'water'],
    svg: () => '<path class="m" d="M0 40h64v24H0z"/><g class="x-bob"><ellipse class="c" cx="14" cy="42" rx="10" ry="3"/><ellipse class="c" cx="52" cy="44" rx="9" ry="2.6"/>' +
      '<path class="w" d="M32 18q-8 6-8 18l8 6 8-6q0-12-8-18z"/><path class="s" d="M32 26q-14 0-16 14l16 4zM32 26q14 0 16 14l-16 4z"/>' +
      '<path class="lc" d="M32 20v22M26 30l4 10M38 30l-4 10"/><circle class="c" cx="32" cy="38" r="2.4"/></g>' +
      '<g class="x-rise"><circle class="w" cx="20" cy="54" r="1.4"/></g>' + wave(54, 'lw') + wave(60, 'lc') });
  B.element('LK', { id: 'elephant', label: 'Elephant', colour: 'slate', mood: 'proud', tags: ['animal', 'procession'],
    svg: () => '<path class="m" d="M10 20q0-10 14-10h14q14 0 16 14v22q0 4-4 4h-5q-2 0-2-4v-8H26v8q0 4-2 4h-6q-4 0-4-4v-6q-4-4-4-14z"/>' +
      '<path class="s" d="M10 28q-4 6-2 12 4 2 8-2z"/><g class="x-swing o-t"><path class="k" d="M8 28q-6 8-4 20 1 4 4 3 1-2 0-5-1-8 4-14z"/></g>' +
      '<path class="w" d="M12 34l-7 6 7 1z"/><circle class="k" cx="14" cy="26" r="1.4"/>' +
      '<path class="c" d="M30 14h12v10H30z"/><path class="lw" d="M30 19h12"/><g class="x-blink"><circle class="w" cx="36" cy="19" r="1.4"/></g>' + gnd(55) });
  B.element('NP', { id: 'rhododendron', label: 'Rhododendron', colour: 'red', mood: 'cheerful', tags: ['flower', 'mountain'],
    svg: () => '<path class="s" d="M0 64l16-24 10 12 12-20 14 20 12-10v22z"/><path class="w" d="M34 32l4 6-4-2-3 3z"/>' +
      '<path class="lk" d="M32 62V44"/><g class="x-wobble"><path class="k" d="M32 50q-8-2-10-8 8 0 10 8zM32 50q8-2 10-8-8 0-10 8z"/>' +
      '<g class="x-pulse"><path class="c" d="M32 10q6 4 5 10 7 0 9 6-5 4-10 3 2 6-4 8-6-2-4-8-5 1-10-3 2-6 9-6-1-6 5-10z"/>' +
      '<circle class="w" cx="32" cy="24" r="3"/><path class="lk" d="M32 24l-4-5M32 24l5-4M32 24v-7"/></g></g>' });
  B.element('BT', { id: 'archery', label: 'Archery target', colour: 'green', mood: 'focused', tags: ['sport', 'target'],
    svg: () => '<path class="m" d="M0 60h64v4H0z"/><path class="lk t" d="M34 60V44M20 60l12-16M46 60L34 44"/>' +
      '<circle class="w" cx="34" cy="28" r="16"/><circle class="c" cx="34" cy="28" r="12"/><circle class="w" cx="34" cy="28" r="8"/><circle class="c" cx="34" cy="28" r="4"/><circle class="k" cx="34" cy="28" r="1.4"/>' +
      '<g class="x-slidel"><path class="lk t" d="M2 33H32"/><path class="k" d="M32 31l4 2-4 2z"/><path class="c" d="M2 31l-1 2 1 2zM5 31l-1 2 1 2z"/></g>' +
      '<g class="x-pulse"><circle class="lc" cx="34" cy="28" r="15"/></g>' });
  B.element('MV', { id: 'manta', label: 'Manta ray', colour: 'teal', mood: 'dreamy', tags: ['animal', 'ocean'],
    svg: () => '<path class="w" d="M0 0h64v64H0z"/><path class="m" d="M0 10h64v54H0z"/><g class="x-bob"><g class="x-breathe"><path class="k" d="M32 14q8 10 26 8-6 10-16 12-4 6-10 14-6-8-10-14-10-2-16-12 18 2 26-8z"/>' +
      '<path class="s" d="M32 26q4 4 12 4-6 4-12 8-6-4-12-8 8 0 12-4z"/><circle class="w" cx="28" cy="22" r="1.2"/><circle class="w" cx="36" cy="22" r="1.2"/><path class="lk" d="M32 48q0 8 -2 12"/></g></g>' +
      '<g class="x-rise"><circle class="lw" cx="12" cy="52" r="2"/></g><g class="x-rise" style="--d:0.9s"><circle class="lw" cx="54" cy="56" r="1.6"/></g>' + wave(10, 'lw') });
  B.element('AF', { id: 'kite', label: 'Kite', colour: 'violet', mood: 'cheerful', tags: ['toy', 'sky'],
    svg: () => '<path class="m" d="M0 56q16-8 32-3t32-3v14H0z"/><g class="x-float"><path class="c" d="M32 6l14 16-14 20-14-20z"/><path class="w" d="M32 6l14 16H18z"/><path class="lw" d="M32 6v36M18 22h28"/>' +
      '<g class="x-wave"><path class="lk" d="M32 42q-6 4 0 8t0 8" /><path class="c" d="M28 48l4-2-1 4zM34 54l4-2-1 4z"/></g></g>' +
      '<g class="x-slidel"><path class="w" d="M4 14q4-4 8-2 4-2 6 2z"/></g>' });

  // ---- small places ----
  B.place('jaipur', { id: 'hawa-mahal', label: 'Palace of Winds', colour: 'pink', mood: 'proud', tags: ['architecture', 'palace'],
    svg: () => sun(50, 10, 5) + '<path class="c" d="M12 58V30h40v28z"/><path class="s" d="M18 30V20h28v10z"/><path class="s" d="M24 20V12h16v8z"/>' +
      '<path class="c" d="M24 12q8-10 16 0z"/><path class="c" d="M18 20q-2-4 0-6 4 2 0 6zM46 20q2-4 0-6-4 2 0 6z"/>' +
      [[20, 34], [28, 34], [36, 34], [44, 34], [20, 44], [28, 44], [36, 44], [44, 44], [28, 23], [36, 23]].map(([x, y], i) => `<g class="x-blink" style="--d:${(i * 0.23).toFixed(2)}s"><path class="k" d="M${x} ${y + 6}v-4q2-3 4 0v4z"/></g>`).join('') +
      '<path class="lw" d="M12 52h40" />' + gnd(58) });
  B.place('agra', { id: 'white-mausoleum', label: 'White marble mausoleum', colour: 'slate', mood: 'calm', tags: ['architecture', 'dome'],
    svg: () => moon(52, 10, 4) + stars([[8, 8], [18, 16]]) + '<rect class="w" x="6" y="26" width="4" height="24"/><rect class="w" x="54" y="26" width="4" height="24"/>' +
      '<path class="s" d="M5 26q3-5 6 0zM53 26q3-5 6 0z"/><rect class="w" x="16" y="36" width="32" height="14"/><path class="w" d="M22 36q-1-14 10-14t10 14z"/><path class="w" d="M20 36q0-8 4-8M44 36q0-8-4-8"/>' +
      '<path class="k" d="M28 50V42q4-5 8 0v8z"/><path class="lk" d="M32 22v-6"/><circle class="c" cx="32" cy="15" r="1.4"/>' +
      '<path class="m" d="M0 50h64v14H0z"/><g class="x-wave"><path class="lw" d="M12 56h40M18 60h28"/></g><g class="x-pulse"><path class="lk" d="M32 52v8" /></g>' });
  B.place('varanasi', { id: 'floating-diyas', label: 'Floating lamps at the ghat', colour: 'orange', mood: 'dreamy', tags: ['river', 'lamps'],
    svg: () => stars([[10, 8], [30, 6], [52, 12]]) + '<path class="s" d="M0 26h64v8H0z"/><path class="c" d="M2 26V14h6v12zM12 26V10h8v16zM48 26V12h6v14zM56 26V16h6v10z"/>' +
      '<path class="m" d="M0 34h64v30H0z"/><path class="lm" d="M0 30h64"/>' +
      [[10, 44, 0], [28, 52, 0.5], [44, 46, 1.0], [54, 56, 1.6], [18, 58, 0.9]].map(([x, y, d]) => `<g class="x-bob" style="--d:${d}s"><path class="k" d="M${x - 4} ${y}h8q-1 4-4 4t-4-4z"/><g class="x-flicker" style="--d:${d}s"><path class="c" d="M${x} ${y - 6}q3 3 0 6-3-3 0-6z"/></g></g>`).join('') + wave(38, 'lw') });
  B.place('panaji', { id: 'white-church', label: 'White church on the hill', colour: 'blue', mood: 'cheerful', tags: ['architecture', 'church'],
    svg: () => '<path class="m" d="M0 44q16-8 32-2t32-4v26H0z"/><path class="c" d="M0 56q16-6 32-2t32-4v14H0z"/>' +
      '<rect class="w" x="18" y="22" width="28" height="30"/><path class="w" d="M18 22l14-8 14 8z"/><rect class="w" x="14" y="26" width="6" height="26"/><rect class="w" x="44" y="26" width="6" height="26"/>' +
      '<path class="k" d="M28 52V40q4-5 8 0v12z"/><path class="lk" d="M32 14V8M29 10h6"/><circle class="k" cx="32" cy="28" r="3"/><path class="lc" d="M22 32h6M36 32h6"/>' +
      '<g class="x-swing o-t"><path class="c" d="M30 25h4l1 5h-6z"/></g><g class="x-flap"><path class="lk" d="M50 12q3-4 6 0q3-4 6 0"/></g>' + gnd(52, 14, 50) });
  B.place('kochi', { id: 'fishing-nets', label: 'Chinese fishing nets', colour: 'teal', mood: 'calm', tags: ['sea', 'nets'],
    svg: () => sun(50, 14, 6) + '<path class="m" d="M0 44h64v20H0z"/><path class="lk t" d="M12 56V28l26-14"/><path class="lk t" d="M12 28l-6 14"/>' +
      '<g class="x-lift"><path class="lk" d="M38 14l8 8M38 14l-2 12"/><path class="lc" d="M30 38l16-6 2 8-16 6z"/><path class="lc" d="M32 34l4 10M38 32l4 10M44 30l4 10"/></g>' +
      '<path class="lk" d="M6 42v14"/><g class="x-bob"><path class="k" d="M48 52l4 3h8l3-3z"/></g>' + wave(48, 'lw') + wave(56, 'lc') });
  B.place('amritsar', { id: 'golden-temple', label: 'Golden temple and pool', colour: 'amber', mood: 'calm', tags: ['architecture', 'sacred'],
    svg: () => moon(10, 10, 4) + '<g class="x-glow"><rect class="c" x="22" y="26" width="20" height="12"/></g><path class="c" d="M24 26q8-14 16 0z"/><path class="lk" d="M32 12v-4"/><circle class="c" cx="32" cy="8" r="1.6"/>' +
      '<path class="c" d="M17 32q3-6 6 0zM41 32q3-6 6 0z"/><rect class="w" x="20" y="38" width="24" height="4"/><path class="lk" d="M25 30v4M32 30v4M39 30v4"/>' +
      '<path class="s" d="M0 42h64v22H0z"/><path class="c" d="M24 44h16v-2z" />' +
      '<g class="x-wave"><path class="c" d="M22 46h20M24 50h16M26 54h12" /></g>' + wave(60, 'lw') });
  B.place('leh', { id: 'stupa-flags', label: 'Stupa and prayer flags', colour: 'indigo', mood: 'calm', tags: ['mountain', 'stupa'],
    svg: () => '<path class="s" d="M0 40l14-22 10 12 12-16 12 18 16-12v44H0z"/><path class="w" d="M14 18l4 7-4-2-4 3zM36 14l4 8-4-3-4 3z"/>' +
      '<path class="m" d="M0 50h64v14H0z"/><rect class="w" x="22" y="48" width="20" height="5"/><path class="w" d="M24 48q0-12 8-12t8 12z"/><rect class="w" x="29" y="30" width="6" height="6"/><path class="c" d="M31 30l1-8 1 8z"/>' +
      '<path class="lk" d="M4 30L28 46M60 26L36 46"/>' + flags(4, 30, 28, 46) + flags(60, 26, 36, 46) + gnd(53, 2, 62) });
  B.place('darjeeling', { id: 'toy-train-tea', label: 'Toy train and tea hills', colour: 'green', mood: 'cheerful', tags: ['train', 'tea'],
    svg: () => '<path class="c" d="M0 34q16-12 32-4t32-6v40H0z"/><path class="lc" d="M0 38q16-10 32-3t32-5M0 44q16-9 32-3t32-5"/>' +
      '<path class="lm" d="M0 56h64"/><path class="lk" d="M4 58v-2M14 58v-2M24 58v-2M34 58v-2M44 58v-2M54 58v-2"/>' +
      '<g class="x-chug"><rect class="c" x="26" y="42" width="22" height="10" rx="1"/><rect class="k" x="14" y="44" width="14" height="8"/><rect class="k" x="16" y="38" width="4" height="6"/><rect class="w" x="30" y="45" width="6" height="4"/><rect class="w" x="40" y="45" width="6" height="4"/>' +
      '<circle class="k" cx="18" cy="54" r="2.6"/><circle class="k" cx="30" cy="54" r="2.2"/><circle class="k" cx="44" cy="54" r="2.2"/></g>' +
      '<g class="x-rise"><circle class="w" cx="18" cy="34" r="3"/></g><g class="x-rise" style="--d:0.7s"><circle class="w" cx="22" cy="28" r="2.4"/></g>' });
  B.place('hunza', { id: 'apricot-blossom', label: 'Apricot blossom and peaks', colour: 'pink', mood: 'dreamy', tags: ['mountain', 'blossom'],
    svg: () => '<path class="s" d="M0 40l14-28 10 16 12-22 14 26 14-14v46H0z"/><path class="w" d="M14 12l4 8-4-2-4 3zM36 6l5 10-5-3-4 4z"/>' +
      '<path class="m" d="M0 52h64v12H0z"/><path class="lk t" d="M22 58V40M22 46l-8-6M22 44l8-8M44 58V44M44 50l-6-6M44 48l6-4"/>' +
      '<g class="x-pulse"><circle class="c" cx="14" cy="38" r="4"/><circle class="c" cx="22" cy="32" r="5"/><circle class="c" cx="30" cy="36" r="4"/></g>' +
      '<g class="x-pulse" style="--d:0.5s"><circle class="c" cx="38" cy="42" r="3.4"/><circle class="c" cx="45" cy="38" r="4"/><circle class="c" cx="51" cy="42" r="3.4"/></g>' +
      '<g class="x-fall"><circle class="c" cx="18" cy="44" r="1.2"/></g><g class="x-fall" style="--d:0.9s"><circle class="c" cx="48" cy="46" r="1.2"/></g><g class="x-fall" style="--d:1.6s"><circle class="c" cx="30" cy="42" r="1.2"/></g>' });
  B.place('coxs-bazar', { id: 'long-beach-sunset', label: 'Long beach sunset', colour: 'orange', mood: 'calm', tags: ['beach', 'sunset'],
    svg: () => '<g class="x-sunset"><circle class="c" cx="32" cy="30" r="10"/></g><path class="m" d="M0 34h64v10H0z"/>' +
      '<path class="s" d="M0 44h64v20H0z"/><path class="lw x-wave" d="M-12 42q3-3 6 0t6 0t6 0t6 0t6 0t6 0t6 0t6 0t6 0t6 0t6 0t6 0t6 0t6 0"/>' +
      '<path class="lk t" d="M10 60V46M10 46q-6-2-8 2M10 46q6-2 8 2M10 46q-2-5-8-4M10 46q2-5 8-4"/>' +
      '<g class="x-swing o-t"><path class="lk" d="M48 50v10"/><path class="c" d="M40 50q8-8 16 0z"/></g>' + bird(18, 20, 0.4) + bird(46, 14, 1) });
  B.place('kandy', { id: 'kandyan-drum', label: 'Kandyan drum', colour: 'red', mood: 'energetic', tags: ['instrument', 'drum'],
    svg: () => '<path class="m" d="M0 50q16-4 32 0t32-2v16H0z"/><g class="x-bounce"><path class="k" d="M18 24q14-6 28 0v22q-14 6-28 0z"/><ellipse class="w" cx="18" cy="35" rx="3.5" ry="11"/><ellipse class="c" cx="46" cy="35" rx="3.5" ry="11"/>' +
      '<path class="c" d="M22 24l5 22M32 22l-1 26M42 24l-5 22"/><path class="lw" d="M22 26q10-3 20 0M22 44q10 3 20 0"/></g>' +
      '<g class="x-kick"><path class="lk t" d="M10 8l12 12"/><circle class="c" cx="9" cy="7" r="2"/></g><g class="x-kick" style="--d:0.4s"><path class="lk t" d="M54 8L42 20"/><circle class="c" cx="55" cy="7" r="2"/></g>' });
  B.place('galle', { id: 'fort-lighthouse', label: 'Fort lighthouse', colour: 'blue', mood: 'calm', tags: ['lighthouse', 'fort'],
    svg: () => '<path class="m" d="M0 0h64v40H0z"/><g class="x-glow"><path class="c" d="M36 14L62 6v14z"/></g><g class="x-glow" style="--d:1s"><path class="c" d="M28 14L2 6v14z"/></g>' +
      '<path class="w" d="M28 52l2-30h4l2 30z"/><path class="c" d="M29 30h6l.5 6h-7zM28.5 40h7l.5 6h-8z"/><rect class="k" x="28" y="14" width="8" height="8"/><g class="x-pulse"><circle class="c" cx="32" cy="18" r="2"/></g><path class="k" d="M28 14l4-5 4 5z"/>' +
      '<path class="s" d="M0 50h64v6H0z"/><path class="lk" d="M6 50v-3M14 50v-3M22 50v-3M42 50v-3M50 50v-3M58 50v-3"/>' + wave(58, 'lw') + wave(63, 'lc') });
  B.place('pokhara', { id: 'paraglider-lake', label: 'Paragliders over the lake', colour: 'blue', mood: 'cheerful', tags: ['lake', 'mountain', 'sport'],
    svg: () => '<path class="s" d="M0 38l14-20 8 10 12-20 10 18 6-8 14 20z"/><path class="w" d="M34 8l5 10-4-3-4 4zM14 18l3 6-3-2-3 3z"/>' +
      '<path class="m" d="M0 38h64v26H0z"/><g class="x-float"><path class="c" d="M14 14q8-8 16 0z"/><path class="lk" d="M16 14l6 10M28 14l-6 10"/><circle class="k" cx="22" cy="26" r="1.6"/></g>' +
      '<g class="x-float" style="--d:1s"><path class="w" d="M44 22q6-6 12 0z"/><path class="lk" d="M46 22l4 7M54 22l-4 7"/></g>' +
      '<g class="x-bob"><path class="k" d="M20 54l3 3h10l3-3z"/></g>' + wave(46, 'lw') + wave(60, 'lc') });
  B.place('paro', { id: 'cliff-monastery', label: 'Cliffside monastery', colour: 'amber', mood: 'calm', tags: ['monastery', 'cliff', 'flags'],
    svg: () => '<path class="s" d="M0 64V26l16-6 10 6v12l-4 6 4 8v18z"/><path class="m" d="M26 64V40l8-4 8 6 8-12 14-4v38z"/>' +
      '<path class="w" d="M30 34h14v8H30z"/><path class="c" d="M28 34l9-8 9 8z"/><path class="k" d="M34 42v-4h4v4z"/><path class="c" d="M40 28l9-6 7 7-12 5z"/>' +
      '<path class="lk" d="M30 48l-6 6M44 42l6 4"/>' + flags(10, 12, 34, 22) + '<g class="x-flap"><path class="lk" d="M48 10q3-4 6 0q3-4 6 0"/></g>' });
  B.place('bamiyan', { id: 'cliff-valley', label: 'Cliff caves and poplars', colour: 'amber', mood: 'calm', tags: ['valley', 'cliff'],
    svg: () => sun(50, 12, 5) + '<path class="s" d="M0 14l10-4 12 2 14-4 14 2 14-2v40H0z"/><path class="c" d="M0 22h64v24H0z"/>' +
      '<path class="k" d="M10 28q3-5 6 0v6h-6zM22 32q3-5 6 0v6h-6zM36 26q3-5 6 0v6h-6zM48 32q3-5 6 0v6h-6z"/>' +
      '<path class="m" d="M0 46h64v18H0z"/>' +
      [[8, 0], [18, 0.4], [44, 0.8], [56, 0.2]].map(([x, d]) => `<g class="x-wobble o-b" style="--d:${d}s"><path class="lk t" d="M${x} 58V50"/><path class="lc t" d="M${x} 50q-4-4 0-12 4 8 0 12z"/></g>`).join('') + gnd(58) });
  animRegisterPack(B.pack({ id: 'asia-south', name: 'Asia: South', description: 'India, Pakistan, Bangladesh, Sri Lanka, Nepal, Bhutan, the Maldives and Afghanistan: lamps, palaces, tea hills and Himalayan flags.' }));
})();
