/* ============================================================
   ANIMATION PACK "us-northeast": New England, the Mid-Atlantic and Washington, DC.
   PURE classic script. A signature (opening) and an element (symbol) per state, a signature
   per big city and an element per small town; the shared lookup lives in 71-anim-us.js.
   ============================================================ */
(function () {
  const B = usBuilder('northeast');
  const r1 = (n) => Math.round(n * 10) / 10;
  const tw = (x, y, d) => `<path class="c x-twinkle" style="--d:${d || 0}s" d="M${x} ${y - 3}l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>`;
  const sun = (x, y, r) => `<circle class="s x-pulse" cx="${x}" cy="${y}" r="${r || 6}"/>`;
  const moon = (x, y) => `<path class="s x-glow" d="M${x} ${y - 6}a6 6 0 1 0 6 8 5 5 0 0 1-6-8z"/>`;
  const gr = (y) => `<path class="lm" d="M3 ${y || 58}h58"/>`;
  const wv = (y, d, cls) => `<path class="${cls || 'lc'} x-wave" style="--d:${d || 0}s" d="M-2 ${y}${'q3-2 6 0t6 0'.repeat(12)}"/>`;
  const cloud = (x, y, d) => `<g class="x-bob" style="--d:${d || 0}s"><path class="w" d="M${x} ${y}h14a4 4 0 0 0-1-7 5 5 0 0 0-9-1 4 4 0 0 0-4 8z"/></g>`;
  const bird = (x, y, d) => `<path class="lk x-flap" style="--d:${d || 0}s" d="M${x} ${y}q2-3 4 0 2-3 4 0"/>`;
  const stars = (a) => a.map(([x, y], i) => tw(x, y, i * 0.5)).join('');
  const snow = (n) => Array.from({ length: n }, (_, i) => `<circle class="w x-fall" style="--d:${(i * 0.45).toFixed(2)}s" cx="${6 + ((i * 17) % 52)}" cy="${4 + ((i * 7) % 14)}" r="1.1"/>`).join('');
  const win = (x, y, w, h, nx, ny, d) => { let o = ''; for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) o += `<rect class="${(i + j) % 3 === 0 ? 'c x-blink' : 'w'}"${(i + j) % 3 === 0 ? ` style="--d:${((i * 3 + j) * 0.37).toFixed(2)}s"` : ''} x="${r1(x + i * (w + 1.4))}" y="${r1(y + j * (h + 1.6))}" width="${w}" height="${h}"/>`; return o; };
  const pine = (x, y, s) => `<path class="lc" d="M${x} ${y}l-${s} ${s * 1.6}h${s * 2}zM${x} ${y + s}l-${s * 1.2} ${s * 1.5}h${s * 2.4}z"/>`;

  /* ================= NEW YORK ================= */
  B.state('NY', 'signature', { id: 'statue', label: 'Statue of Liberty', colour: 'teal', mood: 'proud', tags: ['landmark', 'harbour'],
    svg: () => sun(12, 12, 5) + '<path class="m" d="M20 58V48h24v10z"/><path class="s lk" d="M25 48l2-14h10l2 14z"/><path class="c lk" d="M28 34l2-10h4l2 10z"/><circle class="c lk" cx="32" cy="21" r="3.2"/>'
      + '<path class="lc" d="M29 18l-2-3M32 17.5v-4M35 18l2-3"/><path class="lk t" d="M36 26l5-9"/><g class="x-pulse"><path class="s lk" d="M39 17h4v-3z"/></g><path class="c x-flicker" d="M41 12q-2 3 0 5 2-2 0-5z"/>'
      + '<path class="lk" d="M28 30l-5 6"/><path class="w lk" d="M20 36l3-3 3 4z"/>' + wv(56, 0) + wv(60, 0.4, 'lm') + bird(46, 22, 0.2) });
  B.state('NY', 'element', { id: 'apple', label: 'The Big Apple', colour: 'red', mood: 'cheerful', tags: ['food', 'apple'],
    svg: () => '<g class="x-bob"><path class="c lk" d="M32 22q-10-6-16 2t0 20q6 10 16 6 10 4 16-6t0-20q-6-8-16-2z"/><path class="lk" d="M32 22q0-6 3-9"/><g class="x-swing"><path class="c lk" d="M35 14q7-4 11 1-6 4-11-1z"/></g><path class="w" d="M20 30q1-5 5-6" /></g>'
      + gr(57) + '<ellipse class="m" cx="32" cy="57" rx="12" ry="1.6"/>' + tw(52, 20, 0.3) + tw(10, 14, 0.9) });
  B.place('new-york', { id: 'skyline', label: 'Manhattan skyline', colour: 'indigo', mood: 'energetic', tags: ['skyline', 'city'],
    svg: () => stars([[8, 8], [52, 10], [24, 6]]) + moon(50, 20) + '<path class="m" d="M3 58V38h10v20zM48 58V34h12v24z"/><path class="c" d="M14 58V30h10v28zM39 58V28h9v30z"/><path class="s lk" d="M25 58V26l4-3h6l4 3v32z"/><path class="lk" d="M32 23V12"/><path class="lk" d="M32 12V7"/>'
      + '<circle class="c x-blink" cx="32" cy="6" r="1.6"/>' + win(26, 30, 2, 2.4, 4, 5) + win(15.5, 33, 2, 2.4, 3, 5) + gr(58) + '<g class="x-slidel"><rect class="c" x="46" y="54" width="7" height="3" rx="1"/></g>' });
  B.place('buffalo', { id: 'deco-tower', label: 'City Hall in the lake-effect snow', colour: 'slate', mood: 'cosy', season: ['winter'], tags: ['snow', 'tower'],
    svg: () => '<path class="m" d="M3 58V44h14v14zM47 58V40h14v18z"/><path class="s lk" d="M20 58V34h24v24z"/><path class="c lk" d="M24 34V22h16v12z"/><path class="c lk" d="M27 22V14h10v8z"/><path class="lk" d="M32 14V7"/><path class="lc" d="M32 7l5 1.5-5 1.5"/>'
      + '<path class="w" d="M23 42h4v16h-4zM30 42h4v16h-4zM37 42h4v16h-4z"/>' + gr(58) + snow(10) + wv(61, 0.6, 'lm') });
  B.place('lake-placid', { id: 'ski-jump', label: 'Olympic ski jump', colour: 'blue', mood: 'energetic', season: ['winter'], intensity: 'standard', tags: ['winter', 'ski'],
    svg: () => sun(52, 10, 4) + '<path class="m" d="M2 58l20-26 14 26z"/><path class="lk t" d="M10 14h12l4 6 12 22"/><path class="lk" d="M10 14v26M22 14v18M16 14v22"/><path class="w lk" d="M38 42l14 8v8H4V58z"/>'
      + '<g class="x-drop"><circle class="c" cx="24" cy="13" r="2"/><path class="lc" d="M22 15l3 3M20 18l7-1"/></g>' + snow(8) + gr(58) });

  /* ================= PENNSYLVANIA ================= */
  B.state('PA', 'signature', { id: 'liberty-bell', label: 'Liberty Bell', colour: 'amber', mood: 'proud', tags: ['bell', 'history'],
    svg: () => sun(52, 10, 5) + '<path class="lk t" d="M12 12h40"/><path class="m" d="M10 12h44v3H10z"/><g class="x-swing" style="--ad:2s"><path class="c lk" d="M22 44q2-18 10-18t10 18z"/><path class="lk" d="M30 24h4v-3h-4z"/><path class="lk" d="M23 34l18 4"/><path class="m" d="M21 44h22v3H21z"/><circle class="k" cx="32" cy="49" r="2"/></g>'
      + bird(10, 28, 0) + gr(58) });
  B.state('PA', 'element', { id: 'groundhog', label: 'Groundhog Day', colour: 'orange', mood: 'cheerful', tags: ['animal', 'groundhog'],
    svg: () => '<path class="m" d="M3 40q14-4 28 0t30 0v20H3z"/><path class="s" d="M18 44q14-3 28 0v14H18z"/><g class="x-pop"><path class="c lk" d="M24 46q0-16 8-16t8 16z"/><circle class="k" cx="29" cy="37" r="1.2"/><circle class="k" cx="35" cy="37" r="1.2"/><path class="w lk" d="M30 41h4v2h-4z"/><path class="lk" d="M25 31q0-5 4-4M39 31q0-5-4-4"/></g>'
      + '<path class="lm" d="M16 46h32"/>' + sun(52, 12, 5) + '<path class="lc dash" d="M52 20v6"/>' });
  B.place('philadelphia', { id: 'city-hall', label: 'City Hall tower', colour: 'blue', mood: 'proud', tags: ['tower', 'skyline'],
    svg: () => moon(10, 14) + stars([[50, 8], [56, 20]]) + '<path class="m" d="M3 58V46h12v12zM49 58V44h12v14z"/><path class="s lk" d="M16 58V40h32v18z"/><path class="c lk" d="M24 40V30h16v10z"/><path class="s lk" d="M26 30V18h12v12z"/><circle class="w lk" cx="32" cy="24" r="4"/>'
      + '<g class="x-hand" style="--ad:4s"><path class="lk" d="M32 24v-3"/></g><path class="lk" d="M32 18v-5"/><path class="c lk" d="M29 13h6l-3-5z"/><g class="x-swing"><path class="lc" d="M32 8v-3"/></g>' + win(19, 44, 3, 4, 6, 1) + gr(58) });
  B.place('pittsburgh', { id: 'incline', label: 'Incline over three rivers', colour: 'amber', mood: 'focused', tags: ['incline', 'rivers'],
    svg: () => stars([[8, 8], [26, 6], [44, 10]]) + '<path class="m" d="M3 58V24l36 20v14z"/><path class="lk" d="M10 24l32 24"/><g class="x-bob" style="--ad:3s"><path class="c lk" d="M20 28l8 4-3 6-8-4z"/></g>'
      + '<path class="s lk" d="M46 58V34h6v24zM54 58V40h8v18z"/><path class="m" d="M46 28v4h6v-4z"/><path class="lm x-steam" d="M49 24q-2-3 0-6"/><path class="lm x-steam" style="--d:0.8s" d="M52 24q2-3 0-6"/>' + tw(34, 14, 0.4) + wv(56, 0, 'lc') + wv(60, 0.5, 'lm') });
  B.place('gettysburg', { id: 'cannon', label: 'Cannon on the field', colour: 'green', mood: 'calm', tags: ['history', 'cannon'],
    svg: () => sun(12, 12, 5) + '<path class="s" d="M3 46q16-6 30-2t28-2v18H3z"/><path class="lc" d="M10 52v-6M18 51v-5M50 50v-5M56 52v-6"/><path class="lk" d="M14 46q-3-12-5-16"/>'
      + '<g class="x-wobble"><path class="k" d="M22 40l22-8 3 5-22 8z"/><circle class="w lk" cx="26" cy="46" r="7"/><path class="lk" d="M26 39v14M19 46h14"/></g><circle class="s x-float" cx="50" cy="32" r="3"/><circle class="s x-float" style="--d:0.6s" cx="54" cy="27" r="2"/>' + gr(58) });
  B.place('hershey', { id: 'kiss', label: 'A chocolate kiss', colour: 'orange', mood: 'cheerful', tags: ['chocolate', 'candy'],
    svg: () => '<g class="x-bob"><path class="k" d="M32 8q4 4 2 8 8 2 9 10 6 4 6 12 0 6-6 8H21q-6-2-6-8 0-8 6-12 1-8 9-10-2-4 1-8z"/><path class="m" d="M24 40q-2 4 0 8" /><path class="w" d="M26 30q2-4 6-5"/></g><rect class="w lk" x="25" y="12" width="14" height="4" rx="1.5"/>'
      + gr(57) + tw(10, 14, 0) + tw(54, 22, 0.6) + tw(52, 50, 1.1) + '<path class="m" d="M12 58q20 2 40 0" />' });

  /* ================= MASSACHUSETTS ================= */
  B.state('MA', 'signature', { id: 'old-north', label: 'Old North Church lanterns', colour: 'red', mood: 'proud', tags: ['church', 'history'],
    svg: () => stars([[8, 8], [54, 10], [14, 22]]) + moon(52, 22) + '<path class="m" d="M3 58V44h12v14zM49 58V46h12v12z"/><path class="s lk" d="M20 58V28h24v30z"/><path class="c lk" d="M24 28V16h16v12z"/><path class="s lk" d="M27 16l5-9 5 9z"/><path class="lk" d="M32 7V3"/>'
      + '<path class="w lk" d="M29 22h6v6h-6z"/><path class="w" d="M26 38h4v10h-4zM34 38h4v10h-4z"/><g class="x-glow"><circle class="c" cx="29.4" cy="20" r="1.4"/></g><g class="x-glow" style="--d:1s"><circle class="c" cx="34.6" cy="20" r="1.4"/></g>' + gr(58) });
  B.state('MA', 'element', { id: 'cranberries', label: 'Cranberry bog', colour: 'red', mood: 'cosy', season: ['autumn'], tags: ['cranberry', 'harvest'],
    svg: () => '<path class="m" d="M3 30h58v30H3z"/>' + wv(36, 0, 'lw') + wv(46, 0.5, 'lw') + wv(54, 0.9, 'lw') + [[12, 38], [22, 44], [32, 36], [42, 46], [52, 40], [18, 53], [38, 54], [48, 53]].map(([x, y], i) => `<g class="x-bob" style="--d:${(i * 0.3).toFixed(1)}s"><circle class="c lk" cx="${x}" cy="${y}" r="4"/><circle class="w" cx="${x - 1}" cy="${y - 1.4}" r="0.9"/></g>`).join('')
      + '<path class="lm" d="M3 30h58"/><path class="lc" d="M12 18l8 6M30 12l-2 10M50 16l-8 8"/><circle class="c" cx="12" cy="18" r="2"/>' });
  B.place('boston', { id: 'charles', label: 'Back Bay and the Charles', colour: 'blue', mood: 'calm', tags: ['skyline', 'sailboat'],
    svg: () => sun(10, 12, 5) + cloud(30, 14, 0.6) + '<path class="m" d="M4 44V32h8v12zM46 44V28h8v16z"/><path class="s lk" d="M14 44V22h9v22zM25 44V12h8l2 2v30z"/><path class="c" d="M25 18h10v14H25z"/><path class="lk" d="M25 12V8"/>' + win(15, 25, 2, 3, 2, 3) + '<path class="m" d="M3 44h58v16H3z"/>' + wv(50, 0, 'lw')
      + '<g class="x-bob" style="--ad:3s"><path class="w lk" d="M40 48l6-12v12z"/><path class="c" d="M48 48l-1-9 5 9z"/><path class="lk" d="M37 50h17l-3 4H40z"/></g>' + wv(57, 0.4, 'lc') + bird(52, 14, 0.3) });
  B.place('salem', { id: 'witch-hat', label: 'Witch hat and bats', colour: 'violet', mood: 'dreamy', season: ['autumn'], intensity: 'standard', tags: ['witch', 'halloween'],
    svg: () => stars([[8, 8], [56, 28], [50, 8]]) + '<path class="s x-glow" d="M52 20a8 8 0 1 0 0 .1z" /><g class="x-bob"><path class="k" d="M22 44q2-14 8-26 2-4 4 0l2 10q2-6 4-4 4 10 6 20z"/><path class="c" d="M22 40h24v4H22z"/><path class="w lk" d="M30 40h6v4h-6z"/><path class="k" d="M10 46q22 8 44 0-8-6-22-6t-22 6z"/></g>'
      + '<g class="x-flap"><path class="k" d="M10 14q3-3 5 0 2-3 5 0-3 1-5 4-2-3-5-4z"/></g><g class="x-flap" style="--d:0.7s"><path class="k" d="M44 12q2-2 4 0 2-2 4 0-2 1-4 3-2-2-4-3z"/></g>' + gr(58) });
  B.place('provincetown', { id: 'whale-tail', label: 'Whale tail and the Pilgrim tower', colour: 'blue', mood: 'calm', tags: ['whale', 'monument'],
    svg: () => sun(52, 10, 4) + '<path class="m" d="M8 40V22h5l2-6 2 6h5v18z"/><path class="lm" d="M8 22h14M10 30h10"/><path class="s lk" d="M10 38V24h10v14z"/>' + '<path class="m" d="M2 38h60v22H2z"/>' + wv(40, 0, 'lw')
      + '<g class="x-bob" style="--ad:3.2s"><path class="c lk" d="M38 56q0-10 2-14-8-4-10 0 4 0 6 4h4q2-4 6-4-2-4-10 0 2 4 2 14z"/><path class="c lk" d="M30 42q-4-4-6-2M46 42q4-4 6-2"/></g>' + wv(52, 0.3, 'lw') + wv(58, 0.7, 'lc') + bird(26, 14, 0.5) });

  /* ================= CONNECTICUT ================= */
  B.state('CT', 'signature', { id: 'charter-oak', label: 'Charter Oak in autumn', colour: 'orange', mood: 'proud', season: ['autumn'], tags: ['tree', 'autumn'],
    svg: () => sun(12, 12, 5) + '<path class="m" d="M3 58q16-6 30-3t28-3v8H3z"/><path class="k" d="M28 58q2-10 0-18l-8-6 4-2 6 4 2-12 3 12 6-6 3 2-8 8q-2 8 0 18z"/><circle class="c" cx="32" cy="22" r="13"/><circle class="c" cx="21" cy="30" r="8"/><circle class="c" cx="44" cy="29" r="9"/><path class="w" d="M26 18q4-4 8-3" />'
      + [0, 1, 2, 3].map(i => `<path class="c x-fall" style="--d:${i * 0.8}s" d="M${14 + i * 12} 30l3 2-2 3z"/>`).join('') + gr(58) });
  B.state('CT', 'element', { id: 'nautilus', label: 'Submarine', colour: 'slate', mood: 'focused', tags: ['submarine', 'navy'],
    svg: () => '<path class="m" d="M2 28h60v32H2z"/>' + wv(28, 0, 'lw') + '<g class="x-bob" style="--ad:3.4s"><path class="s lk" d="M8 44q0-8 10-8h28q10 0 10 8t-10 8H18q-10 0-10-8z"/><path class="c lk" d="M26 36v-8h10v8z"/><path class="lk" d="M32 28v-6h4"/><circle class="w lk" cx="20" cy="44" r="2.4"/><circle class="w lk" cx="30" cy="44" r="2.4"/><circle class="w lk" cx="40" cy="44" r="2.4"/><path class="c lk" d="M56 44l5-6v12z"/></g>'
      + '<circle class="w x-rise" cx="6" cy="40" r="1.6"/><circle class="w x-rise" style="--d:1s" cx="10" cy="48" r="1.2"/>' + wv(58, 0.5, 'lc') });
  B.place('mystic', { id: 'whaling-ship', label: 'Tall whaling ship', colour: 'teal', mood: 'calm', tags: ['ship', 'seaport'],
    svg: () => sun(52, 12, 5) + '<g class="x-swing" style="--ad:3.6s"><path class="k" d="M10 42h44l-6 10H18z"/><path class="lk" d="M22 42V12M34 42V8M46 42V16"/><path class="w lk" d="M22 14l-10 6v14h10zM34 10l-10 6v18h10zM34 12l10 6v16H34zM46 18l8 5v10h-8z"/><path class="c" d="M34 8h6l-2 2 2 2h-6z"/></g>'
      + wv(50, 0, 'lw') + wv(56, 0.5, 'lc') + bird(8, 14, 0.3) });

  /* ================= RHODE ISLAND ================= */
  B.state('RI', 'signature', { id: 'anchor', label: 'Anchor of Hope', colour: 'blue', mood: 'calm', tags: ['anchor', 'bay'],
    svg: () => sun(12, 12, 5) + cloud(36, 12, 0.5) + '<g class="x-swing" style="--ad:3.2s"><circle class="lc t" cx="32" cy="18" r="4"/><path class="lk t" d="M32 22v26M25 28h14"/><path class="lk t" d="M16 40q4 12 16 12t16-12"/><path class="lk t" d="M16 40l-3 5M48 40l3 5"/><path class="c" d="M13 46l5-1-2-5zM51 46l-5-1 2-5z"/></g>'
      + wv(54, 0, 'lc') + wv(59, 0.6, 'lm') + tw(54, 28, 0.8) });
  B.state('RI', 'element', { id: 'lemonade', label: 'Frozen lemonade', colour: 'amber', mood: 'cheerful', tags: ['food', 'lemonade'],
    svg: () => '<path class="w lk" d="M20 28l4 28h16l4-28z"/><path class="c" d="M21 34h22l-2 14H23z"/><path class="w" d="M20 22q0-8 12-8t12 8q0 4-12 4t-12-4z"/><g class="x-bob"><path class="c lk" d="M24 22q8-6 16 0-8 4-16 0z"/></g><path class="lk t" d="M38 20l8-14"/>'
      + '<g class="x-drop"><circle class="c" cx="44" cy="30" r="1.6"/></g>' + gr(58) + tw(12, 14, 0.2) + tw(52, 34, 0.9) });
  B.place('newport', { id: 'gilded-mansion', label: 'Gilded Age mansion', colour: 'amber', mood: 'proud', tags: ['mansion', 'cliff-walk'],
    svg: () => sun(54, 10, 4) + '<path class="m" d="M2 44l10-6 8 4v18H2z"/><path class="s lk" d="M10 56V30h44v26z"/><path class="c lk" d="M6 30h52l-4-8H10z"/><path class="w lk" d="M26 56V42q6-6 12 0v14z"/><path class="lk" d="M20 30v-8M44 30v-8"/><path class="c" d="M20 22h-3v4h3zM44 22h3v4h-3z"/>'
      + win(13, 34, 4, 5, 2, 1) + win(41, 34, 4, 5, 2, 1) + '<g class="x-wave"><path class="lc" d="M10 58h4M18 58h4"/></g>' + gr(58) + wv(61, 0, 'lm') + '' + '<g class="x-bob"><path class="c" d="M32 22v-6h5l-2 2 2 2z"/></g>' });

  /* ================= NEW HAMPSHIRE ================= */
  B.state('NH', 'signature', { id: 'old-man', label: 'Old Man of the Mountain', colour: 'slate', mood: 'proud', tags: ['mountain', 'profile'],
    svg: () => stars([[10, 8], [52, 8], [42, 18]]) + moon(14, 22) + '<path class="m" d="M2 58V34l14-8 10 6 12-10 24 18v18z"/><path class="s lk" d="M28 58V30l4-6 5 2 2 6-3 3 2 3-3 2 1 4-3 2v14z"/><path class="lk" d="M33 30h2M35 34l-2 2"/>'
      + pine(10, 40, 4) + pine(52, 42, 4) + '<g class="x-bob" style="--ad:5s"><path class="w" d="M42 14h12q3 0 3-3t-4-3q-2-4-6-2-4-1-5 3-3 0-3 3t3 2z"/></g>' + gr(58) });
  B.state('NH', 'element', { id: 'lilac', label: 'Purple lilac', colour: 'violet', mood: 'dreamy', season: ['spring'], tags: ['flower', 'lilac'],
    svg: () => '<g class="x-swing" style="--ad:3.6s"><path class="lc" d="M32 58V30"/><path class="lc" d="M32 46q-8-2-10-8M32 40q8-2 10-8"/><path class="c lk" d="M32 20q-7 0-6 8t6 12q6-4 6-12t-6-8z"/>'
      + [[28, 24], [34, 24], [26, 30], [32, 30], [38, 30], [29, 36], [35, 36], [32, 41]].map(([x, y]) => `<circle class="w" cx="${x}" cy="${y}" r="1.5"/>`).join('') + '</g><path class="c lk" d="M18 52q-6-6 0-10 6 2 6 8z"/><path class="c lk" d="M46 52q6-6 0-10-6 2-6 8z"/>' + gr(58) + '<circle class="c x-float" cx="14" cy="26" r="1.5"/><circle class="c x-float" style="--d:1.2s" cx="52" cy="22" r="1.3"/>' });
  B.place('portsmouth', { id: 'lift-bridge', label: 'Memorial Bridge lift span', colour: 'slate', mood: 'focused', tags: ['bridge', 'harbour'],
    svg: () => moon(50, 12) + '<path class="m" d="M2 38h14v12H2zM48 38h14v12H48z"/><path class="s lk" d="M8 14v36M56 14v36"/><path class="lk" d="M8 14h6v4M56 14h-6v4"/><g class="x-rise"><path class="c lk" d="M16 40h32v4H16z"/><path class="lk" d="M20 40v-8M44 40v-8M20 32h24"/></g>'
      + '<path class="lk" d="M16 44v-2M48 44v-2"/>' + '<path class="m" d="M2 50h60v10H2z"/>' + wv(52, 0, 'lw') + '<g class="x-bob"><path class="c lk" d="M24 56l2-4h12l2 4z"/><path class="lk" d="M32 52v-5"/></g>' + tw(26, 10, 0) });
  B.place('north-conway', { id: 'steam-train', label: 'Scenic steam train', colour: 'red', mood: 'cosy', tags: ['train', 'railway'],
    svg: () => sun(52, 10, 4) + '<path class="m" d="M2 50l16-18 12 12 12-14 20 20z"/><path class="w" d="M16 36l2-4 3 4z"/>' + '<path class="lk" d="M3 56h58"/><g class="x-bob" style="--ad:0.6s"><path class="k" d="M10 52V40h14v12zM24 52V36h12v16zM36 52V44h14v8z"/><path class="c" d="M24 36h12v-3H24z"/><path class="k" d="M14 40v-6h4v6z"/><path class="w lk" d="M27 38h6v6h-6z"/><circle class="s lk" cx="16" cy="54" r="3"/><circle class="s lk" cx="30" cy="54" r="3"/><circle class="s lk" cx="44" cy="54" r="3"/></g>'
      + [0, 1, 2].map(i => `<circle class="w x-rise" style="--d:${i * 0.7}s" cx="${15 - i * 4}" cy="${28 - i * 6}" r="${3 + i}"/>`).join('') });

  /* ================= VERMONT ================= */
  B.state('VT', 'signature', { id: 'covered-bridge', label: 'Covered bridge in autumn', colour: 'red', mood: 'cosy', season: ['autumn'], tags: ['bridge', 'foliage'],
    svg: () => sun(52, 10, 4) + '<path class="m" d="M2 38l14-12 12 10 14-14 20 16v20H2z"/><path class="c lk" d="M14 50V34h36v16z"/><path class="k" d="M10 34l22-12 22 12z"/><path class="w" d="M20 38h6v10h-6zM38 38h6v10h-6z"/><path class="lk" d="M30 34v16M34 34v16"/>'
      + '<path class="m" d="M2 50h60v10H2z"/>' + wv(54, 0, 'lw') + [[6, 26], [58, 24]].map(([x, y]) => `<circle class="c" cx="${x}" cy="${y}" r="6"/>`).join('') + [0, 1, 2].map(i => `<path class="c x-fall" style="--d:${i * 0.9}s" d="M${8 + i * 22} 24l3 2-2 3z"/>`).join('') });
  B.state('VT', 'element', { id: 'maple-syrup', label: 'Maple sap bucket', colour: 'amber', mood: 'cosy', tags: ['maple', 'syrup'],
    svg: () => '<path class="k" d="M30 58q2-18 0-34l10-6 6 4-8 8q0 14 2 28z"/><path class="m" d="M26 22l16-8 6 8-16 8z"/>' + '<circle class="c" cx="18" cy="16" r="8"/><circle class="c" cx="10" cy="22" r="6"/>' + '<path class="lk t" d="M22 40h8"/><path class="s lk" d="M14 42h12l-1 12H15z"/><path class="c" d="M15 48h10l-.4 6H15.4z"/>'
      + '<g class="x-drop"><path class="c" d="M18 33q-2 3 0 4 2-1 0-4z"/></g>' + '<path class="lc" d="M40 22l-8-8"/>' + gr(58) });
  B.place('burlington-vt', { id: 'champ', label: 'Champ of Lake Champlain', colour: 'green', mood: 'dreamy', tags: ['lake', 'monster'],
    svg: () => moon(50, 12) + stars([[10, 8], [30, 6]]) + '<path class="m" d="M2 30l12-10 10 8 12-8 16 10 10-4v36H2z"/>' + '<path class="s" d="M2 34h60v26H2z"/>' + wv(36, 0, 'lw') + '<g class="x-bob" style="--ad:3s"><path class="c lk" d="M14 50q0-10 4-10t4 10"/><path class="c lk" d="M24 50q0-18 4-18 6 0 4 6-2 4 0 12"/><circle class="k" cx="31" cy="34" r="1"/><path class="c lk" d="M38 50q0-8 4-8t4 8"/></g>'
      + wv(50, 0.4, 'lc') + wv(56, 0.8, 'lm') });
  B.place('stowe', { id: 'chairlift', label: 'Ski chairlift', colour: 'indigo', mood: 'energetic', season: ['winter'], tags: ['ski', 'chairlift'],
    svg: () => sun(52, 10, 4) + '<path class="m" d="M2 60V34l16-12 14 14 14-10 16 12v22z"/><path class="w" d="M18 22l-6 6 8 2zM46 26l-6 6 10 2z"/><path class="lk" d="M6 18l52 14"/><path class="lk t" d="M20 22v14M44 29v14"/>'
      + '<g class="x-swing" style="--ad:2.4s"><path class="lk" d="M30 26v10"/><path class="c lk" d="M24 36h12v4H24z"/><path class="lk" d="M24 36v-3"/><circle class="k" cx="30" cy="31" r="0.1"/></g>' + pine(10, 40, 4) + pine(54, 42, 4) + snow(7) + gr(58) });

  /* ================= MAINE ================= */
  B.state('ME', 'signature', { id: 'moose', label: 'Moose at dusk', colour: 'green', mood: 'calm', tags: ['moose', 'lake'],
    svg: () => moon(14, 14) + stars([[40, 8], [54, 14]]) + '<path class="m" d="M2 36l10-8 8 6 8-8 10 10 12-6 12 8v22H2z"/>' + pine(8, 30, 4) + pine(54, 30, 5) + '<path class="m" d="M2 44h60v16H2z"/>'
      + '<g class="x-bob" style="--ad:4s"><path class="k" d="M12 42q0-8 8-8h12q6-2 8 2l4-4 2 8q0 8-4 8v12h-3V48h-4v10h-3V48H22v10h-3V48h-4q-3-2-3-6z"/><path class="k" d="M40 34l8-8 4 2 2 8-4 2-4-2-2 2z"/><path class="m" d="M48 34l4 4"/><circle class="w" cx="50" cy="31" r="0.9"/><path class="lk t" d="M46 26l-2-8-4 2M46 26l0-10M50 26l6-8 2 4"/><path class="c" d="M36 14l6 2-3 4-5-1zM56 12l5 5-4 3-3-4z"/></g>'
      + wv(52, 0, 'lw') + wv(58, 0.5, 'lm') });
  B.state('ME', 'element', { id: 'lobster', label: 'Lobster', colour: 'red', mood: 'cheerful', tags: ['seafood', 'lobster'],
    svg: () => '<path class="c lk" d="M26 28q6-4 12 0l2 16q-8 6-16 0z"/><path class="c lk" d="M28 44q4 10 8 0z"/><path class="lc" d="M30 30v12M34 30v12"/><g class="x-wobble"><path class="lk" d="M26 30l-8-8"/><path class="c lk" d="M18 22q-8-2-10-10 6 2 8 4 4-2 8 2z"/></g><g class="x-wobble" style="--d:0.6s"><path class="lk" d="M38 30l8-8"/><path class="c lk" d="M46 22q8-2 10-10-6 2-8 4-4-2-8 2z"/></g><path class="lk" d="M30 28l-3-8M34 28l3-8"/>'
      + '<path class="lk" d="M26 36l-8 4M26 40l-6 6M38 36l8 4M38 40l6 6"/>' + gr(58) + wv(60, 0, 'lc') });
  B.place('portland-me', { id: 'head-light', label: 'Lighthouse and its beam', colour: 'amber', mood: 'calm', tags: ['lighthouse', 'coast'],
    svg: () => stars([[8, 8], [54, 10], [14, 22]]) + moon(52, 20) + '<g class="x-glow"><path class="c" d="M36 22l22-6v12z"/></g>' + '<path class="m" d="M2 52q16-8 28-4t32 4v8H2z"/><path class="w lk" d="M28 50l2-26h8l2 26z"/><path class="c" d="M29.4 34h9.2l.4 6h-10zM28.8 44h10.4l.2 4H28.6z"/><path class="k" d="M29 24h10v-3H29z"/><path class="lk" d="M30 21l4-5 4 5z"/><circle class="c x-pulse" cx="34" cy="22.5" r="1.4"/>'
      + wv(56, 0, 'lc') + wv(60, 0.5, 'lm') });
  B.place('bar-harbor', { id: 'cadillac-sunrise', label: 'First light on Cadillac Mountain', colour: 'orange', mood: 'dreamy', tags: ['sunrise', 'acadia'],
    svg: () => '<g class="x-rise"><circle class="s" cx="32" cy="34" r="9"/></g><path class="lc" d="M32 14v4M14 22l3 3M50 22l-3 3M8 36h4M52 36h4"/><path class="m" d="M2 44l14-10 10 4 8-8 12 10 6-4 10 8v16H2z"/><path class="s lk" d="M2 44l14-10 10 4 8-8 12 10 6-4 10 8"/>'
      + '<path class="m" d="M2 48h60v12H2z"/>' + wv(50, 0, 'lw') + wv(55, 0.6, 'lc') + bird(10, 20, 0) + bird(44, 14, 0.5) + '<path class="lk" d="M50 44v-5M48 42h4"/>' });

  /* ================= NEW JERSEY ================= */
  B.state('NJ', 'signature', { id: 'palisades', label: 'Palisades and the bridge lights', colour: 'indigo', mood: 'dreamy', tags: ['cliffs', 'bridge'],
    svg: () => stars([[8, 8], [24, 5], [50, 8]]) + moon(54, 20) + '<path class="m" d="M2 20h20v40H2z"/><path class="lm" d="M6 20v40M12 24v36M18 22v38"/><path class="s lk" d="M22 20v8h4v32"/><path class="lk" d="M26 36h36M30 36v-6M52 36v-6"/><path class="lk" d="M30 30q11 6 22 0"/><path class="lk" d="M26 36q4-4 4-6"/>'
      + [30, 36, 42, 48, 52].map((x, i) => `<circle class="c x-blink" style="--d:${i * 0.4}s" cx="${x}" cy="35" r="1"/>`).join('') + '<path class="m" d="M22 46h40v14H22z"/>' + wv(50, 0, 'lw') + wv(56, 0.5, 'lc') });
  B.state('NJ', 'element', { id: 'tomato', label: 'Jersey tomato', colour: 'red', mood: 'cheerful', season: ['summer'], tags: ['tomato', 'farm'],
    svg: () => '<g class="x-bob" style="--ad:3.2s"><path class="c lk" d="M32 20q-14-4-18 8t8 22q10 6 20 0 12-10 8-22t-18-8z"/><path class="w" d="M20 32q0-6 5-8"/></g><g class="x-swing" style="--ad:3.2s"><path class="m" d="M32 20l-8-3 5-2 3-4 3 4 5 2z"/><path class="lk" d="M32 20v-9"/></g>'
      + '<path class="lc" d="M8 58q8-6 14-2M42 58q8-6 14 0"/>' + gr(58) + tw(8, 20, 0.4) });
  B.place('atlantic-city', { id: 'boardwalk-wheel', label: 'Boardwalk Ferris wheel', colour: 'pink', mood: 'energetic', intensity: 'standard', tags: ['ferris-wheel', 'boardwalk'],
    svg: () => stars([[8, 8], [54, 8]]) + '<path class="lk" d="M22 58l10-28 10 28"/><g class="x-spin-slow"><circle class="lc" cx="32" cy="28" r="16"/><path class="lc" d="M32 12v32M16 28h32M20.7 16.7l22.6 22.6M43.3 16.7L20.7 39.3"/>'
      + [[32, 12], [48, 28], [32, 44], [16, 28], [43.3, 16.7], [43.3, 39.3], [20.7, 39.3], [20.7, 16.7]].map(([x, y], i) => `<circle class="${i % 2 ? 'c' : 'w'} lk" cx="${x}" cy="${y}" r="2.2"/>`).join('') + '</g><circle class="k" cx="32" cy="28" r="2"/>'
      + '<path class="m" d="M2 52h60v8H2z"/><path class="lk" d="M4 52v8M12 52v8M20 52v8M44 52v8M52 52v8M60 52v8"/>' + wv(60, 0.2, 'lc') });
  /* ================= DELAWARE ================= */
  B.state('DE', 'signature', { id: 'memorial-bridge', label: 'Delaware Memorial Bridge', colour: 'blue', mood: 'proud', tags: ['bridge', 'river'],
    svg: () => sun(12, 14, 5) + cloud(36, 14, 0.4) + '<path class="lk t" d="M16 14v40M48 14v40"/><path class="lk" d="M14 20h4M46 20h4"/><path class="lk" d="M4 46q12-2 12-28M16 18q16 24 32 0M48 18q0 26 12 28"/><path class="lk" d="M24 34v12M32 38v8M40 34v12"/><path class="s lk" d="M2 46h60v3H2z"/>'
      + '<g class="x-slidel"><rect class="c" x="22" y="42" width="8" height="4" rx="1"/></g><path class="m" d="M2 50h60v10H2z"/>' + wv(54, 0, 'lw') + wv(58, 0.5, 'lc') + bird(50, 8, 0.3) });
  B.state('DE', 'element', { id: 'blue-hen', label: 'Blue Hen chicken', colour: 'indigo', mood: 'cheerful', tags: ['bird', 'hen'],
    svg: () => '<path class="c lk" d="M14 38q2-12 16-12 4-4 8-2l2 8q8 2 8 10 0 12-14 12H26q-12 0-12-16z"/><path class="c" d="M16 40q4 8 16 6" /><g class="x-bounce"><circle class="c lk" cx="44" cy="22" r="6"/><path class="c lk" d="M41 16q1-6 4-4 2-4 4 0"/></g><path class="c" d="M49 22l5 2-5 2z"/><path class="c lk" d="M44 28q0 4 2 4"/><circle class="k" cx="45" cy="21" r="1"/>'
      + '<path class="c lk" d="M14 38l-6-8q10 0 8 8z"/><path class="lk" d="M28 52v6M36 52v6M25 58h6M33 58h6"/>' + gr(58) + '<g class="x-pop"><ellipse class="w lk" cx="52" cy="54" rx="3" ry="4"/></g>' });
  B.place('rehoboth-beach', { id: 'umbrella', label: 'Beach umbrella', colour: 'pink', mood: 'cheerful', season: ['summer'], tags: ['beach', 'umbrella'],
    svg: () => sun(12, 12, 6) + '<g class="x-swing" style="--ad:3.6s"><path class="lk t" d="M30 56l4-34"/><path class="c lk" d="M12 28q4-14 22-14t22 14q-6-4-11-2-5-4-11-2-6-4-11 2-6-2-11 2z"/><path class="w" d="M20 22q4-6 10-7-6 4-6 12-3-2-4-5z"/><path class="w" d="M42 16q8 3 10 11-6-2-6-6z"/></g>'
      + '<path class="s" d="M2 52q20-4 40 0t20 0v8H2z"/>' + wv(48, 0, 'lc') + '<g class="x-bob"><path class="m" d="M8 56q6-4 12 0z"/></g><path class="lm dash" d="M4 58h56"/>' + bird(46, 8, 0.2) });

  /* ================= MARYLAND ================= */
  B.state('MD', 'signature', { id: 'skipjack', label: 'Chesapeake skipjack', colour: 'orange', mood: 'calm', tags: ['sailboat', 'bay'],
    svg: () => '<g class="x-sunset"><circle class="s" cx="46" cy="22" r="8"/></g>' + '<g class="x-bob" style="--ad:3.4s"><path class="k" d="M8 44h46l-6 10H14z"/><path class="lk" d="M28 44V8"/><path class="w lk" d="M28 10l-16 32h16z"/><path class="c lk" d="M30 14l14 30H30z"/><path class="lk" d="M8 44l-4-6"/></g>'
      + wv(54, 0, 'lc') + wv(59, 0.5, 'lm') + bird(48, 10, 0.4) });
  B.state('MD', 'element', { id: 'blue-crab', label: 'Blue crab', colour: 'blue', mood: 'energetic', tags: ['crab', 'seafood'],
    svg: () => '<path class="c lk" d="M14 38q4-14 18-14t18 14q-6 8-18 8T14 38z"/><path class="w" d="M26 40q6 2 12 0"/><path class="lk" d="M26 24v-5M38 24v-5"/><circle class="k" cx="26" cy="18" r="2"/><circle class="k" cx="38" cy="18" r="2"/><g class="x-wobble"><path class="lk" d="M16 34l-8-8"/><path class="c lk" d="M8 26q-6-4-2-12 4 4 4 8 4 0 6 4z"/></g><g class="x-wobble" style="--d:0.5s"><path class="lk" d="M48 34l8-8"/><path class="c lk" d="M56 26q6-4 2-12-4 4-4 8-4 0-6 4z"/></g>'
      + '<path class="lk" d="M18 42l-6 8M24 45l-4 9M40 45l4 9M46 42l6 8"/>' + gr(58) + wv(61, 0, 'lc') });
  B.place('baltimore', { id: 'fort-mchenry', label: 'Fort McHenry, rockets and flag', colour: 'red', mood: 'proud', intensity: 'standard', tags: ['flag', 'harbour', 'fireworks'],
    svg: () => stars([[8, 8], [52, 6]]) + '<path class="lk t" d="M12 12v34"/><g class="x-wave" style="--ad:1.2s"><path class="c" d="M14 12h22v10H14z"/><path class="w" d="M14 22h22v4H14z"/><path class="c" d="M14 26h22v4H14z"/></g><rect class="k" x="14" y="12" width="9" height="8"/><circle class="w" cx="17" cy="15" r="0.9"/><circle class="w" cx="20.5" cy="17" r="0.9"/>'
      + '<path class="m" d="M2 50l8-4h24l8 4v10H2z"/><path class="s lk" d="M30 46h28l-4-6H34z"/>' + '<g class="x-burst" style="--d:0.3s"><path class="lc" d="M50 12v-4M50 20v4M44 16h-4M56 16h4M45.8 11.8l-2.8-2.8M54.2 20.2l2.8 2.8"/></g><circle class="c x-pop" style="--d:1.2s" cx="46" cy="30" r="2"/>' + wv(56, 0, 'lc') });
  B.place('annapolis', { id: 'academy-dome', label: 'Naval Academy dome', colour: 'indigo', mood: 'proud', tags: ['dome', 'sailing'],
    svg: () => sun(10, 12, 5) + '<path class="s lk" d="M10 58V44h44v14z"/><path class="s lk" d="M18 44V34h28v10z"/><path class="c lk" d="M20 34q12-20 24 0z"/><path class="lk" d="M32 14v-6"/><g class="x-wave" style="--ad:1.3s"><path class="c" d="M32 8h8l-2 2 2 2h-8z"/></g>'
      + '<path class="w" d="M20 48h4v10h-4zM30 48h4v10h-4zM40 48h4v10h-4z"/><path class="lk" d="M22 38v-2M32 38v-2M42 38v-2"/>' + gr(58) + '<g class="x-bob"><path class="w lk" d="M52 36l6 10h-6z"/><path class="c" d="M50 46h10l-2 4h-6z"/></g>' + wv(60, 0.2, 'lc') });

  /* ================= WASHINGTON, DC ================= */
  B.place('washington', { id: 'monument', label: 'Washington Monument and blossoms', colour: 'pink', mood: 'proud', season: ['spring'], tags: ['monument', 'cherry-blossom'],
    svg: () => stars([[8, 8], [54, 10]]) + '<path class="s lk" d="M30 58L32 14l4 0 2 44z"/><path class="w lk" d="M31 14l3-7 3 7z"/><circle class="c x-blink" cx="34" cy="6" r="1.6"/><path class="lm" d="M31 30h6M31 42h7"/>'
      + '<path class="m" d="M2 58V50h16v8zM48 58V50h14v8z"/>' + '<path class="k" d="M10 58q0-12 2-18l-4-6M10 40l6-6"/><circle class="c" cx="10" cy="30" r="8"/><circle class="c" cx="4" cy="36" r="5"/><circle class="c" cx="16" cy="36" r="5"/>'
      + [0, 1, 2, 3].map(i => `<circle class="w x-fall" style="--d:${i * 0.7}s" cx="${6 + i * 6}" cy="${30 + (i % 2) * 4}" r="1.3"/>`).join('') + gr(58) });
  animRegisterPack(B.pack({ id: 'us-northeast', name: 'US Northeast', description: 'New England, the Mid-Atlantic and Washington, DC: a landmark and a symbol for every state and for the big cities and small towns.' }));
})();
