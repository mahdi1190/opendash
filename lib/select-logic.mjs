// lib/select-logic.mjs - the select-list and proposal-subset rules for Node.
//
// The rules are the page's own pure file, src/app/11-ui-select-logic.js,
// evaluated once here (as lib/resources.mjs does for Files & links), so the
// actions layer applies "only the ticked changes" of a proposal with exactly
// the dependency rules the page uses to tick and untick them.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', '11-ui-select-logic.js');
const NAMES = ['selRange', 'selSet', 'selAllIds', 'selInvertIds', 'selState', 'selKeep', 'selCountText',
  'opsRefOf', 'opsRefDeps', 'opsTickClosure', 'opsUntickClosure', 'opsSubset', 'opsRemapPreview'];
// eslint-disable-next-line no-new-func
const api = new Function(`"use strict";\n${readFileSync(SOURCE_FILE, 'utf8')}\nreturn { ${NAMES.join(', ')} };`)();
export const {
  selRange, selSet, selAllIds, selInvertIds, selState, selKeep, selCountText,
  opsRefOf, opsRefDeps, opsTickClosure, opsUntickClosure, opsSubset, opsRemapPreview,
} = api;
