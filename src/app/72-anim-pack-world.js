/* ============================================================
   ANIMATION PACK "world" (v2.2 wave 6): the world pack starter. PURE classic
   script. Big cities, two elements each, tied to the travel feature: they
   play only while travel places you in that city (78-anim-world.js sets
   ctx.city and ctx.country from the travel location; nothing is looked up
   online). Every item carries:
     city       the travel city id ('tokyo-jp': 69-travel-data.js, name + country)
     country    ISO 3166-1 alpha-2 ('JP'); region is [country]
     worldKind  signature | element
                signature: the opening slot, the city's landmark. It is the art on the
                           travel arrival card and wins the day's opening while there.
                element:   the symbol slot, a second motif for the daily look while there.
     when       ctx.city === city
   Exactly one signature and one element per city (tests/anim-packs.test.mjs, "world pack").
   Priority 1, so a festival or the birthday (priority 2+) still wins the day.
   How to add a city or a country: docs/dev/WORLD_PACK.md.
   ============================================================ */
(function () {
  const items = [];
  const CITIES = {
    'tokyo-jp': ['Tokyo', 'JP'], 'new-york-us': ['New York', 'US'], 'paris-fr': ['Paris', 'FR'], 'rome-it': ['Rome', 'IT'],
    'barcelona-es': ['Barcelona', 'ES'], 'berlin-de': ['Berlin', 'DE'], 'amsterdam-nl': ['Amsterdam', 'NL'], 'prague-cz': ['Prague', 'CZ'],
    'lisbon-pt': ['Lisbon', 'PT'], 'dubai-ae': ['Dubai', 'AE'], 'singapore-sg': ['Singapore', 'SG'], 'sydney-au': ['Sydney', 'AU'],
  };
  /** One city element. kind: 'signature' (opening) or 'element' (symbol). */
  const add = (city, kind, o) => {
    const [name, cc] = CITIES[city];
    items.push(Object.assign({
      slot: kind === 'signature' ? 'opening' : 'symbol', mood: 'calm', intensity: 'subtle', theme: 'any', season: 'any', region: [cc], reduced: 'static', priority: 1,
      city, country: cc, worldKind: kind, signature: kind === 'signature',
      when: (day, ctx) => !!ctx && ctx.city === city,
    }, o, {
      id: city + '-' + o.id,
      label: o.label + ', ' + name,
      tags: ['world', name.toLowerCase(), cc.toLowerCase(), kind].concat(o.tags || []),
    }));
  };
  const wv = (y, d, cls) => `<path class="${cls || 'lc'} x-wave" style="--d:${d || 0}s" d="M0 ${y}${'q3-2 6 0t6 0'.repeat(11)}"/>`;
  const sun = (x, y, r) => `<circle class="s x-pulse" cx="${x}" cy="${y}" r="${r || 6}"/>`;
  const star = (x, y, d) => `<path class="c x-twinkle" style="--d:${d}s" d="M${x} ${y - 3}l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>`;
  const ground = '<path class="lm" d="M6 58h52"/>';

  /* ---------- Tokyo ---------- */
  add('tokyo-jp', 'signature', { id: 'tower', label: 'Tokyo Tower', colour: 'red', tags: ['tower', 'landmark'],
    svg: () => sun(50, 14, 6) + '<path class="lc t" d="M32 8L21 56M32 8L43 56"/><path class="lc" d="M25 42h14M27 30h10M29 19h6M22 50h20"/>'
      + '<path class="lc" d="M25 42l12 8M39 42l-12 8M27 30l10 12M37 30l-10 12"/><circle class="c x-blink" cx="32" cy="7" r="1.8"/>' + ground });
  add('tokyo-jp', 'element', { id: 'sakura', label: 'Cherry blossom', colour: 'pink', mood: 'dreamy', tags: ['blossom', 'spring'],
    svg: () => '<path class="lk" d="M4 16q14 2 24 12t30 6"/>'
      + [[14, 18], [28, 28], [44, 32], [54, 34]].map(([x, y], i) => `<g class="x-pulse" style="--d:${i * 0.3}s"><circle class="c" cx="${x}" cy="${y}" r="4"/><circle class="w" cx="${x}" cy="${y}" r="1.4"/></g>`).join('')
      + [[18, 40, 0], [34, 44, 0.8], [48, 46, 1.6], [26, 50, 2.4]].map(([x, y, d]) => `<ellipse class="s x-fall" style="--d:${d}s" cx="${x}" cy="${y}" rx="2.2" ry="1.3"/>`).join('') });

  /* ---------- New York ---------- */
  add('new-york-us', 'signature', { id: 'skyline', label: 'Empire State skyline', colour: 'indigo', tags: ['skyline', 'landmark'],
    svg: () => star(12, 12, 0) + star(50, 9, 0.7)
      + '<path class="c" d="M28 56V26h3v-6h2v-8h1V4h0.5v8h1v8h2v6h3v30z"/><path class="m" d="M8 56V36h8v20zM46 56V30h10v26zM16 56V42h8v14z"/>'
      + '<path class="lw" d="M31 32h6M31 38h6M31 44h6M31 50h6"/><circle class="w x-blink" cx="34.5" cy="5" r="1.2"/>' + ground });
  add('new-york-us', 'element', { id: 'taxi', label: 'Yellow cab', colour: 'amber', mood: 'energetic', tags: ['taxi', 'street'],
    svg: () => '<g class="x-bob"><path class="c" d="M10 42l5-10h28l7 10h4v8H8v-8z"/><path class="w" d="M18 34h10v8H16zM31 34h10l4 8H31z"/><rect class="k" x="27" y="28" width="10" height="4" rx="1"/>'
      + '<circle class="k" cx="18" cy="51" r="4.5"/><circle class="k" cx="44" cy="51" r="4.5"/><circle class="w" cx="18" cy="51" r="1.6"/><circle class="w" cx="44" cy="51" r="1.6"/></g>'
      + '<path class="lm dash x-slidel" d="M2 60h60"/>' });

  /* ---------- Paris ---------- */
  add('paris-fr', 'signature', { id: 'eiffel', label: 'Eiffel Tower', colour: 'amber', tags: ['tower', 'landmark'],
    svg: () => '<path class="lk t" d="M32 6v6M29 12h6M28 12q0 24-14 44M36 12q0 24 14 44"/><path class="lk" d="M24 32h16M20 44h24M22 56q10-12 20 0"/>'
      + star(14, 18, 0) + star(50, 22, 0.6) + star(44, 10, 1.2) + '<circle class="c x-blink" cx="32" cy="5" r="1.6"/>' + ground });
  add('paris-fr', 'element', { id: 'cafe', label: 'Café crème', colour: 'orange', mood: 'cosy', tags: ['cafe', 'coffee'],
    svg: () => '<path class="w lk" d="M16 30h26v10a13 13 0 0 1-26 0z"/><path class="lk" d="M42 33h4a5 5 0 0 1 0 10h-5"/><path class="lm" d="M10 56h40"/>'
      + '<ellipse class="s" cx="29" cy="31" rx="11" ry="2"/>' + [22, 29, 36].map((x, i) => `<path class="lm x-steam" style="--d:${i * 0.6}s" d="M${x} 24q-2-3 0-6t0-6"/>`).join('') });

  /* ---------- Rome ---------- */
  add('rome-it', 'signature', { id: 'colosseum', label: 'The Colosseum', colour: 'orange', tags: ['colosseum', 'landmark'],
    svg: () => sun(50, 12, 6) + '<path class="w lk" d="M8 54V26q24-10 48 0v28z"/><path class="lk" d="M8 36q24-8 48 0M8 46q24-6 48 0"/>'
      + [13, 21, 29, 37, 45, 51].map(x => `<path class="s" d="M${x} 46v-6a2.5 2.5 0 0 1 5 0v6z"/>`).join('')
      + [14, 22, 30, 38, 46].map(x => `<path class="m" d="M${x} 36v-4a2 2 0 0 1 4 0v4z"/>`).join('') + ground });
  add('rome-it', 'element', { id: 'fountain', label: 'A coin in the fountain', colour: 'teal', mood: 'cheerful', tags: ['fountain', 'wish'],
    svg: () => '<path class="w lk" d="M10 46h44l-4 10H14z"/><path class="lc" d="M32 46V30"/><path class="c" d="M26 30h12l-2 3h-8z"/>'
      + [0, 0.5, 1].map(d => `<path class="lc x-fall" style="--d:${d}s" d="M${28 - d * 4} 32q-6 4-6 12M${36 + d * 4} 32q6 4 6 12"/>`).join('')
      + '<circle class="c x-arc" cx="48" cy="18" r="2.6"/>' + wv(50, 0, 'lw') });

  /* ---------- Barcelona ---------- */
  add('barcelona-es', 'signature', { id: 'sagrada', label: 'Sagrada Família', colour: 'amber', tags: ['basilica', 'landmark', 'gaudi'],
    svg: () => [[14, 22], [24, 12], [40, 12], [50, 22]].map(([x, y], i) => `<path class="w lk" d="M${x - 4} 56V${y + 8}q4-${10 + i % 2 * 4} 8 0v${48 - y}"/><circle class="c x-twinkle" style="--d:${i * 0.4}s" cx="${x}" cy="${y - (i % 2 ? 4 : 0)}" r="1.8"/>`).join('')
      + '<path class="s" d="M26 56V38q6-8 12 0v18z"/>' + ground });
  add('barcelona-es', 'element', { id: 'trencadis', label: 'Mosaic tiles', colour: 'teal', mood: 'cheerful', tags: ['mosaic', 'tiles', 'gaudi'],
    svg: () => '<path class="w lk" d="M8 40q24-28 48 0v14H8z"/>'
      + [[14, 44, 'c'], [22, 36, 's'], [30, 32, 'c'], [38, 34, 's'], [46, 40, 'c'], [18, 50, 's'], [30, 46, 'c'], [42, 50, 's']]
        .map(([x, y, f], i) => `<path class="${f} x-twinkle" style="--d:${(i * 0.35).toFixed(2)}s" d="M${x} ${y}l4-2 3 4-4 3-4-1z"/>`).join('') });

  /* ---------- Berlin ---------- */
  add('berlin-de', 'signature', { id: 'brandenburg', label: 'Brandenburg Gate', colour: 'slate', tags: ['gate', 'landmark'],
    svg: () => '<path class="w lk" d="M8 26h48v4H8zM10 22h44v4H10z"/>' + [12, 21, 30, 39, 48].map(x => `<path class="w lk" d="M${x} 30h4v24h-4z"/>`).join('')
      + '<g class="x-bob"><path class="c" d="M26 14h12l2 8H24z"/><path class="lk" d="M32 8v6"/></g><path class="c x-flag" d="M32 8h7l-2 2.5 2 2.5h-7z"/>' + ground });
  add('berlin-de', 'element', { id: 'tv-tower', label: 'The TV tower', colour: 'red', mood: 'focused', tags: ['tower'],
    svg: () => '<path class="lk t" d="M32 4v14M32 32v24"/><circle class="w lk" cx="32" cy="25" r="8"/><path class="lk" d="M24 25h16"/>'
      + '<path class="lk" d="M28 56l4-24 4 24"/><circle class="c x-blink" cx="32" cy="4" r="2"/>' + star(12, 14, 0.3) + star(52, 18, 1) + ground });

  /* ---------- Amsterdam ---------- */
  add('amsterdam-nl', 'signature', { id: 'canal-houses', label: 'Canal houses', colour: 'orange', tags: ['canal', 'houses', 'landmark'],
    svg: () => [[8, 20, 'c'], [20, 14, 'w'], [32, 18, 's'], [44, 12, 'c']].map(([x, y, f]) => `<path class="${f} lk" d="M${x} 46V${y + 6}l3-3v-3h6v3l3 3v${40 - y}z"/><path class="lk" d="M${x + 4} ${y + 14}h4M${x + 4} ${y + 22}h4"/>`).join('')
      + wv(50, 0) + wv(56, 0.6, 'lm') });
  add('amsterdam-nl', 'element', { id: 'bicycle', label: 'Bicycle', colour: 'green', mood: 'cheerful', tags: ['bike', 'street'],
    svg: () => '<g class="x-spin" style="--ad:2.4s"><circle class="lk" cx="16" cy="42" r="10"/><path class="lm" d="M16 32v20M6 42h20"/></g>'
      + '<g class="x-spin" style="--ad:2.4s"><circle class="lk" cx="48" cy="42" r="10"/><path class="lm" d="M48 32v20M38 42h20"/></g>'
      + '<path class="lc t" d="M16 42l10-14h16l6 14M26 28l6 14h-16M32 42l10-14"/><path class="lk" d="M24 24h6M42 28l-2-6h5"/>' });

  /* ---------- Prague ---------- */
  add('prague-cz', 'signature', { id: 'spires', label: 'Old Town spires', colour: 'indigo', tags: ['spires', 'landmark'],
    svg: () => '<path class="w lk" d="M14 56V24l6-14 6 14v32zM38 56V24l6-14 6 14v32z"/><path class="w lk" d="M26 56V34h12v22z"/>'
      + [[16, 22], [22, 22], [40, 22], [46, 22]].map(([x, y]) => `<path class="lk" d="M${x} ${y}l-2-6 2-1 2 1z"/>`).join('')
      + '<circle class="c x-twinkle" cx="20" cy="9" r="1.6"/><circle class="c x-twinkle" style="--d:0.8s" cx="44" cy="9" r="1.6"/>' + ground });
  add('prague-cz', 'element', { id: 'orloj', label: 'Astronomical clock', colour: 'amber', mood: 'dreamy', tags: ['clock'],
    svg: () => '<circle class="w lk t" cx="32" cy="32" r="22"/><circle class="s" cx="32" cy="32" r="14"/><circle class="lc" cx="36" cy="30" r="9"/>'
      + '<g class="x-spin-slow"><path class="lk t" d="M32 32V14"/><circle class="c" cx="32" cy="14" r="2.4"/></g><circle class="k" cx="32" cy="32" r="2"/>' });

  /* ---------- Lisbon ---------- */
  add('lisbon-pt', 'signature', { id: 'tram', label: 'Tram 28', colour: 'amber', tags: ['tram', 'landmark'],
    svg: () => '<path class="lk" d="M4 12l56 6M34 15l-2 9"/><g class="x-bob"><path class="c lk" d="M10 26h44v22H10z"/><path class="w" d="M14 30h8v8h-8zM26 30h8v8h-8zM38 30h8v8h-8z"/>'
      + '<path class="lk" d="M10 42h44"/><circle class="k" cx="20" cy="50" r="3"/><circle class="k" cx="44" cy="50" r="3"/></g><path class="lm" d="M4 56l56-4"/>' });
  add('lisbon-pt', 'element', { id: 'azulejo', label: 'Azulejo tile', colour: 'blue', mood: 'calm', tags: ['tiles'],
    svg: () => '<rect class="w lc" x="10" y="10" width="44" height="44" rx="2"/><path class="lc" d="M32 10v44M10 32h44"/>'
      + '<g class="x-spin-slow"><path class="c" d="M32 20l4 8 8 4-8 4-4 8-4-8-8-4 8-4z"/></g><circle class="w" cx="32" cy="32" r="2.4"/>'
      + [[16, 16], [48, 16], [16, 48], [48, 48]].map(([x, y], i) => `<circle class="s x-pulse" style="--d:${i * 0.4}s" cx="${x}" cy="${y}" r="3"/>`).join('') });

  /* ---------- Dubai ---------- */
  add('dubai-ae', 'signature', { id: 'burj', label: 'The tallest tower', colour: 'slate', tags: ['tower', 'landmark'],
    svg: () => sun(14, 16, 6) + '<path class="c" d="M31 4h2l1 14 2 2 1 14 2 2 1 18H25l1-18 2-2 1-14 2-2z"/><path class="lw" d="M32 20v34"/>'
      + '<circle class="w x-blink" cx="32" cy="5" r="1.2"/><path class="m" d="M8 56V46h8v10zM46 56V42h10v14z"/>' + ground });
  add('dubai-ae', 'element', { id: 'dunes', label: 'Desert dunes', colour: 'amber', mood: 'calm', tags: ['desert', 'dunes'],
    svg: () => '<circle class="c x-float" cx="44" cy="18" r="7"/><path class="s" d="M2 46q16-14 30-4t30-6v24H2z"/><path class="c" d="M2 52q20-10 34-2t26-2v12H2z"/>'
      + '<path class="lm x-wave" style="--ad:4s" d="M6 40q6-2 10 0"/>' });

  /* ---------- Singapore ---------- */
  add('singapore-sg', 'signature', { id: 'marina', label: 'Marina Bay towers', colour: 'teal', tags: ['towers', 'landmark'],
    svg: () => '<path class="w lk" d="M14 50l2-30h6l1 30zM28 50l2-30h6l1 30zM42 50l2-30h6l1 30z"/><path class="c" d="M10 18q24-6 46 0v3q-23-5-46 0z"/>'
      + star(8, 10, 0) + star(56, 8, 0.9) + wv(54, 0) + wv(59, 0.6, 'lm') });
  add('singapore-sg', 'element', { id: 'supertree', label: 'Supertree grove', colour: 'violet', mood: 'dreamy', tags: ['garden', 'trees'],
    svg: () => [[18, 22, 0], [40, 16, 0.6]].map(([x, y, d]) => `<path class="lk" d="M${x - 2} 56l1-${54 - y}h2l1 ${54 - y}"/><path class="s lc" d="M${x - 12} ${y}q12 8 24 0l-10 10h-4z"/>`
      + `<g class="x-glow" style="--d:${d}s"><circle class="c" cx="${x - 9}" cy="${y}" r="1.6"/><circle class="c" cx="${x}" cy="${y + 3}" r="1.6"/><circle class="c" cx="${x + 9}" cy="${y}" r="1.6"/></g>`).join('')
      + ground });

  /* ---------- Sydney ---------- */
  add('sydney-au', 'signature', { id: 'opera-house', label: 'The Opera House', colour: 'blue', tags: ['opera', 'landmark'],
    svg: () => sun(50, 14, 6) + '<path class="w lk" d="M10 46q4-18 14-22-2 12 2 22zM22 46q6-22 18-26-4 14 0 26zM36 46q6-16 16-18-4 10-2 18z"/>'
      + '<path class="lk" d="M6 46h52"/>' + wv(52, 0) + wv(58, 0.6, 'lm') });
  add('sydney-au', 'element', { id: 'harbour-bridge', label: 'Harbour Bridge', colour: 'slate', mood: 'proud', tags: ['bridge'],
    svg: () => '<circle class="c x-rise" cx="32" cy="20" r="5"/><path class="lk t" d="M6 44q26-34 52 0"/><path class="lk" d="M6 44h52M14 34v10M22 28v16M32 26v18M42 28v16M50 34v10"/>'
      + '<path class="w lk" d="M4 36h6v10H4zM54 36h6v10h-6z"/>' + wv(52, 0) });

  animRegisterPack({
    id: 'world', name: 'World cities', version: '1.0.0',
    description: 'Big cities around the world, two animations each. They play when travel places you there: the landmark on the arrival card and in the day\'s opening.',
    css: '', items,
  });
})();
