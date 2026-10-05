# The Asia packs

Five regional packs cover Asia: every country and territory has a full-screen signature opening and a
small symbol, every major city a full-screen opening, and every smaller city or famous town a small symbol.
They are ordinary packs (read `docs/dev/ANIMATION_PACKS.md` first) whose items all carry a `when(day, ctx)`
rule, so none of them is in the ordinary daily rotation and none plays outside Asia.

| Pack | File | Countries |
| --- | --- | --- |
| `asia-west` | `72-anim-pack-asia-west.js` | Turkey, Cyprus, Georgia, Armenia, Azerbaijan, Lebanon, Syria, Israel, Palestine, Jordan, Iraq, Iran, Saudi Arabia, Yemen, Oman, UAE, Qatar, Bahrain, Kuwait |
| `asia-central` | `72-anim-pack-asia-central.js` | Kazakhstan, Uzbekistan, Turkmenistan, Tajikistan, Kyrgyzstan, Russia (Siberia and the Far East) |
| `asia-south` | `72-anim-pack-asia-south.js` | India, Pakistan, Bangladesh, Sri Lanka, Nepal, Bhutan, Maldives, Afghanistan |
| `asia-east` | `72-anim-pack-asia-east.js` | China, Japan, South Korea, North Korea, Mongolia, Taiwan, Hong Kong, Macau |
| `asia-southeast` | `72-anim-pack-asia-southeast.js` | Indonesia, Malaysia, Singapore, Thailand, Vietnam, Philippines, Myanmar, Cambodia, Laos, Brunei, Timor-Leste |

## Where the user is (offline, no setting)

`src/app/71-anim-asia.js` (pure) holds `ASIA_COUNTRIES` and `ASIA_PLACES` and Asia's region config
(`animRegionDefine`, see "Regions" in `docs/dev/ANIMATION_PACKS.md`, which prints this config as its worked
example). The lookups, the builder and the scene kit are the generic framework in `src/app/71-anim-0region.js`;
`asiaPlace`, `asiaCountryOf`, `asiaWhere`, `asiaBuilder` and `asiaSceneAdd` are one-line wrappers over it.
`ASIA_PLACES` rows are `[id, name, country, lat, lon, kind]` (read once, when the region is defined),
`kind` = `big` (a major city: a full-screen opening), `small` (a smaller city, town or famous place: a small
symbol) or `''` (an anchor, which only tells which country a position is in).

- `asiaCountryOf(ctx)`: the country of the nearest row within `ASIA_COUNTRY_KM` (300 km) of the weather town
  (`ctx.lat`, `ctx.lon`). While travelling, `ctx.city` = `<place id>-<cc>` (the travel tables' ids) decides.
  Beside a border the neighbour can win. A position in Europe or Africa within 300 km of an Asian row reads as
  an Asian country until a Europe or Africa region has rows there (where two regions' reaches overlap the nearer
  row wins, `animRegionsWhere`). Regions must not overlap, so do not add Asian rows outside Asia to sharpen the
  edge: add the neighbour's rows in its own region, or move the edge by lowering `ASIA_COUNTRY_KM`, and re-run
  `tests/region-framework.test.mjs` (it pins the radii and rejects a row inside another region's reach).
- `asiaPlace(ctx)`: an art place within 50 km (big) or 30 km (small).
- `asiaWhere(ctx)`: where in Asia (the town if there is one, else the country). The opening sequence in
  `78-anim-wire.js` reaches it through the generic `animRegionWhere(animCtx())` ("Welcome to Kyoto", the day's
  Asian opening on the stage).

## What is in a pack

| Kind | Priority | Slot | Items |
| --- | --- | --- | --- |
| country | 1 | opening | a full-screen signature scene per country (`asiaSignature: true`) |
| country | 1 | symbol | a small element per country |
| city | 1.2 | opening | one full-screen scene per big city |
| city | 1.2 | symbol | one small item per small city or town |

A city beats its country's art in its slot while you are there; a festival or the birthday (priority 2+) still
wins the day. Tokyo, Singapore and Dubai also have a world-pack signature: while travelling there the world pack owns the
opening and the arrival card (`ASIA_WORLD_TRAVEL`); living there, the full-screen city scene plays.

## Full-screen scenes

The scenes are 1600 x 900, <= 32 KB rendered, drawn in `src/app/71-anim-asia2-scenes-*.js` with the shared
toolkit `usSceneKit()` / `usSceneCss()` (aliases of `animSceneKit()` / `animSceneCss()` in
`71-anim-0region.js`; see `docs/dev/US_PACK.md`): a scene file calls
`asiaSceneAdd({key: 'country:JP' | 'place:tokyo', label, site, colour, mood, season, tags, svg})` (the same as
`animRegionSceneAdd('asia', {...})`), and
`asiaBuilder(group).scenes()` in each pack file turns every registered scene of that group into its opening item.

Cultural care: no flags, maps or borders, no political or military symbols, no real people, no lettering, no
holy figures. Sacred architecture may be drawn respectfully; disputed places stay neutral landscape or skyline.

## Adding a place, a country or a scene

1. A new place: a row in `ASIA_PLACES` (`big` or `small`), then its scene (`place:<id>`) or one
   `B.place('<id>', {...})` in the pack file of its group.
2. A new country: a row in `ASIA_COUNTRIES` (its group) and at least one place row, then `country:<CC>` scene
   and one `B.element('<CC>', {...})`.
3. `node --test tests/anim-packs.test.mjs tests/asia-pack.test.mjs`.
