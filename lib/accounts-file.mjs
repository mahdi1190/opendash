// lib/accounts-file.mjs - the account registry file, <data>/accounts.json
// (docs/dev/ACCOUNTS.md section 2): {version: 1, accounts: [Account]}.
//
// In the data folder on purpose: it holds no secrets (tokens live in the
// secret store, lib/secret-store.mjs, on each computer) and it travels with
// the data. A leaf module (fsutil + the pure core only), so lib/sources.mjs
// can read accounts for source health without importing lib/accounts.mjs.
//
// Node stdlib only.

import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readJson, writeJson, withLock } from './fsutil.mjs';
import { validateAccount } from './accounts/core.mjs';

export const accountsFile = (dataDir) => join(resolve(dataDir), 'accounts.json');

/** The valid account records (a damaged or missing file reads as none). */
export async function readAccountsFile(dataDir) {
  const raw = await readJson(accountsFile(dataDir), { fallback: null }).catch(() => null);
  const out = [];
  for (const a of raw && Array.isArray(raw.accounts) ? raw.accounts : []) {
    const { account, errors } = validateAccount(a);
    if (!errors.length && !out.some((x) => x.id === account.id)) out.push(account);
  }
  return out;
}

/** The registry adapter for lib/accounts/core.mjs createAccounts. */
export function fileRegistry(dataDir) {
  const f = accountsFile(dataDir);
  return {
    file: f,
    read: async () => ({ version: 1, accounts: await readAccountsFile(dataDir) }),
    mutate: (fn) => withLock(f, async () => {
      // strict: a file that exists but cannot be read (locked by OneDrive or an
      // antivirus) throws, rather than being overwritten as empty.
      const cur = existsSync(f) ? await readJson(f) : null;
      const list = cur && Array.isArray(cur.accounts) ? cur.accounts : [];
      const r = await fn(list);
      await writeJson(f, { version: 1, accounts: list }, { trailingNewline: true });
      return r;
    }),
  };
}
