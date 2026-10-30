// server/routes/finance-plan.mjs - Your money plan (lib/finance/money-plan.mjs).
//
//   GET  /api/finance/plan            -> {plan, view}
//   PUT  /api/finance/plan {plan}     -> {plan, view}   the whole plan (the page keeps the one before, for Undo)
//   POST /api/finance/plan/dates {rule, country?} -> {words, next: [{date, moved, why}]}
//   POST /api/finance/plan/whatif {parts, compare?, plan?} -> {today, a, b}   nothing is saved
//   GET  /api/finance/plan/summary    -> read-only summary (get_money part plan, Home)
//
// Same origin only. The log gets counts, never amounts or names. It stays local and syncs like other finance data;
// friends' sharing never reads it (lib/friends/share.mjs reads the analysis only).

import { financeData, getPlan, setPlan, getTaxDoc } from '../../lib/finance.mjs';
import { taxLinkFor, cleanTax, taxView, taxSummary } from '../../lib/finance/tax-tab.mjs';
import { cleanPlan, planView, planSummary, whatIf } from '../../lib/finance/money-plan.mjs';
import { nextDates, describeRule, dn } from '../../lib/finance/pay-dates.mjs';
import { todayIn } from '../../lib/finance/glance.mjs';
import { HttpError } from '../http.mjs';

export default function register(app) {
  const { log } = app.ctx;
  const cfgOf = () => (typeof app.ctx.getConfig === 'function' ? app.ctx.getConfig() || {} : {});
  const opts = () => { const c = cfgOf(); return { today: todayIn(c.timezone), currency: c.currency || 'GBP', locale: c.locale }; };
  const analysis = async () => { const d = await financeData().catch(() => null); return d && d.status === 'ok' ? d.analysis : null; };
  const full = async (doc) => { const plan = cleanPlan(doc); return { plan, view: planView(plan, await analysis(), opts()) }; };

  app.route({ path: '/api/finance/plan', method: 'GET', methodError: 'GET or PUT only', sameOrigin: true, handler: async () => full((await getPlan()).plan) });
  app.route({
    path: '/api/finance/plan', method: 'PUT', methodError: 'GET or PUT only', sameOrigin: true, maxBody: 512 * 1024,
    handler: async (c) => {
      const b = await c.body();
      const plan = cleanPlan(b.plan);
      plan.at = new Date().toISOString();
      // What the Tax tab adds (the pot, the bills) follows the plan's own changes.
      try { if (plan.country === 'uk') plan.taxLink = taxLinkFor(plan, cleanTax((await getTaxDoc()).doc), opts().today); } catch { /* the plan still saves */ }
      await setPlan(plan);
      log('info', `money plan saved: ${plan.items.length} items`);
      return full(plan);
    },
  });
  app.route({
    path: '/api/finance/plan/dates', method: 'POST', methodError: 'POST only', sameOrigin: true,
    handler: async (c) => {
      const b = await c.body();
      const plan = cleanPlan({ items: [{ id: 'x', kind: 'bill', when: b.rule }] });
      const rule = plan.items[0].when;
      if (!rule) throw new HttpError(400, 'That date rule is not one we know.');
      const country = b.country === 'other' ? 'none' : 'uk';
      return { words: describeRule(rule), next: nextDates(rule, dn(opts().today), 4, { country }).map(d => ({ date: d.date, moved: d.moved, why: d.why })) };
    },
  });
  app.route({
    path: '/api/finance/plan/whatif', method: 'POST', methodError: 'POST only', sameOrigin: true, maxBody: 512 * 1024, quiet: true,
    handler: async (c) => {
      const b = await c.body();
      const stored = b.plan && typeof b.plan === 'object' ? b.plan : (await getPlan()).plan;
      const r = whatIf(stored, await analysis(), b.parts, { ...opts(), compare: Array.isArray(b.compare) ? b.compare : null });
      if (!r) throw new HttpError(409, 'Answer the first question of your money plan first.');
      return r;
    },
  });
  app.route({
    path: '/api/finance/plan/summary', method: 'GET', methodError: 'GET only', sameOrigin: true, quiet: true,
    handler: async () => {
      const f = await full((await getPlan()).plan);
      const out = planSummary(f.view);
      // The tax side, in brief: get_money part tax has every line.
      try {
        if (f.plan.country === 'uk') {
          const t = taxSummary(taxView(f.plan, cleanTax((await getTaxDoc()).doc), await analysis(), opts()));
          if (t.hasTaxTab) out.tax = { year: t.year, stillToPay: t.bill.owedOnReturn, keepAsideRightNow: t.keepAside.rightNow, ofEach1000Keep: t.keepAside.ofEach1000, needToFile: t.needToFile.answer, nextDeadline: t.deadlines[0] || null, more: "get_money part 'tax' has every line" };
        }
      } catch { /* the plan still answers */ }
      return out;
    },
  });
}
