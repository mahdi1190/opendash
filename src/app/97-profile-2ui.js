/* ============================================================
   PROFILE, what you see (2.17): Settings > Profile (#view=settings:me):
   your card, About you (name, pronouns, status, bio, what you are working
   on, the card colour, "reacts to your day"), the CHARACTER BUILDER (tabs
   Face / Hair / Outfit / Extras / Background, a close-up of every option,
   locks that say how to open them, Randomise, Undo and Redo, the sizes the
   avatar is seen at, and you in the scenes: your outfit on the scene figure),
   the badges you show, favourite places, and what friends see. Plus the
   palette commands. The state, the chip and the API are 97-profile-1core.js.
   ============================================================ */
const _pfUI = { tab: 'face', undo: [], redo: [], walk: true, preview: false, mode: null };
const _PF_FACE_CROP = new Set(['eyes', 'eyeCol', 'brows', 'mouth', 'facial', 'marks']);
const _PF_HEAD_CROP = new Set(['hair', 'hat', 'glasses', 'headphones']);
const _PF_UNTIL = [['0', "Don't clear"], ['1h', 'In an hour'], ['4h', 'In 4 hours'], ['today', 'Tonight'], ['week', 'In a week']];

function _pfEl(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function _pfBtn(label, ic, run, cls) {
  const b = _pfEl('button', 'btn btn-sm ' + (cls || 'btn-secondary'));
  b.type = 'button';
  b.innerHTML = (ic ? icon(ic, 'i-sm') : '') + `<span>${esc(label)}</span>`;
  b.onclick = (e) => run(e, b);
  return b;
}
function _pfUntil(k) {
  const now = Date.now();   // clock-ok: a real time stamp
  return k === '1h' ? now + 36e5 : k === '4h' ? now + 4 * 36e5 : k === 'today' ? _pfEndOfDay() : k === 'week' ? now + 7 * 864e5 : 0;
}
function _pfDebounce(fn, ms) { let t = 0; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

/* ---------- the page ---------- */
if (typeof registerSettingsGroup === 'function') {
  registerSettingsGroup({
    id: 'me', title: 'Profile', icon: 'user-round', order: 9,
    description: 'You: your name, status, avatar and the badges you show. It follows you to your other devices, and friends see your card.',
    render(el) { _pfSettings(el); },
  });
}
function _pfSettings(el) {
  const top = _pfEl('div', 'pf-set-top');
  const cardHost = _pfEl('div', 'pf-set-card');
  const paintCard = () => { cardHost.replaceChildren(profileCardEl(null)); };
  paintCard();
  const side = _pfEl('div', 'pf-set-side');
  side.append(_pfEl('p', 'set-h', 'This is your card: on the top bar, in your profile, and what your friends see. Click your avatar on the top bar to set a quick status.'));
  const ed = _pfBtn('Customise your avatar', 'wand-sparkles', () => { const b = document.getElementById('pf-builder'); if (b) b.scrollIntoView({ behavior: _pfMotionOk() ? 'smooth' : 'auto', block: 'start' }); }, 'btn-primary');
  side.appendChild(ed);
  top.append(cardHost, side);
  el.appendChild(top);
  const changed = () => { paintCard(); };
  el.appendChild(_pfAboutCard(changed));
  el.appendChild(_pfBuilderCard(changed));
  el.appendChild(_pfBadgesCard(changed));
  el.appendChild(_pfPlacesCard(changed));
  el.appendChild(_pfFriendsCard());
}

/* ---------- About you ---------- */
function _pfAboutCard(changed) {
  const { card, body } = _settingsCard('About you', 'All of it is optional. Plain text only.');
  const p = profileGet();
  const input = (key, max, ph, label, list) => {
    const i = _pfEl('input', 'control control-sm set-input'); i.maxLength = max; i.value = p[key] || ''; i.placeholder = ph || ''; i.setAttribute('aria-label', label);
    const save = _pfDebounce(() => { profileSet({ [key]: profileText(i.value, max) }); changed(); }, 400);
    i.oninput = save; i.onblur = () => { const v = profileText(i.value, max); if (i.value !== v) i.value = v; };
    if (list) { const dl = _pfEl('datalist'); dl.id = 'pf-dl-' + key; for (const v of list) { const o = _pfEl('option'); o.value = v; dl.appendChild(o); } i.setAttribute('list', dl.id); i._dl = dl; }
    return i;
  };
  const nm = input('name', PF_MAX.name, (typeof userName === 'function' && userName()) || 'Your name', 'Display name');
  body.appendChild(_settingsRow('Display name', 'Shown on your card and to friends. Greetings still use the name in Name & region.', nm));
  const pr = input('pronouns', PF_MAX.pronouns, 'Optional', 'Pronouns', ['she/her', 'he/him', 'they/them', 'she/they', 'he/they', 'any pronouns']);
  const prRow = _settingsRow('Pronouns', 'Optional.', pr); prRow.appendChild(pr._dl);
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
  const wkRow = _settingsRow("What I'm working on", doing.length ? 'Type it, or pick one of the tasks you are doing.' : 'One line.', wk); wkRow.appendChild(wk._dl);
  body.appendChild(wkRow);
  body.appendChild(_settingsRow('Card colour', 'The colour of your card, your ring and what friends see.', _pfSwatchRow(p.theme, (v) => { profileSet({ theme: v }); changed(); }, true)));
  body.appendChild(_settingsRow('Reacts to your day', 'Your avatar grins on a streak, sparkles when the week’s quests are done, gets sleepy late at night and wears a party hat on your birthday.',
    _settingsSwitch(p.react, 'Reacts to your day', (on) => { profileSet({ react: on }); changed(); if (typeof renderMain === 'function') renderMain(); })));
  return card;
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

/* ---------- the character builder ---------- */
function _pfBuilderCard(changed) {
  const { card, body } = _settingsCard('Your avatar', 'Pick each part. Some open up as you level up, earn achievements or when their season comes round, and stay yours.');
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
    const rb = _pfBtn('Randomise', 'wand-sparkles', (e) => randomise(!!e.shiftKey));
    rb.setAttribute('data-tip', 'A new look (your skin tone stays). Shift+click: only this tab');
    const ub = _pfBtn('', 'undo-2', undo, 'btn-ghost'); ub.setAttribute('aria-label', 'Undo'); ub.setAttribute('data-tip', 'Undo'); ub.setAttribute('data-kbd', 'Ctrl+Z'); ub.disabled = !_pfUI.undo.length;
    const reb = _pfBtn('', 'redo-2', redo, 'btn-ghost'); reb.setAttribute('aria-label', 'Redo'); reb.setAttribute('data-tip', 'Redo'); reb.setAttribute('data-kbd', 'Ctrl+Shift+Z'); reb.disabled = !_pfUI.redo.length;
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
    panel.appendChild(tabs);
    const list = _pfEl('div', 'pf-b-parts');
    for (const part of PF_PARTS) {
      if (part.tab !== _pfUI.tab) continue;
      if (_pfHidePart(part.k, a)) continue;
      const sec = _pfEl('div', 'pf-b-part');
      const h = _pfEl('div', 'pf-b-part-h'); h.appendChild(_pfEl('span', null, part.label));
      if (part.figure) h.appendChild(_pfEl('span', 'pf-b-tag', 'full figure'));
      sec.appendChild(h);
      const opts = _pfEl('div', part.colour ? 'pf-b-cols' : part.figure ? 'pf-b-chips' : 'pf-b-opts');
      for (const o of pfOptions(part.k)) {
        const why = profileLockOf(part.k, o.id, ctx), on = a[part.k] === o.id;
        const b = _pfEl('button', part.colour ? 'pf-sw' : part.figure ? 'chip chip-lg pf-b-chip' : 'pf-b-opt'); b.type = 'button';
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.setAttribute('aria-label', o.label + (why ? ' (locked: ' + why + ')' : ''));
        b.setAttribute('data-tip', why ? `${o.label}: ${why}` : o.label);
        if (why) { b.classList.add('is-locked'); b.setAttribute('aria-disabled', 'true'); }
        if (part.colour) b.style.setProperty('--sw', o.hex);
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
  return (k === 'glassesCol' && (a.glasses === 'none' || a.glasses === 'heart')) || (k === 'hatCol' && ['none', 'crown', 'grad', 'witch', 'santa', 'flowers'].includes(a.hat))
    || (k === 'headphonesCol' && a.headphones === 'none') || (k === 'scarfCol' && a.scarf === 'none') || (k === 'scarf2Col' && a.scarf !== 'striped')
    || (k === 'bagCol' && a.bag === 'none') || (k === 'eyeCol' && !['round', 'wide'].includes(a.eyes)) || (k === 'topCol' && a.top === 'lab');
}
/** Sensible company: a hat that hides headphones' band is fine, but a headscarf goes without headphones. */
function _pfPairs(k, id, a) {
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
      const e = _pfEl('div', 'set-h', 'No achievements yet. They come from finishing tasks, streaks, focus and more.');
      body.appendChild(e);
      if (typeof setView === 'function') body.appendChild(_pfBtn('See the achievements', 'award', () => setView('game')));
      return;
    }
    const auto = !Array.isArray(p.badges);
    body.appendChild(_settingsRow('Show', null, _settingsSeg([['auto', 'Newest three'], ['pick', 'My pick']], auto ? 'auto' : 'pick', (k) => {
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
  const { card, body } = _settingsCard('Favourite places', 'Up to five. Names only, never coordinates. Friends see them only if you switch it on under Friends.');
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
      const line = _pfEl('div', 'pf-st-line'); line.append(i, dl, _pfBtn('Add', 'plus', () => add(i.value)));
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
  const { card, body } = _settingsCard('What friends see', 'Your card goes to your friends through OpenDash Friends, end-to-end encrypted. Your level and streak are shared by the game.');
  const F = _pfFriends();
  const paint = () => {
    body.replaceChildren();
    const sh = profileGet().share;
    body.appendChild(_settingsRow('What goes', 'Your display name, pronouns, bio, status, what you are working on, the card colour, your avatar and the badges you show. Nothing else from your dashboard.', null));
    body.appendChild(_settingsRow('Favourite places', 'Off unless you switch it on. Names only.', _settingsSwitch(!!sh.places, 'Share favourite places with friends', (on) => { profileSet({ share: { places: on } }); paint(); })));
    const acts = _pfEl('div', 'pf-b-acts');
    acts.appendChild(_pfBtn(_pfUI.preview ? 'Hide the preview' : 'Preview what friends see', 'eye', () => { _pfUI.preview = !_pfUI.preview; paint(); }));
    if (F) acts.appendChild(_pfBtn('Send it now', 'send', async (e, b) => { b.disabled = true; const ok = await profileShareNow(true); b.disabled = false; toast(ok ? 'Your card is on its way to your friends.' : 'Not sent yet: Friends is not ready. It goes as soon as it is.', { icon: ok ? 'send' : 'cloud-off', kind: ok ? 'ok' : undefined }); }));
    else acts.appendChild(_pfEl('span', 'set-h', 'Friends is not set up on this dashboard yet; your card goes as soon as it is.'));
    body.appendChild(acts);
    if (_pfUI.preview) { const pv = _pfEl('div', 'pf-preview'); pv.appendChild(profileCardEl(null, { preview: true })); body.appendChild(pv); }
  };
  paint();
  return card;
}

/* ---------- the command palette ---------- */
if (typeof registerCommand === 'function') {
  registerCommand({ id: 'profile-open', group: 'Go to', label: 'Profile: your card and avatar', icon: 'user-round', keywords: 'profile me avatar character name bio pronouns status badges places card', run: () => setView('settings:me') });
  registerCommand({ id: 'profile-avatar', label: 'Customise your avatar', icon: 'wand-sparkles', keywords: 'avatar character builder customise hair outfit hat glasses face', run: () => { setView('settings:me'); setTimeout(() => { const b = document.getElementById('pf-builder'); if (b) b.scrollIntoView({ block: 'start' }); }, 60); } });
  registerCommand({ id: 'profile-status', label: 'Set your status', icon: 'circle-user', keywords: 'status away busy focusing holiday travelling emoji', run: () => profileOpenPop() });
  registerCommand({ id: 'profile-status-clear', label: 'Clear your status', icon: 'x', keywords: 'status clear', when: () => !!profileStatusNow(), run: () => { profileSet({ status: { emoji: '', text: '', until: 0 } }); toast('Status cleared.', { icon: 'circle-user' }); } });
  registerCommand({ id: 'profile-random', label: 'Randomise your avatar', icon: 'wand-sparkles', keywords: 'avatar random surprise shuffle new look', run: () => {
    const before = profileGet().avatar, ctx = profileUnlockCtx();
    profileSet({ avatar: profileAvatarRandom(Math.random, (k, id) => !profileLockOf(k, id, ctx), { skin: before.skin }) });
    toast('A new look.', { icon: 'wand-sparkles', action: { label: 'Undo', run: () => profileSet({ avatar: before }) } });
  } });
}
