/* ============================================================
   SETTINGS > Sync > Advanced > "Runs Claude jobs": where Claude work runs (owner: Sync).
   Server: server/routes/claude-host.mjs (lib/remote-jobs.mjs,
   lib/sync/claude-host.mjs). settingsClaudeHostCard(el) is called by
   58-settings-sync.js.
     Run Claude on   <host> first, then this computer (default)
                     This computer only
                     Only <host>
     Claude host     which computer it is (every device uses the same one;
                     "Same as the main computer" until one is picked)
   The status line says it in plain words: "Claude: using Home laptop",
   "Home laptop is off: using this computer". claudeHostLine and
   claudeHostModeLabel are pure.
   ============================================================ */
let _chSt = null, _chLoading = false, _chBusy = false, _chTicker = null;

/** {tone: ok|warn|idle, text} for the status line. */
function claudeHostLine(st) {
  if (!st) return { tone: 'idle', text: 'Reading...' };
  const r = st.route || {};
  const text = r.text || 'Claude: using this computer';
  if (r.run === 'off' || (r.run === 'other' && !st.here)) return { tone: 'warn', text };
  if (r.why === 'host-off') return { tone: 'idle', text };   // asleep or off is normal: grey, never amber (L20)
  return { tone: 'ok', text };
}
/** The words of each "Run Claude on" choice. */
function claudeHostModeLabel(mode, st) {
  const h = st && st.host ? st.host : null;
  const name = h ? (h.me ? 'this computer' : h.name) : 'the main computer';
  if (mode === 'local') return 'This computer only' + (st && !st.here ? ' (Claude is not set up here)' : '');
  if (mode === 'host-only') return 'Only ' + name;
  return h && h.me ? 'This computer (it runs Claude jobs)' : name.charAt(0).toUpperCase() + name.slice(1) + ' first, then this one';
}

function _chLoad(force) {
  if (_chLoading || (_chSt && !force)) return;
  _chLoading = true;
  fetch('/api/claude-host', { cache: 'no-store' }).then(r => r.json()).then(j => { _chSt = j && j.route ? j : { error: true }; }).catch(() => { _chSt = { error: true }; })
    .finally(() => { _chLoading = false; if (state.view === 'settings:sync') renderMain(); });
}
async function _chPost(body, okMsg) {
  if (_chBusy) return;
  _chBusy = true;
  try {
    const r = await fetch('/api/claude-host', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status);
    _chSt = j;
    if (okMsg) toast(okMsg, { kind: 'ok' });
  } catch (e) { toast(e.message, { kind: 'err' }); }
  _chBusy = false;
  if (state.view === 'settings:sync') renderMain();
}

function settingsClaudeHostCard(el) {
  _chLoad(false);
  const s = _chSt;
  const c = _settingsCard('Runs Claude jobs', 'The main computer while it\'s on; otherwise this one.');
  el.appendChild(c.card);
  const p = (text) => Object.assign(document.createElement('p'), { className: 'set-h', textContent: text });
  if (!s) { c.body.appendChild(p('Loading…')); return; }
  if (s.error) { c.body.appendChild(p("OpenDash isn't answering.")); return; }
  const line = document.createElement('div'); line.setAttribute('role', 'status');
  const l = claudeHostLine(s);
  line.className = 'sync-status sync-' + l.tone; line.textContent = l.text;
  c.body.appendChild(_settingsRow('Status', '', line));
  // Keep the line current while the page is open (the host may go off or come back): text only.
  clearInterval(_chTicker);
  _chTicker = setInterval(() => {
    if (!document.body.contains(line)) { clearInterval(_chTicker); _chTicker = null; return; }
    fetch('/api/claude-host', { cache: 'no-store' }).then(r => r.json()).then((j) => {
      if (!j || !j.route) return;
      _chSt = j;
      const n = claudeHostLine(j);
      line.className = 'sync-status sync-' + n.tone; line.textContent = n.text;
    }).catch(() => {});
  }, 10000);
  if (!s.sync) { c.body.appendChild(p('Turn on Sync across my devices (above) to use Claude from your other computers.')); return; }
  // Run Claude on (this computer's own choice)
  const mode = document.createElement('select'); mode.className = 'control control-sm'; mode.disabled = _chBusy;
  mode.setAttribute('aria-label', 'Run Claude on');
  for (const m of s.modes || ['host-first', 'local', 'host-only']) {
    const o = document.createElement('option'); o.value = m; o.textContent = claudeHostModeLabel(m, s);
    if (m === 'local' && !s.here && s.mode !== 'local') o.disabled = true;
    mode.appendChild(o);
  }
  mode.value = s.mode || 'host-first';
  mode.onchange = () => _chPost({ mode: mode.value }, 'Saved');
  c.body.appendChild(_settingsRow('Run Claude on', 'For this computer only.', mode));
  // Claude host (the same for every device)
  const hosts = s.hosts || [];
  const pick = document.createElement('select'); pick.className = 'control control-sm'; pick.disabled = _chBusy;
  pick.setAttribute('aria-label', 'Claude computer');
  const same = document.createElement('option'); same.value = 'main'; same.textContent = 'Same as the main computer' + (s.main ? ' (' + s.main + ')' : ''); pick.appendChild(same);
  for (const h of hosts) { const o = document.createElement('option'); o.value = h.id; o.textContent = h.name + (h.online ? '' : ' (asleep)'); pick.appendChild(o); }
  const cur = s.chosen ? hosts.find(h => h.host) : null;
  pick.value = cur ? cur.id : 'main';
  pick.onchange = () => _chPost({ host: pick.value }, pick.value === 'main' ? 'The main computer runs Claude jobs' : 'Saved: that computer runs Claude jobs');
  c.body.appendChild(_settingsRow('Claude computer', hosts.length ? '' : 'Set up Claude in Connections on the computer that should do it.', pick));
}
