// lib/friends/node-direct.mjs - the Node adapter of direct friend links
// (lib/friends/direct.mjs): TCP from lib/sync/live/node-net.mjs, this computer's
// interfaces. DASHBOARD_FRIENDS_DIRECT=off or DASHBOARD_LIVE_SYNC=off: none.
// A throwaway data folder (tests, tools/make-test-data) listens on loopback only.

import { createNodeNet, nodeInterfaces } from '../sync/live/node-net.mjs';
import { isSandbox } from '../sync/live/node-live.mjs';
import { endpointsFrom } from '../sync/live/addrbook.mjs';
import { createDirect, DIRECT_PORT } from './direct.mjs';

export function createNodeDirect({ dataDir = null, env = process.env, ...rest } = {}) {
  if (env.DASHBOARD_FRIENDS_DIRECT === 'off' || env.DASHBOARD_LIVE_SYNC === 'off') return null;
  const sandbox = isSandbox({ env, dataDir });
  return createDirect({
    net: createNodeNet({ maxConnections: 24 }), interfaces: () => nodeInterfaces(), endpointsFrom,
    port: sandbox ? 0 : (Number(env.DASHBOARD_FRIENDS_PORT) || DIRECT_PORT), bind: sandbox ? '127.0.0.1' : null,
    includeLoopback: sandbox, anyPort: sandbox, ...rest,
  });
}
