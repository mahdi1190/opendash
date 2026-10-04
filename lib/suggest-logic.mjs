// lib/suggest-logic.mjs - the suggestions engine's pure rules for Node.
//
// The single source is the page: src/app/68-suggest-logic.js (registry,
// evaluation, ranking, memory, counts) plus every src/app/68-suggest-rules-*.js
// file (one per area: the cards). They are pure classic-script files (no DOM,
// no page globals); this module evaluates them once, in build order, the way
// lib/select-logic.mjs and lib/brief-logic.mjs do, so tests (and later the
// server: the story's script, an MCP get_suggestions query) run exactly the
// rules the page runs.
//
// loadSuggestLogic() gives a FRESH copy (its own registry) for tests that
// register extra rules; the named exports share one copy.

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
export const LOGIC_FILE = join(APP, '68-suggest-logic.js');
export function ruleFiles() {
  return readdirSync(APP).filter(n => /^68-suggest-rules-.*\.js$/.test(n)).sort().map(n => join(APP, n));
}
export function sourceFiles() { return [LOGIC_FILE, ...ruleFiles()]; }

export const NAMES = [
  'SG_VERSION', 'SG_AREAS', 'SG_AREA_LABEL', 'SG_HOURS', 'SG_PROACTIVE', 'SG_NEEDS', 'SG_THRESHOLD', 'SG_GAP_MIN', 'SG_BLOCK_MAX', 'SG_BLOCK_MIN',
  'SG_ACTION_TYPES', 'SG_OPS_ALLOW',
  'sgRules', 'sgRule', 'sgRegisterRule', 'sgCheckRule', 'sgCheckCard',
  'sgHM', 'sgDur', 'sgMinOf', 'sgAddDays', 'sgDow', 'sgDaysBetween', 'sgWork', 'sgIsWorkDay', 'sgNextWorkDay', 'sgShort', 'sgClip',
  'sgPrepare', 'sgTask', 'sgFutureBlocksFor', 'sgOwnBlockSoon', 'sgInMeeting', 'sgInWorkHours', 'sgHoursOk', 'sgFreeStretches',
  'sgMemNorm', 'sgRuleOn', 'sgHiddenBy', 'sgMemDismiss', 'sgMemNotFor', 'sgMemFewer', 'sgMemRule', 'sgMemAccept', 'sgMemSetOff', 'sgMemSetHomeMax',
  'sgMemReset', 'sgMemCount', 'sgMemPrune',
  'sgStatsNorm', 'sgStatsShown', 'sgStatsActed', 'sgStatsDismissed', 'sgStatsRoll', 'sgStatsKeep', 'sgStatsReset', 'sgLearn', 'sgFewerFactor',
  'sgNormCard', 'sgScore', 'sgDedupe', 'sgEvaluate', 'sgAssign', 'sgWhyText',
  // S1 (68-suggest-rules-s1.js)
  'sgTopTask', 'sgBlockDescription', 'sgBlockTitle', 'sgFreeSlotCard',
];

/**
 * A fresh copy of the engine and every rule file. `extra` = more source text (a test's
 * own rule file) evaluated after them; `files` = a different list of files.
 * Returns {api, names}: every top-level function in the files is reachable through
 * api.get(name) too, so rule files can export their own helpers without being listed here.
 */
export function loadSuggestLogic({ extra = '', files = sourceFiles() } = {}) {
  const code = files.map(f => readFileSync(f, 'utf8')).join('\n;\n') + '\n;\n' + extra;
  const fnNames = [...new Set([...code.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map(m => m[1]))];
  const constNames = [...new Set([...code.matchAll(/^const\s+([A-Za-z_$][\w$]*)\s*=/gm)].map(m => m[1]))];
  const all = [...new Set([...NAMES.filter(n => fnNames.includes(n) || constNames.includes(n)), ...fnNames, ...constNames])];
  // eslint-disable-next-line no-new-func
  const api = new Function(`"use strict";\n${code}\nreturn { ${all.join(', ')} };`)();
  api.get = (n) => api[n];
  return api;
}

const shared = loadSuggestLogic();
export const api = shared;
export const {
  SG_VERSION, SG_AREAS, SG_AREA_LABEL, SG_HOURS, SG_PROACTIVE, SG_NEEDS, SG_THRESHOLD, SG_GAP_MIN, SG_BLOCK_MAX, SG_BLOCK_MIN,
  SG_ACTION_TYPES, SG_OPS_ALLOW,
  sgRules, sgRule, sgRegisterRule, sgCheckRule, sgCheckCard,
  sgHM, sgDur, sgMinOf, sgAddDays, sgDow, sgDaysBetween, sgWork, sgIsWorkDay, sgNextWorkDay, sgShort, sgClip,
  sgPrepare, sgTask, sgFutureBlocksFor, sgOwnBlockSoon, sgInMeeting, sgInWorkHours, sgHoursOk, sgFreeStretches,
  sgMemNorm, sgRuleOn, sgHiddenBy, sgMemDismiss, sgMemNotFor, sgMemFewer, sgMemRule, sgMemAccept, sgMemSetOff, sgMemSetHomeMax,
  sgMemReset, sgMemCount, sgMemPrune,
  sgStatsNorm, sgStatsShown, sgStatsActed, sgStatsDismissed, sgStatsRoll, sgStatsKeep, sgStatsReset, sgLearn, sgFewerFactor,
  sgNormCard, sgScore, sgDedupe, sgEvaluate, sgAssign, sgWhyText,
  sgTopTask, sgBlockDescription, sgBlockTitle, sgFreeSlotCard,
} = shared;
