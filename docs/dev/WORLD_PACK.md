# The world pack: adding a city or a country

The world pack (`src/app/72-anim-pack-world.js`, v2.2 wave 6) gives big cities
their own animations. It is tied to the travel feature: an item plays only
while travel places you in its city (`src/app/78-anim-world.js` reads the
travel location, offline, and sets `ctx.city` and `ctx.country` in `animCtx()`).

Where the art plays:

- **On arrival.** The city's signature drawing sits on the travel arrival card
  (`69-travel-moments.js`, `trFullCard`), with the second element beside it.
  It is still at the Reduced and Off levels, and when animations are off.
- **In the daily look while there.** The signature wins the day's `opening`
  and the element wins the day's `symbol` (their `when()` rules), at priority 1,
  so a festival or the birthday (priority 2 and up) still comes first.
- Packs off, blocks and pins in the gallery apply as for every pack. The pack
  shows as "World cities" in Settings > Animations.

## The format

Each city has exactly **two** items, made with the pack's `add(city, kind, o)`:

| Field | Value |
| --- | --- |
| `city` | the travel city id: the folded name and the country, `'tokyo-jp'`, `'new-york-us'` (`trPlaceTables().byId` in `69-travel-data.js`) |
| `country` | ISO 3166-1 alpha-2, `'JP'`; `region` is `[country]` |
| `worldKind` | `'signature'` (slot `opening`, the landmark) or `'element'` (slot `symbol`, a second motif) |
| `when` | `(day, ctx) => ctx.city === city` (set by `add`) |
| `id` | `<city>-<short id>`, e.g. `tokyo-jp-tower` (set by `add`) |
| `label` | `<what>, <city name>` (set by `add`) |
| `tags` | `world`, the city, the country, the kind, plus your own |

Drawings follow `docs/dev/ANIMATION_PACKS.md`: the inside of a 64 x 64 SVG,
the scene vocabulary (fills `k c s w m`, strokes `lk lc lm lw`, motion `x-*`),
constants only, no user text, `reduced: 'static'` unless the still frame needs
its own drawing.

## Adding a city

1. Find the city id: `node -e` over `69-travel-data.js` or search for the city
   name in `TR_DATA_RAW.cities`; the id is the lower-case name with dashes plus
   `-` and the country code. A smaller namesake in the same country carries a
   row number: use the big one.
2. Add it to `CITIES` in `72-anim-pack-world.js` (`'lima-pe': ['Lima', 'PE']`).
3. Add two items: `add('lima-pe', 'signature', {...})` and
   `add('lima-pe', 'element', {...})`. Pick a `colour` swatch and `mood`.
4. Run `node --test tests/anim-packs.test.mjs tests/anim-make.test.mjs`. The
   quality gate checks the markup, sizes and the still variant; the world pack
   test checks one signature and one element per city, that the id is a real
   travel city, and that nothing plays away from the city.

## Adding a country (later)

The format leaves room for country-wide items: give an item `country` and no
`city`, with `when: (day, ctx) => ctx.country === 'JP'`, at priority 0.5 so a
city's own items still win. The starter set has none, and the world pack test
expects every item to carry a city: extend the test with the country rule when
adding the first one.

## Many cities

Keep one pack file per continent once the starter grows past about 30 cities
(`72-anim-pack-world-asia.js` and so on, each registering its own pack id and
using the same `add` helper). The size budget is per pack
(`ANIM_PACK_MAX_BYTES`).
