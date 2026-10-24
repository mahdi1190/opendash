# Friends: a plain guide

Friends (OpenDash 2.17) lets you add people who also use OpenDash, cheer each
other on, see each other's levels and streaks, and do things together. This
guide explains, without jargon, what friends can see, how messages travel,
how to remove someone, and what OpenDash cannot promise.

The technical design is in [docs/dev/FRIENDS.md](dev/FRIENDS.md) and
[docs/dev/RELAY_PROTOCOL.md](dev/RELAY_PROTOCOL.md). Exactly which fields each
sharing level sends is in [PRIVACY.md](PRIVACY.md#friends).

- [Getting started](#getting-started)
- [Your relay](#your-relay)
- [Adding a friend](#adding-a-friend)
- [What friends can see](#what-friends-can-see)
- [Privacy: what travels, and who can see it](#privacy-what-travels-and-who-can-see-it)
- [Removing or blocking someone](#removing-or-blocking-someone)
- [What cannot be forced](#what-cannot-be-forced)
- [Questions](#questions)

## Getting started

Click your avatar in the sidebar's top-left corner (until you have a
profile it shows your workspace icon) and choose **Open Friends**. The
same menu has *Set status*, *Add a friend*, *What my friends can see*, *Your
relay* and *Sync*; a green dot on your avatar means a friend is around, and
a number means someone is waiting for you. (Want Friends in the sidebar as
well? *Customise sidebar*, Home > Friends.)

Until you have a friend, a short welcome walks you through three steps,
with a progress bar:

1. **Make your character.** Opens the character builder (Settings >
   Profile). Friends see your character next to your name. If you like the
   starting one, choose *It looks fine as it is*.
2. **Get a relay.** Choose *Set up my relay* (free, about 2 minutes) or
   *Paste a friend's invite* to use a friend's relay. See
   [Your relay](#your-relay).
3. **Invite a friend.** *Make an invite link*, then *Copy link* or *Copy a
   ready message* (a short note that tells them what to do with it).

You can close the welcome at any time (with Undo). To bring it back, press
Ctrl+K and choose **Friends: getting started**. **How friends work** (also in
Ctrl+K, and a button on the welcome) is a one-page summary of this guide.

## Your relay

Friends' messages travel through a small **relay**: a tiny private service
that passes sealed messages along and holds them until the other person's
computer picks them up. It lets a friend's message reach you even when your
computer is off.

- **Your own relay** runs on **your own Cloudflare account**, on Cloudflare's
  free plan. Only you, your devices and the people you invite can use it.
- **A friend's relay**: if a friend has one, their invite can let you use it
  too. Then you don't need your own.

The relay only ever holds **sealed (end-to-end encrypted) messages**. It
cannot read them, and it never learns names or what you send.

### Set up my relay, step by step

Settings > **Your relay** > **Set up my relay** (or step 2 of the
welcome). It takes about two minutes. You will see each step tick off:

1. **Get Cloudflare's tool.** OpenDash uses Cloudflare's own tool,
   *wrangler*. The first time, it is downloaded ("Downloading Cloudflare's
   tool (first time only)…"); later it starts in seconds. It needs Node.js 20
   or newer, which OpenDash already uses.
2. **Sign in to Cloudflare.** A Cloudflare page opens in your browser:
   **click Allow**. No account yet? Create a free one on that page first. If
   no page opened, the step shows a link to open it. OpenDash never sees your
   Cloudflare password or sign-in: they stay with Cloudflare's tool.
3. **Put your relay on Cloudflare.** Your relay is uploaded under a name like
   `opendash-relay-k3x9q2`.
4. **Check that it answers.** A brand-new address can take up to a minute
   to work everywhere; OpenDash keeps trying for about a minute.
5. **Use it on all your devices.** The relay's address is saved and travels
   (encrypted) to your other computers.

**Cancel** stops it at any step, at once, and changes nothing on your devices.
**Try again** starts again straight away.

When it is done you will see **You're connected!** with two next steps:
**Invite a friend**, and **Sync all your devices through it** (your own
devices then sync through the relay within a second, without needing a shared
folder; your other computers switch to it by themselves as soon as they have
its key, and your folder keeps a backup copy; Settings > Sync).

**Update my relay** (Your relay > Advanced, when you already have one) puts the newest relay code on
Cloudflare under the **same address**. Your members, invites and devices are
kept.

### If something goes wrong

Every problem says what happened in one line and what to do next. The common
ones:

| You see | What to do |
|---|---|
| Node.js was not found, or is too old | Install Node.js 20 or newer (the LTS version) from nodejs.org, restart OpenDash, then *Try again*. |
| The Cloudflare sign-in was cancelled / was not answered in time | *Try again*, then click **Allow** on the Cloudflare page (within two minutes). |
| Another Cloudflare sign-in is still waiting | Close other Cloudflare sign-in pages, or wait two minutes, then *Try again*. |
| No workers.dev subdomain yet | Open dash.cloudflare.com > **Workers & Pages** (the page has a link). It asks you to choose a workers.dev subdomain: pick any free name, then *Try again*. |
| Your sign-in has more than one account | Pick the account for your relay from the list (or paste its Account ID). |
| Cloudflare refused the relay's storage setup (Durable Objects) | *Try again*. If it fails again, *Use a new address* (friends on your relay then need a new invite). |
| Your relay is on another Cloudflare account | This computer is signed in to a different account than your relay's. *Sign in with another account*, or *Use the new relay instead*. Until you choose, your devices keep using the old relay. |
| It is on Cloudflare but does not answer yet | Wait a minute, then *Check again* (nothing is uploaded again). |
| This computer's clock is too far off | Turn on *Set the time automatically* (Windows: Settings > Time & language > Date & time), then *Check again*. |
| Cloudflare could not be reached / a network filter blocked it | Check the internet connection. On a work or school network, try another one (a phone hotspot works). |

If it still fails, the relay can be deployed by hand:
[RELAY_PROTOCOL.md section 9](dev/RELAY_PROTOCOL.md#9-deploying).

### Using a friend's relay

Paste their invite in **Friends > Add a friend > Paste an invite** (this also
adds them as a friend), or in Settings > Your relay > *Use a friend's relay
instead* (relay only). Their invite says what it allows: messaging you only,
or also syncing your own devices through their relay.

### Who can use your relay

Settings > Your relay > **Who can use it** lists:

- **Your devices**, with when each was last seen. *Remove* takes one away,
  with a few seconds to Undo.
- **People you invited**, by the name you know them by (from your friends
  list; anyone else shows as "Member" and a short id), what they may do
  (*Can message you*, or also *sync their devices*), and how much of their
  storage they use. *Revoke* takes their access away at once, with Undo; a
  revoked member can still be restored for 7 days, then their data on the
  relay is deleted.
- **Pending invites**, with when each one ends, and *Cancel invite*. An
  invite works once and ends by itself.

### The free allowance

Cloudflare's free plan allows, per day: 100,000 requests, 100,000 stored
changes, and 5 GB of storage in all. A few devices and friends use a small
part of that. The **Usage** card shows today's use as bars. If a limit is
reached, the relay rests until midnight UTC: your devices keep syncing over
your own network and your sync folder, and messages wait and are sent later.
Nothing is ever upgraded or paid for automatically.

### Disconnecting

**Stop using this relay** (Your relay > Advanced) stops all your devices using it at once (Undo for a
minute): they no longer fetch friends' messages from it, and device sync stops
going through it (your network and sync folder keep working). The relay itself
keeps running in your Cloudflare account, with its members, until you delete
it there (dash.cloudflare.com > Workers & Pages), so people you invited can
still use it until then; revoke them first if you want them off. Connecting
again from the same computer and Cloudflare account uses the same relay
again.

## Adding a friend

**Friends > Add a friend** has three ways:

- **Invite link.** Works for anyone. It works **once** and ends by itself (1,
  7 or 30 days). If it is your own relay, you can let them use it for friends,
  and also for syncing their own devices.
- **Friend code**, like `ALEX-7K2QX9`. Only between people on the same relay.
  *New code* makes a new one; the old one stops working at once.
- **Paste an invite** that a friend sent you.

Before you are friends, you both see the same **6-digit code**. Check that it
matches (in person, on a call or in a message), then the person who sent the
invite approves. A forwarded or stolen link alone is not enough: the code
would not match. If the codes differ, choose *The codes are different*.

## What friends can see

**Nothing private until you say so.** A new friend sees only:

- your **profile**: your name, your character, and the bio, emoji, colour,
  pronouns and city you chose to fill in;
- your **game progress**: level, title, XP, streaks, quests and focus minutes.

Everything else (tasks, calendar, money, places, memories and journal,
whether you are online) starts **off**, for every friend. On a friend's page,
*What Sam can see* lets you turn things on for that one friend, and only after
you mark them a **Trusted friend**. Each can be on for a while only (until a
day, during a trip). *Preview what Sam sees* shows exactly what would go to
them, and *Stop sharing with Sam* (or *Stop sharing everything* in Settings >
Privacy) stops it at once.

**Presence** ("here now", focusing, travelling, away) is off until you turn on
*Show friends when I'm around* in the Friends tab; it never says where you are
or what you are doing.

The full list of fields each level sends is in
[PRIVACY.md](PRIVACY.md#friends).

## Privacy: what travels, and who can see it

- **End-to-end encrypted.** Everything between you and a friend is sealed on
  your computer and opened only on theirs. The relay passes along sealed
  messages it cannot open.
- **What a relay can still see**: that someone sent something, when, and how
  big; which devices and members use it, and their internet addresses; how
  many people write to you. Never names, never what you send. Your own relay
  logs nothing and Cloudflare's logging is turned off. If you use a **friend's**
  relay, your friend runs it: they can't read your messages either, but in
  principle they could see this kind of timing.
- **Directly, when you can.** When you and a friend are both online on the
  same network (or over IPv6), messages go straight between your computers
  (*Connect directly when we're both online*). Your router is never opened for
  this.
- **Never shared**: your sign-ins and keys, email addresses, Claude, your
  connectors and accounts. Your private key never leaves your devices except
  inside your own encrypted device pairing.
- **Nothing from a friend reaches Claude**, the assistant, MCP tools or any
  automatic action, and nothing a friend sends changes your tasks unless you
  click. Friends' text is shown as plain text, and OpenDash never loads a
  picture or a link a friend sent.

## Removing or blocking someone

On their page: **Remove friend** or **Block** (both with Undo for a few
seconds).

- They can no longer message you, and their access to your relay ends.
- Your copy of what they shared with you is deleted.
- Their app is asked to delete what you shared with them.
- **Block** also stops them sending you new requests.

To only stop sharing (and stay friends), use *Stop sharing with Sam* instead.

## What cannot be forced

OpenDash is honest about its limits:

- **Deleting on their device is a request.** Their app carries it out; a
  normal OpenDash does, but it cannot be forced, and nobody can stop a
  screenshot. Only share what you are happy for them to have seen.
- **A relay's owner controls their own Cloudflare account.** They can't read
  your messages, but they decide whether the relay keeps running.
- **A lost or stolen device that still has your keys** could keep acting as
  you in Friends. Remove it from Sync and from Settings > Your relay, then
  choose **Renew my keys** (offered right after you remove a device): your
  friends move to your new keys and the old ones stop working.
- **Someone you approve** sees what you chose to share with them. The 6-digit
  code makes sure the person you approve is the person you meant.

## Questions

**Do I need a Cloudflare account?** Only for your own relay (free). With a
friend's invite that includes their relay, you don't.

**Does Friends cost anything?** No. The relay runs on Cloudflare's free plan,
and OpenDash never upgrades it.

**Can a stranger use my relay?** No. Every request must be signed by you, one
of your devices, or someone you invited.

**I have several computers. Do I set up my relay on each?** No. Set it up
once; the relay is saved for all your devices (through your encrypted sync).
Any of them can *Update my relay* later.

**Can I move my relay to another Cloudflare account?** Yes: *Sign in with
another account* when it asks, or disconnect and connect again. Friends on the
old relay then need a new invite.

**I closed the welcome. How do I get it back?** Ctrl+K, then *Friends: getting
started*.
