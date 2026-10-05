// UK_SCENE_PART: uk-south-east/kent-towns
/* Kent place studies. Pure builder; registered by the South East pack.
   Research plan, 24 places (four considered views each, never a signature):
   Dover Castle â€” Great Tower, Roman pharos and layered hilltop defences.
   Deal Castle â€” the low, concentric, round Tudor artillery bastions.
   Walmer Castle â€” round bastions contrast with its formal and productive gardens.
   Rochester Castle â€” the tall ragstone keep above the Medway, including its round rebuilt corner.
   Rochester Cathedral â€” the Romanesque west front and long cathedral precinct.
   Ightham Mote â€” the moated quadrangular manor and timber courtyard.
   Knole â€” clustered stone courts and an ancient deer park.
   Hever Castle â€” its gatehouse, moat, Italian garden and lake.
   Penshurst Place â€” the medieval hall and compartmented gardens.
   Scotney Castle â€” the ruined round tower and island garden below the new house.
   Sissinghurst Castle Garden â€” brick tower, White Garden and enclosed garden rooms.
   Lullingstone Roman Villa â€” conserved villa remains and the Darent valley.
   Lullingstone Castle â€” Tudor gatehouse and lake beside the World Garden.
   Richborough Roman Fort â€” monumental flint walls and surviving gateway remains.
   Reculver Towers â€” twin church towers overlooking the eroding coastal headland.
   St Augustine's Abbey â€” roofless abbey remains and the great gate at Canterbury.
   Whitstable Harbour â€” active fishing quays, huts and timber boats.
   Faversham Standard Quay â€” creek, barges and working maritime warehouses.
   Ramsgate Royal Harbour â€” enclosing stone piers and Georgian harbour frontage.
   Margate Harbour Arm â€” its curved stone pier and lighthouse.
   Folkestone Harbour Arm â€” the lighthouse, sea-facing pier and railway promenade.
   Dungeness Old Lighthouse â€” black tower, shingle, fishing boats and huge skies.
   Chiddingstone Castle â€” nineteenth-century castle frontage and landscaped lake.
   Tonbridge Castle â€” paired round gatehouse towers and the Medway setting.
   Sources are the custodians' pages, consulted before drawing. The first
   sixteen studies below form an independently reviewable architectural batch:
   https://www.english-heritage.org.uk/visit/places/dover-castle/
   https://www.english-heritage.org.uk/visit/places/deal-castle/
   https://www.english-heritage.org.uk/visit/places/walmer-castle-and-gardens/
   https://www.english-heritage.org.uk/visit/places/rochester-castle/
   Remaining planned subjects are deliberately not registered until drawn
   and individually researched. Town clusters use ukTowns(); locality names
   record the actual site rather than pretending every village is a town. */
function ukSouthEastPart3(T) {
  const { add, U, R, rnd, mv, full, ridge, canopy, linU, radU, cloud,
    streak, rays, haze, finish, birds, shimmer, stars, sun, grass,
    meadow, oak, lit, reflect, arch, sail, boat, placeAtmosphere } = T;

  /** Masonry is shaded across each wall, with staggered mortar courses.
      A fresh pattern and a fresh gradient belong to every render. */
  const masonry = (colour = '#c8bba0', shade = '#8f887a', brick = false) => {
    const g = U(), p = U(), w = brick ? 36 : 64, h = brick ? 18 : 28;
    return { fill: `url(#${p})`, shade,
      defs: `<defs>${linU(g, [[0, colour], [.55, colour], [1, shade]], 320, 200, 1260, 760)}<pattern id="${p}" patternUnits="userSpaceOnUse" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${colour}"/><path fill="none" stroke="${shade}" stroke-width="1" opacity=".28" d="M0 0H${w}M0 ${h / 2}H${w}M0 ${h}H${w}M${w / 2} 0v${h / 2}M${w / 4} ${h / 2}v${h / 2}M${3 * w / 4} ${h / 2}v${h / 2}"/><rect width="${w}" height="${h}" fill="url(#${g})" opacity=".35"/></pattern></defs>` };
  };
  const course = (x, y, w, rows, gap, col = '#8e846c') => {
    let d = ''; for (let i = 0; i < rows; i++) d += `M${x} ${y + i * gap}h${w}`;
    return `<path fill="none" stroke="${col}" stroke-width="2" opacity=".24" d="${d}"/>`;
  };
  const merlons = (x, y, w, c, step = 28) => {
    let d = `M${x} ${y + 15}V${y}`;
    for (let i = 0; i < w; i += step) d += `h${step / 2}v-15h${step / 2}v15`;
    return `<path fill="${c}" d="${d}V${y + 15}z"/>`;
  };
  const slit = (x, y, h) => `<path stroke="#434d50" stroke-width="7" d="M${x} ${y}v${h}"/><path stroke="#e9dec5" stroke-width="2" d="M${x - 6} ${y - 2}v${h + 4}"/>`;
  const roundWindow = (x, y, w, h) => `<path fill="#3b4b55" d="M${x} ${y + h}V${y + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0V${y + h}z"/>${lit(x + 3, y + w / 2, w - 6, h - w / 2)}<path stroke="#e0d5bc" stroke-width="3" d="M${x + w / 2} ${y + 5}v${h - 5}"/>`;
  const cobbles = (seed, y, col) => {
    const r = rnd(seed); let d = '';
    for (let i = 0; i < 70; i++) { const yy = y + r() * (900 - y), k = (yy - y) / (900 - y); d += `M${R(-160 + r() * 1920)} ${R(yy)}h${R(8 + k * 28)}`; }
    return `<path fill="none" stroke="${col}" stroke-width="3" opacity=".34" stroke-linecap="round" d="${d}"/>`;
  };
  const petals = (seed, col, y = 680) => {
    const r = rnd(seed); let o = '';
    for (let i = 0; i < 5; i++) { const x = R(200 + r() * 1200), yy = R(y - r() * 190); o += mv('ukfall', { ad: `${9 + i}s`, d: `-${i * 2}s`, dx: `${i % 2 ? -90 : 70}px` }, `<ellipse cx="${x}" cy="${yy}" rx="7" ry="4" fill="${col}"/>`); }
    return o;
  };
  const flowers = (seed, x0, x1, y, c, k = 1) => {
    const r = rnd(seed); let body = '', heads = '';
    for (let x = x0; x < x1; x += 40 * k) {
      const h = R((36 + r() * 52) * k), w = R(50 * k);
      body += `<path fill="${x % 3 ? '#436647' : '#527751'}" d="M${R(x)} ${y}q${R(w / 4)} ${-h} ${w / 2} ${-h / 2}q${w / 2} ${-h / 2} ${w} ${h / 2}z"/>`;
      for (let j = 0; j < 4; j++) heads += `<circle cx="${R(x + r() * w)}" cy="${R(y - 15 * k - r() * h * .65)}" r="${R(4 * k)}" fill="${c[j % c.length]}"/>`;
    }
    return mv('uksway', { ad: '5.6s', to: '800px 900px' }, body + heads);
  };
  /** View-specific skies and ground plans, with the same shared motion grammar.
      Far and near bands extend 160 units beyond both viewport edges. */
  const frame = (seed, setting, draw, near = () => '') => {
    const sky = U(), ground = U(), sea = U(), wash = U();
    const warm = setting.time === 'dusk', winter = setting.winter;
    const horizon = setting.horizon || 620, coast = setting.coast;
    const atmosphere = placeAtmosphere('kent-castle',seed,Object.assign({},setting,{y:horizon}));
    const light = atmosphere.sun;
    const p = { warm, winter, ground, sea };
    return `<defs>${linU(sky, atmosphere.sky, 0, 0, 0, 900)}${linU(ground, [[0, winter ? '#afb7a3' : '#83b96b'], [1, winter ? '#556b64' : '#24654b']], 0, horizon, 0, 900)}${linU(sea, [[0, warm ? '#d4a3be' : '#74d1dc'], [1, warm ? '#445d76' : '#267d9c']], 0, horizon - 50, 0, 900)}${radU(wash, [[0, '#fff3cb', .2], [1, '#fff3cb', 0]],light[0],light[1],900)}</defs>`
      + full(`url(#${sky})`) + sun(...light, '#fff5dd', '#ffdfac')
      + (atmosphere.rays ? rays(light[0],light[1],920,'#fff2cc',.12) : '') + stars(seed,30,280) + atmosphere.air()
      + mv('ukpar', { ad: '43s', dx: '7px' }, coast ? `<rect x="-160" y="${horizon - 70}" width="1920" height="${970 - horizon}" fill="url(#${sea})"/>${haze(horizon - 90, 80, '#f5e6d1', .45)}` : ridge(warm ? '#a397a7' : '#a8c1b4', horizon - 60, 65, 7, seed) + haze(horizon - 110, 140, '#edeada', .46))
      + mv('ukpar', { ad: '37s', dx: '14px' }, coast ? `<path fill="#697f8c" opacity=".7" d="M1410 ${horizon - 65}h70l-12 9h-44zM1440 ${horizon - 65}v-10h18v10z"/>` : canopy(winter ? '#7e9288' : '#68856d', horizon - 7, 24, seed + 1, null, null, 900, '#9fb89c'))
      + `<path fill="url(#${ground})" d="M-160 ${horizon}H1760V900H-160z"/>`
      + mv('ukpar', { ad: '32s', dx: '22px' }, draw(p))
      + atmosphere.life()
      + mv('ukpar', { ad: '27s', dx: '35px' }, near(p))
      + `<rect width="1600" height="900" fill="url(#${wash})"/>` + finish();
  };
  const register = (place, town, locality, label, views, colour, tags) => {
    for (const v of views) add('kent', v.kind || 'landmark', { id: `${place}-${v.id}`, label: v.label || label,
      site: `${v.site || label}, ${locality}`, colour, tags, ukPlace: place, ukTown: town, ukLocality: locality,
      ukView: v.id, viewReason: v.reason, mood: v.mood || 'calm', svg: v.svg });
  };

  /* Dover Castle: the keep is a massive square Norman tower with projecting
     corners and an east forebuilding, not a generic conical fairy-tale castle.
     These four studies change the subject and the ground plan. */
  const doverKeep = (x, y, k, stone) => {
    let win = '';
    for (const yy of [-280, -170]) for (const xx of [60, 166, 270]) win += roundWindow(xx, yy, 28, 52);
    return `<g transform="translate(${x} ${y}) scale(${k})"><path fill="${stone.fill}" d="M0 0V-355h330V0z"/><path fill="${stone.shade}" d="M330-355l92 30V0h-92z"/><path fill="#887f6a" opacity=".3" d="M0-355H330v20H0z"/>${merlons(-4, -355, 336, stone.fill)}${merlons(330, -326, 92, stone.shade, 30)}${course(0, -320, 330, 11, 27)}${win}`
      + `<path fill="${stone.fill}" d="M-20 0V-378h36V0zM306 0V-378h36V0zM392 0V-344h32V0z"/>${merlons(-20, -378, 40, stone.fill, 20)}${merlons(306, -378, 40, stone.fill, 20)}${slit(323, -300, 38)}${slit(323, -180, 38)}${slit(405, -245, 30)}`
      + `<path fill="${stone.fill}" d="M88 0V-120h164V0zM180-120V-238h72v118z"/><path fill="${stone.shade}" d="M252-238h28V0h-28z"/>${roundWindow(201, -206, 24, 41)}<path fill="#43504f" d="M116 0v-60q25-40 50 0V0z"/><path fill="#aca48d" d="M96 0h86l-8 9H84z"/>${course(90, -94, 160, 4, 24)}</g>`;
  };
  const pharos = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})"><path fill="#b0a58e" d="M-60 0l12-250 73-13 50 35L58 0z"/><path fill="#807e71" d="M25-263l50 35L58 0H15z"/><path fill="#a36b52" d="M-50-210l78-12 44 25-1 13-44-25-78 12zM-54-149l78-11 44 21-1 13-43-20-79 10zM-56-84l77-9 43 17-1 13-43-16-77 8z"/><path fill="#4e5552" d="M-20-200v34h25v-36zM-27-124v34h23v-35zM-30 0v-52q14-22 28 0V0z"/><path fill="#d2c5a6" d="M-48-250l73-13 50 35-7 13-47-33-65 12z"/></g>`;
  register('dover-castle', 'Dover', 'Dover', 'Dover Castle', [
    { id: 'inner-bailey', reason: 'The Great Tower fills the view beyond an open inner bailey, with the forebuilding and corner buttresses clearly legible.', svg: () => frame(3101, { horizon: 710 }, () => {
      const st = masonry(); return st.defs + `<path fill="#8f8e78" d="M180 715V582h120v133zM1140 715V566h240v149z"/>${merlons(180, 582, 120, '#b7b097')}${merlons(1140, 566, 240, '#b7b097')}` + doverKeep(470, 710, 1.13, st) + `<path fill="#d4c7ac" d="M470 710h470l270 190H210z"/>${cobbles(3102, 728, '#9c9278')}`;
    }, () => grass(3103, 50, -160, 1760, 900, 33, '#365d39') + meadow(3104, 16, -80, 360, 860, 900, ['#ebd7ad', '#f1ead4'])) },
    { id: 'roman-pharos', label: 'The Roman lighthouse at Dover Castle', reason: 'The octagonal Roman pharos and neighbouring church become the main subjects, with the Great Tower distant beyond the churchyard.', kind: 'heritage', svg: () => frame(3111, { horizon: 738 }, () => {
      const st = masonry('#c1b8a2', '#8a8979'); return st.defs + doverKeep(980, 616, .43, st) + `<path fill="#84986b" d="M-160 730Q640 590 1760 706V900H-160z"/><path fill="${st.fill}" d="M340 735V490h280v245zM490 490V382h88v108z"/><path fill="#747879" d="M325 494l152-98 159 98zM480 382l52-65 56 65z"/>${roundWindow(378, 525, 46, 90)}${roundWindow(480, 527, 46, 88)}${roundWindow(543, 413, 18, 43)}${pharos(790, 738, 1.2)}<path fill="#d2c5a7" d="M710 900Q650 824 734 742h56Q728 824 882 900z"/>`;
    }, () => grass(3112, 70, -160, 1760, 900, 54, '#496b40') + flowers(3113, 90, 550, 874, ['#fff8da', '#d8cf8d'])) },
    { id: 'channel-ramparts', label: 'Dover Castle above the Channel', reason: 'A long rampart recedes toward the smaller keep while Channel shipping, chalk slopes and foreground defensive earthworks establish its hilltop setting.', svg: () => frame(3121, { coast: true, horizon: 660, time: 'dusk' }, () => {
      const st = masonry('#d9c7a3', '#9a8a74'); return st.defs + `<path fill="#8d9572" d="M-160 670Q380 456 790 530Q1060 508 1760 742V900H-160z"/>` + doverKeep(520, 574, .7, st) + `<path fill="${st.fill}" d="M220 750L1110 605V540L220 650z"/><path fill="${st.shade}" d="M220 750l20 22 888-150-18-17z"/><path stroke="#f2dcba" stroke-width="5" d="M220 650L1110 540"/>${[0, 1, 2, 3, 4, 5].map(i => `<path fill="${st.fill}" d="M${260 + i * 135} ${642 - i * 17}v-26l34-5v27z"/>`).join('')}${shimmer(3122, 22, 1240, 1740, 650, 830, '#ffe1c1', 38)}${sail(1350, 743, .3, 4)}`;
    }, () => ridge('#566848', 890, 44, 5, 3124) + grass(3125, 60, -160, 1760, 900, 65, '#40553b')) },
    { id: 'winter-approach', label: 'Dover Castle in winter', reason: 'A winding uphill approach passes leafless trees and textured earthworks, with the keep seen across the outer defences rather than over the bailey.', svg: () => frame(3131, { winter: true, horizon: 710 }, () => {
      const st = masonry('#cbc6b5', '#989a8d'); return st.defs + `<path fill="#a0ac91" d="M-160 738Q420 622 1100 646Q1460 658 1760 734V900H-160z"/>` + doverKeep(725, 660, .79, st) + `<path fill="${st.fill}" d="M470 748V620h82v128zM630 700V600h77v100zM1120 694V582h70v112z"/>${merlons(470, 620, 84, st.fill)}${merlons(630, 600, 78, st.fill)}<path fill="#d5d0bc" d="M470 900Q850 760 678 698L744 690Q924 760 740 900z"/><path fill="#4c5148" opacity=".15" d="M470 748l74-10 144 27-40 12z"/>`;
    }, () => `<path fill="none" stroke="#4c584f" stroke-width="13" stroke-linecap="round" d="M160 900Q190 680 142 534M170 737l-76-82M176 682l94-110M1440 900q-40-210 24-331M1432 734l-74-120M1450 668l72-84"/>${mv('uksway2', { ad: '8s' }, '<path fill="none" stroke="#667068" stroke-width="5" d="M94 655l-24-70M94 655l-58-34M270 572l8-70M270 572l55-32M1358 614l-58-53M1522 584l64-57"/>')}${grass(3133, 55, -160, 1760, 900, 44, '#65715e')}${petals(3134, '#c7ab72')}`) },
  ], 'slate', ['dover', 'norman keep', 'roman pharos', 'channel']);

  /* Deal Castle: six rounded inner bastions surround the keep; the seaward
     front is low and thick. No towers, pointed roofs or invented pennants. */
  const dealFort = (x, y, k, st) => {
    const bastion = (xx, yy, w, h, shade) => `<path fill="${shade ? st.shade : st.fill}" d="M${xx} ${yy}v-${h}q${w / 2}-${R(w * .23)} ${w} 0v${h}z"/><path fill="#e0d6ba" d="M${xx} ${yy - h}q${w / 2}-${R(w * .23)} ${w} 0v9q-${w / 2}-${R(w * .2)}-${w} 0z"/>${course(xx + 7, yy - h + 32, w - 14, 4, 23)}${[.25, .5, .75].map(a => `<path fill="#46514f" d="M${xx + w * a - 5} ${yy - 55}h10v13h-10z"/>`).join('')}`;
    return `<g transform="translate(${x} ${y}) scale(${k})">${bastion(-130, -76, 260, 130, true)}${bastion(210, -76, 230, 120, true)}<path fill="${st.fill}" d="M-45 0V-254q160-90 320 0V0z"/><path fill="#dbd0b6" d="M-45-254q160-90 320 0v12q-160-84-320 0z"/>${roundWindow(18, -226, 26, 42)}${roundWindow(102, -248, 26, 42)}${roundWindow(190, -226, 26, 42)}${bastion(-250, 0, 270, 138, false)}${bastion(245, 0, 250, 138, true)}${bastion(-20, 26, 280, 150, false)}<path fill="#555a52" d="M-5 26V-26q20-28 40 0V26z"/><path fill="#b9af91" d="M-270 28q380 94 780 0v22q-390 108-780 0z"/></g>`;
  };
  register('deal-castle', 'Deal', 'Deal', 'Deal Castle', [
    { id: 'sea-front', reason: 'The wide curved artillery walls face the sea beyond a textured shingle beach, with fishing boats drawn up below the fort.', svg: () => frame(3201, { coast: true, horizon: 660 }, () => {
      const st = masonry('#c8c4aa', '#9b9e8c'); return st.defs + `<path fill="#a2b9b0" d="M-160 670H1760v70H-160z"/><path fill="#c5bba0" d="M-160 700Q700 650 1760 730V900H-160z"/>${dealFort(620, 698, 1.05, st)}${shimmer(3202, 28, 1320, 1740, 633, 702, '#e8f8f4', 29)}`;
    }, () => `<path fill="#ad9f88" d="M-160 836q900-50 1920 34v30H-160z"/>${cobbles(3204, 775, '#786f5d')}${boat(385, 830, .6, '#486b75')}${grass(3205, 24, -160, 280, 900, 46, '#7c875d')}`) },
    { id: 'dry-moat', reason: 'A low eye-level view across the dry moat emphasises the broad front bastion, overhanging parapet and circular keep rising behind it.', svg: () => frame(3211, { horizon: 730 }, () => {
      const st = masonry('#c9c3a9', '#929484'); return st.defs + `<path fill="#748a65" d="M-160 712H1760v188H-160z"/>${dealFort(620, 707, 1.35, st)}<path fill="#6b795d" d="M-160 900V762q420 100 890 40t1030-20v118z"/><path fill="#a5b37d" d="M-160 736q440 92 860 52t1060-35v31q-660 28-1080 52t-840-60z"/><path fill="#d9d0b2" d="M380 748l170 35 45-10-188-38z"/>`;
    }, () => grass(3212, 75, -160, 1760, 900, 65, '#425f3e') + meadow(3213, 24, -160, 1760, 840, 900, ['#e8d478', '#f4efe0'])) },
    { id: 'courtyard', reason: 'The circular inner courtyard is shown close, with curved walls, deep gun embrasures and the open sky above the inner parapets.', kind: 'heritage', svg: () => frame(3221, { horizon: 760 }, () => {
      const st = masonry('#d8ceb4', '#9e9682'); let openings = '';
      for (let i = 0; i < 7; i++) { const xx = 295 + i * 142, yy = 493 - Math.sin(i / 6 * Math.PI) * 55; openings += `<path fill="#8b8470" d="M${xx} ${R(yy + 75)}v-70q35-25 70 0v70z"/><path fill="#36413e" d="M${xx + 18} ${R(yy + 58)}v-37q17-12 34 0v37z"/>`; }
      return st.defs + `<path fill="${st.fill}" d="M180 770V466Q800 255 1420 466V770z"/><path fill="#f0e4c8" d="M180 466Q800 255 1420 466v14Q800 270 180 480z"/>${openings}<path fill="#bdb196" d="M180 760Q800 645 1420 760L1760 900H-160z"/>${cobbles(3222, 740, '#857a63')}<path fill="${st.fill}" d="M520 752V534q122-80 244 0v180z"/><path fill="#9e977f" d="M764 534l-44 25v174l44-19z"/><path fill="#485044" d="M586 732V603q38-51 76 0v125z"/>${course(535, 565, 210, 5, 27)}`;
    }, () => `<path fill="#776f5d" d="M-160 894H1760v6H-160z"/>${grass(3223, 18, -160, 350, 900, 30, '#687959')}${petals(3224, '#c2a670', 600)}`) },
    { id: 'beach-evening', reason: 'The fort recedes behind the beach while larger foreground shingle, a hauled-up boat and a small passing sailboat carry the evening coastal activity.', svg: () => frame(3231, { coast: true, horizon: 625, time: 'dusk' }, () => {
      const st = masonry('#cebca2', '#9f9785'); return st.defs + `<path fill="#aa9e87" d="M-160 900V711Q430 636 1200 702L1760 900z"/>${dealFort(445, 699, .68, st)}<path fill="#c7b49a" d="M-160 803Q650 748 1200 806L1760 900H-160z"/>${sail(1300, 682, .37, 8)}${shimmer(3232, 32, 1200, 1760, 633, 803, '#ffe3bb', 36)}`;
    }, () => `${boat(840, 840, 1.02, '#495c62')}<path stroke="#6a5d47" stroke-width="5" d="M895 816l230-68M925 840l280-75"/>${cobbles(3234, 818, '#7f6d58')}${grass(3235, 25, -160, 300, 900, 46, '#68735b')}`) },
  ], 'teal', ['deal', 'tudor bastions', 'shingle', 'coast']);

  /* Walmer: the garden studies use the real long reflecting pool, Broadwalk
     and kitchen garden. The pool is a formal feature, not an invented moat. */
  const walmer = (x, y, k, st) => `<g transform="translate(${x} ${y}) scale(${k})"><path fill="${st.fill}" d="M-260 0V-160q120-65 240 0V0zM180 0V-160q120-65 240 0V0z"/><path fill="${st.shade}" d="M180 0V-160q120-65 240 0v24q-115-45-210 0V0z"/><path fill="${st.fill}" d="M-38 0V-268q120-48 240 0V0z"/><path fill="#6b6c66" d="M-55-269q138-78 273 0z"/><path fill="${st.fill}" d="M-25-263q105-44 215 0v18q-105-40-215 0z"/>${[[-175, -137], [-95, -145], [20, -230], [105, -230], [258, -145], [338, -137]].map(([xx, yy]) => roundWindow(xx, yy, 27, 43)).join('')}<path fill="#5a6458" d="M34 0V-88q35-42 70 0V0z"/>${course(-255, -120, 225, 4, 25)}${course(205, -120, 200, 4, 25)}<path fill="#ded4b8" d="M-275 0q350 50 710 0v16q-360 60-710 0z"/></g>`;
  register('walmer-castle', 'Deal', 'Walmer', 'Walmer Castle and Gardens', [
    { id: 'castle-lawns', reason: 'The low round bastions and domestic roof are viewed above striped lawns, with flower borders rather than medieval battlements dominating the approach.', svg: () => frame(3301, { horizon: 704 }, () => {
      const st = masonry('#c5c3ac', '#929885'); return st.defs + walmer(735, 701, 1.21, st) + `<path fill="#779661" d="M-160 715H1760v185H-160z"/>${[0, 1, 2, 3, 4, 5].map(i => `<path fill="#acc386" opacity=".25" d="M${-300 + i * 370} 900l250-185h95l-160 185z"/>`).join('')}<path fill="#dfd4b7" d="M620 900l126-193h80l118 193z"/>`;
    }, () => flowers(3302, -160, 540, 860, ['#f2e4c6', '#dda777', '#bcc68c'], 1.25) + flowers(3303, 1090, 1760, 860, ['#ddd8b8', '#c6b4d3', '#f0d6aa'], 1.25) + grass(3304, 48, -160, 1760, 900, 33, '#4e744c')) },
    { id: 'reflecting-pool', label: 'The reflecting pool at Walmer Castle', reason: 'A long narrow pool recedes between clipped hedges, with a distant pergola and near pool-edge planting giving the garden its formal perspective.', kind: 'landscape', svg: () => frame(3311, { horizon: 605 }, () => {
      const id = U(); return `<path fill="#49654b" d="M-160 900V595Q280 490 606 599L400 900zM1200 900l-220-301q270-110 780-5v306z"/><path fill="#7f9965" d="M-160 605Q280 490 606 599l-15 22Q280 523-160 635zM980 599q270-110 780-5v31q-495-105-765-4z"/><path fill="#dad1b9" d="M400 900l206-295h374l220 295z"/><path fill="url(#${id})" d="M475 900l175-265h286l188 265z"/><defs>${linU(id, [[0, '#a8c1b1'], [1, '#335e63']], 0, 630, 0, 900)}</defs>${shimmer(3312, 35, 655, 950, 653, 890, '#e3eee1', 38)}<path fill="#ada186" d="M604 616v-128h14v128zM746 616v-128h14v128zM885 616v-128h14v128zM1004 616v-128h14v128zM585 486h450v16H585z"/>${mv('uksway2', { ad: '7s' }, '<path fill="none" stroke="#59794c" stroke-width="16" stroke-linecap="round" d="M598 490q220-55 437 0M604 611q25-90 7-121M1010 611q-24-90 0-121"/>')}`;
    }, () => flowers(3313, -160, 430, 874, ['#fff4d5', '#e5d7b5'], 1.3) + flowers(3314, 1230, 1760, 874, ['#fff1d3', '#d8cdb6'], 1.3) + `<path fill="#b5ad95" d="M428 900l23-18h688l28 18z"/>`) },
    { id: 'broadwalk', label: 'The Broadwalk at Walmer Castle', reason: 'The long grass walk converges on the castle between deep mixed borders; close flowers and an old tree make the view garden-led.', kind: 'landscape', svg: () => frame(3321, { horizon: 625 }, () => {
      const st = masonry(); return st.defs + walmer(770, 617, .49, st) + `<path fill="#71935c" d="M600 900l136-272h91l160 272z"/><path fill="#b1c88c" opacity=".3" d="M680 900l76-272h26l84 272z"/><path fill="#3b654a" d="M-160 900V677l890-40-142 263zM989 900L840 637l920 40v223z"/>${flowers(3322, 290, 720, 715, ['#e6d899', '#ceb5d7', '#cda89c'], .6)}${flowers(3323, 868, 1320, 715, ['#d6bbd9', '#eee4ba', '#ab86bb'], .6)}${oak(1380, 742, .8, '#355440', '#4c7554', '#81a072', 3324)}`;
    }, () => flowers(3325, -160, 620, 900, ['#e8d89a', '#c9b3d8', '#e2cab3'], 1.6) + flowers(3326, 1000, 1760, 900, ['#d2b2d6', '#eadcc0', '#b5a0c8'], 1.6)) },
    { id: 'kitchen-garden', label: 'Walmer Castle kitchen garden', reason: 'Vegetable beds, brick walls and espalier branches carry the view, while the castle only appears over the productive garden at late afternoon.', kind: 'heritage', svg: () => frame(3331, { horizon: 650, time: 'dusk' }, () => {
      const st = masonry('#b9b7a1', '#8b907a'), brick = masonry('#a77358', '#765742', true); let rows = '';
      for (let i = 0; i < 5; i++) { const y = 734 + i * 28; rows += `<path stroke="#96a96b" stroke-width="${8 + i * 2}" stroke-linecap="round" stroke-dasharray="3 ${18 + i * 6}" d="M${315 - i * 35} ${y}H${1180 + i * 48}"/>`; }
      return st.defs + brick.defs + walmer(1050, 610, .49, st) + `<path fill="${brick.fill}" d="M-160 697V549H1760V697z"/><path fill="#c6b793" d="M-160 548H1760v15H-160z"/><path fill="#36513c" d="M730 697v-75q50-60 100 0v75z"/><path fill="#7e6950" d="M310 710h882l220 190H120z"/>${rows}<path stroke="#cab68e" stroke-width="12" d="M830 710l205 190M312 710L120 900M1190 710l220 190"/>${mv('uksway2', { ad: '7s' }, '<path fill="none" stroke="#4c593c" stroke-width="5" d="M175 696V579M175 650l-100-28M175 627l105-29M1270 696V579M1270 650l-100-28M1270 627l105-29"/>')}`;
    }, () => grass(3332, 36, -160, 1760, 900, 38, '#516b42') + meadow(3333, 16, -100, 210, 825, 900, ['#e8dba7', '#b9a9cc']) + petals(3334, '#deb88a')) },
  ], 'green', ['walmer', 'castle gardens', 'bastions', 'garden']);

  /* Rochester Castle has three square corner turrets and one round rebuilt
     corner. The roofless keep's broken window openings remain dark at night. */
  const rochesterKeep = (x, y, k, st, litWindows = false) => {
    let openings = '';
    for (let row = 0; row < 3; row++) for (let i = 0; i < 3; i++) {
      const xx = 48 + i * 82, yy = -334 + row * 91;
      openings += `<path fill="#414e4c" d="M${xx} ${yy + 43}V${yy + 15}q13-30 26 0v28z"/>` + (litWindows ? lit(xx + 3, yy + 16, 20, 27) : '');
    }
    return `<g transform="translate(${x} ${y}) scale(${k})"><path fill="${st.fill}" d="M0 0V-423h286V0z"/><path fill="${st.shade}" d="M286-423l109 32V0H286z"/>${course(6, -391, 277, 14, 27)}${openings}${merlons(0, -423, 286, st.fill)}<path fill="${st.fill}" d="M-20 0V-469h55V0zM254 0V-469h56V0z"/>${merlons(-20, -469, 56, st.fill)}${merlons(254, -469, 56, st.fill)}${slit(6, -387, 41)}${slit(279, -387, 41)}<path fill="${st.shade}" d="M352 0V-416q30-25 60 0V0z"/><path fill="#c4bca5" d="M350-416q32-28 64 0v14q-32-24-64 0z"/>${slit(382, -329, 32)}${slit(381, -228, 32)}<path fill="#35453f" d="M116 0v-81q28-36 56 0V0z"/><path fill="${st.fill}" d="M38 0V-196h67V0z"/>${roundWindow(58, -161, 26, 40)}</g>`;
  };
  register('rochester-castle', 'Rochester', 'Rochester', 'Rochester Castle', [
    { id: 'medway-keep', reason: 'The tall Norman keep rises over a bend in the Medway; the square front turrets and rebuilt round corner are distinct above passing small craft.', svg: () => frame(3401, { horizon: 688 }, () => {
      const st = masonry('#bdbda7', '#7f8a80'); const id = U(), water = U(); return st.defs + `<path fill="#64846a" d="M-160 687Q550 600 1760 670V900H-160z"/><g id="${id}">${rochesterKeep(693, 665, .98, st)}<path fill="${st.fill}" d="M490 698V581l75-24v141zM1110 688V546h126v142z"/>${merlons(1110, 546, 126, st.fill)}</g><path fill="url(#${water})" d="M-160 750Q760 648 1760 771V900H-160z"/><defs>${linU(water, [[0, '#9bbdb2'], [1, '#355d6d']], 0, 710, 0, 900)}</defs>${reflect(id, 708, .14)}${shimmer(3402, 35, -160, 1760, 765, 900, '#dfefe3', 39)}${mv('ukbob', { ad: '4.6s', dy: '3px' }, boat(428, 804, .51, '#486b75'))}`;
    }, () => grass(3403, 38, -160, 350, 900, 79, '#475f42') + grass(3404, 35, 1280, 1760, 900, 61, '#36593c')) },
    { id: 'castle-gardens', reason: 'The keep is framed by trees from the castle gardens, with a curving path, lawn shadows and a closer study of its great height.', svg: () => frame(3411, { horizon: 744 }, () => {
      const st = masonry('#c5c6af', '#849080'); return st.defs + rochesterKeep(615, 745, 1.22, st) + `<path fill="#77935f" d="M-160 745H1760v155H-160z"/><path fill="#dbd1b5" d="M710 900q380-93 510-160h-75q-100 87-740 160z"/><path fill="#324737" opacity=".13" d="M590 748h550l170 88H650z"/>${oak(190, 850, .91, '#36543d', '#527451', '#8aa471', 3412)}`;
    }, () => grass(3413, 68, -160, 1760, 900, 32, '#4c6c43') + flowers(3414, 1340, 1760, 900, ['#eadbc0', '#bcc19e'], 1.15) + petals(3415, '#d6b072')) },
    { id: 'open-keep', label: 'Inside Rochester Castle keep', reason: 'A roofless interior looks upward past surviving wall arcades and lost floor levels, with sky visible over the central masonry spine.', kind: 'heritage', svg: () => frame(3421, { horizon: 780 }, () => {
      const st = masonry('#b9b8a1', '#7c8477'); let left = '', right = '';
      for (let row = 0; row < 3; row++) for (let i = 0; i < 3; i++) {
        const yy = 240 + row * 140; left += roundWindow(255 + i * 84, yy, 38, 92); right += roundWindow(1075 + i * 84, yy, 38, 92);
      }
      return st.defs + `<path fill="${st.fill}" d="M180 900V170l425 106V900zM995 900V276l425-106V900z"/><path fill="${st.shade}" d="M535 900V262l70 14V900zM995 900V276l70-14V900z"/>${left}${right}<path fill="${st.fill}" d="M675 808V486l56-38h133l55 38v322z"/><path fill="#37493f" d="M737 808V607q62-90 124 0v201z"/><path fill="#dfd7be" d="M683 486h224v16H683z"/><path stroke="#706f5f" stroke-width="8" d="M190 414l404 98M190 605l404 56M1006 512l400-98M1006 661l400-56"/><path fill="#b3aa8e" d="M-160 900l765-96h390l765 96z"/>${cobbles(3422, 813, '#82785d')}`;
    }, () => grass(3423, 32, -160, 1760, 900, 28, '#6d7b50') + petals(3424, '#c1a375', 515)) },
    { id: 'river-evening', reason: 'The river becomes the foreground subject beneath the smaller castle silhouette, with moored boats, a timber landing and reflected evening light.', svg: () => frame(3431, { horizon: 620, time: 'dusk' }, () => {
      const st = masonry('#c8baa0', '#8e8d80'), id = U(), water = U(); return st.defs + `<path fill="#758269" d="M-160 650Q760 585 1760 646V900H-160z"/><g id="${id}">${rochesterKeep(920, 635, .65, st)}<path fill="${st.fill}" d="M750 650V564h470v86z"/>${merlons(750, 564, 470, st.fill)}</g><path fill="url(#${water})" d="M-160 691Q760 638 1760 705V900H-160z"/><defs>${linU(water, [[0, '#b4a8a1'], [1, '#3a566c']], 0, 691, 0, 900)}</defs>${reflect(id, 683, .2)}${shimmer(3432, 42, -160, 1760, 710, 900, '#f5d6b0', 45)}${sail(420, 771, .52, 6)}${mv('ukbob', { ad: '4s', dy: '3px' }, boat(1230, 812, .62, '#536771'))}`;
    }, () => `<path fill="#706452" d="M-160 860l700-75 65 23-765 92z"/><path stroke="#4a5148" stroke-width="12" d="M100 884V812M306 862V791M490 837V775"/>${grass(3433, 26, -160, 340, 900, 63, '#536444')}`) },
  ], 'slate', ['rochester', 'norman keep', 'medway', 'castle gardens']);
}

