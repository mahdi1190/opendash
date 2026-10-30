# OpenDash Friends (version 1, OpenDash 2.17)

Friends lets two people who both use OpenDash add each other, see each
other's game progress, cheer each other on and do things together, with no
account and nothing external beyond a **private relay** one of them runs
(agent 'relay', `docs/dev/RELAY_PROTOCOL.md`) and direct links when both are
online. Everything between friends is end-to-end encrypted; the relay sees
ciphertext and random mailbox ids only.

Reference implementation: `lib/friends/`.

| File | What |
|---|---|
| `core.mjs` | PURE (Web Crypto only, no `node:`): identity, cards, friend codes, invites, the confirmation code, envelopes, schemas and kinds, ordering and dedupe, presence, friendship XP |
| `store.mjs` | Node: the identity in the device secret store, the data files, relay records |
| `engine.mjs` | the friends service: handshake, message channel, handlers, presence, remove and block |
| `relay-client.mjs` | the relay transport (per RELAY_PROTOCOL.md) |
| `direct.mjs`, `node-direct.mjs` | direct live links between friends (reuses `lib/sync/live/session.mjs`) |
| `server/routes/friends.mjs` | `/api/friends/*`, `app.ctx.friends` |
| `server/routes/relay-rotate.mjs` | `/api/relay/rotate`: after a key renewal, your own relay is deployed again with the new owner key (section 15) |
| `src/app/96-friends-*.js`, `src/styles/96-friends.css` | the Friends tab, `window.Friends`, `friendsFeedPost()` |

## 1. Rules (the owner's, 24 Oct 2026)

1. **The identity private key stays in the device secret store** (`lib/secret-store.mjs`, key `friends-identity`). It is never written to the data folder, never logged, never returned by an `/api` route. It reaches the person's other devices only inside the encrypted device-pairing keyring (`lib/sync/e2e.mjs`, `registerKeyringExtra('friends', ...)`: the same wraps that carry the sync keys, in every one of them: the join code, the 6-digit pairing, a QR offer, the recovery code and the members' rewraps in keys.json all bring it).
2. **Invites are single use and expire.** A friendship needs BOTH the redeemed invite (or a friend code on the same relay) AND the inviter approving the request after comparing the 6-digit confirmation code. A forwarded link alone is never enough.
3. **Everything from a friend is untrusted input**: checked against a strict, allow-listed schema per kind (section 9), ids `/^[A-Za-z0-9_-]{1,64}$/`, length and size caps, `__proto__` / `constructor` / `prototype` dropped. Never used in a file path. Rendered with `textContent` or `esc()`, never `innerHTML` with friend text. **No schema has a URL field**: a friend can never make this computer or its page load anything (no tracking pixels, no requests from the server).
4. **Friend content never reaches Claude or any action.** It is not in the state file (the MCP server, the assistant and the actions layer read that), it never triggers the Claude host (`lib/sync/claude-host.mjs`), remote requests (`lib/remote-jobs.mjs`), MCP tools, connectors or accounts, and nothing a friend sends creates or changes a task by itself: only the user's own click does. Friends can never use your Claude, connectors or accounts.
5. **Direct links accept only known friends**, authenticated by the handshake before any message is parsed; unknown keys are dropped at the hello. Frames are capped (256 KB), one link per friend, at most 16 links. The friends port is never opened on the router (no UPnP for it).
6. **The local API** is `/api/friends/*` on the normal router: 127.0.0.1 binding, Host check (421), same-origin on every `/api/` request (403), JSON content type (415), body limits (413).
7. **Remove or block** (mine, or theirs: `friend:remove`) revokes their drop tokens and (relay owners) their relay access; a revocation the relay does not confirm is kept in `local.json` `revokes` and retried by the background pass. Relay members who are friends get an expiry that the owner's upkeep renews (`relayUpkeep`), drop tokens are renewed with `friend:relay` before their 365 days run out, and friend messages older than 45 days, or `friend:*` messages whose clock is older than the newest one seen from that friend (`lcIn`, synced), are dropped as replays. It also deletes your copy of what they shared, tells every handler (`onRemoved`: agent 'together' rotates group keys; agent 'perms' deletes your choices for them, so someone who comes back starts again from profile and game progress) and asks their app to delete yours. Unblock tells the handlers again (`{unblocked: true}`), so choices made for a blocked person are cleared too. The UI says plainly that deletion on their device cannot be forced.
8. **Metadata stays out of the clear**: relay requests carry no names, emails or friend ids; mailbox ids are random; envelopes show only a random message id and a pair tag.

## 2. Identity

One per PERSON, shared by all their devices, never per device.

```json
{"v": 1, "id": "3f9c0a6e1b2d4c58",
 "x":  {"pub": "<raw 32 bytes, base64url>", "priv": "<PKCS#8 DER 48 bytes, base64url>"},
 "ed": {"pub": "<raw 32 bytes, base64url>", "priv": "<PKCS#8 DER 48 bytes, base64url>"},
 "createdAt": 1792771200000}
```

- `x`: X25519 (key agreement: pair keys, requests, direct links). `ed`: Ed25519 (signatures: the card, the relay directory, **relay requests**: the identity is also the relay membership identity; agent 'relay' signs with `signText(identity, text)` / `signBytes(identity.ed.priv, bytes)` from `core.mjs`, over what RELAY_PROTOCOL.md says).
- `id = hex(SHA-256("opendash-friend-v1\n" | raw x.pub | raw ed.pub)[0:8])`: 16 hex digits, the same shape as a device id.
- Base64url is RFC 4648 section 5 without padding (`lib/sync/e2e-crypto.mjs` `b64u`).
- Secret store value under `friends-identity`: `{v: 1, current: identity, others: [identity...], retired: [{id, at, until}], retiredKeys: [identity...]}`. Made on first use (opening Friends, making an invite). If two devices made one before they paired, every device keeps the earliest (`pickIdentity`: oldest `createdAt`, then the smaller id) and the other stays in `others` so messages sent to it still open. `retired` / `retiredKeys`: identity rotation (section 15). `unconfirmed` / `unconfirmedRetired`: ids that reached this device ONLY in a recovery copy, which no device signs (a removed device can still wrap one to the recovery key): used here, but never picked over a confirmed identity, never passed on in the members' keys.json rewraps (a pairing this device approves carries them marked unconfirmed), and dropped when a device of the person adds this one (join code, 6 digits, QR offer) without holding them. The same id arriving from a member or a pairing confirms it.
- Node API (`lib/friends/store.mjs`): `loadIdentity(dataDir) -> identity|null`, `ensureIdentity(dataDir) -> identity`, `publicIdentity(identity) -> {id, x, ed}`, `allIdentities(dataDir, {retired = true})`, `rotateIdentityKeys(dataDir) -> {from, to, olds}`, `retiredIdentities(dataDir)`, `retiredIds(dataDir)`.

Secrets that must follow the person but are not the identity (drop tokens friends gave you, relay tokens) are kept in the data files **sealed** with a key only a holder of the identity derives (`sealAtRest` / `openAtRest`: AES-256-GCM, key = HKDF(ed.priv, "opendash-friends-at-rest-v1")).

## 3. Relays (private)

A relay belongs to ONE person: its owner key (an identity's `ed.pub`) is set when it is deployed (Settings > Your relay > Set up my relay, agent 'relay'). Only the owner's devices and the people the owner has ADDED may use it. No relay origin is built into the app.

- **Home relay**: where a person receives messages. Their own, or a friend's relay they joined through an invite. Records in `<data>/friends/relays.json` (synced): `{relays: {<key>: {origin, role: 'owner'|'member', scopes: ['message', 'sync'?], mbox, at, tokenSealed?, sync?: true}}, home: <key>|null, sync?: {on, at}}`. Two different `sync` fields (2.17.1): a relay record's `sync: true` says the person chose that (member) relay for device sync at all; the top-level `sync: {on, at}` is the person's choice to sync ALL their devices through the home relay ("Sync through your relay" on any computer; off on one computer stays that computer's own setting). `store.mjs`: `listRelays()`, `homeRelay()`, `setRelay({origin, role, scopes, mbox, token?, sync?}, {home})`, `removeRelay(origin)`; agent 'relay' calls `setRelay(..., {home: true})` when a deployment completes. **Device sync (2.17.1)** uses the HOME relay only (`lib/sync/relay-node.mjs` `readRelayInfo`): one the person owns, or a member relay with the `sync` scope that they chose for sync in Settings > Your relay (record `sync: true`: *Use a friend's relay instead*, or *Use it for sync*, `POST /api/relay/sync`). A friend's invite that grants `sync` never moves device sync by itself, and removing the home relay (*Disconnect relay*) leaves NO home relay: sync stays on the folder and the network, friends' messages wait, and the page offers the choice. Without a top-level `sync` choice, the person's own relay (role owner) is used for sync by default, the folder kept as a backup. The record reaches the person's other computers at once, in each device's sealed device.json and on a live link (docs/dev/SYNC_FORMAT.md section 7, LIVE_SYNC.md `part`).
- **Mailbox**: a random id on the home relay (`mbox`, 16 to 64 of `[A-Za-z0-9_-]`). The owner's devices pull it, signing with the identity.
- **Drop token**: a capability to post into one mailbox, minted by the mailbox's owner on their home relay and given to ONE friend (inside the encrypted handshake, or in an invite). Messages to X always go to X's home relay with the drop token X gave you. Revoked on remove or block.
- **Friends on different relays** simply hold each other's drop tokens. Friend codes only resolve inside one relay.

The relay sees: mailbox ids, drop tokens, directory keys (hashes), sealed blobs and envelopes, sizes and times. It never sees a name, an email, a friend id, a kind or a payload.

### What the friends engine needs from a relay (the client contract)

`lib/friends/relay-client.mjs` implements this over RELAY_PROTOCOL.md; every call is signed with the identity where the protocol says so.

| Call | Meaning |
|---|---|
| `redeem({origin, token})` | join a relay with an invite's one-time access token -> `{role:'member', scopes, mbox}` |
| `mintInvite({scopes, ttlMs})` | owner only: a one-time relay access token for an invite -> `{id, token, exp}` |
| `revokeInvite(id)` / `grants() -> {invites: [id], members: [{key, via, revoked}]}` | owner only: delete an open invite's token / what the relay has let in (to close what an invite let in) |
| `mailbox()` | my mailbox on this relay -> `{mbox}` |
| `mintDrop({ttlMs})` / `revokeDrop(drop)` | a drop token for one friend / take it back |
| `revokeMember(edPub)` | owner only: remove a member's access |
| `publish({key, blob})` / `unpublish({key})` / `lookup({key}) -> blob\|null` | the members-only directory of friend codes |
| `post({mbox, drop, env})` | store-and-forward into someone's mailbox |
| `pull({after}) -> {items: [{rid, env}], cursor}` / `ack(rids)` | read my mailbox; acked items are deleted |
| `listen(onEnv) -> stop` | optional push while online (WebSocket) |

## 4. Friend codes

`ALEX-7K2QX9`: up to 8 letters of the first name, a dash, 6 characters of Crockford base 32 (30 bits: with the relay's members-only, rate-limited lookups, guessing a code is out of reach). Typing is forgiving (case, spaces, a missing dash; in the last 6, O reads 0, I and L read 1, U reads V). Rotatable (the old one is unpublished at once).

Published in the home relay's members-only directory: key `SHA-256("opendash-friend-code-v1\n" + code)` (hex), blob = `{card, drop}` sealed with `HKDF(code, "opendash-friend-code-v1", "opendash-friend-code-card")`, where `drop` is a drop token for the owner's mailbox that requests through this code use (minted with the code, revoked when it is rotated; the relay limits it to 100 posts a day). A lookup gives the card only to someone who knows the code; a request through it still needs the owner's approval with the confirmation code. Relay calls: RELAY_PROTOCOL.md section 7 (signed with the identity's Ed25519 key through `lib/relay/auth.mjs`).

## 5. Cards and invites

Card (public, self-signed): `{v, id, x, ed, name, relay: {origin, mbox}|null, at, sig}`, `sig = Ed25519(canon(["opendash-friend-card-v1", v, id, x, ed, name, relay, at]))`. MINIMAL on purpose (anyone who guesses a friend code, the relay operator included, or who sees a forwarded invite can read it): the public keys, the mailbox and the FIRST name only (`firstName()`), nothing else; no avatar, status or profile, which arrive only after the friendship is confirmed (`profile`). Never carries a token.

Invite text (the "invite code"; the QR code and the link carry the same text):

```
ODF1.<base64url(JSON {v:1, t:'invite', id, card, s, exp, drop?, relay?: {origin, token, scopes}})>
```

- `id` (16 hex) and `s` (16 random bytes): single use. The inviter keeps open invites (in `friends/me.json`, `s` sealed at rest) until used, expired (7 days by default, at most 30) or cancelled. The request proves it holds `s`: `proof = HMAC-SHA-256(s, "opendash-friend-invite-v1\n" + id + "\n" + requesterId)`. The first valid request uses the invite up; any later one is dropped.
- `drop`: a drop token for the inviter's mailbox, so the request can be delivered.
- `relay`: only from a relay OWNER: a one-time relay access token with the scopes the owner chose (`message`: can message me; `sync`: can also sync their own devices through my relay). Redeeming makes the friend a member and, if they have no home relay yet, their home relay (it is redeemed when the link is pasted, so a new person has a mailbox for the handshake). The inviter keeps the token's relay id (`rid` in the invite record) and closes it (`closeRelayInvite`: `DELETE /v1/admin/invites/<rid>`): on Cancel and expiry (and whoever redeemed it without asking is taken off the relay), on Decline (whoever redeemed it goes), on Approve (anyone but the new friend goes), and at a key renewal (every open invite on the relay goes). If the relay can't be reached, the record stays as `cancelled` (with `closing.keep` after an answer) and the background pass tries again.
- The link is `<relay origin>/i#ODF1....` when a relay is known (the relay serves a small page that says "open OpenDash > Friends > Paste invite"); the text after `#` never reaches the relay's server.
- **Short link** (the one the app hands out; a QR code fits): `<relay origin>/i#ODF1.<token>.<check>`, about 100 characters. `token` = 16 random bytes (base64url, 22 characters); `check` = the first 6 characters of base64url(SHA-256("opendash-friend-short-check-v1\n" + origin + "\n" + token)), so a link that was cut short or mistyped says so before anything is asked. The invite object above is kept on the inviter's home relay (RELAY_PROTOCOL.md 7.8) SEALED with AES-256-GCM under HKDF(token, "opendash-friend-short-v1", "opendash-friend-short-key") (AAD: the key and the origin), under `key = hex(SHA-256("opendash-friend-short-v1\n" + token))`: the relay holds a hash and ciphertext, never the token, so it cannot read the invite. Redeeming fetches it (anyone with the link may), opens it and checks it exactly like the long text (`core.mjs` `parseShortInvite`, `openShortInvite`, `checkInvite`). The inviter deletes the relay's copy when the invite is first used, cancelled or expires (`dropShort`). A relay from before 7.8 answers 404: the app then hands out the long link, says why, and shows no QR code. The long `ODF1.<base64url>` text is accepted everywhere as before; friend codes stay for people on the same relay.
- The Add a friend dialog shows the short link's QR code (the app's encoder, `58-settings-sync-qr.js` `syncQrSvg`, up to 213 bytes), Copy link, and a ready-to-send message: `Join me on OpenDash: <link>` with where to paste it.

## 6. The handshake and the confirmation code

R: the requester (typed a code or pasted an invite). A: the approver (the code's or invite's owner).

```
R -> A  friend:request  {card_R, commit = H(nR, card_R), how: code|invite, inv?, proof?, drop: R's drop}   sealed to A (envelope 'rq')
A -> R  friend:hello    {nonce: nA}            automatic: no secrets, no drop token yet
R -> A  friend:reveal   {nonce: nR}            A checks the commit; both show code(card_R, card_A, nR, nA)
A       compares the code with R (in person, a call, a message) and approves
A -> R  friend:approve  {drop: A's drop}       A: friends. R: friends too, except added BY CODE (below)
R       added by code: compares the same code and says "The codes match" (confirm) before or after A approves
        friend:decline / friend:mismatch       A said no, or either said the codes differ
```

- **Added by code, both sides compare (2.17.1).** A friend code is looked up on a relay, so a relay operator could answer with someone else's card. R therefore confirms the code too: an approval that arrives before R's "The codes match" waits on R's record (`flow.approved`), and what A sends meanwhile is held in memory and handled once R confirms (dropped if R says the codes differ). R's "The codes are different" after A approved ends A's side too (`friend:mismatch` to a friend A approved by code: A forgets them and keeps a `declined` record, `why: codes-differed`). An invite carries A's card itself, so R does not confirm there. `POST /api/friends/confirm {id}` (`engine.confirm`).

- R commits to its nonce before it sees A's, so nobody in the middle (the relay included) can choose keys that make both codes equal (one chance in a million).
- `code = 6 digits of SHA-256(JSON ["opendash-friend-sas-v1", R.id, R.x, R.ed, A.id, A.x, A.ed, nR, nA])`, shown as `482 913`.
- A's screen: "Sam wants to connect. Check that Sam sees 482 913." Approve / Decline / Block. R's screen, added by code: "Check that Alex sees this same code: 482 913" with "The codes match", "The codes are different" and Cancel; then "Waiting for Alex to approve". Added with an invite: "Waiting for Alex to approve. Tell them your code: 482 913", with Cancel and "The codes are different".
- Both asked at once: the side with the larger id answers as A; the other keeps waiting as R.
- A request from a blocked id, a used or expired invite, or a second request for a pending one is dropped quietly.

## 7. Records and files

| Where | Synced | What |
|---|---|---|
| secret store `friends-identity` | keyring only | the identity (section 2) |
| `<data>/friends/me.json` | yes (e2e only) | `{prefs: {presence: {share, state}, direct}, code: {code, at}, invites: {id: {...}}, mine: {kind: {at, b}}}`: my settings, my friend code, open invites (secrets sealed), what I last published per latest kind |
| `<data>/friends/friends.json` | yes (e2e only) | `{friends: {id: record}, moved: {oldId: {to, x, ed, nonce, at, conflict?}}}` (below; `moved`: friends who renewed their keys, section 15, kept 90 days) |
| `<data>/friends/relays.json` | yes (e2e only) | section 3 |
| `<data>/friends/feed.json` | yes (e2e only) | `{msgs: {msgId: entry}}`: events between you and friends, newest 3000 / 400 days |
| `<data>/friends/shared.json` | yes (e2e only) | `{items: {"<friendId>|<kind>": {f, k, at, lc, b}}}`: the newest value of each latest kind per friend |
| `<data>/friends/garden.json` | yes (e2e only) | gardens with friends (agent 'garden-social', docs/dev/GARDEN.md section 11): visits both ways, the guestbook, older visits counted by month, what you have seen of each friend's garden |
| `<data>/friends/local.json` | no | this computer's outbox, seen ids, relay cursors (`"<mbox>:<n>"`, per mailbox), presence and addresses heard, a key renewal it runs (`rotation`) and the old identity's mailboxes it still reads (`retiredBoxes`) |

"e2e only": listed in `lib/sync/manifest.mjs` SYNC_FILES (block `── friends ──`) with `e2eOnly`, so they travel only under end-to-end encrypted sync. Without sync, they stay on this computer.

Friend record (`core.mjs` `normFriend`):

```
{id, x, ed, name, nick?, status: requested|incoming|friend|removing|declined|blocked|frozen,
 role: 'r' (I asked) | 'a' (they asked), how: code|invite,
 relay: {origin, mbox} | null, dropSealed?: their drop token (sealed at rest),
 myDrop?: {origin, sealed}: the drop token I gave them (to revoke),
 flow?: {commit, mine, theirs, code, inv, at}: the handshake while it runs,
 addedAt, friendsAt, updatedAt, removeAt?, removeAs?, wasStatus?, why?,
 perms?: {scope: bool}   (agent 'perms'),
 ask?: {oldEd, at, added?}: they renewed their keys and ask to keep using MY relay (section 15),
 renewedFrom?: their previous id}
```

Feed entry: `{id, f: friendId|null, dir: 'in'|'out'|'local', k: kind, at, lc, b, g?, txt?, ic?}`.

## 8. The message channel

```js
friends.send(friendId | [friendIds], kind, body, {group?})   // -> {id, sent, queued}
friends.send(friendId | [ids] | '*', kind, null, {revoke: true})   // take a latest / handler kind back
friends.publish(kind, body) / friends.unpublish(kind)         // latest / handler kinds to every allowed friend; stop and take back
friends.on(kind, handler(msg, friend))                       // kind exact, a family 'share:*' / 'space:*', or '*'
```

- **Envelopes** (the only things any transport carries): pair `{v:1, t:'pm', id, p, iv, ct}`; request `{v:1, t:'rq', id, eph, iv, ct}`. Inside: `{k, b, from, to, at, lc, g?, n?}`.
- **Per pair**: key = HKDF(X25519(my x, their x), salt = both raw public keys sorted, "opendash-friends-pair-v1"); `p` = 8 bytes of HKDF(..., "opendash-friends-pair-tag-v1") so the receiver finds the pair without a friend id in the clear. AAD binds the shape, id and tag. A message whose inner `from` / `to` do not match its pair is dropped.
- **Groups (per party)**: one sealed copy per member, all with the same id, carrying `g` (the group or space id) and `n` (the member ids). Agent 'together' owns group membership and rotates any group keys in `onRemoved`.
- **Order**: `lc` is a hybrid logical clock in milliseconds (never below the wall clock nor anything seen); entries sort by `(lc, at, id)`.
- **Dedupe**: by message id (relay redelivery, two roads, two devices pulling at once); ids are remembered 45 days.
- **Store-and-forward**: to the friend's home relay mailbox with their drop token; failures wait in this computer's outbox and retry (1 min, doubling to 1 h, 14 days at most).
- **Live push**: the relay's `listen` while online; and **direct links** (section 10) whenever both are online, tried first.
- **Live kinds** (`store: 'live'`, not the engine's own; Together's Plan together cursors and typing and Focus together, `together:live`): delivered only to friends who are online RIGHT NOW: over an open direct link, else as a post into their relay mailbox that their live socket gets at once and acks, and only when they were heard from in the last 2 minutes or share a presence that is not offline. Never stored (no feed, no shared item, no outbox, not in the persisted seen ids), never queued or retried; dropped silently when the friend is offline. Per friend and kind at most `rate` messages (default 10 a second, 300 a minute; receivers allow twice that), bodies at most `max` (default 1 KB, never over 4 KB). Over a relay a live message is still a post against the friend's drop token (100 a day), so it goes at most every 3 seconds and 30 times a day per friend: real-time cursors need a direct link. A receiver drops a live message read from the mailbox later (not pushed), or more than its `ttl` (60 s) plus 5 minutes of clock skew old.
- **Validation before anything else**: envelope shape, decryption, then the kind's schema (section 9). Anything that fails is dropped and counted, never shown, never passed to a handler.
- **Who runs handlers**: the device that received the message. Handlers must be idempotent by message id (another of the person's devices may receive the same message).

## 9. Kinds

Every kind has a schema (`core.mjs` `defineKind(kind, schema, {store, scope, passive, xp, max, rate?, ttl?})`, schema builders `S.str/text/int/num/bool/id/fid/day/ms/oneOf/color/emoji/list/obj/map/opt/tuple`). Storage: `latest` (only the newest per friend, `shared.json`), `event` (the feed), `live` (never stored, queued or retried: only to friends online now, section 8; `rate: {sec, min}` and `ttl` apply), `handler` (validated and handed to handlers and open pages, never stored by the engine: the kind's owner keeps what it needs; agent 'perms' uses it for its `share:<scope>` kinds).

**Taking something back.** `send(to, kind, null, {revoke: true})` (or `unpublish(kind)` for every friend, which also stops sending it to new friends) sends `friend:revoke {k: kind}` for a `latest` or `handler` kind, whatever the policy says now. The receiver deletes its stored copy (`latest`) and its handlers and open pages get the message with `revoked: true` and `b: null`, so the kind's owner deletes its own copy too.

| Kind | Store | Scope | Body | Owner |
|---|---|---|---|---|
| `friend:request` `friend:hello` `friend:reveal` `friend:approve` `friend:decline` `friend:mismatch` `friend:remove` `friend:relay` `friend:revoke` | live | | the handshake and housekeeping (section 6), taking a kind back | engine |
| `friend:rekey` `friend:rekeyed` `friend:relaymoved` | live | | identity rotation (section 15) | engine |
| `renewed` (local) | event | | a feed line: a friend renewed their keys (`{twice: true}`: two different renewals, the friendship is paused) | engine |
| `presence` | live | presence | `{s: online\|focusing\|travelling\|away\|offline, ttl?}` | engine |
| `live:addr` | live | direct | `{eps: [{k, a, p, m?}], port}`: where to dial me directly | engine |
| `profile` | latest | profile | `{name, pronouns?, bio?, emoji?, status?, until?, working?, color?, city?, avatar?, badges?, places?, look?, at?}` (6 KB; no pictures, no URLs). `look` (2.18, agent 'you'): `{banner?, col?, col2?, scene?: {pack, item}, np?: {font?, weight?, col?, fx?}, title?, favs?: [emoji], cur?: {k, t}, tint?}`: ids, colours and one 60-character line, mapped through `src/app/97-profile-0look.js` on the receiver (an unknown id is the default; a scene the receiver lacks is the person's colour). `avatar` is one allow-listed id per part of the avatar kit (2.18, agent 'wardrobe': about 70 parts); only parts that differ from the default are sent, and a missing or unknown id is the default on arrival. Other agents add optional fields with `extendProfileKind(field, schema)` (`lib/profile-avatar.mjs`) and `profileExtend({key, wire, sanitize, card})` on the page. `pet` (2.18, agent 'pets', `lib/profile-pets.mjs`): `{species, breed?, coat?, marks?, eyes?, collar?, collarCol?, bandana?, bandanaCol?, bow?, bowCol?, hat?, hatCol?, glasses?, glassesCol?, name? (24 characters), walks?: false}`: ids only but the name, mapped through `src/app/97-pets-0kit.js` on the receiver (`petSanitize`: an unknown species means no pet, any other unknown id the default); drawn on their card, beside their figure and walking with them when they visit your scenes; `walks: false` keeps it home | agent 'profile' / 'you' / 'wardrobe' / 'pets' |
| `pet:items` | latest | profile | `{v: 1, d?: 'YYYY-MM-DD', items: [design]}` (2.22, agent 'pets', `lib/friends/pet-items.mjs`; 24 KB, at most 3 designs): the custom accessories the sender's pet wears NOW. A design is `{v, id, label (32), slot: head\|face\|neck, cols: [#rrggbb x1-3], shapes: [{p, f?, s?, w?, o?}] (at most 40), fit?: {dx, dy, s, rot}}`: path data and colour references only, no pictures, no URLs, no text but the label; the sender's `fit` is already chosen for their pet's species and their description is never sent. The profile's `pet` field names the worn ones (`itemHead`, `itemFace`, `itemNeck`: `pi-` ids; `coat`, `eyes` and the accessory colours may also be `x` + six hex digits for an exact colour, `coatB` / `coatC` the belly and pattern colours); a receiver draws a design only when both arrived, after checking it again with `petItemClean` (`src/app/97-pets-0kititems.js`: path commands M L H V C S Q T Z only, every point within bounds, colours only as the design's own slots), so an app without this kind, or a design that fails, shows the plain pet. A kind of its own because an oversize `pet` field would make an older app drop the whole 6 KB profile. Sent when what the pet wears changes and at most once a day otherwise (`d` makes the body differ); a friend whose profile sharing is turned off is not sent a take-back of it (the receiver only draws it beside a profile that has a pet). Never reaches Claude, the MCP or the actions layer: it is drawn, nothing else | agent 'pets' |
| `profile:visit` | handler | profile | `{d}`: "I opened your card today", at most once a day per friend (Settings > Profile can stop it). The receiver keeps a count per day under one-way keys, never who (`lib/profile-visits.mjs`, `friends/profile-visits.json`) | agent 'you' |
| `share:game` | latest | game | `{level, title?, xp?, xpWeek?, streak?, best?, quests?, focusMin?, at?}` | engine (from the Game) |
| `share:<scope>` | latest | `<scope>` | `{at?, text?}` until the owner of the scope defines it | agent 'perms' / others |
| `cheer` | event | cheer | `{emoji?, text?, re?}` | agent 'together' |
| `quest` | event | quest | `{id, state: offer\|accept\|progress\|done\|drop, title?, n?, of?, due?}` | agent 'together' |
| `focus` | event | focus | `{id, state: invite\|join\|start\|done\|leave, min?, title?}` | agent 'together' |
| `challenge` | event | challenge | `{id, state: offer\|accept\|progress\|win\|lose\|draw\|drop, title?, score?, of?, until?}` | agent 'together' |
| `space:<id>` | event | space | `{op, item?, title?, done?, at?}` | agent 'together' |
| `together:live` | live | space | `{t: cursor\|edit\|here\|focus\|nudge\|cheer, space?, x?, y?, sel?, card?, text?, on?, mins?, until?, goal?, kind?, ref?}` (1 KB) | agent 'together' |
| `fun:wave` | handler | cheer | `{t: wave\|high5\|nudge\|thanks, a?: high-five id}` | agent 'fun' (lib/friends/fun.mjs) |
| `fun:react` | handler | cheer | `{re: feed entry id, e: reaction id, on}`: only on an entry the two of you share | agent 'fun' |
| `fun:gift` | handler | cheer | `{g, t: sticker\|emote\|cosmetic, item, wrap, line?}`: every value an id from `99f-fun-0rules.js` | agent 'fun' |
| `fun:day` | handler | game | `{d}`: "I finished something that day" (duo streaks), once a day per friend | agent 'fun' |
| `fun:event` | handler | cheer | `{ev, t: knock\|treat\|trick, n?}`: seasonal friend events; an answer counts only for an open knock | agent 'fun' |
| `fun:line` | event (local) | | `{t: duo\|quest\|tier\|combo, n?, q?, ev?}`: milestone lines made on this side | agent 'fun' |
| `garden` | latest | garden | `{v, lv, season, areas, plants: [[id, x, y, stage, variant, flags]], decor: [[id, x, y, r, v]], heart?, at, hearts?}` (30 KB; ids, cells and numbers only; cleaned with the catalogue's `gardenSnapshotClean` before drawing) | agent 'garden-social' (lib/friends/garden.mjs) |
| `garden:ask` | handler | gardenvisit | `{v}`: "send me your garden" (answered with the last snapshot when you share it with them, every 10 minutes at most) | agent 'garden-social' |
| `garden:act` | handler | gardenvisit | `{t: visit\|water\|gift\|react\|sign\|like, p?, x?, y?, k?: seed\|decor, item?, e?, txt? (one line, 140)}`: checked against the catalogue and per-day caps, taken only when you share your garden with them; never applied by the server (the page applies a watering to your own garden when it fits) | agent 'garden-social' |
| `garden:line` | event (local) | | `{t: shared\|level\|bloom\|mylevel\|myribbon, n?, p?}`: garden lines made on this side | agent 'garden-social' |
| `owed:share` | handler | owed | `{ref, what (one line, 80), amount, cur, date, alt?: {amount, cur}}`: one person's own part of one split. Sensitive: sent only by `/api/owed/share` on the person's press, the body built field by field (`lib/owed-friends.mjs` `shareBody`), never other people's shares, the whole payment or any bank data; `ref` is random per person. `/api/friends/send`, `/publish` and `/feed` refuse `owed:*`; no assistant tool | agent 'owed' (lib/owed-friends.mjs) |
| `owed:paid` | handler | owed | `{ref, on}`: "I've paid" (or Undo). Counts only from the friend the ref was sent to; a question on the person's page in their own figure, never a mark | agent 'owed' |
| `owed:close` | handler | owed | `{ref, why: paid\|gone}`: it was settled or taken back; their card says so | agent 'owed' |
| `postcard` | event | postcard | `{pack, item, tod: dawn\|day\|dusk\|night, season: spring\|summer\|autumn\|winter, wx? (the scene engine's 12 weather kinds), caption? (one line, 140 chars), outfit? (one safe id per figure part), at?}` (2 KB; unknown fields dropped; drawn by the receiver's own engine, a scene it lacks shows as a plain card) | agent 'scenes' (lib/friends/postcards.mjs) |

Another agent refines a documented kind or adds one by calling `defineKind` (imported from `lib/friends/core.mjs`) at the top level of its own module: the registry is one per process, and every route file is loaded before the server starts the engine. A later definition of the same kind replaces the earlier one.

**Permissions.** Before sending, the engine asks `allowed(friend, scopeOf(kind))`: the friend must be a confirmed friend, and `friend.perms[scope]` decides when set; `presence` needs BOTH the tab's "Show friends when I'm around" switch (off by default) and the friend's scope (a policy cannot override the switch); otherwise `direct` follows "Connect directly" (on), everything else is allowed. Agent 'perms' replaces it with `app.ctx.friends.setPolicy(fn(friend, scope) -> bool)` and owns `perms` editing. Incoming messages of a scope you turned off for a friend are still accepted (it is what THEY share).

## 10. Direct links

`lib/friends/direct.mjs` reuses `lib/sync/live/session.mjs` (Noise-KK-style handshake, sealed frames) with a friends PeerAuth: `deviceId` = my friend id, `peer(id)` = the X25519 key of a CONFIRMED friend (anyone else: `unknown`, dropped before any key work), group `HKDF("opendash-friends-direct-v1")`, constant key id, psk derived from the same label (authentication rests on the static keys). Frames are at most 256 KB; one link per friend (the smaller id's dial wins), at most 16 links; listening on TCP 41736 (next free), never mapped on the router. Addresses travel as `live:addr` messages (encrypted, only to friends allowed `direct`), LAN and global IPv6 endpoints only. On a link: `{t: 'env', env}` frames carrying the same envelopes, so delivery, validation and dedupe are identical. `DASHBOARD_FRIENDS_DIRECT=off` (or `DASHBOARD_LIVE_SYNC=off`) turns them off; throwaway data folders listen on loopback only.

## 11. Presence

Opt-in and coarse: `online`, `focusing` (the focus timer runs), `travelling` (this computer is in another time zone than home), `away` (the page hidden for 10 minutes); `offline` once its `ttl` runs out (3 hours as sent; 15 minutes when a message has none). The page tells the server its state (`POST /api/friends/presence`); the server sends `presence` when it changes and every 2 hours (each send is one post per friend, and a drop token allows 100 a day), and `offline` when it stops cleanly. An open direct link also counts as online. Never stored, never in the feed. The relay's own presence slot (RELAY_PROTOCOL.md 7.6) is not used: it would show the relay a state.

## 12. Friendship

`core.mjs` `friendshipStats(entries, {friendsAt, today, dayOf})`: XP from non-passive events either way (each kind's `xp`: cheer 4, quest 8, focus 6, challenge 8, space 2, others 3; at most 60 a day) plus 25 for becoming friends; level n needs 30 x n more XP (titles from "New friends" to "Lifelong friends"); the streak counts days in a row with at least one such event, one quiet day a week forgiven; milestones at 1 week, 1 month, 100, 500 and 1,000 days and every anniversary of `friendsAt`. Nothing is ever taken away.

## 13. APIs

### Server (`app.ctx.friends`)

`ready()`, `me()`, `list()`, `friend(id)`, `send(to, kind, body, opts)`, `publish(kind, body)` (latest kinds, to every allowed friend; kept and sent to new friends when they are approved), `on(kind, fn)`, `onRemoved(fn(friend, {blocked, theyLeft, unblocked}))`, `onChange(fn)`, `feedPost(event)`, `setPolicy(fn)`, `defineKind(...)`, `feed({friend, kind, limit, before})`, `shared(friendId, kind)`.

Identity rotation (section 15): `rotateIdentity() -> rotation view`, `rotation()`, `rotationCheck()`, `relayRole() -> 'owner'|'member'|null`, `answerRelayAsk(id, allow)`, `onRotated(fn({source: 'here'|'sync', oldEd, newEd, role, origin}))`, `onRekeyed(fn(oldId, newId, friend))` (a friend moved to a new id: **agents that keep their own records by friend id (Together's spaces, perms) move them here**).

### HTTP (same-origin, JSON)

| Route | Body | Answer |
|---|---|---|
| `GET /api/friends` | | `{ok, me, friends: [view], counts, relay, direct}` |
| `GET /api/friends/friend?id=` | | `{ok, friend: view, shared: {kind: {at, b}}, feed: [entry]}` |
| `GET /api/friends/feed?friend=&kind=&limit=&before=` | | `{ok, entries}` |
| `POST /api/friends/me` | `{name?, presence?: {share?, state?}, direct?}` | `{ok, me}` |
| `POST /api/friends/code/rotate` | | `{ok, code}` |
| `POST /api/friends/add` | `{code}` or `{invite}` (a short link, a long link or the long text) | `{ok, friend}` |
| `POST /api/friends/invite` | `{ttlDays?, relayScopes?: ['message','sync']}` | `{ok, id, text, link, longLink, short, shortWhy, message, exp, relayScopes}` (`link`: the short link when `short`, else the long one; `text`: the long invite text; `message`: ready to send) |
| `POST /api/friends/invite/cancel` | `{id}` | `{ok}` |
| `POST /api/friends/approve` `/confirm` `/decline` `/mismatch` `/cancel` | `{id}` | `{ok, friend}` (`confirm`: the requester's "The codes match", added by code) |
| `POST /api/friends/remove` | `{id, block?}` | `{ok, undoUntil}` |
| `POST /api/friends/remove/undo` `/unblock` | `{id}` | `{ok, friend}` |
| `POST /api/friends/send` | `{to, kind, body, group?}`, or `{to: id\|[ids]\|'*', kind, revoke: true}` | `{ok, id, sent, queued}` (a live kind: `{ok, id, sent, queued: 0, skipped, offline, live: true}`) |
| `POST /api/friends/publish` | `{kind, body}`, or `{kind, revoke: true}` (unpublish) | `{ok, sent}` |
| `POST /api/friends/feed` | `{event}` | `{ok, entry}` (a feed post: `friendsFeedPost`) |
| `POST /api/friends/presence` | `{state}` | `{ok}` |
| `POST /api/friends/check` | | `{ok, got}` (pull the mailbox now) |
| `POST /api/friends/rotate` | | `{ok, rotation}`: renew my keys (or go on with a renewal in progress) |
| `GET /api/friends/rotation` | | `{ok, rotation: {step, role, relayHost, friends, moved, failed, waiting: 'working'\|'relay-update'\|'relay-owner'\|'friends'\|null, cancelled, error, at, doneAt} \| null}` |
| `POST /api/friends/relay-ask` | `{id, allow?}` | `{ok, friend}`: let a friend's renewed key keep using my relay (`allow: false`: not now) |
| `GET` / `POST /api/relay/rotate` | | `{ok, state: idle\|running\|done\|error\|cancelled\|elsewhere\|not-needed, error?, at}`: deploy my own relay again with the new owner key (`server/routes/relay-rotate.mjs`) |

Errors are `400 {error, code}` with a plain sentence the page shows as it is.

A friend `view` never carries private keys, tokens or nonces: `{id, ed, name, nick, status, role, how, step, code, theyApproved, addedAt, friendsAt, presence, relayHost, perms, profile, game, petItems, friendship, relayAsk, renewed}` (`petItems`: the body of their `pet:items`, 2.22; `ed`: their PUBLIC identity key, to match relay members; `me.ed` is yours); `step` is `sent` / `answering` / `check` / `approve` while the handshake runs (`check` on either side: compare the code now; the requester has it only when added by code), `code` the confirmation code once both sides have it, `theyApproved` (requester) their approval waits for your "The codes match".

### Page

```js
Friends.ready                      // Promise: the first /api/friends answer
Friends.me() / Friends.list() / Friends.get(id)
Friends.send(to, kind, body, {group}) / Friends.publish(kind, body) / Friends.unpublish(kind)
Friends.send(to, kind, null, {revoke: true})    // take it back from some friends
Friends.on(kind, fn(msg, friend)) -> off      // live messages while the page is open
Friends.shared(id, kind) / Friends.feed({friend, kind, limit})
Friends.presence(id)                // 'online'|'focusing'|'travelling'|'away'|'offline'
Friends.describe(kind, fn(entry, friend) -> {icon, text, tone?})   // how a feed line reads
Friends.open(id)                    // that friend's page
friendsFeedPost({kind, text, icon, to?, body?})   // agent 'together': a line in the hangout feed (and to friends with `to`)
profileAvatarEl(friend, {size})     // agent 'profile', when defined: the avatar element
friendsNameForRelayKey(edPub)       // a relay member's identity key -> the friend's name, 'You', or null (Settings > Your relay)
friendsRenewKeysDialog({device?})   // renew your friend keys (Settings > Friends, the Friends tab's settings)
friendsOfferLockOut(deviceName)     // after a device is removed from sync: "Lock it out" (Settings > Sync's removal is wrapped to call it)
```

The server tells open tabs on `/api/events`: `event: friends`, `data: {type: 'changed'}`, `{type: 'identity-rotated', oldEd, newEd, role, source}` (the page dispatches `opendash:identity-rotated` on `document`), `{type: 'rekeyed', from, to}`, `{type: 'msg', msg}` (validated), `{type: 'live', msg}` (a live kind: handlers only, nothing to reload), `{type: 'presence', id, s}`.

## 14. Gaps (version 1)

- No forward secrecy for relay messages (static pair keys); direct links have it. **Not needed now** (the owner's call, 24 Oct 2026): what a relay stores is sealed end to end, mailbox items are deleted when read (30 days at most), and a stolen device is handled by renewing the keys (section 15), after which nothing new is sealed to the old ones. Someone who copies relay traffic AND later steals an identity key could open what that pair sent before the renewal. If it is wanted later: a per-pair ratchet (an X25519 step per round trip, the way direct links already do it) or short-lived signed prekeys in the friend's card, with the static pair key only as the first message's fallback; the envelope shapes would get a `v: 2`.
- Direct links reach friends on the same network or over global IPv6 only (no router mapping for the friends port, on purpose).
- A second identity made on another device before pairing keeps working for messages already addressed to it, but friends made with it are not moved to the kept identity automatically (a key renewal, section 15, moves every friend of every held identity to the new one).
- Removal cannot be forced on the other person's device: their app is asked to delete, and a well-behaved one does.
- Short invite links need a relay with RELAY_PROTOCOL.md 7.8 (deployed from 2.17 on); with an older one the long link (no QR code) is handed out. Settings > Your relay's "Use a friend's relay" (`lib/relay/deploy.mjs` `useInvite`) takes both forms: a short link is fetched (`GET /v1/inv/<key>`), opened and checked with `checkInvite` the way Friends > Add a friend does.
- The relay client signs through `lib/relay/auth.mjs` (part of 2.17; it is still loaded on first use, so a build without it says plainly that relay support is not included). Which relay addresses are accepted, and the local relay for development (`OPENDASH_RELAY_ALLOW_LOCAL=1` only): RELAY_PROTOCOL.md section 12.
- Fun (agent 'fun', `lib/friends/fun.mjs`): a friend whose OpenDash predates the `fun:*` kinds drops them quietly (the sender sees "sent"). Daily caps and duo days live in `friends/fun.json`, which reaches your other devices only through sync, so two devices offline from each other can each use a day's caps. Duo streaks compare each side's own calendar day.

## 15. Identity rotation (built in 2.17)

Why: removing a lost device from sync rotates the SYNC key, and revoking its relay certificate stops its certificate, but a device that still holds the identity private key can still sign as the person (relay requests, friend messages, cards). The fix is a new identity.

`rotateIdentity()` (engine; `POST /api/friends/rotate`). The page offers it in Settings > Friends, in the Friends tab's settings, and right after "Remove this device" in Settings > Sync ("Lock it out": `friendsOfferLockOut`, a wrapper around Settings > Sync's `_syncPost`; the dialog is "Lock the removed device out"). Steps (`local.json` `rotation`; each one resumable, the background pass goes on every 30 seconds, and the page shows how it goes):

1. **What cannot move is closed.** Open invites (their drop tokens revoked), requests still in progress (`friend:remove` to the other side), the friend code (unpublished). The page says so.
2. **New identity.** `N = newIdentity()`; secret store `{v: 1, current: N, others: [], retired: [{id, at, until: at + 14 days}...], retiredKeys: [O...]}`: EVERY identity held before (the current and any `others`) is retired. `pickIdentity` never picks a retired id again (whatever an older keyring brings); `retiredKeys` keep the old private halves only to OPEN pair messages from friends and to finish the move on the relay, and are deleted at `until`; requests (`'rq'`) never open with them. Pair keys are static, so whoever holds O could seal a message "from" any friend under it: a message that opens only with a retired key is taken only on the computer running that renewal (`local.rotation.from`), only from a friend made before it who has not yet moved to N (`told[f] !== 'ok'`), and never `friend:remove` or `friend:relay` (`retiredMayOpen`). `lib/sync/relay-node.mjs` signs new device certificates only with `current` and `others` (so with N); a certificate the old identity made BEFORE the renewal stays in use while the relay still accepts it, so the keyring with N reaches the person's other devices through the sync group, and once the relay says "not a member" the certificate is made again with N and the sync group moves to N on enrolment (RELAY_PROTOCOL.md 5.1: only when the old identity has no access any more, and only with the group's current capability). Secrets sealed at rest (drop tokens, relay tokens) are opened with the old key and sealed again with N; opening falls back to any held identity, so a device that gets the files before the keyring still works. The keyring extra carries `retired` and `retiredKeys` too, so the person's other devices adopt N (`takeIdentities`; the engine's `reload()` then restarts direct links and tells `onRotated` with `source: 'sync'`). A device removed from sync never gets it.
3. **Relay.**
   - **Owner** of the home relay: while the relay still knows the OLD key as `OWNER_KEY`, O lets N in as a member (`PUT /v1/admin/members/<iid(N)> {key, scopes: [message, sync]}`), N gets its own mailbox, and friends are told (step 4) with N's new mailbox and fresh drop tokens: nothing is lost in between. Then `onRotated` / `'identity-rotated'`: `server/routes/relay-rotate.mjs` deploys the relay again with `OWNER_KEY = N.ed.pub` through the existing deploy path (`createRelayService().connect()`: same Worker, same address, the job Settings > Your relay shows), by itself when THIS computer deployed it before (`deploy.json` in its device folder), else when the person presses "Update my relay" (Cloudflare may ask to sign in). The renewal is done once `GET /v1/me` as N answers `owner`; O is then nobody on the relay (its mailbox and certificates stop working). Until then the page says plainly that the relay still trusts the old keys.
   - **Member** of a friend's relay: N asks for its own mailbox; usually it cannot yet (the grant is per identity key), so friends keep posting to O's mailbox, which this computer keeps reading with O (`retiredBoxes`). The rekey to friends on that relay carries `relayAsk: true`; the friend who OWNS it sees "Sam renewed their keys: let them keep using your relay?" (`POST /api/friends/relay-ask`: N gets O's scopes and quota). Once N gets its mailbox, every friend who moved gets it (`friend:relay`), the friend code is made again, and when all have moved (or after 3 days) `friend:relaymoved {old: O.ed}` asks the owner's app to revoke O (it does, after checking it is the key it let N replace; by itself after 2 days otherwise). Invites wait until then, with a plain note.
4. **Tell every friend**, as a pair message under the OLD pair key (only O's friends can open it): `friend:rekey {card: N's card, drop?: {origin, mbox, drop}, nonce, sigOld, sigNew, relayAsk?}` where `sigOld` = Ed25519 by O and `sigNew` = Ed25519 by N, both over `canon(["opendash-friend-rekey-v1", O.id, N.id, N.x, N.ed, card.at, nonce])` (`core.mjs` `signRekey` / `verifyRekey`). Queued and retried like any message. Then direct links restart under N.
5. **On the friend's side**: check `sigOld` against the stored `f.ed`, `sigNew` and the card against N; then move the record from O.id to N.id (keeping `friendsAt`, `perms`, `nick`, the name), re-key their feed entries (`f`, `to`), `shared.json` items (`<N.id>|<kind>`) and this computer's notes (presence, addresses, outbox), store the new route (the drop in the rekey, else the old one), keep a tombstone `friends.json` `moved[O.id] = {to, x, ed, nonce, at}`, add a feed line "Sam renewed their keys", tell `onRekeyed` handlers, and answer N with `friend:rekeyed {}`. A rekey is taken once per old id: O's pair key then opens nothing but another `friend:rekey` (everything else from O, a thief included, is dropped). If a DIFFERENT rekey for the same old id arrives (the person and a thief racing), the friend's app sets the moved record's status to `frozen` (nothing sent or accepted), says "Check with Sam: their keys were renewed twice" and asks for a fresh invite; Remove clears it.

Honest limits: members a thief let onto your own relay with O before it was redeployed stay members (the relay does not record which owner key added them; open invites are closed at step 1): Settings > Your relay lists every member with when and how they were added, to remove. Until a friend's app has moved to N, a thief who holds O can still seal shares, cheers or space edits "from" that friend into O's old mailbox (never a removal or a route change; it stops for each friend once they move). A thief who holds O and renews FIRST wins that race with friends who have not heard from the person; the double-rekey freeze and a fresh invite are the way back, and friends told out of band can Block the stolen identity. Messages a friend's app sent to the old mailbox after an owner relay was redeployed, while their app had not yet seen the renewal, are not read (the mailbox is out of reach; it expires in 30 days). Renewing on two devices at the same moment makes two new identities; friends then see two renewals and pause. Device sync's relay group belongs to the identity that made it (RELAY_PROTOCOL.md 5.1); it moves to the new identity once the relay no longer accepts the old one (a device that shows the group's current capability enrols). A device that was off during the whole renewal (it never received the new keys while the old certificate still worked, and has no folder or direct link) cannot reach the group any more: add it again (Settings > Sync > Add a computer).
