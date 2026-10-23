// lib/sync/live/node-live.mjs - live sync for the dashboard server: the
// platform-agnostic manager (lib/sync/live/live.mjs) with the Node adapters
// (TCP, UDP announcements, port mapping through the router, interfaces).
//
// SANDBOX: a process started by the node test runner, or a data folder inside
// the system temp folder (every test, every demo), never listens beyond
// 127.0.0.1, never sends LAN announcements and never asks the router for a
// port mapping, whatever the options say, unless the caller passes its own
// adapters (tests pass fakes bound to 127.0.0.1).
//
// Turned off with DASHBOARD_LIVE_SYNC=off; DASHBOARD_LIVE_NAT=off keeps the
// router alone; DASHBOARD_LIVE_PORT picks the port (default 41731).

import { resolve, relative, sep, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import { createLive } from './live.mjs';
import { createPortMapper } from './nat.mjs';
import { createNodeNet, createNodeDiscovery, createNodeUdp, nodeHttp, nodeInterfaces, guessGateways, DEFAULT_PORT } from './node-net.mjs';
import { classifyAddress, plainAddress } from './addrbook.mjs';

function insideTmp(dir) {
  if (!dir) return false;
  const rel = relative(resolve(tmpdir()), resolve(dir));
  return !!rel && rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel);
}
/** Tests and throwaway data folders: loopback only, no router, no LAN announcements. */
export function isSandbox({ env = process.env, dataDir = null } = {}) {
  if (env.NODE_TEST_CONTEXT) return true;
  if (env === process.env && process.execArgv.some(a => a === '--test' || a.startsWith('--test-'))) return true;
  return insideTmp(dataDir);
}
const firstLan = (ifs) => { const i = ifs.find(x => x.family === 'IPv4' && !x.internal && classifyAddress(plainAddress(x.address)) === 'private'); return i ? i.address : null; };

/**
 * createNodeLive({engine, dataDir, log, canFetch, ...}) -> the live manager
 * (not started). Options: port, bind, net, discovery (adapter, or false),
 * nat (a port mapper, or false), interfaces, env, platform, and anything
 * createLive takes.
 */
export function createNodeLive({ engine, dataDir = null, env = process.env, platform = process.platform, log = () => {}, ...opts } = {}) {
  if (env.DASHBOARD_LIVE_SYNC === 'off') return null;
  const sandbox = isSandbox({ env, dataDir });
  const interfaces = opts.interfaces || (() => nodeInterfaces());
  let bind = opts.bind !== undefined ? opts.bind : null;
  if (sandbox && bind !== '127.0.0.1' && bind !== '::1') bind = '127.0.0.1';
  const port = opts.port !== undefined ? opts.port : (Number(env.DASHBOARD_LIVE_PORT) || (sandbox ? 0 : DEFAULT_PORT));
  let discovery = opts.discovery;
  if (discovery === undefined) discovery = sandbox ? null : createNodeDiscovery({ interfaces });
  if (discovery === false) discovery = null;
  let nat = opts.nat;
  if (nat === undefined) nat = sandbox || env.DASHBOARD_LIVE_NAT === 'off' ? null : createPortMapper({ udp: createNodeUdp(), http: nodeHttp, gateways: () => guessGateways(interfaces()), clientAddress: () => firstLan(interfaces()), log });
  if (nat === false) nat = null;
  const { interfaces: _i, bind: _b, port: _p, discovery: _d, nat: _n, net: _t, ...rest } = opts;
  return createLive({
    engine, net: opts.net || createNodeNet(), discovery, nat, interfaces, local: engine.localFiles,
    log, platform, port, bind, includeLoopback: sandbox, ...rest,
  });
}
