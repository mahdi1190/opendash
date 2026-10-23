# OpenDash live sync (version 1)

Live sync lets paired OpenDash devices send each other their changes the
moment they are made (well under a second on a home network), with no server
and no hosting. It sits on top of encrypted folder sync
([SYNC_FORMAT.md](SYNC_FORMAT.md), version 2): the records that travel are
exactly the sealed records each device writes to its own log in the shared
folder, and the folder (OneDrive, Google Drive, Dropbox) stays the
always-on catch-up path. Nothing is lost if a live link drops; the record
also arrives through the folder, and a record is taken once however it
arrives.

Reference implementation: `lib/sync/live/`. Platform-agnostic (no `node:`
imports, Web Crypto only, reusable by a phone or a WebRTC transport):
`wire.mjs` (framing), `handshake.mjs` (authentication and keys),
`session.mjs` (one link), `addrbook.mjs` (endpoints), `discovery.mjs` (LAN
announcements), `lease.mjs` (main computer), `nat.mjs` (UPnP / NAT-PMP / PCP
logic), `live.mjs` (the manager). Node adapters: `node-net.mjs` (TCP, UDP,
interfaces, HTTP to the router) and `node-live.mjs` (wiring, sandbox).

Live sync needs encrypted sync. Without the group key there is nothing to
authenticate with, so it does not start.

## 1. The connection ladder

Each device listens on TCP port 41731 (the next free one if taken) on all
its addresses, and dials every other member it has no link to:

1. **Same network**: an address heard in a LAN announcement (section 5)
   moments ago, then the LAN addresses in the peer's address book, the same
   subnet first.
2. **The internet**: the public address and port the peer's router forwards
   to it (section 6), or its global IPv6 address.
3. **Neither**: the sync folder, as before (10 to 60 seconds).

Both sides may dial at once. When two links to the same peer are open, the
one dialled by the device with the smaller device id is kept and the other
is closed (`duplicate`); both sides apply the same rule. A failed dial is
retried after 1, 2, 4 ... 60 s; a change in the peer's published address, or
an announcement from it, retries at once.

## 2. Framing

A frame is a 4-byte big-endian length, then that many bytes. Before the
handshake: at most 3 frames of at most 4096 bytes, each one UTF-8 JSON
object, and the handshake must finish within 5 s. After it: frames of at
most 4 MiB + 16, each one sealed (section 3). A peer that sends more than 400
frames or 16 MiB in a second, a frame of length 0 or above the limit, or
anything that fails to open, is disconnected. A link with nothing received
for 45 s is closed; each side sends `{"t":"ping"}` after 15 s of silence.

## 3. Handshake

Both devices know each other's static X25519 public key from the encrypted
member list (`lib/sync/e2e.mjs`); a device id is the fingerprint of that key
(SYNC_FORMAT.md 11.1). The handshake is Noise-KK-like, with a pre-shared
secret bound to the current key epoch.

```
I -> R  {"p":"opendash-live","v":1,"t":"hello",  "g":group,"from":I,"to":R,"k":kid,"e":eI,"n":nI,"ts":ms}
R -> I  {"p":"opendash-live","v":1,"t":"welcome","g":group,"from":R,"to":I,"k":kid,"e":eR,"n":nR,"ts":ms,"c":cR}
I -> R  {"t":"confirm","c":cI}
```

- `e`: a fresh ephemeral X25519 public key (base64url, 32 bytes); `n`: 16
  random bytes (base64url); `k`: the id of the current sync key; `g`: the group.
- `th = SHA-256(UTF-8(JSON ["opendash-live-v1", F(hello), F(welcome)]))`,
  `F(m) = [p, v, g, from, to, k, e, n, ts]`.
- `ikm = DH(eI,eR) | DH(eI,sR) | DH(sI,eR) | DH(sI,sR)` (s: static keys).
- `psk = HKDF-SHA-256(current sync key, salt "opendash-live-psk-v1", info "opendash-live-psk|<group>|<kid>", 32)`.
- `kIR | kRI = HKDF-SHA-256(ikm, salt th | psk, info "opendash-live-v1 keys", 64)`.
- `cR = AES-256-GCM(kRI, nonce 0, aad th, "opendash-live-v1 responder")`,
  `cI = AES-256-GCM(kIR, nonce 0, aad th, "opendash-live-v1 initiator")`.

The responder refuses, before any key work: another protocol (`p`), a
version it does not speak (it answers `{"t":"error","code":"version","versions":[1]}`),
a hello not addressed to it, another group, and a `from` that is not a
member of the current epoch (never paired, or removed). A different `k`
gets `{"t":"error","code":"key"}`: one side has not received the new key yet
and live waits for the folder to bring it. The initiator checks the same of
the welcome and that `from` is the device it dialled.

Why it holds:

- `DH(eI,sR)` needs R's static private key and `DH(sI,eR)` needs I's, so a
  correct `cR` / `cI` proves possession of the identity key the member list
  names. A device that borrows a member's id without its key fails at the
  confirmation (`auth`).
- `psk` comes from the current sync key: a device removed in this epoch
  cannot finish even with its own valid identity key. On a key change every
  link is closed and re-made under the new key.
- The ephemeral keys make every session's keys new, so a recorded hello,
  welcome or confirm is useless later (replay), and old traffic cannot be
  opened later (forward secrecy).
- Nothing is delivered before both confirmations check out.

**Authentication is per device on a live link.** Records stored in the
folder are authenticated only as "written by a holder of the group key"
(SYNC_FORMAT.md 11: there are no per-device signatures, so one member could
forge a record as another member). A live link is bound to the peer's
identity key, and each side accepts over a link only records whose `dev` is
that peer: live delivery is authenticated per device even though stored
records are not.

After the handshake every frame is `AES-256-GCM(k, nonce = 0^32 | counter64, aad "opendash-live-v1 frame", JSON message)`,
`kIR` from initiator to responder and `kRI` back, the counter starting at 1
in each direction. The receiver expects exactly the next counter: a frame
that is replayed, dropped, reordered or changed fails to open and the link
closes (`tampered`).

## 4. Messages

| `t` | Fields | Meaning |
|---|---|---|
| `hi` | `v`, `seen`, `seq`, `couldNotReachYou?` | sent by both on opening: `seen` = the sender's contiguous frontier of the other's change numbers |
| `recs` | `items: [{file, rec}]` | the sender's own sealed log records (SYNC_FORMAT.md 11.2) with their log file name (part of the AES-GCM associated data); answers `hi` with what the other missed, then every new record as it is written; at most about 1 MiB per frame |
| `seen` | `n` | how far the sender now has the other's records |
| `lease` | `claims` | main-computer claims (section 7) |
| `ping`, `bye` | | keepalive, closing |

A receiver takes `recs` only with `rec.dev` equal to the authenticated
peer, and passes them to the engine (`deliverLive`), which applies exactly
the checks of a folder log line (key, removal cut, AES-GCM, schema, secret
filters) and skips a `(dev, n)` it already has. A record that does not fit
in one frame is left to the folder.

## 5. Address book

Each device publishes inside the ENCRYPTED part of its `device.json`
(`enc`, SYNC_FORMAT.md 11.2), refreshed when its network changes:

```json
"live": {"v":1, "port":41731, "at":1792771200000,
         "eps":[{"k":"lan","a":"192.168.1.20","p":41731,"m":24},
                {"k":"wan","a":"81.2.3.4","p":41731},
                {"k":"v6","a":"2a00:23c5::1","p":41731}],
         "nat":{"state":"mapped"}, "lease":{...section 7...}}
```

`k`: `lan` (private IPv4, `m` = prefix length), `lan6` (unique-local
IPv6), `wan` (the router's public address and the forwarded port), `v6`
(global IPv6). `nat.state`: `mapped`, `none` (no UPnP / NAT-PMP / PCP),
`refused`, `cgnat`, `double-nat`, `trying`, `off`. Link-local, loopback and
documentation addresses are dropped; at most 16 endpoints. Only members can
read it; the folder sees nothing of it.

## 6. Same-network discovery

Every 30 s, on start and on a network change, each device sends one UDP
datagram to 239.255.41.73:41733 (multicast, TTL 1) and to each interface's
broadcast address, port 41733, and listens there:

```json
{"p":"odl","v":1,"g":"<b64u 12>","n":"<b64u 12>","d":"<b64u 12>","port":41731}
```

`dk = HKDF(current sync key, "opendash-live-discovery-v1", "opendash-live-discovery|<group>|<kid>", 32)`,
`g = HMAC-SHA-256(dk, "group")[0:12]`, `n` random, `d = HMAC-SHA-256(dk, "dev|" n "|" deviceId "|" port)[0:12]`.
A member recognises the group from `g` and finds which member sent it by
checking `d` for each member id; it then dials the datagram's source address
at `port` (and answers with its own announcement, at most every 2 s). An
outsider sees a constant tag per key epoch and random bytes; a replayed
announcement only makes members dial the replayer, whose handshake fails.

## 7. Port mapping (being reachable from outside)

With "Let my other computers reach this one over the internet" on (the
default), a device asks its router to forward its port:

1. UPnP IGD: SSDP `M-SEARCH` to 239.255.255.250:1900 for
   `InternetGatewayDevice:1` and `:2`, the device description over HTTP,
   then SOAP on the WANIPConnection (or WANPPPConnection) service:
   `GetExternalIPAddress`, `AddPortMapping` (TCP, lease 3600 s, description
   "OpenDash sync", the local address the router sees), renewed at half the
   lease, `DeletePortMapping` on a clean exit. Error 718 (port taken) tries
   the next ports; 725 (permanent only) maps with lease 0.
2. NAT-PMP (RFC 6886) to UDP 5351 of the router (the first address of each
   private network this computer is on); a router that answers in PCP
   (RFC 6887) is asked with a PCP MAP request.

An external address in 100.64.0.0/10 (carrier-grade NAT) or a private range
(a second router in front) is reported as `cgnat` / `double-nat`: the
mapping exists but nothing from the internet reaches it, and no `wan`
endpoint is published.

## 8. The main computer (leases)

Some jobs must run on one computer at a time: fetching an account's mail and
calendar (role `fetch:<accountId>`), answering the phone (`phone`). Every
device that CAN do a job (its own sign-in for that account; runs in the
background) claims it:

```json
{"v":1,"at":<ms>,"ttl":<ms>,"prefs":{"list":[deviceId...],"at":<ms>},
 "roles":{"fetch:acc-1":{"since":<ms>,"view":"<deviceId>","pin":{"d":"<deviceId>","at":<ms>}}}}
```

- Over a live link: `ttl` 30 s, counted from when it ARRIVED; renewed every
  10 s and whenever a view changes. Through `device.json`: `ttl` 3 minutes
  from `at`; renewed every 60 s. Each device's newest message (by its `at`)
  counts.
- `since`: when the claimant's unbroken claim began. A device whose own
  claim ran out (it slept) starts a new one.
- The holder, computed identically everywhere from the valid claims: the
  pinned device (`pin`, from "Use this computer instead": the account's
  `fetcherDeviceId` in accounts.json), then the preference order (`prefs`,
  "home laptop first"; the newest list wins and is adopted everywhere), then
  the oldest `since`, then the smaller id.
- `view`: who the claimant thinks holds the role. A device RUNS a job only
  when it is the holder and every other valid claimant's view names it, so
  two devices that can hear each other never both act; a handover leaves a
  moment with neither. A device does not decide before it has read the
  folder once and given links 1.5 s to open.
- A network split can leave both sides acting until it heals (two devices
  cannot outvote each other); then the rule leaves one.

The engine's `isFetcher(accountId)` follows the lease when it has an answer
(and no longer records an automatic `fetcherDeviceId`), else behaves as
before.

## 9. Status (Settings > Sync)

`GET /api/sync/status` carries `live`: `{on, state, why, internet, port,
listening, reach: {state, method, external}, firewall, peers: [{id, name,
state: live|connecting|not-live, path: lan|internet, reason}], roles:
[{role, label, deviceId, name, me, acting}], prefs}`; `reason` is one of
`offline`, `no-address`, `trying`, `new-key`, `firewall`, `lan-blocked`,
`cgnat`, `router`, `unreachable`. `POST /api/sync/live {enabled?, internet?,
prefer?}` changes the settings (kept in this computer's own `live.json`).

## 10. What works where

| Network | Live? |
|---|---|
| Both on the same Wi-Fi / LAN | yes, found by announcement within a second, even before the folder delivers the address book (Windows asks once to allow OpenDash on private networks) |
| Home broadband with UPnP or NAT-PMP, other computer anywhere | yes: the other computer dials the home one through the forwarded port |
| Home behind CGNAT (some mobile and fibre providers), or a second router | only if the other side is reachable; else the folder |
| Office or public Wi-Fi (outbound only) | can dial out to a reachable home computer; cannot be dialled |
| Both unreachable (e.g. CGNAT + office) | no: the folder (10 to 60 s) |
| Global IPv6 on both, firewall open | yes, over IPv6 |

## 11. Safety in tests

`node-live.mjs` runs in a SANDBOX under the node test runner and for any
data folder inside the system temp folder: it binds 127.0.0.1 only, sends
no LAN announcements and never asks a router for a mapping, unless the
caller passes its own adapters (the tests pass fakes bound to 127.0.0.1).
`DASHBOARD_LIVE_SYNC=off` turns live sync off; `DASHBOARD_LIVE_NAT=off`
leaves the router alone; `DASHBOARD_LIVE_PORT` picks the port.
