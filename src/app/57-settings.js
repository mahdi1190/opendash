/* ============================================================
   SETTINGS (#view=settings, #view=settings:<group>). Owner: Connections/Settings.
   A left list of groups and one group at a time, like a desktop app.
   Groups register with registerSettingsGroup({id, title, icon, description,
   order, render(el)}); the same id replaces. More groups live in
   58-settings-streams.js (Streams, Templates) and 58-settings-data.js
   (Data, Diagnostics). Settings that belong to the user's machine and
   data folder (name, region, AI, notifications) are saved to config.json
   with PUT /api/config; look-and-feel lives in the state (saveUI).
   ============================================================ */
const SETTINGS_GROUPS = [];
/** registerSettingsGroup({id, title, icon, description, order, render(el)}) - same id replaces. */
function registerSettingsGroup(def) {
  const i = SETTINGS_GROUPS.findIndex(g => g.id === def.id);
  const g = Object.assign({ order: 50, icon: 'settings' }, def);
  if (i >= 0) SETTINGS_GROUPS[i] = g; else SETTINGS_GROUPS.push(g);
  SETTINGS_GROUPS.sort((a, b) => a.order - b.order);
}
function _settingsRow(label, hint, control) {
  const row = document.createElement('div'); row.className = 'set-row';
  const l = document.createElement('div'); l.className = 'set-l';
  l.innerHTML = `<div class="set-t">${esc(label)}</div>` + (hint ? `<div class="set-h">${esc(hint)}</div>` : '');
  const c = document.createElement('div'); c.className = 'set-c';
  if (control) c.appendChild(control);
  row.append(l, c);
  return row;
}
function _settingsSeg(options, current, onPick) {
  const seg = document.createElement('div'); seg.className = 'seg';
  for (const [k, label, ic] of options) {
    const b = document.createElement('button'); b.type = 'button';
    b.innerHTML = (ic ? icon(ic) : '') + `<span>${esc(label)}</span>`;
    b.setAttribute('aria-pressed', current === k ? 'true' : 'false');
    b.onclick = () => onPick(k);
    seg.appendChild(b);
  }
  return seg;
}
function _settingsSwitch(on, label, onToggle, disabled) {
  const sw = document.createElement('button'); sw.type = 'button'; sw.className = 'switch'; sw.setAttribute('role', 'switch');
  sw.setAttribute('aria-checked', on ? 'true' : 'false'); sw.setAttribute('aria-label', label);
  if (disabled) sw.disabled = true;
  sw.onclick = () => onToggle(sw.getAttribute('aria-checked') !== 'true');
  return sw;
}
function _settingsSelect(options, current, onPick, cls) {
  const s = document.createElement('select'); s.className = 'control control-sm ' + (cls || '');
  for (const o of options) {
    const [v, label] = Array.isArray(o) ? o : [o, o];
    const op = document.createElement('option'); op.value = v; op.textContent = label;
    if (v === current) op.selected = true;
    s.appendChild(op);
  }
  if (current && !options.some(o => (Array.isArray(o) ? o[0] : o) === current)) {
    const op = document.createElement('option'); op.value = current; op.textContent = current; op.selected = true; s.prepend(op);
  }
  s.onchange = () => onPick(s.value);
  return s;
}
function _settingsCard(title, desc) {
  const card = document.createElement('section'); card.className = 'card set-card';
  if (title) {
    const h = document.createElement('div'); h.className = 'set-head';
    h.innerHTML = `<h2>${esc(title)}</h2>` + (desc ? `<p>${esc(desc)}</p>` : '');
    card.appendChild(h);
  }
  const body = document.createElement('div'); body.className = 'set-body';
  card.appendChild(body);
  return { card, body };
}

/** Save part of config.json; updates APP_CONFIG in place. Returns true on success. */
async function settingsSaveConfig(patch, okMsg) {
  try {
    const r = await fetch('/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
    for (const k of Object.keys(j)) {
      if (j[k] && typeof j[k] === 'object' && !Array.isArray(j[k])) APP_CONFIG[k] = Object.assign({}, APP_CONFIG[k] || {}, j[k]);
      else APP_CONFIG[k] = j[k];
    }
    if (okMsg !== false) toast(okMsg || 'Saved', { kind: 'ok' });
    return true;
  } catch (e) {
    toast('Not saved: ' + ((e && e.message) || 'the OpenDash server is not running'), { kind: 'err' });
    return false;
  }
}

/* ---------- Profile & region ---------- */
const SETTINGS_CURRENCIES = ['GBP', 'EUR', 'USD', 'CAD', 'AUD', 'NZD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'JPY', 'INR', 'SGD', 'HKD', 'ZAR', 'BRL', 'MXN', 'AED'];
const SETTINGS_LOCALES = [['en-GB', 'English (UK)'], ['en-US', 'English (US)'], ['en-IE', 'English (Ireland)'], ['en-AU', 'English (Australia)'], ['en-CA', 'English (Canada)'],
  ['en-IN', 'English (India)'], ['de-DE', 'Deutsch'], ['fr-FR', 'Français'], ['es-ES', 'Español'], ['it-IT', 'Italiano'], ['nl-NL', 'Nederlands'],
  ['pt-PT', 'Português'], ['pt-BR', 'Português (Brasil)'], ['sv-SE', 'Svenska'], ['da-DK', 'Dansk'], ['nb-NO', 'Norsk'], ['pl-PL', 'Polski'], ['ja-JP', '日本語']];
function settingsTimeZones() {
  try { if (Intl.supportedValuesOf) return Intl.supportedValuesOf('timeZone'); } catch (e) { /* older browser */ }
  return ['UTC', 'Europe/London', 'Europe/Dublin', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney'];
}
function settingsDateExample(locale, tz) {
  try { return new Date().toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: tz }); } catch (e) { return ''; }
}
/**
 * The Time zone row's note. cfgTz: config.timezone (what the server, the
 * assistant, the stories and calendar sync use); here: this browser's zone
 * (what the page's own clock shows). -> {mismatch, text}
 */
function settingsZoneNote(cfgTz, here) {
  here = here || 'UTC';
  if (!cfgTz || cfgTz === here) return { mismatch: false, text: `This computer is on ${here} too.` };
  return { mismatch: true, text: `This computer is on ${here}. Pages show its clock, but the stories, the assistant and updates use ${cfgTz}.` };
}
registerSettingsGroup({
  id: 'profile', title: 'Profile & region', icon: 'circle-user', order: 10,
  description: 'Your name and how dates and money are shown. Stored in config.json in your data folder.',
  render(el) {
    const cfg = APP_CONFIG;
    const name = document.createElement('input'); name.className = 'control control-sm set-input'; name.maxLength = 60;
    name.value = cfg.userName || ''; name.placeholder = 'Your first name';
    const saveName = async () => {
      const v = name.value.trim();
      if (v === (APP_CONFIG.userName || '')) return;
      if (await settingsSaveConfig({ userName: v }, 'Name saved')) { document.title = appTitle(); render(); }
    };
    name.onblur = saveName;
    name.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); name.blur(); } };
    el.appendChild(_settingsRow('Name', 'Used in greetings and the app title. Leave empty for just “OpenDash”.', name));
    // Sources: your own addresses. Calendars named after anyone else's address start hidden.
    const mails = document.createElement('textarea'); mails.className = 'control control-sm set-input set-emails'; mails.rows = 2;
    mails.value = (cfg.myEmails || []).join('\n'); mails.placeholder = 'you@example.org';
    mails.setAttribute('aria-label', 'Your email addresses, one per line');
    mails.onblur = async () => {
      const list = mails.value.split(/[\s,;]+/).map(x => x.trim().toLowerCase()).filter(Boolean);
      if (list.join('|') === (APP_CONFIG.myEmails || []).join('|')) return;
      if (await settingsSaveConfig({ myEmails: list }, 'Email addresses saved')) {
        mails.value = (APP_CONFIG.myEmails || []).join('\n');
        if (typeof CalStore !== 'undefined' && CalStore.st.loaded) CalStore.load(true);
      }
    };
    el.appendChild(_settingsRow('Your email addresses', 'One per line. Calendars of other people (named after an address not listed here) start switched off; yours and shared group calendars start on.', mails));
    const reloadHint = () => toast('Saved. Reload to update every view.', { kind: 'ok', action: { label: 'Reload', run: () => location.reload() }, timeout: 8000 });
    el.appendChild(_settingsRow('Currency', 'Used by Finances.', _settingsSelect(SETTINGS_CURRENCIES, cfg.currency,
      async (v) => { if (await settingsSaveConfig({ currency: v }, false)) reloadHint(); })));
    const ex = document.createElement('div'); ex.className = 'set-h set-example';
    const updEx = () => { ex.textContent = 'Example: ' + settingsDateExample(APP_CONFIG.locale, APP_CONFIG.timezone); };
    updEx();
    const loc = _settingsSelect(SETTINGS_LOCALES, cfg.locale, async (v) => { if (await settingsSaveConfig({ locale: v }, false)) { updEx(); reloadHint(); render(); } });
    const locRow = _settingsRow('Language and date format', null, loc);
    locRow.querySelector('.set-l').appendChild(ex);
    el.appendChild(locRow);
    // Time zone (config.timezone): a new data folder starts on this computer's zone. When the
    // browser is somewhere else (a trip, a copied data folder), say so and offer a one-click fix.
    const here = browserTimeZone();
    const saveTz = async (v) => {
      if (!(await settingsSaveConfig({ timezone: v }, false))) return;
      if (![...tzSel.options].some(o => o.value === v)) { const op = document.createElement('option'); op.value = v; op.textContent = v; tzSel.prepend(op); }
      tzSel.value = v; updEx(); paintTz(); reloadHint();
    };
    const tzSel = _settingsSelect(settingsTimeZones(), cfg.timezone, saveTz, 'set-tz');
    tzSel.setAttribute('aria-label', 'Time zone');
    const tzUse = document.createElement('button'); tzUse.type = 'button'; tzUse.className = 'btn btn-secondary btn-sm set-tz-use';
    tzUse.textContent = 'Use ' + here;
    tzUse.onclick = () => saveTz(here);
    const tzNote = document.createElement('div'); tzNote.className = 'set-h set-tz-note';
    const paintTz = () => {
      const n = settingsZoneNote(APP_CONFIG.timezone, here);
      tzNote.textContent = n.text;
      tzNote.classList.toggle('is-warn', n.mismatch);
      tzUse.hidden = !n.mismatch;
    };
    paintTz();
    const tzRow = _settingsRow('Time zone', '“Today”, due dates, the stories and the assistant follow this.', tzSel);
    tzRow.querySelector('.set-l').appendChild(tzNote);
    tzRow.querySelector('.set-c').appendChild(tzUse);
    el.appendChild(tzRow);
    el.appendChild(_settingsRow('Week starts on', 'Calendars and week views.', _settingsSeg(
      [['Mon', 'Monday'], ['Sun', 'Sunday'], ['Sat', 'Saturday']], cfg.weekStart,
      async (k) => { if (await settingsSaveConfig({ weekStart: k })) render(); })));
    if (typeof briefSettingsLocationRow === 'function') el.appendChild(briefSettingsLocationRow());   // weather town (78-brief-hooks.js)
  },
});

/* ---------- Appearance ---------- */
registerSettingsGroup({
  id: 'appearance', title: 'Appearance', icon: 'palette', order: 20,
  description: 'How the dashboard looks on this device.',
  render(el) {
    const themeNow = state.autoTheme ? 'auto' : (state.theme === 'dark' ? 'dark' : 'light');
    el.appendChild(_settingsRow('Theme', 'Auto switches to dark in the evening.', _settingsSeg(
      [['light', 'Light', 'sun'], ['dark', 'Dark', 'moon'], ['auto', 'Auto', 'sun-moon']], themeNow,
      (k) => { state.autoTheme = k === 'auto'; if (k !== 'auto') state.theme = k; else applyAutoTheme(); saveUI(); render(); })));
    el.appendChild(_settingsRow('Task rows', 'Compact fits more on screen.', _settingsSeg(
      [['normal', 'Comfortable'], ['compact', 'Compact']], state.density === 'compact' ? 'compact' : 'normal',
      (k) => { state.density = k; saveUI(); render(); })));
    const sys = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const on = !!(window.Motion && Motion.prefersReduced());
    el.appendChild(_settingsRow('Reduce motion', sys ? 'Your system setting already asks for reduced motion.' : 'Turns interface animations down to the minimum on this device.',
      _settingsSwitch(on, 'Reduce motion', () => { if (window.Motion) { Motion.setReduced(!Motion.prefersReduced()); render(); } }, sys)));
    el.appendChild(_settingsRow('Default theme for new devices', 'What a new browser starts with.', _settingsSeg(
      [['light', 'Light'], ['dark', 'Dark']], (APP_CONFIG.theme && APP_CONFIG.theme.default) || 'light',
      async (k) => { if (await settingsSaveConfig({ theme: { default: k } })) render(); })));
  },
});

/* ---------- AI ---------- */
const SETTINGS_MODELS = [['claude-opus-5-5', 'Opus 5.5 (most capable)'], ['claude-sonnet-5', 'Sonnet 5 (balanced)'], ['claude-haiku-4-5', 'Haiku 4.5 (fastest)']];
registerSettingsGroup({
  id: 'ai', title: 'AI', icon: 'sparkles', order: 50,
  description: 'Which Claude model does what. Calls use your own Claude plan through Claude Code; nothing extra to pay.',
  render(el) {
    const ok = window.Connections ? Connections.has('claude') : AI_AVAILABLE;
    const st = document.createElement('div'); st.className = 'callout set-callout' + (ok ? '' : ' warn');
    st.innerHTML = icon(ok ? 'circle-check' : 'plug') + `<span>${ok ? 'Claude is connected.' : 'Claude is not connected yet, so AI features are greyed out.'}</span>`;
    const go = document.createElement('button'); go.type = 'button'; go.className = 'btn btn-secondary btn-sm'; go.innerHTML = icon('plug') + '<span>Connections</span>';
    go.onclick = () => setView('connections');
    st.appendChild(go);
    el.appendChild(st);
    const cfg = APP_CONFIG.ai || {};
    el.appendChild(_settingsRow('Assistant', 'Used when you talk to the dashboard and for task chat.', _settingsSelect(SETTINGS_MODELS, cfg.chatModel,
      (v) => settingsSaveConfig({ ai: { chatModel: v } }))));
    el.appendChild(_settingsRow('Quick jobs', 'Suggestions, linking people, tidy-ups. A fast model keeps these snappy.', _settingsSelect(SETTINGS_MODELS, cfg.model,
      (v) => settingsSaveConfig({ ai: { model: v } }))));
    el.appendChild(_settingsRow('Thinking effort', 'Higher is more careful and slower.', _settingsSeg(
      [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], cfg.effort || 'medium',
      async (k) => { if (await settingsSaveConfig({ ai: { effort: k } })) render(); })));
    const style = document.createElement('textarea'); style.className = 'control set-textarea'; style.maxLength = 500; style.rows = 3;
    style.placeholder = 'e.g. Be brief. Use British spelling.';
    style.value = cfg.style || '';
    style.onblur = () => { if (style.value !== (APP_CONFIG.ai.style || '')) settingsSaveConfig({ ai: { style: style.value } }); };
    const row = _settingsRow('Tone and style', 'An extra instruction added to every AI request (500 characters).', null);
    row.classList.add('set-row-stack');
    row.appendChild(style);
    el.appendChild(row);
  },
});

/* ---------- Notifications ---------- */
registerSettingsGroup({
  id: 'notifications', title: 'Notifications', icon: 'bell', order: 60,
  description: 'Desktop notifications while the dashboard is open in a browser tab.',
  render(el) {
    const n = APP_CONFIG.notifications || { enabled: false, dueDigest: true, eventLeadMin: 10 };
    const supported = typeof Notification !== 'undefined';
    const perm = supported ? Notification.permission : 'unsupported';
    const hint = !supported ? 'This browser does not support notifications.'
      : perm === 'denied' ? 'Notifications are blocked for this page in your browser settings.'
        : 'Asks your browser for permission the first time.';
    el.appendChild(_settingsRow('Show notifications', hint, _settingsSwitch(!!n.enabled && perm === 'granted', 'Show notifications', async (on) => {
      if (on && supported && Notification.permission !== 'granted') {
        const p = await Notification.requestPermission().catch(() => 'denied');
        if (p !== 'granted') { toast('The browser did not allow notifications.', { kind: 'err' }); render(); return; }
      }
      if (await settingsSaveConfig({ notifications: { enabled: on } }, on ? 'Notifications on' : 'Notifications off')) render();
    }, !supported || perm === 'denied')));
    const dis = !n.enabled;
    el.appendChild(_settingsRow('Morning summary', 'Once a day: how many tasks are due today and overdue.', _settingsSwitch(n.dueDigest !== false, 'Morning summary',
      async (on) => { if (await settingsSaveConfig({ notifications: { dueDigest: on } }, false)) render(); }, dis)));
    const lead = _settingsSelect([['0', 'Off'], ['5', '5 minutes before'], ['10', '10 minutes before'], ['15', '15 minutes before'], ['30', '30 minutes before']],
      String(n.eventLeadMin ?? 10), (v) => settingsSaveConfig({ notifications: { eventLeadMin: Number(v) } }, false));
    if (dis) lead.disabled = true;
    el.appendChild(_settingsRow('Before calendar events', 'Needs your calendar (Connections).', lead));
    const test = document.createElement('button'); test.type = 'button'; test.className = 'btn btn-secondary btn-sm';
    test.innerHTML = icon('bell') + '<span>Send a test</span>';
    test.disabled = !(n.enabled && perm === 'granted');
    test.onclick = () => notifyShow('Notifications work', 'You will see reminders like this while the dashboard is open.', 'test');
    el.appendChild(_settingsRow('Test', null, test));
  },
});

/* ---------- About ---------- */
registerSettingsGroup({
  id: 'about', title: 'About', icon: 'info', order: 99,
  render(el) {
    const dl = document.createElement('dl'); dl.className = 'kv';
    dl.innerHTML = `<dt>App</dt><dd><span class="set-ver">OpenDash</span> · MIT licence</dd>`
      + `<dt>Project</dt><dd><a href="https://github.com/mahdi1190/opendash" target="_blank" rel="noopener noreferrer">github.com/mahdi1190/opendash</a> · <a href="https://github.com/mahdi1190/opendash/tree/main/docs" target="_blank" rel="noopener noreferrer">Docs</a></dd>`
      + `<dt>Runs on</dt><dd>This computer only (127.0.0.1). No account, no cloud, no tracking.</dd>`
      + `<dt>Font</dt><dd>Inter · SIL Open Font License 1.1</dd>`
      + `<dt>Icons</dt><dd>Lucide · ISC licence</dd>`
      + `<dt>Charts</dt><dd>Apache ECharts · Apache License 2.0</dd>`;
    el.appendChild(dl);
    const p = document.createElement('p'); p.className = 'set-h set-foot';
    p.textContent = 'The OpenDash licence is in LICENSE; full third-party licence texts are in THIRD_PARTY_NOTICES.md and vendor/ in the app folder.';
    el.appendChild(p);
    fetch('/api/settings/info', { cache: 'no-store' }).then(r => r.json()).then(j => {
      const s = dl.querySelector('.set-ver'); if (s && j && j.version) s.textContent = 'OpenDash ' + j.version;
    }).catch(() => {});
  },
});

/* ---------- the page ---------- */
function _settingsGroupFromView(v) {
  const m = /^settings:([a-z-]+)$/.exec(String(v || ''));
  const id = m ? m[1] : null;
  return SETTINGS_GROUPS.find(g => g.id === id) || SETTINGS_GROUPS[0];
}
registerSection('settings', {
  group: 'system',
  match: v => v === 'settings' || /^settings:[a-z-]+$/.test(v),
  title: () => 'Settings',
  crumb: (v) => { const g = _settingsGroupFromView(v); return g && v !== 'settings' ? ['Settings', g.title] : ['Settings']; },
  mount(container, view) {
    const sub = document.getElementById('view-subtitle'); if (sub) sub.textContent = '';
    const cur = _settingsGroupFromView(view || state.view);
    const wrap = document.createElement('div'); wrap.className = 'settings';
    const nav = document.createElement('nav'); nav.className = 'set-nav'; nav.setAttribute('aria-label', 'Settings');
    for (const g of SETTINGS_GROUPS) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'set-nav-item' + (g === cur ? ' on' : '');
      if (g === cur) b.setAttribute('aria-current', 'page');
      b.innerHTML = icon(g.icon || 'settings') + `<span>${esc(g.title)}</span>`;
      b.onclick = () => setView('settings:' + g.id);
      nav.appendChild(b);
      if (g.id === 'notifications') {
        const c = document.createElement('button'); c.type = 'button'; c.className = 'set-nav-item';
        c.innerHTML = icon('plug') + '<span>Connections</span>' + icon('arrow-right', 'i-xs set-nav-out');
        c.onclick = () => setView('connections');
        nav.appendChild(c);
      }
    }
    const main = document.createElement('div'); main.className = 'set-main';
    if (cur) {
      const head = document.createElement('div'); head.className = 'set-page-h';
      head.innerHTML = `<h2>${esc(cur.title)}</h2>` + (cur.description ? `<p>${esc(cur.description)}</p>` : '');
      main.appendChild(head);
      const body = document.createElement('div'); body.className = 'set-group'; body.dataset.group = cur.id;
      try { cur.render(body); } catch (e) { console.error('[settings ' + cur.id + ']', e); body.textContent = 'This part of Settings failed to load.'; }
      main.appendChild(body);
    }
    wrap.append(nav, main);
    container.appendChild(wrap);
  },
});

registerCommand({ id: 'open-settings', label: 'Settings', icon: 'settings', group: 'Go to', keywords: 'preferences options profile appearance', run: () => setView('settings') });
