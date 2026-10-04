// server/routes/money-story.mjs - the money story's optional Claude wording (owner: MS).
// The page plays the story from its own model (src/finance/28-money-story.js);
// this route only words it differently, from aggregates.
//
//   GET /api/finance/story?period=month|week&ref=YYYY-MM-DD[&ai=1|&regenerate=1]
//       -> {date, period, start, key, template: {beatId: text}, ai: {state, model, lines?, at?}}
//       ai.state 'cached' | 'fresh' | 'missing' | 'off' (config.finance.briefAi === false).
//       Without ai=1 only today's cached wording is returned (no Claude call).
//       Same-origin only. 404 without finance data, 503 when Claude is not
//       connected, 502 when the wording did not match the numbers.
//
// Claude sees MSM.facts only (lib/finance/money-story.mjs): totals, visit
// counts, the next bills and the savings rate; never a transaction. Every
// number of every line is checked; the page checks them again.
// Logs: the period, counts and timings; never names or amounts.
import { HttpError } from '../http.mjs';
import { financeData, financeDir } from '../../lib/finance.mjs';
import { MBM, MSM, storyFor, aiStory, readStoryCache, writeStoryCache, storyCacheFile, DEFAULT_STORY_MODEL, PERIODS } from '../../lib/finance/money-story.mjs';
import { askJson, aiStatus } from '../../lib/ai.mjs';

// Tests swap the model.
let storyAi = null;
export function setMoneyStoryAi(impl) { storyAi = impl || null; }

export default function register(app) {
  const { log } = app.ctx;
  const pending = new Map();
  app.route({
    path: '/api/finance/story', method: 'GET', methodError: 'GET only', sameOrigin: true,
    handler: async (c) => {
      const d = await financeData();
      if (d.status !== 'ok' || !d.analysis) throw new HttpError(404, 'No finance data yet.');
      const cfg = typeof app.ctx.getConfig === 'function' ? app.ctx.getConfig() || {} : {};
      const fin = cfg.finance && typeof cfg.finance === 'object' ? cfg.finance : {};
      const period = c.query.get('period');
      if (period && !PERIODS.includes(period)) throw new HttpError(400, 'period must be month or week');
      const ref = c.query.get('ref');
      if (ref && !/^\d{4}-\d{2}-\d{2}$/.test(ref)) throw new HttpError(400, 'ref must be a date (YYYY-MM-DD)');
      const { S, fmt, facts, key, template } = storyFor(d.analysis, { period, ref, currency: cfg.currency, locale: cfg.locale, weekStart: cfg.weekStart });
      const date = MBM.util.diso(S.anchor), start = MBM.util.diso(S.start);
      const model = [fin.storyModel, fin.briefModel].find(m => typeof m === 'string' && m) || DEFAULT_STORY_MODEL;
      const out = { date, period: S.period, start, key, template, ai: { state: 'missing', model } };
      if (fin.briefAi === false) { out.ai.state = 'off'; return out; }
      const regen = c.query.get('regenerate') === '1';
      const file = financeDir() ? storyCacheFile(financeDir()) : null;
      if (!regen) {
        const hit = await readStoryCache(file, date, S.period, start).catch(() => null);
        if (hit && hit.key === key) {
          const v = MSM.validate({ lines: hit.lines }, S, fmt);
          if (v.used) return { ...out, ai: { state: 'cached', model: hit.model || model, at: hit.at || null, lines: v.lines, replaced: v.replaced } };
        }
      }
      if (!regen && c.query.get('ai') !== '1') return out;
      const pk = [date, S.period, start, key].join('|');
      if (pending.has(pk)) return pending.get(pk);
      const run = (async () => {
        const ai = storyAi || { askJson, aiStatus };
        const st = await ai.aiStatus().catch(() => ({ available: false }));
        if (!st.available) throw new HttpError(503, 'Claude is not connected, so the story keeps its own words.', { code: st.code || 'UNAVAILABLE' });
        const t0 = Date.now();
        const r = await aiStory({ S, fmt, facts, askJson: ai.askJson, model, style: cfg.ai && cfg.ai.style });
        if (!r.used) throw new HttpError(502, 'Claude’s wording did not match the numbers, so the story keeps its own.', { code: 'BAD_OUTPUT' });
        const entry = { key, model: r.model, at: new Date().toISOString(), lines: r.lines, replaced: r.replaced, dropped: r.dropped };
        if (file) await writeStoryCache(file, date, S.period, start, entry).catch(e => log('warn', `money story: cache not written (${e.message})`));
        log('info', `money story ${S.period}: ${r.model} used=${r.used} replaced=${r.replaced} dropped=${r.dropped} ${Date.now() - t0}ms`);
        return { ...out, ai: { state: 'fresh', ...entry } };
      })();
      pending.set(pk, run);
      try { return await run; } finally { pending.delete(pk); }
    },
  });
}
