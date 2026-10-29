/* ============================================================
   CONNECTIONS (#view=connections). Owner: Connections.
   One card per connection with a live status, what it unlocks, and a
   guided way to connect. Status comes from GET /api/connections (cached
   in <data>/connections.json, re-checked at most hourly); "Check again"
   runs one harmless check. Gating of features lives in
   56-connections-gate.js (window.Connections). The cards here never ask
   for a password: sign-in happens in Claude's own window, on claude.ai or
   on the provider's own page. Money (banks and wallets) is its own block,
   56-fin-connect.js: its direct connections save a Monzo client or an
   Enable Banking key file on this computer only (lib/secret-store.mjs), never in the
   page.
   ============================================================ */
const CONNECTORS_URL = 'https://claude.ai/customize/connectors';
const CONNECTION_INFO = [
  { id: 'claude', name: 'Claude', icon: 'sparkles', sub: 'Claude Code on this computer',
    unlocks: ['Assistant', 'Smart suggestions', 'Link tasks to people', 'Task chat'],
    text: 'Uses your own Claude account.' },
  { id: 'gmail', name: 'Gmail', icon: 'mail', sub: 'Through Claude · read-only',
    unlocks: ['Email triage', 'Tasks from email', 'Recent mail on people'],
    text: 'Finds tasks in recent email. It never sends or deletes.' },
  { id: 'calendar', name: 'Google Calendar', icon: 'calendar-days', sub: 'Through Claude · read-only',
    unlocks: ['Events next to tasks', 'Update calendar', 'Meeting prep'],
    text: 'Events next to your tasks. Read-only.' },
];
const CONN_STATE_LABEL = {
  ok: ['ok', 'Connected'], auth: ['warn', 'Needs sign-in'], setup: ['off', 'Not set up'], limited: ['warn', 'Usage limit reached'],
  error: ['err', 'Check failed'], unknown: ['off', 'Not checked yet'], checking: ['busy', 'Checking…'],
};
let _connMcp = null, _connMcpLoading = false, _connMcpTest = null, _connMcpTesting = false;
let _connSub = null;

function _connAgo(iso) {
  if (!iso) return 'never';
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 50) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24); return `${d} day${d === 1 ? '' : 's'} ago`;
}
function _connEl(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
/** A small Copy button (copyText: one wording for both outcomes); it says Copied for a moment. what: 'command', 'link'... */
function _connCopyBtn(text, label, what) {
  return uiButton({ label: label || 'Copy', icon: 'copy', kind: 'ghost', size: 'sm', run: async (e, b) => {
    if (!(await copyText(text, what || 'text', { quiet: true }))) return;
    b.innerHTML = icon('check') + '<span>Copied</span>';
    setTimeout(() => { b.innerHTML = icon('copy') + `<span>${esc(label || 'Copy')}</span>`; }, 1600);
  } });
}
function _connCode(text, label, what) {
  const w = _connEl('div', 'conn-code');
  const pre = _connEl('pre', null, text);
  w.append(pre, _connCopyBtn(text, label, what || 'command'));
  return w;
}
function _connStatusPill(entry) {
  const st = entry && entry.checking ? 'checking' : ((entry && entry.state) || 'unknown');
  const [kind, label] = CONN_STATE_LABEL[st] || CONN_STATE_LABEL.unknown;
  const s = _connEl('span', 'status ' + kind, label);
  if (st === 'checking') s.classList.add('is-busy');
  return s;
}
function _connSteps(items) {
  const ol = _connEl('ol', 'conn-steps');
  for (const it of items) {
    const li = document.createElement('li');
    // an item is text, an element, or [text, element...] (one step with a command under it)
    for (const part of (Array.isArray(it) ? it : [it])) {
      if (typeof part === 'string') li.appendChild(_connEl('span', null, part)); else li.appendChild(part);
    }
    ol.appendChild(li);
  }
  return ol;
}
async function _connOpenTerminal(btn) {
  if (btn) btn.disabled = true;
  try {
    const r = await fetch('/api/connections/open-terminal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.opened) {
      toast('A Claude window opened. Finish signing in there: OpenDash checks again when you come back.', { kind: 'ok', timeout: 7000 });
      // Back in this tab within 10 minutes: check by itself (no hunting for Check again).
      const t0 = Date.now();
      const back = async () => {
        if (document.hidden || Date.now() - t0 < 3000) return;
        window.removeEventListener('focus', back);
        if (Date.now() - t0 > 10 * 60000) return;
        await connCheck('claude');
        const c = _connAll && _connAll.claude;
        if (c && c.state === 'ok') toast('Claude connected. AI features are on', { kind: 'ok' });
        else toast('Claude is not signed in yet. Finish in the Claude window, then press Check again.', { kind: 'info', timeout: 9000, action: { label: 'Check again', run: () => connCheck('claude') } });
      };
      window.addEventListener('focus', back);
    }
    else if (r.ok) toast('No terminal app was found. Open one yourself and run: claude', { kind: 'warn', timeout: 9000 });
    else toastError('open a terminal window', j.error || 'OpenDash didn’t say why', () => _connOpenTerminal(btn));
  } catch (e) { toastError('open a terminal window', e, () => _connOpenTerminal(btn)); }
  if (btn) btn.disabled = false;
}

/** The "how to connect" part of a card, by connection and state. */
function _connHelp(c, e, all) {
  const box = _connEl('div', 'conn-help');
  const st = (e && e.state) || 'unknown';
  if (c.id === 'claude') {
    const cliMissing = (all.cli && all.cli.installed === false) || (e && e.status === 'not-installed');
    if (cliMissing) {
      box.appendChild(_connEl('div', 'conn-help-t', 'Install Claude Code'));
      const win = /Win/.test(navigator.platform || '') || /Windows/.test(navigator.userAgent || '');
      box.appendChild(_connSteps([
        ['Open ' + (win ? 'PowerShell' : 'a terminal') + ' and run the installer:', _connCode(win ? 'irm https://claude.ai/install.ps1 | iex' : 'curl -fsSL https://claude.ai/install.sh | bash')],
        'Run claude once and sign in with your Claude account (Pro or Max).',
        'Restart OpenDash, then click Check again.',
      ]));
      // The unusual cases fold away (SIMPLIFY_PLAN.md 5.6): npm, and Claude in an odd place.
      setFold(box, 'conn-claude-unusual', 'Something unusual?', ({ body }) => {
        body.appendChild(_connEl('p', 'conn-note', 'Using npm instead? npm install -g @anthropic-ai/claude-code.'));
        body.appendChild(_connEl('p', 'conn-note', 'Claude installed somewhere unusual? Put CLAUDE_CLI_PATH=<full path to claude> in a .env file in the OpenDash app folder, or in the OpenDash folder in your local app data (never in the data folder).'));
      });
    } else if (st === 'auth' || st === 'error' || st === 'unknown') {
      box.appendChild(_connEl('div', 'conn-help-t', st === 'auth' ? 'Sign in to Claude' : 'Connect Claude'));
      const open = uiButton({ label: 'Open sign-in window', icon: 'log-in', kind: 'primary', size: 'sm', run: (e, b) => _connOpenTerminal(b) });
      box.appendChild(_connSteps([open, 'In the window that opens, follow the sign-in steps (your browser opens to confirm).', 'Close the window when it says you are signed in, then click Check again.']));
    } else if (st === 'limited') {
      box.appendChild(_connEl('p', 'conn-note', 'Your Claude plan’s usage limit was reached. AI features come back on their own when it resets.'));
    }
    return box.childNodes.length ? box : null;
  }
  // claude.ai connectors
  if (st === 'ok') return null;
  if (e && e.status === 'needs-claude') {
    box.appendChild(_connEl('div', 'conn-help-t', 'Connect Claude first'));
    box.appendChild(_connEl('p', 'conn-note', `${c.name} is reached through Claude, so it can only be checked once Claude works.`));
    box.appendChild(uiButton({ label: 'Go to Claude', icon: 'arrow-up', kind: 'secondary', size: 'sm', run: () => connOpen('claude') }));
    return box;
  }
  box.appendChild(_connEl('div', 'conn-help-t', st === 'auth' ? `Reconnect ${c.name}` : `Connect ${c.name}`));
  const open = uiButton({ label: 'Sign in & verify', icon: 'external-link', kind: 'primary', size: 'sm', run: () => {
    if (typeof connCloudSignIn === 'function') connCloudSignIn(null, c.id);
    else window.open(CONNECTORS_URL, '_blank', 'noopener');
  } });
  box.appendChild(_connSteps([
    open,
    st === 'auth' ? `Find ${c.name} and choose Reconnect (or Disconnect, then Connect).` : `Find ${c.name} and choose Connect, then sign in and allow access.`,
    'Return here after sign-in. OpenDash checks the connection automatically.',
  ]));
  const fb = _connEl('div', 'conn-fallback');
  fb.appendChild(_connEl('span', null, 'Still not working? Run claude in a terminal and type /mcp, then pick the connector to sign in again.'));
  fb.appendChild(uiButton({ label: 'Open terminal', icon: 'terminal', kind: 'secondary', size: 'sm', run: (e, b) => _connOpenTerminal(b) }));
  box.appendChild(fb);
  return box;
}

function _connCard(c, all) {
  const e = all[c.id] || { state: 'unknown' };
  const card = _connEl('section', 'card conn-card');
  card.dataset.conn = c.id;
  card.classList.add('st-' + (e.checking ? 'checking' : (e.state || 'unknown')));
  const head = _connEl('div', 'conn-head');
  const ic = _connEl('span', 'conn-ic'); ic.innerHTML = _connMark(c.id, c.icon);
  const t = _connEl('div', 'conn-titles');
  t.append(_connEl('div', 'conn-name', c.name), _connEl('div', 'conn-sub', c.sub));
  head.append(ic, t, _connStatusPill(e));
  card.appendChild(head);
  card.appendChild(_connEl('p', 'conn-text', c.text));
  const un = _connEl('div', 'conn-unlocks');
  un.appendChild(_connEl('span', 'conn-unlocks-l', e.state === 'ok' ? 'Unlocked' : 'Unlocks'));
  for (const u of c.unlocks) { const ch = _connEl('span', 'chip' + (e.state === 'ok' ? ' chip-accent' : ''), null); ch.innerHTML = (e.state === 'ok' ? icon('check', 'i-xs') : icon('lock', 'i-xs')) + `<span>${esc(u)}</span>`; un.appendChild(ch); }
  card.appendChild(un);
  if (e.message && e.state !== 'ok' && !e.checking && e.status !== 'needs-claude') {
    const m = _connEl('div', 'callout ' + (e.state === 'error' ? 'danger' : 'warn') + ' conn-msg');
    m.innerHTML = icon(e.state === 'error' ? 'circle-alert' : 'info');
    m.appendChild(_connEl('span', null, e.message));
    card.appendChild(m);
  }
  const help = !e.checking && _connHelp(c, e, all);
  if (help) card.appendChild(help);
  const foot = _connEl('div', 'conn-foot');
  foot.appendChild(_connEl('span', 'conn-when', e.checking ? 'Checking now…' : `Checked ${_connAgo(e.checkedAt)}`));
  const chk = uiButton({ label: e.checking ? 'Checking…' : 'Check again', icon: e.checking ? null : 'refresh-cw', kind: 'secondary', size: 'sm', run: () => connCheck(c.id) });
  if (e.checking) { chk.disabled = true; chk.insertAdjacentHTML('afterbegin', '<span class="spinner"></span>'); }
  foot.appendChild(chk);
  card.appendChild(foot);
  return card;
}

/* ---------- OpenDash MCP card ---------- */
async function _connLoadMcp() {
  if (_connMcpLoading) return;
  _connMcpLoading = true;
  const was = _connMcp ? JSON.stringify(_connMcp.installed) : null;
  try { const r = await fetch('/api/connections/mcp', { cache: 'no-store' }); if (r.ok) _connMcp = await r.json(); } catch (e) { /* offline */ }
  _connMcpLoading = false;
  const now = _connMcp ? JSON.stringify(_connMcp.installed) : null;
  if (was !== now) {
    // Installed or removed outside the page (a terminal, Claude Desktop): the server list follows.
    if (was !== null && typeof SourcesStore !== 'undefined') SourcesStore.refresh({ cached: true });
    if (state.view === 'connections') renderMain();
  }
}
/** Re-read the real config (cheap): on entering the page, on focus, after a test or an install. */
let _connMcpCheckedAt = 0;
const _connMcpStale = () => Date.now() - _connMcpCheckedAt > 10000;   // mount runs on every render: not each time
function _connRecheckMcp() {
  _connMcpCheckedAt = Date.now();
  _connLoadMcp();
  if (typeof SourcesStore !== 'undefined' && !SourcesStore.loading && SourcesStore.data) SourcesStore.load({ cached: true });
}
window.addEventListener('focus', () => { if (state.view === 'connections') _connRecheckMcp(); });
let _connMcpInstalling = false, _connMcpPoll = null;
async function _connInstallMcp() {
  if (_connMcpInstalling) return false;
  _connMcpInstalling = true; if (state.view === 'connections') renderMain();
  let ok = false;
  try {
    const r = await fetch('/api/connections/mcp-install', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
    if (_connMcp) _connMcp = Object.assign({}, _connMcp, { installed: j.installed });
    else _connMcp = { installed: j.installed };
    // Show the new server in the list straight away (the server merged it from the real config).
    if (Array.isArray(j.servers) && SourcesStore.data) SourcesStore.data = Object.assign({}, SourcesStore.data, { servers: j.servers });
    ok = true;
    toast(j.already ? 'Already added to Claude Code' : 'Added to Claude Code. Restart open Claude sessions to use it.', { kind: 'ok' });
  } catch (e) {
    toastError('add OpenDash to Claude Code', e, () => _connInstallMcp());
  }
  _connMcpInstalling = false;
  connRefresh({ force: true });
  SourcesStore.refresh({ cached: true });
  if (ok) setTimeout(() => { if (!SourcesStore.loading) SourcesStore.load({ cached: true }); }, 25000);   // its health, once claude mcp list has run
  _connLoadMcp();
  if (state.view === 'connections') renderMain();
  return ok;
}
async function _connRunMcpTest() {
  _connMcpTesting = true; if (state.view === 'connections') renderMain();
  try {
    const r = await fetch('/api/connections/mcp-test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    _connMcpTest = await r.json().catch(() => ({ ok: false, error: 'OpenDash isn’t answering. Try again in a moment.' }));
  } catch (e) { _connMcpTest = { ok: false, error: netErrorMessage(e) }; }
  _connMcpTesting = false;
  _connRecheckMcp();
  await connRefresh({ force: true });
  if (_connMcpTest.ok) toast(`OpenDash answered with ${_connMcpTest.tools} tools`, { kind: 'ok' });
  if (state.view === 'connections') renderMain();
}
/**
 * "OpenDash in your AI apps" (Connections > Advanced; the OpenDash MCP). Card template: the status
 * first (Added / Not added / Added for another copy of OpenDash), one sentence, one action (Add to
 * Claude Code, else Test it); where it is added, the last test and Set up sit under More.
 */
function _connMcpCard(all) {
  const e = all.mcp || { state: 'unknown' };
  // The newest read of the real config wins (the connections list re-reads it on every refresh).
  const inst = (_connMcp && _connMcp.installed && _connMcp.installed.summary) || e.installed || {};
  const card = _connEl('section', 'card conn-card');
  card.dataset.conn = 'mcp';
  const head = _connEl('div', 'conn-head');
  const ic = _connEl('span', 'conn-ic'); ic.innerHTML = _connMark('mcp', 'plug-zap');
  const t = _connEl('div', 'conn-titles');
  t.append(_connEl('div', 'conn-name', 'OpenDash in your AI apps'), _connEl('div', 'conn-sub', 'Claude Code, T3 Code or Claude Desktop'));
  head.append(ic, t);
  card.appendChild(head);
  const anyInstalled = inst.claudeCode === 'installed' || inst.desktop === 'installed';
  const other = !anyInstalled && (inst.claudeCode === 'other-copy' || inst.desktop === 'other-copy');
  const where = [inst.claudeCode === 'installed' ? 'Claude Code' : '', inst.desktop === 'installed' ? 'Claude Desktop' : ''].filter(Boolean).join(' and ');
  card.appendChild(anyInstalled ? setStatusLine('ok', 'Added', where)
    : other ? setStatusLine('warn', 'Added for another copy of OpenDash', 'Add it again for this one')
      : setStatusLine('off', 'Not added'));
  card.appendChild(_connEl('p', 'conn-text', 'Claude Code, T3 Code or Claude Desktop can read and change your tasks, with Undo here.'));
  if (_connMcpTest && !_connMcpTest.ok && _connMcpTest.error) {
    const m = _connEl('div', 'callout danger conn-msg'); m.innerHTML = icon('circle-alert'); m.appendChild(_connEl('span', null, _connMcpTest.error)); card.appendChild(m);
  }
  const testBtn = (kind) => {
    const tb = uiButton({ label: _connMcpTesting ? 'Testing…' : 'Test it', icon: _connMcpTesting ? null : 'zap', kind, size: 'sm', run: () => _connRunMcpTest() });
    if (_connMcpTesting) { tb.disabled = true; tb.insertAdjacentHTML('afterbegin', '<span class="spinner"></span>'); }
    return tb;
  };
  if (inst.claudeCode !== 'installed') {
    const ib = setAction(card, _connMcpInstalling ? 'Adding…' : 'Add to Claude Code', () => _connInstallMcp(), { icon: _connMcpInstalling ? null : 'plus' });
    if (_connMcpInstalling) { ib.disabled = true; ib.insertAdjacentHTML('afterbegin', '<span class="spinner"></span>'); }
    ib.dataset.act = 'mcp-install';
  } else {
    const row = _connEl('div', 'set-action'); row.appendChild(testBtn('secondary')); card.appendChild(row);
  }
  setFold(card, 'conn-mcp-more', 'More', ({ body }) => {
    const rows = _connEl('dl', 'kv conn-kv');
    const said = (v) => v === 'installed' ? 'Added' : v === 'other-copy' ? 'Added for another copy of OpenDash' : 'Not added';
    rows.innerHTML = `<dt>Claude Code / T3 Code</dt><dd>${esc(said(inst.claudeCode))}</dd><dt>Claude Desktop</dt><dd>${esc(said(inst.desktop))}</dd>`
      + `<dt>Last test</dt><dd>${esc(e.checkedAt ? (e.state === 'ok' ? `Answered (${e.tools || '?'} tools) · ${_connAgo(e.checkedAt)}` : `Failed · ${_connAgo(e.checkedAt)}`) : 'Not tested yet')}</dd>`;
    body.appendChild(rows);
    body.appendChild(_connEl('p', 'conn-note', 'Runs on this computer; nothing is sent anywhere else.'));
    const acts = _connEl('div', 'assistant-actions');
    acts.appendChild(uiButton({ label: 'Set up', icon: 'settings', kind: 'secondary', size: 'sm', run: () => _connMcpDrawer() }));
    if (inst.claudeCode !== 'installed') acts.appendChild(testBtn('ghost'));
    body.appendChild(acts);
  });
  return card;
}
function _connMcpDrawer() {
  const info = _connMcp && _connMcp.install;
  // While the drawer is open, notice a command pasted into a terminal (the real config is re-read).
  clearInterval(_connMcpPoll);
  const poll = _connMcpPoll = setInterval(() => _connLoadMcp(), 4000);
  openDrawer({
    title: 'Add OpenDash to your AI apps', width: 560,
    onClose: () => { clearInterval(poll); if (_connMcpPoll === poll) _connMcpPoll = null; },
    body: (el, closeD) => {
      if (!info) { el.appendChild(_connEl('p', 'muted', 'Loading the commands for this computer…')); _connLoadMcp().then(() => { if (_connMcp) { closePopovers(); _connMcpDrawer(); } }); return; }
      const sec = (title, sub) => { const h = _connEl('div', 'conn-dsec'); h.appendChild(_connEl('h3', null, title)); if (sub) h.appendChild(_connEl('p', 'conn-note', sub)); el.appendChild(h); return h; };
      const a = sec('Claude Code and T3 Code', info.claudeCode.note);
      const ccInst = _connMcp && _connMcp.installed && _connMcp.installed.summary && _connMcp.installed.summary.claudeCode;
      if (ccInst !== 'installed') {
        const row = _connEl('div', 'conn-dact');
        row.appendChild(uiButton({ label: 'Add it for me', icon: 'plus', kind: 'primary', size: 'sm', run: async (e, b) => { b.disabled = true; if (await _connInstallMcp()) closeD(); else b.disabled = false; } }));
        row.appendChild(_connEl('span', 'conn-note', 'Runs the command below for you. Or paste it into a terminal yourself:'));
        a.appendChild(row);
      } else a.appendChild(_connEl('p', 'conn-note', 'Already added to Claude Code and T3 Code.'));
      if (info.claudeCode.powershell) {
        a.appendChild(_connEl('div', 'conn-label', 'PowerShell'));
        a.appendChild(_connCode(info.claudeCode.powershell));
        a.appendChild(_connEl('div', 'conn-label', 'Command Prompt (cmd)'));
        a.appendChild(_connCode(info.claudeCode.cmd));
      } else a.appendChild(_connCode(info.claudeCode.shell));
      a.appendChild(_connEl('div', 'conn-label', 'Check it is there'));
      a.appendChild(_connCode(info.claudeCode.check));
      const b = sec('Claude Desktop', `Add this to ${info.claudeDesktop.file}. ${info.claudeDesktop.note}`);
      b.appendChild(_connCode(JSON.stringify(info.claudeDesktop.json, null, 2), 'Copy JSON', 'JSON'));
      const c = sec('Permissions (optional)', info.permissions.note);
      c.appendChild(_connEl('div', 'conn-label', 'Read freely, ask before changes (recommended)'));
      c.appendChild(_connCode(JSON.stringify({ permissions: info.permissions.readOnly }, null, 2), 'Copy JSON', 'JSON'));
      c.appendChild(_connEl('div', 'conn-label', 'Never ask'));
      c.appendChild(_connCode(JSON.stringify({ permissions: info.permissions.allowAll }, null, 2), 'Copy JSON', 'JSON'));
      const d = sec('Then try it', 'Restart Claude, then ask for example: "What is due this week on my dashboard?" Changes your AI apps make appear here straight away, with Undo.');
      d.appendChild(uiButton({ label: 'Test it now', icon: 'zap', kind: 'secondary', size: 'sm', run: () => _connRunMcpTest() }));
    },
  });
}

/* ---------- the page ----------
   The page template (UX_BLUEPRINT.md 3; SIMPLIFY_PLAN.md 5.6, L16): the shared header draws the
   title, "Add a connection" (primary) and More (Check all, How your data is handled) through
   headerActions. The body starts with ONE status line from _connPageCounts ("3 connected" /
   "1 needs you · Gmail"), one grey line, then Email and calendar, Money, Other connections,
   AI and the Advanced fold. Filters and the search show only above six connections. */
let _connPageFilter = 'all', _connPageQuery = '', _connPageAdvanced = false, _connPageChecking = false;
let _connPageSearchFocus = false, _connPageSearchCaret = 0;
let _connPageAccountFocus = null;
const CONN_PAGE_FILTER_MIN = 7;   // filters and search only above six connections

function _connPageLiveSource(s) { return s.kind !== 'csv' && !s.demo && s.enabled !== false; }
/** The user must do something: sign in, finish setting it up, or it is broken (not "not checked yet", P6). */
function _connPageNeedsAttention(s) { return _connPageLiveSource(s) && ['auth', 'error', 'setup'].includes(_connPageSourceState(s)); }
function _connPageMatchesSource(s, filter, query) {
  const st = _connPageSourceState(s);
  if (filter === 'connected' && !(_connPageLiveSource(s) && st === 'ok')) return false;
  if (filter === 'attention' && !_connPageNeedsAttention(s)) return false;
  if (filter === 'paused' && st !== 'off') return false;
  const text = [s.label, s.server, s.capability, s.kind, ...(s.accounts || []).map(a => a.name || a.id)].join(' ').toLowerCase();
  return !query.trim() || text.includes(query.trim().toLowerCase());
}
/** {connected, attention, first}: the page's status line (first = the name of the first one that needs you). */
function _connPageCounts(sources, all) {
  const assistants = all.assistants ? ASSISTANT_OPTIONS.filter(p => p.id !== 'grok').map(p => Object.assign({ name: p.name }, _connPageAssistantDetails(p.id, all))) : null;
  const health = all.googleHealth || {};
  const needs = [
    ...sources.filter(_connPageNeedsAttention).map(s => s.label),
    ...(assistants ? assistants.filter(a => a.attention).map(a => a.name) : all.claude && ['auth', 'error', 'setup'].includes(all.claude.state) ? ['Claude'] : []),
    ...(health.error || health.needsAuth ? ['Google Health'] : []),
  ];
  return {
    connected: sources.filter(s => _connPageLiveSource(s) && _connPageSourceState(s) === 'ok').length + (assistants ? assistants.filter(a => a.working).length : all.claude && all.claude.state === 'ok' ? 1 : 0) + (health.connected ? 1 : 0),
    attention: needs.length,
    first: needs[0] || '',
  };
}
async function _connPageCheck() {
  if (_connPageChecking) return;
  _connPageChecking = true;
  const repaint = () => { if (state.view !== 'connections') return; renderMain(); if (typeof renderPageHeaderControls === 'function') renderPageHeaderControls(); };
  repaint();
  try { await connCheck('claude'); await SourcesStore.refresh({ refresh: true }); }
  finally { _connPageChecking = false; repaint(); }
}
function _connPagePrivacy() {
  openDrawer({ title: 'How your data is handled', width: 500, body: el => {
    el.appendChild(_connEl('p', 'conn-text', 'Your connections only read. They bring information into OpenDash without sending email, changing account records or deleting data.'));
    el.appendChild(_connSteps([
      'Sign in with the provider or in Claude’s own window. OpenDash never asks for your password.',
      'Choose which calendars, mailboxes and accounts to include. Pause or remove a connection from its menu at any time.',
      'What comes in lives in your data folder. Anything that goes through Claude uses your own Claude account.',
      'Your AI apps can read and change tasks if you add OpenDash to them (Advanced).',
    ]));
  } });
}
/** The shared header draws a section's headerActions (14-shell.js, the 2.18 page header contract). Before that, the page draws its own row. */
function _connHeaderContract() { return typeof headerActionsFor === 'function' || typeof registerHeaderActions === 'function'; }
/** The page's one status line and its grey line (P1: status first). */
function _connPageStatus(sources, all, ready) {
  const box = _connEl('div', 'cp-status');
  const c = _connPageCounts(sources, all);
  if (!ready && SourcesStore.error) box.appendChild(setStatusLine('warn', 'Needs you', 'OpenDash isn’t answering'));
  else if (!ready) box.appendChild(setStatusLine('busy', 'Checking', 'Your connections are loading'));
  else if (c.attention) box.appendChild(setStatusLine('warn', `${c.attention} need${c.attention === 1 ? 's' : ''} you`, c.first));
  else if (c.connected) box.appendChild(setStatusLine('ok', `${c.connected} connected`));
  else box.appendChild(setStatusLine('idle', 'Not set up', 'Add your email, calendar or bank'));
  const line = _connEl('p', 'cp-status-note');
  line.appendChild(_connEl('span', null, 'Read-only. Your data stays on this computer.'));
  line.appendChild(uiButton({ label: 'How your data is handled', kind: 'link', run: () => _connPagePrivacy() }));
  box.appendChild(line);
  if (!_connHeaderContract()) {
    // Until the shared header draws the page's actions: the same two, here.
    const row = _connEl('div', 'cp-status-acts');
    row.appendChild(uiButton({ label: 'Add a connection', icon: 'plus', kind: 'primary', size: 'sm', run: () => srcAddFlow({}) }));
    const chk = uiButton({ label: _connPageChecking ? 'Checking…' : 'Check all', icon: 'refresh-cw', kind: 'ghost', size: 'sm', run: () => _connPageCheck() });
    chk.disabled = _connPageChecking;
    row.appendChild(chk);
    box.appendChild(row);
  }
  return box;
}
function _connPageSourceSection(sources, ready, all) {
  const section = _connEl('section', 'cp-connections');
  section.appendChild(secHead({ title: 'Other connections' }));
  // Banks and wallets live in the Money block (56-fin-connect.js); mail and calendar ACCOUNTS have their own cards (56-accounts.js).
  const listed = sources.filter(s => s.capability !== 'bank' && !s.account);
  const filtered = listed.length >= CONN_PAGE_FILTER_MIN;
  if (!filtered) { _connPageFilter = 'all'; _connPageQuery = ''; }   // nothing hidden by a filter nobody can see
  const toolbar = _connEl('div', 'cp-toolbar'), filters = _connEl('div', 'cp-filters');
  filters.setAttribute('role', 'group'); filters.setAttribute('aria-label', 'Filter connections');
  const grid = _connEl('div', 'cp-source-grid');
  const results = _connEl('span', 'cp-results'); results.setAttribute('role', 'status'); results.setAttribute('aria-live', 'polite');
  let input = null;
  const paint = () => {
    grid.replaceChildren();
    const visible = listed.filter(s => _connPageMatchesSource(s, _connPageFilter, _connPageQuery));
    for (const s of visible) grid.appendChild(_connPageSourceCard(s));
    // CSVs and demo sources never stand in for a connected account.
    const missing = ['calendar', 'email'].filter(cap => !sources.some(s => s.capability === cap && s.kind !== 'csv' && !s.demo));
    if (ready && _connPageFilter === 'all') for (const cap of missing) {
      const suggestion = _connPageSuggestion(cap);
      if (!_connPageQuery.trim() || suggestion.textContent.toLowerCase().includes(_connPageQuery.trim().toLowerCase())) grid.appendChild(suggestion);
    }
    if (!ready && !SourcesStore.error) grid.appendChild(_connEl('p', 'cp-loading', 'Loading your connections…'));
    else if (ready && !grid.childElementCount) {
      grid.appendChild(emptyLine(listed.length ? 'No connections match. Try another search or show them all.' : 'Your other connections show here.',
        listed.length ? { label: 'Show all', icon: 'x', run: () => { _connPageFilter = 'all'; _connPageQuery = ''; if (input) input.value = ''; paint(); } } : { label: 'Add a connection', icon: 'plus', run: () => srcAddFlow({}) }));
    }
    results.textContent = !filtered ? '' : ready ? `${visible.length} connection${visible.length === 1 ? '' : 's'} shown` : 'Loading connections';
    for (const button of filters.children) { const active = button.dataset.filter === _connPageFilter; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); }
  };
  if (filtered) {
    for (const [id, label, count] of [
      ['all', 'All', listed.length], ['connected', 'Connected', listed.filter(s => _connPageLiveSource(s) && _connPageSourceState(s) === 'ok').length],
      ['attention', 'Needs you', listed.filter(_connPageNeedsAttention).length], ['paused', 'Paused', listed.filter(s => _connPageSourceState(s) === 'off').length],
    ]) {
      const button = _connEl('button', 'cp-filter'); button.type = 'button'; button.dataset.filter = id;
      button.append(_connEl('span', null, label), _connEl('span', 'cp-count', ready ? String(count) : '—'));
      button.onclick = () => { if (_connPageFilter === id) return; _connPageFilter = id; paint(); };
      filters.appendChild(button);
    }
    const search = _connEl('label', 'cp-search'); search.innerHTML = icon('search');
    input = _connEl('input'); input.type = 'search'; input.placeholder = 'Find a connection…'; input.value = _connPageQuery;
    input.setAttribute('aria-label', 'Find a connection');
    input.onfocus = () => { _connPageSearchFocus = true; };
    input.onblur = () => { _connPageSearchFocus = false; };
    input.onselect = () => { _connPageSearchCaret = input.selectionStart ?? input.value.length; };
    input.oninput = () => { _connPageQuery = input.value; _connPageSearchCaret = input.selectionStart ?? input.value.length; paint(); };
    search.appendChild(input); toolbar.append(filters, search); section.append(toolbar, results);
  }
  section.appendChild(grid);
  if (SourcesStore.error) {
    const error = _connEl('div', 'cp-fetch-error'); error.setAttribute('role', 'alert');
    error.append(_connEl('span', null, netErrorMessage(SourcesStore.error)), uiButton({ label: 'Try again', icon: 'refresh-cw', kind: 'secondary', size: 'sm', run: () => SourcesStore.refresh({ cached: true }) }));
    section.insertBefore(error, section.children[1] || null);
  }
  paint();
  // Google Health shows here once it can be used; while it is not available yet it sits under Advanced.
  if (typeof googleHealthConnectionCard === 'function' && googleHealthActive(all)) section.appendChild(googleHealthConnectionCard(all));
  if (filtered && _connPageSearchFocus) requestAnimationFrame(() => { if (input && input.isConnected) { input.focus({ preventScroll: true }); input.setSelectionRange(_connPageSearchCaret, _connPageSearchCaret); } });
  return section;
}

function _connPageAssistantSection(all) {
  const section = _connEl('section', 'cp-assistants');
  section.append(secHead({ title: 'AI', sub: 'OpenDash’s AI uses Claude. Other assistants can use your tasks too.' }), _connPageAssistantCards(all));
  return section;
}
/** Advanced (rare and technical): OpenDash in your AI apps, Claude's own connections, Claude in your browser, Google's direct sign-in. */
function _connPageAdvancedFold(page, all) {
  return setFold(page, 'conn-page-adv', 'Advanced · Use OpenDash from your AI apps, and Claude’s own connections', ({ body, card }) => {
    if (_connPageAdvanced) card.open = true;
    _connPageAdvanced = card.open;
    body.classList.add('cp-advanced-body');
    body.append(_connEl('p', 'cp-subtitle', 'Your AI apps can read and change your tasks; every change shows here with Undo.'), _connMcpCard(all), srcServersCard());
    // These two poll while they are on screen: built only once the fold is open.
    if (card.open && typeof hostedRelayCard === 'function') body.appendChild(hostedRelayCard());
    if (card.open && typeof remoteMcpCard === 'function') body.appendChild(remoteMcpCard());
    if (typeof googleHealthConnectionCard === 'function' && !googleHealthActive(all)) body.appendChild(googleHealthConnectionCard(all));
    const g = all.google;
    if (g && g.status && g.status !== 'not-set-up') {
      const adv = _connEl('div', 'conn-adv');
      adv.appendChild(_connEl('span', 'conn-adv-t', 'Google (direct sign-in, optional)'));
      adv.appendChild(_connStatusPill(g));
      if (g.status === 'configured') adv.appendChild(uiButton({ label: 'Sign in', icon: 'log-in', kind: 'secondary', size: 'sm', run: () => window.open('/api/google/connect', '_blank') }));
      adv.dataset.conn = 'google'; body.appendChild(adv);
    }
    card.addEventListener('toggle', () => {
      const was = _connPageAdvanced;
      _connPageAdvanced = card.open;
      if (card.open && !was && !card.querySelector('[data-conn="hosted-relay"]') && state.view === 'connections') renderMain();
    });
  }, { advanced: true });
}

registerPage({ id: 'connections', view: 'connections', match: v => v === 'connections', label: 'Connections', icon: 'plug', area: 'system', order: 20,
  desc: 'Accounts and sign-ins: calendar, mail, bank, Claude', keywords: 'connections accounts sign in google microsoft outlook gmail bank claude connect' });
registerSection('connections', {
  group: 'system',
  title: () => 'Connections',
  // The page template: one primary action, the rest under More (UX_BLUEPRINT.md 3).
  headerActions: () => ({
    primary: { label: 'Add a connection', icon: 'plus', run: () => srcAddFlow({}), tip: 'Email, calendar, bank or another connection' },
    more: [
      { label: _connPageChecking ? 'Checking all…' : 'Check all', icon: 'refresh-cw', disabled: _connPageChecking, run: () => _connPageCheck() },
      { label: 'How your data is handled', icon: 'shield-check', run: () => _connPagePrivacy() },
    ],
  }),
  mount(container) {
    const sub = document.getElementById('view-subtitle');
    if (sub) sub.textContent = '';
    let all = (typeof connRefresh === 'function') ? (Connections.all() || null) : null;
    if (!_connSub && window.Connections) _connSub = Connections.onChange(() => { if (state.view === 'connections') renderMain(); });
    if (!all) {
      for (let i = 0; i < 4; i++) { const s = document.createElement('div'); s.className = 'skeleton skeleton-row'; container.appendChild(s); }
      connRefresh();
      return;
    }
    if (!_connMcpLoading && _connMcpStale()) _connRecheckMcp();
    // The cheap config read is fresher than cached connection probes.
    if (_connMcp && _connMcp.installed && _connMcp.installed.summary) all = Object.assign({}, all, { mcp: Object.assign({}, all.mcp, { installed: _connMcp.installed.summary }) });
    if (!SourcesStore.data && !SourcesStore.loading && !SourcesStore.error) SourcesStore.load({ cached: true });
    if (_connFocus) { _connPageFilter = 'all'; _connPageQuery = ''; _connPageSearchFocus = false; if (['mcp', 'servers', 'google', 'hosted-relay'].includes(_connFocus)) _connPageAdvanced = true; }
    const sourceOrder = { email: 0, calendar: 1, bank: 2 };
    const sources = SourcesStore.data && Array.isArray(SourcesStore.data.sources)
      ? SourcesStore.data.sources.slice().sort((a, b) => (sourceOrder[a.capability] ?? 3) - (sourceOrder[b.capability] ?? 3)) : [];
    const ready = !!SourcesStore.data;
    const page = _connEl('div', 'conn-page');
    page.addEventListener('focusin', event => {
      const account = event.target.closest('[data-account]');
      const card = account && account.closest('[data-source]');
      _connPageAccountFocus = card ? { source: card.dataset.source, account: account.dataset.account } : null;
    });
    page.addEventListener('focusout', event => { if (event.relatedTarget && !page.contains(event.relatedTarget)) _connPageAccountFocus = null; });
    page.appendChild(_connPageStatus(sources, all, ready));
    if (typeof accountsSection === 'function') page.appendChild(accountsSection());
    if (typeof finMoneyBlock === 'function') page.appendChild(finMoneyBlock());
    page.appendChild(_connPageSourceSection(sources, ready, all));
    page.appendChild(_connPageAssistantSection(all));
    _connPageAdvancedFold(page, all);
    container.appendChild(page);
    if (_connPageAccountFocus) {
      const target = _connPageAccountFocus;
      requestAnimationFrame(() => {
        const button = page.querySelector(`[data-source="${CSS.escape(target.source)}"] [data-account="${CSS.escape(target.account)}"]`);
        if (button && button.isConnected && !button.disabled) button.focus({ preventScroll: true });
      });
    }
    if (_connFocus) {
      const id = _connFocus;
      const money = id === 'bank' || id === 'money';
      const cap = money ? null : { gmail: 'email', email: 'email', calendar: 'calendar' }[id];
      if (!cap || ready || SourcesStore.error) _connFocus = null;
      const source = cap && sources.find(s => s.capability === cap && s.kind !== 'csv' && !s.demo);
      const el = money ? container.querySelector('[data-conn="money"]') : cap ? (source && container.querySelector(`[data-source="${CSS.escape(source.id)}"]`)) || container.querySelector(`.cp-suggestion[data-cap="${cap}"]`) : container.querySelector(`[data-conn="${CSS.escape(id)}"]`);
      if (el) { el.scrollIntoView({ block: money ? 'start' : 'center', behavior: (window.Motion && Motion.prefersReduced()) ? 'auto' : 'smooth' }); el.classList.add('is-focus'); setTimeout(() => el.classList.remove('is-focus'), 1800); }
    }
  },
  unmount() { _connPageSearchFocus = false; _connPageAccountFocus = null; if (typeof finMoneyUnmount === 'function') finMoneyUnmount(); /* keep the caches: no flash on return */ },
});

registerCommand({ id: 'open-connections', label: 'Connections', icon: 'plug', group: 'Go to', keywords: 'connect claude gmail calendar bank mcp sign in', run: () => setView('connections') });
registerCommand({ id: 'check-connections', label: 'Check all connections', icon: 'refresh-cw', keywords: 'connections status re-check', run: () => { setView('connections'); _connPageCheck(); } });
