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

  const PREF_KEY = 'dashboard-motion';   // legacy: 'reduced' | absent. Separate from STORAGE_KEY.
  const LEVEL_KEY = 'dashboard-motion-level';   // 'off' | 'subtle' | 'standard' | 'playful' (per device)
  const LAST_KEY = 'dashboard-motion-last';     // the level before Off (the Reduce motion switch toggles back to it)
  const D = { fast: 120, base: 180, slow: 240, slower: 320 };
  const HAS_LOGIC = typeof motionResolveLevel === 'function';   // src/app/09-motion-logic.js
  const E = {
    out: 'cubic-bezier(0.22, 1, 0.36, 1)',
    outSoft: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  };
  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  /* ---------- preference ---------- */
  const OS_KEY = 'dashboard-motion-os-override';   // '1': animate even though the OS asks for reduced motion (per device)
  /** The raw OS request (Windows: Settings > Accessibility > Visual effects > Animation effects off). */
  function osReduced() { return !!(mq && mq.matches); }
  function osOverride() { return _get(OS_KEY) === '1'; }
  /** The OS request as this page honours it: the user can choose "Animate anyway". */
  function systemReduced() { return osReduced() && !osOverride(); }
  // "Animate anyway" also has to lift the stylesheets' own
  // @media (prefers-reduced-motion: reduce) rules: they are switched to
  // "not all" while the override holds and restored when it ends.
  const _mediaOrig = new WeakMap();
  function _patchRules(rules, lift) {
    for (const r of Array.from(rules || [])) {
      if (r.media && r.cssRules) {
        const orig = _mediaOrig.has(r) ? _mediaOrig.get(r) : r.media.mediaText;
        if (/prefers-reduced-motion\s*:\s*reduce/i.test(orig)) {
          if (!_mediaOrig.has(r)) _mediaOrig.set(r, orig);
          const want = lift ? 'not all' : orig;
          if (r.media.mediaText !== want) { try { r.media.mediaText = want; } catch (e) { /* read-only rule */ } }
        }
      }
      if (r.cssRules) _patchRules(r.cssRules, lift);
    }
  }
  function applyMediaOverride() {
    const lift = osReduced() && osOverride();
    if (!lift && !_mediaPatched) return;
    _mediaPatched = lift;
    for (const sh of Array.from(document.styleSheets || [])) { try { _patchRules(sh.cssRules, lift); } catch (e) { /* cross-origin sheet */ } }
  }
  let _mediaPatched = false;
  function setOsOverride(on) {
    _set(OS_KEY, on ? '1' : null);
    if (on) _mediaPatched = true;
    applyMediaOverride();
    applyAttr();
    syncToggle();
  }
  function _get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function _set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  let _sessionLevel = null;    // when storage is blocked, the choice still holds for this session
  /** The chosen level (Settings > Animations > Intensity), ignoring the OS setting. */
  function chosenLevel() {
    const stored = _sessionLevel || _get(LEVEL_KEY);
    if (HAS_LOGIC) return motionResolveLevel({ stored, legacy: _get(PREF_KEY) });
    return stored || (_get(PREF_KEY) === 'reduced' ? 'off' : 'standard');
  }
  /** The effective level: 'reduced' when the OS asks for it, else the chosen one. */
  function level() { return systemReduced() ? 'reduced' : chosenLevel(); }
  function profile(l) {
    if (HAS_LOGIC) return motionProfile(l || level());
    return { name: 'standard', k: 1, dk: 1, sk: 1, cap: 6, budget: 400, loops: 6, move: true, fade: true, burst: 2, particles: 1 };
  }
  function userReduced() { return chosenLevel() === 'off'; }
  function prefersReduced() { return systemReduced() || userReduced(); }
  function applyAttr() {
    const html = document.documentElement;
    html.setAttribute('data-motion', prefersReduced() ? 'reduced' : 'full');
    html.setAttribute('data-motion-level', level());
  }
  function setLevel(l) {
    if (HAS_LOGIC ? !MOTION_LEVELS.includes(l) : !/^(off|subtle|standard|playful)$/.test(l)) return;
    const prev = chosenLevel();
    if (l === 'off' && prev !== 'off') _set(LAST_KEY, prev);
    _sessionLevel = l;
    _set(LEVEL_KEY, l);
    _set(PREF_KEY, l === 'off' ? 'reduced' : null);   // older builds read the legacy switch
    applyAttr();
    syncToggle();
  }
  /** The Reduce motion switch: Off, or back to the level before Off. */
  function setReduced(on) {
    if (on) setLevel('off');
    else setLevel(_get(LAST_KEY) && _get(LAST_KEY) !== 'off' ? _get(LAST_KEY) : 'standard');
  }

  /* ---------- tiny WAAPI wrapper (durations and delays scale with the level) ---------- */
  function animate(el, keyframes, opts) {
    if (!el || typeof el.animate !== 'function' || prefersReduced()) return null;
    const k = profile().k || 1;
    let o = opts;
    if (k !== 1 && opts && typeof opts === 'object') {
      o = Object.assign({}, opts);
      if (typeof o.duration === 'number') o.duration = Math.round(o.duration * k);
      if (typeof o.delay === 'number') o.delay = Math.round(o.delay * k);
    }
    try { return el.animate(keyframes, o); } catch (e) { return null; }
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
    const distance = (opts.distance != null ? opts.distance : 6) * (profile().dk || 0);
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

  /* ---------- navigation kinds (MOTION_SYSTEM §6: the Settings replay fix) ----------
     setView() decides the kind (motionNavKind): 'page' runs the View Transition and the page
     entrance; 'sub' (same section) re-renders with NO transition, and afterMain() animates only
     the changing pane; 'same' never gets here (a no-op). renderMain() classifies every render
     itself as well (motionRenderKind), so mode changes that bypass setView behave the same. */
  let _navHint = null;          // {kind, dir} from navigate(), read by afterMain()
  let _swapHint = null;         // {region, dir} from hint(): a period step (calendar) in the same view
  function navigate(update, o) {
    o = o || {};
    _navHint = { kind: o.kind || 'page', dir: o.dir || 0, at: performance.now() };
    if (o.kind === 'sub') { update(); return; }
    viewTransition(update);
  }
  /** A same-view change that should still slide (calendar next / previous): call before render(). */
  function hint(o) { _swapHint = o ? { region: o.region, dir: o.dir || 0, at: performance.now() } : null; }
  function scrollTopIfScrolled(sc) {
    sc = sc || document.getElementById('main');
    if (sc && sc.scrollTop > 0) sc.scrollTo({ top: 0, behavior: prefersReduced() ? 'auto' : 'smooth' });
  }

  // The pane that changes with a sub-view, per section (first match wins). Everything outside it
  // (nav lists, tab bars, toolbars, the rail) is chrome and never re-animates.
  const SUB_REGIONS = ['[data-m-region="content"]', '.set-main', '.rv-body', '.ppl-panel', '.cal-body', '.files-body', '.tags-main'];
  function _region(main, sel) {
    if (sel) return main.querySelector(sel);
    for (const s of SUB_REGIONS) { const el = main.querySelector(s); if (el) return el; }
    return null;
  }
  /** The new pane arrives from the travel side (Standard: 12 px slide; Subtle: fade + 6 px; Reduced: 150 ms fade). */
  function swapIn(el, dir) {
    if (!el) return;
    const q = profile();
    if (systemReduced()) {        // Reduced: a short crossfade, no movement
      try { el.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' }); } catch (e) { /* old engine */ }
      return;
    }
    if (prefersReduced()) return;
    const d = (q.sub === 'fade' ? 6 : 12) * (q.dk || 1);
    const from = dir ? `translateX(${dir > 0 ? d : -d}px)` : `translateY(${Math.round(d / 2)}px)`;
    animate(el, [{ opacity: 0, transform: from }, { opacity: 1, transform: 'none' }], { duration: D.slow, easing: E.out });
  }

  /* ---------- FLIP for keyed lists (task rows, board cards) ----------
     beforeMain() measures every visible row by key before #main-body is rebuilt; afterMain()
     measures again and glides the rows that moved (sort, group, filter, search, drag, insert,
     remove), lets new rows enter, and leaves the rest alone (a plain save moves nothing). */
  const FLIP_SEL = '.task[data-id], .task-group > h3';
  let _flipBefore = null, _flipSkip = false, _flipKind = null, _titleBefore = null, _titleWas = null;   // the header title (as of the last render) only moves when its words change
  function _flipKey(el) {
    if (el.matches('.task[data-id]')) return 't:' + el.dataset.id;
    return 'g:' + (el.textContent || '').trim().slice(0, 60);
  }
  function _flipMeasure(main) {
    const out = {}, els = {};
    const vh = window.innerHeight || 900;
    const list = main.querySelectorAll(FLIP_SEL);
    if (list.length > 400) return null;          // a huge list: no per-row motion
    for (const el of list) {
      if (el.closest('.m-ghost')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      if (r.bottom < -40 || r.top > vh + 40) continue;
      const k = _flipKey(el);
      if (out[k]) continue;
      out[k] = { top: r.top, left: r.left }; els[k] = el;
    }
    return { rects: out, els };
  }
  /** Called by renderMain() before it empties #main-body. kind: 'page' | 'sub' | null. */
  function beforeMain(main, kind) {
    _flipKind = kind;
    _flipBefore = null;
    if (!main || prefersReduced() || kind === 'page' || _flipSkip) return;
    try { const m = _flipMeasure(main); _flipBefore = m && Object.keys(m.rects).length ? m.rects : null; } catch (e) { _flipBefore = null; }
  }
  function _runFlip(main, kind) {
    const before = _flipBefore; _flipBefore = null;
    if (!before || prefersReduced() || !HAS_LOGIC) return;
    const m = _flipMeasure(main);
    if (!m) return;
    const plan = motionFlipPlan(before, m.rects, { nav: kind });
    const q = profile();
    for (const mv of plan.moves) {
      const el = m.els[mv.key];
      animate(el, [{ transform: `translate(${mv.dx}px, ${mv.dy}px)` }, { transform: 'none' }], { duration: D.slower, easing: E.out });
    }
    const n = plan.enters.length;
    plan.enters.forEach((k, i) => {
      const el = m.els[k];
      const delay = (kind === 'sub' ? 0 : 110) + motionStaggerDelay(i, n, 'row', q);
      animate(el, [{ opacity: 0, transform: `translateY(${Math.round(8 * (q.dk || 1))}px)` }, { opacity: 1, transform: 'none' }],
        { duration: D.slow + 60, delay, easing: E.out, fill: 'backwards' });
    });
  }
  /** Called by render() after everything is painted. */
  function afterMain(main, kind) {
    main = main || document.getElementById('main-body');
    if (!main) return;
    const nav = _navHint && performance.now() - _navHint.at < 1500 ? _navHint : null;
    _navHint = null;
    const swap = _swapHint && performance.now() - _swapHint.at < 1500 ? _swapHint : null;
    _swapHint = null;
    { const t = document.getElementById('view-title'); const was = _titleBefore; _titleBefore = t ? t.textContent : null; _titleWas = was; }
    if (_flipSkip) { _flipBefore = null; return; }
    if (kind === 'page') { _flipBefore = null; return; }
    const rows = !!main.querySelector('.task[data-id], .task-view, .kanban');
    if (kind === 'sub') {
      const dir = nav ? nav.dir : 0;
      const title = document.getElementById('view-title');
      if (title && title.textContent !== _titleWas) animate(title, [{ opacity: 0, transform: `translateX(${dir >= 0 ? 6 : -6}px)` }, { opacity: 1, transform: 'none' }], { duration: D.slow, easing: E.out });
      if (rows) _runFlip(main, 'sub');
      else { _flipBefore = null; swapIn(_region(main), dir); }
      return;
    }
    if (swap) { _flipBefore = null; swapIn(_region(main, swap.region), swap.dir); return; }
    if (rows) _runFlip(main, null); else _flipBefore = null;
  }
  /** Run fn() with list FLIP off (a completion ghost or an expanding row animates instead). */
  function withoutFlip(fn) {
    const was = _flipSkip; _flipSkip = true;
    try { return fn(); } finally { _flipSkip = was; }
  }

  /* ---------- theme switch: one crossfade (C9), not 14 stray colour transitions ---------- */
  /**
   * The light/dark switch. o: {kind: 'circle'|'wipe'|'fade', ms, origin: {x, y}, dark} (14-shell.js
   * passes the day's 'theme-switch' variant from the animation library). Off or a hidden tab: instant.
   * OS reduced motion: a short crossfade instead. The level scales the duration (~500 ms Standard).
   */
  function themeSwap(apply, o) {
    o = o || {};
    const html = document.documentElement;
    if (userReduced() || document.hidden || typeof document.startViewTransition !== 'function') { apply(); return; }
    const red = systemReduced();
    const kind = red ? 'fade' : (/^(circle|wipe|fade)$/.test(o.kind) ? o.kind : 'circle');
    const ms = red ? 180 : Math.round(Math.max(200, Math.min(900, (o.ms || 500) * (profile().k || 1))));
    const cls = ['m-theme-vt', 'm-theme-' + kind, o.dark === false ? 'm-theme-to-light' : 'm-theme-to-dark'];
    const w = window.innerWidth || 1200, h = window.innerHeight || 800;
    const x = o.origin ? o.origin.x : w - 24, y = o.origin ? o.origin.y : 24;
    html.style.setProperty('--tt-x', Math.round(x) + 'px');
    html.style.setProperty('--tt-y', Math.round(y) + 'px');
    html.style.setProperty('--tt-r', Math.ceil(Math.hypot(Math.max(x, w - x), Math.max(y, h - y))) + 'px');
    html.style.setProperty('--tt-ms', ms + 'ms');
    html.classList.add(...cls);
    let t;
    const clear = () => { html.classList.remove(...cls); ['--tt-x', '--tt-y', '--tt-r', '--tt-ms'].forEach(p => html.style.removeProperty(p)); };
    try { t = document.startViewTransition(() => { apply(); }); }
    catch (e) { apply(); clear(); return; }
    const done = clear;
    ['ready', 'updateCallbackDone'].forEach(k => t[k] && t[k].catch(() => {}));
    if (t.finished) t.finished.then(done, done); else setTimeout(done, ms + 120);
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

    withoutFlip(commit);              // the ghost below animates the gap; the list FLIP stays out of it

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
      const closed = Array.from(expandedPrev).filter(id => !exp.has(id));
      if (opened.length || closed.length) _flipBefore = null;   // the expand animates the rows below; no FLIP on top
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
  applyMediaOverride();
  // Styles added later (the animation packs' CSS) get the same treatment.
  if (window.MutationObserver && document.head) new MutationObserver(() => { if (osReduced() && osOverride()) applyMediaOverride(); }).observe(document.head, { childList: true });
  if (mq) {
    const onChange = () => { applyMediaOverride(); applyAttr(); syncToggle(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }
  window.addEventListener('storage', e => { if (e.key === PREF_KEY) { applyAttr(); syncToggle(); } });

  window.Motion = {
    tokens: { durations: Object.assign({}, D), easings: Object.assign({}, E) },
    prefersReduced, setReduced, animate, countUp, stagger, viewTransition,
    completeTask, expand, collapse, decorateSidebar, afterRender,
    level, chosenLevel, setLevel, profile, systemReduced, osReduced, osOverride, setOsOverride,
    navigate, hint, scrollTopIfScrolled, swapIn, beforeMain, afterMain, withoutFlip, themeSwap,
  };

  // script.js rendered once before this file loaded: catch up.
  try {
    decorateSidebar(document.getElementById('sidebar'));
    afterRender();
    stagger(document.getElementById('main-body'));
  } catch (e) { console.warn('[motion] init', e); }
})();
