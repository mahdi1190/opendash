// lib/plan-logic.mjs - the page's planning rules (working hours, planned time
// slots, free time), for Node: the task.plan op, config validation, the stories
// and tests.
//
// The single source is in the page: src/app/12-home-plan-logic.js, a pure
// classic-script file (no DOM, no page globals). This module evaluates it once
// and re-exports the functions, the same way lib/people-tags.mjs and
// lib/brief-logic.mjs do. tests/plan-slots.test.mjs keeps the file pure.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
export const SOURCE_FILES = Object.freeze([join(APP, '12-home-plan-logic.js')]);

const NAMES = [
  'PLAN_MIN_MINUTES', 'PLAN_MAX_MINUTES', 'PLAN_DEFAULT_MINUTES', 'PLAN_WORK_DEFAULT',
  'planWorkHours', 'planWorkHoursCheck', 'planIsWorkDay',
  'planSlotMinutes', 'planSlotOf', 'planSlotCheck', 'planApplySlot', 'planSlotText',
  'planMergeBusy', 'planFreeGaps', 'homeDayCapacity', 'planTaskScore', 'homeGapCandidates', 'homeAutoPlan',
];

const code = SOURCE_FILES.map(f => readFileSync(f, 'utf8')).join('\n;\n');
// eslint-disable-next-line no-new-func
const api = new Function(`"use strict";\n${code}\nreturn { ${NAMES.join(', ')} };`)();

export const {
  PLAN_MIN_MINUTES, PLAN_MAX_MINUTES, PLAN_DEFAULT_MINUTES, PLAN_WORK_DEFAULT,
  planWorkHours, planWorkHoursCheck, planIsWorkDay,
  planSlotMinutes, planSlotOf, planSlotCheck, planApplySlot, planSlotText,
  planMergeBusy, planFreeGaps, homeDayCapacity, planTaskScore, homeGapCandidates, homeAutoPlan,
} = api;
