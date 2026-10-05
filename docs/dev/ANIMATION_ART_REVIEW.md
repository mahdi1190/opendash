# Animation art review

The library currently has 1,008 registered items: 433 full-screen scenes and
575 miniature scenes, symbols, transitions and effects. This pass improves
existing drawings; it does not resume the paused thousand-scene expansion.

Generate the inventory with `node tools/animation-inventory.mjs <output.json>`.
Generate review frames with `node tools/review-uk-pack.mjs <pack> <output-folder>`.
An optional filter accepts a county, locality, season, source part, item id, `full`, `mini` or `all`.
An optional final argument selects comma-separated modes: `light-still`,
`dark-still`, `light-motion`, `dark-motion`. Sheets have at most 24 items.
Keep screenshots and reference photographs outside the repository.
Use `--sheets-only` to rebuild contact sheets from existing frames after a
partial rerender. Miniatures use the application's colour tokens and scene CSS.

Do not call a pack finished just because its colours changed. Review its
landmark silhouette, framing, light, depth, local objects and choreography.
Avoid a fixed sun, cloud pair and bird flock behind every scene. Each place
needs a considered atmosphere; variants should change the viewpoint or activity.
Preserve item ids, proximity rules, motion preferences and all quality gates.

| Pack | Full | Mini | Status |
| --- | ---: | ---: | --- |
| uk-north-west | 20 | 0 | First art pass: place palettes, local activity, library frontage, glasshouse ribs, textured crags and rounded ridge contours; four-mode frames generated and county contact sheets reviewed |
| uk-south-east | 184 | 0 | All county baselines reviewed; 148 scenes receive atmosphere improvements, including 32 bespoke North Hampshire profiles; individual architecture pass in progress |
| uk-south-west | 0 | 28 | Baseline frames generated; full-screen upgrade pending |
| asia-central | 13 | 12 | Shared cloud and bird drawings varied; full-screen subjects reviewed in contact sheets; all four modes generated; individual redraws pending |
| asia-east | 31 | 27 | Shared cloud and bird drawings varied; full-screen subjects reviewed in contact sheets; all four modes generated; individual redraws pending |
| asia-south | 23 | 23 | Shared cloud and bird drawings varied; full-screen subjects reviewed in contact sheets; all four modes generated; individual redraws pending |
| asia-southeast | 28 | 34 | Shared cloud and bird drawings varied; full-screen subjects reviewed in contact sheets; all four modes generated; individual redraws pending |
| asia-west | 37 | 29 | Shared cloud and bird drawings varied; full-screen subjects reviewed in contact sheets; all four modes generated; individual redraws pending |
| us-midwest | 22 | 25 | Shared cloud and bird drawings varied; full-screen subjects reviewed in contact sheets; all four modes generated; individual redraws pending |
| us-mountain | 14 | 24 | Shared cloud and bird drawings varied; full-screen subjects reviewed in contact sheets; all four modes generated; individual redraws pending |
| us-northeast | 18 | 27 | Shared cloud and bird drawings varied; full-screen subjects reviewed in contact sheets; all four modes generated; individual redraws pending |
| us-pacific | 12 | 17 | Shared cloud and bird drawings varied; full-screen subjects reviewed in contact sheets; all four modes generated; individual redraws pending |
| us-southeast | 22 | 27 | Shared cloud and bird drawings varied; full-screen subjects reviewed in contact sheets; all four modes generated; individual redraws pending |
| texas | 9 | 32 | Shared cloud and bird drawings varied; full-screen subjects reviewed in contact sheets; all four modes generated; individual redraws pending |
| world | 0 | 24 | Baseline frames generated; review pending |
| core | 0 | 154 | Baseline frames generated; review pending |
| moments | 0 | 38 | Baseline frames generated; review pending |
| rewards | 0 | 9 | Baseline frames generated; review pending |
| seasons | 0 | 31 | Baseline frames generated; review pending |
| sky | 0 | 14 | Baseline frames generated; review pending |

Northern review findings: the old library frontage invented a rose window and
conical turret roofs. The replacement uses the reading-room gable, corner
turrets and traceried oriel bays, guided by the exterior reference at
[Visit Manchester](https://www.visitmanchester.com/ideas-and-inspiration/blog/post/manchester-s-twentieth-century-library-the-john-rylands-library/).
Stanage's smooth slab now has jointed crags, scree and lit rock planes.
Winter Garden now includes glazing divisions, timber highlights and swaying
planted pots. Whitworth Hall has additional buttresses, tracery and entrance steps.
The university forecourts should still feel less interchangeable. Mam Tor now has a rounded crest, a stepped ridge path, patchwork fields and
eroded flank planes. In the UK-priority follow-up, Stanage's two views replace
the regular upright slabs with a receding, continuous escarpment: uneven
buttresses, bedding cracks, clipped rock grain, grassy shoulders and fallen
blocks. The composition was checked against
[the National Park's Stanage guide](https://www.peakdistrict.gov.uk/visiting/places-to-visit/stanage-and-north-lees).

South East findings: the first pass replaces the fixed sky/cloud/flock arrangement
with coast, town, garden and countryside atmospheres. North Hampshire retains
its separate place-specific profiles and adds heather, gorse, ferns and insects.
Its wooded banks now have varied crown widths, heights, branches and gaps;
the repeated scalloped borders are removed.
Tower Bridge has coloured chains and walkway lattice; St Paul's has a colonnaded
drum and paved forecourt; Windsor's Round Tower has curved courses and parapet.
Canterbury and Chichester use pointed, subdivided glass rather than generic
round windows. Banbury's tabletop includes glazed pastries, linen and a steaming cup.
Village streets now vary roof forms, chimneys, facade colours and window rows.
Eton mess has seeded berries, broken meringue, shaded ceramics and a full-width
tabletop. The Needles uses weathered chalk and moving foam around the stacks;
the lighthouse sits against the outer stack rather than floating beyond it.
Its rock and lighthouse arrangement was checked against
[The Needles](https://www.theneedles.co.uk/landmarks/the-needles-rocks/) and
[National Trust](https://www.nationaltrust.org.uk/visit/isle-of-wight/the-needles-old-battery-and-new-battery/the-history-of-the-needles-rocks-and-lighthouse).
Remaining concerns include simplified manor and palace frontages. Waddesdon's parterre, bedding and fountain are guided
by [the custodian's garden history](https://waddesdon.org.uk/history/history-of-the-gardens/).
This is an incremental art review, not a claim that the entire library is finished.

Validation for this first pass: all 36 animation-pack checks pass, including
fresh SVG ids and the unchanged 32,000-byte scene limit. Syntax and production
builds pass; the full suite reports 1,695 passes, no failures and five skips.
The source privacy scan reports no errors or warnings. Gallery playback was
checked on an isolated local server; no production user data was used for tests.

Source sizes remain below the 400 KB split threshold: South East main about
153 KB, its three parts about 16 KB, 30 KB and 23 KB, and Northern about 52 KB.
Scene counts are unchanged: Hampshire 58, Kent 24, the other seven South East
counties eight each, Greater London ten, South Yorkshire eight, Greater
Manchester eight and Derbyshire four. No new scenes were added in this pass.

Review priority: UK location scenes first. Worldwide individual redraws and
the thousand-scene expansion stay outside the current polish pass.

Yateley composition rebuild (12 views): the Common, Wyndham's Pool and the
Green now use a new renderer rather than the earlier vista overlays. Individual
birch branches and leaves sway around their roots; heather stems, gorse, reed
margins, ferns, textured paths, banks and foreground stones provide depth.
Butterflies flap and travel, dragonflies hover and dart, ducks and ducklings
swim with separate expanding wakes, and a walker leads a dog along the Common.
Cloud veils, moving shadows, reflective water and floating leaves/pollen add
slower motion. Autumn and evening views change vegetation, light and activity.
The other 46 Hampshire views have not received this composition rebuild yet.
Wooded horizons remain simplified; further tree-species detail is still desirable.

Seasonal follow-up: all twelve rebuilt Yateley viewpoints have spring, summer,
autumn and winter versions, adding 36 registrations for 48 scenes. Each automatic
opening's local rule matches the calendar season, while the gallery can preview
any season. Favourites, blocks and saved original refs remain intact. The
viewpoint gate still limits each place to four compositions and rejects duplicate
view/season pairs; a calendar-selection test covers every month.
Spring adds smaller leaves, catkins, pond-margin flowers and a five-petal blossom
branch on the Green. Summer has warmer light, heather, butterflies, dragonflies
and ducklings. Autumn has brown seed stems, reduced foliage, falling leaves and
seeded ground litter. Winter replaces leafy woodland with bare branches, blankets
banks and heath with snow, adds layered snowfall and ice fractures, and uses
resting mallards and a robin instead of swimming ducklings and summer insects.
Winter scenes depict a snowy cold spell; they do not report live conditions.
Seasonal plant references: [Hampshire's summer walks](https://www.hants.gov.uk/thingstodo/countryside/blog/20190806-top-spots-for-summer-walks-in-hampshire)
and [Woodland Trust silver birch](https://www.woodlandtrust.org.uk/trees-woods-and-wildlife/british-trees/a-z-of-british-trees/silver-birch/).
The village-green blossom is illustrative; no particular planted tree is claimed.

Seasonal validation: 37 animation-pack tests pass; the full suite has 1,696
passes, five existing skips and zero failures. Syntax and production builds pass.
All 48 seasonal scenes were rendered at 1600 x 900 in light/dark and still/motion
modes. Privacy scan: zero errors and warnings. The unchanged 32,000-byte gate
passes. South East main is about 155 KB; North Hampshire part is about 49 KB.

Additional Yateley detail pass: all 48 versions now use multi-leaf twig sprays
and paired plant stems, with grass/seed tufts, small foreground stones and seeded
bank texture. Gorse gains prickly stems and flower highlights; ducks gain feather
lines and wing markings. Spring/summer bees have wing and hover motion, unfrozen
ponds gain moving fish silhouettes and perched birds, and the Common gains a
squirrel with independent head, paw and tail movement. The walking dog's tail
moves independently. Winter retains its snow, bare plants and resting waterbird
behaviour. Species and object placement remain illustrative rather than a record
of particular wildlife sightings. Reusable botanical and bee definitions and
rounded coordinates preserve the unchanged 32,000-byte rendered-scene gate.
The distant woodland remains stylised; finer tree structure is a remaining art
concern. The other 46 Hampshire viewpoints still await this composition rebuild.

Live-sky foundation: `almSceneLight` is a pure snapshot calculation, and
`animItemHtml` supplies it only to opted-in `liveSky` items (currently Yateley 48).
Clock.now/Clock.zone and active coordinates are used. Sun height changes with
latitude, date and time; the screen position is an illustrated east-to-west arc,
not a surveyed compass bearing. Sunrise/dusk classification uses solar elevation.
The night moon uses the existing mean-lunation approximation, whose phase can be
about a day off; moon altitude/visibility is not calculated. Stars twinkle through
opacity only. The sky updates on rendering; continuous in-place updates and other
packs are not implemented. The small shared registry hook is necessary to supply
clock/location inputs without drawing builders reading app state directly.
The gate now checks 38 cases, including live renders of all 48 scenes at daylight,
dawn, dusk and night, summer/winter solar height, DST invariance and phase shape.
The review tool accepts --at, --location and --zone for deterministic frames.
