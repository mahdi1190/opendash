#!/usr/bin/env node
// A stand-in for the `claude` CLI running the finance bank-sync job
// ('bank-read' profile). It answers like the claude.ai Bank connector would:
// accounts, paged transactions (made up), balances. FAKE_BANK_MODE:
//   ok          two accounts, debits/credits, a pending one, a foreign-currency
//               one, a duplicated id across pages, bank categories, balances
//   needs-auth  the connector needs signing in again (the runner stops early)
//   empty       no transactions at all
// The dates are relative to FAKE_BANK_TODAY (YYYY-MM-DD).
const mode = process.env.FAKE_BANK_MODE || 'ok';
const today = process.env.FAKE_BANK_TODAY || new Date().toISOString().slice(0, 10);
const P = 'mcp__claude_ai_Bank__';
const day = (n) => { const d = new Date(today + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
let stdin = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => { stdin += d; });
process.stdin.on('end', async () => {
  if (process.env.FAKE_BANK_LOG) (await import('node:fs')).appendFileSync(process.env.FAKE_BANK_LOG, JSON.stringify({ argv: process.argv.slice(2), stdinLength: stdin.length }) + '\n');
  const delay = Number(process.env.FAKE_BANK_DELAY_MS || 0);
  if (delay) await new Promise(r => setTimeout(r, delay));
  const out = (o) => process.stdout.write(JSON.stringify(o) + '\n');
  const tools = ['sync_bank_accounts', 'list_transaction_accounts', 'get_account_transactions', 'list_portfolios', 'get_portfolio_information', 'get_asset_valuations'].map(t => P + t);
  if (mode === 'needs-auth') {
    out({ type: 'system', subtype: 'init', tools: [], mcp_servers: [{ name: 'claude.ai Bank', status: 'needs-auth' }] });
    setTimeout(() => out({ type: 'result', subtype: 'success', is_error: false, result: '[]' }), 4000);
    return;
  }
  out({ type: 'system', subtype: 'init', tools, mcp_servers: [{ name: 'claude.ai Bank', status: 'connected' }] });
  let id = 0;
  const call = (name, input, payload) => {
    const tid = 't' + (++id);
    out({ type: 'assistant', message: { content: [{ type: 'tool_use', id: tid, name: P + name, input }] } });
    out({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: tid, content: [{ type: 'text', text: JSON.stringify(payload) }] }] } });
  };
  call('sync_bank_accounts', {}, { queued: true });
  call('list_transaction_accounts', {}, { accounts: [{ accountId: 'acc-cur' }, { accountId: 'acc-card' }] });
  const from = (/from "(\d{4}-\d{2}-\d{2})"/.exec(stdin) || [])[1] || day(400);
  const tx = (o) => Object.assign({ status: 'posted', currency: 'GBP', category: null, bankCategory: null }, o);
  const cur = mode === 'empty' ? [] : [
    tx({ id: 'c1', date: day(1), minorUnits: -1250, type: 'debit', description: 'CORNER CAFE', category: 'eating_out' }),
    tx({ id: 'c2', date: day(2), minorUnits: 250000, type: 'credit', description: 'EXAMPLE EMPLOYER SALARY', category: 'income' }),
    tx({ id: 'c3', date: day(3), minorUnits: 4599, type: 'debit', description: 'GROCER ONE', bankCategory: 'groceries' }),   // sign fixed from type
    tx({ id: 'c4', date: day(0), minorUnits: -999, type: 'debit', description: 'PENDING SHOP', status: 'pending' }),
    tx({ id: 'c5', date: day(4), minorUnits: -5000, type: 'debit', description: 'ABROAD STORE', currency: 'EUR' }),
    tx({ id: 'c6', date: day(5), minorUnits: -1000, type: 'debit', description: '=cmd|calc', category: 'Weird<cat>' }),
  ];
  const card = mode === 'empty' ? [] : [
    tx({ id: 'k1', date: day(6), minorUnits: -3000, type: 'debit', description: 'BOOKSHOP', category: 'shopping' }),
    tx({ id: 'k2', date: day(7), minorUnits: -720, type: 'debit', description: 'TRAIN TICKETS', category: 'transport' }),
  ];
  const balances = () => {
    call('list_portfolios', {}, { portfolios: [{ id: 'pf1' }] });
    call('get_portfolio_information', { portfolioId: 'pf1' }, { summary: 'Assets:\n- Current account [id: asset-1, currency: GBP]' });
    call('get_asset_valuations', { portfolioId: 'pf1', assetIdentifier: 'asset-1', from }, {
      assetId: 'asset-1', assetName: 'Current account', assetClass: 'cash', currentMinorUnits: 123456,
      valuations: [{ date: day(1), minorUnits: 120000 }, { date: day(5), minorUnits: 110000 }],
    });
  };
  if (mode === 'partial') {
    // First session stops paging early and skips balances; the server's
    // follow-up session (its prompt says so) fetches the rest.
    if (/finishing an earlier fetch/.test(stdin)) {
      const to = (/accountId "acc-card": from "[\d-]+" to "(\d{4}-\d{2}-\d{2})"/.exec(stdin) || [])[1];
      call('get_account_transactions', { accountId: 'acc-card', from, to, limit: 75 }, { accountId: 'acc-card', totalMatching: 2, transactions: card });
      if (/Balances:/.test(stdin)) balances();
    } else {
      call('get_account_transactions', { accountId: 'acc-cur', from, to: today, limit: 75 }, { accountId: 'acc-cur', totalMatching: cur.length, transactions: cur });
      call('get_account_transactions', { accountId: 'acc-card', from, to: today, limit: 75 }, { accountId: 'acc-card', totalMatching: 2, transactions: card.slice(0, 1) });
    }
    out({ type: 'result', subtype: 'success', is_error: false, num_turns: 4, result: 'DONE' });
    return;
  }
  call('get_account_transactions', { accountId: 'acc-cur', from, to: today, limit: 200 }, { accountId: 'acc-cur', totalMatching: cur.length, transactions: cur });
  // Second page repeats one transaction (boundary date), which must be kept once.
  call('get_account_transactions', { accountId: 'acc-card', from, to: today, limit: 200 }, { accountId: 'acc-card', totalMatching: card.length, transactions: card });
  call('get_account_transactions', { accountId: 'acc-card', from, to: day(6), limit: 200 }, { accountId: 'acc-card', totalMatching: card.length, transactions: card.slice(0, 1) });
  call('list_portfolios', {}, { portfolios: [{ id: 'pf1' }] });
  call('get_portfolio_information', { portfolioId: 'pf1' }, { summary: 'Assets:\n- Current account [id: asset-1, currency: GBP]' });
  call('get_asset_valuations', { portfolioId: 'pf1', assetIdentifier: 'asset-1', from }, {
    assetId: 'asset-1', assetName: 'Current account', assetClass: 'cash', currentMinorUnits: 123456,
    valuations: [{ date: day(1), minorUnits: 120000 }, { date: day(5), minorUnits: 110000 }],
  });
  out({ type: 'result', subtype: 'success', is_error: false, num_turns: 9, result: JSON.stringify([...cur, ...card].map(t => ({ id: t.id, date: t.date, amount: t.minorUnits / 100, description: t.description, accountId: 'x', status: t.status, category: t.category }))) });
});
