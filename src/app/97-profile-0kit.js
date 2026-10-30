/* ============================================================
   PROFILE, the avatar kit (2.17). PURE: tables and functions only; nothing is
   drawn at load and nothing here touches the DOM or the state, so Node can load
   it the way the page does (a server-side friends layer may reuse the checks).
   User request: "your own profile and name, character customise your profile
   more with whatever you want".

   WHY A KIT OF ITS OWN. The scene people (70-scene-lib-people-0figure.js,
   scenePeople.figure) are faceless side-view walkers about 62 units tall: right
   for a crowd, wrong for a face you recognise at 24 px. So the portrait (the
   avatar) is a compact flat SVG bust drawn here in the same style (the same
   skin, hair and cloth palettes, the same four tones per colour: base, shade,
   light, deep), and the full figure (profileFigureSvg) IS a scene person:
   scenePeople.figure() in your outfit, so you look like yourself in the scenes.

   AN AVATAR IS DATA, NOT MARKUP. It is a flat object of allow-listed ids (every
   part and colour is a key of the tables below; bgCol may also be '#rrggbb').
   profileAvatarNormalize() keeps only those; profileAvatarSvg() looks every
   colour up in the tables (or re-checks the hex), so nothing a friend sends is
   ever written into the markup: no SVG, HTML, URLs or text from outside.

     PF_MAX                         text limits (name 40, pronouns 24, bio 160, status 60, working on 80, places 5, badges 6)
     PF_PARTS / pfPart(k)           every part {k, tab, label, opts | colour}; opts [{id, label, level?, ach?, season?}]
     PF_TABS                        the builder's tabs
     PF_SWATCHES, PF_SKIN, PF_HAIR, PF_CLOTH, PF_EYE_COLS   the colour tables {id: {label, hex, level?}}
     PF_STATUS_EMOJI                the status emoji allow-list
     profileAvatarDefault()         the starting avatar
     profileAvatarNormalize(a)      a clean avatar: every field an allow-listed value (unknown -> the default)
     profileAvatarRandom(rnd, ok)   a random avatar; ok(k, id) says whether an option may be picked (unlocks)
     profileLockOf(k, id, ctx)      why an option is locked ('Level 12', 'Earn “…”', 'Seasonal: …') or ''
                                    ctx {game, levelMax, ach: Set, achLabel(id), collected: {'k:id': day}, today, birthday}
     profileSeasonOn(key, iso, bday) is a seasonal window open on that day
     profileText(s, max)            plain text: control, zero-width and bidi-override characters out, spaces folded, capped
     profileEmojiOk(e)              is it one of the status emoji
     profileSanitize(p, o)          a friend's (or any) profile payload, cleaned: {name, pronouns, bio, status, working,
                                    theme, avatar, badges, places, game, at}; o.badgeOk(id) filters badge ids
     profileWire(profile, o)        the body of the friends kind 'profile' (what friends get; lib/profile-avatar.mjs
                                    defines its schema on the server)
     profileFlag(cc)                'GB' -> the flag emoji
     profileAvatarSvg(a, o)         the avatar as an <svg> string. o {size, uid, theme, live: {hour, season, level, levelPct,
                                    streak}, mood: {mouth, eyes, brows, extra: 'sparkle'|'zzz'|'party'}, motion, crop: 'face'|'head'}
     profileFigureOpts(a)           the scenePeople.figure() options for the avatar's outfit (+ slots: extra palette colours)
     profileFigureSvg(a, o)         the full figure as an <svg> string ('' without the scene library); o {walk, size, crop}

   THE WARDROBE (2.18, agent 'wardrobe'). User request: "way way more clothes customisable options". The kit is
   split so each file stays readable; every file is PURE like this one and sorts BEFORE it (build.mjs sorts by
   name and '-' < '.'), so they hold function declarations and literal tables only (nothing of this file is
   touched at load). lib/profile-avatar.mjs loads all of them, in the same order.
     97-profile-0kit-1face.js     new eyes, brows, mouths, facial hair, cheeks; liner, lips, face paint, beauty marks,
                                  earrings, nose and other piercings
     97-profile-0kit-2hair.js     16 more hair styles, and dyes (highlights, ombre, tips, streak, split, peekaboo)
     97-profile-0kit-3wear.js     more tops, fabric patterns, outerwear, dresses and jumpsuits, the dungarees' bib,
                                  necklaces, ties, pins and the bag's straps on the bust
     97-profile-0kit-4acc.js      more glasses, hats, headphones and scarves
     97-profile-0kit-5figure.js   what the full scene figure wears: the mapping to scenePeople.figure() and the
                                  extra pieces drawn on it (hats, jewellery, glasses, beards, hems, heels...)
     97-profile-0kit-6looks.js    outfits (the parts of a look), the 'Surprise me' themes, quick expressions and
                                  the builder's helpers:
       PF_OUTFIT_PARTS, PF_FIGURE_PARTS, PF_LOOK_THEMES, PF_EXPRESSIONS
       profileOutfitOf(a), profileOutfitWear(a, look), profileOutfitThemed(theme, rnd, ok, a), profileLookThemes(today)
       pfPartHidden(k, a)   a colour row that means nothing now (no pattern colour without a pattern...)
       pfPairs(k, id, a)    what changes with a pick (a leather jacket comes in black the first time...)
       pfOptionArt(k, id, a, o)   the builder's tile for one option (a face, head or chest close-up, or the figure's legs or feet)
   An avatar stays a flat object of allow-listed ids: an old saved avatar (2.17) has none of the new fields and
   gets their defaults, which are all 'none' or a colour nobody sees until a part uses it, so it looks the same.
   ============================================================ */
const PF_MAX = Object.freeze({ name: 40, pronouns: 24, bio: 160, status: 60, working: 80, place: 40, places: 5, badges: 6 });
const _PF_HEX = /^#[0-9a-f]{6}$/i;
function _pfHx(c) { const n = parseInt(String(c).slice(1), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function _pfMix(a, b, t) { const A = _pfHx(a), B = _pfHx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
/** A colour as the scene people's four tones: [base, shade, light, deep]. */
function pfTone(c) { c = _PF_HEX.test(String(c)) ? c : '#888888'; return [c, _pfMix(c, '#000000', 0.28), _pfMix(c, '#ffffff', 0.25), _pfMix(c, '#000000', 0.52)]; }
const _pfSP = typeof scenePeople !== 'undefined' && scenePeople ? scenePeople : null;
const _pfCap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------- colours: the scene people's palettes, plus a few that open up with levels ---------- */
// s0..s5 are the scene people's six; s6..s11 (2.18) fill in between and at both ends. Listed light to deep.
const PF_SKIN = Object.freeze((() => {
  const base = (_pfSP && _pfSP.SKIN) || ['#f2cdb0', '#e2b08c', '#c98f68', '#a46c4a', '#7c5038', '#5a3a2a'];
  const all = base.map((hex, i) => ['s' + i, hex]).concat([['s6', '#f9e2d2'], ['s7', '#eec9a0'], ['s8', '#d2a273'], ['s9', '#b47e52'], ['s10', '#8c5836'], ['s11', '#3e261a']]);
  const lum = (h) => { const c = _pfHx(h); return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; };
  all.sort((x, y) => lum(y[1]) - lum(x[1]));
  return Object.fromEntries(all.map(([id, hex], i) => [id, Object.freeze({ label: 'Tone ' + (i + 1), hex })]));
})());
const _PF_HAIR_NAMES = ['Black', 'Dark brown', 'Brown', 'Light brown', 'Blonde', 'Grey', 'Silver', 'Auburn'];
const PF_HAIR = Object.freeze(Object.assign(Object.fromEntries(((_pfSP && _pfSP.HAIR) || ['#2a211c', '#4a3324', '#7a5434', '#b88c56', '#dcc490', '#8e8c8a', '#d4d2ce', '#7a3420'])
  .map((hex, i) => ['h' + i, Object.freeze({ label: _PF_HAIR_NAMES[i] || 'Hair ' + (i + 1), hex })])), {
  // 2.18: three more natural shades, free
  copper: Object.freeze({ label: 'Copper', hex: '#b5562b' }),
  strawberry: Object.freeze({ label: 'Strawberry blonde', hex: '#d39a68' }),
  platinum: Object.freeze({ label: 'Platinum', hex: '#ebe4d2' }),
  ruby: Object.freeze({ label: 'Ruby', hex: '#b02a3e', level: 4 }),
  pink: Object.freeze({ label: 'Pink', hex: '#e58fb5', level: 6 }),
  teal: Object.freeze({ label: 'Teal', hex: '#2a9a98', level: 8 }),
  blue: Object.freeze({ label: 'Blue', hex: '#4f7fd9', level: 10 }),
  lavender: Object.freeze({ label: 'Lavender', hex: '#b39ae0', level: 12 }),
  purple: Object.freeze({ label: 'Purple', hex: '#8a5cc7', level: 15 }),
  sunset: Object.freeze({ label: 'Sunset orange', hex: '#f0843a', level: 18 }),
  green: Object.freeze({ label: 'Green', hex: '#3fae7a', level: 20 }),
}));
const PF_CLOTH = Object.freeze(Object.assign(Object.fromEntries(Object.entries((_pfSP && _pfSP.CLOTH) || {
  navy: '#2f3d5c', denim: '#3e5a80', sky: '#86b4d8', teal: '#2f6a6e', forest: '#2e5a3e', olive: '#5f6a3a', khaki: '#9a8c5c',
  stone: '#c4b89c', camel: '#b08a5a', tan: '#9a6a40', rust: '#a8502e', red: '#b83a30', coral: '#e07a62', burgundy: '#7a2e3a',
  pink: '#d88aa0', mustard: '#c89a32', yellow: '#e2c23a', cream: '#ece4d0', white: '#f2f0ea', grey: '#8a8c90', charcoal: '#3a3c42',
  black: '#232328', tweed: '#7a6a52', plum: '#5a3a5e',
}).filter(([k]) => k !== 'sole').map(([k, hex]) => [k, Object.freeze({ label: _pfCap(k), hex })])), {
  // 2.18: more cloth colours, free (the figure paints them through its own slots: profileFigureOpts)
  oatmeal: Object.freeze({ label: 'Oatmeal', hex: '#d9ccb2' }),
  sage: Object.freeze({ label: 'Sage', hex: '#9cb59a' }),
  emerald: Object.freeze({ label: 'Emerald', hex: '#2a8a5c' }),
  turquoise: Object.freeze({ label: 'Turquoise', hex: '#3cb4b4' }),
  lightdenim: Object.freeze({ label: 'Light denim', hex: '#86a2c4' }),
  cobalt: Object.freeze({ label: 'Cobalt', hex: '#2f55b0' }),
  lemon: Object.freeze({ label: 'Lemon', hex: '#f2e27a' }),
  peach: Object.freeze({ label: 'Peach', hex: '#f2b38f' }),
  blush: Object.freeze({ label: 'Blush', hex: '#f0c4c8' }),
  chocolate: Object.freeze({ label: 'Chocolate', hex: '#5a3a28' }),
  mint: Object.freeze({ label: 'Mint', hex: '#7fcfae', level: 3 }),
  magenta: Object.freeze({ label: 'Magenta', hex: '#c8357a', level: 6 }),
  lilac: Object.freeze({ label: 'Lilac', hex: '#a98bd6', level: 8 }),
  tangerine: Object.freeze({ label: 'Tangerine', hex: '#f08a3c', level: 12 }),
  electric: Object.freeze({ label: 'Electric blue', hex: '#3b6cf6', level: 15 }),
  neon: Object.freeze({ label: 'Neon lime', hex: '#b8e835', level: 18 }),
  silver: Object.freeze({ label: 'Silver', hex: '#c4c9d1', level: 25 }),
  gold: Object.freeze({ label: 'Gold', hex: '#d4a72c', level: 40 }),
}));
/** Backgrounds and the profile's own colour. */
const PF_SWATCHES = Object.freeze(Object.fromEntries([
  ['indigo', '#5b5bd6'], ['blue', '#3b82f6'], ['sky', '#8ecae6'], ['teal', '#14b8a6'], ['green', '#4caf6a'], ['lime', '#a3cf5b'],
  ['yellow', '#f4d35e'], ['amber', '#f2a541'], ['orange', '#f08a3c'], ['red', '#e5534b'], ['pink', '#f08fb3'], ['violet', '#8b5cf6'],
  ['plum', '#7a4a8c'], ['slate', '#64748b'], ['cream', '#f3ead8'], ['charcoal', '#2f3238'],
].map(([k, hex]) => [k, Object.freeze({ label: _pfCap(k), hex })])));
const PF_EYE_COLS = Object.freeze(Object.fromEntries([['brown', '#5a3a24'], ['hazel', '#8a6a2e'], ['green', '#4f7a4a'], ['blue', '#4a74a8'], ['grey', '#7a8590'], ['dark', '#2a2124'],
  ['amber', '#a8701e'], ['lightblue', '#7fa8d6', 'Light blue'], ['teal', '#2f8a8a'], ['greygreen', '#6a7f6a', 'Grey-green'], ['black', '#1a1416'],
  ['violet', '#7a5aa8', '', 8], ['gold', '#c8a02a', '', 25]]
  .map(([k, hex, label, level]) => [k, Object.freeze(Object.assign({ label: label || _pfCap(k), hex }, level ? { level } : {}))])));
/** Jewellery, watches, buckles and the zips of a few jackets (2.18). */
const PF_METAL = Object.freeze(Object.fromEntries([['gold', '#d9b04a', 'Gold'], ['silver', '#c3c8d0', 'Silver'], ['rose', '#dd9c88', 'Rose gold'], ['copper', '#c27a4a', 'Copper'], ['black', '#2c2a30', 'Black']]
  .map(([k, hex, label]) => [k, Object.freeze({ label, hex })])));
const _PF_COLOUR_TABLES = { skin: PF_SKIN, hair: PF_HAIR, cloth: PF_CLOTH, swatch: PF_SWATCHES, eye: PF_EYE_COLS, metal: PF_METAL };

/* ---------- seasons (seasonal items: once collected in season they are yours for good) ---------- */
const PF_SEASONS = Object.freeze({
  halloween: { from: '10-15', to: '11-05', label: 'around Halloween (15 Oct to 5 Nov)' },
  december: { from: '12-01', to: '12-31', label: 'in December' },
  festive: { from: '12-01', to: '01-06', label: 'from 1 December to 6 January' },
  spring: { from: '03-01', to: '05-31', label: 'in spring (March to May)' },
  summer: { from: '06-01', to: '08-31', label: 'in summer (June to August)' },
  birthday: { label: 'in the week of your birthday' },
});
function profileSeasonOn(key, iso, birthday) {
  const s = PF_SEASONS[key];
  if (!s || typeof iso !== 'string' || iso.length < 10) return false;
  if (key === 'birthday') {
    if (typeof birthday !== 'string' || !/^\d{2}-\d{2}$/.test(birthday)) return false;
    const y = Number(iso.slice(0, 4)), t = Date.parse(iso.slice(0, 10) + 'T12:00:00Z');
    return [y - 1, y, y + 1].some(yy => Math.abs(Date.parse(yy + '-' + birthday + 'T12:00:00Z') - t) <= 3 * 86400000);
  }
  const md = iso.slice(5, 10);
  return s.from <= s.to ? md >= s.from && md <= s.to : md >= s.from || md <= s.to;
}

/* ---------- parts ---------- */
const PF_TABS = Object.freeze([['face', 'Face', 'user-round'], ['details', 'Details', 'sparkle'], ['hair', 'Hair', 'sparkles'], ['outfit', 'Tops', 'shirt'],
  ['layers', 'Layers', 'layers'], ['lower', 'Bottoms', 'ruler'], ['jewel', 'Jewellery', 'gem'], ['extras', 'Accessories', 'glasses'], ['scene', 'Background', 'image']]);
const _pfO = (list) => Object.freeze(list.map(([id, label, x]) => Object.freeze(Object.assign({ id, label }, x || {}))));
// Parts with `figure` show on the full scene figure only (the builder tags them); parts whose first option is 'none' are
// optional (Randomise leaves most of them off). Every new option of 2.18 is drawn in the 0kit-* files (see the header).
const PF_PARTS = Object.freeze([
  { k: 'skin', tab: 'face', label: 'Skin', colour: 'skin' },
  { k: 'eyes', tab: 'face', label: 'Eyes', opts: _pfO([['dot', 'Dots'], ['round', 'Round'], ['almond', 'Almond'], ['happy', 'Happy'], ['closed', 'Content'], ['wide', 'Wide'], ['glance', 'Side glance'],
    ['focused', 'Focused'], ['lashes', 'Lashes'], ['sleepy', 'Sleepy'], ['wink', 'Wink'], ['sparkle', 'Sparkly', { level: 4 }],
    ['stars', 'Starry', { level: 20 }], ['hearts', 'Hearts', { ach: 'streak-30' }]]) },
  { k: 'eyeCol', tab: 'face', label: 'Eye colour', colour: 'eye' },
  { k: 'brows', tab: 'face', label: 'Brows', opts: _pfO([['soft', 'Soft'], ['straight', 'Straight'], ['arched', 'Arched'], ['thick', 'Thick'], ['bushy', 'Bushy'], ['thin', 'Thin'],
    ['raised', 'Raised'], ['curious', 'Curious'], ['angled', 'Determined'], ['slit', 'Brow slit'], ['none', 'None']]) },
  { k: 'mouth', tab: 'face', label: 'Mouth', opts: _pfO([['smile', 'Smile'], ['small', 'Soft smile'], ['grin', 'Grin'], ['beam', 'Beaming'], ['laugh', 'Laugh'], ['teeth', 'Toothy'],
    ['gap', 'Gap-tooth'], ['neutral', 'Calm'], ['smirk', 'Smirk'], ['cat', 'Cat smile'], ['open', 'Oh'], ['kiss', 'Kiss'],
    ['whistle', 'Whistling', { level: 7 }], ['tongue', 'Cheeky', { level: 5 }]]) },
  { k: 'facial', tab: 'face', label: 'Facial hair', opts: _pfO([['none', 'None'], ['stubble', 'Stubble'], ['moustache', 'Moustache'], ['pencil', 'Pencil moustache'], ['chevron', 'Chevron'],
    ['goatee', 'Goatee'], ['soul', 'Soul patch'], ['anchor', 'Anchor'], ['chin', 'Chinstrap'], ['chops', 'Sideburns'], ['beard', 'Short beard'], ['full', 'Full beard'],
    ['handlebar', 'Handlebar', { level: 10 }], ['long', 'Long beard', { level: 15 }], ['braided', 'Braided beard', { level: 25 }]]) },
  { k: 'marks', tab: 'face', label: 'Cheeks', opts: _pfO([['none', 'Plain'], ['blush', 'Blush'], ['rosy', 'Rosy'], ['sunkissed', 'Sun-kissed'], ['freckles', 'Freckles'], ['lots', 'Lots of freckles'],
    ['both', 'Blush and freckles'], ['dimples', 'Dimples'], ['hearts', 'Heart blush', { level: 9 }]]) },
  // ── details (2.18) ──
  { k: 'liner', tab: 'details', label: 'Liner and lashes', opts: _pfO([['none', 'None'], ['winged', 'Winged'], ['lashes', 'Lashes'], ['smoky', 'Smoky'], ['dots', 'Dotted'],
    ['glitter', 'Glitter', { level: 8 }], ['graphic', 'Graphic', { level: 14 }]]) },
  { k: 'lips', tab: 'details', label: 'Lips', opts: _pfO([['none', 'Natural'], ['gloss', 'Gloss'], ['nude', 'Nude'], ['rose', 'Rose'], ['coral', 'Coral'], ['red', 'Red'], ['berry', 'Berry'],
    ['plum', 'Plum'], ['black', 'Black', { level: 10 }]]) },
  { k: 'paint', tab: 'details', label: 'Face paint', opts: _pfO([['none', 'None'], ['whiskers', 'Whiskers'], ['heart', 'Heart'], ['star', 'Star'], ['rainbow', 'Rainbow'], ['stripes', 'Game day'],
    ['glitter', 'Glitter'], ['bolt', 'Lightning', { level: 6 }], ['butterfly', 'Butterfly', { level: 11 }], ['tiger', 'Tiger', { level: 18 }],
    ['flowers', 'Spring flowers', { season: 'spring' }], ['skull', 'Sugar skull', { season: 'halloween' }], ['pumpkin', 'Pumpkin', { season: 'halloween' }],
    ['snowflake', 'Snowflake', { season: 'december' }]]) },
  { k: 'beauty', tab: 'details', label: 'Beauty mark', opts: _pfO([['none', 'None'], ['cheek', 'Cheek'], ['lip', 'Above the lip'], ['eye', 'By the eye'], ['chin', 'Chin']]) },
  { k: 'hair', tab: 'hair', label: 'Style', opts: _pfO([['short', 'Short'], ['crop', 'Crop'], ['side', 'Side part'], ['fringe', 'Fringe'], ['curtains', 'Curtains'], ['quiff', 'Quiff'],
    ['slick', 'Slicked back'], ['undercut', 'Undercut'], ['spiky', 'Spiky'], ['pixie', 'Pixie'], ['curly', 'Curly'], ['afro', 'Afro'], ['hightop', 'High top'],
    ['puffs', 'Afro puffs'], ['cornrows', 'Cornrows'], ['locs', 'Locs'], ['boxbraids', 'Box braids'], ['bob', 'Bob'], ['shag', 'Shag'], ['mullet', 'Mullet'],
    ['long', 'Long'], ['wavy', 'Wavy'], ['sweep', 'Side-swept'], ['halfup', 'Half up'], ['pony', 'Ponytail'], ['pigtails', 'Pigtails'], ['bun', 'Bun'],
    ['topknot', 'Top knot'], ['braids', 'Braids'], ['buzz', 'Buzz cut'], ['bald', 'Bald'],
    ['buns', 'Space buns', { level: 6 }], ['mohawk', 'Mohawk', { level: 12 }]]) },
  { k: 'hairCol', tab: 'hair', label: 'Colour', colour: 'hair' },
  { k: 'dye', tab: 'hair', label: 'Dye', opts: _pfO([['none', 'None'], ['highlights', 'Highlights'], ['ombre', 'Ombré'], ['tips', 'Dipped tips'], ['streak', 'Streak'],
    ['peekaboo', 'Peekaboo'], ['split', 'Split dye', { level: 5 }]]) },
  { k: 'dyeCol', tab: 'hair', label: 'Dye colour', colour: 'hair' },
  { k: 'top', tab: 'outfit', label: 'Top', opts: _pfO([['tee', 'T-shirt'], ['vneck', 'V-neck'], ['henley', 'Henley'], ['polo', 'Polo'], ['shirt', 'Shirt'], ['blouse', 'Blouse'],
    ['ruffle', 'Ruffle blouse'], ['tank', 'Vest top'], ['bardot', 'Off-shoulder'], ['sweat', 'Sweatshirt'], ['jumper', 'Jumper'], ['turtle', 'Roll neck'],
    ['cardigan', 'Cardigan'], ['hoodie', 'Hoodie'], ['rugby', 'Rugby shirt'], ['jersey', 'Sports jersey'], ['kurta', 'Kurta'], ['kimono', 'Kimono'],
    ['jacket', 'Jacket'], ['coat', 'Coat'], ['parka', 'Parka'], ['sailor', 'Sailor top', { level: 10 }], ['lab', 'Lab coat', { level: 10 }],
    ['festive', 'Festive jumper', { season: 'festive' }]]) },
  { k: 'topCol', tab: 'outfit', label: 'Top colour', colour: 'cloth' },
  { k: 'top2Col', tab: 'outfit', label: 'Inner layer and trim', colour: 'cloth' },
  { k: 'pattern', tab: 'outfit', label: 'Pattern', opts: _pfO([['none', 'Plain'], ['stripes', 'Stripes'], ['pinstripe', 'Pinstripe'], ['gingham', 'Gingham'], ['tartan', 'Tartan'],
    ['polka', 'Polka dots'], ['floral', 'Floral'], ['stars', 'Stars'], ['hearts', 'Hearts'], ['zigzag', 'Zigzag'], ['block', 'Colour block'], ['raglan', 'Two-tone'],
    ['tiedye', 'Tie-dye', { level: 3 }], ['camo', 'Camo', { level: 5 }], ['leopard', 'Leopard', { level: 7 }],
    ['tropical', 'Tropical', { season: 'summer' }], ['bats', 'Bats', { season: 'halloween' }], ['snow', 'Snowflakes', { season: 'december' }]]) },
  { k: 'patCol', tab: 'outfit', label: 'Pattern colour', colour: 'cloth' },
  // ── layers (2.18): a jacket or coat over the top, or a dress or jumpsuit instead of it ──
  { k: 'outer', tab: 'layers', label: 'Outerwear', opts: _pfO([['none', 'None'], ['denim', 'Denim jacket'], ['leather', 'Leather jacket'], ['blazer', 'Blazer'], ['bomber', 'Bomber'],
    ['fleece', 'Fleece'], ['puffer', 'Puffer'], ['gilet', 'Gilet'], ['raincoat', 'Raincoat'], ['trench', 'Trench coat'], ['robe', 'Dressing gown'],
    ['apron', 'Apron', { level: 4 }], ['hivis', 'Hi-vis vest', { level: 6 }], ['varsity', 'Varsity jacket', { level: 8 }], ['cape', 'Cape', { level: 22 }]]) },
  { k: 'outerCol', tab: 'layers', label: 'Outerwear colour', colour: 'cloth' },
  { k: 'dress', tab: 'layers', label: 'Dress or jumpsuit', opts: _pfO([['none', 'None'], ['sundress', 'Sundress'], ['tea', 'Tea dress'], ['wrap', 'Wrap dress'], ['shirtdress', 'Shirt dress'],
    ['slip', 'Slip dress'], ['knit', 'Jumper dress'], ['pinafore', 'Pinafore'], ['jumpsuit', 'Jumpsuit'], ['gown', 'Party gown', { level: 30 }]]) },
  { k: 'dressCol', tab: 'layers', label: 'Dress colour', colour: 'cloth' },
  { k: 'bottom', tab: 'lower', label: 'Bottoms', opts: _pfO([['jeans', 'Jeans'], ['trousers', 'Trousers'], ['chinos', 'Chinos'], ['cargo', 'Cargo trousers'], ['wide', 'Wide-leg'],
    ['joggers', 'Joggers'], ['leggings', 'Leggings'], ['shorts', 'Shorts'], ['skirt', 'Skirt'], ['pleated', 'Pleated skirt'], ['midi', 'Midi skirt'], ['dungarees', 'Dungarees']]), figure: true },
  { k: 'bottomCol', tab: 'lower', label: 'Bottoms colour', colour: 'cloth', figure: true },
  { k: 'shoes', tab: 'lower', label: 'Shoes', opts: _pfO([['trainer', 'Trainers'], ['hightops', 'High-tops'], ['platforms', 'Platforms'], ['shoe', 'Shoes'], ['loafers', 'Loafers'],
    ['flats', 'Ballet flats'], ['heels', 'Heels'], ['boot', 'Boots'], ['chelsea', 'Chelsea boots'], ['hiking', 'Hiking boots'], ['wellies', 'Wellies'], ['sandal', 'Sandals'],
    ['slippers', 'Slippers']]), figure: true },
  { k: 'shoesCol', tab: 'lower', label: 'Shoes colour', colour: 'cloth', figure: true },
  { k: 'build', tab: 'lower', label: 'Build', opts: _pfO([['average', 'Average'], ['slim', 'Slim'], ['broad', 'Broad'], ['stout', 'Stout']]), figure: true },
  // ── jewellery (2.18) ──
  { k: 'earrings', tab: 'jewel', label: 'Earrings', opts: _pfO([['none', 'None'], ['studs', 'Studs'], ['hoops', 'Hoops'], ['bighoops', 'Big hoops'], ['pearls', 'Pearls'], ['drops', 'Drops'],
    ['stars', 'Stars'], ['moons', 'Moons'], ['cuff', 'Ear cuff'], ['feathers', 'Feathers', { level: 5 }], ['cherries', 'Cherries', { level: 9 }]]) },
  { k: 'necklace', tab: 'jewel', label: 'Necklace', opts: _pfO([['none', 'None'], ['chain', 'Chain'], ['pendant', 'Heart pendant'], ['locket', 'Locket'], ['pearls', 'Pearls'],
    ['choker', 'Choker'], ['beads', 'Beads'], ['layered', 'Layered'], ['shell', 'Shells', { season: 'summer' }], ['medal', 'Gold medal', { ach: 'done-250' }]]) },
  { k: 'nose', tab: 'jewel', label: 'Nose', opts: _pfO([['none', 'None'], ['stud', 'Nose stud'], ['hoop', 'Nose ring'], ['septum', 'Septum']]) },
  { k: 'piercing', tab: 'jewel', label: 'Piercings', opts: _pfO([['none', 'None'], ['brow', 'Eyebrow'], ['lip', 'Lip ring'], ['ear', 'Ear bar'], ['browlip', 'Brow and lip']]) },
  { k: 'metal', tab: 'jewel', label: 'Metal', colour: 'metal' },
  { k: 'watch', tab: 'jewel', label: 'Watch', opts: _pfO([['none', 'None'], ['classic', 'Classic'], ['smart', 'Smart watch'], ['sport', 'Sports watch'], ['bangle', 'Bangles']]), figure: true },
  { k: 'pin', tab: 'jewel', label: 'Pin badge', opts: _pfO([['none', 'None'], ['star', 'Star'], ['heart', 'Heart'], ['rainbow', 'Rainbow'], ['flower', 'Flower'], ['leaf', 'Leaf'],
    ['planet', 'Planet'], ['coffee', 'Coffee'], ['smiley', 'Smiley'], ['bolt', 'Bolt'], ['bee', 'Bee'],
    ['sun', 'Sunrise', { ach: 'early-bird' }], ['owl', 'Owl', { ach: 'night-owl' }], ['flame', 'Flame', { ach: 'streak-7' }],
    ['fish', 'Fish pin', { ribbon: 'first-catch' }], ['butterfly', 'Butterfly pin', { ribbon: 'first-bug' }],   // 2.22: garden ribbons (94-garden-0catalog.js)
    ['beebadge', 'Bee badge', { craft: 'bee-badge' }], ['trowelbadge', 'Trowel badge', { craft: 'trowel-badge' }], ['sunbadge', 'Sunflower badge', { craft: 'sun-badge' }]]) },   // 2.23: made at the crafting bench
  { k: 'glasses', tab: 'extras', label: 'Glasses', opts: _pfO([['none', 'None'], ['round', 'Round'], ['square', 'Square'], ['rect', 'Narrow'], ['wire', 'Wire rims'], ['browline', 'Browline'],
    ['cat', 'Cat-eye'], ['oversized', 'Oversized'], ['aviator', 'Aviators'], ['half', 'Half-moons'], ['sun', 'Sunglasses'], ['aviatorsun', 'Aviator shades'],
    ['roundsun', 'Round sunnies'], ['mirror', 'Mirrored shades'], ['sport', 'Sport shades'], ['3d', '3D glasses', { level: 9 }],
    ['heart', 'Heart shades', { level: 16 }], ['starsun', 'Star shades', { level: 22 }], ['monocle', 'Monocle', { level: 30 }]]) },
  { k: 'glassesCol', tab: 'extras', label: 'Frame colour', colour: 'cloth' },
  { k: 'hat', tab: 'extras', label: 'Hat', opts: _pfO([['none', 'None'], ['beanie', 'Beanie'], ['slouch', 'Slouchy beanie'], ['bearbeanie', 'Bear beanie'], ['cap', 'Cap'], ['backcap', 'Cap, backwards'],
    ['bucket', 'Bucket hat'], ['beret', 'Beret'], ['flatcap', 'Flat cap'], ['fedora', 'Fedora'], ['sunhat', 'Sun hat'], ['cowboy', 'Cowboy hat'], ['visor', 'Visor'],
    ['headband', 'Headband'], ['bandana', 'Bandana'], ['trapper', 'Trapper hat'], ['headscarf', 'Headscarf'], ['turban', 'Turban'],
    ['grad', 'Graduation cap', { ach: 'done-100' }], ['halo', 'Halo', { ach: 'streak-60' }], ['chef', 'Chef’s hat', { level: 12 }], ['tophat', 'Top hat', { level: 18 }],
    ['wizard', 'Wizard hat', { level: 25 }], ['crown', 'Crown', { level: 40 }],
    ['witch', 'Witch hat', { season: 'halloween' }], ['horns', 'Little horns', { season: 'halloween' }], ['santa', 'Santa hat', { season: 'december' }],
    ['antlers', 'Antlers', { season: 'festive' }], ['flowers', 'Flower crown', { season: 'spring' }], ['bunny', 'Bunny ears', { season: 'spring' }],
    ['party', 'Party hat', { season: 'birthday' }],
    ['anglerhat', 'Angler’s hat', { ribbon: 'angler' }], ['pith', 'Explorer’s helmet', { ribbon: 'bug-catcher' }],   // 2.22: garden ribbons
    ['flowercrown', 'Daisy crown', { craft: 'flower-crown' }], ['strawhat', 'Straw hat', { craft: 'straw-hat' }], ['leafwreath', 'Herb wreath', { craft: 'herb-wreath' }], ['wildcirclet', 'Meadow circlet', { craft: 'meadow-circlet' }], ['beekeeper', 'Beekeeper’s hat', { craft: 'beekeeper-hat' }]]) },   // 2.23: made at the crafting bench
  { k: 'hatCol', tab: 'extras', label: 'Hat colour', colour: 'cloth' },
  { k: 'headphones', tab: 'extras', label: 'Headphones', opts: _pfO([['none', 'None'], ['over', 'Headphones'], ['buds', 'Earbuds'], ['gaming', 'Headset'], ['muffs', 'Ear muffs'],
    ['cat', 'Cat ears', { level: 12 }]]) },
  { k: 'headphonesCol', tab: 'extras', label: 'Headphones colour', colour: 'cloth' },
  { k: 'scarf', tab: 'extras', label: 'Scarf', opts: _pfO([['none', 'None'], ['plain', 'Plain'], ['striped', 'Striped'], ['chunky', 'Chunky knit'], ['tartan', 'Tartan'], ['silk', 'Silk scarf'],
    ['bandana', 'Neckerchief'], ['rainbow', 'Rainbow', { level: 7 }], ['gardenscarf', 'Gardener’s scarf', { craft: 'gardener-scarf' }], ['daisychain', 'Daisy chain', { craft: 'daisy-chain' }]]) },
  { k: 'scarfCol', tab: 'extras', label: 'Scarf colour', colour: 'cloth' },
  { k: 'scarf2Col', tab: 'extras', label: 'Stripe colour', colour: 'cloth' },
  { k: 'tie', tab: 'extras', label: 'Tie', opts: _pfO([['none', 'None'], ['tie', 'Tie'], ['skinny', 'Skinny tie'], ['bow', 'Bow tie'], ['lanyard', 'Lanyard']]) },
  { k: 'tieCol', tab: 'extras', label: 'Tie colour', colour: 'cloth' },
  { k: 'bag', tab: 'extras', label: 'Bag', opts: _pfO([['none', 'None'], ['crossbody', 'Crossbody'], ['shoulder', 'Shoulder bag'], ['backpack', 'Backpack'], ['tote', 'Tote'],
    ['messenger', 'Messenger'], ['satchel', 'Satchel'], ['bumbag', 'Bum bag']]) },
  { k: 'bagCol', tab: 'extras', label: 'Bag colour', colour: 'cloth' },
  { k: 'bg', tab: 'scene', label: 'Background', opts: _pfO([['soft', 'Soft glow'], ['solid', 'Plain'], ['sunburst', 'Sunburst'], ['dots', 'Dots'], ['stripes', 'Stripes'],
    ['sky', 'Live sky'], ['season', 'The season'], ['confetti', 'Confetti', { level: 5 }], ['stars', 'Night stars', { level: 15 }]]) },
  { k: 'bgCol', tab: 'scene', label: 'Background colour', colour: 'swatch', hex: true },
  { k: 'frame', tab: 'scene', label: 'Frame', opts: _pfO([['ring', 'Ring'], ['none', 'None'], ['double', 'Double ring'], ['level', 'Level ring'], ['streak', 'Streak flame'],
    ['stars', 'Stars', { level: 20 }], ['laurel', 'Laurels', { ach: 'done-100' }], ['gold', 'Gold', { level: 40 }]]) },
  { k: 'shape', tab: 'scene', label: 'Shape', opts: _pfO([['circle', 'Circle'], ['squircle', 'Rounded square']]) },
].map(Object.freeze));
const _PF_BY = new Map(PF_PARTS.map(p => [p.k, p]));
function pfPart(k) { return _PF_BY.get(k) || null; }
/** The options of a part: [{id, label, level?, ach?, season?, hex?}] (colour parts list their table). */
function pfOptions(k) {
  const p = pfPart(k); if (!p) return [];
  if (p.opts) return p.opts;
  const t = _PF_COLOUR_TABLES[p.colour] || {};
  return Object.entries(t).map(([id, v]) => Object.assign({ id }, v));
}
function _pfHas(k, id) {
  const p = pfPart(k); if (!p || typeof id !== 'string') return false;
  if (p.opts) return p.opts.some(o => o.id === id);
  if (p.hex && _PF_HEX.test(id)) return true;
  return Object.prototype.hasOwnProperty.call(_PF_COLOUR_TABLES[p.colour] || {}, id);
}

const PF_DEFAULT = Object.freeze({
  skin: 's1', eyes: 'dot', eyeCol: 'brown', brows: 'soft', mouth: 'smile', facial: 'none', marks: 'blush',
  hair: 'short', hairCol: 'h1',
  top: 'jumper', topCol: 'navy', top2Col: 'white', bottom: 'jeans', bottomCol: 'denim', shoes: 'trainer', shoesCol: 'white', build: 'average',
  glasses: 'none', glassesCol: 'black', hat: 'none', hatCol: 'red', headphones: 'none', headphonesCol: 'charcoal',
  scarf: 'none', scarfCol: 'mustard', scarf2Col: 'cream', bag: 'none', bagCol: 'tan',
  bg: 'soft', bgCol: 'indigo', frame: 'ring', shape: 'circle',
  // 2.18 (the wardrobe): all off, so an avatar saved before looks exactly the same
  liner: 'none', lips: 'none', paint: 'none', beauty: 'none', dye: 'none', dyeCol: 'h4', pattern: 'none', patCol: 'white',
  outer: 'none', outerCol: 'denim', dress: 'none', dressCol: 'sage', earrings: 'none', necklace: 'none', nose: 'none', piercing: 'none',
  metal: 'gold', watch: 'none', pin: 'none', tie: 'none', tieCol: 'burgundy',
});
/** What a too-long profile body leaves out first (profileWire): the smallest 2.18 details, then the bigger pieces. */
const _PF_WIRE_DROP = Object.freeze(['pin', 'beauty', 'piercing', 'nose', 'watch', 'tie', 'tieCol', 'liner', 'lips', 'paint', 'metal', 'dyeCol', 'dye',
  'patCol', 'pattern', 'necklace', 'earrings', 'dressCol', 'dress', 'outerCol', 'outer']);
function profileAvatarDefault() { return Object.assign({}, PF_DEFAULT); }
/** Every field an allow-listed value; anything else (unknown ids, markup, URLs, other types) becomes the default. */
function profileAvatarNormalize(a) {
  const src = a && typeof a === 'object' && !Array.isArray(a) ? a : {};
  const out = {};
  for (const k of Object.keys(PF_DEFAULT)) {
    const v = src[k];
    out[k] = typeof v === 'string' && _pfHas(k, v) ? (pfPart(k).hex && _PF_HEX.test(v) ? v.toLowerCase() : v) : PF_DEFAULT[k];
  }
  return out;
}
/** A random avatar. rnd() -> [0, 1); ok(k, id) -> may this be picked (unlocked); keep: {k: value} fields kept as they are. */
function profileAvatarRandom(rnd, ok, keep) {
  rnd = typeof rnd === 'function' ? rnd : Math.random;
  const can = (k, id) => (typeof ok === 'function' ? ok(k, id) : true);
  const pick = (k, w) => {
    const list = pfOptions(k).filter(o => can(k, o.id));
    if (!list.length) return PF_DEFAULT[k];
    if (w && rnd() > w) return list[0].id;   // the first option of these parts is 'none'
    const rest = w ? list.slice(1) : list;
    return (rest.length ? rest : list)[Math.floor(rnd() * (rest.length ? rest.length : list.length))].id;
  };
  const a = {};
  for (const p of PF_PARTS) a[p.k] = pick(p.k);
  Object.assign(a, { facial: pick('facial', 0.25), glasses: pick('glasses', 0.3), hat: pick('hat', 0.25), headphones: pick('headphones', 0.12),
    scarf: pick('scarf', 0.2), bag: pick('bag', 0.35), marks: pick('marks', 0.6),
    // 2.18: the new optional parts, mostly off (a random look is a look, not a costume)
    liner: pick('liner', 0.15), lips: pick('lips', 0.15), paint: pick('paint', 0.05), beauty: pick('beauty', 0.12), dye: pick('dye', 0.1),
    pattern: pick('pattern', 0.22), outer: pick('outer', 0.3), dress: pick('dress', 0.12), earrings: pick('earrings', 0.3), necklace: pick('necklace', 0.2),
    nose: pick('nose', 0.06), piercing: pick('piercing', 0.04), watch: pick('watch', 0.35), pin: pick('pin', 0.12), tie: pick('tie', 0.06) });
  // colours that sit well together: bottoms and the inner layer differ from the top; a natural hair colour most of the time
  for (let i = 0; i < 4 && a.bottomCol === a.topCol; i++) a.bottomCol = pick('bottomCol');
  for (let i = 0; i < 4 && a.top2Col === a.topCol; i++) a.top2Col = pick('top2Col');
  for (let i = 0; i < 4 && (a.outerCol === a.topCol || a.patCol === a.topCol); i++) { a.outerCol = pick('outerCol'); a.patCol = pick('patCol'); }
  if (rnd() < 0.8) { const nat = pfOptions('hairCol').filter(o => !o.level); a.hairCol = nat[Math.floor(rnd() * nat.length)].id; }
  if (rnd() < 0.7) a.frame = 'ring';
  if (keep && typeof keep === 'object') for (const k of Object.keys(keep)) if (_pfHas(k, keep[k])) a[k] = keep[k];
  return profileAvatarNormalize(a);
}
/** '' when the option can be picked, else why not. */
function profileLockOf(k, id, ctx) {
  const o = pfOptions(k).find(x => x.id === id);
  if (!o) return 'Not available';
  ctx = ctx || {};
  if (o.season) {
    if (ctx.collected && ctx.collected[k + ':' + id]) return '';
    return profileSeasonOn(o.season, ctx.today || '', ctx.birthday) ? '' : 'Seasonal: comes ' + PF_SEASONS[o.season].label;
  }
  // 2.22: a garden ribbon (ctx.ribbons is a Set of the ribbon ids you have earned; a page without a garden has none to check)
  if (o.ribbon && ctx.ribbons && !ctx.ribbons.has(o.ribbon)) return 'Earn the garden ribbon “' + ((ctx.ribbonLabel && ctx.ribbonLabel(o.ribbon)) || o.ribbon) + '”';
  if (o.craft && ctx.crafted && !ctx.crafted.has(o.craft)) return 'Make it at the crafting bench';   // 2.23
  if (!ctx.game) return '';   // no game on this page: nothing to unlock
  if (o.level && (Number(ctx.levelMax) || 1) < o.level) return 'Reach level ' + o.level;
  if (o.ach && !(ctx.ach && ctx.ach.has && ctx.ach.has(o.ach))) return 'Earn “' + ((ctx.achLabel && ctx.achLabel(o.ach)) || o.ach) + '”';
  return '';
}

/* ---------- text and emoji (everything a friend can send is checked here) ---------- */
// Out: C0 and C1 controls, line and paragraph separators, zero-width space, word joiners, the BOM, the
// interlinear annotations, and every bidi mark, embedding, override and isolate (U+061C, 200E, 200F,
// 202A-202E, 2066-2069). Zero-width joiners stay (scripts and emoji need them). Runs of 3+ combining marks are cut to 2.
const _PF_BAD = /[\u0000-\u001F\u007F-\u009F\u061C\u200B\u200E\u200F\u2028\u2029\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\uFFF9-\uFFFB]/g;
const _PF_ZALGO = /([\u0300-\u036F\u0483-\u0489\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]{2})[\u0300-\u036F\u0483-\u0489\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]+/g;
function profileText(v, max) {
  if (typeof v !== 'string' && typeof v !== 'number') return '';
  let s = String(v);
  try { s = s.normalize('NFC'); } catch (e) { /* old engine */ }
  s = s.replace(_PF_BAD, ' ').replace(_PF_ZALGO, '$1').replace(/\s+/g, ' ').trim();
  const cp = Array.from(s);
  return cp.length > (max || 80) ? cp.slice(0, max || 80).join('').trim() : s;
}
const PF_STATUS_EMOJI = Object.freeze(['🎯', '💻', '✍️', '📚', '🔬', '🧪', '🎓', '💼', '📞', '🤝', '🧠', '🛠️', '📦', '☕', '🍵', '🍕', '🏠', '🚆', '🚗', '✈️',
  '🌴', '🏖️', '🏃', '🧘', '🏋️', '🚴', '🎧', '🎮', '🎨', '🎵', '📷', '🌱', '🐱', '🐶', '🤒', '😴', '🎉', '🥳', '❤️', '🔥', '⭐', '✅', '⏳', '🌧️', '☀️',
  '❄️', '🎃', '🎄', '👋', '🙂', '😎', '🤔', '😅', '🙏']);
const _PF_EMOJI_SET = new Set(PF_STATUS_EMOJI.map(e => e.replace(/\uFE0F/g, '')));
function profileEmojiOk(e) { return typeof e === 'string' && e.length <= 8 && _PF_EMOJI_SET.has(e.replace(/\uFE0F/g, '')); }
function _pfEmoji(e) { if (!profileEmojiOk(e)) return ''; const bare = e.replace(/\uFE0F/g, ''); return PF_STATUS_EMOJI.find(x => x.replace(/\uFE0F/g, '') === bare) || ''; }
function _pfColourId(v) { return typeof v === 'string' && (Object.prototype.hasOwnProperty.call(PF_SWATCHES, v) || _PF_HEX.test(v)) ? v.toLowerCase() : ''; }
const _pfInt = (v, lo, hi) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo; };

/**
 * A profile payload (a friend's, or the one this page sends), cleaned. Only these fields survive, each
 * checked: strings are plain text (profileText) within PF_MAX, the status emoji is from the allow-list, the
 * colour is a swatch id or '#rrggbb', the avatar is profileAvatarNormalize'd, badges are ids (o.badgeOk filters
 * them: the page passes the achievements list), places are names and a two-letter country code (never
 * coordinates), the game part is numbers (its title comes from the level on the reader's side).
 */
function profileSanitize(p, o) {
  o = o || {};
  const src = p && typeof p === 'object' && !Array.isArray(p) ? p : {};
  // the wire form (docs/dev/FRIENDS.md kind 'profile': emoji, status text, until and color at the top) or this page's own (status {emoji, text, until}, theme)
  const st = src.status && typeof src.status === 'object' ? src.status : { emoji: src.emoji, text: src.status, until: src.until };
  const until = Number(st.until);
  const out = { v: 1, name: profileText(src.name, PF_MAX.name), pronouns: profileText(src.pronouns, PF_MAX.pronouns), bio: profileText(src.bio, PF_MAX.bio),
    working: profileText(src.working, PF_MAX.working), theme: _pfColourId(src.theme != null ? src.theme : src.color),
    status: { emoji: _pfEmoji(st.emoji), text: profileText(st.text, PF_MAX.status), until: Number.isFinite(until) && until > 0 ? Math.floor(until) : 0 },
    avatar: src.avatar && typeof src.avatar === 'object' ? profileAvatarNormalize(src.avatar) : null,
    badges: [], places: [], game: null, at: Number.isFinite(Number(src.at)) ? Math.max(0, Math.floor(Number(src.at))) : 0 };
  const ok = typeof o.badgeOk === 'function' ? o.badgeOk : () => true;
  const seen = new Set();
  for (const id of Array.isArray(src.badges) ? src.badges.slice(0, 20) : []) {
    const b = typeof id === 'string' ? id : id && typeof id.id === 'string' ? id.id : '';
    if (/^[a-z0-9][a-z0-9-]{0,47}$/.test(b) && !seen.has(b) && ok(b)) { seen.add(b); out.badges.push(b); }
    if (out.badges.length >= PF_MAX.badges) break;
  }
  for (const pl of Array.isArray(src.places) ? src.places.slice(0, 10) : []) {
    const label = profileText(pl && typeof pl === 'object' ? pl.label : pl, PF_MAX.place);
    const cc = pl && typeof pl.cc === 'string' && /^[A-Za-z]{2}$/.test(pl.cc) ? pl.cc.toUpperCase() : '';
    if (label) out.places.push(cc ? { label, cc } : { label });
    if (out.places.length >= PF_MAX.places) break;
  }
  if (!out.places.length && src.city) { const c = profileText(src.city, PF_MAX.place); if (c) out.places.push({ label: c }); }
  const g = src.game && typeof src.game === 'object' ? src.game : null;
  if (g) out.game = { level: _pfInt(g.level, 1, 999), streak: _pfInt(g.streak, 0, 100000), best: _pfInt(g.best, 0, 100000), xp: _pfInt(g.xp, 0, 1e9) };
  return out;
}
/**
 * What goes to friends (the 'profile' kind's body, docs/dev/FRIENDS.md section 9; lib/profile-avatar.mjs has its schema):
 * only what the person filled in for their profile. Colours travel as '#rrggbb'; places are names (and a country
 * code), never coordinates, and only with share.places; badges are achievement ids. -> body (no empty fields)
 */
function profileWire(pr, o) {
  o = o || {};
  const c = profileSanitize(pr, o);
  const sh = pr && pr.share && typeof pr.share === 'object' ? pr.share : {};
  const hex = (v) => (_PF_HEX.test(v) ? v.toLowerCase() : Object.prototype.hasOwnProperty.call(PF_SWATCHES, v) ? PF_SWATCHES[v].hex : '');
  const b = { name: c.name || profileText(o.fallbackName, PF_MAX.name) || 'Friend' };
  if (c.pronouns) b.pronouns = c.pronouns;
  if (c.bio) b.bio = c.bio;
  if (c.status.emoji) b.emoji = c.status.emoji;
  if (c.status.text) b.status = c.status.text;
  if ((c.status.emoji || c.status.text) && c.status.until) b.until = c.status.until;
  if (c.working) b.working = c.working;
  if (hex(c.theme)) b.color = hex(c.theme);
  if (pr && pr.avatar) {
    // 2.18: only the parts that differ from the default travel (a missing part IS the default on every side, 2.17
    // included), so the body stays far under the profile kind's size cap (4096) however many parts the kit has
    const av = profileAvatarNormalize(pr.avatar), out = {};
    av.bgCol = hex(av.bgCol) || PF_SWATCHES.indigo.hex;
    for (const k of Object.keys(av)) if (av[k] !== PF_DEFAULT[k] || k === 'bgCol') out[k] = av[k];
    b.avatar = out;
  }
  if (c.badges.length) b.badges = c.badges;
  if (sh.places === true && c.places.length) { b.places = c.places; b.city = c.places[0].label; }
  const at = Math.floor(Number(pr && (pr.updatedAt || pr.at)) || 0);
  if (at > 0 && at < 1e14) b.at = at;
  // the cap is on the JSON (lib/friends/core.mjs checkBody): in the very worst case (every text field full of
  // four-byte characters) the newest avatar parts go first, then places, so the card always gets through
  const PF_WIRE_MAX = 3900;
  while (JSON.stringify(b).length > PF_WIRE_MAX) {
    const k = b.avatar ? _PF_WIRE_DROP.find(x => Object.prototype.hasOwnProperty.call(b.avatar, x)) : null;
    if (k) delete b.avatar[k];
    else if (b.places && b.places.length) { b.places.pop(); if (!b.places.length) { delete b.places; delete b.city; } }
    else break;
  }
  return b;
}
/** A country code as its flag ('GB' -> the two regional indicators), '' for anything else. */
function profileFlag(cc) {
  if (typeof cc !== 'string' || !/^[A-Z]{2}$/.test(cc)) return '';
  return String.fromCodePoint(...[...cc].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

/* ---------- drawing (viewBox 0 0 100 100; the head at 50,44; light from the top left) ---------- */
const _PF_INK = '#2a2124', _PF_MOUTH = '#5a2a2e';
const _pfN = (v) => { const r = Math.round(v * 10) / 10; return String(r === 0 ? 0 : r); };
const _pfOp = (op) => (op != null && op !== 1 ? ` opacity="${_pfN(op)}"` : '');
const _pfP = (d, f, op) => `<path d="${d}" fill="${f}"${_pfOp(op)}/>`;
const _pfS = (d, c, w, op) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${_pfN(w)}" stroke-linecap="round" stroke-linejoin="round"${_pfOp(op)}/>`;
const _pfC = (x, y, r, f, op) => `<circle cx="${_pfN(x)}" cy="${_pfN(y)}" r="${_pfN(r)}" fill="${f}"${_pfOp(op)}/>`;
const _pfE = (x, y, rx, ry, f, op, rot) => `<ellipse cx="${_pfN(x)}" cy="${_pfN(y)}" rx="${_pfN(rx)}" ry="${_pfN(ry)}" fill="${f}"${_pfOp(op)}${rot ? ` transform="rotate(${_pfN(rot)} ${_pfN(x)} ${_pfN(y)})"` : ''}/>`;
/** A path mirrored about x = 50 (absolute M L Q C commands only). */
function _pfMirror(d) {
  let k = 0;
  return String(d).replace(/([MLQCZ])|(-?\d*\.?\d+)/g, (m, cmd, num) => { if (cmd) { k = 0; return cmd; } return k++ % 2 === 0 ? _pfN(100 - Number(num)) : num; });
}
const _pfBoth = (d, f, op) => _pfP(d, f, op) + _pfP(_pfMirror(d), f, op);
const _pfBothS = (d, c, w, op) => _pfS(d, c, w, op) + _pfS(_pfMirror(d), c, w, op);
function _pfStar(x, y, R, r, n) {
  const pts = [];
  for (let i = 0; i < (n || 5) * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / (n || 5), q = i % 2 ? r : R; pts.push(_pfN(x + q * Math.cos(a)) + ' ' + _pfN(y + q * Math.sin(a))); }
  return 'M' + pts.join(' L') + ' Z';
}
const _pfSpark = (x, y, r) => `M${_pfN(x)} ${_pfN(y - r)} Q${_pfN(x)} ${_pfN(y)} ${_pfN(x + r)} ${_pfN(y)} Q${_pfN(x)} ${_pfN(y)} ${_pfN(x)} ${_pfN(y + r)} Q${_pfN(x)} ${_pfN(y)} ${_pfN(x - r)} ${_pfN(y)} Q${_pfN(x)} ${_pfN(y)} ${_pfN(x)} ${_pfN(y - r)} Z`;
function _pfRand(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const _pfHexOf = (table, id, dflt) => { const t = _PF_COLOUR_TABLES[table]; const v = t && Object.prototype.hasOwnProperty.call(t, id) ? t[id].hex : null; return v || (_PF_HEX.test(String(id)) && table === 'swatch' ? String(id).toLowerCase() : dflt); };

/* the background, inside the clip */
function _pfBg(a, live, uid, small) {
  const base = _pfHexOf('swatch', a.bgCol, '#5b5bd6');
  const rect = (f, op) => `<rect width="100" height="100" fill="${f}"${_pfOp(op)}/>`;
  let s = '';
  switch (a.bg) {
    case 'solid': return rect(base);
    case 'sunburst': {
      s = rect(base);
      for (let i = 0; i < 12; i++) {
        const a0 = (i * 30) * Math.PI / 180, a1 = (i * 30 + 15) * Math.PI / 180;
        s += _pfP(`M50 56 L${_pfN(50 + 90 * Math.cos(a0))} ${_pfN(56 + 90 * Math.sin(a0))} L${_pfN(50 + 90 * Math.cos(a1))} ${_pfN(56 + 90 * Math.sin(a1))} Z`, '#ffffff', 0.13);
      }
      return s;
    }
    case 'dots': {
      s = rect(base);
      if (small) return s;
      for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) s += _pfC(8 + i * 18 + (j % 2) * 9, 8 + j * 18, 2.4, '#ffffff', 0.2);
      return s;
    }
    case 'stripes': {
      s = rect(base) + '<g transform="rotate(-30 50 50)">';
      for (let x = -70; x < 170; x += 20) s += `<rect x="${x}" y="-60" width="9" height="220" fill="#ffffff" opacity="0.12"/>`;
      return s + '</g>';
    }
    case 'confetti': {
      s = rect(base);
      const r = _pfRand(7), cols = ['#f6d35e', '#ef6f8f', '#7fcfae', '#8ecae6', '#ffffff', '#f08a3c'];
      for (let i = 0; i < (small ? 8 : 22); i++) {
        const x = r() * 100, y = r() * 100, w = 2 + r() * 2.6, rot = r() * 180;
        s += `<rect x="${_pfN(x)}" y="${_pfN(y)}" width="${_pfN(w)}" height="${_pfN(w * 0.55)}" rx="0.6" fill="${cols[i % cols.length]}" opacity="0.9" transform="rotate(${_pfN(rot)} ${_pfN(x)} ${_pfN(y)})"/>`;
      }
      return s;
    }
    case 'stars': return rect(_pfMix(base, '#0b1030', 0.72)) + _pfNight(small);
    case 'sky': {
      const h = Number.isFinite(live.hour) ? live.hour : 12;
      const night = h >= 21 || h < 5, golden = !night && (h >= 17 || h < 7);
      const top = night ? '#1c2350' : golden ? '#f39c6b' : '#7cc4ea', bot = night ? '#3a3f7a' : golden ? '#fbe3b5' : '#d8f0fb';
      s = `<defs><linearGradient id="${uid}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient></defs><rect width="100" height="100" fill="url(#${uid}s)"/>`;
      if (night) return s + _pfNight(small);
      s += _pfC(golden ? 82 : 80, golden ? 40 : 20, 8, golden ? '#ffb347' : '#ffd45a') + _pfC(golden ? 82 : 80, golden ? 40 : 20, 12, golden ? '#ffb347' : '#ffd45a', 0.25);
      if (!small && !golden) s += _pfE(22, 22, 9, 3.4, '#ffffff', 0.85) + _pfE(28, 19.6, 6, 3.6, '#ffffff', 0.85);
      return s;
    }
    case 'season': {
      s = rect(base);
      const se = live.season || 'autumn', r = _pfRand(11);
      const n = small ? 5 : 12;
      for (let i = 0; i < n; i++) {
        const x = r() * 100, y = r() * 70, k = r();
        if (se === 'winter') s += _pfC(x, y, 0.9 + k * 1.6, '#ffffff', 0.85);
        else if (se === 'spring') { for (let q = 0; q < 5; q++) { const an = q * 1.2566; s += _pfC(x + 1.6 * Math.cos(an), y + 1.6 * Math.sin(an), 1.3, '#f9c6d6', 0.95); } s += _pfC(x, y, 0.8, '#f6d35e'); }
        else if (se === 'summer') { if (i === 0) s += _pfC(84, 16, 9, '#ffd45a', 0.9) + _pfC(84, 16, 13, '#ffd45a', 0.25); }
        else s += _pfE(x, y, 2.6, 1.3, ['#e07a3c', '#c8502e', '#e2b13a'][i % 3], 0.9, k * 180);
      }
      return s;
    }
    default: {   // soft
      return `<defs><radialGradient id="${uid}g" cx="0.5" cy="0.36" r="0.72"><stop offset="0" stop-color="${_pfMix(base, '#ffffff', 0.42)}"/><stop offset="1" stop-color="${base}"/></radialGradient></defs><rect width="100" height="100" fill="url(#${uid}g)"/>`;
    }
  }
}
function _pfNight(small) {
  const r = _pfRand(3);
  let s = '';
  for (let i = 0; i < (small ? 6 : 18); i++) s += _pfC(r() * 100, r() * 62, 0.5 + r() * 0.9, '#ffffff', 0.55 + r() * 0.4);
  return s + _pfC(80, 20, 7.5, '#f6e7b0') + _pfC(83.4, 17.6, 6.4, '#1c2350', 0.92);
}

/* hair: the back (behind the neck), the strands over the shoulders, the front (over the face) */
function _pfHairBack(st, hc) {
  switch (st) {
    case 'afro': {
      let s = _pfC(50, 36, 27, hc[1]);
      for (let k = 0; k < 12; k++) { const an = k * Math.PI / 6; s += _pfC(50 + 26 * Math.cos(an), 36 + 25 * Math.sin(an), 5.6, hc[1]); }
      return s;
    }
    case 'bob': return _pfP('M27.6 47 C25.5 27 36.5 16 50 16 C63.5 16 74.5 27 72.4 47 L72.6 62.5 Q67 66.5 62.4 63.4 L37.6 63.4 Q33 66.5 27.4 62.5 Z', hc[1]);
    case 'long': case 'wavy': return _pfP('M28.4 44 C26 24 37 15.6 50 15.6 C63 15.6 74 24 71.6 44 L73 78 L27 78 Z', hc[1]);
    case 'braids': return _pfP('M28.4 44 C26 24 37 15.6 50 15.6 C63 15.6 74 24 71.6 44 L70 58 L30 58 Z', hc[1]);
    case 'pony': return _pfP('M66 27 C80 27 82.5 42 77.5 58 C75.5 64 70 67.5 68.2 63.6 C72.6 52 72.8 39 65 33 Z', hc[0]) + _pfP('M70 34 C75 40 75 50 71.4 60 C73 50 72.6 42 70 34 Z', hc[1], 0.6) + _pfC(67, 29.6, 2.2, '#e0475e');
    case 'bun': return _pfC(50, 15, 8.6, hc[0]) + _pfS('M44.6 12 Q50 8 55.4 12', hc[2], 1.2, 0.6) + _pfS('M44.4 21.4 Q50 23.6 55.6 21.4', '#e0475e', 2);
    case 'buns': return _pfC(34.6, 18.4, 7.2, hc[0]) + _pfC(65.4, 18.4, 7.2, hc[0]) + _pfS('M30.6 15.6 Q34.6 12.6 38.6 15.6', hc[2], 1, 0.6) + _pfS(_pfMirror('M30.6 15.6 Q34.6 12.6 38.6 15.6'), hc[2], 1, 0.6);
    default: return _pfHairBackMore(st, hc);   // 2.18 styles (97-profile-0kit-2hair.js)
  }
}
function _pfHairStrands(st, hc) {
  if (st === 'long') return _pfBoth('M30.4 44 C29 58 28.5 70 26 84 Q31 88 37 84.5 C35.5 72 35 60 35.6 50 Z', hc[0]) + _pfBoth('M32.6 56 C32 66 31.4 74 30 82 Q32.6 84 34.4 82.6 C33.6 74 33.4 64 33.6 56 Z', hc[1], 0.35);
  if (st === 'wavy') return _pfBoth('M30.4 44 Q27 52 30 58 Q33 64 29 70 Q25.5 77 29 85 Q33 88 37.5 84 Q34.5 77 37 71 Q39.5 64 36 58 Q34 53 35.6 48 Z', hc[0]);
  if (st === 'braids') {
    let s = '';
    for (let i = 0; i < 6; i++) { s += _pfE(33, 58 + i * 5.4, 3.3, 3.1, hc[0]) + _pfE(67, 58 + i * 5.4, 3.3, 3.1, hc[0]); s += _pfS(`M30.4 ${_pfN(58 + i * 5.4)} Q33 ${_pfN(60.6 + i * 5.4)} 35.6 ${_pfN(58 + i * 5.4)}`, hc[1], 0.7, 0.7) + _pfS(`M64.4 ${_pfN(58 + i * 5.4)} Q67 ${_pfN(60.6 + i * 5.4)} 69.6 ${_pfN(58 + i * 5.4)}`, hc[1], 0.7, 0.7); }
    return s + _pfC(33, 91.4, 1.7, '#e0475e') + _pfC(67, 91.4, 1.7, '#e0475e');
  }
  return _pfHairStrandsMore(st, hc);   // 2.18 styles
}
const _PF_CAP = 'M30.4 46 C28.5 27 38 18.5 50 18.5 C62 18.5 71.5 27 69.6 46 C68.4 40 66.5 34.5 62 31.5 C57 33.5 46 33 38.5 31 C34 34.5 31.6 40 30.4 46 Z';
const _PF_PARTED = 'M30.4 46 C28.5 27 38 18.5 50 18.5 C62 18.5 71.5 27 69.6 46 C68.6 37 63 29.6 51 27.2 L50 28.6 L49 27.2 C37 29.6 31.4 37 30.4 46 Z';
const _PF_SLEEK = 'M30.6 44 C29 26.4 38.4 18.4 50 18.4 C61.6 18.4 71 26.4 69.4 44 C68 35.6 61 29.6 50 29.6 C39 29.6 32 35.6 30.6 44 Z';
function _pfHairFront(st, hc, small) {
  if (_PF_HAIR_MORE.has(st)) return _pfHairFrontMore(st, hc, small);   // 2.18 styles
  const hi = (d, w) => (small ? '' : _pfS(d, hc[2], w || 1.4, 0.55));
  switch (st) {
    case 'bald': return small ? '' : _pfS('M38.4 27 Q44 23.2 50 23.6', '#ffffff', 2.2, 0.25);
    case 'buzz': return _pfP(_PF_CAP, hc[0], 0.55);
    case 'crop': return _pfP('M30.6 44 C29 27 38.5 19.5 50 19.5 C61.5 19.5 71 27 69.4 44 C68.4 38.5 66.4 34 62 31 C56 32.4 44 32.4 38 31 C33.6 34 31.6 38.5 30.6 44 Z', hc[0]) + hi('M40 23.6 Q46 21 52 21.4');
    case 'side': return _pfP('M30 44 C28 25 38 16 51 16 C63.5 16 72 25 70 44 C69 37 66.4 31 60 28.6 C52 28.8 43 31.6 36.6 36.4 C33.4 38.8 31.2 41.4 30 44 Z', hc[0])
      + (small ? '' : _pfS('M57.6 16.8 Q58.6 22 59.4 28.2', hc[3], 0.9, 0.7)) + hi('M38 24 Q44 19.6 52 19.4');
    case 'spiky': return _pfP('M30 42 L31 30 L35 32 L37 21 L42 26 L45 16 L50 23 L54 15 L58 24 L63 18 L65 28 L69 26 L70 42 C68 36 65 32 60 30 C54 31.5 46 31.5 40 30 C35 32 32 36 30 42 Z', hc[0]);
    case 'fringe': return _pfP('M30.4 46 C28.5 27 38 18.5 50 18.5 C62 18.5 71.5 27 69.6 46 C68.8 42.6 67.8 40.2 66.4 38.2 Q62 39.4 58 37.6 Q54 39.6 50 37.8 Q46 39.6 42 37.6 Q38 39.4 33.6 38.2 C32.2 40.2 31.2 42.6 30.4 46 Z', hc[0]) + hi('M38 24.4 Q46 20.6 54 21.4');
    case 'curly': {
      let s = '';
      for (const [x, y] of [[32, 41], [31, 33], [35.6, 25.4], [42.4, 20], [50, 18], [57.6, 20], [64.4, 25.4], [69, 33], [68, 41]]) s += _pfC(x, y, 6.4, hc[0]);
      for (const [x, y] of [[38, 31], [44.6, 29.2], [50, 28.6], [55.4, 29.2], [62, 31]]) s += _pfC(x, y, 4.4, hc[0]);
      if (!small) for (const [x, y] of [[36, 23.6], [47, 16.6], [60, 19.6]]) s += _pfS(`M${x - 2} ${y + 1} Q${x} ${y - 1.4} ${x + 2} ${y + 1}`, hc[2], 1.1, 0.6);
      return s;
    }
    case 'afro': return _pfP('M31 43 C29.6 30 38 25.5 50 25.5 C62 25.5 70.4 30 69 43 C66.6 35.6 60 31.6 50 31.6 C40 31.6 33.4 35.6 31 43 Z', hc[0]);
    case 'bob': return _pfP('M28.6 47 C27 27 37.5 17 50 17 C62.5 17 73 27 71.4 47 C70.4 41 69 37.4 67 35 C60 37.6 50 35.6 42 32 C37 35 33 38.6 30.4 47 Z', hc[0]) + hi('M38 23.4 Q46 19.6 55 20.4');
    case 'long': case 'wavy': case 'braids': return _pfP(_PF_PARTED, hc[0]) + hi('M37 25 Q42 21.4 47 20.6') + hi(_pfMirror('M37 25 Q42 21.4 47 20.6'));
    case 'pony': case 'bun': case 'buns': return _pfP(_PF_SLEEK, hc[0]) + (small ? '' : _pfS('M38 24 Q50 19 62 24', hc[2], 0.9, 0.5) + _pfS('M36 28.6 Q50 23 64 28.6', hc[1], 0.8, 0.45));
    case 'mohawk': return _pfP(_PF_CAP, hc[0], 0.35) + _pfP('M44.6 31 C43.6 21 46 11 50 8.4 C54 11 56.4 21 55.4 31 Z', hc[0]) + hi('M48 12 Q47 20 47.6 28', 1);
    default: return _pfP('M30 43 C27 24.5 38 15.6 50 15.6 C63 15.6 73 24.5 70 43 C68.6 37 66.4 32.6 61.6 29.6 C55.6 31.6 44.4 31.6 38.4 29.6 C33.6 32.6 31.4 37 30 43 Z', hc[0]) + hi('M38 21.5 Q45 18 52 18.6', 1.6);   // short
  }
}

/* the top: what sits behind the neck (hoods, fur), the body, the neckline */
/** The shoulders and chest every top is cut from (a pattern is clipped to it). */
const PF_BODY_D = 'M8 100 C8 86 19 78.5 35 75.6 Q50 80.5 65 75.6 C81 78.5 92 86 92 100 Z';
function _pfTopBack(kind, tc) {
  if (kind === 'hoodie') return _pfP('M27.5 80 Q26 64 38 61 L62 61 Q74 64 72.5 80 Q50 73 27.5 80 Z', tc[1]) + _pfP('M33 77 Q34 67 42 65 L58 65 Q66 67 67 77 Q50 72.5 33 77 Z', tc[3], 0.5);
  if (kind === 'parka') {
    const fur = '#e8dcc4';
    let s = _pfP('M28 81 Q27 66 38 62.5 L62 62.5 Q73 66 72 81 Q50 74 28 81 Z', fur);
    for (const [x, y] of [[29, 76], [30, 70], [33.5, 65.5], [38.5, 62.8], [44, 61.8], [50, 61.5], [56, 61.8], [61.5, 62.8], [66.5, 65.5], [70, 70], [71, 76]]) s += _pfC(x, y, 3, fur);
    return s + _pfP('M34 77.6 Q35 69 42 66.4 L58 66.4 Q65 69 66 77.6 Q50 73 34 77.6 Z', '#b8a888', 0.55);
  }
  return _pfTopBackMore(kind, tc);   // 2.18 tops (97-profile-0kit-3wear.js)
}
/** The top. x (2.18): {sk (the skin tones: necklines that show skin), pat (silhouette d) -> the fabric pattern clipped to it} */
function _pfTop(kind, tc, t2, small, x) {
  x = x || {};
  if (_PF_TOPS_MORE.has(kind)) return _pfTopMore(kind, tc, t2, small, x);   // 2.18 tops (97-profile-0kit-3wear.js)
  const det = (s) => (small ? '' : s);
  let s = _pfP(PF_BODY_D, tc[0]) + (x.pat ? x.pat(PF_BODY_D) : '')
    + _pfP('M12 100 C12 88 21 80.5 33 77.6 C26 82 22 90 22 100 Z', tc[2], 0.5) + _pfP('M88 100 C88 88 79 80.5 67 77.6 C74 82 78 90 78 100 Z', tc[1], 0.5)
    + det(_pfS('M24 100 L26.4 86', tc[1], 1, 0.5) + _pfS('M76 100 L73.6 86', tc[1], 1, 0.5));
  const crew = (w) => _pfS('M36.5 76.2 Q50 82.2 63.5 76.2', tc[1], w);
  const vInner = (y2, x0) => _pfP(`M${x0} 75.8 Q50 80.6 ${100 - x0} 75.8 L50 ${y2} Z`, t2[0]) + _pfS(`M${x0 + 3} 77.2 Q50 80.2 ${97 - x0} 77.2`, t2[1], 1.3, 0.8);
  switch (kind) {
    case 'tee': return s + crew(2.4);
    case 'jumper': return s + crew(3.6) + det(_pfS('M40 86 L41.4 88 L40 90 L41.4 92 L40 94 L41.4 96 L40 98', tc[1], 0.9, 0.6) + _pfS('M60 86 L58.6 88 L60 90 L58.6 92 L60 94 L58.6 96 L60 98', tc[1], 0.9, 0.6));
    case 'festive': {
      let z = crew(3.6) + _pfS('M14 91 L20 87 L26 91 L32 87 L38 91 L44 87 L50 91 L56 87 L62 91 L68 87 L74 91 L80 87 L86 91', '#f2f0ea', 2.2);
      for (let x = 20; x <= 80; x += 10) z += _pfC(x, 96, 1.3, t2[0]);
      if (!small) z += _pfP(_pfStar(50, 84.2, 2.4, 1, 5), '#f6d35e');
      return s + z;
    }
    case 'shirt': return s + _pfBoth('M37 75.4 L49.6 81.6 L44.5 88.5 L36 79 Z', tc[2]) + _pfBothS('M37 75.4 L49.6 81.6 L44.5 88.5', tc[3], 0.6, 0.6)
      + _pfS('M50 81.6 L50 100', tc[3], 0.8, 0.6) + det(_pfC(50, 87, 0.9, tc[3]) + _pfC(50, 93.4, 0.9, tc[3]));
    case 'blouse': return s + _pfBoth('M37.5 75.6 Q40 86 49.6 81.8 Q44 79.8 37.5 75.6 Z', t2[0]) + _pfBothS('M37.5 75.6 Q40 86 49.6 81.8', t2[1], 0.7, 0.7) + det(_pfC(50, 83.4, 1.2, t2[1]));
    case 'cardigan': return s + vInner(95, 40) + _pfS('M40 75.8 L50 95 L60 75.8', tc[1], 1.6) + det(_pfC(56, 83.6, 0.95, tc[3]) + _pfC(53, 89.4, 0.95, tc[3]) + _pfC(50.6, 98, 0.95, tc[3]));
    case 'hoodie': return s + crew(2.4) + _pfS('M46 80.4 L45 91', t2[0], 1.3) + _pfS('M54 80.4 L55 91', t2[0], 1.3) + _pfC(45, 91.6, 0.9, t2[1]) + _pfC(55, 91.6, 0.9, t2[1])
      + det(_pfS('M38 100 L41 92.4 L59 92.4 L62 100', tc[1], 1, 0.7));
    case 'jacket': return s + vInner(100, 42) + _pfBoth('M36 75.2 L42.2 76.6 L45.6 85 L38.4 80.5 Z', tc[2]) + _pfS('M42 76.4 L50 100', tc[3], 1.1) + _pfS('M58 76.4 L50 100', tc[3], 1.1);
    case 'coat': return s + vInner(92, 41) + _pfBoth('M36.5 75.4 L41 75.8 L50 92 L45.6 92.6 L39.8 84 L35 80.6 Z', tc[2]) + _pfBothS('M41 75.8 L50 92', tc[3], 0.6, 0.7)
      + det(_pfC(45.4, 96, 1.1, tc[3]) + _pfC(54.6, 96, 1.1, tc[3]));
    case 'parka': return s + _pfS('M50 80.6 L50 100', tc[3], 1.2) + det(_pfS('M14 90 Q50 84 86 90', tc[1], 0.9, 0.6) + _pfS('M11 97 Q50 91 89 97', tc[1], 0.9, 0.6));
    case 'lab': {
      const w = pfTone('#f4f4f2');
      let z = _pfP('M8 100 C8 86 19 78.5 35 75.6 Q50 80.5 65 75.6 C81 78.5 92 86 92 100 Z', w[0]) + _pfP('M88 100 C88 88 79 80.5 67 77.6 C74 82 78 90 78 100 Z', w[1], 0.35)
        + vInner(92, 41) + _pfBoth('M36.5 75.4 L41 75.8 L50 92 L45.6 92.6 L39.8 84 L35 80.6 Z', '#ffffff') + _pfBothS('M36.5 75.4 L41 75.8 L50 92 L45.6 92.6 L39.8 84', w[1], 0.6, 0.8);
      if (!small) z += _pfS('M60 88 L70 88 L70 96 L60 96', w[1], 0.8) + `<rect x="62.4" y="84.6" width="1.6" height="5.4" rx="0.6" fill="#3b6cf6"/>` + `<rect x="65.4" y="85.6" width="1.4" height="4.4" rx="0.6" fill="#e0475e"/>`;
      return z;
    }
    default: return s + crew(2.4);
  }
}
function _pfScarf(kind, sc, s2, small) {
  if (kind !== 'plain' && kind !== 'striped') return _pfScarfMore(kind, sc, s2, small);   // 2.18 (97-profile-0kit-4acc.js)
  let s = _pfP('M35.4 73.6 Q50 81.4 64.6 73.6 L65.6 80.6 Q50 89.4 34.4 80.6 Z', sc[0]) + _pfS('M35 80 Q50 88.4 65 80', sc[1], 1.2, 0.7)
    + _pfP('M55.4 82.4 L58.6 99 L66 97.6 L62.2 80.6 Z', sc[1]) + _pfP('M57 83 L59.6 97.6 L61.6 97.2 L59.4 82.2 Z', sc[2], 0.4);
  if (kind === 'striped') s += _pfS('M35 77.2 Q50 85 65 77.2', s2[0], 2) + _pfS('M56.8 88 L63.6 87', s2[0], 2) + _pfS('M57.8 93.6 L64.8 92.6', s2[0], 2);
  if (!small) s += _pfS('M58.8 99 L58.4 100.8 M61.2 98.6 L61 100.4 M63.6 98.2 L63.6 100', sc[1], 0.8, 0.8);
  return s;
}

/* the face */
function _pfEye(cx, kind, side, eyeHex, small) {
  if (_PF_EYES_MORE.has(kind)) return _pfEyeMore(cx, kind, side, eyeHex, small);   // 2.18 (97-profile-0kit-1face.js)
  const y = 46, o = side < 0 ? -1 : 1;
  const dot = () => _pfC(cx, y, 2.5, _PF_INK) + (small ? '' : _pfC(cx + 0.8, y - 0.9, 0.75, '#ffffff', 0.9));
  const happy = () => _pfS(`M${_pfN(cx - 3.4)} ${y + 1} Q${_pfN(cx)} ${y - 3.2} ${_pfN(cx + 3.4)} ${y + 1}`, _PF_INK, 1.7);
  switch (kind) {
    case 'round': return _pfE(cx, y, 4, 3.5, '#ffffff') + _pfC(cx + 0.3, y + 0.2, 2.3, eyeHex) + _pfC(cx + 0.3, y + 0.2, 1.1, _PF_INK) + _pfC(cx + 1.1, y - 0.7, 0.7, '#ffffff')
      + (small ? '' : _pfS(`M${_pfN(cx - 4)} ${_pfN(y - 0.6)} Q${_pfN(cx)} ${_pfN(y - 4.4)} ${_pfN(cx + 4)} ${_pfN(y - 0.6)}`, _PF_INK, 0.9, 0.7));
    case 'wide': return _pfE(cx, y, 4.4, 4.4, '#ffffff') + _pfC(cx, y + 0.3, 1.9, eyeHex) + _pfC(cx, y + 0.3, 0.9, _PF_INK) + _pfC(cx + 0.7, y - 0.5, 0.55, '#ffffff')
      + (small ? '' : `<ellipse cx="${_pfN(cx)}" cy="${y}" rx="4.4" ry="4.4" fill="none" stroke="${_PF_INK}" stroke-width="0.8" opacity="0.5"/>`);
    case 'happy': return happy();
    case 'sleepy': return _pfS(`M${_pfN(cx - 3.6)} ${_pfN(y - 0.4)} L${_pfN(cx + 3.6)} ${_pfN(y - 0.4)}`, _PF_INK, 1.4) + _pfP(`M${_pfN(cx - 2.4)} ${_pfN(y - 0.4)} Q${_pfN(cx)} ${_pfN(y + 3.2)} ${_pfN(cx + 2.4)} ${_pfN(y - 0.4)} Z`, _PF_INK);
    case 'wink': return side < 0 ? dot() : happy();
    case 'lashes': return dot() + _pfS(`M${_pfN(cx + o * 2.2)} ${_pfN(y - 1.8)} L${_pfN(cx + o * 3.8)} ${_pfN(y - 3.2)}`, _PF_INK, 0.9) + _pfS(`M${_pfN(cx + o * 0.8)} ${_pfN(y - 2.4)} L${_pfN(cx + o * 1.6)} ${_pfN(y - 4.2)}`, _PF_INK, 0.9);
    case 'stars': return _pfP(_pfStar(cx, y, 3.8, 1.6, 5), '#f2c94c') + (small ? '' : `<path d="${_pfStar(cx, y, 3.8, 1.6, 5)}" fill="none" stroke="#b8860b" stroke-width="0.5"/>`);
    case 'hearts': return _pfP(`M${_pfN(cx)} ${y + 3} C${_pfN(cx - 5)} ${_pfN(y - 0.5)} ${_pfN(cx - 3)} ${_pfN(y - 4.6)} ${_pfN(cx)} ${y - 2} C${_pfN(cx + 3)} ${_pfN(y - 4.6)} ${_pfN(cx + 5)} ${_pfN(y - 0.5)} ${_pfN(cx)} ${y + 3} Z`, '#e0475e');
    default: return dot();
  }
}
function _pfBrows(kind, col) {
  if (kind === 'none') return '';
  if (_PF_BROWS_MORE.has(kind)) return _pfBrowsMore(kind, col);   // 2.18
  const yb = kind === 'raised' ? 37.4 : 39.6;
  const d = { straight: `M38.4 ${yb} L45.6 ${yb}`, arched: `M38.2 ${_pfN(yb + 1.2)} Q41.2 ${_pfN(yb - 2.8)} 45.8 ${yb}`, angled: `M38.4 ${_pfN(yb - 1)} L45.6 ${_pfN(yb + 1)}` }[kind]
    || `M38.4 ${_pfN(yb + 0.6)} Q42 ${_pfN(yb - 1.6)} 45.6 ${_pfN(yb + 0.2)}`;
  return _pfBothS(d, col, kind === 'thick' ? 2.8 : kind === 'straight' ? 1.7 : kind === 'angled' ? 1.8 : 1.5);
}
/** The mouth; lip (2.18): a lip colour id (PF_LIPS) or '' / 'none'. */
function _pfMouth(kind, lip) {
  if (lip && lip !== 'none') return _pfMouthLips(kind, lip);   // 2.18: the mouth in a lip colour (97-profile-0kit-1face.js)
  if (_PF_MOUTHS_MORE.has(kind)) return _pfMouthMore(kind, _PF_MOUTH);
  const grin = () => _pfP('M44 56.8 Q50 65 56 56.8 Q50 58.2 44 56.8 Z', _PF_MOUTH) + _pfP('M45.6 57.6 Q50 58.8 54.4 57.6 L54 58.8 Q50 60 46 58.8 Z', '#ffffff');
  switch (kind) {
    case 'grin': return grin();
    case 'neutral': return _pfS('M46 58.6 L54 58.6', _PF_MOUTH, 1.5);
    case 'smirk': return _pfS('M45.4 58.8 Q51 60.4 55.6 56.6', _PF_MOUTH, 1.6);
    case 'open': return _pfE(50, 59, 2.3, 2.7, _PF_MOUTH) + _pfE(50, 60.5, 1.4, 0.9, '#e67a8a');
    case 'tongue': return grin() + _pfE(51.6, 61, 2.4, 1.7, '#e67a8a');
    default: return _pfS('M44.6 57.4 Q50 62.2 55.4 57.4', _PF_MOUTH, 1.6);   // smile
  }
}
const _PF_MOUSTACHE = 'M43.4 56.4 Q46.4 52.6 50 54.6 Q53.6 52.6 56.6 56.4 Q53.2 55.4 50 56.2 Q46.8 55.4 43.4 56.4 Z';
function _pfFacialBase(kind, hc) {
  if (_PF_FACIAL_MORE.has(kind)) return _pfFacialBaseMore(kind, hc);   // 2.18
  switch (kind) {
    case 'stubble': return _pfP('M32.4 50 C33.4 60 41 66.2 50 66.2 C59 66.2 66.6 60 67.6 50 C64.6 58.4 57.6 62.6 50 62.6 C42.4 62.6 35.4 58.4 32.4 50 Z', hc[0], 0.22)
      + _pfP('M44.6 55.6 Q50 53.6 55.4 55.6 L55 57 Q50 55.6 45 57 Z', hc[0], 0.22);
    case 'beard': return _pfP('M31 45.5 C31 59 39.6 68.6 50 68.6 C60.4 68.6 69 59 69 45.5 L66.8 46.6 C65.6 55.6 59.6 61.6 50 61.6 C40.4 61.6 34.4 55.6 33.2 46.6 Z', hc[0])
      + _pfP('M38 64 Q50 70 62 64 Q50 68.6 38 64 Z', hc[1], 0.5);
    case 'full': return _pfP('M30.6 44 C30.2 62 39 73.6 50 73.6 C61 73.6 69.8 62 69.4 44 L66.6 45.4 C65.8 53.6 60 59.6 50 60 C40 59.6 34.2 53.6 33.4 45.4 Z', hc[0])
      + _pfS('M40 66 Q42 69.6 44.6 71 M50 67.4 L50 72 M60 66 Q58 69.6 55.4 71', hc[1], 0.9, 0.6);
    case 'goatee': return _pfP('M46.2 61.4 Q50 60.6 53.8 61.4 Q53.8 66.6 50 67.4 Q46.2 66.6 46.2 61.4 Z', hc[0]);
    default: return '';
  }
}
function _pfFacialTop(kind, hc) {
  if (_PF_FACIAL_MORE.has(kind)) return _pfFacialTopMore(kind, hc);   // 2.18
  if (kind === 'moustache' || kind === 'beard' || kind === 'full' || kind === 'goatee') return _pfP(_PF_MOUSTACHE, hc[0]);
  if (kind === 'handlebar') return _pfP(_PF_MOUSTACHE, hc[0]) + _pfBothS('M43.6 56.2 Q40.4 56.8 40.8 53.6', hc[0], 1.4);
  return '';
}

/* extras */
function _pfGlasses(kind, gc) {
  if (_PF_GLASSES_MORE.has(kind)) return _pfGlassesMore(kind, gc);   // 2.18 (97-profile-0kit-4acc.js)
  const lens = '#ffffff';
  const bridge = _pfS('M47.4 45.2 Q50 43.6 52.6 45.2', gc, 1.3), arms = _pfBothS('M36.4 45 L31.2 44', gc, 1.3);
  const ring = (cx) => `<circle cx="${cx}" cy="46" r="5.6" fill="${lens}" fill-opacity="0.16" stroke="${gc}" stroke-width="1.5"/>`;
  switch (kind) {
    case 'round': return ring(42) + ring(58) + bridge + arms;
    case 'square': return [35.6, 52].map(x => `<rect x="${x}" y="41.4" width="12.4" height="9.2" rx="2.2" fill="${lens}" fill-opacity="0.16" stroke="${gc}" stroke-width="1.5"/>`).join('') + bridge + arms;
    case 'cat': { const d = 'M35.4 43 Q36 41 41 41.4 Q46.4 41.6 47.6 43.6 Q47.8 49.6 42 50.4 Q36.6 50.6 35.8 46.4 Q35 44.6 33.6 41.6 Q34.6 42.4 35.4 43 Z'; return [d, _pfMirror(d)].map(x => `<path d="${x}" fill="${lens}" fill-opacity="0.16" stroke="${gc}" stroke-width="1.4"/>`).join('') + bridge + arms; }
    case 'sun': { const d = 'M35.2 42 Q41 40.6 47.6 42.2 Q48 49.4 42.4 51.4 Q36 51.6 35.2 46 Z'; return [d, _pfMirror(d)].map(x => `<path d="${x}" fill="#26262e" fill-opacity="0.92" stroke="${gc}" stroke-width="1.2"/>`).join('') + _pfBothS('M38 44 L41 43.4', '#ffffff', 1, 0.4) + bridge + arms; }
    case 'heart': { const d = 'M42 51.6 C34 46 35.6 39.6 42 43 C48.4 39.6 50 46 42 51.6 Z'; return [d, _pfMirror(d)].map(x => `<path d="${x}" fill="#e0475e" fill-opacity="0.85" stroke="#a3203a" stroke-width="0.8"/>`).join('') + _pfS('M48 45 Q50 43.6 52 45', '#a3203a', 1.1) + _pfBothS('M35.8 45 L31.2 44', '#a3203a', 1.1); }
    case 'monocle': return `<circle cx="58" cy="46" r="5.8" fill="${lens}" fill-opacity="0.12" stroke="${gc}" stroke-width="1.4"/>` + _pfS('M63.4 48 Q66 56 64 64', gc, 0.7, 0.8);
    default: return '';
  }
}
function _pfHat(kind, t, small) {
  if (_PF_HATS_MORE.has(kind)) return _pfHatMore(kind, t, small);   // 2.18 (97-profile-0kit-4acc.js)
  const det = (s) => (small ? '' : s);
  switch (kind) {
    case 'beanie': {
      let s = _pfP('M28.8 41 C27.6 22 38 12.6 50 12.6 C62 12.6 72.4 22 71.2 41 Z', t[0]) + _pfP('M60 14.6 C68 18 72 28 71.2 41 L66 41 C66.6 30 64.6 21 60 14.6 Z', t[1], 0.5)
        + _pfP('M27.6 35.6 Q50 33 72.4 35.6 L72.6 42.6 Q50 45.4 27.4 42.6 Z', t[1]);
      if (!small) for (let x = 32; x <= 68; x += 4) s += _pfS(`M${x} 35.2 L${x} 43.4`, t[3], 0.7, 0.35);
      return s + _pfC(50, 11.4, 5.2, _pfMix(t[0], '#ffffff', 0.6)) + det(_pfS('M47 9 Q50 7 53 9', '#ffffff', 1, 0.6));
    }
    case 'cap': return _pfP('M30.2 38.6 C29.4 22 39 14.8 50 14.8 C61 14.8 70.6 22 69.8 38.6 Q50 35.4 30.2 38.6 Z', t[0]) + det(_pfS('M50 15 L50 36', t[1], 0.8))
      + _pfC(50, 15.4, 1.6, t[1]) + _pfP('M44 37.4 Q70 32 86 39.4 Q72 43.6 46 40.8 Z', t[1]) + _pfS('M46 39.6 Q70 36.4 84.6 39.6', t[3], 0.7, 0.5);
    case 'flatcap': return _pfP('M28 39.6 C28 28 39 20.4 52 20.4 C65 20.4 73.4 27 75.6 34.6 Q79.6 37.2 74.6 39.6 Q52 41.4 28 39.6 Z', t[0]) + _pfS('M58 37.8 Q68 36.4 75 37.2', t[3], 0.9, 0.6)
      + det(_pfC(38, 30, 0.6, t[3], 0.5) + _pfC(46, 26, 0.6, t[3], 0.5) + _pfC(56, 25, 0.6, t[3], 0.5) + _pfC(64, 29, 0.6, t[3], 0.5));
    case 'sunhat': return _pfE(50, 33.6, 34, 7.4, t[0]) + _pfE(50, 35, 30, 4.6, t[1], 0.35) + _pfP('M34.6 33.6 C34.6 19 42 13.6 50 13.6 C58 13.6 65.4 19 65.4 33.6 Z', t[0])
      + _pfP('M34.8 30 Q50 32 65.2 30 L65.4 33.6 Q50 35.6 34.6 33.6 Z', t[3]);
    case 'grad': return _pfP('M35 27 L35 34.4 Q50 38.6 65 34.4 L65 27 Q50 31 35 27 Z', '#1d1d22') + _pfP('M22 23.4 L50 13 L78 23.4 L50 33.8 Z', '#26262c') + _pfS('M22 23.4 L50 13 L78 23.4', '#4a4a52', 0.8)
      + _pfC(50, 23.4, 1.4, '#d4a72c') + _pfS('M50 23.4 L71 26 L71.6 35', '#d4a72c', 1) + _pfP('M70.2 35 L73 35 L72.2 40.4 L71 40.4 Z', '#d4a72c');
    case 'crown': return _pfP('M32.4 31 L32 15.4 L40 23 L46 10.6 L50 20.6 L54 10.6 L60 23 L68 15.4 L67.6 31 Q50 34 32.4 31 Z', '#e9b949') + _pfP('M32.4 27 Q50 30 67.6 27 L67.6 31 Q50 34 32.4 31 Z', '#d3a136')
      + _pfC(50, 28.8, 1.6, '#e0475e') + _pfC(41, 28.4, 1.2, '#3b82f6') + _pfC(59, 28.4, 1.2, '#22a06b')
      + _pfC(32, 15.4, 1.5, '#f6d77a') + _pfC(46, 10.6, 1.5, '#f6d77a') + _pfC(54, 10.6, 1.5, '#f6d77a') + _pfC(68, 15.4, 1.5, '#f6d77a');
    case 'wizard': return _pfE(50, 31.6, 27, 5.2, t[1]) + _pfP('M31.6 31 Q46 30 68.4 31 L56 4 Q52.6 0.6 49.4 3.4 Z', t[0])
      + _pfP(_pfStar(45, 20, 2.4, 1, 5), '#f6d77a') + _pfP(_pfStar(56.4, 13, 1.7, 0.7, 5), '#f6d77a') + det(_pfP(_pfStar(52, 26, 1.4, 0.6, 5), '#f6d77a'));
    case 'party': return _pfP('M39.6 27 L50 1.6 L60.4 27 Q50 29.6 39.6 27 Z', t[0]) + _pfS('M43 19 L54.6 11.6 M41.4 24.6 L58 15.4', '#ffffff', 1.8, 0.6) + _pfC(50, 2.6, 3, '#f6d77a');
    case 'witch': return _pfE(50, 31, 31, 5.6, '#26222e') + _pfP('M35.4 30.4 Q39 18 46 10 Q52 3.4 62 2.2 Q55.4 6.6 55.6 14 Q57 22 64.6 30.4 Q50 32.4 35.4 30.4 Z', '#2f2a3a')
      + _pfP('M36.6 26.4 Q50 28.6 63.2 26.4 L64.2 30 Q50 32.2 35.8 30 Z', '#f08a3c') + `<rect x="47.6" y="26.4" width="4.8" height="4" rx="0.6" fill="none" stroke="#f6d35e" stroke-width="0.9"/>`;
    case 'santa': return _pfP('M29.4 36 C30.6 18 43 10.4 56.6 12 C66 13 72 18.6 76.2 30 L78.6 36 L70.6 36 Z', '#d63a3a') + _pfP('M60 13.6 C68 16.6 73 22 76.2 30 L72 33 C69.6 24 66 18 60 13.6 Z', '#b02c2c', 0.6)
      + _pfP('M27.6 32.4 Q50 29.6 72.4 32.4 L72.6 40 Q50 42.8 27.4 40 Z', '#f6f4ef') + _pfC(79.4, 37.6, 4.6, '#f6f4ef');
    case 'flowers': {
      let s = '';
      const cols = ['#f6a5c0', '#fff4f8', '#f6d35e', '#c9a7f0', '#f6a5c0', '#fff4f8', '#f6d35e'];
      for (let i = 0; i < 7; i++) {
        const an = (200 + i * 23.3) * Math.PI / 180, x = 50 + 21 * Math.cos(an), y = 31 + 9 * Math.sin(an);
        s += _pfE(x + 3, y + 1.4, 2.2, 1, '#5f9a52', 1, 30);
        for (let q = 0; q < 5; q++) { const pa = q * 1.2566 + i; s += _pfC(x + 2.1 * Math.cos(pa), y + 2.1 * Math.sin(pa), 2.1, cols[i]); }
        s += _pfC(x, y, 1.2, '#f2b33d');
      }
      return s;
    }
    default: return '';
  }
}
function _pfHeadphones(kind, pc) {
  if (kind !== 'over' && kind !== 'cat') return _pfHeadphonesMore(kind, pc);   // 2.18 (97-profile-0kit-4acc.js)
  let s = _pfS('M29.6 44 C27.4 14 72.6 14 70.4 44', pc[0], 3.4) + _pfS('M31 38 C30 18 70 18 69 38', pc[2], 0.9, 0.5);
  if (kind === 'cat') s += _pfBoth('M34.4 25.8 L35.8 15.2 L43.4 21.4 Z', pc[0]) + _pfBoth('M36.2 22.6 L37 18.4 L40.6 21.2 Z', '#f6a5c0');
  s += `<rect x="25" y="39" width="8.4" height="14.4" rx="3.4" fill="${pc[0]}"/><rect x="66.6" y="39" width="8.4" height="14.4" rx="3.4" fill="${pc[0]}"/>`
    + `<rect x="30.8" y="40.6" width="2.8" height="11.2" rx="1.3" fill="${pc[3]}"/><rect x="66.4" y="40.6" width="2.8" height="11.2" rx="1.3" fill="${pc[3]}"/>`;
  if (kind === 'cat') s += _pfC(29.2, 46.2, 2, '#7fe0d5', 0.85) + _pfC(70.8, 46.2, 2, '#7fe0d5', 0.85);
  return s;
}
function _pfFrame(a, live, theme, small) {
  const fc = _pfHexOf('swatch', theme, '#5b5bd6');
  const sq = a.shape === 'squircle';
  const ring = (r, col, w, op, extra) => sq
    ? `<rect x="${_pfN(50 - r)}" y="${_pfN(50 - r)}" width="${_pfN(2 * r)}" height="${_pfN(2 * r)}" rx="${_pfN(Math.max(2, r * 0.54))}" fill="none" stroke="${col}" stroke-width="${_pfN(w)}"${_pfOp(op)}${extra || ''}/>`
    : `<circle cx="50" cy="50" r="${_pfN(r)}" fill="none" stroke="${col}" stroke-width="${_pfN(w)}"${_pfOp(op)}${extra || ''}/>`;
  switch (a.frame) {
    case 'none': return '';
    case 'double': return ring(48.4, fc, 2.6) + ring(44.6, fc, 1.2, 0.7);
    case 'level': {
      const pct = Math.max(0, Math.min(100, Math.round((Number(live.levelPct) || 0) * 100)));
      let s = ring(47.6, '#ffffff', 4.4, 0.5) + ring(47.6, fc, 4.4, 1, ` pathLength="100" stroke-dasharray="${pct} 100" stroke-linecap="round"${sq ? '' : ' transform="rotate(-90 50 50)"'}`);
      const lv = Math.max(1, Math.min(999, Math.floor(Number(live.level) || 0)));
      if (!small && live.level) s += `<circle cx="83" cy="83" r="11" fill="${fc}" stroke="#ffffff" stroke-width="2"/><text x="83" y="87" text-anchor="middle" font-size="${lv > 99 ? 8.5 : 11}" font-weight="700" font-family="Inter, system-ui, sans-serif" fill="#ffffff">${lv}</text>`;
      return s;
    }
    case 'streak': {
      let s = ring(48, '#f08a3c', 4) + ring(45.2, '#f6d35e', 1.2, 0.8);
      if (!small && (Number(live.streak) || 0) >= 3) s += _pfP('M50 99 C43 99 41 92 45 87 C45.6 90 47 91 48 90.6 C46.6 86 49 82 53 80 C52 84 55 86 56 88.6 C59 93 56.4 99 50 99 Z', '#f08a3c') + _pfP('M50 98 C47 98 46 95 47.6 92.6 C48.4 94 49.6 94 50 93 C50 91 51.4 89.4 52.6 88.6 C52.6 91 54.6 92.6 54.4 94.6 C54.4 96.6 52.6 98 50 98 Z', '#f6d35e');
      return s;
    }
    case 'gold': {
      let s = ring(48, '#d4a72c', 4.4) + ring(45.4, '#f6d77a', 1);
      if (!small) for (const [x, y] of [[50, 2], [98, 50], [50, 98], [2, 50]]) s += _pfP(`M${x} ${y - 3} L${x + 3} ${y} L${x} ${y + 3} L${x - 3} ${y} Z`, '#f6d77a');
      return s;
    }
    case 'laurel': {
      let s = ring(48.6, fc, 1.6);
      for (let i = 0; i < 7; i++) for (const side of [-1, 1]) {
        const deg = 90 + side * (28 + i * 17), an = deg * Math.PI / 180, x = 50 + 44 * Math.cos(an), y = 50 + 44 * Math.sin(an);
        s += _pfE(x, y, 4.2, 1.9, i % 2 ? '#9aa83a' : '#7d8f2c', 1, deg + side * 60);
      }
      return s;
    }
    case 'stars': {
      let s = ring(48, fc, 3);
      if (!small) for (let i = 0; i < 6; i++) { const an = (-90 + i * 60) * Math.PI / 180; s += _pfP(_pfStar(50 + 47 * Math.cos(an), 50 + 47 * Math.sin(an), 4, 1.7, 5), '#f6d77a'); }
      return s;
    }
    default: return ring(48, fc, 4);   // ring
  }
}

/** The head's outline (the portrait's egg). */
const PF_HEAD_D = 'M50 22 C61.5 22 69.4 30.5 69.4 43.5 C69.4 56.5 61 66.2 50 66.2 C39 66.2 30.6 56.5 30.6 43.5 C30.6 30.5 38.5 22 50 22 Z';
/** The builder's close-ups (no frame): o.crop -> the viewBox. */
const _PF_CROPS = Object.freeze({ face: '27 26 46 46', head: '12 0 76 76', chest: '27 55 46 46', ears: '22 30 56 56', bust: '4 6 92 92', upper: '20 40 60 60' });
/**
 * The avatar as an <svg> string (every value comes from the tables: see the header).
 * o: {size (px, default 64), uid (unique per drawing on a page: gradients and the clip), theme (the frame colour,
 *     a swatch id or hex), live: {hour, season, level, levelPct, streak}, mood: {mouth, eyes, brows, extra},
 *     motion (blink: false when reduced motion is on), cls, crop: 'face' | 'head' | 'chest' | 'ears' | 'bust' | 'upper' (a close-up, no frame),
 *     layers: true -> no <svg>, no background, clip or frame: {back, outerback, hairback, neck, body, strands, scarf, ears, skull, face, hair, glasses, hat, phones, extra} (strings, this
 *     same drawing cut at its seams, in portrait units: 94-garden-art-g-player.js stands them on a body, so the garden's person IS the portrait)}
 * Layers, back to front: the background; hoods and collars behind the neck; the back of the hair; the neck; the top
 * (or the dress) with its pattern; the dungarees' bib, necklace, tie; outerwear; pin; bag straps; hair over the
 * shoulders; scarf; ears and earrings; the face (cheeks, marks, paint, make-up, eyes, brows, mouth, piercings);
 * the hair over the face; glasses, hat, headphones; the mood's extras; the frame.
 */
function profileAvatarSvg(a0, o) {
  o = o || {};
  const a = profileAvatarNormalize(a0);
  const size = Math.max(12, Math.min(512, Math.round(Number(o.size) || 64)));
  const small = size < 30, uid = String(o.uid || 'pfa').replace(/[^A-Za-z0-9_-]/g, '') || 'pfa';
  const live = o.live && typeof o.live === 'object' ? o.live : {}, mood = o.mood && typeof o.mood === 'object' ? o.mood : {};
  const pick = (k, v) => (typeof v === 'string' && _pfHas(k, v) ? v : a[k]);
  const eyes = pick('eyes', mood.eyes), mouth = pick('mouth', mood.mouth), brows = pick('brows', mood.brows);
  const sk = pfTone(_pfHexOf('skin', a.skin, '#e2b08c')), hc = pfTone(_pfHexOf('hair', a.hairCol, '#4a3324'));
  const tc = pfTone(_pfHexOf('cloth', a.topCol, '#2f3d5c')), t2 = pfTone(_pfHexOf('cloth', a.top2Col, '#f2f0ea'));
  const eyeHex = _pfHexOf('eye', a.eyeCol, '#5a3a24');
  const scarfOn = a.hat === 'headscarf';
  const hatT = pfTone(_pfHexOf('cloth', a.hatCol, '#b83a30'));
  // 2.18: the wardrobe's layers and colours
  const hc2 = pfTone(_pfHexOf('hair', a.dyeCol, '#dcc490')), mt = pfTone(_pfHexOf('metal', a.metal, '#d9b04a'));
  const dressOn = a.dress !== 'none', overTop = a.dress === 'pinafore';
  const dc = pfTone(_pfHexOf('cloth', a.dressCol, '#9cb59a')), oc = pfTone(_pfHexOf('cloth', a.outerCol, '#3e5a80'));
  const pc = pfTone(_pfHexOf('cloth', a.patCol, '#f2f0ea')), bc = pfTone(_pfHexOf('cloth', a.bottomCol, '#3e5a80'));
  const crop = Object.prototype.hasOwnProperty.call(_PF_CROPS, o.crop) ? _PF_CROPS[o.crop] : '';
  let nPat = 0;
  const patOn = (base) => (a.pattern === 'none' ? null : (silD) => _pfPattern(a.pattern, pc, base, uid + 'p' + (nPat++), silD, small));
  const dye = a.dye !== 'none' && !scarfOn && a.hair !== 'bald' ? (layer, draw) => _pfDye(a.dye, layer, a.hair, draw, uid + 'd' + layer, hc, hc2) : () => '';
  const shape = crop ? '<rect x="-20" y="-20" width="140" height="140"/>' : a.shape === 'squircle' ? '<rect width="100" height="100" rx="26"/>' : '<circle cx="50" cy="50" r="50"/>';
  let s = o.layers ? '' : `<defs><clipPath id="${uid}c">${shape}</clipPath></defs><g clip-path="url(#${uid}c)">` + _pfBg(a, live, uid, small);
  const seams = [], seam = (k) => seams.push([k, s.length]);   // o.layers
  // behind the neck
  seam('back');
  if (!dressOn || overTop) s += _pfTopBack(a.top, tc);
  seam('outerback');
  s += _pfOuterBack(a.outer, oc, t2);
  seam('hairback');
  if (scarfOn) s += _pfP('M26.6 46 C24.6 21.6 37 12.4 50 12.4 C63 12.4 75.4 21.6 73.4 46 C74.6 61 69 74.6 60 79 L40 79 C31 74.6 25.4 61 26.6 46 Z', hatT[1]);
  else s += _pfHairBack(a.hair, hc) + dye('back', (t) => _pfHairBack(a.hair, t));
  // neck and body
  seam('neck');
  s += _pfP('M43.5 58 L43.5 77 Q50 80 56.5 77 L56.5 58 Z', _pfMix(sk[0], sk[1], 0.55)) + _pfP('M43.5 60 Q50 66 56.5 60 L56.5 63.4 Q50 69.4 43.5 63.4 Z', sk[3], 0.22);
  seam('body');
  if (!dressOn || overTop) s += _pfTop(a.top, a.top === 'lab' ? pfTone('#f4f4f2') : tc, t2, small, { sk, pat: dressOn ? null : patOn(tc), id: uid + 't' });
  if (dressOn) s += _pfDress(a.dress, dc, t2, sk, small, { pat: patOn(dc) });
  if (a.bottom === 'dungarees' && !dressOn) s += _pfBib(bc, mt, small);
  s += _pfNecklace(a.necklace, mt, small, { roll: (!dressOn && a.top === 'turtle') || a.dress === 'knit' });
  s += _pfTie(a.tie, pfTone(_pfHexOf('cloth', a.tieCol, '#7a2e3a')), small);
  s += _pfOuter(a.outer, oc, t2, mt, small);
  s += _pfPin(a.pin, small, a.outer !== 'none');
  s += _pfBagStraps(a.bag, pfTone(_pfHexOf('cloth', a.bagCol, '#9a6a40')), mt, small);
  seam('strands');
  if (scarfOn) s += _pfP('M37 62 Q50 72 63 62 L67 80 Q50 88.6 33 80 Z', hatT[0]) + _pfS('M36 74 Q50 82 64 74', hatT[1], 1, 0.7);
  else s += _pfHairStrands(a.hair, hc) + dye('strands', (t) => _pfHairStrands(a.hair, t));
  seam('scarf');
  s += _pfScarf(a.scarf, pfTone(_pfHexOf('cloth', a.scarfCol, '#c89a32')), pfTone(_pfHexOf('cloth', a.scarf2Col, '#ece4d0')), small);
  // the head
  seam('ears');
  if (!scarfOn) s += _pfE(31.6, 47, 3.8, 5.4, sk[0]) + _pfE(68.4, 47, 3.8, 5.4, sk[0]) + (small ? '' : _pfBothS('M31.2 44.5 Q29.6 47 31.4 49.6', sk[3], 0.9, 0.4))
    + _pfEarrings(a.earrings, mt, small) + (a.piercing === 'ear' ? _pfPiercing('ear', mt, small) : '');
  seam('skull');
  s += _pfP(PF_HEAD_D, sk[0])
    + _pfP('M63 28 C69.6 35 70.6 52 60.6 63.2 C65.6 53.6 66.8 40.6 63 28 Z', sk[1], 0.35) + (small ? '' : _pfE(41, 31, 6, 3.2, sk[2], 0.45));
  seam('face');
  s += _pfCheeks(a.marks, sk, small) + _pfBeauty(a.beauty, small);
  s += _pfS('M50.6 47.6 Q48.2 52.8 50.8 54', sk[3], 1.3, 0.5);
  s += _pfPaint(a.paint, sk, small) + _pfFacialBase(a.facial, hc) + _pfLiner(a.liner, false, small);
  let eyesSvg = _pfEye(42, eyes, -1, eyeHex, small) + _pfEye(58, eyes, 1, eyeHex, small);
  if (o.motion && !small && size >= 44 && ['dot', 'round', 'wide', 'lashes', 'almond', 'glance', 'sparkle'].includes(eyes)) {
    const dur = 4.6 + ((uid.length * 7) % 30) / 10;
    eyesSvg = `<g transform="translate(0 46)"><g><animateTransform attributeName="transform" type="scale" values="1 1;1 1;1 0.12;1 1" keyTimes="0;0.95;0.975;1" dur="${_pfN(dur)}s" repeatCount="indefinite"/><g transform="translate(0 -46)">${eyesSvg}</g></g></g>`;
  }
  s += eyesSvg + _pfLiner(a.liner, true, small) + _pfBrows(brows, _pfMix(hc[0], '#000000', a.hair === 'bald' && a.hairCol === 'h6' ? 0.5 : 0.35));
  s += _pfMouth(mouth, a.lips) + _pfFacialTop(a.facial, hc);
  s += _pfNose(a.nose, mt, small) + (a.piercing !== 'ear' ? _pfPiercing(a.piercing, mt, small) : '');
  // over the face
  seam('hair');
  if (scarfOn) s += _pfP('M31.4 41 C31 27 40 20.4 50 20.4 C60 20.4 69 27 68.6 41 C66 33 59 28.8 50 28.8 C41 28.8 34 33 31.4 41 Z', hatT[0]) + (small ? '' : _pfS('M33.6 36 Q50 25.6 66.4 36', hatT[1], 0.9, 0.6));
  else s += _pfHairFront(a.hair, hc, small) + dye('front', (t) => _pfHairFront(a.hair, t, small));
  seam('glasses');
  s += _pfGlasses(a.glasses, _pfHexOf('cloth', a.glassesCol, '#232328'));
  seam('hat');
  if (!scarfOn) s += _pfHat(a.hat, hatT, small);
  seam('phones');
  s += _pfHeadphones(a.headphones, pfTone(_pfHexOf('cloth', a.headphonesCol, '#3a3c42')));
  seam('extra');
  if (!small && mood.extra === 'party' && (a.hat === 'none')) s += _pfHat('party', pfTone(_pfHexOf('swatch', 'pink', '#f08fb3')), small);
  if (!small && mood.extra === 'sparkle') s += _pfP(_pfSpark(77, 22, 4.4), '#f6d35e') + _pfP(_pfSpark(24, 30, 2.8), '#f6d35e', 0.9) + _pfP(_pfSpark(82, 34, 2), '#ffffff', 0.9);
  if (!small && mood.extra === 'zzz') s += _pfS('M70 20 L75.4 20 L70 25.4 L75.4 25.4', '#ffffff', 1.5, 0.9) + _pfS('M78 11 L81.6 11 L78 14.6 L81.6 14.6', '#ffffff', 1.2, 0.75);
  if (o.layers) return Object.fromEntries(seams.map(([k, at], i) => [k, s.slice(at, i + 1 < seams.length ? seams[i + 1][1] : s.length)]));
  s += '</g>' + (crop ? '' : _pfFrame(a, live, o.theme, small));
  return `<svg class="${String(o.cls || 'pf-av-svg').replace(/[^a-z0-9 _-]/gi, '')}" viewBox="${crop || '0 0 100 100'}" width="${size}" height="${size}" aria-hidden="true" focusable="false">${s}</svg>`;
}

/* ---------- the full figure: a scene person in your outfit (scenePeople.figure; the mapping is 97-profile-0kit-5figure.js) ---------- */
/**
 * The figure() options of scenePeople for this avatar: {o, hairHex, slots}. slots {name: '#rrggbb'}: the palette slots
 * the options and the extra pieces paint with (pfTop, pfBot, pfShoe..., and sk0 / hr0 for a skin or hair colour the
 * scene palette does not have). hairHex stays for older callers (it is slots.hr0).
 */
function profileFigureOpts(a0) {
  const a = profileAvatarNormalize(a0);
  const r = _pfFigOpts(a);
  return { o: r.o, hairHex: r.hairHex, slots: r.slots };
}
/** The figure's close-ups for the builder's tiles (viewBox). */
const _PF_FIG_CROPS = Object.freeze({ legs: '-15 -40 30 42', feet: '-6.5 -13 15 15', wrist: '-13 -38 13 13', head: '-9 -70 18 18', torso: '-13 -66 26 37' });
/**
 * The full figure as an <svg> string, '' when the scene library is not on this page.
 * o {size (px height), walk (animate), crop: 'legs' | 'feet' | 'wrist' | 'head' | 'torso' (a close-up for the builder), uid,
 *    layers: true -> no <svg>: {legA, legB, back, farArm, mid, nearArm, shoulders, hands} (strings, figure units; mid stops at the neck: the caller brings the head),
 *    arms: the people builder's arm pose (with layers), plain: leave out the fine pieces}
 */
function profileFigureSvg(a0, o) {
  o = o || {};
  if (!_pfSP || typeof _pfSP.figure !== 'function') return '';
  const a = profileAvatarNormalize(a0);
  let parts;
  const f = profileFigureOpts(a);
  if (o.layers && o.arms) f.o.arms = o.arms;
  try { parts = profileFigureDress(a, _pfSP.figure(f.o), { PP: _pfSP }); } catch (e) { return ''; }
  // the palette: the kit's own slots first, then the scene people's, the kit's extra cloth colours, the sole and the ink
  const pal = {};
  const slot = (name) => {
    if (pal[name]) return pal[name];
    let v = null;
    if (Object.prototype.hasOwnProperty.call(f.slots, name) && _PF_HEX.test(f.slots[name])) v = pfTone(f.slots[name]);
    else if (/^sk\d$/.test(name)) v = pfTone(_pfHexOf('skin', 's' + name.slice(2), '#e2b08c'));
    else if (/^hr\d$/.test(name)) v = pfTone(_pfHexOf('hair', 'h' + name.slice(2), '#4a3324'));
    else if (Object.prototype.hasOwnProperty.call(PF_CLOTH, name)) v = pfTone(PF_CLOTH[name].hex);
    else if (name === 'sole') v = pfTone('#e8e4dc');
    else if (name === 'ink') v = ['#141012', '#141012', '#2a2628', '#000000'];
    pal[name] = v || pfTone('#888888');
    return pal[name];
  };
  const paint = (p) => {
    if (typeof p !== 'string') return null;
    if (_PF_HEX.test(p)) return p;
    const m = /^@([a-z0-9]+)(?:\.(\d))?$/i.exec(p);
    if (!m) return null;
    const t = slot(m[1]);
    return t[Math.min(3, Number(m[2] || 0))];
  };
  const h = Math.max(24, Math.min(600, Math.round(Number(o.size) || 120)));
  const crop = Object.prototype.hasOwnProperty.call(_PF_FIG_CROPS, o.crop) ? _PF_FIG_CROPS[o.crop] : '';
  const small = !crop && h < 60;
  const uid = String(o.uid || 'pff').replace(/[^A-Za-z0-9_-]/g, '') || 'pff';
  let nPat = 0;
  const pc = pfTone(_pfHexOf('cloth', a.patCol, '#f2f0ea'));
  const patOn = a.pattern !== 'none' && !small;
  const dressed = a.dress !== 'none' && a.dress !== 'pinafore';
  const patBase = pfTone(dressed ? _pfHexOf('cloth', a.dressCol, '#9cb59a') : _pfHexOf('cloth', a.topCol, '#2f3d5c'));
  const outerTop = Object.prototype.hasOwnProperty.call(_PF_FIG_OUTER, a.outer);   // a coat or jacket is the figure's top: no pattern on it
  const patTargets = new Set(dressed ? ['@pfDress.0'] : outerTop ? [] : ['@pfTop.0']);
  const draw = (list) => (Array.isArray(list) ? list : []).map(sh => {
    if (!sh) return '';
    const x = Array.isArray(sh) ? { f: sh[0], d: sh[1], op: sh[2] } : sh;
    if (!x.d || typeof x.d !== 'string' || x.glow || ((small || o.plain) && x.detail)) return '';
    if (!/^[MLHVCSQTAZmlhvcsqtaz0-9 .,eE-]+$/.test(x.d)) return '';   // path data only
    const fill = x.f == null ? 'none' : paint(x.f) || 'none', stroke = x.s ? paint(x.s) : null;
    let at = `<path d="${x.d}" fill="${fill}"`;
    if (stroke) at += ` stroke="${stroke}" stroke-width="${_pfN(Number(x.w) || 1)}" stroke-linecap="${x.cap === 'butt' ? 'butt' : 'round'}"`;
    if (x.op != null && Number(x.op) !== 1 && Number.isFinite(Number(x.op))) at += ` opacity="${_pfN(Number(x.op))}"`;
    if (Array.isArray(x.m) && x.m.length === 6 && x.m.every(Number.isFinite)) at += ` transform="matrix(${x.m.map(_pfN).join(' ')})"`;
    at += '/>';
    // the fabric pattern on the main garment (the torso, and a dress's skirt)
    if (patOn && !x.s && patTargets.has(x.f)) at += _pfFigPattern(a.pattern, x.d, uid + 'fp' + (nPat++), pc, patBase);
    return at;
  }).join('');
  if (o.layers) {
    // the arms' ranges in body; what lies wholly above the collar (the neck, the egg) stays out of mid
    const at = parts.at, b = parts.body, collar = parts.shoulders.near[1] - 1.9 + 0.7;
    const low = (x) => { const d = String(Array.isArray(x) ? x[1] : x && x.d), n = d.match(/-?\d*\.?\d+/g) || []; if (/[ahv]/.test(d)) return Number(n[1]) > collar; for (let i = 1; i < n.length; i += 2) if (Number(n[i]) > collar) return true; return false; };
    return { legA: draw(parts.legA), legB: draw(parts.legB), back: draw(b.slice(0, at.farArm[0])), farArm: draw(b.slice(at.farArm[0], at.farArm[1])), mid: draw(b.slice(at.farArm[1], at.nearArm[0]).filter(low)), nearArm: draw(b.slice(at.nearArm[0], at.nearArm[1])), shoulders: parts.shoulders, hands: parts.hands };
  }
  const piv = '0 ' + _pfN(Number(_pfSP.HIP) || -31.5);
  const walk = !!o.walk && !crop;
  const swing = (from, to) => (walk ? `<animateTransform attributeName="transform" type="rotate" values="${from} ${piv};${to} ${piv};${from} ${piv}" dur="0.9s" repeatCount="indefinite"/>` : '');
  const bob = walk ? '<animateTransform attributeName="transform" type="translate" values="0 0;0 -1.3;0 0;0 -1.3;0 0" dur="0.9s" repeatCount="indefinite"/>' : '';
  const vb = crop || '-22 -70 44 74', w = crop ? h : Math.round(h * 44 / 74);
  return `<svg class="pf-fig-svg" viewBox="${vb}" width="${w}" height="${h}" aria-hidden="true" focusable="false">`
    + (crop ? '' : `<ellipse cx="0" cy="0.6" rx="11" ry="1.8" fill="#000000" opacity="0.14"/>`)
    + `<g>${swing(18, -18)}${draw(parts.legB)}</g><g>${bob}${draw(parts.body)}</g><g>${swing(-18, 18)}${draw(parts.legA)}</g></svg>`;
}
