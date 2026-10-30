// server/routes/agent.mjs - does what the sensitive ops asked for, once the person approved it
// (server/actions/ops-sensitive.mjs, lib/agent-tiers.mjs). It adds no route of its own: app.ctx.agentEffects is called
// only by the actions layer, after a proposal click or a dry run with its confirm token.
//
// Each effect goes through the SAME route the page uses (loopback, this server's token), so that route's checks,
// caps and sharing policy apply and nothing is implemented twice. The table is fixed: an effect names an entry in it,
// never a path. Answers are cut down to listed fields: an invite, a join code, a sign-in link, a key or a token that a
// route returns goes no further than this file.
//
// Sign-in links are opened with the operating system's browser, only for the providers' own https sign-in hosts.

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { ensureLocalToken, TOKEN_HEADER } from '../actions/auth.mjs';

const SIGN_IN_HOSTS = new Set(['accounts.google.com', 'login.microsoftonline.com', 'login.live.com', 'dash.cloudflare.com']);
const pick = (o, keys) => Object.fromEntries(keys.filter(k => o && o[k] !== undefined).map(k => [k, o[k]]));

export function signInUrlOk(url) {
  try { const u = new URL(url); return u.protocol === 'https:' && SIGN_IN_HOSTS.has(u.hostname); } catch { return false; }
}
function openInBrowser(url) {
  if (process.env.DASHBOARD_NO_BROWSER === '1') return false;    // sandboxes: the sign-in page is not opened
  if (process.platform === 'win32') { spawn('explorer', [url], { detached: true, stdio: 'ignore', shell: false }).unref(); return true; }
  spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { detached: true, stdio: 'ignore', shell: false }).unref();
  return true;
}

export default function register(app) {
  const ctx = app.ctx;
  const root = (ctx.paths && ctx.paths.root) || ctx.dataDir;

  async function route(method, path, body) {
    const res = await fetch(`http://127.0.0.1:${ctx.port}${path}`, {
      method, headers: { 'Content-Type': 'application/json', [TOKEN_HEADER]: await ensureLocalToken(root) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(60000),
    });
    let j = null;
    try { j = await res.json(); } catch { /* not JSON */ }
    if (!res.ok || (j && j.ok === false)) {
      const e = new Error((j && (typeof j.error === 'string' ? j.error : j.error && j.error.message)) || 'That could not be done. Try it in the app.');
      e.expected = true;
      throw e;
    }
    return j || {};
  }
  const sent = (r) => pick(r, ['sent', 'queued']);

  const EFFECTS = {
    'friends.wave': async (e) => sent(await route('POST', '/api/fun/wave', { to: e.to, t: e.t })),
    'friends.cheer': async (e) => sent(await route('POST', '/api/friends/send', { to: e.to, kind: 'cheer', body: e.text ? { text: e.text } : {} })),
    'friends.postcard': async (e) => sent(await route('POST', '/api/friends/feed', { event: { kind: 'postcard', to: e.to, body: e.body } })),
    'friends.garden': async (e) => sent(await route('POST', '/api/garden-social/act', { to: e.to, t: e.t, ...pick(e, ['p', 'item', 'txt']) })),
    'friends.add': async (e) => { const r = await route('POST', '/api/friends/add', { code: e.code }); return { status: r.friend && r.friend.status, next: 'Compare the code on both screens in Friends: the person does that themselves.' }; },
    'friends.manage': async (e) => {
      if (e.action === 'remove' || e.action === 'block') { const r = await route('POST', '/api/friends/remove', { id: e.id, block: e.action === 'block' }); return { undoUntil: r.undoUntil, next: 'undo_remove brings them back until then.' }; }
      if (e.action === 'undo_remove') { await route('POST', '/api/friends/remove/undo', { id: e.id }); return { done: true }; }
      await route('POST', `/api/friends/${e.action}`, { id: e.id });
      return { done: true };
    },
    'together.create': async (e) => pick(await route('POST', '/api/together/space', { id: 's' + randomBytes(9).toString('hex'), name: e.name, kind: e.kind, members: e.members }), ['id']),
    'together.edit': async (e) => pick(await route('POST', '/api/together/edit', { space: e.space, ops: e.ops }), ['changed']),
    'together.status': async (e) => pick(await route('POST', '/api/together/status', { space: e.space, status: e.status }), ['status']),
    'devices.add': async () => { await route('POST', '/api/sync/code/start', {}); return { next: 'The code is on screen in Settings > Sync. The person types it on the new computer.' }; },   // the code stays on screen
    'devices.remove': async (e) => { await route('POST', '/api/sync/devices/remove', { id: e.id }); return { done: true }; },
    'relay.connect': async () => { await route('POST', '/api/relay/connect', {}); return { next: 'Settings > Your relay shows each step. Cloudflare opens in the browser: the person signs in there.' }; },
    'relay.update': async () => pick(await route('POST', '/api/relay/rotate', {}), ['state']),
    'relay.disconnect': async () => { await route('POST', '/api/relay/disconnect', {}); return { next: 'The Worker stays on Cloudflare. Reconnecting is in Settings > Your relay.' }; },
    'connection.start': async (e) => {
      if (e.service === 'claude') {
        const r = await route('POST', '/api/connections/local-claude/browser', {});
        return { ...pick(r, ['phase', 'message']), next: 'Finish signing in to Claude in the browser. Check get_app_status {part:"connections"} afterwards.' };
      }
      if (e.service === 'cloudflare') { await route('POST', '/api/relay/connect', {}); return { next: 'Settings > Your relay shows each step. Cloudflare opens in the browser: the person signs in there.' }; }
      const r = await route('POST', '/api/accounts/begin', { provider: e.service, email: e.email, ...(e.kind ? { kind: e.kind } : {}) });
      if (!signInUrlOk(r.url)) throw Object.assign(new Error('The sign-in page could not be opened from here. Use Connections in the app.'), { expected: true });
      const opened = openInBrowser(r.url);    // the link is not passed on: it stays between this server and the browser
      const who = e.service === 'google' ? 'Google' : 'Microsoft';
      return { opened, next: opened ? `The ${who} sign-in page is opening in the browser. The person signs in there; OpenDash finishes by itself.` : `The browser could not be opened from here. The person can use Add ${who} account under Connections instead.` };
    },
    'connection.disconnect': async (e) => {
      if (e.service === 'google') { await route('POST', '/api/google/disconnect', {}); return { done: true }; }
      if (e.service === 'account') { await route('POST', '/api/accounts/remove', { id: e.id }); return { done: true }; }
      return pick(await route('POST', `/api/fin-connect/sources/${encodeURIComponent(e.id)}/disconnect`, {}), ['removed', 'undo']);
    },
    'money.categorise': async (e) => pick(await route('POST', '/api/finance/categorise', { merchant: e.merchant, category: e.category }), ['changed']),
    'money.budgets': async (e) => { await route('PUT', '/api/finance/budgets', { budgets: e.budgets }); return { done: true }; },
    'tax.change': async (e) => pick(await route('POST', '/api/finance/tax/change', { change: e.change, year: e.year, brief: true }), ['said', 'undo']),
    'expense.change': async (e) => {
      const path = { delete: 'delete', mark_paid: 'paid', mark_unpaid: 'unpaid', unsubmit: 'unsubmit' }[e.action];
      return pick(await route('POST', `/api/expenses/${path}`, { ids: e.ids, ...(e.date ? { date: e.date } : {}) }), ['removed', 'undo']);
    },
    'update.install': async (e) => {
      await route('POST', '/api/update/check', {});
      const r = await route('POST', '/api/update/apply', { version: String(e.version).replace(/^v/, '') });
      return { ...pick(r.updated || {}, ['from', 'to']), next: 'OpenDash is restarting. The page comes back by itself.' };
    },
  };

  ctx.agentEffects = async (list) => {
    const out = [];
    for (const item of list) {
      const fn = Object.hasOwn(EFFECTS, item.op) ? EFFECTS[item.op] : null;
      if (!fn) { out.push({ op: String(item.op).slice(0, 40), ok: false, error: 'That is not something the assistant can do.' }); continue; }
      try {
        out.push({ op: item.op, ok: true, result: await fn(item) });
      } catch (e) {
        // A route's own plain sentence; anything else is logged by its code only (it could repeat a person's text).
        if (!e.expected) ctx.log?.('warn', `agent: ${item.op} failed (${e.code || e.name})`);
        out.push({ op: item.op, ok: false, error: e.expected ? String(e.message).slice(0, 300) : 'That could not be done. Try it in the app.' });
      }
    }
    return out;
  };
}
