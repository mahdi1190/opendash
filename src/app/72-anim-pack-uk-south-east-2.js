// UK_SCENE_PART: uk-south-east/hampshire-towns
/* Hampshire town views. Pure builder, called by the base pack with its toolkit.
   (Buckler's Hard and Hurst Castle moved to the composed New Forest pack, uk-area-newforest.)
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
  const { add, U, R, rnd, mv, linU, grass, meadow, oak, lit, reflect, shimmer, vista } = T;
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
