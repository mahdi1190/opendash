/* ============================================================
   ASIA FULL-SCREEN SCENES, batch 4 (Gulf cities, Central Asia, Siberia and the Far East).
   PURE classic script: registers entries with asiaSceneAdd() (71-anim-asia.js), built on usSceneKit().
   Each svg() returns the inside of a 1600 x 900 drawing (sliced to fill any screen), layered: sky and light,
   far / mid / near layers that drift, the landmark, foreground and ambient life. Colours are painted for
   daytime; the dark theme or tod-dusk / tod-night lays the evening grade (us-tint) and lights the us-lit
   windows, us-lamps strings and us-star stars. Motion is transform and opacity only. Landscape and
   architecture only: no flags, text, maps or people.
   ============================================================ */
(function () {
  const K = usSceneKit();
  const { U, R, rnd, lin, linU, radU, mv, full, ridge, canopy, cloud, streak, haze, rays, sun, stars, birds, shimmer, puffs, dots, lit, finish } = K;

  /** Window dots (glass by day, lit at dusk). */
  const win = (x, y, w, h, sx, sy, glass) => {
    let d = '';
    for (let yy = y; yy < y + h; yy += sy) d += `M${x} ${yy}h${w}`;
    return dots(d, glass || '#2c3a55', 4, sx, '', ' opacity=".5"') + dots(d, '#ffd27a', 4, sx, 'us-lamps');
  };
  /** A run of filler buildings along a base line. */
  const city = (seed, x0, x1, base, hmin, hmax, wmin, wmax, fill, wc) => {
    const r = rnd(seed); let x = x0, o = '', w = '';
    while (x < x1) {
      const bw = wmin + r() * (wmax - wmin), bh = hmin + r() * (hmax - hmin);
      o += `<rect x="${R(x)}" y="${R(base - bh)}" width="${R(bw)}" height="${R(bh)}"/>`;
      if (r() < 0.25) o += `<rect x="${R(x + bw * 0.4)}" y="${R(base - bh - 20)}" width="${R(bw * 0.2)}" height="22"/>`;
      if (wc && r() < wc && bw > 22) w += win(R(x + 6), R(base - bh + 12), R(bw - 12), R(bh - 24), 11, 20);
      x += bw + r() * 4;
    }
    return `<g fill="${fill}">${o}</g>${w}`;
  };
  /** A palm: curved trunk and fronds, swaying from its foot. */
  const palm = (x, y, h, lean, trunk, leaf, dur, del) => {
    const tx = x + lean, ty = y - h; let f = '';
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI + (i / 8) * Math.PI, len = h * 0.42, ex = R(tx + Math.cos(a) * len), ey = R(ty + Math.sin(a) * len * 0.45 + len * 0.42 * (Math.abs(Math.cos(a)) * 0.9));
      f += `M${tx} ${ty}Q${R(tx + Math.cos(a) * len * 0.55)} ${R(ty - len * 0.34)} ${ex} ${ey}`;
    }
    return mv('ussway2', { ad: (dur || 6) + 's', d: -(del || 0) + 's', to: `${x}px ${y}px` },
      `<path d="M${x} ${y}Q${R(x + lean * 0.2)} ${R(y - h * 0.6)} ${tx} ${ty}" fill="none" stroke="${trunk}" stroke-width="${Math.max(4, R(h / 22))}" stroke-linecap="round"/><path d="${f}" fill="none" stroke="${leaf}" stroke-width="${Math.max(3, R(h / 28))}" stroke-linecap="round"/>`);
  };
  /** A pointed-oval dome (onion-ish) with a finial. */
  const dome = (cx, by, r, fill, shade, tall) => {
    const t = r * (tall || 1.3);
    return `<path fill="${fill}" d="M${cx - r} ${by}C${cx - r * 1.05} ${R(by - t * 0.6)} ${R(cx - r * 0.3)} ${R(by - t * 0.8)} ${cx} ${R(by - t * 1.15)}C${R(cx + r * 0.3)} ${R(by - t * 0.8)} ${R(cx + r * 1.05)} ${R(by - t * 0.6)} ${cx + r} ${by}z"/>`
      + `<path fill="${shade}" opacity=".5" d="M${cx} ${R(by - t * 1.15)}C${R(cx + r * 0.3)} ${R(by - t * 0.8)} ${R(cx + r * 1.05)} ${R(by - t * 0.6)} ${cx + r} ${by}H${cx}z"/>`
      + `<path d="M${cx} ${R(by - t * 1.15)}v${-R(r * 0.5)}" stroke="#d9b54a" stroke-width="${Math.max(2, R(r / 14))}"/>`;
  };
  /** A snow peak: rock polygon, a shaded flank and a jagged snow cap. */
  const peak = (x, y, w, h, rock, shade, snow, seed) => {
    const r = rnd(seed), L = [], Rt = [];
    for (let k = 1; k <= 6; k++) { const t = k / 6; L.push([R(x - (w / 2) * t + (r() - 0.5) * w * 0.07), R(y + h * t)]); Rt.push([R(x + (w / 2) * t + (r() - 0.5) * w * 0.07), R(y + h * t)]); }
    const ptsL = L.map(p => p.join(' ')).join('L'), ptsR = Rt.map(p => p.join(' ')).join('L');
    let cap = `M${x} ${y}`; for (let k = 0; k < 4; k++) cap += `L${L[k][0] + R(r() * 14)} ${L[k][1] + R(r() * 10 + (k % 2) * 14)}`;
    cap += `L${x} ${R(y + h * 0.32)}`; for (let k = 3; k >= 0; k--) cap += `L${Rt[k][0] - R(r() * 14)} ${Rt[k][1] + R(r() * 10 + (k % 2) * 14)}`;
    return `<path fill="${rock}" d="M${x} ${y}L${ptsL}L${ptsR.split('L').reverse().join('L')}z"/><path fill="${shade}" d="M${x} ${y}L${R(x + w * 0.06)} ${R(y + h * 0.5)}L${Rt[5][0]} ${Rt[5][1]}L${Rt[2][0]} ${Rt[2][1]}z" opacity=".55"/><path fill="${snow}" d="${cap}z"/>`;
  };
  const lamp = (cx, cy, r, col) => `<circle class="us-lit" cx="${cx}" cy="${cy}" r="${r}" fill="${col || '#ffd27a'}"/>`;

  /* ---------- Dubai: the tapering tower and the creek at golden hour ---------- */
  asiaSceneAdd({ key: 'place:dubai', label: 'Dubai skyline at golden hour', site: 'Downtown Dubai and the Creek', colour: 'amber', mood: 'energetic', season: 'any', tags: ['skyline', 'tower', 'creek', 'dhow'],
    svg: () => {
      const s1 = U(), w1 = U(), g1 = U(), b1 = U();
      const prof = [[640, 52], [520, 52], [492, 41], [400, 41], [372, 32], [300, 32], [274, 23], [215, 23], [190, 14], [140, 14], [118, 6], [60, 3]];
      const lp = prof.map(([y, h]) => `${860 - h} ${y}`).join('L'), rp = prof.map(([y, h]) => `${860 + h} ${y}`).reverse().join('L');
      const rh = prof.map(([y, h]) => `${860 + h} ${y}`).join('L');
      const prism = (x, w, y, h, tilt) => `<path fill="#7e7aa6" d="M${x} 640V${y + tilt}L${x + w} ${y}V640z"/><path fill="#b8a8c4" opacity=".5" d="M${x + w * 0.55} 640V${y + tilt * 0.45}L${x + w} ${y}V640z"/>` + win(x + 6, y + tilt + 20, w - 12, 640 - y - tilt - 40, 10, 18);
      let wind = '';
      for (let i = 0; i < 6; i++) { const x = 70 + i * 66; wind += `<path fill="#a98568" d="M${x} 700V650h26V700z"/><path fill="#7a5a48" d="M${x - 3} 650h32l-4 -10h-24z"/>${lit(x + 7, 664, 5, 9)}`; }
      let ref = '';
      for (let i = 0; i < 14; i++) ref += `<rect class="x-usshim" style="--ad:${(2.4 + (i % 4) * 0.5).toFixed(1)}s;--d:-${(i * 0.37).toFixed(1)}s" x="${840 + (i % 5) * 9 - 22 + (i % 3) * 8}" y="${650 + i * 11}" width="${20 + i * 3}" height="3" rx="2" fill="#ffd9a0"/>`;
      const dhow = (x, y, s, col, dur, del, dx) => mv('usmove', { ad: dur + 's', d: -del + 's', dx: dx + 'px' }, mv('usbob', { ad: '3.4s', dy: '3px' }, `<g transform="translate(${x} ${y}) scale(${s})"><path fill="${col}" d="M-90 -6l12 28h150l36 -40l-6 14l-16 4l-24 18z"/><path fill="#4a2f22" d="M-80 6h150l-6 10h-132z"/><rect x="-28" y="-30" width="54" height="26" fill="#d9c4a0"/><rect x="-18" y="-24" width="8" height="12" fill="#6a4a30"/>${lit(-6, -24, 8, 12)}${lit(8, -24, 8, 12)}<path d="M8 -30V-62M8 -62l44 40" stroke="#4a2f22" stroke-width="2" fill="none"/></g>`));
      return `<defs>${lin(s1, [[0, '#3f5a8e'], [0.34, '#b894b4'], [0.62, '#ffb572'], [1, '#ffe2a2']])}${lin(w1, [[0, '#e5a37c'], [0.15, '#5f6a98'], [1, '#232c58']])}${lin(g1, [[0, '#ffd69a', 0.8], [1, '#ffd69a', 0]])}${lin(b1, [[0, '#d8b7a0'], [1, '#b99079']])}</defs>`
        + full(`url(#${s1})`) + stars(5, 24, 200) + rays(1230, 560, 1000, '#ffe4b0', 0.1) + sun(1230, 570, 56, '#fff4d0', '#ffc070')
        + streak(260, 170, 300, '#ffc4b4', 0.5) + streak(1280, 250, 240, '#ffa886', 0.5, 72) + cloud(480, 300, 0.9, '#c98aa6', 0.8, 58, 6, '#ffd2b2') + cloud(1360, 380, 0.7, '#c88ca4', 0.75, 50, 22, '#ffdabb')
        + birds(4, 4, 1100, 300, '#4a3858', 1, 560)
        + mv('uspar', { ad: '40s', dx: '8px' }, city(11, -160, 1760, 640, 50, 170, 28, 64, '#a091bd')) + haze(540, 120, '#ffd9b0', 0.55)
        + mv('uspar', { ad: '32s', dx: '14px' }, city(23, -160, 580, 640, 80, 230, 30, 70, '#7f77a8', 0.3) + city(24, 1200, 1760, 640, 80, 220, 30, 66, '#7f77a8', 0.3)
          + prism(1030, 60, 330, 40, 40) + prism(1104, 60, 380, 40, -34)
          + `<path fill="#7c76a6" d="M590 640V420Q620 370 650 420V640z"/>${win(598, 430, 44, 190, 11, 20)}<path fill="#7c76a6" d="M690 640V340l22 -30l22 30V640z"/>${win(696, 350, 32, 270, 10, 20)}`
          + `<path fill="#8c80ad" d="M${lp}L${rp}z"/><path fill="#d6bccf" opacity=".62" d="M860 60L${rh}V640H860z"/>` + win(842, 420, 28, 200, 9, 18) + `<path d="M860 60V20" stroke="#7a6fa0" stroke-width="3"/><path d="M-160 646H1760" stroke="#6c6494" stroke-width="2"/>`)
        + mv('usflicker', { ad: '1.7s', to: '860px 22px' }, '<circle cx="860" cy="20" r="5" fill="#ff5a4a"/>')
        + `<rect y="640" width="1600" height="260" fill="url(#${w1})"/><rect y="640" width="1600" height="50" fill="url(#${g1})"/>`
        + ref + shimmer(7, 22, 300, 1500, 660, 780, '#ffe6b0', 70) + shimmer(8, 16, -100, 1700, 740, 890, '#e8a98a', 90)
        + dots('M-40 646H1700', '#ffe0a0', 4, 36, 'us-lamps')
        + dhow(500, 790, 1, '#6a4630', 110, 20, 1900) + dhow(1200, 850, 1.5, '#5a3a28', 150, 70, 1900)
        + `<g>${wind}</g><path fill="url(#${b1})" d="M-160 700H540V720H-160z" opacity=".9"/><path fill="#a98568" d="M-160 700V690H520V700z"/>`
        + palm(40, 706, 120, 14, '#6a4a36', '#3f5a34', 6, 1) + palm(1560, 900, 220, -30, '#4d362a', '#2f4a2a', 7, 2)
        + finish(0.34);
    } });

  /* ---------- Abu Dhabi: the great white mosque, its domes in the reflecting pools ---------- */
  asiaSceneAdd({ key: 'place:abu-dhabi', label: 'The grand white mosque', site: 'The Grand Mosque, Abu Dhabi', colour: 'teal', mood: 'calm', season: 'any', tags: ['mosque', 'pools', 'palms'],
    svg: () => {
      const s1 = U(), p1 = U(), m1 = U();
      const arch = (x, y, w, h) => `<path fill="#9fb4c8" d="M${x} ${y + h}V${y + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0V${y + h}z" opacity=".85"/>`;
      let arcade = '';
      for (let i = 0; i < 14; i++) arcade += arch(150 + i * 90, 560, 44, 92);
      const minaret = (x, h) => `<path fill="#f6f1e6" d="M${x - 15} 640V${640 - h}h30V640z"/><path fill="#d6d0c4" d="M${x} 640V${640 - h}h15V640z" opacity=".7"/><path fill="#f6f1e6" d="M${x - 22} ${640 - h}h44v-14h-44z"/><path fill="#f6f1e6" d="M${x - 17} ${626 - h}h34l-8 -34h-18z"/><path fill="#d9b54a" d="M${x} ${592 - h}v-34" stroke="#d9b54a" stroke-width="3"/><path d="M${x - 15} ${640 - h * 0.5}h30M${x - 15} ${640 - h * 0.78}h30" stroke="#b9c8d6" stroke-width="3"/>`;
      const bigDomes = () => {
        let o = '';
        const set = [[800, 470, 112, 1.2], [610, 500, 62, 1.2], [990, 500, 62, 1.2], [430, 520, 46, 1.2], [1170, 520, 46, 1.2]];
        for (const [cx, by, r, t] of set) o += `<path fill="#e8e2d4" d="M${cx - r - 8} ${by}h${2 * r + 16}v18h${-(2 * r + 16)}z"/>` + dome(cx, by, r, '#fbf8f0', '#c9c2b4', t);
        return o;
      };
      let pillars = '';
      for (let i = 0; i < 9; i++) pillars += `<rect x="${186 + i * 154}" y="560" width="14" height="96" fill="#fff"/>`;
      let ref = '';
      return `<defs>${lin(s1, [[0, '#4e8fd0'], [0.55, '#9fd0ea'], [1, '#f6e8cc']])}${lin(p1, [[0, '#8fc8d8'], [1, '#2f7d9a']])}${lin(m1, [[0, '#fff'], [1, '#e8e2d4']])}</defs>`
        + full(`url(#${s1})`) + sun(300, 160, 40, '#fffbe6', '#ffe9a8') + cloud(520, 220, 1, '#dbe9f4', 0.9, 60, 4) + cloud(1280, 160, 0.8, '#d8e8f3', 0.9, 54, 18) + cloud(980, 330, 0.6, '#dde9f3', 0.8, 70, 30)
        + birds(9, 5, 1000, 240, '#35566e', 1, 640)
        + mv('uspar', { ad: '40s', dx: '8px' }, city(31, -160, 1760, 650, 40, 120, 24, 50, '#a6c4d6')) + haze(560, 100, '#f4e8cf', 0.6)
        + `<g>${minaret(260, 330)}${minaret(1340, 330)}${minaret(440, 280)}${minaret(1160, 280)}</g>`
        + `<rect x="130" y="545" width="1340" height="14" fill="#e8e2d4"/>` + `<rect x="130" y="640" width="1340" height="18" fill="#d6cfc0"/><rect x="130" y="556" width="1340" height="86" fill="url(#${m1})"/>`
        + arcade + bigDomes()
        + `<g>${[0, 1, 2, 3, 4, 5].map(i => lit(740 + i * 24, 440, 12, 34)).join('')}</g>`
        + `<rect y="658" width="1600" height="242" fill="url(#${p1})"/>`
        + `<g transform="translate(0 1316) scale(1 -1)" opacity=".34">${bigDomes()}<rect x="130" y="556" width="1340" height="86" fill="#fff"/>${minaret(260, 330)}${minaret(1340, 330)}</g>`
        + `<rect y="658" width="1600" height="242" fill="url(#${p1})" opacity=".55"/>`
        + shimmer(12, 34, 100, 1500, 668, 880, '#fff', 90) + shimmer(13, 20, -100, 1700, 700, 890, '#bfe4ee', 100)
        + `<path fill="#efe9db" d="M-160 868L1760 868V900H-160z"/><path fill="#d4cdbd" d="M-160 856H1760V870H-160z"/>`
        + palm(180, 868, 250, 28, '#6a5440', '#3d6a3a', 6, 0) + palm(300, 868, 190, -18, '#6a5440', '#4d7c3a', 7, 1) + palm(1440, 868, 270, -26, '#6a5440', '#3d6a3a', 7, 2) + palm(1320, 868, 180, 20, '#6a5440', '#4d7c3a', 6, 3)
        + mv('usbob', { ad: '5s', dy: '2px' }, `<path d="M792 820h16" stroke="#fff" stroke-width="3" opacity=".6"/>`)
        + finish(0.3);
    } });

  /* ---------- Doha: the West Bay towers and a sailing dhow, a bright morning ---------- */
  asiaSceneAdd({ key: 'place:doha', label: 'West Bay towers and the dhows', site: 'West Bay and the Corniche', colour: 'blue', mood: 'cheerful', season: 'any', tags: ['skyline', 'dhow', 'corniche', 'bay'],
    svg: () => {
      const s1 = U(), w1 = U(), t1 = U();
      let lat = '';
      for (let i = 0; i < 16; i++) lat += `M${690} ${300 + i * 22}l76 22M${766} ${300 + i * 22}l-76 22`;
      let lat2 = '';
      for (let i = 0; i < 18; i++) lat2 += `M${1040} ${340 + i * 18}l50 18M${1090} ${340 + i * 18}l-50 18`;
      const sail = (x, y, s, dur, del, dx) => mv('usmove', { ad: dur + 's', d: -del + 's', dx: dx + 'px' }, mv('usbob', { ad: '3.8s', d: -del / 3 + 's', dy: '3px' },
        `<g transform="translate(${x} ${y}) scale(${s})"><path fill="#6b4a32" d="M-100 0l14 32h160l46 -42l-10 20z"/><path fill="#4a3022" d="M-92 8h160l-6 12h-146z"/><path fill="#fffaf0" d="M-6 -4L-14 -150L-92 -2z"/><path fill="#f0e4ce" d="M2 -4L-4 -176L84 -6z"/><path d="M-10 -4V-176" stroke="#4a3022" stroke-width="3"/></g>`));
      return `<defs>${lin(s1, [[0, '#59a6e0'], [0.55, '#a9dcf0'], [1, '#fbf1d8']])}${lin(w1, [[0, '#7ad0cf'], [0.4, '#2f9fb4'], [1, '#13607e']])}${linU(t1, [[0, '#f1e4c4'], [1, '#c9b48a']], 0, 280, 0, 640)}</defs>`
        + full(`url(#${s1})`) + sun(1380, 150, 38, '#fffbe6', '#fff0b8') + cloud(380, 200, 1, '#e4f0f8', 0.92, 62, 3) + cloud(1060, 150, 0.8, '#e2eff8', 0.9, 54, 14) + streak(700, 100, 300, '#fff', 0.5, 80)
        + birds(14, 4, 560, 250, '#3a6076', 1, 600)
        + mv('uspar', { ad: '40s', dx: '8px' }, city(41, -160, 1760, 640, 40, 130, 24, 56, '#b5d0de')) + haze(530, 110, '#f6efd8', 0.55)
        + mv('uspar', { ad: '30s', dx: '12px' },
          `<path fill="#cdbf9e" d="M470 640V400Q470 360 510 360V640z"/>${win(476, 380, 26, 240, 9, 18)}<path fill="#c8d8e4" d="M530 640V250l26 -34l26 34V640z"/><path fill="#8ea8bc" opacity=".6" d="M556 216l26 34V640h-26z"/>${win(540, 270, 34, 340, 10, 18)}`
          + `<path fill="#e6d8b6" d="M690 640V292Q690 280 728 270Q766 280 766 292V640z"/><path d="${lat}" stroke="#a88e5c" stroke-width="2.6" fill="none"/><path fill="#c5ae80" opacity=".6" d="M728 270Q766 280 766 292V640h-38z"/><path d="M728 270V230" stroke="#a88e5c" stroke-width="3"/>`
          + `<path fill="#7fb4cc" d="M860 640V330L912 214L964 330V640z"/><path fill="#4f88a6" opacity=".6" d="M912 214L964 330V640h-52z"/>${win(872, 340, 80, 280, 13, 20)}<path d="M912 214V170" stroke="#4f88a6" stroke-width="3"/>`
          + `<path fill="#e1d2ad" d="M1040 640V340L1090 340V640z"/><path d="${lat2}" stroke="#9c8456" stroke-width="2.4" fill="none"/><path fill="#f0e6c8" d="M1040 340l50 0l-25 -34z"/>`
          + `<path fill="#d5c9ae" d="M1150 640V420h60V640z"/>${win(1160, 436, 40, 190, 10, 18)}<path fill="#a8c0d2" d="M1240 640V380Q1280 330 1320 380V640z"/>${win(1250, 400, 60, 220, 11, 18)}`
          + `<path fill="#a4bccd" d="M1350 640V470h80V640z"/>${win(1360, 484, 60, 140, 11, 18)}`)
        + mv('usflicker', { ad: '1.8s', to: '556px 214px' }, '<circle cx="556" cy="212" r="4" fill="#ff6a4a"/>')
        + `<rect y="640" width="1600" height="260" fill="url(#${w1})"/>`
        + `<path fill="#e2d3ae" d="M-160 640H1760V664H-160z"/><path fill="#c9b78e" d="M-160 656H1760V668H-160z"/>`
        + dots('M-160 650H1760', '#fff3d0', 4, 44, 'us-lamps')
        + shimmer(15, 26, -100, 1700, 680, 890, '#e8fbff', 90) + shimmer(16, 18, 200, 1400, 670, 760, '#fff', 60)
        + sail(420, 760, 1.15, 120, 10, 2000) + sail(1150, 800, 0.8, 170, 80, 2000) + sail(840, 710, 0.5, 220, 40, 2000)
        + `<path fill="#e6d6ae" d="M-160 828Q800 770 1760 828V900H-160z"/><path fill="#cdb98c" d="M-160 860Q800 806 1760 860V900H-160z"/>`
        + palm(100, 860, 250, 24, '#6a523c', '#3d7a3a', 6, 0) + palm(230, 880, 170, -18, '#6a523c', '#4d8a3a', 7, 2) + palm(1500, 870, 260, -22, '#6a523c', '#3d7a3a', 7, 1) + palm(1380, 886, 180, 18, '#6a523c', '#4d8a3a', 6, 3)
        + `<rect x="-160" y="858" width="1920" height="4" fill="#fff" opacity=".4"/>`
        + finish(0.3);
    } });

  /* ---------- Kuwait City: the slender towers and their blue spheres at sunset over the Gulf ---------- */
  asiaSceneAdd({ key: 'place:kuwait-city', label: 'The slender towers over the Gulf', site: 'The towers on the Gulf shore', colour: 'violet', mood: 'dreamy', season: 'any', tags: ['towers', 'gulf', 'sunset', 'waterfront'],
    svg: () => {
      const s1 = U(), w1 = U(), b1 = U(), g1 = U();
      const sphere = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${b1})"/><path d="M${x - r} ${y}Q${x} ${y + r * 0.35} ${x + r} ${y}M${x - r * 0.86} ${y - r * 0.5}Q${x} ${y - r * 0.2} ${x + r * 0.86} ${y - r * 0.5}M${x - r * 0.86} ${y + r * 0.5}Q${x} ${y + r * 0.8} ${x + r * 0.86} ${y + r * 0.5}" fill="none" stroke="#e8f4f8" stroke-width="${Math.max(2, R(r / 9))}" opacity=".85"/><ellipse cx="${R(x - r * 0.35)}" cy="${R(y - r * 0.4)}" rx="${R(r * 0.22)}" ry="${R(r * 0.14)}" fill="#fff" opacity=".6"/>`;
      const shaft = (x, top, w) => `<path fill="#c8d0dc" d="M${x - w} 640L${x - 3} ${top}h6L${x + w} 640z"/><path fill="#8d92ae" opacity=".6" d="M${x} 640V${top}h3L${x + w} 640z"/>`;
      let ref = '';
      return `<defs>${lin(s1, [[0, '#35366f'], [0.3, '#8a5a9c'], [0.58, '#ec7a8e'], [0.8, '#ffb48a'], [1, '#ffd9a0']])}${lin(w1, [[0, '#ee9a98'], [0.2, '#6a5a9c'], [1, '#262a62']])}${radU(b1, [[0, '#9fe0e6'], [0.6, '#3b8ec0'], [1, '#235b92']], 0, 0, 1)}${lin(g1, [[0, '#ffbe8e', 0.7], [1, '#ffbe8e', 0]])}</defs>`
        + full(`url(#${s1})`) + stars(8, 36, 220) + rays(1150, 600, 1100, '#ffd0a8', 0.1) + sun(1150, 610, 58, '#fff0c8', '#ff9a6a')
        + streak(320, 190, 320, '#ffb0b0', 0.5) + streak(1250, 280, 250, '#ff9a86', 0.55, 70) + cloud(520, 330, 1, '#b568a0', 0.8, 60, 8, '#ffb69c') + cloud(1380, 410, 0.8, '#b8689e', 0.75, 52, 24, '#ffc0a4')
        + birds(18, 5, 400, 380, '#43305a', 1, 620)
        + mv('uspar', { ad: '40s', dx: '8px' }, city(51, -160, 1760, 650, 30, 110, 26, 58, '#9a7aa8')) + haze(560, 90, '#ffb890', 0.5)
        + mv('uspar', { ad: '32s', dx: '10px' }, city(52, -160, 560, 650, 50, 170, 30, 64, '#7d629e', 0.28) + city(53, 1060, 1760, 650, 50, 160, 30, 62, '#7d629e', 0.28))
        + shaft(720, 214, 20) + sphere(720, 440, 52) + sphere(720, 280, 22) + `<path d="M720 214V120" stroke="#cfd6e2" stroke-width="3"/>`
        + shaft(870, 330, 15) + sphere(870, 470, 36) + `<path d="M870 330V240" stroke="#cfd6e2" stroke-width="2.5"/>`
        + `<path fill="#c8d0dc" d="M1004 650L1007 280h6l3 370z"/><path fill="#8d92ae" opacity=".55" d="M1010 650V280h3l3 370z"/>`
        + `<rect x="620" y="632" width="460" height="24" rx="6" fill="#6a5a8e"/><rect x="660" y="620" width="380" height="14" fill="#8b7aa6"/>`
        + mv('usflicker', { ad: '1.7s', to: '720px 120px' }, '<circle cx="720" cy="118" r="5" fill="#ff6a5a"/>') + mv('usflicker', { ad: '2.1s', d: '-.5s', to: '870px 240px' }, '<circle cx="870" cy="238" r="4" fill="#ff7a6a"/>')
        + lit(700, 520, 8, 14) + lit(736, 520, 8, 14)
        + `<rect y="650" width="1600" height="250" fill="url(#${w1})"/><rect y="650" width="1600" height="50" fill="url(#${g1})"/>`
        + `<g transform="translate(0 1300) scale(1 -1)" opacity=".28"><path fill="#c8d0dc" d="M700 640L717 214h6L740 640z"/><circle cx="720" cy="440" r="52" fill="#3b8ec0"/><circle cx="720" cy="280" r="22" fill="#3b8ec0"/><circle cx="870" cy="470" r="36" fill="#3b8ec0"/></g>`
        + `<path d="M718 664V880M722 664V880" stroke="#ffd0a0" stroke-width="6" opacity=".18"/>`
        + shimmer(21, 28, 300, 1500, 670, 800, '#ffd9a8', 80) + shimmer(22, 22, -100, 1700, 760, 890, '#e8a08e', 90)
        + dots('M-40 656H1700', '#ffe2b0', 4, 38, 'us-lamps')
        + mv('usmove', { ad: '100s', dx: '1900px' }, mv('usbob', { ad: '3.4s', dy: '3px' }, `<g transform="translate(500 800)"><path fill="#2a2150" d="M-60 0l12 24h110l30 -30z"/><rect x="-22" y="-26" width="36" height="20" fill="#3d3068"/>${lit(-12, -20, 8, 10)}</g>`))
        + `<path fill="#5a4678" d="M-160 860Q400 830 800 856T1760 850V900H-160z"/><path fill="#43335f" d="M-160 884Q500 862 1000 880T1760 880V900H-160z"/>`
        + palm(120, 870, 260, 30, '#3c2d4c', '#2f3f4a', 6, 0) + palm(1480, 880, 300, -30, '#3c2d4c', '#2a3a48', 7, 2)
        + finish(0.36);
    } });
  /** A yurt: felt walls, a domed roof with a smoke ring, a patterned band and a door. (x, y = foot) */
  const yurt = (x, y, s, felt, band, door) => `<g transform="translate(${x} ${y}) scale(${s})"><path fill="${felt}" d="M-62 0V-46Q-64 -52 -52 -62Q-24 -96 0 -98Q24 -96 52 -62Q64 -52 62 -46V0z"/><path fill="#000" opacity=".12" d="M0 -98Q24 -96 52 -62Q64 -52 62 -46V0H0z"/><rect x="-62" y="-34" width="124" height="9" fill="${band}"/><path d="M-62 -29.5H62" stroke="#fff" stroke-width="3" stroke-dasharray="3 8" opacity=".7"/><path d="M-60 -48Q0 -60 60 -48" fill="none" stroke="${band}" stroke-width="3"/><path fill="${door}" d="M-12 0V-30Q0 -38 12 -30V0z"/><circle cx="0" cy="-99" r="8" fill="#6a4a38"/></g>`;
  /** A grazing horse (x, y = hoof line): body, neck, head down, legs, tail. */
  const horse = (x, y, s, col, mane) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="-34" rx="34" ry="15" fill="${col}"/><path fill="${col}" d="M24 -40L44 -34L52 -4L44 -2L36 -26z"/><path fill="${col}" d="M44 -34L62 -26L64 -18L52 -20z" opacity=".9"/><path d="M22 -46Q36 -40 44 -30" stroke="${mane}" stroke-width="5" fill="none"/><path d="M-26 -42Q-52 -40 -50 -10" stroke="${mane}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M-20 -22V0M-10 -22V0M16 -22V0M26 -22V0" stroke="${col}" stroke-width="5" stroke-linecap="round"/></g>`;
  /** A flame (teardrop) in a flickering wrapper. */
  const flame = (x, y, h, w, col, dur, del) => mv('usflicker', { ad: dur + 's', d: -del + 's', to: `${x}px ${y}px` }, `<path fill="${col}" d="M${x - w} ${y}Q${x - w * 0.5} ${y - h * 0.5} ${x - w * 0.1} ${y - h}Q${x + w * 0.3} ${y - h * 0.5} ${x + w} ${y}z"/>`);

  /* ---------- Kazakhstan: the red canyon at sunset, the river and the eagles ---------- */
  asiaSceneAdd({ key: 'country:KZ', label: 'The red canyon at sunset', site: 'Charyn Canyon', colour: 'orange', mood: 'proud', season: 'any', tags: ['canyon', 'landscape', 'sunset', 'steppe'],
    svg: () => {
      const s1 = U(), r1 = U(), c1 = U();
      const spire = (x, y, w, h, fill, dark) => {
        let g = '';
        for (let i = 1; i < 6; i++) g += `M${R(x - w / 2 + (w * i) / 6)} ${y + h}l${R((i - 3) * 2)} ${-R(h * 0.8)}`;
        return `<path fill="${fill}" d="M${x - w / 2} ${y + h}L${x - w * 0.42} ${y + h * 0.3}L${x - w * 0.3} ${y + h * 0.18}L${x - w * 0.12} ${y}L${x + w * 0.1} ${y + h * 0.1}L${x + w * 0.32} ${y + h * 0.22}L${x + w * 0.46} ${y + h * 0.4}L${x + w / 2} ${y + h}z"/><path d="${g}" stroke="${dark}" stroke-width="3" fill="none" opacity=".55"/><path fill="${dark}" opacity=".3" d="M${x + w * 0.1} ${y + h * 0.1}L${x + w * 0.32} ${y + h * 0.22}L${x + w * 0.46} ${y + h * 0.4}L${x + w / 2} ${y + h}H${x}z"/>`;
      };
      return `<defs>${lin(s1, [[0, '#6a7fb4'], [0.35, '#e9a0a0'], [0.65, '#ffc487'], [1, '#ffe6b0']])}${lin(r1, [[0, '#4fb8b0'], [1, '#1f6f78']])}${lin(c1, [[0, '#ffb070', 0.55], [1, '#ffb070', 0]])}</defs>`
        + full(`url(#${s1})`) + rays(800, 500, 1100, '#ffe0b0', 0.1) + sun(800, 520, 52, '#fff3d0', '#ffb468')
        + streak(300, 170, 300, '#ffc8b0', 0.5) + streak(1300, 250, 240, '#ffb090', 0.5, 70) + cloud(500, 300, 0.9, '#d58a98', 0.8, 60, 5, '#ffd0b0') + cloud(1280, 360, 0.7, '#d38e9a', 0.75, 52, 18, '#ffd6b6')
        + birds(23, 4, 900, 330, '#4a2f40', 1, 560)
        + mv('uspar', { ad: '40s', dx: '8px' }, ridge('#c98a70', 560, 80, 12, 61) + ridge('#b6745c', 600, 60, 14, 62)) + haze(500, 120, '#ffc89a', 0.5)
        + mv('uspar', { ad: '32s', dx: '14px' }, spire(300, 330, 150, 340, '#b8603c', '#6a2e28') + spire(520, 400, 120, 270, '#c26c44', '#6a2e28') + spire(1120, 380, 130, 290, '#c26c44', '#6a2e28') + spire(1340, 320, 160, 350, '#b8603c', '#6a2e28') + ridge('#a9533a', 640, 40, 14, 63))
        + `<path fill="#8a3f30" d="M-160 900V260Q-100 240 -60 300L40 340L120 330L180 420L240 440L300 520L370 560L430 640L520 700L600 760L680 820L700 900z"/><path fill="#a24a36" opacity=".8" d="M-160 560L60 520L200 560L300 600L420 660L520 740L600 820L640 900H-160z"/><path d="M-100 360L40 460L160 480M-40 470L120 560L260 580M20 580L180 650L340 680" stroke="#c9704a" stroke-width="9" opacity=".5" fill="none" stroke-linecap="round"/>`
        + `<path fill="#8a3f30" d="M1760 900V240Q1700 230 1660 300L1560 350L1480 340L1420 430L1360 450L1300 530L1230 570L1170 650L1090 710L1020 770L960 840L940 900z"/><path fill="#a24a36" opacity=".8" d="M1760 540L1580 520L1460 570L1360 610L1240 670L1150 740L1060 820L1030 900H1760z"/><path d="M1700 380L1560 470L1440 490M1640 480L1480 570L1340 590M1600 590L1420 660L1280 690" stroke="#c9704a" stroke-width="9" opacity=".5" fill="none" stroke-linecap="round"/>`
        + `<path fill="url(#${r1})" d="M690 900L740 760Q790 700 800 650Q820 690 850 760L930 900z"/><path fill="url(#${r1})" opacity=".8" d="M760 760Q800 690 800 650Q830 700 860 760z"/>`
        + shimmer(25, 16, 700, 900, 700, 890, '#c9fff2', 40)
        + `<rect y="600" width="1600" height="300" fill="url(#${c1})"/>`
        + mv('uspar', { ad: '26s', dx: '10px' }, `<path fill="#4f3a2e" d="M-160 900V800Q40 760 120 820Q200 770 300 840V900z"/><path fill="#4f3a2e" d="M1760 900V790Q1560 760 1500 830Q1400 780 1280 850V900z"/>`
          + canopy('#5a6a2e', 868, 26, 71, 660, 960))
        + mv('usflap', { ad: '1s', to: '1000px 400px' }, '') + birds(27, 2, 700, 260, '#2c1c1c', 2.2, 380)
        + finish(0.34);
    } });

  /* ---------- Almaty: the alpenglow range above the city, autumn orchards and the old wooden cathedral ---------- */
  asiaSceneAdd({ key: 'place:almaty', label: 'The snow range above the city', site: 'The mountains above Almaty', colour: 'indigo', mood: 'calm', season: ['autumn'], tags: ['mountains', 'city', 'autumn', 'cathedral'],
    svg: () => {
      const s1 = U(), f1 = U();
      let tiers = '';
      for (const [w, y, h, c] of [[80, 590, 40, '#f4d58a'], [60, 550, 40, '#e9a86a'], [42, 512, 38, '#f2c96e']]) tiers += `<rect x="${430 - w / 2}" y="${y}" width="${w}" height="${h}" fill="${c}"/><rect x="${430 - w / 2 - 6}" y="${y - 6}" width="${w + 12}" height="8" fill="#b8693e"/>`;
      let lat = '';
      for (let i = 0; i < 12; i++) lat += `M1196 ${640 - i * 16}l8 -16M1204 ${640 - i * 16}l-8 -16`;
      let trees = '';
      const cols = ['#e0762a', '#d9a02a', '#c2452a', '#e8b83a', '#b8602a'];
      for (let i = 0; i < 22; i++) { const r = rnd(i + 90), x = -80 + i * 82 + r() * 30, y = 790 + (i % 3) * 30 + r() * 20, rr = 34 + r() * 22; trees += `<circle cx="${R(x)}" cy="${R(y - rr)}" r="${R(rr)}" fill="${cols[i % 5]}"/><path d="M${R(x)} ${R(y)}V${R(y - rr * 0.5)}" stroke="#4a3022" stroke-width="5"/>`; }
      return `<defs>${lin(s1, [[0, '#3a4a8e'], [0.3, '#8f7aae'], [0.55, '#f2a0b0'], [0.8, '#ffd0b0'], [1, '#ffe8c8']])}${lin(f1, [[0, '#7f86b8', 0], [1, '#7f86b8', 0.6]])}</defs>`
        + full(`url(#${s1})`) + stars(31, 40, 200) + sun(1000, 360, 40, '#fff0d0', '#ffc0a0', true)
        + cloud(300, 230, 0.8, '#d98aa8', 0.7, 66, 4, '#ffd0c0') + cloud(1300, 180, 0.7, '#d98aa8', 0.7, 58, 20, '#ffd6c8') + birds(33, 4, 700, 300, '#3a2f55', 1, 600)
        + mv('uspar', { ad: '44s', dx: '8px' }, peak(280, 170, 620, 440, '#6a6aa4', '#4a4a86', '#ffd8dc', 5) + peak(1280, 140, 700, 470, '#6a6aa4', '#4a4a86', '#ffd8dc', 6) + peak(760, 120, 780, 500, '#7a76ae', '#524f90', '#ffe4e0', 7) + peak(1560, 250, 520, 360, '#7a76ae', '#524f90', '#ffe0e0', 8))
        + mv('uspar', { ad: '34s', dx: '12px' }, peak(100, 330, 560, 330, '#5a5f94', '#3f4478', '#f6c8d0', 9) + peak(1040, 300, 600, 340, '#5a5f94', '#3f4478', '#f6c8d0', 10) + ridge('#4c5486', 560, 70, 12, 11))
        + `<rect y="430" width="1600" height="230" fill="url(#${f1})"/>` + haze(560, 90, '#ffc8b8', 0.5)
        + ridge('#3d3f6e', 640, 40, 14, 12, 700) + `<path fill="#3d3f6e" d="M1120 640Q1160 600 1196 540L1204 540Q1240 600 1280 640z"/>`
        + `<path d="M1200 640V310" stroke="#d8d4e8" stroke-width="6"/><path d="${lat}" stroke="#d8d4e8" stroke-width="2" fill="none"/><path d="M1200 310V240" stroke="#d8d4e8" stroke-width="3"/><rect x="1186" y="400" width="28" height="12" fill="#d8d4e8"/>`
        + mv('usflicker', { ad: '1.8s', to: '1200px 240px' }, '<circle cx="1200" cy="238" r="4" fill="#ff5a4a"/>')
        + mv('uspar', { ad: '30s', dx: '10px' }, city(81, -160, 1760, 720, 30, 110, 26, 54, '#6a6aa0', 0.5) + `<rect y="716" width="1600" height="190" fill="#4a4a7e"/>`)
        + tiers + `<path fill="#d9a63a" d="M410 512l20 -40l20 40z"/><path fill="#d9a63a" d="M${430 - 62} 590l12 -22l12 22zM${430 + 38} 590l12 -22l12 22z"/>` + lit(418, 604, 8, 18) + lit(436, 604, 8, 18) + lit(418, 566, 8, 14) + lit(436, 566, 8, 14)
        + dots('M-160 722H1760', '#ffd88a', 4, 30, 'us-lamps') + dots('M-160 744H1760', '#ffd88a', 3, 22, 'us-lamps')
        + mv('uspar', { ad: '24s', dx: '14px' }, trees)
        + `<path fill="#3d2a3a" d="M-160 900V850Q400 820 800 850T1760 840V900z"/>`
        + mv('usfall', { ad: '11s', dx: '90px' }, '<path fill="#d9702a" d="M300 120q10 -8 18 0q-6 10 -18 0z"/>') + mv('usfall', { ad: '13s', d: '-5s', dx: '-70px' }, '<path fill="#e8a42a" d="M1100 80q10 -8 18 0q-6 10 -18 0z"/>') + mv('usfall', { ad: '9s', d: '-2s', dx: '60px' }, '<path fill="#c2452a" d="M700 100q10 -8 18 0q-6 10 -18 0z"/>')
        + finish(0.36);
    } });

  /* ---------- Uzbekistan: the three tiled madrasas and their ribbed turquoise domes ---------- */
  asiaSceneAdd({ key: 'country:UZ', label: 'The tiled madrasas and turquoise domes', site: 'The Registan', colour: 'teal', mood: 'proud', season: 'any', tags: ['madrasa', 'domes', 'silk road', 'architecture'],
    svg: () => {
      const s1 = U(), g1 = U(), p1 = U();
      const iwan = (cx, base, w, h) => {
        const ax = cx - w * 0.3, bx = cx + w * 0.3, top = base - h * 0.96, yy = base - h * 0.62;
        return `<path fill="#15407f" d="M${ax} ${base}V${yy}C${ax} ${R(yy - h * 0.2)} ${cx - 14} ${R(top + 30)} ${cx} ${R(top)}C${cx + 14} ${R(top + 30)} ${bx} ${R(yy - h * 0.2)} ${bx} ${yy}V${base}z`
          + `<path fill="#2a7fb8" d="M${ax + 16} ${base}V${yy + 20}C${ax + 16} ${R(yy - h * 0.1)} ${cx - 8} ${R(top + 56)} ${cx} ${R(top + 40)}C${cx + 8} ${R(top + 56)} ${bx - 16} ${R(yy - h * 0.1)} ${bx - 16} ${yy + 20}V${base}z`
          + `<path fill="#0f2a5a" d="M${ax + 40} ${base}V${yy + 80}Q${cx} ${R(yy + 20)} ${bx - 40} ${yy + 80}V${base}z"/><path d="M${ax} ${R(yy + 30)}Q${cx} ${R(top + 10)} ${bx} ${R(yy + 30)}" stroke="#7fd0d6" stroke-width="3" fill="none" stroke-dasharray="4 8"/>`
          + `<path d="M${ax + 6} ${R(base - h * 0.3)}H${bx - 6}M${ax + 6} ${R(base - h * 0.45)}H${bx - 6}" stroke="#bfe8ee" stroke-width="3" stroke-dasharray="3 7" opacity=".8"/>`;
      };
      const facade = (x, w, h, base) => {
        const cx = x + w / 2; let n = '';
        for (const sx of [x + 14, x + w - 14 - w * 0.17]) for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) n += `<path fill="#6d4a30" d="M${R(sx + c * w * 0.085 + 2)} ${base - 40 - r * h * 0.3}v${-R(h * 0.15)}a${R(w * 0.03)} ${R(w * 0.03)} 0 0 1 ${R(w * 0.06)} 0v${R(h * 0.15)}z" opacity=".75"/>`;
        return `<path fill="#dfb680" d="M${x} ${base}V${base - h}h${w}V${base}z"/><path fill="#b78a56" opacity=".45" d="M${cx} ${base - h}h${w / 2}V${base}H${cx}z"/><rect x="${x}" y="${base - h}" width="${w}" height="14" fill="#2a7fb8"/><path d="M${x} ${base - h + 7}H${x + w}" stroke="#bfe8ee" stroke-width="3" stroke-dasharray="3 7"/><rect x="${x}" y="${base - h - 16}" width="${w}" height="8" fill="#dfb680" opacity=".95"/>` + n + iwan(cx, base, w, h);
      };
      const minaret = (x, base, h, lean) => {
        let b = '';
        for (let i = 0; i < 7; i++) b += `M${x - 17} ${base - 30 - i * (h / 8)}h34`;
        return `<g transform="rotate(${lean} ${x} ${base})"><path fill="#d8aa72" d="M${x - 19} ${base}V${base - h}h38V${base}z"/><path fill="#a87a4a" opacity=".5" d="M${x} ${base}V${base - h}h19V${base}z"/><path d="${b}" stroke="#2a7fb8" stroke-width="9"/><path d="${b}" stroke="#bfe8ee" stroke-width="2" stroke-dasharray="3 6" transform="translate(0 0)"/><rect x="${x - 25}" y="${base - h}" width="50" height="12" fill="#2a7fb8"/><path fill="#2ba2b8" d="M${x - 22} ${base - h - 2}Q${x - 24} ${base - h - 34} ${x} ${base - h - 46}Q${x + 24} ${base - h - 34} ${x + 22} ${base - h - 2}z"/>${lit(x - 5, base - h * 0.45, 10, 16)}</g>`;
      };
      const rdome = (cx, by, r) => {
        let ribs = '';
        for (let i = -3; i <= 3; i++) ribs += `M${cx + i * (r / 3.4)} ${by}Q${cx + i * (r / 2.1)} ${R(by - r * 1.0)} ${cx} ${R(by - r * 1.4)}`;
        return `<rect x="${cx - r * 0.78}" y="${by}" width="${r * 1.56}" height="${r * 0.9}" fill="#d8aa72"/><rect x="${cx - r * 0.78}" y="${by + r * 0.3}" width="${r * 1.56}" height="9" fill="#2a7fb8"/>` + `<path fill="#26a6bd" d="M${cx - r * 0.95} ${by + 6}C${cx - r * 1.35} ${R(by - r * 0.8)} ${R(cx - r * 0.4)} ${R(by - r * 1.25)} ${cx} ${R(by - r * 1.55)}C${R(cx + r * 0.4)} ${R(by - r * 1.25)} ${R(cx + r * 1.35)} ${R(by - r * 0.8)} ${R(cx + r * 0.95)} ${by + 6}z"/><path d="${ribs}" stroke="#176f8c" stroke-width="3" fill="none" opacity=".7"/><path d="M${cx} ${R(by - r * 1.55)}v-18" stroke="#d9b54a" stroke-width="3"/>`;
      };
      return `<defs>${lin(s1, [[0, '#3a95d8'], [0.55, '#a8dcee'], [1, '#f8ecd0']])}${lin(g1, [[0, '#e6c88c'], [1, '#bd9660']])}${lin(p1, [[0, '#d8b17a', 0], [1, '#6a4a30', 0.4]])}</defs>`
        + full(`url(#${s1})`) + sun(240, 180, 38, '#fffbe6', '#fff0b8') + cloud(600, 190, 0.9, '#e2eff8', 0.9, 62, 4) + cloud(1300, 140, 0.75, '#e0eef8', 0.9, 54, 18) + streak(900, 300, 260, '#fff', 0.45, 80)
        + mv('uspar', { ad: '38s', dx: '10px' }, rdome(330, 400, 74) + rdome(1270, 400, 74) + `<rect x="130" y="450" width="1340" height="200" fill="#d4a870"/>`)
        + haze(560, 100, '#f4e6c8', 0.4)
        + facade(150, 300, 300, 680) + facade(1150, 300, 300, 680) + facade(560, 480, 440, 700)
        + minaret(110, 700, 330, -1.4) + minaret(1490, 700, 330, 1.4) + minaret(520, 710, 380, -1.2) + minaret(1080, 710, 380, 1.2)
        + `<rect y="700" width="1600" height="200" fill="url(#${g1})"/><rect y="700" width="1600" height="200" fill="url(#${p1})"/>`
        + `<path d="M-160 760H1760M-160 820H1760M-160 880H1760" stroke="#c9a070" stroke-width="3" opacity=".5"/><path d="M200 700L-100 900M1400 700L1700 900M800 700V900" stroke="#c9a070" stroke-width="3" opacity=".35"/>`
        + `<path fill="#6a4a30" opacity=".28" d="M560 700H1040L1180 760H460z"/>`
        + mv('usglide', { ad: '19s', dx: '700px', dy: '-60px' }, '') + birds(41, 7, 760, 420, '#3a4a62', 1.1, 640) + birds(43, 5, 500, 560, '#4a5a72', 0.8, 500)
        + mv('usbob', { ad: '6s', dy: '3px' }, `<path fill="#6a8f4a" d="M20 900V810Q60 770 40 720Q90 770 80 810V900z" opacity=".9"/><path fill="#6a8f4a" d="M1520 900V800Q1560 770 1540 720Q1600 770 1590 810V900z" opacity=".9"/>`)
        + mv('ussway2', { ad: '5s', to: '1500px 900px' }, `<path fill="#4f7a3a" d="M1480 900V780Q1520 690 1560 780V900z"/>`) + mv('ussway2', { ad: '6s', d: '-2s', to: '120px 900px' }, `<path fill="#4f7a3a" d="M80 900V770Q120 680 160 770V900z"/>`)
        + finish(0.3);
    } });

  /* ---------- Turkmenistan: the burning crater in the desert at dusk ---------- */
  asiaSceneAdd({ key: 'country:TM', label: 'The burning crater in the desert', site: 'The Karakum Desert crater', colour: 'orange', mood: 'dreamy', season: 'any', tags: ['desert', 'crater', 'fire', 'dunes'],
    svg: () => {
      const s1 = U(), g1 = U(), c1 = U(), d1 = U();
      const flames = [[640, 640, 120, 24, '#ff7a1a', 0.5, 0.1], [700, 650, 170, 30, '#ff9a2a', 0.62, 0.3], [770, 640, 140, 26, '#ffb23a', 0.45, 0.2], [830, 652, 200, 34, '#ff7a1a', 0.7, 0.5], [900, 642, 150, 28, '#ff9a2a', 0.52, 0.4], [960, 650, 130, 24, '#ffc84a', 0.58, 0.6], [740, 654, 90, 20, '#ffe08a', 0.4, 0.15], [870, 656, 100, 22, '#ffe08a', 0.46, 0.35], [1010, 646, 90, 20, '#ff7a1a', 0.5, 0.2], [600, 650, 80, 18, '#ff9a2a', 0.44, 0.55]];
      let fl = ''; for (const f of flames) fl += flame(f[0], f[1], f[2], f[3], f[4], f[5], f[6]);
      const tent = (x, y, s) => `<path fill="#3a2a36" d="M${x - 40 * s} ${y}Q${x} ${y - 70 * s} ${x + 40 * s} ${y}z"/>${lit(x - 5 * s, y - 20 * s, 10 * s, 16 * s)}`;
      return `<defs>${lin(s1, [[0, '#17143c'], [0.4, '#4a2a60'], [0.7, '#b0485a'], [1, '#f0903a']])}${lin(g1, [[0, '#6a3a30'], [1, '#2a1a20']])}${radU(c1, [[0, '#ffb44a', 0.9], [0.4, '#ff7a1a', 0.4], [1, '#ff5a1a', 0]], 800, 620, 560)}${radU(d1, [[0, '#ffd07a'], [0.5, '#ff7a1a'], [1, '#a02a10']], 800, 640, 220)}</defs>`
        + full(`url(#${s1})`) + stars(51, 70, 360) + sun(1380, 600, 30, '#ffd098', '#ff9060', true)
        + streak(300, 160, 280, '#a05a8a', 0.4) + streak(1200, 240, 240, '#c0607a', 0.45, 70) + cloud(500, 330, 0.7, '#7a3a68', 0.7, 60, 4, '#d0707a')
        + birds(53, 3, 1100, 300, '#2a1a30', 1, 500)
        + mv('uspar', { ad: '44s', dx: '8px' }, ridge('#6a3a4a', 600, 40, 12, 71) + ridge('#52303e', 640, 36, 13, 72))
        + `<rect y="600" width="1600" height="300" fill="url(#${g1})"/><path d="M-160 700Q400 660 800 700T1760 690" stroke="#8a4a38" stroke-width="3" fill="none" opacity=".5"/>`
        + `<rect width="1600" height="900" fill="url(#${c1})"/>`
        + tent(260, 660, 1.1) + tent(350, 668, 0.9) + tent(1370, 664, 1.2) + dots('M230 636Q300 628 370 640', '#ffd27a', 4, 18, 'us-lamps')
        + `<ellipse cx="800" cy="640" rx="260" ry="62" fill="#3a1a1a"/><ellipse cx="800" cy="640" rx="236" ry="52" fill="url(#${d1})"/>`
        + fl
        + puffs(800, 600, 6, '#4a2a2a', 40, 90, 6, -300, 3.4) + puffs(760, 610, 5, '#ff9a2a', 5, -30, 3.2, -280, 1.4) + puffs(860, 612, 4, '#ffb23a', 5, 40, 3.8, -240, 1.4)
        + `<path fill="url(#${g1})" d="M530 650Q700 724 800 724Q900 724 1070 650Q1060 700 800 742Q540 700 530 650z"/><path fill="#8a4a3a" opacity=".6" d="M540 660Q700 726 800 726Q900 726 1060 660Q1040 690 800 716Q560 690 540 660z"/>`
        + `<path fill="#4a2a28" d="M-160 900V780Q200 730 560 790Q800 830 1040 790Q1400 730 1760 790V900z"/><path fill="#2a1a20" d="M-160 900V850Q300 800 700 860T1760 850V900z"/>`
        + shimmer(61, 14, 520, 1080, 600, 650, '#ffd27a', 50)
        + mv('usbob', { ad: '1.2s', dy: '1.5px' }, `<g opacity=".35" fill="#ff9a2a"><rect x="560" y="600" width="480" height="8" rx="4"/></g>`)
        + finish(0.3);
    } });

  /* ---------- Tajikistan: the turquoise high lake under the snow peaks ---------- */
  asiaSceneAdd({ key: 'country:TJ', label: 'The turquoise lake under the snow peaks', site: 'The high Pamir lake', colour: 'blue', mood: 'calm', season: 'any', tags: ['mountains', 'lake', 'pamir', 'alpine'],
    svg: () => {
      const s1 = U(), l1 = U();
      const peaks = (flip) => peak(260, 170, 560, 400, '#7e8aa6', '#56627e', '#f6f9ff', 3) + peak(820, 120, 760, 450, '#7a86a4', '#525e7c', '#fff', 4) + peak(1380, 190, 640, 380, '#8692ae', '#5a6684', '#f6f9ff', 5);
      let road = '', yaks = '';
      for (const [x, y, s] of [[1180, 790, 0.9], [1290, 820, 1], [1100, 830, 0.8]]) yaks += `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="-34" rx="38" ry="22" fill="#2a2420"/><path fill="#1f1a18" d="M26 -42L52 -34L52 -14L38 -16z"/><path d="M-26 -16V0M-12 -16V0M14 -16V0M26 -16V0" stroke="#2a2420" stroke-width="6" stroke-linecap="round"/><path d="M-30 -22Q-34 -4 -26 6" stroke="#2a2420" stroke-width="8" fill="none"/></g>`;
      return `<defs>${lin(s1, [[0, '#2f6fc0'], [0.5, '#8ec4ea'], [1, '#eaf3f8']])}${lin(l1, [[0, '#46d0c8'], [0.5, '#1fa4b4'], [1, '#12687e']])}</defs>`
        + full(`url(#${s1})`) + sun(1380, 140, 34, '#fffbe6', '#fff4c8') + cloud(380, 150, 0.9, '#f0f6fa', 0.92, 64, 3) + cloud(1200, 120, 0.7, '#eef5fa', 0.92, 52, 16) + streak(820, 90, 280, '#fff', 0.5, 90) + birds(63, 4, 700, 260, '#2f4258', 1.1, 600)
        + mv('uspar', { ad: '46s', dx: '8px' }, peaks(0)) + haze(450, 120, '#e9f3f8', 0.6)
        + mv('uspar', { ad: '34s', dx: '12px' }, ridge('#9a8a76', 520, 90, 12, 81) + ridge('#8a7a66', 560, 60, 14, 82))
        + `<rect y="560" width="1600" height="340" fill="url(#${l1})"/>`
        + `<g transform="translate(0 1100) scale(1 -1)" opacity=".34">${peaks(1)}${ridge('#9a8a76', 520, 90, 12, 81)}</g>`
        + `<rect y="560" width="1600" height="340" fill="url(#${l1})" opacity=".5"/>`
        + shimmer(91, 34, -100, 1700, 580, 880, '#e8fff8', 80) + shimmer(92, 20, 200, 1400, 570, 700, '#fff', 60)
        + `<path fill="#a69277" d="M-160 900V700Q100 650 340 700Q480 730 560 900z"/><path fill="#8a7658" d="M-160 900V760Q140 720 300 790Q400 840 420 900z"/><path fill="#b4a283" d="M1760 900V690Q1500 650 1260 700Q1100 740 1020 900z"/>`
        + `<path d="M1760 720Q1500 700 1380 760Q1260 830 1100 900" stroke="#d6c8a8" stroke-width="14" fill="none"/><path d="M1760 720Q1500 700 1380 760Q1260 830 1100 900" stroke="#7a6a50" stroke-width="2" stroke-dasharray="14 12" fill="none"/>`
        + mv('usmove', { ad: '60s', dx: '600px' }, '<rect x="1380" y="738" width="30" height="16" rx="3" fill="#3a5a7a"/><rect x="1396" y="730" width="14" height="10" fill="#2a4a6a"/>')
        + canopy('#7c8a3a', 780, 16, 94, 1020, 1300, 800) + canopy('#6c7a30', 800, 14, 95, 20, 280, 830)
        + yaks + `<path fill="#6a6a52" d="M-160 900V860Q300 830 700 870T1760 860V900z"/>`
        + finish(0.3);
    } });

  /* ---------- Kyrgyzstan: yurts, horses and flocks on the high summer pasture ---------- */
  asiaSceneAdd({ key: 'country:KG', label: 'Yurts and horses on the summer pasture', site: 'A summer pasture above the lake', colour: 'green', mood: 'cheerful', season: ['summer'], tags: ['yurt', 'pasture', 'horses', 'mountains'],
    svg: () => {
      const s1 = U(), l1 = U(), g1 = U();
      let flowers = '';
      const fr = rnd(7), fc = ['#fff', '#ffd23a', '#ff7a9a', '#c18aff'];
      for (let i = 0; i < 60; i++) flowers += `<circle cx="${R(-100 + fr() * 1800)}" cy="${R(700 + fr() * 190)}" r="${(2 + fr() * 3).toFixed(1)}" fill="${fc[i % 4]}"/>`;
      let sheep = '';
      for (let i = 0; i < 9; i++) { const r = rnd(i + 5); sheep += `<g transform="translate(${R(r() * 300)} ${R(r() * 24)})"><ellipse cx="${60 + i * 34}" cy="740" rx="14" ry="9" fill="#f4efe6"/><circle cx="${74 + i * 34}" cy="738" r="5" fill="#3a2f2a"/></g>`; }
      return `<defs>${lin(s1, [[0, '#5a9ede'], [0.5, '#a9d6ef'], [1, '#f2f0dc']])}${lin(l1, [[0, '#4a9ac4'], [1, '#2f6f9c']])}${lin(g1, [[0, '#8bc34a'], [1, '#4f8a30']])}</defs>`
        + full(`url(#${s1})`) + sun(300, 140, 38, '#fffbe6', '#fff2b0') + cloud(560, 190, 1, '#f6fafc', 0.92, 62, 3) + cloud(1280, 150, 0.8, '#f2f8fb', 0.92, 52, 20) + cloud(900, 290, 0.6, '#f4f9fc', 0.88, 70, 30) + birds(71, 4, 1000, 280, '#34506a', 1, 560)
        + mv('uspar', { ad: '46s', dx: '8px' }, peak(400, 250, 700, 340, '#7f93ac', '#5f7690', '#f6faff', 21) + peak(1200, 220, 760, 370, '#7f93ac', '#5f7690', '#f6faff', 22) + ridge('#6a85a0', 540, 70, 12, 23))
        + haze(480, 90, '#eaf3f6', 0.6) + `<rect y="540" width="1600" height="60" fill="url(#${l1})"/><path d="M-160 560H1760" stroke="#e8fbff" stroke-width="2" opacity=".5"/>`
        + shimmer(101, 10, -100, 1700, 548, 596, '#fff', 60)
        + mv('uspar', { ad: '36s', dx: '10px' }, ridge('#5a9a40', 600, 50, 12, 24) + canopy('#2f6a38', 604, 16, 25, -160, 520, 640) + canopy('#2f6a38', 606, 14, 26, 1100, 1760, 640))
        + `<path fill="url(#${g1})" d="M-160 900V640Q300 590 800 640T1760 630V900z"/><path fill="#6faa3a" opacity=".6" d="M-160 900V740Q400 690 900 740T1760 730V900z"/>`
        + yurt(300, 690, 1.0, '#f4eee0', '#c4452a', '#7a3a22') + yurt(470, 700, 0.8, '#f1ead8', '#2a6fa8', '#6a3a22') + yurt(1280, 700, 1.15, '#f6f0e2', '#c4452a', '#7a3a22')
        + puffs(300, 592, 4, '#e8e4dc', 14, 40, 5, -120, 3) + puffs(1280, 586, 4, '#e8e4dc', 16, 50, 5.4, -130, 3)
        + mv('usmove', { ad: '70s', dx: '280px' }, sheep) + mv('usbob', { ad: '4s', dy: '2px' }, horse(760, 780, 1.1, '#6a3f26', '#2a1a14') + horse(940, 800, 1, '#d9c9a8', '#8a7a5a')) + mv('usbob', { ad: '5s', d: '-2s', dy: '2px' }, horse(1080, 770, 0.8, '#2a2220', '#14100e'))
        + `<g>${flowers}</g>` + mv('ussway', { ad: '5s', to: '800px 900px' }, `<path fill="#4f8a30" d="M-160 900V850Q400 820 800 860T1760 850V900z"/>`)
        + finish(0.3);
    } });

  /* ---------- Russia (Siberia and the Far East): a smoking volcano over the autumn tundra at dawn ---------- */
  asiaSceneAdd({ key: 'country:RU', label: 'The volcano over the autumn tundra', site: 'A volcano on the Kamchatka peninsula', colour: 'violet', mood: 'proud', season: ['autumn'], tags: ['volcano', 'tundra', 'dawn', 'far east'],
    svg: () => {
      const s1 = U(), v1 = U(), r1 = U();
      let gul = '';
      for (let i = 0; i < 9; i++) gul += `M${800 + (i - 4) * 14} ${300 + Math.abs(i - 4) * 10}Q${800 + (i - 4) * 60} ${460} ${800 + (i - 4) * 100} ${640}`;
      return `<defs>${lin(s1, [[0, '#4a4a92'], [0.3, '#a07ab0'], [0.6, '#f4a4a4'], [1, '#ffd8b0']])}${linU(v1, [[0, '#f8e4ee'], [0.5, '#c6a8c8'], [1, '#5c4a7c']], 520, 200, 1080, 640)}${lin(r1, [[0, '#f8c8a8'], [1, '#6a7aa6']])}</defs>`
        + full(`url(#${s1})`) + stars(111, 40, 220) + sun(300, 520, 46, '#fff0d0', '#ffb890', true) + rays(300, 520, 1000, '#ffd8b8', 0.08)
        + streak(1100, 160, 300, '#ffc8c0', 0.5) + streak(400, 230, 240, '#f0a8b8', 0.5, 70) + cloud(1300, 300, 0.8, '#d58aa4', 0.8, 60, 6, '#ffd0c0') + birds(113, 5, 500, 300, '#3a2f55', 1, 600)
        + mv('uspar', { ad: '44s', dx: '8px' }, peak(1360, 330, 520, 330, '#8a78b0', '#5f5090', '#fbe4ee', 31) + peak(180, 380, 460, 280, '#8a78b0', '#5f5090', '#fbe4ee', 32))
        + mv('uspar', { ad: '36s', dx: '10px' }, `<path fill="url(#${v1})" d="M520 640Q640 560 700 430Q740 330 770 250L800 232L832 252Q870 340 920 440Q980 560 1090 640z"/>` + `<path fill="#5c4a7c" opacity=".45" d="M800 232L832 252Q870 340 920 440Q980 560 1090 640H820z"/>` + `<path d="${gul}" stroke="#7a68a0" stroke-width="3" fill="none" opacity=".5"/>` + `<path fill="#fff" opacity=".7" d="M776 244L800 232L826 248L812 276L796 262L780 282z"/>`)
        + mv('usdrift', { ad: '60s', dx: '60px' }, puffs(800, 232, 8, '#f6e4ee', 38, 150, 9, -140, 3.4))
        + haze(560, 100, '#ffd0b8', 0.5)
        + mv('uspar', { ad: '30s', dx: '12px' }, ridge('#a85a4a', 640, 50, 12, 41) + canopy('#c9792a', 650, 22, 42, -160, 1760, 720))
        + `<path fill="url(#${r1})" d="M-160 900V780Q400 740 800 770Q1100 790 1300 750Q1600 710 1760 740V900z" opacity=".0"/>`
        + `<path fill="url(#${r1})" d="M560 900Q640 820 760 790Q900 760 1000 720Q1060 700 1120 706Q1020 740 900 790Q780 840 720 900z"/>`
        + shimmer(121, 14, 560, 1100, 720, 890, '#ffe8d0', 60)
        + `<path fill="#9a3f30" d="M-160 900V790Q200 730 560 790Q300 820 200 900z"/><path fill="#b9532a" d="M1760 900V780Q1400 730 1060 800Q1300 830 1400 900z"/><path fill="#d98a2a" d="M-160 900V850Q400 810 700 870T1760 860V900z"/>`
        + mv('ussway', { ad: '5s', to: '100px 900px' }, canopy('#e0a030', 860, 24, 43, 0, 700, 900) + canopy('#c2452a', 880, 20, 44, 900, 1700, 900))
        + mv('usdrift', { ad: '50s', dx: '120px' }, `<ellipse cx="500" cy="660" rx="380" ry="18" fill="#fff" opacity=".28"/><ellipse cx="1180" cy="690" rx="320" ry="14" fill="#fff" opacity=".25"/>`)
        + finish(0.34);
    } });
})();
