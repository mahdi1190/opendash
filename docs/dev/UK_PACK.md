# The UK pack: adding a region

The UK pack is a set of regional animation scripts. Use the full-screen
Hampshire scenes and toolkit in `src/app/72-anim-pack-uk-south-east.js` as
the drawing model. Batch 1's South West mini-scenes still need a full-screen
upgrade after the remaining regions. Read `docs/dev/ANIMATION_PACKS.md`
first for the general pack format.

Neighbouring regions may share one gallery pack: South East and London use
the existing `uk-south-east` id, so saved favourites keep working. Every
item retains its actual `ukRegion` from the county table. Keep each file
below about 400 KB. Numbered parts are pure drawing builders, loaded before the
base file, which passes its Hampshire toolkit to them and registers the combined
items once. They keep the same gallery pack and saved item references. Each part
has a `// UK_SCENE_PART: <pack-id>/<part-id>` marker, and every contributed scene
has `ukPart` so the quality gate proves that no source part was left out.

The next expansion targets **1,000+ animated scenes per combined gallery pack**,
including named towns and researched places within each county. The 8–12 scenes
per county below are the completed baseline, not the final expansion target.
New views must change composition and activity as well as lighting or season;
photos and static image substitutes do not meet the animated SVG quality bar.
Town expansions and seasonal versions add 100 scenes: 16 elsewhere in Hampshire, 16 in Kent and
68 around Yateley, Fleet and Farnborough, for 184 combined scenes (36 additional seasonal versions). The wider
1,000-scene expansion remains paused.
South East and London target 1,044 scenes: the 84 baseline scenes plus 24 new
named places with four considered views in each of the ten county/area groups.
This is an authoring target; completed counts remain in the batch table.

Expanded scenes carry `ukPlace`, `ukLocality`, `ukTown`, `ukView` and
`viewReason`. `ukLocality` is the actual village or town; `ukTown` is a main-town
cluster already in the offline county table. Public landmark coordinates may
override that anchor. Only scenes within approximately 25 km of the current
weather/travel point enter the rotation, including across county borders.
If none are available, a seasonal scene fills the screen. Distant scenes remain
available in the gallery. The main title always names the current location;
the corner names the illustrated landmark and its actual county. Pins and
blocks respect proximity, while national events keep their priority.
Yateley's three rebuilt places have four viewpoints in each of four seasons:
48 scenes. `ukSeason` and `season` identify each version; the pack's local
`when` rule matches `animSeasonOf(day)` before the opening rotation. Spring is
March-May, summer June-August, autumn September-November, winter December-February.
The gallery keeps every version available. Existing saved refs remain valid.
Seasonal versions keep the four-view limit per place, with unique view/season pairs.
Snow and frozen ponds are illustrated winter moods, not live weather readings.

The gallery pages 80 scenes at a time and searches all scenes, including place
and town names, so large packs remain entirely browsable.

Northern pilot: `uk-north-west` combines Sheffield (8), Manchester (8) and
Peak District (4): 20 full-screen scenes, two views of ten named places.
This is a city pilot, not completion of the three county batches.

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
- Items sit in the `opening` slot at priority 1. Daily picks rotate among
  the county's items. The full opening sequence plays its local scene first,
  then a matching festival or special event (priority 2 and up). A skip ends
  the whole sequence. Blocks, packs off and motion preferences still apply.
- **Place opening:** when the detected county changes, nearby art (or the
  county signature) plays with a place name and caption. The last county is remembered per
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
  the place name, full screen, with the origin line from `site`. A
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
| 2 (174 full scenes; wider expansion paused) | `south-east` | kent, east-sussex, west-sussex, surrey, hampshire, isle-of-wight, berkshire, oxfordshire, buckinghamshire |
| 3 (baseline done: 10 full scenes; combined gallery; expansion pending) | `london` | greater-london |
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
checks that each item's county belongs to its pack's region, or to one of
the explicitly combined neighbouring regions.

## Steps for one region

1. Copy the Hampshire toolkit and manifest structure from
   `72-anim-pack-uk-south-east.js` to `72-anim-pack-uk-<region>.js`.
   Then change three things:
   - `REGION` and `NATION` (`GB-ENG`, `GB-WLS`, `GB-SCT` or `GB-NIR`)
   - the `NAMES` map (county id to display name)
   - the pack's `id: 'uk-<region>'`, `name: 'UK: <Region name>'` and
     `description`
2. Keep the full-screen toolkit: `add(county, kind, o)`, `ridge`, `canopy`,
   `cloud`, `birds`, `shimmer`, `puffs`, `haze`, `rays`, `reflect`, `finish`,
   `mv` and `U`. Add shared drawing helpers only where needed. Research
   8–12 subjects/views per county and put their reasons and sources in a
   comment at the top of its section.
3. For each county, follow the checklist below. Then run
   `node --test tests/anim-packs.test.mjs`. It finds the file on its own and
   runs the quality gate plus the UK checks.
4. Run `node build.mjs --syntax` and then `node build.mjs`. Review the art in
   Settings > Animations > Animation gallery > By pack, in light and dark and
   with reduced motion.
5. Run `npm test` and `node tools/privacy-scan.mjs .` (zero errors), update
   `MODULES.md` and `docs/CHANGELOG.md`, tick the batch above, and commit it.
   `node tools/review-uk-pack.mjs <pack-id> <output-folder>` produces full-size
   light/dark, still/moving frames and county contact sheets with the existing
   headless Chrome helper. Keep review artifacts outside the release tree.

## Per-county checklist

- [ ] **One signature opening** (`kind: 'signature'`). This is the county's
      best-known sight, used on arrival when local art is unavailable. It has no `months`.
- [ ] **8–12 baseline scenes**, including the signature and at most three of
      each other kind (baseline variants count). Expanded town collections add
      researched named places with at most four distinct views per place:
  - `landmark`: a building or structure
  - `landscape`: the land or coast
  - `tradition`: a festival or custom
  - `food`: food and drink
  - `sport` or `heritage`: these share the fifth element
- [ ] Variants are separate items, `id: '<element>-2'`, with the same
      `ukKind`, a considered change of light, season or angle, and distinct art.
- [ ] A dated tradition gets `months: [n, ...]`, so it only comes up in its
      season. Examples: wassail `[1]`, the Balloon Fiesta `[8]`, cheese
      rolling `[5]`.
- [ ] `label`: the thing itself, for example `'Durdle Door'`. `add` appends
      the county name.
- [ ] `tags`: 2 to 4 plain lower-case words. `add` adds `uk`, the region, the
      county and the kind.
- [ ] `colour` is a swatch. `mood` defaults to `calm`, `intensity` to `subtle`. Use
      `standard` only for busy, energetic art.
- [ ] Art: an original full-screen 1600 × 900 drawing with `full: true`,
      sky and light, three depth layers, at least three ambient motion kinds,
      and `finish()` last. A complete still frame works with reduced motion.
  - Motion uses only the `x-*` classes and is transform/opacity only.
  - Any new keyframes go in the pack's `css`, prefixed `ap-uk`.
  - There is no text in the SVG, and no logos, crests, club badges or
    trademarks.
  - Each full scene is at most `ANIM_FULL_ITEM_MAX_BYTES` (32 KB rendered).
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
