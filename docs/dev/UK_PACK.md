# The UK pack: adding a region

The UK pack is a set of regional animation packs, one file per region. Wave 3
batch 1 shipped the South West (`src/app/72-anim-pack-uk-south-west.js`) as
the model. Every later batch copies that file and changes only the content,
so the work is mechanical. Read `docs/dev/ANIMATION_PACKS.md` first for the
general pack format.

## How it plays

- It is opt-in: Settings > Animations > **Regional animations (UK)**, stored
  as `animPrefs.look.ukRegional`. It is off by default.
- Detection works offline (`src/app/78-anim-uk.js`). It uses the travel
  feature's current place (a GB city, while away from home), or else the
  weather town. That point goes through `ukCountyNearest(lat, lon)`
  (`src/app/71-uk-counties.js`): the nearest main town within 40 km, inside
  the UK's bounding box. The result is `animCtx().county`, a county id such
  as `'cornwall'`.
- Every UK item has a `when` rule: `ctx.county === <its county>`. That means
  it never comes up anywhere else, or with the setting off.
- Items sit in the `opening` slot at priority 1. A festival or the birthday
  (priority 2 and up) still wins the day. In the county, the daily opening
  rotates among the county's items.
- **Welcome to \<county\>:** when the detected county changes, the county's
  signature opening plays with a caption. The last county is remembered per
  device (`localStorage dashboard-anim-uk-county`). With motion off, a toast
  shows instead. If the county's region is not drawn yet, the caption plays
  alone.

## Full-viewport scenes (Hampshire onward)

From batch 2 a county may be drawn as **full-viewport scenes** (`full: true`),
as Hampshire is in `72-anim-pack-uk-south-east.js`:

- The drawing is 1600 x 900 user units. `animItemHtml` gives it
  `viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"`, so it fills
  any screen edge to edge (and shows its middle in a square tile). Keep the
  subject inside the middle 1200 x 800 and draw layers 160 units past each
  edge, so they can drift.
- The opening sequence (`78-anim-wire.js`) plays the county's full scene after
  "Welcome to <county>", full screen, with the origin line from `site`. A
  county with no full scene gets a seasonal landscape instead
  (`animOpeningFallbackHtml`). The gallery stage, the animation-of-the-day
  card and the county welcome also show full scenes large.
- Layer it: a sky gradient and its light, far / mid / near layers that drift
  at different speeds, and ambient life (birds, clouds, glints, steam). The
  pack's toolkit (`ridge`, `canopy`, `cloud`, `birds`, `shimmer`, `puffs`,
  `haze`, `rays`, `reflect`, `finish`) does most of it.
- Gradient and pattern ids come from `U()` (fresh per render), because a scene
  can be on the page twice.
- `finish()` adds the vignette and the evening grade (`.hx-tint`): the dark
  theme, or `o.tod` dusk / night, tints the scene and lights `.hx-lit` windows
  and `.hx-star` stars.
- The budget is `ANIM_FULL_ITEM_MAX_BYTES` (32 KB) per rendered scene. Review
  every scene full screen at mid-animation, in light and dark, before
  shipping.

## The regions (batch order)

| Batch | Region id | Areas (ids in `UK_COUNTIES`) |
| --- | --- | --- |
| 1 (done) | `south-west` | cornwall, devon, dorset, somerset, bristol, gloucestershire, wiltshire |
| 2 | `south-east` | kent, east-sussex, west-sussex, surrey, hampshire, isle-of-wight, berkshire, oxfordshire, buckinghamshire |
| 3 | `london` | greater-london (one area; it may take more elements and variants) |
| 4 | `east` | norfolk, suffolk, cambridgeshire, essex, hertfordshire, bedfordshire |
| 5 | `east-midlands` | derbyshire, nottinghamshire, leicestershire, rutland, northamptonshire, lincolnshire |
| 6 | `west-midlands` | west-midlands, staffordshire, shropshire, herefordshire, worcestershire, warwickshire |
| 7 | `north-west` | cumbria, lancashire, greater-manchester, merseyside, cheshire |
| 8 | `yorkshire` | north-yorkshire, west-yorkshire, south-yorkshire, east-riding |
| 9 | `north-east` | northumberland, tyne-and-wear, durham |
| 10 | `wales` | the 22 principal areas (`ukCountiesIn('wales')`) |
| 11 | `scotland` | the 32 council areas (`ukCountiesIn('scotland')`) |
| 12 | `northern-ireland` | antrim, armagh, down, fermanagh, londonderry, tyrone |

The authoritative list is always `ukCountiesIn('<region>')`. The pack test
checks that each item's county belongs to its pack's region.

## Steps for one region

1. Copy `72-anim-pack-uk-south-west.js` to `72-anim-pack-uk-<region>.js`.
   Then change three things:
   - `REGION` and `NATION` (`GB-ENG`, `GB-WLS`, `GB-SCT` or `GB-NIR`)
   - the `NAMES` map (county id to display name)
   - the pack's `id: 'uk-<region>'`, `name: 'UK: <Region name>'` and
     `description`
2. Keep the helpers as they are: `add(county, kind, o)`, `wv`, `cloud`,
   `gull` and `steam`.
3. For each county, follow the checklist below. Then run
   `node --test tests/anim-packs.test.mjs`. It finds the file on its own and
   runs the quality gate plus the UK checks.
4. Run `node build.mjs --syntax` and then `node build.mjs`. Review the art in
   Settings > Animations > Animation gallery > By pack, in light and dark and
   with reduced motion.
5. Update the pack row in `MODULES.md` with the new file, and tick the batch
   in the table above.

## Per-county checklist

- [ ] **One signature opening** (`kind: 'signature'`). This is the county's
      best-known sight, and it plays in "Welcome to …". It has no `months`.
- [ ] **Up to 5 elements**, at most one of each kind:
  - `landmark`: a building or structure
  - `landscape`: the land or coast
  - `tradition`: a festival or custom
  - `food`: food and drink
  - `sport` or `heritage`: these share the fifth element
- [ ] Batch 1 drew about 3 elements per county, with 1 variant each.
      Variants come later as a separate item, `id: '<element>-2'`, with the
      same `ukKind`. The "no kind twice" test then needs widening to "at most
      3 per kind".
- [ ] A dated tradition gets `months: [n, ...]`, so it only comes up in its
      season. Examples: wassail `[1]`, the Balloon Fiesta `[8]`, cheese
      rolling `[5]`.
- [ ] `label`: the thing itself, for example `'Durdle Door'`. `add` appends
      the county name.
- [ ] `tags`: 2 to 4 plain lower-case words. `add` adds `uk`, the region, the
      county and the kind.
- [ ] `colour` is a swatch. `mood` and `intensity` default to `subtle`. Use
      `standard` only for busy, energetic art.
- [ ] Art: an original drawing in the 64 x 64 scene vocabulary (fills
      `k c s w m`; strokes `lk lc lm lw`, plus `t` and `dash`).
  - Motion uses only the `x-*` classes and is transform/opacity only.
  - Any new keyframes go in the pack's `css`, prefixed `ap-uk`.
  - There is no text in the SVG, and no logos, crests, club badges or
    trademarks.
  - Each item is at most 14 KB.
  - `reduced: 'static'` is fine unless the still frame is empty.
- [ ] **Respect:** be specific and true to the place. Use a named landmark, a
      real custom or a protected food (PGI/PDO) rather than a generic joke.
  - No stereotypes: no accents, no caricatured people, nothing about
    weather "misery", class or drink as a punchline.
  - No sectarian, political or contested symbols. This matters especially
    in Northern Ireland, where you should prefer landscape, coast and
    heritage.
  - Name places the way the area does, for example
    "Derry/Londonderry".
  - For Wales, the Welsh name may go in `tags` (for example `'eryri'`).

## Data notes

- `71-uk-counties.js` holds about 900 main towns with positions to two
  decimal places, compiled from ONS geography and OS Open Names (Open
  Government Licence v3.0; see `THIRD_PARTY_NOTICES.md`).
- To fix a misdetection near a border, add a town on the right side to that
  area's string (`'Town lat lon; ...'`). Do not raise the 40 km limit: it
  keeps Calais out of Kent.
- Unitary areas inside a ceremonial county belong to it. Examples: Plymouth
  and Torbay are in Devon, Bournemouth and Poole are in Dorset, Bath and
  North Somerset are in Somerset, Swindon is in Wiltshire, and
  Middlesbrough is in North Yorkshire. Bristol is its own ceremonial county.
- Northern Ireland uses the six traditional counties. The table shows the
  official name "County Londonderry", and the city as "Derry/Londonderry".
  Review this wording before release.
