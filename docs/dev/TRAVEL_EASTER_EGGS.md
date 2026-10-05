# Travel Easter eggs

48 authored, contextual messages, selected only from matching triggers. These are copy and timing enhancements to existing illustrated motion scenes, not 48 new SVG scenes.

UK location arrivals keep the real town title and nearby landmark caption. A surprise appears once per arrival, expires with the five-minute welcome window, and has a six-hour cooldown. The normal three-display/five-minute welcome limit still applies. Small device movements below 3 km do not count as town changes. Timed welcome stages and home postcards gain 2.5 seconds; international arrival dialogs remain open until dismissed and can always be closed immediately.

Distances measure displacement between locations, not a route or cumulative mileage. Manual location edits do not trigger distance or geographical travel claims. Country and clock messages use the existing Travel feature and its known country/timezone inputs; no new reverse-geocoding service or background GPS tracking is added.

The per-device UK memory is bounded: the current coordinate anchor, twelve town keys, twelve visit counters/timestamps and twelve recent arrival timestamps. It does not store a GPS route. Older installations begin learning patterns as new arrivals happen; missing history is not fabricated. Travel country returns reuse existing shown-moment keys.

If several triggers match, a deterministic sequence varies the chosen message. Birthday and clock details use the effective dashboard clock. UK pattern counts use rolling 24-hour/seven-day windows. Motion off uses the existing plain arrival treatment.

| # | Moment | Trigger |
|---|---|---|
| 1 | Birthday side quest unlocked. | Arrival on the configured birthday |
| 2 | Same dashboard. Quite the plot twist. | 7,500+ straight-line miles |
| 3 | Your dashboard deserves a window seat. | 5,000+ straight-line miles |
| 4 | That is a serious scene change. | 2,500+ straight-line miles |
| 5 | Wow, you travelled a lot. | 1,000+ straight-line miles |
| 6 | Your dashboard packed light. | 500+ straight-line miles |
| 7 | That was quite a hop. | 250+ straight-line miles |
| 8 | New scenery unlocked. | 100+ straight-line miles |
| 9 | New hemisphere. Same open tabs. | Opposite latitude signs, at least 3 degrees each side |
| 10 | Longitude just did a plot twist. | Opposite sides of the 180-degree meridian |
| 11 | Your compass picked the upstairs option. | 10+ degrees northward |
| 12 | Your compass picked the downstairs option. | 10+ degrees southward |
| 13 | A whole new column on the globe. | 45+ degrees of longitude (excluding the date-line case) |
| 14 | Back on familiar map pages. | Returning across a country boundary to the home country |
| 15 | This country gets a sequel. | Arrival in a previously welcomed country |
| 16 | New country, new chapter. | Different known country codes |
| 17 | Even the minutes moved. | Non-whole-hour shift from the home clock |
| 18 | Your clock has entered a new era. | 8+ hours from the home clock |
| 19 | Same you. New clock. | 3+ hours from the home clock |
| 20 | Tomorrow called. You answered. | Local date ahead of home |
| 21 | Today got an extended edition. | Local date behind home |
| 22 | Your day has multiple filming locations. | 3+ distinct towns in the last 24 hours |
| 23 | A week with quite the guest list. | 5+ distinct towns in seven days |
| 24 | Back already? The sequel was fast. | Returning within 24 hours |
| 25 | Previously, on your dashboard... | Returning after 30+ days |
| 26 | A trilogy deserves a good entrance. | Third recorded visit |
| 27 | This place is becoming a recurring character. | Fifth or later recorded visit |
| 28 | The sequel looks good on you. | Previously seen town |
| 29 | Weekend sequel unlocked. | Returning on Saturday or Sunday |
| 30 | A late entrance. Nicely done. | 22:00-04:59 local arrival |
| 31 | The opening credits started early. | 05:00-07:59 local arrival |
| 32 | A new location on the lunch menu. | 11:00-13:59 local arrival |
| 33 | Friday got a location upgrade. | Friday from 16:00 |
| 34 | Sunday has a bonus scene. | Sunday arrival |
| 35 | Fleet by name. No need to rush. | Arrival in fleet |
| 36 | Small town. Grand entrance. | Arrival in yateley |
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

Implementation: `69-travel-moments-logic.js`, `69-travel-moments.js`, `78-anim-uk.js` and `78-anim-wire.js`. Tests cover all 48 reachable messages, eligibility, deterministic selection, cooldown, expiry, bounded history, escaping and the extra hold time.
