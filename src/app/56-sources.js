/* ============================================================
   DATA SOURCES on Connections. Owner: Sources.
   Where bank transactions, calendar events and email come from: any
   number per capability (two banks, several calendars, a second
   mailbox), each with its own accounts. API: /api/sources
   (server/routes/sources.mjs, lib/sources.mjs).

   srcSection(all)          the "Data sources" block of the Connections page
   srcServersCard()         every MCP server `claude mcp list` shows, with health
   srcAddFlow({capability, server})  Add a source: what -> from where -> tools
                            (read-only ones pre-ticked, write ones locked) or an
                            iCal link -> name + colour -> test fetch -> save
   SourcesStore             load()/data/refresh, shared with Settings
   Every name, label, URL and tool name from a server is set with textContent
   or esc(). Nothing here sends or stores a password or token.
   ============================================================ */
const SRC_CAPS = [
  { id: 'bank', name: 'Banks and wallets', one: 'bank', icon: 'landmark', unlocks: 'Bank sync in Finances', hint: 'Monzo, Plasma One, other UK and EU banks, Aureli through Claude, or a CSV export.' },
  { id: 'calendar', name: 'Calendars', one: 'calendar', icon: 'calendar-days', unlocks: 'Events next to your tasks', hint: 'Events from Google, Outlook or any calendar with an iCal link.' },
  { id: 'email', name: 'Email', one: 'mailbox', icon: 'mail', unlocks: 'Email triage, mail on people', hint: 'Recent subjects, senders and previews. Never full messages; nothing is ever sent.' },
];
const SRC_SWATCHES = ['indigo', 'blue', 'teal', 'green', 'amber', 'orange', 'red', 'pink', 'violet', 'slate'];
const SRC_STATE = {
  ok: ['ok', 'Working'], auth: ['warn', 'Needs sign-in'], error: ['err', 'Not working'], setup: ['off', 'Not set up'],
  off: ['off', 'Switched off'], unknown: ['off', 'Not checked yet'], demo: ['off', 'Demo data'],
};

const SourcesStore = {
  data: null, loading: null, error: null, busy: {}, generation: 0,
  async load(opts) {
    opts = opts || {};
    if (this.loading && !opts.force) return this.loading;
    const generation = ++this.generation;
    this.loading = (async () => {
      try {
        const r = await fetch('/api/sources' + (opts.refresh ? '?refresh=1' : opts.cached ? '?discover=cached' : ''), { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status);
        if (generation === this.generation) { this.data = j; this.error = null; }
      } catch (e) { if (generation === this.generation) this.error = (e && e.message) || 'Could not load the sources.'; }
      if (generation === this.generation) {
        this.loading = null;
        if (state.view === 'connections') renderMain();
      }
      return this.data;
    })();
    return this.loading;
  },
  /** Reload sources and the connection gates together. */
  async refresh(opts) {
    await this.load(Object.assign({ force: true }, opts || {}));
    if (window.Connections) await Connections.refresh();
  },
  byCap(cap) { return ((this.data && this.data.sources) || []).filter(s => s.capability === cap); },
};

async function _srcApi(path, opts) {
  opts = opts || {};
  const r = await fetch(path, {
    method: opts.method || 'GET', cache: 'no-store',
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok && !(opts.okStatuses || []).includes(r.status)) throw Object.assign(new Error(j.error || 'The OpenDash server did not answer.'), { code: j.code, status: r.status });
  return j;
}

function _srcPill(st) {
  const [kind, label] = SRC_STATE[st] || SRC_STATE.unknown;
  return _connEl('span', 'status ' + kind, label);
}
function _srcKindText(s) {
  if (s.kind === 'microsoft') return 'Microsoft browser sign-in · read-only';
  if (s.kind === 'csv') return 'CSV export · imported in Finances';
  if (s.kind === 'ical') return 'iCal link · ' + (s.urlHint || 'calendar feed') + ' · read-only';
  return (s.server || 'MCP server') + ' · read-only';
}
function _srcAgo(iso) { return iso ? _connAgo(iso) : 'never'; }
function _srcConnectionState(s) { return s.enabled === false ? 'off' : s.demo ? 'demo' : (s.health && (s.health.connectionState || s.health.state)) || 'unknown'; }
function _srcSyncWarning(s) { const warning = s.health && s.health.syncWarning; return typeof warning === 'string' ? warning : warning && warning.message || ''; }
function _srcToolsReady(s) {
  const check = s.lastCheck;
  return !!(check && check.ok && check.level === 'tools' && (!s.lastSync || Date.parse(check.at) > Date.parse(s.lastSync)));
}
function _srcNeedsReconnect(s) {
  const h = s.health || {}, st = _srcConnectionState(s);
  const code = h.code || (s.lastCheck && !s.lastCheck.ok && s.lastCheck.code) || (s.lastError && s.lastError.code);
  return (st === 'auth' || st === 'setup') && !['TOOL_MISSING', 'TIMEOUT', 'CLI_TIMEOUT', 'NETWORK', 'NETWORK_ERROR', 'RATE_LIMIT', 'RATE_LIMITED'].includes(code);
}

/* ---------- one source ---------- */
function _srcRow(s) {
  const h = Object.assign({}, s.health || { state: 'unknown' }, { state: _srcConnectionState(s) });
  const row = _connEl('div', 'src-row st-' + h.state + (s.enabled ? '' : ' is-off'));
  row.dataset.source = s.id;
  const sw = _connEl('span', 'src-sw c-' + (SRC_SWATCHES.includes(s.colour) ? s.colour : 'slate'));
  const t = _connEl('div', 'src-titles');
  t.append(_connEl('div', 'src-name', s.label), _connEl('div', 'src-sub', _srcKindText(s)));
  const right = _connEl('div', 'src-right');
  const statusPill = _srcPill(h.state);
  if (h.state === 'ok' && _srcToolsReady(s)) statusPill.textContent = 'Tools ready';
  right.appendChild(statusPill);
  const more = document.createElement('button'); more.type = 'button'; more.className = 'btn-icon btn-sm';
  more.setAttribute('aria-label', 'Options for ' + s.label); more.innerHTML = icon('ellipsis');
  more.onclick = (e) => { e.stopPropagation(); _srcMenu(more, s); };
  right.appendChild(more);
  const head = _connEl('div', 'src-head');
  head.append(sw, t, right);
  row.appendChild(head);

  if (h.message && h.state !== 'ok' && h.state !== 'off' && h.state !== 'demo') {
    const m = _connEl('div', 'callout ' + (h.state === 'error' ? 'danger' : 'warn') + ' conn-msg src-msg');
    m.innerHTML = icon(h.state === 'error' ? 'circle-alert' : 'info');
    // We are on Connections already: "…: open Connections." says nothing here.
    m.appendChild(_connEl('span', null, String(h.message).replace(/:\s*open Connections( to connect it)?\.?$/i, '.')));
    row.appendChild(m);
    if (_srcNeedsReconnect(s)) row.appendChild(_srcFixHelp(s));
  } else if (h.message && (h.state === 'ok' || h.state === 'demo')) {
    row.appendChild(_connEl('div', 'src-note', h.message));
  }
  const syncWarning = _srcSyncWarning(s);
  if (syncWarning && s.enabled !== false && !s.demo) row.appendChild(_connEl('div', 'src-note', 'Previous sync failed: ' + syncWarning + ' Retry sync to update your data.'));

  // Accounts / calendars / mailboxes, each with its own switch.
  if (s.accounts && s.accounts.length) {
    const acc = _connEl('div', 'src-accounts');
    acc.appendChild(_connEl('span', 'src-acc-l', s.capability === 'calendar' ? 'Calendars' : s.capability === 'email' ? 'Mailboxes' : 'Accounts'));
    for (const a of s.accounts.slice(0, 24)) {
      const chip = document.createElement('button'); chip.type = 'button';
      chip.className = 'src-acc' + (a.enabled === false ? ' off' : '');
      chip.setAttribute('role', 'switch'); chip.setAttribute('aria-checked', a.enabled === false ? 'false' : 'true');
      chip.setAttribute('data-tip', (a.enabled === false ? 'Switched off: not read. ' : 'Read on every sync. ') + 'Click to switch ' + (a.enabled === false ? 'on' : 'off') + '.');
      const dot = _connEl('span', 'dot c-' + (SRC_SWATCHES.includes(a.colour) ? a.colour : s.colour || 'slate'));
      chip.append(dot, _connEl('span', null, a.name || a.id));
      chip.onclick = () => _srcSetAccount(s, a, a.enabled === false);
      acc.appendChild(chip);
    }
    if (s.accounts.length > 24) acc.appendChild(_connEl('span', 'src-note', `and ${s.accounts.length - 24} more`));
    row.appendChild(acc);
  }

  const foot = _connEl('div', 'src-foot');
  const when = s.kind === 'csv' ? 'Import a CSV in Finances any time' : s.demo ? 'Demo data · never synced' : s.lastSync ? `Synced ${_srcAgo(s.lastSync)}` : 'Not synced yet';
  foot.appendChild(_connEl('span', 'conn-when', when));
  if (s.kind !== 'csv') {
    const busy = !!SourcesStore.busy[s.id];
    const b = _connBtn(busy ? 'Syncing…' : syncWarning ? 'Retry sync' : 'Sync now', busy ? null : 'refresh-cw', 'btn-ghost', () => _srcSync(s));
    if (busy) { b.disabled = true; b.insertAdjacentHTML('afterbegin', '<span class="spinner"></span>'); }
    if (!s.enabled || h.state === 'off' || s.demo) b.disabled = true;
    foot.appendChild(b);
  } else {
    foot.appendChild(_connBtn('Open Finances', 'arrow-right', 'btn-ghost', () => setView('finance')));
  }
  row.appendChild(foot);
  return row;
}

function _srcFixHelp(s) {
  const box = _connEl('div', 'conn-help src-help');
  if (s.kind === 'microsoft') { box.appendChild(_connBtn('Sign in with Microsoft', 'log-in', 'btn-primary', microsoftSignIn)); return box; }
  const claudeAi = /^claude\.ai /.test(s.server || '');
  if (claudeAi) {
    box.appendChild(_connSteps([
      _connBtn('Open claude.ai connectors', 'external-link', 'btn-primary', () => window.open(CONNECTORS_URL, '_blank', 'noopener')),
      `Find ${String(s.server).replace(/^claude\.ai /, '')} and choose Reconnect (or Connect), then sign in.`,
      'Come back here and click Sync now.',
    ]));
  } else {
    box.appendChild(_connSteps([
      _connBtn('Open terminal', 'terminal', 'btn-primary', (b) => _connOpenTerminal(b)),
      `In the Claude window, type /mcp and choose ${s.server || 'the server'} to sign in again.`,
      'Come back here and click Sync now.',
    ]));
  }
  return box;
}

function _srcMenu(anchor, s) {
  const items = [
    { label: 'Rename…', icon: 'pencil', run: async () => {
      const v = await promptDialog({ title: 'Rename source', label: 'Shown on Connections, in Finances, Calendar and Email.', value: s.label, confirmLabel: 'Rename' });
      if (v) _srcUpdate(s, { label: v.slice(0, 60) }, 'Renamed');
    } },
    { label: 'Colour…', icon: 'palette', run: () => _srcColourPop(anchor, s) },
  ];
  if (s.kind === 'mcp' && !s.preset) items.push({ label: 'Choose tools…', icon: 'wrench', run: () => srcAddFlow({ edit: s }) });
  if (s.kind === 'ical') items.push({ label: 'Change link…', icon: 'link', run: () => srcAddFlow({ edit: s }) });
  if (s.kind !== 'csv') items.push({ label: 'Test now', icon: 'zap', run: () => _srcTestExisting(s) });
  items.push('sep');
  items.push(s.enabled
    ? { label: 'Switch off', icon: 'eye-off', run: () => _srcUpdate(s, { enabled: false }, `${s.label} switched off`) }
    : { label: 'Switch on', icon: 'eye', run: () => _srcUpdate(s, { enabled: true }, `${s.label} switched on`) });
  items.push({ label: 'Remove…', icon: 'trash-2', danger: true, run: async () => {
    const ok = await confirmDialog({ title: `Remove ${s.label}?`, text: 'The dashboard stops reading it. Data it already brought in stays, and you can add it again any time.', confirmLabel: 'Remove', danger: true });
    if (!ok) return;
    try { await _srcApi('/api/sources/' + encodeURIComponent(s.id), { method: 'DELETE' }); toast(`${s.label} removed`, { kind: 'ok' }); }
    catch (e) { toast(e.message, { kind: 'err' }); }
    SourcesStore.refresh(); _srcAfterChange(s.capability);
  } });
  openMenu(anchor, items, { align: 'end' });
}
function _srcColourPop(anchor, s) {
  openPopover(anchor, (el, close) => {
    el.classList.add('src-colpop');
    const sw = _connEl('div', 'cal-swatches');
    for (const c of SRC_SWATCHES) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'cal-sw c-' + c + (c === s.colour ? ' on' : '');
      b.setAttribute('aria-label', c); b.title = c[0].toUpperCase() + c.slice(1);
      b.onclick = () => { close(); _srcUpdate(s, { colour: c }); };
      sw.appendChild(b);
    }
    el.appendChild(sw);
  }, { align: 'end', width: 200 });
}
async function _srcUpdate(s, patch, msg) {
  try {
    await _srcApi('/api/sources/' + encodeURIComponent(s.id), { method: 'PUT', body: patch });
    if (msg) toast(msg, { kind: 'ok' });
  } catch (e) { toast(e.message, { kind: 'err' }); }
  await SourcesStore.refresh();
  _srcAfterChange(s.capability);
}
function _srcSetAccount(s, a, on) {
  _srcUpdate(s, { accounts: [{ id: a.id, enabled: on }] }, `${a.name || a.id} ${on ? 'switched on' : 'switched off'}`);
}
/** Other views show source data: let them reload. */
function _srcAfterChange(cap) {
  try {
    if (cap === 'calendar' && typeof CalStore !== 'undefined') CalStore.load(true);
    if (cap === 'email' && typeof InboxStore !== 'undefined') InboxStore.load(true);
    if (cap === 'bank' && window.FinanceView && FinanceView.refresh && state.view === 'finance') FinanceView.refresh();
  } catch (e) { console.error('[sources]', e); }
}
async function _srcSync(s) {
  SourcesStore.busy[s.id] = true; renderMain();
  try {
    const j = await _srcApi('/api/sources/' + encodeURIComponent(s.id) + '/sync', { method: 'POST', body: {}, okStatuses: [409] });
    if (j.job && j.capability === 'calendar' && typeof CalStore !== 'undefined') { CalStore.st.job = j.job; CalStore.poll(); }
    else if (j.job && j.capability === 'email' && typeof InboxStore !== 'undefined') { InboxStore.st.job = j.job; InboxStore.poll(); }
    toast(j.error || `Syncing ${s.label}…`, { icon: 'refresh-cw' });
    // Watch the job, then show the result on the card.
    const t0 = Date.now();
    const statusUrl = s.capability === 'calendar' ? '/api/calendar/status' : s.capability === 'email' ? '/api/inbox/status' : '/api/finance/status';
    while (Date.now() - t0 < 20 * 60000) {
      await new Promise(r => setTimeout(r, 2500));
      const st = await _srcApi(statusUrl).catch(() => null);
      if (!st || !st.job || st.job.state !== 'running') break;
    }
  } catch (e) { toast(e.message, { kind: 'err' }); }
  delete SourcesStore.busy[s.id];
  await SourcesStore.refresh();
  _srcAfterChange(s.capability);
}
async function _srcTestExisting(s) {
  SourcesStore.busy[s.id] = true; renderMain();
  try {
    const r = await _srcApi('/api/sources/test', { method: 'POST', body: { source: { id: s.id } } });
    if (r.ok) toast(r.count == null ? `${s.label}: connector tools are ready. Sync now to read and update your data.` : `${s.label} works: ${r.count} item${r.count === 1 ? '' : 's'} in a short read-only test. This did not sync your data.`, { kind: 'ok' });
    else toast(r.error || 'The test failed.', { kind: 'err', timeout: 8000 });
  } catch (e) { toast(e.message, { kind: 'err' }); }
  delete SourcesStore.busy[s.id];
  await SourcesStore.refresh({ cached: true });
  if (state.view === 'connections') renderMain();
}

/* ---------- the section ---------- */
function srcSection(all) {
  const d = SourcesStore.data;
  const wrap = _connEl('section', 'src-section');
  wrap.dataset.conn = 'sources';
  const h = _connEl('div', 'src-section-h');
  const ht = _connEl('div', 'src-section-t');
  ht.append(_connEl('h2', null, 'Data sources'), _connEl('p', null, 'Banks, calendars and mailboxes the dashboard reads from. Add as many as you like; each one only ever reads.'));
  const addSrc = _connBtn('Add a source', 'plus', 'btn-primary', () => srcAddFlow({}));
  addSrc.classList.remove('btn-sm'); // a page-level action: same size as "Add person" / "New task"
  h.append(ht, addSrc);
  wrap.appendChild(h);
  if (!d) {
    for (let i = 0; i < 3; i++) { const sk = document.createElement('div'); sk.className = 'skeleton skeleton-row'; wrap.appendChild(sk); }
    if (!SourcesStore.loading) SourcesStore.load();
    return wrap;
  }
  const grid = _connEl('div', 'src-groups');
  for (const cap of SRC_CAPS) {
    const list = SourcesStore.byCap(cap.id);
    const capInfo = (d.capabilities || {})[cap.id] || {};
    const g = _connEl('div', 'card src-group');
    g.dataset.cap = cap.id;
    const gh = _connEl('div', 'src-group-h');
    const ic = _connEl('span', 'conn-ic' + (capInfo.available ? ' on' : '')); ic.innerHTML = icon(cap.icon);
    const gt = _connEl('div', 'conn-titles');
    gt.append(_connEl('div', 'conn-name', cap.name), _connEl('div', 'conn-sub', capInfo.available ? `Working · ${cap.unlocks}` : cap.unlocks));
    const add = _connBtn('Add', 'plus', 'btn-ghost', () => srcAddFlow({ capability: cap.id }));
    add.setAttribute('aria-label', 'Add a ' + cap.one);
    gh.append(ic, gt, add);
    g.appendChild(gh);
    const rows = list.filter(s => s.kind !== 'csv' || cap.id === 'bank');
    if (!rows.length) {
      const e = _connEl('div', 'src-empty');
      e.appendChild(_connEl('span', null, cap.hint));
      e.appendChild(_connBtn('Add a ' + cap.one, 'plus', 'btn-secondary', () => srcAddFlow({ capability: cap.id })));
      g.appendChild(e);
    } else for (const s of rows) g.appendChild(_srcRow(s));
    grid.appendChild(g);
  }
  wrap.appendChild(grid);
  wrap.appendChild(srcServersCard());
  return wrap;
}

/** Every MCP server Claude Code can reach, with its health (from `claude mcp list`). */
function srcServersCard() {
  const d = SourcesStore.data || {};
  const card = _connEl('div', 'card src-servers');
  card.dataset.conn = 'servers';
  const h = _connEl('div', 'src-group-h');
  const ic = _connEl('span', 'conn-ic'); ic.innerHTML = icon('database');
  const t = _connEl('div', 'conn-titles');
  const at = d.discovery && d.discovery.at;
  t.append(_connEl('div', 'conn-name', 'MCP servers in your Claude'), _connEl('div', 'conn-sub', at ? `From claude mcp list · checked ${_connAgo(at)}` : 'From claude mcp list'));
  const busy = !!SourcesStore.busy._servers;
  const b = _connBtn(busy ? 'Checking…' : 'Check servers', busy ? null : 'refresh-cw', 'btn-ghost', async () => {
    SourcesStore.busy._servers = true; renderMain();
    await SourcesStore.refresh({ refresh: true });
    delete SourcesStore.busy._servers; renderMain();
  });
  if (busy) { b.disabled = true; b.insertAdjacentHTML('afterbegin', '<span class="spinner"></span>'); }
  h.append(ic, t, b);
  card.appendChild(h);
  if (d.discovery && d.discovery.error && !Array.isArray(d.servers)) {
    const m = _connEl('div', 'callout warn conn-msg'); m.innerHTML = icon('info');
    m.appendChild(_connEl('span', null, d.discovery.error));
    card.appendChild(m);
    return card;
  }
  const servers = Array.isArray(d.servers) ? d.servers : [];
  if (!servers.length) { card.appendChild(_connEl('p', 'conn-note', 'No MCP servers yet. Connect one on claude.ai (Settings > Connectors) or with claude mcp add, then check again.')); return card; }
  const used = new Map(((d.sources) || []).filter(s => s.kind === 'mcp').map(s => [s.server + '|' + s.capability, s]));
  const list = _connEl('div', 'src-srv-list');
  for (const sv of servers) {
    const r = _connEl('div', 'src-srv');
    const st = { ok: 'ok', auth: 'auth', error: 'error', pending: 'unknown', unknown: 'unknown' }[sv.status] || 'unknown';
    const dot = _connEl('span', 'src-srv-dot st-' + st);
    const nm = _connEl('div', 'src-srv-n');
    nm.append(_connEl('b', null, sv.name), _connEl('span', null, [sv.kind === 'claude.ai' ? 'claude.ai connector' : sv.kind.toUpperCase(), sv.host].filter(Boolean).join(' · ')));
    r.append(dot, nm);
    const status = _connEl('span', 'src-srv-s', sv.statusText || '');
    r.appendChild(status);
    const mine = SRC_CAPS.map(c => used.get(sv.name + '|' + c.id)).filter(Boolean);
    if (mine.length) r.appendChild(_connEl('span', 'chip chip-accent', 'In use: ' + mine.map(s => s.label).join(', ')));
    else if (sv.usable) {
      const u = _connBtn('Use as a source', 'plus', 'btn-ghost', () => srcAddFlow({ server: sv.name, capability: sv.capability || null }));
      r.appendChild(u);
    } else {
      const n = _connEl('span', 'src-note', 'Not usable here');
      if (sv.note) n.setAttribute('data-tip', sv.note);
      r.appendChild(n);
    }
    list.appendChild(r);
  }
  card.appendChild(list);
  return card;
}

/* ---------- Add a source ---------- */
/**
 * srcAddFlow({capability, server, edit}) - a drawer that walks through:
 *   1 what (bank / calendar / email)  2 from where (an MCP server, an iCal link, CSV)
 *   3 tools (MCP: read-only pre-ticked, write locked) or the link (iCal)
 *   4 name + colour   5 test, then save.
 * edit: an existing source (change its tools or link; name/colour stay).
 */
function srcAddFlow(o) {
  o = o || {};
  // Banks and wallets are added from the Money block (56-fin-connect.js), which
  // offers every provider; only a named MCP server or "another bank MCP" comes here.
  if (o.capability === 'bank' && !o.edit && !o.server && !o.mcpBank && typeof finMoneyBlock === 'function') { connOpen('money'); return; }
  const f = {
    step: o.edit ? (o.edit.kind === 'ical' ? 'url' : 'tools') : o.capability ? (o.server ? 'tools' : 'from') : 'what',
    capability: o.edit ? o.edit.capability : o.capability || null,
    kind: o.edit ? o.edit.kind : o.server ? 'mcp' : null,
    server: o.edit ? o.edit.server : o.server || null,
    tools: null, toolsErr: null, selected: new Set(o.edit && o.edit.tools ? o.edit.tools : []),
    url: '', label: o.edit ? o.edit.label : '', colour: o.edit ? o.edit.colour : null,
    test: null, testing: false, saving: false, edit: o.edit || null,
  };
  if (o.server && !o.capability) {
    const sv = ((SourcesStore.data && SourcesStore.data.servers) || []).find(x => x.name === o.server);
    f.capability = sv && sv.capability || null;
    if (!f.capability) f.step = 'what';
  }
  let bodyEl = null, footEl = null, closeFn = null;
  const capOf = (id) => SRC_CAPS.find(c => c.id === id) || SRC_CAPS[0];
  const nextColour = () => {
    const taken = new Set(((SourcesStore.data && SourcesStore.data.sources) || []).map(s => s.colour));
    return SRC_SWATCHES.find(c => !taken.has(c)) || 'indigo';
  };

  function go(step) { f.step = step; paint(); }
  async function loadTools() {
    if (f.toolsLoading) return;
    f.toolsLoading = true;
    f.tools = null; f.toolsErr = null; paint();
    try {
      const r = await _srcApi('/api/sources/tools', { method: 'POST', body: { server: f.server }, okStatuses: [400] });
      if (r.error) throw new Error(r.error);
      f.tools = r.tools || [];
      if (!f.edit) { f.selected = new Set(f.tools.filter(t => t.selected).map(t => t.name)); if (!f.capability && r.capability) f.capability = r.capability; }
      f.preset = !!(r.tools || []).length && /^claude\.ai (Bank|Gmail|Google Calendar)$/.test(f.server) && ['bank', 'email', 'calendar'].includes(f.capability);
    } catch (e) { f.toolsErr = e.message || 'Could not list the tools.'; }
    f.toolsLoading = false;
    paint();
  }
  async function runTest() {
    f.testing = true; f.test = null; paint();
    try {
      f.test = await _srcApi('/api/sources/test', { method: 'POST', body: { source: draft() } });
    } catch (e) { f.test = { ok: false, error: e.message }; }
    f.testing = false; paint();
  }
  function draft() {
    const d = { capability: f.capability, kind: f.kind, label: f.label || defaultLabel(), colour: f.colour || nextColour() };
    if (f.kind === 'mcp') { d.server = f.server; d.tools = [...f.selected]; }
    if (f.kind === 'ical') d.url = f.url;
    if (f.edit) d.id = f.edit.id;
    return d;
  }
  function defaultLabel() {
    if (f.kind === 'ical') { try { return new URL(f.url.replace(/^webcals?:/i, 'https:')).hostname.replace(/^www\./, '').split('.')[0].replace(/^./, c => c.toUpperCase()) + ' calendar'; } catch (e) { return 'iCal calendar'; } }
    if (f.kind === 'mcp' && f.server) {
      if (f.server === 'claude.ai Bank') return 'Aureli';
      return String(f.server).replace(/^claude\.ai /, '');
    }
    return capOf(f.capability).one[0].toUpperCase() + capOf(f.capability).one.slice(1);
  }
  async function save() {
    f.saving = true; paint();
    try {
      if (f.edit) {
        const patch = f.kind === 'ical' ? { url: f.url } : { tools: [...f.selected] };
        await _srcApi('/api/sources/' + encodeURIComponent(f.edit.id), { method: 'PUT', body: patch });
        toast(`${f.edit.label} updated`, { kind: 'ok' });
      } else {
        const r = await _srcApi('/api/sources', { method: 'POST', body: { source: draft() } });
        toast(`${r.source.label} added. Syncing now…`, { kind: 'ok' });
        f.saved = r.source;
      }
      closeFn && closeFn();
      await SourcesStore.refresh();
      if (f.saved) { const s = (SourcesStore.data.sources || []).find(x => x.id === f.saved.id); if (s) _srcSync(s); }
      else _srcAfterChange(f.capability);
    } catch (e) { f.saving = false; toast(e.message, { kind: 'err', timeout: 8000 }); paint(); }
  }

  function stepper() {
    const steps = f.edit ? [['tools', f.kind === 'ical' ? 'Link' : 'Tools'], ['test', 'Test']] : [['what', 'What'], ['from', 'From'], [f.kind === 'ical' ? 'url' : 'tools', f.kind === 'ical' ? 'Link' : 'Tools'], ['name', 'Name'], ['test', 'Test']];
    const order = steps.map(s => s[0] === 'url' && !f.edit ? 'url' : s[0]);
    const cur = order.indexOf(f.step === 'url' ? (f.edit ? 'tools' : 'url') : f.step);
    const ol = _connEl('ol', 'src-steps');
    steps.forEach(([, label], i) => { const li = _connEl('li', i < cur ? 'done' : i === cur ? 'on' : '', label); ol.appendChild(li); });
    return ol;
  }
  function choice(ic, title, sub, on, run, extra) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'src-choice' + (on ? ' on' : '') + (extra && extra.disabled ? ' disabled' : '');
    if (extra && extra.disabled) b.disabled = true;
    const i = _connEl('span', 'src-choice-ic'); i.innerHTML = icon(ic);
    const t = _connEl('span', 'src-choice-t');
    t.append(_connEl('b', null, title), _connEl('span', null, sub));
    b.append(i, t);
    if (extra && extra.badge) b.appendChild(extra.badge);
    b.onclick = run;
    return b;
  }

  function paint() {
    if (!bodyEl) return;
    bodyEl.innerHTML = ''; footEl.innerHTML = '';
    bodyEl.appendChild(stepper());
    const back = (step) => { const b = _connBtn('Back', 'arrow-left', 'btn-ghost', () => go(step)); footEl.appendChild(b); };
    const spacer = () => footEl.appendChild(_connEl('span', 'spacer'));
    const next = (label, run, disabled) => { const b = _connBtn(label, null, 'btn-primary', run); b.disabled = !!disabled; footEl.appendChild(b); return b; };

    if (f.step === 'what') {
      bodyEl.appendChild(_connEl('p', 'src-lead', 'What should the dashboard read?'));
      const g = _connEl('div', 'src-choices');
      for (const c of SRC_CAPS) g.appendChild(choice(c.icon, c.name, c.hint, f.capability === c.id, () => {
        if (c.id === 'bank' && !f.server && typeof finMoneyBlock === 'function') { closeFn && closeFn(); connOpen('money'); return; }
        f.capability = c.id; go(f.server ? 'tools' : 'from');
      }));
      if (typeof googleHealthConnectionSetup === 'function') g.appendChild(choice('heart', 'Google Health', 'Activity and sleep from Google Health and Fitbit. Browser sign-in, read-only.', false, () => { closeFn && closeFn(); googleHealthConnectionSetup(); }));
      bodyEl.appendChild(g);
      spacer();
      return;
    }
    if (f.step === 'from') {
      const cap = capOf(f.capability);
      bodyEl.appendChild(_connEl('p', 'src-lead', `Where does the ${cap.one} come from?`));
      const servers = ((SourcesStore.data && SourcesStore.data.servers) || []);
      const used = new Set(((SourcesStore.data && SourcesStore.data.sources) || []).filter(s => s.kind === 'mcp' && s.capability === f.capability).map(s => s.server));
      const g = _connEl('div', 'src-choices');
      const ranked = servers.slice().sort((a, b) => ((b.capability === f.capability) - (a.capability === f.capability)) || ((b.status === 'ok') - (a.status === 'ok')) || a.name.localeCompare(b.name));
      if (['calendar', 'email'].includes(f.capability)) g.appendChild(choice('mail', 'Outlook / Microsoft 365', 'Personal Outlook/Hotmail or work and school accounts. Browser sign-in, read-only.', false, () => { closeFn && closeFn(); microsoftConnectionSetup(); }));
      for (const sv of ranked) {
        const badge = _connEl('span', 'src-srv-dot st-' + ({ ok: 'ok', auth: 'auth', error: 'error' }[sv.status] || 'unknown'));
        const sub = used.has(sv.name) ? 'Already a source' : !sv.usable ? 'Only user-scope servers can be used' : sv.status === 'auth' ? 'Needs sign-in in Claude first' : sv.status === 'error' ? 'Not working in Claude right now' : (sv.capability === f.capability ? 'Looks like a ' + cap.one + ' · ' : '') + (sv.kind === 'claude.ai' ? 'claude.ai connector' : 'MCP server');
        g.appendChild(choice(sv.kind === 'claude.ai' ? 'cloud' : 'database', sv.name, sub, f.server === sv.name && f.kind === 'mcp',
          () => { if (f.server !== sv.name) { f.tools = null; f.toolsErr = null; f.test = null; } f.kind = 'mcp'; f.server = sv.name; f.selected = new Set(); go('tools'); }, { disabled: used.has(sv.name) || !sv.usable, badge }));
      }
      if (f.capability === 'calendar') g.appendChild(choice('globe', 'An iCal link', 'Any calendar that can be shared as a link (.ics, webcal://). No AI involved.', f.kind === 'ical', () => { f.kind = 'ical'; go('url'); }));
      if (f.capability === 'bank') g.appendChild(choice('file-up', 'CSV exports', 'Download a CSV from your bank’s website and import it in Finances. Always available.', false, () => { closeFn && closeFn(); setView('finance'); }));
      bodyEl.appendChild(g);
      if (!servers.length) bodyEl.appendChild(_connEl('p', 'conn-note', 'No MCP servers were found in your Claude. Connect one on claude.ai (Settings > Connectors) or with claude mcp add, then click Check servers on Connections.'));
      back('what'); spacer();
      return;
    }
    if (f.step === 'tools') {
      if (!f.tools && !f.toolsErr) { loadTools(); }
      const lead = _connEl('p', 'src-lead');
      lead.textContent = f.edit ? `Which tools may ${f.edit.label} use?` : `Which tools of ${f.server} may the dashboard use?`;
      bodyEl.appendChild(lead);
      bodyEl.appendChild(_connEl('p', 'conn-note', 'Only tools that read are ticked. Tools that could change, send or delete anything are locked: the dashboard never allows them.'));
      if (f.toolsErr) {
        const m = _connEl('div', 'callout danger conn-msg'); m.innerHTML = icon('circle-alert'); m.appendChild(_connEl('span', null, f.toolsErr)); bodyEl.appendChild(m);
        bodyEl.appendChild(_connBtn('Try again', 'refresh-cw', 'btn-secondary', () => loadTools()));
      } else if (!f.tools) {
        const l = _connEl('div', 'src-loading'); l.innerHTML = '<span class="spinner"></span>'; l.appendChild(_connEl('span', null, 'Asking the server for its tools…')); bodyEl.appendChild(l);
      } else {
        const preset = /^claude\.ai (Bank|Gmail|Google Calendar)$/.test(f.server || '') && ['bank', 'email', 'calendar'].includes(f.capability);
        if (preset) bodyEl.appendChild(_connEl('div', 'callout info conn-msg src-msg', 'The dashboard has a tuned reader for this one, so it uses its own fixed set of read tools.'));
        const list = _connEl('div', 'src-tools');
        // Two or more tools to choose from: the shared select list (Select all / Deselect all / Invert; write tools stay locked).
        const pick = !preset && f.tools.filter(t => t.safety !== 'write').length > 1;
        for (const t of f.tools) {
          const row = document.createElement(pick ? 'div' : 'label'); row.className = 'src-tool st-' + t.safety;
          if (pick) { row.dataset.selId = t.name; row.setAttribute('aria-label', t.name); } else {
            const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = f.selected.has(t.name);
            cb.disabled = t.safety === 'write' || preset;
            cb.onchange = () => { if (cb.checked) f.selected.add(t.name); else f.selected.delete(t.name); paintFoot(); };
            row.appendChild(cb);
          }
          const n = _connEl('code', null, t.name);
          const tag = _connEl('span', 'src-tool-tag', t.safety === 'write' ? 'can change data · never allowed' : t.safety === 'read' ? 'reads' : 'not sure: tick only if it just reads');
          if (t.safety === 'write') tag.insertAdjacentHTML('afterbegin', icon('lock', 'i-xs'));
          row.append(n, tag);
          list.appendChild(row);
        }
        if (!f.tools.length) list.appendChild(_connEl('p', 'conn-note', 'This server lists no tools right now. If it is still starting, try again in a minute.'));
        bodyEl.appendChild(list);
        if (pick) {
          selectList(list, {
            store: { on: f.selected, seen: new Set(f.tools.map(t => t.name)) }, label: 'Tools', rowClick: true,
            locked: (name) => (f.tools.find(t => t.name === name) || {}).safety === 'write',
            onChange: () => paintFoot(),
          });
        }
      }
      paintFoot();
      return;
    }
    if (f.step === 'url') {
      bodyEl.appendChild(_connEl('p', 'src-lead', 'Paste the calendar’s iCal link'));
      const fld = _connEl('label', 'field');
      fld.appendChild(_connEl('span', 'field-label', 'Link (https:// or webcal://)'));
      const inp = document.createElement('input'); inp.className = 'control'; inp.type = 'url'; inp.placeholder = 'https://…/calendar.ics'; inp.value = f.url; inp.setAttribute('autofocus', '');
      inp.oninput = () => { f.url = inp.value.trim(); paintFoot(); };
      fld.appendChild(inp);
      fld.appendChild(_connEl('span', 'field-hint', f.edit ? 'The current link is kept on this computer only; paste a new one to replace it.' : 'In Google Calendar: Settings > your calendar > "Secret address in iCal format". In Outlook: Settings > Shared calendars > Publish. The link stays on this computer.'));
      bodyEl.appendChild(fld);
      setTimeout(() => { try { inp.focus(); } catch (e) {} }, 0);
      paintFoot();
      return;
    }
    if (f.step === 'name') {
      bodyEl.appendChild(_connEl('p', 'src-lead', 'Name and colour'));
      const fld = _connEl('label', 'field');
      fld.appendChild(_connEl('span', 'field-label', 'Name'));
      const inp = document.createElement('input'); inp.className = 'control'; inp.maxLength = 60; inp.value = f.label || defaultLabel(); inp.setAttribute('autofocus', '');
      inp.oninput = () => { f.label = inp.value; };
      f.label = inp.value;
      fld.appendChild(inp);
      bodyEl.appendChild(fld);
      const cf = _connEl('div', 'field');
      cf.appendChild(_connEl('span', 'field-label', 'Colour'));
      const sw = _connEl('div', 'cal-swatches');
      if (!f.colour) f.colour = nextColour();
      for (const c of SRC_SWATCHES) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'cal-sw c-' + c + (c === f.colour ? ' on' : '');
        b.setAttribute('aria-label', c); b.title = c[0].toUpperCase() + c.slice(1);
        b.onclick = () => { f.colour = c; paint(); };
        sw.appendChild(b);
      }
      cf.appendChild(sw);
      bodyEl.appendChild(cf);
      back(f.kind === 'ical' ? 'url' : 'tools'); spacer();
      next('Test it', () => { go('test'); runTest(); });
      return;
    }
    if (f.step === 'test') {
      bodyEl.appendChild(_connEl('p', 'src-lead', f.testing ? 'Testing a short, read-only fetch…' : 'Test'));
      if (f.testing) {
        const l = _connEl('div', 'src-loading'); l.innerHTML = '<span class="spinner"></span>';
        l.appendChild(_connEl('span', null, f.kind === 'ical' ? 'Reading the calendar…' : 'Claude is reading a few days of data with the tools you chose. This can take a minute.'));
        bodyEl.appendChild(l);
      } else if (f.test && f.test.ok) {
        const ok = _connEl('div', 'callout success conn-msg src-msg'); ok.innerHTML = icon('circle-check');
        ok.appendChild(_connEl('span', null, f.test.count == null ? (f.test.note || 'It works.') : `It works: ${f.test.count} item${f.test.count === 1 ? '' : 's'} found in the test window${f.test.accounts && f.test.accounts.length ? `, ${f.test.accounts.length} ${f.capability === 'calendar' ? 'calendar' : f.capability === 'email' ? 'mailbox' : 'account'}${f.test.accounts.length === 1 ? '' : 's'}` : ''}.`));
        bodyEl.appendChild(ok);
        if (f.test.preview && f.test.preview.length) {
          const ul = _connEl('ul', 'src-preview');
          for (const p of f.test.preview) { const li = document.createElement('li'); li.append(_connEl('span', null, p.title || ''), _connEl('time', null, String(p.when || '').slice(0, 10))); ul.appendChild(li); }
          bodyEl.appendChild(ul);
        }
        for (const w of f.test.warnings || []) bodyEl.appendChild(_connEl('p', 'conn-note', w));
      } else if (f.test) {
        const m = _connEl('div', 'callout danger conn-msg src-msg'); m.innerHTML = icon('circle-alert'); m.appendChild(_connEl('span', null, f.test.error || 'The test failed.'));
        bodyEl.appendChild(m);
        bodyEl.appendChild(_connBtn('Test again', 'refresh-cw', 'btn-secondary', () => runTest()));
      }
      back(f.edit ? (f.kind === 'ical' ? 'url' : 'tools') : 'name'); spacer();
      const s = next(f.saving ? 'Saving…' : f.edit ? 'Save changes' : 'Save and sync', () => save(), f.testing || f.saving || !(f.test && f.test.ok));
      if (f.test && !f.test.ok && !f.testing) {
        const anyway = _connBtn('Save anyway', null, 'btn-secondary', () => save());
        footEl.insertBefore(anyway, s);
      }
    }
  }
  function paintFoot() {
    footEl.innerHTML = '';
    const spacer = _connEl('span', 'spacer');
    if (f.step === 'tools') {
      if (!f.edit) footEl.appendChild(_connBtn('Back', 'arrow-left', 'btn-ghost', () => go(o.server ? 'what' : 'from')));
      footEl.appendChild(spacer);
      const n = f.selected.size;
      footEl.appendChild(_connEl('span', 'src-count', n ? `${n} tool${n === 1 ? '' : 's'} chosen` : 'Choose at least one'));
      const b = _connBtn(f.edit ? 'Test it' : 'Next', null, 'btn-primary', () => { if (f.edit) { go('test'); runTest(); } else go('name'); });
      b.disabled = !n || !f.tools; footEl.appendChild(b);
    } else if (f.step === 'url') {
      if (!f.edit) footEl.appendChild(_connBtn('Back', 'arrow-left', 'btn-ghost', () => go('from')));
      footEl.appendChild(spacer);
      const okUrl = /^(https|webcals?):\/\/[^\s]+$/i.test(f.url);
      const b = _connBtn(f.edit ? 'Test it' : 'Next', null, 'btn-primary', () => { if (f.edit) { go('test'); runTest(); } else go('name'); });
      b.disabled = !okUrl; footEl.appendChild(b);
    }
  }

  closeFn = openDrawer({
    title: f.edit ? `Edit ${f.edit.label}` : 'Add a source', width: 520,
    body: (el) => { bodyEl = el; el.classList.add('src-flow'); },
    footer: (el) => { footEl = el; el.classList.add('src-flow-f'); },
  });
  paint();
}

registerCommand({ id: 'add-source', label: 'Add a data source', icon: 'plus', group: 'Commands', keywords: 'bank calendar email gmail outlook ical mcp connect account source', run: () => { setView('connections'); setTimeout(() => srcAddFlow({}), 50); } });
