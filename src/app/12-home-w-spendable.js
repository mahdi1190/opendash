/* ============================================================
   HOME widget "spendable": Payday & safe to spend (WIDGETS_CATALOGUE.md 3.14).
   OWNER: the "spendable" widget builder (Phase 1, wave 2). Read-only: nothing
   here moves money, and nothing here writes data (Sync starts the same read-only
   finance update as the Finances page; Hide amounts and the settings are UI).

   Looks ahead where Money looks back: what you can spend each day until payday.
   Data: GET /api/finance/glance?cushion=&mode= (W0-C, lib/finance/glance.mjs: the
   Finances Overview's own numbers) through homeData('fin-glance'), 10 minutes old
   at most, fetched again when the settings change or a Sync finishes. The words and
   shapes are pure: 12-home-spendable-logic.js (hspModel, hspSay, hspSpark...).

   S   the big "£23 a day" safe to spend and "Payday in 9 days" ("Month ends in 9
       days" in month mode); no balance: "£412 of bills before payday" instead
   M   + the next 5 bills before payday (initial tile, name, day, amount) and
       "£X left after bills"
   L   + the balance with a 60-day sparkline and its 30-day change, one row per
       account (setting), the projected lowest point before payday
   Clicks: the number = Finances > Overview; a bill = Finances > Recurring with that
   merchant selected (FinanceView.setMerchant: the bar's chip clears it); the balance
   and accounts = Finances > Cash flow. Sync = POST /api/finance/update (a second press
   while it runs does nothing; a 409 follows the update already running). The eye =
   Hide amounts (homeUI.hideAmounts, UI only): blurs this widget and Money; hover or
   focus shows an amount; screen readers hear "hidden".
   States: loading skeleton; no finance data = ctx.off "Import a statement or connect a
   bank" + Open Finances; read failed = Retry; data over 3 days old = "Bank data 4 days
   old · Sync". Gate: features.finance (the platform hides it when off).
   Motion: the number counts up and the sparkline draws once per entry (the data's
   first showing); later changes morph (the number counts from the old value, the line
   moves point by point); new bills fade in. Reduced motion: all instant.
   Styles: 13-home-w-spendable.css. Tests: tests/home-w-spendable.test.mjs.
   ============================================================ */
const _HSP_DATA = 'fin-glance';
const _HSP_MAX_AGE = 10 * 60 * 1000;
const HSP_DEFAULT_CUSHION = 100;                 // = MBM.CUSHION (src/finance/25-money-model.js; a test compares)
// What was drawn last (later changes morph from it) and the Sync in flight.
const _hsp = { last: null, sync: null, poll: 0 };

registerHomeWidget({
  id: 'spendable', title: 'Payday & safe to spend', icon: 'piggy-bank', order: 230, group: 'money', gate: 'finance',
  description: 'What you can spend each day until payday, after bills',
  sizes: ['s', 'm', 'l'], defaultSize: 's', defaultHidden: true, fresh: true,
  aliases: ['safe to spend', 'payday', 'spendable', 'bills', 'balance', 'balances', 'left to spend'],
  defaults: { cushion: null, mode: 'auto', accounts: true },
  available: () => typeof hspModel === 'function',
  sample: (kit) => hspSample(kit),
  render(el, ctx) { return _hspRender(el, ctx || {}); },
  settings(anchor, ctx) { _hspSettings(anchor, ctx); },
  unmount() { _hsp.last = null; },
});

/* ---------- small things ---------- */
function _hspCfg(k) { return typeof APP_CONFIG !== 'undefined' && APP_CONFIG ? APP_CONFIG[k] : undefined; }
function _hspFmtFor(g) { return hspFmt((g && g.currency) || _hspCfg('currency') || 'GBP', _hspCfg('locale')); }
function _hspReduced() { return !window.Motion || Motion.prefersReduced() || document.hidden; }
/** Finances, at a section (and a merchant selected: the bar's chip clears it). */
function _hspOpen(section, merchant) {
  try {
    const FV = window.FinanceView;
    if (FV && section && typeof FV.setSection === 'function') FV.setSection(section);
    if (FV && merchant && typeof FV.setMerchant === 'function') FV.setMerchant(merchant);
  } catch (e) { /* the view decides */ }
  if (state.view !== 'finance') setView('finance');
}
function _hspTint(name) {
  let h = 0; for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ['indigo', 'blue', 'teal', 'green', 'amber', 'orange', 'pink', 'violet', 'slate'][h % 9];
}
/** The user's own names (settings and their People entry): an account named after them shows its kind. */
function _hspUserNames() {
  const self = (Array.isArray(state.people) ? state.people : []).find(p => p && p.self);
  return [typeof userName === 'function' ? userName() : '', self ? self.name : ''].filter(Boolean).join(' ');
}
function _hspFrame() { return document.querySelector('#main-body .hg-w[data-wid="spendable"]'); }

/* ---------- render ---------- */
function _hspRender(el, ctx) {
  if (_hspCfg('features') && _hspCfg('features').finance === false) return false;
  const size = ['s', 'm', 'l'].includes(ctx.size) ? ctx.size : 's';
  const prefs = ctx.prefs || homePrefs(ctx.id || 'spendable');
  const url = hspQuery(prefs);
  const res = ctx.preview ? { status: 'ok', data: homeSample('spendable') } : homeData(_HSP_DATA, url, { maxAge: _HSP_MAX_AGE, ctx, sig: url });
  const card = document.createElement('section');
  card.className = `card home-card hsp hsp--${size}`;
  card.appendChild(_hspHead(ctx));
  const body = document.createElement('div'); body.className = 'card-b hsp-b';
  card.appendChild(body);
  el.appendChild(card);
  const g = res.data && res.data.status === 'ok' ? res.data : null;

  if (!g && res.status === 'loading' && !res.offline) {
    body.innerHTML = '<div class="hsp-skel" aria-busy="true" aria-label="Loading"><span class="skeleton skeleton-text" style="width:34%"></span><span class="skeleton" style="width:52%;height:34px"></span><span class="skeleton skeleton-text" style="width:62%"></span></div>';
    return true;
  }
  if (!g && (res.status === 'error' || res.offline)) {
    body.appendChild(hglEmpty({ icon: 'circle-alert', title: 'Couldn’t read Finances',
      text: res.offline ? 'The OpenDash server isn’t running. Your data is safe.' : (res.error || 'The OpenDash server didn’t answer. Your data is safe.'),
      actions: [{ label: 'Retry', icon: 'refresh-cw', run: () => { homeDataRefresh(_HSP_DATA); } }] }));
    return true;
  }
  if (!g) {
    for (const b of card.querySelectorAll('.hsp-eye, .hsp-sync')) b.remove();   // nothing to hide or sync yet: Open Finances is the way in
    const off = ctx.off({ icon: 'wallet', title: 'Payday & safe to spend', text: 'Import a statement or connect a bank to see what you can spend each day until payday.',
      action: { label: 'Open Finances', icon: 'wallet', run: () => _hspOpen('overview') } });
    off.classList.add('hgl-off', 'hsp-off');
    const art = hglScene('finance', { size: 'lg', hover: true });
    if (art) off.insertAdjacentHTML('afterbegin', art);
    body.appendChild(off);
    return true;
  }

  const f = _hspFmtFor(g);
  const m = hspModel(g, { today: ctx.preview ? g.today : todayStr(), fmt: f, locale: _hspCfg('locale'), maxBills: 5, userName: ctx.preview ? '' : _hspUserNames() });
  const hidden = homeAmountsHidden();
  body.innerHTML = _hspBodyHtml(m, size, f, prefs, hidden);
  // An amount inside a button: the button is the Tab stop (it shows the amount on focus, CSS).
  for (const a of body.querySelectorAll('button .hg-amt[tabindex]')) a.removeAttribute('tabindex');
  if (!ctx.preview) {
    _hspWire(body, m, f, hidden);
    _hspMotion(body, m, f, ctx, hidden);
    if (size !== 's') homeSuggestSlot(body, ctx, { kind: 'money', perDay: m.hero.kind === 'safe' ? m.hero.value : null, daysLeft: m.daysLeft });
  }
  return true;
}

function _hspHead(ctx) {
  const h = document.createElement('div'); h.className = 'card-h hgl-h hsp-h';
  const hidden = homeAmountsHidden();
  const busy = !!(_hsp.sync && _hsp.sync.running);
  h.innerHTML = `${icon('piggy-bank')}<h3>Safe to spend</h3><span class="spacer"></span>`
    + `<button type="button" class="btn-icon btn-sm hsp-hb hsp-eye" data-act="eye" aria-pressed="${hidden ? 'true' : 'false'}" aria-label="Hide amounts" data-tip="${hidden ? 'Show amounts' : 'Hide amounts'}">${icon(hidden ? 'eye-off' : 'eye')}</button>`
    + `<button type="button" class="btn-icon btn-sm hsp-hb hsp-sync${busy ? ' is-busy' : ''}" data-act="sync" aria-label="${busy ? 'Syncing bank data' : 'Sync bank data'}"${busy ? ' aria-busy="true"' : ''} data-tip="${busy ? 'Syncing…' : 'Sync bank data (read-only)'}" data-requires-soft="bank">${icon('refresh-cw')}</button>`;
  if (ctx.preview) { for (const b of h.querySelectorAll('button')) { b.tabIndex = -1; b.disabled = true; } return h; }
  h.querySelector('.hsp-eye').onclick = (e) => { e.stopPropagation(); homeSetAmountsHidden(!homeAmountsHidden()); };
  h.querySelector('.hsp-sync').onclick = (e) => { e.stopPropagation(); _hspSyncStart(); };
  if (typeof homeSettingsButton === 'function') h.appendChild(homeSettingsButton(ctx, 'Payday & safe to spend settings'));
  return h;
}

function _hspBodyHtml(m, size, f, prefs, hidden) {
  const A = (v, two) => homeAmtHtml(two ? f.money2(v) : f.money(v));
  const say = hspSay(m, f, hidden);
  // The number.
  // The header says "Safe to spend"; the number says what it is in its own unit.
  const big = `<span class="hsp-big num"><span class="hsp-n${m.hero.kind === 'none' ? ' hsp-days' : ''}">${m.hero.kind === 'none' ? esc(String(m.hero.days)) : A(m.hero.value)}</span><span class="hsp-u">${esc(m.hero.unit)}</span></span>`;
  const when = m.hero.kind === 'none' && m.paydayDate ? `${m.month ? 'New month on' : 'Payday on'} ${hspShortDate(m.paydayDate, _hspCfg('locale'), true)}` : m.paydayText;
  const sub = `<span class="hsp-sub">${icon(m.month ? 'calendar-check' : 'banknote')}<span>${esc(when)}</span></span>`;
  const note = m.hero.kind === 'safe' && !m.hero.spare ? `<span class="hsp-note">Nothing spare after bills and the ${A(m.cushion)} cushion</span>`
    : m.hero.kind === 'bills' ? '<span class="hsp-note">No balance yet: sync or import to see safe to spend</span>'
      : m.hero.kind === 'none' && size === 's' ? '<span class="hsp-note">No bills before then</span>' : '';
  const hero = `<button type="button" class="hsp-hero" data-go="overview" aria-label="${escAttr(say.hero + ' Open Finances, Overview.')}">${big}${sub}${note}</button>`;
  const left = size !== 's' && m.left != null && m.left > 0
    ? `<div class="hsp-left"><span class="sr-only">${esc(say.left)}</span><span aria-hidden="true"><b class="num">${A(Math.max(0, m.left))}</b> left after bills<span class="hsp-kb"> · ${A(m.cushion)} kept back</span></span></div>` : '';
  const low = size === 'l' && m.low
    ? `<div class="hsp-low"><span class="sr-only">${esc(say.low)}</span>${icon('arrow-down')}<span aria-hidden="true">Lowest <b class="num">${A(m.low.amount)}</b> on ${esc(m.low.when)}</span><small aria-hidden="true">if nothing else is spent</small></div>` : '';
  const stale = m.stale ? _hspStaleHtml(m.stale) : '';
  if (size === 's') return `<div class="hsp-wrap">${hero}${stale}</div>`;
  const colA = `<div class="hsp-col hsp-a">${hero}${left}${low}</div>`;
  const colB = `<div class="hsp-col hsp-bb">${_hspBillsHtml(m, f, A)}</div>`;
  const bal = size === 'l' && m.balance ? _hspBalanceHtml(m, f, A, say, prefs) : '';
  return `<div class="hsp-wrap"><div class="hsp-grid">${colA}${colB}</div>${bal}${stale}</div>`;
}

function _hspStaleHtml(st) {
  const busy = !!(_hsp.sync && _hsp.sync.running);
  return `<div class="hsp-stale">${icon('history')}<span>${esc(st.text)}</span><span aria-hidden="true">·</span><button type="button" class="hsp-link" data-act="sync" data-requires-soft="bank"${busy ? ' aria-busy="true"' : ''}>${busy ? 'Syncing…' : 'Sync'}</button></div>`;
}

function _hspBillsHtml(m, f, A) {
  const head = `<div class="hsp-bh"><span class="ovl">Before ${esc(m.until)}</span>${m.billCount ? `<span class="hsp-bt num">${A(m.billsTotal, true)}</span>` : ''}</div>`;
  if (!m.bills.length) {
    const nx = m.next ? `<span class="hsp-nx">Next: ${esc(m.next.name)} ${A(m.next.amount, true)} on ${esc(m.next.day)}</span>` : '';
    return `${head}<p class="hsp-none">${icon('circle-check')}<span>No bills before ${esc(m.until)}.${nx ? ' ' : ''}</span>${nx}</p>`;
  }
  const rows = m.bills.map(b => {
    const label = `${b.name}, ${homeAmountsHidden() ? 'hidden' : f.money2(b.amount)}, ${b.due ? 'due now' : b.day}. Open in Finances, Recurring.`;
    return `<li><button type="button" class="hsp-bill hgl-row" ${homeRowAttrs(b.key, label)} data-m="${escAttr(b.m)}" data-flip="bill:${escAttr(b.key)}">`
      + `<span class="hsp-tile" style="--c:var(--sw-${_hspTint(b.name)})" aria-hidden="true">${esc(b.initial)}</span>`
      + `<span class="n"><span class="nm">${esc(b.name)}</span><small${b.due ? ' class="due"' : ''}>${esc(b.day)}</small></span>`
      + `<span class="a num">${A(b.amount, true)}</span></button></li>`;
  }).join('');
  const more = m.more ? `<button type="button" class="hsp-more" data-go="recurring">${esc(`+${m.more} more`)}${icon('chevron-right')}</button>` : '';
  return `${head}<ul class="hsp-bl" aria-label="Bills before ${escAttr(m.until)}">${rows}</ul>${more}`;
}

function _hspBalanceHtml(m, f, A, say, prefs) {
  const b = m.balance;
  const ch = b.change == null ? '' : `<span class="hsp-ch ${b.change >= 0 ? 'up' : 'down'}">${icon(b.change >= 0 ? 'arrow-up' : 'arrow-down')}${homeAmtHtml(f.delta(b.change))}<small>in 30 days</small></span>`;
  const head = `<button type="button" class="hsp-balh" data-go="cashflow" aria-label="${escAttr(`Balance ${homeAmountsHidden() ? 'hidden' : f.money(b.total)}. Open Finances, Cash flow.`)}"><span class="ovl">Balance</span><span class="hsp-bv num">${A(b.total)}</span>${ch}</button>`;
  const sp = hspSpark(m.series, 300, 56);
  let plot = '';
  if (sp) {
    const last = sp.xy[sp.xy.length - 1];
    plot = `<div class="hsp-spark"><div class="hsp-plot" role="img" aria-label="${escAttr(say.spark)}">`
      + `<svg viewBox="0 0 ${sp.w} ${sp.h}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="ar" d="${sp.area}"/><path class="ln" d="${sp.line}"/></svg>`
      + `<i class="hsp-dot" style="--x:${(last[0] / sp.w * 100).toFixed(2)}%;--y:${(last[1] / sp.h * 100).toFixed(2)}%"></i>`
      + `<i class="hsp-hov" hidden></i><span class="hsp-hit" aria-hidden="true"></span><span class="hsp-tip" hidden></span></div>`
      + `<div class="hsp-ax" aria-hidden="true"><span>${esc(hspShortDate(sp.first.date, _hspCfg('locale')))}</span><span>Today</span></div></div>`;
  }
  const accs = prefs.accounts !== false && b.accounts.length
    ? `<ul class="hsp-acs" aria-label="Accounts">${b.accounts.map(a => `<li><button type="button" class="hsp-ac" data-go="cashflow" data-flip="acct:${escAttr(a.key)}" aria-label="${escAttr(`${a.name}${a.kind ? ', ' + a.kind : ''}, ${homeAmountsHidden() ? 'hidden' : f.money(a.balance)}${a.inTotal ? '' : ', not counted in safe to spend'}.`)}">`
      + `<span class="nm">${esc(a.name)}</span>${a.kind ? `<small>${esc(a.kind)}</small>` : ''}${a.inTotal ? '' : '<span class="hsp-tag">not counted</span>'}<span class="a num">${A(a.balance)}</span></button></li>`).join('')}</ul>` : '';
  return `<div class="hsp-bal">${head}${plot}${accs}</div>`;
}

/* ---------- clicks, keys, the sparkline's hover ---------- */
function _hspWire(body, m, f, hidden) {
  for (const b of body.querySelectorAll('[data-go]')) b.onclick = () => _hspOpen(b.dataset.go);
  for (const b of body.querySelectorAll('[data-act="sync"]')) b.onclick = () => _hspSyncStart();
  const openBill = (row) => { if (row && row.dataset.m) _hspOpen('recurring', row.dataset.m); };
  for (const b of body.querySelectorAll('.hsp-bill')) b.onclick = () => openBill(b);
  const list = body.querySelector('.hsp-bl');
  if (list) homeRowKeys(list, { open: (id, row) => openBill(row) });
  const plot = body.querySelector('.hsp-plot');
  const sp = plot && hspSpark(m.series, 300, 56);
  if (!sp) return;
  const tip = plot.querySelector('.hsp-tip'), hov = plot.querySelector('.hsp-hov'), hit = plot.querySelector('.hsp-hit');
  const pts = sp.pts;
  let cur = -1;
  const show = (i) => {
    if (i === cur || !pts[i] || !sp.xy[i]) return;
    cur = i;
    const x = sp.xy[i][0] / sp.w * 100, y = sp.xy[i][1] / sp.h * 100;
    hov.style.setProperty('--x', x.toFixed(2) + '%'); hov.style.setProperty('--y', y.toFixed(2) + '%'); hov.hidden = false;
    let when = pts[i].date;
    try { when = new Date(pts[i].date + 'T12:00:00').toLocaleDateString(_hspCfg('locale') || undefined, { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { /* the ISO date */ }
    tip.innerHTML = `<b class="num">${hidden ? 'Hidden' : esc(f.money(pts[i].v))}</b><span>${esc(when)}</span>`;
    tip.style.setProperty('--x', x.toFixed(2) + '%');
    tip.hidden = false;
  };
  const hide = () => { cur = -1; tip.hidden = true; hov.hidden = true; };
  hit.addEventListener('pointermove', (e) => {
    const r = hit.getBoundingClientRect();
    if (!r.width) return;
    const px = (e.clientX - r.left) / r.width * sp.w;
    let best = 0;
    for (let i = 1; i < sp.xy.length; i++) if (Math.abs(sp.xy[i][0] - px) < Math.abs(sp.xy[best][0] - px)) best = i;
    show(best);
  });
  hit.addEventListener('pointerleave', hide);
  hit.addEventListener('click', () => _hspOpen('cashflow'));
}

/* ---------- motion: once per entry, then morphs ---------- */
function _hspMotion(body, m, f, ctx, hidden) {
  const first = typeof ctx.isNew === 'function' ? ctx.isNew('hsp:data') : !!ctx.firstPaint;   // the data's first showing this entry
  const prev = _hsp.last;
  const sp = m.balance && body.querySelector('.hsp-plot') ? hspSpark(m.series, 300, 56) : null;
  _hsp.last = { kind: m.hero.kind, value: m.hero.value, line: sp ? sp.line : null, area: sp ? sp.area : null, n: sp ? sp.n : 0, dot: sp ? sp.xy[sp.xy.length - 1] : null, w: sp ? sp.w : 0, h: sp ? sp.h : 0 };
  const rows = [...body.querySelectorAll('.hsp-bill, .hsp-ac')];
  if (first) for (const r of rows) ctx.isNew && ctx.isNew(r.dataset.flip || '');       // seen: a later render animates only new ones
  if (_hspReduced()) return;
  // The number: counts up once, later moves from the old value to the new one.
  const nEl = body.querySelector('.hsp-n > .hg-amt:not(.is-hidden)');
  if (nEl && m.hero.value != null) {
    if (first) Motion.countUp(nEl, m.hero.value, { from: 0, duration: 900, format: (v) => f.money(v) });
    else if (prev && prev.kind === m.hero.kind && prev.value != null && Math.round(prev.value) !== Math.round(m.hero.value)) Motion.countUp(nEl, m.hero.value, { from: prev.value, duration: 520, format: (v) => f.money(v) });
  }
  const svg = body.querySelector('.hsp-plot svg'), dot = body.querySelector('.hsp-dot');
  if (first) {
    hglAnim(body.querySelector('.hsp-hero .hsp-sub'), [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: 380 });
    rows.forEach((r, i) => hglAnim(r, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 340, delay: 200 + Math.min(i, 8) * 45 }));
    if (svg) hglAnim(svg, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 900, delay: 240, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' });
    if (dot) hglAnim(dot, [{ opacity: 0, transform: 'translate(-50%, -50%) scale(0.4)' }, { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' }], { duration: 300, delay: 1060, easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)' });
    return;
  }
  // A later change: the line moves point by point (same number of days), the dot follows.
  if (svg && sp && prev && prev.line && prev.line !== sp.line && prev.n === sp.n) {
    const ease = { duration: 600, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };
    hglAnim(svg.querySelector('.ln'), [{ d: `path("${prev.line}")` }, { d: `path("${sp.line}")` }], ease);
    hglAnim(svg.querySelector('.ar'), [{ d: `path("${prev.area}")` }, { d: `path("${sp.area}")` }], ease);
    if (dot && prev.dot) {
      const last = sp.xy[sp.xy.length - 1];
      hglAnim(dot, [{ left: (prev.dot[0] / prev.w * 100) + '%', top: (prev.dot[1] / prev.h * 100) + '%' }, { left: (last[0] / sp.w * 100) + '%', top: (last[1] / sp.h * 100) + '%' }], ease);
    }
  }
  if (typeof ctx.enterNew === 'function') ctx.enterNew(rows, (r) => r.dataset.flip);
}

/* ---------- Sync: the read-only finance update, then a fresh glance ---------- */
async function _hspSyncStart() {
  if (_hsp.sync && _hsp.sync.running) return;                    // a second press does nothing
  _hsp.sync = { running: true, at: Date.now() };
  _hspPaintSync();
  let r = null, j = {};
  try {
    r = await fetch('/api/finance/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    j = await r.json().catch(() => ({}));
  } catch (e) {
    _hsp.sync = null; _hspPaintSync();
    toast(typeof netErrorMessage === 'function' ? netErrorMessage(e) : 'The OpenDash server isn’t running.', { kind: 'err' });
    return;
  }
  if (r.status === 202 || r.status === 409) { _hspPoll(); return; }   // 409: an update is running already: follow it
  _hsp.sync = null; _hspPaintSync();
  const msg = j && j.error ? (j.error.message || j.error) : `HTTP ${r.status}`;
  toast(`Couldn’t start the sync: ${msg}`, { kind: 'err', action: { label: 'Open Finances', run: () => _hspOpen('overview') } });
}
function _hspPoll() {
  clearTimeout(_hsp.poll);
  _hsp.poll = setTimeout(async () => {
    let s = null;
    try { const r = await fetch('/api/finance/status', { cache: 'no-store', headers: { Accept: 'application/json' } }); s = r.ok ? await r.json() : null; } catch (e) { s = null; }
    const job = s && s.job;
    if (_hsp.sync && job && job.state === 'running' && Date.now() - _hsp.sync.at < 240000) { _hspPoll(); return; }
    _hsp.sync = null;
    homeDataRefresh(_HSP_DATA);
    _hspPaintSync();
    if (!s) toast('Couldn’t check the sync: the OpenDash server didn’t answer.', { kind: 'err' });
    else if (job && job.state === 'error') toast('The bank sync didn’t finish. Finances shows why.', { kind: 'err', action: { label: 'Open Finances', run: () => _hspOpen('overview') } });
    else if (typeof homeAnnounce === 'function') homeAnnounce('Bank data synced');
  }, 2000);
}
/** The Sync controls show the running state in place (no repaint). */
function _hspPaintSync() {
  const fr = _hspFrame(); if (!fr) return;
  const busy = !!(_hsp.sync && _hsp.sync.running);
  for (const b of fr.querySelectorAll('[data-act="sync"]')) {
    if (busy) b.setAttribute('aria-busy', 'true'); else b.removeAttribute('aria-busy');
    b.classList.toggle('is-busy', busy);
    if (b.classList.contains('hsp-link')) b.textContent = busy ? 'Syncing…' : 'Sync';
    else { b.setAttribute('aria-label', busy ? 'Syncing bank data' : 'Sync bank data'); b.setAttribute('data-tip', busy ? 'Syncing…' : 'Sync bank data (read-only)'); }
  }
}

/* ---------- settings ---------- */
function _hspSettings(anchor, ctx) {
  const peek = homeDataPeek(_HSP_DATA);
  const p = homePrefs(ctx);
  const dflt = p.cushion == null && peek && peek.data && Number.isFinite(+peek.data.cushion) ? +peek.data.cushion : HSP_DEFAULT_CUSHION;
  const f = _hspFmtFor(peek && peek.data);
  homeSettingsMenu(anchor, ctx, [
    { key: 'cushion', label: 'Cushion', type: 'number', min: 0, max: HSP_CUSHION_MAX, step: 10, placeholder: String(dflt),
      hint: `Kept aside, not counted as safe to spend. Empty = ${f.money(HSP_DEFAULT_CUSHION)}, as on Finances.` },
    { key: 'mode', label: 'Count to', type: 'choice', choices: [['auto', 'Auto'], ['payday', 'Payday'], ['month', 'Month end']],
      hint: 'Auto: payday when a salary shows in your transactions, else the end of the month.' },
    { key: 'accounts', label: 'Accounts', type: 'toggle', hint: 'Large: one row per account' },
  ], { foot: 'Read-only: nothing here moves money.' });
}
