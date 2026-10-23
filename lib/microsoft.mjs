// lib/microsoft.mjs - compatibility for the old single Microsoft connection.
//
// Microsoft is now one provider of the multi-account system: any number of
// personal and work accounts side by side (docs/dev/ACCOUNTS.md,
// lib/accounts.mjs, lib/accounts/microsoft.mjs). An old connection becomes an
// account on first use (migrateLegacyMicrosoft). What is left here:
//   MICROSOFT_SCOPES       the scopes the old connection held
//   createMicrosoft({dataDir}).configure(clientId)   the user's own app ID (Advanced),
//                          kept in the secret store as before (key microsoft-client)
//   .status()              a summary for older callers: {configured, connected, account, accounts, needsAuth}
//   microsoftFor(dataDir)  one per data folder
//
// Node stdlib only.

import { secretStore } from './secret-store.mjs';
import { readMicrosoftApp, writeMicrosoftApp } from './accounts.mjs';
import { readAccountsFile } from './accounts-file.mjs';
import { shippedMicrosoftClientId } from './accounts/shipped.mjs';

export const MICROSOFT_SCOPES = Object.freeze(['offline_access', 'User.Read', 'Mail.Read', 'Calendars.Read']);
const services = new Map();

export function createMicrosoft({ dataDir }) {
  const store = secretStore(dataDir);
  async function status() {
    const app = await readMicrosoftApp(store);
    const list = (await readAccountsFile(dataDir)).filter((a) => a.provider === 'microsoft');
    const ok = list.filter((a) => a.status === 'connected');
    return {
      configured: !!(app || shippedMicrosoftClientId()), connected: ok.length > 0, account: ok.length ? ok[0].email : null, accounts: list.length,
      needsAuth: list.some((a) => a.status === 'needs-sign-in'), supports: ['personal', 'work-school'], readOnly: true,
    };
  }
  async function configure(clientId) {
    const before = await readMicrosoftApp(store);
    const after = await writeMicrosoftApp(store, clientId);
    return { ...(await status()), changed: (before && before.clientId) !== (after && after.clientId) };
  }
  return { status, configure };
}

export function microsoftFor(dataDir) { if (!services.has(dataDir)) services.set(dataDir, createMicrosoft({ dataDir })); return services.get(dataDir); }
