  // @part 26-money-ui.js · NEW (3 Oct 2026) · OWNER: O (Overview money brief: hero, KPI tiles, movers, bills timeline, insights, read aloud, the optional AI text)
  // ── Money brief: the page ─────────────────────────────────────────────
  // The Overview opens like the morning brief: a greeting, a backdrop whose
  // mood follows the money (cool / calm / warm / hot against the usual pace),
  // "your money in three sentences" as kinetic type with entity chips
  // (FinSymbols merchant tiles, category icons, amount highlights), safe to
  // spend a day, five KPI tiles, then movers, the bills before payday and
  // insight cards. The model is MBM (25-money-model.js); the hero chart is
  // 27-money-chart.js; 30-overview.js wires the section.
  // Motion: the entrance plays once per real entry (BUILD runs only then);
  // data refreshes, filters and theme changes update in place (numbers tick
  // from the old value, sentences swap without replaying). Transform and
  // opacity only; static under reduced motion; the backdrop loops pause off
  // screen and while the tab is hidden.
  const MB = { B: null, input: null, model: null, mode: null, el: null, entering: false, enterT: 0, ai: null, aiBusy: false, aiChecked: '', read: null, sayText: '', moodShown: null, mvKind: 'c' };
  const MB_MOOD = {
    cool: { label: 'Running cool' }, calm: { label: 'On track' }, warm: { label: 'Running warm' }, hot: { label: 'Running hot' },
  };
  // Lucide geometry (ISC) for the two icons the sprite lacks; trusted constants.
  const MB_SVG = {
    vol: '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
    pause: '<rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/>',
  };
  const mbIcon = name => { const s = document.createElementNS(SVGNS, 'svg'); s.setAttribute('class', 'i'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = MB_SVG[name] || ''; return s; };

  // The page's formatters (currency and locale from config), for the model.
  function mbFmt() {
    return { money: gbp, money2: gbp2, long: n => fd(n, { weekday: 'long', day: 'numeric', month: 'long' }), short: fDay, weekday: n => fd(n, { weekday: 'long' }), month: n => fd(n, { month: 'long' }), name: mbName };
  }
  // A merchant as people read it: FinSymbols' cleaned name ('SQ *BLUE DOOR 0042' -> 'Blue Door'); rows keep the raw one.
  function mbName(m) {
    const FS = window.FinSymbols;
    try { if (FS && typeof FS.merchantCanonical === 'function') return FS.merchantCanonical(m) || m; } catch (e) { /* the raw name */ }
    return m;
  }
  // The brief for the current model and period choice (recomputed only when either changes).
  function mbData() {
    const M = R.model; if (!M) return null;
    const mode = F.mbMode === 'month' ? 'month' : 'cycle';
    if (MB.B && MB.model === M && MB.mode === mode) return MB.B;
    MB.input = { tx: M.tx, anchor: M.anchor, minN: M.minN, balances: M.a.balances, history: M.a.balance_history, recurring: M.recurring };
    MB.B = MBM.compute(MB.input, { mode, fmt: mbFmt() });
    MB.model = M; MB.mode = mode;
    return MB.B;
  }
  const mbFS = () => (window.FinSymbols && typeof window.FinSymbols.merchantSymbol === 'function' ? window.FinSymbols : null);
  // Trusted HTML from FinSymbols (it escapes every name); a plain dot without it.
  function mbTile(m, c, o) {
    const FS = mbFS();
    return FS ? FS.merchantSymbol(m, c, Object.assign({ size: 'sm' }, o || {})) : `<span class="fv-mb-dot" style="background:${esc(catColor(c))}"></span>`;
  }
  function mbCat(c, o) {
    const FS = mbFS();
    return FS ? FS.categoryIcon(c, Object.assign({ size: 'sm', color: catColor(c) }, o || {})) : `<span class="fv-mb-dot" style="background:${esc(catColor(c))}"></span>`;
  }
  // A transaction-type badge for a bill (from its latest charge's memo and bank category).
  function mbBadge(m) {
    const FS = mbFS(); if (!FS || typeof FS.txTypeBadge !== 'function') return '';
    const t = R.model && R.model.tx.find(x => x.m === m && x.kind === 'spend');
    return t ? FS.txTypeBadge(t, { compact: false, recurring: true, size: 'sm' }) : '';
  }

  // ── Small SVG pieces (sparklines, mini bars): monotone curves, never an overshoot ──
  function mbMono(P) {
    const n = P.length; if (!n) return '';
    if (n === 1) return `M${P[0][0]} ${P[0][1]}`;
    const dx = [], m = [], t = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = P[i + 1][0] - P[i][0]; m[i] = (P[i + 1][1] - P[i][1]) / (dx[i] || 1); }
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
    const f = v => +v.toFixed(2);
    let d = `M${f(P[0][0])} ${f(P[0][1])}`;
    for (let i = 0; i < n - 1; i++) { const hh = dx[i] / 3; d += `C${f(P[i][0] + hh)} ${f(P[i][1] + t[i] * hh)} ${f(P[i + 1][0] - hh)} ${f(P[i + 1][1] - t[i + 1] * hh)} ${f(P[i + 1][0])} ${f(P[i + 1][1])}`; }
    return d;
  }
  let mbUid = 0;
  // A stretched sparkline (non-scaling stroke), a soft wash, an HTML end dot. color: a CSS colour or var().
  function mbSpark(vals, o) {
    o = o || {};
    const v = vals.filter(x => x != null && isFinite(x));
    if (v.length < 2) return '';
    const W = 100, H = o.h || 40, pad = 4;
    const lo = Math.min(...v, o.base != null ? o.base : Infinity), hi = Math.max(...v); const span = hi - lo || 1;
    const P = vals.map((x, i) => [i / (vals.length - 1) * W, pad + (1 - (x - lo) / span) * (H - pad * 2)]);
    const id = 'mbg' + (++mbUid); const c = o.color || 'var(--accent)';
    const line = mbMono(P); const last = P[P.length - 1];
    return `<span class="fv-mb-spk" style="--c:${esc(c)};--i:${o.i || 0}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${esc(c)};stop-opacity:${o.a0 == null ? 0.2 : o.a0}"/><stop offset="1" style="stop-color:${esc(c)};stop-opacity:0"/></linearGradient></defs>`
      + `<g class="fv-mb-spk-g">${o.area === false ? '' : `<path d="${line}L${W} ${H}L0 ${H}Z" fill="url(#${id})"/>`}<path d="${line}" fill="none" style="stroke:${esc(c)}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></g></svg>`
      + `<i class="fv-mb-spk-dot" style="left:${(last[0] / W * 100).toFixed(2)}%;top:${(last[1] / H * 100).toFixed(2)}%"></i></span>`;
  }
  function mbBars(vals, o) {
    o = o || {};
    const mx = Math.max(...vals, 0) || 1, n = vals.length;
    return `<span class="fv-mb-bars">${vals.map((v, i) => `<i class="${i === n - 1 ? 'now' : ''}" style="--h:${Math.max(6, v / mx * 100).toFixed(1)}%;--i:${i}" title="${esc(o.title ? o.title(i) : '')}"></i>`).join('')}</span>`;
  }
  // The hero backdrop's horizon: this cycle (front) against the usual pace (back), as soft hills.
  function mbHills(B) {
    const W = 1440, H = 300, cyc = B.cycle;
    const med = B.pace ? B.pace.med : null;
    const cur = B.curve.slice();
    const front = cur.slice();
    if (med) for (let i = cyc.day + 1; i < cyc.len; i++) front.push(round2(B.spent + med[i] - med[Math.min(cyc.day, med.length - 1)]));
    const max = Math.max(1, ...(med || []), ...front) * 1.08;
    const n = Math.max(2, cyc.len);
    const pt = arr => arr.map((v, i) => [i / (n - 1) * W, H - 30 - (Math.max(0, v) / max) * (H - 80)]);
    const fp = pt(front);
    const backD = med ? mbMono(pt(med)) + `L${W} ${H}L0 ${H}Z` : '';
    const frontD = fp.length > 1 ? mbMono(fp) + `L${fp[fp.length - 1][0]} ${H}L0 ${H}Z` : '';
    return `<svg class="fv-mb-hills" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${backD ? `<path class="h1" d="${backD}"/>` : ''}${frontD ? `<path class="h2" d="${frontD}"/><path class="h2l" d="${mbMono(fp)}" vector-effect="non-scaling-stroke"/>` : ''}</svg>`;
  }

  // ── Building the brief (once per real entry) ──────────────────────────
  function mbBuild(g) {
    mbReadStop();
    const E = MB.el = {};
    MB.entering = !!R.entering && !MK.reduced();   // the first visit this session (18-sections.js R.entering); re-visits render settled
    MB.moodShown = null; MB.sayText = ''; MB.aiChecked = '';
    clearTimeout(MB.enterT);
    // Hero
    E.sky = h('div', { class: 'fv-mb-sky', 'aria-hidden': 'true' });
    E.over = h('span', { class: 'fv-mb-over' });
    E.modeSeg = seg([['cycle', 'Pay cycle', 'From payday to payday'], ['month', 'Month', 'The calendar month']], F.mbMode === 'month' ? 'month' : 'cycle', v => { F.mbMode = v; saveF(); mbPaint(R.ctx, false); mbChartUpdate(); }, 'Period', 'fv-mb-seg');
    E.greet = h('h2', { class: 'fv-mb-greet' });
    E.moodChip = h('span', { class: 'fv-mb-moodchip' }, h('i', { class: 'dot', 'aria-hidden': 'true' }), h('span'));
    E.moodTxt = h('span', { class: 'fv-mb-moodtxt' });
    E.say = h('p', { class: 'fv-mb-say', 'aria-live': 'off' });
    E.src = h('span', { class: 'fv-mb-src' });
    E.readBtn = h('button', { type: 'button', class: 'fv-mb-btn glass', 'aria-pressed': 'false', onclick: () => mbReadToggle() }, mbIcon('vol'), h('span', { text: 'Read aloud' }));
    E.aiBtn = h('button', { type: 'button', class: 'fv-mb-btn ghost', hidden: true, title: 'Ask Claude to word these three sentences (only totals and the next bills are sent; every number is checked)', onclick: () => mbAiLoad(true, false) }, ic('wand-sparkles'), h('span', { text: 'Rewrite with Claude' }));
    E.hint = h('span', { class: 'fv-mb-hint', text: 'Words light up as they are read' });
    // Play story: needs a "money" kind in the Story player (79-story-*, the story workflow). Hidden until then.
    E.storyBtn = h('button', { type: 'button', class: 'fv-mb-btn inv', hidden: true }, h('span', { text: 'Play story' }));
    E.safe = h('aside', { class: 'fv-mb-safe', 'aria-label': 'Safe to spend' });
    E.hero = h('section', { class: 'fv-mb-hero' + (MB.entering ? ' is-entering' : ''), 'data-mood': 'calm', 'aria-label': 'Money brief' },
      E.sky,
      h('div', { class: 'fv-mb-in' },
        h('div', { class: 'fv-mb-top' }, E.over, h('span', { class: 'fv-grow' }), E.modeSeg.el),
        h('div', { class: 'fv-mb-left' },
          E.greet,
          h('div', { class: 'fv-mb-moodline' }, E.moodChip, E.moodTxt),
          h('div', { class: 'fv-mb-say-h' }, h('span', { class: 'fv-mb-overline', text: 'Your money in three sentences' }), h('span', { class: 'fv-mb-pips', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')), E.src),
          E.say,
          h('div', { class: 'fv-mb-actions' }, E.readBtn, E.storyBtn, E.aiBtn, E.hint)),
        E.safe));
    E.hero.addEventListener('keydown', e => {
      if (e.key === 'Escape' && MB.read) { e.stopPropagation(); mbReadStop(); return; }
      const ent = e.target.closest && e.target.closest('.fv-mb-ent[data-ref]');
      if (ent && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); ent.click(); }
    });
    // A merchant or category in a sentence selects it everywhere (once; picking it again does nothing).
    E.say.addEventListener('click', e => {
      const ent = e.target.closest('.fv-mb-ent[data-ref]'); if (!ent) return;
      mbPick(ent.classList.contains('t-merchant') ? 'm' : 'c', ent.getAttribute('data-ref'));
    });
    g.append(E.hero);
    // KPI tiles
    E.kpis = h('div', { class: 'fv-mb-kpis' });
    E.k = {};
    [['spent', 'wallet'], ['in', 'banknote'], ['net', 'coins'], ['bal', 'landmark'], ['proj', 'trending-up']].forEach(([k, icon], i) => {
      const t = { l: h('span', { class: 'fv-mb-kl' }, ic(icon), h('span')), v: h('div', { class: 'fv-mb-kv num' }), d: h('div', { class: 'fv-mb-kd' }), viz: h('div', { class: 'fv-mb-kviz' }) };
      // Each tile opens the section that explains it (Spending, Cash flow, Budgets).
      const go = { spent: ['spending', 'Spending'], in: ['cashflow', 'Cash flow'], net: ['cashflow', 'Cash flow'], bal: ['cashflow', 'Cash flow'], proj: ['budgets', 'Budgets'] }[k];
      t.el = h('section', { class: 'fv-mb-kpi', style: { '--i': i }, role: 'link', tabindex: '0', title: 'Open ' + go[1], onclick: () => setSection(go[0]), onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSection(go[0]); } } }, t.l, t.v, t.d, t.viz);
      E.kpis.append(t.el); E.k[k] = t;
    });
    g.append(E.kpis);
    // The hero chart (27-money-chart.js)
    S.pace = card(g, { title: 'Spending since payday', span: 12, chart: true, height: 330, cls: 'fv-mb-pace' });
    S.paceSeg = seg([['spend', 'Spending'], ['bal', 'Balance']], F.mbView === 'bal' ? 'bal' : 'spend', v => { F.mbView = v; saveF(); S.paceSeg.set(v); mbChartUpdate(true); }, 'Measure');
    S.pace.tools.append(S.paceSeg.el);
    S.paceLegend = h('div', { class: 'fv-mb-legend' });
    S.pace.body.insertBefore(S.paceLegend, S.pace.chart);
    // Movers + Coming up
    S.mv = card(g, { title: 'Top movers', span: 7, md: 12, cls: 'fv-mb-mv', foot: true });
    S.mvSeg = seg([['c', 'Categories'], ['m', 'Merchants']], MB.mvKind, v => { MB.mvKind = v; S.mvSeg.set(v); mbPaintMovers(MB.B, false); }, 'Movers by');
    S.mv.tools.append(S.mvSeg.el);
    S.mvList = h('div', { class: 'fv-mb-mvlist', role: 'list' }); S.mv.body.append(S.mvList);
    S.mv.foot.append(ic('info', 'i-sm'), h('span', { class: 'fv-grow', text: 'Rent, bills and money to people are left out: they don’t move with your habits.' }),
      h('button', { type: 'button', class: 'fv-link', onclick: () => setSection('categories') }, 'Categories', ic('arrow-right', 'i-sm')));
    S.mv.el.addEventListener('keydown', e => { if (e.key === 'Escape' && (F.cats.length || F.merchant)) { e.stopPropagation(); mbClearSel(); } });
    S.bills = card(g, { title: 'Coming up', span: 5, md: 12, cls: 'fv-mb-bills' });
    S.billsTl = h('div', { class: 'fv-mb-tl', role: 'img' }); S.billsList = h('div', { class: 'fv-mb-blist', role: 'list' });
    S.bills.body.append(S.billsTl, S.billsList);
    S.bills.el.addEventListener('keydown', e => { if (e.key === 'Escape' && F.merchant) { e.stopPropagation(); mbClearSel(); } });
    // Insights
    E.ins = h('div', { class: 'fv-mb-ins' });
    g.append(E.ins);
    MK.pauseOffscreen(E.hero); MK.pauseOffscreen(S.bills.el);
    // The entrance runs once; after it, every repaint is in place.
    if (MB.entering) MB.enterT = setTimeout(() => { MB.entering = false; if (E.hero.isConnected) E.hero.classList.remove('is-entering'); }, 3600);
    // The brief runs its own entrance; the shell's card-by-card rise (MK.inView) skips these.
    for (const el of [E.hero, E.kpis, E.ins]) MK.once(el, 'iv');
    // Below the hero, each part plays its entrance when it first scrolls into
    // view (the hero chart draws in then too); until then its pieces wait unseen.
    if (MB.io) MB.io.disconnect();
    MB.io = null; MB.seen = new Map(); MB.ticks = []; MB.kpiWait = false;
    if (MB.entering && typeof IntersectionObserver !== 'undefined') {
      MB.io = new IntersectionObserver(es => {
        for (const en of es) {
          if (!en.isIntersecting || !MB.seen.has(en.target)) continue;
          const fn = MB.seen.get(en.target); MB.seen.delete(en.target); MB.io.unobserve(en.target); fn();
        }
      }, { threshold: 0.1 });
      const reveal = (el, after) => {
        el.classList.add('mb-wait');
        MB.seen.set(el, () => { el.classList.remove('mb-wait'); el.classList.add('mb-in'); if (after) after(); setTimeout(() => el.classList.remove('mb-in'), 2600); });
        MB.io.observe(el);
      };
      MB.kpiWait = true;
      reveal(E.kpis, () => { MB.kpiWait = false; const q = MB.ticks.splice(0); for (const [el, to, fmt, d] of q) mbTick(el, to, fmt, d); });
      reveal(S.mv.el); reveal(S.bills.el); reveal(E.ins);
    }
  }

  // ── Painting (first paint and every update, in place) ─────────────────
  function mbPaint(ctx, first, force) {
    const E = MB.el; if (!E || !E.hero.isConnected) return;
    const B = mbData(); if (!B) return;
    const anim = first && MB.entering && !MK.reduced();
    // Filters, saves and theme changes leave the brief's numbers as they are:
    // only the selection highlight moves (no DOM churn, nothing replays).
    if (!first && !force && MB.paintedB === B) { mbPaintSel(); return; }
    MB.paintedB = B;
    mbPaintHero(B, anim);
    mbPaintKpis(B, anim);
    mbPaintMovers(B, anim);
    mbPaintBills(B, anim);
    mbPaintInsights(B, anim);
    mbPaintSel();
    if (first || MB.aiChecked !== B.key + B.mode) mbAiLoad(false, false);
  }
  function mbHello() {
    const hr = new Date().getHours();
    const part = hr < 5 ? 'Good evening' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    const name = String(CFG.userName || '').trim();
    return name ? `${part}, ${name}.` : `${part}.`;
  }
  function mbPaintHero(B, anim) {
    const E = MB.el, cyc = B.cycle, isCycle = cyc.mode === 'cycle';
    // Mood: a crossfade between two sky layers when it changes after the first paint.
    const mood = B.mood.mood;
    E.hero.setAttribute('data-mood', mood);
    if (MB.moodShown !== mood) {
      const layer = h('div', { class: 'fv-mb-skyl', 'data-mood': mood, html: `<i class="blob b1"></i><i class="blob b2"></i><i class="blob b3"></i>${mbHills(B)}<i class="grain"></i>` });
      const old = [...E.sky.children];
      E.sky.append(layer);
      if (MB.moodShown == null || MK.reduced()) old.forEach(x => x.remove());
      else { layer.classList.add('fade-in'); setTimeout(() => old.forEach(x => x.remove()), 1300); }
      MB.moodShown = mood;
    } else {
      const top = E.sky.lastElementChild; const hills = top && top.querySelector('.fv-mb-hills');
      if (hills) hills.outerHTML = mbHills(B);
    }
    // Overline: the date, the day of the period, the phase.
    const longD = fd(B.anchor, { weekday: 'long', day: 'numeric', month: 'long' }), shortD = fd(B.anchor, { weekday: 'short', day: 'numeric', month: 'short' });
    const dayTxt = isCycle ? `Day ${cyc.day + 1} of ${cyc.len}` : `Day ${cyc.day + 1} of ${fd(cyc.start, { month: 'long' })}`;
    E.over.innerHTML = `<span class="hide-n">${esc(longD)}</span><span class="only-n">${esc(shortD)}</span> · ${esc(dayTxt)}<span class="hide-n"> · ${esc(cyc.late ? 'Payday any day now' : B.phase)}</span>`;
    E.modeSeg.el.hidden = !B.hasSalary;
    E.modeSeg.set(B.mode);
    // Greeting: letters drift in on entry (the Story kit's driftHtml), plain after.
    const hello = mbHello();
    if (E.greet.dataset.t !== hello) {
      const K = window.Story && window.Story.kit;
      E.greet.innerHTML = anim && K && typeof K.driftHtml === 'function' ? K.driftHtml(hello, { delay: 60 }) : esc(hello);
      E.greet.dataset.t = hello;
    }
    // Mood line.
    E.moodChip.lastChild.textContent = B.mood.known ? MB_MOOD[mood].label : 'First ' + (isCycle ? 'cycle' : 'month');
    const left = isCycle ? `${cyc.daysLeft} day${cyc.daysLeft === 1 ? '' : 's'} to payday` : `${cyc.daysLeft} day${cyc.daysLeft === 1 ? '' : 's'} left in ${fd(cyc.start, { month: 'long' })}`;
    if (!B.mood.known) E.moodTxt.textContent = `No usual pace yet: that needs one full ${isCycle ? 'pay cycle' : 'month'} of history. ${left.replace(/^./, c => c.toUpperCase())}.`;
    else if (Math.abs(B.mood.diff) < 1) E.moodTxt.textContent = `Right on your usual pace, with ${left}.`;
    else E.moodTxt.textContent = `${gbp(Math.abs(B.mood.diff))} ${B.mood.diff < 0 ? 'under' : 'over'} your usual pace, with ${left}.`;
    // The three sentences (the template now; Claude's wording when there is a checked one).
    const sents = MB.ai && MB.ai.key === B.key && MB.ai.mode === B.mode ? MB.ai.sentences : B.sentences;
    mbRenderSay(sents, anim);
    mbPaintSrc(B);
    // Safe to spend.
    mbPaintSafe(B, anim);
  }
  // Sentences as word spans (the Story kit's sentenceHtml when it is there),
  // then the entities dressed as chips: merchant tile, category icon, date, money highlight.
  function mbSentenceHtml(text, ents) {
    let n = 0, out = '', at = 0;
    const words = (s, start) => s.replace(/(\s+)|(\S+)/g, (m0, sp, w, off) => (sp ? sp : `<span class="st-w" data-c="${start + off}" style="--i:${n++}">${esc(w)}</span>`));
    for (const e of [...ents].sort((p, q) => p.start - q.start)) {
      if (!(e.start >= at && e.end > e.start)) continue;
      out += words(text.slice(at, e.start), at);
      out += `<span class="st-ent" data-type="${esc(e.type)}" data-from="${e.start}" data-to="${e.end}">${words(text.slice(e.start, e.end), e.start)}</span>`;
      at = e.end;
    }
    return out + words(text.slice(at), at);
  }
  function mbRenderSay(sents, anim) {
    const E = MB.el;
    const sig = JSON.stringify(sents.map(s => [s.text, s.entities.map(e => [e.type, e.start, e.end, e.tone || ''])]));
    if (E.say.dataset.sig === sig) return;
    const fresh = !E.say.dataset.sig;
    E.say.dataset.sig = sig;
    mbReadStop();
    const K = window.Story && window.Story.kit;
    let off = 0;
    const html = sents.map((s, si) => {
      const inner = K && typeof K.sentenceHtml === 'function' ? K.sentenceHtml(s.text, s.entities, { step: 55 }) : mbSentenceHtml(s.text, s.entities);
      const span = `<span class="fv-mb-sn" data-s="${si}" style="--mb-off:${off}">${inner}</span>`;
      off += (inner.match(/class="st-w"/g) || []).length;
      return span;
    }).join(' ');
    E.say.innerHTML = html;
    // Dress the entities.
    E.say.querySelectorAll('.fv-mb-sn').forEach(sn => {
      const s = sents[+sn.dataset.s]; if (!s) return;
      sn.querySelectorAll('.st-ent').forEach(el => {
        const from = +el.getAttribute('data-from');
        const e = s.entities.find(x => x.start === from) || s.entities.find(x => x.type === el.getAttribute('data-type'));
        if (!e) return;
        el.classList.add('fv-mb-ent', 't-' + e.type);
        const w0 = el.querySelector('.st-w'); if (w0) el.style.setProperty('--i', w0.style.getPropertyValue('--i') || '0');
        if (e.type === 'money') el.classList.add('tone-' + (['good', 'warn'].includes(e.tone) ? e.tone : 'out'));
        let icon = '';
        if (e.type === 'merchant') { const r = R.model && R.model.mstats.get(e.ref); icon = mbTile(e.ref, r ? r.cat : null, { size: 'xs', badge: false, live: 'hover' }); }
        else if (e.type === 'category') icon = mbCat(e.ref, { size: 'xs', live: 'hover' });
        if (icon) el.insertAdjacentHTML('afterbegin', `<span class="fv-mb-ei">${icon}</span>`);
        else if (e.type === 'date') el.prepend(h('span', { class: 'fv-mb-ei' }, ic('calendar-days')));
        // Punctuation the kit glued to the entity's last word sits just outside the chip.
        if (e.type !== 'money') { const tail = el.querySelector('.st-tail'); if (tail) el.after(tail); }
        if (e.type === 'merchant' || e.type === 'category') { el.setAttribute('role', 'button'); el.tabIndex = 0; el.setAttribute('data-ref', e.ref); el.title = e.type === 'merchant' ? 'Show ' + e.ref : 'Select ' + e.ref; }
      });
    });
    E.say.setAttribute('aria-label', sents.map(s => s.text).join(' '));
    MB.sayText = sents.map(s => s.text).join(' ');
    // A later change (the AI wording, a new period) crossfades instead of replaying the words.
    if (!fresh && !anim && !MK.reduced() && typeof E.say.animate === 'function') E.say.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 320, easing: 'ease-out' });
  }
  function mbPaintSrc(B) {
    const E = MB.el; E.src.innerHTML = '';
    const ai = MB.ai && MB.ai.key === B.key && MB.ai.mode === B.mode;
    const canAi = mbAiAllowed();
    E.aiBtn.hidden = ai || !canAi;
    E.aiBtn.disabled = MB.aiBusy;
    E.aiBtn.querySelector('span').textContent = MB.aiBusy ? 'Rewriting…' : 'Rewrite with Claude';
    if (ai) {
      E.src.append(h('span', { class: 'fv-mb-srcb', title: 'Worded by Claude from your totals; every number was checked against them' }, ic('sparkles', 'i-xs'), 'Claude'),
        h('button', { type: 'button', class: 'fv-mb-srcl', text: MB.aiBusy ? 'Rewriting…' : 'Regenerate', disabled: MB.aiBusy, onclick: () => mbAiLoad(true, true) }),
        h('button', { type: 'button', class: 'fv-mb-srcl', text: 'Plain version', onclick: () => { MB.ai = null; MB.aiChecked = B.key + B.mode; mbPaint(R.ctx, false, true); } }));
    }
  }
  function mbPaintSafe(B, anim) {
    const E = MB.el, cyc = B.cycle, isCycle = cyc.mode === 'cycle';
    const s = B.safe;
    if (!E.safeBuilt) {
      E.safeV = h('b', { class: 'num' });
      E.safeU = h('span', { class: 'u', text: 'a day' });
      E.safeNote = h('div', { class: 'fv-mb-note' });
      E.track = h('div', { class: 'fv-mb-cyc' });
      E.trackL = h('div', { class: 'fv-mb-cycl' });
      E.split = h('div', { class: 'fv-mb-split' });
      E.safeL = h('div', { class: 'fv-mb-lbl' }, ic('wallet', 'i-sm'), h('span', { text: 'Safe to spend' }));
      E.safe.append(E.safeL, h('div', { class: 'fv-mb-big' }, E.safeV, E.safeU), E.safeNote, E.track, E.trackL, E.split);
      E.safeBuilt = true;
    }
    if (s) {
      E.safeL.lastChild.textContent = 'Safe to spend';
      E.safeU.textContent = 'a day';
      mbTick(E.safeV, s.perDay, gbp, anim ? 380 : 0);
      E.safeNote.innerHTML = `for the <b>${esc(String(cyc.daysLeft))} day${cyc.daysLeft === 1 ? '' : 's'}</b> ${isCycle ? 'to payday' : 'left in ' + esc(fd(cyc.start, { month: 'long' }))}, after <b>${esc(gbp(B.billsTotal))}</b> of bills and a <b>${esc(gbp(s.cushion))}</b> cushion.`;
    } else {
      E.safeL.lastChild.textContent = 'Spent a day so far';
      E.safeU.textContent = 'a day';
      mbTick(E.safeV, B.spent / Math.max(1, cyc.day + 1), gbp, anim ? 380 : 0);
      E.safeNote.textContent = 'No balance from your bank yet, so safe to spend can’t be worked out. A bank sync adds it (a CSV import brings transactions only).';
    }
    // The period as a track: today's position, the bills before payday as dots, payday at the end.
    const p = (cyc.day + 0.5) / cyc.len * 100;
    E.track.classList.toggle('is-month', !isCycle);
    E.track.innerHTML = `<div class="track"><i style="--p:${p.toFixed(1)}%"></i></div>`
      + B.bills.map(b => `<i class="bill" style="--x:${Math.min(94, (b.n - cyc.start + 0.5) / cyc.len * 100).toFixed(1)}%" title="${esc(b.m + ' ' + gbp2(b.amount) + ' · ' + fDayW(b.n))}"></i>`).join('')
      + `<i class="now" style="--p:${p.toFixed(1)}%"></i>`;
    const end = h('span', { class: 'pay', title: isCycle ? 'Payday ' + fDayW(cyc.next) : 'Month end' }, ic(isCycle ? 'banknote' : 'calendar-check', 'i-sm'));
    E.track.append(end);
    // @p1: "today" rides under the now-dot (hidden where it would meet the start or end date).
    E.trackL.innerHTML = `<span>${esc(fDay(cyc.start))}</span><span class="now-l${p < 19 || p > 80 ? ' off' : ''}" style="--p:${p.toFixed(1)}%">today</span><span>${esc(fDay(cyc.next))}</span>`;
    E.split.innerHTML = s
      ? `<div><span>Free until ${isCycle ? 'payday' : 'month end'}</span><b class="num">${esc(gbp(s.left))}</b></div><div><span>Balance now</span><b class="num">${esc(gbp2(B.balance.total))}</b></div>`
      : `<div><span>Spent ${isCycle ? 'since payday' : 'this month'}</span><b class="num">${esc(gbp(B.spent))}</b></div><div><span>Bills before ${isCycle ? 'payday' : 'month end'}</span><b class="num">${esc(gbp(B.billsTotal))}</b></div>`;
  }
  // The ticker (MK.tick): from the last value shown; on entry it waits for its
  // tile to land (queue: the KPI row, which waits until it is first seen).
  function mbTick(el, to, fmt, delay, queue) {
    if (!el) return;
    el.setAttribute('aria-label', fmt(to));
    if (queue && MB.kpiWait && !MK.reduced()) { el.textContent = fmt(0); el._fvVal = 0; MB.ticks.push([el, to, fmt, delay]); return; }
    if (delay && !MK.reduced()) { if (el._fvVal == null) { el.textContent = fmt(0); el._fvVal = 0; } setTimeout(() => { if (el.isConnected) MK.tick(el, to, fmt); }, delay); }
    else MK.tick(el, to, fmt);
  }

  // ── KPI tiles ──
  function mbPaceBar(a, u, max, lbl, warn) {
    const pa = clamp(a / (max || 1) * 100, 0, 100), pu = clamp(u / (max || 1) * 100, 0, 100);
    return `<div class="fv-mb-pacebar"><div class="tr"></div><div class="fi${warn ? ' warn' : ''}" style="--a:${pa.toFixed(1)}%"></div><div class="mk" style="--u:${pu.toFixed(1)}%"></div><div class="ml${pu > 70 ? ' r' : pu < 20 ? ' l' : ''}" style="--u:${pu.toFixed(1)}%">${esc(lbl)}</div></div>`;
  }
  function mbPaintKpis(B, anim) {
    const K = MB.el.k, cyc = B.cycle, isCycle = cyc.mode === 'cycle', t = tk();
    const dl = i => (anim ? 200 + 60 * i : 0);
    const arrow = (good, up) => `<span class="${good ? 'good' : 'warn'}">${up ? '<svg class="i i-xs" aria-hidden="true"><use href="#i-arrow-up"/></svg>' : '<svg class="i i-xs" aria-hidden="true"><use href="#i-arrow-down"/></svg>'}</span>`;
    const label = (k, s) => { K[k].l.lastChild.textContent = s; };
    const maxPace = Math.max(B.usualEnd || 0, B.projected || 0, B.spent) * 1.04;
    // 1. Spent
    label('spent', isCycle ? 'Spent since payday' : 'Spent this month');
    mbTick(K.spent.v, B.spent, gbp, dl(0), anim);
    if (B.mood.known) {
      const under = B.mood.diff <= 0;
      K.spent.d.innerHTML = `${arrow(under, !under)}<b class="${under ? 'good' : 'warn'}">${esc(gbp(Math.abs(B.mood.diff)))} ${under ? 'under' : 'over'}</b><span>usual pace</span>`;
      K.spent.viz.innerHTML = mbPaceBar(B.spent, B.usual, maxPace, `usual by today ${gbp(B.usual)}`, !under && B.mood.mood !== 'calm');
    } else {
      K.spent.d.innerHTML = `<span>about ${esc(gbp(B.spent / Math.max(1, cyc.day + 1)))} a day</span>`;
      K.spent.viz.innerHTML = '';
    }
    // 2. Money in
    label('in', 'Money in');
    mbTick(K.in.v, B.moneyIn, gbp, dl(1), anim);
    K.in.d.innerHTML = `<span>${esc(B.inCount ? `${B.inCount} payment${B.inCount === 1 ? '' : 's'} ${isCycle ? 'since ' + fDay(cyc.start) : 'this month'}` : 'Nothing in yet')}</span>`;
    K.in.viz.innerHTML = B.inPer.length > 1 ? mbBars(B.inPer.map(x => x.v), { title: i => `${fDay(B.inPer[i].start)}: ${gbp(B.inPer[i].v)}${i === B.inPer.length - 1 ? ' so far' : ''}` }) : '';
    // 3. Net
    label('net', isCycle ? 'Net this cycle' : 'Net this month');
    mbTick(K.net.v, B.net, x => (x > 0.5 ? '+' : '') + gbp(x), dl(2), anim);
    K.net.d.innerHTML = `<span>in ${esc(gbp(B.moneyIn))} · out ${esc(gbp(B.spent))}</span>`;
    K.net.viz.innerHTML = mbSpark(B.netCurve, { color: 'var(--fg-subtle)', a0: 0.12, i: 2 });
    // 4. Balance
    label('bal', 'Balance');
    if (B.balance) {
      mbTick(K.bal.v, B.balance.total, v => (Math.abs(v - B.balance.total) < 0.005 ? gbp2(v) : gbp(v)), dl(3), anim);
      if (B.bal30 != null) {
        const d = B.balance.total - B.bal30, up = d >= 0;
        K.bal.d.innerHTML = `${arrow(up, up)}<b class="${up ? 'good' : 'warn'}">${esc(gbp(Math.abs(d)))}</b><span>vs 30 days ago</span>`;
      } else K.bal.d.innerHTML = `<span>${esc(B.balance.n > 1 ? `${B.balance.n} current accounts` : 'current account')}</span>`;
      const pts = B.balSeries.filter(p => p.n > B.anchor - 90);
      K.bal.viz.innerHTML = mbSpark(pts.map(p => p.v), { color: 'var(--accent)', i: 3 });
    } else {
      K.bal.v.textContent = '—'; K.bal.d.innerHTML = '<span>No balance from your bank yet</span>'; K.bal.viz.innerHTML = '';
    }
    // 5. Projection
    label('proj', isCycle ? 'At payday, if usual' : 'At month end, if usual');
    if (B.projected != null) {
      mbTick(K.proj.v, B.projected, gbp, dl(4), anim);
      K.proj.d.innerHTML = `<span>usual ${isCycle ? 'cycle' : 'month'} total ${esc(gbp(B.usualEnd))}</span>`;
      K.proj.viz.innerHTML = mbPaceBar(B.projected, B.usualEnd, maxPace, `usual ${gbp(B.usualEnd)}`, B.projected > B.usualEnd * 1.05);
    } else {
      K.proj.v.textContent = '—'; K.proj.d.innerHTML = `<span>Needs one full ${isCycle ? 'cycle' : 'month'} of history</span>`; K.proj.viz.innerHTML = '';
    }
    void t;
  }

  // ── Top movers ──
  function mbPaintMovers(B, anim) {
    if (!S.mv || !B) return;
    const kind = MB.mvKind === 'm' ? 'm' : 'c';
    const list = (kind === 'm' ? B.moversM : B.movers).filter(x => Math.abs(x.delta) >= 1).slice(0, 6);
    const cyc = B.cycle;
    S.mv.setSub(B.pace ? `Against your usual by day ${cyc.day + 1} of the ${cyc.mode === 'cycle' ? 'cycle' : 'month'} · median of ${B.pace.n} earlier ${cyc.mode === 'cycle' ? 'cycle' : 'month'}${B.pace.n === 1 ? '' : 's'}` : '');
    S.mvList.innerHTML = '';
    if (!list.length) { S.mv.setEmpty(B.pace ? 'Nothing is moving much: spending is close to usual everywhere.' : `Movers need one full ${cyc.mode === 'cycle' ? 'pay cycle' : 'month'} of history to compare with.`); return; }
    S.mv.setEmpty(null);
    const mx = Math.max(...list.map(x => Math.abs(x.delta)), 1);
    list.forEach((x, i) => {
      const up = x.delta >= 0;
      const icon = kind === 'm' ? mbTile(x.k, x.c, { size: 'sm', live: 'hover' }) : mbCat(x.k, { size: 'sm', live: 'hover' });
      const row = h('div', { class: 'fv-mb-mvrow', role: 'listitem', style: { '--i': i }, 'data-k': x.k, 'data-kind': kind, tabindex: '0',
        title: kind === 'm' ? `Select ${x.k} everywhere` : `Select ${x.k} everywhere` });
      row.innerHTML = `<span class="ic">${icon}</span><span class="nm"><b>${esc(kind === 'm' ? mbName(x.k) : x.k)}</b><small class="num">${esc(gbp(x.now))} so far · usual ${esc(gbp(x.usual))}</small></span>`
        + `<span class="spc">${mbSpark(x.spark, { color: esc(catColor(x.c)), a0: 0.16, h: 24, i })}</span>`
        + `<span class="dv"><i class="${up ? 'up' : 'down'}" style="--w:${(Math.abs(x.delta) / mx * 50).toFixed(1)}%;--i:${i}"></i></span>`
        + `<span class="dl num ${up ? 'up' : 'down'}"><svg class="i" aria-hidden="true"><use href="#i-arrow-${up ? 'up' : 'down'}"/></svg>${esc(gbp(Math.abs(x.delta)))}</span>`;
      row.setAttribute('aria-label', `${kind === 'm' ? mbName(x.k) : x.k}: ${gbp(x.now)} so far, usual ${gbp(x.usual)}, ${up ? 'up' : 'down'} ${gbp(Math.abs(x.delta))}`);
      const pick = () => mbPick(kind, x.k);
      row.addEventListener('click', pick);
      row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      S.mvList.append(row);
    });
    mbPaintSel();
  }
  // Select a category or a merchant everywhere (re-picking the current one does nothing).
  function mbPick(kind, k) {
    if (kind === 'm') { if (F.merchant === k) return; setMerchant(k); }
    else { if (F.cats.length === 1 && F.cats[0] === k) return; setCats([k]); }
  }
  function mbClearSel() { if (F.merchant) setMerchant(''); if (F.cats.length) setCats([]); }
  // The current category / merchant is lit in every list here; the rest dim.
  function mbPaintSel() {
    const cat = F.cats.length === 1 ? F.cats[0] : null, m = F.merchant || null;
    const mark = (el, on, any) => { if (on) el.setAttribute('aria-current', 'true'); else el.removeAttribute('aria-current'); el.classList.toggle('dim', !!any && !on); };
    if (S.mvList) for (const el of S.mvList.children) { const k = el.getAttribute('data-k'), kind = el.getAttribute('data-kind'); mark(el, kind === 'm' ? k === m : k === cat, kind === 'm' ? !!m : !!cat); }
    if (S.billsList) for (const el of S.billsList.querySelectorAll('[data-m]')) mark(el, el.getAttribute('data-m') === m, !!m);
    if (S.billsTl) for (const el of S.billsTl.querySelectorAll('[data-m]')) mark(el, el.getAttribute('data-m') === m, !!m);
    if (MB.el && MB.el.ins) for (const el of MB.el.ins.children) { const on = (m && el.getAttribute('data-m') === m) || (cat && el.getAttribute('data-c') === cat && !el.getAttribute('data-m')); mark(el, !!on, false); }
    if (MB.el && MB.el.say) for (const el of MB.el.say.querySelectorAll('.fv-mb-ent[data-ref]')) el.classList.toggle('is-sel', (el.classList.contains('t-merchant') && el.getAttribute('data-ref') === m) || (el.classList.contains('t-category') && el.getAttribute('data-ref') === cat));
  }

  // ── Coming up: the next 30 days on a line, payday splitting "before" from "after" ──
  function mbPaintBills(B, anim) {
    if (!S.bills || !B) return;
    const A = B.anchor, cyc = B.cycle, isCycle = cyc.mode === 'cycle', H = 30;
    const items = B.upcoming;
    const before = items.filter(b => b.n < cyc.next), after = items.filter(b => b.n >= cyc.next);
    S.bills.setSub(items.length ? `${before.length} bill${before.length === 1 ? '' : 's'} before ${isCycle ? 'payday' : 'the month ends'} · ${gbp(sum(before, b => b.amount))}${B.safe ? ' · already set aside' : ''}` : '');
    S.billsTl.innerHTML = ''; S.billsList.innerHTML = '';
    S.billsTl.classList.toggle('is-month', !isCycle);
    if (!items.length) { S.bills.setEmpty((R.model.recurring || []).length ? 'No bills expected in the next 30 days.' : 'Regular bills show up here after two or three charges.'); return; }
    S.bills.setEmpty(null);
    const X = d => clamp((d - A) / H * 100, 0, 100);
    // Group bills a day apart into one marker; two lanes so tiles never overlap.
    const groups = [];
    for (const b of items) { const g = groups[groups.length - 1]; if (g && b.n - g.n <= 1) g.items.push(b); else groups.push({ n: b.n, items: [b] }); }
    const laneEnd = [-99, -99];
    groups.forEach(g => { const x = X(g.n); g.lane = x - laneEnd[0] >= 9 ? 0 : x - laneEnd[1] >= 9 ? 1 : 0; laneEnd[g.lane] = x + (g.items.length > 1 ? 3 : 0); });
    const payIn = cyc.next <= A + H;
    const payX = X(cyc.next);
    let html = payIn ? `<i class="after-zone" style="--x:${payX.toFixed(1)}%"></i><i class="payline" style="--x:${payX.toFixed(1)}%"></i>` : '';
    html += `<div class="axis"><span class="before" style="--pd:${(payIn ? payX : 100).toFixed(1)}%"></span></div>`;
    for (const o of [0, 7, 14, 21, 28]) { const x = X(A + o); html += `<i class="tick" style="--x:${x}%"></i>`; if (o && (!payIn || Math.abs(x - payX) > 16)) html += `<span class="dl" style="--x:${x}%">${esc(fDay(A + o))}</span>`; }
    html += `<span class="dl keep" style="--x:0%">Today</span><i class="today"></i>`;
    groups.forEach((g, i) => {
      const b0 = g.items[0], tot = sum(g.items, b => b.amount), aft = g.n >= cyc.next;
      html += `<div class="bill${aft ? ' after' : ''}" data-m="${esc(b0.m)}" style="--x:${X(g.n).toFixed(2)}%;--y:${g.lane ? 4 : 38}px;--i:${i}" title="${esc(g.items.map(b => `${mbName(b.m)} ${gbp2(b.amount)}`).join(', ') + ' · ' + fDayW(g.n))}">`
        + `<span class="tile">${mbTile(b0.m, b0.c, { size: 'sm', badge: false, live: false })}</span>${g.items.length > 1 ? `<span class="more">+${g.items.length - 1}</span>` : ''}<i class="stem"></i></div>`;
      void tot;
    });
    if (payIn) html += `<div class="payday" style="--x:${payX.toFixed(1)}%" title="${esc(isCycle ? 'Payday ' + fDayW(cyc.next) : 'Month end')}"><svg class="i" aria-hidden="true"><use href="#i-${isCycle ? 'banknote' : 'calendar-check'}"/></svg></div><div class="pdl" style="--x:${payX.toFixed(1)}%">${esc((isCycle ? 'Payday ' : '') + fDay(cyc.next))}</div>`;
    S.billsTl.innerHTML = html;
    S.billsTl.setAttribute('aria-label', `${items.length} bills in the next 30 days`);
    const row = (b, aft) => {
      const el = h('div', { class: 'fv-mb-brow' + (aft ? ' after' : ''), role: 'listitem', tabindex: '0', 'data-m': b.m, title: `${mbName(b.m)}: ${b.freq.toLowerCase()} · open` });
      const days = b.due ? 'due now' : b.n === A + 1 ? 'tomorrow' : `in ${b.n - A} days`;
      el.innerHTML = `<span class="dt num">${esc(fd(b.n, { weekday: 'short', day: 'numeric' }))}</span><span class="tile">${mbTile(b.m, b.c, { size: 'sm', live: 'hover' })}</span>`
        + `<span class="nm"><b>${esc(mbName(b.m))}</b><small>${esc(days)}</small></span><span class="bd">${mbBadge(b.m)}</span><span class="am num">${esc(gbp2(b.amount))}</span>`;
      const open = () => openMerchant(b.m);
      el.addEventListener('click', open);
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      return el;
    };
    before.slice(0, 6).forEach(b => S.billsList.append(row(b, false)));
    if (before.length > 6) S.billsList.append(h('div', { class: 'fv-mb-bnote', text: `+${before.length - 6} more before ${isCycle ? 'payday' : 'the month ends'}` }));
    if (isCycle && payIn) S.billsList.append(h('div', { class: 'fv-mb-paysep' }, ic('banknote', 'i-sm'), h('span', { text: `Payday ${fDayW(cyc.next)}${B.salaryAmount > 0 ? ` · about ${gbp(B.salaryAmount)} expected` : ''}` })));
    if (after.length) S.billsList.append(h('div', { class: 'fv-mb-bnote', text: `Then ${after.length} more by ${fDay(A + H)}, starting with ${mbName(after[0].m)} (${gbp2(after[0].amount)}) on ${fDayW(after[0].n)}` }));
    mbPaintSel();
  }

  // ── Insight cards ──
  function mbPaintInsights(B, anim) {
    const box = MB.el.ins; box.innerHTML = '';
    const list = B.insights;
    box.hidden = !list.length;
    const TAG = { warn: ['Heads up', 'triangle-alert'], good: ['Nice', 'circle-check'], info: ['New', 'sparkles'] };
    const ACT = { price: x => 'See ' + x.m, new: () => 'See recurring', hot: x => 'See ' + x.c, cool: x => 'See ' + x.c, big: () => 'See the purchase', habit: x => 'See ' + x.m };
    list.forEach((x, i) => {
      const [tag, ti] = x.kind === 'habit' ? ['Habit', 'repeat'] : x.kind === 'big' ? ['Big one', 'receipt'] : TAG[x.tone] || TAG.info;
      const icon = x.m ? mbTile(x.m, x.c, { size: 'md', live: 'hover' }) : mbCat(x.c, { size: 'md', live: 'hover' });
      const go = () => {
        if (x.kind === 'new') return setSection('recurring');
        if (x.m) return openMerchant(x.m);
        if (x.c) { if (!(F.cats.length === 1 && F.cats[0] === x.c)) setCats([x.c]); setSection('categories'); }
      };
      const act = h('button', { type: 'button', class: 'fv-mb-act', onclick: go }, h('span', { text: ACT[x.kind] ? ACT[x.kind](x) : 'Open' }), ic('arrow-right', 'i-sm'));
      const el = h('section', { class: 'fv-mb-incard tone-' + x.tone, style: { '--i': i }, 'data-m': x.m || null, 'data-c': x.c || null },
        h('div', { class: 'top', html: `<span class="ic">${icon}</span>` }, h('span', { class: 'fv-mb-tag ' + (x.kind === 'habit' || x.kind === 'big' ? 'info' : x.tone) }, ic(ti, 'i-xs'), tag)),
        h('h4', { text: x.title }), h('p', { text: x.sub }), act);
      box.append(el);
    });
    mbPaintSel();
  }

  // ── The optional AI wording (GET /api/finance/brief; lib/finance/brief.mjs) ──
  function mbAiAllowed() {
    const off = CFG.finance && CFG.finance.briefAi === false;
    let ok = false; try { ok = typeof connHas === 'function' && !!connHas('claude'); } catch (e) { ok = false; }
    return ok && !off;
  }
  // generate: ask Claude when there is no cached text for today; regenerate: ask again.
  async function mbAiLoad(generate, regenerate) {
    const B = MB.B; if (!B || !mbAiAllowed() || MB.aiBusy) { if (B) MB.aiChecked = B.key + B.mode; return; }
    MB.aiChecked = B.key + B.mode;
    if (generate) { MB.aiBusy = true; mbPaintSrc(B); }
    try {
      const q = `/api/finance/brief?mode=${encodeURIComponent(B.mode)}${generate ? '&ai=1' : ''}${regenerate ? '&regenerate=1' : ''}`;
      const r = await api(q);
      if (MB.B !== B) return;
      const ai = r.ok && r.body && r.body.ai;
      if (!r.ok) { if (generate) toast(r.body.error || 'Claude could not reword the brief just now.', { bad: true }); return; }
      if (!ai || !Array.isArray(ai.sentences) || !ai.sentences.length) return;
      // The server checked the numbers against its own run of this model; check again here, against the numbers on screen.
      if (r.body.key !== B.key) return;
      const v = MBM.validate({ sentences: ai.sentences }, B, mbFmt());
      if (v.replaced >= 3) return;
      MB.ai = { key: B.key, mode: B.mode, sentences: v.sentences, model: ai.model || '' };
      mbPaint(R.ctx, false, true);
    } catch (e) {
      if (generate) toast('Could not reach the OpenDash server.', { bad: true });
    } finally {
      if (generate) { MB.aiBusy = false; if (MB.B === B && MB.el) mbPaintSrc(B); }
    }
  }

  // ── Read aloud: the Web Speech API (the Story voice settings, read only), word by word ──
  function mbVoice() {
    const syn = window.speechSynthesis; if (!syn || typeof window.SpeechSynthesisUtterance !== 'function') return null;
    let prefs = {}; try { if (typeof storyPrefs === 'function') prefs = storyPrefs() || {}; } catch (e) { prefs = {}; }
    if (prefs.voice === false) return { syn, voice: null, prefs };
    const vs = (syn.getVoices() || []).filter(v => /^en/i.test(v.lang));
    let voice = prefs.voiceName ? vs.find(v => v.name === prefs.voiceName) : null;
    if (!voice) {
      const score = v => (/en[-_]GB/i.test(v.lang) ? 4 : 0) + (/natural|neural|online/i.test(v.name) ? 2 : 0) + (v.localService ? 1 : 0);
      voice = vs.sort((p, q) => score(q) - score(p))[0] || null;
    }
    return { syn, voice, prefs };
  }
  function mbReadToggle() { if (MB.read) mbReadStop(); else mbReadStart(); }
  function mbReadStart() {
    const E = MB.el; if (!E) return;
    const sns = [...E.say.querySelectorAll('.fv-mb-sn')];
    if (!sns.length) return;
    const V = mbVoice();
    const speed = V && V.prefs && Number(V.prefs.speed) > 0 ? Number(V.prefs.speed) : 1;
    const run = MB.read = { i: 0, timer: 0, io: null, utt: null };
    E.say.classList.add('is-reading');
    E.readBtn.setAttribute('aria-pressed', 'true');
    E.readBtn.replaceChildren(mbIcon('pause'), h('span', { text: 'Pause reading' }));
    E.hint.textContent = 'Esc stops';
    // Scrolling the hero out of view stops reading.
    if (typeof IntersectionObserver !== 'undefined') { run.io = new IntersectionObserver(es => { if (es.some(en => !en.isIntersecting) && MB.read === run) mbReadStop(); }, { threshold: 0 }); run.io.observe(E.hero); }
    const words = sn => [...sn.querySelectorAll('.st-w')];
    const light = (sn, w) => {
      E.say.querySelectorAll('.st-w.is-now').forEach(x => { x.classList.remove('is-now'); x.classList.add('is-said'); });
      if (w) w.classList.add('is-now');
      // Everything before this word is said.
      for (const x of words(sn)) { if (x === w) break; x.classList.add('is-said'); }
    };
    const next = () => {
      if (MB.read !== run || !E.say.isConnected) return mbReadStop();
      const sn = sns[run.i];
      if (!sn) return mbReadStop(true);
      sns.slice(0, run.i).forEach(s => words(s).forEach(x => x.classList.add('is-said')));
      const text = (MB.sayText && sn.textContent) || '';
      const ws = words(sn);
      const done = () => { if (MB.read !== run) return; ws.forEach(x => { x.classList.remove('is-now'); x.classList.add('is-said'); }); run.i++; next(); };
      // No voice (or one that fails to start): read silently at the Story engine's pace.
      const silent = () => {
        let k = 0;
        const step = () => {
          if (MB.read !== run) return;
          if (k >= ws.length) { done(); return; }
          const w = ws[k++]; light(sn, w);
          const txt = w.textContent || '';
          run.timer = setTimeout(step, 60000 / (155 * speed) + (/[.!?]$/.test(txt) ? 320 : /[,;:]$/.test(txt) ? 180 : 0));
        };
        step();
      };
      if (V && V.voice && !run.silent) {
        const u = new window.SpeechSynthesisUtterance(text);
        u.voice = V.voice; u.lang = V.voice.lang;
        u.rate = clamp((Number(V.prefs.rate) || 1) * speed, 0.5, 2); u.pitch = Number(V.prefs.pitch) || 1; u.volume = V.prefs.volume == null ? 1 : Number(V.prefs.volume);
        let gotBoundary = false, started = false;
        u.onstart = () => { started = true; };
        u.onboundary = ev => {
          if (MB.read !== run || ev.name === 'sentence') return; gotBoundary = true; started = true;
          // data-c holds each word's offset in its sentence (the same text that is spoken).
          let w = null; for (const x of ws) { if (+x.getAttribute('data-c') <= ev.charIndex) w = x; else break; }
          light(sn, w);
        };
        u.onend = () => { if (MB.read !== run || run.utt !== u) return; if (!gotBoundary) ws.forEach(x => x.classList.add('is-said')); done(); };
        u.onerror = () => { if (MB.read !== run || run.utt !== u) return; if (started) { done(); return; } run.utt = null; run.silent = true; silent(); };
        run.utt = u;
        V.syn.cancel(); V.syn.speak(u);
        // A voice that never starts (no audio device, a stuck engine) reads silently instead.
        run.timer = setTimeout(() => { if (MB.read === run && !started && run.utt === u) { run.silent = true; run.utt = null; try { V.syn.cancel(); } catch (e) { /* ignore */ } silent(); } }, 1500);
      } else silent();
    };
    next();
  }
  function mbReadStop() {
    const run = MB.read; MB.read = null;
    if (run) {
      clearTimeout(run.timer);
      if (run.io) run.io.disconnect();
      try { if (run.utt && window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    }
    const E = MB.el; if (!E || !E.say) return;
    E.say.classList.remove('is-reading');
    E.say.querySelectorAll('.st-w.is-now, .st-w.is-said').forEach(x => x.classList.remove('is-now', 'is-said'));
    if (E.readBtn) { E.readBtn.setAttribute('aria-pressed', 'false'); E.readBtn.replaceChildren(mbIcon('vol'), h('span', { text: 'Read aloud' })); }
    if (E.hint) E.hint.textContent = 'Words light up as they are read';
  }
