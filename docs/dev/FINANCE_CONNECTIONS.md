# Finance connections: design (Connections page redo, direct bank providers)

Status: design, 8 Oct 2026. Branch `finance-connections`. Nothing here is built yet.

User request (8 Oct): "redo the entire connections page: we have different
providers for financial MCPs/connectors. Aureli: you need an account and pay for
more than one account, but you can do these banks. And then all other banks,
such as Monzo, Plasma One etc. Try to do a one-click thing if possible."

Hard rules for every builder (on top of CLAUDE.md):

- **Read-only, always.** No provider module may contain a code path that can
  move money, create a payment, move money into or out of a pot, or sign a
  transaction. This is enforced by an allowlist HTTP client (section 3.3), not
  by good intentions. The tests try the forbidden calls.
- **Credentials stay on this computer**, in `<data>/secrets/fin/` (mode 0600,
  written with `lib/fsutil.mjs`). They are never in tracked files, never in the
  page (the page sees `configured: true` and nothing more), never in logs or
  error messages, and never in exports or app copies (`lib/sharing.mjs` already
  skips `secrets/`).
- **Never real credentials in development.** Every provider has a fake mode
  (section 3.7); tests and screenshots only use fakes. Never use the owner's
  tokens, client secrets, PEM keys or wallet addresses, and never port 4173.
- No personal data in files: no names, account numbers, balances or addresses
  in code, tests, fixtures or docs. Fixture wallet addresses are obviously fake
  (`0x00000000000000000000000000000000000000a1`).

---

## 0. What was checked (research, 7-8 Oct 2026)

| Topic | Finding | How sure |
|---|---|---|
| Monzo auth | `https://auth.monzo.com/?client_id&redirect_uri&response_type=code&state`; token `POST https://api.monzo.com/oauth2/token` (`authorization_code`, with `client_secret`); refresh with `grant_type=refresh_token`; "Refreshing is a one-time operation" (the old refresh token dies); `POST /oauth2/logout`. Only **confidential** clients get refresh tokens. "Your client may only have one active access token at a time, per user." Access token ~6 h (`expires_in: 21600`). No scopes. | docs.monzo.com, read 8 Oct |
| Monzo approval | The token has **no permissions** until the user approves in the Monzo app (PIN / fingerprint / Face ID). For 5 minutes after that the client can fetch all transactions; "after 5 minutes, it can only sync the last 90 days". | docs.monzo.com |
| Monzo endpoints | `GET /ping/whoami`, `GET /accounts` (`account_type=uk_retail|uk_retail_joint`), `GET /balance?account_id` (minor units, `spend_today`), `GET /pots?current_account_id`, `GET /transactions?account_id&since&before&limit<=100&expand[]=merchant`. 429 = rate limited (no number published). Personal use only: own account or "a small set of users you explicitly allow". | docs.monzo.com |
| Plasma chain | Chain id 9745 (testnet 9746), explorer plasmascan.to. USDT is **USDT0** at `0xB8CE59FC3717Ada4C02eadf9682A9e934F625ebb`, 6 decimals. | Verified live 8 Oct: Routescan `tokeninfo` and `tokentx` for chain 9745, and `eth_call` symbol/decimals on `https://rpc.plasma.to` |
| Routescan API | Etherscan-style: `https://api.routescan.io/v2/network/mainnet/evm/9745/etherscan/api?module=account&action=tokentx&...` works **without a key**. Free keyless 2 req/s, 10,000/day; free registered key 5 req/s, 100,000/day. | Verified live (keyless call) + routescan.io rate-limit page |
| Plasma One | Card issued by Rain; non-custodial embedded wallet (Privy). Card purchases are probably pulled on-chain at authorisation from the wallet (Privy's generic card docs), so they would show as USDT0 transfers to a settlement address **with no shop name**; some may net off-chain. Not confirmed by Plasma. Transfers we saw are often ERC-4337 `handleOps` (smart accounts), so the address the user pastes is the smart-account address. | Secondary sources; UI must say so honestly |
| Enable Banking | Base `https://api.enablebanking.com`. Every call carries a JWT, RS256, header `kid` = application id, claims `iss: enablebanking.com`, `aud: api.enablebanking.com`, `iat`, `exp` (max TTL 24 h). `GET /aspsps` (filter `country`, `psu_type`) returns per bank `maximum_consent_validity` in seconds (example 15552000 = 180 days), `beta`, `logo`, `auth_methods`. `POST /auth` {access.valid_until, aspsp{name,country}, state, redirect_url, psu_type} -> {url}; `POST /sessions` {code} -> session id + accounts; `GET /accounts/{uid}/balances`, `GET /accounts/{uid}/transactions?date_from&date_to&continuation_key`. Transaction fields: `entry_reference`, `transaction_amount{amount,currency}`, `credit_debit_indicator` CRDT/DBIT, `status` BOOK/PDNG, `booking_date`, `value_date`, `creditor`/`debtor.name`, `remittance_information[]`. Errors include `EXPIRED_SESSION`, `ASPSP_RATE_LIMIT_EXCEEDED`, `EXPIRED_AUTHORIZATION_CODE`. | enablebanking.com/docs/api/reference |
| Enable Banking restricted mode | A new production app is "Inactive"; "Activate by linking accounts" in the Control Panel makes it active in **restricted** mode: "you can only fetch data from accounts linked to the application", allowed for "individual non-commercial use", until a contract is signed. API authorisation is still needed after linking. Key: the Control Panel can generate it in the browser and downloads a **PEM** private key. Production redirect URLs must be **HTTPS** ("The URL does not have to be public"); sandbox allows HTTP. | Enable Banking docs + Firefly III guide |
| Enable Banking UK coverage | **Not confirmed.** Public material talks about ~2,500 banks in 29 European countries; no public page listing GB banks was found. The answer comes from `GET /aspsps?country=GB` once the user has an app, so the wizard checks this live (section 2.3). Still open after the build (8 Oct): the builder had no Enable Banking app of its own (no account may be created for this work), so nothing was read from `/aspsps`; `tools/eb-bank-snapshot.mjs` fills the bundled list the first time someone runs it with their own app (section 6). | Open question |
| Aureli (claude.ai Bank connector) | No public pricing or bank list found. The UI phrases it neutrally and links out; it states only what the user told us (an Aureli account is needed; more than one bank account is paid). | Neutral wording |
| Others | GoCardless Bank Account Data (Nordigen) closed to new signups; Plaid and Yapily free tiers are sandbox only. Not offered. | Research brief |

Sources: docs.monzo.com; enablebanking.com/docs/api/reference, /docs/api/linked-accounts, /docs/api/quick-start/alt;
docs.firefly-iii.org/tutorials/data-importer/eb; routescan.io/docs/plans-and-limits/rate-limits;
docs.chainstack.com (Plasma network setup); privy.io blog (Plasma One); thedefiant.io (Plasma One launch).

---

## 1. The new Connections page (finance)

### 1.1 Where it sits

The Connections page keeps its other groups (Claude, calendars, email, MCP
drawer). The old single **Bank** card (`CONNECTION_INFO` id `bank`) and the
bank part of Data sources (`SRC_CAPS` id `bank`) are replaced by one **Money**
block with two parts:

1. **Your accounts** (top, shown once anything is connected): every account
   from every provider in one list.
2. **Add a bank or wallet**: the provider chooser, three groups.

`#view=connections:money` scrolls to it; Finances' "Connect a bank" and the
Home Money widget's empty state link there. The gate (`connHas('bank')`) is
unchanged: a capability is available when one enabled, non-demo, non-CSV bank
source is healthy, so direct sources count automatically.

### 1.2 Provider chooser

Three groups, each a row of cards. Every card has the same six facts in the
same order, then one big primary button. Facts are short; "More" opens the
details in place.

**Group A: Via Claude (Aureli)**

| | |
|---|---|
| Covers | The banks Aureli supports (shown on Aureli's own sign-in). Balances and transactions. |
| Cost | Needs an Aureli account. One connected account is free; more need a paid Aureli plan (check Aureli's current pricing). Needs Claude Code signed in on this computer. |
| Limits | Synced through Claude, so each update uses a little of your Claude usage and takes a few minutes. |
| You'll need | Claude Code (Connections > Claude) and an Aureli login. |
| Time | About 3 minutes. |
| Button | **Connect in Claude** (existing `connCloudSignIn` flow, verified on return). When it already works: **Connected**, and its accounts appear in Your accounts. |

**Group B: Direct connections** (no Claude needed, no AI in the loop; faster
and free)

Card B1, **Plasma One** (wallet)

| | |
|---|---|
| Covers | Your Plasma One USDT balance and transfers in and out, from the public Plasma blockchain. |
| Cost | Free. |
| Limits | Card purchases show as "Plasma One payment" without the shop name, and some may not show one by one. Amounts are converted from USD at that day's rate. |
| You'll need | Your Plasma wallet address (starts with 0x). Never your recovery phrase or password: OpenDash will refuse them. |
| Time | 10 seconds. |
| Button | **Paste address** (opens a one-field sheet, see 2.1). |

Card B2, **Monzo**

| | |
|---|---|
| Covers | Every Monzo current and joint account, balances, pots (balances), all transactions with merchant names and Monzo's categories. |
| Cost | Free (Monzo's personal developer API). |
| Limits | Your own account only. For full history, approve in the Monzo app within 5 minutes of signing in; otherwise the last 90 days. |
| You'll need | Your Monzo app, and a free Monzo developer client (the wizard walks you through it). |
| Time | About 4 minutes. |
| Button | **Connect Monzo** (wizard, 2.2). |

Card B3, **Other UK and EU banks** (via Enable Banking)

| | |
|---|---|
| Covers | Banks Enable Banking supports in your country: use "Is my bank supported?" first. |
| Cost | Free for your own accounts (Enable Banking's restricted mode, personal non-commercial use). |
| Limits | Banks ask you to sign in again every 90-180 days (we remind you). Banks allow about 4 automatic updates a day. Only accounts you link yourself. |
| You'll need | A free Enable Banking account, about 10 minutes once, and your bank's app or login. |
| Time | About 10 minutes the first time, 1 minute per extra bank. |
| Button | **Check my bank** (lookup first, then the wizard, 2.3). |

A search box above group B ("Search your bank") filters all three B cards and,
once an Enable Banking app exists, the live bank list too: typing "Monzo"
highlights B2, "Plasma" B1, "Barclays" shows the Enable Banking result (or
"not available through Enable Banking yet: import a CSV").

**Group C: Import a file (CSV)**

| | |
|---|---|
| Covers | Any bank that lets you download a statement (CSV). |
| Cost | Free, no account, no connection. |
| Limits | Manual: import again to update. |
| You'll need | A CSV export from your bank's website or app. |
| Time | 1 minute. |
| Button | **Import a CSV** (the existing `POST /api/finance/import` picker, unchanged). |

Each card shows a status pill when relevant (Connected / Needs sign-in /
Re-authorise in N days / Not working) and a small "read-only" lock badge with
the tooltip "OpenDash can only read. It can never move money."

### 1.3 Your accounts (per-account list)

One row per account across all providers, grouped by provider (provider logo
and label as group header, with the provider's own actions: Sync now,
Re-authorise, Disconnect). Each row:

- colour swatch + name (inline **Rename**; the bank's name stays as the
  subtitle), kind (current, joint, pot, savings, wallet, card),
- last 4 / masked id only (`••••1234`, `0x12…ab34`), never a full number,
- balance (from the last sync) and **Last sync** ("12 min ago"; red after 3 days),
- **Re-auth due** (Enable Banking: "Sign in again by 14 Jan"; amber 14 days
  before, red 3 days before; Monzo: "Signed in" or "Needs sign-in"),
- **Show in Finances** switch (hide = `accounts[].enabled=false`; data kept),
- a "Possible duplicate of <other account>" note when the overlap check fires
  (3.6), with **Keep this one** / **Keep the other**,
- overflow menu: Rename, Colour, Hide, Disconnect this account (EB only;
  others disconnect per provider).

Disconnect (provider): confirm sheet "Stop syncing <provider>? Your past
transactions stay in Finances. OpenDash deletes its saved sign-in for
<provider>." Options: Keep past transactions (default) / Also remove them
(runs the existing per-account removal through the pipeline, with Undo).

Selection follows the page rules: re-clicking the open row does nothing,
the current row is `aria-current`, entrance animation once per entry.

---

## 2. Flows (as close to one click as each provider allows)

All flows run in a right-hand sheet (`11-ui-kit.js` drawer) with a step
header ("Step 2 of 4"), Back, Cancel, and state kept if the user closes and
reopens it during the same session. The sheet never shows a secret after it
was saved.

### 2.1 Plasma One: paste address, done

1. **Paste address** opens a sheet with one field (autofocus, and a Paste
   button that reads the clipboard on click) and one hint: "In Plasma One,
   open Receive and copy your address."
2. As soon as the field holds a valid address (`^0x[0-9a-fA-F]{40}$`,
   EIP-55 checksum checked when mixed case) the server is asked
   `POST /api/fin-connect/plasma/preview {address}` -> balance and count of
   transfers in the last 30 days ("N USD now, M transfers this month").
3. One button: **Add wallet**. It creates the source, runs the first sync
   (full history, no time limit on-chain) and closes with a toast
   "Plasma One added" + a link to Finances.

Guards: input that looks like a private key (64 hex, with or without 0x) or
a recovery phrase (12-24 lowercase words) is refused before it leaves the
page AND again on the server, with: "That looks like your secret recovery
phrase or key. Never paste it anywhere. OpenDash only needs your public
address." The field is cleared; nothing is logged. A contract address
(non-empty code via `eth_getCode`) is refused with "That is a token contract,
not your wallet".

Honesty text under the result: "Card purchases come from the blockchain, so
they show as 'Plasma One payment' without the shop name, and some may be
combined. Transfers show the other address; you can name addresses you
recognise."

### 2.2 Monzo: guided wizard

Step 1, **Make your Monzo key** (one time):
- Button **Open Monzo developers** (opens `https://developers.monzo.com/` in a
  new tab). The user signs in there with their email (Monzo emails a link and
  asks to approve in the app).
- A checklist with copy buttons for each field of "New OAuth Client":
  Name `OpenDash` (copy), Logo (leave empty), Redirect URL
  `http://localhost:<port>/api/fin-connect/monzo/callback` (copy; the real
  port), Description `Personal dashboard (read-only)` (copy),
  Confidentiality **Confidential** (bold: "needed so you stay signed in").
- Step 1 ends with two fields: **Client ID** (`oauth2client_...`) and
  **Client secret** (password field, never shown again). Save stores them in
  `<data>/secrets/fin/monzo-<sourceId>.json`.

Step 2, **Connect**: one button **Connect Monzo** -> browser goes to
`/api/fin-connect/monzo/connect` (302 to auth.monzo.com with `state`). The user
enters their email, taps the magic link Monzo sends, and is returned to
`/api/fin-connect/monzo/callback`, which exchanges the code and shows a small
page "Now approve in your Monzo app. Return to OpenDash." (auto-closes
the tab when it was opened by OpenDash).

Step 3, **Approve in your Monzo app now**: the sheet shows a 5:00
countdown ring (reduced motion: a plain number), the text "Open Monzo on your
phone and tap Allow access. Do it within 5 minutes to bring in your full
history.", and a live status from `GET /api/fin-connect/monzo/approval`:
- `waiting` (the server polls `GET /ping/whoami` + `GET /accounts` every 3 s;
  403 means not approved yet),
- `importing` the moment `/accounts` answers: the server immediately pages
  every account's transactions back to the account's creation date
  (`since` cursor, `limit=100`, `expand[]=merchant`) while the window is open,
  showing "Bringing in your history: 1,240 transactions, 2019 so far",
- `done` -> Step 4,
- `expired` (no approval in 5 min, or the import did not finish in time):
  "Monzo is connected, with the last 90 days. To bring in older history,
  press Get full history and approve within 5 minutes." The button reruns
  Step 2 with the same client.

Step 4, **Done**: accounts found (current, joint, pots) with Show in
Finances switches pre-set (pots on as balances only), then **Open
Finances**.

Re-authorisation: if a refresh fails (`invalid_grant`) or Monzo returns 401
with no refresh possible, the source goes to `auth` ("Monzo needs you to sign
in again") and the row offers **Sign in again**, which starts at Step 2 (the
client is kept).

### 2.3 Enable Banking: lookup, then a guided wizard

Step 0, **Is my bank supported?** (before any account is created):
- Country picker (default from `config.region`), search box.
- Before the user has an app we cannot call `/aspsps` (it needs a signed
  JWT). The lookup therefore uses a **bundled, dated snapshot**
  `src/app/56-fin-eb-banks.js` (`{asOf, countries:{GB:[names], ...}}`, names
  only) generated by the Enable Banking builder with a sandbox/production app
  of their own and refreshed per release (`tools/eb-bank-snapshot.mjs`, reads
  `/aspsps`, writes names + country + `beta` + max consent days only). If the
  snapshot has no GB entries (coverage unconfirmed, section 0), the lookup
  says so plainly and recommends CSV import. After setup the lookup switches
  to the live list.
- Results: "Supported: <bank> (sign in again every 180 days)", "In beta",
  or "Not available through Enable Banking. Use CSV import" with the C button.
  Monzo and Plasma One always point to B2 / B1 instead.
- Button **Set up Enable Banking** (only when supported).

Step 1, **Create your free Enable Banking app** (one time):
- **Open Enable Banking** (`https://enablebanking.com/sign-in/`), sign up with
  email.
- Checklist with copy buttons for "API applications > Add": Environment
  **Production**; Name `OpenDash`; Allowed redirect URL (the callback, 2.3.1);
  Description `Personal dashboard (read-only)`; keep "Generate in the
  browser". Submitting downloads a `.pem` file.
- **Upload the .pem file** (file picker / drop; read in the page as text,
  max 16 KB, must be a PEM private key block (PKCS#8 or PKCS#1 RSA header,
  checked on the server) + **Application ID** (UUID). Save -> the server signs one JWT and
  calls `GET /application`; success shows "App found: restricted mode,
  inactive|active". The PEM lives only in `<data>/secrets/fin/eb-app.json`.
- If inactive: "In the Enable Banking Control Panel, press **Activate by
  linking accounts** and link the bank you want. Come back here when done."
  with a **Check again** button.

Step 2, **Choose your bank**: the live `/aspsps?country=` list with search
and logos (logos are drawn from Enable Banking's URL only via `img-src https:`;
fallback initials). Personal / business switch when the bank offers both.

Step 3, **Sign in to your bank**: **Continue to <bank>** -> `POST
/api/fin-connect/eb/start` -> `{url}`; the browser opens it, the user signs in
at the bank (usually app approval), and returns through the callback. The
sheet waits ("Waiting for <bank>...") and finishes with the accounts list
(as Monzo Step 4). `access.valid_until` = now + the bank's
`maximum_consent_validity` (capped at 180 days); the due date shows in the
row.

Step 2 and 3 repeat for each extra bank ("Add another bank" in the EB group
header): one app, many sessions.

#### 2.3.1 The HTTPS redirect problem and the one-click answer

Production apps need an HTTPS redirect; OpenDash serves plain HTTP on
127.0.0.1. Two ways, both built:

- **A. Bounce page (default once verified).** A static file
  `docs/eb-callback.html` in this repo, published with GitHub Pages at
  `https://mahdi1190.github.io/opendash/eb-callback.html` (the owner enables
  Pages; builders never push). It has no network calls, no analytics; it
  reads `code`, `state`, `error` from its own query string and does
  `location.replace('http://localhost:' + port + '/api/fin-connect/eb/callback?' + query)`,
  where `port` comes from the first segment of `state`
  (`state = <port>.<random 32 bytes base64url>`; the port is validated as
  1024-65535). The code is single-use, expires in minutes and is useless
  without the user's PEM key, so passing through a static page is acceptable;
  the page sets `Referrer-Policy: no-referrer` via meta and replaces history.
  Verification gate before it becomes the default: the EB builder checks that
  Chrome, Edge and Firefox follow an https -> `http://localhost` top-level
  navigation without a block page (localhost is a "potentially trustworthy"
  origin), using the fake mode and a local HTTPS test server, never the
  real Pages URL with real codes.
- **B. Paste the address (always available).** Redirect URL
  `https://localhost/opendash-eb-callback` (not served by anything). After the
  bank, the browser shows "This site can't be reached"; the sheet says "Copy
  the whole address from that tab and paste it here", one field, the server
  takes `code` and `state` from it (`POST /api/fin-connect/eb/finish
  {url}`). Only `https://localhost/opendash-eb-callback?...` is accepted.

The wizard picks A when `config.finance.ebRedirect === 'bounce'` (default
after the gate passes) and B otherwise; Step 1's checklist shows the matching
redirect URL. Both URLs can be registered at once, so switching is free.

---

## 3. Server architecture

### 3.1 Source model

New source kind `direct` in `lib/sources.mjs` (`KINDS` gains `'direct'`):

```
{ id: 'bank-monzo-1a2b', capability: 'bank', kind: 'direct',
  provider: 'monzo' | 'plasma' | 'enable-banking',
  label, colour, enabled, accounts: [{id, name, colour, enabled, own, renamed,
    kind?, mask?, hiddenReason?}],
  lastSync, lastError, createdAt,
  reauthDue?: 'YYYY-MM-DD',          // EB consent end, Monzo when known
  health computed by the provider }
```

Rules: `validateSource` accepts `kind:'direct'` only for `capability:'bank'`
and a known `provider`; one Monzo source per Monzo user id, one Plasma source
per address (the address itself is not in sources.json: the source stores a
hash `addrHash`, the address lives in secrets), one EB source per EB session.
Account ids are the provider's ids when they match `^[A-Za-z0-9_-]{1,64}$`
(Monzo `acc_...`, EB uids), else a hash (`w-<12 hex>` for wallets). Rows go
into the store with account `'<sourceId>.<accountId>'`, exactly like generic
MCP banks, so `accountsMeta`, chips, balances and transfers work unchanged.

### 3.2 Provider interface (`lib/fin-connect/`)

```
// lib/fin-connect/provider.mjs (JSDoc contract; each provider default-exports one)
export interface FinProvider {
  id: 'monzo' | 'plasma' | 'enable-banking';
  readOnly: true;
  allow: AllowRule[];                         // section 3.3
  status(ctx, source) -> {configured, connected, needsAuth, reauthDue, message}
  connect(ctx, input) -> {redirect} | {source}        // start (Plasma: done)
  callback(ctx, query) -> {source, next}              // OAuth/EB return
  refresh(ctx, source) -> void                         // tokens / sessions
  listAccounts(ctx, source) -> [{id, name, kind, mask, currency}]
  fetch(ctx, source, {from, to, cursor, accountOn}) ->
     {rows: RawTx[], balances: [{accountId, balance, currency, asOf}],
      accounts, cursor, warning?}
  normalise(raw, ctx) -> {row} | {reason}             // into the finance row
  disconnect(ctx, source) -> void                      // revoke where possible, delete secrets
}
```

`ctx` = `{dataDir, secrets, http, now, log, fx, fake}`. `lib/fin-connect/index.mjs`
holds the registry (`providers.get(id)`), `finConnectFor(dataDir)` (one
service per data folder, like `microsoftFor`), and the glue:

- `fetchDirect(source, opts)` is what `server/routes/finance.mjs`'s
  `fetchSource` hook calls for `kind === 'direct'` (one line change there,
  plus `lib/finance.mjs` line ~643: `others` accepts `x.kind === 'direct'`).
  It returns the same shape as `fetchFromSource`: `{rows, accounts,
  balances, rejected}` with rows `{accountId, date, pence, memo, bc, sub}`.
- **Incremental fetch**: per account cursor in
  `<data>/finance/_system/connectors/<sourceId>.json` (not secret: last
  date, last provider id / block number, last full sync). A normal update
  fetches from `cursor.date - 35 days` (same overlap as the Aureli job; the
  pipeline drops rows it already has by its key), a first import everything
  the provider allows (Monzo: inside the 5-minute window only; EB: the bank's
  history, usually 90 days to 2 years; Plasma: from the first transfer).
- **Normalise** (`lib/fin-connect/normalise.mjs`, shared): ISO date in the
  user's time zone; `pence` integer, sign from the provider's direction
  field, never from text; memo cleaned like `lib/finance.mjs cleanText`
  (control/bidi chars, 200 chars, leading `=+@` stripped); `bc` from the
  provider category through a small map (Monzo `groceries` -> `Groceries`,
  `transfers` -> `Transfers`, ...); pending/declined rows dropped (Monzo
  `decline_reason` or empty `settled`; EB `PDNG`); non-home currency
  converted (3.5) with the original kept in the memo
  (`"... (<amount> USD @ <rate>)"`).
- **Provider specifics**:
  - Monzo: memo = `merchant.name` else `counterparty.name` else
    `description`; pot moves (`description` starting `pot_` or
    `metadata.pot_id`) get `sub:'FT'` and `bc:'Transfers'` so they are not
    spending; pots are listed as accounts with balance only (no
    transactions of their own).
  - EB: amount from `transaction_amount`, sign from
    `credit_debit_indicator`; memo = counterparty name else joined
    `remittance_information`; id = `entry_reference` (per account, not global).
  - Plasma: `tokentx` for the address and the USDT0 contract, `startblock`
    cursor, `sort=asc`, `offset=1000` pages; value / 10^6; direction from
    `to`/`from` vs the address; memo "Plasma transfer to 0x12…ab34", or
    the user's own name for that address (`<data>/finance/_system/
    connectors/<id>.json names{}`, set from the transaction drawer), or
    "Plasma One card" for addresses on a small, documented list the Plasma
    builder confirms from fake fixtures and public explorer labels (never
    from the owner's data). Balance = `tokenbalance` (Routescan) with
    `eth_call balanceOf` on `rpc.plasma.to` as the fallback. Gas is
    sponsored for USDT0 on Plasma; XPL balance is ignored in v1.
- **Dedupe across providers** (`lib/fin-connect/overlap.mjs`): after the first
  sync of a new direct account, compare its last 60 days with every other
  enabled account using `crossAccountOverlap` (lib/finance/pipeline.mjs,
  date + amount). Over 60% match -> both rows get the "Possible duplicate"
  note and the NEW account starts hidden (`enabled:false`,
  `hiddenReason:'duplicate'`), so Monzo via Aureli plus Monzo direct never
  double-counts. The user's choice wins and is remembered. Within one
  provider, rows dedupe by provider id; across days, by the pipeline key.
  Own transfers across providers (Monzo -> Plasma top-up) use the existing
  `matchOwnTransfers`; converted amounts get a 2% tolerance there behind a
  flag set only for rows with an FX note.
- **Re-auth reminders**: `status()` returns `reauthDue`; the service stores it
  on the source. Connections shows it per row; a Home suggestion
  (`68-suggest-rules-*` pattern) and a Finances banner appear 14 days before
  (EB) and at once when `needsAuth`. No email, no OS notification unless the
  user's existing notification settings allow "before" reminders.
- **Rate limits**: Monzo: one update at a time, back off on 429 (respect
  `Retry-After`, max 3 tries). EB: at most 4 automatic updates per account
  per day (PSD2 unattended limit), manual "Sync now" always allowed but
  stops on `ASPSP_RATE_LIMIT_EXCEEDED` with a clear message. Plasma: a token
  bucket at 2 req/s keyless (5 with a user key, Settings > Finances >
  Plasma API key, optional).

### 3.3 Read-only by construction: the allowlist HTTP client

`lib/fin-connect/http.mjs` `readOnlyClient(provider.allow, {fetchFn})`: every
request is checked against the provider's list BEFORE it is sent; anything
else throws `POLICY` and is logged as `fin-connect policy <provider> <method>`
(no URL query, no body). `redirect: 'error'`, 20 s timeout, 5 MB cap, JSON
only, https only (the one exception: the fake servers on 127.0.0.1 in fake
mode).

| Provider | Allowed (method, host, path) | Never (tested) |
|---|---|---|
| Monzo | POST `api.monzo.com /oauth2/token`, POST `/oauth2/logout`; GET `/ping/whoami`, `/accounts`, `/balance`, `/pots`, `/transactions`, `/transactions/{id}` | PUT `/pots/*/deposit`, `/pots/*/withdraw`, POST `/feed`, PATCH `/transactions/*`, `/attachment/*`, `/receipts`, `/webhooks` |
| Enable Banking | GET `/application`, `/aspsps`, `/sessions/{id}`, `/accounts/{uid}/details`, `/balances`, `/transactions`; POST `/auth`, `/sessions`; DELETE `/sessions/{id}` | anything under `/payments`, POST `/accounts/*` |
| Plasma | GET `api.routescan.io /v2/network/mainnet/evm/9745/etherscan/api` with `module=account&action=tokentx|tokenbalance` or `module=token&action=tokeninfo`; POST `rpc.plasma.to` with JSON-RPC method in {`eth_call` (to = USDT0, data = `balanceOf` selector `0x70a08231` only), `eth_getCode`, `eth_chainId`} | `eth_sendRawTransaction`, `eth_sendTransaction`, any signing method, any other host |

EB requests are signed with the user's PEM only for these paths; the JWT
lives 1 hour, is never logged and never leaves the server.

### 3.4 Local secret storage (`lib/fin-connect/secrets.mjs`)

- Folder `<data>/secrets/fin/`, files `monzo-<sourceId>.json`
  (`{clientId, clientSecret, accessToken, refreshToken, expiresAt, userId}`),
  `eb-app.json` (`{appId, pem}`), `eb-<sourceId>.json` (`{sessionId,
  validUntil, aspsp}`), `plasma-<sourceId>.json` (`{address}`),
  `plasma-key.json` (optional Routescan key).
- `writeJson(..., {mode: 0o600})` under `withLock`; reads tolerate a missing
  file (`null`) but never treat an unreadable one as empty (strict mode).
- Monzo refresh is one-time: refresh under the file lock, write the new pair
  BEFORE using the new access token; a crash between refresh and write is
  the only way to lose the session and leads to "Sign in again", never to a
  silent failure loop.
- Disconnect deletes the file (Monzo: `/oauth2/logout` first; EB: `DELETE
  /sessions/{id}`), then marks the source removed.
- The page never receives secrets: status objects carry `configured`,
  `connected`, masked ids (`oauth2client_••••7f3a`, `0x12…ab34`) only.
- Logs: provider, op, ms, counts and error codes. Never tokens, ids,
  addresses, amounts, memos or URLs with query strings.
  `tests/fin-connect-security.test.mjs` greps the log after a fake run.

### 3.5 Currency

The finance store has one currency (`APP_CONFIG` / `currencyCode()`).
Non-home amounts (Plasma USDT0 = USD; EB accounts in EUR) are converted with
`lib/travel-rates.mjs` extended by one function `rateOn(from, to, date)`
(Frankfurter historical endpoint, cached per pair and day in
`<data>/travel/`; sends only two currency codes and a date). When no rate is
available the row is held back (counted in the warning "12 transactions
wait for an exchange rate") rather than guessed. If the home currency is
USD, Plasma rows need no conversion.

### 3.6 Routes (`server/routes/fin-connect.mjs`)

All under `/api/fin-connect/`. The router already applies the Host check
(421), same-origin on every `/api/` read and every mutation (403), JSON
content type (415) and body limits (413). Bodies use `SMALL_BODY` (the PEM
is under 16 KB). Only the two OAuth return routes are `crossSite: true`
(GET, state-protected, one-use state, 10 min expiry, max 20 pending).

| Route | Purpose |
|---|---|
| GET `providers` | catalogue + per-provider status (no secrets) |
| GET `accounts` | the per-account list (1.3) |
| PATCH `accounts/:key` `{name?, colour?, enabled?, keep?}` | rename, hide, duplicate choice (writes sources.json via `mutateSources`) |
| POST `plasma/preview` `{address}` | balance + 30-day count, nothing saved |
| POST `plasma` `{address, label?}` | create + first sync |
| PUT `monzo/client` `{clientId, clientSecret, sourceId?}` | save the client |
| GET `monzo/connect?source=` (`sameOrigin: true`) | 302 to Monzo |
| GET `monzo/callback` (`crossSite: true`) | code exchange, start approval polling |
| GET `monzo/approval?source=` | `{state: waiting|importing|done|expired, secondsLeft, imported, earliest}` |
| PUT `eb/app` `{appId, pem}` | save + test the app |
| GET `eb/banks?country=&q=` | live `/aspsps` (cached 24 h) or the bundled snapshot |
| POST `eb/start` `{bank, country, psuType}` | `{url}` |
| GET `eb/callback` (`crossSite: true`) | bounce-page return |
| POST `eb/finish` `{url}` | paste-the-address return |
| POST `sources/:id/sync` | runs the normal finance update for that source only (`startFinanceUpdate({bank:true, only:[id]})`) |
| POST `sources/:id/disconnect` `{removeData?}` | revoke, delete secrets, keep or remove rows |
| POST `fake` (fake mode only) | change fake behaviour at run time, like `/api/calendar/fake` |

Every handler maps provider errors to typed codes: `NOT_CONFIGURED`,
`AUTH` (needs sign-in), `CONSENT_EXPIRED`, `NOT_APPROVED` (Monzo app),
`RATE_LIMITED`, `NETWORK`, `BAD_RESPONSE`, `POLICY`, `NOT_SUPPORTED` (bank
not on EB), `SECRET_REFUSED` (seed phrase / key pasted). Messages are plain
English and never echo input.

### 3.7 Fake modes

Same pattern as `DASHBOARD_CALENDAR_FAKE`: env flags, a `_DELAY_MS`, a
`_FAIL` list, and `POST /api/fin-connect/fake` to change them at run time.

| Flag | Fake |
|---|---|
| `DASHBOARD_MONZO_FAKE=1` | in-process fake Monzo (`tests/fixtures/fin-fake-monzo.mjs`): `/api/fin-connect/fake/monzo/authorize` instantly redirects to the callback; approval arrives after `DASHBOARD_MONZO_FAKE_APPROVE_MS` (default 4000; `never` to test expiry); the 5-minute window shrinks to `DASHBOARD_MONZO_FAKE_WINDOW_MS`; 2 accounts, 3 pots, ~800 synthetic transactions over 3 years |
| `DASHBOARD_PLASMA_FAKE=1` | fake Routescan + RPC: fixed fake addresses map to synthetic histories (one active, one empty, one contract) |
| `DASHBOARD_ENABLEBANKING_FAKE=1` | fake EB API: verifies the JWT against a test key generated at test start (never committed), fake bank list for GB/FI/DE incl. a beta bank, `/auth` returns the local fake bank page that redirects back with a code; consent validity from the fake bank |
| `..._FAKE_FAIL` | `auth`, `consent`, `rate`, `network`, `bad`, `rate:0.3` (random share) |
| `..._FAKE_DELAY_MS` | latency per call (default 300) |

Fake data is generated (seeded PRNG), with merchant names from a neutral
list, never from the owner's data. `tools/make-test-data.mjs` gains
`--fin-fake` to write fake direct sources into a test data folder.

---

## 4. Builders, files and ownership

Four builders. Contract first: the provider interface (3.2), the route table
(3.6) and the status/account JSON shapes in this file are frozen for the
build; a change needs a note here and a message to the other builders.

### Builder 1: UI (Connections > Money, wizards, Finances links)

Owns:
- `src/app/56-fin-connect.js` (Money block: Your accounts list, chooser,
  search, status pills, re-auth badges, disconnect sheet; `FinConnectStore`
  loading `/api/fin-connect/providers` and `/accounts`)
- `src/app/56-fin-connect-wizards.js` (the sheet shell + the Plasma sheet, the
  Monzo wizard with the countdown, the EB lookup + wizard, paste-address step)
- `src/app/56-fin-eb-banks.js` (the bundled snapshot file: format by UI,
  content generated by Builder 4's tool)
- `src/styles/56-fin-connect.css`
- edits: `56-connections.js` (remove the Bank card from `CONNECTION_INFO`,
  mount the Money block, `#view=connections:money`), `56-sources.js` (bank
  capability hands over to the Money block; calendars and email unchanged),
  `56-connections-brands.js` (Monzo, Plasma, Enable Banking, Aureli marks:
  simple drawn marks, not copied logos), Finances' empty state and Home
  money widget link (one line each, coordinate with the Finance owner)
- tests: `tests/fin-connect-ui.test.mjs` (pure helpers: masking, due-date
  colour, address/seed checks in the page, chooser filter), extend
  `tests/connections-page.test.mjs`
- MODULES.md rows for the page files.
UI rules: tokens only, `esc()` everything, `selectList()` not needed (single
choices), reduced motion for the countdown, phone layout (cards stack, sheet
full screen).

### Builder 2: Monzo + core

Owns the shared core (lands first, within the first session, so the others
build on it):
- `lib/fin-connect/index.mjs` (registry, `finConnectFor`, `fetchDirect`,
  cursors, re-auth bookkeeping), `provider.mjs` (JSDoc contract),
  `http.mjs` (allowlist client), `secrets.mjs`, `normalise.mjs`,
  `overlap.mjs`
- `server/routes/fin-connect.mjs` (all routes; providers add their handlers
  through `provider.routes?(app, ctx)` so Builders 3 and 4 do not edit this
  file beyond one import line each)
- edits: `lib/sources.mjs` (`KINDS` + `direct` validation + health from
  `provider.status`), `lib/finance.mjs` (`others` filter, `only:[id]`
  option), `server/routes/finance.mjs` (`fetchSource` dispatch),
  `lib/travel-rates.mjs` (`rateOn`, coordinate with TRIPS)
- `lib/fin-connect/monzo.mjs`, `tests/fixtures/fin-fake-monzo.mjs`
- tests: `tests/fin-connect-core.test.mjs`, `tests/fin-connect-monzo.test.mjs`,
  `tests/fin-connect-security.test.mjs` (shared; others add cases)
- MODULES.md "Finance connections" section (server side), CLAUDE.md
  safeguard line ("finance connectors: allowlist client, read-only").

### Builder 3: Plasma One

- `lib/fin-connect/plasma.mjs` (address checks incl. EIP-55 via a small
  keccak-256 in pure JS, seed/key refusal, Routescan + RPC reads, cursor by
  block, USD conversion through `rateOn`, address names)
- `tests/fixtures/fin-fake-plasma.mjs`, `tests/fin-connect-plasma.test.mjs`
- the "Plasma One card" counterparty list (`lib/fin-connect/plasma-labels.json`,
  public explorer labels only, each with its source URL), or an empty list
  and the honest generic text if nothing public is found
- optional Routescan key setting (server side; UI field by Builder 1)

### Builder 4: Enable Banking

- `lib/fin-connect/enable-banking.mjs` (RS256 JWT with `node:crypto`
  `createSign('RSA-SHA256')`, PEM checks, `/application`, `/aspsps` cache,
  `/auth`, `/sessions`, balances, transactions with `continuation_key`,
  consent dates, 4-a-day budget, `EXPIRED_SESSION` -> needs auth)
- `docs/eb-callback.html` (the bounce page, 2.3.1) and its verification notes
- `tools/eb-bank-snapshot.mjs` (writes `src/app/56-fin-eb-banks.js` from a
  builder's own app or the fake; names, country, beta, consent days only)
- `tests/fixtures/fin-fake-enablebanking.mjs`, `tests/fin-connect-eb.test.mjs`
- the answer to "UK coverage": record what `/aspsps?country=GB` returns for
  the builder's own sandbox app in this file (counts, not personal data)

Shared touch points (coordinate in this order: Builder 2 first, then 3 and 4
in parallel, Builder 1 throughout against fakes): `lib/sources.mjs`,
`lib/finance.mjs`, `server/routes/finance.mjs`, `MODULES.md`. Nobody else
edits them.

### Integration test plan

Unit (each builder, `node --test`):
1. Normalise: sign from direction field only; pending/declined dropped; memo
   cleaning; formula prefixes stripped; minor units exact; FX note format.
2. Allowlist: every "Never" row in 3.3 throws `POLICY` before any fetch is
   made (the fake `fetchFn` asserts it was never called).
3. Secrets: files written 0600 in `secrets/fin/`; `GET providers` and
   `GET accounts` bodies contain no secret, token, PEM line or full address
   (searched by value); log contains none either.
4. Plasma: valid/invalid/checksummed addresses; seed phrase, 64-hex key and
   contract address refused; paging by block; empty wallet.
5. Monzo: state mismatch aborts; approval waiting -> importing -> done;
   window expiry -> 90-day mode and message; one-time refresh written before
   use; 401 -> needs auth; 429 back-off.
6. EB: JWT header/claims/TTL; PEM rejected when malformed; consent date from
   `maximum_consent_validity`; continuation paging; 4-a-day budget;
   `EXPIRED_SESSION` -> needs auth with due date shown; bounce-page state
   carries a valid port only; paste-finish accepts only the registered URL.

Integration (`tests/fin-connect-integration.test.mjs`, Builder 2 owns, all
builders add cases): start `serve.mjs` on a free port with a temp data folder
from `tools/make-test-data.mjs --fin-fake` and all three `_FAKE` flags:
1. Connect Plasma (preview, add) -> finance update -> rows in
   `transactions.csv` with `<sourceId>.<accountId>` and GBP amounts with FX
   notes; balance in balances.
2. Monzo wizard through the routes (client, connect, fake authorize,
   callback, approval polling) -> full history imported; a second update
   only fetches the overlap window (fake counts calls).
3. EB: app upload (test key), banks list, start, fake bank, callback (both A
   and B returns) -> accounts and rows.
4. Cross-provider duplicate: a fake Aureli-style generic MCP source
   (`tests/fixtures/fake-claude-source.mjs`) with the same Monzo rows -> the
   new direct account starts hidden with the duplicate note; Finances totals
   count each payment once.
5. Rename, hide, disconnect (keep data / remove data with Undo).
6. Security: cross-origin POST/PUT/PATCH -> 403, wrong Host -> 421, non-JSON
   -> 415, oversize PEM -> 413, callback with unknown/expired/reused state ->
   400, every route under `/api/fin-connect/` refused cross-site except the
   two callbacks.
7. Failure modes via `/api/fin-connect/fake`: auth, consent, rate, network
   -> right status pill, right message, other providers still sync.

Browser check (Builder 1, own port, fakes on): Connections light/dark,
desktop/phone; every wizard end to end; countdown with reduced motion;
re-select is a no-op; no console errors; Finances shows the new accounts as
chips.

Not in scope for v1: writing anything to a bank, Monzo feed items or
receipts, XPL/other tokens on Plasma, other chains, Plaid/Yapily/GoCardless,
a hosted relay for EB.

---

## 5. Build notes: Plasma One (Builder 3, 8 Oct)

Built in `lib/fin-connect/plasma.mjs` (+ `keccak.mjs`, `plasma-labels.json`),
`tests/fixtures/fin-fake-plasma.mjs`, `tests/fin-connect-plasma.test.mjs`,
`tests/fin-connect-plasma-server.test.mjs`. Changes against the design above:

- **Token contracts are told apart with Routescan `tokeninfo`, not `eth_getCode`.**
  Plasma One wallets are ERC-4337 smart accounts, so they HAVE code: refusing
  any address with code would refuse every real Plasma One wallet. `eth_getCode`
  is still called, only to report `smartAccount` in the preview.
- **Memo wording**: `Plasma One payment · 0x12…ab34` (money out) and
  `Plasma One received · 0x12…ab34` (money in), not "Plasma transfer to …":
  the finance merchant cleaner (`cleanMerchant`) drops the address tokens and
  keeps one merchant ("Plasma One Payment") instead of one per address. Named
  addresses (`PUT /api/fin-connect/plasma/names`, kept in the source's cursor,
  by full or short address) replace the memo for new rows.
- **Tokens**: USDT0 (6 decimals, the "Plasma One" account) and USDe
  (`0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34`, 18 decimals, verified with
  Routescan `tokeninfo` for chain 9745 on 8 Oct), matched by contract address
  only. A second token becomes a second account only once the wallet has used it.
- **The USDT0 address in section 0 is not in EIP-55 form.** The checksummed
  form is `0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb`; the casing in section 0
  fails the checksum (the paste check rightly calls it a typo).
- **Card labels**: no public explorer label for a Plasma One card settlement
  address was found, so `plasma-labels.json` is empty and every card spend
  reads "Plasma One payment · 0x…". The UI copy that says "Plasma One card"
  should match that.
- **No RPC fallback for transfers**: `eth_getLogs` over months of one-second
  blocks is more than a public RPC serves, and it is not on the allowlist.
  When Routescan is busy or down, balances come from the RPC (`balanceOf`),
  the transfers part warns and keeps the cursor; a refused API key (`AUTH`)
  or no network at all fails the update.
- **Dust**: transfers under one cent (and zero-value ones) are dropped: they
  are address-poisoning spam.
- **Extra routes** (registered by `provider.routes`): `PUT plasma/key {key}`
  (the optional Routescan key, `''` removes it) and `PUT plasma/names`.

Open issues for the core (not Plasma-only, found in the browser check):

- `api.frankfurter.app` now answers `301` to `api.frankfurter.dev/v1/`, and
  `lib/travel-rates.mjs` fetches with `redirect: 'error'`, so `rateOn()` (and
  `online()`) always fail: every non-GBP row would wait for a rate forever.
- The FX note appended to the memo (`(<amount> USD @ <rate>)`) becomes part of
  the merchant name in Finances ("Plasma One Payment 0X00 00Ca <amount> Usd
  <rate>"), so every converted row is its own merchant. The note should be
  stripped before `cleanMerchant`, or kept out of the memo.

---

## 6. Build notes: Enable Banking (Builder 4, 8 Oct)

Built in `lib/fin-connect/enable-banking.mjs`, `docs/eb-callback.html`,
`tools/eb-bank-snapshot.mjs`, `tests/fixtures/fin-fake-enablebanking.mjs`,
`tests/fin-connect-eb.test.mjs` (34 tests, fake only: every JWT is verified
by the fake against a key generated for the run). Changes against the design
above:

- **Account ids come from `identification_hash`, not the EB `uid`.** A `uid`
  belongs to one session, so a re-authorisation would have given every account
  a new id (new `<sourceId>.<accountId>`, duplicate rows, lost names).
  Our id is `eb` + 20 hex of a hash of `identification_hash` (the uid when a
  bank sends none); the session's `uids` map (our id -> uid) lives only in
  `secrets/fin/eb-<sourceId>.json`. An account the bank stops sharing stays
  listed (its rows stay) and is skipped by updates.
- **Default return is the paste page** (`config.finance.ebRedirect` !==
  `'bounce'`), as 2.3.1 says, until the owner enables GitHub Pages. In fake
  mode a `bounce` start is sent to `GET eb/fake-bounce` (the same
  `docs/eb-callback.html`, served locally), so the whole round trip stays on
  the computer.
- **Bounce page gate (2.3.1 A): passed in headless Chrome and Edge**, 8 Oct.
  A local HTTPS server answered for `mahdi1190.github.io` (host-resolver
  rules; the real Pages site was never contacted) and its address was marked
  public (`--ip-address-space-overrides`), so the browser applied its
  public -> local rules. Fake sign-in -> the https page -> `location.replace`
  to `http://localhost:<port>/api/fin-connect/eb/callback` -> "connected",
  with no block page and no history entry for the bounce page. **Not
  checked:** Firefox (not installed on the build machine) and a headed browser
  with a real certificate. Check those (with the fake) before making
  `bounce` the default. The page pins its one inline script with a CSP hash
  (a test recomputes it), sends no requests, and only passes on `code`,
  `state` and `error`.
- **Automatic-update budget**: 4 a day per source, kept in the cursor
  (`auto: {day, count}`). `fetch` treats `opts.manual === true` or
  `opts.full === true` as Sync now (always allowed). The core passes
  `full` for a new connection; **Sync now should pass `manual: true`** (or
  `full`), otherwise it counts against the 4.
- **`setup`**: the source is created with `setup: true` and cleared as soon as
  the session secret is written, because `lib/finance.mjs` skips sources in
  setup and only a fetch would clear it.
- **Source fields**: `sessionHash` (one source per EB session, as 3.1),
  `reauthDue`, and `extra: {bankName, country}` (public; the page can use it
  for "Sign in again" instead of `src.aspsp`, which does not exist).
- **First import**: asks for 730 days; a bank that answers
  `WRONG_TRANSACTIONS_PERIOD` is asked again once for 89 days. Then the
  cursor date minus 35 days, as Aureli.
- **Errors**: `EXPIRED_SESSION`/`CLOSED_SESSION`/`REVOKED_SESSION` ->
  `CONSENT_EXPIRED`; `ASPSP_RATE_LIMIT_EXCEEDED`/429 -> `RATE_LIMITED`;
  `EXPIRED_AUTHORIZATION_CODE` -> `AUTH`; a refused JWT (401) ->
  `NOT_CONFIGURED` ("the application ID and the .pem file do not belong
  together"); 5xx -> `NETWORK`. A consent past its end date is caught
  locally without a request.
- **Extra routes** (registered by `provider.routes`, all same-origin except
  the callback): `GET eb/app` (re-check: active / restricted / which return
  URLs are registered), `DELETE eb/app`, `GET eb/pending?state=` (the sheet's
  "Waiting for <bank>"), and in fake mode only `GET eb/fake-bank` (the fake
  bank's page) and `GET eb/fake-bounce`. `GET eb/banks` adds
  `direct: 'monzo'|'plasma'` when the search names them; `start` refuses them.
- **Snapshot file**: `src/app/56-fin-eb-banks.js` (format by the UI) stays
  empty: no app to read it from. The server reads it by evaluating the file
  alone in a `vm` context. `node tools/eb-bank-snapshot.mjs --app-id <id>
  --pem <file>` writes names, beta and consent days only; `--fake` writes to
  the temp folder, never over the real file.
- The FX note issue in section 5 applies to EUR accounts here too.

---

## 7. Build notes: core + Monzo (Builder 2, 8 Oct)

Built in `lib/fin-connect/{provider,index,http,secrets,normalise,overlap,monzo}.mjs`,
`server/routes/fin-connect.mjs`, `tests/fixtures/fin-fake-monzo.mjs`,
`tests/fin-connect-{core,monzo,security,integration}.test.mjs`, with small edits
to `lib/sources.mjs`, `lib/finance.mjs`, `server/routes/finance.mjs`,
`lib/travel-rates.mjs`, `lib/finance/categorise.mjs` (one regex) and
`tests/security-release.test.mjs`. Changes and additions to the contract:

- **Providers load by file name** (`PROVIDER_FILES` in `index.mjs`): a provider
  file that exists is loaded; nobody edits the routes file to add one.
  Optional `info(ctx)` adds public facts to its `GET providers` entry (Monzo:
  `redirectUri`, `windowSeconds`). Keys that look like secrets are dropped.
- **`fetch` options** gain `manual` (Sync now, a provider-requested sync, and
  the first fetch of a new source), as the Enable Banking budget needs. A
  fetch may return `sourcePatch` (merged into the source after it succeeds;
  `setup` is cleared then too).
- **`setup: true`** sources are skipped by finance updates; `Sync now` answers
  409 `NOT_CONFIGURED`; their health is `setup` (not `auth`) until signed in.
- **Monzo approval states** (`GET monzo/approval`): `idle` (nothing started in
  this server run), `waiting`, `importing` (`detail: 'Saving your
  transactions'` while the finance update runs), `done`, `expired` (approved,
  but the 5-minute window closed first: connected with 90 days, `code:
  'LIMITED_HISTORY'`), `error` (`code: 'NOT_APPROVED'` when the app approval
  never came: nothing can be read, so this is NOT "connected with 90 days";
  also `AUTH`, `BUSY`). Fields: `sourceId`, `approved`, `secondsLeft`,
  `windowSeconds`, `imported`, `earliest`, `historyMode`, `message`, `code`.
  The server waits up to 15 minutes for the approval (the window opens AT
  approval, so a late approval still gets the full history).
- **One Monzo source per Monzo user**: a second wizard that signs in as the same
  person joins the first source (secrets moved, the new source removed);
  `GET monzo/approval?source=<old id>` answers with `sourceId: <kept id>`, so
  the page should follow `st.sourceId` (the Done step filters by it).
- **Full history**: downloaded by the server inside the window (paged from the
  account's creation date, stopping 15 s before the window closes), kept in
  memory and handed to a finance update for that source; when the window
  closes first, the rest is the last 89 days. A normal update reads from each
  account's last transaction minus 36 days, never older than 89 days.
- **Disconnect with "Also remove them"** returns `{removed, undo}`;
  `POST /api/fin-connect/undo {token}` puts the rows back (once). Removed rows
  wait in `<finance>/_system/connectors/removed-<token>.csv`.
- **PATCH accounts/:key `keep`**: `'this'` shows this account, hides the
  other one when it belongs to a source, and starts its cursor again (its
  history is fetched on the next update); `'other'` keeps it hidden. Both are
  remembered (`dupChoice`).
- **Core issues from section 5, fixed**: Frankfurter moved to
  `https://api.frankfurter.dev/v1/` (the old host answers 301, which a
  `redirect:'error'` fetch refuses); both `online()` and `rateOn()` use it. The
  FX note `(<amount> <CCY> @ <rate>)` stays in the memo (the store's de-dup key
  needs a stable memo; the rate per day is cached) and `cleanMerchant` drops
  it, so converted rows keep one merchant. FX amounts round half away from zero.
- **Fake settings**: `GET /api/fin-connect/fake` -> `{fakes: {monzo: {...settings,
  calls, recent}}}` (the fake counts its calls); `POST {provider, ...}`.
