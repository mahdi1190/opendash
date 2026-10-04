// server/routes/finance-glance.mjs - Home's "Payday & safe to spend" (lib/finance/glance.mjs).
//
//   GET /api/finance/glance?cushion=&mode=auto|cycle|month
//     -> 200 {status:'ok', currency, mode, payday, safe, bills, upcoming, balance, bal30,
//             balChange30, balSeries, low, staleDays, ...}   (shape: lib/finance/glance.mjs)
//     -> 200 {status:'empty'} when there is no finance data yet (not a 404, so an empty
//        board logs no failed request); 400 on a bad cushion / mode
// The same model and the same day as the Finances Overview (the user's time
// zone from config), so the numbers match it. Read only: no AI, no bank call,
// nothing written. Same origin only. The log gets counts, never amounts or merchants.
// (An exact path: it wins over finance.mjs's /api/finance/ catch-all.)

import { financeData } from '../../lib/finance.mjs';
import { financeGlance, glanceParams, todayIn } from '../../lib/finance/glance.mjs';
import { HttpError } from '../http.mjs';

export default function register(app) {
  const { log } = app.ctx;
  app.route({
    path: '/api/finance/glance', method: 'GET', methodError: 'GET only', sameOrigin: true, quiet: true,
    handler: async (c) => {
      const p = glanceParams(c.query.get('cushion'), c.query.get('mode'));
      if (p.error) throw new HttpError(400, p.error);
      const d = await financeData();
      if (d.status !== 'ok' || !d.analysis) return { status: 'empty', error: 'No finance data yet.' };
      const cfg = typeof app.ctx.getConfig === 'function' ? app.ctx.getConfig() || {} : {};
      const lu = d.meta && d.meta.lastUpdate;
      // cfg.timezone is the HOME zone, on purpose: banks date transactions at home,
      // so money days stay on home time while the user travels (travel spec 2.3).
      const g = financeGlance(d.analysis, {
        mode: p.mode, cushion: p.cushion, currency: cfg.currency || (d.meta && d.meta.currency) || 'GBP', locale: cfg.locale,
        today: todayIn(cfg.timezone), lastUpdateAt: lu && (lu.state === 'ok' || lu.state === 'warning') && typeof lu.at === 'string' ? lu.at : null,
      });
      log('info', `finance glance: ${g.bills.length} bills before payday, ${g.balance ? g.balance.accounts.length : 0} accounts`);
      return g;
    },
  });
}
