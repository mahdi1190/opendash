  // @part 08-controls.js · OWNER: C3 (shared: card(), seg(), toggle(), dualSlider(), sparkSvg(), countTo(), ic(), emptyState())
  // ── Card / control builders ───────────────────────────────────────────
  function card(parent, o) {
    const subEl = h('p', { class: 'fv-card-s' });
    const tools = h('div', { class: 'fv-card-tools' });
    const span = o.span || 12;
    // o.fill: the chart grows to fill the card when a neighbour in the same
    // row is taller (its height is then a minimum, not a fixed size).
    const el = h('section', { class: 'fv-card' + (o.fill ? ' fill' : '') + (o.cls ? ' ' + o.cls : ''), style: { '--span': span, '--span-md': o.md || (span <= 6 ? 6 : 12) } },
      h('header', { class: 'fv-card-h' }, h('div', { class: 'fv-card-t' }, h('h3', { text: o.title }), subEl), tools));
    const body = h('div', { class: 'fv-card-b' });
    let chart = null;
    if (o.chart) { chart = h('div', { class: 'fv-chart', style: { height: (o.height || 260) + 'px' } }); body.append(chart); }
    const empty = h('div', { class: 'fv-empty', hidden: true });
    body.append(empty); el.append(body);
    if (o.foot) el.append(h('footer', { class: 'fv-card-f' }));
    parent.append(el);
    const cd = {
      el, body, chart, tools, foot: el.querySelector('.fv-card-f'),
      setSub(t) { subEl.textContent = t || ''; },
      setEmpty(msg) {
        el.classList.toggle('is-empty', !!msg); empty.hidden = !msg; empty.textContent = msg || '';
        if (msg && chart) { const c = [...R.charts.values()].find(x => x.el === chart); if (c && !c.inst.isDisposed()) { c.inst.clear(); c.cleared = true; } }
      },
    };
    return cd;
  }
  function seg(options, value, onChange, label, cls) {
    const el = h('div', { class: 'fv-seg' + (cls ? ' ' + cls : ''), role: 'radiogroup', 'aria-label': label });
    const btns = options.map(([v, l, title]) => {
      const b = h('button', { type: 'button', role: 'radio', 'data-v': v, title: title || null, text: l });
      b.addEventListener('click', () => { if (b.getAttribute('aria-checked') !== 'true') onChange(v); });
      el.append(b); return b;
    });
    // @c3-begin sliding pill: one surface glides to the chosen option (FLIP: the
    // pill takes its final size and place, then animates from the old one with
    // transform only, 240 ms). Until it has been measured, .on paints itself.
    const pill = h('span', { class: 'fv-seg-pill', 'aria-hidden': 'true' });
    el.append(pill);
    let placed = null;
    const place = animate => {
      const b = btns.find(x => x.classList.contains('on'));
      if (!b) { el.classList.remove('has-pill'); placed = null; return; }
      const w = b.offsetWidth, x = b.offsetLeft;
      if (!w) return;   // not laid out yet: the ResizeObserver places it when it is
      if (placed && placed.x === x && placed.w === w) return;
      const prev = placed; placed = { x, w };
      pill.style.width = w + 'px'; pill.style.transform = `translateX(${x}px)`;
      el.classList.add('has-pill');
      if (animate && prev && !MK.reduced() && typeof pill.animate === 'function') {
        pill.animate([{ transform: `translateX(${prev.x}px) scaleX(${(prev.w / w).toFixed(4)})` }, { transform: `translateX(${x}px)` }],
          { duration: 240, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
      }
    };
    // @p2 roSeen: the first placement waits for the ResizeObserver (it runs after layout), so building
    // a section never forces one layout per control; set() measures only once the control has been laid out.
    let roSeen = typeof ResizeObserver === 'undefined';
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { roSeen = true; place(false); }).observe(el);
    // @c3-end
    const api2 = {
      el, set(v) {
        let changed2 = false;
        btns.forEach(b => { const on2 = b.getAttribute('data-v') === String(v); if (on2 !== b.classList.contains('on')) changed2 = true; b.classList.toggle('on', on2); b.setAttribute('aria-checked', on2 ? 'true' : 'false'); b.tabIndex = on2 ? 0 : -1; });
        if ((changed2 || !placed) && roSeen) place(changed2);
      },
    };
    el.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const i = btns.indexOf(document.activeElement); if (i < 0) return;
      e.preventDefault();
      const nb = btns[(i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length];
      nb.focus(); nb.click();
    });
    api2.set(value);
    return api2;
  }
  function toggle(label, value, onChange, title) {
    const input = h('input', { type: 'checkbox', role: 'switch' });
    input.checked = !!value;
    input.addEventListener('change', () => onChange(input.checked));
    const el = h('label', { class: 'fv-switch', title: title || null }, input, h('span', { class: 'fv-switch-ui', 'aria-hidden': 'true' }), h('span', { text: label }));
    return { el, set(v) { input.checked = !!v; } };
  }
  // Dual-handle range slider. Positions are numbers in [min,max]; o.fmt
  // formats a position for the labels. The selected band can be dragged.
  function dualSlider(o) {
    let min = o.min, max = o.max, lo = o.lo, hi = o.hi;
    const fill = h('div', { class: 'fv-dual-fill', title: 'Drag to move the selection' });
    const track = h('div', { class: 'fv-dual-track' }, fill);
    const a = h('input', { type: 'range', 'aria-label': o.label + ' — start' });
    const b = h('input', { type: 'range', 'aria-label': o.label + ' — end' });
    const la = h('span', { class: 'fv-dual-la' }), lb = h('span', { class: 'fv-dual-lb' });
    const shadeL = h('div', { class: 'fv-dual-shade l' }), shadeR = h('div', { class: 'fv-dual-shade r' });
    const art = h('div', { class: 'fv-dual-art' });
    // The inner box is inset by half a thumb so the fill lines up with the
    // native thumbs, which travel from thumb/2 to width − thumb/2.
    const inner = h('div', { class: 'fv-dual-inner' }, art, shadeL, shadeR, track);
    const el = h('div', { class: 'fv-dual' + (o.cls ? ' ' + o.cls : '') }, inner, a, b, h('div', { class: 'fv-dual-labels' }, la, lb));
    function setAttrs() { for (const x of [a, b]) { x.min = min; x.max = max; x.step = o.step || 1; } a.value = lo; b.value = hi; }
    function paint() {
      const span = (max - min) || 1; const l = (lo - min) / span * 100, r = (hi - min) / span * 100;
      fill.style.left = l + '%'; fill.style.width = Math.max(0, r - l) + '%';
      shadeL.style.width = l + '%'; shadeR.style.width = (100 - r) + '%';
      la.textContent = o.fmt(lo); lb.textContent = o.fmt(hi);
      a.style.zIndex = lo > max - (max - min) * 0.1 ? 4 : 3;
      a.setAttribute('aria-valuetext', o.fmt(lo)); b.setAttribute('aria-valuetext', o.fmt(hi));
      if (o.onPaint) o.onPaint(l, r);   // @c3 the navigator's lit window follows the handles
    }
    a.addEventListener('input', () => { lo = Math.min(+a.value, hi); a.value = lo; paint(); o.onInput && o.onInput(lo, hi); });
    b.addEventListener('input', () => { hi = Math.max(+b.value, lo); b.value = hi; paint(); o.onInput && o.onInput(lo, hi); });
    a.addEventListener('change', () => o.onChange(lo, hi));
    b.addEventListener('change', () => o.onChange(lo, hi));
    fill.addEventListener('pointerdown', e => {
      e.preventDefault(); fill.setPointerCapture(e.pointerId); el.classList.add('dragging');
      const x0 = e.clientX, lo0 = lo, hi0 = hi, w = track.clientWidth || 1, span = max - min;
      const move = ev => {
        let d = (ev.clientX - x0) / w * span; d = Math.round(d / (o.step || 1)) * (o.step || 1);
        d = clamp(d, min - lo0, max - hi0); lo = lo0 + d; hi = hi0 + d; a.value = lo; b.value = hi; paint(); o.onInput && o.onInput(lo, hi);
      };
      const up = () => { fill.removeEventListener('pointermove', move); fill.removeEventListener('pointerup', up); fill.removeEventListener('pointercancel', up); el.classList.remove('dragging'); if (lo !== lo0) o.onChange(lo, hi); };
      fill.addEventListener('pointermove', move); fill.addEventListener('pointerup', up); fill.addEventListener('pointercancel', up);
    });
    setAttrs(); paint();
    return {
      el, art,
      set(nlo, nhi, nmin, nmax) { if (nmin != null) { min = nmin; max = nmax; } lo = clamp(nlo, min, max); hi = clamp(nhi, lo, max); setAttrs(); paint(); },
      dragging: () => el.classList.contains('dragging') || document.activeElement === a || document.activeElement === b,
    };
  }
  // @c3-begin monotone sparklines (CHART_STYLE.md §12)
  // Monotone cubic path through [[x, y], ...] (x increasing), Fritsch–Carlson:
  // it passes through every point and never overshoots (no dip below a real
  // low, no peak above a real high), the guarantee of ECharts smoothMonotone 'x'.
  function monoPath(P) {
    const n = P.length; if (!n) return '';
    const f = v => +(+v).toFixed(2);
    if (n === 1) return `M${f(P[0][0])} ${f(P[0][1])}`;
    const dx = [], m = [], t = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = P[i + 1][0] - P[i][0]; m[i] = dx[i] ? (P[i + 1][1] - P[i][1]) / dx[i] : 0; }
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
    let d = `M${f(P[0][0])} ${f(P[0][1])}`;
    for (let i = 0; i < n - 1; i++) {
      const hh = dx[i] / 3;
      d += `C${f(P[i][0] + hh)} ${f(P[i][1] + t[i] * hh)} ${f(P[i + 1][0] - hh)} ${f(P[i + 1][1] - t[i + 1] * hh)} ${f(P[i + 1][0])} ${f(P[i + 1][1])}`;
    }
    return d;
  }
  let spUid = 0;
  // A KPI / card sparkline: monotone line, a 22% -> 0 wash, an HTML end dot.
  // The clip rect (.fv-sp-clip) lets CSS draw it in left to right (scaleX, transform only).
  // opts.proj: a dotted projection to the right edge; opts.slots: x positions for the whole
  // period (e.g. days in the month) when vals covers only part of it.
  function sparkSvg(vals, color, opts) {
    opts = opts || {};
    const W = 132, H = 34;
    const v = vals.filter(x => x != null && isFinite(x));
    if (v.length < 2) return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"></svg>`;
    const hasProj = opts.proj != null && isFinite(opts.proj);
    const all = hasProj ? v.concat([opts.proj]) : v;
    const mx = Math.max(...all, 0), mn = Math.min(...all, 0); const span = (mx - mn) || 1;
    const slots = Math.max(vals.length, opts.slots || 0);
    const yOf = x => H - 4 - (x - mn) / span * (H - 8);
    const pts = vals.map((x, i) => [i / (slots - 1) * (W - 6) + 3, x == null || !isFinite(x) ? null : yOf(x)]).filter(p => p[1] != null);
    const d = monoPath(pts);
    const zero = yOf(0).toFixed(2);
    const area = d + `L${pts[pts.length - 1][0].toFixed(2)} ${zero}L${pts[0][0].toFixed(2)} ${zero}Z`;
    const last = pts[pts.length - 1];
    const col = /^(#[0-9a-f]{3,8}|rgba?\([\d.,\s%]+\))$/i.test(String(color)) ? color : 'var(--accent)';
    const id = 'fvsp' + (++spUid);
    const proj = hasProj ? `<path class="fv-sp-proj" d="M${last[0].toFixed(2)} ${last[1].toFixed(2)}L${W - 3} ${clamp(yOf(opts.proj), 2, H - 2).toFixed(2)}" style="stroke:${col}" stroke-width="1.5" stroke-dasharray="1.5 3.5" stroke-linecap="round" fill="none" opacity=".8" vector-effect="non-scaling-stroke"/>` : '';
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${col};stop-opacity:.22"/><stop offset="1" style="stop-color:${col};stop-opacity:0"/></linearGradient>`
      + `<clipPath id="${id}c"><rect class="fv-sp-clip" x="0" y="-6" width="${W}" height="${H + 12}"/></clipPath></defs>`
      + `<g clip-path="url(#${id}c)"><path d="${area}" fill="url(#${id}g)"/><path d="${d}" fill="none" style="stroke:${col}" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>${proj}</g></svg>`
      // The end dot is HTML, so a stretched (preserveAspectRatio=none) tile never turns it into an oval.
      + `<i class="fv-sp-dot" style="left:${(last[0] / W * 100).toFixed(2)}%;top:${(last[1] / H * 100).toFixed(2)}%;background:${col}"></i>`;
  }
  // @c3-end
  // KPI number animation: the motion kit's ticker (06-motion-kit.js), from
  // the last shown value to the new one. Instant under reduced motion.
  function countTo(el, to, fmt) { MK.tick(el, to, fmt); }

  // ── Icons (the app's Lucide sprite, vendor/icons/lucide-sprite.svg) ───
  const SVGNS = 'http://www.w3.org/2000/svg';
  function ic(name, cls) {
    const s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('class', 'i' + (cls ? ' ' + cls : '')); s.setAttribute('aria-hidden', 'true');
    const u = document.createElementNS(SVGNS, 'use'); u.setAttribute('href', '#i-' + String(name).replace(/[^a-z0-9-]/g, ''));
    s.append(u); return s;
  }
  // The app's design-system empty state (.empty-state): icon, title, text, actions.
  function emptyState(o) {
    return h('div', { class: 'empty-state fv-state' + (o.cls ? ' ' + o.cls : '') },
      h('div', { class: 'es-icon' }, o.spinner ? h('span', { class: 'spinner', 'aria-hidden': 'true' }) : ic(o.icon || 'wallet')),
      o.title ? h('div', { class: 'es-title', text: o.title }) : null,
      o.text ? h('div', { class: 'es-text' }, o.text) : null,
      o.actions && o.actions.length ? h('div', { class: 'es-actions' }, o.actions) : null,
      o.after || null);
  }
  const bankOk = () => !(window.Connections && typeof window.Connections.has === 'function') || window.Connections.has('bank');

