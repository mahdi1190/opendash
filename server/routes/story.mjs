// server/routes/story.mjs - the full-screen stories (owner: Story engine).
// The page plays them (src/app/79-story-core.js + 79-story-engine.js); this
// file builds the day model and the script.
//
//   GET  /api/story?kind=morning|evening|week
//        -> {kind, date, data, script, ai:{state, model}}
//           data   the structured day model (lib/story-data.mjs): weather, events with
//                  scene types and people, focus tasks, people of the day, deadlines,
//                  money, suggestions, and data.entities (what a script may name)
//           script the cached AI script for this kind and day when there is one, else the
//                  deterministic fallback (lib/story-script.mjs): the story can ALWAYS
//                  play at once
//           ai.state  'cached' | 'missing' (none yet: POST to make one) | 'off' (Settings)
//   POST /api/story/script {kind, regenerate?}
//        -> {script, cached, dropped}  the AI script (claude-runner 'json' profile with a
//           --json-schema, config.brief.story.model, Haiku by default), validated against
//           the day model (unknown entity refs dropped), cached per kind and day.
//           503 when Claude is not connected, 409 when the AI is off, 502 on bad output.
//
// The model only ever sees facts built here from the data folder (never text
// sent by the page). Logs: kind, counts and timings, never titles or names.

import { HttpError } from '../http.mjs';
import { createWeatherService } from '../../lib/weather.mjs';
import { briefPaths } from '../../lib/brief-store.mjs';
import { buildStoryData, STORY_KINDS } from '../../lib/story-data.mjs';
import { fallbackStoryScript, validateStoryScript, generateStoryScript, readStoryScript, writeStoryScript } from '../../lib/story-script.mjs';
import { askJson, aiStatus } from '../../lib/ai.mjs';
import { clock } from '../actions/model.mjs';

// Tests swap the network, the model and the clock.
let fetchImpl = null, aiImpl = null, nowImpl = null;
export function setStoryWeatherFetch(fn) { fetchImpl = fn; }
export function setStoryAi(impl) { aiImpl = impl; }
export function setStoryNow(fn) { nowImpl = fn; }

const WEATHER_WAIT_MS = 2500;

export default function register(app) {
  const { dataDir, log, store, paths } = app.ctx;
  let weather = null;
  const svc = () => (weather = weather || createWeatherService({
    cacheFile: briefPaths(dataDir).weather, log, fetchImpl: (...a) => (fetchImpl || globalThis.fetch)(...a),
  }));
  const ai = () => aiImpl || { askJson, aiStatus };
  const now = () => (nowImpl ? nowImpl() : new Date());
  const pending = new Map();

  async function context(c) {
    const cfg = c.getConfig();
    const s = await store.readObject().catch(() => null);
    return { s: s && typeof s === 'object' ? s : { custom: [] }, cfg, clock: clock(cfg.timezone, now()), paths: c.paths || paths, financeDir: app.ctx.financeDir || cfg.financeDir || (c.paths || paths).finance };
  }
  /** The forecast, but never more than WEATHER_WAIT_MS of waiting: a story must start now. */
  async function forecast(cfg) {
    if (!cfg.location) return null;
    const units = (cfg.brief && cfg.brief.units) || 'metric';
    const p = svc().get(cfg.location, { units }).catch(() => null);
    const r = await Promise.race([p, new Promise(res => setTimeout(() => res(null), WEATHER_WAIT_MS).unref?.())]);
    return r && r.ok ? r : null;
  }
  async function dayModel(c, kind) {
    const q = await context(c);
    const w = await forecast(q.cfg);
    return { q, data: await buildStoryData(q, kind, { weather: w, now: now() }) };
  }
  const kindOf = (v) => {
    if (!STORY_KINDS.includes(v)) throw new HttpError(400, 'kind must be morning, evening or week');
    return v;
  };
  // The cache key: the day, or the reviewed week's first day.
  const cacheDate = (data) => (data.kind === 'week' && data.range ? data.range.from : data.date);
  const storyCfg = (cfg) => (cfg.brief && cfg.brief.story) || {};

  app.route({
    path: '/api/story', method: 'GET', methodError: 'GET only',
    handler: async (c) => {
      const kind = kindOf(c.query.get('kind') || 'morning');
      const t0 = Date.now();
      const { q, data } = await dayModel(c, kind);
      const aiOn = !(q.cfg.brief && q.cfg.brief.ai === false);
      let script = null, state = aiOn ? 'missing' : 'off';
      const hit = aiOn ? await readStoryScript(dataDir, kind, cacheDate(data)).catch(() => null) : null;
      if (hit) {
        const v = validateStoryScript(hit, data, { kind, source: 'ai', model: hit.model || null });
        if (v.script) { script = { ...v.script, at: hit.at || v.script.at }; state = 'cached'; }
      }
      if (!script) script = fallbackStoryScript(kind, data);
      log('info', `story ${kind} ${state} events=${(data.events || []).length} people=${(data.people || []).length} ${Date.now() - t0}ms`);
      return { kind, date: data.date, data, script, ai: { state, model: storyCfg(q.cfg).model || 'claude-haiku-4-5' } };
    },
  });

  app.route({
    path: '/api/story/script', method: 'POST', maxBody: 4 * 1024, methodError: 'POST only',
    handler: async (c) => {
      const b = await c.body();
      const kind = kindOf(b.kind);
      const cfg = c.getConfig();
      if (cfg.brief && cfg.brief.ai === false) throw new HttpError(409, 'The AI script is switched off in Settings.', { code: 'OFF' });
      const { data } = await dayModel(c, kind);
      const date = cacheDate(data);
      if (!b.regenerate) {
        const hit = await readStoryScript(dataDir, kind, date).catch(() => null);
        if (hit) {
          const v = validateStoryScript(hit, data, { kind, source: 'ai', model: hit.model || null });
          if (v.script) return { script: { ...v.script, at: hit.at || v.script.at }, cached: true, dropped: v.dropped };
        }
      }
      const key = kind + '|' + date;
      if (pending.has(key)) return pending.get(key);
      const run = (async () => {
        const st = await ai().aiStatus().catch(() => ({ available: false }));
        if (!st.available) throw new HttpError(503, 'Claude is not connected, so the story uses its built-in script.', { code: st.code || 'UNAVAILABLE' });
        const model = storyCfg(cfg).model || 'claude-haiku-4-5';
        const t0 = Date.now();
        const r = await generateStoryScript({ kind, data, askJson: ai().askJson, model, userName: cfg.userName, style: cfg.ai && cfg.ai.style });
        if (!r.script) throw new HttpError(502, 'The AI script came back unusable.', { code: 'BAD_OUTPUT' });
        await writeStoryScript(dataDir, kind, date, r.script);
        log('info', `story script ${kind} ${r.script.model || model} sentences=${r.script.sentences.length} dropped=${r.dropped} ${Date.now() - t0}ms`);
        return { script: r.script, cached: false, dropped: r.dropped };
      })();
      pending.set(key, run);
      try { return await run; } finally { pending.delete(key); }
    },
  });

  app.route({ prefix: '/api/story/', method: '*', handler: (c) => c.json(404, { error: 'unknown story route' }) });
}
