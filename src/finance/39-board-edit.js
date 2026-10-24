  // @part 39-board-edit.js · NEW (2.16) · OWNER: FUX (My money: Customise and Add widget)
  // ── Customise My money (Home's board engine: 12-home-board.js, boardEditor in 12-home-gridedit.js) ────
  // Customise outlines every widget and gives it Home's controls: a minus to remove it
  // (top left; Undo in the toast), a grip (top centre; touch drags by it), the size
  // presets S M L XL and its settings (top right), and handles on its right edge,
  // bottom edge and corner. 2.19.5: this file only holds the host's side (the adapter, the bar's buttons,
  // Add widget); the pointer, the resize, the keys and the gap slots are the engine's, the same as Home.
  //   Move: press a widget and drag. A copy follows the pointer; its place becomes the
  //     dashed "Drop here" that moves to where it would land while the others glide
  //     (homeShelfDropIndex: over a widget its left / right half, the empty end of a
  //     shelf, below them all = last). Release saves; Esc puts it back.
  //   Resize: drag the right edge, bottom edge or corner; the width snaps to the 12 columns (any of 1-12;
  //     S M L XL are the presets 4, 6, 8, 12) and the height to rows, and a badge says it. Release saves; Esc puts it back.
  //   Keyboard (a widget focused): arrows move it, Shift + arrows resize it by a column / row, Delete removes
  //     it, Enter opens its settings.
  // The toolbar floats at the foot (Home's .home-editbar): Add widget, Undo (every layout
  // change before this one), the layout menu, Done. Nothing glides with reduced motion.
  // Add widget: Home's gallery dialog (the .hgal-* look): the widgets by group with a search,
  // what each does in one line, its sizes, and a LIVE preview with your own numbers.
  function bdEdit(on, o) {
    o = o || {};
    on = !!on;
    if (on === BDR.editing && !o.again) return;
    BDR.editing = on;
    const g = BDR.grid; if (!g || !g.isConnected) return;
    R.root.classList.toggle('fvb-editing', on);
    if (on) {
      R.root.classList.add('fvb-edit-enter'); setTimeout(() => R.root && R.root.classList.remove('fvb-edit-enter'), 700);
      for (const el of g.querySelectorAll(':scope > .fvb-w')) bdChrome(el);
      bdEditBar();
      if (!BDR.edit) BDR.edit = boardEditor(g, bdBoardAdapter());
      bdFill(); bdGapSlots();
    } else {
      for (const el of g.querySelectorAll(':scope > .fvb-w')) bdUnchrome(el);
      if (BDR.edit) { BDR.edit.destroy(); BDR.edit = null; }
      if (BDR.bar) { BDR.bar.remove(); BDR.bar = null; }
      for (const x of g.querySelectorAll(':scope > .hg-slot')) x.remove();
      bdFill();
    }
    if (R.ctx) { bdPaintTools(bdPass(R.ctx)); bdPaintIntro(bdPass(R.ctx)); }
  }
  /** After a change while customising: widgets whose size changed get their controls again, the bar its Undo / Reset state, the gaps their slots. */
  function bdEditRefresh() {
    const g = BDR.grid; if (!g) return;
    for (const el of g.querySelectorAll(':scope > .fvb-w')) if (!el.querySelector(':scope > .hg-x') || el._chromeDims !== el.dataset.dims) bdChrome(el);
    if (BDR.bar && BDR.bar._undo) BDR.bar._undo.disabled = !BD_UNDO.length;
    if (BDR.bar && BDR.bar._reset) BDR.bar._reset.disabled = sameJ(boardGet(), bdPreset('simple'));
    bdFill(); bdGapSlots();
  }
  /** The controls of one widget (the shared ones: minus, grip, size presets, settings, resize handles, keys). */
  function bdChrome(el) {
    const wid = el.dataset.wid, w = boardGet().w.find(x => x.i === wid), d = bwDef(el.dataset.t);
    if (!w || !d) return;
    const A = bdBoardAdapter();
    boardChrome(el, {
      title: d.title, roledesc: 'widget, arrows move it, Shift and arrows resize it',
      removeLabel: 'Remove ' + d.title, removeTip: 'Remove (Undo in the toast)', onRemove: () => bdRemove(wid),
      sizes: d.sizes.map(s => ({ key: s, text: BD_SIZE_LABEL[s], aria: BD_SIZE_LONG[s], tip: BD_SIZE_LONG[s] })), cur: w.c ? null : w.s,
      onSize: s => bdSetSize(wid, s),
      settings: b => bdSettings(b, wid), settingsAria: d.title + ': settings',
      onKey: e => boardEditKey(A, e, wid, el),
    });
    el._chromeDims = el.dataset.dims;
  }
  function bdUnchrome(el) {
    for (const c of el.querySelectorAll(':scope > .hg-x, :scope > .hg-grip, :scope > .hg-chrome, :scope > .hg-rs, :scope > .hg-rs-tip')) c.remove();
    el.removeAttribute('tabindex'); el.removeAttribute('aria-roledescription'); el.onkeydown = null; el.style.removeProperty('--wq'); delete el._chromeDims;
  }
  function bdEditBar() {
    if (BDR.bar && BDR.bar.isConnected) return;
    const { bar, btn } = boardEditBar({
      title: 'Customising My money', aria: 'Customise My money', icon: 'pencil', cls: 'fvb-editbar',
      hint: 'Drag to move · drag an edge or corner to resize to any size · arrows on a selected widget, <kbd class="kbd">Shift</kbd>+arrows resize',
      buttons: [
        { key: 'add', label: 'Add widget', icon: 'plus', kind: 'secondary', cls: 'heb-add', aria: 'Add widget', run: () => bdGallery() },
        { key: 'layouts', label: 'Layouts', icon: 'layers', cls: 'heb-presets', tip: 'Start from Simple or Detailed, plain words, the everyday strip', run: (e, el) => bdLayoutMenu(el) },
        { key: 'undo', label: 'Undo', icon: 'undo-2', cls: 'heb-undo', tip: 'Undo the last change to the layout', disabled: !BD_UNDO.length, run: () => boardUndo() },
        { key: 'reset', label: 'Reset', icon: 'rotate-ccw', cls: 'heb-reset', aria: 'Reset layout', tip: 'Back to the default layout', disabled: sameJ(boardGet(), bdPreset('simple')), run: () => bdReset() },
        { key: 'done', label: 'Done', icon: 'check', kind: 'primary', cls: 'heb-done', kbd: 'Esc', run: () => bdEdit(false) },
      ],
    });
    bar._undo = btn.undo; bar._reset = btn.reset;
    btn.add.setAttribute('aria-haspopup', 'dialog'); btn.layouts.setAttribute('aria-haspopup', 'menu');
    R.els.panel.append(bar);
    BDR.bar = bar;
  }
  /** The dashed "Add a widget here" slots in the holes the packing leaves (customising only). */
  function bdGapSlots() {
    const g = BDR.grid; if (!g || !g.isConnected) return;
    if (!BDR.editing) { for (const x of g.querySelectorAll(':scope > .hg-slot')) x.remove(); return; }
    boardGapSlots(g, { isFrame: k => k.classList.contains('fvb-w'), onAdd: cols => bdGallery(null, cols) });
  }

  /* ---------- the shared board engine (12-home-board.js, boardEditor in 12-home-gridedit.js) runs the pointer and keys ---------- */
  let bdA = null;
  function bdBoardAdapter() {
    if (bdA) return bdA;
    return (bdA = {
      sel: '.fvb-w[data-wid]',
      map: BD_SIZE_COLS, presets: BD_SIZES,
      sizeName: s => BD_SIZE_LONG[s].split(' · ')[0],
      state(id) {
        const w = boardGet().w.find(x => x.i === id); if (!w) return null;
        return { size: w.s, c: w.c, cols: bdColsOf(w), h: w.h || null, sizes: bwDef(w.t).sizes, title: bwDef(w.t).title };
      },
      setSize: (id, ch, say) => bdSetDims(id, ch, say),
      preview: (f, st) => bdSetSpan(f, { s: st.size, c: st.c, h: st.h }),
      ids: () => boardGet().w.map(w => w.i),
      moveTo: (id, j) => { if (bdMove(id, j)) bdFocus(id); },
      order(ids, movedId) {
        const L = boardGet(); const by = new Map(L.w.map(w => [w.i, w]));
        boardSave(bdCustom(Object.assign({}, L, { w: ids.map(id => by.get(id)).filter(Boolean) })), null, { quiet: true });
        bdFocus(movedId);
      },
      remove: id => bdRemove(id),
      add: () => bdGallery(),
      say: msg => toast(msg),
      reflow: (grid, fn) => { if (!MK.reduced() && typeof homeFlip === 'function') homeFlip(grid, fn); else fn(); },
      after: () => bdGapSlots(),
      lift: { cls: ['fvb-lift'], prep(l) { for (const c of l.querySelectorAll('canvas')) c.remove(); } },
    });
  }
  function bdFocus(wid) {
    requestAnimationFrame(() => { const f = BDR.grid && BDR.grid.querySelector(`:scope > .fvb-w[data-wid="${CSS.escape(wid)}"]`); if (f) { try { f.focus({ preventScroll: false }); } catch (e) { /* old browser */ } } });
  }

  /* ---------- Add widget: the gallery ---------- */
  const BD_GAL_W = { s: 365, m: 556, l: 746, xl: 1128 };
  function bdGallery(pick, fitCols) {
    if (typeof openDialog !== 'function') return;
    const L0 = boardGet();
    const count = t => boardGet().w.filter(w => w.t === t).length;
    // From a free slot (fitCols): the size that fits it, and the widget then takes exactly the slot's columns.
    const startSize = d => (fitCols ? d.sizes.filter(s => BD_SIZE_COLS[s] <= fitCols).pop() || d.sizes[0] : d.size);
    let sel = bwDef(pick) || BW_DEFS.find(d => !count(d.t)) || BW_DEFS[0];
    let size = startSize(sel);
    let added = 0;
    openDialog({
      title: 'Add a widget to My money', size: 'xl', fixed: true, resizable: false,
      onClose: () => { disposeChart('s:b:prev'); if (added && BDR.editing) bdEditRefresh(); },
      body: (el, close) => {
        el.classList.add('hgal-b');
        el.closest('.modal').classList.add('hgal-modal', 'fvb-gal');
        const side = h('div', { class: 'hgal-side' });
        const q = h('input', { type: 'search', class: 'input input-sm hgal-q', placeholder: 'Search widgets', 'aria-label': 'Search widgets', autocomplete: 'off' });
        const list = h('div', { class: 'hgal-list', role: 'listbox', 'aria-label': 'Widgets' });
        const none = h('p', { class: 'hgal-none', role: 'status', text: 'No widget matches', hidden: true });
        side.append(q, list, none);
        const pane = h('div', { class: 'hgal-pane' });
        el.append(side, pane);
        const items = [];
        for (const [g, label] of BW_GROUPS) {
          const defs = BW_DEFS.filter(d => d.group === g);
          if (!defs.length) continue;
          const head = h('div', { class: 'hgal-gh', text: label }); list.append(head);
          for (const d of defs) {
            const b = h('button', { type: 'button', class: 'hgal-item', role: 'option', 'data-t': d.t, onclick: () => { if (sel.t !== d.t) { sel = d; size = startSize(d); paint(); } } },
              h('span', { class: 'hgal-ic' }, ic(d.icon)), h('span', { class: 'hgal-t', text: d.title }), h('span', { class: 'fvb-gal-badge' }));
            b._d = d; b._head = head; list.append(b); items.push(b);
          }
        }
        const badges = () => { for (const b of items) { const n = count(b._d.t); const s = b.querySelector('.fvb-gal-badge'); s.className = 'fvb-gal-badge ' + (n ? 'hgal-on' : 'hgal-tag'); s.innerHTML = ''; if (n) s.append(ic('check'), n > 1 ? `On the page ×${n}` : 'On the page'); else s.textContent = 'Add'; } };
        const visible = () => items.filter(b => !b.hidden);
        q.addEventListener('input', () => {
          const s = q.value.trim().toLowerCase();
          for (const b of items) b.hidden = !!s && !(b._d.title + ' ' + b._d.desc + ' ' + b._d.group).toLowerCase().includes(s);
          for (const hd of list.querySelectorAll('.hgal-gh')) hd.hidden = items.filter(b => b._head === hd).every(b => b.hidden);
          const v = visible(); none.hidden = v.length > 0;
          if (v.length && !v.some(b => b._d.t === sel.t)) { sel = v[0]._d; size = startSize(sel); paint(); }
        });
        q.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'Enter') { const v = visible(); if (!v.length) return; e.preventDefault(); const b = v.find(x => x._d.t === sel.t) || v[0]; b.focus(); if (b._d.t !== sel.t) b.click(); } });
        list.addEventListener('keydown', e => {
          if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
          const v = visible(); const i = v.findIndex(b => b._d.t === sel.t);
          if (e.key === 'ArrowUp' && i <= 0) { e.preventDefault(); q.focus(); return; }
          const n = v[clamp(i + (e.key === 'ArrowDown' ? 1 : -1), 0, v.length - 1)]; if (!n) return;
          e.preventDefault(); n.focus(); n.click();
        });
        const paint = () => {
          const d = sel;
          for (const b of items) { const on2 = b._d.t === d.t; b.setAttribute('aria-selected', on2 ? 'true' : 'false'); b.classList.toggle('is-current', on2); }
          badges();
          disposeChart('s:b:prev');
          pane.innerHTML = '';
          pane.append(h('h3', { text: d.title }), h('p', { class: 'hgal-d', text: d.desc }));
          if (d.sizes.length > 1) {
            const seg2 = h('span', { class: 'seg', role: 'radiogroup', 'aria-label': d.title + ' size' });
            for (const s of d.sizes) { const on2 = s === size; seg2.append(h('button', { type: 'button', role: 'radio', class: on2 ? 'on' : '', 'aria-checked': on2 ? 'true' : 'false', title: BD_SIZE_LONG[s], text: BD_SIZE_LONG[s].split(' · ')[0], onclick: () => { if (!on2) { size = s; paint(); } } })); }
            pane.append(h('div', { class: 'hgal-sizes' }, h('span', { class: 'hgal-lbl', text: 'Size' }), seg2));
          }
          // The live preview: the widget itself with your numbers, at its size, scaled to fit.
          const stage = h('div', { class: 'hgal-stage fvb-stage' });
          const scale = h('div', { class: 'hgal-scale fv' });
          stage.append(scale); pane.append(stage);
          if (R.mode === 'ready' && R.ctx) {
            try {
              const X = bdPass(R.ctx);
              const w = { i: 'prev', t: d.t, s: size, o: {} };
              const grid2 = h('div', { class: 'fv-grid fvb-prev-grid', style: { width: BD_GAL_W[size] + 'px' } });
              scale.append(grid2);
              BDR.tmp = grid2;
              const cd = bdFrame(w, X); cd.el.style.setProperty('--span', 12); cd.el.querySelector('.fvb-set').remove();
              BWR[d.t].update(cd, w, Object.assign({}, X, { size: () => size }));
              BDR.tmp = h('div');
              requestAnimationFrame(() => {
                const avail = stage.clientWidth - 24; const k = Math.min(1, avail / BD_GAL_W[size]);
                scale.style.transform = `scale(${k.toFixed(3)})`; scale.style.width = BD_GAL_W[size] + 'px';
                stage.style.height = Math.min(360, Math.ceil(grid2.offsetHeight * k) + 24) + 'px';
              });
            } catch (e) { scale.append(h('p', { class: 'fvb-note', text: 'The preview could not draw; the widget itself may still work.' })); }
          } else scale.append(h('p', { class: 'fvb-note', text: 'The preview shows once your finances have loaded.' }));
          const n = count(d.t);
          const addB = h('button', { type: 'button', class: 'btn btn-primary', onclick: () => {
            const L = boardGet();
            const w = { i: bdUid(d.t), t: d.t, s: size, o: {} };
            if (fitCols && size === startSize(d)) { const f = boardFit(fitCols, d.sizes, BD_SIZE_COLS); w.s = f.size; if (f.c) w.c = f.c; }
            if (L.w.length >= BD_MAX) { toast(`My money holds up to ${BD_MAX} widgets. Remove one first.`, { bad: true }); return; }
            boardSave(bdCustom(Object.assign({}, L, { w: L.w.concat([w]) })), `${d.title} added`, { icon: d.icon });
            added++; close(); bdArrive(w.i);
          } }, ic('plus'), h('span', { text: n ? 'Add another' : 'Add to My money' }));
          pane.append(h('div', { class: 'hgal-foot' }, addB, h('p', { class: 'hgal-note', text: d.now ? 'Shows how things stand now (it does not follow the dates).' : 'Follows the dates and filters on top; its settings can give it its own dates.' })));
        };
        paint();
        setTimeout(() => { try { q.focus({ preventScroll: true }); } catch (e) { /* old browser */ } }, 0);
        void L0;
      },
    });
  }
  /** A widget just added: into view, with a short ring. */
  function bdArrive(wid) {
    requestAnimationFrame(() => {
      const f = BDR.grid && BDR.grid.querySelector(`:scope > .fvb-w[data-wid="${CSS.escape(wid)}"]`);
      if (!f) return;
      try { f.scrollIntoView({ block: 'nearest', behavior: MK.reduced() ? 'auto' : 'smooth' }); } catch (e) { /* old browser */ }
      f.classList.add('is-arriving'); setTimeout(() => f.classList.remove('is-arriving'), 1400);
    });
  }
