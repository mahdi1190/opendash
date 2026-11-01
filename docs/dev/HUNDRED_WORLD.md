# The garden as a world: places, people, weather, festivals, the night sky, secrets

The owner, 1 Nov 2026: "SIGNIFICANT features that make everything more fun, helps explain things better, makes you more curious, makes things calm and peaceful and generally just nice. Take ideas of any game you can think of." Then: all of it in the garden and the game, and "far fewer creatures and objects" on screen.

This half is the world itself. Land, tackle and catching, and the play systems (mini-games, pets, crafting, quests, collections) belong to others: docs/dev/GARDEN_PLAN.md, docs/dev/CATCH_FEATURES.md, docs/dev/HUNDRED_PLAY.md.

Code: `src/app/94-garden-wonder-*.js`, styles `src/styles/94-garden-wonder.css`. Saved state: one new map, `state.garden.wd`, entry by entry (`lib/sync/model.mjs`), so two devices add up. An older device keeps the map untouched.

**Restraint is the design.** At most one caller in the garden at a time. Things that belong to an hour or a date are simply not there otherwise. A surprise never interrupts: it stands in the world until you walk up to it. Fun Off turns all of it off; Settings > Garden world turns each kind off.

## The list, in the order it gives the most joy

Status: **built** works in this branch; **next** is designed and not built. Feeling: F fun, E explains, C curious, Q calm.

| # | What | Feeling | Inspired by | Why it counts | Status |
|---|---|---|---|---|---|
| 1 | Callers: six characters who come by one at a time, each with their own reason and hour | F C | Animal Crossing | Someone is in your garden and it isn't you | built |
| 2 | They remember: lines worked out from what you really did (the carrots that weren't there last time, your best fish, how long you were away) | C F | Hades | "He noticed I moved the bench" | built |
| 3 | Give a caller something from your bag; a letter comes later about what became of it | F | Animal Crossing, Spiritfarer | A gift has a consequence days later | built |
| 4 | The snail post: a snail with a satchel brings every letter, very slowly, in the world. Catch her on the way | F Q | none, ours | People will tell a friend about the snail | built |
| 5 | Letters and postcards, kept in a box to read again | Q C | Animal Crossing | A reason to come back with no nagging | built |
| 6 | The last gardener: letters from whoever kept this garden before you, and things she left, found by following her words | C | Unpacking, Gone Home | A mystery that unfolds over weeks | built |
| 7 | Things buried, found by reading the clue and looking at the real place. No cross on the map | C | Zelda, treasure maps | You look at your garden differently | built |
| 8 | The island in the lake, walked to over stones that come up at dawn and dusk | C Q | A Short Hike | A place you can see all day and reach only at certain hours | built |
| 9 | The moon road: a road of moonlight across the lake on the nights round a full moon | C | Zelda | The strongest single image here | built |
| 10 | A stopping place: the island has no menus. They fade as you step on it and come back as you leave | Q | Journey | The app goes quiet by walking somewhere | built |
| 11 | Sit a while: on any seat, or the shore bench. Nothing asks anything, and a whole day passes over you | Q | Journey, Gris | The most peaceful minute in the app | built |
| 12 | The sky you can learn: lie down at night, join the stars, hear what each one means. Twelve, four a season, with the real moon | C E Q | Outer Wilds, real sky | It teaches you a sky, over a year | built |
| 13 | The owl who teaches the stars: only at night | E | Wise old characters | The lesson has a face | built |
| 14 | What you learn stays: the patterns you know stand over your garden at night, and friends see them | Q | Rule 22 | You can see someone's year | built |
| 15 | Friends' lights across the water: one small lamp per friend on the far shore after dusk, lit if they were in their garden today. Row over from it | Q F | Journey | Friends as lights in the dark, no feed, no counts | built |
| 16 | A stone for the cairn: when you visit a friend you can add a stone. It grows at their gate, over years | Q F | Pilgrim cairns, Journey | The quiet opposite of a like | built |
| 17 | Hide a parcel: leave a gift buried where you stand in a friend's garden. They hear something was left, and have to find it | F C | Geocaching | A gift becomes a game | built |
| 18 | The mice in your oldest tree: a tiny door. At dusk you can look in on a family with no idea you are there, and their house is made of your garden | C Q | Doll's houses, Unpacking | "They made a bed from my pumpkin" | built |
| 19 | Rainbow's end: the rainbow really does end somewhere, for as long as it lasts | C F | Folk tale | Pays off a joke the game was already making | built |
| 20 | Footprints: you leave them in snow and after rain, and so does something else. Follow them | C | Walden, Zelda | Weather that changes what you do | built |
| 21 | A bird on your head: stand still long enough | F | Zelda | The world rewards not doing anything | built |
| 22 | Coming back: being away is never a failure. The world shows it gently (a web on the gate, long grass, post waiting) and someone is glad | Q | Opposite of a streak | It reverses the guilt of every other app | built |
| 23 | A calendar of small days, read on the Keepsake box | E F | Stardew Valley | You know what is coming, and look forward | built |
| 24 | Lantern night: float a paper lantern out on the lake (first week of November) | Q | Toro nagashi | Quiet, and it stays with you | built |
| 25 | Harvest supper: a long table set with what you really grew this year, and everyone who called sits down | F Q | Stardew, Spiritfarer | It is your year on a table | built |
| 26 | Midsummer fire: a fire on the lane on the longest days, and you can jump it | F | Old midsummer | Something to do | built |
| 27 | Wassail: sing to your oldest tree in January | F C | Old custom | A real thing almost nobody knows | built |
| 28 | Star nights: real meteor showers on their real dates | C | The real sky | The game agrees with the real world | built |
| 29 | The ghost in the photograph: at one hour, in one place, the camera sees something you do not | C | Fatal Frame, ghost stories | "Look at this picture" | built (GARDEN_TOGETHER.md section 24) |
| 30 | The noon shadow: the sundial casts a true shadow by your clock, and at noon it points somewhere | C E | Zelda | A puzzle only your real clock can solve | next |
| 32 | The sound of where you are: rain, water, wind and crickets by place and hour, made on the fly | Q | Any good game | You would miss it if it stopped | next |
| 33 | The frozen lake: all winter you can walk on it, and fish through holes in the ice | F C | Old London frost fairs | "I walked across the lake" | built (GARDEN_TOGETHER.md section 24) |
| 34 | A fog morning, and the ferry that only comes then | C | Spiritfarer | Another way to the island | next |
| 35 | A friend's ghost: the faint figure of a friend walks the way they walked when they last visited | C Q | Dark Souls, Journey | Being somewhere after someone | next |
| 36 | Words left on the ground: leave a line from a phrase book in a friend's garden | F | Dark Souls | No free text, still personal | next |
| 37 | Bottle post: a bottle to a friend's lake that takes days to arrive | Q | Message in a bottle | Slow on purpose | built (GARDEN_TOGETHER.md section 24) |
| 38 | Wind days: gusts, leaves and cloud shadows you can see coming | Q | Any good game | Weather you can feel | next |
| 39 | A garden that remembers: an old plant tells you who planted it and what it has seen, and marks its birthday | Q | Dorfromantik | Years you can feel | next |
| 40 | The time capsule: bury a note to yourself, opened at first snow or in a year | Q C | Real life | A surprise you send yourself | next |
| 41 | Putting the garden to bed: a lamp to put out, and a day's end page (no diary) | Q | Animal Crossing | Gentle endings | built (GARDEN_TOGETHER.md section 24) |
| 42 | A season's page: at each season's end, one page of what happened | Q | Slay the Spire's run summary | A story of your own | next |

## How each part works

**The callers** (`94-garden-wonder-1folk.js`). `WD_FOLK` is one row per character; `WD_LINES` their words, each with a test of what really happened. They read only the garden: plants and when they were planted, decorations and when they were moved, the fish log, how long you have been gone. What they said is remembered entry by entry (`g.wd['fs.<id>.<line>']`), so nobody repeats themselves. At most one a day comes, from a seeded draw per day and per caller, so two tabs agree. They stay about eight minutes unless you have spoken and said goodbye.

**The post** (`94-garden-wonder-2post.js`). `WD_LETTERS` is one row per letter: who, the test for when it is due, how many days after what. Delivery is a walk: the snail starts on the lane and takes minutes to reach the post box. A letter's arrival is `g.wd['l.<id>'] = day`, read `g.wd['lr.<id>']`. A raised flag on the post box says something is waiting. No badge, no toast.

**Finds** (`94-garden-wonder-3finds.js`). `WD_FINDS` is one row per buried thing: where, within how many cells, optional hour or weather, the clue and what it is. An active find shows nothing until you stand within reach of it, then a glint you can click. Nothing is a coin farm: a find pays once, by id, in the ledger.

**The island** (`94-garden-wonder-4isle.js`). Its cells are never water (`gardenPropWalk` asks `_GD_WALK_EXTRA`, a set in the catalogue, like `_GD_WORKS`), so fish stay out of it and the rule is the same for everyone. The stones and the moon road add cells to the same set while open, and the walking grid is rebuilt then. On a visit they follow the owner's light and date. If you are on the island when the way closes, a little boat takes you back: you can never be stranded.

**Quiet** (`94-garden-wonder-5quiet.js`). Sit a while is an overlay over the stage and a class that hides the HUD. Nothing is saved or counted, on purpose.

**The sky** (`94-garden-wonder-6sky.js`). `WD_STARS` is one row per pattern: the season it is up, its stars and its lines. `g.wd['sk.<id>'] = day`. The snapshot carries `wd: {sk: [ids]}` (ids only; an older app drops it), so a visitor sees the same patterns in your sky.

**Friends** (`94-garden-wonder-7friends.js`). Far lights read the snapshots you already hold; nothing new is sent. A stone is a new `react` id, `stone`, so it goes through the existing sealed `garden:act`, its strict schema and its daily caps, and an older app simply drops it. A hidden parcel is the existing gift with `x` and `y`; `normAct` used to drop them on a gift. Old app: an ordinary parcel. It can always be opened at the post box too, so nothing can be lost.

**The mice** (`94-garden-wonder-8mice.js`). A drawing, not a game, worked out from your save. A new visit finds something changed.

**Festivals** (`94-garden-wonder-9days.js`). `WD_DAYS` is one row per day: dates, name, words for the calendar, and what stands in the world. South of the equator the dates move six months.

**Weather** (`94-garden-wonder-a-weather.js`). Footprints are one path in one sprite, redrawn from a short list after a repaint. `rainbow` wraps the existing effect, no core change.

## With the play plan (docs/dev/HUNDRED_PLAY.md)

- Its old gardener's pages and these letters are about the same place, on purpose. He kept the back and the mill, and wrote pages; his sister, W., kept the front, and writes letters. Each stands alone, and if you do both, each explains the other's silence.
- Hiding a gift for a friend is built here (row 17); the play plan lists it as next, so it should not be built twice. Birdsong and tunes, and the kite, are theirs: rows for them were taken out here.

## World cells

The garden map is moving, so every position is worked out from `GARDEN_AREAS` and `GARDEN_PROPS`, in two tables, each marked `// world cells`: `WD_AT` in `94-garden-wonder-0kit.js` (the island, the way across, the bench, the rug, the cairn, the far lamps and the rest) and `WD_FINDS` in `94-garden-wonder-3finds.js` (each buried thing, so a clue stays true). Callers and the snail are placed relative to you or to `WD_AT`. Two clues name a place in words ("by the notice board", "past the sundial"): keep them true if those props change neighbours.

## Honest limits

- Callers, letters and finds are your own: a friend in your garden does not see your caller. What friends do see: your stars, your cairn, the island and its open way.
- Fun Off means none of this appears. The island and its stones stay, because they are the land.
- Next round is the rows marked next above, each designed.
