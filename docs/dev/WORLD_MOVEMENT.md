# World movement: walking, standing, sitting and walls

How people (and dogs) in world-engine scenes move, stand and avoid things, and what the renderer reads from it. Files:
`src/app/79-world-2life.js` (the life sim), `79-world-2brains.js` (classes), `79-world-6anim.js` (the legs),
`79-world-1nav.js` (the walkable map), `79-world-0core.js` (the gap normaliser, dwellers out of the statics),
`79-world-0kits.js` (standing shares), `79-world-4extrude.js` and `79-world-1place.js` (they read gaps through core).

The user's complaints this answers: people walking through walls, people walking when they should be standing, people
striding on the spot or sliding. Wave 2 adds: narrow ways (section 7), long views (section 8), the sliced life build
(section 9), traffic that never vanishes mid-frame (section 10), and seated figures that never move (section 3).

## 1. Locomotion: one state machine per body (interface I4)

Every body with legs on the ground (`kind: 'walker'`: people, dogs, grazers, ground birds) has ONE locomotion state that
both the life sim and the animation read. It lives on the life agent and is exported on every `worldAgents` record:

| field | meaning |
| --- | --- |
| `loco` | `stand` · `start` · `walk` · `stop` · `sit-down` · `sit` · `stand-up` · `queue` |
| `walkK` | the stride weight, 0..1 (the leg swing amplitude); interpolated between ticks like the position |
| `gaitPhase` | 0..1, the gait cycle by **odometry**: distance the body covered / its stride; interpolated like the position |

Rules (`WORLD_LIFE_LOCO` in 2life):

- WALK is entered when the body's ground speed over a 0.3 s window reaches 0.35 m/s (or it is commanded to walk and is
  already moving), and left below 0.2 m/s. A body whose own pace is slower (a heron stalking at 0.08 m/s) uses six tenths
  of its slowest pace.
- START eases the stride weight in over 0.3 s, STOP out over 0.35 s while the body comes to rest (the feet plant).
- The leg cycle advances only by distance covered (`gOdo += d / stride`). No distance, no leg motion: a figure can never
  stride on the spot. Any distance moves the legs by exactly that much: it can never slide at walking pace.
- People and dogs walk or stand, never creep: a wanted pace under 0.45 m/s is raised to it while walking (or to start a real
  step) and otherwise dropped to standing (hysteresis on the commanded pace).
- A standing body is kinematic: a push under about 0.1 m in the window is absorbed; a bigger one reads as a step (the window's
  speed starts a short walk). Standing people are heavy in the separation (mass 6 against a walker's 1), so walkers go round.
- One "is it moving" test everywhere: `worldLifeMoving(a)` (life's presented state) and `_wanLoco(e)` (the animation).
- The sidestep shuffle is capped at 0.3 m/s (no crab-walking).

Anim (6anim): `_wanTarget` takes moving from `loco`, `_wanRates` takes the stride weight from `walkK` (no shuffle
shortening), `_wanUpdate` takes the cycle from the gait odometry, and `worldAnimHooks` draws the legs at the RECORD's
`gaitPhase` and `walkK` (phase = gaitPhase - T / period, so the drawn phase at time T is exactly the presented one).

A person whose art has no legs (a birdwatcher with binoculars, a photographer, a phone idler) is drawn in a walking
stand-in (`person.walker`, `person.hiker` in the country) while it walks (`_wlfWalkArt`), back in its own art when it stands.

## 2. Standing is behaviour: dwellers

Pass-through flows alone make every scene a march. Each kit has a target share of the people in view who stand or sit
(`WORLD_KIT_STAND` in 0kits: civic square 0.42, waterfront 0.4, quayside 0.36, river city 0.3, park 0.3, pond 0.28,
old-town lane 0.22, canal 0.2, open country 0.15-0.18). Ground adjusts it (`_wlfStandShare`): a plaza over 1500 m² raises it to
0.4, a boardwalk or deck to at least 0.25, a towpath caps it at 0.22.

After the 90 s warm-up (nothing is drawn during it) the life sim knows where walkers go (`life._heat`, 2 m buckets) and how
many people are in view walking and standing. `_wlfDwellInit` then puts dwellers in place, so the FIRST frame already has the
share (no walk-in):

1. **authored**: the scene's own standing figures. Core (`_wcDwellers`) takes every standing scenery person in view (not seated,
   not on a deck or a boat, not a rider; up to `WORLD_DWELLER_MAX` 12, nearest first, at least 6 px tall) out of
   `world.entities` into `world.dwellers`, logged (`action: 'live', rule: 'dweller'`). Life makes each a live, pinned dweller
   at its exact spot and facing (nudged at most 0.6 m out of anything it was placed into). A group figure drawn walking
   (a couple, a family) strolls to and fro on its patch instead of standing frozen mid-stride.
2. **seated**: free bench seats with a clear front (seat anchors, section 3), people already sitting.
3. **chat**: rings of 2-3 facing their middle (two stand square to the line of sight, seen side-on), the chat clip.
4. **watch**: a photographer (town) or a birdwatcher (country) 4-12 m from a landmark, a statue, a fountain, or the water.
5. **queue**: 2-3 in a line in front of a kiosk, a food van or a stall, facing it (`loco: 'queue'`).
6. **solo**: stands, looks about, waits; beside a shop window, a wall or a railing it looks at it; in the open it stands
   three-quarter on to the eye. One whose art has legs moves to a second spot 5-14 m away now and then.

Spots (`_wlfDwellSpots`): walk-layer cells wholly inside the frame, beyond the near band, at least 18 px tall, room for a body,
not a one-body way; scored for being beside something (clearance 0.6-2.4 m), near where people pass (the warm-up's traffic
round it) but not in a walking line (its own cell's traffic), at a readable size (30-140 px). At most
`WORLD_LIFE_DWELL.max` (8) are added a scene: a few anonymous figures, never a crowd. `WORLD_LIFE_DWELL.off = true` turns it off.

The goal verb is `{ dwell: [x, z], face, at, act: 'idle' | 'look' | 'chat' | 'wait', for }` (`_wlfDwellGoal`); it owns the
state (the brain table only varies a long stand). New classes in 2brains: `dweller`, and `browser` (a slow stroller who
stops to look, now 10 % of the default `walkers` and `crowd` mixes and 20 % of `visit`). Stops on a directed goal are
honoured (until now three in four were turned back into walking and the rest cut to 2.5 s); a stop still never happens in
an edge zone or a one-body way.

`life.dwellPlan` records `{ share, walking, still, need, added }` for the tools.

## 3. Walls, benches and bodies

**One gap normaliser.** `worldLineRuns(line, total?) -> { total, gaps, runs, bad }` and `worldLineParts(line)` in core read a
wall's, fence's, hedge's or railing's gaps one way for everybody: `[s0, s1]` metres along, `{ at: metres | [x, z], w }`
(w default 1.2) or `[x, z, w]`. The extruder (`_wexRuns`), the nav (`_wnavLineParts`), placement (`_wplRuns`) and the
validator all use it; the validator strips only the gaps it cannot read. A drawn gate is now open in the nav (Cotswold's
churchyard wall was an invisible wall in a visible gateway).

**Collision from what is drawn** (1nav):

- static people are full discs (r 0.3, up to 0.6 for a group figure), never passable;
- the SOFT tier: a shrub or bush 0.9 m or taller has a solid core (0.35 of its spread, 0.25-0.6 m) on the ground layers;
- a pinned perspective drawing (`WORLD_SIZE_GAPS` / `WORLD_SIZE_AUTO`: the Stevenson Square kiosk and mural, MediaCity's
  IWM North and screen) is solid where it is DRAWN standing: the bottom 12 % band of its outline (`worldArtHull`) at its real
  scale, unprojected at its anchor depth (`_wnavDrawnFoot`; the kiosk 8.5 m wide instead of 2, the mural 18.1 m);
- the fallback footprint is core's (`_wcFoot`), not a box a quarter turn off.

**One mover.** Every position write outside the steering's own step goes through `_wlfMoveTo(life, a, x, z, why)` or the
all-or-nothing `_wlfTryAt`, both swept every 0.1 m against the nav (the separation, the sidestep, the leash). The leash no
longer snaps a dog onto its lead's line. A body found on an illegal point glides (at most 1.5 m/s) to the nearest legal
cell CONNECTED to its last legal point (`worldNavRescue(nav, layer, x, z, r, from, framed, R)`: a breadth-first search;
`worldStep` takes `{ from }` as an 8th argument for the same), never a jump through a thin wall.

**Seat anchors.** Each seat of a bench (`_wlfSeats`) has S (the seat, where the sitter is drawn), A (0.3 m in front of it),
N (the first nav point in front of A whose step in touches no solid but this bench), and the facing. A seat with no clear
front is never used. Sitting is a chain of short anchored steps (`_wlfSeatStep`): `in` (N to A, walking), `turn` (to the
seat's facing), `back` (A to S, 0.3 m, a short step back STANDING, facing out, legs by odometry), `down` (at S, in place, loco
`sit-down`; the seated pose from the tick after the step back ended), seated, `up` (at S, in place: the seated pose for its
first 60 %, then standing; the body leaves the seated state here), `fwd` (S to A, standing, facing out), `out` (A to N,
walking). The body moves only while it is drawn standing: until wave 2 the sit and the stand covered the 0.3 m themselves and
a figure drawn seated slid (about 80 frames in 2 min on Stevenson Square, and wave 1's `out` step was drawn seated too, the
state still 'sit'). Only the sitter's own bench is ever crossed. A seat a static sitter occupies is taken for good.

**No ghost passes in the near and mid bands.** Strangers may pass through each other only when both are drawn under
`WORLD_LIFE_GHOST.px` (30 px) tall; nearer, they steer, yield and queue.

## 4. Arrivals

- Doors spawn only where a building DECLARES one (kb `doors`); the guessed middle of a front face is gone.
- Every arrival on foot fades in over 0.6 s, hidden cell or not (a hidden cell is an estimate).
- Cover (1nav `worldSpawnCells`, edge 'cover'): the angular estimate from the cover's footprint and height, then the DRAWING:
  the four corners of the mover's screen box (shoulders 0.3 m either side, feet to head) must lie inside the outline the cover is
  drawn with (`worldArtHull` at its drawn scale and anchor; `_wnavCoverDrawn`, the outline once per cover). Over the promoted
  scenes this kept 10,129 of 22,063 cover cells; the others had a figure step out of a solid face in view (a planter drawn
  lower than its footprint, a cover drawn narrower).
- Fades are read at the PRESENTED moment (`worldAgents`: `tp = life.t - (1 - alpha) x step`, the moment the interpolated
  position shows), so they are continuous between steps; a fade out runs over 0.6 s less one step and ends at 0 on the last
  step the leaver is drawn in. The ghost pass's value is interpolated the same way (`pGhost`).

## 5. Measuring (one-off diagnostics, never a gate: CLAUDE.md)

- `node tools/world.mjs inplace <ref> --seconds=60` and `motion <ref> --seconds=120`: walking in place, ghost passes, red marks.
- A drawn-gait probe on the frame record (the walk hook the legs are drawn with): drawn-walking share, standing and sitting
  share, shuffle share, stride-on-the-spot frames (legs covering 0.25 m more than the body over 0.5 s), slide frames (body
  at 0.3 m/s or more with still legs), seated pose while the body moves.
- A walls probe over the life sim: body overlaps with nav solids, segments crossing a solid (its own host bench excluded),
  bench glides over 0.35 m.
- `node tools/world.mjs render <ref> --dates=summer,autumn` and LOOK at the people.

## 6. For the renderers

- Read `loco`, `walkK` and `gaitPhase` from the records; interpolate `walkK` and `gaitPhase` (wrap-aware) between ticks
  like `x`, `z`; take `loco` from the nearer tick. `worldAnimHooks(record, t, ...)` already draws legs from them.
- A record's `obj` can change while a legless figure walks (its stand-in art): cross-fade it like a view change.
- Seated records carry `seat: { facing, fdeg }` (degrees) and `host`; dwellers carry `dwell` (authored, stroll, sit, chat,
  watch, queue, solo).
- `world.dwellers` holds the scenery people life brought alive; a renderer with no life (statics only) can draw them as
  statics from there.
- Records carry `brollyLag` (0..12 s, the walker's own, from its id): put its umbrella up (or down) that long after the rain
  starts (or stops), never every walker's in one frame. The wardrobe choice is the renderer's (`_wfrRec`'s `~wet` / `~dry`
  form in 79-world-5frame.js, from the draw's light): see the merge notes of wave 2.
- Reeds parted by a mover (6anim `_wanCtx` / `_wanStatics`): the bend eases toward its target (0.15 s) and dies away (0.9 s),
  its side changes only while it is nearly upright, and the wind's sway fades back in over 1.2 s after it (`sec.swayIn`);
  until wave 2 a bend of 0.6 degrees switched to the full sway in one frame.

## 7. Narrow ways (WORLD_LIFE_NARROW)

A narrow way is walk cells about 3.2 m across or less: the widest clearance within 2.5 m of a cell (near grid; 2 m in the far
grid) is at most 1.6 m (`_wlfNarrowMask`, cached per layer; `worldLifeNarrowAt(life, layer, x, z)` for the tools: 0 or the
way's half width). A boardwalk with rails, a towpath between a wall and the water, a lane between buildings; not a path across
open grass (the grass is walkable). On one, for people on foot (not followers in a group, not dogs):

- **No stops**: a stroll's pause, a wander's look and a dweller's place never fall on a narrow way (they wait for the platform
  or the end of the way).
- **Admission**: an arrival onto a narrow way needs nobody within 5 m of its spawn point and fewer people on the way than
  its length allows (`_wlfNarrowSpawnOk`: length / spacing, 5 m a person on a 2.4 m boardwalk to 3.5 m on a 3.2 m lane); a
  walker about to step on waits at its mouth (6 s at most) while the way is full or the one ahead has not got clear.
- **Following**: a follower keeps the leader's pace a following distance back (`gap` 1.3 m between bodies: speed =
  leader's + 0.8 x the gap error) instead of closing to a shoulder's width; it overtakes only where the way is two bodies wide
  (half width 1 m or more), nobody is coming within 8 m, and the one ahead is much slower (under 0.65 of its pace).
- **Meeting**: the keep-left and the sidestep pass two single file; no overtaking shuffle where there is no passing.
- Far off (figures under 30 px) only the stops apply: the ghost pass lets people by, and holding them only formed platoons.

Measured (one-off, 120 s, people in view at the host's default moment; close = strangers on narrow ways nearer than 1.2 m,
clump = 3 or more within 2.5 m): Fleet Pond 2 close frames 337 -> 19, clump frames 207 -> 0; Wyndham's Pool 404 -> 0,
257 -> 0; York Shambles 102 -> 0, 430 -> 11 (people in view 14.3 -> 9.1: the lane is narrow all along); Fleet canal 2 within
45 m 22 -> 26, 18 -> 7.

## 8. Long views: the dwellers turn over (_wlfDwellKeep)

The gallery stage and the Home card show a scene for minutes. Every 3 to 6 s (`WORLD_LIFE_DWELL.keep`) the keeper:

- **Queues** (`life.dwQueues`: kiosks, food vans, stalls in view with room; seeded before the chat rings now): the one at the
  front is served after 12 to 35 s and goes on its way, the others step up a place (each walks the 0.8 m: a dweller on its way
  walks at once, never held by a still state's timer); a passer-by may join at the back.
- **Rings** (goal key `ring`): a member chats only with another there; alone (the other on the way, or gone) it stands and
  looks about, and leaves 6 s after its partner went (25 s if none ever came). Rings last 120 to 300 s.
- **Dwellers leave**: a seeded stander (90 to 240 s, a second spot for one with legs), a watcher (120 to 360 s) and a sitter
  (150 to 420 s) end with a leave; authored scenery people stay for good. A seeded dweller gives back the room it took
  (`life.max`).
- **New dwellers**: while the people in view stand less than the kit's share, one at a time (at most 8 in place and 4 on
  their way): a passer-by in view and near enough to read (a single walker, or a couple or a family or a dog walker as one)
  stops at a free place 4 to 20 m off (a stander), two stop to chat, one sits on a free bench, one joins a queue; with nobody
  passing near the places to stand (a square seen deep), one of the scene's own streams sends somebody (`_wlfDwellArrival`).
  A passer-by keeps its own look and its way: the dwell goes in front of its goals, and it carries on after.
- `life.dwellPlan.keep` counts what the keeper did (looks, full, formed by kind, arrivals, failures) for the tools.

Measured over 7 min on Manchester centre 1: mean standing share of people in view 0.177 (wave 1, dwellers for good) -> 0.172,
37 passers-by stopped and 32 dwellers left. A kiosk queue in a trial square served 7 in 4 min, each stepping up.

## 9. The sliced life build (interface C1)

`worldLifeBuildJob(world, opts) -> { step(budgetMs) -> done, nav, life, phase, ms, steps, error }` runs exactly what the
one-shot build does (the systems runner's life init: the nav, the populations, the 90 s warm-up, the dwellers) in slices:
the nav through `worldNavBuildSteps(world)` (a generator over the builder's phases and the painter's layers; `worldNavBuild`
runs it whole), then `_wlfInitBegin`, `_wlfInitPops` (one population a step), `_wlfInitWarm` (0.25 s steps up to the
deadline) and `_wlfInitEnd` (the dwellers). A new step starts only in the first half of a slice. At the end it leaves
`world.nav`, `world._wlfLife`, `world.sim` and `world.agents` as the runner's init would, so `worldRun` / `worldHostDriver`
adopt them. The time context is the one the runner's time system starts from (`worldTimeCtx` at opts.ms / world.ms / the
default moment). Checked once: Fleet Pond 2, Manchester centre 1 and Stevenson Square give the same agents and positions at
the build and after 20 s of ticks. Slices at 6 ms: the longest is a whole population's placement or the dwellers (20 to 76 ms
on Manchester), against one 0.8 to 1.3 s block before. (The runner's event handlers are not on the world's bus during a
sliced warm-up; the life is the same.) `worldLifeInit` is the same phases back to back.

## 10. Traffic never vanishes mid-frame

- A road under a footpath goes on: a walk surface painted across a road keeps the road's drive layer (1nav `_wnavFamily`'s
  `roadAt` and the far grid's exact test), and it is a crossing (2traffic: cars give way to whoever is on the carriageway
  there). The Yateley Green and Cotswold green lanes ended at the path to the lychgate and their cars faded out mid-frame at
  23 px (FACTORY's 'vanished mid-frame').
- A solid blocks a lane only within 1.0 m of its line (a car is 1.8 m wide): a kerbside tree at 1.16 m took the Cotswold
  lane's whole direction and moorland walls a Ringinglow road's.
- Still faded in view (spec, not engine): Manchester centre 4's Deansgate and Stevenson Square's Lever Street end in the
  frame; Sheffield centre 3's 14 m cross street is all in view; Ringinglow's road starts at the lens (see open issues).
