/* ============================================================
   AFTER DARK, with friends (FUN-ROADMAP Phase 8): stargazing halves with Wick's star myths, and lantern float night.

   STARGAZING. The ways in are kinds and terrain: lying down at night on any open ground (a note offers the patterns), any telescope at
   night (E: "Look at the stars"), and the rug. All open the sky you can learn (94-garden-wonder-6sky.js), which this file grows from the
   outside (its functions are wrapped, nothing in it is edited):
     - Wick's myth (AD_MYTHS) is told at the foot of the sky once a pattern is joined, alone or together, with his picture.
     - halves: two or more people in one garden with the sky open on the same pattern (nt|sky) share its stars out by slot order (star i is
       the person's at place i % n): your own stars bright, theirs faint. A line lights when the stars at both its ends have been pressed
       within AD_SKY.hold of each other (nt|star; each press carries the lines it closed, and each screen also closes lines with the
       presses it has heard, so every screen ends with the same lines). Joined: everyone learns it, the host's moon moth comes out under the
       finished picture, the keepsake "Two halves of a sky" the first time, and the first two of you name one of its stars together, one
       word each from AD_STAR_WORDS (nt|name): no typing. The named star is saved by both (ad.ns.<pattern>, the snapshot's nt.s with gtgPair:
       it names neither of you), shines on the still water in both vales with its name when you point at it, and is in both Journals.
   LANTERN NIGHT (WD_DAYS 'lanterns', the same dates; 94-garden-wonder-9days.js hands it here while After dark is on). A basket of paper
   lanterns stands on the bank of the still water nearest the arrival point (by terrain, never the mill race). Fold one (five papers, three
   patterns), and you walk to the bank and set it on the water: it drifts out, kept on the water. Three a night, seven a year. Friends'
   lanterns of the week drift on your water in their papers (their snapshot's nt.l), named from your own friends list; on a visit the host's
   do, and every launch is seen at once on every screen (nt|lan). Rewards: "A paper lantern" the first time, the lantern's XP once a day, and
   "Two lanterns together" for floating within a minute of a friend in one garden.
   Saves: ad.ns.<pattern> [star, word, word, pair]; ad.lf.<night>.<k> [paper, pattern] (tonight's lanterns, tidied after 40 days);
   ad.ly<year> (how many this year); ad.lc (the paper you chose last).
   ============================================================ */
const AD_SKY = Object.freeze({ hold: 8000, stale: 45000, beat: 15000 });
const _adg = { them: new Map(), sess: '', sessP: '', done: new Set(), press: new Map(), fin: '', myth: 0, mythFor: '', name: null, note: null, beatT: 0, expT: 0, last: '', sig: '', keep: false, moth: false, lieFor: null };

/* ---------- who is here ---------- */
function _adgMe() { try { return adRole() === 'visit' ? (typeof _glv !== 'undefined' && Number.isInteger(_glv.w) ? _glv.w : -1) : 0; } catch (e) { return 0; } }
function _adgActor(w) { try { return typeof _gll !== 'undefined' && _gll.actors ? _gll.actors.get(w) || null : null; } catch (e) { return null; } }
function _adgName(w) { if (w === 0 && adRole() === 'visit') { const A = _adgActor(0); return (A && A.n) || 'your friend'; } const A = _adgActor(w); return (A && A.n) || 'your friend'; }
function _adgOpenId() { return typeof _wdk !== 'undefined' && _wdk.el && _wdk.cur ? _wdk.cur.id : ''; }
/** The people with the sky open on this pattern now, by slot, you among them: the order the stars are shared out in. */
function _adgWith(pid) {
  const out = [], now = performance.now(), me = _adgMe();
  if (pid && _adgOpenId() === pid && me >= 0) out.push(me);
  for (const [w, r] of _adg.them) {
    if (r.id !== pid || w === me) continue;
    if (now - r.at > AD_SKY.stale) { _adg.them.delete(w); continue; }
    const A = _adgActor(w); if (!A || A.me) continue;   // (they left the garden)
    out.push(w);
  }
  return out.sort((a, b) => a - b);
}
/** Halves on or off for the pattern you have open (a session starts empty on every screen): the people, or null when you are alone in it. */
function _adgSync() {
  const pid = _adgOpenId(), people = pid ? _adgWith(pid) : [], on = people.length >= 2, who = people.join(',');
  // a new picture together, or someone else has come to it (the stars are shared out again): every screen starts it afresh, so all of
  // them end with the same lines (a picture already joined stays joined)
  if (on && (_adg.sess !== pid || (_adg.sessP !== who && _adg.fin !== pid))) { _adg.sess = pid; _adg.sessP = who; _adg.done = new Set(); _adg.press = new Map(); _adg.fin = ''; _adg.name = null; }
  else if (on) _adg.sessP = who;
  else if (!on && _adg.sess) {
    const was = _adg.sess; _adg.sess = ''; _adg.press = new Map();
    if (_adg.name && !_adg.name.saved) _adg.name = null;
    if (typeof _wdk !== 'undefined' && _wdk.cur && _wdk.cur.id === was) { _wdk.told = _wdSkyKnown(was); _wdk.done = new Set(_wdk.told ? _wdk.cur.e.map(p => p[0] + '-' + p[1]) : []); _wdk.from = -1; }
  }
  return on ? people : null;
}
function _adgTell(open) {
  const pid = open === false ? _adg.last : _adgOpenId(); if (!pid) return;
  if (open !== false) _adg.last = pid;
  adLive('sky', { i: pid, n: open === false ? null : 1 });
}
function _adgNote(text) { _adg.note = { text, until: performance.now() + 4200 }; setTimeout(() => { if (_adg.note && performance.now() >= _adg.note.until && typeof _wdk !== 'undefined' && _wdk.el) { _adg.note = null; _wdSkyDraw(); } }, 4300); }

/* ---------- the sky view, grown from outside ---------- */
if (typeof _wdSkyDraw === 'function') {
  const _adgDraw0 = _wdSkyDraw;
  _wdSkyDraw = function () {   // eslint-disable-line no-func-assign
    let people = null;
    try { if (adOn()) { people = _adgSync(); if (people && _wdk.cur) { _wdk.done = _adg.done; _wdk.told = _adg.fin === _wdk.cur.id; _wdk.from = -1; } } } catch (e) { people = null; }
    const out = _adgDraw0.apply(this, arguments);
    try { if (adOn()) _adgDecorate(people); } catch (e) { console.error('[after dark] sky', e); }
    return out;
  };
}
if (typeof _wdSkyStar === 'function') {
  const _adgStar0 = _wdSkyStar;
  _wdSkyStar = function (i) {   // eslint-disable-line no-func-assign
    try { if (adOn() && _adgPress(i)) return undefined; } catch (e) { console.error('[after dark] star', e); }
    return _adgStar0.apply(this, arguments);
  };
}
if (typeof _wdSkyPick === 'function') {
  const _adgPick0 = _wdSkyPick;
  _wdSkyPick = function () {   // eslint-disable-line no-func-assign
    const out = _adgPick0.apply(this, arguments);
    try { if (adOn()) { _adgTell(); _adgBeat(); } } catch (e) { /* only a message */ }
    return out;
  };
}
if (typeof _wdSkyClose === 'function') {
  const _adgClose0 = _wdSkyClose;
  _wdSkyClose = function () {   // eslint-disable-line no-func-assign
    const was = typeof _wdk !== 'undefined' && _wdk.el;
    const out = _adgClose0.apply(this, arguments);
    if (was) {
      try { clearInterval(_adg.beatT); _adg.beatT = 0; if (adOn()) _adgTell(false); } catch (e) { /* only a message */ }
      _adg.sess = ''; _adg.press = new Map(); _adg.note = null; if (_adg.name && !_adg.name.saved) _adg.name = null;
      if (_adg.keep) { _adg.keep = false; setTimeout(() => { if (_wd.on) adKeep('ad-two-halves'); }, 400); }   // (held up in the world, not under the sky)
      if (_adg.moth) { _adg.moth = false; setTimeout(() => { if (_wd.on) wdAmbient('A moon moth came out under the picture you finished. They only do that for a finished one.', 6500, 'moon'); }, 900); }
    }
    return out;
  };
}
/** While the sky is open: say so to the garden now and then (a friend who opens it later finds you), and notice a friend gone. */
function _adgBeat() {
  if (_adg.beatT) return;
  _adg.beatT = setInterval(() => {
    if (typeof _wdk === 'undefined' || !_wdk.el) { clearInterval(_adg.beatT); _adg.beatT = 0; return; }
    try { if (_adgOpenId()) _adgTell(); const p = _adgWith(_adgOpenId()).join(','); if (p !== _adg.sig) { _adg.sig = p; _wdSkyDraw(); } } catch (e) { /* the next one */ }
  }, AD_SKY.beat);
}
/** After the sky is drawn: the halves, a named star's name, Wick's myth, the naming. */
function _adgDecorate(people) {
  const el = _wdk.el, row = _wdk.cur; if (!el || !row) return;
  const svg = el.querySelector('.wd-sky-svg'), foot = el.querySelector('.wd-sky-foot'), say = foot && foot.querySelector('.wd-sky-say'), me = _adgMe(), now = performance.now();
  if (!svg || !foot || !say) return;
  _adg.sig = people ? people.join(',') : String(me);
  // a star of this pattern that has a name (yours at home, theirs on a visit): its name beside it
  const nm = _adgNamedOf(row.id, gardenHere());
  if (nm && row.s[nm.star]) {
    // its name on the side away from the rest of the pattern, so it never runs across another star or a line
    const s = row.s[nm.star], X = 110 + s[0] * 7.8, Y = 40 + s[1] * 7.4, mx = row.s.reduce((a, p) => a + p[0], 0) / row.s.length, my = row.s.reduce((a, p) => a + p[1], 0) / row.s.length;
    let dx = s[0] - mx, dy = s[1] - my; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const side = Math.abs(dx) >= 0.45, tx = side ? X + Math.sign(dx) * 22 : X, ty = side ? Y + 5 + dy * 10 : Y + (dy >= 0 ? 34 : -22), anchor = side ? (dx > 0 ? 'start' : 'end') : 'middle';
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'ad-sky-named'); g.setAttribute('aria-hidden', 'true');
    g.innerHTML = `<circle cx="${X}" cy="${Y}" r="15" fill="none" stroke="#ffe9a8" stroke-width="1" opacity="0.55"/><text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="${anchor}" font-size="17" fill="#ffe9a8">${esc(nm.name)}</text>`;
    svg.appendChild(g);
  }
  if (people) {
    for (const g of svg.querySelectorAll('.wd-sky-s')) {
      const i = Number(g.getAttribute('data-i')), owner = people[i % people.length], own = owner === me, p = _adg.press.get(i), lit = p && now - p.at < AD_SKY.hold;
      g.classList.add(own ? 'ad-mine' : 'ad-theirs');
      if (lit) { g.classList.add('ad-pressed'); g.style.setProperty('--ad-left', ((AD_SKY.hold - (now - p.at)) / 1000).toFixed(2) + 's'); }
      g.setAttribute('aria-label', (own ? 'Your star ' : _adgName(owner) + '’s star ') + (i + 1));
    }
    const others = people.filter(w => w !== me).map(_adgName), chips = foot.querySelector('.wd-sky-chips');
    if (chips) { const w = _gdpEl('span', 'ad-sky-with'); w.innerHTML = icon('star', 'i-xs'); w.appendChild(document.createTextNode(' With ' + others.join(' and '))); chips.prepend(w); }
    if (_adg.fin !== row.id) say.textContent = `${_wdSkyKnown(row.id) ? row.name + ', together' : 'Join this one together'}. The bright stars are yours and the faint ones are ${others.length > 1 ? 'theirs' : others[0] + '’s'}. Press one of yours: when the stars at both ends of a line are pressed close together, the line lights.`;   // (an unknown pattern keeps its name until it is joined, as on its chip)
  }
  if (_adg.note && now < _adg.note.until && !(people && _adg.fin === row.id)) say.textContent = _adg.note.text;
  if (_wdk.told && AD_MYTHS[row.id]) _adgMyth(foot, row);
  if (people && _adg.fin === row.id && _adg.name && _adg.name.pid === row.id) _adgNaming(foot, row);
}
/** Wick tells the pattern's story, a line at a time. */
function _adgMyth(foot, row) {
  const lines = AD_MYTHS[row.id]; if (_adg.mythFor !== row.id) { _adg.mythFor = row.id; _adg.myth = 0; }
  const i = Math.min(_adg.myth, lines.length - 1), box = _gdpEl('div', 'ad-myth'), art = _gdpEl('span', 'ad-myth-art');
  art.innerHTML = `<svg viewBox="-24 -54 48 60" width="42" height="52" aria-hidden="true">${typeof gardenCastSvg === 'function' ? gardenCastSvg('wick') : ''}</svg>`;
  const t = _gdpEl('div', 'ad-myth-t'); t.appendChild(_gdpEl('b', null, i === 0 ? 'Wick, about ' + row.name.replace(/^The /, 'the ') : 'Wick'));
  t.appendChild(_gdpEl('p', null, '“' + lines[i] + '”'));
  box.append(art, t);
  if (i < lines.length - 1) { const b = _gdpEl('button', 'btn btn-sm btn-ghost ad-myth-go', 'Go on'); b.type = 'button'; b.onclick = () => { _adg.myth = i + 1; _wdSkyDraw(); const n = _wdk.el && _wdk.el.querySelector('.ad-myth-go'); (n || (_wdk.el && _wdk.el.querySelector('.wd-sky-go .btn:last-child')) || { focus() {} }).focus({ preventScroll: true }); }; box.appendChild(b); }
  foot.insertBefore(box, foot.querySelector('.wd-sky-go'));
}

/* ---------- halves: pressing stars together ---------- */
/** A press of star i, by slot w at time t: the lines it closes now (the star at the other end pressed within AD_SKY.hold). */
function _adgPressAt(row, i, w, t) {
  _adg.press.set(i, { at: t, w });
  const out = [];
  for (const [a, b] of row.e) {
    if (a !== i && b !== i) continue;
    const j = a === i ? b : a, k = a + '-' + b, q = _adg.press.get(j);
    if (_adg.done.has(k) || !q || t - q.at > AD_SKY.hold) continue;
    _adg.done.add(k); out.push(j);
  }
  clearTimeout(_adg.expT); _adg.expT = setTimeout(() => { if (typeof _wdk !== 'undefined' && _wdk.el && _adg.sess) _wdSkyDraw(); }, AD_SKY.hold + 60);   // (the glow of a press goes out)
  return out;
}
/** Your press in halves (true: handled here). Only your own stars answer; a friend's says whose it is. */
function _adgPress(i) {
  const row = _wdk.cur, people = row ? _adgSync() : null; if (!people) return false;
  if (_adg.fin === row.id || !row.s[i]) return true;
  const me = _adgMe(), owner = people[i % people.length];
  if (owner !== me) { wdSound([[392, 0.25, 'sine', 0.008]]); _adgNote(`That one is ${_adgName(owner)}’s star. Press one of your bright ones, and they press the one it joins to.`); _wdSkyDraw(); return true; }
  const closed = _adgPressAt(row, i, me, performance.now());
  adLive('star', { i: row.id, n: i, v: closed.length ? closed.join('-') : null });
  if (closed.length) wdSound([[880 + 80 * _adg.done.size, 0.45, 'sine', 0.018], [1320 + 80 * _adg.done.size, 0.5, 'sine', 0.008, 0.08]]);
  else wdSound([[740, 0.3, 'sine', 0.011]]);
  _adgDone(row);
  _wdSkyDraw();
  return true;
}
/** Every line joined: everyone learns it; Wick's myth; the moon moth (the host); then the naming. */
function _adgDone(row) {
  if (_adg.fin === row.id || !row.e.every(p => _adg.done.has(p[0] + '-' + p[1]))) return;
  _adg.fin = row.id; _wdk.told = true;
  if (!_wdSkyKnown(row.id)) { _wdSet('sk.' + row.id, _wdToday()); if (typeof _gdEmit === 'function') _gdEmit('wonder', { what: 'star' }); }   // (the star milestones: GR_ONCE 'star')
  wdSound([[660, 0.9, 'sine', 0.018], [880, 0.9, 'sine', 0.014, 0.14], [1320, 1.1, 'sine', 0.01, 0.28], [1760, 1.3, 'sine', 0.007, 0.44]]);
  try { _wdSkyGlow(gardenHere()); } catch (e) { /* the lake shows it next tick */ }
  if (!adHas('ad-two-halves')) _adg.keep = true; else adGive('halves.' + row.id, { x: 2 }, 'A sky in two halves, joined');
  if (adRole() !== 'visit' && typeof gardenLifeSpawn === 'function' && typeof _gw !== 'undefined') { try { if (gardenLifeSpawn('moon-moth', { at: { x: _gw.px + 0.9, y: _gw.py - 0.3, fade: 0 } })) _adg.moth = true; } catch (e) { /* no room just now */ } }
  const people = _adgWith(row.id), me = _adgMe();
  _adg.name = { pid: row.id, star: gardenHash('adname|' + row.id) % row.s.length, w: [-1, -1], pos: people.indexOf(me), with: people.filter(w => w !== me), saved: false };
  _adg.myth = 0; _adg.mythFor = row.id;
}
adHear('sky', (A, ev) => {
  const w = Number.isInteger(ev.w) ? ev.w : A && A.w; if (!Number.isInteger(w) || w === _adgMe()) return;
  const pid = String(ev.i || ''), open = Number(ev.n) === 1, was = _adg.them.get(w);
  if (open) _adg.them.set(w, { id: pid, at: performance.now() }); else if (was && was.id === pid) _adg.them.delete(w);
  if (open && (!was || was.id !== pid) && _adgOpenId()) _adgTell();   // (they have just come to it: they hear about you at once)
  if (typeof _wdk !== 'undefined' && _wdk.el) { if (open && _adgOpenId() === pid && (!was || was.id !== pid)) _adgNote(`${(A && A.n) || 'A friend'} is looking at ${_wdk.cur && _wdSkyKnown(_wdk.cur.id) ? _wdk.cur.name.replace(/^The /, 'the ') : 'this one'} too. Join it together: half the stars each.`); _wdSkyDraw(); }
});
adHear('star', (A, ev) => {
  const w = Number.isInteger(ev.w) ? ev.w : A && A.w, pid = String(ev.i || ''), i = Number(ev.n) || 0; if (!Number.isInteger(w)) return;
  _adg.them.set(w, { id: pid, at: performance.now() });   // (a press says the sky is open on it)
  const row = typeof _wdk !== 'undefined' && _wdk.el ? _wdk.cur : null; if (!row || row.id !== pid || !row.s[i]) return;
  if (!_adgSync()) { _wdSkyDraw(); return; }
  _adgPressAt(row, i, w, performance.now());
  for (const j of String(ev.v || '').split('-').filter(Boolean).map(Number)) { const e = row.e.find(p => (p[0] === i && p[1] === j) || (p[0] === j && p[1] === i)); if (e) _adg.done.add(e[0] + '-' + e[1]); }
  if (_adg.done.size) wdSound([[988, 0.3, 'sine', 0.009]]);
  _adgDone(row);
  _wdSkyDraw();
});

/* ---------- naming a star together ---------- */
function _adgNaming(foot, row) {
  const N = _adg.name, box = _gdpEl('div', 'ad-name'), other = N.with.map(_adgName).join(' and ') || 'your friend';
  if (N.saved) box.appendChild(_gdpEl('p', 'ad-name-done', `You named it the ${AD_STAR_WORDS[N.w[0]]} ${AD_STAR_WORDS[N.w[1]]}. It shines on the still water in both your vales.`));
  else if (N.pos < 0 || N.pos > 1) box.appendChild(_gdpEl('p', 'muted', 'The first two of you are naming one of its stars. Watch it get its name.'));
  else if (N.w[N.pos] < 0) {
    box.appendChild(_gdpEl('p', null, N.pos === 0 ? `Name one of its stars together. You choose the first word, ${other} the second.` : `Name one of its stars together. ${other} chooses the first word, you the second.`));
    const words = _gdpEl('div', 'ad-name-w');
    for (let k = 0; k < 12; k++) { const n = N.pos * 12 + k, b = _gdpEl('button', 'wd-sky-chip', AD_STAR_WORDS[n]); b.type = 'button'; b.onclick = () => _adgNamePick(row, n); words.appendChild(b); }
    box.appendChild(words);
  } else box.appendChild(_gdpEl('p', null, `You chose “${AD_STAR_WORDS[N.w[N.pos]]}”. Now ${other}…`));
  foot.insertBefore(box, foot.querySelector('.wd-sky-go'));
  // the star being named: a ring round it
  const s = row.s[N.star], svg = _wdk.el.querySelector('.wd-sky-svg');
  if (s && svg && !N.saved) { const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('aria-hidden', 'true'); g.innerHTML = `<circle class="ad-sky-ring" cx="${110 + s[0] * 7.8}" cy="${40 + s[1] * 7.4}" r="16" fill="none" stroke="#ffe9a8" stroke-width="1.4"/>`; svg.appendChild(g); }
}
function _adgNamePick(row, n) {
  const N = _adg.name; if (!N || N.saved || N.pos < 0 || N.pos > 1 || N.w[N.pos] >= 0) return;
  N.w[N.pos] = n; adLive('name', { i: row.id, n: N.star, v: n + '-' + N.pos });
  wdSound([[784, 0.5, 'sine', 0.012]]);
  _adgNameSave(row); _wdSkyDraw();
}
adHear('name', (A, ev) => {
  const N = _adg.name, pid = String(ev.i || ''); if (!N || N.saved || N.pid !== pid) return;
  const x = /^(\d{1,2})-(\d{1,2})$/.exec(String(ev.v || '')); if (!x) return;
  const n = Number(x[1]), pos = Number(x[2]); if ((pos !== 0 && pos !== 1) || pos === N.pos || n < pos * 12 || n >= pos * 12 + 12) return;
  N.w[pos] = n; _adgNameSave(typeof _wdk !== 'undefined' && _wdk.cur && _wdk.cur.id === pid ? _wdk.cur : WD_STARS.find(r => r.id === pid));
  if (typeof _wdk !== 'undefined' && _wdk.el) _wdSkyDraw();
});
/** Both words chosen: saved by each, in their own garden (the snapshot carries it to friends). */
function _adgNameSave(row) {
  const N = _adg.name; if (!N || N.saved || N.w[0] < 0 || N.w[1] < 0 || !row) return;
  N.saved = true;
  adSet('ns.' + row.id, [N.star, N.w[0], N.w[1], _adgPair(N.with[0])]);
  adGive('name.' + row.id, { x: 3 }, `A star in ${row.name.replace(/^The /, 'the ')} is the ${AD_STAR_WORDS[N.w[0]]} ${AD_STAR_WORDS[N.w[1]]} now`);
  try { gtgPublishSoon(); } catch (e) { /* the 5-minute one */ }
  wdSound([[660, 0.7, 'sine', 0.014], [990, 0.9, 'sine', 0.01, 0.16]]);
}
/** A mark for you and the one you named it with that names neither (gtgPair), or '0' when their id is not known here (two guests). */
function _adgPair(w) {
  try { if (adRole() === 'visit') return w === 0 && _glv.fid ? gtgPair(_glv.fid) || '0' : '0'; const A = _adgActor(w); return (A && A.f && gtgPair(A.f)) || '0'; } catch (e) { return '0'; }
}
/** The stars named together that this garden shows: yours at home, the host's on a visit. [{ pid, star, name, pair }] */
function adNamedStars(m) {
  const out = [];
  if (m && m.visit) { for (const r of adTheirs(m).s || []) { const row = WD_STARS.find(q => q.id === r[0]); if (row && AD_STAR_WORDS[r[2]] && AD_STAR_WORDS[r[3]]) out.push({ pid: r[0], star: r[1] % row.s.length, name: 'the ' + AD_STAR_WORDS[r[2]] + ' ' + AD_STAR_WORDS[r[3]], pair: r[4], row }); } return out; }
  for (const row of WD_STARS) { const v = adGet('ns.' + row.id); if (Array.isArray(v) && AD_STAR_WORDS[v[1]] && AD_STAR_WORDS[v[2]]) out.push({ pid: row.id, star: (Number(v[0]) || 0) % row.s.length, name: 'the ' + AD_STAR_WORDS[v[1]] + ' ' + AD_STAR_WORDS[v[2]], pair: String(v[3] || '0'), row }); }
  return out;
}
function _adgNamedOf(pid, m) { return adNamedStars(m).find(r => r.pid === pid) || null; }
adWire((o) => {
  const s = [];
  for (const row of WD_STARS) { const v = adGet('ns.' + row.id); if (Array.isArray(v) && Number.isInteger(v[0]) && Number.isInteger(v[1]) && Number.isInteger(v[2])) s.push([row.id, v[0], v[1], v[2], /^[0-9a-z]{1,14}$/.test(String(v[3])) ? String(v[3]) : '0']); }
  if (s.length) o.s = s.slice(0, 12);
});

/* ---------- the ways in: lying down at night, a telescope at night ---------- */
if (typeof _gaSky === 'function') {
  const _adgGaSky0 = _gaSky;
  _gaSky = function (cur, on) {   // eslint-disable-line no-func-assign
    const out = _adgGaSky0.apply(this, arguments);
    try { if (on) _adgLieDown(cur); } catch (e) { /* the sky as it was */ }
    return out;
  };
}
/** Lying on open ground at night: a note offers the patterns (the button opens the sky; lying on, you look up). */
function _adgLieDown(cur) {
  if (!adOn() || !cur || !cur.row || cur.row.nap || _adg.lieFor === cur) return;
  let tod = ''; try { tod = gardenHere().tod; } catch (e) { tod = ''; }
  if (tod !== 'night') return;
  _adg.lieFor = cur;
  setTimeout(() => {
    if (typeof _ga === 'undefined' || _ga.cur !== cur || (typeof _wdk !== 'undefined' && _wdk.el)) return;
    try { gardenToast('The stars are out. Look for the patterns?', { icon: 'star', timeout: 10000, action: { label: 'Look for patterns', run: () => gardenWonderLookUp() } }); } catch (e) { /* no stage */ }
  }, 2400);
}
/** Telescopes, by kind: at night E offers the stars instead of the far hills (rows of the kit's E prompt, no sprite of their own). */
function _adgScopes(m, N) {
  const want = new Set();
  if (N.tod === 'night') for (const t of gardenAffordThings()) {
    if (t.kind !== 'telescope' || !adInView(t.x, t.y, 2)) continue;
    const id = 'scope-' + t.id; want.add(id);
    if (!_ad.picks.has(id)) _ad.picks.set(id, { x: t.x, y: t.y + 0.1, words: 'Look at the stars', run: () => gardenWonderLookUp(), promptY: t.y - 1.5, pri: 1.6 });
  }
  for (const id of [..._ad.picks.keys()]) if (id.startsWith('scope-') && !want.has(id)) _ad.picks.delete(id);
}

/* ---------- named stars on the still water ---------- */
const AD_NAMED_GLOW = '<circle cy="-3" r="13" fill="#fff1c0" opacity="0.4"/><ellipse cy="1" rx="14" ry="3.2" fill="#ffe9a8" opacity="0.26"/>';
/** The largest still water in the vale: where the stars named together shine (by terrain, any layout). */
function _adgPool() { const S = adStill(); let best = null; for (const s of S) if (!best || s.area > best.area) best = s; return best; }
function _adgWater(m, N) {
  const show = adOn() && (N.tod === 'night' || N.tod === 'dusk'), list = show ? adNamedStars(m) : [], pool = list.length ? _adgPool() : null, want = new Set();
  if (pool) {
    list.forEach((r, k) => {
      const R = gardenRand('ad-ns|' + (N.key || '') + '|' + r.pid);
      let at = null;
      for (let i = 0; i < 12 && !at; i++) { const x = pool.box.x0 + (pool.box.x1 - pool.box.x0) * (0.15 + R() * 0.7), y = pool.box.y0 + (pool.box.y1 - pool.box.y0) * (0.2 + R() * 0.6); if (_adInPoly(x, y, pool.poly) && _adInPoly(x + 0.6, y, pool.poly) && _adInPoly(x - 0.6, y, pool.poly)) at = { x, y }; }
      if (!at || !adInView(at.x, at.y, 3)) return;
      const id = 'ns-' + r.pid; want.add(id);
      adSprite(id, { x: at.x, y: at.y, z: at.y - 3, hit: 0.55, hitUp: 4, label: `${r.name[0].toUpperCase() + r.name.slice(1)}, in ${r.row.name.replace(/^The /, 'the ')}: a star named by two friends`,
        svg: `<g transform="translate(0 -3)"><g class="ad-twinkle" style="animation-delay:${(-k * 0.37).toFixed(2)}s"><path d="M0 -7L1.5 -1.5L7 0L1.5 1.5L0 7L-1.5 1.5L-7 0L-1.5 -1.5Z" fill="#fffbe8"/></g></g>` });
      wdGlow('ad-' + id, AD_NAMED_GLOW, at.x, at.y);   // (its shine over the night: in the glow layer, where a pale circle is soft light)
    });
  }
  for (const id of [..._ad.sprites.keys()]) if (id.startsWith('ns-') && !want.has(id)) { adSprite(id, null); wdGlowOff('ad-' + id); }
}
wdMod({
  id: 'ad-stars', pref: 'night', visit: true,
  begin() { _adg.lieFor = null; },
  tick(m) {
    if (!adOn()) { adSpritesOff('ns-'); for (const id of [..._ad.picks.keys()]) if (id.startsWith('scope-')) _ad.picks.delete(id); return; }
    const N = adNow(m);
    _adgScopes(m, N);
    _adgWater(m, N);
  },
  end() { adSpritesOff('ns-'); for (const id of [..._ad.picks.keys()]) if (id.startsWith('scope-')) _ad.picks.delete(id); },
});

/* ============================================================
   LANTERN NIGHT
   ============================================================ */
const AD_BASKET_GLOW = '<circle cx="22" cy="-16" r="17" fill="#ffd28c" opacity="0.34"/><circle cx="22" cy="-16" r="8" fill="#fff4d0" opacity="0.4"/>';   // (the lit lantern on the basket's crook)
const _adl = { on: false, list: [], spot: null, spotKey: '', fold: null, foldKeys: null, heard: [], mineAt: -1e9, upKey: '', walking: false };
/** 94-garden-wonder-9days.js asks this before it puts out its own basket: while After dark is on, lantern night is this file's. */
function gardenNightLanternsUp() { try { return adOn(); } catch (e) { return false; } }
/** Is it lantern night where you are standing (the host's day and hemisphere on a visit), at dusk or night? */
function adLanternNight(m, N) {
  const r = typeof WD_DAYS !== 'undefined' ? WD_DAYS.find(x => x.id === 'lanterns') : null; if (!r || !N) return false;
  const md = N.day.slice(5), f = _wdMd(r.from, N.south), t = _wdMd(r.to, N.south);
  return (f <= t ? md >= f && md <= t : md >= f || md <= t) && (m.tod === 'dusk' || m.tod === 'night');
}
/** The bank where the basket stands: the walkable edge of still water nearest the arrival point (worked out again as the world settles). */
function _adlSpot() {
  const L = adLay(); if (!L) return null;
  const key = adWorldSig() + '|' + (typeof _gw !== 'undefined' && _gw.grid ? 1 : 0); if (_adl.spotKey === key) return _adl.spot;
  _adl.spotKey = key; _adl.spot = null;
  const a = L.arrival, banks = adBanks().slice().sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y));
  for (const b of banks.slice(0, 80)) {
    const tx = -b.ny, ty = b.nx, bx = b.x + tx * 0.75, by = b.y + ty * 0.75;   // (the basket a step along the bank from where you stand to float)
    if (!adOpen(b.x, b.y) || adHidden(b.x, b.y, 1.2) || adHidden(bx, by, 1)) continue;
    try { if (typeof _gwFree === 'function' && _gw.grid && (!_gwFree(b.x, b.y) || !_gwFree(bx, by))) continue; } catch (e) { /* no walker yet */ }
    _adl.spot = { x: b.x, y: b.y, nx: b.nx, ny: b.ny, w: b.w, bx, by }; break;
  }
  return _adl.spot;
}
/** How many you have floated tonight and this year. */
function _adlCounts(N) {
  let night = 0; const pre = 'ad.lf.' + N.nn + '.';
  for (const k of Object.keys(_wdG())) if (k.startsWith(pre)) night++;
  return { night, year: Number(adGet('ly' + N.day.slice(0, 4))) || 0 };
}
/* a floating paper lantern on its little raft (feet on the water at 0,0, world px, about 0.4 H tall): the paper lit from its middle out (a
   gradient of its own, one for each paper), corner posts and rims of dark wood, the pattern in ink, lit on the left and shaded on the right.
   Its light over the night is a soft glow of its own (_adlLightMk), moved with it a few times a second: a glow drawn inside the sprite would
   lie under the night's shade as a grey disc. */
function _adlSvg(c, p, bare) {
  const i = ((c % 5) + 5) % 5, P = AD_LANTERN.papers[i], paper = P[1], dk = GART.dk(paper, 0.45), gid = 'adl-pp' + i;
  const pat = p === 1 ? `<path d="M-2.4 -11l.45 1.1 1.1.4-1.1.4-.45 1.1-.45-1.1-1.1-.4 1.1-.4zM2.3 -7.4l.4.9.9.35-.9.35-.4.9-.4-.9-.9-.35.9-.35zM-1.1 -4.6l.32.75.75.3-.75.3-.32.75-.32-.75-.75-.3.75-.3z" fill="${dk}" opacity="0.75"/>`
    : p === 2 ? `<path d="M0.8 -11.4A3.6 3.6 0 1 0 0.8 -4.4A2.8 2.8 0 1 1 0.8 -11.4Z" fill="${dk}" opacity="0.7"/>` : '';
  return `<defs><radialGradient id="${gid}" cx="0.5" cy="0.56" r="0.64"><stop offset="0" stop-color="#fff8dc"/><stop offset="0.42" stop-color="${P[2]}"/><stop offset="1" stop-color="${paper}"/></radialGradient></defs>`
    + (bare ? '' : `<ellipse cx="0" cy="1.6" rx="9.5" ry="2.4" fill="#0e1a2a" opacity="0.35"/><path d="M-1.8 2.4Q0 9.5 1.8 2.4Z" fill="${P[2]}" opacity="0.34"/>`
    + `<path d="M-7 0.2H7L6 2H-6Z" fill="#4a3020"/><path d="M-7 0.2H7" stroke="#8a6a44" stroke-width="0.7"/>`)
    + `<path d="M-5.6 0L-5.2 -12.4H5.2L5.6 0Z" fill="url(#${gid})"/>${pat}`
    + `<path d="M-5.6 0L-5.2 -12.4H-3.1L-3.4 0Z" fill="#ffffff" opacity="0.16"/><path d="M3.4 0L3.1 -12.4H5.2L5.6 0Z" fill="#000000" opacity="0.15"/>`
    + `<path d="M-5.5 0L-5.1 -12.4M5.5 0L5.1 -12.4" stroke="#4a3020" stroke-width="0.8"/><path d="M0 -12.4V0" stroke="#4a3020" stroke-width="0.5" opacity="0.4"/>`
    + `<path d="M-6.1 -12.6H6.1M-5.9 -0.2H5.9" stroke="#3e2818" stroke-width="1.1" stroke-linecap="round"/>`;
}
/** A lantern's light over the night (wdGlow: pale circles get a soft edge), and its light on the water round it. */
function _adlLightMk(c) { const P = AD_LANTERN.papers[((c % 5) + 5) % 5]; return `<circle cy="-7" r="24" fill="${P[2]}" opacity="0.3"/><circle cy="-7" r="10" fill="#fff4d0" opacity="0.42"/><ellipse cy="2.6" rx="17" ry="4.6" fill="${P[2]}" opacity="0.3"/>`; }
/* the basket on the bank: wicker, three folded lanterns in it, a lit one hung on a crook beside it; grass at its foot when it stands on grass */
function _adlBasketSvg(grass) {
  const P = AD_LANTERN.papers, folded = (x, y, k, c) => `<g transform="translate(${x} ${y}) scale(${k})"><path d="M-5 0L-5.4 -9.4H5.4L5 0Z" fill="${c}"/><path d="M-5 0L-5.4 -9.4H-2.8L-3 0Z" fill="#ffffff" opacity="0.25"/><path d="M-5.6 -9.5H5.6M-5.2 -4.6H5.2" stroke="#4a3020" stroke-width="0.6" opacity="0.6"/></g>`;
  let weave = ''; for (let i = 0; i < 6; i++) weave += `<path d="M${-11 + i * 4.4} -9.6Q${-9.6 + i * 4.4} -5 ${-10.4 + i * 4.2} -0.6" stroke="#8a6a40" stroke-width="0.7" fill="none" opacity="0.7"/>`;
  return `<ellipse cx="2" cy="1" rx="17" ry="3.6" fill="#000000" opacity="0.24"/>`
    + `<path d="M15 1V-27Q15 -32 19 -32Q22 -32 22 -28" stroke="#5a4028" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M14.2 1V-26" stroke="#8a6a44" stroke-width="0.5" opacity="0.6"/><path d="M22 -28V-21" stroke="#3a2a1a" stroke-width="0.5"/>`
    + `<g transform="translate(22 -11.6) scale(0.62)">${_adlSvg(0, 0, true)}</g>`
    + `${folded(-6, -8, 0.85, P[2][1])}${folded(1, -9, 0.9, P[1][1])}${folded(7, -7.5, 0.8, P[4][1])}`
    + `<path d="M-12 -9.6L-10 0H10L12 -9.6Z" fill="#b48a56"/><path d="M-12 -9.6L-10 0H-6L-7.6 -9.6Z" fill="#d0a46a" opacity="0.6"/><path d="M8 -9.6L6.6 0H10L12 -9.6Z" fill="#7a5a34" opacity="0.5"/>${weave}`
    + `<path d="M-12.6 -9.8H12.6" stroke="#7a5a34" stroke-width="1.8" stroke-linecap="round"/><path d="M-11 -4.8H11" stroke="#8a6a40" stroke-width="0.8" opacity="0.8"/>`
    + (grass ? `<path d="M-13 1q1 -4 2 0M-8 1.4q.8 -3.4 1.6 0M9 1.2q1 -3.6 2 0M13 1q.8 -3 1.6 0" stroke="#5f7d3e" stroke-width="1" fill="none" stroke-linecap="round"/>` : '');
}
/** A lantern on the water: it drifts out from its bank and is kept on the water (looked at every half second). Numbers only, each frame. */
function _adlLaunch(L) {
  if (_adl.list.some(o => o.id === L.id)) return;
  while (_adl.list.length >= 13) { const old = _adl.list.shift(); adSprite(old.sid, null); wdGlowOff(old.gid); }
  const b = L.bank, R = gardenRand('adl|' + L.id);
  let x = b.x + b.nx * 0.9, y = b.y + b.ny * 0.9;
  for (const d of [1.3, 1.8, 2.4]) { if (adStillAt(x, y)) break; x = b.x + b.nx * d; y = b.y + b.ny * d; }
  if (!adStillAt(x, y)) return;
  if (!L.fresh) { for (let i = 0; i < 10; i++) { const a = R() * Math.PI * 2, d = 1 + R() * 5, qx = x + Math.cos(a) * d, qy = y + Math.sin(a) * d * 0.6; if (adStillAt(qx, qy)) { x = qx; y = qy; break; } } }   // (already out on the water a while)
  const o = { id: L.id, sid: 'lan-' + L.id, gid: 'adl-' + L.id, gmk: _adlLightMk(L.c), gt: 0, a: Math.atan2(b.ny, b.nx) + (R() - 0.5) * 1.1, sp: 0.11 + R() * 0.07, chk: 0.5, ph: R() * 6, mine: !!L.mine };
  const label = L.who ? `${L.who}’s lantern` : L.mine ? 'Your lantern' : 'A paper lantern';
  adSprite(o.sid, { x, y, z: y - 0.6, svg: _adlSvg(L.c, L.p), label, hit: 0.45, hitUp: 9, still: false, t: 0,
    update(dt, Sp) {
      Sp.t += dt; o.chk -= dt;
      if (o.chk <= 0) { o.chk = 0.5; const nx = Sp.x + Math.cos(o.a) * 0.55, ny = Sp.y + Math.sin(o.a) * 0.36; if (!adStillAt(nx, ny)) { o.a += 1.7 + Math.random() * 1.2; o.sp = Math.max(0.05, o.sp * 0.9); } else o.a += (Math.random() - 0.5) * 0.25; }
      Sp.x += Math.cos(o.a) * o.sp * dt; Sp.y += Math.sin(o.a) * o.sp * dt * 0.62; Sp.z = Sp.y - 0.6;
      Sp.lift = Math.sin(Sp.t * 1.25 + o.ph) * 0.9;
      o.gt -= dt; if (o.gt <= 0) { o.gt = 0.2; wdGlow(o.gid, o.gmk, Sp.x, Sp.y); }   // (its light, five times a second: the same markup, only its place changes)
    } });
  _adl.list.push(o);
}
function _adlBankNear(x, y) { let best = null, bd = 1e9; for (const b of adBanks()) { const d = Math.hypot(b.x - x, b.y - y); if (d < bd) { bd = d; best = b; } } return bd < 6 ? best : null; }
/** The lanterns already out when you come to the water: yours tonight, your friends' of the week (home), the host's (a visit). */
function _adlUp(m, N) {
  _adl.on = true;
  const banks = adBanks(); if (!banks.length) return;
  const put = (L) => { const b = banks[gardenHash('adlb|' + L.id) % banks.length]; _adlLaunch(Object.assign({ bank: b }, L)); };
  if (!m.visit) {
    for (const k of Object.keys(_wdG())) { const x = /^ad\.lf\.(\d{1,5})\.(\d{1,2})$/.exec(k); if (!x || Number(x[1]) !== N.nn) continue; const v = _wdG()[k]; if (Array.isArray(v)) put({ id: 'm' + x[1] + '-' + x[2], c: Number(v[0]) || 0, p: Number(v[1]) || 0, mine: true }); }
    for (const f of _adlFriends(N)) put(f);
  } else {
    let who = 'Your friend'; try { who = typeof _gscFirst === 'function' && m.visit.fid ? _gscFirst(m.visit.fid) || who : who; } catch (e) { /* their name stays plain */ }
    (adTheirs(m).l || []).forEach((r, i) => { if (Array.isArray(r) && r[2] >= N.nn - 7) put({ id: 'h' + i + '-' + r[2], c: r[0], p: r[1], who }); });
  }
}
function _adlDown() { _adl.on = false; for (const o of _adl.list) { adSprite(o.sid, null); wdGlowOff(o.gid); } _adl.list = []; adPick('lan-basket', null); wdGlowOff('adl-basket'); _adlFoldClose(); }
/** Your friends' lanterns of the week, as their snapshots say (nt.l): at most two each, eight in all, named from your own list. */
function _adlFriends(N) {
  const out = [];
  try {
    const d = typeof gardenSocialView === 'function' ? gardenSocialView() : null; if (!d || !d.gardens || typeof _gscFriendList !== 'function') return out;
    for (const f of _gscFriendList()) {
      const g = d.gardens[f.id], l = g && g.snap && g.snap.nt && g.snap.nt.l; if (!Array.isArray(l)) continue;
      const name = typeof _gscFirst === 'function' ? _gscFirst(f.id) : 'A friend'; let n = 0;
      for (const r of l.slice(0, 5)) { if (n >= AD_LANTERN.each || out.length >= AD_LANTERN.friends) break; if (!Array.isArray(r) || !Number.isInteger(r[2]) || r[2] < N.nn - 7) continue; out.push({ id: 'f' + (gardenHash(f.id + '|' + r.join('.')) >>> 0).toString(36), c: Number(r[0]) || 0, p: Number(r[1]) || 0, who: name }); n++; }
      if (out.length >= AD_LANTERN.friends) break;
    }
  } catch (e) { /* no friends' gardens held */ }
  return out;
}
adWire((o) => {
  let N = null; try { N = adNow(); } catch (e) { return; }
  const rows = [];
  for (const k of Object.keys(_wdG())) { const x = /^ad\.lf\.(\d{1,5})\.(\d{1,2})$/.exec(k); if (!x || Number(x[1]) < N.nn - 7) continue; const v = _wdG()[k]; if (Array.isArray(v)) rows.push([Math.max(0, Math.min(7, Number(v[0]) || 0)), Math.max(0, Math.min(3, Number(v[1]) || 0)), Number(x[1])]); }
  rows.sort((a, b) => b[2] - a[2]);
  if (rows.length) o.l = rows.slice(0, 5);
});
/* ---------- folding one ---------- */
function _adlFoldClose() {
  const F = _adl.fold; if (!F) return; _adl.fold = null;
  if (_adl.foldKeys) { document.removeEventListener('keydown', _adl.foldKeys, true); _adl.foldKeys = null; }
  const had = F.contains(document.activeElement); F.remove();
  if (had) { try { _gw.box.focus({ preventScroll: true }); } catch (e) { /* no stage */ } }
}
function _adlFoldOpen() {
  _adlFoldClose();
  const box = _wdBox(), spot = _adlSpot(); if (!box || !spot) return;
  const m = gardenHere(), N = adNow(m), cnt = _adlCounts(N);
  if (cnt.year >= AD_LANTERN.year) { wdWhisper('That is your seven for this year. They are all still drifting somewhere.', 5000); return; }
  if (cnt.night >= AD_LANTERN.night) { wdWhisper('Three tonight already. Come back tomorrow night and fold another.', 5000); return; }
  const st = { c: Math.max(0, Math.min(4, Number(adGet('lc')) || 0)), p: 0 };
  const el = document.createElement('div'); el.className = 'wd-talk ad-fold'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Fold a paper lantern');
  el.addEventListener('pointerdown', (ev) => ev.stopPropagation());
  const draw = () => {
    const P = AD_LANTERN.papers[st.c];
    el.innerHTML = `<div class="wd-talk-art ad-fold-art" aria-hidden="true"><svg viewBox="-13 -21 26 26" width="84" height="84"><circle cy="-7" r="12" fill="${P[2]}" opacity="0.2"/>${_adlSvg(st.c, st.p)}</svg></div><div class="wd-talk-in"><b class="wd-talk-n">Fold a paper lantern</b><p class="wd-talk-t"></p><div class="ad-fold-row ad-fold-papers" role="radiogroup" aria-label="Paper"></div><div class="ad-fold-row ad-fold-pats" role="radiogroup" aria-label="Pattern"></div><div class="wd-talk-go"></div></div>`;
    el.querySelector('.wd-talk-t').textContent = `${P[0]} paper${st.p ? ', with ' + (st.p === 1 ? 'stars' : 'a moon') + ' on it' : ''}. ${cnt.night ? `You have floated ${_wdPlural(cnt.night, 'lantern')} tonight.` : 'Choose a paper and a pattern, then set it on the water.'}`;
    const papers = el.querySelector('.ad-fold-papers'), pats = el.querySelector('.ad-fold-pats'), go = el.querySelector('.wd-talk-go');
    AD_LANTERN.papers.forEach((q, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'ad-fold-sw' + (i === st.c ? ' is-on' : ''); b.style.setProperty('--sw', q[1]); b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', i === st.c ? 'true' : 'false'); b.setAttribute('aria-label', q[0] + ' paper'); b.setAttribute('data-tip', q[0]); b.onclick = () => { st.c = i; draw(); const n = el.querySelector('.ad-fold-sw.is-on'); if (n) n.focus({ preventScroll: true }); }; papers.appendChild(b); });
    AD_LANTERN.patterns.forEach((w, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'wd-sky-chip ad-fold-pat' + (i === st.p ? ' is-on' : ''); b.textContent = w; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', i === st.p ? 'true' : 'false'); b.onclick = () => { st.p = i; draw(); const n = el.querySelector('.ad-fold-pat.is-on'); if (n) n.focus({ preventScroll: true }); }; pats.appendChild(b); });
    const f = document.createElement('button'); f.type = 'button'; f.className = 'btn btn-sm btn-primary ad-fold-go'; f.textContent = 'Float it'; f.onclick = () => _adlFloat(st.c, st.p); go.appendChild(f);
    const n = document.createElement('button'); n.type = 'button'; n.className = 'btn btn-sm btn-ghost'; n.textContent = 'Not now'; n.onclick = () => _adlFoldClose(); go.appendChild(n);
  };
  draw(); box.appendChild(el); _adl.fold = el;
  // E floats it, Escape puts it down (Enter and Space are the focused button's own)
  _adl.foldKeys = (ev) => { if (!_adl.fold) return; if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); _adlFoldClose(); } else if ((ev.key === 'e' || ev.key === 'E') && !ev.repeat && !ev.ctrlKey && !ev.metaKey && !ev.altKey) { ev.preventDefault(); ev.stopPropagation(); _adlFloat(st.c, st.p); } };
  document.addEventListener('keydown', _adl.foldKeys, true);
  const g = el.querySelector('.ad-fold-go'); if (g) g.focus({ preventScroll: true });
}
/** Float it: walk to the bank, set it on the water, tell the garden. */
function _adlFloat(c, p) {
  const spot = _adlSpot(); _adlFoldClose(); if (!spot || _adl.walking) return;
  adSet('lc', c);
  const go = () => {
    _adl.walking = false;
    const m = gardenHere(), N = adNow(m), cnt = _adlCounts(N); if (cnt.night >= AD_LANTERN.night || cnt.year >= AD_LANTERN.year || !_adl.on) return;
    const id = 'm' + N.nn + '-' + cnt.night;
    adSet('lf.' + N.nn + '.' + cnt.night, [c, p]); adSet('ly' + N.day.slice(0, 4), cnt.year + 1);
    _adlLaunch({ id: m.visit ? 'v' + (gardenHash(id + '|' + (m.visit.fid || '')) >>> 0).toString(36) : id, c, p, bank: spot, mine: true, fresh: true });
    adLive('lan', { i: ('l' + (gardenHash(id + '|' + Math.random()) >>> 0).toString(36)).slice(0, 24), x: Math.floor(spot.x), y: Math.floor(spot.y), n: c * 4 + p });
    try { if (typeof _gaFace === 'function') _gaFace(Math.atan2(spot.ny, spot.nx) * 180 / Math.PI); } catch (e) { /* facing as you were */ }
    wdSound([[523, 0.9, 'sine', 0.016], [659, 1, 'sine', 0.01, 0.2]]);
    const first = !adHas('ad-paper-lantern');
    if (first) adKeep('ad-paper-lantern');
    if (!m.visit) gardenRewardDid('lantern'); else adGive('lan.' + N.nn, { x: 1 }, 'The lantern is lit');
    _adl.mineAt = performance.now();
    if (_adl.heard.some(t => performance.now() - t < AD_LANTERN.together)) setTimeout(() => adKeep('ad-two-lanterns'), first ? 3200 : 600);
    try { gtgPublishSoon(); } catch (e) { /* the 5-minute one */ }
    if (!first) wdWhisper(['There it goes.', 'It catches up with the others in the end.', 'The water doesn’t mind.', 'One for someone, or for nothing. Nobody asks.'][(cnt.night + cnt.year) % 4], 4000);
  };
  if (typeof _gw === 'undefined' || Math.hypot(_gw.px - spot.x, _gw.py - spot.y) < 0.8) { go(); return; }
  _adl.walking = true;
  let ok = false; try { ok = gardenWalkToPoint({ x: spot.x, y: spot.y }, (r) => { if (r !== false) go(); else _adl.walking = false; }, { radius: 0.45 }); } catch (e) { ok = false; }
  if (!ok) { _adl.walking = false; go(); }
}
adHear('lan', (A, ev) => {
  _adl.heard.push(performance.now()); if (_adl.heard.length > 8) _adl.heard.shift();
  if (performance.now() - _adl.mineAt < AD_LANTERN.together) adKeep('ad-two-lanterns');
  if (!_adl.on) return;
  const n = Number(ev.n) || 0, b = _adlBankNear(Number(ev.x) + 0.5, Number(ev.y) + 0.5); if (!b) return;
  _adlLaunch({ id: 'x' + String(ev.i || '').slice(0, 20), c: Math.floor(n / 4) % 5, p: (n % 4) % 3, bank: b, who: (A && A.n) || 'A friend', fresh: true });
});
wdMod({
  id: 'ad-lantern', pref: 'night', visit: true,
  begin() { _adl.on = false; _adl.list = []; _adl.upKey = ''; },
  tick(m) {
    const N = adOn() ? adNow(m) : null, on = !!N && adLanternNight(m, N);
    if (!on) { if (_adl.on) _adlDown(); return; }
    const up = N.nn + '|' + (m.visit ? m.visit.fid : 'o');
    if (!_adl.on || _adl.upKey !== up) { _adlDown(); _adl.upKey = up; _adlUp(m, N); }
    const s = _adlSpot();
    if (s) wdGlow('adl-basket', AD_BASKET_GLOW, s.bx, s.by); else wdGlowOff('adl-basket');
    if (s) adPick('lan-basket', { x: s.bx, y: s.by, z: s.by, svg: _adlBasketSvg((() => { try { return gardenTerrainAt(s.bx, s.by) !== 'path'; } catch (e) { return true; } })()), words: 'Fold a paper lantern', label: 'Paper lanterns: fold one and set it on the water', hitUp: 12, run: () => _adlFoldOpen() });
    else adPick('lan-basket', null);
  },
  end() { _adlDown(); },
});
