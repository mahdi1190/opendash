/* ============================================================
   ANIMATION PACK "us-southeast": Alabama, Arkansas, Florida, Georgia, Kentucky,
   Louisiana, Mississippi, North Carolina, South Carolina, Tennessee, Virginia,
   West Virginia, and the art towns and cities of those states. PURE classic
   script (no DOM, no fetches). The lookup and builder live in 71-anim-us.js.
   Each state has a signature opening and an element symbol; each big city an
   opening, each small town a symbol.
   ============================================================ */
(function () {
  const B = usBuilder('southeast');
  // ---- small local helpers (strings only) ----
  const tw = (x, y, d) => `<path class="c x-twinkle" style="--d:${d}s" d="M${x} ${y - 3}l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>`;
  const sun = (x, y, r) => `<circle class="s x-pulse" cx="${x}" cy="${y}" r="${r + 3}"/><circle class="c" cx="${x}" cy="${y}" r="${r}"/>`;
  const gnd = (y) => `<path class="lm" d="M2 ${y || 58}h60"/>`;
  const wv = (y, d, cls) => `<path class="${cls || 'lc'} x-wave" style="--d:${d || 0}s" d="M0 ${y}${'q3-2 6 0t6 0'.repeat(11)}"/>`;
  const cloud = (x, y, d) => `<g transform="translate(${x} ${y})"><path class="s x-bob" style="--d:${d || 0}s" d="M0 0h14a3.5 3.5 0 0 0-1-6.5 5 5 0 0 0-9.5-1A3.8 3.8 0 0 0 0 0z"/></g>`;
  const bird = (x, y, d) => `<g transform="translate(${x} ${y})"><path class="lk x-flap" style="--d:${d || 0}s" d="M0 0q2-3 4 0q2-3 4 0"/></g>`;
  const note = (x, y, d) => `<g transform="translate(${x} ${y})"><path class="c x-float" style="--d:${d}s" d="M0 0v-6l4-1v6a1.6 1.6 0 1 1-1-1.4v-3l-2 .5v5a1.6 1.6 0 1 1-1-1.4z"/></g>`;
  const win = (x, y, w, h, cls, d) => `<rect class="${cls || 'w'}${d != null ? ' x-blink' : ''}"${d != null ? ` style="--d:${d}s"` : ''} x="${x}" y="${y}" width="${w}" height="${h}"/>`;
  const moon = (x, y) => `<circle class="s x-pulse" cx="${x}" cy="${y}" r="8"/><circle class="w" cx="${x}" cy="${y}" r="5.5"/><circle class="s" cx="${x + 2.6}" cy="${y - 1.4}" r="4.4"/>`;
  const tree = (x, y, h, cls) => `<path class="${cls || 'c'}" d="M${x} ${y}l-${h * 0.35} ${h}h${h * 0.7}z"/>`;
  const palm = (x, y, h, d) => `<path class="lk" d="M${x} ${y}q2 -${h / 2} 1 -${h}"/><g transform="translate(${x + 1} ${y - h})"><path class="c x-wobble" style="--d:${d || 0}s" d="M0 0q-8-6-14 0q6-3 14 0q-4-8-4-12 6 4 4 12q4-8 12-8-6 3-8 8q8-2 12 4-8-3-12-1z"/></g>`;

  const horse = (x, y, k) => `<g transform="translate(${x} ${y})"><g class="x-bob"><ellipse class="${k || 'k'}" rx="8" ry="4.5"/><path class="${k || 'k'}" d="M5 -2l4-8 5 2-1 4-5 4z"/><path class="lk" d="M-5 3v8M-2 4v8M3 4v8M6 3v8"/><path class="lk" d="M-8 -2q-5 2-4 9"/></g></g>`;
  // ======================= ALABAMA =======================
  B.state('AL', 'signature', { id: 'selma-bridge-dawn', label: 'The bridge at dawn', colour: 'amber', mood: 'proud', tags: ['bridge', 'history'], svg: () =>
    sun(46, 30, 6) + cloud(6, 16, 0.4) + bird(22, 12, 0.2) +
    '<path class="lk t" d="M6 44q26-30 52 0"/>' +
    '<path class="lk" d="M14 38v6M20 34v10M26 32v12M32 31v13M38 32v12M44 34v10M50 38v6"/>' +
    '<path class="k" d="M2 44h60v3H2z"/>' +
    '<path class="m" d="M2 47h60v11H2z"/>' + wv(51, 0, 'lc') + wv(55, 0.4, 'lw') +
    '<circle class="k x-bob" cx="18" cy="41" r="1.4"/><circle class="k x-bob" style="--d:0.3s" cx="24" cy="41" r="1.4"/><circle class="k x-bob" style="--d:0.6s" cx="30" cy="41" r="1.4"/><circle class="k x-bob" style="--d:0.9s" cx="36" cy="41" r="1.4"/>' });
  B.state('AL', 'element', { id: 'yellowhammer', label: 'The yellowhammer', colour: 'amber', mood: 'cheerful', tags: ['bird', 'flicker'], svg: () =>
    '<path class="lm" d="M6 47h52"/><path class="lm" d="M44 47q6-6 14-5"/>' +
    '<path class="c" d="M45 42l7 1-6 3z"/>' +
    '<path class="k" d="M20 38L7 44l5-9z"/><ellipse class="c" cx="30" cy="37" rx="12" ry="8"/>' +
    '<path class="s lk" d="M22 36q8 8 16 0"/>' +
    '<g class="x-bob"><circle class="c" cx="42" cy="28" r="6.5"/><path class="k" d="M47 27l7 2-7 2z"/><circle class="w" cx="43.5" cy="26.5" r="1.6"/><circle class="k" cx="44" cy="26.5" r=".8"/><path class="k" d="M37 24l-2-4 5 2z"/></g>' +
    '<path class="lk" d="M28 45v3M33 45v3"/>' + note(48, 20, 0) + note(12, 24, 1.1) });
  B.place('huntsville', { id: 'rocket', label: 'Rocket on the pad', colour: 'blue', mood: 'energetic', intensity: 'standard', tags: ['space', 'rocket'], svg: () =>
    tw(10, 12, 0) + tw(52, 18, 0.7) + tw(18, 34, 1.3) + cloud(40, 14, 0.2) +
    '<path class="m" d="M3 60h58v-5H3z"/><path class="lm" d="M12 60V40h6M52 60V40h-6"/>' +
    '<g class="x-rise"><path class="w lk" d="M25 52V24q7-12 14 0v28z"/><path class="c" d="M25 24q7-12 14 0z"/><path class="k" d="M25 34h14v3H25zM25 42h14v3H25z"/><path class="c" d="M25 52l-5 5v-12l5 3zM39 52l5 5v-12l-5 3z"/><circle class="s lc" cx="32" cy="30" r="2.5"/></g>' +
    '<path class="c x-flicker o-t" d="M28 53h8l-4 9z"/><path class="s x-steam" d="M18 59q-4-3 0-5M46 59q4-3 0-5"/>' });
  // ======================= ARKANSAS =======================
  B.state('AR', 'signature', { id: 'ozark-mist', label: 'Mist in the Ozarks', colour: 'teal', mood: 'calm', tags: ['mountains', 'mist'], svg: () =>
    sun(20, 22, 6) + bird(38, 14, 0) + bird(48, 20, 0.8) +
    '<path class="s" d="M0 40q8-12 16-6t16-8 14 6 18-4v32H0z"/>' +
    '<path class="m" d="M0 48q10-10 20-4t18-6 26 6v14H0z"/>' +
    '<path class="c" d="M0 56q14-8 26-2t22-4 16 4v8H0z"/>' +
    '<path class="lw x-wave" style="--d:0s" d="M0 44h6M14 41h8M28 40h6M44 43h8"/>' +
    '<path class="w x-bob" style="--d:0.2s" d="M6 46h22a3 3 0 0 0 0-3H10a3 3 0 0 0-4 3z"/><path class="w x-bob" style="--d:1s" d="M34 51h22a3 3 0 0 0 0-3H38a3 3 0 0 0-4 3z"/>' +
    tree(10, 50, 8) + tree(54, 49, 9) });
  B.state('AR', 'element', { id: 'diamond', label: 'A Crater of Diamonds find', colour: 'blue', mood: 'cheerful', tags: ['gem', 'sparkle'], svg: () =>
    '<path class="m" d="M2 58h60v4H2z"/><path class="s" d="M2 58q8-6 18-3t20-3 22 4v2H2z"/>' +
    '<g class="x-bob"><path class="c lk" d="M32 20l12 4 7 8-19 22L13 32l7-8z"/><path class="w" d="M20 24l12 8 12-8-12-4z"/><path class="lk" d="M13 32h38M20 24l12 8M44 24l-12 8M32 32v22"/></g>' +
    '<path class="w x-twinkle" d="M10 14l1.5 3.5L15 19l-3.5 1.5L10 24l-1.5-3.5L5 19l3.5-1.5z"/><path class="c x-twinkle" style="--d:0.6s" d="M54 12l1.2 2.8L58 16l-2.8 1.2L54 20l-1.2-2.8L50 16l2.8-1.2z"/><path class="c x-twinkle" style="--d:1.2s" d="M54 40l1 2.2 2.2 1-2.2 1L54 46.4l-1-2.2-2.2-1 2.2-1z"/>' });
  B.place('hot-springs', { id: 'bathhouse', label: 'The steaming bathhouse', colour: 'orange', mood: 'cosy', tags: ['steam', 'bath'], svg: () =>
    '<path class="s" d="M0 30l10-10 10 10v28H0z"/><path class="m" d="M44 30l10-10 10 10v28H44z"/>' +
    '<path class="w lk" d="M12 58V34h40v24z"/><path class="c" d="M8 34l24-16 24 16z"/>' +
    '<path class="lk" d="M28 58V46q4-5 8 0v12"/><rect class="s" x="16" y="39" width="7" height="8"/><rect class="s" x="41" y="39" width="7" height="8"/><circle class="k" cx="32" cy="27" r="0.1"/>' +
    '<path class="c" d="M26 28h12v-3q-6-5-12 0z"/>' +
    '<path class="lw x-steam" d="M6 54q-3-4 0-8t0-8" /><path class="lc x-steam" style="--d:0.7s" d="M32 14q-4-3 0-7t0-5"/><path class="lc x-steam" style="--d:1.4s" d="M20 14q-3-3 0-6"/><path class="lc x-steam" style="--d:0.4s" d="M44 14q3-3 0-6"/>' +
    '<path class="lm" d="M4 58h56"/>' });
  // ======================= FLORIDA =======================
  B.state('FL', 'signature', { id: 'everglades-airboat', label: 'An airboat in the Everglades', colour: 'green', mood: 'energetic', tags: ['swamp', 'boat', 'sawgrass'], svg: () =>
    sun(14, 20, 6) + bird(32, 12, 0) + bird(44, 18, 0.5) +
    '<path class="lc" d="M2 38h60"/><path class="s" d="M2 38h60v22H2z"/>' +
    '<path class="lc" d="M6 38v-8M9 38v-5M12 38v-9M52 38v-7M55 38v-10M58 38v-6"/>' +
    wv(44, 0, 'lc') + wv(52, 0.4, 'lw') +
    '<path class="k" d="M20 46l4-6h20l4 6z"/><path class="c" d="M24 40l3-5h10l3 5z"/>' +
    '<path class="lk" d="M44 40v-16"/><g transform="translate(44 24)"><path class="k x-spin" style="--ad:0.3s" d="M-1 -9h2v18h-2z"/></g>' +
    '<path class="lw x-trail" d="M18 47h-10M16 51h-8"/>' });
  B.state('FL', 'element', { id: 'alligator', label: 'A watchful alligator', colour: 'green', mood: 'calm', tags: ['animal', 'gator'], svg: () =>
    '<path class="s" d="M0 34h64v30H0z"/>' +
    '<path class="c" d="M8 40q8-8 24-6 12-2 24 4-4 6-24 6-14 2-24-4z"/>' +
    '<path class="k" d="M12 38l2-3 2 3M20 36l2-3 2 3M28 35l2-3 2 3M36 35l2-3 2 3M44 36l2-3 2 3"/>' +
    '<path class="c" d="M50 36q6-1 10 2l-1 3q-6-1-9-1z"/>' +
    '<circle class="c" cx="14" cy="34" r="3.2"/><circle class="w x-blink" cx="14" cy="33.6" r="1.4"/><circle class="k" cx="14" cy="33.8" r=".7"/>' +
    '<circle class="c" cx="22" cy="34" r="3.2"/><circle class="w x-blink" cx="22" cy="33.6" r="1.4"/><circle class="k" cx="22" cy="33.8" r=".7"/>' +
    wv(46, 0, 'lc') + wv(52, 0.5, 'lw') +
    '<path class="lc x-pulse" d="M4 18q-2 8 2 12M60 14q2 8-2 12"/><circle class="c x-float" cx="40" cy="24" r="1.4"/><circle class="c x-float" style="--d:1s" cx="48" cy="22" r="1"/>' });
  B.place('key-west', { id: 'southernmost-buoy', label: 'The southernmost buoy at sunset', colour: 'orange', mood: 'calm', tags: ['sunset', 'buoy'], svg: () =>
    '<path class="s" d="M0 0h64v40H0z"/><circle class="c x-sunset" cx="32" cy="38" r="12"/><path class="s" d="M0 38h64v26H0z"/>' +
    '<path class="c x-pulse" d="M18 40h28v1.6H18z"/><path class="c" d="M22 44h20v1.2H22z"/>' +
    bird(10, 14, 0) + bird(50, 10, 0.7) + tw(54, 22, 0.3) +
    '<g class="x-bob"><path class="c" d="M26 54l2-14h8l2 14z"/><path class="w" d="M27 49h10l1 3H26z"/><path class="k" d="M30 40h4v-5h-4z"/><circle class="w x-flicker" cx="32" cy="33" r="2.2"/></g>' +
    wv(57, 0, 'lc') + wv(61, 0.6, 'lw') });
  B.place('miami', { id: 'deco-neon', label: 'Art deco neon by the sea', colour: 'pink', mood: 'energetic', intensity: 'standard', tags: ['deco', 'neon', 'palm'], svg: () =>
    '<circle class="c x-pulse" cx="50" cy="16" r="7"/>' + tw(8, 10, 0.2) + tw(26, 6, 0.9) +
    '<path class="w lk" d="M8 56V28h24v28z"/><path class="c" d="M6 28h28v-3H6z"/><path class="k" d="M12 25V17h2v8M18 25V13h2v12M24 25v-6h2v6"/>' +
    '<path class="lk" d="M8 34h24M8 40h24M8 46h24"/><rect class="c x-flicker" x="13" y="48" width="5" height="8"/><rect class="s" x="22" y="30" width="5" height="3"/>' +
    '<path class="lc x-flicker" style="--d:0.4s" d="M10 22h20"/><path class="c x-blink" style="--d:0.2s" d="M20 12l1 2.4L23.5 15l-2.5 1-1 2.5-1-2.5-2.5-1 2.5-.6z"/>' +
    palm(44, 58, 28, 0.2) + '<path class="lm" d="M2 58h60"/>' + wv(61, 0.2, 'lc') });
  B.place('orlando', { id: 'eola-fountain', label: 'Fountain and skyline at dusk', colour: 'violet', mood: 'dreamy', intensity: 'standard', tags: ['fountain', 'skyline', 'fireworks'], svg: () =>
    '<path class="s" d="M4 38V20h8v18M14 38V12h8v26M44 38V24h8v14M54 38V16h7v22"/>' + win(16, 16, 2, 2, 'c', 0.1) + win(18, 24, 2, 2, 'c', 0.6) + win(56, 20, 2, 2, 'c', 0.3) + win(46, 28, 2, 2, 'c', 1) +
    '<path class="c x-burst" d="M32 8l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/><path class="c x-burst" style="--d:1.2s" d="M48 10l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/>' +
    '<path class="m" d="M4 46h56v12H4z"/><path class="w lk" d="M24 52h16l-2-6H26z"/>' +
    '<path class="lc t x-drop" d="M32 46v-14"/><path class="lc x-drop" style="--d:0.5s" d="M28 46q0-12 4-14M36 46q0-12-4-14"/>' +
    '<path class="lc x-drop" style="--d:0.3s" d="M24 46q-4-8-8-8M40 46q4-8 8-8"/>' + wv(55, 0, 'lc') + wv(58.5, 0.5, 'lw') });
  B.place('tampa', { id: 'skyway-bridge', label: 'The Skyway bridge', colour: 'teal', mood: 'proud', tags: ['bridge', 'bay'], svg: () =>
    sun(50, 14, 5) + cloud(6, 14, 0.3) + bird(26, 10, 0.2) + bird(34, 14, 0.9) +
    '<path class="k" d="M2 46h60v2H2z"/><path class="c" d="M31 12v34M33 12v34"/>' +
    '<path class="lc" d="M32 14L8 45M32 14L18 45M32 14L26 45M32 14L38 45M32 14L46 45M32 14L56 45"/>' +
    '<path class="s" d="M0 49h64v15H0z"/>' + wv(53, 0, 'lc') + wv(58, 0.5, 'lw') +
    '<g class="x-bob"><path class="k" d="M10 52h22l-3 6H13z"/><path class="w" d="M16 47h8v5h-8z"/></g>' +
    '<path class="k x-pulse" d="M36 40h3v2h-3z"/>' });
  B.place('st-augustine', { id: 'castillo-cannon', label: 'The old fort and its cannon', colour: 'amber', mood: 'proud', tags: ['fort', 'cannon', 'history'], svg: () =>
    cloud(6, 14, 0.2) + sun(52, 14, 5) + bird(24, 10, 0.6) +
    '<path class="s lk" d="M6 54V32l6-6h40l6 6v22z"/><path class="m" d="M6 32h52l-6-6H12z"/>' +
    '<path class="w lk" d="M4 56L10 30h44l6 26z"/><path class="lk" d="M22 30l-2 4M42 30l2 4"/>' +
    '<path class="m" d="M28 56V42q4-6 8 0v14z"/><rect class="k" x="14" y="38" width="4" height="6"/><rect class="k" x="46" y="38" width="4" height="6"/>' +
    '<path class="k" d="M8 34h8v-3H8z"/><path class="c" d="M50 26v-8l9 2-9 2z"/><path class="lk" d="M50 26v-10"/>' +
    '<path class="w x-pop" d="M4 30q-4 0-3-4t4-2q-2-4 3-4t3 5q4-1 3 3t-4 2z"/>' +
    '<path class="lm" d="M2 58h60"/>' });
  // ======================= GEORGIA =======================
  B.state('GA', 'signature', { id: 'granite-dome', label: 'The granite dome and its skyride', colour: 'slate', mood: 'proud', tags: ['mountain', 'cable car'], svg: () =>
    sun(50, 14, 5) + cloud(8, 16, 0.2) + bird(28, 8, 0.4) +
    '<path class="s lk" d="M0 56q4-24 20-28 14-3 24 4 12 6 20 24z"/><path class="m" d="M10 56q6-16 18-18M40 40q8 4 14 16"/>' +
    '<path class="lk dash" d="M16 20L50 28"/>' +
    '<g class="x-bob"><path class="c lk" d="M28 22l8 1.6-.8 5-8-1.6z"/><path class="lk" d="M32 22.8l0-2"/></g>' +
    '<path class="c" d="M2 56h60v6H2z"/>' + tree(6, 52, 8) + tree(56, 52, 8, 's') });
  B.state('GA', 'element', { id: 'peach', label: 'A ripe Georgia peach', colour: 'orange', mood: 'cheerful', season: ['summer'], tags: ['fruit', 'peach'], svg: () =>
    '<path class="lm" d="M2 58h60"/><ellipse class="s" cx="32" cy="57" rx="14" ry="2.5"/>' +
    '<g class="x-bounce"><path class="c lk" d="M32 22q-18-6-18 14t18 20q18 0 18-20t-18-14z"/><path class="lw" d="M32 22q-4 14 0 32"/><path class="w" d="M20 32q-2 6 0 10" opacity=".6"/></g>' +
    '<path class="lk" d="M32 22q0-6 3-8"/><g transform="translate(34 15)"><path class="c x-swing o-l" d="M0 0q8-8 14-2-4 8-14 2z"/></g><g transform="translate(30 17)"><path class="s x-swing o-l" style="--d:0.4s" d="M0 0q-8-6-14-1 4 7 14 1z"/></g>' +
    '<path class="c x-twinkle" d="M54 20l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z"/>' });
  B.place('atlanta', { id: 'skyline-jets', label: 'Skyline and jets', colour: 'indigo', mood: 'energetic', intensity: 'standard', tags: ['skyline', 'airport'], svg: () =>
    tw(8, 8, 0) + tw(44, 6, 0.8) + '<circle class="s" cx="54" cy="12" r="3"/>' +
    '<path class="s" d="M2 58V34h9v24zM12 58V22h8v36zM36 58V26h8v32zM46 58V36h8v22zM54 58V30h8v28z"/>' +
    '<path class="w lk" d="M20 58V16h4l2-6 2 6h4v42zM26 10V4"/><path class="lk" d="M20 24h12M20 32h12M20 40h12"/>' +
    win(5, 38, 2, 2, 'c', 0.3) + win(15, 28, 2, 2, 'c', 0.9) + win(39, 31, 2, 2, 'c', 0.5) + win(49, 41, 2, 2, 'c', 1.2) + win(57, 36, 2, 2, 'c', 0.1) +
    '<g class="x-takeoff"><path class="k" d="M6 18l8-2 4-4 1 1-2 4 4 1-1 1-5-.5-4 3-2-.5 1-3z"/></g><path class="c x-contrail" d="M4 20h14"/>' +
    '<path class="lm" d="M2 58h60"/>' });
  B.place('savannah', { id: 'square-oak', label: 'The square, its oak and fountain', colour: 'green', mood: 'calm', tags: ['oak', 'moss', 'fountain'], svg: () =>
    '<path class="k" d="M29 50V34q-3-6-9-9M35 50V34q3-6 10-11M32 50V30"/>' +
    '<path class="c" d="M2 28q-2-12 12-12 6-8 18-4 8-4 16 2 12 0 14 12-8 6-16 4-4 4-14 2-6 4-16 0Q4 34 2 28z"/>' +
    '<path class="s lc x-wobble" d="M8 30q-2 8 0 14M16 32q-2 8 0 14M46 32q2 8 0 12M54 30q2 6 0 10"/><path class="lc x-wobble" style="--d:0.5s" d="M24 33q-1 6 0 10M40 33q1 8 0 10"/>' +
    '<path class="w lk" d="M22 58l2-5h16l2 5z"/><path class="w lk" d="M27 53l1-4h8l1 4z"/><path class="lk" d="M32 49v-5"/>' +
    '<path class="lc x-drop" d="M32 45q-5 0-7 7M32 45q5 0 7 7"/><path class="lc x-drop" style="--d:0.5s" d="M32 44v-4"/>' +
    '<path class="lm" d="M2 58h60"/>' });
  // ======================= KENTUCKY =======================
  B.state('KY', 'signature', { id: 'bluegrass-farm', label: 'Bluegrass horse farm at sunrise', colour: 'green', mood: 'calm', tags: ['horse', 'fence', 'farm'], svg: () =>
    sun(14, 30, 7) + cloud(32, 12, 0) + cloud(46, 22, 0.8) + bird(8, 14, 0.3) +
    '<path class="c" d="M0 40q12-8 26-4t38-3v31H0z"/><path class="s" d="M0 48q18-6 32-2t32-2v18H0z"/>' +
    '<path class="lk" d="M0 42h64M0 48h64"/><path class="lk" d="M6 38v14M20 36v14M34 37v14M48 36v14M60 35v14"/>' +
    horse(34, 46) + '<path class="c" d="M44 46q6 0 6 6"/>' });
  B.state('KY', 'element', { id: 'bourbon-barrel', label: 'A bourbon barrel and its drip', colour: 'orange', mood: 'cosy', tags: ['bourbon', 'barrel'], svg: () =>
    '<path class="lm" d="M4 58h56"/>' +
    '<g class="x-wobble"><path class="c lk" d="M16 54q-6-16 0-34h32q6 18 0 34z"/><path class="lk" d="M13 28h38M13 46h38"/><path class="s" d="M20 22q-3 14 0 30"/><circle class="k" cx="32" cy="37" r="2"/></g>' +
    '<path class="c x-drop" d="M32 40q-2 3 0 5 2-2 0-5z"/><path class="c x-drop" style="--d:1.2s" d="M44 40q-2 3 0 5 2-2 0-5z"/><path class="w x-pop" d="M54 28l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>' });
  B.place('louisville', { id: 'twin-spires', label: 'Twin spires at post time', colour: 'red', mood: 'energetic', intensity: 'standard', tags: ['derby', 'horse', 'spires'], svg: () =>
    '<path class="s" d="M0 0h64v30H0z"/>' + sun(52, 20, 5) + cloud(4, 14, 0.5) +
    '<path class="w lk" d="M10 56V34h44v22z"/><path class="lk" d="M10 40h44"/>' +
    '<path class="c" d="M18 34V20l4-7 4 7v14zM38 34V20l4-7 4 7v14z"/><path class="lk" d="M22 13V6M42 13V6"/>' +
    '<g transform="translate(22 6)"><path class="c x-flag" d="M0 0l8 2-8 2z"/></g><g transform="translate(42 6)"><path class="c x-flag" style="--d:0.3s" d="M0 0l8 2-8 2z"/></g>' +
    '<path class="s" d="M0 56h64v8H0z"/><path class="lm" d="M0 56h64"/>' +
    horse(14, 49) });
  // ======================= LOUISIANA =======================
  B.state('LA', 'signature', { id: 'bayou-camp', label: 'A bayou camp at dusk', colour: 'teal', mood: 'dreamy', tags: ['bayou', 'fireflies', 'cypress'], svg: () =>
    moon(50, 14) + tw(8, 10, 0.5) + tw(24, 18, 1.1) +
    '<path class="s" d="M0 44h64v20H0z"/>' + wv(48, 0, 'lc') + wv(55, 0.5, 'lw') +
    '<path class="k" d="M10 46v-20M12 46v-18"/><path class="m x-wobble" d="M2 26q8-4 16 0-4 2-8 8-6-4-8-8z"/><path class="m" d="M7 34q-1 6 0 10M13 34q-1 6 0 10M10 36v8"/>' +
    '<path class="lk" d="M30 44v-6M44 44v-6M54 44v-6"/><path class="w lk" d="M28 38V26h28v12z"/><path class="k" d="M26 26l16-10 16 10z"/>' +
    '<rect class="c x-flicker" x="33" y="29" width="5" height="6"/><rect class="s" x="46" y="29" width="5" height="6"/><path class="lk" d="M32 38h8"/>' +
    '<circle class="c x-twinkle" cx="20" cy="36" r="1.2"/><circle class="c x-twinkle" style="--d:0.7s" cx="24" cy="30" r="1.2"/><circle class="c x-twinkle" style="--d:1.4s" cx="16" cy="40" r="1.2"/>' });
  B.state('LA', 'element', { id: 'pelican', label: 'The brown pelican', colour: 'amber', mood: 'cheerful', tags: ['bird', 'pelican'], svg: () =>
    '<path class="s" d="M0 46h64v18H0z"/>' + wv(50, 0, 'lc') + wv(57, 0.5, 'lw') +
    '<g class="x-bob"><path class="m" d="M10 42q6-10 18-8l14 2q8 2 8 8z"/><path class="c" d="M24 44q2-12 14-10l8 3q4 3 2 8z"/>' +
    '<path class="k" d="M42 44q6 2 10 0"/><circle class="m" cx="46" cy="30" r="4"/><path class="c" d="M50 30l12 4q-4 4-12 0z"/><path class="w" d="M46 26q-2-3-6-1 3 2 6 1z"/><circle class="k" cx="47" cy="29" r=".9"/></g>' +
    '<path class="lc x-pulse" d="M52 46q4 2 8 0"/><path class="lw x-wave" d="M2 48h8"/>' });
  B.place('new-orleans', { id: 'french-quarter', label: 'Gas lamps and the cathedral', colour: 'violet', mood: 'dreamy', intensity: 'standard', tags: ['french quarter', 'lamp', 'jazz'], svg: () =>
    moon(10, 12) + '<path class="c x-burst" d="M52 10l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/>' +
    '<path class="w lk" d="M22 58V32h20v26z"/><path class="c" d="M22 32l4-8v8M30 32l2-16 2 16M38 32v-8l4 8z"/><path class="lk" d="M32 16V9M30 12h4"/><path class="k" d="M29 58V46q3-5 6 0v12"/><circle class="s lk" cx="32" cy="38" r="2.6"/>' +
    '<path class="s lk" d="M2 58V38h14v20zM48 58V38h14v20z"/><path class="lk" d="M2 46h14M48 46h14"/><path class="lk" d="M4 48h10M50 48h10M4 52h10M50 52h10"/>' +
    '<rect class="c x-flicker" x="6" y="41" width="4" height="4"/><rect class="c x-flicker" style="--d:0.5s" x="54" y="41" width="4" height="4"/>' +
    '<path class="lk" d="M20 58V42M44 58V42"/><circle class="c x-flicker" cx="20" cy="40" r="2.4"/><circle class="c x-flicker" style="--d:0.3s" cx="44" cy="40" r="2.4"/>' +
    '<path class="lm" d="M0 58h64"/>' + note(28, 12, 0.3) });
  B.place('lafayette', { id: 'accordion-zydeco', label: 'A Cajun accordion', colour: 'red', mood: 'cheerful', tags: ['music', 'accordion', 'zydeco'], svg: () =>
    '<path class="k" d="M10 18h8v28h-8zM46 18h8v28h-8z"/>' +
    '<g class="x-breathe"><path class="c lk" d="M18 22h28v20H18z"/><path class="lk" d="M22 22v20M26 22v20M30 22v20M34 22v20M38 22v20M42 22v20"/><path class="w" d="M19 24h26v2H19z"/></g>' +
    '<circle class="w lk" cx="14" cy="26" r="1.6"/><circle class="w lk" cx="14" cy="32" r="1.6"/><circle class="w lk" cx="14" cy="38" r="1.6"/><rect class="w lk" x="48" y="20" width="4" height="3"/><rect class="w lk" x="48" y="25" width="4" height="3"/><rect class="w lk" x="48" y="30" width="4" height="3"/>' +
    note(20, 14, 0) + note(32, 12, 0.7) + note(44, 14, 1.4) + '<path class="lm" d="M8 54h48"/><circle class="s x-bob" cx="32" cy="54" r="1"/>' });
  // ======================= MISSISSIPPI =======================
  B.state('MS', 'signature', { id: 'delta-cotton', label: 'Cotton rows in the Delta', colour: 'amber', mood: 'calm', season: ['autumn'], tags: ['cotton', 'delta', 'sunset'], svg: () =>
    '<path class="s" d="M0 0h64v34H0z"/>' + '<circle class="c x-sunset" cx="32" cy="34" r="11"/>' + '<path class="c" d="M0 34h64v30H0z"/>' +
    '<path class="lw" d="M32 36L4 62M32 36L18 62M32 36v26M32 36l14 26M32 36l28 26"/>' +
    cloud(6, 14, 0.3) + bird(46, 14, 0.5) +
    '<g class="x-wobble o-b"><path class="w" d="M10 56q-3-3 0-6 3-3 6 0 3-3 6 0 1 3-2 5z"/></g><g class="x-wobble o-b" style="--d:0.6s"><path class="w" d="M30 52q-2-2 0-4 2-2 4 0 2-2 4 0 1 2-1 3z"/></g><g class="x-wobble o-b" style="--d:1.1s"><path class="w" d="M48 46q-1-2 0-3 2-1 3 0 2-1 3 0 .6 2-1 3z"/></g>' +
    '<path class="lk" d="M32 22v8M26 26h12" opacity="0"/>' });
  B.state('MS', 'element', { id: 'delta-blues-guitar', label: 'A blues guitar at the crossroads', colour: 'indigo', mood: 'dreamy', tags: ['blues', 'guitar', 'music'], svg: () =>
    '<path class="lm" d="M2 58h60"/><path class="lk" d="M52 58V12M44 22h16M46 30h12"/><path class="k" d="M46 28l12-4v-4l-12 4z" opacity="0"/>' +
    '<g transform="rotate(-28 28 36)"><g class="x-wobble"><path class="c lk" d="M20 36q-6-4-2-10 4-3 8 0 4 4 8 4 5 4 1 9-4 4-9 2-2 2-6-1z"/><circle class="k" cx="28" cy="35" r="3"/><path class="k" d="M30 33L52 22" /><path class="lw" d="M32 34l16-8"/></g></g>' +
    note(10, 22, 0) + note(22, 14, 0.8) + note(36, 10, 1.6) });
  B.place('biloxi', { id: 'lighthouse-beam', label: 'The lighthouse on the Gulf shore', colour: 'amber', mood: 'calm', tags: ['lighthouse', 'gulf'], svg: () =>
    tw(10, 12, 0) + tw(54, 8, 0.8) + tw(48, 26, 1.4) + '<circle class="s" cx="14" cy="22" r="0.1"/>' +
    '<g transform="translate(32 18)"><path class="c x-pulse" d="M0 0l22-8v16zM0 0l-22-8v16z" opacity=".5"/></g>' +
    '<path class="w lk" d="M26 54l2-26h8l2 26z"/><path class="c" d="M27 44h10l.4 4H26.6zM28.4 32h7l.3 4h-7.6z"/><path class="k" d="M26 28h12v-3H26z"/><path class="s lk" d="M28 25v-6h8v6z"/><circle class="c x-flicker" cx="32" cy="22" r="2.4"/><path class="k" d="M27 19l5-6 5 6z"/>' +
    '<path class="m" d="M0 54h64v10H0z"/><path class="c" d="M20 54q12-4 24 0z"/>' + wv(58, 0, 'lc') + wv(62, 0.5, 'lw') });
  B.place('natchez', { id: 'steamboat-wheel', label: 'A paddle steamer on the river', colour: 'red', mood: 'cheerful', intensity: 'standard', tags: ['steamboat', 'river'], svg: () =>
    cloud(4, 14, 0) + cloud(40, 10, 0.9) +
    '<path class="s" d="M0 46h64v18H0z"/>' +
    '<path class="k" d="M10 46h40l4-6H8z"/><path class="w lk" d="M14 40V30h28v10z"/><path class="w lk" d="M20 30V22h16v8z"/><path class="lk" d="M14 34h28"/><rect class="c" x="18" y="32" width="3" height="3"/><rect class="c" x="26" y="32" width="3" height="3"/><rect class="c" x="34" y="32" width="3" height="3"/><path class="c" d="M18 22h20v-2H18z"/>' +
    '<path class="k" d="M24 20v-12h4v12zM32 20v-10h4v10z"/><path class="c" d="M24 8h4v2h-4zM32 10h4v2h-4z"/>' +
    '<path class="s x-steam" d="M26 6q-3-3 0-6"/><path class="s x-steam" style="--d:0.8s" d="M34 8q3-3 0-6"/>' +
    '<g transform="translate(52 40)"><g class="x-spin"><circle class="w lk" r="9"/><path class="lk" d="M-9 0h18M0 -9v18M-6.4 -6.4l12.8 12.8M-6.4 6.4l12.8 -12.8"/></g></g>' +
    wv(51, 0, 'lc') + wv(57, 0.5, 'lw') });
  // ======================= NORTH CAROLINA =======================
  B.state('NC', 'signature', { id: 'hatteras-lighthouse', label: 'The striped Outer Banks lighthouse', colour: 'slate', mood: 'proud', tags: ['lighthouse', 'outer banks'], svg: () =>
    sun(12, 16, 5) + cloud(34, 12, 0.3) + bird(50, 22, 0.5) +
    '<path class="s" d="M0 52q10-4 20-2t22-2q10 0 22 2v14H0z"/><path class="m" d="M0 58q10-2 22-1t42 0v6H0z"/>' +
    '<path class="w lk" d="M26 54l3-34h6l3 34z"/><path class="k" d="M27.2 44l.5-6h8.6l.5 6zM28.2 32l.4-5h6.8l.4 5zM29.2 22.4l.2-2h5.2l.2 2z"/>' +
    '<path class="lk" d="M27 20h10v-3H27z"/><path class="s lk" d="M29 17v-5h6v5z"/><path class="c x-flicker" d="M30 16v-3h4v3z"/><path class="k" d="M28 12l4-5 4 5z"/>' +
    '<path class="c x-pulse" d="M26 14l-10-4M38 14l10-4" opacity=".5"/><path class="lw x-wave" d="M0 60h6"/>' + wv(62, 0.2, 'lc') });
  B.state('NC', 'element', { id: 'venus-flytrap', label: 'A Venus flytrap, snapping', colour: 'green', mood: 'energetic', intensity: 'playful', tags: ['plant', 'flytrap'], svg: () =>
    '<path class="lm" d="M4 58h56"/><path class="lk" d="M32 58V40"/><path class="c" d="M14 56q6-8 18-12 12 4 18 12-18 2-36 0z"/>' +
    '<g transform="translate(32 40)"><g class="x-lid o-b" style="--ad:2.6s"><path class="c lk" d="M-16 0q16-30 32 0z"/><path class="k" d="M-12 -2l1.2-4 1.4 4M-6 -3l1.2-4 1.4 4M0 -3l1.2-4 1.4 4M6 -3l1.2-4 1.4 4"/></g></g>' +
    '<path class="s lk" d="M16 40q16 8 32 0q-16-4-32 0z"/><path class="k" d="M20 42l1.4 4 1.4-4M28 44l1.4 4 1.4-4M36 44l1.4 4 1.4-4M44 42l1.4 4 1.4-4"/>' +
    '<g class="x-float"><ellipse class="k" cx="50" cy="20" rx="2" ry="1.2"/><path class="lw" d="M49 17l-2-3M52 17l2-3"/></g>' });
  B.place('asheville', { id: 'blue-ridge-fiddle', label: 'A fiddle among the Blue Ridge', colour: 'indigo', mood: 'cosy', tags: ['fiddle', 'blue ridge', 'music'], svg: () =>
    '<path class="s" d="M0 30q10-10 20-4t16-6 28 8v36H0z"/><path class="m" d="M0 40q12-8 24-2t18-6 22 6v26H0z"/>' + bird(48, 10, 0.4) + sun(14, 14, 4) +
    '<g class="x-wobble"><path class="lk t" d="M32 8v14"/><path class="c lk" d="M32 20q-9 0-9 7 0 4 3 5-5 2-5 8 0 8 11 8t11-8q0-6-5-8 3-1 3-5 0-7-9-7z"/><path class="lk" d="M27 34q5 3 10 0"/><path class="k" d="M29 44h6v2h-6z"/><path class="lw" d="M28 28v3M36 28v3"/><path class="lk" d="M30 24v14M34 24v14" opacity=".5"/></g>' +
    '<path class="lk x-swing" d="M12 50L52 24"/>' + note(8, 28, 0) + note(54, 36, 1) });
  B.place('kitty-hawk', { id: 'first-flight', label: 'The first flight', colour: 'blue', mood: 'proud', intensity: 'standard', tags: ['wright', 'biplane', 'aviation'], svg: () =>
    sun(52, 14, 5) + cloud(6, 16, 0.2) +
    '<path class="s" d="M0 54q14-6 28-2t36-2v14H0z"/><path class="m" d="M0 60q16-3 32-1t32-1v6H0z"/>' +
    '<g class="x-takeoff"><path class="w lk" d="M12 32h26v3H12zM14 40h24v3H14z"/><path class="lk" d="M16 35v5M22 35v5M28 35v5M34 35v5"/><path class="c" d="M36 36l8-1 2 1-2 2-8 0z"/><path class="lk" d="M14 38l-8 2M6 36v6"/><g transform="translate(43 36)"><path class="k x-spin" style="--ad:0.25s" d="M-1 -5h2v10h-2z"/></g></g>' +
    '<path class="lk" d="M10 56L6 62M18 56l-2 6" opacity="0"/>' + '<path class="c x-contrail" d="M2 36h14"/>' });
  B.place('charlotte', { id: 'crown-skyline', label: 'The Queen City skyline', colour: 'blue', mood: 'proud', intensity: 'standard', tags: ['skyline', 'crown'], svg: () =>
    tw(10, 12, 0.3) + tw(54, 8, 0.9) + moon(46, 18) +
    '<path class="s" d="M2 58V36h10v22zM48 58V34h8v24zM56 58V42h7v16z"/>' +
    '<path class="w lk" d="M18 58V26h8V18l6 4 6-4v8h8v32z"/><path class="c x-glow" d="M18 26l4-6 5 5 5-6 5 6 5-5 4 6z"/>' +
    '<path class="lk" d="M24 32v26M32 28v30M40 32v26"/>' +
    win(4, 40, 2, 2, 'c', 0.3) + win(7, 48, 2, 2, 'c', 0.9) + win(50, 38, 2, 2, 'c', 0.5) + win(51, 46, 2, 2, 'c', 1.1) + win(58, 48, 2, 2, 'c', 0.2) +
    '<path class="lm" d="M0 58h64"/>' });
  // ======================= SOUTH CAROLINA =======================
  B.state('SC', 'signature', { id: 'palmetto-crescent', label: 'Palmetto and crescent moon', colour: 'blue', mood: 'calm', tags: ['palmetto', 'moon', 'marsh'], svg: () =>
    moon(48, 16) + tw(10, 10, 0) + tw(24, 20, 1) + tw(58, 34, 0.5) +
    '<path class="s" d="M0 48q10-4 22 0t42-2v18H0z"/>' + wv(52, 0, 'lc') + wv(58, 0.5, 'lw') +
    '<path class="k" d="M24 52q-3-14 3-26"/><g transform="translate(27 26)"><path class="c x-wobble" d="M0 0q-10-2-16 6 8-4 16-6q-8-5-10-12 8 6 10 12 0-10 6-14-2 8-4 14 8-8 16-6-8 2-14 8 6-2 10 2-8-2-12-2z"/></g>' +
    '<path class="lm" d="M2 52h20M40 52h22"/>' });
  B.state('SC', 'element', { id: 'sweetgrass-basket', label: 'A sweetgrass basket', colour: 'amber', mood: 'cosy', tags: ['craft', 'basket', 'gullah'], svg: () =>
    '<path class="lm" d="M4 58h56"/>' +
    '<g class="x-bob"><path class="c lk" d="M12 28h40q-2 24-20 28Q14 52 12 28z"/><path class="lk" d="M14 34h36M16 40h32M20 46h24M26 51h12"/><path class="lw" d="M20 28q-2 14 4 24M32 28v28M44 28q2 14-4 24"/></g>' +
    '<path class="c" d="M12 28q20-8 40 0" opacity=".5"/>' +
    '<g transform="translate(20 26)"><path class="lc x-wobble o-b" d="M0 0q-2-8 0-14"/></g><g transform="translate(32 26)"><path class="lc x-wobble o-b" style="--d:0.5s" d="M0 0q1-10 0-16"/></g><g transform="translate(44 26)"><path class="lc x-wobble o-b" style="--d:1s" d="M0 0q2-8 0-12"/></g>' });
  B.place('charleston-sc', { id: 'rainbow-row', label: 'Pastel row houses and a carriage', colour: 'pink', mood: 'cheerful', tags: ['rainbow row', 'carriage', 'houses'], svg: () =>
    sun(52, 10, 4) + bird(12, 10, 0.4) +
    '<path class="c" d="M2 56V28h12v28z"/><path class="s lk" d="M14 56V22h12v34z"/><path class="w lk" d="M26 56V30h12v26z"/><path class="c lk" d="M38 56V24h12v32z"/><path class="s lk" d="M50 56V32h12v24z"/>' +
    '<path class="k" d="M2 28l6-5 6 5M14 22l6-6 6 6M26 30l6-5 6 5M38 24l6-6 6 6M50 32l6-5 6 5"/>' +
    win(5, 32, 4, 5, 'w', 0.2) + win(17, 28, 4, 5, 'w') + win(29, 36, 4, 5, 'w', 0.6) + win(41, 30, 4, 5, 'w') + win(53, 38, 4, 5, 'w', 1) + win(17, 38, 4, 5, 'w') + win(41, 40, 4, 5, 'w', 0.4) +
    '<g class="x-bob"><path class="k" d="M18 56v-5h8v5M26 52l3-3 2 2-1 4z"/><circle class="k" cx="16" cy="56" r="0.1"/></g>' +
    '<circle class="lk" cx="19" cy="57" r="1.4"/><circle class="lk" cx="25" cy="57" r="1.4"/>' + '<path class="lm" d="M0 58h64"/>' });
  B.place('myrtle-beach', { id: 'sky-wheel', label: 'The boardwalk Ferris wheel', colour: 'orange', mood: 'cheerful', intensity: 'standard', tags: ['ferris wheel', 'boardwalk', 'beach'], svg: () =>
    sun(12, 14, 5) + cloud(40, 8, 0.3) +
    '<path class="lk" d="M32 28L22 58M32 28L42 58"/>' +
    '<g transform="translate(32 28)"><g class="x-spin" style="--ad:12s"><circle class="lc" r="17"/><circle class="lk" r="2.4"/><path class="lk" d="M-17 0h34M0 -17v34M-12 -12l24 24M-12 12l24 -24"/><circle class="c" cx="17" cy="0" r="2.2"/><circle class="c" cx="-17" cy="0" r="2.2"/><circle class="c" cx="0" cy="17" r="2.2"/><circle class="c" cx="0" cy="-17" r="2.2"/><circle class="w lk" cx="12" cy="12" r="2"/><circle class="w lk" cx="-12" cy="-12" r="2"/><circle class="w lk" cx="12" cy="-12" r="2"/><circle class="w lk" cx="-12" cy="12" r="2"/></g></g>' +
    '<path class="m" d="M0 56h64v8H0z"/><path class="lm" d="M0 56h64"/>' + wv(61, 0, 'lc') });
  // ======================= TENNESSEE =======================
  B.state('TN', 'signature', { id: 'smoky-fog', label: 'Fog drifting in the Smokies', colour: 'indigo', mood: 'dreamy', tags: ['mountains', 'fog', 'smoky'], svg: () =>
    sun(46, 14, 5) + bird(14, 12, 0) + bird(24, 18, 0.7) +
    '<path class="s" d="M0 38q8-10 18-4t14-8 14 6 18-6v38H0z"/><path class="m" d="M0 46q12-8 22-2t18-6 24 6v20H0z"/>' +
    '<path class="c" d="M0 54q12-6 26-2t38-4v16H0z"/>' +
    '<path class="w x-slidel" style="--ad:3s" d="M-8 44h28a3 3 0 0 0 0-3H-4zM30 40h24a3 3 0 0 0 0-3H33z"/><path class="w x-slidel" style="--ad:4s;--d:1s" d="M-4 52h20a3 3 0 0 0 0-3H0zM34 50h26a3 3 0 0 0 0-3H37z"/>' +
    tree(8, 52, 10) + tree(56, 52, 8, 'k') });
  B.state('TN', 'element', { id: 'mockingbird', label: 'A singing mockingbird', colour: 'slate', mood: 'cheerful', tags: ['bird', 'song'], svg: () =>
    '<path class="lm" d="M4 48h50"/><path class="lm" d="M42 48q8-4 16-12"/><path class="c" d="M52 38l6-2 0 4z" opacity="0"/>' +
    '<path class="k" d="M18 40L4 34l2 10z"/><ellipse class="s lk" cx="28" cy="40" rx="11" ry="7"/><path class="w" d="M22 44q6 4 14 0z"/><path class="m" d="M20 38q8 4 16-2"/>' +
    '<g class="x-bob"><circle class="s lk" cx="40" cy="30" r="6"/><path class="k" d="M45 29l6-1-6 4z"/><circle class="k" cx="41.4" cy="28.6" r="1"/></g>' +
    '<path class="lk" d="M27 46v3M32 46v3"/>' + note(46, 16, 0) + note(12, 20, 0.6) + note(30, 12, 1.3) });
  B.place('nashville', { id: 'music-city-skyline', label: 'Skyline and a guitar sound', colour: 'orange', mood: 'energetic', intensity: 'standard', tags: ['skyline', 'music', 'guitar'], svg: () =>
    sun(52, 22, 5) + cloud(6, 12, 0.4) +
    '<path class="s" d="M2 58V40h9v18zM44 58V34h8v24zM53 58V44h9v14z"/>' +
    '<path class="w lk" d="M16 58V26h14v32z"/><path class="k" d="M17 26l4-14 2 4 2-4 4 14z"/><path class="lk" d="M20 12V6M26 12V6"/><path class="lk" d="M16 34h14M16 42h14M16 50h14"/>' + win(20, 38, 3, 3, 'c', 0.3) + win(24, 46, 3, 3, 'c', 0.9) + win(20, 28, 3, 3, 'c', 0.6) +
    '<path class="s lk" d="M32 58V40h10v18z"/>' + win(34, 44, 2, 2, 'c', 0.2) + win(37, 50, 2, 2, 'c', 1) +
    '<path class="lm" d="M0 58h64"/>' + note(4, 36, 0) + note(36, 30, 0.8) });
  B.place('memphis', { id: 'beale-bridge', label: 'The bridge and the pyramid by night', colour: 'teal', mood: 'dreamy', intensity: 'standard', tags: ['bridge', 'pyramid', 'river'], svg: () =>
    moon(10, 12) + tw(36, 8, 0.2) + tw(52, 16, 0.9) +
    '<path class="s lk" d="M42 46l9-18 9 18z"/><path class="c x-glow" d="M51 28l3 6h-6z"/>' +
    '<path class="lk t" d="M2 40q8-14 14-14 6 0 8 14M24 40q8-14 14-14 6 0 8 14"/>' +
    '<path class="lc x-glow" d="M2 40q8-14 14-14 6 0 8 14M24 40q8-14 14-14 6 0 8 14" opacity=".6"/>' +
    '<path class="k" d="M0 40h64v3H0z"/><path class="lk" d="M16 40v3M31 40v3"/>' +
    '<path class="s" d="M0 46h64v18H0z"/>' + wv(50, 0, 'lc') + wv(56, 0.4, 'lw') + wv(61, 0.8, 'lc') +
    '<path class="c x-twinkle" d="M12 52v6M30 52v6M52 52v6" opacity=".5"/>' });
  B.place('gatlinburg', { id: 'sky-lift', label: 'A sky lift over the pines', colour: 'green', mood: 'cheerful', tags: ['chairlift', 'smokies'], svg: () =>
    sun(52, 12, 4) + bird(14, 10, 0) +
    '<path class="s" d="M0 44q12-16 24-8t20-4 20 12v20H0z"/><path class="m" d="M0 54q14-8 28-2t36-4v16H0z"/>' +
    '<path class="lk" d="M8 14L56 30"/><path class="k" d="M8 12v12M56 28v12"/>' +
    '<g transform="translate(20 19)"><g class="x-swing o-t"><path class="lk" d="M0 0v6"/><path class="c lk" d="M-4 6h8v3h-8z"/></g></g>' +
    '<g transform="translate(40 26)"><g class="x-swing o-t" style="--d:0.8s"><path class="lk" d="M0 0v6"/><path class="c lk" d="M-4 6h8v3h-8z"/></g></g>' +
    tree(8, 56, 10, 'c') + tree(18, 58, 8, 'k') + tree(48, 56, 9, 'k') + tree(58, 58, 8, 'c') });
  // ======================= VIRGINIA =======================
  B.state('VA', 'signature', { id: 'shenandoah-skyline', label: 'Skyline Drive ridges at sunrise', colour: 'orange', mood: 'calm', tags: ['shenandoah', 'ridge', 'sunrise'], svg: () =>
    '<path class="s" d="M0 0h64v30H0z"/><circle class="c x-sunset" cx="42" cy="28" r="10"/>' + bird(10, 12, 0) + bird(20, 18, 0.6) +
    '<path class="m" d="M0 34q8-6 16-2t14-6 14 4 20-6v38H0z"/><path class="s lk" d="M0 40q10-6 18-2t14-4 14 4 18-4v26H0z" opacity="0"/>' +
    '<path class="c" d="M0 46q10-6 20-2t18-6 26 4v22H0z"/><path class="s" d="M0 54q14-6 28-2t36-2v14H0z"/>' +
    '<path class="lm" d="M0 56q20-4 40 0t24 0"/><path class="w x-slidel" style="--ad:4s" d="M-6 40h22a3 3 0 0 0 0-3H-2zM34 38h22a3 3 0 0 0 0-3H37z"/>' });
  B.state('VA', 'element', { id: 'cardinal-dogwood', label: 'A cardinal in the dogwood', colour: 'red', mood: 'cheerful', season: ['spring'], tags: ['bird', 'dogwood', 'blossom'], svg: () =>
    '<path class="lk" d="M2 44q20-4 36-2 12 0 24-8"/><path class="lk" d="M20 43q4-8 12-12"/>' +
    '<g transform="translate(14 36)"><g class="x-pop"><circle class="w lc" cx="0" cy="-4" r="3.4"/><circle class="w lc" cx="4" cy="0" r="3.4"/><circle class="w lc" cx="0" cy="4" r="3.4"/><circle class="w lc" cx="-4" cy="0" r="3.4"/><circle class="c" r="1.6"/></g></g>' +
    '<g transform="translate(54 28)"><g class="x-pop" style="--d:1.2s"><circle class="w lc" cx="0" cy="-4" r="3.4"/><circle class="w lc" cx="4" cy="0" r="3.4"/><circle class="w lc" cx="0" cy="4" r="3.4"/><circle class="w lc" cx="-4" cy="0" r="3.4"/><circle class="c" r="1.6"/></g></g>' +
    '<path class="c" d="M36 38L22 44l4-9z"/><ellipse class="c" cx="38" cy="32" rx="9" ry="7"/><g class="x-bob"><circle class="c" cx="45" cy="23" r="6"/><path class="c" d="M44 18l2-7 3 7z"/><path class="k" d="M39 24h4v4h-4z" opacity="0"/><path class="k" d="M49 24l5 2-5 2z" opacity="0"/><path class="k" d="M50 23l5 2.5-5 2z"/><circle class="k" cx="42" cy="23" r="3" opacity=".8"/><circle class="w" cx="45" cy="22" r="1.2"/></g>' +
    '<path class="lk" d="M35 39v4M40 39v4"/><path class="c x-float" d="M8 20l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z"/>' });
  B.place('virginia-beach', { id: 'pier-lighthouse', label: 'Boardwalk, pier and dolphins', colour: 'blue', mood: 'cheerful', intensity: 'standard', tags: ['beach', 'dolphin', 'pier'], svg: () =>
    sun(50, 12, 6) + cloud(6, 14, 0.2) + bird(28, 8, 0.5) +
    '<path class="s" d="M0 38h64v26H0z"/>' + wv(41, 0, 'lc') + wv(46, 0.5, 'lw') +
    '<path class="k" d="M0 36h40v2H0z"/><path class="lk" d="M4 38v10M14 38v10M24 38v10M34 38v10"/>' +
    '<path class="w lk" d="M42 38l2-14h4l2 14z"/><path class="c" d="M43 32h6l.4 3h-6.8z"/><path class="k" d="M43 24h6v-2h-6z"/><path class="lk" d="M44 22l2-4 2 4"/>' +
    '<g transform="translate(52 52)"><g class="x-drop"><path class="s lk" d="M-8 2q4-12 10-8 4 2 6-2-1 6-2 6 3 3 0 5-8 2-14-1z"/></g></g>' +
    '<g transform="translate(20 54)"><g class="x-drop" style="--d:1.4s"><path class="s lk" d="M-8 2q4-12 10-8 4 2 6-2-1 6-2 6 3 3 0 5-8 2-14-1z"/></g></g>' +
    wv(58, 0.3, 'lc') + wv(62, 0.9, 'lw') });
  B.place('williamsburg', { id: 'colonial-capitol', label: 'The colonial capitol and its flag', colour: 'red', mood: 'proud', tags: ['colonial', 'capitol', 'flag'], svg: () =>
    sun(52, 12, 4) + cloud(4, 14, 0.3) +
    '<path class="c lk" d="M8 56V34h14v22zM42 56V34h14v22z"/><path class="w lk" d="M22 56V30h20v26z"/>' +
    '<path class="k" d="M6 34l9-8 9 8zM40 34l9-8 9 8z"/><path class="c" d="M22 30l10-8 10 8z"/><path class="lk" d="M32 22v-8"/><circle class="s lk" cx="32" cy="14" r="3"/>' +
    '<path class="lk" d="M32 11V4"/><g transform="translate(32 4)"><path class="c x-flag o-l" d="M0 0h9l-2 2.5 2 2.5H0z"/></g>' +
    '<path class="k" d="M29 56V44q3-4 6 0v12z"/><rect class="s lk" x="25" y="36" width="4" height="5"/><rect class="s lk" x="35" y="36" width="4" height="5"/>' +
    '<rect class="c x-flicker" x="11" y="40" width="4" height="5"/><rect class="c x-flicker" style="--d:0.5s" x="49" y="40" width="4" height="5"/>' + '<path class="lm" d="M0 58h64"/>' });
  // ======================= WEST VIRGINIA =======================
  B.state('WV', 'signature', { id: 'new-river-gorge', label: 'The steel arch over the gorge', colour: 'green', mood: 'proud', season: ['autumn'], tags: ['bridge', 'gorge', 'river'], svg: () =>
    sun(50, 14, 5) + cloud(6, 12, 0.3) + bird(26, 10, 0.2) +
    '<path class="c" d="M0 28q10 0 16 10l4 26H0zM64 28q-10 0-16 10l-4 26h20z"/><path class="m" d="M0 28q8 0 12 8M64 28q-8 0-12 8"/>' +
    '<path class="k" d="M12 30h40v2.4H12z"/><path class="lk t" d="M14 32q18 -2 36 0" opacity="0"/><path class="lk t" d="M18 54q14-30 28 0"/>' +
    '<path class="lk" d="M24 40v-8M28 34v-2M32 32v0M36 34v-2M40 40v-8"/><path class="lk" d="M23 38l5-6M41 38l-5-6"/>' +
    '<path class="s" d="M20 56h24v8H20z"/>' + wv(59, 0, 'lc') + wv(63, 0.5, 'lw') +
    '<path class="w x-slidel" style="--ad:4s" d="M-4 48h16a3 3 0 0 0 0-3H0zM44 44h20a3 3 0 0 0 0-3H47z" opacity=".8"/>' });
  B.state('WV', 'element', { id: 'miner-lamp', label: 'A miner’s helmet lamp', colour: 'amber', mood: 'focused', tags: ['coal', 'mining', 'lamp'], svg: () =>
    '<path class="lm" d="M2 58h60"/>' +
    '<g class="x-bob"><path class="c lk" d="M14 42q0-20 18-20t18 20z"/><path class="lk" d="M10 42h44v4H10z"/><path class="w" d="M20 36q2-8 8-10"/><path class="lk" d="M32 22v20"/><circle class="w lk" cx="32" cy="32" r="5"/><circle class="c x-glow" cx="32" cy="32" r="3"/></g>' +
    '<path class="c x-pulse" d="M32 32L12 14M32 32L52 14M32 32V8" opacity=".35"/>' +
    '<path class="k" d="M4 58l4-6 3 3 4-5 3 8z"/><path class="k" d="M44 58l4-5 4 3 4-6 4 8z"/>' + '<path class="c x-twinkle" d="M54 8l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z"/>' });
  B.place('harpers-ferry', { id: 'rail-confluence', label: 'The train at the river confluence', colour: 'slate', mood: 'calm', tags: ['train', 'rivers', 'bridge'], svg: () =>
    sun(52, 12, 4) + cloud(8, 12, 0.2) +
    '<path class="c" d="M0 34q16-8 32 2t32-4v32H0z"/><path class="s" d="M0 46h64v18H0z"/>' + wv(51, 0, 'lc') + wv(58, 0.5, 'lw') +
    '<path class="k" d="M2 40h60v2.4H2z"/><path class="lk" d="M10 42v8M26 42v8M42 42v8M58 42v8"/><path class="lk" d="M10 42q8-8 16 0M26 42q8-8 16 0M42 42q8-8 16 0"/>' +
    '<g class="x-bob"><path class="k" d="M14 40v-5h9v5M23 40v-9h5v9z"/><path class="c" d="M14 35h9v1.8h-9z"/><path class="k" d="M24 31h4v-3h-4z"/><circle class="w lk" cx="17" cy="40" r="1.5"/><circle class="w lk" cx="22" cy="40" r="1.5"/></g>' +
    '<path class="w x-steam" d="M26 28q-4-3 0-6q4-3 0-6"/><path class="w x-steam" style="--d:0.8s" d="M30 26q4-3 0-6"/>' + tree(54, 36, 9, 'k') });

  animRegisterPack(B.pack({ id: 'us-southeast', name: 'US Southeast', description: 'Alabama to West Virginia: bridges at dawn, bayous, bourbon and blues, lighthouses, rockets and the Smokies, with art for the big and small cities of the region.' }));
})();
