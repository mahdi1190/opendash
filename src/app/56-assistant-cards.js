/* One assistant integration, including its OpenDash tools, reused in welcome
   and Connections. Browser availability is distinct from local tool access. */
const ASSISTANT_OPTIONS = Object.freeze([
  { id: 'claude', name: 'Claude', mark: 'claude', browser: 'https://claude.ai', docs: 'https://code.claude.com/docs/en/setup',
    text: 'Finds or installs Claude Code, signs you in and adds OpenDash’s tools.' },
  { id: 'codex', name: 'ChatGPT / Codex', mark: 'chatgpt', browser: 'https://chatgpt.com', docs: 'https://learn.chatgpt.com/docs/extend/mcp?surface=cli',
    text: 'Lets Codex use your tasks. OpenDash’s own AI still uses Claude.' },
  { id: 'grok', name: 'Grok', mark: 'grok', browser: 'https://grok.com', docs: 'https://docs.x.ai/grok/connectors/custom-mcp-tunneling',
    text: 'Opens Grok in your browser; it can’t see OpenDash yet.' },
  { id: 'gemini', name: 'Gemini', mark: 'gemini', browser: 'https://gemini.google.com', docs: 'https://geminicli.com/docs/tools/mcp-server/',
    text: 'Lets Gemini CLI use your tasks. OpenDash’s own AI still uses Claude.' },
]);
let _assistantBusy = null;
let _localClaudeUi = null;
function localClaudeProgress(all) {
  const flow = _localClaudeUi || all.localClaude;
  return flow && (flow.busy || flow.phase === 'error' || flow.phase === 'browser-error' || flow.phase === 'browser-opened') ? flow : null;
}
function localClaudePhaseLabel(flow) { return ({ checking: 'Looking for Claude', installing: 'Installing Claude', 'awaiting-login': 'Finish browser sign-in', 'adding-tools': 'Adding OpenDash’s tools', verifying: 'Checking the connection', 'awaiting-approval': 'Approve the terminal prompts', 'opening-browser': 'Opening Claude in your browser', 'browser-opened': 'Finish browser setup', 'browser-error': 'The browser session didn’t open', error: 'Setup didn’t finish' })[flow.phase] || 'Connecting Claude'; }
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
  if (provider.id !== 'claude') return uiButton({ label: `Open ${provider.id === 'codex' ? 'ChatGPT' : provider.name}`, icon: 'external-link', kind: 'secondary', size: 'sm', run: () => window.open(provider.browser, '_blank', 'noopener') });
  const url = localClaudeBrowserUrl(_localClaudeUi || all.localClaude);
  const button = uiButton({ label: 'Open connected Claude', icon: 'external-link', kind: 'secondary', size: 'sm', run: () => url ? window.open(url, '_blank', 'noopener') : assistantConnect('claude', repaint, 'browser') });
  button.disabled = !!_assistantBusy; return button;
}

/**
 * An assistant's one status (SIMPLIFY_PLAN.md 5.6): Not set up, Setting up (with the step), Connected,
 * Needs you (with the one thing to do) or Usage limit reached (grey: back when it resets).
 * -> {tone, word, detail} for setStatusLine.
 */
function assistantStatus(id, all) {
  all = all || {};
  const facts = all.assistants || {};
  if (id === 'claude') {
    const flow = localClaudeProgress(all);
    if (flow) {
      if (flow.busy) return { tone: 'busy', word: 'Setting up', detail: localClaudePhaseLabel(flow) };
      if (flow.phase === 'browser-opened') return { tone: 'ok', word: 'Connected', detail: localClaudePhaseLabel(flow) };
      return { tone: 'warn', word: 'Needs you', detail: localClaudePhaseLabel(flow) };
    }
    const installed = (all.mcp && all.mcp.installed || {}).claudeCode === 'installed';
    if (!installed) return { tone: 'off', word: 'Not set up' };
    const st = all.claude && all.claude.state;
    if (st === 'ok') return { tone: 'ok', word: 'Connected' };
    if (st === 'limited') return { tone: 'idle', word: 'Usage limit reached', detail: 'back when it resets' };
    if (st === 'error') return { tone: 'warn', word: 'Needs you', detail: 'Press Check again' };
    if (st === 'auth' || st === 'setup') return { tone: 'warn', word: 'Needs you', detail: 'Sign in' };
    return { tone: 'busy', word: 'Setting up', detail: 'Checking' };
  }
  if (id === 'codex' || id === 'gemini') {
    const f = facts[id], name = id === 'codex' ? 'Codex' : 'Gemini CLI';
    if (!f) return { tone: 'busy', word: 'Setting up', detail: 'Looking for ' + name };
    if (f.conflict) return { tone: 'warn', word: 'Needs you', detail: 'Review the existing settings' };
    if (f.configured) return { tone: 'ok', word: 'Connected' };
    return { tone: 'off', word: 'Not set up', detail: f.installed ? 'Ready to connect' : 'Install ' + name + ' first' };
  }
  return { tone: 'off', word: 'Not set up', detail: 'Browser only' };
}
function assistantConnectionState(id, all) { const s = assistantStatus(id, all); return s.detail ? `${s.word} · ${s.detail}` : s.word; }

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
      } else toast('Claude connected. AI features are on', { kind: 'ok' });
      await connRefresh({ force: true });
    } else {
      const r = await fetch('/api/connections/assistant-connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Could not connect this assistant.');
      toast(j.message, { kind: 'ok', timeout: 7000 });
      await connRefresh({ force: true });
    }
  } catch (e) { toastError('connect ' + ((ASSISTANT_OPTIONS.find(p => p.id === id) || {}).name || 'this assistant'), e, () => assistantConnect(id, repaint, action)); }
  finally { if (popup && !handedOff) { try { popup.close(); } catch {} } _assistantBusy = null; repaint(); }
}

/**
 * The body of an assistant's setup drawer (SIMPLIFY_PLAN.md 5.6): one sentence, the official guide and the
 * browser button; the longer explanation folds under "How it works". Shared by the welcome and Connections.
 */
function assistantGuideFill(el, id, all, repaint) {
  const provider = ASSISTANT_OPTIONS.find(p => p.id === id);
  const facts = all.assistants && all.assistants[id];
  const configured = !!(facts && facts.configured);
  if (facts && facts.conflict) el.appendChild(_connEl('p', 'callout warn conn-msg', 'An existing configuration needs review. OpenDash leaves it unchanged.'));
  if (id === 'claude') {
    const help = _connHelp(CONNECTION_INFO[0], { state: 'setup', status: 'not-installed' }, { cli: { installed: false } });
    if (help) el.appendChild(help);
    el.appendChild(_connEl('p', 'conn-note', 'Press Link Claude. It finds Claude Code (or installs it), signs you in and adds OpenDash’s tools.'));
  } else if (id === 'codex') {
    el.appendChild(_connEl('p', 'conn-text', configured ? 'OpenDash’s tools are in Codex. Open Codex and sign in if asked, and restart open sessions to load them.' : 'Install and sign in to Codex with its official guide, then come back and press Connect Codex.'));
  } else if (id === 'gemini') {
    el.appendChild(_connEl('p', 'conn-text', configured ? 'OpenDash’s tools are in Gemini CLI. Open it and sign in if asked.' : 'Install and sign in to Gemini CLI, then come back and press Connect Gemini CLI.'));
  }
  const acts = _connEl('div', 'assistant-actions');
  acts.appendChild(uiButton({ label: 'Official connection guide', icon: 'external-link', kind: 'secondary', size: 'sm', run: () => window.open(provider.docs, '_blank', 'noopener') }));
  acts.appendChild(assistantBrowserButton(provider, all, repaint));
  el.appendChild(acts);
  setFold(el, 'conn-ai-' + id + '-how', 'How it works', ({ body }) => {
    if (id === 'claude') {
      body.appendChild(_connEl('p', 'conn-note', 'Open connected Claude starts a browser session through Remote Control: approve its terminal prompts and keep this computer running. Claude chats on claude.ai are a separate connection.'));
      body.appendChild(_connEl('p', 'conn-note', 'Claude Code needs a supported subscription or provider account. ' + (all.assistants && all.assistants.claudeDesktop && all.assistants.claudeDesktop.detected ? 'Claude Desktop was found; it is optional.' : 'Claude Desktop is optional.')));
    } else if (id === 'gemini') {
      body.appendChild(_connEl('p', 'conn-note', 'OpenDash adds its tools to your user settings and never skips Gemini’s own confirmations or folder permissions. The Gemini website is a separate connection.'));
    } else if (id === 'codex') {
      body.appendChild(_connEl('p', 'conn-note', 'ChatGPT in a browser doesn’t read Codex on this computer.'));
    } else {
      body.appendChild(_connEl('p', 'conn-note', 'Opening the website doesn’t connect your local OpenDash tools.'));
    }
  });
}
function assistantConnectionGuide(id) {
  const provider = ASSISTANT_OPTIONS.find(p => p.id === id);
  openDrawer({ title: `Connect ${provider.name}`, width: 560, body: (el) => assistantGuideFill(el, id, Connections.all() || {}, () => renderMain()) });
}

/** One assistant card (Connections and the welcome): status first, one sentence, one button; the rest under More. */
function assistantCardBuild(provider, all, repaint, o) {
  o = o || {};
  const status = assistantStatus(provider.id, all);
  const card = _connEl('section', 'card conn-card assistant-card' + (o.cls ? ' ' + o.cls : '')); card.dataset.conn = provider.id;
  const head = _connEl('div', 'conn-head');
  const mark = _connEl('span', 'conn-ic assistant-mark' + (provider.id === 'claude' && o.claudeMark ? ' claude' : ''));
  if (provider.id === 'claude' && o.claudeMark) mark.innerHTML = _connMark('claude');
  else { const img = document.createElement('img'); img.src = ASSISTANT_MARKS[provider.mark]; img.alt = ''; img.width = 28; img.height = 28; mark.appendChild(img); }
  const titles = _connEl('div', 'conn-titles'); titles.append(_connEl(o.h3 ? 'h3' : 'div', 'conn-name', provider.name));
  if (provider.id !== 'grok') titles.appendChild(_connEl('div', 'conn-sub', 'On this computer'));
  head.append(mark, titles); card.appendChild(head);
  // Not set up here but Claude works on another of your computers: AI works here through it.
  const viaClaude = o.via && provider.id === 'claude' && status.word === 'Not set up' && typeof connVia === 'function' ? connVia('claude') : null;
  card.appendChild(setStatusLine(status.tone, status.word, viaClaude ? `Uses Claude on ${viaClaude}` : status.detail));
  card.appendChild(_connEl('p', 'conn-text', provider.text));
  if (provider.id === 'claude') { const flow = localClaudeProgress(all); if (flow && flow.message) card.appendChild(_connEl('p', 'conn-note', flow.message)); }
  const local = provider.id !== 'grok';
  const installed = provider.id === 'claude' ? all.cli && all.cli.installed : all.assistants && all.assistants[provider.id] && all.assistants[provider.id].installed;
  const localName = provider.id === 'codex' ? 'Codex' : provider.id === 'gemini' ? 'Gemini CLI' : 'Claude';
  const working = status.word === 'Connected';
  const guide = () => (o.guide ? o.guide(provider.id) : assistantConnectionGuide(provider.id));
  const row = _connEl('div', 'set-action'); card.appendChild(row);
  if (local) {
    const checking = provider.id !== 'claude' && !(all.assistants && all.assistants[provider.id]);
    const flow = provider.id === 'claude' && localClaudeProgress(all);
    const label = flow && flow.busy ? localClaudePhaseLabel(flow) + '…' : _assistantBusy === provider.id ? 'Connecting…' : checking ? 'Checking…'
      : provider.id === 'claude' ? (viaClaude ? 'Also set up on this computer' : working ? 'Check again' : 'Link Claude')
        : working ? 'Check again' : installed ? `Connect ${localName}` : `Set up ${localName}`;
    const b = uiButton({ label, icon: working ? 'refresh-cw' : 'plug', kind: working || viaClaude ? 'secondary' : 'primary', size: 'sm', run: async () => {
      if (provider.id === 'claude' && !working) assistantConnect(provider.id, repaint);
      else if (provider.id === 'claude') { await connCheck('claude'); repaint(); }
      else if (working) { await connRefresh({ force: true }); repaint(); }
      else if (installed) assistantConnect(provider.id, repaint);
      else guide();
    } });
    b.disabled = !!_assistantBusy || checking; row.appendChild(b);
  } else row.appendChild(assistantBrowserButton(provider, all, repaint));
  setFold(card, 'conn-ai-' + provider.id + '-more', 'More', ({ body }) => {
    const acts = _connEl('div', 'assistant-actions');
    if (local) acts.appendChild(assistantBrowserButton(provider, all, repaint));
    acts.appendChild(uiButton({ label: 'Options', icon: 'settings', kind: 'ghost', size: 'sm', run: () => provider.id === 'claude' ? _connMcpDrawer() : guide() }));
    body.appendChild(acts);
    if (provider.id === 'claude') body.appendChild(_connEl('p', 'conn-note', all.assistants && all.assistants.claudeDesktop && all.assistants.claudeDesktop.detected ? 'Claude Desktop was found; it is optional.' : 'Claude Desktop is optional.'));
  });
  return card;
}

function assistantConnectionCards(all, repaint = () => renderMain(), compact = false) {
  const grid = _connEl('div', 'conn-grid assistant-grid' + (compact ? ' assistant-grid-compact' : ''));
  for (const provider of ASSISTANT_OPTIONS) grid.appendChild(assistantCardBuild(provider, all, repaint, {}));
  return grid;
}
