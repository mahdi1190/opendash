/* ============================================================
   MOTION — calm, short, never-in-the-way animation utilities.
   Exposes window.Motion. Loaded after script.js (its own <script> block),
   so script.js only ever calls it through `window.Motion && Motion.x(...)`.

   Public API
     Motion.prefersReduced()            -> true if OS asks for reduced motion
                                           or the user flipped the sidebar toggle
     Motion.setReduced(bool)            -> persist the user toggle (localStorage)
     Motion.countUp(el, to, opts)       -> animate a number in el.textContent
         opts: { from, duration, decimals, prefix, suffix, format(n), locale }
     Motion.stagger(container, opts)    -> one-off fade/rise of the visible items
         opts: { selector, step, max, duration, distance }
     Motion.viewTransition(update)      -> run update() inside a View Transition
     Motion.completeTask(rowEl, commit) -> check pop + strike + collapse ghost;
                                           commit() (the data change) runs at once
     Motion.expand(el) / Motion.collapse(el, done)
     Motion.decorateSidebar(sidebarEl)  -> gliding active indicator + footer toggle
     Motion.afterRender()               -> new-task highlight, expand-in
     Motion.animate(el, keyframes, opts)-> WAAPI wrapper that respects reduced motion
     Motion.tokens                      -> { durations, easings }
   ============================================================ */
(function () {
  'use strict';

  const PREF_KEY = 'dashboard-motion';   // 'reduced' | absent. Separate from STORAGE_KEY.
  const D = { fast: 120, base: 180, slow: 240, slower: 320 };
  const E = {
    out: 'cubic-bezier(0.22, 1, 0.36, 1)',
    outSoft: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  };
  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  /* ---------- preference ---------- */
  function systemReduced() { return !!(mq && mq.matches); }
  function userReduced() {
    try { return localStorage.getItem(PREF_KEY) === 'reduced'; } catch (e) { return false; }
  }
  function prefersReduced() { return systemReduced() || userReduced(); }
  function applyAttr() {
    document.documentElement.setAttribute('data-motion', prefersReduced() ? 'reduced' : 'full');
  }
  function setReduced(on) {
    try {
      if (on) localStorage.setItem(PREF_KEY, 'reduced');
      else localStorage.removeItem(PREF_KEY);
    } catch (e) { /* storage blocked: the attribute still applies for this session */ }
    applyAttr();
    syncToggle();
  }

  /* ---------- tiny WAAPI wrapper ---------- */
  function animate(el, keyframes, opts) {
    if (!el || typeof el.animate !== 'function' || prefersReduced()) return null;
    try { return el.animate(keyframes, opts); } catch (e) { return null; }
  }

  /* ---------- countUp ---------- */
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  function countUp(el, to, opts) {
    opts = opts || {};
    if (!el) return Promise.resolve();
    const target = Number(to);
    const from = Number(opts.from != null ? opts.from : 0);
    const decimals = opts.decimals != null ? opts.decimals
      : (Number.isInteger(target) && Number.isInteger(from) ? 0 : 2);
    const locale = opts.locale || 'en-GB';
    const fmt = typeof opts.format === 'function' ? opts.format
      : n => (opts.prefix || '') + n.toLocaleString(locale, {
          minimumFractionDigits: decimals, maximumFractionDigits: decimals,
        }) + (opts.suffix || '');
    const token = {};
    el._mCount = token;
    if (!isFinite(target)) { el.textContent = fmt(0); return Promise.resolve(); }
    if (prefersReduced() || from === target) { el.textContent = fmt(target); return Promise.resolve(); }
    const dur = Math.max(0, opts.duration != null ? opts.duration : D.slower + 160);
    return new Promise(resolve => {
      const t0 = performance.now();
      function frame(now) {
        if (el._mCount !== token) return resolve();            // superseded by a newer call
        const p = Math.min(1, (now - t0) / (dur || 1));
        const v = from + (target - from) * easeOutCubic(p);
        el.textContent = fmt(p >= 1 ? target : v);
        if (p < 1) requestAnimationFrame(frame); else resolve();
      }
      el.textContent = fmt(from);
      requestAnimationFrame(frame);
    });
  }

  /* ---------- stagger ---------- */
  const STAGGER_SEL = [
    '.progress-row', '.week-bar', '.cal-events', '.quick-add', '.templates-row',
    '.task-group > h3', '.task', '.kanban-col', '.cal-view', '.wins-section', '.stat-card',
    '.bin-row', '.empty-state', '[data-stagger]',
  ].join(',');

  function stagger(container, opts) {
    opts = opts || {};
    if (!container || prefersReduced()) return;
    let items = Array.from(container.querySelectorAll(opts.selector || STAGGER_SEL));
    if (!items.length) {
      // Generic views (finance, triage, person): use the top-level blocks, and
      // descend through a single wrapper (e.g. .fin-root) to reach its sections.
      let root = container;
      while (root.children.length === 1 && root.firstElementChild.children.length > 1) root = root.firstElementChild;
      items = Array.from(root.children);
    }
    const set = new Set(items);
    const vh = window.innerHeight || 900;
    const max = opts.max || 14;
    const step = opts.step != null ? opts.step : 22;
    const distance = opts.distance != null ? opts.distance : 6;
    const duration = opts.duration || D.slow;
    const picked = [];
    for (const el of items) {
      // Skip nested matches (a .task inside an animated .kanban-col) and
      // anything off-screen: only what you can see gets the entrance.
      let p = el.parentElement, nested = false;
      while (p && p !== container) { if (set.has(p)) { nested = true; break; } p = p.parentElement; }
      if (nested) continue;
      const r = el.getBoundingClientRect();
      if (r.height === 0 && r.width === 0) continue;
      if (r.top > vh || r.bottom < 0) continue;
      picked.push(el);
      if (picked.length >= max) break;
    }
    picked.forEach((el, i) => {
      animate(el, [
        { opacity: 0, transform: `translateY(${distance}px)` },
        { opacity: 1, transform: 'none' },
      ], { duration, delay: i * step, easing: E.out, fill: 'backwards' });
    });
  }

  /* ---------- view transitions ---------- */
  function viewTransition(update) {
    if (prefersReduced() || document.hidden || typeof document.startViewTransition !== 'function') {
      update();
      if (!prefersReduced()) {
        const main = document.getElementById('main');
        if (main) {           // plain fallback: a quick fade of the main area
          main.classList.remove('m-view-enter'); void main.offsetWidth; main.classList.add('m-view-enter');
          setTimeout(() => main.classList.remove('m-view-enter'), D.slow + 60);
        }
      }
      return;
    }
    try {
      const t = document.startViewTransition(() => { update(); });
      // A skipped/aborted transition is fine — the DOM update still runs.
      ['finished', 'ready', 'updateCallbackDone'].forEach(k => t[k] && t[k].catch(() => {}));
    } catch (e) { update(); }
  }

  /* ---------- task completion ---------- */
  function rowFor(id) {
    if (!id) return null;
    return document.querySelector(`#main-body .task[data-id="${CSS.escape(id)}"]`);
  }
  function siblingTaskId(block, dir) {
    let s = dir < 0 ? block.previousElementSibling : block.nextElementSibling;
    while (s) {
      const t = s.matches('.task[data-id]') ? s : s.querySelector(':scope > .task[data-id]');
      if (t) return t.dataset.id;
      s = dir < 0 ? s.previousElementSibling : s.nextElementSibling;
    }
    return null;
  }
  function flashClass(el, cls, ms) {
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms);
  }

  // The data update (commit) runs immediately — only the visual is delayed:
  // if the row leaves the view, a non-interactive clone stands in its place,
  // pops its check, strikes the title, then fades and collapses.
  function completeTask(row, commit) {
    if (!row || !row.isConnected || prefersReduced() || !row.dataset || !row.dataset.id) { commit(); return; }
    const id = row.dataset.id;
    const block = row.closest('.task-block') || row;
    const prevId = siblingTaskId(block, -1);
    const nextId = siblingTaskId(block, +1);
    const ghost = row.cloneNode(true);

    commit();

    const fresh = rowFor(id);
    if (fresh) {                       // still listed (e.g. All Tasks): just pop + strike in place
      if (fresh.classList.contains('done')) flashClass(fresh, 'm-just-done', 700);
      return;
    }
    const nextEl = rowFor(nextId), prevEl = rowFor(prevId);
    const anchorNext = nextEl && (nextEl.closest('.task-block') || nextEl);
    const anchorPrev = prevEl && (prevEl.closest('.task-block') || prevEl);
    if (!anchorNext && !anchorPrev) return;

    ghost.removeAttribute('data-id');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.draggable = false;
    ghost.classList.remove('selected', 'kb-cursor', 'multi-selected', 'dragging', 'drag-over', 'expanded');
    ghost.classList.add('m-ghost', 'done');
    const cb = ghost.querySelector('.checkbox');
    if (cb) cb.className = 'checkbox done';
    if (anchorNext) anchorNext.parentNode.insertBefore(ghost, anchorNext);
    else anchorPrev.after(ghost);

    const cs = getComputedStyle(ghost);
    const h = ghost.offsetHeight;
    const a = ghost.animate([
      { height: h + 'px', opacity: 0.55, marginBottom: cs.marginBottom, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, transform: 'none' },
      { height: '0px', opacity: 0, marginBottom: '0px', paddingTop: '0px', paddingBottom: '0px', transform: 'translateX(8px)' },
    ], { duration: D.slow, delay: 420, easing: E.inOut, fill: 'forwards' });
    const done = () => { if (ghost.isConnected) ghost.remove(); };
    a.finished.then(done, done);
    setTimeout(done, 1200);            // belt and braces if the animation is cancelled
  }

  /* ---------- expand / collapse ---------- */
  function expand(el) {
    if (!el || prefersReduced()) return;
    const cs = getComputedStyle(el);
    const h = el.offsetHeight;
    if (!h) return;
    el.style.overflow = 'hidden';
    const a = animate(el, [
      { height: '0px', opacity: 0, paddingTop: '0px', paddingBottom: '0px' },
      { height: h + 'px', opacity: 1, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom },
    ], { duration: D.slow, easing: E.out });
    const clear = () => { el.style.overflow = ''; };
    if (a) a.finished.then(clear, clear); else clear();
  }
  function collapse(el, done) {
    if (!el || !el.isConnected || prefersReduced()) { done && done(); return; }
    const cs = getComputedStyle(el);
    el.style.overflow = 'hidden';
    const a = animate(el, [
      { height: el.offsetHeight + 'px', opacity: 1, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom },
      { height: '0px', opacity: 0, paddingTop: '0px', paddingBottom: '0px' },
    ], { duration: D.base, easing: E.inOut, fill: 'forwards' });
    let called = false;
    const fin = () => { if (called) return; called = true; done && done(); };
    if (a) a.finished.then(fin, fin); else fin();
  }

  /* ---------- sidebar: gliding indicator + Reduce motion toggle ---------- */
  let lastInd = null;   // { top, height } of the indicator after the previous render
  function placeIndicator(ind, pos) {
    ind.style.transform = `translateY(${pos.top}px)`;
    ind.style.height = pos.height + 'px';
  }
  function decorateSidebar(sb) {
    if (!sb) return;
    sb.classList.add('m-has-indicator');
    let ind = sb.querySelector(':scope > .nav-indicator');
    if (!ind) {
      ind = document.createElement('div');
      ind.className = 'nav-indicator';
      ind.setAttribute('aria-hidden', 'true');
      sb.prepend(ind);
    }
    if (!sb.querySelector(':scope > .sidebar-footer')) sb.appendChild(buildToggle());

    const active = sb.querySelector('.nav-item.active');
    if (!active || !sb.offsetWidth) { ind.classList.remove('on'); return; }
    const cur = { top: active.offsetTop, height: active.offsetHeight };
    const wasOn = ind.classList.contains('on');
    ind.style.transition = 'none';
    placeIndicator(ind, lastInd && !wasOn ? lastInd : cur);
    ind.classList.add('on');
    void ind.offsetWidth;              // commit the start position
    ind.style.transition = '';
    placeIndicator(ind, cur);          // ...and glide from there
    lastInd = cur;
  }

  function buildToggle() {
    const foot = document.createElement('div');
    foot.className = 'sidebar-section sidebar-footer';
    foot.innerHTML = '<label class="m-toggle"><span class="m-toggle-label">Reduce motion</span>'
      + '<input type="checkbox" role="switch" aria-label="Reduce motion"><span class="m-switch" aria-hidden="true"></span></label>';
    const input = foot.querySelector('input');
    input.addEventListener('change', () => setReduced(input.checked));
    syncToggle(foot);
    return foot;
  }
  function syncToggle(scope) {
    const root = scope || document;
    root.querySelectorAll('.m-toggle').forEach(lbl => {
      const input = lbl.querySelector('input');
      const sys = systemReduced();
      input.checked = prefersReduced();
      input.disabled = sys;
      lbl.classList.toggle('is-locked', sys);
      lbl.title = sys
        ? 'Your system setting asks for reduced motion, so animations are off.'
        : 'Turn interface animations down to the minimum (saved on this device).';
    });
  }

  /* ---------- after every render: new-task highlight + expand-in ---------- */
  let knownIds = null, lastView = null, expandedPrev = new Set();
  const NEW_MS = 1400;
  const newSince = new Map();          // task id -> time first highlighted
  // Re-apply the highlight after a re-render, resuming where it left off
  // (negative delay), so a save or tick mid-glow doesn't cut it short.
  function highlightNew(row, id, now) {
    const t0 = newSince.get(id);
    const elapsed = now - t0;
    if (elapsed >= NEW_MS) { newSince.delete(id); return; }
    if (elapsed > 30) row.style.animationDelay = `-${Math.round(elapsed)}ms`;
    row.classList.add('m-new');
    setTimeout(() => { row.classList.remove('m-new'); row.style.animationDelay = ''; }, NEW_MS - elapsed + 50);
  }
  function currentView() {
    try { return typeof state !== 'undefined' && state ? state.view + '|' + state.viewMode : null; }
    catch (e) { return null; }
  }
  function afterRender() {
    const view = currentView();
    let ids = null;
    try { if (typeof getAllItems === 'function') ids = new Set(getAllItems().map(i => i.id)); } catch (e) { ids = null; }
    const sameView = view === lastView;
    const now = performance.now();
    if (ids && knownIds && sameView && !prefersReduced()) {
      const fresh = [];
      for (const id of ids) if (!knownIds.has(id)) fresh.push(id);
      // A handful = "you just added this". Dozens at once = state adopted from
      // the file or a bulk import: don't light up the whole list.
      if (fresh.length <= 5) for (const id of fresh) newSince.set(id, now);
    }
    for (const id of Array.from(newSince.keys())) {
      const r = rowFor(id);
      if (r) highlightNew(r, id, now);
      else if (now - newSince.get(id) >= NEW_MS) newSince.delete(id);
    }
    if (ids) knownIds = ids;

    const exp = new Set();
    document.querySelectorAll('#main-body .task.expanded[data-id]').forEach(r => exp.add(r.dataset.id));
    if (sameView) {
      const opened = Array.from(exp).filter(id => !expandedPrev.has(id));
      // One or a few rows: animate. "Expand all" on a long list: just show them.
      if (opened.length <= 6) for (const id of opened) {
        const r = rowFor(id);
        const panel = r && r.parentElement && r.parentElement.querySelector(':scope > .task-expanded');
        if (panel) expand(panel);
      }
    }
    expandedPrev = exp;
    lastView = view;
  }

  /* ---------- boot ---------- */
  applyAttr();
  if (mq) {
    const onChange = () => { applyAttr(); syncToggle(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }
  window.addEventListener('storage', e => { if (e.key === PREF_KEY) { applyAttr(); syncToggle(); } });

  window.Motion = {
    tokens: { durations: Object.assign({}, D), easings: Object.assign({}, E) },
    prefersReduced, setReduced, animate, countUp, stagger, viewTransition,
    completeTask, expand, collapse, decorateSidebar, afterRender,
  };

  // script.js rendered once before this file loaded: catch up.
  try {
    decorateSidebar(document.getElementById('sidebar'));
    afterRender();
    stagger(document.getElementById('main-body'));
  } catch (e) { console.warn('[motion] init', e); }
})();
