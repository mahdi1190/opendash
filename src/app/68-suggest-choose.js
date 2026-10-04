/* ============================================================
   SUGGESTIONS: the "choose" list (owner: the suggestion-card builder for
   TASKS, PEOPLE, FOCUS, HYGIENE)
   ------------------------------------------------------------
   The prefilled editor for a card that proposes SEVERAL changes at once
   (S10 move the lowest tasks, S11 roll today's leftovers, S17 several
   emails as tasks). The user's rule (3 Oct): the main button opens the
   normal editor already filled in, the user adjusts, then saves. Here that
   is a dialog with one row per item (selectList: ticks, Select all, Invert,
   keys), ticked as the card suggests, and a small choice per row (which
   day, or Won't do). Apply runs the ticked rows' chosen ops through the
   actions layer in ONE batch: one toast, one Undo. Nothing changes before
   Apply. Pressing the card's button again while its list is open does
   nothing (the ticks stay).
   sgChooseOpen(args, o) is called by the 'ops.choose' action
   (68-suggest-actions.js); args are checked there (allowlisted ops only).
   ============================================================ */

let _sgChoose = null;          // {key, close} of the open list

function sgChooseOpen(a, o) {
  o = o || {};
  const key = (o.card && o.card.key) || '';
  if (_sgChoose && _sgChoose.key === key && document.querySelector('.modal.sg-choose')) {
    const m = document.querySelector('.modal.sg-choose .sel-cbx[tabindex="0"]');
    if (m) m.focus({ preventScroll: true });
    return { ok: true, opened: true, again: true };
  }
  const items = (a.items || []).slice(0, 12);
  const pick = new Map(items.map(it => [String(it.id), 0]));      // row -> chosen alt index
  const close = openDialog({
    title: a.title || 'Choose', width: 520, resizeKey: 'sg-choose',
    body: (b, closeDlg) => {
      b.closest('.modal').classList.add('sg-choose');
      if (a.intro) { const p = document.createElement('p'); p.className = 'muted sgc-intro'; p.textContent = a.intro; b.appendChild(p); }
      const host = document.createElement('div'); host.className = 'sgc-host';
      const list = document.createElement('div'); list.className = 'sgc-list';
      host.appendChild(list); b.appendChild(host);
      list.innerHTML = items.map((it, i) => {
        const alts = it.alts || [];
        const seg = alts.length > 1
          ? `<span class="seg sgc-seg" role="radiogroup" aria-label="${escAttr('Choice for ' + (it.label || ''))}">${alts.map((alt, k) => `<button type="button" role="radio" data-alt="${k}" aria-checked="${k === 0}" aria-pressed="${k === 0}">${esc(alt.label || '')}</button>`).join('')}</span>`
          : '';
        return `<div class="sgc-row" data-sel-id="${escAttr(String(it.id))}" aria-label="${escAttr(it.label || '')}" style="--i:${i}">`
          + `<div class="sgc-txt"><div class="sgc-l">${esc(it.label || '')}</div>${it.sub ? `<div class="sgc-s">${esc(it.sub)}</div>` : ''}</div>${seg}</div>`;
      }).join('');
      list.querySelectorAll('.sgc-seg').forEach(seg => {
        seg.addEventListener('click', (e) => {
          const btn = e.target.closest('button[data-alt]');
          if (!btn) return;
          e.stopPropagation();
          const row = btn.closest('.sgc-row'), id = row.dataset.selId, k = Number(btn.dataset.alt);
          if (pick.get(id) === k) return;                                  // re-click: no-op
          pick.set(id, k);
          seg.querySelectorAll('button').forEach(x => { const on = Number(x.dataset.alt) === k; x.setAttribute('aria-checked', String(on)); x.setAttribute('aria-pressed', String(on)); });
        });
      });
      const store = { on: new Set() };
      const byId = new Map(items.map(it => [String(it.id), it]));
      selectList(list, {
        rows: '.sgc-row', store, label: a.title || 'Choose', rowClick: true,
        defaultOn: (id) => (byId.get(id) || {}).on !== false,
        apply: { label: a.apply || 'Apply selected', icon: 'check', run: async (ids, sl) => {
          const ops = [];
          for (const id of ids) { const it = byId.get(id); const alt = it && it.alts && it.alts[pick.get(id) || 0]; if (alt) ops.push(...alt.ops); }
          if (!ops.length) return {};
          const j = await sgApplyOps(ops, { client: 'suggestions' });
          if (!j.ok) { if (j.cancelled) return {}; throw Object.assign(new Error(j.message || 'That did not work.'), { quiet: true }); }
          closeDlg();
          if (key) { try { sgMemWrite(m => sgMemAccept(m, key, Date.now())); } catch (e) { /* shown again at worst */ } }
          const n = ids.length;
          toast(`${a.line || 'Done'}: ${n} item${n === 1 ? '' : 's'}`, { kind: 'ok', icon: 'check', timeout: 9000, action: j.undo ? { label: 'Undo', run: () => sgUndoOps(j.undo).then((u) => {
            if (u && u.ok) { toast('Undone', { kind: 'ok', icon: 'undo-2' }); if (key) { try { sgMemWrite(m => { const x = sgMemNorm(m); delete x.accepted[key]; return x; }); } catch (e) { /* fine */ } } }
            else toast((u && u.message) || 'Could not undo.', { kind: 'err' });
          }) } : null });
          return { done: ids };
        } },
      });
    },
    onClose: () => { if (_sgChoose && _sgChoose.key === key) _sgChoose = null; },
  });
  _sgChoose = { key, close };
  return { ok: true, opened: true };
}
