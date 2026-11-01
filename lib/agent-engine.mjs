// lib/agent-engine.mjs - the page's own game rules, run in Node for the agent.
//
// The garden, the pet, the wardrobe, quests, achievements and memories are page code (src/app/*.js): there is no
// server copy of their rules, and writing one would let the two drift (coins, caps, unlocks). So the agent runs the
// SAME files, the way lib/profile-avatar.mjs and lib/friends/share.mjs already evaluate page files: each call gets a
// fresh context holding a copy of the state, calls the page's own function, and hands back the changed copy. It cannot
// mint anything the page could not: a wallet is still derived from focus time and finished tasks.
//
// No DOM exists here: the page code guards every use of it (typeof document, typeof toast, typeof saveUI), and the
// timers are no-ops, so nothing it schedules ever runs. Only this repository's files are evaluated; the state is data.

import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
// Sorted by name, like build.mjs: later files use what earlier ones define.
const WANT = [/^00-core-constants\.js$/, /^07-core-clock-logic\.js$/, /^71-ach-/, /^71-achievements\.js$/, /^92-game-0logic\.js$/, /^92-game-1core\.js$/, /^92-game-4facts\.js$/,
  /^93-memories-core\.js$/, /^94-garden-0catalog\.js$/, /^94-garden-0econ\.js$/, /^94-garden-1core\.js$/, /^94-garden-craft-0rules\.js$/, /^94-garden-fish-0catalog\.js$/, /^94-garden-fish-2core\.js$/, /^94-garden-lands-0table\.js$/, /^94-garden-lands-1core\.js$/, /^94-garden-rewards-0rules\.js$/, /^97-pets-0kit\.js$/, /^97-pets-1core\.js$/, /^97-pets-1collect\.js$/, /^97-pets-tricks-0clips\.js$/, /^97-pets-tricks-1rules\.js$/,
  /^97-profile-0kit(-[a-z0-9-]+)?\.js$/, /^97-profile-0look\.js$/, /^97-profile-1core\.js$/, /^97-profile-4wardrobe\.js$/];

let script = null;
function pageScript() {
  if (script) return script;
  const files = readdirSync(APP_DIR).filter(f => WANT.some(re => re.test(f))).sort();
  // One script, as the page has one scope.
  script = new vm.Script(files.map(f => `// ${f}\n${readFileSync(join(APP_DIR, f), 'utf8')}`).join('\n;\n'), { filename: 'opendash-page-engine.js' });
  return script;
}

const noop = () => 0;
const quiet = { log: noop, info: noop, debug: noop, warn: noop, error: noop };

/**
 * A context of the page's rules over `state` (changed in place by them). opts: {now (ms), zone, config}.
 * Returns the context's globals: its functions (gardenBuy, gardenWallet, petFeed, ...) are properties.
 */
export function pageEngine(state, { now = Date.now(), zone = 'UTC', config = {} } = {}) {
  const sb = {
    console: quiet, state, APP_CONFIG: config,
    setTimeout: noop, clearTimeout: noop, setInterval: noop, clearInterval: noop, requestAnimationFrame: noop, cancelAnimationFrame: noop,
    safeColor: (c, d) => (typeof c === 'string' && /^#[0-9a-f]{3,8}$/i.test(c) ? c : d),   // a drawing helper applyStreams needs; colours do not matter here
  };
  const ctx = vm.createContext(sb);
  pageScript().runInContext(ctx, { timeout: 5000 });
  // The page's Clock over the same logic file, frozen at this call's moment and zone.
  sb.Clock = Object.freeze({
    now: () => now, zone: () => zone, parts: (ms) => sb.clockPartsIn(ms == null ? now : ms, zone), addDays: (iso, n) => sb.clockAddDays(iso, n),
    at: (iso, min) => sb.clockAtIn(iso, min || 0, zone), today: () => sb.clockTodayIn(zone, now),
  });
  sb.todayStr = () => sb.clockTodayIn(zone, now);
  // Everything that reads STREAMS (quests, memories, and through them what earns coins) needs the state's list.
  if (typeof sb.applyStreams === 'function') sb.applyStreams(state);
  sb.uiPrefGet = (k) => (state.uiPrefs && typeof state.uiPrefs === 'object' ? state.uiPrefs[k] : undefined);
  // A page constant by its name (top-level const is not a property of the context). Names come from our code only.
  sb.__const = (name) => vm.runInContext(String(name), ctx);
  return sb;
}

/** Plain JSON from anything a context made (its objects have that context's prototypes). */
export const plain = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
