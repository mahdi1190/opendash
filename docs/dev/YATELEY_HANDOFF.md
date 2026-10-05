# Yateley animation and lighting handoff

Continue improving the drawings and lighting; this is a tested implementation
checkpoint, not a declaration that the artwork or all-pack lighting is finished.

## Start here

Read `CLAUDE.md`, `MODULES.md`, `docs/dev/ANIMATION_PACKS.md`,
`docs/dev/UK_PACK.md`, and `docs/dev/ANIMATION_ART_REVIEW.md` fully.
Inspect `git status` and `git diff` before editing. Preserve any local work.

The application is classic vanilla JavaScript, Node 20+, no npm dependencies.
Its source scripts are bundled with `node build.mjs`. The repository is public:
never commit user data, private configuration, tokens, logs or personal paths.
Do not experiment against the live dashboard. Use a temporary data directory.

## Implemented scope

- Yateley Common, Wyndham's Pool and Yateley Green each have four viewpoints
  and four seasonal versions per viewpoint: 48 registrations. Existing twelve
  scene references survive. Automatic local eligibility matches the calendar.
- The seasonal work is in commit `ec82cc4`. The application release version is
  still 2.4.5; source commits do not constitute a new packaged release.
- This checkpoint adds botanical sprays, paired plant stems, gorse and duck
  details, textured banks, stones, bees, fish, perched birds, squirrels and dog
  tail motion. They are illustrative, not documented wildlife sightings.
- The Yateley renderer in `72-anim-pack-uk-south-east-4.js` opts into `liveSky`.
  `animItemHtml` in `71-anim-registry.js` supplies a clock/location snapshot.
  The pure `almSceneLight` and `almMoonDiscPath` helpers are in the almanac.
- Solar elevation affects lighting and an artistic sky arc. Clock.now,
  Clock.zone and active coordinates supply the inputs. Stars twinkle at night.
- The lunar phase is the existing mean-lunation approximation: roughly a day
  of phase uncertainty. Moon altitude/visibility is not calculated.
- Lighting changes on rendering. Continuous updates without restarting object
  animations are not implemented. Other full-screen packs do not yet opt in.
- The other 46 Hampshire viewpoints still need the deeper composition rebuild.
  The thousand-scene expansion remains paused.

## Requested artistic improvement

The owner still considers the scenes too sparse and simplistic. Improve their
compositions substantially, rather than declaring another small polish finished.
Start with the 48 Yateley versions and demonstrate stronger full-screen artwork
before extending the same standard to Hampshire and the other UK scenes.

Draw substantial foreground objects, meaningful middle-distance activity and
believable distant silhouettes. Add species-appropriate branching and foliage,
irregular heather/gorse, ferns, grasses, roots, gravel, weathered wood, stones,
reed margins, water detail, grounded shadows and carefully placed wildlife.
Avoid generic rounded crowns, identical cloud pairs, fixed suns and reused
flocks behind every place. Use authentic local references and keep subjects
recognisable. Add detail without random clutter or invented landmarks.

Animate actual objects independently: insect wings and flight, duck movement
and wakes, bird heads/wings, squirrel paws and tails, walking limbs, dog tails,
swaying branches rooted correctly, falling leaves/petals and layered snow.
Animals should turn naturally rather than travel backwards through a loop.

## Seasons and live sky

Every viewpoint needs genuinely distinct seasonal vegetation and activity:

- Spring: fresh growth, smaller new leaves, catkins, flowers and blossom where
  suitable, drifting petals and appropriate young wildlife. Keep ornamental
  blossom around the green separate from the Common's heathland vegetation.
- Summer: warm golden light, full foliage, flowering heath and active insects.
- Autumn: brown/gold foliage, reduced leaves, falling leaves, litter and dry stems.
- Winter: white snowy ground/banks/objects, bare deciduous trees, layered snow,
  frost, frozen pond illustrations and suitable winter birds and behaviour.

Automatic selection uses spring March-May, summer June-August, autumn
September-November and winter December-February. The gallery keeps all versions.
Snow and ice are illustrated seasonal moods, not live weather measurements.

Finish the live lighting, then extend it to other full-screen scenes in batches:
use the effective timezone, DST, clock overrides and manual/device/travel
location consistently. Sunrise/sunset and solar elevation must drive dawn,
daylight, dusk and night. Move the sun as time passes and vary its seasonal
height. Light the whole environment, water and windows; dark UI must not force
daytime scenes into night. Remove baked-in duplicate suns and fixed crescents.
Show night stars and the current waxing/waning moon shape. Improve/document
phase accuracy and visibility where appropriate. Handle missing coordinates,
invalid zones and polar conditions. Remain offline with no new dependencies.

## Constraints and verification

Keep full 1600x900 SVGs, central 1200x800 subjects, 160-unit drifting overscan,
fresh `U()` ids, and `finish()` last. Keep the 32,000-byte rendered limit.
Generate repeated detail with seeded loops and shared SVG definitions. Motion
uses `x-*` classes, `mv()`, transform/opacity, and `ap-uk` keyframes. Reduced
motion must remain a complete drawing. Preserve `.hx-lit` and `.hx-star`.
No text, logos, photos, external assets, scripts, handlers or foreignObject.
Preserve saved refs, proximity, current-location titles, landmark captions,
favourites, blocks, event priority and the existing opening sequence.

Use `tools/animation-inventory.mjs` and `tools/review-uk-pack.mjs`. The review
tool supports locality/season filters plus explicit `--at=`, `--location=lat,lon`
and `--zone=` inputs. Inspect every affected scene in light/dark, still/motion,
all seasons, dawn/noon/sunset/night and several moon phases. Use larger frames
and motion inspection as well as contact sheets; tests do not prove art quality.

Run syntax, pack tests, production build, the full npm test suite and the privacy
scan. The pack suite currently contains 38 checks, including all 48 live-sky
renders, seasonal eligibility, solar height, timezone invariance and phase shape.
Do not weaken checks or raise limits. Fix failures before publishing.

Update the changelog, module map and art audit honestly. Commit/push coherent
work. Update the regular local installation only through its safe updater,
preserving data and backups. Explicitly distinguish pushed source, installed
source and published releases. Report actual coverage and remaining weaknesses.
