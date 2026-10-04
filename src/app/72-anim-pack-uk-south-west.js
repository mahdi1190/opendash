/* ============================================================
   ANIMATION PACK "uk-south-west" (v2.2 wave 3, UK batch 1): the model for
   every UK regional pack (docs/dev/UK_PACK.md). PURE classic script.
   Opt-in: these play only when Settings > Animations > "Regional animations
   (UK)" is on and the detected county (71-uk-counties.js, offline: the weather
   town or the travel location, then the nearest main town) is theirs. Every
   item carries:
     county    the area id from UK_COUNTIES ('cornwall')
     ukRegion  the pack region ('south-west')
     ukKind    signature | landmark | landscape | tradition | food | sport | heritage
               (sport and heritage share the fifth element)
     region    the nation, ISO 3166-2 ('GB-ENG')
     when      ctx.county === county (and, for a dated tradition, its months)
   One signature opening per county (the "Welcome to <county>" moment) plus up
   to 5 elements. Items sit in the opening slot at priority 1, so a festival
   or the birthday (priority 2+) still wins the day.
   ============================================================ */
(function () {
  const REGION = 'south-west', NATION = 'GB-ENG';
  const items = [];
  const f = (n) => +Number(n).toFixed(2);
  const NAMES = { cornwall: 'Cornwall', devon: 'Devon', dorset: 'Dorset', somerset: 'Somerset', bristol: 'Bristol', gloucestershire: 'Gloucestershire', wiltshire: 'Wiltshire' };
  /** One county element. months: only in those months (a dated tradition). */
  const add = (county, kind, o) => {
    const months = o.months || null;
    items.push(Object.assign({
      slot: 'opening', mood: 'calm', intensity: 'subtle', theme: 'any', season: 'any', region: [NATION], reduced: 'static', priority: 1,
      county, ukRegion: REGION, ukKind: kind, signature: kind === 'signature',
      when: (day, ctx) => !!ctx && ctx.county === county && (!months || months.includes(+String(day).slice(5, 7))),
    }, o, {
      id: county + '-' + o.id,
      label: o.label + ', ' + NAMES[county],
      tags: ['uk', 'south west', NAMES[county].toLowerCase(), kind].concat(o.tags || []),
    }));
  };
  // shared strokes: a row of waves (it drifts left with x-wave), a cloud, a gull
  const wv = (y, d, cls) => `<path class="${cls || 'lw'} x-wave" style="--d:${d || 0}s" d="M0 ${y}${'q3-2 6 0t6 0'.repeat(7)}"/>`;
  const cloud = (x, y, d) => `<g class="x-float2" style="--d:${d || 0}s"><path class="w lm" d="M${x} ${y}a4 4 0 0 1 7-3 3 3 0 0 1 5 2 2.5 2.5 0 0 1 0 5h-11a2 2 0 0 1-1-4z"/></g>`;
  const gull = (x, y, d) => `<g class="x-bob" style="--d:${d || 0}s"><path class="lk" d="M${x} ${y}q2-2 4 0 2-2 4 0"/></g>`;
  const steam = (xs, y) => xs.map((x, i) => `<path class="lm x-steam" style="--d:${f(i * 0.5)}s" d="M${x} ${y}q-2-3 0-6t0-6"/>`).join('');

  /* ---------- Cornwall ---------- */
  add('cornwall', 'signature', { id: 'st-michaels-mount', label: 'St Michael\'s Mount', colour: 'teal', mood: 'dreamy', tags: ['island', 'castle', 'causeway'],
    svg: () => `<circle class="s x-glow" cx="50" cy="14" r="6"/>${cloud(8, 16, 0.6)}<path class="k" d="M10 46q8-12 16-16l1-8h10l1 8q8 4 16 16z"/><path class="k" d="M27 22v-5h2v2h2v-3h2v3h2v-2h2v5z"/><path class="lw" d="M30 26v2M34 26v2"/><rect class="m" x="0" y="46" width="64" height="18"/><path class="lw dash" d="M36 50q10 3 22 8"/>${wv(54, 0)}${wv(60, 0.6)}` });
  add('cornwall', 'landmark', { id: 'engine-house', label: 'Engine house on the cliffs', colour: 'slate', tags: ['mining heritage', 'world heritage', 'cliffs'],
    svg: () => `<rect class="c" x="0" y="48" width="64" height="16" opacity=".35"/><path class="m" d="M0 64V42h34l6 8v14z"/><path class="k" d="M8 42V27l8-6 8 6v15z"/><path class="lw" d="M13 42v-7a3 3 0 0 1 6 0v7M15 28h2"/><path class="k" d="M26 42V12h4v30z"/><path class="lw" d="M26 16h4"/>${cloud(40, 14, 0.4)}${gull(44, 28, 0.8)}${wv(56, 0.3)}` });
  add('cornwall', 'landscape', { id: 'atlantic-surf', label: 'Atlantic surf', colour: 'blue', mood: 'energetic', tags: ['surf', 'coast', 'waves'],
    svg: () => `<rect class="m" x="0" y="44" width="64" height="20"/><g class="x-float2" style="transform-origin:26px 40px"><path class="c" d="M2 50q4-26 28-26 14 0 16 12-6-6-12-2 4 4 2 10-2 6-34 6z"/><path class="lw" d="M28 30q8-2 12 4"/></g><g class="x-bob" style="--d:.3s"><path class="k" d="M40 47l13-3 1 2-13 3z"/><path class="lk" d="M46 45l-1-6 3-4M45 39l-3 2M48 35l3 2"/><circle class="k" cx="49" cy="32" r="2"/></g>${wv(58, 0.2)}` });
  add('cornwall', 'food', { id: 'pasty', label: 'Cornish pasty', colour: 'amber', mood: 'cosy', tags: ['pasty', 'pgi', 'baking'],
    svg: () => `<ellipse class="w lm" cx="32" cy="50" rx="24" ry="6"/><path class="c lk" d="M12 48a20 18 0 0 1 40 0z"/><path class="lk dash t" d="M15 45a17 15 0 0 1 34 0"/><path class="lw" d="M24 42l2-2M34 40l2 2"/>${steam([24, 32, 40], 26)}` });

  /* ---------- Devon ---------- */
  add('devon', 'signature', { id: 'dartmoor-tor', label: 'A Dartmoor tor', colour: 'green', tags: ['dartmoor', 'granite', 'moor', 'national park'],
    svg: () => `${cloud(6, 14, 0)}${cloud(42, 10, 1.1)}<path class="c" d="M0 64V46q16-8 32-4t32-2v24z"/><path class="k" d="M20 43h24v-6H20zM22 37h18v-6H22zM25 31h11v-5H25z"/><path class="lw" d="M20 37h24M22 31h18M31 43v-6M29 31v-5"/><path class="lk" d="M8 54l2-3 2 3M50 56l2-3 2 3"/>${gull(46, 22, 0.5)}` });
  add('devon', 'landmark', { id: 'smeatons-tower', label: 'Smeaton\'s Tower on Plymouth Hoe', colour: 'red', tags: ['lighthouse', 'plymouth', 'hoe'],
    svg: () => `<g class="x-pulse o-v" style="transform-origin:32px 17px"><path class="s" opacity=".55" d="M36 15l20-6v12zM28 15l-20-6v12z"/></g><path class="c" d="M27 14l5-5 5 5z"/><rect class="k" x="28" y="14" width="8" height="6"/><path class="w lk" d="M26 52l3-32h6l3 32z"/><path class="c" d="M27.1 40l.6-6h8.6l.6 6zM28.3 28l.3-4h6.8l.3 4z"/><path class="m" d="M0 64V52h64v12z"/>${wv(58, 0.4)}` });
  add('devon', 'food', { id: 'cream-tea', label: 'Devon cream tea', colour: 'red', mood: 'cosy', tags: ['cream tea', 'scone', 'clotted cream'],
    svg: () => `<ellipse class="w lm" cx="24" cy="50" rx="18" ry="5"/><path class="s lk" d="M12 48v-6q12-5 24 0v6z"/><path class="w lk" d="M12 42q4-5 8-2 4-4 8 0 4-3 8 2z"/><path class="c" d="M17 38q7-4 14 0-7 2-14 0z"/><path class="w lk" d="M42 36h16v8a8 8 0 0 1-16 0z"/><path class="lk" d="M58 39h2a3 3 0 0 1 0 6h-3"/>${steam([47, 53], 32)}` });
  add('devon', 'landscape', { id: 'dartmoor-pony', label: 'Dartmoor pony', colour: 'amber', tags: ['pony', 'dartmoor', 'wildlife'],
    svg: () => `${cloud(40, 12, 0.3)}<path class="m" d="M0 64V50q32-8 64 0v14z"/><g class="x-bob"><path class="k" d="M16 42q1-7 12-7h9q3 0 5-3l5-6 4 2-3 7q-2 6-6 8v10h-3v-8H25v8h-3v-9q-5-1-6-2z"/><path class="lk" d="M16 41q-4 4-2 10"/><path class="lk" d="M45 27l-3 6"/></g><path class="lk" d="M6 58l2-3 2 3M54 58l2-3 2 3"/>` });

  /* ---------- Dorset ---------- */
  add('dorset', 'signature', { id: 'durdle-door', label: 'Durdle Door', colour: 'teal', mood: 'dreamy', tags: ['jurassic coast', 'arch', 'world heritage'],
    svg: () => `<g class="x-glow"><circle class="s" cx="34" cy="40" r="5"/></g><path class="m" d="M4 46V30q6-10 18-10h18q12 2 14 12l2 14H44v-6q0-10-8-10h-6q-6 0-6 10v6z"/><path class="lk" d="M10 30q8-6 18-6"/><rect class="c" x="0" y="46" width="64" height="18" opacity=".6"/>${wv(50, 0)}${wv(56, 0.5)}${gull(48, 12, 0.2)}` });
  add('dorset', 'landscape', { id: 'ammonite', label: 'Jurassic Coast ammonite', colour: 'amber', tags: ['fossil', 'jurassic coast', 'lyme regis'],
    svg: () => `<rect class="m" x="6" y="12" width="52" height="42" rx="9"/><circle class="c" cx="32" cy="32" r="13"/><path class="lk t" d="M32 32a2 2 0 0 1 4 0a4 4 0 0 1-8 0a6 6 0 0 1 12 0a8 8 0 0 1-16 0a10 10 0 0 1 20 0a12 12 0 0 1-24 0"/><circle class="w x-twinkle" cx="50" cy="18" r="1.6"/><circle class="w x-twinkle" style="--d:.8s" cx="13" cy="46" r="1.3"/>` });
  add('dorset', 'landmark', { id: 'corfe-castle', label: 'Corfe Castle', colour: 'violet', tags: ['castle', 'ruin', 'purbeck'],
    svg: () => `<path class="m" d="M0 64V50q16-18 32-18t32 18v14z"/><path class="k" d="M24 34V18h2v-2h2v2h2v-2h2v2h2v16zM38 34v-9h2v-2h2v2h2v9z"/><path class="lw" d="M28 22v3M41 28v2"/><g class="x-float2" style="--d:.5s"><path class="lw t" d="M4 44h16M44 46h16"/></g><path class="k" d="M6 60h14v-6h-4v-3h-3v3H6z"/>${steam([9], 50)}` });
  add('dorset', 'sport', { id: 'sailing', label: 'Sailing off Portland', colour: 'blue', mood: 'energetic', tags: ['sailing', 'portland', 'weymouth'],
    svg: () => `<path class="m" opacity=".7" d="M46 46l6-7h12v7z"/><rect class="c" x="0" y="46" width="64" height="18" opacity=".45"/><g class="x-bob"><path class="k" d="M18 46h26l-4 5H22z"/><path class="lk" d="M31 46V14"/><path class="c" d="M32 16l12 28H32z"/><path class="s lk" d="M30 18l-10 26h10z"/></g>${wv(54, 0.2)}${wv(60, 0.7)}${cloud(46, 10, 0.4)}` });

  /* ---------- Somerset ---------- */
  add('somerset', 'signature', { id: 'glastonbury-tor', label: 'Glastonbury Tor', colour: 'green', mood: 'dreamy', tags: ['tor', 'levels', 'st michael\'s tower'],
    svg: () => `<circle class="s x-glow" cx="12" cy="14" r="5"/><path class="c" d="M6 50q14-2 18-14 4-10 8-10t8 10q4 12 18 14z"/><path class="k" d="M30 26V14h4v12z"/><path class="lw" d="M32 26v-3"/><rect class="m" x="0" y="50" width="64" height="14"/><path class="lw" d="M0 56h64M0 60h64"/><g class="x-float2" style="--d:.4s"><path class="lw t" d="M4 46h12M48 47h12"/></g>` });
  add('somerset', 'landscape', { id: 'cheddar-gorge', label: 'Cheddar Gorge', colour: 'slate', tags: ['gorge', 'limestone', 'mendips'],
    svg: () => `<path class="m" d="M18 64l4-30h20l4 30z"/><path class="k" d="M0 64V8l6 6 4-2 4 10 5 4 3 38z"/><path class="k" d="M64 64V12l-6 4-4 6-6 2-4 12-2 28z"/><path class="lw t" d="M30 64q-4-8 3-14t1-14"/>${gull(26, 16, 0)}${gull(34, 22, 0.7)}` });
  add('somerset', 'tradition', { id: 'wassail', label: 'Orchard wassail', colour: 'red', mood: 'cosy', months: [1], tags: ['wassail', 'orchard', 'cider apples', 'january'],
    svg: () => `<circle class="s" cx="52" cy="10" r="4"/><path class="m" d="M0 64V56h64v8z"/><path class="k" d="M30 56V40l-7-6 2-1 6 5 6-6 2 1-6 7v16z"/><circle class="m" cx="31" cy="26" r="14"/>${[[24, 22], [36, 20], [30, 30], [40, 28]].map(([x, y]) => `<circle class="c" cx="${x}" cy="${y}" r="2"/>`).join('')}<path class="lk" d="M6 14q14 8 26 2"/>${[[10, 17, 0], [18, 19, 0.5], [26, 18, 1]].map(([x, y, d]) => `<circle class="s x-twinkle" style="--d:${d}s" cx="${x}" cy="${y}" r="2"/>`).join('')}` });
  add('somerset', 'landmark', { id: 'roman-baths', label: 'The Roman Baths, Bath', colour: 'teal', tags: ['bath', 'roman', 'world heritage', 'spa'],
    svg: () => `<path class="k" d="M6 22h52L32 12z"/>${[9, 21, 33, 45].map(x => `<rect class="w lk" x="${x}" y="22" width="6" height="18"/>`).join('')}<path class="m" d="M4 40h56v4H4zM4 54h56v4H4z"/><rect class="c" x="6" y="44" width="52" height="10"/>${steam([16, 30, 44], 42)}` });

  /* ---------- Bristol ---------- */
  add('bristol', 'signature', { id: 'clifton-bridge', label: 'Clifton Suspension Bridge', colour: 'indigo', tags: ['bridge', 'avon gorge', 'brunel'],
    svg: () => `<g class="x-float2"><circle class="c" cx="46" cy="9" r="4"/><path class="lk" d="M44 12l1 3h2l1-3"/></g><path class="m" d="M0 64V30h12l5 34zM64 64V30H52l-5 34z"/><path class="c" d="M17 64l1-6h28l1 6z"/><rect class="k" x="10" y="19" width="5" height="13"/><rect class="k" x="49" y="19" width="5" height="13"/><path class="lk t" d="M12 32h40"/><path class="lk" d="M12 21Q32 39 52 21"/><path class="lm" d="M20 26.8V32M26 29.2V32M32 30V32M38 29.2V32M44 26.8V32"/>` });
  const balloon = (x, y, r, cls, d) => `<g class="x-float2" style="--d:${d}s"><path class="${cls} lk" d="M${x} ${f(y + 1.3 * r)}Q${f(x - r)} ${f(y + 0.7 * r)} ${f(x - r)} ${y}A${r} ${r} 0 0 1 ${f(x + r)} ${y}Q${f(x + r)} ${f(y + 0.7 * r)} ${x} ${f(y + 1.3 * r)}z"/><path class="lw" d="M${x} ${y - r}V${f(y + 1.3 * r)}"/><rect class="k" x="${x - 2}" y="${f(y + 1.3 * r + 2)}" width="4" height="3"/></g>`;
  add('bristol', 'tradition', { id: 'balloon-fiesta', label: 'Balloon Fiesta', colour: 'orange', mood: 'cheerful', intensity: 'standard', months: [8], tags: ['balloons', 'fiesta', 'august', 'ashton court'],
    svg: () => `${balloon(18, 18, 9, 'c', 0)}${balloon(42, 12, 7, 's', 0.8)}${balloon(50, 34, 5, 'c', 1.5)}<path class="m" d="M0 64V54q16-6 32-2t32-2v14z"/>` });
  add('bristol', 'landmark', { id: 'ss-great-britain', label: 'SS Great Britain', colour: 'red', tags: ['ship', 'brunel', 'harbour', 'heritage'],
    svg: () => `${[14, 22, 30, 38, 46, 52].map((x, i) => `<path class="lk" d="M${x} 44V${i === 2 ? 14 : 20}"/>`).join('')}<path class="lm" d="M14 24L30 16 46 24M22 22h24"/><rect class="c" x="33" y="32" width="4" height="12"/><path class="c x-flag o-v" style="transform-origin:30px 15px" d="M30 15h7l-2 2 2 2h-7z"/><path class="k" d="M6 44h52l-6 8H12z"/><path class="lw" d="M9 47h46"/><rect class="m" x="0" y="52" width="64" height="12"/>${gull(50, 10, 0.5)}` });
  add('bristol', 'landscape', { id: 'harbourside-houses', label: 'Coloured houses above the harbour', colour: 'pink', mood: 'cheerful', tags: ['harbour', 'cliftonwood', 'houses'],
    svg: () => `<path class="m" d="M0 46q32-24 64-14v14z" opacity=".6"/>${[0, 1, 2, 3, 4, 5, 6].map(i => { const x = 4 + 8 * i, b = 46 - i * 2.4; return `<path class="${['c', 's', 'w', 'c', 'w', 's', 'c'][i]} lk" d="M${x} ${f(b)}v-10l4-4 4 4v10z"/><path class="lk" d="M${x + 3} ${f(b - 6)}h2"/>`; }).join('')}<rect class="c" x="0" y="48" width="64" height="16" opacity=".35"/>${wv(54, 0.2)}<g class="x-bob" style="--d:.6s"><path class="k" d="M40 58h14l-2 3H42z"/></g>` });

  /* ---------- Gloucestershire ---------- */
  add('gloucestershire', 'signature', { id: 'cotswold-village', label: 'A Cotswold village', colour: 'amber', mood: 'cosy', tags: ['cotswolds', 'stone cottages', 'aonb'],
    svg: () => `<path class="m" d="M0 40q16-10 32-4t32-6v34H0z" opacity=".6"/><path class="s lk" d="M6 58V44l8-8 8 8v14zM22 58V46h18v12z"/><path class="k" d="M22 46l4-8h10l4 8z"/><rect class="k" x="10" y="34" width="2.5" height="6"/><rect class="k" x="34" y="34" width="2.5" height="5"/><path class="lk" d="M11 50h3v3h-3zM27 50h3v3h-3zM33 50h3v3h-3z"/>${steam([11, 35], 32)}<ellipse class="w lk" cx="50" cy="54" rx="5" ry="3"/><circle class="k" cx="55" cy="52" r="1.6"/><path class="m" d="M0 58h64v6H0z"/>` });
  add('gloucestershire', 'landmark', { id: 'gloucester-cathedral', label: 'Gloucester Cathedral', colour: 'slate', tags: ['cathedral', 'gothic', 'tower'],
    svg: () => `<path class="s lk" d="M4 58V40h20v18zM40 58V40h20v18z"/><path class="s lk" d="M24 58V22h16v36z"/><path class="k" d="M23 22l1.5-7 1.5 7zM38 22l1.5-7 1.5 7zM30.5 22l1.5-5 1.5 5z"/><path class="lk" d="M30 40v-8a2 2 0 0 1 4 0v8M10 50v-5a2 2 0 0 1 4 0v5M50 50v-5a2 2 0 0 1 4 0v5"/>${gull(46, 18, 0.3)}${gull(8, 26, 1)}<path class="m" d="M0 58h64v6H0z"/>` });
  add('gloucestershire', 'tradition', { id: 'cheese-rolling', label: 'Cheese rolling on Cooper\'s Hill', colour: 'amber', mood: 'cheerful', intensity: 'standard', months: [5], tags: ['cheese rolling', 'coopers hill', 'may'],
    svg: () => `<path class="c" d="M0 64V18q6-2 10 0 10 6 22 22t32 18v6z" opacity=".75"/><path class="lk" d="M6 18V8"/><path class="s x-flag o-v" style="transform-origin:6px 9px" d="M6 8h7l-2 2 2 2H6z"/><g class="x-ukroll o-v" style="transform-origin:14px 16px"><circle class="s lk" cx="14" cy="16" r="5"/><path class="lk" d="M14 11v10M9 16h10"/></g>` });
  add('gloucestershire', 'sport', { id: 'cheltenham-races', label: 'Jump racing at Cheltenham', colour: 'green', mood: 'energetic', intensity: 'standard', tags: ['racing', 'horses', 'cheltenham'],
    svg: () => `<path class="k" d="M2 28l14-6 12 6z"/><rect class="m" x="4" y="28" width="22" height="14"/><rect class="c" x="0" y="44" width="64" height="20"/><path class="lw t" d="M0 50h64"/><path class="k" d="M44 54l3-9h2l-3 9zM50 54l3-9h2l-3 9z"/><g class="x-bob"><path class="k" d="M18 44q4-6 14-5l6-5 4 2-3 5q-2 5-7 6l5 5-2 1-6-5h-6l-6 5-1-2 4-4q-3 0-2-3z"/><path class="c" d="M28 33l4-3 3 3-4 2z"/><circle class="s" cx="31" cy="29" r="2"/></g>` });

  /* ---------- Wiltshire ---------- */
  add('wiltshire', 'signature', { id: 'stonehenge', label: 'Stonehenge', colour: 'orange', mood: 'dreamy', tags: ['stones', 'world heritage', 'salisbury plain'],
    svg: () => `<g class="x-rise"><circle class="c" cx="32" cy="40" r="8"/></g><path class="m" d="M0 64V48h64v16z"/><path class="k" d="M6 48V34h5v14zM14 48V34h5v14zM5 34h15v-3H5zM25 48V29h5v19zM34 48V29h5v19zM24 29h16v-3H24zM46 48V35h5v13zM54 48V36h4v12zM45 35h14v-3H45z"/><rect class="k" x="20" y="51" width="9" height="2.5" rx="1"/>${gull(10, 14, 0.4)}` });
  add('wiltshire', 'heritage', { id: 'white-horse', label: 'A white horse on the chalk', colour: 'green', tags: ['white horse', 'chalk', 'hill figure', 'downs'],
    svg: () => `${cloud(6, 10, 0.2)}<path class="c" d="M0 64V32q32-18 64 0v32z"/><path class="w" d="M16 42q6-6 16-5l6-4 5 1-3 3q2 2 0 4l-6 1-2 6h-2l1-5h-9l-3 5h-2l2-6q-3-1-3 0z"/><g class="x-bob" style="--d:.5s"><path class="lk" d="M46 14l2-2 2 2"/></g>` });
  add('wiltshire', 'landmark', { id: 'salisbury-spire', label: 'Salisbury Cathedral', colour: 'slate', tags: ['cathedral', 'spire', 'water meadows'],
    svg: () => `${cloud(42, 12, 0.6)}<path class="s lk" d="M30 30l2-22 2 22z"/><rect class="s lk" x="28" y="30" width="8" height="12"/><path class="s lk" d="M4 54V44h56v10z"/><path class="k" d="M4 44l4-4h48l4 4z"/><path class="lk dash" d="M8 49h48"/><rect class="c" x="0" y="54" width="64" height="10"/>${wv(59, 0.3)}` });
  add('wiltshire', 'landscape', { id: 'caen-hill-locks', label: 'Caen Hill locks', colour: 'teal', tags: ['canal', 'locks', 'kennet and avon', 'devizes'],
    svg: () => `<path class="m" d="M0 64V22h10v6h10v6h10v6h10v6h10v6h14v12z"/>${[0, 1, 2, 3, 4].map(i => `<rect class="c" x="${1 + 10 * i}" y="${19 + 6 * i}" width="8" height="3"/><rect class="k" x="${9 + 10 * i}" y="${18 + 6 * i}" width="2" height="6"/>`).join('')}<g class="x-bob"><path class="k" d="M44 52h16l-2 3H46z"/><rect class="c" x="47" y="49" width="10" height="3"/></g>${cloud(36, 8, 0.9)}` });

  const css = [
    '.anim-scene .x-ukroll { --an: ap-ukroll; --ad: 3.4s; --ae: ease-in; }',
    '@keyframes ap-ukroll { 0% { transform: none; opacity: 1; } 70% { transform: translate(32px, 36px) rotate(540deg); opacity: 1; } 78% { transform: translate(34px, 38px) rotate(600deg); opacity: 0; } 79% { transform: none; opacity: 0; } 90%, 100% { transform: none; opacity: 1; } }',
  ].join('\n');

  animRegisterPack({ id: 'uk-south-west', name: 'UK: South West', version: '2.2.0', css,
    description: 'Cornwall, Devon, Dorset, Somerset, Bristol, Gloucestershire and Wiltshire: a signature opening and local landmarks, coast, traditions and food. Opt-in: plays only in that county (Regional animations (UK)).', items });
})();
