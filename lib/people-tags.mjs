// lib/people-tags.mjs - the page's people-linking and tag logic, for Node.
//
// The single source is in the page: src/app/52-people-link.js (ppl*) and
// src/app/27-tags-logic.js (tgl*). Both are pure classic-script files (no
// DOM, no globals); this module evaluates them once, in this realm, and
// re-exports the functions so the actions layer, the MCP server and the
// migrations link people and clean tags exactly like the page does.
// tests/people-link.test.mjs checks the files stay pure.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
export const SOURCE_FILES = Object.freeze([join(APP, '52-people-link.js'), join(APP, '27-tags-logic.js')]);

const NAMES = [
  'pplFold', 'pplIsSelf', 'pplKind', 'pplPersonEmails', 'pplLooksLikeMailbox', 'pplNormalizePerson', 'pplNameParts', 'pplTerms',
  'pplBuildIndex', 'pplTagPerson', 'pplTagIsWaiting', 'pplLinked', 'pplMentions', 'pplSuggest', 'pplAutoLink', 'pplOrphans',
  'pplIsWaiting', 'pplEventPeople', 'pplUnknownNames',
  'TGL_STATUS', 'tglNorm', 'tglSlug', 'tglRegistry', 'tglEntry', 'tglIsArchived', 'tglIsPinned', 'tglUsage', 'tglKnown',
  'tglStreamKeys', 'tglFlags', 'tglSimilar', 'tglMapEverywhere', 'tglRename', 'tglMerge', 'tglDelete', 'tglSetFlags',
  'tglRegister', 'tglCleanState', 'tglRenameRefs',
];

const code = SOURCE_FILES.map(f => readFileSync(f, 'utf8')).join('\n;\n');
// eslint-disable-next-line no-new-func
const api = new Function(`"use strict";\n${code}\nreturn { ${NAMES.join(', ')} };`)();

export const {
  pplFold, pplIsSelf, pplKind, pplPersonEmails, pplLooksLikeMailbox, pplNormalizePerson, pplNameParts, pplTerms,
  pplBuildIndex, pplTagPerson, pplTagIsWaiting, pplLinked, pplMentions, pplSuggest, pplAutoLink, pplOrphans,
  pplIsWaiting, pplEventPeople, pplUnknownNames,
  TGL_STATUS, tglNorm, tglSlug, tglRegistry, tglEntry, tglIsArchived, tglIsPinned, tglUsage, tglKnown,
  tglStreamKeys, tglFlags, tglSimilar, tglMapEverywhere, tglRename, tglMerge, tglDelete, tglSetFlags,
  tglRegister, tglCleanState, tglRenameRefs,
} = api;
