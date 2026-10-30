# The garden (2.18, redesigned in 2.18.1)

2.18.1 (owner feedback: confusing, small, odd economy): see GARDEN_UX.md for the diagnosis and GARDEN_CHANGES_2181.md for the list. The page layout (section 9) and the economy (section 6) below are the 2.18.1 ones.

User request, 24 Oct 2026: "see other people's gardens, make the garden feature way way better with far more
things, make the garden feature like a game so more interactable etc, more plants, more everything, we are
really building out the dashboard so it's fun to use."

The 2.16 garden (a strip of plants on a Home card, one per day you finished something) becomes a small,
calm game: a garden you plant, water, harvest and decorate, that grows with your work and never wilts.

| Part | Files | Owner |
|---|---|---|
| The catalogue (every plant, decoration, visitor, tile, area, tool, ribbon, task, event) and the art contract. PURE | `src/app/94-garden-0catalog.js` | garden-engine |
| The engine: state, growth, economy, actions with Undo, migration, snapshots | `src/app/94-garden-1core.js` | garden-engine |
| The renderer (`gardenRender`) and the placeholder art (`gardenArtPlaceholder`) | `src/app/94-garden-2art.js`, `src/app/94-garden-3render.js` | garden-engine |
| The Garden page (`#view=garden`, `garden:shop`, `garden:almanac`, `garden:basket`), photo mode, time-lapse, sidebar, palette | `src/app/94-garden-4page.js`, `src/app/94-garden-5extras.js` | garden-engine |
| The Home card 'garden' (a live window, sizes s / m / l) | `src/app/12-home-w-garden.js` | garden-engine |
| Styles | `src/styles/94-garden.css` | garden-engine |
| The real art: `gardenArt(id, o)` | `src/app/94-garden-art-*.js` (its own files) | garden-art |
| Friends' gardens: the snapshot on the wire, visits (water, gifts, reactions, hearts, the guestbook), the gallery, the co-op bed of a Together space (section 11) | `src/app/94-garden-social-*.js`, `src/styles/94-garden-social.css`, `lib/friends/garden.mjs`, `server/routes/garden-social.mjs` | garden-social |
| Pets in the garden: `window.petGardenSprite(ctx)` | its own files | pets |

The rules that hold everywhere: calm and never guilt (nothing dies, nothing is taken away, a dry plant
only droops a little and grows more slowly); Undo instead of questions; the Fun level (Off / Subtle / Full,
`memFunLevel()`) and reduced motion are respected; no jank on Home (the art is cached, the Home card is a
cached string until something changes).

## 1. The catalogue (`94-garden-0catalog.js`)

PURE: tables and small functions, no DOM, no state; Node can evaluate it the way `lib/profile-avatar.mjs`
evaluates the avatar kit (`new Function(source + 'return {...}')`).

**Every id is stable and unique across all tables** (plants, decorations, visitors, tiles, areas, tools,
ribbons, daily tasks, quests, bouquets, events). Ids are saved in the state, synced between your devices and
sent to friends in a snapshot: never rename or reuse one; retire one by leaving it with `retired: 1`.

- `GARDEN_WORLD` `{cols: 20, rows: 11, cellW: 48, cellH: 30, sky: 150, unit: 64}`: the grid, its on-screen
  cell, the sky band above it, and the art unit (64 art units = one cell wide).
- `GARDEN_PLANTS` (131): `{id, name, cat, rarity, grow, seasons, look, yield, price, lv, unlock, thirst, fp,
  areas?, attracts?, night?, glow?, special?, blurb}`.
  - `cat`: flower, wild, herb, veg, fruit, tree, succulent, water, exotic (`GARDEN_CATS`: label, icon, the
    areas it grows in, the names of its five stages, the harvest verb).
  - `grow`: quick, fast, medium, slow, tree, ancient (`GARDEN_GROW`: effective hours to stages 1..4).
  - `seasons`: when it is in season (growth x1.3); out of season it still grows (x0.8). The greenhouse is
    always in season.
  - `look` `{form, c, c2, leaf, h, v}`: the art's shape (`form`, see section 4) and palette: `c` the main
    colour (petals, fruit), `c2` the second (centre, blossom, flower), `leaf`, `h` the mature height in cells,
    `v` the colour variants (an instance picks one when planted: `variant` is the index).
  - `yield` `{n: [min, max], regrow: hours (0 = the plant is lifted), sell: coins, item?}`; none = grown for
    looks (it still counts for visitors, bouquets do not take it).
  - `price` (seed, coins; 0 = never sold), `lv` (garden level to buy it), `unlock` `{season | event | ach |
    ribbon | find}`: `ach` = an achievement id from `ACH_DEFS` (71-achievements.js), `find` = found only.
  - `thirst`: hours before it wants water (0 = never: pond plants); `fp`: footprint 1 or 2 (2 x 2 cells).
  - `special: 'heart'` (the old oak: grows with every task you ever finished, the 2.16 tree),
    `'rare-bloom'` (the titan arum: two days in flower, then a rest).
- `GARDEN_DECOR` (74): `{id, name, cat, w, h, layer: 'ground' | 'object', price, lv, unlock, rot, v, effect,
  areas, attracts, look {c, c2, h}, blurb}`. Paths are `layer: 'ground'` (under everything; nothing is
  planted on them, a seat may stand on them). `rot`: faces four ways (`r` 0..3). `v`: how many styles.
  Effects (`effect.kind`): `can` (+n water a day), `sprinkler` (waters the cells within r each morning),
  `pond` (frogs, dragonflies), `birds`, `bugs`, `hedgehog`, `hive` (honey), `compost` (fertiliser),
  `light` (glows at night, moths and bats), `sit` (seats: the cat), `luck` (rare finds), `wish` (a daily
  wish), `cold` (neighbours grow as if in season), `scare` (more at harvest nearby), `shed`, `hedge`.
- `GARDEN_VISITORS` (29): `{id, name, kind, rarity, when {tod, seasons}, needs, chance, spot, motion, look,
  blurb}`. `needs` (all must hold): `bloom` (flowers in bloom), `plants` (any of these), `cats` `{cat: n}`,
  `decor` (any of these), `effect` (a decoration with that effect), `area` (open), `ripe`, `trees`, `rain`.
  `spot`: flower, plant, pond, decor, light, lawn, tree, veg, meadow, seat, sky. `motion`: buzz, flutter,
  hop, walk, crawl, dart, swim, glow, sit.
- `GARDEN_TILES`, `GARDEN_AREAS` + `GARDEN_LAWN`: the ground, and the six areas with their place on the
  grid, their level and what grows there: Front garden (level 1), Veg patch (3), Orchard (5), Pond (7, its
  water cells take only pond plants), Greenhouse (9, always in season), Flower meadow (12). The lawn (every
  other cell) takes decorations only.
- `GARDEN_TOOLS` (watering cans, the hose, golden shears, fertiliser), `GARDEN_BOUQUETS`,
  `GARDEN_LEVEL_TITLES` / `gardenLevelOf(xp)` (level L needs 25 L (L - 1) XP), `GARDEN_RIBBONS` (the garden's
  own achievements), `GARDEN_DAILY` / `GARDEN_QUESTS` (picked by `gardenPickDaily(iso, level)` /
  `gardenPickQuests(weekFrom, level)`, the same on every device), `GARDEN_EVENTS` (Trick or treat matches
  agent fun's window; Harvest home, Winter lights, Spring bloom, Midsummer).
- Helpers: `gardenPlant/Decor/Visitor/Tile/Area/Tool(id)`, `gardenDef(id)`, `gardenSeasonOf(iso, south)`,
  `gardenSouthern(zone)`, `gardenEventsOn(iso)`, `gardenInSeason`, `gardenStageAt(def, hours)`,
  `gardenHoursFor(def, stage)`, `gardenStageName`, `gardenLockOf(def, ctx)`, `gardenAreaAt(x, y, level)`,
  `gardenIsWater`, `gardenCellOk(def, x, y, level, kind)`, `gardenBouquetOf(stems)`, `gardenHash`,
  `gardenRand(seed)`, `gardenArtBox(kind, id)`, `gardenSnapshotClean(raw)`.

## 2. The art contract (agent 'garden-art')

```
gardenArt(id, o) -> an SVG fragment string ('<g>…</g>', no outer <svg>), or '' / null to fall back
```

`o`:

| field | values | meaning |
|---|---|---|
| `kind` | plant, decor, visitor, tile, crop, seed, tool, bouquet | which table `id` is from (crop = a harvested item of plant `id`, seed = its seed packet, bouquet = a `GARDEN_BOUQUETS` style) |
| `stage` | 0..4 | plants: 0 just planted (a mound), 1 sprout, 2 young, 3 mature / in bud, 4 bloom / ripe |
| `season` | spring, summer, autumn, winter | trees change colour, perennials die back a little in winter (never dead) |
| `variant` | 0..7 | a plant's colour (`look.v[variant]`, else `look.c`), a decoration's style (`v` styles), the old oak's size 0..6 |
| `size` | s, m, l | detail: s on the small Home card (fewer strokes), m on the page, l for close-ups and photos |
| `t` | 0..1 | a stable per-instance phase: small differences (leaf angles, a petal more) so two roses are not twins |
| `tod` | dawn, day, dusk, night | night: lights lit, moonflowers open, glowing things glow |
| `r` | 0..3 | decorations: facing; fences 0 / 2 run left to right, 1 / 3 front to back |
| `thirsty` | bool | droop a little (never brown or dead) |
| `overgrown` | bool | a bit wild: wants a trim |
| `ripe` | bool | fruit or flowers ready to pick |
| `silhouette` | bool | the almanac's undiscovered entry: one flat shape (the engine also dims it) |
| `uid` | string | a safe prefix for any `<defs>` ids (gradients), unique per instance |
| `heart` | 0..6 | the old oak only: its size (the same number as `variant`) |
| `glow` | bool | the plant's `glow` flag (moonflower, glowcaps, the golden sunflower...): glow when `tod` is night |

Coordinates: `(0, 0)` is the ground anchor at the bottom centre of the footprint. One cell is 64 units wide;
a footprint of w x h cells spans x from -32w to 32w. Plants grow UP (negative y) to about `-64 * look.h`;
decorations to `-64 * look.h`; shadows may dip to +8. `gardenArtBox(kind, id)` gives the box the engine uses
for icons. Tiles are drawn from above in a 64 x 40 box with the anchor at the bottom centre.

Rules: explicit colours only (no CSS variables), no external references, no `<image>`, no text, no
scripts or event attributes: the photo mode draws the whole garden onto a canvas and saves a PNG.
Deterministic: the same inputs give the same string (the engine caches by every input). Keep fragments
small (a plant is drawn up to ~250 times on the page, ~60 on Home).

Animation by class name only; the engine's CSS (`94-garden.css`) runs them and stops them for reduced
motion and Fun level Off: `gda-sway` (moves from its base), `gda-flutter` (wings), `gda-glow` (lights and
glowing plants at night), `gda-ripple` (water), `gda-flicker` (flames), `gda-spin` (pinwheels; give it
`style="transform-origin: Xpx Ypx"` at its hub), `gda-bob` (floating), `gda-blink`.

Until 'garden-art' lands, the engine draws `gardenArtPlaceholder(id, o)` (94-garden-2art.js), which keeps
the same contract. The engine never calls `gardenArt` when it is not a function, and falls back per item
when it returns nothing or throws.

## 3. State (`state.garden`, synced)

A UI key that follows you (saveUI, no app undo step: the garden has its own Undo), `// ── garden ──` in
`lib/state-keys.mjs`, `src/app/01-core-state.js`, `lib/sync/manifest.mjs` and `lib/sync/model.mjs`
SYNC_SPEC. Everything that can be is computed from the data (coins from finished tasks, focus minutes and
streaks; plants' stages from time and care); only choices and events are kept, as map entries with their
own keys so two devices add up instead of overwriting each other:

```
{v: 1,
 since: 'YYYY-MM-DD',                         the day the 2.18 garden began (earnings count from here)
 plants: {uid: {p, x, y, t, w, dh, fb, hv, hc, pr, v}}
          p plant id, x y top-left cell, t planted (ms), w last watered (ms), dh dry hours banked,
          fb bonus hours (fertiliser), hv last harvest (ms), hc harvests, pr last pruned (ms), v variant
 decor:  {uid: {d, x, y, r, v, at}}           decoration id, cell, facing, style, placed or moved (ms)
 led:    {key: {d, k, c, x, i, n}}            the ledger: one entry per thing you did (buy, sell, plant,
                                              harvest, bouquet, feed, prune, wish...): day, kind, coins,
                                              garden XP, items {itemId: +/-n}, how many
 bank:   {'YYYY-MM': {c, x, i, n}}            ledger entries older than 40 days, folded by month
 wl:     {day: {uid: 1}}                      plants watered today (kept 8 days: daily tasks, quests)
 vd:     {day: {visitorId: 1}}                visitors seen (kept 8 days)
 disc:   {id: day}                            the almanac: plants, visitors and decorations discovered
 rib:    {ribbonId: day}                      ribbons earned (their rewards are counted from here)
 dt:     {day: {taskId: day}}                 daily garden tasks done (kept 8 days; counted in `n.daily`)
 wq:     {weekFrom: {questId: day}}           weekly garden quests done
 gr:     {key: day}                           one-off grants (a rare seed for an achievement or event)
 seen:   {key: day}                           moments already shown (level ups, areas, ribbons)
 prefs:  {tool, seed, homeSize, sound}        your last tool and seed
}
```

Items (`led.i`, `bank.i`, rewards): `seed:<plantId>`, `crop:<plantId>`, `decor:<decorId>` (owned and not
placed), `tool:<toolId>`, `fertiliser`, `honey`, `bq:<bouquetId>`, `clover`. Your wallet and inventory are
the sum of the migration grant, the derived earnings, the rewards of `dt` / `wq` / `rib` / `gr`, the
ledger and the bank (`gardenWallet()`).

## 4. Forms (plant `look.form`)

The placeholder draws every form; 'garden-art' should give each its own drawing (and each plant its own
touch inside a form: petal counts, leaf shapes). Flowers: daisy, daisy-tall, daisy-small, daisy-cloud,
sunflower, cup, cup-small, goblet, trumpet, moon-trumpet, bell, bell-arch, bell-cluster, spike, spike-bell,
spike-cup, star, star-small, pompom, pansy, poppy, rose, rose-bush, peony, dahlia, mophead, iris, lily,
cluster, umbel, flat, climber, hosta, orchid, orchid-spike, thistle, clover, grass, grass-flower, fern.
Herbs and veg: leafy, leafy-soft, frilly, frilly-tall, needle-bush, mat, root, root-frilly, head, bushy,
bulb, leek, stalk, pole, vine-pod, vine-fruit, sprawl, pumpkin, melon, bush-fruit, floret. Fruit: low-fruit,
cane, berry-bush, big-leaf, bramble, vine-grape. Trees: oak, fruit-tree, fruit-tree-tall, round-tree,
birch, lace-tree, weeping, blossom-tree, cone-tree, conifer, bush-tree, fig, olive, potted-tree, bonsai.
Succulents: aloe, rosette, spiky-rosette, jade, barrel, pads, saguaro, trailing. Pond: lily-pad, lotus,
reed, papyrus. Exotic: bird-paradise, flytrap, pitcher, passion, hibiscus, banana, mushroom, titan.

## 5. Growth, care and seasons

- Effective hours = real hours since planting, x1.3 in season / x0.8 out of season (x1.25 more in
  Midsummer, always in season in the greenhouse or beside a cold frame), + 1.5 h for every task you finish
  while it grows (at most 8 tasks a day count), + 1 h for every 25 focus minutes (at most 6 h a day),
  + fertiliser (12 h a feed, once a day per plant), - half of the hours it spent thirsty.
- Thirsty: more than `thirst` hours since the last water (you, rain or a sprinkler). It droops a little
  and grows at half speed. It never dies, never browns, never loses a stage.
- Rain waters everything: real rain from the weather the app already has (`/api/brief/weather`, today's
  past hours), else a gentle shower on about one morning in five (seeded by the date, the same everywhere).
- Harvest: plants with `yield.regrow` go back to stage 3 and ripen again after `regrow` effective hours;
  `regrow: 0` lifts the plant (its cell is free again, the seed tray offers a replant). Overgrown (stage 4
  for 3 days without a trim): a trim tidies it, gives garden XP and sometimes a cutting (a seed).
- Seasons follow the real date (meteorological, swapped south of the equator by your time zone); day and
  night follow your clock (and sunrise / sunset from the weather when there is one).
- The old oak (`special: 'heart'`) grows with everything you ever finished, exactly like the 2.16 tree:
  10, 50, 150, 400, 1,000 and 2,500 tasks make it bigger (`variant` 0..6).

## 6. Economy (2.18.1: coins come from time, not clicks)

Rules in `94-garden-0econ.js` (PURE; `GARDEN_ECON`, `gardenEconDay(input)`), applied per day by `gardenWallet`:

- **Focus minutes** (focus-timer sessions of at least 5 minutes): 0.2 coin a minute (12 an hour) for the first 120 minutes of
  the day, 0.1 (6 an hour) for the next 120, nothing after 4 hours.
- **A finished task** pays a bonus for the time it took: 1 coin per 6 minutes of basis, at most 15 a task, at most 45 a
  day. Basis = the minutes logged on the task by the timer, counting the estimate only up to 1.5 x the logged time
  (inflating an estimate does not help), at most 90. With no time logged: half of the estimate, the estimate counted up to
  30 minutes (so at most 2 coins).
- Nothing for: a task finished within 5 minutes of being created, a task already counted (a one-off task pays once, ever;
  a repeating one once a day), a task with no estimate and no time, a focus session under 5 minutes.
- A streak bonus (days that earned something, at most 5) and a **hard cap of 120 coins a day** from time. Weekly game quests
  still add 25 each, outside the cap.
- **Water**: the can holds 10 a day (+4 / +4 / +6 with better cans, water butts and pumps); each rewarded task adds 1 and
  each 25 credited minutes adds 1 (at most +10); rain fills it. **Free seed packets**: one per 50 credited minutes of
  work, 2 a day at most (credited = focus minutes + a task's basis minutes).
- Garden daily tasks pay half of their 2.18.0 coins (they are clicks); weekly quests, ribbons and the market are as before.
  The market still pays `yield.sell` for crops; with seed prices 2-3x higher, selling is no longer a way to farm coins.
- **Prices**: `_gdUp` in the catalogue raises every seed, decoration and tool price: up to 6 coins x2 (a first daisy is 6),
  7-40 x2.5, above 40 x3. Levels and unlock rules are unchanged.
- **Migration**: the wallet is still derived. `seen.econ2` (set once, synced) is the first day of the new rules; earlier days
  keep the 2.18.0 formula (4 a task, 1 per 10 focus minutes, streak, 70 a day), so no balance changes; on that first day
  nobody earns less than the old rules gave (the larger of the two counts). Existing coins, water, seeds, plants and
  decorations load unchanged; only future earning and prices change.
- **Explainable**: the wallet carries `econToday` (`gardenEconDay` of today with a `log` of reasons); the panel and the Home
  card show 'Today: 42 coins from 1h40 focused (cap 120)' (`gardenEconLine`), and the guide lists the rules.
- Garden XP: planting 2, harvesting 3, a trim 2, a bouquet 5, every discovery 10, daily tasks, quests and ribbons. Level L
  needs 25 L (L - 1) in total. Garden moments also give game XP through `gameAward({kind: 'garden'})`.
- Selling: the market buys crops at `yield.sell` (+20% during Harvest home), bouquets at their `bonus` + the stems,
  decorations back at half price. A harvest is now sometimes golden (6%, seeded: double).

## 7. APIs for other agents

```
gardenSnapshot()                         -> {v, lv, season, areas, plants: [[id, x, y, stage, variant, flags]],
                                             decor: [[id, x, y, r, variant]], heart, at}
                                            ids, cells and numbers only: no names, no times but `at`, no text.
                                            flags: 1 thirsty, 2 overgrown, 4 ripe. Clean a received one with
                                            gardenSnapshotClean (catalogue) before drawing it.
gardenRender(el, snapshot, {readOnly, visitor, size: 's'|'m'|'l', crop, tod, season, now, still, friend})
  (integrate 2.18) friend: a friend view (window.Friends); their pet wanders in their garden (petGardenSprite ctx.friend)
                                         -> draws anyone's garden into el (replacing its content) and returns
                                            {svg, destroy()}. readOnly: no tools; visitor: {name} for the
                                            caption "Sam's garden" (textContent only); crop: 'bed' | 'all'.
window.OpenDashGarden                    {snapshot, render, wallet, stats, open(tab), water(), harvest()}
document event 'opendash:garden'         detail {kind: 'plant'|'harvest'|'water'|'level'|'ribbon'|'visitor'|
                                            'bouquet'|'buy', ...}
gardenSceneSvg(scene, o) / gardenSceneFromModel(m)    the scene string (cached) and your garden as a scene
gardenSvgPatch(svgEl, html)              bring an SVG on screen up to date, keeping unchanged items' nodes (so
                                            swaying plants and flying visitors carry on)
gardenIconSvg(id, {kind, stage, px, ...}) one item as a small <svg> (shop, almanac, trays; silhouette for the
                                            almanac's undiscovered entries)
gardenFunNavAdd({id, order, label, icon, view, when})   a row under Home's 'Fun' sidebar heading (agent pets)
gardenBouquetGift(bouquet)               (agent fun) a guarded hook: when FUN_GIFT_TYPES has 'bouquet' the gift
                                            dialog opens with it; else with the matching flower sticker
window.petGardenSprite(ctx)              (agent pets, optional) ctx {season, tod, size, readOnly, rain}
                                            -> null or [{id, svg (a fragment in art units, anchor at the feet,
                                            explicit colours), w (cells), mood?}]; the engine puts each pet on
                                            a free lawn or path cell and lets it wander (not with reduced motion)
```

## 8. Migration from 2.16

The first time the 2.18 garden is opened (the page, the Home card or `gardenSnapshot()`), `memGardenModel`
(93-memories-ui.js, unchanged for its other callers) seeds the new garden so nobody starts from zero: the
old oak at its 2.16 size, the last two weeks' plants as real plants in the front garden at the stages they
had reached (tulips, daisies, sunflowers, herbs and lavender, as 2.16 drew them), coins (60 + one per task
ever finished, at most 500, + 10 per streak day, at most 300), garden XP (1.5 per task, at most level 5) and
six seed packets. Starter plants have fixed ids and the grant one fixed ledger key ('mig'), so two devices
that migrate before they sync agree instead of doubling.

It waits for the real state (`gardenReady()`: the file has been read, `state._lastSave`, or five seconds with no
server at all): a new browser paints first from an empty cache, and setting the garden up from that would
start it from nothing. Meanwhile the Home card shows a sample garden ("Your garden is waking up") and the page
a calm note; both turn into the real garden by themselves.

## 9. The page and the Home card

- `#view=garden` (layout `bare`, class `gd-full`): the whole window.
  - **HUD** (top): level and XP bar, coins, water left, seeds, fertiliser (when you have some), season / time / weather,
    the next daily goal ('Water 3 plants 0/3'), and the page tabs (Garden, Shop, Almanac, Basket, Friends) with Help (?).
    Every chip has a one-sentence tip.
  - **Toolbar** (left, big labelled buttons, keys 1-7): Plant, Water, Harvest (picks what is ripe, click anything to read
    about it), Fertilise, Trim, Dig up, Decorate; then Water all, Pick all, Shop, Almanac, Friends, Undo, Photo, Time-lapse.
    The active tool is highlighted and the cursor changes; a hover shows the tile and a sentence about what the tool will
    do (`_gdpToolSay`); hovering a plant shows a card with a growth ring (`gardenHoverCard`).
  - **Stage**: the garden scaled to the window (`fit: meet`). Drag a seed from the tray onto a tile (ghost preview), or click
    the seed then a tile; with Water or Plant, drag across tiles (one Undo). The panel button (top right) hides the side panel.
  - **Tray** (under the stage): your seeds (decorations while Decorate is the tool), with empty states that say what to do.
  - **Side panel**: 'What to do next' (one step, a ring on the target), Coins today (the cap bar and a 'where it came from'
    list), Goals (daily garden tasks and weekly quests), the inspector (or what the current tool does), who is visiting.
  - **Feedback** (`94-garden-6game.js`): floating '+2 XP', splash and darker soil when watered, a pop when a plant grows,
    harvested items fly into the basket, 'A hedgehog visited!' notes, a level-up card that names the new area, golden
    harvests. Nothing moves with reduced motion or the Fun level Off (the toasts still say it).
  - **First run**: a skippable 6-step tour (`seen.tour`; replay from Help), a free seed if you have none (`seen.tourSeed`),
    and the Garden guide (Help): how plants grow, what makes coins, water and seeds, the tools, visitors, levels.
  - Keyboard (the stage is focusable): arrows move a cell cursor, Enter uses the tool, 1-7 tools, W water all, H harvest all,
    Esc clears; Ctrl+Z on any garden tab undoes the last garden change.
- `garden:shop` (Seeds with today's deal and an "In season" filter, Decorations, Tools, Market),
  `garden:almanac` (Plants, Visitors, Decorations with silhouettes and hints; Ribbons with their rewards),
  `garden:basket` (bouquets from cut flowers, selling, your bag).
- Photo mode: the time of day, the crop, a frame (Polaroid, Postcard), visitors on or off, Save picture
  (a PNG drawn from the same SVG). Time-lapse: from the garden's first day to now (plants appear when they
  were planted, the old oak grows with what you had finished by then); plays by itself unless motion is
  reduced; a slider moves through time.
- Home card 'garden' (s: the front garden, m: closer in, l: everything): the live scene (a click opens the
  page), a calm line ("2 ready to pick. A robin is visiting."), Pick and Water buttons (Undo in their
  toasts). Hidden while the Fun level is Off. The gallery's preview draws a sample garden and never sets one
  up. If the garden files are missing the 2.16 strip is drawn as before.
- Sidebar: Home's 'Fun' heading (block `fun-nav`) has the Garden (its count is what is ready to pick), the
  Game (while the Fun level is on) and rows other modules add with `gardenFunNavAdd`.
- Palette: Garden, Water the garden, Harvest everything that is ready, Garden shop, Garden almanac and
  ribbons, Garden basket and bouquets, Take a photo of the garden, Garden time-lapse.

## 10. Performance

- The model (`gardenModel`) is memoised per minute and per change; the wallet per change and per new
  completion; activity sums are prefix sums over days (binary search per plant).
- Art fragments are cached by every input (`_gdArt`, up to 2,400); scene strings by the model's key.
- On screen, `gardenSvgPatch` replaces only changed layers and items (keyed by a hash of each item's
  markup), so a click, a water sweep or Home repainting does not restart animations or re-parse the garden.
- Animations are CSS transforms and opacity only, and stop under reduced motion, Fun level Off and in a
  hidden tab (`html.anim-paused`).

## 11. Gardens with friends (agent 'garden-social')

The owner, 24 Oct 2026: "see other people's gardens". Your garden goes to friends as a snapshot; they walk round it
in THEIR app, drawn by THEIR art engine, and can do a few small, capped things there. Nothing a friend sends ever
writes your garden: their app sends a request ("Sam watered the sunflower at 9,6"), and YOUR page applies it only
when it fits your garden.

| Part | File |
|---|---|
| The rules both sides use (PURE; Node evaluates it with the catalogue): reactions, acts, caps, the boost, XP, the guestbook line, the co-op bed's growth | `src/app/94-garden-social-0rules.js` |
| The kinds, the per-day caps, `friends/garden.json` | `lib/friends/garden.mjs`, `server/routes/garden-social.mjs` |
| The page core: publishing, applying waterings, parcels, your visits, feed lines | `src/app/94-garden-social-1core.js` |
| The visit page, the Garden page's Friends tab, the gallery, the panels in Friends | `src/app/94-garden-social-2visit.js` |
| The co-op bed (a Together space's Shared bed tab) | `src/app/94-garden-social-3bed.js` |

**On the wire** (docs/dev/FRIENDS.md section 9):

- `garden` (latest, scope `garden`): `gardenSnapshot()` plus `hearts` (hearts received), at most 30 KB (paths, then
  the furthest decorations, then plants are trimmed to fit). The page publishes it when the garden changes
  ('opendash:garden', 90 s after the last change, 5 s after a level-up), at most every 15 minutes, and once in 12 hours
  when nothing changed; every 5 minutes while the page is visible it checks whether a plant moved a stage. The
  per-friend permission 'Garden' (agent perms, `98-perms-0logic.js`, ON by default, not sensitive) decides who gets
  it; turning it off takes it back (`lib/friends/share.mjs` TAKEBACK_SCOPES), turning it on gives it again.
- `garden:ask` (handler, scope `gardenvisit`): a visit whose copy is older than 20 minutes asks for a fresh one; the
  gardener's server answers with the last published snapshot, only when it shares the garden with them, at most every
  10 minutes per friend.
- `garden:act` (handler, scope `gardenvisit`, 2 friendship XP): `{t: visit | water | gift | react | sign | like, p, x, y
  (water: the plant id and its top-left cell), k, item (gift: 'seed' | 'decor' and a catalogue id), e (react: an id
  from GSOC_REACTS), txt (sign: one line, 140 characters)}`. Visiting has its own scope, so turning YOUR garden off
  for Sam never stops you visiting Sam's; on arrival an act is taken only when you share your garden with the sender.
- `garden:line` (event, local): feed lines made on this side: a friend shared their garden, reached a level, a rare
  plant of theirs bloomed (from their snapshots); your own level-ups and ribbons (`friendsFeedPost`).

**Caps** (GSOC_CAPS, per day, [all friends, one friend]): sending visit [12, 1], water [5, 1], gift [3, 1], react
[16, 3], sign [6, 1], like [12, 1], ask [40, 6]; receiving visit [60, 1], water [12, 1], gift [8, 1], react [80, 3],
sign [30, 1], like [80, 1]; at most 12 unopened parcels from one friend. The guestbook and parcels can be turned off.

**Applying** (`94-garden-social-1core.js`): a friend's watering waters the plant of that kind at that cell and, once a
plant a day and six a day in all, adds GSOC_BOOST.hours (3) of growth (`fb`); a plant that has moved or been picked is
left as it is. Each leaves a ledger entry `fw.<message id>` (two devices never apply one twice), then the server is told
(`POST /api/garden-social/applied`). Parcels wait in the Friends tab until you unwrap them (`gg.<message id>`: +1 of the
item). A gift you give leaves your bag at once (`gs.*`, -1) and goes after a 6-second Undo; a guestbook line waits
the same. Your visits give your own garden a little XP (GSOC_XP: visit 2, water 3, gift 3, sign 2, like 1, react 1;
`sx.<day>.<kind>.<friend>`, so once a friend a day each).

**Ribbons** (in the catalogue; their facts come from `gardenSocialFacts()`): Garden tourist (visit on 7 days), Good
neighbour (water 10 plants), Kind words (sign 5 guestbooks), Generous gardener (5 gifts), Much loved (10 hearts).

**Pages.** `#view=garden:visit:<friendId>`: their garden at your time of day (cached per change and per time of
day), you at the gate in your outfit (`friendsSceneFigureEl`) walking over to what you water, them waving when they
are around, your pet when you have one (the renderer asks `petGardenSprite` with `readOnly`); Look / Water, Give a
heart, React, Leave a gift, the guestbook; "Today in Sam's garden" (all optional). `garden:friends` (the Garden page's
Friends tab, a count of what is new): visits to your garden and parcels to unwrap, your guestbook (hide a line, Undo),
friends' gardens (a gallery: sorted by their last change, no scores), who sees your garden and the guestbook and gift
switches. In Friends: the hangout's 'Gardens' panel and a friend's 'Garden' panel (`Friends.registerPanel`). Home's
Fun list gets "Friends' gardens" (`gardenFunNavAdd`); the palette `garden-friends`.

**The co-op bed** (a Together space's 'Shared bed' tab): the space part `bed` (`lib/friends/spaces.mjs`): an element
`{id, by, at, plant, x, y, v}` per plant in an 8 x 3 bed (24 at most) and a map `water {memberKey: ms}` (each member's
own last watering; only the planter changes or digs up a plant). Planting takes a seed from your own bag (a ledger
entry `cb.*`, Undo gives it back) and writes a line in the space's feed. Growth (`gsocBedState`): time and season like
the garden, half speed while dry, plus 4 hours for every member who has watered it (at most 6): the more of you tend
it, the sooner it blooms. A member can water each plant every 6 hours (1 garden XP, five a day).

**Files.** `friends/garden.json` (SYNC_FILES `friends-garden`, e2e only): `acts` (what friends did in your garden and
you in theirs, 60 days; guestbook lines a year, the newest 200), `bank` (older acts counted by month: the lifetime
tallies), `seen` (each friend's garden level and rare blooms already in the feed), `asks` / `asked`, `prefs` (book,
gifts, seenAt). Friends' snapshots themselves are in `friends/shared.json` (kind `garden`).

**Routes** (`server/routes/garden-social.mjs`, the normal router's protections): `GET /api/garden-social`,
`GET /api/garden-social/friend?id=`, `POST /api/garden-social/act | ask | applied | hide | prefs`; open tabs hear
`event: garden` (`gardenSocialOnEvent`, `86-live-sync.js`).

Gaps: a friend on an OpenDash before 2.18 drops these kinds quietly (you see "sent"). Caps live in
`friends/garden.json`, which reaches your other devices through sync only, so two devices offline from each other can
each use a day's caps. A visit shows their garden as of their last snapshot (stages move between snapshots).

## 12. The walking world, the lake, fishing and bug catching (2.22)

User request, 30 Oct 2026: "update the garden and games section, so better animations and unlockables on profiles, pets, bigger
garden, make it render better, QoL as controls are shit ... a fishing mini game similar to Stardew Valley ... collect fish, trade
them / gift them to other people, showcase them ... upgrades to fishing rods ... bug collecting too. I want the player to always be
in the garden and the fishing mini game to be connected to it. You can move the player around with click."

| Part | Files |
|---|---|
| The bigger world: `GARDEN_WORLD` is 28 x 18 cells (the first 20 x 11 are exactly where they were: every saved x, y stays valid); the Wild woods (east, level 4) and the Lake (south, level 1) in `GARDEN_AREAS`, `GARDEN_PROPS` (the pier, the tackle shop, the mooring post, the reeds, the forest edge), `gardenWaterZone(x, y)`, `gardenPropAt`, new tiles | `94-garden-0catalog.js` |
| The catalogue of 39 fish, 9 finds, 33 bugs, 5 rods, 4 nets, 5 baits, 6 floats, the economy (`GARDEN_CATCH_ECON`), the odds (`gardenFishOdds`), the order board (`gardenTradesFor`), the showcase's wire form (`gardenShowClean`). PURE; Node evaluates it (`lib/friends/garden.mjs`) | `94-garden-fish-0catalog.js` |
| The art: parametric fish (12 body shapes x patterns), bugs (16 shapes), finds, gear icons: `gardenFishArt`, `gardenBugArt`, `gardenGearArt`, `gardenCatchSvg(kind, id, px)` | `94-garden-fish-1art.js` |
| The ground and scenery: the lake, pier, woods, tackle shop, boat, reeds, forest edge; the decorations that show catches (aquarium, bug case, trophy board, fish weathervane, bait bucket) | `94-garden-fish-1world.js` |
| The engine: gear, casts, `gardenFishPlan` / `gardenCatchFish`, `gardenBugsNow` / `gardenCatchBug`, bag, market, order board, showcase, facts | `94-garden-fish-2core.js` |
| The play: casting, the bite, the reel (a bar and a fish on a track), the net, the bugs' own little minds, the catch card | `94-garden-fish-3game.js` |
| The Catch page (`#view=garden:catch`: Bag and market, Fish book, Bug book, Tackle, Showcase) and the card in the side panel | `94-garden-fish-4page.js` |
| The player, the pet that follows, click-to-walk (A*), the keys, the camera | `94-garden-world-0walk.js` |
| Your catches on your profile card (`profileExtend` key `catch`; server half `lib/profile-catch.mjs`) | `97-profile-5catch.js` |
| Styles | `src/styles/94-garden-fish.css` |

**State** (all in `state.garden`, synced; `lib/sync/model.mjs` has `fl`, `bl`, `fd` as maps): `fl {fishId: {n, b (best cm), q (best
quality), d, l, g}}` (the fish log), `bl {bugId: {n, d, l, g}}` (the bug book), `fd {day: {c (casts), k (bugs caught), mf, mb (market
coins at full rate), o (orders done)}}` (kept 8 days), `prefs.{rod, net, bait, bobber, show: {f, b}, px, py, cam, zoom}`. What you carry
is the garden's ledger and item map as before: `fish:<id>-<q>` (q 0..3), `bug:<id>`, `gear:<id>`, `bait:<id>`; ledger kinds `fc`, `bc`, `ct`, `od`.
Selling a fish never loses its log entry; the showcase shows your best of each kind.

**Rules that keep it calm**: a cast is spent, a fish that gets away costs only the cast; 10 casts a day plus one per 12 credited minutes
(30 at most); the market pays full price for 90 coins of fish and 50 of bugs a day and a fifth after that; the order board (3 a day) is
paid in coins and goods and does not use the market up; rods and nets come from coins and garden level (the golden ones are ribbon
prizes: Master angler, Entomologist); bait is optional. Nothing here pays by clicking.

**Walking**: the figure is `profileFigureSvg(profileGet().avatar)` (the same one the scenes use), a node inside `.gd-objects` put in depth
order by `data-z` (every item has one now); the loop (`_gwFrame`) moves it along an A* path over `gardenWalkable` cells (plants of stage 2 and up,
objects, water, locked areas and non-walkable props block), writes attributes only when they change, and pauses with the tab. The camera is the
SVG's own `viewBox` (follow, or the whole garden), so `getScreenCTM` hit-testing, the overlays and the scene's patching all keep working. The `actors`
layer (`<g class="gd-actors">`) is never patched: bugs, the line, the bobber and the leaping fish live there. Tools still act at once; a click on a
plant makes you walk over. Keys: W A S D / arrows (Shift creeps), Space / E, 1 Plant and 2 Decorate, Shift+W water all, H pick all, Delete digs up the selected plant, + - F C camera, Esc.

**Free movement, not cells** (30 Oct, second round: "less grid based movement ... just click on things like the ocean to start fishing and the bugs to catch them ... the shop and other menu things in the world ... the pet is a little big"): the grid is only used to find a way round things. Your feet are a small oval (`GW_FOOT`, `_gwFree`) that touches only the cells it overlaps, a route (`_gwRoute`) is A* over the cells string-pulled with a straight-line test for the oval (`_gwLos`) and ends exactly where you clicked, and the loop cuts corners as soon as it can see the next waypoint, with a soft start and stop (`GW_ACC`). **There are no tools for fishing or bugs**: `gardenWorldClick` reads what is under the pointer (`_gwPointAt`, the exact point): a building or board (`GARDEN_PROPS` with `act`: you walk to its door and it opens), a bug (`_gwBugNear`: you creep up on it), water (`gardenFishClickPt`: you walk to a place the rod reaches and cast to the exact spot), a plant or decoration (the current tool, as before; the aquarium, bug case and trophy board open the showcase), else the ground. `gardenWorldHover` puts the same thing in the status line and the cursor (`data-hover` on the stage). Only Plant and Decorate keep their clicks.

**The menus are in the world**: along the lake shore (y 11) stand the market stall (Basket), garden shop (Shop), notice board (Almanac and ribbons), field journal (fish book), camera (photo mode), tackle shop (Catch > Tackle), post box (Friends) and sundial (time-lapse); each is a row of `GARDEN_PROPS` (`kind` says how it is drawn in `94-garden-fish-1world.js`, `door` where you stand, `tall` how far its art stands above its footprint for clicks). The garden tab has no tab bar and no Shop / Almanac / Friends / Photo / Time-lapse buttons any more (the pages are still routes, the palette still opens them, and their own tab bar is there to get back); the next-step card's "Walk to the shop" walks you there (`gardenGoToProp`). Your own pet is drawn at half scale (`GW_PET_SCALE`) beside the full-size figure.

**Friends**: the snapshot carries `cv: 1` (it can take fish and bugs) and `sh` (the showcase: `{f: [[id, q, cm]], b, rod, net}`); gifts of
`fish` (`carp-2`) and `bug` use the existing parcel flow (`gsocGiftOk`, caps, Undo); sending needs the friend's snapshot to say `cv >= 1`
(an older OpenDash would drop it); a received catch also goes in your book (`gardenCatchReceived`). The visit page shows their showcase
(`gardenCatchVisitCard`), and the aquarium, case and board draw it in their garden.

**Unlockables**: garden ribbons unlock avatar hats and pins (`ribbon` on a kit option, `ctx.ribbons`), card titles (97-profile-0look.js) and pet hats
(97-pets-0kit.js): Angler's hat (Angler), Explorer's helmet (Bug catcher), fish and butterfly pins (First catch, First bug), titles Angler,
Master angler, Bug whisperer, Entomologist, Market trader; floats unlock by catching (`GARDEN_BOBBERS`).

**Third round (30 Oct, "the grid highlight should not be there ... the shop should be a pop up ... get rid of the tools ... fishing should lock you in")**:
- *No grid highlight.* The hover square is gone (`.gd-hover` and `.gd-sel` are `display: none`). The thing under the pointer lights up instead (`_gdpHighlight`: class `gd-hl` on the plant, decoration or building node; a bug gets its own glow; the water gets the rod cursor), and the selected plant glows (`gd-selected`). The ghost of a seed or decoration being placed is the one place a square of ground still shows.
- *Pop-ups, not pages* (`94-garden-world-1popup.js`): the buildings open `gardenPopupOpen(tab)` with the garden's ordinary dialog (`openDialog`: click outside, Esc or the x closes it). The five pages fill any element, so the same code serves the pop-up and the `#view=garden:*` routes; `gardenGoPage(view)` is the link between them (a pop-up in the garden, a page elsewhere); `_gdpRepaint` refreshes an open pop-up. The garden tab has no tab bar any more (the pages keep theirs).
- *Two modes, not seven tools.* Plant and Decorate are all that is left of the toolbar (plus Water all, Pick all, Undo). A click on a plant does what it needs (`_gdpSmartPlant`: ripe is picked, thirsty is watered, wild is trimmed; pressing on a thirsty plant and dragging waters a row with one Undo); right-click opens `gardenCtxMenu` (pick, water, fertilise, trim, dig up); the side panel's inspector has the same buttons; Delete digs up the selected plant. Saved `tool` values from before ('water', 'feed', 'trim', 'dig') fall back to the plain hand.
- *Fishing locks you in.* A cast starts `_gwFishFocus(true)`: the camera closes in on you and the bobber (`_gwCamTarget`), nothing under the pointer lights up or says anything, the toolbar and camera buttons rest, the keys and clicks on the world do nothing, and a bar says what to do (`Waiting for a bite…`, `Now! Click or press Space`) with a Reel in button (Esc does the same). A click while you wait no longer winds the line in. A line survives the garden being drawn again (`_gwFishResume`: the state arriving from another tab or the server redraws the page).
- *Bugs.* The chase picks a free spot within reach of the bug, wherever it is (over a plant too), says so and stops when it is too far in among the plants (`_gwNetWalk`), gives up after 9 s, and a bug sits still while you creep up on it. The hit test uses where the bug is drawn (lifted).
- Where you stand is per device (`localStorage`), no longer in the synced state: a save for every step made the garden redraw and put you back where you were 1.5 s ago. A building you walk behind turns see-through (`gd-behind`).

**Fourth round (30 Oct, "the highlighting is a bit weird ... can still get stuck ... hold down left click and it moves constantly to the mouse ... the sunflower doesn't do anything ... clicking on the boat should bring up a menu to travel to friends' gardens")**:
- *One answer for hover, press and click.* `gardenWorldPick(it, cell, ev, m)` says what a click would do (`prop`, `seed`, `bug`, `plant`, `decor`, `water`, `ground`); the hover (`gardenWorldHover`), the press (`gardenHoldStart`) and the click (`gardenWorldClick`) all use it, so the highlight never promises something else. `_gdpPickItem(ev, cell)` finds the plant or decoration: what is painted under the pointer, else the one whose drawing's box (`getBoundingClientRect`, rooted within about six rows below the pointer) holds it, so a tall flower lights up everywhere, not only on a petal or at its foot (the old cell lookup only covered the foot).
- *Clicks that did nothing.* A press that wobbled more than 4 px was a drag and thrown away (now 9 px); the net chase (`_gw.netting`, state `chase`) re-aimed every 0.35 s and so overrode a click elsewhere (`gardenWalkToPoint` ends it unless it is the chase's own, `o.net`); a click in the sky or past the edge had no cell and did nothing (it is clamped into the garden and walks to the nearest ground, radius 8); a redraw of the page (`gardenWorldStart` again) cleared the walk (it now keeps `_gw.path`, and `gardenWorldPainted` no longer snaps you out of an obstacle: `_gwPushOut` glides you out and carries the walk on); a pop-up closed some other way left `_gdp.pop` set (`_gdpPopOpen()` forgets a pop-up whose element is gone); a mouse move with no button down ends a press whose release was missed.
- *A click is never met with silence.* `_gdpSmartPlant` picks a ripe plant, waters a thirsty one, trims a wild one, and otherwise says how it is doing (`_gdgNote`, which no longer stacks the same note).
- *Press and hold.* Pressing bare ground (`gardenWorldPick` says `ground`, tool hand) walks you there at once (`gardenHoldStart`); held for 0.28 s or dragged more than 6 px it becomes steering (`_gw.hold.steer`): the frame aims straight at the pointer's spot in the garden and moves with `_gwMoveBy`, like the keys (sliding along walls, never pathfinding), and the camera follows you, so you keep going; letting go while steering stops you (`gardenHoldEnd`), letting go of a quick click does not. The keys, a cast and a redraw end it.
- *The rowing boat.* `GARDEN_PROPS` has a `boat` prop (`act: 'sail'`, fractional x and w so its box is the boat and the water beside it still casts): hover lights the boat (`data-prop="boat"`), a click walks you to the shore beside it and opens the `sail` pop-up (`gardenSailTab` in 94-garden-world-1popup.js: the Post box's gallery of friends' gardens, `_gsvGallery`), and a card takes you to `#view=garden:visit:<id>` and closes the pop-up. `prop.verb` is the word in "Click to ..." (the boat says climb in).
