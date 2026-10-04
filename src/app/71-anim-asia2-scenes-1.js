/* ============================================================
   ASIA FULL-SCREEN SCENES, batch 1 (West Asia: Turkey, Cyprus, Georgia, Armenia, Azerbaijan, Lebanon, Syria, Israel,
   Palestine, Jordan, Iraq). PURE classic script: defines nothing global; it registers entries with asiaSceneAdd()
   (71-anim-asia.js). Each svg() returns the inside of a 1600 x 900 drawing built with usSceneKit(): a sky and its light,
   far / mid / near layers that drift, the landmark, foreground and ambient life. Colours are painted for daytime; the
   evening grade lights us-lit / us-lamps / us-star. Motion is transform and opacity only. Landscape and architecture only.
   ============================================================ */
(function () {
  const K = usSceneKit();
  const { U, R, rnd, lin, linU, radU, mv, full, ridge, canopy, cloud, streak, haze, rays, sun, stars, birds, shimmer, puffs, dots, lit, finish } = K;

  /** A closed polygon from [x,y] points. */
  const poly = (fill, pts, extra) => `<path fill="${fill}"${extra || ''} d="M${pts.map((p) => R(p[0]) + ' ' + R(p[1])).join('L')}z"/>`;
  /** Blades of grass that sway: n tufts between x0..x1 around y. */
  const grass = (seed, n, x0, x1, y, h, cols, cls) => {
    const r = rnd(seed); let o = '';
    for (let i = 0; i < n; i++) {
      const x = R(x0 + r() * (x1 - x0)), hh = h * (0.5 + r()), c = cols[i % cols.length];
      o += `<path fill="${c}" d="M${x - 5} ${y}Q${x - 2} ${R(y - hh * 0.6)} ${x + R(r() * 14 - 7)} ${R(y - hh)}Q${x + 3} ${R(y - hh * 0.5)} ${x + 5} ${y}z"/>`;
    }
    return mv(cls || 'ussway', { ad: (3 + r() * 2).toFixed(1) + 's', to: `800px ${y}px` }, o);
  };

  /* ---------- Turkey: Cappadocia, balloons over the fairy chimneys at sunrise ---------- */
  asiaSceneAdd({ key: 'country:TR', label: 'Cappadocia at sunrise', site: 'Cappadocia balloons', colour: 'orange', mood: 'dreamy', season: 'any', tags: ['landscape', 'balloons', 'sunrise'],
    svg: () => {
      const s1 = U(), g1 = U(), e1 = U();
      const balloon = (x, y, s, c1, c2, c3, dur, del) => mv('usdrift', { ad: dur + 's', d: -del + 's', dx: R(30 + s * 40) + 'px' }, mv('usbob', { ad: (5 + s * 2).toFixed(1) + 's', d: -del + 's', dy: R(4 + s * 5) + 'px' },
        `<g transform="translate(${x} ${y}) scale(${s})"><path fill="${c1}" d="M-9 0C-52 -26 -62 -70 -44 -92C-28 -118 28 -118 44 -92C62 -70 52 -26 9 0z"/><path fill="${c2}" d="M-5 0C-30 -26 -36 -70 -25 -92C-16 -118 16 -118 25 -92C36 -70 30 -26 5 0z"/><path fill="${c3}" d="M-2 0C-10 -30 -12 -80 -8 -110L8 -110C12 -80 10 -30 2 0z"/><path fill="none" stroke="#3a2a30" stroke-width="1.2" d="M-9 2L-7 16M9 2L7 16"/><rect x="-8" y="16" width="16" height="10" rx="1.5" fill="#7a4d32"/><ellipse class="us-lit" cx="0" cy="8" rx="3" ry="4"/></g>`));
      const chim = (x, b, h, w, f1, f2, cap) => {
        const c = cap || f2;
        return `<path fill="${f1}" d="M${x - w} ${b}C${x - w * 0.55} ${b - h * 0.4} ${x - w * 0.25} ${b - h * 0.78} ${x - w * 0.2} ${b - h}H${x + w * 0.2}C${x + w * 0.25} ${b - h * 0.78} ${x + w * 0.55} ${b - h * 0.4} ${x + w} ${b}z"/>`
          + `<path fill="${f2}" d="M${x + w * 0.05} ${b - h}H${x + w * 0.2}C${x + w * 0.25} ${b - h * 0.78} ${x + w * 0.55} ${b - h * 0.4} ${x + w} ${b}H${x + w * 0.4}C${x + w * 0.3} ${b - h * 0.5} ${x + w * 0.12} ${b - h * 0.8} ${x + w * 0.05} ${b - h}z" opacity=".55"/>`
          + `<path fill="${c}" d="M${x - w * 0.34} ${b - h + 8}Q${x} ${b - h - w * 0.55} ${x + w * 0.34} ${b - h + 8}z"/>`
          + `<path fill="#4a2c36" d="M${x - 5} ${R(b - h * 0.42)}v-14a5 5 0 0 1 10 0v14z"/>`;
      };
      let ch1 = '', ch2 = '';
      [[170, 8, 150, 52], [300, 10, 210, 66], [440, 4, 120, 44], [1180, 8, 190, 60], [1330, 6, 140, 50], [1470, 10, 230, 70]].forEach(([x, , h, w], i) => { ch1 += chim(x, 720, h, w, '#c58a78', '#8a5568', '#a2685f'); });
      [[60, 600, 290, 90], [610, 880, 250, 74], [1000, 880, 300, 84], [1640, 880, 230, 70]].forEach(([x, , h, w]) => { ch2 += chim(x, 900, h, w, '#a8695d', '#6f3f55', '#8a5050'); });
      return `<defs>${lin(s1, [[0, '#33407e'], [0.3, '#8a5fa0'], [0.55, '#f08a8c'], [0.78, '#ffb878'], [1, '#ffe2a0']])}${lin(g1, [[0, '#e0987a'], [1, '#8c4f64']])}${lin(e1, [[0, '#ffffff'], [1, '#c9b4d6']])}</defs>`
        + full(`url(#${s1})`) + stars(5, 40, 260) + rays(840, 560, 1100, '#ffe9b8', 0.1) + sun(840, 560, 52, '#fff3d0', '#ffc070', true)
        + streak(300, 170, 300, '#ffb0b0', 0.5) + streak(1250, 250, 260, '#ffc490', 0.55, 70) + cloud(1200, 330, 0.9, '#d886a0', 0.75, 62, 6, '#ffd3b0')
        + mv('uspar', { ad: '70s', dx: '10px' }, `<path fill="#7b5c96" d="M300 600L520 430L600 330L680 420L900 600z"/><path fill="url(#${e1})" d="M552 388L600 330L650 388L628 378L606 396L584 376z" opacity=".9"/>` + ridge('#8e6a9c', 612, 40, 14, 3))
        + haze(560, 90, '#ffd8b0', 0.55)
        + balloon(340, 300, 0.55, '#e0453a', '#ffd25a', '#fff1d6', 60, 0) + balloon(1130, 250, 0.5, '#2c7aa8', '#fff', '#ffcf5a', 70, 14) + balloon(640, 220, 0.4, '#d9407d', '#ffe18a', '#fff', 80, 30) + balloon(990, 370, 0.45, '#f08a2a', '#6e3a8a', '#ffe9b0', 66, 22)
        + mv('uspar', { ad: '44s', dx: '14px' }, ridge('#c07a6c', 690, 60, 10, 21) + ridge('#a8625f', 750, 50, 9, 33))
        + ch1 + balloon(820, 480, 1.25, '#e5483a', '#ffd25a', '#fff', 54, 8) + balloon(1280, 560, 1.7, '#2a8a9c', '#ffe08a', '#e0453a', 62, 3) + balloon(190, 520, 1.0, '#9a4aa8', '#ffb4c8', '#fff3d6', 58, 20)
        + mv('usglow', { ad: '2.4s', to: '820px 560px' }, '<ellipse cx="820" cy="486" rx="8" ry="12" fill="#ffcf6a" opacity=".6"/>')
        + `<path fill="url(#${g1})" d="M-160 790Q300 740 800 770T1760 760V900H-160z"/>` + ch2 + grass(7, 40, -100, 1700, 900, 40, ['#6a3e4a', '#7e4a50', '#5a3446'], 'ussway')
        + birds(9, 5, 460, 420, '#5a3050', 1.1, 520) + mv('usrise', { ad: '8s' }, '<rect width="1600" height="900" fill="#ffd8a0" opacity=".08"/>') + finish(0.34);
    } });

  /* ---------- Cyprus: the white sea stacks and the turquoise Mediterranean at sunset ---------- */
  asiaSceneAdd({ key: 'country:CY', label: 'Sea stacks of the Mediterranean', site: 'The Rock of the Sea', colour: 'teal', mood: 'calm', season: 'any', tags: ['coast', 'sea', 'sunset'],
    svg: () => {
      const s1 = U(), w1 = U(), r1 = U(), r2 = U();
      const foam = (x, y, w, dur, del) => mv('usbob', { ad: dur + 's', d: -del + 's', dy: '6px' }, `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${R(w / 7)}" fill="#fff" opacity=".85"/><ellipse cx="${x + w * 0.3}" cy="${y + 6}" rx="${R(w * 0.6)}" ry="${R(w / 12)}" fill="#e6f7f4" opacity=".7"/>`);
      return `<defs>${lin(s1, [[0, '#4f7fb0'], [0.35, '#a6b4d4'], [0.62, '#ffc29a'], [1, '#ffe3a8']])}${lin(w1, [[0, '#f6c79a'], [0.12, '#4fb5b8'], [0.5, '#1f8fa6'], [1, '#13607e']])}${lin(r1, [[0, '#fbf3e4'], [1, '#c9b49a']])}${lin(r2, [[0, '#d7c4a6'], [1, '#7b6350']])}</defs>`
        + full(`url(#${s1})`) + rays(1040, 520, 1000, '#fff0c0', 0.12) + sun(1040, 520, 46, '#fffbe6', '#ffd08a')
        + streak(280, 150, 300, '#fff', 0.5) + cloud(520, 260, 1.0, '#e8aaa4', 0.85, 62, 10, '#fff1e0') + cloud(1300, 190, 0.8, '#e8b4aa', 0.8, 56, 30, '#fff3e6')
        + `<path fill="#a6a0c0" d="M-160 520Q200 470 500 500T1000 490L1300 505T1760 480V540H-160z" opacity=".55"/>`
        + `<rect y="520" width="1600" height="380" fill="url(#${w1})"/>`
        + `<path fill="#ffe3a8" opacity=".5" d="M960 520h160l90 380H820z"/>` + shimmer(4, 38, 820, 1260, 530, 700, '#fff6d0', 52) + shimmer(5, 30, -100, 1700, 640, 880, '#bdeff0', 60)
        // sailing boat
        + mv('usdrift', { ad: '56s', dx: '90px' }, mv('usbob', { ad: '5s', dy: '3px' }, `<path fill="#fff" d="M392 520L392 456L440 520z"/><path fill="#f5d6b8" d="M386 522L386 470L352 522z"/><path fill="#6b4a3a" d="M340 524H452L440 536H356z"/>`))
        // stacks
        + `<path fill="url(#${r1})" d="M560 880L588 640Q596 560 640 522Q662 470 700 468Q744 470 758 540Q790 600 800 700L828 880z"/>`
        + `<path fill="#a8957e" opacity=".55" d="M700 468Q744 470 758 540Q790 600 800 700L828 880H736Q760 700 726 610Q712 540 700 468z"/>`
        + `<path fill="url(#${r1})" d="M820 880L850 700Q862 640 900 610Q930 590 950 640Q972 700 980 880z"/><path fill="#a8957e" opacity=".5" d="M930 600Q960 640 972 720L980 880H920Q936 740 900 650z"/>`
        + `<path fill="#1f6f80" opacity=".55" d="M520 880Q640 840 780 862T1040 872V900H520z"/>` + foam(690, 868, 170, 3.6, 0) + foam(920, 874, 120, 4.2, 1.2) + foam(560, 892, 90, 3.2, 2)
        // headland and pines
        + mv('uspar', { ad: '40s', dx: '10px' }, `<path fill="url(#${r2})" d="M-160 900V560Q-40 520 120 560Q240 600 300 700Q340 780 400 900z"/><path fill="#5f4a3c" opacity=".5" d="M120 560Q240 600 300 700Q340 780 400 900H300Q280 760 200 660Q150 600 120 560z"/>`)
        + `<g fill="#3e5a3a"><path d="M40 560l-34 16h22l-26 20h24l-22 20h22l-20 18H110l-20-18h22l-22-20h24l-26-20h22z"/><path d="M180 590l-26 12h18l-20 16h20l-16 16h72l-16-16h20l-20-16h18z"/></g><path fill="#4a3426" d="M70 662h10v60H70zM208 648h8v50h-8z"/>`
        + mv('ussway', { ad: '6s', to: '80px 722px' }, `<g fill="#6a8a4a"><path d="M20 722q-4-34 6-60q10 26 8 60zM48 722q4-26 14-44q-2 26-6 44z"/></g>`)
        + `<path fill="#5a4a3c" d="M1380 900Q1480 780 1600 760L1760 740V900z" opacity=".9"/>` + grass(3, 22, 1380, 1760, 900, 70, ['#4a5a36', '#5f6a3e', '#3e4a30'], 'ussway2')
        + birds(2, 5, 700, 330, '#fff', 1.1, 600) + birds(8, 3, 1180, 220, '#6a5a70', 0.9, 480) + finish(0.32);
    } });

  /* ---------- Georgia: Gergeti Trinity Church under Mount Kazbek ---------- */
  asiaSceneAdd({ key: 'country:GE', label: 'A hilltop church under a snow peak', site: 'Gergeti Trinity Church and Kazbek', colour: 'green', mood: 'calm', season: 'any', tags: ['church', 'mountains', 'caucasus'],
    svg: () => {
      const s1 = U(), m1 = U(), h1 = U();
      return `<defs>${lin(s1, [[0, '#4a86c8'], [0.5, '#9cc4e6'], [1, '#e8f1f2']])}${lin(m1, [[0, '#ffffff'], [0.5, '#e4ecf6'], [1, '#8fa6c8']])}${lin(h1, [[0, '#8fb35a'], [1, '#3f6a3a']])}</defs>`
        + full(`url(#${s1})`) + sun(260, 150, 40, '#fffbe8', '#fff0b8') + streak(1250, 120, 300, '#fff', 0.6) + cloud(1380, 250, 0.9, '#b8c8dc', 0.9, 60, 12) + cloud(300, 330, 0.7, '#bccadc', 0.85, 50, 28)
        + mv('uspar', { ad: '90s', dx: '8px' }, `<path fill="#6f8ab4" d="M-160 560L120 360L260 430L420 320L520 420L-160 620z"/>`
          + `<path fill="#7d93bd" d="M360 600L640 300L760 360L860 200L930 120L1010 210L1100 180L1260 330L1420 280L1760 540V640z"/>`
          + `<path fill="url(#${m1})" d="M930 120L1010 210L1060 190L1040 252L990 236L960 300L930 262L900 300L880 262L860 200z" opacity=".95"/>`
          + `<path fill="#fff" opacity=".85" d="M640 300L680 338L662 342L656 366L640 348L626 368L614 342z"/><path fill="#a6b6d6" opacity=".5" d="M1010 210L1100 180L1260 330L1100 420L1050 260z"/>`)
        + haze(380, 130, '#e8f1ff', 0.6)
        + mv('uspar', { ad: '60s', dx: '14px' }, ridge('#5a7da4', 520, 90, 8, 7) + ridge('#496f86', 590, 60, 9, 12) + canopy('#2f5a3a', 612, 30, 4, -160, 1760, 700))
        // fog bank
        + mv('usdrift', { ad: '38s', dx: '120px' }, `<ellipse cx="500" cy="620" rx="420" ry="34" fill="#fff" opacity=".55"/><ellipse cx="1150" cy="650" rx="360" ry="28" fill="#fff" opacity=".5"/>`)
        // the hill and church
        + `<path fill="url(#${h1})" d="M-160 900V700Q100 630 330 620Q540 600 700 540Q780 500 860 510Q1000 520 1140 620Q1400 680 1760 650V900z"/>`
        + `<path fill="#5f8a44" opacity=".6" d="M700 540Q780 500 860 510Q1000 520 1140 620Q900 590 760 600z"/>`
        + `<path fill="#6a5a4a" d="M690 548Q780 520 880 530Q920 540 940 560Q830 540 700 560z" opacity=".8"/>`
        + `<g><rect x="748" y="456" width="84" height="76" fill="#b9a587"/><rect x="800" y="456" width="32" height="76" fill="#9a8668"/><path fill="#7b6b5c" d="M742 458L790 428L838 458z"/>`
        + `<rect x="772" y="410" width="36" height="52" fill="#c7b496"/><path fill="#8a7a6a" d="M770 412L790 380L810 412z"/><path fill="#6a5a4a" d="M786 380v-22M779 366h22" stroke="#6a5a4a" stroke-width="2.5" fill="none"/>`
        + `<rect x="840" y="442" width="22" height="90" fill="#bda98b"/><path fill="#8a7a6a" d="M838 442L851 418L864 442z"/><path fill="#43342c" d="M785 530v-26a6 6 0 0 1 10 0v26zM848 470v-14a3 3 0 0 1 6 0v14z"/>${lit(756, 484, 8, 14)}${lit(818, 484, 8, 14)}</g>`
        + `<path fill="#355f34" d="M600 640q10-40 30-60q14 30 20 60zM1000 600q8-32 28-52q10 26 18 52zM1060 640q8-34 26-54q12 28 16 54z" opacity=".9"/>`
        + mv('usdrift', { ad: '42s', dx: '60px' }, `<path fill="#9a8a78" d="M330 610q14-12 36-6q10-14 30-4q18-6 30 8q-14 8-34 6q-18 8-36 0q-20 2-26-4z"/><path fill="#8a7a6a" d="M1200 640q12-10 32-4q10-12 28-4q16-4 26 8q-14 6-30 4q-16 6-32 0q-16 2-24-4z"/>`)
        + mv('uspuff', { ad: '5s', dx: '90px', dy: '-70px', sc: '2.4' }, '<circle cx="840" cy="500" r="4" fill="#fff" opacity=".4"/>')
        // meadow flowers and grass
        + grass(2, 70, -100, 1700, 900, 60, ['#4f7a34', '#6f9a42', '#3a6030', '#86ac4a'], 'ussway') + (() => { const r = rnd(9); let o = ''; for (let i = 0; i < 40; i++) o += `<circle cx="${R(-80 + r() * 1760)}" cy="${R(780 + r() * 110)}" r="${(2.5 + r() * 2.5).toFixed(1)}" fill="${['#fff', '#ffd84a', '#c77ad8'][i % 3]}"/>`; return mv('ussway2', { ad: '5s', to: '800px 900px' }, o); })()
        + birds(6, 4, 540, 300, '#38485a', 1.1, 560) + finish(0.3);
    } });

  /* ---------- Armenia: Mount Ararat above the monastery on the plain ---------- */
  asiaSceneAdd({ key: 'country:AM', label: 'Mount Ararat over a monastery', site: 'Khor Virap and Mount Ararat', colour: 'amber', mood: 'proud', season: 'any', tags: ['monastery', 'mountain', 'apricot'],
    svg: () => {
      const s1 = U(), a1 = U(), p1 = U(), v1 = U();
      return `<defs>${lin(s1, [[0, '#6a78b6'], [0.38, '#d79bb8'], [0.66, '#ffbc90'], [1, '#ffe0a6']])}${lin(a1, [[0, '#f6dbe6'], [0.35, '#d99aaa'], [1, '#8a6078']])}${lin(p1, [[0, '#c9a36a'], [1, '#7a5a3c']])}${lin(v1, [[0, '#b58c52'], [1, '#6a5a2c']])}</defs>`
        + full(`url(#${s1})`) + stars(11, 30, 220) + rays(380, 600, 1000, '#ffd8a0', 0.1) + sun(380, 600, 46, '#fff0c8', '#ffb872', true)
        + streak(1200, 160, 320, '#ffc8c0', 0.5) + cloud(700, 250, 0.9, '#e0a0b0', 0.8, 60, 5, '#ffd9bc') + cloud(1380, 330, 0.7, '#e8a8b0', 0.75, 52, 22, '#ffddc0')
        // Ararat: the great peak and the lesser one
        + mv('uspar', { ad: '90s', dx: '8px' }, `<path fill="url(#${a1})" d="M520 620L760 330Q820 250 880 214Q920 190 960 214Q1040 260 1100 330L1360 620z"/>`
          + `<path fill="#fff4f2" d="M834 276Q880 214 920 200Q960 196 1004 250Q1050 290 1070 330L1030 322L1000 346L972 318L940 350L906 322L878 346L850 316z" opacity=".95"/>`
          + `<path fill="#8a5a78" opacity=".45" d="M960 214Q1040 260 1100 330L1360 620H1120Q1060 450 990 330z"/>`
          + `<path fill="#c88aa6" d="M1180 620L1330 470Q1380 430 1420 450Q1470 480 1560 620z"/><path fill="#fff0ee" d="M1360 455Q1390 436 1420 452Q1440 462 1450 490L1420 482L1398 500L1376 482L1350 492z"/>`)
        + haze(560, 90, '#ffd6b0', 0.6)
        + mv('uspar', { ad: '50s', dx: '12px' }, ridge('#c98e7a', 640, 30, 12, 8) + ridge('#b0765f', 670, 30, 10, 13))
        // plain with fields
        + `<path fill="url(#${p1})" d="M-160 900V690Q400 660 800 676T1760 670V900z"/>`
        + `<path fill="#9a8a50" opacity=".6" d="M-160 720Q300 700 700 716T1760 710V740Q1000 730 600 746T-160 750z"/><path fill="url(#${v1})" opacity=".8" d="M900 740l800-8v60L860 800z"/>`
        + (() => { let o = ''; for (let i = 0; i < 14; i++) o += `M${940 + i * 54} 748L${900 + i * 64} 800`; return `<path fill="none" stroke="#e0b862" stroke-width="3" opacity=".6" d="${o}"/>`; })()
        // monastery on its mound
        + `<path fill="#a8825a" d="M360 760Q420 700 520 688Q620 690 700 750V780H360z"/><path fill="#6a4a38" opacity=".5" d="M580 690Q660 700 700 750V780H620Q630 730 580 690z"/>`
        + `<g><path fill="#c9a37a" d="M410 744V698H700V744z"/><path fill="#a98462" d="M410 698h290l-8 8H418z"/>`
        + `<rect x="494" y="644" width="104" height="62" fill="#d4ae84"/><path fill="#b08a66" d="M570 644h28v62h-28z"/>`
        + `<rect x="514" y="606" width="64" height="40" fill="#d8b48a"/><path fill="#a98462" d="M510 608L546 566L582 608z"/><path fill="#a98462" d="M546 566L560 596L582 608L546 580z" opacity=".5"/>`
        + `<rect x="620" y="640" width="46" height="60" fill="#cfa97e"/><path fill="#a98462" d="M616 642L643 616L670 642z"/><path fill="#4a3228" d="M536 706v-30a10 10 0 0 1 20 0v30zM637 696v-22a6 6 0 0 1 12 0v22z"/>${lit(430, 714, 10, 18)}${lit(460, 714, 10, 18)}${lit(646, 728, 8, 12)}</g>`
        + mv('uspuff', { ad: '6s', dx: '60px', dy: '-90px', sc: '2.4' }, '<circle cx="660" cy="630" r="4" fill="#fff" opacity=".35"/>')
        // poplars and apricot trees
        + `<g fill="#6a7a36"><path d="M200 800q-22-10-18-60q4-70 18-110q14 40 18 110q4 50-18 60z"/><path d="M250 810q-20-10-16-54q4-60 16-96q12 36 16 96q4 44-16 54z"/><path d="M1110 760q-18-8-14-46q4-50 14-80q10 30 14 80q4 38-14 46z"/></g>`
        + mv('ussway', { ad: '5s', to: '200px 800px' }, `<g fill="#e88a3a"><circle cx="1280" cy="780" r="40"/><circle cx="1340" cy="796" r="34"/><circle cx="1230" cy="800" r="30"/></g><g fill="#ffb25a"><circle cx="1270" cy="768" r="16"/><circle cx="1340" cy="790" r="14"/></g>`)
        + `<path fill="#5a4030" d="M1274 820v-30M1340 830v-26" stroke="#5a4030" stroke-width="7"/>`
        + grass(4, 36, -100, 1700, 900, 56, ['#7a6a3a', '#8a7a46', '#665a30'], 'ussway2')
        + birds(5, 5, 600, 400, '#5a3a58', 1.1, 560) + finish(0.34);
    } });

  /* ---------- Azerbaijan: the Flame Towers over the Caspian at dusk ---------- */
  asiaSceneAdd({ key: 'country:AZ', label: 'The flame-shaped towers over the Caspian', site: 'Baku Flame Towers', colour: 'violet', mood: 'energetic', season: 'any', tags: ['skyline', 'towers', 'caspian'],
    svg: () => {
      const s1 = U(), w1 = U(), t1 = U(), f1 = U(), m1 = U();
      const tower = (x, h, wd, k) => {
        const y0 = 700, top = y0 - h;
        return `<path fill="url(#${t1})" d="M${x - wd} ${y0}C${x - wd * 1.1} ${y0 - h * 0.45} ${x - wd * 0.7} ${y0 - h * 0.75} ${x + k} ${top}C${x + wd * 0.5} ${y0 - h * 0.7} ${x + wd * 1.15} ${y0 - h * 0.4} ${x + wd} ${y0}z"/>`
          + `<path fill="url(#${f1})" opacity=".85" d="M${x + k} ${top}C${x + wd * 0.5} ${y0 - h * 0.7} ${x + wd * 1.15} ${y0 - h * 0.4} ${x + wd} ${y0}H${x + wd * 0.4}C${x + wd * 0.5} ${y0 - h * 0.45} ${x + wd * 0.4} ${y0 - h * 0.7} ${x + k} ${top}z"/>`
          + `<path fill="none" stroke="#e6f0ff" stroke-width="2" opacity=".5" d="M${x - wd * 0.3} ${y0 - 20}C${x - wd * 0.4} ${y0 - h * 0.5} ${x - wd * 0.2} ${y0 - h * 0.7} ${x + k - 4} ${top + 30}"/>`
          + (() => { let o = ''; for (let i = 0; i < 9; i++) { const yy = y0 - 30 - i * h * 0.095; o += lit(R(x - wd * 0.45 + (i * k) / 18), R(yy), R(wd * 0.5), 6); } return o; })();
      };
      return `<defs>${lin(s1, [[0, '#2c2f6a'], [0.35, '#6a4a94'], [0.62, '#e0709a'], [0.85, '#ffa876'], [1, '#ffcf8a']])}${lin(w1, [[0, '#f0a080'], [0.2, '#5a4a8a'], [1, '#1c2250']])}${lin(t1, [[0, '#d8e4f6'], [0.5, '#8aa2d0'], [1, '#4a5a98']])}${lin(f1, [[0, '#ff9a5a'], [1, '#ff5a4a', 0]])}${lin(m1, [[0, '#a8805a'], [1, '#5f4638']])}</defs>`
        + full(`url(#${s1})`) + stars(3, 70, 340) + sun(1250, 600, 36, '#fff0c8', '#ff9a6a') + streak(300, 180, 300, '#ff9ab8', 0.45) + cloud(520, 330, 1.0, '#b0709a', 0.8, 64, 8, '#f0a8b8') + cloud(1300, 260, 0.8, '#b87a9c', 0.75, 56, 30, '#f2b0b4')
        + mv('uspar', { ad: '70s', dx: '8px' }, ridge('#7a5a94', 650, 60, 12, 5, 720))
        // old city wall and rooftops
        + `<rect y="600" width="1600" height="300" fill="url(#${w1})"/>`
        + `<path fill="#f0b08a" opacity=".55" d="M1180 600h140l150 300H1020z"/>` + shimmer(3, 34, 1000, 1500, 620, 800, '#ffd0a0', 50) + shimmer(6, 30, -100, 1700, 700, 880, '#b8a8e8', 60)
        + mv('uspar', { ad: '46s', dx: '10px' }, `<path fill="url(#${m1})" d="M-160 720V640H300V620h40V600h40V620H1760V720z"/><path fill="#493834" d="M-160 640h2000v14H-160z" opacity=".6"/>`
          + (() => { let o = ''; for (let x = -140; x < 1760; x += 56) o += `<path d="M${x} 640v-18h12v18z" fill="#a8805a"/>`; return o; })()
          + `<path fill="#c9a07a" d="M1380 640V560h60v80z"/><path fill="#b08864" d="M1372 560L1410 520L1448 560z"/>${lit(1400, 580, 12, 20)}`)
        // towers
        + tower(740, 460, 76, -18) + tower(930, 380, 66, 14) + tower(1100, 330, 58, -10)
        + mv('usglow', { ad: '2.6s', to: '740px 240px' }, '<ellipse cx="722" cy="256" rx="22" ry="50" fill="#ff8a4a" opacity=".2"/>') + mv('usglow', { ad: '3.1s', d: '-1s', to: '940px 320px' }, '<ellipse cx="944" cy="330" rx="20" ry="44" fill="#ff7a4a" opacity=".2"/>') + mv('usglow', { ad: '2.8s', d: '-.4s', to: '1090px 370px' }, '<ellipse cx="1090" cy="388" rx="16" ry="40" fill="#ff8a54" opacity=".2"/>')
        + `<path fill="#3a2c40" d="M-160 700Q300 660 800 700T1760 690V740H-160z"/>`
        + (() => { const r = rnd(4); let o = ''; for (let i = 0; i < 26; i++) { const x = R(-60 + i * 66), h = R(60 + r() * 90); o += `<rect x="${x}" y="${700 - h + 40}" width="${R(36 + r() * 24)}" height="${h}" fill="#4a3a52"/>`; } return `<g>${o}</g>`; })()
        + dots('M-100 760H1700', '#ffd27a', 6, 38, 'us-lamps') + dots('M-100 776H1700', '#ffb25a', 5, 30, 'us-lamps')
        + `<path fill="#2c2548" d="M-160 800Q400 780 800 800T1760 790V900H-160z"/>`
        + mv('usdrift', { ad: '50s', dx: '140px' }, mv('usbob', { ad: '4s', dy: '3px' }, `<path fill="#2a2440" d="M300 842H460L440 856H320z"/><path fill="#2a2440" d="M370 842V800L420 842z"/>${lit(380, 846, 6, 4)}`))
        + mv('usflicker', { ad: '1.6s', to: '1700px 700px' }, '<circle cx="1700" cy="700" r="3" fill="#ff5a4a"/>')
        + birds(7, 4, 400, 280, '#2c2448', 1.0, 520) + finish(0.36);
    } });

  /* ---------- Lebanon: a cedar in the snowy mountains ---------- */
  asiaSceneAdd({ key: 'country:LB', label: 'An old cedar in the snowy mountains', site: 'The Cedars of God', colour: 'green', mood: 'calm', season: ['winter'], tags: ['cedar', 'snow', 'mountains'],
    svg: () => {
      const s1 = U(), m1 = U();
      const tier = (cx, y, rx, ry, c1, c2) => `<path fill="${c1}" d="M${cx - rx} ${y}Q${cx - rx * 0.5} ${y - ry * 1.5} ${cx} ${y - ry}Q${cx + rx * 0.5} ${y - ry * 1.5} ${cx + rx} ${y}Q${cx + rx * 0.5} ${y + ry * 0.55} ${cx} ${y + ry * 0.4}Q${cx - rx * 0.5} ${y + ry * 0.55} ${cx - rx} ${y}z"/><path fill="${c2}" d="M${cx - rx * 0.7} ${y - 4}Q${cx - rx * 0.3} ${y - ry * 1.1} ${cx} ${y - ry * 0.8}Q${cx + rx * 0.3} ${y - ry * 1.1} ${cx + rx * 0.7} ${y - 4}Q${cx + rx * 0.3} ${y - ry * 0.5} ${cx} ${y - ry * 0.5}Q${cx - rx * 0.3} ${y - ry * 0.5} ${cx - rx * 0.7} ${y - 4}z" opacity=".95"/>`;
      return `<defs>${lin(s1, [[0, '#4a82c4'], [0.55, '#9cc8ea'], [1, '#e6f2f6']])}${lin(m1, [[0, '#ffffff'], [1, '#b6c6e0']])}</defs>`
        + full(`url(#${s1})`) + sun(1280, 170, 38, '#fffbe8', '#fff2c0') + streak(300, 140, 320, '#fff', 0.6) + cloud(420, 260, 0.9, '#bccadf', 0.9, 60, 6) + cloud(1350, 330, 0.8, '#c4d0e2', 0.85, 52, 24)
        + mv('uspar', { ad: '90s', dx: '8px' }, `<path fill="#8aa0c6" d="M-160 600L100 380L260 470L520 280L700 420L860 340L1100 500L1300 360L1760 600z"/><path fill="url(#${m1})" d="M520 280L600 340L560 346L580 384L520 360L490 396L470 330zM1300 360L1360 410L1330 416L1350 446L1300 428L1272 450L1250 410zM100 380L150 420L120 426L136 450L100 436L80 452L64 420z"/>`)
        + haze(420, 120, '#eef6ff', 0.6)
        + mv('uspar', { ad: '60s', dx: '14px' }, ridge('#aebed8', 560, 80, 8, 3) + ridge('#7e98ba', 620, 60, 9, 7) + canopy('#35604a', 660, 40, 5, -160, 1760, 760) + `<path fill="#fff" opacity=".6" d="M-160 676h1920v14H-160z"/>`)
        + `<path fill="#f2f6fb" d="M-160 900V720Q300 690 800 720T1760 700V900z"/><path fill="#cdd9ea" d="M-160 790Q400 760 900 800T1760 780V900H-160z"/>`
        // the cedar
        + `<path fill="#5a4034" d="M770 800Q790 720 784 640Q780 560 800 500Q820 560 818 640Q812 720 840 800z"/><path fill="#3e2c26" d="M810 560Q820 560 818 640Q812 720 840 800H820Q816 720 812 640z" opacity=".6"/>`
        + mv('ussway2', { ad: '7s', to: '800px 800px' },
          tier(800, 600, 360, 70, '#2a5a3c', '#3f7a4c') + tier(800, 540, 290, 62, '#2a5a3c', '#3f7a4c') + tier(800, 480, 220, 54, '#2f6240', '#468452') + tier(800, 424, 150, 44, '#2f6240', '#4a8a56') + tier(800, 378, 90, 34, '#356a46', '#52925e')
          + `<path fill="#fff" opacity=".9" d="M470 566Q560 520 680 540Q620 556 560 580zM1130 566Q1040 520 920 540Q980 556 1040 580zM590 506Q660 470 730 486Q690 500 640 520zM1010 506Q940 470 870 486Q910 500 960 520zM700 454Q760 424 800 440Q770 450 740 470z"/>`)
        + `<path fill="#2c4a34" d="M180 820q10-60 30-100q16 36 24 100zM240 830q8-46 22-76q12 30 18 76zM1380 820q10-70 32-120q18 50 26 120zM1450 830q8-50 22-84q12 34 18 84z"/><path fill="#fff" opacity=".85" d="M190 760l22-20 20 24-20-8zM1392 744l22-26 22 30-22-10z"/>`
        + (() => { const r = rnd(3); let o = ''; for (let i = 0; i < 46; i++) o += `<circle class="x-usfall" style="--ad:${R(8 + r() * 8)}s;--d:-${R(r() * 14)}s;--dx:${R(-50 + r() * 80)}px" cx="${R(-40 + r() * 1700)}" cy="${R(r() * 240)}" r="${(1.6 + r() * 2.4).toFixed(1)}" fill="#fff"/>`; return `<g opacity=".9">${o}</g>`; })()
        + mv('uspuff', { ad: '6s', dx: '60px', dy: '-80px', sc: '2.2' }, '<circle cx="250" cy="712" r="5" fill="#fff" opacity=".4"/>')
        + birds(4, 4, 440, 330, '#3a4a64', 1.0, 520) + finish(0.3);
    } });

  /* ---------- Syria: the colonnade of Palmyra at sunset ---------- */
  asiaSceneAdd({ key: 'country:SY', label: 'A colonnade in the desert at sunset', site: 'The ruins of Palmyra', colour: 'amber', mood: 'dreamy', season: 'any', tags: ['ruins', 'desert', 'columns'],
    svg: () => {
      const s1 = U(), d1 = U(), c1 = U();
      const col = (x, yb, h, w, broken) => {
        const hh = broken ? h * (0.35 + ((x * 7) % 5) / 12) : h;
        return `<path fill="url(#${c1})" d="M${x - w} ${yb}h${w * 2}l-${w * 0.2} ${-hh}h${-w * 1.6}z"/>`
          + `<rect x="${R(x - w * 1.25)}" y="${R(yb - 6)}" width="${R(w * 2.5)}" height="8" fill="#c99a62"/>`
          + (broken ? `<path fill="#b9895a" d="M${x - w * 0.9} ${yb - hh}l${w * 0.5} -${R(w * 0.4)}l${w * 0.6} ${R(w * 0.3)}l${w * 0.4} -${R(w * 0.2)}l${w * 0.1} ${R(w * 0.3)}z"/>` : `<rect x="${R(x - w * 1.3)}" y="${R(yb - hh - w * 0.55)}" width="${R(w * 2.6)}" height="${R(w * 0.6)}" fill="#d6a56c"/><path fill="#c08e58" d="M${x - w * 1.3} ${yb - hh - w * 0.55}h${w * 2.6}l-${w * 0.2} -${R(w * 0.28)}h${-w * 2.2}z"/>`);
      };
      let cols = '', far = '';
      const pos = [];
      for (let i = 0; i < 10; i++) { const t = i / 9, k = 1 - 0.55 * t; pos.push({ x: R(1460 - 900 * Math.pow(t, 0.9)), yb: R(800 - 140 * t), h: R(340 * k), w: R(17 * k), br: i === 4 || i === 7 }); }
      for (let i = 9; i >= 0; i--) {
        const p = pos[i], q = pos[i + 1];
        cols += col(p.x, p.yb, p.h, p.w, p.br);
        if (q && !p.br && !q.br) cols += `<path fill="#d6a56c" d="M${p.x} ${p.yb - p.h - p.w}L${q.x} ${q.yb - q.h - q.w}v${R(q.w * 1.1)}L${p.x} ${p.yb - p.h - p.w + R(p.w * 1.1)}z"/>`;
      }
      return `<defs>${lin(s1, [[0, '#6a5a9c'], [0.3, '#c47aa0'], [0.55, '#ff9a6a'], [0.8, '#ffc27a'], [1, '#ffe4a4']])}${lin(d1, [[0, '#e8b070'], [1, '#a8683c']])}${lin(c1, [[0, '#f4d29a'], [0.6, '#e2b073'], [1, '#b87f50']])}</defs>`
        + full(`url(#${s1})`) + stars(9, 40, 240) + rays(460, 590, 1100, '#ffd890', 0.12) + sun(460, 590, 56, '#fff0c0', '#ffa860')
        + streak(900, 150, 340, '#ffb8a0', 0.5) + streak(250, 260, 260, '#ff9a8a', 0.5, 70) + cloud(1200, 300, 0.9, '#d98aa0', 0.75, 62, 12, '#ffc0a0')
        // castle on the hill
        + mv('uspar', { ad: '80s', dx: '8px' }, `<path fill="#a06a74" d="M900 600L1100 470Q1180 440 1260 470L1500 600z"/><path fill="#8a5a6c" d="M1090 476h120v-40h30v40h40l-8 24H1090z"/><path fill="#8a5a6c" d="M1110 436h14v-20h14v20zM1180 436h14v-18h14v18z"/>` + ridge('#c08a74', 610, 30, 10, 4))
        + haze(560, 100, '#ffd0a0', 0.55)
        + `<path fill="url(#${d1})" d="M-160 900V640Q200 610 560 650T1160 640Q1500 620 1760 660V900z"/>`
        + `<path fill="#b87a4a" opacity=".5" d="M-160 700Q300 670 760 710T1760 700V760Q1000 740 500 770T-160 760z"/>`
        // tetrapylon arch
        + `<g fill="#d9a766"><rect x="150" y="470" width="50" height="190"/><rect x="330" y="470" width="50" height="190"/><rect x="140" y="440" width="250" height="34"/></g><path fill="#c18c56" d="M140 440h250l-16-24H156z"/><path fill="#8a5a3c" d="M200 660V560Q265 500 330 560V660z"/>`
        + `<path fill="url(#${d1})" d="M-160 900V780Q300 740 800 790T1760 770V900z"/>`
        + cols
        + mv('usdrift', { ad: '40s', dx: '110px' }, `<ellipse cx="500" cy="840" rx="400" ry="22" fill="#ffd8a0" opacity=".25"/><ellipse cx="1200" cy="800" rx="300" ry="16" fill="#ffd8a0" opacity=".22"/>`)
        + mv('uspar', { ad: '36s', dx: '18px' }, `<path fill="#9a5c36" d="M-160 900V850Q200 800 520 860T1100 850T1760 840V900z"/>`)
        + mv('usmove', { ad: '70s', dx: '240px' }, `<g transform="translate(-180 -500) scale(1.6)"><path fill="#5a3a2a" d="M200 870q4-30 10-34l-6-30 10 4 4-14 8 16 10 6-4 10q10 14 10 36h-8l-4-22-12 2-2 20h-8l-4-22-6 2z"/></g>`)
        + `<path fill="#6a8a3a" d="M1440 870q-6-30-2-52q10 22 10 52zM1470 874q0-26 8-46q6 20 4 46z"/>`
        + grass(6, 20, 1380, 1700, 886, 50, ['#7a8a3a', '#8a9a46'], 'ussway')
        + birds(2, 5, 700, 330, '#4a2a44', 1.1, 600) + mv('uspuff', { ad: '7s', dx: '160px', dy: '-30px', sc: '3' }, '<circle cx="200" cy="860" r="14" fill="#e8c08a" opacity=".5"/>') + finish(0.34);
    } });

  /* ---------- Israel: sunrise over the Dead Sea and its salt formations ---------- */
  asiaSceneAdd({ key: 'country:IL', label: 'Sunrise over a salt sea', site: 'The Dead Sea at dawn', colour: 'teal', mood: 'calm', season: 'any', tags: ['sea', 'desert', 'salt'],
    svg: () => {
      const s1 = U(), w1 = U(), m1 = U(), z1 = U();
      let salt = '';
      const r = rnd(12);
      for (let i = 0; i < 16; i++) { const x = -60 + i * 108 + r() * 40, h = 16 + r() * 34, w = 44 + r() * 50, y = 800 + r() * 70; salt += `<path fill="#fffaf2" d="M${R(x)} ${R(y)}l${R(w * 0.2)} ${-R(h)}l${R(w * 0.3)} ${-R(h * 0.2)}l${R(w * 0.3)} ${R(h * 0.3)}l${R(w * 0.2)} ${R(h * 0.9)}z"/><path fill="#d8d0e0" opacity=".6" d="M${R(x + w * 0.5)} ${R(y)}l${R(w * 0.1)} ${-R(h * 0.9)}l${R(w * 0.3)} ${R(h * 0.3)}l${R(w * 0.2)} ${R(h * 0.8)}z"/>`; }
      return `<defs>${lin(s1, [[0, '#6a6ea8'], [0.3, '#c89ac0'], [0.55, '#ffb8a0'], [0.8, '#ffdca8'], [1, '#fff0c8']])}${lin(w1, [[0, '#ffd4b0'], [0.15, '#8ec8d0'], [0.55, '#4aa0b4'], [1, '#2a6c88']])}${lin(m1, [[0, '#c9a08a'], [1, '#a47a6c']])}${lin(z1, [[0, '#e8d0b0'], [1, '#c09a78']])}</defs>`
        + full(`url(#${s1})`) + stars(4, 40, 220) + rays(800, 520, 1100, '#fff0c0', 0.14) + sun(800, 520, 52, '#fffae0', '#ffd49a', true)
        + streak(300, 150, 320, '#ffc8c8', 0.5) + streak(1250, 240, 280, '#ffd0a8', 0.5, 70) + cloud(1150, 330, 0.9, '#e8a8b0', 0.75, 60, 9, '#ffe0c8')
        // far mountains across the water
        + mv('uspar', { ad: '80s', dx: '8px' }, `<path fill="url(#${m1})" d="M-160 520L60 470L220 490L420 440L640 480L900 450L1180 480L1400 440L1760 480V540H-160z"/><path fill="#8e6a7c" opacity=".4" d="M420 440L640 480L900 450L1180 480L1100 540H500z"/>`) + haze(470, 90, '#ffe0c8', 0.7)
        + `<rect y="520" width="1600" height="380" fill="url(#${w1})"/>`
        + `<path fill="#fff0c0" opacity=".5" d="M720 520h160l130 380H590z"/>` + shimmer(2, 42, 590, 1010, 530, 760, '#fffbe0', 56) + shimmer(8, 30, -100, 1700, 640, 880, '#b6e6ec', 64)
        + mv('usdrift', { ad: '60s', dx: '90px' }, `<ellipse cx="400" cy="560" rx="360" ry="12" fill="#fff" opacity=".45"/><ellipse cx="1180" cy="580" rx="300" ry="10" fill="#fff" opacity=".4"/>`)
        // near shore: desert slope and salt
        + mv('uspar', { ad: '44s', dx: '12px' }, `<path fill="url(#${z1})" d="M-160 900V760Q200 720 460 770Q700 820 900 860V900z"/><path fill="#9a7a5a" opacity=".5" d="M-160 800Q200 770 460 810T900 880V900H-160z"/>`)
        + `<path fill="#d4b490" d="M1000 900Q1200 820 1500 780T1760 770V900z"/>` + `<path fill="#fff" opacity=".7" d="M-160 870q300-30 700 0t700 8t720-20v40H-160z"/>`
        + salt + `<path fill="#fff" opacity=".9" d="M1030 850q80-24 160-8t170 4q-100 22-200 18t-130-14z"/>`
        + mv('usbob', { ad: '5s', dy: '3px' }, `<path fill="#fff" opacity=".8" d="M300 890q80-14 150 0q-70 14-150 0z"/>`)
        + mv('uspuff', { ad: '7s', dx: '60px', dy: '-80px', sc: '3' }, '<circle cx="700" cy="560" r="16" fill="#fff" opacity=".4"/>')
        + `<g fill="#6a8a4a"><path d="M1480 860q-8-50 4-90q12 38 8 90zM1520 866q4-36 16-60q6 28 0 60z"/></g>`
        + grass(5, 14, 1420, 1600, 880, 60, ['#7a8a4a', '#8a9a54'], 'ussway2')
        + birds(3, 5, 540, 340, '#5a3a5a', 1.1, 560) + finish(0.32);
    } });

  /* ---------- Palestine: terraced olive hills and a stone village in golden light ---------- */
  asiaSceneAdd({ key: 'country:PS', label: 'Olive terraces and a stone village', site: 'Olive groves on the hills', colour: 'green', mood: 'calm', season: ['autumn'], tags: ['olive', 'hills', 'village'],
    svg: () => {
      const s1 = U(), h1 = U();
      const olive = (x, y, s, sway) => `<g transform="translate(${x} ${y}) scale(${s})"><path fill="#5a4636" d="M-10 0Q-8 -30 -16 -46Q-4 -40 0 -28Q6 -42 16 -50Q10 -30 12 0z"/>${mv(sway || 'ussway', { ad: (4 + s).toFixed(1) + 's', to: '0px 0px' }, `<ellipse cx="-4" cy="-62" rx="46" ry="30" fill="#7e8f5a"/><ellipse cx="22" cy="-52" rx="32" ry="22" fill="#94a56a"/><ellipse cx="-28" cy="-50" rx="26" ry="18" fill="#6a7c4c"/><ellipse cx="6" cy="-74" rx="26" ry="14" fill="#aab87c" opacity=".8"/>`)}</g>`;
      const house = (x, y, w, h, c, dome) => `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="${c}"/><rect x="${x + w * 0.62}" y="${y - h}" width="${R(w * 0.38)}" height="${h}" fill="#000" opacity=".1"/>` + (dome ? `<path fill="${c}" d="M${x + w * 0.12} ${y - h}Q${x + w * 0.5} ${y - h - w * 0.5} ${x + w * 0.88} ${y - h}z"/><path fill="#000" opacity=".1" d="M${x + w * 0.5} ${y - h - w * 0.36}Q${x + w * 0.8} ${y - h - w * 0.2} ${x + w * 0.88} ${y - h}H${x + w * 0.5}z"/>` : `<rect x="${x - 2}" y="${y - h - 5}" width="${w + 4}" height="6" fill="${c}"/>`) + `<path fill="#4a3a30" d="M${x + w * 0.18} ${y}v${-R(h * 0.4)}a${R(w * 0.1)} ${R(w * 0.1)} 0 0 1 ${R(w * 0.2)} 0v${R(h * 0.4)}z"/>` + lit(R(x + w * 0.6), R(y - h * 0.7), R(w * 0.14), R(h * 0.22));
      let terr = '';
      for (let i = 0; i < 6; i++) terr += `<path fill="none" stroke="#a8967a" stroke-width="${3 + i}" opacity=".6" d="M-160 ${640 + i * 46}Q300 ${620 + i * 46} 700 ${650 + i * 46}T1760 ${630 + i * 46}"/>`;
      return `<defs>${lin(s1, [[0, '#5a8ac8'], [0.5, '#b6d0e4'], [0.8, '#ffe4b8'], [1, '#ffd49a']])}${lin(h1, [[0, '#c8b27a'], [1, '#8a7a4a']])}</defs>`
        + full(`url(#${s1})`) + rays(1300, 160, 1000, '#fff0c0', 0.12) + sun(1300, 160, 40, '#fffbe8', '#ffe9a8') + streak(300, 140, 320, '#fff', 0.55) + cloud(500, 250, 0.9, '#e8d6cc', 0.85, 60, 8, '#fff') + cloud(1100, 320, 0.7, '#ead8cc', 0.8, 50, 26)
        + mv('uspar', { ad: '80s', dx: '8px' }, ridge('#9aa6b8', 470, 80, 8, 4) + ridge('#8a9a86', 520, 60, 9, 8)) + haze(470, 90, '#fff0d0', 0.55)
        + mv('uspar', { ad: '50s', dx: '12px' }, `<path fill="url(#${h1})" d="M-160 900V560Q300 500 700 540Q1000 570 1250 520Q1500 480 1760 540V900z"/>`)
        // village on the ridge
        + mv('uspar', { ad: '56s', dx: '10px' }, house(520, 556, 70, 50, '#e6d3b0', true) + house(600, 560, 56, 64, '#dcc8a2', false) + house(662, 552, 84, 54, '#ecd9b6', true) + house(756, 556, 60, 76, '#e0cca6', false) + house(826, 548, 90, 56, '#e8d4b0', false) + house(930, 552, 64, 46, '#dac6a0', true)
          + `<rect x="1010" y="440" width="26" height="110" fill="#e6d3b0"/><path fill="#cdb98f" d="M1036 440h-14v110h14z" opacity=".6"/><rect x="1004" y="430" width="38" height="16" fill="#dcc8a2"/><path fill="#cdb98f" d="M1004 430L1023 404L1042 430z"/><path fill="#4a3a30" d="M1017 470v-14a6 6 0 0 1 12 0v14z"/>`)
        + mv('uspuff', { ad: '6s', dx: '60px', dy: '-90px', sc: '2.4' }, '<circle cx="880" cy="480" r="5" fill="#fff" opacity=".4"/>')
        + terr
        + `<path fill="url(#${h1})" opacity=".92" d="M-160 900V700Q200 660 600 700T1160 690Q1500 670 1760 700V900z"/>`
        + olive(240, 740, 1.0) + olive(500, 716, 0.7, 'ussway2') + olive(900, 724, 0.8) + olive(1260, 710, 0.7, 'ussway2') + olive(1500, 748, 1.1)
        + `<path fill="#7a6a42" d="M-160 900V800Q300 770 800 800T1760 790V900z"/>`
        + olive(130, 860, 1.7) + olive(1380, 880, 2.0, 'ussway2') + olive(740, 870, 1.3)
        + (() => { const r = rnd(7); let o = ''; for (let i = 0; i < 40; i++) o += `<circle cx="${R(-60 + r() * 1700)}" cy="${R(790 + r() * 100)}" r="${(2 + r() * 2).toFixed(1)}" fill="${['#5a6a3a', '#2c3a2c', '#7a5a8a'][i % 3]}"/>`; return `<g opacity=".8">${o}</g>`; })()
        + mv('usdrift', { ad: '50s', dx: '120px' }, `<path fill="#fff" opacity=".9" d="M-30 780q12-10 26-4q12-8 24 2q-12 6-24 2q-14 6-26 0z"/>`)
        + grass(3, 50, -100, 1700, 900, 56, ['#8a7a3a', '#a08a46', '#6a6a34'], 'ussway')
        + birds(5, 5, 640, 330, '#4a4a58', 1.1, 560) + finish(0.3);
    } });

  /* ---------- Jordan: the carved rose-red treasury of Petra ---------- */
  asiaSceneAdd({ key: 'country:JO', label: 'The rose-red city carved in rock', site: 'Petra, the Treasury', colour: 'red', mood: 'proud', season: 'any', tags: ['petra', 'canyon', 'architecture'],
    svg: () => {
      const s1 = U(), w1 = U(), f1 = U(), l1 = U(), g1 = U();
      const cl = (x, yb, h, w) => `<rect x="${x - w / 2}" y="${yb - h}" width="${w}" height="${h}" fill="url(#${f1})"/><path fill="#fff" opacity=".18" d="M${x - w / 2} ${yb - h}h${R(w * 0.25)}v${h}h${-R(w * 0.25)}z"/><rect x="${R(x - w * 0.75)}" y="${yb - h - 12}" width="${R(w * 1.5)}" height="14" fill="#d8a086"/><rect x="${R(x - w * 0.7)}" y="${yb - 8}" width="${R(w * 1.4)}" height="8" fill="#c58a72"/>`;
      let cols = '';
      [660, 730, 870, 940].forEach((x) => { cols += cl(x, 700, 170, 26); });
      return `<defs>${lin(s1, [[0, '#2f7ac0'], [1, '#9cd0ec']])}${lin(w1, [[0, '#b8664a'], [0.5, '#8a3f3c'], [1, '#5a2a30']])}${lin(f1, [[0, '#f2b79a'], [1, '#d58a72']])}${lin(l1, [[0, '#ffe2a8', 0.55], [1, '#ffe2a8', 0]])}${lin(g1, [[0, '#e8b88a'], [1, '#a8683c']])}</defs>`
        + `<rect width="1600" height="900" fill="#7a3a3a"/>` + `<path fill="url(#${s1})" d="M520 0H1080L1010 150Q820 190 640 150z" opacity=".9"/>`
        // canyon walls
        + mv('uspar', { ad: '50s', dx: '6px' }, `<path fill="url(#${w1})" d="M-160 0H600Q560 120 580 260Q540 330 560 420Q520 520 540 700L520 900H-160z"/><path fill="url(#${w1})" d="M1760 0H1060Q1040 120 1030 250Q1070 340 1050 440Q1090 540 1070 720L1090 900H1760z"/>`
          + (() => { let o = ''; for (let i = 0; i < 9; i++) o += `<path fill="none" stroke="${['#c5785a', '#6e3238', '#a85a4c'][i % 3]}" stroke-width="${3 + (i % 3) * 2}" opacity=".5" d="M-160 ${40 + i * 90}Q200 ${20 + i * 90} 540 ${60 + i * 88}"/><path fill="none" stroke="${['#c5785a', '#6e3238', '#a85a4c'][i % 3]}" stroke-width="${3 + (i % 3) * 2}" opacity=".5" d="M1760 ${50 + i * 90}Q1300 ${20 + i * 92} 1060 ${70 + i * 86}"/>`; return o; })())
        // light shaft
        + mv('usglow', { ad: '7s', to: '800px 0px' }, `<path fill="url(#${l1})" d="M700 0H980L1180 900H560z"/><path fill="url(#${l1})" opacity=".7" d="M800 0H900L940 900H700z"/>`)
        // the facade (the Treasury)
        + `<path fill="#c27a64" d="M580 900V250Q600 240 800 236T1020 250V900z" opacity=".45"/>`
        + `<rect x="600" y="440" width="400" height="290" fill="url(#${f1})"/><path fill="#a96250" opacity=".4" d="M600 440h30v290h-30zM970 440h30v290h-30z"/>`
        + `<path fill="#e6a088" d="M590 440h420l-40-52H630z"/><path fill="#d8907a" d="M640 440L800 372L960 440z"/><path fill="#ba7660" d="M720 440L800 400L880 440z"/>`
        + cols
        + `<rect x="640" y="426" width="320" height="16" fill="#d8a086"/>`
        + `<path fill="#4a2428" d="M768 700V582Q800 534 832 582V700z"/><path fill="#2e1618" d="M780 700V596Q800 566 820 596V700z"/><path fill="#d8907a" d="M750 590h100v-12H750z"/>`
        + `<path fill="#3a1c22" d="M640 700v-88Q660 590 680 612v88zM920 700v-88Q940 590 960 612v88z" opacity=".8"/>`
        // upper tholos
        + `<rect x="680" y="300" width="240" height="90" fill="url(#${f1})"/><rect x="670" y="386" width="260" height="14" fill="#e0a088"/><path fill="#e6a088" d="M680 300L800 262L920 300z"/>`
        + `<rect x="740" y="270" width="120" height="110" fill="#e8a890"/><path fill="#d8907a" d="M730 276Q800 150 870 276z"/><path fill="#c27a64" d="M800 168L830 276H800z" opacity=".5"/><path fill="#e8a890" d="M792 170q8-18 16 0v14h-16z"/>`
        + `<path fill="#d8907a" d="M784 380V310a16 16 0 0 1 32 0v70z"/><path fill="#4a2428" d="M792 380V318a8 8 0 0 1 16 0v62z"/>`
        + `<rect x="640" y="326" width="40" height="64" fill="#e0a088"/><rect x="920" y="326" width="40" height="64" fill="#e0a088"/><path fill="#d8907a" d="M634 330L660 296L686 330zM914 330L940 296L966 330z"/>`
        + `<path fill="#9a4a42" opacity=".55" d="M600 740L560 900H1040L1000 740z"/>`
        // ground
        + `<path fill="url(#${g1})" d="M-160 900V800Q300 770 560 760L1040 760Q1300 770 1760 810V900z"/>` + `<path fill="#c38252" opacity=".6" d="M-160 860Q400 830 800 850T1760 860V900H-160z"/>`
        + mv('usmove', { ad: '60s', dx: '260px' }, `<path fill="#5a3a2c" d="M300 830q6-26 14-30l-10-28 12 4 6-12 6 14 12 4-6 10q12 10 14 24l-6 20h-6l-2-16-10 2-2 16h-6l-2-16-10 2z"/>`)
        + mv('usdrift', { ad: '36s', dx: '120px' }, `<ellipse cx="800" cy="820" rx="520" ry="26" fill="#f0c898" opacity=".3"/>`)
        + (() => { const r = rnd(5); let o = ''; for (let i = 0; i < 26; i++) o += `<circle cx="${R(640 + r() * 340)}" cy="${R(400 + r() * 380)}" r="${(1.5 + r() * 2).toFixed(1)}" fill="#ffe8b0" opacity=".6"/>`; return mv('usfall', { ad: '16s', dx: '30px' }, o); })()
        + `<path fill="#6a8a3a" d="M1320 860q-6-34-2-60q10 26 10 60zM1350 866q2-26 10-46q4 22 2 46z"/>` + grass(8, 16, 1300, 1480, 880, 60, ['#7a8a3a', '#6a7a32'], 'ussway2')
        + dots('M-100 880H1700', '#ffd27a', 4, 60, 'us-lamps') + birds(4, 3, 800, 90, '#3a1c22', 0.9, 300) + finish(0.36);
    } });

  /* ---------- Iraq: the southern marshes at dawn, a reed house and a boat ---------- */
  asiaSceneAdd({ key: 'country:IQ', label: 'Reed marshes at dawn', site: 'The Mesopotamian Marshes', colour: 'green', mood: 'calm', season: 'any', tags: ['marsh', 'reeds', 'dawn'],
    svg: () => {
      const s1 = U(), w1 = U();
      const reeds = (seed, n, x0, x1, y, hmin, hmax, cols) => {
        const r = rnd(seed); let o = '';
        for (let i = 0; i < n; i++) { const x = R(x0 + r() * (x1 - x0)), h = hmin + r() * (hmax - hmin), bend = R(r() * 40 - 20); o += `<path fill="none" stroke="${cols[i % cols.length]}" stroke-width="${(3 + r() * 3).toFixed(1)}" stroke-linecap="round" d="M${x} ${y}Q${x + R(bend / 2)} ${R(y - h * 0.5)} ${x + bend} ${R(y - h)}"/>`; }
        return o;
      };
      let ribs = '';
      for (let i = 0; i < 7; i++) { const x = 560 + i * 70; ribs += `<path fill="none" stroke="#9a7a46" stroke-width="5" d="M${x} 640Q${x} 520 ${x + 20} 470"/>`; }
      return `<defs>${lin(s1, [[0, '#7a86b0'], [0.35, '#e0a8a8'], [0.65, '#ffd2a0'], [1, '#fff0c0']])}${lin(w1, [[0, '#ffe2b0'], [0.15, '#b0c8a8'], [0.6, '#5a8a80'], [1, '#2a5a58']])}</defs>`
        + full(`url(#${s1})`) + stars(8, 30, 200) + rays(1000, 520, 1100, '#fff2c0', 0.14) + sun(1000, 520, 56, '#fffae0', '#ffe0a0', true)
        + streak(300, 150, 320, '#ffd0c8', 0.5) + cloud(450, 280, 0.9, '#e8b0b0', 0.8, 60, 8, '#ffe4cc') + cloud(1350, 230, 0.8, '#eebcb0', 0.75, 52, 26, '#ffe8d0')
        + mv('uspar', { ad: '70s', dx: '8px' }, `<path fill="#b0b098" d="M-160 520Q400 490 800 510T1760 500V540H-160z" opacity=".7"/>` + canopy('#8a9a6a', 524, 16, 6, -160, 1760, 560)) + haze(470, 110, '#fff0c8', 0.7)
        + `<rect y="540" width="1600" height="360" fill="url(#${w1})"/>`
        + `<path fill="#fff0c0" opacity=".5" d="M920 540h160l120 360H760z"/>` + shimmer(2, 22, 760, 1220, 550, 780, '#fffbe0', 52) + shimmer(9, 16, -100, 1700, 620, 880, '#bfe0d0', 60)
        // mist
        + mv('usdrift', { ad: '50s', dx: '140px' }, `<ellipse cx="400" cy="570" rx="400" ry="22" fill="#fff" opacity=".5"/><ellipse cx="1250" cy="600" rx="340" ry="18" fill="#fff" opacity=".45"/>`)
        // far reed islands
        + mv('uspar', { ad: '50s', dx: '12px' }, `<path fill="#6a8a58" d="M-160 600Q200 570 500 590T1000 586Q1300 570 1760 596V620H-160z"/><g>${reeds(3, 22, -140, 1740, 610, 40, 90, ['#7a9a5a', '#8aaa62', '#6a8a50'])}</g>`)
        // the reed house (mudhif)
        + `<path fill="#c9a96a" d="M520 650Q520 500 640 470Q760 440 880 470Q1000 500 1000 650z"/>`
        + `<path fill="#a8884e" opacity=".5" d="M880 470Q1000 500 1000 650H900Q910 540 880 470z"/>`
        + `<g>${ribs}</g>` + `<path fill="none" stroke="#a8884e" stroke-width="3" opacity=".8" d="M530 600H990M540 560H980M570 520H950M610 486H910"/>`
        + `<path fill="#3a2c20" d="M690 650V560Q770 480 850 560V650z"/><path fill="#6a4a30" opacity=".6" d="M700 650V568Q770 500 840 568V650z"/>${lit(740, 590, 60, 40)}`
        + `<path fill="#8a6a3e" d="M500 650H1020v14H500z"/>`
        + mv('uspuff', { ad: '6s', dx: '50px', dy: '-90px', sc: '2.4' }, '<circle cx="780" cy="468" r="6" fill="#fff" opacity=".4"/>')
        // reed beds
        + mv('uspar', { ad: '36s', dx: '16px' }, `<g>${reeds(4, 26, -140, 520, 700, 120, 240, ['#7a9a4a', '#6a8a42', '#8aa856'])}</g><g>${reeds(5, 26, 1020, 1740, 710, 120, 240, ['#7a9a4a', '#6a8a42', '#8aa856'])}</g>`)
        + mv('ussway', { ad: '5s', to: '800px 760px' }, `<g>${reeds(6, 14, -140, 400, 790, 160, 300, ['#6a8a3a', '#7a9a46'])}</g><g>${reeds(7, 14, 1200, 1740, 790, 160, 300, ['#6a8a3a', '#7a9a46'])}</g>`)
        // the boat
        + mv('usdrift', { ad: '44s', dx: '110px' }, mv('usbob', { ad: '4s', dy: '3px' }, `<path fill="#2c2a30" d="M600 810Q760 830 940 790Q960 780 982 750Q940 806 800 824Q690 832 600 810z"/><path fill="#4a3a30" d="M640 808Q780 824 930 792Q960 782 978 756L976 770Q940 806 800 824Q700 830 640 808z" opacity=".7"/><path fill="none" stroke="#5a4a30" stroke-width="4" d="M840 790L1080 640"/>`))
        + `<path fill="#fff" opacity=".6" d="M560 850q120-10 240 0t240 0v6q-120 10-240 0t-240 0z"/>`
        + birds(3, 6, 500, 340, '#fff', 1.0, 600) + birds(7, 3, 1150, 400, '#4a4a58', 0.9, 480) + finish(0.3);
    } });
})();
