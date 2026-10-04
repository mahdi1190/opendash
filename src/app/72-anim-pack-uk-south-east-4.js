// UK_SCENE_PART: uk-south-east/north-hampshire
/* North Hampshire: eight places, four composed views each.
   Yateley Common — open heather, gorse and scattered birch, rather than hills.
   Wyndham's Pool — the Common's wooded pond, reed margins and dusk wildlife.
     https://www.hants.gov.uk/thingstodo/countryside/walking/yateleycommon
   Yateley Green — the open common, its pond and wildflower margins.
     https://yateley-tc.gov.uk/our-services/open-spaces/
   Fleet Pond — broad freshwater, reedbeds, woodland and viewing platforms.
     https://www.hart.gov.uk/fleet-pond
   Basingstoke Canal at Fleet — enclosed towpath, still water and narrowboats.
     https://www.hart.gov.uk/sites/default/files/2023-04/Bas%20Canal%20appraisal%20and%20character.pdf
   Southwood Country Park — open meadows and Cove Brook's wetland corridor.
     https://www.rushmoor.gov.uk/southwoodcountrypark
   Southwood Woodland — regenerating birch, mature oaks, bluebells and ferns.
     https://www.rushmoor.gov.uk/community-parks-and-leisure/parks-and-outdoors/southwood-woodland/
   Farnborough's restored airship hangar — the uncovered steel frame, not an
   operational airship shed; its portal, bracing and long perspective are the art.
     https://airsciences.org.uk/rae-wind-tunnel-buildings/
   Town centres are public, approximate locality anchors from ukTowns().
   All views are SVG drawings; none contains a photograph or embedded text. */
function ukSouthEastPart4(T) {
  const { add, U, R, rnd, mv, linU, canopy, oak, grass, meadow, shimmer, lit, vista } = T;
  const tree = (x, y, k, autumn = false, seed = 14) => oak(x, y, k, autumn ? '#655a39' : '#355b46', autumn ? '#aa874c' : '#67875c', autumn ? '#d3ae6c' : '#a0b77b', seed);
  const birch = (x, y, k, autumn = false) => {
    let bark = '';
    for (let i = 0; i < 8; i++) bark += `<path d="M${-7 + i % 3} ${-18 - i * 31}h${8 + i % 4}"/>`;
    return `<g transform="translate(${x} ${y}) scale(${k})"><path fill="#d9ddd0" d="M-11 0l5-305h9L16 0z"/><path stroke="#788779" stroke-width="3" fill="none" d="M0-130l-65-97M1-206l60-63"/><g stroke="#53665a" stroke-width="3">${bark}</g>${mv('uksway2', { ad: '7s', dx: '3px' }, `<g fill="${autumn ? '#b4a35d' : '#8aab76'}" opacity=".92"><ellipse cx="-36" cy="-235" rx="61" ry="73"/><ellipse cx="26" cy="-273" rx="65" ry="96"/><ellipse cx="-15" cy="-332" rx="42" ry="53"/></g><g fill="${autumn ? '#e0c781' : '#bad29a'}" opacity=".6"><ellipse cx="32" cy="-300" rx="30" ry="56"/><ellipse cx="-56" cy="-251" rx="23" ry="38"/></g>`)}</g>`;
  };
  const reeds = (x, y, k, seed) => {
    const random = rnd(seed); let stalks = '', heads = '';
    for (let i = 0; i < 15; i++) { const a = R(x + (random() - .5) * 170 * k), h = R((60 + random() * 85) * k); stalks += `M${a} ${y}q-10-${h / 2} 4-${h}`; heads += `<path d="M${a + 4} ${y - h}v-${21 * k}"/>`; }
    return mv('uksway', { ad: '5s', dx: '3px' }, `<path fill="none" stroke="#697344" stroke-width="${3 * k}" d="${stalks}"/><g stroke="#786345" stroke-width="${6 * k}" stroke-linecap="round">${heads}</g>`);
  };
  const water = (path, y, seed, dusk = false) => {
    const id = U(), clip = U();
    return `<defs>${linU(id, [[0, dusk ? '#c5aeb0' : '#9cbdaf'], [.4, dusk ? '#7b8299' : '#658e90'], [1, '#345866']], 0, y, 0, 900)}<clipPath id="${clip}"><path d="${path}"/></clipPath></defs><g clip-path="url(#${clip})"><path fill="url(#${id})" d="${path}"/>${shimmer(seed, 28, -160, 1760, y + 8, 890, dusk ? '#f5dab3' : '#d7e7d4', 45)}</g>`;
  };
  const dragonfly = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})">${mv('ukbob', { ad: '4s', dy: '13px' }, '<g fill="#e4ebdc" opacity=".75"><ellipse cx="-15" cy="-8" rx="21" ry="5" transform="rotate(18)"/><ellipse cx="15" cy="-8" rx="21" ry="5" transform="rotate(-18)"/></g><path stroke="#447c88" stroke-width="5" stroke-linecap="round" d="M0-10V23"/><circle cy="-13" r="5" fill="#3a5960"/>')}</g>`;
  const duck = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})">${mv('ukbob', { ad: '5s', dy: '3px' }, '<path fill="#d7d7bb" d="M-28 0q25-29 57-2L19 13H-15z"/><path fill="#446959" d="M15-3q-12-27 6-30 16 2 8 15v19z"/><path fill="#c8a366" d="M29-24l15 5-15 3z"/>')}<path fill="none" stroke="#d8e5ce" opacity=".65" stroke-width="2" d="M-47 18q44 12 85 0M-26 31h62"/></g>`;
  const bench = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})"><path fill="#a28a64" d="M-75-48h150v12H-75zM-75-29H75v12H-75zM-80-8H80V5H-80z"/><path stroke="#465b52" stroke-width="7" d="M-56 28v-81M56 28v-81"/></g>`;
  const boardwalk = (side, dusk) => {
    let joints = ''; for (let i = 0; i < 10; i++) { const y = 756 + i * 16, spread = (y - 730) * .6; joints += `M${780 - spread} ${y}H${840 + spread}`; }
    const path = `<path fill="${dusk ? '#9b8879' : '#b5aa86'}" d="M610 900l176-178h45l189 178z"/><path fill="none" stroke="#7b7964" stroke-width="3" d="${joints}"/><path fill="none" stroke="#5f6d5e" stroke-width="7" d="M616 868l172-165M1009 868L830 703M659 874v-57M950 874v-57M733 790v-43M885 790v-43"/>`;
    return side ? `<g transform="translate(-310 0)">${path}</g>` : path;
  };
  const heather = (seed, x0, x1, y0, y1) => {
    const random = rnd(seed); let out = '';
    for (let i = 0; i < 42; i++) { const x = R(x0 + random() * (x1 - x0)), y = R(y0 + random() * (y1 - y0)), k = .5 + (y - y0) / (y1 - y0); out += `<ellipse cx="${x}" cy="${y}" rx="${R(24 * k)}" ry="${R(10 * k)}" fill="${['#8f7195', '#b18bab', '#705876', '#c2a3b2'][i % 4]}"/>`; }
    return mv('uksway', { ad: '6s', dx: '2px' }, out);
  };
  const heath = v => {
    const autumn = v === 2;
    let h = `<path fill="${autumn ? '#a39666' : '#9b9e72'}" d="M-160 900V623Q790 577 1760 624V900z"/><path fill="#bdb497" d="${v === 1 ? 'M250 900Q1110 743 879 630h31Q1330 758 510 900z' : 'M667 900Q528 755 817 618h20Q675 749 901 900z'}"/>`;
    h += heather(4401 + v, -160, 590, 675, 893) + heather(4411 + v, 960, 1760, 652, 887);
    h += birch(v === 1 ? 1080 : 415, 733, v === 1 ? .9 : .55, autumn) + birch(v === 1 ? 1250 : 502, 725, .43, autumn);
    if (v === 2) h += `<path fill="#746749" d="M260 858l197-27 11 28-205 25z"/>${grass(4430, 22, 1060, 1660, 861, 84, '#958846')}`;
    else h += meadow(4440 + v, 15, 140, 540, 758, 850, ['#d7be66', '#ead28a']);
    if (v === 3) h += `<path fill="#4b5346" d="M1160 812v-137l-45-31 47 17 25-58-9 78 53 7-54 9 1 115z"/>${dragonfly(921, 676, .8)}`;
    return h;
  };
  const pond = (type, v) => {
    const fleet = type === 'fleet', green = type === 'green', dusk = v === 3;
    const y = fleet ? 625 : 688;
    let h = `<path fill="#7c9970" d="M-160 ${y - 36}Q800 ${y - 65} 1760 ${y - 17}V900H-160z"/>`;
    if (green) h += `<path fill="#a7b880" d="M-160 595H1760v119Q700 677-160 751z"/>${tree(1240, 701, .63, v === 2)}${bench(1014, 726, .65)}`;
    else h += canopy(dusk ? '#546b69' : '#547a63', y - 16, fleet ? 14 : 35, 4451, -160, 1760, y + 35, '#a8b791');
    const shape = green ? 'M157 795Q305 734 625 756Q896 754 1090 840L1020 900H78z'
      : v === 1 ? `M-160 ${y + 26}Q300 ${y - 9} 1760 ${y + 32}V900H-160z`
      : `M-160 ${y + 24}Q720 ${y - 5} 1760 ${y + 20}V900H-160z`;
    h += water(shape, green ? 770 : y + 15, 4460 + v, dusk);
    if (v === 0) h += fleet ? boardwalk(false, dusk) : `<path fill="#7b8963" d="M-160 900V815Q278 784 594 900z"/>` + tree(340, 868, .91, false) + reeds(1240, 862, .9, 4466);
    if (v === 1) h += `<path fill="#779077" d="M-160 900V760q240-67 690 140z"/>${reeds(435, 899, 1.2, 4471)}${reeds(155, 848, .8, 4472)}${dragonfly(715, 723, 1.05)}`;
    if (v === 2) h += `<path fill="#9e946f" d="M-160 900q630-110 1100 0zM1030 900q100-155 730-85v85z"/>` + tree(fleet ? 310 : 1210, 875, 1.04, true) + `${bench(737, 895, 1)}${meadow(4479, 12, 0, 320, 840, 900, ['#d7bd83', '#dbcfa6'])}`;
    if (v === 3) h += fleet ? `<path fill="#415f54" d="M-160 900q460-78 640 0z"/>${reeds(240, 900, 1.1, 4481)}${duck(963, 779, .7)}` : `<path fill="#6d7d60" d="M810 900Q1190 762 1760 791V900z"/>` + birch(1270, 880, .86) + bench(1073, 883, .65);
    if (!green) h += duck(fleet ? 1120 : 840, fleet ? 767 : 806, .7);
    if (green && v !== 1) h += meadow(4489, 18, 1160, 1580, 820, 895, ['#d9c688', '#eadcb0', '#ac95af']);
    return h;
  };
  const narrowboat = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})">${mv('ukbob', { ad: '6s', dy: '3px' }, `<path fill="#344c55" d="M-220-18h445l-27 39h-386z"/><path fill="#5c7d71" d="M-175-18v-57h325l31 57z"/><path fill="#d4c7a3" d="M-180-75h336l11 11h-347z"/>${Array.from({ length: 6 }, (_, i) => `<rect x="${-153 + i * 48}" y="-55" width="29" height="24" rx="3" fill="#adc4be"/>${lit(-153 + i * 48, -55, 29, 24)}`).join('')}<path stroke="#91745b" stroke-width="5" d="M-180-77v-23M154-76v-22"/>`)}</g>`;
  const canal = v => {
    const dusk = v === 3;
    let h = `<path fill="#6c8b5c" d="M-160 900V624H1760V900z"/>`;
    h += water('M610 620h165Q697 734 1180 900H30Q550 740 610 620z', 620, 4501 + v, dusk);
    h += `<path fill="#c2b69a" d="M783 620h30Q899 789 1580 900h-300Q783 763 783 620z"/><path fill="none" stroke="#647258" stroke-width="8" d="M789 637Q820 782 1242 894"/>`;
    for (let i = 0; i < 3; i++) h += tree(1220 + i * 198, 760 + i * 58, .6 + i * .2, v === 2, 4510 + i);
    h += birch(290, 849, 1, v === 2);
    if (v === 0) h += narrowboat(651, 773, .75) + reeds(350, 899, .8, 4518);
    if (v === 1) h += narrowboat(543, 829, 1.25) + `<path fill="none" stroke="#b9ad8d" stroke-width="3" d="M320 843Q626 900 1150 884"/>`;
    if (v === 2) h += bench(1180, 854, 1.05) + narrowboat(675, 674, .32) + reeds(488, 783, .65, 4521);
    if (v === 3) h += narrowboat(632, 762, .82) + duck(628, 868, .8) + reeds(273, 900, 1.1, 4524);
    return h;
  };
  const meadowPark = v => {
    let h = `<path fill="#9bad71" d="M-160 900V631Q850 588 1760 635V900z"/><path fill="#c5bb9d" d="M570 900Q1160 760 821 627h24Q1400 771 838 900z"/>`;
    h += tree(v === 1 ? 1160 : 373, 721, .63, v === 2) + birch(1380, 767, .55, v === 2);
    if (v === 1 || v === 3) h += water('M-160 862Q532 678 831 707Q1076 754 1760 689v43Q1130 802 838 739Q574 707-160 900z', 709, 4551 + v, v === 3) + reeds(372, 836, .78, 4558);
    if (v === 2) h += `<path fill="#9b9671" d="M-160 900V828Q377 713 810 793L1031 900z"/>${bench(573, 802, .7)}`;
    h += meadow(4560 + v, 28, -120, v === 1 ? 330 : 590, 750, 893, v === 2 ? ['#ccb679', '#ddd0aa'] : ['#dccbb0', '#b99abb', '#f0dfae']);
    h += meadow(4570 + v, 15, 1200, 1720, 794, 890, ['#ded6aa', '#b6bd80']);
    if (v === 0) h += dragonfly(950, 670, 1);
    return h;
  };
  const woodland = v => {
    let h = `<path fill="${v === 2 ? '#8a7955' : '#728858'}" d="M-160 610H1760V900H-160z"/><path fill="#c0ac85" d="${v === 1 ? 'M-100 900Q943 711 826 622h22Q1123 773 620 900z' : 'M710 900Q476 763 783 614h41Q679 766 1090 900z'}"/>`;
    for (let i = 0; i < 4; i++) h += birch(130 + i * 137, 690 + i * 49, .54 + i * .17, v === 2) + birch(1020 + i * 193, 690 + i * 52, .45 + i * .2, v === 2);
    h += tree(v === 1 ? 1080 : 235, 900, 1.25, v === 2, 4600);
    if (v === 0) h += meadow(4611, 25, 50, 650, 797, 900, ['#777eaf', '#9198c3', '#6c7aa3']);
    if (v === 1) h += `<path fill="#6b5941" d="M300 849l315-60 16 50-317 63z"/><path fill="#b59a6c" d="M308 901l-8-52 17-3 9 50z"/>${grass(4618, 25, 190, 650, 900, 110, '#547249')}`;
    if (v === 2) h += meadow(4621, 19, 120, 760, 840, 900, ['#d9a966', '#c08c51', '#aa824e']);
    if (v === 3) h += bench(818, 745, .6) + dragonfly(759, 626, .65);
    return h;
  };
  const hangarFrame = (x, y, k, endOn = false) => {
    let frames = '', rails = '';
    const n = endOn ? 5 : 7;
    for (let i = n - 1; i >= 0; i--) {
      const ox = endOn ? i * 17 : i * 63, oy = -i * 15, half = endOn ? 260 - i * 24 : 220, high = endOn ? 390 - i * 26 : 344;
      frames += `<path d="M${ox - half} ${oy}V${oy - high + 93}L${ox - half + 68} ${oy - high + 26}Q${ox} ${oy - high - 64} ${ox + half - 68} ${oy - high + 26}L${ox + half} ${oy - high + 93}V${oy}"/><path stroke-width="3" d="M${ox - half} ${oy - high + 93}h${half * 2}M${ox - half} ${oy - 10}l68-${high - 20}M${ox + half} ${oy - 10}l-68-${high - 20}M${ox - half + 68} ${oy - high + 26}L${ox + half - 68} ${oy - high + 93}M${ox + half - 68} ${oy - high + 26}L${ox - half + 68} ${oy - high + 93}"/>`;
      if (!endOn && i < n - 1) rails += `<path stroke-width="3" d="M${ox - half} ${oy}l63-190M${ox - half} ${oy - 175}l63 160M${ox + half} ${oy}l63-190M${ox + half} ${oy - 175}l63 160"/>`;
    }
    return `<g transform="translate(${x} ${y}) scale(${k})"><ellipse cx="${endOn ? 0 : 190}" cy="13" rx="${endOn ? 310 : 520}" ry="26" fill="#4b6153" opacity=".2"/><g fill="none" stroke="#73877f" stroke-width="8" stroke-linejoin="round">${frames}${rails}</g><g fill="none" stroke="#dae0ca" stroke-width="2" opacity=".72">${frames}</g></g>`;
  };
  const hangar = v => {
    let h = `<path fill="#96a77b" d="M-160 620H1760V900H-160z"/><path fill="#c5c0a9" d="M-160 900l420-160h780l720 160z"/><path fill="none" stroke="#e3dac0" stroke-width="4" d="M0 900l504-140M1470 900l-491-140"/>`;
    if (v === 0) h += hangarFrame(590, 746, .94) + tree(1370, 839, .72);
    if (v === 1) h += hangarFrame(790, 842, 1.35, true) + grass(4661, 26, -160, 420, 900, 65, '#617d54');
    if (v === 2) h += hangarFrame(903, 719, .59) + tree(338, 851, .96, true) + bench(699, 866, 1.15) + meadow(4664, 12, 1100, 1710, 841, 900, ['#e4cf9e', '#b78f6a']);
    if (v === 3) h += hangarFrame(605, 783, 1.09) + `<path stroke="#657969" stroke-width="5" d="M390 844v-83M1280 844v-83"/>${lit(384, 752, 12, 17)}${lit(1274, 752, 12, 17)}${bench(1130, 897, .9)}`;
    return h;
  };
  const places = [
    ['yateley-common', 'Yateley Common', 'Yateley', 'landscape', ['heathland', 'heather', 'birch'], heath,
      ['Heather beside the sandy trail', 'Birches above a winding heath path', 'Autumn gorse and a fallen branch', 'A dusk perch above the open heath']],
    ['wyndhams-pool', "Wyndham's Pool", 'Yateley', 'landscape', ['pond', 'woodland', 'reeds'], v => pond('wyndham', v),
      ['A wooded shoreline and open water', 'Dragonflies above the near reeds', 'Autumn oak beside the water', 'Evening water from the wooded bank']],
    ['yateley-green', 'Yateley Green', 'Yateley', 'landscape', ['village green', 'pond', 'wildflowers'], v => pond('green', v),
      ['The pond within the open green', 'A low view across the pond margin', 'Autumn shade beside the green', 'Evening beneath the pondside birches']],
    ['fleet-pond', 'Fleet Pond', 'Fleet', 'landscape', ['lake', 'reedbed', 'nature reserve'], v => pond('fleet', v),
      ['Open water from a viewing platform', 'Reedbed and hovering dragonflies', 'The autumn woodland shore', 'Waterbirds across the evening lake']],
    ['fleet-canal', 'Basingstoke Canal', 'Fleet', 'heritage', ['canal', 'towpath', 'narrowboat'], canal,
      ['A narrowboat below the tree line', 'Close alongside a passing narrowboat', 'Autumn on the wooded towpath', 'Lit cabin windows at dusk']],
    ['southwood-country-park', 'Southwood Country Park', 'Farnborough', 'landscape', ['meadow', 'cove brook', 'wetland'], meadowPark,
      ['Wildflowers across the open meadow', 'Reed margins beside Cove Brook', 'An autumn seat along the meadow trail', 'Evening light over the wetland']],
    ['southwood-woodland', 'Southwood Woodland', 'Farnborough', 'landscape', ['birch', 'oak', 'bluebells'], woodland,
      ['Bluebells along the birch path', 'A fallen branch beneath a mature oak', 'Golden leaves on the woodland floor', 'A quiet clearing in evening light']],
    ['farnborough-airship-hangar', 'Portable Airship Hangar', 'Farnborough', 'heritage', ['aviation', 'steel frame', 'heritage'], hangar,
      ['The restored frame across the lawn', 'Looking through the open steel portals', 'Autumn trees frame the historic structure', 'The braced frame against the evening sky']],
  ];
  // Interleave places, so one location's four views are not played consecutively.
  for (let view = 0; view < 4; view++) for (let index = 0; index < places.length; index++) {
    const [place, label, town, kind, tags, draw, reasons] = places[index];
    add('hampshire', kind, { id: `${place}-${view + 1}`, label, site: `${label} — ${reasons[view]}`,
      colour: kind === 'heritage' ? 'slate' : 'green', mood: view === 3 ? 'dreamy' : 'calm', tags,
      ukPlace: place, ukLocality: town, ukTown: town, ukView: ['wide', 'close', 'autumn', 'evening'][view], viewReason: reasons[view],
      svg: () => vista(4700 + index * 17 + view, () => draw(view), { path: false, flat: true, edgeNear: true, y: 610, autumn: view === 2, time: view === 3 ? 'dusk' : 'day' }) });
  }
}
