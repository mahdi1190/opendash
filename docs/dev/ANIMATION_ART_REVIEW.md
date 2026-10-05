# Animation art review

The library currently has 972 registered items: 397 full-screen scenes and
575 miniature scenes, symbols, transitions and effects. This pass improves
existing drawings; it does not resume the paused thousand-scene expansion.

Generate the inventory with `node tools/animation-inventory.mjs <output.json>`.
Generate review frames with `node tools/review-uk-pack.mjs <pack> <output-folder>`.
An optional filter accepts a county, source part, item id, `full`, `mini` or `all`.
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
| uk-south-east | 148 | 0 | All county baselines reviewed; 148 scenes receive atmosphere improvements, including 32 bespoke North Hampshire profiles; individual architecture pass in progress |
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
