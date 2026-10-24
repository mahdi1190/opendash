# OpenDash 2.18: simplify every card

Status: **plan only** (docs). A build workflow implements it later, in the six
batches of section 8. Written 24 Oct 2026 on `docs/218c-simplify`, from
`feat/2171-corner` at `218b9b6`. All `file:line` references are at that commit;
if a line has drifted, search for the quoted text.

The user's request (24 Oct): "let's just simplify all of these cards where we
can, not just sync but everything, to make it easier to use".

The trigger was Settings > Sync > Live connection, which today says:

> When your computers can reach each other, a change shows on the other one
> within a second. Otherwise it goes through your cloud folder as before. Only
> your own paired computers can connect, and everything is encrypted.
> Live with Work laptop (same Wi-Fi)
> This computer cannot be reached from the internet: your router does not
> allow incoming connections. Live sync still works on the same Wi-Fi;
> otherwise changes go through OneDrive. [Try again]
> Main computer: Answering your phone: this computer · Answering requests that
> need Claude: this computer

It is out of date (since 2.17 the relay carries changes anywhere within a
second, so the router line no longer matters), alarming about a non-problem,
blames the setup when the other laptop is simply asleep, uses jargon, and
explains at length where one status word would do. The same faults recur all
over the app; this plan fixes them everywhere.

Contents

1. Principles
2. Glossary
3. The shared kit (status line, folds, one primary action)
4. Sync, redesigned (the model for every other card)
5. Card-by-card tables (every area)
6. Settings search: what moves
7. Logic changes, in one list
8. Build batches
9. Done means

Rules for the builders (from CLAUDE.md and the user's standing rules)

- **No tests**, no test files, no review agents. Check with
  `node build.mjs --syntax` and `node build.mjs`, then one render on your own
  port with test data (`node tools/make-test-data.mjs C:/tmp/<you>/data`,
  `node serve.mjs --data-dir C:/tmp/<you>/data --port <yours> --no-open`).
  Never port 4173, never the user's live install or data folder.
- **No real personal names** in copy, comments or docs. Examples use
  "Sam's laptop", "Work laptop", "your other computer".
- **Never lose capability.** Things move into folds; they are not deleted.
  The only text that may go for good is text that is no longer true.
- Every moved row keeps its Settings search entry (section 6) and its
  command-palette command.
- Escape everything with `esc()` / `textContent` as today; respect reduced
  motion (the kit's pulsing dot stops under `html[data-motion="reduced"]`).
- One process at a time on this laptop (it has been crashing): build, look,
  stop the server, commit.

How to read the tables in section 5

| Column | Meaning |
|---|---|
| Where | `file:line` at `218b9b6` |
| Now | a short excerpt of today's text |
| Problems | which principle it breaks (P1 to P9, section 1) |
| Proposed | the new copy, verbatim and ready to paste. **T** = row or card title, **H** = hint (one line under the title), **S** = status line (`tone` · word · detail), **B** = button, **D** = card description. `{name}` = the other computer's or friend's name, `{n}` = a number, `{ago}` = "2 h ago", `{cloud}` = OneDrive / Google Drive / Dropbox. "(none)" = delete that text. |
| Fold | what moves under **More** (occasional) or **Advanced** (rare or technical) |
| Logic | any change needed so the words are true |

## 1. Principles

**P1. Status first.** Every card that has a state opens with ONE status line:
a coloured dot, one state word, and at most one short detail.
`● Up to date · Sam's laptop has everything`. The words come from a fixed
list (section 2): Up to date, Syncing, Catching up {n}%, Setting up,
Previewing, Asleep, Off, On, Not set up, Paused, Needs an update, Needs you.
Colours: green = fine; blue, pulsing =
working; grey = calm (off, asleep, not set up); amber = you must do
something; red = it is broken and you must do something. A card has a
status line OR a description, rarely both.

**P2. One sentence.** A card description is one sentence of at most 120
characters. A row hint is one short sentence or nothing. Anything longer
goes into More, a help drawer or the docs. No "Note:", no parentheses
that explain the parentheses, no lists of everything that is not shared.

**P3. Folds for the rest.** Daily things on the face of the card. Occasional
things under **More**. Rare or technical things under **Advanced**
(including "Details for support"). A card has at most one primary button.
Folds start closed, remember their state for the session, and Settings
search opens them (it already opens a parent `<details>`).

**P4. Warn only when the user must act, and give the action.** Amber or red
only when there is something to do, and then with the button that does it
(or the exact step when no button can). Anything that fixes itself is grey
and says what happens next.

**P5. No jargon.** Never on the face of a card or in a status or warning:
UPnP, NAT, CGNAT, double NAT, port, router door, frontier, epoch, fetcher,
lease, transport, shadow/trial mode, apply, outbox, quota, scopes, presence,
wrangler, Worker, Durable Objects, deploy, MCP, connector URL, gateway,
hostname, OAuth, client ID, SHA-256, config.json, rules.json, process id,
supervisor, migrations, 127.0.0.1, console. Allowed only inside
Advanced > "Details for support", Diagnostics, and the setup steps of a
third party's own console (where their UI uses the word).

**P6. Never blame the user's setup for a normal state.** Another computer
asleep or off, no internet for a moment, the first sync, first run, a
friend offline, Cloudflare's daily allowance resting: grey, calm, and say
what happens next ("It catches up when it wakes"). Never "cannot be
reached", "refused", "failed" for these.

**P7. Same words for the same things, everywhere.** Use the glossary
(section 2). Cross-references name the real place exactly
("Settings > Travel & time", not "Settings > Travel"; the switch's real
label, not an older one).

**P8. Sensible defaults, fewer switches.** A switch whose right value
follows from other state becomes automatic (the router switch is off when
the relay is in use). Set-once choices move to Advanced. Three overlapping
"which computer does it" controls become one.

**P9. Never lose capability, never keep a false sentence.** Controls move,
they are not deleted. Text that is no longer true (2.17 added the relay and
friend sharing) is rewritten or removed.

Do and don't, at a glance

| Don't | Do |
|---|---|
| "This computer cannot be reached from the internet: your router does not allow incoming connections. Live sync still works on the same Wi-Fi; otherwise changes go through OneDrive." [Try again] | (nothing on the card while the relay is in use) |
| "Not live: Work laptop is off or asleep; its changes come through OneDrive when it is back." | `Work laptop  Asleep · seen 2 h ago` (grey) |
| A 4-sentence description above the controls | One sentence, or a status line, then the controls |
| "Main computer: Answering your phone: this computer · Answering requests that need Claude: this computer" | `This computer  Main computer` (a chip on the computer's row) |
| "Turn on 'Use changes from my other computers' in Settings > Sync" | "Your bank is read on Sam's laptop. It shows here after its next update." |
| Three hints that each say "end-to-end encrypted" | Say "encrypted" once, in the card's one sentence |

## 2. Glossary

Say the left column; never the middle one on the face of a card.

| Say | Instead of | Notes |
|---|---|---|
| **computer**, this computer, your other computer, "Sam's laptop" | device (for a computer), peer, node, member, host, client, "another device" | "your devices" only when phones are included: "your computers and phone" |
| **phone** | mobile, device | |
| **your relay**, a friend's relay | Worker, Cloudflare Worker, Durable Object, wrangler, transport, home relay, relay origin | "Cloudflare" only while setting it up: "a free Cloudflare account" |
| **Set up my relay** / **Update my relay** / **Stop using this relay** | Connect Cloudflare / Deploy again / Disconnect relay | |
| **Same Wi-Fi** | LAN, same network, local network | "private network" only inside Windows firewall steps |
| **direct** (a path) | live link, live connection, peer-to-peer, "Live with" | |
| **{cloud}** by name (OneDrive, Google Drive, Dropbox), or **your cloud folder** | sync folder, the folder, cloud drive | as a path word: "OneDrive: backup" |
| **Up to date** · **Syncing** · **Catching up {n}%** · **Setting up** · **Previewing** · **Asleep** · **Off** · **On** · **Not set up** · **Paused** · **Needs you** | Synced 12 s ago (as the state), Needs attention, idle, offline, unreachable, not live, no-address, locked, error, Starting... | "Last change {ago}" may be a detail |
| **Needs an update** (another computer on an older OpenDash) | outdated, Older version | |
| **main computer** (one idea: the computer that checks mail and calendar, reads the bank, runs Claude jobs and answers your phone) | fetcher, lease, role, Claude host, finance computer, "Main computer for each account", "Answering your phone", "Answering requests that need Claude" | per-job exceptions live in Advanced > "Which computer does what" |
| **encrypted** (say it once per card) | sealed, locked, scrambled, E2E | "end-to-end encrypted" once, in a More fold or help |
| **4-letter code** (to add a computer) | join code, pairing code | |
| **check code** (numbers both sides compare) | "the 6 numbers", pairing numbers, SAS | used by sync approvals and friend requests alike |
| **recovery code** | recovery key, "sync recovery key" | |
| **OpenDash isn't running** / **OpenDash isn't answering** | The OpenDash server is not running, the server did not answer, HTTP 5xx | "server" only on Settings > Server |
| **update** (the app) | upgrade, release, rebuild, migrate | "Rebuild & restart" stays in Server > Advanced |
| **connection** | connector, source, MCP server | "connector" only inside steps that point at claude.ai's own Connectors screen |
| **your AI apps** (Claude Code, Claude Desktop, Codex...) | MCP client, OpenDash MCP | Advanced: "OpenDash tools for AI apps (MCP)" |
| **what {name} can see** | scopes, permissions, perms, levels | |
| **online status** | presence | |
| **Lock out a lost computer** | renew keys, friend keys | Advanced: "Renew my friend keys" |
| **today's free allowance** / **storage full** | quota, rate limit, requests, rows written | |
| **waiting to send** | outbox, queued | |
| **Preview changes first** | trial mode, shadow mode, "Use changes from my other computers" | Advanced |
| **Update** (a connection or the bank fetching new data: "Update now", "Update bank") | Sync, sync now, bank sync (for that) | **Sync** only means keeping your computers the same |
| **Check-up** (the list of sync problems and fixes) | Health, Sync health | avoids a clash with the Google Health connection |
| **Your name** (one name: greetings, the app title, your card, friends) | Name, Display name, "Your name for friends" | "Show friends a different name" in Profile > More |

## 3. The shared kit

**Built** (the 2.18 foundation, branch feat/218, 24 Oct 2026), together with
UI_CLEANUP_PLAN.md C1 as ONE kit: the code is in `src/app/11-ui-kit.js` and
the styles in `src/styles/01-components.css` (MODULES.md, "The 2.18 kit").
**Do not create `57-settings-kit.js` or `57-settings-kit.css`** and do not
redefine these functions: every batch calls the ones that exist.

One change from the API first written here: the status line is
**`setStatusLine(tone, word, detail)`**, not `setStatus`, because
`setStatus(id, s)` is the task status setter (20-task-model.js) and all
src/app files share one script scope (a second `function setStatus` would
replace it and break every task checkbox). Everything else is as planned:

```text
setStatusLine(tone, word, detail)           -> <div class="set-status" role="status">: the line a card starts with
setStatusPaint(el, tone, word, detail)      repaint it in place (returns el)
setFold(host, key, label, fill, {advanced}) -> <details class="set-more [set-adv]">: a More / Advanced fold;
                                               fill({body, card}) adds rows to body exactly like a _settingsCard;
                                               a fold that fill left empty is not shown
setAction(host, label, run, {icon, kind, disabled, tip, wait})
                                            -> the card's one main button (uiButton, small, kind 'primary'
                                               unless given) on its own .set-action row
SET_TONES = ['ok', 'busy', 'idle', 'off', 'warn', 'err']
  ok green · busy blue, pulsing (still under reduced motion) · idle and off grey ·
  warn amber (the user must act) · err red (broken, the user must act)
```

`host` is a `{card, body}` (from `_settingsCard`) or an element. Classes:
`.set-status` (+ `-ok|busy|idle|off|warn|err`, `.set-status-dot|-w|-d`),
`.set-more` (+ `.set-adv`, `.set-more-b`), `.set-action`. The same kit also
has `uiButton`, `cardHead`, `secHead`, `emptyLine`, `toastError` and
`copyText` (UI_CLEANUP_PLAN.md 3.2 to 3.8): a batch that touches a button,
a header, an empty list, an error toast or a copy uses those too.

Conventions every batch follows

- A card with a state: `_settingsCard(title)` (no description), then
  `card.body.appendChild(setStatusLine(...))` first, then the face rows, then
  `setAction(...)` for the one primary button, then `setFold(card, 'x-more', 'More', ...)`,
  then `setFold(card, 'x-adv', 'Advanced', ..., {advanced: true})`.
- Fold keys are `<group>-<card>-more` / `-adv` so two cards never share one.
- Rows inside folds are built eagerly (closed folds still contain them), so
  Settings search can find and open them.
- `_settingsCard(title, desc)`: `desc` is one sentence or nothing (P2).

## 4. Sync, redesigned (the model for every other card)

Today Settings > Sync is one card of up to 25 rows (58-settings-sync.js:764-901),
followed by two more cards that each explain "which computer does it" in a
different way (58-settings-main.js:21, 58-settings-claude-host.js:58), with a
third version of the same idea inside "Live connection" (syncMainLines,
58-settings-sync.js:119). The new page is one summary card with one primary
action, and everything else under More and Advanced. Tabs stay, renamed.

### 4.1 The page

```
Sync                         [ Sync | What changed | Check-up (1) | Review (2) ]

┌─────────────────────────────────────────────────────────────────────┐
│ ● Catching up · Home desktop 40%                                    │
│ Same Wi-Fi: direct · Elsewhere: your relay · OneDrive: backup       │
│                                                                     │
│  Sam's laptop      ● Up to date        direct                       │
│  Home desktop      ● Catching up 40%   via your relay               │
│  Work laptop       ○ Asleep            seen 2 h ago                 │
│  This computer       Main computer                                  │
│                                                                     │
│  2 edits to review                                   [Review]       │
│                                                                     │
│ [Add a computer]                                                    │
│ ▸ More                                                              │
│ ▸ Advanced                                                          │
└─────────────────────────────────────────────────────────────────────┘
```

A minute later, the usual calm state of the same page reads:
`● Up to date · Work laptop is asleep and catches up when it wakes` (green),
with no router line, no "Try again" and no explanation.

No description under the title. The group description in the settings page
header becomes: **D** "Keep your computers the same, encrypted."

### 4.2 The status line (first match wins)

| # | When | S (tone · word · detail) | Primary action |
|---|---|---|---|
| 1 | sync off (`!st.enabled`) | off · **Off** · Your data stays on this computer | **B** Set up sync |
| 2 | setting up or joining (`syncScreen` = first, join, joining) | busy · **Setting up** · {the step's title, e.g. "Waiting for your other computer"} | the step's own buttons (4.6) |
| 3 | this computer was removed (`removed`) | warn · **Needs you** · This computer was removed from sync | **B** Type a 4-letter code |
| 4 | a Check-up item needs the user (`needsUser`, logic L7): key missing, relay refused, relay storage full, disk full, cloud folder missing or not signed in, cloud app not running with no relay, clock more than 2 min out, old unencrypted sync | warn (err when nothing syncs at all) · **Needs you** · {that check's title, e.g. "OneDrive is not running"} | **B** {that check's fix label} (it runs the same `syncRunFix`) |
| 5 | the user turned on Preview changes first (`apply` off, the old trial mode) | idle · **Previewing** · Changes from your other computers wait for you (Advanced) | **B** Use them now |
| 6 | changes are going out or coming in now (presence summary `busy` for more than 0.8 s, as the top bar already does) | busy · **Syncing** · Sending your changes | **B** Add a computer |
| 7 | a reachable computer is behind (logic L2) | busy · **Catching up** · {name} {pct}% (or "{n} changes to go" when no percentage is known) | **B** Add a computer |
| 8 | every other computer is reachable and has everything | ok · **Up to date** · {name} has everything / your {n} other computers have everything | **B** Add a computer |
| 9 | this computer is up to date, some others are asleep or off | ok · **Up to date** · {name} is asleep and catches up when it wakes / {n} computers catch up when they're back | **B** Add a computer |
| 10 | no other computer yet | ok · **On** · Add your other computer to start | **B** Add a computer |

Never amber for: another computer asleep or off, the relay resting until
tomorrow while the cloud folder carries changes, the first sync still going,
this computer just woke (presence `checking`), a direct link not possible.

### 4.3 The path line

One grey line under the status, built from what this computer actually uses
(a new pure `syncPathLine(st)` replaces `syncLiveLines` on the face):

| Setup | Line |
|---|---|
| relay + cloud folder + direct | Same Wi-Fi: direct · Elsewhere: your relay · {cloud}: backup |
| relay, no folder | Same Wi-Fi: direct · Elsewhere: your relay |
| folder only | Same Wi-Fi: direct · Elsewhere: {cloud} |
| a friend's relay | Same Wi-Fi: direct · Elsewhere: {friend}'s relay |
| direct switched off (Advanced) | drop "Same Wi-Fi: direct" |
| relay resting / unreachable and a folder exists | Same Wi-Fi: direct · Elsewhere: {cloud} for now (your relay is resting until tomorrow) |
| relay resting / unreachable and no folder | Same Wi-Fi: direct · Your relay is resting until tomorrow; changes wait here and go then |

("Resting" covers the relay's `busy` and `rate` states; `offline` says
"your relay can't be reached right now" in the same grey.)

### 4.4 The computer rows

One row per other computer and phone (`st.devices` minus removed ones), then
"This computer". Columns: name · chip · detail. Built by a new pure
`syncComputerRows(st, presenceView)`.

| Chip (tone) | When (logic L1, L2) | Detail |
|---|---|---|
| ● **Up to date** (green) | presence base open or running (or relay socket online, L1) and behind 0 | path now: "direct" (direct link, any network), "via your relay", "via {cloud}" |
| ● **Catching up {pct}%** (blue) | reachable and behind > 0 | path now |
| ○ **Asleep** (grey) | presence asleep | seen {ago} |
| ○ **Off** (grey) | presence off | seen {ago} |
| ○ **Checking…** (grey) | presence `checking` (this computer just woke) | (none) |
| ▲ **Needs an update** (amber) | presence outdated | "On OpenDash {version}: update it there" |
| ▲ **Needs you** (amber) | a Check-up item names this computer and needs the user (wrong key, clock out) | that item's short title; click opens Check-up at it |
| (no chip) phone | phones have no server | seen {ago} |
| **Main computer** (neutral chip) on any row | the main computer (L6) | |

The row is a button: it opens More > "Computers and phones" scrolled to that
computer (rename, remove). No "Try again" on this face: retrying a direct link
is an Advanced action (4.8) and the relay or folder carries changes meanwhile.

The "2 edits to review" row appears only when `st.health.conflictsOpen > 0`,
grey (the later change was already kept, so nothing is wrong):
**T** "{n} edits to review" **H** "Changed on two computers at once; the later one was kept." **B** Review.

### 4.5 What leaves the face

Everything below keeps working; it just moves (section 4.7 and 4.8).

- "Live connection" row with its 3-sentence hint, peer lines, router lines and
  "Main computer: ..." line (58-settings-sync.js:690-724) → Advanced > Details for support, and the path line (4.3).
- "Let my other computers reach this one over the internet" (712) → Advanced, hidden while the relay is in use (L4).
- "Main computer" select (713-721), "Main computer for each account" (674-687),
  the Main computer card (58-settings-main.js) and the Claude card
  (58-settings-claude-host.js) → one "Main computer" row in More, exceptions in Advanced (L6).
- "Live sync" switch (723) → Advanced "Direct on the same Wi-Fi".
- "Syncing through your relay and OneDrive" + "Stop using OneDrive" (727-750) → Advanced > Ways to sync.
- "Use changes from my other computers" trial switch + preview list (843-856) → Advanced "Preview changes first".
- "Folder" / "Also sync through a folder (optional)" (863-864) and "Check the folder now" (865-868) → Advanced > Ways to sync; "Sync now" → More.
- "Devices" list (652-673) → More "Computers and phones".
- "What changed" latest three (syncChangesRow, 58-settings-sync-health.js:254-262) → the What changed tab only.
- "Recovery code" (836-839), "Other ways" (832-835) → More.
- Pictures and audio line (870), "Not synced from this computer" (879-882), "Clock" (877, unless it needs the user: then it is status row 4) → More / Advanced.
- "Sync across my devices: On. Turn it off..." switch (883) → More "Turn off sync on this computer".

### 4.6 Setup screens (sync off, first computer, joining)

| Where | Now | Proposed |
|---|---|---|
| 58-settings-sync.js:766 card | **D** "Keeps your tasks, notes, people, streams and countdowns the same on your computers, through your own relay or a cloud folder you already have (OneDrive, Google Drive or Dropbox). Everything is locked before it leaves this computer: neither can read it. No account. Sign-ins, bank connections and keys never leave this computer." | **T** "Sync" **D** (none). Status line per 4.2. |
| :567 | **T** "Is this your first computer with OpenDash?" **H** "Choose "No" if OpenDash already syncs on another computer of yours." **B** "Yes, this is my first" / "No, I already use OpenDash" | **T** "Is this your first computer with OpenDash?" **H** (none) **B** "Yes, it's my first" / "No, I use it on another computer" |
| :568, :209 syncWhatSyncs | "What syncs: your tasks, notes, people, streams, countdowns, Home, settings and layout. Never: sign-ins, passwords, bank connections or keys." | "Syncs your tasks, notes, people, Home and settings. Never sign-ins, passwords or bank connections." |
| :569, :207 syncNoRelayLine | "Connect your own Cloudflare (free) in Settings > Your relay, or ask a friend who has one for an invite. Until then, sync works through a folder and directly between your computers on the same network." | "Tip: set up your relay (free) to sync anywhere within a second." + ghost **B** "Your relay" |
| :580, :586-588 | "How should your computers sync?" / "Sync through your relay (recommended)" / "Through a folder (OneDrive, Google Drive, Dropbox)" + **H** "Your relay (host) carries your changes locked: it cannot read them, and no cloud app has to be running. A folder works too." | **T** "How should your computers sync?" **B** "Your relay (recommended)" / "A cloud folder" **H** (relay picked) "Fast, works anywhere, and can't read your data." (folder picked) "OneDrive, Google Drive or Dropbox." |
| :586-588 (joining) | "How does your other computer sync?" **H** "Choose "With a link" if your other computer syncs through your relay, or has no shared folder." | **T** "How does your other computer sync?" **B** "With a link from it" / "Through a cloud folder" **H** (none) |
| :598, :211-219 syncFolderHint | "Your personal OneDrive is picked (not the work or school one: your data stays out of your employer's cloud). OpenDash makes an "OpenDash Sync" folder inside it; everything in it is locked, only your computers can read it." | **T** "Cloud folder" **H** "Your personal OneDrive." + only when a work OneDrive exists: "Not the work one: your employer can see that." Joining: "The same one as on your other computer." |
| :600-601, :858-861 | **T** "This computer is called" **H** "How your other computers show this one." placeholder "Work laptop" | **T** "Name this computer" **H** (none) placeholder "Home laptop" |
| :605 | **B** "Turn on sync" / "Find my sync" | **B** "Turn on sync" / "Join" |
| :521 _syncLinkJoin | **T** "Join with a link" **H** "On your other computer: Settings > Sync > Add a computer. Paste the link it shows (send it to yourself), then type its 4 letters. No shared folder needed." | **T** "Paste the link from your other computer" **H** "On it: Settings > Sync > Add a computer." |
| :532 _syncJoinInput | **T** "Type the 4-letter code from your other computer" **H** "On your other computer: Settings > Sync > Add a computer." | **T** "Type the 4-letter code" **H** "On your other computer: Settings > Sync > Add a computer." |
| :622 | **T** "Stop" **H** "Turn sync off on this computer." **B** "Turn off" | **B** (ghost, in the step's own row) "Cancel" |
| :629-630, :806-807 Other ways | "Approve on your other computer" **H** "Your other computer shows 6 numbers; you check this one shows the same." / "Type your recovery code" **H** "The long code you wrote down or printed when you turned sync on: for when your other computer is not around." | More: **T** "Approve with a check code" **B** "Ask my other computer"; **T** "Use your recovery code" **H** "The long code you wrote down when you set up sync." |
| :395 recovery panel | "Write it down or print it, and keep it somewhere safe (not on this computer). You need it to add a computer when your other one is not around, or if you lose this one. OpenDash cannot show it again." | **T** "Your recovery code" **H** "Write it down and keep it off this computer. It's shown only once." **B** "Print" / "I've written it down" |
| :811 plain screen | **T** "Not encrypted yet" **H** "This sync started before encryption. Lock it so the cloud cannot read it; your other computer joins afterwards." | status row 4: warn · **Needs you** · Your synced data isn't encrypted yet **B** "Encrypt it" |
| :154-184 syncPairView (joining side) | "On your other computer, open OpenDash and go to Settings > Sync. It will ask you to check this computer. Nothing yet? Your cloud drive may still be uploading: Ask again sends a fresh request now." | waiting: **T** "Waiting for your other computer" **H** "Open Settings > Sync on it. Nothing yet? Ask again." compare: **T** "Check code" **H** "Is it exactly the same on your other computer?" **B** "Yes, the same" / "No" ; confirmed: **H** "Now click "Yes, the same" there." ; done: **T** "Done" **H** "This computer syncs now." ; declined: **T** "Stopped" **H** "The codes didn't match. Nothing was shared." ; expired: **T** "This took too long" **H** "Nothing was shared." ; other-ended: **T** "Your other computer stopped" **H** "Nothing was shared." |
| :172-183 syncPairView (approving side) | "Does "{name}" show exactly these 6 numbers? Only say yes if they are the same: if they differ, someone else may be trying to get in." | compare: **T** "Check code" **H** "Only say yes if "{name}" shows exactly these numbers." waiting: **H** "Waiting for {name}…" sent: **H** "{name} finishes by itself." the rest as the joining side; "Stopped for safety" **H** "The request changed while it was checked. Nothing was shared; start again on the new computer." |
| :229-259 syncJoinCodeView (offer) | "On the new computer: OpenDash > Settings > Sync > "No, I already use OpenDash", then type these 4 letters. The code works once." + "N wrong tries so far: after 3 it stops working." | waiting: **T** "Type this on the new computer" **H** "There: Settings > Sync > "No, I use it on another computer". Works once." + "{n} wrong so far; it stops after 3." ; approve: **T** "Approve {name}?" **H** "Only if you're adding it now." **B** "Approve" / "Not mine" ; member: **T** "Let {name} use your relay too?" **H** "It already syncs with this computer." ; done: **T** "Done" **H** "{name} syncs now." ; burned: **T** "This code stopped working" **H** "It was typed wrong 3 times. Nothing was shared." ; clash: **T** "Someone else used this code" **H** "Nothing was shared. Start again with only the new computer." ; expired: **T** "The code ran out" **H** "Nothing was shared." ; **B** "Make a new code" |
| :248-258 (joining side) | "Its code is on its way (through your relay or cloud drive). This usually takes a few seconds, sometimes a minute. Try again looks once more straight away." | looking: **T** "Looking for your other computer" **H** "Usually a few seconds." **B** "Try again" / "Cancel" ; sent: **T** "Checking the code" **H** "Approve this computer on your other one." ; wrong: **T** "That code isn't right" **H** "Check the 4 letters and type them again." ; taken: **T** "That code was already used" **H** "Make a new one on your other computer." |
| :481, :494, :496 link box | "No shared folder on the new computer? Use this link" + "Send it to yourself (an email or a chat to yourself), open it on the new computer: OpenDash > Settings > Sync > "No, I already use OpenDash" > paste the link, then type the 4 letters. It works for 2 minutes, for one computer." | **T** "Or send this link to the new computer" **H** "Paste it there with the 4 letters. Works once, for 2 minutes." ; expired: "The link ran out. The 4 letters still work through {cloud}." |
| :822-824 Add a computer hero | **T** "Add a computer" **H** "Shows 4 letters and a link for the new computer (Settings > Sync > "No, I already use OpenDash"). You approve it here before anything is shared." | the card's primary **B** "Add a computer" (no hero block, no hint) |
| :643-648 requests | "A new computer, "{name}", wants to join your sync" **H** "Only continue if you are setting it up now." / removed: "...wants to join again" **H** "Only continue if you are adding it back now. It comes back as a new device; its old place stays removed." | status row 4 style, amber: **T** "{name} wants to join" **H** "Only if you're setting it up now." **B** "Check it's mine" / "Not mine" ; removed: **T** "{name} wants to join again" **H** "It comes back as a new computer." |
| :300 wait errors | "No answer after 90 seconds. It may still finish: this page shows it when it does." | "No answer yet. It may still finish; this page will show it." |

### 4.7 More (the occasional things)

In this order, all rows built eagerly:

| Row | Copy | From |
|---|---|---|
| Computers and phones | **T** "Computers and phones" **H** (none). Each: name · "This computer" / "seen {ago}" · **B** "Rename" · **B** "Remove…". Remove confirm: **T** "Remove {name}?" **H** "It stops getting your changes and keeps what it has." **B** "Remove" (danger). Toast: "Removed {name}." | 58-settings-sync.js:652-673, :666-667 |
| Main computer | **T** "Main computer" **H** "Checks mail, calendar and bank, and runs Claude jobs. Another takes over when it sleeps." select: "Whichever is on" + each computer ("This computer" for this one) | 58-settings-sync.js:713-721 + 58-settings-main.js + 58-settings-claude-host.js (L6) |
| Add a phone | **T** "Add a phone" **B** "Show a QR code" → **H** "Scan it in OpenDash on the phone. Works once, for 10 minutes." | :756-759 |
| Approve with a check code | **T** "Approve with a check code" **H** "For a new computer that can't use the 4 letters." | :754 |
| Recovery code | **T** "Recovery code" **H** "Lost yours? A new one replaces it." **B** "Make a new one…" (confirm **T** "Make a new recovery code?" **H** "The old one stops working." **B** "Make a new one") | :836-839 |
| Sync now | **T** "Sync now" **H** (none) **B** "Sync now" | :865-868 |
| Pictures and audio | "Pictures and audio: {used} of {budget}" (as today, one line) | :870 |
| Turn off sync | **T** "Turn off sync on this computer" **H** "Nothing is deleted." **B** "Turn off" (Undo toast instead of the switch) | :883 |

### 4.8 Advanced (rare and technical)

| Sub-heading / row | Copy | From |
|---|---|---|
| **Ways to sync** | | |
| Your relay | **S** from syncRelayLine (shortened, table 5.2) **B** "Use my relay too" (folder-only computers) / "Stop using {cloud}…" (both) **H** for the latter: "Your other computers should use the relay first." | :727-750, :189-205 |
| Cloud folder | **T** "{cloud} folder" (or "Cloud folder (optional)" when the relay is used) select + "Another folder…" **H** "OpenDash keeps an "OpenDash Sync" folder in it." | :863-864 |
| Direct on the same Wi-Fi | **T** "Direct on the same Wi-Fi" **H** "Changes show within a second when both computers are on the same Wi-Fi." switch | :723 |
| Reach this computer from outside home | shown only when the relay is not in use, or the user has turned it on (L4): **T** "Let my computers reach this one from outside home" **H** "Asks your router to let them in. Not needed with your relay." switch, default per L4 | :712 |
| **Preview changes first** | **T** "Preview changes first" **H** "Lists what your other computers changed, without using it." switch (on = trial mode, i.e. `apply: false`); when on, the preview list as today with **T** "Waiting for you" | :843-856 |
| **Which computer does what** | per job, one line each: "Checks Gmail: {name}" **B** "Use this computer"; "Runs Claude jobs: {mode}" select ("Main computer first, then this one" / "This computer only" / "Only the main computer"); "Claude computer: Same as the main computer" select; "Reads your bank: {name}" (read-only line, the switch lives in Connections > Money) | :674-687, 58-settings-claude-host.js:80-99, 58-settings-main.js:45-47 |
| **Details for support** | per other computer, the old reason lines in plain words (table 5.2 "syncLiveLines"), each with **B** "Try again" / "Stop trying"; this computer's reach line (router, firewall) when the relay is not in use; port, listen error; relay host, state and "{size} waiting to send"; files not synced from this computer; clock difference | :78-117, :877-882 |

### 4.9 Tabs, Check-up and the top bar

- Tabs (58-settings-sync-health.js:90): "Sync · What changed · Check-up ({n}) · Review ({n})". `{n}` on Check-up counts only checks that need the user (L7).
- Check-up page (old Health, :185-214): **T** "Check-up" **D** "Problems that need you, each with one fix." Checks with tone err/warn first; ok and info checks go into a fold **T** "Everything else is fine ({n})". The footer "This computer's own checks (network, firewall, cloud app) are repeated when you click Check again." → "Checked {ago}."
- What changed (:246): **D** "What your other computers changed here, newest first." (drop "(the last 100). Kept on this computer only.")
- Review (:281): **D** "Changed on two computers at once. The later change was kept; pick the other here."
- Top bar sync dot (56-presence.js:107-205, lib/sync/presence.mjs:215-237): the same words as 4.2 and 4.4. Summary texts: "Up to date", "Syncing…", "Catching up", "{name} asleep" (grey, tip "Catches up when it wakes."), "Needs you" (amber). Chips: "Up to date", "Catching up", "Asleep", "Off", "Needs an update". Path words: "direct", "via your relay", "via {cloud}". Buttons: "What changed", "Check-up" (amber primary when it needs you), "Sync settings".

### 4.10 Logic for accuracy (owned by Batch 2)

L1. **Asleep or online, from the relay too.** The relay already knows which
of the person's computers have a socket open: `Group.info()` returns
`devices[].online` and `.seen` (lib/relay/space-group.mjs:168-171), but the
sync client never asks. `lib/sync/relay.mjs` fetches it at most once a minute
while a page is open (the presence tracker's page beat), keeps
`{online, seen}` per device, and `lib/sync-presence.mjs rows()` passes it to
`derivePresence` as evidence: an open relay socket = running now; `seen` =
lastSeen evidence (by the relay's clock, used like a live link's). One request
a minute per open page is far inside the free allowance.

L2. **Which path, and catching up.** `lib/sync-presence.mjs view()`: `path`
becomes `'direct' | 'relay' | 'folder' | null` (today `live | folder`; `via`
stays for the direct link's lan/internet). Relay = the relay transport is
`live` and the device's relay socket is online and there is no direct link.
`pct`: when `st.health.transfer` (first sync) or the live link's
seen/sequence gives a total, `Math.round(done / total * 100)`; otherwise the
row shows "{n} changes to go" from `behind`.

L3. **No router or "can't be reached" lines while another path works.** A
peer whose reason is `cgnat`, `router`, `unreachable`, `no-address` or
`lan-blocked` is shown as its path ("via your relay", "via {cloud}") on the
face and in the top bar; the reason text only appears in Advanced > Details
for support. While the peer is asleep or off (presence), no reason is shown at
all, only "Asleep · seen {ago}".

L4. **The router switch defaults to off when the relay is in use.**
`lib/sync/live/live.mjs:58` stores `internet: true` by default today. Make it
`internet: 'auto'` with `internetSet: false`; the effective value is
`internetSet ? internet : !relayInUse()`, where `relayInUse()` comes from the
engine (`usesRelay()` and the relay transport not `denied`). When the user
flips the switch, store `{internet: v, internetSet: true}`. On load, a saved
`internet: true` without `internetSet` is treated as `'auto'` (it was the
default, not a choice). While the effective value is off: `nat.unmap()`,
mapping state `'off'`, and no reach line anywhere (Settings, Check-up, top
bar). The switch row is hidden while the relay is in use unless
`internetSet && internet` (so a user who turned it on can turn it off).

L5. **Check-up without false alarms.** `lib/sync/health.mjs`: the router,
CGNAT, double-NAT and "cannot be reached over the internet" checks
(health.mjs:218-229) run only when the relay is not in use; with the relay
they are dropped. The firewall checks (:193-203) are `info`, not `warn`,
unless the two computers are on the same Wi-Fi AND there is neither a relay
nor a folder path.

L6. **One main computer.** The More row "Main computer" sets all three
places that pick a computer today, in one go: `POST /api/main-computer {id}`
(lib/main-computer.mjs jobs), `POST /api/sync/live {prefer: [id, ...rest]}`
(lib/sync/live leases: accounts, phone, claude) and `POST /api/claude-host
{host: 'main'}`. "Whichever is on" clears all three (`id: null`,
`prefer: []`, `host: 'main'`). The role labels in live.mjs:576 change to
"Answers your phone" and "Runs Claude jobs"; they only appear in Advanced >
Which computer does what. The Main computer and Claude cards are no longer
mounted below the sync card (58-settings-sync.js:918-919); their content moves
as described, nothing is dropped.

L7. **"Needs you" only for the user's actions.** health.mjs adds
`needsUser: true` to each check whose tone is warn/err AND whose fix is an
action, a view or steps the user must take, AND which is not "another
computer is away". The status line, the Check-up count and the top bar's
amber all use `needsUser`, not the raw tone.

L8. **Device names on the relay page.** Settings > Your relay lists "Your
device 3fA9b1" (58-settings-relay.js:391). Map the device id to the sync
device's name when it matches a known computer (`/api/sync/status`
`devices[].id`); otherwise "A computer added {date}".

L9. **Calm remote waits.** `56-remote-jobs.js` "No answer from {name}" (:64)
uses presence first: asleep/off → "{name} is asleep. It runs this when it
wakes." (the presence calm line), never an error toast.

## 5. Card-by-card tables

Grouped by area, in the order of the build batches (section 8). "B1" etc. =
the batch that owns the file.

### 5.0 The ten worst cards (fix these first)

| # | Card | Where | Why it is the worst |
|---|---|---|---|
| 1 | Sync > Live connection | 58-settings-sync.js:690-724, syncLiveLines :78-117 | The trigger. Out of date since the relay (the router line no longer matters), amber about a non-problem, reports an asleep laptop as a fault ("Not live: … is off or asleep"), jargon (router, "internet provider shares one address", second router), a 3-sentence hint, and a [Try again] for something nobody needs to retry. |
| 2 | Sync, the whole card | 58-settings-sync.js:764-901 | A 3-sentence description, then up to 25 rows on one face; the status is a time ("Synced 12 s ago"), not a state; the trial-mode switch, folder picker, recovery code and "Sync across my devices" switch all sit next to each other. |
| 3 | "Which computer does it" in four places | 58-settings-sync.js:674-687 and :713-721, 58-settings-main.js:21, 58-settings-claude-host.js:58, live.mjs:576 | One idea under three names (main computer, Claude host, "main computer for each account") plus role labels like "Answering requests that need Claude", each with its own long explanation. |
| 4 | Check-up: router, CGNAT, double NAT, firewall | lib/sync/health.mjs:193-229 | "Turn on UPnP (often under Advanced > NAT forwarding)", "Your internet provider shares one address between many homes (CGNAT)" — alarming, technical, and irrelevant while the relay carries changes. |
| 5 | Your relay, main card | 58-settings-relay.js:288-317, :391 | A 3-sentence description, the host name as the status, a 4-sentence hint for Deploy again / Disconnect (incl. "Workers & Pages", "Needs Node.js 20"), and devices shown as "Your device 3fA9b1". |
| 6 | Friends privacy note and the online-status switch | 96-friends-1ui.js:649, :606; 98-perms-2ui.js:435, :536 | The note says friends "never" get your tasks, calendar or money — false since 2.17. Privacy tells people to turn on "Share when I'm online" in Friends, but that switch is called "Show friends when I'm around". |
| 7 | Connections, the top of the page | 56-connections.js:368-402, :501, :512-515 | An eyebrow ("MAKE SPACE FOR YOUR DAY"), a slogan hero ("Less switching. More getting on with your day."), three tiles and a second slogan before the first real control. |
| 8 | AI assistant cards | 56-assistant-cards.js:5-112, 56-connections-assistants.js:10-81 | 16 different status chips ("Local tools connected · browser needs attention"), "Remote Control browser session", "Desktop and Cloudflare are not required", 3-4 sentences per card. |
| 9 | Money on Home and Finances when another computer reads the bank | 12-home-w-finance.js:349, 12-home-w-spendable.js:106, src/finance/10-shell.js:70, 56-fin-connect.js:1109 | Sends people to the old trial-mode switch ("turn on 'Use changes from my other computers' in Settings > Sync") and claims "end-to-end encrypted through your sync folder" when the relay may carry it. |
| 10 | Location history notice | 90-locations.js:33 (also its Settings description, :397) | "…never goes anywhere else" — false since friends can be given your places. |

Close behind: the "Renew my keys" dialog (96-friends-1ui.js:1116-1136, seven
bullets); Settings > Server (58-settings-server.js:212-295: supervisor,
process id, conhost.exe, opendash:// links); Brief and stories' "AI day
adviser" (78-brief-hooks.js:284, four sentences); Animations' "Opening"
(78-brief-hooks.js:332); Settings > Suggestions' 20+ switches on the face.

### 5.1 Settings: the shell and the general pages (B1)

**The settings nav.** 57-settings.js:339-354 lists 28 groups in one flat
column, with a "Connections →" link wedged in after Notifications (348-353).
P2/P3: too long, daily and rare things mixed. Proposed: small section
headings in the nav, no new pages, nothing removed. Logic: a
`SETTINGS_SECTIONS` map in 57-settings.js (`id -> section`), so no other
batch has to touch its registration; the nav prints a heading when the
section changes. Order and names:

| Section heading | Groups (title as shown) |
|---|---|
| You | Profile · Region & language (was "Name & region") · Travel & time |
| Look and feel | Appearance · Animations · Game |
| Tasks and Home | Tasks · Streams · Templates · Home · Brief and stories (was "Home and stories") · Suggestions · Files & auto-link |
| AI and connections | AI · Notifications · Connections → |
| Your computers | Sync · Your relay · Server · Updates |
| Friends and privacy | Friends · Privacy · Location history |
| Data | Data · Diagnostics · Advanced · About |

**Group descriptions** (the one line under each page title, 57-settings.js:360).
Every one becomes one sentence (P2):

| Group (file:line) | Now | Proposed **D** |
|---|---|---|
| profile 57-settings.js:118 | "Your name and how dates and money are shown. Stored in config.json in your data folder." (jargon) | "How dates, times and money look." (title "Region & language") |
| appearance 57-settings.js:204 | "How the dashboard looks. With sync on, your other computers follow." | "How OpenDash looks. Your other computers follow." |
| ai 57-settings.js:227 | "Which Claude model does what. Calls use your own Claude plan through Claude Code; nothing extra to pay." | "Which Claude model does what. It uses your own Claude plan." |
| notifications 57-settings.js:268 | "Desktop notifications while the dashboard is open in a browser tab." | "Reminders while OpenDash is open in a browser tab." |
| tasks 61-task-card.js:1389 | "How tasks and calendar events open, and what the card shows." | "How tasks and events open." |
| streams 58-settings-streams.js:57 | "The areas your tasks belong to. Rename, recolour, reorder or archive them; archived streams keep their tasks." | "The areas your tasks belong to." |
| templates 58-settings-streams.js:149 | "One-click starters shown under quick add. A template fills in the title, stream, tags, priority and date." | "One-click starters under quick add." |
| home 58-settings-home.js:24 | "Your Home board: which panels it shows, hidden amounts, and the working hours the time widgets plan around." | "What Home shows and when you work." |
| brief 78-brief-hooks.js:274 | "The top of Home (the greeting, the day in three sentences, Play my morning), Finish the day and the weekly review." | "The morning greeting, Finish the day and the weekly review." (title "Brief and stories") |
| animations 78-brief-hooks.js:298 | "The little scenes for events and tasks, the weather sky and the small celebrations." | "Scenes, the weather sky and small celebrations." |
| suggestions 68-suggest-ui.js:560 | "Ideas that do the thing when you click them: the button opens the normal editor filled in, for you to adjust and save; the small ✓ does it at once, with Undo. Nothing is ever sent, paid or deleted." | "One-click ideas. Nothing is sent, paid or deleted without you." |
| autolink 66-autolink.js:737 | "Workspace folders to search, what is never read, and how links are suggested and attached." | "Folders OpenDash may search, and how it links them to tasks." |
| time 69-travel-ui-settings.js:256 | "Which time the dashboard shows, your home time zone, and travel features (off until you turn them on)." | "Your time zone, clock and travel features." |
| advanced 58-settings-advanced.js:38 | "For IT teams and developers: your own Microsoft or Google app for signing in." | "Your own Microsoft or Google sign-in app, for IT teams." |
| about 57-settings.js:300 | (none) | (none) |

**Region & language** (was Name & region, 57-settings.js:116-199)

| Where | Now | Problems | Proposed | Fold | Logic |
|---|---|---|---|---|---|
| :130 Name | **T** "Name" **H** "Used in greetings and the app title. Leave empty for just "OpenDash"." | P7: a second name lives in Profile ("Display name") and a third in Friends ("Your name for friends") | moves to Profile as **T** "Your name" (5.7). Here: nothing. | | Profile's "Your name" writes `config.userName` (57-settings.js:126 `settingsSaveConfig({userName})`) and the profile display name; see 5.7 |
| :137 Icon | **T** "Icon" **H** "Shown next to the name in the sidebar and in the browser tab. Click it to pick an icon or emoji, or go back to automatic." | P2; it is a look, not a region | moves to Appearance: **T** "App icon" **H** "In the sidebar and the browser tab." | | |
| :150 Your email addresses | **H** "One per line. Calendars of other people (named after an address not listed here) start switched off; yours and shared group calendars start on." | P2 | **T** "Your email addresses" **H** "One per line. Used to tell your calendars from other people's." | More | |
| :152 Currency | **H** "Used by Finances." | fine | keep | | |
| :158 Language and date format | example line | fine | keep | | |
| :111-115, :168-192 This computer note | "This computer is on {here}. Pages show its clock, but the stories, the assistant and updates use {home}." amber (`is-warn`) | P6: travelling is normal, not a warning | **H** "This computer is on {here}. Home is {home}." grey **B** "Make {here} home" | | drop `is-warn` (57-settings.js:175) |
| :193 Week starts on | **H** "Calendars and week views." | fine | keep | | |
| :196 Working hours (20-task-plan.js:190) | **H** "Free time, focus gaps and planning use these hours (default 09:00 to 18:00, Monday to Friday)." | P7: the same control is on three pages (here, Home, Suggestions) | here: a link row **T** "Working hours" **H** "{09:00–18:00, Mon–Fri}" **B** "Change" → Settings > Home | | 20-task-plan.js keeps `planSettingsWorkHoursRow()`; Home is its one home; Region & language and Suggestions show `planSettingsWorkHoursLink()` (new, same file) |
| :197 Your location (78-brief-hooks.js:265-266) | "Town for the weather (optional)" / "For Home's greeting and the stories. Weather data by Open-Meteo.com." | fine; credit can go | **H** "For the weather on Home." | credit → About | |

**Appearance** (57-settings.js:202-221)

| Where | Now | Proposed | Fold |
|---|---|---|---|
| :207 Theme | **H** "Auto switches to dark in the evening, on each computer by its own clock." | **H** "Auto turns dark in the evening." | |
| :210 Task rows | **H** "Compact fits more on screen." | keep | |
| :215 Reduce motion | keep | keep | |
| :217 Default theme for new devices | **H** "What a new browser starts with." | **T** "Theme for a new browser" **H** (none) | More |
| (new) App icon | from Region & language | **T** "App icon" **H** "In the sidebar and the browser tab." | |

**AI** (57-settings.js:225-263)

| Where | Now | Problems | Proposed | Fold | Logic |
|---|---|---|---|---|---|
| :230-235 callout | "Claude is connected." / "Claude is not connected yet, so AI features are greyed out." + **B** "Connections" | P1 | **S** ok · **Connected** · Claude / off · **Not connected** · AI features are greyed out, **B** "Connect Claude" (only when not connected) | | `setStatusLine` |
| :237 Assistant | **H** "Used when you talk to the dashboard and for task chat." | | **H** "For talking to OpenDash and task chat." | | |
| :239 Quick jobs | **H** "Suggestions, linking people, tidy-ups. A fast model keeps these snappy." | P2 | **H** "Suggestions, linking and tidy-ups." | | |
| :241 Thinking effort | keep | | keep | | |
| :248 Tone and style | **H** "An extra instruction added to every AI request (500 characters)." | | **H** "Added to every AI request." | | |
| :256 Money brief and story | **H** "Claude rewords the money brief on Finances and the money story. It only sees totals, and every number is checked. Off: they keep their own wording." | P2 | **H** "Claude words it from totals only; every number is checked." | | |
| :260 Money wording | **T** "Money wording" **H** "The model for the money brief and story." | P7: model pickers are scattered over four pages | under More **T** "Models for each job": "Money brief", "Morning summary" (from Brief and stories), "Story script" (79-story-engine.js:1213), "Checking links" (66-autolink.js:631), "Scene suggestions" (78-brief-hooks.js:398, today fixed to Haiku: shown read-only) | More | the rows move here; the other pages say "Uses the {Quick jobs} model (Settings > AI)" |

**Notifications** (57-settings.js:266-296)

| Where | Now | Proposed | Fold |
|---|---|---|---|
| (new) status | (hint line only) | **S** ok · **On** / off · **Off** / warn · **Blocked by this browser** · Allow notifications for this page in the browser's site settings | |
| :273-276 Show notifications | **H** varies ("Asks your browser for permission the first time." etc.) | **H** "Your browser asks once." (blocked/unsupported text moves into the status line) | |
| :284 Morning summary | **H** "Once a day: how many tasks are due today and overdue." | **H** "What's due today, once a day." | |
| :289 Before calendar events | **H** "Needs your calendar (Connections)." | keep | |
| :294 Test | **T** "Test" **B** "Send a test" | **B** "Send a test" moves beside the switch (no own row) | |

**About** (57-settings.js:299-319)

| Where | Now | Problems | Proposed |
|---|---|---|---|
| :305 Runs on | "This computer only (127.0.0.1). No account, no cloud, no tracking." | P9: false since sync and the relay; P5 127.0.0.1 | "This computer. No account and no tracking; sync and friends are encrypted." |
| :313 footer | "The OpenDash licence is in LICENSE; full third-party licence texts are in THIRD_PARTY_NOTICES.md and vendor/ in the app folder." | fine for About | keep (add the Open-Meteo credit from Region & language) |

**Tasks** (61-task-card.js:1387-1410)

| Where | Now | Proposed |
|---|---|---|
| :1391 Open tasks and events in | **H** "The centre card is big and keeps you in the middle of the screen; the side panel keeps the list in view. Either one has a button to switch to the other." | **H** "The centre card, or the side panel beside your list." |
| :1394 Scene header | **H** "The animated scene at the top of the card (and a small one in the side panel). Click a scene to change it." | **H** "The animated scene at the top of the card." |
| :1404 Panel and window sizes | **H** "Drag the edge of the sidebar, the side panel, the assistant, the calendar, the card, dialogs and drawers to resize them; double-click an edge to reset it." | **H** "Drag an edge to resize; double-click it to reset." (row → More) |

**Streams and Templates** (58-settings-streams.js)

| Where | Now | Proposed |
|---|---|---|
| :133 New tasks go to | **H** "When a view does not imply a stream (for example Today)." | **H** "When the view doesn't pick one." |
| :175 empty | "No templates yet · Add one for things you type often." | keep |
| :185 Full task templates | **H** "Whole tasks with subtasks and notes, saved from a task's menu." | keep |

**Home** (58-settings-home.js:22-55)

| Where | Now | Proposed | Fold |
|---|---|---|---|
| :37 Widgets | "{n} on Home. Drag, resize, hide or add them in Customise." | keep | |
| :39 Suggestions on Home | **H** "One-click ideas: the button opens the normal editor filled in, the small ✓ does it at once with Undo. More in Settings > Suggestions." | **H** "One-click ideas on Home. More in Settings > Suggestions." | |
| :43 Hide amounts | **H** "Blurs money on Home (Money, Payday & safe to spend) until you point at it. Handy when sharing your screen." | **H** "Blurs money on Home until you point at it." | |
| :53 Working hours | **H** "The hero's free time, Fill the gap, Plan my day and the time suggestions use these." | **H** "Used to plan your free time." (the one home of this control) | |

**Brief and stories** (was Home and stories; 78-brief-hooks.js:272-292, 79-story-engine.js:1187-1223, 79-story-weekly.js:567, 12-home-refresh.js:587)

| Where | Now | Proposed | Fold |
|---|---|---|---|
| 78-brief-hooks.js:278 Open on the first visit of the day | **H** "Home comes forward with today's greeting the first time you open the dashboard each day. It refreshes your calendar, inbox and finances in the background." | **H** "Home greets you the first time you open OpenDash each day." | |
| 79-story-engine.js:1194 The first visit of the day opens as | **H** "Story: full screen with a Play button (your day in three sentences, read out, with scenes and the people you will see). Page: Home, with Play my morning at the top." | **H** "A full-screen story, or Home with Play at the top." | |
| 78-brief-hooks.js:279 Day in three sentences | **H** "A short summary written by Claude, once a day. Needs Claude (Connections)." | **H** "A short summary by Claude, once a day." | |
| 78-brief-hooks.js:280 Model for summaries | **H** "Haiku is quick and light; the others write a little more carefully." | moves to AI > More "Models for each job" | → AI |
| 78-brief-hooks.js:281 Offer "Finish the day" from | keep | keep | |
| 78-brief-hooks.js:282 Temperatures | keep | keep | |
| 78-brief-hooks.js:284 AI day adviser | **H** "Review your day once each morning, afternoon and evening while Home is open (at most three automatic reviews daily). Uses the AI chat model selected in Settings > AI. The manual button can request another review. Tasks and calendar context go to your connected Claude account." | **H** "Claude looks over your day up to three times while Home is open." | More |
| 12-home-refresh.js:587 Refresh everything automatically | (as today) | keep; **H** one sentence | |
| 79-story-weekly.js:567 Weekly review opens as | **H** "The first visit to Home > Week each week: the full-screen story with a Play button, or straight to the step-by-step page." | **H** "A full-screen story, or the step-by-step page." | More |
| 79-story-engine.js:1195 Read it out | **H** "Read stories using the narration voice below. Captions are always on screen; M mutes while it plays. The browser voice keeps stories moving when ElevenLabs is unavailable or its limit is reached." | **H** "Captions are always on; M mutes." | |
| 79-story-engine.js:1199-1223, 79-story-voice.js:23 (Browser voice, Speaking rate, Pitch, Volume, Story speed, Model for the story script, Try the browser voice, ElevenLabs rows) | many rows, long hints ("Local voices keep text on this computer; a voice marked (online) sends text to the browser maker's speech service...") | a fold **T** "Voice" with all of them; Browser voice **H** "Voices marked (online) send the text to the browser maker." ; the story model row → AI > More | More ("Voice"); ElevenLabs rows → Advanced |
| 78-brief-hooks.js:291 Try it | **B** "Go to Home now" | keep | |

**Animations** (78-brief-hooks.js:296-400)

| Where | Now | Proposed | Fold |
|---|---|---|---|
| :313 Animate anyway | **H** "Ignore the system's reduced-motion request in this browser only. Your intensity choice below still applies." | **H** "Ignores your system's reduce-motion setting in this browser." | Advanced |
| :326 Intensity | **H** "How much the interface moves on this device: Off keeps everything still; Playful adds bigger celebrations." | **H** "From Off (still) to Playful." | |
| :332 Opening | **H** "When the app opens: the OpenDash mark, then "Welcome to …" your county (with Regional animations (UK) on) and today's scene from it, full screen, for a few seconds. Later loads that day show just the short mark. A click or any key skips it." | **H** "A short welcome when OpenDash opens. Click or press a key to skip." | |
| :334 Animations | **H** "Weather, scenes and moving text. Everything stays still when this is off." | keep | |
| :335 Celebrate completed tasks | keep | keep | |
| :359, :375, :398 Your keyword rules / Set by hand / Unmatched titles | three rows with explanations | a fold **T** "Scene rules" | Advanced |

**Suggestions** (68-suggest-ui.js:558-610)

| Where | Now | Proposed | Fold |
|---|---|---|---|
| :565 Show suggestions | **H** "On Home, in the Today hero, the morning story and Today's schedule." | **H** "On Home and in the morning story." | |
| :572 How many on Home | keep | keep | |
| :580 Working hours | separate control | link row to Settings > Home (see Region & language) | |
| :584-590 one switch per rule, per area | 20+ switches on the face | fold **T** "Which ideas" | More |
| :597 Muted and dismissed | **H** ""Not now", "Not for this one" and "Fewer like this" so far." | keep | Advanced |
| :607 Counts | **H** "Kept on this computer only; they help rank suggestions you use above ones you skip." | **H** "Helps rank the ideas you use." | Advanced |

**Files & auto-link** (66-autolink.js:600-735)

| Where | Now | Problems | Proposed | Fold |
|---|---|---|---|---|
| (new) status, from `_alStatusBox` (:570-590) | the Status sub-heading is at the bottom (:719-722); its text is "Last run {ago}: {n} tasks, {n} waiting, {n} checked by Claude (judge ...)" | P1 | top: **S** ok · **On** · last run {ago} · {n} links to review / off · **Off**, **B** "Review links" | |
| :621 Auto-linking | **H** "At start, every few hours and after you edit a task, look for the folders, GitHub repos, meetings, emails, people and tasks each open task relates to." | P2 | **H** "Finds folders, repos, meetings, emails and people for your open tasks." | |
| :626 Auto-attach confident links | **H** "Links Claude rates at or above this are attached for you (at most 2 folders or repos per task); the rest wait in Suggested. Every automatic change can be undone." | P2 | **H** "Attaches links Claude is at least this sure of. Everything can be undone." | |
| :631 Check with Claude | **H** "Names, paths, why and short excerpts only (nothing from names-only folders); at most 12 calls an hour." | P2 | **H** "Claude sees names and short excerpts, never "Never read" folders." model → AI > More | Advanced |
| :632 Run every | **H** "While the dashboard is open." | | keep | Advanced |
| :636 Workspace folders | "Indexed by name, size and date, plus a short excerpt of text files. Nothing is changed in them." | | **H** "OpenDash reads names and short excerpts. It never changes them." | |
| :696 Names only | "Folders whose files are listed by name only: their contents are never opened or sent to Claude. Always: client_data, secrets, .env, private." | P7 jargon "names only" | **T** "Never read" **H** "Listed by name only, never opened. Always: secrets, .env, private, client_data." | |
| :719-733 Status + Index now / Auto-link now / Review suggestions | bottom block | | the status moves up; **B** "Auto-link now" stays, "Index now" → Advanced | |

**Travel & time** (69-travel-ui-settings.js, 87-clock-ui.js:340-370)

| Where | Now | Problems | Proposed | Fold |
|---|---|---|---|---|
| 87-clock-ui.js:349-350 Dashboard time | **H** ""Today", due dates, the calendar and greetings use this. Money stays on home time." / not ready: "...Coming soon: the dashboard can't yet show a time other than the computer's." | P9 if the feature exists, the "coming soon" line is false | **H** "Used for "today", due dates and the calendar." | |
| 87-clock-ui.js:361 Home time zone | **H** "Where you live: money days and "home" use it. While you travel, the dashboard follows this computer. Changes apply at once." | P2 | **H** "Where you live. While you travel, OpenDash follows this computer." | |
| 87-clock-ui.js:366 Clock | keep | | keep | |
| 69-travel-ui-settings.js:264 Time zone (link row in Region & language) | **H** "Home: {zone}. The dashboard shows {zone} time. Dashboard time, home time zone and the clock are in Travel & time." | P2 | **H** "Home: {zone}. More in Travel & time." | |
| :49 intro | ""Today", due dates and the calendar follow the time zone below. This works whether or not travel features are on." | P2 | (none) | |
| :105, :111 Travel features | **H** "Notices trips from your calendar, time zone and card payments, and shows local time, weather and tips. Everything stays on this computer." | P2 | **H** "Spots trips and shows local time, weather and tips. Stays on this computer." | |
| :120 browser location | "Asks the browser. On Windows, Chrome may use Windows location services. The dashboard keeps only the nearest city, never coordinates." | | **H** "Keeps only the nearest city." | More |
| :123 Moments | **H** "Arrival, departure and welcome-home cards, at most once each. How much they move follows Appearance > Motion." | P7 wrong place: there is no Appearance > Motion | **H** "Arrival and welcome-home cards. Motion follows Settings > Animations." | |
| :125 Weather where you are | **H** "Sends the city's position, not yours, to Open-Meteo." | | keep | |
| :134-142 Public holidays | three rows | | keep the country on the face; "look them up online (date.nager.at)" **H** "Sends only the country and year." | More |
| :146-147 Exchange rates | | | keep | More |
| :148 Jet-lag tips | **H** "Timing tips after long flights (no medical advice). Meetings with others are never moved." | | **H** "Timing tips after long flights." | More |
| :150 Let Claude see trips | **H** "Adds the current city and trip dates to what Claude and MCP clients see. Off: only the time zone." | P5 MCP | **H** "Claude and your AI apps see your city and trip dates." | |
| :152 Keep past trips | | | keep | Advanced |
| :175-178 Forget all travel history | confirm text long | | confirm **H** "Clears trips and time-zone history and turns travel off. Events, tasks and payments stay." | Advanced |

**Onboarding** (59-onboarding.js)

| Where | Now | Proposed |
|---|---|---|
| :129 welcome | "Your tasks, calendar, money and memories in one calm place. It runs on this computer and keeps everything in your own data folder. Four quick questions, about a minute, and you can skip any of them." | "Your tasks, calendar, money and memories in one calm place, on this computer. Four quick questions; skip any." |
| :132 name | "Optional. Used in greetings and the app title." | "Optional." |
| :135 email | "Optional; add several with commas. Shared calendars of other people then start hidden." | "Optional. Helps tell your calendars from other people's." |
| :139 where | "So that "today", due dates and money look right. Detected from this computer." | "Detected from this computer." |
| :142 home time zone | "Where you live. While you travel, the dashboard follows this computer's clock." | "Where you live." |
| :150 streams | "Streams are the big areas your tasks belong to. Pick a starting set; you can rename, add or archive them any time." | "The big areas your tasks belong to. Change them any time." |
| :169 ready | "Start with a clean slate, or look around with made-up example data first. Right after this, three quick tips show you around." | "Start clean, or explore with made-up examples first." |
| :182 assistant | "Connect your assistant and its OpenDash tools together. Everything else works without an assistant." | "Optional: everything else works without it." |
| :186 Advanced: browser-only Claude connection | in a fold | keep (already folded) |

### 5.2 Sync: every remaining string (B2)

Section 4 is the design; this table is the line-by-line list so nothing is
missed. Files: 58-settings-sync.js, 58-settings-sync-health.js,
58-settings-main.js, 58-settings-claude-host.js, 56-presence.js,
56-presence-notice.js, 56-remote-jobs.js, 86-live-sync.js, lib/sync/health.mjs,
lib/sync/presence.mjs, lib/sync-presence.mjs, lib/sync/live/live.mjs.

| Where | Now | Problems | Proposed | Fold | Logic |
|---|---|---|---|---|---|
| 58-settings-sync.js:903-906 group | **D** "Keep your data the same on your computers through your own relay, or OneDrive, Google Drive or Dropbox, end-to-end encrypted." | P2 | **D** "Keep your computers the same, encrypted." | | |
| :56-66 syncStatusLine | "Off. Your data stays on this computer." / "Trial mode: nothing is applied yet." / "Sync is paused." / "This computer can't read the synced data yet." / "Waiting for the cloud folder." / "Starting..." / "Synced 12 s ago" | P1 (time instead of a state), P5 "trial mode", P6 "Waiting for the cloud folder" for a normal upload | replaced by the table in 4.2 | | new pure `syncSummary(st, presence, health)` → `{tone, word, detail, action}` |
| :68-72 syncDeviceLines (plain screen) | "No other computer yet: turn this on with the same folder on your other computer." / "Another device: {name}, last seen {ago}" | P7 "device" | computer rows (4.4); empty: "No other computer yet." | | |
| :78-117 syncLiveLines | the trigger: "Live sync is off: changes travel through {cloud} (10 to 60 seconds).", the firewall lines (:85-86), "Live sync is ready: it connects as soon as your other computer is on.", "Live with {name} (same Wi-Fi / over the internet)", "Not live: {name} is off or asleep; its changes come through {cloud} when it is back.", "Not live with {name}: using OneDrive ({why})" + **B** "Try again", and the reach lines (:110-115) "This computer cannot be reached from the internet: your router does not allow incoming connections..." | P1, P4, P5 (router, internet provider "shares one address", second router), P6 (asleep reported as a fault), P9 (outdated with the relay) | face: the path line (4.3) and the computer rows (4.4). Advanced > Details for support, one line per computer, grey unless it needs the user: live → "{name}: direct ({same Wi-Fi / over the internet})"; offline → "{name}: asleep, seen {ago}"; no-address → "{name}: no direct address yet (is OpenDash up to date on it?)"; trying → "{name}: connecting…" **B** "Stop trying"; held → "{name}: direct paused" **B** "Try again"; new-key → "{name}: waiting for the new key"; firewall → amber "Windows Firewall blocks direct connections on this Wi-Fi" **B** "Show me how" (opens Check-up at the firewall item); lan-blocked → "{name}: this Wi-Fi keeps computers apart"; cgnat / router / unreachable → "{name}: no direct path; {via your relay / via {cloud}}". This computer (only without the relay, L4): mapped → "Outside home: reachable"; cgnat / double-nat / none / refused → "Outside home: not reachable directly; {cloud} carries changes" **B** "Try again"; trying → "Outside home: asking your router…" | Advanced | L1-L5 |
| :85 firewall line | "Windows asked to allow OpenDash on private networks: click Allow. (Missed it? Start > "Allow an app through Windows Firewall" > tick Node.js for Private.)" | P2; only matters on the same Wi-Fi without the relay | only when L5 says it matters, as a Needs-you item in Check-up: **T** "Windows Firewall blocks OpenDash on this Wi-Fi" + the steps from health.mjs:198 | Check-up | L5 |
| :86 firewallHint | "If Windows asks to allow OpenDash (Node.js) on private networks, click Allow: that lets your other computer connect." | P4 (warns before anything happened) | (none). A first-run toast only, once: "If Windows asks about OpenDash, click Allow." | | |
| :119-123, :703 syncMainLines | "Main computer: Answering your phone: this computer · Answering requests that need Claude: this computer" (with "(taking over)") | P5 role names, P7 a third "main computer" idea | the **Main computer** chip on the computer's row (4.4); per-job lines in Advanced > Which computer does what: "Answers your phone: {name}", "Runs Claude jobs: {name}", "Checks {account}: {name}" | Advanced | L6; live.mjs:576 labels |
| :135 syncKindLabel | "Phone" / "Tablet" / "Computer" | fine | keep | | |
| :187-205 syncRelayLine | "Connected to your relay ({host}): changes arrive within a second." / "Your relay ({host}): checking for changes every minute." / "Connecting to your relay ({host})…" / "Your relay cannot be reached right now." / "Your relay asked OpenDash to slow down for a moment." / "Your relay is resting until midnight UTC (Cloudflare's free daily limit)." / "Your relay's storage for sync is full: Health > Compact now makes room." / "Your relay refused this computer: see Health." / "This computer does not have the key to your relay yet: type a code from a computer that uses it (below)." / "Your relay gave an answer OpenDash did not expect; it tries again by itself." | P5 host on the face, P4 several are amber though they fix themselves | Advanced > Ways to sync > Your relay **S**: live → ok · **Connected**; polling → ok · **Connected** · checks every minute; connecting → busy · **Connecting**; offline → idle · **Can't be reached right now** · tries again by itself; rate → idle · **Slowing down for a moment**; busy → idle · **Resting until tomorrow** · Cloudflare's free daily allowance is used up; quota → warn · **Storage full** **B** "Make room" (runs `compact`); denied without key → warn · **Needs you** · Type a 4-letter code from a computer that uses it; denied with key → warn · **Refused this computer** **B** "Open Check-up"; default → idle · **Unexpected answer** · tries again by itself. The host shows only in Details for support. Outbox sentence (:193) "Changes made here wait on this computer and go as soon as it can." → "{size} waiting to send." (Details) | Advanced | quota and denied feed status row 4 (L7) |
| :207 syncNoRelayLine | see 4.6 | | | | |
| :733 Sync through your relay too | **T** "Sync through your relay too (recommended)" **H** "Your relay ({host}) carries your changes locked, within a second, and does not need {cloud} to be running. {cloud} keeps working alongside." **B** "Use my relay too" | P2, P5 host | **T** "Use your relay too" **H** "Faster, and {cloud} keeps working alongside." **B** "Use my relay too" | Advanced (and status row 4 offers it once as a grey tip) | |
| :734 Your relay (none) | **T** "Your relay" **H** syncNoRelayLine | | the tip in 4.6 | | |
| :740 | "Your relay is not set up on this computer yet. " + syncNoRelayLine | P2 | **S** warn · **Needs you** · Your relay isn't set up on this computer **B** "Set it up" | | |
| :741-742 | **T** "Syncing through your relay and {cloud}" **H** "Both at once: a change goes whichever way is quicker, and each one is used once." / "No shared folder needed. Your relay only ever holds locked data." | P2 | the path line (4.3) says it; row removed from the face | Advanced keeps the relay **S** | |
| :745-746 Stop using {cloud} | **H** "This computer then syncs through your relay only. Your other computers that use only {cloud} should use the relay too first." + confirm text 3 sentences | P2 | **T** "Stop using {cloud}" **H** "Your other computers should use the relay first." confirm **T** "Stop using {cloud}?" **H** "Nothing is deleted. Computers that only use {cloud} stop getting this one's changes." | Advanced | |
| :752-762 _syncAddPanel | "Without the 4-letter code: on the other computer, open OpenDash, go to Settings > Sync, choose "No, I already use OpenDash", then "Other ways" > "Ask my other computer". This computer will then ask you to check it." + "On a phone: open OpenDash and scan this code. It works once, for 10 minutes. Do not share a photo of it." | P2 | More > "Add a phone" and "Approve with a check code" (4.7) | More | |
| :787-795 Try again / What is wrong? | under the status when waiting, error or locked | P4 needs the specific fix | the status row 4 primary button IS the fix; "Try again" → More "Sync now" | | L7 |
| :855 Waiting to be used | "{n} new, {n} changed and {n} removed tasks from {names}; {n} edits clash with yours (the later one would be kept)." | fine, but only meaningful in preview | **T** "Waiting for you" (same sentence) | Advanced (with Preview changes first) | |
| :863-864 Folder / Also sync through a folder | **H** "OpenDash keeps an "OpenDash Sync" folder inside it. Each computer writes only its own files there." / "For a computer of yours that does not use the relay yet: OneDrive, Google Drive or Dropbox." | P2 | see 4.8 | Advanced | |
| :868 Check the folder now / Check now | **H** "It also checks by itself every few seconds." | | More **B** "Sync now" | More | |
| :874 Edits that clashed | "{n} times the same thing was changed on two computers at once; the later change was kept. Latest: {what}, kept the change from {name}. Review lets you keep the other one instead." | P2 | the face row "{n} edits to review" (4.4) | | |
| :877 Clock | "{name}'s clock is about {n} min ahead of this one. Set both to the right time so the newest change wins." | P4 fine when large | only when > 2 min: status row 4 **S** warn · **Needs you** · {name}'s clock is {n} min out **B** "How to fix" (Check-up item) | | |
| :881 Not synced from this computer | "{files} ({why}). They stay as they are on this computer; your other computers keep their own copy." | P2 | "{n} files are too big to sync from here: {first file}…" | Advanced | |
| :883 Sync across my devices | **T** "Sync across my devices" **H** "On. Turn it off to stop syncing this computer (nothing is deleted)." switch | P3 a rare action on the face | More **T** "Turn off sync on this computer" **H** "Nothing is deleted." **B** "Turn off" | More | |
| :918-919 Main computer / Claude cards | two more cards under the sync card | P7, P3 | not mounted; content in More / Advanced (4.7, 4.8) | | L6 |
| 58-settings-main.js:21 card | **D** "One computer runs the automatic jobs, so your bank is not asked twice and Claude does not write the same summary on two computers. On the others they show "Runs on <name>". Anything you start with a click still runs where you click." | P2, P7 | the More row "Main computer" **H** "Checks mail, calendar and bank, and runs Claude jobs. Another takes over when it sleeps." | More | L6 |
| 58-settings-main.js:23-24 | "Loading…" / "The OpenDash server is not running." | P7 "server" | "Loading…" / "OpenDash isn't answering." | | |
| 58-settings-main.js:26 | "No main computer is chosen: every computer runs its own jobs." / "This computer ({name}) is the main computer." / "Runs on {name}. This computer ({name}) leaves the automatic jobs to it." | P2 | the select's value says it ("Whichever is on" / a name) | | |
| 58-settings-main.js:38 | "seen {when}" | fine | keep (in the computer rows) | | |
| 58-settings-main.js:43 | "Only this computer is known so far. Others appear once OpenDash has run on them with sync on." | fine | "Only this computer so far." | More | |
| 58-settings-main.js:44 No main computer / Clear | **T** "No main computer" **H** "Every computer runs its own jobs again." | P8 | the select's "Whichever is on" option | | |
| 58-settings-main.js:46 jobs list | "{job}: here / runs on {name}" | fine | Advanced > Which computer does what | Advanced | |
| 58-settings-claude-host.js:58 card | **D** "AI summaries, the day adviser, task chat, email suggestions and story scripts, and the calendar, email and bank read through Claude's connectors, all run on one computer: the Claude host. While it is on, your other computers use it, even if they have Claude too. When it is off, this computer uses its own Claude." | P2, P5 "Claude host", "connectors" | Advanced > Which computer does what: **T** "Runs Claude jobs" **H** "The main computer while it's on; otherwise this one." | Advanced | L6 |
| 58-settings-claude-host.js:18-25 claudeHostLine | "Claude: using Home laptop" / "Home laptop is off: using this computer" (warn) | P6 amber for a normal state | the same words, grey (tone idle) | | tone: never warn for host-off |
| 58-settings-claude-host.js:27-33 modes | "{Host} first, then this computer" / "This computer only (Claude is not set up here)" / "Only {host}" | P5 | "Main computer first, then this one" / "This computer only" / "Only the main computer" | Advanced | |
| 58-settings-claude-host.js:78 | "Turn on Sync across my devices (above) to use Claude from your other computers." | P7 | (not shown: the whole row needs sync, which is on whenever you see it) | | |
| 58-settings-claude-host.js:89 Run Claude on | **H** "Only for this computer. With the first choice, OpenDash waits a few seconds for the Claude host to answer, then uses this computer." | P2 | **H** "For this computer only." | Advanced | |
| 58-settings-claude-host.js:94-99 Claude host | "Same as the main computer ({name})" / "{name} (off)" / **H** "The computer with Claude and the claude.ai connectors (Calendar, Gmail, Bank). Every computer uses it while it is on." / "No computer with Claude is known yet. Set up Claude in Connections on the computer that should answer." | P5 | **T** "Claude computer" options "Same as the main computer" / "{name}" / "{name} (asleep)"; **H** (none); empty: "Set up Claude in Connections on the computer that should do it." | Advanced | |
| 58-settings-sync-health.js:85-104 tabs | "Sync · Health ({n}) · What changed · Review ({n})" | P7 Health vs Google Health | "Sync · What changed · Check-up ({n}) · Review ({n})" | | count uses `needsUser` (L7) |
| :186 Health card | **D** "Every way syncing can go wrong, checked on this computer. Each problem has one fix." | P2 | **T** "Check-up" **D** "Problems that need you, each with one fix." | | |
| :191-196 head | "Checking…" / "Could not check" / **B** "Check again" | fine | keep | | |
| :209 | "Checked {ago}. This computer's own checks (network, firewall, cloud app) are repeated when you click Check again." | P2 | "Checked {ago}." | | |
| :205-208 list | every check, ok ones included | P3 | warn/err first; ok and info inside **T** "Everything else is fine ({n})" | fold | |
| :246 What changed | **D** "What your other computers changed here, newest first (the last 100). Kept on this computer only." | P2 | **D** "What your other computers changed here, newest first." | | |
| :248 empty | "Nothing from your other computers yet. Their changes show here as they arrive." | fine | keep | | |
| :261 syncChangesRow | **T** "What changed" **H** "The latest changes from your other computers." | P3 duplicate of the tab | removed from the Sync card (the tab has it) | tab | |
| :281 Review | **D** "The same thing was changed on two computers while they could not see each other. The later change was kept; choose here if you want the other one." | P2 | **D** "Changed on two computers at once. The later change was kept; pick the other here." | | |
| :285 empty | "Nothing to review: no clashes are waiting." | fine | "Nothing to review." | | |
| :321 panel buttons | "Needs attention: open Health" / "Sync health" | P7 | "Check-up" (primary when it needs you) | | |
| 56-presence.js:116-117 chips | "Online", "Older version", "Asleep", "Off" | P7 | "Up to date" / "Catching up" (reachable, by `behind`), "Needs an update", "Asleep", "Off" | | L2 |
| 56-presence.js:158-162 _prWay | "Live, same network" / "Live, over the internet" / "Through the sync folder" | P5, P9 (no relay path) | "direct" / "via your relay" / "via {cloud}" | | L2 |
| 56-presence.js:170-171 meta | "last seen {ago}", "{n} changes waiting" | fine | "seen {ago}", "{n} changes to go" | | |
| 56-presence.js:192 | "No other device has joined yet." | P7 | "No other computer yet." | | |
| 56-presence.js:193 | "This computer: {name} · OpenDash {version}" | fine | keep | | |
| 56-presence-notice.js / lib/sync-presence.mjs:96 | "{name} is on {version}: update it to sync everything." | fine | keep (the row chip says "Needs an update") | | |
| lib/sync/presence.mjs:215-237 summarize | "Needs attention", "Sending…", "Sync on", "Checking {name}…", "In sync · {name} online", "{name} asleep · {n} changes waiting" | P7 | "Needs you", "Syncing…", "On", "Checking…", "Up to date", "{name} asleep" (tip "Catches up when it wakes."), "{n} computers away" | | the attention tone only from `needsUser` (L7) |
| lib/sync/presence.mjs:190-204 calm lines | "{name} is asleep. Your changes reach it when it's back." etc. | good (P6) | keep; these are the model for every "away" message | | |
| 56-remote-jobs.js:6, :64, :73 | "Asking Home laptop…", "No answer from {name}", "It did not work." | P6 | "Asking {name}…"; away → the presence calm line; real failure → "{name} couldn't do it: {reason}" **B** "Try again" | | L9 |
| 86-live-sync.js:447 | "Updated by {name}" | fine | keep | | |
| 86-live-sync.js:331-366 conflict dialog | "These were changed both here and {where} at the same time. Everything else was merged. Choose which version to keep:" / "Keep all mine" / "Save choices" | fine | keep | | |
| 86-live-sync.js:409 | "Could not save: the dashboard keeps changing elsewhere. Retrying shortly." | P6 tone | "Still saving: changes keep arriving from another tab. Trying again in a moment." | | |

**Check-up items** (lib/sync/health.mjs; titles **T**, text **H**, fix **B**)

| Line | Now | Problems | Proposed | Logic |
|---|---|---|---|---|
| :64-65 | "Sync is off" / "Your data stays on this computer. Turn sync on to keep your computers the same." / "Set up sync" | fine | **T** "Sync is off" **H** "Your data stays on this computer." **B** "Set up sync" | not `needsUser` |
| :89-96 folder missing | "The OpenDash Sync folder is missing from {cloud}" + 3 sentences + "Start sync again here" with a long warning | P2 | **T** "Your OpenDash Sync folder is missing from {cloud}" **H** "Nothing is written until you choose, so nothing is lost." **B** "Use the one in {path}" / "Choose the folder"; "Start sync again here" → in a More fold under the item with its warning | `needsUser` |
| :98-101 drive away | "{cloud}'s folder is not on this computer right now" / "{cloud} is not there. {cloud} may not be running or signed in, or the drive is not connected. Sync carries on by itself as soon as it is back." | P6 when the relay carries changes | with the relay in use: info, **T** "{cloud} isn't available right now" **H** "Your relay carries changes meanwhile." Without: warn **H** "Start {cloud} or connect the drive." | `needsUser` only without the relay |
| :103-105 can't write | "OpenDash cannot write in the sync folder" + steps | fine (action) | **T** "OpenDash can't write in your {cloud} folder" (steps kept) | `needsUser` |
| :107 | "{cloud} is holding a sync file · It is probably uploading it. Sync tries again by itself in a few seconds." | P4 | info only | |
| :116 | "{cloud} is not running · Without it nothing is uploaded or downloaded, so your other computers do not see changes made here." | P6 with the relay | relay in use: info "{cloud} isn't running; your relay carries changes." Else warn **H** "Start it so your changes reach your other computers." **B** "Open {cloud}" | |
| :118-124 accounts | three cloud-account items | fine (actions) | keep, shorten each **H** to one sentence | `needsUser` |
| :126-127 | "{cloud} has not received this computer's latest changes · It has been on since, so {cloud} may be paused, full, or still uploading." | fine | keep | |
| :136-140 online-only files | "{n} sync files still online-only · ... which is slow, and fails without internet." | P2 | **T** "{n} sync files are online-only" **H** "Keep them on this computer so sync stays fast." **B** "Download them now" | |
| :147-150 outbox | "{size} of changes wait on this computer and go as soon as it can. Meanwhile direct live sync still works when your computers can reach each other." | P5 | **T** "{size} waiting to send" **H** "It goes by itself when it can." | info |
| :152-170 relay states | (as syncRelayLine) + "Cloudflare's free plan allows a set number of requests a day, and today's are used up." etc. | P5 requests, midnight UTC | the words of 5.2 syncRelayLine; resting: **H** "Cloudflare's free daily allowance is used up. Nothing is lost; it's back tomorrow." | quota / denied `needsUser` |
| :164 | "Your relay refused this computer · Its certificate was not accepted." | P5 certificate | **T** "Your relay refused this computer" **H** "If you made a new relay, set it up again here." **B** "Your relay" | |
| :166 | "This computer's {snapshot} too big for your relay · A relay takes snapshots of up to 16 MB..." | P5 snapshot | **T** "Your data is too big for one relay copy" **H** "Changes still sync; a new computer just joins more slowly." | info |
| :168 | "Your relay can carry sync too · Sync through your relay does not need {cloud} to be running, and changes arrive within a second." | fine | **T** "Your relay can sync too" **H** "Faster, and {cloud} keeps working." **B** "Use my relay too" | info, not `needsUser` |
| :176-185 first sync | "{a} of {b} read. {cloud} brings the rest; this carries on by itself." / "Sending this computer's data to {name}" / "{name} has {pct}% so far; it gets the rest when it is on again (last seen {ago})." + "Stop syncing for now" | P6 fine; P3 the stop | keep; "Stop syncing for now" → More | info |
| :193-203 network / firewall | "Windows treats this network as Public · On a Public network Windows keeps your other computers out, even on the same Wi-Fi..." / firewall steps | P4 only when it matters | info unless L5; then **T** "Windows keeps your computers apart on this Wi-Fi" with the steps | L5 |
| :208 | "Same network: changes show within a second." / "Over the internet: ..." | P7 | "{name}: direct" | |
| :211-222 peer items | "Not connecting to {name} · You stopped trying. Changes go through {cloud} (10 to 60 seconds)." / "{name} has not shared how to reach it" / "Waiting for the new sync key" / "A firewall blocks the connection to {name}" / "Something on this network blocks the connection to {name}" / "{name} cannot be reached over the internet · Your internet provider shares one address between many homes (CGNAT)..." / "Neither router lets OpenDash in" / "{name} cannot be reached right now" / "Not live with {name}" | P5, P6, P9 | with the relay in use: one ok item per computer "{name}: via your relay"; asleep/off: "{name} is asleep · Catches up when it wakes." (ok). Without the relay, the cgnat/router items stay as info with the plain words of 5.2 "Details for support" | L3, L5 |
| :226-229 router | "Your router lets your other computers in" / "This computer cannot be reached from the internet · Your internet provider shares one address between many homes (CGNAT). Nothing to fix here..." / "There are two routers in front of this computer..." / "Your router does not let OpenDash in · ... Turn on UPnP (often under Advanced > NAT forwarding)." | P5, P6, P9 (the trigger) | dropped while the relay is in use (L5). Without the relay, info: **T** "Outside home: {cloud} carries changes" **H** "Your router doesn't let your computers in directly. Set up your relay (free) to sync anywhere within a second." **B** "Your relay" (the UPnP steps go into that item's More fold) | L4, L5 |
| :231 | "Live sync is off · Changes travel through {cloud} only (10 to 60 seconds)." | P7 | **T** "Direct on the same Wi-Fi is off" **B** "Turn it on" | info |
| :234-240 clock | "{name}'s clock is about {n} ahead of this one · Or this computer is behind. The newest change wins, so both clocks should be right." / "Requests to the Claude host need the clocks within 10 seconds..." | fine (action), P5 Claude host | keep; "Claude host" → "the main computer" | `needsUser` when > 2 min |
| :244-253 keys | "Type the 4-letter code" / "This computer was removed from sync" / "This computer is not in your sync yet · It needs the key from your other computer." / "Waiting for the sync key" / "Waiting for the new sync key · A device was removed (or a new recovery code made), so there is a new key..." / "{name} still syncs without encryption" / "Encrypted, and this computer has the key · {n} changes in {cloud} did not come from your devices and {n} ignored." / "Your synced data is not encrypted" | P2 | keep titles; shorten **H** to one sentence each; "{n} changes ... did not come from your devices" → "{n} unknown changes in {cloud} were ignored." | |
| :258-265 versions | "Another device uses a newer OpenDash · This version cannot read its changes. Update OpenDash here." / "{name} runs an older OpenDash ({v})" / "This computer runs an older OpenDash" / "Every device runs the same OpenDash" | P7 device | "Another computer has a newer OpenDash · Update this one to read its changes." **B** "Check for updates"; "{name} needs an update · Some things sync only once both are up to date."; ok: "Every computer runs the same OpenDash" | |
| :270-273 old device | "{name} was last seen {ago} · Still using it? If not, remove it: it then gets nothing new, and a week later its files leave the sync folder." / "Remove old device" | P7 | **T** "{name} hasn't been seen for {ago}" **H** "Not using it any more? Remove it." **B** "Remove {name}…" | info |
| :278-281 disk | "The disk is full: sync stopped writing" / "Only {size} free on this computer" | fine | keep | `needsUser` |
| :284 clashes | "The same thing was changed on two computers while they could not see each other. The later change was kept: check it is the one you want." | P2 | **T** "{n} edits to review" **H** "The later change was kept." **B** "Review" | info |
| :291-292 storage | "The sync folder holds {size} · This computer's part: {size}. Compacting writes one fresh snapshot and removes old change logs." | P5 snapshot, change logs | **T** "Sync uses {size} in {cloud}" **H** "Tidy up to make it smaller." **B** "Tidy up" | info |
| :297-298 sleep | "Back from sleep {ago} · Caught up with your other computers and reconnected." | fine | keep | info |
| :301-302 | "Changes from your other computers are listed in Settings > Sync, not used yet." / "Sync is paused · Something went wrong reading or writing the sync folder." | P7 trial wording | "Preview changes first is on" **B** "Use them now"; "Sync is paused · OpenDash couldn't read or write your {cloud} folder." | |
| :307 | "Everything looks good" | fine | keep | |

### 5.3 Your relay (58-settings-relay.js, B2)

New shape: **T** "Your relay" with a status line, one primary action, More
(who can use it, usage, a friend's relay) and Advanced (update, stop using,
Cloudflare details).

| Where | Now | Problems | Proposed | Fold | Logic |
|---|---|---|---|---|---|
| :486 group | **D** "Your private relay on Cloudflare: sync and friends without a shared folder, end-to-end encrypted." | P2 | **D** "Your private relay: sync and friends anywhere, within a second." | | |
| :288 card | **D** "A small private service on your own Cloudflare account (free) that carries your sync and your friends' messages between your devices, end to end encrypted: it only ever holds sealed data. Only you, your devices and the people you invite can use it." | P2, P5 | **D** (none) | | |
| :292-293 status | "Your relay: {host}" / "A friend's relay: {host}" / "Connecting..." / "Not connected" | P1 (host instead of a state), P5 | **S** ok · **On** · On your Cloudflare account, used by your {n} computers{ and {m} friends} / ok · **On** · {friend}'s relay / busy · **Setting up** / off · **Not set up** · Friends can't reach you, and sync uses Wi-Fi and {cloud} only | | friend name from `friendsNameForRelayKey` when known |
| :302 Status row hint | "On your Cloudflare account. All your devices use it." / "Its owner invited you. All your devices use it." / "Without a relay, your devices still sync over your own network and the sync folder, but friends can't reach you." | P2 duplicate of the status | (none) | | |
| :296-301 How friends work | ghost **B** beside the status | P3 | More | More | |
| :303-308 sync offer | **T** "Sync your devices through it too" **H** "Your changes travel locked through your relay within a second, without a shared folder having to be running. Your folder keeps working alongside." / "Sync is off on this computer. Turn it on in Settings > Sync and choose "Sync through your relay"." | P2 | **T** "Sync your computers through it" **H** "Faster than {cloud}, and works anywhere." **B** "Use it for sync" / (sync off) **B** "Set up sync" | | |
| :310 Connect / Deploy again | **B** "Connect Cloudflare" / "Deploy again" | P5 deploy | not set up: primary **B** "Set up my relay" with **H** "Free, about 2 minutes. You sign in to Cloudflare; OpenDash never sees your password."; set up: Advanced **B** "Update my relay" **H** "Puts the newest relay on Cloudflare. Same address; everyone keeps access." | Advanced (update) | |
| :311 Disconnect relay | **B** "Disconnect relay" | P3 rare | Advanced **B** "Stop using this relay" | Advanced | |
| :313-317 Relay row hint | "Deploy again puts the newest relay code on Cloudflare: same address, and its members, invites and devices are kept. Disconnect: all your devices stop using it at once (Undo for a minute), so friends' messages wait on it and sync goes over your network and folder only. The relay keeps running in your Cloudflare account, with its members, until you delete it there." / friend's: "Disconnect: all your devices stop using your friend's relay at once (Undo for a minute). Your friendships stay; to keep receiving messages, connect your own relay or join one again." / not set up: "Free, about 2 minutes. Your browser opens Cloudflare's sign-in: create a free account or sign in, then click Allow. OpenDash never sees your Cloudflare password or sign-in. Needs Node.js {n} or newer, which OpenDash already uses." | P2 (4 sentences), P5 | the hints above; "Stop using this relay" **H** "Your computers stop using it (Undo for a minute). It stays in your Cloudflare account until you delete it there." Drop the Node.js sentence (always true). | Advanced | |
| :182-251 connect steps | step labels + notes; "Signing in happens on Cloudflare's own page: OpenDash never sees your password or sign-in."; "Cancelled. Nothing was changed on your devices."; error **B** "Check again" / "Try again" / "Sign in with another account" / "Use the new relay instead" / "Use a new address" | fine (every wait has Cancel) | keep; "Cancelled. Nothing was changed on your devices." → "Stopped. Nothing changed." | | |
| :236 | placeholder "Or paste an Account ID (32 letters and digits)" | P5 but a Cloudflare console term | keep (third-party setup step) | | |
| :253-284 next card | "You're connected!" / "Your private relay is live on your Cloudflare account, and all your devices use it. Two good next steps:" / "Invite a friend · Send one person a link. You both check a short code before you're connected." / "Your devices sync through it · Changes travel locked through your relay within a second." / "Sync your devices through it too · ... / Turn on Sync first: OpenDash then offers your relay." | P2 | **T** "Your relay is ready" **H** "Next:" steps: "Invite a friend · They get a link; you both check a code." **B** "Invite a friend"; "Sync your computers through it · Changes arrive within a second, anywhere." **B** "Use it for sync" / "Set up sync" | | |
| :322-330 Use a friend's relay instead | **H** "If a friend runs a relay and invited you, paste their invite here. To add them as a friend too, paste the same invite in Friends." | P2 | **T** "Use a friend's relay" **H** "Paste the invite link they sent you." | More | |
| :379 Who can use it | **D** "Your devices and the people you invited. Only they can use your relay; everyone else is refused." | P2 | **T** "Who can use it" **D** "Only your computers and the friends you invite." | More | |
| :391-392 your devices | "Your device {6 chars}" / "Last seen {date}" | P5 an id instead of a name | "{computer name}" / "seen {date}" | More | L8 |
| :396 remove toast | "Removing this device from your relay. A device that still has your identity can sign in again: remove it from Sync too." | P2 | "Removing it from your relay. Also remove it in Settings > Sync." + Undo | | |
| :401 Your devices row | **H** "Each of your computers signs in with its own key." | P5 | **T** "Your computers" **H** (none) | More | |
| :410 member name | "Someone you invited ({id})" | P5 id | "Someone you invited ({date})" | More | |
| :420 revoked | "Removed. You can undo this until {date}; after that their data on your relay is deleted." | fine | keep | More | |
| :423-438 chips + switch | "Can message you", "Syncs their devices", "{n} devices", "Since {date}"; switch label "Also sync" | P7 | "Can message you", "Syncs their computers", "{n} computers", "Since {date}"; switch "Can sync their computers too" | More | |
| :439 Revoke | **B** "Revoke" | P5 | **B** "Remove access" | More | |
| :446 empty | "Nobody else yet. A friend you invite can message you through your relay (and, if you allow it, sync their own devices)." | P2 | "Nobody else yet." **B** "Invite a friend" | More | |
| :450 People | **H** "Revoke takes their access away at once (Undo for 7 days). Removing them as a friend does it too." | P5 | **T** "Friends" **H** "Remove access works at once, with Undo for 7 days." | More | |
| :462-472 invites | "Invite made {date}: message and sync" / "Not used yet · ends {in}" / **H** "Each works once and ends by itself. Make new ones in Friends > Add a friend." | fine | keep | More | |
| :478 Usage | **D** "Cloudflare's free allowance, per day (it starts again at midnight UTC). If it runs out, your relay rests until then: your devices keep syncing over your own network, and messages wait and go later. Nothing is ever upgraded or paid for automatically." | P2, P5 | **T** "Today's free allowance" **D** "If it runs out, your relay rests until tomorrow. Nothing is lost, and nothing is ever paid." rows "Requests" → "Messages and checks", "Stored changes" → "Changes saved", "Storage" | More; plus on the face, only above 80%: **S** idle · **{pct}% of today's free allowance used** | |
| :481 | "Counts are approximate: each part of the relay reports every few minutes." | P2 | "Approximate." | More | |
| :496-497 load error | "Your relay settings could not load: the OpenDash server is not answering." **B** "Try again" | P7 | "OpenDash isn't answering." **B** "Try again" | | |
| :509-511 calm note | "{message} Nothing is lost: your devices try again by themselves." | good | "…your computers try again by themselves." | | |
| :516-518 Your access | "You can message friends and sync your devices through this relay." / "Your storage on it · Set by its owner." | P7 | "You can message friends and sync your computers through it." | | |
| :128 toast | "Your relay is up to date. Its members, invites and devices are kept." | fine | "Your relay is up to date." | | |
| :130-132 celebration | "Your relay is ready" / "Next: invite a friend, and sync your devices through it too" | fine | "...sync your computers through it" | | |
| :160 disconnect toast | "Relay disconnected: your devices no longer use it. It keeps running in your Cloudflare account, with its members, until you delete it there (Workers & Pages)." | P2, P5 Workers & Pages | "Stopped using your relay." **B** Undo | | |
| :169 revoke toast | "{name} can no longer use your relay" + Undo | fine | keep | | |
| :488-491 search entries | "Connect Cloudflare", "Who can use your relay", "Relay usage", "Disconnect relay" | P7 | "Set up my relay", "Who can use your relay", "Today's free allowance", "Stop using this relay" (keywords keep the old words) | | |

### 5.4 Data, Diagnostics, Server, Updates and the banners (B3)

**Data** (58-settings-data.js:124-196, 58-settings-move.js, 58-settings-offsite.js)

| Where | Now | Problems | Proposed | Fold | Logic |
|---|---|---|---|---|---|
| 58-settings-data.js:126 group | **D** "Everything you own lives in one data folder on this computer. Backups and exports are plain files." | P2 | **D** "Your data folder, backups and exports." | | |
| :137 Data folder | **H** "Where your data lives on this computer. Keep it out of shared drives and public repositories." | P2 | **H** "Keep it out of shared and public folders." | | |
| :131 | "The OpenDash server is not running." | P7 | "OpenDash isn't answering." | | |
| :144 Backups | **D** "Made automatically when your data changes (at most every 10 minutes, plus one a day for 30 days)." | P1 | **S** ok · **Backed up** · {ago} / idle · **No backup yet** · The first one is made after your next change. **D** (none). **H** under the buttons: "Automatic; daily copies are kept 30 days." | | newest backup time from `_sdBackups[0].at` |
| :147-154 buttons | "Back up now" / "Download a copy" / "Restore a downloaded copy…" | fine | **B** "Back up now" (primary); "Download a copy" and "Restore a downloaded copy…" → More | More | |
| :158-170 table | the last 6 backups + Show all | P3 | More **T** "Saved backups" | More | |
| :177 Export and import | **D** "Moving to another computer: export everything here, then import it there. Connections and sign-ins are set up again on the new computer." | P2 | **D** "To move computers: export here, import there. Sign-ins are set up again." | | |
| :179-182 buttons | "Export all data (.zip)" / "Import data (.zip)…" / "Export as JSON" / "Export tasks as Markdown" | P3 | face: the first two; "Export as JSON" and "Export tasks as Markdown" → More | More | |
| :187 Share the app | **D** "A clean copy of the app for someone else: no data folder, no settings, logs, sign-ins or secrets. They unzip it, start it, and connect their own Claude." | P2 | **D** "A clean copy of OpenDash for someone else, with none of your data." | | |
| :194 Reset app data | **H** "Empties the dashboard and shows the welcome set-up. Your data folder is backed up first." | fine | keep | | |
| :53-54, :76-77, :93-101 dialogs | restore / import / reset confirms | fine (destructive; they say what is kept) | keep | | |
| 58-settings-move.js:64 OneDrive warning | **T** "Your data is in {cloud}" **H** "{cloud} copies files between computers, but it cannot merge changes made on two of them, so edits can be lost. Move the data to a folder that belongs to this computer only. Every file is checked, nothing is deleted, and you can undo it." | P2; it IS a needs-you warning (correct) | **S** warn · **Needs you** · Your data folder is inside {cloud}, so edits made on two computers can be lost. **B** "Move it out of {cloud}…" **H** in More: "Every file is checked, nothing is deleted, and you can undo it." | More | |
| :69 Move the data folder | **T** "Move the data folder" **H** "Move your data to another folder on this computer. Every file is checked, start-up and assistant settings are updated, and the old folder is kept." | P3 rare | **H** "Every file is checked and the old folder is kept." | Advanced | |
| :41-45 interrupted | "A move was interrupted · It started on {date}. Nothing was switched: OpenDash still uses {path}." **B** "Finish the move" / "Stop it" | fine (action) | keep | | |
| :50-52 moved | "Your data was moved · On {date}, from {a} to {b}." + "The old folder is kept, unchanged, as "{name}". Delete it yourself when you are sure everything works." | P2 | **S** ok · **Moved** · {date}. **H** "The old folder is kept as "{name}"; delete it when you're sure." **B** "Undo move…" in More | More | |
| :74-123 progress | step lines, "Changes are paused for a moment. Please keep this page open." | fine | keep | | |
| :159-209 move wizard | "Your data goes to a folder on this computer that no sync program touches. The suggested place is right for almost everyone." / "Next: show me what will happen" / the plan list | fine (a wizard explains on purpose) | keep; first line → "A folder no sync program touches. The suggestion is right for almost everyone." | | |
| :249-261 undo plan | list | fine | keep | | |
| 58-settings-offsite.js:35 card | **T** "Daily encrypted copy (off-site)" **D** "Once a day, a locked copy of your data goes to a cloud folder, so a broken or lost computer loses nothing. The copy is encrypted on this computer: the cloud only sees scrambled bytes. The newest 14 are kept." | P1, P2 | **T** "Daily encrypted copy" **S** ok · **On** · last copy {ago} / off · **Off** / warn · **Needs you** · The last try failed: {reason} **D** (none); off: **H** "One encrypted copy a day in a cloud folder, in case this computer breaks." | | |
| :38 | "The OpenDash server is not running." | P7 | "OpenDash isn't answering." | | |
| :41-46 set-up | "Folder for the copies" / "Passphrase (at least 10 characters; a few words is easiest)" / "The same passphrase again" / "Write the passphrase down somewhere safe. Without it the copies cannot be opened, and nobody (not OpenDash, not Microsoft) can recover it." / "Switch on the daily copy" | fine (a one-time setup that must warn) | keep; the last line → "Write it down: without it nobody can open the copies." | | |
| :56 | "Use the sync recovery key instead" | P7 | "Use my recovery code instead" | | |
| :62-63 | "Last copy {ago} ({size})." / "The last try failed ({why}): it is tried again every half hour." / "Copies go to · {path} · locked with {what}." | P1 | in the status line; "Copies go to" → More | More | |
| :66-72 | "Make a copy now" / "Change the passphrase…" / "Switch off" / "Look for copies in another folder (for example on a new computer)" | P3 | face **B** "Make a copy now"; the rest → More | More | |
| :97 | "New copies use the new passphrase. Copies made before keep the old one: keep a note of both until the old copies are gone (14 days)." | fine | keep | | |
| :112-113 restore | "{date}. On the computer that made it you can leave the passphrase empty. Your current data is saved as a backup first, so this can be undone." / "Sync recovery key" | P7 | "...Your current data is backed up first." / "Recovery code" | | |

**Diagnostics** (58-settings-data.js:200-240): a support page, so technical words
stay (P5 exception). **D** "For fixing problems. The copied text has no task
content, names, addresses or money in it." → "Details to copy when something
goes wrong. No task text, names or money." Keep the rest.

**Server** (58-settings-server.js)

| Where | Now | Problems | Proposed | Fold |
|---|---|---|---|---|
| :316 group | **D** "The OpenDash local server: restart it, read its log, and choose how it starts." | P2 | **D** "Restart OpenDash, read its log, and choose how it starts." | |
| :212 card | **T** "This server" **D** "The program that saves your data and talks to Claude. It runs on this computer only." | P1 | **T** "OpenDash on this computer" **S** ok · **Running** · since {time} / warn · **Not answering** · {error} | |
| :217 | "The server is not answering: {error}" | P7 | in the status line | |
| :223 Status | "Running, kept running by the supervisor (restarts it if it crashes)" / "Running on its own (started with node serve.mjs: not restarted if it crashes)" | P5 supervisor, serve.mjs | status detail: "restarts by itself if it stops" / "won't restart by itself (started by hand)" | |
| :224-232 kv | Running since, Process id, Port, Version, Data folder, Restarts, Last stop, Last rebuild ("failed at the {step} step: {message}") | P5 process id, port, rebuild | face: Version only; the rest → More **T** "Details"; a failed last rebuild stays on the face as **S** warn · **Needs you** · The last update didn't build **B** "Open log" | More |
| :238-244 buttons | "Restart server" / "Rebuild & restart" / "Open log" / "Stop server…" + tips "Stops and starts the server. Open tabs reconnect by themselves." / "Runs the data migrations and rebuilds the app from its source first. Use after updating the app." | P3, P5 | face **B** "Restart" (primary; tip "Open tabs reconnect by themselves."); More: "Open log", "Stop…"; Advanced: "Rebuild & restart" (tip "Use after updating the app by hand.") | More / Advanced |
| :253 Starting the server | **D** "The server has to be running for OpenDash to save. These are off unless you turn them on, and turning them off removes them again." | P2 | **T** "Starting OpenDash" **D** (none) | |
| :261 non-Windows | "Starting automatically and the Start server button are Windows features. On this computer, do it by hand:" | fine | keep | |
| :282 / :289 Start automatically when I log in | **H** "Adds OpenDash to your Windows start-up apps (for your account only). It starts with no window; stop it here with Stop server." | P2 | **H** "Starts OpenDash, with no window, when you sign in to Windows." | |
| :283 / :291 Enable the Start server button | **T** "Enable the Start server button" **H** "Lets the "server isn't running" banner start it (a opendash:// link for your account only). It always runs this app's start-opendash with no window and ignores anything in the link." | P2, P5 | **T** "Start button on the "not running" banner" **H** "Lets the banner start OpenDash for you." | |
| :285-287 "Now:" lines | "Now: on, but with an old launcher that no longer works. Turn it off and on again to fix it." etc. | fine (actions) | keep, amber only for the broken ones | |
| :295 conhost | "This Windows has no hidden console host (conhost.exe), so a console window flashes up briefly when the server is started this way." | P5 | "A window may flash up briefly when it starts." | More |
| :304 Offline page | **H** "When the server is not running, this browser shows OpenDash with a "server isn't running" banner and a Start server button, instead of an error page. The copy it keeps is only the app page itself (with basic settings such as your name and time zone), never your tasks or other data." | P2 | **T** "Offline page" **H** "When OpenDash isn't running, this browser shows a page with a Start button instead of an error." | |
| :307 | "...Developers: add ?nosw to the address to turn it off." | P5 | (Advanced only) | Advanced |
| :142-143 stop confirm | "This page stops saving to your data folder until the server is started again (your changes are kept in this browser meanwhile). Start it again with start-opendash in the app folder (or your OpenDash shortcut), or Start server in the banner." | P2 | **T** "Stop OpenDash?" **H** "Changes wait in this browser until it starts again (your OpenDash shortcut, or Start on the banner)." | |
| :80-133 restart progress | "Rebuilding and restarting…", "Step 1 of 2 · Downloading the release and checking it", "Migrations, check and build, then start", "The rebuild failed ({step} step), so the previous version was restarted." | P5 migrations | "Step 2 of 2 · Installing and restarting ({s} s)"; failure: "The update didn't build, so the previous version is running again." **B** "Open log" | |

**Updates** (58-settings-updates.js)

| Where | Now | Problems | Proposed | Fold |
|---|---|---|---|---|
| :169 group | **D** "Check for a newer OpenDash and install it." | fine | **D** "Get the newest OpenDash." | |
| :29-32, :122 status + OpenDash version | "OpenDash {v} is available (you have {v})." / "You have the latest version ({v})." / "You have {v}. Not checked yet." + **H** "Updates come from the project's GitHub releases. Checking sends nothing about you; it only asks GitHub for the newest release." | P1, P2 | **S** ok · **Up to date** · OpenDash {v} / busy · **Update available** · {new} (you have {v}) **B** "Update and restart" / idle · **Not checked yet** **B** "Check for updates". **H** "Checking sends nothing about you." | |
| :137 Last checked | row | | More | More |
| :144-149 What's new | release notes | fine | keep under the status when an update is available, else More | More |
| :157 Automatic checks | **T** "Check once a day" **H** "When on, this page asks GitHub for the newest release at most once a day while it is open, and tells you if there is one. Off by default: otherwise OpenDash never contacts the internet on its own for this." | P2 | **H** "Asks GitHub once a day while OpenDash is open. It only tells you; it never installs." | |
| :163 This copy | "A git checkout: updating moves it to the release tag (it refuses when tracked files are changed)." / "Installed from a release zip: updating replaces the app files and keeps your data folder." | P5 git | | Advanced |
| :64-72 confirm | "This downloads the release, checks it against its published checksum, replaces the app files (the replaced ones are copied to the update-backup folder in your data folder first), then rebuilds and restarts the server." + "Your data folder is kept (it is backed up before any upgrade step). It takes about a minute; the page reloads when it is done." | P2, P5 checksum | **T** "Update to OpenDash {v}?" **H** "OpenDash downloads it, checks it, keeps a copy of the old files and restarts. Your data stays as it is. About a minute." | |
| :189, :198 toasts | "OpenDash updated to {v}" / "OpenDash {v} is available" + What's new | fine | keep | |

**Banners**

| Where | Now | Problems | Proposed |
|---|---|---|---|
| 86-hosts-banner.js:54-56 | "OpenDash is open on {name} (seen {ago}). Changes here are paused so the two computers don't overwrite each other. Close it there, or use it here anyway." **B** "Use here anyway" | P2 | "OpenDash is open on {name}, so changes here are paused." **B** "Use it here" |
| :64-65 | "OpenDash is also open on {name} (seen {ago}). Use it on one computer at a time: changes made on both can overwrite each other." | P2 | "OpenDash is also open on {name}. Use one at a time." |
| :76-78 | "OneDrive kept a second copy from {name}…" / "A copy of {file} that was saved on two computers. Nothing was merged." **B** "Keep as a backup" | fine | keep |
| :85-86 | "Your data is in your work or school OneDrive ({org}). Your organisation can see what is there. Move it to your own OneDrive or off OneDrive in Settings > Data > Move." | fine (needs-you) | "Your data is in your work OneDrive ({org}), which your employer can see." **B** "Move it" |
| :92 | "Your data is in OneDrive: use OpenDash on one computer at a time." | fine | keep **B** "Move it" (Settings > Data) |
| :149 | "Kept as a backup: Settings › Data can open it" / "Kept as a backup in state/backups" | P5 path | "Kept as a backup (Settings > Data)." |
| 86-offline-banner.js:222, :265-267 | "The OpenDash server isn't running." / "Your unsaved changes are kept in this browser and saved when it is back." / "Checking again in {s} s." | P7 | "OpenDash isn't running." / "Your changes wait in this browser." / "Checking again in {s} s." |
| :282-292 help | "Start the OpenDash server" / "Double-click your OpenDash shortcut (or start-opendash.bat in the app folder). This page reconnects by itself once it is running." / "To start it from this button next time: Settings › Server › "Enable the Start server button". "Start automatically when I log in" keeps it running from the moment you sign in to Windows." | P2, P7 (the switch is renamed) | "Start OpenDash" / "Double-click your OpenDash shortcut. This page reconnects by itself." / More: "Next time: Settings > Server > Start button on the "not running" banner." |
| :314 | "That change was not saved: the OpenDash server isn't running. Start it, then try again." | P7 | "Not saved: OpenDash isn't running. Start it, then try again." |
| :152 | "OpenDash was updated. Reload to use the new version." | fine | keep |

### 5.5 People, Reviews, Email triage, Waiting (B3)

| Where | Now | Problems | Proposed |
|---|---|---|---|
| 51-people-section.js:148-151 | "Link people when a task is created" / "New tasks will not be linked automatically" / "New tasks link the people their title names" / "Show the names callout again" | fine | keep |
| :160 empty | "Add the people you work with. Tasks that mention them link automatically, and you see what you owe each of them and what you are waiting on." | P2 | "Add the people you work with. Tasks that name them link by themselves." |
| :174 | "Nobody with this id. They may have been merged or deleted." | P5 id | "This person isn't here any more. They may have been merged or deleted." |
| :196-197 callout | "{n} names in your tasks {are} not in People yet, so {their} tasks don't link" / "{n} tasks name someone {they} {are} not linked to" | fine | keep |
| :208 | "Tasks point at "{x}" but there is no profile: create it" | P5 | "Tasks mention "{x}", who isn't in People yet: add them" |
| :437, 54-people-card.js:220 | "Tasks pointed at this id with no profile, so a basic one was made. Add a name and email so it links properly." | P5 id | "Made from tasks that mention them. Add a name and email to finish." |
| :485, :693-694 aliases | "Aliases link tasks that mention any of these names." / "Every address they use, separated by commas. Calendar invites and email from any of them match." / "Tasks that mention any of these names link to this person (3+ letters)." | fine | keep |
| :614-645 recent email | "Add an email address to see recent mail with" / "Gmail sign-in expired. Reconnect" / "Gmail is not connected. Connect" / "No recent email with" / "Nothing in the email snapshot. Connect Gmail" / "Recent email shows here once the OpenDash server is running." | P5 snapshot, P7 server | "...No recent email." / "Recent email shows here when OpenDash is running." |
| :757 merge | "Use this for duplicates. {name}'s task links, emails, aliases and notes move to the person you pick; {name}'s name becomes an alias." | fine | keep |
| :813-820 link dialog | "Also look in descriptions (weaker)" / "Every open task that names someone is linked to them." / "Matched on whole names in the title or a subtask. Unticked ones are left alone." | fine | keep |
| :863 | "Capitalised names in your open tasks that match nobody, and ids tasks point at with no profile. Add the people; ignore the rest (places, companies, books)." | P5 ids | "Names in your open tasks that match nobody. Add the people; ignore the rest (places, companies, books)." |
| 54-people-card.js:590-601 pictures | "Cropped to a square, resized to 256 px and kept in your data folder. PNG, JPEG, WebP or GIF." / "Not available: the Gmail and Google Calendar connections only share names and email addresses, not contact photos, so the dashboard cannot fetch their Google picture." / Gravatar: "Gravatar is a public picture service. Turning it on sends a fingerprint of this address (a SHA-256 hash) to gravatar.com every time the picture loads, and Gravatar sees your IP address. Nothing else is sent." | P2, P5 SHA-256 | "Kept in your data folder. PNG, JPEG, WebP or GIF." / "Not available: your Google connection doesn't share contact photos." / Gravatar **H** "Asks gravatar.com for their picture each time it loads. Gravatar sees your IP address." (the hash detail → More) |
| :823 | "Senders and people copied in on recent email who are not in People yet. Only addresses and names are read; automated senders are left out." | fine | keep |
| :829, :836 | "Reading the email snapshot…" / "Nobody in the recent email is missing. Check email again later for new people." | P5 snapshot | "Reading your recent email…" / "Everyone in your recent email is in People." |
| 34-review-flow.js, 34-review-core.js | step copy | fine (short already) | keep |
| 77-brief-review.js:117 | "Weekly review · Seven short steps. Your answers are kept in this browser until you save." | fine | keep |
| :190, :271 | "Email is not connected, so there is nothing to clear here." / "No calendar data yet: Update calendar first for an accurate picture." | fine | keep |
| :354 | "The AI summary is off in Settings." / "Connect Claude for a written summary." / "The summary could not be written just now." | P7 vague place | "The AI summary is off (Settings > Brief and stories)." |
| 55-email-google.js:264, :345-348 | "No email yet. Update the inbox to read your recent email (subjects, senders and a short preview only)." / "Email triage reads recent subjects, senders and previews (never full emails) from Gmail or any mailbox you connect, and suggests tasks. Nothing is sent, labelled or deleted." / "Every recent thread has a task or needs nothing. Nice." | P2 | "No email yet. Update the inbox." / **T** "Connect a mailbox" **H** "OpenDash reads subjects, senders and previews and suggests tasks. It never sends or deletes." / keep |
| :119, :124, :165, :169 | "Connect Claude to get suggestions." / "Nothing new to look at. Update the inbox first." / "No new tasks in these emails" / "Stopped reading. Nothing was added." | fine | keep |
| 55-email-actions.js:151-152, :222 | "Gmail needs you to sign in again (Connections)." / "Gmail is not connected to Claude: connect it, or use your mail app instead." / "Saved as a draft in your Gmail. Nothing is sent: you send it from Gmail when you are ready." | fine | "Saved as a draft in Gmail. Nothing was sent." |
| 34-waiting.js | Waiting list | fine | keep |

### 5.6 Connections (B4)

The page stacks an eyebrow, a marketing hero, three overview tiles, then the
real content (56-connections.js:496-547). New shape, top to bottom: the view
title "Connections" with **S** "● {n} connected · {m} need you" and **B** "Add a
connection" (primary) + "Check all" (ghost); Email and calendar accounts; Money;
Other connections; AI; then the Advanced fold. Nothing is lost: the hero and
tiles carry no controls.

| Where | Now | Problems | Proposed | Fold | Logic |
|---|---|---|---|---|---|
| 56-connections.js:501 heading | eyebrow "MAKE SPACE FOR YOUR DAY" + "Your accounts, working together." + **B** "Check status" / "Add connection" | P1, P2 (slogan) | **S** ok · **{n} connected** / warn · **{m} need you** · {first one's name} **B** "Add a connection" (primary), "Check all" (ghost) | | `_connPageCounts` already counts both |
| :368-386 hero | "A LITTLE MORE CONNECTED" / "Less switching. More getting on with your day." / "Bring your email, calendar and money into one calm place. You choose what connects." + tags "Read-only accounts · Local data · You're in control" + orbit art | P2 (marketing, no control) | removed; one grey line under the status: "Read-only. Your data stays on this computer." + link "How your data is handled" | | |
| :388-402 overview tiles | "Connected · Sources + local assistants" / "Need attention · A little help to get going / Everything looks clear" / "Your data · Your control · Choose what to share" | P1 duplicate | removed (the status line says it) | | |
| :358-364 privacy drawer | "Your connections, your control" + 4 steps | fine (it is the help) | **T** "How your data is handled"; keep the steps; "The optional OpenDash MCP can read and update dashboard tasks. Its permissions and setup are in "For your AI tools"." → "Your AI apps can read and change tasks if you add OpenDash to them (Advanced)." | | |
| :405-406 sources head | **T** "Your connections" **H** "The things that bring your day together." + chip "Account sources are read-only" | P2 | **T** "Other connections" **H** (none) | | |
| :414-431 filters + search | All / Connected / Needs attention / Paused + "Find a connection…" | P3 for most people (few sources) | shown only when there are more than 6 connections | | |
| :424, :454 | "Your connections are unavailable. Try refreshing when the server is ready." / "Could not refresh connections." | P7 | "OpenDash isn't answering. Try again in a moment." **B** "Try again" | | |
| :427 empty | "No connections match. · Try another search or show all your connections." | fine | keep | | |
| :465-466 AI section | **T** "Your AI assistants" **H** "Connect an assistant and its OpenDash tools together." chip "Dashboard AI uses Claude" | P5-ish, P2 | **T** "AI" **H** "OpenDash's AI uses Claude. Other assistants can use your tasks too." | | |
| :512-515 privacy panel | "Connected doesn't mean giving up control." / "Account sources stay read-only. Choose what to include, and pause or disconnect whenever you like." **B** "How your data is handled" | P2 duplicate | removed (the link sits under the status) | | |
| :519-523 Advanced fold | summary "For your AI tools · OpenDash MCP & connected servers · Advanced" + "Use OpenDash from your own AI tools. The OpenDash MCP can update dashboard tasks; account sources stay read-only." | P5 MCP | summary "Advanced · Use OpenDash from your AI apps, and Claude's own connections" **H** "Your AI apps can read and change your tasks; every change shows here with Undo." | Advanced | |
| :259-323 MCP card | "Use OpenDash from Claude Code, T3 Code or Claude Desktop" / "Gives your own Claude the OpenDash tools: read your tasks, add and change them, reschedule, undo. Every change shows up here at once, with an Undo button." / "Installed, but for another copy of the app" / "Last test …" / "Runs on this computer; nothing is sent anywhere else." / "Add to Claude Code" / setup drawer "Set up the OpenDash MCP" … "Read freely, ask before changes (recommended)" / "Then try it · Restart Claude, then ask for example: "What is due this week on my dashboard?"" | P2, P5 MCP | **T** "OpenDash in your AI apps" **H** "Claude Code, T3 Code or Claude Desktop can read and change your tasks, with Undo here." Status chip: "Added" / "Not added" / "Added for another copy of OpenDash". Drawer title "Add OpenDash to your AI apps" (the word MCP stays in the commands themselves). | Advanced | |
| :529 Google (direct sign-in, optional) | row with status pill | fine | keep | Advanced | |
| :16-24 capability blurbs | "Claude Code on this computer · Uses Claude Code on this computer with your own Claude account. OpenDash tools are included, with no relay hosting costs." / "claude.ai connector · read-only · Finds tasks in recent email and shows mail from the people you work with. It can never send, change or delete mail." / "Events next to tasks · Shows your events next to your tasks. It can never create, change or answer events." | P5 "relay hosting costs", connector | "Claude Code on this computer · Uses your own Claude account." / "Through Claude · read-only · Finds tasks in recent email. It never sends or deletes." / "Events next to tasks · Read-only." | | |
| :85-150 Claude setup steps | "A Claude window opened. Finish signing in there: OpenDash checks again when you come back." … "Using npm instead? npm install -g @anthropic-ai/claude-code. If Claude is installed somewhere unusual, put CLAUDE_CLI_PATH= in a .env file in your data folder." / "Still not working? Run claude in a terminal and type /mcp, then pick the connector to sign in again." | fine (setup steps may name commands) | keep; the npm and CLAUDE_CLI_PATH lines → a "Something unusual?" fold | More | |
| 56-connections-cards.js:182-193 suggestions | "CONNECT WHAT HELPS" / "Your money, in the picture." / "Make room for your schedule." / "Turn email into your next steps." + one sentence each + "Or use a CSV" | P2 slogans | **T** "Add your bank" **H** "Spending and your money brief. Read-only." / **T** "Add your calendar" **H** "Events next to your tasks. A calendar link works without Claude." / **T** "Add your email" **H** "Suggested tasks from recent email. Read-only." / "Or import a CSV" | | |
| 56-connections-cards.js:33-49 card blurbs | "Your bank's CSV export" / "Read-only calendar feed" / "Microsoft browser sign-in · read-only" / "Read-only account source" / "Sample data to explore the dashboard. No account is read or synced." … | P5 "source", "feed" | "CSV import" / "Calendar link · read-only" / "Microsoft · read-only" / "Read-only" / "Example data. Nothing is read." | | |
| :98 | "Read on every sync. Click to switch off." / "Not read. Click to switch on." | fine | keep | | |
| :146-160 states | "New data is paused. Previously imported data stays in your dashboard." / "Sign in again to bring in new data." / "Finish setting up this source to bring in new data." / "Sync this source to check it and bring in new data." / "This source could not be checked. Try syncing again." / "Previous sync failed: …" / "Connector tools checked. Data will be read when you sync." | P7 "sync" means a data refresh here (clash with Sync), "source" | "Paused. What it brought in stays." / "Sign in again to get new data." / "Finish setting it up." / "Update it to check it." / "Couldn't check it." **B** "Try again" / "Last update failed: {why}" / "Ready. Update it to bring in data." The verb for a connection's data refresh is **Update** (glossary: Sync = between your computers) | | |
| 56-connections-assistants.js:10-19, 56-assistant-cards.js:19, :44-48 status chips | "Ready to set up", "Connection needs attention", "Usage limit reached", "Tools added · sign in", "Tools added · check status", "Ready to connect", "Install Codex first", "Browser connector unavailable", "Looking for Claude", "Finish browser sign-in", "Adding OpenDash tools", "Approve the local terminal prompts", "Opening Claude browser", "Dashboard connected · finish browser setup", "Local tools connected · browser needs attention", "Setup needs attention" | P5, too many states | chips: **Not set up** · **Setting up** (with the current step as detail) · **Connected** · **Needs you** (with the one action) · **Usage limit reached** (grey: "back when it resets") | | |
| 56-assistant-cards.js:5-11 card texts | "Link Claude finds or installs Claude Code, signs you in, and adds OpenDash tools to enable dashboard AI. Desktop and Cloudflare are not required. Open connected Claude optionally starts a browser session through Remote Control." / Codex / Grok / Gemini texts | P2, P5 | Claude: **H** "Finds or installs Claude Code, signs you in and adds OpenDash's tools." Codex: **H** "Lets Codex use your tasks. OpenDash's own AI still uses Claude." Gemini: same pattern. Grok: **H** "Opens Grok in your browser; it can't see OpenDash yet." The Remote Control sentence → More | More | |
| 56-connections-assistants.js:37-47, 56-assistant-cards.js:58-95 | "An existing configuration needs review. OpenDash leaves it unchanged." / "Press Link Claude to find an existing installation first, install only when needed, sign in, and add OpenDash tools automatically. Ordinary Claude website chats use a separate connection." / Codex & Gemini long setup lines / "Link Claude enables dashboard AI. Open connected Claude optionally starts an official Remote Control browser session; approve its terminal prompts and keep this computer running. Ordinary Claude chats use a separate connection." / "Claude Code needs a supported subscription or provider account." | P2 | each card face: one sentence + one primary button; the rest → "How it works" fold | More | |
| :62-81 subtitles | "Local assistant · OpenDash tools" / "Enable dashboard AI with local Claude. Browser sessions are optional; no Desktop or Cloudflare." / "Claude Desktop detected; it is optional." / "Also set up on this computer" | P5 | "On this computer" / (none) / (none) / keep | | |
| 56-connections-gate.js:101-103 | "Uses Claude on {name}" / "{name} (off right now: what it made still shows)" | P6 tone ok, P7 | "Uses Claude on {name}" / "{name} is asleep: showing what it made last" | | presence words |
| :136-142 chips | "{x} needs you to sign in again. Click to reconnect." / "Needs {x}: add one in Connections. Click to connect." / "{x} is not working right now. Click to see why." / "Needs {x}, which works through Claude. Click to connect." | fine | keep | | |
| :257, :318, :326 | "Still checking {x}. Try again in a moment." / "The check failed." / "Could not check {x}: {why}" | fine | keep | | |
| 56-accounts.js:329 accounts | **T** "Your email and calendar accounts" **H** "Add as many as you like: personal and work, side by side." | P2 | **T** "Email and calendar" **H** "Read-only. Personal and work side by side." | | |
| :92-93 | "Adding a Google account with one click is coming soon. Until then, Gmail can come in through + Other email with an app password, or through Claude: choose Add connection at the top of this page." / Microsoft equivalent | P2 | "One-click Google is coming soon. For now: Other email (app password), or through Claude." | | |
| :118-120, :141-173 sign-in | "{x} opens in a new tab. Sign in there and say yes." / "Come back to this tab. OpenDash finishes on its own." / "OpenDash only reads. It never sends, changes or deletes your mail or events, and your password stays with {x}." / expiry and retry lines | fine (a flow) | keep; "This sign-in expired (it works for 10 minutes). Press Open the sign-in again to start a fresh one: nothing is lost." → "This sign-in ran out. Open it again; nothing is lost." | | |
| :181-205 own Microsoft app | "Advanced: use your own Microsoft app" + Entra steps | fine (folded, third-party console words) | keep | Advanced | |
| :229-232 | "Coming soon: Yahoo, iCloud and others with an app password" / "An app password is a special password your email provider makes just for apps like OpenDash. When this arrives, OpenDash will show you where to get one, step by step." | P2 (only shown when the server has no app-password support, 56-accounts.js:225) | **T** "Yahoo, iCloud and others: coming soon" **H** "Have a calendar link from them? Add it now." **B** "Add a calendar link" | | already gated; no change |
| :242-251 org approval | "Your organisation needs to approve OpenDash once" + 5 lines | fine (needs-you, with Email my IT team) | keep | | |
| :311 remove | "Remove this account? · OpenDash stops reading {x} and forgets the mail and events it saved from it. Your account itself is not changed." | fine | keep | | |
| :341, :347 | "Your accounts did not load: …" / "No accounts yet · Add your first one above. OpenDash only reads: it never sends, changes or deletes anything." | fine | "No accounts yet." | | |
| :359 onboarding | "Email and calendar (optional) · Add your accounts now or later from Connections. OpenDash only reads." | fine | keep | | |
| 56-accounts-google.js:19-64 | permission blurbs and the "Google hasn't verified this app" explanation (3 sentences) | fine (prevents a scary moment) | keep; shorten :63 to "Google reviews Gmail apps through a paid assessment this copy hasn't had. It's not a sign that anything is wrong." | | |
| :160-198 own Google app | Google Cloud steps | fine (folded) | keep | Advanced | |
| 56-accounts-imap.js | address, app password, server fields | fine | keep; "Mail server (IMAP)" and SSL/TLS fields → "Server settings" fold | More | |
| 56-google-health.js:13-38 | "Google Health & Fitbit · read-only" / "Connect your activity and sleep to OpenDash. Google handles sign-in and consent; your synced data stays in your local data folder." / "One-time Google Cloud setup required. Google currently limits access to approved projects." | P2, P4 (an amber-ish card nobody can act on) | **S** off · **Not available yet** · Google only lets approved projects connect. **H** "Activity and sleep, read-only." Setup steps → Advanced | Advanced | |
| :100-132 | the long setup (OAuth client, scopes, redirect address) | P5 (third-party console words, allowed in the steps) | keep, in Advanced | Advanced | |
| 56-hosted-relay.js:42-64 | "Claude in your browser · OpenDash and its tools, one connection" / "Claude requests and selected dashboard responses pass through the shared relay. Your main dashboard stays local; changes are proposals you approve in OpenDash." / "The OpenDash service operator must publish the shared relay before Link Claude is available." / "Copy connector URL" / "Revoke Claude access" | P5 shared relay, connector URL; P7 "relay" means something else here | **T** "Claude in your browser" **S** off · **Not available in this copy yet** (when unpublished) / ok · **Linked**; **H** "claude.ai can read your tasks and suggest changes you approve here." | Advanced | rename "shared relay" in copy to "OpenDash's link service" so "relay" only means the user's relay |
| 56-remote-mcp.js:26-54 | "Use a hostname managed by Cloudflare. The tunnel connects to the separate MCP gateway on port 4911." / "In Cloudflare, route this hostname to http://127.0.0.1:4911. Then add the /mcp URL as a custom connector in Claude's browser settings…" / "Gateway started. Connect your Cloudflare Tunnel next." | P5 (a developer feature) | keep as is, but only inside Advanced, under **T** "Claude in your browser, through your own Cloudflare Tunnel (for developers)" | Advanced | |
| 56-sources.js:125, :168-175, :251, :284 | "Retry sync to update your data." / "Come back here and click Sync now." / "{x} is up to date." / "{x}: connector tools are ready. Sync now to read and update your data." | P7 "sync" (clashes with Sync between computers), P5 connector tools | "Try updating it again." / "Come back here and click Update now." / keep / "{x} is ready. Update now to bring in your data." **B** "Update now" | | L21 |
| 56-sources.js:299 | "Banks, calendars and mailboxes the dashboard reads from. Add as many as you like; each one only ever reads." | fine | "Each one only reads." | | |
| :346, :363, :547 | "MCP servers in your Claude · From claude mcp list · checked {ago}" / "No MCP servers yet. Connect one on claude.ai (Settings > Connectors) or with claude mcp add, then check again." | P5 | **T** "Claude's own connections" **H** "Checked {ago}." / "None yet. Add one on claude.ai (Settings > Connectors), then check again." | Advanced | |
| :540 | "Only user-scope servers can be used" / "Needs sign-in in Claude first" / "Not working in Claude right now" | P5 user-scope | "Only connections set up for you (not for one folder) work here" / keep / keep | | |
| :554-582 tool picker | "Which tools may {x} use?" / "Only tools that read are ticked. Tools that could change, send or delete anything are locked: the dashboard never allows them." / "can change data · never allowed" / "not sure: tick only if it just reads" | fine (a safety screen) | keep | | |
| :596-606 iCal | "Paste the calendar's iCal link" / "In Google Calendar: Settings > your calendar > "Secret address in iCal format". In Outlook: Settings > Shared calendars > Publish. The link stays on this computer." | fine | **T** "Paste your calendar's link" (iCal stays in the steps) | | |
| 56-fin-connect.js:1082 Money block | **H** "Banks and wallets that bring transactions into Finances. Pick the way that suits each one." | fine | **T** "Money" **H** "Read-only. OpenDash can never move money." | | |
| :29-95 provider cards | each provider has 5-6 lines (what, cost, limits, needs, how it works) e.g. Aureli :38-44, Monzo :60-66, Enable Banking :71-77, Plasma :49-55 | P2 | face: name + one line ("Monzo · free · read-only", "Most UK and EU banks · free · sign in every 90 days", "Through Claude · uses a little Claude usage", "Any bank · CSV file"); the rest → "Details" fold on each card | More | |
| :1109 | "Your finances come from {name}, end-to-end encrypted through your sync folder. Bank sign-ins stay on the computer that reads the bank, never in the page, logs or exports." | P9: not true with the relay | "Your bank is read on {name}; this computer gets the results, encrypted. Bank sign-ins stay on {name}." | | |
| :1110 | "Transactions are saved in your data folder on this computer. Sign-ins for direct connections are kept on this computer only, outside the data folder, never in the page, logs or exports. Disconnecting deletes them." | P2 | "Transactions stay in your data folder. Sign-ins stay on this computer only." | | |
| :766, :880-936 finance computer | "...once it is done this computer becomes the finance computer" / "Sign in to this bank on this computer instead" / "{name} reads your bank. Its accounts show here after its {next} update." | P7 "finance computer" (a fourth role name) | "...then this computer reads your bank instead." / keep / keep. The phrase is "the computer that reads your bank" everywhere | | |
| :345-359 errors | "The OpenDash server isn't running. Start OpenDash and try again." / "This needs a newer OpenDash server. Restart OpenDash after updating." / "The provider asked us to slow down…" | P7 server | "OpenDash isn't running. Start it and try again." / "Restart OpenDash to finish updating." / keep | | |
| :1129-1130 | "New transactions are paused until you do. Open Connections > Money." / "Banks ask for this every few months." | fine (needs-you) | keep | | |
| 56-connection-flow.js:7-25 | "Sign in to the connector in Claude. OpenDash will verify it when you return." / "Connection verified and data updated." / "You are back from signing in, but the data update did not work" | P5 connector | "Sign in to {x} in Claude's window. OpenDash checks when you come back." / keep / "You're signed in, but the update didn't work." **B** "Try again" | | |

### 5.7 Profile (97-profile-*.js, B5)

| Where | Now | Problems | Proposed | Fold | Logic |
|---|---|---|---|---|---|
| 97-profile-2ui.js:35 group | **D** "You: your name, status, avatar and the badges you show. It follows you to your other devices, and friends see your card." | P2, P7 device | **D** "Your name, picture, status and badges. Friends see your card." | | |
| :45 intro | "This is your card: in the top-left corner, in your profile, and what your friends see. Click your avatar in the corner to set a quick status or see your friends." | P2 | "Your card. Friends see it too." | | |
| :60 About you | **D** "All of it is optional. Plain text only." | P2 | **D** (none) | | |
| :70 Display name | **T** "Display name" **H** "Shown on your card and to friends. Greetings still use the name in Name & region." | P7: three names (Name & region "Name", this, Friends "Your name for friends") | **T** "Your name" **H** "In greetings, the app title and your card." More: **T** "Show friends a different name" (switch + field) | More | saving writes `config.userName` (`settingsSaveConfig({userName})`, 57-settings.js:75) and the profile display name; the friends name (`/api/friends/me {name}`) follows the display name unless "a different name" is set. Onboarding's name (59-onboarding.js:132) already writes `userName` |
| :72 Pronouns | **H** "Optional." | P2 | **H** (none) | | |
| :87 What I'm working on | **H** "Type it, or pick one of the tasks you are doing." / "One line." | fine | keep | | |
| :89 Card colour | **H** "The colour of your card, your ring and what friends see." | P2 | **H** "Your card and ring." | | |
| :90 Reacts to your day | **H** "Your avatar grins on a streak, sparkles when the week's quests are done, gets sleepy late at night and wears a party hat on your birthday." | P2 | **H** "Your avatar reacts to streaks, quests, late nights and your birthday." | More | |
| :143 Status | **H** "A quick line with an emoji. The presets clear tonight." | fine | keep | | |
| :153 Your avatar | **D** "Pick each part. Some open up as you level up, earn achievements or when their season comes round, and stay yours." | P2 | **D** "Some parts unlock as you level up." | | |
| :309 Badges you show | **D** "Pick up to six of the achievements you have earned, or let your card show the newest three." | fine | keep | | |
| :363 Favourite places | **D** "Up to five. Names only, never coordinates. Friends see them only if you switch it on under Friends." | P7 wrong place: the switch is on this page ("What friends see") | **D** "Up to five, names only. Friends see them only if you turn it on below." | More | |
| :409 What friends see | **D** "Your card goes to your friends through OpenDash Friends, end-to-end encrypted. Your level and streak are shared by the game." | P2 | **D** "Your card goes to your friends, encrypted." | | |
| :414 What goes | **T** "What goes" **H** "Your display name, pronouns, bio, status, what you are working on, the card colour, your avatar and the badges you show. Nothing else from your dashboard." | P2 | the **B** "Preview what friends see" says it | More | |
| :415 Favourite places switch | **H** "Off unless you switch it on. Names only." | fine | **T** "Share favourite places" **H** "Names only." | | |
| :418 Send it now | **B** "Send it now" + toasts "Your card is on its way to your friends." / "Not sent yet: Friends is not ready. It goes as soon as it is." | P3 (it sends by itself) | More | More | |
| :419 | "Friends is not set up on this dashboard yet; your card goes as soon as it is." | P2 | "Friends isn't set up yet." | | |
| 97-profile-3corner.js:101, :154 | "{name}: your profile, friends and workspace menu" / "Your profile, friends and workspace" | fine | keep | | |
| :170, :303-311 | menu "Relay and sync": "Your relay · {word}" / "Sync · {word}" | P7 words | words from the glossary: relay "On" / "Not set up" / "Resting"; sync "Up to date" / "Syncing" / "{name} asleep" / "Needs you" | | `_pfcSyncWord` uses `syncSummary()` (5.2) when present |
| :230-255 status | "Quick statuses: each clears tonight" / "Write your own…" | fine | keep | | |
| :290 | "No one is around right now." / "A friend request is waiting for you." / "No friends yet." | fine | keep | | |

### 5.8 Privacy: what friends can see (98-perms-*.js, B5)

| Where | Now | Problems | Proposed | Fold | Logic |
|---|---|---|---|---|---|
| 98-perms-2ui.js:637 group | **D** "What your friends can see. Only what you turn on leaves this computer, end-to-end encrypted, to that friend." | P2 | **D** "What each friend can see." | | |
| :646 overview | "Profile and game progress are shared with friends to start with. Everything else is off until you turn it on for a friend you trust." | P1 | **S** ok · **Sharing** · Your card and game progress with {n} friends{; more with {m}} / idle · **Stopped** · Nothing goes to anyone **B** "Share again" / idle · **No friends yet** | | |
| :650 | "All sharing has been stopped since {date}. Your choices are kept." | P1 | in the status line ("Stopped since {date}") | | |
| :654 Stop sharing everything | **H** "One click: nothing more goes to anyone (Together spaces, cheers and challenges pause too), and every friend's app is asked to delete what you shared with them (after 15 seconds, so you can undo)." | P2 | **H** "Nothing more goes to anyone, and friends are asked to delete what you shared. Undo for 15 seconds." (stays on the face: a safety control) | | |
| :658 | "No friends yet. When you add one in the Friends tab, you choose here what they can see." | fine | "No friends yet." **B** "Add a friend" | | |
| :672-674 per friend row | "Nothing goes to them." / "Last received from you {ago}" | fine | keep | | |
| :686-700 Sharing activity | **D** "What went to whom and when. The log keeps no copy of the data itself." + **B** "Send changes now" / "Nothing new to send" / "Changes not sent ({why}). They go again by themselves; or try now." | P3 | **T** "Sharing activity" (whole card) | More | |
| :716-720 How sharing works | three sentences | fine (help) | **T** "How sharing works" | More | |
| :462-463 friend panel | **T** "What {name} can see" **H** "Only what you turn on here ever leaves this computer, and only to them. Profile and game progress are on to start with; everything else is off." | P2 | **H** "Only what you turn on goes to them." | | |
| :468-470 | "{name} is blocked: nothing goes to them." / "Nothing goes to {name} until you are both confirmed friends." / "All sharing is stopped. Your choices are kept for when you share again." / "Sharing with {name} is stopped. Your choices are kept." | fine | status lines (idle) | | |
| :476 trusted | "{name} can be given more than your profile and game progress." / "Turn this on to share tasks, calendar, money, places, memories or presence with {name}." | P5 presence, P2 | **T** "Trusted friend" **H** "Needed to share tasks, calendar, money, places, memories or online status." | | |
| :484 | **B** "Stop sharing with {name}" | fine | keep | | |
| :435, :536 online status gate | "Also turn on "Share when I'm online" in the Friends tab: until then nobody sees it." / "Nothing goes yet: "Share when I'm online" is off in the Friends tab." | P7: there is no switch called "Share when I'm online"; the real one is "Show friends when I'm around" (96-friends-1ui.js:606) | "Your online status is off for everyone." **B** "Turn it on" | | the button sets `/api/friends/me {presence: {share: true}}`; the label in Friends becomes "Online status" (5.9) |
| :312-351 how long | "How long {name} can see your {x}" / "Always, until I change it" / "Between two days" / "When the time is over, nothing more is sent and their copy is deleted." | fine | keep | | |
| :367, :373 confirms | "Share {x} in full with {name}?" / "{name} is a trusted friend now, and sees your {x}: {what}" | fine | keep | | |
| :504-552 preview | "What {name} can see" / "Exactly what would go to {name} now, made by the same code that sends it. Nothing else leaves this computer." / "The data as sent ({kind}, {size} KB, end-to-end encrypted)" | P5 "the data as sent" fine | **H** "Exactly what would go to {name} now." the technical line → a fold | More | |
| :563-621 received | "What {name} shares with you" / "Kept read-only on your own devices. {name} can stop sharing at any time and it disappears here." / "Remove from this computer" | P7 devices | "Kept read-only on your computers." | | |
| 98-perms-0logic.js:64-77 level labels | "Game progress", "Level and streak", "Online, focusing, travelling", "Only tasks I share / Chosen streams or tags / All my tasks", "Busy or free only / Times and titles / Full details", "A summary in words / Full totals", "Exact places", "Memories & journal", "Only what I choose" | fine | keep; the scope "presence" is labelled "Online status" | | |
| :204-205 warnings | "They will see your spending this month by category… Only share this with someone you would show your bank app to." / "...where you are now to about 1 km… Only share this with someone you would trust with your address." | fine (P4: a real decision) | keep | | |
| :209-223 what each level sends | lists of fields | fine (shown in Preview) | keep | | |
| 98-perms-1core.js:106-137 toasts | "{name} is a trusted friend: you can now share more with them" / "Stopped sharing with {name}. Their copy is deleted in 15 seconds unless you undo." / "Stopped sharing everything with everyone. Friends' copies are deleted in 15 seconds unless you undo." | fine | keep | | |
| :740-746 share a task | "They see its title, due date, status, priority, stream, tags and steps done. Only trusted friends can be given tasks." / "Not a trusted friend: trust them on their page first" | fine | keep | | |

### 5.9 Friends (96-friends-*.js, B5)

| Where | Now | Problems | Proposed | Fold | Logic |
|---|---|---|---|---|---|
| 96-friends-1ui.js:263-266 header | "Your hangout" / "Bring your people" + "{n} friends · {m} around now. Cheer each other on, compare streaks, and do things together." / empty: "Add a friend to cheer each other on, see each other's levels and streaks, and do quests together. Everything between you is end-to-end encrypted." | fine (a page header, playful on purpose) | keep; empty → "Add a friend to cheer each other on and do quests together." | | |
| :270 code chip tip | "Your friend code: people on your relay add you with it. Click to copy." | fine | keep | | |
| :315-317 no relay | **T** "No relay yet" **H** "Friends talk through a small private relay: your own (free on Cloudflare, a few clicks), or a friend's that you join with their invite. It only ever sees scrambled messages." + "This version of OpenDash doesn't include relay support yet: it arrives with the relay update." **B** "Connect Cloudflare" / "Paste a friend's invite" | P2, P5, P9 (the support line is out of date since 2.17) | **S** off · **Not set up** · Set up your relay to add friends **H** "Free, about 2 minutes. Or join a friend's with their invite." **B** "Set up my relay" / "Paste an invite"; drop :317 | | |
| :343-382 requests | "{name} wants to connect" / "Check that {name} sees this same code, in person, on a call or in a message you trust:" / "Getting the check code ready. This needs their OpenDash to be running." / "Waiting for their OpenDash to answer. If they're offline it answers when they're back." | P6 tone fine; P2 | "Check {name} sees the same code:" / "Getting the check code… {name}'s OpenDash needs to be on." / "Sent. It arrives when {name} is next online." | | |
| :349, :363, :381 | "The codes are different · Stopped. Nothing was shared. You can try adding each other again." | fine | keep | | |
| :397 empty | "No friends here yet · Send someone an invite link, or add them with their friend code if they use your relay. / Connect a relay first, or paste a friend's invite to join theirs." | fine | keep | | |
| :501-502 key renewals | "Two different key renewals came for {name}, so your friendship is paused. Check with {name} and ask for a fresh invite." / "{name} renewed their keys. You're still friends: nothing for you to do." | P5 keys | "Paused: two different updates claimed to be from {name}. Ask them for a fresh invite." / "{name} updated their security. You're still friends; nothing to do." | | |
| :530 | "Check for new messages now" / "Up to date" | fine | keep | | |
| :590 settings fold | summary "Friends settings and privacy" | fine | keep | | |
| :595-599 Your name for friends | input + "Saved. Friends see it next time you share." | P7 a third name | "Your name: {name}" **B** "Change on your Profile" | | 5.7 logic |
| :606-616 presence | checkbox "Show friends when I'm around" + select "Automatic (focusing, travelling, away) / Always "here now" / Focusing / Travelling / Away" + "Only a coarse word is shared (here now, focusing, travelling, away), never where you are or what you are doing. With this on, each friend's page still lets you choose whether that friend sees it." | P3 two controls for one thing, P7 (Privacy calls it "Share when I'm online") | **T** "Online status" one select: "Off" / "Automatic" / "Always "here now"" / "Focusing" / "Travelling" / "Away" **H** "A word like "focusing", never where you are." | | Off = `share: false`; the others set `share: true` + `state` |
| :621-623 direct | "Connect directly when we're both online" / "Faster on the same network. It tells your friends this computer's network address." | P5 network address | **T** "Connect directly on the same Wi-Fi" **H** "Shares this computer's local address with friends." | Advanced | |
| :627 relay row | "Home relay: {host} ({yours / a friend's})" / "No home relay yet" **B** "Relay settings" / "Connect Cloudflare" | P5 host, home relay | "Relay: yours" / "Relay: {friend}'s" / "Relay: not set up" **B** "Your relay" | | |
| :630 | "{n} messages waiting to go (they retry by themselves)." | P7 | "{n} messages waiting to send." (grey) | | |
| :633 Your friend keys | row with Renew | P5 | **T** "Lost a computer?" **B** "Lock it out…" | Advanced | |
| :643 Blocked | list + Unblock | fine | | More | |
| :649 privacy note | "Everything between friends is end-to-end encrypted: your relay only sees scrambled messages and random mailbox ids. Friends only get what you share with them (your name, game progress, cheers): never your tasks, mail, calendar, money, Claude or accounts." | P9 false since 2.17 (friends can be given tasks, calendar, money, places), P5 mailbox ids | "Encrypted end to end. Friends see your card and game progress, plus anything you share in Settings > Privacy." **B** "What friends can see" | | |
| :675 | "This friend is not here any more · They may have been removed on one of your devices." | P7 | "...on one of your computers." | | |
| :806-807 remove / block | "Blocked {name}. Your copy of what they shared is deleted, and their app is asked to delete yours (that can't be forced on their device)." | fine | keep | | |
| :850 | "This needs a relay · Connect your own (free on Cloudflare), or paste a friend's invite to join theirs." | P7 | "You need a relay first · Set up yours (free), or paste a friend's invite." | | |
| :858 invite | "Send this link to one person (by message or email), or let them scan its QR code. It works once, and before you are connected you both check a short code." | fine | "Send it to one person. It works once; you both check a code before you're connected." | | |
| :868-871 invite options | "Let them use my relay for friends (if they have none)" / "Also sync their own devices through my relay" | P7 | "Let them use my relay" / "…and sync their computers through it" (the second in a fold) | More | |
| :944-946 long link | "Your relay is from an older OpenDash, so this link is long and has no QR code. It works the same. For short links, update your relay: Settings > Your relay > Connect Cloudflare (it keeps the same address)." | P2, P7 | "A long link (your relay is older). It works the same. Update my relay for short links." **B** "Update my relay" | | |
| :951 | "Single use. Expires {when}. You approve them after comparing a code, so a forwarded link alone is not enough." | fine | "Works once. Expires {when}." | | |
| :961-966 friend code | "Your old code stops working at once" / "Friend codes work between people on the same relay ({host}). For anyone else, send an invite link." | P5 host | "...on the same relay. For anyone else, send an invite link." | | |
| :994, :1014 paste | "Got an invite link from a friend? Paste the whole thing here. If it comes with their relay, you'll join it too." / "Nothing is shared until they approve you, after you both see the same short code." | fine | keep | | |
| :1028-1035 renewals | "Check with {name}: their keys were renewed twice" + 2 sentences / "{name} renewed their keys: let them keep using your relay?" / "Left as it is. {name}'s old keys keep working on your relay until you remove them in Settings > Your relay." | P5 keys | **T** "Paused: check with {name}" **H** "Two different updates claimed to be from {name}. Ask them for a fresh invite in person or on a call." / **T** "Let {name} keep using your relay?" **H** "They updated their security; their access moves over." | | |
| :1052-1136 renew keys dialog | intro + 7 bullets (:1121-1131) incl. "What it can't do: if someone who has your old keys renews them first, friends who hear from them first could be fooled…" | P2, P5 | **T** "Lock out a lost computer" **H** "Makes new friend keys so the lost computer can't act as you. Your friends move over by themselves." **B** "Lock it out" ; the bullets → "What happens" fold | More | |
| :1158 | "Was it lost or stolen? It still holds your friend keys. Renew them to lock it out." **B** "Lock it out" | fine | "Lost or stolen? Lock it out of Friends too." | | |
| :1181 settings group | **D** "Your friend keys: renew them if a device was lost or stolen. Everything else lives in the Friends tab." | P5 | **D** "Lock out a lost or stolen computer. Everything else is in Friends." | | |
| :1187-1188 | **T** "Your friend keys" **H** "They prove to your friends and your relay that it is really you." / **T** "Friends" **H** "{n} friends" / "Your hangout, invites and privacy." | P5 | **T** "Lost a computer?" **H** "Lock it out so it can't act as you." **B** "Lock it out…" / keep | | |
| 96-friends-onboard.js:180-183 | "You're all set / Welcome to Friends" / "Your character is ready, your relay is connected, and your first invite is out…" / "Three small steps to your first friend. Everything between friends is end-to-end encrypted, and you choose what each friend can see." | fine | keep | | |
| :215-229 step 2 | "Your own relay on Cloudflare ({host}). / You use a friend's relay ({host})." / "Friends' messages travel, sealed, through a small private relay. Use your own (free on Cloudflare), or join a friend's with their invite." / "Connecting to Cloudflare…" / "free, about 2 minutes" / "This version of OpenDash doesn't include relay support yet: it arrives with the relay update." | P5, P9 | "Your own relay." / "A friend's relay." / "Set up your relay (free, about 2 minutes) or join a friend's." / "Setting up your relay…"; drop :229 | | |
| :278-283 help | six short paragraphs | fine (help drawer) | keep; "sealed, encrypted messages it cannot read" → "encrypted messages it can't read" | | |
| 96-friends-0core.js:88-124 toasts | "You and {name} are now friends" / "Your friend keys were renewed on another device. This one uses the new keys now." | P5 | keep / "You renewed your friend security on another computer. This one is up to date." | | |

### 5.10 Together and fun (99-*.js, B5)

| Where | Now | Problems | Proposed |
|---|---|---|---|
| 99-together-1space.js:34-36 intro | "Do things together with friends" / "Shared lists and boards, tasks you hand to each other, trips, split costs, quests and challenges. First add a friend in Friends: everything between you is end-to-end encrypted, and nothing a friend sends ever changes your own tasks without your click." / "Friends is not on this computer yet: update OpenDash (Settings > Updates)." | P2 | "Shared lists, boards, trips and costs with friends. Add a friend first." **B** "Open Friends" |
| :26 refresh | tooltip "Check with friends now", toast "Asked {n} times: anything missing arrives in a moment" / "Nothing to check yet" | P2 | tooltip "Check for news from friends"; toast "Checking. Anything new arrives in a moment." |
| :52 empty | "No shared spaces yet. Make one: a shopping list with your housemates, a board for a project, a party with quests, a trip." | fine | keep |
| :180-189 settings menu | "Show friends · Friends' shared tasks in my lists and timeline (faint, never mixed with yours) · Friends' busy times in my calendar (only what they share with you) · Game · Weekly leaderboard among friends · Cheers and high-fives · Tell friends in my spaces when I'm focusing" | fine | keep |
| :263-278 leave / forget | "Leaving {space}: you stop getting its changes and the others see that you left. Your copy stays here until you forget it." | fine | keep |
| :700 new space | "They get an invitation to Join. Everything in the space is end-to-end encrypted between you, and nothing in it changes anyone's own tasks." | P2 | "They get an invitation. Nothing here changes anyone's own tasks." |
| :785-790 hand a task over | "Ask them to do it (it waits in your Waiting list until they finish)" / "Only the title, due date and priority are shared (and the description if you tick it). They see it as "From you" and choose Accept or Decline." | P2 | "Ask them to do it" / "They get the title, due date and priority, and choose Accept or Decline." |
| 99-together-0core.js:363-364 | "OpenDash's server isn't answering, so {x} can't load. It shows here again when the server is back." / "{x} could not load ({why}). It tries again by itself in a minute." | P7 | "OpenDash isn't answering. {x} shows again when it is." / keep |
| :476 | "Not sent: sharing is stopped. Choose Share again in Settings > Privacy, then send it again." | P2 | "Not sent: you stopped sharing." **B** "Share again" |
| 99-together-2layers.js:519-544 find a time | "Pick who to meet: their busy times (when they share them) and yours are both checked." / "{a} {b} share busy times with you, so only your calendar counts for them. Propose a few times and let them pick." / "{name}'s busy times are from {date} (their app has not sent newer ones), so they may have changed." | P2, grammar | "{name} doesn't share busy times, so only yours are checked." / "{name}'s busy times are from {date} and may have changed." |
| :597-598 | "They go on Plan together for everyone to say if they can make it. When everyone can make one, it goes in each person's calendar." / "You share no space with everyone picked: this makes one and invites them. They see the times once they join." | fine | keep |
| 99-together-3game.js:294-315 | "The focus timer is part of the game (Settings > Game)." / "Invited {name} to focus for {n} min. They are not online now, so they see it when they are." | fine (calm) | keep |
| :395, :430 | "It changed since you joined, so your number stopped going in." | unclear | "The challenge changed after you joined, so your score stopped counting." |
| 99-together-4life.js:85, :120 | "Only what people type here counts. Nothing is ever read from anyone's Finances." / "The currency is a three-letter code, such as GBP or EUR." | fine | keep |
| 99-together-5plan.js:295-333 | calendar write errors | fine | keep |
| 99f-fun-2ui.js:63 | "Fun with {name} starts in a moment: their OpenDash and yours are still saying hello." | P5-ish vague | "Connecting to {name}…" |
| :252 | "{name} isn't around right now: your gift arrives when they're back." | good (P6) | keep |
| 99s-friends-scenes-1visit.js:535-549 | "Friends walk by only while scenes move. Reduced motion or animations off keep them still." / "None of your friends are around right now. They walk by when they're online and share their profile." | fine | keep |
| 99s-friends-scenes-2postcards.js:382 | "Only the scene's name, the time, season and weather, your message and your outfit's ids are sent. Their OpenDash draws the scene itself, with you on the stamp." | P5 ids | "Only the scene's name, the weather, your message and your outfit are sent; their OpenDash draws it." |
| :429-431 | "Not sent: {name} can't get postcards from you right now. Check what they can see on their page." / "{name} {is} offline. Your postcard waits and goes when they're back." | fine | keep |

### 5.11 Home widgets (12-home-w-*.js, 12-home.js, B6)

Most widget copy is already short. The rows below are the ones that break a
principle; every other widget string stays. The catalogue descriptions (Add
widget) are listed only where they change.

| Where | Now | Problems | Proposed |
|---|---|---|---|
| 12-home.js:546 | "{widget} could not load · The rest of Home is fine. Reload the page; if it keeps happening, check the console." | P5 console | "{widget} couldn't load · The rest of Home is fine. Reload the page." |
| 12-home-edit.js:97 | "Customising Home. Drag a widget to move it and drag its edges to resize it. With a widget focused, the arrow keys move it, Shift with the arrow keys resizes it, Delete hides it. Press Escape when you are done." (screen-reader announcement) | fine for a11y | keep |
| 12-home-edit.js:167 | "Customising Home · Drag to move · drag an edge to resize · − hides · arrows move, Shift +arrows resize" | fine | keep |
| 12-home-w-finance.js:349, 12-home-w-spendable.js:106 | "Finance from {name}. To see it here, turn on "Use changes from my other computers" in Settings > Sync." | P7 sends people to the old trial switch; P2 | when preview mode is on: "{name} reads your bank. Preview changes first is on in Sync, so it isn't used here yet." **B** "Use it" (sets `apply: true` with Undo); otherwise this state cannot happen and the text goes |
| 12-home-w-finance.js:350, 12-home-w-spendable.js:106 | "Finance from {name} · waiting for its first update. What you spend shows here once {name} has updated." | fine (P6) | "Your bank is read on {name}. It shows here after its next update." (and, when presence says asleep: "...when {name} wakes.") |
| 12-home-w-finance.js:341, 12-home-w-spendable.js:96-97 | "Couldn't read Finances · The OpenDash server didn't answer. Your data is safe." / "The OpenDash server isn't running. Your data is safe." | P7 | "Couldn't read Finances · OpenDash isn't answering. Your data is safe." |
| 12-home-w-spendable.js:328 | "Couldn't check the sync: the OpenDash server didn't answer." | P7 | "OpenDash isn't answering." |
| 12-home-w-spendable.js:152 | "No balance yet: sync or import to see safe to spend" | P7 "sync" (a bank update, not Sync) | "No balance yet: update your bank or import a statement." |
| 12-home-w-spendable.js:353-355 settings | "Kept aside, not counted as safe to spend. Empty = {x}, as on Finances." / "Auto: payday when a salary shows in your transactions, else the end of the month." | fine | keep |
| 12-home-w-activity.js:41 description | "What assistants and scripts changed, with Undo" | P5 scripts | "What Claude and your AI apps changed, with Undo" |
| 12-home-w-activity.js:165, :196 empty | "When an assistant, an MCP client, auto-link or a script changes something, it shows here with Undo." | P5 MCP client, script | "Changes made by Claude, your AI apps or auto-link show here, with Undo." |
| 12-home-w-waiting.js:56 | "Nothing to chase · Tag a task waiting (or blocked-name) and it waits here, oldest first, until they reply." | P5 syntax | "Nothing to chase · Mark a task as waiting on someone and it shows here until they reply." |
| 12-home-w-schedule.js:148 | "The calendar is switched off · Turn it on in Settings to see today's events here. Tasks with a time still show." | P7 vague place | "...Turn it on in Connections to see today's events. Timed tasks still show." **B** "Connections" |
| 12-home-w-schedule.js:150 | "Your day, hour by hour · Connect a calendar (read-only) to see events with their scenes, a now line and your free gaps." | fine | keep |
| 12-home-w-runway.js:277 | "Plans it for today (connect Google Calendar to book time for it)" | P7 (any writable calendar) | "Plans it for today (connect a calendar you can write to, to book time)" |
| 12-home-w-runway.js:557 | "A task search: #tag, @person, stream:name, words. Press Enter to use it." | fine (a search box hint) | keep |
| 12-home-w-focus.js:97 | "Click to open · {n} done · [ ] date · Alt ↑ ↓ order · drag onto a day to reschedule" (visible hint row) | P2 | tooltip only; visible: "{n} done" |
| 12-home-w-focus.js:396 | "Tasks you pin, start, mark high priority or give a date in the next few days land here, a handful at a time. Click one to see its subtasks without leaving Home." | P2 | "Pinned, started, urgent and soon-due tasks land here." |
| 12-home-w-capture.js:569 | "{x}. {y}. Keys: Enter open, 1 to {n} pick a stream, S more streams, X looks fine" | P2 (visible) | tooltip / aria only |
| 12-home-w-capture.js:689, :698 settings | "New tasks go to · When you do not type a #stream" / "Show To sort · Recent tasks with no date, plan, tags or stream" | fine | keep |
| 12-home-w-catchup.js:552 | "Untick what should stay where it is. Overdue tasks get the new due date (the move and its reason are kept in their history); missed plans get the new day." | P2 | "Untick what should stay. The rest moves to the new day." |
| 12-home-w-catchup.js:68 | "In progress with nothing done for 10 days also counts as keeps moving." | fine | keep (settings hint) |
| 12-home-w-inbox.js:51 | "Replies are saved as Gmail drafts. Nothing is ever sent from here." | fine | keep |
| 12-home-w-inbox.js:118 | "Needs reply shows the threads waiting on you. It reads subjects and senders, never whole emails, and never sends anything." | fine | keep |
| 12-home-w-inbox.js:505 | "Claude is reading your recent email. Click to stop: nothing is added." / "Claude reads recent subjects and previews; nothing is added until you choose" | fine | keep |
| 12-home-w-launchpad.js:290, :294 | "The browser keeps a dropped file's path private: paste the path, or use + then Browse" / "That is not a path or a link: for text, use + then Code snippet" | fine | keep |
| 12-home-w-nextup.js:226 | "Couldn't read the calendar · Meeting prep will be back once the calendar loads. The rest of Home is fine." | fine (P6) | keep |
| 12-home-w-calcheck.js:356 | "Invitations and clashes show here again once the calendar loads." | fine | keep |
| 12-home-w-dayplan.js:222-224 | "Couldn't read the calendar: free time counts your working hours only." / "Free time counts your working hours and timed tasks." / "Not one of your working days: planned with your usual hours ({a}–{b})." | fine | keep |
| 12-home-w-dayplan.js:837 | "Google Calendar events with no guests; one Undo removes them" | P7 (any writable calendar) | "Calendar events with no guests; one Undo removes them" |
| 12-home-w-habits.js:472-475 settings | "Auto: tasks tagged with the habit tag, else daily and weekly repeating tasks" / "A habit is a repeating task: ticking it here completes it and rolls it to its next date." | fine | keep |
| 12-home-w-countdowns.js:22 description | "The dates you are counting down to, as big numbers. Edit them in the top bar" | fine | keep |
| 12-home-w-reportcard.js:18 | "Well above your usual pace. Remember to rest too." | fine | keep |
| 12-home-w-garden.js:14 emptyHint | "Hidden while the Fun level is Off" | fine | keep |
| 12-home-w-travel.js:23 | "Appears with travel features on, when a trip is within two weeks" | fine | keep |
| 12-home-w-wrapup.js:370 | "The calendar was last updated a while ago: update it now" | fine | keep |

### 5.12 Finances (src/finance/*.js, B6)

| Where | Now | Problems | Proposed |
|---|---|---|---|
| 10-shell.js:27 | "{x}. The Finances view needs the OpenDash server: start it with start-opendash." | P7, P5 | "OpenDash isn't running. Start it, then come back." |
| 10-shell.js:29 | "OpenDash has no finance folder configured. It normally lives in the data folder; check the finance folder setting, then restart OpenDash." | P5 | "Finances isn't set up on this computer." **B** "Connections > Money" |
| 10-shell.js:64 | "{name} reads your bank. Your finances show here, the same as there, after its next update{…}" | fine | "Your bank is read on {name}. It shows here after its next update." |
| 10-shell.js:70 | "{name} reads your bank. To see its finances here, turn on "Use changes from my other computers" in Settings > Sync." | P7 old trial switch | as 5.11 (preview mode only, with **B** "Use it") |
| 10-shell.js:67, :104 | "Syncing needs the bank connection. Importing a CSV export works without it." | P7 "syncing" | "Updating needs the bank connection. A CSV import works without it." |
| 10-shell.js:75-80 empty | "Download a CSV of your transactions from your bank's website (any date range; overlaps are fine)." / "Drop it here or press Import a CSV. Duplicates are skipped and every transaction is categorised." / "Spending, categories, merchants, recurring payments and budgets, all on this computer." / "Import a CSV export from your bank, or connect your bank to sync it automatically (read-only). Your data stays in your data folder." | P2 | "Import a CSV from your bank, or connect your bank (read-only)." + the steps in a fold |
| 10-shell.js:114, :117 tooltips | "Re-reads the whole history your bank holds, so bank categories and balances refresh too" / "Import any CSVs in the finance inbox folder and rebuild the analysis (no bank)" | P5 inbox folder, rebuild the analysis | "Reads your whole bank history again" / "Imports new CSV files from the Finances folder" |
| 04-data.js:72, :87, :145 | "Could not reach the OpenDash server. Is it still running?" / "Lost touch with the OpenDash server during the sync. It picks up again when the server is back." | P7 | "OpenDash isn't answering. Is it running?" / "Lost touch with OpenDash during the update. It carries on when it's back." |
| 18-sections.js:97 | "Everything here is built on this computer from your own data folder. Categories are fixed per merchant: change one in Transactions and the rule is saved for future imports." | fine | keep |
| 31-spending.js:101 | "Average per calendar day · your bank dates card payments by posting day, so weekend spending shows up on weekdays" | P2 (visible) | "Average per day" (the rest → tooltip) |
| 36-budgets.js:400 | "· saved in this browser only (server has no budgets route yet)" | P5 route | "· saved in this browser only" |
| 36-budgets.js:462 | "Saved in this browser (restart the OpenDash server to store budgets in the finance folder)" | P5 | "Saved in this browser. Restart OpenDash to keep budgets with your data." |
| 40-recategorise.js:38 | "Applies to all {n} transactions from this merchant, and to future imports (saved as a rule in rules.json)." | P5 rules.json | "Applies to all {n} transactions from this merchant, and to future imports." |
| 40-recategorise.js:131 | "This OpenDash server can't change categories yet — restart it to pick up the new version." | P7 | "Restart OpenDash to change categories." |
| 38-countries.js:220, 39-board-widgets.js:442 | "...Travel (Settings > Travel) adds the ones on your calendar." | P7 wrong name | "...Settings > Travel & time adds the ones on your calendar." |
| 38-countries.js:88 | "A payment with no other sign of where (a card that shows only pounds, say) counts in the country of the trip you were on that day" | fine (tooltip) | keep |
| 39-board-widgets.js:39, :306, :334 | "Safe to spend needs your balances. Sync bank, or connect a bank that shares its balances." / "No balances yet. They arrive with a bank sync (Sync bank) from banks that share them." / "Your balance history builds up with each bank sync: come back after a few." | P7 "sync" | "...Update your bank, or connect one that shares balances." / "No balances yet. They arrive with a bank update." / "Builds up with each bank update." (the button stays "Sync bank" → rename **B** "Update bank") |
| 39-board.js:179, :292 | "This is the Simple start. Pick another, or change any widget: drag, resize, add, remove. It follows you to your other devices." / "This widget hit a problem and could not draw. Reload the page; if it stays, remove it and add it again." | P7 devices | "...It follows you to your other computers." / keep |
| 39-board-edit.js:324, :334 | "The preview could not draw; the widget itself may still work." / "Shows how things stand now (it does not follow the dates)." | fine | keep |
| 26-money-ui.js:129, :342, :370 | "Ask Claude to word these three sentences (only totals and the next bills are sent; every number is checked)" / "Worded by Claude from your totals; every number was checked against them" / "No balance from your bank yet, so safe to spend can't be worked out. A bank sync adds it (a CSV import brings transactions only)." | P7 "bank sync" | "...A bank update adds it (a CSV brings transactions only)." |
| 28-money-story.js:61, :91 | "No money data yet. Import a bank CSV or connect your bank in Finances." / "Claude's wording did not match the numbers, so the story keeps its own." | fine | keep |
| 35-recurring.js:147, :160 | "No recurring payments found yet. They appear after two or three regular charges from the same merchant." | fine | keep |

### 5.13 Locations, Memories, Game (B6)

| Where | Now | Problems | Proposed |
|---|---|---|---|
| 90-locations.js:33 LOC_NOTICE (also the Settings group description, :397) | "OpenDash keeps a history of where you've been so it can show you fun facts. It stays in your dashboard and on your own devices, and never goes anywhere else." | P9 false since 2.17 (friends can be given places) | "OpenDash keeps a private history of where you've been, for fun facts. It stays on your computers unless you share places with a friend." |
| :382-384 first-time notice | "Your places, kept for you" + "…You'll find it under Locations: countries and cities, firsts, time zones crossed, where you got the most done, and badges. Turn it off or delete it any time in Settings > Location history." | fine | keep |
| :400 | "Keep my location history · On by default. When off, nothing new is added (what is there stays until you delete it)." | fine | **H** "When off, nothing new is added." |
| :407 What is kept | "Synced end-to-end encrypted between your own devices (Settings > Sync)." / "Kept in this dashboard's data folder. With encrypted sync on, your own devices share it too." | P7 devices | "Kept in your data folder and on your other computers (encrypted)." |
| :414, :419 | "Download everything, any time." / "Only when you ask: removes it here and on your synced devices." | fine | "...here and on your other computers." |
| :285 delete confirm | "Every place, time-zone move and trip in your location history is removed from this dashboard and, through sync, from your other devices. Your tasks and trips themselves are not touched. This cannot be undone." | fine (destructive) | "...from your other computers too…" |
| 90-locations-view.js:188, :195 | "Location history is off · Turn it on to collect countries, cities, firsts and badges here." / "Your places will collect here · Pick your location (or let your device share it) and your trips and time zones fill this in as you go." | fine | keep |
| 93-memories-page.js:45 | "What your days add up to: kept on this computer, synced to yours" | P2 | "What your days add up to, kept on your computers." |
| 93-memories-page.js:71 | "This part of Memories could not load · Your memories are safe. Reload the page; if it keeps happening, check the console." | P5 console | "...Your memories are safe. Reload the page." |
| 93-memories-page.js:132 | "Each evening OpenDash writes a few lines about your day from what you did, where and with whom. Add your own line and how the day felt. It is all kept, forever." | fine | keep |
| 93-memories-ui.js:178 | "No postcards yet · Your first visit to a new country makes one… Trips come from your calendar and time zone (Settings > Travel)." | P7 wrong name | "...(Settings > Travel & time)." |
| 93-memories-ui.js:214 | "It stays sealed until the day you choose, then arrives on Home like a letter. It syncs to your other computers, sealed." | fine | keep |
| 93-memories-wrapped.js | Wrapped copy | fine | keep |
| 92-game-3ui.js:401 group | **D** "XP and levels, streaks, weekly quests, achievements, the focus timer and how much of it you see." | P2 | **D** "Levels, streaks, quests and the focus timer." |
| :404 Fun level | **H** "Off: no chip, moments or sounds (the focus timer stays). Subtle: a small chip and quiet toasts. Full: floating XP, combos, confetti moments." | P2 | **H** "How much of the game you see." (the three meanings as tooltips on the options) |
| :405 Sounds | **H** "A short chime for level ups, boss tasks, quests and milestones. Off unless you switch it on." | fine | **H** "A short chime for level ups and milestones." |
| :408 Accent colour | "More open up as you level up ({n} in all)." | fine | keep |
| :167, :173 page | "Levels, streaks, quests and achievements, worked out on this device from what you do. Nothing is ever taken away." / "The game is off: no chip, no moments, no sounds. The numbers below keep counting quietly." | P7 device | "...worked out from what you do. Nothing is ever taken away." |
| :217, :306 | streak freeze and boss explanations | fine (game rules, shown where they apply) | keep |
| :284 | "Time a task with the focus timer (the task card, or Ctrl+K "focus") and it learns how long things really take." | fine | keep |
| 92-game-2focus.js:85-86 | "Logged {t} on "{task}"…" / "Focus timer stopped. Under a minute, so nothing was logged." | fine | keep |

## 6. Settings search: what moves

Settings search reads `SETTINGS_SEARCH_CATALOG` (58-settings-search.js:5-176,
Batch 1's file) plus each group's own `search:` (as Your relay already does,
58-settings-relay.js:487-492). So that no two batches edit the same file:

- **Batch 1** deletes the `sync`, `data`, `diagnostics`, `server` and `updates`
  keys from the catalog, and updates its own groups' entries:
  - `profile`: drop "Name" (it moves to Profile) and "Icon" (to Appearance).
  - `appearance`: add "App icon"; "Default theme for new devices" → "Theme for a new browser".
  - `ai`: add "Models for each job", "Money brief", "Morning summary", "Story script", "Checking links".
  - `brief`: drop "Model for summaries" and "Model for the story script" (now in AI); keep the rest (they move into More / Voice folds, search opens folds).
  - `autolink`: "Names only" → "Never read" (keywords keep "names only").
  - `time`: "Let Claude see trips" description → "Share your city and trip dates with Claude and your AI apps."
  - `suggestions` and `profile` "Working hours": keep (the link rows carry the label).
  - every renamed entry keeps the old words in its keywords.
- **Batch 2** adds `search:` to the Sync registration (58-settings-sync.js:903):
  "Add a computer", "Computers and phones" (keywords: devices remove rename lost stolen phone), "Main computer" (main primary fetch fetcher Claude host), "Add a phone" (qr scan), "Approve with a check code" (pair 6 numbers), "Recovery code", "Sync now", "Turn off sync on this computer", "Ways to sync" (relay folder onedrive google drive dropbox transport), "Direct on the same Wi-Fi" (live lan instant realtime peer), "Let my computers reach this one from outside home" (router upnp nat port internet; target "Ways to sync", description "Only shown when your relay isn't in use."), "Preview changes first" (trial shadow apply), "Which computer does what" (Claude host fetcher accounts phone), "Details for support" (connection reasons firewall router), "Is this your first computer with OpenDash?" (join setup start), "Check-up" (health problems fix). Relay entries per 5.3.
- **Batch 3** adds `search:` to Data ("Data folder", "Backups", "Daily encrypted copy", "Export and import", "Share the app", "Reset app data", "Move my data out of OneDrive" stays as today), Diagnostics, Server ("OpenDash on this computer", "Start automatically when I log in", "Start button on the "not running" banner" with keywords "enable start server button", "Offline page") and Updates ("OpenDash version", "Check once a day", "This copy").
- **Batch 5** adds "Your name" and "Show friends a different name" to Profile's registration (97-profile-2ui.js:33), and "Lost a computer?" / "Lock out a lost computer" (keywords: renew keys) to Friends (96-friends-1ui.js:1179).
- The command palette keeps every existing command; only labels that use a renamed term change (e.g. "Disconnect relay" → "Stop using this relay", keywords keep "disconnect").

## 7. Logic changes, in one list

| # | Change | Batch | Files |
|---|---|---|---|
| L1 | Relay socket presence (`online`, `seen` from the relay group's `info`) feeds presence: asleep vs online is right even with no direct link | B2 | lib/sync/relay.mjs, lib/sync-presence.mjs, lib/sync/presence.mjs |
| L2 | Presence `path` = direct / relay / folder; "Catching up {pct}%" from transfer or behind counts | B2 | lib/sync-presence.mjs, 56-presence.js, 58-settings-sync.js |
| L3 | Peer reasons (cgnat, router, unreachable, no-address, lan-blocked) never on the face; asleep/off peers show no reason | B2 | 58-settings-sync.js, lib/sync/health.mjs |
| L4 | Router switch: `internet: 'auto'` = off while the relay is in use; explicit choice remembered (`internetSet`); old saved `true` = auto; row hidden while the relay is in use unless explicitly on | B2 | lib/sync/live/live.mjs (:58, :97, :427, :676), lib/sync/engine.mjs (expose `relayInUse`), 58-settings-sync.js |
| L5 | Check-up drops router / CGNAT / double-NAT items while the relay is in use; firewall items are info unless nothing else can carry changes | B2 | lib/sync/health.mjs |
| L6 | One "Main computer" choice sets main-computer jobs, live leases (`prefer`) and the Claude host together; exceptions in Advanced; role labels renamed | B2 | 58-settings-sync.js, 58-settings-main.js, 58-settings-claude-host.js, lib/sync/live/live.mjs:576 |
| L7 | `needsUser` on Check-up items; the status line, tab count and top bar amber use it | B2 | lib/sync/health.mjs, lib/sync/presence.mjs summarize, lib/sync-presence.mjs, 58-settings-sync-health.js, 56-presence.js |
| L8 | Relay page names devices by their sync name | B2 | 58-settings-relay.js |
| L9 | Remote waits use presence calm lines before any error | B2 | 56-remote-jobs.js |
| L10 | Settings nav section headings (`SETTINGS_SECTIONS` map) and renamed groups ("Region & language", "Brief and stories") | B1 | 57-settings.js, 78-brief-hooks.js (title only) |
| L11 | One name: Profile's "Your name" writes `config.userName` and the profile display name; the friends name follows unless "a different name" is set; the Name row leaves Region & language | B1 (remove row) + B5 (add row, friends name) | 57-settings.js; 97-profile-2ui.js, 97-profile-1core.js, 96-friends-1ui.js |
| L12 | Working hours: one control (Settings > Home); link rows elsewhere (`planSettingsWorkHoursLink()`) | B1 | 20-task-plan.js, 57-settings.js, 68-suggest-ui.js, 58-settings-home.js |
| L13 | Model pickers gathered in AI > More "Models for each job" | B1 | 57-settings.js, 78-brief-hooks.js, 79-story-engine.js, 66-autolink.js |
| L14 | The time-zone note is grey, never amber (travel is normal) | B1 | 57-settings.js:175 |
| L15 | Online status: one select in Friends; Privacy's "Turn it on" flips it | B5 | 96-friends-1ui.js, 98-perms-2ui.js, 98-perms-1core.js |
| L16 | Connections: status line from `_connPageCounts`; hero, tiles and privacy slogan removed; filters only above 6 connections | B4 | 56-connections.js |
| L17 | Money widgets and Finances: the "use changes" state only in preview mode, with a "Use it" button (`POST /api/sync/settings {apply: true}`, Undo) | B6 | 12-home-w-finance.js, 12-home-w-spendable.js, src/finance/10-shell.js |
| L18 | Backups status line from the newest backup's time | B3 | 58-settings-data.js |
| L19 | Relay allowance line on the face only above 80% | B2 | 58-settings-relay.js |
| L20 | Claude host "off" tone idle, never warn | B2 | 58-settings-claude-host.js:22-24 |
| L21 | The verb for fetching a connection's or bank's new data is **Update** ("Update now", "Update bank"); **Sync** only means between your computers | B4 (Connections, sources), B6 (Finances buttons and copy) | 56-sources.js, 56-connections-cards.js, src/finance/10-shell.js, src/finance/39-board-widgets.js, 26-money-ui.js |
| L22 | "Shared relay" for Claude-in-browser is called "OpenDash's link service" in copy, so "relay" only means the user's relay | B4 | 56-hosted-relay.js |

## 8. Build batches

Six batches with non-overlapping files, for parallel builder agents. Each
batch: make the copy and logic changes in its section(s), keep every control
(P9), `node build.mjs --syntax` and `node build.mjs`, one render on its own
port with test data, then commit. The kit (section 3) is built already, so
no batch creates kit files. Merge order: B1 first (search catalog), then the
others in any order.

**B1. Settings shell and general pages** (sections 3, 5.1, 6; L10-L14)
- the kit is built already (section 3: 11-ui-kit.js, 01-components.css); B1 uses it
- `src/app/57-settings.js`, `58-settings-search.js`, `58-settings-home.js`, `58-settings-streams.js`, `58-settings-advanced.js`, `58-notify.js`, `59-onboarding.js`
- settings parts only: `61-task-card.js` (:1385-1410), `20-task-plan.js` (`planSettingsWorkHoursRow`, new `planSettingsWorkHoursLink`), `66-autolink.js` (:600-740), `68-suggest-ui.js` (:555-610), `69-travel-ui-settings.js`, `87-clock-ui.js` (:340-370), `78-brief-hooks.js` (:255-400), `79-story-engine.js` (:1187-1223), `79-story-voice.js` (settings rows), `79-story-weekly.js` (:567), `12-home-refresh.js` (:587)
- styles: `57-settings.css`, `59-onboarding.css`, `66-autolink.css`

**B2. Sync, relay and the main computer** (sections 4, 5.2, 5.3; L1-L9, L19, L20)
- `src/app/58-settings-sync.js`, `58-settings-sync-health.js`, `58-settings-sync-qr.js`, `58-settings-main.js`, `58-settings-claude-host.js`, `58-settings-relay.js`, `56-presence.js`, `56-presence-notice.js`, `56-remote-jobs.js`, `86-live-sync.js`
- `lib/sync/health.mjs`, `lib/sync/presence.mjs`, `lib/sync-presence.mjs`, `lib/sync/relay.mjs`, `lib/sync/live/live.mjs`, `lib/sync/engine.mjs` (status fields only), `server/routes/sync.mjs`, `server/routes/main-computer.mjs`, `server/routes/claude-host.mjs` (only if L6 needs a combined call)
- styles: `58-settings-sync.css`, `58-settings-relay.css`, `56-presence.css`, `80-sync-indicator.css`

**B3. Data, server, updates, banners; People, reviews, email** (sections 5.4, 5.5; L18)
- `src/app/58-settings-data.js`, `58-settings-move.js`, `58-settings-offsite.js`, `58-settings-server.js`, `58-settings-updates.js`, `86-hosts-banner.js`, `86-offline-banner.js`
- `src/app/51-people-section.js`, `54-people-card.js`, `34-review-flow.js`, `34-review-core.js`, `77-brief-review.js`, `55-email-google.js`, `55-email-actions.js`, `34-waiting.js`
- styles: `58-settings-move.css`, `58-settings-server.css`, `58-settings-updates.css`, `86-hosts-banner.css`, `86-offline-banner.css`, `51-people.css`, `54-people-card.css`

**B4. Connections and accounts** (section 5.6; L16, L21 for connections, L22)
- `src/app/56-connections.js`, `56-connections-cards.js`, `56-connections-brands.js`, `56-connections-gate.js`, `56-connections-assistants.js`, `56-assistant-cards.js`, `56-connection-flow.js`, `56-accounts.js`, `56-accounts-logic.js`, `56-accounts-google.js`, `56-accounts-imap.js`, `56-accounts-imap-logic.js`, `56-google-health.js`, `56-hosted-relay.js`, `56-remote-mcp.js`, `56-sources.js`, `56-fin-connect.js`, `56-fin-connect-wizards.js`, `56-fin-eb-banks.js`, `56-microsoft.js`
- styles: `56-connections.css`, `56-connections-page.css`, `56-connections-gate.css`, `56-accounts.css`, `56-accounts-google.css`, `56-accounts-imap.css`, `56-assistant-cards.css`, `56-fin-connect.css`, `56-google-health.css`, `56-sources.css`

**B5. Profile, privacy, friends, together** (sections 5.7-5.10; L11 profile side, L15)
- `src/app/96-friends-0core.js`, `96-friends-1ui.js`, `96-friends-onboard.js`, `97-profile-0kit.js`, `97-profile-1core.js`, `97-profile-2ui.js`, `97-profile-3corner.js`, `98-perms-0logic.js`, `98-perms-1core.js`, `98-perms-2ui.js`, `99-together-0core.js` … `99-together-5plan.js`, `99f-fun-0rules.js`, `99f-fun-1core.js`, `99f-fun-2ui.js`, `99s-friends-scenes-0core.js`, `99s-friends-scenes-1visit.js`, `99s-friends-scenes-2postcards.js`
- styles: `96-friends.css`, `96-friends-onboard.css`, `97-profile.css`, `98-perms.css`, `99-together.css`, `99f-fun.css`, `99s-friends-scenes.css`

**B6. Home and the big pages** (sections 5.11-5.13; L17, L21 for Finances)
- `src/app/12-home.js` (:546 only), `12-home-w-*.js` (only the files named in 5.11)
- `src/finance/*.js` (only the files named in 5.12)
- `src/app/90-locations.js`, `90-locations-view.js`, `93-memories-page.js`, `93-memories-ui.js`, `92-game-3ui.js`, `92-game-2focus.js`
- styles: `13-home-w-*.css` (as needed), `90-locations.css`, `93-memories.css`, `92-game.css`

Cross-batch contracts (so parallel work fits together)

- The kit API (section 3) is fixed; nobody changes its signatures.
- B1 removes the Name row (L11); B5 adds "Your name" to Profile. Until both
  merge, a build may briefly show the name in both or neither: merge B1 and
  B5 in the same release.
- B2 exposes `syncSummary(st, presence, health)` and `syncPathLine(st)` as
  globals (58-settings-sync.js). B5's corner menu (97-profile-3corner.js) uses
  `syncSummary` when it exists (`typeof syncSummary === 'function'`) and keeps
  today's words otherwise.
- B6's Money widgets call `POST /api/sync/settings {apply: true}` (an
  existing route); no new server work.
- Words: every batch uses section 2. If a batch needs a word that is not in
  the glossary, it uses the plainest one and lists it in its commit message.

## 9. Done means

- Every row of section 5 in the batch's files is done or, if a line moved,
  done at its new place.
- `node build.mjs --syntax` and `node build.mjs` pass. No test files.
- One render, on the builder's own port with test data, of each changed
  page. For Sync: the Off screen, the first-computer setup and, if the test
  data has sync on, the summary card with More and Advanced opened.
- No forbidden word on any face (P5). A quick look, then read the hits:
  `grep -rnE "UPnP|CGNAT|NAT forwarding|frontier|epoch|fetcher|wrangler|Durable Object|MCP client|config\.json|rules\.json|check the console|scrambled|sealed" src/app src/finance lib/sync/health.mjs`
  (comments and Advanced-only text may stay; status lines and warnings may not).
- Settings search finds every moved row and opens its fold.
- Nothing the user could do before is gone (P9): walk the old card's
  controls against the new one.
- Commit with the attribution line; no personal names anywhere.

