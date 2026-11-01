# The garden's land and what you can do on it

The owner, 1 Nov 2026: "all of the purchasable land is WAY TOO BIG ... split into way more paths and sections that go up and down not just across, different kinds of lands ... we can still buy stuff but not entire plots ... come up with at least 20-30 cool features". Then: "make everything less square", and "if we buy items it should appear and show in the garden and we can see each other's stuff".

Tables: `src/app/94-garden-lands-0table.js`. Engine: `94-garden-lands-1core.js`. Drawing: `94-garden-lands-2art.js`. Bubbles and the land office: `94-garden-lands-3page.js`. This file's tables were written from the code's tables; if they differ, the code is right.

## The map

The world is the same size. The four big plots (Sunny hill, Kitchen field, Old orchard, Lily marsh; 32 by 30 cells east of the woods and the lake) are now 79 small sections joined by 17 trails that wind up and down from the lane. One character a cell, in `GARDEN_LAND_MAPS`: letters are sections, signs and digits are trails.

- A **trail** opens with your garden level. It has a small gate and a sign until then. It costs nothing. You walk on it; nothing grows on it and nothing stands in the way on it.
- A **section** needs its level, its trail open, and coins. It is fenced where it faces land you can stand on. A sign at its door says the price or the level.
- What is drawn follows the cells loosely: a section's outline is traced round its cells and rounded off, a trail is a curve that stays inside its cells. Walking and planting are still on the cell grid.

## Prices, and a player earning at the cap

Coins come from focus time and finished tasks, at most 120 a day (`GARDEN_ECON.dayCap`), plus about 19 a day from daily tasks and 33 a day from weekly quests: about 170 a day before selling anything. XP is about 80 a day for someone playing every day.

| Stage | Levels | Sections | Coins for all of it | Features | Coins for all of them | About how long at 170 a day |
|---|---|---|---|---|---|---|
| Early | 1-5 | 18 | 1,420 | 6 | 490 | 11 days |
| Mid | 6-12 | 35 | 7,820 | 17 | 3,740 | 68 days |
| Late | 13 and up | 26 | 18,080 | 4 | 5,800 | 140 days |

All of it: 37,350 coins, about 31 weeks of steady play. Levels hold it back too: level 12 is 3,300 XP (about 6 weeks), level 20 is 9,500 (about 4 months). The old plots cost 1,750 in all, about ten days.

## Saved games

- Someone who bought a whole plot keeps all of it. `land:hill` stays in the ledger. Every cell of the plot answers as it always did (`gardenAreaAt` returns `hill`): no fences, no path keeping them off a cell, the marsh's whole pool still water. Every section in that plot counts as theirs, so they can build on it.
- Whole plots are no longer sold. `gardenLandInfo('hill')` is null for someone who does not own it, and `gardenBuyLand('hill')` says to buy sections.
- Everything new is kept the way the garden keeps everything: ledger items (`land:<section>`, `feat:<feature>`, `cur:<curio>`, `sky:<star>`, `key:old`) and one value each in `g.seen`, so two devices add up and no sync code changed. An older device sums the ledger the same way and simply cannot draw a section.
- Ids of sections, trails, features, curios and stars are stable. Never rename or reuse one.

## Friends

`areas` in a snapshot stays at most 12 ids of `GARDEN_AREAS`. An older app sees a plot as open if any of it is yours, so it can walk among your plants. The real answer is beside it, in fields an older app drops: `ls` (sections and any whole plot), `lf` (features built), `lc` (curios and the key), `lz` (stars logged), `lr` (garden stars). Ids and one number: no names, no text. A snapshot with no `ls` is from an older friend, and its plots are whole.

A live garden gets a fresh snapshot as soon as the host buys land, builds or finds something (`opendash:garden` kinds `land` and `landshow`, `94-garden-live-3host.js`). `GL_V` is unchanged. On a friend's land everything is read-only, except that you can use their way posts and climb their lookout, and their land office shows what they have.

## The rule: everything shows

Whatever you buy or find has a drawing in the world, and a visitor sees that same drawing. A section is drawn by its kind. A feature is its own prop. Curios each have their own small drawing, laid out on a table on the lane until a museum takes them into its glass case. The stars you have logged go up on the board beside the observatory, each its own shape. Garden stars show filled on their board. Even the stout boots stand by the land office door.

The exceptions are not things you own: today's dig spot, today's forage and the weekend cart are your own day's luck and are not sent to friends. What they give you does show (a curio on the table, a plant in a bed, a decoration where you put it).

## Features

| # | What | Level | Coins | Where | What it does |
|---|---|---|---|---|---|
| 1 | Way posts (5) | 2, 8, 9, 9, 11 | 30, 100, 120, 120, 150 | On the lane (33, 11); Seedling rows (38, 18); Orchid slope (37, 3); Marigold bank (58, 16); Walnut shade (52, 3) | Build two and you can hop between them. Friends can use yours. |
| 2 | Lucky stone | 3 | 50 | Buttercup bank (39, 9) | Knock on it once a day. A few coins always fall out, nobody knows why. |
| 3 | Rain barrel | 3 | 60 | Clover corner (42, 9) | Three more cans of water every day. |
| 4 | Worm bin | 4 | 80 | First furrow (29, 13) | A bag of free fertiliser every two days. |
| 5 | Seasons arch | 5 | 120 | Sunny doorstep (35, 9) | Changes with the year, and leaves you a free seed each season. |
| 6 | Stout boots | 5 | 150 | On the lane (32, 11) | You walk a good bit faster everywhere. They stand by the land office door when you are not in them. |
| 7 | Garden stars board | 6 | 120 | Sunny doorstep (37, 9) | Rates your garden out of five stars and pays for each one. Friends can read it. |
| 8 | Scarecrow | 6 | 140 | Allotment row (36, 13) | Plants near it grow a tenth faster. Dresses for the season. |
| 9 | Bee skeps | 6 | 160 | Foxglove strip (34, 6) | Old straw hives: a jar of honey every two days. |
| 10 | Help wanted board | 7 | 150 | Onion bed (29, 15) | A neighbour asks for something you grow, once a week, and pays well for it. |
| 11 | Jam kettle | 7 | 220 | Windfall corner (55, 9) | Five pieces of fruit, a day on the stove, and it sells for much more. |
| 12 | Seed swap shelf | 8 | 180 | Cider nook (58, 7) | Once a day, leave five common seeds and take a better one. |
| 13 | Drying rack | 8 | 260 | Thyme terrace (29, 3) | Five bunches of herbs, two days in the air, three times the price. |
| 14 | Spring rill | 9 | 320 | Potato ground (30, 18) | A little spring: everything planted near it is watered every morning. |
| 15 | Lantern walk | 10 | 240 | Blackbird corner (31, 8) | Lamps along the lane that come on at dusk. Friends see them too. |
| 16 | Little museum | 10 | 500 | Apple row (51, 8) | Show the curios you dig up, and be paid as the collection grows. Friends can look in. |
| 17 | Dew stone | 11 | 260 | Fern hollow (29, 6) | Go there at dawn: five more cans of water for the day. |
| 18 | Lookout tower | 11 | 300 | The long view (36, 0) | Climb up and see the whole of your land. Friends can climb it too. |
| 19 | Savings oak | 12 | 400 | Bluebell wood (49, 4) | Bury coins at its roots. In a week they come back with a little more. |
| 20 | Hedge maze | 14 | 900 | The maze ground (28, 25) | A little maze with a chest in the middle, full again every week. Friends can get lost in it. |
| 21 | Observatory | 15 | 1400 | High pasture (41, 0) | At night, log the stars you can see. Twelve to find in all. |
| 22 | Moon stone | 16 | 1100 | Marigold bank (59, 18) | Only at night: it gathers water that feeds a plant like fertiliser, and it glows. |
| 23 | Stone circle | 20 | 2400 | Mist meadow (44, 25) | Stand in it once each season for a big share of experience and a rare seed. |
| 24 | Daily dig spot | any | free | A little cross on the lane, a trail or your land, a new place each day | Dig it up: coins, a seed, fertiliser or a curio. |
| 25 | Curios and the finds table | any | free | The table on the lane (34, 11), then the museum | 20 to find, each with its own drawing. The museum pays at 5, 10, 15 and 20. |
| 26 | Seasonal forage | 3 | free | Up to two a day, in wild land you own | Primroses, wild strawberries, brambles or holly, by the season. Sometimes a curio. |
| 27 | The weekend cart | 6 | prices on it | On the lane, Saturdays and Sundays | Three seeds and a decoration you may not have reached yet. One of each. |
| 28 | The old key and the walled garden | 12, then 15 | 1,200 | A key dug up from level 12; the garden is in the Old orchard corner | A secret: a walled sun trap behind a rusty gate. |
| 29 | Land kinds | by section | by section | Rich soil, the nursery, sun traps, warm glades, pools | Rich soil grows 15% faster, the nursery 30%; sun traps and warm glades are always in season; pools take pond plants; glades grow exotics out of doors. |
| 30 | Trails and the land office | by trail | free | Land office on the lane (29, 11), or Land in the menu | Paths that open with your level, and one page of what you can buy, build and reach for next. |

## Trails

| Trail | Opens at level | Leads on from |
|---|---|---|
| Bramble path | 2 | The lane |
| Carrot row | 3 | The lane |
| Foxglove steps | 5 | Bramble path |
| Apple walk | 6 | The lane |
| Long furrow | 6 | The lane |
| The boardwalk | 7 | The lane |
| Cider lane | 8 | The lane |
| Bean walk | 8 | Carrot row |
| Ridge walk | 9 | Foxglove steps |
| Reed causeway | 9 | The lane |
| Pear steps | 11 | Apple walk |
| Over the top | 12 | Ridge walk |
| Cabbage steps | 13 | Bean walk |
| Heron walk | 14 | Reed causeway |
| Old wall walk | 15 | Pear steps |
| Deep rows | 17 | Cabbage steps |
| Willow ways | 18 | Heron walk |

## Sections

| Section | Old plot | Kind | Squares | Level | Coins | Reached from |
|---|---|---|---|---|---|---|
| Clover corner | hill | Meadow | 6 | 2 | 30 | The lane |
| Buttercup bank | hill | Meadow | 6 | 2 | 40 | The lane |
| First furrow | field | Veg plot | 6 | 3 | 40 | The lane |
| Sunny doorstep | hill | Herb terrace | 8 | 3 | 60 | The lane |
| Blackbird corner | hill | Fruit bed | 14 | 3 | 70 | The lane |
| Allotment row | field | Veg plot | 16 | 3 | 90 | The lane |
| Gate pear | grove | Orchard row | 4 | 4 | 60 | The lane |
| Salad strip | field | Veg plot | 8 | 4 | 70 | Carrot row |
| Frog steps | marsh | Reedy bank | 8 | 4 | 70 | The lane |
| Windfall corner | grove | Orchard row | 6 | 4 | 80 | The lane |
| Bean corner | field | Veg plot | 9 | 4 | 80 | The lane |
| Onion bed | field | Veg plot | 6 | 4 | 90 | Carrot row |
| Foxglove strip | hill | Shady dell | 8 | 5 | 90 | Bramble path |
| Fern hollow | hill | Shady dell | 8 | 5 | 100 | Foxglove steps |
| Kingcup corner | marsh | Reedy bank | 9 | 5 | 100 | The lane |
| Crab apple row | grove | Orchard row | 5 | 5 | 110 | The lane |
| The old plum | grove | Orchard row | 12 | 5 | 120 | The lane |
| Bulrush edge | marsh | Reedy bank | 14 | 5 | 120 | The lane |
| Warm stones | hill | Rock garden | 9 | 6 | 140 | Bramble path |
| Strawberry bank | field | Fruit bed | 6 | 6 | 140 | Long furrow |
| Thyme terrace | hill | Herb terrace | 9 | 6 | 150 | Foxglove steps |
| Pumpkin nook | field | Rich black soil | 7 | 6 | 150 | Carrot row |
| Apple row | grove | Orchard row | 8 | 6 | 170 | Apple walk |
| Snipe rough | marsh | Reedy bank | 3 | 7 | 130 | Long furrow |
| Medlar strip | grove | Orchard row | 7 | 7 | 150 | Apple walk |
| Willow foot | marsh | Reedy bank | 7 | 7 | 160 | The boardwalk |
| Rhubarb patch | field | Fruit bed | 8 | 7 | 170 | Long furrow |
| Lily pool | marsh | Pool | 10 | 7 | 220 | The boardwalk |
| Seedling rows | field | Veg plot | 6 | 8 | 150 | Bean walk |
| Dragonfly bank | marsh | Reedy bank | 6 | 8 | 170 | The boardwalk |
| Cider nook | grove | Orchard row | 4 | 8 | 180 | Cider lane |
| Sedge isle | marsh | Reedy bank | 10 | 8 | 190 | The boardwalk |
| Bean beds | field | Veg plot | 8 | 8 | 200 | Bean walk |
| Cherry row | grove | Orchard row | 6 | 8 | 210 | Apple walk |
| Alder carr | marsh | Little wood | 9 | 8 | 210 | Long furrow |
| Potato ground | field | Rich black soil | 16 | 8 | 240 | Carrot row |
| Tiny isle | marsh | Reedy bank | 3 | 9 | 110 | The boardwalk |
| Reed isle | marsh | Reedy bank | 6 | 9 | 130 | The boardwalk |
| Marigold bank | marsh | Reedy bank | 9 | 9 | 190 | Reed causeway |
| Bee bank | hill | Meadow | 9 | 9 | 220 | Ridge walk |
| Orchid slope | hill | Meadow | 12 | 9 | 240 | Ridge walk |
| Otter holt | marsh | Little wood | 9 | 10 | 240 | Reed causeway |
| Rabbit warren | hill | Meadow | 6 | 10 | 260 | Ridge walk |
| Skylark top | hill | Meadow | 15 | 10 | 300 | Ridge walk |
| Deep pool | marsh | Pool | 15 | 10 | 320 | The boardwalk |
| Damson dip | grove | Orchard row | 6 | 11 | 300 | Pear steps |
| Walnut shade | grove | Little wood | 4 | 11 | 310 | Pear steps |
| The long view | hill | Rock garden | 9 | 11 | 330 | Ridge walk |
| Cowslip rise | hill | Meadow | 9 | 12 | 260 | Over the top |
| Bluebell wood | grove | Shady dell | 10 | 12 | 360 | Pear steps |
| The heronry | marsh | Little wood | 12 | 12 | 360 | Reed causeway |
| High pasture | hill | Meadow | 11 | 12 | 380 | Ridge walk |
| The nursery | grove | Tree nursery | 9 | 12 | 380 | Cider lane |
| Herb wall | field | Herb terrace | 13 | 13 | 360 | Cabbage steps |
| Pea sticks | field | Veg plot | 8 | 13 | 380 | Cabbage steps |
| Hazel copse | grove | Little wood | 8 | 13 | 400 | Over the top |
| Ivy corner | grove | Shady dell | 5 | 13 | 400 | Over the top |
| Black soil | field | Rich black soil | 13 | 13 | 420 | Cabbage steps |
| The maze ground | field | Meadow | 40 | 13 | 700 | Cabbage steps |
| Heron isle | marsh | Reedy bank | 6 | 14 | 420 | Heron walk |
| Clear pool | marsh | Pool | 12 | 14 | 520 | Heron walk |
| Market beds | field | Rich black soil | 18 | 14 | 560 | Cabbage steps |
| Far willows | marsh | Little wood | 12 | 15 | 480 | Reed causeway |
| Iris bed | marsh | Reedy bank | 8 | 15 | 500 | Heron walk |
| The espalier | grove | Fruit bed | 6 | 15 | 520 | Old wall walk |
| The walled garden | grove | Sun trap | 9 | 15 | 1200 | Old wall walk, with the old key |
| Owl wood | grove | Little wood | 9 | 16 | 640 | Old wall walk |
| Sun terrace | grove | Sun trap | 11 | 16 | 900 | Old wall walk |
| Moon pool | marsh | Pool | 8 | 16 | 900 | The boardwalk |
| Beech top | grove | Little wood | 5 | 17 | 720 | Old wall walk |
| Stone pool | marsh | Pool | 4 | 17 | 760 | Reed causeway |
| Silver birches | marsh | Little wood | 9 | 18 | 700 | Willow ways |
| Mist meadow | marsh | Meadow | 6 | 18 | 720 | Willow ways |
| Deep loam | field | Rich black soil | 15 | 18 | 780 | Deep rows |
| Giant veg ground | field | Rich black soil | 8 | 18 | 900 | Deep rows |
| Exotic glade | marsh | Warm glade | 8 | 19 | 1000 | Willow ways |
| The last bank | marsh | Reedy bank | 4 | 20 | 900 | Willow ways |
| The prize beds | field | Rich black soil | 12 | 20 | 1100 | Deep rows |
| Hermit corner | marsh | Warm glade | 9 | 20 | 1200 | Willow ways |

## Adding more later

Land is full now, but a feature is one row in `GARDEN_LAND_FEATURES`, one drawing in `_GLD_PROP_ART`, and, if it does something new, one branch in `_gldUseBubble`. It goes to friends by itself through `lf`. Keep the cells free of the paths, and check any change to a map with a throwaway script: every section touches its `via`, every trail its `from`.
