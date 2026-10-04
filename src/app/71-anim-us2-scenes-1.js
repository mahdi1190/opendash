/* ============================================================
   US FULL-SCREEN SCENES, batch 1 (Northeast): CT DE ME MD MA NH NJ NY PA RI VT.
   Pure classic script: registers entries in US_SCENES through usSceneAdd(); usBuilder() (71-anim-us.js)
   upgrades the matching small icon to a full-screen opening. 1600 x 900 user units, sliced to fill any
   screen; the subject sits in the middle 1200 x 800, layers run to x -160 .. 1760 so they can drift.
   Colours are painted for daytime; finish() lays the evening grade and lights .us-lit / .us-lamps / .us-star.
   ============================================================ */
(function () {
  const K = usSceneKit();
  const { U, R, rnd, lin, linU, radU, mv, full, ridge, canopy, cloud, streak, haze, rays, sun, stars, birds, shimmer, puffs, dots, lit, finish, star5 } = K;

  /** Rows of window dots (lit at dusk): w wide from x, `rows` rows `gap` apart. */
  const win = (x, y, w, rows, gap, col) => dots(Array.from({ length: rows }, (_, i) => `M${x} ${y + i * gap}h${w}`).join(''), col || '#ffd98a', 5, 12, 'us-lamps');
  /** A row of city blocks along `base`, heights between hmin and hmax. */
  const city = (x0, x1, base, hmin, hmax, seed, fill, wcol, wopen) => {
    const r = rnd(seed); let x = x0, d = '', w2 = '';
    while (x < x1) {
      const w = R(26 + r() * 46), h = R(hmin + r() * (hmax - hmin));
      d += `M${x} ${base}V${base - h}h${w}V${base}z`;
      if (r() > 0.55) d += `M${x + R(w * 0.2)} ${base - h}v${-R(8 + r() * 18)}h${R(w * 0.6)}v${R(8 + r() * 18)}z`;
      if (wcol && r() > (wopen || 0.4)) w2 += win(x + 6, base - h + 14, w - 12, Math.min(6, R(h / 24)), 20, wcol);
      x += w + R(r() * 8);
    }
    return `<path fill="${fill}" d="${d}"/>` + w2;
  };
  /** A falling leaf. */
  const leaf = (x, y, col, dx, dur, del, s) => mv('usfall', { ad: dur + 's', d: -del + 's', dx: dx + 'px' }, `<path fill="${col}" d="M${x} ${y}q${R(7 * s)} ${-R(11 * s)} ${R(15 * s)} 0q${-R(7 * s)} ${R(11 * s)} ${-R(15 * s)} 0z"/>`);
  /** A round-crowned tree: crowns of three tones. */
  const crown = (x, y, rr, cols, seed, n, nu) => {
    const r = rnd(seed); let o = nu ? '' : `<ellipse cx="${x}" cy="${R(y + rr * 0.3)}" rx="${R(rr * 1.3)}" ry="${R(rr * 0.8)}" fill="#7a2a14"/>`;
    for (let i = 0; i < (n || 22); i++) { const a = r() * 6.283, d = Math.sqrt(r()) * rr; o += `<circle cx="${R(x + Math.cos(a) * d * 1.25)}" cy="${R(y + Math.sin(a) * d * 0.8)}" r="${R(rr * (0.22 + r() * 0.2))}" fill="${cols[i % cols.length]}"/>`; }
    return o;
  };
  const spruce = (x, y, h, col) => `<path fill="${col}" d="M${x} ${y - h}l${R(h * 0.16)} ${R(h * 0.34)}h${-R(h * 0.07)}l${R(h * 0.2)} ${R(h * 0.3)}h${-R(h * 0.09)}l${R(h * 0.24)} ${R(h * 0.36)}h${-R(h * 0.8)}l${R(h * 0.24)} ${-R(h * 0.36)}h${-R(h * 0.09)}l${R(h * 0.2)} ${-R(h * 0.3)}h${-R(h * 0.07)}z"/>`;

  /* ---------- Maine: the lighthouse in sea fog at dawn ---------- */
  usSceneAdd({ key: 'state:ME', label: 'Lighthouse in the sea fog', site: 'A Maine lighthouse at dawn', colour: 'slate', mood: 'calm', season: 'any', tags: ['lighthouse', 'fog', 'coast'],
    svg: () => {
      const s1 = U(), w1 = U(), b1 = U(), r1 = U(), b2 = U(); const cx = 1090;
      return `<defs>${lin(s1, [[0, '#8d9fb8'], [0.35, '#cbb9c4'], [0.6, '#f1d3c0'], [1, '#f6e3cf']])}${lin(w1, [[0, '#d9c9c6'], [0.1, '#7f98a8'], [1, '#2e4a5c']])}${linU(r1, [[0, '#59616a'], [1, '#262b33']], 0, 600, 0, 900)}${linU(b1, [[0, '#fff3c0', 0.75], [1, '#fff3c0', 0]], cx, 292, cx - 760, 292)}${radU(b2, [[0, '#fff0b8', 0.6], [1, '#fff0b8', 0]], cx, 287, 70)}</defs>`
        + full(`url(#${s1})`) + stars(4, 14, 140) + sun(430, 470, 40, '#fff6e2', '#ffd9bd', true)
        + streak(300, 150, 280, '#fff', 0.5) + streak(1250, 240, 240, '#f8e4e0', 0.5, 70) + cloud(860, 220, 1.1, '#d8d0d8', 0.7, 60, 10, '#f6ecea') + cloud(180, 330, 0.9, '#d4ccd6', 0.65, 70, 36, '#f6ece8')
        + birds(3, 4, 640, 360, '#4a5260', 1.1, 600)
        /* far sea, islands, fog */
        + `<rect y="548" width="1600" height="352" fill="url(#${w1})"/>`
        + mv('uspar', { ad: '40s', dx: '10px' }, `<path fill="#9aa8b6" opacity=".6" d="M-160 556C60 534 160 540 300 552S520 548 640 556V560H-160z"/><path fill="#a8b4c0" opacity=".6" d="M980 556C1100 540 1200 536 1380 552S1600 548 1760 556V560H980z"/>`)
        + haze(500, 110, '#f4e8e4', 0.7)
        + mv('usdrift', { ad: '52s', dx: '120px' }, `<g fill="#fff" opacity=".5"><ellipse cx="300" cy="590" rx="420" ry="34"/><ellipse cx="1300" cy="612" rx="480" ry="40"/></g>`)
        + shimmer(5, 40, 160, 760, 570, 700, '#fff4e0', 52) + shimmer(6, 30, 700, 1700, 640, 880, '#cfe0ea', 50)
        + mv('usbob', { ad: '4s', dy: '3px' }, `<g><path fill="#2f3b4a" d="M600 598h74l-10 20h-58z"/><path fill="#e8e2d6" d="M622 598v-22h24v22z"/><path fill="#2f3b4a" d="M634 576v-24"/></g>`)
        /* the headland */
        + `<g fill="url(#${r1})"><path d="M560 900V760C640 740 700 704 780 676C860 648 900 636 940 626C1000 612 1160 604 1240 614C1340 628 1440 660 1560 690L1760 720V900z"/></g>`
        + `<path fill="#6c7078" d="M780 676C860 648 900 636 940 626C1000 612 1160 604 1240 614C1300 622 1340 636 1380 652C1260 640 1100 640 940 650C880 660 820 678 780 700z"/>`
        + `<path fill="#3d5236" d="M960 628c40-10 90-14 140-14c60 0 110 4 150 12c-50 10-110 18-170 18c-50 0-86-6-120-16z"/>`
        + [1230, 1262, 1302].map((x, i) => spruce(x, 628 + i * 4, 66 - i * 10, '#26382c')).join('') + spruce(950, 640, 52, '#26382c')
        /* keeper's house and tower */
        + `<g><path fill="#f1ece4" d="M900 628V566h132v62z"/><path fill="#9c4437" d="M890 566L966 528L1042 566z"/><path fill="#3a2f2c" d="M888 568h156v8H888z"/><path fill="#ebe3d6" d="M1010 628V586h60v42z"/>`
        + `<rect x="918" y="584" width="22" height="26" fill="#52606c"/><rect x="954" y="584" width="22" height="26" fill="#52606c"/><rect x="990" y="584" width="22" height="26" fill="#52606c"/>${lit(918, 584, 22, 26)}${lit(954, 584, 22, 26)}</g>`
        + `<path fill="#f4efe6" d="M${cx - 48} 626L${cx - 31} 330H${cx + 31}L${cx + 48} 626z"/><path fill="#d9d2c6" d="M${cx + 14} 626L${cx + 24} 330H${cx + 31}L${cx + 48} 626z"/>`
        + `<rect x="${cx - 14}" y="420" width="12" height="20" fill="#4c5560"/><rect x="${cx - 12}" y="500" width="14" height="22" fill="#4c5560"/><rect x="${cx - 10}" y="580" width="18" height="30" fill="#3c444e"/>`
        + `<path fill="#2d3238" d="M${cx - 56} 330h112v10h-112zM${cx - 50} 322h100v8h-100z"/><path fill="none" stroke="#2d3238" stroke-width="3" d="M${cx - 52} 322v-16M${cx - 28} 322v-16M${cx} 322v-16M${cx + 28} 322v-16M${cx + 52} 322v-16M${cx - 52} 306H${cx + 52}"/>`
        + `<rect x="${cx - 32}" y="268" width="64" height="38" fill="#ffe7a2" opacity=".95"/><rect class="us-lit" x="${cx - 32}" y="268" width="64" height="38"/><path fill="none" stroke="#2d3238" stroke-width="4" d="M${cx - 11} 268v38M${cx + 11} 268v38M${cx - 32} 287H${cx + 32}"/>`
        + `<path fill="#a8372d" d="M${cx - 40} 268L${cx} 226L${cx + 40} 268z"/><path fill="#2d3238" d="M${cx - 5} 226h10v-14h-10z"/><circle cx="${cx}" cy="208" r="6" fill="#2d3238"/>`
        + mv('ussway2', { ad: '9s', to: `${cx}px 287px` }, `<path fill="url(#${b1})" d="M${cx} 287L${cx - 760} 214V362z"/>`)
        + mv('usglow', { ad: '3s' }, `<circle cx="${cx}" cy="287" r="70" fill="url(#${b2})"/>`)
        /* surf, spray, fog over the rocks, foreground */
        + `<path fill="#e9eef0" opacity=".85" d="M540 770c40-14 70-8 110-14c30-4 60 6 90-2c-10 14-40 22-100 24c-40 2-70-2-100-8z"/>`
        + mv('usbob', { ad: '3.4s', dy: '5px' }, `<path fill="none" stroke="#fff" stroke-width="5" opacity=".7" d="M520 780q50-14 100 0t100 0t100 0"/>`) + `<g opacity=".55">${puffs(660, 770, 5, '#f4f8fa', 20, 40, 4, -80, 2.4)}${puffs(1500, 740, 4, '#f4f8fa', 22, -40, 4.6, -80, 2.4)}</g>`
        + mv('usdrift', { ad: '44s', dx: '90px' }, `<g fill="#fff" opacity=".3"><ellipse cx="900" cy="740" rx="420" ry="22"/></g>`)
        + `<path fill="#20252d" d="M-160 900V800C60 770 220 790 380 760C520 736 640 790 760 800C900 812 1000 780 1160 800C1340 826 1500 790 1760 800V900z"/><path fill="#161a22" d="M-160 900V850C140 830 300 860 560 846S1000 860 1300 846S1600 850 1760 846V900z"/>`
        + `<path fill="none" stroke="#e8f0f2" stroke-width="5" opacity=".6" stroke-linecap="round" d="M60 806q40-10 80 0M880 810q40-10 90 0M1320 828q40-10 80 0"/>`
        + `<g fill="#3a4a30">${[120, 200, 300, 1380, 1480].map((x, i) => `<path d="M${x} 850q-8-60-30-80q30 20 34 70q4-60 36-82q-18 50-8 92z"/>`).join('')}</g>`
        + finish(0.34);
    } });

  /* ---------- Vermont: a covered bridge among the autumn maples ---------- */
  usSceneAdd({ key: 'state:VT', label: 'Covered bridge among the maples', site: 'A covered bridge in Vermont foliage', colour: 'red', mood: 'cosy', season: ['autumn'], tags: ['bridge', 'foliage', 'maple'],
    svg: () => {
      const s1 = U(), w1 = U(), l1 = U();
      const fol = ['#c8351f', '#e8742a', '#f2b632', '#a82a1c', '#e0572a', '#d6a02a'];
      return `<defs>${lin(s1, [[0, '#6ea6d8'], [0.55, '#b8d6ec'], [1, '#f6e8c8']])}${lin(w1, [[0, '#4d7a8c'], [1, '#26485a']])}${radU(l1, [[0, '#ffe2a0', 0.5], [1, '#ffe2a0', 0]], 1280, 220, 900)}</defs>`
        + full(`url(#${s1})`) + rays(1280, 220, 900, '#fff2cc', 0.16) + sun(1280, 220, 42, '#fffbe8', '#ffe6a0')
        + streak(300, 130, 300, '#fff', 0.55) + cloud(520, 210, 1.1, '#dde8f2', 0.95, 56, 6) + cloud(1100, 150, 0.8, '#e6eef6', 0.9, 62, 26)
        + birds(9, 5, 900, 300, '#3a3c4a', 1.1, 640)
        /* far hills in fall colour, a steeple */
        + mv('uspar', { ad: '36s', dx: '8px' }, ridge('#8f93a8', 470, 56, 9, 3) + haze(430, 100, '#e8eef4', 0.55) + ridge('#8a8f5a', 520, 40, 10, 4))
        + mv('uspar', { ad: '30s', dx: '14px' }, canopy('#a8601f', 520, 30, 11, -160, 800, 640) + canopy('#c8421f', 514, 34, 12, 500, 1760, 640)
          + canopy('#e0902a', 545, 26, 13, -160, 1760, 650) + canopy('#5e7a3a', 558, 22, 14, 700, 1100, 650) + haze(560, 70, '#f6e8c8', 0.45)
          + `<path fill="#f4f0e8" d="M1150 578V508h26v70z"/><path fill="#f4f0e8" d="M1156 508l7-44l7 44z"/><path fill="#c0c4c8" d="M1163 464v-16"/><rect x="1156" y="524" width="14" height="22" fill="#6a7684"/>`)
        + `<rect y="600" width="1600" height="300" fill="#8a7a30"/><path fill="#c89a3a" opacity=".6" d="M-160 640C300 620 600 650 900 626S1400 620 1760 640V900H-160z"/><path fill="url(#${w1})" d="M330 626H870L1220 900H-20z"/><path fill="#b8892e" opacity=".5" d="M330 626L-20 900H-160V700zM870 626L1220 900H1760V700z"/>`
        /* bridge */
        + `<g><path fill="#7a6a5a" d="M300 628h40v-34h-40zM860 628h40v-34h-40z"/><path fill="#6c5c4c" d="M280 610h640v22H280z"/>`
        + `<path fill="#9c2f27" d="M320 596V520H860V596z"/><path fill="#b6403a" d="M320 540H860v10H320z" opacity=".55"/><path fill="#6a2820" d="M300 524L590 442L880 524V542L590 464L300 542z"/><path fill="#4b4a4c" d="M296 530L590 446L884 530l-4 8L590 456L300 538z"/>`
        + `<g fill="#3a1e1a">${[0, 1, 2, 3].map(i => `<rect x="${394 + i * 108}" y="540" width="60" height="30" rx="2"/>`).join('')}</g><g fill="#f5efe2"><rect x="316" y="518" width="12" height="80"/><rect x="852" y="518" width="12" height="80"/></g>`
        + `<path fill="#7a2a22" d="M320 596V520H340V596z"/>`
        + `<g fill="#f5efe2"><path d="M300 524L590 442L880 524l-6 6L590 452L306 530z"/></g></g>`
        + `<path fill="#3e3228" opacity=".5" d="M300 634h600v18H300z"/>`
        /* reflection and ripples */
        + `<g opacity=".28"><path fill="#9c2f27" d="M320 640H860V700H320z"/></g>` + shimmer(5, 40, 300, 900, 650, 880, '#f6c880', 60) + shimmer(6, 30, 250, 950, 700, 880, '#cfe2ee', 46)
        + mv('usmove', { ad: '70s', dx: '100px' }, `<g fill="none" stroke="#fff" stroke-width="3" opacity=".3"><path d="M330 700q40-8 80 0t80 0t80 0t80 0t80 0t80 0"/><path d="M260 780q50-8 100 0t100 0t100 0t100 0t100 0t100 0"/></g>`)
        + `<path fill="#8e6a3a" d="M300 600l-80 10c-60 14-120 40-180 70c60 0 120-20 200-40zM900 600l70 10c70 14 150 40 230 70c-70 0-150-20-230-40z" opacity=".8"/>`
        + `<path fill="#5a3a1e" d="M240 560h12v46h-12zM1020 560h12v46h-12z"/>` + crown(246, 540, 64, fol, 21, 14) + crown(1026, 540, 70, fol, 22, 14) + crown(190, 600, 38, ['#e0572a', '#f2b632'], 23, 8) + crown(1110, 610, 36, ['#c8351f', '#e8742a'], 24, 8)
        /* the near bank and the great maple */
        + `<path fill="#5a4222" d="M-160 900V830C100 800 220 820 300 860L420 900zM1760 900V830C1500 800 1360 820 1260 860L1160 900z"/>`
        + `<path fill="#3a2a1c" d="M1330 880L1346 520L1362 470L1380 520L1400 880z"/><path fill="#3a2a1c" d="M1356 560L1310 500L1300 508L1352 590zM1384 556L1436 490L1446 498L1390 590z"/>`
        + mv('ussway2', { ad: '8s', to: '1370px 800px' }, crown(1370, 380, 170, fol, 5, 34) + crown(1340, 340, 80, ['#f2b632', '#e8742a', '#c8351f'], 6, 12))
        + `<path fill="#3a2a1c" d="M96 900L108 520L120 490L134 520L148 900z"/>`
        + mv('ussway2', { ad: '10s', d: '-3s', to: '120px 800px' }, crown(118, 390, 140, fol, 7, 28))
        + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => leaf(1000 + (i * 97) % 700 - 400 + (i % 3) * 60, 250 + (i * 53) % 200, fol[i % 6], 80 + (i % 4) * 40, 9 + (i % 5), i * 1.3, 1 + (i % 3) * 0.3)).join('')
        + `<g fill="#6a3a1c" opacity=".9">${[420, 640, 760, 980].map((x, i) => `<ellipse cx="${x}" cy="${828 + (i % 2) * 14}" rx="${34 + i * 6}" ry="12"/>`).join('')}</g>`
        + `<g fill="#c8451f" opacity=".85">${Array.from({ length: 22 }, (_, i) => `<ellipse cx="${(i * 79 + 40) % 1500 + 40}" cy="${850 + (i * 13) % 40}" rx="9" ry="4"/>`).join('')}</g>`
        + finish(0.3);
    } });

  /* ---------- New York: the Statue of Liberty at dawn, the skyline behind ---------- */
  usSceneAdd({ key: 'state:NY', label: 'Statue of Liberty at dawn', site: 'The Statue of Liberty and the harbour', colour: 'teal', mood: 'proud', season: 'any', tags: ['landmark', 'harbour', 'skyline'],
    svg: () => {
      const s1 = U(), w1 = U(), c1 = U(), l1 = U(), p1 = U(), g2 = U(); const X = 1060;
      const cu = '#6db8a2', cd = '#3f8774', cl = '#a8dcc8';
      return `<defs>${lin(s1, [[0, '#4a6aa8'], [0.3, '#9a8ec0'], [0.55, '#f2a8a0'], [0.75, '#ffd29a'], [1, '#ffe8b6']])}${lin(w1, [[0, '#f4c99c'], [0.12, '#8aa8c0'], [1, '#2b4d6a']])}${radU(l1, [[0, '#ffd890', 0.7], [1, '#ffd890', 0]], 380, 560, 800)}${radU(g2, [[0, '#ffd27a', 0.55], [1, '#ffd27a', 0]], X + 52, 160, 60)}${linU(c1, [[0, '#6a7490'], [1, '#3a4260']], 0, 360, 0, 590)}${linU(p1, [[0, '#d8cdb8'], [1, '#a69a86']], 0, 420, 0, 600)}</defs>`
        + full(`url(#${s1})`) + stars(7, 24, 190) + rays(380, 560, 1000, '#ffe6b0', 0.14) + sun(380, 560, 60, '#fff6d8', '#ffc880', true)
        + streak(1200, 150, 300, '#ffb8a0', 0.5) + streak(300, 250, 260, '#ffd0b0', 0.55, 70) + cloud(700, 250, 1.1, '#c08aa8', 0.8, 58, 10, '#ffd6c0') + cloud(1400, 330, 0.9, '#c690aa', 0.75, 66, 34, '#ffdcc8')
        + birds(6, 5, 700, 330, '#4a3a58', 1.1, 640)
        /* skyline: far blocks, the Empire State setbacks, a tall tapered tower, a terraced spire */
        + mv('uspar', { ad: '36s', dx: '8px' }, `<g opacity=".92">${city(-160, 1000, 585, 50, 150, 8, '#8a82a8', '#ffd98a', 0.5)}</g>` + haze(540, 60, '#ffd0a8', 0.4)
          + `<path fill="#756e9a" d="M270 585V380h14V340h14V300h16V250h14l4-70h4l4 70h8v50h14v40h14v40h14v205z"/><path fill="#f4cfa8" opacity=".35" d="M342 585V380h14V340h14V300h16V250h14l4-70h4l4 70h-60z"/>`
          + `<path fill="#7a7298" d="M440 585V330l22-22V230l12-40l12 40v78l22 22V585z"/><path fill="#524a80" d="M474 190v-60" stroke="#524a80" stroke-width="5"/><path fill="#ffe0b0" opacity=".4" d="M474 190l12 40v78l22 22V585H474z"/>`
          + `<path fill="#6e6694" d="M560 585V300L600 200L640 300V585z"/><path fill="#524a80" d="M600 200v-70" stroke="#524a80" stroke-width="4"/><path fill="#ffe0b0" opacity=".35" d="M600 200L640 300V585H600z"/>`
          + `<path fill="#7a7298" d="M660 585V350h26v-24h26v24h26V585z"/><path fill="#6a6290" d="M180 585V420h40v-20h30v20h20V585z"/>`
          + win(280, 340, 46, 8, 24) + win(452, 340, 44, 9, 22) + win(570, 330, 60, 8, 26) + win(668, 372, 60, 7, 26) + win(192, 440, 52, 5, 26))
        /* Brooklyn Bridge, far right */
        + mv('uspar', { ad: '34s', dx: '10px' }, `<g opacity=".85"><path fill="#837aa0" d="M1330 585V440l14-20h24l14 20V585z"/><path fill="#837aa0" d="M1630 585V440l14-20h24l14 20V585z"/><path fill="#4a4272" d="M1346 470a10 22 0 0 1 20 0v40h-20zM1646 470a10 22 0 0 1 20 0v40h-20z"/><path fill="#837aa0" d="M1100 572H1760V586H1100z"/>`
          + `<path fill="none" stroke="#837aa0" stroke-width="4" d="M1100 570Q1250 480 1356 424Q1500 520 1656 424Q1720 470 1760 520"/><path fill="none" stroke="#837aa0" stroke-width="1.6" d="${[1, 2, 3, 4, 5, 6, 7].map(i => `M1356 428L${1356 - i * 34} 572M1356 428L${1356 + i * 34} 572M1656 428L${1656 - i * 34} 572M1656 428L${1656 + i * 34} 572`).join('')}"/></g>`)
        /* harbour water */
        + `<rect y="585" width="1600" height="315" fill="url(#${w1})"/><rect y="585" width="1600" height="315" fill="url(#${l1})"/>`
        + shimmer(5, 60, 140, 700, 596, 740, '#fff0cc', 60) + shimmer(6, 40, 0, 1600, 660, 890, '#e2eef4', 50)
        + mv('usmove', { ad: '60s', dx: '120px' }, `<g fill="none" stroke="#fff" stroke-width="4" opacity=".35"><path d="M0 720q40-12 80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0"/><path d="M0 800q50-14 100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0"/></g>`)
        /* the ferry */
        + mv('usmove', { ad: '70s', d: '-30s', dx: '1300px' }, mv('usbob', { ad: '3s', dy: '2px' }, `<g><path fill="#e8862a" d="M200 640h140l-14 26H214z"/><path fill="#f2efe6" d="M222 640v-18h96v18z"/><path fill="#2a2e3a" d="M232 630h76v6h-76z"/><path fill="#e8862a" d="M246 622v-14h40v14z"/><path fill="#2a2e3a" d="M266 608v-18h8v18z"/>${lit(240, 626, 10, 7)}${lit(262, 626, 10, 7)}</g><path fill="none" stroke="#fff" stroke-width="3" opacity=".5" d="M340 668q40-4 80-14M214 668q-40-4-80-14"/>`))
        /* Liberty Island, the statue */
        + `<path fill="#3a4a3a" d="M900 650C960 624 1020 618 1060 618C1120 618 1180 626 1240 650C1180 664 1100 668 1060 668C1000 668 940 664 900 650z"/>`
        + `<path fill="#8a7a68" d="M946 640L986 600H1134L1174 640z"/><path fill="#a69a86" d="M986 600L1000 584H1120L1134 600z"/>`
        + `<path fill="url(#${p1})" d="M1000 584V500H1120V584z"/><path fill="#cdc2ae" d="M1000 500h120v10h-120zM1010 440h100v60h-100z"/><path fill="#8c8068" d="M1010 440h100v8h-100z"/>`
        + `<g fill="#8f8470" opacity=".7"><rect x="1020" y="530" width="12" height="40"/><rect x="1088" y="530" width="12" height="40"/></g>`
        /* the figure */
        + `<path fill="${cu}" d="M${X - 40} 440C${X - 44} 390 ${X - 40} 340 ${X - 22} 300L${X + 22} 300C${X + 42} 340 ${X + 46} 390 ${X + 42} 440z"/>`
        + `<path fill="${cd}" d="M${X + 6} 440C${X + 12} 390 ${X + 8} 340 ${X + 6} 304L${X + 22} 300C${X + 42} 340 ${X + 46} 390 ${X + 42} 440z"/>`
        + `<path fill="none" stroke="${cd}" stroke-width="3" d="M${X - 28} 440Q${X - 24} 380 ${X - 12} 330M${X - 12} 440Q${X - 8} 390 ${X} 340M${X + 14} 440Q${X + 12} 400 ${X + 18} 350"/>`
        + `<path fill="${cl}" opacity=".7" d="M${X - 40} 440C${X - 44} 390 ${X - 40} 340 ${X - 22} 300L${X - 16} 302C${X - 32} 346 ${X - 34} 392 ${X - 30} 440z"/>`
        + `<circle cx="${X}" cy="284" r="19" fill="${cu}"/><path fill="${cd}" d="M${X + 4} 266a19 19 0 0 1 6 28a19 19 0 0 0 4-26z"/>`
        + `<g stroke="${cu}" stroke-width="5" stroke-linecap="round">${[-62, -42, -22, 0, 22, 42, 62].map(a => `<path d="M${X} 280L${R(X + Math.sin(a * Math.PI / 180) * 42)} ${R(268 - Math.cos(a * Math.PI / 180) * 42)}"/>`).join('')}</g><path fill="none" stroke="${cd}" stroke-width="4" d="M${X - 18} 270Q${X} 258 ${X + 18} 270"/>`
        + `<path fill="none" stroke="${cu}" stroke-width="15" stroke-linecap="round" d="M${X + 26} 312L${X + 50} 236L${X + 52} 188"/><path fill="none" stroke="${cd}" stroke-width="5" opacity=".6" stroke-linecap="round" d="M${X + 56} 312L${X + 56} 236"/>`
        + `<path fill="${cd}" d="M${X + 38} 188h28l-4 14h-20z"/><path fill="#c9a24a" d="M${X + 36} 186h32v6h-32z"/>`
        + mv('usflicker', { ad: '.4s', to: `${X + 52}px 186px` }, `<path fill="#ffb938" d="M${X + 52} 186C${X + 36} 168 ${X + 46} 150 ${X + 52} 130C${X + 60} 150 ${X + 70} 168 ${X + 52} 186z"/><path fill="#fff1a8" d="M${X + 52} 184C${X + 45} 172 ${X + 49} 160 ${X + 52} 150C${X + 56} 160 ${X + 59} 172 ${X + 52} 184z"/>`)
        + mv('usglow', { ad: '3s' }, `<circle cx="${X + 52}" cy="160" r="60" fill="url(#${g2})"/>`)
        + `<path fill="${cu}" d="M${X - 36} 330L${X - 22} 322L${X - 14} 376L${X - 34} 382z"/><path fill="${cd}" d="M${X - 34} 382L${X - 14} 376l2 10l-20 6z"/>`
        /* near water and a pier */
        + `<path fill="#1f3446" opacity=".85" d="M-160 900V836C200 816 500 842 820 826S1300 812 1760 832V900z"/>`
        + `<path fill="#2a2420" d="M-160 868H1760V900H-160z"/><g fill="#2a2420">${Array.from({ length: 15 }, (_, i) => `<rect x="${-100 + i * 120}" y="836" width="14" height="40"/>`).join('')}</g><path fill="none" stroke="#2a2420" stroke-width="5" d="M-160 842H1760"/>`
        + dots('M-100 828H1700', '#ffd27a', 8, 120, 'us-lamps') + dots('M-100 836H1700', '#ffd27a', 4, 120, 'us-lamps')
        + mv('usbob', { ad: '3s', dy: '3px' }, `<g fill="#f6f2e8"><path d="M200 800c10-14 24-14 30-2c-6 8-20 12-30 2z"/></g>`)
        + finish(0.34);
    } });
  /** A sailboat (feet on y), facing right: hull, mast, main and jib. */
  const sail = (x, y, s, hull, main, jib) => `<g transform="translate(${x} ${y}) scale(${s})"><path fill="${hull}" d="M-70 0h140l-18 22h-104z"/><path fill="#fff" d="M-62 2h124v4h-124z" opacity=".7"/><path fill="#5a4a3a" d="M-3 0V-190h6V0z"/>`
    + `<path fill="${main}" d="M6 -184C46 -120 70 -60 74 -8H6z"/><path fill="${jib}" d="M-8 -170C-44 -110 -64 -56 -70 -8H-8z"/><path fill="#00000014" d="M6 -184C46 -120 70 -60 74 -8H40C34 -70 24 -130 6 -184z"/></g>`;

  /* ---------- Pennsylvania: Independence Hall and the Liberty Bell at golden hour ---------- */
  usSceneAdd({ key: 'state:PA', label: 'Independence Hall and the Liberty Bell', site: 'Independence Hall, Philadelphia', colour: 'amber', mood: 'proud', season: 'any', tags: ['bell', 'history', 'landmark'],
    svg: () => {
      const s1 = U(), g1 = U(), l1 = U(), b1 = U();
      const brick = '#a8483a', brickD = '#8c3a30', trim = '#f3ecdc', roof = '#5d5b6c';
      const wing = `<path fill="${roof}" d="M404 508L426 470H590L610 508z"/><path fill="${brick}" d="M410 508H600V640H410z"/><path fill="${trim}" d="M404 506h206v8H404zM404 574h206v6H404z"/>`
        + [0, 1, 2, 3].map(i => `<path fill="#3a2a30" d="M${428 + i * 44} 540v-14a10 10 0 0 1 20 0v14z"/>${lit(428 + i * 44, 526, 20, 24)}<path fill="#3a2a30" d="M${428 + i * 44} 610v-18a10 10 0 0 1 20 0v18z"/>`).join('')
        + `<path fill="#6a3a30" d="M426 470h14v-26h14v26z"/>`;
      const main = `<path fill="${roof}" d="M590 504L622 462H978L1010 504z"/><path fill="${brick}" d="M600 504H1000V640H600z"/><path fill="${brickD}" d="M600 504H1000V516H600z" opacity=".5"/><path fill="${trim}" d="M594 502h412v9H594zM594 570h412v7H594zM594 636h412v8H594z"/>`
        + [0, 1, 2, 3, 4, 5, 6].map(i => i === 3 ? '' : `<path fill="#3a2a30" d="M${626 + i * 52} 548v-24a11 11 0 0 1 22 0v24z"/>${lit(626 + i * 52, 524, 22, 30)}<path fill="#3a2a30" d="M${626 + i * 52} 628v-30a11 11 0 0 1 22 0v30z"/>${lit(626 + i * 52, 598, 22, 32)}`).join('')
        + `<path fill="#3a2a30" d="M780 640v-40a20 20 0 0 1 40 0v40z"/><path fill="${trim}" d="M772 596a28 24 0 0 1 56 0v4h-56z"/>${lit(784, 526, 32, 30)}<path fill="#3a2a30" d="M783 556v-14a16 16 0 0 1 34 0v14z"/>`;
      const tower = `<path fill="${brick}" d="M742 464V392H858V464z"/><path fill="${trim}" d="M736 392H864V380H736z"/><path fill="${trim}" d="M748 380V330H852V380z"/><circle cx="800" cy="356" r="22" fill="#fffdf4" stroke="#3a3a4a" stroke-width="3"/><path fill="none" stroke="#3a3a4a" stroke-width="3" stroke-linecap="round" d="M800 356V340M800 356l11 6"/>`
        + `<path fill="${trim}" d="M740 330H860V320H740z"/><path fill="${trim}" d="M758 320V268H842V320z"/><path fill="#3a2a30" d="M768 316v-34a10 10 0 0 1 20 0v34zM812 316v-34a10 10 0 0 1 20 0v34z"/><path fill="#5d8a78" d="M754 268Q800 196 846 268z"/><path fill="${trim}" d="M792 232h16v-16h-16z"/><path fill="#5d8a78" d="M796 216L800 150L804 216z"/><circle cx="800" cy="148" r="5" fill="#d9b24a"/><path fill="#d9b24a" d="M800 142v-18"/>`
        + `<path fill="${roof}" d="M720 464L742 440H858L880 464z"/>`;
      const bell = `<ellipse cx="250" cy="726" rx="110" ry="14" fill="#000" opacity=".22"/><path fill="#6a4a30" d="M170 726V690H330V726z"/><path fill="#8a6a44" d="M160 690H340V680H160z"/>`
        + `<path fill="#6a4a30" d="M180 690V420H320V690z" opacity="0"/><path fill="#5a4030" d="M168 400H332V384H168z"/><path fill="#5a4030" d="M178 400V690H190V400zM310 400V690H322V400z"/>`
        + mv('ussway2', { ad: '6s', to: '250px 392px' }, `<path fill="#4a3226" d="M236 392h28v28h-28z"/><path fill="#b9893c" d="M250 412C222 412 208 450 206 500C204 550 186 580 166 616H334C314 580 296 550 294 500C292 450 278 412 250 412z"/><path fill="#d9ad5a" d="M250 412C222 412 208 450 206 500C204 550 186 580 166 616H200C214 580 224 550 226 500C228 450 236 420 250 412z" opacity=".75"/><path fill="#8a6428" d="M166 616H334V630H166z"/><path fill="#8a6428" d="M212 500H288V506H212zM208 540H292V546H208z" opacity=".7"/><path fill="none" stroke="#4a3220" stroke-width="3.5" stroke-linejoin="round" d="M262 630L256 590L268 562L254 530L262 500"/><circle cx="250" cy="640" r="12" fill="#4a3226"/>`);
      return `<defs>${lin(s1, [[0, '#6d9fd4'], [0.45, '#f0c8a0'], [0.75, '#ffd08a'], [1, '#ffe4a8']])}${linU(g1, [[0, '#7a8a3c'], [1, '#4a5a28']], 0, 640, 0, 900)}${radU(l1, [[0, '#ffc870', 0.6], [1, '#ffc870', 0]], 1380, 560, 760)}${linU(b1, [[0, '#b3a890'], [1, '#8a7e68']], 0, 640, 0, 720)}</defs>`
        + full(`url(#${s1})`) + rays(1380, 560, 1000, '#ffe3a8', 0.2) + sun(1380, 560, 50, '#fff2c8', '#ffb868', true)
        + streak(300, 140, 300, '#fff', 0.5) + cloud(540, 220, 1.0, '#e8b896', 0.85, 58, 8, '#fff0dc') + cloud(1200, 150, 0.8, '#eebd9c', 0.8, 62, 30, '#fff2e0') + cloud(120, 330, 0.8, '#e8b496', 0.75, 70, 40, '#fff0dc')
        + birds(11, 5, 1050, 300, '#3c3448', 1.1, 640)
        + mv('uspar', { ad: '34s', dx: '8px' }, `<g opacity=".85">${city(1100, 1760, 560, 60, 220, 4, '#8f8aa8', '#ffe0a0', 0.5)}</g><path fill="#8f8aa8" opacity=".85" d="M1360 560V250l14-30l14 30V560z"/><path d="M1374 220v-40" stroke="#8f8aa8" stroke-width="3"/>` + canopy('#6a6a40', 575, 26, 3, -160, 400, 640) + haze(540, 60, '#ffd8a0', 0.4))
        + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        + `<path fill="${brickD}" opacity=".25" d="M380 650H1220V670H380z"/>` + wing + `<g transform="translate(1600 0) scale(-1 1)">${wing}</g>` + main + tower
        + mv('usflag', { ad: '2.4s', to: '1108px 450px' }, `<path fill="#c8372d" d="M1108 450h40l-8 8l8 8h-40z"/><path fill="#2f4a8e" d="M1108 450h16v16h-16z"/>`) + `<path fill="#3a3030" d="M1106 430v40"/>`
        /* the lawn, a path and autumn trees */
        + `<path fill="url(#${g1})" d="M-160 900V650H1760V900z"/><path fill="#d6c49a" d="M740 640H860L1180 900H420z"/><path fill="#b8a678" opacity=".6" d="M800 640L800 900" stroke="#b8a678" stroke-width="2"/>`
        + `<path fill="#000" opacity=".12" d="M380 660H1220L1100 700H500z"/>`
        + mv('ussway2', { ad: '9s', to: '1380px 760px' }, `<path fill="#4a3426" d="M1360 800L1374 560L1390 800z"/>` + crown(1376, 500, 120, ['#e8a22a', '#d86a24', '#f2c248', '#b83a1e'], 5, 26))
        + [0, 1, 2, 3, 4, 5, 6].map(i => leaf(1100 + i * 60, 400 + (i * 31) % 120, ['#e8a22a', '#c8451e', '#f2c248'][i % 3], 60 + i * 10, 9 + i % 4, i * 1.4, 1.1)).join('')
        + dots('M520 760C620 748 700 746 780 750', '#ffd27a', 7, 40, 'us-lamps') + `<path fill="#2c2a30" d="M530 760V640h8v120zM1070 760V640h8v120z"/><rect class="us-lit" x="522" y="622" width="24" height="22" rx="4"/><rect class="us-lit" x="1062" y="622" width="24" height="22" rx="4"/>`
        + bell
        + `<path fill="#4a5a28" d="M-160 900V830C100 810 300 840 520 826S900 850 1200 830S1600 840 1760 830V900z"/>`
        + finish(0.3);
    } });

  /* ---------- Massachusetts: Old North Church, one if by land, two if by sea ---------- */
  usSceneAdd({ key: 'state:MA', label: 'Old North Church lanterns', site: 'The lanterns of Old North Church, Boston', colour: 'indigo', mood: 'proud', season: 'any', tags: ['church', 'history', 'lanterns', 'night'],
    svg: () => {
      const s1 = U(), l1 = U(), c1 = U(), g1 = U(), h1 = U(); const X = 800;
      const wall = '#8e4a3c', wallD = '#6a3430', wh = '#e8e2d2';
      return `<defs>${lin(s1, [[0, '#101a46'], [0.45, '#2a3a7a'], [0.75, '#6a5a98'], [1, '#d88a6a']])}${radU(l1, [[0, '#ffe2a0', 0.9], [0.4, '#ffbe6a', 0.35], [1, '#ffbe6a', 0]], X, 268, 120)}${radU(h1, [[0, '#ffe8c0', 0.5], [1, '#ffe8c0', 0]], 1250, 170, 220)}${lin(g1, [[0, '#4a4650'], [1, '#1e1c26']])}</defs>`
        + full(`url(#${s1})`) + stars(12, 70, 380)
        + `<circle cx="1250" cy="170" r="230" fill="url(#${h1})"/><path fill="#fff6dc" d="M1262 128A42 42 0 1 0 1262 212A34 42 0 1 1 1262 128z"/>`
        + cloud(300, 220, 1.1, '#2c3470', 0.7, 60, 8, '#6a6aa8') + cloud(1300, 330, 0.9, '#303a78', 0.65, 70, 34, '#7a70a8') + streak(900, 120, 260, '#8a8ac8', 0.3)
        + birds(8, 3, 560, 200, '#0e1230', 1, 500)
        /* far Boston roofs */
        + mv('uspar', { ad: '36s', dx: '8px' }, `<g opacity=".85">${city(-160, 1760, 600, 40, 120, 14, '#3a3568', '#ffd27a', 0.3)}</g>` + haze(540, 70, '#e89a7a', 0.35))
        /* the church: nave, steeple, lanterns */
        + `<path fill="#4a2a2c" d="M880 640V500L1060 470L1240 500V640z"/><path fill="#3a2a3c" d="M870 502L1060 440L1250 502L1250 512L1060 452L870 512z"/><path fill="${wall}" d="M890 640V510H1230V640z"/>`
        + [0, 1, 2, 3, 4, 5].map(i => `<path fill="#2a1e2a" d="M${910 + i * 52} 620v-60a12 12 0 0 1 24 0v60z"/>${lit(910 + i * 52, 548, 24, 70)}`).join('')
        + `<path fill="${wh}" d="M884 508h352v8H884zM884 632h352v8H884z" opacity=".8"/>`
        + `<path fill="#4a2a2c" d="M780 640H1000V500z" opacity="0"/>`
        + `<path fill="${wall}" d="M740 640V440H860V640z"/><path fill="${wallD}" d="M820 640V440H860V640z" opacity=".6"/>`
        + `<path fill="${wh}" d="M732 440H868v10H732zM732 636H868v8H732z"/><path fill="#2a1e2a" d="M780 640v-52a20 20 0 0 1 40 0v52z"/>${lit(762, 470, 20, 44)}${lit(818, 470, 20, 44)}<path fill="#2a1e2a" d="M762 514v-36a10 10 0 0 1 20 0v36zM818 514v-36a10 10 0 0 1 20 0v36z" opacity=".0"/>`
        + `<path fill="${wh}" d="M748 440V350H852V440z"/><circle cx="${X}" cy="392" r="24" fill="#fffdf2" stroke="#3a3a4a" stroke-width="3"/><path fill="none" stroke="#3a3a4a" stroke-width="3" stroke-linecap="round" d="M${X} 392V374M${X} 392l12 6"/>`
        + `<path fill="${wh}" d="M742 350H858V340H742z"/><path fill="${wh}" d="M756 340V250H844V340z"/><path fill="#1a1630" d="M778 336V262a22 22 0 0 1 44 0v74z"/><path fill="${wh}" d="M750 252H850V242H750z"/>`
        + `<circle cx="${X}" cy="274" r="120" fill="url(#${l1})"/>`
        + mv('usflicker', { ad: '.5s', to: `${X - 10}px 284px` }, `<path fill="#ffb938" d="M${X - 10} 288C${X - 20} 276 ${X - 14} 266 ${X - 10} 256C${X - 6} 266 ${X} 276 ${X - 10} 288z"/><path fill="#fff1a8" d="M${X - 10} 286C${X - 15} 278 ${X - 12} 270 ${X - 10} 264C${X - 8} 270 ${X - 5} 278 ${X - 10} 286z"/>`)
        + mv('usflicker', { ad: '.42s', d: '-.2s', to: `${X + 10}px 284px` }, `<path fill="#ffb938" d="M${X + 10} 288C${X} 276 ${X + 6} 266 ${X + 10} 256C${X + 14} 266 ${X + 20} 276 ${X + 10} 288z"/><path fill="#fff1a8" d="M${X + 10} 286C${X + 5} 278 ${X + 8} 270 ${X + 10} 264C${X + 12} 270 ${X + 15} 278 ${X + 10} 286z"/>`)
        + `<path fill="#3a3a4a" d="M${X - 14} 292h8v6h-8zM${X + 6} 292h8v6h-8z" opacity=".8"/>`
        + `<path fill="${wh}" d="M766 242V204H834V242z"/><path fill="#1a1630" d="M786 238v-26a14 14 0 0 1 28 0v26z"/><path fill="${wh}" d="M772 206H828V198H772z"/>`
        + `<path fill="${wh}" d="M778 198L${X} 70L822 198z"/><path fill="#c8c2b2" d="M${X} 70L822 198H800z" opacity=".7"/><path fill="#c9a24a" d="M${X} 70V48"/><path fill="#c9a24a" d="M${X} 54l16-6l-4 8z"/>`
        /* row houses, left */
        + `<path fill="#6a3a34" d="M-160 640V470H120V640z"/><path fill="#4a2a30" d="M-160 470l30-26h230l20 26z"/>` + `<path fill="#7a4238" d="M120 640V500H330V640z"/><path fill="#3c2a38" d="M110 500l40-24h140l40 24z"/><path fill="#8a4a3c" d="M330 640V520H520V640z"/><path fill="#3c2a38" d="M320 520l30-20h140l40 20z"/>`
        + [0, 1, 2, 3, 4].map(i => `<path fill="#241a28" d="M${-130 + i * 54} 590v-40h26v40z"/>${lit(-130 + i * 54, 550, 26, 40)}${lit(-130 + i * 54, 496, 26, 34)}`).join('')
        + [0, 1, 2].map(i => `${lit(146 + i * 64, 524, 28, 36)}${lit(146 + i * 64, 590, 28, 36)}`).join('') + [0, 1, 2].map(i => `${lit(352 + i * 56, 540, 24, 34)}${lit(352 + i * 56, 592, 24, 34)}`).join('')
        + `<path fill="#4a2a30" d="M170 500V458h14V500zM410 520V484h14V520z"/>` + puffs(177, 456, 4, '#9a9ac0', 16, 40, 6, -110, 2.6) + puffs(417, 482, 4, '#9a9ac0', 14, 40, 6, -100, 2.6)
        /* the street */
        + `<path fill="url(#${g1})" d="M-160 640H1760V900H-160z"/>` + `<path fill="#2a2630" opacity=".7" d="M-160 700H1760v10H-160zM-160 770H1760v14H-160z"/>`
        + `<g fill="#5a5666" opacity=".5">${Array.from({ length: 34 }, (_, i) => `<ellipse cx="${(i * 53) % 1700 - 60}" cy="${660 + (i * 37) % 220}" rx="${14 + (i % 4) * 5}" ry="${4 + (i % 3)}"/>`).join('')}</g>`
        + [200, 660, 1160, 1500].map(x => `<path fill="#1a1620" d="M${x} 760V560h6v200zM${x - 8} 560h22l-4-26h-14z"/><rect class="us-lit" x="${x - 6}" y="538" width="18" height="22" rx="4"/><circle cx="${x + 3}" cy="548" r="26" fill="#ffd27a" opacity=".24"/>`).join('')
        + mv('usmove', { ad: '16s', dx: '1900px' }, `<g transform="translate(800 790)"><ellipse cx="0" cy="8" rx="80" ry="8" fill="#000" opacity=".3"/>` + mv('usbob', { ad: '.5s', dy: '5px' }, `<g transform="scale(1.4)"><ellipse cx="0" cy="-48" rx="62" ry="25" fill="#120e1c"/><path fill="#120e1c" d="M44 -62L78 -112L100 -104L66 -40z"/><path fill="#120e1c" d="M76 -112L106 -118L128 -92L116 -84L98 -98z"/><path fill="#120e1c" d="M80 -112l2-14l8 12z"/><path fill="none" stroke="#120e1c" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" d="M44 -34L90 -20L114 -6M34 -34L70 -14L88 8M-44 -34L-90 -16L-120 2M-34 -34L-72 -10L-96 10M-60 -58Q-112 -64 -134 -30"/><path fill="#120e1c" d="M-8 -66L-4 -102L14 -102L16 -66z"/><circle cx="8" cy="-116" r="12" fill="#120e1c"/><path fill="#120e1c" d="M-6 -122l14-14l16 14z"/><path fill="#120e1c" d="M-4 -98L-56 -84L-46 -66L-2 -74z"/></g>`) + `</g>`)
        + `<path fill="#0c0a16" opacity=".5" d="M-160 900V840C200 826 600 850 900 836S1400 830 1760 840V900z"/>`
        + finish(0.3);
    } });

  /* ---------- Connecticut: the Charter Oak in autumn ---------- */
  usSceneAdd({ key: 'state:CT', label: 'The Charter Oak in autumn', site: 'The Charter Oak, Connecticut', colour: 'orange', mood: 'proud', season: ['autumn'], tags: ['tree', 'autumn', 'oak'],
    svg: () => {
      const s1 = U(), g1 = U(), l1 = U();
      const fol = ['#d8761f', '#e8a22a', '#b8431c', '#f0c040', '#c25a1c'];
      return `<defs>${lin(s1, [[0, '#7a8ec0'], [0.35, '#e9b9a0'], [0.7, '#ffd48a'], [1, '#ffe6ac']])}${linU(g1, [[0, '#a8a040'], [1, '#6c5a24']], 0, 640, 0, 900)}${radU(l1, [[0, '#ffc66e', 0.65], [1, '#ffc66e', 0]], 240, 560, 760)}</defs>`
        + full(`url(#${s1})`) + rays(240, 560, 1000, '#ffe1a0', 0.22) + sun(240, 560, 54, '#fff2c4', '#ffb868', true)
        + streak(1100, 130, 300, '#ffd6b0', 0.5) + cloud(1280, 230, 1.0, '#d89a90', 0.8, 60, 12, '#ffe2cc') + cloud(620, 150, 0.8, '#dba296', 0.75, 70, 40, '#ffe6d4')
        + birds(13, 7, 1250, 330, '#3a3040', 1.1, 700)
        + mv('uspar', { ad: '36s', dx: '8px' }, ridge('#8a82a8', 500, 50, 9, 3) + haze(480, 80, '#ffd8b0', 0.5) + canopy('#a9622a', 560, 30, 5, -160, 1760, 640) + canopy('#c8802a', 590, 26, 6, -160, 1760, 650)
          + `<path fill="#f1ece0" d="M1360 610V540h30v70z"/><path fill="#f1ece0" d="M1367 540l8-50l8 50z"/><path fill="#9a3a2c" d="M1346 610V578l30-18l30 18V610z" opacity="0"/>${lit(1368, 560, 14, 20)}`
          + `<path fill="#e8e2d2" d="M120 612V560H230V612z"/><path fill="#8a3a2c" d="M112 562l63-30l63 30z"/>${lit(140, 576, 18, 22)}${lit(180, 576, 18, 22)}`)
        + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        + `<path fill="url(#${g1})" d="M-160 900V640C200 620 500 650 800 636S1300 624 1760 644V900z"/><path fill="#c8923a" opacity=".5" d="M-160 740C300 720 700 760 1000 736S1500 740 1760 736V900H-160z"/>`
        /* the oak: roots, trunk, branches, hollow, crown */
        + `<path fill="#3e2c1e" d="M640 800C690 780 700 740 706 690C706 600 690 540 650 480C610 440 560 420 520 400L540 384C600 404 660 430 700 470C710 440 700 400 690 360L716 356C730 400 740 430 760 450C780 400 800 360 840 330L850 346C830 376 830 410 836 440C860 420 920 400 1000 396L1010 414C950 424 900 450 880 480C868 530 872 600 884 690C890 740 900 780 960 800C900 804 850 794 800 790C750 794 690 804 640 800z"/>`
        + `<path fill="#2a1c14" d="M770 800C764 760 764 720 774 690C784 666 806 666 814 690C824 720 822 760 816 800z"/><path fill="#5a4230" opacity=".6" d="M706 690C706 600 690 540 650 480C690 520 724 580 730 700z"/>`
        + mv('ussway2', { ad: '10s', to: '780px 600px' }, crown(780, 270, 270, fol, 5, 46) + crown(590, 340, 130, fol, 6, 18, 1) + crown(990, 350, 130, fol, 7, 18, 1) + crown(740, 200, 130, ['#f0c040', '#f4cf58', '#e8a22a'], 8, 16, 1))
        + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => leaf(300 + i * 100, 330 + (i * 47) % 160, fol[i % 5], 90 + (i % 4) * 30, 8 + i % 5, i * 1.1, 1.2)).join('')
        /* a stone wall and the fallen leaves */
        + `<path fill="#6f6a66" d="M-160 900V800H1760V900z"/>` + `<g fill="#8f8a84">${Array.from({ length: 28 }, (_, i) => `<rect x="${-150 + i * 62}" y="${796 + (i % 3) * 10}" width="${50 + (i % 4) * 6}" height="${22 + (i % 2) * 8}" rx="8"/>`).join('')}</g><g fill="#5a5652" opacity=".6">${Array.from({ length: 20 }, (_, i) => `<rect x="${-130 + i * 88}" y="${836 + (i % 2) * 14}" width="${56 + (i % 3) * 8}" height="26" rx="9"/>`).join('')}</g>`
        + `<g fill="#c8451f" opacity=".85">${Array.from({ length: 24 }, (_, i) => `<ellipse cx="${(i * 71 + 30) % 1560 + 20}" cy="${770 + (i * 17) % 20}" rx="10" ry="4"/>`).join('')}</g>`
        + `<g fill="#e07a24">${[200, 380, 1180, 1400].map((x, i) => `<ellipse cx="${x}" cy="${772}" rx="${22 + i % 2 * 6}" ry="${18 + i % 2 * 4}"/><path fill="#4a5a28" d="M${x - 2} 752h4v-8h-4z"/>`).join('')}</g>`
        + finish(0.3);
    } });

  /* ---------- Rhode Island: Newport sailboats under the mansion ---------- */
  usSceneAdd({ key: 'state:RI', label: 'Newport sailboats and the mansion', site: 'Newport, Narragansett Bay', colour: 'blue', mood: 'cheerful', season: 'any', tags: ['sailboat', 'mansion', 'bay'],
    svg: () => {
      const s1 = U(), w1 = U(), l1 = U(), g1 = U();
      const stone = '#eee0c2', stoneD = '#cfbf9c';
      const win2 = (x0, y0, n, dx) => Array.from({ length: n }, (_, i) => `<path fill="#4a5a6a" d="M${x0 + i * dx} ${y0 + 34}v-24a8 8 0 0 1 16 0v24z"/>${lit(x0 + i * dx, y0, 16, 34)}`).join('');
      return `<defs>${lin(s1, [[0, '#3f86d2'], [0.5, '#8cc2ee'], [0.85, '#d9ecf6'], [1, '#f0f6f0']])}${lin(w1, [[0, '#7bc0d4'], [0.15, '#3c9ab8'], [1, '#14587a']])}${linU(g1, [[0, '#7cae4a'], [1, '#4a7a30']], 0, 540, 0, 900)}${radU(l1, [[0, '#fff6d0', 0.5], [1, '#fff6d0', 0]], 300, 120, 700)}</defs>`
        + full(`url(#${s1})`) + `<rect width="1600" height="900" fill="url(#${l1})"/>` + sun(300, 120, 36, '#fffbe8', '#fff0b8')
        + streak(900, 100, 340, '#fff', 0.6) + cloud(500, 200, 1.2, '#dbe8f4', 0.97, 56, 4) + cloud(1000, 120, 0.9, '#e4eef8', 0.95, 62, 22) + cloud(1450, 260, 1.0, '#dde9f4', 0.95, 50, 40) + cloud(100, 300, 0.7, '#e6eff8', 0.9, 66, 14)
        + birds(14, 6, 700, 340, '#f6f8fa', 1.2, 700)
        /* the bay: far shore, a suspension bridge */
        + `<rect y="470" width="1600" height="430" fill="url(#${w1})"/>`
        + mv('uspar', { ad: '38s', dx: '8px' }, `<path fill="#7a98a8" opacity=".75" d="M-160 478C100 450 300 470 480 478V470H-160zM900 478C1100 458 1400 462 1760 478V470H900z"/><g opacity=".8" fill="#9fb2c0"><path d="M420 480V380h10V340h14V380h10V480z"/><path d="M700 480V380h10V340h14V380h10V480z"/></g><path fill="none" stroke="#9fb2c0" stroke-width="3" opacity=".8" d="M300 470Q380 440 437 340Q570 450 707 340Q780 440 880 470M440 470H700"/>`)
        + shimmer(5, 60, 0, 1000, 490, 700, '#fff', 56) + shimmer(6, 40, 0, 1600, 640, 890, '#c8ecf6', 56)
        + mv('usmove', { ad: '64s', dx: '120px' }, `<g fill="none" stroke="#fff" stroke-width="4" opacity=".4"><path d="M0 640q40-10 80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0"/><path d="M0 760q50-14 100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0"/></g>`)
        /* sailboats at three distances */
        + mv('usmove', { ad: '90s', d: '-20s', dx: '300px' }, mv('usbob', { ad: '4s', dy: '3px' }, sail(420, 520, 0.42, '#3a3a52', '#fff', '#f6e6c0')))
        + mv('usmove', { ad: '80s', d: '-50s', dx: '300px' }, mv('usbob', { ad: '3.6s', dy: '3px' }, sail(620, 540, 0.5, '#c8372d', '#fff', '#ffd860')))
        + mv('usmove', { ad: '70s', d: '-10s', dx: '200px' }, mv('usbob', { ad: '4.4s', dy: '4px' }, sail(240, 640, 0.9, '#1f3a6a', '#fff', '#e8442f')))
        + mv('usmove', { ad: '86s', d: '-60s', dx: '240px' }, mv('usbob', { ad: '5s', dy: '5px' }, sail(720, 800, 1.5, '#e8e2d6', '#fff', '#2f6fb8')))
        + mv('usmove', { ad: '78s', d: '-30s', dx: '260px' }, mv('usbob', { ad: '3.2s', dy: '3px' }, sail(880, 590, 0.62, '#f2f0e8', '#fff', '#ffd860')))
        /* the cliff and mansion */
        + `<path fill="#6b665e" d="M980 900V690C1040 664 1100 640 1180 620L1760 600V900z"/><path fill="#8a847a" opacity=".6" d="M980 760C1040 740 1100 730 1180 720V900H980z"/><path fill="url(#${g1})" d="M1040 668C1120 640 1200 622 1300 612L1760 600V690C1500 680 1300 690 1040 710z"/>`
        + `<path fill="${stoneD}" d="M1090 618V470H1700V618z"/><path fill="${stone}" d="M1090 618V478H1700V618z"/><path fill="#b8a888" opacity=".5" d="M1090 596H1700V618H1090z"/>`
        + `<path fill="#b8573a" d="M1070 482L1110 440H1680L1720 482z"/><path fill="#9a432c" d="M1070 482H1720v8H1070z" opacity=".7"/>`
        + `<path fill="${stone}" d="M1100 470V380H1220V470z"/><path fill="${stoneD}" d="M1100 470V380h14v90z" opacity=".6"/><path fill="#b8573a" d="M1092 382L1160 330L1228 382z"/><path fill="${stone}" d="M1580 470V380H1700V470z"/><path fill="#b8573a" d="M1572 382L1640 330L1708 382z"/>`
        + win2(1112, 396, 6, 18) + win2(1592, 396, 6, 18) + win2(1110, 506, 16, 36) + win2(1110, 556, 16, 36)
        + `<path fill="${stone}" d="M1290 618V560H1500V618z"/><path fill="#cdbd9a" d="M1280 560H1510V548H1280z"/>` + [0, 1, 2, 3, 4, 5, 6].map(i => `<path fill="#f6edd6" d="M${1296 + i * 30} 618V566h10V618z"/>`).join('')
        + `<path fill="#3a3a48" d="M1160 330V300h4v30z"/>` + mv('usflag', { ad: '2.2s', to: '1164px 300px' }, `<path fill="#2f4a8e" d="M1164 296h26l-6 8l6 8h-26z"/>`)
        + `<path fill="#6a8a40" d="M1100 650C1200 640 1400 640 1700 650V690H1100z" opacity=".8"/>`
        + `<path fill="none" stroke="#e8d8b0" stroke-width="6" stroke-linecap="round" d="M1000 760C1060 730 1140 712 1240 702"/>`
        + `<path fill="url(#${g1})" d="M-160 900V840C100 820 300 850 560 836S900 850 1100 830L1200 900z"/>`
        + `<g fill="#6b665e">${[40, 260, 900, 1040].map((x, i) => `<ellipse cx="${x}" cy="${862 + i % 2 * 12}" rx="${60 + i * 8}" ry="${24 + i % 2 * 6}"/>`).join('')}</g><path fill="#fff" opacity=".6" d="M-160 888q80-12 160 0t160 0t160 0t160 0t160 0t160 0t160 0t160 0t160 0t160 0t160 0"/>`
        + `<g fill="#e8447a">${Array.from({ length: 12 }, (_, i) => `<circle cx="${60 + i * 66}" cy="${840 + (i * 11) % 24}" r="5"/>`).join('')}</g>`
        + finish(0.3);
    } });
  /* ---------- New Hampshire: the Old Man of the Mountain at sunrise ---------- */
  usSceneAdd({ key: 'state:NH', label: 'The Old Man of the Mountain', site: 'The Old Man of the Mountain, Franconia Notch', colour: 'slate', mood: 'proud', season: 'any', tags: ['mountain', 'profile', 'granite', 'sunrise'],
    svg: () => {
      const s1 = U(), g1 = U(), w1 = U(), l1 = U(), m1 = U();
      /* the profile edge, forehead to throat; the cliff falls away below it */
      const edge = 'M690 176L736 196L772 214L764 232L774 250L778 262L812 292L782 302L796 314L774 324L790 336L784 350L792 362L770 378L742 392L730 420L724 520L742 640';
      return `<defs>${lin(s1, [[0, '#5f78b8'], [0.35, '#a99cc8'], [0.65, '#f4b8a0'], [0.85, '#ffd8a0'], [1, '#ffe8b8']])}${linU(g1, [[0, '#5a6478'], [0.5, '#3c4458'], [1, '#262c3c']], 400, 150, 760, 700)}${lin(w1, [[0, '#f2c4a0'], [0.2, '#7e9cb8'], [1, '#2a4a62']])}${radU(l1, [[0, '#ffd490', 0.75], [1, '#ffd490', 0]], 1320, 470, 760)}${linU(m1, [[0, '#c8a8c0', 0.9], [1, '#f8dcc0', 0.9]], 0, 420, 0, 600)}</defs>`
        + full(`url(#${s1})`) + stars(15, 24, 180) + rays(1320, 470, 1000, '#ffe2a8', 0.2) + sun(1320, 470, 48, '#fff4d0', '#ffc480', true)
        + streak(1000, 130, 300, '#ffc0a8', 0.55) + streak(260, 230, 260, '#e8b8c0', 0.5, 70) + cloud(1220, 250, 0.9, '#c88aa6', 0.75, 62, 12, '#ffd2bc') + cloud(300, 120, 0.8, '#b08ab0', 0.6, 70, 40, '#ecc8cc')
        /* the far notch: ranges fading east, then the lake valley */
        + mv('uspar', { ad: '38s', dx: '8px' }, ridge('#8f84b4', 470, 90, 8, 21) + ridge('#a1889e', 520, 56, 9, 22) + haze(480, 110, '#ffd4b0', 0.55))
        + `<rect y="620" width="1600" height="280" fill="url(#${w1})"/>`
        + `<rect y="560" width="1600" height="340" fill="url(#${l1})"/>`
        + shimmer(5, 40, 840, 1500, 640, 800, '#fff0cc', 60) + shimmer(6, 20, 700, 1600, 780, 880, '#cfe0ee', 50)
        + mv('usbob', { ad: '4s', dy: '2px' }, `<g><path fill="#2a2a38" d="M1140 700q24 12 50 0l-6-6h-38z"/><path fill="none" stroke="#fff" stroke-width="2" opacity=".5" d="M1120 706q70 6 100 0"/></g>`)
        + mv('uspar', { ad: '34s', dx: '12px' }, canopy('#4a5a5a', 640, 40, 24, 700, 1760, 660) + canopy('#3c5040', 666, 30, 25, 700, 1760, 680) + haze(630, 60, '#f6d8c0', 0.5))
        + mv('usdrift', { ad: '50s', dx: '110px' }, `<g fill="#f8e2d2" opacity=".55"><ellipse cx="1000" cy="560" rx="420" ry="34"/><ellipse cx="1420" cy="610" rx="360" ry="30"/><ellipse cx="640" cy="640" rx="320" ry="28"/></g>`)
        /* the mountain and its granite face */
        + `<path fill="url(#${g1})" d="M-160 900V560L100 400L320 280L520 170L610 150L690 176L736 196L772 214L764 232L774 250L778 262L812 292L782 302L796 314L774 324L790 336L784 350L792 362L770 378L742 392L730 420L724 520L742 640L770 760L720 900z"/>`
        + `<path fill="#20263a" opacity=".6" d="M-160 900V700L220 560L420 460L560 330L690 250L720 520L742 640L770 760L720 900z"/>`
        + `<path fill="#0f1426" opacity=".55" d="M764 232L744 238L740 252L760 256L774 250zM782 302L760 306L772 316L796 314zM774 324L756 328L768 336L790 336z"/>`
        + `<path fill="none" stroke="#9aa4b8" stroke-width="2.4" opacity=".55" d="M610 160L600 260L640 320L690 330M520 220L540 320L500 420M720 400L650 460L670 560M400 360L430 470L380 560M300 450L330 560"/>`
        + `<path fill="none" stroke="#ffcf9a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".75" d="${edge}"/><path fill="none" stroke="#fff0cc" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity=".8" d="${edge}"/>`
        + `<path fill="#ffc8a0" opacity=".5" d="M736 196L772 214L764 232L774 250L778 262L812 292L782 302L796 314L774 324L790 336L784 350L792 362L770 378L742 392L730 420L700 400L690 300z"/>`
        + [40, 150, 270, 380, 500, 620, 700].map((x, i) => spruce(x + (i % 2) * 14, 880, 250 - i % 3 * 40, i % 2 ? '#1e3226' : '#243a2a')).join('')
        + mv('ussway', { ad: '6s' }, spruce(1500, 900, 360, '#16261e') + spruce(1380, 900, 300, '#1c2e22') + spruce(1580, 900, 260, '#1a2a20'))
        + `<path fill="#18241c" d="M-160 900V840C100 820 300 850 560 836S900 850 1100 840S1500 850 1760 846V900z"/>`
        + mv('usglide', { ad: '20s', dx: '700px', dy: '-60px' }, `<g class="x-usflap" style="--ad:1.8s"><path fill="#1c1a24" d="M980 300c26-18 52-18 70-2c18-16 44-16 70 2c-26-4-48-2-70 10c-22-12-44-14-70-10z"/></g>`)
        + birds(17, 3, 1100, 400, '#40384c', 1, 520)
        + finish(0.34);
    } });

  /* ---------- New Jersey: the Jersey Shore boardwalk at sunset ---------- */
  usSceneAdd({ key: 'state:NJ', label: 'Boardwalk Ferris wheel at sunset', site: 'The Jersey Shore boardwalk', colour: 'pink', mood: 'cheerful', season: ['summer'], tags: ['boardwalk', 'shore', 'ferris wheel', 'pier'],
    svg: () => {
      const s1 = U(), w1 = U(), l1 = U(), hl = U(); const CX = 1030, CY = 380, RR = 210;
      const spokes = Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `M${CX} ${CY}L${R(CX + RR * Math.cos(a))} ${R(CY + RR * Math.sin(a))}`; }).join('');
      const pods = Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6 + 0.26; return `<circle cx="${R(CX + RR * Math.cos(a))}" cy="${R(CY + RR * Math.sin(a))}" r="15" fill="${['#e8447a', '#ffd23c', '#3ab0e8', '#fff'][i % 4]}"/>`; }).join('');
      return `<defs>${lin(s1, [[0, '#4a3a8a'], [0.3, '#b04a98'], [0.55, '#f2707a'], [0.78, '#ffb070'], [1, '#ffe090']])}${lin(w1, [[0, '#ffc07a'], [0.12, '#b8688a'], [0.4, '#5a4a8a'], [1, '#262a5a']])}${radU(l1, [[0, '#ffc870', 0.7], [1, '#ffc870', 0]], 330, 540, 700)}<radialGradient id="${hl}"><stop offset="0" stop-color="#ffd27a" stop-opacity=".5"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient></defs>`
        + full(`url(#${s1})`) + stars(18, 40, 220) + rays(330, 540, 1000, '#ffd0a0', 0.2) + sun(330, 540, 62, '#fff0c0', '#ff9a58', true)
        + streak(900, 140, 300, '#ff9ab0', 0.55) + streak(250, 230, 260, '#ffc0a8', 0.5, 70) + cloud(640, 250, 1.0, '#c0587e', 0.8, 60, 8, '#ffb4a0') + cloud(1420, 180, 0.9, '#a8508a', 0.75, 66, 34, '#ffa8a0') + cloud(120, 360, 0.8, '#d0687a', 0.7, 72, 20, '#ffc0a0')
        + birds(19, 6, 700, 330, '#3a2850', 1.2, 700)
        /* the sea */
        + `<rect y="520" width="1600" height="380" fill="url(#${w1})"/><rect y="520" width="1600" height="380" fill="url(#${l1})"/>`
        + shimmer(5, 70, 100, 560, 530, 760, '#ffe6b0', 64) + shimmer(6, 40, 600, 1700, 650, 880, '#ffb0b8', 56)
        + mv('usmove', { ad: '64s', dx: '120px' }, `<g fill="none" stroke="#ffd8c0" stroke-width="4" opacity=".4"><path d="M0 640q40-10 80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0"/><path d="M0 780q50-14 100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0"/></g>`)
        /* the pier: deck, pilings, rides */
        + `<g fill="#2a2038">${Array.from({ length: 22 }, (_, i) => `<rect x="${620 + i * 40}" y="650" width="8" height="${70 + (i % 3) * 10}"/>`).join('')}</g>`
        + `<path fill="#3a2a48" d="M600 628H1640V654H600z"/><path fill="#5a4060" d="M600 628H1640V636H600z"/>`
        /* coaster */
        + `<g fill="none" stroke="#2c2040" stroke-width="5"><path d="M640 628V540C660 470 700 450 720 520C740 580 760 490 790 440C820 390 850 440 870 520L890 628M700 628V520M760 628V560M820 628V430M850 628V470"/><path stroke-width="3" d="M650 620L700 560L750 620M760 620L820 480L850 620"/></g>`
        + dots('M640 540C660 470 700 450 720 520C740 580 760 490 790 440C820 390 850 440 870 520L890 628', '#ffd27a', 5, 20, 'us-lamps')
        /* the wheel */
        + `<path fill="none" stroke="#2c2040" stroke-width="9" stroke-linecap="round" d="M${CX - 120} 630L${CX} ${CY}L${CX + 120} 630M${CX - 60} 560H${CX + 60}"/>`
        + mv('usspin', { ad: '80s', to: `${CX}px ${CY}px` }, `<circle cx="${CX}" cy="${CY}" r="${RR}" fill="none" stroke="#3a2c52" stroke-width="7"/><circle cx="${CX}" cy="${CY}" r="${R(RR * 0.62)}" fill="none" stroke="#3a2c52" stroke-width="4"/><path fill="none" stroke="#3a2c52" stroke-width="3" d="${spokes}"/>${pods}`
          + dots(`M${CX - RR} ${CY}a${RR} ${RR} 0 1 0 ${2 * RR} 0a${RR} ${RR} 0 1 0 ${-2 * RR} 0`, '#ffe08a', 6, 22, 'us-lamps') + dots(`M${CX - R(RR * 0.62)} ${CY}a${R(RR * 0.62)} ${R(RR * 0.62)} 0 1 0 ${2 * R(RR * 0.62)} 0a${R(RR * 0.62)} ${R(RR * 0.62)} 0 1 0 ${-2 * R(RR * 0.62)} 0`, '#ff7aa8', 5, 24, 'us-lamps'))
        + `<circle cx="${CX}" cy="${CY}" r="16" fill="#e8447a"/><circle cx="${CX}" cy="${CY}" r="6" fill="#ffe08a"/>`
        /* arcade and stalls */
        + `<path fill="#4a2c60" d="M1290 628V540H1500V628z"/><path fill="#e8447a" d="M1280 540L1395 496L1510 540z"/>` + [0, 1, 2, 3].map(i => `${lit(1308 + i * 48, 560, 30, 40)}`).join('') + dots('M1290 548H1500', '#ffe08a', 6, 20, 'us-lamps')
        + `<path fill="#3c2858" d="M1520 628V570H1620V628z"/><path fill="#3ab0e8" d="M1512 570l58-28l58 28z"/>${lit(1536, 590, 28, 30)}`
        + mv('usflag', { ad: '2s', to: '1395px 496px' }, `<path fill="#ffd23c" d="M1395 496V466h30l-8 8l8 8h-30"/>`)
        /* boardwalk, rail and lamps in front */
        + `<path fill="#2a1e2c" d="M-160 780H1760V900H-160z"/><path fill="#4a3446" d="M-160 780H1760V800H-160z"/>`
        + `<g stroke="#241a28" stroke-width="3" opacity=".7">${Array.from({ length: 28 }, (_, i) => `<path d="M${-160 + i * 70} 800L${-320 + i * 130} 900"/>`).join('')}</g>`
        + `<path fill="none" stroke="#2a1e2c" stroke-width="8" d="M-160 740H1760M-160 700H1760"/><g fill="#2a1e2c">${Array.from({ length: 22 }, (_, i) => `<rect x="${-120 + i * 90}" y="700" width="9" height="82"/>`).join('')}</g>`
        + [100, 480, 900, 1320, 1620].map(x => `<path fill="#1c1420" d="M${x} 780V640h7v140z"/><rect class="us-lit" x="${x - 8}" y="620" width="22" height="26" rx="6"/><circle cx="${x + 3}" cy="632" r="40" fill="url(#${hl})"/>`).join('')
        + dots('M-100 650Q200 700 480 640T900 640T1320 640T1700 650', '#ffe08a', 7, 34, 'us-lamps')
        + mv('usbob', { ad: '2.6s', dy: '4px' }, `<g fill="#1c1420"><path d="M200 778c8-20 12-30 28-34c-6 12-2 20-6 34z"/><circle cx="224" cy="730" r="9"/></g>`)
        + mv('usmove', { ad: '40s', d: '-10s', dx: '1400px' }, `<g fill="#1c1420"><circle cx="700" cy="738" r="9"/><path d="M692 780V748h16v32z"/><circle cx="730" cy="742" r="8"/><path d="M722 780V752h16v28z"/><path fill="none" stroke="#e8447a" stroke-width="3" d="M706 756C730 744 730 744 740 754"/></g>`)
        + finish(0.34);
    } });

  /* ---------- Delaware: the twin Memorial Bridges over the river ---------- */
  usSceneAdd({ key: 'state:DE', label: 'Delaware Memorial Bridge', site: 'The Delaware Memorial Bridge', colour: 'blue', mood: 'proud', season: 'any', tags: ['bridge', 'river', 'ship'],
    svg: () => {
      const s1 = U(), w1 = U(), l1 = U();
      /* a suspension span: towers at xa, xb, deck y, top y; returns cables, hangers, towers, deck */
      const span = (xa, xb, deck, top, tone, cab, op, sc) => {
        const mid = deck - 40 * sc, c = (4 * mid - 2 * top) / 2, cy = (t) => (1 - t) * (1 - t) * top + 2 * t * (1 - t) * c + t * t * top;
        let hang = ''; for (let x = xa + 30 * sc; x < xb - 10; x += 30 * sc) { const t = (x - xa) / (xb - xa); hang += `M${R(x)} ${R(cy(t))}V${deck}`; }
        const tower = (x) => `<path fill="${tone}" d="M${x - 18 * sc} ${deck + 34 * sc}V${top - 10 * sc}h${8 * sc}V${deck + 34 * sc}zM${x + 10 * sc} ${deck + 34 * sc}V${top - 10 * sc}h${8 * sc}V${deck + 34 * sc}z"/><path fill="${tone}" d="M${x - 18 * sc} ${R(top + 40 * sc)}h${36 * sc}v${6 * sc}h${-36 * sc}zM${x - 18 * sc} ${R(top + 110 * sc)}h${36 * sc}v${6 * sc}h${-36 * sc}zM${x - 20 * sc} ${R(top - 14 * sc)}h${40 * sc}v${8 * sc}h${-40 * sc}z"/>`;
        return `<g opacity="${op}"><path fill="none" stroke="${cab}" stroke-width="${3.4 * sc}" d="M${xa} ${top}Q${R((xa + xb) / 2)} ${R(c)} ${xb} ${top}M${xa} ${top}Q${R(xa - 240 * sc)} ${R(top + 40 * sc)} -160 ${deck - 24 * sc}M${xb} ${top}Q${R(xb + 240 * sc)} ${R(top + 40 * sc)} 1760 ${deck - 24 * sc}"/><path fill="none" stroke="${cab}" stroke-width="${1.4 * sc}" d="${hang}"/>`
          + `<path fill="${tone}" d="M-160 ${deck}H1760v${10 * sc}H-160z"/><path fill="none" stroke="${tone}" stroke-width="${2 * sc}" d="M-160 ${deck + 10 * sc}${Array.from({ length: 80 }, (_, i) => `l${12 * sc} ${(i % 2 ? -1 : 1) * 12 * sc}`).join('')}"/>` + tower(xa) + tower(xb) + `</g>`;
      };
      return `<defs>${lin(s1, [[0, '#4a8ad4'], [0.5, '#9cc8ee'], [0.82, '#f2e4c0'], [1, '#ffe2a0']])}${lin(w1, [[0, '#d8c8a0'], [0.1, '#6a9ab4'], [1, '#1f4e72']])}${radU(l1, [[0, '#ffe090', 0.6], [1, '#ffe090', 0]], 260, 520, 800)}</defs>`
        + full(`url(#${s1})`) + rays(260, 520, 1000, '#fff0c0', 0.18) + sun(260, 520, 46, '#fffae0', '#ffe090')
        + streak(900, 120, 320, '#fff', 0.55) + cloud(560, 200, 1.1, '#e4eef8', 0.95, 56, 6) + cloud(1280, 140, 0.9, '#eef4fa', 0.92, 62, 24) + cloud(1480, 330, 0.8, '#e6eef6', 0.9, 50, 40)
        + birds(23, 5, 900, 300, '#31465a', 1.1, 640)
        + mv('uspar', { ad: '36s', dx: '8px' }, ridge('#90a8b8', 540, 20, 12, 5, 600) + canopy('#6c8a68', 556, 12, 6, -160, 1760, 600) + `<g fill="#aab4bc" opacity=".8"><rect x="1240" y="500" width="30" height="56"/><rect x="1280" y="510" width="26" height="46"/><rect x="1316" y="490" width="34" height="66"/></g><path fill="#b8c0c8" d="M1300 490V440h8v50z" opacity=".8"/>`)
        + `<rect y="560" width="1600" height="340" fill="url(#${w1})"/><rect y="560" width="1600" height="340" fill="url(#${l1})"/>`
        /* the far span, then the near one */
        + mv('uspar', { ad: '34s', dx: '8px' }, span(470, 1140, 500, 250, '#9fb0c0', '#9fb0c0', 0.8, 0.8))
        + span(380, 1230, 560, 200, '#d8dde2', '#cfd5da', 1, 1)
        + `<path fill="#000" opacity=".16" d="M-160 570H1760V590H-160z"/>`
        + shimmer(5, 60, 100, 700, 600, 760, '#fff3c8', 60) + shimmer(6, 40, 0, 1600, 700, 890, '#d8ecf6', 50)
        + mv('usmove', { ad: '70s', dx: '1300px' }, mv('usbob', { ad: '4s', dy: '2px' }, `<g><path fill="#2f3c4c" d="M400 628h250l-22 30H420z"/><path fill="#c8372d" d="M420 628v-22h230v22z"/><g>${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${426 + i * 36}" y="${590 + (i % 2) * 8}" width="30" height="${16 - (i % 2) * 8}" fill="${['#3a78b8', '#e8862a', '#fff', '#4a9a5a'][i % 4]}"/>`).join('')}</g><rect x="590" y="590" width="40" height="38" fill="#f2efe6"/><rect x="600" y="570" width="18" height="22" fill="#f2efe6"/>${lit(596, 600, 28, 10)}</g>`) + puffs(612, 566, 4, '#9aa6b0', 12, 60, 5, -50, 2.4))
        + mv('usmove', { ad: '84s', d: '-50s', dx: '500px' }, mv('usbob', { ad: '3.4s', dy: '3px' }, sail(1300, 760, 0.9, '#f2f0e8', '#fff', '#e8442f')))
        /* marsh bank in front */
        + `<path fill="#3e5a34" d="M-160 900V840C100 810 260 830 420 846C560 858 700 836 900 846C1100 856 1300 826 1500 840C1600 846 1700 836 1760 830V900z"/><path fill="#2a4228" d="M-160 900V872C200 856 500 880 800 868S1400 860 1760 872V900z"/>`
        + [0, 1].map(k => mv('ussway', { ad: `${4.4 + k}s`, d: `-${k}s` }, `<path fill="none" stroke="${k ? '#8a9a4a' : '#6a8040'}" stroke-width="5" stroke-linecap="round" d="${Array.from({ length: 40 }, (_, i) => `M${-100 + i * 44 + k * 20} 880q${(i % 3 - 1) * 8} -${40 + (i * 13) % 50} ${(i % 4 - 2) * 8} -${70 + (i * 17) % 60}`).join('')}"/>` + `<g fill="#6a4a30">${Array.from({ length: 9 }, (_, i) => `<rect x="${60 + i * 190 + k * 60}" y="${800 + (i * 7) % 20}" width="9" height="26" rx="4"/>`).join('')}</g>`)).join('')
        + finish(0.3);
    } });

  /* ---------- Maryland: a skipjack under sail on the Chesapeake ---------- */
  usSceneAdd({ key: 'state:MD', label: 'Chesapeake skipjack under sail', site: 'A skipjack on the Chesapeake Bay', colour: 'orange', mood: 'calm', season: 'any', tags: ['sailboat', 'bay', 'skipjack'],
    svg: () => {
      const s1 = U(), w1 = U(), l1 = U(), sl = U();
      return `<defs>${lin(s1, [[0, '#7a8ec4'], [0.3, '#e0b0b0'], [0.6, '#ffc890'], [0.82, '#ffe0a0'], [1, '#fff0c0']])}${lin(w1, [[0, '#ffd8a0'], [0.12, '#b0a098'], [0.4, '#5a8296'], [1, '#2a4a60']])}${radU(l1, [[0, '#ffd890', 0.8], [1, '#ffd890', 0]], 1220, 520, 760)}${linU(sl, [[0, '#fff6e0'], [1, '#ecd8b2']], 700, 200, 800, 600)}</defs>`
        + full(`url(#${s1})`) + stars(24, 14, 150) + rays(1220, 520, 1000, '#fff0c0', 0.22) + sun(1220, 520, 56, '#fff8dc', '#ffc070', true)
        + streak(250, 140, 300, '#ffd0b0', 0.55) + streak(900, 220, 260, '#ffe0c0', 0.5, 70) + cloud(400, 280, 1.0, '#d6a6a0', 0.75, 62, 10, '#ffe2cc') + cloud(1420, 200, 0.9, '#e0aaa0', 0.75, 70, 34, '#ffe8d4')
        + birds(26, 4, 1000, 300, '#4a3a40', 1.1, 620)
        /* far shore, the bay bridge, a screwpile light */
        + `<rect y="520" width="1600" height="380" fill="url(#${w1})"/>`
        + mv('uspar', { ad: '40s', dx: '8px' }, `<path fill="#a08a94" opacity=".7" d="M-160 524C200 506 400 516 600 524zM1360 524C1500 510 1640 516 1760 524z"/><g opacity=".7" fill="none" stroke="#9a8a98" stroke-width="3"><path d="M-160 508H700M120 508V430M420 508V430M120 430Q270 480 420 430M-160 484Q-20 470 120 430M420 430Q560 470 700 490"/></g>`
          + `<g opacity=".85" fill="#8a7a88"><path d="M1420 524V500h40v24z"/><path d="M1414 500l26-26l26 26z" fill="#9a4a3a"/><path d="M1426 524v18M1454 524v18M1440 524v18" stroke="#8a7a88" stroke-width="3"/><rect x="1436" y="480" width="8" height="8" fill="#fff0b0"/></g>`)
        + haze(500, 110, '#fff0d8', 0.6) + `<rect y="520" width="1600" height="380" fill="url(#${l1})"/>`
        + mv('usdrift', { ad: '56s', dx: '110px' }, `<g fill="#fff" opacity=".4"><ellipse cx="300" cy="560" rx="440" ry="22"/><ellipse cx="1180" cy="580" rx="460" ry="26"/></g>`)
        + shimmer(5, 60, 900, 1560, 530, 700, '#fff0c8', 60) + shimmer(6, 30, 0, 1600, 660, 890, '#c8dce8', 50)
        /* reflection of hull and sail */
        + `<g opacity=".22"><path fill="#4a3a3a" d="M560 680H1020L1000 760Q860 790 760 770Q620 760 560 700z"/></g>`
        /* the skipjack */
        + mv('usbob', { ad: '5s', dy: '4px' },
          `<path fill="#3c2c2a" d="M1020 584L1130 568V574L1030 600z"/>`
          + mv('ussway2', { ad: '9s', to: '800px 610px' }, `<path fill="url(#${sl})" d="M792 206C770 320 640 470 568 596L792 600z"/><path fill="#c8ac80" opacity=".45" d="M792 206C770 320 640 470 568 596L596 596C660 470 760 320 792 206z"/>`
            + `<path fill="#f6e8c8" d="M808 300L1108 574L812 590z"/><path fill="#d8c090" opacity=".4" d="M808 300L1108 574L1060 576L808 340z"/>`
            + `<path fill="none" stroke="#6a5a4a" stroke-width="2.4" d="M792 206L1108 574M792 206L560 598M800 200L1030 596M800 206L560 616"/>`)
          + `<path fill="#5a4636" d="M797 612L795 190L803 190L805 612z"/><path fill="#5a4636" d="M560 604H800V610H560z"/>`
          + mv('usflag', { ad: '1.6s', to: '796px 190px' }, `<path fill="#e8a02a" d="M796 176h30l-8 8l8 8h-30z"/>`)
          + `<path fill="#f4efe4" d="M556 560H684V616H556z"/><path fill="#9a3a2c" d="M550 560L620 540H690V560z"/><rect x="574" y="578" width="22" height="18" fill="#3a4a5a"/><rect x="606" y="578" width="22" height="18" fill="#3a4a5a"/><rect class="us-lit" x="574" y="578" width="22" height="18"/>`
          + `<path fill="#f2eee4" d="M540 618L1030 586L1016 640C990 664 900 676 790 676C680 676 600 664 560 642z"/><path fill="#2a3a52" d="M548 632L1020 604L1016 640C990 664 900 676 790 676C680 676 600 664 560 642z"/><path fill="#a8372d" d="M560 646C600 664 680 676 790 676C900 676 990 664 1012 646C960 660 880 664 790 664C690 664 610 658 560 646z"/><path fill="#c9a24a" d="M546 624L1026 594L1028 598L548 628z"/>`
          + `<path fill="#6a2a22" d="M470 600L538 596L544 650L476 646z"/><path fill="none" stroke="#3a2c2a" stroke-width="3" d="M520 590L480 544L538 596"/>`
          + `<g fill="#1c1824"><circle cx="880" cy="574" r="9"/><path d="M870 618v-36h20v36z"/><circle cx="930" cy="578" r="9"/><path d="M920 616v-34h20v34z"/><circle cx="700" cy="560" r="8"/><path d="M692 600v-32h16v32z"/></g>`)
        + mv('usbob', { ad: '3.4s', d: '-1s', dy: '4px' }, `<g><path fill="#c8372d" d="M200 700h30l-4 10h-22z"/><path fill="#fff" d="M212 692h6v8h-6z"/></g><g><path fill="#e8862a" d="M1360 730h24l-4 8h-16z"/></g>`)
        + mv('usglide', { ad: '22s', d: '-4s', dx: '700px', dy: '-40px' }, `<g class="x-usflap" style="--ad:1.8s"><path fill="#2a2230" d="M300 380c22-16 46-16 62-2c16-14 40-14 62 2c-22-4-42-2-62 8c-18-10-40-12-62-8z"/><path fill="#c8c0b8" d="M338 380l8 -3l-2 8z"/></g>`)
        + `<path fill="#2a1e22" opacity=".5" d="M-160 900V850C200 836 600 860 900 848S1400 840 1760 850V900z"/><path fill="none" stroke="#fff" stroke-width="4" opacity=".4" d="M-160 868q100-14 200 0t200 0t200 0t200 0t200 0t200 0t200 0t200 0t200 0"/>`
        + finish(0.3);
    } });
})();
