/* ============================================================
   COMMAND PALETTE (Ctrl/Cmd+K, the sidebar search button)
   Owner: Command bar / quick add / assistant.
   One search box over tasks, places (sections, views, streams, tags,
   people) and commands, with fuzzy matching ("prsub" finds "Project
   submission", "ps" finds "Paper submission"). Prefixes narrow it down:
     >  commands     #  tags     @  people     ?  ask the assistant
   "G then a letter" jumps are shown next to the places they open.
   Modules add commands with:
     registerCommand({ id, label, icon, group, keywords, kbd, run, when })
       group: 'Commands' (default) | 'Go to' | any label; when(): show only if true
   The More-menu items (registerMoreItem) are included automatically.
   ============================================================ */
const PALETTE_COMMANDS = [];
function registerCommand(def) {
  if (!def || !def.id || typeof def.run !== 'function') throw new Error('registerCommand needs {id, run}');
  const i = PALETTE_COMMANDS.findIndex(c => c.id === def.id);
  const c = Object.assign({ group: 'Commands', icon: 'zap', keywords: '' }, def);
  if (i >= 0) PALETTE_COMMANDS[i] = c; else PALETTE_COMMANDS.push(c);
}
// Extra searchable things from other modules (e.g. Files & links, 63-resources.js):
// registerPaletteSource((add, mode) => add({group, icon, label, keywords, hint, run})). mode: '' | 'go' | 'people' | 'tags' | 'cmd'.
const PALETTE_SOURCES = [];
function registerPaletteSource(fn) { if (typeof fn === 'function') PALETTE_SOURCES.push(fn); }

let _paletteClose = null;
const PALETTE_GROUP_ORDER = ['Assistant', 'Tasks', 'Go to', 'People', 'Tags', 'Files', 'Commands'];
const _PAL_SCOPES = [['', 'Everything', 'search'], ['>', 'Commands', 'zap'], ['#', 'Tags', 'hash'], ['@', 'People', 'at-sign'], ['?', 'Ask', 'sparkles']];
// The "G then a letter" jumps (90-wiring.js), shown as hints.
const _PAL_G = { home: 'G H', today: 'G T', week: 'G U', all: 'G A', calendar: 'G C', finance: 'G F', people: 'G P', settings: 'G S', bin: 'G B', completed: 'G L' };

/** Subsequence match with bonuses for word starts and runs. 0 = no match; at most 28. */
function _palFuzzy(text, q) {
  const t = String(text || '').toLowerCase();
  const qq = q.replace(/\s+/g, '');
  if (qq.length < 2) return 0;
  // Acronyms: "ps" -> "Paper submission"
  const initials = t.split(/[\s\-_/#@:().,]+/).filter(Boolean).map(w => w[0]).join('');
  if (qq.length >= 2 && initials.startsWith(qq)) return 28;
  if (qq.length < 3) return 0;
  // The query is read as pieces of words: each letter either continues the
  // current piece or starts a new piece at the beginning of a later word.
  // "thsub" -> TH-esis SUB-mission. Scattered letters ("paper" in
  // "preferences ... appearance") do not match.
  const isStart = (i) => i === 0 || /[\s\-_/#@:().,]/.test(t[i - 1]);
  let ti = -1, pieces = 0;
  for (const ch of qq) {
    if (ti >= 0 && t[ti + 1] === ch) { ti++; continue; }
    let at = ti + 1;
    while (at < t.length && !(t[at] === ch && isStart(at))) at++;
    if (at >= t.length) return 0;
    ti = at; pieces++;
  }
  // Fewer pieces = a better match; at most 25 so substring hits always rank first.
  return Math.max(1, Math.min(25, 26 - pieces * 4 - Math.floor(ti / 20)));
}
/** Score `text` against query `q` (lower-case). 0 = no match. */
function _palScore(text, q) {
  if (!q) return 1;
  const t = String(text || '').toLowerCase();
  const i = t.indexOf(q);
  if (i === 0) return 100 - Math.min(t.length, 60) / 10;
  if (i > 0) return (/[\s\-_/#@:(]/.test(t[i - 1]) ? 70 : 40) - Math.min(i, 30) / 10;
  // all words present
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every(w => t.includes(w))) return 30;
  return _palFuzzy(t, q);
}
/** Keywords match only by word start (no fuzzy letters: "paper" must not find "appearance"). */
function _palKwScore(keywords, q) {
  if (!q) return 0;
  const words = String(keywords || '').toLowerCase().split(/[\s,]+/).filter(Boolean);
  const qs = q.split(/\s+/).filter(Boolean);
  return qs.length && qs.every(x => words.some(w => w.startsWith(x))) ? 35 : 0;
}
/** Escaped label with the match wrapped in <mark> (the substring, or the fuzzy letters). */
function _palHighlight(text, q) {
  const s = String(text || '');
  if (!q) return esc(s);
  const low = s.toLowerCase();
  const i = low.indexOf(q);
  if (i >= 0) return esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + q.length)) + '</mark>' + esc(s.slice(i + q.length));
  const words = q.split(/\s+/).filter(Boolean);
  const marks = new Array(s.length).fill(false);
  if (words.length > 1 && words.every(w => low.includes(w))) {
    for (const w of words) { const at = low.indexOf(w); for (let k = 0; k < w.length; k++) marks[at + k] = true; }
  } else if (_palFuzzy(low, q) > 0) {
    let ti = 0;
    for (const ch of q.replace(/\s+/g, '')) { const at = low.indexOf(ch, ti); if (at < 0) break; marks[at] = true; ti = at + 1; }
  } else return esc(s);
  let out = '', open = false;
  for (let k = 0; k < s.length; k++) {
    if (marks[k] && !open) { out += '<mark>'; open = true; }
    if (!marks[k] && open) { out += '</mark>'; open = false; }
    out += esc(s[k]);
  }
  return out + (open ? '</mark>' : '');
}

function _palOpenCounts() {
  const byStream = {}, byTag = {}, byPerson = {};
  for (const i of getAllItems()) {
    if (statusOf(i.id) === 'done') continue;
    byStream[effStream(i)] = (byStream[effStream(i)] || 0) + 1;
    for (const t of effTags(i)) byTag[t] = (byTag[t] || 0) + 1;
    if (typeof effPeople === 'function') for (const p of effPeople(i)) byPerson[p] = (byPerson[p] || 0) + 1;
  }
  return { byStream, byTag, byPerson };
}

function _palSources(mode) {
  const out = [];
  const add = (o) => out.push(o);
  const counts = _palOpenCounts();
  if (mode === '' || mode === 'go') {
    for (const t of SHELL_TILES.filter(_tileEnabled)) {
      const v = typeof t.view === 'function' ? t.view() : t.view;
      add({ group: 'Go to', icon: t.icon, label: t.label, keywords: 'section', kbd: _PAL_G[t.id === 'tasks' ? 'today' : t.id], run: () => setView(v) });
    }
    const views = [['today', 'Today', 'sun'], ['week', 'Upcoming', 'calendar-range'], ['tomorrow', 'Tomorrow', 'sunrise'],
      ['all', 'All tasks', 'layers'], ['no-date', 'No date', 'circle-dashed'], ['completed', 'Logbook', 'circle-check'],
      ['wins', 'Wins', 'trophy'], ['triage', 'Email triage', 'mail'], ['people', 'People', 'users'], ['tags', 'Tags', 'tags'],
      ['bin', 'Bin', 'trash-2'], ['settings', 'Settings', 'settings'], ['connections', 'Connections', 'plug']];
    for (const [v, label, ic] of views) add({ group: 'Go to', icon: ic, label, hint: 'View', kbd: _PAL_G[v], run: () => setView(v) });
    for (const [k, s] of Object.entries(STREAMS)) {
      if (s.archived) continue;
      const n = counts.byStream[k] || 0;
      add({ group: 'Go to', dot: s.color, markHtml: streamMarkHtml(k), label: s.label, keywords: k, hint: n ? `${n} open` : 'Stream', weight: n, run: () => setView('stream:' + k) });
    }
  }
  if (mode === '' || mode === 'people') {
    for (const p of (state.people || [])) {
      const n = counts.byPerson[p.id] || 0;
      add({ group: 'People', avatar: p, label: p.name, keywords: [p.role, p.email, p.id, ...(p.aliases || [])].filter(Boolean).join(' '),
        hint: [p.role || '', n ? `${n} open` : ''].filter(Boolean).join(' · '), weight: n, run: () => setView('person:' + p.id) });
    }
  }
  if (mode === '' || mode === 'tags') {
    // Mixed results list tags under "Go to" (as in the approved mockup); "#" gives them their own group.
    for (const [t, n] of Object.entries(counts.byTag)) add({ group: mode === 'tags' ? 'Tags' : 'Go to', icon: 'hash', label: t, hint: `${n} open`, weight: n, run: () => setView('tag:' + t) });
  }
  for (const fn of PALETTE_SOURCES) { try { fn(add, mode); } catch (e) { console.error('[palette source]', e); } }
  if (mode === '' || mode === 'cmd') {
    const seen = new Set();
    const norm = (s) => String(s || '').toLowerCase().replace(/[…."“”]/g, '').trim();
    for (const c of PALETTE_COMMANDS) {
      try { if (c.when && !c.when()) continue; } catch (e) { continue; }
      const label = typeof c.label === 'function' ? c.label() : c.label;
      seen.add(norm(label));
      add({ group: c.group, icon: c.icon, label, keywords: c.keywords, kbd: c.kbd, run: c.run });
    }
    for (const m of MORE_ITEMS) {
      try { if (m.hidden && (typeof m.hidden === 'function' ? m.hidden() : m.hidden)) continue; } catch (e) { continue; }
      if (PALETTE_COMMANDS.some(c => c.id === m.id)) continue;
      // The same action registered twice (a command and a More item): list it once.
      const ml = norm(typeof m.label === 'function' ? m.label() : m.label);
      if (seen.has(ml) || (m.id === 'assistant' && PALETTE_COMMANDS.some(c => c.id === 'ask-assistant'))) continue;
      let dis = false;
      try { dis = typeof m.disabled === 'function' ? m.disabled() : !!m.disabled; } catch (e) { dis = false; }
      if (dis) continue;
      const chk = typeof m.checked === 'function' ? m.checked() : m.checked;
      add({ group: 'Commands', icon: m.icon, label: typeof m.label === 'function' ? m.label() : m.label, kbd: m.kbd, hint: chk === undefined ? '' : (chk ? 'On' : 'Off'), run: m.run });
    }
  }
  return out;
}

/** Task meta for a result row: stream dot + label, due date (coloured when soon). Trusted markup. */
function _palTaskMeta(it) {
  const st = STREAMS[effStream(it)];
  const due = effDate(it);
  let h = '';
  if (st) h += `<span class="pal-stream">${streamMarkHtml(effStream(it))}${esc(st.label)}</span>`;
  const done = statusOf(it.id) === 'done';
  h += done ? `<span class="pal-due none">Done</span>`
    : `<span class="pal-due ${escAttr(due ? _palDueClass(due) : 'none')}">${esc(_palDueText(due))}</span>`;
  return h;
}
/** Due colour in results: overdue / today, and "soon" for the next six days (a week today is plain, as in the mockup). */
function _palDueClass(due) {
  const n = daysUntil(due);
  if (n === null) return '';
  return n < 0 ? 'overdue' : n === 0 ? 'today' : n < 7 ? 'soon' : '';
}
/** "Thu 8 Oct" for coming dates (as in the mockup), "Today"/"Tomorrow", "3d ago" when overdue. */
function _palDueText(due) {
  if (!due) return 'No date';
  const n = daysUntil(due);
  if (n === null || n < 0 || n === 0 || n === 1) return dueLabel(due);
  const [y, m, d] = due.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const o = { weekday: 'short', day: 'numeric', month: 'short' };
  if (y !== new Date().getFullYear()) o.year = 'numeric';
  try { return dt.toLocaleDateString(APP_CONFIG.locale || undefined, o); } catch (e) { return dueLabel(due); }
}

function _palResults(raw) {
  let q = raw.trim();
  let mode = '';
  if (q.startsWith('>')) { mode = 'cmd'; q = q.slice(1).trim(); }
  else if (q.startsWith('#')) { mode = 'tags'; q = q.slice(1).trim(); }
  else if (q.startsWith('@')) { mode = 'people'; q = q.slice(1).trim(); }
  else if (q.startsWith('?')) { mode = 'ask'; q = q.slice(1).trim(); }
  const ql = q.toLowerCase();
  const groups = new Map();
  const shown = new Set();   // the same place registered twice (a view and a command) is listed once
  const push = (g, item) => {
    const k = g + '|' + String(item.label).toLowerCase();
    if (!item.taskId && shown.has(k)) return;
    shown.add(k);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(item);
  };

  if (mode === 'ask') {
    const ready = typeof assistantReady === 'function' ? assistantReady() : false;
    push('Assistant', {
      icon: 'sparkles', label: q ? `Ask: “${q}”` : 'Ask the assistant anything about your tasks',
      hint: ready ? (q ? 'Enter to send' : 'e.g. “what is due this week?”') : 'Connect Claude first',
      run: () => openAssistant({ message: q, send: !!q }),
    });
    return { groups: [...groups.entries()].map(([group, items]) => ({ group, items })), q: '' };
  }

  // Tasks (only with a query and no prefix)
  let topTask = null;
  if (mode === '' && ql) {
    const hits = [];
    for (const it of getAllItems()) {
      const s = Math.max(_palScore(effTitle(it), ql), _palKwScore(effTags(it).join(' '), ql) * 0.6);
      // Among similar matches, what is due soonest comes first (overdue highest).
      const dd = typeof daysUntil === 'function' ? daysUntil(effDate(it)) : null;
      const soon = dd === null ? 0 : dd < 0 ? 5 : dd <= 30 ? (30 - dd) / 5 : 0;
      if (s > 0) hits.push({ it, s: s + (statusOf(it.id) === 'done' ? -60 : soon) + (isPinned(it.id) ? 2 : 0) });
    }
    hits.sort((a, b) => b.s - a.s);
    // A balanced list (as in the mockup): a few tasks when places or people match too.
    const others = _palSources('').some(o => o.group !== 'Commands' && Math.max(_palScore(o.label, ql), o.keywords ? _palKwScore(o.keywords, ql) : 0) > 0);
    const cap = others ? 3 : 7;
    for (const { it } of hits.slice(0, cap)) {
      push('Tasks', {
        check: effPriority(it), done: statusOf(it.id) === 'done', label: effTitle(it), metaHtml: _palTaskMeta(it), taskId: it.id,
        // Enter: go to the list the task lives in and open it. Ctrl+Enter ("open beside"): open its detail here.
        // Centre-card mode: the card opens over the page you are on (61-task-card.js).
        run: () => {
          // the card opens over this page; an open side panel takes the task in place
          if (typeof openTask === 'function' && typeof itemOpenTarget === 'function' && (itemOpenTarget() === 'card' || (typeof detailPaneOpen === 'function' && detailPaneOpen()))) { openTask(it.id); return; }
          const here = isTaskView(state.view) && typeof matchesView === 'function' && matchesView(it, state.view);
          if (!here) setView(typeof homeViewForTask === 'function' ? homeViewForTask(it) : 'all');
          selectTask(it.id);
        },
        runBeside: () => (typeof openTask === 'function' ? openTask(it.id, { mode: 'panel' }) : selectTask(it.id)),
      });
    }
    if (hits.length > cap) {
      push('Tasks', { icon: 'list-filter', label: `All ${hits.length} matching tasks`, hint: 'Search in All tasks', run: () => {
        setView('all');
        searchQuery = q;
        const si = document.getElementById('search-input'); if (si) si.value = q;
        renderMain();
      } });
    }
    topTask = hits.length ? hits[0].it : null;
  }
  const src = _palSources(mode === 'cmd' ? 'cmd' : mode === 'tags' ? 'tags' : mode === 'people' ? 'people' : '');
  // Near-duplicate tags that match (the tag rules of 27-tags-logic.js): offered as one "Merge tags" command
  // below, so "Go to" lists only the tag they would merge into (as in the mockup).
  let mergeG = null;
  if (mode === '' && ql.length >= 3 && typeof tglSimilar === 'function') {
    let groupsT = [];
    try { groupsT = tglSimilar(state); } catch (e) { groupsT = []; }
    mergeG = groupsT.find(x => [x.into, ...x.from].some(t => t.includes(ql.replace(/^#/, '')))) || null;
  }
  const scored = [];
  for (const o of src) {
    if (mergeG && o.group === 'Go to' && o.icon === 'hash' && mergeG.from.includes(o.label)) continue;
    const s = Math.max(_palScore(o.label, ql), o.keywords ? _palKwScore(o.keywords, ql) : 0);
    if (ql && s <= 0) continue;
    scored.push({ o, s: s + (o.weight ? Math.min(o.weight, 20) / 10 : 0) });
  }
  // Empty query: a short, useful starting list rather than everything.
  if (!ql && mode === '') {
    const pick = (g, n) => scored.filter(x => x.o.group === g).slice(0, n);
    for (const x of [...pick('Go to', 8), ...pick('Commands', 6)]) push(x.o.group, x.o);
  } else {
    scored.sort((a, b) => b.s - a.s);
    const per = {};
    for (const { o } of scored) {
      per[o.group] = (per[o.group] || 0) + 1;
      if (per[o.group] > (mode ? 30 : 6)) continue;
      push(o.group, o);
    }
  }
  if (mode === '' && ql) {
    // "New task in <stream>", "Filter this list" for task views, "New task “…”", and asking the assistant.
    const streamHit = Object.entries(STREAMS).find(([k, s]) => !s.archived && _palScore(s.label, ql) >= 60);
    if (streamHit) push('Commands', { icon: 'plus', label: `New task in ${streamHit[1].label}`, kbd: 'Q', run: () => openNewTask('+' + streamHit[0] + ' ') });
    // The specific suggestions (countdown, tag merge) come first, as in the mockup; the generic ones after them.
    // A dated task that matched: offer it as a top-bar countdown (unless one with that name exists).
    const tt = topTask && statusOf(topTask.id) !== 'done' ? topTask : null;
    const td = tt ? effDate(tt) : null;
    if (tt && td && daysUntil(td) > 0 && !(state.countdowns || []).some(c => String(c.label || '').toLowerCase() === effTitle(tt).toLowerCase())) {
      const label = effTitle(tt).slice(0, 60);
      push('Commands', { icon: 'hourglass', label: `Add countdown “${label}”`, hint: dueLabel(td),
        run: () => paletteApplyOps([{ op: 'countdown.create', label, date: td }], { done: 'Countdown added' }) });
    }
    // Near-duplicate tags that match: offer to merge them (found above).
    {
      const g = mergeG;
      if (g) {
        const all = [g.into, ...g.from];
        const list = all.length > 1 ? all.slice(0, -1).join(', ') + ' and ' + all[all.length - 1] : all[0];
        push('Commands', { icon: 'tags', label: `Merge tags ${list}`, hint: `into #${g.into}`,
          run: () => paletteApplyOps([{ op: 'tag.merge', from: g.from, into: g.into }], { done: `Merged into #${g.into}`, confirmTitle: `Merge ${all.length} tags into #${g.into}?` }) });
      }
    }
    if (typeof isTaskView === 'function' && isTaskView(state.view)) {
      push('Commands', { icon: 'list-filter', label: `Filter this list for “${q}”`, run: () => {
        const si = document.getElementById('search-input'); if (si) si.value = q;
        searchQuery = q; renderMain();
      } });
    }
    push('Commands', { icon: 'plus', label: `New task “${q}”`, run: () => openNewTask(q) });
    if (ql.length >= 3) push('Assistant', { icon: 'sparkles', label: `Ask the assistant: “${q}”`, hint: typeof assistantReady === 'function' && !assistantReady() ? 'Connect Claude first' : '', run: () => openAssistant({ message: q, send: true }) });
  }
  const ordered = [];
  const names = [...groups.keys()].sort((a, b) => {
    const ia = PALETTE_GROUP_ORDER.indexOf(a), ib = PALETTE_GROUP_ORDER.indexOf(b);
    // The assistant row goes last unless the user asked for it with "?".
    const ra = a === 'Assistant' ? 98 : (ia < 0 ? 97 : ia), rb = b === 'Assistant' ? 98 : (ib < 0 ? 97 : ib);
    return ra - rb;
  });
  for (const g of names) ordered.push({ group: g, items: groups.get(g) });
  return { groups: ordered, q: ql };
}

function openCommandPalette(initial) {
  if (_paletteClose) { _paletteClose(); return; }
  closePopovers();
  const scrim = document.createElement('div'); scrim.className = 'scrim cmd-scrim';
  const box = document.createElement('div'); box.className = 'cmd'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Command palette');
  box.innerHTML = `
    <div class="cmd-in">${icon('search')}<input class="q" type="text" placeholder="Search tasks, jump anywhere, run a command, or ? to ask…" aria-label="Search" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="cmd-list" /><button type="button" class="cmd-scope" aria-haspopup="menu"><span class="lbl">Everything</span>${icon('chevron-down', 'i-xs')}</button></div>
    <div class="cmd-list" id="cmd-list" role="listbox"></div>
    <div class="cmd-f">
      <span class="k"><span class="kbd-group"><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd></span>Move</span>
      <span class="k"><kbd class="kbd">↵</kbd>Open</span>
      <span class="k"><span class="kbd-group"><kbd class="kbd">Ctrl</kbd><kbd class="kbd">↵</kbd></span>Open beside</span>
      <span class="spacer"></span>
      <span class="k">Type <kbd class="kbd">&gt;</kbd>commands <kbd class="kbd">#</kbd>tags <kbd class="kbd">@</kbd>people <kbd class="kbd">?</kbd>ask</span>
    </div>`;
  const input = box.querySelector('input');
  const list = box.querySelector('.cmd-list');
  const scope = box.querySelector('.cmd-scope');
  let flat = [], cur = 0;
  const prevFocus = document.activeElement;

  function paint() {
    const v = input.value;
    const sc = _PAL_SCOPES.find(s => s[0] && v.startsWith(s[0])) || _PAL_SCOPES[0];
    scope.querySelector('.lbl').textContent = sc[1];
    box.classList.toggle('is-ask', sc[0] === '?');
    const { groups, q } = _palResults(v);
    list.innerHTML = '';
    flat = [];
    for (const g of groups) {
      const h = document.createElement('div'); h.className = 'cmd-g'; h.textContent = g.group; h.setAttribute('role', 'presentation'); list.appendChild(h);
      for (const it of g.items) {
        const row = document.createElement('div');
        row.className = 'cmd-item'; row.setAttribute('role', 'option'); row.id = 'cmd-opt-' + flat.length;
        let lead;
        if (it.check) lead = `<span class="ico"><span class="check check-sm ${escAttr(it.check)}${it.done ? ' done' : ''}">${it.done ? icon('check') : ''}</span></span>`;
        else if (it.avatar) lead = `<span class="ico">${avatarHtml(it.avatar, 18)}</span>`;
        else if (it.markHtml) lead = `<span class="ico">${it.markHtml}</span>`;   // a stream's marker (28-customise.js), already escaped
        else if (it.dot) lead = `<span class="ico"><span class="dot" style="--c:${escAttr(safeColor(it.dot))}"></span></span>`;
        else lead = `<span class="ico">${icon(it.icon || 'circle')}</span>`;
        const meta = it.metaHtml || (it.hint ? esc(it.hint) : '');
        row.innerHTML = lead + `<span class="lbl">${_palHighlight(it.label, q)}</span>`
          + (meta || it.kbd ? `<span class="meta">${meta}${it.kbd ? `<span class="kbd-group">${String(it.kbd).split(/[+ ]/).filter(Boolean).map(k => `<kbd class="kbd">${esc(k)}</kbd>`).join('')}</span>` : ''}</span>` : '')
          + `<span class="enter"><kbd class="kbd">↵</kbd></span>`;
        const idx = flat.length;
        row.onmousemove = () => { if (cur !== idx) { cur = idx; mark(); } };
        row.onclick = (ev) => run(idx, ev.ctrlKey || ev.metaKey);
        list.appendChild(row);
        flat.push({ it, row });
      }
    }
    if (!flat.length) {
      const e = document.createElement('div'); e.className = 'cmd-empty';
      e.textContent = 'No results. Try a different word, > for commands, or ? to ask the assistant.';
      list.appendChild(e);
    }
    cur = Math.min(cur, Math.max(0, flat.length - 1));
    mark();
  }
  function mark() {
    flat.forEach((f, i) => { f.row.classList.toggle('on', i === cur); f.row.setAttribute('aria-selected', i === cur ? 'true' : 'false'); });
    const f = flat[cur];
    if (f) { f.row.scrollIntoView({ block: 'nearest' }); input.setAttribute('aria-activedescendant', f.row.id); }
  }
  function run(i, beside) {
    const f = flat[i]; if (!f) return;
    close(true);
    const fn = beside && f.it.runBeside ? f.it.runBeside : f.it.run;
    try { const r = fn && fn(); if (r && typeof r.catch === 'function') r.catch(e => console.error('[palette]', e)); } catch (e) { console.error('[palette]', e); }
  }
  function close(ran) {
    if (!_paletteClose) return;
    _paletteClose = null;
    closePopovers();
    scrim.remove(); box.remove();
    if (!ran && prevFocus && prevFocus.focus) try { prevFocus.focus({ preventScroll: true }); } catch (e) {}
  }
  scope.onclick = () => openMenu(scope, _PAL_SCOPES.map(([p, label, ic]) => ({
    label, icon: ic, hint: p || '', run: () => {
      const bare = input.value.replace(/^[>#@?]\s*/, '');
      input.value = (p ? p + (p === '?' ? ' ' : '') : '') + bare;
      cur = 0; paint(); input.focus();
    },
  })), { align: 'end' });
  input.addEventListener('input', () => { cur = 0; paint(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (flat.length) { cur = (cur + 1) % flat.length; mark(); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (flat.length) { cur = (cur - 1 + flat.length) % flat.length; mark(); } }
    else if (e.key === 'Home' && e.ctrlKey) { e.preventDefault(); cur = 0; mark(); }
    else if (e.key === 'End' && e.ctrlKey) { e.preventDefault(); cur = Math.max(0, flat.length - 1); mark(); }
    else if (e.key === 'Enter') { e.preventDefault(); run(cur, e.ctrlKey || e.metaKey); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (document.querySelector('.pop:not([hidden])')) { closePopovers(); return; } close(false); }
    else if (e.key === 'Tab') {
      // Tab jumps to the next group's first row (Shift+Tab: previous group).
      e.preventDefault();
      if (!flat.length) return;
      const groupOf = (i) => { let n = flat[i].row.previousElementSibling; while (n && !n.classList.contains('cmd-g')) n = n.previousElementSibling; return n; };
      const g0 = groupOf(cur);
      let i = cur;
      for (let k = 0; k < flat.length; k++) {
        i = (i + (e.shiftKey ? -1 : 1) + flat.length) % flat.length;
        if (groupOf(i) !== g0) break;
      }
      if (e.shiftKey) { const gi = groupOf(i); while (i > 0 && groupOf(i - 1) === gi) i--; }
      cur = i; mark();
    }
  });
  scrim.onclick = () => close(false);
  document.body.append(scrim, box);
  if (typeof makeResizable === 'function') makeResizable(box, { key: 'palette', center: 'x', edges: ['e', 'w'], min: { w: 420 }, max: { w: 1100 } });   // width only (13-splitter.js)
  _paletteClose = () => close(false);
  input.value = initial || '';
  paint();
  setTimeout(() => { input.focus(); try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) {} }, 0);
}

/* ---------- built-in commands ---------- */
registerCommand({ id: 'new-task', label: 'New task…', icon: 'plus', kbd: 'Q', keywords: 'add create todo quick', run: () => openNewTask() });
registerCommand({ id: 'ask-assistant', label: 'Ask the assistant…', icon: 'sparkles', kbd: 'Ctrl+J', keywords: 'ai claude chat help change plan', run: () => openAssistant() });
registerCommand({ id: 'toggle-theme', label: () => state.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode', icon: 'sun-moon', kbd: 'Ctrl+Shift+D', keywords: 'theme dark light appearance',
  run: () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; saveUI(); render(); } });
registerCommand({ id: 'toggle-sidebar', label: 'Toggle sidebar', icon: 'panel-left', kbd: 'Ctrl+\\', keywords: 'hide show navigation', run: () => _shellToggleSidebar() });
registerCommand({ id: 'add-countdown', label: 'Add a countdown', icon: 'hourglass', keywords: 'deadline top bar widget new', run: () => openCountdownEditor(null) });
registerCommand({ id: 'add-person', label: 'Add a person', icon: 'user-plus', keywords: 'contact people new', run: () => addNewPerson() });
registerCommand({ id: 'undo', label: 'Undo', icon: 'undo-2', kbd: 'Ctrl+Z', run: () => undo() });
registerCommand({ id: 'redo', label: 'Redo', icon: 'redo-2', kbd: 'Ctrl+Shift+Z', run: () => redo() });
registerCommand({
  id: 'update-finances', label: 'Update finances', icon: 'refresh-cw', keywords: 'bank transactions money sync import refresh spending',
  when: () => (APP_CONFIG.features || {}).finance !== false,
  run: () => _palStartJob('/api/finance/update', {}, 'finance', 'Updating finances…', () => { if (window.FinanceView && FinanceView.refresh) FinanceView.refresh(); }),
});
registerCommand({
  id: 'update-calendar', label: 'Update calendar', icon: 'calendar-clock', keywords: 'events google sync refresh fetch',
  when: () => (APP_CONFIG.features || {}).calendar !== false,
  run: () => _palStartJob('/api/calendar/update', { force: true }, 'calendar', 'Updating your calendar…', () => { emitShell('calendar:refresh'); if (state.view === 'calendar') renderMain(); }),
});
/**
 * Run ops through the actions layer (POST /api/actions): the same validation,
 * history and undo as the assistant and MCP clients. Dangerous ops (merge,
 * bin, delete) are previewed first and need a click; the toast offers Undo.
 * Returns true when applied.
 */
async function paletteApplyOps(ops, o) {
  o = o || {};
  const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok || j.ok === false) { const e = new Error((j.error && (j.error.message || j.error)) || `HTTP ${r.status}`); e.code = j.error && j.error.code; throw e; } return j; });
  try {
    // Make sure the server has this tab's latest edits before it changes anything.
    if (typeof _persistFire === 'function' && (state._localDirty || (typeof _persistTimer !== 'undefined' && _persistTimer))) { _persistFire(); await new Promise(r => setTimeout(r, 400)); }
    const dry = await post('/api/actions', { ops, dryRun: true, source: 'ui', client: 'command palette' });
    if (dry.needsConfirm) {
      const n = (dry.preview || []).reduce((a, p) => a + ((p.changes || []).length || 1), 0);
      const ok = await confirmDialog({ title: o.confirmTitle || 'Apply this change?', text: `${n} change${n === 1 ? '' : 's'}. You can undo it afterwards.`, confirmLabel: 'Apply' });
      if (!ok) return false;
    }
    const j = await post('/api/actions', { ops, confirm: dry.confirm, source: 'ui', client: 'command palette' });
    if (typeof _asstAdopt === 'function') await _asstAdopt(j.version);
    toast(o.done || 'Done', { kind: 'ok', action: j.undo ? { label: 'Undo', run: async () => {
      try { const u = await post('/api/actions/undo', { token: j.undo, source: 'ui', client: 'command palette' }); if (typeof _asstAdopt === 'function') await _asstAdopt(u.version); }
      catch (e) { toast(e.message || 'Could not undo', { kind: 'err' }); }
    } } : undefined });
    return true;
  } catch (e) {
    toast(e.message || 'That did not work', { kind: 'err' });
    return false;
  }
}

/** Start a server-side update job, go to its section and say so. */
async function _palStartJob(url, body, view, msg, after) {
  if (state.view !== view) setView(view);
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 202 || r.status === 409 || (r.ok && !j.skipped)) toast(r.status === 409 ? 'Already updating…' : msg, { icon: 'refresh-cw' });
    else if (r.ok && j.skipped) toast('Already up to date', { kind: 'ok' });
    else toast(j.error || `Could not start the update (${r.status})`, { kind: 'err' });
  } catch (e) {
    toast('The OpenDash server is not running.', { kind: 'err' });
  }
  try { after && after(); } catch (e) { /* the section repaints itself */ }
}
