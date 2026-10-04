/* ============================================================
   FIRST-RUN SET-UP (welcome). Owner: Connections/Settings.
   Shown once for a new data folder: config.json has no onboardedAt and
   the state has no tasks (GET /api/settings/info -> onboarding.needed).
   Asks for name, region, a streams preset and theme, offers demo data and
   a first Claude check, then writes config.json (PUT /api/config with
   onboardedAt) and the state. Everything can be changed later in Settings.
   ============================================================ */
const OB_PRESETS = [
  { id: 'work-life', label: 'Work and life', text: 'A general set for most people.', streams: [['work', 'Work', '#4f46e5'], ['projects', 'Projects', '#9333ea'], ['learning', 'Learning', '#059669'], ['admin', 'Admin', '#0891b2'], ['personal', 'Personal', '#64748b']] },
  { id: 'freelance', label: 'Freelance', text: 'Clients, the business and you.', streams: [['clients', 'Clients', '#2563eb'], ['business', 'Business', '#ea580c'], ['marketing', 'Marketing', '#db2777'], ['learning', 'Learning', '#059669'], ['personal', 'Personal', '#64748b']] },
  { id: 'study', label: 'Study and research', text: 'Courses, research and writing.', streams: [['research', 'Research', '#4f46e5'], ['writing', 'Writing', '#9333ea'], ['courses', 'Courses', '#0d9488'], ['admin', 'Admin', '#0891b2'], ['personal', 'Personal', '#64748b']] },
  { id: 'minimal', label: 'Minimal', text: 'Just two lists to start.', streams: [['work', 'Work', '#4f46e5'], ['personal', 'Personal', '#64748b']] },
];
let _obOpen = false;

function _obDetect() {
  let tz = 'UTC', loc = 'en-GB';
  // The home zone starts as the computer's (Clock: canonical id); a computer left on UTC suggests the config's.
  try { tz = Clock.system() || tz; if (Clock.placeless(tz) && APP_CONFIG.timezone) tz = APP_CONFIG.timezone; } catch (e) { /* default */ }
  try { loc = (navigator.languages && navigator.languages[0]) || navigator.language || loc; } catch (e) { /* default */ }
  if (!/^[a-z]{2,3}(-[A-Z]{2})?$/.test(loc)) loc = 'en-GB';
  const cur = { GB: 'GBP', IE: 'EUR', US: 'USD', CA: 'CAD', AU: 'AUD', NZ: 'NZD', IN: 'INR', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', JP: 'JPY', SG: 'SGD', ZA: 'ZAR', BR: 'BRL', MX: 'MXN' };
  const region = (loc.split('-')[1] || '').toUpperCase();
  const eu = ['DE', 'FR', 'ES', 'IT', 'NL', 'PT', 'BE', 'AT', 'FI', 'GR', 'IE'];
  const currency = cur[region] || (eu.includes(region) ? 'EUR' : (APP_CONFIG.currency || 'GBP'));
  const weekStart = /^(US|CA|JP|BR|MX|IN|ZA)$/.test(region) ? 'Sun' : 'Mon';
  return { timezone: tz, locale: loc, currency, weekStart };
}

function openOnboarding() {
  if (_obOpen) return;
  _obOpen = true;
  const det = _obDetect();
  const d = {
    userName: APP_CONFIG.userName || '', currency: det.currency, locale: SETTINGS_LOCALES.some(l => l[0] === det.locale) ? det.locale : (APP_CONFIG.locale || 'en-GB'),
    timezone: det.timezone, weekStart: det.weekStart, preset: 'work-life', theme: (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light',
    demo: false, myEmails: (APP_CONFIG.myEmails || []).join(', '),
  };
  let step = 0;
  const scrim = document.createElement('div'); scrim.className = 'ob-scrim';
  const card = document.createElement('div'); card.className = 'ob-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-labelledby', 'ob-title');
  document.body.append(scrim, card);
  const prevTheme = document.documentElement.getAttribute('data-theme');

  const close = () => { _obOpen = false; scrim.remove(); card.remove(); document.removeEventListener('keydown', onKey, true); };
  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey && e.target && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') { e.preventDefault(); next(); } };
  document.addEventListener('keydown', onKey, true);

  const el = (tag, cls, text) => { const x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; };
  const field = (label, control, hint) => { const f = el('label', 'field'); f.append(el('span', 'field-label', label), control); if (hint) f.append(el('span', 'field-hint', hint)); return f; };
  const seg = (opts, cur, pick) => _settingsSeg(opts, cur, (k) => { pick(k); paint(); });

  async function finish(skipped) {
    const btns = card.querySelectorAll('button'); btns.forEach(b => { b.disabled = true; });
    const patch = skipped ? { onboardedAt: new Date(Clock.now()).toISOString() } : {
      userName: d.userName.trim(), myEmails: String(d.myEmails || '').split(/[\s,;]+/).map(x => x.trim().toLowerCase()).filter(x => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(x)), currency: d.currency, locale: d.locale, timezone: d.timezone, weekStart: d.weekStart,
      theme: { default: d.theme === 'dark' ? 'dark' : 'light', auto: d.theme === 'auto' }, onboardedAt: new Date(Clock.now()).toISOString(),
      ...(d.location ? { location: d.location } : {}),
    };
    if (!(await settingsSaveConfig(patch, false))) { btns.forEach(b => { b.disabled = false; }); return; }
    if (!skipped) {
      if (d.demo) {
        try {
          const r = await fetch('/api/demo/load', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
          if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || ('HTTP ' + r.status)); }
        } catch (e) { toast('Demo data could not be loaded: ' + e.message, { kind: 'err' }); }
      } else {
        const p = OB_PRESETS.find(x => x.id === d.preset) || OB_PRESETS[0];
        state.streams = p.streams.map(([id, label, color], i) => ({ id, label, color, order: i, archived: false }));
        state.quickTemplates = [{ label: 'Follow-up email', title: 'Email re: ', stream: p.streams[0][0], tags: ['email'], priority: 'p3' }];
        applyStreams(state);
        saveData();
      }
      state.theme = d.theme === 'auto' ? (state.theme || 'light') : d.theme;
      state.autoTheme = d.theme === 'auto';
      saveUI();
      try { if (typeof _persistFire === 'function' && !d.demo) await _persistFire(); } catch (e) { /* the next save carries it */ }
    }
    close();
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    // Land on Home, as promised: Home's morning greeting (and its full-screen story)
    // opens by itself from tomorrow, not on top of the set-up just finished.
    try { localStorage.setItem('dashboard-brief-seen', todayStr()); } catch (e) { /* ignore */ }
    location.hash = '#view=home';
    location.reload();
  }
  function next() {
    if (step === 0) { const inp = card.querySelector('#ob-name'); if (inp) d.userName = inp.value; const em = card.querySelector('#ob-emails'); if (em) d.myEmails = em.value; }
    if (step < 3) { step++; paint(); } else finish(false);
  }
  function back() { if (step > 0) { step--; paint(); } }

  function paint() {
    card.innerHTML = '';
    const top = el('div', 'ob-top');
    const mark = el('span', 'brand-mark ob-mark'); setBrandMark(mark, d.userName);
    const dots = el('div', 'ob-dots');
    for (let i = 0; i < 4; i++) { const s = el('span', 'ob-dot' + (i === step ? ' on' : i < step ? ' done' : '')); dots.appendChild(s); }
    const skip = el('button', 'btn btn-ghost btn-sm ob-skip', 'Skip set-up'); skip.type = 'button'; skip.onclick = () => finish(true);
    top.append(mark, dots, skip);
    card.appendChild(top);
    const body = el('div', 'ob-body');
    const h = el('h1', 'ob-title'); h.id = 'ob-title';
    const p = el('p', 'ob-lead');
    body.append(h, p);
    if (step === 0) {
      h.textContent = 'Welcome to OpenDash';
      p.textContent = 'Tasks, calendar and finances in one calm place. It runs on this computer and keeps everything in one data folder. Set-up takes a minute.';
      const inp = el('input', 'control'); inp.id = 'ob-name'; inp.maxLength = 60; inp.placeholder = 'e.g. Sam'; inp.value = d.userName; inp.autocomplete = 'given-name';
      inp.oninput = () => { d.userName = inp.value; setBrandMark(mark, inp.value); };
      body.appendChild(field('What should we call you?', inp, 'Optional. Used in greetings and the app title.'));
      const em = el('input', 'control'); em.id = 'ob-emails'; em.type = 'text'; em.placeholder = 'you@example.org'; em.value = d.myEmails; em.autocomplete = 'email';
      em.oninput = () => { d.myEmails = em.value; };
      body.appendChild(field('Your email address', em, 'Optional; add several with commas. Shared calendars of other people then start hidden.'));
      setTimeout(() => inp.focus(), 30);
    } else if (step === 1) {
      h.textContent = 'Where are you?';
      p.textContent = 'So that “today”, due dates and money look right. Detected from this computer.';
      const grid = el('div', 'ob-grid');
      grid.append(
        field('Home time zone', _settingsSelect(settingsTimeZones(), d.timezone, (v) => { d.timezone = v; paint(); }), 'Where you live. While you travel, the dashboard follows this computer’s clock.'),
        field('Language and date format', _settingsSelect(SETTINGS_LOCALES, d.locale, (v) => { d.locale = v; paint(); }), 'Example: ' + settingsDateExample(d.locale, d.timezone)),
        field('Currency', _settingsSelect(SETTINGS_CURRENCIES, d.currency, (v) => { d.currency = v; })),
        field('Week starts on', seg([['Mon', 'Monday'], ['Sun', 'Sunday'], ['Sat', 'Saturday']], d.weekStart, (k) => { d.weekStart = k; })));
      body.appendChild(grid);
      if (typeof briefOnboardingLocationField === 'function') body.appendChild(briefOnboardingLocationField(d));   // weather town (78-brief-hooks.js)
    } else if (step === 2) {
      h.textContent = 'How do you organise things?';
      p.textContent = 'Streams are the big areas your tasks belong to. Pick a starting set; you can rename, add or archive them any time.';
      const list = el('div', 'ob-choices');
      for (const pr of OB_PRESETS) {
        const b = el('button', 'ob-choice' + (d.preset === pr.id ? ' on' : '')); b.type = 'button'; b.setAttribute('aria-pressed', d.preset === pr.id ? 'true' : 'false');
        const t = el('div', 'ob-choice-t', pr.label);
        const s = el('div', 'ob-choice-s', pr.text);
        const chips = el('div', 'ob-chips');
        for (const [, label, color] of pr.streams) { const c = el('span', 'stream'); c.style.setProperty('--c', safeColor(color)); c.innerHTML = `<span class="dot"></span>${esc(label)}`; chips.appendChild(c); }
        b.append(t, s, chips);
        b.onclick = () => { d.preset = pr.id; paint(); };
        list.appendChild(b);
      }
      body.appendChild(list);
      body.appendChild(field('Theme', seg([['light', 'Light', 'sun'], ['dark', 'Dark', 'moon'], ['auto', 'Auto', 'sun-moon']], d.theme, (k) => {
        d.theme = k;
        document.documentElement.setAttribute('data-theme', k === 'auto' ? (prevTheme || 'light') : k);
      })));
    } else {
      h.textContent = 'Ready when you are';
      p.textContent = 'Start with a clean slate, or look around with made-up example data first.';
      const list = el('div', 'ob-choices ob-choices-2');
      const opt = (val, title, text, ic) => {
        const b = el('button', 'ob-choice' + (d.demo === val ? ' on' : '')); b.type = 'button'; b.setAttribute('aria-pressed', d.demo === val ? 'true' : 'false');
        const t = el('div', 'ob-choice-t'); t.innerHTML = icon(ic) + `<span>${esc(title)}</span>`;
        b.append(t, el('div', 'ob-choice-s', text));
        b.onclick = () => { d.demo = val; paint(); };
        return b;
      };
      list.append(opt(false, 'Start empty', 'Your streams, no tasks yet. Press Q to add the first one.', 'square-check-big'),
        opt(true, 'Explore with demo data', 'Example tasks, people, a calendar and finances, all invented. Reset it later in Settings > Data.', 'sparkles'));
      body.appendChild(list);
      const conn = el('div', 'ob-conn');
      const ok = window.Connections && Connections.has('claude');
      conn.innerHTML = icon(ok ? 'circle-check' : 'plug');
      const ct = el('div', 'ob-conn-t');
      ct.append(el('b', null, ok ? 'Claude is connected' : 'Connect Claude later (optional)'),
        el('span', null, ok ? 'The assistant and smart features are ready.' : 'The assistant, AI summaries and Gmail, Google Calendar and bank sync need Claude Code on this computer, signed in with your own Claude plan. Everything else works without it.'));
      conn.appendChild(ct);
      if (!ok) {
        const b = el('button', 'btn btn-secondary btn-sm'); b.type = 'button'; b.innerHTML = icon('refresh-cw') + '<span>Check now</span>';
        b.onclick = async () => { b.disabled = true; b.innerHTML = '<span class="spinner"></span><span>Checking…</span>'; await connCheck('claude'); paint(); };
        conn.appendChild(b);
      }
      body.appendChild(conn);
    }
    card.appendChild(body);
    const foot = el('div', 'ob-foot');
    if (step > 0) { const b = el('button', 'btn btn-ghost', 'Back'); b.type = 'button'; b.onclick = back; foot.appendChild(b); }
    foot.appendChild(el('span', 'spacer'));
    const go = el('button', 'btn btn-primary btn-lg'); go.type = 'button';
    go.innerHTML = `<span>${step < 3 ? 'Continue' : (d.demo ? 'Load demo and open' : 'Get started')}</span>` + icon('arrow-right');
    go.onclick = next;
    foot.appendChild(go);
    card.appendChild(foot);
  }
  paint();
}

async function _obMaybeStart(tries) {
  if (typeof _serverAvailable === 'undefined') return;
  if (!_serverAvailable) { if (tries > 0) setTimeout(() => _obMaybeStart(tries - 1), 500); return; }
  try {
    const r = await fetch('/api/settings/info', { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json();
    if (j && j.onboarding && j.onboarding.needed) openOnboarding();
  } catch (e) { /* no server: nothing to set up */ }
}
if (typeof window !== 'undefined' && typeof fetch !== 'undefined') setTimeout(() => _obMaybeStart(20), 300);
registerCommand({ id: 'welcome', label: 'Show the welcome set-up', icon: 'sparkles', keywords: 'onboarding first run setup wizard', run: () => openOnboarding() });
