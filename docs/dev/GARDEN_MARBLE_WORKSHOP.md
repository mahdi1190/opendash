# The marble workshop

The machine stays packed away until the owner chooses it through **Play → In
the garden**, from garden level eight. Only one optional setup is out at a time;
**Put it away** shelves it for everyone in the visit. See
[Garden pacing](GARDEN_PACING.md). Existing transient run, authority and control
rules below still apply while it is out.

`src/app/94-garden-wonder-f-marble.js` owns one transient rail machine. It adds
no world physics, wallet entry, persistent reward or course editor. The larger
`art-marble-run-engineering` construction concept remains a candidate.

The left fork selects the blue or amber bell lane. The right bridge selects
the return cup or finish cup. A crank lifts the same marble for each circuit;
the return cup catches it while players choose the next route. Ringing both
branch bells across circuits allows a complete finish. An early finish remains
incomplete, and the recovery handle clears the lamps and returns the marble.
Solo players can walk between the mechanisms; visitors can operate other sides.

## Authority and messages

The host advances distance and velocity over seven authored sampled curves.
Only its real rail crossings light the bell lamps and decide the cup result.
Visitors render accepted progress and request nearby handle operations. They
never send a marble position, velocity, bell contact or completion result.

The existing `gl:fx` family gains `c: 'marble'`:

| Step | Direction | Fields |
| --- | --- | --- |
| `set` | Visitor to host | `i` request, `p` controller, `n` fork/bridge 1/2, `ql` desired setting 1/2. |
| `roll` | Visitor to host | `i` request, `p` controller. |
| `reset` | Visitor to host | `i` request, `p` controller. |
| `state` | Host to visitors | `i` controller, `v` revision, `x/y` half-cell anchor, optional `p` acknowledgement, `mr` complete state. |

The exact ten-integer `mr` tuple is
`[attempt, phase, rail, progress1000, speed10, fork, bridge, bells, laps, running]`.
Phase is basket 0, rolling 1, caught 2, finished 3 or incomplete 4. Rail is lift
0, entry 1, blue 2, amber 3, merge 4, return 5 or finish 6. Gate values are 0/1;
the bell mask is 0..3. A stopped non-rolling state cannot claim `running: 1`.
The existing 512-byte FX cap and protocol version remain unchanged. Older peers
drop the unfamiliar family or tuple.

The host checks the current Play permission, actual actor location by the
requested handle, room/away state and held fishing/item state. Requests carry a
controller identity and unique nonce; bounded receipts retain accepted/rejected
outcomes, and a reset changes the controller identity. Repeated requests cannot
toggle a gate or launch another marble. Gates express the desired setting.
Only an accepted mechanical action releases that actor's soap wand or kite line;
reading the guide preserves those activities. Passive leaf-boat drift may remain.

Critical transitions publish complete state immediately. Active repair uses
2.2 seconds. State acknowledgements preserve queue order; only later state
without an acknowledgement can coalesce for that activity and recipient.
Snapshots send the current machine state to new visitors. Departure retires
per-slot command spacing; scene/session teardown clears transient play.

## Presentation and placement

The wooden board, rails, marble, bells, switch joints and five physical handle
sprites retain their native nodes. The existing wonder clock advances the small
simulation; nearby active presentation uses bounded updates and sleeps when
idle. Visitors extrapolate receipt age only within the accepted rail and smooth
their display. A host freeze, room or hidden view publishes `running: 0`; resume
starts with fresh progress. Local guest holds stop that presentation. Reduced
motion uses discrete positions and still joints while preserving the same rules.

Placement uses bounded half-cell candidates, canonical dry reachable approaches,
dry mounting points and projected course/title/handle clearance. Retained static
bounds reject foreground roofs and always-front gates. Typed catch-weather
washes are presentation, and rear planting does not cover the board at normal
world depth. The neighbouring shadow courtyard reserves its own art envelope.
Neither collisions, user objects nor rendering depth are changed to make room.
Classic uses authored tall-prop envelopes when retained bounds are absent.

Failed searches and successful-site checks cache scene, physical/design and
authored geometry identity. Idle ticks do not repeat a failed route scan.
Actual layout changes, remount or explicit Play retry invalidate it. The
diagnostic `gardenMarbleState().placement` explains eligibility and search count.
Camera priority 40 applies to nearby local interaction/help; a connected help
panel supplies its measured bottom inset. Saved walking zoom remains unchanged.

## Current rendered evidence

A synthetic local encrypted pair completed the repaired layout through physical
closed-gate solo blue/return then amber/finish, shared host-fork/visitor-bridge
play, both bell contacts, the star cup, an incomplete early finish and recovery.
Normal host freeze and cellar entry held authoritative progress for the visitor,
and fresh remount cleared the machine. The retained clear-site search selected
the same anchor on both pages and stayed at one search before remount. Physical
help opening kept the projected board above the actual panel top using its
measured inset; the ordinary Back to the board button closed it. The session
reported no application errors.

The first functional session had exposed roof obstruction, and a later read-only
probe identified storm presentation and rear scenery as false placement blockers.
Those placement rules and the authored footprint were repaired before the final
replay. An intermediate missed recovery was a helper coordinate sampled while
the camera still eased. Waiting for the real projection to settle and checking
each handle's accepted outcome resolved it without a production reset change;
passive pointer observations recorded the actual clicks. This is local two-page
evidence, not every renderer, device, performance level or public-relay condition.
