/* Connections-only assistant presentation. Shared setup and welcome cards
   stay in 56-assistant-cards.js. */
const _connPageAssistantRepaint = () => { if (state.view === 'connections') renderMain(); };

/** The status the Connections AI cards and the page's counts use (assistantStatus in 56-assistant-cards.js). */
function _connPageAssistantDetails(id, all) {
  const st = assistantStatus(id, all);
  const working = st.word === 'Connected', attention = st.word === 'Needs you';
  return { status: st.word, detail: st.detail || '', tone: st.tone, working, attention, kind: working ? 'ok' : attention ? 'warn' : 'off' };
}

function _connPageAssistantGuide(id) {
  const provider = ASSISTANT_OPTIONS.find(p => p.id === id);
  const all = Connections.all() || {};
  const facts = all.assistants && all.assistants[id];
  const configured = !!(facts && facts.configured);
  openDrawer({ title: configured ? `${provider.name} connection` : `Connect ${provider.name}`, width: 560, body: (el) => assistantGuideFill(el, id, all, _connPageAssistantRepaint) });
}

function _connPageAssistantCards(all, repaint = _connPageAssistantRepaint, compact = false) {
  const grid = _connEl('div', 'conn-grid assistant-grid cp-assistant-grid' + (compact ? ' assistant-grid-compact' : ''));
  for (const provider of ASSISTANT_OPTIONS) {
    const detail = _connPageAssistantDetails(provider.id, all);
    grid.appendChild(assistantCardBuild(provider, all, repaint, { cls: 'st-' + detail.kind, h3: true, claudeMark: true, via: true, guide: _connPageAssistantGuide }));
  }
  return grid;
}
