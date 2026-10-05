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
`animRegionWhere(ctx)`, the one call the opening sequence makes (`78-anim-wire.js`: "Welcome to Seattle",
"Welcome to Japan"). **A new region is a config file of data tables plus scene files plus pack files. It
never copies logic.**

### Files and names

| File | What it holds |
| --- | --- |
| `src/app/71-anim-region-<id>.js` | the config: the unit and place tables and `animRegionDefine({...})`, nothing else |
| `src/app/71-anim-region-<id>-scenes-N.js` | full-screen scenes: `animRegionSceneAdd('<id>', {key, label, site, colour, mood, season, tags, svg})` |
| `src/app/72-anim-pack-<id>-<group>.js` | one pack per group: `const B = <REGION>.builder('<group>'); B.scenes(); ...; animRegisterPack(B.pack({id: '<id>-<group>', ...}))` |
| `tests/<id>-pack.test.mjs` | the region's gate (copy `tests/asia-pack.test.mjs`) |

- The build concatenates `src/app/*.js` by name into ONE script scope. `71-anim-0region.js` sorts before every
  other `71-anim-*` file, so a config can call `animRegionDefine` while it loads. `tools/lib/anim-sources.mjs`
  (`REGION_FILE_RE`, `regionSourceFiles`, `animRegistryFiles`) already matches these names: tests and tools load
  the registry through it, so a new region is picked up with no list to edit.
- `<id>-scenes-N.js` sorts BEFORE `<id>.js` (`-` sorts before `.`), so a scene file runs before its config.
  That is fine: scenes are stored in the framework by region id, and `animSceneKit()` is a hoisted function.
  Scene files use only `animSceneKit()` and `animRegionSceneAdd`; they never touch the config's constants.
- A region owns the packs named `<id>-*` (`animRegionOwns`): the opening sequence only dresses the welcome with
  an opening from one of them. The id is lower-case letters and digits, and is never `uk`, `texas`, `world`,
  `core`, `seasons`, `sky`, `moments`, `rewards` or `mine` (other pack families). Item refs are
  `<pack id>/<item id>` and users pin and favourite by ref: never rename an id once it has shipped.
- Regions must not overlap: `animRegionWhere` returns the first region (file-name order) that matches.
- The legacy `71-anim-us.js` and `71-anim-asia.js` stay as thin configs and keep their old public names
  (`usPlace`, `usBuilder`, `usSceneKit`, `asiaBuilder`, `ASIA_PLACES` ...), so the pack files and the 21
  scene files they serve needed no edit.

### The config

`animRegionDefine(cfg)` returns the region (also in `ANIM_REGIONS`, found by `animRegion(id)`). The region has
`where(ctx)`, `place(ctx)`, `unitOf(ctx)`, `builder(group)`, `sceneAdd(entry)`, `scenes` (the registry) and
`check()`.

| Field | Meaning |
| --- | --- |
| `id`, `name`, `over` | `'asia'`, `'Asia'`, the caption prefix over the town in the opening (`'USA'`, `'Asia'`) |
| `unitWord` | `'state'`, `'country'`...: the item kind value and the scene key prefix (`country:JP`; `unit:JP` also works) |
| `units` | `{ CODE: [name, group] }`: the groups become the packs (`asia-west` is the group `west`) |
| `places` | `[[id, name, unit, lat, lon, kind]]`; `kind` is `'big'` (a signature opening), `'small'` (a symbol) or `''` (an anchor: it only tells which unit a position is in). Every unit needs at least one row |
| `unitKm` | beyond this from every row a position is in no unit of the region (US 190, Asia 300) |
| `placeKm` | `{big: 50, small: 30}` (the default): how close counts as "in" a place |
| `travelId` | `(row) => travel city id` (default `row[0] + '-' + id`: the US `seattle-us`; Asia overrides it: `tokyo-jp`) |
| `worldTravel` | travel city ids the world pack draws: while travelling there the region matches nothing |
| `elsewhere` | units whose art lives in another pack (US: `TX`): looked up, never opened |
| `pseudo` | `{ CODE: {id, name, kind, group?} }`: a unit with no art of its own that is one fixed place (US: `DC`) |
| `placeKinds` | the kinds `B.place()` may build (default both; Asia `['small']`: its big cities come from scenes) |
| `fields` | the item fields `{kind, unit, place, size, signature}` (default `<id>Kind`, `<id><Unit>`, `<id>Place`, `<id>Size`, `<id>Signature`) |
| `tags`, `priority`, `keys` | the first tags `{root, unit, city}`; `{unit: 1, city: 1.2}`; the property names of `place()` / `where()` results `{unit, unitName}` |
| `country`, `extra` | the ISO country of an item (a string, or `(unit) => code`; default the unit code, so country units need nothing) and more item fields `(unit) => ({...})` |

`region.check()` lists table mistakes (duplicate ids, unknown units, bad coordinates, a unit with no row, a travel
id used twice, a scene with a wrong key) as an array of sentences; the tests assert it is empty.

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
  travelId: (p) => p[0] + '-' + p[2].toLowerCase(),   // 'tokyo-jp': the travel tables' ids
  worldTravel: ASIA_WORLD_TRAVEL,
  placeKinds: ['small'],                              // the big cities come from their scenes (B.scenes())
  keys: { unit: 'cc', unitName: 'countryName' }, fields: { unit: 'asiaCc' },
});
```

The US config differs only in data: `unitWord: 'state'`, `worldTravel: ['new-york-us']`, `elsewhere: ['TX']`, a `DC`
pseudo unit, `country: 'US'`, `extra: (u) => ({ state: u })`, `tags: { root: 'usa' }`, `fields: { unit: 'usState' }`.

### What a new region needs

1. `src/app/71-anim-region-<id>.js`: the tables and `animRegionDefine` (keep the result in a const, such as
   `const EU = animRegionDefine({...})`, for the pack files).
2. Scenes, about ten units per file, in `71-anim-region-<id>-scenes-N.js`: `const K = animSceneKit();` then
   `animRegionSceneAdd('<id>', { key: 'country:FR' | 'place:paris', id?, label, site, colour, mood, season, tags, svg })`.
   `svg()` returns the inside of a 1600 x 900 drawing built with the kit (the rules: `docs/dev/US_PACK.md`).
3. One pack file per group, in `72-anim-pack-<id>-<group>.js`. The scenes-first way (Asia, recommended):
   ```js
   (function () {
     const B = EU.builder('west');
     B.scenes();                                  // every registered scene of the group: a full-screen opening
     B.element('FR', { id: 'baguette', label: 'Baguette', colour: 'amber', svg: () => '...' });         // the unit's symbol
     B.place('lyon', { id: 'lanterns', label: 'Lantern festival', colour: 'orange', svg: () => '...' }); // a small place's symbol
     animRegisterPack(B.pack({ id: 'eu-west', name: 'Europe: West', description: '...' }));
   })();
   ```
   The icons-first way (the US): `B.unit('FR', 'signature' | 'element', {...})` and `B.place(id, {...})` for every
   item with a small drawing, which a registered scene then upgrades to full screen (`full: true`). The builder fills
   in the id prefix, the label suffix, the tags, `region`, `country`, `reduced`, the slot, the priority and the `when`
   rule, and throws when a unit or place belongs to another group.
4. `tests/<id>-pack.test.mjs`: every unit has a signature and an element, every place an item, the lookups, nothing
   leaks outside the region (copy `tests/asia-pack.test.mjs`); `region.check()` returns `[]`.
5. Docs `docs/dev/<ID>_PACK.md` and a row in `MODULES.md` (Animation library). The opening sequence needs no edit:
   `animRegionWhere(animCtx())` already covers the new region.

`tests/region-framework.test.mjs` proves all of this on a toy region (2 groups, 4 units, 6 places, a travel
mapping, a skip list, scenes): the lookups, the builder, the scene upgrade and scene items, `animRegionWhere`
and the opening sequence. If a new region seems to need new logic, extend the framework and that test instead.

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

## Checklist

1. `src/app/72-anim-pack-<id>.js` with the manifest above.
2. A reduced variant for every item; nothing fetched; no user text.
3. `node --test tests/anim-packs.test.mjs` passes.
4. A row in `MODULES.md` (Animation library) for the new pack.
5. A pack for a place in the world (a new country, state or city): do not write a new lookup or builder. Add it to a
   region (see "Regions" above), or define a new region as a config.
