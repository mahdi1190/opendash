// lib/brief-logic.mjs - the page's Brief + Review rules and the animated
// scene library, for Node (the brief.get query, tests).
//
// The single source is in the page: src/app/71-anim-library.js (anim*) and
// src/app/73-brief-logic.js (brief*, review*). Both are pure classic-script
// files (no DOM, no page globals); this module evaluates them once and
// re-exports the functions, the same way lib/people-tags.mjs does.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
export const SOURCE_FILES = Object.freeze([join(APP, '71-anim-library.js'), join(APP, '73-brief-logic.js')]);

const NAMES = [
  'ANIM_SCENES', 'ANIM_CATEGORIES', 'ANIM_CATEGORY_FALLBACK', 'animNorm', 'animNameCount', 'animFeatures', 'animKey', 'animTitleKey',
  'animClassify', 'animScene', 'animTypes', 'animSceneSvg',
  'BRIEF_MEETING_TYPES', 'BRIEF_TRAVEL_TYPES', 'BRIEF_CELEBRATE_TYPES', 'BRIEF_LAYOUTS',
  'briefHM', 'briefMin', 'briefAddDays', 'briefWeekday', 'briefDaysBetween', 'briefTimeOfDay', 'briefRelTime', 'briefGaps',
  'briefDayType', 'briefHeadline', 'briefStats', 'briefOrchestrate', 'briefRollover', 'briefStreak',
  'reviewWeekRange', 'reviewWeekStats', 'reviewCapacity',
];

const code = SOURCE_FILES.map(f => readFileSync(f, 'utf8')).join('\n;\n');
// eslint-disable-next-line no-new-func
const api = new Function(`"use strict";\n${code}\nreturn { ${NAMES.join(', ')} };`)();

export const {
  ANIM_SCENES, ANIM_CATEGORIES, ANIM_CATEGORY_FALLBACK, animNorm, animNameCount, animFeatures, animKey, animTitleKey,
  animClassify, animScene, animTypes, animSceneSvg,
  BRIEF_MEETING_TYPES, BRIEF_TRAVEL_TYPES, BRIEF_CELEBRATE_TYPES, BRIEF_LAYOUTS,
  briefHM, briefMin, briefAddDays, briefWeekday, briefDaysBetween, briefTimeOfDay, briefRelTime, briefGaps,
  briefDayType, briefHeadline, briefStats, briefOrchestrate, briefRollover, briefStreak,
  reviewWeekRange, reviewWeekStats, reviewCapacity,
} = api;
