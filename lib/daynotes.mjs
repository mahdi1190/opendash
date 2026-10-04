// lib/daynotes.mjs - the page's Daily note rules, for Node (the daynote.save
// op and the daynotes.get query in server/actions/ops-daynotes.mjs, tests).
//
// The single source is in the page: src/app/12-home-notebook-logic.js, a pure
// classic-script file (no DOM, no page globals). This module evaluates it once
// and re-exports the functions, the same way lib/plan-logic.mjs does.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
export const SOURCE_FILES = Object.freeze([join(APP, '12-home-notebook-logic.js')]);

const NAMES = [
  'DAYNOTE_MAX', 'DAYNOTE_IDLE_MS', 'DAYNOTE_FOCUS_GAP_MS',
  'dnIsDate', 'dnNorm', 'dnCheck', 'dnAddDays', 'dnStrip', 'dnOnThisDay', 'dnHM', 'dnTimeLine', 'dnAppend', 'dnLastLine', 'dnShow',
  'dnTasks', 'dnMarkTask', 'dnTaskTitle', 'dnInsertTime', 'dnEnterContinue', 'dnMerge3', 'dnSearch', 'dnPart', 'dnPlaceholder', 'dnTemplate', 'dnSaveDelay',
];

const code = SOURCE_FILES.map(f => readFileSync(f, 'utf8')).join('\n;\n');
// eslint-disable-next-line no-new-func
const api = new Function(`"use strict";\n${code}\nreturn { ${NAMES.join(', ')} };`)();

export const {
  DAYNOTE_MAX, DAYNOTE_IDLE_MS, DAYNOTE_FOCUS_GAP_MS,
  dnIsDate, dnNorm, dnCheck, dnAddDays, dnStrip, dnOnThisDay, dnHM, dnTimeLine, dnAppend, dnLastLine, dnShow,
  dnTasks, dnMarkTask, dnTaskTitle, dnInsertTime, dnEnterContinue, dnMerge3, dnSearch, dnPart, dnPlaceholder, dnTemplate, dnSaveDelay,
} = api;
