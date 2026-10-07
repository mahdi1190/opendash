/* ============================================================
   ANIMATION PACK "texas": the Lone Star pack. PURE classic script (no DOM, no
   fetches, nothing looked up online). Every item has a when() rule, so none of
   it ever comes up outside Texas and none of it is in the ordinary daily
   rotation. Where Texas is, offline:
     - travel: ctx.city is a Texas travel city id (houston-us, dallas-us,
       san-antonio-us, el-paso-us; 69-travel-data.js), while away from home
     - home: the weather town (ctx.lat / ctx.lon) within TX_RADIUS_KM of one of
       the TX_TOWNS below (Austin, Fort Worth, Galveston and more as well)
   While travelling, the travel city decides (a trip to Paris is not Texas).
   Items carry texasKind: 'statewide' | 'city' | 'day', plus txTown on city items.
     statewide   priority 1: the openings, symbols and celebrations (the sunset sky: 2, as the sky pack's)
     city        priority 1.2: a signature opening and an element per big city, so a
                 city's own art wins over the statewide set while you are there
     day         priority 1.5: Texas Independence Day, San Jacinto Day,
                 Juneteenth, bluebonnet season, rodeo season, Friday night lights
   A festival or the birthday (priority 2+) still wins the day.
   Guide: docs/dev/TEXAS_PACK.md. Gate: tests/anim-packs.test.mjs, tests/texas-pack.test.mjs.
   ============================================================ */
/** For the page (78-anim-wire.js, the opening sequence): the Texas town for a ctx, {id, name} or null. The pack fills it in. */
const ANIM_TX = { place: () => '', name: (id) => id };
function animTexasWhere(ctx) { const id = ANIM_TX.place(ctx); return id ? { id, name: ANIM_TX.name(id) } : null; }
(function () {
  const TX_RADIUS_KM = 60;
  /** Texas towns: id, name, lat, lon, travel city id ('' when the travel tables lack it). */
  const TX_TOWNS = [
    ['houston', 'Houston', 29.76, -95.37, 'houston-us'], ['dallas', 'Dallas', 32.78, -96.8, 'dallas-us'],
    ['austin', 'Austin', 30.27, -97.74, ''], ['san-antonio', 'San Antonio', 29.42, -98.49, 'san-antonio-us'],
    ['el-paso', 'El Paso', 31.76, -106.49, 'el-paso-us'], ['fort-worth', 'Fort Worth', 32.75, -97.33, ''],
    ['galveston', 'Galveston', 29.3, -94.8, ''], ['corpus-christi', 'Corpus Christi', 27.8, -97.4, ''],
    ['lubbock', 'Lubbock', 33.58, -101.86, ''], ['amarillo', 'Amarillo', 35.22, -101.83, ''],
    ['waco', 'Waco', 31.55, -97.15, ''], ['midland', 'Midland', 32.0, -102.08, ''],
    ['laredo', 'Laredo', 27.51, -99.51, ''], ['brownsville', 'Brownsville', 25.9, -97.5, ''],
    ['tyler', 'Tyler', 32.35, -95.3, ''], ['beaumont', 'Beaumont', 30.08, -94.1, ''],
    ['abilene', 'Abilene', 32.45, -99.73, ''], ['college-station', 'College Station', 30.63, -96.33, ''],
    ['san-angelo', 'San Angelo', 31.46, -100.44, ''], ['wichita-falls', 'Wichita Falls', 33.91, -98.49, ''],
  ];
  const _km = (la1, lo1, la2, lo2) => {
    const r = Math.PI / 180, dl = (la2 - la1) * r, dg = (lo2 - lo1) * r;
    const a = Math.sin(dl / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dg / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(a));
  };
  /** The Texas town id for a ctx ('' = not in Texas). Travel wins; else the home weather town. */
  const txPlace = (ctx) => {
    if (!ctx) return '';
    if (ctx.city) { const t = TX_TOWNS.find(x => x[4] && x[4] === ctx.city); return t ? t[0] : ''; }
    if (ctx.lat == null || ctx.lon == null || !isFinite(ctx.lat) || !isFinite(ctx.lon)) return '';
    let best = '', bd = TX_RADIUS_KM;
    for (const t of TX_TOWNS) { const d = _km(ctx.lat, ctx.lon, t[2], t[3]); if (d <= bd) { bd = d; best = t[0]; } }
    return best;
  };
  ANIM_TX.place = txPlace; ANIM_TX.name = (id) => { const t = TX_TOWNS.find(x => x[0] === id); return t ? t[1] : id; };
  const inTexas = (day, ctx) => !!txPlace(ctx);
  const md = (day) => { const m = /^\d{4}-(\d{2})-(\d{2})/.exec(String(day || '')); return m ? +m[1] * 100 + +m[2] : 0; };   // 305 = 5 March
  const dow = (day) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(day || '')); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay() : -1; };

  const items = [];
  const base = { mood: 'cheerful', intensity: 'subtle', theme: 'any', season: 'any', region: ['US'], reduced: 'static', priority: 1, country: 'US', state: 'TX' };
  /** A statewide item. */
  const add = (o) => items.push(Object.assign({}, base, { texasKind: 'statewide', when: inTexas }, o, { tags: ['texas', 'lone-star'].concat(o.tags || []) }));
  /** A city item: kind 'signature' (opening) or 'element' (symbol), played in that town only. */
  const city = (town, kind, o) => items.push(Object.assign({}, base, {
    slot: kind === 'signature' ? 'opening' : 'symbol', texasKind: 'city', priority: 1.2, txTown: town, worldKind: kind,
    when: (day, ctx) => txPlace(ctx) === town,
  }, o, { id: town + '-' + o.id, tags: ['texas', town, kind].concat(o.tags || []) }));
  /** A day item: priority 1.5, in Texas on the days the rule says. */
  const day = (rule, o) => items.push(Object.assign({}, base, { texasKind: 'day', priority: 1.5, when: (d, ctx) => inTexas(d, ctx) && rule(d) }, o, { tags: ['texas', 'special-day'].concat(o.tags || []) }));

  const r1 = (n) => Math.round(n * 10) / 10;
  const star5 = (cx, cy, R, r) => {
    const p = [];
    for (let i = 0; i < 10; i++) { const a = (-90 + 36 * i) * Math.PI / 180, q = i % 2 ? r : R; p.push(`${r1(cx + q * Math.cos(a))} ${r1(cy + q * Math.sin(a))}`); }
    return 'M' + p.join('L') + 'z';
  };
  const twinkle = (x, y, d) => `<path class="c x-twinkle" style="--d:${d}s" d="M${x} ${y - 3}l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>`;
  const sun = (x, y, r) => `<circle class="s x-pulse" cx="${x}" cy="${y}" r="${r || 6}"/>`;
  const ground = '<path class="lm" d="M4 58h56"/>';
  const wv = (y, d, cls) => `<path class="${cls || 'lc'} x-wave" style="--d:${d || 0}s" d="M0 ${y}${'q3-2 6 0t6 0'.repeat(11)}"/>`;
  const ridge = (y, cls) => `<path class="${cls || 's'}" d="M2 ${y}q10-8 18-2t16-3q10-6 26 3v${60 - y}H2z"/>`;

  /* ---------- statewide: openings ---------- */
  add({ id: 'lone-star', slot: 'opening', label: 'The Lone Star', colour: 'blue', mood: 'proud', tags: ['flag', 'star'],
    svg: () => '<path class="lk t" d="M8 8v50"/><g class="x-float"><rect class="c" x="10" y="12" width="14" height="30"/>'
      + `<path class="w" d="${star5(17, 27, 5.5, 2.3)}"/><rect class="w lk" x="24" y="12" width="28" height="15"/><rect class="m" x="24" y="27" width="28" height="15"/></g>` + ground
      + twinkle(54, 52, 0.4) });
  add({ id: 'bluebonnets', slot: 'opening', label: 'A field of bluebonnets', colour: 'indigo', mood: 'dreamy', season: ['spring'], tags: ['flowers', 'bluebonnet', 'spring'],
    svg: () => ridge(44, 's') + [[10, 34], [20, 30], [31, 36], [41, 29], [52, 33], [15, 46], [36, 47], [48, 46]].map(([x, y], i) =>
      `<g class="x-swing" style="--d:${(i * 0.3).toFixed(1)}s"><path class="lm" d="M${x} 58V${y + 8}"/>`
      + [0, 1, 2, 3].map(k => `<circle class="c" cx="${x + (k % 2 ? 1 : -1)}" cy="${y + k * 2.6}" r="${r1(3.2 - k * 0.5)}"/>`).join('') + `<circle class="w" cx="${x}" cy="${y - 1}" r="1"/></g>`).join('') });
  add({ id: 'windmill-sky', slot: 'opening', label: 'Windmill under a big sky', colour: 'amber', mood: 'calm', tags: ['windmill', 'sky', 'ranch'],
    svg: () => sun(14, 14, 6) + '<path class="lk" d="M40 58l-5-26M40 58l5-26M36 46h8M37 38h6"/><g class="x-spin" style="--ad:5s"><circle class="c" cx="40" cy="26" r="2.4"/>'
      + [0, 45, 90, 135, 180, 225, 270, 315].map(a => `<path class="c" d="M40 26l-1.6-10h3.2z" transform="rotate(${a} 40 26)"/>`).join('') + '</g>'
      + '<path class="lk" d="M45 29l10 3"/><path class="c" d="M55 28v7h-3z"/>' + ridge(52, 's') + ground });
  add({ id: 'longhorn', slot: 'opening', label: 'A longhorn', colour: 'orange', mood: 'proud', tags: ['longhorn', 'cattle', 'ranch'],
    svg: () => '<path class="lk t" d="M4 24q6 8 14 6l4-2M60 24q-6 8-14 6l-4-2"/><path class="c" d="M4 22q4 6 10 7M60 22q-4 6-10 7"/>'
      + '<path class="w lk" d="M20 26q12-6 24 0l-3 20q-9 8-18 0z"/><path class="s" d="M26 38h12q-1 8-6 8t-6-8z"/><circle class="k x-blink" cx="27" cy="31" r="1.6"/><circle class="k x-blink" cx="37" cy="31" r="1.6"/>'
      + '<circle class="k" cx="30" cy="42" r="1"/><circle class="k" cx="34" cy="42" r="1"/>' });

  /* ---------- statewide: symbols ---------- */
  add({ id: 'cowboy-hat', slot: 'symbol', label: 'Cowboy hat', colour: 'amber', tags: ['hat', 'cowboy'],
    svg: () => '<g class="x-bob"><path class="c lk" d="M20 36q0-16 6-16 3 5 6 2 3 3 6-2 6 0 6 16z"/><path class="m" d="M20 33q12 3 24 0v3q-12 3-24 0z"/>'
      + '<path class="c lk" d="M6 38q8 10 26 10t26-10q-8 4-26 4T6 38z"/></g>' + twinkle(50, 14, 0.2) });
  add({ id: 'boot', slot: 'symbol', label: 'A pair of boots', colour: 'orange', mood: 'energetic', tags: ['boots', 'cowboy'],
    svg: () => '<g class="x-bounce"><path class="c lk" d="M20 8h14v26q10 3 14 8v10H20z"/><path class="m" d="M20 46h28v6H20z"/><path class="w" d="M23 14h8M23 20h8M23 26h8" /></g>'
      + '<path class="lm" d="M12 56h42"/>' + `<path class="w" d="${star5(27, 40, 3.4, 1.4)}"/>` });
  add({ id: 'tumbleweed', slot: 'symbol', label: 'Tumbleweed', colour: 'amber', mood: 'calm', tags: ['tumbleweed', 'desert'],
    svg: () => '<g class="x-roll"><circle class="lc" cx="32" cy="38" r="14"/><path class="lc" d="M20 30q12 6 24-4M19 40q13-6 26 2M24 50q8-10 18-8M30 25q-4 12 4 24M38 26q4 10-2 22"/></g>'
      + '<path class="lm dash" d="M2 58h60"/>' });
  add({ id: 'armadillo', slot: 'symbol', label: 'Armadillo', colour: 'slate', mood: 'cosy', tags: ['armadillo', 'animal'],
    svg: () => '<g class="x-bob"><path class="c lk" d="M12 46q0-20 22-20t22 20z"/><path class="lk" d="M22 30q-2 8 0 16M30 27q-2 10 0 19M38 27q2 10 0 19M46 30q2 8 0 16"/>'
      + '<path class="s lk" d="M14 40l-9 4q-2 2 0 3l10-1z"/><path class="s lk" d="M18 30l-3-7 6 4z"/><path class="lk t" d="M56 46q6 2 6 8"/><circle class="k" cx="12" cy="42" r="1"/>'
      + '<path class="lk" d="M20 46v6M30 46v6M42 46v6"/></g>' + ground });
  add({ id: 'prickly-pear', slot: 'symbol', label: 'Prickly pear in bloom', colour: 'green', mood: 'calm', tags: ['cactus', 'desert'],
    svg: () => '<ellipse class="c lk" cx="32" cy="46" rx="11" ry="9"/><ellipse class="c lk" cx="21" cy="30" rx="8" ry="10" transform="rotate(-20 21 30)"/><ellipse class="c lk" cx="44" cy="26" rx="8" ry="10" transform="rotate(18 44 26)"/>'
      + [[21, 21], [44, 17], [30, 40]].map(([x, y], i) => `<circle class="s x-pulse" style="--d:${i * 0.5}s" cx="${x}" cy="${y}" r="3"/><circle class="w" cx="${x}" cy="${y}" r="1"/>`).join('') + ground });
  add({ id: 'pickup', slot: 'symbol', label: 'Pickup on a county road', colour: 'red', mood: 'energetic', tags: ['truck', 'road'],
    svg: () => '<g class="x-bob"><path class="c lk" d="M6 40V30h24l6 6h16v10H6z"/><path class="w" d="M30 32l4 4h-9v-4z"/>'
      + '<circle class="k" cx="18" cy="48" r="5"/><circle class="k" cx="46" cy="48" r="5"/><circle class="w" cx="18" cy="48" r="1.8"/><circle class="w" cx="46" cy="48" r="1.8"/></g>'
      + '<path class="lm dash x-slidel" d="M2 58h60"/>' });

  /* ---------- statewide: celebrations and the sky ---------- */
  add({ id: 'star-burst', slot: 'celebration', label: 'Lone Star burst', colour: 'blue', mood: 'proud', tags: ['star', 'burst'],
    svg: () => `<path class="c x-pop" d="${star5(32, 32, 16, 6.5)}"/>` + [[10, 12], [54, 12], [8, 48], [56, 50], [32, 5], [32, 59]].map(([x, y], i) => `<path class="s x-burst" style="--d:${(i * 0.15).toFixed(2)}s" d="${star5(x, y, 4, 1.7)}"/>`).join('') });
  add({ id: 'hat-toss', slot: 'celebration', label: 'Hats in the air', colour: 'amber', mood: 'energetic', tags: ['hat', 'cheer'],
    svg: () => [[16, 30, 0], [32, 18, 0.35], [48, 32, 0.7]].map(([x, y, d]) => `<g class="x-float" style="--d:${d}s"><path class="c lk" d="M${x - 6} ${y}q0-8 3-8 1.5 2.5 3 1 1.5 1.5 3-1 3 0 3 8z"/><path class="c lk" d="M${x - 11} ${y + 1}q5 5 11 5t11-5q-5 2-11 2t-11-2z"/></g>`).join('')
      + [[8, 10], [56, 10], [24, 50], [42, 50]].map(([x, y], i) => twinkle(x, y, i * 0.3)).join('') });
  add({ id: 'sparklers', slot: 'celebration', label: 'Yeehaw fireworks', colour: 'red', mood: 'cheerful', intensity: 'standard', tags: ['fireworks', 'celebrate'],
    svg: () => [[20, 22, 0], [44, 18, 0.5], [32, 40, 1]].map(([x, y, d]) => `<g class="x-burst" style="--d:${d}s">`
      + [0, 45, 90, 135, 180, 225, 270, 315].map(a => `<path class="lc" d="M${x} ${y - 4}v-7" transform="rotate(${a} ${x} ${y})"/>`).join('') + `<circle class="c" cx="${x}" cy="${y}" r="2"/></g>`).join('') });
  add({ id: 'big-sky-sunset', slot: 'sky', label: 'Big sky sunset', colour: 'orange', mood: 'dreamy', tags: ['sunset', 'sky'],
    priority: 2, when: (day, ctx) => !!txPlace(ctx) && !!ctx && ctx.moment === 'sunset',   // joins the sky pack's sunsets (also 2) in Texas
    svg: () => '<circle class="c x-sunset" cx="32" cy="38" r="12"/>' + wv(26, 0, 'lm') + wv(32, 0.5, 'lm')
      + '<path class="k" d="M2 46q14-4 28 0t32-2v16H2z"/><path class="lk" d="M50 46V34M50 40h-4v-4M50 38h4v-4"/>' + twinkle(52, 10, 0.5) });

  /* ---------- cities ---------- */
  city('houston', 'signature', { id: 'liftoff', slot: 'opening', label: 'Liftoff, Houston', colour: 'blue', mood: 'energetic', tags: ['space', 'rocket', 'landmark'],
    svg: () => '<g class="x-takeoff"><path class="w lk" d="M32 6q8 10 6 26H26q-2-16 6-26z"/><circle class="c" cx="32" cy="20" r="3.4"/><path class="c" d="M26 28l-6 10 6-3zM38 28l6 10-6-3z"/></g>'
      + '<path class="c x-flicker" d="M29 36q3 14 6 0z"/><path class="s x-contrail" d="M28 38q-4 10 0 20h8q4-10 0-20z"/>' + twinkle(10, 14, 0) + twinkle(54, 20, 0.7) + ground });
  city('houston', 'element', { id: 'orbit', label: 'Orbit around Houston', colour: 'indigo', mood: 'dreamy', tags: ['space', 'orbit', 'planet'],
    svg: () => '<circle class="c" cx="32" cy="32" r="11"/><path class="lk" d="M24 28q8 4 16 0M23 36q9 4 18 0" opacity=".5"/>'
      + '<g class="x-spin" style="--ad:6s"><ellipse class="lk" cx="32" cy="32" rx="26" ry="9" transform="rotate(-18 32 32)"/><circle class="w lk" cx="6" cy="32" r="3"/></g>' + twinkle(50, 10, 0.3) + twinkle(10, 50, 0.9) });
  city('dallas', 'signature', { id: 'reunion-ball', label: 'The ball on the tower, Dallas', colour: 'blue', mood: 'focused', tags: ['tower', 'landmark', 'skyline'],
    svg: () => '<path class="lk t" d="M32 22v36"/><path class="lk" d="M28 58l2-24M36 58l-2-24"/><g class="x-glow"><circle class="c" cx="32" cy="18" r="9"/><circle class="w" cx="32" cy="18" r="3"/></g><path class="lk" d="M32 4v5"/>'
      + '<path class="m" d="M6 58V44h8v14zM46 58V38h10v20zM14 58V48h8v10z"/>' + ground });
  city('dallas', 'element', { id: 'pegasus', label: 'The flying red horse', colour: 'red', mood: 'proud', tags: ['pegasus', 'sign'],
    svg: () => '<g class="x-float"><path class="c" d="M16 40q4-12 16-12l8-8 4 4-4 6q6 6 4 14l-8-2-6 8-4-8z"/><path class="c x-flap" d="M26 32q-12-12-6-24 8 8 14 22z"/>'
      + '<circle class="w" cx="42" cy="25" r="1.2"/></g>' + twinkle(8, 14, 0) + twinkle(54, 48, 0.8) + ground });
  city('austin', 'signature', { id: 'capitol', label: 'The Capitol dome, Austin', colour: 'orange', mood: 'proud', tags: ['capitol', 'landmark', 'dome'],
    svg: () => `<path class="c x-twinkle" d="${star5(32, 8, 4, 1.7)}"/>` + '<path class="lk" d="M32 12v4"/><path class="w lk" d="M22 30q0-14 10-14t10 14z"/><path class="lk" d="M22 30h20M26 20v10M32 18v12M38 20v10"/>'
      + '<path class="s lk" d="M10 34h44v6H10z"/><path class="w lk" d="M12 40h40v18H12z"/>' + [16, 24, 32, 40, 47].map(x => `<path class="lk" d="M${x} 42v16"/>`).join('') });
  city('austin', 'element', { id: 'live-oak', label: 'A live oak', colour: 'green', mood: 'calm', tags: ['oak', 'tree', 'shade'],
    svg: () => '<path class="lk t" d="M32 58V38M32 46q-8-4-12-12M32 44q8-4 12-14"/><g class="x-swing"><circle class="c" cx="18" cy="28" r="11"/><circle class="c" cx="46" cy="28" r="11"/><circle class="c" cx="32" cy="20" r="14"/><circle class="s" cx="28" cy="17" r="5"/><circle class="s" cx="42" cy="26" r="4"/></g>' + ground });
  city('san-antonio', 'signature', { id: 'alamo', label: 'The Alamo, San Antonio', colour: 'amber', mood: 'proud', tags: ['alamo', 'landmark', 'mission'],
    svg: () => '<path class="w lk" d="M12 58V28q4-4 8-2l2-6h20l2 6q4-2 8 2v30z"/><path class="lk" d="M22 20q10-8 20 0"/><path class="s lk" d="M26 58V40a6 6 0 0 1 12 0v18z"/>'
      + '<path class="lk" d="M22 30h4M38 30h4M30 30h4"/><circle class="c x-twinkle" cx="32" cy="24" r="2.4"/>' + ground });
  city('san-antonio', 'element', { id: 'riverwalk', label: 'A boat on the River Walk', colour: 'teal', mood: 'cosy', tags: ['river', 'boat', 'lanterns'],
    svg: () => '<path class="lk" d="M4 12q28 10 56 0"/>' + [[12, 15], [24, 18], [36, 18], [48, 15]].map(([x, y], i) => `<circle class="c x-glow" style="--d:${i * 0.4}s" cx="${x}" cy="${y + 2}" r="2.4"/>`).join('')
      + wv(46, 0) + wv(52, 0.6, 'lm') + '<g class="x-bob"><path class="c lk" d="M14 40h36l-5 8H19z"/><path class="w" d="M22 34h20v6H22z"/></g>' });
  city('el-paso', 'signature', { id: 'franklin-star', label: 'The star on the mountain, El Paso', colour: 'amber', mood: 'proud', tags: ['mountain', 'star', 'landmark'],
    svg: () => '<path class="s lk" d="M2 58l16-26 8 8 10-24 12 22 6-6 8 26z"/>' + `<path class="c x-glow" d="${star5(36, 24, 8, 3.4)}"/>` + twinkle(10, 14, 0.2) + twinkle(54, 12, 0.8) + ground });
  city('el-paso', 'element', { id: 'sun-city', label: 'Sun City sunrise', colour: 'orange', mood: 'cheerful', tags: ['sun', 'desert', 'sunrise'],
    svg: () => '<circle class="c x-rise" cx="32" cy="36" r="13"/>' + [0, 30, 60, 90, 120, 150, 180].map((a, i) => `<g transform="rotate(${a - 90} 32 36)"><path class="lc x-pulse" style="--d:${(i * 0.15).toFixed(2)}s" d="M32 14v-6"/></g>`).join('')
      + '<path class="s" d="M2 46q16-6 30 0t30-2v16H2z"/><path class="m" d="M2 52q16-5 30 0t30-2v10H2z"/>' });
  city('fort-worth', 'signature', { id: 'stockyards', label: 'The Stockyards gate, Fort Worth', colour: 'red', mood: 'cheerful', tags: ['stockyards', 'gate', 'landmark'],
    svg: () => '<path class="lk t" d="M10 58V30M54 58V30"/><path class="lk" d="M10 30q22-14 44 0"/><path class="c x-swing" d="M24 28h16v8H24z"/><path class="w" d="M27 31h10" />'
      + `<path class="c" d="${star5(32, 18, 4, 1.7)}"/>` + ground });
  city('fort-worth', 'element', { id: 'cattle-drive', label: 'The cattle drive', colour: 'orange', mood: 'energetic', tags: ['cattle', 'drive'],
    svg: () => [[8, 0], [26, 0.4], [44, 0.8]].map(([x, d]) => `<g class="x-bob" style="--d:${d}s"><path class="k" d="M${x} 44q0-8 6-8h8q4 0 4 4v6h-3v8h-3v-6h-6v6h-3v-8z"/><path class="lk" d="M${x + 18} 38l3-3M${x + 18} 38l3 1"/></g>`).join('')
      + '<path class="lm dash x-slidel" d="M2 58h60"/>' + sun(52, 12, 5) });

  /* ---------- special days (priority 1.5) ---------- */
  day((d) => md(d) === 302, { id: 'independence-day', slot: 'opening', label: 'Texas Independence Day', colour: 'blue', mood: 'proud', tags: ['2-march', 'independence', 'flag'],
    svg: () => '<path class="lk t" d="M10 6v54"/><g class="x-flag"><rect class="c" x="12" y="10" width="14" height="34"/>' + `<path class="w" d="${star5(19, 27, 5.8, 2.4)}"/>`
      + '<rect class="w lk" x="26" y="10" width="26" height="17"/><rect class="m" x="26" y="27" width="26" height="17"/></g>' + twinkle(56, 8, 0.2) + twinkle(58, 50, 0.9) });
  day((d) => md(d) === 421, { id: 'san-jacinto', slot: 'opening', label: 'San Jacinto Day', colour: 'red', mood: 'proud', tags: ['21-april', 'san-jacinto', 'cannon'],
    svg: () => '<path class="s" d="M2 50q16-6 30 0t30-2v12H2z"/><g class="x-bob"><path class="k" d="M12 42h24l4-6h-24z"/><circle class="k" cx="20" cy="46" r="6"/><circle class="w" cx="20" cy="46" r="2"/></g>'
      + '<circle class="s x-burst" cx="46" cy="30" r="5"/><circle class="s x-burst" style="--d:0.4s" cx="54" cy="22" r="4"/>' + `<path class="c x-twinkle" d="${star5(50, 10, 5, 2.1)}"/>` });
  day((d) => md(d) === 619, { id: 'juneteenth', slot: 'opening', label: 'Juneteenth, where it began', colour: 'red', mood: 'proud', tags: ['19-june', 'juneteenth', 'galveston'],
    svg: () => '<circle class="c x-rise" cx="32" cy="34" r="12"/>' + [0, 1, 2, 3, 4].map(i => `<g transform="rotate(${-72 + i * 36} 32 34)"><path class="lc x-pulse" style="--d:${i * 0.2}s" d="M32 18v-8"/></g>`).join('')
      + wv(46, 0, 'lc') + wv(52, 0.6, 'lm') + `<path class="w lk x-twinkle" d="${star5(32, 34, 5, 2.1)}"/>` + wv(58, 1.2, 'lm') });
  day((d) => md(d) >= 325 && md(d) <= 420, { id: 'bluebonnet-season', slot: 'symbol', label: 'Bluebonnet season', colour: 'indigo', mood: 'dreamy', tags: ['bluebonnet', 'spring'],
    svg: () => [[18, 0], [32, 0.4], [46, 0.8]].map(([x, d], i) => `<g class="x-swing" style="--d:${d}s"><path class="lm" d="M${x} 58V${24 + i * 3}"/>`
      + [0, 1, 2, 3, 4].map(k => `<circle class="c" cx="${x + (k % 2 ? 1.4 : -1.4)}" cy="${16 + i * 3 + k * 3.4}" r="${r1(4 - k * 0.55)}"/>`).join('') + `<circle class="w" cx="${x}" cy="${14 + i * 3}" r="1.2"/></g>`).join('') + '<path class="s" d="M4 58q28-6 56 0v2H4z"/>' });
  day((d) => md(d) >= 224 && md(d) <= 320, { id: 'rodeo-wheel', slot: 'symbol', label: 'Rodeo season', colour: 'orange', mood: 'energetic', intensity: 'standard', tags: ['rodeo', 'carnival', 'ferris-wheel'],
    svg: () => '<path class="lk" d="M22 58l10-26 10 26"/><g class="x-spin" style="--ad:12s"><circle class="lk" cx="32" cy="30" r="20"/><path class="lm" d="M12 30h40M32 10v40M18 16l28 28M46 16L18 44"/>'
      + [[32, 10], [52, 30], [32, 50], [12, 30], [46, 16], [46, 44], [18, 44], [18, 16]].map(([x, y]) => `<circle class="c" cx="${x}" cy="${y}" r="3"/>`).join('') + '</g>' + ground });
  day((d) => dow(d) === 5 && md(d) >= 901 && md(d) <= 1130, { id: 'friday-lights', slot: 'symbol', label: 'Friday night lights', colour: 'amber', mood: 'cheerful', tags: ['football', 'friday', 'stadium'],
    svg: () => [[14, 0], [50, 0.5]].map(([x, d]) => `<path class="lk t" d="M${x} 58V26"/><g class="x-glow" style="--d:${d}s"><rect class="c" x="${x - 9}" y="12" width="18" height="14" rx="1.5"/>`
      + [0, 1, 2].map(k => `<circle class="w" cx="${x - 5 + k * 5}" cy="16" r="1.5"/><circle class="w" cx="${x - 5 + k * 5}" cy="22" r="1.5"/>`).join('') + '</g>').join('')
      + '<ellipse class="s lk" cx="32" cy="50" rx="18" ry="6"/><path class="lw" d="M32 44v12"/><g class="x-bounce"><ellipse class="c lk" cx="32" cy="30" rx="6" ry="4" transform="rotate(-24 32 30)"/><path class="lw" d="M29 31l6-3"/></g>' });

  /* ---------- full-screen scenes (71-anim-texas-scenes.js): a city's own win the opening in that city ---------- */
  const SCENE_CITY = { 'fort-worth-stockyards-scene': 'fort-worth', 'dallas-skyline': 'dallas', 'houston-liftoff-scene': 'houston', 'austin-capitol-walk': 'austin', 'alamo-morning': 'san-antonio', 'el-paso-star-scene': 'el-paso' };
  const SCENE_MONTHS = { 'hill-country-bluebonnets': [3, 4, 5] };
  const scenes = typeof animTexasScenes === 'function' ? animTexasScenes() : [];
  /* The live sky (docs/dev/SCENE_ENGINE.md section 7): each scene carries liveSky (its own place when no location is set), so
     the real sun sets its tod class (the scenes' own dusk / night tint, lit windows and stars), and the retrofit overlay adds
     the real moon, the season and the live weather. The paintings keep their own light: no sky veil and no land grade
     (they would cut the skylines, mesas and trees out of the sky), and no live moon where a moon is painted. Without a live
     sky (Node, the lint corpus) the art is byte-identical. */
  const SCENE_PLACE = { 'hill-country-bluebonnets': [30.27, -98.87], 'west-texas-sunset': [30.31, -104.02], 'gulf-coast-sunrise': [29.3, -94.8] };
  const SCENE_RETRO = { veil: false, grade: false, lamps: false, stars: 0, sun: 'painted', horizon: 190 };
  const PAINTED_MOON = { 'fort-worth-stockyards-scene': 1, 'houston-liftoff-scene': 1, 'austin-capitol-walk': 1 };
  for (const o of scenes) {
    const town = SCENE_CITY[o.id] || '', months = SCENE_MONTHS[o.id] || null;
    const t = TX_TOWNS.find(x => x[0] === town), at = SCENE_PLACE[o.id] || (t ? [t[2], t[3]] : [31, -100]);
    let it = Object.assign({}, base, { slot: 'opening', full: true, mood: 'calm', intensity: 'subtle', texasKind: 'scene', priority: town ? 1.3 : 1, txTown: town || undefined, worldKind: town ? 'scene' : undefined,
      when: (day, ctx) => (town ? txPlace(ctx) === town : !!txPlace(ctx)) && (!months || months.includes(+String(day).slice(5, 7))) }, o, { tags: ['texas', 'lone-star', 'scene'].concat(o.tags || []), liveSky: { lat: at[0], lon: at[1] } });
    if (typeof sceneRetrofit === 'function') it = sceneRetrofit(it, Object.assign({}, SCENE_RETRO, PAINTED_MOON[o.id] ? { moon: false } : {}));
    items.push(it);
  }
  animRegisterPack({
    id: 'texas', name: 'Texas', version: '1.0.0',
    description: 'The Lone Star pack: Texas openings, symbols, celebrations and a sunset, a landmark for six cities, and Texas Independence Day, San Jacinto Day, Juneteenth, bluebonnet and rodeo season and Friday night lights. Plays in Texas only (travel, or a weather town there).',
    css: typeof animTexasSceneCss === 'function' ? animTexasSceneCss() : '', items,
  });
})();
