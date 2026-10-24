#!/usr/bin/env node
// Run the OpenDash relay on this computer (docs/dev/RELAY_PROTOCOL.md section 9):
//
//   node tools/relay-local.mjs --port 4199 --owner-key <identity public key> [--data <dir>] [--host 127.0.0.1] [--shared-ip]
//
// --shared-ip: several OpenDash instances on THIS computer use the relay (development: two "computers"
// and a friend in throwaway data folders). They all reach it from one address, so the per-address
// limits of RELAY_PROTOCOL.md section 8.1 (requests, anonymous paths such as mailbox posts and join
// slots, directory lookups) are raised 20 times; the per-key limits stay as they are.
//
// The same relay as the Cloudflare Worker (lib/relay/core.mjs), with its data
// in <dir> (default: ~/.opendash-relay). It listens on 127.0.0.1 unless --host
// says otherwise; over a network put it behind HTTPS. OpenDash talks to a
// plain-HTTP relay on 127.0.0.1 / localhost only when it runs with
// OPENDASH_RELAY_ALLOW_LOCAL=1 (lib/relay/origin.mjs, RELAY_PROTOCOL.md section
// 12). Nothing is logged but the address it listens on.

import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { startRelayServer } from '../lib/relay/node.mjs';
import { RATES } from '../lib/relay/core.mjs';
import { KEY_RE, iidOf } from '../lib/relay/auth.mjs';

const argv = process.argv.slice(2);
const arg = (name, dflt) => { const i = argv.indexOf('--' + name); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt; };
const port = Number(arg('port', '4199'));
const host = arg('host', '127.0.0.1');
const ownerKey = arg('owner-key', process.env.OPENDASH_RELAY_OWNER_KEY || '');
const dataDir = resolve(arg('data', join(homedir(), '.opendash-relay')));
const sharedIp = argv.includes('--shared-ip');
const rates = sharedIp ? { ...RATES, ip: RATES.ip * 20, anon: RATES.anon * 20, lookupIp: RATES.lookupIp * 20 } : RATES;

if (argv.includes('--help') || !KEY_RE.test(ownerKey) || !Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Usage: node tools/relay-local.mjs --port 4199 --owner-key <identity public key, 43 base64url characters> [--data <dir>] [--host 127.0.0.1] [--shared-ip]');
  process.exit(argv.includes('--help') ? 0 : 2);
}
try {
  const relay = await startRelayServer({ port, host, ownerKey, dataDir, rates });
  console.log(`OpenDash relay on http://${host}:${port} (owner ${await iidOf(ownerKey)}, data in ${dataDir}${sharedIp ? ', per-address limits raised for instances sharing this computer' : ''})`);
  const stop = () => { relay.close().then(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
} catch (e) {
  console.error(e && e.code === 'EADDRINUSE' ? `Port ${port} is in use. Choose another with --port.` : `The relay could not start: ${e && e.message}`);
  process.exit(1);
}
