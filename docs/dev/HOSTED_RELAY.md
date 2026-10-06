# Shared browser Claude relay

This is an optional advanced connection, not the default Claude setup. The
default Link Claude flow uses local Claude Code with browser sign-in and has
no relay hosting cost. No public relay origin is included until its public
acceptance checks pass; deploying a Worker alone does not enable the app card.

The service operator deploys `cloudflare/relay-worker.mjs` once. Ordinary
OpenDash users need no Cloudflare account, domain, tunnel, Claude Desktop or
Microsoft app registration for this connection. Each local dashboard registers
its own random installation and makes outbound HTTPS requests only. Its generated
MCP URL is unique to that installation; OAuth grants cannot route to another one.

## Operator deployment

- Deploy the raw ES module using `tools/deploy-relay.mjs` or the Cloudflare REST
  API/dashboard. No npm packages, Wrangler or bundling are required.
- Exported Durable Object class: `OpenDashRelay`; binding: `RELAY`. The initial
  migration must use `new_sqlite_classes: ["OpenDashRelay"]` (SQLite-backed
  objects are available on Workers Free).
- Set the Worker variable `PUBLIC_ORIGIN` to its public HTTPS origin and attach
  that custom domain. Disable observability/Logpush and do not log requests or
  responses. Configure edge abuse protections and monitor the account quotas.
- Only after deployment and verification, publish `cloudflare/service.json` as
  `{ "publicOrigin": "https://your-public-relay.example" }` in the release.
  This is public project infrastructure configuration, with no account IDs,
  personal hostnames, tokens or secrets. Local operator testing may override it
  with `OPENDASH_RELAY_ORIGIN`; ordinary users do not set an environment variable.
- A service origin being configured does not prove deployment or connectivity.
  Link Claude reports network failure honestly. No automatic paid-plan upgrade
  is performed.

## User flow

1. Expand Advanced in Connections, or the browser-only option in setup, and
   choose **Link Claude**. OpenDash registers this installation and starts its
   outbound connector, then opens Claude's official install link with OpenDash
   and the generated MCP URL filled in.
2. Sign in to Claude, review the connector and confirm its connection. The
   install link fills in details; Claude still requires its own confirmation
   and consent. If sign-in drops the details, return and choose **Continue in
   Claude** again. Manual URL copying remains under troubleshooting.
3. The hosted sign-in page displays a matching code. Open Connections on this
   computer and approve that same code. Public requests cannot approve themselves.
4. Keep OpenDash running. Claude may read dashboard context and propose changes;
   applying changes still needs review and approval inside OpenDash.

The old individual tunnel gateway is optional advanced configuration, separate
from this shared service. It is not required for ordinary users.

## Security and data boundaries

- Installation secrets are random, generated on registration, and stored only
  in the local data folder's `secrets/hosted-relay.json` through locked atomic
  writes with private file mode where supported. The service stores their hashes.
  Secrets are never returned by the dashboard status API or included in logs.
- Each installation owns a separate Durable Object. OAuth clients, exact
  registered Claude redirect URIs, code state, PKCE S256 challenges and opaque
  hashed access/refresh grants are bound to its exact MCP resource URL. Codes
  expire in a minute after approval, authorization requests in ten minutes,
  access grants in an hour, and rotating refresh grants in thirty days.
- Local matching-code approval authenticates with the installation secret.
  An OAuth access token cannot call agent endpoints. The local dashboard API
  retains its localhost host/origin protections. No dashboard page or ordinary
  `/api` route is forwarded by the relay.
- MCP requests use the existing local `bridgeMcp` with mode `propose`. Reads
  require `opendash:read`; proposals additionally require `opendash:propose`.
  Direct apply and undo calls are refused by both relay and local connector.
- At most four requests are queued per installation, with a 45-second timeout,
  random response nonces and strict request/response IDs. Bodies and responses
  are capped at 256 KiB. Expired/revoked grants cannot receive queued results.
- RPC messages and responses are transient in-memory queue entries, not Durable
  Object database records. Persistent state contains registration/OAuth metadata
  and hashes, never task snapshots or query results. Cloudflare and Claude still
  process the requests and selected responses in transit: this is **not** a
  zero-knowledge or end-to-end encrypted relay. The whole data folder is never
  uploaded. The UI explains this before linking.
- Revoke removes Claude grants while keeping the local connector; Disconnect
  disables the hosted installation and clears its local secret. The main
  dashboard continues independently. Installation registration is rate limited
  globally and per hashed source IP; per-install endpoints are rate limited too.
  Unknown installation URLs create no persistent database records.
- Durable OAuth metadata is capped at 120 KiB, with at most twenty clients,
  twenty outstanding authorization codes and ten approval requests. Registered
  redirect URLs are at most 512 characters. A full code queue leaves its approved
  request available to retry when earlier codes expire.

## Quotas and current limits

The Node 20 connector uses short HTTPS polls, then waits ten seconds when idle
and 1.5 seconds while approval or work is pending. Idle Durable Objects do not
hold long-poll requests or timers. A later hibernatable WebSocket transport could
reduce request volume; this version prioritizes stdlib-only Node 20 compatibility.
Worker/DO request, row-write and active execution quotas still apply, including
MCP HTTP requests waiting for local responses. Workers Free is suitable for a
bounded pilot, **not a promise of unlimited always-on users**. Capacity planning
and an operator-approved paid plan may be necessary before broad rollout.

Synthetic tests cover the Worker, Durable Object storage and local connector
without public deployment or real user data:
`node --test tests/hosted-relay.test.mjs tests/security-release.test.mjs`.
Actual Cloudflare deployment and Claude consent remain separate acceptance checks.

Official references: [Claude custom connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp),
[Durable Object migrations](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/),
[SQLite storage](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/).
