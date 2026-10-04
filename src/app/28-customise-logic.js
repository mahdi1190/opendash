/* ============================================================
   CUSTOMISE - pure rules (no DOM, no globals, no I/O). Owner: Customise.

   Shared with Node through lib/customise.mjs, so the right-click customise
   popover (28-customise.js) and the actions layer (update_stream,
   update_tag, update_person) agree on what a colour, a symbol and a shape
   are. Every name starts with cz / CZ_.

   A marker is {color, icon, shape}:
     color  '#rrggbb' (people also take a swatch name)
     icon   '' (none) | an icon id from the app's sprite ('rocket') | one emoji
     shape  dot (default) | rounded | square | diamond | ring | pill (streams)
   ============================================================ */
const CZ_SHAPES = ['dot', 'rounded', 'square', 'diamond', 'ring', 'pill'];
const CZ_SHAPE_LABELS = { dot: 'Dot', rounded: 'Rounded square', square: 'Square', diamond: 'Diamond', ring: 'Ring', pill: 'Pill' };
const CZ_ICON_RE = /^[a-z][a-z0-9-]{0,39}$/;
// Sprite icons that are UI chrome, not symbols (left out of the picker; still accepted).
const CZ_CHROME_RE = /^(chevrons?-|grip-|ellipsis|loader-|corner-|panel-|arrow-|maximize-|minimize-|columns-|undo-|redo-)/;

/** '#abc', 'abc', '#AABBCC' -> '#aabbcc'; anything else -> ''. */
function czNormHex(v) {
  const s = String(v == null ? '' : v).trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{6}$/.test(s)) return '#' + s;
  if (/^[0-9a-f]{3}$/.test(s)) return '#' + s.split('').map(c => c + c).join('');
  return '';
}

/** One emoji: a single grapheme with a pictograph (ZWJ sequences, skin tones and flags count). */
function czIsEmoji(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s || s.length > 16) return false;
  if (/^[0-9#*]️?⃣$/u.test(s)) return true;   // keycaps: 1️⃣ #️⃣
  if (!/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(s)) return false;
  if (/[\p{L}\p{N}]/u.test(s)) return false;
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    let n = 0;
    for (const _ of new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(s)) if (++n > 1) return false;   // eslint-disable-line no-unused-vars
    return n === 1;
  }
  return Array.from(s).length <= 4;
}

/** 'icon' | 'emoji' | '' (none) | null (not a symbol). */
function czSymbolKind(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s) return '';
  if (CZ_ICON_RE.test(s)) return 'icon';
  return czIsEmoji(s) ? 'emoji' : null;
}

/** Icon names close to `q` (shared word or substring), shortest first. */
function czNearIcons(q, icons, n) {
  const w = String(q || '').toLowerCase().split(/[^a-z0-9]+/).filter(x => x.length >= 3);
  const out = [];
  for (const name of icons || []) {
    if (name.includes(q) || w.some(x => name.split('-').includes(x) || name.includes(x))) out.push(name);
  }
  // A typo ('rockt'): the names that start the same way.
  if (!out.length && String(q || '').length >= 3) for (const name of icons || []) if (name.startsWith(String(q).slice(0, 3))) out.push(name);
  // Swapped or wrong letters ('rokcet'): names one or two edits away, closest first.
  if (!out.length && String(q || '').length >= 4) {
    const near = [];
    for (const name of icons || []) { const d = _czEditDist(String(q), name, 2); if (d <= 2) near.push([d, name]); }
    return near.sort((a, b) => a[0] - b[0] || a[1].length - b[1].length || (a[1] < b[1] ? -1 : 1)).slice(0, n || 4).map(x => x[1]);
  }
  return out.sort((a, b) => a.length - b.length || (a < b ? -1 : 1)).slice(0, n || 4);
}
/** Edit distance (a swap of two neighbours counts as one), or max + 1 once it is over max. */
function _czEditDist(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let pp = null, p = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const c = [i];
    let low = i;
    for (let j = 1; j <= b.length; j++) {
      c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (pp && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) c[j] = Math.min(c[j], pp[j - 2] + 1);
      if (c[j] < low) low = c[j];
    }
    if (low > max) return max + 1;
    pp = p; p = c;
  }
  return p[b.length];
}

/**
 * Check a symbol. icons: the sprite's ids (a Set; optional: without it any
 * well-formed name passes). -> {value} ('' = remove) or {error, near}.
 */
function czCleanSymbol(v, icons) {
  const s = String(v == null ? '' : v).trim();
  const kind = czSymbolKind(s);
  if (kind === '') return { value: '' };
  if (kind === 'emoji') return { value: s };
  if (kind === 'icon') {
    if (!icons || !icons.size || icons.has(s)) return { value: s };
    return { error: `'${s}' is not one of the app's icons`, near: czNearIcons(s, icons, 4) };
  }
  return { error: "a symbol is an icon name in lower-case-with-dashes (for example 'rocket') or one emoji", near: [] };
}

/** The marker of a stream / tag / person, normalised for drawing. */
function czMarkParts(o) {
  o = o || {};
  const icon = typeof o.icon === 'string' ? o.icon.trim() : '';
  const kind = czSymbolKind(icon);
  return { icon: kind ? icon : '', iconKind: kind || '', shape: CZ_SHAPES.includes(o.shape) ? o.shape : 'dot' };
}
/** CSS classes for a marker's parts: 'mk mk-<shape>' (+ ' mk-sym', + ' mk-emoji'). */
function czMarkClass(parts) {
  const p = parts || {};
  return `mk mk-${CZ_SHAPES.includes(p.shape) ? p.shape : 'dot'}` + (p.iconKind ? ' mk-sym' : '') + (p.iconKind === 'emoji' ? ' mk-emoji' : '');
}
/** Is a stream's marker customised (a symbol, or a shape other than the dot)? */
function czIsCustom(o) { const p = czMarkParts(o); return !!p.icon || p.shape !== 'dot'; }

// The emoji tab of the symbol picker (any other emoji can be typed or pasted).
const CZ_EMOJI = ['🎓', '📚', '📝', '🔬', '🧪', '💼', '💻', '📈', '💰', '🏦', '🏠', '❤️', '🏃', '🧘', '🍎', '✈️', '🌍', '🎯',
  '🚀', '⭐', '🔥', '⚡', '💡', '🧠', '🛠️', '📅', '⏰', '📌', '✅', '❗', '🎉', '🎵', '🎨', '📷', '🌱', '🐶', '👶', '👪',
  '🤝', '💬', '📞', '✉️', '🗂️', '🧾', '🏥', '🛒', '🍽️', '☕'];

/**
 * The symbol grid: curated [[name, keywords]] matches first, then every other
 * sprite id that contains the query (UI chrome left out). -> [names]
 */
function czSymbolSearch(q, curated, all, limit) {
  q = String(q || '').trim().toLowerCase();
  const out = [], seen = new Set();
  const push = (n) => { if (n && !seen.has(n) && !CZ_CHROME_RE.test(n)) { seen.add(n); out.push(n); } };
  for (const [n, k] of curated || []) if (!q || n.includes(q) || String(k || '').includes(q)) push(n);
  for (const n of all || []) if (!q || n.includes(q)) push(n);
  return limit ? out.slice(0, limit) : out;
}

/**
 * Move one stream up (-1) or down (+1) among the active ones. list: [{id,
 * archived}] in display order. -> the new order of every id, or null.
 */
function czMoveOrder(list, id, dir) {
  const live = (list || []).filter(x => x && !x.archived).map(x => x.id);
  const i = live.indexOf(id), j = i + dir;
  if (i < 0 || j < 0 || j >= live.length) return null;
  const t = live[i]; live[i] = live[j]; live[j] = t;
  return [...live, ...(list || []).filter(x => x && x.archived).map(x => x.id)];
}

/**
 * Aliases to add when a person is renamed, so matching and auto-link keep
 * working: the old name's match terms the new name no longer gives.
 * oldTerms/newTerms: pplTerms(person).text for each name; aliases: current.
 */
function czRenameAliases(oldTerms, newTerms, aliases) {
  const have = new Set([...(newTerms || []), ...(aliases || []).map(a => String(a).toLowerCase())]);
  const out = [];
  for (const t of oldTerms || []) { const v = String(t).toLowerCase(); if (v && !have.has(v) && !out.includes(v)) out.push(v); }
  return out;
}

/**
 * What renaming tag `from` to `raw` means. norm = tglNorm; known = Set of
 * every tag. -> {to, kind: 'empty' | 'same' | 'rename' | 'merge'}
 */
function czTagRenameIntent(from, raw, known, norm) {
  const to = norm(raw);
  if (!to) return { to, kind: 'empty' };
  if (to === from) return { to, kind: 'same' };
  return { to, kind: known && known.has(to) ? 'merge' : 'rename' };
}
