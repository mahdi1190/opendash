/* ============================================================
   PROFILE, what you see (2.17; its own Life page since 2.19.4: #view=profile, profile:avatar, profile:sharing,
   with a short link and your name left in Settings > Profile, #view=settings:me):
   your card, About you (name, pronouns, status, bio, what you are working
   on, the card colour, "reacts to your day"), the CHARACTER BUILDER (tabs
   Face / Hair / Outfit / Extras / Background, a close-up of every option,
   locks that say how to open them, Randomise, Undo and Redo, the sizes the
   avatar is seen at, and you in the scenes: your outfit on the scene figure),
   the badges you show, favourite places, and what friends see. Plus the
   palette commands. The state and the API are 97-profile-1core.js; the
   corner (your avatar on the sidebar's workspace button) is 97-profile-3corner.js.

   2.18 (agent 'you'): YOUR CARD (#pf-look, between About you and the avatar):
   a live preview of the bigger card with Surprise me, Undo / Redo (Ctrl+Z) and
   Back to the plain look, and four tabs: Banner (39 banners in five groups,
   two colour rows for patterns, a searchable list of the app's own scenes),
   Nameplate (font, weight, colour, effect: each option shows your name),
   Title (unlocked ones first, the rest say how to open them) and Extras (the
   card tint, up to six favourite emoji, a 'currently' line). Locked options
   say how to open them; the tables are 97-profile-0look.js. The Friends tab
   gets your card on the hangout and each friend's card on their page
   (Friends.registerPanel); opening a friend's card adds one to their
   visitors count, once a day (counts only; Settings > Profile can stop it).
   ============================================================ */
const _pfUI = { sec: 'card', tab: 'face', undo: [], redo: [], walk: true, preview: false, mode: null, lookTab: 'banner', lookUndo: [], lookRedo: [], sceneQ: '', sceneN: 40, curK: '', thumbs: new Map() };
const _PF_FACE_CROP = new Set(['eyes', 'eyeCol', 'brows', 'mouth', 'facial', 'marks']);
const _PF_HEAD_CROP = new Set(['hair', 'hat', 'glasses', 'headphones']);
const _PF_UNTIL = [['0', "Don't clear"], ['1h', 'In an hour'], ['4h', 'In 4 hours'], ['today', 'Tonight'], ['week', 'In a week']];

function _pfEl(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function _pfUntil(k) {
  const now = Date.now();   // clock-ok: a real time stamp
  return k === '1h' ? now + 36e5 : k === '4h' ? now + 4 * 36e5 : k === 'today' ? _pfEndOfDay() : k === 'week' ? now + 7 * 864e5 : 0;
}
function _pfDebounce(fn, ms) { let t = 0; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

/* ---------- the page ---------- */
if (typeof registerSettingsGroup === 'function') {
  registerSettingsGroup({
    id: 'me', title: 'Profile', icon: 'user-round', order: 9,
    description: 'Your name, and the way to your profile page in Life.',
    // Settings search (SIMPLIFY_PLAN.md 6): the name rows live here; "Name" in Region & language moved to "Your name"
    search: [
      { label: 'Your name', description: 'In greetings, the app title and your card', keywords: 'name display name user name greeting title card friends called' },
      { label: 'Show friends a different name', description: 'Friends see another name instead of your own', keywords: 'name for friends friends name nickname alias different name display name' },
    ],
    render(el) { _pfSettingsLink(el); },
  });
}
/** Profile's page (2.19.4): full width like Connections, in Life with the Life sidebar; its tabs are the page's sections (15-nav-life.js). */
if (typeof registerSection === 'function') {
  registerSection('profile', {
    match: v => v === 'profile' || /^profile:(avatar|sharing)$/.test(String(v || '')),
    title: () => 'Profile',
    crumb: v => { const s = _pfSecOf(v); return s === 'card' ? [] : [{ label: 'Profile', view: 'profile' }, (_PF_SECS.find(x => x[0] === s) || [0, 'Profile'])[1]]; },
    group: 'life', hashable: true, taskControls: false,
    mount(container, view) {
      const sub = document.getElementById('view-subtitle'); if (sub) sub.textContent = '';
      _pfUI.sec = _pfSecOf(view || state.view);
      _pfSettings(container);
    },
  });
}
/** Settings > Profile since 2.19.4: a link to the Profile page, and the few settings that belong here (your name). */
function _pfSettingsLink(el) {
  if (typeof profileFriendNameDecide === 'function') profileFriendNameDecide();   // before any edit: a friends name that differs from yours is kept as the different name
  const { card, body } = _settingsCard('Your profile');
  body.appendChild(_settingsRow('Card, avatar, wardrobe and sharing', 'They have their own page in Life now.',
    uiButton({ label: 'Open Profile', icon: 'arrow-right', kind: 'secondary', size: 'sm', run: () => setView('profile') })));
  const p = profileGet();
  const nm = _pfEl('input', 'control control-sm set-input'); nm.maxLength = PF_MAX.name; nm.value = p.name || profileDisplayName(p); nm.placeholder = 'Your name'; nm.setAttribute('aria-label', 'Your name');
  const save = _pfDebounce(() => { const v = profileText(nm.value, PF_MAX.name); profileSet({ name: v }); _pfNameSaved(v); }, 400);
  nm.oninput = save; nm.onblur = () => { const v = profileText(nm.value, PF_MAX.name); if (nm.value !== v) nm.value = v; };
  body.appendChild(_settingsRow('Your name', '', nm));
  body.appendChild(_pfFriendNameRow(() => {}));
  el.appendChild(card);
}
/** Profile's three pages (2.19.1): the card, the avatar with its wardrobe, and what friends see. Shows one and repaints. */
const _PF_SECS = Object.freeze([['card', 'Card', 'id-card'], ['avatar', 'Avatar and wardrobe', 'shirt'], ['sharing', 'Sharing', 'share-2']]);
/** The Profile page's view for a tab: 'profile', 'profile:avatar' or 'profile:sharing'; and the tab for a view. */
function _pfViewOf(sec) { return sec === 'avatar' || sec === 'sharing' ? 'profile:' + sec : 'profile'; }
function _pfSecOf(view) { const m = /^profile:(avatar|sharing)$/.exec(String(view || '')); return m ? m[1] : 'card'; }
function _pfShowSec(sec) {
  _pfUI.sec = _PF_SECS.some(x => x[0] === sec) ? sec : 'card';
  const v = _pfViewOf(_pfUI.sec);
  if (typeof state !== 'undefined' && state.view === v) render(); else setView(v);
}
function _pfSettings(el) {
  if (typeof profileFriendNameDecide === 'function') profileFriendNameDecide();   // before any edit: a friends name that differs from yours is kept as the different name
  const sec = _PF_SECS.some(x => x[0] === _pfUI.sec) ? _pfUI.sec : 'card';
  // the tabs are the page header's pills (a fallback inside the page if the header is not there)
  const tabsEl = subTabs({ label: 'Profile', active: sec, onChange: (id) => _pfShowSec(id), tabs: _PF_SECS.map(([id, label, ic]) => ({ id, label, icon: ic })) });
  if (!headerSubTabs(tabsEl, /^profile(:|$)/)) el.appendChild(tabsEl);
  let cardHost = null;
  const paintCard = () => { if (cardHost) cardHost.replaceChildren(profileCardEl(null, { visits: true })); };
  const changed = () => { paintCard(); };
  const zone = (...els) => (h) => { h.append(...els); };
  if (sec === 'card') {
    // your card stays in view beside the forms that change it
    cardHost = _pfEl('div', 'pf-set-card');
    paintCard();
    el.appendChild(pageLayout({ main: zone(_pfAboutCard(changed), _pfLookCard(changed)), side: zone(cardHost), sideWidth: 380, sticky: true, cls: 'pf-layout' }));   // the avatar is a tab; the look is the card beside it: no hint and no second way there
  } else if (sec === 'avatar') {
    el.appendChild(pageLayout({ main: _pfBuilderCard(changed), cls: 'pf-layout pf-wide' }));
  } else {
    el.appendChild(pageLayout({ main: zone(_pfBadgesCard(changed), _pfPlacesCard(changed)), side: _pfFriendsCard(), sideWidth: 380, cls: 'pf-layout' }));
  }
}

/* ---------- About you ---------- */
function _pfAboutCard(changed) {
  const { card, body } = _settingsCard('About you');
  const p = profileGet();
  const input = (key, max, ph, label, list, onSave) => {
    const i = _pfEl('input', 'control control-sm set-input'); i.maxLength = max; i.value = p[key] || (key === 'name' ? profileDisplayName(p) : ''); i.placeholder = ph || ''; i.setAttribute('aria-label', label);
    const save = _pfDebounce(() => { const v = profileText(i.value, max); profileSet({ [key]: v }); if (onSave) onSave(v); changed(); }, 400);
    i.oninput = save; i.onblur = () => { const v = profileText(i.value, max); if (i.value !== v) i.value = v; };
    if (list) { const dl = _pfEl('datalist'); dl.id = 'pf-dl-' + key; for (const v of list) { const o = _pfEl('option'); o.value = v; dl.appendChild(o); } i.setAttribute('list', dl.id); i._dl = dl; }
    return i;
  };
  // One name (SIMPLIFY_PLAN.md L11): greetings, the app title, your card and, unless you say otherwise, friends.
  const nm = input('name', PF_MAX.name, 'Your name', 'Your name', null, _pfNameSaved);
  body.appendChild(_settingsRow('Your name', '', nm));
  const pr = input('pronouns', PF_MAX.pronouns, 'Optional', 'Pronouns', ['she/her', 'he/him', 'they/them', 'she/they', 'he/they', 'any pronouns']);
  const prRow = _settingsRow('Pronouns', null, pr); prRow.appendChild(pr._dl);
  body.appendChild(prRow);
  body.appendChild(_pfStatusRow(changed));
  const bio = _pfEl('textarea', 'control set-textarea'); bio.maxLength = PF_MAX.bio; bio.rows = 2; bio.value = p.bio || '';
  bio.placeholder = 'A line or two about you'; bio.setAttribute('aria-label', 'Bio');
  const cnt = _pfEl('div', 'set-h pf-count');
  const count = () => { cnt.textContent = `${Array.from(bio.value).length} / ${PF_MAX.bio}`; };
  count();
  bio.oninput = _pfDebounce(() => { profileSet({ bio: profileText(bio.value, PF_MAX.bio) }); changed(); }, 400);
  bio.addEventListener('input', count);
  const bioRow = _settingsRow('Bio', null, null); bioRow.classList.add('set-row-stack'); bioRow.append(bio, cnt);
  body.appendChild(bioRow);
  let doing = [];
  try { doing = (state.custom || []).filter(t => t && t.id && statusOf(t.id) !== 'done' && (statusOf(t.id) === 'doing' || (state.pinned && state.pinned[t.id]))).slice(0, 8).map(t => profileText(effTitle(t), PF_MAX.working)).filter(Boolean); } catch (e) { doing = []; }
  const wk = input('working', PF_MAX.working, 'e.g. Chapter 4', "What you're working on", doing);
  const wkRow = _settingsRow("What I'm working on", '', wk); wkRow.appendChild(wk._dl);
  body.appendChild(wkRow);
  body.appendChild(_settingsRow('Card colour', '', _pfSwatchRow(p.theme, (v) => { profileSet({ theme: v }); changed(); }, true)));
  // More: the occasional choices (rows are built now, so Settings search finds them and opens the fold)
  setFold({ card, body }, 'profile-about-more', 'More', ({ body: more }) => {
    more.appendChild(_pfFriendNameRow(changed));
    more.appendChild(_settingsRow('Reacts to your day', 'Your avatar reacts to streaks, quests, late nights and your birthday.',
      _settingsSwitch(p.react, 'Reacts to your day', (on) => { profileSet({ react: on }); changed(); if (typeof renderMain === 'function') renderMain(); })));
  });
  return card;
}
/** Your name was saved: the app's name follows (config.userName, which greetings and the title read), and friends' too. */
function _pfNameSaved(v) {
  const name = profileText(v, PF_MAX.name);
  if (name && typeof settingsSaveConfig === 'function' && typeof userName === 'function' && name !== userName()) settingsSaveConfig({ userName: name }, false);
  profileFriendNameSync();
}
/** "Show friends a different name": a switch, and the name when it is on. Off: friends see your name above. */
function _pfFriendNameRow(changed) {
  const wrap = _pfEl('div', 'pf-fn');
  const row = _settingsRow('Show friends a different name', 'Off: friends see your name above.', wrap);
  const paint = () => {
    wrap.replaceChildren();
    const p = profileGet(), on = p.friendNameOn === true;
    wrap.appendChild(_settingsSwitch(on, 'Show friends a different name', (v) => {
      profileSet({ friendNameOn: v, friendName: v && !p.friendName ? profileDisplayName(p) : p.friendName });
      profileFriendNameSync(); changed(); paint();
    }));
    if (on) {
      const i = _pfEl('input', 'control control-sm set-input'); i.maxLength = PF_MAX.name; i.value = p.friendName || ''; i.placeholder = profileDisplayName(p); i.setAttribute('aria-label', 'The name friends see');
      i.oninput = _pfDebounce(() => { profileSet({ friendName: profileText(i.value, PF_MAX.name) }); profileFriendNameSync(); changed(); }, 400);
      wrap.appendChild(i);
    }
  };
  paint();
  return row;
}
function _pfSwatchRow(cur, onPick, withCustom) {
  const row = _pfEl('div', 'pf-sws');
  const paint = (val) => {
    row.replaceChildren();
    for (const [id, sw] of Object.entries(PF_SWATCHES)) {
      const b = _pfEl('button', 'pf-sw'); b.type = 'button'; b.style.setProperty('--sw', sw.hex);
      b.setAttribute('aria-label', sw.label); b.setAttribute('data-tip', sw.label);
      b.setAttribute('aria-pressed', val === id ? 'true' : 'false');
      b.onclick = () => { if (val !== id) { onPick(id); paint(id); } };
      row.appendChild(b);
    }
    if (withCustom) {
      const c = _pfEl('input', 'pf-sw-custom'); c.type = 'color'; c.setAttribute('aria-label', 'Your own colour'); c.setAttribute('data-tip', 'Your own colour');
      c.value = /^#[0-9a-f]{6}$/i.test(String(val)) ? val : '#5b5bd6';
      if (/^#[0-9a-f]{6}$/i.test(String(val))) c.classList.add('on');
      c.onchange = () => { const v = String(c.value).toLowerCase(); if (/^#[0-9a-f]{6}$/.test(v)) { onPick(v); paint(v); } };
      row.appendChild(c);
    }
  };
  paint(cur);
  return row;
}
function _pfStatusRow(changed) {
  const wrap = _pfEl('div', 'pf-st');
  const paint = () => {
    const st = profileGet().status, live = profileStatusNow();
    wrap.replaceChildren();
    const eb = _pfEl('button', 'btn btn-secondary btn-sm pf-st-emoji'); eb.type = 'button';
    eb.textContent = (live && live.emoji) || '🙂'; if (!(live && live.emoji)) eb.classList.add('is-empty');
    eb.setAttribute('aria-label', 'Status emoji'); eb.setAttribute('data-tip', 'Pick an emoji');
    eb.onclick = () => openPopover(eb, (el, close) => {
      const g = _pfEl('div', 'pf-emoji-grid');
      for (const e of PF_STATUS_EMOJI) { const b = _pfEl('button', 'pf-pop-emo', e); b.type = 'button'; b.onclick = () => { profileSet({ status: { emoji: e, until: live ? st.until : 0 } }); close(); paint(); changed(); }; g.appendChild(b); }
      const none = _pfEl('button', 'btn btn-ghost btn-sm', 'No emoji'); none.type = 'button'; none.onclick = () => { profileSet({ status: { emoji: '' } }); close(); paint(); changed(); };
      el.append(g, none);
    }, { className: 'pf-pop', width: 296 });
    const t = _pfEl('input', 'control control-sm pf-st-text'); t.maxLength = PF_MAX.status; t.placeholder = 'What’s happening?'; t.setAttribute('aria-label', 'Status');
    t.value = live ? live.text : '';
    t.oninput = _pfDebounce(() => { profileSet({ status: { text: profileText(t.value, PF_MAX.status), until: live ? st.until : 0 } }); changed(); }, 500);
    const until = _settingsSelect(_PF_UNTIL, '0', (k) => { profileSet({ status: { until: _pfUntil(k) } }); changed(); paint(); });
    until.setAttribute('aria-label', 'Clear the status');
    const line = _pfEl('div', 'pf-st-line'); line.append(eb, t, until);
    if (live) { const x = _pfEl('button', 'btn-icon btn-sm'); x.type = 'button'; x.innerHTML = icon('x'); x.setAttribute('aria-label', 'Clear status'); x.setAttribute('data-tip', 'Clear status'); x.onclick = () => { profileSet({ status: { emoji: '', text: '', until: 0 } }); paint(); changed(); }; line.appendChild(x); }
    const pre = _pfEl('div', 'pf-st-pre');
    for (const [e, label] of PF_STATUS_PRESETS) { const b = _pfEl('button', 'chip chip-lg', `${e} ${label}`); b.type = 'button'; b.onclick = () => { profileSet({ status: { emoji: e, text: label, until: _pfEndOfDay() } }); paint(); changed(); }; pre.appendChild(b); }
    const note = live && live.until ? _pfEl('div', 'set-h', 'Clears ' + _pfWhen(live.until) + '.') : null;
    wrap.append(line, pre); if (note) wrap.appendChild(note);
  };
  paint();
  const row = _settingsRow('Status', 'A quick line with an emoji. The presets clear tonight.', null);
  row.classList.add('set-row-stack'); row.appendChild(wrap);
  return row;
}
function _pfWhen(ms) {
  try { return 'at ' + new Date(ms).toLocaleString((APP_CONFIG && APP_CONFIG.locale) || undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: Clock.zone() }); } catch (e) { return 'later'; }
}

/* ---------- your card's look (2.18, agent 'you'): banner, nameplate, title, extras ---------- */
const _PF_LOOK_TABS = Object.freeze([['banner', 'Banner', 'image'], ['name', 'Nameplate', 'type'], ['title', 'Title', 'award'], ['extras', 'Extras', 'sparkles']]);
function _pfLookCard(changed) {
  const { card, body } = _settingsCard('Your card', 'A banner behind it, your name in your own style, a title you earned, your favourite emoji and what you are into. Friends see it too.');
  card.id = 'pf-look';
  const wrap = _pfEl('div', 'pf-l'); wrap.tabIndex = -1;
  const stage = _pfEl('div', 'pf-l-stage'), panel = _pfEl('div', 'pf-l-panel');
  wrap.append(stage, panel);
  body.appendChild(wrap);
  const cur = () => profileGet().look;
  const apply = (patch, o) => {
    const before = cur();
    const next = profileLookNormalize(Object.assign({}, before, patch, patch.np ? { np: Object.assign({}, before.np, patch.np) } : {}, patch.cur ? { cur: Object.assign({}, before.cur, patch.cur) } : {}));
    if (JSON.stringify(before) === JSON.stringify(next)) return;
    _pfUI.lookUndo.push(JSON.stringify(before)); if (_pfUI.lookUndo.length > 60) _pfUI.lookUndo.shift();
    _pfUI.lookRedo = [];
    profileSet({ look: next });
    paintStage(); if (!(o && o.keepPanel)) paintPanel(); changed();
  };
  const step = (from, to) => {
    if (!from.length) return;
    to.push(JSON.stringify(cur()));
    profileSet({ look: JSON.parse(from.pop()) });
    paintStage(); paintPanel(); changed();
  };
  const undo = () => step(_pfUI.lookUndo, _pfUI.lookRedo), redo = () => step(_pfUI.lookRedo, _pfUI.lookUndo);
  wrap.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = String(e.key).toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); undo(); }
    else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); e.stopPropagation(); redo(); }
  });
  const locked = (why, label) => { toast(`${label}: ${why.charAt(0).toLowerCase() + why.slice(1)}.`, { icon: 'lock' }); };
  /** A surprise: a random unlocked banner, nameplate and title (your colour and extras stay). */
  const surprise = () => {
    const ctx = profileLookCtx(), pick = (list, kind) => { const ok = list.filter(x => !profileLookLockOf(kind, x.id, ctx)); return ok.length ? ok[Math.floor(Math.random() * ok.length)].id : list[0].id; };
    const banners = PF_BANNERS.filter(b => b.id !== 'scene' && !profileLookLockOf('banner', b.id, ctx));
    const titles = PF_TITLES.filter(t => !profileLookLockOf('title', t.id, ctx));
    apply({ banner: banners.length ? banners[Math.floor(Math.random() * banners.length)].id : 'theme',
      np: { font: pick(PF_NP_FONTS, 'font'), weight: PF_NP_WEIGHTS[1 + Math.floor(Math.random() * 3)].id, col: pick(PF_NP_COLS, 'col'), fx: pick(PF_NP_FX, 'fx') },
      title: titles.length && Math.random() < 0.8 ? titles[Math.floor(Math.random() * titles.length)].id : '' });
    const pv = stage.querySelector('.pf-l-card');
    if (pv && _pfMotionOk()) { pv.classList.remove('is-roll'); void pv.offsetWidth; pv.classList.add('is-roll'); }
  };

  const paintStage = () => {
    stage.replaceChildren();
    const pv = _pfEl('div', 'pf-l-card');
    pv.appendChild(profileCardEl(null, { visits: true }));
    stage.appendChild(pv);
    const acts = _pfEl('div', 'pf-b-acts');
    const sb = uiButton({ label: 'Surprise me', icon: 'wand-sparkles', size: 'sm', tip: 'A random banner, nameplate and title from what you have unlocked', run: surprise });
    const ub = uiButton({ icon: 'undo-2', kind: 'ghost', size: 'sm', aria: 'Undo', tip: 'Undo', kbd: 'Ctrl+Z', disabled: !_pfUI.lookUndo.length, run: undo });
    const rb = uiButton({ icon: 'redo-2', kind: 'ghost', size: 'sm', aria: 'Redo', tip: 'Redo', kbd: 'Ctrl+Shift+Z', disabled: !_pfUI.lookRedo.length, run: redo });
    const reset = uiButton({ icon: 'rotate-ccw', kind: 'ghost', size: 'sm', aria: 'Back to the plain look', tip: 'Back to the plain look', run: () => {
      const before = cur();
      if (JSON.stringify(before) === JSON.stringify(profileLookNormalize(null))) return;
      apply(profileLookDefault());
      toast('Card back to the plain look', { icon: 'rotate-ccw', action: { label: 'Undo', run: () => { profileSet({ look: before }); paintStage(); paintPanel(); changed(); } } });
    } });
    acts.append(sb, ub, rb, reset);
    stage.appendChild(acts);
    const next = _pfLookNext();
    if (next) stage.appendChild(_pfEl('div', 'set-h pf-b-next', next));
  };
  const paintPanel = () => {
    const keep = panel.querySelector('.pf-l-scroll') ? panel.querySelector('.pf-l-scroll').scrollTop : 0;
    panel.replaceChildren();
    const tabs = _pfEl('div', 'seg pf-b-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Parts of your card');
    tabs.setAttribute('data-whats-new', 'profile-extras');   // What's new 2.18: banner, nameplate, title and extras (95-whats-new.js)
    for (const [id, label, ic] of _PF_LOOK_TABS) {
      const b = _pfEl('button'); b.type = 'button'; b.setAttribute('role', 'tab');
      b.innerHTML = icon(ic) + `<span>${esc(label)}</span>`;
      b.setAttribute('aria-selected', _pfUI.lookTab === id ? 'true' : 'false'); b.setAttribute('aria-pressed', _pfUI.lookTab === id ? 'true' : 'false');
      b.onclick = () => { if (_pfUI.lookTab !== id) { _pfUI.lookTab = id; paintPanel(); } };
      tabs.appendChild(b);
    }
    panel.appendChild(tabs);
    const sc = _pfEl('div', 'pf-l-scroll');
    const ctx = profileLookCtx(), look = cur(), p = profileGet();
    if (_pfUI.lookTab === 'banner') _pfLookBanner(sc, look, p, ctx, apply, locked);
    else if (_pfUI.lookTab === 'name') _pfLookName(sc, look, p, ctx, apply, locked);
    else if (_pfUI.lookTab === 'title') _pfLookTitle(sc, look, ctx, apply, locked);
    else _pfLookExtras(sc, look, apply);
    panel.appendChild(sc);
    if (keep) sc.scrollTop = keep;
  };
  paintStage(); paintPanel();
  return card;
}
/** "Next, at level 8: the Embers banner and the Poster font." (with the game on this page) */
function _pfLookNext() {
  const ctx = profileLookCtx();
  if (!ctx.game) return '';
  let lv = Infinity;
  const at = [];
  const scan = (list, what) => { for (const o of list) { if (!o.level || o.level <= ctx.levelMax) continue; if (o.level < lv) { lv = o.level; at.length = 0; } if (o.level === lv) at.push(what(o)); } };
  scan(PF_BANNERS, o => `the ${o.label} banner`); scan(PF_NP_FONTS, o => `the ${o.label} font`); scan(PF_NP_COLS, o => `${o.label} lettering`); scan(PF_NP_FX, o => `the ${o.label} effect`); scan(PF_TITLES, o => `the title “${o.label}”`);
  if (!isFinite(lv)) return 'Every level unlock for your card is yours.';
  const list = at.length > 1 ? at.slice(0, -1).join(', ') + ' and ' + at[at.length - 1] : at[0];
  return `Next, at level ${lv}: ${list}.`;
}
/** One option button with a lock (its label in the tooltip and for screen readers). */
function _pfLookOpt(cls, label, on, why, run, locked) {
  const b = _pfEl('button', cls); b.type = 'button';
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
  b.setAttribute('aria-label', label + (why ? ' (locked: ' + why + ')' : ''));
  b.setAttribute('data-tip', why ? `${label}: ${why}` : label);
  if (why) { b.classList.add('is-locked'); b.setAttribute('aria-disabled', 'true'); }
  b.onclick = () => { if (why) { locked(why, label); return; } if (!on) run(); };
  return b;
}
const _pfLock = () => `<span class="pf-lock">${icon('lock', 'i-xs')}</span>`;
function _pfLookSection(host, label, extra) {
  const sec = _pfEl('div', 'pf-b-part');
  const h = _pfEl('div', 'pf-b-part-h'); h.appendChild(_pfEl('span', null, label));
  if (extra) h.appendChild(extra);
  sec.appendChild(h);
  host.appendChild(sec);
  return sec;
}
/** Two colour rows for patterns: the kit's palette, your own colour, and Auto (your card colour / the pattern's own). */
function _pfLookColours(host, look, apply) {
  const row = (label, key, autoLabel) => {
    const sec = _pfLookSection(host, label);
    const r = _pfEl('div', 'pf-sws');
    const val = look[key];
    const auto = _pfEl('button', 'pf-sw pf-sw-auto'); auto.type = 'button';
    auto.setAttribute('aria-label', autoLabel); auto.setAttribute('data-tip', autoLabel); auto.setAttribute('aria-pressed', val ? 'false' : 'true');
    auto.innerHTML = icon('wand-sparkles', 'i-xs');
    auto.onclick = () => { if (val) apply({ [key]: '' }); };
    r.appendChild(auto);
    for (const [id, sw] of Object.entries(PF_SWATCHES)) {
      const b = _pfEl('button', 'pf-sw'); b.type = 'button'; b.style.setProperty('--sw', sw.hex);
      b.setAttribute('aria-label', sw.label); b.setAttribute('data-tip', sw.label); b.setAttribute('aria-pressed', val === id ? 'true' : 'false');
      b.onclick = () => { if (val !== id) apply({ [key]: id }); };
      r.appendChild(b);
    }
    const c = _pfEl('input', 'pf-sw-custom'); c.type = 'color'; c.setAttribute('aria-label', 'Your own colour'); c.setAttribute('data-tip', 'Your own colour');
    c.value = /^#[0-9a-f]{6}$/i.test(String(val)) ? val : '#5b5bd6';
    if (/^#[0-9a-f]{6}$/i.test(String(val))) c.classList.add('on');
    c.onchange = () => { const v = String(c.value).toLowerCase(); if (/^#[0-9a-f]{6}$/.test(v)) apply({ [key]: v }); };
    r.appendChild(c);
    sec.appendChild(r);
  };
  row('Main colour', 'bannerCol', 'Auto: your card colour');
  row('Second colour', 'bannerCol2', 'Auto: the pattern’s own');
}
function _pfLookBanner(host, look, p, ctx, apply, locked) {
  const th = _pfThemeHex(p.theme), def = pfBanner(look.banner);
  // what the chosen banner needs comes first (its colours, or the scene list), then every banner by group
  if (def && def.uses === 'cols') _pfLookColours(host, look, apply);
  if (def && def.uses === 'scene') _pfLookScenes(host, look, apply);
  if (def && def.uses === 'fixed') host.appendChild(_pfEl('div', 'set-h', `${def.label} brings its own colours. Patterns use yours.`));
  for (const [gid, glabel, gic] of PF_BANNER_GROUPS) {
    const list = PF_BANNERS.filter(b => b.group === gid);
    const tag = gid === 'animated' ? _pfEl('span', 'pf-b-tag', 'moves gently; still with reduced motion or Fun off') : gid === 'season' ? _pfEl('span', 'pf-b-tag', 'collected in season, yours for good') : gid === 'pattern' ? _pfEl('span', 'pf-b-tag', 'in your colours') : null;
    const sec = _pfLookSection(host, glabel, tag);
    sec.querySelector('.pf-b-part-h').insertAdjacentHTML('afterbegin', icon(gic, 'i-xs'));
    const grid = _pfEl('div', 'pf-l-bans');
    for (const b of list) {
      const why = profileLookLockOf('banner', b.id, ctx), on = look.banner === b.id;
      const btn = _pfLookOpt('pf-l-ban', b.label, on, why, () => apply(b.id === 'scene' && !look.scene ? { banner: b.id, scene: _pfFirstScene() } : { banner: b.id }), locked);
      const art = _pfEl('span', 'pf-l-ban-art');
      if (b.id === 'scene') {
        const it = typeof _pfSceneItem === 'function' ? _pfSceneItem(look.scene) : null;
        art.innerHTML = profileBannerSvg(Object.assign({}, look, { banner: 'theme' }), { theme: th, uid: _pfUid() }) + `<span class="pf-l-ban-ic">${icon('image', 'i-md')}</span>`;
        if (it) art.title = it.label;
      } else art.innerHTML = _pfBannerThumb(look, b.id, th);   // tables only; the thumbnails stay still
      btn.appendChild(art);
      btn.appendChild(_pfEl('span', 'pf-b-opt-l', b.label));
      if (why) btn.insertAdjacentHTML('beforeend', _pfLock());
      grid.appendChild(btn);
    }
    sec.appendChild(grid);
  }
}
/** A banner thumbnail, kept while its colours stay the same (each is in the page once: the panel is replaced whole). */
function _pfBannerThumb(look, id, th) {
  const key = [id, look.bannerCol, look.bannerCol2, th].join('|');
  let svg = _pfUI.thumbs.get(key);
  if (!svg) {
    svg = profileBannerSvg(Object.assign({}, look, { banner: id }), { theme: th, uid: 'pft' + _pfUI.thumbs.size.toString(36) + id.replace(/[^a-z0-9]/g, ''), motion: false });
    if (_pfUI.thumbs.size > 240) _pfUI.thumbs.clear();
    _pfUI.thumbs.set(key, svg);
  }
  return svg;
}
/** The full scenes of the app's own list (the banner can show one, by id). */
function _pfAllScenes() {
  if (typeof animItems !== 'function') return [];
  try { return animItems().filter(it => it && it.full && typeof it.ref === 'string' && /^[A-Za-z0-9_-]{1,64}\/[A-Za-z0-9_-]{1,64}$/.test(it.ref)); } catch (e) { return []; }
}
/** A scene to start with (it changes with the day, so it is not always the same one). */
function _pfFirstScene() {
  const all = _pfAllScenes();
  if (!all.length) return '';
  return all[(Math.floor(Date.now() / 864e5)) % all.length].ref;   // clock-ok: a day number to vary the starting scene
}
/** One of the app's own scenes as the banner: searchable, by name (only full scenes; drawn still, by id). */
function _pfLookScenes(host, look, apply) {
  const all = _pfAllScenes();
  const sec = _pfLookSection(host, 'Your scene');
  if (!all.length) { sec.appendChild(emptyLine('The scenes are still loading, or this dashboard has none yet. Your colour shows meanwhile.')); return; }
  const chosen = all.find(it => it.ref === look.scene) || null;
  sec.appendChild(_pfEl('div', 'set-h', chosen ? `Showing ${chosen.label}. Friends see it if their OpenDash has it too; otherwise your colour.` : 'Pick a scene. Friends see it if their OpenDash has it too; otherwise your colour.'));
  const q = _pfEl('input', 'control control-sm set-input pf-l-q'); q.type = 'search'; q.placeholder = `Search ${all.length} scenes`; q.setAttribute('aria-label', 'Search the scenes');
  q.value = _pfUI.sceneQ || '';
  const list = _pfEl('div', 'pf-l-scenes'); list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', 'Scenes');
  const paint = () => {
    list.replaceChildren();
    const s = q.value.trim().toLowerCase();
    const hits = all.filter(it => !s || String(it.label || '').toLowerCase().includes(s) || String(it.ref).toLowerCase().includes(s));
    const shown = hits.slice(0, _pfUI.sceneN);
    for (const it of shown) {
      const on = it.ref === look.scene;
      const b = _pfEl('button', 'chip chip-lg pf-l-scene', it.label || it.ref); b.type = 'button';
      b.setAttribute('role', 'option'); b.setAttribute('aria-selected', on ? 'true' : 'false'); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.onclick = () => { if (!on) apply({ banner: 'scene', scene: it.ref }); };
      list.appendChild(b);
    }
    if (!hits.length) list.appendChild(emptyLine('No scene matches that. Try another word.'));
    else if (hits.length > shown.length) {
      const more = uiButton({ label: `Show more (${hits.length - shown.length})`, icon: 'chevron-down', kind: 'ghost', size: 'sm', run: () => { _pfUI.sceneN += 40; paint(); } });
      list.appendChild(more);
    }
  };
  q.oninput = _pfDebounce(() => { _pfUI.sceneQ = q.value; _pfUI.sceneN = 40; paint(); }, 150);
  sec.append(q, list);
  paint();
}
function _pfLookName(host, look, p, ctx, apply, locked) {
  const name = profileDisplayName(p), th = _pfThemeHex(p.theme);
  const sample = (np, cls) => { const s = _pfEl('span', cls || 'pf-l-np-s', name); profileNameplateApply(s, { look: Object.assign({}, look, { np: Object.assign({}, look.np, np) }), theme: p.theme }, { theme: th }); return s; };
  // fonts: your name in each
  const fs = _pfLookSection(host, 'Font', _pfEl('span', 'pf-b-tag', 'from this computer: nothing is downloaded'));
  const fg = _pfEl('div', 'pf-l-fonts');
  for (const f of PF_NP_FONTS) {
    const why = profileLookLockOf('font', f.id, ctx), on = look.np.font === f.id;
    const b = _pfLookOpt('pf-l-font', f.label, on, why, () => apply({ np: { font: f.id } }), locked);
    b.appendChild(sample({ font: f.id, fx: 'none' }));
    b.appendChild(_pfEl('span', 'pf-b-opt-l', f.label));
    if (why) b.insertAdjacentHTML('beforeend', _pfLock());
    fg.appendChild(b);
  }
  fs.appendChild(fg);
  // weight
  const ws = _pfLookSection(host, 'Weight');
  ws.appendChild(_settingsSeg(PF_NP_WEIGHTS.map(w => [w.id, w.label]), look.np.weight, (k) => apply({ np: { weight: k } })));
  // colour: ink, your colour, the palette, gradients
  const cs = _pfLookSection(host, 'Colour');
  const cg = _pfEl('div', 'pf-sws pf-l-cols');
  for (const c of PF_NP_COLS) {
    const why = profileLookLockOf('col', c.id, ctx), on = look.np.col === c.id;
    const b = _pfLookOpt('pf-sw' + (c.grad ? ' is-grad' : ''), c.label, on, why, () => apply({ np: { col: c.id } }), locked);
    const hex = c.id === 'ink' ? '' : c.id === 'theme' ? th : c.swatch ? (PF_SWATCHES[c.swatch] || {}).hex : '';
    if (c.grad) b.style.setProperty('--sw', `linear-gradient(135deg, ${c.grad.join(', ')})`);
    else if (hex) b.style.setProperty('--sw', hex);
    else b.classList.add('is-ink');
    if (c.id === 'theme') b.classList.add('is-theme');
    if (why) b.insertAdjacentHTML('beforeend', _pfLock());
    cg.appendChild(b);
  }
  cs.appendChild(cg);
  // effects: your name with each
  const xs = _pfLookSection(host, 'Effect');
  const xg = _pfEl('div', 'pf-l-fxs');
  for (const x of PF_NP_FX) {
    const why = profileLookLockOf('fx', x.id, ctx), on = look.np.fx === x.id;
    const b = _pfLookOpt('pf-l-fx', x.label, on, why, () => apply({ np: { fx: x.id } }), locked);
    b.appendChild(sample({ fx: x.id }, 'pf-l-np-s is-fx'));
    b.appendChild(_pfEl('span', 'pf-b-opt-l', x.label));
    if (why) b.insertAdjacentHTML('beforeend', _pfLock());
    xg.appendChild(b);
  }
  xs.appendChild(xg);
}
function _pfLookTitle(host, look, ctx, apply, locked) {
  const open = PF_TITLES.filter(t => !profileLookLockOf('title', t.id, ctx)).length;
  const sec = _pfLookSection(host, 'Your title', _pfEl('span', 'pf-b-tag', `${open} of ${PF_TITLES.length} unlocked`));
  sec.appendChild(_pfEl('div', 'set-h', 'Shown under your name, to you and your friends. More come from achievements, levels, your garden and friends.'));
  const grid = _pfEl('div', 'pf-l-titles');
  const none = _pfLookOpt('pf-l-title', 'No title', !look.title, '', () => apply({ title: '' }), locked);
  none.innerHTML = icon('minus', 'i-xs') + '<span>No title</span>';
  grid.appendChild(none);
  const list = PF_TITLES.slice().sort((a, b) => (profileLookLockOf('title', a.id, ctx) ? 1 : 0) - (profileLookLockOf('title', b.id, ctx) ? 1 : 0));
  for (const t of list) {
    const why = profileLookLockOf('title', t.id, ctx), on = look.title === t.id;
    const b = _pfLookOpt('pf-l-title', t.label, on, why, () => apply({ title: t.id }), locked);
    b.innerHTML = icon(/^[a-z0-9-]+$/.test(t.icon || '') ? t.icon : 'award', 'i-xs');
    b.appendChild(_pfEl('span', null, t.label));
    if (why) b.insertAdjacentHTML('beforeend', _pfLock());
    grid.appendChild(b);
  }
  sec.appendChild(grid);
}
function _pfLookExtras(host, look, apply) {
  // the tint
  const ts = _pfLookSection(host, 'Card tint');
  ts.appendChild(_settingsSeg(PF_TINTS.map(([id, label]) => [id, label]), look.tint, (k) => apply({ tint: k })));
  ts.appendChild(_pfEl('div', 'set-h', 'How much your card colour (About you) tints the card. Night is a dark card in any theme.'));
  // favourite emoji
  const fs = _pfLookSection(host, 'Favourite emoji', _pfEl('span', 'pf-b-tag', `${look.favs.length} of ${PF_LOOK_MAX.favs}`));
  const mine = _pfEl('div', 'pf-l-favs-mine');
  if (look.favs.length) {
    look.favs.forEach((e, i) => {
      const b = _pfEl('button', 'pf-fav pf-l-fav-on', e); b.type = 'button';
      b.setAttribute('aria-label', `Remove ${e}`); b.setAttribute('data-tip', 'Remove');
      b.onclick = () => { const l = look.favs.slice(); l.splice(i, 1); apply({ favs: l }); };
      mine.appendChild(b);
    });
  } else mine.appendChild(_pfEl('span', 'set-h', 'None yet. Pick up to six below: they show as a little row on your card.'));
  fs.appendChild(mine);
  for (const [label, list] of PF_FAV_EMOJI) {
    const g = _pfEl('div', 'pf-l-emo');
    g.setAttribute('role', 'group'); g.setAttribute('aria-label', label);
    g.appendChild(_pfEl('span', 'pf-l-emo-h', label));
    for (const e of list) {
      const on = look.favs.includes(e);
      const b = _pfEl('button', 'pf-pop-emo', e); b.type = 'button';
      b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('aria-label', e);
      b.onclick = () => {
        const l = look.favs.slice(), i = l.indexOf(e);
        if (i >= 0) l.splice(i, 1);
        else { if (l.length >= PF_LOOK_MAX.favs) { toast('Six at most: take one off first.', { icon: 'heart' }); return; } l.push(e); }
        apply({ favs: l });
      };
      g.appendChild(b);
    }
    fs.appendChild(g);
  }
  // 'currently'
  const cs = _pfLookSection(host, 'Currently');
  const line = _pfEl('div', 'pf-st-line');
  const kind = _settingsSelect([['', 'Nothing right now']].concat(PF_CURRENTLY.map(([id, label, , em]) => [id, `${em} ${label}…`])), look.cur.k || '', (k) => {
    if (!k) { apply({ cur: { k: '', t: '' } }); return; }
    if (look.cur.t) apply({ cur: { k } }); else { _pfUI.curK = k; t.disabled = false; t.focus(); }
  });
  kind.setAttribute('aria-label', 'What you are doing');
  const t = _pfEl('input', 'control control-sm pf-st-text'); t.maxLength = PF_LOOK_MAX.currently; t.value = look.cur.t || '';
  t.placeholder = 'e.g. a podcast about bees'; t.setAttribute('aria-label', 'Currently');
  t.disabled = !look.cur.k && !_pfUI.curK;
  const save = _pfDebounce(() => { const v = profileText(t.value, PF_LOOK_MAX.currently); const k = look.cur.k || _pfUI.curK || 'listening'; apply(v ? { cur: { k, t: v } } : { cur: { k: '', t: '' } }, { keepPanel: true }); }, 500);
  t.oninput = save;
  line.append(kind, t);
  cs.appendChild(line);
  cs.appendChild(_pfEl('div', 'set-h', `One line, ${PF_LOOK_MAX.currently} characters at most, plain text.`));
}

/* ---------- the Friends tab (2.18): your card on the hangout, a friend's card on their page ---------- */
function _pfFriendsPanels() {
  const F = typeof window !== 'undefined' ? window.Friends : null;
  if (!F || typeof F.registerPanel !== 'function') return;
  try {
    F.registerPanel({ id: 'profile-you', order: 3, where: 'hangout', tab: 'settings', title: 'Your card', icon: 'circle-user', render: (sec) => {
      const row = _pfEl('div', 'pf-fr-you');
      row.appendChild(profileCardEl(null, { visits: true }));
      const side = _pfEl('div', 'pf-fr-you-side');
      side.appendChild(_pfEl('p', 'muted', 'This is the card your friends see when they open your page: your banner, name style, title and favourite emoji.'));
      side.appendChild(uiButton({ label: 'Customise your card', icon: 'wand-sparkles', kind: 'primary', size: 'sm', run: () => _pfOpenLook() }));
      side.appendChild(uiButton({ label: 'Preview what friends see', icon: 'eye', size: 'sm', run: () => openDialog({ title: 'What your friends see', size: 'sm', body: (el) => { el.appendChild(profileCardEl(null, { preview: true })); } }) }));
      row.appendChild(side);
      sec.appendChild(row);
    } });
    F.registerPanel({ id: 'profile-card', order: 2, where: 'friend', title: 'Their card', icon: 'circle-user', render: (sec, f) => {
      if (!f || f.status !== 'friend') return false;
      const w = _pfEl('div', 'pf-fr-card');
      w.appendChild(profileCardEl(f));
      sec.appendChild(w);
      profileVisitFriend(f);   // +1 on their visitors count, once a day (Settings > Profile can turn it off)
    } });
  } catch (e) { console.error('[profile] friends panels', e); }
}
function _pfOpenLook() {
  _pfShowSec('card');
  setTimeout(() => { const b = document.getElementById('pf-look'); if (b) b.scrollIntoView({ behavior: _pfMotionOk() ? 'smooth' : 'auto', block: 'start' }); }, 60);
}
_pfFriendsPanels();

/* ---------- the character builder ---------- */
function _pfBuilderCard(changed) {
  const { card, body } = _settingsCard('Your avatar', 'Some parts unlock as you level up.');
  card.id = 'pf-builder';
  const wrap = _pfEl('div', 'pf-b'); wrap.tabIndex = -1;
  const stage = _pfEl('div', 'pf-b-stage'), panel = _pfEl('div', 'pf-b-panel');
  wrap.append(stage, panel);
  body.appendChild(wrap);
  const cur = () => profileGet().avatar;
  const apply = (next) => {
    const before = cur();
    if (JSON.stringify(before) === JSON.stringify(profileAvatarNormalize(next))) return;
    _pfUI.undo.push(JSON.stringify(before)); if (_pfUI.undo.length > 60) _pfUI.undo.shift();
    _pfUI.redo = [];
    profileSet({ avatar: next });
    paint(); changed();
  };
  const step = (from, to) => {
    if (!from.length) return;
    to.push(JSON.stringify(cur()));
    profileSet({ avatar: JSON.parse(from.pop()) });
    paint(); changed();
  };
  const undo = () => step(_pfUI.undo, _pfUI.redo), redo = () => step(_pfUI.redo, _pfUI.undo);
  const randomise = (onlyTab) => {
    const ctx = profileUnlockCtx(), a = cur();
    const keep = onlyTab ? Object.fromEntries(PF_PARTS.filter(p => p.tab !== _pfUI.tab).map(p => [p.k, a[p.k]])) : { skin: a.skin };
    apply(profileAvatarRandom(Math.random, (k, id) => !profileLockOf(k, id, ctx), keep));
    const big = stage.querySelector('.pf-b-big');
    if (big && _pfMotionOk()) { big.classList.remove('is-roll'); void big.offsetWidth; big.classList.add('is-roll'); }
  };
  wrap.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = String(e.key).toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); undo(); }
    else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); e.stopPropagation(); redo(); }
  });

  const paintStage = () => {
    const a = cur();
    stage.replaceChildren();
    const big = _pfEl('div', 'pf-b-big');
    big.appendChild(profileAvatarEl(null, 168, { motion: true, mood: {} }));
    stage.appendChild(big);
    const sizes = _pfEl('div', 'pf-b-sizes'); sizes.setAttribute('aria-hidden', 'true');
    for (const n of [64, 40, 28]) sizes.appendChild(profileAvatarEl(null, n, { mood: {} }));
    stage.appendChild(sizes);
    const acts = _pfEl('div', 'pf-b-acts');
    const rb = uiButton({ label: 'Randomise', icon: 'wand-sparkles', size: 'sm', tip: 'A new look (your skin tone stays). Shift+click: only this tab', run: (e) => randomise(!!e.shiftKey) });
    const ub = uiButton({ icon: 'undo-2', kind: 'ghost', size: 'sm', aria: 'Undo', tip: 'Undo', kbd: 'Ctrl+Z', disabled: !_pfUI.undo.length, run: undo });
    const reb = uiButton({ icon: 'redo-2', kind: 'ghost', size: 'sm', aria: 'Redo', tip: 'Redo', kbd: 'Ctrl+Shift+Z', disabled: !_pfUI.redo.length, run: redo });
    acts.append(rb, ub, reb);
    stage.appendChild(acts);
    const fig = profileFigureSvg(a, { size: 150, walk: _pfUI.walk && _pfMotionOk() });
    if (fig) {
      const f = _pfEl('div', 'pf-b-fig');
      const art = _pfEl('div', 'pf-b-fig-art'); art.innerHTML = fig;   // scene figure paths from scenePeople, colours from the kit's tables
      const cap = _pfEl('div', 'pf-b-fig-cap');
      cap.appendChild(_pfEl('span', null, 'You in the scenes'));
      if (_pfMotionOk()) { const w = _pfEl('button', 'btn-icon btn-sm'); w.type = 'button'; w.innerHTML = icon(_pfUI.walk ? 'square' : 'arrow-right'); w.setAttribute('aria-label', _pfUI.walk ? 'Stop walking' : 'Walk'); w.setAttribute('data-tip', _pfUI.walk ? 'Stop walking' : 'Walk'); w.onclick = () => { _pfUI.walk = !_pfUI.walk; paintStage(); }; cap.appendChild(w); }
      f.append(art, cap);
      stage.appendChild(f);
    }
    const next = _pfNextUnlocks();
    if (next) stage.appendChild(_pfEl('div', 'set-h pf-b-next', next));
  };
  const paintPanel = () => {
    const a = cur(), ctx = profileUnlockCtx(), theme = profileGet().theme, live = profileLive();
    panel.replaceChildren();
    const tabs = _pfEl('div', 'seg pf-b-tabs'); tabs.setAttribute('role', 'tablist');
    for (const [id, label, ic] of PF_TABS) {
      const b = _pfEl('button'); b.type = 'button'; b.setAttribute('role', 'tab');
      b.innerHTML = icon(ic) + `<span>${esc(label)}</span>`;
      b.setAttribute('aria-selected', _pfUI.tab === id ? 'true' : 'false'); b.setAttribute('aria-pressed', _pfUI.tab === id ? 'true' : 'false');
      b.onclick = () => { if (_pfUI.tab !== id) { _pfUI.tab = id; paintPanel(); } };
      tabs.appendChild(b);
    }
    // 2.18 (agent 'wardrobe', 97-profile-4wardrobe.js): saved outfits and 'Surprise me' above the tabs, a tab's extras (quick expressions) below
    if (typeof profileWardrobeEl === 'function') { const w = profileWardrobeEl({ get: cur, apply, tab: _pfUI.tab }); if (w) panel.insertBefore(w, panel.firstChild); }
    panel.appendChild(tabs);
    if (typeof profileWardrobeTabEl === 'function') { const w = profileWardrobeTabEl(_pfUI.tab, { get: cur, apply }); if (w) panel.appendChild(w); }
    const list = _pfEl('div', 'pf-b-parts');
    for (const part of PF_PARTS) {
      if (part.tab !== _pfUI.tab) continue;
      if (_pfHidePart(part.k, a)) continue;
      const sec = _pfEl('div', 'pf-b-part');
      const h = _pfEl('div', 'pf-b-part-h'); h.appendChild(_pfEl('span', null, part.label));
      if (part.figure) h.appendChild(_pfEl('span', 'pf-b-tag', 'full figure'));
      sec.appendChild(h);
      const kitArt = typeof pfOptionArt === 'function';   // 2.18: the kit draws every tile (close-ups, the figure's legs and feet)
      const opts = _pfEl('div', part.colour ? 'pf-b-cols' : part.figure && !kitArt ? 'pf-b-chips' : 'pf-b-opts');
      for (const o of pfOptions(part.k)) {
        const why = profileLockOf(part.k, o.id, ctx), on = a[part.k] === o.id;
        const art = kitArt && !part.colour ? pfOptionArt(part.k, o.id, a, { size: 56, uid: _pfUid(), theme, live }) : '';
        const b = _pfEl('button', part.colour ? 'pf-sw' : part.figure && !kitArt ? 'chip chip-lg pf-b-chip' : 'pf-b-opt'); b.type = 'button';
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.setAttribute('aria-label', o.label + (why ? ' (locked: ' + why + ')' : ''));
        b.setAttribute('data-tip', why ? `${o.label}: ${why}` : o.label);
        if (why) { b.classList.add('is-locked'); b.setAttribute('aria-disabled', 'true'); }
        if (part.colour) b.style.setProperty('--sw', o.hex);
        else if (kitArt) b.innerHTML = art + `<span class="pf-b-opt-l">${esc(o.label)}</span>`;   // the kit's own markup: allow-listed ids and numbers only
        else if (part.figure) b.textContent = o.label;
        else {
          const crop = _PF_FACE_CROP.has(part.k) ? 'face' : _PF_HEAD_CROP.has(part.k) ? 'head' : '';
          b.innerHTML = profileAvatarSvg(Object.assign({}, a, { [part.k]: o.id }), { size: 56, uid: _pfUid(), theme, crop, live })
            + `<span class="pf-b-opt-l">${esc(o.label)}</span>`;
        }
        if (why) b.insertAdjacentHTML('beforeend', `<span class="pf-lock">${icon('lock', 'i-xs')}</span>`);
        b.onclick = () => {
          if (why) { toast(`${o.label}: ${why.charAt(0).toLowerCase() + why.slice(1)}.`, { icon: 'lock' }); return; }
          if (!on) apply(Object.assign({}, a, { [part.k]: o.id }, _pfPairs(part.k, o.id, a)));
        };
        opts.appendChild(b);
      }
      if (part.hex) {
        const c = _pfEl('input', 'pf-sw-custom'); c.type = 'color'; c.setAttribute('aria-label', 'Your own colour'); c.setAttribute('data-tip', 'Your own colour');
        c.value = /^#[0-9a-f]{6}$/i.test(a[part.k]) ? a[part.k] : '#5b5bd6';
        if (/^#[0-9a-f]{6}$/i.test(a[part.k])) c.classList.add('on');
        c.onchange = () => { const v = String(c.value).toLowerCase(); if (/^#[0-9a-f]{6}$/.test(v)) apply(Object.assign({}, a, { [part.k]: v })); };
        opts.appendChild(c);
      }
      sec.appendChild(opts);
      list.appendChild(sec);
    }
    panel.appendChild(list);
  };
  const paint = () => { paintStage(); paintPanel(); };
  paint();
  return card;
}
/** Colour rows that mean nothing for the part chosen are left out (no stripe colour on a plain scarf...). */
function _pfHidePart(k, a) {
  if (typeof pfPartHidden === 'function') return pfPartHidden(k, a);   // 2.18: the kit knows its parts (97-profile-0kit-6looks.js)
  return (k === 'glassesCol' && (a.glasses === 'none' || a.glasses === 'heart')) || (k === 'hatCol' && ['none', 'crown', 'grad', 'witch', 'santa', 'flowers'].includes(a.hat))
    || (k === 'headphonesCol' && a.headphones === 'none') || (k === 'scarfCol' && a.scarf === 'none') || (k === 'scarf2Col' && a.scarf !== 'striped')
    || (k === 'bagCol' && a.bag === 'none') || (k === 'eyeCol' && !['round', 'wide'].includes(a.eyes)) || (k === 'topCol' && a.top === 'lab');
}
/** Sensible company: a hat that hides headphones' band is fine, but a headscarf goes without headphones. */
function _pfPairs(k, id, a) {
  if (typeof pfPairs === 'function') return pfPairs(k, id, a);   // 2.18: the kit knows its parts (97-profile-0kit-6looks.js)
  if (k === 'hat' && id === 'headscarf' && a.headphones !== 'none') return { headphones: 'none' };
  if (k === 'headphones' && id !== 'none' && a.hat === 'headscarf') return { hat: 'none' };
  return {};
}
/** "Next, at level 12: Mohawk, Cat ears and Tangerine" (with the game on this page). */
function _pfNextUnlocks() {
  const ctx = profileUnlockCtx();
  if (!ctx.game) return '';
  let lv = Infinity;
  const at = new Map();
  for (const part of PF_PARTS) for (const o of pfOptions(part.k)) {
    if (!o.level || o.level <= ctx.levelMax) continue;
    if (o.level < lv) { lv = o.level; at.clear(); }
    if (o.level === lv) at.set(o.label, 1);
  }
  if (!isFinite(lv)) return 'Every level unlock is yours.';
  const names = [...at.keys()];
  const list = names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0];
  return `Next, at level ${lv}: ${list}.`;
}

/* ---------- badges ---------- */
function _pfBadgesCard(changed) {
  const { card, body } = _settingsCard('Badges you show', 'Pick up to six of the achievements you have earned, or let your card show the newest three.');
  const paint = () => {
    body.replaceChildren();
    const earned = _pfEarned(), p = profileGet();
    if (!earned.length) {
      body.appendChild(emptyLine('No achievements yet. They come from finishing tasks, streaks, focus and more.', typeof setView === 'function' ? { label: 'See the achievements', icon: 'award', run: () => setView('game') } : null));
      return;
    }
    const auto = !Array.isArray(p.badges);
    body.appendChild(_settingsRow('Show', 'Money and places badges are never picked for you.', _settingsSeg([['auto', 'Newest three'], ['pick', 'My pick']], auto ? 'auto' : 'pick', (k) => {
      if (k === 'auto') profileSet({ badges: null }); else profileSet({ badges: profileShowcase(p) });
      paint(); changed();
    })));
    const shown = new Set(profileShowcase(p));
    const grid = _pfEl('div', 'pf-badge-pick');
    for (const { id } of earned) {
      const b = profileBadgeInfo(id); if (!b) continue;
      const btn = _pfEl('button', 'pf-badge'); btn.type = 'button';
      btn.innerHTML = icon(/^[a-z0-9-]+$/.test(b.icon) ? b.icon : 'award', 'i-sm');
      btn.appendChild(_pfEl('span', null, b.label));
      btn.setAttribute('aria-pressed', shown.has(id) ? 'true' : 'false');
      btn.setAttribute('data-tip', b.hint || b.label);
      btn.disabled = auto;
      btn.onclick = () => {
        const list = Array.isArray(profileGet().badges) ? profileGet().badges.slice() : [];
        const i = list.indexOf(id);
        if (i >= 0) list.splice(i, 1);
        else { if (list.length >= PF_MAX.badges) { toast(`Six at most: take one off first.`, { icon: 'award' }); return; } list.push(id); }
        profileSet({ badges: list }); paint(); changed();
      };
      grid.appendChild(btn);
    }
    body.appendChild(grid);
  };
  paint();
  return card;
}

/* ---------- favourite places ---------- */
function _pfPlaceSuggestions() {
  try {
    const f = window.Locations && typeof window.Locations.facts === 'function' ? window.Locations.facts() : null;
    const out = [];
    for (const c of f && Array.isArray(f.cities) ? f.cities : []) {
      const label = profileText(c.city + (c.country ? ', ' + c.country : ''), PF_MAX.place);
      if (label && c.city) out.push({ label, cc: /^[A-Z]{2}$/.test(String(c.cc || '')) ? c.cc : '' });
      if (out.length >= 12) break;
    }
    return out;
  } catch (e) { return []; }
}
function _pfPlacesCard(changed) {
  const { card, body } = _settingsCard('Favourite places', 'Up to five, names only. Friends see them only if you turn it on below.');
  const paint = () => {
    body.replaceChildren();
    const list = profileGet().places, sug = _pfPlaceSuggestions();
    const chips = _pfEl('div', 'chips pf-places');
    list.forEach((pl, i) => {
      const c = _pfEl('span', 'chip chip-lg');
      c.appendChild(_pfEl('span', null, [profileFlag(pl.cc), profileText(pl.label, PF_MAX.place)].filter(Boolean).join(' ')));
      const x = _pfEl('button', 'btn-icon btn-sm'); x.type = 'button'; x.innerHTML = icon('x', 'i-xs'); x.setAttribute('aria-label', 'Remove ' + pl.label);
      x.onclick = () => { const l = profileGet().places.slice(); l.splice(i, 1); profileSet({ places: l }); paint(); changed(); };
      c.appendChild(x); chips.appendChild(c);
    });
    if (list.length) body.appendChild(chips);
    const add = (label, cc) => {
      label = profileText(label, PF_MAX.place);
      if (!label) return;
      const l = profileGet().places.slice();
      if (l.some(x => x.label.toLowerCase() === label.toLowerCase())) return;
      if (l.length >= PF_MAX.places) { toast('Five places at most: take one off first.', { icon: 'map-pin' }); return; }
      const m = sug.find(s => s.label.toLowerCase() === label.toLowerCase());
      l.push(cc || (m && m.cc) ? { label, cc: cc || m.cc } : { label });
      profileSet({ places: l }); paint(); changed();
    };
    if (list.length < PF_MAX.places) {
      const i = _pfEl('input', 'control control-sm set-input'); i.maxLength = PF_MAX.place; i.placeholder = 'Add a place'; i.setAttribute('aria-label', 'Add a favourite place');
      const dl = _pfEl('datalist'); dl.id = 'pf-dl-places';
      for (const s of sug) { const o = _pfEl('option'); o.value = s.label; dl.appendChild(o); }
      i.setAttribute('list', dl.id);
      i.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); add(i.value); } };
      const line = _pfEl('div', 'pf-st-line'); line.append(i, dl, uiButton({ label: 'Add', icon: 'plus', size: 'sm', run: () => add(i.value) }));
      body.appendChild(line);
      const quick = sug.filter(s => !list.some(x => x.label.toLowerCase() === s.label.toLowerCase())).slice(0, 6);
      if (quick.length) {
        const q = _pfEl('div', 'pf-st-pre');
        q.appendChild(_pfEl('span', 'set-h', 'Where you have spent the most time:'));
        for (const s of quick) { const b = _pfEl('button', 'chip chip-lg', [profileFlag(s.cc), s.label].filter(Boolean).join(' ')); b.type = 'button'; b.onclick = () => add(s.label, s.cc); q.appendChild(b); }
        body.appendChild(q);
      }
    }
  };
  paint();
  return card;
}

/* ---------- friends ---------- */
function _pfFriendsCard() {
  const { card, body } = _settingsCard('What friends see', 'Your card goes to your friends, encrypted.');
  const F = _pfFriends();
  const paint = () => {
    body.replaceChildren();
    const sh = profileGet().share;
    body.appendChild(_settingsRow('Share favourite places', 'Names only.', _settingsSwitch(!!sh.places, 'Share favourite places with friends', (on) => { profileSet({ share: { places: on } }); paint(); })));
    body.appendChild(_settingsRow('Count my visits', 'When you open a friend’s card, their visitors count goes up by one (once a day). They only ever see a number, never who.', _settingsSwitch(sh.visits !== false, 'Count my visits to friends’ cards', (on) => { profileSet({ share: { visits: on } }); paint(); })));
    const acts = _pfEl('div', 'pf-b-acts');
    acts.appendChild(uiButton({ label: _pfUI.preview ? 'Hide the preview' : 'Preview what friends see', icon: 'eye', size: 'sm', run: () => { _pfUI.preview = !_pfUI.preview; paint(); } }));
    body.appendChild(acts);
    if (_pfUI.preview) { const pv = _pfEl('div', 'pf-preview'); pv.appendChild(profileCardEl(null, { preview: true })); body.appendChild(pv); }
    if (!F) body.appendChild(emptyLine('Friends isn’t set up yet.'));
    // More: what goes, and sending it now (it sends by itself a moment after every change)
    setFold({ card, body }, 'profile-friends-more', 'More', ({ body: more }) => {
      more.appendChild(_settingsRow('What goes', 'Your name, pronouns, bio, status, what you are working on, your card and its look, your avatar and the badges you show. Nothing else from your dashboard.', null));
      if (F) {
        const send = (b) => {
          b.disabled = true;
          return profileShareNow(true).then((ok) => {
            if (ok) toast('Card sent to your friends', { kind: 'ok', icon: 'send' });
            else toast('Couldn’t send your card: Friends isn’t ready. It goes as soon as it is.', { kind: 'err', icon: 'cloud-off', retry: () => send(b) });
          }).finally(() => { b.disabled = false; });
        };
        more.appendChild(_settingsRow('Send it now', null, uiButton({ label: 'Send it now', icon: 'send', size: 'sm', run: (e, b) => send(b) })));
      }
    });
  };
  paint();
  return card;
}

/* ---------- the command palette ---------- */
if (typeof registerCommand === 'function') {
  registerCommand({ id: 'profile-open', group: 'Go to', label: 'Profile: your card and avatar', icon: 'user-round', keywords: 'profile me avatar character name bio pronouns status badges places card', run: () => setView('profile') });
  registerCommand({ id: 'profile-card', label: 'Customise your card: banner, nameplate, title', icon: 'image', keywords: 'profile card banner background header nameplate font name style title emoji currently tint', run: () => _pfOpenLook() });
  registerCommand({ id: 'profile-avatar', label: 'Customise your avatar', icon: 'wand-sparkles', keywords: 'avatar character builder customise hair outfit hat glasses face', run: () => { _pfShowSec('avatar'); setTimeout(() => { const b = document.getElementById('pf-builder'); if (b) b.scrollIntoView({ block: 'start' }); }, 60); } });
  registerCommand({ id: 'profile-status', label: 'Set your status', icon: 'circle-user', keywords: 'status away busy focusing holiday travelling emoji', run: () => profileOpenPop() });
  registerCommand({ id: 'profile-status-clear', label: 'Clear your status', icon: 'x', keywords: 'status clear', when: () => !!profileStatusNow(), run: () => { profileSet({ status: { emoji: '', text: '', until: 0 } }); toast('Status cleared', { icon: 'circle-user' }); } });
  registerCommand({ id: 'profile-random', label: 'Randomise your avatar', icon: 'wand-sparkles', keywords: 'avatar random surprise shuffle new look', run: () => {
    const before = profileGet().avatar, ctx = profileUnlockCtx();
    profileSet({ avatar: profileAvatarRandom(Math.random, (k, id) => !profileLockOf(k, id, ctx), { skin: before.skin }) });
    toast('New look', { icon: 'wand-sparkles', action: { label: 'Undo', run: () => profileSet({ avatar: before }) } });
  } });
}
