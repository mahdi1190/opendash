/* ============================================================
   HOME widget "moneyplan": Your money plan at a glance (src/finance/36-plan.js has the page).
   Read only: what is left a month, and the one or two things most worth a look.
   The numbers are GET /api/finance/plan/summary (lib/finance/money-plan.mjs planSummary). Amounts carry
   .home-amt-free text through _hmpMoney, which says ••• while Hide amounts is on.
   ============================================================ */
const _HMP_DATA = 'fin-plan';
function _hmpOpen() {
  try { const FV = window.FinanceView; if (FV && typeof FV.setSection === 'function') FV.setSection('budgets'); } catch (e) { /* the view decides */ }
  if (state.view !== 'finance') setView('finance');
}
function _hmpMoney(v, cur) {
  if (typeof homeAmountsHidden === 'function' && homeAmountsHidden()) return '•••';
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur || 'GBP', maximumFractionDigits: 0 }).format(v); } catch (e) { return String(Math.round(v)); }
}
registerHomeWidget({
  id: 'moneyplan', title: 'Your money plan', icon: 'piggy-bank', order: 232, group: 'money', gate: 'finance',
  description: 'What is left a month, and anything that looks off against your bank',
  sizes: ['s', 'm', 'l'], defaultSize: 's', defaultHidden: true, fresh: true,
  aliases: ['budget', 'plan', 'take home', 'pay', 'money plan'],
  defaults: {},
  available: () => true,
  sample: () => ({ hasPlan: true, left: 420, income: 2510, currency: 'GBP', flags: [{ title: 'Electricity is £18 higher than usual' }], nextPaydays: [] }),
  render(el, ctx) {
    ctx = ctx || {};
    const res = ctx.preview ? { status: 'ok', data: homeSample('moneyplan') } : homeData(_HMP_DATA, '/api/finance/plan/summary', { maxAge: 10 * 60 * 1000, ctx, sig: 'x' });
    const card = document.createElement('section');
    card.className = 'card home-card hmp';
    const head = document.createElement('header');
    head.className = 'card-h';
    const t = document.createElement('h3'); t.className = 'card-t'; t.textContent = 'Your money plan';
    head.appendChild(t);
    card.appendChild(head);
    const body = document.createElement('div'); body.className = 'card-b hmp-b';
    card.appendChild(body);
    el.appendChild(card);
    const d = res.data;
    if (!d && res.status === 'loading' && !res.offline) { body.innerHTML = '<span class="skeleton skeleton-text" style="width:50%"></span>'; return true; }
    if (!d) {
      const p = document.createElement('p'); p.className = 'hmp-say'; p.textContent = 'Freeflo isn’t answering. Your plan is safe.';
      body.appendChild(p);
      return true;
    }
    const open = document.createElement('button');
    open.type = 'button'; open.className = 'btn btn-secondary btn-sm'; open.addEventListener('click', _hmpOpen);
    if (!d.hasPlan) {
      const p = document.createElement('p'); p.className = 'hmp-say'; p.textContent = 'A few easy questions, and we work out what you take home and build a budget.';
      open.textContent = 'Start your plan';
      body.append(p, open);
      return true;
    }
    const big = document.createElement('div'); big.className = 'hmp-big';
    const v = document.createElement('b'); v.textContent = _hmpMoney(d.left, d.currency);
    const w = document.createElement('span'); w.textContent = d.left >= 0 ? ' left a month' : ' short a month';
    big.append(v, w);
    body.appendChild(big);
    const flags = (d.flags || []).slice(0, ctx.size === 's' || !ctx.size ? 1 : 3);
    if (typeof homeAmountsHidden === 'function' && homeAmountsHidden()) {
      if (flags.length) { const p = document.createElement('p'); p.className = 'hmp-say'; p.textContent = `${d.flags.length} thing${d.flags.length === 1 ? '' : 's'} worth a look.`; body.appendChild(p); }
    } else for (const f of flags) { const p = document.createElement('p'); p.className = 'hmp-say'; p.textContent = f.title; body.appendChild(p); }
    open.textContent = 'Open my plan';
    body.appendChild(open);
    return true;
  },
  settings() {},
  unmount() {},
});
