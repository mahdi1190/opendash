/* ============================================================
   SCENE ENGINE: the kits and the archetype index (pure data;
   docs/dev/SCENE_ENGINE.md, sections 2.7 and 8.5).

   SCENE_KITS / SCENE_ROLES   the tags every library object carries:
       at least one kit:<kit> and exactly one role:<role> (landmarks
       excepted). Archetypes pick objects by kit and role
       (sceneKitPick), so a new object reaches every scene of its kit.
   SCENE_REGION_KITS          the default kits of a region scene: by
       region group (first match wins; 'uk-*' is a prefix), then by
       climate, plus `always`.
   SCENE_ARCHETYPE_INDEX      every archetype the upgrade path knows,
       BUILT or not: `scene upgrade` scores them against an item's tags
       and words (hints) and falls back to 'basic' while the suggested
       one is not built (sceneArchetype(id) is null).
   SCENE_REGION_PARAMS        the parameters every region archetype
       takes (8.5); `palette` is the one `scene upgrade` lifts from the
       old art.
   ============================================================ */
const SCENE_KITS = Object.freeze(['temperate', 'tropical', 'arid', 'alpine', 'mediterranean', 'polar', 'urban',
  'towers', 'shophouse', 'east-asian', 'south-asian', 'islamic', 'adobe', 'brownstone', 'colonial', 'london',
  'people', 'vehicles', 'boats', 'birds', 'animals', 'water']);
const SCENE_ROLES = Object.freeze(['tree', 'shrub', 'ground', 'edge', 'rock', 'building-far', 'building-mid', 'building-near',
  'street', 'walker', 'vehicle', 'boat', 'bird', 'animal', 'sky']);
const SCENE_REGION_KITS = Object.freeze({
  'asia-southeast': ['tropical', 'shophouse', 'urban'], 'asia-east': ['temperate', 'east-asian', 'urban'],
  'asia-south': ['tropical', 'south-asian', 'urban'], 'asia-west': ['arid', 'islamic', 'urban'], 'asia-central': ['arid', 'alpine'],
  'us-northeast': ['temperate', 'brownstone', 'towers', 'urban'], 'us-southeast': ['temperate', 'colonial', 'urban'],
  'us-midwest': ['temperate', 'towers', 'urban'], 'us-mountain': ['alpine', 'arid'], 'us-pacific': ['temperate', 'alpine', 'towers'],
  texas: ['arid', 'adobe', 'towers'], 'uk-*': ['temperate', 'london', 'urban'],
  climate: Object.freeze({ tropical: ['tropical'], arid: ['arid'], alpine: ['alpine'], temperate: ['temperate'], polar: ['polar'], mediterranean: ['mediterranean'] }),
  always: ['people', 'vehicles', 'boats', 'birds', 'water'],
});
/** The moments a scene may be authored at (scene.at; the SCENE_REGION_PARAMS enum). */
const SCENE_AT_MOMENTS = Object.freeze(['dawn', 'morning', 'day', 'noon', 'afternoon', 'golden', 'sunset', 'dusk', 'night']);
/**
 * The archetype index (8.5). `hints` are matched against an item's tags (+2 each) and its label and site words (+1 each);
 * `water` is the default water param, `setting` the scene setting, `slots` how many landmarks it holds.
 */
const SCENE_ARCHETYPE_INDEX = Object.freeze([
  { id: 'skyline-water', what: 'a city skyline over a bay, harbour or wide river', hints: ['skyline', 'bay', 'harbour', 'harbor', 'towers', 'tower', 'river', 'waterfront', 'supertrees', 'bridge', 'marina', 'skyscraper'], water: 'bay', setting: 'urban', slots: [1, 3] },
  { id: 'river-city', what: 'a river town: the far bank skyline across water', hints: ['river', 'riverboat', 'barge', 'longtail', 'quay', 'embankment', 'canal-city'], water: 'river', setting: 'urban', slots: [1, 2] },
  { id: 'harbour', what: 'a working port: quays, cranes and boats', hints: ['harbour', 'harbor', 'port', 'docks', 'cranes', 'fishing', 'ferry', 'quay', 'boats', 'shipyard'], water: 'sea', setting: 'mixed', slots: [1, 1] },
  { id: 'historic-street', what: 'an old-town street to a landmark at the vanishing point', hints: ['old-town', 'street', 'historic', 'shophouse', 'lanterns', 'alley', 'french-quarter', 'colonial', 'market', 'brownstone', 'deco', 'neon'], water: 'none', setting: 'urban', slots: [1, 1] },
  { id: 'plaza', what: 'a square in front of a central monument', hints: ['plaza', 'square', 'stupa', 'monument', 'palace', 'capitol', 'mosque', 'cathedral', 'memorial', 'fountain', 'statue'], water: 'none', setting: 'urban', slots: [1, 1] },
  { id: 'temple-mountain', what: 'a temple or pagoda before a mountain', hints: ['temple', 'pagoda', 'shrine', 'mountain', 'fuji', 'monastery', 'volcano', 'peak', 'cherry', 'blossom', 'torii'], water: 'none', setting: 'mixed', slots: [2, 2] },
  { id: 'temple-water', what: 'a temple across water with its reflection', hints: ['temple', 'wat', 'tank', 'ghat', 'lotus', 'reflection', 'moat', 'angkor', 'pagoda-lake'], water: 'lake', setting: 'mixed', slots: [1, 2] },
  { id: 'desert', what: 'mesas, dunes and canyons', hints: ['desert', 'dunes', 'canyon', 'mesa', 'arid', 'saguaro', 'hoodoos', 'sand', 'red-rock', 'wadi'], water: 'none', setting: 'natural', slots: [0, 1] },
  { id: 'beach-coast', what: 'a beach, surf and a headland', hints: ['beach', 'coast', 'surf', 'island', 'lighthouse', 'pier', 'lagoon', 'atoll', 'cliffs', 'sea'], water: 'sea', setting: 'natural', slots: [0, 1] },
  { id: 'mountain-lake', what: 'peaks over a lake with their reflection', hints: ['lake', 'peaks', 'alpine', 'mountain', 'glacier', 'reflection', 'forest', 'crater'], water: 'lake', setting: 'natural', slots: [1, 1] },
  { id: 'park', what: 'a city park before a skyline', hints: ['park', 'garden', 'gardens', 'lawn', 'trees', 'botanic', 'central-park', 'fountain'], water: 'pond', setting: 'mixed', slots: [0, 2] },
  { id: 'snow-town', what: 'a lit town in snow under peaks', hints: ['snow', 'winter', 'aurora', 'ski', 'arctic', 'ice', 'cabin', 'frost'], water: 'none', setting: 'mixed', slots: [0, 1] },
  { id: 'plains', what: 'open farmland, prairie, rice terraces or savannah', hints: ['plains', 'prairie', 'farm', 'farmland', 'wheat', 'fields', 'rice', 'terraces', 'barn', 'cattle', 'savannah', 'steppe'], water: 'none', setting: 'natural', slots: [0, 1] },
  { id: 'station', what: 'a London rail station with its street (signage: true)', hints: ['station', 'rail', 'tube', 'underground', 'platform', 'train'], water: 'none', setting: 'urban', slots: [1, 1], signs: true },
]);
const SCENE_REGION_PARAMS = Object.freeze({
  id: 'id', lat: 'number', lon: 'number', heading: 'number', at: SCENE_AT_MOMENTS,
  climate: ['temperate', 'tropical', 'arid', 'alpine', 'mediterranean', 'polar'], kits: 'list', landmarks: 'list',
  water: ['none', 'bay', 'river', 'lake', 'sea', 'pond', 'canal'], horizon: 'number', density: 'number', palette: 'object',
});
/** The default kits of a region scene: the group's (first match; 'uk-*' is a prefix), else the climate's, plus `always`. */
function sceneRegionKits(group, climate) {
  const K = SCENE_REGION_KITS;
  let base = null;
  for (const [k, v] of Object.entries(K)) {
    if (k === 'climate' || k === 'always') continue;
    if (k === group || (k.endsWith('*') && String(group || '').startsWith(k.slice(0, -1)))) { base = v; break; }
  }
  if (!base) base = K.climate[climate] || K.climate.temperate;
  return [...new Set([...base, ...K.always])];
}
