# Garden engine

Phaser owns native outdoor and indoor scenes and is the default when no graphics
choice is saved. **Garden > Graphics** preserves an explicit Classic choice;
`garden.prefs.renderEngine` selects `standard` or `phaser`. Both use the same
saved garden. The native path replaces the earlier hidden-SVG rendering bridge;
Photo retains its established Classic SVG presentation.

The default world stays quiet. Optional activities are set out deliberately
through **Play → In the garden**, one at a time, and **Put it away** clears the
setup. Map, status and extra controls open on demand; passive notes go to Recent.
Owned objects, discoveries and progress remain saved. See
[Garden pacing](GARDEN_PACING.md).

Land can place previously discovered shelved sights without furnishing the
island automatically. Each `garden.wd['sight.place.<id>']` is one atomic `[3,x,y]`
placement, separate from discovery and room progress. Owner and visitor models
derive props, doors and lights from it. Snapshot `rp` carries only known sight
IDs and bounded integer cells through browser and Node cleaning. Room and Fish
book routes resolve the currently placed entrance; a packed sight explains how
to set it out.

Entering a room offers friends a voluntary **Go in too** action. That action
belongs to the current peer, room, scene and available entrance, and is removed
when those facts stop matching. Narration and fishing status occupy separate
overlay rows, with the reel above and top controls exposed. Hidden fishing
controls release their row; reduced motion suppresses entry fades. Room and
shore fishing controls share the dark, warm palette and visible focus treatment.
Doorway art stays within its registered drawing and interaction bounds.

Pet picking follows the rectangle/depth broad phase with a painted-art query
through current transforms and clips. Transparent padding and layout-only
bounds do not consume a doorway click; the interactive pet includes its
pointer-events-disabled art children. Pointerdown shares one current scene hit
between item mapping and free-hand pet handling. Other events and callers make
their own picks; the ordinary hit API and pet action policy are unchanged.

Retained pose reuse includes the parent's current clipping key alongside its
selector, inherited-style and motion context. Detached poses keep their nodes,
then use the existing deep restyle when reattached under changed clipping.
This refreshes geometry previously compiled against a water clip without
resetting poses or adding per-frame redraw work. A fresh shoreline observation
included wet/dry pets, retained reuse and context restyles with matching active
clip keys; the earlier pictured dry-Duck crop did not reproduce in that baseline.

Native camera, transformed bounds and surface calculations retain their
arithmetic while reusing private intermediate work. Public camera-controls and
lighting snapshots remain independent objects. Surface and water share one
fresh lighting snapshot within a synchronous presentation pass; water copies
values into its own private environment. Lighting retains selected pooled
shadow images across a paint pass and hides unused images afterward; room
transitions recreate the relevant pools. These paths preserve weather, motion,
pause, geometry, culling and update cadence.

The canonical minimap follows the actual coast and inward beach, routes, inland
water, locked-land shading and a few service markers. It shows only built piers
at their current upgraded lengths and uses the same cultivated-section footprints as
native terrain: plants and ground decor reveal soil; owned empty soil remains
lawn. Ownership, planting rules, overlays and map/camera cell coordinates are
unchanged.

NativeArt's neutral inner-render shortcut is restricted to the pinned engine,
known render-step layout and standard native-child setters. It retains child
order, transforms, camera membership and fixed versus inherited blend handling.
Unsupported contexts, steps, transforms, opacity, scroll factors, masks or
custom child behavior use the original renderer. Quality, animation and vendor
bytes stay unchanged. Invocation and fallback counters establish which path
ran; they do not measure a speed improvement. Stylesheet preparation separately
reuses the exact private compiled selector-part count for its existing
specificity formula, with the original fallback.

NativeArt can specialize the Garden renderer's existing pinned flat-triangle
handler after world creation. Graphics and FillTri still calculate styles,
gradients, current alpha and transformed positions. The specialized case uses
the existing independent `[0,1,2]` index array, a nonempty batch, the same drawing
context, unchanged lighting/alpha options and matching native methods, hooks
and buffer layout. It writes the same positions, packed tints and indices into
the existing buffers and retains the native capacity-flush boundary. Empty
batches, option changes and unsupported cases enter the original method before
mutation. Stylesheet setup remains separate; per-object eligibility scans and
submission adapters are no longer needed. Renderer-private activity snapshots
count actual specialized triangles and do not measure display frame rate.

Ordinary observations exercised this path during walking, Map/Fit/Follow,
wheel zoom, encrypted paired shore visits, natural fishing reels, pet actions
and room visits without captured app errors. Cellar reels and captions were
observed together at both viewport sizes, with exposed controls and retained
geometry on peer departure. Fresh full-opening and early-Escape/loading-resize
routes reached a visible Garden and continued through movement and zoom.
These observations and CPU samples do not establish a display-frame-rate gain.

Small, dense circle/ellipse leaves with static local paint and supported literal
radial gradients can use the existing bounded adaptive cache scheduler. Parent
pose and opacity remain live. Missing or insufficient captures show sharp
vectors during zoom and after parent motion changes the required quality.
Gradient contents join normal paint invalidation. Own animation, inherited
paint-opacity animation, clips and unsupported definitions exclude automatic
capture; existing ancestor caches retain ownership. Ineligible optional leaves
do not count as pending readiness work. The `radialLeaves` snapshot counts
tracked leaves, caches and vector fallback presentation, not frame rate.

Animation compilation prepares ordered nonempty track descriptors, the existing
fill predicates and paint-track presence. Frame sampling retains property and
easing order, arithmetic, animation precedence and origin/box merging while
avoiding temporary sampling closures and empty-track calls. Recompilation
rebuilds those descriptors through the existing style key. Clocks, pause,
motion guards and paint application retain their behavior. Cache visibility
rejects hidden native ancestry before its pure scene-connection walk.

Ordinary observations of leaf caching and sampling cover fresh opening/loading
resize, walking and zoom, paired shore and room fishing, rain and public pet
selection during an encrypted visit without captured app errors. Cat selection
reached both peers while native sessions continued, followed by normal petting.
Room reels and captions were observed together at both viewport sizes. Some
earlier caption phases were fading; a rainy walk did not establish puddle
contact, and one shore click selected a different pet than its preceding point
probe. Those attempts retain their qualifications. These observations cover
recorded routes; cache activity and CPU samples do not establish a frame-rate gain.

Water retains source-art reflections rather than taking scene screenshots.
Captures request Phaser's final even dimensions and can reuse one unexposed
spare per source only when dimensions and effective quality match exactly.
Active and spare buffers share the existing memory allowance, with unexposed
buffers yielding first. Source transforms and parentage are restored before
reflection images switch; a failed candidate keeps the previous visible
snapshot. Leaving the Garden releases active and spare capture ownership.
Player and peer float wakes include the contact's vertical surface tug; downward dip,
rod/line/mouth anchors, timing and shared activity state retain their behavior.

Broad room metadata changes still refresh actors, props, fishing rigs and
lights. Exact normalized geometry comparison retains water scans, intervals,
surf and the uploaded depth mask only when unchanged; shape, bounds, freeze,
parent and room changes retain full invalidation. Capture traversal reveals
externally cached originals before checking visibility, then stops at branches
that remain hidden. Ordinary internal caches retain their visible sibling tiles.
Exposed automatic radial-leaf caches instead supply their current originals
while their tiles are hidden; `finally` restores exact prior visibility,
including on failure. Ordinary internal ancestor caches still prune hidden
branches. An inactive flag alone does not prune artwork Phaser can render. Status
reports actual allocations, reuses, examined targets and stopped branches.

Repeated finite queries with at least two visible water regions may reuse one
horizontal region selection for the exact same endpoints. The selection resets
after every visible-region refresh and geometry-cache invalidation. All-pass
queries retain the existing region array; filtering allocates a private selection
only at its first rejection. Each query still clips fresh pairs at its current
height and reads current frozen flags before the existing merge/ice subtraction.
`horizontalRangeHits` records selection reuse; horizontal skip counts retain
their ordinary completed-query meaning.

Canonical-world daily callers meet at role-related public landmarks with public
fallbacks, checked against current foot clearance and a real player route.
Their existing entrance and walking path, daily selection, lifetime,
conversation, gifts and rewards remain in place. These presentation changes
preserve existing simulation, save and live-visit authority.

Ordinary isolated observations cover encrypted paired visits, placed-room
access and follow actions, natural fishing bites and reels, pet actions,
camera/Map controls, rain/puddle contact, actual-clock night lighting, caller
conversation and normal Leave. Observed reflection reuse released its buffers
on departure; an isolated peer departure retained the host's unchanged room
mask. Some caption phases and transitions remain explicitly unplayed. These
routes establish their recorded behavior, not every room, weather or catch.

Initialized walking/camera profiles and a fresh-browser startup profile provide
current-device JavaScript CPU samples. The startup trace began before
navigation and reached reported native shader/cache readiness, with a physical
Escape skipping the opening. It does not measure the opening animation. Sample
attribution, observer/CDP work and potentially warm OS/server/driver caches
limit interpretation; these are not GPU, display-frame-rate or whole-device
measurements. Earlier isolated renderer/CDP response stalls remain unexplained.
Later successful routes and resource changes do not establish their cause or
prove them fixed.

During native startup, the first world draw selects the actual shader setup.
An owned main-camera filter then skips repeated world draws while explicit
artwork and water captures, camera updates and shader preparation continue.
Before play opens, a final unfiltered draw warms the prepared view. A loading
resize or sync change refreshes preparation for that view; cleanup releases
only this preparation step's camera-filter bit.

Ordinary fresh openings covered natural completion and an early Escape, with
one actual resize before native readiness. Both reached a visible Garden and
continued through walking, wheel zoom and normal Leave without captured app
errors. Each reported two main-render opportunities and one final warm draw;
these observations establish the lifecycle, not a frame-rate or loading-time
comparison.

Phaser **4.2.1** is pinned in `vendor/phaser/` with its licence and source digest.
The build verifies and embeds the bundle. `FreefloGameEngine.load()` loads it
on demand without a runtime CDN request. Opening cinematics use their separate
compositor and do not start the garden engine.

The first garden load decodes the same embedded engine bytes using direct typed
array writes before UTF-8 decoding. This avoids per-character conversion
callbacks; it preserves the pinned source and CSP identity. The browser still
pays its initial graphics-context creation and the engine's normal preparation.

When startup opens directly onto a garden underneath the initial splash, the
native scene completes its normal shader and artwork preparation first. While
the opaque opening still covers it, Phaser scene visibility suppresses drawing
without pausing updates or multiplayer authority. A small splash observer
restores drawing at the beginning of its fade or skip and disconnects. Photo
capture can temporarily render the covered scene; teardown removes the observer.
Actual isolated startup covered normal completion and Escape before native
readiness, with a retained game session, continuing updates and a visible garden
after the opening. Wrapped cinematic captions have explicit line spacing.

## Canonical island and saved-world ownership (v3)

The current island is authored once in `assets/garden/island-v3.json`.
Its full SHA256 is `c34545b986e497d5d9df5d51378e945dbbf288fe7dee48dfbb7ef814b566c518`;
the shared layout fingerprint is `c34545b986e497d5d9df5d51`.
`lib/garden-island.mjs` loads and freezes it for Node; the build embeds the
same data. Node evaluators receive bare `GardenIslandLayout`.
`GARDEN_WORLD` remains version 3, 52 columns, 56 rows and room sentinel column 53,
with 48-by-30-pixel cells and the existing 150-pixel sky offset.

Mechanics revision 1 adds metadata for optional side-pier walk/cover behavior;
coast, all 128 section IDs and reserved locations are unchanged. The known
`94f5b2dbe4dce765cafb2b40` predecessor remains playable on 2.65. Its optional
**Garden > Menu > Update my garden** entry opens the existing deliberate update
page. Migration `101-garden-mechanics-side-piers-v1` is `auto:false`; an app
installation or normal startup does not update the saved Garden.

Garden update notifications say **Garden updated**. The submitting tab keeps
clean notifications quiet while its request and normal live reconciliation
are active; a later event may still show that plain message. Conflict dialogs
and update errors retain their normal paths.

`94-garden-0island.js` derives coast, reserved approaches, routes, section
cells and water classification from that provider. The mainland contour is the
same authority used by walking, placement and rendering. Ocean is a connected
rectangle with the mainland as a hole; the pier decks overlay that sea. Native
and Classic terrain use the same coast and separate inland pools. An 84-pixel
inland beach band leaves the water boundary unchanged. The visual ocean extends
beyond the logical map, to cell bounds (-12,-12,76,80); it does not grant access
outside the 52-by-56 world. Rows 44 through 55 are open ocean.

The northern pond and the small southwest allotment pool remain separate fresh
water. Existing inland pool sections retain water classification. All 128 land
section IDs remain, with nonempty authored allotments, existing entitlements and
existing purchase authority. Five staged entrance gates replace the old map's
repeated zone crossings; see [the map contract](GARDEN_PLAN.md#the-map).
Fishing depth/access progression remains authoritative even where the sea is
visually continuous. Locked ocean cells do not become rectangular land-mist
regions. Optional workshops and structures are not scattered across the coast.

### Optional side piers (2.65.0)

The existing lake works offer these deliberate purchases. Each extension needs
its base pier. Purchases use normal work/Undo rules; host snapshots carry owned
works.

| Work | Garden level | Coins |
| --- | ---: | ---: |
| West pier | 7 | 650 |
| Longer west pier | 10 | 900 |
| East pier | 12 | 900 |
| Longer east pier | 15 | 1200 |

The Tackle thumbnails show the shore and water ends, mirrored for west/east,
with one scale for the base and longer decks. Purchase moments reuse these
static icons; physical pier art and geometry keep their existing paths.

`gardenPierDecks(works, source)` derives the main deck plus owned optional decks
from the displayed Garden's actual mechanics tag. Walking, water/fishing
exclusions, minimap, Classic boards and native boards use those same rectangles.
Unbuilt reservations add no boards or walking floor. No stalls, lamps or other
default clutter accompany the works.

NativeWorld gives each deck its own retained child, tight bounds, adaptive
cache and camera culling record (at most three). The parent layer's union is
diagnostic only and is never cached as one wide transparent strip. Rebuild and
teardown remove each child's queue/cache/Graphics ownership together. Existing
main-pier artwork, cache scheduling and vector sharpness fallback remain.

Side-pier timber details add a shallow fascia, bevels and two water-end
supports with flush end-grain caps. Native and SVG/Classic/photo paths share
these additions. Each deck's paint bounds include the short shaft tails and
offset shadow. Main-pier paint and the walking/fishing rectangles are unchanged.

Native radial-leaf cache admission first checks the existing graphics, explicit
bounds, label/stroke and command-count exclusions. Only candidates resolve the
gradient definition and local bounds. Cache thresholds, invalidation, sharpness
and scheduling are unchanged. This removes avoidable eligibility work; no
frame-rate or measured net performance gain is claimed.

Saved Garden scene construction uses a temporary presentation context for
the cleaned snapshot's land, feature and sight positions. Synchronous scene
parts construction restores the previous land membership, placement maps and
signatures, and physical prop cache in `finally`, including cache returns and
failed/nested draws. Snapshot parts cache keys include the placement context.
Normal model scenes retain their current path; saved state, active world
physics and the native startup schedule are unchanged.

The lake notice board uses the rendered scene's day before its legacy live
fallback. This avoids a resident-model lookup that could replace borrowed
placement context before land props were drawn. Shared thumbnail signatures
also include world identity, feature/sight positions and built works.

Saved social snapshots forward the existing `lh`, `fp` and `rp` fields with
`wv`. The publisher previously dropped those fields before schema cleaning,
so a current island preview could be rejected as an older Garden and optional
feature/sight positions could be lost from its saved presentation. Existing
snapshot validation, actual-world admission and publication cadence remain.

Ordinary private two-player play on 2.65.0 bought all four works through
Tackle, walked both players to each stage's tip and cast from all four stages.
Host and visitor deck tuples agreed. Undo preserved the occupied extension,
its transaction and coins; after the visitor stepped ashore, it removed that
extension and refunded 1,200 coins. Both normal Leaves completed with no
captured errors. This was an interaction observation, not an FPS measurement.

A separate ordinary standalone update kept all five complete saved placement
records, including two already stored in the Bag. The exact pre-update backup
and resulting Garden agreed on every field outside the identity/transition
markers, and the unrelated task stayed unchanged. No side pier was built by
the update. Its earlier 94f Garden was playable before choosing the update.

### Native island finishing and route work

Empty owned soil sections use lawn paint until a plant or ground decoration
cultivates that section. Plants and ground decor retain the soil underneath;
hover, land inspection and planting guides keep the original section identity.
A sorted set of cultivated section IDs joins the native terrain cache key.
Moving, planting or removing the last object in a section can repaint terrain;
care or growth within the same sections keeps its retained terrain caches.

Village walks follow the authored route centres with rounded bends and quiet
grass shoulders. Small strips clip to each open path cell; a closed branch
stops at its own gate even where another public apron overlaps it. Their broad
physical reservations remain clear and walkable;
the square reservation mask is not itself painted as a road. Small rounded
doorway forecourts replace full-apron stone rectangles. Woodland floors use
gentler contrast. These are native presentation changes: canonical coast, map
fingerprint, water classification, collisions and earned ownership are unchanged.

NativeWater builds three clipped surf contours from actual ocean land holes
when region geometry changes. Freshwater banks and the outer world rectangle
do not generate surf. Its existing ambient update changes three retained layer
alphas using daylight and wetness; reduced motion leaves a steady appearance,
and the existing ambient pause clock remains authoritative. The contours do not
request new reflection captures or shoreline clipping on each ambient update.

Both coarse and fine A* searches use an indexed binary frontier with one live
slot per cell. Lower costs update that slot; equal costs retain insertion order.
Existing heuristics, diagonal restrictions, search limits and the fine search's
time budget remain. Movement, route sampling and creatures share one collision
snapshot during a simulation step, subject to the current grid and data revision;
boat routing keeps its separate ground-only distinction. Native updates also
reuse the same preferences during that step. This avoids repeated map revision
and preference preparation without changing movement authority.

The next reachable closed v3 gate has a taller stone arch, capped stone posts,
solid timber leaves and a latch. Native art retains its 25/31-pixel span and
side projection, with feet aligned to the actual first closed cell edge rather
than the bottom of the earlier art envelope. The gate, landmark, shadow and
reflection metadata share that anchor. Its visual bounds extend upward for the
arch. The two existing moving leaves and reduced-motion handling remain.
Classic/fallback art uses the same stone-and-timber direction. Requirements
remain in deliberate inspection, and gate access/collisions do not change.

An initial isolated ordinary flow reached four public beach stops, received the
closed level-6 gate explanation and returned Home with no captured app errors.
Viewed images exposed broad reservation paint and oversized road ends; a later
ordinary pass covered the refined south/east beaches and closed gate. The final
gate approach recorded zero offset between its canonical crossing, art anchor
and landmark foot, with the approach free and the closed row blocked. Inspection
still explained level 6, then returned Home without captured errors. A separate
ordinary preview session covered Fit, Map, Follow, held keyboard walking,
wheel zoom both ways and Leave, also without captured errors. These bounded
observations do not establish a measured framerate or every saved garden.

The waterfall's existing native scenery now uses a broader water sheet,
wet-rock recesses and ledge highlights. Three retained sheet highlights replace
three small streaks; the existing foam, spray and mist remain on the same
scenery clock, with twenty moving parts overall. Its anchor, bounds and
reduced-motion handling are unchanged.

Ordinary top-view fish have a small paired pectoral-fin joint using the existing
swim-effort animator. Pipefish and silhouettes that already have wings, plates
or plumes keep their established shape. Existing paddlefish snout geometry,
mouth contact, bite recoil, casting rules and multiplayer authority are unchanged.

The outdoor camera skips Phaser's zoom setters when both actual zoom axes
already equal the target scale, and shares one fresh preferences object between
its target and controls calculations. Photo restoration still compares the
actual camera state; interpolation and input thresholds are unchanged.

Selected reflection bands retain visibility across a normal update. Only unused
bands, unselected sources and explicit empty-snapshot/height cases are hidden.
Stationary rod and line paths reuse their numeric coordinates while the exact
path strings remain unchanged. Capture cadence, clipping and budgets are unchanged.

Closed district gate leaves initialize their constant poses once and remain
static for reflection capture. Open leaves keep their existing motion, and the
normal area signature rebuilds the gate when it opens. The old watermill remains
stopped, matching its existing story about the brook moving away.

Surface contacts index shoreline edges in vertical bands when the existing
shoreline geometry revision changes. Footstep and puddle queries use the same
edge straddle/intersection arithmetic and region/hole rules, considering only
edges that can cross the queried height. This removes repeated full mainland
loop scans without approximating the water boundary or changing effect timing.

Before the optional side-pier works, an ordinary two-player island visit with
the native finishing changes reached both piers,
accepted visitor watering and showed a cast through natural waiting, nibbling
and a bite. The rod, line and float were visible; actor, pet and fishing-rig
reflection diagnostics were active. Both players left normally with no captured
app errors. That session did not land a fish and does not establish every species
or a measured framerate.

The close waterfall walk framed its full native art and observed all twenty
retained parts changing over two samples, then left normally without captured
errors. A static gallery rendered nine actual fish families and their existing
mouth anchors; that gallery is not a catch or native-animation claim. An isolated
rainy-provider play-through walked through an existing puddle, observed contact
rings and wet tracks, reached the south/east dry beaches and returned Home without
captured errors. No weather or game state was assigned after boot in that flow.

`94-garden-1stored.js` retains a displaced plant or decoration as its complete
original record with `_packed:3`. Normal model and snapshot rows omit it while
stored. **Bag → Stored garden** starts the existing move ghost. A legal ordinary
drop changes x/y and clears that marker, preserving the UID, planting/care
history, variety, decoration rotation/style and original stored decoration
timestamp. It is a move of an owned object, not a new purchase or seed refund.

Earned structures are a separate collection. **Land → Your built structures →
Set out nearby** searches for legal clear ground and a reachable entrance.
**Put away** clears only the placement; ownership and progress remain. A crowded
space can refuse placement. Host placements travel as typed `fp` rows, while
visitors follow the host's current positions. These controls are separate from
the single optional **Play → In the garden** workshop selection.

Outdoor feet are stored under a version-and-fingerprint position key. A legacy
point is accepted or relocated through the current coast, solid and access
rules before it becomes a v3 position; the exact legacy key stays intact.
Room-sentinel coordinates and visiting positions are not saved as home feet.
Saved and live visits require the same actual world version and layout tag.
The app advertises `GL_V=5`; c345 sessions use protocol 5 and known 94f sessions
use 4. Exact tag equality still gates entry, snapshots and spatial actions.
See [shared-world agreement](GARDEN_TOGETHER.md#canonical-island-agreement-v3).

Earlier Designer layouts remain complete atomic archives. **Designer → Layouts
→ Earlier layouts → Adapt to this island** opens a working copy: safe paths and
ground can project, while earlier moved/made objects use deliberate placement
ghosts. **Keep my changes** commits the draft; **Cancel** leaves the saved layout
alone. The full original archive remains, including entries that do not fit.
Earned structures use the Land controls instead of old coordinate overrides.

Same-user synchronization uses strict world provenance and an internal atomic
`@xy` move register while retaining ordinary x/y and independent care fields in
saved rows. Local Update, legacy-write preservation and the recovery boundaries
are mapped in [MODULES](../../MODULES.md#garden-island-and-recovery-world-v3).
The current manual 101 migration reuses migration 100's planner/commit and the
deliberate **Update my garden** action; migration 100 also remains nonautomatic.
Multi-device histories use the explicit creator-selected handover below;
unverified or incomplete histories cannot be independently restamped. Incompatible
full Garden saves are archived before acknowledgement; their download is not
an automatic import or whole-state restore.

Recorded isolated ordinary play covered an encrypted v3 visit, accepted visitor
watering, and an aged plant/rotated decoration restored through Bag and normal
move controls with their nonplacement fields retained. A separate recovery
flow covered structure Set out / Put away / Undo and two complete earlier
Designer archives: an accepted original sign ghost retained its text/colours,
Keep saved the adaptation, and Cancel left the saved layout/archive unchanged.

Two genuinely paired encrypted devices also completed one concurrent physical
flower move and watering. Both reached the same complete coordinates and care,
retained age/variant, and survived normal reload/leave. The incremental sealed
payload retains `gw`; the virtual `@xy` key does not enter dashboard rows.

A modest level-3 coastal flow reached four public beach stops and explained the
closed level-6 gate. A later actual autumn-night Classic Photo flow saved a
1600-by-1173 JPEG through normal Keep in Memories and returned Home, with no
recorded app errors. Its viewed image includes woodland and no longer shows
the earlier horizontal sea edges; the hour wash/ocean grade are continuous.
This does not establish dawn/dusk transitions, native capture parity or all-GPU
rendering behavior.

Ordinary Stored garden browsing covered 25 complete records: 24 items, Next to
one, Previous to 24, then Next and restoration of the rotated second-page bench.
Its nonplacement metadata and all other records remained intact; the resulting
24-item list needed no pager. The original observer's two ASCII range flags
were false against actual en-dash labels **1–24 of 25** / **25–25 of 25**;
read-only labels and inspected images establish the ranges, not a source failure.

A physical **Update my garden** produced the canonical fingerprint with a
full-folder backup plus exact pre-update state/Garden/receipt copies. A genuine
older document's incompatible full save archived its exact incoming Garden and
provenance; repeating that same input reused the immutable archive unchanged.
The preserved copy was downloaded through the actual Backups control, with
browser completion and bytes matching the immutable archive. The current app
recorded no errors; the authentic earlier document reported one ResizeObserver
notification. Current-client canonical-component ACK refresh did not arise
naturally and remains unplayed.
The normal migration CLI also preserved every full record and other app state
in a separate backed-up fixture; a second run left state bytes/version unchanged.
No real-data migration, complete historical-save coverage, all-gate progression,
universal reflection result or frame-rate improvement is claimed. Earlier v2
evidence below retains only its recorded scope.

### One island across the owner's computers

This is same-user encrypted sync, separate from a live friend visit. Before the
first canonical commit, the engine requires the unique current authenticated
group member with `via:created`, a fresh complete pass and matching
`island:{v:1,wv,lh}` capability from every other current member’s encrypted
device document. Plain app versions and presence are insufficient. A genuinely
earlier server cannot safely ingest the new world marker, so it must be updated
before that first commit. Unknown origin, unreadable history, incomplete changes
or another layout keep the original Gardens unchanged.

The creator retains an exact immutable first snapshot and retry record for
each generation. Generation 2 uses encrypted
`garden/island-handover-mechanics1.json`, with previous Garden identity/hash;
the generation 1 `garden/island-handover.json` remains unchanged. Bounded parts,
authenticated creator-written registers, complete baseline and Node SHA/content
checks still precede admission. A partial file is not a usable island.

Another computer explicitly chooses **Use updated island**. Full-folder and
exact state/Garden backups and an immutable earlier-Garden component precede
the Garden-only commit; unrelated app state stays intact. If this predecessor
has changes outside the shared Garden, **Review shared Garden** offers
**Use shared Garden and keep earlier copy** or **Keep earlier Garden**. The
choice pins the reviewed earlier/shared/handover hashes and is rechecked during
commit. A complete earlier copy goes to **Settings > Data > Preserved Garden
copies** before replacement; the two Gardens are not merged. The engine projects
currently held matching canonical registers onto the complete first snapshot,
retaining their original HLCs and ordinary care/deletion/coordinate rules.
It does not publish the older snapshot as a new full local edit, which would
otherwise overwrite changes made later on the original computer.

`prepareImport` saves a private baseline intent before the state commit.
`finishImport` adopts that original-register baseline and atomically saves an
applied ticket in sync metadata. If interrupted after state commit, the next
ordinary sync mutation matches the journal to the committed world and
`seen['world3.mechanics1.handoverId']` for generation 2 before capture (generation 1
retains `world3.handoverId`). An uncommitted legacy intent
is discarded, and an already applied ticket never reapplies an older baseline.
The first snapshot and pending publication retry never recapture a later
Garden, and a computer already current for that generation does not import it
again.

Before migration, real world2 local changes continue through their ordinary
untagged split-axis format instead of being dropped by the new server. After
migration, the strict layout tag and atomic `@xy` format apply. Historical
incompatible registers remain preserved and keep a qualified attention state:
matching island changes and other dashboard changes can still sync. No history
is discarded merely to display Up to date.

An earlier paired two-device flow for the initial v3 handover completed creator
Update, encrypted transfer
and deliberate import with the exact earlier Garden archived. Watering performed
after publication but before import survived; subsequent movement and watering
converged, retained original age/variant, and survived reload/Leave with no app
errors. The first run exposed a completed-join guard error, corrected before
the successful rerun. Crash recovery, all-history, all-race and performance
claims remain outside this observation.

## Ownership

| Module | Responsibility |
| --- | --- |
| `assets/garden/island-v3.json`, `lib/garden-island.mjs`, `94-garden-0island.js`, `94-garden-0shore.js` | One frozen island contract, shared coast/water topology and physical reservations. |
| `94-garden-1stored.js` | Full-record stored-item recovery and deliberate earned-structure placement. |
| `94-garden-0pacing.js` | Existing-level activity availability, one owner-selected world setup, shelving and optional shared selection. |
| `94-garden-native-runtime.js` | Scene lifecycle, input, shared clock, gameplay integration, room transitions and photo capture. |
| `94-garden-native-world.js` | Model-driven outdoor composition, numeric movement/collision, camera projection, picking, culling and depth. |
| `94-garden-native-art.js` | Authored vector parsing, retained native components, numeric animation, text resolution and disposable GPU caches. |
| `94-garden-2art.js`, `94-garden-art-0core.js` | Deterministic authored artwork, definition identities and the optional native plant health joint. |
| `94-garden-native-actions.js` | Bounded, world-space tool feedback, wet soil and authored net sweeps on the scene update clock. |
| `94-garden-native-light.js` | Daylight, shadows, point lights, wind, clouds, precipitation and ambient effects. |
| `94-garden-native-water.js` | Water surfaces, shoreline clipping, source-art reflections, wakes, rain impacts and fishing splashes. |
| `94-garden-native-water-depth.js` | A revision-cached liquid/depth mask and one GPU shading plane. |
| `94-garden-native-reflections.js` | Retained rod, line, rod-skin and float reflection vectors. |
| `94-garden-native-scenery.js` | Ground-anchored landmark and gate artwork with retained animated parts. |
| `94-garden-native-frontier.js` | A static locked-land texture mask and one drifting mist shader. |
| `94-garden-native-surface.js` | Shared puddles, foot contacts, seasonal tracks and small ground effects. |
| `94-garden-native-rooms.js` | Native room scenery, actors, indoor activities and room input. |
| `94-garden-life-2shelter.js` | Authoritative rain-refuge routes, canopy occupancy and cached mature-habitat attraction factors. |
| `94-garden-wonder-b-listening.js` | Carved listening posts, visual/audio phrase clues, retained wind harp and owner discovery state. |
| `94-garden-wonder-c-kite.js` | Shore reel, accepted line membership, articulated kite, tethers and guarded free-hand feedback. |
| `94-garden-0camera.js` | Optional local activity subjects and player-inclusive framing; no movement or multiplayer authority. |
| `94-garden-world-2hud.js`, `94-gardenzz-ui.css` | Compact persistent controls with map/status/view/menu details on demand; HUD key ownership before native movement capture. |
| `94-garden-wonder-d-leafboats.js` | Shore yard, host-simulated leaf boats, course gates, bounded steering and shared water actors. |
| `94-garden-wonder-e-bubbles.js` | Hand-held soap films, steady stretch, participant consent and one wind-carried giant bubble. |
| `97-pets-7routines.js`, `97-pets-tricks-0environment.js` | Voluntary and invited puddle routes, four species endpoints, contact rings and remote endpoint presentation. |
| `94-garden-wonder-f-marble.js` | Host-owned rolling marble, curved rails, physical forks, branch bells and a finishing cup. |
| `94-garden-wonder-g-shadows.js` | Point-light silhouette projection, movable lantern/cutouts, visible fitting clues and saved courtyard restoration. |
| `97-pets-7guides.js`, `97-pets-tricks-0guides.js` | Player-requested environmental routes, waiting/look-back behavior and species observation endpoints. |

The HUD capture path owns Bag number keys/Q and a connected Moves wheel's
Escape/Q before native movement input. It reuses the native event deduplication
and existing tool dispatch. Closing the Bag cancels an active carry first;
keyboard slot selection intentionally bypasses only the post-drag pointer-click
guard. Moves restores its opener on keyboard/selection close, and outside
pointer dismissal leaves the clicked control's focus alone. These changes add
no frame work, timers or network messages.

Routine Play refreshes keep the connected pager and same-game card roots while
the group and eligible ID list are unchanged. Changed status content/classes
patch those buttons; changed header content leaves the pager connected. Actual
group/list/page changes retain normal pager behavior. The popup refresh path
lets Play reconcile its own content instead of first clearing it. Existing
onclick dispatch, escaping, pacing and selected status remain unchanged.

Single normal press/hold/release observations before and after this retention
change both opened Photo mode and saved its opened marker, with no application
errors. Neither bounded hold encountered a natural repaint, so those runs
establish stability at rest rather than a reproduced replacement race. The
earlier missed Photo click remains causally unproved; its first card's gold
outline was freshness styling, not recorded keyboard focus.

A later encrypted host/visitor observation supplied an actual incoming update:
the visitor physically watered an existing thirsty flower while the host held
the Photo card. The authoritative timestamp and visitor-attributed diary entry
confirmed acceptance, and the host's native repaint count advanced. Its same
connected button and onclick survived with no held pointer move or button
replacement. One release opened Photo mode and saved its marker; both clients
left normally without reported errors. This verifies that concurrent scenario,
while leaving the earlier missed click's exact cause unproved.

Native hover feedback records the numeric camera projection after a physical
pointer move. Accumulated movement beyond one eighth of a screen pixel clears
the old label, highlight, card and unowned hover cursor once. Resting projection
noise leaves fresh feedback intact; the frame path compares scalars only while
armed. Native canvas pointerleave, blur, room transitions and teardown also
retire transient hover. Selected bubbles, placement ghosts and active actions
retain their existing owners. Classic pointer handling is unchanged.

The separate world-tip owner accepts only actual stage targets before its
pointer throttle. Controls no longer project through to habitats beneath the
HUD. Stage leave and native hover cleanup hide only this transient card;
fishing hold/reel messages and selected room guidance keep their own owners.
The outdoor owner also rejects both room contexts before interpreting points.
Its measured card chooses above the pointer when placing below would cross the
viewport or a horizontally overlapping, visible direct-child hotbar. Placement
uses the existing throttled pointer path and adds no observers or frame work.

One ordinary isolated London-day route hovered the actual lily-pad habitat,
then the Water control, left the stage and walked away through Map. The card
appeared over the habitat and retired on each exit. A single normal cast kept
its separate fish-owned waiting message while the transient card stayed hidden;
Escape, Leave and Life return completed with no captured errors. The Map leg
combines a UI exit with camera movement, rather than isolating camera cleanup.
The separate multiplayer second-line invitation branch was not played here.

A later ordinary visit used one physically picked built-windmill door. Its
intro gave way to the naturally delayed how text, which survived mechanism and
Leave-control hovers. An exposed upper-left room pointer did not create outdoor
habitat help. The actual Frontier shader was hidden indoors, visible after
normal exit and retired on garden Leave; Life return created a new outdoor
owner. Inspected images also show the outdoor habitat card above the hotbar.
No puzzle was activated or solved, and no application errors were captured.

Frontier reads a retained world-owned view of the actual locked-region array
and terrain revision. The revision advances on the existing terrain rebuild.
Its old full-effects fallback remains available. Actor sampling is already
memoized once per frame; this narrower accessor avoids the unused wrapper and
conditional held-reflection concatenation rather than repeated actor scans.
The full effects view also reuses its exact water predicate for the lifetime
of the world, reading the same live regions. These are allocation changes,
with no measured frame-rate claim.

Lighting also writes the six computed shadow overrides directly into its
existing source-keyed cast record. It keeps the actor-field copy and evaluates
the exact position/size expressions before that copy, in their original order.
This removes one temporary override object per eligible actor update; shadow
geometry, visibility, pools and simulation timing keep their existing rules.

The same ordinary physical route and bench hover reproduced stale feedback in
the prior build after both stationary-pointer wheel zoom and pointerleave.
The updated build cleared the label, highlight and cursor in both cases; raw
input counts confirmed that zoom had no intervening pointer move. A fresh
physical hover showed the label again, and inspected images confirmed the
result without reported application errors. Active action and selected-bubble
preservation, room/blur transitions and Classic remain source-only in this
focused observation.

Companion menus retain the identity of their actual pat response for its short
natural lifetime. Passive roaming yields while that response still owns its
callback or clip. Only an explicit guide invitation reserves the later
stationary settle, through the existing busy countdown and guide validation;
foreign activity and scene/context changes still retire it.

Requested companion discoveries use the existing pet movement and busy clock:
short real route legs, a look-back wait, the person's reachable observation
stand and one species endpoint. The owl's final supported perch is separate
from the person's ground route. The optional local guide camera subject has
priority 15; it includes actual pet lift and a nearby interest without changing
movement or saved zoom. See [Companion guided discoveries](GARDEN_COMPANION_GUIDES.md)
for route ownership, lifecycle and exact-request cancellation contracts.
Separate rendered encrypted observations completed the otter, owl, rabbit and
fox discovery loops, with actual paired endpoint clips. The otter run also
exercised the local guide camera. A focused fox-pack observation retired an
active endpoint through
physical Escape and the matching exact-request stop on the copy. These are
separate local pair runs, not every season, renderer, motion preference or
public-relay condition.

The marble workshop retains one rail machine and its physical fork, bridge,
crank and recovery handles. Host-owned curve progress drives bell contact and
cup results; visitors draw bounded accepted progress. Placement checks projected
course and handle clearance as well as dry reachable approaches, with stable
layout caching. Its authored footprint is independent of world collision and
normal depth. See [The marble workshop](GARDEN_MARBLE_WORKSHOP.md) for the source,
pause and placement contracts. The repaired layout completed physical solo and
encrypted shared routes, recovery, pause, room transitions and fresh remount
without application errors. Its help camera kept the projected board above the
actual panel using the measured inset. A missed reset in an intermediate helper
run was resolved by waiting for camera settling and observing each accepted
handle outcome; no production reset change was needed.

Interaction hints retain the current hovered sprite reference. That sprite's
ordinary frame can update its label, and removal or culling clears the status
and cursor without another pointer movement. Other sprites take a cheap identity
check; the world is not picked again every frame. A physical solo soap-film
observation reproduced the old stale ready label, then verified a live ready
label and removal cleanup with a stationary pointer after the repair.

The courtyard of borrowed shadows has its own small point-light mechanism in
`94-garden-wonder-g-shadows.js`. A lantern moves along a side rail and changes
height; three raised cutouts slide and turn on separate notched rails. Their
ground projections use `q = L + H / (H - z) * (p - L)`, so moving or raising the
same flame changes each silhouette according to that cutout's actual height.
A calibration ring teaches the light controls before the player fits a heron,
crescent and reeds to engraved contours. Position, size and turning feedback
are readable in the ordinary world panels. The lantern supplies the puzzle's
own light, with no real-time or weather wait and no global lighting rewrite.

The floor, rays, rails, cutouts and silhouettes retain their native nodes.
Arrangement changes patch their transforms; unchanged frames reuse the same
projection. Restoration preserves the finished tableau and adds gentle motion
on the existing wonder clock. Hidden views, rooms and local pauses hold that
presentation; reduced motion retains a still finished scene. The local courtyard
panel declares a priority-35 activity-camera envelope without changing saved
walking zoom. This is a complete authored courtyard puzzle; the catalogue's
larger architectural-shadow and walkable-pattern concept remains a candidate.

Wonder saves now mark pending local gameplay changes and use the normal short
server-save scheduler, while retaining `saveUI()` for the browser copy and no
app Undo step. Previously `_wdSave()` only scheduled the slow UI save, so
ordinary UI activity could keep a new arrangement out of the saved file beyond
the gameplay save interval. The repair uses the existing persistence and merge
path rather than a separate writer. A rendered synthetic encrypted pair saved
and remounted a partial courtyard, then restored, saved and remounted its final
arrangement. The same run exercised the actual visible fitting clues, visitor
inspection and local theatre play, animation, pause and reduced motion without
reported application errors. Broader device and renderer coverage remains open.

Rain refuges run inside existing authoritative Life behavior. Eligible small
birds choose lower sheltered branches; mammals follow free dry routes to tree
roots or flanks. Canopy geometry is indexed and fingerprinted across model
updates, winter searches use evergreen forms, and occupied shelter points are
kept apart. Fear, leaving, normal lifetimes and cleared weather retain priority.
The same existing creature messages carry positions, clips and perch height to
visitors; no shelter-specific stream is added.

The catalogue's `attracts` metadata also contributes to ordinary Life odds for
established nearby habitat. A distinct mature matching plant type adds 0.5 to
the factor, bounded at 2.5; duplicate copies of one plant type do not stack.
Tree stages start contributing at 3 and other plants at 4. Eligibility, rarity,
spawn caps and quiet intervals still apply. Cached spatial habitat lookup serves
the director's species batch rather than scanning every plant for every creature.

An initial bounded rainy visit produced only a snail and did not prove refuge
behavior. A later rendered encrypted pair used the existing Birdsong lesson:
the player copied visible note flashes, learned the bird-call tune and played
it through ordinary controls. The called blackbird sheltered under a tree on
the host, and the visitor received its actual resting clip and lower perch.
Refreshing the host's declared provider fixture to clear weather released the
refuge and propagated flight while retaining both creature and body identities.
This proves that authored attraction path for one bird, not arrival probabilities
or every species, canopy edit, motion preference or public-relay condition.

Existing garden rules remain authoritative for progression, purchases,
inventory, collisions, fishing, pets and multiplayer. Do not introduce a second
wallet, physics simulation or network authority inside the scene. The native
world uses the existing numeric path and collision helpers. Its procedural
terrain and default village facades preserve canonical footprints; owned items
and customised building appearances still come from their saved model.

The main lake's `gardenLakeGeometry(model)` is the common continuous shoreline.
Its cached polygon is expressed in garden cells; the native world projects it
to stage pixels. Cell-centre water rules, exact float/swimming points and visual
clipping share this shape. Saved occupied water footprints extend preservation
coves, derived from the current home or visit model, without rewriting data.
Piers and ice remain water exclusions, including exclusions touching the shore.
`gardenOtherWaterShapes()` supplies the same continuous pond and pool contours
to physics and both renderers. Complete compact rectangular pools can use a
deterministic asymmetric superellipse within the original wet rectangle. Its
sampled polygon must retain every wet-cell centre; otherwise the old contour
is used. Irregular components, holes, cut-outs and narrow or elongated channels
keep that old contour. Generation remains inside the signature cache rebuild,
with the same shared resident and detached visitor algorithm.
Prepared cell buckets resolve ellipse clearance
and shore normals without scanning every edge at each step. Hard obstacles and
locked land keep their grid rules; water occupancy uses actual curves. Route
cells can retain a dry fractional anchor, and swept movement follows bank
tangents. Boats invert liquid clearance; grounded animals retain land rules
when their person is boating.

Locked-land polygons retain owned plot holes. The frontier mist uploads a
signed-distance field only when the locked boundary changes; animation scrolls
a small reusable noise texture across a broad, irregular fade in one shader.
The dark billows fade to zero across the inner 24 world pixels before exact
locked membership clips them. This removes a possible nonzero alpha jump at
the cell boundary; the deep fog, pale outer fringe and terrain patches keep
their existing palette and shapes.
Gates sit above the fog without changing collision
or progression. World scale comes from roofs, canopies and landmark height;
player size and saved coordinates stay stable.

An ordinary rendered walk, wheel zoom and Wide/Up photo covered the inward fog
fade and compact pond contours. The native frontier started without reported
shader errors and retained one mask build through that trip and capture. A
normal Map route reached the dry shore of the existing small pond; its close
view, Fit view and saved 1600 by 1000 JPEG were inspected. Photo Done restored
normal input, and Leave/Life returned to a new ready scene. The daylight copy
used a different actual local calendar after an overnight restart, so the
earlier image supports a silhouette comparison rather than identical lighting.
Blocked shore crossings, unseen ponds, weather changes and indoor transitions
remain unplayed in this focused flow. The fog change does not remove intended
rectangular terrain patches or establish an FPS improvement.

The native woodland substrate joins wood, dell and wild cells that already
share the same floor colour. A single global visual contour is sampled before
chunk partitioning. Small inward waves and one restrained palette blend avoid
layered contour stripes. Other surfaces paint afterward using their
existing contours. This static work follows terrain signature invalidation;
canonical land cells, exact locked masks, water geometry, chunk/cache policy
and shoreline contour generation remain unchanged.

The ordinary Wide/Up photo, Fit view and existing pond-shore approach were
repeated for this terrain treatment. A first layered draft looked banded in
the saved image and was replaced before installation. The simpler single-floor
version completed the same walk, wheels, photo restoration and Leave/Life flow
without reported application errors; its saved JPEG, Fit and close shore images
were inspected. The observed frontier retained one mask build during the trip.
This is a visual refinement, not a new performance or all-season claim.

Retained crown polygons also supply local player occlusion. Only a front-layer
crown covering the head or torso fades; trunks and tree-root alpha stay intact.
The original crown alpha is restored when coverage ends or the world closes.

Tool effects use the same event outcomes as ordinary gardening. A small native
pool draws descending water, soil contact and semantic plant/harvest effects;
these never spend items or award progress. Wet patches share the light texture.
Room transitions clear their previous parent, ambient pauses hold their ages,
and reduced motion suppresses airborne particles and net sweeps.
Home watering feedback compares raw saved water stamps. A visitor uses the
existing successful operation reply to queue visual feedback for the current
host; neither path adds network fields or awards progress. Initial models and
re-entry establish quiet baselines instead of replaying previous actions.

Pet locomotion lives in `97-pets-7motion.js`. Distance drives the species stride;
the final joint pass runs after the native ambient pass, while authored tricks
keep control of their own poses. Numeric ground/altitude metadata feeds shadows
and surface contacts. Puddles and seasonal tracks are presentation only; they
never mint rewards or create another multiplayer simulation.

Curved shoreline edges use a prepared spatial index for short wave/ring segments.
Water depth is a soft cached mask with a numeric depth channel, shaded by one
quad; it does not replay a large gradient-triangle drawing each frame. The mask
is rebuilt on water/room revisions and counted inside the existing water cache.
Reflection and depth-spot strips stop their three-sample shoreline intersection
once its result is empty. Surviving strips retain the exact original samples
and painting. `water.intervalCache.emptyBandQueriesSkipped` counts skipped
sample calls, independently of region query, cache, frame or timing counts.

A single ordinary cast reached natural waiting, nibbling, bite and reel states.
The rod, line and float were visible, a rig and pet reflection drew, and water
capture errors stayed at zero through Escape and a real saved photo. The new
skip counter advanced during that opportunity. Wait/reel images and the saved
JPEG were inspected; Leave/Life returned normally. The brief reel did not land
a fish, and the actor body did not produce a drawn reflection in that geometry.
Those are opportunity limits; the counter establishes skipped calculations,
without a frame-rate or timing claim.

Normalized water regions also prepare conservative horizontal extents from
their outer polygon and every ellipse. Polygon extents include the existing
interpolation's endpoint evaluations, preserving floating crossings just past
a vertex extremum. Disjoint finite query slices skip the region before exact-y
cache lookup; uncertain extents or arguments retain the old path. Holes still
subtract water, and frozen merge/subtraction and interval ownership are
unchanged. `water.intervalCache.horizontalRegionsSkipped` counts those region
lookups avoided; it is separate from the empty-band sample counter.

Ice scratch storage is allocated only for the first positive frozen interval
in a liquid-only query. Ordinary queries still return fresh clipped arrays;
no shared empty-array contract changes. When ice exists, union and subtraction
run in their original order. With no ice, the unused empty union/subtraction
is skipped. This changes temporary allocation, not shore or frozen geometry.

The ordinary fishing/photo flow was repeated with lazy scratch allocation:
natural wait, nibble, bite and reel, visible rod/line/float, drawn rig/pet
reflections, saved JPEG, normal Escape and Leave/Life remained observed, with
zero capture errors and no reported application errors. Reel and saved-photo
images were inspected. No landing or named sturgeon/paddlefish occurrence was
observed in that run; frozen-water execution remains source-only here. These
results do not measure frame rate or allocation timing.

The horizontal rejection counter advanced in another single ordinary cast and
photo flow. Natural nibble, bite and reel states, visible rod/line/float, drawn
rig and pet reflections, Escape cleanup and Leave/Life all remained observed;
capture errors stayed at zero. Reel and saved-photo images were inspected.
No landing occurred in the brief opportunity, and no actor-body reflection was
drawn in that geometry. Skipped-region counts describe avoided lookups rather
than an FPS or elapsed-time comparison with the earlier run.

## Native components and one clock

Dragonfly artwork groups its existing static body primitives in an identity
`gcp-df-body` node, alongside the original moving wing group. Existing actor
enrollment can then cache that static branch through the normal four-shape
threshold while retaining wing transforms and outer opacity. No new cache
hook, authored primitive, random draw, motion or gameplay policy is added.
Earlier off-camera vector counts did not establish an in-view cache failure;
this change addresses the source topology of the static branch.

`freeflo-natural-dragonfly32-1793916925480` approached an existing common
darter through normal Map movement in actual clear Honolulu daytime. Its
static body used one 8,512-byte capture, hiding 14 original Graphics with
1,212 command-buffer entries. The separate wing branch retained its own
capture and live shimmer: local scale and opacity progressed numerically.
Physical hover reached the actual picking target. Leave retired the bug and
remembered tiles; Life/Garden recreated the same natural key with new nodes
and continuing wing motion. No errors or incomplete observations were
captured. Both the approach and body/wing observation images were inspected.
This covers one natural species and motion policy, not every variant,
renderer, season or multiplayer condition, and establishes no FPS gain.

Fresh plant-need rings enroll individually in the shared adaptive cache after
their marks are attached and ordered; badge siblings retain their existing
native/calm animation policy. The rings use normal cache budget, zoom quality
and node cleanup, with no added artwork, timers, gameplay or network state.
NativeWorld owns them in a keyed ground layer at depth -9260, below piers and
facades. The existing filtered HUD list reconciles that layer on its normal
refresh/movement path; only the nearest badges remain in the actor annotation
layer. Stable need-state and geometry retain ring caches through badge changes.
Current-root and renderer-mode dependencies handle startup and switching;
membership or position changes invalidate the existing viewport memo. Room
visibility and world destruction own the layer's lifetime. Native photo capture
explicitly hides and restores this ground owner alongside the existing HUD.
Classic keeps its original SVG path.

`freeflo-ground-rings-photo33-1793917974100` used normal front-bed Map
movement, wheel zoom, Water/Hand choices, Photo mode and Leave/Life return.
Twelve unique ground rings retained their geometry, materials, nodes and
caches across UI refresh and movement; the actor annotations contained no
duplicate rings. The ground layer reported depth -9260 below object facades,
and the opaque-roof image was inspected. A normal Wide/Up capture saved one
1600 by 1000 JPEG (177,922 bytes), with matching GET/disk bytes. Passive render
observations recorded the ground layer, badges and UI hidden during that
capture; the saved image was inspected without those markers. Done restored
the same ring nodes and ordinary walking/camera, and Leave retired old nodes
and tiles before a distinct remount. No errors were captured. Room entry/exit
and Classic rendering remain unplayed in this focused flow; ordinary discovery
and photo rewards were allowed rather than mislabeled as progress changes.

Stepping stones already use the static actor-part cache when visible;
off-camera raw vector counts alone do not establish missing cache enrollment.

`freeflo-static-owners31-opportunity-1793916569676` used normal Map walking,
held movement, wheel zoom and Leave/Life return in actual clear Honolulu day.
All twelve visible rings held native captures, leaving their 3,984 original
command-buffer entries ineligible for the main camera; materials, opacity and
unchanged mark identities were retained. Badges remained separate with their
existing still native policy. Old rings and tiles retired on Leave; new marks
remounted outside the camera and correctly deferred capture. Existing stone
caching was also observed when the normal trip brought it into view. The
image was inspected and no application errors were captured. A literal
unchanged-progress field was false: the trip crossed the existing hidden-glade
discovery and added its normal once-only 4-coin/3-XP receipt. Plants,
decorations, water state and all other ledger entries were unchanged. Counts
describe rendering representation, not frame rate; no dawn/dusk transition is
established by this daytime flow.

Short action-feedback bursts use a lazy Image pool bounded by the existing
180-particle limit. The pool shares the weather atlas's snow-disc frame with
padding compensation; it adds no atlas or particles. Existing producers still
emit ten water particles or eighteen for other feedback, trim the oldest at
the same cap, and retain their random draws, physics, colors and lifetimes.
Image submission follows the original newest-to-oldest overlap order. Surplus
glyphs hide as particles expire, room reset hides the current glyphs, and
lighting teardown destroys the owned pool. Reduced-motion clearing and frozen
poses keep their existing update behavior.

`freeflo-watering-bursts30-1793914684723` used two normal physical waterings
of declared dry flowers at actual clear Honolulu daytime. Both accepted water
events advanced their saved water times and showed ten live Image particles
with the existing water tint, disc frame, sizes, numeric motion and fade. Both
bursts expired naturally, and the second reused the same ten-image pool.
Leave retired those images; Life/Garden returned in a distinct native session
without a stale burst. Inventory and coins were unchanged, no errors were
captured, and the live watering image was inspected. This flow covers solo
water feedback; other kinds, cap pressure, reduced motion and room transitions
remain source-only here. No effect was injected and no FPS gain is claimed.

Fireflies, pollen and autumn motes retain eighteen native Image glyphs rather
than rebuilding and replaying their tiny vector shapes each frame. Their
original fleck identities, predicates, world sizes, colors, alpha, pollen land
check and leaf flutter use the same ambient clock. Firefly halos remain
separate. Circles share the existing snow-disc frame; a third 64 by 64 frame
preserves the original 32-point autumn ellipse in the same weather atlas.
Existing rain/snow frames keep their coordinates and artwork. The atlas grows
by 16 KiB to 192 by 64 (48 KiB base RGBA); room entry hides all glyphs and the
existing lighting teardown owns their container and texture.

`freeflo-daylight-leaves29-1793914243930` used actual clear autumn daytime in
Honolulu with normal walking, wheel zoom, Fit and Leave/Life return. It found
all eighteen retained glyphs and the live 192 by 64 atlas with the original
snow/rain slots and the new leaf frame at x=128. Visible leaf glyphs retained
their tan tint and 0.2 alpha while their position and squash progressed.
Leave retired all old glyph images; return created distinct images and atlas
with continuing leaf motion. No errors or incomplete observations were
captured, and the close-zoom image was inspected. This autumn flow does not
establish runtime firefly/pollen behavior, a rain/snow transition or an FPS gain.

The six drifting sky clouds retain twelve native Image lobes, keeping their
separate alpha overlap and the original 32-point ellipse contour. One shared
3072 by 512 mask uses 6 MiB of base RGBA pixels, capped by the device texture
limit (2048 by 512 uses 4 MiB). This replaces repeated ellipse command creation
and Graphics replay; the original six/thirty-frame pose cadence, cloud shadows
and ambient clock remain. Numeric camera visibility updates on the existing
scene tick. Rooms and snow hide the lobes; leaving destroys the owned images
and mask. This is raster artwork: unusually high physical zoom or a smaller
device texture limit can soften its edge. No frame-rate benefit is established
from the representation change alone.

`freeflo-daylight-clouds28-1793914053646` used actual clear Honolulu daytime.
Normal Map walking, wheel zoom in/out and Fit exposed the sky. The scene
reported six clouds, twelve Image lobes, one 3072 by 512 capture and six visible
lobes; their world positions progressed on the ordinary clock. Leave retired
all old cloud images, and Life/Garden remounted distinct images with continuing
motion. All recorded observations completed without captured errors, and the
Fit image was visually inspected. This flow does not establish a speed gain,
hardware fallback, snow/room transition or a photo export.

Native village panes use an authoritative dusk/night material flag. Only the
window-bearing village signatures include it, so cached panes and their water
captures change together. Outdoor night PointLights render above the cool
night grade with transmission compensation and a small warm accent. Existing
shop/tackle sources move to the window span at night; their count is unchanged.
Day/dawn material, source and grade values, indoor presentation and custom
light colors retain their prior branches.

Windmill, shepherd hut and old mill panes retain their original glass nodes
and day fills. Their native handles patch only those fills when the same
authoritative dusk/night flag changes, preserving moving-part clocks and
handle identity. A separate pane material key invalidates water captures
without changing the structural signature. The ruined chapel remains unlit;
this adds no lights, geometry, timers or network state.

`freeflo-night-scenery27-approach-1793913739117` walked normally beside a
declared owned windmill at actual London night. All four tagged panes were
warm, with pane material keys on the affected reflection rows and unchanged
keys elsewhere. Physical Water/Hand choices advanced full native syncs from
4 to 6 while retaining the windmill handle, root, glass and sail nodes; sail
transforms continued changing afterward. Leave retired the old scenery and
Life/Garden returned with a distinct native session and windmill. Inventory
and placed progress stayed unchanged, and no errors were captured. The image
was visually inspected. This same-night flow does not establish a day/night
transition or a windmill reflection reaching actual water; the transition's
capture invalidation remains supported by the source and published keys.

`freeflo-night-material26-1793912616850` used the actual London night clock and
normal cached clear-weather source. All three native village records reported
their warm material keys. The existing window lights used the night anchors
and radius, and eligible PointLights reported depth 80010. Normal lamp/shore
walking, shadows, eligible water reflections and Leave/Life lighting cleanup
completed without captured errors or incomplete observations. The night image
was visually inspected.

The separate `freeflo-day-material26-1793912772065` used actual full daytime in
Honolulu with its coherent cached provider. Village keys stayed day; window
sources retained the original position, radius and color. Full daylight had
no PointLight objects, so no positive daytime-light/depth opportunity is
claimed. Walking, water and lighting teardown/remount completed without
captured errors or incomplete observations, and the day image was inspected.
These are two distinct normal scenes, not an injected time transition or an
indoor/custom-color observation.

The existing slow light check also requests missing local weather after the
server probe becomes ready. It uses the normal Brief weather loader without a
forced refresh or extra timer. Connected/visible own outdoor gardens qualify;
visitors keep the host's weather and rooms do not initiate an outdoor request.
The ordinary next light check detects the provider's answer. Existing weather,
including a recorded failed answer, keeps the loader's normal behavior.

Authored SVG strings are asset descriptions: the art compiler parses them into
Phaser Graphics, Text and Containers. There is no hidden SVG document, SVG
image decoding or per-frame DOM geometry in the native scene. HTML still owns
dashboard controls, HUD panels, dialogs and accessibility labels.

`NativeNode` supplies the small legacy API surface used by gameplay:
attributes, selectors, parenting, bounds, transforms and animation. Names such
as `_gw.svg` and `_gdp.svg` refer to this native component tree while Phaser is
active. They do not refer to DOM elements. `gardenSceneElement()` routes scene
allocations to native components; Classic keeps its original SVG allocation.
Do not pass native nodes to DOM observers or browser SVG APIs.

Native style selectors compile once and use class/id/tag candidate indices.
Single-node queries stop at their first preorder match. Pet bodies compile after
their empty hierarchy joins the world, keeping retained pose inheritance and
clip keys valid when the pose returns.

Bounded CSS-match caches key only classes, IDs and attributes actually referenced
by selectors, including dependencies inside nested selector branches and actual
sibling positions. Changes to a referenced attribute, such as `data-clip` or
`data-med`, refresh the affected native animation styles.

Life bodies enter their final native ancestry with their initial class, medium,
clip and delay already assigned, so their first compilation has the full context.

Visibility inherits through native children: changing a group's visibility must
resolve descendant visibility as well, including children built while hidden.
Display remains a container-local toggle.

Removing an inline container `transform`, `rotate`, `translate`, `scale`,
`transform-origin` or `opacity` resolves that container's underlying styles.
Ancestor captures still invalidate and the container's own CSS animation is
recompiled; descendant geometry and animation phases stay intact. Life rustles
use direct retained plant and effects-layer lookups rather than scanning the
whole native tree.

Native plant art opts into `nativeHealth`: its botanical body sits inside a
`gart-health` joint, before weed and ripe adjuncts. Authored art reserves the same
flags RNG draw for healthy and thirsty poses, while its output cache includes
both health and the optional flag. Definition IDs omit thirst only in this mode.
Classic keeps its original art path, identities and layout.

The outdoor World owns health-only updates: it changes the existing joint pose,
thirst class and source signature only when the rest of the source is unchanged.
Growth, stage, ripe or weed details, pending state and position still follow the
normal drawing replacement path.

The Phaser scene update is the single rendering/simulation clock. It advances
the outdoor world or current room, existing fishing/pet/life rules, lighting,
explicit effects and native animation. The old outdoor RAF and separate room
RAFs must not run alongside it. Numeric movement uses elapsed time. Invisible
actors can keep their gameplay state while their presentation is culled.
Depth sorting runs when ordering changes rather than rediscovering DOM rows.

Native pet Still poses advance their remaining lifetime from scene deltas. Only
`data-garden-frozen` in that pet's native ancestry holds expiry; intentionally
paused pose joints, Hush and reduced motion retain normal expiry. Stop, detach
and scene shutdown remove the scheduler. Classic and missing-scene fallback
retain the existing wall timer.

Fish presentation follows the shared authoritative segment with bounded
prediction, eased headings and retained numeric joints. Native joints bypass
their CSS transform tracks, avoiding two writers for tails and fins. The same
presentation helpers serve outdoor and indoor water; host state, bites and
catch ownership remain authoritative. Ambient pauses stop the presentation
clock and position without introducing a second simulation loop.

Photo framing follows the native frame clock using a local mask/corner group
and one translation. Mask geometry changes only with the frame's dimensions;
UI and multiplayer photo messages retain their slower heartbeat.

Outdoor and indoor `effectsState()` providers expose water regions, physical
actor/scenery sources, foot positions, bounds, art identities and lights. The
outdoor regions reuse the terrain's polygon outlines and holes; indoor pools
use ellipse unions. Labels, HUD and effect banners are excluded from actor
captures. Lighting follows dynamic actors each frame while static shadows
refresh less often. Existing contact shadows suppress duplicate contacts.

Water uses the same environment as lighting. Small source-art captures are
mirrored in faded horizontal bands, clipped against polygon/ellipse scanline
intervals and distorted by the shared wind. The water capture cache is bounded
to 8 MiB, 18 retained sources and 10 visible reflections; at most one source is
captured per update. It never captures the whole game scene. Actor animation
can refresh more often than static scenery. Settled, nonanimated sources do not
recapture on a timer; animation capability is checked separately from movement.
Native fishing-depth markers use one small falloff texture under the same water
budget, with clipped bands rather than live gradient geometry. Native wavelets, rain rings, wakes
and splashes stay inside water, and frozen regions suppress liquid motion.
Reduced motion and ambient pauses preserve a quiet surface. Water layers move
back to the outdoor root before an indoor root is destroyed.
Polygon shore crossings are prepared by vertex-height band; moving reflection
strips query those edges instead of scanning the whole outline. Ambient water
highlights invalidate at their world-grid boundary rather than every subpixel
camera change, preserving the intended effect cadence during walking.

### Observed natural fishing

`freeflo-natural-fishing-baseline-20-1793900794514` followed one real visible
fish through a physical cast, wait, nibble, bite, Space strike, visible reel-bar
hold/release and natural landing. It wrote the ordinary new catch ledger row.
The float, rod and line were visible, mouth/contact motion advanced, the rig
had reflected water segments, and pet reflections and actor shadows drew.
No fish phase, actor, random choice, clock, packet or result was assigned to
produce the catch, and no errors were captured.

The player reflected from the initial bank, but its reflection had no captured
bands during this cast from the upper wooden pier. The helper had deliberately
walked to that position before casting; it was not an automatic approach defect.
`freeflo-shoreline-pier-21-1793901667448` subsequently used normal walking and
physical casts at both banks and the upper, middle and end of the pier. Player
reflections drew at both banks and the pier end; the upper/middle reflected
box missed actual water because the pier covers it. Rig reflections remained.
A farther-water click also exercised normal automatic approach and drew a
reflection when its destination reached the water edge. No collision,
reflection or approach state was changed to produce these observations.

`freeflo-fishing-presentation-21-1793901587299` reached another natural catch
and recorded settled frames at actual elapsed times near 350, 900 and 1800ms.
The native held fish/title and fully opaque HTML result were attached and
readable; the earlier faint result was an entrance-frame capture. A second real
cast followed that catch, and physical Menu/Help cancelled its fishing/rig
through the normal guide path. The first catch ledger remained intact.
These observations do not establish every species, bank, weather condition,
multiplayer catch, input method or assistive technology.

## Camera, quality and caches

Native peer-name text has a memoized label role. Its existing retained-label
pass caps only the glyph's nominal screen font size at 16 pixels, using the
owning node's effective pixel scale and excluding the child glyph's own scale.
It applies during camera easing, before deferred texture-quality work. Text
content, anchor, position, origin and logical picking bounds remain unchanged;
Classic and other labels retain their existing behavior. Static partitions
keep this presentation label separate from cached body artwork. Texture
resolution retains its existing policy. No frame-time DOM query or layout read
is added.

An ordinary encrypted pair walked through Map, then the host used one wheel-in
and one return-out gesture. The same retained name and Text objects stayed at
the nominal cap, with their authored anchor unchanged within floating-point
precision. Projected glyph bounds, inspected images and both final Leave logs
confirmed the result without captured errors. The glyph's ink/padding box can
be taller than its nominal font size. This was one normal camera route, with
no fishing or frame-rate measurement.

The sturgeon shadow's plate detail uses connected pectoral fins through the
existing `gcs-fin` motion and small contained scutes. Its base body, length,
mouth joint, tail, global opacity, variant wrappers and above-water fin remain
the existing ones. Other fish families and fishing authority are unchanged.

A static source-native comparison used the actual catalogue functions at the
recorded large sturgeon size and a smaller authored size, with enlarged detail.
It retained complete tail, fin and mouth markup; the rendered sheet was
inspected. A separate ordinary fishing run reached reel and Escape without
application errors, but later Photo entry stayed in Play and the observation
timed out. That failure is retained separately; the run does not establish a
saved photo or a naturally observed sturgeon animation after this artwork
change. The static comparison does not prove motion or a recorded variant.

The shared sturgeon/paddle long-tail path uses softly curved lobes and a shallow
fork, retaining the old root endpoints, rear reach, single path and `gcs-tail`
pivot/motion. Its neutral control points stay within the existing body height.
A separate real-source static sheet compared both affected catalogue families
with the accepted sturgeon fins already present; it was rendered and inspected.
It establishes neutral artwork, not a natural paddlefish occurrence or newly
verified animation bounds under joint rotation.

The paddlefish bill is one continuous rounded path overlapping the head,
replacing the tangential oval. Its forward and lateral extent, mouth position,
body and the shared tail joint stay unchanged. A real-source static comparison
at two labelled catalogue sizes was rendered and inspected; no natural
paddlefish occurrence or new animation behavior is claimed by that sheet.

The island stepping-stone road computes one local cull box while emitting its
existing ellipse artwork. Only that sprite uses the full box with the existing
168-world-pixel logical preparation margin, against the current and goal views.
Its island producers preserve unrelated classes, including the cull owner's
`gart-off`, rather than replacing the whole class list. Explicit native capture
and restoration prepare logical visibility against their actual camera view;
an unplaced canonical road also receives its normal transform and depth there.
Other sprites retain their existing point policy. The separate 16-world-pixel
main-camera guard and its filter-bit ownership remain unchanged.

A focused rendered walk and two wheel steps observed partial road visibility
with its anchor beyond the old point margin, preparation-only visibility and
fully outside preparation states. The canonical off flag and actual cull class
agreed throughout the passive render observations. A normal Wide/Up photo saved
the same previously offscreen road in a 1600 by 1000 JPEG; Done restored its
normal camera exclusion. Leave and Life return retired and recreated scene
nodes without reported application errors. The saved JPEG was inspected.
Direct cold capture before any normal placement, dawn/dusk access and Classic
remain unplayed in this focused flow. This establishes visibility behavior,
not an FPS improvement or reflected pixels for the road.

Outdoor drawings retain the existing 96-world-pixel logical/preparation
visibility. A separate main-camera filter excludes known finite drawing bounds
outside a 16-world-pixel rendering guard. Unknown bounds remain eligible. Only
the filter bit added by this helper is owned and restored; pre-existing and
other camera bits survive. Editor lift clears the owned bit immediately, and
ordinary culling plus photo prepare/restore recomputes it for the current
viewport. The shipped engine's DynamicTexture camera has id zero, so cache and
water captures keep access to the logically visible artwork. Public
`world.renderStats().mainCameraCull` reports the guard, camera and exclusions
among logically visible drawings.

The same owned-bit guard also covers canonical stepping stones and ordinary
native dragonfly roots outside the drawing registry. Discovery uses existing
dirty object sorting and explicit photo preparation; each frame visits only
the retained target map. Stones reuse one prepared local box and displayed
translation. Dragonflies use conservative authored body/wing/shadow bounds
and the union of displayed and live poses. Decorated variants, unknown bounds
and unsupported transforms retain their existing rendering. Leaving ownership
or destroying the world clears the owned filter. Logical visibility, cache
recipes and id-zero captures stay separate from this main-camera decision.
`mainCameraCull.specialActors` reports these bounded diagnostic targets. A
freshly attached target may enter at the final dirty sort after its first
normal cull; photo preparation refreshes discovery before using its viewport.

`freeflo-special-cull-photo34-1793919113131` recorded normal Map/held movement,
wheel zoom and one Wide/Up photo. Twelve off-guard stone samples had the owned
main-camera mask, fifteen in-view samples cleared it, and twenty-six off-guard
natural dragonfly samples were masked. The same stone root was excluded before
entering Photo mode, allowed in both actual widened-capture samples, and masked
again after Done restored the normal view. The 1600 by 1000 JPEG (162,133 bytes)
matched its saved bytes and was visually inspected. Ground-marker/photo
cleanup and Leave/Life observations completed without captured errors; water
capture errors stayed zero. No matching reflection-source rows or foreign
filter bits occurred for these targets, so those cases remain source evidence.
Two broad helper fields were false: three ordinary movement samples retained
the existing `gart-off` logical state, and its prior-offscreen photo predicate
selected the already widened preview. The raw before-Photo and capture records
establish the same-root mask transition; a separate root interpretation retains
those qualifications. Entry counts and mask states establish no FPS gain.

Seasonal ground places its unchanged static patch artwork in
`.tg-ground-patches` and enrolls only that child in the existing adaptive,
cropped native cache. Ice and falling artwork remain siblings. The existing
season/pier/Fun rebuild and native node teardown retire the child and its
textures; no independent cache scheduler or clock is added.

The diagnostic `freeflo-gameplay-graphics-bounds24-1793908187652` linked
actual Graphics objects to cached owner bounds during a normal shoreline walk
and two wheel zooms. The largest gate, tree and plant groups were outside the
viewport but inside the old preparation margin. Their existing cache eligibility
was already sufficient; lowering its shape-count threshold would not address
that cause.

In `freeflo-gameplay-main-exclusion25-1793909203719`, all ten initial and nine
later drawing roots outside the 16px guard but inside the logical margin kept
logical visibility and were excluded from the main camera. Roots inside the
intentional guard remained eligible. Ordinary movement, zoom, rain and the
same native session continued without captured errors. The complete command
inventories and CPU profiles remain separate: command-buffer entries include
operands and are not triangle counts, GPU visibility or frame-rate evidence.

`freeflo-seasonal-patch-life25-1793909407739` naturally cached the three spring
patch paths at adaptive quality two in a cropped two-tile capture. Their raw
Graphics were hidden while all eight falling siblings continued changing
numeric animation. Normal Leave/Life/Garden navigation released the old child,
cache and falling nodes, then created a distinct cached child with live falling
artwork. Active observers captured no application errors or incomplete
observations. Classic, winter and reduced motion were not separately played
in that focused observation.

The normal editor/photo flow
`freeflo-native-photo-editor25-lawn-map-1793910530419` used a legal preboot
bench on Well green, ordinary Map walking and **Design → Move**. The lifted
bench remained visible in its preview, and returning it then cancelling kept
the original position and owned stock. Normal photo controls framed an actual
main-filtered drawing outside the prior viewport; **Take it** saved exactly
one real Memories image. The stored format was the app's normal 1600×1000
JPEG, and its bytes matched the normal image read. Canvas size and cameras
restored after Done. The saved image and preview were visually inspected;
active observers captured no application errors.

Earlier editor helper attempts remain separate: one bench fixture overlapped
the Land Office, and one Map selector hit the Close icon rather than the map.
Those failures led to fixture/observer corrections, not picker or navigation
changes. No filter, pose, draft or capture controller was assigned to create
the successful result.

Water's repeated strip queries keep a bounded cache of raw region intervals
at exact numeric y coordinates. The shared FIFO holds at most 2,048 rows;
results above 16 spans use the unchanged scan without retention. Each caller
still receives newly clipped pairs for its current x range and frozen-water
rules. Geometry/source replacement, room changes and teardown clear the
entries. Depth-mask preparation uses the uncached scan. Public
`water.status().intervalCache` reports actual reuse and size; no coordinate
rounding or shoreline simplification is introduced.

Native art's sharp and base-copy captures request even pixel dimensions before
creating RenderTextures. The shipped engine already rounds to those dimensions
and exposes that final size to its Image; doing so initially avoids its second
allocation for odd input sizes. Admission estimates use the same alignment.
Coverage, placement, render scale, quality and invalidation remain unchanged.
This is a small allocation improvement; ordinary vector drawing remains a
separate cost.

The isolated play profiles `freeflo-gameplay-cpu23-1793906056831` and
`freeflo-gameplay-cpu24-aligned-1793906873889` recorded actual shoreline D-key
walking and two wheel zooms in fresh rainy scenes. Each sampled about 2.4
seconds without a cache-ready wait or prewarm route. The follow-up public water
snapshots recorded 317,537 additional exact-cache hits and 14,818 misses while
retained entries stayed at 2,048; water captures reported no errors. Actual
DynamicTexture/frame/backing dimensions were retained separately from the
input interval. Engine UUID ownership is explicitly unknown.

Both raw profiles retain every sample, including idle, program, GC and observer
overhead. The recorded renderer was headless Chrome with ANGLE/NVIDIA D3D11.
These short separate observations establish input, reuse and allocation
metadata, not a frame-rate or controlled speed comparison. Local engine-source
attribution identifies Graphics command rendering, Container traversal and
triangle batching as substantial ordinary drawing work; cache captures account
for only part of it.

`freeflo-water-cache-life24-1793907140189` physically walked to the shoreline,
then used normal Leave/Life/Garden navigation. The original water instance had
a populated bounded cache; destroy emptied it and its query count stopped
changing. A distinct new instance populated its own cache and drew normal
rain, 16 puddles and eligible reflections. Active observers captured no
application errors or incomplete observations. This checks scene teardown and
remount, not every room or edited-water geometry transition.

The Phaser camera owns follow/fit views, wheel and pinch zoom, HUD zoom controls
and fishing framing. Picking converts the pointer through the same numeric
projection. Static outdoor drawings are culled against the camera with a small
overscan; dynamic presentation has a wider margin. Procedural terrain uses
bounded native chunks so a close camera does not replay the entire map's
drawing commands.

Optional activity camera subjects keep the local player together with a kite,
soap film, that player's leaf boat and its next course marker, a requested pet
guide, the marble machine or the shadow courtyard. Providers are
read in fixed priority order; they do not change movement, saved zoom or network
state. The designer and fishing retain priority, and explicit Fit shows the
whole world. Wheel and HUD zoom adjust a temporary activity lens; leaving the
activity restores the saved walking view. The controls read the effective lens
so their mode and limits also match fishing and activity zoom.

The workshop and courtyard reserve the actual visible control panel's height,
including its distance from the bottom of the viewport. The optional inset
applies only while that activity's panel is connected. The helper reads that
panel and the viewport; other subjects retain their existing margins. No
additional world picking or whole-world bounds scan is added.

A focused native courtyard replay used the real lantern and silhouette
controls, then checked the visible stone floor against the actual footer and
canvas rectangles. The floor remained above the panel and inside that desktop
viewport. This complements the earlier full solve/save/visitor observation;
it does not establish every screen size.

A rendered encrypted pair exercised the kite subject, physical wheel zoom in
both directions, Fit/Follow keys and activity exit. The declared sail envelope
stayed in the default view and saved walking preferences stayed unchanged.
The first helper attempt reused a screen coordinate after the new camera moved;
reprojecting the actual reel before the release click fixed that observation.
This is local play evidence, not a universal device or frame-rate claim.

Uncached artwork remains native vector geometry. Static branches and articulated
parts can be drawn once into tiled Phaser RenderTextures, retaining the moving
container. These are disposable GPU caches, not screenshots of a hidden SVG.
Recent compiled player and visitor bodies are retained across direction and
pose changes. Pet poses retain their authored child lists, preserving the actual
species root used by clips and part selectors. Detached poses stop explicit
animations and reset temporary clip state before reuse; each pet retains at most
eight poses. Runtime requests Phaser's supported `maxTextures: 4` Game option.
Shader preparation covers every texture count up to the actual batch limit and
the flat-geometry suite behind the loading indicator. Texture slots control
batching, independently of capture resolution and the number of retained assets.
The same loading phase prepares visible artwork, common current-avatar poses
and whole-map terrain captures without advancing gameplay. World preparation
and the art compiler share an allowance of up to six captures per engine frame;
the World loop keeps its existing elapsed-time check after each job and stops
at the 5 ms threshold. Common avatar poses still prepare one per frame.
Normal play keeps its one-capture allowance, and retained recache recipes omit
the loading-only flag. Cache quality, memory and readiness checks are unchanged.
The existing bounded loading fallback can leave cache work continuing during
play on slower devices.

An isolated desktop replay of the four-texture, six-capture configuration
completed all reachable shader preparation and terrain, visible-artwork and
avatar-pose caches before readiness. Wet-shore routes, wheel zoom in both
directions and a routine dashboard refresh retained the same world and session,
with no reported errors. This single-device observation does not establish a
general startup speedup or frame-rate guarantee on other hardware or browsers.

Bug and Life bodies use the same queue for static-part captures. When a child
starts moving, covering ancestor captures invalidate and repartition; a joint's
own capture can follow its container transform. Animated paint-opacity branches
remain live.
Static parent plans register their cacheable children once; zoom changes queue
the existing targets without walking the entire authored tree again.
Cache jobs run in small batches under a shared 128 MiB budget, or 64 MiB on
low-memory devices. Quality 2 is a floor: captures upgrade through physical
resolution bands up to 12, accounting for camera zoom and object scale. Large
assets capture the visible portion with overscan and refresh their coverage as
the camera moves. Terrain retains a small whole-chunk capture under the same
budget so evicting a close capture does not expose the entire raw terrain
command buffer during zoom-out. Shared allocation evicts offscreen and older
captures when needed. Covered captures remain visible during moving zooms;
sharp replacements are scheduled when the camera settles. Coverage gaps and
photo capture can expose resident vectors immediately. Native text
resolution also rises for close views. Cache failure must leave the original
artwork visible. Phaser 4 texture `draw()` queues work: call `render()` before
hiding the source geometry. Cache replacements retain the previous capture
until admission and drawing succeed. Pressure first releases hidden sharp
captures while preserving fit-view terrain and visible working images.
Static scenery can retain a full-coverage quality-1 base, capped at 512 KiB per
target and counted in the same pool. It is derived from a completed GPU capture
without another vector replay. Actor, peer and pet pose caches do not pin bases.

Photo capture pauses gameplay and temporarily changes the canvas and camera.
Call `world.prepareRender()` after changing the camera to refresh culling without
advancing simulation, then `GardenNativeArt.updateAll()` once for text and cache
quality. Repeat after restoring the normal view. Capture must not change saved
camera preferences or leave offscreen objects hidden in the restored view.
Its temporary sharp pass exposes retained vectors without deleting the normal
view's captures, so returning from an export does not rebuild the fit map.

## Persistence, networking and current limits

Automatic new-friend presentation is queued separately from earned pet state.
It starts disarmed, rearms only on genuine Pets view entry and uses Together's
existing idle callback. Garden/Visit, active stages, modal and editing owners
defer it. One presented celebration consumes that entry's allowance, including
after selection or dismissal; saves do not rearm it. Deliberate Collection
meetings can take priority over the automatic queue. Ownership, journal and
collection freshness retain their existing durable state; presentation IDs
remain in memory as before. Motion-off or sleeping stages can leave them
pending. The legacy mounted modal card blocks only while its overlay is open.
The retained sleep toggle labels itself Wake up while asleep and Nap while
awake, with matching pressed state; its existing action and timing stay intact.
The first Places notice also treats the owner garden route as busy before its
immersive class mounts, retaining its existing retry and preference choices.
That loading guard is separate from a notice appearing before Visit activation.

Collection preview art keeps its authored size instead of stretching across a
stacked panel. Medium content widths place art beside the details; narrow
widths retain the smaller vertical preview. The existing card-selection scroll
uses the actual panel/grid order rather than the window width, so stacked
details return into reach while a side panel stays still. These layout reads
occur only on explicit card selection.

Re-selecting the current Collection filter leaves its cards and detail artwork
connected. Re-selecting the current card also keeps its artwork, while retaining
the existing stacked-detail scroll. A genuine filter or data refresh preserves
a selection only if it is shown, otherwise preferring the current companion,
an eligible shown pet, then the first shown row. That choice precedes card
construction so its highlight matches immediately. Empty filters hide and clear
the unrelated detail panel and give their message the full content width.

A later ordinary starter-duck account re-clicked Mine and its selected owned
card through physical input. The same panel, SVG and five running CSS animation
objects survived both clicks, with advancing animation clocks. Its genuine
Ready now filter had no eligible rows: the selection cleared, the detail panel
was hidden and empty, and the message used the full width. Inspected images and
normal Home cleanup completed without captured errors. The nonempty fallback
ordering is source-derived; this flow did not force an eligible offer.

One ordinary account earned three real queued companions through its existing
collect cadence. They stayed pending through Garden Water, Menu and Map. On
Pets, the normal Wake up control returned to Nap, one automatic celebration
appeared at idle, and Later kept the remainder parked through a normal Pat/save.
Collection browsing used physical scrolling, retained an earned owned card and
completed one displayed affordable Meet it purchase with its explicit party.
That party left the pending earned remainder intact, then Home cleanup finished
without captured errors. Inspected images show the compact art, reachable
controls and normal celebration. This covers the observed medium layout;
other viewport sizes and motion-off/asleep deferral remain source-only.

Two separate starter-duck rain opportunities completed scene cleanup, but
neither reached a puddle endpoint. The first exercised the ordinary pat/menu;
its route request correctly rejected the duck's non-free origin. The spacious
alternative had no eligible exposed approach and attempted no pat or request.
No routine, contact-joint or splash-endpoint success is claimed from them.

Pet locomotion writes its calculated fields into the existing plain motion
state directly, evaluating the same expressions before those writes. This
removes the intermediate Object.assign input object, retaining phase, feet,
wetness, shadow data and foot-effect decisions. Active fishing similarly
retains its presentation-only HUD reference while its parent is the current
scene box. A missing, changed or retired host falls back to the existing lookup;
focus cleanup clears the reference even after the garden root has gone. Neither
change alters artwork, simulation timing, saved state or multiplayer messages.
These are reductions in source work, without a measured frame-rate claim.

One ordinary starter-duck route showed advancing feet, moving state and retained
body joints. A single natural cast reached wait, nibble, bite and reel with the
rod, line and float visible. Across 156 active samples, the same HUD and button
belonged to the current scene. Escape retired the rig and HUD reference; normal
Leave, Life return and final Leave retired the old owners without captured
errors, including the final cleanup sink. Pet and rig reflection bands were
drawn in that geometry; player-body reflection and a landed catch were absent.
No second cast tested HUD creation after remount. Inspected images show the
shore, companion, rig and reel; this is one play observation, not a speed claim.

Puddle ripple clipping first rejects finite straight segments strictly beyond
one side of the actual outline bounds. Touching and non-finite inputs still
reach the original clipper, and surviving segments retain every intersection
and midpoint calculation. The bounds come from the actual organic points and
are read directly, without another geometry cache. Lamp-shadow selection also
constructs its candidate record only when it enters an existing winning slot;
the same computed values, strict comparisons, tie order and drawing remain.
Neither reduction changes the rendered effects or measures their frame cost.

An ordinary current-time Tokyo rainy-night account used three acquired lamps
and one physical Map walk to the pier. Actual point lights, shadow images,
wet pools, tracks and puddle rings were present, with an actor inside three
lamp ranges. Leave, normal Life return and final Home cleanup retired the old
lights, shadows, pet and surface records without captured errors. Images show
the warm lamps, rain, organic pools and shore. Water diagnostics included player
reflection bands but no pet band in this geometry; those diagnostics alone do
not prove reflected source pixels. This flow adds no clipping-skip counter or
performance measurement, and is not a device or weather coverage claim.

Glow cleanup reuses a private membership set, clearing and refilling it from
current sources at each existing paint before retiring missing lights. This
avoids constructing a mapped array and a Set object per paint. It does not
memoize source-array identity: retained arrays can change contents, and ID-less
room sources can move. Room changes and destroy clear this scratch state.

The pet room also skips setters, room rebuilding and stage-prop refresh when
an owned toy or bed is already current. Its click reads the canonical current
getter rather than a captured selection flag. Actual item changes and the
existing purchase, error, reward and Undo paths retain their behavior.

One later rainy-night route retained actual lamp and shadow presentation through
movement, Leave and normal Life return. Afterwards, two trusted physical clicks
reselected the current ball and cushion on Together. The room buttons, both prop
roots and SVGs, actor and HUD nodes stayed identical, with unchanged selections
and acquisition records. After natural entry settled, the same sleeping-pet
animation objects kept advancing through both clicks. The toy and bed had no
CSS animations, so their animation continuity remains unclaimed. Inspected
images and final Home retirement completed without captured errors, including
the late sink. ID-less moving room lights remain source-derived in this flow.

Reflection normalization visits the current actor, creature and scenery groups
directly, in the same order, rather than first copying all their rows into one
flat array. Producer refresh finishes before this read-only normalization;
capture and drawing begin afterwards. Duplicate precedence, priorities and
capture policy stay the same. Companion painting similarly uses one shared
helper with explicit frame arguments, retaining its call-local deduplication
set, local/peer/roaming order and owner associations. These remove explicit
temporary work without a measured timing claim.

Collection cards expose their actual preview selection through aria-current,
updated with the existing visual highlight. Current cards, filters and owned
room selections use the normal cursor; locked room purchases remain actionable.

An ordinary collection route retained the same artwork and five animation
objects on current-filter/card re-clicks. A genuine Duck-to-Cat selection moved
the sole aria-current marker with its highlight and details; the real empty
Ready now filter cleared it. Current cards, filters and owned room controls had
the default cursor. The inspected layout and final Home cleanup had no captured
errors; this observes attributes and rendering rather than a screen-reader run.

A separate encrypted host/visitor visit showed both ordinary ducks on both
pages. One physical visitor Water was accepted by the host, both players walked
to shore, and one natural cast reached wait, nibble and bite with its rig
visible. Retained own and peer joints changed transforms, and one own Hand pat
produced its normal count, hearts and menu. Escape and both normal departures
retired the pet owners, with no captured errors in either final sink. Inspected
images show the remote cast and a duck's reflected head in the shallows. Broader
actor/pet/rig band diagnostics do not establish every source's reflected pixels.
No catch or pending-pose-at-Leave opportunity occurred in that flow.

A short ordinary Map walk recorded a main-thread CPU profile with reflection,
clipping and native transform parsing in its application call stacks. It
contained substantial unattributed native/program time. This single 1.4-second
observation does not establish GPU cost, call frequencies or a frame-rate gain.

Normalized water geometry now prepares its reflection-height sequence alongside
its private points, holes and ellipses. Existing geometry rebuilds replace this
sequence as well. Vertex, hole and ellipse-extremum order, duplicates and the
existing strip cap remain exact. Painting reads these heights instead of
flattening all polygon points for every reflection and frame. Scene-owned
forwarding callbacks also serve the existing synchronous wave and ripple clipper.
Native matrix parsing converts each dense argument list in a local indexed loop,
retaining the original unit expressions, order and fresh result ownership.

Companion pointer capture shares one pure free-hand eligibility check across
native picking, native pointer dispatch and the Classic capture listener. An
explicit tool exposes the underlying world pick instead of a pet's bounding
box; carried placements and active gesture, fishing, room, design and modal
owners retain their input. The shared listener yields before preventing or
stopping an event. Eligible free-hand selection, pats, encounters and menus
keep their existing path. The predicate reads existing ownership fields and
adds no layout query, timer or network state.

An ordinary encrypted visitor launched one owned Phoenix spectacle, then
watered the existing flower previously covered by its pet pick. The host
accepted the changed water row and visitor-attributed diary entry. The visitor
left with a real avatar pose still pending; its actor and pet retired before
that callback and the spectacle's delayed rebirth step. The host remained
through the authored duration, with the old effect root destroyed and its clock
stopped, then used Hand to pat its own visible duck. One trusted owned-pet
pointer, one pat increment, hearts and the normal menu confirmed that path;
Escape cleared it. Both final error sinks were empty and images were inspected.
The artifact's action-label count flag is false because hit metadata overwrote
that recording label; those independent input and response records remain.
Classic, carried placement and active-fishing branches are source-only here.

Delayed peer-pose completion requires the same current roster actor and its
current connected inner drawing. Central avatar paint also rejects retired or
inactive native inners, while allowing an alive drawing's initial attachment.
The original pose duration and timeout remain. Native pet spectacles capture
their pet node, garden root and scene ownership; a retired owner stops the
postupdate runner before queued steps can redraw it. Final sitting-pose
restoration uses the same owner guard, retaining existing lift, visibility and
ambient cleanup. The pet counterpart is a separate source-derived lifecycle
repair; it was not the avatar error's stack.

One ordinary encrypted cast on the preceding build reached a natural
sand-goby landing, then recorded a visitor's delayed avatar repaint error
after Leave. The initial summary omitted that late error; the preserved Leave
snapshot contains it. The observation helper now collects both Leave logs and
final early-error sinks, and holds pages through any actually observed pending
pose deadline within a declared bound. A subsequent single natural cast reached
wait, bite and reel, then both clients left without captured errors. It had no
pending pose at Leave, no landing and no multi-round invitation, so it does not
by itself exercise the retired pose callback or accepted second-line branch.

Second-line prompts own one pending invitation and expiry timer, separately
from the already accepted helper slot. A physical click checks the same scene,
room, roster actor, deadline and free hands again. Music-room context is also
excluded. A fresh big-fish event can precede cast presentation; no initial reel
snapshot is required. Once its matching canonical float has actually been
observed, a disappeared or changed line retires that prompt. Matching terminal
events and catches clear it, including terminals received without a local fish
presentation. Reset, cancel and an accepted new cast clear pending UI. The
existing quarter-second school tick checks active prompts; no frame timer or
network message is added. Accepted-help ownership, rewards and consent remain
on their existing path.

Save formats, item identities and the encrypted host-authoritative multiplayer
protocol are unchanged. Rendering caches are never save data or network state.
Movement presentation may interpolate; catches, purchases and other reliable
actions keep their existing authority and ordering. Do not send packets at the
rendering frame rate.

An unchanged native garden presentation reuses its scene and static HUD during
dashboard refreshes. Live host, visit, shared-goal and play overlays still update.
The visit section retains its attached root too, so a shared-state refresh cannot
silently rebuild the visitor's engine during a cast. Deliberate scene resets
publish the ordinary fishing cancellation before clearing local presentation.
The presentation key includes actual garden, inventory, weather, appearance and
tool state; camera movement and continuous plant-age values do not cause a
scene repaint. `status().syncs` reports full and reused synchronizations.
Small garden sound effects share an AudioContext prepared behind native loading
when Sounds is enabled. Preparation does not request playback; browser audio
permission still governs resume.

Reflection snapshots use Phaser's additive draw offsets: the transformed source
wrapper already contains its parent's world translation, so its capture offset
is just the negative world-space capture bound. Actor/pet captures precede
scenery in the shared cache. `water.subjects` reports eligibility, snapshot and
drawn bands; a drawn band alone does not prove its source pixels are nonempty.
Fishing reflections read the same visible numeric rod/line/float components,
including native indoor peers, and draw clipped vectors without repeated rig
captures. Body mirrors retain their original vertical scale.

`GardenNative.status()` reports readiness, frames, native component/cache
counters, visible-world counts and lighting state. These are diagnostics, not
an FPS guarantee. Isolated desktop play has covered movement, close zoom,
gardening, fishing and saved catches, an indoor puzzle, photos, pet effects,
and native host/visitor movement, speech, watering and held-item poses.
Full visual parity for arbitrary authored CSS/SVG effects, sustained performance
on other GPUs/browsers, mobile behavior and complete remote multiplayer play
remain unestablished. Classic is the available alternative if the native scene
cannot open or has a rendering problem; native startup currently reports errors
instead of silently switching renderers.

Design mode retains the World-owned ground/path group. Completed strokes update
its drawing record; Undo and Cancel synchronize that same group. Live strokes
batch through the scene update tick. Lifted facades temporarily borrow their
existing native container, restoring its original parent and transform when
cleared, while new made-object previews retain one parsed body between cells.
`world().designStatus()` reports layer connectivity and preview ownership.
Normal dragging also retains its preview body, preserving the item's growth,
rotation and style. Editor input cannot also trigger normal garden actions.

Native contextual Hand picking checks an exact exposed bug hit before a facade
when the bug is in front or that facade has faded. Opaque covering props retain
priority. The ordinary bug interaction starts the existing net chase and swing;
there is no separate selectable Net tool.
Visitor creature sprites join the current world's canonical numeric picking with
host-equivalent `hitUp`; detached, culled and hidden sprites are excluded.
An unbuilt site's future footprint does not claim empty ground during picking;
its actual price marker keeps its existing interaction.

Decoration feedback compares settled model values within the current garden
and scene; initial mounts stay quiet. Its lift, placement, turn and style cues
use the existing bounded action pool and reduced-motion preference. These
effects add no multiplayer messages. Local Undo checks its affected rows against
their saved after-values and validates only restored or moved footprints, so a
later shared change or newly occupied former location cannot be overwritten.

Native lighting separates rain from snow, matching the existing snapshot weather
kind without applying a rain watering bonus to snow. One ambient presentation
clock controls wind, cloud drift, lamp flicker and precipitation; pauses and
reduced motion hold that screen's clock. Native live hosts share a canonical
monotonic phase in full snapshots and the existing periodic garden summary.
Visitors anchor to that host phase using their monotonic receipt time, then
correct drift gradually. Local holds do not stop the shared canonical phase;
the resumed presentation converges without jumping to the host's current frame.
No wall-clock offset, per-frame message or new summary cadence is needed.
Missing metadata retains the local presentation clock, including older peers.
Room entry removes outdoor weather presentation,
and the outdoor wetness reservoir survives the transition. Lighting diagnostics
include precipitation kind, ambient time, pause state and outdoor wetness, plus
the ambient source, host sample age and remaining phase offset.

A focused synthetic encrypted host/visitor play observation covered a late join,
host weather over the visitor's different provider weather, movement, wheel
zoom, local full freeze, hush and reduced-motion holds. The visitor retained its
held phase through each pause, resumed gradually and followed a natural periodic
host sample. Both scenes remained live without reported application errors.
Transport and frame timing can leave a small phase difference; this does not
claim identical particle positions across different cameras or all devices.

The local server retains one built HTML page and one injected public-config
variant. Browsers accepting gzip receive the first response as it compresses;
later requests reuse those compressed bytes. File identity or public-config
changes replace the prepared variant. Plain responses and HEAD preserve matching
page metadata and the same exact script policy. APIs and event streams retain
their own delivery. Actual isolated browser reloads covered changed public
configuration and the normal service worker's offline page after its own server
stopped, followed by a successful online reload. This reduces transfer work;
native scene preparation and browser parsing still take time.

NativeLight owns retained precipitation Images backed by one small shared atlas.
Rain and snow update those Images rather than tessellating precipitation Graphics
each frame, and reuse the same pause, reduced-motion and room lifecycle.

Surface puddles retain deterministic identities across unrelated model updates.
Placement and exact shoreline fingerprints invalidate their geometry; organic
outlines share paint, contact and ripple clipping. Wetness changes opacity rather
than rebuilding pools. Surface diagnostics report pool builds/reuse, visible
ground effects and shoreline/placement rebuilds.

Indoor activity spots use stable identities and numeric placement. Small authored
attribute changes reconcile into retained native nodes, preserving running joints
and animation phases; changed topology or definitions still replace the artwork.
`GardenNativeRooms.current().spotStats` reports builds, patches and moves.

Delayed room discovery text and quiz answers retain both the room identity and
the exact play-state object that created them. Leaving and reopening even the
same room creates a new session, so an old timer or answer button cannot clear
its question UI or apply a result to that new visit.

The native Surface owns puddles and weather footprints for players, peers and pets.
Life skips its duplicate legacy puddle compilation while that owner exists, and
Wonder's legacy footprint sprite sleeps. The separate animal-track discovery
still runs: its trail is anchored to its actual bounds and uses the shared static
cache. Classic keeps the old presentation paths. Puddle seeds use the host's
calendar day on a visit, independently of the visitor's time zone.
`gardenWorldRouteGridStatus()` reports reuse of prepared physical route grids:
unchanged collision bitmaps, shorelines and numeric collision boxes keep their
anchors across cosmetic or watering updates; real physical changes rebuild them.
An exact physical-input preflight reuses the prepared grid and solid boxes before
the full cell/solid scan on unchanged models. If that preflight changes, the
existing detailed comparisons still decide whether preparation can be reused.
