# Writing an animation pack

OpenDash v2.2 keeps every animated thing in one registry
(`src/app/71-anim-registry.js`). Animations arrive in **packs**. The built-in
ones are the `core` pack (`src/app/72-anim-pack-core.js`). This guide is for
the later waves (new daily variants, the UK pack, moments, achievements) and
for anyone adding their own.

## Slots

| Slot | What it is | Used by (v2.2 wave 1) |
| --- | --- | --- |
| `opening` | the first moment of a story or the day | gallery, today's look |
| `celebration` | a task or a moment done | Delight celebrations (blocked variants are skipped) |
| `story-transition` | between the beats of a story (`tx: {kind}`) | gallery, today's look |
| `event-scene` | the scene beside an event or task | gallery; the classifier still picks the scene type |
| `symbol` | small animated marks and motifs | gallery, theme previews |
| `sky` | weather and sky | gallery, today's look |
| `page-transition` | moving between sections (`tx: {kind}`) | gallery, today's look |
| `empty-loading` | while something loads, or a list is empty | gallery, today's look |
| `theme-switch` | the light/dark change (`vt: {kind, ms}` required) | `Motion.themeSwap` |

Moment slots (wave 4, `group: 'moments'`, played by `src/app/78-anim-moments.js`
through `animPickFor(slot, day, look, ctx, {tag, key, daily})`):

| Slot | What it is | Notes |
| --- | --- | --- |
| `task-done` | the finishing touch on a completed task | one style per stream (`key`: the stream, `daily: false`) |
| `streak` | the flame beside the streak | grows: wrap the growing part in `<g class="ap-gr">` (`--ap-grow` 0..1) |
| `boss` | a task 7+ days overdue, finally done | a centred overlay with a caption |
| `progress` | how progress rings fill | `fx`: `liquid`, `glow`, `sheen` (71-anim-moments.css) |
| `meeting` | the pulse on an event about to start | `fx`: `pulse`, `glow`, `beat` |
| `money` | tags `payday`, `under-budget`, `vendor` (`fx`: `shimmer`, `glint`) | |
| `home` | tags `living` (`fx`: `sunarc`, `drift`) and `idle` (`fx`: `nod`, `glow`) | |
| `focus` | a scene that grows through a focus block | `.ap-gr` |
| `people` | tags `birthday` and `while` | |
| `countdown` | warms up as the date nears | `.ap-gr` (`--ap-grow` = the heat) |

An item's optional `fx` (a short lower-case name) is a style the page applies by name;
a new `fx` needs its CSS too. The gallery's pins, favourites, blocks, packs off and the
intensity level all apply; a moment with nothing that fits the level does not play.

Later waves wire more slots into the page through `animToday(slot)`
(`src/app/78-anim-gallery.js`): it returns today's item for the slot, already
respecting pins, blocks, favourites, packs switched off, the season, the
region and the intensity level.

## The format

A pack is ONE classic script in `src/app/`, named `72-anim-pack-<id>.js`
(the build concatenates `src/app/*.js` in name order, so it loads after the
registry and the libraries it may reuse). It is pure: no DOM, no fetches, no
page globals at load. It calls `animRegisterPack` once:

```js
(function () {
  animRegisterPack({
    id: 'uk',                       // lower-case, digits, dashes
    name: 'UK pack',
    version: '1.0.0',
    description: 'Bank holidays, bonfire night and the British weather.',
    css: '',                        // optional; injected once, disabled when the pack is off; no @import, no url(http)
    items: [
      {
        id: 'bonfire-night',        // unique in the pack; the ref is 'uk/bonfire-night'
        slot: 'celebration',        // one of the slots above
        label: 'Bonfire night',
        tags: ['fireworks', 'november'],
        mood: 'cheerful',           // calm cheerful proud cosy focused dreamy energetic neutral
        intensity: 'standard',      // subtle | standard | playful (shown at that level and above)
        theme: 'any',               // or ['neon', 'cinematic']: drawn for those themes (weighted up there)
        season: ['autumn'],         // 'any' or spring summer autumn winter
        region: ['GB'],             // 'any' or ISO codes: GB, GB-SCT ... (opt-in, local only)
        colour: 'orange',           // a swatch: blue indigo violet pink red orange amber green teal slate
        svg: () => '<circle class="c x-pop" cx="32" cy="32" r="8"/>',
        reduced: 'static',          // REQUIRED: 'static' (the same drawing, still) or a function returning a still drawing
      },
    ],
  });
})();
```

- `svg(o)` returns the INSIDE of a 64 x 64 SVG (`viewBox="0 0 64 64"`); the
  registry wraps it (`animItemHtml`). Constants only: never put user text in it.
- Use the scene vocabulary so themes and dark mode work: fills `k c s w m`,
  strokes `lk lc lm lw` (`t` thick, `dash`), motion classes `x-*` from
  `src/styles/71-anim-library.css` (`x-pop x-float x-twinkle x-rise x-fall
  x-bounce x-spin x-pulse x-wave` ...), staggered with `style="--d:0.3s"`.
  Motion is transform and opacity only.
- Own keyframes go in the pack's `css`, scoped under `.as-<item id>` and
  gated like the core ones (`.anim-scene.is-live ...`), with
  `calc(<ms> * var(--ap-speed, 1))` and `var(--ap-ease, ...)` so themes apply.
- `theme-switch` items also need `vt: {kind: 'circle'|'wipe'|'fade', ms}`;
  `story-transition` / `page-transition` items carry `tx: {kind}`.

## Special days: `when(day, ctx)` (wave 2)

An item may carry `when: (day, ctx) => boolean` and an optional `priority`
(default 1). Such an item never comes up in the ordinary daily rotation: it
plays only when its rule holds, and then it wins its slot
(`animSpecialPick`; the highest priority first, then seeded by the day).
Blocks, packs switched off and the intensity level still apply; a pin still
wins. `ctx` carries `birthday` ('MM-DD', `config.birthday`), `tz`, `lat`/`lon`
(the weather town), `firstSnow`, `level` and, for the living sky, `moment`
('sunrise' | 'day' | 'sunset' | 'night') and `now` (ms).

Use the almanac (`src/app/71-anim-almanac.js`, pure and offline) in the rules:
`almIsFestival('diwali', day, ctx)`, `almSkyMoment`, `almMoonPhase(ms)`,
`almMeteorShower(day)`, `almAuroraNights(year, lat)`. Moving festivals come
from `ALM_MOVING` (2025-2031): extend the table before 2031.

Where the slots play (wave 2, `src/app/78-anim-wire.js`): `opening` once per
entry on load; `story-transition` as `.story[data-ap-tx]`; `page-transition`
as `html[data-ap-page-tx]`; `sky` as the accent in `briefSkyHtml` (special
items only, so it never contradicts the weather); `empty-loading` in
`emptyStateHtml` and the story's loading screen.

## UK regional packs (wave 3)

The UK packs (`72-anim-pack-uk-<region>.js`) are ordinary packs whose items
carry `county`, `ukRegion` and `ukKind` and a `when` rule on `ctx.county`
(set only when Settings > Animations > "Regional animations (UK)" is on).
How to add a region: `docs/dev/UK_PACK.md`.

## Themes

Themes (Calm, Playful, Cinematic, Retro pixel, Hand-drawn, Paper cut-out,
Neon night) are a style layer, not separate art: `[data-anim-theme="<id>"]`
sets `--ap-filter --ap-svg-filter --ap-bg --ap-shape --ap-speed --ap-ease`
(`src/styles/71-anim-registry.css`), and every scene reads them. A pack that
wants bespoke art for a theme styles `[data-anim-theme="neon"] .as-<item id>`
or registers a separate item with `theme: ['neon']`.

## Rewards: items unlocked by achievements (wave 5)

An item may carry `unlock: '<achievement id>'` (the ids in
`src/app/71-achievements.js` `ACH_DEFS`). Until the user earns that
achievement the item never comes up in any pick (`animLocked(item, look)`;
`animItems({look})` leaves it out), and the gallery shows it as a still,
greyed tile with how to earn it. A theme in `ANIM_THEMES` can carry `unlock`
too (Golden hour, the 30-day streak). `look.unlocked` is filled by the page
from `state.achievements` and is never saved in the look. The built-in
rewards live in `72-anim-pack-rewards.js`; a new achievement needs a row in
`ACH_DEFS` (its `reward`) and a test in `tests/achievements.test.mjs`.

## World cities (wave 6)

The world pack (`72-anim-pack-world.js`) gives big cities a signature opening
and a symbol element, played while travel places you there (`ctx.city`, set
by `78-anim-world.js`) and on the travel arrival card. How to add a city:
`docs/dev/WORLD_PACK.md`.

## Regions: the US, Asia and every region added since

A **region** is a part of the world with its own full-screen openings and small symbols, played only where
the user is: a signature opening and a symbol per *unit* (a US state, an Asian country, a European
country...), an opening per big city, a symbol per small city or town. The US and Asia were the first two;
they are now **configs** over one framework, `src/app/71-anim-0region.js` (pure), which owns everything a
region needs: the offline lookups (the unit of the nearest row, the place by radius, the travel city), the pack
builder, the scene registry, the shared full-screen scene kit (`animSceneKit()`, `animSceneCss()`) and
`animRegionsWhere(ctx)` / `animRegionWhere(ctx)`, the lookups the opening sequence makes (`78-anim-wire.js`:
"Welcome to Seattle", "Welcome to Japan"). **A new region is a config file of data tables plus scene files plus
pack files. It never copies logic.**

### Files and names

| File | What it holds |
| --- | --- |
| `src/app/71-anim-region-<id>.js` | the config: the unit and place tables and `animRegionDefine({...})`, nothing else |
| `src/app/71-anim-region-<id>-scenes-N.js` | full-screen scenes, inside an IIFE: `animRegionSceneAdd('<id>', {key, label, site, colour, mood, season, tags, svg})` |
| `src/app/72-anim-pack-<id>-<group>.js` | one pack per group: `const B = <REGION>.builder('<group>'); B.scenes(); ...; animRegisterPack(B.pack({id: '<id>-<group>', ...}))` |
| `tests/<id>-pack.test.mjs` | the region's coverage gate, generated by `new` (data-driven: no edit when the tables grow) |

- **Load order.** The build concatenates `src/app/*.js` by name into ONE script scope, so a top-level `const` is
  usable only after its file has loaded (function declarations are hoisted). `tools/lib/anim-sources.mjs`
  `animRegistryFiles()` returns the animation files in exactly that order (one sorted list), and the tests and the
  tools load the registry through it, so a new region is picked up with no list to edit:
  `71-anim-0region.js`, `71-anim-almanac.js`, `71-anim-asia*.js`, `71-anim-library.js`, `71-anim-region-*.js`,
  `71-anim-registry.js`, `71-anim-texas-scenes.js`, `71-anim-us*.js`, `71-delight-library.js`, `71-uk-counties.js`, then
  the `72-anim-pack-*.js` files. Two rules follow:
  - `71-anim-0region.js` sorts before every other `71-anim-*` file, so a config may call `animRegionDefine` while it
    loads. **Region configs and scene files load BEFORE the registry** (a new region's `71-anim-region-*` files and
    Asia's sort before it; only the US sorts after): at load time they may use only the framework's names. Touching a
    registry or library const (`ANIM_SLOTS`...) there throws "Cannot access ... before initialization" and the whole
    app script dies. `tests/region-framework.test.mjs` evaluates the files in build order and checks exactly this.
  - **Every file shares that one scope, so wrap each scene file in an IIFE**, `(function () { const K = animSceneKit(); ... })();`.
    Two scene files that declare `const K` at the top level fail with "Identifier 'K' has already been declared".
- `<id>-scenes-N.js` sorts BEFORE `<id>.js` (`-` sorts before `.`), so a scene file runs before its config.
  That is fine: scenes are stored in the framework by region id, and `animSceneKit()` is a hoisted function.
  Scene files use only `animSceneKit()` and `animRegionSceneAdd`; they never touch the config's constants.
- A region owns the packs named `<id>-<group>` (`animRegionOwns`): the opening sequence only dresses the welcome
  with an opening from one of them, so `B.pack()` throws on any other pack id. The id is lower-case letters and
  digits, and is never `uk`, `texas`, `world`, `core`, `seasons`, `sky`, `moments`, `rewards` or `mine` (other pack
  families). Item refs are `<pack id>/<item id>` and users pin and favourite by ref: never rename an id once it has
  shipped.
- **Regions must not overlap.** No row of a region may sit inside another region's reach (`unitKm` from its
  nearest row); `tests/region-framework.test.mjs` loops over `ANIM_REGIONS` and fails naming the two regions
  and the row. The reach of a row is a halo, so two halos can still overlap between rows; there the region whose
  nearest row is NEARER wins. Each region's `locate(ctx)` returns `{km, where}` (`km` is the distance to its nearest
  row, 0 for a travel match), `animRegionsWhere(ctx)` lists every matching region nearest first (ties in definition
  order) and `animRegionWhere(ctx)` is its first entry. A unit in `elsewhere` (the US's Texas) still claims its
  position, so a farther region cannot take it. The opening takes the list entry whose region owns the opening that
  was picked (item `when()` rules stay per region, so in an overlap the farther region's art can be the pick). When
  a new region's rows fall inside a neighbour's reach: move or drop the row, or lower the `unitKm` of one of
  them (then run `tests/region-framework.test.mjs` and the tests of both regions: lowering it changes where that region plays). Never
  add rows of a region beyond its own territory to "sharpen" its edge: that claims the neighbour's ground for it. `region.check()` lists every such
  row (and every other region's row inside this one's) as `overlap: ...` with the ways out, and `status <id>` shows them under OVERLAP WITH OTHER REGIONS. **The border case**: a small
  town just across a border from a neighbour's row cannot be a row of the region on the other side (a town of Papua New Guinea 70 km from Asia's Jayapura row is inside Asia's 300 km
  reach: a position there resolves to Asia and Indonesia's art plays). Leave such a town without a row, move it, or lower the neighbour's `unitKm` after running both regions' tests;
  adding rows to push the neighbour out is never the answer.
- **The tables are read once**, when `animRegionDefine` runs: the lookups work on that snapshot. Finish the tables
  before defining the region; `check()` reports a table edited afterwards.
- The legacy `71-anim-us.js` and `71-anim-asia.js` stay as thin configs and keep their old public names
  (`usPlace`, `usBuilder`, `usSceneKit`, `asiaBuilder`, `ASIA_PLACES` ...), so the pack files and the 20
  scene files they serve (8 US, 12 Asia) needed no edit.

### The config

`animRegionDefine(cfg)` returns the region (also in `ANIM_REGIONS`, found by `animRegion(id)`). The region has
`where(ctx)`, `locate(ctx)` (`{km, where}`, what `animRegionsWhere` ranks by), `place(ctx)`, `unitOf(ctx)`,
`builder(group)`, `sceneAdd(entry)`, `scenes` (the registry), `check()`, `overlaps()`, `nearestRow(ctx)` (`{id, unit, km}`: the row that decides a position), `travelId(row)`,
`travelRow(city)`, `countryOf(unit)`, `unitKm`, `placeKm` (the radii the config set), `complete` and `worldTravel` and `elsewhere` (frozen copies of the config lists).

| Field | Meaning |
| --- | --- |
| `id`, `name`, `over` | `'asia'`, `'Asia'`, and the caption prefix of the SMALL (64-unit) opening items only (`'USA'`, `'Asia'`: `<over> · <label>`). The opening sequence (`78-anim-wire.js`) shows the title "Welcome to <place>" (the place name from the tables) and, under it, a full-screen scene's own **`site`** as the caption (`site || label`): `site` says what is shown ("Manhattan from the Brooklyn Bridge"), never just the place name again, and `over` is not shown for a full scene |
| `unitWord` | `'state'`, `'country'`...: the item kind value and the scene key prefix (`country:JP`; `unit:JP` also works) |
| `units` | `{ CODE: [name, group] }`: the groups become the packs (`asia-west` is the group `west`) |
| `places` | `[[id, name, unit, lat, lon, kind]]`; `kind` is `'big'` (a signature opening), `'small'` (a symbol) or `''` (an anchor: it only tells which unit a position is in). Every unit needs at least one row |
| `unitKm` | beyond this from every row a position is in no unit of the region (US 190, Asia 300) |
| `placeKm` | `{big: 50, small: 30}` (the default): how close counts as "in" a place |
| `travelId` | `(row) => travel city id` (default `row[0] + '-' + countryCode.toLowerCase()`, the country read as the items read it: the `country` hook, else the unit code. `seattle-us` for the US, `tokyo-jp` for Asia, `paris-fr` for a region of countries: the travel tables' ids, so a config rarely sets it) |
| `worldTravel` | travel city ids the world pack draws: while travelling there the region matches nothing. List EVERY city of the world pack (`72-anim-pack-world.js`) that a row of the region maps to, or the region's city art beats the world pack's landmark for a traveller there. The tests check it for every region, and `region.check()` names a missing one (the list is read live from the world pack; `check({ worldCities: [...] })` gives one explicitly) |
| `elsewhere` | units whose art lives in another pack (US: `TX`): looked up, never opened |
| `pseudo` | `{ CODE: {id, name, kind, group?} }`: a unit with no art of its own that is one fixed place (US: `DC`) |
| `placeKinds` | the kinds `B.place()` may build (default both; Asia `['small']`: its big cities come from scenes) |
| `fields` | the item fields `{kind, unit, place, size, signature}` (default `<id>Kind`, `<id><Unit>`, `<id>Place`, `<id>Size`, `<id>Signature`) |
| `tags`, `priority`, `keys` | the first tags `{root, unit, city}`; `{unit: 1, city: 1.2}`; the property names of `place()` / `where()` results `{unit, unitName}` |
| `country`, `extra` | the ISO country of an item (a string, or `(unit) => code`; default the unit code, so country units need nothing) and more item fields `(unit) => ({...})` |
| `complete` | `true` or `false` (default `true`: a config that does not say is finished, so the US and Asia keep every hard gate). `new` writes `false`: while it is false the COVERAGE tests (every unit and place has its art, no starter data) are reported as `todo`, the STRUCTURAL ones (sound tables, no overlap, no dead art, the lookups, unique travel ids) always fail hard. `status <id> --declare-complete` sets `true` when `status --strict` passes; from then on the coverage tests fail hard |

`region.check()` lists table mistakes (duplicate ids, unknown units, bad coordinates, a unit with no row, a travel
id used twice or that the hook cannot make, a scene with a wrong key, a table edited after defining, a world-pack city a row maps to that `worldTravel` does not name, a row inside another region's reach) as an array of
sentences; the tests assert it is empty for every region (the scaffold's `starter:` notes aside until the region is complete).

**What travelling does.** While the user travels, `ctx.city` is a travel city id and ONLY `travelRow(ctx.city)` is used: the row whose travel id is that city decides, and a travel city that is not a
row of the region matches nothing at all (no opening plays for that trip). Every travel city of the region's countries that should open needs a row (an anchor `''` is enough to give the trip the
unit's art): `status <id>` lists the ones without a row, with the nearest row and a line to paste. The other way round is harmless: a row the travel tables lack is still reached from home (the weather
town's position decides, no travel id is involved); only a trip to it misses. `status` also prints a REACH line (how far the farthest travel city of the region's countries is from its nearest row, against `unitKm`),
the advice for choosing `unitKm`.

### A worked example: Asia (`src/app/71-anim-asia.js`, tables shortened)

```js
const ASIA_COUNTRIES = { TR: ['Turkey', 'west'], /* ... */ JP: ['Japan', 'east'], /* ... */ };
const ASIA_PLACES = [['istanbul', 'Istanbul', 'TR', 41.01, 28.98, 'big'], /* ... */ ['kyoto', 'Kyoto', 'JP', 35.01, 135.77, 'small'], /* ... */];
const ASIA_WORLD_TRAVEL = ['tokyo-jp', 'dubai-ae', 'singapore-sg'];
const ASIA_COUNTRY_KM = 300;
const ASIA_PLACE_KM = { big: 50, small: 30 };
const ASIA_REGION = animRegionDefine({
  id: 'asia', name: 'Asia', over: 'Asia', unitWord: 'country',
  units: ASIA_COUNTRIES, places: ASIA_PLACES, unitKm: ASIA_COUNTRY_KM, placeKm: ASIA_PLACE_KM,
  worldTravel: ASIA_WORLD_TRAVEL,                     // the world pack draws these three for travellers
  placeKinds: ['small'],                              // the big cities come from their scenes (B.scenes())
  keys: { unit: 'cc', unitName: 'countryName' }, fields: { unit: 'asiaCc' },
});
```

The default travel id gives `tokyo-jp` here (the unit code is the country code). The US config differs only in
data: `unitWord: 'state'`, `worldTravel: ['new-york-us']`, `elsewhere: ['TX']`, a `DC` pseudo unit, `country: 'US'`
(which makes its ids `seattle-us`), `extra: (u) => ({ state: u })`, `tags: { root: 'usa' }`, `fields: { unit: 'usState' }`.

### What a new region needs

1. `src/app/71-anim-region-<id>.js`: the tables and `animRegionDefine` (keep the result in a const, such as
   `const EU = animRegionDefine({...})`, for the pack files).
2. Scenes, about seven per file (one per agent), in `71-anim-region-<id>-scenes-N.js`. **Wrap the file in an IIFE**: every
   `src/app` file shares one script scope, so a top-level `const K` in two scene files is a SyntaxError.
   ```js
   (function () {
     const K = animSceneKit();
     animRegionSceneAdd('eu', { key: 'country:FR' | 'place:paris', id?, label /* without the place name */, site /* the caption under "Welcome to <place>": what is shown */, colour, mood, season, tags,
       svg: () => K.full('#a9d4f0') + K.sun(1180, 210, 40, '#fff6d8', '#ffe39a') /* ... */ });
   })();
   ```
   `svg()` returns the inside of a 1600 x 900 drawing built with the kit (the rules: `docs/dev/US_PACK.md`).
3. One pack file per group, in `72-anim-pack-<id>-<group>.js`. The scenes-first way (Asia, recommended):
   ```js
   (function () {
     const B = EU.builder('west');
     B.scenes();                                  // every registered scene of the group: a full-screen opening
     B.element('FR', { id: 'baguette', label: 'Baguette', colour: 'amber', svg: () => '...' });         // the unit's symbol
     B.place('lyon', { id: 'lanterns', label: 'Lantern festival', colour: 'orange', svg: () => '...' }); // a small place's symbol
     animRegisterPack(B.pack({ id: 'eu-west', name: 'Europe: West', description: '...' }));   // the id must be '<region id>-<group>'
   })();
   ```
   The icons-first way (the US): `B.unit('FR', 'signature' | 'element', {...})` and `B.place(id, {...})` for every
   item with a small drawing, which a registered scene then upgrades to full screen (`full: true`). The builder fills
   in the id prefix, the label suffix, the tags, `region`, `country`, `reduced`, the slot, the priority and the `when`
   rule, and throws when a unit or place belongs to another group, when an item id is used twice in the pack (a
   pack with a duplicate fails to register, silently, so the call throws instead) and when the pack id is not
   `<region id>-<group>`.
4. `tests/<id>-pack.test.mjs`: the lookups and nothing leaking outside the region always run (structural); every unit has a signature and an element, every place an item, no starter data left are
   coverage tests: `todo` while the config says `complete: false`, hard once `true` (generated by `new`, see below; `tests/asia-pack.test.mjs` is the hand-written original). The rules that hold for every region are loops over
   `ANIM_REGIONS` in `tests/region-framework.test.mjs`, one test each so that a failure in one never hides another, and gate the new region with no copy: `check()` is empty, its
   packs are named `<id>-<group>`, no row of it sits inside another region's reach (its own test: it runs while the art is still missing), its travel ids are unique, and
   every world-pack city it maps is in `worldTravel`; a pack for every group that opens is the coverage part.
5. Docs `docs/dev/<ID>_PACK.md` and a row in `MODULES.md` (Animation library). The opening sequence needs no edit:
   `animRegionWhere(animCtx())` already covers the new region.

`tests/region-framework.test.mjs` proves all of this on a toy region (2 groups, 4 units, 6 places, a travel
mapping, a skip list, scenes): the lookups, the builder, the scene upgrade and scene items, the overlap rules
(`animRegionsWhere`), the build order and the opening sequence; it also pins the US and Asia radii at both edges.
If a new region seems to need new logic, extend the framework and that test instead.

### Making a new region with the tools

Four commands of `node tools/anim-pack.mjs` (see `--help`) take a region from nothing to done; the skill `.claude/skills/animation-pack/`
(SKILL.md and its `references/`) is the playbook (style, kit, rubric, workflow) around them.

```
node tools/anim-pack.mjs new eu "Europe" --unit-word country --groups west,east,north,south     # scaffold (complete: false: the repo stays green while you draw)
#   fill the tables of src/app/71-anim-region-eu.js (units, places, unitKm, worldTravel, country when the units are not countries)
node tools/anim-pack.mjs status eu                                                              # what is missing, overlaps, travel cities without a row, the reach
#   fill the "Cultural care" section (and, if the rotation does not fit a place, "Scene suggestions") of docs/dev/EU_PACK.md BEFORE any brief
node tools/anim-pack.mjs reference --render                                                     # the gold standard, once, light + night + dark in one run:
                                                                                                #   agents never render it themselves, they would write the same PNGs
node tools/anim-pack.mjs brief eu --kind scene   --out .anim-ref/briefs                         # one brief per agent (about 7 scenes) + plan.json; creates the scene file of each batch
node tools/anim-pack.mjs brief eu --kind element --out .anim-ref/briefs                         # one brief per group: elements
git add <the scaffold files and stubs `brief` prints> && git commit -m "Europe: scaffold"       # COMMIT THE SCAFFOLD AND THE STUBS, then run the two brief commands again (plan.json now carries the base commit):
                                                                                                #   the agents start from one tree, guard has a baseline
#   each agent: lint --file <its file> [--key <key>], sheet --file <its file> (light, night, --crop phone and square; --still, --sizes for icons), report with git status AND guard output
node tools/anim-pack.mjs guard --owned <the files of ALL agents that ran in this tree>          # PROOF that only those files changed (exit 2 otherwise)
node tools/anim-pack.mjs status eu --declare-complete                                           # when everything is drawn and lint-clean: sets complete: true, the coverage tests now fail hard (refuses otherwise)
node tools/anim-pack.mjs status eu --strict                                                     # exit 0 when complete, clean and declared
```

- `new <id> "<Name>" [--unit-word country] [--groups a,b,c]` writes the config `71-anim-region-<id>.js` (2 example units and 3 example places in the
  open sea, placed away from the rows of every region already defined, a comment on every field, kind, radius, the travel id rule and `worldTravel`), an empty scene file `71-anim-region-<id>-scenes-1.js` (the IIFE
  pattern), one `72-anim-pack-<id>-<group>.js` per group (`B.scenes()` plus commented element calls), the generated data-driven
  `tests/<id>-pack.test.mjs` and the `docs/dev/<ID>_PACK.md` skeleton, then prints the `MODULES.md` row and the next steps (in order: tables, `status`, **the "Cultural care" section**, the gold standard rendered once, the briefs, the agents, `guard`, `status --strict`).
  It refuses to overwrite a file, a reserved or malformed id, an empty `--groups` or `--unit-word` (or an empty group name), an existing region or colliding pack names, and a unit word that is one of the framework's own kinds
  (`place city big small signature element`: `city` would make the coverage count a place as a unit; use `town` or `municipality`); it proves the scaffold loads with sound tables (else it removes
  what it wrote). `--root <dir>` scaffolds into another checkout. When the units are not countries (`--unit-word state`) the config carries `country: 'XX'` as a placeholder: `region.check()` and `status --strict` report it as
  starter data (items would carry the region `XX` and every travel id would end in `-xx`) until the ISO code is set. **It ships no example art, on purpose**: a "minimal" scene or icon is what an agent
  would copy, cannot pass the strict lint and would go live if forgotten. So the pack files register nothing until they have an item, and the config says `complete: false`:
  the generated test, the "every region" tests of `tests/region-framework.test.mjs` and the "every pack file registered a valid pack" test of `tests/anim-packs.test.mjs` run their STRUCTURAL
  checks (sound tables, no overlap, no dead art, the lookups, unique travel ids; an empty scaffold pack file is waited for) as hard failures from the first second and report their COVERAGE checks
  (every unit that opens has a full-screen signature and an element, every big place a full-screen opening, every small place an element, no starter data) as node:test `todo`: the repo stays GREEN while
  the region is drawn. When everything is drawn and lint-clean, `status <id> --declare-complete` sets `complete: true` (it refuses while anything is missing, orphaned, overlapping, failing or starter) and the coverage tests become hard failures; `status <id> --strict` then exits 0 (it exits 2 while the flag still says `false`). `status` is the progress bar and warns while the `example-` rows remain.
  `new` ends by telling the orchestrator to COMMIT THE SCAFFOLD before any agent starts (the exact `git add ... && git commit` line), and the config documents what travelling does, the border case and the starter banner to delete once the tables are real.
- `status [<region>] [--json] [--strict] [--short] [--no-lint] [--declare-complete]`: per group the units (signature = a full-screen scene, element = a symbol), the big places
  (scene) and the small places (element), what is MISSING, orphan scenes (registered, in no pack), **duplicate scene keys** (a key registered twice: the last registration silently wins; `check()` and `status` name the files), table problems (`region.check()` with the world
  pack's cities), bytes and lint PASS / FAIL / waived per pack, **overlaps** with other regions (the border cases), **TRAVEL** (the travel cities of the region's countries that have no row: a trip there plays nothing; the nearest row and a line to paste;
  advice, not part of `complete`) and a **REACH** line (the farthest travel city from its nearest row against `unitKm`). Exit 2 under `--strict` when anything is missing, orphaned, duplicated, wrong, overlapping, failing or starter
  data, and also when everything is done but the config still says `complete: false`; `--declare-complete` then sets `complete: true` (it refuses, exit 2, while anything is missing). With no region it lists every region (`us` and `asia` are complete).
- `brief <region> --kind scene|element [--batch N --of M] [--group g] [--out dir [--clean]] [--note text] [--clear-notes] [--json]` fills `tools/lib/anim-templates/scene-brief.md`
  and `element-brief.md` with the region's facts, the exact keys of the batch, the one file the agent owns, the verify commands, the exemplars (with their PNG paths and an item-locating `read:` hint), the care
  rules (the general ones and the region's own "Cultural care" section, whose absence `brief` reports), the **corpus targets** (generated from `tools/anim-quality.json` and the measured exemplars: the median and
  10th-percentile size, shapes, path segments, gradients, translucent layers, moving groups ...; the redraw targets richness >= 0.90 and at most 4 thin spots), the **pass mark** (18 of 20 and the core lines), the **safe zones** (a portrait phone shows only
  the central 420 to 506 units, a square tile 900), the allowed markup (generated from the lint's tag lists) and the whole quality contract (study the exemplars, draw with the kit, `lint --file` passes with no waiver and meets the targets, `sheet` light AND night and the phone and square crops looked at
  with one observation and one defect per render, a self-check on the rubric, a final report with `git status --short`; no padding, no copy-and-recolour, no text, flags, maps, political symbols, identifiable people or holy figures, no threshold or waiver edits, no foreign files). A scene that still fails after 3 redraws is removed from the
  file and reported as NOT DONE with the failing rule and the path of its saved draft (`.anim-ref/drafts/`): only the orchestrator decides about waivers. Every key carries a **suggested** time of day, season, scene type and palette (elements: motif kind and colour) from a fixed rotation over the whole region, so that parallel
  batches differ without knowing each other; an agent may change one with a reason. Scene batches are consecutive slices of the scene keys in group order
  (`<unit word>:<CODE>` per unit that opens, `place:<id>` per big place), about 7 per agent (`--of M` overrides; a cut moves to a group boundary within
  1 key), in `src/app/71-anim-region-<id>-scenes-N.js` (`...-scenes-<group>-N.js` with `--group`); element batches are whole groups (a pack file has one
  owner), in `src/app/72-anim-pack-<id>-<group>.js`. Without `--batch` it prints the plan; `--out` writes `<kind>-brief[-<group>]-N.md` and a `plan.json` (what to dispatch, the files each batch owns, the commands to run before and after) and refuses to leave briefs of an earlier plan beside them (`--clean` removes them: dispatching a stale one gives two agents the same keys); `--json` is the plan for a
  script. Keys that already have art are marked `done (leave alone)`: redrawing a finished piece is the orchestrator's decision.
  Also: **the season column follows the latitude** of the key (`any` in the tropics, the local season with the label to write in the south, the same word in the north) and the brief and `plan.json` say what `season` is: only a
  LABEL (gallery card, "picked for ..." note), never a gate (a region scene plays wherever the user is); **`--out` creates the empty scene file of every batch that has none** (listed in `plan.json` as `created`), stores
  the `--note` texts in `plan.json` and re-reads them on every re-run (a new note is added, `--clear-notes` forgets them), checks that the PNGs the briefs cite exist (`missingPng`; render them once with `reference --render`) and says
  whether the scaffold is COMMITTED (`plan.json` `git`; the commit command is the first `before` step, and once it is committed the guard commands carry `--base <commit>`). Each exemplar carries `what it shows` in words, the written
  fallback when a PNG cannot be displayed. The optional "Scene suggestions" section of `docs/dev/<ID>_PACK.md` (`- place:melbourne: type = laneways; palette = red and orange`, fields time, season, type, palette, motif, colour)
  overrides the rotation per key, once, for every brief.
- `guard --owned <file>[,<file>...] [--base <ref>] [--json]` (the scaffold must be COMMITTED first: an untracked scaffold is listed as strays, and guard says to commit it): the orchestrator's proof that a batch touched only its own files. It asks git what changed (modified, added, deleted, renamed, untracked; git-ignored files such as `.anim-ref/` are not changes) and exits 2 when any changed file is outside the owned set or is
  `tools/anim-quality.json` (thresholds and waivers), `tools/anim-reference.json` or a test (never an agent's to edit, even if listed as owned). Without `--base` it compares with HEAD, the last commit (what is uncommitted); `--base <ref>` also counts everything committed since (the commit of the scaffold is the usual base; `brief --out` writes it into `plan.json` and the guard commands). It says in every run what it proved:
  in ONE shared working tree the UNION (nothing outside the files listed changed: list the files of every agent that ran, it cannot say which agent wrote which); to prove ONE agent alone give it its own git worktree (`git worktree add ../agent-1 <scaffold commit>`) and guard it there.
- `lint --file <path>` is loud about the file: it exits 1 without linting when the file registers nothing, registers a scene key that does not exist (a unit that is not in the tables, a place that is not big), a scene no pack item uses, or a key another file registers too; `--quiet` hides the thin spots and
  redraw-target lines it otherwise prints for every selected item; `--key <key,key>` (also on `sheet`) selects items by id, ref or region key (`country:AU`, `place:sydney`; `*` is a wildcard), so an iteration lints or renders one scene of a file.
  Each thin spot prints what to do about it (identical seeds across `stars()` / `birds()` / `shimmer()` / `puffs()` / `ridge()` / `canopy()` calls are what make `sharedShare` thin: give every call its own seed; instanced `<g transform=scale>` and `puffs()` with n above 3 repeat a
  `d` string, which `distinctRatio` counts once; the hue sectors that carry area are named). A `<path>` carrying `us-lit` counts as ONE shape and one lit pane group. "Too little drawn for its size" is the advisory `detailPerKB` (shapes + path segments per KB: path-heavy
  hand-drawn art is not flagged; `shapesPerKB` keeps its hard floor, and its advisory moved to `detailPerKB`); small items also report how many moving elements share one `--d` (a bare `x-*` is delay 0): an advisory above the corpus 90th percentile (5; the accepted median is 3 and the gold
  exemplars have 3 to 5 on delay 0). `sheet` renders items paused at `--at <ms>` (default 6.5 s; the file gets a `-t<ms>` suffix) or with `--still` (animations OFF: the rest frame reduced motion shows, `-still`), `--sizes` adds a strip of a small item at 28, 40, 64 and
  128 px at real pixel size (`-sizes.png`; the contact-sheet tiles are about 200 px, so judge "reads at 28 px" on the strip), `--crop phone|square` renders what a portrait phone or a square tile shows of a scene, and a contact sheet of light renders sits on a light page.
  `reference --render` renders the exemplars in light, night AND dark (every PNG the briefs cite) unless one `--mode` is given.
- A load error (a top-level `const` declared in two files because a scene file has no IIFE, a runtime throw, a syntax error) names the FILE and the line, for every command.

The template placeholders (`{{name}}`; a placeholder with no value is an error, never "undefined"):

| Template | Placeholders |
| --- | --- |
| `scene-brief.md` | `region_id region_name unit_word groups_summary batch batches count todo_count batch_groups file region_file keys done_note existing exemplars weaker care notes verify scene_cap todo_s guard skill refs targets pass_mark safe_zones markup_rules min_richness max_thin max_redraws` |
| `element-brief.md` | `region_id region_name unit_word groups_summary batch batches count todo_count batch_groups files region_file keys done_note existing exemplars weaker care notes verify item_cap todo_s guard skill refs targets pass_mark markup_rules min_richness max_thin max_redraws` |
| scaffold (`region-*.tpl`, `modules-row.md.tpl`) | `id ID name name_js unit_word unit_word_plural groups_list units_table places_table world_cities field_unit country_line n group todo_lines pack_name_js pack_desc_js pack_rows over pack_count pack_s pack_list` |

`lint --file <path>` and `sheet --file <path>` work for a file that is not in `src/app` yet and for one that already is (they load the registry
without the file and take everything it then adds). A pack file also carries the scenes other agents draw into it (`B.scenes()`): `--only small` keeps
its elements, `--only scenes` its scenes. Lint measures every drawing with its ids renamed to a fixed length (`stableIds`), so a scene's size does not depend on how many scenes were rendered before it.

## The skill and the tools

Drawing a pack well is a craft with a house style, so it has a playbook and tools that enforce it. The playbook is the Claude Code project skill **`.claude/skills/animation-pack/`** (committed: `.gitignore`
ignores the per-machine `.claude/*` but not `.claude/skills/`; Claude Code loads it by itself when a task is about animation packs, regions, scenes or icons). The tools are `node tools/anim-pack.mjs` (`--help` lists them).

| Part | File | What it is for |
| --- | --- | --- |
| Entry and gates | `.claude/skills/animation-pack/SKILL.md` | the one-page checklist and the hard gates: study the gold standard, draw with the kit, lint with no waiver, look at light and night renders, score the rubric, independent review; failure handling |
| Style | `references/style-guide.md` | the visual and motion language, quantified from the 229 hand-drawn scenes, with the defect catalogue and the six weaknesses the pilot's blind judges found again and again (section 14) |
| Review | `references/rubric.md` | the 20-point rubric and the 8 instant rejects for scenes (part A) and small items (part B), how to score blind, how to judge a contact sheet and a 28 px strip, the six recurring weaknesses as named checks (section 9) |
| Craft | `references/recipes.md`, `references/kit-reference.md`, `references/small-icons.md` | ten scene-type recipes with exact kit calls, the byte budget per layer, and tested local helpers (rock, bush, crowns, ferns, ranges, house, boat, clipPath, a night scene painted for the light theme); every `animSceneKit()` helper and motion class; the 64 x 64 icon craft with its one size table and the real meaning of `s` and `w` |
| Process | `references/workflow.md` | a whole region: `new`, tables, care notes, `brief`, commit, a pilot, agents, per-batch lint and guard, the review panel, the fix loop, integration, release, and (section 18) how to validate a change to the skill with a pilot region and a blind comparison |
| Gold standard | `tools/anim-reference.json` (`reference [--render]`) | the exemplars to match and the "do better" list |
| Floor | `tools/anim-quality.json` (`lint`, `calibrate`), `tools/lib/anim-quality.mjs` | thresholds calibrated at the minimum of the accepted corpus; never lowered, never waived for new work |
| Briefs | `tools/lib/anim-templates/scene-brief.md`, `element-brief.md` | what `brief` fills in for each drawing agent; they send the agent to the skill with ONE reading list per kind (a scene agent reads the four scene references, an element agent `small-icons.md`, `style-guide.md` sections 1 and 10 and `rubric.md` part B) and fix the report: a study note per piece, `git status` and the `guard` output, the PNGs that loaded |

Care rules that bind every region (the briefs carry them, `tools/lib/anim-region.mjs` `CARE_RULES`): no text, no flags, maps or borders, no political or military symbols, no holy figures; **people: no portraits, faces, crowds or identifiable persons, and no person as the subject, but a tiny anonymous silhouette without features (a few pixels, a handful per scene) is allowed as a scale cue** (the accepted corpus has them; `ASIA_PACK.md` now says the same instead of its older "no real people"). A region's own notes (the `## Cultural care` section of its doc) may only be STRICTER than these rules, never looser: a region that bans every figure bans the scale-cue silhouette too, and where two statements differ the stricter one wins. The kit's sunburst (`rays()`) tinted red and white reads as a rising-sun flag. The care rules override what older scenes show (a few of the first US scenes carry flags).

The rule behind all of it: the lint is a floor, the bar is the corpus median (richness >= 0.90, at most 4 thin spots). A piece passes only with `PASS: <n> items clean.` (no waiver), looked-at light and night renders (and the phone and square crops) beside the nearest exemplar, a written rubric self-check of at least 18 of 20 with every core line and no instant reject,
and, for a batch, a blind review by a fresh reviewer and `guard` proving that only the agent's own files changed. A piece that still fails after 3 redraws is removed and reported as NOT DONE with its draft; never edit a threshold, add a waiver or pad the drawing: only the orchestrator decides about waivers. An attempt is a whole redraw from scratch (a failed look counts, polish after a clean look does not), and an image that did not load has not been looked at.

**Validating a change to the skill or the briefs.** `references/workflow.md` section 18 is an optional pilot procedure: a made-up region is set up by an agent that is the skill's first user (it logs every friction), drawn by agents from the generated briefs and gated by the orchestrator, then its pieces are judged BLIND by three fresh judges next to a rule-based sample of the corpus (shuffled neutral names, one modified time, the key kept outside). The pass rule, per kind: the pilot mean is at least the corpus mean minus 0.75, every pilot piece at least the corpus mean minus 1.0, and no pilot piece has more than one instant-reject vote of the three. The first pilot (a region of four countries: nine scenes and seven icons) passed with scenes 7.06 against 4.77 and icons 6.55 against 4.63; its 60 friction points were resolved (the tooling ones in code with regression tests, the rest in the skill, the briefs and these docs), and the six weaknesses its judges found again and again (night renders that are dim copies, coin foliage, cloned shapes, washed palettes, hard-edged water, icons that are scenes in a tile) became named checks in `rubric.md` section 9.

## My animations: made by the user (wave 6)

Settings > Animations > gallery > "Create an animation": the user describes
one, the assistant drafts it (claude-runner profile `anim-make`: no tools, a
fixed prompt and JSON schema `{label, slot, tags, svg, reducedSvg, css}`,
Haiku or Sonnet), and the draft runs through `src/app/71-anim-sanitize.js`
before it is previewed, again before it is saved, and again whenever it is
read. The sanitiser is a whitelist that rejects rather than repairs: no script,
no `on*` handlers, no `href`, no `url()` other than `url(#own-id)`, no
`foreignObject`, images, SMIL or text, only the scene classes and `u-*`, and
size and shape caps (`ANIM_MAKE_MAX_SVG`, `ANIM_MAKE_MAX_NODES`). Its css must
sit under `.as-<id>` with keyframes named `<id>-*`, and is gated on the live
scene like the core css. Each item then passes the same gate as the packs
(`animGateItem`: renders both variants, clean markup, within
`ANIM_ITEM_MAX_BYTES`, still when reduced). Saved items live in
`<data>/animations/mine.json` (up to `ANIM_MAKE_MAX_ITEMS`) and become the
"My animations" pack (id `mine`), so pins, favourites, blocks and the daily
look apply. Slots open to it: `ANIM_MAKE_SLOTS`.

## The daily look

`animDailyPick(slot, day, look, {level, region, theme})` hashes the day and
the slot, so the pick is the same all day and changes the next. A pin wins
(unless blocked or its pack is off); favourites count three times, items
drawn for the current theme twice; season, region and intensity filter the
pool (falling back to everything rather than nothing). The user's choices
live in the data key `animPrefs.look` (`{theme, themeDaily, fav, block, pin,
packsOff}`); the core pack cannot be switched off.

## The quality gate

`tests/anim-packs.test.mjs` finds every `src/app/72-anim-pack-*.js` and, for
each pack: the manifest is valid (`animValidatePack`), every item renders in
both variants without throwing, the markup is balanced and has no script,
event handler, embedded content, remote URL or `NaN`/`undefined`, each item
is at most 14 KB and the pack at most 400 KB (css 24 KB), the reduced variant
is still (`ap-still`, never `is-live`), every theme can wrap it, and no two
items of one slot draw the same thing. Run it alone while authoring:

```
node --test tests/anim-packs.test.mjs
```

Then `node build.mjs --syntax`, `node build.mjs`, and look at the pack in
Settings > Animations > Animation gallery (By pack) on a test copy, in light
and dark, at Subtle and Playful, and with reduced motion.

### Rich local scenes: the `scene-rich` lint profile

A rich scene (`item.rich: true`, full scenes only: the Yateley and Fleet
views built with the object library `src/app/71-anim-uk-nature-kit.js` and a
live sky) has the registry's rich byte budget (`ANIM_RICH_ITEM_MAX_BYTES`
full screen, `ANIM_RICH_TILE_MAX_BYTES` in a tile) and is linted by its own
profile, `scene-rich`, whatever its pack. Reusing a library object
(`<use>` of a `<symbol>`) is the point there, so the copy rules of the strict
profiles (`sharedShare`, `distinctRatio` ...) do not apply. Instead it keeps
corpus floors for the picture (palette, depth, detail spread, life) and
ceilings for the RENDER COST at the heaviest accepted rich scene:
`renderedNodes` (the nodes the browser paints, every `<use>` expanded to the
object it shows), `movingGroups` (what is animated each frame) and `bytes`.
A new rich scene may be as rich as the best one but never heavier to render;
aim for the median. `node tools/anim-pack.mjs lint --pack uk-south-east`
shows them, `calibrate` prints the corpus for every profile. The kit files
(`71-anim-uk-*.js`) are part of the registry load the tools and tests share
(`tools/lib/anim-sources.mjs`).

## Composed scenes and the new standard

The full contract is `docs/dev/SCENE_ENGINE.md`; this is the working summary.

**The bar.** Since 7 Oct 2026 the rich Yateley and Fleet scenes are THE BAR every scene must reach (`tools/anim-reference.json`
`bar`; `node tools/anim-pack.mjs reference` prints it first). A scene looks bad next to them when it is flat, bare, still, generic or lit
wrong. New scenes are COMPOSED: objects from a library (variants, four seasons, animation hooks, night lights) placed by scene data
(layers, ground, water, hand placements, seeded scatter rules, actors, flocks) and drawn by a canvas renderer that bakes everything
static into a few layer bitmaps. Every hand-drawn profile (`scene`, `scene-legacy`, `scene-rich`) keeps its floors, but as the LEGACY
tier: `lint` prints "(legacy floors: below the new standard)" after a passing hand-drawn scene and GOLD after a composed one that passes.

**The composed profile** (`tools/lib/scene-lint.mjs`, thresholds `tools/anim-quality.json` "composed", designed, re-based at the convert stage):

- data: placements, animated draws (at most 300), actors, flock birds, particles, layers used (5 to 8), bake bitmaps (at most 6), distinct
  sprites, sprite memory, data bytes, the SVG fallback's size, signs (only with `signage: true`, safe text, no TfL marks);
- perf (`scene lint --perf`, `scene perf`): the median dynamic part of the frame at most 6 ms and the whole frame at most 8 ms on a laptop
  (x `swFactor` 1.75 under headless software raster), p95, the first bake;
- the bar: depth layers, ground cover, movers, scene crossers, kinds of motion, a signature, the live sky, seasons (delta E), the sun,
  shadows, reflections, night lights;
- placement variety: reuse is GOOD, stamps are not (scale spread, flips, variants, tints, no grids, no stacked copies, species per category);
- care: tiny anonymous silhouettes (at most 8, 10 at a station), no crowds, signs only where allowed.

**The workflow:** brief -> compose from the library (an archetype when one fits) -> add objects if needed -> lint (quality + perf) -> sheet -> review.

```bash
node tools/anim-pack.mjs brief my-pack --kind composed                       # the brief, with the bar, the budget and the scene card
node tools/anim-pack.mjs object list --kit temperate                         # what the library holds
node tools/anim-pack.mjs scene new my-pack my-scene --lat 51.34 --lon=-0.83  # a scene that compiles at once (or --brief <file>, --archetype <id> --row '<json>')
node tools/anim-pack.mjs object new tree.rowan --kits temperate --role tree  # only when the subject needs a new object
node tools/anim-pack.mjs object lint tree.rowan
node tools/anim-pack.mjs object sheet tree.rowan --mode night
node tools/anim-pack.mjs scene lint my-pack/my-scene --perf                  # until GOLD
node tools/anim-pack.mjs scene sheet my-pack/my-scene --times --seasons --contact
```

**Many scenes cheaply (a London pack).** An archetype (`station`) plus a data table (one row per station: id, name, lines, lat, lon,
era, features) gives one scene per row, each built only when it is shown or linted. Batch commands run over the table and end with
a summary table (rows, pass, fail, the worst animated draws and dynMs, the means, the rows nearest to failing):

```bash
node tools/anim-pack.mjs scene lint --archetype station --table london-demo --rows 200
node tools/anim-pack.mjs scene perf --archetype station --table london-demo --sample 3
node tools/anim-pack.mjs scene sheet --archetype station --table london-demo --sample 3 --times --contact
```

**Upgrading the hand-drawn region scenes.** `status <region> --standard` (or `status --all --standard`) is the worklist, grouped by
suggested archetype; `brief <region> --kind upgrade` makes the batches of 7. Per scene:

```bash
node tools/anim-pack.mjs scene upgrade asia-southeast/singapore-skyline                          # the largest shape clusters of the old art
node tools/anim-pack.mjs scene upgrade asia-southeast/singapore-skyline --box 560,160,1120,640   # landmark extracted, archetype suggested, a DRAFT written
node tools/anim-pack.mjs scene sheet asia-southeast/singapore-skyline --compare --upgrades       # old vs new, at noon and at night
node tools/anim-pack.mjs scene lint asia-southeast/singapore-skyline --upgrades --perf
```

The draft keeps the item's identity (id, key, place fields, label, site, tags, `when`); it goes live only at GOLD, with the compare
sheet looked at in light and night. Hand-drawn scenes still get the Yateley rules (seasons, the live sky, weather) through the retrofit
overlay; check it with `node tools/anim-pack.mjs lint --pack us-northeast --at 2026-10-07T21:30:00Z` and
`node tools/anim-pack.mjs sheet --pack us-northeast --at 2026-10-07T21:30:00Z --contact`.

**Signs and the legal note.** Text in a drawing stays forbidden. The one exception is the engine's place-name sign, only in scenes whose
archetype declares signs (`signage: true`): a plain sans-serif board in the system font with line-colour bars, drawn from data, escaped,
with a deny-list. The TfL roundel, the "Underground" logotype, the line-diagram style and New Johnston are TfL marks: never reproduce
or approximate them; the object lint rejects a ring with a bar across it in street, rail and building objects.


1. `src/app/72-anim-pack-<id>.js` with the manifest above.
2. A reduced variant for every item; nothing fetched; no user text.
3. `node --test tests/anim-packs.test.mjs` passes.
4. A row in `MODULES.md` (Animation library) for the new pack.
5. A pack for a place in the world (a new country, state or city): do not write a new lookup or builder. Add it to a
   region (see "Regions" above), or define a new region as a config.
