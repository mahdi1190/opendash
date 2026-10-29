# OpenDash relay protocol, version 1

The OpenDash relay is a small PRIVATE service that one person (its OWNER) runs
on their own Cloudflare account (Workers Free: a Worker plus SQLite-backed
Durable Objects), or on their own computer (`node tools/relay-local.mjs`). It
carries, for the owner and the people the owner invites:

1. **Device sync** without a shared folder: a mailbox of sealed records per
   sync group (the same sealed records the folder transport writes,
   docs/dev/SYNC_FORMAT.md section 11), a snapshot slot per device, sealed
   blobs, and live push.
2. **Join without a folder**: a join link (a random, single-use rendezvous
   slot) plus the 4-letter join code (SYNC_FORMAT.md 11.7) as the CPace password.
3. **Friends** (docs/dev/FRIENDS.md section 3): one mailbox per person
   (store-and-forward), drop tokens to post into it (so a friend on ANOTHER
   relay can still write to you), a members-only friend-code directory, and
   opt-in coarse presence.

Everything the relay stores or forwards is END-TO-END ENCRYPTED by the
clients. The relay never sees plaintext, names or keys that open anything.
Strangers cannot use it: every request is signed by a member (section 3).

Reference implementation: `lib/relay/core.mjs` (pure, Web Crypto only, no
`node:` imports), `lib/relay/auth.mjs` (signing and checking, also used by
clients), the Cloudflare adapter `cloudflare/worker.mjs` (`cloudflare/wrangler.toml`),
the Node adapter `lib/relay/node.mjs` (+ `lib/relay/node-ws.mjs`, a small
WebSocket server and client), `tools/relay-local.mjs`, and the in-app
**Settings > Your relay** page (`lib/relay/deploy.mjs`, `server/routes/relay.mjs`,
`src/app/58-settings-relay.js`).

The public Claude MCP relay (`cloudflare/relay-worker.mjs`,
docs/dev/HOSTED_RELAY.md) is a different, separate Worker and is never part of
a personal relay.

## 1. Where a relay comes from

There is NO built-in relay origin. Each person's relay is ONE record: their
HOME relay in `<data>/friends/relays.json` (`lib/friends/store.mjs`
`setRelay({origin, role, scopes, mbox}, {home: true})`, FRIENDS.md section 3),
which travels to all their devices end-to-end encrypted (lib/sync/manifest.mjs
`friends-relays`). Settings > Your relay, the Friends tab and Settings > Sync
(lib/sync/relay-node.mjs `readRelayInfo`) all read that file; nothing else
keeps an origin:

```json
{"relays": {"<key>": {"origin": "https://opendash-relay-k3x9q2.example.workers.dev", "role": "owner", "scopes": ["message", "sync"], "mbox": "<mailbox id>", "at": 1792771200000}}, "home": "<key>"}
```

Device sync uses the home relay ONLY: one the person owns, or a member relay
with the `sync` scope whose record says `"sync": true` (the person chose it for
sync in Settings > Your relay). A friend's invite that grants `sync` never moves
sync by itself, and removing the home relay leaves none (sync stays on the folder
and the network until the person chooses).

The Worker name of a relay this person deployed is read back from its
workers.dev origin (`workerOfOrigin()` in lib/relay/deploy.mjs), so any of
their devices can deploy it again under the same address. What only the
deploying computer needs (the generated `wrangler.toml`, wrangler's
`.wrangler` folder, `deploy.json` with the Worker name, the Cloudflare
account id and the deploy time) lives in that computer's device folder
(`deviceRoot(data)/relay`, lib/devicedir.mjs), never in the data folder: it
is never synced and never travels with a data folder kept in OneDrive.

It is set by one of:

- **Connect Cloudflare** (Settings > Your relay): the app runs wrangler to log
  in and deploy this relay to the person's own Cloudflare account, with
  `OWNER_KEY` = the person's identity public key (section 9).
- **Use a friend's relay**: pasting an invite link from a relay owner
  (section 4.2), or redeeming a friends invite that carries relay access in
  Friends (`role: "member"`).
- **Self-hosting and development**: `node tools/relay-local.mjs --port 4199 --owner-key <key>`
  on this computer, used only when OpenDash runs with
  `OPENDASH_RELAY_ALLOW_LOCAL=1` (section 12).

Connect Cloudflare and "Use a friend's relay" write the home relay through the friends store and then tell device
sync (`app.ctx.sync.relayChanged()`) and friends (`app.ctx.friends.reload()`)
at once. Disconnect removes it (Undo for a minute: `POST /api/relay/reconnect`).

## 2. Encodings and identifiers

- `b64u`: base64url without padding. Hashes are SHA-256.
- **Identity key**: the person's Ed25519 key pair, ONE per person, shared by
  their devices: `identity.ed` of the friends identity (docs/dev/FRIENDS.md
  section 2, `lib/friends/core.mjs`). Public key: raw 32 bytes, b64u (43
  characters); private key: PKCS#8 (48 bytes) b64u, in the secret store
  (`signerFromPkcs8()` in `lib/relay/auth.mjs` signs with it; so does
  `signText()` of lib/friends).
- **Identity id**: `iid(key) = b64u(SHA-256(UTF-8("opendash-relay-id-v1\n" + key)))[0:22]`.
- **Device key**: an Ed25519 key pair per device (installation), private half
  in the device's secret store. A device signs relay requests with its device
  key and shows a certificate from its identity (2.1).
- **Owner**: the identity whose public key is the relay's `OWNER_KEY`
  (a public value: a Worker variable, or `--owner-key`).
- Ids the relay hands out (`mbox`, invite ids) and join slots are random; ids
  clients derive (`gid`, directory keys, drop ids) are one-way hashes. None is
  personal.
- Scopes: `message` (a mailbox, drop tokens, the directory, presence) and
  `sync` (sync groups, blobs, opening join slots). The relay also accepts
  `friend-mailbox` and `device-sync` as their names on input.

### 2.1 Device certificates

```
1.<identity key>.<device key>.<iat ms>.<exp ms>.<sig>
```

`sig` = Ed25519 by the identity key over the UTF-8 text
`"OPENDASH-RELAY-CERT-1\n" + identity + "\n" + device + "\n" + iat + "\n" + exp`.
Valid when the signature checks, `iat <= now + 5 min`, `exp > now`,
`exp - iat <= 400 days`, and its id is not revoked. Certificate id:
`b64u(SHA-256(that text))[0:22]`. A device certified by identity I acts as I
(I's role and scopes) and is recorded by its own key.

## 3. Requests

All endpoints are under `/v1/` and speak JSON (`Content-Type:
application/json`) unless noted. The app calls them from Node; there are no
CORS headers (browsers on other origins cannot call a relay).

### 3.1 Signing (every request, including anonymous ones)

Headers:

| Header | Value |
|---|---|
| `X-OD-Key` | the signing public key (an identity key, a device key, or for anonymous paths any fresh key) |
| `X-OD-Cert` | the device certificate (2.1), when `X-OD-Key` is a device key |
| `X-OD-Time` | ms since 1970, by the relay's clock (clients keep an offset from `X-OD-Now`) |
| `X-OD-Nonce` | 16 random bytes, b64u (22 characters) |
| `X-OD-Body` | b64u SHA-256 of the exact body bytes (of the empty string when there is no body) |
| `X-OD-Sig` | b64u Ed25519 signature (64 bytes) over the text below |

Text signed (UTF-8, lines joined by `\n`, no final newline):

```
OPENDASH-RELAY-1
<host>       the Host the client connects to, lower case (e.g. opendash-relay-k3x9q2.example.workers.dev, 127.0.0.1:4199)
<METHOD>
<path>       exactly as sent; only [A-Za-z0-9._~/-] occur
<query>      exactly as sent, without "?", "" when none; values only [A-Za-z0-9._~-]
<X-OD-Time>
<X-OD-Nonce>
<X-OD-Body>
```

The relay refuses (401, `error` in brackets):

- a time more than 5 minutes from its clock (`clock`; the answer carries `now`);
- a nonce it has seen in the last 10 minutes, or a request signed before the
  Durable Object that answers it started (`replay`: re-sign with a fresh
  nonce and time and send again, once);
- a body whose hash is not `X-OD-Body` (`body`), a bad signature (`signature`),
  a bad, expired or revoked certificate (`cert`).

The front door (the Worker, or the Node adapter) checks the headers, the time
and the signature before it looks up any space, so an unsigned request never
reaches (or creates) one. The WebSocket upgrade (`GET .../ws`) is the only
unsigned request; it signs in on the socket (7.7).

`lib/relay/auth.mjs` has `signRequest()` for clients and `checkRequest()`
for the relay.

### 3.2 Who may do what

| Principal | How it is recognised | May |
|---|---|---|
| owner | signed by `OWNER_KEY` itself | everything, and the admin endpoints (only this key; not a device certificate) |
| owner device | device key + certificate from `OWNER_KEY` | everything except admin |
| member | identity key with an active grant (4.1) | its grant's scopes |
| member device | device key + certificate from a member identity | its identity's scopes |
| anonymous | any other valid signature | ONLY: redeem an invite (4.2), post into a mailbox with a drop token (7.3; presence is the owner's only), read a short invite link's sealed invite (7.8), a join slot that a member device opened (6), `GET /v1/health` |

The owner has both scopes. Anyone else gets
`403 {"error":"not_member","message":"This relay is private. Ask its owner for an invite."}`;
a member without the scope gets `403 scope`. Errors never mention other members.
lib/friends signs every call with the identity key itself; sync devices use
device keys with certificates (5.1).

Grant and certificate changes reach every part of the relay within 30 seconds.

### 3.3 Answers

JSON. Every answer carries `X-OD-Now` (the relay's clock, ms). Errors:
`{"error": "<code>", "message": "<one plain sentence>"}` with:

| Status | `error` | Meaning |
|---|---|---|
| 400 | `bad_request` | malformed |
| 401 | `clock`, `replay`, `body`, `signature`, `cert` | 3.1 |
| 403 | `not_member`, `scope`, `forbidden` | 3.2; not your device, group or mailbox |
| 404 | `not_found` | |
| 409 | `stale`, `taken`, `exists` | an older version, a name in use |
| 410 | `gone` | expired, used, revoked |
| 413 | `too_large` | body over its cap (section 8) |
| 415 | `content_type` | |
| 429 | `rate_limit` | `Retry-After` seconds (until midnight UTC when a member's rows for the day are used up, 8.1) |
| 503 | `relay_busy` | Cloudflare refused (free-tier limit of the day, section 8.3); `Retry-After` |
| 507 | `quota` | your quota, the group's or the relay's storage is full |

Clients back off on 429, 503, 507 and network errors (30 s, doubling to 30
min), keep working through direct live sync (docs/dev/LIVE_SYNC.md) and the
sync folder when there is one, and say so in Settings > Sync.

### 3.4 Small endpoints

- `GET /v1/health` (anonymous, rate-limited): `{"service":"opendash-relay","api":1,"now":ms}`.
- `GET /v1/me`: `{"iid","role":"owner"|"member","device":bool,"scopes":[...],"quota":bytes,"used":bytes,"exp":ms|null}`.
  Connect Cloudflare checks a new relay with this, signed by the owner key.
- `POST /v1/certs` `{}` (a device, with its certificate): records the device
  for the admin page (`{cert, identity iid, device iid, iat, exp, seen}`). Call
  at start and daily.
- `POST /v1/certs/revoke` `{"cert": "<id>"}`: by the identity that issued it.
- `GET /i`: a plain text page saying "open OpenDash > Friends > Paste invite"
  (an invite link is `<origin>/i#ODF1....`, or the short `<origin>/i#ODF1.<token>.<check>`
  of 7.8, FRIENDS.md section 5: the text after `#` never reaches the relay).

## 4. Members, invites, admin

### 4.1 Grants

The relay stores one grant per member identity:
`{key, iid, scopes, quota, exp, since, via: "owner"|"invite:<id>", revoked?}`.
A grant is made by an owner-signed admin request (the signature covers the
body, so the stored grant is what the owner signed) or by redeeming an
owner-made invite.

### 4.2 Invites

The owner makes an invite (4.3, `mintInvite`); the relay answers once with
`token` = 32 random bytes (b64u, 43 characters) and keeps only
`SHA-256("opendash-relay-invite-v1\n" + token)`. The token travels inside a
friends invite (`relay: {origin, token, scopes}`, FRIENDS.md section 5); the
app's "Use a friend's relay instead" takes the same invite. Redeem:

`POST /v1/invites/redeem` `{"token"}`, signed by the identity key that joins
(anonymous: it is not a member yet). Single use, expires (default 7 days, at
most 30). Answer: `{"role":"member","iid","scopes","quota","exp","mbox"}`
(`mbox`: the member's mailbox, made now, when the scopes have `message`).
Wrong, used or expired tokens all answer `410 gone`. At most 5 tries per IP
per hour. Redeeming with a key that already holds a grant adds the scopes.

**Held until approval.** Holding the link proves nothing about who holds it, so
an invite (unless minted with `"pending": false`) lets its redeemer in
*pending*: what they already had as a confirmed member, else `message` only
with `LIMITS.quota.pending` (1 MiB), 1,000 rows a day, no friend-code lookups,
running out after 30 days. The answer adds `"pending": {"scopes"}` (what the
invite allows later). When the owner approves the friend request that came
through the invite, the app sends `PUT /v1/admin/members/<iid>`
`{"key", "pending": false}`: the grant becomes what the invite allowed (404
when there is no grant). The owner's upkeep does the same for any pending
member who is a confirmed friend (an approval made on an older app). Revoking a
member (`DELETE /v1/admin/members/<iid>`) also tells the spaces they use
(internal op `revoke`): cached grants are dropped and their open sockets close.

### 4.3 Admin (signed by `OWNER_KEY` only)

- `GET /v1/admin`:
  ```json
  {"owner":{"iid","used"},
   "members":[{"iid","key","scopes","quota","used","since","exp","via","revoked","devices":[{"cert","device","iat","exp","seen"}]}],
   "ownerDevices":[{"cert","device","iat","exp","seen"}],
   "invites":[{"id","scopes","quota","exp","grantExp","at"}],
   "relay":{"used","max","spaces","today":{"requests","writes"},"limits":{...section 8.3...}}}
  ```
  `used` is bytes stored; `today` is the relay's own count since 00:00 UTC
  (approximate: each part reports at most every 15 minutes).
- `POST /v1/admin/invites` `{"scopes":[...], "ttlMs"?, "quota"?, "grantTtlMs"?}` -> `{"id","token","exp"}` (`mintInvite`).
- `DELETE /v1/admin/invites/<id>`.
- `PUT /v1/admin/members/<iid>` `{"key"?, "scopes"?, "quota"?, "exp"?}`: add (with `key`) or change.
- `DELETE /v1/admin/members/<iid>` (`revokeMember`; `iid = iidOf(ed.pub)`): revoke at once. The grant is kept 7 days as
  `revoked` so **Undo** works: `POST /v1/admin/members/<iid>/restore`. After 7
  days the member's groups, mailbox and directory entry are deleted.

## 5. Device sync

A computer may sync through the relay alone, or through the relay and a
cloud folder at once (`both`, lib/sync/relay.mjs). In `both` the relay comes
FIRST (2.17.1): while it can be read (key here, enrolled, index read, no
back-off), other devices' logs, snapshots, keys.json and blobs are read from
it; the folder copy (the same bytes, so the same offsets) is read only for
what the relay does not hold yet, or while the relay is down, and the relay
is taken back as soon as it answers (an unreachable relay is retried within
5 minutes). A computer always writes its own files to the folder first (the
backup), then uploads them.

### 5.1 Groups

`gid = b64u(SHA-256(UTF-8("opendash-relay-group-v1\n" + group)))`, `group`
being the 16-hex sync group id. A group belongs to the identity whose device
created it; only that identity's devices may enrol (a person's devices share
their identity). Needs `sync`.

**Enrolment capability.** Knowing the group key is checked too:
`cap = b64u(HKDF-SHA-256(ikm = the current sync key (32 raw bytes), salt = UTF-8("opendash-relay-cap-v1"), info = UTF-8("opendash-relay-cap|" + group + "|" + kid), 32 bytes))`.
The relay keeps `SHA-256(UTF-8(cap))` and `{kid, n}` only.

- `POST /v1/g/<gid>/enrol` `{"dev","kid","n","cap"}` (a device key with a
  certificate): the first enrolment creates the group with this cap; later
  ones must show the current cap. A device of ANOTHER identity may enrol only
  when the identity the group belongs to has no access to the relay any more
  (not `OWNER_KEY`, no active grant) and it shows the CURRENT cap: the group
  then moves to the new identity (a renewal of the person's keys, FRIENDS.md
  section 15). Binds the sync device id `dev` (16 hex) to
  this device key; a `dev` already bound to another key moves to this one
  only with the cap. A revoked `dev` never comes back (removal is permanent:
  rejoin under a new id). -> `{"gid","dev","s","floor"}`.
- `POST /v1/g/<gid>/cap` `{"kid","n","cap","prev"}`: an enrolled device, whenever the
  current sync key changes. `prev` is the cap the relay holds NOW (proof that
  the device holds that key too): without it, or with another, `403 forbidden`
  `{why: "cap", cap: {kid, n}}`, so an enrolled device that lacks the current key
  (removed from sync, or stolen and left behind by a key change) cannot overwrite
  it and lock the other devices out. `n` must not go down (`409 stale`, with the
  same `cap`). A client that gets either reads the group's `cap` back and keeps
  it (never assumes its own went through); it moves it later, when it holds that
  key (keys come through sync).
- `POST /v1/g/<gid>/revoke` `{"dev"}`: an enrolled device removes another (with
  a removal in the keyring). Its key loses access at once, its sockets close.
- `DELETE /v1/g/<gid>/d/<dev>`: the files of a REVOKED device, or of an older
  `dev` of the caller's own device key (SYNC_FORMAT.md section 1 exceptions).
- `GET /v1/g/<gid>`: `{"owner":iid,"devices":[{"dev","since","seen","online","revoked"}],"s","floor","used","max","blobUsed","blobMax","cap":{"kid","n"}}`.

Every write below names `<dev>` and must be signed by the device key bound to
it. Reads are open to every enrolled device of the group.

### 5.2 Logs (append-only)

The relay keeps each device's logs with the folder's semantics (file name,
byte offsets), so a relay adapter can offer exactly the folder transport's
interface (`lib/sync/folder.mjs`): a file's content is its lines, each
followed by `\n`; `off` is the byte offset where a line starts.

- `POST /v1/g/<gid>/d/<dev>/log` `{"file":"ops-YYYYMMDD[-NN].jsonl","lines":["<JSON text>", ...]}`:
  each line is one sealed record `{"v":2,"dev":<dev>,"n":<int>,"enc":{...}}`
  (SYNC_FORMAT.md 11.2; `file` is in its associated data). `n` must rise;
  lines with `n` at or below the device's last one are skipped (a retried
  request is harmless). At most 500 lines and 2 MiB; a line at most 1 MiB.
  -> `{"s","size","skipped"}`.
- `GET /v1/g/<gid>/files` -> `{"s","floor","devices":{"<dev>":{"logs":[{"name","size","first"}],"slots":{"<name>":{"ver","size","at"}},"blobs":<count>}}}`.
  `first`: the lowest offset still held (lines before it were compacted, 5.6).
- `GET /v1/g/<gid>/d/<dev>/log/<file>?from=<off>&max=<bytes>` -> `{"lines":[{"line","end"}],"end","size","first"}`.
- `DELETE /v1/g/<gid>/d/<dev>/log/<file>?size=<n>`: removes the file only if
  its size is still `n` (`removeOwnLog`).

### 5.3 Slots

One per device and name: `device`, `snapshot`, `keys`, `pair` (the folder's
JSON files). The body is the file's JSON text, as written to the folder.

- `PUT /v1/g/<gid>/d/<dev>/s/<name>?ver=<int>[&soft=1]`: `ver` must rise
  (clients use their clock's ms); an older `ver` -> `409 stale`. Caps:
  `device` and `pair` 64 KiB, `keys` 256 KiB, `snapshot` 16 MiB.
  `soft=1` (only `device`): a heartbeat. The relay keeps it in memory, sends
  it to live sockets, and stores it at most every 30 minutes (saves the free
  tier's daily writes; section 8.3). The relay also reports which devices
  hold an open socket (`online`), so heartbeats are needed far less often.
- `GET /v1/g/<gid>/d/<dev>/s/<name>`: the body as stored, with `X-OD-Ver`.
- `DELETE /v1/g/<gid>/d/<dev>/s/<name>`.

### 5.4 Blobs

Sealed blob files (SYNC_FORMAT.md section 12), by locator (32 hex). `Content-Type: application/octet-stream`.

- `PUT /v1/g/<gid>/d/<dev>/b/<loc>`: at most 5 MiB + 1 KiB. A blob is never
  changed: the same locator again is accepted without storing (`{"have":true}`).
- `GET /v1/g/<gid>/d/<dev>/b/<loc>`: the bytes; when that device holds none,
  any other device's copy of the locator.
- `GET /v1/g/<gid>/d/<dev>/b` -> `{"blobs":[{"loc","size","at"}]}`.
- `DELETE /v1/g/<gid>/d/<dev>/b/<loc>`.

Budget: at most 32 MiB of blobs per group (inside the group's 64 MiB),
`507 quota` beyond. Clients store re-creatable clips (narration) only while
blobs use under 75 % of it.

### 5.5 Changes feed, acknowledgements

Every change in a group takes the next number `s` (one per line, slot write,
blob, file or device change).

`GET /v1/g/<gid>/changes?since=<s>&max=<bytes>` (default 1 MiB, at most 4 MiB):

```json
{"s": 1234, "head": 1290, "more": true, "floor": 900, "reset": false,
 "log":   [{"s","dev","file","off","line"}],
 "files": [{"s","dev","file","size","first"} | {"s","dev","file","gone":true}],
 "slots": [{"s","dev","name","ver","size","at","body"?} | {"s","dev","name","gone":true}],
 "blobs": [{"s","dev","loc","size","at"} | {"s","dev","loc","gone":true}],
 "devices": [{"s","dev","since","revoked"?}]}
```

Everything up to `s` is in the answer; ask again from `s` while `more`.
`body` is inline for slots up to 16 KiB. `reset: true` when `since` is below
`floor` (lines were compacted since): read the devices' snapshots, then their
logs from the snapshots' `covers` (the folder rule).

`POST /v1/g/<gid>/d/<dev>/ack` `{"s"}` (or `ack` on the socket): how far this
device has taken the feed. Stored at most every 10 minutes.

### 5.6 Retention

A log line is compacted (deleted) when its device has written a snapshot
since, every device seen in the last 45 days has acknowledged it, and it is
older than 7 days. While the group is above 90 % of its quota the 7 days do
not apply. Tombstones (`gone`) are kept 30 days. A group nobody used for 180
days is deleted.

### 5.7 Live

`GET /v1/g/<gid>/ws` (WebSocket, section 7.7). After `auth` with `"dev"`, the
socket gets `{"t":"chg", ...the changes feed shape...}` for every change by
another device within a moment (slot bodies inline up to 16 KiB; a change
over 256 KiB comes as `{"t":"chg","s","more":true}`: fetch it), and the
device's slot heartbeats as `{"t":"soft","dev","ver","body"}`. It may send:

- `{"t":"append","id":<any>,"file","lines":[...]}` -> `{"t":"ok","id","s","size","skipped"}` or `{"t":"err","id","error"}` (at most 1 MiB per message);
- `{"t":"ack","s"}`;
- `ping` (text) -> `pong`, answered without waking the object.

Sending changes over the socket costs the free tier a twentieth of a request.
A device's own changes are not echoed to it, so pushed `s` values skip: keep
the cursor from the changes feed (5.5), and after a reconnect ask the feed
from the last cursor before trusting pushes again.

## 6. Join without a folder (rendezvous)

The join code (SYNC_FORMAT.md 11.7) works through a JOIN LINK. The 4 letters
are ONLY the CPace password: they never reach the relay in any form.

1. The existing device E (a member device with `sync`) makes a random slot id:
   16 random bytes, b64u (22 characters, `newJoinSlot()` in lib/relay/auth.mjs),
   and shows the link and the code:

   ```
   <relay origin>/j#ODJ1.<slot>
   ```

   (as text and as a QR code). The relay keeps only
   `SHA-256(UTF-8("opendash-relay-slot-v1
" + slot))` (the name of the slot's Durable Object).
2. On the new device N the person pastes the link (origin from the URL, slot
   from the fragment; `GET /j` is a plain page saying "Open OpenDash on your
   new computer and paste this link"), then types the 4 letters.
3. Both run 11.7 unchanged over the slot's documents: a slot holds the devices'
   `pair.json` documents exactly as in the folder
   (`{"v":2,"t":"pair","dev","pub","at","code"|"claims",...}`), so
   `docs = {dev: {pair}}`.

Requests:

- `PUT /v1/join/<slot>/<dev>?ver=<int>`: a document of at most 8 KiB, `dev`
  and `v: 2` matching. The FIRST document must come from a member device with
  `sync` (signed with its certificate): it OPENS the slot. Then one other
  device may write its own (anonymous: N signs with any key; its `dev` stays
  bound to that key). `ver` must rise.
- `GET /v1/join/<slot>` -> `{"docs":[{"dev","ver","at","body"}],"now"}`; `404`
  if the slot is not open, `410 gone` once it closed.
- `DELETE /v1/join/<slot>/<dev>`: the opener's delete closes the slot.
- `GET /v1/join/<slot>/ws`: `{"t":"doc","dev","ver","at","body"}` as documents
  change; `{"t":"closed","why":"done"|"second"|"expired"}` when it closes.

**One attempt per link.** If a SECOND device (another `dev`) writes into a
slot, the slot closes at once with `why: "second"` (`409 taken` to that
writer); both devices say "Someone else tried this link: start again". A
slot is single-use: once closed it stays closed (`410`) until its id expires.
A document expires 10 minutes after its last write; a slot closes 10 minutes
after it opened, at the latest. Limits: anonymous requests 20 a minute per IP,
60 writes per slot, and E still burns the code after 3 wrong answers.

## 7. Friends

Needs `message`. lib/friends seals everything (FRIENDS.md); the relay sees
opaque JSON values. The calls of FRIENDS.md section 3 map to:

| lib/friends call | Request |
|---|---|
| `redeem({origin, token})` | `POST /v1/invites/redeem` (4.2) |
| `mintInvite({scopes, ttlMs})` | `POST /v1/admin/invites` (4.3) |
| `revokeMember(edPub)` | `DELETE /v1/admin/members/<iidOf(edPub)>` (4.3) |
| `mailbox()` | `GET /v1/mailbox` (7.1) |
| `mintDrop({ttlMs})` / `revokeDrop(drop)` | `POST /v1/mb/<mbox>/drops`, `DELETE /v1/mb/<mbox>/drops/<dropId(drop)>` (7.2) |
| `post({mbox, drop, env})` | `POST /v1/mb/<mbox>/post` with `X-OD-Drop` (7.3) |
| `pull({after})` / `ack(rids)` | `GET /v1/mb/<mbox>/items?after=`, `POST /v1/mb/<mbox>/ack` (7.4) |
| `listen(onEnv)` | `GET /v1/mb/<mbox>/ws` (7.4, 7.7) |
| `publish` / `unpublish` / `lookup` | `PUT` / `DELETE` / `GET /v1/codes/<key>` (7.5) |
| `invPut` / `invDel` / `invGet` | `PUT` / `DELETE` / `GET /v1/inv/<key>` (7.8) |

### 7.1 One mailbox per person

`GET /v1/mailbox` -> `{"mbox"}`: this identity's mailbox on this relay, made
on first use (22 random characters). Only the identity (or its certified
devices) reads it. Redeeming an invite with `message` makes it too.

### 7.2 Drop tokens

`POST /v1/mb/<mbox>/drops` `{"ttlMs"?}` (the mailbox's identity) ->
`{"id","token","exp"}`: `token` = 32 random bytes, b64u. The relay keeps only
`h = b64u(SHA-256(UTF-8("opendash-relay-drop-v1\n" + token)))`;
`id = dropId(token) = h[0:22]`. Default lifetime 365 days, at most 3 years.
At most 500 per mailbox. `DELETE /v1/mb/<mbox>/drops/<id>` takes one back.

### 7.3 Posting

`POST /v1/mb/<mbox>/post` `{"env": <any JSON, at most 64 KiB>}` with header
`X-OD-Drop: <token>`, signed by any key (anonymous allowed: a friend on another
relay) -> `{"rid"}`. Per token: 100 messages a day and 1 MiB not yet acked;
per IP: 20 anonymous requests a minute. A wrong, revoked or expired token:
`403 forbidden` (the same answer for each).

### 7.4 Reading

- `GET /v1/mb/<mbox>/items?after=<cursor>&limit=<n>` -> `{"items":[{"rid","env","at"}],"cursor","more"}`
  (oldest first; `cursor` is a number, start with 0).
- `POST /v1/mb/<mbox>/ack` `{"rids":[...]}`: deletes them.
- `GET /v1/mb/<mbox>/ws`: `{"t":"item","rid","env","at"}` for each new one.

Items expire after 30 days. A mailbox holds at most 4 MiB and 2,000 items;
when full, posts get `507 quota` (nothing is dropped silently).

### 7.5 Directory (friend codes)

The relay never sees a friend code: the key is
`hex(SHA-256("opendash-friend-code-v1\n" + code))` (64 hex, `codeKey` of
lib/friends) and the value is lib/friends' sealed card (opaque, at most 4
KiB). Members only.

- `PUT /v1/codes/<key>` `{"blob"}`: one code per identity (publishing another
  removes the old one). `409 taken` if another identity holds it.
- `DELETE /v1/codes/<key>` (its identity).
- `GET /v1/codes/<key>` -> `{"blob"}` or `404`. At most 20 lookups a minute per
  key and 10 per IP, misses included.
- A released key (a new code, a `DELETE`, the member purged) stays RESERVED for
  the identity that held it for 90 days (a tombstone `{iid, gone}`; at most 64
  per member, the oldest go first): `GET` answers `404`, another identity's `PUT`
  answers `409 taken`, its own may take it back. So a code someone used before
  never opens another person's card. Tombstones are swept daily after 90 days.

### 7.6 Presence (opt-in, coarse)

- `PUT /v1/mb/<mbox>/presence` `{"state":"here"|"away"|"off"}` (the mailbox's
  identity): its time is rounded down to 5 minutes; `off` removes it; stored
  only when the state changes. Nothing is published unless the person turned
  presence on.
- `GET /v1/mb/<mbox>/presence` with `X-OD-Drop` (a friend holding a drop token
  for this mailbox) -> `{"state","at"}` or `{"state":"off"}`.

### 7.7 WebSockets (all of them)

Sockets authenticate by signed challenge, right after the upgrade:

1. Relay: `{"t":"challenge","c":"<32 random bytes, b64u>","now":ms}`.
2. Client, within 5 seconds:
   `{"t":"auth","key","cert"?,"sig","dev"?}`, `sig` = Ed25519 over
   `"OPENDASH-RELAY-WS-1\n" + host + "\n" + path + "\n" + c`
   (`answerChallenge()` in lib/relay/auth.mjs).
3. Relay: `{"t":"ready","now", ...}` (a group adds `s` and `floor`, a join slot
   its `docs`, a mailbox its `cursor`), or `{"t":"error","error"}` and close
   (code 4401 / 4403).

Nothing is sent to a socket before `ready`. At most 8 sockets per identity per
space and 64 per space. A socket not yet authenticated (anyone holding a card
or a link can open one) is closed after 5 seconds; at most 4 per address (the
hashed IP bucket) per space; and a full space closes the oldest one of another
address to make room, so only authenticated sockets can fill it and strangers
cannot keep the owner's devices out. Clients send `ping`
every 50 seconds (answered `pong` without waking the object), reconnect with
back-off, and poll (`changes`, `items`) every 60 seconds (5 minutes when
idle) while sockets fail.

### 7.8 Short invite links

A friends invite (FRIENDS.md section 5) is about 700 characters: too long for a QR code. The short
link `<origin>/i#ODF1.<token>.<check>` (about 100 characters) carries only a random token; the
invite itself is kept here, SEALED by the inviter with a key derived from the token (HKDF), under
`key = hex(SHA-256(UTF-8("opendash-friend-short-v1\n" + token)))`. The relay never sees the token,
so it cannot open what it keeps.

- `PUT /v1/inv/<key>` `{"blob", "exp"?}` (a member with `message`; the inviter): the blob is opaque,
  at most 4 KiB; `exp` is clamped to between 1 minute and 31 days from now (default 7 days). At most
  50 open per identity. `409 taken` if another identity holds the key. -> `{"ok", "exp"}`.
- `GET /v1/inv/<key>` (anonymous allowed: the person invited is usually not a member yet; 10 a minute
  per IP and the anonymous limits) -> `{"blob", "exp"}`, `404` when unknown, `410 gone` once expired.
- `DELETE /v1/inv/<key>` (its identity): the inviter deletes it once the invite is used, cancelled or
  expired. Expired ones are swept daily, and with a member's grant when it is purged.
- A deleted, expired or purged link key stays reserved for its identity for 90 days, exactly as a
  friend code's key (7.5): `404` (or `410` just after expiry) to everyone, `409 taken` to another
  identity's `PUT`.

A relay from before this section answers `404` to the `PUT`; the app then hands out the long link.

## 8. Limits

### 8.1 Caps (defaults; the operator may lower them)

| What | Cap |
|---|---|
| Request body | 64 KiB; log append 2 MiB; snapshot 16 MiB; blob 5 MiB + 1 KiB; mailbox post 64 KiB; directory blob 4 KiB; short invite link blob 4 KiB; join document 8 KiB |
| Rate | per IP 300 requests a minute (IPv6: per /64); per signing key 240 a minute, and a member's keys (identity and every device) 240 together; anonymous paths (redeem, post, join, health) 20 a minute per IP; a signed request for a members-only path from a key that is neither the owner nor a member is refused at the front door (`403 not_member`), before any space (Durable Object) is touched: the Worker keeps the member list per isolate for 60 s and looks it up again on a miss at most every 5 s (`429` with `Retry-After: 5` meanwhile); invite redemptions 5 per IP per hour; directory lookups 20 a minute per identity, 10 per IP |
| Rows written | a member: 10,000 a day (UTC), all their devices and spaces together; the owner: no cap. Counted after each request: the member's own writes, posts into their mailbox, writes in a join slot they opened; deletes count too. The registry keeps the count (`w/<iid>`, in the members snapshot); past it a write gets `429 rate_limit` with `Retry-After` until midnight UTC, reads still work |
| Storage per member | owner 1 GiB; a member with `sync` 128 MiB; `message` only 16 MiB; the owner can change each member's |
| Relay | 4 GiB in all (Workers Free has 5 GB); 200 members; 50 open invites |
| Group | 64 MiB (blobs 32 MiB of it); 16 devices; 4 groups per identity |
| Mailbox | one per identity; 4 MiB and 2,000 items; 500 drop tokens; per token 100 posts a day and 1 MiB unacked |
| Sockets | 8 per identity per space; 64 per space |

### 8.2 Storage model

One Durable Object (a "space") per group (`g:<gid>`), join slot
(`join:<hash of the slot>`, section 6), mailbox (`mb:<mbox>`), and one
registry (`reg`: grants, invites, certificates seen and revoked, the
directory, usage). Each space is an ordered key-value table in its SQLite
database (`kv(k TEXT PRIMARY KEY, v)`); large values are cut into 1 MiB
parts. The Node adapter keeps the same keys in memory with an append-only
journal per space on disk. Nothing is logged.

A space is stored from its first write (group enrol, mailbox set-up, the first
document in a join slot): its table, its name (`_name`) and its journal file
are made then, never by a read or a refused request, so asking about a space
that does not exist leaves nothing behind. An emptied space (a purged group or
mailbox, a finished join slot) deletes its whole database (`deleteAll()`) or
journal file.

### 8.3 Cloudflare Workers Free, and when it runs out

Per account per day (reset 00:00 UTC): 100,000 Worker requests; 100,000
Durable Object requests (incoming WebSocket messages count 1/20; outgoing
messages and protocol pings are free); 13,000 GB-s of Durable Object time
(hibernated sockets cost nothing); SQLite 100,000 rows written and 5 million
read; 5 GB stored in all; 10 ms CPU per Worker request.

What uses them: every HTTP request (once in the Worker and once in a Durable
Object); each stored log line, slot part or message is a written row. So:
keep one socket per device, send changes on it, mark heartbeats `soft`, poll
only when the socket is down. A household of a few devices uses a small
fraction of a day's allowance; a relay serves tens of active people.

When a limit is reached Cloudflare refuses requests until midnight UTC: the
relay answers `503 relay_busy` (or Cloudflare's own error page), clients back
off (3.3), keep syncing directly over live sync and the folder, and Settings
says "Your relay is resting until midnight UTC (free-tier limit)". Nothing is
upgraded or paid for automatically.

## 9. Deploying

**In the app** (Settings > Your relay > Connect Cloudflare): runs
`npx --yes wrangler@<WRANGLER_VERSION> login` (the browser opens; the person clicks
Allow), writes a wrangler config into this computer's device folder (`relay/wrangler.toml`:
Worker `opendash-relay-<6 random [a-z0-9]>`, workers.dev, the Durable Object
binding and its `new_sqlite_classes` migration, `OWNER_KEY` = the person's
identity public key, observability off), runs `npx --yes wrangler@<WRANGLER_VERSION> deploy` (one pinned release, lib/relay/deploy.mjs),
checks `GET /v1/health` and `GET /v1/me` (owner), and saves the origin as the
home relay (section 1). Wrangler keeps the Cloudflare sign-in in its own store;
OpenDash never reads, copies or logs it.

**By hand**, from the repository:

```
npx wrangler login
npx wrangler deploy --config cloudflare/wrangler.toml --name opendash-relay-<id> --var OWNER_KEY:<identity public key>
```

**On a computer**: `node tools/relay-local.mjs --port 4199 --owner-key <key> [--data <dir>] [--host 127.0.0.1]`
(plain http on 127.0.0.1: OpenDash talks to it only with `OPENDASH_RELAY_ALLOW_LOCAL=1`,
section 12; over a network put it behind https on a public name).

## 10. What the relay can still see

It never sees plaintext, names, friend codes, join codes or keys that open
anything. It does see, and its operator could log (OpenDash's relay logs
nothing and turns Cloudflare observability off, but the operator controls the
account):

- the member identity keys and device keys, which devices belong to whom, and
  their IP addresses;
- timing and sizes: when each device writes, how much, how often, when it is
  online (its socket), and blob and snapshot sizes;
- the number of devices in a group; which mailbox each drop token posts to,
  how often and when (so how many friends write to a person, and which of
  them are members of this relay, by their signing key); presence states
  people chose to share, and who reads them;
- directory entries (a hash of a friend code and a sealed card): someone who
  guesses a code (a first name and 4 characters) can open that card, the
  relay included;
- short invite links (7.8): a hash of the link's token, the sealed invite
  (it cannot open it), when it was read, and the reader's key and IP address;
- that a join is happening (a slot opening), and that a drop token was used.

A device certificate cannot be revoked away from a device that still holds
the identity's private key (one key per person): rotating the identity is the
friends layer's job (FRIENDS.md section 15: the relay is deployed again with
the new `OWNER_KEY`, or its owner lets a member's new key in).

## 11. Versions

`/v1/` is this document. A change an older client would misread gets `/v2/`;
new fields may be added to answers and must be ignored by clients that do not
know them.

## 12. Which relay addresses a client accepts (and a local relay)

ONE check, `relayOrigin()` in `lib/relay/origin.mjs` (pure), is used by every
client and every record of a relay address: lib/friends (cards, invites, friend
records, `friends/relays.json`, `lib/friends/relay-client.mjs`), device sync
(`lib/sync/relay-client.mjs`, join links, `lib/sync/relay-node.mjs`) and
Settings > Your relay (`lib/relay/deploy.mjs`).

- Accepted: `https://<name>[:port]`, where `<name>` is a DNS name: no IP
  literal in any form (`127.0.0.1`, and the short, hex, octal and decimal
  forms such as `127.1`, `10.1.1`, `0x7f.1`, `192.168.1`: a name whose last
  label, or every label, is digits or `0x` hex is refused), no `localhost`, `.local`, `.localdomain`, `.internal`, `.lan`,
  `.home.arpa` and the like; no path, query, fragment or user info.
  Normalised to lower case, without a trailing slash or `:443`.
- A name that RESOLVES to a private, loopback, link-local or other non-global
  address is refused too: `lib/friends/relay-client.mjs` checks inside every
  socket's own DNS lookup; Settings > Your relay ("Use a friend's relay") and
  device sync (`readRelayInfo`) look the name up first (`lib/relay/public.mjs`).
  A relay address can come from a friend (their card or invite), so a friend
  can never make this computer send requests into its own network.
- **A local relay** (development, or self-hosting on the same computer):
  `http://127.0.0.1:<port>` or `http://localhost:<port>` (a port is required)
  is accepted ONLY when the OpenDash process runs with the environment variable
  `OPENDASH_RELAY_ALLOW_LOCAL=1`. Nothing else turns it on: not a synced file,
  a friend's card or invite, a join link, or anything the page sends. Without
  the variable, records with a local address are dropped when read. Such a
  relay is reached on the loopback interface only.

  ```
  node tools/relay-local.mjs --port 4199 --owner-key <your identity public key> --data <dir>
  set OPENDASH_RELAY_ALLOW_LOCAL=1                   (PowerShell: $env:OPENDASH_RELAY_ALLOW_LOCAL='1')
  set OPENDASH_PERSONAL_RELAY_ORIGIN=http://127.0.0.1:4199   (optional: device sync uses it as your own relay)
  node serve.mjs --data-dir <a throwaway data folder>
  ```

  `OPENDASH_PERSONAL_RELAY_ORIGIN` (device sync only; it must pass the same
  check) is for operators and development. It is not `OPENDASH_RELAY_ORIGIN`,
  which belongs to the hosted Claude MCP relay (docs/dev/HOSTED_RELAY.md).
