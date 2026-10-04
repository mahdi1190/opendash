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
})();
