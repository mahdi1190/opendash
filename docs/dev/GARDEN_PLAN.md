# The garden's land and what you can do on it

The owner, 1 Nov 2026: "all of the purchasable land is WAY TOO BIG ... split into way more paths and sections that go up and down not just across, different kinds of lands ... we can still buy stuff but not entire plots ... come up with at least 20-30 cool features". Then: "make everything less square", and "if we buy items it should appear and show in the garden and we can see each other's stuff".

Tables: `src/app/94-garden-lands-0table.js`. Engine: `94-garden-lands-1core.js`. Drawing: `94-garden-lands-2art.js`. Bubbles and the land office: `94-garden-lands-3page.js`. This file's tables were written from the code's tables; if they differ, the code is right.

## The map

The world is 52 by 44 cells (the wire allows 64 by 64). The old garden is the middle (x 12-39, y 8-18). The lane runs right through the world under it (y 19-20), with the shops on it, and the lake lies below (x 12-39, y 21-37). North is the hill (meadows and stones), east the orchards, west the fields, and south, reached round the lake by a path on each shore, the marsh. There are 128 small sections and 21 trails, one character a cell, in `GARDEN_LAND_MAPS`: letters are sections, signs and digits are trails, `#` is thicket, rock or reeds, where trees stand and nobody walks.

- A **trail** opens with your garden level. It has a small gate and a sign until then. It costs nothing. You walk on it; nothing grows on it and nothing stands in the way on it.
- A **section** in the old garden is free at its level. Anywhere else it needs its level, its trail open, and coins. It is fenced where it faces land you can stand on.
- What is drawn follows the cells loosely: a section's outline is traced round its cells and rounded off, a trail is a curve that stays inside its cells. Walking and planting are still on the cell grid.

## Prices, and a player earning at the cap

Coins come from focus time and finished tasks, at most 120 a day (`GARDEN_ECON.dayCap`), plus about 19 a day from daily tasks and 33 a day from weekly quests: about 170 a day before selling anything. XP is about 80 a day for someone playing every day.

| Stage | Levels | Sections | Coins for all of it | Features | Coins for all of them | About how long at 170 a day |
|---|---|---|---|---|---|---|
| Early | 1-5 | 41 | 1,420 | 7 | 530 | 11 days |
| Mid | 6-12 | 52 | 10,630 | 20 | 4,870 | 91 days |
| Late | 13 and up | 35 | 25,140 | 4 | 5,800 | 182 days |

All of it: 48,390 coins, about 41 weeks of steady play. Levels hold it back too: level 12 is 3,300 XP (about 6 weeks), level 20 is 9,500 (about 4 months). 

## Saved games

The owner: "because the game is in alpha, if it means destroying existing gardens, that is fine." `GARDEN_WORLD.v` is the world's version. The first time a save from an older world is seen (`gardenWorldCheck`): everything planted goes back as its seed (the old oak moves), everything placed goes back in the bag, a friend's decoration goes back to them, land and buildings are paid back in coins (the boots stay), what is in a kettle or under the oak is paid out, and a short note says so. Coins, level, XP, the books, gear and everything else that is not a position stay.

It runs once and is safe across a sync: each refund has its own ledger key, the same on every device, so doing it twice adds nothing. `seen.world` and `seen.worldAt` sync. An old plant or decoration that another device's copy brings back later goes to the bag the same way. A device still on an older app can go on writing old cells until it updates.

## Friends

`wv` in a snapshot says which world its cells are in. A copy from another world is not drawn: it says the garden is from an older version. An older app cannot read `wv`, so it will draw a newer friend's cells wrongly until it updates. `GL_V` is 3, so live play refuses a mismatch with its existing note.

`areas` stays at most 12 ids of `GARDEN_AREAS`. The land is beside it: `ls` (sections bought), `lf` (features built), `lc` (curios and the key), `lz` (stars logged), `lr` (garden stars). Ids and one number: no names, no text.

A live garden gets a fresh snapshot as soon as the host buys land, builds or finds something (`opendash:garden` kinds `land` and `landshow`, `94-garden-live-3host.js`). On a friend's land everything is read-only, except that you can use their way posts and climb their lookout, and their land office shows what they have.

## The rule: everything shows

Whatever you buy or find has a drawing in the world, and a visitor sees that same drawing. A section is drawn by its kind. A feature is its own prop. Curios each have their own small drawing, laid out on a table on the lane until a museum takes them into its glass case. The stars you have logged go up on the board beside the observatory, each its own shape. Garden stars show filled on their board. Even the stout boots stand by the land office door.

The exceptions are not things you own: today's dig spot, today's forage and the weekend cart are your own day's luck and are not sent to friends. What they give you does show (a curio on the table, a plant in a bed, a decoration where you put it).

## Features

| # | What | Level | Coins | Where | What it does |
|---|---|---|---|---|---|
| 1 | Way posts (5) | 2, 8, 9, 9, 11 | 30, 100, 120, 120, 150 | On the lane (37, 19); Seedling rows (10, 13); Orchid slope (24, 2); Marigold bank (0, 29); Walnut shade (49, 8) | Build two and you can hop between them. Friends can use yours. |
| 2 | Village well | 2 | 40 | Well green (22, 10) | Draw a bucket once a day: two more cans of water. |
| 3 | Lucky stone | 3 | 50 | Bandstand green (23, 16) | Knock on it once a day. A few coins always fall out, nobody knows why. |
| 4 | Rain barrel | 3 | 60 | Well green (23, 10) | Three more cans of water every day. |
| 5 | Worm bin | 4 | 80 | Long beds (15, 17) | A bag of free fertiliser every two days. |
| 6 | Seasons arch | 5 | 120 | Fountain green (27, 11) | Changes with the year, and leaves you a free seed each season. |
| 7 | Stout boots | 5 | 150 | On the lane (17, 19) | You walk a good bit faster everywhere. They stand by the shops when you are not in them. |
| 8 | Garden stars board | 6 | 120 | Shore green (33, 17) | Rates your garden out of five stars and pays for each one. Friends can read it. |
| 9 | Scarecrow | 6 | 140 | Allotment row (4, 17) | Plants near it grow a tenth faster. Dresses for the season. |
| 10 | Bee skeps | 6 | 160 | Foxglove strip (16, 5) | Old straw hives: a jar of honey every two days. |
| 11 | Bandstand | 6 | 300 | Bandstand green (24, 16) | The middle of the village. Stop and listen once a day for a little experience. |
| 12 | Help wanted board | 7 | 150 | Shore green (34, 17) | A neighbour asks for something you grow, once a week, and pays well for it. |
| 13 | Jam kettle | 7 | 220 | Windfall corner (47, 16) | Five pieces of fruit, a day on the stove, and it sells for much more. |
| 14 | The windmill | 7 | 380 | Sunny doorstep (26, 5) | Up on the hill, where you can see it from the village. A little flour money every day. |
| 15 | Seed swap shelf | 8 | 180 | Cider nook (50, 15) | Once a day, leave five common seeds and take a better one. |
| 16 | Drying rack | 8 | 260 | Thyme terrace (12, 2) | Five bunches of herbs, two days in the air, three times the price. |
| 17 | Spring rill | 9 | 320 | Potato ground (0, 13) | A little spring: everything planted near it is watered every morning. |
| 18 | Village fountain | 9 | 450 | The green (24, 13) | People throw coins in it. Nobody will mind if you tidy a few away each day. |
| 19 | Lantern walk | 10 | 240 | Bandstand green (26, 16) | Lamps along the lane that come on at dusk. Friends see them too. |
| 20 | Little museum | 10 | 500 | The green (26, 13) | Show the curios you dig up, and be paid as the collection grows. Friends can look in. |
| 21 | Dew stone | 11 | 260 | Fern hollow (15, 4) | Go there at dawn: five more cans of water for the day. |
| 22 | Lookout tower | 11 | 300 | The long view (21, 0) | Climb up and see the whole of your land. Friends can climb it too. |
| 23 | Savings oak | 12 | 400 | Bluebell wood (40, 9) | Bury coins at its roots. In a week they come back with a little more. |
| 24 | Hedge maze | 14 | 900 | The maze ground (0, 4) | A little maze with a chest in the middle, full again every week. Friends can get lost in it. |
| 25 | Observatory | 15 | 1400 | High pasture (30, 0) | At night, log the stars you can see. Twelve to find in all. |
| 26 | Moon stone | 16 | 1100 | Otter holt (8, 33) | Only at night: it gathers water that feeds a plant like fertiliser, and it glows. |
| 27 | Stone circle | 20 | 2400 | Mist meadow (15, 40) | Stand in it once each season for a big share of experience and a rare seed. |
| 28 | Daily dig spot | any | free | A little cross on the lane, a trail or your land, a new place each day | Dig it up: coins, a seed, fertiliser or a curio. |
| 29 | Curios and the finds table | any | free | The table on the lane (40, 19), then the museum | 20 to find, each with its own drawing. The museum pays at 5, 10, 15 and 20. |
| 30 | Seasonal forage | 3 | free | Up to two a day, in wild land you own | Primroses, wild strawberries, brambles or holly, by the season. Sometimes a curio. |
| 31 | The weekend cart | 6 | prices on it | On the lane (43, 20), Saturdays and Sundays | Three seeds and a decoration you may not have reached yet. One of each. |
| 32 | The old key and the walled garden | 12, then 15 | 1,200 | A key dug up from level 12; the garden is up the east orchards | A secret: a walled sun trap behind a rusty gate. |
| 33 | Land kinds | by section | by section | Rich soil, the nursery, sun traps, warm glades, pools | Rich soil grows 15% faster, the nursery 30%; sun traps and warm glades are always in season; pools take pond plants; glades grow exotics out of doors. |
| 34 | Trails and the land office | by trail | free | Land office on the lane (24, 19), or Land in the menu | Paths that open with your level, and one page of what you can buy, build and reach for next. |

## Trails

| Trail | Opens at level | Leads on from |
|---|---|---|
| The heart path | 1 | The lane |
| Cottage path | 1 | The lane |
| Pond path | 1 | The lane |
| Bramble path | 2 | The heart path |
| Carrot row | 3 | The lane |
| Orchard steps | 5 | Cottage path |
| Foxglove steps | 5 | Bramble path |
| Apple walk | 6 | The lane |
| West shore path | 6 | The lane |
| The boardwalk | 7 | West shore path |
| Cider lane | 8 | The lane |
| Bean walk | 8 | Carrot row |
| Ridge walk | 9 | Foxglove steps |
| East shore path | 9 | The lane |
| Pear steps | 11 | Apple walk |
| Over the top | 12 | Ridge walk |
| Cabbage steps | 13 | Bean walk |
| South shore walk | 14 | The boardwalk |
| Old wall walk | 15 | Pear steps |
| Deep rows | 17 | Cabbage steps |
| Willow ways | 18 | South shore walk |

## Sections

| Section | Direction | Kind | Squares | Level | Coins | Reached from |
|---|---|---|---|---|---|---|
| Front bed | core | Flower bed | 14 | 1 | free | The heart path |
| Cottage bed | core | Flower bed | 13 | 1 | free | Cottage path |
| The green | core | The green | 14 | 1 | free | The heart path |
| Bandstand green | core | The green | 10 | 1 | free | The heart path |
| Well green | core | The green | 7 | 1 | free | The heart path |
| Fountain green | core | The green | 10 | 1 | free | The heart path |
| Little green | core | The green | 4 | 1 | free | The heart path |
| Shore green | core | The green | 8 | 1 | free | The lane |
| Shop green | core | The green | 4 | 1 | free | The heart path |
| Gate patch | core | The green | 2 | 1 | free | Pond path |
| Notice green | core | The green | 4 | 1 | free | Pond path |
| Rose corner | core | Flower bed | 10 | 2 | free | Cottage path |
| Clover corner | north | Meadow | 5 | 2 | 30 | Bramble path |
| Buttercup bank | north | Meadow | 4 | 2 | 40 | Bramble path |
| Bean rows | core | Veg patch | 6 | 3 | free | Cottage path |
| Salad patch | core | Veg patch | 4 | 3 | free | Cottage path |
| Cabbage corner | core | Veg patch | 4 | 3 | free | Cottage path |
| Long beds | core | Veg patch | 11 | 3 | free | Cottage path |
| First furrow | west | Veg plot | 6 | 3 | 40 | The lane |
| Sunny doorstep | north | Herb terrace | 7 | 3 | 60 | Bramble path |
| Blackbird corner | north | Fruit bed | 6 | 3 | 70 | Bramble path |
| Allotment row | west | Veg plot | 12 | 3 | 90 | The lane |
| Deer corner | core | Little wood | 6 | 4 | free | Pond path |
| Bracken dip | core | Little wood | 4 | 4 | free | Pond path |
| The old logs | core | Little wood | 10 | 4 | free | Pond path |
| Badger bank | core | Little wood | 7 | 4 | free | The lane |
| Gate pear | east | Orchard row | 4 | 4 | 60 | The lane |
| Salad strip | west | Veg plot | 7 | 4 | 70 | Carrot row |
| Frog steps | swest | Reedy bank | 8 | 4 | 70 | The lane |
| Windfall corner | east | Orchard row | 6 | 4 | 80 | The lane |
| Bean corner | west | Veg plot | 6 | 4 | 80 | The lane |
| Onion bed | west | Veg plot | 4 | 4 | 90 | Carrot row |
| The old apple | core | Orchard row | 12 | 5 | free | Orchard steps |
| Pear corner | core | Orchard row | 7 | 5 | free | Orchard steps |
| Plum row | core | Orchard row | 8 | 5 | free | Orchard steps |
| Foxglove strip | north | Shady dell | 13 | 5 | 90 | Foxglove steps |
| Fern hollow | north | Shady dell | 12 | 5 | 100 | Foxglove steps |
| Kingcup corner | swest | Reedy bank | 5 | 5 | 100 | The lane |
| Crab apple row | east | Orchard row | 6 | 5 | 110 | The lane |
| The old plum | east | Orchard row | 8 | 5 | 120 | The lane |
| Bulrush edge | seast | Reedy bank | 5 | 5 | 120 | The lane |
| Warm stones | north | Rock garden | 5 | 6 | 140 | Bramble path |
| Strawberry bank | swest | Fruit bed | 10 | 6 | 140 | West shore path |
| Thyme terrace | north | Herb terrace | 14 | 6 | 150 | Foxglove steps |
| Pumpkin nook | west | Rich black soil | 10 | 6 | 150 | Carrot row |
| Apple row | east | Orchard row | 10 | 6 | 170 | Apple walk |
| The pond | core | The pond | 24 | 7 | free | Pond path |
| Snipe rough | swest | Reedy bank | 8 | 7 | 130 | West shore path |
| Medlar strip | east | Orchard row | 7 | 7 | 150 | Apple walk |
| Boat bank | south | Reedy bank | 10 | 7 | 150 | The boardwalk |
| Willow foot | swest | Reedy bank | 6 | 7 | 160 | West shore path |
| Rhubarb patch | swest | Fruit bed | 5 | 7 | 170 | West shore path |
| Lily pool | swest | Pool | 12 | 7 | 220 | West shore path |
| Seedling rows | west | Veg plot | 8 | 8 | 150 | Carrot row |
| Dragonfly bank | swest | Reedy bank | 9 | 8 | 170 | West shore path |
| Cider nook | east | Orchard row | 4 | 8 | 180 | Cider lane |
| Sedge isle | swest | Reedy bank | 6 | 8 | 190 | West shore path |
| Bean beds | west | Veg plot | 9 | 8 | 200 | Bean walk |
| Wader flats | south | Reedy bank | 13 | 8 | 200 | The boardwalk |
| Cherry row | east | Orchard row | 8 | 8 | 210 | Apple walk |
| Alder carr | swest | Little wood | 12 | 8 | 210 | West shore path |
| Hazel copse | east | Little wood | 7 | 8 | 220 | Apple walk |
| Potato ground | west | Rich black soil | 7 | 8 | 240 | Carrot row |
| The greenhouse | core | Greenhouse | 12 | 9 | free | Pond path |
| Tiny isle | swest | Reedy bank | 10 | 9 | 110 | West shore path |
| Reed isle | swest | Reedy bank | 6 | 9 | 130 | West shore path |
| Gull rest | seast | Rock garden | 6 | 9 | 150 | East shore path |
| Marigold bank | swest | Reedy bank | 10 | 9 | 190 | West shore path |
| Bee bank | north | Meadow | 6 | 9 | 220 | Ridge walk |
| Hop garden | west | Veg plot | 9 | 9 | 230 | Bean walk |
| Orchid slope | north | Meadow | 10 | 9 | 240 | Ridge walk |
| Cockle bank | south | Rock garden | 16 | 9 | 240 | The boardwalk |
| Otter run | seast | Little wood | 8 | 10 | 230 | East shore path |
| Otter holt | swest | Little wood | 8 | 10 | 240 | West shore path |
| Spit end | south | Rock garden | 8 | 10 | 250 | East shore path |
| Rabbit warren | north | Meadow | 11 | 10 | 260 | Ridge walk |
| Skylark top | north | Meadow | 12 | 10 | 300 | Ridge walk |
| Deep pool | swest | Pool | 9 | 10 | 320 | West shore path |
| Sandy spit | seast | Rock garden | 6 | 11 | 240 | East shore path |
| Damson dip | east | Orchard row | 6 | 11 | 300 | Pear steps |
| Walnut shade | east | Little wood | 12 | 11 | 310 | Pear steps |
| The long view | north | Rock garden | 12 | 11 | 330 | Ridge walk |
| Poppy bank | core | Meadow | 7 | 12 | free | The heart path |
| Long meadow | core | Meadow | 11 | 12 | free | The heart path |
| Moon daisy strip | core | Meadow | 6 | 12 | free | The heart path |
| Cowslip rise | north | Meadow | 12 | 12 | 260 | Over the top |
| Sedge pool | seast | Pool | 4 | 12 | 280 | East shore path |
| Hazel isle | seast | Little wood | 10 | 12 | 300 | East shore path |
| Lark marsh | seast | Meadow | 11 | 12 | 320 | East shore path |
| Bluebell wood | east | Shady dell | 9 | 12 | 360 | Pear steps |
| The heronry | swest | Little wood | 16 | 12 | 360 | West shore path |
| High pasture | north | Meadow | 10 | 12 | 380 | Ridge walk |
| The nursery | east | Tree nursery | 9 | 12 | 380 | Cider lane |
| Moorhen bank | seast | Reedy bank | 6 | 13 | 340 | East shore path |
| Herb wall | west | Herb terrace | 6 | 13 | 360 | Cabbage steps |
| Pea sticks | west | Veg plot | 9 | 13 | 380 | Cabbage steps |
| Bittern reach | seast | Reedy bank | 8 | 13 | 380 | East shore path |
| Ivy corner | east | Shady dell | 6 | 13 | 400 | Pear steps |
| Black soil | west | Rich black soil | 10 | 13 | 420 | Bean walk |
| The maze ground | west | Meadow | 40 | 13 | 700 | Cabbage steps |
| Heron isle | south | Reedy bank | 8 | 14 | 420 | South shore walk |
| Clear pool | swest | Pool | 5 | 14 | 520 | West shore path |
| Market beds | west | Rich black soil | 7 | 14 | 560 | Cabbage steps |
| Far willows | seast | Little wood | 11 | 15 | 480 | East shore path |
| Iris bed | south | Reedy bank | 6 | 15 | 500 | South shore walk |
| The espalier | east | Fruit bed | 7 | 15 | 520 | Old wall walk |
| The far shore | south | Meadow | 15 | 15 | 520 | South shore walk |
| The walled garden | east | Sun trap | 9 | 15 | 1200 | Old wall walk, with the old key |
| Windy flats | south | Rock garden | 9 | 16 | 620 | South shore walk |
| Owl wood | east | Little wood | 6 | 16 | 640 | Old wall walk |
| Sun terrace | east | Sun trap | 9 | 16 | 900 | Old wall walk |
| Moon pool | swest | Pool | 6 | 16 | 900 | West shore path |
| Ness wood | south | Little wood | 14 | 17 | 700 | South shore walk |
| Beech top | east | Little wood | 9 | 17 | 720 | Old wall walk |
| Stone pool | seast | Pool | 10 | 17 | 760 | East shore path |
| Silver birches | south | Little wood | 9 | 18 | 700 | South shore walk |
| Mist meadow | south | Meadow | 15 | 18 | 720 | South shore walk |
| Deep loam | west | Rich black soil | 8 | 18 | 780 | Cabbage steps |
| Giant veg ground | west | Rich black soil | 13 | 18 | 900 | Deep rows |
| Ferny way | south | Shady dell | 7 | 19 | 780 | Willow ways |
| Sallow carr | south | Little wood | 9 | 19 | 800 | Willow ways |
| Rush hollow | south | Reedy bank | 9 | 19 | 820 | Willow ways |
| Exotic glade | south | Warm glade | 12 | 19 | 1000 | South shore walk |
| The last bank | south | Reedy bank | 17 | 20 | 900 | Willow ways |
| Otter beach | south | Rock garden | 6 | 20 | 1000 | Willow ways |
| The prize beds | west | Rich black soil | 8 | 20 | 1100 | Deep rows |
| Hermit corner | south | Warm glade | 3 | 20 | 1200 | South shore walk |
| The world’s end | south | Meadow | 14 | 22 | 1500 | Willow ways |

## What is on the map for everyone

The same in every garden, so friends see them with no field in a snapshot. Paved squares, flagstone, cobble and plank paths and the brooks are drawn in the ground; these stand up (`GARDEN_LAND_SIGHTS`, one table). A secret is a small reward, once.

| Place | Where | Secret |
|---|---|---|
| The market cross | 24, 11 | Feel in the slot |
| The signpost | 26, 12 | Read the blank arm |
| The bench by the square | 29, 11 | Look at the carving |
| The shore bench | 35, 18 |  |
| An old lamp | 31, 11 |  |
| An old lamp | 27, 16 |  |
| A clipped box | 17, 8 |  |
| A clipped box | 33, 8 |  |
| The old gardener | 34, 15 | Look under the trowel |
| The north gate | 27, 8 |  |
| The hill stones | 28, 4 | Count them (night) |
| The cairn | 26, 4 | Add a stone |
| The old watchtower | 35, 7 | Try the loose brick |
| The ruined chapel | 43, 2 | Pull the old rope |
| A great stump | 47, 2 | Knock on the small door |
| The orchard wall | 45, 12 | Look on top |
| The orchard gate | 43, 18 |  |
| The old barn | 0, 0 |  |
| The haystack | 10, 15 | Look through it |
| The field wall | 0, 3 |  |
| A broken cart | 10, 3 | Look under the seat |
| The field gate | 3, 18 |  |
| The little lighthouse | 35, 38 | Climb up and light it (night) |
| An upturned boat | 15, 38 | Look underneath |
| The folly | 25, 39 | Read the stone |
| The summer house | 4, 30 | Sit a while |
| The bird hide | 1, 43 |  |
| The boathouse | 40, 21 |  |
| The little bridge | 46, 30 |  |
| The west shore gate | 9, 21 |  |
| The little falls | 38, 7 | Look behind the water |
| The mossy grotto | 33, 7 | Reach inside |
| The shepherd’s hut | 33, 5 | Look in the window |
| The hilltop folly | 37, 1 |  |
| The old beacon | 29, 0 | Light it (night) |
| The warren bank | 27, 4 |  |
| The ring of old trees | 48, 1 | Stand in the middle |
| The hollow oak | 41, 2 | Feel along the shelf |
| The treehouse | 44, 0 | Pull the string |
| The charcoal clamp | 50, 3 |  |
| Cider square | 48, 11 | Knock on the barrels |
| Pump square | 8, 8 | Work the handle |
| The bee boles | 8, 4 |  |
| The wishing well | 46, 28 | Make a wish |
| The watermill | 40, 31 | Look in the old sacks |
| The rope bridge | 46, 34 |  |
| The turf labyrinth | 42, 37 | Walk it |
| The eel smokehouse | 48, 35 |  |
| The ice house | 10, 35 | Open the door a crack |
| The frog stone | 7, 25 | Sit and listen (dusk) |
| The milk stand | 9, 23 |  |
| The driftwood arch | 0, 34 |  |
| The sunken pool | 30, 18 | Look in the water |
| The picnic table | 33, 12 |  |
| The milestone | 1, 19 | Read the back |
| The east shore gate | 45, 21 |  |

## Adding more later

A feature is one row in `GARDEN_LAND_FEATURES`, one drawing in `_GLD_PROP_ART`, and, if it does something new, one branch in `_gldUseBubble`. It goes to friends by itself through `lf`. Its spot in its section is worked out for it. Check any change to a map with a throwaway script: every section touches its `via`, every trail its `from`.

## Regions: every fish and bug has a home

The owner, 1 Nov 2026: "we can relate these fish and bugs to specific areas of the map, and unlockables." Tables and words: `src/app/94-garden-regions-0table.js` (pure). Progress, prizes and bugs on open land: `94-garden-regions-1core.js`. The waters, the prizes' drawings and The map tab of the Catch page: `94-garden-regions-2page.js`.

- **Six regions**: the main garden, the lake, the north hill, the east orchards, the west fields, the south marsh. A home is a region, a water or a named place, worked out at load from each kind's habitat, name and size (hashed by id, so it never moves), then the hand-placed ones. It is not saved. Commons up to level 3 stay in the garden, the lake and the pond.
- **Reaching it unlocks it**: a kind whose home is not open is not there. A bug's home is a trail by rarity, or round a sight (read from the sight, so it moves with it). The book says where and what to open.
- **Waters** (`GARDEN_REGION_WATERS`, world cells): the school has a band for each once open, one fish each (`_gfsWant`), and `GF_SCHOOL.max` still rules. New ones stand on thicket cells, so no path is cut and no plant is under water; the falls pool is the east end of the pond; the six bought pools now have fish. `GARDEN_AREAS` stays at 12 rows. The west fields have no thicket left, so they have bugs only.
- **Bugs**: how many is still `_gcBugsBase`'s sum and its cap. Regions only choose which kinds and where; each region gets an equal share of the draw and the garden two, so opening land does not empty the front bed.
- **Prizes**: half a page pays coins and a decoration; a whole page pays coins, a ribbon and a feature with no price (`prize` in `GARDEN_LAND_FEATURES`), on thicket or the lane's ends, sent through `lf`. Paid in the ledger, keyed `rg.<region>.<half|full>` in `seen`. All six regions: 3,100 coins and 850 from ribbons, against 48,390 for the land.
