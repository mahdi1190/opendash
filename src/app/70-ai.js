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
  // No Claude on this computer but on another of yours: asked there (56-remote-jobs.js).
  const r = await (typeof remoteFetch === 'function' ? remoteFetch : fetch)('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  // calm: the device that runs Claude is asleep or off (lib/sync/presence.mjs); toast() shows the line calmly.
  if (!r.ok) { const e = new Error(data.error || ('AI request failed: ' + r.status)); e.code = data.code || null; e.calm = !!data.calm; throw e; }
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
// Synced on every computer (70-ai-chats.js): each message has an id and a time,
// the chat shows in time order with this computer's older messages, and a
// reply is added once, when it is complete. A failed reply is shown in this
// tab only (_taskChatErr): it is not part of the conversation.
const _taskChatErr = {};
function getTaskChat(taskId) { return chatView('task:' + taskId).messages; }
function addTaskChatMsg(taskId, role, text, ts) {
  if (!state.taskChat || typeof state.taskChat !== 'object') state.taskChat = {};
  const list = Array.isArray(state.taskChat[taskId]) ? state.taskChat[taskId].slice() : [];
  list.push({ id: chatNewId('c'), role, text, ts: ts || Date.now() });
  state.taskChat[taskId] = list;
  chatSave('task:' + taskId);
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
  delete _taskChatErr[taskId];
  const asked = Date.now();
  addTaskChatMsg(taskId, 'user', userMsg, asked);
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
    const txt = await askAI(prompt, { model: APP_CONFIG.ai.chatModel, effort: APP_CONFIG.ai.effort, purpose: 'taskchat' });
    // Right after its question in time order, whatever arrived from another computer meanwhile.
    addTaskChatMsg(taskId, 'claude', txt, Math.max(asked + 1, Date.now()));
    render();
  } catch (e) {
    _taskChatErr[taskId] = String((e && e.message) || e || 'The reply could not be written.').slice(0, 300);
    render();
  }
}

