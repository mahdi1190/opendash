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

(The page itself changed in 2.23: no tabs, side panel, tray or tour. See section 13. The Home card below still holds.)

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
- 2.23, measured with 200 plants on the 60 x 30 world: a frame that changes anything repaints the whole stage (paint plus layerize, about 8 ms here), so the rule is **no frame without a change**. The world's loop has three paces (`_gwPace`): every frame while you or the camera move, about 30 a second while something on screen is moving, about 10 a second when nothing is. Everything it draws writes only what changed, and nothing off screen writes at all (bugs, sprites, pets). A sprite that has not moved for a moment does not hold the pace up; one that knows it is resting can set `S.still`. CSS animation is the same: anything off screen has `gart-rest` (plants, visitors, water, needs marks) or `gart-nosky` (clouds), and at most `GART_MOTION_CAP` plants move. Well off screen a thing also has `gart-off` (`display: none`): it is not painted at all, which halved the cost of every frame with 200 plants. Ask for a new running animation only if it earns its place: each one is a separate paint chunk on every frame.

## 11. Gardens with friends (agent 'garden-social')

Playing together live, when the host allows it, is in docs/dev/GARDEN_TOGETHER.md. What follows is the saved copy and the small things that go by message; a visit falls back to it whenever nobody is at home.

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

**Pages.** `#view=garden:visit:<friendId>`: the same world as your own garden, with theirs in it, at your time of day (2.27.5; GARDEN_TOGETHER.md section 10). You walk, zoom and use the hotbar as at home;
one small tag says whose garden it is and takes you home. The Guestbook panel (the menu, `gardenVisitNotes`) has Give a heart, React, Leave a gift, the guestbook, their showcase, what is growing and "Today in Sam's garden" (all optional). `garden:friends` (the Garden page's
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

**Walking**: the figure is the person from the avatar page, drawn by the avatar kit itself (`gartPlayerPaint`, section 13), a node inside `.gd-objects` put in depth
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

## 13. The game layer (2.23): the whole page is the world

Owner, 30 Oct 2026: "moving the player around is unclear, the UI is very unclear ... I hate how messages pop up when you can't do something ... the garden needs to be bigger ... the side buttons must go ... objects overlap wrongly ... think Animal Crossing". Polish first, then scale, then quantity.

| Part | File |
|---|---|
| `gameDeny`, `gameDenyOf`, `gameCheer`, `gameCursor`: how the garden says no and yes | `94-garden-0feel.js` |
| HUD, menu, hotbar, bag, bubble, needs marks, arrow, walk hint, minimap | `94-garden-world-2hud.js` |
| Walking, the route marker, `gardenWorldPick`, the world API | `94-garden-world-0walk.js` |
| Panels over the world (`_GDPOP`: one row per panel) | `94-garden-world-1popup.js` |

**A visit is this page too.** World code asks `gardenHere()` (your garden, or the one you are visiting), never `gardenModel()`; what is yours wherever you stand (wallet, shop, goals) asks `gardenModel()`. Actions in `94-garden-1core.js` ask `gardenVisitAct` first (GARDEN_TOGETHER.md section 10).

**The page.** `html.gd-immersive` hides the app's sidebar and top bar while you are in the garden; X in the corner leaves. There are no tabs and no side panel. `#view=garden:shop` and the other old routes open the world, then the panel. Nothing here is page chrome: only overlays on `.gd-stagebox`.

**A click.** `gardenWorldPick(it, cell, ev, m)` is the one answer to "what would a click do here?": `prop`, `seed`, `bug`, `sprite`, `plant`, `decor`, `land`, `water`, `spot`, `ground`. The hover (`_gdpIntent`: cursor, highlight, label), the press (`gardenHoldStart`) and the click (`gardenWorldClick`) all read it. You walk up first and the action happens on arrival (`gardenWalkAct`); only a drag across a row acts at once (one Undo). Keep that order: a new kind of thing is a new `kind` here and one `case` in `_gdpIntent`.

**Saying no.** Nothing in the garden toasts a "can't". `_gdpSay` and `gameDenyOf` turn an engine answer `{ok: false, msg}` into pictures (the words go to a screen-reader live region); engine functions keep their plain sentences for the assistant's tools and for the palette and Home, where there is no world to flash. Toasts remain for real errors. Undo is the pill by the hotbar.

**Default zoom.** Until you choose one, `_gwCamDefaultIdx` picks the zoom from the window: the gardener about 135 px tall, and never fewer than seven cells across on a phone. **Marks.** A plant that wants you has a soft ring on the ground; only the `GH_NEED_MARKS` nearest you carry a mark above them, placed on the drawing's own top. **Land you do not own yet** is a wild meadow with a low fence, a closed gate and a worn path (`locked` in 94-garden-art-f-world.js): all baked, so it costs one image; a row's `tile` and `water` give it a hint of what it will become. **Quiet.** While the world fills the window (`html.gd-immersive`) a passing toast waits until you leave (`toastHeldFlush`), and What's new, the New card and first-run notices wait too; errors, waits and Undo still show. Garden code that must say something now passes `now: true`.

**Land.** `GARDEN_WORLD` is 60 x 30 (`coreCols`, `coreRows` are the 28 x 18 a 2.22 friend can draw). An area with `buy` is bought with coins from level `lv` (`gardenBuyLand`, ledger item `land:<id>`, so it syncs and banks like everything else, with no new state). `gardenAreaAt` knows what you own through `gardenLandSet`. A snapshot carries open area ids; an older friend drops what it does not know and draws the 28 x 18 it knows. Stay within 12 areas in total, or older friends reject the snapshot (`areas: S.list(S.id(), 12)` in `lib/friends/garden.mjs`). Crops: `all` is the old 28 x 18, `world` is everything; `gardenCropFor(areas)` picks.

**Depth.** Everything alive is a node in `.gd-objects`, sorted by `data-z`, the row its feet are on: plants, decorations, buildings, visitors, friends' pets, you, your pet, bugs and sprites. Nodes the loop owns carry `data-live`, so `_gdrPatchItems` puts them back in their row and never removes them. A faint copy of your figure (`.gd-pl-xray`) in the UI layer keeps you findable behind a tree. The route marker and the needs marks are UI and draw on top on purpose; so do fishing's line and bobber, which only ever cross water.

**Registries, not ids.** Engine code never asks for an id. How an area's ground looks is `look`; whether water is a lake is `fishing`; how a building is drawn is `kind` (the `art` table in `gardenWorldProps`); what it opens is `act` (`_gwOpenProp`); what a decoration does is `effect.kind` (`_gdpEffectText`, `GARDEN_SURFACE_BY_EFFECT`). Saves hold ids, and an id nobody knows is skipped.

### The world API (for anything that lives in the garden)

- `gardenWorldObjects(m)`: `[{kind, uid, id, name, x, y, w, h, z, height, top: {x, y, lift}, node()}]`: what stands in the garden and where something could land. `top.lift` is pixels above the ground. A row can set `perch: 0.8` (a share of its height); a seat uses `GARDEN_SURFACE_BY_EFFECT.sit`. Not for every frame.
- `gardenWorldFree(x, y, r)`: the one collision map (the same grid you walk on), for feet `r` cells wide. `gardenWalkable(cx, cy)`, `gardenReachable(cx, cy)` are its cell forms.
- `gardenWorldAdd(sprite)`: a moving thing, sorted with everything else.
  `{id, svg, x, y, lift, update(dt, s), ground, foot, hit, label, cursor, onClick(s)}`. `svg` has its feet at 0,0. `ground: true` makes `s.moveBy(dx, dy)` slide along the collision map. `hit` (cells) makes it clickable through `gardenWorldPick`, with the hand free: the cursor and label show on hover; `onAim` runs at once (it knows you are coming), you walk up, then `onClick` runs (with no `onClick`, `onAim` alone is the click and you stay where you are). `hitUp` (px) raises the middle of the click target above its feet. Returns the sprite with `moveBy`, `perch(obj)`, `unperch()`, `remove()`.
- Elevated: `s.perch(obj)` puts it on a `gardenWorldObjects` row's `top` and sorts it just in front of that thing, so a bird on a fence is hidden by whatever hides the fence.

```js
// a hedgehog that pootles about (a later agent's creature, as an example)
const h = gardenWorldAdd({ id: 'hedgehog', svg: myArt(), x: 12, y: 9.5, ground: true, foot: 0.15, hit: 0.6, label: 'Hedgehog', onClick: () => gameCheer(null, { text: '♥' }),
  update(dt, s) { s.t = (s.t || 0) + dt; s.moveBy(Math.cos(s.t / 3) * dt * 0.4, Math.sin(s.t / 5) * dt * 0.2); } });
```

### How to add things (each is one row; no engine code)

- **A plant**: one `_gP(...)` row in `94-garden-0catalog.js`: id, name, category, rarity, growth speed, seasons, look (`form` picks the art), then `yield`, `price`, `lv`, `unlock`. It is in the shop, the almanac and every bed its category grows in.
- **A decoration**: one `_gD(...)` row: id, name, category, `{w, h, price, lv, rot, look, v, effect: {kind}, blurb}`. Give it `perch` if something should land at a particular height. A new behaviour is one word in `effect.kind`, plus its sentence in `_gdpEffectText`.
- **A building or scenery**: one `GARDEN_PROPS` row (`kind`, `act`, `door`, `tall`); a new `kind` is one function in the `art` table; a new `act` is one line in `_gwOpenProp`; a panel is one row in `_GDPOP`.
- **Land**: one `GARDEN_AREAS` row with `buy`, `lv`, `look`, `cats`, a rectangle east or south of what exists, and at most 12 areas in all. Nothing already placed moves.
- **A seasonal task**: one `GARDEN_QUESTS` row with `season`. It pays once a week.
- **A pet, a creature**: pets are 97-pets-* catalogue rows (agent PETS); a creature is one row in `GARDEN_CREATURES` (section 17).

Worked example, a decoration with a seat at a chosen height:

```js
_gD('toadstool-stool', 'Toadstool stool', 'seat', { w: 1, price: 40, lv: 3, perch: 0.7, look: { c: '#c8453a', c2: '#f4ead8', h: 0.55 }, effect: { kind: 'sit' }, blurb: 'Just the right size, if you are small.' }),
```

That row alone puts it in the shop, the bag and the almanac, lets you place it on the snapping grid with a ghost, gives it a bubble (Move, Back in the bag) and tells anything using `gardenWorldObjects` where to sit. If the art kit has no drawing for it, the art contract in section 2 says how to add one.
## 14. The look (2.23, the style guide)

The owner, 30 Oct 2026: "better SVGs and animations ... generally make it look better visually", then "think Animal Crossing": soft, cosy, readable. Take the feel, never its art, characters or names. Polish before quantity. Everything drawn for the garden follows this.

- **Light** comes from the upper left, always. Lit side left and top, shade right and underneath. A shadow falls down and to the right.
- **Tones**: two or three per colour, from `GART.tone3` / `leaf4`: deep, base, light, plus one small soft highlight. No gradients on objects (the sky, the night's pools of light and glows may use them).
- **Line** (`_gartInk`, added by `gardenArt`, so art files do not draw it): a deeper tone of the shape's own colour, never black, the same weight on screen for everything, painted behind the fill. Washes (anything with opacity) and specks have none. Keep it soft: if a small flower goes dark, the shape is too small, not the line too thin.
- **Shapes**: round corners, chunky silhouettes that read at 40 px, no thin detail that only shows zoomed in. A plant's outline should identify it with the colour taken away.
- **Young plants** are drawn bigger than life (`_GART_YOUNG`) on a patch of dug earth (`_gartPatch`), so a sprout reads on a lawn.
- **The gardener** (`94-garden-art-g-player.js`) is the avatar, not a lookalike. The owner: "It should be identical to the avatar page." The file cuts the kit's own drawings at their seams (`profileAvatarSvg(a, {layers: true})`, `profileFigureSvg(a, {layers: true})`) and stands them up, about 70 units tall and four heads high. Front: the portrait full on, with the figure's arms and legs. Side: the figure's body with the portrait's head, its face slid the way it walks; the other side is the same drawing mirrored. Back: the top's outline, the kit's own hair shapes on a head of hair, the hat, a backpack or a cape. **So a new wardrobe item needs nothing here.** This file only adds what the kit has no drawing for, in the kit's colours: the front of the body below the portrait's edge (`_gplLower`), a bag at the hip, the back view. A garment that hangs open at that edge goes in `_GPL_OPEN`. It is the one figure in the garden that does not follow the rules below on line and proportion: it follows the avatar page.
- **Palette by season**:

| | lawn (base, light) | leaves | water (shallow, deep) | sky (top, horizon) |
|---|---|---|---|---|
| Spring | `#7cbd58`, `#a9d870` | fresh yellow-green | `#8fd0d8`, `#2c6f9e` | `#6fb8ea`, `#eaf7f4` |
| Summer | `#6fae4e`, `#a0cf66` | deep green | `#86d2d6`, `#22639a` | `#5fb0ea`, `#ecf7ee` |
| Autumn | `#94a650`, `#c4c26a` | orange and gold (deciduous), olive (the rest) | `#90bfc4`, `#2f6484` | `#7fb0d4`, `#f6ebd2` |
| Winter | `#a3b490`, `#cdd6bc` | bare, or dulled evergreen; nothing looks dead | `#bedae4`, `#50829e` | `#a4c0d6`, `#f0f2f4` |

- **Time of day**: dawn is rosy, dusk gold going violet, night a blue wash (`gartNight`) with real pools of light cut out of it round lights, glowing plants, the shops' windows and the pier.

**How it is drawn.** `94-garden-art-f-world.js` paints the ground, water, far distance and sky; the renderer asks for them behind `typeof` guards and keeps its own drawing as the fallback. `.gart-bake` groups may be as rich as they like: `94-garden-art-h-life.js` turns each into one bitmap after the first paint (cached by content). The strings stay vector, so the photo mode and thumbnails draw from the same source. Anything clickable or moving goes in `.gart-live`, never in a bake (the land-for-sale sign, foam, ripples).

**The second pass** (the first redrew the world and the gardener; this one the things in it): flowers and most veg come from one builder (`gartBloom` in `94-garden-art-j-bloom.js`: heads, leaves, one row per form), trees from a puffy `crown` with sturdy trunks, visitors from a `bird` builder and small helpers (`94-garden-art-c-visitors.js`), the thin decorations from kit parts (`94-garden-art-k-decor.js`), fish and bugs from plumper tables with big eyes and no thin lines (`94-garden-fish-1art.js`), and the shore props in plain fills through `_gwInked` so they get the same line (`94-garden-fish-1world.js`). Two rules came out of it: nothing is drawn smaller than about two thirds of a cell (`_gartFit`), and a decoration's fine strokes get a little more weight automatically (`gardenArt`).

**Motion.** Only what you can see moves, at most `GART_MOTION_CAP` items nearest the middle (`gart-rest` on the others), decided a few times a second and only when the view changed. A stage going up pops and settles; a harvest, watering or planting bursts (`opendash:garden` events). No `requestAnimationFrame` of its own; reduced motion, the Fun level and a hidden tab stop everything.

**The walker's two hooks** (`94-garden-world-0walk.js`): `gartPlayerPaint(inner, _gw)` at the top of the drawing in `_gwBody`, `gartPlayerStep(_gw)` in `_gwApplyNode`. Poses are opt-in: `gartPlayerAct('water' | 'dig' | 'pick' | 'fish', ms)`; water, plant and harvest already call it from the garden's events.

## 15. How to add things (one data entry, no engine code)

Save data stores ids, so new content needs no migration. An id this version does not know is skipped when drawing (`_gdrItem`), so a friend on an older version still loads your garden. Never rename or reuse an id. Add rows, build (`node build.mjs`), look at it.

Art comes from four places, cheapest first: an existing **form** (plants), a **bloom row** (`gartBloomForm`, for a new flower or fruit form), **kit parts** (`look.parts`, `94-garden-art-i-kit.js`), or, only for something the kit cannot say, your own `gartDefine('decor:<id>', ...)`. Movement is by name: `GART_CLIPS` (`sway`, `bob`, `glow`, `flutter`, `spin`, `swing`, ...) for parts and whole drawings, `motion` (`buzz`, `flutter`, `hop`, `walk`, `crawl`, `dart`, `swim`, `glow`, `sit`) for where a creature goes.

Parts: `post block box pot roof bowl orb lantern flag bush stone mushroom` for things that stand; `string board birdhouse sails obelisk vane hook chimes basket mailbox ball` for the things on them; `body head beak legs tail wings` for creatures. To add a part, call `gartPart('name', (p, T, T2, A, o, r) => markup)` once, and every row can use it. A `string` hangs anything between two posts (`bead: 'bulb' | 'paper' | 'flag' | 'holly'`).

**A plant**: a row in `GARDEN_PLANTS`, using any form from section 4. Its five growth stages, seasons, thirst, droop and sparkle come with the form. `look.mix` (a list of colours) gives each head its own colour.

```js
_gP('blue-poppy', 'Blue poppy', 'flower', 'rare', 'medium', ['summer'], { form: 'poppy', c: '#5a8fe0', c2: '#f2c21e', leaf: '#6a9a5a', h: 0.9 }, { yield: _G_CUT(6, 48), lv: 8, attracts: ['bumblebee'], blurb: 'Blue as a clear morning.' }),
```

**A new flower form**: one row in `94-garden-art-j-bloom.js`. The builder draws all five stages, the seasons, the winter rest (a plant flowers through winter if its catalogue `seasons` includes winter), seeded variety and sway, and puts all heads of a colour in one path, so a dozen heads cost the same nodes as one.

```js
gartBloom('form:bell-tower', { box: [46, 90], head: 'tower-bell', R: 8, n: [1, 2], tall: [80, 86], spread: 16, sw: 2.4, leaf: 'oval', ln: 5, ll: 24, lw: 8, seed: 'seed', q: { n: 8, len: 44 }, budHead: 'tower-bud' });
```

Heads (`GART_HEADS`, add one with `gartHead(name, (H, x, y, R, q) => ...)`, adding to `H.b` base, `H.u` under, `H.l` light, `H.s` shade, `H.c` centre): `daisy sunflower trumpet poppy star pompom dahlia rose peony pansy blossom campion iris lily hibiscus passion orchid cup lotus bell bell-arch bell-drop tower-bell tower-disc tower-bud mophead umbel thistle clover bud paradise trap tuft palm`, and for fruit and roots `berry tomato drop pod cob grapes raspberry rootball shoulder onion`. Leaves (`GART_LEAVES`, `gartLeafKind`): `strap oval blade round lobed feather heart`. Layout: `tall` and `spread` (stems), `dome` and `mound` (heads on a leafy dome), `along` (fruit up the stem), `trunk`, `moundY` (a canopy), `base` (a root at the foot), `frame` (a function drawing canes behind), `green: 1` (stage 3 is the same head, unripe), `pool` (stands in water; any row in the `water` category gets one).

**A decoration**: a row in `GARDEN_DECOR`. Worked example, a lamp on a post with a fern at its foot:

```js
_gD('fern-lamp', 'Fern lamp', 'light', { price: 24, lv: 4, effect: { kind: 'light' }, look: { c: '#4a5056', c2: '#ffe08a', h: 1, parts: [['post', { h: 44 }], ['lantern', { y: -44, r: 8 }], ['bush', { x: 11, w: 12, clip: 'sway' }]] }, blurb: 'A small light with a fern for company.' }),
```

Its footprint is `w` and `h` (cells), `layer: 'ground'` makes it a path, `effect.kind` is the behaviour (section 1 lists them), `unlock` the rule. Nothing else is needed: the shop, almanac, placement, snapshot and photo mode read the row.

**A creature**: a row in `GARDEN_VISITORS`. `when` and `needs` say where and when it appears, `spot` and `motion` how it behaves:

```js
_gV('plum-moth', 'Plum moth', 'insect', 'uncommon', { tod: ['dusk', 'night'], seasons: ['summer'] }, { bloom: 2 }, { chance: 0.4, spot: 'flower', motion: 'flutter', look: { c: '#8a5a8a', c2: '#f2d8a0', parts: [['wings', { y: -8 }], ['body', { w: 3, h: 6, y: -8, c: '#4a3244' }]] }, blurb: 'Out when the light goes.' }),
```

Fish and bugs you catch are rows in `94-garden-fish-0catalog.js`: pick a body shape and pattern, and `gardenFishArt` / `gardenBugArt` draw them. They draw small in the garden, so a new bug shape gets no thin line: stubby legs (`_gfaLegs`), big eyes (`_gfaEyes`), short feelers (`_gfaFeel`).

**A pet**: see the pets kit (`97-pets-0kit*.js`); its species are rows too.

**An event**: a row in `GARDEN_EVENTS` (its dates and what it gives). A seasonal decoration or plant then says `unlock: { event: '<id>' }`.

**Adding a hundred in one go**: write the rows, build, then render a contact sheet of the new ids at every stage (a throwaway page calling `gardenArt(id, {kind, stage, season})`) and look at it. Judge each at 40 px and at 150 px, on grass and on soil. A row that reads badly gets a different form or different parts; do not ship it hoping nobody looks.
## 16. Pets: the collection, and how to add a pet (2.23, agent 'pets')

Owner, 30 Oct: "way way more unlockable pets ... make the animations a lot better ... unlock stuff for treats, money, garden pets through doing garden stuff." Feel: a cosy field guide, a pet that is simply alive. Polish before quantity; a new pet is **one row**.

| What | Where |
|---|---|
| Species rows, lures, toys, beds, hats, colours, `petRoute` (how each is earned), friends' wire | `97-pets-0kit.js` (pure; Node reads it too) |
| Body kits and piece registries (`PET_KITS`, `PET_KIT_EARS`, `PET_KIT_TAILS`, `PET_KIT_PATTERNS`, `PET_KIT_BIRD_TAILS`) | `97-pets-0kitspecies2.js` |
| Hand-drawn species (`_PT_ART`; only when no kit fits) | `97-pets-0kitspecies.js`, `2`, `3` |
| Rules: unlocks, friendship, garden treats, shop, rare visitors (the assistant runs these too) | `97-pets-1collect.js` |
| Named clips (`PET_CLIPS`), a gait's defaults, the stage, the celebration | `97-pets-5stage.js` |
| The collection screen, the room | `97-pets-6collection.js` |
| The garden's behaviour library (`PET_BEHAVIOURS`), roaming, rare visitors in the world | `97-pets-7roam.js` |
| The clips' keyframes, gaits | `styles/97-pets.css` |

**The rules that keep it honest.** Garden treats: one for every two crops, fish, bugs or bouquets (an order counts double), at most 4 a day; the count only goes up, so Undo cannot be counted twice; digging and replanting counts for nothing. Friendship: a treat 2, a pat 1 (the first 3 a day), a game 2 (3 a day), at most 6 a day per pet. Coins are the garden's: spending writes one ledger line. Nothing earned is taken away, and the pet you have now is yours whatever its rule is.

**Saves.** All new state is optional maps of ids in `state.pet` (`unl`, `roster`, `pack`, `bd`, `gt`, `buy`, `lures`, ... listed in the header of `97-pets-1collect.js`), merged per entry by the sync (`lib/sync/model.mjs`). No migration; a save without them just works. The first 14 species stay free, the 4 old rare ones keep their old rule, and each pet keeps its own look and name when you swap (`roster`).

**Friends.** A new species goes out as `{species: <its row's back>, real: 'otter', coat: 'x...'}`: an older app drops `real` (schemas drop what they do not know) and draws the older cousin in the pet's own colours; this one puts the real one back (`petSanitize`). A species nobody here knows is a cat, not a missing pet. Other pets let out in the garden go as the kind `pet:pack` (an older app ignores it, so it shows the companion alone).

**Motion.** Parts (`legsN`, `paw`, `legsF`, `legsG`, `tail`, `ears`, `head`, `eyes`, `wingN`, `wingB`, `bodyg`) are the same on every pet; the drawing's root carries `pt-gait-<gait>`, `pt-pose-<pose>`, `pt-act-<clip>`, `pt-run`. A clip is keyframes on those parts, so all pets get it; a part a species lacks simply does nothing. No CSS names a species. Off screen: `pt-off` pauses. Tiny: `pt-lite`. Reduced motion or Fun level Off: still.

### Recipe: add a pet (one row, no engine code)

In `PET_SPECIES` in `97-pets-0kit.js`:

```js
{ id: 'ferret', label: 'Ferret', kind: 'mammal', h: 0.2, gait: 'scurry', sound: 'Dook dook!', treat: 'pellet', rar: 1, back: 'redpanda',
  lock: { fact: ['bouquets', 3] },
  persona: { speed: 1.4, acts: ['dart', 'wiggle', 'sniff', 'groom'] },
  blurb: 'Steals one sock. Never the pair',
  art: { kit: 'quad', hr: 13, bl: 1.34, bh: 0.78, leg: 0.5, sit: 1.0, legW: 4.6, ear: 'round', earSize: 0.25, tail: 'bushy', tailSize: 0.7, belly: true,
         muzzle: [0.42, 0.3], nose: '#e88a9a', whisk: true, patterns: { mask: 'mask', socks: 'socks' } },
  coats: _ptC([['sable', 'Sable', '#8a6a50', '#f4e6d0', '#3e2c22'], ['albino', 'Pale', '#f6f0e4', '#ffffff', '#dccfba']]),
  marks: _ptO([['mask', 'Mask'], ['plain', 'Plain'], ['socks', 'Dark socks']]) },
```

That row is real (it ships, with `wren` for the `bird` kit). It alone puts the ferret in the collection with its outline and one line ("Make 3 bouquets"), gives it all three poses, every gait and clip, accessories, the garden's roaming, scenes, the assistant's tool and a safe cousin for older friends.

- **id**: stable, never reused; no hyphens (the journal keys use them). **back**: one of the first 18 species. **h**: real metres (the size class). **gait**: `trot scurry hop plod waddle fly float paddle glide scuttle stomp roll`. **rar**: 1 common to 4 mythical. **treat**: a `_PT_TREATS` drawing.
- **lock**: omit for free, or one of `{life: {life: 'fox', hint: 'Say hello to a fox'}}` (any rule `gardenLifeUnlocked` knows: found this creature, `lifeCount`, `lifeKeep`, `lifeEgg`), `{treats: n}`, `{coins: n}`, `{fact: [key, n]}` (a `gardenFacts` key or `h-spring`..`h-winter`; add its line to `PET_FACT_LINES` if it is new), `{grow: [plantId, n]}`, `{bond: [species | '*', level]}`, `{ach: n}`, `{level: n}`, `{streak: n}`, or a rare visitor `{enc: {lure: 'apple', tod: ['dawn'], seasons: ['spring'], rain: true, every: 3, when: 'At dawn'}}` (shows one 20-minute spell in `every`).
- **persona** (optional, the gait's defaults otherwise): `speed`, `acts` (names from `PET_CLIPS`), `nap` (0 to 1), `night` (stays up), `likes` (behaviours from `PET_BEHAVIOURS`: `flowers butterflies sun friends`). Optional `names`, `eye`, `hint` (for the design assistant).
- **art**: `kit: 'quad'` reads `hr bl bh leg sit legW ch neck es`, `ear` (`PET_KIT_EARS`), `tail` (`PET_KIT_TAILS`), `belly`, `muzzle`, `nose`, `whisk`, `patterns` (a mark id to a `PET_KIT_PATTERNS` name). `kit: 'bird'` reads `rx ry ll r hx hy tail belly feet bill es beak web`. Only a body no kit can make needs a function registered in `_PT_ART`.
- **Other things**: a new ear, tail or marking is one function in its registry; a clip is one `PET_CLIPS` line plus keyframes; a behaviour is one `PET_BEHAVIOURS` entry `{like, when(P, W), run(P, W)}`; a lure, toy or bed is one row in `PET_LURES`, `PET_TOYS`, `PET_BEDS`; a hat one `PET_ACC.hat` row (`{treats}`, `{coins}` or `{bondAny}`) plus its case in `_ptHat`.

Check a new one with a contact sheet: `petSvg(petDefault(id), {size: 190, pose})` from `lib/pet-art.mjs` for each pose. Reads well as a dark outline? Then it is done.


## 17. Garden life: creatures, surprises and the Nature book (2.23)

User request, 30 Oct 2026: "make sure there are proper collisions and interactions with objects and things on screen regarding the random insects, animals etc that can visit; easter eggs, so many unique things that literally there is something cool every time we look; sometimes the objects overlap and always appear in front, but it's cool to have something fly around and settle on a placed object" and "build it in a way where we can add so much content and scale it easily".

| Part | File |
|---|---|
| Art kits (`GL_KITS`: butterfly, bee, ladybird, dragonfly, moth, firefly, snail, frog, bird, duck, hedgehog, quad, squirrel, rabbit, bat, thing) | `94-garden-life-0kit.js` |
| The clip library: a token in `data-clip` is one rule moving parts by class | `src/styles/94-garden-life.css` |
| `GARDEN_CREATURES` (one row per creature), `GARDEN_KEEPSAKES` (the gifts) | `94-garden-life-1creatures.js` |
| `GARDEN_LIFE_BEHAVIOURS`: wander, fly-with-curves, hop, swim, dart, orbit, land-on, perch-and-preen, sleep, peck, burrow, follow-scent, chase, startled-by-player, startled-by-pet, notice-player, leave-when-over | `94-garden-life-2behave.js` |
| The engine: world view, moving helpers, surfaces, brain, arrivals, the director, friends' gardens | `94-garden-life-3engine.js` |
| Reactions, signs (`GL_MARKS`), bursts (`GL_BURSTS`), sounds (`GL_SOUNDS`), rustling, puddles, your pet's noticing | `94-garden-life-4react.js` |
| `GARDEN_LIFE_EGGS` (one row per surprise), `GARDEN_LIFE_EFFECTS`, `GL_THINGS` | `94-garden-life-5eggs.js` |
| The Nature book, discoveries and rewards (`GL_ECON`), `gardenLifeFacts`, `gardenLifeUnlocked` | `94-garden-life-6book.js` |

**How it stays honest about space.** A creature is a sprite from `gardenWorldAdd`, sorted with everything else. Walkers and hoppers use the one collision map and a short route (`_glBfs`) so they go round things. Flyers rise over anything tall as they reach its row (`W.hmap`, `_glClearance`), so nothing pops through a tree. Where something lands is found by looking at the drawing itself (`_glSurfaceOf`: straight down at a few places until it meets paint; a row's `perch` share still wins for seats), and on a surface it sorts just in front of that thing. Off-screen it is hidden and only ages, and goes after 22 seconds. Cap: `GL_CAP` (14 at Fun Full, 8 at Subtle, 6 in a friend's garden). Fun Off: none. Reduced motion: they sit where they would have gone and still answer a click.

**Saves.** `state.garden.disc` holds `lf.<kind>.<id>` (first found: kind c creature, e surprise, k keepsake) and `lp.<kind>.<id>` (paid), and the wallet's ledger an entry `lfr.<kind>.<id>` of kind `lf`. No new state keys, so no migration; an id this version does not know stays noted and pays when it does. What was seen lately is per device (`opendash.garden.life.seen`).

**How much life.** Owner's direction, 30 Oct 2026: it must not be excessive, so that it stays special. The numbers are at the top of `94-garden-life-3engine.js`: `GL_CAP` (never more than this at once: 6, 3 at the Subtle fun level, 3 in a friend's garden), `GL_TUNE.target` (it aims for 2, plus a little for what is in flower), `GL_TUNE.gap` and `GL_TUNE.quiet` (arrivals are spaced out, and a long quiet spell now and then means a garden is sometimes simply peaceful), `GL_RARITY_ODDS` and `GL_TUNE.rarePerVisit` (rare things stay rare), `GL_TUNE.eggs` (at most one surprise a visit, on about half of visits, never the same one twice running; a date's own event comes on the first look of that day). The same restraint for pets: up to three others may be let out, but `PET_ROAM_ODDS` (97-pets-7roam.js) decides how many are about on one visit, usually one; they take turns. The catchable bugs follow suit: `GARDEN_BUGS_MAX` in `94-garden-fish-2core.js` (about at once in the whole garden), one to a flower. `GW_BUG_PICK` in `94-garden-world-0walk.js` says how near a click must be to count as the bug: forgiving on open ground, exact on a plant, so that a bee beside a ripe flower never stops you picking it.

**Lily pads.** The pads painted on open water are real places to sit (`gartLilyPads(sc)`, rows of kind `pad`, category `water`, in the world's objects): `land-on` with `{on: ['cat:water'], leap: true, reach: 5}` gets a frog onto one from the bank or out of the water.

**Your pets and the creatures.** `W.pets()` asks `petGardenPositions()` (the pets' own answer: `[{x, y, species, me, moving}]`) and falls back on the sitting follower when the pets are not roaming. Your companion notices creatures through `gardenLifePetGoal(P, dt)`, from whichever loop is moving it.

**The economy.** One payment per discovery, ever (`GL_ECON`: 1 to 15 coins by rarity, at most 12 coins a day; what is left over pays on a later day, `gardenLifeSettle`). A hello pays nothing. A gift is yours once.

**Friends.** `gardenLifeVisit(svg, snap)` builds the same world from their snapshot in a loop of its own. Nothing new is sent and an older version is unaffected. Nothing found there counts in your book. A row's id that is also in `GARDEN_VISITORS` replaces that visitor's still drawing in your garden and a friend's (photos and the Home card keep the still one); the other visitors stay as they were.

**Trying things in the sandbox** (the console): `gardenLifeSpawn('fox')`, `_gl.dev = {tod, season, rain, snow, cap, noEggs}` (what the engine believes), `_glEggFire(GL_EGG.get('rainbow'), _gl.W)`.

### Add a creature (one row)

A goldfinch, with the kit the other birds use. Nothing else is needed: it appears when its `when` and `needs` hold, sits on thistles and feeders, scatters, and has a page in the book with a silhouette.

```js
{ id: 'goldfinch', name: 'Goldfinch', group: 'bird', rarity: 'uncommon', tags: ['bird'], habitat: 'air', alt: 44, speed: 3, count: [1, 3], max: 3,
  art: ['bird', { body: '#b49a6a', belly: '#f2ead8', wing: '#2a2622', head: '#f4f2e8', bib: '#d8362a', beak: '#e8d8b0', k: 0.72, tail: 7 }],
  when: { seasons: ['spring', 'summer', 'autumn'], tod: ['dawn', 'day'] }, needs: { near: ['id:thistle', 'effect:birds'] },
  behaviours: [['land-on', { on: ['id:thistle', 'effect:birds', 'cat:fence'] }], ['perch-and-preen', { dur: [3, 9], clips: ['rest', 'alert', 'preen'] }], 'fly-with-curves', 'startled-by-player', 'startled-by-pet', 'leave-when-over'],
  react: { mark: 'note', sound: 'chirp', gift: 'gold-feather', chance: 0.4 },
  book: { hint: 'Comes for thistle seed.', blurb: 'A charm of them, if you are lucky.' } },
```

Every field is explained at the top of `94-garden-life-1creatures.js`. A gift is one row of `GARDEN_KEEPSAKES`: `{ id: 'gold-feather', name: 'A gold feather', c: '#e8c33a' }`. A creature that only a surprise should bring has `egg: true`. Something that shines has `light: {c, r}`.

New look? A new kit is one function in `GL_KITS`, returning `{svg, clips}`: draw it facing right with feet at 0,0, wrap what moves in `_glPart('wing', hingeX, hingeY, markup)`, and say which tokens each clip uses. A new token is one rule in the CSS. Clip names the behaviours ask for: rest, fly, preen, walk, run, hop, peck, sleep, swim, sniff, alert, react, hide, dig (missing ones fall back to rest).

### Add a behaviour (one entry)

An entry says how much it would like to run and what it does each frame, using the helpers (`_glFly`, `_glFollow`, `_glHopTo`, `_glSwim`, `_glSettle`, `_glTakeOff`, `_glClip`, `_glMark`). It can never name an id; what differs goes in the row's parameters.

```js
// sits in the sun when it is out; any row can use it: ['bask', {dur: [6, 14]}]
GARDEN_LIFE_BEHAVIOURS['bask'] = {
  want(c, W) { return W.tod === 'day' && !W.rain && !c.hidden ? 0.8 : 0; },
  start(c, W, p) { c.mem.t = 0; c.mem.dur = _glRange(p.dur, 5, 12); _glClip(c, 'rest'); },
  step(c, W, dt) { return (c.mem.t += dt) > c.mem.dur; },
};
```

`reflex: true` means it is looked at every frame and interrupts anything (keep `want` cheap). `deep: true` means `notice-player` leaves it alone.

### Add a surprise (one row)

```js
// a date event with an old effect: one row, no code
{ id: 'midsummer', name: 'Midsummer balloons', rarity: 'rare', always: true, when: { from: '06-21', to: '06-21' }, effect: { kind: 'thing', art: 'balloons', where: 'near', click: { mark: 'heart' } }, hint: 'The longest day.', blurb: 'Nobody will say who put them there.' },
```

`always` on a row means a date's own event: it comes on the first look of the day rather than by a draw. `when` takes everything a creature's does, plus `from`, `to`, `dow`, `dom`, `birthday`, `all` (selectors that must all be in this garden) and `spot` (you walked there). `always` fires on every visit while it holds; anything else is drawn, favouring what you have not seen lately. An effect kind is a name in `GARDEN_LIFE_EFFECTS`: `visitor`, `thing`, `streak`, `fireworks`, `whirl`, `rainbow`, `balloon`. A new picture for a thing is one function in `GL_THINGS`; a new kind of effect is one function in `GARDEN_LIFE_EFFECTS`.

### Unlocking by what you have found

`gardenLifeUnlocked({life: 'fox'})`, `{lifeCount: 10}`, `{lifeKeep: 'acorn'}`, `{lifeEgg: 'rainbow'}` is true or false, so a pet's or decoration's unlock row can say that as plain data once its unlock check asks this function.
## 18. Crafting, clips, tricks, spectacles and emotes (2.23, agent 'craft')

Owner, 30 Oct: "grow things and craft things using what we grow to make accessories for ourselves or pets, but also buy more animations for the pets ... lots of cool and unique animations", then "a top tier of spectacular wow animations ... cut any that don't make you say wow". Feel: a cosy workbench (the feel of a DIY bench; none of anyone's art or names).

| What | Where |
|---|---|
| Recipes, learning, crafting, selling, the bottle (rules; Node runs them) | `94-garden-craft-0rules.js` |
| What pet accessories and results look like, the bench in the world | `94-garden-craft-1art.js` |
| The bench's panel, the making, the bottle on the shore | `94-garden-craft-2panel.js`, `styles/94-garden-craft.css` |
| The clip library: `PET_CLIP_LIB`, little sprites `_PCFX`, `petClipRun` | `97-pets-tricks-0clips.js` |
| The trick book: `PET_TRICK_BOOK`, tiers, buying, secrets (rules; Node runs them) | `97-pets-tricks-1rules.js` |
| The effects library: `PET_FX`, sprites, sounds, `petFxRun` | `97-pets-tricks-2fx.js` |
| The spectacles: `PET_WOW`, where they run (`_fxStageHost`, `_fxGardenHost`) | `97-pets-tricks-3wow.js` |
| The book's page and the secret's big moment | `97-pets-tricks-4book.js`, `styles/97-pets-tricks.css` |
| Idle picks, surprises, tricks for friends | `97-pets-tricks-5life.js` |
| The gardener's moves and the wheel (Q) | `97-pets-tricks-6emote.js` |

**The rules that keep it honest.** A craft is one ledger line (ingredients out, the thing in, kind `cr`, with Undo). It can never make coins: the market pays for a crafted thing what its ingredients would fetch plus a tenth, at most 40 coins a day (`fd.mc`); crafted decorations have no resale; crafted treats at most 3 a day (`fd.ct`). Tricks are priced from what a good day earns (about 15 treats and up to 120 coins); legendary ones are earned, never bought; mythical ones are found. Surprises: at most one a day, forty minutes apart, about one chance in eighty for each idle minute; before you own a spectacle, one taste a week of one you could earn.

**Saves.** Nothing migrates. Crafted things and found recipes are items (`craft:<id>`, `recipe:<id>`, `ptreat`) in the ledger. Bought tricks are `state.pet.buy['trick:<id>']`, earned and secret ones `state.pet.tricks[id]`; bought moves `state.pet.buy['emote:<id>']`. Older versions ignore unknown ids. The pet's look has one new field, `itemBack`, which older apps drop.

**Friends.** Only ids go over the wire. What a pet wears from the bench is an id in `itemHead` / `itemNeck` / `itemBack`, drawn here from `PET_CRAFT_ITEMS` (an older app draws the pet without it). Hats, scarves and pins are ids in the avatar, mapped to the default by an older app. A garden snapshot carries `tk`: up to 24 trick ids (`petBookWire`), dropped by an older app; visiting, their pet does them now and then and has a button to ask (`petVisitPerform`). An id this version does not know is skipped.

**Performance.** Clips are Web Animations on the drawing's named parts, a few sprites that remove themselves, nothing while off screen. A spectacle is one canvas made when it starts and thrown away when it ends: particles stop at `FX_CAP` (halved on a phone or when frames run long); no loop, nothing at rest. Reduced motion: a clip is its still pose; a spectacle is one calm frame that fades in and out. Fun level Off: none of it.

### Recipe: add a recipe (one row)

In `GARDEN_RECIPES` (`94-garden-craft-0rules.js`):

```js
_gR('moss-cap', 'Moss cap', 'pet', { 'crop:fern': 3, 'crop:thyme': 1 }, { pet: 'pi-chatmoss' }, { level: 6 }, { blurb: 'Damp, but dignified.' }),
```

`need`: `crop:<plant>`, `honey`, `fish:<id>` (any size), `bug:<id>`, `seed:<plant>`, `bq:<id>`, `decor:<id>`, `clover`. `make`, exactly one of: `{wear: ['hat'|'scarf'|'pin', id]}`, `{pet: designId}`, `{decor: id}`, `{treats: n}`, `{emote: id}`. `learn`: `{start: 1}`, `{level: n}`, `{fact: [gardenFactsKey, n]}`, `{season: 'autumn', n: 5}` (pick n things that season), `{visitor: id}`, `{bottle: 1}`. The bench, the wardrobe, the assistant and the sell price all read the row. Check it with `node build.mjs`, then open the bench.

### Recipe: add an accessory

- **For a pet**: one row in `PET_CRAFT_ITEMS` (`94-garden-craft-1art.js`), id `pi-c` + 3 to 9 letters. `slot`: `head` (the head is a circle of radius 50 about 0,0), `neck` (0,0 is the middle of the collar, 100 its width), `back` (the neck's frame, drawn behind the body). `cols` are up to three colours, shapes `{p (M L C Q Z only), f, s, w, o}` with colour references `k1`, `k1s`, `k1l`, `k1d`, `w`, `i` (the custom accessories' format, `97-pets-0kititems.js`). Keep paths under 900 characters: use `_gcC`, `_gcE`, `_gcFlower`. It then fits every species and pose. Add `pi-cwing`-style ids to `petCraftFieldOf`'s test only if you add a new kind of slot prefix.
- **For you**: one option in the avatar kit's `hat`, `scarf` or `pin` row (`97-profile-0kit.js`) with `{craft: <recipe id>}`, its case in `_pfHatMore`, `_pfScarfMore` or `_pfPinArt`. The gardener shows it by itself, because it is drawn by the same kit.

### Recipe: add a clip (one row)

In `97-pets-tricks-0clips.js`:

```js
_pcR('curtsey', 1600, 'sit', { face: { eyes: 'happy', mouth: 'smile' },
  body: [[0.2, { y: 2, sy: 0.92, sx: 1.05 }, 'io'], [0.5, { y: 4, r: 8, sy: 0.88, sx: 1.08 }, 'io'], [0.8, { sy: 1.03 }, 'io']],
  fx: [[0.55, 'heart', { at: 'nose', dx: 20, dy: -24, dur: 900 }]] }),
```

Tracks are `body head ears eyes tail paw legsF legsN legsG wingN wingB shadow`; a key is `[t 0..1, {x y r sx sy s k}, ease]` and a whole pose. Pets face right, y grows down, `r` plus tips the nose down. What you leave out, `_pcFollow` works out from the body: ears and tail drag, the head counters a turn, legs reach and trail, the shadow shrinks. `org: 'mid'` turns about the middle (flips). Pieces: `_pcJ` (a jump with its squash and stretch), `_pcSw`, `_pcDie`, `_pcRun`, `_pcSpin`, `_pcHold`, `_pcBlink`. `only`, `not`: `{ids, gaits, kinds}`; `nl`, `nt`: needs legs, a tail. **Look at it as a sequence before keeping it**: pause `el.animate` at even steps across a row (a contact sheet) on a tall pet, a low pet and a bird. If it reads as stiff, or nothing in it anticipates, redo it.

### Recipe: add a trick (one row)

In `PET_TRICK_BOOK` (`97-pets-tricks-1rules.js`):

```js
_tb('curtsey', 'Curtsey', 'rare', { treats: 6, coins: 60 }),
```

The id is the clip's unless `clip:` says otherwise; `wow:` names a spectacle. `how`: `{free: 1}`, `{treats, coins}`, `{bond}`, `{level}`, `{streak}`, `{fact}`, `{craft}`, `{secret: {...}, hint}`. Secret conditions: `tod season clear rain hour min md bond fact tricks act` (`act`: `pat` or `perform`). A secret shows as ??? until it comes true. The book, the shop, idle behaviour, the assistant and friends read the row.

### Recipe: add a spectacle (one row, plus a trick row)

In `PET_WOW` (`97-pets-tricks-3wow.js`), a list of `[seconds, kind, params]`:

```js
snowglobe: { ms: 5200, still: 2.4, steps: [
  [0, 'tint', { c: '#0a1a3a', a: 0.5, dur: 5.2 }], [0, 'sound', { s: 'night' }],
  [0.2, 'pet', { clip: 'sway' }], [0.3, 'glow', { c: '#bfe0ff', r: 200, a: 0.5, dur: 4.6 }],
  [0.3, 'emit', { from: 'sky', spr: 'dot', c: '#ffffff', add: false, g: 30, sway: 1, rate: 60, dur: 3.8, speed: [4, 20], life: [2.5, 4], size: [4, 9] }],
  [4, 'ring', { c: '#ffffff', r1: 420, w: 8, dur: 1 }], [4, 'shake', { r: 700, wave: 1 }],
] },
```

Kinds (`PET_FX`): `tint vignette glow rays ring beam emit constellation rainbow dragon timestop portal meteors galaxy aurora swarm comet wings pet hide lift far hop nudge shake freeze react sound flash`. A new effect is one function in `PET_FX`: `(F, p) => ({update(dt, u), draw(g, u)})`. Stamp `_fxSprite` bitmaps rather than drawing shapes; use `_fxAdd` so the particle cap holds. **Judge a spectacle by its frames**: `H = petFxRun(def, host, {manual: true}); H.seek(t)`, tile them, and cut what does not make you say wow.

### Recipe: add a move for the gardener (one row)

A row of `GART_EMOTES` (`97-pets-tricks-6emote.js`): tracks `root up head armL armR legL legR` (the figure's named limbs, front on; the keys are in the same 70 units, and the legs turn about the hip), `how` `{free}`, `{treats, coins}` or `{craft}`; add the id to `_PE_ORDER`.

