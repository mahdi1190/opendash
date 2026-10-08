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
   Enable Banking key file in the data folder's secrets area, never in the
   page.
   ============================================================ */
const CONNECTORS_URL = 'https://claude.ai/customize/connectors';
const CONNECTION_INFO = [
  { id: 'claude', name: 'Claude', icon: 'sparkles', sub: 'Claude Code on this computer',
    unlocks: ['Assistant', 'Smart suggestions', 'Link tasks to people', 'Task chat'],
    text: 'Uses Claude Code on this computer with your own Claude account. OpenDash tools are included, with no relay hosting costs.' },
  { id: 'gmail', name: 'Gmail', icon: 'mail', sub: 'claude.ai connector · read-only',
    unlocks: ['Email triage', 'Tasks from email', 'Recent mail on people'],
    text: 'Finds tasks in recent email and shows mail from the people you work with. It can never send, change or delete mail.' },
  { id: 'calendar', name: 'Google Calendar', icon: 'calendar-days', sub: 'claude.ai connector · read-only',
    unlocks: ['Events next to tasks', 'Update calendar', 'Meeting prep'],
    text: 'Shows your events next to your tasks. It can never create, change or answer events.' },
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
function _connBtn(label, ic, cls, run) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + (cls || 'btn-secondary') + ' btn-sm';
  b.innerHTML = (ic ? icon(ic) : '') + `<span>${esc(label)}</span>`;
  b.onclick = (e) => { e.stopPropagation(); run(b); };
  return b;
}
function _connCopyBtn(text, label) {
  return _connBtn(label || 'Copy', 'copy', 'btn-ghost', async (b) => {
    try { await navigator.clipboard.writeText(text); b.innerHTML = icon('check') + '<span>Copied</span>'; setTimeout(() => { b.innerHTML = icon('copy') + `<span>${esc(label || 'Copy')}</span>`; }, 1600); }
    catch (e) { toast('Could not copy: select the text and copy it instead.', { kind: 'err' }); }
  });
}
function _connCode(text, label) {
  const w = _connEl('div', 'conn-code');
  const pre = _connEl('pre', null, text);
  w.append(pre, _connCopyBtn(text, label));
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
    if (r.ok && j.opened) toast('A Claude window opened. Finish there, then click Check again.', { kind: 'ok', timeout: 6000 });
    else if (r.ok) toast('No terminal app was found. Open one yourself and run: claude', { kind: 'err', timeout: 7000 });
    else toast(j.error || 'Could not open a terminal window.', { kind: 'err' });
  } catch (e) { toast('The OpenDash server is not running.', { kind: 'err' }); }
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
      const alt = _connEl('p', 'conn-note');
      alt.textContent = 'Using npm instead? npm install -g @anthropic-ai/claude-code. If Claude is installed somewhere unusual, put CLAUDE_CLI_PATH=<path to claude> in a .env file in your data folder.';
      box.appendChild(alt);
    } else if (st === 'auth' || st === 'error' || st === 'unknown') {
      box.appendChild(_connEl('div', 'conn-help-t', st === 'auth' ? 'Sign in to Claude' : 'Connect Claude'));
      const open = _connBtn('Open sign-in window', 'log-in', 'btn-primary', (b) => _connOpenTerminal(b));
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
    box.appendChild(_connBtn('Go to Claude', 'arrow-up', 'btn-secondary', () => connOpen('claude')));
    return box;
  }
  box.appendChild(_connEl('div', 'conn-help-t', st === 'auth' ? `Reconnect ${c.name}` : `Connect ${c.name}`));
  const open = _connBtn('Sign in & verify', 'external-link', 'btn-primary', () => {
    if (typeof connCloudSignIn === 'function') connCloudSignIn(null, c.id);
    else window.open(CONNECTORS_URL, '_blank', 'noopener');
  });
  box.appendChild(_connSteps([
    open,
    st === 'auth' ? `Find ${c.name} and choose Reconnect (or Disconnect, then Connect).` : `Find ${c.name} and choose Connect, then sign in and allow access.`,
    'Return here after sign-in. OpenDash checks the connection automatically.',
  ]));
  const fb = _connEl('div', 'conn-fallback');
  fb.appendChild(_connEl('span', null, 'Still not working? Run claude in a terminal and type /mcp, then pick the connector to sign in again.'));
  fb.appendChild(_connBtn('Open terminal', 'terminal', 'btn-secondary', (b) => _connOpenTerminal(b)));
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
  const chk = _connBtn(e.checking ? 'Checking…' : 'Check again', e.checking ? null : 'refresh-cw', 'btn-secondary', () => connCheck(c.id));
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
    toast(j.already ? 'The OpenDash MCP was already set up in Claude Code.' : 'OpenDash MCP added to Claude Code. Restart open Claude sessions to use it.', { kind: 'ok' });
  } catch (e) {
    toast((e && e.message) || 'Could not add the OpenDash MCP.', { kind: 'err' });
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
    _connMcpTest = await r.json().catch(() => ({ ok: false, error: 'No answer from the server.' }));
  } catch (e) { _connMcpTest = { ok: false, error: 'The OpenDash server is not running.' }; }
  _connMcpTesting = false;
  _connRecheckMcp();
  await connRefresh({ force: true });
  if (_connMcpTest.ok) toast(`The OpenDash MCP answered with ${_connMcpTest.tools} tools.`, { kind: 'ok' });
  if (state.view === 'connections') renderMain();
}
function _connMcpCard(all) {
  const e = all.mcp || { state: 'unknown' };
  // The newest read of the real config wins (the connections list re-reads it on every refresh).
  const inst = (_connMcp && _connMcp.installed && _connMcp.installed.summary) || e.installed || {};
  const card = _connEl('section', 'card conn-card');
  card.dataset.conn = 'mcp';
  const head = _connEl('div', 'conn-head');
  const ic = _connEl('span', 'conn-ic'); ic.innerHTML = _connMark('mcp', 'plug-zap');
  const t = _connEl('div', 'conn-titles');
  t.append(_connEl('div', 'conn-name', 'OpenDash MCP'), _connEl('div', 'conn-sub', 'Use OpenDash from Claude Code, T3 Code or Claude Desktop'));
  const anyInstalled = inst.claudeCode === 'installed' || inst.desktop === 'installed';
  const pill = _connEl('span', 'status ' + (anyInstalled ? 'ok' : 'off'), anyInstalled ? 'Installed' : 'Not installed');
  head.append(ic, t, pill);
  card.appendChild(head);
  card.appendChild(_connEl('p', 'conn-text', 'Gives your own Claude the OpenDash tools: read your tasks, add and change them, reschedule, undo. Every change shows up here at once, with an Undo button.'));
  const rows = _connEl('dl', 'kv conn-kv');
  const where = (v) => v === 'installed' ? 'Installed' : v === 'other-copy' ? 'Installed, but for another copy of the app' : 'Not installed';
  rows.innerHTML = `<dt>Claude Code / T3 Code</dt><dd>${esc(where(inst.claudeCode))}</dd><dt>Claude Desktop</dt><dd>${esc(where(inst.desktop))}</dd>`
    + `<dt>Last test</dt><dd>${esc(e.checkedAt ? (e.state === 'ok' ? `Answered (${e.tools || '?'} tools) · ${_connAgo(e.checkedAt)}` : `Failed · ${_connAgo(e.checkedAt)}`) : 'Not tested yet')}</dd>`;
  card.appendChild(rows);
  if (_connMcpTest && !_connMcpTest.ok && _connMcpTest.error) {
    const m = _connEl('div', 'callout danger conn-msg'); m.innerHTML = icon('circle-alert'); m.appendChild(_connEl('span', null, _connMcpTest.error)); card.appendChild(m);
  }
  const foot = _connEl('div', 'conn-foot');
  foot.appendChild(_connEl('span', 'conn-when', 'Runs on this computer; nothing is sent anywhere else.'));
  if (inst.claudeCode !== 'installed') {
    const ib = _connBtn(_connMcpInstalling ? 'Adding…' : 'Add to Claude Code', _connMcpInstalling ? null : 'plus', 'btn-primary', () => _connInstallMcp());
    if (_connMcpInstalling) { ib.disabled = true; ib.insertAdjacentHTML('afterbegin', '<span class="spinner"></span>'); }
    ib.dataset.act = 'mcp-install';
    foot.appendChild(ib);
  }
  foot.appendChild(_connBtn('Set up', 'settings', inst.claudeCode !== 'installed' ? 'btn-secondary' : 'btn-primary', () => _connMcpDrawer()));
  const tb = _connBtn(_connMcpTesting ? 'Testing…' : 'Test MCP', _connMcpTesting ? null : 'zap', 'btn-secondary', () => _connRunMcpTest());
  if (_connMcpTesting) { tb.disabled = true; tb.insertAdjacentHTML('afterbegin', '<span class="spinner"></span>'); }
  foot.appendChild(tb);
  card.appendChild(foot);
  return card;
}
function _connMcpDrawer() {
  const info = _connMcp && _connMcp.install;
  // While the drawer is open, notice a command pasted into a terminal (the real config is re-read).
  clearInterval(_connMcpPoll);
  const poll = _connMcpPoll = setInterval(() => _connLoadMcp(), 4000);
  openDrawer({
    title: 'Set up the OpenDash MCP', width: 560,
    onClose: () => { clearInterval(poll); if (_connMcpPoll === poll) _connMcpPoll = null; },
    body: (el, closeD) => {
      if (!info) { el.appendChild(_connEl('p', 'muted', 'Loading the commands for this computer…')); _connLoadMcp().then(() => { if (_connMcp) { closePopovers(); _connMcpDrawer(); } }); return; }
      const sec = (title, sub) => { const h = _connEl('div', 'conn-dsec'); h.appendChild(_connEl('h3', null, title)); if (sub) h.appendChild(_connEl('p', 'conn-note', sub)); el.appendChild(h); return h; };
      const a = sec('Claude Code and T3 Code', info.claudeCode.note);
      const ccInst = _connMcp && _connMcp.installed && _connMcp.installed.summary && _connMcp.installed.summary.claudeCode;
      if (ccInst !== 'installed') {
        const row = _connEl('div', 'conn-dact');
        row.appendChild(_connBtn('Add it for me', 'plus', 'btn-primary', async (b) => { b.disabled = true; if (await _connInstallMcp()) closeD(); else b.disabled = false; }));
        row.appendChild(_connEl('span', 'conn-note', 'Runs the command below for you. Or paste it into a terminal yourself:'));
        a.appendChild(row);
      } else a.appendChild(_connEl('p', 'conn-note', 'Already set up for Claude Code and T3 Code.'));
      if (info.claudeCode.powershell) {
        a.appendChild(_connEl('div', 'conn-label', 'PowerShell'));
        a.appendChild(_connCode(info.claudeCode.powershell));
        a.appendChild(_connEl('div', 'conn-label', 'Command Prompt (cmd)'));
        a.appendChild(_connCode(info.claudeCode.cmd));
      } else a.appendChild(_connCode(info.claudeCode.shell));
      a.appendChild(_connEl('div', 'conn-label', 'Check it is there'));
      a.appendChild(_connCode(info.claudeCode.check));
      const b = sec('Claude Desktop', `Add this to ${info.claudeDesktop.file}. ${info.claudeDesktop.note}`);
      b.appendChild(_connCode(JSON.stringify(info.claudeDesktop.json, null, 2), 'Copy JSON'));
      const c = sec('Permissions (optional)', info.permissions.note);
      c.appendChild(_connEl('div', 'conn-label', 'Read freely, ask before changes (recommended)'));
      c.appendChild(_connCode(JSON.stringify({ permissions: info.permissions.readOnly }, null, 2), 'Copy JSON'));
      c.appendChild(_connEl('div', 'conn-label', 'Never ask'));
      c.appendChild(_connCode(JSON.stringify({ permissions: info.permissions.allowAll }, null, 2), 'Copy JSON'));
      const d = sec('Then try it', 'Restart Claude, then ask for example: "What is due this week on my dashboard?" Changes made through the MCP appear here straight away, with Undo.');
      d.appendChild(_connBtn('Test MCP now', 'zap', 'btn-secondary', () => _connRunMcpTest()));
    },
  });
}

/* ---------- the page ---------- */
let _connPageFilter = 'all', _connPageQuery = '', _connPageAdvanced = false, _connPageChecking = false;
let _connPageSearchFocus = false, _connPageSearchCaret = 0;
let _connPageAccountFocus = null;

function _connPageLiveSource(s) { return s.kind !== 'csv' && !s.demo && s.enabled !== false; }
function _connPageNeedsAttention(s) { return _connPageLiveSource(s) && ['auth', 'error', 'setup', 'unknown', 'limited'].includes(_connPageSourceState(s)); }
function _connPageMatchesSource(s, filter, query) {
  const st = _connPageSourceState(s);
  if (filter === 'connected' && !(_connPageLiveSource(s) && st === 'ok')) return false;
  if (filter === 'attention' && !_connPageNeedsAttention(s)) return false;
  if (filter === 'paused' && st !== 'off') return false;
  const text = [s.label, s.server, s.capability, s.kind, ...(s.accounts || []).map(a => a.name || a.id)].join(' ').toLowerCase();
  return !query.trim() || text.includes(query.trim().toLowerCase());
}
function _connPageCounts(sources, all) {
  const assistants = all.assistants ? ASSISTANT_OPTIONS.filter(p => p.id !== 'grok').map(p => _connPageAssistantDetails(p.id, all)) : null;
  return {
    connected: sources.filter(s => _connPageLiveSource(s) && _connPageSourceState(s) === 'ok').length + (assistants ? assistants.filter(a => a.working).length : all.claude && all.claude.state === 'ok' ? 1 : 0),
    attention: sources.filter(_connPageNeedsAttention).length + (assistants ? assistants.filter(a => a.attention).length : all.claude && ['auth', 'error', 'setup', 'limited'].includes(all.claude.state) ? 1 : 0),
  };
}
async function _connPageCheck() {
  if (_connPageChecking) return;
  _connPageChecking = true;
  if (state.view === 'connections') renderMain();
  try { await connCheck('claude'); await SourcesStore.refresh({ refresh: true }); }
  finally { _connPageChecking = false; if (state.view === 'connections') renderMain(); }
}
function _connPagePrivacy() {
  openDrawer({ title: 'Your connections, your control', width: 500, body: el => {
    el.appendChild(_connEl('p', 'conn-text', 'Account sources use read-only tools. They bring information into OpenDash without sending email, changing account records or deleting data.'));
    el.appendChild(_connSteps([
      'Sign in with the provider or in Claude’s own window. OpenDash never asks for your password.',
      'Choose which calendars, mailboxes and accounts to include. Pause or remove a source from its menu at any time.',
      'Imported data lives in your local data folder. Claude-backed requests are processed through your own Claude account.',
      'The optional OpenDash MCP can read and update dashboard tasks. Its permissions and setup are in “For your AI tools”.',
    ]));
  } });
}
function _connPageHero() {
  const hero = _connEl('section', 'cp-hero');
  const body = _connEl('div', 'cp-hero-body');
  body.append(_connEl('span', 'cp-kicker', 'A LITTLE MORE CONNECTED'), _connEl('h2', null, 'Less switching. More getting on with your day.'), _connEl('p', null, 'Bring your email, calendar and money into one calm place. You choose what connects.'));
  const tags = _connEl('div', 'cp-hero-tags');
  for (const [ic, label] of [['shield-check', 'Read-only accounts'], ['hard-drive', 'Local data'], ['sliders-horizontal', 'You’re in control']]) {
    const tag = _connEl('span', 'cp-hero-tag'); tag.innerHTML = icon(ic, 'i-xs'); tag.appendChild(_connEl('span', null, label)); tags.appendChild(tag);
  }
  body.appendChild(tags);
  const art = _connEl('div', 'cp-hero-art'); art.setAttribute('aria-hidden', 'true');
  for (const cls of ['one', 'two', 'three']) art.appendChild(_connEl('span', 'cp-orbit ' + cls));
  const core = _connEl('span', 'cp-orbit-core'); core.innerHTML = _connMark('mcp'); art.appendChild(core);
  for (const [cls, service, fallback] of [['mail', 'gmail', 'mail'], ['calendar', 'calendar', 'calendar-days'], ['bank', null, 'landmark'], ['ai', 'claude', 'sparkles']]) {
    const node = _connEl('span', 'cp-orbit-node ' + cls); node.innerHTML = _connMark(service, fallback); art.appendChild(node);
  }
  hero.append(body, art); return hero;
}
function _connPageOverview(sources, all, ready) {
  const counts = _connPageCounts(sources, all);
  const overview = _connEl('div', 'cp-overview');
  const items = [
    ['green', 'check', ready ? String(counts.connected) : '—', 'Connected', 'Sources + local assistants'],
    ['amber', 'circle-alert', ready ? String(counts.attention) : '—', 'Need attention', counts.attention ? 'A little help to get going' : 'Everything looks clear'],
    ['purple', 'shield-check', 'Your data', 'Your control', 'Choose what to share'],
  ];
  for (const [colour, ic, value, label, note] of items) {
    const item = _connEl('div', 'cp-overview-item');
    const mark = _connEl('span', 'cp-overview-icon ' + colour); mark.innerHTML = icon(ic);
    const copy = _connEl('div');
    const line = _connEl('div'); line.append(_connEl('strong', 'cp-overview-value', value), _connEl('span', 'cp-overview-label', label));
    copy.append(line, _connEl('span', 'cp-overview-note', note)); item.append(mark, copy); overview.appendChild(item);
  }
  return overview;
}
function _connPageSourceSection(sources, ready) {
  const section = _connEl('section', 'cp-connections');
  const head = _connEl('div', 'cp-section-head');
  const title = _connEl('div'); title.append(_connEl('h2', null, 'Your connections'), _connEl('p', null, 'The things that bring your day together.'));
  const note = _connEl('span', 'cp-readonly'); note.innerHTML = icon('lock', 'i-xs'); note.appendChild(_connEl('span', null, 'Account sources are read-only'));
  head.append(title, note); section.appendChild(head);
  const toolbar = _connEl('div', 'cp-toolbar'), filters = _connEl('div', 'cp-filters');
  filters.setAttribute('role', 'group'); filters.setAttribute('aria-label', 'Filter connections');
  const grid = _connEl('div', 'cp-source-grid');
  const results = _connEl('span', 'cp-results'); results.setAttribute('role', 'status'); results.setAttribute('aria-live', 'polite');
  const paint = () => {
    grid.replaceChildren();
    // Banks and wallets live in the Money block below (56-fin-connect.js).
    const visible = sources.filter(s => s.capability !== 'bank' && _connPageMatchesSource(s, _connPageFilter, _connPageQuery));
    for (const s of visible) grid.appendChild(_connPageSourceCard(s));
    // CSVs and demo sources never stand in for a connected account.
    const missing = ['calendar', 'email'].filter(cap => !sources.some(s => s.capability === cap && s.kind !== 'csv' && !s.demo));
    if (ready && _connPageFilter === 'all') for (const cap of missing) {
      const suggestion = _connPageSuggestion(cap);
      if (!_connPageQuery.trim() || suggestion.textContent.toLowerCase().includes(_connPageQuery.trim().toLowerCase())) grid.appendChild(suggestion);
    }
    if (!ready) grid.appendChild(_connEl('p', 'cp-loading', SourcesStore.error ? 'Your connections are unavailable. Try refreshing when the server is ready.' : 'Loading your connections…'));
    else if (!grid.childElementCount) {
      const empty = _connEl('div', 'cp-empty');
      empty.append(_connEl('h3', null, 'No connections match.'), _connEl('p', null, 'Try another search or show all your connections.'));
      empty.appendChild(_connBtn('Clear filters', 'x', 'btn-secondary', () => { _connPageFilter = 'all'; _connPageQuery = ''; input.value = ''; paint(); }));
      grid.appendChild(empty);
    }
    results.textContent = ready ? `${visible.length} source${visible.length === 1 ? '' : 's'} shown` : 'Loading connections';
    for (const button of filters.children) { const active = button.dataset.filter === _connPageFilter; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); }
  };
  const listed = sources.filter(s => s.capability !== 'bank');
  for (const [id, label, count] of [
    ['all', 'All', listed.length], ['connected', 'Connected', listed.filter(s => _connPageLiveSource(s) && _connPageSourceState(s) === 'ok').length],
    ['attention', 'Needs attention', listed.filter(_connPageNeedsAttention).length], ['paused', 'Paused', listed.filter(s => _connPageSourceState(s) === 'off').length],
  ]) {
    const button = _connEl('button', 'cp-filter'); button.type = 'button'; button.dataset.filter = id;
    button.append(_connEl('span', null, label), _connEl('span', 'cp-count', ready ? String(count) : '—'));
    button.onclick = () => { if (_connPageFilter === id) return; _connPageFilter = id; paint(); };
    filters.appendChild(button);
  }
  const search = _connEl('label', 'cp-search'); search.innerHTML = icon('search');
  const input = _connEl('input'); input.type = 'search'; input.placeholder = 'Find a connection…'; input.value = _connPageQuery;
  input.setAttribute('aria-label', 'Find a connection');
  input.onfocus = () => { _connPageSearchFocus = true; };
  input.onblur = () => { _connPageSearchFocus = false; };
  input.onselect = () => { _connPageSearchCaret = input.selectionStart ?? input.value.length; };
  input.oninput = () => { _connPageQuery = input.value; _connPageSearchCaret = input.selectionStart ?? input.value.length; paint(); };
  search.appendChild(input); toolbar.append(filters, search); section.append(toolbar, results, grid);
  if (SourcesStore.error) {
    const error = _connEl('div', 'cp-fetch-error'); error.setAttribute('role', 'alert');
    error.append(_connEl('span', null, 'Could not refresh connections. ' + SourcesStore.error), _connBtn('Try again', 'refresh-cw', 'btn-secondary', () => SourcesStore.refresh({ cached: true })));
    section.insertBefore(error, toolbar);
  }
  paint();
  if (_connPageSearchFocus) requestAnimationFrame(() => { if (input.isConnected) { input.focus({ preventScroll: true }); input.setSelectionRange(_connPageSearchCaret, _connPageSearchCaret); } });
  return section;
}

function _connPageAssistantSection(all) {
  const section = _connEl('section', 'cp-assistants');
  const head = _connEl('div', 'cp-section-head');
  const title = _connEl('div'); title.append(_connEl('h2', null, 'Your AI assistants'), _connEl('p', null, 'Connect an assistant and its OpenDash tools together.'));
  const note = _connEl('span', 'cp-readonly'); note.innerHTML = _connMark('claude'); note.appendChild(_connEl('span', null, 'Dashboard AI uses Claude'));
  head.append(title, note); section.append(head, _connPageAssistantCards(all));
  return section;
}

registerSection('connections', {
  group: 'system',
  title: () => 'Connections',
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
    if (_connFocus) { _connPageFilter = 'all'; _connPageQuery = ''; _connPageSearchFocus = false; if (['mcp', 'servers', 'google'].includes(_connFocus)) _connPageAdvanced = true; }
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
    const heading = _connEl('div', 'cp-heading');
    const copy = _connEl('div'); copy.append(_connEl('span', 'cp-eyebrow', 'MAKE SPACE FOR YOUR DAY'), _connEl('p', 'cp-subtitle', 'Your accounts, working together.'));
    const actions = _connEl('div', 'cp-heading-actions');
    const check = _connBtn(_connPageChecking ? 'Checking…' : 'Check status', 'refresh-cw', 'btn-secondary', _connPageCheck); check.disabled = _connPageChecking;
    actions.append(check, _connBtn('Add connection', 'plus', 'btn-primary', () => srcAddFlow({})));
    heading.append(copy, actions);
    page.append(heading, _connPageHero(), _connPageOverview(sources, all, ready), _connPageSourceSection(sources, ready));
    if (typeof finMoneyBlock === 'function') page.appendChild(finMoneyBlock());
    page.appendChild(_connPageAssistantSection(all));
    if (typeof microsoftConnectionCard === 'function') page.appendChild(microsoftConnectionCard(all));
    const privacy = _connEl('section', 'cp-privacy-panel cp-privacy-wide');
    privacy.innerHTML = icon('shield-check');
    privacy.append(_connEl('h3', null, 'Connected doesn’t mean giving up control.'), _connEl('p', null, 'Account sources stay read-only. Choose what to include, and pause or disconnect whenever you like.'), _connBtn('How your data is handled', 'arrow-right', 'btn-ghost', _connPagePrivacy));
    page.appendChild(privacy);
    const advanced = _connEl('details', 'cp-advanced'); advanced.open = _connPageAdvanced;
    advanced.ontoggle = () => { _connPageAdvanced = advanced.open; };
    const summary = _connEl('summary'); summary.innerHTML = icon('terminal');
    const advancedTitle = _connEl('span', 'cp-advanced-title', 'For your AI tools'); advancedTitle.appendChild(_connEl('span', 'cp-advanced-subtitle', 'OpenDash MCP & connected servers'));
    const chevron = _connEl('span', 'cp-advanced-chevron'); chevron.innerHTML = icon('chevron-down');
    summary.append(advancedTitle, _connEl('span', 'cp-advanced-label', 'Advanced'), chevron); advanced.appendChild(summary);
    const advancedBody = _connEl('div', 'cp-advanced-body');
    advancedBody.append(_connEl('p', 'cp-subtitle', 'Use OpenDash from your own AI tools. The OpenDash MCP can update dashboard tasks; account sources stay read-only.'), _connMcpCard(all), srcServersCard());
    if (_connPageAdvanced && typeof hostedRelayCard === 'function') advancedBody.appendChild(hostedRelayCard());
    if (_connPageAdvanced && typeof remoteMcpCard === 'function') advancedBody.appendChild(remoteMcpCard());
    const g = all.google;
    if (g && g.status && g.status !== 'not-set-up') {
      const adv = _connEl('div', 'conn-adv');
      adv.appendChild(_connEl('span', 'conn-adv-t', 'Google (direct sign-in, optional)'));
      adv.appendChild(_connStatusPill(g));
      if (g.status === 'configured') adv.appendChild(_connBtn('Sign in', 'log-in', 'btn-secondary', () => window.open('/api/google/connect', '_blank')));
      adv.dataset.conn = 'google'; advancedBody.appendChild(adv);
    }
    advanced.appendChild(advancedBody); page.appendChild(advanced);
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
