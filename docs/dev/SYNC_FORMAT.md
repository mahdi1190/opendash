# OpenDash sync format, version 1

This is the on-disk format that OpenDash devices use to sync through a shared
folder (OneDrive, Google Drive for desktop, Dropbox, or any other place that
copies files). A different client (a phone app, a PWA, a desktop shell) can
read and write it from this page alone. The reference implementation is
`lib/sync/` (`hlc.mjs`, `fracindex.mjs`, `model.mjs`, `manifest.mjs` and
`engine.mjs` are platform-agnostic; `folder.mjs` and `node-host.mjs` are the
Node adapters).

Status: prototype. The format version is `1`; snapshot register data is
version `2`. A reader that meets a higher version stops and reports it (see
[Versions](#versions-and-unknown-data)).

## 1. Layout

```
<shared folder>/OpenDash Sync/
  devices/<deviceId>/device.json
  devices/<deviceId>/ops-YYYYMMDD.jsonl
  devices/<deviceId>/ops-YYYYMMDD-NN.jsonl
  devices/<deviceId>/snapshot.json
```

- `deviceId`: 16 lower-case hex digits, random (`crypto.getRandomValues`).
- **Single writer.** A device writes only inside its own
  `devices/<deviceId>/` folder. No two devices ever write the same file, so a
  cloud client never needs a conflict copy.
- **Atomic writes.** Every file is written to a temporary name in the same
  folder and renamed over the target. Logs only ever grow: a new version of a
  log file always starts with the previous version's bytes.
- `YYYYMMDD` is the UTC date of the first line. `NN` (01, 02, ...) continues
  the same day once a part reaches about 512 KB.
- **Names readers accept:** exactly `device.json`, `snapshot.json` and
  `^ops-\d{8}(-\d{2})?\.jsonl$`, inside folders named `^[0-9a-f]{16}$`.
  Everything else is ignored: temporary files, `ops-20261023 (1).jsonl`,
  `ops-20261023-DESKTOP-AB12CD.jsonl` (OneDrive), `... (conflicted copy ...)`
  (Dropbox), `desktop.ini` and so on.

## 2. Clock (HLC)

Every change carries a hybrid logical clock timestamp, one string:

```
<wall ms, 15 decimal digits>.<counter, 5 base-36 digits>.<deviceId>
000001792771200000.00000.3f9a0c2b7d41e865
```

Plain string comparison orders timestamps (time, then counter, then device:
the deviceId breaks every tie the same way everywhere).

- Local change: `wall = max(wall, now)`; the counter goes up when the wall
  did not move, else resets to 0.
- Seeing a remote timestamp: the clock moves past it (standard HLC receive),
  but follows a remote wall time at most 1 hour ahead of its own clock
  (a device with a wrong clock is reported, not followed).
- A device joining a folder that already holds other devices' data writes its
  first capture at the **floor** `000000000000000.00000.<deviceId>`: the
  folder's data wins wherever both have the same field; what only the joining
  device has is added.

## 3. Registers and paths

The synced data is a tree of registers. A **path** is an array of strings:

| Path | Register |
|---|---|
| `["custom", "<taskId>", "title"]` | a field of a list item |
| `["custom", "<taskId>", "@alive"]` | `true` = the item exists, `false` = deleted (a tombstone) |
| `["custom", "<taskId>", "@pos"]` | the item's position (section 5) |
| `["custom", "@alive"]` | the container exists (every record, map and list has one) |
| `["statuses", "<taskId>"]` | a map entry |
| `["home", "layout"]` | a field of a record |
| `["file:accounts.json", "accounts", "<id>", "label"]` | a synced file (section 8) |

How each top-level key is shaped (list of items, map, record, or one whole
value) is `SYNC_SPEC` in `lib/sync/model.mjs`; which keys sync at all is
`lib/sync/manifest.mjs`. A path that does not fit that schema is invalid.
Segments are 1-300 characters; `__proto__`, `constructor`, `prototype` and
anything starting with `@` (except the two meta leaves) are invalid; a field
whose name looks like a credential (`isSecretName`: `token`, `secret`,
`password`, `apiKey`, ...) is invalid.

A register holds `{h, n, s, v}`, or `{h, n, s, deleted}` for a field that was
removed: `h` the timestamp, `n` the writing device's change number, `s` what
that device had seen (`{deviceId: n}`), `v` any JSON value.

### List item keys

- An item with a string or finite number `id` is filed under `String(id)`.
- `bin.tasks` items: `"<binTs>:<id>"`; `bin.notes` items: `"<binTs>:<note.id or taskId>"`.
- An item without a key: `"h:" + first 16 hex digits of cyrb128(stableJSON(item))`
  (cyrb128 over UTF-16 code units, as 4 x 8 hex digits; `hash()` in model.mjs).
- The second, third... item with the same key gets `#2`, `#3` (in list order).
- `stableJSON`: JSON with object keys sorted, `undefined` members dropped.

An item rebuilt from registers counts only when it is **complete**: its own
key (from its `id` field, or its content hash) equals the key it is filed
under. Changes can arrive out of order; an incomplete item is not shown and is
never taken for "deleted here".

## 4. Merging

Per register, **last writer wins**: the larger `h` wins, on every device, in
any order, any number of times (idempotent and commutative). A deleted field
is a register like any other. Deleting an item writes `@alive=false`; edits
inside a deleted item stay in their registers but the item is not shown until
an `@alive=true` with a larger `h` (a restore).

Two writes to one register are **concurrent** when they come from different
devices and the later one's `s` does not include the earlier one's `n`
(`s[earlier.device] < earlier.n`). Concurrent losers are reported to the user
(conflicts); this never changes the result.

## 5. Positions

`@pos` is a base-36 digit string read as a fraction (`"i"` = 0.i), never
ending in `0`, at most 200 characters. Items are ordered by `(pos, key)` in
plain string comparison; items without a valid position come after, in their
local order. A device that moves items writes new positions only for the
items whose order changed (the longest run already in order keeps its
positions), choosing values strictly between the neighbours.

Order lists that are plain arrays of ids (`customOrder`, `sidebarOrder`
entries, `home.focusOrder`, tag lists) are whole values: the later list wins.

## 6. Change logs (`ops-*.jsonl`)

One JSON object per line, `\n`-terminated:

```json
{"v":1,"dev":"3f9a0c2b7d41e865","n":17,"h":"000001792771200000.00002.3f9a0c2b7d41e865",
 "s":{"0123456789abcdef":40},
 "w":[[["custom","u-1","title"],"Write the report"],[["custom","u-1","@alive"],true]],
 "x":[["custom","u-1","dueDate"]]}
```

- `n`: this device's change number, 1, 2, 3... (several lines may share one `h`).
- `w`: writes `[path, value]`; `x`: removed fields (paths). All take `h`, `n`, `s`.
- `dev` must equal the folder name, and `h` must end in it.
- A reader keeps a byte offset per file and reads only complete lines; bytes
  after the last `\n` are still arriving. A file shorter than the offset was
  replaced by an older copy: read it again from 0 (merging twice is harmless).
- A line that is not JSON: stop before it and retry; after 3 passes with the
  file unchanged, skip it.
- Readers check every write against the schema and the credential filters
  and drop the ones that fail (the rest of the line still applies).

## 7. `snapshot.json` and `device.json`

```json
{"v":1,"dev":"<id>","seq":120,"hlc":"<newest timestamp>","seen":{"<id>":40},
 "covers":{"ops-20261023.jsonl":48213},"createdAt":"2026-10-23T09:00:00.000Z","enc":null,
 "data":{"v":2,"ops":[["<h>",17,0]],"vecs":[{"<id>":40}],
         "tree":{"custom":{"u-1":{"title":{"":[0,"Write the report"]}}}}}}
```

Everything the device knows, as registers: `tree` nests path segments; the
key `""` holds a register `[opIndex, value]` (or `[opIndex]` for a removed
field), `ops[opIndex] = [h, n, vecIndex]`, `vecs[vecIndex]` = its `s`.
`covers` gives the size of each of the device's logs at that moment: a reader
that merges the snapshot may start those logs at that offset. A device writes
a snapshot after about 1 MB of new log or once a day, and may then delete its
own logs older than 30 days that the snapshot covers.

```json
{"v":1,"deviceId":"<id>","format":1,"enc":null,"name":"Work laptop","instance":"<random>",
 "app":"2.14.0","fetch":"background","lastSeen":"2026-10-23T09:00:00.000Z","seq":120}
```

`fetch`: `background` (fetches while no window is open: a desktop server) or
`foreground` (only while the app is open: a phone or a PWA). `instance`
changes when a device's identity is copied to another installation; a device
that finds its own folder with another instance takes a new id.

## 8. Synced files and fetchers

Besides the state, some files of the data folder sync, as `file:<path>`
top-level keys (`SYNC_FILES` in `lib/sync/manifest.mjs`):

| File | Role | Shape |
|---|---|---|
| `accounts.json` | shared | `{accounts: [{id, provider, email, label, fetcherDeviceId, fetcherSince, ...}]}`: the account registry, never a token |
| `roles.json` | shared | `{roles: {<job>: {deviceId, since}}}` for jobs that are not accounts (`bank`, `ai-brief`, `connectors`) |
| `calendar/sources/<accountId>.json` | published | `{events: [...], calendars: [...], ...}` |
| `inbox/sources/<accountId>.json` | published | `{messages: [...], ...}` |
| `calendar/events.json`, `inbox/messages.json` | published by `connectors` | the Claude-connector snapshots |

A **published** file is recorded only by the fetcher of its account; the
other devices rebuild it from the registers alone (an exact copy). The
fetcher of an account is its `fetcherDeviceId`, of a job its `roles` entry;
both are ordinary registers (later change wins). An unassigned account or job
is taken by the first device with `fetch: background` that asks (a
`foreground` device takes it only when no background device is known).

## 9. What never syncs

Only the keys in the manifest and the files above. Sign-ins and keys are
files in the device's own secrets folder and are never read. Field names that
look like credentials are dropped, and string values that look like one (API
keys, OAuth tokens, JWTs, private keys, URLs carrying `token=`/`key=`/`sig=`)
make that field not sync at all, in both directions.

## 10. Versions and unknown data

- Unknown fields in any object: ignore them.
- A log line or snapshot with `v` above 1, or with a non-null `enc`
  (**reserved for end-to-end encryption**: `{v:1, dev, n, h, enc:{...}}` will
  carry the encrypted `s`, `w`, `x`), is not understood: stop reading that log
  there (never skip it) and tell the user to update.
- A change to anything in sections 1-8 that an older reader would misread
  needs a new `v`.
