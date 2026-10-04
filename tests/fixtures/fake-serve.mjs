// A stand-in for serve.mjs: tests/server-control.test.mjs runs tools/supervisor.mjs
// with DASHBOARD_SUPERVISOR_SERVE pointing here.
//   FAKE_SERVE_PLAN    what each start does, comma separated: an exit code, or
//                      'wait' (run until the supervisor asks it to stop over IPC)
//   FAKE_SERVE_RECORD  a file: each start appends one JSON line with what it was given;
//                      a stop request appends its reason to <record>.stop
import { appendFileSync, readFileSync } from 'node:fs';

const rec = process.env.FAKE_SERVE_RECORD;
let n = 0;
try { n = readFileSync(rec, 'utf8').split('\n').filter(Boolean).length; } catch { n = 0; }
const plan = String(process.env.FAKE_SERVE_PLAN || '0').split(',');
const step = plan[Math.min(n, plan.length - 1)];
appendFileSync(rec, JSON.stringify({
  n, argv: process.argv.slice(2), supervised: process.env.DASHBOARD_SUPERVISED || null, ipc: typeof process.send === 'function',
  restartCount: process.env.DASHBOARD_RESTART_COUNT || null, lastStop: process.env.DASHBOARD_LAST_STOP || null,
  wait: process.env.DASHBOARD_RESPAWN_WAIT || null, history: process.env.DASHBOARD_RESTART_HISTORY || '',
}) + '\n');
if (step === 'wait') {
  process.on('message', (m) => { if (m && m.cmd === 'stop') { appendFileSync(rec + '.stop', String(m.reason) + '\n'); process.exit(0); } });
  process.on('disconnect', () => process.exit(0));
  setInterval(() => {}, 1000);
} else {
  setTimeout(() => process.exit(Number(step)), 30);
}
