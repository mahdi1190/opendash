/* ============================================================
   SUGGESTIONS: extra snapshot fields for the task, people and focus cards
   (owner: the suggestion-card builder for TASKS, PEOPLE, FOCUS, HYGIENE)
   ------------------------------------------------------------
   sgSnapshot() (68-suggest-context.js) calls these when they exist:
     _sgTaskExtra(i, today) -> per task:
       moves [{at, from, to, reason}]  forward date moves in the last 21 days
                                       (state.taskActivity type 'date'), S12
       waitingOn 'personId' | null     who a waiting task waits on, S14
       emails [{id, label, date}]      related email threads (newest last), S14-S16
     _sgCtxExtra(ctx) -> on the snapshot:
       streams {id: {label, lastDone}} the last completion per stream (state.
                                       completionLog), S19
       eveningSaved                    today's evening recap is saved, S11
       myEmails [address]              the user's own addresses, S16
       and inbox threads get personId (People by address), S16
   Page only (reads state); the rules stay pure.
   ============================================================ */

function _sgxDay(ts) { const d = new Date(Number(ts)); return isNaN(d) ? null : fmtDate(d); }
function _sgTaskExtra(i, today) {
  const out = { moves: [], waitingOn: null, emails: [] };
  try {
    const cut = sgAddDays(today, -21);
    for (const a of ((state.taskActivity && state.taskActivity[i.id]) || [])) {
      if (!a || a.type !== 'date' || !a.from || !a.to || !(a.to > a.from)) continue;
      const at = _sgxDay(a.ts);
      if (!at || at < cut) continue;
      out.moves.push({ at, from: String(a.from).slice(0, 10), to: String(a.to).slice(0, 10), reason: String(a.reason || '').slice(0, 80) });
    }
    if (out.moves.length > 20) out.moves = out.moves.slice(-20);
    if (typeof homeIsWaiting === 'function' && homeIsWaiting(i) && typeof homeWaitingPerson === 'function') { const p = homeWaitingPerson(i); out.waitingOn = p && !p.self ? p.id : null; }
    out.emails = (Array.isArray(i.related) ? i.related : []).filter(r => r && r.type === 'email' && r.id).slice(-3).map(r => ({ id: String(r.id), label: String(r.label || ''), date: String(r.date || '') }));
  } catch (e) { /* the defaults */ }
  return out;
}
function _sgCtxExtra(ctx) {
  const streams = {};
  try {
    for (const [id, s] of Object.entries(typeof STREAMS !== 'undefined' ? STREAMS : {})) streams[id] = { label: String((s && s.label) || id), lastDone: null };
    for (const [tid, list] of Object.entries(state.completionLog || {})) {
      const it = typeof getItem === 'function' ? getItem(tid) : null;
      const sid = it && typeof effStream === 'function' ? effStream(it) : null;
      if (!sid) continue;
      const last = Math.max(0, ...(Array.isArray(list) ? list : []).map(Number).filter(Number.isFinite));
      const day = last ? _sgxDay(last) : null;
      if (!day) continue;
      const s = streams[sid] || (streams[sid] = { label: sid, lastDone: null });
      if (!s.lastDone || day > s.lastDone) s.lastDone = day;
    }
  } catch (e) { /* none */ }
  const today = ctx.now.date;
  const eveningSaved = (state.reviews || []).some(r => r && r.kind === 'evening' && r.date === today);
  let myEmails = [];
  try { myEmails = (APP_CONFIG.myEmails || []).concat(...(state.people || []).filter(p => p && p.self).map(p => (typeof pplPersonEmails === 'function' ? pplPersonEmails(p) : [p.email]))).filter(Boolean).map(x => String(x).toLowerCase()); } catch (e) { myEmails = []; }
  try {
    const idx = typeof pplIndex === 'function' ? pplIndex() : null;
    if (idx && idx.email) for (const t of (ctx.inbox && ctx.inbox.threads) || []) {
      const p = t.from && t.from.email ? idx.email.get(String(t.from.email).toLowerCase()) : null;
      const id = p && typeof p === 'object' ? p.id : p;
      if (id) t.personId = id;
    }
  } catch (e) { /* matched by address in the rule */ }
  return { streams, eveningSaved, myEmails };
}
