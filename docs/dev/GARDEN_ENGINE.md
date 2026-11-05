# Garden engine

The Phaser graphics choice uses a native game scene for the outdoor garden and
indoor rooms. It replaces the earlier hidden-SVG rendering bridge. Phaser
is the default when no graphics choice has been saved. Classic remains
available in **Garden > Graphics**; `garden.prefs.renderEngine` selects
`standard` or `phaser`. An explicit Classic choice is preserved. Switching
graphics keeps the same saved garden.

The default presentation is deliberately quiet. Optional world activities stay
packed away until the owner chooses one through **Play → In the garden**;
selecting another replaces it, and **Put it away** clears the setup. Existing
discoveries and owned objects remain saved. Map, status and extra controls are
available on demand, and passive notes go to Recent instead of competing with
the player's current action. See [Garden pacing](GARDEN_PACING.md).

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

## Ownership

| Module | Responsibility |
| --- | --- |
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
to physics and both renderers. Prepared cell buckets resolve ellipse clearance
and shore normals without scanning every edge at each step. Hard obstacles and
locked land keep their grid rules; water occupancy uses actual curves. Route
cells can retain a dry fractional anchor, and swept movement follows bank
tangents. Boats invert liquid clearance; grounded animals retain land rules
when their person is boating.

Locked-land polygons retain owned plot holes. The frontier mist uploads a
signed-distance field only when the locked boundary changes; animation scrolls
a small reusable noise texture across a broad, irregular fade in one shader.
Gates sit above the fog without changing collision
or progression. World scale comes from roofs, canopies and landmark height;
player size and saved coordinates stay stable.
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

## Native components and one clock

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
