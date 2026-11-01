# The catching overhaul: tackle, setups, spots, events and the new things at the lake

The owner, 1 November 2026: "make catching certain fishes unique and we need a setup, doing certain things increases the probability ... add up to 50 features of similar vein that I did not think of", and then: "50 new things that should surprise me and are actually of significance". So this is **20 significant things and not 50**. Filling the list with small ones would have missed what was asked. What comes next is at the bottom.

Code: `94-garden-fish-0tackle.js` (tables), `-8catch.js` (engine), `-8reel.js` (the reel game), `-9world.js` (what you see), `-9page.js` (the pages), `styles/94-garden-fish2.css`. The contract with the other two parts is `gardenTackleOwned`, `gardenTackleInUse`, `gardenEventOn`, `gardenSpotAt`, and a fish's `needs`.

**Positions.** Everything in the world comes from `GARDEN_SPOTS`, `GARDEN_CATCH_CELLS` (both marked `// world cells`), the rows in `GARDEN_PROPS` (`lake-hall`, `lake-board`, `old-angler`, `smoker`), or the lake's water (`gardenLakeWater()`). Moving the map means changing those tables.

**Visitor column.** "Copy" means it is drawn from `ca` in the snapshot, and the snapshot came back through `gardenSnapshotClean` with it in. "Look" means a fake guest's `g` look was drawn on the host's stage. **Nothing here has been seen by a real second computer in a real visit.**

## The groundwork

| What | Level | Cost | What it does | Visitor |
|---|---|---|---|---|
| 4 more reels | 3, 5, 8, 12 | 70, 170, 420, 950 | The bar lifts quicker, the meter fills quicker, line tension falls quicker; the deep and golden ones take a round off the biggest fish. Reel shows on your back and on the rod | Look; reel on the rod in hand is your own screen only |
| 3 more lines | 4, 7, 10 | 100, 260, 560 | How much tension it takes, and how shy fish feel about it. The line on the water takes its colour | Look; the colour is set in `94-garden-live-4fx.js`, not seen |
| 3 more hooks | 3, 6, 11 | 50, 140, 720 | Big fish keener, small ones not; better stars on a clean fight; longer to strike | Click a person: in their row of gear. Not otherwise visible |
| 8 new baits | 2 to 7 | 6 to 24 a pack | Each is loved by a kind of fish (top feeders, bottom feeders, hunters, grazers): twice as keen. A dot of colour under your float | Lure drawn under their float: not seen |
| Setups | any | free | What you have on, what it is good for and what to mind. 3 saved setups, one tap. Also on the garden's side card | Same as what is on |
| A line a fish ignores | any | | A fish's `needs` (rod, reel, line, hook, bait): it swims by and the HUD says why in plain words. The host decides from the guest's look | Function run with a fake guest's set. No fish names `needs` until the catalogue merges |
| Reel game: dart, sulk, run, leap | any | | Fish under difficulty 4 only swim. Words on the reel say what to do | Own screen. A leap splashes in the lake on your screen only |
| Line tension and snapping | any | | Difficulty 5.5 up. Holding through a run snaps a weak line | Own screen |
| Rounds | any | | Difficulty 7 up: 2 rounds; 9 up or 150 cm: 3 | Own screen |
| 7 spots | any | | Reed bank, lily pads, weed bed, sunken log, cold spring, drop-off, old wreck: drawn in the water. Fish there are 25% keener | Same on every screen, from the table |
| 7 events | any | | Frenzy, fog, storm, shooting stars, red moon, festival, spawning. Worked out from the day and hour, so no message is needed. A note on the stage in plain words | Same clock on every screen: not seen on two |
| What raises the odds | any | | Chum at a spot (feeds it for an hour), a run of catches, reeds, hot spot, events, fish you let go | Fed spots in the copy |

## The 20 new things

| # | What | Feeling | Level | Cost | What it does | Visitor |
|---|---|---|---|---|---|---|
| 1 | Your own rowing boat | Fun | 6 | 650 | Row anywhere on the lake and fish from it: out to the old wreck with no long pier | Hull on the figure, flag and oars on the moored boat. Hull not seen on a guest |
| 2 | The lake hall | Curious, fun | any | a fish a time | Give one of each. Tent, hut, hall, tower, great hall as it grows. A long tank you scroll along | Copy: building and up to 24 fish |
| 3 | The old angler | Fun, explains | any | | Sits by the pier, teaches you by giving 14 jobs, remembers. Gets a stool, a kettle, a dog. One new job a day after the third | Copy: what he has by him |
| 4 | Four legends | Curious | 9 to 12 | | His last jobs are his stories. That fish shows rings on the water and comes more often while you are on it. Then a golden hat, and a plaque | Rings in the fish list, not seen |
| 5 | The one that got away | Fun | any | | A fish you lose in the fight comes back later, trailing your line and float. Land it and the card tells the story | Mark in the fish list, not seen |
| 6 | The thing in the lake | Curious | any | | A huge shadow on foggy nights that nobody can catch. Five sightings unlock five clues, then a plaster cast | Same clock: not seen on two |
| 7 | Treasure maps | Curious | 3 | | Four torn pieces come up with your catches. Cast on the cross and haul up a chest. Three maps, each giving a decoration | The decoration, placed |
| 8 | Today's rack | Fun | any | | Your best five of the day hang by the pier, at their real sizes | Copy |
| 9 | Let it go | Calm | any | a fish | It swims off as a real shadow, that kind is three times as common for a week, and the lily pads grow | Copy, and the shadow is in the fish list |
| 10 | Every lake is different | Curious, fun | any | | Each lake is known for four fish of its own. A reason to fish at a friend's | Copy: the visit page names them |
| 11 | Gulls and the forecast | Explains | any | | Gulls circle today's hot spot, the same for everyone, so you can tell a friend. The lake board shows the map, the poster and the record | Same on every screen |
| 12 | Festival and bug-off | Fun | any | | Second and fourth Saturdays. Flags along the shore, weigh in for a rosette you can put out | Flags from the date. Rosette when placed |
| 13 | Wanted this week | Fun | any | | A silhouette on the poster, the same for all your friends, with a board of who has the biggest | Copy: each friend's best |
| 14 | Lake records | Fun | any | | The biggest three ever caught in your lake, by you or by a guest with their name | Copy, without names |
| 15 | The smoker | Calm | 5 | 220 | Three fish in, four hours, smoke rises while it works. A meal gives a wider bar and more time to strike for 30 minutes, with steam coming off you | Copy for the smoke, look for the steam |
| 16 | The second line | Fun | any | | A monster on someone's line: a button lets a friend grab hold. The bar widens, tension eases, and everyone sees two lines at one float | **Never run with two people** |
| 17 | Firefly jar | Calm | 2 | 25, then 3 fireflies | One on your hip that lights up as you catch them, and a jar decoration that wakes at dusk | Look, and the decoration |
| 18 | Hand lantern | Calm | 3 | 80 | Lit on your belt at dusk. Night bugs come to you with no lamp in the garden | Look |
| 19 | Sugar on a tree | Curious | 4 | 12 for 2 | Paint a tree, come back two hours later: a rarer bug is on it | Copy: the patch on the trunk, not looked at |
| 20 | Bug habitats | Explains | 3 to 5 | 30 to 45 | Log pile, butterfly bush, moth sheet: that kind comes up to five times as often, and never more bugs at once | Decorations in the copy |

Smaller, not counted above: **Get ready** on every fish in the book (what it needs, put it on, walk there and cast, tell me when); a **fishing diary**; a flame over your head for a run of catches; junk made into a boot planter and tin can chimes.

## Run and not run

Run once in a sandbox with made-up data and no browser exceptions, before the last small edits: buying, setups, why-not words, spots, the event table, a landing (rack, record, job), letting go, the hall, the smoker and meal, the spawn plan, the host reading a fake guest's set, the art in the page, boat in and out, the snapshot round trip, the Tackle, Lake and Hall tabs.

The reel game was simulated in Node, 60 fights a case: a player who lets go in a run lands nearly everything; one who holds on snapped 31 of 60 pikes on plain line and 2 of 60 on braid. Minnows come in 49 to 53 times out of 60 for a simple bot.

Not run: treasure maps, festival weigh-in, wanted board with friends, sugar, habitats in play, lantern bugs, pins, the second line, a guest's real visit, any fish with real `needs`, legends and the one that got away reeled in for real. The real reel was opened in the browser but the headless page ran too few frames to play it through, so snapping there was not seen. The last fog, lily pad and button placement edits were not looked at again.

## Next, if wanted

Ice fishing in winter with holes you drill, a beetle derby, a fish pond you stock and breed in, your pet sitting by you on the pier.
