# Freeflo Groups (design)

A **group** lets one link connect many people. The person who starts it (owner) can be someone with friends,
or a business with its own relay. Being in a group shows your name, picture and status to the others, and
nothing else. Friends stay exactly as they are: the two-person invite, the pictures to compare and every
sharing setting are unchanged.

Code: `lib/relay/space-rgroup.mjs` (relay), `lib/friends/group-core.mjs` (pure crypto and schemas),
`lib/friends/groups.mjs` (engine), `server/routes/groups.mjs`, `src/app/96-friends-4groups.js`.
Wire format: RELAY_PROTOCOL.md section 13.

## 1. Why these decisions

### One code to share: a link, with an optional 4-letter code

Freeflo has no central server, so **a short code alone cannot tell a new app which relay to ask**. The way in
for everyone is therefore a link or its QR code:

```
https://<relay>/g#ODG1.<group id>.<secret>.<check>
```

The secret (128 bits) sits after `#`, so browsers do not send it to the relay. It cannot be guessed. Rate limits
are there for floods, not because guessing is a real attack. Three things are derived from it: a `proof` shown to
join (the relay stores only its hash), a key sealing the group's card (name, description, who runs it), and a key
that proves someone held the link. "Reset link" replaces it, and the old one fails at the next request.

**The group id is the anchor.** It is a hash of the first signed document's owner keys and a random nonce, so the
link carries a commitment to who started the group. A joiner checks that first document against the id, and walks
forward from there. A relay cannot show anyone a different history.

**Short codes: kept, but they can never let anyone in by themselves.** A long-lived, multi-use 4-letter code has
only 279,841 values, so it is guessable given time. It is safe here because of what it is limited to:

| Protection | Why it matters |
|---|---|
| Off by default; an admin turns it on | No guessable thing exists unless someone wants it |
| Only for people already on that relay | The lookup is members-only, and the front door refuses unknown keys before any Durable Object is touched. A stranger gets no tries at all |
| 3 misses per person per 10 minutes, shared with friend codes; 6 per address per 10 minutes; 200 a day across the relay. Trying to set a code someone else has counts as a miss too, and a group gets at most 20 new codes a day | A patient insider gets at most 200 tries a day, about 0.07% of the space per live code. After the day's limit, codes stop until midnight UTC and links still work |
| **A code always leads to approval, even in "anyone with the link" mode** | Guessing right only lets you ask. It reveals the group's name and who runs it, nothing else |
| Open-mode strangers cannot use lookups | Someone who came in through a public link cannot guess codes, and renewing their keys does not change that |
| Reset link also replaces the code | One button ends both |

A relay operator can brute-force a code offline and read that card, so the card under a code is only as private
as the code. It can also forge what a code shows, group id included, because no link anchors it: **a code cannot prove
it leads to the right group**, and the Join dialog says so and shows the owner's check pictures to compare. Once
someone is let in, the same checks as for a link apply.

### Joining modes

- **I approve each person (default).** A link holder can read the card and ask. They get nothing else: no relay
  membership, mailbox, members list or key. This is the 2.20.0 rule for invites, made stricter: there is not even a
  limited grant before approval. An admin sees the asker's name, picture and check pictures, then presses Let in.
  The request itself proves it holds the link (a tag inside what only those running the group can open), so a relay
  without the link cannot make up someone asking.
- **Anyone with the link.** Optional expiry and maximum uses. Joining is immediate, the key arrives sealed under
  the link's secret, and the relay's grant is the smallest one we have (no friend-code lookups, no groups of their
  own, 1,000 rows a day). The key under the link is signed by someone who runs the group, and taken only when the signed
  card says the group is open. This mode means *anyone holding the link can read the group*, so it is only as private
  as the link. The screen says so.

### A shared key per group instead of pairwise handshakes

Pairwise sealing costs O(n) writes per message and O(n²) handshakes to start, which does not fit 100 people on a
free tier. So each group has one AES-256-GCM key per *epoch*, and a new epoch starts whenever someone leaves.

- **Rotation:** an admin's app makes a new key and wraps it to each remaining member's X25519 identity key (one
  ephemeral key per batch, HKDF per recipient). It is one stored row, not one row per member. The batch header is
  Ed25519-signed by that admin. Apps take a wrap only from someone the signed document names now, and never go back to
  an older one, so neither a removed admin nor a relay can hand out a fake new key or put an old one back.
- **Messages:** sealed with the group key and signed with the sender's Ed25519 key. Without that signature any
  member could impersonate any other. The channel (announcement or note) is signed too.
- **Who is who:** a signed authority document names the owner and admins, by both their keys, and each change is signed
  by the current owner and names the whole document before it by a hash. A joiner starts at the first document, the
  one the group id is a hash of, so a relay claiming "Bob is an admin" achieves nothing. The relay's labels are
  never acted on: the owner's app signs by itself only a key renewal that both keys signed, and only ever signs someone
  out on its own (someone who runs the group and is no longer on the list).
- **A fake member:** every roster row carries a signed proof: an admin's signature, or (open mode, by the signed card,
  and only for the current link) an HMAC under the link's key. It binds both of the person's keys. Rows are checked when they arrive,
  and again before anything is sealed to them, against the document as it is now, so a relay cannot slip its own key
  into the next epoch and someone who no longer runs the group vouches for nobody. What runs the group (the link, the join-request key,
  the code) goes only to the exact pair the document names.
- **Removal is two layers.** The relay cuts access at once and closes sockets; the key then rotates. The relay
  itself remembers that a rotation is due, so any admin's app finishes it even if the remover's computer dies.
  The remover's app retries the removal until the relay confirms.
- **Removing someone who runs the group** needs the owner's signed document without them. Whoever they let in gets a new proof
  signed by the owner in the same request, and the link is replaced by itself, because they knew it. An admin who leaves or is
  stopped from helping run it is signed out the same way, and the owner is told they still know the link, and offered a new one.
- **A new link, or going from "anyone" to "I approve",** gets everyone who came in through the old link a signed proof, and the key
  changes: whoever held the old link, or the key through it, reads nothing that comes next.

### What the relay can see (and cannot)

It **cannot** read: group names, descriptions, messages, announcements, profiles, join requests, the link's secret.

It **can** see: group ids, how many people and their identity keys, who is an admin, when things are posted and how
big they are, IP addresses at the moment of a request, and that the same key is in two groups on it. It can withhold or
delay anything, and refuse service. A malicious operator could also serve a landing page that reads the `#` part in
the visitor's browser: in open mode that gives them the key (open mode's privacy is the link's). In approve mode it
gives them the card, and lets them write a request that a person could then let in by mistake, as anyone holding the
link can; it gives them no key and no way in without that person's click. Membership and timing are metadata we accept and document.

**What a dishonest relay cannot do:** read a group in approve mode, make itself or anyone a member or an admin, get a key sealed to it, or
put an older key or an older link back in anyone's app. All of that was tried against the code on the Node relay in a sandbox, with a proxy standing in for a dishonest relay, not on Cloudflare (see Known limits for what remains).

### Friends inside a group

Members see each other's name, picture and status, which come from a per-group profile. So a person can be "Sam
Patel" at work and "Sammy" with friends cheaply, though the key underneath is the same and this is not anonymity.

**Add as friend** is one tap, and the other person still has to accept. It reuses the real handshake (`how: 'group'`),
ending in the same check pictures. **Until someone accepts, the whole handshake stays inside the group** (`/dm`): nobody's
app calls an address anyone named, no drop token is made, and neither side's relay or mailbox is shown. Then each gives the other a
drop token, and the rest runs as normal. A request is taken only from a key on the list that also proves it holds the
group's current key, which a relay's made-up row cannot do. At most 8 requests from one group wait at a time, so one
group cannot fill the 20 places real friend requests wait in.

A friend made through a group **starts with everything off**: they get the name used in that group, no profile, game or
garden, and no direct link (which would show this computer's addresses). Each person turns on what they like, as with any friend.

`Everyone can be friends automatically` is an owner setting, **off by default**. It is shown before joining, with a box
to untick. If it is turned on after someone joined, nothing changes for them until they say yes themselves, on their own
screen (default no); if it is turned off, the next turning on asks again. Tasks, calendar and money are never shared by a
group: friends still get only what per-friend settings allow.

### Together spaces: not wired to whole groups

A Together space (tasks, calendar, garden visits) is not suitable as the group-wide channel: members are written by
the space's owner, capped at 50, fan out over pair messages to *friends only*, and a group of 100 would mean 100
copies per edit. Wiring it would have meant reworking the merge rules of a large, working feature. So a group gets
its own **noticeboard** (announcements plus short notes, E2E). There is no shared list for a group: anyone who wants
one starts a normal Together space with people who are already their friends. A true group-wide board is the next step if people ask.

### Organisations

Name, description, welcome message and a logo. **The logo is one emoji and a colour, not an uploaded picture:** the
project's rule is that nothing from another person ever makes this computer load or decode an image (FRIENDS.md
rule 3), and a logo would be the one exception reaching every member. Announcements are admins only. There is a
searchable directory. A company can run its own relay (Settings > Your relay) or use an existing one if its owner has
let them on. Only the relay's owner and people they let on themselves (with an invite, or by hand) can start groups, never someone who arrived
through a group's link.

**This is not a compliance or records system.** Messages are deleted after 30 days, nothing is archived, an admin
cannot read private friend messages, and a person's own computer keeps whatever it received. The screen says so.

## 2. Costs and limits

Cloudflare Workers Free (checked against Cloudflare's pricing and limits pages, 30 Oct 2026): 100,000 Worker requests a day, 100,000
Durable Object requests a day, 100,000 SQLite rows written and 5 million read, 13,000 GB-s, 5 GB. Incoming WebSocket
messages count 1/20; outgoing are free.

An active person costs roughly 300 Durable Object requests a day (a socket each for their mailbox and groups, one
check every 5-10 minutes, and each check's lookup of who may do what), a computer left on all day up to 1,000.
**So one free relay serves about 100 active people.** It is not a hard wall: the relay rests until midnight UTC, the
app waits and retries, and nothing is lost.

A change makes every online member look, so telling everyone costs as many requests as there are people. In a group of 10 or
more the relay tells everyone at once after a quiet spell, then at most once per window (3 seconds per person, at most 30 minutes):
about 29,000 requests a day at worst, whatever someone posts. So news in a busy, big group can arrive up to that much later. The list
of people is read once per change, not once per person.

| What | Limit |
|---|---|
| People in a group | 500 (warning at 100: "a group this size may need Cloudflare's paid plan") |
| Groups | 8 per person, 50 per relay |
| People a relay lets in through groups | 1,000 |
| Storage per group | 32 MiB, oldest notes go first; 2,000 posts, 30 days. Requests waiting: 2 MiB of that at most, and they go with whoever they were for |
| Post | 16 KiB; 30 a minute and 300 a day per person; 5,000 a day per group |
| Profile, card, join request, direct request | 6 / 8 / 6 / 8 KiB |
| People waiting | 100 per group |
| Wrong link or code | 5 per address per hour per group; valid joins 60 per address per hour, so an office behind one address works |
| Rows a day | Let in by an admin 3,000; open link 1,000; a new key keeps the day's count and the kind of grant |
| Direct requests | 50 a day per person (stored, so a new key does not reset it); 20 waiting per person; never to yourself |
| Key renewals | 3 a day per person; 20 a day per group |
| New codes | 20 a day per group |

Workers Paid is US$5 a month and includes 1 million Durable Object requests (then $0.15 per million) and 10 million
Worker requests. 300 active people is about 2.7 million Durable Object requests a month: roughly $5.25 a month.
**All costs are the relay owner's.** Nothing upgrades or pays by itself; the owner gets a warning, never a bill from
Freeflo.

## 3. Compatibility

- A relay from before this answers 404 to `/v1/rg/...` and has no `groups` field in `/v1/me` or `/v1/health`. The app detects it and
  says, in plain words: update your relay (owner, with the button) or ask the person who runs it (member). The owner
  must press **Update my relay** once after installing this version.
- **Nothing a relay says deletes keys at once.** Told a group is gone or that I was removed, the app asks again, checks the relay runs groups at all, and
  shows it on the page. The keys stay, and it looks again now and then: if the relay answers, everything is as it was. After 30 days and several
  looks, this computer forgets them. "Remove from my list" forgets at once. An owner told they were removed does not believe it.
- Older apps never see a group. On a relay with groups they keep working as before. An older app pasting a group link
  gets its normal "isn't an invite" message, and the relay's `/g` page tells them to update Freeflo.
- `how: 'group'` friend requests go only to members, who by definition have this version. A person with an older app
  on a second computer: that computer's schema drops the request and the other computer handles it.
- `friends/groups.json` syncs under end-to-end encrypted sync only, like every friends file; `friends/groups-local.json`
  stays on each computer. A person's computers share the identity, so any of them can act.
- Key renewal ("Lock out a lost computer"): the app moves its membership to the new key with a request signed by the
  old key and the new key, and the group's key rotates. An admin's new key is signed in by the owner's app when it next looks, on those two signatures.

## 4. Known limits

- Leaving is enforced by the relay and by rotation, but a removed person keeps what their computer already received.
  The UI says so.
- Blocking is per key. Someone can make a new identity, so a person with a link in open mode can return under a new
  name unless the link is reset. The owner's page says this after a removal and offers a new link.
- The owner must be reachable for role changes. If an owner disappears, only the relay's owner can delete the group.
  Transfer ownership first if you can. Someone who ran the group and left stays in the signed document until the owner's app next runs.
- A rotating admin must be online. Until one is, members keep the old key, and only a removed member working with a
  dishonest relay could read the messages sent meanwhile.
- **A relay can show someone an old picture.** It can hold back a change of who runs the group from one person's app. So someone who was removed, working
  with the relay, can still reach people the relay has cut off from that change: those people would still take a key from them. It cannot do this to anyone who has
  seen the change, and it does not get the relay anything by itself. A newcomer is checked against the card under the link, which names the document it was signed under, and removing
  someone who runs the group replaces the link, so a newcomer is safe from this too. Nothing short of a shared log could close it entirely. An owner who signs two different next documents can do the same.
- **A newcomer's key opens more than the relay shows them.** "A newcomer sees announcements, not older notes" is enforced by the relay. Their app gets
  the current key and up to 4 older ones, for older announcements and names, and those keys also open notes sealed under them.
  A dishonest relay could show them notes from before they joined, back that far.
- **Check pictures are 66 bits** (11 of 64 pictures), too many to match by trying keys. They only help if people compare all of them.
- Anonymous link holders can fill the 100 places in the queue for up to 30 days. A new link clears it.
- Someone on a member's list who came in by a link newer than the one that member holds can't be checked by that member: they are shown, but count for
  nothing there (the people running the group can check them, and do before sealing anything).
- The counts of wrong links, of joins per address, and of posts and profiles per person live in the group's object's memory (refused before anything is stored). When
  Cloudflare evicts an idle object those counts restart; the 20-a-minute anonymous limit and the row budgets still hold, and a link's secret cannot be guessed in any
  case. Codes, direct requests, key renewals, new codes and the group's posts per day are counted in stored rows, so they are not affected.
- Reading a link uses a key made for that one look, so a preview tells the relay nothing about who is looking. Asking to join does.
