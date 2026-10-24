/* ============================================================
   TOGETHER: the game together (window.OpenDashGame: gameAward, gameStats).
   Co-op tasks (shared XP and a joint celebration when done), team quests
   with a party streak, friendly challenges with trophies, an optional
   weekly leaderboard, cheers / high-fives, Focus together, accountability
   goals with a buddy, and the space's feed.
   Friend-made moments are CAPPED: every award goes through gameAward (one
   per key, at most three a day per kind), notices from friends are at most
   three per update, and a cheer boost is 2 XP, three a day.
   ============================================================ */
var _tgGame = { tickAt: 0, scoreAt: {} };
const TG_XP = { coop: 10, 'team-quest': 20, trophy: 25, 'cheer-boost': 2, 'together-done': 3, 'goal-hit': 3 };
function _tgAward(kind, key, label, quiet) {
  if (typeof gameAward !== 'function') return null;
  return gameAward({ kind, key, xp: TG_XP[kind] || 3, label: label ? String(label).slice(0, 40) : '', quiet: !!quiet });
}
function _tgMoment(o) { if (typeof gameMoment === 'function') gameMoment(o); else toast(o.title + (o.sub ? '. ' + o.sub : ''), { icon: o.icon || 'party-popper' }); }

/* ---------- what changed (after each load) ---------- */
function tgNotice(prev) {
  const me = tgMe();
  if (!me || !prev) return;
  const notes = [];
  const say = (msg, o) => notes.push([msg, o || {}]);
  for (const sp of tgAllSpaces()) {
    const old = prev.get(sp.id);
    const v = sp.value;
    if (sp.status === 'invited' && (!old || old.status !== 'invited')) { say(`${tgName(sp.invitedBy, v)} invited you to ${tgSpaceName(sp)}`, { icon: 'user-plus', action: { label: 'See', run: () => setView('together') } }); continue; }
    if (sp.status !== 'joined' || !old || !old.value) continue;
    const ov = old.value;
    const oldItems = new Map((ov.items || []).map(x => [x.id, x]));
    const finished = [];   // shared tasks friends finished since the last load (not co-op: that has its own line)
    for (const it of v.items || []) {
      const o = oldItems.get(it.id);
      if (it.status === 'done' && o && o.status !== 'done' && it.doneBy && it.doneBy !== me && !it.coop) finished.push(it);
      // Asked of you
      if (it.assignee === me && it.by !== me && (!o || o.assignee !== me) && !tgSeen('ask:' + it.id)) { tgMarkSeen('ask:' + it.id); say(`${tgFirst(it.by, v)} asks you: “${String(it.title || '').slice(0, 60)}”`, { icon: 'inbox', action: { label: 'Review', run: () => tgOpenItem(sp.id, it.id) } }); }
      // Done by someone else
      if (it.status === 'done' && (!o || o.status !== 'done') && it.doneBy && it.doneBy !== me) {
        const mineTask = (state.custom || []).find(t => t && t.shared && t.shared.item === it.id);
        if (mineTask && statusOf(mineTask.id) !== 'done') say(`${tgFirst(it.doneBy, v)} finished “${String(it.title || '').slice(0, 60)}”`, { icon: 'circle-check', action: { label: 'Mark mine done', run: () => toggleDone(mineTask.id) } });
        else if (it.by === me || it.coop) say(`${tgFirst(it.doneBy, v)} did “${String(it.title || '').slice(0, 60)}”`, { icon: 'circle-check', action: tgPref('cheers') ? { label: 'High-five', run: () => tgCheer(sp.id, it) } : null });
        if (it.coop) tgCoopCelebrate(sp, it);
      }
      // Accepted / declined what you asked
      if (it.by === me && it.assignee && it.assignee !== me && o) {
        const a = it.ack && it.ack[it.assignee], oa = o.ack && o.ack[it.assignee];
        if (a && a !== oa) say(`${tgFirst(it.assignee, v)} ${a === 'accepted' ? 'accepted' : 'declined'} “${String(it.title || '').slice(0, 60)}”`, { icon: a === 'accepted' ? 'check' : 'x' });
      }
      // Cheers on what you did
      if (it.doneBy === me && it.cheers) for (const f of Object.keys(it.cheers)) {
        if (f === me || (o && o.cheers && o.cheers[f]) || tgSeen(`cheer:${it.id}:${f}`)) continue;
        tgMarkSeen(`cheer:${it.id}:${f}`);
        _tgAward('cheer-boost', `${it.id}:${f}`, 'High-five', true);
        say(`🙌 ${tgFirst(f, v)} high-fived you for “${String(it.title || '').slice(0, 50)}”`, { icon: 'handshake' });
      }
      // Comments from others on what you are in
      const involved = it.by === me || it.assignee === me || (it.comments || []).some(c => c.by === me);
      if (involved && o) {
        const had = new Set((o.comments || []).map(c => c.id));
        const fresh = (it.comments || []).filter(c => !had.has(c.id) && c.by !== me);
        if (fresh.length) say(`${tgFirst(fresh[0].by, v)} commented on “${String(it.title || '').slice(0, 50)}”`, { icon: 'message-circle', action: { label: 'Open', run: () => tgOpenItem(sp.id, it.id) } });
      }
    }
    if (finished.length) _tgHangFinished(sp, finished);
    const oldQ = new Map((ov.quests || []).map(x => [x.id, x]));
    for (const q of v.quests || []) { const o = oldQ.get(q.id); if (q.done && (!o || !o.done)) tgQuestCelebrate(sp, q); }
    const oldC = new Map((ov.challenges || []).map(x => [x.id, x]));
    for (const c of v.challenges || []) { const o = oldC.get(c.id); if (c.winner && (!o || o.winner !== c.winner)) tgChallengeEnded(sp, c); }
    const oldG = new Map((ov.goals || []).map(x => [x.id, x]));
    for (const g of v.goals || []) {
      // Your buddy nudged you about your goal.
      if (g.by === me && g.buddy && g.nudges && g.nudges[g.buddy]) {
        const o = oldG.get(g.id), was = o && o.nudges && o.nudges[g.buddy];
        if (g.nudges[g.buddy] !== was) say(`${tgFirst(g.buddy, v)} nudges you: ${String(g.title || 'your goal').slice(0, 60)}`, { icon: 'bell', action: { label: 'Check in', run: () => setView(`together:${sp.id}:quests`) } });
      }
      if (g.buddy !== me || g.by === me) continue;
      const o = oldG.get(g.id); const t = todayStr();
      const now = g.checks && g.checks[t], was = o && o.checks && o.checks[t];
      if (now && now !== was) say(`${tgFirst(g.by, v)} ${now === 'hit' ? 'hit' : 'missed'} their goal: ${String(g.title || '').slice(0, 50)}`, { icon: now === 'hit' ? 'target' : 'cloud', action: { label: now === 'hit' ? 'Cheer' : 'Encourage', run: () => tgGoalCheer(sp.id, g) } });
    }
  }
  // At most three at once (a busy friend can't flood the screen).
  for (const [msg, o] of notes.slice(0, 3)) toast(msg, o);
  if (notes.length > 3) toast(`${notes.length - 3} more updates from friends`, { icon: 'users', action: { label: 'See', run: () => setView('together') } });
  if (typeof tgRepaintDrawer === 'function') tgRepaintDrawer();
}
/** Friends finished shared tasks in a space: one line ("Sam finished “Bins”", or "Sam and Alex finished 3 tasks"). */
function _tgHangFinished(sp, list) {
  const v = sp.value, who = [...new Set(list.map(it => it.doneBy))];
  const names = who.slice(0, 3).map(f => tgFirst(f, v)).join(' and ');
  const where = tgSpaceName(sp).slice(0, 40);
  const text = list.length === 1 ? `${names} finished “${String(list[0].title || 'a task').slice(0, 80)}” in ${where}` : `${names} finished ${list.length} shared tasks in ${where}`;
  tgHangoutOnce(sp.id, 'done:' + list.map(it => it.id).sort().join(',').slice(0, 100), text, 'circle-check', { friend: who.length === 1 ? who[0] : null });
}
/** You ticked a shared task off (1space tgToggleDone): a co-op one gets its moment; any other, a line in the Friends feed. */
function tgOnItemDone(spaceId, it, mine) {
  const sp = tgSpace(spaceId);
  if (!sp || !it || !mine) return;
  if (it.coop) { tgCoopCelebrate(sp, Object.assign({}, it, { status: 'done', doneBy: tgMe() })); return; }
  tgHangoutOnce(spaceId, 'done:' + it.id, `You finished “${String(it.title || 'a task').slice(0, 80)}” in ${tgSpaceName(sp).slice(0, 40)}`, 'circle-check');
}
function tgCoopCelebrate(sp, it) {
  const key = 'coop:' + it.id;
  if (tgSeen(key)) return;
  tgMarkSeen(key);
  const v = sp.value;
  const who = tgMembers(v).map(f => tgFirst(f, v)).join(' & ');
  _tgAward('coop', it.id, 'Co-op task', true);
  _tgMoment({ over: 'Done together', title: String(it.title || 'A co-op task').slice(0, 80), sub: `${who} · +${TG_XP.coop} XP each`, icon: 'users', big: true, sound: 'quest' });
  tgHangoutOnce(sp.id, 'coop:' + it.id, `Done together in ${tgSpaceName(sp).slice(0, 40)}: ${String(it.title || '').slice(0, 80)}`, 'users');
}
function tgQuestCelebrate(sp, q) {
  const key = 'quest:' + q.id;
  if (tgSeen(key)) return;
  tgMarkSeen(key);
  if (q.progress && q.progress[tgMe()] > 0) _tgAward('team-quest', q.id, 'Team quest', true);
  _tgMoment({ over: 'Team quest complete', title: String(q.title || 'Quest').slice(0, 80), sub: `${tgSpaceName(sp)} · +${TG_XP['team-quest']} XP`, icon: 'target', big: true, sound: 'quest' });
  tgHangoutOnce(sp.id, 'quest:' + q.id, `Team quest done in ${tgSpaceName(sp).slice(0, 40)}: ${String(q.title || '').slice(0, 80)}`, 'target');
}
function tgChallengeEnded(sp, c) {
  const key = 'chal:' + c.id;
  if (tgSeen(key)) return;
  tgMarkSeen(key);
  const v = sp.value;
  if (c.winner === tgMe()) {
    _tgAward('trophy', c.id, 'Trophy', true);
    _tgMoment({ over: 'You won', title: String(c.title || 'The challenge').slice(0, 80), sub: `A trophy for your shelf · +${TG_XP.trophy} XP`, icon: 'trophy', big: true, sound: 'level' });
    tgHangoutOnce(sp.id, 'chal:' + c.id, `You won the challenge in ${tgSpaceName(sp).slice(0, 40)}: ${String(c.title || '').slice(0, 80)}`, 'trophy');
  } else toast(`${tgFirst(c.winner, v)} won “${String(c.title || 'the challenge').slice(0, 60)}”`, { icon: 'trophy', action: tgPref('cheers') ? { label: 'Cheer', run: () => tgSendCheer(c.winner, c.id, '🏆') } : null });
}

/* ---------- XP, scores and quest progress, kept up to date ---------- */
/* What you said yes to when you joined a quest or challenge is kept on your side
   (state.together.spaces[id].joined = {'q<id>' | 'c<id>': [kind, from, to]}): your number goes in by
   itself only while it still counts the same thing over the same days; if it changes, you are asked again. */
function _tgJoinHolds(spaceId, x, quest) {
  const w = tgSpacePref(spaceId, 'joined'), k = (quest ? 'q' : 'c') + x.id;
  const p = w && typeof w === 'object' && Object.prototype.hasOwnProperty.call(w, k) ? w[k] : null;
  return Array.isArray(p) && p.length === 3 && p[0] === x.kind && p[1] === (x.from || null) && p[2] === (x.to || null);
}
function _tgRememberJoin(spaceId, x, quest) {
  const v = tgVal(spaceId);
  const live = new Set([...((v && v.quests) || []).map(q => 'q' + q.id), ...((v && v.challenges) || []).map(c => 'c' + c.id)]);
  const okDay = (d) => d === null || (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d));
  const prev = tgSpacePref(spaceId, 'joined'), keep = new Map();
  if (prev && typeof prev === 'object') for (const [k, p] of Object.entries(prev)) if (live.has(k) && Array.isArray(p) && p.length === 3 && typeof p[0] === 'string' && okDay(p[1]) && okDay(p[2])) keep.set(k, [p[0].slice(0, 12), p[1], p[2]]);
  if (x && TG_ID_RE.test(x.id)) keep.set((quest ? 'q' : 'c') + x.id, [String(x.kind || ''), x.from || null, x.to || null]);
  tgSetSpacePref(spaceId, 'joined', Object.fromEntries([...keep].slice(-200)));
}
/** What joining shares, in one line (the button's tip). */
function _tgJoinTip(x) {
  if (x.kind === 'custom') return 'Counts only the +1s you add yourself';
  const what = { done: 'how many tasks you finish', focus: 'your focus minutes', items: 'how many shared tasks you finish here', overdue: 'how many of your tasks are overdue' }[x.kind] || 'a number';
  const when = x.kind === 'overdue' ? (x.to ? `, until ${_dayLabel(x.to)}` : '') : `${x.from ? ', from ' + _dayLabel(x.from) : ', from the start'}${x.to ? ' to ' + _dayLabel(x.to) : ''}`;
  return `Shares ${what}${when} with everyone here, as a number only`;
}
function tgGameTick() {
  if (!tgChannel()) return;
  const t = Date.now();
  if (t - _tgGame.tickAt < 30 * 1000) return;
  _tgGame.tickAt = t;
  const me = tgMe(), today = todayStr();
  for (const sp of tgSpaces()) {
    const v = sp.value;
    const joinedAt = (v.members[me] && (v.members[me].joined || v.members[me].at)) || 0;
    for (const it of v.items || []) {
      if (it.status !== 'done' || !it.doneAt || it.doneAt < joinedAt) continue;
      if (it.coop) _tgAward('coop', it.id, 'Co-op task', true);
      else if (it.doneBy === me) _tgAward('together-done', it.id, 'Shared task', true);
    }
    for (const q of v.quests || []) if (q.done && q.progress && q.progress[me] > 0) _tgAward('team-quest', q.id, 'Team quest', true);
    for (const c of v.challenges || []) if (c.winner === me) _tgAward('trophy', c.id, 'Trophy', true);
    // Your own numbers in the quests and challenges you joined (every 10 minutes each).
    const ops = [];
    for (const q of v.quests || []) {
      if (q.done || !q.progress || q.progress[me] == null || (q.to && q.to < today) || q.kind === 'custom' || !_tgJoinHolds(sp.id, q, true)) continue;
      if (t - (_tgGame.scoreAt['q' + q.id] || 0) < 10 * 60 * 1000) continue;
      _tgGame.scoreAt['q' + q.id] = t;
      const n = tgMyNumber(q.kind, q.from, q.to, v);
      if (n != null && n !== q.progress[me]) ops.push({ op: 'set', path: ['quests', q.id, 'progress', me], value: n });
      const total = Object.entries(q.progress).reduce((s, [k, x]) => s + (k === me ? (n != null ? n : x) : Number(x) || 0), 0);
      if (total >= (q.target || 1) && !q.done) ops.push({ op: 'set', path: ['quests', q.id, 'done'], value: t }, ...tgFeedOps(sp.id, 'quest', String(q.title || '').slice(0, 180), q.id));
    }
    for (const c of v.challenges || []) {
      if (c.closed || !c.scores || c.scores[me] == null || c.kind === 'custom' || !_tgJoinHolds(sp.id, c, false)) continue;
      if (c.kind === 'overdue' && !(c.to && c.to >= today)) continue;   // your overdue count only while the challenge runs
      if (t - (_tgGame.scoreAt['c' + c.id] || 0) < 10 * 60 * 1000) continue;
      _tgGame.scoreAt['c' + c.id] = t;
      const n = c.kind === 'overdue' ? tgOverdueCount() : tgMyNumber(c.kind, c.from, c.to, v);
      if (n != null && n !== c.scores[me]) ops.push({ op: 'set', path: ['challenges', c.id, 'scores', me], value: n });
      // First to clear their overdue wins at once; the others are decided when the challenge ends.
      if (c.kind === 'overdue' && n === 0 && !c.winner) ops.push({ op: 'set', path: ['challenges', c.id, 'winner'], value: me }, { op: 'set', path: ['challenges', c.id, 'closed'], value: t }, ...tgFeedOps(sp.id, 'trophy', String(c.title || '').slice(0, 180), c.id));
      if (c.kind !== 'overdue' && c.to && c.to < today && !c.winner) {
        const sc = Object.entries(c.scores).map(([k, x]) => [k, k === me && n != null ? n : Number(x) || 0]).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
        if (sc.length && sc[0][1] > 0) ops.push({ op: 'set', path: ['challenges', c.id, 'winner'], value: sc[0][0] }, { op: 'set', path: ['challenges', c.id, 'closed'], value: t });
      }
    }
    if (ops.length) tgEdit(sp.id, ops, { undo: false });
  }
}
/** Your own number for a quest or challenge: tasks done, focus minutes or shared items done between two days. */
function tgMyNumber(kind, from, to, v) {
  const a = from || '0000-00-00', b = to || '9999-12-31';
  if (kind === 'items') return (v.items || []).filter(it => it.status === 'done' && it.doneBy === tgMe() && it.doneAt && tgDayOf(it.doneAt) >= a && tgDayOf(it.doneAt) <= b).length;
  const s = typeof gameStats === 'function' ? gameStats() : null;
  if (!s) return null;
  if (kind === 'done') { let n = 0; for (const [d, x] of Object.entries(s.done.byDay || {})) if (d >= a && d <= b) n += Number(x) || 0; return n; }
  if (kind === 'focus') { let ms = 0; for (const [d, x] of Object.entries(s.focus.byDay || {})) if (d >= a && d <= b) ms += Number(x) || 0; return Math.round(ms / 60000); }
  return null;
}
function tgOverdueCount() {
  const t = todayStr();
  return getAllItems().filter(i => statusOf(i.id) !== 'done' && effDate(i) && effDate(i) < t).length;
}
/** Days in a row (to today, or yesterday) with something done in the space by anyone. */
function tgPartyStreak(v) {
  const days = new Set();
  for (const it of v.items || []) if (it.status === 'done' && it.doneAt) days.add(tgDayOf(it.doneAt));
  let d = todayStr(), n = 0;
  if (!days.has(d)) d = Clock.addDays(d, -1);
  while (days.has(d) && n < 3650) { n++; d = Clock.addDays(d, -1); }
  return n;
}

/* ---------- cheers ---------- */
function tgSendCheer(fid, ref, emoji) {
  if (!fid || fid === tgMe()) return;
  tgSendKind([fid], 'cheer', { emoji: emoji || '🙌', ...(ref && TG_ID_RE.test(ref) ? { re: ref } : {}) });
}
function tgCheer(spaceId, it) {
  const me = tgMe();
  if (!it || !it.doneBy || it.doneBy === me || (it.cheers && it.cheers[me])) return;
  tgEdit(spaceId, [{ op: 'set', path: ['items', it.id, 'cheers', me], value: Date.now() }], { toast: `High-five sent to ${tgFirst(it.doneBy, tgVal(spaceId))}`, icon: 'handshake' });
  tgSendCheer(it.doneBy, it.id, '🙌');
}
/** A cheer message (the friends channel, kind 'cheer'): a toast and a small, capped boost. */
function tgCheerMsg(m) {
  if (!tgOn() || !m || !m.b) return;
  const from = m.from || (m.friend && m.friend.id);
  if (!from) return;
  const key = `${m.b.re && TG_ID_RE.test(String(m.b.re)) ? m.b.re : 'day' + todayStr()}:${from}`;
  if (tgSeen('cheer:' + key)) return;
  tgMarkSeen('cheer:' + key);
  _tgAward('cheer-boost', key, 'A cheer', true);
  toast(`${m.b.emoji || '🙌'} ${tgFirst(from)} cheered you${m.b.text ? ': ' + String(m.b.text).slice(0, 80) : ''}`, { icon: 'handshake' });
}
function tgCheerHeard(from, ev) { if (ev && ev.ref) tgCheerMsg({ from, b: { re: ev.ref, emoji: '🙌' } }); }

/* ---------- Focus together ---------- */
/** Friends you share a joined space with. */
function tgSpaceFriendIds() { return [...new Set(tgSpaces().flatMap(s => tgMembers(s.value)))].filter(f => f !== tgMe()); }
var _tgFocusSession = null;   // {id, at} of the focus session friends were told about
function tgOnGameEvent(d) {
  if (!tgChannel() || !d || d.kind !== 'focus') return;
  if (d.action === 'start') {
    if (tgPref('focusTell')) {
      const fids = tgSpaceFriendIds();
      if (fids.length && !(_tgFocusSession && Date.now() - _tgFocusSession.at < 60000)) { _tgFocusSession = { id: tgNewId('fo'), at: Date.now() }; tgSendKind(fids, 'focus', { id: _tgFocusSession.id, state: 'start', min: 25 }); }
    }
    const now = tgFocusingNow();
    if (now.length) toast(`${now.map(f => tgFirst(f)).join(' & ')} ${now.length === 1 ? 'is' : 'are'} focusing too`, { icon: 'timer' });
  } else if (d.action === 'stop' && tgPref('focusTell') && _tgFocusSession) {
    const min = Math.max(1, Math.min(600, Math.round((Number(d.ms) || 0) / 60000)));
    tgSendKind(tgSpaceFriendIds(), 'focus', { id: _tgFocusSession.id, state: 'done', ...(d.ms ? { min } : {}) });
    _tgFocusSession = null;
  }
}
function tgFocusHeard(from, ev) {
  if (!ev) return;
  _tg.focusing[from] = { on: !!ev.on, until: ev.until || (Date.now() + (ev.mins || 25) * 60000), at: Date.now() };
  const mine = typeof gameFocusRun === 'function' && gameFocusRun();
  if (ev.on && mine) toast(`${tgFirst(from)} is focusing too`, { icon: 'timer' });
  if (state.view === 'together' || state.view.startsWith('together:')) render();
}
/** Friends focusing now: what they told you (live) or their presence (if they share it). */
function tgFocusingNow() {
  const out = new Set();
  for (const [f, x] of Object.entries(_tg.focusing)) if (x.on && x.until > Date.now()) out.add(f);
  for (const f of tgFriends()) if (tgPresence(f.id) === 'focusing') out.add(f.id);
  return [...out];
}
function tgFocusStrip() {
  const now = tgFocusingNow();
  if (!now.length) return null;
  const s = tgEl('div', 'tg-card tg-focus-strip');
  s.insertAdjacentHTML('beforeend', icon('timer'));
  s.appendChild(tgAvatarStack(now, null, 6));
  s.appendChild(tgEl('span', '', `${now.map(f => tgFirst(f)).join(', ')} ${now.length === 1 ? 'is' : 'are'} focusing now`));
  s.appendChild(tgBtn('Focus too', { icon: 'timer', run: (e, b) => tgPickFocusTask(b) }));
  return s;
}
function tgPickFocusTask(anchor, after) {
  if (typeof gameFocusStart !== 'function') { toast('The focus timer is part of the game (Settings > Game).', { icon: 'timer' }); return; }
  const today = getAllItems().filter(i => typeof matchesView === 'function' && matchesView(i, 'today')).slice(0, 12);
  if (!today.length) { toast('Nothing on Today to focus on: add a task first.', { icon: 'timer' }); return; }
  openMenu(anchor, [{ heading: 'Focus on' }, ...today.map(i => ({ label: String(effTitle(i)).slice(0, 60), icon: 'circle', run: () => { gameFocusStart(i.id); if (after) after(i); } }))], { align: 'start', width: 300 });
}
function tgFocusTogetherMenu(anchor) {
  const fids = tgSpaceFriendIds();
  if (!fids.length) { toast('Share a space with a friend first.', { icon: 'users' }); return; }
  openMenu(anchor, [
    { heading: 'Invite friends in your spaces to focus' },
    ...[25, 50, 90].map(min => ({ label: `${min} minutes`, icon: 'timer', run: () => tgFocusInvite(fids, min, anchor) })),
  ], { align: 'start', width: 260 });
}
function tgFocusInvite(fids, min, anchor) {
  const id = tgNewId('fo');
  _tgFocusSession = { id, at: Date.now() };
  tgSendKind(fids, 'focus', { id, state: 'invite', min }).then((r) => {
    if (!r) return;
    const who = fids.length === 1 ? tgFirst(fids[0]) : fids.length + ' friends';
    if (r.sent) toast(`Invited ${who} to focus for ${min} min`, { icon: 'timer' });
    else if (r.queued) toast(`Invited ${who} to focus for ${min} min. They are not online now, so they see it when they are.`, { icon: 'timer' });
    else toast('No one could be invited: they are no longer in a space with you. Share a space with them first.', { icon: 'users', action: { label: 'Spaces', run: () => setView('together') } });
  });
  tgPickFocusTask(anchor);
}
/** A focus message (kind 'focus'): an invitation shows a toast with Join. */
function tgFocusMsg(m) {
  if (!tgOn() || !m || !m.b) return;
  const from = m.from || (m.friend && m.friend.id);
  if (!from) return;
  const b = m.b;
  const min = Number.isInteger(b.min) && b.min > 0 && b.min <= 600 ? b.min : 25;
  if (b.state === 'invite' || b.state === 'start') {
    _tg.focusing[from] = { on: true, until: Date.now() + min * 60000, at: Date.now() };
    if (b.state === 'invite') toast(`${tgFirst(from)} invites you to focus together for ${min} min`, { icon: 'timer', timeout: 20000, action: { label: 'Join', run: () => { tgSendKind([from], 'focus', { id: b.id, state: 'join', min }); tgPickFocusTask(document.getElementById('main-body')); } } });
    else if (typeof gameFocusRun === 'function' && gameFocusRun()) toast(`${tgFirst(from)} is focusing too`, { icon: 'timer' });
  } else if (b.state === 'join') toast(`${tgFirst(from)} joined your focus session`, { icon: 'timer' });
  else if (b.state === 'done' || b.state === 'leave') { if (_tg.focusing[from]) _tg.focusing[from].on = false; if (b.state === 'done') toast(`${tgFirst(from)} finished a focus session${b.min ? ` (${b.min} min)` : ''}`, { icon: 'circle-check' }); }
  if (state.view === 'together' || state.view.startsWith('together:')) render();
}

/* ---------- accountability goals ---------- */
function tgGoalCheer(spaceId, g) {
  tgSendCheer(g.by, g.id, '💪');
  toast(`Cheered ${tgFirst(g.by, tgVal(spaceId))}`, { icon: 'handshake' });
}
/** Your buddy nudges you: one entry per buddy in the goal (kept in the space, so it arrives even while you are away). */
function tgGoalNudge(spaceId, g) {
  const me = tgMe(), last = g.nudges && g.nudges[me];
  if (last && Date.now() - last < 60 * 60 * 1000) { toast('You nudged them less than an hour ago.', { icon: 'bell' }); return; }
  tgEdit(spaceId, [{ op: 'set', path: ['goals', g.id, 'nudges', me], value: Date.now() }], { undo: false, toast: `Nudged ${tgFirst(g.by, tgVal(spaceId))}`, icon: 'bell' });
}
function tgNudgeHeard(from, ev) {
  const v = tgVal(ev.space); const g = v && (v.goals || []).find(x => x.id === ev.goal);
  if (!g || g.by !== tgMe() || g.buddy !== from) return;   // only your buddy, only about your goal
  const what = String(g.title || 'your goal').slice(0, 60);
  const msg = ev.kind === 'remind' ? `${tgFirst(from, v)} nudges you: ${what}` : ev.kind === 'cheer' ? `💪 ${tgFirst(from, v)} cheers you on: ${what}` : `${tgFirst(from, v)} saw your check-in: ${what}`;
  toast(msg, { icon: 'target', action: { label: 'Check in', run: () => setView(`together:${ev.space}:quests`) } });
}
function tgGoalCheck(spaceId, g, ans) {
  const t = todayStr();
  const ops = [{ op: 'set', path: ['goals', g.id, 'checks', t], value: ans }];
  if (ans === 'hit') ops.push(...tgFeedOps(spaceId, 'goal', String(g.title || '').slice(0, 180), g.id));
  tgEdit(spaceId, ops, { toast: ans === 'hit' ? 'Checked in: goal hit' : 'Checked in. Tomorrow’s another go', icon: ans === 'hit' ? 'target' : 'cloud' });
  if (ans === 'hit') _tgAward('goal-hit', `${g.id}:${t}`, 'Goal hit', false);
}
function tgGoalStreak(g) {
  let d = todayStr(), n = 0;
  if (!(g.checks && g.checks[d] === 'hit')) d = Clock.addDays(d, -1);
  while (g.checks && g.checks[d] === 'hit' && n < 3650) { n++; d = Clock.addDays(d, -1); }
  return n;
}

/* ---------- the Quests tab: quests, challenges, goals ---------- */
function _tgWeek() { const ws = typeof _qaWeekStart === 'function' ? fmtDate(_qaWeekStart(_qaToday())) : todayStr(); return { from: ws, to: Clock.addDays(ws, 6) }; }
function tgRenderQuests(body, sp, ro) {
  const v = sp.value, id = sp.id, me = tgMe();
  const streak = tgPartyStreak(v);
  const top = tgEl('div', 'tg-card tg-streak');
  top.insertAdjacentHTML('beforeend', icon('flame'));
  top.appendChild(tgEl('b', '', streak ? `${streak}-day party streak` : 'No party streak yet'));
  top.appendChild(tgEl('span', 'muted tg-sm', 'Days in a row with something done here, by anyone.'));
  body.appendChild(top);
  // Team quests
  const qs = tgSection(body, 'Team quests', 'target', (v.quests || []).length);
  for (const q of v.quests || []) {
    const total = Object.values(q.progress || {}).reduce((s, x) => s + (Number(x) || 0), 0);
    const card = tgEl('div', 'tg-card tg-quest' + (q.done ? ' is-done' : ''));
    const h = tgEl('div', 'tg-quest-h');
    h.append(tgEl('b', '', q.title || 'Quest'), tgEl('span', 'muted tg-sm', `${Math.min(total, q.target || 1)} / ${q.target || 1}${q.to ? ' · until ' + _dayLabel(q.to) : ''}`));
    card.appendChild(h);
    const bar = tgEl('div', 'tg-meter'); const fill = tgEl('i'); fill.style.width = Math.min(100, Math.round(total / Math.max(1, q.target || 1) * 100)) + '%'; bar.appendChild(fill); card.appendChild(bar);
    const who = tgEl('div', 'tg-quest-who');
    for (const [f, n] of Object.entries(q.progress || {})) { const c = tgEl('span', 'tg-chip'); c.appendChild(tgAvatarEl(f, 'sm', v)); c.appendChild(tgEl('span', '', String(n))); who.appendChild(c); }
    card.appendChild(who);
    if (!ro && !q.done) {
      const acts = tgEl('div', 'tg-acts');
      const joined = !!(q.progress && q.progress[me] != null), ended = !!(q.to && q.to < todayStr());
      const join = (again) => tgBtn(again ? 'Count me in again' : 'Count me in', { primary: true, icon: 'plus', tip: _tgJoinTip(q), run: () => { const n = q.kind === 'custom' ? 0 : (tgMyNumber(q.kind, q.from, q.to, v) || 0); _tgRememberJoin(id, q, true); tgEdit(id, [{ op: 'set', path: ['quests', q.id, 'progress', me], value: n }], { toast: 'You’re in. Your part counts as you go', icon: 'target' }); } });
      if (!joined) acts.appendChild(ended ? tgEl('span', 'muted tg-sm', 'This quest has ended.') : join(false));
      else if (q.kind === 'custom') acts.appendChild(tgBtn('+1', { icon: 'plus', run: () => { const n = (Number(q.progress[me]) || 0) + 1; const ops = [{ op: 'set', path: ['quests', q.id, 'progress', me], value: n }]; if (total + 1 >= (q.target || 1)) ops.push({ op: 'set', path: ['quests', q.id, 'done'], value: Date.now() }); tgEdit(id, ops, { undo: true, toast: '+1', icon: 'plus' }); } }));
      else if (!_tgJoinHolds(id, q, true)) { acts.appendChild(tgEl('span', 'muted tg-sm', 'It changed since you joined, so your number stopped going in.')); if (!ended) acts.appendChild(join(true)); }
      if (q.by === me) acts.appendChild(tgIconBtn('trash-2', 'Delete quest', () => tgEdit(id, [{ op: 'del', path: ['quests', q.id] }], { toast: 'Quest deleted', icon: 'trash-2' })));
      card.appendChild(acts);
    }
    qs.appendChild(card);
  }
  if (!(v.quests || []).length) qs.appendChild(tgEl('p', 'muted tg-sm', ro ? 'No team quests.' : 'No team quests yet. Start one: everyone’s part adds up, and you all share the XP.'));
  if (!ro) qs.appendChild(tgBtn('New team quest', { icon: 'plus', run: () => tgQuestDialog(id) }));
  // Challenges
  const cs = tgSection(body, 'Friendly challenges', 'trophy', (v.challenges || []).length);
  for (const c of v.challenges || []) {
    const card = tgEl('div', 'tg-card tg-quest' + (c.closed ? ' is-done' : ''));
    const h = tgEl('div', 'tg-quest-h');
    h.append(tgEl('b', '', c.title || 'Challenge'), tgEl('span', 'muted tg-sm', c.winner ? `Won by ${tgName(c.winner, v)}` : c.to ? `until ${_dayLabel(c.to)}` : ''));
    card.appendChild(h);
    const sc = Object.entries(c.scores || {}).sort((a, b) => (c.kind === 'overdue' ? a[1] - b[1] : b[1] - a[1]));
    const tbl = tgEl('div', 'tg-board-rank');
    sc.forEach(([f, n], i) => {
      const r = tgEl('div', 'tg-rank' + (f === me ? ' is-me' : ''));
      r.append(tgEl('span', 'tg-rank-n', String(i + 1)), tgAvatarEl(f, 'sm', v), tgEl('span', 'tg-row-t', tgName(f, v)), tgEl('b', '', c.kind === 'overdue' ? `${n} overdue` : c.kind === 'focus' ? `${Math.round(n / 6) / 10} h` : String(n)));
      if (c.winner === f) r.insertAdjacentHTML('beforeend', icon('trophy'));
      tbl.appendChild(r);
    });
    card.appendChild(tbl);
    if (!ro && !c.closed) {
      const acts = tgEl('div', 'tg-acts');
      const joined = !!(c.scores && c.scores[me] != null), ended = !!(c.to && c.to < todayStr());
      const join = (again) => tgBtn(again ? 'Join again' : 'Join the challenge', { primary: true, icon: 'flag', tip: _tgJoinTip(c), run: () => {
        const n = c.kind === 'overdue' ? tgOverdueCount() : c.kind === 'custom' ? 0 : (tgMyNumber(c.kind, c.from, c.to, v) || 0);
        if (c.kind === 'overdue' && n === 0) { toast('You have nothing overdue, so you would win at once. Pick another challenge, or cheer the others on.', { icon: 'trophy' }); return; }
        _tgRememberJoin(id, c, false);
        tgEdit(id, [{ op: 'set', path: ['challenges', c.id, 'scores', me], value: n }], { toast: 'You’re in. Good luck!', icon: 'flag' });
      } });
      if (!joined) acts.appendChild(ended ? tgEl('span', 'muted tg-sm', 'This challenge has ended.') : join(false));
      else if (c.kind === 'custom') acts.appendChild(tgBtn('+1', { icon: 'plus', run: () => tgEdit(id, [{ op: 'set', path: ['challenges', c.id, 'scores', me], value: (Number(c.scores[me]) || 0) + 1 }], { undo: true, toast: '+1', icon: 'plus' }) }));
      else if (!_tgJoinHolds(id, c, false)) { acts.appendChild(tgEl('span', 'muted tg-sm', 'It changed since you joined, so your number stopped going in.')); if (!ended) acts.appendChild(join(true)); }
      if (c.by === me) acts.appendChild(tgIconBtn('trash-2', 'Delete challenge', () => tgEdit(id, [{ op: 'del', path: ['challenges', c.id] }], { toast: 'Challenge deleted', icon: 'trash-2' })));
      card.appendChild(acts);
    }
    cs.appendChild(card);
  }
  if (!ro) {
    const row = tgEl('div', 'tg-ideas');
    const wk = _tgWeek();
    for (const [kind, title] of [['overdue', 'First to clear overdue'], ['focus', 'Most focus hours this week'], ['done', 'Most tasks done this week'], ['items', 'Most shared tasks done this week']]) {
      row.appendChild(tgBtn(title, { icon: 'trophy', run: () => {
        const cid = tgNewId('c');
        if (kind !== 'overdue') _tgRememberJoin(id, { id: cid, kind, from: wk.from, to: wk.to }, false);
        tgEdit(id, [{ op: 'set', path: ['challenges', cid], value: { kind, title, from: wk.from, to: wk.to, by: me, at: Date.now(), scores: kind === 'overdue' ? {} : { [me]: tgMyNumber(kind, wk.from, wk.to, v) || 0 } } }], { toast: 'Challenge started: friends can join', icon: 'trophy' });
      } }));
    }
    cs.appendChild(row);
  }
  // Goals with a buddy
  const gs = tgSection(body, 'Goals with a buddy', 'target', (v.goals || []).length);
  if (!(v.goals || []).length) gs.appendChild(tgEl('p', 'muted tg-sm', ro ? 'No goals.' : 'No goals yet. Set one and pick a buddy here to check in with you.'));
  const t = todayStr();
  for (const g of v.goals || []) {
    const card = tgEl('div', 'tg-card tg-goal');
    const h = tgEl('div', 'tg-quest-h');
    h.append(tgEl('b', '', g.title || 'Goal'), tgEl('span', 'muted tg-sm', `${tgName(g.by, v)}${g.buddy ? ' · buddy: ' + tgName(g.buddy, v) : ''} · ${tgGoalStreak(g)}-day streak`));
    card.appendChild(h);
    const days = tgEl('div', 'tg-goal-days');
    for (let i = 6; i >= 0; i--) { const d = Clock.addDays(t, -i); const x = g.checks && g.checks[d]; const dot = tgEl('span', 'tg-gday' + (x === 'hit' ? ' hit' : x === 'miss' ? ' miss' : '')); dot.title = `${_dayLabel(d)}: ${x || 'no check-in'}`; days.appendChild(dot); }
    card.appendChild(days);
    if (!ro) {
      const acts = tgEl('div', 'tg-acts');
      if (g.by === me) {
        const today = g.checks && g.checks[t];
        acts.append(tgBtn(today === 'hit' ? 'Hit today ✓' : 'I did it today', { primary: today !== 'hit', icon: 'target', run: () => tgGoalCheck(id, g, 'hit') }), tgBtn('Missed today', { ghost: true, run: () => tgGoalCheck(id, g, 'miss') }));
        acts.appendChild(tgIconBtn('trash-2', 'Delete goal', () => tgEdit(id, [{ op: 'del', path: ['goals', g.id] }], { toast: 'Goal deleted', icon: 'trash-2' })));
      } else if (g.buddy === me) {
        acts.appendChild(tgBtn('Cheer', { icon: 'handshake', run: () => tgGoalCheer(id, g) }));
        if (!(g.checks && g.checks[t])) acts.appendChild(tgBtn('Nudge', { ghost: true, icon: 'bell', run: () => tgGoalNudge(id, g) }));
      }
      card.appendChild(acts);
    }
    gs.appendChild(card);
  }
  if (!ro) gs.appendChild(tgBtn('New goal with a buddy', { icon: 'plus', run: () => tgGoalDialog(id) }));
}
function tgQuestDialog(spaceId) {
  const wk = _tgWeek();
  let title, kind, target, to;
  openDialog({
    title: 'New team quest', width: 460,
    body: (el) => {
      const f = (label, inp) => { const l = tgEl('label', 'field'); l.append(tgEl('span', 'field-label', label), inp); el.appendChild(l); };
      title = document.createElement('input'); title.className = 'control'; title.maxLength = 120; title.placeholder = 'Clear 30 shared tasks this week'; title.setAttribute('autofocus', ''); f('Quest', title);
      kind = document.createElement('select'); kind.className = 'control control-sm';
      for (const [k, l] of [['items', 'Shared tasks done here'], ['done', 'Tasks each of us does (counts only, nothing else shared)'], ['focus', 'Focus minutes (counts only)'], ['custom', 'Tick it by hand']]) kind.appendChild(new Option(l, k));
      f('What counts', kind);
      target = document.createElement('input'); target.type = 'number'; target.min = '1'; target.max = '10000'; target.value = '20'; target.className = 'control control-sm'; f('Together, reach', target);
      to = document.createElement('input'); to.type = 'date'; to.className = 'control control-sm'; to.value = wk.to; f('Until', to);
    },
    actions: [{ label: 'Cancel' }, { label: 'Start quest', primary: true, run: () => {
      const n = Math.max(1, Math.min(10000, Math.round(Number(target.value) || 0)));
      const tt = title.value.trim() || 'Team quest';
      tgEdit(spaceId, [{ op: 'set', path: ['quests', tgNewId('q')], value: { title: tt.slice(0, 120), kind: kind.value, target: n, from: todayStr(), to: to.value || wk.to, by: tgMe(), at: Date.now(), progress: {} } }], { toast: 'Quest started: everyone can count themselves in', icon: 'target' });
    } }],
  });
}
function tgGoalDialog(spaceId) {
  const v = tgVal(spaceId);
  let title, buddy;
  openDialog({
    title: 'A goal with a buddy', width: 460,
    body: (el) => {
      const f = (label, inp) => { const l = tgEl('label', 'field'); l.append(tgEl('span', 'field-label', label), inp); el.appendChild(l); };
      title = document.createElement('input'); title.className = 'control'; title.maxLength = 200; title.placeholder = 'Write 500 words a day'; title.setAttribute('autofocus', ''); f('Goal', title);
      buddy = document.createElement('select'); buddy.className = 'control control-sm';
      buddy.appendChild(new Option('No buddy', ''));
      for (const m of tgMembers(v).filter(x => x !== tgMe())) buddy.appendChild(new Option(tgName(m, v), m));
      if (buddy.options.length > 1) buddy.selectedIndex = 1;
      f('Buddy (sees your daily check-in and can nudge you)', buddy);
    },
    actions: [{ label: 'Cancel' }, { label: 'Add goal', primary: true, run: () => {
      const tt = title.value.trim(); if (!tt) return false;
      tgEdit(spaceId, [{ op: 'set', path: ['goals', tgNewId('g')], value: { title: tt.slice(0, 200), buddy: buddy.value || null, period: 'day', target: 1, by: tgMe(), at: Date.now(), checks: {} } }], { toast: 'Goal added: check in each day', icon: 'target' });
    } }],
  });
}

/* ---------- the feed ---------- */
const TG_FEED_ICON = { done: 'circle-check', cheer: 'handshake', join: 'user-plus', quest: 'target', trophy: 'trophy', note: 'message-square', focus: 'timer', goal: 'target', expense: 'receipt', plan: 'notebook-pen' };
function _tgFeedText(e, v) {
  const t = String(e.text || '');
  switch (e.kind) {
    case 'done': return `did “${t}”`;
    case 'join': return 'joined';
    case 'quest': return `finished the quest “${t}”`;
    case 'trophy': return `won “${t}”`;
    case 'goal': return `hit their goal: ${t}`;
    case 'expense': return `paid ${t}`;
    default: return t;
  }
}
function tgRenderFeed(body, sp, ro) {
  const v = sp.value, id = sp.id, me = tgMe();
  if (!ro) {
    const add = tgEl('div', 'tg-add');
    add.insertAdjacentHTML('beforeend', icon('message-square'));
    add.appendChild(tgInput('feed:' + id, { placeholder: 'Say something to everyone here… (Enter)', max: 200, aria: 'New feed line', onEnter: (val, el) => { const t = String(val || '').trim(); if (!t) return; tgClearDraft('feed:' + id); el.value = ''; tgEdit(id, tgFeedOps(id, 'note', t, null), { undo: true, toast: 'Posted', icon: 'message-square' }); } }));
    body.appendChild(add);
  }
  const list = (v.feed || []).slice().sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 200);
  if (!list.length) { body.appendChild(tgEl('p', 'muted tg-pad', 'What everyone does here shows up in the feed: tasks done, quests, trophies, notes.')); return; }
  const wrap = tgEl('div', 'tg-feed');
  for (const e of list) {
    const r = tgEl('div', 'tg-feed-row');
    r.appendChild(tgAvatarEl(e.by, 'sm', v));
    const b = tgEl('div', 'tg-feed-b');
    const line = tgEl('div');
    line.insertAdjacentHTML('beforeend', icon(TG_FEED_ICON[e.kind] || 'circle-dot', 'i-xs'));
    line.append(tgEl('b', '', ' ' + tgFirst(e.by, v) + ' '), document.createTextNode(_tgFeedText(e, v)));
    b.appendChild(line);
    const meta = tgEl('div', 'muted tg-sm');
    meta.textContent = tgAgo(e.at || 0);
    const ch = Object.keys(e.cheers || {});
    if (ch.length) meta.textContent += ` · 🙌 ${ch.length}`;
    b.appendChild(meta);
    r.appendChild(b);
    if (!ro && e.by !== me && tgPref('cheers') && !(e.cheers && e.cheers[me])) r.appendChild(tgIconBtn('handshake', `High-five ${tgFirst(e.by, v)}`, () => { tgEdit(id, [{ op: 'set', path: ['feed', e.id, 'cheers', me], value: Date.now() }], { undo: false, toast: 'High-five sent', icon: 'handshake' }); tgSendCheer(e.by, e.ref || e.id, '🙌'); }));
    if (!ro && e.by === me) r.appendChild(tgIconBtn('x', 'Delete', () => tgEdit(id, [{ op: 'del', path: ['feed', e.id] }], { toast: 'Deleted', icon: 'trash-2' })));
    wrap.appendChild(r);
  }
  body.appendChild(wrap);
}

/* ---------- the hub: challenges, trophies, leaderboard ---------- */
function tgHubGame(root) {
  if (!tgChannel()) return;
  const me = tgMe();
  const active = [];
  const trophies = [];
  for (const sp of tgSpaces()) {
    for (const c of sp.value.challenges || []) { if (c.winner === me) trophies.push({ sp, c }); else if (!c.closed) active.push({ sp, c }); }
    for (const q of sp.value.quests || []) if (!q.done) active.push({ sp, q });
  }
  if (active.length) {
    const sec = tgSection(root, 'Quests and challenges', 'target', active.length);
    for (const a of active.slice(0, 8)) {
      const r = tgEl('button', 'tg-row'); r.type = 'button';
      r.insertAdjacentHTML('beforeend', icon(a.q ? 'target' : 'trophy'));
      r.appendChild(tgEl('span', 'tg-row-t', (a.q || a.c).title || 'Quest'));
      r.appendChild(tgEl('span', 'muted tg-sm', tgSpaceName(a.sp)));
      r.onclick = () => setView(`together:${a.sp.id}:quests`);
      sec.appendChild(r);
    }
  }
  if (trophies.length) {
    const sec = tgSection(root, 'Your trophies', 'trophy', trophies.length);
    const shelf = tgEl('div', 'tg-shelf');
    for (const t of trophies.slice(0, 30)) { const c = tgEl('span', 'tg-trophy'); c.insertAdjacentHTML('beforeend', icon('trophy')); c.appendChild(tgEl('span', '', t.c.title || 'Trophy')); c.title = tgSpaceName(t.sp); shelf.appendChild(c); }
    sec.appendChild(shelf);
  }
  if (tgPref('leaderboard')) {
    const sec = tgSection(root, 'This week', 'chart-column', 0);
    const rows = [];
    const s = typeof gameStats === 'function' ? gameStats() : null;
    rows.push({ fid: me, xp: s ? s.xp.week : 0 });
    for (const f of tgFriends()) {
      let g = f.game || null;
      // What they share of their game (the Friends tab's view of them: share:game, only if they chose to share it).
      try { if (!g && typeof Friends !== 'undefined' && Friends && typeof Friends.get === 'function') { const fv = Friends.get(f.id); const x = fv && fv.game; g = x && typeof x === 'object' ? (x.b && typeof x.b === 'object' ? x.b : x) : null; } } catch (e) { /* not shared */ }
      if (g && Number.isFinite(Number(g.xpWeek))) rows.push({ fid: f.id, xp: Math.max(0, Math.round(Number(g.xpWeek))) });
    }
    rows.sort((a, b) => b.xp - a.xp);
    rows.forEach((r, i) => {
      const el = tgEl('div', 'tg-rank' + (r.fid === me ? ' is-me' : ''));
      el.append(tgEl('span', 'tg-rank-n', String(i + 1)), tgAvatarEl(r.fid, 'sm'), tgEl('span', 'tg-row-t', r.fid === me ? 'You' : tgName(r.fid)), tgEl('b', '', `${r.xp} XP`));
      sec.appendChild(el);
    });
    if (rows.length < 2) sec.appendChild(tgEl('p', 'muted tg-sm', 'Friends who share their game with you show here. Everyone chooses for themselves in Friends.'));
  }
}
