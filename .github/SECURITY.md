# Security policy

OpenDash runs on your own computer and holds personal information: tasks,
people, calendar entries, email snippets and money. Security reports are taken
seriously and are always welcome.

## At a glance

- **Local-first.** No OpenDash server, no account, no analytics, no
  telemetry. Your data is one folder on your computer.
- **A local server that stays local.** It listens on `127.0.0.1` only, checks
  the Host, Origin and Sec-Fetch headers of every request, and serves a strict
  Content Security Policy with no inline scripts except the app's own, pinned
  by hash.
- **End-to-end encryption** for sync and friends, built on standard
  primitives from Web Crypto and Node: AES-256-GCM, X25519, Ed25519 and
  HKDF-SHA-256. The relay carries sealed data it cannot read.
- **Your own relay.** It runs on your own Cloudflare account. Every request to
  it is signed, and only your devices and the people you approve can use it.
- **Device-signed sync.** Each device signs its own records. Removing a device
  rotates the sync key, locks it out of Friends and renews the secret behind the
  optional emergency backup sheet.
- **Signed updates** (Ed25519), downloaded only from this project's GitHub
  releases.
- **A contained assistant.** No shell, no file tools, a fixed allow-list of
  OpenDash tools. It can do nearly everything in the dashboard, with Undo;
  anything sensitive (friends, devices, relay, sign-ins, money, updates) only
  as a proposal you approve on screen.
- **Untrusted content is escaped**: emails, invitations, bank memos, invites
  and friends' data.

## The review before launch

Before the public launch, OpenDash 2.19.7 was reviewed end to end in six
areas: the local server and its API, encryption and sync, the relay and
friends, untrusted content (the page and the parsers), the AI surfaces, and
the supply chain and release pipeline (including a scan of every commit in
the history for secrets and personal data).

The reviewers were six independent AI security reviewers (Claude agents, each
with one area, read access to the code and a sandbox with demo data for proof
scripts). It was a structured, evidence-based review, **not a paid audit by a
human security firm**, and OpenDash holds no certification.

Every finding was fixed in **2.20.0** (see the
[changelog](../docs/CHANGELOG.md)), except the two listed under
[Known limitations](#known-limitations) (installer code signing and
operating-system protection of local secrets). The main fixes:

- a `.env` file in a synced data folder can no longer choose programs, the
  update feed or Node options;
- updates are signed, and a planted update record cannot roll the app back;
- the markdown link renderer was rebuilt, and the page's policy no longer
  allows inline scripts;
- privileged local routes need a key that changes at every start;
- removing a friend always revokes their relay access, retried until
  confirmed; an invite gives only limited access until you approve the friend;
  old friend messages can't be replayed;
- sync records are signed by each device, and removing a device renews the
  backup-sheet secret and locks that device out of Friends;
- iCal feeds and bank memos can no longer stall the server.

The reviewers also recorded what held up. Among the parts they checked and
found sound: the bind address and the DNS-rebinding, CSRF and clickjacking
defences; path handling for every file the server reads; the encryption
primitives, the binding of each record to its device, file and position, and
the pairing and join-code protocols; request signing and invite handling on
the relay; the default-deny sharing rules for friends; the escaping of about
two thousand places where text reaches the page; the AI runner's disabled
tools and double-checked allow-lists; and the release workflows.

## Supported versions

| Version | Supported |
|---|---|
| The latest release (2.20.x) | Yes |
| Anything older | No: please update first |

Security fixes are released as a new version. To update, use Settings >
Updates, run the newer Windows installer, or replace the app folder and keep
your data folder (see [docs/INSTALL.md](../docs/INSTALL.md#updating)).

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
  switches;
- device sync and its encryption (`lib/sync/`), the relay and its protocol
  (`lib/relay/`, `cloudflare/worker.mjs`, docs/dev/RELAY_PROTOCOL.md), and
  Friends (`lib/friends/`): for example a relay or a friend that can read,
  forge or change what it carries, or a friend's packet that reaches Claude
  or an action;
- the updater (`lib/updater.mjs`) and the Windows installer (`installer/`).

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
  answers. The only exceptions are the sign-in return addresses (Google,
  Microsoft, banks) that a provider's redirect has to reach; each accepts only
  a sign-in this server started, with PKCE. The old Google callback without
  PKCE has been removed.
- **JSON only.** Request bodies must be `application/json` (`415` otherwise),
  so a plain HTML form on another site cannot post to it. Bodies have size
  limits (`413`), and stale writes are refused (`409`).
- **Strict responses.** A Content-Security-Policy (`default-src 'self'`;
  `script-src 'self'` plus the SHA-256 hash of each of the app's own inline
  scripts, so no other inline script, `on*=` handler or `javascript:` link can
  run; `connect-src 'self'`; images only from the page and two known avatar
  and bank-logo hosts; `object-src 'none'`, `base-uri 'none'`,
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
  It is compared in constant time.
- **The page key.** At every start the server makes a new random key and puts
  it into the page it serves. The page sends it with each request. Changes
  through `/api/actions` and the server controls (restart, stop, log, Windows
  integrations, shortcuts, installing an update) need that key or the local
  token: a matching `Origin` or `Sec-Fetch-Site` header on its own, which any
  local program can fake, is refused. After a restart an open tab picks up the
  new key by itself. This stops lazy or careless local programs; a program
  that loads the page itself can still read the key (see Known limitations).
- It also signs the confirm tokens that bulk and destructive changes need after
  a dry run.
- Treat it like a password. Anyone who can read your data folder could also
  change your data directly, so protect the folder itself.

### Your data and the network

- **No telemetry.** No analytics, tracking or crash reporting. Update checks
  happen only when you ask (or once a day if you turn that on), and are plain
  GET requests to GitHub releases.
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
  uses OpenDash's own MCP server in **propose mode**. Every tool sits in a
  safety tier enforced in code: reading is free; low-risk changes with Undo
  (garden, pet, profile, a short allow-list of settings, Home layout, a daily
  note) run directly; everything sensitive (friends, devices, relay, sign-ins,
  money rules, expenses, updates) never runs directly, only as a proposal you
  approve on screen. Other changes (tasks, people, tags and so on) are
  proposals too. Every change returns an undo token. Nothing a friend wrote
  reaches the model. Details: [docs/MCP.md](../docs/MCP.md#safety-tiers).
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

### Encryption, sync and friends

- **Primitives.** AES-256-GCM with random 96-bit nonces, X25519 key agreement,
  Ed25519 signatures and HKDF-SHA-256 with a separate label for each purpose,
  all from the platform's Web Crypto and Node's `crypto`. No home-made
  ciphers. All keys, nonces and codes come from `crypto.getRandomValues`.
- **Sync.** Each record is encrypted with a key only your devices hold, bound
  to its group, device, file and position, and signed by the device that
  wrote it. A new device gets the key only through pairing: a 4-letter code
  that is live for ten minutes, works once and allows three wrong tries, and
  the same picture on both screens that you check before pressing Yes.
  Removing a device rotates the key, renews the secret behind the emergency
  backup sheet and locks the device out of Friends from the server, without
  asking; the removed device can't read new data or rewrite old records. The
  optional backup sheet (10 words) is only for the day every computer is lost;
  an old sheet stops working once a computer is removed.
- **The relay** (on your own Cloudflare account) stores and forwards sealed
  data. Every request is signed with Ed25519 over the host, method, path, time,
  a nonce and the body's hash; unsigned and unknown callers are refused before
  any stored state is touched. Only you, your devices and friends you approve
  can use it. It learns metadata (that devices exist, when they write and how
  much), never content.
- **Friends.** Each friendship starts with a signed card (an invite link, or
  a 4-letter friend code that is live for ten minutes and works once). Both
  screens then show the same three pictures to check, and you approve it. Messages are sealed per friend, and old
  ones can't be replayed. What you share is built on your computer from named
  fields only, default deny, per friend.

### Synced data folders, updates and the remote connector

The data folder may sit in OneDrive, Dropbox or Google Drive, so OpenDash
assumes that someone who can write that folder (a shared folder, a stolen
cloud account, another computer) must still not be able to run programs on
yours.

- **`.env` files.** A `.env` file in the data folder may only set the sign-in
  app IDs (`OPENDASH_GOOGLE_CLIENT_ID`, `OPENDASH_GOOGLE_CLIENT_SECRET`,
  `OPENDASH_MICROSOFT_CLIENT_ID`). Anything that chooses a program, a feed or
  code (`CLAUDE_CLI_PATH`, `PATH`, `PYTHON`, `NODE_OPTIONS`,
  `DASHBOARD_UPDATE_FEED` and the rest) is ignored there, with a note in the
  server log. Put such settings in a `.env` in the app folder or in this
  computer's own OpenDash folder (Windows `%LOCALAPPDATA%\OpenDash\.env`, macOS
  `~/Library/Application Support/OpenDash/.env`, Linux
  `~/.local/state/opendash/.env`), which are never synced.
- **The Claude program.** `CLAUDE_CLI_PATH` must be the full path of a file
  called `claude` or `claude.exe`, outside the data folder (links are followed
  to check where they really lead). Scripts and network paths are refused.
- **Updates.** The update check only asks GitHub, and files are only
  downloaded from this project's GitHub release addresses. Each release's
  checksum file is signed with the project's Ed25519 release key; the public
  half is built into the app, and an unsigned or wrongly signed release is
  refused. The zip must then match its SHA-256. The last check is
  stored in the data folder, so before installing, OpenDash asks GitHub again
  and installs only the release GitHub names now: a planted file cannot make
  it install an older version.
- **The in-app assistant and expenses.** The assistant on this computer may
  file new expenses, attach receipt files and mark them submitted directly (with Undo); changing
  existing ones (bulk paid, unsubmit, delete) is a sensitive proposal you
  approve. A receipt path must be a
  file on a local disk: network (`\\host\share`, `//host`) and device
  (`\\?\`, `\\.\`) paths are refused, links are followed to their real
  target, and a preview never touches the disk.
- **The remote connector (Claude in your browser).** The public gateway only
  lets claude.ai read and propose changes; it can never write expenses or
  apply anything. New connections are accepted only within ten minutes of
  pressing **Connect Claude** in OpenDash. To approve one, you type the code
  shown in your own sign-in tab, and the request shows where it sends the
  sign-in and where it came from, so a request someone else started cannot be
  approved by mistake. Limits are per caller, unused registrations expire, and
  **Revoke browser access** removes every token and registered client.

### Known limitations

- OpenDash does not encrypt the data folder. Use your operating system's disk
  encryption, and think before putting the folder in a cloud-synced location.
- Any program running under your account can read the data folder and the
  local token, as with any desktop app.
- `127.0.0.1` keeps OpenDash off the network, but not away from **other
  accounts on the same computer**: anyone signed in to it at the same time
  (another user, a remote session, an SSH login) can reach the port and read
  or change what the page can. The page key (above) only raises the bar: a
  program that loads the page can read it. Do not run OpenDash on a
  computer you share with people you do not trust.
- Browser extensions that can read `localhost` pages can see what the page
  shows.
- The Content-Security-Policy still allows inline *styles*, because the app is
  a single self-contained file. Inline scripts are not allowed (only the app's
  own, by hash), and all user and external text is escaped.
- **The Windows installer is not code-signed yet**, so SmartScreen warns the
  first time. Each release publishes `SHA256SUMS-installer.txt` (signed, like
  the update files) to check your download against.
- **Secrets on your computer are plain files.** Sign-ins, bank keys and the
  sync and friends private keys live in this computer's private OpenDash
  folder, outside the data folder and never synced. They are not yet wrapped
  by the operating system (Windows DPAPI, macOS Keychain), so any program
  running as your account, or a copy of your user profile, can read them. Use
  disk encryption.
- Avatar images you set by URL are loaded by your browser from that address.
- Your friends relay (if you deployed one) has a public address: anyone can
  send it requests and use up its daily free-tier allowance (Cloudflare
  Workers Free), so it rests until midnight UTC. Unsigned requests, and
  requests signed by keys that are not the owner or a member, are refused
  before any stored data is touched, and each address is rate limited; data is
  never exposed or charged for. See docs/FRIENDS_GUIDE.md, "The free allowance".

## Keeping your install safe

- Download releases only from this repository's Releases page.
- Keep OpenDash on `127.0.0.1`; do not forward its port or put it behind a
  proxy.
- Keep the data folder private and out of any public repository.
- Review what your own Claude may do with OpenDash's MCP tools (Connections >
  OpenDash MCP offers a "read freely, ask before changes" permission set).
