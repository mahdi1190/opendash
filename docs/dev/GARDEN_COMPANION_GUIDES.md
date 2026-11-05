# Companion guided discoveries

This document describes the source contract for **Show me around**. Rendered
evidence comes from separate isolated encrypted observations: otter, owl,
rabbit and fox each completed a requested walk. A focused fox-pack observation
also exercised physical Escape and the matching critical stop after a paired
endpoint. This is not one universal or multi-client playthrough.

## Interaction and scope

A normal click still pats the pet. Its existing action bubble offers **Show me
around** for an owned owl, otter, fox or rabbit. A rabbit also keeps its existing
**Puddle play** action. The guide request can wait for the exact pat response
that opened the bubble; it does not replace an unrelated trick's callback.

The menu records that response's actual callback, root and clip identities.
Only the still-live response briefly takes priority over passive follow and
wildlife decisions; its identity expires after the clip's normal duration plus
a small allowance, capped at seven seconds. A deliberate guide request can
also wait through a stationary, callback-free settle. Its existing invitation
then reserves priority until the normal busy countdown finishes. Foreign
routes, clips, callbacks and activities still reject or retire the request,
and normal start validation still decides whether a walk is possible.

Each player's own companion can guide in the garden they are visiting. The
host can also ask a pet from the host's own roaming pack. A visitor never
directs that pack. Only one local pet may be guiding or awaiting a guide
invitation at a time.

The pet chooses a real nearby interest with an accessible route. It travels in
short legs, turns back and waits if its person falls behind, then waits for the
person at the observation stand. After the person arrives, the pet performs an
authored observation and the message names the actual interest. Patting the pet
again or pressing Escape stops the discovery. Walking toward the pet remains
ordinary player input.

| Pet | Interest | Final observation |
| --- | --- | --- |
| Owl | An actual supported lookout with a reachable dry stand for the person. | The owl reaches the supported perch and scans the garden, with a small wing invitation. |
| Otter | Dry land beside actual open water. | The otter leans over the bank, studies the current, then lifts its head. |
| Fox | An established herb, flower, wild plant or tree. | The fox traces the scent close to the ground, then raises its nose to the breeze. |
| Rabbit | An established tree, flower or wild plant. | The rabbit holds an attentive posture and moves its ears to listen. |

These are explicit shared walks, distinct from ambient swimming, perching,
foraging, fishing attention and puddle play. There is no hidden reward, wallet
entry, collectible, persistent quest or new progression authority. The previous
completed interest only affects that pet's local candidate ranking; it is not
saved discovery progress.

## Source ownership

| Module | Contract |
| --- | --- |
| `97-pets-7guides.js` | Candidate selection, dry routes, supported owl flight, lead/wait/arrival ownership, cancellation, rejoin and optional camera subject. |
| `97-pets-tricks-0guides.js` | `guide-owl`, `guide-otter`, `guide-fox` and `guide-rabbit` articulated observation clips. |
| `97-pets-7roam.js` | Existing pet movement and busy callbacks; narrow guide priority, menu and physical-follow hooks. |
| `97-pets-7routines.js` | Shared pet action items, `petGardenPlayBusy`, existing endpoint transport and presentation dispatch. |
| `94-garden-live-0rules.js` | Pure guide endpoint/stop validation and existing host-only pack target rules. |
| `94-garden-live-5pets.js` | Existing authoritative place application and validated stop dispatch before clip-only lookup. |
| `94-garden-0camera.js` | Optional activity subject registry; guide code registers its own provider. |

`97-pets-7guides.js` sorts before the roam and routine files. Its top-level
profile rows contain data; callbacks use those later modules only after the
application has loaded. The clip definitions sort after the shared clip
library. No new animation frame loop or independent physics engine is created.

## Paths, waiting and priority

Candidate work happens when an invitation is accepted. The nearest candidate
set is bounded, and both the person's stand and the pet's approach need valid
routes. Ground segments use the existing free-foot and route helpers and are
sampled along their length. The lead route is split into short legs. A moved
plant, changed lookout, obstructed stand or invalid next leg retires the plan
instead of moving the actor through the obstacle.

An owl's initial flight can leave an actual supported perch for nearby dry
ground. Only that validated departure is marked airborne. The route the person
follows stays on accessible dry ground; the code does not ask a ground router
to reach an elevated coordinate. At the destination, the person first reaches
the dry observation stand. The owl then flies to the actual supported perch
and settles using the existing numeric lift calculation.

The normal busy countdown and owned clip callbacks continue while a guide is
active. Default ComeAlong and passive wildlife goals yield to the requested
guide. Assistant/user cues, fishing, tools, photos, held activities, room entry,
hidden state, reduced motion and scene teardown retain priority. The shared
`petGardenPlayBusy` predicate also excludes the pet from ambient greeting and
friend targets while a guide invitation, route or owned endpoint is active.

The guide has a total active-time ceiling, a separate wait ceiling and a short
break after completion. These are ordinary gameplay lifecycle bounds, not
performance targets. Cancellation clears only its own route, callback and clip
handle. A companion may then follow a separate bounded physical rejoin route;
that route is not an active discovery and cannot emit the old observation.
Rejoin stops on context changes or repeated routing failures. The old distance
snap remains suppressed until the companion is close again. Neither discovery
nor rejoin assigns a pet or player position.

`petGardenGuideState()` is read-only telemetry for the current token, phase,
target, observation stand, supported perch, lead points, rejoin and last reason.
It is not an action API. Ordinary following uses the normal player movement
input, never writes into the pet's route or callback.

## Pat handoff observation

`freeflo-companion-pat-request-22-1793903489285` physically requested the visible
guide action after its pat clip retired. A valid shoreline plan and normal
context were available, but an ordinary stationary busy interval caused the
real request to be rejected. The bounded pat identity and explicit settle
invitation above address that handoff.

On the repaired source, `freeflo-companion-handoff22-1793903956536` accepted
the physical request, reached a real look-back wait, followed ordinary player
walking to the otter's shoreline observation and retired it with Escape. Its
later remount step failed because the helper looked for Garden in Home's
sidebar rather than selecting Life; that failure remains in its artifact.
The corrected navigation run,
`freeflo-companion-life-return22-1793904199766`, reached an authored shoreline
endpoint with changing joints, actor shadows and up to 26 pet-reflection bands.
Escape retired its owned clip and camera. Normal Leave, Life return and page
reload preserved the pat and species without retaining a guide. Both observers
were active after reload and captured no application errors. This shorter
route did not need a look-back wait or player follow input; those facts belong
to the earlier separate run. Neither run establishes every species, weather or
multiplayer transition.

The separate encrypted pair in
`freeflo-companion-shared-guide22-1793905006496` used a physical Visit button
and normal host pat/request/follow. The visitor received the matching authored
endpoint and target token. Physical host Escape produced the matching stop
receipt and retired that exact remote clip. Both pages left through normal
controls with no lingering guide scene, and both early/ready observers captured
no application errors. This is one host-companion pair, not a species or
network-condition survey.

`freeflo-companion-fishing-transition-deps22-1793904810324` physically cast
into visible water during an actual owned otter endpoint. Fishing retired the
guide, its camera and old clip before Escape. The rod, line, float and eligible
rig/player/pet reflections drew; ordinary cancellation, leave, remount and
reload retained the pat and existing catch rows. That short route required no
player follow input. Its screenshot exposed a stale guide progress message
over the new cast; the prompt-lifetime repair records an exact message close
closure on the guide rather than clearing unrelated action feedback.

Progress prompts belong to that live guide session. Replacing the prompt,
starting its observation or cancelling the walk calls only its recorded close
handle. That handle checks the exact visible message identity, so a later
fishing instruction, error or action reply remains. Completion, stop and
refusal messages keep their ordinary independent lifetime.

The repaired prompt flow in
`freeflo-companion-fishing-endpoint-prompt23-1793905623364` reached a real
owned otter observation and a physical Hand/water cast. Obsolete guide progress
was absent from both shown and temporary message state at the observation and
during visible-rod waiting. Rod, line, float and eligible reflections remained
visible. Normal Escape, leave, remount and reload preserved the pat and prior
catch rows, with no captured application errors or incomplete observations.
That short route needed no follow input. A later error or completion reply was
not manufactured to claim a separate message-identity observation.

The first guide observation also exposed an existing hay-seat departure defect:
a fox remained inside the haystack's collision footprint with zero lift and
could not reach an otherwise valid discovery. Ground-pet hop permission is now
limited to the actual support footprint. A departing pet keeps that support's
derived height until its feet clear it, then descends normally. An otherwise
idle seat-capable pet already stranded inside a real supporting seat can walk
to that seat's normal anchor; no arbitrary obstacle grants recovery. Support
identity/geometry is checked against current habitat and cleared on departure,
room entry or remount. This is an ordinary movement correction, not permission
for guide selectors to accept blocked feet. The repair was followed by an
observation in which the fox was on free ground and could
choose a legitimate plant guide. That observation did not yet complete the
guide: it exposed a separate source identity lookup error. Model occupancy
stores plant UIDs, so guide liveness now resolves the UID through
`gardenPlantById` before checking the established plant row. Subsequent fox and
rabbit observations kept their unchanged plant targets and completed normally.

## Multiplayer endpoint and cancellation

Travel uses the existing `gl:pp` messages. The owner's computer chooses the
guide and its routes; a copy does not run another guide controller. A guide
observation uses the existing legacy-safe `petplay` FX family, with these IDs:

| Event | `e` |
| --- | --- |
| Observation | `guide-owl`, `guide-otter`, `guide-fox`, `guide-rabbit` |
| Explicit retirement | `guide-stop-owl`, `guide-stop-otter`, `guide-stop-fox`, `guide-stop-rabbit` |

Every guide event requires the existing typed `p` request ID and exact
`pc: [xTenths, yTenths, facingBit]`. A companion omits `u` and `i`. A host pack
event requires `u: 1..3` and `i` equal to the species named by the event. The
receiver resolves the host's remembered place slot and species, and accepts
that pack event only from host slot 0. Visitors cannot command the host's pack.

Before emitting an observation, the sender requests an ordinary current place
update. The receiver waits for its actual `pp` copy to reach the exact endpoint;
the tuple does not move the pet, choose a route or create a creature. Existing
same-goal place repairs preserve an authored clip. A changed action, scene or
expired pending cue retires it. An older peer rejects the unfamiliar guide IDs
or the entire unfamiliar `petplay` family; guide events never fall through to
the old generic pet handler.

If cancellation occurs after an observation was emitted, the owner sends at
most one matching `guide-stop-*` event for that token and endpoint. This is a
critical explicit action through the normal FX path, so the ambient six-second
clip cadence cannot suppress it. It carries the previous endpoint and request,
not a new destination. Normal `pp` retires or changes the movement intent.

The stop is consumed before the clip-only suitability lookup; it has no fake
clip definition. A pending cue is removed only when request, species/actor and
exact endpoint match. An already playing presentation additionally has to own
the same root, clip handle and callback. A newer/user-owned animation is left
alone. One bounded per-pet retirement marker rejects a late start for that same
request and endpoint if the stop arrived first. The wire schema, existing FX
cap and transport version are unchanged.

## Camera and evidence

The optional `pet-guide` activity subject has priority 15 and a stable request
ID. It supplies the actual pet feet/lift and, when nearby, the observation
interest or supported perch. The existing registry unions the local player.
The provider does not move an actor or save a zoom value; explicit Fit and the
existing temporary wheel lens remain in charge. An inactive guide takes the
cheap return path.

The isolated helper uses declared adopted profiles and legitimate
plantings, physical pet/menu clicks, normal player navigation, actual encrypted
place/FX receipts and both real root/clip handles. `--stop-pack` presses real
Escape only after a paired pack endpoint is observed. A contact/name label
alone is not clip proof. An unavailable habitat or missing invitation, route,
visible paired endpoint, stop or completion must remain incomplete evidence.
The final evidence is split across these actual observations; each recorded no
application errors:

| Observation | Actual scope | Artifact |
| --- | --- | --- |
| Host otter companion | Physical invitation, waiting, normal player following, paired active endpoint and completed waterside discovery; local Follow camera used the guide subject. | `freeflo-pet-guides-stop-15-1793884666590` |
| Visiting owl companion | Current owned-pet hit, lead/wait/follow, paired Silver birch endpoint and normal completion. | `freeflo-pet-guides-visible-guarded-15-1793885972338` |
| Host fox pack, explicit stop | Actual paired native endpoint, physical Escape, matching `guide-stop-fox` request/slot/species/endpoint receipt, then retired copy clip and pending cue. | `freeflo-fox-stop-15-1793886404250` |
| Host rabbit companion | Physical request, normal lead/wait/follow, paired Silver birch endpoint and completed discovery after the plant UID lookup repair. | `freeflo-rabbit-guide-15-1793886480672` |
| Host fox pack, normal finish | Physical request, normal lead/wait/follow, paired Thyme endpoint and completed discovery after the plant UID lookup repair. | `freeflo-fox-complete-15-1793886541590` |

Earlier observations remain diagnostic evidence, not extra passed cases: the
initial owl click missed its tiny moving/occluded Fit target; the fox first had
blocked feet at the haystack, then exposed the plant UID liveness error after
it reached free ground. The visible helper now verifies a current owned-pet
hit and records the actual pointer event before counting an invitation.

The stop observation exercised retirement during a real active endpoint. It
does not prove arbitrary packet reordering or every late-arrival race. These
separate local two-page runs also do not imply every season, Classic,
reduced-motion, many-client or public-relay coverage.

See [Garden engine](GARDEN_ENGINE.md) and
[Pets in place](GARDEN_TOGETHER.md#18-pets-in-place-and-playdates-232) for the
surrounding runtime and multiplayer ownership contracts.
