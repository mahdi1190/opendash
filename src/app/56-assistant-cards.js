/* One assistant integration, including its OpenDash tools, reused in welcome
   and Connections. Browser availability is distinct from local tool access. */
const ASSISTANT_OPTIONS = Object.freeze([
  { id: 'claude', name: 'Claude', mark: 'claude', browser: 'https://claude.ai', docs: 'https://code.claude.com/docs/en/setup',
    text: 'Link Claude finds or installs Claude Code, signs you in, and adds OpenDash tools to enable dashboard AI. Desktop and Cloudflare are not required. Open connected Claude optionally starts a browser session through Remote Control.' },
  { id: 'codex', name: 'ChatGPT / Codex', mark: 'chatgpt', browser: 'https://chatgpt.com', docs: 'https://learn.chatgpt.com/docs/extend/mcp?surface=cli',
    text: 'Connect local Codex to work with your tasks using OpenDash tools. The assistant inside this dashboard currently uses Claude.' },
  { id: 'grok', name: 'Grok', mark: 'grok', browser: 'https://grok.com', docs: 'https://docs.x.ai/grok/connectors/custom-mcp-tunneling',
    text: 'Open Grok in your browser. This local dashboard is not yet available as a browser connector.' },
  { id: 'gemini', name: 'Gemini', mark: 'gemini', browser: 'https://gemini.google.com', docs: 'https://geminicli.com/docs/tools/mcp-server/',
    text: 'Connect local Gemini CLI to your OpenDash tools. The Gemini website is separate; the assistant inside this dashboard currently uses Claude.' },
]);
let _assistantBusy = null;
let _localClaudeUi = null;
function localClaudeProgress(all) {
  const flow = _localClaudeUi || all.localClaude;
  return flow && (flow.busy || flow.phase === 'error' || flow.phase === 'browser-error' || flow.phase === 'browser-opened') ? flow : null;
}
function localClaudePhaseLabel(flow) { return ({ checking: 'Looking for Claude', installing: 'Installing Claude', 'awaiting-login': 'Finish browser sign-in', 'adding-tools': 'Adding OpenDash tools', verifying: 'Verifying connection', 'awaiting-approval': 'Approve the local terminal prompts', 'opening-browser': 'Opening Claude browser', 'browser-opened': 'Dashboard connected · finish browser setup', 'browser-error': 'Local tools connected · browser needs attention', error: 'Setup needs attention' })[flow.phase] || 'Connecting Claude'; }
function localClaudeBrowserUrl(flow) {
  if (!flow || typeof flow.browserUrl !== 'string') return null;
  try {
    const url = new URL(flow.browserUrl);
    if (url.origin !== 'https://claude.ai' || url.username || url.password) return null;
    if (flow.phase === 'browser-opened' && url.href === 'https://claude.ai/code') return url.href;
    return flow.browserReady && /^\/code(?:\/|$)/.test(url.pathname) ? url.href : null;
  } catch { return null; }
}
function localClaudePopup() {
  try { const popup = window.open('about:blank', '_blank'); if (popup) popup.opener = null; return popup; } catch { return null; }
}
function assistantBrowserButton(provider, all, repaint) {
  if (provider.id !== 'claude') return _connBtn(`Open ${provider.id === 'codex' ? 'ChatGPT' : provider.name}`, 'external-link', 'btn-secondary', () => window.open(provider.browser, '_blank', 'noopener'));
  const url = localClaudeBrowserUrl(_localClaudeUi || all.localClaude);
  const button = _connBtn('Open connected Claude', 'external-link', 'btn-secondary', () => url ? window.open(url, '_blank', 'noopener') : assistantConnect('claude', repaint, 'browser'));
  button.disabled = !!_assistantBusy; return button;
}

function assistantConnectionState(id, all) {
  const facts = all.assistants || {};
  if (id === 'claude') {
    const flow = localClaudeProgress(all); if (flow) return localClaudePhaseLabel(flow);
    const installed = (all.mcp && all.mcp.installed || {}).claudeCode === 'installed';
    return all.claude && all.claude.state === 'ok' && installed ? 'Connected' : installed ? 'Tools added · sign in' : 'Ready to set up';
  }
  if (id === 'codex') return !facts.codex ? 'Checking installation…' : facts.codex.configured ? 'Tools configured' : facts.codex.installed ? 'Ready to connect' : 'Install Codex first';
  if (id === 'gemini') return !facts.gemini ? 'Checking installation…' : facts.gemini.configured ? 'Tools configured' : facts.gemini.installed ? 'Ready to connect' : 'Install Gemini CLI first';
  return 'Browser connector unavailable';
}

async function assistantConnect(id, repaint, action = 'link') {
  if (_assistantBusy) return;
  const popup = id === 'claude' && action === 'browser' ? localClaudePopup() : null;
  let handedOff = false;
  _assistantBusy = id; repaint();
  try {
    if (id === 'claude') {
      const request = async (path, post) => { const r = await fetch(path, post ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' } : { cache: 'no-store' }); const out = await r.json(); if (!r.ok) throw new Error(out.error || 'Claude setup could not be checked.'); return out; };
      _localClaudeUi = await request('/api/connections/local-claude/' + (action === 'browser' ? 'browser' : 'link'), true); repaint();
      const until = Date.now() + 390000;
      while (_localClaudeUi.busy && Date.now() < until) { await new Promise(resolve => setTimeout(resolve, 1200)); _localClaudeUi = await request('/api/connections/local-claude'); repaint(); }
      if (_localClaudeUi.busy) throw new Error('Claude setup is still running. Return to Connections to check it.');
      if (!_localClaudeUi.connected) throw new Error(_localClaudeUi.message || 'Claude setup could not finish.');
      if (action === 'browser') {
        const url = localClaudeBrowserUrl(_localClaudeUi);
        if (!url) throw new Error(_localClaudeUi.message || 'Dashboard AI is connected. The browser session could not open; press Open connected Claude to retry.');
        if (popup && !popup.closed) { try { popup.location.replace(url); handedOff = true; } catch {} }
        const message = _localClaudeUi.browserReady ? (handedOff ? 'Connected Claude is open in your browser.' : 'Press Open connected Claude to open the browser session.') : (_localClaudeUi.message || 'Finish terminal confirmations, then select OpenDash in Claude Code in your browser.');
        toast(handedOff ? message : message + ' Press Open connected Claude if the browser did not open.', { kind: 'ok', timeout: 10000 });
      } else toast('Claude and its local OpenDash tools are connected. Dashboard AI is ready.', { kind: 'ok' });
      await connRefresh({ force: true });
    } else {
      const r = await fetch('/api/connections/assistant-connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Could not connect this assistant.');
      toast(j.message, { kind: 'ok', timeout: 7000 });
      await connRefresh({ force: true });
    }
  } catch (e) { toast(e.message || 'Could not connect this assistant.', { kind: 'err' }); }
  finally { if (popup && !handedOff) { try { popup.close(); } catch {} } _assistantBusy = null; repaint(); }
}

function assistantConnectionGuide(id) {
  const provider = ASSISTANT_OPTIONS.find(p => p.id === id);
  openDrawer({ title: `Connect ${provider.name}`, width: 560, body: (el) => {
    if (id === 'claude') {
      const help = _connHelp(CONNECTION_INFO[0], { state: 'setup', status: 'not-installed' }, { cli: { installed: false } });
      if (help) el.appendChild(help);
      el.appendChild(_connEl('p', 'conn-note', 'Link Claude first looks for an existing installation and sign-in. It installs the official native app only when missing and adds OpenDash tools as part of the same flow. Claude Code needs a supported subscription or provider account.'));
    } else if (id === 'codex') {
      el.appendChild(_connEl('p', 'conn-text', 'Install and sign in to Codex using the official setup guide, then return and press Connect Codex. ChatGPT in a browser does not read local Codex connections.'));
    } else if (id === 'gemini') {
      el.appendChild(_connEl('p', 'conn-text', 'Install and sign in to Gemini CLI, then return and press Connect Gemini CLI. OpenDash registers its tools in your user settings without bypassing Gemini tool confirmations or folder permissions. The Gemini website does not use this local connection.'));
    }
    el.appendChild(_connEl('p', 'conn-text', id === 'claude' ? 'Link Claude enables dashboard AI. Open connected Claude optionally starts an official Remote Control browser session; approve its terminal prompts and keep this computer running. Ordinary Claude chats use a separate connection.' : 'Opening the ordinary website does not connect your local dashboard tools.'));
    el.appendChild(_connBtn('Official connection guide', 'external-link', 'btn-secondary', () => window.open(provider.docs, '_blank', 'noopener')));
    el.appendChild(assistantBrowserButton(provider, Connections.all() || {}, () => renderMain()));
  } });
}

function assistantConnectionCards(all, repaint = () => renderMain(), compact = false) {
  const grid = _connEl('div', 'conn-grid assistant-grid' + (compact ? ' assistant-grid-compact' : ''));
  for (const provider of ASSISTANT_OPTIONS) {
    const card = _connEl('section', 'card conn-card assistant-card'); card.dataset.conn = provider.id;
    const head = _connEl('div', 'conn-head');
    const mark = _connEl('span', 'conn-ic assistant-mark');
    const img = document.createElement('img'); img.src = ASSISTANT_MARKS[provider.mark]; img.alt = ''; img.width = 28; img.height = 28; mark.appendChild(img);
    const titles = _connEl('div', 'conn-titles'); titles.append(_connEl('div', 'conn-name', provider.name), _connEl('div', 'conn-sub', provider.id === 'grok' ? 'Browser access' : 'OpenDash tools included'));
    const short = { claude: 'Enable dashboard AI with local Claude. Browser sessions are optional; no Desktop or Cloudflare.', codex: 'Local Codex tools; the dashboard assistant still uses Claude.', grok: 'Browser access only; your local OpenDash tools are not connected.', gemini: 'Local Gemini CLI tools; the dashboard assistant still uses Claude.' };
    head.append(mark, titles); card.append(head, _connEl('p', 'conn-text', compact ? short[provider.id] : provider.text));
    const status = assistantConnectionState(provider.id, all);
    card.appendChild(_connEl('span', 'assistant-state', status));
    if (!compact && provider.id === 'claude' && all.assistants) card.appendChild(_connEl('p', 'conn-note', all.assistants.claudeDesktop.detected ? 'Claude Desktop or its settings detected; it is optional.' : 'Claude Desktop is not required.'));
    const actions = _connEl('div', 'assistant-actions');
    const local = provider.id !== 'grok';
    const installed = provider.id === 'claude' ? all.cli && all.cli.installed : all.assistants && all.assistants[provider.id] && all.assistants[provider.id].installed;
    const localName = provider.id === 'codex' ? 'Codex' : provider.id === 'gemini' ? 'Gemini CLI' : 'Claude';
    if (local) {
      const flow = provider.id === 'claude' && localClaudeProgress(all);
      const b = _connBtn(flow && flow.busy ? localClaudePhaseLabel(flow) + '…' : _assistantBusy === provider.id ? 'Connecting…' : provider.id === 'claude' ? 'Link Claude' : installed ? `Connect ${localName}` : `Set up ${localName}`, 'plug', 'btn-primary', () => provider.id === 'claude' || installed ? assistantConnect(provider.id, repaint) : assistantConnectionGuide(provider.id));
      b.disabled = !!_assistantBusy; actions.appendChild(b);
    }
    actions.appendChild(assistantBrowserButton(provider, all, repaint));
    actions.appendChild(_connBtn('Options', 'settings', 'btn-ghost', () => provider.id === 'claude' ? _connMcpDrawer() : assistantConnectionGuide(provider.id)));
    if (provider.id === 'claude') { const flow = localClaudeProgress(all); if (flow && flow.message) card.appendChild(_connEl('p', 'conn-note', flow.message)); }
    card.appendChild(actions);
    grid.appendChild(card);
  }
  return grid;
}
