/* ============================================================
   AI (served by serve.mjs -> lib/claude-runner.mjs -> the local `claude` CLI)
   ============================================================ */
// Every AI call from the page goes through serverAsk(). The server runs it
// with no tools and no MCP servers; model and effort must be on the server's
// allowlist. opts: { model, effort, system, schema }. With a schema the
// server returns parsed JSON in .json. Errors carry .code (CLI_MISSING,
// NOT_SIGNED_IN, USAGE_LIMIT, TIMEOUT, BAD_OUTPUT, ...).
async function serverAsk(prompt, opts) {
  if (!AI_AVAILABLE) { const e = new Error('AI backend not available'); e.code = 'UNAVAILABLE'; throw e; }
  const body = Object.assign({ prompt }, opts || {});
  const r = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(data.error || ('AI request failed: ' + r.status)); e.code = data.code || null; throw e; }
  if (opts && opts.schema) return data;
  if (typeof data.text !== 'string' || !data.text.trim()) {
    throw new Error('AI returned an empty response');
  }
  return data.text;
}

// Text answer, trimmed. opts as for serverAsk (no schema).
async function askAI(prompt, opts) {
  return String(await serverAsk(prompt, opts)).trim();
}
// JSON answer validated against `schema` by the CLI.
async function askAIJson(prompt, schema, opts) {
  const r = await serverAsk(prompt, Object.assign({}, opts || {}, { schema }));
  return r.json;
}

/* ============================================================
   TASK CHAT
   ============================================================ */
function getTaskChat(taskId) { return state.taskChat[taskId] || []; }
function addTaskChatMsg(taskId, role, text) {
  state.taskChat[taskId] = state.taskChat[taskId] || [];
  state.taskChat[taskId].push({ role, text, ts: Date.now() });
  saveData();
}
async function sendTaskChat(taskId, userMsg) {
  if (!userMsg.trim()) return;
  if (!AI_AVAILABLE) {
    // Deliberately NOT written into state: this used to persist a warning
    // into the saved conversation on every send, permanently.
    showDebug('Chat unavailable',
      'Per-task chat needs Claude. Start OpenDash with start-opendash.bat and make sure '
      + 'Claude Code is installed and signed in.');
    return;
  }
  addTaskChatMsg(taskId, 'user', userMsg);
  render();
  const item = getItem(taskId); if (!item) return;
  const history = getTaskChat(taskId);
  const stream = effStream(item);
  const who = userLabel();
  const peopleNames = effPeople(item).map(pid => getPerson(pid)?.name).filter(Boolean);
  const style = String(APP_CONFIG.ai.style || '').trim();
  const context = `You're helping ${who} think through this task on their dashboard:\n\nTitle: ${effTitle(item)}\nStream: ${STREAMS[stream]?.label || stream}\nPriority: ${effPriority(item).toUpperCase()}\nDue: ${effDate(item) || 'no date'}\nTags: ${effTags(item).join(', ') || 'none'}\nPeople: ${peopleNames.join(', ') || 'none'}\nDetail: ${effDetail(item) || 'no detail'}\n\nBe direct and concise. No preamble. Bullet points for next steps.${style ? ' ' + style : ''}`;
  const messages = history.slice(-10).map(m => `${m.role === 'user' ? (userName() || 'User') : 'You'}: ${m.text}`).join('\n\n');
  const prompt = `${context}\n\n--- conversation so far ---\n${messages}\n\nReply to the last message:`;
  try {
    const txt = await askAI(prompt, { model: APP_CONFIG.ai.chatModel, effort: APP_CONFIG.ai.effort });
    addTaskChatMsg(taskId, 'claude', txt);
    render();
  } catch (e) {
    addTaskChatMsg(taskId, 'claude', '⚠ ' + ((e && e.message) || e));
    render();
  }
}

