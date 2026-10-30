/* ============================================================
   GARDENS WITH FRIENDS, the pages (2.18, agent 'garden-social'; docs/dev/GARDEN.md section 11).

     #view=garden:visit:<friendId>   a visit: their garden drawn by YOUR art engine (gardenRender, read-only),
                                     you standing at the gate in your own outfit (and your pet, when you have
                                     one: the renderer asks petGardenSprite), them too when they are around.
                                     Look (hover or click a plant to read about it) or Water (one plant a day:
                                     you walk over, it gets a drink and grows a little faster in their app),
                                     Give a heart, React (allow-listed emoji), Leave a gift (a seed or a
                                     decoration from your bag), Sign the guestbook (one line). Today's little
                                     list says what you have done; nothing is ever required
     garden:friends                  the Garden page's Friends tab: visits to your garden (parcels to unwrap),
                                     your guestbook, friends' gardens (a gallery: no scores, no ranking), who
                                     sees your garden and the guestbook and gift switches
     Friends' hangout                a 'Gardens' panel: the gallery with Visit buttons (Friends.registerPanel)
     a friend's page                 a 'Garden' panel: their garden small, Visit, and whether they see yours

   Everything a friend wrote (their name, a guestbook line) goes in with textContent; markup strings here are
   static, icon() or built from the catalogue and the rules tables. Gardens are drawn once per change and the
   drawn nodes kept (a re-render of the page moves them, never redraws them), small ones one per frame.
   ============================================================ */
const _gsv = {
  view: '', entered: '', root: null, fid: '', mode: 'look', visitT: 0, asked: new Set(),
  stage: new Map(),        // 'fid|sig' -> the figure gardenRender drew (the visit page)
  thumbs: new Map(),       // 'fid|sig|crop' -> the small figure (gallery, panels)
  thumbQ: [], thumbT: 0, tabBody: null, seenT: 0, lastData: null,
  drafts: new Map(),       // friendId -> what you were writing in their guestbook (kept across repaints)
};
const _GSV_WRAPS = ['#d6336c', '#1c7ed6', '#2f9e44', '#e8590c', '#ae3ec9', '#0c8599'];
function _gsvIdOf(v) { const m = /^garden:visit:([0-9a-f]{16})$/.exec(String(v || '')); return m ? m[1] : null; }
function _gsvEl(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
function _gsvBtn(label, o) {
  o = o || {};
  const b = document.createElement('button'); b.type = 'button';
  b.className = 'btn ' + (o.kind || 'btn-secondary') + (o.sm !== false ? ' btn-sm' : '') + (o.cls ? ' ' + o.cls : '');
  if (o.icon) b.innerHTML = icon(o.icon);
  if (label) b.appendChild(_gsvEl('span', null, label));
  if (o.tip) b.setAttribute('data-tip', o.tip);
  if (o.aria) b.setAttribute('aria-label', o.aria);
  if (o.disabled) b.disabled = true;
  if (o.pressed != null) b.setAttribute('aria-pressed', o.pressed ? 'true' : 'false');
  if (o.run) b.onclick = (e) => { e.stopPropagation(); o.run(e, b); };
  return b;
}
function _gsvAgo(ms) {
  const s = Math.max(0, Math.round((Date.now() - Number(ms)) / 1000));   // clock-ok: an age
  if (!ms) return '';
  if (s < 90) return 'just now';
  if (s < 3600) return Math.round(s / 60) + ' min ago';
  if (s < 86400) return Math.round(s / 3600) + ' h ago';
  const d = Math.round(s / 86400);
  return d === 1 ? 'yesterday' : d + ' days ago';
}
function _gsvAvatar(f, size) {
  if (typeof friendAvatarEl === 'function') { try { const el = friendAvatarEl(f, size); if (el) return el; } catch (e) { /* initials below */ } }
  const el = _gsvEl('span', 'gsv-av', (typeof avatarInitials === 'function' ? avatarInitials(gardenSocialName(f)) : '?'));
  el.style.setProperty('--size', size + 'px');
  return el;
}
function _gsvSig(snap) { return snap ? String(gardenHash(JSON.stringify([snap.lv, snap.season, snap.areas, snap.plants, snap.decor, snap.heart]))) : ''; }
function _gsvLevelTitle(lv) { return typeof GARDEN_LEVEL_TITLES !== 'undefined' ? GARDEN_LEVEL_TITLES[Math.max(0, Math.min(GARDEN_LEVEL_TITLES.length - 1, (lv || 1) - 1))] || '' : ''; }
/** The art anchor of a cell row in the 960 x 480 scene, as a share of the stage (the stage keeps the scene's 2:1). */
function _gsvAt(x, y, fp) { const W = GARDEN_WORLD, f = fp || 1; return { l: ((x + f / 2) * W.cellW) / (W.cols * W.cellW) * 100, t: (W.sky + (y + f) * W.cellH) / (W.sky + W.rows * W.cellH) * 100 }; }

/* ---------- the section, the palette, Home's Fun list ---------- */
registerSection('garden-visit', {
  match: v => /^garden:visit:[0-9a-f]{16}$/.test(String(v || '')),
  title: () => 'Garden',
  crumb: v => { const id = _gsvIdOf(v); return [id ? `${gardenSocialName(id)}'s garden` : "A friend's garden"]; },
  group: 'home', layout: 'bare', hashable: true, taskControls: false, icon: 'sprout',
  mount(container, view) { _gsvMount(container, view || state.view); },
  unmount() { clearTimeout(_gsv.visitT); _gsv.root = null; _gsv.view = ''; },
});
registerCommand({ id: 'garden-friends', group: 'Go to', label: "Friends' gardens", icon: 'users', keywords: 'garden friends visit water guestbook gift heart neighbour', run: () => setView('garden:friends') });
if (typeof gardenFunNavAdd === 'function') gardenFunNavAdd({ id: 'garden-friends', order: 20, label: "Friends' gardens", icon: 'users', view: 'garden:friends', when: () => _gscFriendList().length > 0 });

/* ---------- the visit ---------- */
function _gsvMount(container, view) {
  const fid = _gsvIdOf(view);
  const entering = _gsv.entered !== view;
  _gsv.entered = view; _gsv.view = view; _gsv.fid = fid;
  if (entering) _gsv.mode = 'look';
  const root = _gsvEl('div', 'gd-page gd-full gsv-page gsv-full' + (entering ? ' is-enter' : '') + (_gscFun() === 'off' ? ' is-funoff' : ''));
  container.appendChild(root);
  _gsv.root = root;
  const sub = document.getElementById('view-subtitle');
  if (sub) sub.textContent = 'A visit: look around, water a plant, leave a note. Nothing here is ever required.';
  _gsvPaint();
  gardenSocialFriendLoad(fid, entering).then(() => { if (_gsv.root === root) _gsvPaint(); }).catch(() => { if (_gsv.root === root) _gsvPaint(); });
  if (entering && fid) {
    // their app sends a fresh copy when ours is old (it answers at most every few minutes)
    if (!_gsv.asked.has(fid)) { _gsv.asked.add(fid); _gscApi('/api/garden-social/ask', { to: fid }).then((r) => { if (r && r.asked) setTimeout(() => gardenSocialFriendLoad(fid, true).then(() => { if (_gsv.root && _gsv.fid === fid) _gsvPaint(); }).catch(() => {}), 6000); }).catch(() => {}); }
    clearTimeout(_gsv.visitT);
    _gsv.visitT = setTimeout(() => _gsvNoteVisit(fid), 2500);
  }
}
/** The visit is noted once you have been there a moment (once a day; they see "Sam visited your garden"). */
async function _gsvNoteVisit(fid) {
  if (_gsv.fid !== fid || !_gsv.root) return;
  const c = gardenSocialFriendCached(fid);
  if (!c || !c.garden || (c.used && c.used.visit)) return;
  const r = await gardenSocialAct(fid, 'visit', null, { quiet: true });
  if (!r || !_gsv.root || _gsv.fid !== fid) return;
  const chip = _gsv.root.querySelector('.gsv-visited');
  if (chip) { chip.hidden = false; chip.classList.add('is-new'); }
}
function _gsvPaint() {
  const root = _gsv.root, fid = _gsv.fid;
  if (!root || !root.isConnected) return;
  const keepY = (document.getElementById('main') || {}).scrollTop;
  const focusId = document.activeElement && root.contains(document.activeElement) ? document.activeElement.id : '';
  root.textContent = '';
  const F = window.Friends;
  const f0 = fid ? _gscFriend(fid) : null;
  const f = f0 && f0.status === 'friend' ? f0 : null;
  const back = _gsvBtn("Friends' gardens", { icon: 'chevron-left', kind: 'btn-ghost', cls: 'gsv-back', run: () => setView('garden:friends') });
  if (!f) {
    root.appendChild(back);
    if (F && F.list && !F.me()) { root.appendChild(_gsvCalm('loader-circle', 'Walking over…', 'Finding your friends first.')); Promise.resolve(F.ready).then(() => { if (_gsv.root === root) _gsvPaint(); }).catch(() => {}); return; }
    mountEmptyState(root, { icon: 'user-x', title: 'This friend is not here any more', text: 'They may have been removed on one of your devices.', actions: [{ label: "Friends' gardens", icon: 'users', run: () => setView('garden:friends') }] });
    return;
  }
  const c = gardenSocialFriendCached(fid);
  root.appendChild(_gsvHead(f, c, back));
  const cache = _gsc.friends.get(fid);
  if (!c) {
    if (cache && cache.err && !cache.loading) root.appendChild(_gsvErr(cache.err, () => gardenSocialFriendLoad(fid, true).then(() => _gsvPaint()).catch(() => _gsvPaint())));
    else root.appendChild(_gsvCalm('sprout', `Walking over to ${_gscFirst(fid)}'s garden…`, ''));
    return;
  }
  if (!c.garden) { root.appendChild(_gsvNotShared(f)); return; }
  const main = _gsvEl('div', 'gd-game gsv-game');
  main.appendChild(_gsvToolbar(f, c));
  const left = _gsvEl('div', 'gd-col gsv-col');
  left.appendChild(_gsvStageBox(f, c));
  main.appendChild(left);
  const side = _gsvEl('aside', 'gd-side gsv-side');
  { const how = _gsvEl('section', 'card gsv-how'); how.appendChild(_gsvEl('b', null, `You are visiting ${_gscFirst(fid)}`)); how.appendChild(_gsvEl('p', 'muted', 'Look around, hover a plant to read about it. Pick Water and click a thirsty plant to help it grow. You can also give a heart, react, leave a gift or write in the guestbook. Nothing here is ever required.')); side.appendChild(how); }
  side.appendChild(_gsvToday(f, c));
  { const cc = typeof gardenCatchVisitCard === 'function' ? gardenCatchVisitCard(f, c.garden.snap) : null; if (cc) side.appendChild(cc); }   // 2.22: their showcase
  side.appendChild(_gsvGrowing(c.garden.snap));
  side.appendChild(_gsvBook(f, c));
  main.appendChild(side);
  root.appendChild(main);
  const mm = document.getElementById('main'); if (mm && keepY != null) mm.scrollTop = keepY;
  if (focusId) { const el = document.getElementById(focusId); if (el) el.focus({ preventScroll: true }); }
}
function _gsvCalm(ic, title, text) {
  const c = _gsvEl('div', 'card gsv-calm');
  c.innerHTML = icon(ic, 'i-lg' + (ic === 'loader-circle' ? ' gsv-spin' : ''));
  const t = _gsvEl('div');
  t.appendChild(_gsvEl('b', null, title));
  if (text) t.appendChild(_gsvEl('span', 'muted', text));
  c.appendChild(t);
  return c;
}
function _gsvErr(e, retry) {
  const c = _gsvCalm('cloud-off', 'The garden could not load just now', typeof netErrorMessage === 'function' ? netErrorMessage(e) : String(e && e.message || e));
  c.appendChild(_gsvBtn('Try again', { icon: 'refresh-cw', run: retry }));
  return c;
}
function _gsvHead(f, c, back) {
  const head = _gsvEl('div', 'gd-head gsv-head');
  const l = _gsvEl('div', 'gsv-head-l');
  l.appendChild(back);
  const who = _gsvEl('div', 'gsv-who');
  who.appendChild(_gsvAvatar(f, 44));
  const t = _gsvEl('div', 'gsv-who-t');
  t.appendChild(_gsvEl('div', 'overline', 'Visiting'));
  t.appendChild(_gsvEl('h1', null, `${gardenSocialName(f)}'s garden`));
  if (c && c.garden) {
    const snap = c.garden.snap;
    const line = _gsvEl('div', 'gd-level');
    const lv = _gsvEl('span', 'gd-lv-n'); lv.innerHTML = icon('sprout'); lv.appendChild(_gsvEl('b', null, 'Level ' + snap.lv));
    line.appendChild(lv);
    const title = _gsvLevelTitle(snap.lv); if (title) line.appendChild(_gsvEl('span', 'gd-lv-t', title));
    if (c.garden.at) line.appendChild(_gsvEl('span', 'muted gsv-asof', 'as of ' + _gsvAgo(c.garden.at)));
    t.appendChild(line);
  }
  who.appendChild(t);
  l.appendChild(who);
  head.appendChild(l);
  const r = _gsvEl('div', 'gd-head-r');
  if (c && c.garden) {
    const chip = (ic, val, label, cls) => { const e = _gsvEl('span', 'gd-chip' + (cls ? ' ' + cls : '')); e.innerHTML = icon(ic); e.appendChild(_gsvEl('b', null, val)); if (label) e.appendChild(_gsvEl('span', null, label)); return e; };
    r.appendChild(chip('sprout', String(c.garden.snap.plants.length), c.garden.snap.plants.length === 1 ? 'plant' : 'plants', 'is-feed'));
    if (c.garden.hearts) r.appendChild(chip('heart', String(c.garden.hearts), c.garden.hearts === 1 ? 'heart' : 'hearts', 'gsv-chip-heart'));
    const v = chip('footprints', 'Visited', '', 'gsv-visited'); v.hidden = !(c.used && c.used.visit); v.title = 'They see that you came by today';
    r.appendChild(v);
  }
  head.appendChild(r);
  return head;
}
function _gsvNotShared(f) {
  const c = _gsvEl('div', 'card gsv-calm gsv-notshared');
  c.innerHTML = _gsvGateSvg();
  const t = _gsvEl('div');
  t.appendChild(_gsvEl('b', null, `${_gscFirst(f.id)} hasn't shared a garden with you yet`));
  t.appendChild(_gsvEl('span', 'muted', 'When they do (it is on unless they turned it off), it grows here for you to visit. Meanwhile, yours is waiting for them.'));
  c.appendChild(t);
  const a = _gsvEl('div', 'gsv-row');
  a.appendChild(_gsvBtn('Check again', { icon: 'refresh-cw', run: (e, b) => { b.disabled = true; _gscApi('/api/garden-social/ask', { to: f.id }).catch(() => {}).finally(() => setTimeout(() => gardenSocialFriendLoad(f.id, true).then(() => _gsvPaint()).catch(() => _gsvPaint()), 5000)); toast(`Asked ${_gscFirst(f.id)}'s app for their garden. It shows here if they share it.`, { icon: 'sprout' }); } }));
  a.appendChild(_gsvBtn('Your garden', { icon: 'sprout', kind: 'btn-ghost', run: () => setView('garden') }));
  c.appendChild(a);
  return c;
}
/** A little garden gate (the empty states): static markup, explicit colours. */
function _gsvGateSvg() {
  return '<svg class="gsv-gate" viewBox="0 0 120 80" width="96" height="64" aria-hidden="true">'
    + '<ellipse cx="60" cy="74" rx="56" ry="5" fill="#cfe3b4"/>'
    + '<g fill="#e9dcc0" stroke="#b49a6c" stroke-width="1.4">' + [8, 22, 36, 76, 90, 104].map(x => `<path d="M${x} 72V30l5-6 5 6v42z"/>`).join('') + '<rect x="4" y="40" width="112" height="5" rx="1"/><rect x="4" y="58" width="112" height="5" rx="1"/></g>'
    + '<path d="M50 72V34a10 10 0 0 1 20 0v38z" fill="#f4ecd8" stroke="#b49a6c" stroke-width="1.4"/><circle cx="66" cy="54" r="1.8" fill="#8a6a3a"/>'
    + '<g><circle cx="16" cy="28" r="5" fill="#f28fb0"/><circle cx="16" cy="28" r="1.8" fill="#ffd45a"/><circle cx="98" cy="26" r="5" fill="#a98ce8"/><circle cx="98" cy="26" r="1.8" fill="#ffe7a8"/><circle cx="110" cy="34" r="4" fill="#f7c948"/></g>'
    + '<path d="M14 72c4-10 2-18 2-18M96 72c2-8 2-12 2-16" stroke="#5f8f4a" stroke-width="1.6" fill="none"/></svg>';
}

/* the tools: Look / Water, and the little things to do */
/** What is left today of one kind of visit: this garden's own allowance, and the day's for all gardens. */
function _gsvLeft(c, t) {
  const used = (c.used && c.used[t]) || 0, cap = c.caps && c.caps[t] ? c.caps[t] : { per: 1, all: 1, usedAll: 0 };
  return Math.max(0, Math.min(cap.per - used, (cap.all || cap.per) - (cap.usedAll || 0)));
}
/** What the Water tool can do right now, in plain words (2.19.4). `thirsty` = the plants you can water now. */
function _gsvWaterInfo(f, c) {
  const first = _gscFirst(f.id), plants = (c && c.garden && c.garden.snap && c.garden.snap.plants) || [];
  const left = c ? _gsvLeft(c, 'water') : 0;
  const done = new Set(((c && c.mine) || []).filter(a => a.t === 'water' && a.d === c.today).map(a => a.x + ',' + a.y));
  const drinkers = plants.filter(r => gsocWaterOk(r[0]));
  const thirsty = drinkers.filter(r => (r[5] & 1) && !done.has(r[1] + ',' + r[2]));
  if (!plants.length) return { n: 0, thirsty: [], text: `${first} has no plants yet` };
  if (!left) return { n: 0, thirsty: [], text: 'You watered here today, come back tomorrow' };
  if (!drinkers.length) return { n: 0, thirsty: [], text: `${first}'s plants find their own water` };
  if (!thirsty.length) return { n: 0, thirsty: [], text: `Nothing in ${first}'s garden looks thirsty right now` };
  return { n: thirsty.length, thirsty, text: `Pick a thirsty plant to water (${thirsty.length} ${thirsty.length === 1 ? 'is' : 'are'} thirsty)` };
}
/** The always-visible line over the garden: the Water tool's state, so "it will not let me" is never a guess. */
function _gsvWaterNote(f, c) {
  const info = _gsvWaterInfo(f, c);
  const n = _gsvEl('div', 'gsv-water-note ' + (info.n ? 'is-ok' : 'is-none'));
  n.setAttribute('role', 'status');
  n.innerHTML = icon('droplet', 'i-sm');
  n.appendChild(_gsvEl('span', null, info.text));
  return n;
}
/** Mark the plants a drink would help (they glow and pulse in Water mode; the rest dim). */
function _gsvMarkCan(fig, info) {
  if (!fig) return;
  const can = new Set((info.thirsty || []).map(r => r[1] + ',' + r[2]));
  for (const g of fig.querySelectorAll('.gd-plant')) g.classList.toggle('gsv-can', can.has(g.getAttribute('data-x') + ',' + g.getAttribute('data-y')));
}
function _gsvToolbar(f, c) {
  const bar = _gsvEl('div', 'gd-toolbar gsv-toolbar');
  const tools = _gsvEl('div', 'gd-tools'); tools.setAttribute('role', 'group'); tools.setAttribute('aria-label', 'What a click does');
  const waterLeft = _gsvLeft(c, 'water'), winfo = _gsvWaterInfo(f, c);
  const set = (mode) => { _gsv.mode = mode; const box = _gsv.root && _gsv.root.querySelector('.gsv-stagebox'); if (box) box.dataset.mode = mode; for (const b of tools.querySelectorAll('.gd-tool')) b.setAttribute('aria-pressed', b.dataset.mode === mode ? 'true' : 'false'); _gsvStatus(mode === 'water' ? winfo.text + (winfo.n ? ': a drink from you helps it grow a little faster' : '') : ''); };
  for (const [mode, label, ic] of [['look', 'Look', 'eye'], ['water', waterLeft ? 'Water' : 'Watered today', 'droplet']]) {
    const b = _gsvEl('button', 'gd-tool'); b.type = 'button'; b.dataset.mode = mode;
    b.innerHTML = icon(ic); b.appendChild(_gsvEl('span', null, label));
    b.setAttribute('aria-pressed', _gsv.mode === mode ? 'true' : 'false');
    if (mode === 'water') b.setAttribute('data-tip', winfo.text);
    if (mode === 'water' && waterLeft) b.appendChild(_gsvEl('i', 'gd-tooln', String(waterLeft)));
    b.onclick = () => set(mode);
    tools.appendChild(b);
  }
  bar.appendChild(tools);
  const q = _gsvEl('div', 'gd-quick');
  const liked = !_gsvLeft(c, 'like');
  q.appendChild(_gsvBtn(liked ? 'Hearted today' : 'Give a heart', { icon: 'heart', cls: 'gsv-heart' + (liked ? ' is-done' : ''), disabled: liked, tip: liked ? 'One heart a day for each garden' : `${_gscFirst(f.id)} sees it, and their garden's hearts add up`, run: (e, b) => _gsvLike(f, b) }));
  const reactsLeft = _gsvLeft(c, 'react');
  q.appendChild(_gsvBtn('React', { icon: 'smile-plus', disabled: !reactsLeft, tip: reactsLeft ? 'Leave a little reaction' : 'That is all the reactions for today', run: (e, b) => _gsvReactMenu(f, b) }));
  const gifted = !_gsvLeft(c, 'gift');
  q.appendChild(_gsvBtn(gifted ? 'Parcel left' : 'Leave a gift', { icon: 'gift', disabled: gifted, tip: gifted ? 'One parcel a day for each garden' : 'A seed or a decoration from your bag', run: (e, b) => _gsvGiftMenu(f, b) }));
  q.appendChild(_gsvBtn('Guestbook', { icon: 'feather', kind: 'btn-ghost', run: () => { const i = document.getElementById('gsv-book-in'); if (i) { i.scrollIntoView({ block: 'center', behavior: _gscReduced() ? 'auto' : 'smooth' }); i.focus({ preventScroll: true }); } } }));
  bar.appendChild(q);
  return bar;
}
function _gsvStatus(text) { const s = _gsv.root && _gsv.root.querySelector('.gsv-status'); if (s) s.textContent = text || ''; }

/* the stage: their garden (drawn once per change), you, them, and the little effects */
function _gsvStageBox(f, c) {
  const box = _gsvEl('div', 'gd-stagebox gsv-stagebox');
  box.dataset.mode = _gsv.mode;
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', `${gardenSocialName(f)}'s garden. Hover or tab to a plant to read about it.`);
  const snap = c.garden.snap, sig = _gsvSig(snap);
  let tod = '';
  try { tod = typeof _gdTod === 'function' ? _gdTod(_gscNow(), snap.season) : ''; } catch (e) { tod = ''; }
  const key = f.id + '|' + sig + '|' + tod;   // drawn again when it changes, or when your sky turns to dusk or night
  let fig = _gsv.stage.get(key);
  if (fig) for (const g of fig.querySelectorAll('.gsv-hot, .gsv-watered, .gsv-can')) g.classList.remove('gsv-hot', 'gsv-watered', 'gsv-can');
  if (!fig) {
    const holder = _gsvEl('div');
    const r = gardenRender(holder, snap, { readOnly: true, visitor: { name: gardenSocialName(f) }, size: 'm', crop: 'all', friend: f });   // integrate 2.18: f brings their pet (agent pets)
    fig = holder.firstElementChild;
    if (!r || !fig) { box.appendChild(_gsvCalm('sprout', 'This garden could not be drawn', 'It may come from a newer OpenDash: update to see everything in it.')); return box; }
    for (const k of [..._gsv.stage.keys()]) if (k.startsWith(f.id + '|')) _gsv.stage.delete(k);
    if (_gsv.stage.size > 6) _gsv.stage.clear();
    _gsv.stage.set(key, fig);
    // plants can be reached from the keyboard: each is a focusable item with its name
    for (const g of fig.querySelectorAll('.gd-it.gd-plant')) { g.setAttribute('tabindex', '0'); const row = _gsvRowAt(snap, +g.getAttribute('data-x'), +g.getAttribute('data-y')); if (row) g.setAttribute('aria-label', _gsvRowLabel(row)); g.setAttribute('role', 'button'); }
  }
  // the plants you watered here today look it (their app's next snapshot will say so too)
  for (const a of (c.mine || []).filter(x => x.t === 'water' && x.d === c.today)) {
    const g = fig.querySelector(`.gd-plant[data-x="${a.x}"][data-y="${a.y}"]`);
    if (g) { g.classList.remove('is-thirsty'); g.classList.add('gsv-watered'); }
  }
  _gsvMarkCan(fig, _gsvWaterInfo(f, c));
  box.appendChild(fig);
  box.appendChild(_gsvWaterNote(f, c));
  const over = _gsvEl('div', 'gsv-over'); over.setAttribute('aria-hidden', 'true');
  box.appendChild(over);
  box.appendChild(_gsvEl('div', 'gd-status gsv-status'));
  _gsvBindStage(box, f, snap);
  requestAnimationFrame(() => _gsvPeople(over, f, snap));
  return box;
}
function _gsvRowAt(snap, x, y) { return snap.plants.find(r => r[1] === x && r[2] === y) || null; }
function _gsvRowLabel(r) {
  const def = gardenPlant(r[0]); if (!def) return 'A plant';
  const flags = r[5] || 0;
  const bits = [def.name, typeof gardenStageName === 'function' ? gardenStageName(def, r[3]).toLowerCase() : ''];
  if (flags & 4) bits.push('ready to pick');
  if (flags & 1) bits.push('a little thirsty');
  return bits.filter(Boolean).join(' · ');
}
function _gsvBindStage(box, f, snap) {
  const itemOf = (t) => { const g = t && t.closest ? t.closest('.gd-it') : null; return g && box.contains(g) ? g : null; };
  let hot = null;
  const hover = (g) => {
    if (hot === g) return;
    if (hot) hot.classList.remove('gsv-hot');
    hot = g;
    if (!g) { const cc = gardenSocialFriendCached(f.id); _gsvStatus(_gsv.mode === 'water' && cc ? _gsvWaterInfo(f, cc).text : ''); return; }
    g.classList.add('gsv-hot');
    const x = +g.getAttribute('data-x'), y = +g.getAttribute('data-y');
    if (g.classList.contains('gd-plant')) {
      const r = _gsvRowAt(snap, x, y);
      if (!r) return _gsvStatus('');
      const cc = gardenSocialFriendCached(f.id), can = gsocWaterOk(r[0]), left = cc ? _gsvLeft(cc, 'water') : 1;
      _gsvStatus(_gsvRowLabel(r) + (_gsv.mode === 'water' ? (!can ? ' · finds its own water' : !left ? ' · you watered here today' : g.classList.contains('gsv-can') ? ' · click to water' : (r[5] & 1) ? ' · you watered it today' : ' · not thirsty, but you can still water it') : ''));
    } else {
      const d = snap.decor.find(q => q[1] === x && q[2] === y), def = d ? gardenDecor(d[0]) : null;
      _gsvStatus(def ? def.name : '');
    }
  };
  box.addEventListener('pointermove', (e) => hover(itemOf(e.target)));
  box.addEventListener('pointerleave', () => hover(null));
  box.addEventListener('focusin', (e) => hover(itemOf(e.target)));
  const use = (g) => {
    if (!g || !g.classList.contains('gd-plant')) return;
    const r = _gsvRowAt(snap, +g.getAttribute('data-x'), +g.getAttribute('data-y'));
    if (!r) return;
    if (_gsv.mode === 'water') _gsvWater(f, r, g); else _gsvPlantCard(f, r, g);
  };
  box.addEventListener('click', (e) => use(itemOf(e.target)));
  box.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { const g = itemOf(e.target); if (g) { e.preventDefault(); use(g); } } });
}
/** Look: a plant's card (what it is, how grown, a drink from you). */
function _gsvPlantCard(f, r, g) {
  const def = gardenPlant(r[0]); if (!def) return;
  openPopover(g, (el, close) => {
    el.classList.add('gsv-pop');
    const top = _gsvEl('div', 'gsv-pop-h');
    const ic = _gsvEl('span', 'gsv-pop-ic'); ic.innerHTML = gardenIconSvg(def.id, { kind: 'plant', stage: r[3], variant: r[4], px: 44 });
    top.appendChild(ic);
    const t = _gsvEl('div');
    t.appendChild(_gsvEl('b', null, def.name));
    const rar = GARDEN_RARITY && GARDEN_RARITY[def.rarity] ? GARDEN_RARITY[def.rarity].label || def.rarity : def.rarity;
    t.appendChild(_gsvEl('span', 'muted gsv-small', [typeof gardenStageName === 'function' ? gardenStageName(def, r[3]) : '', rar].filter(Boolean).join(' · ')));
    top.appendChild(t);
    el.appendChild(top);
    if (def.blurb) el.appendChild(_gsvEl('p', 'gsv-pop-p', def.blurb));
    if (r[5] & 1) el.appendChild(_gsvEl('p', 'gsv-pop-p muted', `A little thirsty: a drink from you would help ${_gscFirst(f.id)}'s ${def.name.toLowerCase().replace(/^the /, '')} along.`));
    const c = gardenSocialFriendCached(f.id);
    if (gsocWaterOk(def.id)) {
      const left = c ? _gsvLeft(c, 'water') : 0;
      el.appendChild(_gsvBtn(left ? 'Water it' : 'Watered here today', { icon: 'droplet', kind: left ? 'btn-primary' : 'btn-secondary', disabled: !left, run: () => { close(); _gsvWater(f, r, g); } }));
    }
  }, { align: 'center' });
}
/** A plant that cannot be watered says why, in the toast and in the line over the garden. */
function _gsvWhy(msg) {
  toast(msg, { icon: 'droplet', timeout: 3600 });
  _gsvStatus(msg);
  const n = _gsv.root && _gsv.root.querySelector('.gsv-water-note');
  if (n) { n.classList.remove('is-nudge'); void n.offsetWidth; n.classList.add('is-nudge'); }
}
async function _gsvWater(f, r, g) {
  if (!gsocWaterOk(r[0])) { _gsvWhy(gardenPlant(r[0]) && gardenPlant(r[0]).special === 'heart' ? 'The old oak finds its own water: its roots go deep, so it never needs yours.' : 'This one lives in the pond and is never thirsty.'); return; }
  const c = gardenSocialFriendCached(f.id);
  if (c && !_gsvLeft(c, 'water')) { _gsvWhy('You watered here today, come back tomorrow.'); return; }
  if (g && g.classList && g.classList.contains('gsv-watered')) { _gsvWhy('You already watered this one today.'); return; }
  const over = _gsv.root && _gsv.root.querySelector('.gsv-over');
  const at = _gsvAt(r[1], r[2], (gardenPlant(r[0]) || {}).fp);
  _gsvWalk(over, at.l - 3.4, at.t);
  const res = await gardenSocialAct(f.id, 'water', { p: r[0], x: r[1], y: r[2] });
  if (!res) return;
  if (g && g.classList) { g.classList.remove('is-thirsty', 'gsv-can'); g.classList.add('gsv-watered'); }
  _gsvFx(over, 'water', at);
  _gsvRefreshSide(f);
}
async function _gsvLike(f, btn) {
  if (btn) btn.disabled = true;
  const r = await gardenSocialAct(f.id, 'like');
  if (!r) { if (btn && btn.isConnected) btn.disabled = false; return; }
  _gsvFx(_gsv.root && _gsv.root.querySelector('.gsv-over'), 'heart', { l: 50, t: 62 });
  _gsvRefreshSide(f);
}
function _gsvReactMenu(f, anchor) {
  openPopover(anchor, (el, close) => {
    el.classList.add('gsv-pop', 'gsv-reacts');
    el.appendChild(_gsvEl('div', 'pop-label', `React to ${_gscFirst(f.id)}'s garden`));
    const grid = _gsvEl('div', 'gsv-react-grid');
    for (const r of GSOC_REACTS) {
      const b = _gsvEl('button', 'gsv-react'); b.type = 'button';
      b.appendChild(_gsvEl('span', 'gsv-react-e', r.e));
      b.appendChild(_gsvEl('span', 'gsv-react-l', r.label));
      b.onclick = async () => {
        close();
        const res = await gardenSocialAct(f.id, 'react', { e: r.id });
        if (res) { _gsvFx(_gsv.root && _gsv.root.querySelector('.gsv-over'), 'react', { l: 30 + Math.random() * 40, t: 55 }, r.e); _gsvRefreshSide(f); }
      };
      grid.appendChild(b);
    }
    el.appendChild(grid);
  }, { align: 'end' });
}
/** Your bag's seeds and decorations that can be given. */
function _gsvGiftables() {
  let w = null;
  try { w = typeof gardenWallet === 'function' && typeof gardenReady === 'function' && gardenReady() ? gardenWallet() : null; } catch (e) { w = null; }
  const out = { seed: [], decor: [], fish: [], bug: [] };
  if (!w) return out;
  for (const [k, n] of Object.entries(w.items || {})) {
    if (!(n > 0)) continue;
    const i = k.indexOf(':'), kind = k.slice(0, i), id = k.slice(i + 1);
    if ((kind === 'seed' || kind === 'decor') && gsocGiftOk(kind, id)) out[kind].push({ id, n: Math.floor(n), def: kind === 'seed' ? gardenPlant(id) : gardenDecor(id) });
    else if ((kind === 'fish' || kind === 'bug') && gsocGiftOk(kind, id)) { const fp = kind === 'fish' ? gardenFishParse(k) : null; out[kind].push({ id, n: Math.floor(n), def: kind === 'fish' ? gardenFishDef(fp.id) : gardenBugDef(id), q: fp ? fp.q : 0 }); }
  }
  const rank = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
  out.seed.sort((a, b) => (rank[a.def.rarity] ?? 5) - (rank[b.def.rarity] ?? 5) || a.def.name.localeCompare(b.def.name));
  out.decor.sort((a, b) => a.def.name.localeCompare(b.def.name));
  return out;
}
function _gsvGiftMenu(f, anchor) {
  const g = _gsvGiftables();
  openPopover(anchor, (el, close) => {
    el.classList.add('gsv-pop', 'gsv-gifts');
    el.appendChild(_gsvEl('div', 'pop-label', `A parcel for ${_gscFirst(f.id)}`));
    if (!g.seed.length && !g.decor.length && !g.fish.length && !g.bug.length) {
      el.appendChild(_gsvEl('p', 'gsv-pop-p muted', 'Your bag is empty for now. Seeds and decorations from the shop (or your harvest) can be given.'));
      el.appendChild(_gsvBtn('Open the shop', { icon: 'store', run: () => { close(); setView('garden:shop'); } }));
      return;
    }
    const list = _gsvEl('div', 'gsv-gift-list');
    const add = (k, it) => {
      const b = _gsvEl('button', 'gsv-gift'); b.type = 'button';
      const ic = _gsvEl('span', 'gsv-gift-ic'); ic.innerHTML = k === 'fish' || k === 'bug' ? gardenCatchSvg(k, k === 'fish' ? it.def.id : it.id, 34, { uid: 'gv' + k + it.id }) : gardenIconSvg(it.id, { kind: k === 'seed' ? 'seed' : 'decor', px: 34 }); b.appendChild(ic);
      const t = _gsvEl('span', 'gsv-gift-t'); t.appendChild(_gsvEl('b', null, it.def.name + (it.q ? ' ' + gardenQuality(it.q).stars : ''))); t.appendChild(_gsvEl('span', 'muted', k === 'seed' ? `seed · ${it.def.rarity}` : k === 'fish' ? `fish · ${it.def.rarity}` : k === 'bug' ? `bug · ${it.def.rarity}` : 'decoration')); b.appendChild(t);
      b.appendChild(_gsvEl('span', 'gsv-gift-n', '×' + it.n));
      b.onclick = () => { close(); gardenSocialGive(f.id, k, k === 'fish' ? it.def.id + '-' + it.q : it.id); setTimeout(() => _gsvRefreshSide(f), 7000); };
      list.appendChild(b);
    };
    if (g.seed.length) { list.appendChild(_gsvEl('div', 'gsv-gift-h', 'Seeds')); for (const it of g.seed.slice(0, 40)) add('seed', it); }
    if (g.decor.length) { list.appendChild(_gsvEl('div', 'gsv-gift-h', 'Decorations')); for (const it of g.decor.slice(0, 40)) add('decor', it); }
    if (g.fish.length) { list.appendChild(_gsvEl('div', 'gsv-gift-h', 'Fish')); for (const it of g.fish.slice(0, 40)) add('fish', it); }
    if (g.bug.length) { list.appendChild(_gsvEl('div', 'gsv-gift-h', 'Bugs')); for (const it of g.bug.slice(0, 40)) add('bug', it); }
    el.appendChild(list);
    el.appendChild(_gsvEl('p', 'gsv-pop-p muted gsv-small', 'It leaves your bag. A few seconds to Undo before it goes.'));
  }, { align: 'end', width: 320 });
}
function _gsvRefreshSide(f) {
  gardenSocialFriendLoad(f.id, true).catch(() => {}).finally(() => {
    if (!_gsv.root || _gsv.fid !== f.id) return;
    const c = gardenSocialFriendCached(f.id); if (!c || !c.garden) return;
    const side = _gsv.root.querySelector('.gsv-side'), bar = _gsv.root.querySelector('.gsv-toolbar');
    if (bar) bar.replaceWith(_gsvToolbar(f, c));
    const note = _gsv.root.querySelector('.gsv-water-note'); if (note) note.replaceWith(_gsvWaterNote(f, c));
    _gsvMarkCan(_gsv.root.querySelector('.gsv-stagebox > :first-child'), _gsvWaterInfo(f, c));
    if (side) { const today = side.querySelector('.gsv-todo'); if (today) today.replaceWith(_gsvToday(f, c)); const book = side.querySelector('.gsv-bookcard'); if (book && !book.contains(document.activeElement)) book.replaceWith(_gsvBook(f, c)); }
    const v = _gsv.root.querySelector('.gsv-visited'); if (v) v.hidden = !(c.used && c.used.visit);
  });
}

/* you at the gate (in your outfit), and them when they are around */
function _gsvPeople(over, f, snap) {
  if (!over || !over.isConnected) return;
  over.textContent = '';
  const me = typeof friendsSceneFigureEl === 'function' ? friendsSceneFigureEl('me', 64) : null;
  const gate = _gsvAt(10, 9.4);
  if (me) {
    const w = _gsvEl('div', 'gsv-fig is-me');
    w.appendChild(me);
    w.appendChild(_gsvEl('span', 'gsv-tag', 'You'));
    w.style.left = gate.l + '%'; w.style.top = gate.t + '%';
    over.appendChild(w);
  }
  // the gardener, when they are around and share an avatar
  const pres = window.Friends && typeof Friends.presence === 'function' ? Friends.presence(f.id) : 'offline';
  if (['online', 'focusing', 'travelling'].includes(pres) && typeof friendsSceneFigureEl === 'function') {
    const host = friendsSceneFigureEl(f, 64, { pet: false });   // integrate 2.18: their pet is already out in their garden
    if (host) {
      const oak = snap.plants.find(r => r[0] === 'heart-oak');
      const at = oak ? _gsvAt(oak[1] + 1.4, oak[2] + 0.6) : _gsvAt(13, 8.6);
      const w = _gsvEl('div', 'gsv-fig is-host');
      w.appendChild(host);
      w.appendChild(_gsvEl('span', 'gsv-tag', _gscFirst(f.id)));
      w.style.left = at.l + '%'; w.style.top = at.t + '%';
      if (_gscFun() !== 'off' && !_gscReduced()) w.appendChild(_gsvEl('span', 'gsv-wave', '👋'));
      over.appendChild(w);
    }
  }
  // your pet comes along (agent pets draws it in the garden through petGardenSprite): a word for it
  try {
    // integrate 2.18: your pet walks at your side (friendsSceneFigureEl adds it through petFigureCompanion); a word when it does
    const came = !!(me && me.querySelector('.pt-comp'));
    if (came) { const s = _gsv.root && _gsv.root.querySelector('.gsv-petnote'); if (!s) { const side = _gsv.root && _gsv.root.querySelector('.gsv-todo'); if (side) side.appendChild(_gsvEl('p', 'muted gsv-small gsv-petnote', `${typeof petName === 'function' ? petName() : 'Your pet'} came along for the visit.`)); } }
  } catch (e) { /* pets are a bonus */ }
}
function _gsvWalk(over, l, t) {
  const me = over && over.querySelector('.gsv-fig.is-me');
  if (!me) return;
  me.classList.toggle('is-flip', l < parseFloat(me.style.left || '50'));
  me.classList.add('is-walking');
  me.style.left = Math.max(2, Math.min(98, l)) + '%'; me.style.top = Math.max(35, Math.min(99, t)) + '%';
  clearTimeout(me._gsvT); me._gsvT = setTimeout(() => me.classList.remove('is-walking'), _gscReduced() ? 0 : 1300);
}
/** A little effect over the garden: water drops, a heart, an emoji. Nothing under reduced motion or with the Fun level Off. */
function _gsvFx(over, kind, at, emoji) {
  if (!over || _gscReduced() || _gscFun() === 'off') return;
  const fx = _gsvEl('div', 'gsv-fx is-' + kind);
  fx.style.left = at.l + '%'; fx.style.top = at.t + '%';
  if (kind === 'water') {
    fx.innerHTML = '<svg viewBox="-30 -60 60 64" width="56" height="60">' + [[-10, -46, 0], [2, -52, 1], [12, -44, 2], [-4, -36, 3], [8, -32, 4]].map(([x, y, i]) => `<path style="--i:${i}" d="M${x} ${y}c-3 4-4 6-4 8a4 4 0 0 0 8 0c0-2-1-4-4-8z" fill="#5fb3f0" stroke="#2f7fc0" stroke-width="0.8"/>`).join('') + '</svg>';
  } else if (kind === 'heart') {
    for (let i = 0; i < 5; i++) { const h = _gsvEl('span', 'gsv-fx-h'); h.innerHTML = '<svg viewBox="0 0 24 22" width="22" height="20"><path d="M12 21C6 16 1 12 1 7a5.5 5.5 0 0 1 11-1 5.5 5.5 0 0 1 11 1c0 5-5 9-11 14z" fill="#f0567a" stroke="#c22c56" stroke-width="1"/></svg>'; h.style.setProperty('--x', ((i - 2) * 18) + 'px'); h.style.setProperty('--d', (i * 90) + 'ms'); fx.appendChild(h); }
  } else {
    for (let i = 0; i < 3; i++) { const h = _gsvEl('span', 'gsv-fx-h gsv-fx-e', emoji || '✨'); h.style.setProperty('--x', ((i - 1) * 22) + 'px'); h.style.setProperty('--d', (i * 120) + 'ms'); fx.appendChild(h); }
  }
  over.appendChild(fx);
  setTimeout(() => fx.remove(), 1900);
}

/* the side: today here, what grows here, the guestbook */
function _gsvToday(f, c) {
  const card = _gsvEl('div', 'card gsv-card-s gsv-todo');
  card.appendChild(_gsvEl('h3', 'gd-h3', `Today in ${_gscFirst(f.id)}'s garden`));
  const ul = _gsvEl('ul', 'gsv-todo-l');
  const row = (t, label, done, xp) => {
    const li = _gsvEl('li', done ? 'is-done' : '');
    const ic = _gsvEl('span', 'gsv-todo-ic'); ic.innerHTML = icon(done ? 'circle-check' : GSOC_ACTS[t].icon, 'i-sm'); li.appendChild(ic);
    li.appendChild(_gsvEl('span', 'gsv-todo-t', label));
    if (xp) li.appendChild(_gsvEl('span', 'gsv-todo-x muted', `+${xp} XP`));
    ul.appendChild(li);
  };
  const u = c.used || {};
  row('visit', 'Drop by', !!u.visit, GSOC_XP.visit);
  row('water', 'Water a plant', !!u.water, GSOC_XP.water);
  row('like', 'Give a heart', !!u.like, GSOC_XP.like);
  row('react', 'React', !!u.react, GSOC_XP.react);
  row('gift', 'Leave a parcel', !!u.gift, GSOC_XP.gift);
  row('sign', 'Sign the guestbook', !!u.sign, GSOC_XP.sign);
  card.appendChild(ul);
  card.appendChild(_gsvEl('p', 'muted gsv-small', 'All optional: a visit is enough. Garden XP goes to your own garden.'));
  return card;
}
function _gsvGrowing(snap) {
  const card = _gsvEl('div', 'card gsv-card-s gsv-growing');
  card.appendChild(_gsvEl('h3', 'gd-h3', 'Growing here'));
  const rank = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
  const seen = new Map();
  for (const r of snap.plants) { const d = gardenPlant(r[0]); if (!d) continue; const cur = seen.get(d.id); if (!cur || r[3] > cur.stage) seen.set(d.id, { def: d, stage: r[3], variant: r[4] }); }
  const best = [...seen.values()].sort((a, b) => (rank[a.def.rarity] ?? 5) - (rank[b.def.rarity] ?? 5) || b.stage - a.stage).slice(0, 6);
  if (!best.length) card.appendChild(_gsvEl('p', 'muted gsv-small', 'Freshly dug beds: the first sprouts are on their way.'));
  else {
    const grid = _gsvEl('div', 'gsv-best');
    for (const b of best) {
      const it = _gsvEl('div', 'gsv-best-i');
      const ic = _gsvEl('span', 'gsv-best-ic'); ic.innerHTML = gardenIconSvg(b.def.id, { kind: 'plant', stage: Math.max(2, b.stage), variant: b.variant, px: 40 }); it.appendChild(ic);
      it.appendChild(_gsvEl('span', 'gsv-best-n', b.def.name));
      if (rank[b.def.rarity] <= 2) it.classList.add('is-rare');
      it.title = `${b.def.name} · ${b.def.rarity}`;
      grid.appendChild(it);
    }
    card.appendChild(grid);
  }
  const cats = {};
  for (const r of snap.plants) { const d = gardenPlant(r[0]); if (d) cats[d.cat] = (cats[d.cat] || 0) + 1; }
  const chips = _gsvEl('div', 'gsv-cats');
  for (const k of (typeof GARDEN_CAT_ORDER !== 'undefined' ? GARDEN_CAT_ORDER : Object.keys(cats))) {
    if (!cats[k]) continue;
    const cd = GARDEN_CATS[k] || {};
    const ch = _gsvEl('span', 'gsv-cat'); ch.innerHTML = icon(cd.icon || 'sprout', 'i-xs'); ch.appendChild(_gsvEl('span', null, `${cats[k]} ${cats[k] === 1 ? String(cd.one || k) : String(cd.label || k).toLowerCase()}`));
    chips.appendChild(ch);
  }
  if (chips.children.length) card.appendChild(chips);
  const areas = snap.areas.map(a => (gardenArea(a) || {}).name).filter(Boolean);
  if (areas.length) card.appendChild(_gsvEl('p', 'muted gsv-small', 'Open: ' + areas.join(', ')));
  return card;
}
function _gsvBook(f, c) {
  const card = _gsvEl('div', 'card gsv-card-s gsv-bookcard');
  card.appendChild(_gsvEl('h3', 'gd-h3', 'Guestbook'));
  const signed = !_gsvLeft(c, 'sign');
  const form = _gsvEl('div', 'gsv-book-f');
  const inp = document.createElement('input');
  inp.type = 'text'; inp.className = 'input'; inp.id = 'gsv-book-in'; inp.maxLength = GSOC_TEXT_MAX;
  inp.placeholder = signed ? 'Signed today: again tomorrow' : `A few kind words for ${_gscFirst(f.id)}`;
  inp.setAttribute('aria-label', `Sign ${gardenSocialName(f)}'s guestbook`);
  inp.disabled = signed;
  if (!signed && _gsv.drafts.has(f.id)) inp.value = _gsv.drafts.get(f.id);
  const count = _gsvEl('span', 'gsv-count muted', '');
  const go = () => { if (gardenSocialSign(f.id, inp.value, inp)) { inp.value = ''; _gsv.drafts.delete(f.id); count.textContent = ''; setTimeout(() => _gsvRefreshSide(f), 7000); } };
  inp.addEventListener('input', () => { if (inp.value) _gsv.drafts.set(f.id, inp.value); else _gsv.drafts.delete(f.id); const n = Array.from(inp.value).length; count.textContent = n > GSOC_TEXT_MAX - 30 ? `${GSOC_TEXT_MAX - n} left` : ''; });
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  form.appendChild(inp);
  form.appendChild(_gsvBtn('Sign', { icon: 'feather', kind: 'btn-primary', disabled: signed, run: go }));
  card.appendChild(form);
  card.appendChild(count);
  const mine = (c.mine || []).filter(a => a.t === 'sign').slice(0, 5);
  if (mine.length) {
    card.appendChild(_gsvEl('div', 'gsv-sub muted', 'What you wrote here'));
    const ul = _gsvEl('ul', 'gsv-notes');
    for (const a of mine) { const li = _gsvEl('li'); li.appendChild(_gsvEl('q', null, a.txt || '')); li.appendChild(_gsvEl('span', 'muted gsv-small', _gsvAgo(a.at))); ul.appendChild(li); }
    card.appendChild(ul);
  } else card.appendChild(_gsvEl('p', 'muted gsv-small', 'One line a day. Only you and they see it.'));
  return card;
}

/** A line that did not go back into the guestbook box (and the draft, should the page have been drawn again). */
function gardenSocialDraftBack(fid, text) {
  if (!_gsv.drafts.get(fid)) _gsv.drafts.set(fid, text);
  const i = document.getElementById('gsv-book-in');
  if (i && _gsv.fid === fid && !i.value && !i.disabled) i.value = text;
}

/* ---------- the gallery: friends' gardens, small (no scores, no ranking) ---------- */
/** A small drawing of a friend's garden: drawn once per change, then the same node is moved where it is needed. */
function _gsvThumb(fid, snap, crop) {
  const key = fid + '|' + _gsvSig(snap) + '|' + crop;
  const hit = _gsv.thumbs.get(key);
  if (hit) return hit;
  const box = _gsvEl('div', 'gsv-thumb is-pending');
  box.appendChild(_gsvEl('span', 'gsv-thumb-wait'));
  _gsv.thumbs.set(key, box);
  for (const k of [..._gsv.thumbs.keys()]) if (k !== key && k.startsWith(fid + '|') && k.endsWith('|' + crop)) _gsv.thumbs.delete(k);
  _gsv.thumbQ.push(() => {
    box.textContent = '';
    try { gardenRender(box, snap, { readOnly: true, size: 's', crop, still: true }); } catch (e) { box.appendChild(_gsvEl('span', 'muted gsv-small', 'Could not be drawn')); }
    box.classList.remove('is-pending');
  });
  if (!_gsv.thumbT) {
    const step = () => { const job = _gsv.thumbQ.shift(); if (job) job(); _gsv.thumbT = _gsv.thumbQ.length ? requestAnimationFrame(step) : 0; };
    _gsv.thumbT = requestAnimationFrame(step);
  }
  return box;
}
function _gsvCard(f, g, o) {
  o = o || {};
  const c = _gsvEl('div', 'card gsv-gcard' + (g ? '' : ' is-empty'));
  if (g && g.snap) {
    c.appendChild(_gsvThumb(f.id, g.snap, o.crop || 'wide'));
    c.tabIndex = 0; c.setAttribute('role', 'link'); c.setAttribute('aria-label', `Visit ${gardenSocialName(f)}'s garden`);
    c.onclick = () => setView('garden:visit:' + f.id);
    c.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); setView('garden:visit:' + f.id); } };
  }
  const b = _gsvEl('div', 'gsv-gcard-b');
  b.appendChild(_gsvAvatar(f, 28));
  const t = _gsvEl('div', 'gsv-gcard-t');
  t.appendChild(_gsvEl('b', null, gardenSocialName(f)));
  if (g) t.appendChild(_gsvEl('span', 'muted gsv-small', [`Level ${g.lv}`, _gsvLevelTitle(g.lv), `${g.n} ${g.n === 1 ? 'plant' : 'plants'}`].filter(Boolean).join(' · ')));
  else t.appendChild(_gsvEl('span', 'muted gsv-small', 'No garden shared yet'));
  b.appendChild(t);
  if (g && g.hearts) { const h = _gsvEl('span', 'gsv-hearts'); h.innerHTML = icon('heart', 'i-xs'); h.appendChild(_gsvEl('span', null, String(g.hearts))); h.title = `${g.hearts} ${g.hearts === 1 ? 'heart' : 'hearts'} from friends`; b.appendChild(h); }
  c.appendChild(b);
  if (g) {
    const foot = _gsvEl('div', 'gsv-gcard-f');
    foot.appendChild(_gsvEl('span', 'muted gsv-small', g.visited ? 'Visited today' : g.at ? 'Updated ' + _gsvAgo(g.at) : ''));
    foot.appendChild(_gsvBtn(g.visited ? 'Visit again' : 'Visit', { icon: 'footprints', kind: g.visited ? 'btn-ghost' : 'btn-primary', run: () => setView('garden:visit:' + f.id) }));
    c.appendChild(foot);
  }
  return c;
}
/** The gallery: o {max, crop, compact}. Friends sorted by their garden's last change (no scores). */
function _gsvGallery(o) {
  o = o || {};
  const d = gardenSocialView();
  const list = _gscFriendList();
  const wrap = _gsvEl('div', 'gsv-gallery-w');
  if (!d) {
    wrap.appendChild(_gsvEl('p', 'muted gsv-small', _gsc.err ? 'Friends’ gardens could not load just now.' : 'Fetching your friends’ gardens…'));
    if (_gsc.err) wrap.appendChild(_gsvBtn('Try again', { icon: 'refresh-cw', kind: 'btn-ghost', run: () => gardenSocialLoad(true).catch(() => {}) }));
    else gardenSocialLoad(false).catch(() => {});
    return wrap;
  }
  const with_ = list.filter(f => d.gardens && d.gardens[f.id]).sort((a, b) => (d.gardens[b.id].at || 0) - (d.gardens[a.id].at || 0));
  const without = list.filter(f => !(d.gardens && d.gardens[f.id]));
  if (!with_.length) {
    const e = _gsvEl('div', 'gsv-empty');
    e.innerHTML = _gsvGateSvg();
    const t = _gsvEl('div');
    t.appendChild(_gsvEl('b', null, list.length ? 'No gardens to visit yet' : 'Visit each other’s gardens'));
    t.appendChild(_gsvEl('span', 'muted', list.length ? 'When a friend’s garden arrives (it is shared unless they turn it off), it shows here for you to visit.' : 'Add a friend and you can walk round each other’s gardens, water a plant, leave a gift and sign the guestbook.'));
    e.appendChild(t);
    if (!list.length && typeof friendsAddDialog === 'function') e.appendChild(_gsvBtn('Add a friend', { icon: 'user-plus', kind: 'btn-primary', run: () => friendsAddDialog() }));
    wrap.appendChild(e);
  } else {
    const grid = _gsvEl('div', 'gsv-gallery' + (o.compact ? ' is-compact' : ''));
    for (const f of with_.slice(0, o.max || 60)) grid.appendChild(_gsvCard(f, d.gardens[f.id], o));
    wrap.appendChild(grid);
    if (o.max && with_.length > o.max) wrap.appendChild(_gsvBtn(`All ${with_.length} gardens`, { kind: 'btn-ghost', icon: 'arrow-right', run: () => setView('garden:friends') }));
  }
  if (without.length && with_.length) wrap.appendChild(_gsvEl('p', 'muted gsv-small', `Not shared yet: ${without.slice(0, 6).map(f => _gscFirst(f.id)).join(', ')}${without.length > 6 ? ` and ${without.length - 6} more` : ''}.`));
  return wrap;
}

/* ---------- the Garden page's Friends tab ---------- */
function gardenFriendsTab(body, m) {
  _gsv.tabBody = body;
  _gsvFillTab(body);
  void m;
  gardenSocialLoad(false).then(() => { if (_gsv.tabBody === body && body.isConnected) _gsvFillTab(body); }).catch(() => { if (_gsv.tabBody === body && body.isConnected) _gsvFillTab(body); });
}
function gardenFriendsTabRepaint() { const b = _gsv.tabBody; if (b && b.isConnected && !(document.activeElement && b.contains(document.activeElement) && document.activeElement.tagName === 'INPUT')) _gsvFillTab(b); }
function _gsvSec(title, ic, extra) {
  const s = _gsvEl('section', 'gsv-sec');
  const h = _gsvEl('div', 'gsv-sec-h');
  h.innerHTML = icon(ic, 'i-sm');
  h.appendChild(_gsvEl('h2', null, title));
  h.appendChild(_gsvEl('span', 'spacer'));
  if (extra) h.appendChild(extra);
  s.appendChild(h);
  return s;
}
function _gsvFillTab(body) {
  const y = (document.getElementById('main') || {}).scrollTop;
  body.textContent = '';
  const d = gardenSocialView();
  const friends = _gscFriendList();
  // visits to your garden
  const inbox = _gsvSec('Visits to your garden', 'footprints');
  if (!d) inbox.appendChild(_gsvEl('p', 'muted gsv-small', _gsc.err ? 'Could not load just now.' : 'Loading…'));
  else if (!d.inbox.length) inbox.appendChild(_gsvEl('p', 'muted gsv-small', friends.length ? 'When friends drop by, water a plant, leave a parcel or a heart, it shows up here.' : 'Add a friend to share your garden: they can visit, water and leave you little gifts.'));
  else {
    const parcels = d.inbox.filter(a => a.t === 'gift' && !a.applied && !(state.garden && state.garden.led && state.garden.led['gg.' + a.id]));
    if (parcels.length) {
      const row = _gsvEl('div', 'gsv-parcels');
      for (const a of parcels.slice(0, 12)) row.appendChild(_gsvParcel(a));
      inbox.appendChild(row);
    }
    const ul = _gsvEl('ul', 'gsv-inbox');
    for (const a of d.inbox.slice(0, 30)) {
      const f = _gscFriend(a.f) || { id: a.f, name: 'A friend' };
      const li = _gsvEl('li', 'gsv-inbox-i' + (a.at > (d.prefs.seenAt || 0) ? ' is-new' : ''));
      li.appendChild(_gsvAvatar(f, 28));
      const tx = _gsvEl('div', 'gsv-inbox-t');
      tx.appendChild(_gsvEl('span', null, _gscDescribeAct({ id: a.id, dir: 'in', b: a }, f).text));
      const meta = _gsvEl('span', 'muted gsv-small', _gsvAgo(a.at));
      if (a.t === 'water') { const how = gardenSocialBoosted(a.id); if (how === 'boost') meta.textContent += ` · +${GSOC_BOOST.hours} h of growth`; }
      tx.appendChild(meta);
      li.appendChild(tx);
      if (_GSC_FID_RE.test(a.f)) li.appendChild(_gsvBtn('', { icon: 'footprints', kind: 'btn-ghost', aria: `Visit ${gardenSocialName(f)}'s garden`, tip: 'Visit back', run: () => setView('garden:visit:' + a.f) }));
      ul.appendChild(li);
    }
    inbox.appendChild(ul);
  }
  body.appendChild(inbox);
  // your guestbook
  const book = _gsvSec('Your guestbook', 'feather');
  if (d && d.book.length) {
    const ul = _gsvEl('ul', 'gsv-book');
    for (const a of d.book.slice(0, 60)) {
      if (a.hid) continue;
      const f = _gscFriend(a.f) || { id: a.f, name: 'A friend' };
      const li = _gsvEl('li', 'gsv-book-i');
      li.appendChild(_gsvAvatar(f, 30));
      const tx = _gsvEl('div', 'gsv-book-t');
      tx.appendChild(_gsvEl('q', null, a.txt || ''));
      tx.appendChild(_gsvEl('span', 'muted gsv-small', `${gardenSocialName(f)} · ${_gsvAgo(a.at)}`));
      li.appendChild(tx);
      li.appendChild(_gsvBtn('', { icon: 'eye-off', kind: 'btn-ghost', aria: 'Hide this line', tip: 'Hide this line (Undo brings it back)', run: () => _gsvHide(a.id) }));
      ul.appendChild(li);
    }
    book.appendChild(ul);
    const hidden = d.book.filter(a => a.hid).length;
    if (hidden) book.appendChild(_gsvEl('p', 'muted gsv-small', `${hidden} hidden ${hidden === 1 ? 'line' : 'lines'}.`));
  } else book.appendChild(_gsvEl('p', 'muted gsv-small', 'No signatures yet. Friends who visit can leave you a line here.'));
  body.appendChild(book);
  // friends' gardens
  const gal = _gsvSec("Friends' gardens", 'sprout');
  gal.appendChild(_gsvGallery({ crop: 'wide' }));
  body.appendChild(gal);
  // who sees yours
  if (friends.length) body.appendChild(_gsvSharing(friends, d));
  const mm = document.getElementById('main'); if (mm && y != null) mm.scrollTop = y;
  // the tab's count clears once you have seen what is new
  if (d && d.unseen) { clearTimeout(_gsv.seenT); _gsv.seenT = setTimeout(() => { if (/^garden:friends$/.test(String(state.view || ''))) _gscApi('/api/garden-social/prefs', { seen: true }).then(() => gardenSocialLoad(true)).catch(() => {}); }, 2500); }
}
function _gsvParcel(a) {
  const f = _gscFriend(a.f) || { id: a.f, name: 'A friend' };
  const b = _gsvEl('button', 'gsv-parcel'); b.type = 'button';
  const col = _GSV_WRAPS[gardenHash(a.id) % _GSV_WRAPS.length];
  const art = _gsvEl('span', 'gsv-parcel-art');
  art.innerHTML = `<svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true"><ellipse cx="24" cy="44" rx="17" ry="3" fill="#000000" fill-opacity="0.12"/><rect x="8" y="18" width="32" height="24" rx="3" fill="${col}"/><rect x="6" y="12" width="36" height="9" rx="2.5" fill="${col}" stroke="#ffffff" stroke-opacity="0.35"/><rect x="21" y="12" width="6" height="30" fill="#fff4c8"/><path d="M24 12c-3-6-11-7-11-2s8 3 11 2zM24 12c3-6 11-7 11-2s-8 3-11 2z" fill="#fff4c8" stroke="#e8c96a" stroke-width="1"/><path d="M12 24h8M28 30h8" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2" stroke-linecap="round"/></svg>`;
  b.appendChild(art);
  b.appendChild(_gsvEl('span', 'gsv-parcel-t', `From ${_gscFirst(f.id)}`));
  b.appendChild(_gsvEl('span', 'gsv-parcel-u', 'Unwrap'));
  b.setAttribute('aria-label', `Unwrap the parcel from ${gardenSocialName(f)}`);
  b.onclick = () => {
    if (!_gscReduced() && _gscFun() !== 'off') { b.classList.add('is-opening'); setTimeout(() => gardenSocialUnwrap(a.id), 420); }
    else gardenSocialUnwrap(a.id);
  };
  return b;
}
async function _gsvHide(id) {
  try {
    await _gscApi('/api/garden-social/hide', { id, hidden: true });
    await gardenSocialLoad(true);
    toast('Hidden from your guestbook', { icon: 'eye-off', action: { label: 'Undo', run: () => _gscApi('/api/garden-social/hide', { id, hidden: false }).then(() => gardenSocialLoad(true)).catch((e) => toast(e.message, { kind: 'err' })) } });
  } catch (e) { toast(e && e.message ? e.message : 'That did not go through.', { kind: 'err', retry: () => _gsvHide(id) }); }
}
function _gsvSwitch(label, on, run, hint) {
  const row = _gsvEl('label', 'gsv-switch');
  const c = document.createElement('input'); c.type = 'checkbox'; c.checked = !!on;
  c.onchange = () => run(c.checked, c);
  row.appendChild(c);
  const t = _gsvEl('span', 'gsv-switch-t');
  t.appendChild(_gsvEl('span', null, label));
  if (hint) t.appendChild(_gsvEl('span', 'muted gsv-small', hint));
  row.appendChild(t);
  return row;
}
function _gsvSharing(friends, d) {
  const sec = _gsvSec('Who sees your garden', 'eye');
  sec.appendChild(_gsvEl('p', 'muted gsv-small', 'Friends see your plants and decorations, where they grow and how far along they are: never your tasks or anything you wrote. Each friend can be turned off here or in their privacy choices.'));
  const grid = _gsvEl('div', 'gsv-share');
  for (const f of friends) {
    const row = _gsvEl('div', 'gsv-share-i');
    row.appendChild(_gsvAvatar(f, 24));
    row.appendChild(_gsvSwitch(gardenSocialName(f), gardenSocialShares(f.id), (on) => gardenSocialSetShare(f.id, on)));
    grid.appendChild(row);
  }
  sec.appendChild(grid);
  const prefs = (d && d.prefs) || { book: true, gifts: true };
  const setPref = (k) => (on, c) => _gscApi('/api/garden-social/prefs', { [k]: on }).then(() => gardenSocialLoad(true)).catch((e) => { c.checked = !on; toast(e && e.message ? e.message : 'Not saved just now.', { kind: 'err', retry: () => setPref(k)(on, c) }); });
  sec.appendChild(_gsvSwitch('Friends can sign my guestbook', prefs.book !== false, setPref('book'), 'One line a day each, plain text'));
  sec.appendChild(_gsvSwitch('Friends can leave me parcels', prefs.gifts !== false, setPref('gifts'), 'Seeds and decorations from their bags'));
  return sec;
}

/* ---------- Friends: the hangout's 'Gardens' panel and a friend's 'Garden' panel ---------- */
function _gsvRegisterPanels(F) {
  if (!F || typeof F.registerPanel !== 'function') return;
  F.registerPanel({
    id: 'garden-gallery', where: 'hangout', tab: 'shared', order: 35, title: 'Gardens', icon: 'sprout',
    render(sec) {
      if (!_gscFriendList().length) return false;
      sec.classList.add('gsv-panel');
      sec.appendChild(_gsvGallery({ max: 6, crop: 'wide', compact: true }));
      const more = _gsvBtn('Your guestbook and visits', { icon: 'feather', kind: 'btn-ghost', run: () => setView('garden:friends') });
      const n = gardenSocialBadge();
      if (n) more.appendChild(_gsvEl('span', 'gd-tabn', String(n)));
      sec.appendChild(more);
      return true;
    },
  });
  F.registerPanel({
    id: 'garden-friend', where: 'friend', order: 25, title: 'Garden', icon: 'sprout',
    render(sec, f) {
      if (!f || !f.id) return false;
      sec.classList.add('gsv-panel');
      const d = gardenSocialView();
      const g = d && d.gardens ? d.gardens[f.id] : undefined;
      if (!d) { sec.appendChild(_gsvEl('p', 'muted gsv-small', 'Fetching their garden…')); gardenSocialLoad(false).catch(() => {}); }
      else if (g && g.snap) {
        const card = _gsvEl('div', 'gsv-fpanel');
        const th = _gsvThumb(f.id, g.snap, 'bed');
        th.classList.add('is-link'); th.tabIndex = 0; th.setAttribute('role', 'link'); th.setAttribute('aria-label', `Visit ${gardenSocialName(f)}'s garden`);
        th.onclick = () => setView('garden:visit:' + f.id);
        th.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); setView('garden:visit:' + f.id); } };
        card.appendChild(th);
        const t = _gsvEl('div', 'gsv-fpanel-t');
        t.appendChild(_gsvEl('b', null, `Level ${g.lv}${_gsvLevelTitle(g.lv) ? ' · ' + _gsvLevelTitle(g.lv) : ''}`));
        t.appendChild(_gsvEl('span', 'muted gsv-small', `${g.n} ${g.n === 1 ? 'plant' : 'plants'}${g.hearts ? ` · ${g.hearts} ${g.hearts === 1 ? 'heart' : 'hearts'}` : ''}${g.at ? ' · updated ' + _gsvAgo(g.at) : ''}`));
        t.appendChild(_gsvBtn(g.visited ? 'Visit again' : `Visit ${_gscFirst(f.id)}'s garden`, { icon: 'footprints', kind: 'btn-primary', run: () => setView('garden:visit:' + f.id) }));
        card.appendChild(t);
        sec.appendChild(card);
      } else sec.appendChild(_gsvEl('p', 'muted gsv-small', `${_gscFirst(f.id)} hasn't shared a garden with you yet.`));
      sec.appendChild(_gsvSwitch(`${_gscFirst(f.id)} can see your garden`, gardenSocialShares(f.id), (on) => gardenSocialSetShare(f.id, on)));
      return true;
    },
  });
}

/* ---------- repaint after new data ---------- */
function _gsvRepaint() {
  const d = gardenSocialView();
  const changed = d !== _gsv.lastData;
  _gsv.lastData = d;
  if (_gsv.root && _gsv.root.isConnected && _gsv.fid) {
    const c = _gsc.friends.get(_gsv.fid);
    if (c && !c.at) gardenSocialFriendLoad(_gsv.fid, true).then(() => { if (_gsv.root) _gsvPaint(); }).catch(() => {});
  }
  if (changed) {
    gardenFriendsTabRepaint();
    // the Friends tab's panels (the hangout, a friend's page) and the garden tab's count
    if (/^friends(:|$)/.test(String(state.view || '')) && typeof friendsPageRefresh === 'function') { try { friendsPageRefresh(); } catch (e) { /* the Friends page repaints itself later */ } }
    if (typeof _gdp !== 'undefined' && _gdp.root && _gdp.root.isConnected) {
      const b = _gdp.root.querySelector('.gd-tabbtn[data-tab="friends"]');
      if (b) { const n = gardenSocialBadge(); let s = b.querySelector('.gd-tabn'); if (!n && s) s.remove(); else if (n) { if (!s) b.appendChild(s = _gsvEl('span', 'gd-tabn')); s.textContent = String(n); } }
    }
  }
}
