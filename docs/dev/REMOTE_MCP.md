# Advanced: your own remote MCP gateway

For the shared OpenDash relay and the standard Link Claude button, see
[HOSTED_RELAY.md](HOSTED_RELAY.md). This guide is for operators who prefer
to run their own gateway and tunnel.

OpenDash can publish a separate, authenticated MCP endpoint through Cloudflare
Tunnel. The dashboard itself stays on localhost. This does not require Claude
Desktop. The computer running OpenDash and the tunnel must remain online.

The remote connection can read dashboard context and propose changes. Applying
those changes still requires approval inside OpenDash. It does not log Claude
Code in or give automatic local sync jobs access to the cloud Claude session.
Bank/email/calendar connectors are separate account authorizations.

## Set up

1. In Connections → Advanced → Personal remote MCP gateway, save a public HTTPS hostname under
   a domain managed by your Cloudflare account, then click Start gateway.
2. Create a Cloudflare Tunnel with that hostname routing to
   `http://127.0.0.1:4911`. Tunnel only the gateway port, never the dashboard port.
   A named tunnel gives a permanent address. A temporary random tunnel changes
   its address and requires reconnecting the connector.
3. In Claude → Settings → Connectors → Add custom connector, use the displayed
   `https://<hostname>/mcp` URL. Claude discovers OAuth automatically.
4. Match the sign-in page's code with the request in your local OpenDash
   Connections page, and approve. The sign-in tab continues automatically.
5. Ask Claude to describe today's dashboard tasks to verify the connection.

For a locally managed tunnel, Cloudflare's commands are:

```sh
cloudflared tunnel login
cloudflared tunnel create opendash
cloudflared tunnel route dns opendash <hostname>
```

Configure that tunnel with one ingress to `http://127.0.0.1:4911` and a final
`http_status:404` rule, then `cloudflared tunnel run opendash`. A remotely managed
tunnel can instead be configured through the Cloudflare dashboard.

Manual gateway start (also useful after reboot):

```sh
node mcp/remote-server.mjs --data-dir <your-data-folder> --public-origin https://<hostname>
```

## Authentication and limits

OAuth uses S256 PKCE, registered exact HTTPS callbacks at `claude.ai`, resource
binding, ten-minute local approval requests, single-use one-minute codes,
one-hour access tokens, and rotating thirty-day refresh tokens. Tokens are
stored as hashes in the data folder's `secrets/remote-mcp-auth.json`. Local
approval uses the ordinary dashboard's Host/origin checks. Public routes never
accept the dashboard's local token. Revoke browser access invalidates all
remote grants and pending approvals.

The gateway binds only to loopback. It serves MCP and OAuth discovery/consent;
it never proxies dashboard pages or `/api/` routes. It has bounded registration,
approval, request size, response size, execution time and concurrency limits.
It supports stateless Streamable HTTP JSON responses; SSE GET streams return
405. The existing stdio server remains unchanged for local AI clients.

References: [MCP authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization),
[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/),
[Claude custom connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).
