// 090-accounts - the single Microsoft connection becomes one ACCOUNT of the
// multi-account system (docs/dev/ACCOUNTS.md section 10, lib/accounts.mjs).
//
// When this computer's secret store holds the old Microsoft sign-in (key
// microsoft-tokens): it becomes <data>/accounts.json + the secret
// accounts/<id> (tokens stay on this computer), the existing Microsoft email
// and calendar sources get `account: <id>` and keep their ids (so their
// snapshots and message ids stay as they were), and the old secret is
// removed. A pasted client ID stays where it was.
//
// Idempotent: the account id is derived from the Microsoft user, so a second
// run finds it and changes nothing. The server does the same on first use
// (the old sign-in may still be in <data>/secrets when this runs; the server
// moves it to this computer at start-up and finishes then). Counts only.

import { runIfMain } from './_lib.mjs';
import { migrateLegacyMicrosoft } from '../../lib/accounts.mjs';
import { readHostId } from '../../lib/devicedir.mjs';

export const id = '090-accounts';
export const description = 'Turn the single Microsoft connection into an account (accounts.json; tokens stay in this computer\'s secret store; sources keep their ids).';
export const auto = true;

export async function run(ctx) {
  const r = await migrateLegacyMicrosoft(ctx.dataDir, { deviceId: readHostId(ctx.dataDir), dryRun: ctx.dryRun, log: (level, msg) => ctx.log(msg) });
  const notes = {
    none: [`no old Microsoft sign-in on this computer: nothing to do (${r.sources} old Microsoft source(s))`],
    skipped: [`the old Microsoft sign-in could not be moved (${r.reason}); it asks to sign in again`],
    'dry-run': [`would make one Microsoft account and point ${r.sources} source(s) at it`],
    done: [`made one Microsoft account; ${r.sources} source(s) now point at it`],
  }[r.status] || [r.status];
  return { changed: r.status === 'done', notes };
}

await runIfMain(import.meta.url, { id, description, auto, run });
