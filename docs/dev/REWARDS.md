# The reward map: everything in the garden leads somewhere

The owner, 1 Nov 2026: "make sure that all features somehow relate back to the dashboard, giving coins, unlockables etc, instead of just for fun everything has some form of reward. And maybe even things that lead to expanding the garden, designing the garden."

Code: `src/app/94-garden-rewards-0rules.js` (tables and sums, the assistant's engine reads it too), `-1art.js` (drawings), `-2game.js` (gifts, the yard, the bag, the land office), `-3home.js` (Home), `src/styles/94-garden-rewards.css`. If this file and the code differ, the code is right.

## The loop

- **Real work runs the game.** Coins still come from focus time and finished tasks through `gardenEconDay`, unchanged, at most 120 a day. Work now also earns specific things (table below).
- **Those things open the garden.** Pegs open paths early. Timber, stone and reeds take a little off land and buildings, and make design items at the builder's yard.
- **Home says what is next.** A calm card, "Garden: what's next", and one line on the "Your garden" card: "3 more finished tasks and you can open Foxglove steps". No pop-ups and no counts of what you did not do. The card is hidden by default like every Fun card: add it from Customise.

## What work earns (`GR_WORK`)

Worked out from the same data as the coins, so nothing is saved and every device agrees. Days before `GR_ECON.from` earn none of it, so an old save is not handed its whole past. A task finished within 5 minutes of being made counts for nothing, as it does for coins. Reopening a task takes its share back.

| For | You get | At most a day |
|---|---|---|
| Each finished task | 1 survey peg | 4 |
| Each finished task | 3 tickets | 12 |
| Every 2 finished tasks | 1 field stone | 2 |
| Every 25 minutes of focus | 1 timber | 4 |
| Every 15 minutes of focus | 1 ticket | 8 |
| Every 50 minutes of focus | 1 maggot bait | 2 |

## Materials (`GR_MATERIALS`), shown in Bag and market and in the yard

| Id | Name | Comes from | Spent on |
|---|---|---|---|
| `mat:peg` | Survey pegs | Finished tasks, first land | Opening a path early, way marker |
| `mat:timber` | Timber | Focus, pruning, milestones | Land, building, fences, paths, ground, log stack |
| `mat:stone` | Field stone | Finished tasks, digs, forage, milestones | Land, building, paths, ground, ornaments |
| `mat:reed` | Reeds | Fish and bugs caught, milestones | Land, building, fences, ground, sheaves |

## Rewards that lead to growth

- **A path opened early** (`gardenRewardOpenTrail`). Up to 2 levels before its gate opens, for 3 + half its level in pegs: 4 for Bramble path, 12 for Willow ways. The land along it can be bought 2 levels sooner too. Saved as the item `land:<trail id>`; `gardenLandsOpen` already opens what you own. Trails stay free at their level, so nobody is forced to pay pegs.
- **Materials off a price** (`gardenRewardOffer`). A second button on land and building rows: 3 coins off for each material, at most a fifth of the price. Pegs are not used for this.
- **Design items** at the builder's yard, under Play.

## Design items, for the garden designer (`GR_DESIGN`, read it through `gardenDesignRows(m)`)

Every one is a `GARDEN_DECOR` row (`craft: 1`, price 0, so it is not in the shop), goes in the bag as `decor:<id>`, is placed like any decoration, and reaches friends in the snapshot's `decor`. Ground styles are ground-layer pieces of 1 square in category `path`; the designer can tell them apart by `kind` in `GR_DESIGN`.

| Id | Name | Kind | Made from | Yours when |
|---|---|---|---|---|
| `rw-path-bark` | Bark path | path | 1 timber | From the start |
| `rw-path-cobble` | Cobbles | path | 2 stone | From the start |
| `rw-path-sleeper` | Old sleepers | path | 2 timber | Own 3 pieces of land |
| `rw-path-shell` | Shell path | path | 2 reeds, 2 tickets | Catch 10 kinds of fish |
| `rw-fence-hurdle` | Hazel hurdle | fence | 2 timber | From the start |
| `rw-fence-kerb` | Stone kerb | fence | 2 stone | Build 1 thing on your land |
| `rw-fence-rope` | Rope and posts | fence | 1 timber, 2 reeds | Catch 25 kinds of fish |
| `rw-ground-bark` | Bark chips | ground | 1 timber | From the start |
| `rw-ground-clover` | Clover lawn | ground | 1 reed, 2 tickets | Win 1 ribbon |
| `rw-ground-moss` | Moss | ground | 1 stone, 1 reed | Own 8 pieces of land |
| `rw-ground-sand` | Pale sand | ground | 1 stone, 1 reed | Catch 10 kinds of bug |
| `rw-ground-slate` | Slate chips | ground | 2 stone | Build 5 things on your land |
| `rw-orn-logs` | Log stack | ornament | 4 timber | From the start |
| `rw-orn-marker` | Way marker | ornament | 2 timber, 2 pegs | Open a path early |
| `rw-orn-cairn` | Little cairn | ornament | 3 stone | Learn 1 pattern of stars |
| `rw-orn-sheaf` | Reed sheaves | ornament | 3 reeds | Walk to the island |
| `rw-orn-urn` | Stone urn | ornament | 5 stone, 10 tickets | Own 25 pieces of land; one free at 12 star patterns |
| `rw-yard` | Builder's stack | ornament | Free, once | Your first material |

## Every feature: what it gives

"Before" comes from the docs and the code's ledger lines. **New** is what this branch adds. Where nothing is new, the feature already pays or shows something that matters. Things it gives through the ledger scan are in `GR_DAILY`, once-a-day hooks in `GR_DID`, milestones in `GR_ONCE`.

### Dashboard

| Feature | Before | New |
|---|---|---|
| Finished tasks | Coins, water, seed packets | Pegs, tickets, stone |
| Focus time | Coins, water, seed packets | Timber, tickets, bait |
| Streak | Up to 5 coins a day | |

### Growing

| Feature | Before | New |
|---|---|---|
| Planting, watering, feeding | XP, plants | |
| Picking | Crops, XP | 1 ticket per 6 picked, 3 a day |
| Pruning | XP, sometimes a seed | 1 timber per 3 pruned, 2 a day |
| Bouquets | Sells well, XP | 2 tickets each, 2 a day |
| Selling at the market | Coins inside `marketFish` and `marketBugs` | |
| Decorating | Shows in the world | Timber at 10 placed, stone at 50 |
| Daily tasks, weekly quests, ribbons | Coins, XP, items | First and fifth ribbon: tickets; first opens clover lawn |
| Crafting | Wearables, decorations, treats, XP | 1 ticket each, 3 a day |

### Land (GARDEN_PLAN.md)

| Feature | Before | New |
|---|---|---|
| Trails | Open with level, free | Can be opened early with pegs |
| Sections | Land to use | Pay part in materials; pegs, timber and stone at 1, 5, 15, 40 owned |
| The land features (way posts to stone circle) | Each its own use, listed in GARDEN_PLAN.md | Pay part in materials; stone and timber at 1, 5, 12 built |
| Dig spot, forage, help board, machines (all `lc` lines) | Coins, seeds, curios | 1 stone per 2, 2 a day |
| Curios and the museum | Shown; museum pays | Stone at 3 and 10 |
| Weekend cart, old key, walled garden, land kinds, land office | Things to buy | |

### Catching (CATCH_FEATURES.md)

| Feature | Before | New |
|---|---|---|
| Fishing, netting | Fish and bugs to sell, XP inside `xpFish` | 1 reed per 5 caught, 5 a day in all |
| Fish and bug books | XP per new kind | Reeds at 5, 25, 100 fish and 5, 25 bugs; shell path, rope, sand |
| Orders at the market | Coins | 3 tickets each, 2 a day |
| Tackle, setups, boat, smoker, lantern, jar, habitats, sugar | Change the fishing; show on you or in the world | |
| Old angler, legends, one that got away, thing in the lake | Stool, kettle, dog, hat, plaque, cast | |
| Treasure maps, festival, wanted board, lake records, rack | Decorations, rosettes, showing off | |
| Lake hall, let it go | Building grows, more of that fish | |
| Showcase, specimens, variants | Shown; variants sell for more inside the limit | |
| Gifts of catches | A friend gets them | 2 tickets each, 2 a day |

### Play (HUNDRED_PLAY.md)

| Feature | Before | New |
|---|---|---|
| Riddle, stones, agility, four in a row, birdsong, map, hide and seek | Tickets and XP inside `GP_ECON` | |
| The dig, fossils | Tickets, pieces, a skeleton | 1 stone per find, 2 a day |
| Cooking, cookbook | Dishes that do things, tickets | |
| Hen coop, knack, journeys, postcards, souvenirs | Eggs, finds, decorations | |
| Old mill, gardener's pages, marbles | Tickets, chair, jar, things standing | |
| Pet's diary | Nothing | 1 ticket a day on opening it |
| Prize stall | Spends tickets | More tickets reach it from work |

### The world (HUNDRED_WORLD.md)

| Feature | Before | New |
|---|---|---|
| Callers and gifts to them | A letter later | 2 tickets, once a day, for any caller gift or find |
| Letters, the last gardener | Things found, some paying once | Tickets at 1 and 5 letters read |
| Finds, rainbow's end, wassail, harvest supper | Pay once in the ledger | |
| Island, moon road, stopping place | A place to go | 3 reeds the first time; opens reed sheaves |
| Sit a while | Nothing, on purpose | 1 ticket and 1 XP a day. The old rule was "nothing counted": the owner's new words win |
| Night sky, owl | Patterns over your garden | Stone at 1, tickets at 4, a stone urn at all 12; opens the cairn |
| Mice | A drawing | 1 ticket a day |
| Footprints | Something to follow | 1 reed a day |
| Bird on your head | A bird | 2 tickets, once ever |
| Lantern night | A lantern on the water | 2 tickets a day |
| Midsummer fire | A jump | 1 timber and 2 tickets a day |
| Star nights, calendar, coming back | Things to see | Nothing added |
| Friends' lights, cairn, hidden parcels | Shown between friends | |

### Friends (GARDEN_TOGETHER.md)

| Feature | Before | New |
|---|---|---|
| Visiting a friend | Their garden | 2 tickets and 1 XP a day |
| Contests, group goals | Small coins inside their own daily limit | |
| Trades, gifts, the second line | Things change hands | |

**Still gives no reward, on purpose:** star nights, the calendar and coming back. Each is something to see with nothing to do.

## Limits

- **Nothing here pays a coin.** Play stays small next to work: the only coin value is materials off a price, at most 6 a day from play at 3 coins each, so 18 a day, against 120 from work.
- **Materials cannot be sold** (`gardenSellPrice` gives 0).
- **Play's tickets and XP go through `GP_ECON`:** 30 tickets and 20 XP a day whatever the source. Work's tickets are outside that, at most 20 a day more, so a day tops out at 50. Work does not count against what play can earn.
- **Play's materials** stop at `GR_ECON.matDay`, 6 a day. Milestones (`GR_ONCE`) are outside that, but each pays once ever.
- Prices, land, level gates on sections, `GARDEN_ECON` and `GARDEN_CATCH_ECON` are unchanged.

## What shows

Rule 22 in GARDEN_TOGETHER.md. What you own stands in the world:

- Design items are decorations: friends see them live and on a saved copy.
- A path opened early goes in the snapshot's `ls`, so a friend's copy opens it too. `gardenLandsClean` now lets a trail id through; an older app drops it and shows the gate.
- Your first material brings the Builder's stack, a decoration to put out. **It does not change with how much you hold:** materials and tickets are spending money, not things on show, and a friend does not see the count.

## Looks: things you hold and how buildings look

Code: `src/app/94-garden-style-*.js`. A look is never a stat: `gardenRod()` still decides how you fish. Under Play: "Things you hold" and "Paint the buildings".

- **Rod looks, net looks, things to carry** (`GARDEN_ROD_SKINS`, `GARDEN_NET_SKINS`, `GARDEN_HELD`). Each row says what it costs in coins, tickets or materials, and when it can be had: from the start, at a milestone from `gardenRewardCtx`, or in one season (then yours for good). Owned as the item `look:<id>`, worn in `prefs.lkRod`, `lkNet`, `lkHeld`. It cannot be sold.
- **Painting a building** (`GARDEN_BUILDINGS`, `GARDEN_BUILD_PARTS`). Each changed part costs materials (walls 1 timber and 1 reed, roof colour 1 stone and 1 reed, door 1 timber, awning colour 1 reed, awning 1 reed and 2 tickets, roof style 2 stone, sign 1 timber and 2 tickets). Going back to how it was built is free. Later colours and styles open with milestones. Stored by building id in `prefs.bk_<id>`, so moving a building keeps its look.
- **Themed decorations** (ids `dc-*`): seaside, cottage, spooky, festive, ruins. Some are in the shop, by level or season; those in `GR_DESIGN` are made at the yard.

Friends see all of it: `rk`, `nk`, `hd` in the look `g`, and `bk` in the snapshot. An older app drops them, and an id or number an app does not know draws nothing or draws as built.

Ids and table order are saved: never rename a row, reorder a table or reuse a number.

## Saves

No new state keys and no sync change. Work's goods are worked out, like seed packets. Gifts are ledger lines under `rwd.<day>.<thing>` (kind `pl`), once-only ones use `gpGrant` (`rw-<row>-<step>`). Old saves get the milestones they have already passed, once, the first time they open. Ids are stable: never rename or reuse a material, a design item or a row id, because the keys are built from them.

## Adding a reward

One row: `GR_DID` plus a one-line `gardenRewardDid('id')` where it happens, or `GR_DAILY` for anything the ledger already records, or `GR_ONCE` for a milestone (its count comes from `gardenRewardCtx`). No positions anywhere here: sections and trails go by id.
