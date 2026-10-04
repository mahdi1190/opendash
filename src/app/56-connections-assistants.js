/* Connections-only assistant presentation. Shared setup and welcome cards
   stay in 56-assistant-cards.js. */
const _connPageAssistantRepaint = () => { if (state.view === 'connections') renderMain(); };

function _connPageAssistantState(id, all) {
  const facts = all.assistants || {};
  if (id === 'claude') {
    const installed = (all.mcp && all.mcp.installed || {}).claudeCode === 'installed';
    if (!installed) return 'Ready to set up';
    const st = all.claude && all.claude.state;
    if (st === 'ok') return 'Connected';
    if (st === 'error') return 'Connection needs attention';
    if (st === 'limited') return 'Usage limit reached';
    return st === 'auth' || st === 'setup' ? 'Tools added · sign in' : 'Tools added · check status';
  }
  if (id === 'codex') return !facts.codex ? 'Checking installation…' : facts.codex.configured ? 'Tools configured' : facts.codex.installed ? 'Ready to connect' : 'Install Codex first';
  if (id === 'gemini') return !facts.gemini ? 'Checking installation…' : facts.gemini.configured ? 'Tools configured' : facts.gemini.installed ? 'Ready to connect' : 'Install Gemini CLI first';
  return 'Browser connector unavailable';
}

function _connPageAssistantDetails(id, all) {
  const facts = all.assistants && all.assistants[id];
  const status = _connPageAssistantState(id, all);
  const working = id === 'claude' ? status === 'Connected' : id !== 'grok' && !!(facts && facts.installed && facts.configured);
  const attention = id === 'claude' ? !!(all.cli && all.cli.installed && all.claude && ['auth', 'error', 'limited'].includes(all.claude.state)) : !!(facts && facts.conflict);
  return { status: attention && facts && facts.conflict ? 'Review existing settings' : status, working, attention, kind: working ? 'ok' : attention ? 'warn' : 'off' };
}

function _connPageAssistantGuide(id) {
  const provider = ASSISTANT_OPTIONS.find(p => p.id === id);
  const all = Connections.all() || {};
  const facts = all.assistants && all.assistants[id];
  const configured = !!(facts && facts.configured);
  openDrawer({ title: configured ? `${provider.name} connection` : `Connect ${provider.name}`, width: 560, body: (el) => {
    if (facts && facts.conflict) el.appendChild(_connEl('p', 'callout warn conn-msg', 'An existing configuration needs review. OpenDash leaves it unchanged.'));
    if (id === 'claude') {
      const help = _connHelp(CONNECTION_INFO[0], { state: 'setup', status: 'not-installed' }, { cli: { installed: false } });
      if (help) el.appendChild(help);
      el.appendChild(_connEl('p', 'conn-note', 'Once Claude Code is installed, press Connect Claude here. OpenDash adds its tools as part of the same connection.'));
    } else if (id === 'codex') {
      el.appendChild(_connEl('p', 'conn-text', configured ? 'OpenDash tools are already configured in Codex. Open Codex and sign in if asked. Restart existing sessions to load the tools. ChatGPT in a browser uses a separate connection.' : 'Install and sign in to Codex using the official setup guide, then return and press Connect Codex. ChatGPT in a browser does not read local Codex connections.'));
    } else if (id === 'gemini') {
      el.appendChild(_connEl('p', 'conn-text', configured ? 'OpenDash tools are already configured in Gemini CLI. Open Gemini CLI, sign in if asked, and review its folder and tool permissions. The Gemini website uses a separate connection.' : 'Install and sign in to Gemini CLI, then return and press Connect Gemini CLI. OpenDash registers its tools in your user settings without bypassing Gemini tool confirmations or folder permissions. The Gemini website does not use this local connection.'));
    }
    el.appendChild(_connEl('p', 'conn-text', 'Browser assistants need an authenticated remote MCP connection. OpenDash currently runs its tools locally, so opening the website does not connect your dashboard.'));
    el.appendChild(_connBtn('Official connection guide', 'external-link', 'btn-secondary', () => window.open(provider.docs, '_blank', 'noopener')));
    el.appendChild(_connBtn(`Open ${id === 'codex' ? 'ChatGPT' : provider.name}`, 'external-link', 'btn-secondary', () => window.open(provider.browser, '_blank', 'noopener')));
  } });
}

function _connPageAssistantCards(all, repaint = _connPageAssistantRepaint, compact = false) {
  const grid = _connEl('div', 'conn-grid assistant-grid cp-assistant-grid' + (compact ? ' assistant-grid-compact' : ''));
  for (const provider of ASSISTANT_OPTIONS) {
    const detail = _connPageAssistantDetails(provider.id, all);
    const card = _connEl('section', 'card conn-card assistant-card st-' + detail.kind); card.dataset.conn = provider.id;
    const head = _connEl('div', 'conn-head');
    const mark = _connEl('span', 'conn-ic assistant-mark ' + provider.id);
    if (provider.id === 'claude') mark.innerHTML = _connMark('claude');
    else { const img = document.createElement('img'); img.src = ASSISTANT_MARKS[provider.mark]; img.alt = ''; img.width = 28; img.height = 28; mark.appendChild(img); }
    const titles = _connEl('div', 'conn-titles'); titles.append(_connEl('h3', 'conn-name', provider.name), _connEl('div', 'conn-sub', provider.id === 'grok' ? 'Browser access' : 'Local assistant · OpenDash tools'));
    const short = { claude: 'Local Claude Code and OpenDash tools. Desktop is optional.', codex: 'Local Codex tools; the dashboard assistant still uses Claude.', grok: 'Browser access only; your local OpenDash tools are not connected.', gemini: 'Local Gemini CLI tools; the dashboard assistant still uses Claude.' };
    head.append(mark, titles); card.append(head, _connEl('p', 'conn-text', compact ? short[provider.id] : provider.text));
    const info = _connEl('div', 'cp-assistant-info');
    info.appendChild(_connEl('span', 'status assistant-state ' + detail.kind, detail.status));
    if (provider.id === 'claude') info.appendChild(_connEl('span', 'cp-assistant-hint', all.claude && all.claude.state === 'ok' ? 'Dashboard AI is ready' : 'Powers dashboard AI'));
    else info.appendChild(_connEl('span', 'cp-assistant-hint', provider.id === 'grok' ? 'No local dashboard access' : 'Dashboard AI uses Claude'));
    card.appendChild(info);
    if (!compact && provider.id === 'claude') card.appendChild(_connEl('p', 'conn-note', all.assistants && all.assistants.claudeDesktop && all.assistants.claudeDesktop.detected ? 'Claude Desktop detected; it is optional.' : 'Claude Desktop is optional.'));
    const actions = _connEl('div', 'assistant-actions');
    const local = provider.id !== 'grok';
    const installed = provider.id === 'claude' ? all.cli && all.cli.installed : all.assistants && all.assistants[provider.id] && all.assistants[provider.id].installed;
    const localName = provider.id === 'codex' ? 'Codex' : provider.id === 'gemini' ? 'Gemini CLI' : 'Claude';
    if (local) {
      const checking = provider.id !== 'claude' && !(all.assistants && all.assistants[provider.id]);
      const b = _connBtn(_assistantBusy === provider.id ? 'Connecting…' : checking ? 'Checking…' : detail.working ? 'Check status' : installed ? `Connect ${localName}` : `Set up ${localName}`, detail.working ? 'refresh-cw' : 'plug', detail.working ? 'btn-secondary' : 'btn-primary', async () => {
        if (detail.working) { if (provider.id === 'claude') await connCheck('claude'); await connRefresh({ force: true }); repaint(); }
        else if (installed) assistantConnect(provider.id, repaint);
        else _connPageAssistantGuide(provider.id);
      });
      b.disabled = !!_assistantBusy || checking; actions.appendChild(b);
    }
    actions.appendChild(_connBtn(`Open ${provider.id === 'codex' ? 'ChatGPT' : provider.name}`, 'external-link', 'btn-secondary', () => window.open(provider.browser, '_blank', 'noopener')));
    actions.appendChild(_connBtn('Options', 'settings', 'btn-ghost', () => provider.id === 'claude' ? _connMcpDrawer() : _connPageAssistantGuide(provider.id)));
    card.appendChild(actions);
    grid.appendChild(card);
  }
  return grid;
}
