/* ============================================================
   FRIENDS IN YOUR SCENES (2.17, agent 'scenes'): POSTCARDS.
   "Send a scene card" from a scene's menu: a scene from the app's own list, its time of day, season and weather,
   a caption (140 characters at most) and your figure's outfit go to a friend as the friends kind 'postcard'
   (lib/friends/postcards.mjs: the strict schema, loaded by server/routes/postcards.mjs). ONLY IDS AND PLAIN TEXT
   CROSS THE WIRE: the friend's OpenDash looks the scene up in ITS OWN list and draws it with its own scene engine
   (a scene it does not have is a plain card that says so); the caption is drawn with textContent; the outfit is
   mapped through the avatar kit's tables. Nothing a friend sends is ever loaded, run or handed to Claude.

   WHERE
     the scene's menu      right-click (or long-press, or the Menu key / Shift+F10 on a focused scene card) any scene
                           big enough to see, or its ⋯ button that shows on hover: Send a postcard…, Friends walk by
                           now (when one is around), and the "Friends can walk through your scenes" switch
     the gallery           a "Send a scene card" button on the Animations gallery's stage (friendsPostcardButton)
     the palette           'Send a scene card to a friend'
     the Friends feed      a scene-card under its line, both ways (the describer's `el`: 96-friends-1ui.js shows
                           it); the sender posts with friendsFeedPost({kind: 'postcard', to, body}) so the line is
                           the sender's too
     a friend's page       the Scene cards album (Friends.registerPanel({where: 'friend'})): every scene card between you
     arriving              a toast: "Sam sent you a scene card from Fleet Pond" with Open
   Sending is never a confirm: the postcard goes after a few seconds with Undo in the toast; a slow send shows Cancel;
   a failure says why in one line with Try again; a friend who is offline gets it when they are back (said calmly).

   PUBLIC API
     friendsPostcardCompose({ref, to, tod, season, wx})   the composer (ref: 'pack/item' of a full scene; to: a friend id)
     friendsPostcardEl(body, o)          a postcard card element (o: {key, from: friend view, mine, toNames, hover}), or null
     friendsPostcardButton(item)         the gallery stage's button, or null (not a full scene, no friends yet)
     friendsSceneMenu(anchor, host)      the scene's menu for a scene host element (.anim-scene[data-anim])
   Private names: _fpc*.
   ============================================================ */
const _fpc = { n: 0, cards: new Map(), album: new Map(), io: null, pending: new Set(), btn: null, btnHost: null, btnT: 0 };
const FPC_TODS = Object.freeze([['dawn', 'Dawn'], ['day', 'Day'], ['dusk', 'Dusk'], ['night', 'Night']]);
const FPC_SEASONS = Object.freeze([['spring', 'Spring'], ['summer', 'Summer'], ['autumn', 'Autumn'], ['winter', 'Winter']]);
/** The scene engine's weather kinds (SCENE_WEATHER_KINDS; lib/friends/postcards.mjs POSTCARD_WEATHER keeps the same list). */
const FPC_WEATHER = Object.freeze([['clear', 'Clear'], ['partly', 'Sunny spells'], ['cloudy', 'Cloudy'], ['drizzle', 'Drizzle'], ['showers', 'Showers'], ['rain', 'Rain'],
  ['thunder', 'Thunder'], ['mist', 'Mist'], ['fog', 'Fog'], ['frost', 'Frost'], ['sleet', 'Sleet'], ['snow', 'Snow']]);
const FPC_CAPTION_MAX = 140;
const _FPC_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const _fpcLabel = (list, id) => { const x = list.find(r => r[0] === id); return x ? x[1] : ''; };

/* ---------- the body: what crosses the wire, checked again on this side ---------- */
/** A full scene of this app's list for a ref ('pack/item'), or null. */
function _fpcItem(ref) {
  if (typeof ref !== 'string' || typeof animItem !== 'function') return null;
  const i = ref.indexOf('/');
  if (i < 1 || !_FPC_ID_RE.test(ref.slice(0, i)) || !_FPC_ID_RE.test(ref.slice(i + 1))) return null;
  let it = null;
  try { it = animItem(ref); } catch (e) { it = null; }
  return it && it.full && typeof it.ref === 'string' && it.ref.indexOf('/') > 0 && _FPC_ID_RE.test(it.ref.slice(0, it.ref.indexOf('/'))) && _FPC_ID_RE.test(it.ref.slice(it.ref.indexOf('/') + 1)) ? it : null;
}
/** One line of plain text within n UTF-16 units (the friends core's cap), never cutting a character in two. */
function _fpcText(s, n) {
  let t = typeof profileText === 'function' ? profileText(s, n) : String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/g, ' ').replace(/\s+/g, ' ').trim();
  if (t.length > n) { const cp = Array.from(t); while (cp.length && cp.join('').length > n) cp.pop(); t = cp.join('').trim(); }
  return t;
}
/** A postcard body cleaned (from a friend, from the feed, or the composer's): only the allow-listed fields and values, or null. */
function _fpcClean(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return null;
  const pack = typeof b.pack === 'string' && _FPC_ID_RE.test(b.pack) ? b.pack : null, item = typeof b.item === 'string' && _FPC_ID_RE.test(b.item) ? b.item : null;
  if (!pack || !item) return null;
  const out = { pack, item, tod: FPC_TODS.some(r => r[0] === b.tod) ? b.tod : 'day', season: FPC_SEASONS.some(r => r[0] === b.season) ? b.season : 'summer' };
  if (FPC_WEATHER.some(r => r[0] === b.wx)) out.wx = b.wx;
  const cap = _fpcText(b.caption, FPC_CAPTION_MAX);
  if (cap) out.caption = cap;
  if (b.outfit && typeof b.outfit === 'object' && !Array.isArray(b.outfit)) {
    const o = {};
    for (const k of FSC_OUTFIT_PARTS) if (Object.prototype.hasOwnProperty.call(b.outfit, k) && typeof b.outfit[k] === 'string' && _FPC_ID_RE.test(b.outfit[k])) o[k] = b.outfit[k];
    if (Object.keys(o).length) out.outfit = o;
  }
  if (Number.isInteger(b.at) && b.at > 0 && b.at < 1e14) out.at = b.at;
  return out;
}

/* ---------- now: the time of day, season and weather you are looking at ---------- */
function _fpcWhere() {
  let lat = NaN, lon = NaN;
  try { const c = typeof animCtx === 'function' ? animCtx() : null; if (c) { lat = Number.isFinite(c.ukLat) ? c.ukLat : c.lat; lon = Number.isFinite(c.ukLon) ? c.ukLon : c.lon; } } catch (e) { /* none */ }
  return { lat, lon };
}
function _fpcNowTod() {
  const w = _fpcWhere();
  try {
    if (typeof almSceneLight === 'function' && Number.isFinite(w.lat)) {
      const sky = almSceneLight(Clock.now(), w.lat, w.lon, Clock.zone());
      if (sky && FPC_TODS.some(r => r[0] === sky.tod)) return sky.tod;
    }
  } catch (e) { /* the hour */ }
  let h = 12;
  try { h = Clock.parts(Clock.now()).h; } catch (e) { h = new Date().getHours(); }   // clock-ok: fallback only
  return h < 5 || h >= 21 ? 'night' : h < 8 ? 'dawn' : h >= 18 ? 'dusk' : 'day';
}
function _fpcNowSeason(host) {
  try { const rec = host && typeof _schHosts !== 'undefined' ? _schHosts.get(host) : null, C = rec && rec.r ? rec.r.compiled : null; if (C && FPC_SEASONS.some(r => r[0] === C.season)) return C.season; } catch (e) { /* the month */ }
  const m = Number(String(_fscToday()).slice(5, 7)) || 6, south = _fpcWhere().lat < 0;
  const s = m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
  return south ? { spring: 'autumn', summer: 'winter', autumn: 'spring', winter: 'summer' }[s] : s;
}
function _fpcNowWx() {
  try { const w = typeof _bf !== 'undefined' && _bf.weather && _bf.weather.ok && _bf.weather.current ? _bf.weather.current.cond : ''; if (FPC_WEATHER.some(r => r[0] === w)) return w; } catch (e) { /* clear */ }
  return 'clear';
}

/* ---------- the card: the scene drawn here, by this OpenDash, from the ids ---------- */
function _fpcIO() {
  if (_fpc.io || typeof IntersectionObserver !== 'function') return _fpc.io;
  _fpc.io = new IntersectionObserver((es) => {
    for (const e of es) {
      if (!e.isIntersecting) continue;
      _fpc.io.unobserve(e.target);
      const f = e.target._fpcMount;
      e.target._fpcMount = null;
      if (typeof f === 'function') f();
    }
  }, { rootMargin: '240px' });
  return _fpc.io;
}
/** The scene host for a postcard (animItemHtml at the postcard's moment, season and weather): an element, or null. */
function _fpcArtEl(it, b, o) {
  if (typeof animItemHtml !== 'function') return null;
  let opts = { size: 'fill', live: false, hover: !!(o && o.hover) && _fscMotionOk() };
  try { if (typeof animGalleryPreviewOptions === 'function') opts = Object.assign(opts, animGalleryPreviewOptions(it, b.tod)); } catch (e) { /* the scene's own moment */ }
  opts.season = b.season;
  const t = document.createElement('template');
  t.innerHTML = animItemHtml(it, opts);   // the app's own scene markup for its own item (71-anim-registry.js), no friend text in it
  const host = t.content.firstElementChild;
  if (host && b.wx && it.composed) host.setAttribute('data-sc-wx', b.wx);   // an allow-listed weather kind
  return host;
}
function friendsPostcardEl(b0, o) {
  try {
    o = o || {};
    const b = _fpcClean(b0);
    if (!b) return null;
    const it = _fpcItem(b.pack + '/' + b.item);
    const card = _fscEl('figure', 'fpc' + (o.compact ? ' is-compact' : ''));
    const art = _fscEl('div', 'fpc-art');
    art.setAttribute('data-scene-key', 'pc-' + String(o.key || ('n' + (++_fpc.n))).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64));
    const moment = [_fpcLabel(FPC_TODS, b.tod), _fpcLabel(FPC_SEASONS, b.season).toLowerCase(), b.wx ? _fpcLabel(FPC_WEATHER, b.wx).toLowerCase() : ''].filter(Boolean).join(', ');
    if (it) {
      art.setAttribute('role', 'img');
      art.setAttribute('aria-label', `${it.label}: ${moment}`);
      const mount = () => { try { const h = _fpcArtEl(it, b, o); if (h) art.appendChild(h); } catch (e) { console.error('[postcards] scene', e); } };
      const io = o.eager ? null : _fpcIO();
      if (io) { art._fpcMount = mount; io.observe(art); } else mount();
    } else {
      art.classList.add('is-missing');
      const m = _fscEl('div', 'fpc-missing');
      m.innerHTML = icon('image', 'i-lg');
      m.appendChild(_fscEl('span', null, "This scene isn't in your OpenDash yet. Update OpenDash to see it."));
      art.appendChild(m);
    }
    const back = _fscEl('figcaption', 'fpc-back');
    const words = _fscEl('div', 'fpc-words');
    words.appendChild(_fscEl('p', 'fpc-msg' + (b.caption ? '' : ' is-empty'), b.caption || (o.mine ? 'No message, just the view' : 'Wish you were here')));
    const who = o.mine ? (o.toNames ? 'To ' + o.toNames : 'From you') : 'From ' + (o.from ? _fscName(o.from) : 'a friend');
    words.appendChild(_fscEl('span', 'fpc-meta', [who, it ? it.label : 'A scene', moment].join(' · ')));
    back.appendChild(words);
    const stamp = _fscEl('span', 'fpc-stamp');
    const fig = b.outfit ? friendsSceneFigureEl({ nick: o.mine ? 'You' : (o.from ? _fscName(o.from) : 'Your friend'), profile: { avatar: b.outfit } }, 46) : null;
    if (fig) stamp.appendChild(fig); else stamp.innerHTML = icon('mail', 'i-md');
    back.appendChild(stamp);
    card.append(art, back);
    return card;
  } catch (e) { console.error('[postcards] card', e); return null; }
}

/* ---------- the Friends feed: a card under the postcard's line (both ways) ---------- */
function _fpcNames(ids) {
  const F = window.Friends, names = (ids || []).map(id => (F && F.get ? F.get(id) : null)).filter(Boolean).map(f => _fscName(f));
  if (!names.length) return '';
  return names.length <= 2 ? names.join(' and ') : `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
}
/** The card of a feed entry, kept per place (where: 'f' the feed, 'a' the album: one element can only be in one of them). */
function _fpcFeedCard(e, f, where) {
  const key = (where || 'f') + '-' + String(e.id || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60);
  let el = e.id ? _fpc.cards.get(key) : null;
  if (!el) {
    const mine = e.dir === 'out' || e.dir === 'local';
    el = friendsPostcardEl(e.b, { key, from: mine ? null : f, mine, toNames: mine ? _fpcNames(Array.isArray(e.to) ? e.to : e.f ? [e.f] : []) : '', hover: true, compact: true });
    if (el && e.id) { _fpc.cards.set(key, el); if (_fpc.cards.size > 80) _fpc.cards.delete(_fpc.cards.keys().next().value); }
  }
  return el;
}
function _fpcDescribe(e, f) {
  const b = _fpcClean(e && e.b), it = b ? _fpcItem(b.pack + '/' + b.item) : null, where = it ? it.label : 'a scene';
  const mine = e.dir === 'out' || e.dir === 'local';
  const text = mine ? `You sent ${_fpcNames(Array.isArray(e.to) ? e.to : e.f ? [e.f] : []) || 'a friend'} a scene card from ${where}` : `${f ? _fscName(f) : 'A friend'} sent you a scene card from ${where}`;
  return { icon: 'mail', text, tone: 'warm', el: b ? _fpcFeedCard(e, f, 'f') : null };
}

/* ---------- a friend's page: the Postcards album ---------- */
function _fpcAlbum(sec, f) {
  const id = f && f.id;
  if (!id || !_FPC_ID_RE.test(id)) return false;
  const name = _fscName(f);
  const top = _fscEl('div', 'fpc-album-top');
  top.appendChild(_fscEl('span', 'muted fpc-small', 'Scenes you have sent each other, drawn by your own OpenDash.'));
  const send = _fscEl('button', 'btn btn-secondary btn-sm');
  send.type = 'button';
  send.innerHTML = icon('mail', 'i-sm');
  send.appendChild(_fscEl('span', null, `Send ${name} a scene card`));
  send.onclick = () => friendsPostcardCompose({ to: id });
  top.appendChild(send);
  sec.appendChild(top);
  const box = _fscEl('div', 'fpc-album');
  sec.appendChild(box);
  const st = _fpc.album.get(id) || { n: 12 };
  _fpc.album.set(id, st);
  const paint = (entries) => {
    box.textContent = '';
    if (!entries.length) {
      const em = _fscEl('div', 'fpc-empty');
      em.innerHTML = icon('mail', 'i-lg');
      em.appendChild(_fscEl('span', null, `No scene cards yet. Send ${name} one from any scene: right-click it, or use the ⋯ button on it, then Send a scene card.`));
      box.appendChild(em);
      return;
    }
    const grid = _fscEl('div', 'fpc-grid');
    for (const e of entries.slice(0, st.n)) { const c = _fpcFeedCard(e, f, 'a'); if (c) grid.appendChild(c); }
    box.appendChild(grid);
    if (entries.length > st.n) {
      const more = _fscEl('button', 'btn btn-ghost btn-sm fpc-more', 'Show more');
      more.type = 'button';
      more.onclick = () => { st.n += 12; paint(entries); };
      box.appendChild(more);
    }
  };
  const load = () => {
    const F = window.Friends;
    if (!F || typeof F.feed !== 'function') return;
    st.busy = true;
    F.feed({ friend: id, kind: 'postcard', limit: 48 }).then((entries) => {
      st.entries = (entries || []).filter(e => e && e.k === 'postcard'); st.at = Date.now(); st.err = null;   // clock-ok: a cache age
      if (box.isConnected) paint(st.entries);
    }).catch((e) => {
      st.err = e;
      if (!box.isConnected || st.entries) return;
      box.textContent = '';
      const er = _fscEl('div', 'fpc-empty is-err');
      er.appendChild(_fscEl('span', null, `Couldn’t load scene cards: ${typeof netErrorReason === 'function' ? netErrorReason(e) : 'try again'}.`));
      const again = _fscEl('button', 'btn btn-ghost btn-sm', 'Try again');
      again.type = 'button';
      again.onclick = () => { box.textContent = ''; box.appendChild(_fscEl('span', 'muted fpc-small', 'Loading scene cards…')); load(); };
      er.appendChild(again);
      box.appendChild(er);
    }).finally(() => { st.busy = false; });
  };
  if (st.entries) paint(st.entries); else box.appendChild(_fscEl('span', 'muted fpc-small', 'Loading scene cards…'));
  if (!st.busy && (!st.entries || Date.now() - (st.at || 0) > 8000)) load();   // clock-ok: a cache age
  return true;
}

/* ---------- the composer ---------- */
function _fpcFriends() {
  const F = window.Friends;
  let list = [];
  try { list = F && typeof F.list === 'function' ? F.list() || [] : []; } catch (e) { list = []; }
  const rank = (f) => ({ online: 0, focusing: 1, travelling: 2, away: 3 })[f.presence] ?? 4;
  return list.filter(f => f && f.status === 'friend' && _FPC_ID_RE.test(String(f.id || ''))).sort((a, b) => rank(a) - rank(b) || _fscName(a).localeCompare(_fscName(b)));
}
/** The scene the composer starts with: the ref asked for, the biggest scene playing, or today's opening. */
function _fpcStartItem(ref) {
  let it = _fpcItem(ref);
  if (it) return it;
  // the biggest scene on screen now (any kind of scene: a postcard does not need a camera)
  const seen = [];
  try { for (const h of document.querySelectorAll('.anim-scene[data-anim]')) if (_fpcHostOk(h) && !h.classList.contains('is-offscreen')) seen.push([h.clientWidth || 0, h]); } catch (e) { /* none */ }
  seen.sort((a, b) => b[0] - a[0]);
  for (const [, h] of seen) { it = _fpcItem(h.getAttribute('data-anim')); if (it) return it; }
  try { const t = typeof animToday === 'function' ? animToday('opening') : null; if (t) it = _fpcItem(t.ref); } catch (e) { it = null; }
  return it || null;
}
function _fpcSeg(label, list, value, onPick) {
  const wrap = _fscEl('div', 'fpc-seg-row');
  wrap.appendChild(_fscEl('span', 'fpc-f-l', label));
  const seg = _fscEl('div', 'fpc-seg');
  seg.setAttribute('role', 'group');
  seg.setAttribute('aria-label', label);
  for (const [id, lab] of list) {
    const b = _fscEl('button', 'fpc-seg-b', lab);
    b.type = 'button';
    b.dataset.v = id;
    b.setAttribute('aria-pressed', id === value ? 'true' : 'false');
    b.onclick = () => { for (const x of seg.children) x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); onPick(id); };
    seg.appendChild(b);
  }
  wrap.appendChild(seg);
  return wrap;
}
function friendsPostcardCompose(o) {
  o = o || {};
  if (typeof openDialog !== 'function') return;
  const it0 = _fpcStartItem(o.ref);
  if (!it0) { toast('Open a scene first: the Animations gallery, or Home’s animation of the day.', { icon: 'image', action: { label: 'Open the gallery', run: () => setView('settings:animations') } }); return; }
  const friends = _fpcFriends();
  const st = { ref: it0.ref, to: new Set(), tod: FPC_TODS.some(r => r[0] === o.tod) ? o.tod : _fpcNowTod(), season: FPC_SEASONS.some(r => r[0] === o.season) ? o.season : _fpcNowSeason(o.host),
    wx: FPC_WEATHER.some(r => r[0] === o.wx) ? o.wx : _fpcNowWx(), caption: '' };
  if (o.to && friends.some(f => f.id === o.to)) st.to.add(o.to); else if (friends.length === 1) st.to.add(friends[0].id);
  let sendBtn = null, previewBox = null, hint = null, previewT = 0;
  const bodyNow = () => {
    const i = st.ref.indexOf('/'), out = { pack: st.ref.slice(0, i), item: st.ref.slice(i + 1), tod: st.tod, season: st.season, wx: st.wx, at: Date.now() };   // clock-ok: when it was written
    const cap = _fpcText(st.caption, FPC_CAPTION_MAX);
    if (cap) out.caption = cap;
    const me = typeof profileGet === 'function' ? fscOutfitOf(profileGet().avatar) : null;
    if (me && Object.keys(me).length) out.outfit = me;
    return out;
  };
  const sync = () => {
    if (sendBtn) sendBtn.disabled = !st.to.size;
    if (hint) hint.textContent = st.to.size ? '' : friends.length ? 'Pick who it is for.' : '';
  };
  const preview = (now) => {
    clearTimeout(previewT);
    const run = () => {
      if (!previewBox || !previewBox.isConnected) return;
      // one key for every preview: the scene host takes over the last one's renderer (a new moment re-lights it, no new bake)
      const card = friendsPostcardEl(bodyNow(), { key: 'compose', mine: true, toNames: _fpcNames([...st.to]), eager: true });
      previewBox.replaceChildren(...(card ? [card] : []));
    };
    if (now) run(); else previewT = setTimeout(run, 280);
  };
  openDialog({
    title: 'Send a scene card', size: 'md', resizeKey: 'friends-postcard',
    body: (el) => {
      el.classList.add('fpc-compose');
      previewBox = _fscEl('div', 'fpc-preview');
      el.appendChild(previewBox);
      // to
      const toRow = _fscEl('div', 'fpc-to');
      toRow.appendChild(_fscEl('span', 'fpc-f-l', 'To'));
      if (!friends.length) {
        const em = _fscEl('div', 'fpc-empty');
        em.appendChild(_fscEl('span', null, 'Scene cards go to friends. Add a friend first, then send them one from any scene.'));
        if (typeof friendsAddDialog === 'function') {
          const add = _fscEl('button', 'btn btn-secondary btn-sm', 'Add a friend');
          add.type = 'button';
          add.onclick = () => friendsAddDialog();   // it takes this dialog's place
          em.appendChild(add);
        }
        toRow.appendChild(em);
      } else {
        const chips = _fscEl('div', 'fpc-chips');
        chips.setAttribute('role', 'group');
        chips.setAttribute('aria-label', 'Who it is for');
        for (const f of friends) {
          const c = _fscEl('button', 'fpc-chip');
          c.type = 'button';
          c.setAttribute('aria-pressed', st.to.has(f.id) ? 'true' : 'false');
          if (typeof friendAvatarEl === 'function') { try { c.appendChild(friendAvatarEl(f, 22)); } catch (e) { /* the name is enough */ } }
          c.appendChild(_fscEl('span', null, _fscName(f)));
          if (f.presence && f.presence !== 'offline') c.appendChild(_fscEl('span', 'fpc-chip-dot'));
          c.onclick = () => { if (st.to.has(f.id)) st.to.delete(f.id); else st.to.add(f.id); c.setAttribute('aria-pressed', st.to.has(f.id) ? 'true' : 'false'); sync(); preview(); };
          chips.appendChild(c);
        }
        toRow.appendChild(chips);
      }
      el.appendChild(toRow);
      // the caption
      const capRow = _fscEl('label', 'fpc-cap');
      capRow.appendChild(_fscEl('span', 'fpc-f-l', 'Message'));
      const inp = document.createElement('input');
      inp.className = 'control'; inp.type = 'text'; inp.maxLength = FPC_CAPTION_MAX; inp.placeholder = 'Wish you were here';
      inp.setAttribute('autofocus', '');
      const count = _fscEl('span', 'fpc-count muted num', `0 / ${FPC_CAPTION_MAX}`);
      inp.oninput = () => { st.caption = inp.value; count.textContent = `${inp.value.length} / ${FPC_CAPTION_MAX}`; preview(); };
      inp.onkeydown = (e) => { if (e.key === 'Enter' && sendBtn && !sendBtn.disabled) { e.preventDefault(); sendBtn.click(); } };
      capRow.append(inp, count);
      el.appendChild(capRow);
      // the moment: the scene's time of day, season and weather (the friend's OpenDash draws it so)
      el.appendChild(_fpcSeg('Time of day', FPC_TODS, st.tod, (v) => { st.tod = v; preview(); }));
      el.appendChild(_fpcSeg('Season', FPC_SEASONS, st.season, (v) => { st.season = v; preview(); }));
      const wxRow = _fscEl('label', 'fpc-seg-row');
      wxRow.appendChild(_fscEl('span', 'fpc-f-l', 'Weather'));
      const sel = document.createElement('select');
      sel.className = 'control fpc-wx';
      for (const [id, lab] of FPC_WEATHER) { const op = document.createElement('option'); op.value = id; op.textContent = lab; if (id === st.wx) op.selected = true; sel.appendChild(op); }
      sel.onchange = () => { st.wx = FPC_WEATHER.some(r => r[0] === sel.value) ? sel.value : 'clear'; preview(); };
      wxRow.appendChild(sel);
      el.appendChild(wxRow);
      const note = _fscEl('p', 'muted fpc-small fpc-note');
      note.textContent = 'Only the scene’s name, the weather, your message and your outfit are sent; their OpenDash draws it.';
      el.appendChild(note);
      hint = _fscEl('span', 'fpc-hint muted fpc-small');
      el.appendChild(hint);
      preview(true);
      setTimeout(() => { sendBtn = el.closest('.modal') ? el.closest('.modal').querySelector('.modal-f .btn-primary') : null; sync(); }, 0);
    },
    actions: [
      { label: 'Cancel' },
      { label: 'Send', primary: true, icon: 'send', run: () => {
        if (!st.to.size) { if (hint) hint.textContent = friends.length ? 'Pick who it is for.' : 'Add a friend first.'; return false; }
        _fpcSend(bodyNow(), [...st.to], _fpcItem(st.ref));
        return true;
      } },
    ],
  });
}

/* ---------- sending: Undo for a few seconds, then the request (Cancel while it runs), a plain answer ---------- */
function _fpcPost(event, signal, keepalive) {
  if (keepalive) {
    return fetch('/api/friends/feed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event }), keepalive: true }).then(r => r.json().catch(() => ({})));
  }
  if (typeof _frApi === 'function') return _frApi('/api/friends/feed', { event }, { signal });
  return friendsFeedPost(event);
}
function _fpcSend(body, ids, it) {
  const names = _fpcNames(ids) || 'your friend', where = it ? it.label : 'a scene';
  const event = { kind: 'postcard', to: ids, body, text: `A scene card from ${where}`.slice(0, 200), icon: 'mail' };
  let state = 'wait', undoClose = null, timer = 0;
  const go = (bg) => {
    if (state !== 'wait') return;
    state = 'sending';
    clearTimeout(timer);
    _fpc.pending.delete(go);
    if (undoClose) undoClose();
    if (bg) { _fpcPost(event, null, true).catch(() => {}); return; }
    const ac = typeof AbortController === 'function' ? new AbortController() : null;
    let busy = null, cancelled = false;
    const bt = setTimeout(() => { busy = toast(`Sending your scene card to ${names}…`, { busy: true, icon: 'mail', action: { label: 'Cancel', run: () => { cancelled = true; if (ac) ac.abort(); } } }); }, 900);
    _fpcPost(event, ac ? ac.signal : undefined).then((r) => {
      clearTimeout(bt); if (busy) busy();
      state = 'done';
      if (typeof _frReloadSoon === 'function') _frReloadSoon(100);
      _fpc.album.clear();
      const sent = Number(r && r.sent) || 0, queued = Number(r && r.queued) || 0, skipped = Number(r && r.skipped) || 0;
      if (!sent && !queued) {
        toast(`Not sent: ${names} can't get scene cards from you right now. Check what they can see on their page.`, Object.assign({ kind: 'warn', icon: 'mail' }, ids.length === 1 ? { action: { label: 'Open their page', run: () => setView('friends:' + ids[0]) } } : {}));
      } else if (!sent) {
        toast(`${names} ${ids.length === 1 ? 'is' : 'are'} offline. Your scene card waits and goes when they're back.`, { icon: 'moon' });
      } else {
        toast(skipped || queued ? `Scene card sent to ${sent} of ${ids.length}. ${queued ? 'The rest goes when they’re back.' : ''}`.trim() : `Scene card sent to ${names}`, { kind: 'ok', icon: 'mail' });
      }
    }).catch((e) => {
      clearTimeout(bt); if (busy) busy();
      state = 'wait';
      if (cancelled || (e && e.name === 'AbortError')) { state = 'done'; toast('Cancelled. The scene card was not sent.', { icon: 'x' }); return; }
      toastError('send your scene card', e, () => go(false));
    });
  };
  undoClose = toast(`Scene card to ${names} goes in a moment.`, { icon: 'mail', timeout: 5000, action: { label: 'Undo', run: () => { if (state !== 'wait') return; state = 'undone'; clearTimeout(timer); _fpc.pending.delete(go); toast('Kept back. Nothing was sent.', { icon: 'mail' }); } } });
  timer = setTimeout(() => go(false), 4000);
  _fpc.pending.add(go);
}
if (typeof window !== 'undefined') window.addEventListener('pagehide', () => { for (const go of [..._fpc.pending]) go(true); });

/* ---------- the scene's menu ---------- */
function _fpcHostOk(host) {
  if (!host || !host.isConnected || !host.matches || !host.matches('.anim-scene[data-anim]')) return false;
  if (host.closest('#od-splash, .fpc, .modal, .pop')) return false;
  if ((host.clientWidth || 0) < 200) return false;
  return !!_fpcItem(host.getAttribute('data-anim'));
}
function _fpcHostFrom(node) {
  if (!node || !node.closest) return null;
  const h = node.closest('.anim-scene[data-anim]') || (node.querySelector ? node.querySelector('.anim-scene[data-anim]') : null);
  return _fpcHostOk(h) ? h : null;
}
function friendsSceneMenu(anchor, host) {
  if (!host || typeof openMenu !== 'function') return;
  const it = _fpcItem(host.getAttribute('data-anim'));
  if (!it) return;
  const around = fscFriendsAround().length && _fscMotionOk() && typeof friendsScenesWalkBy === 'function';
  const items = [
    { heading: it.label },
    { icon: 'mail', label: 'Send a scene card…', run: () => friendsPostcardCompose({ ref: it.ref, host }) },
    { icon: 'users', label: 'A friend walks by now', hidden: !around, run: () => friendsScenesWalkBy() },
    'sep',
    { icon: 'users', label: 'Friends can walk through your scenes', checked: friendsScenesOn(), run: () => {
      const on = friendsScenesSet(!friendsScenesOn());
      toast(on ? 'Friends who are around may walk through your scenes now and then.' : 'Friends no longer walk through your scenes on this computer.', { icon: 'users' });
    } },
  ];
  let a = anchor, temp = null;
  if (!a || !a.getBoundingClientRect) {
    const p = anchor || {};
    temp = _fscEl('span', 'fpc-anchor');
    temp.style.left = Math.round(Number(p.x) || 0) + 'px';
    temp.style.top = Math.round(Number(p.y) || 0) + 'px';
    document.body.appendChild(temp);
    a = temp;
  }
  openMenu(a, items, { align: temp ? 'start' : 'end', width: 270, onClose: () => { if (temp) temp.remove(); } });
}
/** The ⋯ button over a scene under the pointer (one, fixed, moved to the hovered scene's corner). */
function _fpcBtn() {
  if (_fpc.btn) return _fpc.btn;
  const b = _fscEl('button', 'fpc-scene-btn');
  b.type = 'button';
  b.hidden = true;
  b.setAttribute('aria-label', 'Scene menu: send a postcard');
  b.setAttribute('aria-haspopup', 'menu');
  b.setAttribute('data-tip', 'Send a scene card…');
  b.innerHTML = icon('ellipsis');
  b.onclick = (e) => { e.stopPropagation(); if (_fpc.btnHost && _fpc.btnHost.isConnected) friendsSceneMenu(b, _fpc.btnHost); };
  b.addEventListener('pointerleave', (e) => { if (!(e.relatedTarget && _fpc.btnHost && _fpc.btnHost.contains(e.relatedTarget))) _fpcBtnHideSoon(); });
  b.addEventListener('pointerenter', () => clearTimeout(_fpc.btnT));
  document.body.appendChild(b);
  _fpc.btn = b;
  return b;
}
function _fpcBtnShow(host) {
  const b = _fpcBtn();
  clearTimeout(_fpc.btnT);
  const r = host.getBoundingClientRect();
  if (!r.width || r.bottom < 0 || r.top > window.innerHeight) { b.hidden = true; return; }
  _fpc.btnHost = host;
  b.style.left = Math.round(r.right - 38) + 'px';
  b.style.top = Math.round(Math.max(4, r.top + 8)) + 'px';
  b.hidden = false;
}
function _fpcBtnHideSoon() {
  clearTimeout(_fpc.btnT);
  _fpc.btnT = setTimeout(() => { if (_fpc.btn && !_fpc.btn.matches(':hover') && _fpc.btn.getAttribute('aria-expanded') !== 'true') { _fpc.btn.hidden = true; _fpc.btnHost = null; } }, 260);
}
if (typeof document !== 'undefined') {
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return;
    const host = e.target && e.target.closest ? e.target.closest('.anim-scene[data-anim]') : null;
    if (host && host !== _fpc.btnHost && _fpcHostOk(host)) _fpcBtnShow(host);
    else if (host && host === _fpc.btnHost) clearTimeout(_fpc.btnT);
  }, { passive: true });
  document.addEventListener('pointerout', (e) => {
    if (!_fpc.btnHost || !e.target || !_fpc.btnHost.contains(e.target)) return;
    const to = e.relatedTarget;
    if (to && (_fpc.btnHost.contains(to) || to === _fpc.btn || (_fpc.btn && _fpc.btn.contains(to)))) return;
    _fpcBtnHideSoon();
  }, { passive: true });
  window.addEventListener('scroll', () => { if (_fpc.btn && !_fpc.btn.hidden && _fpc.btn.getAttribute('aria-expanded') !== 'true') { _fpc.btn.hidden = true; _fpc.btnHost = null; } }, { passive: true, capture: true });
  // right-click a scene (the browser's own menu stays for text fields; a long press on touch opens it too)
  document.addEventListener('contextmenu', (e) => {
    if (e.defaultPrevented) return;
    const host = _fpcHostFrom(e.target);
    if (!host) return;
    e.preventDefault();
    friendsSceneMenu(e.clientX || e.clientY ? { x: e.clientX, y: e.clientY } : host, host);
  });
  // the Menu key or Shift+F10 on a focused scene card (Home's animation of the day is a button)
  document.addEventListener('keydown', (e) => {
    if (!(e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10'))) return;
    const el = document.activeElement;
    if (!el || el === document.body || el.closest('input, textarea, select, [contenteditable="true"]')) return;
    const host = _fpcHostFrom(el);
    if (!host) return;
    e.preventDefault();
    friendsSceneMenu(el, host);
  });
}

/* ---------- the gallery's stage: a button (78-anim-gallery.js) ---------- */
function friendsPostcardButton(it) {
  try {
    const item = it && typeof it.ref === 'string' ? _fpcItem(it.ref) : null;
    if (!item || !_fpcFriends().length) return null;
    const b = _fscEl('button', 'btn btn-secondary btn-sm');
    b.type = 'button';
    b.innerHTML = icon('mail', 'i-sm');
    b.appendChild(_fscEl('span', null, 'Send a postcard'));
    b.onclick = () => friendsPostcardCompose({ ref: item.ref });
    return b;
  } catch (e) { return null; }
}

/* ---------- wiring: the feed, the album, arrivals, the palette ---------- */
(function _fpcWire() {
  if (typeof window === 'undefined') return;
  const F = window.Friends;
  if (!F) return;
  try { F.describe('postcard', (e, f) => _fpcDescribe(e, f)); } catch (e) { console.error('[postcards] describe', e); }
  try { F.registerPanel({ id: 'postcards', where: 'friend', order: 45, title: 'Scene cards', icon: 'mail', render: (sec, f) => _fpcAlbum(sec, f) }); } catch (e) { console.error('[postcards] panel', e); }
  try {
    F.on('postcard', (m, f) => {
      if (!m || m.revoked || !f || !f.id) return;
      const b = _fpcClean(m.b), it = b ? _fpcItem(b.pack + '/' + b.item) : null;
      _fpc.album.delete(f.id);
      toast(`${_fscName(f)} sent you a scene card from ${it ? it.label : 'a scene'}`, { icon: 'mail', action: { label: 'Open', run: () => setView('friends:' + f.id) } });
    });
  } catch (e) { console.error('[postcards] arrivals', e); }
  if (typeof registerCommand === 'function') {
    registerCommand({ id: 'friends-postcard', label: 'Send a scene card to a friend', icon: 'mail', keywords: 'postcard friends scene send share view wish you were here', run: () => friendsPostcardCompose({}) });
  }
})();
