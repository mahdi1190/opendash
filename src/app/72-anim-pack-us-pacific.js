/* ============================================================
   ANIMATION PACK "us-pacific": Alaska, California, Hawaii, Oregon, Washington.
   PURE classic script (no DOM, no fetches). Two items per state (a signature opening and an
   element symbol) and one item per art place (big city = opening, small town = symbol),
   all built with usBuilder (71-anim-us.js). Gate: tests/anim-packs.test.mjs.
   ============================================================ */
(function () {
  const B = usBuilder('pacific');
  const tw = (x, y, d) => `<path class="c x-twinkle" style="--d:${d || 0}s" d="M${x} ${y - 3}l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>`;
  const sunC = (x, y, r, cls) => `<circle class="${cls || 's'} x-pulse" cx="${x}" cy="${y}" r="${r}"/>`;
  const ground = '<path class="lm" d="M4 58h56"/>';
  const wv = (y, d, cls) => `<path class="${cls || 'lc'} x-wave" style="--d:${d || 0}s" d="M-2 ${y}${'q3-2 6 0t6 0'.repeat(12)}"/>`;
  const gull = (x, y, d) => `<path class="lk x-flap" style="--d:${d || 0}s" d="M${x} ${y}q2-3 4 0 2-3 4 0"/>`;
  const pine = (x, y, h, cls) => `<path class="${cls || 'c'}" d="M${x} ${y - h}l${h * 0.28} ${h * 0.5}h-${h * 0.16}l${h * 0.22} ${h * 0.5}h-${h * 1.0}l${h * 0.22}-${h * 0.5}h-${h * 0.16}z"/>`;
  const swayPine = (x, y, h, d) => `<g class="x-tree" style="--d:${d || 0}s">${pine(x, y, h)}</g>`;
  const cloud = (x, y, d, cls) => `<g class="x-float2" style="--d:${d || 0}s"><path class="${cls || 'w'}" d="M${x} ${y}q0-4 4-4 1-4 5-3 4 0 4 4 4 0 4 3z"/></g>`;
  const fm = (n) => Math.round(n * 10) / 10;
  const palm = (x, y, h, d) => `<path class="lm" d="M${x} ${y}q2-${h / 2} -1-${h}"/><g class="x-swing" style="--d:${d || 0}s"><path class="c" d="M${x - 1} ${y - h}q-7-1-10 4 6-2 10-1zM${x - 1} ${y - h}q-3-6-9-5 5 1 9 5zM${x - 1} ${y - h}q3-6 9-4-5 1-9 4zM${x - 1} ${y - h}q7-1 10 5-6-3-10-2z"/></g>`;

  /* ---------------- ALASKA ---------------- */
  B.state('AK', 'signature', { id: 'midnight-sun', label: 'Midnight sun over Denali', colour: 'orange', mood: 'calm', tags: ['mountain', 'sun'],
    svg: () => sunC(45, 36, 7, 'c') + '<path class="c x-pulse" style="--d:0.5s" opacity=".35" d="M31 38h28v3H31z"/>'
      + '<path class="s" d="M2 50l16-24 7 9 10-22 8 14 6-7 13 30z"/><path class="w" d="M28 20l7-12 7 12-4-3-3 4-3-4z"/><path class="w" d="M18 26l-4 5 3-1 2 3 2-3z"/>'
      + '<path class="m" d="M2 52q16-6 28-2t32-2v14H2z"/>' + swayPine(8, 58, 14, 0.1) + swayPine(15, 58, 10, 0.6) + swayPine(52, 58, 12, 1.1) + swayPine(58, 58, 9, 0.3)
      + gull(18, 12, 0) + gull(24, 17, 0.8) + tw(8, 8, 0.4) + wv(60, 0, 'lw') });
  B.state('AK', 'element', { id: 'totem', label: 'Totem pole', colour: 'red', mood: 'proud', tags: ['culture', 'craft', 'totem'],
    svg: () => '<rect class="c lk" x="23" y="8" width="18" height="50" rx="3"/>'
      + '<path class="w lk" d="M23 18h18M23 30h18M23 44h18"/>'
      + '<g class="x-flap" style="--ad:3s"><path class="m lk" d="M23 24q-12-4-18-12 8 0 18 4zM41 24q12-4 18-12-8 0-18 4z"/></g>'
      + '<circle class="w" cx="28" cy="14" r="2.6"/><circle class="w" cx="36" cy="14" r="2.6"/><circle class="k x-blink" cx="28" cy="14" r="1.2"/><circle class="k x-blink" cx="36" cy="14" r="1.2"/>'
      + '<path class="k" d="M30 17l2 3 2-3z"/>'
      + '<path class="s" d="M26 33h12v7H26z"/><path class="k x-blink" d="M28 36h2M34 36h2"/><path class="w" d="M27 49h10v4H27z"/>'
      + '<path class="lk" d="M28 52v3M32 52v3M36 52v3"/>' + ground + tw(52, 40, 0.3) + tw(10, 36, 1) });

  B.place('anchorage', { id: 'aurora-moose', label: 'Aurora and moose', colour: 'green', mood: 'dreamy', tags: ['aurora', 'moose'],
    svg: () => '<g class="x-glow"><path class="c" opacity=".55" d="M0 8q16 14 32 4t32 6v10q-16-8-32 2T0 26z"/></g>'
      + '<g class="x-glow" style="--d:1.2s"><path class="s" d="M0 22q16 10 32 2t32 4v6q-16-6-32 2T0 34z"/></g>'
      + tw(8, 6, 0) + tw(52, 5, 0.6) + tw(36, 8, 1.2) + tw(58, 18, 0.3)
      + '<path class="m" d="M0 46q14-8 26-2t38-4v24H0z"/>'
      + '<g class="x-bob"><path class="k" d="M18 40h20l3 5-1 11h-3l-1-9h-12l-1 9h-3l-1-11z"/><path class="k" d="M38 40l4-5 6 2 1 5-4 3z"/>'
      + '<path class="lk" d="M41 35l-2-6 3 2 2-5 2 5 3-2-2 7M47 36l4-2"/></g>'
      + swayPine(8, 58, 16, 0.2) + swayPine(56, 58, 14, 0.8) });

  B.place('juneau', { id: 'tram-glacier', label: 'Tramway above the glacier', colour: 'teal', mood: 'calm', tags: ['glacier', 'tramway'],
    svg: () => '<path class="s" d="M0 40l14-22 10 12 12-20 14 24 14-6v36H0z"/><path class="w" d="M10 24l4-6 5 7zM32 18l4-6 6 10-5-3z"/>'
      + '<path class="w lc" d="M18 58q-2-16 8-20t18-10 10 12v18z"/><path class="w" d="M30 50l6-4M42 42l6-5"/>'
      + '<path class="lk" d="M2 8l60 14"/><g class="x-swing"><path class="lk" d="M26 14v4"/><rect class="c lk" x="22" y="18" width="9" height="7" rx="1.6"/><path class="w" d="M24 20h5"/></g>'
      + tw(44, 36, 0.4) + tw(18, 48, 1.1) + wv(60, 0.3, 'lc') });

  B.place('fairbanks', { id: 'dog-sled', label: 'Dog sled under the aurora', colour: 'indigo', mood: 'energetic', tags: ['dogsled', 'aurora', 'snow'],
    svg: () => '<g class="x-pulse"><path class="c" opacity=".5" d="M10 6h5l-3 24h-5zM24 4h5l-2 26h-5zM40 5h5l-3 25h-5zM54 8h4l-3 22h-4z"/></g>'
      + tw(4, 4, 0.1) + tw(34, 12, 0.7) + tw(60, 30, 1.3)
      + '<path class="w" d="M0 46q16-4 30-1t34-2v21H0z"/>'
      + '<g class="x-runbob"><path class="lk" d="M30 44h8M34 44q-6 4-14 4"/><path class="k" d="M6 44q4-4 8-1l4-4 2 5h6l-2 5H8z"/><path class="k" d="M20 41l3-3 1 5z"/></g>'
      + '<g class="x-bounce" style="--ad:1.4s"><path class="lk" d="M42 50q-2 6 4 6h14"/><path class="c lk" d="M44 44l14 1-2 8H44z"/><path class="k" d="M50 38q1 4 3 6z"/><circle class="k" cx="50" cy="37" r="2.4"/></g>'
      + '<path class="lm dash x-wave" d="M0 59h66"/>' + '<circle class="w x-fall" cx="12" cy="10" r="1"/><circle class="w x-fall" style="--d:0.8s" cx="30" cy="4" r="1"/><circle class="w x-fall" style="--d:1.6s" cx="52" cy="2" r="1"/>' });

  /* ---------------- CALIFORNIA ---------------- */
  B.state('CA', 'signature', { id: 'redwoods', label: 'Redwood forest', colour: 'green', mood: 'calm', tags: ['redwood', 'forest'],
    svg: () => '<path class="s x-pulse" d="M26 0h8l12 58H14z" opacity=".5"/><path class="s x-pulse" style="--d:1s" d="M44 0h5l5 58H40z" opacity=".4"/>'
      + '<rect class="c lk" x="8" y="6" width="9" height="52"/><rect class="m lk" x="30" y="2" width="11" height="56"/><rect class="c lk" x="50" y="10" width="8" height="48"/>'
      + '<path class="lm" d="M11 14v34M34 10v40M37 12v36M54 18v30"/>'
      + '<path class="c" d="M4 14q10-8 22 2 -8-1-12 2zM38 8q9-8 22 0-9 0-12 2z"/>'
      + '<g class="x-slidel"><path class="w" opacity=".7" d="M0 38h20q4-3 8 0h14q4-3 8 0h14v4H0z"/></g>'
      + '<path class="c" d="M2 58q4-8 8-3 4-8 8-2 6-8 10 2 4-6 8 0 4-8 8 1 5-6 8 2v5z"/>'
      + tw(24, 20, 0.2) + '<path class="c x-fall" style="--d:0.4s" d="M20 8l2 2-2 2-2-2z"/><path class="c x-fall" style="--d:1.7s" d="M46 4l2 2-2 2-2-2z"/>' });
  B.state('CA', 'element', { id: 'poppy', label: 'California poppy', colour: 'orange', mood: 'cheerful', tags: ['flower', 'poppy'],
    svg: () => '<path class="lc" d="M32 32q-4 14 0 26"/><path class="c" d="M32 50q-12-2-14-14 10 0 14 14z"/><path class="c" d="M33 44q10-2 12-12-8 0-12 12z"/>'
      + '<g class="x-swing"><path class="c lk" d="M32 28q-14-2-18-14 8-8 18 0 10-8 18 0-4 12-18 14z"/><path class="s" d="M32 24q-6-2-9-9M32 24q6-2 9-9M32 24v-12"/><circle class="w x-pulse" cx="32" cy="20" r="3"/><circle class="c" cx="32" cy="20" r="1.4"/></g>'
      + '<g class="x-float" style="--d:0.4s"><ellipse class="s" cx="54" cy="24" rx="3.6" ry="2.4"/><path class="k" d="M52 24h4M53 22.2v3.6M55 22.2v3.6"/><ellipse class="w x-flap" cx="53" cy="20.4" rx="2" ry="1.4"/></g>'
      + ground + '<path class="c" d="M8 58q1-6 3-6l1 6zM50 58q-1-5-3-6l-1 6z"/>' + tw(8, 12, 0.6) });

  B.place('los-angeles', { id: 'palms-searchlights', label: 'Palms and searchlights', colour: 'pink', mood: 'proud', tags: ['palm', 'sunset', 'hollywood'],
    svg: () => sunC(32, 36, 11, 'c') + '<g class="x-swing" style="--ad:4s"><path class="w" opacity=".7" d="M10 58l-6-40 3-1 7 41z"/></g><g class="x-swing" style="--ad:3.4s;--d:0.6s"><path class="w" opacity=".7" d="M54 58l6-40-3-1-7 41z"/></g>'
      + '<path class="m" d="M2 52q14-8 26-3t34-5v14H2z"/>'
      + '<path class="k" d="M20 52h5v6h-5zM27 48h4v10h-4zM46 46h6v12h-6zM54 50h4v8h-4z"/><path class="w x-twinkle" d="M29 51h1M48 49h1M50 53h1M56 53h1"/>'
      + palm(12, 58, 30, 0) + palm(40, 58, 36, 0.8) + palm(58, 58, 22, 1.4) + tw(8, 8, 0.2) + tw(52, 10, 0.9) });

  B.place('san-francisco', { id: 'bridge-fog', label: 'Suspension bridge in fog', colour: 'red', mood: 'dreamy', tags: ['bridge', 'fog', 'cable-car'],
    svg: () => '<rect class="c lk" x="14" y="12" width="4" height="40"/><rect class="c lk" x="46" y="12" width="4" height="40"/>'
      + '<path class="lk" d="M14 14h4M46 14h4M14 24h4M46 24h4"/>'
      + '<path class="lc" d="M0 38Q16 14 16 14Q32 42 48 14 48 14 64 38"/><path class="lc" d="M16 26v14M22 30v10M28 36v4M36 36v4M42 30v10M48 26v14"/>'
      + '<path class="lk t" d="M0 42h64"/><path class="s" d="M0 46h64v12H0z"/>' + wv(54, 0, 'lw') + wv(58, 0.5, 'lc')
      + '<g class="x-slidel" style="--ad:5s"><path class="w" opacity=".85" d="M-4 24h24q4-4 10 0h14q4-3 10 0h20v6H-4z"/></g>'
      + '<g class="x-float2" style="--d:0.8s"><path class="w" opacity=".9" d="M4 8q0-5 6-4 3-4 8 0 6-1 6 4z"/></g>'
      + '<g class="x-bob"><path class="c lk" d="M24 40h12v-4H24z"/><path class="w" d="M26 37h3v2h-3zM31 37h3v2h-3z"/></g>'
      + '<path class="x-blink c" d="M16 10h2v2h-2zM46 10h2v2h-2z"/>' });

  B.place('san-diego', { id: 'sailboats-sea-lion', label: 'Sailboats and a sea lion', colour: 'blue', mood: 'cheerful', tags: ['sailboat', 'sea-lion', 'harbor'],
    svg: () => sunC(50, 14, 6, 'c') + '<path class="m" d="M0 34h64v3H0z"/><path class="lm" d="M0 34q14-4 30 0t34-2"/>'
      + '<g class="x-bob"><path class="w lk" d="M12 12l10 20H10z"/><path class="c" d="M24 16l8 16H24z"/><path class="lk" d="M10 34h26l-3 5H13z"/></g>'
      + '<g class="x-bob" style="--d:1.1s"><path class="c lk" d="M42 24l8 10H42z"/><path class="lk" d="M40 36h14l-2 4H42z"/></g>'
      + '<path class="s" d="M0 44h64v14H0z"/>' + wv(44, 0, 'lw') + wv(50, 0.7, 'lc')
      + '<path class="m lk" d="M4 58q2-8 10-8t10 8z"/>'
      + '<g class="x-bob" style="--ad:2s"><path class="k" d="M12 50q-2-6 2-9 4-2 6 2 0 3-2 5z"/><circle class="w" cx="14" cy="43" r=".9"/><path class="lk" d="M20 44l4-2M21 46h4"/></g>' });

  B.place('santa-cruz', { id: 'boardwalk-coaster', label: 'Boardwalk roller coaster', colour: 'pink', mood: 'energetic', intensity: 'playful', tags: ['coaster', 'boardwalk'],
    svg: () => sunC(10, 10, 5, 's') + '<path class="lk" d="M4 56q4-26 12-26t12 24q4-30 14-30t14 30q2-8 4-8"/><path class="lm" d="M10 42v14M16 32v24M22 40v16M34 38v18M44 28v28M52 48v8"/>'
      + '<g class="x-bounce" style="--ad:1.2s"><rect class="c lk" x="12" y="24" width="10" height="5" rx="1.5"/><circle class="w" cx="15" cy="27.6" r="1.2"/></g>'
      + '<g class="x-spin-slow" style="--ad:8s"><circle class="lc" cx="54" cy="20" r="8"/><path class="lc" d="M54 12v16M46 20h16M48 14l12 12M60 14L48 26"/></g>'
      + '<path class="lm" d="M54 28v10M50 40l4-12 4 12"/>' + '<path class="m" d="M2 58h60"/>' + wv(61, 0, 'lc') + tw(30, 12, 0.5) });

  B.place('palm-springs', { id: 'windmills-palms', label: 'Windmills and palms', colour: 'amber', mood: 'calm', tags: ['windmill', 'palm', 'desert'],
    svg: () => sunC(48, 12, 7, 'c') + '<path class="s" d="M0 44l12-12 10 8 12-14 12 12 18-10v34H0z"/>'
      + '<path class="lm" d="M12 58l4-30zM36 58l3-34zM54 58l3-26z"/>'
      + [[16, 26, 0, 5], [39, 22, 0.4, 4], [57, 30, 0.9, 6]].map(([x, y, d, s]) => `<g class="x-spin" style="--ad:${s}s;--d:${d}s"><path class="w lk" d="M${x} ${y}l-1-9h2zM${x} ${y}l8 4-1 1zM${x} ${y}l-7 5 0 -1z"/></g>`).join('')
      + palm(26, 58, 16, 0.3) + '<path class="m" d="M0 56q20-4 34 0t30-1v8H0z"/>' + tw(6, 10, 0.4) });

  B.place('santa-barbara', { id: 'mission-bells', label: 'Mission bell tower', colour: 'red', mood: 'proud', tags: ['mission', 'bells'],
    svg: () => sunC(52, 10, 5, 'c') + '<rect class="w lk" x="8" y="26" width="48" height="32"/><rect class="w lk" x="8" y="14" width="12" height="14"/><rect class="w lk" x="44" y="14" width="12" height="14"/>'
      + '<path class="c lk" d="M6 14l8-8 8 8zM42 14l8-8 8 8z"/><path class="c" d="M8 26h48v4H8z"/>'
      + '<path class="k" d="M11 24v-6a3 3 0 0 1 6 0v6zM47 24v-6a3 3 0 0 1 6 0v6z"/>'
      + '<g class="x-swing" style="--ad:1.6s"><path class="c" d="M12 22q0-3 2-3t2 3z"/></g><g class="x-swing" style="--ad:1.6s;--d:0.5s"><path class="c" d="M48 22q0-3 2-3t2 3z"/></g>'
      + '<path class="k" d="M16 58v-12a4 4 0 0 1 8 0v12zM28 58v-12a4 4 0 0 1 8 0v12zM40 58v-12a4 4 0 0 1 8 0v12z"/>'
      + '<path class="lm" d="M32 12v-6M30 8h4"/>' + '<path class="m" d="M0 58h64v6H0z"/>' + palm(4, 58, 14, 0.4) + tw(30, 20, 0.7) });

  B.place('south-lake-tahoe', { id: 'paddle-steamer', label: 'Paddle steamer on the lake', colour: 'teal', mood: 'calm', tags: ['lake', 'paddle', 'pines'],
    svg: () => '<path class="s" d="M0 30l12-16 8 8 12-14 14 18 6-6 12 10v20H0z"/><path class="w" d="M26 14l4 6-3-1-1 2-2-3z"/>'
      + '<path class="m" d="M0 34h64v26H0z" opacity=".4"/>' + swayPine(6, 38, 16, 0.2) + swayPine(58, 38, 18, 0.7) + swayPine(52, 38, 11, 1.1)
      + '<g class="x-bob"><path class="c lk" d="M14 46h34l-4 7H18z"/><rect class="w lk" x="22" y="38" width="16" height="8"/><rect class="m lk" x="28" y="30" width="4" height="8"/>'
      + '<g class="x-spin" style="--ad:2s"><circle class="lw" cx="46" cy="49" r="5"/><path class="lw" d="M46 44v10M41 49h10"/></g></g>'
      + '<circle class="w x-steam" cx="30" cy="26" r="3"/><circle class="w x-steam" style="--d:0.8s" cx="34" cy="21" r="2.4"/>'
      + wv(56, 0, 'lc') + wv(60, 0.6, 'lw') });

  /* ---------------- HAWAII ---------------- */
  B.state('HI', 'signature', { id: 'volcano-night', label: 'Volcano glowing at night', colour: 'red', mood: 'energetic', intensity: 'standard', tags: ['volcano', 'lava'],
    svg: () => '<circle class="w" cx="12" cy="12" r="5"/><circle class="m" cx="14" cy="11" r="4"/>' + tw(32, 6, 0.3) + tw(50, 10, 1) + tw(4, 28, 1.6)
      + '<g class="x-glow"><circle class="c" opacity=".35" cx="38" cy="22" r="14"/></g>'
      + '<path class="k" d="M6 56l22-30h20l14 30z"/><path class="c" d="M30 26h16l-3 4-3-2-4 3-3-3z"/>'
      + '<path class="c x-flicker" d="M38 30l-2 8 3 6-2 8h4l-1-8 4-6-2-8z"/>'
      + '<circle class="c x-rise" cx="36" cy="18" r="1.8"/><circle class="c x-rise" style="--d:0.6s" cx="42" cy="14" r="1.4"/><circle class="c x-fall" style="--d:0.2s" cx="46" cy="22" r="1.4"/><circle class="c x-fall" style="--d:1.4s" cx="32" cy="22" r="1.2"/>'
      + '<g class="x-float2"><path class="m" opacity=".8" d="M34 12q-2-5 3-6 4-2 7 1 5 0 4 5z"/></g>'
      + '<path class="s" d="M0 50h64v14H0z"/>' + wv(52, 0, 'lw') + wv(57, 0.6, 'lc') + wv(61, 1.1, 'lw') });
  B.state('HI', 'element', { id: 'sea-turtle', label: 'Green sea turtle', colour: 'green', mood: 'calm', tags: ['turtle', 'animal', 'honu'],
    svg: () => '<g class="x-bob" style="--ad:3.4s"><ellipse class="c lk" cx="30" cy="32" rx="16" ry="12"/><path class="s" d="M22 28l6-4 8 2 4 6-4 6-8 2-6-4z"/><path class="lk" d="M28 24v16M22 32h16M24 27l4 5-4 5M36 27l-4 5 4 5"/>'
      + '<path class="c lk" d="M44 30q6-4 10 0 0 4-4 5-4 0-6-5z"/><circle class="k x-blink" cx="51" cy="31" r="1.2"/>'
      + '<g class="x-flap" style="--ad:2.4s"><path class="c lk" d="M24 22q-6-10-14-10 2 8 10 14z"/></g>'
      + '<g class="x-flap" style="--ad:2.4s;--d:0.6s"><path class="c lk" d="M24 42q-6 10-14 10 2-8 10-14z"/></g>'
      + '<path class="c lk" d="M14 32l-6 2 6 2z"/></g>'
      + '<circle class="lw x-rise" cx="56" cy="22" r="2"/><circle class="lw x-rise" style="--d:1s" cx="58" cy="14" r="1.4"/><circle class="lw x-rise" style="--d:2s" cx="8" cy="46" r="1.6"/>'
      + wv(8, 0, 'lw') + wv(58, 0.3, 'lc') + tw(6, 20, 0.5) });

  B.place('honolulu', { id: 'diamond-head-surf', label: 'Diamond Head and a surfer', colour: 'blue', mood: 'cheerful', tags: ['diamond-head', 'surf'],
    svg: () => sunC(50, 12, 6, 'c') + '<path class="s" d="M0 40l4-6 10-4 14-12 10 8 12 8 14 6v16H0z"/><path class="m" d="M14 30l14-12M40 20l12 8"/>'
      + '<path class="m" d="M0 40h64v20H0z" opacity=".3"/>' + palm(8, 44, 18, 0.3)
      + wv(44, 0, 'lw') + wv(54, 0.7, 'lc')
      + '<g class="x-bob" style="--ad:2s"><path class="c" d="M26 44q8-14 18-6-4 2-5 6z"/><path class="lk" d="M24 46h22"/><circle class="k" cx="34" cy="30" r="2.4"/><path class="lk" d="M34 32v6l-3 5M34 36l4-2M34 36l-4 2"/></g>'
      + gull(40, 8, 0.3) + gull(16, 16, 1) });

  B.place('hilo', { id: 'rainbow-falls', label: 'Rainbow Falls', colour: 'violet', mood: 'dreamy', tags: ['waterfall', 'rainbow'],
    svg: () => '<g class="x-glow"><path class="lc" d="M6 40q26-40 52 0M12 40q20-30 40 0"/></g>'
      + '<path class="m lk" d="M0 10h22v34H0z"/><path class="m lk" d="M42 10h22v34H42z"/><path class="w" d="M22 10h20v34H22z"/>'
      + '<path class="lc x-stream" d="M27 10v34M32 10v34M37 10v34"/>'
      + '<circle class="c x-fall" cx="28" cy="16" r="1.4"/><circle class="c x-fall" style="--d:0.9s" cx="36" cy="20" r="1.2"/><circle class="c x-fall" style="--d:1.6s" cx="32" cy="14" r="1.2"/>'
      + '<ellipse class="w x-pulse" cx="32" cy="46" rx="11" ry="3"/><path class="s" d="M0 46h64v14H0z"/>' + wv(52, 0, 'lc') + wv(57, 0.5, 'lw')
      + '<path class="c" d="M2 10q2-8 8-6-2 2-1 6zM62 10q-2-8-8-6 2 2 1 6z"/>' + tw(14, 26, 0.4) + tw(52, 24, 1.1) });

  B.place('lahaina', { id: 'banyan-whale', label: 'Banyan and a whale tail', colour: 'teal', mood: 'cheerful', tags: ['banyan', 'whale'],
    svg: () => sunC(46, 18, 6, 'c') + '<path class="m" d="M0 34h64v26H0z" opacity=".4"/>'
      + '<path class="lm" d="M8 34v22M14 30v26M20 32v24M26 30v26M32 34v22"/>'
      + '<g class="x-tree"><path class="c lk" d="M2 24q2-14 16-14t14 12q0 8-8 8-4 4-12 2-8 2-10-8z"/><path class="s" d="M10 16q8-4 14 2"/></g>'
      + '<path class="lk" d="M4 56h30"/>' + wv(44, 0, 'lw') + wv(58, 0.4, 'lc')
      + '<g class="x-rise" style="--ad:4s"><path class="k" d="M46 52v-8q-6-2-8-8 4 2 8 4 4-2 8-4-2 6-8 8z"/></g>'
      + '<circle class="w x-fall" cx="40" cy="38" r="1.2"/><circle class="w x-fall" style="--d:0.7s" cx="52" cy="38" r="1.2"/>' + wv(52, 0.2, 'lc') });

  /* ---------------- OREGON ---------------- */
  B.state('OR', 'signature', { id: 'crater-lake', label: 'Crater Lake under the stars', colour: 'indigo', mood: 'dreamy', tags: ['lake', 'crater', 'stars'],
    svg: () => '<circle class="w" cx="50" cy="12" r="5"/><circle class="s" cx="52" cy="11" r="4"/>' + tw(8, 8, 0) + tw(22, 14, 0.6) + tw(34, 6, 1.2) + tw(60, 26, 0.9) + tw(12, 24, 1.5)
      + '<path class="m" d="M0 34l8-8 6 4 8-8 8 6h20l8-6 6 8 6-4 8 8v26H0z"/><path class="w" d="M16 22l-2 4h4zM44 24l-2 3h4z"/>'
      + '<path class="c" d="M4 40h56q-4 18-28 18T4 40z" opacity=".6"/>'
      + '<path class="k" d="M26 46l4-6 4 6z"/>' + wv(48, 0, 'lw') + wv(53, 0.8, 'lc')
      + '<path class="w x-twinkle" style="--d:0.4s" d="M44 44h4M20 52h4"/>'
      + '<g class="x-float2"><path class="s" opacity=".8" d="M20 16q0-3 3-3 2-3 5 0 3 0 3 3z"/></g>' });
  B.state('OR', 'element', { id: 'fir-rain', label: 'Douglas firs in the rain', colour: 'green', mood: 'cosy', tags: ['forest', 'rain', 'fir'],
    svg: () => '<g class="x-float2"><path class="m lk" d="M10 20q0-8 8-8 3-6 10-3 5-4 10 2 8-1 8 7 6 1 6 7H8q-2-3 2-5z"/></g>'
      + [[8, 14, 0], [22, 22, 0.5], [37, 12, 1], [50, 18, 1.5]].map(([x, y, d]) => `<path class="c x-fall" style="--d:${d}s" d="M${x} ${y}l-1 4 2 0z"/><path class="c x-fall" style="--d:${d + 0.7}s" d="M${x + 6} ${y + 2}l-1 4 2 0z"/>`).join('')
      + swayPine(14, 58, 30, 0.2) + swayPine(30, 58, 38, 0.8) + swayPine(48, 58, 32, 0.5) + swayPine(58, 58, 20, 1.2)
      + ground + '<path class="m" d="M2 58q6-5 12 0M40 58q4-4 8 0" />' });

  B.place('portland-or', { id: 'bridges-roses', label: 'Bridges and roses', colour: 'pink', mood: 'cosy', tags: ['bridge', 'rose', 'rain'],
    svg: () => '<path class="w" d="M0 0h64v22H0z" opacity=".2"/><g class="x-float2"><path class="m" d="M6 12q0-4 5-4 2-4 6 0 5 0 5 4z"/></g>'
      + '<rect class="c lk" x="8" y="18" width="5" height="26"/><rect class="c lk" x="36" y="18" width="5" height="26"/><path class="lk" d="M10 18v-4M38 18v-4"/>'
      + '<path class="lk t" d="M2 40h60"/><path class="lc" d="M10 22l-8 18M10 22l28 0M38 22l24 18M13 22l14 18M27 22l11 18"/>'
      + '<g class="x-slidel" style="--ad:2s"><rect class="w lk" x="42" y="35" width="11" height="4" rx="1"/></g>'
      + '<path class="s" d="M0 46h64v14H0z"/>' + wv(48, 0, 'lw') + wv(54, 0.8, 'lc')
      + '<g class="x-pulse"><circle class="c lk" cx="52" cy="50" r="6"/><path class="s" d="M52 44q-4 4 0 6t0-6zM47 50q4 4 6 0t-6 0z"/></g>'
      + '<path class="lm" d="M52 56q0 4-2 6"/>' + '<path class="c x-fall" d="M20 4v3"/><path class="c x-fall" style="--d:1s" d="M28 2v3"/>' });

  B.place('bend', { id: 'volcanoes-float', label: 'Cascade peaks and a river float', colour: 'blue', mood: 'cheerful', tags: ['volcano', 'river', 'float'],
    svg: () => sunC(8, 10, 5, 'c') + '<path class="s" d="M0 34l10-14 6 6 8-16 8 14 6-8 12 20 14-6v30H0z"/><path class="w" d="M20 14l4 6-4 2-3-2zM34 18l-2 4h5zM45 26l-3 4h6z"/>'
      + '<path class="m" d="M0 38q16-4 30 0t34-2v8H0z"/>' + swayPine(6, 40, 14, 0.2) + swayPine(58, 40, 12, 0.7)
      + '<path class="c" d="M0 44h64v16H0z" opacity=".6"/>' + wv(46, 0, 'lw') + wv(58, 0.7, 'lw')
      + '<g class="x-bob"><circle class="c lk" cx="28" cy="52" r="7"/><circle class="w" cx="28" cy="52" r="3"/><circle class="k" cx="28" cy="44" r="2.2"/><path class="lk" d="M28 46v3"/></g>'
      + wv(54, 0.3, 'lc') });

  B.place('astoria', { id: 'bridge-lighthouse', label: 'Long bridge and lighthouse', colour: 'amber', mood: 'calm', tags: ['bridge', 'lighthouse'],
    svg: () => '<g class="x-pulse"><path class="c" opacity=".35" d="M14 14L2 8v12zM14 14l18-6v12z"/></g>'
      + '<path class="w lk" d="M10 56l2-26h6l2 26z"/><path class="c" d="M11 38h8l-.4 5h-7.2zM10.4 48h9.2l-.4 5h-8.4z"/><rect class="k" x="10.5" y="22" width="9" height="8"/><path class="c lk" d="M9 22l6-7 6 7z"/>'
      + '<circle class="c x-blink" cx="15" cy="26" r="1.8"/>'
      + '<path class="lk t" d="M24 44h40"/><path class="lc" d="M30 44l8-16 8 16M46 44l8-12 8 12M44 44l4-4M50 44l4-4"/><path class="lk" d="M38 28v16M54 32v12"/>'
      + '<path class="s" d="M0 52h64v12H0z"/>' + wv(52, 0, 'lw') + wv(57, 0.7, 'lc')
      + '<g class="x-bob" style="--d:0.5s"><path class="k" d="M42 52h10l-2 4H44z"/></g>'
      + gull(34, 12, 0) + gull(48, 18, 0.9) + gull(56, 8, 0.4) });

  /* ---------------- WASHINGTON ---------------- */
  B.state('WA', 'signature', { id: 'rainier', label: 'Mount Rainier', colour: 'blue', mood: 'calm', tags: ['mountain', 'rainier'],
    svg: () => sunC(52, 12, 6, 'c') + '<path class="s" d="M0 44l10-10 8 6 6-8 40 18v10H0z"/>'
      + '<path class="m lk" d="M6 54L26 14h12l20 40z"/><path class="w" d="M26 14h12l5 9-5-3-4 4-4-4-4 3-4-3z"/><path class="w" d="M16 38l4-6M48 40l-4-6" />'
      + '<g class="x-slidel" style="--ad:5s"><path class="w" opacity=".9" d="M14 28h12q2-3 6 0h10v3H14z"/></g>'
      + cloud(2, 16, 0.3) + cloud(46, 28, 1)
      + swayPine(6, 58, 16, 0.2) + swayPine(12, 58, 12, 0.7) + swayPine(52, 58, 14, 1.1) + swayPine(58, 58, 18, 0.4)
      + '<path class="c" d="M0 56h64v8H0z" opacity=".6"/>' + wv(60, 0, 'lw') + gull(20, 8, 0.2) });
  B.state('WA', 'element', { id: 'orca-breach', label: 'Orca breaching', colour: 'slate', mood: 'energetic', intensity: 'standard', tags: ['orca', 'animal', 'whale'],
    svg: () => sunC(10, 10, 5, 'c') + '<path class="s" d="M0 46h64v18H0z"/>'
      + '<g class="x-bounce" style="--ad:2.4s"><path class="k" d="M14 44q4-22 22-24 10-1 14 6l-8 3q-4 8-10 8 4 4 0 8z"/><path class="w" d="M30 26q6 4 8 10-6-1-8-10z"/><circle class="w" cx="42" cy="24" r="2"/><path class="k" d="M42 14l-4 10 7-2z"/><path class="k" d="M14 44l-6-4 2 8z"/></g>'
      + '<circle class="w x-fall" cx="12" cy="36" r="1.4"/><circle class="w x-fall" style="--d:0.8s" cx="54" cy="30" r="1.4"/><circle class="w x-fall" style="--d:1.5s" cx="58" cy="36" r="1.2"/>'
      + wv(46, 0, 'lw') + wv(52, 0.6, 'lc') + wv(58, 1.1, 'lw') });

  B.place('seattle', { id: 'needle-ferry', label: 'Space Needle and a ferry', colour: 'indigo', mood: 'proud', tags: ['space-needle', 'ferry'],
    svg: () => sunC(10, 12, 5, 'c') + '<path class="s" d="M0 46l10-8 8 6 8-10 14 12 24-12v22H0z"/><path class="w" d="M26 34l2-4 2 4z"/>'
      + '<path class="lk" d="M40 46l5-16h2l5 16"/><path class="lk" d="M46 30v-16"/><path class="w lk" d="M38 30q8-6 16 0-8 4-16 0z"/><path class="c" d="M40 30q6-4 12 0z"/>'
      + '<path class="lk" d="M45 14l1-6 1 6"/><circle class="c x-blink" cx="46" cy="7" r="1.6"/>'
      + cloud(4, 22, 0.4)
      + '<path class="s" d="M0 48h64v16H0z"/>' + wv(50, 0, 'lw')
      + '<g class="x-bob"><path class="c lk" d="M8 52h26l-3 5H11z"/><rect class="w lk" x="14" y="46" width="14" height="6"/><path class="lk" d="M20 46v-3h4v3"/><path class="k x-twinkle" d="M16 49h2M21 49h2M25 49h2"/></g>'
      + wv(58, 0.7, 'lc') });

  B.place('leavenworth', { id: 'clock-tower', label: 'Bavarian clock tower', colour: 'red', mood: 'cosy', intensity: 'standard', tags: ['clock', 'bavarian', 'snow'],
    svg: () => '<path class="s" d="M0 40l10-14 8 8 12-18 14 20 8-6 12 10v20H0z"/><path class="w" d="M28 22l2 4h-5zM10 26l2 3h-5z"/>'
      + '<rect class="w lk" x="22" y="26" width="20" height="32"/><path class="c lk" d="M20 26l12-18 12 18z"/><path class="lk" d="M32 8v-4"/>'
      + '<circle class="w lk" cx="32" cy="36" r="6.4"/><g class="x-spin" style="--ad:6s"><path class="lk" d="M32 31v10"/></g><g class="x-spin" style="--ad:36s"><path class="lk" d="M29 36h6"/></g>'
      + '<path class="lm" d="M26 46h12M26 52h12M22 40l-4 0"/><path class="c" d="M28 56v-6h8v6z"/>'
      + '<path class="w lk" d="M2 58V46l6-6 6 6v12zM50 58V48l6-5 6 5v10z"/>'
      + '<circle class="w x-fall" cx="8" cy="6" r="1.2"/><circle class="w x-fall" style="--d:0.7s" cx="20" cy="2" r="1.2"/><circle class="w x-fall" style="--d:1.4s" cx="48" cy="4" r="1.2"/><circle class="w x-fall" style="--d:2s" cx="58" cy="2" r="1.2"/>' + ground });

  B.place('bellingham', { id: 'ferry-baker', label: 'Ferry below Mount Baker', colour: 'teal', mood: 'cheerful', tags: ['ferry', 'mountain', 'bay'],
    svg: () => '<path class="c" d="M0 0h64v20H0z" opacity=".18"/>' + sunC(10, 12, 5, 'c')
      + '<path class="s" d="M8 40L32 8l24 32z"/><path class="w" d="M32 8l9 12-5-2-4 4-4-4-5 2z"/><path class="m" d="M0 42l10-6 12 6 12-5 14 5 16-5v10H0z"/>'
      + swayPine(6, 44, 10, 0.1) + swayPine(58, 44, 12, 0.6)
      + '<path class="s" d="M0 44h64v20H0z" opacity=".8"/>' + wv(46, 0, 'lw') + wv(58, 0.8, 'lw')
      + '<g class="x-bob" style="--ad:3s"><path class="c lk" d="M14 52h32l-4 6H18z"/><rect class="w lk" x="20" y="45" width="20" height="7"/><path class="k x-twinkle" d="M23 48h2M28 48h2M33 48h2M37 48h1"/><path class="lk" d="M26 45v-3h6v3"/></g>'
      + '<path class="lc" opacity=".5" d="M46 56h14"/>' + gull(46, 22, 0) + gull(52, 28, 0.9) + wv(61, 0.4, 'lc') });
  animRegisterPack(B.pack({ id: 'us-pacific', name: 'US Pacific', description: 'Alaska, California, Hawaii, Oregon and Washington: landmarks and symbols for each state, plus a scene for its big and small cities.' }));
})();
