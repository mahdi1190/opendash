/* ============================================================
   AI (served by serve.mjs -> lib/claude-runner.mjs -> the local `claude` CLI)
   ============================================================ */
// Every AI call from the page goes through serverAsk(). The server runs it
// with no tools and no MCP servers; model and effort must be on the server's
// allowlist. opts: { model, effort, system, schema, signal }. With a schema the
// server returns parsed JSON in .json. Errors carry .code (CLI_MISSING,
// NOT_SIGNED_IN, USAGE_LIMIT, TIMEOUT, BAD_OUTPUT, CANCELLED, ...): show them with
// aiErrorView(e) / aiErrorToast(e). opts.signal (an AbortController's) stops the
// request; the server then cancels the Claude run too (server/routes/ai.mjs).
async function serverAsk(prompt, opts) {
  const signal = opts && opts.signal;
  if (!signal) return _serverAsk(prompt, opts);
  // Stop works even when the question went to another computer (56-remote-jobs.js
  // waits there without this signal): a late answer is then simply dropped.
  const cancelled = () => { const c = new Error('Stopped.'); c.code = 'CANCELLED'; return c; };
  if (signal.aborted) throw cancelled();
  const run = _serverAsk(prompt, opts);
  run.catch(() => { /* seen through the race below, or dropped after Stop */ });
  return Promise.race([run, new Promise((_, reject) => signal.addEventListener('abort', () => reject(cancelled()), { once: true }))]);
}
async function _serverAsk(prompt, opts) {
  if (!AI_AVAILABLE) { const e = new Error('AI backend not available'); e.code = 'UNAVAILABLE'; throw e; }
  const { signal, ...rest } = opts || {};
  const body = Object.assign({ prompt }, rest);
  let r;
  try {
    // No Claude on this computer but on another of yours: asked there (56-remote-jobs.js).
    r = await (typeof remoteFetch === 'function' ? remoteFetch : fetch)('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      ...(signal ? { signal } : {}),
    });
  } catch (e) {
    if ((e && e.name === 'AbortError') || (signal && signal.aborted)) { const c = new Error('Stopped.'); c.code = 'CANCELLED'; throw c; }
    throw e;   // the dashboard server is not running: SERVER_DOWN (02-core-net.js)
  }
  const data = await r.json().catch(() => ({}));
  // calm: the device that runs Claude is asleep or off (lib/sync/presence.mjs); toast() shows the line calmly.
  if (!r.ok) { const e = new Error(data.error || ('AI request failed: ' + r.status)); e.code = data.code || (r.status === 504 ? 'TIMEOUT' : r.status === 429 ? 'USAGE_LIMIT' : null); e.calm = !!data.calm; throw e; }
  if (opts && opts.schema) return data;
  if (typeof data.text !== 'string' || !data.text.trim()) {
    const e = new Error('Claude sent back an empty answer.'); e.code = 'BAD_OUTPUT'; throw e;
  }
  return data.text;
}

/**
 * What to tell the user when an AI call failed: the reason in plain words and
 * ONE fix. -> {text, fix: {label, run} | null, retry: boolean, cancelled: boolean}
 *   retry: Try again is the right next step (timeouts, busy, odd answers...).
 */
function aiErrorView(e) {
  const code = (e && e.code) || '';
  const own = String((e && e.message) || '').trim();
  const ownPlain = typeof netPlainWords === 'function' ? (netPlainWords(own) || own) : own;
  // No internet: Claude can't answer whatever the code says (a timeout, a stopped program, its raw text).
  if (typeof navigator !== 'undefined' && navigator.onLine === false && !['CANCELLED', 'UNAVAILABLE', 'CLI_MISSING', 'NOT_MAIN', 'USAGE_LIMIT'].includes(code) && !(e && e.name === 'AbortError') && !(typeof netIsDown === 'function' && netIsDown(e))) return { text: 'You’re offline, so Claude can’t answer. Connect to the internet, then try again.', fix: null, retry: true, cancelled: false };
  const open = { label: 'Open Connections', run: () => (typeof connOpen === 'function' ? connOpen('claude') : setView('connections')) };
  if (code === 'CANCELLED' || (e && e.name === 'AbortError')) return { text: 'Stopped.', fix: null, retry: true, cancelled: true };
  if (typeof netIsDown === 'function' && netIsDown(e)) return { text: netErrorMessage(e), fix: null, retry: true, cancelled: false };
  switch (code) {
    case 'UNAVAILABLE': case 'CLI_MISSING':
      return { text: 'Claude Code is not installed on this computer, so Freeflo cannot ask Claude.', fix: { label: 'How to install', run: open.run }, retry: false, cancelled: false };
    case 'NOT_SIGNED_IN':
      return { text: 'Claude is signed out on this computer, so it can’t answer until you sign in again.', fix: { label: 'Sign in to Claude', run: () => (typeof _connOpenTerminal === 'function' ? _connOpenTerminal() : open.run()) }, retry: false, cancelled: false };
    case 'USAGE_LIMIT':
      return { text: 'Your Claude usage limit is reached for now. It resets on its own (usually within a few hours); try again then.', fix: null, retry: false, cancelled: false };
    case 'TIMEOUT':
      return { text: 'Claude took too long, so Freeflo stopped waiting. Your text is kept: try again (a shorter question is quicker).', fix: null, retry: true, cancelled: false };
    case 'QUEUE_FULL':
      return { text: 'Claude is busy with other Freeflo requests. Try again in a minute.', fix: null, retry: true, cancelled: false };
    case 'BAD_OUTPUT':
      return { text: 'Claude’s answer came back empty or in the wrong shape. Trying again usually works.', fix: null, retry: true, cancelled: false };
    case 'CONNECTOR_AUTH': case 'TOOL_MISSING':
      return { text: ownPlain || 'One of your Claude connections needs you to sign in again. Open Connections to do it.', fix: open, retry: false, cancelled: false };
    case 'NOT_MAIN':
      return { text: own || 'This runs on your main computer.', fix: null, retry: false, cancelled: false };
    case 'CLI_FAILED':
      // Its own text is a program's error output: never for a person.
      return { text: 'Claude stopped before it finished. Try again; if it keeps happening, open Connections and check Claude.', fix: null, retry: true, cancelled: false };
    default:
      return { text: ownPlain || 'Claude could not answer just now. Try again in a moment.', fix: null, retry: true, cancelled: false };
  }
}
/** A toast for a failed AI call: the reason and its fix, else Try again (when `retry` is given). Quiet when stopped by the user. */
function aiErrorToast(e, opts) {
  opts = opts || {};
  const v = aiErrorView(e);
  if (v.cancelled) return;
  const action = v.fix || (v.retry && typeof opts.retry === 'function' ? { label: 'Try again', run: opts.retry } : null);
  toast((opts.what ? opts.what + ': ' : '') + v.text, { kind: 'err', timeout: 12000, action: action || undefined });
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
// While Claude writes, _taskChatBusy[taskId] = {at, ctrl}: the chat shows
// "Claude is thinking… 0:12" with Stop, Send waits, and what you type stays.
const _taskChatErr = {};
const _taskChatBusy = {};
function getTaskChat(taskId) { return chatView('task:' + taskId).messages; }
function addTaskChatMsg(taskId, role, text, ts) {
  if (!state.taskChat || typeof state.taskChat !== 'object') state.taskChat = {};
  const list = Array.isArray(state.taskChat[taskId]) ? state.taskChat[taskId].slice() : [];
  list.push({ id: chatNewId('c'), role, text, ts: ts || Date.now() });
  state.taskChat[taskId] = list;
  chatSave('task:' + taskId);
}
/** Stop the reply being written for this task (the server stops the Claude run too). */
function stopTaskChat(taskId) {
  const b = _taskChatBusy[taskId];
  if (b && b.ctrl) { try { b.ctrl.abort(); } catch (e) { /* already stopped */ } }
}
/** Ask again for the last question (after an error or Stop), without adding it a second time. */
function retryTaskChat(taskId) {
  const last = getTaskChat(taskId).slice().reverse().find(m => m && m.role === 'user');
  if (last) _askTaskChat(taskId, Number(last.ts) || Date.now());
}
async function sendTaskChat(taskId, userMsg) {
  if (!userMsg.trim()) return;
  if (!AI_AVAILABLE) {
    // Deliberately NOT written into state: this used to persist a warning
    // into the saved conversation on every send, permanently.
    _taskChatErr[taskId] = { text: 'Task chat needs Claude Code on this computer (or another of yours). Set it up in Connections > Claude.', fix: { label: 'Open Connections', run: () => (typeof connOpen === 'function' ? connOpen('claude') : setView('connections')) } };
    render();
    return false;
  }
  if (_taskChatBusy[taskId]) return false;           // one reply at a time; the box keeps what was typed
  delete _taskChatErr[taskId];
  const asked = Date.now();
  addTaskChatMsg(taskId, 'user', userMsg, asked);
  await _askTaskChat(taskId, asked);
  return true;
}
async function _askTaskChat(taskId, asked) {
  const item = getItem(taskId); if (!item) return;
  if (_taskChatBusy[taskId]) return;
  delete _taskChatErr[taskId];
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  _taskChatBusy[taskId] = { at: Date.now(), ctrl };
  render();
  const history = getTaskChat(taskId);
  const stream = effStream(item);
  const who = userLabel();
  const peopleNames = effPeople(item).map(pid => getPerson(pid)?.name).filter(Boolean);
  const style = String(APP_CONFIG.ai.style || '').trim();
  const context = `You're helping ${who} think through this task on their dashboard:\n\nTitle: ${effTitle(item)}\nStream: ${STREAMS[stream]?.label || stream}\nPriority: ${effPriority(item).toUpperCase()}\nDue: ${effDate(item) || 'no date'}\nTags: ${effTags(item).join(', ') || 'none'}\nPeople: ${peopleNames.join(', ') || 'none'}\nDetail: ${effDetail(item) || 'no detail'}\n\nBe direct and concise. No preamble. Bullet points for next steps.${style ? ' ' + style : ''}`;
  const messages = history.slice(-10).map(m => `${m.role === 'user' ? (userName() || 'User') : 'You'}: ${m.text}`).join('\n\n');
  const prompt = `${context}\n\n--- conversation so far ---\n${messages}\n\nReply to the last message:`;
  try {
    const txt = await askAI(prompt, { model: APP_CONFIG.ai.chatModel, effort: APP_CONFIG.ai.effort, purpose: 'taskchat', signal: ctrl ? ctrl.signal : undefined });
    delete _taskChatBusy[taskId];
    // Right after its question in time order, whatever arrived from another computer meanwhile.
    addTaskChatMsg(taskId, 'claude', txt, Math.max(asked + 1, Date.now()));
    render();
  } catch (e) {
    delete _taskChatBusy[taskId];
    const v = aiErrorView(e);
    _taskChatErr[taskId] = { text: v.cancelled ? 'Stopped. Your question is kept: press Ask again to get an answer.' : v.text, fix: v.fix, retry: v.retry || v.cancelled, code: (e && e.code) || null };
    render();
  }
}

/* ---------- "Claude is thinking… 0:12": a live wait time for any AI wait ---------- */
let _aiSinceTimer = null;
function _aiSinceFmt(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
/** An element showing the time since `at` (ms), kept up to date while it is on the page. */
function aiSinceEl(at) {
  const el = document.createElement('span'); el.className = 'ai-since'; el.dataset.aiSince = String(at);
  el.textContent = _aiSinceFmt(Date.now() - at);
  if (!_aiSinceTimer) {
    _aiSinceTimer = setInterval(() => {
      const els = document.querySelectorAll('[data-ai-since]');
      if (!els.length) { clearInterval(_aiSinceTimer); _aiSinceTimer = null; return; }
      for (const x of els) x.textContent = _aiSinceFmt(Date.now() - Number(x.dataset.aiSince));
    }, 1000);
  }
  return el;
}
