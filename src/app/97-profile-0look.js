/* ============================================================
   PROFILE, the look of your card (2.18, agent 'you'). PURE: tables and
   functions only, nothing drawn at load, no DOM, no state, so Node loads it
   with the avatar kit (lib/profile-avatar.mjs) and both sides share one copy.
   User request, 24 Oct 2026: "way more customisable options for the profile,
   like a profile banner, banner styles, make it a bit bigger, maybe show your
   name etc."

   A LOOK IS DATA, NOT MARKUP. state.profile.look is a flat object of
   allow-listed ids, two colours (a palette id or '#rrggbb'), a scene ref
   ('pack/item' of the app's own scenes) and one short line of plain text:
     {banner, bannerCol, bannerCol2, scene, np: {font, weight, col, fx}, title,
      favs: [emoji], cur: {k, t}, tint}
   profileLookNormalize() keeps only those; profileBannerSvg() draws a banner
   from the tables (every colour is a table entry or a re-checked hex), so a
   friend can never put markup, a URL or a picture on your page.

     PF_LOOK_MAX                     {currently: 60, favs: 6}
     PF_BANNER_GROUPS / PF_BANNERS   the banners: [{id, label, group, uses: 'theme'|'cols'|'fixed'|'scene', b?: its own second colour,
                                     anim?, level?, ach?, season?}]
     PF_NP_FONTS / PF_NP_WEIGHTS / PF_NP_COLS / PF_NP_FX   the nameplate: font (system stacks only, nothing
                                     is downloaded), weight, colour (ink, your colour, the palette, gradients), effect
     PF_TITLES                       titles you can pick once unlocked [{id, label, icon, ach?, level?, garden?, friends?}]
     PF_FAV_EMOJI                    the favourite-emoji allow-list, in groups [[label, [emoji]]]
     PF_CURRENTLY                    the 'currently' kinds [[id, label, icon, emoji]]
     PF_TINTS                        how much your colour tints the card [[id, label]]
     PF_LOOK_DEFAULT / profileLookDefault()   the starting look
     profileLookNormalize(l)         a clean look (unknown ids -> the default, text through profileText)
     profileLookWire(l, theme)       what friends get (colours as '#rrggbb'; only what differs from the default) | null
     profileLookLockOf(kind, id, ctx)   '' or why it is locked; kind: banner | font | col | fx | title
                                     ctx: profileUnlockCtx() plus {garden: things ever finished, friends: count,
                                     achFor(kind, item): the achievement that unlocks it in the achievements' own
                                     rewards (ach-core 'title:' / 'banner:' / 'plate:'), or ''}
     profileLookRewardRef(kind, ref)  an achievement reward ('title' 'Timekeeper', 'banner' 'sunset', 'plate' 'goldfoil';
                                     docs/dev/ACHIEVEMENTS_500.md) -> {kind: title|banner|font|col|fx, id, label} | null
     profileBannerCols(l, themeHex)  {a, b}: the banner's two colours as hex
     profileBannerSvg(l, o)          the banner as an <svg> string. o {uid, theme: hex, motion, density: 'subtle'|'full'}
                                     ('scene' draws your colour: the page lays the scene itself over it)
     profileNameplateCss(np, themeHex)  {font, weight, colour, gradient, fx}: values from the tables for the page's nameplate
   ============================================================ */
const PF_LOOK_MAX = Object.freeze({ currently: 60, favs: 6 });
const _PFL_HEX = /^#[0-9a-f]{6}$/i;
const _PFL_REF = /^[A-Za-z0-9_-]{1,64}\/[A-Za-z0-9_-]{1,64}$/;
function _pflRgb(c) { const n = parseInt(String(c).slice(1), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function _pflMix(a, b, t) {
  const A = _pflRgb(_PFL_HEX.test(a) ? a : '#888888'), B = _pflRgb(_PFL_HEX.test(b) ? b : '#888888');
  return '#' + A.map((v, i) => Math.max(0, Math.min(255, Math.round(v + (B[i] - v) * t))).toString(16).padStart(2, '0')).join('');
}
function _pflLum(c) { const [r, g, b] = _pflRgb(c).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
function _pflDist(x, y) { const A = _pflRgb(x), B = _pflRgb(y); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); }
const _pflN = (v) => { const r = Math.round(v * 10) / 10; return String(r === 0 ? 0 : r); };
function _pflRand(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function _pflHash(s) { s = String(s); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const _pflO = (list) => Object.freeze(list.map(([id, label, x]) => Object.freeze(Object.assign({ id, label }, x || {}))));
function _pflSwatchHex(v) {
  if (typeof v !== 'string' || !v) return '';
  if (_PFL_HEX.test(v)) return v.toLowerCase();
  const sw = typeof PF_SWATCHES !== 'undefined' && PF_SWATCHES && Object.prototype.hasOwnProperty.call(PF_SWATCHES, v) ? PF_SWATCHES[v] : null;
  return sw ? sw.hex : '';
}
function _pflColourId(v) { return typeof v === 'string' && (_PFL_HEX.test(v) || (typeof PF_SWATCHES !== 'undefined' && Object.prototype.hasOwnProperty.call(PF_SWATCHES, v))) ? (_PFL_HEX.test(v) ? v.toLowerCase() : v) : ''; }

/* ---------- banners ---------- */
const PF_BANNER_GROUPS = Object.freeze([['gradient', 'Gradients', 'palette'], ['pattern', 'Patterns', 'layout-grid'], ['season', 'Seasonal', 'leaf'], ['animated', 'Animated', 'sparkles'], ['scene', 'Scenes', 'image']]);
const PF_BANNERS = _pflO([
  ['theme', 'Your colour', { group: 'gradient', uses: 'theme' }],
  ['dawn', 'Peach dawn', { group: 'gradient', uses: 'fixed' }],
  ['ocean', 'Deep ocean', { group: 'gradient', uses: 'fixed' }],
  ['meadow', 'Meadow haze', { group: 'gradient', uses: 'fixed' }],
  ['sunset', 'Retro sunset', { group: 'gradient', uses: 'fixed' }],
  ['berry', 'Berry smoothie', { group: 'gradient', uses: 'fixed' }],
  ['nordic', 'Nordic frost', { group: 'gradient', uses: 'fixed' }],
  ['citrus', 'Citrus', { group: 'gradient', uses: 'fixed' }],
  ['twilight', 'Twilight', { group: 'gradient', uses: 'fixed' }],
  ['lagoon', 'Lagoon', { group: 'gradient', uses: 'fixed' }],
  ['ember', 'Embers', { group: 'gradient', uses: 'fixed', anim: true, level: 8 }],
  ['holo', 'Holographic', { group: 'gradient', uses: 'fixed', level: 20 }],
  ['gold', 'Gold leaf', { group: 'gradient', uses: 'fixed', ach: 'streak-30' }],
  ['dots', 'Polka dots', { group: 'pattern', uses: 'cols', b: '#fff6e0' }],
  ['waves', 'Waves', { group: 'pattern', uses: 'cols' }],
  ['stripes', 'Candy stripes', { group: 'pattern', uses: 'cols', b: '#ffffff' }],
  ['clouds', 'Clouds', { group: 'pattern', uses: 'cols', b: '#ffd75e' }],
  ['notebook', 'Notebook', { group: 'pattern', uses: 'cols', b: '#7aa7e0' }],
  ['terrazzo', 'Terrazzo', { group: 'pattern', uses: 'cols' }],
  ['chevron', 'Zigzag', { group: 'pattern', uses: 'cols', b: '#ffffff' }],
  ['plaid', 'Tartan', { group: 'pattern', uses: 'cols', b: '#d64545', level: 3 }],
  ['confetti', 'Confetti', { group: 'pattern', uses: 'cols', level: 5 }],
  ['stars', 'Starry night', { group: 'pattern', uses: 'cols', b: '#ffe08a', level: 7 }],
  ['hex', 'Honeycomb', { group: 'pattern', uses: 'cols', b: '#f2c14e', level: 10 }],
  ['mountains', 'Mountains', { group: 'pattern', uses: 'cols', b: '#ffd75e', level: 12 }],
  ['memphis', 'Memphis', { group: 'pattern', uses: 'cols', b: '#f08fb3', level: 14 }],
  ['topo', 'Topography', { group: 'pattern', uses: 'cols', ach: 'places-5' }],
  ['blossom', 'Cherry blossom', { group: 'season', uses: 'fixed', season: 'spring' }],
  ['seaside', 'Seaside', { group: 'season', uses: 'fixed', season: 'summer' }],
  ['pumpkins', 'Pumpkin patch', { group: 'season', uses: 'fixed', season: 'halloween' }],
  ['village', 'Snowy village', { group: 'season', uses: 'fixed', season: 'december' }],
  ['bunting', 'Party bunting', { group: 'season', uses: 'fixed', season: 'birthday' }],
  ['leaves', 'Falling leaves', { group: 'animated', uses: 'fixed', anim: true }],
  ['bubbles', 'Bubbles', { group: 'animated', uses: 'fixed', anim: true }],
  ['snowfall', 'Snowfall', { group: 'animated', uses: 'fixed', anim: true, level: 6 }],
  ['fireflies', 'Fireflies', { group: 'animated', uses: 'fixed', anim: true, ach: 'night-owl' }],
  ['aurora', 'Aurora', { group: 'animated', uses: 'fixed', anim: true, level: 15 }],
  ['shooting', 'Shooting stars', { group: 'animated', uses: 'fixed', anim: true, level: 25 }],
  ['scene', 'One of your scenes', { group: 'scene', uses: 'scene' }],
]);
const _PFL_BANNER_BY = new Map(PF_BANNERS.map(b => [b.id, b]));
function pfBanner(id) { return _PFL_BANNER_BY.get(id) || null; }

/* ---------- the nameplate ---------- */
// System font stacks only (OpenDash is offline and downloads nothing): each names what Windows, macOS and
// Linux usually have, so every choice looks different wherever it is shown.
const PF_NP_FONTS = _pflO([
  ['sans', 'Clean', { stack: 'var(--font-sans)' }],
  ['rounded', 'Friendly', { stack: '"Nunito", ui-rounded, "SF Pro Rounded", "Varela Round", "Trebuchet MS", sans-serif' }],
  ['serif', 'Classic', { stack: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif' }],
  ['elegant', 'Elegant', { stack: 'Didot, "Bodoni 72", "Bodoni MT", Constantia, "Times New Roman", serif' }],
  ['slab', 'Slab', { stack: 'Rockwell, "Roboto Slab", "Sitka Small", Cambria, Georgia, serif' }],
  ['mono', 'Code', { stack: 'var(--font-mono)' }],
  ['typewriter', 'Typewriter', { stack: '"American Typewriter", "Courier New", Courier, monospace' }],
  ['condensed', 'Condensed', { stack: '"Bahnschrift SemiCondensed", Bahnschrift, "Arial Narrow", "Roboto Condensed", "Helvetica Neue", sans-serif', stretch: 'condensed' }],
  ['hand', 'Handwritten', { stack: '"Segoe Print", "Bradley Hand", "Chalkboard SE", "Comic Neue", cursive' }],
  ['marker', 'Marker', { stack: '"Ink Free", "Marker Felt", Kalam, "Segoe Print", cursive' }],
  ['doodle', 'Doodle', { stack: '"MV Boli", Chalkduster, "Comic Sans MS", "Comic Neue", cursive' }],
  ['poster', 'Poster', { stack: 'Impact, Haettenschweiler, "Anton", "Arial Black", sans-serif', level: 6 }],
  ['script', 'Script', { stack: '"Segoe Script", "Snell Roundhand", "Brush Script MT", "Lucida Handwriting", cursive', level: 10 }],
  ['storybook', 'Storybook', { stack: 'Gabriola, "Apple Chancery", "Palatino Linotype", serif', level: 20, size: 1.18 }],
]);
const PF_NP_WEIGHTS = _pflO([['regular', 'Regular', { w: 400 }], ['medium', 'Medium', { w: 550 }], ['bold', 'Bold', { w: 700 }], ['heavy', 'Heavy', { w: 850 }]]);
const PF_NP_COLS = _pflO([
  ['ink', 'Ink'], ['theme', 'Your colour'],
  ...['indigo', 'blue', 'teal', 'green', 'amber', 'orange', 'red', 'pink', 'violet', 'plum', 'slate'].map(id => [id, id.charAt(0).toUpperCase() + id.slice(1), { swatch: id }]),
  ['sunset', 'Sunset', { grad: ['#ff9a3c', '#ff5f6d', '#c2459a'], level: 9 }],
  ['sea', 'Sea glass', { grad: ['#1fa2a6', '#3b82f6', '#7c5cff'], level: 9 }],
  ['aurora', 'Aurora', { grad: ['#22c58b', '#14b8a6', '#8b5cf6'], level: 15 }],
  ['rainbow', 'Rainbow', { grad: ['#e5534b', '#f2a541', '#e2c23a', '#4caf6a', '#3b82f6', '#8b5cf6'], level: 22 }],
  ['goldfoil', 'Gold foil', { grad: ['#9a6b16', '#e8c158', '#fff1b8', '#c8962a'], ach: 'streak-30' }],
]);
const PF_NP_FX = _pflO([
  ['none', 'Plain'], ['shadow', 'Soft shadow'], ['caps', 'Spaced capitals'], ['underline', 'Wavy underline'], ['highlight', 'Highlighter'],
  ['outline', 'Outline', { level: 3 }], ['sticker', 'Sticker', { level: 5 }], ['glow', 'Glow', { level: 8 }], ['retro', 'Retro 3D', { level: 18 }],
  ['shimmer', 'Shimmer', { level: 25, anim: true }],
]);

/* ---------- titles ---------- */
const PF_TITLES = _pflO([
  ['friendly', 'Friendly face', { icon: 'circle-user' }], ['dreamer', 'Daydreamer', { icon: 'cloud' }], ['starter', 'Just getting started', { icon: 'sprout' }],
  ['doer', 'Doer', { icon: 'circle-check', ach: 'first-done' }],
  ['early-bird', 'Early bird', { icon: 'sunrise', ach: 'early-bird' }],
  ['night-owl', 'Night owl', { icon: 'moon', ach: 'night-owl' }],
  ['weekend', 'Weekend warrior', { icon: 'sun', ach: 'weekend-25' }],
  ['all-rounder', 'All-rounder', { icon: 'compass', ach: 'all-rounder' }],
  ['comeback', 'Comeback kid', { icon: 'sprout', ach: 'comeback' }],
  ['streaker', 'Streak keeper', { icon: 'flame', ach: 'streak-7' }],
  ['unstoppable', 'Unstoppable', { icon: 'flame', ach: 'streak-30' }],
  ['centurion', 'Centurion', { icon: 'sun', ach: 'streak-100' }],
  ['in-the-zone', 'In the zone', { icon: 'timer', ach: 'focus-10' }],
  ['deep', 'Deep thinker', { icon: 'brain', ach: 'deep-work' }],
  ['scholar', 'Scholar', { icon: 'graduation-cap', ach: 'focus-hours-100' }],
  ['timekeeper', 'Timekeeper', { icon: 'target', ach: 'on-estimate' }],
  ['boss', 'Boss hunter', { icon: 'crown', ach: 'boss-10' }],
  ['giant', 'Giant slayer', { icon: 'mountain', ach: 'boss-big' }],
  ['adventurer', 'Adventurer', { icon: 'compass', ach: 'quest-25' }],
  ['perfectionist', 'Perfectionist', { icon: 'gem', ach: 'quest-perfect-4' }],
  ['explorer', 'Explorer', { icon: 'map-pin', ach: 'places-25' }],
  ['globetrotter', 'Globetrotter', { icon: 'globe', ach: 'countries-3' }],
  ['team', 'Team player', { icon: 'users', ach: 'people-10' }],
  ['habit', 'Creature of habit', { icon: 'repeat', ach: 'habit-30' }],
  ['inbox', 'Inbox master', { icon: 'inbox', ach: 'inbox-10' }],
  ['reflective', 'Reflective', { icon: 'calendar-range', ach: 'review-12' }],
  ['diarist', 'Diarist', { icon: 'notebook-pen', ach: 'notes-7' }],
  ['saver', 'Quiet spender', { icon: 'piggy-bank', ach: 'no-spend-30' }],
  ['cheer', 'Cheerleader', { icon: 'heart', ach: 'cheer-10' }],
  ['duo', 'Dynamic duo', { icon: 'flame', ach: 'duo-7' }],
  ['gifter', 'Gift giver', { icon: 'gift', ach: 'gift-first' }],
  ['stickers', 'Sticker collector', { icon: 'book-open', ach: 'stickers-10' }],
  ['social', 'Social butterfly', { icon: 'users', friends: 3 }],
  ['angler', 'Angler', { icon: 'fish', ribbon: 'angler' }],
  ['master-angler', 'Master angler', { icon: 'crown', ribbon: 'master-angler' }],
  ['bug-whisperer', 'Bug whisperer', { icon: 'bug', ribbon: 'bug-catcher' }],
  ['entomologist', 'Entomologist', { icon: 'microscope', ribbon: 'entomologist' }],
  ['trader', 'Market trader', { icon: 'handshake', ribbon: 'market-trader' }],
  ['garden', 'Garden keeper', { icon: 'sprout', garden: 50 }],
  ['green', 'Green fingers', { icon: 'flower-2', garden: 400 }],
  ['rising', 'Rising star', { icon: 'star', level: 10 }],
  ['seasoned', 'Seasoned', { icon: 'medal', level: 20 }],
  ['expert', 'Expert', { icon: 'medal', level: 30 }],
  ['legend', 'Legend', { icon: 'crown', level: 50 }],
  ['old-hand', 'Old hand', { icon: 'party-popper', ach: 'year-one' }],
]);
const _PFL_TITLE_BY = new Map(PF_TITLES.map(t => [t.id, t]));
function pfTitle(id) { return _PFL_TITLE_BY.get(id) || null; }

/* ---------- favourite emoji, 'currently', the card tint ---------- */
const PF_FAV_EMOJI = Object.freeze([
  ['Nature', ['🌱', '🌿', '🍀', '🌵', '🌻', '🌷', '🌸', '🌼', '🍁', '🍄', '🌊', '⛰️', '🌙', '⭐', '🌈', '☀️', '❄️', '🔥']],
  ['Animals', ['🐱', '🐶', '🐰', '🦊', '🐻', '🐼', '🐨', '🐸', '🐢', '🦉', '🐝', '🦋', '🐞', '🐙', '🐳', '🦄', '🐧', '🦔']],
  ['Food and drink', ['☕', '🍵', '🧋', '🍕', '🍜', '🍣', '🌮', '🥐', '🍩', '🍪', '🍓', '🍋', '🥑', '🍉', '🧁', '🍫', '🥨', '🍿']],
  ['Things you love', ['📚', '🎧', '🎮', '🎨', '🎵', '🎸', '🎹', '📷', '🎬', '🧶', '🪴', '🧩', '♟️', '🛹', '🚲', '🏃', '🧘', '⚽']],
  ['Places and travel', ['🏔️', '🏕️', '🏖️', '🏙️', '🗺️', '✈️', '🚆', '⛵', '🚀', '🏠', '🎡', '🌍']],
  ['Feelings and symbols', ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '✨', '💫', '🎉', '🙌', '😊', '😎', '🤓', '🥳', '😌', '💪', '🫶']],
].map(([label, list]) => Object.freeze([label, Object.freeze(list)])));
const _PFL_FAV_SET = new Map(PF_FAV_EMOJI.flatMap(([, list]) => list).map(e => [e.replace(/️/g, ''), e]));
function profileFavOk(e) { return typeof e === 'string' && e.length <= 12 && _PFL_FAV_SET.has(e.replace(/️/g, '')); }
function _pflFav(e) { return profileFavOk(e) ? _PFL_FAV_SET.get(e.replace(/️/g, '')) : ''; }
const PF_CURRENTLY = Object.freeze([
  ['listening', 'Listening to', 'headphones', '🎧'], ['reading', 'Reading', 'book-open', '📖'], ['learning', 'Learning', 'graduation-cap', '🎓'],
  ['watching', 'Watching', 'film', '📺'], ['playing', 'Playing', 'gamepad-2', '🎮'], ['making', 'Making', 'hammer', '🛠️'],
  ['cooking', 'Cooking', 'utensils', '🍳'], ['training', 'Training for', 'dumbbell', '🏃'], ['planning', 'Planning', 'map', '🗺️'], ['growing', 'Growing', 'sprout', '🌱'],
].map(Object.freeze));
const PF_TINTS = Object.freeze([['off', 'Plain'], ['soft', 'Soft'], ['rich', 'Rich'], ['night', 'Night']].map(Object.freeze));

/* ---------- the look: defaults, cleaning, the wire ---------- */
const PF_LOOK_DEFAULT = Object.freeze({ banner: 'theme', bannerCol: '', bannerCol2: '', scene: '', np: Object.freeze({ font: 'sans', weight: 'bold', col: 'ink', fx: 'none' }),
  title: '', favs: Object.freeze([]), cur: Object.freeze({ k: '', t: '' }), tint: 'soft' });
function profileLookDefault() { return { banner: 'theme', bannerCol: '', bannerCol2: '', scene: '', np: { font: 'sans', weight: 'bold', col: 'ink', fx: 'none' }, title: '', favs: [], cur: { k: '', t: '' }, tint: 'soft' }; }
const _pflHas = (list, id) => typeof id === 'string' && list.some(x => (Array.isArray(x) ? x[0] : x.id) === id);
const _pflText = (s, max) => (typeof profileText === 'function' ? profileText(s, max) : Array.from(typeof s === 'string' ? s : '').filter(ch => { const c = ch.codePointAt(0); return c >= 32 && !(c >= 0x7f && c <= 0x9f) && !(c >= 0x200b && c <= 0x200f) && !(c >= 0x2028 && c <= 0x202e) && !(c >= 0x2060 && c <= 0x2069) && c !== 0xfeff; }).join('').replace(/\s+/g, ' ').trim().slice(0, max));
/** Every field an allow-listed value (unknown -> the default); the 'currently' line is plain text, capped. */
function profileLookNormalize(l) {
  const src = l && typeof l === 'object' && !Array.isArray(l) ? l : {};
  const d = profileLookDefault();
  const np = src.np && typeof src.np === 'object' && !Array.isArray(src.np) ? src.np : {};
  const scene = typeof src.scene === 'string' && _PFL_REF.test(src.scene) ? src.scene
    : src.scene && typeof src.scene === 'object' && typeof src.scene.pack === 'string' && typeof src.scene.item === 'string' && _PFL_REF.test(src.scene.pack + '/' + src.scene.item) ? src.scene.pack + '/' + src.scene.item : '';
  const favs = [];
  for (const e of Array.isArray(src.favs) ? src.favs.slice(0, 20) : []) { const f = _pflFav(e); if (f && !favs.includes(f)) favs.push(f); if (favs.length >= PF_LOOK_MAX.favs) break; }
  const cur = src.cur && typeof src.cur === 'object' && !Array.isArray(src.cur) ? src.cur : {};
  const ck = _pflHas(PF_CURRENTLY, cur.k) ? cur.k : '', ct = ck ? _pflText(cur.t, PF_LOOK_MAX.currently) : '';
  return {
    banner: _PFL_BANNER_BY.has(src.banner) ? src.banner : d.banner,
    bannerCol: _pflColourId(src.bannerCol != null ? src.bannerCol : src.col), bannerCol2: _pflColourId(src.bannerCol2 != null ? src.bannerCol2 : src.col2), scene,
    np: { font: _pflHas(PF_NP_FONTS, np.font) ? np.font : d.np.font, weight: _pflHas(PF_NP_WEIGHTS, np.weight) ? np.weight : d.np.weight,
      col: _pflHas(PF_NP_COLS, np.col) ? np.col : d.np.col, fx: _pflHas(PF_NP_FX, np.fx) ? np.fx : d.np.fx },
    title: _PFL_TITLE_BY.has(src.title) ? src.title : '', favs, cur: ck && ct ? { k: ck, t: ct } : { k: '', t: '' },
    tint: _pflHas(PF_TINTS, src.tint) ? src.tint : d.tint,
  };
}
/** What friends get of the look (docs/dev/FRIENDS.md kind 'profile', field `look`): only what differs from the default, colours as hex. */
function profileLookWire(l) {
  const c = profileLookNormalize(l), d = PF_LOOK_DEFAULT, out = {};
  if (c.banner !== d.banner) out.banner = c.banner;
  if (_pflSwatchHex(c.bannerCol)) out.col = _pflSwatchHex(c.bannerCol);
  if (_pflSwatchHex(c.bannerCol2)) out.col2 = _pflSwatchHex(c.bannerCol2);
  if (c.banner === 'scene' && c.scene) { const i = c.scene.indexOf('/'); out.scene = { pack: c.scene.slice(0, i), item: c.scene.slice(i + 1) }; }
  if (c.np.font !== d.np.font || c.np.weight !== d.np.weight || c.np.col !== d.np.col || c.np.fx !== d.np.fx) out.np = Object.assign({}, c.np);
  if (c.title) out.title = c.title;
  if (c.favs.length) out.favs = c.favs.slice();
  if (c.cur.k && c.cur.t) out.cur = { k: c.cur.k, t: c.cur.t };
  if (c.tint !== d.tint) out.tint = c.tint;
  return Object.keys(out).length ? out : null;
}
/** '' when it can be picked, else why not ('Reach level 12', 'Earn “Night owl”', 'Seasonal: comes in spring (March to May)', 'Finish 50 things'). */
function profileLookLockOf(kind, id, ctx) {
  const list = kind === 'banner' ? PF_BANNERS : kind === 'font' ? PF_NP_FONTS : kind === 'col' ? PF_NP_COLS : kind === 'fx' ? PF_NP_FX : kind === 'title' ? PF_TITLES : null;
  const o = list ? list.find(x => x.id === id) : null;
  if (!o) return 'Not available';
  ctx = ctx || {};
  if (o.season) {
    if (ctx.collected && ctx.collected[kind + ':' + id]) return '';
    const s = typeof PF_SEASONS !== 'undefined' && PF_SEASONS ? PF_SEASONS[o.season] : null;
    return typeof profileSeasonOn === 'function' && profileSeasonOn(o.season, ctx.today || '', ctx.birthday) ? '' : 'Seasonal: comes ' + (s ? s.label : 'with its season');
  }
  if (o.friends && (Number(ctx.friends) || 0) < o.friends) return `Make ${o.friends} friends in OpenDash`;
  if (o.ribbon && ctx.ribbons && !ctx.ribbons.has(o.ribbon)) return 'Earn the garden ribbon “' + ((ctx.ribbonLabel && ctx.ribbonLabel(o.ribbon)) || o.ribbon) + '”';   // 2.22
  if (!ctx.game) return '';   // no game on this page: nothing to unlock
  if (o.level && (Number(ctx.levelMax) || 1) < o.level) return 'Reach level ' + o.level;
  // its own achievement, else the one whose reward names it (2.18: the achievements' 'title:' / 'banner:' / 'plate:')
  let ach = o.ach || '';
  if (!ach && typeof ctx.achFor === 'function') { try { ach = String(ctx.achFor(kind, o) || ''); } catch (e) { ach = ''; } }
  if (ach && !(ctx.ach && ctx.ach.has && ctx.ach.has(ach))) return 'Earn “' + ((ctx.achLabel && ctx.achLabel(ach)) || ach) + '”';
  if (o.garden && (Number(ctx.garden) || 0) < o.garden) return `Grow your garden: finish ${o.garden.toLocaleString('en-GB')} things in all`;
  return '';
}

/** An achievement's reward (ACH_REWARD_KINDS 'title' | 'banner' | 'plate') as one of this file's ids, or null when this
    build has no such thing (the achievement still counts; its card says what it would unlock). A title is named by its
    words ('title:Timekeeper' -> 'timekeeper'), a banner by its id, a plate by a nameplate font, colour or effect id. */
function profileLookRewardRef(kind, ref) {
  const r = String(ref == null ? '' : ref).trim();
  if (!r) return null;
  if (kind === 'title') {
    const low = r.toLowerCase(), slug = low.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const t = _PFL_TITLE_BY.get(low) || _PFL_TITLE_BY.get(slug) || PF_TITLES.find(x => x.label.toLowerCase() === low);
    return t ? { kind: 'title', id: t.id, label: t.label } : null;
  }
  if (kind === 'banner') { const b = pfBanner(r); return b && b.uses !== 'scene' ? { kind: 'banner', id: b.id, label: b.label } : null; }
  if (kind === 'plate') {
    for (const [k, list] of [['font', PF_NP_FONTS], ['col', PF_NP_COLS], ['fx', PF_NP_FX]]) { const o = list.find(x => x.id === r); if (o) return { kind: k, id: o.id, label: o.label }; }
  }
  return null;
}

/* ---------- drawing a banner (viewBox 0 0 480 160, sliced to fit any card) ---------- */
const _PFL_W = 480, _PFL_H = 160;
function profileBannerCols(l, themeHex) {
  const c = profileLookNormalize(l);
  const th = _PFL_HEX.test(String(themeHex)) ? String(themeHex).toLowerCase() : '#5b5bd6';
  const a = _pflSwatchHex(c.bannerCol) || th;
  const def = pfBanner(c.banner);
  const b = _pflSwatchHex(c.bannerCol2) || (def && def.b && _pflDist(def.b, a) > 90 ? def.b : '')
    || (_pflLum(a) > 0.45 ? _pflMix(a, '#1d2333', 0.55) : _pflMix(a, '#ffffff', 0.62));
  return { a, b };
}
function _pflLin(id, stops, x1, y1, x2, y2, user) {
  const s = stops.map((c, i) => { const [col, off, op] = Array.isArray(c) ? c : [c, stops.length > 1 ? i / (stops.length - 1) : 0]; return `<stop offset="${_pflN(off)}" stop-color="${col}"${op != null && op !== 1 ? ` stop-opacity="${_pflN(op)}"` : ''}/>`; }).join('');
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${user ? ' gradientUnits="userSpaceOnUse"' : ''}>${s}</linearGradient>`;
}
function _pflRad(id, col, op) { return `<radialGradient id="${id}"><stop offset="0" stop-color="${col}" stop-opacity="${_pflN(op)}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`; }
const _pflRect = (fill, op) => `<rect width="${_PFL_W}" height="${_PFL_H}" fill="${fill}"${op != null ? ` opacity="${_pflN(op)}"` : ''}/>`;
const _pflC = (x, y, r, f, op, extra) => `<circle cx="${_pflN(x)}" cy="${_pflN(y)}" r="${_pflN(r)}" fill="${f}"${op != null && op !== 1 ? ` opacity="${_pflN(op)}"` : ''}${extra || ''}/>`;
const _pflP = (d, f, op, extra) => `<path d="${d}" fill="${f}"${op != null && op !== 1 ? ` opacity="${_pflN(op)}"` : ''}${extra || ''}/>`;
const _pflS = (d, c, w, op, extra) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${_pflN(w)}" stroke-linecap="round" stroke-linejoin="round"${op != null && op !== 1 ? ` opacity="${_pflN(op)}"` : ''}${extra || ''}/>`;
/** A soft "mesh" gradient: a base gradient with glowing blobs over it. */
function _pflMesh(C, base, blobs, dir) {
  let defs = _pflLin(C.id('base'), base, 0, 0, dir === 'v' ? 0 : 1, 1), body = _pflRect(`url(#${C.id('base')})`);
  blobs.forEach(([x, y, r, col, op], i) => { defs += _pflRad(C.id('b' + i), col, op); body += _pflC(x, y, r, `url(#${C.id('b' + i)})`); });
  return { defs, body };
}
/** A four-pointed sparkle. */
const _pflSpark = (x, y, r) => `M${_pflN(x)} ${_pflN(y - r)} Q${_pflN(x + r * 0.16)} ${_pflN(y - r * 0.16)} ${_pflN(x + r)} ${_pflN(y)} Q${_pflN(x + r * 0.16)} ${_pflN(y + r * 0.16)} ${_pflN(x)} ${_pflN(y + r)} Q${_pflN(x - r * 0.16)} ${_pflN(y + r * 0.16)} ${_pflN(x - r)} ${_pflN(y)} Q${_pflN(x - r * 0.16)} ${_pflN(y - r * 0.16)} ${_pflN(x)} ${_pflN(y - r)} Z`;
/** A smooth closed loop through points (quadratic curves through the midpoints). */
function _pflLoop(pts) {
  const m = (i) => { const a = pts[i % pts.length], b = pts[(i + 1) % pts.length]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
  let d = `M${_pflN(m(0)[0])} ${_pflN(m(0)[1])}`;
  for (let i = 1; i <= pts.length; i++) { const p = pts[i % pts.length], q = m(i); d += ` Q${_pflN(p[0])} ${_pflN(p[1])} ${_pflN(q[0])} ${_pflN(q[1])}`; }
  return d + ' Z';
}
/** A ridge line across the banner, closed at the bottom: y(x) from a function. */
function _pflRidge(fy, step) {
  let d = `M0 ${_PFL_H} L0 ${_pflN(fy(0))}`;
  for (let x = step; x <= _PFL_W + step; x += step) d += ` L${_pflN(Math.min(x, _PFL_W))} ${_pflN(fy(Math.min(x, _PFL_W)))}`;
  return d + ` L${_PFL_W} ${_PFL_H} Z`;
}
/** A smooth wave band from y0 (amplitude amp, wavelength wl, phase ph) down to the bottom. */
function _pflWave(y0, amp, wl, ph) {
  let d = `M0 ${_PFL_H} L0 ${_pflN(y0 + Math.sin(ph) * amp)}`;
  for (let x = 0; x < _PFL_W; x += wl / 2) {
    const x1 = x + wl / 4, x2 = x + wl / 2;
    d += ` Q${_pflN(x1)} ${_pflN(y0 + Math.sin(ph + (x1 / wl) * Math.PI * 2) * amp * 1.9)} ${_pflN(x2)} ${_pflN(y0 + Math.sin(ph + (x2 / wl) * Math.PI * 2) * amp)}`;
  }
  return d + ` L${_PFL_W} ${_PFL_H} Z`;
}
/** A puffy cloud of circles on a flat base. */
function _pflCloud(x, y, s, fill, op) {
  const parts = [[0, 0, 13], [14, -7, 15], [30, -2, 12], [-13, 3, 9], [42, 4, 8]];
  let g = `<g opacity="${_pflN(op == null ? 1 : op)}">`;
  for (const [dx, dy, r] of parts) g += _pflC(x + dx * s, y + dy * s, r * s, fill);
  g += `<rect x="${_pflN(x - 20 * s)}" y="${_pflN(y)}" width="${_pflN(70 * s)}" height="${_pflN(11 * s)}" rx="${_pflN(5.5 * s)}" fill="${fill}"/>`;
  return g + '</g>';
}
/** A snowy pine: three tiers with snow on each, on a little trunk (base at y). */
function _pflPine(x, base, h, green) {
  let s = `<rect x="${_pflN(x - 1.6)}" y="${_pflN(base - 4)}" width="3.2" height="6" fill="#4a3424"/>`;
  for (let k = 0; k < 3; k++) {
    const y0 = base - 3 - k * h * 0.26, w = h * (0.4 - k * 0.09), top = y0 - h * 0.42;
    s += `<polygon points="${_pflN(x)},${_pflN(top)} ${_pflN(x - w)},${_pflN(y0)} ${_pflN(x + w)},${_pflN(y0)}" fill="${green || '#1f5a4a'}"/>`;
    s += `<polygon points="${_pflN(x)},${_pflN(top)} ${_pflN(x - w * 0.42)},${_pflN(top + h * 0.18)} ${_pflN(x - w * 0.12)},${_pflN(top + h * 0.14)} ${_pflN(x + w * 0.1)},${_pflN(top + h * 0.19)} ${_pflN(x + w * 0.42)},${_pflN(top + h * 0.18)}" fill="#ffffff"/>`;
  }
  return s;
}
/** An animated particle: base position (x, y), the CSS animation class, its timing and travel (user units). */
function _pflAnim(C, cls, inner, o) {
  if (!C.motion) return inner;
  const st = [`--d:${_pflN(o.d)}s`, `--dl:-${_pflN(o.dl)}s`];
  for (const k of ['y0', 'y1', 'x1', 'r1']) if (o[k] != null) st.push(`--${k}:${_pflN(o[k])}${k === 'r1' ? 'deg' : 'px'}`);
  return `<g class="pfb-a ${cls}" style="${st.join(';')}">${inner}</g>`;
}

const _PFL_DRAW = {
  /* --- gradients --- */
  theme(C) {
    const a = C.th, m = _pflMesh(C, [_pflMix(a, '#ffffff', 0.08), a, _pflMix(a, '#ffffff', 0.5)], [[410, 6, 170, '#ffffff', 0.32], [40, 170, 150, _pflMix(a, '#000000', 0.35), 0.3], [250, 80, 120, _pflMix(a, '#ffffff', 0.3), 0.25]]);
    let b = m.body;
    for (const [r, op] of [[46, 0.22], [78, 0.14], [112, 0.08]]) b += `<circle cx="412" cy="34" r="${r}" fill="none" stroke="#ffffff" stroke-width="1.4" opacity="${op}"/>`;
    return { defs: m.defs, body: b };
  },
  dawn(C) {
    const m = _pflMesh(C, ['#ffd9a0', '#ffb3a6', '#c7b7f3'], [[392, 134, 150, '#fff6cf', 0.95], [80, 10, 140, '#ffe9f2', 0.6], [230, 160, 120, '#ff9fb0', 0.35]]);
    let b = m.body + _pflC(392, 130, 28, '#fff4da', 0.95);
    for (const [x, y, w, op] of [[40, 40, 150, 0.45], [96, 56, 110, 0.32], [250, 30, 130, 0.38], [300, 92, 90, 0.28], [150, 104, 120, 0.25]]) b += `<rect x="${x}" y="${y}" width="${w}" height="5" rx="2.5" fill="#ffffff" opacity="${op}"/>`;
    return { defs: m.defs, body: b };
  },
  ocean(C) {
    const m = _pflMesh(C, ['#0b3a5e', '#11788f', '#6fd2c6'], [[100, 150, 150, '#a6f2e2', 0.4], [420, 10, 140, '#2a5f9e', 0.5], [300, 120, 90, '#41b7b0', 0.35]], 'v');
    let b = m.body;
    for (let i = 0; i < 7; i++) {
      const y = 22 + i * 19, ph = C.R() * 6;
      let d = `M-10 ${_pflN(y)}`;
      for (let x = -10; x < 500; x += 40) d += ` Q${_pflN(x + 20)} ${_pflN(y + Math.sin(ph + x / 50) * 5)} ${_pflN(x + 40)} ${_pflN(y)}`;
      b += _pflS(d, '#ffffff', 1 + (i % 3) * 0.7, 0.06 + (i / 7) * 0.12);
    }
    for (let i = 0; i < 6; i++) b += _pflP(_pflSpark(40 + C.R() * 400, 20 + C.R() * 120, 2.5 + C.R() * 3), '#e8fffb', 0.75);
    return { defs: m.defs, body: b };
  },
  meadow(C) {
    const m = _pflMesh(C, ['#f3fbd0', '#b8e68e', '#5fbf7a'], [[380, 20, 150, '#fffbe0', 0.85], [60, 160, 170, '#2f9a6a', 0.5], [250, 175, 160, '#8fd36f', 0.55], [140, 30, 90, '#e8ffd0', 0.5]], 'v');
    let b = m.body;
    for (let i = 0; i < 16; i++) b += _pflC(C.R() * 480, 10 + C.R() * 140, 2 + C.R() * 7, '#ffffff', 0.12 + C.R() * 0.2);
    return { defs: m.defs, body: b };
  },
  sunset(C) {
    const sky = ['#2b1a4a', '#7d2c72', ['#ff6f61', 0.62], ['#ffc46b', 0.86]];
    let defs = _pflLin(C.id('sky'), sky, 0, 0, 0, 1) + _pflLin(C.id('sun'), ['#ffe27a', '#ff8a5c', '#ff4f7b'], 0, 0, 0, 1);
    let b = _pflRect(`url(#${C.id('sky')})`);
    for (let i = 0; i < 18; i++) b += _pflC(C.R() * 480, C.R() * 60, 0.6 + C.R() * 1.1, '#ffffff', 0.4 + C.R() * 0.5);
    b += _pflC(240, 118, 66, `url(#${C.id('sun')})`);
    defs += _pflLin(C.id('skyU'), sky, 0, 0, 0, _PFL_H, true);
    for (let i = 0; i < 6; i++) { const y = 96 + i * 7.5, h = 1.5 + i * 0.9; b += `<rect x="160" y="${_pflN(y)}" width="160" height="${_pflN(h)}" fill="url(#${C.id('skyU')})"/>`; }
    b += `<rect x="0" y="130" width="480" height="30" fill="#2b1a4a" opacity="0.92"/>`;
    for (let i = 0; i < 6; i++) { const w = 120 - i * 16; b += `<rect x="${_pflN(240 - w / 2)}" y="${_pflN(134 + i * 4.4)}" width="${_pflN(w)}" height="1.8" rx="0.9" fill="#ffb36b" opacity="${_pflN(0.75 - i * 0.1)}"/>`; }
    b += _pflP('M0 130 L60 112 L104 122 L150 106 L196 130 Z', '#3a1f55', 0.95) + _pflP('M300 130 L352 110 L392 120 L436 102 L480 116 L480 130 Z', '#3a1f55', 0.95);
    return { defs, body: b };
  },
  berry(C) {
    const m = _pflMesh(C, ['#ff6fae', '#b33fc4', '#5b2bb0'], [[90, 10, 150, '#ffc2e2', 0.6], [430, 160, 160, '#3a1d8a', 0.55], [300, 40, 100, '#ff9ad0', 0.4]]);
    let b = m.body;
    for (let i = 0; i < 9; i++) { const x = 20 + C.R() * 440, y = 15 + C.R() * 130, r = 4 + C.R() * 10; b += _pflC(x, y, r, '#ffffff', 0.1) + _pflC(x - r * 0.35, y - r * 0.35, r * 0.28, '#ffffff', 0.35); }
    return { defs: m.defs, body: b };
  },
  nordic(C) {
    const m = _pflMesh(C, ['#f4f8fb', '#cddbe6', '#8ea5bb'], [[80, 20, 150, '#ffffff', 0.85], [420, 150, 160, '#6f88a3', 0.45], [300, 60, 90, '#e8f2fb', 0.6]], 'v');
    let b = m.body;
    b += `<polygon points="120,0 190,0 90,160 20,160" fill="#ffffff" opacity="0.22"/><polygon points="215,0 240,0 140,160 115,160" fill="#ffffff" opacity="0.18"/>`;
    for (let i = 0; i < 5; i++) {
      const x = 260 + C.R() * 200, y = 20 + C.R() * 110, r = 5 + C.R() * 6;
      let d = '';
      for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; d += `M${_pflN(x - Math.cos(a) * r)} ${_pflN(y - Math.sin(a) * r)} L${_pflN(x + Math.cos(a) * r)} ${_pflN(y + Math.sin(a) * r)} `; }
      b += _pflS(d, '#ffffff', 1.3, 0.7);
    }
    return { defs: m.defs, body: b };
  },
  citrus(C) {
    const m = _pflMesh(C, ['#fff6a8', '#ffc44d', '#ff8a3d'], [[60, 20, 140, '#fffbe0', 0.85], [300, 150, 150, '#ff7a2e', 0.4]]);
    let b = m.body;
    const slice = (cx, cy, r, op) => {
      let s = _pflC(cx, cy, r, '#fff3c4', op) + _pflC(cx, cy, r * 0.88, '#ffd166', op);
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; s += _pflS(`M${cx} ${cy} L${_pflN(cx + Math.cos(a) * r * 0.86)} ${_pflN(cy + Math.sin(a) * r * 0.86)}`, '#fff3c4', 2.2, op); }
      return s + _pflC(cx, cy, r * 0.12, '#fff3c4', op);
    };
    b += slice(430, 140, 88, 0.42) + slice(330, 20, 34, 0.3);
    return { defs: m.defs, body: b };
  },
  twilight(C) {
    const m = _pflMesh(C, ['#1b2556', '#4b3fa8', '#c06cb0', '#f2a2a8'], [[420, 160, 160, '#ffb88a', 0.5], [60, 0, 140, '#2b3a8a', 0.6], [250, 90, 110, '#9a5cc0', 0.3]], 'v');
    let b = m.body;
    for (let i = 0; i < 24; i++) b += _pflC(C.R() * 480, C.R() * 70, 0.5 + C.R() * 1.2, '#ffffff', 0.35 + C.R() * 0.6);
    b += _pflP(_pflSpark(70, 30, 6), '#ffffff', 0.9) + _pflP(_pflSpark(330, 22, 4), '#ffffff', 0.8);
    return { defs: m.defs, body: b };
  },
  lagoon(C) {
    const m = _pflMesh(C, ['#c9f7e1', '#9fe3ee', '#86b2f2'], [[400, 20, 150, '#ffffff', 0.6], [80, 150, 150, '#5fd3c4', 0.45]]);
    let b = m.body;
    for (const [x, y, s] of [[130, 110, 1], [360, 60, 0.7]]) for (let i = 1; i <= 4; i++) b += `<ellipse cx="${x}" cy="${y}" rx="${_pflN(i * 22 * s)}" ry="${_pflN(i * 8 * s)}" fill="none" stroke="#ffffff" stroke-width="1.4" opacity="${_pflN(0.5 - i * 0.1)}"/>`;
    return { defs: m.defs, body: b };
  },
  ember(C) {
    const m = _pflMesh(C, ['#2a0b0b', '#8f1d17', '#e8501f', '#ffb238'], [[240, 180, 220, '#ffcf6b', 0.55], [60, 0, 120, '#1a0606', 0.6], [420, 10, 120, '#3a0c0c', 0.6]], 'v');
    let b = m.body;
    for (let i = 0; i < C.many(26); i++) {
      const x = C.R() * 480, y = 30 + C.R() * 125, r = 0.8 + C.R() * 1.8;
      b += _pflAnim(C, 'pfb-rise', _pflC(x, y, r, i % 3 ? '#ffd27a' : '#fff1c4', 0.5 + C.R() * 0.5), { d: 5 + C.R() * 6, dl: C.R() * 10, y0: 170 - y, y1: -10 - y, x1: (C.R() - 0.5) * 30 });
    }
    return { defs: m.defs, body: b };
  },
  holo(C) {
    const m = _pflMesh(C, ['#ffd1f3', '#c8b6ff', '#a8e6ff', '#b8ffd9', '#fff3b0'], [[100, 30, 140, '#ffffff', 0.55], [400, 140, 150, '#e0c3ff', 0.5]]);
    let defs = m.defs + _pflLin(C.id('sheen'), [['#ffffff', 0, 0], ['#ffffff', 0.5, 0.75], ['#ffffff', 1, 0]], 0, 0, 1, 0);
    let b = m.body;
    for (const [x, w] of [[60, 70], [170, 34], [300, 90], [420, 30]]) b += `<polygon points="${x},0 ${x + w},0 ${x + w - 90},160 ${x - 90},160" fill="url(#${C.id('sheen')})" opacity="0.55"/>`;
    for (let i = 0; i < 9; i++) b += _pflP(_pflSpark(C.R() * 480, C.R() * 160, 2.5 + C.R() * 4.5), '#ffffff', 0.85);
    return { defs, body: b };
  },
  gold(C) {
    const m = _pflMesh(C, ['#6e4a12', '#c8962a', ['#ffeeb0', 0.5], '#d4a72c', '#7a5418'], [[120, 30, 130, '#fff6d0', 0.45], [400, 150, 140, '#5a3a0a', 0.45]]);
    let defs = m.defs + _pflLin(C.id('shine'), [['#ffffff', 0, 0], ['#fffbe8', 0.5, 0.85], ['#ffffff', 1, 0]], 0, 0, 1, 0);
    let b = m.body + `<polygon points="250,0 300,0 230,160 180,160" fill="url(#${C.id('shine')})" opacity="0.7"/>`;
    for (let i = 0; i < 40; i++) { const x = C.R() * 480, y = C.R() * 160, s = 1 + C.R() * 3; b += `<rect x="${_pflN(x)}" y="${_pflN(y)}" width="${_pflN(s)}" height="${_pflN(s * 0.7)}" fill="${C.R() < 0.5 ? '#fff4c2' : '#8a6116'}" opacity="${_pflN(0.35 + C.R() * 0.5)}" transform="rotate(${Math.round(C.R() * 90)} ${_pflN(x)} ${_pflN(y)})"/>`; }
    for (let i = 0; i < 5; i++) b += _pflP(_pflSpark(C.R() * 480, C.R() * 160, 3 + C.R() * 4), '#ffffff', 0.9);
    return { defs, body: b };
  },
  /* --- patterns (your two colours: a, b) --- */
  dots(C) {
    let b = _pflRect(C.a) + _pflRect(`url(#${C.id('shade')})`);
    const defs = _pflLin(C.id('shade'), [['#ffffff', 0, 0.16], ['#000000', 1, 0.1]], 0, 0, 1, 1);
    for (let row = 0; row < 7; row++) for (let col = 0; col < 18; col++) {
      const x = col * 30 + (row % 2 ? 15 : 0), y = row * 26 + 4;
      b += _pflC(x, y, 6.2, C.b, 0.92);
    }
    return { defs, body: b };
  },
  waves(C) {
    let b = _pflRect(_pflMix(C.a, '#ffffff', 0.55));
    const bands = [[30, _pflMix(C.a, '#ffffff', 0.35)], [52, C.b], [72, _pflMix(C.a, '#ffffff', 0.12)], [94, C.a], [114, _pflMix(C.a, '#000000', 0.18)], [136, _pflMix(C.a, '#000000', 0.34)]];
    bands.forEach(([y, col], i) => {
      const ph = i * 1.3;
      b += _pflP(_pflWave(y, 5, 120, ph), col);
      let d = `M0 ${_pflN(y + Math.sin(ph) * 5)}`;
      for (let x = 0; x < _PFL_W; x += 60) { const x1 = x + 30, x2 = x + 60; d += ` Q${x1} ${_pflN(y + Math.sin(ph + (x1 / 120) * Math.PI * 2) * 9.5)} ${x2} ${_pflN(y + Math.sin(ph + (x2 / 120) * Math.PI * 2) * 5)}`; }
      b += _pflS(d, '#ffffff', 1.4, 0.35);
    });
    return { defs: '', body: b };
  },
  stripes(C) {
    let b = _pflRect(C.a);
    for (let x = -170; x < 640; x += 40) {
      b += `<polygon points="${x},0 ${x + 20},0 ${x + 20 - 160},160 ${x - 160},160" fill="${C.b}"/>`;
      b += `<polygon points="${x + 28},0 ${x + 31},0 ${x + 31 - 160},160 ${x + 28 - 160},160" fill="#ffffff" opacity="0.35"/>`;
    }
    return { defs: '', body: b };
  },
  clouds(C) {
    const defs = _pflLin(C.id('sky'), [_pflMix(C.a, '#ffffff', 0.15), _pflMix(C.a, '#ffffff', 0.72)], 0, 0, 0, 1);
    let b = _pflRect(`url(#${C.id('sky')})`) + _pflC(400, 34, 22, C.b, 0.9) + _pflC(400, 34, 34, C.b, 0.2);
    const shadow = _pflMix(C.a, '#ffffff', 0.45);
    for (const [x, y, s] of [[40, 50, 1.1], [180, 96, 1.5], [330, 64, 0.9], [440, 120, 1.2], [110, 132, 0.8], [270, 30, 0.6]]) b += _pflCloud(x + 2, y + 5, s, shadow, 0.55) + _pflCloud(x, y, s, '#ffffff', 0.96);
    return { defs, body: b };
  },
  notebook(C) {
    let b = _pflRect(_pflMix('#fbf8ef', C.a, 0.08));
    for (let y = 26; y < 160; y += 18) b += `<rect x="0" y="${y}" width="480" height="1.2" fill="${C.b}" opacity="0.55"/>`;
    b += `<rect x="64" y="0" width="1.6" height="160" fill="#e5534b" opacity="0.7"/><rect x="68" y="0" width="0.8" height="160" fill="#e5534b" opacity="0.45"/>`;
    for (const y of [32, 80, 128]) b += _pflC(26, y, 7.5, _pflMix(C.a, '#000000', 0.45), 0.22) + _pflC(25, y - 1, 6.5, _pflMix('#fbf8ef', C.a, 0.25));
    const ink = _pflMix(C.a, '#000000', 0.25);
    b += _pflS('M380 70 C 372 58, 356 62, 362 76 C 366 86, 380 94, 380 94 C 380 94, 396 86, 399 76 C 404 62, 388 58, 380 70 Z', ink, 2, 0.75);
    b += _pflS('M408 112 L420 108 L414 120 L428 116', ink, 1.8, 0.6) + _pflS(_pflSpark(434, 52, 7), ink, 1.6, 0.7);
    b += _pflS('M110 98 C 150 86, 190 108, 236 94 S 300 86, 330 100', C.a, 3, 0.55);
    return { defs: '', body: b };
  },
  terrazzo(C) {
    let b = _pflRect(_pflMix(C.a, '#f6f1e7', 0.86));
    const cols = [C.a, C.b, _pflMix(C.a, '#000000', 0.3), _pflMix(C.a, C.b, 0.5), _pflMix(C.b, '#ffffff', 0.4), '#2f3238'];
    for (let i = 0; i < 64; i++) {
      const x = C.R() * 490 - 5, y = C.R() * 170 - 5, r = 2.5 + C.R() * (i < 16 ? 11 : 5), n = 5 + Math.floor(C.R() * 3), rot = C.R() * 6;
      const pts = [];
      for (let k = 0; k < n; k++) { const ang = rot + k / n * Math.PI * 2, rr = r * (0.6 + C.R() * 0.5); pts.push(_pflN(x + Math.cos(ang) * rr) + ',' + _pflN(y + Math.sin(ang) * rr)); }
      b += `<polygon points="${pts.join(' ')}" fill="${cols[Math.floor(C.R() * cols.length)]}" opacity="${_pflN(0.75 + C.R() * 0.25)}"/>`;
    }
    return { defs: '', body: b };
  },
  chevron(C) {
    let b = _pflRect(C.a);
    for (let r = 0; r < 8; r++) {
      const y = 8 + r * 22;
      let d = `M-20 ${y + 7}`;
      for (let x = -20; x < 500; x += 40) d += ` L${x + 20} ${y - 7} L${x + 40} ${y + 7}`;
      b += _pflS(d, r % 2 ? C.b : _pflMix(C.a, '#ffffff', 0.5), r % 2 ? 7 : 2.5, r % 2 ? 1 : 0.7);
    }
    return { defs: '', body: b };
  },
  plaid(C) {
    const deep = _pflMix(C.a, '#000000', 0.42);
    let b = _pflRect(C.a);
    for (let o = 0; o < 480; o += 120) {
      b += `<rect x="${o + 18}" y="0" width="30" height="160" fill="${C.b}" opacity="0.42"/><rect x="0" y="${(o / 120) % 2 ? 20 : 92}" width="480" height="30" fill="${C.b}" opacity="0.42"/>`;
      b += `<rect x="${o + 76}" y="0" width="12" height="160" fill="${deep}" opacity="0.45"/>`;
      b += `<rect x="${o + 32}" y="0" width="2" height="160" fill="${deep}" opacity="0.6"/><rect x="${o + 100}" y="0" width="1" height="160" fill="#ffffff" opacity="0.45"/>`;
    }
    for (const y of [64, 134]) b += `<rect x="0" y="${y}" width="480" height="12" fill="${deep}" opacity="0.45"/>`;
    for (const y of [34, 106]) b += `<rect x="0" y="${y}" width="480" height="2" fill="${deep}" opacity="0.6"/>`;
    for (const y of [8, 82, 152]) b += `<rect x="0" y="${y}" width="480" height="1" fill="#ffffff" opacity="0.45"/>`;
    return { defs: '', body: b };
  },
  confetti(C) {
    const defs = _pflLin(C.id('bg'), [_pflMix(C.a, '#ffffff', 0.78), _pflMix(C.a, '#ffffff', 0.6)], 0, 0, 1, 1);
    let b = _pflRect(`url(#${C.id('bg')})`);
    const cols = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#b983ff', '#ff9f45', C.a, C.b];
    for (let i = 0; i < 72; i++) {
      const x = C.R() * 480, y = C.R() * 160, col = cols[i % cols.length], rot = Math.round(C.R() * 180), kind = i % 4;
      if (kind === 0) b += `<rect x="${_pflN(x)}" y="${_pflN(y)}" width="3.4" height="10" rx="1" fill="${col}" transform="rotate(${rot} ${_pflN(x)} ${_pflN(y)})"/>`;
      else if (kind === 1) b += _pflC(x, y, 2.6, col);
      else if (kind === 2) b += _pflS(`M${_pflN(x)} ${_pflN(y)} q 3 -4 6 0 t 6 0 t 6 0`, col, 2, 1, ` transform="rotate(${rot} ${_pflN(x)} ${_pflN(y)})"`);
      else b += `<polygon points="${_pflN(x)},${_pflN(y - 4)} ${_pflN(x + 4)},${_pflN(y + 3)} ${_pflN(x - 4)},${_pflN(y + 3)}" fill="${col}" transform="rotate(${rot} ${_pflN(x)} ${_pflN(y)})"/>`;
    }
    return { defs, body: b };
  },
  stars(C) {
    const top = _pflMix(C.a, '#0a0f2a', 0.82), bot = _pflMix(C.a, '#1e2a5c', 0.55);
    const defs = _pflLin(C.id('sky'), [top, bot], 0, 0, 0, 1) + _pflLin(C.id('skyU'), [top, bot], 0, 0, 0, _PFL_H, true) + _pflRad(C.id('moonglow'), '#fff6d6', 0.35);
    let b = _pflRect(`url(#${C.id('sky')})`);
    for (let i = 0; i < 70; i++) b += _pflC(C.R() * 480, C.R() * 160, 0.4 + C.R() * 1.2, i % 9 ? '#ffffff' : C.b, 0.4 + C.R() * 0.6);
    for (let i = 0; i < 7; i++) b += _pflP(_pflSpark(C.R() * 480, C.R() * 150 + 5, 3 + C.R() * 4), '#fffbe8', 0.9);
    b += _pflC(404, 44, 46, `url(#${C.id('moonglow')})`) + _pflC(404, 44, 19, '#fff6d6') + _pflC(413, 38, 17, `url(#${C.id('skyU')})`);
    return { defs, body: b };
  },
  hex(C) {
    let b = _pflRect(_pflMix(C.a, '#000000', 0.08));
    const s = 18, w = Math.sqrt(3) * s;
    const hexAt = (cx, cy) => { const p = []; for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; p.push(_pflN(cx + Math.cos(a) * s) + ',' + _pflN(cy + Math.sin(a) * s)); } return p.join(' '); };
    let fills = '', lines = '';
    for (let r = -1; r < 7; r++) for (let c = -1; c < 17; c++) {
      const cx = c * w + (r % 2 ? w / 2 : 0), cy = r * s * 1.5;
      const pick = C.R();
      if (pick < 0.16) fills += `<polygon points="${hexAt(cx, cy)}" fill="${C.b}" opacity="${_pflN(0.6 + C.R() * 0.4)}"/>`;
      lines += `<polygon points="${hexAt(cx, cy)}" fill="none" stroke="${C.b}" stroke-width="1.5" opacity="0.55"/>`;
    }
    return { defs: '', body: b + fills + lines };
  },
  mountains(C) {
    const defs = _pflLin(C.id('sky'), [_pflMix(C.a, '#ffffff', 0.62), _pflMix(C.a, '#ffffff', 0.9)], 0, 0, 0, 1);
    let b = _pflRect(`url(#${C.id('sky')})`) + _pflC(140, 48, 20, C.b, 0.85);
    const peaks = [[0, 92], [60, 46], [120, 84], [190, 28], [260, 78], [330, 40], [400, 86], [450, 54], [480, 70]];
    let d = 'M0 160';
    for (const [x, y] of peaks) d += ` L${x} ${y}`;
    b += _pflP(d + ' L480 160 Z', _pflMix(C.a, '#ffffff', 0.25), 0.9);
    for (const [x, y] of peaks.slice(1, -1)) if (y < 60) b += _pflP(`M${x} ${y} L${_pflN(x - 14)} ${_pflN(y + 15)} L${_pflN(x - 5)} ${_pflN(y + 11)} L${x + 2} ${_pflN(y + 17)} L${_pflN(x + 13)} ${_pflN(y + 13)} Z`, '#ffffff', 0.95);
    b += _pflP(_pflRidge((x) => 104 + Math.sin(x / 47) * 12 + Math.sin(x / 19) * 5, 12), _pflMix(C.a, '#000000', 0.12));
    const front = (x) => 130 + Math.sin(x / 70 + 1) * 9;
    b += _pflP(_pflRidge(front, 16), _pflMix(C.a, '#000000', 0.38));
    for (let i = 0; i < 26; i++) { const x = 6 + i * 18.5 + C.R() * 6, base = front(x) + 4, h = 12 + C.R() * 10; b += `<polygon points="${_pflN(x)},${_pflN(base - h)} ${_pflN(x - h * 0.3)},${_pflN(base)} ${_pflN(x + h * 0.3)},${_pflN(base)}" fill="${_pflMix(C.a, '#000000', 0.5)}"/>`; }
    return { defs, body: b };
  },
  memphis(C) {
    let b = _pflRect(_pflMix(C.a, '#fff8ee', 0.84));
    const ink = '#2f3238', yel = '#f2c14e', mint = '#5ec9a8';
    // a few big quiet shapes behind, then the busy little ones (80s Memphis: squiggles, triangles, dots, half moons, grids)
    b += _pflC(70, 150, 46, _pflMix(C.b, '#ffffff', 0.45), 0.7) + `<rect x="330" y="-14" width="70" height="70" rx="6" fill="${_pflMix(C.a, '#ffffff', 0.55)}" opacity="0.7" transform="rotate(18 365 21)"/>`;
    for (let i = 0; i < 44; i++) {
      const x = 8 + (i % 11) * 43 + C.R() * 22, y = 10 + Math.floor(i / 11) * 38 + C.R() * 18, k = i % 8, rot = Math.round(C.R() * 360), s = 0.75 + C.R() * 0.6;
      const col = [C.a, C.b, yel, mint][Math.floor(C.R() * 4)];
      if (k === 0) b += _pflS(`M${_pflN(x)} ${_pflN(y)} q ${_pflN(5 * s)} ${_pflN(-7 * s)} ${_pflN(10 * s)} 0 t ${_pflN(10 * s)} 0 t ${_pflN(10 * s)} 0`, ink, 2.4, 1, ` transform="rotate(${rot} ${_pflN(x + 15)} ${_pflN(y)})"`);
      else if (k === 1) b += `<polygon points="${_pflN(x)},${_pflN(y - 8 * s)} ${_pflN(x + 8 * s)},${_pflN(y + 6 * s)} ${_pflN(x - 8 * s)},${_pflN(y + 6 * s)}" fill="none" stroke="${col}" stroke-width="2.6" stroke-linejoin="round" transform="rotate(${rot} ${_pflN(x)} ${_pflN(y)})"/>`;
      else if (k === 2) b += _pflC(x, y, 6 * s, col);
      else if (k === 3) b += _pflS(`M${_pflN(x - 5)} ${_pflN(y)} L${_pflN(x + 5)} ${_pflN(y)} M${_pflN(x)} ${_pflN(y - 5)} L${_pflN(x)} ${_pflN(y + 5)}`, ink, 2.4);
      else if (k === 4) b += _pflP(`M${_pflN(x - 8 * s)} ${_pflN(y)} A ${_pflN(8 * s)} ${_pflN(8 * s)} 0 0 1 ${_pflN(x + 8 * s)} ${_pflN(y)} Z`, col, 1, ` transform="rotate(${rot} ${_pflN(x)} ${_pflN(y)})"`);
      else if (k === 5) for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) b += _pflC(x + c * 5, y + r * 5, 1.2, ink);
      else if (k === 6) b += `<rect x="${_pflN(x - 7 * s)}" y="${_pflN(y - 2.5)}" width="${_pflN(14 * s)}" height="5" rx="2.5" fill="${col}" transform="rotate(${rot} ${_pflN(x)} ${_pflN(y)})"/>`;
      else b += _pflC(x, y, 5.5 * s, 'none', 1, ` stroke="${ink}" stroke-width="2"`);
    }
    return { defs: '', body: b };
  },
  topo(C) {
    let b = _pflRect(_pflMix(C.a, '#ffffff', 0.84));
    const ink = _pflMix(C.a, '#000000', 0.35);
    for (const [cx, cy, n, ph] of [[110, 70, 8, 0.5], [360, 110, 9, 2.1], [470, 10, 5, 4]]) {
      for (let i = 1; i <= n; i++) {
        const R = i * 13, pts = [];
        for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2, r = R * (1 + 0.13 * Math.sin(3 * a + ph + i * 0.3) + 0.07 * Math.sin(5 * a + ph * 2)); pts.push([cx + Math.cos(a) * r * 1.35, cy + Math.sin(a) * r]); }
        b += _pflS(_pflLoop(pts), i % 4 === 0 ? C.b : ink, i % 4 === 0 ? 2 : 1.1, i % 4 === 0 ? 0.75 : 0.42);
      }
    }
    return { defs: '', body: b };
  },
  /* --- seasonal --- */
  blossom(C) {
    const defs = _pflLin(C.id('sky'), ['#fff3f6', '#ffd9e6', '#ffe9d6'], 0, 0, 0, 1);
    let b = _pflRect(`url(#${C.id('sky')})`) + _pflC(410, 120, 60, '#ffffff', 0.4);
    b += _pflS('M-10 18 C 60 30, 120 20, 190 40 S 300 52, 350 36', '#5a3a2e', 7) + _pflS('M120 26 C 140 50, 150 62, 176 74', '#5a3a2e', 3.4) + _pflS('M240 46 C 250 66, 270 80, 300 84', '#5a3a2e', 3) + _pflS('M60 24 C 70 8, 86 2, 100 0', '#5a3a2e', 3) + _pflS('M300 44 C 320 26, 340 20, 362 16', '#5a3a2e', 2.6);
    const flower = (x, y, r, c) => { let s = ''; for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * Math.PI * 2 / 5; s += `<ellipse cx="${_pflN(x + Math.cos(a) * r * 0.62)}" cy="${_pflN(y + Math.sin(a) * r * 0.62)}" rx="${_pflN(r * 0.52)}" ry="${_pflN(r * 0.42)}" fill="${c}" transform="rotate(${Math.round(a * 57.3 + 90)} ${_pflN(x + Math.cos(a) * r * 0.62)} ${_pflN(y + Math.sin(a) * r * 0.62)})"/>`; } return s + _pflC(x, y, r * 0.24, '#ffe08a'); };
    for (const [x, y, r] of [[30, 22, 8], [70, 30, 9], [104, 18, 7], [132, 40, 9], [160, 66, 8], [180, 76, 7], [200, 38, 9], [236, 52, 8], [262, 72, 9], [296, 84, 7], [318, 40, 8], [346, 22, 9], [362, 14, 6], [88, 4, 6]]) b += flower(x, y, r, C.R() < 0.5 ? '#ffb7cc' : '#ff9ab8');
    for (let i = 0; i < 16; i++) { const x = 40 + C.R() * 430, y = 60 + C.R() * 95; b += `<ellipse cx="${_pflN(x)}" cy="${_pflN(y)}" rx="3.2" ry="1.8" fill="#ffadc4" opacity="0.85" transform="rotate(${Math.round(C.R() * 180)} ${_pflN(x)} ${_pflN(y)})"/>`; }
    return { defs, body: b };
  },
  seaside(C) {
    const defs = _pflLin(C.id('sky'), ['#9fdcff', '#e6f7ff'], 0, 0, 0, 1);
    let b = _pflRect(`url(#${C.id('sky')})`) + _pflC(410, 36, 34, '#fff3b0', 0.5) + _pflC(410, 36, 21, '#ffd75e');
    b += _pflCloud(60, 34, 0.8, '#ffffff', 0.9) + _pflCloud(240, 22, 0.55, '#ffffff', 0.85);
    b += `<rect x="0" y="88" width="480" height="40" fill="#2e9bd6"/><rect x="0" y="88" width="480" height="8" fill="#5cc3ef"/>`;
    b += _pflP('M300 88 L312 70 L312 88 Z M314 70 L314 86 L326 86 Z', '#ffffff') + _pflP('M296 88 L332 88 L326 93 L302 93 Z', '#c0492f');
    b += _pflP(_pflWave(118, 2.5, 60, 0), '#ffffff', 0.9) + _pflP(_pflWave(122, 2.5, 60, 0.6), '#f3dca0');
    for (let i = 0; i < 26; i++) b += _pflC(C.R() * 480, 128 + C.R() * 30, 0.8, '#d8b878');
    b += _pflS('M128 160 L134 110', '#7a5a3a', 2.4);
    for (let k = 0; k < 6; k++) { const a0 = Math.PI + k * Math.PI / 6, a1 = a0 + Math.PI / 6; b += _pflP(`M134 110 L${_pflN(134 + Math.cos(a0) * 34)} ${_pflN(110 + Math.sin(a0) * 20)} L${_pflN(134 + Math.cos(a1) * 34)} ${_pflN(110 + Math.sin(a1) * 20)} Z`, k % 2 ? '#ffffff' : '#e5534b'); }
    b += _pflS('M170 50 q 5 -5 10 0 q 5 -5 10 0', '#3a4a5a', 1.8) + _pflS('M200 64 q 4 -4 8 0 q 4 -4 8 0', '#3a4a5a', 1.6) + _pflS('M350 58 q 3 -3 6 0 q 3 -3 6 0', '#3a4a5a', 1.4);
    return { defs, body: b };
  },
  pumpkins(C) {
    const defs = _pflLin(C.id('sky'), ['#24133f', '#5e2a66', ['#e0703a', 0.9], ['#f2a24c', 1]], 0, 0, 0, 1) + _pflRad(C.id('moon'), '#fff3c4', 0.4);
    let b = _pflRect(`url(#${C.id('sky')})`);
    for (let i = 0; i < 20; i++) b += _pflC(C.R() * 480, C.R() * 70, 0.5 + C.R(), '#ffffff', 0.4 + C.R() * 0.5);
    b += _pflC(390, 44, 48, `url(#${C.id('moon')})`) + _pflC(390, 44, 24, '#fff3c4') + _pflC(382, 38, 4, '#e8d9a0', 0.6) + _pflC(398, 52, 3, '#e8d9a0', 0.6);
    const bat = (x, y, s) => _pflP(`M${x} ${y} q ${_pflN(-6 * s)} ${_pflN(-6 * s)} ${_pflN(-14 * s)} ${_pflN(-2 * s)} q ${_pflN(4 * s)} ${_pflN(1 * s)} ${_pflN(3 * s)} ${_pflN(5 * s)} q ${_pflN(4 * s)} ${_pflN(-3 * s)} ${_pflN(7 * s)} ${_pflN(1 * s)} l ${_pflN(2 * s)} ${_pflN(-3 * s)} l ${_pflN(2 * s)} ${_pflN(3 * s)} q ${_pflN(3 * s)} ${_pflN(-4 * s)} ${_pflN(7 * s)} ${_pflN(-1 * s)} q ${_pflN(-1 * s)} ${_pflN(-4 * s)} ${_pflN(3 * s)} ${_pflN(-5 * s)} q ${_pflN(-8 * s)} ${_pflN(-4 * s)} ${_pflN(-14 * s)} ${_pflN(2 * s)} Z`, '#1a1026');
    b += bat(300, 34, 1.2) + bat(340, 64, 0.8) + bat(210, 24, 0.9) + bat(440, 86, 0.7);
    b += _pflP(_pflRidge((x) => 122 + Math.sin(x / 60) * 6, 20), '#1f1430');
    const pump = (x, y, s, face) => {
      let p = `<ellipse cx="${_pflN(x - 9 * s)}" cy="${_pflN(y)}" rx="${_pflN(11 * s)}" ry="${_pflN(13 * s)}" fill="#e0741b"/><ellipse cx="${_pflN(x + 9 * s)}" cy="${_pflN(y)}" rx="${_pflN(11 * s)}" ry="${_pflN(13 * s)}" fill="#e0741b"/><ellipse cx="${_pflN(x)}" cy="${_pflN(y)}" rx="${_pflN(12 * s)}" ry="${_pflN(14 * s)}" fill="#f28c28"/>`;
      p += _pflS(`M${_pflN(x - 5 * s)} ${_pflN(y - 12 * s)} Q ${_pflN(x - 8 * s)} ${_pflN(y)} ${_pflN(x - 5 * s)} ${_pflN(y + 12 * s)} M${_pflN(x + 5 * s)} ${_pflN(y - 12 * s)} Q ${_pflN(x + 8 * s)} ${_pflN(y)} ${_pflN(x + 5 * s)} ${_pflN(y + 12 * s)}`, '#c45f12', 1.4 * s);
      p += _pflS(`M${_pflN(x)} ${_pflN(y - 13 * s)} q ${_pflN(1 * s)} ${_pflN(-6 * s)} ${_pflN(5 * s)} ${_pflN(-8 * s)}`, '#4f7a32', 3 * s);
      if (face) p += `<polygon points="${_pflN(x - 8 * s)},${_pflN(y - 2 * s)} ${_pflN(x - 3 * s)},${_pflN(y - 2 * s)} ${_pflN(x - 5.5 * s)},${_pflN(y - 7 * s)}" fill="#ffd36b"/><polygon points="${_pflN(x + 3 * s)},${_pflN(y - 2 * s)} ${_pflN(x + 8 * s)},${_pflN(y - 2 * s)} ${_pflN(x + 5.5 * s)},${_pflN(y - 7 * s)}" fill="#ffd36b"/>` + _pflP(`M${_pflN(x - 8 * s)} ${_pflN(y + 3 * s)} Q ${_pflN(x)} ${_pflN(y + 11 * s)} ${_pflN(x + 8 * s)} ${_pflN(y + 3 * s)} L ${_pflN(x + 4 * s)} ${_pflN(y + 5 * s)} L ${_pflN(x)} ${_pflN(y + 3 * s)} L ${_pflN(x - 4 * s)} ${_pflN(y + 5 * s)} Z`, '#ffd36b');
      return p;
    };
    b += pump(70, 132, 1.35, true) + pump(150, 140, 0.9, false) + pump(260, 136, 1.1, false) + pump(350, 134, 1.5, true) + pump(440, 142, 0.85, false);
    return { defs, body: b };
  },
  village(C) {
    const defs = _pflLin(C.id('sky'), ['#14204a', '#2c4a8a', '#5a78b8'], 0, 0, 0, 1);
    let b = _pflRect(`url(#${C.id('sky')})`);
    for (let i = 0; i < 40; i++) b += _pflC(C.R() * 480, C.R() * 90, 0.5 + C.R() * 1.1, '#ffffff', 0.4 + C.R() * 0.6);
    b += _pflC(70, 36, 15, '#f4f1e6') + _pflC(76, 31, 13, '#203260');
    b += _pflP(_pflRidge((x) => 112 + Math.sin(x / 80) * 10, 16), '#dfe8f6');
    const house = (x, y, w, h, roof, win) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${win ? '#8a4a3a' : '#6a4a6a'}"/>` + `<polygon points="${x - 4},${y} ${x + w / 2},${y - h * 0.75} ${x + w + 4},${y}" fill="${roof}"/>` + `<polygon points="${x - 4},${y} ${x + w / 2},${y - h * 0.75} ${x + w + 4},${y} ${x + w + 1},${y + 2} ${x + w / 2},${y - h * 0.75 + 4} ${x - 1},${y + 2}" fill="#ffffff"/>` + `<rect x="${x + w * 0.3}" y="${y + h * 0.3}" width="${_pflN(w * 0.4)}" height="${_pflN(h * 0.32)}" fill="#ffd27a"/>`;
    b += house(150, 104, 24, 18, '#3a2f4a', true) + house(184, 108, 18, 14, '#2f3a5a', false) + house(300, 100, 28, 20, '#3a2f4a', true) + house(336, 106, 18, 14, '#2f3a5a', true);
    for (const [x, h] of [[40, 34], [100, 26], [228, 40], [262, 28], [390, 36], [430, 26], [470, 32]]) b += _pflPine(x, 128 + Math.sin(x / 80) * 4, h);
    b += _pflP(_pflRidge((x) => 136 + Math.sin(x / 50 + 2) * 5, 16), '#eef3fb');
    for (let i = 0; i < 30; i++) b += _pflC(C.R() * 480, C.R() * 150, 0.8 + C.R() * 1.3, '#ffffff', 0.7);
    return { defs, body: b };
  },
  bunting(C) {
    const defs = _pflLin(C.id('bg'), ['#fff4e0', '#ffe3ef'], 0, 0, 1, 1);
    let b = _pflRect(`url(#${C.id('bg')})`);
    const cols = ['#ff7aa2', '#ffcf5c', '#6fcf97', '#56ccf2', '#bb6bd9', '#ff9f45'];
    for (let i = 0; i < 40; i++) b += _pflC(C.R() * 480, 60 + C.R() * 100, 1.6 + C.R() * 1.8, cols[i % cols.length], 0.65);
    for (const [y0, sag, n, off] of [[6, 30, 13, 0], [44, 26, 11, 2]]) {
      const yAt = (x) => y0 + sag * (1 - Math.pow((x - 240) / 260, 2));
      b += _pflS(`M-10 ${_pflN(yAt(-10))} Q 240 ${_pflN(y0 + sag * 2)} 490 ${_pflN(yAt(490))}`, '#8a6a52', 1.4);
      for (let i = 0; i < n; i++) { const x = 18 + i * (444 / (n - 1)), y = yAt(x); b += `<polygon points="${_pflN(x - 11)},${_pflN(y)} ${_pflN(x + 11)},${_pflN(y)} ${_pflN(x)},${_pflN(y + 22)}" fill="${cols[(i + off) % cols.length]}"/>`; }
    }
    for (const [x, y, c] of [[410, 112, '#ff7aa2'], [440, 100, '#56ccf2'], [384, 124, '#ffcf5c']]) b += _pflS(`M${x} ${y + 17} q -4 12 2 24 t -2 24`, '#8a6a52', 1) + `<ellipse cx="${x}" cy="${y}" rx="13" ry="16" fill="${c}"/>` + _pflC(x - 5, y - 6, 3, '#ffffff', 0.6) + `<polygon points="${x - 3},${y + 17} ${x + 3},${y + 17} ${x},${y + 13}" fill="${c}"/>`;
    return { defs, body: b };
  },
  /* --- animated (a still picture with reduced motion or Fun off) --- */
  leaves(C) {
    const defs = _pflLin(C.id('sky'), ['#ffe8c2', '#f9c27e', '#e98a52'], 0, 0, 0, 1);
    let b = _pflRect(`url(#${C.id('sky')})`) + _pflC(80, 30, 70, '#fff3dc', 0.5);
    b += _pflP(_pflRidge((x) => 140 + Math.sin(x / 70) * 6, 20), '#b4532a', 0.75);
    const cols = ['#d9480f', '#f08c00', '#e8590c', '#c92a2a', '#fab005', '#a0522d'];
    const leaf = (x, y, s, col, rot) => `<g transform="translate(${_pflN(x)} ${_pflN(y)}) rotate(${rot}) scale(${_pflN(s)})">` + _pflP('M0 -9 C 6 -6, 7 3, 0 9 C -7 3, -6 -6, 0 -9 Z', col) + _pflS('M0 -8 L0 10 M0 -2 L3.5 -5 M0 2 L-3.5 -1 M0 5 L3 3', '#7a2e12', 0.7, 0.6) + '</g>';
    for (let i = 0; i < 9; i++) b += leaf(20 + C.R() * 440, 142 + C.R() * 14, 0.8, cols[i % cols.length], Math.round(C.R() * 180));
    for (let i = 0; i < C.many(20); i++) {
      const x = C.R() * 480, y = 6 + C.R() * 118;
      b += _pflAnim(C, 'pfb-drift', leaf(x, y, 0.9 + C.R() * 0.7, cols[i % cols.length], Math.round(C.R() * 360)), { d: 7 + C.R() * 7, dl: C.R() * 14, y0: -20 - y, y1: 175 - y, x1: 30 + C.R() * 50, r1: 120 + C.R() * 240 });
    }
    return { defs, body: b };
  },
  bubbles(C) {
    const defs = _pflLin(C.id('sea'), ['#8fe3f0', '#1b8fb5', '#0b4f78'], 0, 0, 0, 1) + _pflLin(C.id('ray'), [['#ffffff', 0, 0.22], ['#ffffff', 1, 0]], 0, 0, 0, 1);
    let b = _pflRect(`url(#${C.id('sea')})`);
    for (const [x, w] of [[60, 40], [170, 24], [290, 50], [400, 30]]) b += `<polygon points="${x},0 ${x + w},0 ${x + w + 40},160 ${x + 30},160" fill="url(#${C.id('ray')})"/>`;
    for (const [x, h] of [[30, 50], [44, 34], [380, 60], [396, 40], [452, 46]]) b += _pflS(`M${x} 162 C ${x - 8} ${162 - h * 0.35}, ${x + 8} ${162 - h * 0.65}, ${x} ${162 - h}`, '#1f7a5a', 5, 0.9);
    b += _pflP(_pflRidge((x) => 150 + Math.sin(x / 40) * 4, 20), '#e9d6a0', 0.85);
    for (let i = 0; i < C.many(24); i++) {
      const x = C.R() * 480, y = 10 + C.R() * 140, r = 2 + C.R() * 6;
      b += _pflAnim(C, 'pfb-rise', _pflC(x, y, r, '#ffffff', 0.16, ` stroke="#ffffff" stroke-width="1" stroke-opacity="0.75"`) + _pflC(x - r * 0.35, y - r * 0.35, r * 0.25, '#ffffff', 0.8), { d: 6 + C.R() * 7, dl: C.R() * 13, y0: 170 - y, y1: -12 - y, x1: (C.R() - 0.5) * 24 });
    }
    return { defs, body: b };
  },
  snowfall(C) {
    const defs = _pflLin(C.id('sky'), ['#1d2b5a', '#34508f', '#7a96c8'], 0, 0, 0, 1);
    let b = _pflRect(`url(#${C.id('sky')})`);
    b += _pflC(400, 34, 40, '#dfe8ff', 0.12) + _pflC(400, 34, 15, '#eef2ff', 0.85);
    b += _pflP(_pflRidge((x) => 118 + Math.sin(x / 90) * 10, 16), '#c9d6ec');
    for (const [x, h] of [[52, 38], [78, 26], [100, 32], [318, 44], [346, 30], [430, 36], [456, 24]]) b += _pflPine(x, 124 + Math.sin(x / 90) * 6, h, '#2a4a5a');
    b += `<rect x="190" y="112" width="30" height="20" fill="#5a3a3a"/><polygon points="186,113 205,98 224,113" fill="#ffffff"/><rect x="198" y="118" width="8" height="7" fill="#ffd27a"/>` + _pflS('M214 98 q 4 -6 0 -12 q -4 -6 0 -12', '#ffffff', 2, 0.35);
    b += _pflP(_pflRidge((x) => 134 + Math.sin(x / 60 + 1) * 6, 16), '#eef3fb');
    for (let i = 0; i < C.many(30); i++) {
      const x = C.R() * 480, y = C.R() * 150, r = 1 + C.R() * 2.4;
      b += _pflAnim(C, 'pfb-fall', _pflC(x, y, r, '#ffffff', 0.6 + C.R() * 0.4), { d: 6 + C.R() * 8, dl: C.R() * 14, y0: -8 - y, y1: 168 - y, x1: (C.R() - 0.5) * 40 });
    }
    return { defs, body: b };
  },
  fireflies(C) {
    const defs = _pflLin(C.id('sky'), ['#0f2236', '#1d4a4f', '#2f5d3a'], 0, 0, 0, 1) + _pflRad(C.id('glow'), '#fff3a0', 0.75);
    let b = _pflRect(`url(#${C.id('sky')})`);
    for (let i = 0; i < 18; i++) b += _pflC(C.R() * 480, C.R() * 60, 0.5 + C.R() * 0.8, '#ffffff', 0.35 + C.R() * 0.4);
    // an old tree on the left (a trunk and a canopy of overlapping circles) and a fence post or two
    let tree = `<path d="M38 160 C 42 130, 40 108, 34 92 L 48 92 C 46 110, 50 132, 56 160 Z" fill="#0b1a16"/>` + _pflS('M42 104 C 30 96, 22 92, 12 94 M46 100 C 58 92, 70 90, 80 94', '#0b1a16', 4);
    for (const [cx, cy, r] of [[10, 70, 26], [36, 54, 30], [66, 66, 26], [86, 84, 18], [-6, 92, 20], [50, 84, 22], [22, 88, 20]]) tree += _pflC(cx, cy, r, '#0b1a16');
    b += tree + `<rect x="402" y="128" width="4" height="32" fill="#0b1a16"/><rect x="446" y="132" width="4" height="28" fill="#0b1a16"/>` + _pflS('M396 136 L470 140 M396 148 L470 151', '#0b1a16', 2.4);
    let grass = '';
    for (let x = 0; x < 480; x += 6) { const h = 12 + C.R() * 22; grass += `M${x} 160 Q ${_pflN(x + 2)} ${_pflN(160 - h * 0.6)} ${_pflN(x + (C.R() - 0.5) * 8)} ${_pflN(160 - h)} `; }
    b += _pflS(grass, '#0d1f1a', 2.2);
    for (let i = 0; i < C.many(22); i++) {
      const x = 20 + C.R() * 450, y = 40 + C.R() * 110;
      b += _pflAnim(C, 'pfb-firefly', _pflC(x, y, 7, `url(#${C.id('glow')})`) + _pflC(x, y, 1.6, '#fffbd0'), { d: 3 + C.R() * 4, dl: C.R() * 7, x1: (C.R() - 0.5) * 30, y1: (C.R() - 0.5) * 20 });
    }
    return { defs, body: b };
  },
  aurora(C) {
    const defs = _pflLin(C.id('sky'), ['#040a1c', '#0b1f3a', '#12324a'], 0, 0, 0, 1)
      + _pflLin(C.id('r1'), [['#4dffb0', 0, 0], ['#4dffb0', 0.45, 0.7], ['#7a5cff', 1, 0]], 0, 1, 0, 0)
      + _pflLin(C.id('r2'), [['#22d3ee', 0, 0], ['#5eead4', 0.5, 0.55], ['#c084fc', 1, 0]], 0, 1, 0, 0);
    let b = _pflRect(`url(#${C.id('sky')})`);
    for (let i = 0; i < 46; i++) b += _pflC(C.R() * 480, C.R() * 130, 0.4 + C.R() * 1, '#ffffff', 0.3 + C.R() * 0.6);
    const ribbon = (y, amp, ph, h, g, cls, d) => {
      let top = `M-20 ${_pflN(y)}`, bot = '';
      const pts = [];
      for (let x = -20; x <= 500; x += 20) pts.push([x, y + Math.sin(x / 70 + ph) * amp + Math.sin(x / 31 + ph * 2) * amp * 0.3]);
      for (const [x, yy] of pts) top += ` L${x} ${_pflN(yy)}`;
      for (const [x, yy] of pts.slice().reverse()) bot += ` L${x} ${_pflN(yy + h + Math.sin(x / 45 + ph) * 8)}`;
      return _pflAnim(C, cls, _pflP(top + bot + ' Z', `url(#${C.id(g)})`), { d, dl: C.R() * d, x1: 26 });
    };
    b += ribbon(20, 14, 0.4, 70, 'r1', 'pfb-sway', 14) + ribbon(46, 10, 2.2, 52, 'r2', 'pfb-sway2', 18) + ribbon(8, 8, 4.1, 40, 'r1', 'pfb-sway', 22);
    b += _pflP('M0 160 L0 120 L50 98 L90 116 L140 92 L200 122 L260 104 L320 124 L380 96 L430 114 L480 100 L480 160 Z', '#071226');
    b += `<rect x="0" y="138" width="480" height="22" fill="#0b2a3a" opacity="0.9"/>` + _pflS('M60 146 L180 146 M240 150 L330 150 M380 144 L450 144', '#4dffb0', 1.4, 0.35);
    return { defs, body: b };
  },
  shooting(C) {
    const defs = _pflLin(C.id('sky'), ['#070b26', '#1d1b4f', '#3a2a6b'], 0, 0, 0, 1) + _pflLin(C.id('tail'), [['#ffffff', 0, 0], ['#ffffff', 1, 0.95]], 0, 0, 1, 0);
    let b = _pflRect(`url(#${C.id('sky')})`);
    for (let i = 0; i < 80; i++) {
      const s = _pflC(C.R() * 480, C.R() * 160, 0.4 + C.R() * 1.1, '#ffffff', 0.35 + C.R() * 0.6);
      b += i % 6 === 0 ? _pflAnim(C, 'pfb-twinkle', s, { d: 2 + C.R() * 3, dl: C.R() * 4 }) : s;
    }
    for (let i = 0; i < 6; i++) b += _pflP(_pflSpark(C.R() * 480, C.R() * 150, 2.5 + C.R() * 3.5), '#fffbe8', 0.9);
    for (const [x, y, len, d, dl] of [[120, 30, 90, 6, 0.5], [330, 18, 70, 8, 3.2], [250, 72, 60, 9, 6], [420, 52, 80, 7, 1.8]]) {
      const star = `<g transform="translate(${x} ${y}) rotate(24)"><rect x="${-len}" y="-1" width="${len}" height="2" rx="1" fill="url(#${C.id('tail')})"/>${_pflC(0, 0, 2.2, '#ffffff')}</g>`;
      b += _pflAnim(C, 'pfb-shoot', star, { d, dl });
    }
    return { defs, body: b };
  },
};
_PFL_DRAW.scene = _PFL_DRAW.theme;   // the page lays the scene itself over your colour (97-profile-1core.js)

let _pflN0 = 0;
/** The banner as an <svg> string: everything from the tables (colours re-checked), nothing from outside. */
function profileBannerSvg(l, o) {
  o = o || {};
  const c = profileLookNormalize(l), def = pfBanner(c.banner) || pfBanner('theme');
  const th = _PFL_HEX.test(String(o.theme)) ? String(o.theme).toLowerCase() : '#5b5bd6';
  const cols = profileBannerCols(c, th);
  const uid = /^[A-Za-z0-9_-]{1,40}$/.test(String(o.uid || '')) ? String(o.uid) : 'pfb' + (++_pflN0).toString(36);
  const dens = o.density === 'subtle' ? 0.55 : 1;
  const C = { th, a: cols.a, b: cols.b, R: _pflRand(_pflHash(def.id + '|' + cols.a + '|' + cols.b)), motion: !!o.motion && !!def.anim, id: (k) => uid + '-' + k, many: (n) => Math.max(4, Math.round(n * dens)) };
  let art;
  try { art = (_PFL_DRAW[def.id] || _PFL_DRAW.theme)(C); } catch (e) { art = _PFL_DRAW.theme(C); }
  return `<svg class="pfb${C.motion ? ' is-moving' : ''}" viewBox="0 0 ${_PFL_W} ${_PFL_H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs>${art.defs}</defs>${art.body}</svg>`;
}

/** The nameplate's values from the tables: {font, stretch, size, weight, colour ('' = ink), gradient [hex] | null, fx}. */
function profileNameplateCss(np, themeHex) {
  const n = profileLookNormalize({ np }).np;
  const f = PF_NP_FONTS.find(x => x.id === n.font) || PF_NP_FONTS[0], w = PF_NP_WEIGHTS.find(x => x.id === n.weight) || PF_NP_WEIGHTS[2], c = PF_NP_COLS.find(x => x.id === n.col) || PF_NP_COLS[0];
  const th = _PFL_HEX.test(String(themeHex)) ? String(themeHex).toLowerCase() : '';
  const colour = c.id === 'theme' ? th : c.swatch ? _pflSwatchHex(c.swatch) : '';
  return { font: f.stack, stretch: f.stretch || '', size: f.size || 1, weight: w.w, colour, gradient: c.grad ? c.grad.slice() : null, fx: n.fx, anim: !!(PF_NP_FX.find(x => x.id === n.fx) || {}).anim };
}
