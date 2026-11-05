# Garden pacing and quiet presentation

This cleanup makes the garden easier to inhabit and understand. Optional content
should appear when a player chooses it, at a useful point in progression. Adding
more activities is no longer the default direction: use the existing garden
well, spread worthwhile content out, and keep unnecessary content packed away.

This document describes current source behavior. Completed observations and
their limits are recorded below. Earlier activity proofs alone do not establish
that the new pacing, menus or visibility rules work.

## Optional activities

`94-garden-0pacing.js` owns the six optional world activities. They start packed
away when no selection has been saved. The garden owner chooses one through
**Play → In the garden**. Selecting another replaces the current activity;
**Put it away** returns to none. Availability uses the existing garden level,
without a new currency or automatic unlock popup.

| Level | Activity | Selection value |
| --- | --- | --- |
| 2 | The wind kite | 1 |
| 3 | Leaf-boat yard | 2 |
| 4 | Giant soap films | 3 |
| 5 | The listening walk | 4 |
| 7 | Borrowed shadows | 5 |
| 8 | The marble workshop | 6 |

The owner selection is saved as `garden.wd['world.activity']`. Zero means none.
Listening-walk discoveries and a saved shadow-courtyard arrangement preserve
access to those activities even if a level is subsequently undone. Packing away
an activity does not erase its discoveries or saved arrangement. Transient play
state, such as a held kite line or a moving workshop marble, follows its normal
end/retirement cleanup.

`gardenWonderSync` and the slow Wonder tick reconcile the desired module list.
Only modules entering or leaving that list receive begin/end work; unrelated
living-world modules keep running. Retiring the kite, soap, leaf-boat or marble
module clears its existing owner/visitor live state. Inactive activity families
are excluded through `gardenActivityFxAllowed`.

The host publishes the optional snapshot field `wd.aw`, an integer from 0 to 6.
Visitors follow that selection and cannot replace it. Their In the garden list
contains the selected activity; an absent or unrecognized selection stays packed
away. This field communicates selection, not positions, rewards or permission
changes. Existing activity protocols still govern actual play.

Play browsing now uses named groups, with no default All collection. Only the
selected group is listed, and In the garden offers unlocked activities plus one
plain next-level note. Visiting the Play panel does not grant the old pot/mill
starter bundle. The bundle remains tied to explicitly opening the old-mill
activity. Existing owned decorations, games, prizes and progress remain intact.

The world-activity card already set out is marked as current, with a visible
return label. It still opens that activity through normal walking and
interaction; reselecting it does not replace its setup. The panel header also
offers **Return to it**, including for visitors, so the current setup remains
reachable even when its card is on another page.

## Intentional browsing

Shop browsing starts with available stock and existing possessions. The future
catalogue is an explicit choice, and searching can find future items and their
normal requirements. Owned seeds, growing plants, placed decorations and owned
tools remain discoverable even if a level or requirement was later undone.
Purchase, pricing and unlock authority remain in the existing garden functions.

The Bag names its seed and decoration sections and displays item names and
counts. A close control and Shop link are available within the temporary panel.
Selecting or dragging an owned item uses the existing planting/placement path;
an empty bag gives a plain explanation without a bouncing arrow.

Number shortcuts remain available while Bag controls have focus. They close
the Bag and select the existing hotbar slot; Q opens Moves. Switching tools
during a drag cancels the pending placement before the shortcut is dispatched.
The post-drag pointer guard still suppresses an accidental click, while an
intentional number key can select its tool immediately.

A drag previews and drops only onto the actual garden surface. Dropping over
the Bag or another panel cannot target the ground behind that panel. Cancelling
retires its pending release listener and clears the preview, so a later pointer
release cannot spend or place the cancelled item. Pointer cancellation and
window blur use the same cleanup.

## Feedback follows intent

`94-garden-0feel.js` distinguishes passive notes from replies to a chosen action.
Producers mark a passive message with
`gardenMessage(text, {ambient: true, source: 'stable-source'})`; Wonder producers
use `wdAmbient(text, ms, source)`. An ambient note goes to **More → Recent
messages** while the garden is showing. It does not replace the visible message,
create a card, make a sound or enter a delayed popup queue.

Unchanged text from the same source is remembered at most once in ten minutes.
The deduplication map holds at most 64 sources, and Recent retains its existing
40-message bound. Recent is a short local history, not a permanent journal;
durable discoveries remain in the relevant book or saved game state.

Errors, explicit success replies (`kind: 'ok'`), actionable messages and retries
keep their normal delivery even if a caller also marks them ambient. Busy app
toasts keep their existing path. Fishing holds, bite/reel instructions, access
and blocked-action feedback, user-requested pet routines, reward moments and
level cards remain active feedback. A classified ambient garden toast cannot
fall through into an app popup as the garden closes.

Specific passive producers include known wildlife arrivals, passing landmark
narration, Nature sightings, and automatic Wonder notes about post, hidden
parcels, gifts, island changes, return visits and weather-related discoveries.
Explicit Wonder interactions still use `wdWhisper`. The location pointer tooltip
remains available when inspecting scenery.

Automatic lake-condition changes also enter Recent through a stable event
source. They no longer create a full storm/fog/event banner or a permanent
stage tag. **Catch → The lake** still describes every current event and its
fishing effects. Event artwork and fishing modifiers retain their existing
clock and authority.

The lake's own-fish summary names caught favourites and groups any remaining
fish once. With none known, one discovery sentence replaces the repeated
unknown-name placeholders. Event names stay together while descriptions can
wrap within the requested lake page.

## Nature and rewards

Automatic Nature discoveries no longer start a queue of found cards or a series
of discovery sounds. Their first-found marks, visitor records, once-only ledger
payments, daily coin limit and later settlement are unchanged. A Recent note
names the discovery and states whether its reward was paid or remains for a
later day. The Nature book remains the durable collection.

When a ribbon is earned while the current catch card is on screen, its label
joins that card and its full receipt enters Recent. The separate ribbon line
and burst yield to that catch presentation. Standalone ribbons keep their
normal feedback. The ribbon mark, award event and reward data are unchanged.

Actual creature greetings and personal keepsake pickups pass `{userAction:true}`
to `gardenLifeFound`. A new creature greeting can offer a Nature book action.
A real keepsake pickup retains the existing catch presentation as its primary
reply. Merely seeing or aiming at an automatic keepsake no longer opens that
presentation. Confirmed multiplayer pickups use the same personal-feedback path;
the host's claim authority and payment rules are unchanged.

## Shared goals

Host selection, contribution limits, synchronized progress and participant
rewards are unchanged. Automatic suggestions and halfway notes go to Recent.
Completion feedback and thanks remain visible for actual participants; unrelated
players receive a quiet completion note.

The world card appears during matching local fishing or netting, while the
watering can is selected for a water goal, or for eight seconds after a confirmed
local contribution. It yields to rooms, dialogs, photo mode and another activity
camera subject. A single one-second watch updates that visibility only while a
current goal is in the viewed live garden, and retires on clear or leave.

**Menu → Goals** provides the explicit shared-goal summary even while the world
card is quiet. It shows total progress and the player's own contribution. The
host can skip the shared goal there. Hiding a world card does not stop counting
or remove rewards.

Goals keeps one lead action: an active shared goal while one is available, or
the existing next step in the player's own garden. Daily goals, weekly quests,
coin details and other steps use labelled disclosures. Their existing reward
and action functions remain in use. Help is requested explicitly and starts
with short guidance, followed by task sections for controls, planting, fishing,
land/activities, friends and coins.

During a live or offline visit, personal next-step information is read-only
under **At home: your next step**. Its action returns home without executing the
step. An existing home-action callback also checks the current visit context
before running. Personal daily/weekly/coin sections are labelled as the
player's own progress. With no shared goal, the visit lead simply returns to
the viewed garden; with one, the host's shared goal leads instead.

An already-open Goals panel follows shared round, total, status and local
contribution changes through the existing goal update calls. A small render
key limits refreshes to changed summary content; no additional timer, network
message or scene repaint is introduced. The normal popup focus/disclosure
restoration applies to these refreshes too.

Routine popup refreshes preserve the focused action by its stable item or
section identity, rather than its position in the list. Open and closed
disclosures and scroll remain local to that panel. An unavailable action falls
back to Close; a refresh does not pull focus from elsewhere. Editing fields and
the Trick book retain their existing independent refresh rules.

## HUD and land

The default status display shows level and coins. Selecting it opens XP,
resources and weather details. Map and View are temporary panels: Map provides
navigation and a whole-garden fit action; View contains camera controls and a
compact controls reference. Menu groups actions under Garden, Explore,
Play & friends, and View & help. Moves, phrases and group photos are requested
there rather than occupying persistent quick-action pills. Harvest, watering
and Undo remain contextual quick actions.

Automatic visit-ticket receipts and notes about a friend's local wildlife go
to Recent. Summaries of queued work by friends retain the existing diary and
also enter Recent while the owner is viewing their own garden. These facts no
longer schedule a sequence of popup messages. Ticket payments, discovery marks,
queued actions and acknowledgements keep their existing paths.

The map, status, view and menu panels close when another is selected or the
player returns to the world. Existing movement, interaction, bag, camera and
emote shortcuts remain available. Plant need markers stay limited to the few
nearest plants, with quieter ground rings for the others.

Moves focuses its first action when opened. Escape or Q closes it once and
returns focus to a visible opener, or to the garden if that opener has gone.
An outside pointer click closes it without taking focus from the clicked
control. Fishing and net cancellation keep priority over closing Moves.

Land presentation emphasizes the next reachable closed boundary. Already-open
ordinary gates are not repeated throughout the garden, while saved custom gate
facades remain visible. Landmark arches still describe regions. Plot boundaries,
survey pegs, wild growth, mist and water-edge markers convey the landscape;
prices and requirements are obtained through an intentional land inspection or
the land office instead of repeated sales plaques. These are presentation
changes: zone membership, collisions, access, purchase prices and unlock rules
keep their existing authority.

## Actual play evidence

`freeflo-lake-requested-copy24-1793907047593` physically opened **Catch → The
lake** on desktop and at 430px. The actual favoured/caught facts selected the
none-known sentence once, with no repeated placeholder names. The natural
storm title stayed on one line while its description wrapped to two within
the narrow panel. Close worked and catch history stayed unchanged, with active
continuous observers and no captured application errors or incomplete
observations. The mixed/all-known and visitor branches were not separately
played in this focused observation.

The direct-entry rain observation
`freeflo-rain-quiet-lake23-1793905352652` made one normal cached provider
request after opening straight into Garden. Its code-63 rain produced 16
natural puddles. Physical desktop walking reached wet feet, native tracks and
rings; desktop and 430px wheel zoom worked in both directions. Actor/pet
reflections and actor shadows drew where eligible. Leaving cleared the old
surface, and physical Life/Garden navigation created a new rainy scene.
The document-start lake/message observer captured no lake banner or event
popup. The storm entered Recent through `lake-event:storm`, and physically
opening **Catch → The lake** still showed its current conditions. No captured
application errors or incomplete observations were recorded. These are
focused local play facts, not a frame-rate claim or every device/weather.

The focused Bag observation `freeflo-bag-shortcuts-before22-1793902889028`
found that 2/6 did nothing while Close had focus and Q opened the dashboard's
quick-task form. The first repair enabled all three representative shortcuts
but exposed a Moves wheel that remained open after Escape. In
`freeflo-bag-shortcuts-moves-escape22-1793903910673`, physical Bag opening,
2/6/Q, Moves focus and first-Escape dismissal passed on desktop and at 430px.
Focus returned to the garden and a second Escape left Moves closed. A real
held seed drag was cancelled with 2 before pointer release; the intentional
key worked inside the pointer guard and the later HUD release left inventory,
coins, plants and decorations unchanged. Both active observers captured no
application errors. This covers those focused flows, not every shortcut or
device.

The focused 2.63.18 observations below reached their recorded outcomes through
ordinary input in isolated synthetic gardens:

- `freeflo-shop-bag-fresh-18-1793896164561` observed current/future stock,
  category preservation, a typed future-item search with its real lock reason,
  refusal of a locked purchase without spending, and an ordinary seed purchase
  at the unchanged price. Bag names, counts, close/Shop actions and ordinary
  seed selection worked on desktop and at 430px. Selection alone did not spend
  a seed, and the Shop and Bag fit the narrow viewport.
- `freeflo-shop-bag-owned-low-18-1793896197148` repeated those actions in a
  declared level-1 garden that already owned higher-level seeds, an upgraded
  can and a stone bench, including one placed copy. The current catalogue kept
  those possessions visible with their existing lock/ownership rules. The
  placed bench remained unchanged.
- `freeflo-calm-visit-18-1793896108272` used a real encrypted visit. The actual
  gate-ticket ledger entry and receipt remained, and naturally different local
  wildlife produced its normal discovery-day mark and Recent note. A verified
  observer running from document start captured no popup for either arrival
  fact. Owner and visitor saw the current kite card, packing cleared it for both,
  and normal Leave returned home without delayed arrival narration during the
  following 5.5 seconds. The ticket reward remained unchanged at home.

All three observations recorded passing coverage fields and no captured errors.
The initial narrow Bag render exposed a walking hint behind the open inventory.
A subsequent keyboard check also found that Escape did not close the Bag when
its new Close control had focus: native input yielded to a dialog, but the HUD
did not yet own that Bag key. The Bag now owns Escape/B through the existing HUD
input priority, retaining active fishing/net cancellation priority.

`freeflo-shop-bag-hint-keys-final-18-1793896651860` observed the final changes with
all recorded coverage fields passing and no captured errors. The walking hint
hid while the Bag was open and returned, still unlearned, after closing. Escape
and B closed the focused Bag and returned focus to the stage. Normal Shop and
Bag actions and the 430px layout also passed in this replay. The declared empty
inventory naturally received the game's normal starter seed and materials
reward, so empty-Bag copy itself remained unobserved; no gifts were removed to
manufacture that state. The earlier fixture assumption and actual keyboard
failure remain in separate artifacts.

Offline host-return queue processing was not exercised in the visit observation;
its narration change is source-described. New drag/drop outcomes and every
possible viewport or device are also outside these focused observations.

The records below establish the preceding calm-garden behavior.

`freeflo-catch-ribbon-21-1793902304648` reached a natural new catch and first-catch
ribbon. Settled frames showed the native held fish, result text and inline
ribbon; the actual ribbon mark and Recent receipt existed, with no separate
ribbon message. A real second cast then cancelled through Help, preserving the
catch ledger. No errors were captured. The player reflection was absent only
from that upper-pier cast, whose geometry is documented in the engine notes;
this was not treated as a failed reflection requirement.

The warm Help palette was observed on desktop and at 430px in
`freeflo-goals-help-warm-dark-21-1793902179297` with the fixture's light app
theme, then `freeflo-goals-help-actual-dark-21-1793902379979` with a declared
dark app preference. The first run's emulated browser preference alone did not
change the app preference; both actual root themes were recorded. Both kept
the cream surface and dark ink, and all recorded controls, focus, disclosure
and layout fields passed without errors or inventory changes.

The visit-context observation `freeflo-goals-visit-20-1793900609089` exposed a
personal harvest action while visiting an empty host garden. The first repair
corrected that action but `freeflo-goals-visit-after20-1793901073557` then found
that a naturally arriving shared goal did not replace an already-open visit
lead. The final `freeflo-goals-visit-shared-fixed-20-1793901367467` reached every
recorded coverage field with no captured errors: a real encrypted visit kept
personal actions unavailable, showed clearly named home progress, refreshed to
the natural shared goal without reopening, and returned home only through its
explicit button. The normal home action appeared there without executing it;
both gardens' owned plants remained unchanged. No questionable harvest action
was clicked to manufacture evidence.

The 2.63.19 records include:

- `freeflo-popup-focus-fixed-19-1793899769584`: physical seed/tool purchases
  updated inventory and rebuilt the actual Shop controls while focus followed
  the same item. Play group pointer/keyboard navigation, real saves, open and
  closed Goals disclosures and summary focus remained usable. Focus already
  on header Close stayed there. Buying a one-time tool removed its Buy action
  and correctly returned focus to Close.
- `freeflo-goals-help-settled-19-1793900436575`: one named Goals lead, optional
  original daily/weekly/coin contents, physical keyboard disclosure toggles,
  Help topics, Tab wrap, Close/Escape, input stopping and 430px touch layouts
  passed without spending or changing inventory. Panel entrance animations
  were allowed to finish before measuring viewport geometry.
- `freeflo-placement-carry-fixed-19-1793900297045`: physical seed/decor selection,
  legal clicks and Bag drags each created and spent exactly one item. Occupied
  cells and water refused placement without spending. Release over the Bag,
  selected-item Escape and held-drag Escape followed by physical release left
  stock and positions unchanged. Normal saving/reload preserved owned counts
  and reattached the native objects; 430px selection/cancellation worked.

All recorded coverage fields passed and no errors were captured in these final
observations. Earlier artifacts exposed actual drag-cancellation and panel-drop
defects before their repair. Other initial helper failures involved a shadowed
fixture function, incomplete synthetic Enter input, a moving entrance rectangle,
and a planting target hidden by landmark artwork; those are not product passes
or additional runtime defects. Placement comparisons retain the full records
and separately report unrelated earned ticket/material/currency changes instead
of mistaking a reward for a placement spend. Touch dragging, all assistive
technologies and active shared/fishing Help contexts remain outside these
focused records unless separately reached.

An ordinary native HUD observation established the renderer issue:
`freeflo-native-hud-before-19-1793898886485` recorded a full world sync on the
public UI refresh following each Bag/Menu open and close. The unchanged garden
in `freeflo-native-hud-after-19-1793899395683` instead reused the world for each
of those actions, while real tool changes still caused the expected sync.
Inventory, plants and player position stayed unchanged, controls worked, and no
errors were captured. This observes refresh ownership, not a general FPS claim.

The integration owner completed the following isolated ordinary-play
observations. All recorded coverage fields passed, and their final
`observation.json` files have `errors: []`. Fresh and shared-play observations
were repeated with a verified post-ready observer and an independent early-error
hook after a document-start monitoring gap was found in the earlier helper.

- **Fresh garden:** `freeflo-calm-fresh-observed-16-1793893508641` observed a declared
  level-1 garden with no selected activity, plants, bench or late discoveries.
  No optional workshops appeared. Physical Play browsing showed one default
  group and only the upcoming kite note. A real boundary face opened its normal
  requirements, and the land office remained deliberately accessible. No
  unsolicited inventory appeared; actual walking dismissed the first-use tip.
- **HUD:** `freeflo-garden-hud-key-routing-16-1793890905714` observed physical
  pointer and keyboard controls on desktop and emulated touch at 430px width.
  Status, Map, View and the grouped menu opened on demand. Menu arrow navigation
  and Escape, camera buttons and keys, the map Fit action, native walking-tip
  dismissal/save, and Leave/remount passed. This final run includes the native
  input/HUD key-priority repair, tip-contrast adjustment and quieter seasonal
  narration. It is one local browser observation, not coverage of every device.
- **Mature encrypted pair:** `freeflo-calm-pair-observed-16-1793893536523`
  observed a host physically choose the kite and both players hold lines. The
  visitor followed host `aw:1` while its own published selection remained
  `aw:0`, and its activity list contained only the host's choice. Physical host
  selection switched both pages to marble and retired the kite. The visitor
  operated the bridge, the host cranked, and **Put it away** during rolling
  cleared the activity and camera subject on both pages, with `aw:0` saved.
  The acquired bench, 12 plants and existing inventory remained. Quiet walking
  continued for 26 seconds beyond joining, covering the ordinary shared-goal
  delay. Both verified observers recorded zero goal, found-card or message
  mutations during that quiet phase, with no unrelated overlay in the sampled
  views. Goals
  displayed its shared summary on request; unowned-plot prices and the land
  office remained accessible.

A focused unchanged visit,
`freeflo-calm-goal-kite-observed-16-1793893648012`, naturally selected fishing.
Ordinary physical casting displayed the matching goal card and casting hold;
Escape ended the cast and removed the card. Walking with Hand had no goal card
on either page. No fish landing, completion or reward was fabricated.

A separate natural water visit,
`freeflo-calm-goal-kite-water-context-16-1793893749864`, exposed a presentation
defect: retaining the watering can while physically starting the kite left the
water goal card visible over the chosen activity. Version 2.63.17 moves the
photo/activity visibility guard ahead of the water-tool shortcut.

The focused 2.63.17 replay,
`freeflo-calm-goal-priority-17-1793893862612`, naturally reached water and passed
every recorded coverage field with no captured errors. Physical can/Hand
selection showed and hid the goal card. The accepted kite line retained the can
and the kite camera, while the unrelated goal card stayed hidden. Packing the
kite away cleared its shared setup before ordinary Water all actions. The host
contributed three of four plants at the normal per-player cap; the visitor
contributed the remaining one. Both pages agreed on counts and contributors.
The short contribution grace expired, participants received thanks and normal
ledger rewards, and the same reward entries stayed stable across normal
resends. Completion subsequently retired both the goal and its cards.

The photo guard shares the corrected priority but did not receive a separate
photo-mode observation. A new natural keepsake pickup, fish landing/rewards and
bug-goal completion were also not established by these focused observations.

Earlier helper failures remain separate from these successful final runs: one
walk expression was malformed, and one observer read an internal slots shape
instead of the public participants field. Earlier fresh/shared helpers also
attempted to start DOM monitoring before the document element existed; their
physical input and state records remain useful, but their empty message/error
logs did not establish continuous monitoring. The repeated observations above
require an active versioned observer, capture errors before DOM availability,
and retain per-phase message counters. The initial HUD focus failure led to
the actual input-priority repair before the final successful HUD observation.
No actors, poses, phases, random choices, packets or outcomes were assigned after
boot to create the final results. Further natural events should remain explicitly
unobserved until ordinary play reaches them.
