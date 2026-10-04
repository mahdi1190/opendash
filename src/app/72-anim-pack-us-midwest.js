/* ============================================================
   ANIMATION PACK "us-midwest": the Midwest states and towns. PURE classic script
   (no DOM, no fetches). Built with usBuilder (71-anim-us.js): per state a signature
   (opening) and an element (symbol), per art place one item (big = opening,
   small = symbol). Drawing rules: docs/dev/ANIMATION_PACKS.md, docs/dev/US_PACK.md.
   ============================================================ */
(function () {
  const B = usBuilder('midwest');
  const sun = (x, y, r) => `<circle class="s x-pulse" cx="${x}" cy="${y}" r="${r || 6}"/>`;
  const moon = (x, y) => `<path class="s x-glow" d="M${x} ${y - 6}a6 6 0 1 0 6 7a5 5 0 0 1-6-7z"/>`;
  const star = (x, y, d) => `<path class="c x-twinkle" style="--d:${d}s" d="M${x} ${y - 3}l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>`;
  const gr = (y, x1, x2) => `<path class="lm" d="M${x1 || 3} ${y}H${x2 || 61}"/>`;
  const wv = (y, d, cls) => `<path class="${cls || 'lc'} x-wave" style="--d:${d || 0}s" d="M0 ${y}${'q3-2 6 0t6 0'.repeat(11)}"/>`;
  const cloud = (x, y, d) => `<rect class="w x-bob" style="--d:${d || 0}s" x="${x}" y="${y}" width="13" height="4.5" rx="2.2"/>`;
  const bird = (x, y, d) => `<path class="lk x-flap" style="--d:${d || 0}s" d="M${x} ${y}q2-3 4 0q2-3 4 0"/>`;
  const win = (x, y, d) => `<rect class="w x-twinkle" style="--d:${d}s" x="${x}" y="${y}" width="1.8" height="1.8"/>`;
  const wheel = (x, y, r) => `<circle class="k" cx="${x}" cy="${y}" r="${r}"/><path class="lw x-spin" d="M${x - r + 1} ${y}h${2 * r - 2}M${x} ${y - r + 1}v${2 * r - 2}"/>`;
  const road = (y) => `<path class="lm x-slidel" d="M0 ${y}${'h5m5 0'.repeat(8)}"/>`;
  const smoke = (x, y, d) => `<circle class="s x-steam" style="--d:${d}s" cx="${x}" cy="${y}" r="2.2"/>`;
  const drop = (x, y, d) => `<circle class="c x-drop" style="--d:${d}s" cx="${x}" cy="${y}" r="1.3"/>`;

  /* ================= ILLINOIS ================= */
  B.state('IL', 'signature', { id: 'skyline', label: 'The Chicago skyline', colour: 'indigo', mood: 'proud', tags: ['landmark', 'skyline'],
    svg: () => sun(51, 10, 5) + cloud(5, 9, 0.4) + '<rect class="m" x="3" y="38" width="10" height="20"/><rect class="m" x="13" y="45" width="8" height="13"/><rect class="m" x="55" y="43" width="6" height="15"/>'
      + '<rect class="k" x="24" y="30" width="15" height="28"/><rect class="k" x="26" y="21" width="5" height="9"/><rect class="k" x="33" y="25" width="5" height="5"/><path class="lk" d="M28.5 21v-8M35.5 25v-5"/>'
      + '<circle class="c x-blink" cx="28.5" cy="12" r="1.6"/><circle class="c x-blink" style="--d:.5s" cx="35.5" cy="18" r="1.6"/>'
      + '<path class="c" d="M43 58L45.6 24h5L53 58z"/><path class="lw" d="M44.2 46h7.6M45 35h6"/>'
      + win(27, 35, 0) + win(33, 40, 0.5) + win(29, 48, 1) + win(35, 53, 1.4) + win(7, 44, 0.8) + win(16, 50, 0.3)
      + '<rect class="s" x="0" y="58" width="64" height="6"/>' + wv(61, 0) });
  B.state('IL', 'element', { id: 'bean', label: 'The Bean', colour: 'slate', mood: 'cheerful', tags: ['sculpture', 'chicago'],
    svg: () => star(12, 14, 0) + star(52, 10, 0.9) + '<path class="s lk" d="M5 47C5 28 18 20 32 22C46 22 59 29 59 47C44 41 20 41 5 47z"/>'
      + '<path class="m x-glow" d="M17 36h4v-4h3v4h4v-7h3v7h6v-3h3v3h6"/><path class="w x-twinkle" d="M20 27q6-4 12-4.5l-1 3q-6 .5-11 1.5z"/>'
      + '<path class="lm" d="M3 51H61"/><circle class="k" cx="14" cy="53" r="1.8"/><path class="lk x-bob" d="M14 55v4"/><circle class="k x-bob" style="--d:.6s" cx="50" cy="53" r="1.8"/><path class="lk x-bob" style="--d:.6s" d="M50 55v4"/>' });
  B.place('chicago', { id: 'l-train', label: 'The L over the loop', colour: 'blue', mood: 'energetic', tags: ['train', 'night'],
    svg: () => moon(52, 12) + star(10, 8, 0) + star(30, 14, 1.1) + '<circle class="lm" cx="14" cy="30" r="10"/><g class="x-spin-slow"><path class="lm" d="M14 20v20M4 30h20M7 23l14 14M21 23L7 37"/></g><circle class="c x-twinkle" cx="14" cy="20" r="1.6"/><circle class="c x-twinkle" style="--d:.8s" cx="24" cy="30" r="1.6"/><circle class="c x-twinkle" style="--d:1.4s" cx="14" cy="40" r="1.6"/>'
      + '<rect class="m" x="32" y="26" width="10" height="32"/><rect class="m" x="44" y="18" width="8" height="40"/><rect class="m" x="54" y="30" width="8" height="28"/>' + win(35, 31, 0.2) + win(47, 24, 0.7) + win(57, 36, 1.2)
      + '<path class="lk t" d="M0 46H64"/><path class="lk" d="M10 47v11M32 47v11M54 47v11"/>'
      + '<g class="x-bob"><rect class="c" x="16" y="37" width="30" height="8" rx="2"/><path class="lw" d="M31 37v8"/><rect class="w" x="19" y="39" width="4" height="3"/><rect class="w" x="26" y="39" width="4" height="3"/><rect class="w" x="34" y="39" width="4" height="3"/><rect class="w" x="40" y="39" width="4" height="3"/></g>' });
  B.place('galena', { id: 'main-street', label: 'Hillside main street', colour: 'orange', mood: 'cosy', tags: ['historic', 'steeple'],
    svg: () => sun(8, 10, 5) + '<path class="s" d="M0 58V40Q18 28 64 22V58z"/>' + '<rect class="c" x="6" y="46" width="12" height="12"/><path class="lk" d="M5 46h14"/><rect class="m" x="19" y="40" width="11" height="18"/><path class="lk" d="M18 40h13"/>'
      + win(9, 50, 0) + win(13, 50, 0.6) + win(22, 44, 0.3) + win(26, 44, 0.9) + win(22, 51, 1.3) + '<rect class="c" x="31" y="34" width="10" height="24"/><path class="lk" d="M30 34h12"/>' + win(34, 38, 0.5) + win(34, 46, 1)
      + '<rect class="w lk" x="44" y="36" width="10" height="22"/><path class="lk" d="M44 36l5-8 5 8"/><path class="lk" d="M49 28V16"/><path class="c x-flag" d="M49 16h8v4h-8z"/><g class="x-swing o-t"><path class="k" d="M47 40h4l-.6 5h-2.8z"/></g><path class="lk" d="M47 58v-6h4v6"/>'
      + smoke(10, 41, 0) + smoke(12, 38, 1.1) });

  /* ================= INDIANA ================= */
  B.state('IN', 'signature', { id: 'dunes', label: 'Dunes on Lake Michigan', colour: 'amber', mood: 'calm', tags: ['dunes', 'lake'],
    svg: () => sun(48, 11, 6) + cloud(6, 8, 0) + bird(24, 14, 0.4) + bird(32, 19, 1.2) + wv(30, 0, 'lc') + wv(34, 0.5, 'lm')
      + '<path class="s" d="M0 56Q14 38 30 46Q44 34 64 52V64H0z"/><path class="c" d="M0 61Q18 50 34 56T64 58V64H0z"/><path class="lm" d="M3 44Q14 40 30 47"/>'
      + '<path class="lk x-swing o-b" d="M10 50v-9M14 51v-7"/><path class="lk x-swing o-b" style="--d:.7s" d="M44 45v-8M48 46v-6M52 47v-5"/>' });
  B.state('IN', 'element', { id: 'racecar', label: 'Racing at the Brickyard', colour: 'red', mood: 'energetic', intensity: 'standard', tags: ['racing', 'car'],
    svg: () => cloud(40, 8, 0) + '<path class="lk" d="M52 40V14"/><path class="w lk x-flag" d="M52 14h10v8H52z"/><path class="k" d="M52 14h5v4h-5zM57 18h5v4h-5z"/>'
      + road(55) + '<g class="x-runbob"><path class="c" d="M8 46h10l5-6h12l5 4h8l3 4v4H8z"/><path class="k" d="M23 38h10l-1 5H23z"/><circle class="w" cx="28" cy="36" r="2"/><path class="lk" d="M6 40v8M6 40h6"/></g>'
      + wheel(16, 51, 5) + wheel(44, 51, 5) + '<path class="lm x-slidel" d="M0 31h6m4 0h5M2 36h8"/>' });
  B.place('indianapolis', { id: 'monument', label: 'Monument Circle', colour: 'indigo', mood: 'proud', tags: ['monument', 'fountain'],
    svg: () => sun(52, 11, 5) + '<rect class="m" x="4" y="34" width="12" height="24"/><rect class="m" x="48" y="30" width="12" height="28"/>' + win(8, 40, 0) + win(8, 48, 0.8) + win(52, 36, 0.4) + win(52, 45, 1.2)
      + '<path class="w lk" d="M27 58V26h10v32z"/><path class="lk" d="M25 58h14M26 26h12M29 26l3-10 3 10"/><path class="lk" d="M32 16V9"/><path class="c x-flag" d="M32 9h7v4h-7z"/><circle class="c x-twinkle" cx="32" cy="7" r="1.5"/>'
      + '<path class="s" d="M8 60Q32 52 56 60z"/><path class="lc" d="M20 58q4-8 8 0M36 58q4-8 8 0"/>' + drop(20, 50, 0) + drop(44, 50, 0.9) + drop(26, 54, 1.4) + gr(58, 3, 61) });

  /* ================= IOWA ================= */
  B.state('IA', 'signature', { id: 'farmland', label: 'Barns and wind over the fields', colour: 'green', mood: 'calm', tags: ['farm', 'barn', 'wind'],
    svg: () => sun(10, 11, 5) + cloud(24, 9, 0.5) + '<path class="s" d="M0 46Q20 38 40 44T64 42V64H0z"/>'
      + '<path class="lk" d="M44 44V22M56 42V28"/><g class="x-spin" style="--ad:5s"><path class="lk" d="M44 22v-8M44 22l-7 4M44 22l7 4"/></g><g class="x-spin" style="--ad:6.5s"><path class="lk" d="M56 28v-6M56 28l-5 3M56 28l5 3"/></g>'
      + '<path class="c" d="M8 58V44l9-7 9 7v14z"/><path class="lk" d="M7 45l10-8 10 8"/><path class="w" d="M13 58V50h8v8z"/><path class="lw" d="M13 50l8 8M21 50l-8 8"/><rect class="m" x="28" y="36" width="6" height="22"/><path class="lk" d="M28 36q3-5 6 0"/>'
      + '<path class="lm" d="M2 62L24 52M20 62L40 52M40 62L58 52M2 56l8-4"/><path class="lk x-swing o-b" d="M42 62v-6M48 62v-7M54 62v-6"/>' + gr(58, 3, 61) });
  B.state('IA', 'element', { id: 'field-of-dreams', label: 'Field of Dreams', colour: 'green', mood: 'dreamy', tags: ['baseball', 'corn'],
    svg: () => star(10, 10, 0) + star(54, 14, 1) + '<path class="s" d="M32 58L52 40L32 22L12 40z"/><path class="lw" d="M32 58L52 40L32 22L12 40zM32 40L22 50M32 40l10 10"/><path class="w lk" d="M30 55h4v3h-4z"/>'
      + '<path class="lk x-swing o-b" d="M6 46V28M10 47V32M54 46V28M58 47V32"/><path class="lk x-swing o-b" style="--d:.8s" d="M2 50V38M62 50V38"/><circle class="w lk x-bounce" cx="32" cy="36" r="2.6"/><path class="lm dash" d="M32 40V50"/><circle class="c x-glow" cx="32" cy="46" r="2"/>' });
  B.place('dubuque', { id: 'elevator', label: 'The Fenelon Place Elevator', colour: 'teal', mood: 'cheerful', tags: ['funicular', 'river'],
    svg: () => sun(50, 10, 5) + bird(30, 10, 0) + '<path class="s" d="M0 52L10 50L46 20L64 18V64H0z"/><path class="lk t" d="M16 50L48 24"/><path class="lk" d="M18 53L50 27"/>'
      + '<g class="x-lift"><path class="c" d="M28 42l10-8 3 4-10 8z"/><path class="w" d="M31 41l4-3 1 1.5-4 3z"/></g>' + '<rect class="k" x="48" y="14" width="10" height="9"/><path class="lk" d="M47 14l6-5 6 5"/><rect class="m" x="8" y="46" width="9" height="8"/>' + wv(58, 0) + wv(62, 0.6, 'lm') });

  /* ================= KANSAS ================= */
  const wheat = (() => { let s = ''; for (let i = 0; i < 9; i++) { const x = 6 + i * 6.5; s += `<path class="lm x-swing o-b" style="--d:${(i % 5) * 0.35}s" d="M${x} 62V49"/><path class="c x-swing o-b" style="--d:${(i % 5) * 0.35}s" d="M${x} 50l-2-3 2-3 2 3z"/>`; } return s; })();
  B.state('KS', 'signature', { id: 'wheat', label: 'Wheat and big sky', colour: 'amber', mood: 'calm', tags: ['wheat', 'prairie'],
    svg: () => sun(48, 24, 8) + cloud(6, 8, 0) + cloud(30, 14, 1.3) + bird(14, 22, 0.8) + '<path class="s" d="M0 40H64V64H0z"/><rect class="w lk" x="10" y="26" width="6" height="14"/><rect class="w lk" x="17" y="28" width="5" height="12"/><path class="lk" d="M10 26l3-3 3 3M17 28l2.5-3 2.5 3"/>' + gr(40, 0, 64) + wheat });
  B.state('KS', 'element', { id: 'sunflower', label: 'The sunflower', colour: 'amber', mood: 'cheerful', tags: ['flower'],
    svg: () => { let p = ''; for (let i = 0; i < 12; i++) p += `<ellipse class="c" cx="32" cy="12" rx="2.8" ry="6" transform="rotate(${i * 30} 32 24)"/>`; return '<path class="lm t" d="M32 32V62"/><path class="m" d="M32 50q-10-2-12-10q9 0 12 10zM32 54q10-2 12-9q-9 0-12 9z"/><g class="x-spin-slow">' + p + '</g><circle class="k" cx="32" cy="24" r="7"/><path class="lw" d="M28 22l8 4M28 26l8-4"/><g class="x-float"><circle class="k" cx="50" cy="16" r="1.8"/><path class="lw" d="M49 15h2"/></g>'; } });
  B.place('dodge-city', { id: 'saloon', label: 'The Long Branch saloon', colour: 'orange', mood: 'cheerful', tags: ['saloon', 'western'],
    svg: () => sun(8, 10, 5) + '<path class="m" d="M10 58V26h44v32z"/><path class="k" d="M7 26h50l-3-6H10z"/><rect class="w lk" x="18" y="29" width="28" height="7"/><path class="lc" d="M22 32.5h20"/><path class="lk" d="M10 44h44"/>'
      + '<rect class="k" x="26" y="45" width="12" height="13"/><path class="c x-swing o-b" style="transform-origin:0 100%" d="M26 47h6v10h-6z"/><path class="c x-swing o-b" style="transform-origin:100% 100%;--d:.4s" d="M32 47h6v10h-6z"/><rect class="w" x="14" y="47" width="7" height="6"/><rect class="w" x="43" y="47" width="7" height="6"/>'
      + '<circle class="lk x-roll" cx="4" cy="55" r="3"/>' + gr(58, 0, 64) + '<path class="lk" d="M52 58v-5M58 58v-5M50 53h10"/>' });

  /* ================= MICHIGAN ================= */
  B.state('MI', 'signature', { id: 'mackinac-bridge', label: 'The Mackinac Bridge', colour: 'blue', mood: 'proud', tags: ['bridge', 'straits'],
    svg: () => sun(52, 12, 5) + cloud(4, 8, 0) + bird(26, 10, 0.5) + '<path class="lc" d="M0 40Q10 42 20 14Q32 50 44 14Q54 42 64 40"/><path class="lk t" d="M18 14v34M46 14v34"/><path class="lk" d="M16 24h4M44 24h4M16 36h4M44 36h4"/><path class="lw" d="M6 41v3M12 38v6M26 40v4M32 42v2M38 40v4M52 38v6M58 41v3"/><path class="lk t" d="M0 44H64"/>'
      + '<rect class="c x-slidel" x="8" y="41" width="4" height="2.4"/><rect class="c x-slidel" style="--d:.3s" x="36" y="41" width="4" height="2.4"/><rect class="s" x="0" y="48" width="64" height="16"/>' + wv(52, 0) + wv(57, 0.6) + wv(62, 1.1, 'lm') });
  B.state('MI', 'element', { id: 'motor-car', label: 'The motor car', colour: 'red', mood: 'energetic', tags: ['car', 'industry'],
    svg: () => '<g class="x-spin-slow"><circle class="lm dash" cx="50" cy="16" r="9"/><circle class="lm" cx="50" cy="16" r="3"/></g><g class="x-spin-slow" style="--ad:9s"><circle class="lc dash" cx="14" cy="14" r="6"/></g>' + road(56)
      + '<g class="x-runbob"><path class="c" d="M6 48h4l4-8h20l7 8h14l3 4v4H6z"/><path class="w" d="M16 40h8v6h-12zM26 40h8l5 6H26z"/><rect class="s" x="55" y="49" width="3" height="3"/></g>' + wheel(18, 54, 5) + wheel(46, 54, 5) + '<circle class="s x-glow" cx="59" cy="50" r="1.6"/>' });
  B.place('detroit', { id: 'ren-cen', label: 'Riverfront towers', colour: 'slate', mood: 'proud', tags: ['skyline', 'river', 'freighter'],
    svg: () => sun(12, 12, 6) + cloud(34, 8, 0.4) + '<rect class="m" x="2" y="38" width="8" height="14"/><rect class="m" x="10" y="42" width="7" height="10"/>'
      + '<rect class="w lk" x="29" y="14" width="10" height="38"/><rect class="w lk" x="21" y="30" width="7" height="22"/><rect class="w lk" x="40" y="30" width="7" height="22"/><rect class="w lk" x="48" y="38" width="7" height="14"/><path class="lk" d="M29 20h10M29 26h10"/><circle class="c x-blink" cx="34" cy="11" r="1.5"/>'
      + win(31, 32, 0) + win(35, 40, 0.5) + win(23, 38, 0.9) + win(43, 38, 1.3) + win(31, 46, 1.7) + '<rect class="s" x="0" y="52" width="64" height="12"/>' + wv(56, 0) + wv(61, 0.5, 'lm')
      + '<g class="x-bob"><path class="k" d="M2 52h16l-2 4H4z"/><rect class="c" x="4" y="49" width="4" height="3"/></g>' });
  B.place('traverse-city', { id: 'cherries', label: 'Cherry orchards', colour: 'red', mood: 'cheerful', tags: ['cherries', 'orchard'],
    svg: () => sun(10, 10, 5) + bird(40, 9, 0) + '<path class="lm" d="M32 4Q30 16 20 30M32 4Q36 16 44 34"/><path class="s x-bob" d="M32 6q8-4 14 0q-6 6-14 0z"/><path class="m" d="M20 10q6-4 10 0q-5 5-10 0z"/>'
      + '<g class="x-swing o-t"><path class="lk" d="M20 30L18 38"/><circle class="c" cx="17" cy="44" r="7"/><circle class="w x-twinkle" cx="14.5" cy="41.5" r="1.4"/></g><g class="x-swing o-t" style="--d:.8s"><path class="lk" d="M44 34L46 40"/><circle class="c" cx="47" cy="46" r="7"/><circle class="w x-twinkle" style="--d:.5s" cx="44.5" cy="43.5" r="1.4"/></g>'
      + '<path class="c x-fall" style="--d:1s" d="M8 20l1.5-1.5 1.5 1.5-1.5 1.5z"/>' + wv(61, 0, 'lc') });
  B.place('mackinac-island', { id: 'horse-carriage', label: 'Horse and carriage', colour: 'violet', mood: 'cheerful', tags: ['horse', 'carriage', 'hotel'],
    svg: () => sun(54, 9, 5) + '<path class="w lk" d="M2 36h28V16H2z"/><path class="lk" d="M6 36V16M12 36V16M18 36V16M24 36V16M0 16h32M2 12h28"/><path class="c x-flag" d="M16 12V4h8v4h-8z"/><path class="s" d="M0 58Q30 44 64 52V64H0z"/>' + road(58)
      + '<g class="x-runbob"><path class="c" d="M5 50h18V40Q14 36 5 40z"/><path class="w" d="M8 42h12v5H8z"/><path class="lk" d="M23 48h8"/><ellipse class="k" cx="42" cy="46" rx="9" ry="5"/><path class="k" d="M49 44l5-8 5 3-3 6z"/><path class="lk" d="M55 36l-1-3M36 49l-3 5M40 50v6M47 50l2 6"/><path class="c" d="M34 41q-4 3-5 8"/></g>' + wheel(10, 54, 4.5) + wheel(21, 54, 4.5) });

  /* ================= MINNESOTA ================= */
  B.state('MN', 'signature', { id: 'loon', label: 'A loon on a northern lake', colour: 'teal', mood: 'calm', tags: ['loon', 'lake', 'pines'],
    svg: () => moon(48, 12) + star(10, 8, 0) + star(30, 14, 0.9) + '<path class="k" d="M0 44L6 30l6 14zM6 44L14 24l8 20zM46 44l7-18 9 18zM56 44l4-12 6 12z"/><rect class="s" x="0" y="44" width="64" height="20"/>' + wv(48, 0) + wv(60, 0.7, 'lm')
      + '<g class="x-bob"><path class="k" d="M18 50q10 6 24 0q-3-6-12-6t-12 6z"/><path class="k" d="M40 46q4-6 5-12q3-2 7 0l-1 3q-4 2-5 5z"/><circle class="c" cx="48" cy="34" r="1"/><circle class="w" cx="24" cy="48" r="1"/><circle class="w" cx="30" cy="46" r="1"/><circle class="w" cx="35" cy="47" r="1"/></g><ellipse class="lm x-ring" cx="30" cy="54" rx="14" ry="3"/>' });
  B.state('MN', 'element', { id: 'hockey', label: 'The state of hockey', colour: 'blue', mood: 'energetic', intensity: 'standard', tags: ['hockey', 'ice'],
    svg: () => star(12, 10, 0) + star(52, 12, 1) + '<rect class="s" x="3" y="34" width="58" height="26" rx="6"/><path class="lc" d="M32 34v26"/><circle class="lc" cx="32" cy="47" r="6"/><path class="lm" d="M54 38v18M58 40v14"/><path class="lm dash" d="M54 38h4M54 56h4"/>'
      + '<g class="x-swing"><path class="lk t" d="M10 12l16 28h8"/></g><g class="x-slidel"><path class="lm" d="M36 47h8"/></g><rect class="k x-roll" x="26" y="44" width="6" height="3" rx="1"/><circle class="w x-twinkle" cx="40" cy="38" r="1.2"/>' });
  B.place('minneapolis', { id: 'spoonbridge', label: 'Spoonbridge and Cherry', colour: 'red', mood: 'cheerful', tags: ['sculpture', 'garden', 'skyline'],
    svg: () => sun(52, 10, 5) + '<rect class="m" x="4" y="26" width="9" height="22"/><rect class="m" x="13" y="20" width="8" height="28"/><rect class="m" x="46" y="30" width="10" height="18"/>' + win(7, 31, 0) + win(16, 26, 0.6) + win(49, 36, 1.1)
      + '<path class="s" d="M0 48H64V64H0z"/><ellipse class="lc" cx="32" cy="55" rx="26" ry="5"/><path class="k" d="M12 53Q22 36 34 46Q42 42 54 53Q42 50 34 50Q24 40 12 53z"/><path class="lk t" d="M30 40V27"/><path class="lk" d="M30 27q2-3 5-2"/><g class="x-bob"><circle class="c" cx="31" cy="22" r="5.5"/><circle class="w" cx="29" cy="20" r="1.3"/></g>'
      + drop(30, 36, 0) + drop(33, 38, 0.8) + wv(60, 0.3, 'lm') });
  B.place('duluth', { id: 'lift-bridge', label: 'The Aerial Lift Bridge', colour: 'blue', mood: 'proud', tags: ['bridge', 'ship', 'harbor'],
    svg: () => sun(52, 10, 5) + bird(28, 9, 0) + '<path class="k" d="M10 52V14h6v38zM48 52V14h6v38z"/><path class="lw" d="M10 22h6M10 32h6M10 42h6M48 22h6M48 32h6M48 42h6"/><path class="lk" d="M10 14h44"/>'
      + '<g class="x-lift"><rect class="c" x="16" y="34" width="32" height="4"/><path class="lk" d="M20 34v-3M44 34v-3"/></g><path class="lk t" d="M0 46H10M54 46H64"/><rect class="s" x="0" y="48" width="64" height="16"/>'
      + '<g class="x-bob"><path class="k" d="M18 52h28l-3 5H21z"/><rect class="w lk" x="22" y="46" width="10" height="6"/><rect class="c" x="36" y="47" width="4" height="5"/></g>' + smoke(38, 43, 0) + wv(60, 0) });

  /* ================= MISSOURI ================= */
  B.state('MO', 'signature', { id: 'riverboat', label: 'A riverboat on the Mississippi', colour: 'orange', mood: 'cosy', tags: ['riverboat', 'river'],
    svg: () => sun(12, 12, 6) + cloud(34, 8, 0.4) + '<path class="s" d="M0 40Q16 34 28 38T64 36V40H0z"/><path class="k" d="M26 34V22h3v12zM38 34V22h3v12z"/><path class="c" d="M25 22h5l-1 3h-3zM37 22h5l-1 3h-3z"/>' + smoke(28, 18, 0) + smoke(40, 16, 0.9) + smoke(31, 13, 1.7)
      + '<g class="x-bob"><rect class="w lk" x="18" y="34" width="28" height="7"/><rect class="w lk" x="22" y="28" width="20" height="6"/><path class="lc" d="M14 46h40l-6-5H20z"/><path class="lw" d="M24 37h18"/><circle class="w lk" cx="16" cy="44" r="0"/></g>'
      + '<g class="x-spin" style="--ad:3s"><circle class="lc" cx="15" cy="43" r="6"/><path class="lc" d="M15 37v12M9 43h12M11 39l8 8M19 39l-8 8"/></g>' + wv(52, 0) + wv(57, 0.5) + wv(62, 1, 'lm') });
  B.state('MO', 'element', { id: 'bbq', label: 'Slow-smoked barbecue', colour: 'red', mood: 'cosy', tags: ['barbecue', 'food'],
    svg: () => '<rect class="k" x="38" y="16" width="5" height="16"/><path class="lk" d="M36 16h9"/>' + smoke(40, 12, 0) + smoke(42, 8, 0.8) + smoke(39, 5, 1.6) + '<rect class="m" x="8" y="30" width="46" height="18" rx="8"/><path class="lk" d="M8 36h46M16 30v18M46 30v18"/><circle class="w lk" cx="26" cy="41" r="2.5"/>'
      + '<path class="lk" d="M10 48l-3 10M52 48l3 10"/><path class="k" d="M20 48h26v4H20z"/><path class="c x-flicker" d="M24 58q2-5 4 0zM31 58q2-7 4 0zM38 58q2-5 4 0z"/><path class="c x-drop" d="M14 38l1 2-2 0z"/>' });
  B.place('st-louis', { id: 'gateway-arch', label: 'The Gateway Arch', colour: 'slate', mood: 'proud', tags: ['arch', 'landmark', 'river'],
    svg: () => sun(32, 36, 7) + cloud(4, 8, 0) + cloud(46, 14, 1) + '<path class="lk t" d="M10 56C12 24 20 10 32 10S52 24 54 56"/><path class="lw" d="M12 44Q13 30 18 20M52 44Q51 30 46 20"/><g class="x-lift"><rect class="w lk" x="26" y="9" width="3" height="3"/></g>'
      + '<path class="m" d="M2 56V48h6v8zM56 56V46q3-4 6 0v10z"/><rect class="s" x="0" y="56" width="64" height="8"/>' + wv(58, 0) + wv(62, 0.7, 'lm') + '<g class="x-bob"><path class="k" d="M22 56h12l-2 3H24z"/></g>' + bird(40, 24, 0.4) });
  B.place('kansas-city', { id: 'fountain-tower', label: 'City of Fountains', colour: 'teal', mood: 'proud', tags: ['fountain', 'memorial'],
    svg: () => sun(52, 10, 5) + '<rect class="m" x="3" y="34" width="9" height="20"/><rect class="m" x="52" y="36" width="9" height="18"/>' + win(6, 40, 0) + win(55, 42, 0.7)
      + '<rect class="w lk" x="27" y="18" width="10" height="36"/><path class="lk" d="M25 54h14M27 18h10M29 18l3-6 3 6"/><path class="c x-flicker" d="M32 12q-3-4 0-8q3 4 0 8z"/>' + '<path class="lw" d="M30 28v18M34 28v18"/><rect class="s" x="12" y="54" width="40" height="5" rx="2"/>'
      + '<path class="lc x-stream" d="M18 54q2-8 5-4M46 54q-2-8-5-4M32 54v-4"/>' + drop(18, 46, 0) + drop(46, 46, 0.7) + drop(32, 44, 1.3) + wv(62, 0, 'lm') });
  B.place('branson', { id: 'marquee', label: 'Show marquee on the lake', colour: 'pink', mood: 'cheerful', intensity: 'playful', tags: ['marquee', 'theatre', 'lake'],
    svg: () => { let b = ''; for (let i = 0; i < 8; i++) b += `<circle class="c x-blink" style="--d:${i % 2 ? 0.5 : 0}s" cx="${12 + i * 5.7}" cy="12" r="1.4"/><circle class="c x-blink" style="--d:${i % 2 ? 0 : 0.5}s" cx="${12 + i * 5.7}" cy="36" r="1.4"/>`; return star(8, 6, 0.2) + star(56, 6, 0.9) + '<rect class="k" x="8" y="8" width="48" height="32" rx="2"/><rect class="w" x="12" y="15" width="40" height="17" rx="1"/>' + b + '<path class="c x-pulse" d="M32 18l2 4 4 .5-3 3 .8 4.2-3.8-2-3.8 2 .8-4.2-3-3 4-.5z"/><path class="lk" d="M30 40v14M34 40v14M24 54h16"/>' + '<path class="s x-glow" d="M10 62L0 36l8-4zM54 62l10-26-8-4z"/><path class="lm" d="M4 62h56"/>'; } });

  /* ================= NEBRASKA ================= */
  B.state('NE', 'signature', { id: 'chimney-rock', label: 'Chimney Rock', colour: 'amber', mood: 'calm', tags: ['rock', 'prairie', 'trail'],
    svg: () => sun(50, 14, 6) + cloud(6, 10, 0) + bird(30, 16, 0.6) + '<path class="s" d="M0 64V54Q10 52 18 58Q30 52 42 56T64 54V64z"/><path class="m" d="M16 56L25 40Q30 38 35 40L44 56z"/><path class="m" d="M30 40L30.6 12h2L33.4 40z"/><path class="lk" d="M25 40Q30 38 35 40M32 12V40"/><path class="lw" d="M22 52h18M26 46h10"/>'
      + '<path class="lm x-wave" d="M0 30h6m3 0h8M2 36h10"/>' + '<path class="lk x-swing o-b" d="M4 62v-6M8 62v-5M56 62v-6M60 62v-5"/>' });
  B.state('NE', 'element', { id: 'cranes', label: 'Sandhill cranes on the Platte', colour: 'slate', mood: 'dreamy', tags: ['crane', 'migration', 'river'],
    svg: () => sun(12, 14, 6) + '<g class="x-bob"><ellipse class="m" cx="32" cy="22" rx="8" ry="3.5"/><path class="lk" d="M40 21Q48 18 52 14M24 22l-8 3"/><path class="c" d="M52 13l2 1-2 1z"/><path class="m x-flap" style="--d:.2s" d="M26 20Q30 8 38 6q-2 8-4 14z"/></g>'
      + '<g class="x-bob" style="--d:.7s"><ellipse class="m" cx="16" cy="38" rx="6" ry="2.5"/><path class="lk" d="M22 37Q28 35 30 32M10 38l-6 2"/><path class="m x-flap" style="--d:.5s" d="M12 36Q15 28 21 27q-1 6-3 9z"/></g>'
      + '<g class="x-bob" style="--d:1.2s"><ellipse class="m" cx="48" cy="40" rx="6" ry="2.5"/><path class="lk" d="M54 39Q60 38 62 34M42 40l-6 2"/><path class="m x-flap" style="--d:.9s" d="M44 38Q47 30 53 29q-1 6-3 9z"/></g>' + wv(52, 0) + wv(57, 0.6, 'lm') + wv(62, 1.2, 'lm') });
  B.place('omaha', { id: 'desert-dome', label: 'The Desert Dome and giraffe', colour: 'green', mood: 'cheerful', tags: ['zoo', 'dome', 'skyline'],
    svg: () => sun(54, 10, 5) + '<rect class="m" x="42" y="22" width="7" height="30"/><rect class="m" x="50" y="30" width="9" height="22"/>' + win(44, 28, 0) + win(53, 36, 0.8)
      + '<path class="w lc" d="M4 52Q4 20 28 20Q52 20 52 52z"/><path class="lc" d="M4 52Q16 38 28 20Q40 38 52 52M10 36h36M6 44h44M28 20V52"/><path class="lw" d="M18 52Q20 32 28 20M38 52Q36 32 28 20"/>'
      + '<g class="x-swing o-b"><path class="c" d="M56 52V24"/><ellipse class="c" cx="55" cy="22" rx="4" ry="2.4"/></g><path class="lc" d="M54 52v-6M60 52v-6"/><circle class="k" cx="52.5" cy="21" r=".8"/>' + gr(52, 0, 64) + '<path class="lk x-swing o-b" d="M8 60v-5M14 60v-4M20 60v-5"/>' });
  B.place('scottsbluff', { id: 'wagon', label: 'Covered wagon beneath the bluff', colour: 'orange', mood: 'calm', tags: ['wagon', 'bluff', 'trail'],
    svg: () => sun(12, 12, 5) + cloud(36, 8, 0.5) + '<path class="m" d="M20 50L24 22H52L58 50z"/><path class="lw" d="M26 32h24M24 42h30"/><path class="lk" d="M24 22H52"/>' + gr(50, 0, 64) + '<path class="s" d="M0 64V54H64V64z"/>'
      + '<g class="x-bob"><path class="w lk" d="M12 48Q14 32 30 32Q46 32 48 48z"/><rect class="c" x="9" y="46" width="42" height="6" rx="1"/><path class="lk" d="M48 48l6-4"/></g>' + wheel(18, 54, 6) + wheel(42, 54, 6) + smoke(8, 52, 0) + smoke(5, 50, 0.9) });

  /* ================= NORTH DAKOTA ================= */
  B.state('ND', 'signature', { id: 'pumpjack', label: 'Pumpjack on the prairie at sunset', colour: 'orange', mood: 'focused', tags: ['oil', 'prairie', 'sunset'],
    svg: () => '<circle class="s x-pulse" cx="48" cy="40" r="11"/><path class="s" d="M0 42H64V64H0z"/>' + gr(42, 0, 64) + bird(10, 14, 0) + bird(20, 20, 1) + '<path class="k" d="M18 58L26 38L34 58z"/><path class="lk" d="M26 38v-4"/>'
      + '<g class="x-swing"><path class="lk t" d="M10 32L46 28"/><path class="k" d="M8 28l8 0 0 8z"/><circle class="k" cx="45" cy="29" r="3"/></g><path class="lm x-bob" d="M12 36v18"/><rect class="m" x="40" y="46" width="12" height="12"/>'
      + '<path class="lk x-swing o-b" d="M4 62v-6M56 62v-6M60 62v-5"/>' });
  B.state('ND', 'element', { id: 'meadowlark', label: 'Meadowlark on a fence post', colour: 'amber', mood: 'cheerful', tags: ['bird', 'song', 'prairie'],
    svg: () => sun(52, 10, 5) + '<rect class="m" x="24" y="44" width="10" height="16"/><path class="lk" d="M0 52h22M36 52h28"/>' + '<g class="x-bob"><ellipse class="c" cx="29" cy="36" rx="8" ry="6"/><path class="k" d="M27 33l5 3-5 3z"/><circle class="m" cx="36" cy="29" r="4.5"/><path class="k" d="M39 29l5 1-5 2z"/><circle class="w" cx="37" cy="28" r="1"/><path class="m" d="M22 38L12 44l11 1z"/></g>'
      + '<path class="lk x-rise" d="M44 22v-6l4-1v6" style="--d:0s"/><path class="lc x-rise" style="--d:1s" d="M50 28v-5l3-1v5"/><circle class="k x-rise" style="--d:.5s" cx="46" cy="24" r="1.4"/>' + '<path class="lk x-swing o-b" d="M6 62v-7M10 62v-6M54 62v-7M58 62v-5"/>' });
  B.place('medora', { id: 'badlands-bison', label: 'Badlands and a bison', colour: 'orange', mood: 'calm', tags: ['badlands', 'bison'],
    svg: () => sun(50, 11, 6) + '<path class="m" d="M0 46L6 30L14 28L20 40L30 24L40 22L48 38L56 34L64 46z"/><path class="c" d="M0 52L8 40L18 38L24 46L34 34L46 32L54 46L64 50V52z"/><path class="lk" d="M6 30L14 28M30 24L40 22M24 46L34 34"/><path class="lw" d="M4 38h10M24 32h12M40 30h8M12 44h12"/><path class="s" d="M0 64V54Q20 50 40 54T64 52V64z"/>'
      + '<g class="x-bob"><path class="k" d="M20 54q-1-10 10-9q8-3 14 2q3 4 2 9z"/><path class="k" d="M44 49q5-1 6 4l-1 4h-3z"/><path class="lk" d="M30 46q-6 0-7 6"/><path class="w" d="M49 51l2 1"/></g><path class="lk x-runbob" d="M24 58v-4M30 58v-4M40 58v-4M45 58v-4"/>' });

  /* ================= OHIO ================= */
  B.state('OH', 'signature', { id: 'wright-flyer', label: 'The Wright Flyer', colour: 'blue', mood: 'proud', tags: ['aviation', 'airplane'],
    svg: () => sun(12, 12, 6) + cloud(34, 8, 0.4) + cloud(44, 28, 1.2) + '<g class="x-bob"><path class="w lk" d="M12 22h30v5H12z"/><path class="w lk" d="M12 34h30v5H12z"/><path class="lk" d="M16 27v7M26 27v7M38 27v7"/><path class="lk" d="M42 30h8M8 30h4M6 26v8"/><circle class="k" cx="30" cy="31" r="2.2"/><path class="lk x-spin" style="--ad:.4s" d="M52 24v12"/><circle class="c" cx="51" cy="30" r="1.4"/></g>'
      + '<path class="s" d="M0 64V54Q16 48 36 54T64 52V64z"/>' + gr(54, 0, 64) + '<path class="lk x-swing o-b" d="M6 62v-5M12 62v-6M52 62v-5" />' });
  B.state('OH', 'element', { id: 'buckeye', label: 'The buckeye nut', colour: 'orange', mood: 'cosy', season: ['autumn'], tags: ['nut', 'leaf', 'autumn'],
    svg: () => '<path class="lc" d="M10 40Q10 62 32 62Q54 62 54 40"/><path class="lc" d="M16 56l-3 4M32 62v4M48 56l3 4"/><circle class="k" cx="32" cy="38" r="14"/><ellipse class="s x-glow" cx="32" cy="35" rx="7" ry="5.5"/><path class="w x-twinkle" d="M24 30q4-4 9-4l-1 2q-4 0-7 3z"/>'
      + '<path class="c x-fall" d="M10 6q4-4 8 0q-1 5-4 6q-4-1-4-6z"/><path class="c x-fall" style="--d:1.4s" d="M44 4q4-4 8 0q-1 5-4 6q-4-1-4-6z"/><path class="m x-fall" style="--d:.7s" d="M28 2q3-3 6 0q-1 4-3 5q-3-1-3-5z"/>' });
  B.place('cleveland', { id: 'rock-hall', label: 'The glass pyramid on Lake Erie', colour: 'pink', mood: 'energetic', intensity: 'playful', tags: ['music', 'lake', 'museum'],
    svg: () => sun(8, 12, 5) + star(52, 10, 0.4) + '<path class="w lc" d="M14 50L32 18L50 50z"/><path class="lc" d="M23 34h18M18 43h28M32 18V50M32 18L24 50M32 18l8 32"/><path class="k" d="M46 50l12-14v14z"/><path class="c x-glow" d="M32 18L26 4L38 4z"/><path class="c x-glow" style="--d:1s" d="M32 18L56 8L58 14z"/>'
      + '<path class="lk x-rise" d="M8 38v-8l4-1v8" style="--d:.2s"/><circle class="k x-rise" style="--d:.9s" cx="56" cy="28" r="1.8"/><rect class="s" x="0" y="50" width="64" height="14"/>' + wv(54, 0) + wv(59, 0.5, 'lm') });
  B.place('cincinnati', { id: 'flying-pig', label: 'The Roebling Bridge and a flying pig', colour: 'pink', mood: 'cheerful', intensity: 'playful', tags: ['bridge', 'pig', 'river'],
    svg: () => sun(8, 10, 5) + '<g class="x-bob"><ellipse class="c" cx="44" cy="14" rx="7" ry="5"/><circle class="c" cx="51" cy="13" r="3.4"/><path class="k" d="M53 12l2 1-2 1z"/><path class="lc" d="M37 14q-3-2-2-5"/><path class="w lk x-wave-hand" style="transform-origin:50% 100%" d="M41 11Q37 3 31 6q2 5 8 7z"/><path class="lk" d="M41 19v3M47 19v3"/></g>'
      + '<rect class="m" x="40" y="38" width="9" height="12"/><rect class="m" x="50" y="32" width="8" height="18"/>' + win(43, 42, 0.5) + win(53, 37, 1)
      + '<path class="m" d="M10 50V26h7v24zM38 50V26h7v24z"/><path class="k" d="M12 50v-8q1.5-3 3 0v8zM40 50v-8q1.5-3 3 0v8z"/><path class="lc" d="M0 44Q8 44 13 26Q25 46 41 26Q50 44 64 44"/><path class="lk t" d="M0 44H64"/><rect class="c x-slidel" x="24" y="41" width="4" height="2.4"/><rect class="s" x="0" y="50" width="64" height="14"/>' + wv(54, 0) + wv(59, 0.5, 'lm') });
  B.place('sandusky', { id: 'coaster', label: 'Roller coasters on Lake Erie', colour: 'red', mood: 'energetic', intensity: 'playful', tags: ['coaster', 'amusement'],
    svg: () => sun(54, 10, 5) + bird(12, 10, 0) + '<path class="lc t" d="M0 56L22 14Q26 8 30 14L36 40Q40 46 44 40L48 28Q52 24 56 30L64 50"/><path class="lk" d="M10 36v22M22 24v34M30 24v34M42 46v12M50 32v26M58 36v22"/>'
      + '<g class="x-bob"><rect class="c" x="26" y="9" width="9" height="5" rx="1.5"/><circle class="k x-pop" cx="28" cy="8" r="1.6"/><circle class="k x-pop" style="--d:.4s" cx="33" cy="8" r="1.6"/></g>' + '<path class="lk x-wave-hand" style="transform-origin:50% 100%" d="M27 7l-2-4M32 7l2-4"/>' + wv(61, 0) });

  /* ================= SOUTH DAKOTA ================= */
  B.state('SD', 'signature', { id: 'rushmore', label: 'Mount Rushmore', colour: 'slate', mood: 'proud', tags: ['mountain', 'monument', 'black hills'],
    svg: () => sun(54, 9, 5) + cloud(4, 9, 0) + cloud(24, 5, 1) + '<path class="m" d="M2 58L14 32L24 26H42L52 32L62 58z"/><path class="lk" d="M24 26H42M14 32H52"/>'
      + '<ellipse class="w x-glow" cx="21" cy="35" rx="4" ry="5"/><ellipse class="w x-glow" style="--d:.5s" cx="30" cy="34" rx="4" ry="5"/><ellipse class="w x-glow" style="--d:1s" cx="39" cy="34" rx="4" ry="5"/><ellipse class="w x-glow" style="--d:1.5s" cx="48" cy="35" rx="4" ry="5"/>'
      + '<path class="k" d="M19 34h1.5M22 34h1.5M28 33h1.5M31 33h1.5M37 33h1.5M40 33h1.5M46 34h1.5M49 34h1.5"/><path class="lw" d="M20 42v8M30 42v10M40 42v10M48 42v8"/><path class="k" d="M0 58l4-10 4 10zM56 58l4-12 4 12z"/>' + bird(28, 18, 0.7) });
  B.state('SD', 'element', { id: 'pheasant', label: 'The ring-necked pheasant', colour: 'amber', mood: 'proud', tags: ['pheasant', 'bird'],
    svg: () => sun(12, 12, 5) + '<g class="x-bob"><ellipse class="c" cx="38" cy="38" rx="11" ry="7"/><path class="lc x-wobble" d="M28 40Q16 40 4 52"/><path class="lk x-wobble" d="M28 38Q16 36 6 44"/><path class="k" d="M44 32q3-6 4-9"/><circle class="m" cx="50" cy="20" r="4.5"/><path class="c" d="M48 21a2 2 0 1 1 0 .1z"/><path class="w" d="M45 30q3 1 5 0v2q-3 1-5 0z"/><path class="k" d="M54 20l4 1-4 1z"/><path class="m" d="M32 36q6 5 12 0"/></g>'
      + '<path class="lk x-runbob" d="M36 46v8M42 46v8"/>' + '<path class="lk x-swing o-b" d="M8 62v-8M14 62v-6M54 62v-7M60 62v-5"/>' + gr(60, 0, 64) });
  B.place('rapid-city', { id: 'dinosaur', label: 'Dinosaur Park', colour: 'green', mood: 'cheerful', tags: ['dinosaur', 'park', 'black hills'],
    svg: () => sun(10, 10, 5) + cloud(30, 8, 0.6) + '<path class="m" d="M0 48L12 30L24 44L38 26L52 42L64 34V64H0z"/><path class="s" d="M0 64V52Q32 44 64 52V64z"/><g class="x-bob"><path class="c" d="M16 52Q18 40 32 40Q42 40 44 50z"/><path class="c" d="M16 46Q6 46 3 54l6-1q5-3 8-1z"/><path class="lc t" d="M40 44Q48 36 48 28"/><ellipse class="c" cx="50" cy="26" rx="4" ry="2.6"/><circle class="k" cx="51.5" cy="25" r=".9"/></g>'
      + '<path class="lk" d="M22 52v6M28 52v6M36 52v6M42 52v6"/><ellipse class="w lk" cx="56" cy="58" rx="3" ry="4"/>' + '<path class="lk x-swing o-b" d="M6 62v-5M60 62v-6" />' });
  B.place('mitchell', { id: 'corn-palace', label: 'The Corn Palace', colour: 'amber', mood: 'cheerful', tags: ['palace', 'corn', 'domes'],
    svg: () => cloud(2, 7, 0) + cloud(46, 10, 1) + '<path class="c" d="M6 36q6-8 6-16q6 0 6 16zM46 36q0-8 6-16q6 8 6 16z"/><path class="c" d="M25 32q7-10 7-22q7 12 7 22z"/><path class="lk" d="M12 20v-6M52 20v-6M32 10V4"/><path class="c x-flag" d="M32 4h8v4h-8z"/><path class="c x-flag" d="M12 14h7v3h-7z"/><path class="c x-flag" style="--d:.4s" d="M52 14h7v3h-7z"/>'
      + '<rect class="s lk" x="6" y="36" width="52" height="22"/><path class="c" d="M8 38h6v4H8zM20 38h6v4h-6zM34 38h6v4h-6zM46 38h6v4h-6zM14 42h6v4h-6zM26 42h6v4h-6zM40 42h6v4h-6zM8 46h6v4H8zM20 46h6v4h-6zM34 46h6v4h-6zM46 46h6v4h-6z"/><rect class="k" x="27" y="48" width="10" height="10"/><circle class="c x-pop" cx="22" cy="26" r="1.6"/><circle class="c x-pop" style="--d:1.2s" cx="46" cy="28" r="1.6"/>' + gr(58, 0, 64) });

  /* ================= WISCONSIN ================= */
  B.state('WI', 'signature', { id: 'door-lighthouse', label: 'A Door County lighthouse', colour: 'red', mood: 'calm', tags: ['lighthouse', 'lake'],
    svg: () => moon(10, 12) + star(30, 8, 0.4) + star(52, 14, 1.2) + '<path class="c x-glow" d="M34 20L2 12v16zM34 20L62 12v16z" style="opacity:.35"/><path class="m" d="M8 52Q16 42 26 48L40 44Q52 42 62 50V64H8z"/><path class="w lk" d="M30 50L33 28H39L42 50z"/><path class="c" d="M31.5 38h8.2l.6 5H30.9z"/><rect class="k" x="31" y="20" width="10" height="8"/><path class="lk" d="M30 20h12l-6-6z"/><circle class="s x-flicker" cx="36" cy="24" r="2"/>'
      + '<rect class="s" x="0" y="52" width="64" height="12"/>' + wv(54, 0) + wv(59, 0.5, 'lm') + wv(63, 1, 'lm') });
  B.state('WI', 'element', { id: 'cheese', label: 'Cheese and a mouse', colour: 'amber', mood: 'cheerful', tags: ['cheese', 'dairy', 'food'],
    svg: () => '<path class="s" d="M6 28L40 14L58 28z"/><path class="c" d="M6 28H58V50H6z"/><path class="lk" d="M6 28L40 14L58 28M6 28H58V50H6z"/><circle class="s" cx="18" cy="38" r="3.4"/><circle class="s" cx="34" cy="42" r="4.4"/><circle class="s" cx="48" cy="35" r="2.6"/><circle class="s x-pulse" cx="26" cy="33" r="2"/>'
      + '<g class="x-bob"><ellipse class="m" cx="52" cy="54" rx="7" ry="4"/><circle class="m" cx="46" cy="52" r="3"/><circle class="w lk" cx="45" cy="49" r="2"/><circle class="k" cx="44" cy="52" r=".8"/><path class="lk x-wave-hand" d="M59 54q4 0 4-5"/></g>' + '<circle class="c x-fall" cx="40" cy="48" r="1"/><circle class="c x-fall" style="--d:1s" cx="42" cy="50" r="1"/>' + gr(58, 0, 64) });
  B.place('milwaukee', { id: 'art-museum', label: 'The Art Museum wings on the lake', colour: 'teal', mood: 'proud', tags: ['museum', 'lake', 'architecture'],
    svg: () => sun(54, 10, 5) + bird(8, 10, 0) + bird(18, 15, 1) + '<path class="lk t" d="M32 52V14"/><path class="lk" d="M32 14L18 50M32 14l14 36"/><path class="w lk x-wave-hand" style="transform-origin:100% 100%" d="M31 48L6 22L18 20z"/><path class="w lk x-wave-hand" style="transform-origin:0% 100%;--d:.3s" d="M33 48L58 22L46 20z"/><path class="lw" d="M31 40L14 24M33 40L50 24"/>'
      + '<rect class="m" x="14" y="50" width="36" height="4"/><rect class="s" x="0" y="54" width="64" height="10"/>' + wv(57, 0) + wv(61, 0.6, 'lm') });
  B.place('wisconsin-dells', { id: 'duck-boat', label: 'A duck boat and the sandstone cliffs', colour: 'amber', mood: 'cheerful', intensity: 'playful', tags: ['duck boat', 'river', 'waterslide'],
    svg: () => sun(10, 10, 5) + '<path class="m" d="M32 52V20Q36 14 44 16Q56 14 64 20V52z"/><path class="lw" d="M32 28h32M32 38h32"/><path class="k" d="M40 16l3-6 3 6zM54 18l3-7 3 7z"/><path class="lc t" d="M36 20Q44 20 46 32Q48 44 58 44"/><circle class="k x-pop" cx="46" cy="30" r="1.8"/>'
      + '<rect class="s" x="0" y="46" width="64" height="18"/>' + wv(50, 0) + '<g class="x-bob"><path class="c" d="M6 44h32l-4 8H12z"/><path class="w lk" d="M12 38h18v6H12z"/><path class="lk" d="M38 44l6-3q2 2 0 4l-6 1"/><circle class="k" cx="16" cy="41" r="1.2"/><circle class="k" cx="22" cy="41" r="1.2"/><circle class="k" cx="28" cy="41" r="1.2"/></g>'
      + '<circle class="w x-pop" cx="46" cy="46" r="1.6"/><circle class="w x-pop" style="--d:.5s" cx="52" cy="47" r="1.2"/>' + wv(58, 0.5, 'lm') });

  animRegisterPack(B.pack({ id: 'us-midwest', name: 'US Midwest', description: 'The Midwest states and their cities and towns: Chicago, the Gateway Arch, the Corn Palace, Mackinac Island and more.' }));
})();
