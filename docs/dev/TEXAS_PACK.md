# The Texas pack

`src/app/72-anim-pack-texas.js` is a regional pack in the style of the UK and
world packs: every item has a `when(day, ctx)` rule, so none of it ever comes
up outside Texas and none of it is in the ordinary daily rotation. Read
`docs/dev/ANIMATION_PACKS.md` first for the general format.

## Where Texas is (offline, no setting)

`txPlace(ctx)` returns a Texas town id, or `''`:

- **Travelling** (`ctx.city`, set by `78-anim-world.js` while travel places you
  away from home): the city must be a Texas travel city (`houston-us`,
  `dallas-us`, `san-antonio-us`, `el-paso-us`). A trip to Paris from Texas is
  Paris (the world pack), not Texas.
- **At home**: the weather town (`ctx.lat`, `ctx.lon`) within 60 km of a town in
  `TX_TOWNS` (20 towns, so Austin, Fort Worth, Galveston, Lubbock and others
  count too). The travel tables carry only four Texas cities; the town table in
  the pack is what covers the rest.

There is no setting of its own: the pack follows the weather town and Settings >
Travel, and "Texas" can be switched off in Settings > Animations > gallery.

## Full-screen scenes (9)

`src/app/71-anim-texas-scenes.js` draws the pack's big art as full-viewport scenes
(`full: true`, 1600 x 900, sliced to fill any screen; see "Full-viewport scenes" in
`docs/dev/UK_PACK.md`). It only defines `animTexasScenes()` (the items) and
`animTexasSceneCss()` (their css); `72-anim-pack-texas.js` reads both, so the gallery
still shows one "Texas" pack. Each is layered (sky and its light, far / mid / near layers
drifting at different speeds, ambient life) and under the 32 KB scene budget:

| Scene | Where | Priority |
| --- | --- | --- |
| Bluebonnets in the Hill Country (Mar to May) | anywhere in Texas | 1 |
| Sunset over West Texas (windmill, mesas, tumbleweed) | anywhere in Texas | 1 |
| Sunrise on the Gulf Coast (pier, shrimp boat, gulls) | anywhere in Texas | 1 |
| The Stockyards at dusk (the arch and its star, a cattle drive) | Fort Worth | 1.3 |
| The skyline at golden hour (Reunion Tower, the Hunt Hill bridge) | Dallas | 1.3 |
| Liftoff at dawn (pad, rocket, smoke) | Houston | 1.3 |
| The walk up to the Capitol (live oaks, statues and lamps along the path) | Austin | 1.3 |
| The Alamo in the morning light (palms, string lights) | San Antonio | 1.3 |
| The star on the Franklin Mountains (city lights) | El Paso | 1.3 |

The evening grade works as in the UK scenes: the dark theme or a dusk / night time of day
tints the scene and lights `.tx-lit` (windows, lamps) and `.tx-lamps` (strings of lights,
drawn as round-capped dashed strokes) and `.tx-star`. The opening plays the scene full
screen under "Welcome to <town>"; a small item still shows as an emblem over the landscape.
`Never put a transform attribute on an element that has an x-* class` applies to scenes too:
wrap it in a `<g transform>`.

## The opening

The daily opening is the splash sequence in `78-anim-wire.js` (`animOpeningSequence`): the brand, "Welcome to <place>", then a scene. It only knew UK counties with full-viewport scenes, so a plain 64 x 64 pack item never showed. In Texas (`animTexasWhere(animCtx())`, no UK county) it now says "Welcome to Fort Worth" over the seasonal landscape and shows today's Texas opening item as an emblem (`.od-seq-emblem`, `02-splash.css`) with the caption "Texas · <item>". A full scene fills the screen and takes the place of the landscape and the emblem. It only does so when today's opening pick really is a Texas item, so a pin, a block or the pack switched off falls back to the plain landscape. The splash holds on the first load of the day (Settings > Animations > Opening: every load).

## What is in it (32 items)

| Kind | Priority | Items |
| --- | --- | --- |
| statewide | 1 | openings: Lone Star flag, bluebonnet field, windmill, longhorn; symbols: cowboy hat, boots, tumbleweed, armadillo, prickly pear, pickup; celebrations: star burst, hat toss, fireworks |
| sky | 2 (as the sky pack's sunsets) | big sky sunset, joins the real sunset pool in Texas |
| city | 1.2 | a signature opening and an element for Houston, Dallas, Austin, San Antonio, El Paso and Fort Worth. They beat the statewide set while you are there |
| day | 1.5 | Texas Independence Day (2 Mar), San Jacinto Day (21 Apr), Juneteenth (19 Jun), bluebonnet season (25 Mar to 20 Apr), rodeo season (24 Feb to 20 Mar), Friday night lights (Fridays, Sep to Nov) |

A festival or the birthday (priority 2+) still wins the day, as for every pack.

## Adding a town or a day

- A town: add a row to `TX_TOWNS` (id, name, lat, lon, travel city id or `''`),
  then two `city('<id>', 'signature' | 'element', {...})` items. A `texasKind:
  'city'` item needs both kinds (the test checks).
- A day: `day((d) => md(d) === 302, {...})`. `md(d)` is month x 100 + day, so
  2 March is `302`. Moving dates belong in the almanac, not here.

## A drawing gotcha

Never put a `transform="..."` attribute on an element that also has an `x-*`
motion class: the CSS animation replaces the transform. Rotate a wrapping
`<g transform>` and animate the child instead (the Sun City and Juneteenth rays).

## Tests

`node --test tests/anim-packs.test.mjs tests/texas-pack.test.mjs`
