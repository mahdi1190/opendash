/* ============================================================
   PROFILE, the avatar kit: LOOKS (2.18, agent 'wardrobe'). PURE, like 97-profile-0kit.js (read its
   header): tables and functions only. Saved outfits, the 'Surprise me' themes, quick expressions and
   the helpers the character builder (97-profile-2ui.js) asks the kit for, so the builder needs no
   knowledge of each part.
     PF_OUTFIT_PARTS                  what an outfit is: clothes, layers, shoes, jewellery and accessories
                                      (not the face, the hair, the build or the background)
     PF_FIGURE_PARTS                  what the full scene figure wears (fscOutfitOf, the postcard's outfit)
     PF_LOOK_THEMES                   'Surprise me': casual, smart, sporty, cosy, festival, and seasonal ones
     PF_EXPRESSIONS                   quick expressions: eyes, brows and mouth together
     profileOutfitOf(a)               the outfit part of an avatar {k: id}
     profileOutfitWear(a, look, ok)   the avatar wearing a saved look (ok(k, id): may it be worn; locked parts stay)
     profileOutfitThemed(id, rnd, ok, a)   a new outfit in a theme, on the avatar a (face and hair untouched)
     profileLookThemes(today, ok)     the themes on offer that day [{id, label, icon, season?}]
     pfPartHidden(k, a)               the builder leaves out a colour row that means nothing now
     pfPairs(k, id, a)                what changes with a pick (a dress off when you pick trousers, a leather
                                      jacket in black the first time, a pattern in a colour that suits it)
     pfOptionArt(k, id, a, o)         the builder's tile: the avatar (or the figure) wearing the option, cropped
                                      to where it shows. '' for colour rows (swatches) or without the scene library
   ============================================================ */
const PF_OUTFIT_PARTS = Object.freeze(['top', 'topCol', 'top2Col', 'pattern', 'patCol', 'outer', 'outerCol', 'dress', 'dressCol', 'bottom', 'bottomCol',
  'shoes', 'shoesCol', 'earrings', 'necklace', 'metal', 'watch', 'pin', 'glasses', 'glassesCol', 'hat', 'hatCol', 'headphones', 'headphonesCol',
  'scarf', 'scarfCol', 'scarf2Col', 'tie', 'tieCol', 'bag', 'bagCol']);
const PF_FIGURE_PARTS = Object.freeze(['skin', 'hair', 'hairCol', 'facial', 'top', 'topCol', 'top2Col', 'pattern', 'patCol', 'outer', 'outerCol', 'dress', 'dressCol',
  'bottom', 'bottomCol', 'shoes', 'shoesCol', 'build', 'hat', 'hatCol', 'glasses', 'glassesCol', 'headphones', 'headphonesCol', 'scarf', 'scarfCol', 'scarf2Col',
  'tie', 'tieCol', 'bag', 'bagCol', 'earrings', 'necklace', 'metal', 'watch', 'pin']);

/* ---------- 'Surprise me' ---------- */
// pick: {part: [ids]} (one of them), maybe: {part: [chance, [ids]]} (else 'none'), cols: {colourPart: [cloth ids]}, extra: parts outside the outfit a theme may set
const PF_LOOK_THEMES = Object.freeze([
  { id: 'casual', label: 'Casual', icon: 'shirt',
    pick: { top: ['tee', 'vneck', 'henley', 'sweat', 'hoodie', 'shirt', 'polo'], bottom: ['jeans', 'chinos', 'shorts', 'skirt', 'joggers'], shoes: ['trainer', 'hightops', 'flats', 'sandal'] },
    maybe: { outer: [0.35, ['denim', 'bomber', 'fleece']], dress: [0.1, ['shirtdress', 'knit']], hat: [0.3, ['cap', 'beanie', 'bucket', 'backcap']], bag: [0.5, ['crossbody', 'tote', 'backpack']],
      watch: [0.4, ['classic', 'smart']], earrings: [0.3, ['studs', 'hoops']], pattern: [0.25, ['stripes', 'gingham', 'polka', 'raglan']] },
    cols: { topCol: ['white', 'grey', 'navy', 'sage', 'mustard', 'sky', 'coral', 'oatmeal', 'olive'], bottomCol: ['denim', 'lightdenim', 'stone', 'black', 'khaki'],
      outerCol: ['denim', 'olive', 'navy', 'tan'], shoesCol: ['white', 'black', 'grey', 'tan'], hatCol: ['navy', 'mustard', 'olive', 'grey'], bagCol: ['tan', 'charcoal', 'olive'],
      patCol: ['white', 'navy', 'red'], dressCol: ['sky', 'oatmeal', 'sage'] } },
  { id: 'smart', label: 'Smart', icon: 'briefcase',
    pick: { top: ['shirt', 'blouse', 'turtle', 'polo', 'ruffle', 'kurta'], bottom: ['trousers', 'chinos', 'pleated', 'midi'], shoes: ['shoe', 'loafers', 'heels', 'chelsea', 'flats'] },
    maybe: { outer: [0.7, ['blazer', 'trench']], dress: [0.3, ['shirtdress', 'wrap', 'tea']], tie: [0.35, ['tie', 'skinny', 'bow']], glasses: [0.25, ['browline', 'wire', 'round', 'rect']],
      bag: [0.5, ['satchel', 'shoulder', 'messenger']], watch: [0.7, ['classic']], earrings: [0.4, ['pearls', 'studs']], necklace: [0.3, ['pearls', 'chain', 'locket']], pattern: [0.2, ['pinstripe', 'gingham']] },
    cols: { topCol: ['white', 'sky', 'cream', 'blush', 'black', 'burgundy'], bottomCol: ['charcoal', 'navy', 'black', 'stone', 'camel'], outerCol: ['navy', 'charcoal', 'camel', 'black', 'tweed'],
      tieCol: ['burgundy', 'navy', 'emerald', 'mustard'], shoesCol: ['black', 'tan', 'burgundy'], bagCol: ['tan', 'black', 'burgundy'], patCol: ['white', 'navy'],
      dressCol: ['navy', 'emerald', 'burgundy', 'stone'], glassesCol: ['black', 'chocolate', 'tan'] } },
  { id: 'sporty', label: 'Sporty', icon: 'dumbbell',
    pick: { top: ['jersey', 'tank', 'tee', 'sweat', 'hoodie', 'polo'], bottom: ['joggers', 'shorts', 'leggings'], shoes: ['trainer', 'platforms', 'hightops'] },
    maybe: { outer: [0.35, ['fleece', 'gilet', 'bomber']], hat: [0.5, ['cap', 'backcap', 'visor', 'headband']], headphones: [0.4, ['buds', 'over']], watch: [0.7, ['sport', 'smart']],
      bag: [0.5, ['backpack', 'bumbag']], pattern: [0.2, ['stripes', 'block', 'raglan']] },
    cols: { topCol: ['red', 'cobalt', 'emerald', 'yellow', 'white', 'black', 'coral', 'turquoise'], bottomCol: ['black', 'charcoal', 'navy', 'grey'], shoesCol: ['white', 'black', 'coral', 'cobalt'],
      outerCol: ['black', 'navy', 'forest', 'red'], hatCol: ['white', 'black', 'red', 'navy'], top2Col: ['white', 'black', 'yellow'], patCol: ['white', 'black'], bagCol: ['black', 'charcoal', 'red'],
      headphonesCol: ['white', 'black', 'red'] } },
  { id: 'cosy', label: 'Cosy', icon: 'coffee',
    pick: { top: ['jumper', 'cardigan', 'turtle', 'hoodie', 'sweat'], bottom: ['joggers', 'leggings', 'jeans'], shoes: ['slippers', 'boot', 'chelsea'] },
    maybe: { outer: [0.4, ['puffer', 'robe', 'fleece']], dress: [0.1, ['knit']], hat: [0.5, ['beanie', 'slouch', 'bearbeanie', 'trapper']], scarf: [0.6, ['chunky', 'plain', 'tartan', 'striped']],
      headphones: [0.1, ['muffs']], pattern: [0.3, ['tartan', 'gingham', 'stripes', 'hearts']] },
    cols: { topCol: ['cream', 'oatmeal', 'camel', 'rust', 'sage', 'burgundy', 'mustard', 'forest', 'blush'], bottomCol: ['grey', 'charcoal', 'oatmeal', 'denim', 'chocolate'],
      scarfCol: ['mustard', 'rust', 'cream', 'burgundy', 'forest'], hatCol: ['cream', 'mustard', 'rust', 'blush', 'grey'], outerCol: ['blush', 'cream', 'navy', 'forest', 'camel'],
      shoesCol: ['cream', 'tan', 'chocolate', 'grey'], patCol: ['cream', 'red', 'navy'], dressCol: ['oatmeal', 'cream', 'rust'] } },
  { id: 'festival', label: 'Festival', icon: 'music',
    pick: { top: ['tank', 'kimono', 'tee', 'ruffle', 'bardot'], bottom: ['shorts', 'dungarees', 'wide', 'skirt'], shoes: ['wellies', 'boot', 'sandal', 'platforms'] },
    maybe: { dress: [0.35, ['sundress', 'tea', 'slip']], outer: [0.25, ['denim', 'raincoat']], hat: [0.7, ['bucket', 'cowboy', 'sunhat', 'headband', 'bandana', 'flowers']],
      glasses: [0.8, ['roundsun', 'heart', 'starsun', 'mirror', 'sun']], earrings: [0.6, ['bighoops', 'feathers', 'stars', 'moons']], necklace: [0.4, ['beads', 'layered', 'shell']],
      pattern: [0.7, ['tiedye', 'floral', 'stars', 'tropical', 'zigzag']], paint: [0.5, ['glitter', 'star', 'rainbow', 'heart']] },
    cols: { topCol: ['yellow', 'coral', 'turquoise', 'pink', 'lilac', 'white', 'lemon', 'peach'], bottomCol: ['denim', 'lightdenim', 'white', 'black'], shoesCol: ['yellow', 'black', 'tan', 'pink'],
      hatCol: ['tan', 'cream', 'denim', 'red', 'olive'], dressCol: ['coral', 'yellow', 'turquoise', 'lilac'], patCol: ['white', 'pink', 'yellow', 'turquoise'], outerCol: ['denim', 'yellow'] },
    extra: ['paint'] },
  { id: 'spooky', label: 'Spooky', icon: 'moon', season: 'halloween',
    pick: { top: ['jumper', 'hoodie', 'cardigan', 'turtle'], bottom: ['jeans', 'skirt', 'leggings'], shoes: ['boot', 'chelsea', 'platforms'], hat: ['witch', 'horns'] },
    maybe: { pattern: [0.6, ['bats', 'stripes']], paint: [0.7, ['skull', 'pumpkin']], outer: [0.3, ['cape']], earrings: [0.3, ['moons', 'stars']] },
    cols: { topCol: ['black', 'plum', 'charcoal', 'rust'], bottomCol: ['black', 'charcoal', 'plum'], patCol: ['white', 'rust', 'mustard'], shoesCol: ['black', 'plum'], outerCol: ['black', 'plum'], hatCol: ['black', 'plum'] },
    extra: ['paint'] },
  { id: 'festive', label: 'Festive', icon: 'gift', season: 'festive',
    pick: { top: ['festive', 'jumper', 'cardigan'], bottom: ['jeans', 'skirt', 'joggers'], shoes: ['boot', 'slippers', 'chelsea'], hat: ['santa', 'antlers', 'beanie'] },
    maybe: { scarf: [0.7, ['striped', 'chunky', 'tartan']], pattern: [0.4, ['snow', 'tartan']], headphones: [0.2, ['muffs']], paint: [0.3, ['snowflake']] },
    cols: { topCol: ['red', 'forest', 'cream', 'burgundy'], bottomCol: ['denim', 'black', 'charcoal'], scarfCol: ['red', 'cream', 'forest'], scarf2Col: ['cream', 'red'], patCol: ['white', 'red'],
      hatCol: ['red', 'forest', 'cream'], shoesCol: ['tan', 'black', 'red'] },
    extra: ['paint'] },
]);
/** Quick expressions: eyes, brows and mouth at once. */
const PF_EXPRESSIONS = Object.freeze([
  { id: 'smile', label: 'Smile', eyes: 'dot', brows: 'soft', mouth: 'smile' },
  { id: 'grin', label: 'Big grin', eyes: 'happy', brows: 'raised', mouth: 'grin' },
  { id: 'laugh', label: 'Laughing', eyes: 'closed', brows: 'raised', mouth: 'laugh' },
  { id: 'content', label: 'Content', eyes: 'closed', brows: 'soft', mouth: 'small' },
  { id: 'smirk', label: 'Smirk', eyes: 'dot', brows: 'curious', mouth: 'smirk' },
  { id: 'wink', label: 'Wink', eyes: 'wink', brows: 'soft', mouth: 'grin' },
  { id: 'surprised', label: 'Surprised', eyes: 'wide', brows: 'raised', mouth: 'open' },
  { id: 'cool', label: 'Cool', eyes: 'focused', brows: 'straight', mouth: 'small' },
  { id: 'determined', label: 'Determined', eyes: 'dot', brows: 'angled', mouth: 'neutral' },
  { id: 'sleepy', label: 'Sleepy', eyes: 'sleepy', brows: 'soft', mouth: 'small' },
  { id: 'cheeky', label: 'Cheeky', eyes: 'wink', brows: 'curious', mouth: 'tongue' },
  { id: 'whistling', label: 'Whistling', eyes: 'glance', brows: 'raised', mouth: 'whistle' },
  { id: 'starstruck', label: 'Starstruck', eyes: 'stars', brows: 'raised', mouth: 'beam' },
  { id: 'love', label: 'In love', eyes: 'hearts', brows: 'soft', mouth: 'kiss' },
]);

function profileOutfitOf(a0) {
  const a = profileAvatarNormalize(a0), out = {};
  for (const k of PF_OUTFIT_PARTS) out[k] = a[k];
  return out;
}
/** The avatar a wearing a saved look: only outfit parts, only known ids, only what ok(k, id) allows (the rest stays). */
function profileOutfitWear(a0, look, ok) {
  const a = profileAvatarNormalize(a0);
  if (!look || typeof look !== 'object') return a;
  const can = typeof ok === 'function' ? ok : () => true;
  for (const k of PF_OUTFIT_PARTS) { const v = look[k]; if (typeof v === 'string' && _pfHas(k, v) && can(k, v)) a[k] = v; }
  return profileAvatarNormalize(a);
}
/** The themes on offer on a day (seasonal ones only in their season; one whose must-have pieces are all locked is left out). */
function profileLookThemes(today, ok) {
  const can = typeof ok === 'function' ? ok : () => true;
  return PF_LOOK_THEMES.filter(t => (!t.season || profileSeasonOn(t.season, today || '', '')) && Object.entries(t.pick).every(([k, ids]) => ids.some(id => can(k, id))))
    .map(t => ({ id: t.id, label: t.label, icon: t.icon, season: t.season || '' }));
}
/** A new outfit in a theme on the avatar a: the outfit parts are chosen afresh (face, hair, build and background untouched). */
function profileOutfitThemed(themeId, rnd, ok, a0) {
  rnd = typeof rnd === 'function' ? rnd : Math.random;
  const can = typeof ok === 'function' ? ok : () => true;
  const t = PF_LOOK_THEMES.find(x => x.id === themeId) || PF_LOOK_THEMES[0];
  const a = profileAvatarNormalize(a0);
  const one = (k, ids) => { const l = (ids || []).filter(id => _pfHas(k, id) && can(k, id)); return l.length ? l[Math.floor(rnd() * l.length)] : null; };
  // a clean slate: the optional pieces come off (glasses stay: they may be your own), then the theme dresses you
  for (const k of ['outer', 'dress', 'pattern', 'hat', 'headphones', 'scarf', 'tie', 'bag', 'watch', 'pin', 'earrings', 'necklace']) a[k] = PF_DEFAULT[k];
  if (_PF_SUNGLASSES.has(a.glasses) || a.glasses === '3d') a.glasses = 'none';
  for (const k of t.extra || []) a[k] = PF_DEFAULT[k];
  for (const [k, ids] of Object.entries(t.pick)) { const v = one(k, ids); if (v) a[k] = v; }
  for (const [k, [p, ids]] of Object.entries(t.maybe || {})) if (rnd() < p) { const v = one(k, ids); if (v) a[k] = v; }
  for (const [k, ids] of Object.entries(t.cols || {})) { const v = one(k, ids); if (v) a[k] = v; }
  for (let i = 0; i < 4 && (a.bottomCol === a.topCol || a.outerCol === a.topCol); i++) { const v = one('bottomCol', t.cols.bottomCol); if (v) a.bottomCol = v; const w = one('outerCol', t.cols.outerCol || []); if (w) a.outerCol = w; }
  if (a.patCol === a.topCol) a.patCol = a.topCol === 'white' ? 'navy' : 'white';
  if (a.dress !== 'none' && a.dress !== 'pinafore' && a.bottom === 'dungarees') a.bottom = 'jeans';
  return profileAvatarNormalize(a);
}

/* ---------- the builder's helpers ---------- */
const _PF_FIXED_HATS = new Set(['none', 'crown', 'grad', 'witch', 'santa', 'flowers', 'halo', 'chef', 'horns', 'antlers', 'bunny']);
const _PF_IRIS_EYES = new Set(['round', 'wide', 'almond', 'glance', 'sparkle']);
/** A colour row that means nothing for what is worn now (the builder leaves it out). */
function pfPartHidden(k, a) {
  if (!a || typeof a !== 'object') return false;
  const dressOn = a.dress && a.dress !== 'none' && a.dress !== 'pinafore';
  switch (k) {
    case 'glassesCol': return ['none', 'heart', '3d', 'starsun'].includes(a.glasses);
    case 'hatCol': return _PF_FIXED_HATS.has(a.hat);
    case 'headphonesCol': return a.headphones === 'none';
    case 'scarfCol': return a.scarf === 'none' || a.scarf === 'rainbow';
    case 'scarf2Col': return !['striped', 'tartan', 'silk'].includes(a.scarf);
    case 'bagCol': return a.bag === 'none';
    case 'eyeCol': return !_PF_IRIS_EYES.has(a.eyes);
    case 'topCol': return a.top === 'lab' || dressOn;
    case 'patCol': return !a.pattern || a.pattern === 'none';
    case 'outerCol': return !a.outer || a.outer === 'none' || a.outer === 'hivis';
    case 'dressCol': return !a.dress || a.dress === 'none';
    case 'dyeCol': return !a.dye || a.dye === 'none';
    case 'tieCol': return !a.tie || a.tie === 'none';
    case 'bottomCol': return dressOn || a.dress === 'pinafore';
    case 'metal': return ['earrings', 'necklace', 'nose', 'piercing', 'watch'].every(x => !a[x] || a[x] === 'none') && a.bottom !== 'dungarees';
    default: return false;
  }
}
/** The colour each piece comes in when you first put it on (only while its colour is still the last piece's own, or the default). */
const _PF_OUTER_COL = Object.freeze({ denim: 'denim', leather: 'black', blazer: 'navy', bomber: 'olive', fleece: 'forest', puffer: 'navy', gilet: 'olive', raincoat: 'yellow',
  trench: 'camel', robe: 'blush', apron: 'teal', hivis: 'lemon', varsity: 'burgundy', cape: 'red' });
const _PF_DRESS_COL = Object.freeze({ sundress: 'coral', tea: 'sky', wrap: 'emerald', shirtdress: 'stone', slip: 'plum', knit: 'oatmeal', pinafore: 'denim', jumpsuit: 'olive', gown: 'plum' });
const _PF_PAT_COL = Object.freeze({ stripes: 'white', pinstripe: 'white', gingham: 'white', tartan: 'red', polka: 'white', floral: 'pink', stars: 'yellow', hearts: 'pink', zigzag: 'white',
  block: 'cream', raglan: 'cream', tiedye: 'pink', camo: 'khaki', leopard: 'camel', tropical: 'emerald', bats: 'black', snow: 'white' });
/** What else changes with a pick: {part: id} (empty when nothing does). */
function pfPairs(k, id, a) {
  const out = {};
  if (!a || typeof a !== 'object') return out;
  const follow = (colK, table, prevKind) => { const cur = a[colK]; if (table[id] && (cur === PF_DEFAULT[colK] || cur === table[prevKind])) out[colK] = table[id]; };
  if (k === 'hat' && (id === 'headscarf' || id === 'turban') && a.headphones !== 'none' && a.headphones !== 'buds') out.headphones = 'none';
  if (k === 'headphones' && id !== 'none' && id !== 'buds' && a.hat === 'headscarf') out.hat = 'none';
  if (k === 'top' && a.dress && a.dress !== 'none' && a.dress !== 'pinafore') out.dress = 'none';
  if (k === 'bottom' && a.dress && a.dress !== 'none') out.dress = 'none';
  if (k === 'outer') follow('outerCol', _PF_OUTER_COL, a.outer);
  if (k === 'dress') follow('dressCol', _PF_DRESS_COL, a.dress);
  if (k === 'pattern') follow('patCol', _PF_PAT_COL, a.pattern);
  return out;
}
/** Where each part shows: the crop of its tile. */
const _PF_ART_CROP = Object.freeze({ eyes: 'face', brows: 'face', mouth: 'face', facial: 'face', marks: 'face', liner: 'face', lips: 'face', paint: 'face', beauty: 'face',
  nose: 'face', piercing: 'face', earrings: 'ears', hair: 'head', dye: 'head', hat: 'head', glasses: 'head', headphones: 'head',
  necklace: 'chest', tie: 'chest', pin: 'chest', scarf: 'chest', pattern: 'chest', top: 'upper', outer: 'upper', dress: 'upper', bag: 'upper', bottom: 'fig:legs', shoes: 'fig:feet', watch: 'fig:wrist', build: 'fig:torso' });
/** The builder's tile for option id of part k on the avatar a: an <svg> string, or '' (colour rows, or no scene library for a figure part). */
function pfOptionArt(k, id, a0, o) {
  o = o || {};
  const p = pfPart(k);
  if (!p || p.colour || !_pfHas(k, id)) return '';
  const a = profileAvatarNormalize(a0);
  const next = Object.assign({}, a, { [k]: id }, pfPairs(k, id, a));
  const crop = _PF_ART_CROP[k] || '', size = Math.max(24, Math.min(160, Math.round(Number(o.size) || 56)));
  if (crop.startsWith('fig')) return profileFigureSvg(next, { size, crop: crop.slice(4), uid: o.uid });
  return profileAvatarSvg(next, { size, uid: o.uid, theme: o.theme, live: o.live, crop });
}
