/* ============================================================
   GARDEN, CRAFTING: the rules (2.23, agent 'craft'). The owner: "grow things and craft things using what we grow to make accessories for ourselves or pets".
   Walk up to the bench in the garden, pick a recipe, and what you grew, caught and found becomes something: a hat for you, a bandana for your pet, a decoration, a treat.

   A RECIPE IS ONE ROW of GARDEN_RECIPES, made by _gR(id, name, group, need, make, learn, more):
     need   {item: n}: 'crop:rose' (what you picked), 'honey', 'bq:posy', 'fish:perch' (any size), 'bug:firefly', 'seed:daisy', 'decor:lantern', 'clover'
     make   what you get, exactly one of:
              {wear: ['hat' | 'scarf' | 'pin', id]}   for you: an option of the avatar kit whose row says {craft: <recipe id>} (97-profile-0kit.js)
              {pet: <design id>}                      for your pet: a design of PET_CRAFT_ITEMS (94-garden-craft-1art.js)
              {decor: <id>}                           a row of GARDEN_DECOR with price 0 (the market only buys it for what it cost: nothing)
              {treats: n}                             treats in the jar (at most GARDEN_CRAFT.dayTreats a day)
              {emote: <id>}                           a move for your gardener (97-pets-tricks-6emote.js)
     learn  how the recipe comes to you (all of these are plain data):
              {start: 1} you know it        {level: n} a garden level       {fact: ['harvests', 10]} a milestone (any gardenFacts key)
              {season: 'autumn', n: 5} a find: picking n things while it is that season, a note turns up (and then it is yours for good)
              {visitor: 'hedgehog'} a gift, when that visitor first calls       {fact: ['heartsReceived', 1]} from a friend's visit        {bottle: 1} a message in a bottle on the shore
     more   blurb, hue (the card's tint)

   SAVES: nothing new. A craft is one line of the garden's ledger (kind 'cr', with Undo): ingredients out, the thing in, so it syncs and banks like everything else. What you made is the item
   craft:<recipe>. Recipes found in a bottle or a season are items too (recipe:<id>), the rest are worked out. An id this version does not know is simply not shown.

   ECONOMY: crafting can never make coins. Ingredients go; the only way back to coins is gardenSell, which pays for a crafted thing what its ingredients would have fetched, plus a tenth, and at most
   GARDEN_CRAFT.daySell coins a day (fd.mc). Crafted decorations have no resale price. Crafted treats are capped too (fd.ct). XP: a little for each.

   Rules only (no DOM at load): Node's page engine runs these for the assistant (lib/agent-engine.mjs).
     gardenRecipes()            every recipe with {known, can, missing, have, seen}
     gardenRecipeKnown(id)      is it yours?
     gardenCraft(id)            make one -> {ok, msg?, why?, make}
     gardenCraftSellPrice(id)   what the market pays for craft:<id>
     gardenCraftSell(item, n)   gardenSell comes here for craft: items
     gardenCraftOwned(id)       how many you hold       gardenCraftedSet()   the recipe ids you have made and still hold (the wardrobe asks)
     gardenCraftFresh()         recipes learnt since you last looked at the bench       gardenCraftSeen()
     gardenBottleNow(m)         a bottle on the shore today? {x, y, recipe} | null      gardenBottleOpen() -> {ok, recipe}
   ============================================================ */
const GARDEN_CRAFT = Object.freeze({ dayTreats: 3, daySell: 40, sellMargin: 1.1, xp: 3 });
const _GR_GROUPS = Object.freeze([['you', 'You', 'shirt'], ['pet', 'Pets', 'paw-print'], ['garden', 'Garden', 'flower-2'], ['treat', 'Treats', 'cookie'], ['fun', 'Fun', 'music']]);
function _gR(id, name, group, need, make, learn, more) { return Object.assign({ id, name, group, need, make, learn }, more || {}); }
const GARDEN_RECIPES = Object.freeze([
  // for you
  _gR('flower-crown', 'Daisy crown', 'you', { 'crop:daisy': 3, 'crop:marigold': 1 }, { wear: ['hat', 'flowercrown'] }, { start: 1 }, { blurb: 'A ring of daisies for a sunny head.' }),
  _gR('straw-hat', 'Straw hat', 'you', { 'crop:sunflower': 1, 'crop:carrot': 2 }, { wear: ['hat', 'strawhat'] }, { level: 2 }, { blurb: 'Keeps the sun off while you weed.' }),
  _gR('herb-wreath', 'Herb wreath', 'you', { 'crop:mint': 2, 'crop:basil': 2, 'crop:rosemary': 1 }, { wear: ['hat', 'leafwreath'] }, { fact: ['harvests', 10] }, { blurb: 'Smells of a good Sunday lunch.' }),
  _gR('meadow-circlet', 'Meadow circlet', 'you', { 'crop:buttercup': 2, 'crop:primrose': 2, 'crop:clover': 2 }, { wear: ['hat', 'wildcirclet'] }, { fact: ['bouquets', 1] }, { blurb: 'Wild flowers, loosely tied.' }),
  _gR('beekeeper-hat', 'Beekeeper’s hat', 'you', { honey: 2, 'crop:lavender': 3 }, { wear: ['hat', 'beekeeper'] }, { visitor: 'bumblebee' }, { blurb: 'The bees left a note: “this would suit you.”' }),
  _gR('gardener-scarf', 'Gardener’s scarf', 'you', { 'crop:lavender': 2, 'crop:cornflower': 2, 'crop:thyme': 1 }, { wear: ['scarf', 'gardenscarf'] }, { level: 3 }, { blurb: 'Dyed with what grows by the gate.' }),
  _gR('daisy-chain', 'Daisy chain', 'you', { 'crop:daisy': 6 }, { wear: ['scarf', 'daisychain'] }, { start: 1 }, { blurb: 'Takes patience. Worth it.' }),
  _gR('bee-badge', 'Bee badge', 'you', { 'bug:honeybee': 1, honey: 1 }, { wear: ['pin', 'beebadge'] }, { fact: ['netted', 5] }, { blurb: 'Tiny, gold and busy.' }),
  _gR('trowel-badge', 'Trowel badge', 'you', { 'crop:potato': 2, 'crop:radish': 2 }, { wear: ['pin', 'trowelbadge'] }, { fact: ['planted', 25] }, { blurb: 'For those who get their hands dirty.' }),
  _gR('sun-badge', 'Sunflower badge', 'you', { 'crop:sunflower': 2 }, { wear: ['pin', 'sunbadge'] }, { season: 'summer', n: 5 }, { blurb: 'Found folded in a summer seed packet.' }),
  // for your pet
  _gR('berry-bandana', 'Berry bandana', 'pet', { 'crop:strawberry': 2, 'crop:bramble': 2 }, { pet: 'pi-cbandberry' }, { level: 2 }, { blurb: 'Dyed with the best of the hedge.' }),
  _gR('herb-bandana', 'Herb bandana', 'pet', { 'crop:parsley': 2, 'crop:thyme': 2 }, { pet: 'pi-cbandherb' }, { start: 1 }, { blurb: 'A green one, with a smell of dinner.' }),
  _gR('bluebell-bandana', 'Bluebell bandana', 'pet', { 'crop:bluebell': 2, 'crop:forget-me-not': 2 }, { pet: 'pi-cbandblue' }, { season: 'spring', n: 5 }, { blurb: 'Spring, tied in a knot.' }),
  _gR('daisy-collar', 'Daisy collar', 'pet', { 'crop:daisy': 4 }, { pet: 'pi-ccolldaisy' }, { start: 1 }, { blurb: 'Your pet will try to eat it.' }),
  _gR('rose-collar', 'Rose collar', 'pet', { 'crop:rose': 3, 'crop:mint': 1 }, { pet: 'pi-ccollrose' }, { level: 4 }, { blurb: 'For the very smartest of walks.' }),
  _gR('lavender-collar', 'Lavender collar', 'pet', { 'crop:lavender': 4 }, { pet: 'pi-ccolllav' }, { fact: ['bouquets', 3] }, { blurb: 'Calm, in a ring.' }),
  _gR('tiny-straw', 'Tiny straw hat', 'pet', { 'crop:sunflower': 1, 'crop:pea': 2 }, { pet: 'pi-chatstraw' }, { level: 3 }, { blurb: 'For small heads with big plans.' }),
  _gR('acorn-cap', 'Acorn cap', 'pet', { 'crop:hazel': 2, 'crop:thyme': 1 }, { pet: 'pi-chatacorn' }, { season: 'autumn', n: 5 }, { blurb: 'Fell off a tree. Fits perfectly.' }),
  _gR('clover-crown', 'Clover crown', 'pet', { 'crop:clover': 4, clover: 1 }, { pet: 'pi-chatclover' }, { fact: ['clover', 1] }, { blurb: 'Lucky is as lucky wears.' }),
  _gR('pumpkin-cap', 'Pumpkin cap', 'pet', { 'crop:pumpkin': 1 }, { pet: 'pi-chatpump' }, { season: 'autumn', n: 12 }, { blurb: 'Roomy.' }),
  _gR('flower-bonnet', 'Flower bonnet', 'pet', { 'crop:tulip': 2, 'crop:pansy': 2, 'crop:crocus': 1 }, { pet: 'pi-chatbonnet' }, { fact: ['plantsFound', 10] }, { blurb: 'Tied under the chin, with a look of dignity.' }),
  _gR('fairy-wings', 'Fairy wings', 'pet', { 'crop:lily': 2, 'bug:damselfly': 1 }, { pet: 'pi-cwingfairy' }, { bottle: 1 }, { blurb: 'They do not lift. They do sparkle.' }),
  _gR('butterfly-wings', 'Butterfly wings', 'pet', { 'bug:red-admiral': 1, 'crop:buttercup': 3 }, { pet: 'pi-cwingbfly' }, { fact: ['bugSpecies', 5] }, { blurb: 'Borrowed from no one, promise.' }),
  _gR('leaf-wings', 'Leaf wings', 'pet', { 'crop:mint': 2, 'crop:sage': 2 }, { pet: 'pi-cwingleaf' }, { level: 5 }, { blurb: 'A green rustle whenever it runs.' }),
  // for the garden
  _gR('firefly-jar', 'Firefly jar', 'garden', { 'bug:firefly': 3 }, { decor: 'firefly-jar' }, { start: 1 }, { blurb: 'Three fireflies and a jam jar. Dark all day; at dusk it wakes up.' }),
  _gR('boot-planter', 'Boot planter', 'garden', { 'fish:old-boot': 1, 'crop:daisy': 2 }, { decor: 'boot-planter' }, { start: 1 }, { blurb: 'That old boot was good for something after all.' }),
  _gR('can-chimes', 'Tin can chimes', 'garden', { 'fish:tin-can': 3, 'fish:driftwood': 1 }, { decor: 'can-chimes' }, { start: 1 }, { blurb: 'Everything the lake gave back, on a bit of string.' }),
  _gR('flower-barrow', 'Flower barrow', 'garden', { 'crop:tulip': 3, 'crop:pansy': 3 }, { decor: 'flower-barrow' }, { level: 2 }, { blurb: 'Parked for good.' }),
  _gR('herb-rack', 'Drying rack', 'garden', { 'crop:rosemary': 3, 'crop:sage': 2 }, { decor: 'herb-rack' }, { fact: ['harvests', 25] }, { blurb: 'Hang it, forget it, cook with it.' }),
  _gR('apple-crate', 'Apple crate', 'garden', { 'crop:apple': 5 }, { decor: 'apple-crate' }, { season: 'autumn', n: 8 }, { blurb: 'Help yourself.' }),
  _gR('lantern-gourd', 'Gourd lantern', 'garden', { 'crop:squash': 1, 'crop:pumpkin': 1 }, { decor: 'lantern-gourd' }, { fact: ['nightVisitors', 1] }, { blurb: 'A soft orange glow, and a slightly smug face.' }),
  _gR('driftwood-seat', 'Driftwood seat', 'garden', { 'fish:perch': 1, 'crop:thyme': 2 }, { decor: 'driftwood-seat' }, { bottle: 1 }, { blurb: 'It came a long way to be sat on.' }),
  _gR('bee-skep', 'Straw skep', 'garden', { honey: 3, 'crop:lavender': 3 }, { decor: 'bee-skep' }, { visitor: 'honeybee' }, { blurb: 'Bees approve of the thatch.' }),
  _gR('fish-flag', 'Fish flag', 'garden', { 'fish:minnow': 2, 'crop:cornflower': 2 }, { decor: 'fish-flag' }, { fact: ['fished', 10] }, { blurb: 'It tells the wind which way the fish went.' }),
  _gR('rose-arch', 'Rose arch', 'garden', { 'crop:rose': 6, 'crop:hazel': 2 }, { decor: 'rose-arch' }, { fact: ['heartsReceived', 1] }, { blurb: 'Left by a friend, with a note: “you’ll want this.”' }),
  // treats
  _gR('berry-biscuit', 'Berry biscuit', 'treat', { 'crop:strawberry': 2 }, { treats: 1 }, { start: 1 }, { blurb: 'One for the jar.' }),
  _gR('veg-stew', 'Veg stew', 'treat', { 'crop:carrot': 2, 'crop:potato': 2 }, { treats: 1 }, { start: 1 }, { blurb: 'It smells better than it looks.' }),
  _gR('apple-crumble', 'Apple crumble', 'treat', { 'crop:apple': 3 }, { treats: 2 }, { level: 5 }, { blurb: 'It disappears very quickly.' }),
  _gR('honey-cake', 'Honey cake', 'treat', { honey: 1, 'crop:blueberry': 2 }, { treats: 2 }, { visitor: 'bumblebee' }, { blurb: 'Sticky paws for a week.' }),
  _gR('fish-pie', 'Fish pie', 'treat', { 'fish:roach': 1, 'crop:potato': 2 }, { treats: 2 }, { fact: ['fished', 5] }, { blurb: 'Nobody has ever said no to this.' }),
  _gR('royal-feast', 'Royal feast', 'treat', { 'crop:melon': 1, honey: 2, 'crop:fig': 2 }, { treats: 3 }, { bottle: 1 }, { blurb: 'A recipe in a very old hand.' }),
  // fun
  _gR('music-box', 'Music box', 'fun', { 'crop:cherry': 3, 'crop:hazel': 2 }, { emote: 'waltz' }, { level: 4 }, { blurb: 'Wind it up and you start to waltz. It is not optional.' }),
  _gR('jazz-hands', 'Sparkle gloves', 'fun', { 'crop:golden-sunflower': 1 }, { emote: 'jazz' }, { fact: ['plantsFound', 25] }, { blurb: 'Jazz hands, in a jar.' }),
]);
const _GR_MAP = new Map(GARDEN_RECIPES.map(r => [r.id, r]));
function gardenRecipe(id) { return _GR_MAP.get(String(id)) || null; }
/** Where on a pet a made accessory goes (the design's slot, by its id): itemHead, itemNeck or itemBack. */
function petCraftFieldOf(id) { const s = String(id); return s.startsWith('pi-cwing') ? 'itemBack' : s.startsWith('pi-cband') || s.startsWith('pi-ccoll') ? 'itemNeck' : s.startsWith('pi-c') ? 'itemHead' : ''; }

/* ---------- what you carry: fish count by kind, whatever their size ---------- */
function _grHave(key, items) {
  items = items || gardenWallet().items;
  if (key.startsWith('fish:')) { const id = key.slice(5); let n = 0; for (const q of [0, 1, 2, 3]) n += Math.floor(items[`fish:${id}-${q}`] || 0); return n; }
  return Math.max(0, Math.floor(items[key] || 0));
}
/** The ledger's lines for taking n of an item (the smallest fish first). */
function _grTake(key, n, items, out) {
  if (!key.startsWith('fish:')) { out[key] = (out[key] || 0) - n; return; }
  const id = key.slice(5); let left = n;
  for (const q of [0, 1, 2, 3]) { if (left <= 0) break; const k = `fish:${id}-${q}`, have = Math.floor(items[k] || 0), take = Math.min(have, left); if (take > 0) { out[k] = (out[k] || 0) - take; left -= take; } }
}
/** A name and a sell value for an ingredient. */
function gardenCraftItemName(key) {
  const [kind, id] = String(key).split(':');
  if (kind === 'crop') { const p = gardenPlant(id); return p ? (p.yield && p.yield.item ? p.yield.item[0].toUpperCase() + p.yield.item.slice(1) : p.name.replace(/ (tree|bush|plant|vine)$/i, '')) : id; }
  if (kind === 'fish') { const d = gardenFishDef(id); return d ? d.name : id; }
  if (kind === 'bug') { const d = gardenBugDef(id); return d ? d.name : id; }
  if (kind === 'bq') { const b = GARDEN_BOUQUETS.find(x => x.id === id); return b ? b.name : id; }
  if (kind === 'seed') { const p = gardenPlant(id); return p ? p.name + ' seed' : id; }
  if (kind === 'decor') { const d = gardenDecor(id); return d ? d.name : id; }
  return { honey: 'Honey', clover: 'Four-leaf clover', fertiliser: 'Fertiliser' }[key] || key;
}
function _grValue(key, m) {
  if (key.startsWith('fish:')) { try { return gardenCatchEach(key + '-0'); } catch (e) { return 0; } }
  if (key.startsWith('bug:')) { try { return gardenCatchEach(key); } catch (e) { return 0; } }
  try { return gardenSellPrice(key, m); } catch (e) { return 0; }
}

/* ---------- knowing a recipe ---------- */
function _grFacts(m) { try { return gardenFacts(m); } catch (e) { return {}; } }
function _grMet(r, m, F, items) {
  const L = r.learn || {}, g = _gdG();
  if (L.start) return true;
  if (items['recipe:' + r.id] > 0) return true;
  if (L.level) return m.level.level >= L.level;
  if (L.fact) return (Number(F[L.fact[0]]) || 0) >= L.fact[1];
  if (L.visitor) return !!g.disc[L.visitor];
  return false;
}
function gardenRecipeKnown(id, mArg) {
  const r = gardenRecipe(id); if (!r) return false;
  const m = mArg || gardenModel();
  return _grMet(r, m, _grFacts(m), m.wallet.items);
}
/** A note found: picking things in the recipe's season. It stays yours (a ledger line). Called from the tick. */
function gardenCraftTick(mArg) {
  try {
    const m = mArg || gardenModel(), items = m.wallet.items, g = _gdG();
    const key = 'season:' + m.season, count = Number((g.prefs.rch || {})[m.season]) || 0, got = [];
    const harv = m.wallet.n.harvests || 0, at = g.prefs.rchn == null ? harv : g.prefs.rchn;
    if (harv > at) { g.prefs.rch = Object.assign({}, g.prefs.rch, { [m.season]: count + (harv - at) }); }
    g.prefs.rchn = harv;
    void key;
    const n = Number((g.prefs.rch || {})[m.season]) || 0;
    for (const r of GARDEN_RECIPES) if (r.learn.season === m.season && n >= (r.learn.n || 1) && !(items['recipe:' + r.id] > 0)) { _gdLed('rc', { i: { ['recipe:' + r.id]: 1 } }); got.push(r.id); }
    if (got.length) { _gdSave(); _gdEmit('recipe', { ids: got }); }
    return got;
  } catch (e) { return []; }
}
/** Every recipe, for the bench. */
function gardenRecipes(mArg) {
  const m = mArg || gardenModel(), items = m.wallet.items, F = _grFacts(m), seen = _gdG().prefs.rcs || {};
  return GARDEN_RECIPES.map(r => {
    const known = _grMet(r, m, F, items), need = Object.entries(r.need).map(([k, n]) => ({ key: k, n, have: _grHave(k, items) })), can = known && need.every(x => x.have >= x.n);
    return { def: r, id: r.id, known, can, need, missing: need.filter(x => x.have < x.n), seen: !!seen[r.id], owned: Math.floor(items['craft:' + r.id] || 0), everMade: !!(_gdG().prefs.rcm || {})[r.id] };
  });
}
function gardenCraftFresh(mArg) { return gardenRecipes(mArg).filter(r => r.known && !r.seen).length; }
function gardenCraftSeen() { const g = _gdG(), cur = g.prefs.rcs || {}, next = Object.assign({}, cur); let ch = false; for (const r of gardenRecipes()) if (r.known && !cur[r.id]) { next[r.id] = 1; ch = true; } if (ch) { g.prefs.rcs = next; _gdSave(); } }
function gardenCraftOwned(id) { return Math.max(0, Math.floor(gardenWallet().items['craft:' + id] || 0)); }
function gardenCraftedSet() { const out = new Set(), items = gardenWallet().items; for (const k of Object.keys(items)) if (k.startsWith('craft:') && items[k] > 0) out.add(k.slice(6)); return out; }

/* ---------- making one ---------- */
function gardenCraft(id) {
  const r = gardenRecipe(id);
  if (!r) return _gdNo('There is no such recipe');
  const m = gardenModel(), items = m.wallet.items, g = _gdG();
  if (!_grMet(r, m, _grFacts(m), items)) return Object.assign(_gdNo(`You have not learnt ${r.name.toLowerCase()} yet`), { why: 'unknown' });
  const short = Object.entries(r.need).find(([k, n]) => _grHave(k, items) < n);
  if (short) return Object.assign(_gdNo(`You need ${short[1]} ${gardenCraftItemName(short[0]).toLowerCase()} for that`), { why: 'missing', item: short[0] });
  const mk = r.make, i = {};
  const fd = _gcFdOf(g, m.today);
  if (mk.treats) { if ((Number(fd.ct) || 0) + mk.treats > GARDEN_CRAFT.dayTreats) return Object.assign(_gdNo('The oven needs a rest: more treats tomorrow'), { why: 'cap' }); }
  for (const [k, n] of Object.entries(r.need)) _grTake(k, n, items, i);
  if (mk.decor) i['decor:' + mk.decor] = (i['decor:' + mk.decor] || 0) + 1;
  else if (mk.treats) i.ptreat = mk.treats;
  else i['craft:' + r.id] = 1;
  const lk = 'cr.' + m.today + '.' + _gdUid('');
  const paths = [['led', lk]];
  if (mk.treats) paths.push(['fd', m.today]);
  const mark = _gdMark(paths);
  g.led[lk] = { d: m.today, k: 'cr', i, x: GARDEN_CRAFT.xp, n: 1 };
  if (mk.treats) { const f = _gcFdOf(g, m.today); f.ct = (Number(f.ct) || 0) + mk.treats; }
  if (mk.decor && !g.disc[mk.decor]) g.disc[mk.decor] = m.today;
  const made = Object.assign({}, g.prefs.rcm, { [r.id]: m.today }); g.prefs.rcm = made;
  _gdEmit('craft', { id: r.id });
  return Object.assign(_gdDone(`Made: ${r.name}`, 'crafting', mark, { icon: 'hammer' }), { make: mk, recipe: r.id });
}
function _gcFdOf(g, day) { if (!g.fd || typeof g.fd !== 'object') g.fd = {}; if (!g.fd[day] || typeof g.fd[day] !== 'object') g.fd[day] = {}; return g.fd[day]; }

/* ---------- selling: what went in, and a tenth, and not much of it ---------- */
function gardenCraftSellPrice(id, mArg) {
  const r = gardenRecipe(id); if (!r || r.make.decor || r.make.treats) return 0;
  const m = mArg || gardenModel(); let v = 0;
  for (const [k, n] of Object.entries(r.need)) v += _grValue(k, m) * n;
  return Math.max(1, Math.floor(v * GARDEN_CRAFT.sellMargin));
}
function gardenCraftMarket(mArg) { const m = mArg || gardenModel(), fd = (_gdG().fd || {})[m.today] || {}; return { paid: Number(fd.mc) || 0, cap: GARDEN_CRAFT.daySell, left: Math.max(0, GARDEN_CRAFT.daySell - (Number(fd.mc) || 0)) }; }
function gardenCraftSell(item, n, o) {
  o = o || {};
  const id = String(item).slice(6), m = gardenModel(), g = _gdG(), have = gardenHas(item), each = gardenCraftSellPrice(id, m), L = gardenCraftMarket(m);
  n = Math.max(1, Math.min(have, Math.floor(Number(n) || 1)));
  if (have < 1) return _gdNo('Nothing to sell');
  if (!each) return _gdNo('The market does not buy that');
  if (L.left <= 0) return Object.assign(_gdNo('The market has bought enough handmade things today'), { why: 'cap' });
  const coins = Math.min(L.left, each * n), lk = 's.' + m.today + '.' + _gdUid('');
  const mark = _gdMark([['led', lk], ['fd', m.today]]);
  g.led[lk] = { d: m.today, k: 's', c: coins, i: { [item]: -n }, n };
  const f = _gcFdOf(g, m.today); f.mc = (Number(f.mc) || 0) + coins;
  _gdEmit('sell', { item, n });
  return _gdDone(o.quiet ? '' : `Sold for ${coins} coins`, 'selling', mark, { icon: 'coins', quiet: o.quiet });
}

/* ---------- a message in a bottle: every few days, on the shore, while there is a recipe left to find ---------- */
function gardenBottleNow(mArg) {
  try {
    const m = mArg || gardenModel(), g = _gdG();
    if (g.prefs.bt === m.today || gardenHash('bottle|' + m.today) % 3 !== 0) return null;
    const left = GARDEN_RECIPES.filter(r => r.learn.bottle && !(m.wallet.items['recipe:' + r.id] > 0));
    if (!left.length) return null;
    const h = gardenHash('bottle-at|' + m.today), x = 6 + (h % 20);
    return { recipe: left[h % left.length].id, x: x + 0.5, y: 12.75 };
  } catch (e) { return null; }
}
function gardenBottleOpen() {
  const B = gardenBottleNow(); if (!B) return _gdNo('There is no bottle today');
  const g = _gdG();
  _gdLed('rc', { i: { ['recipe:' + B.recipe]: 1 } });
  g.prefs.bt = gardenModel().today;
  _gdSave();
  _gdEmit('recipe', { ids: [B.recipe], bottle: 1 });
  return { ok: true, recipe: B.recipe, msg: `A recipe in a bottle: ${gardenRecipe(B.recipe).name}` };
}
