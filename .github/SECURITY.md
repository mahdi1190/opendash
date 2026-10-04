# Security policy

OpenDash runs on your own computer and holds personal information: tasks,
people, calendar entries, email snippets and money. Security reports are taken
seriously and are always welcome.

## Supported versions

| Version | Supported |
|---|---|
| 2.0.x (the latest release) | Yes |
| Anything older | No (there were no earlier public releases) |

Security fixes are released as a new version. To update, replace the app
folder and keep your data folder (see [docs/INSTALL.md](../docs/INSTALL.md#updating)).

## Reporting a vulnerability

**Please do not open a public issue, discussion or pull request for a security
problem.**

Report it privately through GitHub's private vulnerability reporting:

1. Go to the repository's **Security** tab.
2. Choose **Report a vulnerability**
   (<https://github.com/mahdi1190/opendash/security/advisories/new>).
3. Describe the problem: the OpenDash version (Settings > About), your
   operating system, Node version and browser, the steps or a small proof of
   concept, and what an attacker could do with it.

Use demo data (*Load demo data* in the welcome, or
`node tools/make-fake-data.mjs <folder>`) in anything you send. Never include
your own tasks, contacts, email, bank data, tokens or logs that contain them.

What to expect (this is a volunteer project, so these are goals, not
guarantees):

- an acknowledgement within 7 days;
- an assessment and, if confirmed, a fix in a new release with a GitHub
  security advisory;
- credit in the advisory if you would like it;
- coordinated disclosure: please give us up to 90 days before publishing
  details, or less once a fixed release is out.

## Scope

In scope:

- the local server and its API (`serve.mjs`, `server/`), including the checks
  described below;
- the page (`src/`), for example cross-site scripting through task titles,
  email subjects, calendar entries, file names or AI output;
- the MCP server (`mcp/`) and the actions layer it uses;
- the Claude runner (`lib/claude-runner.mjs`): a way to make a job use a tool
  outside its profile, or to make external text change data without your click;
- the iCal fetcher, data import and export, the Files & links opener and
  folder browser, the service worker, the supervisor and the Windows start-up
  switches.

Out of scope:

- attacks that need an already compromised user account, administrator rights
  or malware on the same computer (such a program can read the data folder
  directly);
- problems in Node.js, browsers, Claude Code, claude.ai connectors or
  third-party MCP servers (please report those upstream);
- exposing OpenDash to a network on purpose (port forwarding, a reverse proxy,
  a tunnel): it is not designed for that;
- denial of service by a local program, and social engineering.

## Threat model in brief

OpenDash is a single-user app. It trusts your operating-system account. It
does **not** trust web pages you visit, or the text that arrives in emails,
calendar invitations, bank transaction descriptions, files and notes. The
safeguards below follow from that, and are enforced in the code (mainly
`server/http.mjs`, `server/router.mjs`, `server/actions/auth.mjs` and
`lib/claude-runner.mjs`).

### The local server

- **Localhost only.** The server binds to `127.0.0.1`, never to all network
  interfaces. There is no remote-access feature.
- **Host check.** Every request must be addressed to `localhost:<port>` or
  `127.0.0.1:<port>`; anything else gets `421`. This blocks DNS-rebinding
  attacks from web pages.
- **Origin and Sec-Fetch checks.** Every `POST`, `PUT`, `PATCH` and `DELETE`,
  and every request under `/api/` (reads included), must come from OpenDash's
  own page or from a local program, judged by the `Origin` and
  `Sec-Fetch-Site` headers; a request from another site gets `403`. This
  blocks cross-site request forgery, and stops other sites from starting work
  through a read (a Claude run, a Google or weather fetch) or timing the
  answers. The one exception is the Google sign-in callback, which Google's
  redirect has to reach; it only accepts a sign-in this server started.
- **JSON only.** Request bodies must be `application/json` (`415` otherwise),
  so a plain HTML form on another site cannot post to it. Bodies have size
  limits (`413`), and stale writes are refused (`409`).
- **Strict responses.** A Content-Security-Policy (`default-src 'self'`,
  `connect-src 'self'`, `object-src 'none'`, `base-uri 'none'`,
  `frame-ancestors 'self'`), `X-Frame-Options: SAMEORIGIN`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` and
  `Cache-Control: no-store`.
- **Nothing else is served.** Only the app page (`index.html`), `/favicon.ico`
  and the fixed `/sw.js`. No file from the app folder or the data folder is
  ever served.

### The local token

- On first start OpenDash creates `<data>/local-token`: 32 random bytes,
  readable only by your account where the operating system supports it.
- Local programs that are not the page (the MCP server when OpenDash is
  running, `tools/actions-cli.mjs`, your scripts) must send it in the
  `X-Dashboard-Token` header to use `/api/actions`, `/api/query`,
  `/api/events`, `/api/mcp-info` and the server-control routes; otherwise `401`.
  It is compared in constant time. It guards against mistakes and stray
  scripts, not against another program on the computer: such a program can
  send the page's own `Origin` header instead (see Known limitations).
- It also signs the confirm tokens that bulk and destructive changes need after
  a dry run.
- Treat it like a password. Anyone who can read your data folder could also
  change your data directly, so protect the folder itself.

### Your data and the network

- **No telemetry.** No analytics, tracking, crash reporting or update checks.
- **Data stays local**, in one data folder (`data/` by default). Logs contain
  no task text, email content, names or money: request methods and URL paths,
  status codes, timings and counts, plus the data folder's location when the
  server starts. *Copy diagnostics* removes paths, email addresses and tokens.
- OpenDash only talks to the network for features you switch on. The full list
  is in [docs/PRIVACY.md](../docs/PRIVACY.md).

### Claude and connectors

- **Claude runs through your own Claude Code CLI** (`claude`), signed in to
  your own account. OpenDash never asks for, sees or stores a password, API
  key or connector token.
- **One runner, fixed profiles.** Every run uses an argument array with no
  shell, sends the prompt on standard input, allows only listed models and
  effort levels, and runs at most two at a time. Most jobs run with **no tools
  and no MCP servers at all**. Every job ignores your own Claude settings
  (permission rules, hooks, plugins and `CLAUDE.md` files) and starts in a
  folder only your account can write to. A run that tries a tool outside its
  profile is stopped (`POLICY`).
- **Prompt injection.** Text from email, calendars, banks, notes and files is
  passed as data, with instructions never to follow it. The in-app assistant
  uses OpenDash's own MCP server in **propose mode**: it can read and suggest
  changes, but it cannot apply anything. You see a preview and apply it with a
  click, and every change can be undone.
- **Connectors are MCP-based** (claude.ai connectors or MCP servers you added
  to Claude Code) and used **read-only**. Bank sync allows only the read-only
  bank tools and denies every other tool and connector. Calendar and Gmail jobs allow named
  read tools only; every other tool of that connector (Gmail's send, reply,
  forward and delete included) and every other claude.ai connector is denied
  by name as well. For a data source you add yourself, you confirm which tools
  it may use; tools whose names suggest writing, sending or deleting are
  locked, and the server is loaded on its own for each run. Items that do not
  appear in the raw tool results are dropped.

### Other safeguards

- **MCP server for your own Claude.** In full mode it can change data, but
  through the same validated operations as the page: ISO dates only, no
  duplicates, a dry run and confirm token for anything bulk or destructive, an
  undo token for every change, safe retries. `--mode propose` gives read
  access plus proposals only.
- **iCal links** are fetched over https only, without credentials, with size,
  time and redirect limits; private, loopback and link-local addresses are
  refused (checked on the address actually connected to).
- **Files & links** only opens items you saved, by absolute local path or
  http(s) link; network and device paths and `..` are refused, programs
  (installers and macOS app bundles included) are never launched, only
  revealed, judged by both the saved name and the real file it leads to (a
  link or a Windows short name cannot stand for a program; on macOS and Linux
  a file with an execute bit counts as a program whatever its name), and folder
  browsing cannot leave the saved folder.
- **Import and export.** OpenDash's own zip reader refuses `..`, absolute names
  and zip bombs; an import backs up your data folder first. *Export a clean
  copy of the app* never includes the data folder, logs, tokens or secrets.
- **Service worker.** Its only job is the offline page: it handles page loads
  of `/` and `/index.html` only, network first, and keeps a copy only of a
  page marked by OpenDash itself. It never touches `/api/*` and never stores
  your tasks or other data. The copy contains the public settings (your name, the email
  addresses you entered, locale), no paths or tokens. Turn it off in
  Settings > Server or with `?nosw`.
- **Supervisor.** It restarts the server after a crash with a growing delay and
  gives up after five crashes in a minute. Restart requests are rate-limited
  and run one at a time.
- **Windows start-up switches are opt-in** and off by default (Settings >
  Server). They change your account's settings only (no administrator rights),
  register one fixed command that never receives the contents of a link, do
  nothing if OpenDash is already running or was started in the last 20
  seconds, and remove exactly what they added when switched off. They are not
  offered on macOS or Linux.

### Known limitations

- OpenDash does not encrypt the data folder. Use your operating system's disk
  encryption, and think before putting the folder in a cloud-synced location.
- Any program running under your account can read the data folder and the
  local token, as with any desktop app.
- `127.0.0.1` keeps OpenDash off the network, but not away from **other
  accounts on the same computer**: anyone signed in to it at the same time
  (another user, a remote session, an SSH login) can reach the port and read
  or change what the page can. Only the actions, query, events and
  server-control routes ask for the local token. Do not run OpenDash on a
  computer you share with people you do not trust.
- Browser extensions that can read `localhost` pages can see what the page
  shows.
- The Content-Security-Policy allows inline scripts and styles because the app
  is a single self-contained file; all user and external text is escaped, and
  a test forbids inline event handlers.
- Avatar images you set by URL are loaded by your browser from that address.

## Keeping your install safe

- Download releases only from this repository's Releases page.
- Keep OpenDash on `127.0.0.1`; do not forward its port or put it behind a
  proxy.
- Keep the data folder private and out of any public repository.
- Review what your own Claude may do with OpenDash's MCP tools (Connections >
  OpenDash MCP offers a "read freely, ask before changes" permission set).
