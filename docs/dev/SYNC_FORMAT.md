# OpenDash sync format, versions 1 and 2

This is the on-disk format that OpenDash devices use to sync through a shared
folder (OneDrive, Google Drive for desktop, Dropbox, or any other place that
copies files). A different client (a phone app, a PWA, a desktop shell) can
read and write it from this page alone. The reference implementation is
`lib/sync/` (`hlc.mjs`, `fracindex.mjs`, `model.mjs`, `manifest.mjs`,
`engine.mjs`, `e2e.mjs` and `e2e-crypto.mjs` are platform-agnostic;
`folder.mjs` and `node-host.mjs` are the Node adapters).

Status: prototype. Version `1` is the plain format (sections 1-10). Version
`2` is the same data END-TO-END ENCRYPTED (section 11): every record is
sealed, and the folder holds no key. Snapshot register data is version `2`
in both. A reader that meets a higher version stops and reports it (see
[Versions](#10-versions-and-unknown-data)).

## 1. Layout

```
<shared folder>/OpenDash Sync/
  devices/<deviceId>/device.json
  devices/<deviceId>/ops-YYYYMMDD.jsonl
  devices/<deviceId>/ops-YYYYMMDD-NN.jsonl
  devices/<deviceId>/snapshot.json
  devices/<deviceId>/keys.json        (v 2) the key, wrapped for each member
  devices/<deviceId>/pair.json        (v 2) adding a device
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
- **Names readers accept:** exactly `device.json`, `snapshot.json`,
  `keys.json`, `pair.json` and `^ops-\d{8}(-\d{2})?\.jsonl$`, inside folders
  named `^[0-9a-f]{16}$`.
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
A record may name **local fields** (`calPrefs.mode`, `calPrefs.stream`,
`homeUI.hideAmounts`): they stay on each device, so they are never captured,
never written in, and a path to one is invalid. A top-level key may be
**local while** another key is `true` (`theme` while `autoTheme`, section 9).
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
 "app":"2.14.0","fetch":"background","fetcherId":"<host id>","lastSeen":"2026-10-23T09:00:00.000Z","seq":120}
```

`fetch`: `background` (fetches while no window is open: a desktop server) or
`foreground` (only while the app is open: a phone or a PWA). `fetcherId`:
the id this device uses in an account's `fetcher` field (section 8); on the
desktop the per-computer host id of `lib/devicedir.mjs` (`ensureHostId`),
which the accounts code records too; a device without one uses its
`deviceId`. Readers that find no `fetcherId` take the `deviceId`. `instance`
changes when a device's identity is copied to another installation; a device
that finds its own folder with another instance takes a new id.

## 8. Synced files and fetchers

Besides the state, some files of the data folder sync, as `file:<path>`
top-level keys (`SYNC_FILES` in `lib/sync/manifest.mjs`):

| File | Role | Shape |
|---|---|---|
| `accounts.json` | shared | `{version: 1, accounts: [Account]}`, exactly the registry of `lib/accounts-file.mjs` (docs/dev/ACCOUNTS.md section 2): `{id, provider, email, displayName, kind, tenantId?, scopes, features, status, lastSync, error, fetcher, sources?: {mail, calendar}, server? (IMAP host, no password), createdAt, updatedAt, legacy?}`. Never a token: tokens are in each device's secret store |
| `roles.json` | shared | `{roles: {<job>: {fetcher, since}}}` for jobs that are not accounts (`bank`, `ai-brief`, `connectors`) |
| `calendar/sources/<sourceId>.json` | published | `{events: [...], calendars: [...], ...}` (lib/calendar-sources.mjs) |
| `inbox/sources/<sourceId>.json` | published | `{messages: [...], accounts: [...], ...}` (lib/inbox-sources.mjs) |
| `calendar/events.json`, `inbox/messages.json` | published by `connectors` | the Claude-connector snapshots |

A snapshot in `calendar/sources/` or `inbox/sources/` belongs to the account
whose record lists its name in `sources` (`{mail: <sourceId>, calendar:
<sourceId>}`, written by `lib/accounts.mjs` when the account's sources are
made), or whose id it is named after. A snapshot no account owns (an MCP or
calendar-link source set up on one device only) is never sent. A device that
receives an account makes its sources with the recorded ids
(`reconcileAccountSources`), so every device reads the same file names.

A **published** file is recorded only by the fetcher of its account; the
other devices rebuild it from the registers alone (an exact copy). The
fetcher of an account is the record's `fetcher` (a `fetcherId`, section 7),
of a job its `roles` entry; both are ordinary registers (later change wins).
An account's `fetcher` holds with sync on or off (two computers that share
one data folder use it too). An unassigned account or job is taken by the
first device with `fetch: background` that asks (a `foreground` device takes
it only when no background device is known). "Fetch on this computer
instead" (`takeOver`) needs a sign-in on that device first; tokens never
travel.

A device keeps a synced file locked (the same `<file>.lock` the accounts code
and the snapshot writers use) from reading it for a pass to writing the
merge, so a change made in between waits and is captured by the next pass.

<!-- ── files ── -->
### 8.1 Results, caches and settings files (2.16)

Every other file a view shows syncs too (`SYNC_FILES`, and `FILE_RULES` for
how each merges, in `lib/sync/manifest.mjs`). All are role `shared`: the
device that produced a copy sends it, the others show it.

| File | Shape (registers) | Merge |
|---|---|---|
| `brief/day-advice.json` | one value | newest `at` |
| `briefs/ai/<kind>-<date>.json`, `briefs/story/<kind>-<date>.json` | one value | newest `at` |
| `briefs/days/<date>.<kind>.json` | one value | newest `savedAt` |
| `briefs/anim-ai.json` | `types` per title | later change |
| `briefs/weather.json`, `travel/weather.json` | one value `{key, at, raw}` | newest `at` |
| `travel/holidays-<CC>-<year>.json` | one value `{at, rows}` | newest `at` |
| `calendar/calendar.json`, `email/inbox.json` (the v1 snapshots) | one value | newest `fetchedAt` |
| `inbox/drafts.json` | `drafts` by id | later change |
| `resources/github-cache.json` | one value per repository | newest `fetchedAt`, per repository |
| `animations/mine.json` | `items` by id | later change |
| `index/settings.json` | per field; `folders`, `namesOnly`, `enabled` stay on each device | later change |
| `source-prefs.json` | `sources` per source id, `accounts` per account id, per field | later change |

**Newest produced-at wins** (`newest`). A copy of such a file says when it
was produced (`at`, `savedAt`, `fetchedAt`). Its register is written with
the timestamp `<that time, at most now>.00000.<deviceId>` instead of the
device's clock (one log line per such timestamp; `n` still counts up), so
plain last-writer-wins (section 4) keeps the copy PRODUCED last on every
device, in any order: a copy captured late (a computer that slept, the first
pass after an update, a joining device) never replaces a newer one. A device
never sends a local copy older than the one its registers hold (or older
than that file's removal elsewhere); it writes the known one back into the
file instead. A copy with the same produced-at as the register, or a
register written by a clock that ran ahead, goes out as an ordinary change.
Readers need nothing new: these are ordinary registers and lines. Clashes
on these files are not reported (`quiet`).

**Echo.** A received file is written from the registers; the next pass reads
it, finds it equal to its registers and sends nothing. Views reload it
through the open tabs' `synced-files` event without asking for a fresh
fetch (a fresh fetch would write and send it back).

**Too big.** A file over its `maxBytes` (or a single value over 256 KB,
section 9) is not sent; that file then stays exactly as it is on this device
(a smaller copy from another device does not replace it), and the status
lists it (`notSynced: [{file, why, whole}]`, Settings > Sync).

**source-prefs.json** (`lib/source-prefs.mjs`) is the person's part of
`sources.json`: `{version: 1, sources: {<sourceId>: {label?, colour?,
enabled?, accounts: {<accountId>: {name?, renamed?, colour?, enabled?,
own?}}}}}`. It is written whenever `sources.json` is, and a received one is
laid over `sources.json`: only choices on sources and accounts the device
already has (sync never adds or removes a source through it), an account
source's on/off is left to `accounts.json`, and a field the file does not
have yet is only added when it is a real choice (not the default), so a
device that was never set up cannot overwrite the other's choices. Another
device's MCP and calendar-link sources (shown through its capabilities) wear
these choices too.

**Stay on each device** (reasons in `lib/sync/manifest.mjs` FILE_RULES):
`connections.json` (this computer's own checks; they decide what it can
do), `sources.json` (iCal secret links, MCP server names, bank sessions; a
source that does not validate elsewhere would be dropped and the drop sent
back), `time.json` (this computer's observed zone), `calendar/update.json`
and `inbox/update.json` (the job throttle: a copy would stop a computer
from reading its own accounts), `travel/rates-*.json` (public rate caches),
`index/files.json`, `index/status.json`, `state/actions-journal.json`
(undo tokens of this computer), binary files (`people/images/`,
`cache/narration/`), and every identity, secret and bookkeeping file.
<!-- ── /files ── -->

## 9. What syncs, and what never does

Only the keys in the manifest and the files above. Sign-ins and keys are
files in the device's own secrets folder and are never read. Field names that
look like credentials are dropped, and string values that look like one (API
keys, OAuth tokens, JWTs, private keys, URLs carrying `token=`/`key=`/`sig=`)
make that field not sync at all, in both directions.

### 9.1 Preferences follow the person

Data (tasks, notes, people, streams, countdowns, Home layout, reviews,
calendar names and colours) syncs, and so do the person's **preferences**:
they follow them to every device. Only what belongs to one screen or one
moment stays on the device. Maps merge entry by entry, so hiding one calendar
on one computer and showing another on the other computer both survive;
plain values merge by last writer. A clash on a preference is not reported
as a conflict: the later choice wins quietly (`isPreference` in the
manifest).

| Preference (synced) | Merges | Why it syncs |
|---|---|---|
| `theme` | one value; local while `autoTheme` is on | light or dark is the person's choice; under Auto each computer turns dark in its own evening |
| `autoTheme` | one value | Auto (dark from 19:00 to 07:00 by each computer's own clock) is a choice too |
| `density` | one value | row density |
| `sortBy`, `groupBy` | one value each | sort and grouping of the Display menu |
| `openItemsIn` | one value | open items in the side panel or a card |
| `itemHero` | one value | card header style |
| `viewFilter` | one value | the saved view filter (tag renames rewrite it) |
| `collapsedSidebar` | per heading | folded sidebar headings |
| `taskViewPrefs` | per view, per field; `collapsed` per group | each view's sort, grouping and folded groups |
| `calPrefs` | per field; `hidden` per entry (`cal:<id>`, `google`, `tasks`, `plans`, `countdowns`, `declined`) | the calendars you follow or hide, the calendar mode (month, week, day, agenda) and the one-stream filter (since 2.16; a tab showing the calendar moves its view, `#view=calendar:week`, to the new mode) |
| `peopleView` | per field | People layout, sort, grouping and filter |
| `homeUI` | per field; `listFold` per list card | Home cards: expanded, folded groups, "not now", celebrations, gallery badges, amounts hidden (since 2.16) |
| `sidebarLists` | per list, per field | sidebar list sort and length |
| `animPrefs` | per field; `overrides` per event, `look` per field | scene rules, per-event overrides and the animation look |
| `achievements` | per field; `unlocked` and `notes` per entry | unlocks: nothing earned is lost |
| `viewMode` | one value | list, board or review mode of the task views (2.16) |
| `focus` | one value | Focus mode: on until you turn it off or open the sidebar (2.16) |
| `sidebarCollapsed` | one value | the sidebar folded or open (2.16) |
| `paneSizes` | per panel | panel sizes in pixels; each screen clamps them to what fits (2.16) |
| `lastReviewPrompt` | one value | when you were last asked for a weekly review: answered on one computer, not asked again on the other (2.16) |
| `suggestStats` | `rules` per rule and field, `seen` per key | the suggestions' counts; the later count wins per field (a count can come out a little low, never doubled) (2.16) |

Data (not a preference: clashes are reported like task edits): `travel` (2.16), the trip decisions, `trips` per trip and field, `notTrips` and `moments` per entry. The zone each computer is in is not in it: that is `time.json` and `config.time`, which stay on each computer.

| Device-local (never synced) | Why it stays |
|---|---|
| `view` | where you are (it follows `calPrefs.mode` when that changes elsewhere) |
| `selectedTaskId` | the open task |
| `calMonth`, `weekBarOffset` | the month and week shown |
| `_snappedFor` | scroll bookkeeping |
| `personEditMode` | an edit in progress |
| `_lastBackup` | this browser's last download backup |
| `env` | this computer |
| `_lastSave`, `_saveCount`, `_localDirty`, `_overridesMigrated_v1`, `_demo`, `taskOverrides`, `dateOverrides` | bookkeeping and emptied legacy keys |

Derived keys (`calCache`, `peopleEmailCache`, `autolink`) are rebuilt on each
device and never synced. Results (`emailTriage`, `suggest`) sync: a computer
without Claude cannot rebuild them. AI chats sync too: section 9.3.

**Theme under Auto.** While `autoTheme` is `true` on a device, its `theme`
is not captured and an incoming `theme` is not written in (the register
still merges). Whenever `autoTheme` is written in, `theme` is written in
after it from the registers if Auto is then off: turning Auto off on one
computer gives the others that computer's theme.

**The page.** Preferences are UI keys there (no undo step, no backup), but a
tab takes them from a newer copy like data (`src/app/86-live-sync.js`
`syncMergeTab`; the list is `SHARED_UI_KEYS` in `lib/state-keys.mjs`), so an
open tab never writes its old theme back over a choice made elsewhere. A
clash keeps the tab's choice without asking (it is saved next, so it becomes
the later one). Since 2.16 no field inside a preference stays a tab's own.

### 9.2 Devices that synced before preferences did

The format does not change (no new `v`). After the update:

- A device's **first pass** finds its preferences in its state file but not
  in its registers, and publishes them as **ordinary changes** (its normal
  clock, not the joining floor of section 2). Nothing is deleted or reset.
- Map entries merge one by one: the calendars hidden on one computer and
  those shown on the other are all kept; an option set on only one is kept.
- Where two computers had different values for the same plain preference
  (`theme`, `density`...) or the same entry, the one whose first pass came
  later wins, like any later change, quietly. Change it once afterwards on
  either computer to choose.
- A computer still on the older version drops these writes (they are outside
  its schema, section 6: counted as rejected, never applied) and sends none
  of its own. Once updated it publishes its own on its first pass; what the
  others published meanwhile reaches it with their next snapshot (written
  within a day of a change, section 7) or with that preference's next change.
- A **fresh device that joins** writes its first capture at the floor
  (section 2), so the group's preferences win wherever the group has one
  (its theme, its hidden calendars), and what only the new device has is
  added. Its own view and open task stay as they were.

The same holds for every key and field that 2.16 made synced (`viewMode`,
`focus`, `sidebarCollapsed`, `paneSizes`, `lastReviewPrompt`,
`suggestStats`, `travel`, `calPrefs.mode` and `.stream`,
`homeUI.hideAmounts`): an updated device publishes what it has on its first
pass, maps merge entry by entry (panel sizes, trips, "not a trip", the
suggestions' seen list), and a plain value takes the later device's choice.
A field that used to be device-local inside a record (`calPrefs.mode`) is
refused by older versions (their schema still says local), so they keep
their own until updated.

**The person's settings (`profile.json`).** A key that `profile.json` does
not hold yet (a new file, or a key a later version added: `travel`,
`locationMode`, `manualLocation`, `time` in 2.16) is written only when this
computer's value differs from the defaults (`lib/profile.mjs` writeProfile),
so an updated computer with blank settings never overwrites the other's
choices; one with its own choice publishes it as an ordinary change. Keys
only part of which follows the person (`PERSON_PART`): `travel` without
`sources.geo` (the browser's location permission), `time` with only
`clock12` (which zone a computer shows stays its own). When the typed place
is chosen for the weather (`locationMode` manual), applying `manualLocation`
sets this computer's `location` to it too.

### 9.3 AI chats and proposals

Every AI conversation syncs (`src/app/70-ai-chats.js`; the `chats` blocks of
the manifest and `SYNC_SPEC`):

| Key or file | Merges | Notes |
|---|---|---|
| `taskChat` | per task, messages by id | `{taskId: [{id, role, text, ts}]}`; older messages without an id merge by content |
| `assistantChat` | `messages` by id, each message's `proposals` by id, per field | the assistant panel's one conversation; a proposal card's state (`pending`, `applied`, `dismissed`, `undone`), applied/skipped parts, `appliedOn: {id, name}` |
| `chatMeta` | per chat (`task:<id>`, `assistant`), per field; `older` per computer | `clearedAt`, `readAt` (read on one computer is read on all), `older: {deviceId: {n, name}}` |
| `chatArchive` | never synced | this computer's older messages of a long chat |
| `file:state/proposals.json` | shared; `proposals` by id, `applied` and `createdIds` per entry | `{version: 1, proposals: [{id, at, status, ops, preview, previewHash, summary, applied: {opIndex: true}, createdIds, ...}]}` (`server/actions/journal.mjs`) |

- **Messages** get an id when they are made and carry their time; every
  device shows them in time order (ties by id), so two devices sending at the
  same moment keep both, once each. A reply being written is published once
  (`pending: true`, `by: {tab, dev, name}`) and replaced by its id when done;
  progress stays in the tab. A pending reply older than 15 minutes shows as
  interrupted.
- **Long chats**: past 100 messages a chat keeps its newest 60 in sync. Each
  device copies the messages older than its newest 60 into `chatArchive` as
  soon as it sees them, so a trim on another device loses nothing there, and
  records in `chatMeta[...].older[<its id>]` how many it keeps; the others
  show "N older messages on <device>".
- **Clearing** empties the list (the container stays alive, so a message
  sent elsewhere at that moment survives) and sets `clearedAt`, which each
  device applies to its own archive.
- **Proposals**: the apply path refuses one that is not pending (applied or
  dismissed on any device), and the ops applied so far merge as a map, so
  two devices applying different parts both count (all applied = applied).
  Applying a proposal derives the ids it creates from the proposal id and the
  op number (`server/actions/model.mjs withIdSeed`): an op whose ids are
  already in the data was applied elsewhere and is refused, and two offline
  devices applying the same proposal make the same ids, which merge into one
  copy. Undo stays on the device that applied it (its undo history).
- Chats can quote mail: like all synced data they travel end-to-end
  encrypted, and the sync log never holds their text in the clear.

## 10. Versions and unknown data

- Unknown fields in any object: ignore them.
- A version-1 reader that meets a log line or snapshot with `v` above 1, or
  with a non-null `enc` (end-to-end encryption, section 11: `{v:2, dev, n,
  enc:{k, iv, ct}}`), does not understand it: it stops reading that log there
  (never skips it) and tells the user to update (or, when the folder holds an
  encrypted group, to add this computer to it).
- A change to anything in sections 1-8 that an older reader would misread
  needs a new `v`. A new synced key or field does not: an older reader drops
  writes outside its schema (section 6) and catches up once updated (9.2).
- Version 2 (section 11) uses exactly this rule: a version-1 reader stops at
  the first encrypted line and says so; it never skips or guesses.

## 11. End-to-end encryption (version 2)

Reference: `lib/sync/e2e-crypto.mjs` (primitives) and `lib/sync/e2e.mjs`
(keys, members, pairing). Web Crypto only: AES-256-GCM, X25519, HKDF-SHA-256,
SHA-256. Base64 below is base64url without padding (`b64u`).

**Threat model.** The folder (the cloud provider, or anyone with the
account's files) may read, write, delete, copy and replay any file. It must
not learn the key or the data, and nothing it writes may change anyone's
data. It can still see how many devices sync, when and how much they write,
delete or hold back files (sync then waits), and the name a new device gives
itself while it waits to be approved. Devices that hold the key are trusted
(group-key records do not say which member wrote them); a removed device is
not trusted for anything after its removal.

### 11.1 Keys and devices

- **Identity**: each device has an X25519 key pair; the private half stays in
  the device's secret store. Its **device id** is
  `hex(SHA-256("opendash-device-v2\n" || pub))[0:16]`, so a public key cannot be
  passed off as a member's (every reader checks the fingerprint).
- **Group**: a random 16-hex id per shared folder.
- **Keys**: random 256-bit AES-GCM keys, each with a random 16-hex id `kid`,
  an epoch number `n`, its creator `by`, `excl` (every device removed when it
  was made), `cut` (after a removal: `{deviceId: last change number the
  creator had seen}`) and `rec` (the recovery public key). A key is **valid**
  when its creator is not removed and `excl` contains every removed device.
  Records are written with the **current** key: the valid key with the
  highest `(n, by, kid)`. No valid key (two removals at once) -> a device
  makes one with `n = max + 1`.
- **Members**: devices allowed to read. Learned from key wraps (below) and
  from rosters encrypted with the current key (a holder of the current key may
  announce itself). **Removed**: permanent, learned only from key wraps and
  authenticated removal notices.

### 11.2 Records

Associated data (AD) of every sealed record:
`"opendash-sync-v2\n" + kind + "\n" + group + "\n" + deviceId + "\n" + file + "\n" + seq + "\n" + kid`
(UTF-8). A fresh random 96-bit nonce per record; the 128-bit tag is part of `ct`.

```json
{"v":2,"dev":"<id>","n":17,"enc":{"k":"<kid>","iv":"<b64u>","ct":"<b64u>"}}
```

- A log line (`kind` `log`, `file` = the log file's name, `seq` = `n`):
  `ct` seals `{h, s, w, x}` of section 6. The line cannot be moved to another
  file, device or position, and `h` is not visible.
- `snapshot.json` (`kind` `snapshot`, `seq` = the snapshot's `seq`):
  `{v:2, dev, seq, enc}`, `ct` seals `{hlc, seen, covers, createdAt, data}`.
- `device.json` (`kind` `device`, `file` `device.json`, `seq` 0): in the
  clear `{v:2, format:2, deviceId, pub, instance, app, fetch, lastSeen}`, and
  `enc` seals `{name, kind, seen, seq, fetcherId}` (`enc` is null while the device has no key).

A reader refuses (counts, never applies): anything that fails AES-GCM; a
plain (v 1) record in an encrypted group; a record from a removed device
with `seq` above its cut; a record under a key whose creator was removed at
or before that key's epoch; a record under an older key than a removal key
with `seq` above that removal's `cut` for its device (such a device writes a
fresh snapshot with the new key once it has it). A record under a key it does
not have yet: stop reading that log there and wait. The same `(dev, n)` twice: taken once.

### 11.3 keys.json

```json
{"v":2,"t":"keys","dev":"<id>","pub":"<b64u>","group":"<16 hex>","kid":"<current kid>","n":3,
 "to":{"<memberId>":{"iv":"...","ct":"..."}},
 "rec":{"eph":"<b64u>","iv":"...","ct":"..."},
 "gone":{"<removedId>":{"iv":"...","ct":"..."}},
 "roster":{"k":"<kid>","iv":"...","ct":"..."},"at":"<iso>"}
```

- `to[m]`: the KEYRING for member `m`: `{t:"keyring", v:2, group, purpose:"member",
  for:m, by:dev, at, keys:{kid:{k, n, by, at, excl, cut, rec}}, members:{id:{pub,
  kind, since, via}}, removed:{id:{at, by, n, cut}}, names:{id:{name, at, by}}}`,
  sealed with AES-GCM under `HKDF(X25519(priv_dev, pub_m), salt = pub_dev||pub_m,
  info = label)`, AD = label = `opendash-wrap-v2|group|kid|dev|m`. Static-static:
  only `dev` and `m` can compute it, so opening it proves who sent it. Readers
  take wraps only from members.
- `rec`: the same keyring (`purpose:"recovery"`), ECIES to the recovery
  public key (one-time key `eph`), label `opendash-recovery-wrap-v2|group|kid|dev`.
- `gone[r]`: `{t:"removed", v:2, group, id:r, at, by, n, cut}` wrapped from
  `dev` to `r` (label `opendash-removed-v2|group|dev|r`): a removed device
  learns it was removed; the folder cannot fake it.
- `roster`: `{members, names, at}` sealed with the current key
  (AD kind `roster`, file `keys.json`, seq 0). Taken only under the reader's current key.

Every member rewrites its keys.json whenever its keyring changes (and when it
finds the file changed by someone else).

### 11.4 Recovery code

8 groups of 4 characters from `0123456789ABCDEFGHJKMNPQRSTVWXYZ`. Each group
is 3 data characters and a check character: Luhn mod 32 over
`[group number (0-7), c0, c1, c2]`. The 24 data characters are 15 bytes (120
bits) in base 32. Readers accept lower case, spaces and dashes, `O` as `0`,
`I`/`L` as `1`. Recovery key pair: X25519 with private key
`HKDF(secret, salt "opendash-recovery-v2", info "x25519 recovery key", 32)`.
Members keep only the public half (`rec` of a key; never in the folder) and
wrap every new key to it. A joining device tries every `rec` wrap and takes
the newest keyring it opens; one that is older than the newest key the members
announce is refused (an old, replaced code). The code is shown once and never stored.

### 11.5 Pairing ("Approve on your other computer")

In each device's own `pair.json` (`{v:2, t:"pair", dev, pub, at, join?, approve?, offer?}`):

1. New device N: `join: {sid, commit, name, kind, at, exp}` with
   `commit = b64u(SHA-256(JSON ["opendash-pair-commit-v2", sid, pubN, name, kind, nN]))`,
   `nN` 32 random bytes (b64u). A session ends after 1 minute without
   progress; each step gives it another minute (`PAIR_MS`). Requests whose
   `exp` is up to 20 minutes ahead (older versions wrote 15) are accepted.
2. Member E (its user clicked "Check it's yours") locks onto that commit and
   writes `approve: {sid, to:N, group, commit, nonce:nE, at, exp}`.
3. N takes the FIRST answer for its `sid` and reveals `join.open = nN`.
4. E checks the commitment (any mismatch ends the session). Both show
   `code = SHA-256(JSON ["opendash-pair-code-v2", sid, group, commit, pubN, pubE, nN, nE])`,
   first 6 bytes as a 48-bit number mod 10^6, 6 digits.
5. The user compares the screens and confirms on BOTH. E writes
   `approve.wrap`: the keyring (`purpose:"pair"`) wrapped from E to N,
   label `opendash-pair-wrap-v2|group|sid|E|N`. N opens it only after its own
   user confirmed, from the `pubE` it locked onto.

Each side answers once per session, and each value is fixed before the other
side's last value is visible, so a man in the middle cannot search for keys
that make the codes match: it gets one blind 1-in-a-million guess per pairing
the user starts. A "no" on either side writes `abort:true`; Cancel works at
every step, including after E has sent the keyring.

**Restarts, renames, removed devices** (2.16):

- Both sides keep the session in their secret store (`sync-e2e-pairing`:
  sid, nonces, the step), so a restart carries on with the same session.
- E follows the newest request of the same device: when N's `join` carries
  another `sid` with a later `at` (N started again: a restart on an older
  version, a new name), E answers it with a fresh `nE`, fixed before it sees
  the new opening. N never follows a second answer for one `sid` (that would
  let the folder pick `nE` after seeing `nN`).
- A side whose peer's message has been missing from the folder for 15 s
  ends the session ("the other computer stopped") instead of waiting.
- E keeps the keyring in `approve.wrap` until N's `keys.json` shows up (at
  most 10 minutes), however slow the cloud is.
- A request from a REMOVED device is shown ("A computer you removed, ...,
  wants to join again"). Removal is permanent, so approving it does not add
  the old id: the keyring tells N it was removed and N joins under a new
  identity (adopt), which it announces in its roster; E sees it arrive.
- A device that is not in a group but finds a member's authenticated
  "removed" notice (`gone[<its id>]`, section 11.3) starts its pairing or
  join code again with a fresh identity by itself (a fake notice could only
  make it pick a new key pair).

**QR offer** (a phone): E writes `offer: {id, exp, iv, ct}`: the keyring
(`purpose:"offer"`) sealed under `HKDF(T, "opendash-offer-v2", label)`, label
`opendash-offer-wrap-v2|group|E|id`, where `T` is 16 random bytes that exist
only in the QR code `opendash-join:1:<group>:<E>:<id>:<b64u T>`. It lasts 10
minutes and is withdrawn once a device joins with it.

### 11.6 Moving from version 1

A device that synced plainly takes a new (fingerprint) id, KEEPS what it has
(its registers keep their timestamps), writes an encrypted snapshot, then
deletes its own old folder. The first one makes the group (and shows the
recovery code); the others join it. Plain records from other devices are not
taken in once a device is encrypted; their changes arrive once they join.

### 11.7 Join code ("Add a computer", 2.16)

The usual way in: E shows 4 letters from `ABCDEFGHJKLMNPQRSTUVWXYZ` (no I, O,
0 or 1; 24^4 codes), valid 10 minutes (`CODE_MS`, separate from the
pairing's idle minute), single use. N types them. A short code can be
guessed offline from anything derived from it, so nothing that lets anyone
TEST a guess is ever written to the folder: no code, no hash, no MAC of it.
Both sides run CPace, a balanced PAKE:

- `G` = Elligator 2 (RFC 9380, curve25519, Z = 2) of
  `HKDF-SHA-256(code, salt "opendash-joincode-v1", info "opendash-joincode-generator|<sid>", 48 bytes)`
  read as a big-endian integer mod 2^255 - 19, as a little-endian u-coordinate.
- Each side picks a fresh X25519 secret `y` and publishes `Y = X25519(y, G)`;
  `K = X25519(y_self, Y_other)`.
- Transcript `T = [sid, E, pubE, Y_E, N, pubN, Y_N, name, kind]`;
  `HKDF(K, salt SHA-256(JSON ["opendash-joincode-transcript-v1", ...T]), info "opendash-joincode-confirm-v1", 64)`:
  the first 32 bytes are N's tag, the last 32 E's.

In `pair.json`:

1. E: `code: {sid, Y, at, exp}` (and `no: {<N>: <at>}` for wrong answers).
2. N: `claims: [{sid, to: E, Y, name, kind, tag, at}]`, one per open session it
   finds (at most 3: a fake session costs N one).
3. E checks each answer once. A wrong tag counts; after 3 the code is burned
   (`abort: "burned"`). One device with a right tag, still alone after 3 s,
   is let in: `code: {sid, done: {to: N, wrap, tag: E's tag}}`, the keyring
   (`purpose:"joincode"`) wrapped from E to N (label
   `opendash-joincode-wrap-v1|sid|E|N`). Two devices with right tags: both are
   refused (`abort: "clash"`, "Two computers tried to use this code").
4. N checks E's tag (E knew the code), opens the wrap from `pubE` and adopts
   the keyring (a removed identity comes back as a new one, as in 11.5).

What the folder can do: it sees `Y_E`, `Y_N` and the tags, from which no
guess can be checked (that would need `y`). A fake E or N gets one guess per
session (1 in 331,776), and E stops after 3 wrong ones. Someone with write
access to the folder could only race a legitimate join in the few seconds
before E acts on it, and only with the right code (which they cannot learn
from the folder); two right answers are refused. Both sides keep their session
in the secret store, so a restart carries on.
