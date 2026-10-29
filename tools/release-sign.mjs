// tools/release-sign.mjs - sign release checksum files with the release key.
//
//   RELEASE_SIGNING_KEY=<PKCS#8 PEM> node tools/release-sign.mjs <file> [<file> ...]
//   node tools/release-sign.mjs --verify <file> [...]    checks <file>.sig with the pinned public key
//
// Writes <file>.sig next to each file: the base64 Ed25519 signature of the
// file's exact bytes. The in-app updater (lib/updater.mjs) verifies
// SHA256SUMS.txt.sig against RELEASE_SIGNING_PUBLIC_KEY before it trusts any
// checksum. Refuses (exit 1) when the key is missing, is not Ed25519, or does
// not match the public key pinned in lib/updater.mjs: a release the app could
// not verify is never published. The key is never printed.
//
// Zero dependencies, Node >= 20. Used by .github/workflows/release.yml.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { RELEASE_SIGNING_PUBLIC_KEY, verifyReleaseSignature } from '../lib/updater.mjs';

const fail = (msg) => { console.error(`release-sign: ${msg}`); process.exit(1); };
const args = process.argv.slice(2);
const verifyOnly = args[0] === '--verify';
const files = verifyOnly ? args.slice(1) : args;
if (!files.length) fail('name the files to sign');
if (verifyOnly) {
  for (const f of files) {
    if (!existsSync(`${f}.sig`) || !verifyReleaseSignature(readFileSync(f), readFileSync(`${f}.sig`, 'utf8'))) fail(`${f} is not signed by the release key`);
    console.log(`verified ${f}`);
  }
  process.exit(0);
}
const pem = process.env.RELEASE_SIGNING_KEY || '';
if (!pem.includes('PRIVATE KEY')) fail('RELEASE_SIGNING_KEY is not set (a repository secret holding the Ed25519 private key PEM)');
let key;
try { key = createPrivateKey(pem.replace(/\\n/g, '\n')); } catch { fail('RELEASE_SIGNING_KEY is not a readable private key'); }
if (key.asymmetricKeyType !== 'ed25519') fail('RELEASE_SIGNING_KEY is not an Ed25519 key');
const pub = createPublicKey(key).export({ type: 'spki', format: 'der' }).toString('base64');
if (pub !== RELEASE_SIGNING_PUBLIC_KEY) fail('RELEASE_SIGNING_KEY does not match the public key pinned in lib/updater.mjs');
for (const f of files) {
  const data = readFileSync(f);
  const sig = sign(null, data, key).toString('base64');
  if (!verifyReleaseSignature(data, sig)) fail(`the signature of ${f} does not verify`);
  writeFileSync(`${f}.sig`, sig + '\n');
  console.log(`signed ${f}`);
}
