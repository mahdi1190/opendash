/* ============================================================
   ANIMATED CONTENT LIBRARY (owner: Brief + Review). PURE classic script:
   no DOM, no page globals, nothing runs at load except building constants,
   so lib/brief-logic.mjs can evaluate it in Node (tests, the brief.get
   query) exactly as the page does.

   ANIM_SCENES  the registry ("database") of animated mini-scenes. Each entry:
     { type, label, cat, colour (a --sw-* swatch name), loop: 'subtle'|'once',
       keywords: [...], match(f) -> bonus score from the item's features, svg() }
     svg() returns trusted inline-SVG markup (no user text ever goes in it).
     Classes in the markup: fills k c s w m, strokes ln lk lc lm lw (+ t thick),
     motion x-* (src/styles/71-anim-library.css; transform/opacity only).
   animFeatures(item)       event or task (plain object) -> features
   animClassify(item, opts) -> {type, score, source, why}
       opts: {rules:[{kw, type}], overrides:{key:type}, ai:{titleKey:type}}
   animSceneSvg(type)       the scene's SVG (fallback 'event')
   animKey(item)            the key overrides use ('t:<id>' / 'e:<title>')
   ============================================================ */
const ANIM_CATEGORIES = Object.freeze({
  work: 'Work', social: 'Social', celebrate: 'Celebrations', travel: 'Travel', sport: 'Sport',
  health: 'Health', life: 'Life', home: 'Home', learning: 'Learning', admin: 'Admin & money', generic: 'General',
});

/* ---------- shared bits of markup ---------- */
const _AS_SPARK = (x, y, r, d) => `<path class="c x-twinkle" style="--d:${d || 0}s" d="M${x} ${y - r}l${r * 0.3} ${r * 0.7} ${r * 0.7} ${r * 0.3}-${r * 0.7} ${r * 0.3}-${r * 0.3} ${r * 0.7}-${r * 0.3}-${r * 0.7}-${r * 0.7}-${r * 0.3} ${r * 0.7}-${r * 0.3}z"/>`;
const _AS_PERSON = (x, y, cls, d, extra) => `<g class="${extra || 'x-pop'}" style="--d:${d || 0}s"><circle class="${cls}" cx="${x}" cy="${y}" r="4.5"/><path class="${cls}" d="M${x - 7.5} ${y + 12}a7.5 6.5 0 0 1 15 0z"/></g>`;
const _AS_STEAM = (x, y, d) => `<path class="lm x-steam" style="--d:${d || 0}s" d="M${x} ${y}c-2.5-3 2.5-5 0-8.5"/>`;
const _AS_WAVE = (y, cls, d) => `<g class="x-wave" style="--d:${d || 0}s"><path class="${cls}" d="M-12 ${y}q3-4 6 0t6 0 6 0 6 0 6 0 6 0 6 0 6 0 6 0 6 0 6 0 6 0 6 0 6 0"/></g>`;
const _AS_CONFETTI = (n, seed) => {
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = 6 + ((i * 37 + (seed || 0) * 11) % 52), y = 2 + ((i * 13) % 14), d = ((i * 0.37) % 2).toFixed(2);
    out += `<rect class="${i % 3 === 0 ? 'k' : i % 3 === 1 ? 'c' : 's'} x-fall" style="--d:${d}s" x="${x}" y="${y}" width="3" height="5" rx="1"/>`;
  }
  return out;
};

/* Well-known cities and countries: an all-day event that STARTS with one ("Vienna", "Lisbon visit") is a trip;
   "Sam in Oxford" or "Sam London" is where someone else is (normalised text, spaces as word edges). */
const _AS_PLACES = new RegExp('^ (' + ['london', 'manchester', 'cambridge', 'oxford', 'bristol', 'edinburgh', 'glasgow', 'birmingham', 'leeds', 'liverpool', 'belfast', 'cardiff', 'york',
  'newcastle', 'norwich', 'coventry', 'nottingham', 'exeter', 'brighton', 'bath', 'dublin', 'paris', 'frankfurt', 'berlin', 'munich', 'prague', 'vienna', 'rome', 'milan', 'madrid',
  'barcelona', 'lisbon', 'amsterdam', 'brussels', 'zurich', 'geneva', 'copenhagen', 'stockholm', 'oslo', 'new york', 'boston', 'san francisco', 'chicago', 'minneapolis', 'toronto',
  'tokyo', 'singapore', 'dubai', 'istanbul', 'usa', 'america', 'canada', 'france', 'germany', 'italy', 'spain', 'portugal', 'greece', 'turkey', 'japan', 'china', 'india',
  'pakistan', 'thailand', 'vietnam', 'australia', 'scotland', 'wales', 'ireland', 'egypt', 'morocco', 'mexico', 'brazil'].join('|') + ') ');

/* ---------- the registry ---------- */
const ANIM_SCENES = [
  // ── Celebrations first: they are the most specific words ──
  { type: 'birthday', label: 'Birthday', cat: 'celebrate', colour: 'pink', loop: 'subtle',
    keywords: ['birthday', 'birthdays', 'bday', 'b-day', 'b day', '🎂', '🎁', 'birthday party'],
    match: (f) => (/birthday/i.test(f.calendar) || f.eventType === 'birthday' ? 4 : 0),
    svg: () => `<rect class="s lc" x="12" y="34" width="40" height="20" rx="3"/><path class="c" d="M12 37a3 3 0 0 1 3-3h34a3 3 0 0 1 3 3v4c-3 3-7 3-10 0-3 3-7 3-10 0-3 3-7 3-10 0-3 3-7 3-10 0z"/>`
      + [20, 30.5, 41].map((x, i) => `<rect class="w lm" x="${x}" y="24" width="3" height="10" rx="1"/><path class="c x-flicker" style="--d:${i * 0.23}s" d="M${x + 1.5} 14c2.3 3 3 5.4 0 7.6-3-2.2-2.3-4.6 0-7.6z"/>`).join('')
      + `<rect class="m" x="8" y="54" width="48" height="3" rx="1.5"/>` },
  { type: 'wedding', label: 'Wedding', cat: 'celebrate', colour: 'pink', loop: 'subtle',
    keywords: ['wedding', 'weddings', 'engagement', 'nikah', 'marriage', 'married', 'bride', 'groom', '💍'],
    match: () => 0,
    svg: () => `<circle class="lc t" cx="25" cy="38" r="11"/><circle class="lk t" cx="39" cy="38" r="11"/><path class="c" d="M21 24l4-6 4 6-4 4z"/>`
      + [[10, 0, 9], [22, 0.9, 3], [46, 0.4, 7], [56, 1.4, 13], [36, 1.8, 2]].map(([x, d, y], i) => `<ellipse class="${i % 2 ? 's' : 'c'} x-fall" style="--d:${d}s" cx="${x}" cy="${y}" rx="2" ry="3.4"/>`).join('') },
  { type: 'celebration', label: 'Celebration / graduation', cat: 'celebrate', colour: 'violet', loop: 'subtle',
    keywords: ['graduation', 'graduate', 'conferring', 'ceremony', 'award', 'awards', 'prize', 'launch', 'celebrate', 'celebration', 'milestone', 'anniversary', 'congratulations', 'eid', 'christmas', 'new year', 'diwali', 'hanukkah', '🏆', '🎓', '🥂'],
    match: () => 0,
    // a mortarboard with a swinging tassel, sparkles around it
    svg: () => `<path class="k" d="M18 30v8c0 3.6 6.3 6.6 14 6.6s14-3 14-6.6v-8l-14 6z"/><path class="c" d="M32 14l25 10.5L32 35 7 24.5z"/><circle class="k" cx="32" cy="24.5" r="2"/>`
      + `<g class="x-swing o-v" style="transform-origin:32px 24.5px"><path class="lk" d="M32 24.5l17.5 3.2V39"/><rect class="c" x="47.5" y="38" width="4" height="7" rx="1.5"/></g>`
      + _AS_SPARK(10, 44, 5, 0.3) + _AS_SPARK(55, 9, 5.5, 1.1) + _AS_SPARK(12, 9, 3.5, 0.7)
      + `<g class="x-burst" style="--d:.5s"><path class="lc" d="M56 47v3M56 58v3M50 54h3M59 54h3"/></g>` },
  { type: 'party', label: 'Party', cat: 'celebrate', colour: 'pink', loop: 'subtle',
    keywords: ['party', 'parties', 'stag', 'stag do', 'hen do', 'hen party', 'bash', 'rave', 'disco', 'ball', 'gala', 'prom', 'games night', 'house party', 'leaving party', 'leaving', 'staff party', 'festival', 'fiesta', 'celebrations', '🎉', '🥳', '🎊'],
    match: (f) => (f.evening ? 0.3 : 0),
    svg: () => `<g class="x-float2"><ellipse class="c" cx="17" cy="22" rx="8" ry="10"/><path class="lm" d="M17 32q-2 8 2 18"/></g>`
      + `<g class="x-float2" style="--d:.9s"><ellipse class="s lc" cx="33" cy="17" rx="8" ry="10"/><path class="lm" d="M33 27q2 9-2 22"/></g>`
      + `<g class="x-float2" style="--d:.4s"><ellipse class="k" cx="49" cy="24" rx="7" ry="9"/><path class="lm" d="M49 33q-2 8 1 16"/></g>`
      + _AS_CONFETTI(7, 2) },

  // ── Social ──
  { type: 'coffee', label: 'Coffee', cat: 'social', colour: 'amber', loop: 'subtle',
    keywords: ['coffee', 'cafe', 'café', 'tea', 'latte', 'cuppa', 'espresso', 'starbucks', 'costa', 'pret', 'social coffee', 'brew', 'brews', '☕'],
    match: (f) => (f.morning ? 0.2 : 0),
    svg: () => `<path class="c" d="M14 28h28v13a13 13 0 0 1-13 13h-2a13 13 0 0 1-13-13z"/><path class="lc t" d="M42 32h3a5 5 0 0 1 0 10h-3"/><rect class="m" x="9" y="55" width="38" height="3" rx="1.5"/>`
      + _AS_STEAM(22, 22, 0) + _AS_STEAM(28, 21, 0.6) + _AS_STEAM(34, 22, 1.2) },
  { type: 'dinner', label: 'Dinner / restaurant', cat: 'social', colour: 'orange', loop: 'subtle',
    keywords: ['dinner', 'lunch', 'breakfast', 'brunch', 'restaurant', 'meal', 'eat', 'eating out', 'food', 'supper', 'nandos', "nando's", 'pizza', 'curry', 'balti', 'takeaway', 'bbq', 'barbecue', 'buffet', 'iftar', '🍽', '🍕', '🍔'],
    match: (f) => (f.evening ? 0.4 : 0),
    svg: () => `<circle class="w lm" cx="32" cy="40" r="16"/><circle class="s" cx="32" cy="40" r="10"/><path class="lk" d="M9 27v28M6 27v7a3 3 0 0 0 6 0v-7"/><path class="lk" d="M55 55V27c-3 0-4 6-4 12h4"/>`
      + _AS_STEAM(27, 26, 0) + _AS_STEAM(32, 25, 0.7) + _AS_STEAM(37, 26, 1.4) },
  { type: 'drinks', label: 'Drinks / pub', cat: 'social', colour: 'amber', loop: 'subtle',
    keywords: ['drinks', 'drink', 'pub', 'bar', 'beer', 'beers', 'wine', 'cocktail', 'cocktails', 'pint', 'pints', 'social', 'leaving drinks', 'leaving do', 'happy hour', 'reception', 'drinks reception', 'night out', 'girls night', 'boys night', 'lads', '🍻', '🍷', '🍸'],
    match: (f) => (f.evening ? 0.5 : 0),
    svg: () => `<g class="x-clinkl o-v" style="transform-origin:20px 58px"><path class="s lc" d="M11 18h17l-2.5 27h-12z"/><path class="c" d="M12.3 29h14.4l-1.5 16h-11.4z"/><rect class="lc" x="18" y="45" width="2" height="9"/><rect class="m" x="13" y="54" width="12" height="2.5" rx="1"/></g>`
      + `<g class="x-clinkr o-v" style="transform-origin:44px 58px"><path class="s lc" d="M36 18h17l-2.5 27h-12z"/><path class="c" d="M37.3 29h14.4l-1.5 16h-11.4z"/><rect class="lc" x="43" y="45" width="2" height="9"/><rect class="m" x="38" y="54" width="12" height="2.5" rx="1"/></g>`
      + _AS_SPARK(32, 10, 6, 0.3) },
  { type: 'friends', label: 'Friends', cat: 'social', colour: 'pink', loop: 'subtle',
    keywords: ['friends', 'mates', 'hang out', 'hangout', 'meet up', 'meetup', 'catch up with', 'sleepover', 'board games', 'games', 'reunion', 'get together', 'get-together'],
    match: (f) => (f.allDay && f.names >= 2 ? 3 : 0),
    svg: () => _AS_PERSON(16, 26, 'c', 0, 'x-bob') + _AS_PERSON(32, 22, 'k', 0.4, 'x-bob') + _AS_PERSON(48, 26, 'c', 0.8, 'x-bob')
      + `<path class="lc t x-wave-hand o-b" d="M54.5 34.5l4.5-9"/><rect class="m" x="6" y="48" width="52" height="2.5" rx="1"/>` },

  // ── Travel ──
  { type: 'flight', label: 'Flight', cat: 'travel', colour: 'blue', loop: 'subtle',
    keywords: ['flight', 'flights', 'fly', 'flying', 'airport', 'plane', 'heathrow', 'gatwick', 'stansted', 'luton', 'boarding', 'departure', 'layover', 'terminal', 'airline', 'easyjet', 'ryanair', 'british airways', 'lufthansa', 'klm', 'air france', 'emirates', 'qatar airways', 'jet2', 'wizz air', 'tui', '✈', '✈️', '🛫', '🛬'],
    match: (f) => (f.flightCode ? 4 : 0),
    svg: () => `<path class="lm dash" d="M4 48A30 30 0 0 1 60 48"/><circle class="k" cx="4" cy="48" r="2.5"/><circle class="c" cx="60" cy="48" r="2.5"/>`
      // the plane points the way it flies (left to right along the arc)
      + `<g class="x-arc o-v" style="transform-origin:32px 58.8px"><path class="c" d="M47 28.8c0-1.5-1.4-2.4-3.2-2.4h-7.6L28.4 14.6h-3.6l3.8 11.8h-7l-2.8-3.9h-2.8l1.7 6.3-1.7 6.3h2.8l2.8-3.9h7L24.8 43h3.6l7.8-11.8h7.6c1.8 0 3.2-.9 3.2-2.4z"/></g>` },
  { type: 'train', label: 'Train', cat: 'travel', colour: 'teal', loop: 'subtle',
    keywords: ['train', 'trains', 'rail', 'railway', 'station', 'tube', 'underground', 'metro', 'tram', 'eurostar', 'lner', 'avanti', 'crosscountry', 'northern rail', 'tpe', '🚆', '🚂', '🚄'],
    match: () => 0,
    svg: () => `<g class="x-chug"><rect class="c" x="4" y="22" width="27" height="22" rx="5"/><rect class="s lc" x="33" y="22" width="27" height="22" rx="5"/>`
      + `<rect class="w" x="9" y="27" width="7" height="7" rx="1.5"/><rect class="w" x="19" y="27" width="7" height="7" rx="1.5"/><rect class="w" x="38" y="27" width="7" height="7" rx="1.5"/><rect class="w" x="48" y="27" width="7" height="7" rx="1.5"/></g>`
      + [11, 24, 40, 53].map(x => `<g class="x-spin"><circle class="k" cx="${x}" cy="46" r="3.5"/><rect class="w" x="${x - 0.6}" y="43" width="1.2" height="2.6"/></g>`).join('')
      + `<rect class="m" x="0" y="50" width="64" height="2"/><g class="x-slidel">${[0, 10, 20, 30, 40, 50, 60, 70].map(x => `<rect class="m" x="${x}" y="53" width="5" height="2" rx="1"/>`).join('')}</g>` },
  { type: 'car', label: 'Drive', cat: 'travel', colour: 'slate', loop: 'subtle',
    keywords: ['drive', 'car', 'road trip', 'roadtrip', 'taxi', 'uber', 'parking', 'mot', 'petrol', 'pick up from', 'lift to', 'car service', '🚗', '🚙'],
    match: () => 0,
    svg: () => `<g class="x-bob"><path class="c" d="M8 40l4-11a5 5 0 0 1 5-3h26a5 5 0 0 1 4.5 2.8L53 38h3a3 3 0 0 1 3 3v5H5v-3a3 3 0 0 1 3-3z"/><path class="w" d="M16 37l3-7h9v7zM32 37v-7h10l3.5 7z"/></g>`
      + [17, 47].map(x => `<g class="x-spin"><circle class="k" cx="${x}" cy="47" r="5"/><circle class="w" cx="${x}" cy="47" r="1.8"/></g>`).join('')
      + `<g class="x-slidel">${[0, 14, 28, 42, 56, 70].map(x => `<rect class="m" x="${x}" y="56" width="8" height="2" rx="1"/>`).join('')}</g>` },
  { type: 'holiday', label: 'Holiday / beach', cat: 'travel', colour: 'teal', loop: 'subtle',
    keywords: ['holiday', 'holidays', 'vacation', 'beach', 'annual leave', 'a/l', 'al', 'leave', 'pto', 'day off', 'out of office', 'ooo', 'getaway', 'resort', 'seaside', 'staycation', '🏖', '🌴', '🏝'],
    match: (f) => (f.allDay && f.days >= 3 ? 1.5 : 0) + (f.allDay && / off /.test(f.tNorm) ? 3 : 0),
    svg: () => `<circle class="c x-glow" cx="44" cy="20" r="9"/><path class="lk" d="M18 46V22"/><path class="c" d="M18 22c-6 0-11 3-12 7 4-2 8-2 12 0 4-2 8-2 12 0-1-4-6-7-12-7z"/>`
      + _AS_WAVE(42, 'lc', 0) + _AS_WAVE(50, 'lm', -0.8) + `<path class="s" d="M0 54h64v10H0z"/>` },
  { type: 'travel', label: 'Travel', cat: 'travel', colour: 'blue', loop: 'subtle',
    // hotel / airbnb / check-in moved to 'hotel', luggage / pack for to 'packing' (travel spec 4.7)
    keywords: ['travel', 'trip to', 'journey', 'commute', 'abroad', 'away', 'passport control'],
    match: (f) => (f.allDay && f.days >= 2 && !f.names ? 0.5 : 0) + (f.allDay && f.place ? 3.5 : 0),
    svg: () => `<rect class="c" x="12" y="24" width="32" height="28" rx="4"/><path class="lk" d="M22 24v-5h12v5"/><rect class="w" x="19" y="30" width="2.5" height="16" rx="1"/><rect class="w" x="34.5" y="30" width="2.5" height="16" rx="1"/>`
      + `<circle class="k" cx="18" cy="55" r="2.5"/><circle class="k" cx="38" cy="55" r="2.5"/>`
      + `<g class="x-bounce o-b"><path class="k" d="M51 6a7 7 0 0 1 7 7c0 6-7 12-7 12s-7-6-7-12a7 7 0 0 1 7-7z"/><circle class="w" cx="51" cy="13" r="2.5"/></g>` },
  // ── Travel moments (travel spec 4.7; owner of this block: MOMENTS). A flight shows takeoff the
  //    day before, flight in the air and landing after (f.startsSoon / f.endedRecently). ──
  { type: 'landing', label: 'Landing', cat: 'travel', colour: 'blue', loop: 'subtle',
    keywords: ['landing', 'touchdown', 'arrivals hall'],
    match: (f) => (f.flightCode && f.endedRecently ? 8 : 0),
    svg: () => `<rect class="m" x="2" y="54" width="60" height="2.5" rx="1"/>${[8, 22, 36, 50].map(x => `<rect class="w" x="${x}" y="54.6" width="7" height="1.2" rx=".6"/>`).join('')}`
      + `<g class="x-land o-v" style="transform-origin:34px 46px"><path class="c" d="M50 44.2c0-1.6-2.1-2.8-5-2.8H20.6l-4.6-6.2h-3.1l2.2 7c-1.5.5-1.9 1.6-1 2.6.9.9 2.6 1.3 4.6 1.3H45c2.9 0 5-.8 5-1.9z"/>`
      + `<path class="c" d="M35.8 44.3L28.3 50.8h3.4l10.2-6.5z" opacity=".85"/><path class="lk" d="M45 46.6v3.4M27 46.8v3"/><circle class="k" cx="45" cy="51" r="1.4"/><circle class="k" cx="27" cy="50.8" r="1.4"/></g>` },
  { type: 'takeoff', label: 'Take-off', cat: 'travel', colour: 'blue', loop: 'subtle',
    keywords: ['takeoff', 'take-off', 'departures', '🛫'],
    match: (f) => (f.flightCode && f.startsSoon ? 8 : 0),
    svg: () => `<rect class="m" x="2" y="54" width="60" height="2.5" rx="1"/><path class="lm x-contrail o-l" d="M6 51h20"/>`
      + `<g class="x-takeoff o-v" style="transform-origin:30px 50px"><path class="c" d="M44 48.2c0-1.6-2.1-2.8-5-2.8H14.6l-4.6-6.2H6.9l2.2 7c-1.5.5-1.9 1.6-1 2.6.9.9 2.6 1.3 4.6 1.3H39c2.9 0 5-.8 5-1.9z"/>`
      + `<path class="c" d="M29.8 48.3L22.3 54.8h3.4l10.2-6.5z" opacity=".85"/></g>` },
  { type: 'layover', label: 'Layover', cat: 'travel', colour: 'slate', loop: 'subtle',
    keywords: ['stopover', 'connecting flight', 'connection at'],
    match: () => 0,
    svg: () => `<rect class="m" x="2" y="54" width="60" height="2.5" rx="1"/><path class="c" d="M40 48.2c0-1.6-2.1-2.8-5-2.8H10.6l-4.6-6.2H2.9l2.2 7c-1.5.5-1.9 1.6-1 2.6.9.9 2.6 1.3 4.6 1.3H35c2.9 0 5-.8 5-1.9z"/>`
      + `<path class="lk" d="M30 49.6v3M14 49.6v3"/><circle class="w lc t" cx="48" cy="20" r="11"/><path class="lk" d="M48 20v-6"/><g class="x-hand o-v" style="transform-origin:48px 20px"><path class="lc t" d="M48 20l5 3"/></g>` },
  { type: 'hotel', label: 'Hotel', cat: 'travel', colour: 'violet', loop: 'subtle',
    keywords: ['hotel', 'airbnb', 'hostel', 'check-in', 'ryokan', 'guesthouse', 'guest house', 'motel', 'b&b', 'accommodation', '🏨'],
    match: (f) => (f.physical && / check (in|out) /.test(f.tNorm) ? 1 : 0),
    svg: () => `<path class="lk" d="M8 22v34M56 40v16M8 48h48"/><rect class="s lc" x="8" y="38" width="48" height="10" rx="2"/><rect class="c" x="12" y="30" width="14" height="8" rx="3"/>`
      + `<g class="x-swing o-v" style="transform-origin:46px 12px"><path class="lm" d="M46 12v8"/><rect class="c" x="41" y="20" width="10" height="13" rx="2.5"/><circle class="w" cx="46" cy="24" r="1.6"/></g>` },
  { type: 'ferry', label: 'Ferry', cat: 'travel', colour: 'teal', loop: 'subtle',
    keywords: ['ferry', 'ferries', 'crossing', 'sailing', 'boat to', 'p&o', 'stena', 'brittany ferries', 'catamaran', '⛴', '🚢'],
    match: () => 0,
    svg: () => `<g class="x-bob"><path class="c" d="M8 38h48l-6 12H14z"/><rect class="s lc" x="18" y="28" width="26" height="10" rx="2"/><rect class="w" x="22" y="31" width="4" height="4" rx="1"/><rect class="w" x="29" y="31" width="4" height="4" rx="1"/><rect class="w" x="36" y="31" width="4" height="4" rx="1"/><rect class="k" x="38" y="20" width="4" height="8" rx="1"/></g>`
      + _AS_WAVE(53, 'lc', 0) + _AS_WAVE(58, 'lm', -0.8) },
  { type: 'coach', label: 'Coach / bus', cat: 'travel', colour: 'green', loop: 'subtle',
    keywords: ['coach', 'coach to', 'bus to', 'flixbus', 'megabus', 'national express', 'shuttle bus', 'airport bus', '🚌'],
    match: () => 0,
    svg: () => `<g class="x-bob"><rect class="c" x="6" y="22" width="52" height="24" rx="5"/><rect class="w" x="10" y="27" width="9" height="8" rx="1.5"/><rect class="w" x="22" y="27" width="9" height="8" rx="1.5"/><rect class="w" x="34" y="27" width="9" height="8" rx="1.5"/><rect class="w" x="46" y="27" width="8" height="12" rx="1.5"/></g>`
      + [16, 46].map(x => `<g class="x-spin"><circle class="k" cx="${x}" cy="47" r="4.5"/><circle class="w" cx="${x}" cy="47" r="1.6"/></g>`).join('')
      + `<g class="x-slidel">${[0, 14, 28, 42, 56, 70].map(x => `<rect class="m" x="${x}" y="56" width="8" height="2" rx="1"/>`).join('')}</g>` },
  { type: 'passport', label: 'Passport / visa', cat: 'travel', colour: 'indigo', loop: 'subtle',
    keywords: ['passport', 'visa', 'esta', 'etias', 'evisa', 'e-visa', 'eta application', 'visa application'],
    match: (f) => (f.kind === 'task' && / (esta|etias|evisa|e visa|visa) /.test(f.tNorm) ? 3.5 : 0),
    svg: () => `<rect class="c" x="14" y="14" width="30" height="40" rx="3"/><circle class="lw" cx="29" cy="30" r="7"/><path class="lw" d="M22 30h14M29 23c-3 4-3 10 0 14M29 23c3 4 3 10 0 14"/><rect class="w" x="21" y="44" width="16" height="2" rx="1"/>`
      + `<g class="x-stamp"><rect class="k" x="44" y="8" width="10" height="9" rx="2"/><rect class="m" x="42" y="17" width="14" height="4" rx="1.5"/></g><rect class="lc x-mark" x="40" y="34" width="16" height="10" rx="2" transform="rotate(-10 48 39)"/>` },
  { type: 'packing', label: 'Packing', cat: 'travel', colour: 'amber', loop: 'subtle',
    keywords: ['pack', 'packing', 'packing list', 'luggage', 'suitcase', 'pack for', 'carry-on', 'hand luggage', '🧳'],
    match: () => 0,
    svg: () => `<rect class="c" x="12" y="30" width="40" height="24" rx="4"/><rect class="w" x="18" y="36" width="2.5" height="14" rx="1"/><rect class="w" x="43.5" y="36" width="2.5" height="14" rx="1"/>`
      + `<g class="x-lid o-v" style="transform-origin:12px 30px"><rect class="s lc" x="12" y="24" width="40" height="6" rx="2"/><path class="lk" d="M27 24v-4h10v4"/></g>`
      + `<g class="x-drop"><rect class="k" x="24" y="8" width="7" height="10" rx="2"/></g><g class="x-drop" style="--d:.7s"><circle class="c" cx="38" cy="12" r="4"/></g>` },
  { type: 'checkin', label: 'Online check-in', cat: 'travel', colour: 'blue', loop: 'subtle', prio: 1,
    keywords: ['check in online', 'online check in', 'online check-in', 'checkin online', 'boarding pass', 'boarding passes', 'seat selection', 'choose seats', 'select seats'],
    match: () => 0,
    svg: () => `<rect class="w lm" x="12" y="40" width="40" height="16" rx="3"/><g class="x-passout"><rect class="s lc" x="16" y="12" width="32" height="34" rx="3"/><path class="lk" d="M22 20h14M22 26h9"/>`
      + `<g class="x-blink">${[22, 25, 27, 30, 34, 36, 39, 42].map((x, i) => `<rect class="k" x="${x}" y="33" width="${i % 3 ? 1.2 : 2}" height="8"/>`).join('')}</g></g>` },
  { type: 'currency', label: 'Currency / travel money', cat: 'travel', colour: 'green', loop: 'subtle',
    keywords: ['currency', 'currency exchange', 'exchange money', 'travel money', 'foreign cash', 'bureau de change', 'forex', 'travel card', '💱'],
    match: () => 0,
    svg: () => `<rect class="m" x="14" y="54" width="36" height="3" rx="1.5"/><g class="x-coin"><circle class="c" cx="32" cy="32" r="17"/><circle class="lw" cx="32" cy="32" r="13"/>`
      + `<g class="x-face-a"><path class="lw t" d="M37 25c-2-2.5-8-2.5-9 0.5s3 4.5 5 5 6 2.5 5 5.5-7 3-9.5 0.5M32 21.5v21"/></g>`
      + `<g class="x-face-b"><path class="lw t" d="M38.5 25.5a8 8 0 1 0 0 13M25 30h10M25 34h10"/></g></g>` },
  { type: 'jetlag', label: 'Jet lag / body clock', cat: 'travel', colour: 'indigo', loop: 'subtle',
    keywords: ['jet lag', 'jetlag', 'jet-lag', 'body clock'],
    match: () => 0,
    svg: () => `<g class="x-sunset"><circle class="c" cx="22" cy="30" r="9"/><path class="lc" d="M22 15v3M10 30H7M37 30h-3M13.5 21.5l2 2M30.5 21.5l-2 2"/></g>`
      + `<g class="x-moonrise"><path class="k" d="M46 20a10 10 0 1 0 8 14 8 8 0 1 1-8-14z"/></g><rect class="m" x="4" y="44" width="56" height="3" rx="1.5"/><rect class="s" x="4" y="47" width="56" height="13" rx="2"/>` },
  { type: 'homecoming', label: 'Homecoming', cat: 'travel', colour: 'orange', loop: 'subtle',
    keywords: ['flight home', 'fly home', 'back home', 'return flight', 'homecoming', 'welcome home', 'home again'],
    match: () => 0,
    svg: () => `<path class="k" d="M30 56V30l14-11 14 11v26z"/><rect class="c x-doorlight" x="40" y="40" width="8" height="16" rx="1.5"/><rect class="m" x="2" y="56" width="60" height="2.5" rx="1"/>`
      + `<g class="x-rollin"><rect class="c" x="8" y="40" width="14" height="13" rx="2.5"/><path class="lc" d="M12 40v-4h6v4"/><circle class="k" cx="11" cy="55" r="1.8"/><circle class="k" cx="19" cy="55" r="1.8"/></g>` },
  // Motifs (spec 4.6): the 64 px picture of a place kind (trips list, Trip widget S, Trip view header).
  { type: 'oldtown', label: 'Old town', cat: 'travel', colour: 'amber', loop: 'subtle',
    keywords: [],
    match: () => 0,
    svg: () => `<path class="s" d="M4 56V38l8-7 8 7v18zM20 56V34l6-6 6 6v22zM44 56V36l8-7 8 7v20z"/><path class="c" d="M32 56V22l3-12 3 12v34z"/><rect class="w" x="9" y="44" width="5" height="6" rx="1"/><rect class="w" x="24" y="40" width="4" height="6" rx="1"/><rect class="w" x="49" y="42" width="5" height="6" rx="1"/>`
      + `<g class="x-flag o-l" style="transform-origin:35px 9px"><path class="k" d="M35 4l9 3-9 3z"/></g><rect class="m" x="2" y="56" width="60" height="2.5" rx="1"/>` },
  { type: 'tropical', label: 'Tropical', cat: 'travel', colour: 'teal', loop: 'subtle',
    keywords: [],
    match: () => 0,
    svg: () => `<circle class="c x-glow" cx="48" cy="16" r="7"/><path class="lk t" d="M20 50c-1-12 1-22 6-30"/>`
      + `<g class="x-tree o-v" style="transform-origin:26px 20px"><path class="c" d="M26 20c-6-6-14-6-18-2 6-1 11 0 18 2zM26 20c3-8 10-10 15-8-6 1-10 4-15 8zM26 20c8-2 14 1 16 6-5-3-10-4-16-6zM26 20c-7 1-12 6-12 11 3-5 7-8 12-11z"/></g>`
      + `<path class="s" d="M0 50h64v14H0z"/>` + _AS_WAVE(53, 'lc', 0) + _AS_WAVE(58, 'lm', -0.8) },

  // ── Sport ──
  { type: 'run', label: 'Run', cat: 'sport', colour: 'orange', loop: 'subtle',
    keywords: ['run', 'running', 'jog', 'jogging', 'parkrun', 'park run', '5k', '10k', 'half marathon', 'marathon', 'race', 'track session', '🏃'],
    match: (f) => (f.weekday === 6 && f.start !== null && f.start <= 9.5 * 60 ? 0.3 : 0),
    svg: () => `<g class="x-runbob"><circle class="c" cx="38" cy="13" r="5"/><path class="lc t" d="M36 21l-4 13 8 6 2 12M32 34l-8 6-6-2M35 24l8 6 6-4M35 24l-9 2-4 6"/></g>`
      + [[4, 22, 0], [2, 30, 0.25], [6, 38, 0.5]].map(([x, y, d]) => `<rect class="m x-trail" style="--d:${d}s" x="${x}" y="${y}" width="14" height="2.5" rx="1"/>`).join('')
      + `<rect class="m" x="4" y="56" width="56" height="2" rx="1"/>` },
  { type: 'gym', label: 'Gym / workout', cat: 'sport', colour: 'orange', loop: 'subtle',
    keywords: ['gym', 'workout', 'work out', 'weights', 'lifting', 'leg day', 'push day', 'pull day', 'strength', 'crossfit', 'pilates', 'hiit', 'spin class', 'exercise', 'fitness', 'pt session', 'personal trainer', 'training session', '🏋', '💪'],
    match: () => 0,
    svg: () => `<g class="x-lift"><rect class="k" x="14" y="24" width="36" height="4" rx="2"/><rect class="c" x="8" y="16" width="7" height="20" rx="2"/><rect class="c" x="49" y="16" width="7" height="20" rx="2"/><rect class="c" x="3" y="20" width="5" height="12" rx="1.5"/><rect class="c" x="56" y="20" width="5" height="12" rx="1.5"/></g>`
      + `<ellipse class="m x-shadow" cx="32" cy="54" rx="18" ry="3"/>` },
  { type: 'bowling', label: 'Bowling', cat: 'sport', colour: 'indigo', loop: 'subtle',
    keywords: ['bowling', 'tenpin', 'ten pin', 'ten-pin', '🎳'],
    match: () => 0,
    svg: () => `<rect class="m" x="2" y="52" width="60" height="3" rx="1.5"/>`
      + [[44, 0], [51, 0.1], [57, 0.2]].map(([x, d]) => `<g class="x-wobble o-b" style="--d:${d}s"><path class="w lc" d="M${x} 24c2 0 3 2 2.5 5-.5 2-1.5 3 0 6 2 4 2 10 .5 17h-6c-1.5-7-1.5-13 .5-17 1.5-3 .5-4 0-6-.5-3 .5-5 2.5-5z"/><rect class="c" x="${x - 2}" y="31" width="4" height="2"/></g>`).join('')
      + `<g class="x-roll"><circle class="c" cx="12" cy="44" r="8"/><circle class="w" cx="10" cy="40" r="1.3"/><circle class="w" cx="14" cy="40" r="1.3"/><circle class="w" cx="12" cy="43.5" r="1.3"/></g>` },
  { type: 'sport', label: 'Sport', cat: 'sport', colour: 'green', loop: 'subtle',
    keywords: ['football', 'five a side', '5 a side', '5-a-side', 'match', 'tennis', 'badminton', 'squash', 'cricket', 'rugby', 'basketball', 'netball', 'golf', 'swim', 'swimming', 'climbing', 'bouldering', 'ski', 'skiing', 'snowboard', 'snowboarding', 'cycling', 'bike ride', 'hockey', 'volleyball', 'table tennis', 'padel', 'surfing', 'kayak', '⚽', '🎾', '⛷'],
    match: () => 0,
    // a goal in the scene colour and a proper ball, kicked into it
    svg: () => `<path class="lm" d="M44 16v32M50 16v32M38 24h22M38 32h22M38 40h22"/><path class="lc t" d="M37 48V15h23v33"/>`
      + `<g class="x-kick"><circle class="w lk" cx="15" cy="39" r="9"/><path class="k" d="M15 34l4.6 3.3-1.8 5.4h-5.6l-1.8-5.4z"/></g><rect class="m" x="2" y="49" width="60" height="2.5" rx="1"/>` },

  // ── Health ──
  { type: 'dentist', label: 'Dentist', cat: 'health', colour: 'teal', loop: 'subtle',
    keywords: ['dentist', 'dental', 'tooth', 'teeth', 'orthodontist', 'hygienist', '🦷'],
    match: () => 0,
    svg: () => `<path class="w lc t" d="M20 12c4-2 8 0 12 2 4-2 8-4 12-2 6 3 6 12 3 20-2 6-3 14-6 18-2 3-4 0-5-4l-2-8c-1-3-3-3-4 0l-2 8c-1 4-3 7-5 4-3-4-4-12-6-18-3-8-3-17 3-20z"/><path class="lc" d="M24 19c2.5-1.2 5-1.2 7 0"/>`
      + _AS_SPARK(50, 12, 6, 0) + _AS_SPARK(13, 42, 4, 0.8) },
  { type: 'health', label: 'Doctor / health', cat: 'health', colour: 'red', loop: 'subtle',
    keywords: ['doctor', 'doctors', 'gp', 'hospital', 'clinic', 'medical', 'medication', 'prescription', 'pharmacy', 'physio', 'physiotherapy', 'vaccine', 'vaccination', 'jab', 'blood test', 'scan', 'x-ray', 'checkup', 'check-up', 'therapy', 'therapist', 'counselling', 'counseling', 'optician', 'eye test', 'patch test', 'nhs', 'surgery', 'flu', 'flu jab', 'flu shot', 'covid', 'booster', 'shots', 'injection', 'consultant', 'specialist', 'rheumatologist', 'dermatologist', 'cardiologist', 'audiologist', 'hearing', 'health', 'appointment', 'medical centre', '🩺', '💊'],
    match: () => 0,
    svg: () => `<path class="s x-beat" d="M32 52S12 41 12 26a10 10 0 0 1 20-5 10 10 0 0 1 20 5c0 15-20 26-20 26z"/>`
      + `<path class="lc t x-grow o-l" d="M4 34h13l4-10 6 20 6-26 5 16h22"/>` },
  { type: 'rest', label: 'Rest / meditation', cat: 'health', colour: 'teal', loop: 'subtle',
    keywords: ['rest', 'meditate', 'meditation', 'mindfulness', 'breathe', 'breathing', 'nap', 'sleep', 'relax', 'relaxation', 'spa', 'yoga', 'self care', 'self-care', 'wellness', 'wellbeing', 'well-being', 'recharge', 'quiet time', 'day of rest', 'lie in', '🧘'],
    match: () => 0,
    svg: () => `<circle class="lc" cx="32" cy="32" r="26" opacity=".35"/><circle class="s x-breathe" cx="32" cy="32" r="20"/><circle class="c x-breathe" style="--d:.5s" cx="32" cy="32" r="10"/>` },

  // ── Life ──
  { type: 'haircut', label: 'Haircut', cat: 'life', colour: 'pink', loop: 'subtle',
    keywords: ['haircut', 'hair', 'barber', 'barbers', 'salon', 'trim', 'hairdresser', 'hairdressers', 'nails', 'beauty', 'brows', '✂', '💇'],
    match: () => 0,
    svg: () => `<g class="x-snipa o-v" style="transform-origin:30px 34px"><path class="lk t" d="M30 34L54 16"/><path class="lk t" d="M30 34l-7 6"/><circle class="lc t" cx="17" cy="45" r="6"/></g>`
      + `<g class="x-snipb o-v" style="transform-origin:30px 34px"><path class="lk t" d="M30 34L54 52"/><path class="lk t" d="M30 34l-7-6"/><circle class="lc t" cx="17" cy="23" r="6"/></g>`
      + [[46, 0], [52, 0.7], [40, 1.3]].map(([x, d]) => `<path class="lm x-fall" style="--d:${d}s" d="M${x} 4q2 3 0 6"/>`).join('') },
  { type: 'shopping', label: 'Shopping', cat: 'life', colour: 'pink', loop: 'subtle',
    keywords: ['shop', 'shopping', 'groceries', 'grocery', 'supermarket', 'tesco', 'sainsburys', "sainsbury's", 'aldi', 'lidl', 'asda', 'morrisons', 'waitrose', 'market', 'buy', 'ikea', 'mall', 'weekly shop', 'big shop', 'bake sale', 'cake sale', '🛒', '🛍'],
    match: () => 0,
    svg: () => `<g class="x-bounce o-b"><path class="lc t" d="M24 24v-6a8 8 0 0 1 16 0v6"/><path class="c" d="M14 24h36l-3 30H17z"/><circle class="w" cx="25" cy="31" r="2"/><circle class="w" cx="39" cy="31" r="2"/></g>`
      + _AS_SPARK(53, 12, 5, 0.2) + `<rect class="m" x="10" y="56" width="44" height="2" rx="1"/>` },
  { type: 'cinema', label: 'Cinema / film', cat: 'life', colour: 'slate', loop: 'subtle',
    keywords: ['cinema', 'film', 'films', 'movie', 'movies', 'imax', 'odeon', 'vue', 'cineworld','screening', 'netflix', '🎬', '🍿'],
    match: (f) => (f.evening ? 0.2 : 0),
    svg: () => `<g class="x-spin-slow"><circle class="c" cx="26" cy="28" r="16"/>${[[26, 19], [34.5, 25], [31.3, 35], [20.7, 35], [17.5, 25]].map(([x, y]) => `<circle class="w" cx="${x}" cy="${y}" r="3.4"/>`).join('')}<circle class="k" cx="26" cy="28" r="2"/></g>`
      + `<rect class="k" x="34" y="44" width="28" height="10" rx="1"/><g class="x-slidel">${[30, 37, 44, 51, 58, 65].map(x => `<rect class="w" x="${x}" y="46" width="3" height="2" rx=".5"/><rect class="w" x="${x}" y="50" width="3" height="2" rx=".5"/>`).join('')}</g>` },
  { type: 'concert', label: 'Concert / music', cat: 'life', colour: 'violet', loop: 'subtle',
    keywords: ['concert', 'gig', 'gigs', 'music', 'band', 'orchestra', 'choir', 'live music', 'opera', 'theatre', 'theater', 'musical', 'karaoke', 'rehearsal', 'dj', 'live show', '🎵', '🎶', '🎸', '🎤'],
    match: (f) => (f.evening ? 0.2 : 0),
    svg: () => [[14, 44, 0], [32, 36, 1.1], [48, 46, 0.55]].map(([x, y, d], i) => `<g class="x-float" style="--d:${d}s"><ellipse class="${i === 1 ? 'k' : 'c'}" cx="${x}" cy="${y}" rx="5" ry="4"/><rect class="${i === 1 ? 'k' : 'c'}" x="${x + 3.5}" y="${y - 22}" width="2.5" height="22"/><path class="${i === 1 ? 'k' : 'c'}" d="M${x + 6} ${y - 22}c6 2 8 6 6 11 0-4-3-6-6-6z"/></g>`).join('') },
  { type: 'outing', label: 'Outing / walk', cat: 'life', colour: 'green', loop: 'subtle',
    keywords: ['walk', 'walks', 'hike', 'hiking', 'ramble', 'trip', 'day out', 'outing', 'park', 'picnic', 'stroll', 'trail', 'peak district', 'countryside', 'nature', 'garden', 'gardens', 'lake', 'woods', 'forest', 'fell', 'moors', 'botanical', '🥾', '🌳'],
    match: () => 0,
    // rolling hills, a tree in the breeze, the sun, footsteps up the path
    svg: () => `<circle class="c x-glow" cx="14" cy="14" r="6"/><path class="s" d="M0 44c12-13 25-15 36-8s19 3 28-6v34H0z"/>`
      + `<g class="x-tree o-b"><rect class="k" x="44.6" y="27" width="2.8" height="10" rx="1"/><circle class="c" cx="46" cy="23" r="7.5"/></g>`
      + `<path class="c" d="M0 52c13-8 27-8 38-3s18 3 26-1v16H0z"/>`
      + [[10, 58.5, 0], [17, 56, 0.4], [24, 57.5, 0.8], [31, 55, 1.2]].map(([x, y, d]) => `<ellipse class="w x-step" style="--d:${d}s" cx="${x}" cy="${y}" rx="1.6" ry="1.1"/>`).join('') },
  { type: 'sightseeing', label: 'Sightseeing / museum', cat: 'life', colour: 'amber', loop: 'subtle',
    keywords: ['museum', 'gallery', 'abbey', 'castle', 'cathedral', 'palace', 'tour', 'exhibition', 'sightseeing', 'zoo', 'aquarium', 'heritage', 'monument', 'national trust', 'landmark', 'stately home', 'art', '🏰', '🏛'],
    match: () => 0,
    svg: () => `<path class="s lc" d="M10 54V30l10-10 10 10v24z"/><path class="w lc" d="M30 54V34h22v20z"/><rect class="k" x="17" y="40" width="6" height="14" rx="3"/><path class="k" d="M36 48v-6a2.5 2.5 0 0 1 5 0v6zM44 48v-6a2.5 2.5 0 0 1 5 0v6z"/>`
      + `<path class="lk" d="M20 20V7"/><path class="c x-flag o-l" d="M20 7h11l-3 4 3 4H20z"/><circle class="c x-glow" cx="52" cy="14" r="4"/>` },
  { type: 'pet', label: 'Pets', cat: 'life', colour: 'green', loop: 'subtle',
    keywords: ['dog', 'dogs', 'cat', 'cats', 'pet', 'pets', 'vet', 'vets', 'grooming', 'dog grooming', 'walk the dog', 'puppy', 'kitten', '🐶', '🐱', '🐾'],
    match: () => 0,
    svg: () => [[16, 48, 0], [30, 36, 0.5], [44, 24, 1], [56, 12, 1.5]].map(([x, y, d], i) => `<g class="x-step" style="--d:${d}s"><ellipse class="${i % 2 ? 'k' : 'c'}" cx="${x}" cy="${y + 3}" rx="4" ry="3.4"/><circle class="${i % 2 ? 'k' : 'c'}" cx="${x - 4}" cy="${y - 2}" r="1.6"/><circle class="${i % 2 ? 'k' : 'c'}" cx="${x}" cy="${y - 3.5}" r="1.6"/><circle class="${i % 2 ? 'k' : 'c'}" cx="${x + 4}" cy="${y - 2}" r="1.6"/></g>`).join('') },
  { type: 'prayer', label: 'Prayer / faith', cat: 'life', colour: 'amber', loop: 'subtle',
    keywords: ['prayer', 'prayers', 'pray', 'church', 'mosque', 'masjid', 'jummah', "jumu'ah", 'jumuah', 'salah', 'temple', 'gurdwara', 'synagogue','bible study', 'quran', 'holy', 'ramadan', 'worship', 'retreat', 'sermon', '🕌', '⛪', '🙏'],
    match: () => 0,
    svg: () => `<path class="s x-glow" d="M32 8L48 54H16z"/><g class="x-spin-slow"><path class="lc" d="M32 6v6M32 52v6M6 32h6M52 32h6M13.6 13.6l4.2 4.2M46.2 46.2l4.2 4.2M50.4 13.6l-4.2 4.2M17.8 46.2l-4.2 4.2"/></g><circle class="c" cx="32" cy="32" r="8"/>` },
  { type: 'home', label: 'Family / home', cat: 'home', colour: 'amber', loop: 'subtle',
    keywords: ['home', 'family', 'mum', 'mom', 'dad', 'parents', 'parent', 'grandma', 'grandad', 'grandparents', 'nan', 'sister', 'brother', 'kids', 'children', 'wfh', 'work from home', 'chores', 'cleaning', 'laundry', 'cooking', 'diy', 'housework', 'deep clean', '🧹', '🫧', '🧽', '🪣', '🏠', '🏡'],
    match: () => 0,
    svg: () => `<rect class="k" x="42" y="12" width="6" height="12"/>` + _AS_STEAM(45, 10, 0) + `<path class="s lc" d="M10 32L32 13l22 19v22H10z"/><rect class="k" x="27" y="38" width="10" height="16" rx="1"/>`
      + `<rect class="c x-glow" x="15" y="35" width="8" height="8" rx="1"/><rect class="c x-glow" style="--d:1.3s" x="41" y="35" width="8" height="8" rx="1"/>` },
  { type: 'moving', label: 'Moving / housing', cat: 'home', colour: 'orange', loop: 'subtle',
    keywords: ['move', 'moving', 'move house', 'house move', 'flat', 'viewing', 'viewings', 'landlord', 'tenancy', 'lease', 'removal', 'removals', 'packing', 'unpack', 'estate agent', 'housing', 'new place', 'keys', 'deposit', '📦'],
    match: () => 0,
    svg: () => `<g class="x-bounce o-b"><rect class="c" x="6" y="34" width="24" height="20" rx="2"/><rect class="w" x="16" y="34" width="4" height="8"/></g>`
      + `<g class="x-bounce o-b" style="--d:.3s"><rect class="s lc" x="34" y="36" width="22" height="18" rx="2"/><rect class="lc" x="43" y="36" width="4" height="7"/></g>`
      + `<g class="x-bounce o-b" style="--d:.6s"><rect class="k" x="12" y="14" width="18" height="18" rx="2"/><rect class="w" x="19" y="14" width="4" height="7"/></g><rect class="m" x="2" y="55" width="60" height="2" rx="1"/>` },
  { type: 'delivery', label: 'Delivery / post', cat: 'home', colour: 'orange', loop: 'subtle',
    keywords: ['delivery', 'deliveries', 'deliver', 'parcel', 'package', 'post office', 'courier', 'collect', 'collection', 'pick up', 'pickup', 'amazon', 'royal mail', 'dpd', 'evri', 'returns', 'return parcel', 'dispatch', '📮'],
    match: () => 0,
    svg: () => `<g class="x-bounce o-b"><rect class="c" x="20" y="22" width="30" height="28" rx="3"/><rect class="w" x="32" y="22" width="6" height="28"/><rect class="k" x="40" y="40" width="7" height="5" rx="1"/></g>`
      + [[4, 28, 0], [2, 36, 0.3], [6, 44, 0.6]].map(([x, y, d]) => `<rect class="m x-trail" style="--d:${d}s" x="${x}" y="${y}" width="11" height="2.5" rx="1"/>`).join('')
      + `<rect class="m" x="12" y="52" width="46" height="2.5" rx="1"/>` },

  // ── Learning ──
  { type: 'driving', label: 'Driving lesson / test', cat: 'learning', colour: 'amber', loop: 'subtle',
    keywords: ['driving', 'driving lesson', 'driving test', 'theory test', 'driving instructor', 'instructor', 'l plates'],
    match: () => 0,
    svg: () => `<g class="x-steer"><circle class="lk t" cx="32" cy="32" r="21"/><circle class="c" cx="32" cy="32" r="5.5"/><path class="lk t" d="M11 32h15.5M37.5 32H53M32 37.5V53"/></g><rect class="w lc" x="46" y="1.5" width="16" height="15" rx="2.5"/><path class="lc t" d="M51 5.5v7h6"/>` },
  { type: 'lecture', label: 'Lecture / class', cat: 'learning', colour: 'green', loop: 'subtle',
    keywords: ['lecture', 'lectures', 'seminar', 'class', 'classes', 'lesson plan', 'course', 'teaching', 'teach', 'tutorial', 'module', 'exam', 'exams', 'revision', 'training', 'webinar series', 'lab session', 'cpd', 'welcome week', 'induction', 'open day', 'orientation', 'freshers'],
    match: () => 0,
    svg: () => `<rect class="c" x="6" y="8" width="52" height="34" rx="3"/><rect class="w x-grow o-l" x="12" y="15" width="30" height="2.5" rx="1"/><rect class="w x-grow o-l" style="--d:.8s" x="12" y="22" width="36" height="2.5" rx="1"/><rect class="w x-grow o-l" style="--d:1.6s" x="12" y="29" width="22" height="2.5" rx="1"/>`
      + `<rect class="m" x="20" y="42" width="3" height="14"/><rect class="m" x="41" y="42" width="3" height="14"/><rect class="s" x="44" y="36" width="9" height="3" rx="1"/>` },
  { type: 'reading', label: 'Reading / learning', cat: 'learning', colour: 'indigo', loop: 'subtle',
    keywords: ['read', 'reading', 'book', 'books', 'library', 'literature', 'study', 'studying', 'learn', 'learning', 'podcast', 'audiobook', 'chapter reading', 'course work', '📚', '📖'],
    match: () => 0,
    svg: () => `<path class="s lc" d="M6 18c8-3 18-3 26 2v34c-8-5-18-5-26-2z"/><path class="s lc" d="M58 18c-8-3-18-3-26 2v34c8-5 18-5 26-2z"/><path class="w lc x-turn o-l" d="M32 20c8-5 18-5 26-2v34c-8-3-18-3-26 2z"/>` },

  // ── Work ──
  { type: 'interview', label: 'Interview', cat: 'work', colour: 'amber', loop: 'subtle',
    keywords: ['interview', 'interviews', 'viva', 'oral exam', 'panel interview', 'assessment centre', 'job interview', 'screening call'],
    match: () => 0,
    svg: () => `<rect class="m" x="8" y="40" width="16" height="4" rx="2"/><rect class="m" x="8" y="26" width="4" height="18" rx="2"/><rect class="m" x="10" y="44" width="3" height="11"/><rect class="m" x="20" y="44" width="3" height="11"/>`
      + `<rect class="m" x="40" y="40" width="16" height="4" rx="2"/><rect class="m" x="52" y="26" width="4" height="18" rx="2"/><rect class="m" x="41" y="44" width="3" height="11"/><rect class="m" x="51" y="44" width="3" height="11"/>`
      + `<g class="x-pop"><path class="c" d="M18 8h22a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H29l-5 5v-5h-6a4 4 0 0 1-4-4v-8a4 4 0 0 1 4-4z"/><circle class="w x-blink" cx="23" cy="16" r="1.6"/><circle class="w x-blink" style="--d:.3s" cx="29" cy="16" r="1.6"/><circle class="w x-blink" style="--d:.6s" cx="35" cy="16" r="1.6"/></g>` },
  { type: 'one-on-one', label: '1:1', cat: 'work', colour: 'violet', loop: 'subtle',
    keywords: ['1:1', '1-1', '1 to 1', 'one to one', 'one-to-one', '1on1', 'mentoring', 'mentor', 'supervision', 'supervisor meeting', 'catch up', 'catch-up', 'catchup', 'catch ups', 'catch-ups', 'chat'],
    match: (f) => (f.names === 2 && !f.allDay ? 5 : 0) + (f.attendees === 2 ? 0.5 : 0),
    svg: () => `<g class="x-bob"><circle class="c" cx="18" cy="28" r="6"/><path class="c" d="M8 49a10 9 0 0 1 20 0z"/></g><g class="x-bob" style="--d:.6s"><circle class="k" cx="46" cy="28" r="6"/><path class="k" d="M36 49a10 9 0 0 1 20 0z"/></g>`
      + `<g class="x-pop"><rect class="s" x="21" y="7" width="15" height="9" rx="4.5"/></g><g class="x-pop" style="--d:1.1s"><rect class="m" x="29" y="14" width="13" height="8" rx="4"/></g>` },
  { type: 'video-call', label: 'Video call', cat: 'work', colour: 'indigo', loop: 'subtle',
    keywords: ['zoom', 'teams', 'microsoft teams', 'google meet', 'meet', 'webex', 'video call', 'video', 'online', 'virtual', 'hangout', 'skype', 'facetime', 'hybrid', 'live stream', 'livestream'],
    match: (f) => (f.link && !f.physical ? 2 : 0) + (f.videoLoc ? 1.5 : 0),
    svg: () => `<rect class="s" x="6" y="14" width="42" height="32" rx="6"/><path class="c" d="M48 26l10-6v20l-10-6z"/>` + _AS_PERSON(19, 27, 'c', 0.1) + _AS_PERSON(35, 27, 'k', 0.7)
      + `<circle class="c x-pulse" cx="12" cy="19.5" r="2"/><rect class="m" x="19" y="50" width="16" height="3" rx="1.5"/>` },
  { type: 'meeting', label: 'Meeting', cat: 'work', colour: 'blue', loop: 'subtle',
    keywords: ['meeting', 'meetings', 'mtg', 'sync', 'standup', 'stand-up', 'stand up', 'huddle', 'board', 'committee', 'workshop', 'retro', 'planning meeting', 'kick-off', 'kickoff', 'briefing', 'group meeting', 'team meeting', 'away day', 'agm', 'all hands', 'all-hands', 'roundtable', 'steering group', 'focus group', 'town hall', 'panel', 'discussion', 'discuss', 'consultation'],
    match: (f) => (f.names >= 3 && !f.allDay ? 5 : 0) + (f.attendees >= 3 ? 1 : 0),
    svg: () => `<ellipse class="s" cx="32" cy="44" rx="23" ry="7"/>` + _AS_PERSON(15, 26, 'c', 0) + _AS_PERSON(32, 21, 'k', 0.4) + _AS_PERSON(49, 26, 'c', 0.8)
      + `<g class="x-float" style="--d:1.2s"><rect class="w lc" x="38" y="4" width="17" height="10" rx="5"/></g>` },
  { type: 'call', label: 'Phone call', cat: 'work', colour: 'teal', loop: 'subtle',
    keywords: ['call', 'calls', 'phone', 'phone call', 'ring', 'ring back', 'dial', 'callback', 'call back', '📞', '☎'],
    match: () => 0,
    svg: () => `<path class="c x-wobble" d="M20 13c2-2 5-2 6 1l2 6c1 2 0 4-2 5l-2 1c2 5 6 9 11 11l1-2c1-2 3-3 5-2l6 2c3 1 3 4 1 6l-3 3c-3 3-9 2-16-3s-12-13-12-19c0-3 1-5 3-6z"/>`
      + `<path class="lc t x-ring" d="M40 13a11 11 0 0 1 11 11"/><path class="lc t x-ring" style="--d:.45s" d="M40 5a19 19 0 0 1 19 19"/>` },
  { type: 'email', label: 'Email', cat: 'work', colour: 'blue', loop: 'subtle',
    keywords: ['email', 'emails', 'e-mail', 'mail', 'reply', 'replies', 'respond', 'inbox', 'send', 'forward', 'write to', 'newsletter', 'follow up email', '📧', '✉'],
    match: () => 0,
    svg: () => `<g class="x-rise"><rect class="w lm" x="17" y="14" width="30" height="24" rx="2"/><rect class="m" x="21" y="19" width="16" height="2.5" rx="1"/><rect class="m" x="21" y="24" width="20" height="2.5" rx="1"/></g>`
      + `<rect class="s" x="10" y="28" width="44" height="26" rx="4"/><path class="lc" d="M12 52l16-12M52 52L36 40"/><path class="c x-flap o-t" d="M10 28h44L32 44z"/>` },
  { type: 'conference', label: 'Conference / talk', cat: 'work', colour: 'violet', loop: 'subtle',
    keywords: ['conference', 'conferences', 'talk', 'talks', 'presentation', 'presentations', 'present', 'presenting', 'keynote', 'symposium', 'summit', 'webinar', 'poster', 'posters', 'pitch', 'demo', 'slides', 'speaker', 'expo', 'congress', 'opening session', 'closing session', 'plenary', 'q&a', 'panel discussion', '🎤'],
    match: () => 0,
    svg: () => `<path class="s x-glow" d="M26 6h12l15 40H11z"/><rect class="m" x="6" y="46" width="52" height="8" rx="2"/><g class="x-bob"><circle class="c" cx="32" cy="27" r="5"/><path class="c" d="M24 46v-6a8 8 0 0 1 16 0v6z"/></g>`
      + `<rect class="k" x="41" y="36" width="2.5" height="10"/><circle class="k" cx="42.2" cy="35" r="2.2"/><circle class="c" cx="32" cy="5" r="3"/>` },
  { type: 'lab', label: 'Lab / experiment', cat: 'work', colour: 'teal', loop: 'subtle',
    keywords: ['lab', 'labs', 'laboratory', 'experiment', 'experiments', 'assay', 'pcr', 'sample', 'samples', 'bench', 'cell culture', 'pipette', 'pipetting', 'reagent', 'reagents', 'centrifuge', 'protocol', 'synthesis', 'hplc', 'akta', 'microscope', 'consumables', 'lab coat', 'fume hood', 'titration', 'enzyme', 'buffer', 'chromatography', 'spectroscopy', 'bioreactor', 'cells', 'gmp', '🧪', '🔬'],
    match: () => 0,
    svg: () => `<path class="w lc t" d="M27 8h10v16l13 26a4 4 0 0 1-4 6H18a4 4 0 0 1-4-6l13-26z"/><path class="c" d="M20.5 38h23l6 12a4 4 0 0 1-4 6H18.5a4 4 0 0 1-4-6z"/><rect class="k" x="25" y="5" width="14" height="4" rx="2"/>`
      + [[26, 48, 2, 0], [34, 50, 1.6, 0.7], [38, 46, 2.2, 1.4]].map(([x, y, r, d]) => `<circle class="w x-float" style="--d:${d}s" cx="${x}" cy="${y}" r="${r}"/>`).join('') },
  { type: 'writing', label: 'Writing', cat: 'work', colour: 'indigo', loop: 'subtle',
    keywords: ['write', 'writing', 'draft', 'drafting', 'thesis', 'paper', 'papers', 'manuscript', 'chapter', 'chapters', 'essay', 'report', 'article', 'blog', 'edit', 'editing', 'proofread', 'corrections', 'abstract', 'proposal', 'cover letter', 'notes', 'literature review', 'dissertation', 'rewrite', 'revise', 'revisions', 'minor corrections', '✍', '📝'],
    match: () => 0,
    svg: () => `<rect class="w lm" x="8" y="8" width="38" height="48" rx="3"/><rect class="m" x="14" y="16" width="26" height="2.5" rx="1"/><rect class="m" x="14" y="23" width="20" height="2.5" rx="1"/><rect class="c x-grow o-l" x="14" y="30" width="24" height="2.5" rx="1"/>`
      + `<g class="x-write"><path class="k" d="M40 44l14-22 4 2.4-14 22-5.4 3z"/><path class="c" d="M51 26.5l4 2.4 2-3.2-4-2.4z"/></g>` },
  { type: 'coding', label: 'Coding / deploy', cat: 'work', colour: 'slate', loop: 'subtle',
    keywords: ['code', 'coding', 'deploy', 'deployment', 'bug', 'bugs', 'fix', 'refactor', 'build', 'release', 'pr', 'pull request', 'merge', 'commit', 'script', 'scripts', 'debug', 'debugging', 'api', 'server', 'website', 'app', 'python', 'matlab', 'github', 'repo', 'dashboard', 'database', '💻'],
    match: () => 0,
    svg: () => `<rect class="k" x="6" y="10" width="52" height="40" rx="5"/><circle class="c" cx="12" cy="15.5" r="1.6"/><circle class="m" cx="17" cy="15.5" r="1.6"/><circle class="m" cx="22" cy="15.5" r="1.6"/><path class="lc t" d="M16 28l-5 5 5 5M48 28l5 5-5 5"/>`
      + `<rect class="w x-grow o-l" x="22" y="26" width="16" height="2.5" rx="1"/><rect class="c x-grow o-l" style="--d:.9s" x="22" y="32" width="12" height="2.5" rx="1"/><rect class="w x-grow o-l" style="--d:1.8s" x="22" y="38" width="18" height="2.5" rx="1"/><rect class="c x-blink" x="41" y="37" width="2" height="5"/>` },
  { type: 'review', label: 'Review / feedback', cat: 'work', colour: 'green', loop: 'subtle',
    keywords: ['review', 'reviews', 'feedback', 'checklist', 'audit', 'inspection', 'inspections', 'assess', 'marking', 'grade', 'grading', 'appraisal', 'proofs', 'approve', 'sign off', 'sign-off', 'evaluate', 'peer review', 'retrospective', 'check'],
    match: () => 0,
    svg: () => `<rect class="w lm" x="12" y="6" width="40" height="52" rx="4"/><rect class="s" x="24" y="2" width="16" height="8" rx="3"/>`
      + [18, 30, 42].map((y, i) => `<rect class="lm" x="18" y="${y}" width="7" height="7" rx="2"/><rect class="m" x="29" y="${y + 2.2}" width="17" height="2.5" rx="1"/><path class="lc t x-tick" style="--d:${i * 0.6}s" d="M19.5 ${y + 3.5}l2 2 4.5-4.5"/>`).join('') },
  { type: 'deadline', label: 'Deadline / submission', cat: 'work', colour: 'red', loop: 'subtle', prio: 1,
    keywords: ['deadline', 'deadlines', 'due', 'submit', 'submission', 'hand in', 'hand-in', 'handin', 'cutoff', 'cut-off', 'closes', 'expires', 'last day', 'final version', '⏳', '⌛'],
    match: (f) => (f.kind === 'task' && f.dueToday && f.p1 ? 1 : 0),
    svg: () => `<rect class="k" x="14" y="6" width="36" height="4" rx="2"/><rect class="k" x="14" y="54" width="36" height="4" rx="2"/><path class="w lm" d="M18 10h28c0 10-9 16-11 22 2 6 11 12 11 22H18c0-10 9-16 11-22-2-6-11-12-11-22z"/>`
      + `<path class="c x-sandtop o-b" d="M21 14h22c-1 6-7 10-11 15-4-5-10-9-11-15z"/><path class="c x-sandbot o-b" d="M20 52h24c-1-6-6-10-12-12-6 2-11 6-12 12z"/><rect class="c x-stream" x="31" y="30" width="2" height="20"/>` },
  { type: 'finance', label: 'Money / bills', cat: 'admin', colour: 'amber', loop: 'subtle',
    keywords: ['pay', 'payment', 'payments', 'bill', 'bills', 'invoice', 'invoices', 'rent', 'tax', 'tax return', 'payday', 'pay day', 'salary', 'bank', 'budget', 'budgets', 'expenses', 'expense', 'refund', 'mortgage', 'loan', 'council tax', 'direct debit', 'finance', 'finances', 'money', 'savings', 'isa', 'pension', 'bank transfer', 'reimbursement', 'payroll', '💷', '💰'],
    match: () => 0,
    svg: () => `<ellipse class="k" cx="32" cy="52" rx="14" ry="4.5"/><ellipse class="c lw" cx="32" cy="48" rx="14" ry="4.5"/><ellipse class="k" cx="32" cy="44" rx="14" ry="4.5"/><ellipse class="c lw" cx="32" cy="40" rx="14" ry="4.5"/>`
      + `<g class="x-drop"><ellipse class="c lw" cx="32" cy="22" rx="14" ry="4.5"/></g>` + _AS_SPARK(52, 14, 5, 0.6) },
  { type: 'admin', label: 'Admin / forms', cat: 'admin', colour: 'slate', loop: 'subtle',
    keywords: ['admin', 'form', 'forms', 'paperwork', 'application', 'apply', 'renew', 'renewal', 'register', 'registration', 'passport', 'visa', 'licence', 'license', 'insurance', 'contract', 'sign', 'booking', 'documents', 'certificate', 'hr', 'onboarding', 'right to work', 'ecf', '📋'],
    match: () => 0,
    svg: () => `<rect class="w lm" x="10" y="34" width="44" height="22" rx="3"/><rect class="m" x="16" y="40" width="20" height="2.5" rx="1"/><rect class="c x-mark" x="22" y="47" width="20" height="5" rx="1.5"/>`
      + `<g class="x-stamp"><rect class="k" x="27" y="4" width="10" height="14" rx="3"/><rect class="c" x="20" y="18" width="24" height="7" rx="2"/></g>` },
  { type: 'idea', label: 'Ideas / planning', cat: 'work', colour: 'amber', loop: 'subtle',
    keywords: ['idea', 'ideas', 'brainstorm', 'brainstorming', 'plan', 'planning', 'strategy', 'think', 'reflect', 'journal', 'goals', 'roadmap', 'weekly plan', 'ten plan', 'vision', '💡'],
    match: () => 0,
    svg: () => `<circle class="s x-glow" cx="32" cy="26" r="20"/><path class="c" d="M32 10a14 14 0 0 1 8 25.5V42H24v-6.5A14 14 0 0 1 32 10z"/><rect class="k" x="25" y="44" width="14" height="4" rx="1.5"/><rect class="k" x="27" y="50" width="10" height="4" rx="1.5"/>` },
  { type: 'work', label: 'Work', cat: 'work', colour: 'indigo', loop: 'subtle',
    keywords: ['work', 'office', 'shift', 'focus', 'deep work', 'research', 'project', 'projects', 'tasks', 'work list', 'job', 'focus time', 'admin time'],
    match: (f) => (f.kind === 'event' && !f.allDay && f.minutes >= 240 ? 1 : 0),
    svg: () => `<g class="x-bob"><rect class="c" x="10" y="22" width="44" height="30" rx="5"/><path class="lk t" d="M24 22v-5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v5"/><rect class="w" x="10" y="34" width="44" height="2.5"/><rect class="k" x="29" y="32" width="6" height="7" rx="1.5"/></g>` },

  // ── Fallbacks ──
  { type: 'event', label: 'Event', cat: 'generic', colour: 'slate', loop: 'subtle', fallback: true,
    keywords: [], match: (f) => (f.kind === 'event' ? 0.5 : 0),
    svg: () => `<rect class="w lm" x="10" y="12" width="44" height="42" rx="5"/><path class="c" d="M15 12h34a5 5 0 0 1 5 5v7H10v-7a5 5 0 0 1 5-5z"/><rect class="k" x="20" y="6" width="3" height="10" rx="1.5"/><rect class="k" x="41" y="6" width="3" height="10" rx="1.5"/>`
      + [[17, 30], [27, 30], [37, 30], [17, 40], [27, 40]].map(([x, y]) => `<rect class="m" x="${x}" y="${y}" width="7" height="6" rx="1.5"/>`).join('') + `<rect class="c x-pulse" x="37" y="40" width="7" height="6" rx="1.5"/>` },
  { type: 'task', label: 'Task', cat: 'generic', colour: 'slate', loop: 'subtle', fallback: true,
    keywords: [], match: (f) => (f.kind === 'task' ? 0.5 : 0),
    svg: () => `<rect class="w lc t" x="14" y="14" width="36" height="36" rx="9"/><path class="lc t x-tick" d="M23 32l7 7 13-14"/>` },
];
const _ANIM_BY_TYPE = new Map(ANIM_SCENES.map(s => [s.type, s]));
/** Category fallbacks: what an unclassified item of a category shows. */
const ANIM_CATEGORY_FALLBACK = Object.freeze({ work: 'work', social: 'friends', celebrate: 'celebration', travel: 'travel', sport: 'sport', health: 'health', life: 'outing', home: 'home', learning: 'reading', admin: 'admin', generic: 'event' });

/* ---------- text matching ---------- */
/** Lower-case, accents folded, punctuation as spaces (emoji kept). */
function animNorm(s) {
  return ' ' + String(s == null ? '' : s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[’']/g, '').replace(/[-_/\\.,:;()[\]{}!?&+|"#*=<>~^%$]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
}
const _ANIM_EMOJI = /\p{Extended_Pictographic}/u;
let _animKwIndex = null;
function _animIndex() {
  if (_animKwIndex) return _animKwIndex;
  _animKwIndex = ANIM_SCENES.map(s => ({ s, kws: s.keywords.map(k => ({ raw: k, emoji: _ANIM_EMOJI.test(k), n: animNorm(k), words: animNorm(k).trim().split(' ').length })) }));
  return _animKwIndex;
}
/** Keyword hit test on normalised text (word boundaries are the spaces animNorm adds). */
function _animHas(normText, rawText, kw) {
  if (kw.emoji) return rawText.includes(kw.raw.replace(/️/g, '')) || rawText.includes(kw.raw);
  return kw.n.trim() !== '' && normText.includes(kw.n);
}

/** "Sam / Alex", "Jo, Sam and Kit", "Alex & Priya - catch up": how many names (0 when it is not a list of names). */
function animNameCount(title, knownNames) {
  const head = String(title || '').split(/\s[-–—:(|]\s?|\s?\(|:\s/)[0].trim();
  if (!head || head.length > 80) return 0;
  const parts = head.split(/\s*(?:\/|,|&|\+|\band\b|\bx\b)\s*/i).map(p => p.trim()).filter(Boolean);
  if (parts.length < 2) return 0;
  const known = knownNames instanceof Set ? knownNames : null;
  const ok = parts.every(p => {
    if (!/^[\p{Lu}][\p{L}'.’-]*(?:\s[\p{Lu}][\p{L}'.’-]*)?$/u.test(p)) return false;
    const w = p.split(/\s+/);
    if (w.length === 1) return w[0].length >= 2;
    // Two words: a first name + an initial ("Priya KT", "Alex S") or someone known.
    return /^[\p{Lu}]{1,3}\.?$/u.test(w[1]) || (known && (known.has(w[0].toLowerCase()) || known.has(p.toLowerCase())));
  });
  return ok ? parts.length : 0;
}

/**
 * Features of an event or task (plain objects; the page and Node build them):
 *   event {kind:'event', title, description, location, link, attendees, start (min), minutes, allDay, days, calendar, eventType, weekday}
 *   task  {kind:'task', title, description, tags[], stream, priority, dueToday, overdue}
 */
function animFeatures(x, knownNames) {
  x = x || {};
  const title = String(x.title || x.summary || '');
  const loc = String(x.location || '');
  const link = !!x.link || /(teams\.microsoft|meet\.google|zoom\.us|webex\.com)/i.test(String(x.description || '').slice(0, 2000) + ' ' + loc);
  const start = typeof x.start === 'number' ? x.start : null;
  const videoLoc = /\b(teams|zoom|google meet|webex|online|virtual|refer to event details)\b/i.test(loc) || /^https?:/i.test(loc.trim());
  const tNorm = animNorm(title);
  return {
    kind: x.kind === 'task' ? 'task' : 'event',
    title, tNorm, rawTitle: title,
    lNorm: animNorm(loc), dNorm: animNorm(String(x.description || '').slice(0, 400)),
    tagNorm: animNorm([...(Array.isArray(x.tags) ? x.tags : []), x.stream || ''].join(' ')),
    link, videoLoc,
    // A room or an address (or "in person" in the title): people meet there even when a join link is attached.
    physical: (!!loc.trim() && !videoLoc) || / in person /.test(tNorm),
    place: _AS_PLACES.test(tNorm),
    attendees: Number(x.attendees) || 0,
    names: animNameCount(title, knownNames),
    flightCode: /\b(?:[A-Z]{2}|[A-Z]\d|\d[A-Z])\s?\d{2,4}\b/.test(title) && /✈|flight|→|->| to /i.test(title),
    start, minutes: Number(x.minutes) || 0, allDay: !!x.allDay, days: Number(x.days) || (x.allDay ? 1 : 0),
    morning: start !== null && start < 12 * 60, evening: start !== null && start >= 17.5 * 60,
    calendar: String(x.calendar || ''), eventType: String(x.eventType || ''), weekday: typeof x.weekday === 'number' ? x.weekday : null,
    p1: x.priority === 'p1', dueToday: !!x.dueToday, overdue: !!x.overdue,
    // Travel spec 2.7 P13: the landing and take-off scenes. The caller passes now / startMs / endMs
    // (instants; the page uses Clock.now()), so this file stays free of the clock.
    endedRecently: Number.isFinite(x.now) && Number.isFinite(x.endMs) && x.endMs <= x.now && x.now - x.endMs <= 36 * 3600000,
    startsSoon: Number.isFinite(x.now) && Number.isFinite(x.startMs) && x.startMs > x.now && x.startMs - x.now <= 24 * 3600000,
  };
}

/** The key per-item overrides use: tasks by id, events by their normalised title (so a repeating event shares it). */
function animKey(x) {
  if (!x) return '';
  if (x.kind === 'task' && x.id) return 't:' + x.id;
  return 'e:' + animNorm(x.title || x.summary || '').trim().slice(0, 120);
}
/** The key AI classifications are cached under (per title). */
function animTitleKey(title) { return animNorm(title).trim().slice(0, 120); }

/**
 * The scene type for an event or task.
 *   opts.rules      [{kw, type}]   the user's keyword rules (checked first, after overrides)
 *   opts.overrides  {key: type}    per item (animKey)
 *   opts.ai         {titleKey: type}  cached AI answers for titles nothing else matched
 *   opts.names      Set of known first names (people) for "Sam / Alex" detection
 * -> {type, score, source: 'override'|'rule'|'keyword'|'signal'|'ai'|'fallback', why}
 */
function animClassify(x, opts) {
  opts = opts || {};
  const key = animKey(x);
  const ov = opts.overrides && opts.overrides[key];
  if (ov && _ANIM_BY_TYPE.has(ov)) return { type: ov, score: 99, source: 'override', why: 'set by you' };
  const f = animFeatures(x, opts.names);
  for (const r of (Array.isArray(opts.rules) ? opts.rules : [])) {
    if (!r || !_ANIM_BY_TYPE.has(r.type)) continue;
    const kw = animNorm(r.kw);
    if (kw.trim() && (f.tNorm.includes(kw) || f.tagNorm.includes(kw))) return { type: r.type, score: 50, source: 'rule', why: `your rule "${String(r.kw).trim()}"` };
  }
  // The keyword scan depends on the features alone: remember it (a Home render classifies the
  // same few dozen titles many times; integrator, 4 Oct: it was half of the brief's render time).
  const idx = _animIndex();
  if (_animMemo.idx !== idx || _animMemo.map.size > 3000) { _animMemo.idx = idx; _animMemo.map = new Map(); }
  const mk = JSON.stringify(f);
  let res = _animMemo.map.get(mk);
  if (res === undefined) { res = _animScan(f, idx); _animMemo.map.set(mk, res); }
  if (res) return Object.assign({}, res);
  const ai = opts.ai && opts.ai[animTitleKey(f.title)];
  if (ai && _ANIM_BY_TYPE.has(ai)) return { type: ai, score: 1, source: 'ai', why: 'Claude’s guess' };
  // Calendars attach a Teams link to almost everything: only a link with no room is a video call.
  if (f.kind === 'event' && f.link && !f.physical) return { type: 'video-call', score: 1, source: 'signal', why: 'a join link' };
  return { type: f.kind === 'task' ? 'task' : 'event', score: 0, source: 'fallback', why: 'no match' };
}
const _animMemo = { idx: null, map: new Map() };
/** The keyword and signal scan of animClassify: a result, or null when nothing matched well enough. */
function _animScan(f, index) {
  let best = null;
  for (const { s, kws } of index) {
    let score = 0, tHit = false; const hits = [];
    for (const kw of kws) {
      const w = kw.words > 1 ? 0.5 : 0;
      // A word that opens the title is usually the action ("Call the landlord back"): a small edge.
      if (_animHas(f.tNorm, f.rawTitle, kw)) { score += 3 + w + (!kw.emoji && f.tNorm.startsWith(kw.n) ? 0.5 : 0); hits.push(kw.raw); tHit = true; }
      else if (_animHas(f.tagNorm, '', kw)) { score += 2 + w; hits.push(kw.raw); }
      else if (_animHas(f.lNorm, '', kw)) { score += 1.5; hits.push(kw.raw); }
      else if (_animHas(f.dNorm, '', kw)) { score += 0.6; }
    }
    let bonus = 0;
    try { bonus = Number(s.match(f)) || 0; } catch (e) { bonus = 0; }
    const total = score + bonus;
    // Ties go to the earlier entry, unless a later one says it is more specific (prio).
    if (total > 0 && (!best || total > best.score || (total === best.score && (s.prio || 0) > best.prio))) best = { type: s.type, score: total, kw: hits.length > 0, tHit, hits, fallback: !!s.fallback, prio: s.prio || 0 };
  }
  if (best && !best.fallback && best.score >= 2) {
    // "Sam / Alex" is a 1:1 even when the invite says Microsoft Teams (nothing in the title says otherwise).
    if (f.names === 2 && !f.allDay && !best.tHit && (best.type === 'video-call' || best.type === 'meeting' || best.type === 'call')) return { type: 'one-on-one', score: best.score, source: 'signal', why: 'two names' };
    // A meeting with a join link and no room reads as a video call.
    if (best.type === 'meeting' && f.link && best.kw && !f.physical) return { type: 'video-call', score: best.score, source: 'keyword', why: 'a meeting with a join link' };
    return { type: best.type, score: best.score, source: best.kw ? 'keyword' : 'signal', why: best.kw ? `“${best.hits[0]}”` : 'its time, place, people or link' };
  }
  return null;
}

function animScene(type) { return _ANIM_BY_TYPE.get(type) || _ANIM_BY_TYPE.get('event'); }
function animTypes() { return ANIM_SCENES.map(s => s.type); }
/** The scene's SVG markup (trusted: built from constants only). */
function animSceneSvg(type) {
  const s = animScene(type);
  return `<svg class="as as-${s.type}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${s.svg()}</svg>`;
}
