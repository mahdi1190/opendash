  // @part 40-recategorise.js · OWNER: C2 (category select + confirm popover + categorise)
  // ── Recategorising ────────────────────────────────────────────────────
  function catSelect(cur, merchant, how, placeholder) {
    const M = R.model;
    const sel = h('select', { class: 'fv-catsel', 'aria-label': `Category for ${merchant}` });
    if (placeholder) sel.append(h('option', { value: '', text: placeholder }));
    M.categories.forEach(c => sel.append(h('option', { value: c, text: c })));
    sel.append(h('option', { value: '__new', text: '+ New category…' }));
    sel.value = placeholder ? '' : cur;
    sel.style.setProperty('--sw', catColor(cur));
    sel.addEventListener('click', e => e.stopPropagation());
    sel.addEventListener('change', () => {
      const v = sel.value;
      const reset = () => { sel.value = placeholder ? '' : cur; };
      if (!v) return;
      if (v === '__new') { reset(); confirmCat(sel, merchant, null, cur, how, true); return; }
      if (v === cur) return;
      reset();
      confirmCat(sel, merchant, v, cur, how, false);
    });
    return sel;
  }
  function confirmCat(anchor, merchant, cat, prevCat, prevHow, isNew) {
    closePop();
    const M = R.model;
    const n = M.tx.filter(x => x.m === merchant).length;
    const input = isNew ? h('input', { class: 'fv-input', type: 'text', maxlength: '31', placeholder: 'e.g. Health', 'aria-label': 'New category name' }) : null;
    const err = h('div', { class: 'fv-pop-err', hidden: true });
    const apply = h('button', { type: 'button', class: 'fv-btn primary', text: 'Apply to all from this merchant' });
    const pop = h('div', { class: 'fv-pop', role: 'dialog', 'aria-label': 'Change category' },
      h('div', { class: 'fv-pop-t' }, isNew ? 'New category for ' : 'Move ', h('b', { text: merchant }), isNew ? '' : ' to ', isNew ? '' : h('b', { text: cat })),
      // @new-begin C2: the move, drawn (merchant tile, from -> to)
      h('div', { class: 'fv-pop-move', 'aria-hidden': 'true' }, VK.tile(merchant, prevCat, { size: 'sm', badge: false, live: false }),
        h('span', { class: 'fv-pop-cat from' }, VK.cat(prevCat, { size: 'xs', plain: false }), h('span', { text: prevCat })), ic('arrow-right'),
        isNew ? h('span', { class: 'fv-pop-cat to new' }, ic('plus'), h('span', { text: 'New category' })) : h('span', { class: 'fv-pop-cat to' }, VK.cat(cat, { size: 'xs', plain: false }), h('span', { text: cat }))),
      // @new-end
      input,
      h('p', { class: 'mute', text: `Applies to all ${n} transaction${n === 1 ? '' : 's'} from this merchant, and to future imports (saved as a rule in rules.json).` }),
      err,
      h('div', { class: 'fv-pop-actions' }, h('button', { type: 'button', class: 'fv-btn ghost', text: 'Cancel', onclick: closePop }), apply));
    apply.addEventListener('click', async () => {
      let c = cat;
      if (isNew) {
        c = input.value.trim();
        if (!CAT_RE.test(c)) { err.hidden = false; err.textContent = 'Use 2–31 letters, spaces, &, / or -, starting with a letter.'; input.focus(); return; }
      }
      apply.disabled = true; apply.textContent = 'Saving…';
      const ok = await categorise(merchant, c, prevCat, prevHow);
      if (ok) closePop(); else { apply.disabled = false; apply.textContent = 'Apply to all from this merchant'; }
    });
    if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') apply.click(); });
    pop.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closePop(); anchor.focus(); } });
    R.layer.append(pop);
    const r = anchor.getBoundingClientRect();
    const pw = Math.min(340, window.innerWidth - 24);
    pop.style.width = pw + 'px';
    pop.style.left = clamp(r.left, 12, window.innerWidth - pw - 12) + 'px';
    const below = r.bottom + 8, ph = pop.offsetHeight;
    pop.style.top = (below + ph > window.innerHeight - 12 ? Math.max(12, r.top - ph - 8) : below) + 'px';
    (input || apply).focus();
    R.pop = pop;
    setTimeout(() => document.addEventListener('pointerdown', R.popAway = e => { if (R.pop && !R.pop.contains(e.target)) closePop(); }), 0);
  }
  function closePop() {
    if (R.pop) { R.pop.remove(); R.pop = null; }
    if (R.popAway) { document.removeEventListener('pointerdown', R.popAway); R.popAway = null; }
    if (R.popAnchor) { R.popAnchor.setAttribute('aria-expanded', 'false'); R.popAnchor = null; }
  }
  // A small menu popover under `anchor` (the Transactions toolbar's Category,
  // Type and Sort). o: { label, items: [{ key, label, icon (node), count, on }],
  // all (label of the "everything" row), allOn, single, onPick(key), onAll(), onOnly(key), note }.
  // Multi-select menus stay open while you tick; Esc or a click outside closes.
  function fvMenu(anchor, o) {
    if (R.pop && R.popAnchor === anchor) { closePop(); return; }   // the open menu's button closes it
    closePop(); ensureLayer();
    const list = h('div', { class: 'fv-menu-list', role: o.single ? 'listbox' : 'group', 'aria-label': o.label });
    const rows = [];
    const paintAll = () => { if (allRow) { const any = rows.some(r => r._on); allRow.setAttribute('aria-checked', String(!any)); allRow.classList.toggle('on', !any); } };
    const allRow = o.all ? h('button', { type: 'button', class: 'fv-menu-it all' + (o.allOn ? ' on' : ''), role: 'menuitemcheckbox', 'aria-checked': String(!!o.allOn), onclick: () => { rows.forEach(r => { r._on = false; r.classList.remove('on'); r.setAttribute('aria-checked', 'false'); }); paintAll(); o.onAll && o.onAll(); } },
      h('span', { class: 'ck', 'aria-hidden': 'true' }, ic('check')), h('span', { class: 'l', text: o.all })) : null;
    if (allRow) list.append(allRow, h('div', { class: 'fv-menu-sep', role: 'separator' }));
    for (const it of o.items) {
      const b = h('button', { type: 'button', class: 'fv-menu-it fsym-host' + (it.on ? ' on' : ''), role: o.single ? 'option' : 'menuitemcheckbox', 'aria-checked': o.single ? null : String(!!it.on), 'aria-selected': o.single ? String(!!it.on) : null },
        h('span', { class: 'ck', 'aria-hidden': 'true' }, ic('check')), it.icon || null, h('span', { class: 'l', text: it.label }),
        it.count != null ? h('span', { class: 'n', text: nf0.format(it.count) }) : null,
        o.onOnly ? h('span', { class: 'only', role: 'button', tabindex: '-1', title: 'Only this', text: 'only' }) : null);
      b._on = !!it.on;
      b.addEventListener('click', e => {
        if (o.onOnly && e.target.closest('.only')) { closePop(); anchor.focus(); o.onOnly(it.key); return; }
        if (o.single) { closePop(); anchor.focus(); if (!it.on) o.onPick(it.key); return; }   // the current choice: nothing to do
        b._on = !b._on; b.classList.toggle('on', b._on); b.setAttribute('aria-checked', String(b._on)); paintAll();
        o.onPick(it.key);
      });
      rows.push(b); list.append(b);
    }
    if (!o.items.length) list.append(h('div', { class: 'fv-menu-empty', text: 'Nothing to choose from in this range.' }));
    const pop = h('div', { class: 'fv-pop fv-menu', role: 'dialog', 'aria-label': o.label },
      h('div', { class: 'fv-menu-t', text: o.label }), list, o.note ? h('div', { class: 'fv-menu-note', text: o.note }) : null);
    pop.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.stopPropagation(); closePop(); anchor.focus(); return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const its = [...pop.querySelectorAll('.fv-menu-it')]; const i = its.indexOf(document.activeElement);
      const nx = its[(i + (e.key === 'ArrowDown' ? 1 : its.length - 1)) % its.length]; if (nx) nx.focus();
    });
    R.layer.append(pop);
    const r = anchor.getBoundingClientRect();
    const pw = Math.min(300, window.innerWidth - 24);
    pop.style.width = pw + 'px';
    pop.style.left = clamp(r.left, 12, window.innerWidth - pw - 12) + 'px';
    const below = r.bottom + 6, ph = Math.min(pop.offsetHeight, window.innerHeight - 24);
    pop.style.maxHeight = (window.innerHeight - 24) + 'px';
    pop.style.top = (below + ph > window.innerHeight - 12 ? Math.max(12, r.top - ph - 6) : below) + 'px';
    R.pop = pop; R.popAnchor = anchor; anchor.setAttribute('aria-expanded', 'true');
    const firstOn = pop.querySelector('.fv-menu-it.on') || pop.querySelector('.fv-menu-it');
    if (firstOn) firstOn.focus({ preventScroll: true });
    setTimeout(() => document.addEventListener('pointerdown', R.popAway = e => { if (R.pop && !R.pop.contains(e.target) && !anchor.contains(e.target)) closePop(); }), 0);
  }
  async function categorise(merchant, category, prevCat, prevHow, isUndo) {
    try {
      const r = await api('/api/finance/categorise', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ merchant, category }) });
      if (r.ok && r.body && r.body.analysis) {
        const n = R.model.tx.filter(x => x.m === merchant).length;
        applyAnalysis(r.body.analysis);
        if (!isUndo) {
          const undoCat = prevHow === 'override' ? prevCat : null;
          toast(category ? `Moved ${n} transaction${n === 1 ? '' : 's'} to ${category}` : 'Rule removed', { action: 'Undo', onAction: () => categorise(merchant, undoCat, category, 'override', true) });
        } else toast('Undone');
        return true;
      }
      const msg = r.status === 404 ? 'This OpenDash server can’t change categories yet — restart it to pick up the new version.'
        : r.status === 409 ? 'An update is running. Try again when it finishes.'
          : r.status === 400 ? (r.body.error || 'That category name isn’t allowed.') : (r.body.error || 'HTTP ' + r.status);
      toast(msg, { bad: true });
    } catch (e) { toast('Could not reach the OpenDash server', { bad: true }); }
    return false;
  }

