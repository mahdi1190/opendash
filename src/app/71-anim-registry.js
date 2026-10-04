/* ============================================================
   ANIMATION REGISTRY (v2.2 wave 1). PURE classic script: no DOM, no page
   globals, nothing runs at load except building constants, so Node can load
   it (tests/anim-packs.test.mjs, the quality gate) exactly as the page does.

   One registry for every animated slot. Animations arrive in PACKS: a pack is
   a classic script src/app/72-anim-pack-<id>.js that calls
   animRegisterPack(manifest). The built-in animations are the "core" pack
   (72-anim-pack-core.js). How to write one: docs/dev/ANIMATION_PACKS.md.

     ANIM_SLOTS                      the slots {id, label, hint}
     ANIM_THEMES                     the style layers {id, label, hint} (CSS: 71-anim-registry.css)
     ANIM_INTENSITIES                subtle < standard < playful
     animValidatePack(pack)          -> {ok, errors[]}  (manifest + every item)
     animRegisterPack(pack)          -> {ok, errors[]}; same id replaces
     animUnregisterPack(id)          wave 6: drop a non-core pack (the user's "mine" pack)
     animPacks() / animPack(id)
     animItems({slot, pack, look})   items, in registration order (look: only enabled packs)
     animItem(ref)                   'pack/item' -> item (with .ref and .pack)
     animLookNormalize(raw)          the user's look prefs {theme, fav[], block[], pin{}, packsOff[], ukRegional, opening}
     animSeasonOf('YYYY-MM-DD')      'spring'|'summer'|'autumn'|'winter' (northern hemisphere)
     animDailyPick(slot, day, look, ctx)  -> item | null: seeded, the same all day
         ctx: {level, region, theme, salt} plus what when() rules read
         (wave 2: birthday, tz, lat, lon, firstSnow, moment)
     animSpecialPick(slot, day, look, ctx) -> the item whose when(day, ctx) holds
         (a festival, the moon tonight, sunrise now), highest priority first; or null.
         Items with a when() rule only ever play through it.
     animDailyLook(day, look, ctx)   -> {slot: ref|null} for every slot
     animPickFor(slot, day, look, ctx, {tag, key, daily})  a moment's item (wave 4), or null
     animCountdownHeat(days) / animCountdownStage(heat) / animStreakGrow(days)   moment maths
     animItemHtml(ref|item, o)       trusted markup: o {size, live, hover, reduced, theme, label, cls, tod}
         item.full: a full-viewport scene (1600 x 900, sliced to fill: the opening, the
         county welcome, the gallery stage); o.tod dawn|day|dusk|night tints it; size 'fill'
         fills the parent box
     animLocked(item, look) / animThemeOpen(id, look)   wave 5: items and themes with
         `unlock: '<achievement id>'` stay out of every pick (and the theme list) until
         look.unlocked (filled by the page from state.achievements) holds that id
   No user text ever goes into the markup (labels are escaped when used).
   ============================================================ */
const ANIM_SLOTS = Object.freeze([
  { id: 'opening', label: 'Openings', hint: 'The first moment of a story or the day.' },
  { id: 'celebration', label: 'Celebrations', hint: 'A task or a moment done.' },
  { id: 'story-transition', label: 'Story transitions', hint: 'Between the beats of a story.' },
  { id: 'event-scene', label: 'Event scenes', hint: 'The little scene beside an event or a task.' },
  { id: 'symbol', label: 'Symbols', hint: 'Small animated marks and motifs.' },
  { id: 'sky', label: 'Weather and sky', hint: 'The sky behind the brief and the stories.' },
  { id: 'page-transition', label: 'Page transitions', hint: 'Moving between sections.' },
  { id: 'empty-loading', label: 'Empty and loading', hint: 'While something loads, or when a list is empty.' },
  { id: 'theme-switch', label: 'Light and dark switch', hint: 'The change between light and dark.' },
  /* moments across the app (v2.2 wave 4; the "moments" pack, 78-anim-moments.js plays them) */
  { id: 'task-done', label: 'Task completion', hint: 'The finishing touch when a task is done, one style per stream.', group: 'moments' },
  { id: 'streak', label: 'Streak flames', hint: 'A flame that grows across a week of done days.', group: 'moments' },
  { id: 'boss', label: 'Boss battles', hint: 'A long-overdue task, finally done.', group: 'moments' },
  { id: 'progress', label: 'Progress fills', hint: 'How the progress rings fill.', group: 'moments' },
  { id: 'meeting', label: 'Meeting countdown', hint: 'The pulse on an event about to start.', group: 'moments' },
  { id: 'money', label: 'Money moments', hint: 'Payday, a month under budget, the vendor tiles.', group: 'moments' },
  { id: 'home', label: 'Home ambience', hint: 'The living background and the widgets at rest.', group: 'moments' },
  { id: 'focus', label: 'Focus sessions', hint: 'A scene that grows through a focus block.', group: 'moments' },
  { id: 'people', label: 'People moments', hint: 'Birthdays, and a wave for someone not heard from in a while.', group: 'moments' },
  { id: 'countdown', label: 'Countdowns', hint: 'A countdown that warms up as its date nears.', group: 'moments' },
]);
const ANIM_SLOT_IDS = Object.freeze(ANIM_SLOTS.map(s => s.id));
const ANIM_THEMES = Object.freeze([
  { id: 'calm', label: 'Calm', hint: 'Soft and unhurried. The default.' },
  { id: 'playful', label: 'Playful', hint: 'Brighter, bouncier, a little quicker.' },
  { id: 'cinematic', label: 'Cinematic', hint: 'Deeper contrast, slower and grander.' },
  { id: 'retro', label: 'Retro pixel', hint: 'Stepped motion and crisp edges.' },
  { id: 'sketch', label: 'Hand-drawn', hint: 'Wobbly pencil lines on paper.' },
  { id: 'paper', label: 'Paper cut-out', hint: 'Layered card with soft shadows.' },
  { id: 'neon', label: 'Neon night', hint: 'Glowing lines on a dark sky.' },
  /* unlocked by an achievement (v2.2 wave 5, 71-achievements.js): offered once earned */
  { id: 'gold', label: 'Golden hour', hint: 'Warm gold light, slow and glowing.', unlock: 'streak-30' },
]);
/** Is a theme open to this look (no unlock needed, or its achievement is earned)? */
function animThemeOpen(id, look) { const t = ANIM_THEMES.find(x => x.id === id); return !!t && (!t.unlock || (!!look && Array.isArray(look.unlocked) && look.unlocked.includes(t.unlock))); }
/** An item still locked behind an achievement (the "rewards" pack). */
function animLocked(it, look) { return !!(it && it.unlock) && !(look && Array.isArray(look.unlocked) && look.unlocked.includes(it.unlock)); }
const ANIM_THEME_IDS = Object.freeze(ANIM_THEMES.map(t => t.id));
const ANIM_INTENSITIES = Object.freeze(['subtle', 'standard', 'playful']);
const ANIM_OPENING_MODES = Object.freeze(['every', 'daily', 'off']);   // Settings > Animations > Opening
const ANIM_MOODS = Object.freeze(['calm', 'cheerful', 'proud', 'cosy', 'focused', 'dreamy', 'energetic', 'neutral']);
const ANIM_SEASONS = Object.freeze(['spring', 'summer', 'autumn', 'winter']);
const ANIM_SWATCHES = Object.freeze(['blue', 'indigo', 'violet', 'pink', 'red', 'orange', 'amber', 'green', 'teal', 'slate']);
/* Budgets the quality gate enforces (tests/anim-packs.test.mjs). */
const ANIM_ITEM_MAX_BYTES = 14000;     // one rendered item (either variant)
const ANIM_FULL_ITEM_MAX_BYTES = 32000;   // a full-viewport scene (item.full; 1600 x 900, sliced to fill any screen)
const ANIM_PACK_MAX_BYTES = 400000;    // every item of a pack, rendered, plus its css (plus 2 x the full budget per full scene)
/** The viewBox of a full-viewport scene: drawn at 16:9, preserveAspectRatio slice fills any screen edge to edge. */
const ANIM_FULL_W = 1600, ANIM_FULL_H = 900;
const ANIM_PACK_CSS_MAX_BYTES = 24000;

const _ANIM_ID_RE = /^[a-z0-9][a-z0-9-]{0,47}$/;
const _animPacks = new Map();     // id -> frozen pack {id, name, ..., items:[item]}
const _animRefs = new Map();      // 'pack/item' -> item

function _animList(v) { return v === 'any' || v == null ? 'any' : (Array.isArray(v) ? v : [v]); }
/** Check a pack manifest and its items. Nothing is registered. */
function animValidatePack(p) {
  const errors = [];
  if (!p || typeof p !== 'object') return { ok: false, errors: ['the pack is not an object'] };
  if (!_ANIM_ID_RE.test(String(p.id || ''))) errors.push('pack id: lower-case letters, digits and dashes');
  if (!p.name || typeof p.name !== 'string') errors.push('pack name missing');
  if (p.css != null && typeof p.css !== 'string') errors.push('pack css must be a string');
  if (typeof p.css === 'string' && p.css.length > ANIM_PACK_CSS_MAX_BYTES) errors.push(`pack css over ${ANIM_PACK_CSS_MAX_BYTES} bytes`);
  if (typeof p.css === 'string' && /@import|url\(\s*['"]?(https?:|\/\/)/i.test(p.css)) errors.push('pack css may not fetch anything');
  if (!Array.isArray(p.items) || !p.items.length) { errors.push('pack has no items'); return { ok: false, errors }; }
  const seen = new Set();
  for (const it of p.items) {
    const w = `item ${it && it.id ? it.id : '?'}: `;
    if (!it || typeof it !== 'object') { errors.push('an item is not an object'); continue; }
    if (!_ANIM_ID_RE.test(String(it.id || ''))) errors.push(w + 'id: lower-case letters, digits and dashes');
    if (seen.has(it.id)) errors.push(w + 'duplicate id'); seen.add(it.id);
    if (!ANIM_SLOT_IDS.includes(it.slot)) errors.push(w + `slot must be one of ${ANIM_SLOT_IDS.join(', ')}`);
    if (!it.label || typeof it.label !== 'string') errors.push(w + 'label missing');
    if (!Array.isArray(it.tags)) errors.push(w + 'tags must be an array');
    if (!ANIM_MOODS.includes(it.mood)) errors.push(w + `mood must be one of ${ANIM_MOODS.join(', ')}`);
    if (!ANIM_INTENSITIES.includes(it.intensity)) errors.push(w + 'intensity must be subtle, standard or playful');
    const th = _animList(it.theme), se = _animList(it.season), re = _animList(it.region);
    if (th !== 'any' && !th.every(t => ANIM_THEME_IDS.includes(t))) errors.push(w + 'theme must be "any" or theme ids');
    if (se !== 'any' && !se.every(s => ANIM_SEASONS.includes(s))) errors.push(w + 'season must be "any" or seasons');
    if (re !== 'any' && !re.every(r => /^[A-Z]{2}(-[A-Z0-9]{1,3})?$/.test(r))) errors.push(w + 'region must be "any" or ISO codes like GB, GB-SCT');
    if (typeof it.svg !== 'function') errors.push(w + 'svg() missing');
    if (typeof it.reduced !== 'function' && it.reduced !== 'static') errors.push(w + 'a reduced-motion variant is required: reduced() or "static"');
    if (it.colour != null && !ANIM_SWATCHES.includes(it.colour)) errors.push(w + 'colour must be a swatch name');
    if (it.when != null && typeof it.when !== 'function') errors.push(w + 'when must be a function (day, ctx) -> boolean');
    if (it.priority != null && !(typeof it.priority === 'number' && isFinite(it.priority))) errors.push(w + 'priority must be a number');
    if (it.fx != null && !(typeof it.fx === 'string' && /^[a-z][a-z0-9-]{0,23}$/.test(it.fx))) errors.push(w + 'fx must be a short lower-case name');
    if (it.unlock != null && !_ANIM_ID_RE.test(String(it.unlock))) errors.push(w + 'unlock must be an achievement id');
    if (it.full != null && typeof it.full !== 'boolean') errors.push(w + 'full must be true or false (a full-viewport scene)');
    if (it.slot === 'theme-switch' && !(it.vt && /^(circle|wipe|fade)$/.test(it.vt.kind))) errors.push(w + 'theme-switch items need vt: {kind: circle|wipe|fade}');
  }
  return { ok: !errors.length, errors };
}
function animRegisterPack(p) {
  const v = animValidatePack(p);
  if (!v.ok) return v;
  const old = _animPacks.get(p.id);
  if (old) for (const it of old.items) _animRefs.delete(it.ref);
  const items = p.items.map(it => Object.freeze(Object.assign({}, it, {
    pack: p.id, ref: p.id + '/' + it.id, tags: it.tags.slice(), theme: _animList(it.theme), season: _animList(it.season), region: _animList(it.region),
    colour: it.colour || 'blue',
  })));
  const pack = Object.freeze({ id: p.id, name: p.name, description: p.description || '', version: p.version || '1', core: !!p.core, css: p.css || '', items: Object.freeze(items) });
  _animPacks.set(p.id, pack);
  for (const it of items) _animRefs.set(it.ref, it);
  return v;
}
/** Remove a pack (the user's own "mine" pack when its last item is deleted). The core pack stays. */
function animUnregisterPack(id) {
  const old = _animPacks.get(id);
  if (!old || old.core) return false;
  for (const it of old.items) _animRefs.delete(it.ref);
  _animPacks.delete(id);
  return true;
}
function animPacks() { return [..._animPacks.values()]; }
function animPack(id) { return _animPacks.get(id) || null; }
function animItem(ref) { return _animRefs.get(ref) || null; }

/* ---------- the user's look ---------- */
function animLookNormalize(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const refs = (a) => (Array.isArray(a) ? [...new Set(a.filter(x => typeof x === 'string' && x.includes('/')))].slice(0, 500) : []);
  const pin = {};
  if (r.pin && typeof r.pin === 'object') for (const s of ANIM_SLOT_IDS) if (typeof r.pin[s] === 'string' && r.pin[s].includes('/')) pin[s] = r.pin[s];
  // The achievements earned (the page fills this from state.achievements; never saved in the look).
  const unlocked = Array.isArray(r.unlocked) ? [...new Set(r.unlocked.filter(x => typeof x === 'string' && _ANIM_ID_RE.test(x)))].slice(0, 100) : [];
  return {
    theme: ANIM_THEME_IDS.includes(r.theme) && animThemeOpen(r.theme, { unlocked }) ? r.theme : 'calm',
    unlocked,
    themeDaily: !!r.themeDaily,
    fav: refs(r.fav), block: refs(r.block), pin,
    packsOff: Array.isArray(r.packsOff) ? r.packsOff.filter(x => typeof x === 'string' && x !== 'core').slice(0, 100) : [],
    ukRegional: !!r.ukRegional,   // the UK regional packs (v2.2 wave 3), opt-in
    opening: ANIM_OPENING_MODES.includes(r.opening) ? r.opening : 'daily',   // the opening sequence: every load, the first load of the day, or off
  };
}
function _animPackOn(id, look) { const p = _animPacks.get(id); return !!p && (p.core || !look || !look.packsOff.includes(id)); }
function animItems(o) {
  o = o || {};
  const out = [], look = o.look ? animLookNormalize(o.look) : null;
  for (const p of _animPacks.values()) {
    if (o.pack && p.id !== o.pack) continue;
    if (look && !_animPackOn(p.id, look)) continue;
    for (const it of p.items) if ((!o.slot || it.slot === o.slot) && !(look && animLocked(it, look))) out.push(it);
  }
  return out;
}

/* ---------- the daily look ---------- */
function _animHash(s) { s = String(s); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function animSeasonOf(day) {
  const m = +String(day || '').slice(5, 7);
  return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
}
function _animRank(lv) { const i = ANIM_INTENSITIES.indexOf(lv); return i < 0 ? 1 : i; }
/**
 * Today's variant for a slot. A pin wins (unless blocked or its pack is off). Otherwise the
 * pool is the enabled, unblocked items that fit the season, region and intensity level
 * (falling back to all of them if that empties it); favourites count three times, items made
 * for the current theme twice; the day and slot seed the choice, so it never changes within a day.
 */
function _animWhen(it, day, ctx) { try { return !!it.when(day, ctx || {}); } catch (e) { return false; } }
function _animFitsLevel(it, lv) { return !ANIM_INTENSITIES.includes(lv) || _animRank(it.intensity) <= _animRank(lv); }
/**
 * The special item for a slot today, or null: items with a when(day, ctx) rule (a festival,
 * the birthday, the moon tonight, sunrise now) whose rule holds; the highest priority wins,
 * then the day seeds the choice. Blocks, packs switched off and the intensity level apply.
 */
function animSpecialPick(slot, day, look, ctx) {
  look = animLookNormalize(look); ctx = ctx || {};
  const hits = animItems({ slot, look }).filter(it => typeof it.when === 'function' && !look.block.includes(it.ref) && _animFitsLevel(it, ctx.level) && _animWhen(it, day, ctx));
  if (!hits.length) return null;
  const top = Math.max(...hits.map(it => it.priority || 1));
  let pool = hits.filter(it => (it.priority || 1) === top);
  // Town scenes are a local rotation within the already matched county.
  // A national event still has higher priority; unavailable local art falls
  // back to the whole county, including when local scenes are blocked.
  if (top < 2 && ctx.county && ctx.ukTown) {
    const town = String(ctx.ukTown).toLowerCase();
    const local = pool.filter(it => it.county === ctx.county && typeof it.ukTown === 'string' && it.ukTown.toLowerCase() === town);
    if (local.length) pool = local;
  }
  const favs = pool.filter(it => look.fav.includes(it.ref));
  const bag = favs.length ? favs : pool;
  return bag[_animHash(`${day}|${slot}|special|${ctx.salt || ''}`) % bag.length];
}
function animDailyPick(slot, day, look, ctx) {
  look = animLookNormalize(look); ctx = ctx || {};
  const all = animItems({ slot, look }).filter(it => !look.block.includes(it.ref));
  if (!all.length) return null;
  const pinned = look.pin[slot] && all.find(it => it.ref === look.pin[slot]);
  if (pinned) return pinned;
  const special = animSpecialPick(slot, day, look, ctx);
  if (special) return special;
  const plain = all.filter(it => typeof it.when !== 'function');
  if (!plain.length) return null;
  const season = animSeasonOf(day);
  const lv = ctx.level;
  let pool = plain.filter(it => (it.season === 'any' || it.season.includes(season))
    && (it.region === 'any' || (ctx.region && it.region.some(r => r === ctx.region || r.split('-')[0] === ctx.region || ctx.region.split('-')[0] === r)))
    && _animFitsLevel(it, lv));
  if (!pool.length) pool = plain.filter(it => it.season === 'any' && it.region === 'any');
  if (!pool.length) pool = plain;
  const theme = ctx.theme || look.theme;
  const bag = [];
  for (const it of pool) {
    const w = 1 + (look.fav.includes(it.ref) ? 2 : 0) + (it.theme !== 'any' && it.theme.includes(theme) ? 1 : 0);
    for (let i = 0; i < w; i++) bag.push(it);
  }
  return bag[_animHash(`${day}|${slot}|${ctx.salt || ''}`) % bag.length];
}
function animDailyLook(day, look, ctx) {
  const out = {};
  for (const s of ANIM_SLOT_IDS) { const it = animDailyPick(s, day, look, ctx); out[s] = it ? it.ref : null; }
  return out;
}
/**
 * A moment's item (v2.2 wave 4): the enabled, unblocked items of a slot (optionally with
 * a tag: 'payday', 'living' ...), never the when() specials. A pin wins when it fits the
 * tag; the intensity level must fit (nothing plays rather than something too loud);
 * favourites count three times, items drawn for the theme twice. o.key seeds the choice
 * (a stream id: one completion style per stream); o.daily false keeps it the same every day.
 */
function animPickFor(slot, day, look, ctx, o) {
  look = animLookNormalize(look); ctx = ctx || {}; o = o || {};
  const pool = animItems({ slot, look }).filter(it => !look.block.includes(it.ref) && typeof it.when !== 'function' && (!o.tag || it.tags.includes(o.tag)));
  const pinned = look.pin[slot] && pool.find(it => it.ref === look.pin[slot]);
  if (pinned) return pinned;
  const fit = pool.filter(it => _animFitsLevel(it, ctx.level));
  if (!fit.length) return null;
  const theme = ctx.theme || look.theme, bag = [];
  for (const it of fit) {
    const w = 1 + (look.fav.includes(it.ref) ? 2 : 0) + (it.theme !== 'any' && it.theme.includes(theme) ? 1 : 0);
    for (let i = 0; i < w; i++) bag.push(it);
  }
  return bag[_animHash(`${o.daily === false ? '' : day}|${slot}|${o.tag || ''}|${o.key || ''}`) % bag.length];
}
/** Countdown heat 0..1 from the days left: cool a month out, warm in the last week, full on the day. */
function animCountdownHeat(days) {
  const d = Number(days);
  if (!isFinite(d) || d < 0) return 0;
  if (d === 0) return 1;
  return Math.round(Math.max(0, Math.min(0.95, 1 - Math.log2(d + 1) / 5)) * 100) / 100;
}
/** The countdown's stage from its heat: far, near, close, imminent, today. */
function animCountdownStage(heat) { return heat >= 1 ? 'today' : heat >= 0.6 ? 'imminent' : heat >= 0.35 ? 'close' : heat > 0 ? 'near' : 'far'; }
/** Streak flame growth 0.2..1 over a week of days. */
function animStreakGrow(days) { const d = Math.max(0, Math.floor(Number(days) || 0)); return d <= 0 ? 0 : Math.round(Math.min(1, 0.2 + 0.8 * (Math.min(d, 7) - 1) / 6) * 100) / 100; }
/** Days overdue that make finishing a task a "boss battle". */
const ANIM_BOSS_DAYS = 7;

/** The theme for a day: the chosen one, or (themeDaily) a seeded rotation through all of them. */
function animThemeFor(day, look) {
  look = animLookNormalize(look);
  if (!look.themeDaily) return look.theme;
  const open = ANIM_THEME_IDS.filter(id => animThemeOpen(id, look));
  return open[_animHash(`${day}|theme`) % open.length];
}

/* ---------- markup ---------- */
function _animAttr(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
/** An item as a scene (the anim-library vocabulary: 64x64, fills k c s w m, strokes lk lc lm, motion x-*). */
function animItemHtml(x, o) {
  o = o || {};
  const it = typeof x === 'string' ? animItem(x) : x;
  if (!it) return '';
  const reduced = !!o.reduced;
  const body = reduced ? (it.reduced === 'static' ? it.svg(o) : it.reduced(o)) : it.svg(o);
  const cls = ['anim-scene', 'ap-art', 'c-' + it.colour, 'sz-' + (o.size || 'md'), 'ap-' + it.slot];
  if (reduced) cls.push('ap-still'); else if (o.live) cls.push('is-live');
  if (o.hover && !reduced) cls.push('anim-hover-only');
  if (o.cls) cls.push(o.cls);
  if (it.full) cls.push('ap-full');
  if (o.tod && /^(dawn|day|dusk|night)$/.test(o.tod)) cls.push('tod-' + o.tod);
  const theme = o.theme && ANIM_THEME_IDS.includes(o.theme) ? ` data-anim-theme="${o.theme}"` : '';
  const aria = o.label ? ` role="img" aria-label="${_animAttr(o.label)}"` : ' aria-hidden="true"';
  // A full scene keeps its 16:9 drawing and fills its box (slice): edge to edge on any screen, the middle in a square tile.
  const vb = it.full ? `viewBox="0 0 ${ANIM_FULL_W} ${ANIM_FULL_H}" preserveAspectRatio="xMidYMid slice"` : 'viewBox="0 0 64 64"';
  return `<span class="${cls.join(' ')}" data-anim="${_animAttr(it.ref)}"${theme}${aria}><svg class="as ap-svg as-${_animAttr(it.id)}" ${vb} aria-hidden="true" focusable="false">${body}</svg></span>`;
}
