/* ============================================================
   GARDEN WONDER, the sky you can learn (docs/dev/HUNDRED_WORLD.md, rows 12 to 14). Lie down at night, join the stars, hear what each pattern means. Twelve, three a season, so it takes a year, and the moon is the real one.
   WD_STARS: id, name, season, s (its stars, 0 to 100 across and 0 to 60 down), e (lines between them), tale. Saved: sk.<id> (the day you learned it). The ones you know shine in your lake at night; a friend's snapshot carries the ids, so a visitor sees them too.
   The observatory in docs/dev/GARDEN_PLAN.md logs single named stars from a building. This is the patterns, from the grass, from the first night.
   ============================================================ */
const WD_STARS = Object.freeze([
  { id: 'trowel', name: 'The Trowel', season: 'spring', s: [[30, 12], [36, 22], [44, 34], [38, 44], [50, 46], [53, 37]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 2]], tale: 'The first thing anyone ever dropped in a garden and could not find again. It has been up there ever since, in plain sight, which is where they always are.' },
  { id: 'hare', name: 'The Little Hare', season: 'spring', s: [[60, 40], [66, 30], [64, 16], [70, 14], [72, 28], [80, 32], [84, 44]], e: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6], [6, 0]], tale: 'She runs along the top of the sky and comes down in April to eat your lettuces. You will not see her do it. You will only see the lettuces.' },
  { id: 'swallows', name: 'Two Swallows', season: 'spring', s: [[14, 26], [22, 20], [30, 25], [22, 30], [40, 40], [48, 34], [56, 39], [48, 44]], e: [[0, 1], [1, 2], [1, 3], [4, 5], [5, 6], [5, 7]], tale: 'They leave in autumn and come back to the same beam in the same shed. Nobody has ever told them where it is. Think about that for a moment.' },
  { id: 'can', name: 'The Watering Can', season: 'summer', s: [[28, 44], [28, 26], [50, 26], [50, 44], [66, 16], [72, 14], [38, 14]], e: [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4], [4, 5], [1, 6], [6, 2]], tale: 'It tips a little further each night until August. Then it rains. People have told you it is the weather. It is the can.' },
  { id: 'heron', name: 'The Heron', season: 'summer', s: [[44, 54], [46, 38], [42, 26], [46, 14], [54, 10], [64, 13], [40, 34]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [1, 6]], tale: 'She has been standing on one leg over the lake since before there was a lake. She is not asleep. She is only very, very good at this.' },
  { id: 'bench', name: 'The Long Bench', season: 'summer', s: [[12, 36], [32, 34], [54, 35], [76, 33], [14, 48], [74, 46]], e: [[0, 1], [1, 2], [2, 3], [0, 4], [3, 5]], tale: 'There is always room for one more on it, however many sit down. People think it looks like a saucepan. They are the ones who never sit.' },
  { id: 'lantern', name: 'The Lantern', season: 'autumn', s: [[50, 12], [40, 22], [60, 22], [42, 42], [58, 42], [50, 32]], e: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 4], [1, 2], [5, 1], [5, 2]], tale: 'Somebody hung it out for somebody who was late. It is still lit. They are still late. Nobody has said anything about taking it in.' },
  { id: 'barrow', name: 'The Wheelbarrow', season: 'autumn', s: [[20, 40], [32, 40], [54, 40], [62, 30], [24, 28], [76, 26]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 1], [3, 5]], tale: 'Full of apples, and going uphill. It gets a little lighter every year, and nobody has ever seen who is pushing.' },
  { id: 'boat', name: 'The Old Boat', season: 'autumn', s: [[20, 36], [40, 44], [62, 44], [80, 34], [50, 44], [50, 16], [66, 30]], e: [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [6, 4]], tale: 'A small boy lost it a long time ago, off the end of somewhere. It has been sailing ever since, and it is doing very well.' },
  { id: 'goose', name: 'The Snow Goose', season: 'winter', s: [[14, 18], [28, 24], [44, 30], [60, 26], [72, 18], [44, 44], [52, 38]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 6], [6, 5]], tale: 'She flies south over your garden on the longest night and she never lands. Whatever she is looking for, it isn’t here, and she always comes back to check.' },
  { id: 'bear', name: 'The Sleeping Bear', season: 'winter', s: [[22, 42], [30, 30], [48, 26], [66, 30], [76, 40], [64, 46], [38, 46]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0]], tale: 'Don’t wake her. Nobody knows what happens if you do, and that’s because nobody has.' },
  { id: 'sisters', name: 'The Three Sisters', season: 'winter', s: [[36, 22], [50, 30], [64, 38], [20, 16], [80, 44]], e: [[3, 0], [0, 1], [1, 2], [2, 4]], tale: 'A bean, a squash and a stalk of corn, who grow better together and argue about it constantly. On a clear night you can almost hear them.' },
]);
const WD_STAR_ROW = new Map(WD_STARS.map(r => [r.id, r]));
const _wdk = { el: null, rug: null, cur: null, done: new Set(), from: -1, keys: null, m: null };
function _wdSkyKnown(id) { return !!_wdGet('sk.' + id); }
function _wdSkyTonight(m) { return WD_STARS.filter(r => r.season === m.season); }
function _wdMoonSvg(age, r) {
  const x = age / _WD_SYN, wax = x < 0.5, k = Math.cos(x * 2 * Math.PI), rx = Math.abs(k) * r, lit = '#f6f2d8';
  const d = `M0 ${-r}A${r} ${r} 0 0 ${wax ? 1 : 0} 0 ${r}A${rx.toFixed(1)} ${r} 0 0 ${(k > 0) === wax ? 0 : 1} 0 ${-r}z`;
  return `<circle r="${r * 1.9}" fill="${lit}" opacity="0.1"/><circle r="${r}" fill="#28324a"/><path d="${d}" fill="${lit}"/>`;
}
function _wdSkyDraw() {
  const el = _wdk.el; if (!el) return;
  const m = _wdk.m, P = wdMoon(_wdToday()), svg = el.querySelector('.wd-sky-svg'), rows = _wdSkyTonight(m), row = _wdk.cur;
  let bg = '';
  for (let i = 0; i < 170; i++) { const x = gardenHash('sx' + i) % 1000, y = gardenHash('sy' + i) % 520, r = 0.5 + (gardenHash('sr' + i) % 11) / 10; bg += `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="#fff" opacity="${(0.25 + (gardenHash('so' + i) % 6) / 10).toFixed(2)}"/>`; }
  let lines = '', stars = '';
  if (row) {
    const X = (s) => 110 + s[0] * 7.8, Y = (s) => 40 + s[1] * 7.4;
    row.e.forEach((pair, i) => { const k = pair[0] + '-' + pair[1], a = row.s[pair[0]], b = row.s[pair[1]]; if (_wdk.done.has(k)) lines += `<line class="wd-sky-l" x1="${X(a)}" y1="${Y(a)}" x2="${X(b)}" y2="${Y(b)}"/>`; else if (_wdk.hint === i) lines += `<line class="wd-sky-h" x1="${X(a)}" y1="${Y(a)}" x2="${X(b)}" y2="${Y(b)}"/>`; });
    row.s.forEach((s, i) => { const on = _wdk.from === i; stars += `<g class="wd-sky-s${on ? ' is-on' : ''}" data-i="${i}" transform="translate(${X(s)} ${Y(s)})" tabindex="0" role="button" aria-label="Star ${i + 1}"><circle r="20" fill="transparent"/><circle class="wd-sky-g" r="9" fill="#dfe8ff" opacity="0.28"/><circle class="wd-sky-c" r="3.6" fill="#fff"/></g>`; });
  }
  svg.innerHTML = `<defs><linearGradient id="wd-skyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1230"/><stop offset="0.7" stop-color="#1b2a54"/><stop offset="1" stop-color="#34425f"/></linearGradient></defs><rect width="1000" height="620" fill="url(#wd-skyg)"/>${bg}<g transform="translate(880 96)">${_wdMoonSvg(P.age, 30)}</g>${lines}${stars}<path d="M0 620V560C110 530 240 572 380 556S650 520 760 552S920 566 1000 540V620z" fill="#0d1526"/><path d="M196 560C190 530 170 520 180 500C166 492 176 470 196 472C204 452 232 456 234 476C252 478 256 500 238 508C250 524 228 540 222 562z" fill="#080e1c"/>`;
  const foot = el.querySelector('.wd-sky-foot');
  foot.textContent = '';
  const chips = _gdpEl('div', 'wd-sky-chips');
  for (const r of rows) { const b = _gdpEl('button', 'wd-sky-chip' + (r === row ? ' is-on' : '')); b.type = 'button'; b.textContent = _wdSkyKnown(r.id) ? r.name : '? ? ?'; b.setAttribute('aria-pressed', r === row ? 'true' : 'false'); b.onclick = () => _wdSkyPick(r); chips.appendChild(b); }
  foot.appendChild(chips);
  const say = _gdpEl('p', 'wd-sky-say');
  if (row && _wdk.told) say.textContent = row.name + '. ' + row.tale;
  else if (row) say.textContent = _wdk.from >= 0 ? 'Now the star it joins to. There is no hurry, and no wrong one.' : 'Press a bright star, then the one it joins to.';
  else say.textContent = 'Choose a pattern. Three are up in ' + m.season + ', and the others come round with the year.';
  foot.appendChild(say);
  const go = _gdpEl('div', 'wd-sky-go');
  if (row && !_wdk.told) { const h = _gdpEl('button', 'btn btn-sm btn-ghost', 'Show me one'); h.type = 'button'; h.onclick = () => { _wdk.hint = row.e.findIndex(p => !_wdk.done.has(p[0] + '-' + p[1])); _wdSkyDraw(); }; go.appendChild(h); }
  const moon = P.full ? 'The moon is full. Go and look at the lake.' : P.name === 'new' ? `The moon is new. Full in ${_wdPlural(P.toFull, 'night')}.` : `The moon is ${P.name}. Full in ${_wdPlural(P.toFull, 'night')}.`;
  go.appendChild(_gdpEl('span', 'wd-sky-moon', moon));
  const c = _gdpEl('button', 'btn btn-sm', 'Back to the garden'); c.type = 'button'; c.onclick = () => _wdSkyClose(); go.appendChild(c);
  foot.appendChild(go);
}
function _wdSkyPick(r) { _wdk.cur = r; _wdk.from = -1; _wdk.hint = -1; _wdk.told = _wdSkyKnown(r.id); _wdk.done = new Set(_wdk.told ? r.e.map(p => p[0] + '-' + p[1]) : []); _wdSkyDraw(); }
function _wdSkyStar(i) {
  const r = _wdk.cur; if (!r || _wdk.told) return;
  if (_wdk.from < 0) { _wdk.from = i; _wdSkyDraw(); return; }
  if (_wdk.from === i) { _wdk.from = -1; _wdSkyDraw(); return; }
  const a = _wdk.from, b = i, edge = r.e.find(p => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
  if (edge) { _wdk.done.add(edge[0] + '-' + edge[1]); _wdk.hint = -1; wdSound([[880 + 80 * _wdk.done.size, 0.4, 'sine', 0.018]]); _wdk.from = i; } else _wdk.from = i;
  if (r.e.every(p => _wdk.done.has(p[0] + '-' + p[1]))) {
    _wdk.told = true; _wdk.from = -1;
    if (!_wdSkyKnown(r.id)) { _wdSet('sk.' + r.id, _wdToday()); if (typeof _gdEmit === 'function') _gdEmit('wonder', { what: 'star' }); }
    wdSound([[660, 0.9, 'sine', 0.018], [880, 0.9, 'sine', 0.014, 0.14], [1320, 1.1, 'sine', 0.01, 0.28]]);
    _wdSkyGlow(gardenHere());
  }
  _wdSkyDraw();
}
/** Lie down and look up. */
function gardenWonderLookUp() {
  const box = _wdBox(); if (!box || _wdk.el) return;
  gardenBubbleClose(); wdTalkClose(true);
  _wdk.m = gardenHere();
  const el = document.createElement('div'); el.className = 'wd-sky'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'The night sky');
  el.innerHTML = '<svg class="wd-sky-svg" viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid slice"></svg><div class="wd-sky-foot"></div>';
  el.querySelector('.wd-sky-svg').addEventListener('click', (ev) => { const g = ev.target.closest && ev.target.closest('.wd-sky-s'); if (g) _wdSkyStar(Number(g.getAttribute('data-i'))); });
  el.querySelector('.wd-sky-svg').addEventListener('keydown', (ev) => { if (ev.key !== 'Enter' && ev.key !== ' ') return; const g = ev.target.closest && ev.target.closest('.wd-sky-s'); if (g) { ev.preventDefault(); _wdSkyStar(Number(g.getAttribute('data-i'))); } });
  const key = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); ev.preventDefault(); _wdSkyClose(); } };
  document.addEventListener('keydown', key, true); _wdk.keys = key;
  box.appendChild(el); _wdk.el = el; _wdk.cur = null;
  const next = _wdSkyTonight(_wdk.m).find(r => !_wdSkyKnown(r.id));
  if (next) _wdSkyPick(next); else _wdSkyDraw();
  const c = el.querySelector('.wd-sky-go .btn:last-child'); if (c) c.focus({ preventScroll: true });
}
function _wdSkyClose() { if (!_wdk.el) return; _wdk.el.remove(); _wdk.el = null; document.removeEventListener('keydown', _wdk.keys, true); _wdk.keys = null; }
/* ---------- in the world: a rug at night, and what you know shining in the lake ---------- */
function _wdSkyGlow(m) {
  const ids = m.visit ? (_wdTheir(m).sk || []) : WD_STARS.filter(r => _wdSkyKnown(r.id)).map(r => r.id);
  const show = m.tod === 'night' || m.tod === 'dusk';
  const rows = show ? WD_STARS.filter(r => ids.includes(r.id) && r.season === m.season).slice(0, 3) : [];
  if (!rows.length) { wdGlowOff('lake-stars'); return; }
  let s = '';
  rows.forEach((r, n) => {
    const ox = n * 300, oy = (n % 2) * 40, X = (p) => ox + p[0] * 2.5, Y = (p) => oy + p[1] * 1.5;
    for (const p of r.e) s += `<line x1="${X(r.s[p[0]])}" y1="${Y(r.s[p[0]])}" x2="${X(r.s[p[1]])}" y2="${Y(r.s[p[1]])}" stroke="#e8f2ff" stroke-width="0.8" opacity="0.32"/>`;
    for (const p of r.s) s += `<circle class="wd-lakestar" cx="${X(p)}" cy="${Y(p)}" r="1.5" fill="#fff"/>`;
  });
  wdGlow('lake-stars', s, WD_AT.lakeStars.x, WD_AT.lakeStars.y);
}
wdMod({
  id: 'sky', visit: true,
  begin() { _wdk.rug = null; },
  tick(m) {
    _wdSkyGlow(m);
    const night = m.tod === 'night';
    if (night && !_wdk.rug) {
      const at = wdFreeNear(WD_AT.rug.x, WD_AT.rug.y, 2) || WD_AT.rug;
      _wdk.rug = wdSprite({ id: 'wd-rug', x: at.x, y: at.y, z: at.y - 0.3, still: true, hit: 0.9, hitUp: 2, label: 'Lie down and look up', cursor: 'hand',
        svg: '<g transform="rotate(-3)"><path d="M-24 -7L20 -9L25 5L-20 7z" fill="#5a6e96"/><path d="M-15 -7.4L-11 6.4M-1 -8L4 6M12 -8.6L17 5.4" stroke="#c8d2e8" stroke-width="1.4" fill="none"/></g>',
        onClick: () => gardenWonderLookUp() });
    } else if (!night && _wdk.rug) { _wdk.rug.remove(); _wdk.rug = null; }
  },
  end() { _wdk.rug = null; _wdSkyClose(); },
});
