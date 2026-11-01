  // @part 28-money-scenes.js · NEW (30 Oct 2026) · OWNER: Finance symbols (short scenes inside the money story; a scene is one entry in MS_SCENES plus, if it is new, one drawing in MSV_ART)
  // ── Money story scenes ────────────────────────────────────────────────
  // A tube train running across the screen with your total on its side, a scooter bringing the pizza,
  // a trolley rolling in, a cup filling up, planes, a heart passed from hand to hand, payday fireworks.
  //   MS_SCENES      the scenes: what they count (tally id), when they show, the words
  //   MSV_ART        the drawings (original art; a real logo only ever appears as a small label, unaltered)
  //   msvTallyOf(t)  which scene a payment counts towards (MSM.build keeps the totals: S.tally)
  //   msvBeats(S, L) the scene beats for this story, biggest first, at most a few
  // Numbers: only S (the model); the count-up lands on the real figure, and the voice reads the same figure.
  // Hide amounts: the figures show as dots and nothing with an amount is read out.
  // Reduced motion: every drawing rests in its final place.
  const MSV_PEOPLE = /^(payments? to people|friends ?(&|and) ?family|people)$/i;
  function msvTallyOf(t) {
    const FS = window.FinSymbols; if (!FS) return '';
    if (MSV_PEOPLE.test(String(t.c))) return 'people';
    let i = null, cs = '';
    try { i = FS.merchantInfo(t.m, t.c); cs = FS.categoryScene(t.c, t.bc); } catch (e) { return ''; }
    const p = i.known ? i.pic : '';
    if (p === 'tube' || p === 'tram') return 'tube';
    if (p === 'train' || t.bc === 'public_transport' && /\b(rail|train|tube|metro)/i.test(t.m)) return 'rail';
    if (p === 'plane' || t.bc === 'flights') return 'flights';
    if (p === 'scooter' && i.scene === 'takeaway' || p === 'pizza' || cs === 'takeaway' && !i.known) return 'delivery';
    if (p === 'basket' || p === 'trolley' || cs === 'groceries') return 'groceries';
    return '';
  }
  const MSV_PLURAL = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;
  // One entry per scene. tally: S.tally id, or a function of S giving {v, n, m, c}. min: the least worth a scene.
  const MS_SCENES = [
    { id: 'tube', tally: 'tube', art: 'train', tone: 'navy', livery: { body: '#10319b', top: '#f1f5f9', stripe: '#dc241f', glow: '#fde68a' }, world: 'tunnel', over: 'Under the city', min: { v: 5, n: 2 },
      title: 'The Tube and trams', line: (x, M, W) => `The Tube and trams came to ${M(x.v)} ${W.in}, over ${MSV_PLURAL(x.n, 'fare')}.`, quiet: 'The Tube and trams, all the way across.' },
    { id: 'rail', tally: 'rail', art: 'train', tone: 'sky', livery: { body: '#0f766e', top: '#e2e8f0', stripe: '#fbbf24', glow: '#fef3c7' }, world: 'country', over: 'All aboard', min: { v: 8, n: 1 },
      title: 'Train tickets', line: (x, M, W) => `Train tickets came to ${M(x.v)} ${W.in}, ${MSV_PLURAL(x.n, 'ticket')}.`, quiet: 'Train tickets, on their way through.' },
    { id: 'delivery', tally: 'delivery', art: 'scooter', tone: 'coral', over: 'Knock knock', min: { v: 8, n: 2 },
      title: 'Food at your door', line: (x, M, W) => `${MSV_PLURAL(x.n, 'delivery', 'deliveries')} came to your door ${W.in}: ${M(x.v)}.`, quiet: 'Dinner, delivered.' },
    { id: 'groceries', tally: 'groceries', art: 'trolley', tone: 'mint', over: 'The big shop', min: { v: 15, n: 2 },
      title: 'The food shop', line: (x, M, W) => `${MSV_PLURAL(x.n, 'trip')} to the shops ${W.in} filled the trolley with ${M(x.v)} of food.`, quiet: 'The trolley, filled up.' },
    { id: 'coffee', tally: S => (S.facts.coffees ? { v: S.facts.coffees.v, n: S.facts.coffees.n } : null), art: 'cup', tone: 'amber', over: 'Your cup', min: { v: 5, n: 3 },
      title: 'Coffee', line: (x, M, W) => `${MSV_PLURAL(x.n, 'coffee')} ${W.in}, for ${M(x.v)}. Here's your cup, filling up.`, quiet: 'Your cup, filling up.' },
    { id: 'flights', tally: 'flights', art: 'plane', tone: 'ocean', over: 'Up and away', min: { v: 20, n: 1 },
      title: 'Flights', line: (x, M, W) => `Flights came to ${M(x.v)} ${W.in}. Up, up and away.`, quiet: 'Up, up and away.' },
    { id: 'people', tally: 'people', art: 'hearts', tone: 'pink', over: 'From you, to them', min: { v: 5, n: 1 },
      title: 'Family and friends', line: (x, M, W) => `You sent ${M(x.v)} to family and friends ${W.in}, ${MSV_PLURAL(x.n, 'time')}. That's kind.`, quiet: 'From you to the people you care about.' },
  ];
  const MSV_MAX = { week: 1, month: 3, year: 5 };
  function msvBeats(S) {
    const out = [];
    const fmt = mbFmt(), M = v => fmt.money(v), W = MSM.words(S, fmt);
    for (const sc of MS_SCENES) {
      const x = typeof sc.tally === 'function' ? sc.tally(S) : (S.tally && S.tally[sc.tally]) || null;
      if (!x || !(x.v >= (sc.min.v || 0)) || !(x.n >= (sc.min.n || 1))) continue;
      if (x.n === 1 && S.big && Math.abs(S.big.a - x.v) < 0.01) continue;   // the biggest purchase already tells this one
      out.push({ sc, x, line: sc.line(x, M, W) });
    }
    out.sort((a, b) => b.x.v - a.x.v);
    return out.slice(0, MSV_MAX[S.period] || 2);
  }
  const msvHidden = () => { try { return bdHidden(); } catch (e) { return false; } };
  const msvNum = (v, delay, cls) => (msvHidden() ? `<b class="num ${cls || ''}">•••</b>` : `<b class="num ${cls || ''}" data-ms-to="${v}" data-ms-delay="${delay || 500}" data-key="${msRoundKey(v)}">${esc(gbp(v))}</b>`);
  const msvHoldMs = 5400;

  // Rooftops along the street (a different row for each scene): quiet shapes, well behind the drawing.
  function msvSkyline(seed) {
    let x = 0, d = '', k = seed;
    while (x < 1800) { k = (k * 137 + 59) % 1009; const w = 60 + (k % 7) * 18, h = 60 + (k % 13) * 15; d += `M${x} 300V${300 - h}h${w}V300z`; if (k % 3 === 0) d += `M${x + 14} ${300 - h}v-16h14v16z`; x += w + (k % 5) * 6; }
    return `<svg class="msv-skyline" viewBox="0 0 1800 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false"><path d="${d}" fill="#fff"/></svg>`;
  }
  /* ---------- the drawings ---------- */
  const MSV_ART = {
    // A train with the total painted on its side: rolls in, waits, runs on when the beat ends.
    train(sc, x) {
      const L = sc.livery;
      const win = (from, n, step) => Array.from({ length: n }, (_, i) => `<rect x="${from + i * step}" y="40" width="${step - 22}" height="46" rx="9" fill="${L.glow}" opacity=".94"/>`).join('');
      const car = (cx, w) => `<rect x="${cx}" y="18" width="${w}" height="150" rx="16" fill="${L.body}"/><rect x="${cx}" y="18" width="${w}" height="12" rx="6" fill="${L.top}" opacity=".35"/><rect x="${cx}" y="126" width="${w}" height="12" fill="${L.stripe}"/>`;
      const wheel = (cx) => `<g class="msv-wheel" style="transform-origin:${cx}px 180px"><circle cx="${cx}" cy="180" r="19" fill="#1e293b"/><circle cx="${cx}" cy="180" r="7" fill="#94a3b8"/><rect x="${cx - 2}" y="163" width="4" height="34" fill="#475569"/></g>`;
      const train = `<svg viewBox="0 0 2200 200" aria-hidden="true" focusable="false" class="msv-train-svg">`
        + car(0, 700) + win(30, 9, 74)
        + car(716, 760) + `<rect x="900" y="120" width="392" height="24" fill="${L.body}"/>` + win(746, 2, 74) + win(1296, 2, 74)
        + `<path d="M1492 18h540c80 0 150 66 160 130v20H1492z" fill="${L.body}"/><rect x="1492" y="126" width="700" height="12" fill="${L.stripe}"/>` + win(1522, 7, 74)
        + `<path d="M2060 40h20c40 4 72 34 82 68h-102z" fill="${L.glow}" opacity=".94"/><circle cx="2172" cy="150" r="7" fill="#fff"/>`
        + [60, 170, 540, 650, 780, 890, 1300, 1410, 1560, 1670, 2030, 2140].map(wheel).join('') + `</svg>`;
      const world = sc.world === 'tunnel'
        ? `<div class="msv-tunnel" aria-hidden="true">${[0, 1, 2, 3].map(i => `<i style="--k:${i}"></i>`).join('')}</div><div class="msv-tlights" aria-hidden="true"><i></i></div>`
        : `<div class="msv-hills" aria-hidden="true"><svg viewBox="0 0 1600 300" preserveAspectRatio="none"><path d="M0 220c180-90 320-120 520-60s340 40 520-30 340-60 560 10v160H0z" fill="rgba(255,255,255,.14)"/><path d="M0 260c220-60 420-70 640-30s420 30 960-40v110H0z" fill="rgba(255,255,255,.1)"/></svg></div><div class="msv-poles" aria-hidden="true"></div>`;
      return `<div class="msv-stage msv-rail">${world}<div class="msv-train">${train}<div class="msv-train-num">${msvNum(x.v, 700)}<span>${esc(sc.title)}</span></div></div><div class="msv-track" aria-hidden="true"></div></div>`;
    },
    // A delivery scooter brings a box with the total on it; the lid lifts and something warm steams out.
    scooter(sc, x) {
      return `<div class="msv-stage msv-road">${msvSkyline(5)}
        <div class="msv-scooter"><svg viewBox="0 0 520 300" aria-hidden="true" focusable="false">
          <g class="msv-steam"><path d="M138 34c-10-12 10-20 0-34M172 30c-10-12 10-20 0-34" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="6" stroke-linecap="round"/></g>
          <g class="msv-lid" style="transform-origin:64px 66px"><rect x="56" y="48" width="196" height="20" rx="8" fill="#ffd166"/></g>
          <rect x="62" y="66" width="184" height="118" rx="12" fill="#ef476f"/>
          <path d="M52 196h196c10 0 16 6 22 16l8 14h62l-30-120 40-10 44 150a30 30 0 0 1-29 38H124a72 72 0 0 1-72-72z" fill="#f8fafc"/><path d="M60 232h290" stroke="#ef476f" stroke-width="10"/>
          <path d="M350 96l-6-30h44" fill="none" stroke="#f8fafc" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M210 196c-4-44 6-84 42-100 18-8 40-4 48 14l-20 34-30 12 8 40z" fill="#0ea5e9"/><path d="M286 122l52-18" stroke="#0ea5e9" stroke-width="20" stroke-linecap="round"/><circle cx="340" cy="102" r="10" fill="#ffd166"/>
          <path d="M248 196l42 2 6 44" fill="none" stroke="#1e3a8a" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="280" cy="62" r="28" fill="#ffd166"/><path d="M250 62a30 30 0 0 1 60 0v4h14v8h-74z" fill="#ef476f"/>
          <g class="msv-wheel" style="transform-origin:128px 256px"><circle cx="128" cy="256" r="38" fill="#1e293b"/><circle cx="128" cy="256" r="14" fill="#cbd5e1"/><rect x="124" y="218" width="8" height="76" fill="#475569"/></g>
          <g class="msv-wheel" style="transform-origin:398px 256px"><circle cx="398" cy="256" r="38" fill="#1e293b"/><circle cx="398" cy="256" r="14" fill="#cbd5e1"/><rect x="394" y="218" width="8" height="76" fill="#475569"/></g></svg>
          <div class="msv-box-num">${msvNum(x.v, 900)}</div></div>
        <div class="msv-roadway" aria-hidden="true"></div></div>`;
    },
    // A trolley rolls in; the shopping drops in, one thing per trip (up to eight); the total on its sign.
    trolley(sc, x) {
      const shapes = ['<circle r="24" fill="#ef4444"/><path d="M0-24c2-10 8-14 16-16" stroke="#166534" stroke-width="5" fill="none"/>', '<rect x="-16" y="-36" width="32" height="66" rx="10" fill="#38bdf8"/><rect x="-8" y="-46" width="16" height="14" fill="#0ea5e9"/>', '<rect x="-30" y="-22" width="60" height="46" rx="6" fill="#fbbf24"/><rect x="-30" y="-8" width="60" height="10" fill="#f59e0b"/>', '<path d="M-10-34l20 0 8 62h-36z" fill="#fb923c"/><path d="M0-34c-4-10-4-14 0-20M0-34c6-8 10-12 16-14" stroke="#16a34a" stroke-width="5" fill="none"/>', '<ellipse rx="34" ry="22" fill="#fde68a"/><path d="M-22-6l8 12M-6-12l8 14M10-12l8 12" stroke="#d97706" stroke-width="4"/>', '<rect x="-20" y="-30" width="40" height="58" rx="4" fill="#a78bfa"/><circle cy="-2" r="12" fill="#ede9fe"/>', '<circle r="22" fill="#84cc16"/><circle cx="-6" cy="-6" r="5" fill="#d9f99d"/>', '<rect x="-34" y="-16" width="68" height="34" rx="16" fill="#f472b6"/>'];
      const n = clamp(x.n, 1, 8);
      const spots = [[186, 138], [270, 134], [354, 138], [438, 140], [226, 96], [312, 92], [396, 96], [470, 100]];
      const items = Array.from({ length: n }, (_, i) => `<g class="msv-item" style="--k:${i};transform-origin:${spots[i][0]}px ${spots[i][1]}px"><g transform="translate(${spots[i][0]} ${spots[i][1]})">${shapes[i]}</g></g>`).join('');
      return `<div class="msv-stage msv-road">${msvSkyline(211)}
        <div class="msv-trolley"><svg viewBox="0 0 620 330" aria-hidden="true" focusable="false">
          ${items}
          <path d="M160 226v34M470 226v34" stroke="#f8fafc" stroke-width="10" stroke-linecap="round"/>
          <path d="M16 26h60l34 200h404" fill="none" stroke="#f8fafc" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M90 92h490l-46 112H116z" fill="rgba(255,255,255,.2)" stroke="#f8fafc" stroke-width="12" stroke-linejoin="round"/>
          <path d="M190 96l14 104M300 96v104M410 96l-14 104M100 148h452" stroke="#f8fafc" stroke-width="6" opacity=".7"/>
          <g class="msv-wheel" style="transform-origin:160px 286px"><circle cx="160" cy="286" r="26" fill="#1e293b"/><circle cx="160" cy="286" r="9" fill="#cbd5e1"/><rect x="157" y="260" width="6" height="52" fill="#475569"/></g>
          <g class="msv-wheel" style="transform-origin:470px 286px"><circle cx="470" cy="286" r="26" fill="#1e293b"/><circle cx="470" cy="286" r="9" fill="#cbd5e1"/><rect x="467" y="260" width="6" height="52" fill="#475569"/></g></svg>
          <div class="msv-sign">${msvNum(x.v, 900)}<small>${esc(MSV_PLURAL(x.n, 'trip'))}</small></div></div>
        <div class="msv-roadway" aria-hidden="true"></div></div>`;
    },
    // A big cup fills up: 30 coffees to the brim. The little cups below count every one.
    cup(sc, x, S) {
      const brim = S && S.period === 'year' ? 300 : S && S.period === 'week' ? 7 : 30;
      const level = clamp(x.n / brim, 0.12, 1);
      // One little cup a coffee; a long list counts in fives, tens or more, and says so.
      const each = x.n <= 40 ? 1 : [5, 10, 25, 50, 100].find(g => x.n / g <= 40) || 250;
      const cups = Array.from({ length: Math.ceil(x.n / each) }, (_, i) => `<i style="--k:${i}"></i>`).join('');
      return `<div class="msv-stage msv-cupw"><div class="msv-cup" style="--lvl:${level.toFixed(3)}">
        <svg class="msv-cup-steam" viewBox="0 0 200 90" aria-hidden="true" focusable="false"><path d="M60 86c-16-18 16-34 0-60M100 86c-16-18 16-34 0-60M140 86c-16-18 16-34 0-60" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="8" stroke-linecap="round"/></svg>
        <div class="msv-cup-body"><div class="msv-cup-fill"><i></i></div></div><div class="msv-cup-lid"></div>
        <div class="msv-cup-num">${msvNum(x.v, 500)}<small>${esc(MSV_PLURAL(x.n, 'coffee'))}</small></div></div>
        <div class="msv-cups" aria-hidden="true">${cups}</div>${each > 1 ? `<small class="msv-cups-n">Each little cup is ${each} coffees</small>` : ''}</div>`;
    },
    // A plane on a dotted arc, towing the total on a banner.
    plane(sc, x) {
      return `<div class="msv-stage msv-sky"><i class="msv-cloud c1"></i><i class="msv-cloud c2"></i><i class="msv-cloud c3"></i>
        <svg class="msv-arc" viewBox="0 0 1600 420" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M-40 400C400 40 1200 40 1640 400" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="5" stroke-dasharray="4 18" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>
        <div class="msv-plane"><div class="msv-banner">${msvNum(x.v, 700)}<span>${esc(MSV_PLURAL(x.n, 'flight'))}</span></div><i class="msv-rope"></i>
        <svg viewBox="0 0 220 110" aria-hidden="true" focusable="false"><path d="M12 62c30-6 60-8 96-8l44-46h26l-22 46c16 0 34 2 46 6 12 5 12 13 0 18-12 4-30 6-46 6l22 22h-22l-34-22c-36 0-74-4-110-14z" fill="#f8fafc"/><rect x="62" y="56" width="70" height="8" rx="4" fill="#38bdf8"/><path d="M8 36l18 0 14 24H20z" fill="#38bdf8"/></svg></div></div>`;
    },
    // A heart passes from one hand to the other; a little one for each payment floats up.
    hearts(sc, x) {
      const hand = (flip) => `<svg class="msv-hand${flip ? ' r' : ''}" viewBox="0 0 400 200" aria-hidden="true" focusable="false"><path d="M84 66c34-6 62-2 86 14l40 24h66a25 25 0 0 1 22 37l54-26a26 26 0 0 1 24 46l-84 50a62 62 0 0 1-32 9H150l-66-16z" fill="#ffe4e6"/><path d="M-40 54l126 6 8 120-134-6z" fill="#7c3aed"/><path d="M76 60h14l8 120H84z" fill="#c4b5fd"/></svg>`;
      const little = Array.from({ length: Math.min(x.n, 18) }, (_, i) => `<i style="--k:${i};--x:${(i * 37) % 86 + 7}%"></i>`).join('');
      return `<div class="msv-stage msv-hearts"><div class="msv-littles" aria-hidden="true">${little}</div>${hand(false)}${hand(true)}
        <div class="msv-heart"><svg viewBox="0 0 200 180" aria-hidden="true" focusable="false"><path d="M100 176S6 118 6 54a50 50 0 0 1 94-22 50 50 0 0 1 94 22c0 64-94 122-94 122z" fill="#fb7185"/></svg><div class="msv-heart-num">${msvNum(x.v, 800)}</div></div></div>`;
    },
  };

  /* ---------- the beat ---------- */
  function msvRegister(ST) {
    ST.registerBeatType('ms-vscene', (f, b) => {
      msSetTone(f, b);
      const { sc, x } = b.vs, FS = msFS();
      const lead = x.m && FS && sc.id !== 'people' ? `<span class="msv-lead ms-in" ${msIn(2)}>${FS.merchantSymbol(x.m, x.c, { size: 'sm', badge: false, live: false })}<span>Mostly ${esc(x.name || FS.merchantCanonical(x.m))}</span></span>` : '';
      f.cards.innerHTML = `<div class="msv msv-${esc(sc.id)}">
        <div class="ms-copy msv-copy"><div class="ms-over ms-in" ${msIn(0)}>${esc(sc.over)}</div>${msSay(b, 500)}${lead}</div>
        ${MSV_ART[sc.art](sc, x, b.S)}
      </div>`;
      msCount(f.cards);
    });
    // Payday: fireworks, then where it's all going: one bar, honest shares.
    ST.registerBeatType('ms-payday', (f, b) => {
      msSetTone(f, b);
      const S = b.S, K = S.kept;
      const burst = (cls, cx, cy, delay, col) => `<span class="msv-burst ${cls}" style="--x:${cx}%;--y:${cy}%;--d:${delay}s;--c:${col}">${Array.from({ length: 14 }, (_, i) => `<i style="--a:${i * 360 / 14}deg"></i>`).join('')}</span>`;
      const base = Math.max(K.inc, K.out, 1);
      const top = S.cats.slice(0, 4);
      const rest = Math.max(0, K.out - top.reduce((t, c) => t + c.v, 0));
      const parts = top.map(c => ({ l: c.c, v: c.v, col: catColor(c.c), ic: msFS() ? msFS().categoryIcon(c.c, { size: 'xs', live: false, plain: true, color: '#fff' }) : '' }));
      if (rest > 0.5) parts.push({ l: 'Everything else', v: rest, col: 'rgba(255,255,255,.4)', ic: '' });
      if (K.kept > 0.5) parts.push({ l: 'Kept', v: K.kept, col: '#fff', ink: '#0f172a', ic: '' });
      const hide = msvHidden();
      const bar = parts.map((p, i) => `<span class="msv-flow-p" style="--w:${(p.v / base * 100).toFixed(2)};--c:${p.col};--k:${i}${p.ink ? `;--ink:${p.ink}` : ''}" title="${esc(p.l)}"><b>${p.ic}${esc(p.l)}</b><em class="num">${esc(hide ? '•••' : gbp(p.v))}</em></span>`).join('');
      f.cards.innerHTML = `<div class="msv msv-payday">
        <div class="msv-fire" aria-hidden="true">${burst('b1', 18, 26, 0.2, '#fde68a')}${burst('b2', 78, 18, 0.7, '#f9a8d4')}${burst('b3', 50, 12, 1.2, '#a5f3fc')}${burst('b4', 30, 44, 1.8, '#c4b5fd')}${burst('b5', 70, 42, 2.3, '#bbf7d0')}</div>
        <div class="ms-copy msv-copy centred"><div class="ms-over ms-in" ${msIn(0)}>${esc(b.over || 'Money in')}</div><div class="ms-num ms-in" ${msIn(1)}>${msvNum(K.inc, 400)}</div>${msSay(b, 620)}</div>
        <div class="msv-flow ms-in" ${msIn(3)}><div class="msv-flow-h">Where it’s all going</div><div class="msv-flow-b">${bar}</div></div>
      </div>`;
      msCount(f.cards);
    });
    // A year's months, rising one by one. The busiest stays lit.
    ST.registerBeatType('ms-months', (f, b) => {
      msSetTone(f, b);
      const S = b.S, ms = S.months || [];
      const max = Math.max(1, ...ms.map(m => m.v)); const hide = msvHidden();
      const bars = ms.map((m, i) => `<span class="msv-mo${m.v === max ? ' top' : ''}" style="--h:${Math.round(m.v / max * 100)};--k:${i}"><em class="num">${esc(hide ? '' : gbpShort(m.v))}</em><i></i><small>${esc(fd(m.n, { month: 'short' }))}</small></span>`).join('');
      f.cards.innerHTML = `<div class="ms ms-monthsb"><div class="ms-copy"><div class="ms-over ms-in" ${msIn(0)}>Month by month</div>${msSay(b, 500)}</div><div class="ms-viz msv-months ms-in" ${msIn(1)}>${bars}</div></div>`;
    });
  }
  /** The extra beats for a story: scenes after the top places, payday and months where they belong. */
  function msvExtraBeats(S, tone) {
    const fmt = mbFmt(), M = v => fmt.money(v), W = MSM.words(S, fmt);
    const hide = msvHidden();
    const out = { scenes: [], payday: null, months: null };
    for (const v of msvBeats(S)) {
      // Who it was mostly: the name from the model's groups.
      const lead = v.x.lead || null;
      const say = hide ? v.sc.quiet : v.line;
      out.scenes.push({ id: 'scene-' + v.sc.id, type: 'ms-vscene', say, text: say, entities: hide ? [] : msEntities(say, S), S, vs: { sc: v.sc, x: Object.assign({}, v.x, lead ? { m: lead.m, c: lead.c, name: lead.name } : {}) }, tone: v.sc.tone, bg: { tod: 'night', cond: 'none' }, hold: msvHoldMs });
    }
    if (S.kept.inc >= 100 && S.period !== 'week' && S.cats.length) {
      const say = hide ? 'Money came in. Here is where it’s all going.' : `${S.period === 'year' ? 'Your paydays' : 'Payday'}: ${M(S.kept.inc)} came in ${W.in}. Here's where it's all going.`;
      out.payday = { id: 'payday', type: 'ms-payday', say, text: say, entities: hide ? [] : msEntities(say, S), S, tone: 'violet', bg: { tod: 'night', cond: 'none' }, hold: 6200 };
    }
    if (S.period === 'year' && S.months && S.months.length > 1) {
      const top = S.months.reduce((p, q) => (q.v > p.v ? q : p), S.months[0]);
      const low = S.months.reduce((p, q) => (q.v < p.v ? q : p), S.months[0]);
      const say = hide ? 'Your year, month by month.' : `${fd(top.n, { month: 'long' })} was your biggest month at ${M(top.v)}, and ${fd(low.n, { month: 'long' })} your quietest at ${M(low.v)}.`;
      out.months = { id: 'months', type: 'ms-months', say, text: say, entities: hide ? [] : msEntities(say, S), S, tone: 'blue', bg: { tod: 'night', cond: 'none' }, hold: 5600 };
    }
    return out;
  }
