/* One assistant integration, including its OpenDash tools, reused in welcome
   and Connections. Browser availability is distinct from local tool access. */
const ASSISTANT_OPTIONS = Object.freeze([
  { id: 'claude', name: 'Claude', mark: 'claude', browser: 'https://claude.ai', docs: 'https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp',
    text: 'Claude Code connects the dashboard assistant, smart features and OpenDash tools together. Claude Desktop is optional.' },
  { id: 'codex', name: 'ChatGPT / Codex', mark: 'chatgpt', browser: 'https://chatgpt.com', docs: 'https://learn.chatgpt.com/docs/extend/mcp?surface=cli',
    text: 'Connect local Codex to work with your tasks using OpenDash tools. The assistant inside this dashboard currently uses Claude.' },
  { id: 'grok', name: 'Grok', mark: 'grok', browser: 'https://grok.com', docs: 'https://docs.x.ai/grok/connectors/custom-mcp-tunneling',
    text: 'Open Grok in your browser. This local dashboard is not yet available as a browser connector.' },
  { id: 'gemini', name: 'Gemini', mark: 'gemini', browser: 'https://gemini.google.com', docs: 'https://geminicli.com/docs/tools/mcp-server/',
    text: 'Connect local Gemini CLI to your OpenDash tools. The Gemini website is separate; the assistant inside this dashboard currently uses Claude.' },
]);
let _assistantBusy = null;

function assistantConnectionState(id, all) {
  const facts = all.assistants || {};
  if (id === 'claude') {
    const installed = (all.mcp && all.mcp.installed || {}).claudeCode === 'installed';
    return all.claude && all.claude.state === 'ok' && installed ? 'Connected' : installed ? 'Tools added · sign in' : 'Ready to set up';
  }
  if (id === 'codex') return !facts.codex ? 'Checking installation…' : facts.codex.configured ? 'Tools configured' : facts.codex.installed ? 'Ready to connect' : 'Install Codex first';
  if (id === 'gemini') return !facts.gemini ? 'Checking installation…' : facts.gemini.configured ? 'Tools configured' : facts.gemini.installed ? 'Ready to connect' : 'Install Gemini CLI first';
  return 'Browser connector unavailable';
}

async function assistantConnect(id, repaint) {
  if (_assistantBusy) return;
  _assistantBusy = id; repaint();
  try {
    if (id === 'claude') {
      const all = Connections.all() || {};
      if (all.cli && !all.cli.installed) { assistantConnectionGuide('claude'); return; }
      if (!await _connInstallMcp()) return;
      await connCheck('claude');
      if (!Connections.has('claude')) await _connOpenTerminal();
    } else {
      const r = await fetch('/api/connections/assistant-connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Could not connect this assistant.');
      toast(j.message, { kind: 'ok', timeout: 7000 });
      await connRefresh({ force: true });
    }
  } catch (e) { toast(e.message || 'Could not connect this assistant.', { kind: 'err' }); }
  finally { _assistantBusy = null; repaint(); }
}

function assistantConnectionGuide(id) {
  const provider = ASSISTANT_OPTIONS.find(p => p.id === id);
  openDrawer({ title: `Connect ${provider.name}`, width: 560, body: (el) => {
    if (id === 'claude') {
      const help = _connHelp(CONNECTION_INFO[0], { state: 'setup', status: 'not-installed' }, { cli: { installed: false } });
      if (help) el.appendChild(help);
      el.appendChild(_connEl('p', 'conn-note', 'Once Claude Code is installed, press Connect Claude here. OpenDash adds its tools as part of the same connection.'));
    } else if (id === 'codex') {
      el.appendChild(_connEl('p', 'conn-text', 'Install and sign in to Codex using the official setup guide, then return and press Connect Codex. ChatGPT in a browser does not read local Codex connections.'));
    } else if (id === 'gemini') {
      el.appendChild(_connEl('p', 'conn-text', 'Install and sign in to Gemini CLI, then return and press Connect Gemini CLI. OpenDash registers its tools in your user settings without bypassing Gemini tool confirmations or folder permissions. The Gemini website does not use this local connection.'));
    }
    el.appendChild(_connEl('p', 'conn-text', 'Browser assistants need an authenticated remote MCP connection. OpenDash currently runs its tools locally, so opening the website does not connect your dashboard.'));
    el.appendChild(_connBtn('Official connection guide', 'external-link', 'btn-secondary', () => window.open(provider.docs, '_blank', 'noopener')));
    el.appendChild(_connBtn(`Open ${id === 'codex' ? 'ChatGPT' : provider.name}`, 'external-link', 'btn-secondary', () => window.open(provider.browser, '_blank', 'noopener')));
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
    const short = { claude: 'Local Claude Code and OpenDash tools. Desktop is optional.', codex: 'Local Codex tools; the dashboard assistant still uses Claude.', grok: 'Browser access only; your local OpenDash tools are not connected.', gemini: 'Local Gemini CLI tools; the dashboard assistant still uses Claude.' };
    head.append(mark, titles); card.append(head, _connEl('p', 'conn-text', compact ? short[provider.id] : provider.text));
    const status = assistantConnectionState(provider.id, all);
    card.appendChild(_connEl('span', 'assistant-state', status));
    if (!compact && provider.id === 'claude' && all.assistants) card.appendChild(_connEl('p', 'conn-note', all.assistants.claudeDesktop.detected ? 'Claude Desktop or its settings detected; it is optional.' : 'Claude Desktop is not required.'));
    const actions = _connEl('div', 'assistant-actions');
    const local = provider.id !== 'grok';
    const installed = provider.id === 'claude' ? all.cli && all.cli.installed : all.assistants && all.assistants[provider.id] && all.assistants[provider.id].installed;
    const localName = provider.id === 'codex' ? 'Codex' : provider.id === 'gemini' ? 'Gemini CLI' : 'Claude';
    if (local) {
      const b = _connBtn(_assistantBusy === provider.id ? 'Connecting…' : installed ? `Connect ${localName}` : `Set up ${localName}`, 'plug', 'btn-primary', () => installed ? assistantConnect(provider.id, repaint) : assistantConnectionGuide(provider.id));
      b.disabled = !!_assistantBusy; actions.appendChild(b);
    }
    actions.appendChild(_connBtn(`Open ${provider.id === 'codex' ? 'ChatGPT' : provider.name}`, 'external-link', 'btn-secondary', () => window.open(provider.browser, '_blank', 'noopener')));
    actions.appendChild(_connBtn('Options', 'settings', 'btn-ghost', () => provider.id === 'claude' ? _connMcpDrawer() : assistantConnectionGuide(provider.id)));
    if (provider.id === 'claude' && installed) actions.appendChild(_connBtn('Check', 'refresh-cw', 'btn-ghost', async () => { await connCheck('claude'); await connRefresh({ force: true }); repaint(); }));
    card.appendChild(actions);
    grid.appendChild(card);
  }
  return grid;
}
