/* ============================================================
   ANIMATION PACK "asia-east": China, Japan, the Koreas, Mongolia, Taiwan, Hong Kong and Macau.
   PURE classic script. A small symbol per country and one per small city; the full-screen
   scenes come from the scene files via B.scenes().
   ============================================================ */
(function () {
  const B = asiaBuilder('east');
  B.scenes();
  const tw = (x, y, d) => `<path class="c x-twinkle" style="--d:${d || 0}s" d="M${x} ${y - 3}l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>`;
  const sun = (x, y, r) => `<circle class="s x-pulse" cx="${x}" cy="${y}" r="${r || 6}"/>`;
  const moon = (x, y) => `<path class="s x-glow" d="M${x} ${y - 6}a6 6 0 1 0 6 8 5 5 0 0 1-6-8z"/>`;
  const gr = (y) => `<path class="lm" d="M3 ${y || 58}h58"/>`;
  const wv = (y, d, cls) => `<path class="${cls || 'lc'} x-wave" style="--d:${d || 0}s" d="M-2 ${y}${'q3-2 6 0t6 0'.repeat(12)}"/>`;
  const bird = (x, y, d) => `<path class="lk x-flap" style="--d:${d || 0}s" d="M${x} ${y}q2-3 4 0 2-3 4 0"/>`;
  const cloud = (x, y, d) => `<g class="x-bob" style="--d:${d || 0}s"><path class="w" d="M${x} ${y}h14a4 4 0 0 0-1-7 5 5 0 0 0-9-1 4 4 0 0 0-4 8z"/></g>`;
  const stars = (a) => a.map(([x, y], i) => tw(x, y, i * 0.5)).join('');
  const snow = (n) => Array.from({ length: n }, (_, i) => `<circle class="w x-fall" style="--d:${(i * 0.45).toFixed(2)}s" cx="${6 + ((i * 17) % 52)}" cy="${4 + ((i * 7) % 14)}" r="1.1"/>`).join('');
  const steam = (x, y) => `<path class="lm x-steam" d="M${x} ${y}q-2-3 0-6"/><path class="lm x-steam" style="--d:0.8s" d="M${x + 4} ${y}q2-3 0-6"/>`;
  const karst = (x, w, h, y) => `<path class="m" d="M${x} ${y || 44}q${w * 0.1}-${h} ${w * 0.5}-${h} ${w * 0.4} 0 ${w * 0.5} ${h}z"/>`;

  /* ================= COUNTRIES ================= */
  B.element('CN', { id: 'panda', label: 'Panda with bamboo', colour: 'green', mood: 'cheerful', tags: ['animal', 'panda', 'bamboo'],
    svg: () => '<path class="lc" d="M52 58V10M58 58V16"/><path class="lc" d="M52 24h6M52 38h6"/><g class="x-swing o-t" style="--d:0.4s"><path class="c lk" d="M52 14q-8-2-10 4 6 2 10-4zM58 22q6 0 8 6-6 0-8-6z"/></g>'
      + '<g class="x-breathe"><ellipse class="k" cx="22" cy="48" rx="13" ry="9"/><ellipse class="w lk" cx="26" cy="46" rx="14" ry="12"/><path class="k" d="M14 54q-4 2-4 6h8zM34 54q4 2 4 6h-8z"/></g>'
      + '<g class="x-bob"><circle class="k" cx="12" cy="16" r="4.4"/><circle class="k" cx="30" cy="16" r="4.4"/><circle class="w lk" cx="21" cy="26" r="11"/><ellipse class="k" cx="16" cy="25" rx="3" ry="4" transform="rotate(20 16 25)"/><ellipse class="k" cx="26" cy="25" rx="3" ry="4" transform="rotate(-20 26 25)"/><circle class="w" cx="16" cy="24" r="1"/><circle class="w" cx="26" cy="24" r="1"/><ellipse class="k" cx="21" cy="30" rx="2" ry="1.4"/><path class="lk" d="M21 31v2q-2 2-4 0M21 33q2 2 4 0"/></g>' + gr(60) });
  B.element('JP', { id: 'sushi', label: 'Sushi', colour: 'orange', mood: 'cheerful', tags: ['food', 'sushi'],
    svg: () => '<path class="m" d="M4 46h56v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path class="lk" d="M10 52h44"/>'
      + '<g class="x-bob"><path class="w lk" d="M10 38h18v8H10z"/><path class="c lk" d="M8 30q10-6 22 0 0 8-4 10H12q-4-2-4-10z"/><path class="w" d="M13 33q4-2 8-1"/></g>'
      + '<g class="x-bob" style="--d:0.5s"><path class="w lk" d="M36 36h16v10H36z"/><path class="k" d="M36 40h16v3H36z"/><circle class="c" cx="44" cy="30" r="0"/></g><g class="x-bob" style="--d:0.5s"><ellipse class="c lk" cx="44" cy="35" rx="8" ry="3.4"/><path class="w" d="M40 34h6"/></g>'
      + '<path class="lk t x-wobble" d="M6 24l24 8M10 20l24 8"/>' + steam(30, 22).replace(/x-steam/g, 'x-steam') + tw(56, 18, 0.2) });
  B.element('KR', { id: 'bibimbap', label: 'Bibimbap', colour: 'red', mood: 'cosy', tags: ['food', 'bowl'],
    svg: () => steam(24, 20) + steam(38, 20) + '<path class="m lk" d="M8 32h48q-2 20-24 22Q10 52 8 32z"/><ellipse class="w lk" cx="32" cy="32" rx="24" ry="5"/>'
      + '<path class="s" d="M14 31q4 3 10 0z"/><path class="c" d="M28 30q6 3 12 0z"/><path class="lc" d="M16 33q4-2 8 0M40 34q4-2 8-1"/><circle class="m" cx="44" cy="31" r="2.4"/><circle class="s" cx="22" cy="34" r="1.2"/><g class="x-pulse"><circle class="w lk" cx="32" cy="31.4" r="3.6"/><circle class="c" cx="32" cy="31.4" r="1.7"/></g>'
      + '<path class="k" d="M24 54h16v4H24z"/><g class="x-wobble"><path class="lk t" d="M46 8l-8 18M50 10l-8 18"/></g>' + tw(10, 14, 0.3) + tw(56, 24, 0.8) });
  B.element('KP', { id: 'magnolia', label: 'Magnolia blossom', colour: 'pink', mood: 'calm', season: ['spring'], tags: ['flower', 'magnolia'],
    svg: () => '<path class="lk" d="M32 58V40M32 50q-10-2-14-10M32 46q10-4 14-12"/><g class="x-bob"><path class="c lk" d="M32 8q-9 8-8 22 4 4 8 4t8-4q1-14-8-22z"/><path class="w lk" d="M32 12q-4 8-4 18"/><path class="c lk" d="M18 20q-2 12 6 20 4 0 6-4-6-6-8-14zM46 20q2 12-6 20-4 0-6-4 6-6 8-14z"/><path class="w" d="M26 18q-2 6 0 12"/></g>'
      + '<g class="x-swing o-t"><path class="c lk" d="M14 46q-8-2-10-8 8-2 12 4z"/></g><g class="x-swing o-t" style="--d:0.6s"><path class="c lk" d="M50 42q8-2 10-8-8-2-12 4z"/></g><circle class="c x-fall" cx="12" cy="20" r="1.5"/><circle class="c x-fall" style="--d:1s" cx="52" cy="14" r="1.3"/>' + gr(59) });
  B.element('MN', { id: 'morin-khuur', label: 'Horse-head fiddle', colour: 'amber', mood: 'dreamy', tags: ['instrument', 'music'],
    svg: () => '<path class="lk t" d="M32 22v36"/><g class="x-bob" style="--d:1s"><path class="k" d="M32 22q-2-6 0-9 4-2 8 2 2 2 0 4-4-2-6 1 0 3-2 2z"/><path class="c lk" d="M30 12l-3-6 4 2zM34 11l1-6 2 5z"/></g><path class="c lk" d="M22 44l10-8 10 8-4 14H26z"/><path class="w" d="M30 44h4v4h-4z"/><path class="lw" d="M32 26v28"/>'
      + '<g class="x-slidel"><path class="lk t" d="M10 52l44-14"/><path class="lc" d="M12 50l40-12"/></g><path class="lm x-float" d="M52 22q4-3 2-8M10 28q4-3 2-8"/><circle class="c x-float" style="--d:0.7s" cx="50" cy="30" r="1.6"/><circle class="c x-float" cx="14" cy="38" r="1.4"/>' });
  B.element('TW', { id: 'bubble-tea', label: 'Bubble tea', colour: 'amber', mood: 'cheerful', tags: ['drink', 'tea'],
    svg: () => '<path class="lk t" d="M36 4l-4 24"/><path class="w lk" d="M18 14h28l-4 42q-1 3-4 3H26q-3 0-4-3z"/><path class="c" d="M20 24h24l-3 31q-1 2-3 2H26q-2 0-3-2z"/><path class="w" d="M19 14h26q0 4-13 4t-13-4z"/>'
      + '<path class="m" d="M22 40h20l-1 15H23z"/>' + [[26, 52], [32, 53], [38, 52], [29, 48], [35, 48], [32, 44]].map(([x, y], i) => `<circle class="k x-bob" style="--d:${(i * 0.25).toFixed(2)}s" cx="${x}" cy="${y}" r="2.3"/>`).join('')
      + '<circle class="w x-rise" cx="28" cy="38" r="1.2"/><circle class="w x-rise" style="--d:0.8s" cx="36" cy="34" r="1"/>' + tw(10, 14, 0.2) + tw(54, 30, 0.9) + gr(60) });
  B.element('HK', { id: 'dim-sum', label: 'Dim sum steamers', colour: 'amber', mood: 'cosy', tags: ['food', 'dim-sum'],
    svg: () => steam(26, 20) + steam(38, 18) + '<g class="x-bob" style="--d:0.2s"><path class="c lk" d="M12 40h40v6H12z"/><path class="lk" d="M20 40v6M28 40v6M36 40v6M44 40v6"/></g>'
      + '<g class="x-bob"><path class="c lk" d="M12 28h40v8H12z"/><path class="lk" d="M20 28v8M28 28v8M36 28v8M44 28v8"/><path class="w lk" d="M12 28q20-8 40 0z"/></g>'
      + '<path class="c lk" d="M12 48h40v8H12z"/><path class="lk" d="M20 48v8M28 48v8M36 48v8M44 48v8"/><path class="lm" d="M8 58h48"/>'
      + '<g class="x-pop"><circle class="w lk" cx="46" cy="22" r="0"/></g><path class="k x-wobble" d="M52 12l8 10M56 10l8 10" style="--d:0.3s"/>' });
  B.element('MO', { id: 'egg-tart', label: 'Egg tart', colour: 'amber', mood: 'cheerful', tags: ['food', 'pastry'],
    svg: () => steam(26, 28) + steam(38, 28) + '<g class="x-bob"><path class="w lk" d="M10 38h44l-4 16q-1 4-5 4H19q-4 0-5-4z"/><path class="m" d="M12 42h40M14 48h36"/><path class="c lk" d="M12 38q-2-6 6-8 6-4 14-2 10-2 14 4 4 2 2 6z"/><path class="c" d="M16 36q16 4 32 0-4-4-16-4t-16 4z"/><path class="k x-glow" d="M20 34q4-1 6 0 3 1 2 2-4 0-8-2zM38 33q4-1 6 1-3 1-6-1z"/></g>' + gr(60) + tw(8, 18, 0.1) + tw(56, 20, 0.7) });

  /* ================= SMALL CITIES ================= */
  B.place('harbin', { id: 'ice-lantern', label: 'Ice lantern castle', colour: 'blue', mood: 'dreamy', season: ['winter'], tags: ['ice', 'winter'],
    svg: () => stars([[8, 8], [54, 10], [30, 6]]) + '<path class="m" d="M2 58V50h60v8z"/><path class="w lk" d="M12 52V34h10v18zM42 52V34h10v18zM22 52V24h20v28z"/><path class="w lk" d="M14 34v-6l3-3 3 3v6zM44 34v-6l3-3 3 3v6zM25 24v-8l7-8 7 8v8z"/><path class="lk" d="M32 8V4"/>'
      + '<path class="c x-glow" d="M28 38h8v14h-8zM15 38h4v10h-4zM45 38h4v10h-4z"/><path class="c x-glow" style="--d:0.8s" d="M29 18h6v6h-6z"/>' + snow(9) + gr(58) });
  B.place('kunming', { id: 'camellia', label: 'Spring camellia', colour: 'red', mood: 'cheerful', season: ['spring'], tags: ['flower', 'spring'],
    svg: () => sun(12, 12, 5) + '<path class="lk" d="M32 58V44"/><path class="c lk" d="M22 52q-10-4-8-10 6 0 10 6zM42 52q10-4 8-10-6 0-10 6z"/><g class="x-bob"><circle class="c lk" cx="32" cy="30" r="12"/><path class="lk" d="M32 18q-6 8 0 12 6 4 8-4M24 26q8 2 8 6M40 30q-8-2-8 2"/><circle class="w" cx="32" cy="31" r="2"/><circle class="w x-pulse" cx="29" cy="28" r="1"/><circle class="w" cx="35" cy="28" r="1"/><circle class="w" cx="32" cy="34" r="1"/></g>'
      + '<path class="c x-fall" d="M12 30q3-2 4 1-2 3-4-1z"/><path class="c x-fall" style="--d:1.1s" d="M52 24q3-2 4 1-2 3-4-1z"/>' + gr(59) });
  B.place('guilin', { id: 'cormorant-raft', label: 'Cormorant fisherman raft', colour: 'green', mood: 'calm', tags: ['river', 'karst'],
    svg: () => sun(52, 10, 4) + karst(2, 24, 26, 46) + karst(32, 30, 34, 46) + '<path class="m" d="M2 46h60v14H2z"/>' + wv(48, 0, 'lw') + wv(55, 0.6, 'lw')
      + '<g class="x-bob" style="--d:0.4s"><path class="c lk" d="M12 52h40" /><path class="lk t" d="M12 51h40"/><path class="k" d="M18 51q0-6 3-6l1-4 3 2 1 8z"/><path class="w lk" d="M38 44q2-4 4-2v6M44 44q2-4 4-2v6"/><path class="k" d="M38 51q0-4 2-4h2q0 4-2 4zM44 51q0-4 2-4h2q0 4-2 4z"/><path class="lk" d="M22 40l-4 10"/></g>' + bird(40, 20, 0.2) + wv(59, 0.2, 'lm') });
  B.place('lhasa', { id: 'prayer-wheel', label: 'Prayer wheel', colour: 'amber', mood: 'calm', tags: ['wheel', 'prayer'],
    svg: () => sun(12, 12, 5) + '<path class="m" d="M2 58V40l14-10 12 8 14-12 20 16v16z"/><path class="w" d="M16 30l-2 4 4-1zM42 26l-2 5 5-1z"/>' + '<path class="s lk" d="M20 58V50h24v8z"/><path class="lk t" d="M32 50v-4"/>'
      + '<g class="x-spin" style="--ad:4s"><rect class="c lk" x="23" y="20" width="18" height="24" rx="3"/><path class="lk" d="M23 27h18M23 37h18"/><path class="w lk" d="M29 29h6v6h-6z"/></g>'
      + '<path class="lk" d="M32 20v-5"/><g class="x-swing o-t"><path class="c" d="M32 15l-3 4h6z"/></g><circle class="c x-twinkle" cx="52" cy="36" r="1.4"/>' + gr(58) });
  B.place('qingdao', { id: 'beer', label: 'Beer by the sea', colour: 'amber', mood: 'cheerful', tags: ['beer', 'harbour'],
    svg: () => sun(52, 10, 4) + '<path class="m" d="M2 36h60v24H2z"/>' + wv(38, 0, 'lw') + bird(8, 14, 0.2) + bird(42, 22, 0.8)
      + '<path class="w lk" d="M16 24h22l-2 32H18z"/><path class="c" d="M18 30h18l-1.6 24H19.6z"/><path class="lk t" d="M38 30q10 0 10 8t-10 8"/>' + '<g class="x-bob"><path class="w lk" d="M15 24q0-6 5-5 2-4 7-1 5-2 7 3 3 1 2 4z"/></g>'
      + [[22, 52], [28, 50], [32, 52]].map(([x, y], i) => `<circle class="w x-rise" style="--d:${i * 0.5}s" cx="${x}" cy="${y}" r="1.2"/>`).join('') + wv(58, 0.5, 'lc') });
  B.place('lijiang', { id: 'waterwheel', label: 'Old town waterwheel', colour: 'teal', mood: 'calm', tags: ['water', 'old-town'],
    svg: () => sun(52, 10, 4) + '<path class="m" d="M2 28l12-8 12 8v10H2zM40 26l12-8 10 6v14H40z"/><path class="s lk" d="M4 38h22v20H4zM40 38h22v20H40z"/><path class="k" d="M8 26l6-4 6 4z"/>' + '<path class="m" d="M26 44h14v16H26z"/>' + wv(52, 0, 'lw') + wv(57, 0.5, 'lw')
      + '<g class="x-spin" style="--ad:5s"><circle class="lk t" cx="32" cy="42" r="12"/><path class="lk" d="M32 30v24M20 42h24M23.5 33.5l17 17M40.5 33.5l-17 17"/><circle class="c lk" cx="32" cy="42" r="2.6"/></g>' + '<path class="lw x-drop" d="M42 56v4"/>' + gr(60) });
  B.place('dunhuang', { id: 'crescent-lake', label: 'Crescent Lake in the dunes', colour: 'amber', mood: 'calm', tags: ['desert', 'oasis'],
    svg: () => moon(14, 14) + stars([[40, 8], [54, 16]]) + '<path class="c" d="M2 44q14-18 30-6t30-8v30H2z"/><path class="lm" d="M2 44q14-18 30-6t30-8"/><path class="c" d="M2 58q22-14 40-4t20-8v14H2z"/>'
      + '<path class="w lk" d="M18 52q2-8 14-8t14 8q-4 6-14 5t-14-5z"/>' + wv(51, 0, 'lw').replace(/q3-2 6 0t6 0/g, 'q3-2 6 0t6 0') + '<path class="lk" d="M24 46l2-4M40 46l-2-4"/><path class="c lk" d="M28 42v-8l4-4 4 4v8z"/><path class="lk" d="M32 30v-4"/><path class="c x-flicker" d="M32 24q-2 2 0 4 2-2 0-4z"/>' });
  B.place('kashgar', { id: 'kebab', label: 'Lamb kebabs', colour: 'red', mood: 'cosy', tags: ['food', 'bazaar'],
    svg: () => steam(18, 30) + steam(32, 28) + steam(46, 30) + '<g class="x-wobble"><path class="lk t" d="M6 22l36 12M10 16l36 12"/><path class="c lk" d="M14 26l8 3-2 6-8-3zM24 29l8 3-2 6-8-3zM34 32l8 3-2 6-8-3z"/><path class="m" d="M17 22l6 2-1.4 4-6-2zM27 25l6 2-1.4 4-6-2z"/></g>'
      + '<path class="k" d="M6 44h52v4H6z"/><path class="lk" d="M10 48v10M54 48v10"/><path class="c x-flicker" d="M14 44q-2-4 0-8 2 4 0 8zM26 44q-2-4 0-8 2 4 0 8zM38 44q-2-4 0-8 2 4 0 8zM48 44q-2-4 0-8 2 4 0 8z"/><path class="c x-flicker" style="--d:0.4s" d="M20 44q-2-3 0-6 2 3 0 6zM32 44q-2-3 0-6 2 3 0 6zM43 44q-2-3 0-6 2 3 0 6z"/>' + gr(58) });
  B.place('suzhou', { id: 'moon-gate', label: 'Garden moon gate', colour: 'green', mood: 'calm', tags: ['garden', 'gate'],
    svg: () => '<path class="m" d="M2 58V16h60v42z"/><path class="w lk" d="M2 58V16h60v42zM32 56a18 18 0 1 1 0-36 18 18 0 0 1 0 36z" fill-rule="evenodd"/><path class="k" d="M2 14h60v4H2z"/><circle class="lk t" cx="32" cy="38" r="18" fill="none"/>'
      + '<path class="m" d="M16 56q16-12 32 0z"/><path class="lk" d="M16 56q16-12 32 0"/>' + '<g class="x-swing o-t" style="--ad:3s"><path class="lc" d="M22 22q-2 10 2 18M26 22q0 8 2 14M18 24q-2 8 0 14"/><path class="c" d="M21 28q-2 1-1 3zM25 32q-2 1-1 3z"/></g>' + wv(52, 0, 'lw') + '<circle class="c x-float" cx="42" cy="34" r="2"/><path class="c x-float" style="--d:0.8s" d="M36 44q3-3 6 0-3 3-6 0z"/>' + bird(50, 10, 0.4) });
  B.place('kyoto', { id: 'torii', label: 'Torii gate path', colour: 'red', mood: 'proud', tags: ['torii', 'shrine'],
    svg: () => sun(52, 12, 4) + '<path class="m" d="M2 58V30l12 10 10-14 12 14 14-10 12 8v20z"/><path class="lc" d="M3 58l10-10h38l10 10z"/>' + '<path class="c lk" d="M10 56V28M54 56V28"/><path class="c lk t" d="M6 24q26 6 52 0v4Q32 32 6 28z"/><path class="c lk" d="M12 34h40v4H12z"/><path class="k" d="M30 28v6h4v-6z"/>'
      + '<path class="c lk" d="M22 56V36M42 56V36"/><path class="c lk" d="M18 40h28v3H18z"/><g class="x-swing o-t"><path class="c x-glow" d="M30 45h4v6h-4z"/><path class="lk" d="M32 43v2"/></g>' + [0, 1, 2].map(i => `<path class="w x-fall" style="--d:${i * 0.8}s" d="M${14 + i * 18} 6q2-2 3 1-2 2-3-1z"/>`).join('') });
  B.place('hiroshima', { id: 'okonomiyaki', label: 'Okonomiyaki on the griddle', colour: 'orange', mood: 'cosy', tags: ['food', 'griddle'],
    svg: () => steam(22, 24) + steam(36, 22) + '<path class="k" d="M4 46h56v10H4z"/><path class="lm" d="M8 50h48"/><g class="x-bob"><ellipse class="c lk" cx="32" cy="42" rx="22" ry="8"/><path class="k" d="M14 40q18 6 36 0 0 4-18 6-18-2-18-6z"/><path class="w" d="M16 39q16 4 32 0"/><path class="c" d="M22 38q4 2 8 0M36 39q4 1 8-1"/><path class="s" d="M26 36h4v2h-4zM38 36h5v2h-5z"/></g>'
      + '<g class="x-wobble"><path class="lk t" d="M52 16l-8 18"/><path class="w lk" d="M56 14h-6l-8 4z"/></g>' });
  B.place('nara', { id: 'deer', label: 'Friendly deer', colour: 'amber', mood: 'calm', tags: ['deer', 'park'],
    svg: () => sun(52, 10, 4) + '<path class="m" d="M2 58V48q16-6 30-2t30-2v16z"/><path class="lk" d="M18 56V44M24 56V44M42 56V44M48 56V44"/>' + '<path class="c lk" d="M16 40q0-6 8-6h20q6 0 6 6v4H16z"/><path class="w" d="M20 38q2 2 4 0M28 37q2 2 4 0M36 38q2 2 4 0"/>'
      + '<g class="x-bob"><path class="c lk" d="M44 36l6-12 6 4-2 8-6 4z"/><path class="k" d="M56 28l3 2-3 2z"/><path class="lk" d="M48 24l-2-8-4-4M48 24l4-8 4-4M46 16l-4 0M52 16l4 0"/><path class="lc" d="M47 24l-2-8"/><circle class="k" cx="52" cy="28" r="1"/></g>'
      + '<g class="x-pop"><circle class="c lk" cx="12" cy="40" r="4"/><path class="lk" d="M10 40h4"/></g>' + gr(58) });
  B.place('naha', { id: 'shisa', label: 'Shisa roof guardian', colour: 'orange', mood: 'proud', tags: ['shisa', 'guardian'],
    svg: () => sun(12, 12, 5) + '<path class="c lk" d="M2 58V46l8-6 8 6v12zM46 58V48l8-8 8 8v10z"/>' + '<path class="lc" d="M2 46l8-6 8 6M46 48l8-8 8 8"/>' + '<path class="m" d="M14 58V50h36v8z"/>'
      + '<g class="x-breathe"><path class="c lk" d="M20 50q-2-12 8-14l4-4h6q10 2 6 18z"/><path class="k" d="M34 32l6-8q4 2 4 8 0 6-6 8l-4-2z"/><path class="c lk" d="M32 26q-4-6 4-8 8 0 10 8 2 8-6 10l-8-2z"/><circle class="w lk" cx="36" cy="28" r="2.4"/><circle class="k" cx="36" cy="28" r="1"/><path class="w lk" d="M38 33q4 2 7 0v3q-4 2-7 0z"/><path class="lk" d="M30 24q-4 2-2 6M26 40q2 6 6 8"/></g>'
      + '<path class="c x-flicker" d="M54 36q-2-4 0-8 2 4 0 8z" />' + gr(58) });
  B.place('nagasaki', { id: 'lanterns', label: 'Lantern festival', colour: 'red', mood: 'cheerful', season: ['winter'], tags: ['lantern', 'festival'],
    svg: () => stars([[8, 8], [56, 8]]) + '<path class="lk t" d="M2 12q30 10 60 0"/>' + [[10, 0], [22, 0.4], [34, 0.8], [46, 0.2], [57, 0.6]].map(([x, d], i) => { const y = 14 + Math.round(5 * Math.sin(x / 10)); return `<g class="x-swing o-t" style="--d:${d}s;--ad:2.4s"><path class="lk" d="M${x} ${y}v3"/><ellipse class="c lk" cx="${x}" cy="${y + 9}" rx="5" ry="7"/><path class="lk" d="M${x - 4} ${y + 5}h8M${x - 4} ${y + 13}h8"/><circle class="s x-glow" style="--d:${d}s" cx="${x}" cy="${y + 9}" r="2"/><path class="lk" d="M${x} ${y + 16}v4"/></g>`; }).join('') + '<path class="m" d="M2 58V44h12v14zM48 58V40h14v18z"/><path class="s" d="M4 46h3v4H4zM52 44h3v4h-3z"/>' + gr(58) });
  B.place('jeju', { id: 'tangerines', label: 'Jeju tangerines', colour: 'orange', mood: 'cheerful', season: ['autumn'], tags: ['fruit', 'tangerine'],
    svg: () => sun(12, 12, 5) + '<path class="m" d="M2 58V44q16-8 30-2t30-4v20z"/>' + '<path class="lk t" d="M32 58V34"/><g class="x-swing o-t" style="--ad:3.4s"><path class="s lk" d="M32 34q-14-4-24 6 10 6 24-6zM32 34q14-4 24 6-10 6-24-6z"/>'
      + [[20, 30], [44, 30], [32, 22]].map(([x, y], i) => `<g class="x-bob" style="--d:${i * 0.5}s"><circle class="c lk" cx="${x}" cy="${y}" r="6.5"/><path class="s lk" d="M${x} ${y - 6}q3-3 6-1-3 4-6 1z"/><path class="w" d="M${x - 3} ${y - 2}q0-3 3-3"/></g>`).join('') + '</g>' + '<path class="c x-fall" d="M10 24q3-2 4 1-2 3-4-1z"/>' + gr(58) });
  B.place('gyeongju', { id: 'observatory', label: 'Ancient star observatory', colour: 'indigo', mood: 'dreamy', tags: ['observatory', 'stars'],
    svg: () => stars([[8, 8], [22, 14], [48, 8], [56, 20], [12, 26], [36, 6]]) + moon(54, 34) + '<path class="m" d="M2 58V50q16-4 30-2t30-2v12z"/>' + '<path class="s lk" d="M24 58q-4-14 2-26h12q6 12 2 26z"/><path class="lk" d="M25 50h14M26 42h12M27 36h10"/><path class="k" d="M28 44h8v6h-8z"/><path class="c lk" d="M22 32h20v4H22z"/><path class="s lk" d="M26 28h12v4H26z"/><path class="m lk" d="M28 24h8v4h-8z"/>'
      + '<path class="c x-glow" d="M30 14h4v6h-4z"/>' + '<path class="lc dash x-twinkle" d="M20 20l-8-8" />' + gr(58) });
  B.place('dalanzadgad', { id: 'bactrian-camel', label: 'Bactrian camel in the Gobi', colour: 'amber', mood: 'calm', tags: ['camel', 'gobi'],
    svg: () => sun(52, 10, 5) + '<path class="c" d="M2 50q16-10 32-4t28-6v20H2z"/>' + '<path class="lm" d="M2 50q16-10 32-4t28-6"/>'
      + '<g class="x-bob" style="--ad:1.6s"><path class="lk t" d="M18 56V42M24 56V42M40 56V42M46 56V42"/><path class="m lk" d="M14 40q0-6 6-6 2-10 6-10 4 0 4 8h6q2-10 6-10t4 10q4 0 6 6 0 6-6 6H18q-4 0-4-4z"/><path class="lk" d="M48 36q2-8 4-14l6-2 2 4-4 4"/><circle class="k" cx="57" cy="22" r="1"/><path class="m" d="M44 38q6 4 4 8z"/></g>'
      + '<path class="lc dash x-slidel" d="M4 58h8M18 60h6"/>' + cloud(6, 18, 0.4) });
  B.place('tainan', { id: 'salt-mountain', label: 'Salt mountain', colour: 'slate', mood: 'calm', tags: ['salt', 'coast'],
    svg: () => sun(12, 12, 5) + cloud(34, 16, 0.7) + '<path class="m" d="M2 60V48h60v12z"/>' + wv(52, 0, 'lw') + '<path class="w lk" d="M10 50l12-16 8 6 8-14 8 12 8-4 8 16z"/><path class="m" d="M22 34l6 10-4 6M38 26l-4 12 6 12"/><path class="s" d="M30 40l8-14 6 10z"/>'
      + [0, 1, 2].map(i => `<path class="w x-twinkle" style="--d:${i * 0.5}s" d="M${24 + i * 10} ${40 + i * 3}l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>`).join('') + '<g class="x-slidel"><path class="k" d="M44 56h10l2-4H44z"/></g>' + wv(58, 0.5, 'lc') });
  B.place('hualien', { id: 'gorge', label: 'Marble gorge and swallows', colour: 'teal', mood: 'proud', tags: ['gorge', 'swallow'],
    svg: () => sun(32, 12, 5) + '<path class="m lk" d="M2 4h16l6 24-4 16 6 16H2z"/><path class="m lk" d="M62 4H46l-6 20 4 18-6 18h24z"/><path class="w" d="M6 14h6M8 34h8M52 20h6M50 40h8"/><path class="lm" d="M10 6l6 24M54 6l-6 20"/>'
      + '<path class="c" d="M24 44l6 16h4l6-18z"/>' + wv(52, 0, 'lw').replace('M-2', 'M26') + wv(57, 0.6, 'lw').replace('M-2', 'M26')
      + '<g class="x-float"><path class="lk x-flap" d="M28 26q3-4 6 0 3-4 6 0"/></g><g class="x-float" style="--d:0.9s"><path class="lk x-flap" style="--d:0.3s" d="M30 36q2-3 4 0 2-3 4 0"/></g><path class="lw x-drop" d="M32 20v8" />' });

  animRegisterPack(B.pack({ id: 'asia-east', name: 'Asia: East', description: 'China, Japan, the Koreas, Mongolia, Taiwan, Hong Kong and Macau: a symbol for each country and small city.' }));
})();
