# Playing together, live, in each other's gardens

The owner's words: "If I allow it, we should see what each other does: 100% of all actions in each other's gardens, plant stuff, buy our own stuff; it says planted by me or Taylor or whoever; we need to think about how we share the gift or reward; we want it live and fully interactive, players interact with each other."

Code: `lib/relay/space-room.mjs` (the relay's pass-through room), `lib/friends/live-room.mjs` (a client's socket to it), `lib/friends/live.mjs` (the service: sessions, permissions, checks), `server/routes/garden-live.mjs`, `src/app/94-garden-live-*.js` (0rules: pure, also evaluated by Node; 1core; 2visit: a visitor's world; 3host: the host's authority, diary and Undo; 7contest: contests, section 15; 7goal: shared goals, section 17; 7pals: playdates, section 18; 7snap: the group photo, section 19; 7trade: trading, section 16), `src/styles/94-garden-live.css`, `src/styles/94-garden-live-trade.css`.

## 1. The shape of it

**The garden's owner's computer is the truth.** A visitor sends intents ("plant carrot at 4,5"). The host checks them with the same rules the owner's own clicks go through, applies them to the host's own garden, and tells everyone there what happened. Everyone animates that. No visitor ever writes the host's data. If the host is not in their garden, a visit is the saved copy, in the same world (section 10).

**A star, not a mesh.** Every message goes visitor to host or host to visitor, sealed for that pair of friends (the same envelopes as every friend message, `sealPair`). So two visitors need not be friends with each other, and neither learns the other's friend id: the host gives each person a small slot number (0 is the host), a first name and a look.

**Connected only while both are in a garden.** Nothing runs unless a host's page is on their own garden and a visitor's page is on that garden's visit. A page that stops saying so is dropped after 2.5 minutes; one going away says so and has 20 seconds to come back (a reload); one whose tab is hidden has 15 minutes, because a browser slows or freezes a hidden tab while its person is still there.

**One tab hosts.** Every open tab hears the same events, and two tabs each applying what a visitor asks would double crops and gifts. So the page says which tab it is (`tab` in `/here`), the server names one (`lead`), and only that one may speak for the garden (`/host`). Another tab of your garden says so and waits; if the host tab closes it takes over at its next beat (a closed tab says so at once; a silent one loses the place after 95 s), and nobody is sent away. Posts and parcels have ids that say what they are, so even two tabs at once could not double anything.

## 2. Permissions (host's choice, per friend, visible to both)

| Level | May do |
|---|---|
| none (the default for everyone) | the saved copy only; a knock shows up at the host's gate, and the host can let them in with one tap |
| Look | walk, emote, say preset phrases, wave and high five |
| Help | Look, plus water, weed, and pick what they planted themselves |
| Play | Help, plus plant, place decorations, fertilise with their own fertiliser, move, turn or take back what is theirs, gifts |

Also: **the gate** (open or closed, whatever the levels say; a new garden's gate is open but nobody has a level), **May touch my things** per friend (off: a visitor can never move, dig up, take or pick what is the host's), and **Harvest share** per friend (below). Group members never get more than Look unless the host chooses that friend's level by hand. Levels are data (`GL_LEVELS`, `GL_ACTS`).

Stored in `friends/garden-live.json` (synced, end-to-end only; not in the state file, not readable by the assistant). The computer hosting reads the file again for every intent and every knock, and every 3 seconds while anyone is here, so a level lowered or a gate closed on your phone takes effect at once on whichever computer is hosting, and the page is told. A friend with no level learns nothing from a knock: the same "ask them" whether you are in your garden or not, gate open or shut; and if you do not share your presence with them, no answer at all (they still show up at your gate if you are there). A friend you gave a level to may hear that you are away.

## 3. What each message is

All are friends kinds with a strict schema (`lib/friends/live.mjs`): ids, cells and numbers, plus names the host passes on (one line, capped, shown with `textContent`). `s` is the session (a random id per visit), `q` a counter per direction: anything not newer than the last is dropped, so a replayed message does nothing even after a restart. Live kinds are never stored, queued or retried.

| Kind | Way | Body |
|---|---|---|
| `gl:knock` | V to H | `{v, k?}`: the protocol version, and the key made for this visit that the room's ticket will name (needed for the relay road). The only live kind but `gl:hi`, `gl:no` and `gl:bye` that may use the friend's mailbox (a post; 200 a day at most per friend, `LIVE_KNOCK_DAY`, and the kind's own rate). These are awaited: `sendLive` returns `failed` and `why` (`rate`, `cap`, `route`, `seal`, `post`, `limit` when their relay answered 429), counted as `live-post-failed` (the log line names the relay's error and retry time), and a knock that did not leave shows the visitor "could not be sent" (`unsent`) instead of "no answer". Read from the mailbox instead of pushed, one still inside its `ttl` (+30 s) counts, and `liveLink.wake()` (a host at home, a visitor waiting) reopens a dropped live connection and reads the mailbox at once. A visitor knocks 3 times, 7 s apart, then once per later round, the rounds 90 s, 3, 6 and 12 min apart (10 min after a `limit`, which shows the visitor the `limit` note); Knock starts again |
| `gl:hi` / `gl:no` | H to V | `{v, s, lv, w, r?: {n, t, e}}`: you are in (level, slot, the room's nonce and ticket, good for 15 minutes) / `{v, why: closed\|ask\|away\|full\|old\|road\|budget}` |
| `gl:me` | V to H | `{s, q, a?, g?, pet?}`: how I look (allow-listed ids; drawn through the avatar kit on each side). `g`: what I carry, `{r, n, b, c}` rod, net, float and can ids (2.39) |
| `gl:who` | H to V | `{s, q, w, n, a?, pet?, lv, on, x?, y?}`: someone here or gone |
| `gl:go` | both | `{s, q, w?, x, y, r?}`: walking to a destination, never a stream of positions. The host's page answers every walk with the way round the beds (`r`: up to 12 turns), so nobody walks through a bed or a bench |
| `gl:em` | both | `{s, q, w?, e, c?, to?}`: an emote, a preset phrase or an interaction, ids from tables on each side |
| `gl:fx` | both | `{s, q, w?, c, e, i?, x?, y?, n?, ql?, nw?}`: what people SEE each other do (2.27.9; `GL_FX_KINDS`): `pet` a clip id or pat / eat, `wow` a spectacle, `nap` on / off, `roam` a species of the host's pack, `fish` cast (with the cell) / bite / reel / land / lost / in, `bug` sneak / swing / miss / gone (`i` the bug's key), `got` what was caught or found (`e` kind, `i` id, `n` cm, `ql`, `nw` bit 1 new, bit 2 record), `make` a recipe, `ct` a contest round (2.30, host to guests only: start / board / end / stop, with `tt` its length and `l` the board; section 15), `snap` ask for a group photo (2.32: `i` its id, `x` and `y` the cell its frame is centred on; section 19). A kind of its own, so an older app drops it and `GL_V` stays 2 |
| `gl:pp` | both | `{s, q, w?, l: [{u, e?, x, y, gx?, gy?, r?, f?}]}` (2.32; `GL_PP`, `glPpOk`): where pets really are, section 18. `u` 0 is the sender's own companion, 1 to 3 the host's pack (`e` its species, the host alone); tenths of a cell; `gx`, `gy` where it is walking to. A guest's goes to the host and on to the others. A kind of its own, so an older app drops it and `GL_V` stays 2 |
| `gl:cr` | H to V | `{s, q, l: [{u, e, x, y, h, f, k?}]}` (2.28.1): the creatures about in the host's garden, the whole list (at most 8) every 2 s while one moves and every 7 s when they rest, a kind of its own (an older app drops it). A guest takes each leg at the pace they come in. Tenths of a cell; `k` the clip |
| `gl:fs` | H to V | `{s, q, l: [{u, e, c, x, y, tx, ty, st, to?, n?}]}` (2.34): the fish in the host's water (section 20), the whole list (at most 20) when a fish changes state, at most every 0.4 s, and every 6 s anyway (20 s when there are none). A kind of its own: an older app drops it |
| `gl:sum` | H to V | `{s, q, h, n}` (2.34.1): a fingerprint of the plants and decorations the host has told everyone about, every 30 s (section 21) |
| `gl:tr` | both | `{s, q, w?, t, e, to?, v?, n?, an?, o?, p?, c?, d?, r?, why?}` (2.30; `GL_TRADE`, `glTradeOk`): a trade between two people there, section 16. `t` its id, `e` the step (guest to host: ask, hi, offer, ok, no, end, chk; host to guest: st, go, x). A kind of its own, so an older app drops it and `GL_V` stays 2 |
| `gl:goal` | H to V | `{s, q, g, c, n, of, st, p: [[slot, part]]}` (2.30): a shared goal (section 17), the whole state each time: `g` its id, `c` which goal (`GL_GOALS`), `n` how far, `of` how many, `st` 0 going / 1 done / 2 let go, `p` the part each person here has done. A kind of its own (an older app drops it) |
| `gl:do` | V to H | `{s, q, i, t, p?, x?, y?, r?, k?, item?, to?}`: an intent; `i` is the sender's id for it (exactly once; `[0-9a-z]{6,24}`, so it can never look like a credential when it syncs) |
| `gl:res` | H to V | `{s, q, i?, w, t, ok, why?, ...}`: what happened, to everyone (a refusal only to the sender) |
| `gl:d` | H to V | `{s, q, ops}`: the garden changed: rows added, changed, removed |
| `gl:snap` | H to V | `{s, q, n, of, d}`: the garden as it is now, in pieces of 3,600 characters |
| `gl:lv` `gl:bye` `gl:ping` | | the level changed; I left, you were sent home, that is your share of the relay today, or (`why: again`) I do not know that session, knock again; still here? |
| `gl:q` | V to H | `{i, t, p, x, y, r?, at}`: **not live**: done on the saved copy, to wait for the host (section 10). The same fields and id as `gl:do` |
| `gl:perm` `gl:ask` | H to V, V to H | **not live**: `{lv, q}` what you may do in my garden, told when it changes and at a knock, so you know when I am out; `{v}` may I do more? It shows at the gate |
| `gl:post` | H to V | `{id, why: crop\|back\|did\|trade, i?, d?: go\|x, items}`: **not live**: posted things (a crop, something handed back), queued like any friend message until it arrives, taken once by id. The id says what it is (`c<plant>-<pick>`, `b<intent>0`), so the same post made twice is one. Each friend has their own place for them: 120 waiting, 120 a day; nobody can push another friend's out |

The protocol is `GL_V`, 2 since a visit became the world. A `v` that is not the host's gets `gl:no {why: 'old'}`, older or newer, and that visitor keeps the saved copy: an older app gets its old look-only page, a newer one the world, with a plain note in the tag. An app older than all this does not know these kinds and drops them: the knock is never answered.

## 4. How messages travel

1. **A direct link** when one is open (same network or global IPv6): free of any relay.
2. **The relay's pass-through room** otherwise. Both are sealed end to end. The relay sees sizes and times, the host's key, and a key made for each visit. It can see that a host has visitors and how many, and their addresses as any server does, but not who they are: a visitor never shows it their identity key.

The room is a new space, `rt:<id>`, at `/v1/rt/<id>/ws` (WebSocket only). It **writes nothing to storage, ever**: its store refuses writes, alarms are switched off, and even the socket's own record says which space it is in (`sp` in the attachment), because a space normally recovers its name from a row. It forwards and forgets.

- `id = SHA-256("opendash-relay-room-v1\n" + hostKey + "\n" + nonce)`: a room belongs to one key. The host must be the relay's owner or a member with `message` scope who was let in by the owner, not only through a group, so a stranger or someone who just followed a group's link cannot use the relay as free transport (they can still visit, with a ticket, and host over a direct link).
- A visitor need not be a member of that relay (friends on different relays are normal). They show a **ticket**: the host's Ed25519 signature over `"opendash-relay-room-ticket-v1\n" + id + "\n" + visitorKey + "\n" + exp`, at most 6 hours (the app gives 15 minutes; it is used at once), where `visitorKey` is the key made for this visit. The relay checks it with nothing stored.
- **Strangers never reach a room.** The socket's upgrade is itself signed and carries the host, the nonce and the ticket, and the relay's front door checks them before any Durable Object is touched. So anyone without a ticket costs one Worker request, and a throwaway key cannot wake the registry.
- `{t: 'kick', g}` from the host closes that socket and bans the key for the room (in the host socket's attachment). The host's socket closing closes the room. A visit's end ends its ticket: whoever left, was sent home or was removed has their socket closed, whether they had a session or not, and only a new ticket from the host lets them back.
- Guests can only reach the host, and the host only guests. Whoever holds a socket is who the ticket was for, and the host opens only what they sealed. A room carries only the live garden kinds (`room: true`): anything else is dropped unopened, so it is no way round the mailbox's 100 a day. Floods are dropped on a per-socket count before anything is parsed; a socket that keeps flooding is closed. A message over 8 KiB from a guest (32 KiB from the host), in bytes, closes that sender and nobody else.
- The origin a visitor dials is the one already stored for that friend, never one from a message, and the socket's DNS lookup goes through the same public-address guard as every relay request (`guardedLookup`): a friend's relay can never point this computer at the local network.

**A dropped connection is not seen** (2.38.3; `startResume`, `roomAgain` in `lib/friends/live.mjs`). Nobody leaves and nobody's page changes.

- The sockets check themselves: nothing heard for 30 s, a ping; no answer in 9 s, the socket is dead (`lib/friends/live-room.mjs`). A tick 15 s late means this computer slept: nobody counts as gone for that, and the sockets are asked at once.
- A visitor whose socket goes stays `live` with `why: resume`. It dials the same room with the same ticket at 0.3, 1, 2, 4, 8 s and so on. The line in the garden says Reconnecting only after 1.5 s. Back, it sends the same `gl:me`, which means "tell me everything": who is here, the whole garden, the lines out, the seats, and it repeats what it asked for and never heard about, with the same ids.
- A host whose socket goes opens the same room again (same nonce, so every ticket still works; `REOPEN_GAPS`) and puts everyone sent home on the new socket's ban list before anything else. A room that was never left gets no new one: an hour's 12 openings are safe from a bad connection unless it drops more than that.
- A ticket that ran out, a banned key or a room that has gone gets a knock from the fourth try on. The host's level check runs as for any knock; the same visit (the same key) keeps its session and counters and gets new tickets. So a slow relay's repeated knock no longer restarts a visit, and a ticket is still good for 15 minutes.
- A direct link that goes down does the same, through the room. Someone talking in a session the host no longer has (it restarted) is told `gl:bye {why: again}`, at most every 15 s, only if they have a level.
- After 75 s it says the connection was lost, still with everyone on screen, and knocks once. Only an answer that it is over, or no answer, clears them.

**In order.** A page's messages go to its server one at a time (`_gllPipe`; a newer whole list replaces one still waiting), each person's are sealed one at a time (`inTurn`), and what comes through a room has its own lane in the engine (`roomLane`: only live kinds pass there, and nothing it does writes), so a mailbox read or a post to a slow relay does not make the garden stand still. Before this, a newer counter could overtake an older one, which then counted as a replay and was lost.

**When nobody is looking.** A guest whose tab has been hidden for 15 s says `fx sync away` to the host alone. While everyone is away with no line out, fish, creatures, pets, `gl:sum` and `fx sync at` are not sent; `fx sync back` sends them all at once.

`GET /v1/health` answers `rt: 1` on a relay that has rooms. **A relay needs a redeploy for this.** On an older one the host's app says so plainly ("Update your relay in Settings"), direct links still work, and everyone else gets the saved copy with a note.

### The Cloudflare budget

Workers Free, per day: 100,000 requests, 100,000 rows written, 13,000 GB-s of Durable Object time. Going over any of them makes that kind of operation fail until midnight UTC, including sync, so the garden must never get near. What a session costs:

- Rows written: **none in a room**. The knock is an ordinary mailbox post, and the registry writes one row for each 1,024 room messages, each 10 minutes a room is in memory, and each room opened or closed: a few hundred on the busiest day the budget below allows.
- Requests: one Worker and one Durable Object request per socket opened, one Durable Object request per report to the registry. **Incoming WebSocket messages count 20 to 1** and outgoing ones not at all, so a host's batch to eight people costs one twentieth of a request.
- Duration: the Hibernation API; an idle room is not billed, and pings are answered without waking it (the Worker's auto-response). Nothing here uses a timer or an alarm. 13,000 GB-s is about 28 hours of one room in memory (128 MB).

The budget is enforced by the relay, not only by honest apps. It counts what arrives, whatever becomes of it, and the numbers are data (`ROOM`):

| | messages a day | request-equivalents | time in memory | over |
|---|---|---|---|---|
| one guest in a room | 6,000 | 300 (0.3%) | | that socket closes, its key is banned in that room; the room goes on |
| one room | 60,000 | 3,000 (3%) | | the room closes |
| one host key, all its rooms | 120,000 | 6,000 (6%) | 6 hours | its rooms close, none opens until the day turns |
| the whole relay | 300,000 | 15,000 (15%) | 12 hours | every room closes, none opens until the day turns |

The room keeps its count in the host's socket attachment, so hibernating forgets nothing. A key has at most 3 rooms open (a fourth closes its oldest) and may open 12 an hour, so a room's unreported messages (under 1,024) stay small next to these. Revoking a member closes their rooms at once. A friend you removed cannot spend your relay's day either.

On top of that, an honest app (`GL_BUDGET`): what a host's rooms carry in a day, sent and arrived, stops at 80,000 (4,000 request-equivalents; `thin` at 60,000 makes walking send less), and a visitor past their share (6,000 a day, counted as they arrive, or when the relay says so) has their visit ended with their level untouched, and gets "That is all the live play for today" until the day turns, so a new room cannot be a new share. Over any budget the app rests the room road until the day turns; if the relay answers `relay_busy` or a `rate_limit` it rests 15 minutes, a room that was full or refused one person says nothing about the relay and rests nothing. The saved copy is still there. Direct links do not count. Sync does not share this path or these limits: a room never touches the per-key request limits sync uses, and the whole of the garden stops at 15% of the requests and under half the duration, so sync always wins. Measured message counts per hour are in section 9.

## 5. The rules for what a visitor does

Checked twice, with one table (`94-garden-live-0rules.js`):

1. **In `lib/friends/live.mjs`, before the page hears of it**: confirmed friend (the engine), in a session, session id and counter right, within the rate, schema, ids known to the catalogue, cell in bounds, and `glMayDo(level, act)`. A refusal here is answered directly, and the page never sees it.
2. **On the host's page**, against the garden as it is: the same `_gdPlaceOk` the owner's own planting uses; "is it theirs" (`by`); `May touch`; ripe, thirsty; per-visitor daily caps (`GL_CAPS`).

An applied intent is written to the host's garden (`g.gl`) in the same save as the change. If the same id comes again, the same answer goes back and nothing is applied twice.

## 6. Who did what

Every plant and decoration a visitor places records `by: <friend id>` (`g.plants[uid].by`, `g.decor[uid].by`). An id, never a name: friend text never enters the state file (FRIENDS.md rule 4), so the assistant cannot read it. Old saves have no field and are the owner's. Hovering says "Planted by Taylor". The name comes from the Friends list when it is shown ("A friend" if they have gone).

**The diary** (`g.gl`, ids and numbers only, the newest 300) is what visitors did, shown newest first with an Undo on each line, and a count of what is new since you last looked: "while you were away" means the tab was in the background, or an earlier visit.

**Undo** restores the marked paths (`_gdMark`, the same records as the owner's Undo) and hands back what the visitor spent, if it is still theirs. Only the newest line about a record can be undone: anything later that touched it, yours or a visitor's, puts the earlier lines `over`, and undoing the newest makes the one before it the newest again. A line that ended in a post or a gift (a harvest or a dig of their own, taking back, giving) has no Undo at all; the diary says so by having no button. And your own Undo steps on a record go when a visitor acts on it.

**Your own pick or put-away of a visitor's thing** waits 6 seconds before it is posted, and Undo takes it out of the queue. When it goes, that Undo step goes with it.

**Put my garden back**: a copy of the plants and decorations (`g.glc`, in the state, so every device has it) is kept when the first visitor arrives. Someone arriving again never makes a new one: only pressing the button does, or the copy being over a day old with nothing newer than it. The button undoes what visitors did since, newest first, then restores any record they touched from that copy (`g.glt` remembers which, even after a line has left the diary's newest 300). What you did yourself in the meantime stays, and so does anything handed back, given or posted: that cannot come back. With no copy at all it undoes only today's lines and says so.

**Send home**: one tap ends their visit and turns their level to none.

## 7. Economy

- **Each person spends their own.** The visitor's page takes the seed or the decoration out of their own bag (ledger `gl.o.<i>`, negative) *before* the intent goes. A refusal deletes that entry. The host's wallet is never touched by a visitor: `gardenWallet` skips decorations that are `own`, and a visitor's seed never goes through the host's bag.
- **What you plant is yours to pick.** The crop goes to the planter's basket, whoever picks it (the host can pick for you, and it is posted). **Harvest share** per friend: whoever planted keeps it (default), split half and half, or all to the garden's owner.
- **Posts** go through the durable `gl:post`, queued in the host's garden (`g.gq`, synced entry by entry) in the same save as the harvest, whoever picks: you, a visitor, or the assistant (posted next time a page opens). A crash cannot lose one, and because its id says which pick of which plant, nothing can double one. What cannot travel (a four-leaf clover, which is never given) stays with the host; the crop still goes. The receiver takes each post once by id (`gl.p.<id>`), only for a plant it really planted there, no more than that plant could have made by now, and within a daily cap.
- **Helping**: a visitor's watering costs neither can. It waters the plant, and grows it faster by the existing friend rules (`GSOC_BOOST`: once a plant a day, six a day), and gives the visitor the existing `GSOC_XP.water`, once a friend a day.
- **Bought decor stays the buyer's** while `own` names them. It can be taken back (its debit is deleted, by the answer and by a post in case the answer is lost, so it is in their bag again, once), or given to the host: `own`, `by` and `gi` all go, the host's ledger gets it, the debit stays. From then on it is the host's and nothing points back at the visitor's bag.
- **May touch** reaches what is the host's, never another visitor's: a visitor's plant or decoration is theirs alone, whatever the level.
- **A lost answer.** A visitor who never heard back asks again with the same id. If the host's server refuses that for a level, it says nothing about whether it happened the first time, so it stays spent. After a week with no answer it is refunded: if it had happened after all, the decoration is shown in both for a while, and if they later take it or give it, the books come right (a take finds no debit; a give leaves the bag again). A debit stays in the ledger while its decoration is out, however long.
- **Gifts**: drop something at someone's feet; only they can pick it up. The sender loses it first; the host arbitrates one pick by id. Not picked by the end of the visit: it goes back to the sender. **Gifts carry no coins**, are limited to what can be given already (`gsocGiftOk`), and the daily caps apply (`GSOC_CAPS.recv.gift`, and the receiver's page checks it too, and takes only a parcel it saw).
- **Coins are earned the same way as ever.** Nothing here creates coins, apart from the small thank-you for a shared goal (section 17: 6 coins, at most 3 a day); selling is the market's usual price.
- An honest limit: a person's wallet is on their own computer, so a modified app can mint for itself, as it always could. What the rules guarantee is that **nobody else's** garden, bag or coins can be touched, that a post is bounded by what could really have been grown, and that two honest apps cannot duplicate anything: every flow we know of is proved in the throwaway scripts, not by the shape of the code alone.

## 8. Security

Strangers will read this code. The checks are in section 5. Also:

- A removed or blocked friend is cut at once: their messages stop at the engine (`not-friend`), `onRemoved` ends any session and kicks the socket, session or no session (the host keeps who holds which ticket), their key is banned on that room, and a new room is made next time anyway. A knock from them goes nowhere.
- Levels are read fresh from the synced file for every intent, so lowering one on any device takes effect on the next message, and within 3 seconds with no message at all.
- Friend text (names) is one capped line, set with `textContent`. Phrases and emotes are ids, drawn from each side's own tables. Looks go through `profileAvatarNormalize` and `petSanitize`.
- A visitor's snapshot is exactly what `gardenSnapshot` gives a friend anyway, plus first names of who planted what.
- The assistant has no tool here. It cannot join, cannot act in a friend's garden, cannot change a level. Its existing friend actions all go through the approval the user sees (`server/actions/ops-sensitive.mjs`). Its garden tool works on your own garden and can reach a visitor's things there: "harvest everything" posts their crop to them and "put away" sends their decoration back, as your own clicks do, the next time a page is open.

Proofs: throwaway scripts, not shipped, run on 31 October 2026 against real instances and a real relay, after an independent review: a Look-only friend's forged Plant is refused by the host's server and the page never hears it; a forged "harvest my host's plant" is refused; a gift moves one thing once, the same intent id three times applies once, a crop posted for a plant you never planted is refused, coins do not move; a removed friend is cut at once, their knock gets nothing and a kicked key cannot come back with its ticket. The room itself: strangers, wrong nonces and no, expired, someone else's or forged tickets are refused before a socket; guests reach only the host; a flood is cut and closed; one oversize message closes only its sender; one key's rooms and the whole relay stop at their day through hibernation; nothing is written to disk but the registry's one row. Every way the review found to duplicate a decoration or a crop (place, give, take; put away and Undo; move, take, Undo; pick, Put back, pick; pick, Undo, pick) now leaves one thing in the world. What still has not run: real Cloudflare.

Walkers follow the host's own routes round beds and benches (a walk that arrives within 200 ms of that walker's last one goes straight). A guest's own figure sets off straight and takes the way round when the host answers, a moment later. Typed chat is for later.

## 10. A visit is the garden

The owner, 31 October 2026: "a live visit should be identical to being in my own garden." There is one world and one engine (`94-garden-visit-0world.js`).

**One model, two gardens.** `gardenHere()` is the garden you stand in; on a visit it is `gardenVisitModel()`, the shape of `gardenModel()`, drawn from the saved snapshot or the live host's, with what you have asked for on top. The page, the walking, the collisions, the camera, the HUD, the hotbar, the bubbles and the ghost read `gardenHere()`. `gardenModel()` stays your own garden whatever is on screen: your wallet, the shop, crafting, rewards, the tick and what you publish go by it, so a friend's garden can never be published as yours. `m.level` on a visit is theirs (what is open there); `m.wallet` is yours. Bought land follows the garden on screen (`gardenLandSet`).

**Every action asks first.** Each garden action in `94-garden-1core.js` starts by asking `gardenVisitAct`. On a visit it never touches your own garden. It becomes an intent (live), something that waits (below), the saved copy's one watering a day, or the red flash and padlock with one tap to ask for more (`gl:ask`). Your position at home is not moved by a visit. The tag says whose garden it is, and the house takes you home.

**A live act** is the flow in sections 5 to 7, unchanged. It shows at once with a pending look (`_glv.pending` on top of the snapshot), stays when the host says yes (`_glvEcho`, until their next change says the same) and goes if they say no, with the debit deleted.

**The saved copy** is free walking and everything you can see, on your own computer. Nothing leaves it but hearts, the guestbook, a parcel and the one watering a day, as ever (section 11 of GARDEN.md; the Guestbook panel, `gardenVisitNotes`). Fishing and bugs work in both, on your own casts and in your own bag, as at home.

**Help while they are out.** With Help or Play, what you plant, place or water on the saved copy can wait for them (`GL_QUEUE`: 20 waiting per friend, 30 a day, 14 days; on top of the mailbox's 100 a day, which is the relay's). A host can turn it off ("Friends with Help or Play can leave things for when I am back"; on by default); a shut gate counts as off.

1. **Visitor.** The same ledger record as a live intent, `gl.o.<id>` with `q: 1`, comes out of your bag first. It shows with a clock, and goes by the friend mailbox as `gl:q` (what never left is sent again next time; the host takes an id once). What the host last told you (`theirs`, from `gl:perm`) only lets you try.
2. **Host's server.** On arrival: `permOf`, `glMayDo`, `glIntentOk`, the same as `gl:do` (`onQueue`). It waits in `queue` in `friends/garden-live.json`. A lowered level, a shut gate or the switch sends what is no longer allowed back at once (`dropQueue`). A removed friend's goes, and their page gives it back when it sees you are no longer friends.
3. **Host's page.** When you open your garden, `_glhQueueRun` runs each through `_glhIntent` in order: the same code as a live intent, the same exactly-once key, with the level your server read just now. The garden, the diary line (`away`), and the answer are all in one save: `gq['d<id>0']` (`did`, it happened) or `gq['b<id>0']` (`back`, the post that has always handed things back) with a `q-no` entry, so the same id can never be tried twice. Only then does the server forget it. The diary says "While you were away, Taylor planted 3 carrots", with one Undo; Put my garden back covers it too.
4. **Visitor again.** `back`: the record goes, so it is back in your bag, once, and you are told. `did`: `_glvSettled`, the same as a live yes. After `GL_QUEUE.days` the host refuses it, and two days later your page gives it back (`_gllRefundOld`), so the two can only overlap if your clocks differ by more than that.

**No relay redeploy.** `gl:q`, `gl:perm` and `gl:ask` are ordinary mailbox kinds; rooms carry only `gl:` live kinds, as before.

**The assistant** has no tool for any of it: its garden tool works on your own garden through `lib/agent-engine.mjs` (no visit there, so `gardenVisitAct` is absent), and the new routes are not in the MCP or the actions layer.

## 9. Measured

30 October 2026, three real instances (fake data) through `tools/relay-local.mjs`, each page driven through its own functions, for 4.1 minutes of busy play: everyone gets a new destination every 2 to 5 seconds, a move and a phrase every 25 seconds, and an act in the garden every 20 seconds. That is busier than people are.

| | Room messages sent an hour |
|---|---|
| Host | 2,855 (walks to two people go out as one message: batched. Since this measurement each visitor's walk goes through the host's page for its route: the same count with two visitors; a lone visitor's walk costs one host message only if it needs turns) |
| Each visitor | about 1,400 (`gl:go` 1,000, `gl:em` 240, `gl:do` 150) |
| The whole room | 5,666 = **283 Cloudflare request-equivalents an hour**, 0 rows written |

Eight people (scaled, not measured): about 19,000 messages an hour, 950 request-equivalents, 1% of the free day. So the host's 80,000 a day is 14 hours of three people or about 4 of eight, and a visitor's 6,000 is about 4 hours of this very busy play. On a direct link: 0 room messages (measured).

Not measured: Durable Object duration on real Cloudflare (the time-in-memory budget above assumes the worst the Hibernation API allows: 10 seconds after each message). Nothing here has run on Cloudflare yet.

## 11. What people see each other do (2.27.9)

`94-garden-live-4fx.js` (events and the figure's rod, line and net), `94-garden-live-5pets.js` (pets), `94-garden-fish-5moment.js` (the catch held up: `GART_MOMENTS`, one row per kind; the pose is `GPL_HOLD` in the gardener's art). Pets were missing because `gardenLiveLook()` read a species off `petGet()`, which has none: it now sends `petPayload()`. A follower walks by the home rule, clips arrive by id (`P.clip`, `petWowRun`, `petPat`, `petFeed` send them), a spectacle on another's pet skips tints and freezes. Bugs are the same on every screen (the 20-minute seed), so a net's catch sends `bug gone` and it leaves every screen; a swing at one already gone misses. Not built: host-spawned animals and birds with pets reacting to them, the host deciding who netted first (a race is possible), shared fish and pick-ups on the ground.

## 12. Their sky, clothes and calm; collisions (2.28)

The owner, 31 October 2026: "when you visit someone's garden it should make it the time of day it is for that person"; "message bubble disappearing for host"; "optimize it to not consume CPU when it's not open ... graphics"; "collisions are weird ... rethink what has collisions and how big they are".

- **Their light.** The garden snapshot (`gardenSnapshot`, cleaned by `gardenSnapshotClean`, schema `GARDEN_SCHEMA`) carries `tz` (the offset of the owner's time zone, minutes), `sr` and `ss` (their sunrise and sunset, minutes after midnight, only when they have the weather) and `wx` (1 raining, 2 snowing). A visit's model (`94-garden-visit-0world.js`) works out `tod` with `_gdTod(now, season, snap)`, which uses their offset for the hour and their sunrise and sunset, else the season's usual ones, and takes its rain and snow from `wx`; the creatures of a visit (`_glVisitWorld`) use the same. An older snapshot without `tz` shows the visitor's own sky, as before. It also tells a visitor roughly where in the world the owner is, which is stated in PRIVACY.md.
- **A bubble belongs to the person.** `_gllSay` keeps `A.say = {id, until}` and `_gllSayDraw` draws it into whatever node the person has now; `_gllDress` calls it, so a repaint of the garden (a new node) or a new look brings it back. Your own figure is `_gllMe` (its `root` is `_gw.node`; `gardenWorldPainted` calls `gardenLiveMineRedraw` after it makes the node again). The host can say phrases: `gardenLiveCanSay(m)` shows the Say button for a visitor on a live visit or for the host while someone is here, and `gardenLiveSay(id)` sends `gl:em {c: 'say'}` to everyone (`_glhSend('all', ...)`).
- **Clothes and pets change at once.** A visitor's page sends `gl:me` again, and the host's page asks the server (`/here`) to tell everyone (`gl:who` for slot 0, in `here()`), 1.5 seconds after `opendash:profile` or `opendash:pet`.
- **Calm.** `_gwCalm` (`94-garden-world-0walk.js`): off the focus for 8 seconds, or no pointer, key or touch for 90 seconds with nobody in the garden (friends here count as company), adds `gd-calm` to the stage (`.gd-calm * {animation-play-state: paused}`), slows the world loop to twice a second and the pets' roaming loop (`97-pets-7roam.js`) to four times; any input, or the focus, wakes it. Measured on 31 October with a software-rendered headless browser: awake and idle about 40% of a core (70-odd CSS animations repainting the stage, scripts about 2%), calm about 2.5%. On the server, `tick()` reads `garden-live.json` every 15 seconds while the host is alone (every 3 while someone is here).
- **Collisions (props, 2.29.0).** Each row of `GARDEN_PROPS` can say `col: 'none' | 'soft' | 'full'` (`gardenPropCol`): `full` is the default (a shop, a stall, the bench: the whole footprint), `soft` a small box at the base (the journal, camera, post box and sundial: `_gwBuildSolids`), `none` nothing (the mooring post, the reeds and the boat; a `walk` prop is `none`). The cell route goes through the middle of each cell, so a leg a small box stops is planned again on a lattice of an eighth of a cell round it (`_gwMend`, `_gwLocalPath`: bounded to 15 ms), then string-pulled.
- **Collisions.** `gardenDecorCol(def)`: `none` (walk through or under: flat or hanging things), `soft` (a box about half a cell wide and a third deep at the base: `_gwBuildSolids`, tested by `_gwFree` and `gardenWorldFree` through `_gwSolidHit`, never in the cell grid the routes use) or `full` (the whole footprint, as before). Trees block a trunk only. Seats stay full (you walk up to sit).

## 13. One living garden (2.28.1)

`94-garden-live-6life.js` (the header there is the full design). In a live visit the host's engine owns the creatures (`gl:cr`); guests draw ghosts from the same art and clips and run no spawning (`_glDirect` returns early). New `gl:fx` families: `cr` (poke by a guest to the host alone; react, look, greet by the host), `egg` fire (each screen runs the surprise from its own tables, no reward for a guest), `pick` (spawn, claim, take, gone: a creature's gift or a fish on the shore, the first claim the host hears wins, once), and for bugs `claim` (guest to host), `gone` (`to` is the winner) and `lost`. A guest takes a bug only after the host says so, and a pick-up only if it saw it spawn and its caps allow. `GL_FX_HOST_ONLY` and `GL_FX_TO_HOST` in the rules say who may say what; both ends refuse a guest's host-only fx. The field `kd` (not `k`: the page's event names it) says the pick-up's kind.

**A dishonest guest** can poke, claim and say what it is doing, like any guest; it cannot spawn, move, give, name a winner, or award the host anything, and claims cost the host a lookup by number. It can award ITSELF what its own computer holds (as ever). **A dishonest host** can show creatures, offer a gift and name a winner; a guest acts only on what it saw, for kinds it knows, within the daily caps a gift has. No garden data beyond a snapshot is sent: creature kinds, tenths of cells, clip names.

Not a relay change, `GL_V` stays 2. Left out: the host decides a bug only when a host and a guest swing within a moment of each other as they see it (both are told by the host: one wins); and sync of weather, wardrobe, achievement cheers, photos and new sounds is tracked separately.

## 14. Moments, the fire and listening along (2.29)

The owner, 31 October 2026: "sync like every action, so like nature, pet emotes, moments, interactions. Anything that should be." Nature and pets are section 13 (the host owns the creatures); weather, sky and clothes are section 12. This section is the rest that is a moment or an interaction.

- **`gl:fx` `cheer`** (`GL_FX_KINDS`; steps `level`, `ach`, `photo`): `{c: 'cheer', e: 'level', n}` (a garden level, 1 to 99), `{e: 'ach', i}` (the achievement's id: the receiving app draws its own name for it from `achDef`, and ignores an id it does not know) and `{e: 'photo'}`. `gardenLiveCheer` sends an achievement only if `_pfAutoBadgeOk` allows its group (the profile showcase's rule: never money, places, health or memories). Sent by `gardenLiveCheer(e, v)` from `_gdMoment` (`kind: 'level'`), `achUnlockMoment` and the photo dialog's Save; any person may say it (a guest's goes to the host and the others, like fish). Drawn by `_gllCheerFx` in `94-garden-live-4fx.js`: the cheer emote, a float, `sparkle` or the new `shutter` sound, and one corner line. Nothing else changes in a garden.
- **Gathered by the fire** is not a message. `_gllFireStep` (once a 0.7 s, from `_gllFxStep`) finds the fire pits in `gardenHere()` and the people near each (you, and every actor in `_gll.actors`); with two or more there for 3 seconds a marshmallow floats up every 9 seconds and the corner says who. The same on every screen because the positions are.
- **Listen along** (`gardenVisitTagPaint`, `musicNowEl(fid, {along: true})`): in a live garden whose owner shares what they are listening to (`music.l`), with your Spotify linked, a chip in the tag shows their song and a click plays it on your own Spotify (`musicPlay`). The same asking rules as a friend's card (`music:ask`, one every 2.5 minutes, 24 a day), so it adds no new message.

## 15. Contests (2.30)

The user, 31 October 2026: a fishing or bug contest for live play. `94-garden-live-7contest.js` (the header there is the full design), the table `GL_CT` and `glCtFishPoints` / `glCtBugPoints` in `94-garden-live-0rules.js`, a few lines in the fishing engine (`94-garden-fish-*.js`) and the board's styles in `94-garden-live.css`.

**What people see.** The host, with someone in the garden, taps the trophy beside the gate and chooses Fishing or Bug-netting and 2, 3 or 5 minutes. A board appears over everyone's stage: the countdown, a bar, and everyone in the garden in order with their points. At the end the winner is named, cheers and gets a sparkle and a 🏆 over their head, and everyone gets the small reward below. A host who joins in is on the board like anyone else.

**The host is the referee.** Four new `gl:fx` steps in the family `ct`, all host to guests and all in `GL_FX_HOST_ONLY` (`ct|*`): both the host's server and every guest's server refuse a guest's, like `bug|gone`.

| Step | Body | When |
|---|---|---|
| `ct|start` | `{i, kd: fish\|bug, n: seconds left, tt: the round's length}` | the round begins; again to someone who comes in during it (with what is left) |
| `ct|board` | `{i, n: seconds left, l: [[slot, points, catches]...]}` (at most 8 rows) | when a score changes, at most every 1.8 s, and every 10 s so clocks stay together (a guest takes its end time from the host's) |
| `ct|end` | `{i, l: the final board, to?: the winner's slot}` | 3 s after time is up, so lines already landing are counted |
| `ct|stop` | `{i}` | the host pressed End, left their garden or closed the page: no winner, no reward |

`GL_V` stays 2, no relay change, and an older app ignores them (its schema has no `ct` family). The schema in `lib/friends/live.mjs` gained `tt`, `l` and `kd: 'bug'`, and the fx body cap went from 240 to 512 bytes (a full board is about 160). Names are never in them: a slot is a number, and the page shows the first name it already has from `gl:who`.

**Fishing.** A guest sends what it always sends (`fish` cast, bite, reel, land, then `got fish`). The host counts a catch only when it can match it to a line it saw, in order: a cast after the round began, a bite at least 0.9 s later (a bite is never sooner than 1.4 s), then reel, land and the `got`, which must name a fish (not junk), of a kind that lives in the water cast into (`gardenWaterZone`), with its size clamped to the kind's range, and at least `GL_CT.gap` (2.5 s) after that guest's last catch. A line scores once. Points: one for every 5 cm times the quality (1, 1.25, 1.6, 2.2), at least 1 and at most 50. The host's own catches go straight in.

**Bugs.** The host already decides who got a bug (section 13: the first claim it hears), so it scores that, by the bug's rarity (2, 4, 8, 14, 25). A bug round also shows another bug every 5 seconds, for 30 seconds each, the same ones on every screen (worked out from the round's id and how far in it is: `gardenContestBugsNow`, keys `c<round>.<n>`), so there is something to race for.

**Nothing is kept.** In a fishing round casts are free and use no bait; what is caught is let go (`plan.contest` in `gardenFishPlan`, `gardenCatchFish`: no ledger entry, no log, no record), and a contest bug is not kept either (`gardenCatchBug`). So a round cannot make money or fill a book, and someone who has used their day's casts can still play. The HUD's cast count shows ∞ while it lasts.

**The reward** is the one thing contests give, and it is worked out on each person's own computer from the board the host sent: 5 coins and 2 XP for playing (a catch of their own and at least 3 points), 20 coins and 10 XP for winning when a second person scored. Once a round (the ledger entry `cw.<day>.<round id>`), and at most 40 coins a day from contests whoever hosts. A guest also needs the round to have really run for most of the time it was told about, so a host cannot pay out a round it flashed past. A host starts at most 4 rounds a day (`fd[day].cr` in their own garden's day record, counted when it starts, so ending early does not give one back) and not alone. The numbers are data in `GL_CT`.

**Ties** go to whoever reached the score first. **People who leave** take their row with them; **a host who leaves** ends the round with `ct|stop`; a guest whose host goes quiet clears the board by itself a little after the end time and pays nothing.

**A dishonest guest** can invent a plausible line (it is only messages): the most that buys is points in a game, at most a reward capped each day on its own computer. It cannot start, end or name anything. **A dishonest host** can name a winner and pay the small daily-capped reward to those who played; it cannot touch a guest's garden, bag or coins any other way. No garden data is sent: round ids, slots, points.

**Tested** by calling the host's and guest's functions in a page with the send function stubbed (the referee's checks, scoring, the end, rewards and caps, bug waves, release, joining and leaving, the board at desktop and phone width) and the new wire bodies against the real schema in Node. **Not tested:** two real computers and a relay; real latency (how well 0.9 s and 2.5 s hold up on a slow link); a real net swing at a contest bug; a round with eight people.

**Left out:** team rounds, other games (a harvest race, a hide and seek), a trophy that stays in the garden, a record of past winners, and telling the assistant about any of it (it has no tool here, as ever).

## 16. Trading (2.30)

Two people in the same live garden, the host and a guest or two guests, offer things from their bags face to face. Both see both offers. The swap happens only when BOTH have confirmed the same terms, once, whatever happens to a connection in between. Code: `94-garden-live-7trade.js` (everything here), the tables in `94-garden-live-0rules.js` (`GL_TRADE`, `glTradeOk`), `onTr` and the `gl:tr` kind in `lib/friends/live.mjs`, the person menus, the panel (`94-garden-live-trade.css`).

**What is offered.** Up to 4 different things, up to 20 of each, of the kinds `gsocGiftOk` allows: seeds, decorations, fish, bugs. Never coins. A person finishes at most 10 trades a day (`GL_TRADE.perDay`: counted on their own computer from their own ledger, and by the host from its record of decisions). Both need the Play level in that garden (the host always does). What you offer is checked against your own bag on your own computer when you add it and again when you confirm: the only place that knows what you hold.

**The referee.** The host's page keeps every open trade: who, both offers, who has confirmed, a version that goes up with every offer. It tells each of the two their own view (`st`: yours, theirs, whether you and they have confirmed, whether they can trade) and decides, exactly once, when both have confirmed the current version. A guest never learns another guest's friend id: they talk to the host in slot numbers (`ask to: 2`) and the host answers each by their own session. Between two guests the host's server only checks the tables and the level and hands the word to the page. The host's own seat at the table is the same code without the wire.

**Hold, then swap (the settle step).** The classic trap is that two computers each have to change their own bag, and a message can be lost between the two changes. Nothing here is "in flight": every change to a bag is one local ledger entry, and the only thing that crosses is a decision.

1. *Confirm = hold.* You press Confirm: what you offer leaves your bag into a hold, `gl.x.<trade>` in your ledger (the items, minus; and what you were shown the other offers: `get`; the version; a counter `sq`), and it is saved. Only then is `ok {v, n}` sent. A hold is a place in your own ledger: you cannot spend those things twice, and it is the only thing that can be lost track of.
2. *The referee decides.* Both confirmed the same version: the host writes its record (`gl.t.<trade>`: `go`, who, the version), a durable post for each guest (`gl:post why: trade d: go`), the diary line and its own side, all in ONE save. Only then does it say `go` to both, live. A confirmation of an older version, or from someone who changed their mind, is not counted.
3. *Go = swap.* On `go` (live, by post, or as the answer to a `chk`), your hold becomes the swap in the same entry: what you gave minus, what you get plus (`ok: 1`). One entry, once: a second `go` finds it done. Your book and discoveries are updated, and a line goes to the corner feed ("You traded 3 × sunflower seed for a garden bench with Sam.").
4. *Anything else = release.* The hold goes, and the items are back in the bag, ONLY when the referee says so: `x` (live or by post), or a state that says your confirmation is not in force *and has seen your last word* (`an >= sq`: a state made before the referee saw your confirmation cannot release it), or a version that has moved on (the other changed their offer). Taking your confirmation back is a request: the hold stays until the referee's answer shows it was in time.

**Offline between the two confirmations.** Everything a computer needs to finish is either in its own ledger or comes from the referee, in three ways: the live word, the durable post (taken once by id, like every post), and `chk`: a guest that comes back live asks about every hold it has with that host (every 20 s until answered), and the host answers from its record: open, `go`, or `x`. An id the host has no `go` for was never decided, because the record is written before anything is sent, so presumed abort is safe. What that gives, driven through the real code with a network that was cut, delayed and reordered (throwaway scripts, 31 October 2026, not shipped):

| Who drops, and when | What happens |
|---|---|
| A guest leaves after confirming, the other has not | The host calls it off: `x` live to the one still there, `x` by post to whoever may hold. Nothing moved. |
| The first confirmer is offline when the second confirms | The second swaps at once; the first still holds, and swaps when the post arrives or at its next `chk`. |
| The second confirmer drops just after confirming | The referee had decided; its `go` is posted. The hold turns into the swap when the page next opens. |
| The host's page goes away with a trade half confirmed | The first confirmation wrote an open record. The next time the host's page starts, every open record is called off and the holders are told by post. |
| The host's page goes away right after deciding | The record and the posts were saved before anything was sent; the posts go at the next start, and `chk` is answered `go`. |
| Messages delayed, repeated, reordered, a confirmation crossing an offer change or a take-back | A confirmation of an old version is ignored and its hold goes; a stale state does not release a hold; a `go` repeated, or an `x` after a `go`, changes nothing. |
| A request nobody answers (an app without trading, a closed tab) | The other app has 8 seconds to say it can trade; an open trade nobody touches for 5 minutes is called off (and its holds go). |

**What can still go wrong, honestly.**

- *A hold has no timer.* If the host's computer never comes back, or its data is lost, a confirmed person's things stay on hold: the referee may have decided `go` while they were away, and releasing on a timer would then duplicate them. After three days the app says so and offers "Take it back" (their choice; if the host DID decide `go`, the other person has their offer and they have it too). Nothing releases by age otherwise, and `_gdTidy` never folds an unresolved hold into the bank.
- *The host's record is the memory of a decision.* It is kept in the ledger (not folded for 120 days) and every guest is also sent the decision as a post. A host whose data is restored from a copy older than a decision could answer a very late `chk` with `x`. Both would have to be lost.
- *Nobody can check anyone else's bag.* The honest-app limit of section 7 applies: a modified app can offer what it does not hold. The other side still gets exactly the terms it confirmed, so an honest person never ends up with less than they agreed, but items can be made out of nothing for a modified app's friend: at most 4 rows of 20, 10 trades a day. A dishonest host can refuse to decide (an honest guest's things stay on hold) and can credit its side without paying, but it cannot make an honest guest take something other than the terms that guest saw and confirmed, or decide twice.
- *One computer can say `go` only for a trade it ran.* A post counts only if it comes from the friend the hold names (`hold.to`), and a hold is settled only by its own trade id.
- *A reload* of a guest's page during an open trade (before confirming) loses the panel; the referee still has the trade and calls it off after 5 quiet minutes, or the panel comes back as a request when the other person next changes something. A hold survives a reload and is asked about.
- *Level changes* are checked when the trade is asked and again when it is decided; a lowered level can end a trade, never complete one.
- *Not built:* trades with someone not in the garden, coins, offers of crops, a line for people who only watch, a record of past trades beyond the host's diary line.

**The panel.** "Trade" is in a person's menu (the host's figure menu and the visitor's equivalent). The panel shows your offer and theirs side by side, "Confirmed" on each side as it happens, a plain line of what is going on, Confirm / Take my confirmation back, Cancel. Editing is off while you are confirmed. A request that arrives while you are busy is a chip ("Sam wants to trade"), not a pop-up. One trade at a time for each person; two people who press Trade at the same moment end up in one trade.

**Not a relay change.** `gl:tr` is a live kind (`room: true`, like `gl:fx`); `gl:post` gained `why: trade` and `d`. `GL_V` stays 2. An older app drops both and the request simply times out with a plain note.

## 17. Shared goals (2.30)

The owner asked for live-play ideas; this is one joint quest everyone in the garden works on: "Catch 6 fish together", "Water 12 plants together", "Net 5 bugs together". `94-garden-live-7goal.js` has the design in its header; the table (`GL_GOALS`, one row each), the pacing and reward numbers (`GL_GOAL`), the size and share rules (`glGoalSize`, `glGoalCap`) and the wire check (`glGoalOk`) are in `94-garden-live-0rules.js`, which the server evaluates too.

**The host owns the goal.** While somebody is in the garden the host's page picks one (about 20 seconds after the first person arrives, then 2.5 minutes after the last ended, at most 6 a day, never the same kind twice running) from what the garden can really do now: no water goal in the rain, none unless a visitor with Help or Play is here and enough plants are thirsty, no bug goal in winter or with Fun Off or with fewer than 3 about, fishing needs the lake. Its size grows with the people here, inside the row's range. It tells everyone the WHOLE state each time in `gl:goal` (host to guests only: a lost message costs nothing, a late joiner is told at once, the host repeats the end twice and the state every 45 seconds). A guest's page cannot send one (`visitSend` has no such kind), a goal sent straight at a host is dropped (the host is nobody's visitor), and the host's own `hostSend` refuses a state that does not fit the table. Every state is checked against the table at both ends (`glGoalOk`: a known goal, a size the row allows, each part within the cap, the parts no more than the progress). The host can skip one (the card's ×) or switch them off ("Suggest shared goals while friends are here", `prefs.glGoals` in the garden state, so every device has it). A goal nobody has moved for 30 minutes, or an empty garden's after 15, is let go without a word.

**What counts is what the host applied or confirmed.** A visitor's watering counts when `_glhIntent` has applied it (so a refusal, a Look-level forgery, a plant that was not thirsty or the same intent id twice count nothing or once). A bug counts when the host named the winner (`_glcBugClaim`, or a `catch` it applied), so a guest's own "I netted one" is not counted a second time. The host's own water, fish and bugs count through its own events. **A fish is the one thing the host can only hear about** (the line is cast and the fish rolled on the guest's own computer): it counts from `gl:fx got fish` for a fish of the catalogue (never junk), at most one every 4 seconds from the same person. And nobody's part can be more than 60% of the goal (`glGoalCap`, never all of it), so it takes two of you and one dishonest guest cannot finish it alone: the most they can do is fill their own share early. Somebody who leaves takes their part off their slot (the next person to come in is given that slot): it still counts towards the goal, and neither they nor the next person are thanked for it.

**The thank-you is each person's own.** When the goal is done the host says who took part (`p`), and each page, the host's too, writes ONE ledger entry on its own computer, `gl.q.<goal id>` (`{d, k: 'gl', ok: 1, c: 6, x: 4, i: {...}}`, so the wallet adds it like a daily task's), if it watched the goal go on, is one of those who took part, has not been thanked for that goal, and has had fewer than 3 such thanks today in any garden. Six coins, four XP and a small item (bread dough, fertiliser or maggots) a goal, 18 coins a day at the very most. The ids are the garden's own and the entry folds into the bank after 40 days like any other. A modified app can write itself anything, as it always could; what holds is that nobody else's garden, bag or coins are touched, and that two honest apps cannot be thanked twice for one goal.

**What everyone sees.** One small card under the menu, the same on every screen (a fixed icon and the table's own text, never text from the wire; the bar slides, nothing replays; reduced motion is still), with each person's part (the name from the garden's people, "You" for you, a tick when a share is full), and corner-feed lines for the start, halfway and the end ("Goal reached: Caught 6 fish together!"), then "Your thanks: 6 coins, 4 XP, 3 bread dough". The host's own card has the skip button.

**A dishonest guest** can say it landed fish, at a real line's pace and up to its share, and can send the usual claims; it cannot start, change, finish or name anybody in a goal. **A dishonest host** can show a goal and say it is done with you in it, so it can pay your computer its small thank-you: only for a goal your page watched, once a goal, at most 3 a day. Not a relay change: `GL_V` stays 2 and an older app simply sees no goals (and gets no thanks).

Not built: choosing a goal by hand, goals that count planting, harvesting or tidying (a row in `GL_GOALS` and a `_glgCount` call where the host applies it), a goal that outlives the host's page, and anything on the saved copy (a goal is for the live garden only).

## 18. Pets in place, and playdates (2.32)

The user, 31 October 2026: "syncing pet location accurately as well"; "tiny pets when joining others' gardens is weird"; and the playdates left over from the first list ("pets that have met remember each other, friendship bonus").

**Where a pet is.** Until 2.31 a friend's pet was a follower: each screen put it about a cell behind the person and walked it by the home rule, so a pet that wandered, sniffed a flower or went to say hello was somewhere else on every other screen, and the host's roaming pack wandered by itself on each visitor's screen. Now the owner's computer is the truth about its own pets and says where they are (`gl:pp`, `GL_PP` and `glPpOk` in `94-garden-live-0rules.js`, `gardenLivePets` and `_gllPlacesIn` in `94-garden-live-5pets.js`).

- **What is sent.** One message carries up to four pets: the sender's companion (`u` 0) and, from the host, the pack that is out (`u` 1 to 3, each with its species). Tenths of a cell, and where it is going if it is walking. The pet loop (`_ptwFrame` in `97-pets-7roam.js`, which also runs while calm) hands its pets to `gardenLivePets` every frame; that sends the start of a walk or a new end point at once, again every 3 s while it goes on (`GL_PP.gap`, 6 s when walking is thin), the place it came to rest 0.45 s after it stopped, "still here" every 30 s while it sits, and everything again 2.5 and 8 seconds after the garden goes live and whenever somebody arrives (`_gllRoamTell`). A walking pet is about 20 messages a minute, a sitting one two.
- **What a screen does with it.** The copy walks to the end point at the pet's own pace, a little faster or slower to close the gap (`_gllPetFix`), and is put in its place if it is more than `GL_PP.snap` cells off. A copy with no place, or none for 40 seconds (`GL_PP.stale`), follows the person as before, so an older app or a quiet one is never wrong, only less exact. Clips, naps and spectacles are still `fx` events (section 11), and are not touched by a place.
- **Who says what.** A guest may only say where its own companion is; the pack is the host's (`glPpOk`'s second argument, and the same at the server's `onPp`). A pack pet appears on a visitor's screen only if the host shares that pack with them, as before (`_ptFriendPack`).
- **Not mirrored.** What a pack pet does between walks (a sniff, a nap) is not sent; a visitor's copy sits where it came to rest.

**Tiny pets on a visit.** The pet engine (`97-pets-7roam.js`) only ran on your own garden page. On a visit, your own pet was the world's old small follower (`_gwPetFrame`, `GW_PET_SCALE`) and nothing could say where it was. `_ptwCheck` now runs on a visit too (`_ptwVisiting()`): your companion at the usual size in the garden you stand in (`_ptwWorld` reads `gardenHere()`), your pack stays home, no rare visitor comes to somebody else's garden and no surprise happens there.

**Playdates** (`94-garden-live-7pals.js`, `GL_PLAY`). Not a message: every screen sees where both pets really are, so each computer works it out for itself and makes its OWN pet do it, which the others see as any other clip. Your companion and a person's pet that stay within `GL_PLAY.near` cells for `GL_PLAY.hold` ms, both at rest, greet (a wiggle, hearts; a jump for best pals), then not again for four minutes. A host knows every friend it let in; a visitor only knows the host (a guest never learns another guest's friend id), so those pets play but a visitor does not remember a guest.
- **What is kept**: `state.pet.pals[friend id] = {n, d, l, f, sp}`: playdates, days with one, the last and first day, the species of their pet. Ids and numbers only; the name comes from Friends when shown. At most `GL_PLAY.keep` friends.
- **The bonus**: the first playdate with a friend each day gives the pet `GL_PLAY.bond` points of friendship (`petBondGive('play')`, inside its daily cap). Days of playdates make friends: 1 met, `pals` (3) pals, `best` (8) best pals (`glPlayLevel`), a journal line and a toast at each. Pals and best pals trot over when the other pet is a few cells away (not while busy, once a minute). Nothing here gives coins.
- **Shown**: "Pet friends" in the pet's page (`gardenPalRows`), and the journal.

## 19. The group photo (2.32)

The user, 31 October 2026: the leftover "guestbook moments: photo saved to both Memories on visit".

**Not one picture sent to both: the same picture drawn twice.** Sending a picture to a friend would be a new kind of thing to carry and to trust, and the user's own garden already draws itself, so it goes the other way. Anyone in a live garden taps the camera in the quick buttons (`gardenSnapAsk`, `94-garden-live-7snap.js`): `gl:fx {c: 'snap', e: 'ask', i, x, y}` (an id and the cell the frame is centred on) goes to everyone. Every screen that is showing the garden counts three seconds (a bar over the stage with Skip; Cancel for the person who asked), then draws the part of the live stage in the frame (`GL_SNAP`: 720 by 450 of the garden's own units, the same for everyone because it comes from the cell) with the people and pets in it, and keeps it in its own Memories. Left out of the drawing: the grid, pointer guides, thirst bubbles, lock signs, name tags and speech. A friend whose app is older does not hear the ask. Asks are limited (one at a time, 30 s between one person's, `_gls.seen` for ids).

**Memories** (`93-memories-photos.js`, `lib/memory-photos.mjs`, `server/routes/memory-photos.mjs`, `styles/93-memories-photos.css`). Photos live in `<data>/memories/photos` with an `index.json` (newest first, 200 kept, the oldest go with their files): a row is `{id, name, iso, ts, kind: garden|group, at, who, w, h, bytes}` and holds ids only (`at` whose garden it was, `who` the friends who were there; the names are read from Friends when shown). They stay on this computer and are not part of the encrypted sync: a picture of a friend's garden is not for other devices to fetch. The page shrinks to 1600 px wide JPEG before sending it to its own server; the server checks the bytes, size (900 KB) and pixels again. Routes: `GET /api/memories/photos`, `POST /api/memories/photo`, `POST /api/memories/photo/delete`, `GET /api/memories/photo/<name>`. Photo mode has "Keep in Memories" beside "Save picture"; the Photos tab (`memories:photos`) has the album, a bigger view, Save a copy and Remove.

## 20. The fish in the water (2.34)

`94-garden-fish-6school.js` (the header there is the design). The owner, 1 November 2026: "you only get bites from the actual fish in the water that we see ... 2 friends can see the same fish, only one of us can catch it, and we can see the fish approaching someone's bait."

**The host decides.** The host's page runs the water on a 4 Hz clock of its own (`setInterval`, so a hidden tab keeps it going, slowly) and sends the whole list in `gl:fs` at once when a fish changes state and every 6 seconds otherwise, so a lost message costs nothing and a guest who misses one is right again within 6 seconds. Guests carry each fish on towards `tx, ty` between messages at the speed `_gfsSpeed` gives for its state and size, and draw it. With people here a fish that has arrived waits for the next list before it sets off (`f.rest`), on the host's screen as on theirs, so both have it in the same place. Alone, or as a guest of a host on an older version (nothing heard for 12 seconds), your own computer runs a water of its own. A guest who has heard the host never makes up fish again in that visit, even while reconnecting, so there are never two waters flipping.

**A line and its fish.** The host knows every line from the `fish cast` it already hears, which now carries the bait in `i` (`A.fish.bait`). A fish that notices takes the line's slot in `to`; a line has at most one fish, a fish one line. `fx fs hook | land | free` go to the host alone (`GL_FX_TO_HOST`) and are acted on only for the slot the server names (`se.w`), only if the fish's `to` is that slot. Exactly one person can catch a fish. A landing counts unless the host's list shows that fish is no longer on your line. The reel game was taken out in 2.35.1 and came back in 2.38 at the owner's word: `plan.diff` is the kind's difficulty plus up to 2 for size, and a weak rod's line slips faster. Fish are few on purpose and grow with level and `GARDEN_WORKS` (`_gfsWant`); a friend's works come in the snapshot's `wk`, so everyone walks the same pier.

**Limits.** No casts a day. Fish landed count in `fd[day].c`; past `GARDEN_CATCH_ECON.xpFish` they earn no XP, and the market's limits are unchanged, so it stays no farm. Bait is spent at the bite.

**A dishonest guest** can say it struck, landed or let go of its own fish, and can name any bait (a keener fish, no more); it can still award itself what its own computer holds, as ever. **A dishonest host** can show any fish; the guest still has to cast and land it, and its size is kept to what that kind can be. Not a relay change, `GL_V` stays 2.

Not built: a guest's own rod does not change how a fish behaves (it decides how far they can cast); a fish does not leave a band for the whole lake, and swims straight to a float even under the pier.

## 21. Staying in step (2.34.1)

`94-garden-live-8sync.js` (the header there is the design). `gl:d` is a stream of changes and `q` lets gaps through, so a lost change used to stay lost until the visit ended. Every 30 s the host flushes (`_glhDiff`), hashes what `_glh.sent` holds, not the model, and sends `gl:sum`. A guest hashes its snapshot the same way, leaving out the flags and variants; two differences running send `fx sync ask` to the host alone (`GL_FX_TO_HOST`), which answers with `gl:snap`, at most once per person in 8 s. A guest asks by itself at most 6 times a visit, so something this copy can never match (a catalogue id it does not know) cannot loop. A garden over `GARDEN_SNAPSHOT_MAX` sends no sum.

`_glhSendSnap` used to mark the whole model as told while sending to one person, so everyone else lost what changed at that moment: it flushes first now. A `gl:d` that fails at the local server (`_glhSend` answers null) sends the whole garden to everyone 3 s later. A send the engine drops for its rate is not seen by the page; the sum catches that.

`fx sync at {x, y, nw, n?, tt?, i?}` is a cell every 30 s, not `gl:go`, and what the person is doing that lasts: `nw` bit 1 says it reports this (an older app's does not, and is not taken to mean "no line"), bit 2 sitting, `n` and `tt` the float's cell plus one, `i` the bait. A line or a seat a screen never heard of comes right, and one that ended unheard goes. Only someone more than 1.5 cells out moves, and someone fishing or sitting slides there and stays as they are: a line now ends only when its owner says so (`in`, `lost`, the catch, or this check), never because the figure moved. A person who has just come in, or is back, is also told at once about every line out and every seat (`_glhCatchUp`). Everything runs off the fish's clock, a worker from `/garden-clock.js` (the policy `script-src 'self'` refuses a blob) with `setInterval` as the fallback, because a hidden tab's own timers are throttled. `/api/relay` says `stale` when this computer's deploy record is behind `RELAY_CODE` (raise it when people must press Update my relay).

The owner's own online status is left as they set it: `presence` is off by default for every friend, and that is why a friend shows offline until a message arrives.

## 22. What you own shows (2.39)

`94-garden-fish-7gear.js`. **The rule for anything that can be bought or unlocked, now and from now on: it appears in the world or on the figure, and friends see it, live and on a saved copy.** A bonus that is only a number on a card is not finished. The owner, 1 November 2026: "I want to see if my friend has a cool new rod."

What a person carries goes in their look as `g` (ids; a receiver draws from its own tables and leaves out what it does not know), through `cleanLook`, `gl:me` and `gl:who`, and again 1.5 s after a purchase or a change of gear. What is built goes in the snapshot's `wk`; a host in a live garden sends the snapshot again when they build, so it appears at once. A purchase is told as `fx got gear`, and held up on your own screen when the shop is closed (`gardenCatchMomentSoon`). A new thing to draw: a row in the table, a drawing, and this section's check.

## 23. Variants, specimens and showing off

`94-garden-fish-0variants.js` (the table: pure, the server reads it too), `94-garden-fish-1vart.js` (the drawing), `94-garden-fish-8spec.js` (the records), `94-garden-fish-9best.js` (the page). The owner, 1 November 2026: "variants, so like shiny, glowing, evil, angel ... make every fish caught unique with its own size etc, and it gets added to some sort of user base".

**Decided at spawn, by whoever decides.** The host rolls a fish's variant in `_gfsSpawn` and sends it as `v` in `gl:fs`; an older app drops it, `GL_V` stays 2. A bug's comes from its key and the conditions, so every screen gets the same one, like the bug. Each side takes only ids from the table (`gardenVariantFor`): anything else is an ordinary fish. What raises the odds is the table's `more`, and `gardenVariantHow` makes the player's words from it, so they cannot disagree. Never more than `GARDEN_VARIANT_MAX_SHARE` of what spawns is a variant. It shows on the shadow (`gardenVariantShadow`), on the reel's words, held up (`fx got` carries `v`), on the card, in the tank and on a saved copy.

**A specimen is a record beside the bag.** Bag items stay `fish:<id>-<q>` and `bug:<id>`. `state.garden.sp` holds each catch as one value, merged entry by entry; `vl` holds the variants found and is never trimmed, so progress does not go back. Past `GARDEN_SPEC.max` the lowest-scoring go, never a pinned one or the newest few. Selling marks the record `s`, and its Undo takes that back. A contest fish makes no record. `p` and `w` are friend ids, never names, and stay in your own state.

**What friends get.** The snapshot's `sp` (`gardenSpecWire`): your best few as [id, variant or '-', size, quality, serial], how many variants, catches to the nearest ten. No day, no place, no company. `sh` gains `fv` and `bv`, lists of their own, because an older app's rows must stay as they were. It travels with the garden, so the per-friend Garden permission decides who gets it. `_gscSnapBody` copies `sp` to the saved copy, and `cv`, which it went without, so a friend's parcel of a fish or bug could be refused as too old.

**There is no central server, and this adds none.** The friends board (`gardenSpecBoard`) is what this computer has heard from your friends, and the page says so.

**Economy.** A variant pays `tier.sell` times at the market, added to the sale's total before the daily limit applies, so `marketFish` and `marketBugs` still rule it. XP is untouched.

## 24. Together, more (next release)

Code: `src/app/94-garden-zz-*.js`, `src/styles/94-garden-together.css`. The owner, 1 Nov 2026: friends' gardens as places to catch things, a project built together, photo mode, seasons on the map, a day's end, and "surprise me".

**The channel is the sealed snapshot.** One new strict field, `tg` (`GARDEN_SCHEMA` in `lib/friends/garden.mjs`, `gardenTogetherClean` in the catalogue): ids and numbers only, an older app drops it. No new message, server part or relay change. Each person writes only their own numbers; everything shared is worked out by adding the two. Friend words never enter the state; a bottle's line is an index into a table (append only). `gtgPair` is a mark for the two of you: it names neither, so a third friend reading a garden learns nothing. Snapshot publishing keeps its 15-minute gap unless a thing starts (a project, a gnome, a bottle), so shared numbers can lag by that much.

| `tg` field | What |
|---|---|
| `k` | the garden's own id, a random mark made once (`g.seen['tg.k']`) |
| `pj` | `[[pair, kind, pegs, timber, stone, tenths of a percent]]`, up to 3: your part of each project |
| `gn`, `gs`, `gb` | the pair your gnome is staying with; colour numbers of gnomes staying with you; your pennants |
| `pv` | `[kind, this one's weight, best]` in hundred grams |
| `bt`, `bw` | your last 3 bottles `[[pair, line, day sent]]`; how many wait unread in your lake |
| `ev` | you put the lamp out today |

**A garden's own kinds** (`-0kit`). 12 fish and 12 bugs (ids `gh-*`, `needs: {home: true}`). `gardenPlaceKinds(key)` picks 2 of each from the garden's id, the same on every screen; `ctx.home` asks. They are on no region page, because no page should need a friend. The owner catches theirs at home; a friend has to visit or trade (gifts and trades already take any catalogue fish). First catch of each: 3 tickets.

**A shared project** (`-1project`, `GTG_PROJECTS`). Bridge, lighthouse, statue: weeks of pegs, timber and stone between two. Your adds are `wd['tg.pa.<friend>.<uid>']`, an entry each, so your own devices add up and an Undo is a negative entry. The partner's part comes from their snapshot, capped at the cost and kept in `tg.py` while they are away. Both adding the last of something: the one whose id sorts last takes the extra back, once. Both staking out something different: the same one builds the other's. Tickets at each of 5 stages, only if your own part is at least a tenth; finished, it gives more and becomes a way across to their garden. Stands in both gardens, and visitors see its stage from the snapshot.

**Photo mode in the world** (`-3pose`). Hold up anything you have caught, frame (close, middle, wide, nudge), six filters, three frames. Draws the live stage through the group photo's `_glsBlob`; the filter and frame are drawn on the picture. One a day pays 2 tickets. Friends here see the flash; the picture stays with you.

**Seasons that change the map** (`-2season`, `GTG_SEASON_AT`). Winter: `_GD_ICE` in the catalogue makes the lake walkable, not water and not buildable; holes stay water and fish swim under the ice between them (`gardenIceSpot`), so you fish through them, and the flat spot drawings hide. Spring cherry trees, summer flower clumps, autumn leaf drifts, each with falling petals or leaves and its own kinds (ids `sn-*`, `needs: {season, map: true}`, on the main garden's and lake's pages). All of it reads `gardenHere().season`: in a friend's garden, their season. A thaw while you stand out there brings the little boat.

**The day's end** (`-4evening`). A lamp by the shore bench after dusk: what you caught, what your work earned, what's next. Putting it out pays 2 tickets once a day; friends see it lit or out. No toast, no count, no reminder.

**Surprises.** The ghost in the photograph (`-3pose`): at dusk by the sundial, in any photo including a group one: 15 tickets and stone once. The travelling gnome (`-5gnome`): leave it at a friend's for 3 days, a photo in your Memories, home with a pennant; 6 tickets, the host 3, more at 3 and 6 gardens. Bottle post (`-5gnome`): a line from the book, three days on the water, bobbing in their lake. The prize vegetable (`-6veg`): tend it once a day and your real tasks and focus feed it; it stands at its real size with its weight on a label; on the scales after 7 days of tending.

**World cells** are in tables marked `// world cells`: `GTG_PROJECTS`, `GTG_SEASON_AT`, `GTG_GHOST_AT`, `GTG_EVE_AT`, `GTG_GN_AT`, `GTG_BOTTLE_AT`, `GTG_VEG_AT`.

**A dishonest friend** can claim any part of a project up to its cost, or send a gnome or a bottle: they can show you a finished thing, but your thanks need your own tenth. Not built: a friend's pose is not shown as a hold-up (only the flash), and a project has one partner.

