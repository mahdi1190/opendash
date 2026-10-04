// lib/customise.mjs - the page's marker rules, for Node.
//
// The single source is in the page: src/app/28-customise-logic.js (cz*), a
// pure classic-script file (no DOM, no globals). This module evaluates it once
// and re-exports the functions, so the actions layer (update_stream,
// update_tag, update_person; and so MCP and the CLI) checks colours, symbols
// and shapes exactly like the right-click customise popover does.
// tests/customise.test.mjs checks the file stays pure.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE_FILE = join(ROOT, 'src', 'app', '28-customise-logic.js');
export const SPRITE_FILE = join(ROOT, 'vendor', 'icons', 'lucide-sprite.svg');

const NAMES = ['CZ_SHAPES', 'CZ_SHAPE_LABELS', 'CZ_EMOJI', 'czNormHex', 'czIsEmoji', 'czSymbolKind', 'czNearIcons', 'czCleanSymbol', 'czMarkParts',
  'czMarkClass', 'czIsCustom', 'czSymbolSearch', 'czMoveOrder', 'czRenameAliases', 'czTagRenameIntent'];
// eslint-disable-next-line no-new-func
const api = new Function(`"use strict";\n${readFileSync(SOURCE_FILE, 'utf8')}\nreturn { ${NAMES.join(', ')} };`)();

export const {
  CZ_SHAPES, CZ_SHAPE_LABELS, CZ_EMOJI, czNormHex, czIsEmoji, czSymbolKind, czNearIcons, czCleanSymbol, czMarkParts,
  czMarkClass, czIsCustom, czSymbolSearch, czMoveOrder, czRenameAliases, czTagRenameIntent,
} = api;

let _icons = null;
/** The icon ids in the app's sprite (vendor/icons/lucide-sprite.svg), read once. Empty if unreadable. */
export function spriteIconNames() {
  if (_icons) return _icons;
  try {
    _icons = new Set([...readFileSync(SPRITE_FILE, 'utf8').matchAll(/id="i-([a-z0-9-]+)"/g)].map(m => m[1]));
  } catch {
    _icons = new Set();
  }
  return _icons;
}
