#!/usr/bin/env node
// Operator-only Cloudflare deployment, using Node 20 built-ins. No Wrangler,
// npm dependencies, credentials in argv, or subscription changes.
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT, argValue } from '../lib/datadir.mjs';
import { remoteOrigin } from '../lib/remote-mcp-auth.mjs';

export function relayMetadata(publicOrigin, { initial = false } = {}) {
  return {
    main_module: 'relay-worker.mjs', compatibility_date: '2026-10-01',
    bindings: [
      { type: 'durable_object_namespace', name: 'RELAY', class_name: 'OpenDashRelay' },
      { type: 'plain_text', name: 'PUBLIC_ORIGIN', text: remoteOrigin(publicOrigin) },
    ],
    ...(initial ? { migrations: { new_tag: 'opendash-relay-v1', new_sqlite_classes: ['OpenDashRelay'] } } : {}),
    logpush: false, observability: { enabled: false },
  };
}
export async function deployRelay({ accountId, publicOrigin, token, scriptName = 'opendash-relay', fetchFn = fetch }) {
  if (!/^[a-f0-9]{32}$/.test(accountId || '')) throw new Error('A Cloudflare account ID is required.');
  if (!/^opendash-relay(?:-[a-z0-9-]{1,24})?$/.test(scriptName)) throw new Error('Choose opendash-relay or an opendash-relay-* test name.');
  if (!token) throw new Error('Set CLOUDFLARE_API_TOKEN with Workers Scripts Edit permission for this account.');
  const code = await readFile(join(REPO_ROOT, 'cloudflare', 'relay-worker.mjs'), 'utf8');
  if (code.length > 256 * 1024) throw new Error('Relay module is unexpectedly large.');
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}`;
  const api = async (url, options = {}) => {
    const r = await fetchFn(url, { ...options, headers: { Authorization: 'Bearer ' + token }, redirect: 'error', signal: AbortSignal.timeout(30000) });
    const doc = await r.json();
    if (!r.ok || !doc.success) throw Object.assign(new Error('Cloudflare could not complete this operation. Check the API token permissions and account.'), { status: r.status, codes: (doc.errors || []).map(e => e.code) });
    return doc.result;
  };
  let initial = false;
  try {
    const settings = await api(endpoint + '/settings');
    const binding = (settings.bindings || []).find(b => b.name === 'RELAY');
    if (!binding || binding.type !== 'durable_object_namespace' || binding.class_name !== 'OpenDashRelay') throw new Error('An unrelated Worker already uses this name. Choose a different test name.');
  } catch (e) { if (e.status === 404) initial = true; else throw e; }
  const form = new FormData();
  form.set('metadata', new Blob([JSON.stringify(relayMetadata(publicOrigin, { initial }))], { type: 'application/json' }));
  form.set('relay-worker.mjs', new Blob([code], { type: 'application/javascript+module' }), 'relay-worker.mjs');
  const result = await api(endpoint, { method: 'PUT', body: form });
  return { ok: true, scriptName, initial, version: result.etag || null };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const argv = process.argv.slice(2), publicOrigin = argValue(argv, '--public-origin');
  if (!argv.includes('--apply')) {
    console.log(JSON.stringify({ dryRun: true, metadata: relayMetadata(publicOrigin, { initial: true }), next: 'Use --apply with CLOUDFLARE_API_TOKEN and --account-id. Attach the custom domain in Cloudflare after upload.' }, null, 2));
  } else {
    try {
      console.log(JSON.stringify(await deployRelay({ accountId: argValue(argv, '--account-id'), publicOrigin, scriptName: argValue(argv, '--script-name') || 'opendash-relay', token: process.env.CLOUDFLARE_API_TOKEN })));
    } catch (e) { console.error(e.message); process.exitCode = 1; }
  }
}
