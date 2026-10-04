// lib/mail-logic.mjs - the "needs a reply" rules and draft templates for Node.
//
// The rules are the page's own pure file, src/app/12-home-mail-logic.js,
// evaluated once here (as lib/select-logic.mjs does), so a server-side reader
// (the brief, the MCP, tests) counts the same threads as Home's Needs reply.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', '12-home-mail-logic.js');
const NAMES = ['homeNeedsReply', 'homeNeedsReplySummary', 'homeMailIsAutomated', 'homeMailFirstName', 'homeMailAgeDays',
  'homeMailReplySubject', 'homeMailQuickTaskTitle', 'homeMailDraftTemplate'];
// eslint-disable-next-line no-new-func
const api = new Function(`"use strict";\n${readFileSync(SOURCE_FILE, 'utf8')}\nreturn { ${NAMES.join(', ')} };`)();
export const {
  homeNeedsReply, homeNeedsReplySummary, homeMailIsAutomated, homeMailFirstName, homeMailAgeDays,
  homeMailReplySubject, homeMailQuickTaskTitle, homeMailDraftTemplate,
} = api;
