/* ============================================================
   SETTINGS > Data > "Move my data out of OneDrive" and "Undo move".
   Owner: Connections/Settings. Server: server/routes/relocate.mjs
   (lib/relocate/). settingsMoveCard(el) is called by 58-settings-data.js.
   One button, then a plain list of EVERYTHING that will happen (the dry run:
   files, every setting that changes, before -> after), then progress, then
   OpenDash starts again in the new place and the page reloads. The old folder
   is kept (renamed, with a README); Undo move puts everything back.
   ============================================================ */
let _mvInfo = null, _mvLoading = false, _mvTimer = null;

async function _mvJson(url, body) {
  const r = await fetch(url, body === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok && r.status !== 202) throw Object.assign(new Error(j.error || ('HTTP ' + r.status)), { status: r.status, body: j });
  return j;
}
function _mvLoad(force) {
  if (_mvLoading || (_mvInfo && !force)) return;
  _mvLoading = true;
  _mvJson('/api/relocate').then(j => { _mvInfo = j; }).catch(() => { _mvInfo = { error: true }; })
    .finally(() => { _mvLoading = false; if (typeof _sdRefresh === 'function') _sdRefresh(); });
}
function _mvEl(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function _mvBtn(label, ic, cls, run) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + (cls || 'btn-secondary') + ' btn-sm';
  b.innerHTML = (ic ? icon(ic) : '') + `<span>${esc(label)}</span>`; b.onclick = () => run(b); return b;
}
function _mvDate(iso) { try { return new Date(iso).toLocaleDateString(APP_CONFIG.locale || undefined, { day: 'numeric', month: 'long', year: 'numeric', timeZone: Clock.zone() }); } catch (e) { return iso; } }
const _mvBase = (p) => String(p || '').split(/[\\/]/).filter(Boolean).pop() || '';

/** The card in Settings > Data. */
function settingsMoveCard(el) {
  _mvLoad(false);
  const i = _mvInfo;
  if (!i || i.error) return;
  const job = i.job || {};
  const m = i.move;
  if (job.state === 'running') { el.appendChild(_mvProgressCard(job)); _mvPollJob(); return; }
  if (i.open && m && m.phase === 'copying') {
    const c = _settingsCard('A move was interrupted', `It started on ${_mvDate(m.createdAt)}. Nothing was switched: OpenDash still uses ${m.from.data}.`);
    c.card.classList.add('mv-card', 'mv-warn');
    const g = _mvEl('div', 'btn-group set-btns');
    g.append(_mvBtn('Finish the move', 'arrow-right', 'btn-primary', () => _mvStartJob('/api/relocate/resume', {}, m.to)),
      _mvBtn('Stop it', 'x', 'btn-ghost', async () => { try { await _mvJson('/api/relocate/cancel', {}); toast('Stopped. Your data was not changed.', { kind: 'ok' }); } catch (e) { toast(e.message, { kind: 'err' }); } _mvLoad(true); }));
    c.body.appendChild(g); el.appendChild(c.card); return;
  }
  if (i.canUndo && m) {
    const kept = m.renamed && Object.values(m.renamed)[0];
    const c = _settingsCard('Your data was moved', `On ${_mvDate(m.switchedAt || m.createdAt)}, from ${m.from.data} to ${m.to.data}.`);
    c.card.classList.add('mv-card');
    c.body.appendChild(_mvEl('p', 'set-h', kept ? `The old folder is kept, unchanged, as "${_mvBase(kept)}". Delete it yourself when you are sure everything works.` : 'The old folder is renamed and kept the next time OpenDash starts.'));
    const todo = (m.refs || []).filter(r => ['manual', 'failed', 'skipped'].includes(r.status));
    if (todo.length) {
      c.body.appendChild(_mvEl('div', 'set-t', 'Still to do by hand'));
      const ul = _mvEl('ul', 'mv-list');
      for (const r of todo) { const li = _mvEl('li'); li.append(_mvEl('div', 'mv-l', r.label), _mvEl('pre', 'mv-pre', r.manual || r.error || '')); ul.appendChild(li); }
      c.body.appendChild(ul);
    }
    c.body.appendChild(_mvBtn('Undo move…', 'rotate-ccw', 'btn-secondary', () => _mvUndoDialog()));
    el.appendChild(c.card);
  }
  if (i.synced && i.synced.data) {
    const c = _settingsCard(`Your data is in ${i.synced.data}`, `${i.synced.data} copies files between computers, but it cannot merge changes made on two of them, so edits can be lost. Move the data to a folder that belongs to this computer only. Every file is checked, nothing is deleted, and you can undo it.`);
    c.card.classList.add('mv-card', 'mv-warn');
    c.body.appendChild(_mvBtn(`Move my data out of ${i.synced.data}…`, 'hard-drive', 'btn-primary', () => _mvDialog()));
    el.appendChild(c.card);
  } else if (!i.open) {
    el.appendChild(_settingsRow('Move the data folder', 'Move your data to another folder on this computer. Every file is checked, start-up and assistant settings are updated, and the old folder is kept.', _mvBtn('Move…', 'hard-drive', 'btn-ghost', () => _mvDialog())));
  }
}

function _mvProgressCard(job) {
  const c = _settingsCard(job.kind === 'undo' ? 'Undoing the move…' : 'Moving your data…', 'Changes are paused for a moment. Please keep this page open.');
  c.card.classList.add('mv-card');
  c.body.appendChild(_mvProgress(job));
  return c.card;
}
function _mvProgress(job) {
  const w = _mvEl('div', 'mv-progress');
  const pct = job.bytesTotal ? Math.min(100, Math.round(100 * (job.bytesDone || 0) / job.bytesTotal)) : job.total ? Math.round(100 * (job.done || 0) / job.total) : 0;
  const bar = _mvEl('div', 'progress'); const fill = document.createElement('i'); fill.style.setProperty('--pct', pct + '%'); bar.appendChild(fill);
  const what = { checks: 'Checking…', 'copy-data': 'Copying your data and checking every file', 'copy-app': 'Copying the app', 'copied': 'Copied and checked', repoint: 'Updating: ' + (job.label || ''), 'copy-back': 'Copying back what changed since the move' }[job.step] || 'Working…';
  w.append(_mvEl('div', 'set-t', what), bar, _mvEl('div', 'set-h', job.total ? `${job.done || 0} of ${job.total} files${job.bytesTotal ? ` · ${typeof _sdSize === 'function' ? _sdSize(job.bytesDone || 0) : ''} of ${typeof _sdSize === 'function' ? _sdSize(job.bytesTotal) : ''}` : ''}` : ''));
  return w;
}

function _mvPollJob(onDone) {
  if (_mvTimer) return;
  _mvTimer = setInterval(async () => {
    let j;
    try { j = await _mvJson('/api/relocate/job'); } catch (e) { return; }   // the server may be restarting
    if (_mvInfo) _mvInfo.job = j;
    if (j.state === 'running') { if (typeof _sdRefresh === 'function') _sdRefresh(); if (onDone && onDone.onProgress) onDone.onProgress(j); return; }
    clearInterval(_mvTimer); _mvTimer = null;
    if (onDone && onDone.onEnd) onDone.onEnd(j); else _mvLoad(true);
  }, 700);
}

/** Wait for OpenDash to answer again from the new place, then reload. */
function _mvAwaitRestart(expectDataDir, say) {
  const t0 = Date.now();
  const tick = async () => {
    try {
      const j = await _mvJson('/api/relocate');
      if (j && j.dataDir && (!expectDataDir || String(j.dataDir).toLowerCase() === String(expectDataDir).toLowerCase())) { say('Done. Loading OpenDash from the new place…'); setTimeout(() => location.reload(), 600); return; }
    } catch (e) { /* not back yet */ }
    if (Date.now() - t0 > 180000) { say('OpenDash has not started again by itself. Start it the usual way (your OpenDash shortcut); everything is in the new place.'); return; }
    setTimeout(tick, 1500);
  };
  setTimeout(tick, 2500);
}

function _mvStartJob(url, body, dest, dlgSay) {
  const say = dlgSay || ((t) => toast(t, { kind: 'ok', timeout: 8000 }));
  return _mvJson(url, body).then(() => {
    _mvLoad(true);
    _mvPollJob({
      onEnd: (j) => {
        if (j.state === 'error') { say('It stopped: ' + j.error + ' Nothing was lost.'); _mvLoad(true); return; }
        const r = j.restart || {};
        if (r.mode === 'manual') { say('Done. Close OpenDash and start it again to use the new place.'); _mvLoad(true); return; }
        say('Done. Starting OpenDash again in the new place…');
        _mvAwaitRestart(j.result && (j.kind === 'undo' ? j.result.from.data : j.result.to.data), say);
      },
    });
  }).catch((e) => { say(e.message); });
}

function _mvChangeList(refs) {
  const ul = _mvEl('ul', 'mv-list');
  for (const r of refs) {
    const li = _mvEl('li', 'mv-ref mv-' + r.how);
    li.appendChild(_mvEl('div', 'mv-l', r.label));
    li.appendChild(_mvEl('div', 'mv-where', r.where));
    if (r.how === 'manual') li.appendChild(_mvEl('pre', 'mv-pre', r.manual || ''));
    else if (r.how === 'info') li.appendChild(_mvEl('div', 'set-h', r.detail || ''));
    else for (const ch of (r.changes || []).slice(0, 6)) {
      const d = _mvEl('div', 'mv-ch');
      d.append(_mvEl('span', 'mv-what', ch.what), _mvEl('code', 'mv-before', ch.before), _mvEl('span', 'mv-arrow', '→'), _mvEl('code', 'mv-after', ch.after));
      li.appendChild(d);
    }
    if (r.note) li.appendChild(_mvEl('div', 'set-h', r.note));
    ul.appendChild(li);
  }
  return ul;
}

/** The move dialog: where to -> the plan (everything that will happen) -> progress. */
function _mvDialog() {
  const i = _mvInfo || {};
  let to = (i.suggested && i.suggested.data) || '', toApp = (i.suggested && i.suggested.app) || '', moveApp = !!i.recommendApp, plan = null, busy = false;
  openDialog({
    title: i.synced && i.synced.data ? `Move my data out of ${i.synced.data}` : 'Move the data folder', width: 720, resizeKey: 'relocate',
    body: (b, close) => {
      const say = (t) => { b.innerHTML = ''; b.appendChild(_mvEl('p', '', t)); const g = _mvEl('div', 'btn-group mv-actions'); g.appendChild(_mvBtn('Close', null, 'btn-secondary', close)); b.appendChild(g); };
      const paintWhere = () => {
        b.innerHTML = '';
        b.appendChild(_mvEl('p', 'set-h', 'Your data goes to a folder on this computer that no sync program touches. The suggested place is right for almost everyone.'));
        const f = _mvEl('label', 'field'); f.append(_mvEl('span', 'field-label', 'New data folder'));
        const inp = document.createElement('input'); inp.className = 'control'; inp.value = to; inp.spellcheck = false; inp.oninput = () => { to = inp.value.trim(); };
        f.appendChild(inp); b.appendChild(f);
        if (i.appDir) {
          const lab = _mvEl('label', 'toggle-row'); const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = moveApp;
          cb.onchange = () => { moveApp = cb.checked; paintWhere(); };
          lab.append(cb, document.createTextNode(i.synced && i.synced.app ? ` Move the app too (recommended: it is in ${i.synced.app} as well)` : ' Move the app too'));
          b.appendChild(lab);
          if (moveApp) {
            const f2 = _mvEl('label', 'field'); f2.append(_mvEl('span', 'field-label', 'New app folder'));
            const inp2 = document.createElement('input'); inp2.className = 'control'; inp2.value = toApp; inp2.spellcheck = false; inp2.oninput = () => { toApp = inp2.value.trim(); };
            f2.appendChild(inp2); b.appendChild(f2);
          }
        }
        const g = _mvEl('div', 'btn-group mv-actions');
        g.append(_mvBtn('Cancel', null, 'btn-ghost', close), _mvBtn('Next: show me what will happen', 'list-checks', 'btn-primary', (btn) => check(btn)));
        b.appendChild(g);
      };
      const check = async (btn) => {
        if (busy) return; busy = true; if (btn) btn.disabled = true;
        try { plan = await _mvJson('/api/relocate/plan', { to, ...(moveApp ? { moveApp: true, toApp } : { moveApp: false }) }); paintPlan(); }
        catch (e) { toast(e.message, { kind: 'err' }); if (btn) btn.disabled = false; }
        busy = false;
      };
      const paintPlan = () => {
        b.innerHTML = '';
        if (plan.problems.length) {
          const p = _mvEl('div', 'mv-problems'); p.appendChild(_mvEl('div', 'set-t', 'The move cannot start yet'));
          for (const x of plan.problems) p.appendChild(_mvEl('p', '', x.text));
          b.appendChild(p);
        }
        for (const w of plan.warnings) b.appendChild(_mvEl('p', 'set-h mv-warning', w.text));
        b.appendChild(_mvEl('div', 'set-t', 'This is everything that will happen. Nothing has changed yet.'));
        const ol = _mvEl('ol', 'mv-steps');
        const s1 = _mvEl('li'); s1.append(_mvEl('div', 'mv-l', `Copy your data (${plan.data.files} files, ${plan.data.size}) and check every file`), _mvEl('div', 'mv-where', `${plan.from.data}  →  ${plan.to.data}`));
        if (plan.app) s1.append(_mvEl('div', 'mv-l', `Copy the app (${plan.app.files} files, ${plan.app.size})`), _mvEl('div', 'mv-where', `${plan.from.app}  →  ${plan.to.app}`));
        const s2 = _mvEl('li'); s2.appendChild(_mvEl('div', 'mv-l', 'Switch OpenDash on this computer to the new place'));
        const auto = plan.refs.filter(r => r.how === 'auto'), manual = plan.refs.filter(r => r.how === 'manual'), info = plan.refs.filter(r => r.how === 'info');
        const s3 = _mvEl('li'); s3.appendChild(_mvEl('div', 'mv-l', auto.length ? `Update ${auto.length} setting${auto.length === 1 ? '' : 's'} that use the old place` : 'No other settings use the old place'));
        if (auto.length) s3.appendChild(_mvChangeList(auto));
        if (manual.length) { s3.appendChild(_mvEl('div', 'set-t', 'You will need to do these yourself (a program OpenDash needs for them is not installed):')); s3.appendChild(_mvChangeList(manual)); }
        if (info.length) { s3.appendChild(_mvEl('div', 'set-h', 'Checked, nothing to change:')); s3.appendChild(_mvChangeList(info)); }
        const s4 = _mvEl('li'); s4.append(_mvEl('div', 'mv-l', `Keep the old folder, renamed to "${_mvBase(plan.oldName)}", with a note inside`), _mvEl('div', 'set-h', 'Nothing is deleted. You can undo the move from this page.'));
        const s5 = _mvEl('li'); s5.appendChild(_mvEl('div', 'mv-l', 'Start OpenDash again from the new place (this page reloads by itself)'));
        ol.append(s1, s2, s3, s4, s5);
        b.appendChild(ol);
        const g = _mvEl('div', 'btn-group mv-actions');
        const go = _mvBtn('Move now', 'hard-drive', 'btn-primary', (btn) => start(btn));
        go.disabled = !plan.ok;
        g.append(_mvBtn('Back', null, 'btn-ghost', () => paintWhere()), _mvBtn('Check again', 'refresh-cw', 'btn-ghost', (btn) => check(btn)), go);
        b.appendChild(g);
      };
      const start = async (btn) => {
        if (busy) return; busy = true; btn.disabled = true;
        try {
          await _mvJson('/api/relocate/start', { planId: plan.id, to, ...(moveApp ? { moveApp: true, toApp } : { moveApp: false }) });
        } catch (e) {
          busy = false; btn.disabled = false;
          if (e.body && e.body.plan) { plan = e.body.plan; paintPlan(); toast(e.message, { kind: 'warn' }); } else toast(e.message, { kind: 'err' });
          return;
        }
        b.innerHTML = '';
        const holder = _mvEl('div'); b.appendChild(holder);
        holder.appendChild(_mvProgress({ step: 'checks' }));
        _mvPollJob({
          onProgress: (j) => { holder.innerHTML = ''; holder.appendChild(_mvProgress(j)); },
          onEnd: (j) => {
            if (j.state === 'error') { say(`The move stopped: ${j.error} Nothing was switched and nothing was lost.`); _mvLoad(true); return; }
            const r = j.restart || {};
            if (r.mode === 'manual') { say('Done. Close OpenDash and start it again to use the new place.'); return; }
            holder.innerHTML = ''; holder.appendChild(_mvEl('p', '', 'Copied and checked. Starting OpenDash again in the new place…'));
            _mvAwaitRestart(j.result && j.result.to.data, (t) => { holder.innerHTML = ''; holder.appendChild(_mvEl('p', '', t)); });
          },
        });
      };
      paintWhere();
    },
  });
}

function _mvUndoDialog() {
  openDialog({
    title: 'Undo the move', width: 640, resizeKey: 'relocate-undo',
    body: (b, close) => {
      b.appendChild(_mvEl('p', 'set-h', 'Checking…'));
      _mvJson('/api/relocate/undo-plan', {}).then((u) => {
        b.innerHTML = '';
        if (!u.ok) { for (const p of u.problems) b.appendChild(_mvEl('p', '', p.text)); }
        else {
          b.appendChild(_mvEl('div', 'set-t', 'Undo will:'));
          const ol = _mvEl('ol', 'mv-steps');
          ol.appendChild(_mvEl('li', '', u.changedFiles ? `Copy ${u.changedFiles} file${u.changedFiles === 1 ? '' : 's'} you changed since the move back into the old folder (the older versions are kept in its backups folder)` : 'Nothing to copy back: no file changed since the move'));
          for (const p of u.places) ol.appendChild(_mvEl('li', '', p.now !== p.back ? `Give the old folder its name back: "${_mvBase(p.now)}" → "${_mvBase(p.back)}"` : `Use ${p.back} again`));
          const li = _mvEl('li'); li.appendChild(_mvEl('div', 'mv-l', u.refs.length ? `Put back ${u.refs.length} setting${u.refs.length === 1 ? '' : 's'}` : 'No settings to put back'));
          if (u.refs.length) li.appendChild(_mvChangeList(u.refs.map(r => Object.assign({ how: 'auto' }, r))));
          ol.appendChild(li);
          ol.appendChild(_mvEl('li', '', 'Start OpenDash again from the old place. The new folder is kept; delete it yourself later if you like.'));
          b.appendChild(ol);
        }
        const g = _mvEl('div', 'btn-group mv-actions');
        g.appendChild(_mvBtn('Cancel', null, 'btn-ghost', close));
        if (u.ok) g.appendChild(_mvBtn('Undo the move', 'rotate-ccw', 'btn-primary', (btn) => {
          btn.disabled = true;
          const holder = _mvEl('div'); b.innerHTML = ''; b.appendChild(holder);
          _mvStartJob('/api/relocate/undo', { moveId: u.moveId }, null, (t) => { holder.innerHTML = ''; holder.appendChild(_mvEl('p', '', t)); });
        }));
        b.appendChild(g);
      }).catch((e) => { b.innerHTML = ''; b.appendChild(_mvEl('p', '', e.message)); });
    },
  });
}

registerCommand({ id: 'move-data-folder', label: 'Move my data out of OneDrive', icon: 'hard-drive', keywords: 'move data folder onedrive relocate local computer undo', run: () => setView('settings:data') });
