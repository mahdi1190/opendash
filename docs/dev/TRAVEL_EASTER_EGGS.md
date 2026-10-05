# Travel Easter eggs

48 authored, contextual messages, selected only from matching triggers. These are copy and timing enhancements to existing illustrated motion scenes, not 48 new SVG scenes.

Location openings keep the real town title and landmark caption. UK, US, Texas, Asian and other location openings share one three-display/five-minute welcome budget, including across page reloads. Matching surprises share that same budget: at most three actual displays or five minutes after an arrival, whichever comes first. Reads do not spend it; reloads do not reset it. Small device movements below 3 km do not count as town changes. Timed welcome stages and home postcards gain 2.5 seconds; international arrival dialogs remain open until dismissed and can always be closed immediately.

During the first three actual openings or five minutes, exact-town artwork takes precedence over nearby scenes and a pin for another town. The first observed location also gets this artwork preference. After the window, normal nearby rotation resumes. Disabled/blocked scenes remain excluded; without exact-town artwork, the nearby pool remains the fallback.

Distances measure displacement between locations, not a route or cumulative mileage. Manual location edits can trigger distance-based scene-change messages; they do not claim a physical trip or a geographical crossing. Easter egg arrivals promote the playful message to the main headline while keeping the town visible. Country and clock messages use the existing Travel feature and its known country/timezone inputs; no new reverse-geocoding service or background GPS tracking is added.

The per-device location memory is bounded: the current coordinate anchor, twelve town keys, twelve visit counters/timestamps and twelve recent arrival timestamps. It also keeps the current eligible message pool and at most three used message ids until the arrival window ends. It does not store a GPS route. Older installations begin learning patterns as new arrivals happen; missing history is not fabricated. Travel country returns reuse existing shown-moment keys.

Openings choose the strongest unused matching message, with random selection between equally ranked choices. Only the strongest distance band is eligible. Once every matching message has played, reuse is allowed while avoiding an immediate repeat when alternatives exist. The next pick is saved across reloads. Travel arrival cards choose deterministically within the highest tier.

Priority order: birthday (100); 7,500-mile journey (95); 5,000-mile journey (92); country change/homecoming (90); geographic changes (85); 500?2,500-mile journeys (80); calendar date changes (75); clock shifts/month-long returns (70); visit milestones (65); 250-mile changes (60); quick/weekend returns (55); familiar places (50); 100-mile changes (45); local wordplay (40); time-of-day jokes (30).

Tone is selectively cheeky: big distances and busy travel patterns can get mild swearing and playful exaggeration. Birthdays, homecomings and sensitive place names keep warmer wording. Jokes target the situation, never nationalities or local residents. Birthday and clock details use the effective dashboard clock. UK pattern counts use rolling 24-hour/seven-day windows. Motion off uses the existing plain arrival treatment.

| # | Moment | Trigger |
|---|---|---|
| 1 | Birthday side quest unlocked. | Arrival on the configured birthday |
| 2 | Over 7,500 miles? Jesus Christ, did you leave anything for tomorrow? | 7,500+ straight-line miles |
| 3 | Over 5,000 miles. Was the nearest coffee shop shut? | 5,000+ straight-line miles |
| 4 | Over 2,500 miles. Bit dramatic for a change of scenery. | 2,500+ straight-line miles |
| 5 | Jesus Christ, you travelled over 1,000 miles. Casual little outing? | 1,000+ straight-line miles |
| 6 | Over 500 miles. A tiny change of scenery, obviously. | 500+ straight-line miles |
| 7 | Over 250 miles. Popping out, were you? | 250+ straight-line miles |
| 8 | New scenery unlocked. | 100+ straight-line miles |
| 9 | Changed hemispheres. Still haven't closed those tabs. | Opposite latitude signs, at least 3 degrees each side |
| 10 | Longitude just did a plot twist. | Opposite sides of the 180-degree meridian |
| 11 | Your compass picked the upstairs option. | 10+ degrees northward |
| 12 | Your compass picked the downstairs option. | 10+ degrees southward |
| 13 | A whole new column on the globe. | 45+ degrees of longitude (excluding the date-line case) |
| 14 | Back on familiar map pages. | Returning across a country boundary to the home country |
| 15 | This country gets a sequel. | Arrival in a previously welcomed country |
| 16 | New country, new chapter. | Different known country codes |
| 17 | Even the minutes moved. | Non-whole-hour shift from the home clock |
| 18 | Your clock is eight hours away. Good luck explaining your sleep schedule. | 8+ hours from the home clock |
| 19 | Same you. New clock. | 3+ hours from the home clock |
| 20 | Already in tomorrow? Show-off. | Local date ahead of home |
| 21 | You got yesterday back. Try not to waste it twice. | Local date behind home |
| 22 | Three towns in a day. Sit down for a bloody minute. | 3+ distinct towns in the last 24 hours |
| 23 | Five towns this week. The map would like a day off. | 5+ distinct towns in seven days |
| 24 | Back already? Forget something, or just missed the entrance? | Returning within 24 hours |
| 25 | Previously, on your dashboard... | Returning after 30+ days |
| 26 | A trilogy deserves a good entrance. | Third recorded visit |
| 27 | Five visits. Shall we just leave your name on the door? | Fifth or later recorded visit |
| 28 | The sequel looks good on you. | Previously seen town |
| 29 | Weekend sequel unlocked. | Returning on Saturday or Sunday |
| 30 | Making an entrance at this hour? Very subtle. | 22:00-04:59 local arrival |
| 31 | Before eight? Disgustingly organised. | 05:00-07:59 local arrival |
| 32 | New location. Please tell me lunch was involved. | 11:00-13:59 local arrival |
| 33 | Friday got a location upgrade. | Friday from 16:00 |
| 34 | Sunday has a bonus scene. | Sunday arrival |
| 35 | Fleet by name. No need to rush. | Arrival in fleet |
| 36 | Yateley. You can stop the dramatic entrance now. | Arrival in yateley |
| 37 | Sheffield has entered the chat. | Arrival in sheffield |
| 38 | Manchester has entered the chat. | Arrival in manchester |
| 39 | Reading? The plot thickens. | Arrival in reading |
| 40 | Bath has made a splash. | Arrival in bath |
| 41 | York turn to make an entrance. | Arrival in york |
| 42 | Oxford: a fresh page. | Arrival in oxford |
| 43 | Cambridge has joined the group project. | Arrival in cambridge |
| 44 | Edinburgh gets the opening credits. | Arrival in edinburgh |
| 45 | Glasgow has entered the scene. | Arrival in glasgow |
| 46 | Cardiff has joined the cast. | Arrival in cardiff |
| 47 | Belfast gets a grand entrance. | Arrival in belfast |
| 48 | A fresh chapter in Derry/Londonderry. | Arrival in derry |

Implementation: `69-travel-moments-logic.js`, `69-travel-moments.js`, `78-anim-uk.js` and `78-anim-wire.js`. Tests cover all 48 reachable messages, eligibility, hierarchy, random ties, unused-message rotation, reload persistence, expiry, bounded history, escaping and the extra hold time.
