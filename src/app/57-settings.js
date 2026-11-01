/* ============================================================
   SETTINGS (#view=settings, #view=settings:<group>). Owner: Connections/Settings.
   A left list of groups and one group at a time, like a desktop app.
   Groups register with registerSettingsGroup({id, title, icon, description,
   order, render(el)}); the same id replaces. More groups live in
   58-settings-streams.js (Streams, Templates) and 58-settings-data.js
   (Data, Diagnostics). Settings that belong to the user's machine and
   data folder (name, region, AI, notifications) are saved to config.json
   with PUT /api/config; look-and-feel lives in the state (saveUI).
   2.18 (SIMPLIFY_PLAN.md 5.1): the nav prints seven section headings. A group is
   placed only through SETTINGS_SECTIONS (id -> section, in nav order), so no
   other file has to change its registration; a group the map does not know
   sits beside the known group just before it (by `order`).
   ============================================================ */
const SETTINGS_GROUPS = [];
/** The nav's section headings, in order (SIMPLIFY_PLAN.md 5.1). */
const SETTINGS_SECTION_ORDER = ['You', 'Look and feel', 'Tasks and Home', 'AI and connections', 'Your computers', 'Friends and privacy', 'Data'];
/** Group id -> section heading; the key order is the order inside a section. */
const SETTINGS_SECTIONS = {
  me: 'You', profile: 'You', time: 'You',
  appearance: 'Look and feel', animations: 'Look and feel', game: 'Look and feel',
  tasks: 'Tasks and Home', streams: 'Tasks and Home', templates: 'Tasks and Home', home: 'Tasks and Home', brief: 'Tasks and Home', suggestions: 'Tasks and Home', autolink: 'Tasks and Home',
  ai: 'AI and connections', email: 'AI and connections', notifications: 'AI and connections',
  sync: 'Your computers', relay: 'Your computers', server: 'Your computers', updates: 'Your computers',
  friends: 'Friends and privacy', privacy: 'Friends and privacy', locations: 'Friends and privacy',
  data: 'Data', diagnostics: 'Data', advanced: 'Data', about: 'Data',
};
/** The section a group is listed under. */
function settingsSectionOf(g) {
  if (!g) return SETTINGS_SECTION_ORDER[SETTINGS_SECTION_ORDER.length - 1];
  if (SETTINGS_SECTIONS[g.id]) return SETTINGS_SECTIONS[g.id];
  let near = null;
  for (const x of SETTINGS_GROUPS) if (SETTINGS_SECTIONS[x.id] && x.order <= g.order && (!near || x.order >= near.order)) near = x;
  return near ? SETTINGS_SECTIONS[near.id] : SETTINGS_SECTION_ORDER[SETTINGS_SECTION_ORDER.length - 1];
}
/** The groups in nav order: by section, then by their place in SETTINGS_SECTIONS, then by `order`. */
function settingsNavGroups() {
  const keys = Object.keys(SETTINGS_SECTIONS);
  const rank = (g) => { const i = keys.indexOf(g.id); return i < 0 ? Infinity : i; };
  return SETTINGS_GROUPS.map((g, i) => ({ g, i, s: SETTINGS_SECTION_ORDER.indexOf(settingsSectionOf(g)) }))
    .sort((a, b) => (a.s - b.s) || (rank(a.g) === rank(b.g) ? 0 : rank(a.g) === Infinity ? 1 : rank(b.g) === Infinity ? -1 : rank(a.g) - rank(b.g)) || (a.g.order - b.g.order) || (a.i - b.i))
    .map(x => x.g);
}
/** registerSettingsGroup({id, title, icon, description, order, render(el)}) - same id replaces. */
function registerSettingsGroup(def) {
  const i = SETTINGS_GROUPS.findIndex(g => g.id === def.id);
  const g = Object.assign({ order: 50, icon: 'settings' }, def);
  if (i >= 0) SETTINGS_GROUPS[i] = g; else SETTINGS_GROUPS.push(g);
  SETTINGS_GROUPS.sort((a, b) => a.order - b.order);
}
function _settingsRow(label, hint, control) {
  const row = document.createElement('div'); row.className = 'set-row';
  row.dataset.settingLabel = label;
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
  if (title) card.dataset.settingLabel = title;
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
    if (okMsg) toast(okMsg, { kind: 'ok' }); else if (okMsg !== false && typeof saveStatusFlash === 'function') saveStatusFlash();
    return true;
  } catch (e) {
    // Try again sends the same change (and repaints the page so the control shows it).
    toastError('save the setting', e, async () => { if (await settingsSaveConfig(patch, okMsg) && typeof renderMain === 'function') renderMain(); });
    return false;
  }
}

/** Open a Settings group at one row (and the fold it is in), as Settings search does. */
function settingsOpenRow(group, label) {
  if (typeof settingsSearchOpen === 'function') settingsSearchOpen({ group, label, target: label });
  else setView('settings:' + group);
}
/** A model's short name: 'claude-haiku-4-5' -> 'Haiku 4.5'. */
function settingsModelName(id) {
  const m = SETTINGS_MODELS.find(x => x[0] === id);
  return m ? m[1].replace(/\s*\(.*\)\s*$/, '') : String(id || 'default');
}
/**
 * Where a model picker used to be (SIMPLIFY_PLAN.md L13): one grey line, "Uses the Haiku 4.5
 * model (Settings > AI)"; the link opens AI > Models for each job at that job's row.
 */
function settingsModelNote(job, modelId) {
  const p = document.createElement('div'); p.className = 'set-h set-model-note';
  p.append(document.createTextNode(`Uses the ${settingsModelName(modelId)} model (`));
  p.appendChild(uiButton({ label: 'Settings > AI', kind: 'link', run: () => settingsOpenRow('ai', job) }));
  p.append(document.createTextNode(')'));
  return p;
}
/** Add a note line (an element) under a row's hint. Returns the row. */
function settingsRowNote(row, note) {
  const l = row && row.querySelector('.set-l');
  if (l && note) l.appendChild(note);
  return row;
}

/* ---------- Region & language (id 'profile': links and settings:profile keep working) ---------- */
const SETTINGS_CURRENCIES = ['GBP', 'EUR', 'USD', 'CAD', 'AUD', 'NZD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'JPY', 'INR', 'SGD', 'HKD', 'ZAR', 'BRL', 'MXN', 'AED'];
const SETTINGS_LOCALES = [['en-GB', 'English (UK)'], ['en-US', 'English (US)'], ['en-IE', 'English (Ireland)'], ['en-AU', 'English (Australia)'], ['en-CA', 'English (Canada)'],
  ['en-IN', 'English (India)'], ['de-DE', 'Deutsch'], ['fr-FR', 'Français'], ['es-ES', 'Español'], ['it-IT', 'Italiano'], ['nl-NL', 'Nederlands'],
  ['pt-PT', 'Português'], ['pt-BR', 'Português (Brasil)'], ['sv-SE', 'Svenska'], ['da-DK', 'Dansk'], ['nb-NO', 'Norsk'], ['pl-PL', 'Polski'], ['ja-JP', '日本語']];
function settingsTimeZones() {
  try { if (Intl.supportedValuesOf) return Intl.supportedValuesOf('timeZone'); } catch (e) { /* older browser */ }
  return ['UTC', 'Europe/London', 'Europe/Dublin', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney'];
}
function settingsDateExample(locale, tz) {
  try { return new Date(Clock.now()).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: tz || Clock.zone() }); } catch (e) { return ''; }
}
/**
 * The Time zone row's note. cfgTz: config.timezone (what the server, the
 * assistant, the stories and calendar sync use); here: this browser's zone
 * (what the page's own clock shows). -> {mismatch, text}
 */
function settingsZoneNote(cfgTz, here) {
  here = here || 'UTC';
  const lab = (z) => (typeof Clock !== 'undefined' && typeof Clock.label === 'function' ? Clock.label(z) : z);
  if (!cfgTz || cfgTz === here) return { mismatch: false, text: `This computer is on ${lab(here)} too.` };
  // Travelling is normal (P6): a grey line and one button, never a warning (L14).
  return { mismatch: true, text: `This computer is on ${lab(here)}. Home is ${lab(cfgTz)}.` };
}
registerSettingsGroup({
  id: 'profile', title: 'Region & language', icon: 'circle-user', order: 10,
  description: 'How dates, times and money look.',
  render(el) {
    const cfg = APP_CONFIG;
    // Your name lives in Profile (it writes config.userName through settingsSaveConfig({userName}), L11);
    // the app icon is in Appearance.
    const reloadHint = () => toast('Saved: reload to update every view', { kind: 'ok', action: { label: 'Reload', run: () => location.reload() }, timeout: 8000 });
    el.appendChild(_settingsRow('Currency', 'Used by Finances.', _settingsSelect(SETTINGS_CURRENCIES, cfg.currency,
      async (v) => { if (await settingsSaveConfig({ currency: v }, false)) reloadHint(); })));
    const ex = document.createElement('div'); ex.className = 'set-h set-example';
    const updEx = () => { ex.textContent = 'Example: ' + settingsDateExample(APP_CONFIG.locale, Clock.zone()); };
    updEx();
    const loc = _settingsSelect(SETTINGS_LOCALES, cfg.locale, async (v) => { if (await settingsSaveConfig({ locale: v }, false)) { updEx(); reloadHint(); render(); } });
    const locRow = _settingsRow('Language and date format', null, loc);
    locRow.querySelector('.set-l').appendChild(ex);
    el.appendChild(locRow);
    // Dashboard time, Home time zone (config.timezone) and Clock: 87-clock-ui.js. Changes apply live.
    // They live in Travel & time (69-travel-ui-settings.js); this page keeps a link (travel spec 6.4).
    const tzLink = typeof trSettingsProfileLink === 'function' ? trSettingsProfileLink() : null;
    if (tzLink) el.appendChild(tzLink);
    else if (typeof clockSettingsRows === 'function') clockSettingsRows(el, { onChange: updEx });
    // A new data folder starts on this computer's zone. When the browser is somewhere else than
    // the home zone (a trip, a copied data folder, a move), one grey line and "Make <zone> home".
    const here = browserTimeZone();
    const hereLabel = typeof Clock !== 'undefined' && typeof Clock.label === 'function' ? Clock.label(here) : here;
    const tzNote = document.createElement('div'); tzNote.className = 'set-h set-tz-note';
    const saveTz = async (v) => {
      if (!(await settingsSaveConfig({ timezone: v }, 'Home time zone saved'))) return;
      if (typeof Clock !== 'undefined' && typeof Clock.refresh === 'function') Clock.refresh('setting');
      updEx(); paintTz(); render();
    };
    const tzUse = uiButton({ label: `Make ${hereLabel} home`, size: 'sm', cls: 'set-tz-use', wait: true, run: () => saveTz(here) });
    function paintTz() {
      const n = settingsZoneNote(APP_CONFIG.timezone, here);
      tzNote.textContent = n.mismatch ? n.text : '';
      tzNote.hidden = !n.mismatch;
      tzUse.hidden = !n.mismatch;
    }
    paintTz();
    if (tzLink && tzLink.querySelector('.set-l') && tzLink.querySelector('.set-c')) {
      tzLink.querySelector('.set-l').appendChild(tzNote);
      tzLink.querySelector('.set-c').appendChild(tzUse);
    } else {
      const tzRow = _settingsRow('This computer', null, tzUse);
      tzRow.querySelector('.set-l').appendChild(tzNote);
      el.appendChild(tzRow);
    }
    el.appendChild(_settingsRow('Week starts on', 'Calendars and week views.', _settingsSeg(
      [['Mon', 'Monday'], ['Sun', 'Sunday'], ['Sat', 'Saturday']], cfg.weekStart,
      async (k) => { if (await settingsSaveConfig({ weekStart: k })) render(); })));
    // Working hours: one control, in Settings > Home (L12); here a link row (20-task-plan.js).
    if (typeof planSettingsWorkHoursLink === 'function') el.appendChild(planSettingsWorkHoursLink());
    if (typeof briefSettingsLocationRow === 'function') el.appendChild(briefSettingsLocationRow());   // weather town (78-brief-hooks.js)
    setFold(el, 'profile-main-more', 'More', ({ body }) => {
      // Your own addresses: calendars named after anyone else's address start hidden.
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
      body.appendChild(_settingsRow('Your email addresses', 'One per line. Used to tell your calendars from other people’s.', mails));
    });
  },
});

/* ---------- Appearance ---------- */
registerSettingsGroup({
  id: 'appearance', title: 'Appearance', icon: 'palette', order: 20,
  description: 'How Freeflo looks. Your other computers follow.',
  render(el) {
    const themeNow = state.autoTheme ? 'auto' : (state.theme === 'dark' ? 'dark' : 'light');
    el.appendChild(_settingsRow('Theme', 'Auto turns dark in the evening.', _settingsSeg(
      [['light', 'Light', 'sun'], ['dark', 'Dark', 'moon'], ['auto', 'Auto', 'sun-moon']], themeNow,
      (k) => { state.autoTheme = k === 'auto'; if (k !== 'auto') state.theme = k; else applyAutoTheme(); saveUI(); render(); })));
    el.appendChild(_settingsRow('Task rows', 'Compact fits more on screen.', _settingsSeg(
      [['normal', 'Comfortable'], ['compact', 'Compact']], state.density === 'compact' ? 'compact' : 'normal',
      (k) => { state.density = k; saveUI(); render(); })));
    const sys = (window.Motion && Motion.systemReduced ? Motion.systemReduced() : !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
    const on = !!(window.Motion && Motion.prefersReduced());
    el.appendChild(_settingsRow('Reduce motion', sys ? 'Your system setting already asks for reduced motion.' : 'Turns interface animations down to the minimum on this device.',
      _settingsSwitch(on, 'Reduce motion', () => { if (window.Motion) { Motion.setReduced(!Motion.prefersReduced()); render(); } }, sys)));
    // The app icon (17-app-icon.js): automatic, or one the user picks (moved here from Region & language).
    const ik = typeof appIconKind === 'function' ? appIconKind(APP_CONFIG.appIcon) : '';
    const ib = uiButton({ label: ({ '': 'Automatic', logo: 'Freeflo logo', initial: 'Initial', icon: 'Icon', emoji: 'Emoji' })[ik] || 'Automatic', size: 'sm', cls: 'set-appicon',
      aria: 'App icon: pick an icon or emoji, or go back to automatic', run: (e, b) => openAppIconPicker(b) });
    const imk = document.createElement('span'); imk.className = 'brand-mark'; imk.setAttribute('aria-hidden', 'true'); setBrandMark(imk, userName());
    ib.prepend(imk);
    el.appendChild(_settingsRow('App icon', 'In the sidebar and the browser tab.', ib));
    setFold(el, 'appearance-main-more', 'More', ({ body }) => {
      body.appendChild(_settingsRow('Theme for a new browser', null, _settingsSeg(
        [['light', 'Light'], ['dark', 'Dark']], (APP_CONFIG.theme && APP_CONFIG.theme.default) || 'light',
        async (k) => { if (await settingsSaveConfig({ theme: { default: k } })) render(); })));
    });
  },
});

/* ---------- AI ---------- */
const SETTINGS_MODELS = [['claude-opus-5-5', 'Opus 5.5 (most capable)'], ['claude-sonnet-5', 'Sonnet 5 (balanced)'], ['claude-haiku-4-5', 'Haiku 4.5 (fastest)']];
registerSettingsGroup({
  id: 'ai', title: 'AI', icon: 'sparkles', order: 50,
  description: 'Which Claude model does what. It uses your own Claude plan.',
  render(el) {
    const ok = window.Connections ? Connections.has('claude') : AI_AVAILABLE;
    // Status first (P1): one line; the one button only when there is something to do.
    el.appendChild(ok ? setStatusLine('ok', 'Connected', 'Claude') : setStatusLine('off', 'Not connected', 'AI features are greyed out'));
    const cfg = APP_CONFIG.ai || {};
    el.appendChild(_settingsRow('Assistant', 'For talking to Freeflo and task chat.', _settingsSelect(SETTINGS_MODELS, cfg.chatModel,
      (v) => settingsSaveConfig({ ai: { chatModel: v } }))));
    el.appendChild(_settingsRow('Quick jobs', 'Suggestions, linking and tidy-ups.', _settingsSelect(SETTINGS_MODELS, cfg.model,
      (v) => settingsSaveConfig({ ai: { model: v } }))));
    el.appendChild(_settingsRow('Thinking effort', 'Higher is more careful and slower.', _settingsSeg(
      [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], cfg.effort || 'medium',
      async (k) => { if (await settingsSaveConfig({ ai: { effort: k } })) render(); })));
    const style = document.createElement('textarea'); style.className = 'control set-textarea'; style.maxLength = 500; style.rows = 3;
    style.placeholder = 'e.g. Be brief. Use British spelling.';
    style.value = cfg.style || '';
    style.onblur = () => { if (style.value !== (APP_CONFIG.ai.style || '')) settingsSaveConfig({ ai: { style: style.value } }); };
    const row = _settingsRow('Tone and style', 'Added to every AI request.', null);
    row.classList.add('set-row-stack');
    row.appendChild(style);
    el.appendChild(row);
    // Finances' wording (config.finance): follows you to your other computers (lib/profile.mjs).
    const finOn = !APP_CONFIG.features || APP_CONFIG.features.finance !== false;
    const fin = APP_CONFIG.finance || {};
    if (finOn) {
      el.appendChild(_settingsRow('Money brief and story', 'Claude words it from totals only; every number is checked.',
        _settingsSwitch(fin.briefAi !== false, 'Claude words the money brief and story', async (on) => { if (await settingsSaveConfig({ finance: { briefAi: on } }, on ? 'Claude words your money brief' : 'Your money brief keeps its own wording')) render(); })));
    }
    if (!ok) setAction(el, 'Connect Claude', () => { if (typeof connOpen === 'function') connOpen('claude'); else setView('connections'); }, { icon: 'plug' });
    // Every per-job model picker in one place (L13); same config keys as before.
    const more = setFold(el, 'ai-main-more', 'Models for each job', ({ body }) => {
      if (finOn) {
        const model = _settingsSelect(SETTINGS_MODELS, fin.briefModel || 'claude-haiku-4-5', (v) => settingsSaveConfig({ finance: { briefModel: v } }));
        model.disabled = fin.briefAi === false;
        body.appendChild(_settingsRow('Money brief', fin.briefAi === false ? 'Off: the money brief keeps its own wording.' : 'The money brief and story.', model));
      }
      if (typeof briefModelRow === 'function') body.appendChild(briefModelRow());          // Morning summary (78-brief-hooks.js)
      if (typeof storyModelRow === 'function') body.appendChild(storyModelRow());          // Story script (79-story-engine.js)
      if (typeof alJudgeModelRow === 'function') body.appendChild(alJudgeModelRow());      // Checking links (66-autolink.js)
      if (typeof animSceneModelRow === 'function') body.appendChild(animSceneModelRow());  // Scene suggestions, read-only (78-brief-hooks.js)
    });
    const sum = more.querySelector('summary'); if (sum) sum.dataset.settingLabel = 'Models for each job';
  },
});

/* ---------- Notifications ---------- */
registerSettingsGroup({
  id: 'notifications', title: 'Notifications', icon: 'bell', order: 60,
  description: 'Reminders while Freeflo is open in a browser tab.',
  render(el) {
    const n = APP_CONFIG.notifications || { enabled: false, dueDigest: true, eventLeadMin: 10 };
    const supported = typeof Notification !== 'undefined';
    const perm = supported ? Notification.permission : 'unsupported';
    const live = !!n.enabled && perm === 'granted';
    el.appendChild(!supported ? setStatusLine('off', 'Off', 'This browser can’t show notifications')
      : perm === 'denied' ? setStatusLine('warn', 'Blocked by this browser', 'Allow notifications for this page in the browser’s site settings')
        : live ? setStatusLine('ok', 'On') : setStatusLine('off', 'Off'));
    const ctl = document.createElement('div'); ctl.className = 'set-btns set-notify-ctl';
    ctl.appendChild(uiButton({ label: 'Send a test', icon: 'bell', size: 'sm', disabled: !live,
      run: () => notifyShow('Notifications work', 'You will see reminders like this while Freeflo is open.', 'test') }));
    ctl.appendChild(_settingsSwitch(live, 'Show notifications', async (on) => {
      if (on && supported && Notification.permission !== 'granted') {
        const p = await Notification.requestPermission().catch(() => 'denied');
        if (p !== 'granted') { toastError('turn on notifications', 'this browser didn’t allow them'); render(); return; }
      }
      if (await settingsSaveConfig({ notifications: { enabled: on } }, on ? 'Notifications on' : 'Notifications off')) render();
    }, !supported || perm === 'denied'));
    el.appendChild(_settingsRow('Show notifications', supported && perm !== 'denied' ? 'Your browser asks once.' : null, ctl));
    const dis = !n.enabled;
    el.appendChild(_settingsRow('Morning summary', 'What’s due today, once a day.', _settingsSwitch(n.dueDigest !== false, 'Morning summary',
      async (on) => { if (await settingsSaveConfig({ notifications: { dueDigest: on } }, false)) render(); }, dis)));
    const lead = _settingsSelect([['0', 'Off'], ['5', '5 minutes before'], ['10', '10 minutes before'], ['15', '15 minutes before'], ['30', '30 minutes before']],
      String(n.eventLeadMin ?? 10), (v) => settingsSaveConfig({ notifications: { eventLeadMin: Number(v) } }, false));
    if (dis) lead.disabled = true;
    el.appendChild(_settingsRow('Before calendar events', 'Needs your calendar (Connections).', lead));
  },
});

/* ---------- About ---------- */
registerSettingsGroup({
  id: 'about', title: 'About', icon: 'info', order: 99,
  render(el) {
    const dl = document.createElement('dl'); dl.className = 'kv';
    dl.innerHTML = `<dt>App</dt><dd><span class="set-ver">Freeflo</span> · MIT licence</dd>`
      + `<dt>Project</dt><dd><a href="https://github.com/mahdi1190/opendash" target="_blank" rel="noopener noreferrer">github.com/mahdi1190/opendash</a> · <a href="https://github.com/mahdi1190/opendash/tree/main/docs" target="_blank" rel="noopener noreferrer">Docs</a></dd>`
      + `<dt>Runs on</dt><dd>This computer. No account and no tracking; sync and friends are encrypted.</dd>`
      + `<dt>Weather</dt><dd>Weather data by Open-Meteo.com · CC BY 4.0</dd>`
      + `<dt>Font</dt><dd>Inter · SIL Open Font License 1.1</dd>`
      + `<dt>Icons</dt><dd>Lucide · ISC licence</dd>`
      + `<dt>Charts</dt><dd>Apache ECharts · Apache License 2.0</dd>`
      + `<dt>Logos</dt><dd>Logos are trademarks of their owners, used only to identify who a payment went to; no endorsement implied.</dd>`
      + `<dt>Places</dt><dd>Cities from GeoNames (geonames.org) · CC BY 4.0; time zones (IANA) and airports (OurAirports) · public domain</dd>`
      + (typeof sceneCreditAboutHtml === 'function' ? sceneCreditAboutHtml() : '');   // Maps: OpenStreetMap (ODbL) and terrain credits (70-scene-1credit.js)
    el.appendChild(dl);
    const p = document.createElement('p'); p.className = 'set-h set-foot';
    p.textContent = 'The Freeflo licence is in LICENSE; full third-party licence texts are in THIRD_PARTY_NOTICES.md and vendor/ in the app folder.';
    el.appendChild(p);
    fetch('/api/settings/info', { cache: 'no-store' }).then(r => r.json()).then(j => {
      const s = dl.querySelector('.set-ver'); if (s && j && j.version) s.textContent = 'Freeflo ' + j.version;
    }).catch(() => {});
  },
});

/* ---------- the page ---------- */
/** The page plain #view=settings opens on: Region & language, as in 2.16 (Profile, 97-profile-2ui.js, may list first). */
const SETTINGS_DEFAULT_GROUP = 'profile';
function _settingsGroupFromView(v) {
  const m = /^settings:([a-z-]+)$/.exec(String(v || ''));
  const id = m ? m[1] : SETTINGS_DEFAULT_GROUP;
  return SETTINGS_GROUPS.find(g => g.id === id) || SETTINGS_GROUPS.find(g => g.id === SETTINGS_DEFAULT_GROUP) || SETTINGS_GROUPS[0];
}
// Pages (the registry, 14-shell.js): Settings, the animation gallery and Diagnostics. Profile is its own Life page since 2.19.4
// (view 'profile', 97-profile-2ui.js); Settings > Profile (settings:me) is a short link to it plus your name.
const _SET_OWN_PAGES = new Set(['settings:animations', 'settings:diagnostics']);
registerPage({ id: 'animations', view: 'settings:animations', match: v => v === 'settings:animations', label: 'Animation gallery', icon: 'film', area: 'system', order: 60, family: 'settings',
  desc: 'Every scene, reward and recap, to watch and choose', keywords: 'animations scenes gallery library rewards recaps motion' });
registerPage({ id: 'diagnostics', view: 'settings:diagnostics', match: v => v === 'settings:diagnostics', label: 'Diagnostics', icon: 'stethoscope', area: 'system', order: 70, family: 'settings',
  desc: 'Problems, versions and what the app is doing', keywords: 'diagnostics problems errors version logs health debug' });
registerPage({ id: 'settings', view: 'settings', match: v => v === 'settings' || (/^settings:[a-z-]+$/.test(v) && !_SET_OWN_PAGES.has(v)), label: 'Settings', icon: 'settings', area: 'system', order: 10, ownTabs: true, family: 'settings',
  desc: 'Every setting: sync, friends, privacy, updates and more', keywords: 'settings preferences options configuration sync relay privacy updates' });
registerSection('settings', {
  group: 'system',
  match: v => v === 'settings' || /^settings:[a-z-]+$/.test(v),
  title: () => 'Settings',
  crumb: (v) => { const g = _settingsGroupFromView(v); return g && v !== 'settings' ? [{ label: 'Settings', view: 'settings' }, g.title] : ['Settings']; },
  mount(container, view) {
    const sub = document.getElementById('view-subtitle'); if (sub) sub.textContent = '';
    const cur = _settingsGroupFromView(view || state.view);
    const wrap = document.createElement('div'); wrap.className = 'settings';
    const nav = document.createElement('nav'); nav.className = 'set-nav'; nav.setAttribute('aria-label', 'Settings');
    // Seven small section headings (SIMPLIFY_PLAN.md 5.1); "Connections →" closes AI and connections.
    const connLink = () => {
      const c = document.createElement('button'); c.type = 'button'; c.className = 'set-nav-item';
      c.innerHTML = icon('plug') + '<span>Connections</span>' + icon('arrow-right', 'i-xs set-nav-out');
      c.onclick = () => { settingsSearchClear(); setView('connections'); };
      return c;
    };
    let section = null, connDone = false;
    for (const g of settingsNavGroups()) {
      const s = settingsSectionOf(g);
      if (s !== section) {
        if (section === 'AI and connections' && !connDone) { nav.appendChild(connLink()); connDone = true; }
        section = s;
        const h = document.createElement('h3'); h.className = 'set-nav-h'; h.textContent = s;
        nav.appendChild(h);
      }
      const b = document.createElement('button'); b.type = 'button'; b.className = 'set-nav-item' + (g === cur ? ' on' : '');
      if (g === cur) b.setAttribute('aria-current', 'page');
      b.innerHTML = icon(g.icon || 'settings') + `<span>${esc(g.title)}</span>`;
      b.onclick = () => {
        const searching = !!settingsSearchQuery(); settingsSearchClear();
        if (searching && state.view === 'settings:' + g.id) renderMain(); else setView('settings:' + g.id);
      };
      nav.appendChild(b);
    }
    if (!connDone) nav.appendChild(connLink());
    const main = document.createElement('div'); main.className = 'set-main';
    const paintGroup = () => {
      main.replaceChildren();
      if (!cur) return;
      const head = document.createElement('div'); head.className = 'set-page-h';
      head.innerHTML = `<h2>${esc(cur.title)}</h2>` + (cur.description ? `<p>${esc(cur.description)}</p>` : '');
      main.appendChild(head);
      const body = document.createElement('div'); body.className = 'set-group'; body.dataset.group = cur.id;
      try { cur.render(body); } catch (e) { console.error('[settings ' + cur.id + ']', e); body.replaceChildren(emptyLine('Couldn’t show this part of Settings.', { label: 'Try again', run: () => renderMain() })); }
      main.appendChild(body);
      settingsSearchReveal(body);
    };
    const search = settingsSearchBar(main, paintGroup);
    wrap.append(search, nav, main);
    container.appendChild(wrap);
    if (settingsSearchQuery()) settingsSearchResults(main); else paintGroup();
  },
});

registerCommand({ id: 'open-settings', label: 'Settings', icon: 'settings', group: 'Go to', keywords: 'preferences options profile appearance', run: () => setView('settings') });
