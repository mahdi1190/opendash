/* ============================================================
   MONEY on Connections (#view=connections, the "money" block). Owner:
   Finance connections UI (design: docs/dev/FINANCE_CONNECTIONS.md).

   One block for every way money gets into Finances:
     Your accounts        every account from every provider in one list
                          (rename, colour, show in Finances, last sync,
                          sign-in-again date, possible duplicates)
     Add a bank or wallet the provider chooser in three groups:
                          A via Claude (Aureli), B direct (Plasma One,
                          Monzo, other UK/EU banks via Enable Banking),
                          C import a CSV. Every card shows the same facts
                          in the same order, then one button.

   finMoneyBlock()        the block (called by 56-connections.js)
   FinConnectStore        GET /api/fin-connect/providers + /accounts
   FIN_PROVIDERS          the provider descriptors; the wizards in
                          56-fin-connect-wizards.js are driven by them

   Every finance connector is read-only: it can never move money. Saved
   sign-ins stay in the data folder's secrets area on this computer; the
   page only ever sees "configured: true", masked ids and statuses. Every
   name, label and message from a server or a bank is set as text or esc().
   ============================================================ */
const FIN_API = '/api/fin-connect/';
const FIN_READONLY_TIP = 'OpenDash can only read. It can never move money.';

/* ---------- provider descriptors ---------- */
// facts: the same five, in the same order, on every card. more: the honest
// detail (cost, limits, what happens to the data) shown when "More" is open.
const FIN_PROVIDERS = [
  { id: 'aureli', group: 'claude', name: 'Aureli', sub: 'Through Claude · claude.ai Bank connector', mark: 'aureli', flow: 'aureli',
    keywords: 'aureli claude bank connector claude.ai mcp',
    facts: {
      covers: 'The banks Aureli supports (you pick yours on Aureli’s own sign-in). Balances and transactions.',
      cost: 'Needs an Aureli account. One connected bank account is free; more need a paid Aureli plan.',
      limits: 'Synced through Claude: each update uses a little of your Claude usage and takes a few minutes.',
      need: 'Claude Code signed in on this computer, and an Aureli login.',
      time: 'About 3 minutes',
    },
    more: 'Aureli is a bank connector inside claude.ai. OpenDash asks your own Claude to read it with read-only tools, then keeps the transactions in your data folder. Check Aureli’s current pricing and bank list on their sign-in page; OpenDash does not see your Aureli login.',
    action: 'Connect in Claude' },
  { id: 'plasma', group: 'direct', name: 'Plasma One', sub: 'Stablecoin wallet · public Plasma blockchain', mark: 'plasma', flow: 'plasma',
    keywords: 'plasma one wallet usdt usdt0 stablecoin crypto rain card blockchain 0x',
    facts: {
      covers: 'Your Plasma One USDT balance and transfers in and out, read from the public Plasma blockchain.',
      cost: 'Free.',
      limits: 'Card purchases may show as “Plasma One card” without the shop name, and some may be combined. Converted from USD at each day’s rate.',
      need: 'Your Plasma wallet address (starts with 0x). Never your recovery phrase: OpenDash refuses it.',
      time: '10 seconds',
    },
    more: 'A wallet address is public, so this connection can only read: there is nothing to sign in to and nothing that could move money. OpenDash keeps the address in your data folder’s secrets area and reads transfers from a public block explorer. Card payments are settled by the card issuer, so a shop name is not on the blockchain.',
    action: 'Paste address' },
  { id: 'monzo', group: 'direct', name: 'Monzo', sub: 'Monzo’s personal developer API', mark: 'monzo', flow: 'monzo',
    keywords: 'monzo bank current joint pots uk',
    facts: {
      covers: 'Every Monzo current and joint account, pot balances, and transactions with shop names and Monzo’s categories.',
      cost: 'Free (Monzo’s developer API for your own account).',
      limits: 'Your own account only. Approve in the Monzo app within 5 minutes of signing in for your full history; otherwise the last 90 days.',
      need: 'Your Monzo app, and a free Monzo developer client (we walk you through it).',
      time: 'About 4 minutes',
    },
    more: 'You make a small “client” on Monzo’s developer site; its ID and secret are saved only in your data folder’s secrets area and are never shown again. Monzo then asks you to approve OpenDash in the app. OpenDash only calls Monzo’s read endpoints: it cannot move money, move money into or out of pots, or post to your feed.',
    action: 'Connect Monzo' },
  { id: 'enable-banking', group: 'direct', name: 'Other UK and EU banks', sub: 'Via Enable Banking (open banking)', mark: 'enable-banking', flow: 'enable-banking',
    keywords: 'enable banking open banking psd2 bank eu uk europe barclays lloyds hsbc natwest santander revolut starling nationwide halifax',
    facts: {
      covers: 'Banks Enable Banking supports in your country. Check yours first.',
      cost: 'Free for your own accounts (Enable Banking’s restricted mode, personal non-commercial use).',
      limits: 'Banks ask you to sign in again every 90 to 180 days (we remind you), and allow about 4 automatic updates a day.',
      need: 'A free Enable Banking account, about 10 minutes once, and your bank’s app or login.',
      time: 'About 10 minutes, then 1 minute per extra bank',
    },
    more: 'Enable Banking is a regulated open-banking service. You create your own free app with them; its key file is saved only in your data folder’s secrets area. You sign in at your bank, which gives read-only access for a limited time. Only accounts you link yourself are visible.',
    action: 'Check my bank' },
  { id: 'csv', group: 'file', name: 'Import a CSV', sub: 'Any bank · a statement file', mark: 'csv', flow: 'csv',
    keywords: 'csv file import statement export spreadsheet any bank',
    facts: {
      covers: 'Any bank that lets you download a statement (CSV).',
      cost: 'Free. No account, no connection.',
      limits: 'Manual: import again to update.',
      need: 'A CSV export from your bank’s website or app.',
      time: '1 minute',
    },
    more: 'The file is read on this computer. Duplicates are skipped, so overlapping date ranges are fine.',
    action: 'Import a CSV' },
];
const FIN_FACT_ROWS = [['covers', 'Covers', 'layers'], ['cost', 'Cost', 'coins'], ['limits', 'Limits', 'gauge'], ['need', 'You’ll need', 'list-checks'], ['time', 'Time', 'clock']];
const FIN_GROUPS = [
  { id: 'claude', title: 'Via Claude', sub: 'Uses your Claude account and the claude.ai Bank connector.' },
  { id: 'direct', title: 'Direct connections', sub: 'No Claude needed and no AI in the loop: faster, and free.' },
  { id: 'file', title: 'Import a file', sub: 'Works with every bank, with no connection at all.' },
];
const FIN_KIND_LABEL = { current: 'Current', joint: 'Joint', pot: 'Pot', savings: 'Savings', wallet: 'Wallet', card: 'Card', credit: 'Credit card' };

/* ---------- drawn marks (simple shapes, not copied logos) ---------- */
const FIN_MARKS = {
  aureli: '<svg viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" rx="8" fill="#a8762a"/><circle cx="14" cy="14" r="8.2" fill="none" stroke="#fde9b8" stroke-width="1.6" opacity=".55"/><path d="M9.2 19.4 14 8.4l4.8 11M11 15.6h6" fill="none" stroke="#fff8e6" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  plasma: '<svg viewBox="0 0 28 28" aria-hidden="true"><defs><radialGradient id="fc-pl" cx=".38" cy=".34" r=".7"><stop offset="0" stop-color="#d9fff1"/><stop offset=".45" stop-color="#3fd4a2"/><stop offset="1" stop-color="#0c6b52"/></radialGradient></defs><rect width="28" height="28" rx="8" fill="#0f1714"/><circle cx="14" cy="14" r="7.4" fill="url(#fc-pl)"/><ellipse cx="14" cy="14" rx="10.6" ry="3.6" fill="none" stroke="#7ff0c8" stroke-width="1.1" opacity=".55" transform="rotate(-24 14 14)"/></svg>',
  monzo: '<svg viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" rx="8" fill="#ff5a47"/><path d="M7.6 19.6V9.2l6.4 6.6 6.4-6.6v10.4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  'enable-banking': '<svg viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" rx="8" fill="#1d6f68"/><path d="M7 11.6 14 7.4l7 4.2Z" fill="#e3fbf6"/><path d="M8.8 13.4v5.2M12.3 13.4v5.2M15.7 13.4v5.2M19.2 13.4v5.2" stroke="#e3fbf6" stroke-width="1.8" stroke-linecap="round"/><path d="M7.2 20.6h13.6" stroke="#e3fbf6" stroke-width="1.8" stroke-linecap="round"/></svg>',
  csv: '<svg viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" rx="8" fill="#e9eef8"/><path d="M10 6.8h6.2l3.8 3.8v10.2a1.4 1.4 0 0 1-1.4 1.4H10a1.4 1.4 0 0 1-1.4-1.4V8.2A1.4 1.4 0 0 1 10 6.8Z" fill="#fff" stroke="#5a6c92" stroke-width="1.3"/><path d="M11 13.6h6M11 16.2h6M11 18.8h3.6M13.4 12.4v7.4" stroke="#5a6c92" stroke-width="1.1" stroke-linecap="round"/></svg>',
  mcp: '<svg viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" rx="8" fill="#ece9fb"/><path d="M11 9.4v3.2M17 9.4v3.2M9.2 12.6h9.6v2.2a4.8 4.8 0 0 1-9.6 0Zm4.8 7v2.2" fill="none" stroke="#6552c6" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
function finMark(id) { return FIN_MARKS[id] || FIN_MARKS.mcp; }

/* ---------- pure helpers (tests/fin-connect-ui.test.mjs) ---------- */
/** A masked id for display: wallets as 0x12…ab34, others as ••••1234. */
function finMask(id) {
  const s = String(id == null ? '' : id).trim();
  if (!s) return '';
  if (/[•…]/.test(s)) return s;                               // the server already masked it
  if (/^0x[0-9a-fA-F]{40}$/.test(s)) return s.slice(0, 4) + '…' + s.slice(-4);
  const tail = s.replace(/[^A-Za-z0-9]/g, '').slice(-4);
  return tail ? '••••' + tail : '';
}
/** 'phrase' | 'key' | null: text that must never be pasted (a recovery phrase or a private key). */
function finLooksSecret(text) {
  const s = String(text == null ? '' : text).trim();
  if (!s) return null;
  if (/^(0x)?[0-9a-fA-F]{64}$/.test(s) || /^(xprv|xpub|tprv)[1-9A-HJ-NP-Za-km-z]{60,}$/.test(s)) return 'key';
  const words = s.toLowerCase().split(/[\s,]+/).filter(Boolean);
  if (words.length >= 12 && words.length <= 24 && words.every(w => /^[a-z]{3,8}$/.test(w))) return 'phrase';
  return null;
}
/** Check a pasted wallet address before it leaves the page (the server checks again, with the EIP-55 checksum). */
function finAddressCheck(text) {
  const raw = String(text == null ? '' : text);
  const s = raw.trim();
  if (!s) return { state: 'empty' };
  const secret = finLooksSecret(s);
  if (secret) return { state: 'secret', secret, message: 'That looks like your secret recovery phrase or key. Never paste it anywhere. OpenDash only needs your public address.' };
  if (/^0x[0-9a-fA-F]{40}$/.test(s)) return { state: 'ok', address: s };
  if (/^0x[0-9a-fA-F]{0,39}$/.test(s)) return { state: 'partial', message: 'Keep going: an address is 0x followed by 40 letters and numbers.' };
  if (/\.eth$/i.test(s)) return { state: 'invalid', message: 'Paste the 0x address itself, not a name.' };
  return { state: 'invalid', message: 'That is not a wallet address. It starts with 0x and has 40 letters and numbers after it.' };
}
/** Days from today (local) to an ISO date; negative when it is past. */
function finDaysUntil(iso, now) {
  if (!iso) return null;
  const d = Date.parse(String(iso).length === 10 ? iso + 'T12:00:00' : iso);
  if (!Number.isFinite(d)) return null;
  const t = new Date(now == null ? Date.now() : now); t.setHours(12, 0, 0, 0);
  return Math.round((d - t.getTime()) / 86400000);
}
/** How urgent a sign-in-again date is: amber 14 days before, red 3 days before or once past. */
function finDueTone(iso, now) {
  const days = finDaysUntil(iso, now);
  if (days == null) return { tone: 'none', days: null };
  return { tone: days < 0 ? 'past' : days <= 3 ? 'red' : days <= 14 ? 'amber' : 'ok', days };
}
/** Last sync freshness: red after 3 days. */
function finSyncTone(iso, now) {
  if (!iso) return 'never';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 'never';
  return ((now == null ? Date.now() : now) - t) > 3 * 86400000 ? 'red' : 'ok';
}
function finDateLabel(iso) {
  const t = Date.parse(String(iso).length === 10 ? iso + 'T12:00:00' : iso);
  if (!Number.isFinite(t)) return '';
  try { return new Date(t).toLocaleDateString((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || 'en-GB', { day: 'numeric', month: 'short' }); }
  catch (e) { return new Date(t).toISOString().slice(0, 10); }
}
function finDueText(iso, now) {
  const { tone, days } = finDueTone(iso, now);
  if (tone === 'none') return '';
  if (tone === 'past') return 'Sign-in expired';
  if (days === 0) return 'Sign in again today';
  return 'Sign in again by ' + finDateLabel(iso);
}
/** m:ss for the Monzo approval countdown. */
function finClock(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
function finMoney(pence, currency) {
  if (pence == null || !Number.isFinite(Number(pence))) return '';
  const cur = /^[A-Z]{3}$/.test(currency || '') ? currency : ((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.currency) || 'GBP');
  try { return new Intl.NumberFormat((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || 'en-GB', { style: 'currency', currency: cur }).format(Number(pence) / 100); }
  catch (e) { return cur + ' ' + (Number(pence) / 100).toFixed(2); }
}
/** The provider a bank source belongs to. */
function finProviderOf(s) {
  if (!s) return 'mcp';
  if (s.kind === 'direct') return FIN_PROVIDERS.some(p => p.id === s.provider) ? s.provider : 'mcp';
  if (s.kind === 'csv') return 'csv';
  if (s.preset === 'bank' || s.preset === 'aureli' || /^claude\.ai Bank$/i.test(String(s.server || ''))) return 'aureli';
  return 'mcp';
}
function finProviderInfo(id) {
  return FIN_PROVIDERS.find(p => p.id === id) || { id: 'mcp', name: 'Bank MCP', sub: 'Through Claude · an MCP server', mark: 'mcp' };
}
/**
 * The chooser search. Returns which cards match, which one to highlight
 * ("Monzo" highlights the Monzo card) and the Enable Banking bank results.
 * banks: [{name, beta?, maxConsentDays?}] for the country (live or snapshot).
 */
function finChooserMatch(query, banks) {
  const q = String(query || '').trim().toLowerCase();
  const all = FIN_PROVIDERS.map(p => p.id);
  if (!q) return { query: '', cards: new Set(all), highlight: null, banks: [], ebNone: false };
  const words = q.split(/\s+/);
  const hit = (p) => { const text = (p.name + ' ' + p.keywords).toLowerCase(); return words.every(w => text.includes(w)); };
  const cards = new Set(FIN_PROVIDERS.filter(hit).map(p => p.id));
  let highlight = null;
  for (const id of ['monzo', 'plasma', 'aureli']) {
    const p = finProviderInfo(id);
    if (p.name.toLowerCase().startsWith(q) || (q.length >= 3 && p.name.toLowerCase().includes(q))) { highlight = id; break; }
  }
  // Monzo and Plasma One always point at their own cards, never at Enable Banking.
  const own = /monzo|plasma/;
  const list = (Array.isArray(banks) ? banks : []).filter(b => b && b.name && !own.test(String(b.name).toLowerCase()));
  const found = highlight ? [] : list.filter(b => String(b.name).toLowerCase().includes(q)).slice(0, 6);
  if (found.length) cards.add('enable-banking');
  const ebNone = !highlight && q.length >= 3 && !found.length;
  if (ebNone) { cards.add('enable-banking'); cards.add('csv'); }
  return { query: q, cards, highlight, banks: found, ebNone };
}
/**
 * One list of accounts across providers. Sources (from /api/sources) give
 * names, colours and on/off; /api/fin-connect/accounts adds balances,
 * masks, kinds, re-auth dates and duplicate notes for direct accounts.
 * Returns groups [{source, provider, accounts:[...]}], connected providers first.
 */
function finMergeAccounts(sources, apiAccounts) {
  const extra = new Map(), apiGroups = new Map();
  for (const item of Array.isArray(apiAccounts) ? apiAccounts : []) {
    if (item && item.sourceId && Array.isArray(item.accounts)) {          // GET accounts: {groups:[{sourceId, provider, state, accounts}]}
      apiGroups.set(String(item.sourceId), item);
      for (const a of item.accounts) if (a && a.key) extra.set(String(a.key), Object.assign({ sourceId: item.sourceId, provider: item.provider, sourceLabel: item.label, lastSync: item.lastSync, reauthDue: item.reauthDue }, a, { colour: a.colour || item.colour }));
    } else if (item && item.key) extra.set(String(item.key), item);
  }
  // Balances come in major units (balances.json); the page works in minor units.
  const pence = (x) => x.balancePence != null ? Number(x.balancePence) : x.balance != null && Number.isFinite(Number(x.balance)) ? Math.round(Number(x.balance) * 100) : null;
  const groups = [], seen = new Set();
  for (const s of Array.isArray(sources) ? sources : []) {
    if (!s || s.capability !== 'bank' || s.demo) continue;
    const provider = finProviderOf(s);
    const api = apiGroups.get(s.id) || null;
    const accounts = (Array.isArray(s.accounts) ? s.accounts : []).map(a => {
      const key = provider === 'aureli' ? String(a.id) : s.id + '.' + a.id, x = extra.get(key) || {};
      seen.add(key);
      return {
        key, sourceId: s.id, id: a.id, name: a.name || x.name || a.id, bankName: x.bankName || x.originalName || '',
        kind: x.kind || a.kind || '', mask: x.mask || a.mask || '', colour: a.colour || s.colour || 'slate',
        enabled: a.enabled !== false, balance: pence(x), currency: x.currency || '', balanceOnly: !!(x.balanceOnly || a.balanceOnly),
        lastSync: x.lastSync || s.lastSync || null, reauthDue: x.reauthDue || s.reauthDue || null,
        needsAuth: !!(x.needsAuth), duplicateOf: x.duplicateOf || a.duplicateOf || null, duplicateOfName: x.duplicateOfName || null,
        hiddenReason: a.hiddenReason || x.hiddenReason || null,
      };
    });
    groups.push({ source: api && !s.reauthDue && api.reauthDue ? Object.assign({}, s, { reauthDue: api.reauthDue }) : s, provider, accounts, api });
  }
  // Direct accounts the sources list does not know yet (a fresh connection).
  for (const [key, x] of extra) {
    if (seen.has(key)) continue;
    const sid = String(x.sourceId || key.split('.')[0]);
    let g = groups.find(gr => gr.source.id === sid);
    if (!g) {
      const p = finProviderInfo(x.provider);
      const api = apiGroups.get(sid) || null;
      g = { source: { id: sid, capability: 'bank', kind: 'direct', provider: p.id, label: x.sourceLabel || p.name, colour: x.colour || 'slate', enabled: true, accounts: [], reauthDue: x.reauthDue || null, lastSync: x.lastSync || null,
        health: api && api.state ? { state: api.state, message: api.message || null } : undefined }, provider: p.id, accounts: [], api };
      groups.push(g);
    }
    g.accounts.push({ key, sourceId: sid, id: x.accountId || key.slice(sid.length + 1), name: x.name || 'Account', bankName: x.bankName || '', kind: x.kind || '', mask: x.mask || '',
      colour: x.colour || g.source.colour || 'slate', enabled: x.enabled !== false, balance: pence(x), currency: x.currency || '', balanceOnly: !!x.balanceOnly,
      lastSync: x.lastSync || null, reauthDue: x.reauthDue || null, needsAuth: !!x.needsAuth, duplicateOf: x.duplicateOf || null, duplicateOfName: x.duplicateOfName || null, hiddenReason: x.hiddenReason || null });
  }
  const rank = { aureli: 0, monzo: 1, 'enable-banking': 2, plasma: 3, mcp: 4, csv: 5 };
  return groups.filter(g => g.accounts.length || g.provider !== 'csv' || g.source.lastSync)
    .sort((a, b) => (rank[a.provider] ?? 9) - (rank[b.provider] ?? 9));
}
/** The status a provider card shows: {kind, label} or null. */
function finCardStatus(providerId, groups, entry) {
  const mine = (groups || []).filter(g => g.provider === providerId && g.source.enabled !== false);
  entry = entry || {};
  if (providerId === 'csv') return mine.some(g => g.source.lastSync) ? { kind: 'off', label: 'Imported' } : null;
  const state = (g) => (g.api && g.api.state) || (g.source.health && (g.source.health.connectionState || g.source.health.state)) || null;
  if (mine.some(g => state(g) === 'auth' || g.accounts.some(a => a.needsAuth)) || entry.needsAuth) return { kind: 'warn', label: 'Needs sign-in' };
  if (mine.some(g => state(g) === 'error')) return { kind: 'err', label: 'Not working' };
  const dues = mine.map(g => g.source.reauthDue).concat(entry.reauthDue ? [entry.reauthDue] : []).filter(Boolean).sort();
  const due = dues.length ? finDueTone(dues[0]) : { tone: 'none' };
  if (due.tone === 'past') return { kind: 'warn', label: 'Needs sign-in' };
  if (due.tone === 'red' || due.tone === 'amber') return { kind: 'warn', label: `Re-authorise in ${due.days} day${due.days === 1 ? '' : 's'}` };
  const pending = (entry.sources || []).filter(x => x && x.status && x.status.configured && !x.status.connected);
  if (mine.length && mine.some(g => g.accounts.length)) return { kind: 'ok', label: 'Connected' };
  if (pending.length || mine.length || (entry.configured && providerId === 'enable-banking')) return { kind: 'off', label: 'Finish setup' };
  return null;
}

/* ---------- the store ---------- */
const FinConnectStore = {
  providers: null, accounts: null, meta: {}, error: null, missing: false, loading: null, gen: 0, at: 0,
  async load(opts) {
    opts = opts || {};
    if (this.loading && !opts.force) return this.loading;
    const gen = ++this.gen;
    this.loading = (async () => {
      const get = async (path) => {
        const r = await fetch(FIN_API + path, { cache: 'no-store' });
        if (r.status === 404) { this.missing = true; return null; }
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status);
        return j;
      };
      try {
        const [p, a] = await Promise.all([get('providers'), get('accounts')]);
        if (gen === this.gen) {
          this.providers = p ? (Array.isArray(p) ? p : p.providers || []) : [];
          this.meta = p && !Array.isArray(p) ? p : {};
          this.accounts = a ? (Array.isArray(a) ? a : a.groups || a.accounts || []) : [];
          this.missing = !p; this.error = null; this.at = Date.now();
        }
      } catch (e) { if (gen === this.gen) this.error = (e && e.message) || 'Could not load the money connections.'; }
      if (gen === this.gen) { this.loading = null; if (state.view === 'connections') renderMain(); }
      return this;
    })();
    return this.loading;
  },
  entry(id) { return (this.providers || []).find(p => p && p.id === id) || null; },
  stale() { return Date.now() - this.at > 15000; },
};
async function finApi(path, opts) {
  opts = opts || {};
  let r;
  try {
    r = await fetch(path.startsWith('/') ? path : FIN_API + path, {
      method: opts.method || 'GET', cache: 'no-store',
      headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) { throw Object.assign(new Error('The OpenDash server isn’t running. Start OpenDash and try again.'), { code: 'NETWORK' }); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const fallback = r.status === 404 ? 'This needs a newer OpenDash server. Restart OpenDash after updating.' : finErrorText(j.code) || 'The OpenDash server did not answer.';
    throw Object.assign(new Error(j.error || fallback), { code: j.code, status: r.status });
  }
  return j;
}
const FIN_ERRORS = {
  NOT_CONFIGURED: 'This connection is not set up yet.', AUTH: 'Sign in again to keep this connection working.',
  CONSENT_EXPIRED: 'Your bank’s permission ended. Sign in again to renew it.', NOT_APPROVED: 'Approve OpenDash in your Monzo app first.',
  RATE_LIMITED: 'The provider asked us to slow down. Try again in a few minutes.', NETWORK: 'Could not reach the provider. Check your internet connection.',
  BAD_RESPONSE: 'The provider sent something unexpected. Try again later.', POLICY: 'That request was blocked: finance connections can only read.',
  NOT_SUPPORTED: 'That bank is not available through Enable Banking. Import a CSV instead.',
  SECRET_REFUSED: 'That looks like your secret recovery phrase or key. Never paste it anywhere. OpenDash only needs your public address.',
};
function finErrorText(code) { return FIN_ERRORS[code] || ''; }

/* ---------- page state ---------- */
let _finQuery = '', _finMoreOpen = new Set(), _finOpenRow = null, _finRenaming = null, _finEntered = false, _finSearchFocus = false;
let _finBanks = { country: null, list: null, source: null, asOf: null, loading: false };
function finMoneyUnmount() { _finEntered = false; _finSearchFocus = false; _finRenaming = null; }

function _finEl(tag, cls, text) { return _connEl(tag, cls, text); }
function _finGroups() {
  const sources = (SourcesStore.data && SourcesStore.data.sources) || [];
  return finMergeAccounts(sources, FinConnectStore.accounts || []);
}
function _finCountry() {
  const c = (typeof APP_CONFIG !== 'undefined' && (APP_CONFIG.region || (APP_CONFIG.finance && APP_CONFIG.finance.country))) || '';
  if (/^[A-Z]{2}$/.test(c)) return c;
  const m = /-([A-Z]{2})$/.exec((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || '');
  return m ? m[1] : 'GB';
}
/** Banks for the chooser search: the live list once an Enable Banking app exists, else the bundled snapshot. */
function _finBankList(country) {
  country = country || _finCountry();
  const entry = FinConnectStore.entry('enable-banking');
  if (entry && entry.configured) {
    if (_finBanks.country !== country && !_finBanks.loading) {
      _finBanks.loading = true;
      finApi('eb/banks?country=' + encodeURIComponent(country)).then(j => {
        _finBanks = { country, list: j.banks || [], source: j.source || 'live', asOf: j.asOf || null, loading: false };
        if (state.view === 'connections') renderMain();
      }).catch(() => { _finBanks = { country, list: null, source: null, asOf: null, loading: false }; });
    }
    if (_finBanks.country === country && _finBanks.list) return { banks: _finBanks.list, source: _finBanks.source, asOf: _finBanks.asOf };
  }
  const snap = typeof FIN_EB_BANKS !== 'undefined' ? FIN_EB_BANKS : null;
  const list = snap && snap.countries && Array.isArray(snap.countries[country]) ? snap.countries[country] : null;
  return { banks: (list || []).map(b => typeof b === 'string' ? { name: b } : b), source: list ? 'snapshot' : 'none', asOf: snap && snap.asOf };
}

/* ---------- actions ---------- */
function finStartProvider(id, opts) {
  opts = opts || {};
  if (id === 'csv') { finImportCsv(); return; }
  if (id === 'aureli') { _finConnectAureli(); return; }
  if (typeof finOpenFlow === 'function') finOpenFlow(id, opts);
}
function finImportCsv() {
  setView('finance');
  // Still inside the click: the file picker may open.
  setTimeout(() => { if (window.FinanceView && typeof FinanceView.importCsv === 'function') FinanceView.importCsv(); }, 0);
}
function _finAureliSource() {
  return ((SourcesStore.data && SourcesStore.data.sources) || []).find(s => s.capability === 'bank' && finProviderOf(s) === 'aureli' && !s.demo) || null;
}
function _finConnectAureli() {
  const all = (window.Connections && Connections.all && Connections.all()) || {};
  if (all.claude && all.claude.state && all.claude.state !== 'ok') {
    toast('Aureli is read through Claude: connect Claude first.', { icon: 'sparkles', action: { label: 'Go to Claude', run: () => connOpen('claude') } });
    return;
  }
  const src = _finAureliSource();
  if (src) { if (typeof _connPageSourceHelp === 'function') _connPageSourceHelp(src); return; }
  const server = ((SourcesStore.data && SourcesStore.data.servers) || []).find(v => /^claude\.ai Bank$/i.test(v.name || ''));
  if (server && server.status === 'ok') { srcAddFlow({ capability: 'bank', server: server.name }); return; }
  // Not signed in to the connector yet: sign in on claude.ai, verified on return.
  if (typeof connCloudSignIn === 'function') connCloudSignIn(null, 'bank');
  else window.open(CONNECTORS_URL, '_blank', 'noopener');
}
async function finSyncSource(s) {
  if (s.kind !== 'direct') { _srcSync(s); return; }
  if (SourcesStore.busy[s.id]) return;
  SourcesStore.busy[s.id] = true; renderMain();
  try {
    const j = await finApi('sources/' + encodeURIComponent(s.id) + '/sync', { method: 'POST', body: {} });
    toast(j.message || `Syncing ${s.label}…`, { icon: 'refresh-cw' });
    const t0 = Date.now();
    while (Date.now() - t0 < 10 * 60000) {
      await new Promise(r => setTimeout(r, 2500));
      const st = await finApi('/api/finance/status').catch(() => null);
      if (!st || !st.job || st.job.state !== 'running') break;
    }
  } catch (e) { toast(e.message, { kind: 'err', timeout: 8000 }); }
  delete SourcesStore.busy[s.id];
  await Promise.all([SourcesStore.refresh(), FinConnectStore.load({ force: true })]);
  _srcAfterChange('bank');
}
async function _finPatchAccount(group, a, patch, msg) {
  try {
    if (!FinConnectStore.missing) await finApi('accounts/' + encodeURIComponent(a.key), { method: 'PATCH', body: patch });
    else await _srcApi('/api/sources/' + encodeURIComponent(group.source.id), { method: 'PUT', body: { accounts: [Object.assign({ id: a.id }, patch)] } });
    if (msg) toast(msg, { kind: 'ok' });
  } catch (e) { toast(e.message, { kind: 'err' }); }
  await Promise.all([SourcesStore.refresh(), FinConnectStore.load({ force: true })]);
  _srcAfterChange('bank');
}
function _finColourPop(anchor, group, a) {
  openPopover(anchor, (el, close) => {
    el.classList.add('src-colpop');
    const sw = _finEl('div', 'cal-swatches');
    for (const c of SRC_SWATCHES) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'cal-sw c-' + c + (c === a.colour ? ' on' : '');
      b.setAttribute('aria-label', c); b.title = c[0].toUpperCase() + c.slice(1);
      b.onclick = () => { close(); if (c !== a.colour) _finPatchAccount(group, a, { colour: c }); };
      sw.appendChild(b);
    }
    el.appendChild(sw);
  }, { align: 'end', width: 200 });
}
/** Disconnect a provider's source: confirm, choose keep or remove past transactions. */
function finDisconnect(group) {
  const s = group.source, p = finProviderInfo(group.provider);
  const label = s.label || p.name;
  let removeData = false, busy = false;
  openDrawer({
    title: `Stop syncing ${label}?`, width: 480, resizable: false,
    body: (el, close) => {
      el.classList.add('fc-sheet', 'fc-disconnect');
      el.appendChild(_finEl('p', 'fc-lead', s.kind === 'direct'
        ? `Your past transactions stay in Finances. OpenDash deletes its saved sign-in for ${label} from this computer${group.provider === 'monzo' || group.provider === 'enable-banking' ? ' and tells the provider to end it' : ''}.`
        : `Your past transactions stay in Finances. OpenDash stops reading ${label}; your sign-in on claude.ai is not changed.`));
      const opts = _finEl('div', 'fc-radio-group'); opts.setAttribute('role', 'radiogroup');
      const paint = () => {
        opts.replaceChildren();
        for (const [val, title, sub] of [[false, 'Keep past transactions', 'Recommended. They stay in Finances and in your reports.'], [true, 'Also remove them', 'Takes this connection’s transactions out of Finances. You can undo it straight after.']]) {
          const b = _finEl('button', 'fc-radio' + (removeData === val ? ' on' : '')); b.type = 'button';
          b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(removeData === val));
          b.append(_finEl('span', 'fc-radio-dot'), Object.assign(_finEl('span', 'fc-radio-t'), {}));
          b.lastChild.append(_finEl('b', null, title), _finEl('span', null, sub));
          b.onclick = () => { if (removeData === val) return; removeData = val; paint(); };
          opts.appendChild(b);
        }
      };
      paint(); el.appendChild(opts);
      const foot = _finEl('div', 'fc-foot');
      foot.append(_finEl('span', 'spacer'), _connBtn('Cancel', null, 'btn-ghost', () => close()));
      const go = _connBtn('Disconnect', 'unplug', 'btn-danger', async (b) => {
        if (busy) return; busy = true; b.disabled = true;
        try {
          if (s.kind === 'direct') {
            const j = await finApi('sources/' + encodeURIComponent(s.id) + '/disconnect', { method: 'POST', body: { removeData } });
            close();
            toast(removeData ? `${label} disconnected. ${j && j.removed ? j.removed + ' transactions removed.' : ''}` : `${label} disconnected. Past transactions are kept.`, { kind: 'ok', timeout: 9000,
              action: j && j.undo ? { label: 'Undo', run: () => finApi('undo', { method: 'POST', body: { token: j.undo } }).then(() => { toast('Transactions put back.', { kind: 'ok' }); _srcAfterChange('bank'); }).catch(e => toast(e.message, { kind: 'err' })) } : undefined });
          } else {
            await _srcApi('/api/sources/' + encodeURIComponent(s.id), { method: 'DELETE' });
            close(); toast(`${label} removed`, { kind: 'ok' });
          }
        } catch (e) { busy = false; b.disabled = false; toast(e.message, { kind: 'err', timeout: 8000 }); return; }
        await Promise.all([SourcesStore.refresh(), FinConnectStore.load({ force: true })]);
        _srcAfterChange('bank');
      });
      foot.appendChild(go);
      el.appendChild(foot);
    },
  });
}

/* ---------- Your accounts ---------- */
function _finGroupMenu(anchor, group) {
  const s = group.source;
  const items = [];
  if (group.provider === 'enable-banking') items.push({ label: 'Add another bank', icon: 'plus', run: () => finStartProvider('enable-banking', { step: 'bank' }) });
  if (s.kind !== 'direct' && s.kind !== 'csv') items.push({ label: 'Test now', icon: 'zap', run: () => _srcTestExisting(s) });
  items.push({ label: 'Rename…', icon: 'pencil', run: async () => {
    const v = await promptDialog({ title: 'Rename connection', label: 'Shown on Connections and in Finances.', value: s.label, confirmLabel: 'Rename' });
    if (v && v !== s.label) _srcUpdate(s, { label: v.slice(0, 60) }, 'Renamed');
  } });
  items.push({ label: 'Colour…', icon: 'palette', run: () => _srcColourPop(anchor, s) });
  items.push('sep');
  if (s.kind === 'csv') items.push({ label: 'Open Finances', icon: 'arrow-right', run: () => setView('finance') });
  else items.push({ label: 'Disconnect…', icon: 'unplug', danger: true, run: () => finDisconnect(group) });
  openMenu(anchor, items, { align: 'end' });
}
function _finRowMenu(anchor, group, a) {
  const items = [
    { label: 'Rename', icon: 'pencil', run: () => { _finRenaming = a.key; renderMain(); } },
    { label: 'Colour…', icon: 'palette', run: () => _finColourPop(anchor, group, a) },
    a.enabled ? { label: 'Hide from Finances', icon: 'eye-off', run: () => _finPatchAccount(group, a, { enabled: false }, `${a.name} hidden. Its data is kept.`) }
      : { label: 'Show in Finances', icon: 'eye', run: () => _finPatchAccount(group, a, { enabled: true }, `${a.name} shown in Finances`) },
  ];
  openMenu(anchor, items, { align: 'end' });
}
function _finStatusPill(kind, label) { return _finEl('span', 'status ' + kind, label); }
function _finAccountRow(group, a, nameOf) {
  const open = _finOpenRow === a.key;
  const row = _finEl('div', 'fc-acc' + (a.enabled ? '' : ' is-hidden') + (open ? ' is-open' : '') + (a.duplicateOf ? ' is-dup' : ''));
  row.dataset.account = a.key;
  row.setAttribute('role', 'listitem');
  const main = _finEl('button', 'fc-acc-main'); main.type = 'button';
  main.setAttribute('aria-expanded', String(open));
  if (open) { main.setAttribute('aria-current', 'true'); }
  main.onclick = (e) => {
    if (e.target.closest('input')) return;
    if (_finOpenRow === a.key) return;                   // re-selecting is a no-op
    _finOpenRow = a.key; renderMain();
  };
  const colour = SRC_SWATCHES.includes(a.colour) ? a.colour : 'slate';
  main.appendChild(_finEl('span', 'fc-sw c-' + colour));
  const names = _finEl('span', 'fc-acc-names');
  if (_finRenaming === a.key) {
    const input = _finEl('input', 'fc-rename'); input.value = a.name; input.maxLength = 60;
    input.setAttribute('aria-label', 'New name for ' + a.name);
    let done = false;
    const finish = (save) => {
      if (done) return; done = true; _finRenaming = null;
      const v = input.value.trim();
      if (save && v && v !== a.name) _finPatchAccount(group, a, { name: v }, 'Renamed'); else renderMain();
    };
    input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); finish(true); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); } };
    input.onblur = () => finish(true);
    input.onclick = (e) => e.stopPropagation();
    names.appendChild(input);
    requestAnimationFrame(() => { if (input.isConnected) { input.focus(); input.select(); } });
  } else names.appendChild(_finEl('span', 'fc-acc-name', a.name));
  const subBits = [a.bankName && a.bankName !== a.name ? a.bankName : '', FIN_KIND_LABEL[a.kind] || '', finMask(a.mask), a.balanceOnly || a.kind === 'pot' ? 'balance only' : ''].filter(Boolean);
  names.appendChild(_finEl('span', 'fc-acc-sub', subBits.join(' · ') || finProviderInfo(group.provider).name));
  main.appendChild(names);
  const bal = _finEl('span', 'fc-acc-bal' + (a.balance == null ? ' is-empty' : ''), a.balance == null ? '—' : finMoney(a.balance, a.currency));
  if (a.balance != null) bal.setAttribute('data-tip', 'Balance at the last sync');
  main.appendChild(bal);
  const syncTone = finSyncTone(a.lastSync);
  const when = _finEl('span', 'fc-acc-when' + (syncTone === 'red' ? ' is-late' : ''));
  when.innerHTML = icon('clock', 'i-xs'); when.appendChild(_finEl('span', null, a.lastSync ? _connAgo(a.lastSync) : 'Not synced yet'));
  main.appendChild(when);
  row.appendChild(main);
  // Re-auth (outside the button so it can be its own badge).
  const side = _finEl('div', 'fc-acc-side');
  const due = finDueTone(a.reauthDue);
  if (a.needsAuth || due.tone === 'past') side.appendChild(_finStatusPill('warn', 'Needs sign-in'));
  else if (due.tone !== 'none') {
    const b = _finStatusPill(due.tone === 'ok' ? 'off' : due.tone === 'amber' ? 'warn' : 'err', finDueText(a.reauthDue));
    b.classList.add('fc-due'); side.appendChild(b);
  }
  const sw = _finEl('button', 'fc-switch'); sw.type = 'button';
  sw.setAttribute('role', 'switch'); sw.setAttribute('aria-checked', String(a.enabled));
  sw.setAttribute('aria-label', 'Show ' + a.name + ' in Finances');
  sw.setAttribute('data-tip', a.enabled ? 'Shown in Finances. Click to hide (its data is kept).' : 'Hidden from Finances. Click to show.');
  sw.appendChild(_finEl('span', 'fc-switch-knob'));
  sw.disabled = !!SourcesStore.busy[group.source.id] || group.source.kind === 'csv';
  sw.onclick = (e) => { e.stopPropagation(); sw.disabled = true; _finPatchAccount(group, a, { enabled: !a.enabled }, a.enabled ? `${a.name} hidden from Finances. Its data is kept.` : `${a.name} shown in Finances`); };
  side.appendChild(sw);
  const more = _finEl('button', 'btn-icon btn-sm'); more.type = 'button';
  more.setAttribute('aria-label', 'Manage ' + a.name); more.innerHTML = icon('ellipsis');
  more.onclick = (e) => { e.stopPropagation(); _finRowMenu(more, group, a); };
  side.appendChild(more);
  row.appendChild(side);
  if (a.duplicateOf) {
    const other = a.duplicateOfName || nameOf(a.duplicateOf);
    const dup = _finEl('div', 'fc-dup');
    dup.innerHTML = icon('copy', 'i-xs');
    dup.appendChild(_finEl('span', null, `Possible duplicate of ${other}. ${a.enabled ? 'Both are counted in Finances.' : 'Hidden so nothing is counted twice.'}`));
    dup.append(_connBtn('Keep this one', null, 'btn-ghost', () => _finPatchAccount(group, a, { keep: 'this' }, `Keeping ${a.name}`)),
      _connBtn('Keep the other', null, 'btn-ghost', () => _finPatchAccount(group, a, { keep: 'other' }, `Keeping ${other}`)));
    row.appendChild(dup);
  }
  if (open) {
    const det = _finEl('dl', 'fc-acc-detail');
    const add = (k, v) => { if (!v) return; det.append(_finEl('dt', null, k), _finEl('dd', null, v)); };
    add('Provider', finProviderInfo(group.provider).name);
    add('Kind', FIN_KIND_LABEL[a.kind] || '');
    add('Account', finMask(a.mask));
    add('Last sync', a.lastSync ? new Date(a.lastSync).toLocaleString() : 'Not synced yet');
    if (a.reauthDue) add('Sign in again', finDateLabel(a.reauthDue));
    add('In Finances', a.enabled ? 'Shown' : a.hiddenReason === 'duplicate' ? 'Hidden (possible duplicate)' : 'Hidden; its data is kept');
    if (group.provider === 'plasma') add('Note', 'Card purchases may show as “Plasma One card” without the shop name.');
    row.appendChild(det);
  }
  return row;
}
function _finGroupCard(group, nameOf) {
  const s = group.source, p = finProviderInfo(group.provider), busy = !!SourcesStore.busy[s.id];
  const card = _finEl('section', 'fc-group');
  card.dataset.source = s.id; card.dataset.provider = group.provider;
  const head = _finEl('div', 'fc-group-head');
  const mark = _finEl('span', 'fc-mark'); mark.innerHTML = finMark(p.mark || group.provider);
  const titles = _finEl('div', 'fc-group-titles');
  titles.append(_finEl('h4', null, s.label || p.name), _finEl('span', null, group.provider === 'mcp' ? (s.server || 'Bank MCP') + ' · through Claude' : p.sub));
  head.append(mark, titles);
  const st = s.enabled === false ? 'off' : (group.api && group.api.state) || (s.health && (s.health.connectionState || s.health.state)) || (s.kind === 'direct' ? 'ok' : 'unknown');
  const due = finDueTone(s.reauthDue);
  const pill = s.kind === 'csv' ? _finStatusPill('off', 'Manual import')
    : st === 'off' ? _finStatusPill('off', 'Paused')
    : st === 'auth' || due.tone === 'past' ? _finStatusPill('warn', 'Needs sign-in')
    : st === 'error' ? _finStatusPill('err', 'Not working')
    : (due.tone === 'amber' || due.tone === 'red') ? _finStatusPill(due.tone === 'red' ? 'err' : 'warn', `Re-authorise in ${due.days} day${due.days === 1 ? '' : 's'}`)
    : st === 'ok' ? _finStatusPill('ok', 'Connected') : _finStatusPill('off', 'Not checked yet');
  head.appendChild(pill);
  const lock = _finEl('span', 'fc-lock'); lock.innerHTML = icon(s.kind === 'csv' ? 'hard-drive' : 'lock', 'i-xs');
  lock.setAttribute('data-tip', s.kind === 'csv' ? 'Imported from files on this computer.' : FIN_READONLY_TIP);
  lock.appendChild(_finEl('span', null, s.kind === 'csv' ? 'Local' : 'Read-only'));
  head.appendChild(lock);
  const acts = _finEl('div', 'fc-group-acts');
  if (s.kind === 'csv') acts.appendChild(_connBtn('Import a CSV', 'upload', 'btn-ghost', finImportCsv));
  else if (st === 'auth' || due.tone === 'past' || (due.tone === 'red' && s.kind === 'direct')) {
    acts.appendChild(_connBtn('Sign in again', 'log-in', 'btn-secondary', () => s.kind === 'direct' ? finStartProvider(group.provider, { reauth: s.id }) : _connPageSourceHelp(s)));
  } else {
    const sync = _connBtn(busy ? 'Syncing…' : 'Sync now', busy ? null : 'refresh-cw', 'btn-ghost', () => finSyncSource(s));
    if (busy) { sync.disabled = true; sync.insertAdjacentHTML('afterbegin', '<span class="spinner"></span>'); }
    if (st === 'off') sync.disabled = true;
    acts.appendChild(sync);
  }
  const more = _finEl('button', 'btn-icon btn-sm'); more.type = 'button';
  more.setAttribute('aria-label', 'Manage ' + (s.label || p.name)); more.innerHTML = icon('ellipsis');
  more.disabled = busy;
  more.onclick = (e) => { e.stopPropagation(); _finGroupMenu(more, group); };
  acts.appendChild(more);
  head.appendChild(acts);
  card.appendChild(head);
  const msg = (group.api && group.api.message) || (s.health && s.health.message);
  if (msg && st !== 'off' && (st !== 'ok' || (group.api && group.api.historyMode === '90d'))) {
    const m = _finEl('div', 'fc-group-msg' + (st === 'error' ? ' is-err' : ''));
    m.innerHTML = icon('circle-alert', 'i-xs'); m.appendChild(_finEl('span', null, String(msg).replace(/:\s*open Connections( to connect it)?\.?$/i, '.')));
    card.appendChild(m);
  }
  const list = _finEl('div', 'fc-acc-list'); list.setAttribute('role', 'list');
  if (!group.accounts.length) list.appendChild(_finEl('p', 'fc-acc-empty', s.kind === 'csv' ? 'Imported accounts appear in Finances.' : 'Accounts appear here after the first sync.'));
  for (const a of group.accounts) list.appendChild(_finAccountRow(group, a, nameOf));
  card.appendChild(list);
  return card;
}
function _finAccountsSection(groups) {
  const wrap = _finEl('div', 'fc-accounts');
  const head = _finEl('div', 'fc-sub-head');
  const n = groups.reduce((t, g) => t + g.accounts.length, 0);
  const shown = groups.reduce((t, g) => t + g.accounts.filter(a => a.enabled).length, 0);
  head.append(_finEl('h3', null, 'Your accounts'), _finEl('span', 'fc-sub-note', `${shown} of ${n} account${n === 1 ? '' : 's'} shown in Finances`));
  wrap.appendChild(head);
  const names = new Map();
  for (const g of groups) for (const a of g.accounts) names.set(a.key, `${a.name} (${finProviderInfo(g.provider).name})`);
  const nameOf = (key) => names.get(key) || 'another account';
  for (const g of groups) wrap.appendChild(_finGroupCard(g, nameOf));
  return wrap;
}

/* ---------- Add a bank or wallet (the chooser) ---------- */
function _finProviderCard(p, groups, match, wide) {
  const entry = FinConnectStore.entry(p.id) || {};
  const status = finCardStatus(p.id, groups, entry);
  const card = _finEl('article', 'fc-card' + (wide ? ' is-wide' : '') + (match.highlight === p.id ? ' is-match' : '') + (status && status.kind === 'ok' ? ' is-connected' : ''));
  card.dataset.provider = p.id;
  if (match.highlight === p.id) card.setAttribute('aria-current', 'true');
  const top = _finEl('div', 'fc-card-top');
  const mark = _finEl('span', 'fc-mark fc-mark-lg'); mark.innerHTML = finMark(p.mark);
  const titles = _finEl('div', 'fc-card-titles');
  titles.append(_finEl('h4', null, p.name), _finEl('span', null, p.sub));
  top.append(mark, titles);
  if (status) { const badges = _finEl('div', 'fc-card-badges'); badges.appendChild(_finStatusPill(status.kind, status.label)); top.appendChild(badges); }
  card.appendChild(top);
  const facts = _finEl('dl', 'fc-facts');
  for (const [k, label, ic] of FIN_FACT_ROWS) {
    const dt = _finEl('dt'); dt.innerHTML = icon(ic, 'i-xs'); dt.appendChild(_finEl('span', null, label));
    const dd = _finEl('dd');
    const free = k === 'cost' && /^Free\b/.exec(p.facts[k]);
    if (free) { dd.append(_finEl('b', 'fc-free', 'Free'), document.createTextNode(p.facts[k].slice(4))); }
    else dd.textContent = p.facts[k];
    facts.append(dt, dd);
  }
  card.appendChild(facts);
  const open = _finMoreOpen.has(p.id);
  if (open) card.appendChild(_finEl('p', 'fc-more-text', p.more));
  const foot = _finEl('div', 'fc-card-foot');
  const moreBtn = _finEl('button', 'fc-more-btn', open ? 'Less' : 'More'); moreBtn.type = 'button';
  moreBtn.setAttribute('aria-expanded', String(open));
  moreBtn.onclick = () => { if (open) _finMoreOpen.delete(p.id); else _finMoreOpen.add(p.id); renderMain(); };
  const left = _finEl('div', 'fc-card-foot-l');
  left.appendChild(moreBtn);
  const lock = _finEl('span', 'fc-lock'); lock.innerHTML = icon(p.id === 'csv' ? 'hard-drive' : 'lock', 'i-xs');
  lock.appendChild(_finEl('span', null, p.id === 'csv' ? 'On this computer' : 'Read-only'));
  lock.setAttribute('data-tip', p.id === 'csv' ? 'The file is read on this computer.' : FIN_READONLY_TIP);
  left.appendChild(lock);
  foot.appendChild(left);
  let label = p.action, ic = p.id === 'csv' ? 'upload' : p.id === 'plasma' ? 'clipboard' : p.id === 'enable-banking' ? 'search' : 'plus';
  if (p.id === 'aureli') {
    const src = _finAureliSource();
    if (src) { label = status && status.kind === 'ok' ? 'Connected' : 'Reconnect'; ic = status && status.kind === 'ok' ? 'check' : 'log-in'; }
  } else if (p.id === 'monzo' && status && status.kind === 'ok') { label = 'Add Monzo again'; }
  else if (p.id === 'monzo' && entry.configured && !(status && status.kind === 'ok')) { label = 'Finish connecting'; ic = 'arrow-right'; }
  else if (p.id === 'enable-banking' && status && status.kind === 'ok') { label = 'Add another bank'; ic = 'plus'; }
  else if (p.id === 'plasma' && status && status.kind === 'ok') { label = 'Add a wallet'; ic = 'plus'; }
  const go = _connBtn(label, ic, 'btn-primary fc-go', () => {
    if (p.id === 'enable-banking' && match.query && match.banks.length === 1) finStartProvider(p.id, { bank: match.banks[0].name });
    else finStartProvider(p.id);
  });
  go.classList.remove('btn-sm');
  if (p.id === 'aureli' && label === 'Connected') { go.className = 'btn btn-secondary fc-go'; go.onclick = (e) => { e.stopPropagation(); const s = _finAureliSource(); if (s) finSyncSource(s); }; go.innerHTML = icon('refresh-cw') + '<span>Sync now</span>'; }
  go.dataset.act = 'connect-' + p.id;
  foot.appendChild(go);
  card.appendChild(foot);
  return card;
}
function _finChooser(groups) {
  const wrap = _finEl('div', 'fc-chooser');
  const head = _finEl('div', 'fc-sub-head');
  head.append(_finEl('h3', null, 'Add a bank or wallet'));
  const search = _finEl('label', 'fc-search'); search.innerHTML = icon('search');
  const input = _finEl('input'); input.type = 'search'; input.placeholder = 'Search your bank'; input.value = _finQuery;
  input.setAttribute('aria-label', 'Search your bank'); input.setAttribute('aria-controls', 'fc-chooser-groups');
  search.appendChild(input);
  head.appendChild(search);
  wrap.appendChild(head);
  const results = _finEl('div', 'fc-results'); results.setAttribute('role', 'status'); results.setAttribute('aria-live', 'polite');
  const body = _finEl('div', 'fc-groups'); body.id = 'fc-chooser-groups';
  const paint = () => {
    const bankInfo = _finBankList();
    const match = finChooserMatch(_finQuery, bankInfo.banks);
    body.replaceChildren(); results.replaceChildren();
    if (match.query) {
      if (match.highlight) {
        const p = finProviderInfo(match.highlight);
        results.appendChild(_finEl('span', null, `${p.name} has its own connection below.`));
      } else if (match.banks.length) {
        const line = _finEl('div', 'fc-bank-hits');
        line.appendChild(_finEl('span', 'fc-bank-hits-l', bankInfo.source === 'live' ? 'Through Enable Banking:' : `Through Enable Banking${bankInfo.asOf ? ' (list from ' + finDateLabel(bankInfo.asOf) + ')' : ''}:`));
        for (const b of match.banks) {
          const chip = _finEl('button', 'fc-bank-chip'); chip.type = 'button';
          chip.append(_finEl('span', null, b.name));
          if (b.beta) chip.appendChild(_finEl('span', 'fc-beta', 'beta'));
          chip.onclick = () => finStartProvider('enable-banking', { bank: b.name });
          line.appendChild(chip);
        }
        results.appendChild(line);
      } else if (match.ebNone) {
        results.appendChild(_finEl('span', null, bankInfo.source === 'live'
          ? `“${_finQuery.trim()}” is not available through Enable Banking yet: import a CSV instead.`
          : bankInfo.source === 'snapshot' ? `“${_finQuery.trim()}” is not in Enable Banking’s list we have. Check the live list during setup, or import a CSV.`
          : `We can’t confirm “${_finQuery.trim()}” before you set up Enable Banking (their bank list needs your own free app). Check during setup, or import a CSV.`));
      }
    }
    let shown = 0;
    for (const g of FIN_GROUPS) {
      const list = FIN_PROVIDERS.filter(p => p.group === g.id && match.cards.has(p.id));
      if (!list.length) continue;
      const sec = _finEl('div', 'fc-pgroup'); sec.dataset.group = g.id;
      const gh = _finEl('div', 'fc-pgroup-head');
      gh.append(_finEl('span', 'fc-pgroup-t', g.title), _finEl('span', 'fc-pgroup-s', g.sub));
      sec.appendChild(gh);
      const grid = _finEl('div', 'fc-cards' + (list.length === 1 ? ' is-single' : ''));
      for (const p of list) { grid.appendChild(_finProviderCard(p, groups, match, list.length === 1)); shown++; }
      if (g.id === 'claude' && !match.query) {
        const other = _finEl('p', 'fc-alt');
        other.appendChild(_finEl('span', null, 'Another bank MCP in your Claude? '));
        const b = _finEl('button', 'fc-link', 'Add it as a source'); b.type = 'button';
        b.onclick = () => srcAddFlow({ capability: 'bank', mcpBank: true });
        other.appendChild(b);
        sec.appendChild(grid); sec.appendChild(other);
      } else sec.appendChild(grid);
      body.appendChild(sec);
    }
    if (!shown) {
      const empty = _finEl('div', 'fc-none');
      empty.append(_finEl('b', null, 'Nothing matches.'), _finEl('span', null, 'Any bank works with a CSV export.'));
      empty.appendChild(_connBtn('Import a CSV', 'upload', 'btn-secondary', finImportCsv));
      body.appendChild(empty);
    }
  };
  input.onfocus = () => { _finSearchFocus = true; };
  input.onblur = () => { _finSearchFocus = false; };
  input.oninput = () => { _finQuery = input.value; paint(); };
  input.onkeydown = (e) => { if (e.key === 'Escape' && input.value) { e.stopPropagation(); input.value = ''; _finQuery = ''; paint(); } };
  paint();
  wrap.append(results, body);
  if (_finSearchFocus) requestAnimationFrame(() => { if (input.isConnected) { input.focus({ preventScroll: true }); const n = input.value.length; input.setSelectionRange(n, n); } });
  return wrap;
}

/** The Money block of the Connections page. */
function finMoneyBlock() {
  if (!FinConnectStore.loading && (FinConnectStore.providers == null || FinConnectStore.stale())) FinConnectStore.load();
  const section = _finEl('section', 'cp-money' + (_finEntered ? '' : ' fc-enter'));
  _finEntered = true;
  section.dataset.conn = 'money'; section.id = 'money';
  const head = _finEl('div', 'cp-section-head');
  const title = _finEl('div');
  title.append(_finEl('h2', null, 'Money'), _finEl('p', null, 'Banks and wallets that bring transactions into Finances. Pick the way that suits each one.'));
  const note = _finEl('span', 'cp-readonly'); note.innerHTML = icon('shield-check', 'i-xs');
  note.appendChild(_finEl('span', null, 'Read-only: can never move money')); note.setAttribute('data-tip', FIN_READONLY_TIP);
  head.append(title, note);
  section.appendChild(head);
  if (FinConnectStore.error) {
    const err = _finEl('div', 'cp-fetch-error'); err.setAttribute('role', 'alert');
    err.append(_finEl('span', null, 'Could not load the money connections. ' + FinConnectStore.error), _connBtn('Try again', 'refresh-cw', 'btn-secondary', () => FinConnectStore.load({ force: true })));
    section.appendChild(err);
  }
  const groups = SourcesStore.data ? _finGroups() : [];
  if (groups.some(g => g.accounts.length || g.provider !== 'csv')) section.appendChild(_finAccountsSection(groups));
  else if (!SourcesStore.data) section.appendChild(_finEl('p', 'cp-loading', 'Loading your accounts…'));
  section.appendChild(_finChooser(groups));
  const foot = _finEl('p', 'fc-privacy');
  foot.innerHTML = icon('hard-drive', 'i-xs');
  foot.appendChild(_finEl('span', null, 'Transactions are saved in your data folder on this computer. Sign-ins for direct connections are kept in its secrets area, never in the page, logs or exports. Disconnecting deletes them.'));
  section.appendChild(foot);
  return section;
}

/* ---------- Finances: the sign-in-again notice (10-shell.js paintTop) ---------- */
/** [icon, title, text] for the Finances banner, or null. */
function finConnectReauthNotice() {
  const groups = SourcesStore.data ? _finGroups() : [];
  let worst = null;
  for (const g of groups) {
    if (g.source.kind !== 'direct' || g.source.enabled === false) continue;
    const needs = g.accounts.some(a => a.needsAuth) || (g.source.health && g.source.health.state === 'auth');
    const due = finDueTone(g.source.reauthDue || (g.accounts.find(a => a.reauthDue) || {}).reauthDue);
    const score = needs || due.tone === 'past' ? 3 : due.tone === 'red' ? 2 : due.tone === 'amber' ? 1 : 0;
    if (score && (!worst || score > worst.score)) worst = { score, g, due };
  }
  if (!worst) return null;
  const label = worst.g.source.label || finProviderInfo(worst.g.provider).name;
  if (worst.score === 3) return ['log-in', `${label} needs you to sign in again.`, 'New transactions are paused until you do. Open Connections > Money.'];
  return ['clock', `${label}: sign in again by ${finDateLabel(worst.g.source.reauthDue || worst.g.accounts.find(a => a.reauthDue).reauthDue)}.`, 'Banks ask for this every few months. Open Connections > Money.'];
}
if (typeof window !== 'undefined') window.finConnectReauthNotice = finConnectReauthNotice;

/* ---------- #view=connections:money ---------- */
function _finHashFocus() {
  if (/^#view=connections(:|%3A)money$/i.test(location.hash || '')) connOpen('money');
}
if (typeof window !== 'undefined' && typeof location !== 'undefined') {
  window.addEventListener('hashchange', _finHashFocus);
  window.addEventListener('load', () => setTimeout(_finHashFocus, 0));
}
if (typeof registerCommand === 'function') {
  registerCommand({ id: 'connect-bank', label: 'Connect a bank or wallet', icon: 'landmark', group: 'Commands', keywords: 'money bank monzo plasma wallet enable banking aureli csv finance connect', run: () => connOpen('money') });
}
