// server/actions/ops-sensitive.mjs - what the agent may only ask for (lib/agent-tiers.mjs): anything that sends something
// to another person, shares data, adds or removes a friend or a device, signs in, moves money totals or installs an update.
//
// Every op here is `danger`: full mode needs a dry run and its confirm token, and the in-app assistant can only put it
// in a proposal, which the person approves on screen (the actions layer refuses anything else from it). An op does no
// work when it runs: it checks its values, words the preview from the app's own data (never from text the model gave,
// so a proposal cannot say "Priya" and mean someone else) and asks for an EFFECT. server/routes/agent.mjs does the effect
// after the approval, through the same route the page uses, and hands back only allow-listed fields.
//
// Connections: an effect may open the same sign-in page the Connections tab opens. The person signs in, in the browser.
// No op takes a password, token or sign-in code, and no answer carries one. A friend's invite is refused too: it holds tokens.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ActionError, clone, truncate } from './model.mjs';
import { permsNormalize, permsWithScope, permsWithFriend, permsModeOk, permsScope, permsRisky, PERMS_SCOPE_IDS } from '../../lib/friends/share.mjs';
import { POSTCARD_TODS, POSTCARD_SEASONS, POSTCARD_WEATHER, POSTCARD_CAPTION_MAX } from '../../lib/friends/postcards.mjs';

const obj = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
const FRIEND_ID = { type: 'string', pattern: '^[0-9a-f]{16}$', description: 'a friend id from list_friends' };
const SAFE_ID = { type: 'string', pattern: '^[A-Za-z0-9_-]{1,64}$' };
const DAY = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' };
const need = (p, f, action) => { if (p[f] === undefined || p[f] === null || p[f] === '') throw new ActionError('INVALID_PARAMS', `${action} needs ${f}`, { field: f }); };
const line = (label, to, id = 'request') => ({ entity: 'request', id, label, field: 'request', from: null, to });

/** The friend's name from the friends file (a sync read: ops are synchronous), or an error. Text a friend chose: cleaned, short. */
function friendOf(ctx, id, { friendsOnly = true } = {}) {
  let doc = null;
  try { doc = JSON.parse(readFileSync(join(ctx.paths.root, 'friends', 'friends.json'), 'utf8')); } catch { /* none yet */ }
  const f = doc && doc.friends && Object.hasOwn(doc.friends, id) ? doc.friends[id] : null;
  if (!f) throw new ActionError('NOT_FOUND', 'there is no friend with that id', { field: 'to', hint: 'list_friends shows them' });
  if (friendsOnly && f.status !== 'friend') throw new ActionError('NOT_POSSIBLE', 'that person is not a confirmed friend', { field: 'to' });
  const name = String(f.nick || f.name || 'that friend').replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, '').trim().slice(0, 40) || 'that friend';
  return { id, name };
}

// ─── Friends ───────────────────────────────────────────────────────────────
const WAVES = { wave: 'a wave', high5: 'a high five', nudge: 'a nudge', thanks: 'a thank you' };
const GARDEN_ACTS = { garden_visit: ['visit', 'Visit'], garden_water: ['water', 'Water a plant in'], garden_gift: ['gift', 'Leave a gift in'], garden_like: ['like', 'Leave a heart in'], garden_sign: ['sign', 'Sign the guestbook in'] };

function runFriends(ctx, p) {
  const a = p.action;
  if (WAVES[a]) {
    need(p, 'to', a);
    const f = friendOf(ctx, p.to);
    ctx.effect({ op: 'friends.wave', to: f.id, t: a });
    return { summary: `Send ${WAVES[a]} to ${f.name}`, changes: [line(`To ${f.name}`, WAVES[a])] };
  }
  if (a === 'cheer') {
    need(p, 'to', a);
    const f = friendOf(ctx, p.to);
    const text = p.text ? truncate(String(p.text), 140) : '';
    ctx.effect({ op: 'friends.cheer', to: f.id, text });
    return { summary: `Send a cheer to ${f.name}`, changes: [line(`To ${f.name}`, text || 'a cheer')] };
  }
  if (a === 'postcard') {
    need(p, 'to', a); need(p, 'pack', a); need(p, 'item', a);
    const f = friendOf(ctx, p.to);
    const body = { pack: p.pack, item: p.item, tod: p.tod || 'day', season: p.season || 'summer', ...(p.wx ? { wx: p.wx } : {}), ...(p.caption ? { caption: p.caption } : {}), at: ctx.now };
    ctx.effect({ op: 'friends.postcard', to: f.id, body });
    return { summary: `Send a postcard to ${f.name}`, changes: [line(`To ${f.name}`, `${p.pack}/${p.item}${p.caption ? `: "${p.caption}"` : ''}`)] };
  }
  if (GARDEN_ACTS[a]) {
    need(p, 'to', a);
    const f = friendOf(ctx, p.to);
    const [t, verb] = GARDEN_ACTS[a];
    if (t === 'sign') need(p, 'text', a);
    if (t === 'gift') need(p, 'item', a);
    if (t === 'water') need(p, 'plant', a);
    ctx.effect({ op: 'friends.garden', to: f.id, t, ...(p.plant ? { p: p.plant } : {}), ...(p.item ? { item: p.item } : {}), ...(p.text ? { txt: p.text } : {}) });
    return { summary: `${verb} ${f.name}'s garden`, changes: [line(`${verb} ${f.name}'s garden`, p.text || p.item || t)] };
  }
  if (a === 'add') {
    need(p, 'code', a);
    if (!/^[A-Za-z0-9-]{4,12}$/.test(p.code)) throw new ActionError('BAD_VALUE', 'that does not look like a friend code', { field: 'code' });
    ctx.effect({ op: 'friends.add', code: p.code });
    return { summary: `Add a friend with the code ${p.code}`, changes: [line('Friend request with code', p.code)] };
  }
  need(p, 'to', a);
  const f = friendOf(ctx, p.to, { friendsOnly: false });
  const verbs = { approve: 'Accept the friend request from', decline: 'Decline the friend request from', remove: 'Remove your friend', block: 'Block', unblock: 'Unblock', undo_remove: 'Bring back your friend' };
  ctx.effect({ op: 'friends.manage', action: a, id: f.id });
  return { summary: `${verbs[a]} ${f.name}`, changes: [line(verbs[a], f.name)] };
}

function runShare(ctx, p) {
  const f = friendOf(ctx, p.friend);
  const changes = [];
  ctx.touch('key:friendPerms');
  const s = ctx.s;
  let perms = permsNormalize(s.friendPerms);
  if (p.trusted !== undefined || p.stopped !== undefined) {
    const patch = {};
    if (p.trusted !== undefined) { patch.trusted = p.trusted; changes.push(line(`${f.name}: trusted`, p.trusted ? 'yes' : 'no', 'trusted')); }
    if (p.stopped !== undefined) { patch.stopped = p.stopped ? ctx.now : 0; changes.push(line(`Stop sharing with ${f.name}`, p.stopped ? 'yes' : 'no', 'stopped')); }
    perms = permsWithFriend(perms, f.id, patch, ctx.now);
  }
  if (p.scope !== undefined) {
    const def = permsScope(p.scope);
    if (!def) throw new ActionError('BAD_VALUE', 'there is no such kind of sharing', { field: 'scope', valid: PERMS_SCOPE_IDS });
    if (!p.mode || !permsModeOk(p.scope, p.mode)) throw new ActionError('BAD_VALUE', `${def.label} can be: ${def.modes.map(m => m[0]).join(', ')}`, { field: 'mode', valid: def.modes.map(m => m[0]) });
    const patch = { mode: p.mode, ...(p.until ? { until: p.until } : {}), ...(p.from ? { from: p.from } : {}) };
    perms = permsWithScope(perms, f.id, p.scope, patch, ctx.now);
    const risky = permsRisky(p.scope, p.mode);
    if (risky) ctx.warn(risky);
    changes.push(line(`${def.label} shared with ${f.name}`, p.mode, 'scope'));
  }
  if (!changes.length) throw new ActionError('INVALID_PARAMS', 'give trusted, stopped, or scope and mode', {});
  s.friendPerms = clone(perms);
  return { summary: `Change what ${f.name} can see`, changes };
}

// ─── Together ──────────────────────────────────────────────────────────────
function runTogether(ctx, p) {
  const a = p.action;
  if (a === 'create') {
    need(p, 'name', a);
    const members = (p.members || []).map(id => friendOf(ctx, id));
    ctx.effect({ op: 'together.create', name: p.name, kind: p.kind || 'list', members: members.map(m => m.id) });
    return { summary: `Start a shared space "${truncate(p.name, 60)}"`, changes: [line('Invite', members.map(m => m.name).join(', ') || 'nobody yet')] };
  }
  need(p, 'space', a);
  if (a === 'edit') {
    need(p, 'ops', a);
    ctx.effect({ op: 'together.edit', space: p.space, ops: p.ops });
    return { summary: `Change ${p.ops.length} thing${p.ops.length === 1 ? '' : 's'} in a shared space`, changes: [line('Everyone in the space sees this', `${p.ops.length} change${p.ops.length === 1 ? '' : 's'}`)] };
  }
  const status = { join: 'joined', decline: 'declined', leave: 'left' }[a];
  ctx.effect({ op: 'together.status', space: p.space, status });
  return { summary: `${a[0].toUpperCase()}${a.slice(1)} a shared space`, changes: [line('Shared space', status)] };
}

// ─── Devices, relay, connections ───────────────────────────────────────────
function runDevices(ctx, p) {
  if (p.action === 'add') {
    ctx.effect({ op: 'devices.add' });
    return { summary: 'Show a code to add a computer', changes: [line('Settings > Sync shows a code for ten minutes', 'you type it on the new computer')] };
  }
  need(p, 'id', p.action);
  ctx.effect({ op: 'devices.remove', id: p.id });
  return { summary: 'Remove a computer from your sync group', changes: [line('Remove the computer', p.id)] };
}
function runRelay(ctx, p) {
  const words = { connect: 'Connect Cloudflare and set up your private relay', update: 'Update your relay with your renewed keys', disconnect: 'Stop using your relay on every device' };
  ctx.effect({ op: 'relay.' + p.action });
  return { summary: words[p.action], changes: [line('Your relay', words[p.action])] };
}
const START_WORDS = { google: 'Google', microsoft: 'Microsoft', claude: 'Claude', cloudflare: 'Cloudflare' };
function runConnection(ctx, p) {
  if (p.action === 'start') {
    need(p, 'service', 'start');
    if ((p.service === 'google' || p.service === 'microsoft') && !p.email) throw new ActionError('INVALID_PARAMS', 'ask the user which email address to connect', { field: 'email' });
    ctx.effect({ op: 'connection.start', service: p.service, ...(p.email ? { email: p.email } : {}), ...(p.kind ? { kind: p.kind } : {}) });
    return { summary: `Connect ${START_WORDS[p.service]}${p.email ? ` (${p.email})` : ''}: opens the sign-in page`, changes: [line('You sign in yourself, in the browser', START_WORDS[p.service])] };
  }
  need(p, 'service', 'disconnect');
  if (p.service === 'account' || p.service === 'bank') need(p, 'id', 'disconnect');
  ctx.effect({ op: 'connection.disconnect', service: p.service, ...(p.id ? { id: p.id } : {}) });
  return { summary: `Disconnect ${p.service}${p.id ? ` ${p.id}` : ''}`, changes: [line('Disconnect', p.service)] };
}

// ─── Money and updates ─────────────────────────────────────────────────────
function runMoney(ctx, p) {
  if (p.budgets && (Object.keys(p.budgets).length > 60 || Object.values(p.budgets).some(v => v !== null && !(typeof v === 'number' && v >= 0)))) throw new ActionError('BAD_VALUE', 'budgets must be {category: amount or null}', { field: 'budgets' });
  if (p.action === 'categorise') {
    need(p, 'merchant', p.action);
    if (p.category === undefined) throw new ActionError('INVALID_PARAMS', 'categorise needs category (a name, or null to clear the rule)', { field: 'category' });
    ctx.effect({ op: 'money.categorise', merchant: p.merchant, category: p.category });
    return { summary: `Put ${truncate(p.merchant, 60)} under ${p.category === null ? 'its usual category again' : truncate(p.category, 40)}`, changes: [line('This changes your spending totals', `${truncate(p.merchant, 60)} -> ${p.category === null ? 'cleared' : truncate(p.category, 40)}`)] };
  }
  need(p, 'budgets', p.action);
  ctx.effect({ op: 'money.budgets', budgets: p.budgets });
  return { summary: 'Change your budgets', changes: Object.entries(p.budgets).slice(0, 20).map(([k, v]) => line(truncate(k, 40), v === null ? 'no budget' : v, 'budget:' + k.slice(0, 40))) };
}
function runExpense(ctx, p) {
  const n = p.ids.length, of = `${n} expense${n === 1 ? '' : 's'}`;
  const words = { delete: `Delete ${of}`, mark_paid: `Mark ${of} as paid`, mark_unpaid: `Mark ${of} as not paid`, unsubmit: `Move ${of} back to "to claim"` };
  ctx.effect({ op: 'expense.change', action: p.action, ids: p.ids, ...(p.date ? { date: p.date } : {}) });
  return { summary: words[p.action], changes: [line('Expenses', words[p.action])] };
}
function runUpdate(ctx, p) {
  ctx.effect({ op: 'update.install', version: p.version });
  return { summary: `Install OpenDash ${p.version} and restart it`, changes: [line('Update', p.version)] };
}

export const SENSITIVE_OPS = [
  {
    name: 'friends.act', tool: 'friends_act', danger: true,
    description: "Something that reaches a friend, or who your friends are. The user approves it first. action wave, high5, nudge, thanks {to}; cheer {to, text?}; postcard {to, pack, item, tod?, season?, wx?, caption?}; garden_visit {to}, garden_like {to}, garden_water {to, plant}, garden_gift {to, item}, garden_sign {to, text}; add {code} (a friend code the user typed to you; invites are never accepted here); approve, decline, remove, block, unblock, undo_remove {to}.",
    schema: obj({
      action: { type: 'string', enum: [...Object.keys(WAVES), 'cheer', 'postcard', ...Object.keys(GARDEN_ACTS), 'add', 'approve', 'decline', 'remove', 'block', 'unblock', 'undo_remove'] },
      to: FRIEND_ID, text: { type: 'string', maxLength: 140 }, code: { type: 'string', maxLength: 12 },
      pack: SAFE_ID, item: { type: 'string', maxLength: 64, pattern: '^[A-Za-z0-9:_-]+$' }, plant: { type: 'string', maxLength: 64 },
      tod: { type: 'string', enum: [...POSTCARD_TODS] }, season: { type: 'string', enum: [...POSTCARD_SEASONS] }, wx: { type: 'string', enum: [...POSTCARD_WEATHER] },
      caption: { type: 'string', maxLength: POSTCARD_CAPTION_MAX },
    }, ['action']),
    run: runFriends,
  },
  {
    name: 'friends.share', tool: 'friends_share', danger: true,
    description: "What a friend can see. The user approves it first. friend, then trusted (needed before anything beyond profile and game; changing it turns sensitive sharing back off), stopped, and/or scope with mode (list_friends {part:'sharing'} shows every scope and level), until/from 'YYYY-MM-DD' for a time limit.",
    schema: obj({ friend: FRIEND_ID, trusted: { type: 'boolean' }, stopped: { type: 'boolean' }, scope: { type: 'string', maxLength: 30 }, mode: { type: 'string', maxLength: 30 }, until: DAY, from: DAY }, ['friend']),
    run: runShare,
  },
  {
    name: 'together.act', tool: 'together_act', danger: true,
    description: "Shared spaces with friends. The user approves it first. action create {name, kind?, members: [friend ids]}; join, decline, leave {space}; edit {space, ops: [{op: set|del|move, path, value?, before?}]} (everyone in the space sees it).",
    schema: obj({
      action: { type: 'string', enum: ['create', 'join', 'decline', 'leave', 'edit'] }, space: SAFE_ID,
      name: { type: 'string', minLength: 1, maxLength: 80 }, kind: { type: 'string', maxLength: 20 }, members: { type: 'array', items: FRIEND_ID, maxItems: 49 },
      ops: { type: 'array', minItems: 1, maxItems: 50, items: { type: 'object', required: ['op', 'path'], properties: { op: { type: 'string', enum: ['set', 'del', 'move'] }, path: { type: 'array', maxItems: 12 }, value: {}, before: {} } } },
    }, ['action']),
    run: runTogether,
  },
  {
    name: 'devices.act', tool: 'devices_act', danger: true,
    description: "The user's computers in encrypted sync. The user approves it first. action add: Settings > Sync then shows a code the person types on the new computer (you never see it); remove {id} (a device id from get_app_status).",
    schema: obj({ action: { type: 'string', enum: ['add', 'remove'] }, id: { type: 'string', maxLength: 40, pattern: '^[A-Za-z0-9_-]+$' } }, ['action']),
    run: runDevices,
  },
  {
    name: 'relay.act', tool: 'relay_act', danger: true,
    description: "The user's private relay. The user approves it first. action connect (Connect Cloudflare: they sign in in the browser, then it deploys), update (after renewed keys), disconnect.",
    schema: obj({ action: { type: 'string', enum: ['connect', 'update', 'disconnect'] } }, ['action']),
    run: runRelay,
  },
  {
    name: 'connection.act', tool: 'connection_act', danger: true,
    description: "Start or end a connection. The user approves it first. action start {service: google | microsoft (with email), claude, cloudflare}: opens the same one-click sign-in page the Connections tab opens; the person signs in there, in the browser. Then tell them what they will see, step by step, and check get_app_status {part:'connections'}. NEVER ask for, accept or repeat a password, token or code: if they paste one, tell them not to and that they only need the browser. action disconnect {service: google | account (id) | bank (id)}.",
    schema: obj({
      action: { type: 'string', enum: ['start', 'disconnect'] }, service: { type: 'string', enum: ['google', 'microsoft', 'claude', 'cloudflare', 'account', 'bank'] },
      email: { type: 'string', maxLength: 254, pattern: '^[^\\s@<>"]+@[^\\s@<>"]+$' }, kind: { type: 'string', enum: ['personal', 'work'] }, id: { type: 'string', maxLength: 64, pattern: '^[A-Za-z0-9_.:-]+$' },
    }, ['action']),
    run(ctx, p) {
      if (p.action === 'start' && !START_WORDS[p.service]) throw new ActionError('BAD_VALUE', 'that service can only be disconnected here', { field: 'service', valid: Object.keys(START_WORDS) });
      if (p.action === 'disconnect' && !['google', 'account', 'bank'].includes(p.service)) throw new ActionError('BAD_VALUE', 'that cannot be disconnected here', { field: 'service', valid: ['google', 'account', 'bank'], hint: 'the relay has relay_act' });
      return runConnection(ctx, p);
    },
  },
  {
    name: 'money.change', tool: 'money_change', danger: true,
    description: "Rules that change the money totals. The user approves it first. action categorise {merchant, category | null}: that merchant's transactions go under this category; set_budgets {budgets: {category: amount | null}}.",
    schema: obj({
      action: { type: 'string', enum: ['categorise', 'set_budgets'] }, merchant: { type: 'string', minLength: 1, maxLength: 120 }, category: { type: ['string', 'null'], maxLength: 60 },
      budgets: { type: 'object', additionalProperties: { type: ['number', 'null'] }, maxProperties: 60 },
    }, ['action']),
    run: runMoney,
  },
  {
    name: 'expense.change', tool: 'expense_change', danger: true,
    description: "Bulk expense changes. The user approves it first. action delete, mark_paid {date?}, mark_unpaid, unsubmit, with ids from list_expenses. The result has an undo token for undo_expense_change.",
    schema: obj({ action: { type: 'string', enum: ['delete', 'mark_paid', 'mark_unpaid', 'unsubmit'] }, ids: { type: 'array', items: { type: 'string', maxLength: 60 }, minItems: 1, maxItems: 50 }, date: DAY }, ['action', 'ids']),
    run: runExpense,
  },
  {
    name: 'update.install', tool: 'install_update', danger: true,
    description: "Install a newer OpenDash from the project's own releases and restart. The user approves it first. version comes from get_app_status {part:'updates'}. The update feed itself can never be changed.",
    schema: obj({ version: { type: 'string', maxLength: 30, pattern: '^v?\\d+\\.\\d+\\.\\d+[A-Za-z0-9.-]*$' } }, ['version']),
    run: runUpdate,
  },
];
