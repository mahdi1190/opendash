// UK_SCENE_PART: uk-south-east/hampshire-towns
/* Hampshire town views. Pure builder, called by the base pack with its toolkit.
   Buckler's Hard — the two cottage rows descend to the Beaulieu River, retaining
     the village's shipbuilding layout; views explore street, quay and tidal water.
     https://bucklershard.co.uk/about-us/
     https://bucklershard.co.uk/plan-your-visit/itinerary/
   Hurst Castle — a round Tudor gun tower and later low batteries occupy a shingle
     spit; the neighbouring lighthouse and tide give genuinely different subjects.
     https://www.hurstcastle.co.uk/history/tudor-castle-overview-and-setting/
     https://www.hurstcastle.co.uk/lighthouses-on-the-spit/
   Netley Abbey — roofless Cistercian church walls, open lancets and a great west
     window survive in woodland; no glazing or invented intact nave is drawn.
     https://www.english-heritage.org.uk/visit/places/netley-abbey/
     https://historicengland.org.uk/listing/the-list/list-entry/1001960
   Whitchurch Silk Mill — the Georgian brick mill stands on Frog Island in the
     River Test; waterwheel, riverside garden and reflections change the focus.
     https://whitchurchsilkmill.org.uk/highlights/
     https://whitchurchsilkmill.org.uk/group-visits/
   ukTown is the existing offline main-town cluster, while ukLocality names the
   actual place. These public place names are unrelated to the user's data.
   Every view is illustrated shape art, with a complete reduced-motion frame. */
function ukSouthEastPart2(T) {
  const { add, U, R, rnd, mv, ridge, canopy, linU, puffs, grass, meadow, oak,
    lit, reflect, sail, boat, shimmer, vista } = T;
  const views = (place, label, town, locality, kind, colour, tags, scenes) => {
    for (const [view, reason, draw, options] of scenes) {
      const seed = [...place + view].reduce((n, c) => n + c.charCodeAt(0), 0);
      add('hampshire', kind, { id: place + '-' + view, label: label + ' — ' + reason,
        site: label.includes(locality) ? label : label + ', ' + locality, colour, tags, ukPlace: place, ukTown: town,
        ukLocality: locality, ukView: view, viewReason: reason,
        svg: () => vista(seed, draw, Object.assign({ path: false, art:place }, options)) });
    }
  };
  const brick = (seed, warm) => {
    const id = U(), light = U();
    return { fill: `url(#${id})`, defs: `<defs>${linU(light, [[0, warm ? '#ca9873' : '#bd7959'], [.6, '#a56249'], [1, '#804e3e']], 0, 200, 1200, 750)}<pattern id="${id}" width="38" height="20" patternUnits="userSpaceOnUse"><rect width="38" height="20" fill="url(#${light})"/><path stroke="#edd3ad" stroke-width="1" opacity=".28" fill="none" d="M0 1H38M0 11H38M10 1v10M29 11v9"/></pattern></defs>` };
  };
  const sash = (x, y, w, h) => `<rect x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${h + 8}" fill="#e6dfcd"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#455865"/>${lit(x, y, w, h)}<path fill="none" stroke="#e8e3d4" stroke-width="2" d="M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}"/>`;
  const cottage = (x, y, w, h, seed, plaster) => {
    const b = brick(seed), roof = U(), nr = Math.max(2, Math.floor(w / 60)); let windows = '';
    for (let i = 0; i < nr; i++) windows += sash(x + 17 + i * (w - 38) / nr, y - h + 24, 21, 32);
    return `${b.defs}<defs>${linU(roof, [[0, '#9b684b'], [1, '#634335']], x, y - h - 70, x + w, y - h)}</defs><path fill="${plaster ? '#d9d0b7' : b.fill}" d="M${x} ${y}v-${h}h${w}v${h}z"/><path fill="#754d3d" opacity=".35" d="M${x + w - 15} ${y - h}h15v${h}h-15z"/><path fill="url(#${roof})" d="M${x - 12} ${y - h + 3}l${w * .28 + 12}-${h * .43}h${w * .48}l${w * .24 + 12} ${h * .43}z"/><path fill="none" stroke="#b08a69" stroke-width="2" opacity=".6" d="M${x + 10} ${y - h - 10}h${w - 20}M${x + 26} ${y - h - 26}h${w - 52}"/><path fill="#86614d" d="M${x + w * .61} ${y - h - 30}v-41h17v41z"/>${windows}<path fill="#425b52" d="M${x + w * .43} ${y}v-48h25v48z"/><rect x="${x - 6}" y="${y}" width="${w + 12}" height="9" fill="#b5a689"/>`;
  };
  const village = (close, evening) => {
    let out = `<path fill="#aaab77" d="M-160 900V614H1760V900z"/><path fill="#c8bf9f" d="M575 900L730 616h140l160 284z"/><path fill="#ded4b6" d="M670 900l94-284h48l-36 284z"/>`;
    for (let i = 0; i < 4; i++) {
      const k = 1 - i * .15, y = 850 - i * 63, w = R(260 * k), h = R(160 * k);
      out += cottage(225 + i * 94, y, w, h, 811 + i, i === 2) + cottage(1035 - i * 60, y - 7, w, h, 819 + i, i === 1);
    }
    out += `<path fill="#6e7655" d="M430 900l215-276h22L502 900zM1110 900L928 624h18l243 276z"/>`;
    if (close) out += boat(850, 674, .33, '#596d65') + `<path stroke="#786650" stroke-width="6" d="M925 682v-61M966 680v-54"/>`;
    if (evening) out += [560, 1000].map(x => `<path stroke="#444d45" stroke-width="6" d="M${x} 876V657"/><path fill="#41584e" d="M${x - 13} 658l13-20 13 20v32h-26z"/>${lit(x - 8, 660, 16, 23)}`).join('');
    return out;
  };
  const quay = autumn => {
    let out = `<path fill="#8b9b76" d="M-160 608H1760v65H-160z"/>`;
    for (let i = 0; i < 5; i++) out += cottage(370 + i * 173, 649, 151, 88, 841 + i, i === 3);
    out += `<path fill="#8d8974" d="M270 668h1040v24H270z"/><path fill="none" stroke="#c1b297" stroke-width="5" d="M300 667h980"/>${boat(775, 774, .83, '#7a5746')}${sail(1180, 773, .62, 4)}<path fill="none" stroke="#a59470" stroke-width="5" d="M655 776L560 688M905 778l130-87"/>`;
    if (autumn) out += oak(265, 885, 1.05, '#4c5436', '#8d8045', '#c29f59', 848) + `<path fill="#afa17c" d="M-160 900q480-110 740 0z"/>${grass(849, 28, -160, 480, 900, 50, '#716f3f')}`;
    return out;
  };
  views('bucklers-hard', "Buckler's Hard", 'Lyndhurst', "Buckler's Hard", 'heritage', 'red', ['beaulieu river', 'cottages', 'shipbuilding'], [
    ['street', 'the sloping village street', () => village(true, false), { y: 620 }],
    ['quay', 'moored boats below the cottages', () => quay(false), { water: true, y: 675 }],
    ['autumn', 'the riverbank beneath an autumn oak', () => quay(true), { water: true, autumn: true, y: 675 }],
    ['lamplight', 'the cottage rows at lamplight', () => village(false, true), { time: 'dusk', y: 620 }],
  ]);

  const lighthouse = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})"><ellipse cy="5" rx="55" ry="12" fill="#536b72" opacity=".25"/><path fill="#eee9dc" d="M-34 0l14-244h40L34 0z"/><path fill="#d0d7ce" d="M12-244h8L34 0H16z"/><path fill="#3c4a4e" d="M-25-244v-26h50v26zM-30-270l30-20 30 20z"/><path fill="#dae2d8" d="M-31-245h62v7h-62z"/><path fill="none" stroke="#687676" stroke-width="3" d="M-31-235v-15h62v15M-26-237H26"/>${lit(-17, -263, 34, 13)}<path fill="#54656a" d="M-6-182h12v23H-6zM-7-98H7v25H-7zM-10 0v-38h20V0z"/></g>`;
  const fort = (x, y, k, wings) => {
    const wall = U(); let ports = '';
    for (let i = 0; i < 8; i++) ports += `<path fill="#52656b" d="M${-347 + i * 99}-46h19v16h-19z"/>`;
    return `<defs>${linU(wall, [[0, '#d8cbb0'], [.5, '#b8ab8d'], [1, '#827f6b']], -350, -240, 420, 20)}</defs><g transform="translate(${x} ${y}) scale(${k})"><ellipse cy="13" rx="${wings ? 510 : 230}" ry="35" fill="#3b5158" opacity=".25"/>${wings ? `<path fill="url(#${wall})" d="M-480 0V-95l93-20h774l93 20V0z"/><path fill="#777d70" d="M-488-91l101-32h774l101 32-8 8-97-23h-766l-97 23z"/>${ports}` : ''}<path fill="url(#${wall})" d="M-204 0V-124q40-42 102 0V0zM104 0V-124q40-42 102 0V0z"/><path fill="#d7c7a5" d="M-209-124q50-30 112 0v10q-55-21-112 0zM99-124q50-30 112 0v10q-55-21-112 0z"/><path fill="url(#${wall})" d="M-110 0V-239q110-40 220 0V0z"/><path fill="#daceb2" d="M-117-239q117-41 234 0v17q-117-37-234 0z"/><path fill="#716f5d" opacity=".4" d="M61-250q35 2 49 11V0H66z"/><path fill="none" stroke="#8d8b74" stroke-width="3" d="M-108-194q107-27 217 0M-108-148q107-20 217 0M-108-85q107-18 217 0"/><path fill="#4f5b5a" d="M-69-199h18v27h-18zM-9-205H9v27H-9zM51-199h18v27H51zM-12 0v-63q12-15 24 0V0zM-173-78h23v20h-23zM148-78h23v20h-23z"/></g>`;
  };
  views('hurst-castle', 'Hurst Castle', 'Lymington', 'Hurst Spit', 'landmark', 'slate', ['hurst', 'shingle', 'solent'], [
    ['batteries', 'the keep and long coastal batteries', () => `<path fill="#bcb19a" d="M-160 745q730-132 1920 0v155H-160z"/>${lighthouse(1130, 634, .65)}${fort(780, 752, 1.1, true)}${grass(901, 27, 200, 470, 884, 38, '#838661')}`, { water: true, coast: true, y: 685 }],
    ['gun-tower', 'the curved Tudor gun tower', () => `<path fill="#baae90" d="M-160 825q780-108 1920 0v75H-160z"/>${fort(790, 780, 1.62, false)}${sail(1245, 712, .37, 9)}<path fill="none" stroke="#d1c4a9" stroke-width="3" d="M320 853q490-80 890-13"/>`, { water: true, coast: true, y: 660 }],
    ['tide', 'the shingle spit and tidal channels', () => `<path fill="#b9ad91" d="M-160 900Q210 720 710 659l35 28Q370 798 370 900z"/><path fill="#d8c9aa" d="M-160 900Q310 710 700 655l17 20Q266 776 70 900z"/>${fort(913, 670, .54, true)}${lighthouse(1215, 654, .45)}${boat(830, 820, .37, '#6e7d75')}${grass(924, 42, -100, 450, 895, 46, '#86845c')}`, { water: true, coast: true, y: 645 }],
    ['beacon', 'the lighthouse above the evening tide', () => `${fort(590, 703, .65, true)}<path fill="#b4a18a" d="M-160 841q900-184 1920-27v86H-160z"/>${lighthouse(1080, 824, 1.35)}${shimmer(931, 17, 1240, 1650, 723, 810, '#efdaa8', 48)}`, { water: true, coast: true, time: 'dusk', y: 690 }],
  ]);

  const ruinedWall = (x, y, w, h, count, great) => {
    const material = U(), stone = U(); let holes = '', joints = '';
    if (great) holes = `M${x + w * .23} ${y - 76}V${y - h * .6}Q${x + w * .5} ${y - h * 1.12} ${x + w * .77} ${y - h * .6}V${y - 76}z`;
    else for (let i = 0; i < count; i++) {
      const bay = (w - 60) / count, ww = (bay - 28) / 2;
      for (let j = 0; j < 2; j++) {
        const xx = x + 34 + i * bay + j * (ww + 9), top = y - h + 80;
        holes += `M${xx} ${y - 90}V${top}q${ww / 2}-${ww * 1.1} ${ww} 0V${y - 90}z`;
      }
    }
    const r = rnd(R(x + y));
    for (let row = 0; row < 16; row++) { const yy = y - row * h / 16; joints += `M${x} ${R(yy)}h${w}`; for (let j = 0; j < 8; j++) { const xx = x + j * w / 8 + r() * 18; joints += `M${R(xx)} ${R(yy)}v-${R(h / 16)}`; } }
    const outline = great ? `M${x} ${y}v-${h}l${w * .22}-${h * .2} ${w * .18}-${h * .05} ${w * .09}-${h * .12} ${w * .11} ${h * .03} ${w * .4} ${h * .34}V${y}z` : `M${x} ${y}v-${h}l${w * .18}-24 ${w * .2} 8 ${w * .12}-22 ${w * .21} 19 ${w * .15}-6 ${w * .14} 25V${y}z`;
    const buttresses = Array.from({ length: great ? 2 : count + 1 }, (_, i) => {
      const xx = great ? x + (i ? w - 18 : 0) : x + i * w / count;
      return `<path fill="#a8a48b" d="M${xx - 9} ${y}v-${h * .65}h16l10 ${h * .65}z"/><path fill="#d7cdb2" d="M${xx - 9} ${y - h * .65}l8-22 8 22z"/>`;
    }).join('');
    return `<defs>${linU(stone, [[0, '#d9cfb9'], [.5, '#afa98e'], [1, '#858870']], x, y - h, x + w, y)}<clipPath id="${material}"><path fill-rule="evenodd" d="${outline}${holes}"/></clipPath></defs><path fill="url(#${stone})" fill-rule="evenodd" d="${outline}${holes}"/><path clip-path="url(#${material})" fill="none" stroke="#756f5b" opacity=".23" stroke-width="2" d="${joints}"/>${buttresses}<path fill="#69744c" opacity=".65" d="M${x} ${y}v-${h * .5}q20-25 30 0v${h * .5}z"/>`;
  };
  const foundations = () => `<path fill="#b7b099" d="M330 845l350-122h350l290 122h-55l-255-96H700L402 845zM522 897l240-139h43L597 897z"/><path fill="#828a6a" d="M330 846l350-122h350l290 122v10l-291-120H680L330 858z"/>`;
  views('netley-abbey', 'Netley Abbey', 'Southampton', 'Netley', 'heritage', 'slate', ['netley', 'abbey', 'woodland'], [
    ['west-window', 'the open great window in woodland', () => `${ruinedWall(390, 727, 325, 330, 1, true)}${ruinedWall(715, 727, 548, 210, 5, false)}${oak(1280, 775, .72, '#3e583b', '#6b8553', '#a1ac6f', 971)}${foundations()}`, { lawn: true }],
    ['lancets', 'a view through the roofless church walls', () => `${ruinedWall(210, 808, 1170, 415, 5, false)}<path fill="#d2c8ae" d="M195 822h1200v15H195z"/><path fill="#5e7350" d="M370 900l355-175h90L625 900z"/>${meadow(982, 35, 500, 1180, 850, 900, ['#e7ddb2', '#baa879'])}`, { lawn: true }],
    ['cloister', 'autumn along the cloister foundations', () => `${ruinedWall(670, 666, 600, 185, 5, false)}${ruinedWall(500, 668, 190, 243, 1, true)}${foundations()}${oak(290, 840, 1.15, '#524f35', '#947b44', '#c79b55', 995)}${mv('ukfall', { ad: '12s', d: '-4s', dx: '110px' }, '<ellipse cx="430" cy="590" rx="10" ry="5" fill="#c29550"/>')}`, { autumn: true, y: 665 }],
    ['twilight', 'the great window against the evening sky', () => `${ruinedWall(615, 777, 425, 432, 1, true)}${ruinedWall(1030, 777, 275, 198, 3, false)}${oak(290, 795, .9, '#344739', '#596b47', '#8d9661', 1007)}${grass(1008, 45, 290, 1330, 885, 65, '#586a47')}`, { time: 'dusk', y: 755 }],
  ]);

  const wheel = (x, y, k) => {
    const spokes = Array.from({ length: 14 }, (_, i) => { const a = i * Math.PI / 7; return `M0 0L${R(Math.cos(a) * 90)} ${R(Math.sin(a) * 90)}`; }).join('');
    return `<g transform="translate(${x} ${y}) scale(${k})"><g class="x-ukwheel" style="--ad:18s;transform-box:view-box;transform-origin:0px 0px"><circle r="92" fill="#665441" stroke="#b9a681" stroke-width="8"/><circle r="73" fill="#364e50"/><path stroke="#a1845d" stroke-width="9" d="${spokes}"/><circle r="15" fill="#c1ab7b"/></g><path fill="none" stroke="#b9d9ce" opacity=".75" stroke-width="4" d="M-84 70q-10 38-28 54M80 80q9 17 22 26"/></g>`;
  };
  const mill = (x, y, k, side) => {
    const b = brick(1050), roof = U(); let win = '';
    for (let row = 0; row < 3; row++) for (let i = 0; i < 7; i++) win += sash(-272 + i * 80, -235 + row * 78, 31, 46);
    return `${b.defs}<defs>${linU(roof, [[0, '#706455'], [1, '#443e37']], 0, -370, 0, -270)}</defs><g transform="translate(${x} ${y}) scale(${k})"><path fill="${b.fill}" d="M-310 0V-275h620V0z"/><path fill="#754e3c" d="M310 0V-275l115 45V0z"/><path fill="url(#${roof})" d="M-330-275l89-110h440l131 110z"/><path fill="#534c42" d="M199-385l131 110 104 45-68-122z"/>${win}<path fill="#d7c5a0" d="M-320 0h756v12h-756z"/><path fill="#805742" d="M-145-360v-73h31v73zM142-360v-70h31v70z"/><path fill="#d5c7a9" d="M-35-276v-66h70v66z"/><path fill="#5d5548" d="M-46-340l46-45 46 45z"/><circle cy="-308" r="17" fill="#ddd5ba"/><path stroke="#5e6257" stroke-width="3" d="M0-308v-10M0-308l10 5"/><path fill="#41635e" d="M-30 0v-65h60V0z"/>${side ? wheel(355, -17, .78) : ''}</g>`;
  };
  const garden = (seed, autumn) => `${oak(340, 784, .95, autumn ? '#595a3a' : '#3c5d40', autumn ? '#8f834b' : '#708f54', autumn ? '#c0a267' : '#a1b870', seed)}<path fill="#6b8d5e" d="M-160 900V805q270-70 630 0L590 900z"/>${meadow(seed + 1, 25, -80, 510, 835, 890, autumn ? ['#d3bb82', '#e3d1ad'] : ['#dfb68f', '#e9d8b0', '#c58b91'])}`;
  views('whitchurch-mill', 'Whitchurch Silk Mill', 'Whitchurch', 'Whitchurch', 'heritage', 'red', ['silk mill', 'river test', 'waterwheel'], [
    ['frog-island', 'the Georgian mill on Frog Island', () => `<path fill="#71926b" d="M270 718q590-85 1100 0v37H270z"/>${mill(780, 732, 1.05, true)}${garden(1071, false)}`, { water: true, y: 721 }],
    ['waterwheel', 'the turning wheel beside the Test', () => `${mill(575, 733, 1.23, false)}${wheel(1090, 730, 1.6)}<path fill="#8c9477" d="M1250 900V737h510v163z"/>${grass(1082, 28, 1250, 1760, 865, 76, '#66824d')}${shimmer(1083, 20, 910, 1270, 831, 884, '#edf0d5', 54)}`, { water: true, y: 745 }],
    ['garden', 'the mill garden and a clear-water channel', () => `${mill(975, 692, .65, true)}<path fill="#83a775" d="M-160 900V750q710-95 1160-14l-60 49q-580-59-760 115z"/>${garden(1094, true)}${mv('ukbob', { ad: '5s', dy: '3px' }, '<path fill="#e1e5d1" d="M730 813q30-22 60 0l-9 11h-43z"/>')}<path fill="none" stroke="#cfdfd0" stroke-width="3" d="M686 828q65 13 136 0"/>`, { water: true, autumn: true, y: 716 }],
    ['reflection', 'lit mill windows across the evening river', () => { const id = U(); return `<path fill="#71836b" d="M250 703h1140v30H250z"/><g id="${id}">${mill(800, 720, .93, true)}</g>${reflect(id, 737, .24)}${garden(1106, false)}${shimmer(1107, 24, 580, 1170, 775, 883, '#e1cca7', 54)}`; }, { water: true, time: 'dusk', y: 725 }],
  ]);
}
