  // @part 39-board-edit.js · NEW (2.16) · OWNER: FUX (My money: Customise and Add widget)
  // ── Customise My money (Home's editing model, 12-home-gridedit.js) ────
  // Customise outlines every widget and gives it Home's controls: a minus to remove it
  // (top left; Undo in the toast), a grip (top centre; touch drags by it), the size
  // switcher S M L XL and its settings (top right), and a handle on its right edge.
  //   Move: press a widget and drag. A copy follows the pointer; its place becomes the
  //     dashed "Drop here" that moves to where it would land while the others glide
  //     (homeShelfDropIndex: over a widget its left / right half, the empty end of a
  //     shelf, below them all = last). Release saves; Esc puts it back.
  //   Resize: drag the right edge; the width snaps to the widget's sizes (4, 6, 8, 12 of 12
  //     columns) and a badge says it. Release saves; Esc puts it back.
  //   Keyboard (a widget focused): arrows move it, Shift + arrows resize it, Delete removes
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
      if (!BDR.edit) BDR.edit = bdEditor(g);
    } else {
      for (const el of g.querySelectorAll(':scope > .fvb-w')) bdUnchrome(el);
      if (BDR.edit) { BDR.edit.destroy(); BDR.edit = null; }
      if (BDR.bar) { BDR.bar.remove(); BDR.bar = null; }
    }
    if (R.ctx) { bdPaintTools(bdPass(R.ctx)); bdPaintIntro(bdPass(R.ctx)); }
  }
  /** After a change while customising: new widgets get their controls, the bar its Undo state. */
  function bdEditRefresh() {
    const g = BDR.grid; if (!g) return;
    for (const el of g.querySelectorAll(':scope > .fvb-w')) if (!el.querySelector(':scope > .hg-x')) bdChrome(el);
    for (const el of g.querySelectorAll(':scope > .fvb-w')) bdPaintSizes(el);
    if (BDR.bar && BDR.bar._undo) BDR.bar._undo.disabled = !BD_UNDO.length;
  }
  function bdChrome(el) {
    if (el.querySelector(':scope > .hg-x')) return;
    const wid = el.dataset.wid, d = bwDef(el.dataset.t);
    el.tabIndex = 0;
    el.setAttribute('aria-roledescription', 'widget, arrows move it, Shift and arrows resize it');
    el.style.setProperty('--wq', String([...el.parentElement.children].indexOf(el) % 7));
    const x = h('button', { type: 'button', class: 'hg-x', 'aria-label': 'Remove ' + d.title, title: 'Remove (Undo in the toast)', onclick: e => { e.stopPropagation(); bdRemove(wid); } }, ic('minus'));
    const grip = h('span', { class: 'hg-grip', 'aria-hidden': 'true', title: 'Drag to move' }, ic('grip-vertical'));
    const sizes = h('span', { class: 'seg hg-sizes', role: 'radiogroup', 'aria-label': d.title + ' size' });
    for (const s of d.sizes) sizes.append(h('button', { type: 'button', role: 'radio', 'data-size': s, title: BD_SIZE_LONG[s], text: BD_SIZE_LABEL[s], onclick: e => { e.stopPropagation(); if (el.dataset.size !== s) bdSetSize(wid, s); } }));
    const set = h('button', { type: 'button', class: 'btn-icon', 'aria-label': d.title + ': settings', title: 'Settings', onclick: e => { e.stopPropagation(); bdSettings(e.currentTarget, wid); } }, ic('sliders-horizontal'));
    const chrome = h('span', { class: 'hg-chrome' }, d.sizes.length > 1 ? sizes : null, set);
    el.append(x, grip, chrome);
    if (d.sizes.length > 1) el.append(h('span', { class: 'hg-rs hg-rs-e', 'data-dir': 'e', 'aria-hidden': 'true', title: 'Drag to change the width' }));
    bdPaintSizes(el);
  }
  function bdPaintSizes(el) {
    for (const b of el.querySelectorAll(':scope > .hg-chrome .hg-sizes button')) {
      const on2 = b.dataset.size === el.dataset.size;
      b.classList.toggle('on', on2); b.setAttribute('aria-checked', on2 ? 'true' : 'false');
    }
  }
  function bdUnchrome(el) {
    for (const c of el.querySelectorAll(':scope > .hg-x, :scope > .hg-grip, :scope > .hg-chrome, :scope > .hg-rs, :scope > .hg-rs-tip')) c.remove();
    el.removeAttribute('tabindex'); el.removeAttribute('aria-roledescription');
  }
  function bdEditBar() {
    if (BDR.bar && BDR.bar.isConnected) return;
    const undo = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', disabled: !BD_UNDO.length, onclick: () => boardUndo() }, ic('undo-2'), h('span', { text: 'Undo' }));
    const bar = h('div', { class: 'home-editbar fvb-editbar', role: 'toolbar', 'aria-label': 'Customise My money' },
      h('div', { class: 'heb-t' }, ic('pencil'), h('div', null, h('b', { text: 'Customising My money' }), h('span', { text: 'Drag to move · drag the right edge to resize · arrows on a selected widget' }))),
      h('span', { class: 'spacer' }),
      h('button', { type: 'button', class: 'btn btn-secondary btn-sm heb-add', onclick: () => bdGallery() }, ic('plus'), h('span', { text: 'Add widget' })),
      undo,
      h('button', { type: 'button', class: 'btn btn-ghost btn-sm heb-reset', 'aria-haspopup': 'menu', onclick: e => bdLayoutMenu(e.currentTarget) }, ic('layout-template'), h('span', { text: 'Layout' })),
      h('button', { type: 'button', class: 'btn btn-primary btn-sm', onclick: () => bdEdit(false) }, ic('check'), h('span', { text: 'Done' })));
    bar._undo = undo;
    R.els.panel.append(bar);
    BDR.bar = bar;
  }

  /* ---------- pointer moving and resizing ---------- */
  function bdEditor(grid) {
    const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    let press = null, op = null;
    const frames = () => [...grid.querySelectorAll(':scope > .fvb-w')];
    const glide = fn => { if (!MK.reduced() && typeof homeFlip === 'function') homeFlip(grid, fn); else fn(); };
    const boxOf = f => { const r = f.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; };
    function onDown(e) {
      if (e.button !== 0 || op || e.ctrlKey || e.metaKey || e.altKey) return;
      const fr = e.target.closest('.fvb-w');
      if (!fr || fr.parentElement !== grid) return;
      const rs = e.target.closest('.hg-rs');
      if (!rs) {
        if (e.target.closest('.hg-x, .hg-chrome, input, select, textarea, a[href]')) return;
        if (coarse && !e.target.closest('.hg-grip')) return;   // touch: drag by the grip so the page still scrolls
      } else { e.preventDefault(); e.stopPropagation(); }
      press = { fr, rs: !!rs, x: e.clientX, y: e.clientY };
      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('pointerup', onUp, true);
      window.addEventListener('pointercancel', onCancel, true);
    }
    function onMove(e) {
      if (!press) return;
      if (!op) {
        if (!press.rs && Math.hypot(e.clientX - press.x, e.clientY - press.y) < 5) return;
        op = press.rs ? startResize(press) : startMove(press);
        if (!op) { cleanup(); return; }
      }
      e.preventDefault();
      if (op.kind === 'move') moveTo(e.clientX, e.clientY); else resizeTo(e.clientX);
    }
    function cleanup() {
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onCancel, true);
      press = null;
    }
    function begin() { document.body.classList.add('is-sorting'); if (typeof closePopovers === 'function') closePopovers(); }
    function end() {
      document.body.classList.remove('is-sorting');
      const swallow = ev => { ev.stopPropagation(); ev.preventDefault(); };   // the click after the drag lands on nothing
      window.addEventListener('click', swallow, true);
      setTimeout(() => window.removeEventListener('click', swallow, true), 0);
    }
    function startMove(p) {
      const fr = p.fr, r = fr.getBoundingClientRect();
      begin();
      const lift = fr.cloneNode(true);
      lift.removeAttribute('data-flip'); lift.removeAttribute('tabindex');
      for (const c of lift.querySelectorAll('canvas')) c.remove();
      lift.classList.add('fvb-lift'); lift.setAttribute('aria-hidden', 'true');
      const k = Math.max(0.4, Math.min(1, 340 / r.height, 560 / r.width));
      const dx = p.x - r.left, dy = p.y - r.top;
      Object.assign(lift.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', margin: '0', pointerEvents: 'none', zIndex: 'var(--z-tooltip, 1000)', transformOrigin: `${dx}px ${dy}px` });
      lift.style.transform = `scale(${(k * (MK.reduced() ? 1 : 1.02)).toFixed(3)})${MK.reduced() ? '' : ' rotate(0.6deg)'}`;
      document.body.append(lift);
      fr.classList.add('is-ghost');
      return { kind: 'move', fr, lift, dx, dy, order0: frames().map(f => f.dataset.wid), next0: fr.nextSibling, at: null };
    }
    function moveTo(x, y) {
      const o = op;
      o.lift.style.left = (x - o.dx) + 'px'; o.lift.style.top = (y - o.dy) + 'px';
      if (o.at && Math.hypot(x - o.at.x, y - o.at.y) < 10) return;
      const others = frames().filter(f => f !== o.fr);
      if (typeof homeShelfDropIndex !== 'function') return;
      const i = homeShelfDropIndex(others.map(boxOf), x, y, grid.clientWidth);
      if (i === null) return;
      if (i === frames().indexOf(o.fr)) return;
      const ref = i < others.length ? others[i] : (others.length ? others[others.length - 1].nextSibling : null);
      glide(() => grid.insertBefore(o.fr, ref));
      o.at = { x, y };
    }
    function finishMove(o, commit) {
      if (!commit) glide(() => grid.insertBefore(o.fr, o.next0 && o.next0.parentNode === grid ? o.next0 : null));
      const ids = frames().map(f => f.dataset.wid);
      const done = () => {
        o.lift.remove(); o.fr.classList.remove('is-ghost');
        if (commit && ids.join() !== o.order0.join()) {
          const L = boardGet(); const by = new Map(L.w.map(w => [w.i, w]));
          boardSave(bdCustom(Object.assign({}, L, { w: ids.map(id => by.get(id)).filter(Boolean) })), null, { quiet: true });
          bdFocus(o.fr.dataset.wid);
        }
      };
      if (MK.reduced() || typeof o.lift.animate !== 'function') { done(); return; }
      const to = o.fr.getBoundingClientRect();
      const a = o.lift.animate([{ left: o.lift.style.left, top: o.lift.style.top, transform: o.lift.style.transform }, { left: to.left + 'px', top: to.top + 'px', transform: 'none' }],
        { duration: 300, easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)', fill: 'forwards' });
      let fired = false; const once = () => { if (!fired) { fired = true; done(); } };
      a.finished.then(once, once); setTimeout(once, 420);
    }
    function startResize(p) {
      const fr = p.fr, d = bwDef(fr.dataset.t); if (!d) return null;
      begin();
      fr.classList.add('is-resizing');
      const gap = parseFloat(getComputedStyle(grid).columnGap) || 16;
      const colW = (grid.clientWidth - 11 * gap) / 12;
      const tip = h('span', { class: 'hg-rs-tip', 'aria-hidden': 'true' });
      fr.append(tip);
      const r = fr.getBoundingClientRect();
      const o = { kind: 'resize', fr, d, gap, colW, tip, size0: fr.dataset.size, size: fr.dataset.size, offX: r.right - p.x };
      showTip(o);
      return o;
    }
    function showTip(o) { o.tip.textContent = `${BD_SIZE_LONG[o.size]} · ${BD_SIZE_COLS[o.size]} of 12 columns`; }
    function resizeTo(x) {
      const o = op, r = o.fr.getBoundingClientRect();
      const cols = (x + o.offX - r.left + o.gap) / (o.colW + o.gap);
      let best = o.size, bd = Infinity;
      for (const s of o.d.sizes) { const dd = Math.abs(BD_SIZE_COLS[s] - cols) - (s === o.size ? 0.35 : 0); if (dd < bd) { bd = dd; best = s; } }
      if (best === o.size) return;
      o.size = best;
      glide(() => bdSetSpan(o.fr, best));
      bdPaintSizes(o.fr); showTip(o);
    }
    function finishResize(o, commit) {
      o.fr.classList.remove('is-resizing'); o.tip.remove();
      if (!commit || o.size === o.size0) { if (o.size !== o.size0) glide(() => bdSetSpan(o.fr, o.size0)); bdPaintSizes(o.fr); return; }
      bdSetSize(o.fr.dataset.wid, o.size);
    }
    function finish(commit) { const o = op; op = null; if (!o) return; end(); if (o.kind === 'move') finishMove(o, commit); else finishResize(o, commit); }
    function onUp() { const was = !!op; cleanup(); if (was) finish(true); }
    function onCancel() { const was = !!op; cleanup(); if (was) finish(false); }
    function onKey(e) {
      if (e.key === 'Escape' && op) { e.stopPropagation(); e.preventDefault(); cleanup(); finish(false); return; }
      const fr = e.target && e.target.closest ? e.target.closest('.fvb-w') : null;
      if (!fr || e.target !== fr || fr.parentElement !== grid) return;
      const wid = fr.dataset.wid, L = boardGet(), i = L.w.findIndex(w => w.i === wid), w = L.w[i];
      if (!w) return;
      const d = bwDef(w.t);
      if (/^Arrow(Left|Right|Up|Down)$/.test(e.key)) {
        e.preventDefault();
        const fwd = e.key === 'ArrowRight' || e.key === 'ArrowDown';
        if (e.shiftKey) {
          const j = d.sizes.indexOf(w.s) + (fwd ? 1 : -1);
          if (j < 0 || j >= d.sizes.length) { toast(`${d.title} is already as ${fwd ? 'wide' : 'narrow'} as it goes`); return; }
          bdSetSize(wid, d.sizes[j]);
        } else if (!bdMove(wid, i + (fwd ? 1 : -1))) { toast(`${d.title} is already ${fwd ? 'last' : 'first'}`); return; }
        bdFocus(wid);
      } else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); bdRemove(wid); }
      else if (e.key === 'Enter') { e.preventDefault(); const b = fr.querySelector('.hg-chrome .btn-icon'); if (b) bdSettings(b, wid); }
    }
    const noNative = e => { if (e.target.closest && e.target.closest('.fvb-w')) e.preventDefault(); };
    grid.addEventListener('pointerdown', onDown);
    grid.addEventListener('dragstart', noNative);
    document.addEventListener('keydown', onKey, true);
    return {
      destroy() {
        grid.removeEventListener('pointerdown', onDown); grid.removeEventListener('dragstart', noNative);
        document.removeEventListener('keydown', onKey, true);
        cleanup();
        if (op) { const o = op; op = null; document.body.classList.remove('is-sorting'); if (o.lift) o.lift.remove(); if (o.fr) o.fr.classList.remove('is-ghost', 'is-resizing'); }
      },
    };
  }
  function bdFocus(wid) {
    requestAnimationFrame(() => { const f = BDR.grid && BDR.grid.querySelector(`:scope > .fvb-w[data-wid="${CSS.escape(wid)}"]`); if (f) { try { f.focus({ preventScroll: false }); } catch (e) { /* old browser */ } } });
  }

  /* ---------- Add widget: the gallery ---------- */
  const BD_GAL_W = { s: 365, m: 556, l: 746, xl: 1128 };
  function bdGallery(pick) {
    if (typeof openDialog !== 'function') return;
    const L0 = boardGet();
    const count = t => boardGet().w.filter(w => w.t === t).length;
    let sel = bwDef(pick) || BW_DEFS.find(d => !count(d.t)) || BW_DEFS[0];
    let size = sel.size;
    let added = 0;
    openDialog({
      title: 'Add a widget to My money', width: 940, resizable: false,
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
            const b = h('button', { type: 'button', class: 'hgal-item', role: 'option', 'data-t': d.t, onclick: () => { if (sel.t !== d.t) { sel = d; size = d.size; paint(); } } },
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
          if (v.length && !v.some(b => b._d.t === sel.t)) { sel = v[0]._d; size = sel.size; paint(); }
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
