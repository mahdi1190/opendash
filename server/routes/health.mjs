// server/routes/health.mjs - what the page asks first.
//
//   GET /api/health -> {ok, app, version, build, stateExists, stateFile, taskCount, lastSave, size,
//                       ai:{available, model, code, pending}, google:{...}, finance:{available},
//                       pid, uptime (s), startedAt, supervised, restartCount,
//                       lastStopReason:{reason, at, source}|null, lastRebuild?:{ok, step, at, message},
//                       launch:{startScheme}}   (process facts: server/lifecycle.mjs runtimeInfo)
//
// The AI probe starts when the server boots; health waits for it at most a
// few seconds, then answers with ai.pending:true (the page can poll
// /api/ai/status) instead of holding the whole page up.

import { aiStatus, aiStatusCached } from '../../lib/ai.mjs';
import { financeAvailable } from '../../lib/finance.mjs';
import { runtimeInfo } from '../lifecycle.mjs';

const AI_WAIT_MS = 8000;

export default function register(app) {
  const { store, version } = app.ctx;
  app.route({
    path: '/api/health', method: 'GET', quiet: true,
    handler: async (c) => {
      const st = await store.info();
      let ai = aiStatusCached();
      let pending = false;
      // ?quick=1 (the page's restart / reconnect polling) never waits for the AI probe.
      if (!ai && c.query.get('quick') === '1') pending = true;
      else if (!ai) {
        ai = await Promise.race([aiStatus(), new Promise(r => setTimeout(() => r(null), AI_WAIT_MS))]);
        pending = !ai;
      }
      const cfg = c.getConfig();
      return {
        ok: true,
        app: 'dashboard',
        version,
        stateExists: !!st.exists,
        stateFile: store.file,
        ...(st.exists ? { taskCount: st.taskCount ?? null, lastSave: st.lastSave ?? null, size: st.size } : {}),
        ...(st.parseError ? { parseError: st.parseError } : {}),
        ai: {
          available: !!(ai && ai.available), pending,
          code: ai ? ai.code : null, model: cfg.ai.model, chatModel: cfg.ai.chatModel,
        },
        google: await c.googleSummary(),
        finance: { available: financeAvailable() },
        // Which server process answered: the page's restart waits for a new pid.
        ...runtimeInfo(),
        build: typeof c.buildId === 'function' ? c.buildId() : null,
        launch: { startScheme: typeof c.launchHint === 'function' ? c.launchHint() : null },
      };
    },
  });
}
