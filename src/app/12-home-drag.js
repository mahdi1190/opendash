/* ============================================================
   makeSortable(container, opts): pointer-based drag to reorder, with
   optional drop targets elsewhere on the page (e.g. Home's week strip).
   Owner: Home builder. Used by the top bar, its customiser and Home; any
   module may use it.

   opts:
     items        selector of the draggable children (direct or nested)
     axis         'x' | 'y'   which way the list runs (default 'y');
                  'grid' = a 2D grid (Home widgets): entering another item
                  takes its place (before it when moving back, after it when
                  moving on); hit-testing uses layout boxes, not glides
     idOf(el)     the id reported for an item (default el.dataset.id)
     handle       optional selector: only start from inside it
     reorder      false = items do not move within the list (drop targets only)
     dropTargets  optional selector of external targets (anywhere in the page)
     onReorder(ids, movedId)          the new order of every item's data-id
     onDropTarget(movedId, targetEl)  dropped on an external target
     onStart(el) / onEnd(el) / onMove(el)   (onMove: the item changed place mid-drag)
     threshold    px before a press becomes a drag (default 5)
     compactLift(itemEl) -> HTML   optional: what the lifted item turns into
                  once the pointer leaves the list (a small pill, so drop
                  targets stay visible). Escape what you put in it.
   Returns { destroy() }.

   Feel: the item lifts (a clone follows the pointer, slightly tilted), its
   slot stays as a dashed ghost and the other items glide out of the way
   (FLIP). Esc cancels. A drag never fires the item's click. Respects
   reduced motion (no glide/tilt, instant moves).
   ============================================================ */
function makeSortable(container, opts) {
  opts = Object.assign({ axis: 'y', threshold: 5, reorder: true }, opts || {});
  const reduced = () => !!(window.Motion && Motion.prefersReduced());
  const idOf = typeof opts.idOf === 'function' ? opts.idOf : (n => n.dataset.id);
  let press = null, drag = null;

  const itemsNow = () => [...container.querySelectorAll(opts.items)];

  function onDown(e) {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const item = e.target.closest(opts.items);
    if (!item || !container.contains(item)) return;
    if (opts.handle) { if (!e.target.closest(opts.handle)) return; }
    else {
      // A press on a control inside the item is a click on that control.
      const ctl = e.target.closest('input, textarea, select, a[href], [contenteditable="true"], .no-drag, button, [role="checkbox"]');
      if (ctl && ctl !== item && item.contains(ctl)) return;
    }
    press = { item, x: e.clientX, y: e.clientY, id: e.pointerId };
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onCancel, true);
  }

  function start(e) {
    const item = press.item;
    const r = item.getBoundingClientRect();
    const lift = item.cloneNode(true);
    lift.removeAttribute('id');
    lift.classList.add('sortable-lift', 'is-dragging');
    lift.setAttribute('aria-hidden', 'true');
    Object.assign(lift.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', margin: '0', pointerEvents: 'none', zIndex: 'var(--z-tooltip, 1000)' });
    if (reduced()) lift.style.transform = 'none';
    document.body.appendChild(lift);
    item.classList.add('is-ghost');
    document.body.classList.add('is-sorting');
    const order0 = itemsNow().map(idOf);
    drag = { item, lift, dx: press.x - r.left, dy: press.y - r.top, order0, target: null, nextSibling0: item.nextSibling, parent0: item.parentNode };
    if (opts.onStart) try { opts.onStart(item); } catch (err) { console.error(err); }
  }

  function onMove(e) {
    if (!press) return;
    if (!drag) {
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < opts.threshold) return;
      start(e);
    }
    e.preventDefault();
    const { lift } = drag;
    // Outside its list a big card shrinks to a small pill, so the drop
    // targets underneath stay visible.
    if (opts.compactLift) {
      const cr = container.getBoundingClientRect();
      const outside = e.clientX < cr.left || e.clientX > cr.right || e.clientY < cr.top || e.clientY > cr.bottom;
      if (outside !== !!drag.compact) setCompact(outside);
    }
    lift.style.left = (e.clientX - drag.dx) + 'px';
    lift.style.top = (e.clientY - drag.dy) + 'px';
    // External target under the pointer?
    let target = null;
    if (opts.dropTargets) {
      const under = document.elementFromPoint(e.clientX, e.clientY);
      target = under && under.closest ? under.closest(opts.dropTargets) : null;
      if (target && target.contains(drag.item)) target = null;
    }
    if (target !== drag.target) {
      if (drag.target) drag.target.classList.remove('drop-hover');
      drag.target = target;
      if (target) target.classList.add('drop-hover');
    }
    if (!target && opts.reorder !== false) reorderAt(e.clientX, e.clientY);
    autoScroll(e.clientY);
  }

  function setCompact(on) {
    const d = drag, lift = d.lift;
    if (on) {
      if (!d.full) d.full = { html: lift.innerHTML, cls: lift.className, w: lift.style.width, h: lift.style.height, dx: d.dx, dy: d.dy };
      let html = '';
      try { html = opts.compactLift(d.item); } catch (err) { console.error(err); }
      if (!html) return;
      lift.className = 'sortable-lift is-dragging sortable-pill';
      lift.innerHTML = html;
      lift.style.width = 'auto'; lift.style.height = 'auto';
      d.dx = 14; d.dy = 14;
    } else if (d.full) {
      lift.className = d.full.cls; lift.innerHTML = d.full.html;
      lift.style.width = d.full.w; lift.style.height = d.full.h;
      d.dx = d.full.dx; d.dy = d.full.dy;
    }
    d.compact = on;
  }

  /** An item's box from layout (offsets), so a sibling that is still gliding is hit where it will be. */
  function layoutBox(n) {
    const p = n.offsetParent;
    if (!p) return n.getBoundingClientRect();
    const pr = p.getBoundingClientRect();
    const left = pr.left + p.clientLeft + n.offsetLeft - p.scrollLeft, top = pr.top + p.clientTop + n.offsetTop - p.scrollTop;
    return { left, top, right: left + n.offsetWidth, bottom: top + n.offsetHeight };
  }
  /** 2D: entering another item takes its place; staying over it does nothing more (no flip-flop). */
  function gridTarget(x, y, siblings) {
    let over = null;
    for (const s of siblings) {
      const r = layoutBox(s);
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { over = s; break; }
    }
    if (over === drag.over) return undefined;
    drag.over = over;
    if (!over) return undefined;
    const all = [...drag.item.parentNode.children];
    return all.indexOf(drag.item) > all.indexOf(over) ? over : over.nextSibling;
  }
  function reorderAt(x, y) {
    const item = drag.item;
    const siblings = itemsNow().filter(n => n !== item && n.parentNode === item.parentNode && !n.hidden);
    if (!siblings.length) return;
    let want;
    if (opts.axis === 'grid') {
      want = gridTarget(x, y, siblings);
      if (want === undefined) return;
    } else {
      const horiz = opts.axis === 'x';
      let before = null;
      for (const s of siblings) {
        const r = s.getBoundingClientRect();
        const mid = horiz ? r.left + r.width / 2 : r.top + r.height / 2;
        if ((horiz ? x : y) < mid) { before = s; break; }
      }
      want = before || siblings[siblings.length - 1].nextSibling;
    }
    if (want === item || item.nextSibling === want) return;
    const moving = [...item.parentNode.children];
    const first = new Map(moving.map(n => [n, n.getBoundingClientRect()]));
    item.parentNode.insertBefore(item, want);
    if (reduced()) return;
    for (const n of moving) {
      if (n === item) continue;
      const a = first.get(n), b = n.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (!dx && !dy) continue;
      try { n.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: opts.axis === 'grid' ? 280 : 160, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }); } catch (err) { /* old browser */ }
    }
    if (opts.onMove) try { opts.onMove(item); } catch (err) { console.error(err); }
  }

  function autoScroll(y) {
    const sc = container.closest('.main, .modal-b, .tbe-list') || document.getElementById('main');
    if (!sc || opts.axis === 'x') return;
    const r = sc.getBoundingClientRect();
    if (y < r.top + 40) sc.scrollTop -= 12;
    else if (y > r.bottom - 40) sc.scrollTop += 12;
  }

  function cleanup() {
    window.removeEventListener('pointermove', onMove, true);
    window.removeEventListener('pointerup', onUp, true);
    window.removeEventListener('pointercancel', onCancel, true);
    press = null;
  }
  function finish(commit) {
    const d = drag; drag = null;
    if (!d) return;
    if (d.target) d.target.classList.remove('drop-hover');
    document.body.classList.remove('is-sorting');
    // Swallow the click that follows the pointerup.
    const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
    window.addEventListener('click', swallow, true);
    setTimeout(() => window.removeEventListener('click', swallow, true), 0);
    const restore = () => { if (d.parent0 && d.item.parentNode === d.parent0) d.parent0.insertBefore(d.item, d.nextSibling0 && d.nextSibling0.parentNode === d.parent0 ? d.nextSibling0 : null); };
    const settle = (toRect) => {
      const done = () => { d.lift.remove(); d.item.classList.remove('is-ghost'); };
      if (reduced() || !toRect) { done(); return; }
      const from = d.lift.getBoundingClientRect();
      try {
        // A Home widget lands with a slight settle (HOME_SPEC.md 5.6: 300 ms, --m-pop); list rows are quicker.
        const grid = opts.axis === 'grid';
        const a = d.lift.animate([{ transform: getComputedStyle(d.lift).transform === 'none' ? 'none' : getComputedStyle(d.lift).transform, left: from.left + 'px', top: from.top + 'px' }, { transform: 'none', left: toRect.left + 'px', top: toRect.top + 'px' }], { duration: grid ? 300 : 160, easing: grid ? 'cubic-bezier(0.34, 1.4, 0.64, 1)' : 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' });
        a.finished.then(done, done);
        setTimeout(done, 400);
      } catch (err) { done(); }
    };
    if (!commit) { restore(); settle(d.item.getBoundingClientRect()); if (opts.onEnd) opts.onEnd(d.item); return; }
    if (d.target && opts.onDropTarget) {
      const id = idOf(d.item), t = d.target;
      restore();
      d.lift.remove(); d.item.classList.remove('is-ghost');
      if (opts.onEnd) try { opts.onEnd(d.item); } catch (err) { console.error(err); }
      opts.onDropTarget(id, t);
      return;
    }
    const ids = itemsNow().map(idOf);
    const changed = ids.join('\u0000') !== d.order0.join('\u0000');
    settle(d.item.getBoundingClientRect());
    if (opts.onEnd) try { opts.onEnd(d.item); } catch (err) { console.error(err); }
    // Save (and re-render) once the lifted copy has landed, so the slot never shows twice.
    if (changed && opts.onReorder) setTimeout(() => opts.onReorder(ids, idOf(d.item)), reduced() ? 0 : opts.axis === 'grid' ? 310 : 170);
  }
  function onUp() { const was = !!drag; cleanup(); if (was) finish(true); }
  function onCancel() { const was = !!drag; cleanup(); if (was) finish(false); }
  function onKey(e) { if (e.key === 'Escape' && drag) { e.stopPropagation(); e.preventDefault(); cleanup(); finish(false); } }

  container.addEventListener('pointerdown', onDown);
  document.addEventListener('keydown', onKey, true);
  // Native HTML drag would fight the pointer drag.
  const noNative = (e) => { if (e.target.closest && e.target.closest(opts.items)) e.preventDefault(); };
  container.addEventListener('dragstart', noNative);
  return {
    destroy() {
      container.removeEventListener('pointerdown', onDown);
      container.removeEventListener('dragstart', noNative);
      document.removeEventListener('keydown', onKey, true);
      cleanup();
      if (drag) finish(false);
    },
    get dragging() { return !!drag; },
  };
}
