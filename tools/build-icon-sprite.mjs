#!/usr/bin/env node
// tools/build-icon-sprite.mjs - (re)build vendor/icons/lucide-sprite.svg, the
// hidden <symbol> sprite build.mjs inlines at the top of <body>.
//
//   node tools/build-icon-sprite.mjs --from <lucide-static>/icons [--add name,name] [--check]
//
// Icons come from the lucide-static package (ISC licence, copy kept in
// vendor/icons/Lucide-LICENSE.txt). The list below is every icon the app may
// reference; add a name here (or pass --add) and rerun. Usage in the app:
//   icon('calendar')  ->  <svg class="i"><use href="#i-calendar"/></svg>
// Stroke width is not baked in: the .i class sets it (1.75; 2 in small tiles).
// --check (no --from needed) verifies that every name in ICONS is in the
// current sprite and exits 1 if not.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SPRITE_FILE = join(ROOT, 'vendor', 'icons', 'lucide-sprite.svg');

export const ICONS = [
  // design set (v2 mockups)
  'check', 'list-todo', 'calendar', 'calendar-days', 'calendar-range', 'calendar-clock', 'wallet', 'sun', 'sunrise', 'moon',
  'inbox', 'layers', 'circle-dashed', 'circle-check', 'trophy', 'mail', 'users', 'user', 'user-plus', 'tag', 'hash',
  'search', 'command', 'plus', 'settings', 'ellipsis', 'chevron-down', 'chevron-right', 'chevron-left', 'chevrons-up-down',
  'flag', 'grip-vertical', 'clock', 'timer', 'hourglass', 'graduation-cap', 'plane', 'briefcase', 'rocket', 'file-text',
  'flask-conical', 'sparkles', 'trash-2', 'bell', 'list-filter', 'sliders-horizontal', 'arrow-up-down', 'layout-list',
  'square-kanban', 'panel-left', 'x', 'pencil', 'palette', 'star', 'heart', 'map-pin', 'video', 'phone', 'at-sign',
  'message-square', 'link', 'external-link', 'repeat', 'paperclip', 'list-checks', 'cake', 'party-popper', 'target',
  'coins', 'banknote', 'book-open', 'zap', 'download', 'upload', 'printer', 'cloud', 'cloud-check', 'circle-help', 'keyboard',
  'corner-down-left', 'arrow-up', 'arrow-down', 'arrow-right', 'eye', 'eye-off', 'refresh-cw', 'building-2', 'folder',
  'notebook-pen', 'lightbulb', 'archive', 'gift', 'mountain', 'baby', 'stethoscope', 'presentation', 'award', 'landmark',
  'scroll-text', 'pin', 'layout-grid', 'clipboard-list', 'copy', 'merge', 'sparkle', 'circle', 'git-merge', 'tags',
  'chart-column', 'receipt', 'piggy-bank', 'circle-alert', 'move', 'type', 'monitor', 'house', 'circle-user', 'log-out',
  // app shell additions
  'plug', 'plug-zap', 'unplug', 'bot', 'message-circle', 'send', 'lock', 'lock-open', 'sun-moon', 'maximize-2',
  'minimize-2', 'scan', 'menu', 'chevron-up', 'filter', 'arrow-left', 'shield-check', 'key-round', 'square-check-big',
  'square', 'circle-dot', 'loader-circle', 'info', 'triangle-alert', 'kanban', 'list', 'columns-3', 'file-down',
  'file-up', 'database', 'history', 'undo-2', 'redo-2', 'minus', 'check-check', 'ellipsis-vertical', 'pin-off',
  'alarm-clock', 'contact', 'circle-plus', 'panel-right', 'calendar-check', 'calendar-plus', 'wand-sparkles',
  'focus', 'gauge', 'text-search', 'globe', 'mail-check', 'cloud-off', 'circle-x', 'rotate-ccw', 'workflow',
  'layout-template', 'log-in',
  // top-bar symbol picker + Home (Home builder; TB_SYMBOLS in src/app/10-header-editor.js)
  'microscope', 'atom', 'dna', 'test-tube', 'brain', 'factory', 'train-front', 'car', 'bike', 'ship', 'map', 'compass',
  'tent', 'pill', 'dumbbell', 'medal', 'calendar-heart', 'snowflake', 'umbrella', 'leaf', 'trees', 'flower-2', 'sprout',
  'coffee', 'utensils', 'wine', 'music', 'camera', 'pen-tool', 'laptop', 'code', 'terminal', 'flame', 'credit-card',
  'shopping-cart', 'package', 'truck', 'handshake', 'megaphone', 'gamepad-2', 'puzzle', 'bug', 'wrench', 'hammer',
  'school', 'ticket', 'film', 'headphones', 'mic', 'newspaper', 'ruler', 'glasses', 'shirt', 'dog', 'cat', 'paw-print',
  'recycle', 'anchor', 'milestone', 'signpost', 'goal', 'crown', 'gem', 'cookie', 'pizza', 'apple', 'beer', 'rainbow',
  'sunset', 'waves', 'tree-pine', 'bed', 'hospital', 'luggage', 'chart-line', 'trending-up', 'chart-pie', 'cpu', 'wifi',
  'battery-charging', 'palmtree',
  // People + Tags (src/app/26-tags-section.js, 51-people-section.js)
  'arrow-down-up', 'table-2', 'link-2-off', 'mail-x', 'search-x', 'user-check', 'user-round-check', 'user-search', 'user-x',
  'user-minus', 'archive-restore',
  // Files & links (src/app/63-resources.js): kind and file-type icons, Explore panel
  'folder-open', 'folder-search', 'folder-git-2', 'file', 'file-spreadsheet', 'file-code', 'file-archive', 'file-image',
  'file-pen-line', 'file-video', 'file-audio', 'git-pull-request', 'git-branch', 'hard-drive', 'image', 'clipboard',
  'square-code', 'folder-x',
  // Travel & time, People card, suggestions (69-travel-*.js, 54-people-card.js, 68-suggest-*.js)
  'user-round-pen', 'map-pin-off', 'list-plus', 'calendar-off', 'square-check', 'user-round',
];

function build(fromDir, names) {
  const missing = [];
  let out = '<svg xmlns="http://www.w3.org/2000/svg" id="icon-sprite" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">\n';
  for (const name of names) {
    const f = join(fromDir, name + '.svg');
    if (!existsSync(f)) { missing.push(name); continue; }
    const inner = readFileSync(f, 'utf8')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/^[\s\S]*?<svg[^>]*>/, '')
      .replace(/<\/svg>\s*$/, '')
      .trim()
      .replace(/\s*\n\s*/g, '');
    out += `<symbol id="i-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${inner}</symbol>\n`;
  }
  out += '</svg>\n';
  return { out, missing };
}

/** Names present in a sprite file. */
export function spriteIds(file = SPRITE_FILE) {
  if (!existsSync(file)) return new Set();
  return new Set([...readFileSync(file, 'utf8').matchAll(/<symbol id="i-([a-z0-9-]+)"/g)].map(m => m[1]));
}

function main(argv) {
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const extra = (arg('--add') || '').split(',').map(s => s.trim()).filter(Boolean);
  const names = [...new Set([...ICONS, ...extra])];
  if (argv.includes('--check')) {
    const have = spriteIds();
    const miss = names.filter(n => !have.has(n));
    if (miss.length) { console.error('[icons] missing from sprite: ' + miss.join(', ')); process.exit(1); }
    console.log(`[icons] sprite has all ${names.length} icons`);
    return;
  }
  const from = arg('--from');
  if (!from || !existsSync(from)) {
    console.error('usage: node tools/build-icon-sprite.mjs --from <lucide-static>/icons [--add a,b]');
    process.exit(2);
  }
  const { out, missing } = build(from, names);
  if (missing.length) { console.error('[icons] not found in ' + from + ': ' + missing.join(', ')); process.exit(1); }
  writeFileSync(SPRITE_FILE, out);
  console.log(`[icons] wrote ${SPRITE_FILE}: ${names.length} icons, ${out.length} bytes`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
