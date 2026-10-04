  // @part 28-money-story.js · NEW (3 Oct 2026) · OWNER: MS (the money story: the 'money' kind of the Story engine, its beats, its entry points)
  // ── The money story ───────────────────────────────────────────────────
  // User request, 3 Oct: a finance summary story "similar to how Monzo does it",
  // with more animation. A month (or week) recap, full screen, read aloud by the
  // Story engine (src/app/79-story-*.js), one bold colour per beat:
  //   intro    the period, floating category icons
  //   spent    a count-up of what went out, a pill against usual, the pace line
  //            (this period against the usual median and its p25-p75 band)
  //   topcat   the top everyday category: its animated FinSymbols icon, a share ring
  //   race     the top places as a bar race, day by day (realtimeSort)
  //   big      the biggest one-off purchase: a big merchant tile and a burst
  //   bills    bills in the next 30 days (the Overview's "Coming up")
  //   kept     money in, out and kept, with a savings-rate gauge
  //   facts    fun facts: coffees, the regular, the no-spend streak, the busiest day
  //   close    a summary card; Open Finances, Replay, another period
  // Numbers: MSM (25-money-story-model.js) over the page's own model (R.model,
  // VK.groups for merchant names), so they match Finances. Narration: MSM.script
  // (deterministic); "Rewrite with Claude" asks GET /api/finance/story for a
  // wording from aggregates only (server/routes/money-story.mjs), checked number
  // by number here again. Charts use the chart kit (plot, FX); tiles and icons
  // are FinSymbols. Motion: transform/opacity, static under reduced motion.
  // Entry points: the Overview's "Play story" (26-money-ui.js), window.MoneyStory
  // (open, button; the weekly review's "Money this week"), the palette, and the
  // first days of a month through the Suggestions engine when it is there.
  // Nothing runs at load except registering with window.Story (absent in Node).
  const MS = { uid: 0 };
  const MS_HOLD = { intro: 3000, spent: 5600, topcat: 4600, race: 7600, big: 4200, bills: 4600, kept: 5000, facts: 5200, close: 3000 };
  const MS_PLAY = '<path d="M6 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L7.5 3.64A1 1 0 0 0 6 4.5Z"/>';
  const msIc = (name, cls) => `<svg class="i${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${String(name).replace(/[^a-z0-9-]/g, '')}"/></svg>`;
  const msPlayIc = cls => `<svg class="i${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">${MS_PLAY}</svg>`;
  // The same play glyph as an element (the Overview's Play story button, 26-money-ui.js).
  function msPlayEl() {
    const s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('class', 'i'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'currentColor'); s.setAttribute('stroke', 'none'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = MS_PLAY;
    return s;
  }
  const msKit = () => (window.Story && window.Story.kit) || null;
  const msStill = () => { try { return typeof storyReduced === 'function' ? storyReduced() : MK.reduced(); } catch (e) { return !!R.reduced; } };
  const msFS = () => (window.FinSymbols && typeof window.FinSymbols.merchantSymbol === 'function' ? window.FinSymbols : null);
  const msMoney = v => (Math.abs(round2(v) - Math.round(v)) < 0.005 ? gbp(v) : gbp2(v));

  /* ---------- the model, from the page's own data ---------- */
  function msGroups(M) {
    const G = VK.groups(M);
    return { keyOf: G.keyOf, label: G.label, primary: G.primary };
  }
  function msIsCoffee(m, c) {
    const FS = msFS(); if (!FS) return false;
    try { return FS.merchantInfo(m, c).scene === 'coffee' || FS.categoryScene(c) === 'coffee'; } catch (e) { return false; }
  }
  // Finances may not be loaded yet (the story opened from Home or a review): load it quietly.
  async function msReady() {
    if (!R.model) {
      if (!R.loading) await load(true);
      const t0 = Date.now();
      while (R.loading && Date.now() - t0 < 20000) await new Promise(r => setTimeout(r, 120));
    }
    if (R.model) return R.model;
    if (R.err) throw new Error(R.errDown && typeof netErrorMessage === 'function' ? netErrorMessage(new TypeError('Failed to fetch')) : 'Finances could not load: ' + R.err);
    throw new Error('No money data yet. Import a bank CSV or connect your bank in Finances.');
  }
  // opts: {period: 'month' | 'week', ref: 'YYYY-MM-DD' | day number}; no period = this month (last month on the 1st-3rd).
  function msStory(opts, M) {
    opts = opts || {}; M = M || R.model;
    const input = { tx: M.tx, anchor: M.anchor, minN: M.minN, balances: M.a.balances, history: M.a.balance_history, recurring: M.recurring };
    const def = MSM.defaultPeriod(M.anchor);
    const period = opts.period === 'week' || opts.period === 'month' ? opts.period : def.period;
    const ref = typeof opts.ref === 'string' && validIso(opts.ref) ? dnum(opts.ref) : Number.isFinite(opts.ref) ? opts.ref : (opts.period ? M.anchor : def.ref);
    return MSM.build(input, { period, ref, fmt: mbFmt(), weekStart: CFG.weekStart, groups: msGroups(M), isCoffee: msIsCoffee });
  }
  function msPayload(S) {
    const sc = MSM.script(S, mbFmt());
    return { kind: 'money', date: diso(S.anchor), data: { S, tod: 'night' }, script: Object.assign({ palette: '', mood: '' }, sc), ai: { state: mbAiAllowed() ? 'missing' : 'off', model: '' } };
  }
  // Claude's wording (aggregates only, server side), checked again against the numbers here.
  async function msAi(p, o) {
    const S = p && p.data && p.data.S; if (!S) return null;
    if (!mbAiAllowed()) {
      if (o && o.regenerate) throw new Error(CFG.finance && CFG.finance.briefAi === false ? 'Claude’s wording is switched off in Settings.' : 'Connect Claude to reword the story.');
      return null;
    }
    const again = o && o.regenerate;
    const q = `/api/finance/story?period=${S.period}&ref=${diso(S.start)}${again ? (p.script && p.script.source === 'ai' ? '&regenerate=1' : '&ai=1') : ''}`;
    let r;
    try { r = await api(q); } catch (e) { if (again) throw new Error(typeof netErrorMessage === 'function' ? netErrorMessage(e) : 'Could not reach the OpenDash server.'); return null; }
    if (!r.ok) { if (again) throw new Error(r.body.error || 'Claude could not reword the story just now.'); return null; }
    const ai = r.body.ai;
    if (!ai || !ai.lines || r.body.key !== S.key) return null;
    const v = MSM.validate({ lines: ai.lines }, S, mbFmt());
    if (!v.used) { if (again) throw new Error('Claude’s wording did not match the numbers, so the story keeps its own.'); return null; }
    return Object.assign({}, p.script, { lines: v.lines, source: 'ai', model: ai.model || '' });
  }

  /* ---------- words to entities (the voice lights them as it reads) ---------- */
  function msEntities(text, S) {
    const out = [];
    const add = (type, ref, at, len) => {
      if (at < 0 || len <= 0 || out.some(e => at < e.end && at + len > e.start)) return;
      out.push({ type, ref: String(ref), text: text.slice(at, at + len), start: at, end: at + len });
    };
    const lower = text.toLowerCase();
    const names = [];
    for (const c of S.cats.slice(0, 8)) names.push(['category', c.c, c.c]);
    for (const m of S.merchants) names.push(['merchant', m.k, m.name]);
    if (S.topcat && S.topcat.leadName) names.push(['merchant', S.topcat.lead, S.topcat.leadName]);
    if (S.big) names.push(['merchant', S.big.k, S.big.name]);
    if (S.facts.regular) names.push(['merchant', S.facts.regular.k, S.facts.regular.name]);
    for (const b of S.bills.slice(0, 6)) names.push(['merchant', 'bill:' + b.m, b.name]);
    names.sort((p, q) => q[2].length - p[2].length);
    for (const [type, ref, name] of names) if (name && name.length > 1) add(type, ref, lower.indexOf(String(name).toLowerCase()), name.length);
    const nums = MBM.numbersIn(text, mbFmt());
    for (const x of nums) {
      if (x.word || x.vague || !(x.money || x.pct)) continue;
      const at = text.indexOf(x.raw, Math.max(0, x.at - 1));
      add(x.pct ? 'pct' : 'money', x.pct ? x.v : Math.round(x.v * 100) / 100, at, x.raw.length);
    }
    const fact = (re, ref) => { const m = re.exec(text); if (m) add('fact', ref, m.index, m[0].length); };
    fact(/\b\d+ coffees?\b/i, 'coffees');
    fact(/\b\d+-day no-spend streak\b|\b\d+ no-spend days?\b/i, 'streak');
    return out.sort((p, q) => p.start - q.start);
  }
  const msKey = (type, ref) => esc(type + '|' + ref);
  const msMoneyKey = v => msKey('money', Math.round(v * 100) / 100);
  const msRoundKey = v => msKey('money', Math.round(v));

  /* ---------- the stage ---------- */
  function msTone(id, S) {
    if (id === 'spent') return !S.mood.known || Math.abs(S.mood.diff) < 1 ? 'sky' : S.mood.diff < 0 ? 'mint' : 'coral';
    if (id === 'kept') return S.kept.kept >= 0 ? 'green' : 'amber';
    return { intro: 'navy', topcat: 'cat', race: 'ocean', big: 'violet', bills: 'blue', facts: 'pink', close: 'navy' }[id] || 'navy';
  }
  function msBackdrop(root) {
    const bg = root && root.querySelector('.st-bg'); if (!bg || bg.querySelector('.ms-bg')) return;
    const el = document.createElement('div'); el.className = 'ms-bg'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<i class="ms-blob b1"></i><i class="ms-blob b2"></i><i class="ms-blob b3"></i><i class="ms-ring r1"></i><i class="ms-ring r2"></i><i class="ms-grain"></i>';
    bg.insertBefore(el, bg.firstChild);
  }
  function msSetTone(f, b) {
    const root = f.root; if (!root) return;
    msBackdrop(root);
    root.setAttribute('data-ms-tone', b.tone || 'navy');
    if (b.tone === 'cat' && b.S && b.S.topcat) root.style.setProperty('--ms-cat', catColor(b.S.topcat.c));
  }
  function msSay(b, delay) {
    const K = msKit();
    const inner = K ? K.sentenceHtml(b.text || '', b.entities || [], { step: 52, delay: delay == null ? 420 : delay }) : esc(b.text || '');
    return `<p class="ms-say" data-caption="1">${inner}</p>`;
  }
  const msIn = (i, extra) => `style="--i:${i}${extra ? ';' + extra : ''}"`;
  function msCount(scope, base) {
    const K = msKit();
    scope.querySelectorAll('[data-ms-to]').forEach((el, k) => {
      const to = Number(el.getAttribute('data-ms-to')) || 0;
      const f = el.getAttribute('data-ms-fmt');
      const fmt = f === 'money2' ? (x => (Math.abs(x - to) < 0.005 ? msMoney(to) : gbp(x))) : f === 'pct' ? (x => Math.round(x) + '%') : f === 'n' ? (x => String(Math.round(x))) : (x => gbp(x));
      if (K && !msStill()) K.countUp(el, to, { delay: (Number(el.getAttribute('data-ms-delay')) || base || 380) + k * 90, duration: 1200, format: fmt });
      else el.textContent = fmt(to);
    });
  }
  // A chart from the kit in a story frame; disposed a moment after the beat leaves (its exit fades first).
  function msChart(host, name, option) {
    const key = 'ms:' + name + ':' + (++MS.uid);
    const cd = { el: host, chart: host.querySelector('.ms-chart'), setEmpty() {}, title: name };
    const c = plot(cd, key, option, { notMerge: true, noDefer: true });
    return { c, key, done: () => setTimeout(() => disposeChart(key), 700) };
  }
  const W = '#ffffff';
  const msFont = () => tk().font || FONT;

  /* ---------- beats ---------- */
  function msRegisterBeats(ST) {
    // Intro: the period, its range, and the categories floating in.
    ST.registerBeatType('ms-intro', (f, b) => {
      msSetTone(f, b);
      const S = b.S, K = msKit(), FS = msFS();
      const W0 = MSM.words(S, mbFmt());
      const title = S.period === 'month' ? fd(S.start, { month: 'long' }) : (S.thisPeriod ? 'This week' : 'Your week');
      const range = `${fd(S.start, { day: 'numeric', month: 'short' })} – ${fd(S.to, { day: 'numeric', month: 'short' })}${S.thisPeriod ? ' so far' : ''}`;
      const icons = FS ? S.cats.slice(0, 6).map((c, i) => `<span class="ms-orb" ${msIn(i, `--a:${(i * 61 + 18) % 360}deg;--d:${(i % 3) * 0.7}s`)}>${FS.categoryIcon(c.c, { size: 'lg', live: 'loop', color: catColor(c.c) })}</span>`).join('') : '';
      f.cards.innerHTML = `<div class="ms ms-intro">
        <div class="ms-copy">
          <div class="ms-over ms-in" ${msIn(0)}>${msIc('sparkles', 'i-sm')}<span>Your money story</span></div>
          <h2 class="ms-title">${K ? K.driftHtml(title, { delay: 120 }) : esc(title)}</h2>
          <div class="ms-sub ms-in" ${msIn(3)}>${esc(range)} · ${esc(String(S.payments))} payment${S.payments === 1 ? '' : 's'}</div>
          ${msSay(b, 900)}
        </div>
        <div class="ms-viz ms-orbit ms-in" ${msIn(2)} aria-hidden="true"><div class="ms-orbit-c"><b>${esc(gbp(S.spent))}</b><span>${esc(W0.when)}</span></div>${icons}</div>
      </div>`;
      if (FS && typeof FS.activate === 'function') FS.activate(f.cards, { max: 8 });
    });

    // Spent against usual: the count-up, the pill and the pace line.
    ST.registerBeatType('ms-spent', (f, b) => {
      msSetTone(f, b);
      const S = b.S, W0 = MSM.words(S, mbFmt());
      const d = S.mood.known ? S.mood.diff : null;
      const pill = d == null ? `<span class="ms-pill">${msIc('chart-line', 'i-sm')}<span>About ${esc(gbp(S.perDay))} a day</span></span>`
        : Math.abs(d) < 1 ? `<span class="ms-pill">${msIc('minus', 'i-sm')}<span>Right on usual</span></span>`
          : `<span class="ms-pill ${d < 0 ? 'good' : 'warn'}" data-key="${msRoundKey(Math.abs(d))}">${msIc(d < 0 ? 'arrow-down' : 'arrow-up', 'i-sm')}<span>${esc(gbp(Math.abs(d)))} ${d < 0 ? 'less' : 'more'} than usual</span></span>`;
      f.cards.innerHTML = `<div class="ms ms-spent">
        <div class="ms-copy">
          <div class="ms-over ms-in" ${msIn(0)}>Spent ${esc(W0.when)}</div>
          <div class="ms-num ms-in" ${msIn(1)} data-key="${msRoundKey(S.spent)}"><b class="num" data-ms-to="${S.spent}" data-ms-delay="320">${esc(gbp(S.spent))}</b></div>
          <div class="ms-in" ${msIn(2)}>${pill}</div>
          ${msSay(b)}
        </div>
        <div class="ms-viz ms-in ms-card" ${msIn(3)}>
          <div class="ms-viz-h"><span>${S.pace ? 'Against your usual ' + esc(W0.unit) : 'Day by day'}</span><span class="ms-legend">${S.pace ? `<i class="l-now"></i>This ${esc(W0.unit)}<i class="l-usual"></i>Usual` : ''}</span></div>
          <div class="ms-chart"></div>
        </div>
      </div>`;
      msCount(f.cards);
      const host = f.cards.querySelector('.ms-viz');
      let ch = null;
      const draw = () => {
        if (!host.isConnected) return;
        const len = S.len, xs = Array.from({ length: len }, (_, i) => i);
        const top = Math.max(1, ...S.curve, ...(S.pace ? S.pace.hi : [])) * 1.12;
        const lbl = i => (S.period === 'week' ? fd(S.start + i, { weekday: 'short' }) : fDay(S.start + i));
        const series = [];
        if (S.pace) {
          series.push({ id: 'lo', type: 'line', data: S.pace.lo, stack: 'band', symbol: 'none', silent: true, lineStyle: { opacity: 0 }, smooth: 0.3, smoothMonotone: 'x', z: 1 });
          series.push({ id: 'band', type: 'line', data: S.pace.hi.map((v, i) => round2(v - S.pace.lo[i])), stack: 'band', symbol: 'none', silent: true, lineStyle: { opacity: 0 }, areaStyle: { color: 'rgba(255,255,255,0.12)' }, smooth: 0.3, smoothMonotone: 'x', z: 1 });
          const u = FX.smoothLine({ id: 'usual', data: S.pace.med, color: W, dashed: true, width: 1.6, opacity: 0.62, draw: 900 });
          series.push(u);
        }
        const now = FX.area({ id: 'now', data: S.curve, color: W, width: 3.2, area: 0.34, draw: 1700, endLabel: v => gbp(v) });
        now.endLabel.color = W; now.endLabel.fontSize = 14; now.endLabel.fontWeight = 700;
        series.push(now);
        series.push(FX.pulse({ id: 'dot', at: [S.curve.length - 1, S.curve[S.curve.length - 1]], color: W, size: 10, delay: 1500 }));
        const option = base({
          tooltip: { show: false },
          grid: { left: 30, right: 72, top: 26, bottom: 30, containLabel: false },
          xAxis: { type: 'category', data: xs, boundaryGap: false, axisLine: { show: false }, axisTick: { show: false },
            axisLabel: { color: 'rgba(255,255,255,0.66)', fontSize: 12, fontFamily: msFont(), formatter: (v, i) => lbl(Number(i)), interval: i => (S.period === 'week' ? true : i === 0 || i === len - 1 || i === Math.round((len - 1) / 2)) } },
          yAxis: { type: 'value', show: false, max: top, min: 0 },
          series,
        });
        ch = msChart(host, 'pace', option);
      };
      const t = setTimeout(draw, msStill() ? 0 : 320);
      return () => { clearTimeout(t); if (ch) ch.done(); };
    });

    // The top everyday category: its animated icon, the amount and its share.
    ST.registerBeatType('ms-topcat', (f, b) => {
      msSetTone(f, b);
      const S = b.S, tc = S.topcat, FS = msFS(), W0 = MSM.words(S, mbFmt());
      const share = Math.round(tc.share * 100);
      const lead = tc.leadName && tc.leadM ? `<div class="ms-lead ms-in" ${msIn(4)} data-key="${msKey('merchant', tc.lead)}">${FS ? FS.merchantSymbol(tc.leadM, tc.c, { size: 'sm', badge: false, live: false }) : ''}<span>Mostly at <b>${esc(tc.leadName)}</b></span></div>` : '';
      f.cards.innerHTML = `<div class="ms ms-topcat">
        <div class="ms-copy">
          <div class="ms-over ms-in" ${msIn(0)}>Top ${tc.everyday ? 'everyday ' : ''}category ${esc(W0.when)}</div>
          <h2 class="ms-name ms-in" ${msIn(1)} data-key="${msKey('category', tc.c)}">${esc(tc.c)}</h2>
          <div class="ms-num sm ms-in" ${msIn(2)} data-key="${msRoundKey(tc.v)}"><b class="num" data-ms-to="${tc.v}" data-ms-delay="420">${esc(gbp(tc.v))}</b></div>
          ${lead}
          ${msSay(b, 640)}
        </div>
        <div class="ms-viz ms-hero ms-in" ${msIn(2)}>
          <svg class="ms-share" viewBox="0 0 120 120" aria-hidden="true"><circle class="tr" cx="60" cy="60" r="54" pathLength="100"/><circle class="fl" cx="60" cy="60" r="54" pathLength="100" style="--p:${clamp(share, 0, 100)}"/></svg>
          <div class="ms-hero-ic">${FS ? FS.categoryIcon(tc.c, { size: 'hero', live: 'loop', color: catColor(tc.c), label: tc.c }) : ''}</div>
          <div class="ms-share-l" data-key="${msKey('pct', share)}"><b class="num" data-ms-to="${share}" data-ms-fmt="pct" data-ms-delay="700">${share}%</b><span>of all your spending</span></div>
        </div>
      </div>`;
      msCount(f.cards);
      if (FS && typeof FS.activate === 'function') FS.activate(f.cards, { max: 4 });
    });

    // The top places: a bar race through the period, day by day.
    ST.registerBeatType('ms-race', (f, b) => {
      msSetTone(f, b);
      const S = b.S, FS = msFS(), W0 = MSM.words(S, mbFmt());
      const narrow = (window.innerWidth || 1200) < 720;
      const podium = S.merchants.slice(0, 3).map((m, i) => `<div class="ms-pod ms-in" ${msIn(3 + i)} data-key="${msKey('merchant', m.k)}"><span class="ms-pod-n">${i + 1}</span>${FS ? FS.merchantSymbol(m.m, m.c, { size: 'sm', badge: false, live: false }) : ''}<b>${esc(m.name)}</b><span class="num">${esc(gbp(m.v))}</span><small>${esc(String(m.n))} visit${m.n === 1 ? '' : 's'}</small></div>`).join('');
      f.cards.innerHTML = `<div class="ms ms-race">
        <div class="ms-copy">
          <div class="ms-over ms-in" ${msIn(0)}>Top places ${esc(W0.when)}</div>
          <h2 class="ms-name ms-in" ${msIn(1)}>Where it went</h2>
          <div class="ms-podium">${podium}</div>
          ${msSay(b, 700)}
        </div>
        <div class="ms-viz ms-in ms-card" ${msIn(2)}><div class="ms-viz-h"><span>Running total, day by day</span><b class="ms-race-day num" aria-hidden="true"></b></div><div class="ms-chart ms-race-c" style="--rows:${S.merchants.length}"></div></div>
      </div>`;
      const host = f.cards.querySelector('.ms-viz'), dayEl = f.cards.querySelector('.ms-race-day');
      const frames = S.race.frames, nF = frames.length;
      const labels = []; const seen = new Set();
      S.merchants.forEach(m => { let l = m.name; while (seen.has(l)) l += ' '; seen.add(l); labels.push(l); });
      const gut = narrow ? 120 : 176;
      let ch = null, timer = 0;
      const anim = FX.animated() && !msStill() && nF > 1;
      const step = clamp(Math.round(5200 / Math.max(1, nF)), 140, 800);
      const dataAt = i => frames[i].values.map(v => ({ value: v }));
      const day = i => fd(frames[i].n, S.period === 'week' ? { weekday: 'short' } : { day: 'numeric', month: 'short' });
      const draw = () => {
        if (!host.isConnected) return;
        const rt = VK.richTiles(S.merchants.map((m, j) => ({ name: m.m, cat: m.c, label: labels[j], text: m.name })), narrow ? 22 : 26, { max: narrow ? 11 : 17, weight: 650, fontSize: narrow ? 12.5 : 14.5 });
        rt.rich.n.color = W;
        const start = anim ? 0 : nF - 1;
        if (dayEl) dayEl.textContent = day(start);
        const option = base({
          tooltip: { show: false },
          grid: { left: gut + 12, right: 86, top: 8, bottom: 8 },
          xAxis: { type: 'value', max: 'dataMax', show: false },
          yAxis: { type: 'category', inverse: true, data: labels, max: labels.length - 1, axisLine: { show: false }, axisTick: { show: false }, axisLabel: rt.axisLabel(gut), animationDuration: 300, animationDurationUpdate: 300 },
          series: [{ id: 'race', type: 'bar', realtimeSort: true, data: dataAt(start), barMaxWidth: 28, barCategoryGap: '30%',
            itemStyle: { color: 'rgba(255,255,255,0.92)', borderRadius: [0, 14, 14, 0] },
            label: { show: true, position: 'right', distance: 10, valueAnimation: anim, color: W, fontWeight: 700, fontSize: narrow ? 13 : 15, fontFamily: msFont(), formatter: p => (p.value > 0 ? gbp(p.value) : '') },
            animation: anim, animationDuration: anim ? 500 : 0, animationDurationUpdate: anim ? Math.round(step * 0.95) : 0, animationEasing: 'linear', animationEasingUpdate: 'linear' }],
        });
        ch = msChart(host, 'race', option);
        if (!anim || !ch.c) return;
        let i = 0;
        timer = setInterval(() => {
          if (!host.isConnected || !ch.c || ch.c.inst.isDisposed()) { clearInterval(timer); return; }
          if (f.root && f.root.classList.contains('is-paused')) return;
          i++;
          if (i >= nF) { clearInterval(timer); return; }
          ch.c.inst.setOption({ series: [{ id: 'race', data: dataAt(i) }] });
          if (dayEl) dayEl.textContent = day(i);
        }, step);
      };
      const t = setTimeout(draw, msStill() ? 0 : 380);
      return () => { clearTimeout(t); clearInterval(timer); if (ch) ch.done(); };
    });

    // The biggest purchase: a big tile, a burst, the amount.
    ST.registerBeatType('ms-big', (f, b) => {
      msSetTone(f, b);
      const S = b.S, x = S.big, FS = msFS();
      const burst = Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2, r = 120 + (i * 37) % 70; return `<i style="--tx:${Math.round(Math.cos(a) * r)}px;--ty:${Math.round(Math.sin(a) * r)}px;--k:${i % 4};--r:${(i * 47) % 180}deg"></i>`; }).join('');
      f.cards.innerHTML = `<div class="ms ms-big">
        <div class="ms-copy">
          <div class="ms-over ms-in" ${msIn(0)}>Biggest ${x.oneOff ? 'one-off ' : ''}purchase</div>
          <div class="ms-num ms-in" ${msIn(1)} data-key="${msMoneyKey(x.a)}"><b class="num" data-ms-to="${x.a}" data-ms-fmt="money2" data-ms-delay="420">${esc(msMoney(x.a))}</b></div>
          <h2 class="ms-name sm ms-in" ${msIn(2)} data-key="${msKey('merchant', x.k)}">${esc(x.name)}</h2>
          <div class="ms-meta ms-in" ${msIn(3)}><span>${msIc('calendar-days', 'i-sm')}${esc(fd(x.n, { weekday: 'long', day: 'numeric', month: 'long' }))}</span><span>${FS ? FS.categoryIcon(x.c, { size: 'xs', live: false, plain: true }) : ''}${esc(x.c)}</span></div>
          ${msSay(b, 760)}
        </div>
        <div class="ms-viz ms-bigtile ms-in" ${msIn(1)}><span class="ms-burst" aria-hidden="true">${burst}</span>${FS ? FS.merchantSymbol(x.m, x.c, { size: 'hero', live: false, label: x.name }) : ''}</div>
      </div>`;
      msCount(f.cards);
    });

    // Bills in the next 30 days, on a track and as a list.
    ST.registerBeatType('ms-bills', (f, b) => {
      msSetTone(f, b);
      const S = b.S, FS = msFS(), A = S.anchor, H = 30;
      const list = S.bills.slice(0, 5);
      const X = n => clamp((n - A) / H * 100, 0, 100);
      const track = S.bills.map((x, i) => `<span class="ms-tdot" style="--x:${X(x.n).toFixed(1)}%;--i:${i}" title="${esc(x.name)}"></span>`).join('');
      const rows = list.map((x, i) => `<div class="ms-bill ms-in" ${msIn(3 + i)} data-key="${msKey('merchant', 'bill:' + x.m)}">
          <span class="ms-bill-d num">${esc(x.due ? 'Now' : fd(x.n, { day: 'numeric', month: 'short' }))}</span>${FS ? FS.merchantSymbol(x.m, x.c, { size: 'sm', badge: false, live: false }) : ''}
          <b>${esc(x.name)}</b><span class="ms-bill-f">${esc(String(x.freq || '').toLowerCase())}</span><span class="ms-bill-a num">${esc(msMoney(x.amount))}</span></div>`).join('');
      const more = S.bills.length > list.length ? `<div class="ms-more ms-in" ${msIn(3 + list.length)}>+${S.bills.length - list.length} more</div>` : '';
      f.cards.innerHTML = `<div class="ms ms-bills">
        <div class="ms-copy">
          <div class="ms-over ms-in" ${msIn(0)}>Coming up · next 30 days</div>
          <div class="ms-num ms-in" ${msIn(1)} data-key="${msRoundKey(S.billsTotal)}"><b class="num" data-ms-to="${S.billsTotal}" data-ms-delay="380">${esc(gbp(S.billsTotal))}</b></div>
          <div class="ms-sub ms-in" ${msIn(2)}>${esc(String(S.bills.length))} regular payment${S.bills.length === 1 ? '' : 's'}</div>
          ${msSay(b, 700)}
        </div>
        <div class="ms-viz ms-card ms-in" ${msIn(2)}>
          <div class="ms-track"><i class="ms-track-l"></i>${track}<span class="ms-track-a">Today</span><span class="ms-track-b">${esc(fd(A + H, { day: 'numeric', month: 'short' }))}</span></div>
          <div class="ms-bills-l">${rows}${more}</div>
        </div>
      </div>`;
      msCount(f.cards);
    });

    // Kept: money in, out, and the savings-rate gauge.
    ST.registerBeatType('ms-kept', (f, b) => {
      msSetTone(f, b);
      const S = b.S, K = S.kept, W0 = MSM.words(S, mbFmt());
      const rate = K.rate == null ? null : K.rate;
      const v = rate == null ? 0 : clamp(rate * 100, 0, 100);
      f.cards.innerHTML = `<div class="ms ms-kept">
        <div class="ms-copy">
          <div class="ms-over ms-in" ${msIn(0)}>${K.kept >= 0 ? 'Kept' : 'Over'} ${esc(W0.when)}</div>
          <div class="ms-num ms-in" ${msIn(1)} data-key="${msRoundKey(Math.abs(K.kept))}"><b class="num" data-ms-to="${Math.abs(K.kept)}" data-ms-delay="400">${esc(gbp(Math.abs(K.kept)))}</b></div>
          <div class="ms-rows ms-in" ${msIn(2)}>
            <div class="ms-row" data-key="${msRoundKey(K.inc)}"><i class="d-in"></i><span>Money in</span><b class="num" data-ms-to="${K.inc}" data-ms-delay="700">${esc(gbp(K.inc))}</b></div>
            <div class="ms-row" data-key="${msRoundKey(K.out)}"><i class="d-out"></i><span>Spent</span><b class="num" data-ms-to="${K.out}" data-ms-delay="800">${esc(gbp(K.out))}</b></div>
          </div>
          ${msSay(b, 760)}
        </div>
        <div class="ms-viz ms-in" ${msIn(2)}><div class="ms-chart ms-gauge"></div></div>
      </div>`;
      msCount(f.cards);
      const host = f.cards.querySelector('.ms-viz');
      let ch = null;
      const draw = () => {
        if (!host.isConnected) return;
        const anim = FX.animated() && !msStill();
        const option = base({
          tooltip: { show: false },
          series: [{ id: 'g', type: 'gauge', startAngle: 215, endAngle: -35, min: 0, max: 100, radius: '92%', center: ['50%', '56%'],
            progress: { show: true, roundCap: true, width: 22, itemStyle: { color: W } },
            axisLine: { roundCap: true, lineStyle: { width: 22, color: [[1, 'rgba(255,255,255,0.16)']] } },
            pointer: { show: false }, anchor: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
            title: { show: true, offsetCenter: [0, '30%'], color: 'rgba(255,255,255,0.75)', fontSize: 15, fontFamily: msFont(), fontWeight: 600 },
            detail: { valueAnimation: anim, offsetCenter: [0, '-4%'], fontSize: 54, fontWeight: 800, fontFamily: msFont(), color: W,
              formatter: x => (rate == null ? '—' : rate < 0 ? `−${Math.round(Math.abs(rate) * 100)}%` : `${Math.round(x)}%`) },
            data: [{ value: round2(v), name: rate == null ? 'nothing came in' : rate >= 0 ? 'savings rate' : 'over what came in' }],
            animation: anim, animationDuration: 1500, animationEasing: 'cubicOut' }],
        });
        ch = msChart(host, 'kept', option);
      };
      const t = setTimeout(draw, msStill() ? 0 : 420);
      return () => { clearTimeout(t); if (ch) ch.done(); };
    });

    // Fun facts: up to four cards that pop as the voice names them.
    ST.registerBeatType('ms-facts', (f, b) => {
      msSetTone(f, b);
      const S = b.S, F0 = S.facts, FS = msFS();
      const cards = [];
      if (F0.coffees) cards.push({ key: msKey('fact', 'coffees'), ic: FS ? FS.categoryIcon('Coffee', { size: 'lg', live: 'loop', scene: 'coffee' }) : msIc('coffee'), n: F0.coffees.n, l: F0.coffees.n === 1 ? 'coffee' : 'coffees', s: `${gbp(F0.coffees.v)} in all` });
      if (F0.regular) cards.push({ key: msKey('merchant', F0.regular.k), ic: FS ? FS.merchantSymbol(F0.regular.m, F0.regular.c, { size: 'lg', badge: false, live: false }) : msIc('repeat'), n: F0.regular.n, l: 'visits', s: `Your regular: ${F0.regular.name}` });
      const dots = Array.from({ length: S.days }, (_, i) => { const n = S.start + i; const on = F0.streak && n >= F0.streak.from && n <= F0.streak.to; return `<i class="${on ? 'on' : ''}" style="--k:${i}"></i>`; }).join('');
      if (F0.streak || F0.noSpendDays) cards.push({ key: msKey('fact', 'streak'), ic: `<span class="ms-days" aria-hidden="true">${dots}</span>`, n: F0.streak ? F0.streak.len : F0.noSpendDays, l: F0.streak ? 'day no-spend streak' : (F0.noSpendDays === 1 ? 'no-spend day' : 'no-spend days'), s: F0.streak ? `${fd(F0.streak.from, { day: 'numeric', month: 'short' })} – ${fd(F0.streak.to, { day: 'numeric', month: 'short' })}` : `${F0.noSpendDays} of ${S.days} days`, wide: true, days: true });
      if (F0.busiest) cards.push({ key: msKey('fact', 'busiest'), ic: msIc('flame'), n: null, big: gbp(F0.busiest.v), l: 'busiest day', s: fd(F0.busiest.n, { weekday: 'long', day: 'numeric', month: 'short' }) });
      // An odd card out takes the whole row.
      const narrowCards = cards.filter(c => !c.wide);
      if (narrowCards.length % 2) narrowCards[narrowCards.length - 1].wide = true;
      f.cards.innerHTML = `<div class="ms ms-facts">
        <div class="ms-copy">
          <div class="ms-over ms-in" ${msIn(0)}>Fun facts</div>
          ${msSay(b, 300)}
        </div>
        <div class="ms-viz ms-fgrid">${cards.map((c, i) => `<div class="ms-fact${c.wide ? ' wide' : ''}${c.days ? ' days' : ''} ms-pop" ${msIn(1 + i)} data-key="${c.key}"><span class="ms-fic">${c.ic}</span><b class="num">${c.n == null ? esc(c.big) : `<span data-ms-to="${c.n}" data-ms-fmt="n" data-ms-delay="${600 + i * 160}">${esc(String(c.n))}</span>`}</b><span class="ms-fl">${esc(c.l)}</span><small>${esc(c.s)}</small></div>`).join('')}</div>
      </div>`;
      msCount(f.cards);
      if (FS && typeof FS.activate === 'function') FS.activate(f.cards, { max: 4 });
    });

    // The summary card, then Open Finances / Replay / another period.
    ST.registerBeatType('ms-close', (f, b) => {
      msSetTone(f, b);
      const S = b.S, FS = msFS(), W0 = MSM.words(S, mbFmt());
      const rows = [];
      const d = S.mood.known ? S.mood.diff : null;
      rows.push(['wallet', 'Spent', gbp(S.spent), d == null || Math.abs(d) < 1 ? '' : `${gbp(Math.abs(d))} ${d < 0 ? 'under' : 'over'} usual`, '', d != null && d < -1 ? 'good' : d != null && d > 1 ? 'warn' : '']);
      if (S.topcat) rows.push([null, 'Top category', S.topcat.c, gbp(S.topcat.v), FS ? FS.categoryIcon(S.topcat.c, { size: 'sm', live: false, color: catColor(S.topcat.c) }) : '']);
      if (S.merchants[0]) rows.push([null, 'Top place', S.merchants[0].name, gbp(S.merchants[0].v) + (S.big && S.big.k === S.merchants[0].k ? ' · also the biggest purchase' : ''), FS ? FS.merchantSymbol(S.merchants[0].m, S.merchants[0].c, { size: 'sm', badge: false, live: false }) : '']);
      if (S.big && !(S.merchants[0] && S.big.k === S.merchants[0].k)) rows.push([null, 'Biggest', S.big.name, msMoney(S.big.a), FS ? FS.merchantSymbol(S.big.m, S.big.c, { size: 'sm', badge: false, live: false }) : '']);
      if (S.kept.inc > 0.004) rows.push(['piggy-bank', S.kept.kept >= 0 ? 'Kept' : 'Over', gbp(Math.abs(S.kept.kept)), S.kept.rate != null && S.kept.kept >= 0 ? `${Math.round(S.kept.rate * 100)}% of money in` : '', '', S.kept.kept >= 0 ? 'good' : 'warn']);
      if (S.bills.length) rows.push(['calendar-check', 'Bills ahead', gbp(S.billsTotal), `${S.bills.length} in 30 days`, '']);
      const title = S.period === 'month' ? fd(S.start, { month: 'long', year: 'numeric' }) : `${fd(S.start, { day: 'numeric', month: 'short' })} – ${fd(S.to, { day: 'numeric', month: 'short' })}`;
      f.cards.innerHTML = `<div class="ms ms-close">
        <div class="ms-copy">
          <div class="ms-over ms-in" ${msIn(0)}>${esc(S.thisPeriod ? 'So far' : 'That was')}</div>
          <h2 class="ms-name ms-in" ${msIn(1)}>${esc(W0.headline)}</h2>
          ${msSay(b, 500)}
          <div class="ms-acts ms-in" ${msIn(4)}></div>
          <div class="ms-alts ms-in" ${msIn(5)}><span>Another story</span></div>
        </div>
        <div class="ms-viz ms-receipt ms-in" ${msIn(2)}>
          <div class="ms-rc-h"><span>${msIc('receipt', 'i-sm')}${esc(title)}</span><span class="num">${esc(String(S.payments))} payments</span></div>
          ${rows.map((r, i) => `<div class="ms-rc ms-in ${r[5] || ''}" ${msIn(3 + i)}><span class="ms-rc-ic">${r[4] || msIc(r[0] || 'circle', 'i-sm')}</span><span class="ms-rc-l">${esc(r[1])}</span><b>${esc(r[2])}</b><small>${esc(r[3])}</small></div>`).join('')}
        </div>
      </div>`;
      const acts = f.cards.querySelector('.ms-acts');
      const alts = f.cards.querySelector('.ms-alts');
      const btn = (label, iconHtml, run, cls, cur, host) => {
        const x = document.createElement('button'); x.type = 'button'; x.className = 'btn ' + (cls || 'btn-secondary');
        x.innerHTML = (iconHtml || '') + `<span>${esc(label)}</span>`;
        if (cur) { x.setAttribute('aria-current', 'true'); x.classList.add('is-cur'); }
        x.addEventListener('click', (e) => { e.stopPropagation(); if (cur) return; run(); });
        (host || acts).appendChild(x);
        return x;
      };
      btn('Open Finances', msIc('external-link'), () => { if (window.Story) window.Story.openDetails(); }, 'btn-primary');
      btn('Replay', msIc('rotate-ccw'), () => { if (window.Story) window.Story.replay(); });
      // Other periods (the one playing is marked current; choosing it again does nothing).
      const A = S.anchor;
      const thisM = U0.mStart(U0.mIdx(A)), lastM = U0.mStart(U0.mIdx(A) - 1);
      const wk = MSM.weekStartOf(A, CFG.weekStart);
      const opts = [['month', lastM, fd(lastM, { month: 'long' })], ['month', thisM, fd(thisM, { month: 'long' }) + ' so far'], ['week', wk - 7, 'Last week']];
      for (const [p, ref, label] of opts) {
        const cur = p === S.period && ref === S.start;
        btn(label, '', () => msOpen({ period: p, ref: diso(ref) }), 'btn-ghost btn-sm ms-alt', cur, alts);
      }
    });
  }
  const U0 = MBM.util;

  /* ---------- the storyboard ---------- */
  function msBuilder(ctx) {
    const S = ctx.data && ctx.data.S; if (!S) return [];
    const sc = ctx.script || {};
    const L = Object.assign({}, MSM.script(S, mbFmt()).lines, sc.lines || {});
    // The backdrop shows behind the Play poster too.
    const root = document.querySelector('.story[data-kind="money"]');
    if (root) { msBackdrop(root); if (!root.hasAttribute('data-ms-tone')) root.setAttribute('data-ms-tone', 'navy'); }
    return MSM.beats(S, { lines: L }).map(id => {
      const text = L[id] || '';
      return { id, type: 'ms-' + id, say: text, text, entities: msEntities(text, S), S, tone: msTone(id, S), bg: { tod: 'night', cond: 'none' },
        hold: MS_HOLD[id], scene: id === 'intro' ? 'finance' : null, auto: id === 'close' ? false : undefined };
    });
  }

  /* ---------- entry points ---------- */
  // True when there is (or may be) money data: the Finances data is loaded, or not yet known.
  function msCanPlay() { return !!(window.Story && typeof window.Story.registerKind === 'function') && (!R.data || !!R.model); }
  function msOpen(o) {
    o = o || {};
    if (!window.Story) return null;
    const variant = (o.period || 'auto') + ':' + (o.ref == null ? '' : String(o.ref));
    return window.Story.open('money', { autoplay: o.autoplay !== false, period: o.period, ref: o.ref, variant });
  }
  // A "Play story" button for other pages ({label, period, ref, cls}).
  function msButton(o) {
    o = o || {};
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'btn btn-secondary ms-entry' + (o.cls ? ' ' + String(o.cls).replace(/[^a-zA-Z0-9 _-]/g, '') : '');
    b.innerHTML = msPlayIc('i-sm') + `<span>${esc(o.label || 'Play my money story')}</span>`;
    b.addEventListener('click', () => msOpen({ period: o.period, ref: o.ref }));
    return b;
  }
  // The weekly review: "Money this week" beside its Play button (the week starting fromIso).
  function msWeekEntry(root, fromIso) {
    if (!root || !msCanPlay()) return;
    const row = root.querySelector(':scope > .st-entry-row');
    if (!row || row.querySelector('.ms-entry')) return;
    const today = diso(localToday());
    const ref = validIso(fromIso) && fromIso <= today ? fromIso : undefined;
    const b = msButton({ label: 'Money this week', period: 'week', ref, cls: 'st-entry' });
    row.appendChild(b);
    // Finances not loaded yet: look quietly (or wait for a look already running), and take the button away when there is no money data.
    if (!R.model) msReady().catch(() => { if (!R.model) b.remove(); });
  }
  // The first days of a month: last month as a story ({due, ref, month, days, key}); the Suggestions engine words it.
  function msMonthlyOffer(now) {
    const n = Number.isFinite(now) ? now : localToday();
    const dom = U0.domOf(n);
    if (dom > 3) return { due: false };
    const mi = U0.mIdx(n) - 1, ref = U0.mStart(mi);
    return { due: true, ref: diso(ref), month: fd(ref, { month: 'long' }), days: U0.mStart(mi + 1) - ref, key: 'money-story:' + diso(ref).slice(0, 7) };
  }
  // For the Suggestions engine's snapshot (68-suggest-context.js): is there money data, is a month's story due?
  // On the 1st to the 3rd it loads Finances quietly once, then asks the engine to look again.
  function msStatus(now) {
    if (CFG.features && CFG.features.finance === false) return { ok: false, known: true, offer: { due: false } };
    // A given Date: its HOME day (Clock), else its own; none: localToday() (the home day).
    const n = now instanceof Date ? Math.round(Date.parse((typeof Clock !== 'undefined' ? Clock.parts(now.getTime(), Clock.home()).iso : new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)) + 'T00:00:00Z') / DAY_MS) : localToday();   // clock-ok: home day
    const offer = msMonthlyOffer(n);
    if (offer.due && !R.data && !R.loading && !MS.probed) {
      MS.probed = true;
      load(true).then(() => { if (R.model && typeof sgRefresh === 'function') sgRefresh(); }).catch(() => {});
    }
    return { ok: !!R.model, known: !!R.data, offer };
  }

  /* ---------- registering with the Story engine (the page only; Node has no window.Story) ---------- */
  (function msRegister() {
    const ST = typeof window !== 'undefined' ? window.Story : null;
    if (!ST || typeof ST.registerKind !== 'function') return;
    msRegisterBeats(ST);
    ST.registerBuilder('money', msBuilder);
    ST.registerKind('money', {
      label: 'Money story', view: 'finance', dark: true,
      async load(o) { const M = await msReady(); const S = msStory(o, M); return msPayload(S); },
      ai: msAi,
      details() { if (typeof setView === 'function') setView('finance'); },
    });
    window.MoneyStory = Object.freeze({ open: msOpen, button: msButton, weekEntry: msWeekEntry, monthlyOffer: msMonthlyOffer, status: msStatus });
    if (typeof registerCommand === 'function') {
      registerCommand({ id: 'story-money', label: 'Play my money story', icon: 'wallet', group: 'Go to', keywords: 'money story finance month summary spending recap monzo play read aloud', run: () => msOpen({}) });
      registerCommand({ id: 'story-money-week', label: 'Play my money week (story)', icon: 'wallet', group: 'Go to', keywords: 'money story week spending recap play', run: () => msOpen({ period: 'week' }) });
    }
  })();
