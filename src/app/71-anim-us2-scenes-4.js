/* ============================================================
   US FULL-SCREEN SCENES, batch 4: Miami, Orlando, Tampa, Nashville, Memphis, Louisville, New Orleans,
   Illinois, Indiana, Iowa, Kansas. Pure classic script: it only calls usSceneAdd(entry) (71-anim-us.js);
   the pack builder upgrades the matching items to full-screen openings. Same toolkit and layering as the
   Texas scenes (docs/dev/ANIMATION_PACKS.md, UK_PACK.md "Full-viewport scenes"): 1600 x 900 units, sliced
   to fill any screen, far / mid / near layers, ambient life, daytime colours (the dark theme or a dusk
   class lights .us-lit windows and .us-lamps strings and shows .us-star). Motion is transform and
   opacity only.
   ============================================================ */
(function () {
  const K = usSceneKit();
  const { U, R, rnd, lin, linU, radU, mv, full, ridge, canopy, cloud, streak, haze, rays, sun, stars, birds, shimmer, puffs, dots, lit, finish, star5 } = K;

  /** A path of small window segments (cols x rows grid, some skipped). Drawn twice: dim glass by day, .us-lit at dusk. */
  const wp = (x, y, cols, rows, dx, dy, seed, p, w) => { const r = rnd(seed); let d = ''; for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) if (r() < (p == null ? 0.7 : p)) d += `M${x + i * dx} ${y + j * dy}h${w || 6}`; return d; };
  const wins = (x, y, cols, rows, dx, dy, seed, p, w, h, glass) => { const d = wp(x, y, cols, rows, dx, dy, seed, p, w); return `<path fill="none" stroke="${glass || '#25324f'}" stroke-width="${h || 8}" opacity=".5" d="${d}"/><path class="us-lit" fill="none" stroke-width="${h || 8}" d="${d}"/>`; };
  /** A palm: curved trunk with rings, a crown of drooping fronds that sways from the crown. */
  const palm = (x, y, h, lean, s, seed, trunk, leaf, leaf2) => {
    const r = rnd(seed), cx = x + lean, cy = y - h; let f = '';
    for (let i = 0; i < 11; i++) {
      const a = (-175 + i * 17 + r() * 8) * Math.PI / 180, L = (90 + r() * 50) * s, ex = cx + Math.cos(a) * L, ey = cy + Math.sin(a) * L * 0.55 + Math.abs(Math.cos(a)) * L * 0.42;
      const mx = (cx + ex) / 2, my = (cy + ey) / 2 - L * 0.28, w = L * 0.13;
      f += `<path fill="${i % 3 ? leaf : leaf2}" d="M${R(cx)} ${R(cy)}Q${R(mx - w)} ${R(my - w)} ${R(ex)} ${R(ey)}Q${R(mx + w)} ${R(my + w * 1.4)} ${R(cx)} ${R(cy)}z"/>`;
    }
    return `<path fill="none" stroke="${trunk}" stroke-width="${R(13 * s)}" stroke-linecap="round" d="M${x} ${y}Q${R(x + lean * 0.1)} ${R(y - h * 0.55)} ${R(cx)} ${R(cy)}"/><path fill="none" stroke="#0004" stroke-width="${R(13 * s)}" stroke-dasharray="3 ${R(9 * s)}" d="M${x} ${y}Q${R(x + lean * 0.1)} ${R(y - h * 0.55)} ${R(cx)} ${R(cy)}"/>`
      + mv('ussway2', { ad: (5 + (seed % 3)) + 's', d: -(seed % 4) + 's', to: `${R(cx)}px ${R(cy)}px` }, f + `<circle cx="${R(cx)}" cy="${R(cy + 6)}" r="${R(9 * s)}" fill="${trunk}"/>`);
  };
  /** A horizon skyline of towers: [x, w, h, tone] driven by a seed; windows lit at dusk. */
  const towers = (seed, x0, x1, base, hmin, hmax, tone, win, spacing) => {
    const r = rnd(seed); let x = x0, o = '', wd = '';
    while (x < x1) { const w = 34 + r() * 50, h = hmin + r() * (hmax - hmin); o += `<rect x="${R(x)}" y="${R(base - h)}" width="${R(w)}" height="${R(h)}" fill="${tone}"/>` + (r() < 0.3 ? `<rect x="${R(x + w * 0.4)}" y="${R(base - h - 24)}" width="${R(w * 0.2)}" height="24" fill="${tone}"/>` : '');
      if (win) wd += wp(R(x + 7), R(base - h + 14), Math.max(1, Math.floor((w - 12) / 12)), Math.floor((h - 20) / 22), 12, 22, R(x), win === true ? 0.5 : win, 5); x += w + (spacing == null ? 4 : spacing) + r() * 6; }
    return o + (win ? `<path class="us-lit" fill="none" stroke-width="7" d="${wd}"/>` : '');
  };
  /** A firework burst: spokes and sparks that swell and fade, repeating. */
  const burst = (cx, cy, rad, col, col2, ad, d) => {
    let sp = '', sk = ''; for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; sp += `M${R(cx + Math.cos(a) * rad * 0.3)} ${R(cy + Math.sin(a) * rad * 0.3)}L${R(cx + Math.cos(a) * rad)} ${R(cy + Math.sin(a) * rad)}`; sk += `M${R(cx + Math.cos(a + 0.2) * rad * 1.05)} ${R(cy + Math.sin(a + 0.2) * rad * 1.05)}h0`; }
    return mv('uspuff', { ad, d, dx: '0px', dy: '0px', sc: '1.1', to: `${cx}px ${cy}px` }, `<path fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${R(rad * 0.22)} ${R(rad * 0.1)}" d="${sp}"/><path fill="none" stroke="${col2}" stroke-width="8" stroke-linecap="round" d="${sk}"/>`);
  };
  /** A music note (head, stem, flag). */
  const note = (x, y, s, col) => `<g fill="${col}" stroke="${col}" stroke-width="${(3 * s).toFixed(1)}"><ellipse cx="${x}" cy="${y}" rx="${R(9 * s)}" ry="${R(6.5 * s)}" transform="rotate(-20 ${x} ${y})" stroke="none"/><path fill="none" stroke-linecap="round" d="M${R(x + 8 * s)} ${R(y - 2 * s)}V${R(y - 40 * s)}q${R(14 * s)} ${R(6 * s)} ${R(14 * s)} ${R(20 * s)}"/></g>`;
  /** A rooftop-high lamp post with a glowing globe. */
  const lamp = (x, y, h, s) => `<path fill="none" stroke="#1d1a24" stroke-width="${R(5 * s)}" d="M${x} ${y}V${y - h}"/><path fill="#1d1a24" d="M${x - 9 * s} ${y}h${18 * s}l-${4 * s} -${14 * s}h-${10 * s}z"/><circle class="us-lit" cx="${x}" cy="${y - h - 8 * s}" r="${R(10 * s)}"/><circle cx="${x}" cy="${y - h - 8 * s}" r="${R(9 * s)}" fill="#fff0c0" opacity=".85"/>`;

  /* ---------- MIAMI: Ocean Drive deco at sunrise ---------- */
  usSceneAdd({ key: 'place:miami', label: 'Art deco neon by the sea', site: 'Ocean Drive, South Beach', colour: 'pink', mood: 'energetic', season: 'any', tags: ['deco', 'neon', 'palm', 'sunrise'],
    svg: () => { const s1 = U(), s2 = U(), s3 = U(), s4 = U(), s5 = U(), g1 = U(); const neon = (d, c, w, c2) => `<path fill="none" stroke="${c}" stroke-width="${w || 5}" stroke-linecap="round" stroke-linejoin="round" d="${d}"/>`;
      return `<defs>${lin(s1, [[0, '#4d5fb8'], [0.3, '#c46fb0'], [0.55, '#ff9a8c'], [0.8, '#ffd59a'], [1, '#ffe9b8']])}${lin(s2, [[0, '#ffb392'], [0.25, '#e58aa6'], [0.6, '#3a9fb4'], [1, '#17697f']])}${lin(s3, [[0, '#f4d9ae'], [1, '#d9b583']])}${lin(s4, [[0, '#ffe3ee'], [1, '#f6b8cf']])}${lin(s5, [[0, '#d6fbf6'], [1, '#79d1c8']])}${lin(g1, [[0, '#3c3a4c'], [1, '#26242f']])}</defs>`
        + full(`url(#${s1})`) + stars(41, 40, 200)
        + rays(800, 548, 1200, '#fff3cf', 0.24) + sun(800, 548, 50, '#fffbe6', '#ffd69b', true)
        + streak(300, 150, 260, '#ffc8d8', 0.55) + streak(1260, 210, 300, '#ffd6c0', 0.5) + cloud(420, 330, 1.1, '#f6a6a8', 0.9, 60, 5, '#ffe0e6') + cloud(1180, 380, 1.3, '#f2a0a6', 0.9, 70, 25, '#ffe4e2') + cloud(840, 260, 0.7, '#f6b4b4', 0.8, 52, 12, '#fff0e8')
        + birds(12, 5, 700, 330, '#4a3a58', 1.2, 700)
        /* far sea, ship, sun path */
        + `<rect y="560" width="1600" height="340" fill="url(#${s2})"/>` + haze(540, 50, '#ffe0c0', 0.8)
        + mv('usmove', { ad: '150s', dx: '420px' }, `<path fill="#6a4a78" d="M1010 566h150l-14 -22h-70l-6 -16h-34l-4 16h-16z"/><rect x="1040" y="540" width="70" height="8" fill="#e8d0e0"/>`)
        + mv('uspar', { ad: '40s', dx: '10px' }, `<path fill="none" stroke="#fff2c8" stroke-width="3" opacity=".6" stroke-dasharray="14 18" d="M690 580h220M700 600h200M714 624h172M730 654h140M750 690h100"/>` + shimmer(3, 30, 560, 1040, 575, 780, '#ffe2b0', 60) + shimmer(4, 24, 100, 1500, 640, 820, '#8fe0e0', 50))
        + mv('usbob', { ad: '4s', dy: '4px' }, `<path fill="#fff" d="M1260 620l40 -78l14 78z"/><path fill="#ffd0dc" d="M1250 624h72l-14 12h-46z"/>`)
        /* beach and drive */
        + `<path fill="url(#${s3})" d="M-160 740Q400 700 800 716T1760 716V900H-160z"/><path fill="#fff" opacity=".65" d="M-160 736Q400 696 800 712T1760 712l0 6Q1200 722 800 722T-160 744z"/>`
        + `<rect y="810" width="1600" height="90" fill="url(#${g1})"/><path fill="none" stroke="#ffe08c" stroke-width="4" stroke-dasharray="46 36" d="M-160 862H1760"/><rect y="800" width="1600" height="12" fill="#cfc2d6"/>`
        /* background deco hotel (yellow) */
        + `<rect x="930" y="500" width="300" height="300" fill="#ffe9a8"/><rect x="930" y="500" width="300" height="12" fill="#ff9ac0"/><rect x="960" y="470" width="110" height="34" fill="#ffe9a8"/>` + wins(946, 530, 11, 6, 26, 40, 5, 0.75, 14, 18, '#3a587a')
        + neon('M940 560H1220M940 620H1220', '#29d6d4', 3) + `<circle cx="1015" cy="486" r="9" fill="#ff5fa8"/>`
        /* left hotel */
        + `<rect x="-60" y="360" width="560" height="440" fill="url(#${s4})"/><path fill="url(#${s4})" d="M-60 360h560v-24h-90l-30 -40h-180l-30 40h-230z"/><rect x="-60" y="360" width="560" height="10" fill="#ff7fb0"/><rect x="-60" y="470" width="560" height="7" fill="#58cfc6"/><rect x="-60" y="590" width="560" height="7" fill="#58cfc6"/><rect x="-60" y="700" width="560" height="9" fill="#ff7fb0"/>`
        + `<path fill="#fff4f8" d="M300 296l50 -190l50 190z"/><rect x="326" y="104" width="48" height="196" fill="#fff4f8"/><path fill="#58cfc6" d="M338 70h24v46h-24z"/>`
        + `<rect x="338" y="120" width="24" height="170" fill="#ff4f9e" opacity=".9"/>` + mv('usflicker', { ad: '1.6s', to: '350px 200px' }, neon('M350 126V286', '#fff', 3))
        + `<path fill="#ffe8f2" d="M-60 360h20v440h-20z"/>` + wins(-20, 392, 12, 3, 38, 38, 8, 0.75, 22, 22, '#3a587a') + wins(-20, 500, 12, 2, 38, 44, 9, 0.75, 22, 22, '#3a587a') + wins(-20, 620, 12, 2, 38, 36, 10, 0.75, 22, 22, '#3a587a')
        + `<g fill="#58cfc6"><circle cx="40" cy="760" r="14"/><circle cx="90" cy="760" r="14"/></g><rect x="150" y="730" width="170" height="70" fill="#2b3760" opacity=".55"/><path fill="#ff6aa8" d="M140 730h190l-14 -26h-162z"/>`
        + mv('usflicker', { ad: '2.2s', to: '230px 700px' }, neon('M150 722H318', '#fff', 3) + neon('M140 730H330', '#ff2f93', 6)) + `<path class="us-lit" fill="none" stroke-width="3" d="M158 746h152"/>`
        + mv('usflicker', { ad: '3.1s', d: '-1s', to: '420px 600px' }, neon('M420 520V690', '#ffe94d', 5) + neon('M420 520h30M420 600h30M420 690h30', '#ff4fa8', 5))
        /* right hotel */
        + `<rect x="1180" y="440" width="520" height="360" fill="url(#${s5})"/><rect x="1180" y="440" width="520" height="12" fill="#ff7fb0"/><rect x="1180" y="560" width="520" height="7" fill="#fff"/><rect x="1180" y="676" width="520" height="7" fill="#fff"/><path fill="#d6fbf6" d="M1180 440q60 -60 130 -62h220v62z"/>`
        + wins(1214, 478, 14, 3, 36, 40, 15, 0.75, 20, 22, '#3a587a') + wins(1214, 596, 14, 2, 36, 40, 16, 0.75, 20, 22, '#3a587a') + wins(1214, 712, 14, 1, 36, 40, 17, 0.8, 20, 22, '#3a587a')
        + `<path fill="none" stroke="#fff" stroke-width="3" d="M1480 440V330"/>` + mv('usflag', { ad: '2.4s', to: '1480px 336px' }, `<path fill="#ff5fa8" d="M1480 332h54l-10 12l10 12h-54z"/>`)
        + mv('usflicker', { ad: '2.6s', d: '-.5s', to: '1360px 460px' }, neon('M1250 520H1470', '#29e6e0', 6) + neon('M1250 536H1400', '#ff2f93', 4)) + `<path fill="#ff6aa8" d="M1250 776h260l-14 -26h-232z"/>`
        /* palms */
        + palm(560, 830, 470, -50, 1.5, 7, '#6b5240', '#2f8f52', '#1f6e44') + palm(1090, 830, 400, 40, 1.35, 9, '#6b5240', '#38a05a', '#23784a') + palm(60, 850, 300, 40, 1.1, 11, '#5a4636', '#2f8f52', '#1f6e44')
        /* car */
        + mv('usmove', { ad: '26s', dx: '1900px' }, `<ellipse cx="400" cy="858" rx="110" ry="9" fill="#000" opacity=".25"/><path fill="#ff6aa8" d="M300 850q0 -30 30 -32l50 -2l36 -26h80l30 26l54 2q16 2 20 18v14z"/><path fill="#9fdcf0" d="M394 818l30 -22h60l22 22z"/><path fill="#fff" d="M300 846h260v8h-260z" opacity=".5"/><g fill="#1a1a22"><circle cx="350" cy="860" r="19"/><circle cx="520" cy="860" r="19"/></g><g fill="#e8e8f0"><circle cx="350" cy="860" r="9"/><circle cx="520" cy="860" r="9"/></g><circle class="us-lit" cx="566" cy="842" r="6"/>`)
        + mv('uspar', { ad: '14s', dx: '12px' }, lamp(700, 830, 90, 1.1) + lamp(1140, 830, 90, 1.1))
        + finish(0.34); } });

  /* ---------- ORLANDO: Lake Eola fountain and fireworks ---------- */
  usSceneAdd({ key: 'place:orlando', label: 'Fountain and skyline at dusk', site: 'Lake Eola Park', colour: 'violet', mood: 'dreamy', season: 'any', tags: ['fountain', 'skyline', 'fireworks', 'dusk'],
    svg: () => { const s1 = U(), w1 = U(), g1 = U(); const sky = towers(5, -100, 1700, 560, 40, 190, '#35305f', 0.2); const skyFar = towers(3, -140, 1740, 560, 50, 170, '#5a4a88', false, 10);
      const jets = (() => { let o = ''; for (let i = -4; i <= 4; i++) { const a = i * 22; o += `<path fill="none" stroke="#fff" stroke-width="${i % 2 ? 4 : 6}" stroke-linecap="round" opacity=".85" d="M800 650Q${800 + i * 14} ${650 - 120 + Math.abs(i) * 14} ${800 + i * 36} ${660 - Math.abs(i) * -4}"/>`; } return o; })();
      return `<defs>${lin(s1, [[0, '#1f2160'], [0.35, '#5b3a96'], [0.65, '#d86a96'], [0.85, '#ffaa86'], [1, '#ffd196']])}${lin(w1, [[0, '#ffa98c'], [0.2, '#8a5aa6'], [0.6, '#33307a'], [1, '#161a4a']])}${lin(g1, [[0, '#2a2442'], [1, '#13132e']])}</defs>`
        + full(`url(#${s1})`) + stars(7, 60, 320) + sun(800, 540, 36, '#ffe4b0', '#ff9c8c')
        + cloud(300, 200, 1.2, '#d77ba8', 0.7, 62, 4, '#f0a8c4') + cloud(1250, 270, 1.0, '#c670a8', 0.7, 70, 22, '#ee9cc0') + streak(800, 410, 340, '#ffb69c', 0.5)
        + burst(420, 190, 110, '#ffd36a', '#fff3b0', '5.2s', '-1s') + burst(1180, 150, 130, '#ff7fb6', '#ffd0e4', '6.4s', '-3.4s') + burst(820, 120, 90, '#7fe0ff', '#e0f8ff', '4.8s', '-2.2s') + burst(1450, 300, 80, '#b08cff', '#e6dcff', '5.6s', '-4.4s') + burst(160, 330, 70, '#8fffc0', '#e0ffee', '6s', '-.4s')
        + birds(2, 4, 600, 360, '#3a2a58', 1, 600)
        + mv('uspar', { ad: '44s', dx: '14px' }, skyFar + `<rect x="-200" y="556" width="2000" height="8" fill="#5a4a88"/>`)
        + mv('uspar', { ad: '32s', dx: '10px' }, sky + `<path fill="#2c2755" d="M1010 560V300h60V560zM1020 300l20 -50l20 50zM300 560V330h46V560zM300 330l23 -40l23 40z"/><path stroke="#2c2755" stroke-width="3" d="M1040 250V214"/>`)
        /* lake */
        + `<rect y="560" width="1600" height="340" fill="url(#${w1})"/>`
        + `<g opacity=".3"><g transform="translate(0 1120) scale(1 -1)">${sky}</g></g>`
        + mv('uspar', { ad: '20s', dx: '14px' }, shimmer(5, 26, 100, 1500, 575, 800, '#ffd6e0', 70) + shimmer(6, 12, 300, 1300, 580, 780, '#9fa6ff', 60))
        /* fountain */
        + `<ellipse cx="800" cy="676" rx="150" ry="22" fill="#2c3a86"/><ellipse cx="800" cy="668" rx="120" ry="14" fill="#6f86d6"/><rect x="760" y="656" width="80" height="14" fill="#c9d6ff"/>`
        + mv('usglow', { ad: '2.4s', to: '800px 680px' }, jets) + `<ellipse class="us-lit" cx="800" cy="672" rx="70" ry="6"/><ellipse cx="800" cy="650" rx="26" ry="10" fill="#ffd6e8" opacity=".35"/>`
        + `<g fill="#fff">${puffs(742, 580, 5, '#ffffff', 10, -40, 2.4, 60, 1.4)}${puffs(858, 580, 5, '#ffffff', 10, 40, 2.8, 60, 1.4)}${puffs(800, 560, 5, '#ffffff', 12, 0, 2.6, 70, 1.3)}</g>`
        + mv('usbob', { ad: '3.6s', dy: '3px' }, mv('usmove', { ad: '70s', dx: '520px' }, `<path fill="#fff" d="M440 690q30 -42 54 -10q-6 24 -30 26q-22 0 -24 -16z"/><path fill="#fff" d="M440 690q-8 -34 12 -40l4 10q-8 8 -6 20z"/><circle cx="454" cy="646" r="5" fill="#fff"/><path fill="#ff9a50" d="M450 646l-9 4l9 3z"/>`))
        + mv('usbob', { ad: '4.4s', d: '-1s', dy: '3px' }, mv('usmove', { ad: '90s', dx: '-440px', d: '-30s' }, `<path fill="#fff" d="M1120 720q30 -42 54 -10q-6 24 -30 26q-22 0 -24 -16z"/><path fill="#fff" d="M1174 710q8 -34 -12 -40l-4 10q8 8 6 20z"/>`))
        /* near bank, oaks with string lights */
        + `<path fill="url(#${g1})" d="M-160 840Q300 800 800 820T1760 806V900H-160z"/>` + canopy('#1c1a3a', 800, 40, 33, -160, 520, 900) + canopy('#1c1a3a', 796, 44, 34, 1060, 1760, 900)
        + dots('M-160 790Q300 836 760 800', '#ffd68a', 6, 20, 'us-lamps') + dots('M880 806Q1300 840 1760 790', '#ffc0e0', 6, 20, 'us-lamps')
        + mv('uspar', { ad: '18s', dx: '10px' }, palm(120, 860, 330, 30, 1.2, 4, '#241c34', '#1c3a3a', '#142c30') + palm(1480, 860, 360, -40, 1.3, 6, '#241c34', '#1c3a3a', '#142c30'))
        + finish(0.3); } });

  /* ---------- TAMPA: Sunshine Skyway ---------- */
  usSceneAdd({ key: 'place:tampa', label: 'The Skyway bridge', site: 'Sunshine Skyway Bridge', colour: 'teal', mood: 'proud', season: 'any', tags: ['bridge', 'bay', 'pelican'],
    svg: () => { const s1 = U(), w1 = U(); let cab = ''; for (let i = 1; i <= 13; i++) { const dx = i * 40; cab += `M800 ${150 + i * 6}L${800 - dx} ${500 + dx * 0.04}M800 ${150 + i * 6}L${800 + dx} ${500 + dx * 0.04}`; }
      let cars = ''; for (let i = 0; i < 6; i++) cars += `M${420 + i * 62} 492h14`;
      return `<defs>${lin(s1, [[0, '#2c7fc0'], [0.4, '#7fc2e4'], [0.7, '#ffe2b0'], [1, '#ffc88c']])}${lin(w1, [[0, '#ffcf9a'], [0.15, '#58b9cf'], [0.6, '#1f8aa8'], [1, '#0f5c7c']])}</defs>`
        + full(`url(#${s1})`) + rays(280, 400, 1100, '#fff2c8', 0.22) + sun(280, 420, 44, '#fffbe8', '#ffe8a8')
        + streak(1000, 120, 320, '#fff', 0.6) + cloud(1230, 230, 1.5, '#cfe3f0', 0.92, 64, 8) + cloud(520, 180, 1.0, '#d8e8f2', 0.92, 52, 22) + cloud(1480, 120, 0.9, '#e0edf6', 0.85, 70, 40) + cloud(100, 270, 0.8, '#f6e6d0', 0.85, 58, 16, '#fff6e6')
        + `<g opacity=".7">${ridge('#8fb2c4', 538, 12, 14, 8, 560)}</g>` + `<g fill="#7aa0b6" opacity=".8">${towers(9, 80, 330, 540, 12, 70, '#7aa0b6', false, 8)}</g>`
        + `<rect y="540" width="1600" height="360" fill="url(#${w1})"/>` + haze(530, 40, '#ffe7c0', 0.8)
        + mv('uspar', { ad: '36s', dx: '12px' }, shimmer(5, 40, 80, 700, 556, 780, '#fff2c8', 60) + shimmer(6, 50, 700, 1600, 560, 880, '#bff0f0', 60))
        /* bridge: deck, pylon, fans */
        + `<path fill="#d8d8d4" d="M-160 560Q300 560 560 520T800 492T1040 520T1760 560V572Q1300 572 1040 534T800 506T560 534T-160 572z"/>`
        + `<path fill="#a8b2b8" d="M-160 572Q300 572 560 534T800 506T1040 534T1760 572V582Q1300 582 1040 544T800 516T560 544T-160 582z"/>`
        + `<g fill="#cfd4d8">${Array.from({ length: 22 }, (_, i) => `<rect x="${-100 + i * 90}" y="${572 + Math.round(Math.abs(Math.sin(i * 0.33)) * 0)}" width="16" height="${150 - (i % 2) * 8}"/>`).join('')}</g>`
        + `<g fill="#6a8c9a" opacity=".8">${Array.from({ length: 22 }, (_, i) => `<rect x="${-100 + i * 90}" y="700" width="16" height="30"/>`).join('')}</g>`
        + `<path fill="#e8e6dc" d="M776 506L792 130H808L824 506z"/><path fill="#d6d4c8" d="M800 130L824 506h-24z"/><rect x="770" y="140" width="60" height="10" fill="#c8c6b8"/>`
        + `<path fill="none" stroke="#ffc928" stroke-width="3.2" d="${cab}"/>` + `<path class="us-lit" fill="none" stroke-width="4" d="M800 128h0"/>`
        + mv('usflicker', { ad: '1.4s', to: '800px 124px' }, `<circle cx="800" cy="124" r="6" fill="#ff4a3a"/>`)
        + `<path fill="none" stroke="#1d2a38" stroke-width="5" stroke-linecap="round" stroke-dasharray="0 28" d="M-160 540Q300 540 560 506T800 480T1040 506T1760 540"/>`
        + mv('usmove', { ad: '16s', dx: '1900px' }, `<path fill="none" stroke="#e64a3c" stroke-width="9" stroke-linecap="round" d="M300 543h16M334 543h14"/><path class="us-lit" fill="none" stroke-width="4" d="M350 541h0"/>`) + mv('usmove', { ad: '22s', d: '-9s', dx: '-1900px' }, `<path fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" d="M900 546h14M930 546h18"/><path class="us-lit" fill="none" stroke-width="4" d="M898 545h0"/>`)
        /* cargo ship under the span */
        + mv('usmove', { ad: '120s', dx: '700px' }, `<path fill="#2c3e50" d="M560 650h330l-26 36h-290z"/><rect x="580" y="606" width="260" height="44" fill="#cf4a3a"/><rect x="620" y="580" width="30" height="26" fill="#f4f0e8"/><g fill="#ffc928"><rect x="690" y="590" width="40" height="16"/><rect x="740" y="590" width="40" height="16"/></g><path fill="#fff" opacity=".5" d="M540 690q80 -12 400 0q-100 14 -400 0z"/>`)
        + mv('usbob', { ad: '5s', dy: '4px' }, `<path fill="#fff" d="M1180 700l60 -110l20 110z"/><path fill="#ffd0a0" d="M1160 704h110l-16 14h-80z"/><path fill="#fff" d="M1190 704l-34 -60"/>`)
        + birds(14, 7, 1000, 330, '#2c3a48', 1.5, 800) + birds(15, 4, 400, 260, '#3a4a58', 1, 600)
        /* foreground pier, pelican */
        + `<path fill="#4a3a2c" d="M-160 836H1760V862H-160z"/><g fill="#3a2c20">${Array.from({ length: 12 }, (_, i) => `<rect x="${-100 + i * 150}" y="862" width="22" height="60"/>`).join('')}</g><g fill="#5a4838">${Array.from({ length: 12 }, (_, i) => `<rect x="${-100 + i * 150}" y="790" width="18" height="50"/>`).join('')}</g>`
        + mv('usbob', { ad: '3.2s', dy: '2px' }, `<g transform="translate(1260 790)"><path fill="#e8e0d0" d="M-60 0q0 -44 40 -52q44 -6 60 18l8 34z"/><path fill="#a89c88" d="M-52 -8q30 -22 70 -14l-4 20q-30 -8 -66 4z"/><path fill="#e8e0d0" d="M30 -40q14 -34 4 -56q-4 -12 10 -14l8 14q-4 28 -14 66z"/><circle cx="50" cy="-100" r="11" fill="#e8e0d0"/><path fill="#f0a040" d="M56 -106l60 8q-4 12 -60 14z"/><path fill="#c87820" d="M56 -90q40 2 58 -6l-2 4q-30 12 -60 6z"/><circle cx="52" cy="-103" r="2.4" fill="#222"/></g>`)
        + mv('ussway', { ad: '5s', to: '500px 900px' }, `<path fill="#3a8a4a" d="M120 900q-10 -80 -60 -140q50 40 80 100q10 -90 40 -150q-14 80 -4 190z"/><path fill="#4aa05a" d="M-20 900q10 -80 50 -120q-24 70 0 120z"/>`)
        + finish(0.3); } });

  /* ---------- NASHVILLE: skyline at sunset with the pedestrian bridge ---------- */
  usSceneAdd({ key: 'place:nashville', label: 'Skyline and a guitar sound', site: 'Music City at sunset', colour: 'orange', mood: 'energetic', season: 'any', tags: ['skyline', 'music', 'guitar', 'bridge', 'sunset'],
    svg: () => { const s1 = U(), w1 = U(), g1 = U(); let truss = '', arches = '';
      for (let i = 0; i < 16; i++) { const x = -160 + i * 120; truss += `M${x} 640L${x + 60} 560L${x + 120} 640`; arches += `M${x} 640Q${x + 60} 700 ${x + 120} 640`; }
      return `<defs>${lin(s1, [[0, '#35307a'], [0.3, '#a64a8c'], [0.55, '#ff7a64'], [0.8, '#ffb25a'], [1, '#ffd98a']])}${lin(w1, [[0, '#ffa266'], [0.2, '#b05a7a'], [0.6, '#3a3a78'], [1, '#202a58']])}${lin(g1, [[0, '#2a2038'], [1, '#14122a']])}</defs>`
        + full(`url(#${s1})`) + stars(21, 50, 220) + rays(1180, 470, 1100, '#ffd9a0', 0.26) + sun(1180, 480, 52, '#fff3c8', '#ffb468')
        + streak(520, 160, 300, '#ffb4a0', 0.55) + cloud(300, 300, 1.3, '#e0709a', 0.85, 70, 8, '#ffa8a8') + cloud(1000, 250, 1.1, '#d86a8c', 0.85, 62, 30, '#ffa890') + cloud(1450, 150, 0.9, '#c85a90', 0.8, 52, 14, '#f08ca8')
        + birds(9, 6, 500, 380, '#3a2848', 1.2, 700)
        + mv('uspar', { ad: '40s', dx: '12px' }, towers(11, -140, 1740, 580, 30, 120, '#7a4a80', false, 8))
        + mv('uspar', { ad: '30s', dx: '10px' }, towers(12, -80, 1700, 580, 50, 190, '#43306a', 0.3)
          /* the twin-spire tower */
          + `<path fill="#2e2456" d="M520 580V270l16 -84l12 74l12 -78l14 78l10 -68l14 78l10 -78l8 82V580z"/><path fill="#3c2f6a" d="M520 580V320h32V580z"/>` + wins(566, 320, 4, 10, 16, 24, 8, 0.65, 7, 8)
          + `<path fill="#2e2456" d="M940 580V330h80V580zM960 330l20 -80l20 80z"/>` + wins(950, 350, 4, 9, 16, 24, 9, 0.6, 7, 8) + `<path fill="#2e2456" d="M240 580V380h90V580zM1300 580V400h100V580z"/>` + wins(256, 396, 4, 7, 18, 22, 10, 0.6, 7, 8) + wins(1316, 416, 4, 7, 20, 22, 11, 0.6, 7, 8)
          )
        + haze(520, 80, '#ffb878', 0.35)
        + `<rect y="580" width="1600" height="320" fill="url(#${w1})"/>`
        + `<g opacity=".28"><g transform="translate(0 1160) scale(1 -1)">${towers(12, -80, 1700, 580, 70, 250, '#43306a', false)}</g></g>`
        + mv('uspar', { ad: '22s', dx: '14px' }, shimmer(4, 28, 100, 1500, 596, 820, '#ffd8a8', 70) + shimmer(8, 12, 300, 1300, 600, 800, '#a0a0ff', 56))
        /* truss bridge */
        + `<path fill="none" stroke="#2a1e38" stroke-width="7" stroke-linejoin="round" d="${truss}M-160 640H1760"/><path fill="none" stroke="#2a1e38" stroke-width="4" d="${arches}"/><rect x="-160" y="640" width="1920" height="14" fill="#1f1830"/><rect x="-160" y="560" width="1920" height="5" fill="#2a1e38"/>`
        + `<g fill="#1f1830">${Array.from({ length: 6 }, (_, i) => `<rect x="${100 + i * 280}" y="654" width="30" height="${300}"/>`).join('')}</g>`
        + dots('M-160 556H1760', '#ffd68a', 7, 26, 'us-lamps') + dots('M-160 628H1760', '#ffb868', 6, 30, 'us-lamps')
        + mv('usmove', { ad: '34s', dx: '1900px' }, `<g fill="#1c1426"><circle cx="300" cy="620" r="7"/><rect x="293" y="626" width="14" height="16"/><circle cx="330" cy="618" r="7"/><rect x="323" y="624" width="14" height="18"/><circle cx="360" cy="621" r="6"/><rect x="354" y="626" width="12" height="16"/></g>`)
        + mv('usmove', { ad: '46s', d: '-20s', dx: '-1900px' }, `<g fill="#1c1426"><circle cx="1100" cy="620" r="7"/><rect x="1093" y="626" width="14" height="16"/><circle cx="1130" cy="619" r="7"/><rect x="1123" y="625" width="14" height="17"/></g>`)
        /* notes */
        + mv('usglide', { ad: '12s', dx: '300px', dy: '-200px' }, note(380, 520, 1.4, '#ffe8c0')) + mv('usglide', { ad: '15s', d: '-6s', dx: '300px', dy: '-220px' }, note(480, 470, 1.1, '#ffd0e0')) + mv('usglide', { ad: '13s', d: '-3s', dx: '260px', dy: '-180px' }, note(320, 440, 1.2, '#ffc8a0'))
        + `<path fill="url(#${g1})" d="M-160 866Q400 840 800 858T1760 850V900H-160z"/>`
        + finish(0.32); } });

  /* ---------- MEMPHIS: the M bridge, the pyramid and the river by night ---------- */
  usSceneAdd({ key: 'place:memphis', label: 'The bridge and the pyramid by night', site: 'The Mississippi at Memphis', colour: 'teal', mood: 'dreamy', season: 'any', tags: ['bridge', 'pyramid', 'river', 'night', 'steamboat'],
    svg: () => { const s1 = U(), w1 = U(), m1 = U(), g1 = U();
      const arc = (x0, x1, top, off) => `M${x0} ${570 + off}Q${x0 + (x1 - x0) * 0.08} ${top + off} ${(x0 + x1) / 2} ${top + off}Q${x1 - (x1 - x0) * 0.08} ${top + off} ${x1} ${570 + off}`;
      const arches = arc(380, 860, 290, 0) + arc(860, 1340, 290, 0), arches2 = arc(380, 860, 290, 26) + arc(860, 1340, 290, 26);
      let hang = ''; for (let i = 0; i < 2; i++) { const x0 = 380 + i * 480; for (let k = 1; k < 24; k++) { const t = k / 24, x = x0 + 480 * t, y = 570 - 4 * 280 * t * (1 - t) * 0.92 + 8; hang += `M${R(x)} ${R(y + 18)}V568`; } }
      return `<defs>${lin(s1, [[0, '#0d1b44'], [0.4, '#244f86'], [0.7, '#5f8fb4'], [1, '#f3b88a']])}${lin(w1, [[0, '#e6a888'], [0.12, '#4d86a8'], [0.5, '#1c4a6e'], [1, '#0d2442']])}${radU(m1, [[0, '#dff2ff', 0.7], [1, '#dff2ff', 0]], 1220, 200, 620)}${lin(g1, [[0, '#17283a'], [1, '#0a1420']])}</defs>`
        + full(`url(#${s1})`) + stars(31, 90, 380) + `<rect width="1600" height="900" fill="url(#${m1})"/>` + mv('usglow', { ad: '7s', to: '1220px 200px' }, `<circle cx="1220" cy="200" r="64" fill="#f6fbff"/><circle cx="1198" cy="184" r="12" fill="#d8e6f2"/><circle cx="1240" cy="222" r="16" fill="#d8e6f2"/><circle cx="1228" cy="170" r="7" fill="#d8e6f2"/>`)
        + cloud(300, 250, 1.2, '#6f8fb6', 0.7, 66, 6, '#a8c0dc') + cloud(940, 140, 0.9, '#7090b8', 0.6, 58, 30, '#b0c8e2') + streak(1480, 330, 220, '#b8d0ea', 0.4) + birds(4, 3, 800, 300, '#14243a', 1.1, 600)
        + mv('uspar', { ad: '40s', dx: '12px' }, towers(14, 1360, 1760, 570, 50, 200, '#1e3552', 0.3, 8) + `<g opacity=".8">${towers(15, -160, 340, 570, 20, 80, '#25405e', false, 8)}</g>` + haze(520, 60, '#f0b890', 0.5))
        /* the pyramid on the left bank */
        + `<path fill="#a9c6d8" d="M-40 570L130 330L300 570z"/><path fill="#7fa2bc" d="M130 330L300 570H130z"/><path fill="none" stroke="#e8f4fc" stroke-width="2" opacity=".7" d="M130 330V570M30 450H230M-4 510H264M80 392L210 570M180 392L50 570"/><path class="us-lit" fill="none" stroke-width="3" d="M130 340V570M60 440L130 340L200 440"/>`
        + mv('usflicker', { ad: '2s', to: '130px 330px' }, `<circle cx="130" cy="326" r="7" fill="#ff4a3a"/>`)
        /* river */
        + `<rect y="570" width="1600" height="330" fill="url(#${w1})"/>`
        + `<g opacity=".45"><g transform="translate(0 1140) scale(1 -1)"><path fill="#a9c6d8" d="M-40 570L130 330L300 570z"/><path fill="none" stroke="#e8f4fc" stroke-width="4" d="${arches}"/></g></g>`
        + mv('uspar', { ad: '24s', dx: '16px' }, shimmer(2, 24, 100, 1500, 590, 830, '#bfe6ff', 80) + shimmer(3, 12, 1000, 1500, 590, 700, '#fff6d0', 60))
        /* the bridge */
        + `<rect x="-160" y="568" width="1920" height="12" fill="#26384c"/><rect x="-160" y="580" width="1920" height="6" fill="#3a526a"/>`
        + `<g fill="#26384c">${[380, 860, 1340].map(x => `<rect x="${x - 14}" y="580" width="28" height="${x === 860 ? 330 : 320}"/>`).join('')}</g><g fill="#2f465e">${[120, 620, 1100, 1560].map(x => `<rect x="${x - 10}" y="586" width="20" height="320"/>`).join('')}</g>`
        + `<path fill="none" stroke="#3b5a78" stroke-width="2.4" d="${hang}"/>`
        + `<path fill="none" stroke="#7ca4c8" stroke-width="16" stroke-linejoin="round" d="${arches}"/><path fill="none" stroke="#3a5a78" stroke-width="6" d="${arches2}"/>`
        + dots(arches, '#ffe4a8', 8, 22, 'us-lamps') + dots('M-160 560H1760', '#ffd88a', 6, 34, 'us-lamps')
        + mv('usmove', { ad: '20s', dx: '1900px' }, `<path fill="none" stroke="#ff6a5a" stroke-width="8" stroke-linecap="round" d="M200 573h12M236 573h10"/><path class="us-lit" fill="none" stroke-width="4" d="M250 571h0"/>`) + mv('usmove', { ad: '26s', d: '-12s', dx: '-1900px' }, `<path fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" d="M1200 574h12M1230 574h16"/><path class="us-lit" fill="none" stroke-width="4" d="M1196 573h0"/>`)
        /* riverboat */
        + mv('usmove', { ad: '110s', dx: '760px' }, `<g transform="translate(560 700)"><path fill="#f2efe6" d="M-10 0h250l-20 30h-220z"/><rect x="10" y="-26" width="200" height="26" fill="#fff"/><rect x="34" y="-50" width="140" height="24" fill="#f2efe6"/><rect x="60" y="-70" width="86" height="20" fill="#fff"/><rect x="68" y="-110" width="12" height="40" fill="#3a3a44"/><rect x="126" y="-110" width="12" height="40" fill="#3a3a44"/><rect x="66" y="-114" width="16" height="6" fill="#c42c2c"/><rect x="124" y="-114" width="16" height="6" fill="#c42c2c"/>`
          + `<path class="us-lit" fill="none" stroke-width="7" d="M20 -13h6M40 -13h6M60 -13h6M80 -13h6M100 -13h6M120 -13h6M140 -13h6M160 -13h6M180 -13h6M46 -38h6M70 -38h6M94 -38h6M118 -38h6M142 -38h6"/><path fill="none" stroke="#2b5a86" stroke-width="3" d="M-10 0h250"/>`
          + `</g>` + mv('usspin', { ad: '5s', to: '556px 722px' }, `<circle cx="556" cy="722" r="26" fill="none" stroke="#c43c3c" stroke-width="5"/><path fill="none" stroke="#c43c3c" stroke-width="4" d="M530 722H582M556 696V748M538 704L574 740M538 740L574 704"/>`) + puffs(636, 596, 5, '#dfe8f2', 18, 90, 4, -90, 2.4))
        /* near bank with willows and lamps */
        + `<path fill="url(#${g1})" d="M-160 850Q300 810 800 840T1760 820V900H-160z"/>` + canopy('#0d1d2c', 846, 30, 61, -160, 360) + canopy('#0d1d2c', 826, 34, 62, 1240, 1760)
        + mv('ussway', { ad: '7s', to: '200px 760px' }, `<path fill="none" stroke="#17384a" stroke-width="5" d="M120 780q-70 0 -90 150M170 780q-60 20 -60 150M220 770q-30 30 -20 160M270 780q20 20 30 140M60 786q-60 20 -70 120"/>`) + mv('ussway', { ad: '8s', d: '-2s', to: '1500px 760px' }, `<path fill="none" stroke="#17384a" stroke-width="5" d="M1480 780q-70 0 -90 150M1530 780q-60 20 -60 150M1580 770q-30 30 -20 160M1630 780q20 20 30 140"/>`)
        + lamp(440, 870, 100, 1.2) + lamp(1160, 862, 100, 1.2) + dots('M440 770Q800 820 1160 762', '#ffd88a', 6, 22, 'us-lamps')
        + finish(0.3); } });

  /* ---------- LOUISVILLE: Churchill Downs at post time ---------- */
  const horse = (x, y, s, coat, dark, silk, silk2, ad, d) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="2" rx="90" ry="8" fill="#000" opacity=".16"/>`
    + mv('usbob', { ad: ad, d: d, dy: '5px' }, `<path fill="none" stroke="${dark}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" d="M38 -56L90 -36L116 -52M26 -52L64 -22L88 -16M-44 -58L-92 -30L-116 -8M-34 -54L-70 -22L-62 2"/><ellipse cx="0" cy="-72" rx="64" ry="26" fill="${coat}"/><path fill="${coat}" d="M44 -88L84 -134L104 -126L68 -64z"/><path fill="${coat}" d="M84 -134L124 -112L120 -98L92 -108L80 -122z"/><path fill="${dark}" d="M84 -134l-4 -14l12 8z"/><path fill="none" stroke="${dark}" stroke-width="7" stroke-linecap="round" d="M-60 -82q-46 -2 -60 44M60 -122q-10 -4 -20 14"/><path fill="${silk}" d="M-14 -102q22 -34 50 -24l-4 28q-22 10 -46 -4z"/><circle cx="44" cy="-134" r="10" fill="${silk2}"/><path fill="none" stroke="${silk}" stroke-width="6" stroke-linecap="round" d="M30 -112L76 -108"/>`) + '</g>';
  usSceneAdd({ key: 'place:louisville', label: 'Twin spires at post time', site: 'Churchill Downs', colour: 'red', mood: 'energetic', season: ['spring'], tags: ['derby', 'horse', 'spires', 'racing', 'roses'],
    svg: () => { const s1 = U(), t1 = U(), g1 = U(), f1 = U();
      const crowd = (seed, n, x0, x1, y0, y1) => { const r = rnd(seed); let d = ''; const cols = ['#e04a6a', '#f2c94a', '#fff', '#5a8ad8', '#e0803a', '#a05ac8']; const o = {}; for (let i = 0; i < n; i++) { const c = cols[i % 6]; (o[c] = o[c] || []).push(`M${R(x0 + r() * (x1 - x0))} ${R(y0 + r() * (y1 - y0))}h0`); } return Object.entries(o).map(([c, v]) => `<path fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round" d="${v.join('')}"/>`).join(''); };
      const spire = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-34" y="0" width="68" height="120" fill="#f4efe6"/><rect x="-42" y="-8" width="84" height="12" fill="#d9d2c4"/><path fill="#f4efe6" d="M-30 -8v-70h60v70z"/><path fill="#e8e0d0" d="M-30 -78h60l-6 -10h-48z"/><path fill="#6a6c78" d="M-36 -88h72l-36 -110z"/><path fill="#8a8c98" d="M0 -198L36 -88H0z"/><rect x="-1.5" y="-236" width="3" height="40" fill="#c0b8a8"/>`
        + mv('usflag', { ad: '2.2s', to: '0px -234px' }, `<path fill="#d8283a" d="M2 -236h30l-8 8l8 8h-30z"/>`) + `<path fill="#d9d2c4" d="M-18 -66h10v40h-10zM8 -66h10v40h-10z"/><path fill="#3a4a5a" d="M-17 -60h8v30h-8zM9 -60h8v30h-8z"/><g fill="#3a4a5a"><rect x="-22" y="20" width="14" height="40" rx="7"/><rect x="8" y="20" width="14" height="40" rx="7"/><rect x="-22" y="76" width="14" height="30" rx="7"/><rect x="8" y="76" width="14" height="30" rx="7"/></g></g>`;
      let flags = ''; const fr = rnd(8); for (let i = 0; i < 26; i++) flags += `<path fill="${['#d8283a', '#fff', '#f2c94a', '#2a5ab8'][i % 4]}" d="M${-160 + i * 76} 470l12 0l-6 20z"/>`;
      return `<defs>${lin(s1, [[0, '#3a8ee0'], [0.5, '#8fc8f4'], [1, '#e2f2fb']])}${lin(t1, [[0, '#b8845a'], [1, '#8a5c3a']])}${lin(g1, [[0, '#6cbf4a'], [1, '#3f8a34']])}${lin(f1, [[0, '#f8f4ea'], [1, '#e6dccc']])}</defs>`
        + full(`url(#${s1})`) + sun(1400, 130, 36, '#fffbe0', '#fff2a8') + streak(300, 130, 280, '#fff', 0.7) + cloud(260, 220, 1.3, '#d6e6f4', 0.96, 60, 6) + cloud(1050, 130, 1.0, '#dcebf6', 0.95, 50, 22) + cloud(1500, 270, 0.9, '#d2e2f0', 0.9, 66, 36) + cloud(700, 300, 0.7, '#e2eef8', 0.85, 74, 40)
        + birds(6, 4, 600, 200, '#34506e', 1, 700)
        + mv('uspar', { ad: '34s', dx: '10px' }, canopy('#5ea84a', 450, 20, 41, -160, 1760, 500) + canopy('#4a9040', 462, 18, 42, -160, 1760, 520))
        /* the grandstand */
        + `<rect x="120" y="420" width="1360" height="260" fill="url(#${f1})"/><rect x="120" y="408" width="1360" height="16" fill="#d8283a"/><rect x="120" y="470" width="1360" height="8" fill="#d8d0c0"/><rect x="120" y="560" width="1360" height="8" fill="#d8d0c0"/>`
        + `<g opacity=".9">${flags}</g>` + wins(150, 436, 38, 1, 36, 0, 3, 1, 22, 24, '#5a7090') + wins(150, 492, 38, 2, 36, 38, 4, 0.9, 22, 24, '#5a7090')
        + crowd(5, 90, 140, 1460, 430, 464) + crowd(6, 80, 140, 1460, 496, 556)
        + `<path fill="#e6dccc" d="M700 420h200v-30l-100 -40l-100 40z"/><path fill="#d8283a" d="M700 390l100 -40l100 40v8l-100 -40l-100 40z"/>`
        + spire(740, 292, 1) + spire(860, 292, 1)
        + `<rect x="720" y="520" width="160" height="150" fill="#d8283a"/><path fill="#f4efe6" d="M740 670v-80q0 -30 28 -30q28 0 28 30v80zM804 670v-80q0 -30 28 -30q28 0 28 30v80z" opacity=".95"/>`
        + `<g fill="#3a4a5a">${Array.from({ length: 7 }, (_, i) => `<rect x="${160 + i * 190}" y="590" width="26" height="90"/>`).join('')}</g>`
        + `<rect y="680" width="1600" height="220" fill="url(#${g1})"/>`
        /* roses and rail */
        + `<g>${Array.from({ length: 8 }, (_, i) => `<ellipse cx="${100 + i * 200}" cy="700" rx="90" ry="22" fill="#2f7a34"/>`).join('')}</g><path fill="none" stroke="#d8283a" stroke-width="12" stroke-linecap="round" stroke-dasharray="0 20" d="M0 696H1600M0 706H1600"/><path fill="none" stroke="#f08aa0" stroke-width="8" stroke-linecap="round" stroke-dasharray="0 24" d="M10 700H1600"/>`
        + `<rect y="716" width="1600" height="184" fill="url(#${t1})"/><path fill="#a0724a" d="M0 760Q800 744 1600 760V776Q800 760 0 776z" opacity=".55"/><rect y="712" width="1600" height="8" fill="#fff"/><g fill="#fff">${Array.from({ length: 27 }, (_, i) => `<rect x="${i * 60 - 8}" y="712" width="8" height="30"/>`).join('')}</g>`
        + mv('uspar', { ad: '1.6s', dx: '6px' }, `<path fill="none" stroke="#e8c898" stroke-width="5" stroke-dasharray="26 80" opacity=".5" d="M0 800H1600M0 850H1600"/>`)
        + mv('usmove', { ad: '8s', dx: '2600px' }, horse(1180, 800, 1.35, '#6a3a22', '#3a2014', '#d8283a', '#fff', '.55s', '0s'))
        + mv('usmove', { ad: '8.6s', d: '-1.4s', dx: '2600px' }, horse(1000, 780, 1.2, '#2c2420', '#14100e', '#2a5ab8', '#f2c94a', '.5s', '-.2s'))
        + mv('usmove', { ad: '9.2s', d: '-3s', dx: '2600px' }, horse(820, 756, 1.05, '#a0663a', '#5a3620', '#2f9a4a', '#fff', '.6s', '-.4s'))
        + mv('usmove', { ad: '10s', d: '-5s', dx: '2600px' }, horse(650, 736, 0.9, '#8a8a90', '#4a4a50', '#f2c94a', '#d8283a', '.55s', '-.1s'))
        + finish(0.3); } });

  /* ---------- NEW ORLEANS: gas lamps and the cathedral at dusk ---------- */
  const bal = (x, y, w, col) => { let rails = ''; for (let i = 0; i <= w; i += 12) rails += `M${x + i} ${y}v-34`; return `<rect x="${x - 6}" y="${y}" width="${w + 12}" height="8" fill="${col}"/><path fill="none" stroke="${col}" stroke-width="3" d="${rails}M${x} ${y - 34}h${w}"/><path fill="none" stroke="${col}" stroke-width="3" stroke-dasharray="6 10" d="M${x} ${y - 14}h${w}"/>`; };
  usSceneAdd({ key: 'place:new-orleans', label: 'Gas lamps and the cathedral', site: 'The French Quarter at dusk', colour: 'violet', mood: 'dreamy', season: 'any', tags: ['french quarter', 'lamp', 'jazz', 'cathedral', 'balcony'],
    svg: () => { const s1 = U(), st = U(); const moss = (x, y, n, seed) => { const r = rnd(seed); let d = ''; for (let i = 0; i < n; i++) { const xx = x + i * 16 + r() * 8, l = 30 + r() * 60; d += `M${R(xx)} ${y}q${R(r() * 8 - 4)} ${R(l / 2)} ${R(r() * 6 - 3)} ${R(l)}`; } return `<path fill="none" stroke="#6f7f6a" stroke-width="3" stroke-linecap="round" d="${d}"/>`; };
      const house = (x, w, top, fill, shut, seed, floors) => { let o = `<rect x="${x}" y="${top}" width="${w}" height="${720 - top}" fill="${fill}"/><rect x="${x}" y="${top - 12}" width="${w}" height="14" fill="#fff" opacity=".35"/>`; const n = Math.floor(w / 62);
        for (let f = 0; f < floors; f++) { const y = top + 24 + f * 108; let pw = '', sh = ''; for (let i = 0; i < n; i++) { const cx = R(x + 32 + i * (w - 64) / Math.max(1, n - 1)); pw += `M${cx} ${y + 14}v38`; sh += `M${cx - 20} ${y}v64M${cx + 20} ${y}v64`; }
          o += `<path fill="none" stroke="${shut}" stroke-width="8" d="${sh}"/><path fill="none" stroke="#2d2748" stroke-width="26" stroke-linecap="round" opacity=".6" d="${pw}"/><path class="us-lit" fill="none" stroke-width="20" stroke-linecap="round" d="${pw}"/>` + bal(x + 6, y + 82, w - 12, '#1d1a2a'); } return o; };
      return `<defs>${lin(s1, [[0, '#1c1c5a'], [0.4, '#5a3c92'], [0.7, '#d4609a'], [1, '#ffaa88']])}${lin(st, [[0, '#4a3f58'], [1, '#26202f']])}</defs>`
        + full(`url(#${s1})`) + stars(17, 60, 300) + sun(800, 520, 30, '#ffe0b0', '#ff9ca0') + cloud(260, 190, 1.2, '#c96a9e', 0.75, 64, 5, '#f2a0c0') + cloud(1320, 150, 1.0, '#b85c98', 0.75, 70, 22, '#e890b8') + streak(900, 300, 320, '#ffb0b8', 0.45)
        + mv('usglide', { ad: '18s', dx: '600px', dy: '-30px' }, `<path fill="#1c1630" d="M300 300q14 -10 24 0q-10 0 -12 8q-6 -8 -12 -8z"/>`) + birds(3, 4, 1000, 230, '#2a1c3c', 1.1, 600)
        /* cathedral */
        + mv('uspar', { ad: '36s', dx: '8px' }, `<rect x="700" y="400" width="200" height="320" fill="#e4d6bc"/><path fill="#d6c6a8" d="M690 400h220l-110 -64z"/><rect x="744" y="260" width="112" height="144" fill="#e4d6bc"/><path fill="#4c4c70" d="M736 262h128l-64 -150z"/><path fill="#62628a" d="M800 112l64 150h-64z"/><path stroke="#4c4c70" stroke-width="3" d="M800 112V76"/>`
          + `<rect x="650" y="340" width="60" height="380" fill="#e4d6bc"/><path fill="#4c4c70" d="M642 342h76l-38 -100z"/><rect x="890" y="340" width="60" height="380" fill="#e4d6bc"/><path fill="#4c4c70" d="M882 342h76l-38 -100z"/>`
          + `<g fill="#3a3358">${[[726, 560], [776, 560], [826, 560]].map(([x, y]) => `<path d="M${x} 720v-${720 - y - 24}q0 -24 24 -24q24 0 24 24v${720 - y - 24}z"/>`).join('')}</g><g fill="#3a3358"><path d="M772 330v-40q0 -22 28 -22q28 0 28 22v40z"/><path d="M730 456v-30q0 -16 20 -16q20 0 20 16v30zM830 456v-30q0 -16 20 -16q20 0 20 16v30z"/></g>`
          + `<path class="us-lit" d="M780 328v-36q0 -16 20 -16q20 0 20 16v36z"/><path class="us-lit" d="M736 452v-26q0 -10 14 -10q14 0 14 10v26zM836 452v-26q0 -10 14 -10q14 0 14 10v26z"/><circle class="us-lit" cx="800" cy="372" r="12"/><path class="us-lit" d="M661 440v-24q0 -9 9 -9q9 0 9 9v24zM921 440v-24q0 -9 9 -9q9 0 9 9v24z"/>`
          + mv('usflicker', { ad: '3s', to: '800px 76px' }, `<circle cx="800" cy="72" r="5" class="us-lit"/>`))
        /* gardens and trees */
        + `<rect x="560" y="660" width="480" height="70" fill="#2c4a3c"/>` + canopy('#2a5a40', 664, 18, 71, 560, 1040, 740)
        + mv('uspar', { ad: '16s', dx: '8px' }, palm(640, 700, 150, -14, 0.8, 5, '#3a2c28', '#1f5a3a', '#144a30') + palm(960, 700, 170, 16, 0.85, 6, '#3a2c28', '#1f5a3a', '#144a30'))
        /* flanking houses */
        + mv('uspar', { ad: '28s', dx: '8px' }, house(150, 440, 330, '#e8a860', '#2e6a52', 1, 3) + house(-190, 340, 380, '#e87a90', '#3a5a8a', 2, 3))
        + mv('uspar', { ad: '28s', d: '-8s', dx: '8px' }, house(1010, 420, 360, '#6cb8aa', '#7a3a58', 3, 3) + house(1430, 340, 330, '#f0d078', '#2e6a52', 4, 3))
        + `<g fill="#3e6a48">${[[220, 468], [320, 468], [1090, 498], [1220, 498], [1520, 438]].map(([x, y]) => `<path d="M${x - 14} ${y}q14 34 28 0z"/>`).join('')}</g>`
        + `<path fill="none" stroke="#2a2030" stroke-width="18" stroke-linecap="round" d="M1780 250Q1500 250 1250 330"/>` + mv('ussway', { ad: '6s', to: '1500px 270px' }, moss(1260, 322, 28, 3))
        /* street */
        + `<rect y="716" width="1600" height="184" fill="url(#${st})"/><path fill="#ffd4a0" opacity=".12" d="M0 740H1600V752H0zM0 790H1600V806H0z"/><path fill="none" stroke="#1a1522" stroke-width="2" stroke-dasharray="14 10" opacity=".5" d="M0 760H1600M0 820H1600M0 870H1600"/><rect y="706" width="1600" height="14" fill="#7a6a76"/>`
        + `<path fill="none" stroke="#1a1522" stroke-width="3" stroke-dasharray="3 12" d="M540 700H1060"/>`
        + dots('M-160 470Q300 540 760 440M840 440Q1300 540 1760 460', '#ffd890', 7, 24, 'us-lamps')
        + mv('uspar', { ad: '12s', dx: '14px' }, lamp(480, 800, 230, 1.7) + lamp(1120, 800, 230, 1.7))
        + mv('usflicker', { ad: '.9s', to: '480px 556px' }, `<circle cx="480" cy="556" r="24" fill="#ffe8a8" opacity=".35"/>`) + mv('usflicker', { ad: '1.1s', d: '-.3s', to: '1120px 556px' }, `<circle cx="1120" cy="556" r="24" fill="#ffe8a8" opacity=".35"/>`)
        /* the trumpeter and notes */
        + `<g fill="#1a1426"><circle cx="1330" cy="740" r="14"/><path d="M1312 756h36l8 90h-14l-6 -50l-6 50h-14l-6 -50l-8 50h-8z"/><path d="M1348 764l40 -26l8 8l-40 36z"/><path d="M1384 734l62 -22l-2 36z"/></g>`
        + mv('usglide', { ad: '9s', dx: '240px', dy: '-200px' }, note(1450, 700, 1.3, '#ffe8b0')) + mv('usglide', { ad: '11s', d: '-4s', dx: '260px', dy: '-220px' }, note(1470, 690, 1.0, '#ffc0d8')) + mv('usglide', { ad: '10s', d: '-7s', dx: '200px', dy: '-180px' }, note(1430, 710, 1.1, '#c8b8ff'))
        + finish(0.34); } });

  /* ---------- ILLINOIS: Chicago skyline, the lake and the L ---------- */
  usSceneAdd({ key: 'state:IL', label: 'Chicago skyline over the lake', site: 'The Chicago skyline from the lake', colour: 'indigo', mood: 'proud', season: 'any', tags: ['chicago', 'skyline', 'lake', 'train', 'sunrise'],
    svg: () => { const s1 = U(), w1 = U(), g1 = U(), g2 = U(); let spokes = '';
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; spokes += `M170 470L${R(170 + Math.cos(a) * 104)} ${R(470 + Math.sin(a) * 104)}`; }
      const rim = (() => { let d = ''; for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12; d += `M${R(170 + Math.cos(a) * 104)} ${R(470 + Math.sin(a) * 104)}h0`; } return d; })();
      let brace = ''; for (let k = 0; k < 4; k++) { const y0 = 250 + k * 70, y1 = y0 + 70, w0 = 31 - (y0 - 240) * 0.034, w1_ = 31 - (y1 - 240) * 0.034; brace += `M${R(480 - w0)} ${y0}L${R(480 + w1_)} ${y1}M${R(480 + w0)} ${y0}L${R(480 - w1_)} ${y1}`; }
      return `<defs>${lin(s1, [[0, '#2a2a78'], [0.35, '#8a58a8'], [0.62, '#ff9a8a'], [0.85, '#ffcf90'], [1, '#ffe8b0']])}${lin(w1, [[0, '#ffcf98'], [0.12, '#d88a98'], [0.45, '#3a5a96'], [1, '#17285e']])}${lin(g1, [[0, '#2c3a56'], [1, '#161e36']])}${lin(g2, [[0, '#ffe6b0', 0.55], [1, '#ffe6b0', 0]])}</defs>`
        + full(`url(#${s1})`) + stars(51, 40, 200) + rays(1330, 600, 1100, '#fff0c0', 0.24) + sun(1330, 604, 46, '#fff8dc', '#ffcf90', true)
        + streak(300, 150, 300, '#ffc0b0', 0.55) + cloud(1290, 190, 1.1, '#e096a8', 0.85, 66, 8, '#ffc8c0') + cloud(260, 300, 1.0, '#cf86a8', 0.82, 58, 24, '#f8b8c0') + cloud(1450, 330, 0.8, '#f0a898', 0.8, 74, 40, '#ffd8c0')
        + birds(8, 6, 700, 340, '#3a3058', 1.3, 700)
        /* skyline */
        + mv('uspar', { ad: '40s', dx: '10px' }, towers(23, -140, 1740, 600, 50, 190, '#6a5090', false, 6))
        + mv('uspar', { ad: '30s', dx: '8px' }, towers(24, -80, 1700, 600, 80, 290, '#2f3560', 0.3, 5)
          + `<path fill="#252a52" d="M432 600L440 240H520L528 600z"/><path fill="none" stroke="#c8d0e8" stroke-width="2.6" opacity=".6" d="${brace}"/><path stroke="#252a52" stroke-width="3" d="M470 240V160M490 240V176"/>` + wins(448, 270, 5, 14, 15, 22, 4, 0.5, 6, 8)
          + `<g fill="#1f2448"><rect x="890" y="350" width="26" height="250"/><rect x="916" y="250" width="32" height="350"/><rect x="948" y="130" width="38" height="470"/><rect x="986" y="220" width="32" height="380"/><rect x="1018" y="320" width="26" height="280"/></g><path stroke="#1f2448" stroke-width="4" d="M960 130V60M976 130V72"/>` + wins(920, 270, 2, 14, 14, 22, 5, 0.5, 6, 8) + wins(954, 150, 2, 18, 15, 22, 6, 0.5, 6, 8)
          + `<g fill="#252a52"><rect x="740" y="270" width="70" height="330"/><path d="M640 600V330h30v-30h50v60h20V600z"/><path d="M1140 600V290h50V600z"/></g>` + wins(750, 290, 5, 12, 12, 24, 7, 0.5, 6, 8) + wins(1148, 310, 3, 12, 14, 22, 9, 0.5, 6, 8)
          + mv('usflicker', { ad: '1.7s', to: '960px 56px' }, `<circle cx="960" cy="58" r="5" fill="#ff4a3a"/>`) + mv('usflicker', { ad: '2.1s', d: '-.6s', to: '976px 68px' }, `<circle cx="976" cy="70" r="5" fill="#ff4a3a"/>`) + mv('usflicker', { ad: '1.9s', to: '470px 158px' }, `<circle cx="470" cy="158" r="5" fill="#ff4a3a"/>`))
        + haze(560, 60, '#ffd0a0', 0.4)
        + `<path fill="none" stroke="#3a3868" stroke-width="6" d="M120 600L170 470L220 600"/>` + mv('usspin', { ad: '60s', to: '170px 470px' }, `<circle cx="170" cy="470" r="104" fill="none" stroke="#3a3868" stroke-width="4"/><path fill="none" stroke="#3a3868" stroke-width="2.4" d="${spokes}"/><path class="us-lamps" fill="none" stroke="#ffd070" stroke-width="7" stroke-linecap="round" d="${rim}"/>`) + `<circle cx="170" cy="470" r="9" fill="#3a3868"/>`
        /* lake */
        + `<rect y="600" width="1600" height="300" fill="url(#${w1})"/>`
        + `<path fill="url(#${g2})" d="M1270 606h120l90 300h-300z"/>`
        + mv('uspar', { ad: '22s', dx: '14px' }, shimmer(9, 26, 100, 1500, 612, 820, '#ffe0b8', 80) + shimmer(10, 10, 1100, 1500, 612, 800, '#fff6d8', 60))
        + mv('usbob', { ad: '5s', dy: '4px' }, mv('usmove', { ad: '120s', dx: '300px' }, `<path fill="#fff" d="M760 660l44 -86l12 86z"/><path fill="#ffd8d0" d="M746 664h86l-14 12h-60z"/>`)) + mv('usbob', { ad: '6s', d: '-2s', dy: '4px' }, `<path fill="#fff" d="M1140 700l34 -66l10 66z"/><path fill="#ffd0c0" d="M1130 704h66l-12 10h-44z"/>`)
        /* the L trestle and train */
        + `<rect x="-160" y="738" width="1920" height="12" fill="#2a2e44"/><rect x="-160" y="750" width="1920" height="6" fill="#3a4060"/><path fill="none" stroke="#2a2e44" stroke-width="5" d="M-160 738V704H1760V738"/>`
        + `<path fill="none" stroke="#2a2e44" stroke-width="4" d="${Array.from({ length: 33 }, (_, i) => `M${-160 + i * 60} 704L${-130 + i * 60} 738L${-100 + i * 60} 704`).join('')}"/>`
        + `<g fill="#232840">${Array.from({ length: 9 }, (_, i) => `<rect x="${-40 + i * 220}" y="756" width="20" height="150"/>`).join('')}</g><path fill="none" stroke="#232840" stroke-width="3" d="${Array.from({ length: 9 }, (_, i) => `M${-40 + i * 220} 790L${-20 + i * 220 + 180} 880`).join('')}"/>`
        + mv('usmove', { ad: '16s', dx: '2200px' }, `<g transform="translate(-60 0)">${[0, 168, 336].map((x, i) => `<g transform="translate(${x} 0)"><rect x="0" y="690" width="160" height="48" rx="8" fill="#d6dcec"/><rect x="0" y="716" width="160" height="8" fill="#d8283a"/><path fill="#7a8ab8" d="M10 698h30v14h-30zM50 698h30v14h-30zM90 698h30v14h-30zM130 698h22v14h-22z" opacity=".8"/><path class="us-lit" fill="none" stroke-width="10" d="M12 705h26M52 705h26M92 705h26M132 705h18"/></g>`).join('')}<path class="us-lit" d="M510 710h14v10h-14z"/><rect x="340" y="676" width="18" height="12" fill="#2a2e44"/></g>`)
        + mv('usmove', { ad: '25s', d: '-9s', dx: '-2200px' }, `<g transform="translate(1700 0)">${[0, 168].map(x => `<g transform="translate(${x} 0)"><rect x="0" y="690" width="160" height="48" rx="8" fill="#c8cee0"/><rect x="0" y="716" width="160" height="8" fill="#2a5ab8"/><path class="us-lit" fill="none" stroke-width="10" d="M12 705h26M52 705h26M92 705h26M132 705h18"/></g>`).join('')}</g>`)
        + `<path fill="url(#${g1})" d="M-160 870Q400 850 800 866T1760 856V900H-160z"/>`
        + finish(0.34); } });

  /** A wind turbine: tapered tower, nacelle, three blades turning on the hub (absolute coordinates). */
  const turb = (x, y, h, s, col, ad, d) => { const hy = y - h, L = R(h * 0.46);
    let b = ''; for (let i = 0; i < 3; i++) b += `<path fill="${col}" transform="rotate(${i * 120} ${x} ${hy})" d="M${x - 3 * s} ${hy}L${x - 1.4 * s} ${hy - L}L${x + 1.4 * s} ${hy - L}L${x + 3 * s} ${hy}z"/>`;
    return `<path fill="${col}" d="M${x - 4 * s} ${y}L${x - 1.6 * s} ${hy}H${x + 1.6 * s}L${x + 4 * s} ${y}z"/><rect x="${x - 5 * s}" y="${hy - 4 * s}" width="${14 * s}" height="${8 * s}" rx="${2 * s}" fill="${col}"/>` + mv('usspin', { ad: ad, d: d, to: `${x}px ${hy}px` }, b + `<circle cx="${x}" cy="${hy}" r="${R(5 * s)}" fill="${col}"/>`); };
  /** Tufts of grass or wheat stalks as dashed strokes (heads) over thin stems. */
  const tufts = (seed, n, x0, x1, y0, y1, col, w, h) => { const r = rnd(seed); let d = ''; for (let i = 0; i < n; i++) { const x = R(x0 + r() * (x1 - x0)), y = R(y0 + r() * (y1 - y0)), hh = R(h * (0.6 + r() * 0.8)); d += `M${x} ${y}q${R(r() * 10 - 5)} ${-R(hh * 0.6)} ${R(r() * 14 - 7)} ${-hh}`; } return `<path fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" d="${d}"/>`; };

  /* ---------- INDIANA: dunes on Lake Michigan at sunrise ---------- */
  usSceneAdd({ key: 'state:IN', label: 'Dunes on Lake Michigan', site: 'The Indiana Dunes at sunrise', colour: 'amber', mood: 'calm', season: 'any', tags: ['dunes', 'lake', 'sand', 'sunrise', 'beach grass'],
    svg: () => { const s1 = U(), w1 = U(), d1 = U(), d2 = U(), d3 = U();
      const dune = (fill, shade, y, amp, n, seed) => ridge(fill, y, amp, n, seed) ;
      return `<defs>${lin(s1, [[0, '#6f9bd2'], [0.3, '#c4b4c4'], [0.55, '#ffc890'], [0.8, '#ffe2a8'], [1, '#fff0c8']])}${lin(w1, [[0, '#ffdcaa'], [0.12, '#7fc0d0'], [0.5, '#2f88a8'], [1, '#1d6a8c']])}${lin(d1, [[0, '#f3d8a0'], [1, '#e4bb78']])}${lin(d2, [[0, '#e8c27c'], [1, '#d3a05c']])}${lin(d3, [[0, '#d9a45e'], [1, '#b87d3e']])}</defs>`
        + full(`url(#${s1})`) + rays(900, 500, 1200, '#fff3c8', 0.26) + sun(900, 520, 54, '#fffbe6', '#ffe4a0', true)
        + streak(300, 140, 300, '#fff', 0.6) + cloud(340, 250, 1.2, '#f2c9b0', 0.9, 62, 8, '#fff2e0') + cloud(1250, 190, 1.0, '#f4d2b4', 0.9, 70, 28, '#fff4e4') + cloud(700, 120, 0.8, '#f0d6c0', 0.85, 54, 14, '#fff6ea')
        + birds(5, 6, 800, 330, '#5a4a52', 1.2, 700)
        /* lake with a faint skyline */
        + `<rect y="520" width="1600" height="380" fill="url(#${w1})"/>` + `<g opacity=".55">${towers(8, 110, 420, 524, 14, 90, '#8a98b8', false, 3)}</g>` + haze(500, 50, '#ffe6bc', 0.7)
        + `<path fill="none" stroke="#fff0c8" stroke-width="4" opacity=".6" stroke-dasharray="16 20" d="M800 540h200M810 560h180M826 584h150M846 612h120"/>`
        + mv('uspar', { ad: '30s', dx: '14px' }, shimmer(6, 28, 100, 1500, 540, 700, '#fff0c8', 70) + shimmer(7, 14, 100, 1500, 540, 700, '#a0e0e8', 60))
        + mv('usbob', { ad: '5s', dy: '4px' }, mv('usmove', { ad: '140s', dx: '280px' }, `<path fill="#fff" d="M1140 580l30 -62l10 62z"/><path fill="#ffe6d0" d="M1130 584h60l-10 10h-40z"/>`))
        + mv('usdrift', { ad: '9s', dx: '30px' }, `<path fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".75" d="M-100 650q60 -16 120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0"/>`)
        + mv('usdrift', { ad: '11s', d: '-3s', dx: '40px' }, `<path fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".8" d="M-100 700q70 -22 140 0t140 0t140 0t140 0t140 0t140 0t140 0t140 0t140 0t140 0t140 0t140 0"/>`)
        + `<path fill="#fff" opacity=".85" d="M-160 760Q300 730 800 750T1760 736V770Q1200 784 800 770T-160 792z"/>`
        /* dunes */
        + mv('uspar', { ad: '36s', dx: '10px' }, ridge(`url(#${d1})`, 690, 70, 7, 51) + `<path fill="#c89a5c" opacity=".35" d="M-160 720Q200 640 520 700L560 900H-160z"/>`)
        + mv('uspar', { ad: '26s', dx: '14px' }, ridge(`url(#${d2})`, 760, 90, 6, 52) + `<path fill="#b88a50" opacity=".3" d="M900 780Q1200 700 1500 770L1500 900H900z"/>`)
        + `<g fill="#3a2c34"><path d="M1060 728q-4 -30 8 -42q4 -14 14 0q8 12 4 42z"/><circle cx="1074" cy="678" r="8"/><path d="M1090 700l24 -20" stroke="#3a2c34" stroke-width="4"/></g>`
        + mv('uspar', { ad: '20s', dx: '18px' }, ridge(`url(#${d3})`, 820, 90, 5, 53) + `<path fill="#a06a30" opacity=".35" d="M-160 860Q300 790 700 850L760 900H-160z"/>`)
        + mv('ussway', { ad: '4.6s', to: '800px 900px' }, tufts(61, 70, -100, 1700, 800, 900, '#8a7a3a', 5, 80) + tufts(62, 50, -100, 1700, 810, 900, '#b8a65a', 3, 100) + tufts(63, 30, -100, 1700, 840, 900, '#6a6a30', 6, 130))
        + mv('ussway', { ad: '5.4s', d: '-1s', to: '800px 900px' }, tufts(64, 26, -100, 700, 850, 900, '#c9b868', 4, 170) + tufts(65, 18, 900, 1700, 850, 900, '#9a8a40', 5, 150))
        + finish(0.32); } });

  /* ---------- IOWA: barn, silo and wind over the fields ---------- */
  usSceneAdd({ key: 'state:IA', label: 'Barns and wind over the fields', site: 'An Iowa farm in the morning wind', colour: 'green', mood: 'calm', season: ['summer'], tags: ['farm', 'barn', 'wind', 'corn', 'silo'],
    svg: () => { const s1 = U(), f1 = U(), f2 = U(), f3 = U(); let rows = '', rows2 = '';
      for (let i = 0; i < 24; i++) { rows += `M${R(800 + (i - 12) * 22)} 640L${R(800 + (i - 12) * 130)} 900`; } for (let i = 0; i < 20; i++) rows2 += `M${R(-100 + i * 100)} 700L${R(-300 + i * 220)} 900`;
      return `<defs>${lin(s1, [[0, '#4a98e0'], [0.5, '#9ccff4'], [0.85, '#f6edc8'], [1, '#ffeab0']])}${lin(f1, [[0, '#9ac05a'], [1, '#5f9440']])}${lin(f2, [[0, '#d6c25a'], [1, '#a8a03a']])}${lin(f3, [[0, '#4c9a3a'], [1, '#2c6a2a']])}</defs>`
        + full(`url(#${s1})`) + rays(220, 300, 1100, '#fff6cc', 0.2) + sun(220, 330, 44, '#fffbe4', '#fff0a8') + streak(1100, 120, 300, '#fff', 0.7) + cloud(560, 200, 1.4, '#d6e6f4', 0.96, 60, 6) + cloud(1250, 260, 1.2, '#dcebf6', 0.95, 52, 22) + cloud(160, 140, 0.9, '#e0eef8', 0.9, 68, 36) + cloud(900, 110, 0.8, '#e6f0f8', 0.85, 74, 40)
        + birds(9, 5, 400, 380, '#3a4a5a', 1.2, 700)
        + mv('uspar', { ad: '44s', dx: '8px' }, ridge('#a6c88e', 560, 30, 9, 71) + turb(240, 560, 220, 1.3, '#f4f6f8', '8s', '0s') + turb(420, 556, 190, 1.1, '#eef0f4', '9.5s', '-3s') + turb(1500, 560, 240, 1.4, '#f4f6f8', '8.6s', '-1s') + turb(1340, 556, 180, 1.05, '#e8ecf0', '10s', '-5s') + turb(120, 560, 170, 1, '#eef0f4', '11s', '-2s'))
        + mv('uspar', { ad: '34s', dx: '12px' }, ridge(`url(#${f2})`, 600, 36, 8, 72) + `<path fill="none" stroke="#98904a" stroke-width="2" opacity=".6" d="M-160 628H1760M-160 650H1760"/>`)
        + `<g opacity=".8">${ridge(`url(#${f1})`, 660, 30, 7, 73)}</g>` + `<path fill="none" stroke="#3f7e32" stroke-width="3" opacity=".5" d="${rows}"/>`
        /* farmstead */
        + `<ellipse cx="1100" cy="690" rx="320" ry="16" fill="#000" opacity=".15"/>`
        + `<rect x="960" y="540" width="270" height="150" fill="#b8342a"/><path fill="#a02c24" d="M960 640h270v50h-270z"/><path fill="#5c5c66" d="M940 548L990 462Q1095 426 1200 462L1250 548Q1095 520 940 548z"/><path fill="#6e6e7a" d="M990 462Q1095 426 1200 462L1190 478Q1095 446 1000 478z"/>`
        + `<path fill="none" stroke="#fff" stroke-width="5" d="M962 542H1228M962 542V690M1228 542V690"/><rect x="1040" y="590" width="110" height="100" fill="#8e2820"/><path fill="none" stroke="#fff" stroke-width="5" d="M1040 590H1150V690H1040zM1040 590L1150 690M1150 590L1040 690"/><rect x="1068" y="498" width="54" height="40" fill="#8e2820"/><path fill="none" stroke="#fff" stroke-width="5" d="M1068 498h54v40h-54z"/>`
        + `<rect x="1070" y="418" width="50" height="32" fill="#b8342a"/><path fill="#5c5c66" d="M1062 420l33 -22l33 22z"/><path stroke="#3a3a42" stroke-width="3" d="M1095 398V370"/>` + mv('ussway', { ad: '3.6s', to: '1095px 372px' }, `<path fill="#3a3a42" d="M1080 372h30l-8 -6l8 -6h-30z"/>`)
        + `<rect x="1244" y="420" width="62" height="270" fill="#c8ced4"/><path fill="#a8b0b8" d="M1280 420h26v270h-26z"/><ellipse cx="1275" cy="420" rx="31" ry="14" fill="#8a929c"/><path fill="none" stroke="#8a929c" stroke-width="3" d="M1244 480h62M1244 550h62M1244 620h62"/>`
        + `<rect x="1320" y="500" width="50" height="190" fill="#9fb0bc"/><ellipse cx="1345" cy="500" rx="25" ry="12" fill="#7a8a98"/>` + `<path fill="none" stroke="#8a929c" stroke-width="3" d="M1320 560h50M1320 620h50"/>`
        + `<path fill="none" stroke="#d8d0c0" stroke-width="3" d="M600 706H1500M600 724H1500"/><path fill="#d8d0c0" d="M${Array.from({ length: 16 }, (_, i) => `${620 + i * 56} 700h6v34h-6z`).join('M')}"/>`
        /* near corn and wheat */
        + `<path fill="url(#${f3})" d="M-160 740Q400 722 800 736T1760 726V900H-160z"/><path fill="none" stroke="#2c6a2a" stroke-width="4" opacity=".55" d="${rows2}"/>`
        + mv('usmove', { ad: '70s', dx: '700px' }, `<g fill="#c84a2a"><rect x="300" y="758" width="110" height="38" rx="6"/><rect x="368" y="730" width="42" height="34" rx="6"/></g><path fill="#9ccbe8" d="M374 736h30v22h-30z"/><g fill="#1c1c22"><circle cx="330" cy="800" r="15"/><circle cx="392" cy="800" r="11"/></g>`)
        + mv('ussway', { ad: '4.2s', to: '800px 900px' }, tufts(81, 90, -100, 1700, 790, 900, '#2f7a2a', 8, 150) + tufts(82, 60, -100, 1700, 820, 900, '#4a9a38', 6, 190) + tufts(83, 30, -100, 1700, 850, 900, '#237024', 10, 240))
        + finish(0.3); } });

  /* ---------- KANSAS: wheat, a grain elevator and a storm on the horizon ---------- */
  usSceneAdd({ key: 'state:KS', label: 'Wheat and big sky', site: 'Wheat under a Kansas sky', colour: 'amber', mood: 'calm', season: ['summer'], tags: ['wheat', 'prairie', 'storm', 'grain elevator', 'big sky'],
    svg: () => { const s1 = U(), w1 = U(), f1 = U(), f2 = U(), st = U(), rn = U();
      return `<defs>${lin(s1, [[0, '#33507e'], [0.35, '#6f8fb8'], [0.65, '#f0c890'], [1, '#ffe4a0']])}${lin(w1, [[0, '#f3d070'], [1, '#c89a30']])}${lin(f1, [[0, '#f0cf6a'], [1, '#d4a838']])}${lin(f2, [[0, '#e6bb4a'], [1, '#b8862a']])}${lin(st, [[0, '#2a3248'], [0.6, '#4a5470'], [1, '#6a7490']])}${lin(rn, [[0, '#7c88a8', 0.8], [1, '#7c88a8', 0.1]])}</defs>`
        + full(`url(#${s1})`) + rays(1230, 520, 1200, '#fff2c0', 0.28) + sun(1230, 500, 50, '#fffbe0', '#ffe090')
        + streak(1000, 180, 300, '#ffe8c0', 0.55) + cloud(1300, 300, 1.2, '#f0b88a', 0.85, 66, 8, '#ffe0b8') + cloud(820, 380, 0.9, '#e8b090', 0.8, 58, 24, '#ffd8b0')
        /* the storm */
        + mv('uspar', { ad: '50s', dx: '16px' }, `<path fill="url(#${st})" d="M-200 -20H760Q780 80 700 120Q760 150 640 230Q600 280 520 270Q420 330 300 290Q160 340 -200 300z"/><path fill="#1e2438" opacity=".7" d="M-200 220Q100 200 260 250Q420 262 560 250Q440 300 300 310Q100 340 -200 300z"/><path fill="#8a96b4" opacity=".6" d="M80 180Q200 160 320 190Q220 220 80 180z"/>`
          + `<path fill="url(#${rn})" d="M120 300L100 600H360L420 300z"/><path fill="none" stroke="#9aa6c4" stroke-width="3" opacity=".6" d="M160 300L146 590M220 300L212 590M290 300L284 590M350 300L352 590"/>`)
        + mv('uspuff', { ad: '5.5s', d: '-1s', dx: '0px', dy: '0px', sc: '1', to: '300px 290px' }, `<path fill="none" stroke="#fffbe8" stroke-width="5" stroke-linejoin="round" d="M300 290L270 380L300 380L262 480L318 400L288 400L330 320z"/>`)
        + mv('uspuff', { ad: '8s', d: '-4.5s', dx: '0px', dy: '0px', sc: '1', to: '520px 250px' }, `<path fill="none" stroke="#fffbe8" stroke-width="4" stroke-linejoin="round" d="M520 250L498 330L522 330L492 410L540 340L516 340L546 280z"/>`)
        + `<g opacity=".8">${ridge('#b29a68', 586, 14, 9, 91)}</g>` + haze(560, 60, '#ffe0a8', 0.5)
        /* grain elevator */
        + mv('uspar', { ad: '40s', dx: '8px' }, `<g><rect x="940" y="430" width="30" height="156" fill="#e8e0d0"/><rect x="972" y="430" width="30" height="156" fill="#d4ccbc"/><rect x="1004" y="430" width="30" height="156" fill="#e8e0d0"/><rect x="1036" y="430" width="30" height="156" fill="#d4ccbc"/><rect x="900" y="470" width="40" height="116" fill="#c4bcac"/><rect x="934" y="404" width="64" height="30" fill="#f0e8d8"/><path fill="#8a8478" d="M930 404h72l-36 -26z"/><rect x="1068" y="520" width="90" height="66" fill="#b8402e"/><path fill="#7a2a1e" d="M1060 520h106l-53 -24z"/><path fill="none" stroke="#a09888" stroke-width="3" d="M940 470h126M940 520h126"/></g>`
          + `<path stroke="#6a6a72" stroke-width="3" d="M-160 590H1760"/>` + mv('usflicker', { ad: '1.8s', to: '966px 376px' }, `<circle cx="966" cy="376" r="4" fill="#ff4a3a"/>`))
        /* wheat */
        + `<path fill="url(#${w1})" d="M-160 600Q300 580 800 596T1760 590V900H-160z"/>`
        + `<path fill="none" stroke="#c8962c" stroke-width="2" opacity=".5" d="${Array.from({ length: 22 }, (_, i) => `M${R(800 + (i - 11) * 24)} 610L${R(800 + (i - 11) * 150)} 900`).join('')}"/>`
        + mv('ussway', { ad: '5.5s', to: '800px 700px' }, tufts(101, 80, -100, 1700, 620, 700, '#c8962c', 3, 40))
        + mv('usmove', { ad: '80s', dx: '900px' }, `<g><ellipse cx="500" cy="664" rx="70" ry="6" fill="#000" opacity=".15"/><rect x="450" y="620" width="96" height="34" rx="5" fill="#2a8a3a"/><rect x="500" y="596" width="36" height="28" rx="4" fill="#2a8a3a"/><path fill="#a8d8e8" d="M504 600h28v20h-28z"/><path fill="#e8c840" d="M436 640h20v20h-20z"/><g fill="#1c1c20"><circle cx="470" cy="658" r="10"/><circle cx="530" cy="658" r="8"/></g></g>` + puffs(430, 650, 4, '#e8cf90', 14, -70, 3, -30, 2.2))
        + mv('uspar', { ad: '24s', dx: '14px' }, `<path fill="url(#${f1})" d="M-160 700Q400 668 800 690T1760 676V900H-160z"/>` + tufts(102, 60, -100, 1700, 700, 790, '#b8862a', 4, 90))
        + mv('ussway', { ad: '4.6s', d: '-1s', to: '800px 800px' }, tufts(103, 70, -100, 1700, 730, 820, '#e0b040', 5, 120))
        + `<path fill="url(#${f2})" d="M-160 800Q400 770 800 790T1760 776V900H-160z"/>`
        + mv('ussway', { ad: '4s', to: '800px 900px' }, tufts(104, 60, -100, 1700, 820, 900, '#d0a030', 7, 200) + tufts(105, 40, -100, 1700, 850, 900, '#f0cc5a', 9, 260))
        + birds(11, 5, 600, 300, '#3a3a4a', 1.2, 700)
        + finish(0.3); } });

/*END*/
})();
