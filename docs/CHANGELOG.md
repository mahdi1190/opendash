# Changelog

All notable changes to Freeflo (called OpenDash before 2.23) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and Freeflo follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
For Freeflo, a **major** version may need a data-folder upgrade that older
versions cannot read; the launcher always backs the data folder up before it
upgrades it.

## [Unreleased]

## [2.31.0]

Putting money in is easier, and many tax figures are corrected.

### Added
- **Easier money entry.** Type amounts the way you know them: £1,250.50, 1250 or 3k, by the month or the year. Forms point out mistakes next to the box, such as dates the wrong way round or figures in the wrong place, and show what a change will do to your tax bill before you save.
- Anything you type is kept if you close a form by accident, and Cancel has Undo. A new Tax tab starts with one simple question, and you can type a payslip's figures in directly.

### Changed
- Jobs and bills that stop now say so, along with what you will have left afterwards, so they no longer look like an ongoing salary.

### Fixed
- Pay so far from a payslip no longer counts a month twice.
- Starting a new job after leaving one now works out the tax-free amount and tax correctly.
- If your job ended part-way through the year, you now see the tax coming back to you.
- Capital Gains Tax and the Child Benefit charge now show in "still to pay".
- Payments on account are no longer kept aside twice, and next January's bill now allows for them.
- Marriage Allowance only applies if you pay the basic rate.
- A mistyped tax code no longer means no tax.
- Last year's payslip no longer affects this year, and costs across two tax years count once.
- New notes explain a trading loss, rent costs and pay after your P45.

## [2.30.2]

### Changed
- **Tax, a job's form is simpler.** You can type pay by the month or the year, and Freeflo works out the yearly figure for you. When a job ends with exact last payments, the yearly pay and "Paid every" boxes go away, and the last payments sit straight under the end date. Pay from an earlier job and bonuses are folded under Less common until you need them.

## [2.30.1]

### Fixed
- **Owed to me: a payment you marked by hand no longer comes back as a question.** If you marked someone paid and the bank then showed their money, Freeflo took it for a second payment and asked who else it was for. It now knows it is the same payment, joins the two up, and takes it off your spending like any other money paid back.
- **Two people the bank can't tell apart.** "M Hart" with both a Max and a Mia Hart owing the same now asks which one it was, and doesn't guess or learn that wording for either.

### Changed
- When someone really has paid a second time, the question says so: "Sam has already paid their part, and another £10.00 arrived…".

## [2.30.0]

Contests, trading and shared goals for playing together in a live garden.

### Added
- Live play: contests. With a friend in your garden, tap the trophy beside the gate and start a fishing or bug-netting round of 2, 3 or 5 minutes. Everyone in the garden competes: a live board shows the countdown and everyone's points, and at the end the winner is named, cheers and gets a sparkle.
- Points come from the size and quality of a fish, or the rarity of a bug. In a round casts are free and use no bait, and what is caught is let go, so a contest costs nothing and cannot be farmed. A bug round shows a fresh bug every few seconds so there is always one to race for.
- A small reward for playing (5 coins and 2 XP) and for winning (20 coins and 10 XP), at most 40 coins a day from contests. You can start 4 contests a day, and not on your own.
- Live play: trading. Open a person's menu in a live garden and press Trade: you each offer up to four things from your bag (seeds, decorations, fish, bugs), you both see both offers side by side, and the swap happens only when you have BOTH confirmed the same terms. Change an offer and the confirmations clear; take yours back or cancel any time before. A line in the corner says it is done.
- Trading works between the host and a guest and between two guests. The host's computer is the referee, and guests never learn each other's friend ids.
- Your things go on hold when you confirm, so they cannot be spent twice, and come back if the trade is called off. If someone's computer drops between the two confirmations nothing is lost or doubled: the host's decision is posted as well as sent, and a computer that missed it asks when it is back.

- **Live play: shared goals.** While friends are in your garden there is one small goal at a time that you all work on together: catch 6 fish, water 12 plants, net 5 bugs. A card under the menu shows a progress bar and what each of you did, the corner line says when it starts, is half done and is reached, and each person who took part gets a small thank-you of their own (6 coins, 4 XP and a little bait or fertiliser, at most 3 goals a day). It only counts what the host's computer applied or confirmed, nobody's part can be more than 60% of it so it takes two of you, and a goal that no longer fits (rain, nobody who can water) is let go. Turn them off in Your gate (Suggest shared goals while friends are here); skip one with the card's x.

### Security
- The host referees. Only the host can start or end a contest, send the board or name a winner (both computers refuse a guest's); a guest's catch counts only when the host can match it to the steps of a line it saw. Older apps ignore contest messages. No relay update is needed.
- Trades are checked like the rest of live play: a strict message shape in the shared rules file, only kinds that can be given as gifts (never coins), four things and twenty of each at most, ten trades a day, both people at Play. Older apps ignore the new messages and a request to one just times out. No relay update is needed.
- The new `gl:goal` message goes from the host to its guests only, with a strict schema checked at both ends; a guest cannot send one, and an older app ignores it. No relay update is needed.

## [2.29.0]

Cheers and photos you can see, a fire to gather round, listening along, and room to move on the shore.

### Added
- **Live play: moments.** When someone in the same live garden reaches a new garden level, unlocks an achievement or takes a photo with the camera, their figure cheers (or the camera flashes, with a new shutter sound) and one line in the corner says what: "Sam reached garden level 5", "Sam unlocked “A hundred done”", "Sam took a photo". Only the level, the achievement's id (your app shows its own name for it) or "a photo was taken" is sent, never the picture. Achievements are only the kinds your profile's automatic showcase may show (never money, places, health or memories ones). Older apps ignore it.
- **Live play: gathered by the fire.** When two or more of you stand near the same fire pit, marshmallows float up from it now and then and the corner says who is there. Nothing is sent: each screen works it out from where people stand.
- **Listen along.** In a friend's live garden, when they share what they are listening to (Profile > Music) and you have Spotify linked, a small *Listen along* chip sits by the tag with their song, and one click plays it on your own Spotify. It uses the same careful, rarely-asked "Listening to" check as a friend's card: nothing is broadcast.

### Changed
- **The shore has room to move.** The market stall is one step further along the lane, the notice board one step the other way, and the field journal now stands beside the post box, so there is a gap between every pair of big buildings (the stall, the bench, the shop, the board and the tackle shop). The small things on the shore (the journal, the camera, the post box, the sundial) are small boxes at their base instead of a whole square, so you slip past them. The mooring post, the reeds and the boat no longer block the lane at all; the water under the boat is still water.
- A step toward a small box now goes further round it before the walk gives up, and a route planned through the middle of a cell that has a small box in it is planned again round the box.

### Fixed
- You could not walk past a small box or a post on the shore: a click on a door could leave you standing just short of it. Every door on the shore can now be reached from anywhere along it.

## [2.28.1]

### Added
- Live play: one living garden. The host's birds, insects and animals are the same ones on everyone's screen. Say hello to one and it answers for all of you.
- Pets notice the creatures, creep up on them, and greet each other, for everyone to see.
- Surprises (easter eggs) the host's garden finds are seen by everyone there.
- Something lying about (a creature's gift, a fish flopping on the shore) goes to whoever clicks first. The host decides, so it can only be taken once.
- A bug is caught only once: if Sam's net got it first, yours is a clean miss with no reward.
- Someone creeping up on a bug now walks slowly and ducks a little on every screen.

### Security
- The new live messages are checked like the rest of live play: only the host can spawn, move, give or name a winner; a guest can only poke, claim and say what it is doing. Older apps ignore them. No relay update is needed.

## [2.28.0]

What a friend is listening to, Play that finds your Spotify, and a kinder, calmer garden to play together in.

### Added
- **Live play: their sky.** When you visit a garden you see the light the owner has now (dawn, day, dusk or night by their clock, with their sunrise and sunset when they have the weather), and their rain or snow. Their time zone's offset, sunrise, sunset and weather travel in the garden snapshot, so a friend can tell roughly where in the world you are.
- **Live play: the host can talk.** The Say button now shows for the owner while someone is in the garden, with the same phrases a visitor has.
- **Live play: a change of clothes or of pet shows at once** while you are together, for the host and for visitors, not at the next visit.
- **Calm.** When the window has not had the focus for 8 seconds, or nobody has touched it for 90 seconds and nobody is in the garden with you, the garden's ambient motion rests in place and its loops look in only a few times a second. Anything you do wakes it. An open idle garden went from about 40% of a core to under 3% in a measured run; leaving the garden already stopped it. A host with nobody else in the garden also reads the levels file every 15 seconds instead of every 3.
- **Your own card shows what friends would see.** With Show what I'm listening to on, your own Profile card shows your Listening to line, and a *Check what friends see* button tells you what a friend would be told.
- **Listening to.** Turn on *Show what I'm listening to* (Profile > Music) and a friend who opens your card sees the song you are playing, like a status line, with a small progress bar. It is asked for, never broadcast: opening your card sends your Freeflo one small question, it answers only while a song is playing, and nothing is sent when nobody looks. Never a podcast, a local file or a Spotify private session. It is off until you turn it on, only friends who can see your card get an answer, and Stop sharing stops it. Your friends' Freeflo asks at most once every few minutes, only while your card is on screen.
- **Check where it can play** (Connections > Spotify > Set up) lists the Spotify apps Spotify can see, so you can tell whether an open app is visible to Freeflo.
- **Let friends use your Spotify app (up to 4).** The set-up now has your Client ID ready to copy and says what to do: a friend pastes it instead of making an app, and you add them under User management in the Spotify dashboard. Spotify allows 5 people per app in Development Mode (you and 4 more), and only organisations with a large audience can lift that.

### Changed
- **Collisions in the garden, rethought.** Three sizes: flat things (a picnic blanket) and things you walk under or that hang (an arch, a pergola, string lights, bunting) are walk-through; small decorations (a lantern, a bird bath, a gnome, a pump) are a small box at their base, so you slip past instead of meeting a wall the size of a cell; walls, fences, hedges, seats, a fountain and a shed stay full. Trees block their trunk only; the leaves are for walking behind. A catalogue row can say `col: 'none' | 'soft' | 'full'` for itself.

### Fixed
- **A speech bubble no longer vanishes** a moment after it appears. It was kept inside the figure, which is made again whenever the garden is painted (every change the host's page applies), so a visitor's bubble often disappeared on the host's screen at once. It now belongs to the person and comes back with the figure until its 3.6 seconds are up.
- **Play and Queue when your Spotify app is open but idle.** Spotify only treats an app as "active" once it has played something, so Play said "Open Spotify first" although it was open. Freeflo now looks at the devices Spotify can see, names one (the active one, else a computer or phone) and wakes it if it has to. If nothing is playing, Queue starts the song instead, and the message says which app it played on. A refused player command is now told apart from a refused account.

## [2.27.9]

### Added
- Live play: you see your friend's pet follow them, in its real look, and do what it does (tricks, spectacles, pats, treats, naps). Their roaming pets show too.
- Live play: you see a friend fish (the rod, the line, the bobber, the bite, the reel) and swing a net, and hear the splash if sounds are on.
- When anyone catches a fish or a bug, or finds or makes something, they turn to face you and hold it up over their head with a small banner ("Sam caught a bream!"). Off screen it is one short line in a corner. Fun Off skips it.
- A bug a friend nets is gone from your screen too.

### Fixed
- A friend's pet never showed up in live play.

## [2.27.8]

### Changed
- No daily limits on people you have approved: messages, storage up to 1 GB each, mailboxes and live play. Press Update my relay (Settings > Your relay) to apply this.
- What stays: Cloudflare's own free-plan limits, protection against floods, message size limits, a small allowance for anyone not yet approved, and a whole-relay stop for live play at 60% of the free day so your sync keeps working.

### Fixed
- Re-adding a friend no longer fails with "Today's share of that relay is used up".

## [2.27.7]

### Fixed
- Friends could stop responding: Make an invite link and other buttons did nothing, because one job was waiting forever behind itself. Jobs can no longer block each other for good, and a request that takes too long now says so.

## [2.27.6]

Change any answer, and see what each tax figure comes from.

### Added
- **Your answers.** A button on Budgets and on the Tax tab lists every answer you gave, in plain words ("Registered blind: No"). Tap a line to change just that one, right there. It saves at once, Undo is on the message, and the figures above follow. It is made from the same questions as the first walk-through, so every country gets it.
- **What feeds a number.** Every Tax figure that comes from something you told Freeflo has a plain Change button: the tax-free amount opens how it is made up (the standard amount, high-income reduction, Blind Person's Allowance, Marriage Allowance, work benefits), each piece changeable. Figures the tax sums produce (tax due, the bands, National Insurance, student loan) say "Worked out from these" and list what they come from.
- **Use my actual figure.** Type the tax-free amount HMRC gave you (a coding notice), with a note. Freeflo uses it for that tax year, says it is your figure, and one click goes back to worked out.
- **Jobs in plain words.** Pay so far this tax year (from your latest payslip), pay before this job (a P45), tax code, first and last day, "This job has ended", exact amounts on dates (one or more last payments, or pay that differs each time), and a bonus on a date. Each job shows its own line, such as "£4,000 so far + £2,500 on 30 Nov = £6,500 this year".
- **Check this.** A calm note, with one tap to put it right or "That is right", when Blind Person's Allowance is on, your tax code and tax-free amount disagree, a job has no pay, two jobs share a name, or pay figures look copied from another job.
- **Pension.** Say whether the percentage is of all your pay or of qualifying earnings (£6,240 to £50,270), and when it starts.
- **Budgets.** Tap any amount or date on a plan line to change it there.
- **The assistant** can set region, student loans, pension and your own tax-free amount with `tax_change` (`answers.set`), and a job's exact payments to come.

### Changed
- **A normal month, not a year average.** What you take home a month is now each job's next ordinary payslips, so a job that started part way through the year, or has ended, no longer drags it down. Each job shows "Your next payslip: about £X on 30 Nov". What is left in your plan and safe to spend use it.

## [2.27.5]

A friend's garden is now the same world as your own.

### Changed
- **Visiting a friend is like being in your own garden.** You walk with a click, the keys or by holding the button, go through what is planted, zoom, and use the same hotbar, bag, bubbles and minimap. Your own coins, seeds, basket, shop and crafting come with you. The sidebar stays. One small tag says whose garden it is, and the house in it takes you home. The guestbook, hearts and reactions are in the menu.
- **When they are there, anything your level allows works as it does at home.** It shows straight away, slightly faded until their computer agrees, and goes back if it says no. What your level does not allow flashes red with a padlock, and one tap asks them for more.

### Added
- **Help while they are away.** If a friend gave you Help or Play, what you plant, place or water while they are out can wait for them. It comes out of your bag and shows a little clock. When they next open their garden it happens, and their diary says "While you were away, Taylor planted 3 carrots". Anything that is no longer possible comes back to your bag, once, and you are told. Your friend can turn this off at their gate.
- Visitors can fertilise with their own fertiliser, and turn what they placed.

### Compatibility
- Live play needs both people on this version or later. With an older friend, either way round, the visit is their garden as they last shared it. No relay update is needed.
## [2.27.4]

### Fixed
- The tax-free amount says what it includes, such as Blind Person's Allowance, with a link to change your answers.
- The assistant can now change the answers behind your tax figures when you tell it one is wrong.

## [2.27.3]

Pending payments count, and you can split them.

### Changed
- Pending payments now count as normal spending and money in, everywhere: totals, this month, budgets, safe to spend, the brief and the story, Home, your money plan and what Claude reads. They use your categories and rules, show their logo, and sit in Transactions on their date with a small Pending tag. The separate block at the top of Transactions has gone. This works for banks connected directly (Monzo and Enable Banking).
- Settings > Money has Count pending payments, on by default. Off, they are listed but count only once they settle.

### Added
- Don't count: a quick action on a pending payment, with Undo. It is remembered on your other computers and when the payment settles.
- Everything works on a pending payment: split it, mark it as an expense, ask who paid, add a note, pick a category, select several. All of it stays when the payment settles, and each payment is only ever counted once.
- When a pending payment settles at another amount (a tip, a hotel hold, fuel), Freeflo asks in one tap: "Bowling settled at £42, not £40. Update the split?"
- When one disappears without settling (a declined or released hold), it leaves your numbers after five days. If it had a split or an expense, Freeflo says so once and offers to delete it or keep it.
- A pending payment coming in can be suggested for Owed to me too ("We think Sam paid"), and it stays matched when it settles.

## [2.27.2]

### Added
- Transactions shows pending payments at the top, labelled and not counted in your totals. They go once the bank settles them. This works for banks connected directly (Monzo and Enable Banking).

## [2.27.1]

### Fixed
- You can walk through what you plant, so a full bed no longer walls you off from the plants in the middle. Only grown trees, and decorations and buildings, still stand in the way.

## [2.27.0]

Music: Spotify, and songs for friends.

### Added
- **Spotify (Connections > Spotify).** Link your own Spotify: make a free Spotify app, paste its Client ID and sign in. No password and no client secret pass through Freeflo, and the sign-in stays on this computer. Search songs, albums, playlists and artists (10 at a time, with Show more), or paste a Spotify link to find that one. With nothing typed it offers your own playlists, top artists and top songs.
- **Music on your card (Profile > Music).** Choose a favourite song, album and playlist, and switch on your top five artists from the last 4 weeks, 6 months or all time (read again about once a day). Friends see them on your card, with covers, and a click opens it in Spotify. Nothing shows until you choose it.
- **Send a friend a song.** From a friend's page (Music), the palette (Send a song to a friend) or the Spotify card: find a song, album, playlist or artist, pick one or more friends, add a line. They get a card in the feed with the cover, your line and Open in Spotify, and if they have Spotify linked too, Play and Queue (Premium, with a Spotify app open). A friend does not need Spotify linked to open what you send.
- Cover pictures come through your own Freeflo, by id, and are kept on this computer. They are on while Spotify is linked; for a friend's song without Spotify linked there is a switch ("Show cover art for songs friends send") that is off until you turn it on, and the card shows a plain tile and a working link until then.

### Notes
- Spotify's own rules (February 2026): an app in Development Mode works only while its owner has Premium, for up to 5 people you add under User management, and searches return 10 results a page. Friends who only receive songs need none of this.

### Security
- Only a 22-character Spotify id and plain text cross to a friend, never a link or a picture. The link and the cover request are made on the receiving side from an id that passed a strict check. Every Spotify request goes through one client with fixed hosts, no redirects and a short list of allowed routes; sign-in uses PKCE and the tokens stay in this computer's secret store.

## [2.26.0]

Play together, live, in each other's gardens.

### Added
- A friend knocks and you give them Look, Help or Play with one tap. The garden's owner must have it open: their computer checks everything against the normal game rules. A closed garden stays the saved look-only copy.
- See each other walk, do moves and tricks, with name tags and preset phrases. Wave, high five, follow, sit on one bench, catch a bug together. Up to about 8 people.
- Every action happens live, with "Planted by Taylor" on hover and in a garden diary.
- Everyone spends their own coins and seeds. Crops go to whoever planted them by post, or split or to the owner, as you choose per friend. Decorations can be taken back or given. Drop a gift at someone's feet.
- Undo, Put my garden back and Send home keep your garden safe.

### Security
- An independent review before release found ways to overspend your Cloudflare allowance, duplicate items and disturb a room. All were fixed before this release: rooms have budgets per person and per relay well under the free day, sync always comes first, and removed friends are cut off at once. Rooms pass messages straight through and store nothing.

Press Update my relay (Settings > Your relay) to play over the relay.

## [2.25.1]

The opening plays all the way through.

### Fixed
- The opening no longer stalls. The letters were traced by animating the stroke, which needs the page's main thread every frame, so while the app
  was starting up (about 1.5 s) they froze at a stem and a dot, the orb dropped in beside them, and the word finished in a jump. Each letter is
  now written by stepping through pre-drawn copies with opacity, which keeps running while the app loads, so the whole word is written and the
  orb lands on time.

## [2.25.0]

Groups: one link for everyone.

### Added
- **Friends > Groups.** Start a group for your friends or your organisation: a name, then one link and QR code to share by message, email or poster. Joining shows the group's name and who runs it first.
- You choose "I approve each person" (the default) or "anyone with the link", with an optional expiry and maximum uses. Reset link kills the old one at once. Short codes are off by default, only work for people already on that connection, and can only ask to join.
- A waiting list, an end-to-end encrypted noticeboard with announcements, a searchable list of people, pictures to check someone in person, helpers, handing over ownership, remove (with Undo) and block, and a different name per group.
- Being in a group shares only your name, avatar and status. Add as friend still needs the other person to accept unless they agreed to automatic friends. Tasks, calendar and money are never shared by joining.
- A small page on your relay explains Freeflo to people who follow a link and do not have it yet.

### Security
- An independent review before release found ways a dishonest relay could read a group. All were fixed before this release: the link now anchors the group's identity, and every member, role and key is checked against signatures. What a relay can still see and do is written down in docs/dev/GROUPS.md.

Press Update my relay (Settings > Your relay) to use groups. A free Cloudflare account suits about 100 active people; the app warns you before then.

## [2.24.1]

### Fixed
- The sidebar stays in the garden and in friends' gardens, so the rest of Life is one click away. If you have hidden it, or on a phone, a button at the top brings it back.
- Crafted flower collars (daisy, rose, lavender) drew nothing and could not be worn.
- Icons on the crafting bench stay inside their cards.

## [2.24.0]

The garden, overhauled: a cosy game you play inside the world.

### Play
- The garden fills the window. Tools and seeds sit in a bar with number keys, with a corner display and a menu for Shop, Basket, Crafting, Tricks, Almanac, Nature, Catch, Friends, Goals and Help.
- Click and you walk there along a dotted route. WASD and arrows work too, as does hold to steer. Walk up and the obvious thing happens: pick, water, or a bubble of seeds at an empty bed. Decorations come out of your bag as a ghost on a soft grid.
- "You can't do that" messages are gone: a red flash, a shake, an X, a padlock or a shaking coin counter instead, and the cursor changes with what you point at.
- About 3.8 times the walkable area once all land is open, bought with coins. Existing beds stay where they are.
- Things are drawn by where their feet are, so you walk behind a sunflower. Plants that need you glow, and there is one seasonal quest a week.
- Your gardener is now your own avatar, drawn by the avatar kit, with a walk, gardening poses and front, side and back views.

### Look
- New lawn, beds, pond, lake, sky and pools of light at night. Most plants, trees, visitors, fish, bugs and props redrawn in one storybook style. Wind, ripples, bursts when you harvest.

### Pets
- 62 species, up from 18. 44 are earned by playing: rare visitors with lures, garden milestones, treats, coins, friendship and achievements. Treats come from garden play, up to 4 a day.
- A living pet page, a field-guide collection with silhouettes, toys, beds, hats and colours. Your pet follows you and others roam.

### Crafting and tricks
- A crafting bench with 40 recipes for you, your pets and the garden.
- 82 tricks in a trick book with five rarities, with a live preview before you buy. 16 spectacles, 11 of them legendary or mythical, and 4 secret ones.
- 12 moves for your gardener on an emote wheel (Q).

### The living garden
- 26 creatures that land on what you placed, walk round things and react when clicked, kept few so they stay special: usually 2 to 4 around, 6 at most.
- 17 easter eggs, at most one a visit and none on about half of them. A Nature book with silhouettes and a small reward per discovery.

### Fixed
- Fish and bug gifts between friends were refused, and the showcase was lost.
- App cards no longer open over the garden.

## [2.23.3]

Owed to me, round two.

### Added
- Repeating splits: rent or a bill splits with the people you named each time it leaves your bank, from the money plan, a regular payment or a split, with dates per person, nudges and Undo.
- Reminders can carry a pay-me link (https only).
- Send a friend on Freeflo their own part only, and they can tap "I've paid". They never see anyone else's share, the original payment or your bank data, and you only send it when you press the button.
- Foreign-currency splits show both amounts.
- Receipts: read a photo or PDF (only when you press the button, and you confirm it), or type the items in, then tap who had what.
- Money back this month, "make a group?", "you've paid the last 5 times", "paid back faster than usual", and a settle-up picture for trips.

## [2.23.2]

Money comes to life.

### Added
- Logos or little pictures on every payment: about 2,400 shops and services, with 262 company logos bundled in the app. Nothing is downloaded while you use it, so nobody learns where you shop. "Show company logos" is in Settings > Money look, and you can pick your own picture for a shop; it stays on that computer.
- Family and friends show their face, and salary, refunds, cash, fees and interest each look different. Direct Debits, subscriptions and payments abroad get a small corner badge.
- Small animations on hover: the train crosses, the coffee steams.
- Story scenes for your spending: a tube train with your total on its side, a scooter, a trolley, payday. "Your year in money" from the command search, the end of the money story or at New Year.
- A payday note, jars for your categories, a sky that follows your month and a little receipt when new payments arrive, plus a few kind easter eggs. The Fun setting dials all of it down.

### Changed
- Better reading of bank references: shops behind wallets like Curve and Zettle are recognised, so a category you set on an old merged name such as "CRV" stops applying, and more spellings of one shop now merge.
- The money story won't open while amounts are hidden.

Logos are trademarks of their owners, used only to identify who a payment went to; no endorsement implied.

## [2.23.1]

Your money plan and your tax year.

### Added
- **Your money plan**, on the Budgets tab. A questionnaire you can leave and come back to asks your country first ("Somewhere else" skips UK tax) and "now, later or not at all" for each bill. It works out your take-home by year, month and payslip from 2026/27 figures on gov.uk: tax, NI, student loans, pensions, several jobs and self-employed income.
- Every planned item is matched to your bank, with start and end dates, pause and remove, each with Undo. A "Worth a look" list flags short pay, dearer bills and missing rent. Also Coming up, a bills calendar, debts with payoff dates, goals, yearly bills and net worth.
- Paydays and bills use real dates, allowing for weekends and UK bank holidays. Your pay cycle and safe to spend follow the plan.
- **What if?**: scenarios and sliders beside today's figures, to combine, save and compare. Nothing changes until "Make this my plan", which has Undo.
- **Tax**, a new tab in Money for UK users. Your tax year line by line, how much to keep aside (it comes out of safe to spend), whether payments on account apply, deadlines as real tasks each year, a March review, "Do I need to file?", a finder for expenses you can claim, and a File my return walkthrough with Copy buttons, a PDF, CSV and receipts pack. Freeflo estimates and prepares; you submit on gov.uk yourself.
- Tell it your situation by pasting text, or give it a payslip PDF. It reads them with Claude only when you press the button, shows everything for you to confirm, and hides your UTR and NI number. A "What Freeflo knows about my money" page, documents by tax year, and job and moving checklists.
- The assistant can explain your tax and plan using your real numbers, make small changes with Undo, and open a What if?. Anything taken from a file, email or pasted text asks you first. It never sees your UTR or NI number.

### Changed
- The trading allowance is not used for income from your employer or a connected person, and the screen says which of the allowance or your costs is used and why.
## [2.23.0] - 2026-10-30

OpenDash is now **Freeflo**, with a new logo that follows the seasons and turns into the holidays.

### Changed
- **The name is Freeflo.** The app, the tab title, the opening, Settings, the docs and the website say Freeflo. Nothing else moves: your data
  folder, the `opendash` command and folder names, the MCP server id, the GitHub address and the update check stay exactly as they were, so
  nothing needs doing on your side.
- **A new logo and a new opening.** The name is written in one stroke and its last o is an orb of moving liquid that drops in and settles. The
  orb is bigger than the letters around it, and it is the app icon in the browser tab too.
- **The orb follows the seasons.** Spring, summer, autumn and winter each colour it (the southern hemisphere is flipped from the time zone),
  with a small detail of their own: petals, bubbles, a drifting leaf, snow.

### Added
- **The orb turns into the holiday.** For a few days around each one it becomes a jack-o'-lantern (Halloween), a snow globe (Christmas),
  fireworks (New Year), a heart (Valentine's Day), a lantern (Lunar New Year), a diya (Diwali), a crescent and star (Eid), an egg (Easter), a
  flipping pancake (Pancake Day), a bonfire (Bonfire Night), a clover (St Patrick's Day), the Earth (Earth Day), a rainbow (all of June), a
  cake on your birthday (the one in Settings), and the sun or a starry night at the solstices.
- **Logo style** in the workspace icon menu: follow the seasons and holidays (the default), seasons only, the classic colours, or pin any season
  or holiday to preview it. `assets/brand/orbs/` and `assets/brand/preview/orbs.png` show all 21.
- `prototypes/freeflo-orb-gallery.html`: every orb, animated, with a date picker to see what any day shows.

### Notes
- The Windows installer, Start menu entries and the `OpenDash-Setup-<version>.exe` file name keep their old names for now; the installer's
  window text says Freeflo.
- Screenshots on the website still show the old name until they are retaken.

## [2.22.4]

Owed to me: split a payment, and let your bank tell you who has paid.

### Added
- **Owed to me**, a new tab in Money. Click a payment, choose Split this, and pick people: equal, exact amounts, shares, percentages or extras. Stray pennies fall to you and are shown.
- Your bank is checked for who paid back: "We think Sam paid £8. Yes or Not this?". Each Yes teaches it how that person's payments look. Nothing is marked paid by itself unless you turn that on.
- Paying for others: a payment can cover several people ("Sam paid £16: for himself and one other?"). Click any payment to say what it was for, with editable amounts; the rest can be credit, a gift or not related. Change it later.
- Views by person, thing and trip, with who pays whom and settle up. Also I owe, Expecting money (refunds, deposits, loans) with a late flag, and moving an expense to Owed to me and back.
- Remind someone with a friendly message you send yourself; OpenDash never sends anything.
- A Home widget and a My money widget; search Transactions by amount; a note on any payment; "Expecting a refund" on a payment; "I paid £40 for bowling" typed in one line.
- The assistant can list what is owed, create a split and mark it paid, with Undo. "Paid" read from an email only asks you on the page.

### Changed
- Money that is paid back and matched in your bank is no longer income, and comes off the original payment, so bowling counts as your £8 share. It lands in the month of the original payment, so past months can move. You can switch this off.

### Fixed
- A dialog no longer closes or loses what you typed when saving fails.

## [2.22.3]

Credit cards, like an Amex.

### Added
- Add a credit card from Connections or Money > Your data: connect it if your card is listed, or import a file from the card's website.
- Card files are checked before import: you see a few rows ("We read these as money you spent") and can flip the direction with one tap. The choice is remembered, and Your data can change it later with Undo.
- What you owe on a card shows apart from your money. Safe to spend, the brief and Home keep back the next card payment.

### Fixed
- A payment to a card no longer counts as spending or income, including for a card you have not added yet (a note says "You pay a card we can't see"). AMEX payments counted as spending before. Refunds reduce spending.

## [2.22.2] - 2026-10-30

The garden: a rowing boat to your friends’ gardens, press and hold to walk, and clicks that always do something.

### Added
- **The rowing boat is the way to your friends’ gardens.** Click the boat by the mooring post: you walk to it and a menu asks where to; it lists
  the friends whose gardens are shared with you, and picking one takes you there (the Post box still has your visits and parcels).
- **Press and hold to walk.** Hold the left button on the ground and you keep walking to the pointer (drag to steer, let go to stop); a quick
  click still walks to that spot, round whatever is in the way.

### Fixed
- **The highlight no longer depends on where you point.** A plant lit up only on a petal or at its foot; now the whole drawing lights up, and
  what lights up is exactly what a click will do.
- **Clicks that did nothing now do something.** Click a plant that needs nothing (a sunflower still growing) and it tells you how it is doing;
  a click in the sky or past the edge walks you to the nearest ground; a click that wobbled a few pixels still counts; a click while you creep
  up on a bug stops the chase instead of being pulled back by it; and a walk carries on when the page is drawn again.
- **Less getting stuck.** A pop-up closed some other way can no longer leave hover and the keys switched off, and a missed mouse release can no
  longer leave a press hanging.

## [2.22.1]

Your money, from only the banks you still use.

### Added
- **Money > Your data**: one row per bank account or imported file, with where
  it comes from, its dates and number of payments, and a plain status (Updating,
  Stopped updating, One-off file, Needs you to reconnect) with the next step.
  Untick "Count this in my money" and press **Update my money**: Money, the
  brief, the story, budgets, Home, expenses matching, the assistant and sharing
  with friends then count only what is ticked. You see the difference first
  (payments, this month's spending, money in, your balance), and one Undo puts
  it back exactly. Unticking never deletes.
- **Start fresh**: "Which banks do you still use?" unticks everything else in one go.
- **Moving banks**: "Only count up to a date", and "Stop counting from the day
  Monzo starts", keep old history in your long-term trends without counting
  anything twice; that account's balance leaves your totals.
- **The same payments, twice**: two sources that share most of their payments
  are shown plainly, with a one-click choice of which to keep.
- **Delete this data for good**: says what goes, offers its payments as a CSV
  first, saves a safety copy for 30 days, and can disconnect the bank too. A
  connected account that was deleted does not come back unless you bring it back.
- A calm note when a salary or a bill was only seen on something you unticked.

### Changed
- A payment between your own accounts stays a transfer when one of the two is
  left out, so a Barclays-to-Monzo move never looks like income. Money in that
  was only called income because it was positive is now a transfer whenever it
  matches money out of another of your accounts.
- "Update bank" no longer reads a bank whose accounts are all unticked, and that
  bank no longer counts towards "your data is out of date".
- A left-out account's balance leaves the totals, net worth and safe to spend
  (it used to stay in them after being hidden in Connections).
- Your ticks and dates follow you to your other computers.

## [2.22.0] - 2026-10-30

The garden becomes a world you walk in, with fishing and bug catching, and pets you can customise with words.

### Added
- **The garden is a world you walk in.** The figure on the grass is you, drawn from your profile (the one the scenes use), and your pet
  follows. Click the ground to walk there (free movement, not square to square), click a plant with a tool and you walk over and use it, or use W A S D / the arrow keys
  (Shift creeps, Space or E uses the tool in front of you). The camera follows you; the wheel, + and - zoom, F shows the whole garden.
  The keys now work wherever you are on the page, not only after clicking the stage. Shift+W waters everything (W alone walks).
- **A bigger garden**: 28 x 18 cells instead of 20 x 11 (everything you planted stays exactly where it was), with the Lake along the south
  (a pier, a boat, reeds, fish shadows and leaping fish, a tackle shop) and the Wild woods down the east side (level 4).
- **Fishing**, like Stardew Valley: just click the water, wait for the bite, strike, then hold to keep the fish in the bar until the
  meter fills. 39 fish and 9 finds (junk and treasure) by depth, hour, season and rain; quality stars; five rods (the golden one is a ribbon
  prize), bait and floats; casts a day that grow with the work you do. **Bug catching**: click a bug, creep up on it and swing; 33 bugs
  that live near flowers, water, lights and trees.
- **The menus are in the world.** The shop, the market stall, the notice board (your almanac), the field journal (fish and bug books), the tackle shop, the post box (friends), the camera (photos) and the sundial (time-lapse) are buildings along the lake shore: click one and you walk to its door and it opens as a pop-up you close by clicking outside it (or Esc). The garden no longer has a row of menu buttons; your pet is smaller than you.
- **No more tools to juggle.** Click a plant and it is picked, watered (drag across a row for several) or trimmed, whichever it needs; right-click for fertilise and dig up. Only Plant and Decorate are left as modes. Nothing lights up a square of grass any more: the thing you can click lights up.
- **Fishing locks you in**: the camera closes in on you and your line, hover effects go quiet, and you reel without the garden moving around. Bugs are easier to catch: you can creep up on one over a flower bed, and it sits still while you do.
- **The Catch page**: your bag and the market (it only wants so much a day), an order board of three requests a day paid in coins and goods, a
  fish book and a bug book (shadows and hints until you meet each one), the tackle shop, and a showcase.
- **Show them off and share them**: an Aquarium, a Bug case and a Trophy board for the garden show your best catches; friends see them when
  they visit, on a card of their own, and on your profile card. Give a fish or a bug to a friend like any other parcel (they go in the
  friend's book too). Garden ribbons unlock hats, pins and titles on your profile, and pet hats.
- Pets can be customised with words. Pets > Wardrobe: your own colours for the
  coat, the belly and pattern, the eyes and every accessory (a "Custom" swatch);
  **Restyle with AI** (describe a change, see it before and after, Apply, Undo);
  and **My designs**: the assistant draws a wig, hat, glasses, scarf or cape for
  your pet ("Design with AI"), you see it on your pet first, and you can
  recolour it, nudge its fit for your species, rename it, share it as a code
  (and import one) or delete it (with Undo). Designs fit every species through
  the head circle and the collar line.
- Friends see the accessories your pet wears (a new friends message, `pet:items`,
  checked again on arrival; an older app just shows the plain pet), and Pets >
  With you can turn friends' accessories off.
- Nothing from a friend ever goes to Claude. The sentence you type, your pet's
  look and (when you ask for a change) your own previous drawing go to your
  Claude, only when you press the button. See `docs/PRIVACY.md`.

### Changed
- The garden's whole-garden crop and the aspect of its views follow the new size; the "Every corner" ribbon now needs all eight areas.
- Icons added to the sprite: fish, zoom-in, zoom-out, maximize, locate-fixed.

### Fixed
- **You no longer get stuck on things in the garden.** Walking into the corner of a bed, a bench or a building slides you along it and round
  the corner instead of stopping you dead, and a click re-plans the way if something grows or is put down in your path. If a plant grows
  where you stand, you step out of it instead of being wedged inside.

## [2.21.0]

Selecting many things at once, a much more capable assistant, 497 hard
achievements, an exact expense form, and simple 4-letter codes everywhere.

### Added
- **Select many at once, with one Undo.** Tick several tasks, expenses,
  transactions, budgets, Bin items, files, people or trips (or press
  **Select**), change them together, and one Undo puts the whole batch back.
- **Expenses are a tab in Money**, and the Money page now opens on a short
  brief of where you stand. Plainer words, a one-click category change, a
  Clear filters button and no dead ends on the way.
- **The expense report matches the paper form exactly**, and every report you
  make is listed with **Undo this report**, which puts its expenses back in
  To claim (it still works after a restart).
- **The assistant can do nearly everything in the dashboard**, with Undo: the
  whole dashboard is now open to Claude Code and the in-app assistant (garden,
  pet, profile, settings, Home layout, daily notes, people, tags, files,
  countdowns, expenses and more). Anything sensitive (friends, your computers,
  your relay, sign-ins, money rules, existing expenses, updates) is always a
  proposal you approve on screen, or needs a dry run and a confirm token when
  you use your own MCP client.
- **497 hard achievements** (419 new), spread over months of steady use, each
  one earned for something you really did. The visit-every-page secret is in
  too.
- **Join my other computer**: adding a computer is now a 4-letter code (shown
  as `KQ MX`) and a matching picture on both screens. The code is live for
  ten minutes, works once, and three wrong tries close it.
- **Show my friend code**: 4 letters, live for ten minutes, works once. Your
  friend types it, you see who it is, check the pictures and press Accept.
  Invite links still work. It needs a relay you both use.
- **An optional emergency backup sheet** of 10 words, offered once and under
  Settings > Sync. You only need it if you ever lose every computer.

### Changed
- The recovery code is gone. Old 32-character codes still work if you kept one.
- The Claude connector code you type to approve a new connection is now 4
  letters, and three wrong codes close the Connect window.
- Removing a computer locks it out of Friends automatically, from the server,
  without asking, and renews the backup sheet's secret (if you made a sheet,
  you are asked to print a new one).
- If you use your own relay, **redeploy it once** (Settings > Your relay >
  Advanced > Update my relay) so live friend codes work. Until you do, friend
  codes are not offered and invite links still work.

## [2.20.0]

A security release, after a full review of the local server, encryption and
sync, the relay and friends, untrusted content, the AI tools and the release
path. Details in `.github/SECURITY.md`.

### Security
- The data folder's `.env` can no longer choose programs, the update feed or
  Node options; only the sign-in app IDs are read from it. `CLAUDE_CLI_PATH`
  must be a real Claude binary outside the data folder.
- Updates come only from this project's GitHub releases and are now signed
  (Ed25519 over the checksum files, public key built in); unsigned releases are
  refused. A planted update record cannot roll the app back.
- Task, note and calendar descriptions: the markdown link renderer is rebuilt
  so crafted links can't inject HTML; the page's security policy no longer
  allows inline scripts (hashes only) and images only from known hosts.
- Privileged local routes need a per-start page key; the remote Claude
  connector accepts new clients only right after you press Connect, with typed
  approval codes, per-IP limits, and Revoke all clearing every client. The
  remote gateway is read and propose only; expense file attachments refuse
  network paths.
- Friends and relay: removing or blocking a friend (or them removing you)
  always revokes relay access, retried until confirmed; invite links give only
  limited message access until you approve the friend; unsigned and unknown
  callers are refused before any stored state; old friend messages can't be
  replayed; the self-hosted relay checks its own host; wrangler is pinned.
  Redeploy your relay (Settings > Your relay) to get the relay-side fixes.
- Sync: removing a device makes a new recovery code and offers to renew your
  Friends keys; each device signs its records, so a removed device can't
  rewrite history; timestamps far in the future are refused.
- iCal feeds and bank memos can no longer stall the server; the installer's
  Node.js is 22.23.4.

## [2.19.7]

### Added
- A one-click Windows installer, `OpenDash-Setup-<version>.exe`: no admin
  prompt, no Node.js to install (a pinned portable Node.js is bundled in
  `runtime\`), data kept in `%LOCALAPPDATA%\OpenDash\data` outside the app,
  Start menu "OpenDash" and "Stop OpenDash", optional desktop shortcut and
  start-at-sign-in. Not code-signed yet (SmartScreen warns once). Built by the
  release workflow; `installer-check.yml` builds one from any branch.
- Settings > Server: "Add a desktop shortcut" (Windows, macOS, Linux) and "Add
  to Start menu" (Windows). The shortcut starts OpenDash with no window if it
  is not running, waits, then opens the browser (`tools/launch.mjs`).

### Changed
- `start-opendash.bat` uses `runtime\node.exe` when present; in-app updates
  never touch `runtime\`.

## [2.19.6] - 2026-10-28

Make an expense report from the Expenses page.

- Tick the expenses and press Make expense report. OpenDash fills in the expense form (A4 landscape PDF: name, pay period, one row per expense in the right column, totals, advances) and zips the receipts, named to match the rows. Both go in Documents/Expense reports/ in a new folder, which opens for you. The columns are chosen automatically; click a column name to change one.
- The expenses are marked as submitted, with one Undo.
- New: Your signature (More menu on Expenses). Add a PNG or JPEG once and it goes on the Claimant line. It stays in your data folder and is never shared.

## [2.19.5] - 2026-10-24

Home and Money are boards you can arrange any way you like, and Money's welcome and story are back.

- Resize any widget on Home and Money to any size, and drag it anywhere. Gaps fill themselves, so the page never has holes.
- Money uses the same board as Home: the same Customise, the same drag and resize, and your existing Home and Money arrangements carry over as they were.
- Money has its welcome banner again: a greeting over the sky, what is safe to spend today, and a big "Play money story" button. A "Money brief" button sits beside it. The little cross hides the banner, and More brings it back.
- Home's pages (Today, Evening, Week, History) and Money's (Overview, Spending, Cash flow, Budgets, Transactions, Expenses) are in the sidebar as well as along the top, and the one you are on is lit in both places.


A calmer top bar, a tidier Money, and a few things that now say what they do.

- The top bar shows only the next date that matters; the others are one click away under "+N". Your level, streak and XP are one small chip, and "Needs you" and "Saved" only appear when there is something to say.
- Money is reorganised and has far fewer controls. Under the tabs there is one row: pick the period, and one Filters button for trip, country and category. Everything else (layout, plain words, Hide amounts, Money brief) is under More.
- Money's pages (Spending, Cash flow, Transactions and the rest) have the same single row, with the date slider and Group by / Compare inside Filters. On Transactions the title and its search, sort and type are one row.
- After an import or an update, Money no longer shows a green banner: a short note at the top ("Imported 3 new, 12 min ago") says it. A banner only appears when something needs you.
- Money's cards sit in an even grid: key numbers first (safe to spend, this month against last), then budgets, then bills and subscriptions. Lists show the same number of rows so each pair of cards is level; "How many" is a setting on Bills.
- The garden shop is simpler: one row of controls, a small strip for today's deal, eight clearly worded cards at a time ("costs 10 coins, grows in about 2 days, sells for 3") with one Buy button, and Show more.
- In a friend's garden the Water tool always tells you what it can do, plants that can be watered glow, and when you can't water something it says why.
- Profile is its own full-width page in Life (Card, Avatar and wardrobe, Sharing). The "You" buttons open the right place: Wardrobe opens the wardrobe tab, and Set status opens the status box where you clicked. Settings > Profile is a short link to it.

## [2.19.3] - 2026-10-24

Browse what your friends share with you as easily as your own data, and no more pages that shift sideways when you change tabs.

- New Friends tab, "Shared with me": pick a friend on the left, then their Tasks, Calendar, Money, Places or Memories, but only the areas they chose to share. It looks like your own pages (task rows, the calendar agenda, money cards), says whose it is and that it is read-only, and tells you how sharing works when a friend has not shared something yet.
- Tasks, Calendar and Money have a small "Mine" switch in the header: pick a friend who shares that area to look at theirs, then "Back to mine". Tasks and Calendar also show "Show friends' tasks" and "Show friends' events" tick boxes, and Money can show a "Friends' money" summary when someone shares it.
- Each friend's page has a "View their data" button.
- New shares appear by themselves, without a reload.
- Switching tabs on a page (Friends, Achievements, Memories, Places, Profile, Money) no longer moves the content sideways or changes its width, and the tabs under the page title stay where they are.

## [2.19.2] - 2026-10-24

- Fixes a crash ("tgDueChip is not defined") in task lists and shared spaces after 2.19.1: part of the shared-spaces code had been removed by mistake during the tidy-up. Shared lists, the Together hub and space pages work again.

## [2.19.1] - 2026-10-24

Every page now sits in the middle of the window, and there is less on each of them. Nothing is gone: what you do less often moved under More, a tab, Add widget or Show more.

- Every page is centred with the same margins, so nothing hangs to one side any more.
- Less clutter everywhere: repeated buttons, helper lines, duplicate counts and boxes around boxes are gone, and related details sit together.
- Tidier Achievements, Memories, Places, Pets, Profile and shared spaces.
- A calmer Home: your day and its schedule first, then what is coming up, then money and life, each under its own heading. Other cards wait in Add widget, and a row never leaves a gap beside a short card.
- Home's top shows only what helps: a greeting, a couple of ideas, and one button for the AI day review.
- Clearer Tasks: the header is the title, Add task, the view switcher and More (weekly review, clean up and Display live there). Long groups show a few tasks at a time with Show more, group headings stay in view as you scroll, and the Tags and People lists in the sidebar start folded.
- Clearer Calendar: the views are tabs, the filter and New sit beside them, and the day or event you pick shows in the panel at the side.

## [2.19.0] - 2026-10-24

A tidier OpenDash. Nothing you have is taken away; it is shown in a calmer order.

- Friends and Expenses are now a list with the one you pick beside it, so you see the person or the expense and what you can do with it without scrolling through one long page.
- Money has tabs at the top (Overview, Spending, Cash flow, Budgets, Transactions) and, inside a tab with more than one view, a small switch. The filters and totals only show where they help.
- Expenses shows what you are owed on top, the expense you pick on the right with its receipts, and long lists show a few at a time with Show more.
- Getting around works one way: switch area at the top, pick a page in the sidebar, switch views with the tabs at the top of the page, and use Back to return. The same list is no longer repeated in several places.
- Changes made by the AI assistant (an expense it adds, for example) or by your other computer now show up by themselves, without refreshing the page.

## [2.18.4] - 2026-10-24

- The AI assistant can now attach a receipt file (a PDF or picture already on your computer) to an expense, not only receipt emails. It copies the file into the dashboard's private receipts, with the same 5 MB limit and file-type checks as adding one yourself.

## [2.18.3] - 2026-10-24

- Fixes the AI assistant after 2.18.2: a second safety check was rejecting its tool list, so it could not answer at all. It works again and can file expenses.

## [2.18.2] - 2026-10-24

- The AI assistant can now file expenses for you: tell it about a purchase (or paste an order) and it adds the expense, with an Undo, and can attach a receipt or mark claims as submitted.

## [2.18.1] - 2026-10-24

A playable garden, a way to keep track of money you are owed back, and a calmer app. Nothing you already have is taken away.

### The garden is now a game

- **The garden fills the window.** There are tools to plant, water and trim, a short tour and a guide, so it is easy to start.
- **Coins come from your time.** You earn them from focus time and from time logged on tasks, with a daily cap so it stays gentle. Prices are roughly two to three times what they were, and everything you own is kept.

### Expenses

- **Label a payment as an expense, or add one by hand.** Keep receipts with it, and build a claim pack when you want to be paid back.
- **OpenDash notices when you are paid.** An **Owed to you** card on Home shows what is still outstanding, and an expense can link to a task.
- **Claude can help** with your expenses through new tools.

### Together

- **Share a task with a friend**, or start a shared list, from a friend's page.

### Money and sync

- Sync no longer asks you to review its own housekeeping.
- Pending card payments show with a **Pending** label.
- The "days old" message follows each bank's last sync and names the bank.
- Accounts with identical names now show their payment counts, so you can tell them apart.

### A calmer app

- Dialogs keep their size, and task rows show less (Display > Show on rows brings anything back).
- Settings, sync, connections, Home and Life each show one status line, with **More** or **Advanced** for the rest.
- Relay and asleep status are clearer, and a number of wording fixes.

The 500 new achievements are coming in a later update.

## [2.18.0] - 2026-10-24

A new home for the people and the fun parts of OpenDash: **Life**. Your friends, a garden you can grow and share, a pet to look after, a much bigger wardrobe, and a calmer Tasks sidebar. Nothing you already have is taken away, and your old garden carries over.

### Life, and a way to find every page

- **A new area called Life** holds Friends, Garden, Pets, Achievements, Memories and Places side by side, with a tab strip to move between them. Friends, Achievements, Memories and Places moved here, and everything still works the way it did.
- **All pages** is one searchable grid of every page in the app. Press **G** then **G** to open it, or pick it from the sidebar. New pages get a small dot until you have looked at them.
- **A calmer Tasks sidebar.** Four views up front and the rest under *More views*, and sections with nothing in them stay out of the way.
- **Home** cards open their pages when you click the title, and there are new Life cards for friends who are around and for quests and streaks.
- **A Friends button in the corner**, next to you, so your friends are one click away. The corner shows your name and opens your own hub, with a quick way into Life.
- Shortcuts: **G** then **L** opens Life and **G** then **G** opens All pages.

### The garden

- **Grow a real garden** with 131 plants (flowers, herbs, vegetables, fruit, succulents, trees and pond plants), 74 decorations, different areas and tiles to lay out, and tools to tend and decorate with. Plants grow while you are away, need water, and react to the weather and the light of the hour.
- **A shop, a basket and a harvest.** Pick what is ready, sell it, make bouquets and ribbons, and spend what you earn on new seeds and decorations. *Sell everything* is one tap with one Undo.
- **The almanac** records everything you have grown and found. **Seasons and events** change what is in bloom, and **29 visitors** (birds, butterflies, hedgehogs and more) drop in with small lives of their own.
- **Daily tasks and quests** give you a gentle reason to look in, never a chore.
- **Photo mode** takes a picture of your garden at its best, and the **time-lapse** replays how it has grown.
- **Your old garden carried over.** What you grew in earlier versions is still there, in its new home.
- **Visit your friends' gardens.** Wander through a friend's garden, leave a note in their guestbook, water a plant, and share a bed with a friend that you tend together. There is a gallery of the gardens around you, and you choose in Settings who can see yours.

### Pets

- **Adopt a pet from 18 species**, each drawn by hand, in different coats, markings and accessories.
- **Look after it.** Feed treats, teach tricks, play together, dress it up and read its journal. Its mood shows on its face.
- Your pet appears on the Home page, beside you in the garden, and on your profile, and your friends can see it too.

### A much bigger wardrobe, and your profile

- **Far more clothes and ways to customise your avatar**, with clearer tiles in the builder. Coats now sit over dresses, and gilets and hi-vis jackets fit the way you would expect.
- **Saved outfits**, a *Surprise me* button and quick expressions.
- **Banners, nameplates and titles** make your profile card yours. Pick a favourite emoji and what you are up to right now.
- **A bigger profile card** with your banner, nameplate and title. Settings > Profile > *Your card* shows how it looks to others. Friends' visits to your card are only counted, never listed.

### Achievements, redesigned

- **The Achievements page has a new look**, with a wall of everything you can earn, your history and the rewards that come with each one. Unlocked rewards go to the right place by themselves.
- Achievements are meant to be earned, so they are not easy. **500 new achievements come in 2.18.1.**

### Good to know

- **Garden, Pets and friends' gardens work best when your friends update too.** A friend still on an older version will not see your garden or pet, and you will not see theirs, until they update.
- Your garden, pet and outfits stay with you and sync between your computers like the rest of your data.
- The rest of the tidying-up of pages, Expenses and the 500 new achievements are coming in 2.18.1.

## [2.17.1] - 2026-10-24

Your relay now works on every one of your computers by itself, and sync goes through it first, so your changes no longer wait for OneDrive. The Sync page is much simpler, your avatar in the top-left corner opens your own little hub, and friends and your relay are safer too.

**Please do it in this order:**

1. **Update every computer first** (Settings > Updates on each one).
2. **Then, on one of them**, open Settings > Your relay > Advanced and click **Update my relay** once, so your relay gets the new protections too. It keeps its address, its members and your computers.

Why the order matters: an updated relay asks for proof of your current sync key, which a computer still on 2.17.0 can't give, so that computer would be turned away by your relay until it is updated.

### Your relay on every computer

- **Your relay carries over by itself.** Connect it on one computer and your other computers pick it up on their own, together with the key to it: straight over the link between your computers when they are both on, or through your sync folder. A computer that was still on an older version when you connected your relay catches up as soon as it is updated.
- **The setting follows you too.** Choose to sync through your relay on one computer and your others switch to it as soon as they have the key (your own relay does this from the start). Settings > Sync says so once, with Undo. Turning it off on one computer changes only that computer.
- **Your relay first, OneDrive as a backup.** Changes from your other computers come through your relay within a second. Your sync folder keeps a backup copy, and OpenDash reads it only for anything the relay doesn't have yet or while the relay can't be reached, then switches back by itself. No more waiting for OneDrive, and a file OneDrive is still downloading never holds sync up.
- **Clear status on every computer.** A computer that doesn't use your relay yet says so, with **Use my relay too** or one plain line about what is missing and how to fix it. OpenDash never suggests setting up a second relay when you already have one.
- **Get your relay right away:** Settings > Sync > Advanced > *Get your relay from your other computer now*. Paste the link from Add a computer on your other computer and type its 4 letters. This computer keeps everything it has and only gets the key to your relay.

### A simpler Sync page

- **One card, status first.** Settings > Sync opens on one line that says how things are (*Up to date*, *Catching up*, *Needs you*), then how your changes travel ("Same Wi-Fi: direct · Elsewhere: your relay · OneDrive: backup"), and one line for each of your computers: *Up to date*, *Catching up 40%*, *Asleep*, *Off* or *Needs an update*. Click a computer to rename or remove it.
- **A sleeping laptop is not a problem any more.** When your other computer is asleep or switched off, Sync says so calmly ("Work laptop is asleep and catches up when it wakes"), never "cannot be reached" or a router message.
- **Your router is left alone.** While your relay carries your changes, OpenDash no longer asks your router to open a door, and the router and internet-provider messages are gone. (If you had turned that switch on yourself, your choice is kept.)
- **Everything else is still there, folded away.** *More* has your computers and phones, the main computer (one choice for mail, calendar, bank and Claude), adding a phone, the recovery code and Sync now. *Advanced* has the ways to sync, Preview changes first, which computer does what, and details for support.
- **Check-up** (it used to be called Health) shows only what needs you, each with its button; everything that is fine is folded underneath.
- **Your relay** reads the same way: one line that says whether it's on, **Set up my relay** when you don't have one, and **Update my relay** and **Stop using this relay** under Advanced. Your computers are listed by name.

### The corner is you

- **Your avatar and name sit in the sidebar's top-left corner**, with your status and a dot when friends are around (a number when someone is waiting for you).
- **Click it for your own hub:** your card, a quick status, your friends, your relay and Sync, and the usual workspace menu.
- **The Friends item in the sidebar is hidden** now that the corner is the way in; Customise sidebar shows it again if you like it.

### Clearer wording

- The Friends privacy note now says what really happens: each friend sees your card and game progress, plus only what you choose for them in Settings > Privacy.
- Settings > Privacy names the right switch for your online status: *Show friends when I'm around* in the Friends tab.
- Location history now says your places stay on your devices unless you choose to share them with a friend.

### Fixed

- **Catching up no longer gets stuck.** After a computer joined again with the recovery code, it could stay stuck at, say, 28%, send everything again on every connection and make some edits look like clashes. It repairs itself the first time it starts. A change that goes missing on the way is now fetched again by itself, and Settings > Sync shows *Catching up 40%* next to that computer.

### Safer friends and relay

- **Adding someone with a friend code:** you both check the 6-digit code now (*The codes match* or *The codes are different*), not only the person who approves.
- **Changing how much you trust a friend** turns off everything private you shared with them before. The message says what stayed off, so you choose again on purpose, and Undo puts it back.
- **Places shared for a trip or between two days** now send only places from those days, and nothing at all if there are none.
- **Your profile card** shows only game badges (tasks, streaks, focus, quests, levels and the like) until you pick your own. Money, places, habits and people badges stay private unless you choose them.
- **A friend code or short link you replace or remove** can't be taken over by someone else.
- **A friend's relay** carries your device sync only when you choose it in Settings > Your relay, and disconnecting your own relay never moves you onto a friend's without asking. If you already sync through a friend's relay, click **Use it for sync** there once.
- **Your relay is harder to misuse:** OpenDash refuses relay addresses written as bare numbers (they can point inside your own network), strangers get less time and fewer places to wait so they can't crowd out your devices, and changing sync's key on the relay needs proof of the current key.

## [2.17.0] - 2026-10-24

Friends! Add the people you like who also use OpenDash, cheer each other on and do things together, through a small private relay that only you, your devices and the people you invite can use. Nothing private is shared until you say so.

### The Friends tab

- **Friends in the sidebar:** your friends, what they have been up to, and a hangout where everyone's character stands together.
- **A warm welcome** walks you through three steps with a progress bar: make your character, get a relay, invite a friend. Ctrl+K, *Friends: getting started* brings it back.
- **How friends work** (Ctrl+K) is a one-page summary, and the full plain guide in `docs/FRIENDS_GUIDE.md` has the whole story.

### Your profile and character

- **A profile card:** display name, pronouns, a status, a short bio, what you are working on, and its colour. Fill in only what you like.
- **The character builder** (Settings > Profile): make your own little person. It shows on your top bar and next to your name for friends.
- **Choose what your card shows:** the badges and favourite places you want friends to see.

### Invites and friend codes

- **Invite links** work once and end by themselves (after 1, 7 or 30 days). They are short, come with a QR code, and *Copy a ready message* writes a friendly note that says what to do with it.
- **Friend codes** like `ALEX-7K2QX9` for people on the same relay. *New code* makes a fresh one and the old one stops at once.
- **A 6-digit code to check** before you are connected: you both see it, so a forwarded or stolen link is not enough on its own.

### What each friend can see

- **Nothing private until you say so.** A new friend sees only your profile and your game progress.
- **Per-friend choices:** *What Sam can see* on a friend's page turns on tasks, calendar, money, places or memories for that one friend, once you mark them a **Trusted friend**. Each can be on only for a while (until a day, or during a trip).
- **Preview what Sam sees** shows exactly what would go to them.
- **Stop sharing** with one friend, or **Stop sharing everything** (Settings > Privacy), stops it at once, Together and postcards included.
- **Being around** ("here now", focusing, travelling, away) stays off until you turn on *Show friends when I'm around*, and never says where you are.

### Together

- **Shared spaces:** a list, a board, a party, a trip or a shared house that you and your friends edit together, with Undo.
- **Plan together:** a shared board of notes, task ideas, times to vote on and places, with everyone's pointer live when you are on it at the same time.
- **Find a time** across everyone's time zones: the three best times, then one click to plan it, booked once everyone can make it.
- **Friends in your views:** their busy times in your month and timeline (only if they share them), shared countdowns on your top bar, and *Shared with you* rows in Today.
- **Assign to a friend** and **Share to a space** from any task. Nothing a friend sends changes your own tasks until you choose Accept, Join or Mark done.
- **Split costs** for a trip or a shared house (only the amounts you type in; your Finances are never read), shared birthdays, and wishlists where a friend can quietly say "I'll get this".

### Playing together

- **Co-op tasks** with shared XP and a joint celebration when they are done.
- **Team quests** with a party streak, **friendly challenges** with trophies, an optional weekly leaderboard, and **accountability goals** with a buddy.
- **Focus together:** see when friends are focusing too.
- **Waves, high-fives, nudges and cheers** in one tap, plus reactions and stickers.
- **Duo streaks** and **friendship levels** that unlock new high-fives, themes, stickers and gift wraps as you go.
- **Friendship quests**, three fresh ones each week for every friend.

### Little surprises

- **Friends in your scenes:** a friend who is around can stroll through the scene you are watching, in their own outfit. You can switch it off.
- **Postcards** from any scene, sent to one friend or a few, collected in an album.
- **Gifts:** wrap a sticker, an emote or a seasonal outfit item for a friend, with a gift tag, and let them unwrap it.
- **Seasonal friend events,** starting with **Trick or treat** for Halloween.
- **A friends recap** and milestones, celebrated once.

### Your private relay and Connect Cloudflare

- **Your own relay** on your own Cloudflare account, on the free plan. It only ever holds sealed messages it cannot read, and it lets a friend's message reach you even when your computer is off.
- **Connect Cloudflare** (Settings > Your relay) sets it up in about two minutes: sign in, click Allow, and watch each step tick off. Every step has **Cancel** and **Try again**, and each problem says what happened and what to do next.
- **Use a friend's relay** instead, from their invite. You don't need your own.
- **Who can use it:** your devices, the people you invited (by the name you know them by), pending invites with when they end, and today's use of the free allowance as bars. *Revoke*, *Remove* and *Disconnect relay* all come with Undo.
- **Nothing is ever upgraded or paid for:** if a free limit is reached, the relay rests until midnight UTC and messages wait.

### Device sync through your relay

- **Sync your devices through it too** (Settings > Sync): your own computers stay in step within a second, with no shared folder needed (a folder still works).
- **Join with a link:** add a computer with a link and approve it on the one you already have.
- **Relay health** in Settings > Sync shows how it is going.

### Security and privacy

- **End-to-end encrypted:** everything between you and a friend is sealed on your computer and opened only on theirs. When you are both online on the same network, messages go straight between your computers, and your router is never opened for it.
- **Only you and your invitees:** every request to your relay must be signed by you, one of your devices or someone you invited. Your relay keeps no logs.
- **Friends are always untrusted:** what a friend sends is checked against strict lists and size limits, shown as plain text only, and never reaches Claude, the assistant, MCP tools, People or any automatic action. OpenDash never loads a picture or link a friend sent.
- **Keys stay yours:** your private keys and sign-ins are never shown, logged or shared, and travel to your other devices only inside your encrypted pairing.
- **Renew my keys:** after you remove a lost or stolen device, renewing your keys moves your friends to new ones and locks the old ones out.
- **Remove or Block** a friend (with Undo) ends their access to your relay, deletes what they shared with you and asks their app to delete what you shared.
- **Plain limits:** deleting on someone else's device is a request their app carries out, and it cannot stop a screenshot, so only share what you are happy for them to have seen. `docs/PRIVACY.md` (Friends) lists exactly what each level sends.

## [2.16.0] - 2026-10-24

The big positive overhaul: new ways to plan, boards and lists your way, places and memories, a game, a new My money page and a fresh look.

### Tasks views & timeline

- **One layout switcher** on every task list: List, Board, Timeline, Matrix and Review. V and Shift+V flip between them.
- **Week timeline:** drag tasks onto days and free time; it replaces the old Calendar link.
- **Priority matrix:** urgent and important in four boxes; M moves a task to another box.
- **Choose what rows show** (Display > Show on rows): dates, people, tags, estimate and more.
- **Daily capacity:** see when a day holds more than you can do.

### Boards

- **Columns by anything:** status, priority, stream, tag, person, due date, or your own.
- **Swimlanes, richer cards and soft limits** (a full column turns amber; nothing is blocked).
- **Card order you set** stays put, and the column menu moves, hides, adds and edits columns.
- **Saved boards** in the sidebar, one click away.

### Review & planning

- **Guided weekly review**, one task at a time.
- **Today → Tomorrow sweep** (Shift+T): one key per leftover task.
- **Plan my week:** a suggested plan around your meetings.
- **Waiting on people:** a Waiting list grouped by person, with nudges to follow up.
- **Blocked by:** blocked tasks step out of Today until the way is clear.
- **Clean-up helper** for stale, duplicate and dateless tasks, and a Review card on Home.

### Smart lists, sidebar & quick add

- **Smart lists:** save any filter as its own list.
- **A sidebar that's yours:** reorder, hide, rename and pin; Waiting, Someday, Locations and Game rows.
- **Contexts and energy** (@phone, @computer, low or high), and **What can I do now?**
- **Quick capture anywhere** into a new **Inbox**; quick add understands estimates and contexts too.
- **New search operators:** ctx:, energy:, est:, due:month, is:inbox, is:waiting, is:blocked, is:someday.

### My money

- **My money:** a board of 25 widgets you can arrange, with Simple, Detailed and Start from scratch layouts and a live-preview gallery. The layout follows you to every device.
- **Spending by country:** flags, local currencies, trips and cities, worked out from where each payment was made.
- **Quick filters** (this week, month, trip, country, category) across the whole page, and an everyday strip.
- **Fun widgets:** no-spend days, savings goal, best weeks, spare change, travel passport, payday countdown, What if I cut…?
- **Cancel reminders** on subscriptions, and **Hide amounts**.

### Locations

- **A Locations tab:** where you are, a map of everywhere, countries and places, firsts, a timeline, a passport with spend per country, fun facts and badges.
- **Location history kept for good** in your own data folder, synced only end-to-end encrypted. Switch it off, export it or delete it in Settings > Location history.
- **Where was I on…?** for any date, and Copy my travel story.

### Game

- **XP, levels and streaks** for finishing things, with a level chip in the top bar.
- **Weekly quests, personal records, achievements** and a Game page.
- **Boss tasks:** big tasks with subtasks you wear down one hit at a time.
- **Focus timer** on any task.
- **Fun level:** Off, Subtle or Full (Settings > Game). Sounds are optional.

### Memories

- **Wrapped:** your year in OpenDash, full screen and story-like. Play my year opens it.
- **A daily journal** with a mood and an optional Polish with Claude.
- **On this day**, **Your year** heatmap, a **garden** that grows, a **week report** and **fun facts** on Home.
- **Postcards** from your first visit to each country (also on the Locations tab), and **time capsules** for future you.
- **Birthdays and friendship streaks**, **seasonal moments** (advent, New Year goals), and an animation of the day that follows your mood.

### A fresh look & What's new tour

- **A visual refresh** across the app: new tokens, components and shell.
- **Home layout presets:** Focused, Balanced, Everything and Fun.
- **What's new in 2.16:** every new feature with a Show me, plus a guided tour with spotlights.
- **A friendlier first run**, followed by Quick start tips.

## [2.15.2] - 2026-10-24

### Added

- **Calm when another computer is off:** a computer that is asleep or shut down is no longer an error. OpenDash says so in one quiet line (a moon, not red) and catches up when it is back. A sync dot in the top bar shows how things stand, for example "In sync · Mac online" or "Mac off · 3 changes waiting", and a computer on an older version says "update it to sync everything".
- **Sync health** (Settings > Sync > Health): every way syncing can go wrong, checked on this computer, each problem with one button that fixes it: a computer that slept or changed network, a cloud folder that moved, a full disk, old devices. Clashes can be reviewed and settled.
- **What changed** (Settings > Sync): a plain-words feed of what arrived from your other computers and when.
- **People's photos and story narration audio sync** between your computers, encrypted like everything else. Settings > Sync shows how much room they take.
- **Finances on every computer, part two:** your finance AI choices follow you, and Connections > Money on your other computers lists the finance computer's accounts. When the finance computer is away, OpenDash says so calmly.
- **Refresh today refreshes everything:** calendar, inbox, finances, weather and the day adviser in one go, with progress, one Cancel and a Try again for each part. It also refreshes on its own: choose every 30 minutes, every hour (the default), every 2 hours or only when you click in Settings > Home and stories.

### Changed

- **Cancel and Try again everywhere:** every wait shows that it is running and can be cancelled; every failure offers Try again. A running wait no longer disappears before it ends.
- **Connections say what really went wrong** and what to do next, show that they are waiting, and can be stopped (Monzo approval, email task suggestions, Think through my day).
- **Tasks:**
  - Undo instead of "Are you sure?" (deleting from the bin, subtasks, tags, people).
  - Nothing typed is lost: half-written notes, the quick add and a new task you closed without saving can be restored.
  - Today is in sections: Overdue, Due today, Planned for today, In progress. You can reorder, fold or hide them.
  - Multi-select in the list and on the board: Shift+click for a range, drag a box around tasks, and drag the whole selection at once.
  - More keyboard: X, T, D, 1-4 and Del act on all selected tasks, and Alt+Up/Down moves a subtask.
- **Across the app:**
  - A toast's Undo takes back exactly its own change.
  - Repeated messages fold into one, and toasts wait while you hover or are away.
  - The shortcut sheet (?) is complete and searchable.
  - Ctrl+K finds every setting.
  - Updating shows one dialog with what's new and each step's progress.
- **Home and Calendar:** what you type survives a refresh, a closed new event can be reopened, and lists say when they were last updated.

## [2.15.1] - 2026-10-23

### Added

- **Everything syncs:** your two computers now show the same dashboard. Layout and display choices (panel sizes, folded sidebar, list or board, the calendar mode, hidden amounts, focus mode), the whole Home page content (day plan, briefs, weather, holidays), calendar and inbox snapshots, drafts, your own animations, source names and colours, and the things you have already seen (the morning brief, stories, special animations, dismissed notices) all follow you. Only where you are right now (the open page, task and month), this computer's own zone, and secrets stay on each computer.
- **Finances on every computer:** the computer that reads your bank or spreadsheet publishes your finances (accounts, balances, transactions, categories, budgets, the Home money cards); the other shows them as "Finance from Home laptop · updated 5 min ago" and asks it to update. Recategorising, budgets and account names can be changed from either computer. Bank sign-ins stay on the computer that made them.
- **Every AI chat syncs:** task chats, the assistant panel, proposals waiting for Apply (never applied twice) and which answers you have read.
- **Claude host first:** while your Claude computer is reachable, AI work and Claude-run updates go to it, even from a computer that also has Claude; if it is off, this computer takes over when it can. Choose it in Settings > Sync > Claude.
- **A 4-letter join code:** Settings > Sync > Add a computer shows four letters, valid for 10 minutes; type them on the new computer. The 6-digit approval and the recovery code are still under Other ways.

### Fixed

- **Monzo:** the full history imports again. Monzo now refuses transaction lists longer than a year, so OpenDash reads them a year at a time.
- **Joining a computer:** a computer you removed can ask to join again and be approved; a pairing survives a restart or a rename on either side; a pairing that makes no progress ends after a minute, and Cancel works at every step.


## [2.15.0] - 2026-10-23

### Changed

- **Walking in tight places:** people in tight places now walk through each other as soft ghosts instead of dodging. Where two walkers meet in a gap one person wide, a lane too narrow to pass abreast or a knot of people in a narrow street, they no longer wait at the mouth of the gap, shuffle sideways or stand nose to nose: each fades to about half opacity as they overlap and back to solid as they part (never invisible, the shadow and the reflection fade with the body). On open ground they still pass side by side. People fading in and out at the edges of a scene are now drawn faded too (the world renderer ignored that before).
### Added

- **Sync across your computers** (Settings > Sync, off until you switch it on): your dashboard stays the same on every computer through a OneDrive, Google Drive or Dropbox folder you already have. Each computer writes only its own encrypted change log, so the cloud never makes conflict copies; edits merge field by field, so changes made on two computers both survive. It starts in a trial mode that lists what it would change before it changes anything.
- **Live sync:** on the same Wi-Fi, a change reaches your other computer in about a second. Away from home it can stay live over the internet when your home router allows incoming connections (UPnP / NAT-PMP); otherwise it falls back to the cloud folder. Only your own paired computers can connect.
- **Encrypted, with a recovery code:** everything synced is end-to-end encrypted; the cloud only stores scrambled data. A new computer joins with your recovery code or by approving it on your other computer (both screens show the same six digits). Settings > Sync lists your devices; removing one changes the key so it can no longer read new data.
- **Your preferences follow you:** theme, density, hidden calendars, sort and group options and Home cards are the same on every computer; only screen things (pane sizes, the open task, the month shown) stay per computer.
- **Main computer:** connected accounts, bank pulls and AI briefs run on one computer and their results reach the others; if it sleeps, another one takes over.
- **Connect once, use everywhere:** something connected on one of your computers counts on all of them. A computer without Claude no longer says "Connect Claude": it says "Uses Claude on Home laptop", and "Think through my day", task chat, email suggestions, summaries and stories are asked of that computer ("Asking Home laptop…") and the answer shows on both. Calendar links and Claude-connector calendars and mail read on one computer show on the others ("Calendar from Home laptop"); Update asks that computer to read them again.
- **When the other computer is off**, OpenDash says so ("Home laptop is off. Try again later, or set up Claude on this computer") instead of waiting; what it already made still shows. Only named jobs can be asked for, never a command.
- **Your own settings follow you too:** your name, your email addresses (so the same calendars start shown everywhere), home time zone, working hours, locale and AI and brief choices; paths, this computer's zone and its notifications stay per computer.
- **A new account list in Connections:** add many email and calendar accounts side by side. **Other email** connects Yahoo, iCloud, AOL, GMX, Zoho, Fastmail and Gmail with an app password (read-only), with steps for each provider, and offers their calendar links. One-click Microsoft and Google sign-in are built and show as Coming soon until the app registrations exist.
- **Two computers at once:** if OpenDash is open on another computer, saves pause with a clear message and a Use here anyway button; copies OneDrive makes of your files are found and kept as backups. Sign-ins and keys now stay on each computer and never sync.
- **Move your data out of OneDrive** (Settings > Data): a guided move that lists every change first, checks every file, keeps the old folder and can be undone, plus an optional daily encrypted backup into your personal OneDrive.
- **World tools:** `node tools/world.mjs preflight <scene>` predicts the invariant gate in seconds; the v2 to v3 converter keeps buildings, traffic and crowds; 45 converted draft scenes in the hidden world-test pack.
- **New place: Sheffield's Winter Garden and Tudor Square** (world engine), with reusable pieces: a great-glasshouse model (larch or iron arches, glazing, palms and pines inside, lit after dusk), Yorkshire civic styles (a sandstone town hall with its clock tower, an Edwardian theatre, a 1970s brick theatre, a gallery front, a white residential tower), and engine fixes found on the way (fountain jets stand on the ground and switch off overnight, kiosks and daytime-only buildings stay dark at night, street furniture keeps clear of tram lines).
- **People no longer change size when they turn:** a walker is drawn at the same height from every side. The directional views of the walkers (three-quarter, head on, from behind) were declared at a different size from the side view, so every walker shrank by about a fifth when it turned toward or away from you and grew back when it turned across; dogs seen head on or from behind were 14 to 43 % smaller. Each view is now scaled to the height its side drawing is drawn at, measured on the drawn outline. A change of view is now a short (0.16 s) true dissolve at each view's own size, with no see-through moment in the middle.
- **People no longer judder or shake:** in world scenes every walker moved in steps: still for one frame, then a double step (on a 60 Hz screen, one frame in four). Positions are now in between their ticks on every frame. The direction a walker steers by is eased (it swung 20 to 40 degrees to and fro from tick to tick), so walkers no longer weave three to seven times a second; the body turns smoothly (it faces the way it moves with 4 degrees of play, so the view no longer flickers at a boundary); a dog no longer twitches at the end of its lead.
- **Planted feet:** seen side-on or three-quarter, a walker's foot now stays on the ground while it is planted: the legs turn through the stance at an even pace and as far as the step needs, then swing forward, and the arms swing against the legs. Before, the planted foot slid along at 60 to 90 % of the walker's speed.
- **People no longer dodge each other:** strangers pass through each other as soft ghosts wherever their paths cross, not only in tight places. Nobody swerves, slows, shuffles or waits for a stranger any more: well before they meet, people keep a little to their side of the way, and where their paths still cross each fades to about half opacity as they overlap and back to solid as they part (never invisible; the shadow and the reflection fade with the body). People who would walk by at a comfortable distance stay solid. Crowds, groups, people stuck in a jam and people about to stop are steered as before, so a crowd never turns into a pile of ghosts. People fading in and out at the edges of a scene are now drawn faded too (the world renderer ignored that before).

## [2.14.0] - 2026-10-19

### Added

- **New places:** Manchester Castlefield (the canal basin, red-brick warehouses and railway viaducts) and Norwich Elm Hill (a cobbled lane climbing to a flint church), both drawn by the world engine, with their own reusable pieces: a viaduct model, canal-warehouse and Tudor colour-wash styles, a cobbled-lane kit and climbing streets.
- **Night lighting:** lantern glows are smooth instead of stepped rings; windows come on one at a time through dusk and go out through the night; shop windows keep shop hours; lamps light the ground and the people in their pools; walls seen edge-on no longer show bright bars; gulls no longer fly at night. The night check now measures real lit pixels.
- **A walking-in-place detector** (`node tools/world.mjs inplace <scene>` and an invariant rule) that reads the drawn frames, not the simulation.

### Changed

- **Walking:** people walking toward or away from the camera now step, sway and bob instead of standing with their feet together; queues, blocked walkers, family groups, dogs on leads and walkers near benches no longer creep or stride on the spot. The share of person-time walking in place fell from 80 % to about 1 % in York and from 55 % to under 1 % on the canal.
- **Fewer, better scenes:** the 90 basic hand-drawn place studies of the South East pack (Kent, Sussex, Surrey, the Isle of Wight, Berkshire, Oxfordshire, Buckinghamshire and Greater London) are retired. The registry no longer lists them; they stay in their files for now.

### Fixed

- The seaside pier scene registers again (its visitors wandered on a surface that did not exist) and its near ground is dressed.
- Several flaky tests (timing, log waits, temporary-folder cleanup on Windows); the continuous-integration run is green again.

## [2.13.0] - 2026-10-09

### Added

- **ElevenLabs story voices:** connect your own account in Settings > Home and stories, choose a voice and use economical Flash or expressive Eleven v3 for morning intros, end-of-day recaps and weekly reviews. Every spoken moment uses your chosen voice by default; an optional highlights setting saves allowance.
- Claude can write narration with tone, pacing and pause cues. Captions keep the spoken words clear, without reading out stage directions.
- Voice previews, account allowance, a monthly character cap and saved audio make usage easy to manage. Replays reuse saved clips; browser speech keeps stories working when ElevenLabs is unavailable or its allowance runs out. API keys and audio stay in the local data folder and are excluded from releases and exports.

### Fixed

- Stories prepare their voice clips before the intro begins, with progress on the opening screen and background preparation for upcoming stories. Playback no longer pauses between moments to generate each clip.
- Supporting moments follow the selected ElevenLabs voice instead of unexpectedly switching to browser speech. A later Claude rewrite is prepared for replay while the playing story keeps its existing words.
- Closing a story or cancelling its queued start cannot trigger late playback; muted stories can start immediately with captions.

## [2.12.0] - 2026-10-09

### Changed

- **All remaining 79 American openings rebuilt:** each now uses the scene engine with its own landmark geometry, layered scenery, moving wildlife or traffic, water reflections and lighting that follows the time of day. The existing artwork inspired each rebuild and remains available as its Old technique version.
- American openings adapt to the seasons and phone or square screens. Hawaii retains tropical foliage through winter; reduced motion keeps a complete still scene.
- South Dakota's New technique scene depicts Black Hills Needle's Eye. Its retained Old technique scene keeps the Mount Rushmore artwork and label.
- Search for a location in Settings > Animations to see its New technique opening, retained original, symbols and time-of-day previews together. The 154 compact American symbols retain their existing artwork.

### Fixed

- Refined the Fleet Pond, Wyndham's Pool and Yateley Green scenes' plant motion, mist bounds and animated animal parts. St Peter's tower remains visible in Yateley's phone and square views.
- Animation checks and compatibility records cover the rebuilt American scenes and retained originals.

## [2.11.0] - 2026-10-09

### Added

- **Scene engine 2:** animated scenes are now built from where things are on the ground, and the engine works out the rest: size and distance, what stands in front of what, water that reflects and ripples by itself, shadows from the real sun, lighting that follows the time of day (night lights, lit windows, haze), live weather (rain, snow, fog, frost) and the four seasons, plus the people, traffic, trains and boats moving through the day. Cars stay on roads, boats on water and people off the tracks, so new scenes come out right whoever builds them. Existing scenes look exactly as before.
- **Canvas renderer:** scenes can now be drawn on a canvas instead of as SVG, which is much smoother, especially full screen and on slower machines.
- **New hand-composed scenes for north Hampshire:** Wyndham's Pool on Yateley Common at dusk, Yateley Green (the pond, the oaks and St Peter's, with a hunting heron, a mallard brood and a dog at fetch) and Fleet Pond (with the train on its embankment). Near Yateley and Fleet, the opening rotates among these three.
- **Object library and tools for scene builders:** a large shared library of people, animals, trees, buildings, vehicles, boats and landmarks; importing AI-generated objects and painted scenes, which the engine then lights and animates; a placement and composition check, a visual critic, a golden set of reference scenes, a drag-and-drop scene editor in the gallery (developer mode only) and a tool that converts older scenes. Scene builders can also start from a real street, canal or park using OpenStreetMap data and real hill outlines; the data is saved with the scene, so the app never goes online for it. Settings > About credits OpenStreetMap contributors (ODbL) and the terrain source.
- **Agent handbook:** a guide and two copy-paste prompts for building scenes and objects with an outside AI agent, with a shared inbox for its results.

### Removed

- The older hand-drawn Yateley, Fleet and north Hampshire views and the North West pack, which the new scenes replace. A pin or favourite saved on one of them is simply ignored.
- The earlier templated UK area scenes (Yateley, Fleet, Farnborough, Hook, Winchester, the New Forest, the Solent coast, Sheffield, Manchester, the Peak District, Norwich, Reepham, Nottingham, Wokingham and Woking) and the engine demo packs. Places without a scene of their own fall back to the regional and seasonal openings, as before.

## [2.10.0] - 2026-10-08

### Added

- **Search all settings:** the search bar finds options across every submenu, including animation packs and Connections. Results show their location and open the matching option, including options inside collapsed sections. Keyboard navigation, clear and no-results feedback are included.
- **Google Health in Connections:** add your Google OAuth credentials, sign in and sync read-only activity and sleep from the last seven days, including supported Fitbit devices. Connection status, sync, reconnect and disconnect are available. Credentials and synced records stay in the local data folder, separately from Gmail and Calendar. A Google Cloud project with API access is required; Google is currently pausing new project onboarding.

### Changed

- The top-left workspace icon uses the existing artwork for your saved or travel location across supported UK, Texas, US, Asian and world-city locations. Compact artwork animates, follows motion preferences and keeps explicit icon choices. The icon is larger and no longer restarts on unrelated page updates.

### Fixed

- Google Health connection status refreshes when you return from sign-in, including when consent finishes in under a minute. Interrupted or expired sign-ins cannot mark an account as connected.

## [2.9.0] - 2026-10-08

### Changed

- **All nine Texas openings rebuilt:** Fort Worth, Dallas, Houston, Austin, San Antonio, El Paso, the Hill Country, West Texas and the Gulf Coast each have their own layered scenery, moving wildlife and people, and lighting that follows the time of day. The original artwork remains available in the animation gallery.
- **Dallas is now live:** the finished skyline opening brings together Reunion Tower, Bank of America Plaza, the Margaret Hunt Hill Bridge and the Trinity River.
- Fort Worth features the Stockyards gate and three crossing longhorns; Houston has a space-park view; Austin and San Antonio frame the Capitol and Alamo. The natural openings add bluebonnets, desert ranges and a coastal pier with pelicans and surf.

### Fixed

- Texas openings use climate-appropriate seasonal decoration instead of automatic winter snow. Actual weather effects still follow live conditions, and reduced-motion preferences retain a still opening.
- Animation quality checks keep exceptions for retained original artwork separate from the rebuilt scenes. Every rebuilt Texas opening passes without an exception.

## [2.8.1] - 2026-10-08

### Changed

- **Find animations by location:** Settings > Animations now starts with a searchable gallery across every pack, with filters for pack, animation type and season. Matching places group their views, seasonal versions and retained original artwork together.
- **Compare old and new techniques:** every version is labeled Old technique or New technique. Where an opening was rebuilt, its retained original can be previewed alongside the new version; favourites and blocks stay shared between them.
- **See every time of day:** preview Live, Dawn, Day, Dusk or Night, or compare all four times together. Previewing a time leaves the dashboard clock and daily animation choices unchanged.
- Daily look, themes and pack switches sit in an expandable section below the gallery. Larger preview buttons, keyboard controls and a compact mobile layout make browsing easier.

## [2.8.0] - 2026-10-08

### Added

- **Connections > Money:** one place for every bank and wallet. *Your accounts* lists every account from every provider (rename, colour, *Show in Finances*, last sync, the date to sign in again by, *Sync now*, disconnect with keep or remove and Undo). A provider chooser with a bank search: Aureli (via Claude), Plasma One, Monzo, other UK and EU banks through Enable Banking, and CSV import, each with what it covers, its cost, limits, what you need and how long it takes.
- **Plasma One:** paste your public wallet address and it is added: USDT balance and transfers from the public Plasma blockchain, converted to pounds at each day's rate. Recovery phrases and private keys are refused.
- **Monzo, directly:** with your own free Monzo developer client. A 5-minute countdown to approve in the Monzo app brings in your full history; otherwise the last 90 days, with *Get full history* to try again. Pots show as balances.
- **Enable Banking:** UK and EU banks through open banking with your own free application and key file: *Is my bank supported?*, bank sign-in with a paste-the-address return, and reminders before a bank's access ends.
- **Possible duplicates:** an account connected twice (for example Monzo through Aureli and directly) starts hidden, so nothing is counted twice; choose *Keep this one* or *Keep the other*.
- Finances: *Connect a bank or wallet* on the welcome screen, and a banner when a bank needs you to sign in again.

### Changed

- Accounts switched off in Connections (*Show in Finances* off) are now left out of the Finances analysis; their transactions stay stored and come back when you show the account again.
- Every finance connector is read-only by construction: each provider has a fixed list of allowed requests, and anything else (payments, moving money to or from pots) is refused before it is sent. Credentials stay on this computer in the data folder's `secrets/fin/`, never on the page or in the logs.

### Fixed

- Exchange rates: the Frankfurter service moved to `api.frankfurter.dev`, and the old address's redirect was refused, so rates never loaded.
- Converted payments no longer turn each "(amount USD @ rate)" note into a separate merchant.
## [2.7.0] - 2026-10-08

### Added

- **28 openings rebuilt on the scene engine,** each in four seasons with the live sky: Tokyo, Shanghai, Hong Kong, Taipei, Guangzhou, Kuala Lumpur, Singapore (Marina Bay), Jakarta, Da Nang, Macau, Dubai, Baku, Riyadh, Vladivostok, Xi'an, Armenia, the Statue of Liberty in New York harbour, Boston, San Francisco, Seattle, Chicago, Cincinnati, Nashville, Philadelphia and Oklahoma City. Each keeps its place, caption and pin; the old hand-drawn art is still there for places not yet rebuilt.
- **About 50 new hand-drawn landmarks,** each with a night look: Tokyo Tower, the Skytree, the Oriental Pearl, Canton Tower, the Petronas Towers, the Burj Khalifa, the Flame Towers, Kingdom Centre, the Golden Gate Bridge, the Space Needle, the Willis Tower, the Roebling Bridge, Philadelphia City Hall and more.
- **73 more library objects** (222 in all): trees, plants, birds, boats, buildings, rail, street furniture and vehicles for East Asia, the tropics, cities and London stations.
- **Natural layered clouds** on the canvas: cumulus heaps with a flat shaded base, low stratus strips and high wisps chosen by cover and weather, in two or three depth bands (small, pale and slow in the distance; larger, brighter and faster up close), with a sun-side rim and a glowing base at sunrise and sunset.
- **Larger, more detailed people, sized by depth.** A new figure builder draws walking, running, seated and cycling people (no faces) with clothes, bags and umbrellas by season; the walker, jogger, dog-walker, family, cyclist, angler, commuters and busker all use it.
- `scene capture` records a looping animated GIF of one scene, with no dependencies.
- Packs outside a region (Texas) can now register a composed upgrade of a hand-drawn scene. Dallas is built and passes the quality bar, but is not shown yet.

### Changed

- The evening and live-sky overlay on hand-drawn scenes darkens the art in place and lights its lamps, and the Texas scenes use the same overlay. Subtropical scenes no longer get frost or snow flecks.
- Animated objects can glow at night, with their lit part moving with them.
- A scene's choice of trees and other objects no longer changes when new objects are added to the library.

### Fixed

- Release builds on CI: the scene test harness now follows reduced motion, a timing budget is wider on CI, and the release zip includes the animation tool's skill files.
- The chalk cliff and the pony's neck were redrawn; many library objects got review fixes (stations, rail, street, buildings, boats, birds, plants).

### Known issues

- The finished Mackinac Bridge and Dallas openings are not shown yet; they stay on the old art until the tests that guard going live are updated.
- Rebuilt openings in hot places (Riyadh, Dubai) can show falling leaves in autumn and snow in winter. This will be fixed in the engine.
- A few rebuilt openings are close to the laptop frame-time budget (for example Armenia, Dubai, Boston and Baku).

## [2.6.0] - 2026-10-07

### Added

- **Scene engine:** an object library (trees, plants, birds, animals, people, buildings, boats, landmarks) with variants, four seasons, night-lit versions and built-in motion; composed scenes as small recipes; a Canvas renderer that caches sprites, bakes still layers and redraws only what moves (about 10–20 times faster than the old SVG scenes).
- **Animation tooling:** the region framework and `tools/anim-pack.mjs` (lint, sheet, reference, new, status, brief, guard) plus object and scene commands, a new quality standard with speed budgets, archetypes and data tables for mass scenes, and safe place-name signage.
- **Yateley and Fleet:** 20 views rebuilt with the engine (Yateley Common, Wyndham's Pool, Yateley Green, Fleet Pond, the Basingstoke Canal), each in four seasons with the live sky.
- **Upgrade pilot:** Singapore, New York and Mount Fuji rebuilt to the new standard.

### Fixed

- Flicker and lag from animated scenes on Home, the sidebar logo and the gallery.

### Added

- Scene engine: scenes composed from a shared library of objects (trees, plants, birds, people, buildings, boats and landmarks drawn once, with variants, seasons and night lights), drawn on a canvas that bakes the still parts into layers, so only the moving parts cost anything per frame. Every scene follows the real sky, sun, moon, season and weather where you are.
- The Yateley Common, Yateley Green, Wyndham's Pool, Fleet Pond and Basingstoke Canal openings are rebuilt on the engine: the same places, views and pins, now with the live sky, the season by date and lit windows and lamps after dark.
- Draft composed versions of the Singapore, New York and Mount Fuji openings (not shown yet), and a London station demo.
- The Texas scenes now follow the real time of day (their own dusk and night light and lit windows), the real moon, the season and the live weather.

### Fixed

- The live-sky overlay on hand-drawn regional scenes no longer covers the land with a flat colour (the blend was isolated inside a masked group).

## [2.5.1] - 2026-10-06

### Fixed

- Connections cannot restore an old failure over a newer successful refresh. Sources are read after slow discovery finishes, so completed syncs appear immediately.
- Test now records and displays current readiness separately from the previous data-sync result. Tools-only checks say Tools ready; actual read checks can confirm sign-in recovery. Tests do not claim data has been synced or erase its sync history.
- Historical sync failures offer Retry sync rather than unnecessary reconnection. Real sign-in failures still require authentication; a tool-list check alone cannot clear them. Successful syncs clear equal-timestamp failures too.

## [2.5.0] - 2026-10-06

### Added

- One Link Claude action in Setup and Connections: reuse an existing Claude Code installation, install the official native helper only when missing, sign in through the browser when needed, and automatically add and verify OpenDash tools. Dashboard AI uses the local connection, without Claude Desktop, a domain or an OpenDash relay.
- Optional Open connected Claude action starts an official named Remote Control terminal and opens Claude Code in the browser. Finish Claude's own first-use confirmations and select OpenDash there; the terminal must remain running. Opening the terminal is not reported as a verified browser session.
- Optional operator-configured hosted MCP relay and personal gateway implementations, with OAuth, local matching-code approval and revocation. The shared relay is not enabled in this release; its public deployment still needs verification.
- Direct browser sign-in for personal Outlook/Hotmail and work or school Microsoft 365, with read-only email previews and calendars. Microsoft app registration is required before sign-in is available.

### Fixed

- Restricted Claude connector jobs load their read-only tools before startup checks, preventing newer Claude Code tool deferral from falsely reporting connected bank, email and calendar tools as missing. Failed reads remain visible in Connections until a later sync succeeds.
- Device location is checked during the brand splash before opening titles and nearby art are selected. The opening waits up to four seconds, shares the load request, respects skipping and falls back to the last known location.
- User-started Claude connector sign-ins verify and update their source automatically when returning to OpenDash.

## [2.4.7] - 2026-10-05

### Added

- Local location history: first-seen arrivals, fresh confirmed presence, bounded departure estimates, sampled presence duration, unobserved gaps, visit counts, country returns and straight-line displacement between observed stops. Device fixes retain timestamps, reported accuracy and optional altitude/speed/heading; manual selections remain separate. History stays in this browser, bounded to 90 days, 250 visits and 1,000 rounded observations, with review and Clear location history in Settings.
- Device mode watches for changes while the dashboard is visible, alongside fresh load/tab-return/manual checks and 15-minute polling. Hidden tabs and manual mode stop the watch; stale, future and inaccurate fixes cannot replace the last location. Offline city anchors can name nearby international cities without a new service.

### Changed

- Easter egg subtext uses actual country pairs, clock differences, latitude/longitude changes, distinct-place counts, visit counts, previous observed stays and estimated time away. Return timing uses departure bounds instead of the previous arrival; missing observation gaps cannot prove time spent or a month away.

## [2.4.6] - 2026-10-05

- Exact-location arrival scenes: the first three openings or five minutes prefer artwork of your actual town, then nearby scenes rotate normally. City artwork in US, Texas and Asian openings uses the same preference where available; blocked scenes remain excluded.

### Fixed

- Location welcomes now stop after three displayed openings or five minutes across US, Texas, Asian and other location scenes, preserving the location title after the prefix expires. Previously the limit only applied to UK scenes, so Boston, USA kept saying “Welcome to” on every reload.

### Changed

- Easter egg arrivals lead with the playful headline while keeping the location visible. Choosing a distant place manually can show a straight-line distance comparison and a scene-change message.

- 48 contextual travel Easter eggs: straight-line distance bands, country/hemisphere changes, clock shifts, repeat visits, busy location days, birthdays and local wordplay. Matching surprises follow a priority hierarchy, randomise equal tiers and rotate through unused messages for the first three displays or five minutes, whichever comes first; big journeys and travel patterns use selectively cheekier humour; timed Easter egg openings and welcome-home postcards last 2.5 seconds longer. Travel arrival dialogs remain dismissible at any time.

- Device location requests a fresh fix on every page load and Refresh today, checks again on tab return and every 15 minutes while visible, and works without the browser Permissions API. Failed fixes retain the last location; manual locations remain unchanged.
- UK town arrivals show “Welcome to” for three displayed openings or five minutes after detection, whichever comes first, including moves within one county. Device fixes must move at least 3 km and change the detected town/area; ordinary GPS drift does not restart the greeting. Counts and expiry persist on the device.

- Yateley live-sky foundation: the 48 seasonal scenes can use the effective clock, active coordinates, calculated daylight and solar height, night stars and the existing lunar-phase approximation. Other packs and continuous in-place sky updates remain follow-up work.

- Yateley detail follow-up across all 48 seasonal versions: fuller botanical sprays, layered grass clumps, gorse stems, textured ground and stones, duck feather markings, hovering bees, moving pond fish, perched birds, nibbling squirrels and a wagging dog tail. Reusable shape definitions keep the existing scene budget.

- Yateley seasons: all 12 rebuilt views now have spring, summer, autumn and winter versions (48 scenes, 36 added). Automatic local openings match the calendar season; spring brings blossom and fresh growth, summer flowering heath and active insects, autumn falling leaves, and winter snowfall, bare trees and frozen pond illustrations.

- Yateley art rebuild: 12 full-screen views across Yateley Common, Wyndham's Pool and Yateley Green, with individual birch leaves, flowering heather, detailed pond margins, swimming ducks and ducklings, darting dragonflies, flapping butterflies and a walking dog companion.

- UK-priority art follow-up: both Stanage Edge views replace the repeated slab silhouette with a receding escarpment, irregular rock planes, bedding cracks and grounded moorland slopes.

- UK animation art, first pass: stronger place palettes and different skies, horizons and ambient activity across 148 South East/London and 20 Northern scenes. North Hampshire adds heather, gorse, ferns and insects; selected landmarks gain structural detail, coastlines gain weathering and foam, and food scenes gain detailed still-life objects. The wider scene-by-scene review remains in progress.
- US and Asia scene toolkit: varied cloud formations and bird wing poses replace repeated outlines across the existing 229 full-screen scenes.


## [2.4.5] - 2026-10-05

### Added

- **AI day adviser:** Think through my day connects tasks, deadlines, calendar gaps, progress and repeated postponements into up to three practical next steps, with reasons. Uses the selected AI chat model.
- Optional automatic reviews once each morning, afternoon and evening while Home is open, capped at three automatic attempts daily. Manual reviews remain available. Proposed tasks and time windows are checked against current data; normal refreshes spend no AI usage.

## [2.4.3] - 2026-10-05

### Added

- Home has a **Refresh today** button beside Customise: updates ideas, the day-so-far summary and widgets using the current time, without regenerating AI text.

### Fixed

- Ideas refresh each minute and when returning to the tab; expired time windows disappear. After noon, Home shows a current day-so-far summary instead of stale morning advice. Refresh preserves note editors and focused widget controls.

## [2.4.2] - 2026-10-05

### Added

- UK Northern cities & Peaks: 20 animated full-screen scenes, with eight Sheffield views, eight Manchester views and four Peak District views, including The Diamond, Arts Tower and university heritage.

### Changed

- Settings offers one location source: Manual or Device. Device mode requests browser permission and refreshes an approximate location while the app is open. Manual mode keeps the selected town fixed.
- The automatic workspace icon uses a nearby animated mini illustration, or a miniature full scene when no local mini exists; chosen custom icons remain available.
- UK openings keep the current location as their title. Backgrounds rotate only among nearby places (approximately 25 km), with the actual landmark and county in the corner. A seasonal background fills gaps in local coverage.

## [2.4.0] - 2026-10-04

### Added

- **Animation packs for Asia.** Every Asian country and territory (52, from Turkey to Japan and Indonesia) opens with a hand-drawn full-screen scene and has a small symbol; every major city (80) has its own full-screen opening, and every smaller city or famous town (73) a small symbol of its own. They play where you are (the weather town or the travel city), the opening welcomes you to your city or country, and each pack can be switched off in Settings > Animations. See `docs/dev/ASIA_PACK.md`.

## [2.3.0] - 2026-10-04

### Added

- **Full-screen US openings.** Every US state and every big city (88 in all) now opens with its own hand-drawn full-screen scene: Maine's lighthouse in the fog, the Seattle skyline under Mount Rainier, Mount Rushmore, the Gateway Arch, a Kilauea night and more. Each is layered, moves in several places and lights up at dusk. They play where you are (the weather town or the travel city); see `docs/dev/US_PACK.md`.

### Changed

- Every opening now plays full screen. Festival, world-city, Texas and the plain daily openings that were small pictures are drawn large on a full-screen landscape of the season and the hour, and the plain daily opening now shows the day's actual opening instead of only a bare landscape.

## [2.2.6] - 2026-10-04

### Fixed

- Settings > Updates works on a copy whose files were copied over or that still points at another git repository: it now installs the checked release zip (with a backup) instead of refusing with "uncommitted changes". Only a clone of OpenDash itself updates through git.

## [2.2.5] - 2026-10-04

### Changed

- Connections brings account sources and local assistants into one consistent card layout, with bundled provider logos, search and status filters, account selection, clear setup states and an advanced MCP section. Other pages and first-run setup keep their existing layout.

## [2.2.4] - 2026-10-04

### Added

- 32 animated views around Yateley, Fleet and Farnborough: eight places with four views each. The South East and London pack now has 148 full-screen scenes.
- Nearby scenes appear twice for every wider county scene, using the existing weather or travel location offline. The place shown has its own title, without "Welcome to"; the landmark caption remains beneath it.

### Fixed

- Refreshing in the same UK county now advances through its full-screen scenes and variations. The signature scene introduces a county on arrival; explicit opening pins, blocked scenes and disabled packs remain respected.

## [2.2.3] - 2026-10-04

### Added

- 32 full-screen animated place studies: 16 in Hampshire and 16 in Kent, bringing the South East and London pack to 116 scenes. Each place has four distinct views, with layered motion and reduced-motion stills.
- Local town scene rotations with county fallback, and a paged animation gallery with town search.

## [2.2.2] - 2026-10-04

### Added

- **US animation packs.** Five regional packs (Northeast, Southeast, Midwest, Mountain West and Southwest, Pacific) give every state but Texas (which keeps its own pack) an opening scene and a symbol, plus an opening for 39 big cities and a symbol for 59 small cities and towns. They play only where you are (the weather town or the travel city), and the opening sequence welcomes you to your town or state. See `docs/dev/US_PACK.md`.

- UK pack: Kent, East Sussex, West Sussex, Surrey, Isle of Wight, Berkshire, Oxfordshire and Buckinghamshire (8 full-screen scenes each), plus Greater London (10). South East and London share one gallery pack with 84 scenes, including Hampshire's existing 10.
- Connections: shared assistant cards in setup and Connections, bundled provider marks, unified Claude and OpenDash tool setup, local Codex/Gemini CLI tool registration, and clear browser availability.
- UK county welcomes show the county's signature scene first, followed by a matching holiday or special-event animation. Skipping dismisses the whole sequence; blocked animations and disabled packs remain respected.
- Settings > Updates: Check for updates asks the project’s GitHub releases for the newest version (nothing about you is sent), shows what is new, and Update installs it: a release zip is downloaded, verified against its published SHA-256, swapped in (the replaced files are kept in the data folder’s update-backup) and the server rebuilds and restarts; a git checkout is fast-forwarded to the release tag. An optional once-a-day check is off by default. Palette: Check for updates, Update OpenDash.
- A Texas animation pack with nine full-screen scenes (the Hill Country in bluebonnets, a West Texas sunset, the Gulf Coast, the Fort Worth Stockyards, Dallas, a Houston liftoff, the Austin Capitol walk, the Alamo, El Paso's star) shown under "Welcome to <town>" when the app opens, plus Lone Star openings, symbols and celebrations, a big-sky sunset, a landmark for six Texas cities, and Texas Independence Day, San Jacinto Day, Juneteenth, bluebonnet and rodeo season and Friday night lights. It plays only in Texas (a travel city there, or a weather town within reach) and can be switched off in Settings > Animations.

## [2.2.1] - 2026-10-04

### Fixed

- Home editing is a proper grid editor: drag to move with a live drop preview, drag edges or the corner to resize, the other widgets reflow; keyboard moves and resizes; Undo.
- Stories always play full screen, with a volume slider and mute; task buttons in stories now really change the task, with Undo.
- The assistant suggests several changes at once, including adding people from meetings and tasks who are not in People yet.
- Finances shows Connect your bank at once when nothing is connected, and a timeout with Try again instead of loading forever.
- The MCP server list updates straight away after adding or removing a server; new Add to Claude Code button.
- Pick the workspace icon yourself (logo, initial, icon or emoji), or keep it automatic.
- First-run setup highlights the theme actually in use.

## [2.2.0] - 2026-10-04

OpenDash 2.2 "Alive": the animation update. This release also includes all
of the 2.1 "Do more from Home" work, which was not released separately.

### Highlights

- **Home and the morning brief are one page.** The big animated greeting,
  your day in three sentences, *Play my morning* and the Today / Evening /
  Week / History tabs sit on top of your widgets.
- **An animation library** behind everything animated, with a gallery to
  preview, favourite and block animations, a new look every day, and seven
  themes (Calm, Playful, Cinematic, Retro pixel, Hand-drawn, Paper cut-out,
  Neon night).
- **A full-screen opening:** OpenDash, a welcome to your county, then a scene
  from it. Settings > Animations > Opening: every load, first load of the
  day, or off.
- **The UK pack (first regions):** full-screen scenes for the South West and
  Hampshire; county detection is opt-in and offline. Other places get a
  seasonal landscape.
- **Moments across the app:** seasonal and festival days, real sunrise and
  sunset skies, story skins, streak flames, calendar event scenes, payday and
  budget moments, achievements, month and year recaps, a world pack for
  travel, and *make your own* animations drawn by the assistant.
- **Signature light/dark transition.**

### Fixed

- Start at login and the *Start server* button use a plain Node launcher
  (`tools/start-hidden.mjs`); the old script-host file is gone because
  Windows Defender flagged it.
- Settings that saved but did not redraw (story or page, read aloud, voice
  and speed, weekly review); the 12/24-hour clock is used everywhere; picking
  a time zone saves it.
- *Ignore* on "not in People yet" names now works for names of two or more
  words.
- Pin to top always puts pinned items first (Focus, board, sidebar).
- Home suggestions fill up to the chosen count and say why when they cannot.
- The Focus count from *Tune* is used everywhere; the List widget's Rows
  setting is respected.
- Sort and "show N" for the sidebar's Streams, Tags and People, with drag
  to reorder.

### Added

- **Travel and time zones.** The page and the server share one clock: it
  follows this computer by default, your configured zone becomes your *home*
  zone, and money days stay on home time. Settings > Travel & time has
  *Dashboard time* (follow this computer, always home time, or always one
  zone), the home time zone and the clock format. Optional, local-only trip
  detection (a time-zone change, travel in your calendar, payments abroad,
  optionally the browser's location reduced to the nearest city; no geo-IP),
  arrival, departure and welcome-home moments, a second clock for home time,
  meetings shown in both zones, jet-lag and public-holiday hints, and travel
  suggestions. People can have their own time zone. *Forget this trip* removes
  what the dashboard inferred about a trip.
- **Motion.** Settings > Animations has an *Intensity* control (Off, Subtle,
  Standard, Playful) with a live preview; page and section changes, lists and
  the theme switch animate, an opening animation plays on load, the sky scenes
  gain weather layers, and finishing things can play a small celebration.
  *Reduce motion* still keeps everything still.
- **People overhaul.** People open in their own centre card, like tasks (the
  side panel is still there); profile and cover pictures (upload, emoji or
  symbol, built-in covers, Gravatar as an opt-in); a List or Grid view with a
  show filter; and the People actions are back in reach: *Find people in
  emails*, *Check email*, *Review suggested links*, *Assign to tasks…* and
  *Link tasks…* per person.

- **Suggestions that do the thing.** One-click ideas on Home, in the Today
  hero, the Morning brief and the stories: block free time for your top task,
  book the hours a deadline needs, prep before a meeting, move your block when
  a meeting lands on it, answer an invitation, rebook a block that came and
  went, plan tomorrow's first block, roll over what slipped, set an estimate,
  nudge someone you are waiting on, reply to someone waiting on you, turn
  emails into tasks, follow up after a meeting, and pick up a stream that went
  quiet. The main button opens the normal editor already filled in (nothing is
  saved until you press *Save*); the small ✓ does it as offered, at once, with
  *Undo*. Settings > Suggestions has a switch for each kind. "Why am I seeing
  this?", *Not now* and *Stop these* on every card.
- **Writing to Google Calendar**: create, move, resize and edit events, and
  answer invitations, from the Calendar and from Home, with *Undo*. Blocking
  time makes a real calendar event linked to its task, never a stand-in task.
- **Sixteen new Home widgets** in Add widget: Quick capture, Fill the gap, Plan
  my day, Meeting prep, After meetings, Invites & clashes, Needs reply, I owe,
  Catch up, Deadline runway, Smart list, Habits & routines, Launchpad, Payday &
  safe to spend, Daily note and What changed. Some can be added more than once
  (Deadline runway, Smart list), and many have their own settings.
- **The Morning brief on Home**: your day in three sentences, the shape of the
  day as a track, tiles for deadlines, Focus and money, and ideas; the story
  plays inside the panel and can go full screen. Evening and weekly versions
  appear at their time.
- **Money story**: *Play story* on the Finances Overview plays a short,
  read-aloud recap of the month or week, with the Overview's own numbers.
- **Gmail drafts**: replies, nudges and thank-yous are saved as drafts in
  Gmail (in the right thread), never sent. Undo deletes the draft.
- **Working hours** (Settings > Profile) and **planned time slots**: plan a
  task for a time without moving its deadline; slots show dashed in Today's
  schedule and every Calendar view.
- **Daily note**: one running markdown note per day; MCP clients can read and
  add to it (`get_daynotes`, `save_daynote`); the in-app assistant is not
  given your notes.
- **Settings > Home**: Customise, the brief and suggestions panels, Hide
  amounts and working hours in one place.
- The demo data now gives every new widget and suggestion something to show.

### Changed

- Dragging a task onto a time in the week or day view plans a slot; the
  deadline stays where it was.
- New widgets that are shown by default appear in their natural place on an
  existing Home board (the Morning brief right under the hero), not at the end.
- The Today hero, Today's schedule, the brief and the stories count free time
  inside your working hours.
- "Today", due dates, the calendar, the brief, the stories and the assistant
  all use the same clock, so they agree on what day it is while you travel
  and on daylight-saving days. Backups, data exports and the transactions CSV
  are named after the home day.

### Security

- Sending email is impossible by design: every Claude run is denied the Gmail
  send, reply and forward tools, and the Gmail drafts profile allows exactly
  one planned draft call.
- Calendar writes and Gmail drafts refuse a Claude record that answers one
  call twice (a refusal followed by a forged "success").

## [2.0.0] - 2026-10-03

The first public release of OpenDash: a calm, local-first productivity
dashboard that runs on your own computer, keeps everything in one data folder
and has an optional Claude assistant. (It starts at 2.0.0 because it grew out
of earlier private builds; see the notes at the end.)

### Added

- **Home**: a customisable grid of widgets (drag, resize, hide, add back,
  reset; press and hold a widget's title to start): Today, with the date, weather and your day in a few sentences that
  link to what they mention; Focus (the tasks that matter now, which open in
  place with their subtasks); Today's schedule with its free stretches;
  Suggested links; Waiting on; Money; People today; This week; Countdowns.
  A new, empty Home shows three first steps instead.
- **Tasks**: streams (areas of work), priorities, tags, subtasks, people,
  recurring tasks, a planned day separate from the due date, time estimates,
  "won't do", pinning, notes and history. Today, Upcoming, All tasks, No date,
  Logbook and Wins, as a list or a board; search with operators
  (`#tag @person p1 is: due: stream:`), bulk edits, a Bin, and undo and redo
  everywhere. Tasks and calendar events open in a centre card or a side
  panel.
- **Quick add everywhere** with natural language: dates, times, repeats,
  priority, stream, tags, people and estimates in one line
  (`Send Alex the slides fri 3pm #work !p1 ~1h`).
- **Calendar**: month, week, day and agenda views next to your tasks; drag a
  task onto the week to plan it; your own notes and agenda on events; several
  calendars and sources, including iCal links. Other people's calendars start
  switched off, and Home, the brief and the stories keep to your own day.
- **Finances**: the money brief (how this pay cycle is going in three
  sentences, safe to spend a day, the bills before payday), then spending,
  categories, merchants, cash flow, recurring payments, budgets, transactions
  and "worth a look" flags. Import bank CSV exports with no connection at all,
  or sync read-only through a bank connector. Export every transaction to CSV.
- **People**: profiles, notes, who you owe and who is waiting on you, linked
  tasks (from tags and names in titles), next meeting, last contact and recent
  email.
- **Files & links**: attach folders, files, web links, GitHub repositories,
  pull requests and issues, Google Drive files and code snippets to tasks,
  streams and people; open, reveal and explore them.
- **Auto-linking**: point OpenDash at your workspace folders and it finds the
  folder, repository, meetings, emails, people and related tasks each task
  belongs to; confident links are attached for you (with Undo), the rest wait
  as suggestions.
- **Morning brief, Finish the day and the weekly review**, each as a page and
  as a full-screen story read aloud with your browser's speech voices, with a
  library of animated scenes. Optional weather from Open-Meteo.
- **Assistant** (optional, uses your own Claude Code sign-in): ask in plain
  words; it looks things up and proposes changes that you apply with a click.
  Also per-task chat, email triage suggestions and short AI summaries.
- **MCP server**: use OpenDash from Claude Code, T3 Code or Claude Desktop.
  It explains itself to any model, with safety rails: ISO dates only, duplicate
  checks, dry runs for bulk and destructive changes, undo for everything, and a
  propose-only mode.
- **Connections and data sources**: see what is connected and what it unlocks;
  add several banks, calendars and mailboxes from any MCP server your Claude
  can reach, always read-only.
- **Customisation**: right-click any stream, tag or person to rename it or
  change its colour, symbol and shape everywhere at once.
- **Your data in one folder**: automatic backups with one-click restore,
  export and import of all data, a clean copy of the app to share, reset, and
  a diagnostics report with personal details removed.
- **Server control**: a supervisor that restarts the server after a crash,
  Restart and Rebuild & restart from Settings, an offline page when the server
  is not running, and optional Windows start-up switches (off by default).
- **First-run welcome**: name, region, a starting set of streams, theme, and
  optional demo data.
- **Command palette** (Ctrl+K), keyboard shortcuts for everything, light, dark
  and automatic themes, and reduced motion.
- Launchers for Windows, macOS and Linux (`start-opendash.bat`,
  `start-opendash.sh`). Requires Node.js 20 or newer; no npm dependencies.
- Documentation in `docs/` (install, usage, connections, MCP, architecture,
  privacy and FAQ), and a contributing guide, code of conduct, security
  policy, support page and issue and pull request templates in `.github/`.

### Security

- The server listens on `127.0.0.1` only and checks the `Host`, `Origin` and
  `Sec-Fetch-Site` headers; local programs need a per-install token.
- No telemetry. Claude runs through your own Claude Code CLI with fixed,
  minimal tool profiles; connectors are used read-only; the assistant can only
  propose changes. See [SECURITY.md](../.github/SECURITY.md) and
  [PRIVACY.md](PRIVACY.md).
- Each release zip comes with `SHA256SUMS.txt` and a build-provenance
  attestation ([INSTALL.md](INSTALL.md#which-file-to-download)).

### Notes for people who used earlier private builds

- The app is now called **OpenDash**. The launchers are `start-opendash.bat`
  and `start-opendash.sh`; the old `start-dashboard.*` names still work.
- The data folder is upgraded automatically on first start (after a backup in
  `data/backups/`). Older layouts with a separate `state/` folder print the
  one command to run.
- An existing MCP install keeps working under the name it was added with
  (`dashboard`); see [MCP.md](MCP.md).
- The Boards feature was retired; its data is archived in
  `data/backups/boards-archive-<date>.json`.
- Finances no longer need Python.
- The direct Google sign-in of earlier builds is no longer used by any view;
  use the Claude connectors or an iCal link
  ([CONNECTIONS.md](CONNECTIONS.md#older-setups-google-without-claude)).

[Unreleased]: https://github.com/mahdi1190/opendash/compare/v2.14.0...HEAD
[2.14.0]: https://github.com/mahdi1190/opendash/compare/v2.13.0...v2.14.0
[2.13.0]: https://github.com/mahdi1190/opendash/compare/v2.12.0...v2.13.0
[2.12.0]: https://github.com/mahdi1190/opendash/compare/v2.11.0...v2.12.0
[2.11.0]: https://github.com/mahdi1190/opendash/compare/v2.10.0...v2.11.0
[2.10.0]: https://github.com/mahdi1190/opendash/compare/v2.9.0...v2.10.0
[2.9.0]: https://github.com/mahdi1190/opendash/compare/v2.8.1...v2.9.0
[2.8.1]: https://github.com/mahdi1190/opendash/compare/v2.8.0...v2.8.1
[2.8.0]: https://github.com/mahdi1190/opendash/compare/v2.7.0...v2.8.0
[2.7.0]: https://github.com/mahdi1190/opendash/compare/v2.6.0...v2.7.0
[2.6.0]: https://github.com/mahdi1190/opendash/compare/v2.5.1...v2.6.0
[2.5.1]: https://github.com/mahdi1190/opendash/compare/v2.5.0...v2.5.1
[2.5.0]: https://github.com/mahdi1190/opendash/compare/v2.4.7...v2.5.0
[2.4.7]: https://github.com/mahdi1190/opendash/compare/v2.4.6...v2.4.7
[2.4.6]: https://github.com/mahdi1190/opendash/compare/v2.4.5...v2.4.6
[2.4.5]: https://github.com/mahdi1190/opendash/compare/v2.4.3...v2.4.5
[2.4.3]: https://github.com/mahdi1190/opendash/compare/v2.4.2...v2.4.3
[2.4.2]: https://github.com/mahdi1190/opendash/compare/v2.4.0...v2.4.2
[2.4.0]: https://github.com/mahdi1190/opendash/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/mahdi1190/opendash/compare/v2.2.5...v2.3.0
[2.2.6]: https://github.com/mahdi1190/opendash/compare/v2.2.5...v2.2.6
[2.2.5]: https://github.com/mahdi1190/opendash/compare/v2.2.4...v2.2.5
[2.2.4]: https://github.com/mahdi1190/opendash/compare/v2.2.3...v2.2.4
[2.2.3]: https://github.com/mahdi1190/opendash/compare/v2.2.2...v2.2.3
[2.2.2]: https://github.com/mahdi1190/opendash/compare/v2.2.1...v2.2.2
[2.2.1]: https://github.com/mahdi1190/opendash/compare/v2.2.0...v2.2.1
[2.2.0]: https://github.com/mahdi1190/opendash/compare/v2.0.0...v2.2.0
[2.0.0]: https://github.com/mahdi1190/opendash/releases/tag/v2.0.0
