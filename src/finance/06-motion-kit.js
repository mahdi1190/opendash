  // @part 06-motion-kit.js · NEW (added after the split) · OWNER: C3 (motion polish); every section uses it
  // ── Motion kit (MK): DOM motion for the Finances view ─────────────────
  // Calm and short. Transform and opacity only (no layout animation); nothing
  // moves under reduced motion; loops pause off screen and while the tab is
  // hidden. Entrances play once per element (a re-render from a save, live
  // sync or a filter change reuses the element, so nothing replays).
  //
  //   MK.reduced()                 true when motion must be instant
  //   MK.once(el, key)             true the first time only, per element and key
  //   MK.inView(container, o)      reveal children once, staggered, as they scroll into view
  //                                o: { sel (default ':scope > *'), step 45, max 360, distance 10 }
  //   MK.tick(el, to, fmt, o)      number ticker: tween el's text from its last value to `to`
  //                                o: { duration, from }; instant when reduced or the tab is hidden
  //   MK.skeleton(host, o)         shimmer placeholder -> { el, done() } (done fades it out)
  //                                o: { kind: 'chart' | 'lines' | 'kpi', bars, lines, height }
  //   MK.swap(panel, dir)          tab switch: new content slides in from dir (+1 right / -1 left) and fades up
  //   MK.dir(fromId, toId)         +1 / -1 / 0 between two section ids, for MK.swap
  //   MK.pauseOffscreen(el)        CSS animation loops inside el pause while it is off screen
  //   MK.reset()                   drop the observers (the view's teardown calls it)
  const MK_IV = { io: null, els: new Set(), batch: [], raf: 0 };
  const MK_OFF = { io: null, els: new Set() };
  let mkVisWired = false;
  function mkWireVis() {
    if (mkVisWired) return;
    mkVisWired = true;
    document.addEventListener('visibilitychange', () => { if (R.root) R.root.classList.toggle('fv-tab-hidden', document.hidden); });
  }
  function mkPrune(S2) {
    for (const el of [...S2.els]) if (!el.isConnected) { try { S2.io.unobserve(el); } catch (e) { /* ignore */ } S2.els.delete(el); }
  }
  function mkIvDone(el) {
    el.classList.remove('fv-iv', 'fv-iv-in');
    el.style.removeProperty('--fv-iv-d'); el.style.removeProperty('--fv-iv-y');
  }
  function mkIvSeen(entries) {
    for (const en of entries) if (en.isIntersecting) { MK_IV.io.unobserve(en.target); MK_IV.els.delete(en.target); MK_IV.batch.push(en.target); }
    if (!MK_IV.batch.length || MK_IV.raf) return;
    MK_IV.raf = requestAnimationFrame(() => {
      MK_IV.raf = 0;
      const b = MK_IV.batch.splice(0);
      // Top to bottom, then left to right: one layout read for the whole batch.
      const pos = new Map(b.map(el => { const r = el.getBoundingClientRect(); return [el, [Math.round(r.top / 8), r.left]]; }));
      b.sort((p, q) => pos.get(p)[0] - pos.get(q)[0] || pos.get(p)[1] - pos.get(q)[1]);
      b.forEach((el, i) => {
        const cfg = el._fvIv || { step: 45, max: 360 };
        const delay = Math.min(i * cfg.step, cfg.max);
        el.style.setProperty('--fv-iv-d', delay + 'ms');
        el.classList.add('fv-iv-in');
        if (cfg.onIn) { try { cfg.onIn(el, delay); } catch (e) { /* a reveal hook never breaks the reveal */ } }
        const te =e => { if (e.target === el && e.propertyName === 'transform') { el.removeEventListener('transitionend', te); mkIvDone(el); } };
        el.addEventListener('transitionend', te);
        setTimeout(() => { el.removeEventListener('transitionend', te); mkIvDone(el); }, delay + 900);
      });
    });
  }
  const MK = {
    reduced: () => !!(R.reduced || R.noAnim),
    once(el, key) {
      if (!el) return false;
      const s = el._fvOnce || (el._fvOnce = new Set());
      key = key || 'in';
      if (s.has(key)) return false;
      s.add(key); return true;
    },
    inView(container, o) {
      o = o || {};
      if (!container) return;
      const items = [...container.querySelectorAll(o.sel || ':scope > *')].filter(el => MK.once(el, 'iv'));
      if (!items.length || MK.reduced() || typeof IntersectionObserver === 'undefined') return;
      const dist = o.distance == null ? 10 : o.distance;
      if (!MK_IV.io) MK_IV.io = new IntersectionObserver(mkIvSeen, { rootMargin: '0px 0px -4% 0px', threshold: 0.01 });
      mkPrune(MK_IV);
      for (const el of items) {
        el._fvIv = { step: o.step == null ? 45 : o.step, max: o.max == null ? 360 : o.max, onIn: typeof o.onIn === 'function' ? o.onIn : null };
        el.style.setProperty('--fv-iv-y', dist + 'px');
        el.classList.add('fv-iv');
        MK_IV.els.add(el); MK_IV.io.observe(el);
      }
    },
    tick(el, to, fmt, o) {
      o = o || {};
      if (!el) return;
      const from = el._fvVal != null ? el._fvVal : (o.from != null ? o.from : 0);
      el._fvVal = to;
      if (el._fvRaf) { cancelAnimationFrame(el._fvRaf); el._fvRaf = 0; }
      if (to == null || !isFinite(to) || !isFinite(from) || from === to || MK.reduced() || document.hidden) { el.textContent = fmt(to); return; }
      // A change under 1% just lands (FINANCE_MOTION.md §9); o.delay waits for the card to land.
      if (el._fvTicked && from !== 0 && Math.abs(to - from) < Math.abs(to) * 0.01) { el.textContent = fmt(to); return; }
      const dur = o.duration || (el._fvTicked ? 650 : 900);
      el._fvTicked = true;
      const t0 = performance.now() + (o.delay > 0 ? o.delay : 0);
      if (o.delay > 0) el.textContent = fmt(from);
      const step = now => {
        const k = Math.max(0, Math.min(1, (now - t0) / dur));
        el.textContent = fmt(k >= 1 ? to : from + (to - from) * (1 - Math.pow(1 - k, 4)));
        el._fvRaf = k < 1 ? requestAnimationFrame(step) : 0;
      };
      el._fvRaf = requestAnimationFrame(step);
    },
    skeleton(host, o) {
      o = o || {};
      const kind = o.kind || 'chart';
      const el = h('div', { class: 'fv-skel-wrap fv-skel-' + kind, 'aria-hidden': 'true', style: o.height ? { height: o.height + 'px' } : null });
      if (kind === 'chart') { const n = o.bars || 14; for (let i = 0; i < n; i++) el.append(h('i', { class: 'fv-skel', style: { height: (30 + ((i * 37) % 58)) + '%' } })); }
      else if (kind === 'kpi') el.append(h('i', { class: 'fv-skel k1' }), h('i', { class: 'fv-skel k2' }), h('i', { class: 'fv-skel k3' }));
      else { const n = o.lines || 3; for (let i = 0; i < n; i++) el.append(h('i', { class: 'fv-skel line', style: { width: [92, 76, 84, 64, 88][i % 5] + '%' } })); }
      if (host) host.append(el);
      return {
        el,
        done() {
          if (!el.isConnected) return;
          const a = MK.reduced() || typeof el.animate !== 'function' ? null : el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-out', fill: 'forwards' });
          if (a) a.finished.then(() => el.remove(), () => el.remove()); else el.remove();
        },
      };
    },
    swap(panel, dir) {
      if (!panel || MK.reduced() || typeof panel.animate !== 'function') return null;
      const dx = (dir || 0) * 14;
      return panel.animate([{ opacity: 0, transform: `translate3d(${dx}px, 4px, 0)` }, { opacity: 1, transform: 'none' }],
        { duration: 300, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    },
    dir(a, b) {
      const i = SECTIONS.findIndex(s => s[0] === a), j = SECTIONS.findIndex(s => s[0] === b);
      return i < 0 || j < 0 || i === j ? 0 : j > i ? 1 : -1;
    },
    pauseOffscreen(el) {
      if (!el || typeof IntersectionObserver === 'undefined') return;
      mkWireVis();
      if (!MK_OFF.io) MK_OFF.io = new IntersectionObserver(es => { for (const en of es) en.target.classList.toggle('fv-offscreen', !en.isIntersecting); });
      mkPrune(MK_OFF);
      if (!MK_OFF.els.has(el)) { MK_OFF.els.add(el); MK_OFF.io.observe(el); }
    },
    reset() {
      for (const el of MK_IV.els) mkIvDone(el);
      for (const S2 of [MK_IV, MK_OFF]) { if (S2.io) S2.io.disconnect(); S2.io = null; S2.els.clear(); }
      MK_IV.batch = [];
      if (MK_IV.raf) cancelAnimationFrame(MK_IV.raf);
      MK_IV.raf = 0;
      if (FX_LIVE.io) fxLivePrune();
    },
  };
  // @c3-begin section switch + tab visibility (C3 shell, 3 Oct 2026; FINANCE_MOTION.md §3)
  //   MK.ghostOut(el, dir, done)  the old section leaves: lifted out of the flow as an inert overlay, it
  //                               fades and slides 8 px away from the travel direction (120 ms, ease-in),
  //                               then is removed and done() runs. Instant (done() now) when reduced or hidden.
  //   MK.slideIn(el, dir)         the new section arrives from the travel side: 12 px, 220 ms, from 100 ms
  //   MK.wireVis()                pause every finance loop while the browser tab is hidden (idempotent)
  MK.ghostOut = function (el, dir, done) {
    let ran = false;
    const fin = () => { if (ran) return; ran = true; if (el && el.parentNode) el.remove(); if (done) done(); };
    if (!el || MK.reduced() || typeof el.animate !== 'function' || document.hidden) { fin(); return null; }
    el.classList.add('fv-ghost'); el.setAttribute('aria-hidden', 'true'); el.inert = true;
    // From wherever it is (a swipe may have moved it), away from the direction of travel.
    const x0 = /translate3d\((-?[\d.]+)px/.exec(el.style.transform || ''); const o0 = el.style.opacity || 1;
    const x1 = (x0 ? +x0[1] : 0) - (dir || 0) * 8;
    const a = el.animate([{ opacity: o0, transform: el.style.transform || 'none' }, { opacity: 0, transform: `translate3d(${x1}px, 0, 0)` }],
      { duration: 120, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' });
    a.finished.then(fin, fin);
    setTimeout(fin, 400);   // a throttled background tab never strands the ghost
    return a;
  };
  MK.slideIn = function (el, dir) {
    if (!el || MK.reduced() || typeof el.animate !== 'function') return null;
    return el.animate([{ opacity: 0, transform: `translate3d(${(dir || 0) * 12}px, 0, 0)` }, { opacity: 1, transform: 'none' }],
      { duration: 220, delay: 100, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' });
  };
  MK.wireVis = () => { mkWireVis(); if (R.root) R.root.classList.toggle('fv-tab-hidden', !!document.hidden); };
  // @c3-end

