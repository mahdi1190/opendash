/* ============================================================
   ANIMATION PACK "us-mountain": Mountain West and Southwest (AZ CO ID MT NV NM OK UT WY).
   PURE classic script. A signature opening and an element per state, plus one item
   per art place (big city = opening, small city = symbol). Built with usBuilder
   (71-anim-us.js); each item is a constant 64x64 scene with its own motion.
   ============================================================ */
(function () {
  const B = usBuilder('mountain');
  // ---- small local helpers (constants only) ----
  const stars = (pts) => pts.map(([x, y], i) => `<circle class="k x-twinkle" style="--d:${((i * 0.37) % 2).toFixed(2)}s" cx="${x}" cy="${y}" r="0.9"/>`).join('');
  const gnd = (y, x1 = 2, x2 = 62) => `<path class="lm" d="M${x1} ${y}H${x2}"/>`;
  const sun = (x, y, r) => `<g class="x-pulse"><circle class="c" cx="${x}" cy="${y}" r="${r}"/></g>`;
  const moon = (x, y, r) => `<g class="x-glow"><circle class="w lc" cx="${x}" cy="${y}" r="${r}"/></g>`;
  const wave = (y, cls) => `<path class="${cls} x-wave" d="M-12 ${y}q3-3 6 0${'t6 0'.repeat(14)}"/>`;
  const bird = (x, y, d) => `<g class="x-bob" style="--d:${d}s"><path class="lk" d="M${x} ${y}q3-4 6 0q3-4 6 0"/></g>`;
  const pine = (x, y, h) => `<path class="c" d="M${x} ${y - h}l${h * 0.32} ${h * 0.5}h-${h * 0.14}l${h * 0.28} ${h * 0.5}h-${h * 0.92}l${h * 0.28}-${h * 0.5}h-${h * 0.14}z"/>`;
  const cloud = (x, y, d) => `<g class="x-slidel" style="--d:${d}s"><path class="w" d="M${x} ${y}q0-4 4-4 1-4 5-3 4-1 5 3 4 0 4 4z"/></g>`;

  // ================= ARIZONA =================
  B.state('AZ', 'signature', { id: 'grand-canyon', label: 'Grand Canyon rim', colour: 'orange', mood: 'proud', tags: ['canyon', 'river'],
    svg: () => sun(48, 13, 6) + bird(12, 12, 0) + bird(24, 19, 1.1) +
      '<path class="s" d="M0 28l8-3 6 3 8-5 8 4 7-3 9 5 7-3 11 4v12H0z"/>' +
      '<path class="c" d="M0 36l10-3 8 3 9-4 10 4 9-3 18 4v12H0z"/>' +
      '<path class="m" d="M0 44l12-2 10 3 12-3 14 3 16-2v18H0z"/>' +
      '<path class="lk" d="M4 40l8 3M20 41l7 2M40 38l9 3M10 49l9 2M44 49l8 1"/>' +
      '<path class="lc t" d="M-2 58q16-6 30-2t38-3"/>' + wave(61, 'lw dash') });
  B.state('AZ', 'element', { id: 'roadrunner', label: 'Roadrunner dash', colour: 'amber', mood: 'energetic', tags: ['bird', 'animal'], intensity: 'standard',
    svg: () => '<path class="lm t" d="M56 56V38M56 50h-6v-6M56 44h5v-5"/>' +
      '<g class="x-runbob"><path class="c" d="M18 36L3 29l1 5 14 6z"/><ellipse class="c" cx="28" cy="38" rx="11" ry="6"/><path class="c" d="M36 34l4-8 4 2-3 9z"/><circle class="c" cx="43" cy="25" r="4"/>' +
      '<path class="lk" d="M41 22l-3-4M43 21l-1-5M26 43l-3 9M31 43l4 9"/><path class="k" d="M46 25l8 1-8 2z"/><circle class="w" cx="44" cy="24" r="1.1"/></g>' +
      '<g class="x-trail"><circle class="s" cx="14" cy="53" r="2.4"/></g><g class="x-trail" style="--d:0.4s"><circle class="s" cx="8" cy="52" r="1.8"/></g>' + gnd(54, 2, 50) });
  B.place('phoenix', { id: 'sun-saguaro', label: 'Sun and saguaro', colour: 'orange', mood: 'cheerful', tags: ['skyline', 'desert'],
    svg: () => '<g class="x-pulse" style="--ad:3s"><circle class="c" cx="40" cy="22" r="11"/></g><circle class="w" cx="40" cy="22" r="6.5"/>' +
      '<path class="m" d="M2 44l6-10 4 4 6-8 4 8 5-4v10z"/>' +
      '<rect class="s" x="30" y="38" width="5" height="10"/><rect class="s" x="36" y="33" width="6" height="15"/><rect class="s" x="43" y="40" width="5" height="8"/><rect class="s" x="49" y="36" width="5" height="12"/>' +
      '<rect class="k x-blink" style="--d:0.2s" x="38" y="36" width="1.4" height="1.6"/><rect class="k x-blink" style="--d:0.9s" x="45" y="43" width="1.4" height="1.6"/>' +
      '<path class="lc t" d="M16 58V30M16 48H9V38M16 42h7V33"/><g class="x-pop" style="--d:1s"><circle class="w lc" cx="16" cy="28" r="2.2"/></g>' + gnd(58, 2, 62) +
      '<path class="lk x-steam" style="--d:0.5s" d="M30 52q3-2 6 0t6 0"/>' });
  B.place('sedona', { id: 'red-rock-vortex', label: 'Red rock vortex', colour: 'red', mood: 'dreamy', tags: ['rocks', 'spiral'],
    svg: () => moon(50, 12, 5) + stars([[10, 8], [24, 14], [36, 7], [58, 24]]) +
      '<path class="c" d="M6 56V36l4-4v-8l4-3 3 3v8l3 3 3-2v6l5 4v20z"/><path class="c" d="M34 56V38l4-3 2-10 4-3 4 4 2 8 4 3v19z"/>' +
      '<path class="lk" d="M10 40v10M18 36l-1 14M40 42l-1 8M48 38v12M54 42l-1 8"/>' +
      '<g class="x-spin-slow"><path class="lw t" d="M32 24a7 7 0 1 1 0 9a4.5 4.5 0 1 1 0-6"/></g>' +
      '<path class="m" d="M22 58q3-9 6-5t5 5z"/>' + gnd(58) });
  B.place('page', { id: 'horseshoe-bend', label: 'Horseshoe Bend', colour: 'orange', mood: 'calm', tags: ['river', 'canyon'],
    svg: () => '<path class="c" d="M0 0h64v64H0z"/>' +
      '<path class="s" d="M22 64V34q0-12 10-12t10 12v30z"/>' +
      '<path class="lw t" d="M14 64V36q0-18 18-18t18 18v28"/><path class="lc" d="M10 64V35q0-22 22-22t22 22v29"/>' +
      '<g class="x-bob"><path class="k" d="M30 40l6-2 1 3z"/></g>' +
      '<circle class="w x-twinkle" cx="20" cy="40" r="1.3"/><circle class="w x-twinkle" style="--d:0.8s" cx="44" cy="46" r="1.3"/><circle class="w x-twinkle" style="--d:1.5s" cx="32" cy="56" r="1.3"/>' +
      '<g class="x-pulse"><circle class="w" cx="56" cy="8" r="3"/></g><path class="lk" d="M3 10l9 2M52 30l8 2M3 24l7 1"/>' });

  // ================= COLORADO =================
  B.state('CO', 'signature', { id: 'maroon-bells', label: 'Maroon Bells reflection', colour: 'indigo', mood: 'calm', tags: ['peaks', 'lake'],
    svg: () => moon(48, 10, 4.5) + stars([[8, 8], [20, 14], [34, 6], [58, 18]]) +
      '<path class="m" d="M2 34l12-18 6 8 8-14 14 24z"/><path class="w" d="M14 16l-4 6 3 1 3-2 3 3zM28 10l-4 8 4 2 4-3z"/>' +
      '<path class="s" d="M2 36h60v2H2z"/><path class="m" d="M4 40l8 14 6-8 8 14 14-24" opacity="0.6"/>' +
      wave(44, 'lw') + wave(50, 'lm') + wave(56, 'lw') +
      '<path class="lc" d="M2 36h60"/>' + pine(8, 36, 8) + pine(54, 36, 9) });
  B.state('CO', 'element', { id: 'columbine', label: 'Columbine bloom', colour: 'blue', mood: 'cheerful', tags: ['flower'],
    svg: () => '<g class="x-swing o-b"><path class="lc" d="M32 34v26"/>' +
      '<path class="c" d="M32 50q-10-2-14-10 9 0 14 10zM32 54q10-2 14-8-9-1-14 8z"/>' +
      [-72, -36, 0, 36, 72].map(a => `<ellipse class="c" cx="32" cy="20" rx="3.6" ry="9" transform="rotate(${a} 32 30)"/>`).join('') +
      [-54, -18, 18, 54].map(a => `<ellipse class="w lc" cx="32" cy="24" rx="3" ry="7" transform="rotate(${a} 32 30)"/>`).join('') +
      '<path class="k" d="M30 28h1v6h-1zM33 28h1v6h-1z"/><circle class="k" cx="30.5" cy="28" r="1.2"/><circle class="k" cx="33.5" cy="28" r="1.2"/></g>' +
      '<g class="x-float"><circle class="s" cx="50" cy="26" r="1.8"/></g>' });
  B.place('denver', { id: 'mile-high', label: 'Mile-high skyline', colour: 'blue', mood: 'proud', tags: ['skyline', 'peaks'],
    svg: () => '<g class="x-rise" style="--ad:6s"><circle class="c" cx="46" cy="20" r="6"/></g>' +
      '<path class="m" d="M0 40l10-16 6 8 8-14 10 16 8-10 12 16z"/><path class="w" d="M10 24l-3 5 3-1 2 2zM24 18l-3 6 3-1 3 2z"/>' +
      '<rect class="c" x="6" y="40" width="9" height="20"/><rect class="s" x="15" y="34" width="7" height="26"/><rect class="c" x="23" y="28" width="9" height="32"/><path class="k" d="M26 28l2-6 2 6z"/>' +
      '<rect class="s" x="33" y="38" width="8" height="22"/><rect class="c" x="42" y="42" width="8" height="18"/><rect class="s" x="51" y="36" width="8" height="24"/>' +
      '<rect class="w x-blink" x="25" y="32" width="2" height="2"/><rect class="w x-blink" style="--d:0.5s" x="28" y="38" width="2" height="2"/><rect class="w x-blink" style="--d:0.9s" x="17" y="40" width="2" height="2"/><rect class="w x-blink" style="--d:0.3s" x="53" y="42" width="2" height="2"/>' + gnd(60) });
  B.place('aspen', { id: 'gondola-aspens', label: 'Gondola over the aspens', colour: 'amber', mood: 'cheerful', tags: ['gondola', 'autumn'],
    svg: () => '<path class="lm" d="M2 12L62 26"/><path class="lk t" d="M10 16v4"/>' +
      '<g class="x-swing o-t"><path class="lk" d="M32 19v5"/><rect class="c" x="26" y="24" width="12" height="9" rx="2"/><rect class="w" x="28" y="26" width="3.5" height="4"/><rect class="w" x="32.5" y="26" width="3.5" height="4"/></g>' +
      '<path class="m" d="M2 48l12-12 8 8 10-10 12 12 18-10v28H2z" opacity="0.5"/>' +
      [[10, 56], [22, 58], [46, 56], [56, 58]].map(([x, y], i) => `<path class="w lk" d="M${x} ${y}V${y - 18}"/><g class="x-twinkle" style="--d:${i * 0.5}s"><circle class="c" cx="${x}" cy="${y - 22}" r="6"/><circle class="c" cx="${x - 4}" cy="${y - 17}" r="3.5"/><circle class="c" cx="${x + 4}" cy="${y - 17}" r="3.5"/></g>`).join('') +
      '<g class="x-fall" style="--d:0.4s"><path class="c" d="M36 34l2 2-2 2-2-2z"/></g>' + gnd(60) });
  B.place('boulder', { id: 'flatirons', label: 'Flatirons and hawk', colour: 'red', mood: 'calm', tags: ['rocks', 'hawk'],
    svg: () => sun(12, 14, 5) +
      '<path class="m" d="M0 52V40l8-4 8 2 6-6 8 4 6-2 8 6 6-2 8 4v10z"/>' +
      '<path class="c" d="M10 56L26 16l5 2L20 56z"/><path class="c" d="M22 56L38 22l5 3-14 31z"/><path class="c" d="M34 56l14-26 5 4-12 22z"/>' +
      '<path class="lk" d="M25 22l-8 22M37 28l-9 22M47 36l-9 16"/>' +
      pine(8, 58, 10) + pine(54, 58, 9) + pine(48, 58, 7) +
      '<g class="x-bob" style="--ad:3.4s"><g class="x-flap" style="--ad:2.4s"><path class="lk t" d="M44 12q5-5 10 0 5-5 10 0"/></g></g>' + gnd(58) });

  // ================= IDAHO =================
  B.state('ID', 'signature', { id: 'sawtooth-lake', label: 'Sawtooth moonlit lake', colour: 'indigo', mood: 'dreamy', tags: ['peaks', 'lake', 'night'],
    svg: () => moon(48, 12, 5) + stars([[8, 8], [18, 16], [30, 6], [58, 6], [38, 14]]) +
      '<path class="m" d="M0 36l5-12 4 6 5-14 4 12 5-8 5 10 5-18 4 14 5-6 6 10 6-8 4 12v2H0z"/><path class="w" d="M14 16l-2 5h4zM38 18l-2 5 3 1z"/>' +
      pine(6, 40, 9) + pine(14, 40, 7) + pine(54, 40, 9) +
      '<path class="s" d="M0 40h64v24H0z"/>' + wave(46, 'lw') + wave(52, 'lm') + wave(58, 'lw') +
      '<g class="x-twinkle"><path class="w" d="M46 42h4v2h-4zM44 46h8v1.5h-8z"/></g>' });
  B.state('ID', 'element', { id: 'russet-potato', label: 'Russet potato', colour: 'amber', mood: 'cosy', tags: ['food', 'potato'],
    svg: () => '<g class="x-steam"><path class="lm" d="M26 16q-3-4 0-8M34 14q-3-4 0-9M42 17q-3-4 0-8"/></g>' +
      '<g class="x-bob"><path class="c" d="M8 40q2-14 22-14 22 0 26 12 3 12-14 16-28 4-34-14z"/>' +
      '<circle class="k" cx="20" cy="36" r="1.3"/><circle class="k" cx="34" cy="32" r="1.3"/><circle class="k" cx="44" cy="42" r="1.3"/><circle class="k" cx="28" cy="46" r="1.3"/>' +
      '<path class="lk" d="M16 44q3 2 6 1M38 36q3-2 6 1"/><path class="w" d="M26 22l12 2-2 5-11-2z"/><path class="lk" d="M28 24l8 1"/></g>' +
      '<path class="lc" d="M6 58h52"/>' });
  B.place('coeur-d-alene', { id: 'lake-and-pines', label: 'Lake and pines', colour: 'teal', mood: 'calm', tags: ['lake', 'pines', 'sailboat'],
    svg: () => sun(50, 12, 5) + bird(10, 12, 0.3) +
      '<path class="m" d="M0 30l10-8 8 6 10-8 12 10 8-4 16 8v16H0z" opacity="0.55"/>' +
      '<path class="s" d="M0 34h64v30H0z"/>' +
      pine(6, 40, 14) + pine(14, 40, 11) + pine(58, 40, 13) + pine(50, 40, 10) +
      '<g class="x-bob" style="--ad:3s"><path class="w lk" d="M30 40V22l9 17z"/><path class="c" d="M29 22l-9 17h9z"/><path class="c" d="M22 42h20l-4 5H26z"/></g>' +
      wave(52, 'lw') + wave(58, 'lc') });
  B.place('sun-valley', { id: 'chairlift', label: 'Chairlift', colour: 'blue', mood: 'energetic', tags: ['ski', 'winter'], season: ['winter'],
    svg: () => '<path class="m" d="M0 48l16-18 10 10 12-20 26 28v16H0z"/><path class="w" d="M36 20l-5 8 4-2 3 3zM16 30l-4 5 3-1z"/>' +
      '<path class="lk t" d="M4 8v18M56 12v18"/><path class="lk" d="M4 10L56 14"/>' +
      '<g class="x-swing o-t"><path class="lk" d="M20 11.5v6"/><path class="c" d="M14 18h12v4H14z"/><path class="lc t" d="M14 18v-5M14 25h12"/></g>' +
      '<g class="x-swing o-t" style="--d:1.2s"><path class="lk" d="M42 13v6"/><path class="c" d="M36 20h12v4H36z"/><path class="lc t" d="M36 20v-5M36 27h12"/></g>' +
      [[8, 36], [24, 44], [40, 38], [54, 50], [30, 56]].map(([x, y], i) => `<g class="x-fall" style="--d:${i * 0.55}s"><circle class="w" cx="${x}" cy="${y - 30}" r="1.4"/></g>`).join('') +
      '<path class="w lm" d="M0 60q16-6 32-2t32-4v10H0z"/>' });

  // ================= MONTANA =================
  B.state('MT', 'signature', { id: 'big-sky', label: 'Big sky country', colour: 'blue', mood: 'calm', tags: ['sky', 'prairie', 'mountains'],
    svg: () => sun(50, 14, 5) + cloud(6, 18, 0) + cloud(26, 10, 0.5) + cloud(40, 26, 1) +
      '<path class="m" d="M0 40l8-6 7 4 9-8 8 8 7-5 9 7 7-3 9 4v6H0z"/><path class="w" d="M24 30l-2 3 2-.5 2 1zM8 34l-2 2 3 0z"/>' +
      '<path class="s" d="M0 44h64v20H0z"/>' +
      '<path class="lk t" d="M6 60V50M18 60V50M30 60V50M42 60V50M54 60V50"/><path class="lk" d="M2 53h60M2 57h60"/>' +
      '<g class="x-tree o-b"><path class="lc" d="M10 64l-2-8M14 64l1-9M52 64l-1-8M58 64l2-8"/></g>' });
  B.state('MT', 'element', { id: 'trout-leap', label: 'Trout leap', colour: 'teal', mood: 'energetic', tags: ['fish', 'fly fishing'], intensity: 'standard',
    svg: () => '<g class="x-bounce"><path class="c" d="M12 28q10-12 28-4l8-6-2 10 6 6-10-2q-14 10-30-4z"/><path class="w" d="M14 28q10-6 22-2"/><circle class="k" cx="18" cy="27" r="1.2"/><circle class="k" cx="26" cy="30" r="1" /><circle class="k" cx="31" cy="27" r="1"/></g>' +
      '<g class="x-drop" style="--d:0.5s"><path class="lc" d="M10 40l-1 3"/></g><g class="x-drop" style="--d:1.2s"><path class="lc" d="M48 38l1 3"/></g>' +
      '<path class="s" d="M0 46h64v18H0z"/>' + wave(48, 'lc') + wave(54, 'lw') + wave(60, 'lm') +
      '<g class="x-ring o-v"><ellipse class="lw" cx="30" cy="48" rx="12" ry="2.4"/></g>' });
  B.place('bozeman', { id: 'dino-museum', label: 'Museum dinosaur', colour: 'green', mood: 'cheerful', tags: ['dinosaur', 'museum'], intensity: 'playful',
    svg: () => '<path class="m" d="M0 34l10-8 8 6 10-10 12 12 8-4 16 8v16H0z" opacity="0.5"/>' +
      '<g class="x-bounce"><path class="c" d="M6 50q4-12 14-14l8-14q4-6 12-4l6 4-2 8-8 2 4 6-6 4-4 12h-6l2-8-6-2-4 8H8z"/><path class="w" d="M38 22l4 1-1 3-3-1zM40 26l4 .5-.5 2.5-3-1z"/><circle class="k" cx="42" cy="16" r="1.4"/><path class="lk" d="M22 34l-4 4 3 1M36 28l3 5-3 1"/></g>' +
      '<g class="x-pop" style="--d:0.4s"><path class="lk" d="M16 60l2-4 2 4zM46 60l2-4 2 4z"/></g>' + gnd(61) +
      '<path class="lk x-steam" d="M52 12q-3-2 0-4M56 12q-3-2 0-4"/>' });
  B.place('whitefish', { id: 'ski-lodge', label: 'Ski lodge by the lake', colour: 'red', mood: 'cosy', tags: ['lodge', 'winter', 'lake'], season: ['winter'],
    svg: () => moon(50, 10, 4.5) + stars([[8, 8], [22, 14], [36, 6]]) +
      '<path class="m" d="M0 34l10-10 8 8 10-12 12 14 10-8 14 10v18H0z" opacity="0.6"/>' +
      '<path class="c" d="M12 52V34l14-14 14 14v18z"/><rect class="k" x="22" y="40" width="8" height="12"/>' +
      '<g class="x-glow"><rect class="w" x="14" y="36" width="5" height="5"/><rect class="w" x="33" y="36" width="5" height="5"/></g><g class="x-glow" style="--d:0.8s"><path class="w" d="M26 28l3 4h-6z"/></g>' +
      '<rect class="k" x="34" y="20" width="4" height="9"/><g class="x-steam"><path class="lw" d="M36 18q-3-3 0-6 3-3 0-6"/></g>' +
      pine(50, 52, 14) + pine(58, 52, 10) +
      '<path class="w lm" d="M0 52h64v12H0z"/>' +
      [[8, 26], [18, 14], [44, 24], [56, 34]].map(([x, y], i) => `<g class="x-fall" style="--d:${i * 0.7}s"><circle class="w" cx="${x}" cy="${y}" r="1.2"/></g>`).join('') });

  // ================= NEVADA =================
  B.state('NV', 'signature', { id: 'pyramid-lake', label: 'Pyramid Lake tufa', colour: 'orange', mood: 'dreamy', tags: ['lake', 'tufa', 'sunset'],
    svg: () => sun(32, 24, 8) + bird(8, 10, 0) + bird(44, 8, 0.9) +
      '<path class="m" d="M0 36l10-6 8 4 8-6 10 6 10-4 18 6v4H0z"/>' +
      '<path class="s" d="M0 36h64v28H0z"/>' +
      '<path class="c" d="M10 50q-1-12 3-18 3 6 3 18zM24 52q0-18 5-26 4 10 3 26zM40 50q1-10 4-14 3 5 2 14z"/>' +
      '<path class="lk" d="M13 36v10M28 32v14M44 40v8"/>' +
      wave(54, 'lw') + wave(58, 'lm') + wave(62, 'lw') +
      '<g class="x-bob"><path class="w lk" d="M54 46q4-5 8 0-4 2-8 0z"/></g>' });
  B.state('NV', 'element', { id: 'desert-tortoise', label: 'Desert tortoise', colour: 'green', mood: 'calm', tags: ['animal', 'desert'],
    svg: () => '<g class="x-bob" style="--ad:3.6s"><path class="c" d="M14 42q4-18 20-18t18 18z"/>' +
      '<path class="lw" d="M20 42q2-12 8-14M34 25q-2 9 0 17M44 30q4 6 4 12M26 34h14"/>' +
      '<path class="m" d="M52 42q2-4 8-3 2 2 0 5h-8z"/><circle class="k" cx="58" cy="40.5" r="1"/><path class="m" d="M16 42h6v6h-6zM38 42h7v6h-7z"/><path class="m" d="M12 42l-5 3 5 1z"/></g>' +
      '<g class="x-pop" style="--d:1.5s"><path class="lc t" d="M6 58v-8M6 54h-3v-3M6 56h3v-3"/></g>' + gnd(58, 10, 62) +
      '<g class="x-trail"><circle class="s" cx="8" cy="56" r="1.6"/></g>' });
  B.place('las-vegas', { id: 'neon-strip', label: 'Neon strip', colour: 'pink', mood: 'energetic', tags: ['neon', 'night', 'casino'], intensity: 'playful',
    svg: () => stars([[6, 6], [16, 12], [54, 8]]) +
      '<g class="x-swing o-b"><path class="s" d="M4 38l8-34 8 34z"/></g><g class="x-swing o-b" style="--d:1.4s"><path class="s" d="M44 38l8-34 8 34z"/></g>' +
      '<rect class="k" x="4" y="34" width="12" height="26"/><rect class="m" x="17" y="26" width="10" height="34"/><rect class="k" x="28" y="30" width="9" height="30"/><rect class="m" x="38" y="22" width="8" height="38"/><path class="k" d="M42 22V10"/><rect class="k" x="47" y="36" width="13" height="24"/>' +
      '<g class="x-flicker"><circle class="c" cx="42" cy="9" r="2.6"/></g>' +
      [[8, 38], [12, 44], [8, 50], [20, 30], [24, 36], [20, 44], [31, 36], [41, 28], [41, 36], [43, 44], [50, 42], [55, 48]].map(([x, y], i) => `<rect class="${i % 3 ? 'c' : 'w'} x-blink" style="--d:${(i * 0.23).toFixed(2)}s" x="${x}" y="${y}" width="2.4" height="2.4"/>`).join('') +
      gnd(60) });
  B.place('tonopah', { id: 'mine-headframe', label: 'Mine headframe under stars', colour: 'slate', mood: 'focused', tags: ['mining', 'stars'],
    svg: () => stars([[8, 8], [18, 16], [30, 6], [46, 12], [56, 6], [38, 20], [58, 22], [10, 24]]) +
      '<path class="m" d="M0 50l10-8 8 4 10-6 10 6 12-4 14 8v10H0z"/>' +
      '<path class="lk t" d="M22 54L30 22l8 32"/><path class="lk" d="M24 46h12M26 38h8M28 30h4"/><path class="lk" d="M30 22L48 40M48 40V54"/>' +
      '<g class="x-spin"><circle class="w lc" cx="30" cy="20" r="5"/><path class="lc" d="M30 15v10M25 20h10"/></g>' +
      '<g class="x-lift"><path class="lk" d="M48 40v4"/><rect class="c" x="44" y="44" width="8" height="6"/></g>' +
      '<g class="x-glow"><rect class="c" x="8" y="46" width="4" height="4"/></g><path class="k" d="M4 54h12V46l-6-3-6 3z"/>' + gnd(56, 2, 62) });

  // ================= NEW MEXICO =================
  B.state('NM', 'signature', { id: 'white-sands', label: 'White Sands dunes', colour: 'violet', mood: 'dreamy', tags: ['dunes', 'night'],
    svg: () => moon(46, 14, 6) + stars([[8, 8], [20, 16], [30, 6], [58, 8], [12, 24]]) +
      '<path class="m" d="M0 34l12-6 10 4 10-5 12 5 20-3v8H0z" opacity="0.5"/>' +
      '<path class="w lk" d="M0 46q14-14 28-4t36-6v28H0z"/><path class="s" d="M0 56q16-10 30-2t34-4v14H0z"/>' +
      '<path class="lm" d="M8 52q4-2 8 0M34 48q4-2 8 0M20 58q4-2 8 0M46 56q4-2 8 0"/>' +
      '<g class="x-tree o-b"><path class="lk t" d="M52 46V34"/><path class="lk" d="M52 36l-4-6M52 36l4-6M52 34V26"/></g>' + cloud(2, 22, 0.4) });
  B.state('NM', 'element', { id: 'zia-sun', label: 'Zia sun symbol', colour: 'amber', mood: 'proud', tags: ['symbol', 'sun'],
    svg: () => '<g class="x-spin-slow"><circle class="c" cx="32" cy="32" r="8"/>' +
      [0, 90, 180, 270].map(a => `<g transform="rotate(${a} 32 32)"><path class="lc t" d="M28 21V10M32 21V8M36 21V10"/></g>`).join('') + '</g>' +
      '<g class="x-pulse"><circle class="w" cx="32" cy="32" r="3.2"/></g><circle class="lc dash" cx="32" cy="32" r="26"/>' });
  B.place('santa-fe', { id: 'adobe-ristra', label: 'Adobe and chile ristra', colour: 'red', mood: 'cosy', tags: ['adobe', 'chile'],
    svg: () => sun(52, 12, 5) + cloud(4, 14, 0.3) +
      '<path class="m" d="M0 40l10-8 10 4 10-6 10 6 14-4 10 8v20H0z" opacity="0.4"/>' +
      '<path class="c" d="M4 58V30h34v28z"/><path class="s" d="M38 58V42h22v16z"/>' +
      '<path class="lk" d="M3 30h42M10 34h-5M42 38h18"/><path class="lk t" d="M12 29h3M24 29h3M36 29h3"/>' +
      '<rect class="w" x="24" y="42" width="10" height="16"/><rect class="w" x="8" y="38" width="9" height="8"/><path class="lk" d="M12.5 38v8M8 42h9"/>' +
      '<path class="lk t" d="M40 38h18"/><g class="x-swing o-t"><path class="lk" d="M50 38v18"/>' + [42, 47, 52].map((y, i) => `<ellipse class="c" cx="${i % 2 ? 53 : 47}" cy="${y}" rx="2.2" ry="3.4"/>`).join('') + '</g>' +
      gnd(58, 2, 62) });
  B.place('roswell', { id: 'flying-saucer', label: 'Flying saucer', colour: 'green', mood: 'dreamy', tags: ['ufo', 'night'], intensity: 'playful',
    svg: () => stars([[6, 8], [14, 20], [50, 8], [58, 22], [26, 6]]) +
      '<path class="c x-pulse" style="--ad:2.4s" d="M24 34h16l5 24H19z" opacity="0.45"/>' +
      '<g class="x-bob" style="--ad:2.2s"><ellipse class="s" cx="32" cy="22" rx="6" ry="5"/><ellipse class="c" cx="32" cy="27" rx="16" ry="5"/><path class="w" d="M28 20q4-5 8 0z"/>' +
      '<circle class="w x-blink" cx="22" cy="28" r="1.4"/><circle class="w x-blink" style="--d:0.3s" cx="32" cy="30" r="1.4"/><circle class="w x-blink" style="--d:0.6s" cx="42" cy="28" r="1.4"/></g>' +
      '<path class="m" d="M0 56l10-6 8 3 8-5 8 5 10-4 20 7v6H0z"/><g class="x-lift"><path class="lk" d="M14 56v-6M14 52l-3-2"/></g>' + gnd(58) });

  // ================= OKLAHOMA =================
  B.state('OK', 'signature', { id: 'storm-wheat', label: 'Storm over the wheat', colour: 'slate', mood: 'energetic', tags: ['storm', 'wheat'], intensity: 'playful',
    svg: () => '<g class="x-bob" style="--ad:4s"><path class="m" d="M4 22q0-8 8-8 2-6 10-5 6-3 12 2 8-2 12 4 8 0 8 7z"/><path class="k" d="M10 22q8 4 20 2t24 0" opacity="0.5"/></g>' +
      '<g class="x-flicker"><path class="c" d="M34 24l-5 11 5-1-3 9 9-14-5 1 4-6z"/></g>' +
      [[14, 26], [24, 30], [46, 28], [54, 32], [8, 34]].map(([x, y], i) => `<path class="lc x-fall" style="--d:${(i * 0.45).toFixed(2)}s" d="M${x} ${y}l-1 4"/>`).join('') +
      '<g class="x-tree o-b">' + [6, 14, 22, 30, 38, 46, 54].map(x => `<path class="lc" d="M${x} 62V50"/><path class="c" d="M${x} 50l-2-4M${x} 52l2-4"/>`).join('') + '</g>' + gnd(62) });
  B.state('OK', 'element', { id: 'pumpjack', label: 'Oil pumpjack', colour: 'amber', mood: 'focused', tags: ['oil', 'industry'],
    svg: () => '<path class="lk t" d="M28 56l4-22 4 22M26 56h12"/>' +
      '<g class="x-swing"><path class="lk t" d="M10 34h36"/><rect class="c" x="8" y="36" width="8" height="8"/><path class="c" d="M46 28q10 0 12 8l-6 1q-2-4-6-4z"/></g>' +
      '<path class="lk" d="M55 37v18M10 44l8 8"/><rect class="k" x="50" y="54" width="10" height="4"/><circle class="m" cx="20" cy="54" r="4"/>' +
      '<g class="x-drop"><path class="k" d="M55 58q-2 3 0 4 2-1 0-4z"/></g><path class="lm" d="M2 62h60"/>' +
      '<g class="x-spin"><path class="lk" d="M20 50v8M16 54h8"/></g>' + stars([[10, 10], [48, 10]]) });
  B.place('oklahoma-city', { id: 'skyline-wheel', label: 'Skyline and Ferris wheel', colour: 'orange', mood: 'cheerful', tags: ['skyline', 'ferris wheel'],
    svg: () => sun(54, 12, 5) +
      '<rect class="c" x="26" y="16" width="9" height="42"/><path class="k" d="M28 16l2-8 2 8z"/><rect class="s" x="36" y="30" width="8" height="28"/><rect class="s" x="16" y="34" width="9" height="24"/>' +
      '<rect class="w x-blink" x="29" y="22" width="2.4" height="2.4"/><rect class="w x-blink" style="--d:0.5s" x="29" y="30" width="2.4" height="2.4"/><rect class="w x-blink" style="--d:0.9s" x="29" y="38" width="2.4" height="2.4"/><rect class="w x-blink" style="--d:0.2s" x="39" y="36" width="2.4" height="2.4"/>' +
      '<path class="lk" d="M52 58l4-18 4 18"/><g class="x-spin-slow"><circle class="lc" cx="56" cy="38" r="8"/><path class="lc" d="M56 30v16M48 38h16M50 32l12 12M62 32l-12 12"/>' +
      '<circle class="c" cx="56" cy="30" r="1.8"/><circle class="c" cx="56" cy="46" r="1.8"/><circle class="c" cx="48" cy="38" r="1.8"/><circle class="c" cx="64" cy="38" r="1.8"/></g>' + gnd(58, 2, 66) +
      '<path class="lm" d="M2 62q10-3 20 0t20 0" />' });

  // ================= UTAH =================
  B.state('UT', 'signature', { id: 'bryce-hoodoos', label: 'Bryce hoodoos at dawn', colour: 'orange', mood: 'calm', tags: ['hoodoos', 'sunrise'],
    svg: () => '<g class="x-rise" style="--ad:6s"><circle class="c" cx="14" cy="22" r="7"/></g>' + stars([[36, 8], [50, 14], [58, 6]]) +
      '<path class="s" d="M0 40l8-6 6 4 8-8 8 6 8-4 10 6 16-4v26H0z"/>' +
      '<path class="c" d="M6 60V42l3-8 3 8v18zM18 60V36l3-12 3 12v24zM32 60V40l2-6 2 6v20zM44 60V34l3-14 4 14v26zM56 60V44l2-6 2 6v16z"/>' +
      '<path class="lk" d="M9 38v14M21 32v18M47 28v18M34 40v12"/>' + gnd(60, 0, 64) + bird(36, 18, 0.4) });
  B.state('UT', 'element', { id: 'beehive', label: 'Beehive state', colour: 'amber', mood: 'cheerful', tags: ['beehive', 'bees'],
    svg: () => '<path class="c" d="M16 54q-2-14 4-20 2-12 12-14 10 2 12 14 6 6 4 20z"/>' +
      '<path class="lk" d="M18 46h28M20 38h24M24 30h16"/><path class="k" d="M28 54q0-8 4-8t4 8z"/>' +
      [[8, 24, 0], [50, 18, 0.6], [54, 36, 1.2]].map(([x, y, d]) => `<g class="x-bob" style="--d:${d}s"><ellipse class="k" cx="${x}" cy="${y}" rx="3.4" ry="2.2"/><path class="c" d="M${x - 1} ${y - 2}v4M${x + 1.4} ${y - 2}v4"/><ellipse class="w x-flap" cx="${x}" cy="${y - 3}" rx="2.4" ry="1.4"/></g>`).join('') +
      '<path class="lc" d="M8 60h48"/><circle class="c" cx="10" cy="57" r="1.6"/><circle class="c" cx="54" cy="57" r="1.6"/>' });
  B.place('salt-lake-city', { id: 'temple-wasatch', label: 'Temple and Wasatch', colour: 'violet', mood: 'proud', tags: ['temple', 'mountains'],
    svg: () => stars([[8, 6], [22, 10], [44, 6], [56, 12]]) + moon(54, 22, 4) +
      '<path class="m" d="M0 40l10-18 6 8 8-14 10 16 8-10 10 14 12-8v22H0z"/><path class="w" d="M10 22l-4 7 4-1 3 2zM24 16l-4 7 4-1 3 2z"/>' +
      '<path class="c" d="M12 58V38l3-8 3 8v20zM46 58V38l3-8 3 8v20zM22 58V34l3-10 3 10v20zM36 58V34l3-10 3 10v20z"/>' +
      '<rect class="s" x="26" y="26" width="10" height="32"/><path class="c" d="M27 26l4-16 4 16z"/>' +
      '<g class="x-glow"><circle class="w" cx="31" cy="9" r="2.4"/></g><path class="lk" d="M31 12V7"/>' +
      '<rect class="w" x="29" y="44" width="4" height="8"/><rect class="w x-blink" x="15" y="42" width="2" height="3"/><rect class="w x-blink" style="--d:0.6s" x="49" y="42" width="2" height="3"/>' + gnd(58) });
  B.place('moab', { id: 'delicate-arch', label: 'Delicate Arch', colour: 'red', mood: 'proud', tags: ['arch', 'desert'],
    svg: () => sun(50, 14, 5) + cloud(4, 16, 0) +
      '<path class="w" d="M0 34l10-8 6 4 8-6 6 6-4 4H0z" opacity="0.9"/><path class="m" d="M0 40l14-6 10 4 12-6 12 6 16-2v12H0z" opacity="0.5"/>' +
      '<path class="c" d="M12 58V44q0-6 4-6l2-10q4-8 14-8 12 0 14 10l2 8q4 0 4 6v14H48V42q0-14-12-14T24 42v16z"/>' +
      '<path class="lk" d="M18 46l6 2M46 44l5 2M32 20l3 2"/>' +
      '<path class="s" d="M4 58h56v4H4z"/><g class="x-runbob"><path class="k" d="M54 58v-5l2-2 2 2v5z"/></g>' + gnd(58, 2, 62) });
  B.place('park-city', { id: 'ski-run', label: 'Ski run', colour: 'blue', mood: 'energetic', tags: ['ski', 'winter', 'snow'], season: ['winter'], intensity: 'playful',
    svg: () => '<path class="m" d="M0 30l12-14 8 8 12-14 14 18 8-6 10 10v28H0z" opacity="0.6"/><path class="w" d="M12 16l-3 5 3-1 2 2zM32 10l-3 6 3-1 3 2z"/>' +
      '<path class="w lm" d="M0 40q20 2 36 12t28 12H0z"/>' +
      '<g class="x-bounce"><g transform="rotate(25 30 40)"><circle class="k" cx="31" cy="32" r="2.6"/><path class="c" d="M29 35l-3 8 8 1 2-6z"/><path class="lk" d="M24 46l12-2M26 38l-6 3M35 39l5 4"/></g></g>' +
      [[8, 12], [20, 20], [44, 8], [54, 22], [62, 14], [38, 22]].map(([x, y], i) => `<g class="x-fall" style="--d:${(i * 0.5).toFixed(1)}s"><circle class="w" cx="${x}" cy="${y}" r="1.4"/></g>`).join('') });

  // ================= WYOMING =================
  B.state('WY', 'signature', { id: 'old-faithful', label: 'Old Faithful eruption', colour: 'teal', mood: 'proud', tags: ['geyser', 'steam'], intensity: 'standard',
    svg: () => sun(10, 12, 4.5) + cloud(40, 12, 0.3) +
      '<path class="m" d="M0 44l12-6 12 4 12-2 14 4 14-2v22H0z" opacity="0.6"/>' +
      '<g class="x-rise" style="--ad:3.2s"><path class="w lk" d="M30 46l1-26h2l1 26z"/></g>' +
      '<g class="x-pulse" style="--ad:2.4s"><circle class="w lk" cx="32" cy="14" r="5.5"/><circle class="w lk" cx="24" cy="19" r="4"/><circle class="w lk" cx="40" cy="19" r="4"/></g>' +
      '<g class="x-fall" style="--d:0.3s"><circle class="c" cx="22" cy="26" r="1.3"/></g><g class="x-fall" style="--d:1.1s"><circle class="c" cx="42" cy="26" r="1.3"/></g>' +
      '<g class="x-steam"><path class="lm" d="M22 30q-2 3 0 6M42 28q2 3 0 6"/></g>' +
      '<path class="s" d="M2 52q10-10 30-8t30 8v12H2z"/><path class="lk" d="M6 56h52M12 52v8M52 52v8"/>' + pine(6, 52, 10) + pine(58, 52, 9) });
  B.state('WY', 'element', { id: 'bison', label: 'Bison on the range', colour: 'amber', mood: 'calm', tags: ['bison', 'animal'],
    svg: () => '<path class="m" d="M0 40l12-6 14 4 14-4 24 6v6H0z" opacity="0.5"/>' +
      '<g class="x-bob" style="--ad:3.6s"><path class="c" d="M14 30q4-10 16-8 8-2 14 4 6 2 6 12v8H14z"/><path class="k" d="M14 30q-6 2-8 10l4 6h10v-8z"/>' +
      '<path class="lk" d="M8 36l-2-5M12 34l-2-5"/><circle class="w" cx="10" cy="40" r="1"/><path class="lk" d="M16 54v-8M24 54v-8M42 54v-8M50 54v-8"/></g>' +
      '<g class="x-swing o-t"><path class="lk" d="M50 34q6 2 6 12"/></g><g class="x-steam"><path class="lm" d="M4 38q-3-1-3-4"/></g>' +
      gnd(55) + '<path class="lc" d="M6 59h8M30 59h10M50 59h8"/>' });
  B.place('jackson-wy', { id: 'antler-arch', label: 'Antler arch and Tetons', colour: 'slate', mood: 'proud', tags: ['antlers', 'tetons'],
    svg: () => moon(50, 12, 4) + stars([[10, 8], [24, 14], [38, 6]]) +
      '<path class="m" d="M0 40l8-6 4 4 8-22 6 16 4-8 8 20 6-10 6 6 14-4v26H0z"/><path class="w" d="M20 16l-4 10 3-1 2 2 3-2zM36 24l-3 6 3-1 2 2z"/>' +
      '<path class="lk t" d="M6 60V44q0-12 10-14M58 60V44q0-12-10-14M16 30q16-8 32 0"/>' +
      '<path class="lk" d="M10 44l-6-4M10 52l-6-2M54 44l6-4M54 52l6-2M22 29l-1-9M32 27v-10M42 29l1-9"/>' +
      '<g class="x-glow"><circle class="c" cx="32" cy="40" r="3"/></g>' + gnd(60, 2, 62) });
  B.place('cody', { id: 'bronc-rider', label: 'Rodeo bronc rider', colour: 'orange', mood: 'energetic', tags: ['rodeo', 'horse'], intensity: 'playful',
    svg: () => '<g class="x-wobble"><path class="c" d="M12 38q4-8 16-6l12-4q6-2 8 4l4 8-6 2-4-6-6 4v10h-4l-2-8-8 2-2 8h-4l2-10z"/>' +
      '<path class="k" d="M44 24q6-2 10 2l2 6-6 2z"/><path class="lk" d="M10 36l-4 6M46 24l-2-4"/>' +
      '<circle class="k" cx="28" cy="22" r="2.6"/><path class="c" d="M24 19h8l-1-3h-6z"/><path class="lk" d="M28 24v6M28 26l6-2"/></g>' +
      '<g class="x-pop"><circle class="s" cx="12" cy="54" r="3"/></g><g class="x-pop" style="--d:0.6s"><circle class="s" cx="20" cy="56" r="2"/></g><g class="x-pop" style="--d:1.2s"><circle class="s" cx="50" cy="55" r="2.6"/></g>' + gnd(58) });

  animRegisterPack(B.pack({ id: 'us-mountain', name: 'US Mountain West and Southwest', description: 'Arizona, Colorado, Idaho, Montana, Nevada, New Mexico, Oklahoma, Utah and Wyoming: each state and its best-known cities and towns, animated.' }));
})();
