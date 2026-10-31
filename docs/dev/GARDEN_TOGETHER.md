# Playing together, live, in each other's gardens

The owner's words: "If I allow it, we should see what each other does: 100% of all actions in each other's gardens, plant stuff, buy our own stuff; it says planted by me or Taylor or whoever; we need to think about how we share the gift or reward; we want it live and fully interactive, players interact with each other."

Code: `lib/relay/space-room.mjs` (the relay's pass-through room), `lib/friends/live-room.mjs` (a client's socket to it), `lib/friends/live.mjs` (the service: sessions, permissions, checks), `server/routes/garden-live.mjs`, `src/app/94-garden-live-*.js` (0rules: pure, also evaluated by Node; 1core; 2visit: a visitor's world; 3host: the host's authority, diary and Undo), `src/styles/94-garden-live.css`.

## 1. The shape of it

**The garden's owner's computer is the truth.** A visitor sends intents ("plant carrot at 4,5"). The host checks them with the same rules the owner's own clicks go through, applies them to the host's own garden, and tells everyone there what happened. Everyone animates that. No visitor ever writes the host's data. If the host is not in their garden, a visit stays what it has always been: the saved copy, look only.

**A star, not a mesh.** Every message goes visitor to host or host to visitor, sealed for that pair of friends (the same envelopes as every friend message, `sealPair`). So two visitors need not be friends with each other, and neither learns the other's friend id: the host gives each person a small slot number (0 is the host), a first name and a look.

**Connected only while both are in a garden.** Nothing runs unless a host's page is on their own garden and a visitor's page is on that garden's visit. A page that stops saying so (a closed tab) is dropped after 2.5 minutes.

**One tab hosts.** Every open tab hears the same events, and two tabs each applying what a visitor asks would double crops and gifts. So the page says which tab it is (`tab` in `/here`), the server names one (`lead`), and only that one may speak for the garden (`/host`). Another tab of your garden says so and waits; if the host tab closes it takes over at its next beat (a closed tab says so at once; a silent one loses the place after 95 s), and nobody is sent away. Posts and parcels have ids that say what they are, so even two tabs at once could not double anything.

## 2. Permissions (host's choice, per friend, visible to both)

| Level | May do |
|---|---|
| none (the default for everyone) | the saved copy only; a knock shows up at the host's gate, and the host can let them in with one tap |
| Look | walk, emote, say preset phrases, wave and high five |
| Help | Look, plus water, weed, and pick what they planted themselves |
| Play | Help, plus plant, place decorations, move or take back what is theirs, gifts |

Also: **the gate** (open or closed, whatever the levels say; a new garden's gate is open but nobody has a level), **May touch my things** per friend (off: a visitor can never move, dig up, take or pick what is the host's), and **Harvest share** per friend (below). Group members never get more than Look unless the host chooses that friend's level by hand. Levels are data (`GL_LEVELS`, `GL_ACTS`).

Stored in `friends/garden-live.json` (synced, end-to-end only; not in the state file, not readable by the assistant). The computer hosting reads the file again for every intent and every knock, and every 3 seconds while anyone is here, so a level lowered or a gate closed on your phone takes effect at once on whichever computer is hosting, and the page is told. A friend with no level learns nothing from a knock: the same "ask them" whether you are in your garden or not, gate open or shut; and if you do not share your presence with them, no answer at all (they still show up at your gate if you are there). A friend you gave a level to may hear that you are away.

## 3. What each message is

All are friends kinds with a strict schema (`lib/friends/live.mjs`): ids, cells and numbers, plus names the host passes on (one line, capped, shown with `textContent`). `s` is the session (a random id per visit), `q` a counter per direction: anything not newer than the last is dropped, so a replayed message does nothing even after a restart. Live kinds are never stored, queued or retried.

| Kind | Way | Body |
|---|---|---|
| `gl:knock` | V to H | `{v, k?}`: the protocol version, and the key made for this visit that the room's ticket will name (needed for the relay road). The only live kind but `gl:hi` and `gl:no` that may use the friend's mailbox (a post, about 30 a day at most) |
| `gl:hi` / `gl:no` | H to V | `{v, s, lv, w, r?: {n, t, e}}`: you are in (level, slot, the room's nonce and ticket, good for 15 minutes) / `{v, why: closed\|ask\|away\|full\|old\|road\|budget}` |
| `gl:me` | V to H | `{s, q, a?, pet?}`: how I look (allow-listed ids; drawn through the avatar kit on each side) |
| `gl:who` | H to V | `{s, q, w, n, a?, pet?, lv, on, x?, y?}`: someone here or gone |
| `gl:go` | both | `{s, q, w?, x, y, r?}`: walking to a destination, never a stream of positions. The host's page answers every walk with the way round the beds (`r`: up to 12 turns), so nobody walks through a bed or a bench |
| `gl:em` | both | `{s, q, w?, e, c?, to?}`: an emote, a preset phrase or an interaction, ids from tables on each side |
| `gl:do` | V to H | `{s, q, i, t, p?, x?, y?, r?, k?, item?, to?}`: an intent; `i` is the sender's id for it (exactly once; `[0-9a-z]{6,24}`, so it can never look like a credential when it syncs) |
| `gl:res` | H to V | `{s, q, i?, w, t, ok, why?, ...}`: what happened, to everyone (a refusal only to the sender) |
| `gl:d` | H to V | `{s, q, ops}`: the garden changed: rows added, changed, removed |
| `gl:snap` | H to V | `{s, q, n, of, d}`: the garden as it is now, in pieces of 3,600 characters |
| `gl:lv` `gl:bye` `gl:ping` | | the level changed; I left, you were sent home, or that is your share of the relay today; still here? |
| `gl:post` | H to V | `{id, why: crop\|back, i?, items}`: **not live**: posted things (a crop, something handed back), queued like any friend message until it arrives, taken once by id. The id says what it is (`c<plant>-<pick>`, `b<intent>0`), so the same post made twice is one. Each friend has their own place for them: 120 waiting, 120 a day; nobody can push another friend's out |

An older app does not know these kinds and drops them: the knock is never answered and the visit stays the saved copy. A `v` the host does not support gets `gl:no {why: 'old'}`.

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
- **Coins are earned the same way as ever.** Nothing here creates coins; selling is the market's usual price.
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

## 9. Measured

30 October 2026, three real instances (fake data) through `tools/relay-local.mjs`, each page driven through its own functions, for 4.1 minutes of busy play: everyone gets a new destination every 2 to 5 seconds, a move and a phrase every 25 seconds, and an act in the garden every 20 seconds. That is busier than people are.

| | Room messages sent an hour |
|---|---|
| Host | 2,855 (walks to two people go out as one message: batched. Since this measurement each visitor's walk goes through the host's page for its route: the same count with two visitors; a lone visitor's walk costs one host message only if it needs turns) |
| Each visitor | about 1,400 (`gl:go` 1,000, `gl:em` 240, `gl:do` 150) |
| The whole room | 5,666 = **283 Cloudflare request-equivalents an hour**, 0 rows written |

Eight people (scaled, not measured): about 19,000 messages an hour, 950 request-equivalents, 1% of the free day. So the host's 80,000 a day is 14 hours of three people or about 4 of eight, and a visitor's 6,000 is about 4 hours of this very busy play. On a direct link: 0 room messages (measured).

Not measured: Durable Object duration on real Cloudflare (the time-in-memory budget above assumes the worst the Hibernation API allows: 10 seconds after each message). Nothing here has run on Cloudflare yet.
