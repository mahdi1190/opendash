// server/actions/ops-agent.mjs - the low-risk things the agent may do itself (lib/agent-tiers.mjs): play in the
// garden, set a status, change outfits, look after the pet, ordinary display settings. Each runs the PAGE's own rules
// (lib/agent-engine.mjs) on a copy of the state, then keeps only what those rules changed, so the economy, the caps and
// the unlocks are the app's and every change has an undo token.
//
//   garden.play      [garden]        plant, water, feed, trim, harvest, dig up, move, decorate, buy, sell, bouquet, collect
//   profile.set      [set_profile]   status, avatar parts, card text
//   wardrobe.change  [set_wardrobe]  save, wear, rename or remove an outfit, or 'surprise me'
//   pet.care         [pet]           feed, pat, teach, dress, name, adopt
//   setting.set      (set_setting)   the settings kept in the state (mcp/agent-tools.mjs; the allow-list is lib/agent-settings.mjs)
//
// Friends see your status, card text and your pet's name. So the in-app assistant, which reads emails and invites, may
// not write free text into those by itself (assistantRefuse): a preset status is fine, anything else is a proposal the
// person approves. Otherwise an email could use a status to send your data to your friends.

import { ActionError, clone, same, truncate } from './model.mjs';
import { pageEngine, plain } from '../../lib/agent-engine.mjs';
import { PF_MAX, profileText, profileEmojiOk } from '../../lib/profile-avatar.mjs';
import { settingDef, settingCheck } from '../../lib/agent-settings.mjs';

const obj = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
const ID = { type: 'string', maxLength: 64, pattern: '^[A-Za-z0-9_.:~-]+$' };
const CELL = { type: 'integer', minimum: 0, maximum: 200 };

export const STATUS_PRESETS = Object.freeze(['Focusing', 'Working', 'Writing', 'In a meeting', 'On a break', 'Working from home', 'Travelling', 'On holiday', 'Off sick', 'Away']);

/** The page's rules over a copy of the state. */
function engineFor(ctx) {
  const work = clone(ctx.s);
  return { work, e: pageEngine(work, { now: ctx.now, zone: ctx.zone || 'UTC', config: ctx.cfg || {} }) };
}
const refused = (msg) => new ActionError('NOT_POSSIBLE', msg || 'That cannot be done right now.');

// ─── Garden ────────────────────────────────────────────────────────────────
const GARDEN_ACTIONS = {
  plant: (e, p) => e.gardenPlantAt(p.plant, p.x, p.y),
  water: (e, p) => e.gardenWater(p.id),
  water_all: (e) => e.gardenWaterAll(),
  feed: (e, p) => e.gardenFeed(p.id),
  prune: (e, p) => e.gardenPrune(p.id),
  harvest: (e, p) => e.gardenHarvest(p.id),
  harvest_all: (e) => e.gardenHarvestAll(),
  dig_up: (e, p) => e.gardenDig(p.id),
  move_plant: (e, p) => e.gardenMovePlant(p.id, p.x, p.y),
  place_decor: (e, p) => e.gardenPlaceDecor(p.item, p.x, p.y, p.r),
  move_decor: (e, p) => e.gardenMoveDecor(p.id, p.x, p.y),
  turn_decor: (e, p) => e.gardenRotateDecor(p.id),
  style_decor: (e, p) => e.gardenStyleDecor(p.id),
  put_away_decor: (e, p) => e.gardenRemoveDecor(p.id),
  buy: (e, p) => e.gardenBuy(p.item, p.n),
  buy_land: (e, p) => e.gardenBuyLand(p.item),
  sell: (e, p) => e.gardenSell(p.item, p.n),
  bouquet: (e, p) => e.gardenMakeBouquet((p.stems || []).map(id => ({ id }))),
  collect: (e, p) => e.gardenCollect(p.id),
  craft: (e, p) => e.gardenCraft(p.recipe),
};
const GARDEN_NEEDS = {
  plant: ['plant', 'x', 'y'], water: ['id'], feed: ['id'], prune: ['id'], harvest: ['id'], dig_up: ['id'], move_plant: ['id', 'x', 'y'],
  place_decor: ['item', 'x', 'y'], move_decor: ['id', 'x', 'y'], turn_decor: ['id'], style_decor: ['id'], put_away_decor: ['id'],
  buy: ['item'], buy_land: ['item'], sell: ['item'], bouquet: ['stems'], collect: ['id'], craft: ['recipe'],
};
const gardenTally = (w) => ({ coins: w.coins, level: w.level && w.level.level, items: w.items });

function runGarden(ctx, p) {
  for (const f of GARDEN_NEEDS[p.action] || []) if (p[f] === undefined) throw new ActionError('INVALID_PARAMS', `garden ${p.action} needs ${f}`, { field: f, hint: 'get_garden shows plant and decoration ids, the shop and your bag' });
  const { work, e } = engineFor(ctx);
  // The page's gameStats() swallows its own errors and the wallet would then leave out focus coins: never act on a wrong balance.
  try { e._gmCompute(); } catch { throw refused('The garden could not work out your coins just now. Try it in the app.'); }
  if (!e.gardenEnsure()) throw refused('The garden is not ready yet. Ask the user to open it in OpenDash once.');
  // A first garden is the page's own set-up (not part of this action, and not undone with it).
  const base = plain(work.garden);
  const before = plain(gardenTally(e.gardenWallet()));
  const r = plain(GARDEN_ACTIONS[p.action](e, p));
  if (!r || !r.ok) throw refused(r && r.msg);
  const after = plain(gardenTally(e.gardenWallet()));
  const next = plain(work.garden);
  // Each changed entry is its own entity (the paths the page's Undo records), so undoing this does not
  // overwrite what happened elsewhere in the garden since. 'seen' only remembers moments: never undone.
  ctx.s.garden = base;
  let n = 0;
  for (const map of Object.keys(next)) {
    if (!next[map] || typeof next[map] !== 'object' || map === 'seen') continue;
    const a = base[map] || {}, b = next[map];
    for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (same(a[id] === undefined ? null : a[id], b[id] === undefined ? null : b[id])) continue;
      ctx.touch(`garden:${map}:${id}`);
      n++;
    }
  }
  ctx.s.garden = next;
  const changes = [{ entity: 'garden', id: p.action, label: r.msg || p.action.replace(/_/g, ' '), field: 'garden', from: null, to: p.action }];
  if (before.coins !== after.coins) changes.push({ entity: 'garden', id: 'coins', label: 'Coins', field: 'coins', from: before.coins, to: after.coins });
  if (before.level !== after.level) changes.push({ entity: 'garden', id: 'level', label: 'Garden level', field: 'level', from: before.level, to: after.level });
  return { summary: truncate(r.msg || `Garden: ${p.action.replace(/_/g, ' ')}`, 200), changes: n ? changes : [] };
}

// ─── Profile ───────────────────────────────────────────────────────────────
const PROFILE_TEXT = { name: 'name', pronouns: 'pronouns', bio: 'bio', working: 'working' };

/** {part: id} maps from the model: the page maps every id through its tables, this only keeps them small. */
function idMap(o, field, max) {
  const keys = Object.keys(o);
  if (keys.length > max || keys.some(k => !/^[A-Za-z0-9_-]{1,40}$/.test(k) || typeof o[k] !== 'string' || !/^[A-Za-z0-9_#-]{1,40}$/.test(o[k]))) throw new ActionError('BAD_VALUE', `${field} must be {part: id}`, { field });
}

function runProfile(ctx, p) {
  if (p.avatar) idMap(p.avatar, 'avatar', 60);
  const { work, e } = engineFor(ctx);
  const patch = {}, changes = [];
  const before = plain(e.profileGet());
  for (const k of Object.keys(PROFILE_TEXT)) {
    if (p[k] === undefined) continue;
    patch[k] = profileText(p[k], (PF_MAX && PF_MAX[k]) || 200);
    changes.push({ entity: 'profile', id: k, label: k, field: k, from: before[k] || '', to: patch[k] });
  }
  if (p.status !== undefined) {
    const st = p.status;
    const clear = st.clear === true;
    const text = clear ? '' : profileText(st.preset || st.text || '', (PF_MAX && PF_MAX.status) || 80);
    const emoji = clear ? '' : (st.emoji && profileEmojiOk(st.emoji) ? st.emoji : '');
    if (st.emoji && !clear && !emoji) throw new ActionError('BAD_VALUE', 'That emoji is not one the status can use', { field: 'status.emoji' });
    if (!clear && !text && !emoji) throw new ActionError('INVALID_PARAMS', 'give a status (preset, text or emoji), or clear:true', { field: 'status' });
    patch.status = { emoji, text, until: !clear && st.minutes ? ctx.now + st.minutes * 60000 : 0 };
    changes.push({ entity: 'profile', id: 'status', label: 'Status', field: 'status', from: (before.status && before.status.text) || '', to: clear ? '' : `${emoji} ${text}`.trim() });
  }
  if (p.avatar !== undefined) {
    patch.avatar = p.avatar;   // the page's profileSet maps every id through the kit's tables
    changes.push({ entity: 'profile', id: 'avatar', label: 'Avatar', field: 'avatar', from: null, to: Object.keys(p.avatar).join(', ') });
  }
  if (p.react !== undefined) { patch.react = p.react; changes.push({ entity: 'profile', id: 'react', label: 'Avatar reacts to your day', field: 'react', from: before.react !== false, to: p.react }); }
  if (!changes.length) throw new ActionError('INVALID_PARAMS', 'nothing to change: give status, pronouns, bio, working, name, avatar or react', {});
  e.profileSet(patch, { quiet: true });
  ctx.touch('key:profile');
  ctx.s.profile = plain(work.profile);
  return { summary: changes.length === 1 && changes[0].id === 'status' ? `Status: ${changes[0].to || 'cleared'}` : `Profile: ${changes.map(c => c.label).join(', ')}`, changes };
}
function profileRefuse(p) {
  for (const k of Object.keys(PROFILE_TEXT)) if (p[k] !== undefined) return `friends see your ${k}, so changing it needs the user's approval`;
  if (p.status && p.status.clear !== true) {
    if (p.status.text !== undefined) return 'friends see your status, so free text needs the user\'s approval: use a preset, or propose it';
    if (p.status.preset !== undefined && !STATUS_PRESETS.includes(p.status.preset)) return `that is not a preset status (${STATUS_PRESETS.join(', ')})`;
  }
  return null;
}

// ─── Wardrobe ──────────────────────────────────────────────────────────────
function runWardrobe(ctx, p) {
  const { work, e } = engineFor(ctx);
  const list = () => plain(e.profileWardrobeList());
  const has = (id) => { const it = list().find(x => x.id === id); if (!it) throw new ActionError('NOT_FOUND', 'there is no outfit with that id', { field: 'id', hint: 'get_profile {part:"wardrobe"} lists them', valid: list().map(x => x.id).slice(0, 6) }); return it; };
  let summary = '';
  if (p.action === 'save') {
    const id = e.profileWardrobeSave(e.profileOutfitOf(e.profileGet().avatar), p.name || '');
    if (!id) throw refused('Six outfits are saved already: remove one first.');
    summary = `Saved the outfit${p.name ? ` "${truncate(p.name, 24)}"` : ''}`;
  } else if (p.action === 'wear') {
    const it = has(p.id);
    e.profileSet({ avatar: e.profileOutfitWear(e.profileGet().avatar, it.look) }, { quiet: true });
    summary = `Wearing "${it.name}"`;
  } else if (p.action === 'rename') {
    const it = has(p.id);
    e.profileWardrobeRename(p.id, p.name || '');
    summary = `Renamed "${it.name}"`;
  } else if (p.action === 'remove') {
    const it = has(p.id);
    e.profileWardrobeRemove(p.id);
    summary = `Removed the outfit "${it.name}"`;
  } else if (p.action === 'surprise') {
    if (typeof e.profileOutfitThemed !== 'function') throw refused('Surprise outfits are not available.');
    e.profileSet({ avatar: e.profileOutfitThemed(p.theme || '', Math.random, (k, id) => !e.profileLockOf(k, id, e.profileUnlockCtx()), e.profileGet().avatar) }, { quiet: true });
    summary = 'A surprise outfit';
  }
  ctx.touch('key:wardrobe'); ctx.touch('key:profile');
  ctx.s.wardrobe = plain(work.wardrobe);
  ctx.s.profile = plain(work.profile);
  return { summary, changes: [{ entity: 'wardrobe', id: p.action, label: summary, field: 'wardrobe', from: null, to: p.action }] };
}

// ─── Pet ───────────────────────────────────────────────────────────────────
function runPet(ctx, p) {
  if (p.look) idMap(p.look, 'look', 30);
  const { work, e } = engineFor(ctx);
  const before = plain(e.petGet());
  const needPet = () => { if (!before.look) throw refused('There is no pet yet: adopt one first.'); };
  let msg = '';
  if (p.action === 'adopt') {
    if (before.look) throw refused('You have a companion already.');
    e.petAdopt(Object.assign({}, p.look || {}, p.name ? { name: p.name } : {}));
    msg = 'A new companion came home';
  } else if (p.action === 'feed') {
    needPet();
    const r = plain(e.petFeed());
    if (!r.ok) throw refused(r.msg);
    msg = r.msg;
  } else if (p.action === 'pat') {
    needPet();
    const r = plain(e.petPat());
    if (!r.ok) throw refused();
    msg = 'A pat';
  } else if (p.action === 'teach' || p.action === 'unteach') {
    needPet();
    if (!p.trick) throw new ActionError('INVALID_PARAMS', `pet ${p.action} needs trick`, { field: 'trick' });
    if (p.action === 'teach') { const r = plain(e.petTeach(p.trick)); if (!r.ok) throw refused(r.msg); msg = `Taught a trick: ${p.trick}`; } else { e.petUnteach(p.trick); msg = `Took back a trick: ${p.trick}`; }
  } else if (p.action === 'learn') {
    // 2.23: the trick book, by the page's own rules: treats and coins that are really yours, nothing that has to be earned
    needPet();
    if (!p.trick) throw new ActionError('INVALID_PARAMS', 'pet learn needs trick', { field: 'trick' });
    const r = plain(e.petBookBuy(p.trick, p.pay));
    if (!r.ok) throw refused(`Not yet: ${r.msg || r.why}`);
    msg = `Learnt a trick: ${p.trick}`;
  } else if (p.action === 'perform') {
    needPet();
    if (!p.trick) throw new ActionError('INVALID_PARAMS', 'pet perform needs trick', { field: 'trick' });
    const r = plain(e.petPerformCue(p.trick));
    if (!r.ok) throw refused(r.why === 'locked' ? 'Your pet has not learnt that yet: see get_profile {part:"pet"}.' : 'There is no such trick.');
    msg = `Asked for a trick: ${p.trick}`;
  } else if (p.action === 'wear_crafted' || p.action === 'take_off_crafted') {
    needPet();
    if (!p.item) throw new ActionError('INVALID_PARAMS', `pet ${p.action} needs item`, { field: 'item' });
    const rid = p.item.replace(/^craft:/, ''), rec = plain(e.gardenRecipe(rid));
    if (!rec || !rec.make || !rec.make.pet) throw refused('That is not something a pet can wear.');
    if (p.action === 'wear_crafted' && !plain(e.gardenCraftOwned(rid))) throw refused('Make it at the crafting bench first.');
    const f = e.petCraftFieldOf(rec.make.pet);
    e.petSet({ look: { [f]: p.action === 'wear_crafted' ? rec.make.pet : '' } }, { quiet: true });
    msg = p.action === 'wear_crafted' ? `Wearing: ${rec.name}` : `Took off: ${rec.name}`;
  } else if (p.action === 'choose' || p.action === 'unlock' || p.action === 'pack') {
    // 2.23: the collection, by the page's own rules: spending needs what you have earned, and a pet not yet earned stays locked
    needPet();
    if (!p.species) throw new ActionError('INVALID_PARAMS', `pet ${p.action} needs species`, { field: 'species' });
    const r = plain(p.action === 'choose' ? e.petChoose(p.species) : p.action === 'unlock' ? e.petUnlock(p.species) : e.petPackToggle(p.species));
    if (!r.ok) throw refused(`Not yet: ${r.why}`);
    msg = p.action === 'choose' ? `Now with you: ${p.species}` : p.action === 'unlock' ? `${p.species} joined the collection` : r.out ? `${p.species} is out in the garden` : `${p.species} came in`;
  } else if (p.action === 'play') {
    needPet();
    const r = plain(e.petPlay());
    if (!r.ok) throw refused();
    msg = 'A game together';
  } else if (p.action === 'buy') {
    needPet();
    if (!p.item) throw new ActionError('INVALID_PARAMS', 'pet buy needs item', { field: 'item' });
    const r = plain(p.item.startsWith('lure:') ? e.petLureBuy(p.item.slice(5)) : e.petBuy(p.item));
    if (!r.ok) throw refused(`Not yet: ${r.why}`);
    msg = `Bought ${p.item}`;
  } else if (p.action === 'dress') {
    needPet();
    if (!p.look) throw new ActionError('INVALID_PARAMS', 'pet dress needs look', { field: 'look' });
    if (p.look.species && plain(e.petLockOf('species', p.look.species, plain(e.petUnlockCtx()))) && !plain(e.petOwnsSpecies(p.look.species))) throw refused('That pet has not been earned yet: see get_profile {part:"pet"}.');
    e.petSet({ look: p.look }, { quiet: true });   // the page's petNormalize keeps only ids from the kit's tables
    msg = 'A new look';
  } else if (p.action === 'name') {
    needPet();
    if (!p.name) throw new ActionError('INVALID_PARAMS', 'pet name needs name', { field: 'name' });
    e.petSet({ name: p.name }, { quiet: true });
    msg = `Named your companion ${truncate(p.name, 24)}`;
  } else if (p.action === 'put_away' || p.action === 'bring_out') {
    needPet();
    e.petSet({ on: p.action === 'bring_out' }, { quiet: true });
    msg = p.action === 'bring_out' ? 'Your companion is back' : 'Your companion is put away (nothing is lost)';
  }
  ctx.touch('key:pet');
  ctx.s.pet = plain(work.pet);
  return { summary: truncate(msg, 200), changes: [{ entity: 'pet', id: p.action, label: truncate(msg, 120), field: 'pet', from: null, to: p.action }] };
}
function petRefuse(p) {
  if (p.name !== undefined) return 'friends can see your pet\'s name, so naming it needs the user\'s approval';
  return null;
}

// ─── Settings kept in the state ────────────────────────────────────────────
function runSetting(ctx, p) {
  const def = settingDef(p.key);
  if (!def || def.kind !== 'state') throw new ActionError('INVALID_PARAMS', 'that setting cannot be changed here', { field: 'key', hint: 'set_setting takes the settings get_settings lists' });
  const why = settingCheck(def, p.value);
  if (why) throw new ActionError('BAD_VALUE', why, { field: 'value', valid: def.options });
  const s = ctx.s;
  let from;
  if (p.key === 'theme') {
    from = s.autoTheme ? 'auto' : (s.theme === 'dark' ? 'dark' : 'light');
    ctx.touch('key:theme'); ctx.touch('key:autoTheme');
    s.autoTheme = p.value === 'auto';
    if (p.value !== 'auto') s.theme = p.value;
  } else if (p.key === 'density') {
    from = s.density === 'compact' ? 'compact' : 'normal';
    ctx.touch('key:density');
    s.density = p.value;
  } else if (p.key === 'funLevel') {
    from = (s.game && s.game.prefs && s.game.prefs.fun) || 'subtle';
    ctx.touch('gamepref:fun');
    s.game = s.game && typeof s.game === 'object' ? s.game : {};
    s.game.prefs = s.game.prefs && typeof s.game.prefs === 'object' ? s.game.prefs : {};
    s.game.prefs.fun = p.value;
  }
  return { summary: `${def.label}: ${p.value}`, changes: [{ entity: 'setting', id: p.key, label: def.label, field: p.key, from, to: p.value }] };
}

export const AGENT_OPS = [
  {
    name: 'garden.play', tool: 'garden',
    description: "Play in the user's garden with the app's own rules: action plant {plant, x, y}, water {id}, water_all, feed {id}, prune {id}, harvest {id}, harvest_all, dig_up {id}, move_plant {id, x, y}, place_decor {item: decoration id, x, y, r?}, move_decor {id, x, y}, turn_decor {id}, style_decor {id}, put_away_decor {id}, buy {item: 'seed:<plant>', 'decor:<id>' or a tool id, n?}, buy_land {item: the land's id, from get_garden's land list}, sell {item: 'crop:<plant>', 'bq:<id>', 'decor:<id>' or 'honey', n?}, bouquet {stems: [plant ids]}, collect {id: compost bin, beehive or wishing well}, craft {recipe: a recipe id from get_garden {view:'recipes'}: uses up what it needs from the basket and bag, and makes a hat, a pet accessory, a decoration or treats; it cannot make coins}. Coins only come from focus time, finished tasks and selling: nothing here can make them, and a refused action says why. get_garden shows ids, the bag and the shop. Returns what changed and an undo token (undo_change).",
    schema: obj({
      action: { type: 'string', enum: Object.keys(GARDEN_ACTIONS) },
      plant: { ...ID, description: 'plant id (a seed in the bag)' },
      item: { type: 'string', maxLength: 80, pattern: '^[a-z0-9:-]+$', description: "shop or bag item, e.g. 'seed:daisy', 'crop:tomato', 'decor:bench', a tool id; for place_decor the decoration id" },
      id: { ...ID, description: 'the uid of a plant or decoration in the garden (get_garden)' },
      x: CELL, y: CELL, r: { type: 'integer', minimum: 0, maximum: 3 },
      n: { type: 'integer', minimum: 1, maximum: 20, description: 'how many (default 1)' },
      stems: { type: 'array', items: ID, minItems: 1, maxItems: 24 },
      recipe: { ...ID, description: "for craft: a recipe id (get_garden {view:'recipes'})" },
    }, ['action']),
    run: runGarden,
  },
  {
    name: 'profile.set', tool: 'set_profile',
    description: `Change the user's profile: status {preset: ${STATUS_PRESETS.join(' | ')}, emoji?, minutes? (when it ends)} or {text} or {clear: true}; avatar {part: id} (get_profile lists parts and ids); react; pronouns, bio, working, name. FRIENDS SEE THE STATUS AND THE CARD TEXT, so the in-app assistant can set a preset status or clear it by itself, but free text must go through propose_changes. Returns an undo token (undo_change).`,
    schema: obj({
      status: obj({ preset: { type: 'string', maxLength: 40 }, text: { type: 'string', maxLength: 120 }, emoji: { type: 'string', maxLength: 16 }, minutes: { type: 'integer', minimum: 1, maximum: 10080 }, clear: { type: 'boolean' } }),
      avatar: { type: 'object', additionalProperties: { type: 'string', maxLength: 40, pattern: '^[A-Za-z0-9_#-]+$' }, maxProperties: 60 },
      react: { type: 'boolean' },
      pronouns: { type: 'string', maxLength: 40 }, bio: { type: 'string', maxLength: 400 }, working: { type: 'string', maxLength: 120 }, name: { type: 'string', maxLength: 60 },
    }),
    assistantRefuse: profileRefuse,
    run: runProfile,
  },
  {
    name: 'wardrobe.change', tool: 'set_wardrobe',
    description: "The user's saved outfits (six at most): action save {name?} (what they wear now), wear {id}, rename {id, name}, remove {id}, surprise {theme?}. get_profile {part:'wardrobe'} lists them. Returns an undo token (undo_change).",
    schema: obj({ action: { type: 'string', enum: ['save', 'wear', 'rename', 'remove', 'surprise'] }, id: ID, name: { type: 'string', maxLength: 24 }, theme: { type: 'string', maxLength: 30, pattern: '^[a-z0-9-]*$' } }, ['action']),
    run: runWardrobe,
  },
  {
    name: 'pet.care', tool: 'pet',
    description: "The user's companion pet with the app's own rules (treats are earned by finishing tasks and focus; nothing here makes them): action feed, pat, play, teach {trick}, unteach {trick}, dress {look: {part: id}}, put_away, bring_out, adopt {look?}, name {name}, choose {species} (make an earned pet your companion), unlock {species} (claim it or pay its treats or coins), pack {species} (let it out in the garden or bring it in), buy {item: 'toy:yarn' | 'bed:basket' | 'hat:chef' | 'lure:apple'}, learn {trick, pay?: 'treats' | 'coins'} (buy a trick from the trick book), perform {trick} (it does a trick it knows, in the open app), wear_crafted {item: a recipe id} and take_off_crafted {item} (what you made for it at the bench). A pet is never sad or hungry. Friends can see its name, so naming goes through propose_changes for the in-app assistant. Returns an undo token (undo_change).",
    schema: obj({ action: { type: 'string', enum: ['feed', 'pat', 'play', 'teach', 'unteach', 'dress', 'put_away', 'bring_out', 'adopt', 'name', 'choose', 'unlock', 'pack', 'buy', 'learn', 'perform', 'wear_crafted', 'take_off_crafted'] }, trick: ID, pay: { type: 'string', enum: ['treats', 'coins'] }, species: ID, item: { type: 'string', maxLength: 40, pattern: '^(?:[a-zA-Z]+:)?[a-z0-9-]+$' }, name: { type: 'string', maxLength: 24 }, look: { type: 'object', additionalProperties: { type: 'string', maxLength: 40, pattern: '^[A-Za-z0-9_#-]+$' }, maxProperties: 30 } }, ['action']),
    assistantRefuse: petRefuse,
    run: runPet,
  },
  {
    name: 'setting.set', tool: 'set_state_setting',
    description: 'Internal: set_setting uses this for the settings kept in the dashboard state. Use set_setting.',
    schema: obj({ key: { type: 'string', maxLength: 60 }, value: {} }, ['key', 'value']),
    run: runSetting,
  },
];
