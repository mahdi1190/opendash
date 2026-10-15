// World engine: character class tables (data only; docs/dev/WORLD_ENGINE.md 4; requirements A1-A11, Y4, M6).
//
// Each brain says what KIND of mover it is (how the life sim moves it), which nav layer it lives on, its radius (avoidance and
// nav dilation), a fallback height range by age (the knowledge base's worldKbSize wins when loaded), its turn time (seconds for
// 180 degrees: no instant turns), which drawn views exist ('five' = side, q-front, front, q-back, back + mirrors; 'side' = side
// only + mirror), its personal space (metres, scaled by the setting), and a state table. A state with speed > 0 moves (it
// follows its goal), speed 0 holds still and plays its clip; `pose` is what the body is doing (stand, sit, lie, swim, fly).
// `still` names what a moving state shows when the mover is held up (never walking on the spot, A4).
//
// kinds: walker (people, dogs, grazers, ground birds: grid nav), swimmer (water birds), wader (herons), boat (under way),
// moored (never moves), percher (perches and dives), flyer (circles), lane (cars, buses, cyclists on roads: traffic lanes),
// rail (trains and trams: the timetable).
// group: a formation spawned with the leader (A7): members { who, slot: [lateral, ahead] } and, for dogs, a lead length.
// react: the engine's reactions (M6): flee (from a 'scare' event), lift (pigeons from near walkers), freeze / strike (herons),
// ring (a cyclist on a shared path), feed (comes to a 'feed' event).

var WORLD_STATES = ['walk', 'turn', 'idle', 'look', 'sit', 'chat', 'graze', 'swim', 'dabble', 'preen', 'dive', 'fly', 'stalk',
  'freeze', 'strike', 'perch', 'ride', 'drive', 'stopped', 'wait', 'board', 'fish', 'feed', 'moored', 'cruise', 'hop'];

var _WBR_PERSON = { layer: 'walk', kind: 'walker', r: 0.25, ages: { adult: [1.6, 1.9], child: [1.0, 1.4], elderly: [1.55, 1.82] }, views: 'five', space: 1 };
function _wbrPerson(o) { return Object.assign({}, _WBR_PERSON, o); }

var worldBrains = {
  // ---- people (walk layer) ----
  stroll: _wbrPerson({ age: 'adult', turn: 0.5, start: 'walk', gait: [0.9, 1.1], states: {
    walk: { speed: [1.0, 1.35], dur: [8, 30], next: { walk: 0.8, look: 0.12, idle: 0.08 }, clip: 'walk', still: 'idle' },
    look: { speed: 0, dur: [1.5, 4], next: { walk: 1 }, clip: 'look' },
    idle: { speed: 0, dur: [1, 3], next: { walk: 1 }, clip: 'idle' },
    sit: { speed: 0, dur: [20, 60], next: { walk: 1 }, clip: 'sit', pose: 'sit' },
    chat: { speed: 0, dur: [6, 20], next: { walk: 1 }, clip: 'chat' } } }),
  brisk: _wbrPerson({ age: 'adult', turn: 0.4, start: 'walk', gait: [0.92, 1.1], states: {
    walk: { speed: [1.45, 1.75], dur: [20, 60], next: { walk: 0.95, look: 0.05 }, clip: 'walk', still: 'idle' },
    look: { speed: 0, dur: [0.8, 1.6], next: { walk: 1 }, clip: 'look' },
    idle: { speed: 0, dur: [0.6, 1.4], next: { walk: 1 }, clip: 'idle' } } }),
  jogger: _wbrPerson({ age: 'adult', turn: 0.35, start: 'walk', gait: [0.9, 1.12], states: {
    walk: { speed: [2.4, 3.2], dur: [30, 90], next: { walk: 1 }, clip: 'run', still: 'idle' },
    idle: { speed: 0, dur: [0.6, 1.4], next: { walk: 1 }, clip: 'idle' } } }),
  elderly: _wbrPerson({ age: 'elderly', r: 0.28, turn: 0.6, start: 'walk', gait: [0.85, 1.05], states: {
    walk: { speed: [0.6, 0.9], dur: [10, 30], next: { walk: 0.6, idle: 0.25, look: 0.15 }, clip: 'walk', still: 'idle' },
    idle: { speed: 0, dur: [2, 6], next: { walk: 1 }, clip: 'idle' },
    look: { speed: 0, dur: [2, 5], next: { walk: 1 }, clip: 'look' },
    sit: { speed: 0, dur: [20, 60], next: { walk: 1 }, clip: 'sit', pose: 'sit' } } }),
  child: _wbrPerson({ age: 'child', r: 0.2, turn: 0.3, start: 'walk', gait: [0.9, 1.15], states: {
    walk: { speed: [1.0, 1.9], dur: [4, 14], next: { walk: 0.7, idle: 0.15, look: 0.15 }, clip: 'walk', still: 'idle' },
    idle: { speed: 0, dur: [1, 3], next: { walk: 1 }, clip: 'idle' },
    look: { speed: 0, dur: [1, 3], next: { walk: 1 }, clip: 'look' } } }),
  'dog-walker': _wbrPerson({ age: 'adult', turn: 0.5, start: 'walk', gait: [0.9, 1.08], group: { kind: 'dog', members: [{ who: 'dog', slot: [0.7, 0.4] }], lead: [1.4, 2.0] }, states: {
    walk: { speed: [1.0, 1.3], dur: [10, 30], next: { walk: 0.85, idle: 0.15 }, clip: 'walk', still: 'idle' },
    idle: { speed: 0, dur: [2, 5], next: { walk: 1 }, clip: 'idle' } } }),
  birdwatcher: _wbrPerson({ age: 'adult', turn: 0.6, start: 'walk', gait: [0.88, 1.05], states: {
    walk: { speed: [0.8, 1.1], dur: [6, 18], next: { walk: 0.5, look: 0.5 }, clip: 'walk', still: 'idle' },
    look: { speed: 0, dur: [8, 30], next: { walk: 1 }, clip: 'look' },
    idle: { speed: 0, dur: [1, 3], next: { walk: 1 }, clip: 'idle' } } }),
  angler: _wbrPerson({ age: 'adult', turn: 0.6, start: 'walk', states: {
    walk: { speed: [0.9, 1.15], dur: [8, 20], next: { walk: 1 }, clip: 'walk', still: 'idle' },
    fish: { speed: 0, dur: [60, 240], next: { walk: 1 }, clip: 'fish' },
    idle: { speed: 0, dur: [1, 3], next: { walk: 1 }, clip: 'idle' } } }),
  boater: _wbrPerson({ age: 'adult', turn: 0.5, start: 'idle', states: {
    walk: { speed: [0.7, 1.0], dur: [3, 10], next: { idle: 0.5, look: 0.5 }, clip: 'walk', still: 'idle' },
    idle: { speed: 0, dur: [4, 15], next: { walk: 0.6, look: 0.4 }, clip: 'idle' },
    look: { speed: 0, dur: [2, 6], next: { walk: 0.5, idle: 0.5 }, clip: 'look' } } }),
  couple: _wbrPerson({ age: 'adult', turn: 0.5, start: 'walk', gait: [0.9, 1.05], group: { kind: 'couple', members: [{ who: 'stroll', slot: [0.65, 0] }] }, states: {
    walk: { speed: [0.95, 1.25], dur: [10, 30], next: { walk: 0.8, look: 0.12, chat: 0.08 }, clip: 'walk', still: 'idle' },
    look: { speed: 0, dur: [2, 5], next: { walk: 1 }, clip: 'look' },
    chat: { speed: 0, dur: [4, 12], next: { walk: 1 }, clip: 'chat' },
    idle: { speed: 0, dur: [1, 3], next: { walk: 1 }, clip: 'idle' } } }),
  friends: _wbrPerson({ age: 'adult', turn: 0.5, start: 'walk', gait: [0.9, 1.05], group: { kind: 'friends', members: [{ who: 'stroll', slot: [0.65, 0] }, { who: 'stroll', slot: [-0.65, -0.2], p: 0.5 }] }, states: {
    walk: { speed: [0.9, 1.2], dur: [8, 24], next: { walk: 0.7, chat: 0.3 }, clip: 'walk', still: 'idle' },
    chat: { speed: 0, dur: [5, 14], next: { walk: 1 }, clip: 'chat' },
    idle: { speed: 0, dur: [1, 3], next: { walk: 1 }, clip: 'idle' } } }),
  family: _wbrPerson({ age: 'adult', turn: 0.5, start: 'walk', gait: [0.85, 1.0], group: { kind: 'family', members: [{ who: 'stroll', slot: [0.7, 0] }, { who: 'child', slot: [-0.6, 0.7] }, { who: 'child', slot: [1.3, 0.6], p: 0.5 }] }, states: {
    walk: { speed: [0.85, 1.1], dur: [8, 24], next: { walk: 0.75, look: 0.15, idle: 0.1 }, clip: 'walk', still: 'idle' },
    look: { speed: 0, dur: [2, 6], next: { walk: 1 }, clip: 'look' },
    idle: { speed: 0, dur: [1, 4], next: { walk: 1 }, clip: 'idle' } } }),
  buggy: _wbrPerson({ age: 'adult', r: 0.4, turn: 0.7, start: 'walk', gait: [0.9, 1.05], states: {
    walk: { speed: [0.85, 1.15], dur: [10, 30], next: { walk: 0.85, idle: 0.15 }, clip: 'walk', still: 'idle' },
    idle: { speed: 0, dur: [2, 5], next: { walk: 1 }, clip: 'idle' } } }),
  // a cyclist on a shared path (walk layer): rings and passes (M6). On a road, cyclists are lane traffic ('cyclist-road').
  cyclist: _wbrPerson({ age: 'adult', r: 0.4, h: [1.6, 1.8], turn: 0.6, start: 'ride', react: { ring: true }, space: 0.6, states: {
    ride: { speed: [3.5, 5.5], dur: [30, 90], next: { ride: 1 }, clip: 'ride', still: 'stopped', pose: 'ride' },
    stopped: { speed: 0, dur: [0.5, 1], next: { ride: 1 }, clip: 'stopped', pose: 'ride' } } }),
  // ---- animals on foot ----
  dog: { layer: 'walk', kind: 'walker', r: 0.3, h: [0.3, 0.7], turn: 0.3, views: 'five', start: 'walk', space: 0.5, react: { scareWater: true }, states: {
    walk: { speed: [1.0, 1.8], dur: [3, 10], next: { walk: 0.7, look: 0.3 }, clip: 'trot', still: 'sniff' },
    look: { speed: 0, dur: [0.6, 2], next: { walk: 1 }, clip: 'sniff' },
    sniff: { speed: 0, dur: [0.6, 2], next: { walk: 1 }, clip: 'sniff' } } },
  cow: { layer: 'graze', kind: 'walker', r: 1.0, h: [1.3, 1.5], turn: 1.2, views: 'side', start: 'graze', space: 1.5, states: {
    graze: { speed: 0, dur: [10, 40], next: { walk: 0.4, graze: 0.4, idle: 0.2 }, clip: 'graze' },
    walk: { speed: [0.3, 0.6], dur: [3, 10], next: { graze: 1 }, clip: 'walk', still: 'idle' },
    idle: { speed: 0, dur: [5, 20], next: { graze: 1 }, clip: 'idle' } } },
  sheep: { layer: 'graze', kind: 'walker', r: 0.5, h: [0.8, 1.0], turn: 0.8, views: 'side', start: 'graze', space: 1, states: {
    graze: { speed: 0, dur: [8, 30], next: { walk: 0.5, graze: 0.4, idle: 0.1 }, clip: 'graze' },
    walk: { speed: [0.3, 0.8], dur: [2, 8], next: { graze: 1 }, clip: 'walk', still: 'idle' },
    idle: { speed: 0, dur: [3, 10], next: { graze: 1 }, clip: 'idle' } } },
  pony: { layer: 'graze', kind: 'walker', r: 0.7, h: [1.25, 1.5], turn: 1, views: 'side', start: 'graze', space: 1.5, states: {
    graze: { speed: 0, dur: [10, 35], next: { walk: 0.45, graze: 0.4, idle: 0.15 }, clip: 'graze' },
    walk: { speed: [0.35, 0.7], dur: [3, 10], next: { graze: 1 }, clip: 'walk', still: 'idle' },
    idle: { speed: 0, dur: [4, 15], next: { graze: 1 }, clip: 'idle' } } },
  deer: { layer: 'graze', kind: 'walker', r: 0.4, h: [1.0, 1.3], turn: 0.6, views: 'side', start: 'graze', space: 1.2, states: {
    graze: { speed: 0, dur: [5, 20], next: { walk: 0.4, graze: 0.3, freeze: 0.3 }, clip: 'graze' },
    walk: { speed: [0.4, 0.8], dur: [2, 8], next: { graze: 1 }, clip: 'walk', still: 'idle' },
    freeze: { speed: 0, dur: [2, 6], next: { graze: 1 }, clip: 'look' },
    idle: { speed: 0, dur: [2, 6], next: { graze: 1 }, clip: 'idle' } } },
  rabbit: { layer: 'graze', kind: 'walker', r: 0.12, h: [0.25, 0.32], turn: 0.25, views: 'side', start: 'graze', space: 0.4, states: {
    graze: { speed: 0, dur: [3, 12], next: { walk: 0.5, graze: 0.5 }, clip: 'graze' },
    walk: { speed: [0.5, 1.4], dur: [0.6, 2], next: { graze: 1 }, clip: 'hop', still: 'graze' } } },
  goose: { layer: 'graze', kind: 'walker', r: 0.25, h: [0.65, 0.75], turn: 0.5, views: 'side', start: 'graze', space: 0.6, group: { kind: 'loose', size: [2, 6] }, states: {
    graze: { speed: 0, dur: [4, 14], next: { walk: 0.5, graze: 0.3, preen: 0.2 }, clip: 'graze' },
    walk: { speed: [0.2, 0.4], dur: [2, 6], next: { graze: 1 }, clip: 'walk', still: 'graze' },
    preen: { speed: 0, dur: [2, 6], next: { graze: 1 }, clip: 'preen' } } },
  // pigeons peck about on paving and grass, lift when someone walks through them and settle again (M6)
  pigeon: { layer: 'walk', kind: 'walker', r: 0.12, h: [0.28, 0.32], turn: 0.2, views: 'side', start: 'walk', space: 0.35, group: { kind: 'loose', size: [3, 8] }, react: { lift: 1.4 }, states: {
    walk: { speed: [0.3, 0.6], dur: [2, 6], next: { walk: 0.4, graze: 0.6 }, clip: 'walk', still: 'graze' },
    graze: { speed: 0, dur: [1, 4], next: { walk: 1 }, clip: 'peck' } } },
  // ---- water birds (swim layer: y is always the water level, derived) ----
  duck: { layer: 'swim', kind: 'swimmer', r: 0.15, h: [0.33, 0.37], turn: 0.4, views: 'side', start: 'swim', space: 0.5, group: { kind: 'loose', size: [2, 5] }, react: { flee: 6, feed: 12 }, states: {
    swim: { speed: [0.2, 0.5], dur: [4, 12], next: { swim: 0.55, dabble: 0.2, preen: 0.1, idle: 0.15 }, clip: 'swim', still: 'idle', pose: 'swim' },
    dabble: { speed: 0, dur: [1.5, 4], next: { swim: 1 }, clip: 'dabble', pose: 'swim' },
    preen: { speed: 0, dur: [2, 6], next: { swim: 1 }, clip: 'preen', pose: 'swim' },
    idle: { speed: 0, dur: [2, 6], next: { swim: 1 }, clip: 'idle', pose: 'swim' } } },
  coot: { layer: 'swim', kind: 'swimmer', r: 0.15, h: [0.28, 0.32], turn: 0.35, views: 'side', start: 'swim', space: 0.6, group: { kind: 'loose', size: [1, 3] }, react: { flee: 5 }, states: {
    swim: { speed: [0.25, 0.6], dur: [3, 10], next: { swim: 0.55, dive: 0.25, preen: 0.05, idle: 0.15 }, clip: 'swim', still: 'idle', pose: 'swim' },
    dive: { speed: 0, dur: [2, 5], next: { swim: 1 }, clip: 'dive', pose: 'swim' },
    preen: { speed: 0, dur: [1.5, 4], next: { swim: 1 }, clip: 'preen', pose: 'swim' },
    idle: { speed: 0, dur: [2, 5], next: { swim: 1 }, clip: 'idle', pose: 'swim' } } },
  swan: { layer: 'swim', kind: 'swimmer', r: 0.3, h: [0.55, 0.65], turn: 0.8, views: 'side', start: 'swim', space: 1, group: { kind: 'pair', size: [2, 2] }, react: { flee: 3, feed: 14 }, states: {
    swim: { speed: [0.15, 0.4], dur: [6, 20], next: { swim: 0.65, dabble: 0.15, preen: 0.1, idle: 0.1 }, clip: 'swim', still: 'idle', pose: 'swim' },
    dabble: { speed: 0, dur: [2, 6], next: { swim: 1 }, clip: 'dabble', pose: 'swim' },
    preen: { speed: 0, dur: [3, 8], next: { swim: 1 }, clip: 'preen', pose: 'swim' },
    idle: { speed: 0, dur: [3, 10], next: { swim: 1 }, clip: 'idle', pose: 'swim' } } },
  diver: { layer: 'swim', kind: 'swimmer', r: 0.2, h: [0.4, 0.5], turn: 0.4, views: 'side', start: 'swim', space: 0.8, group: { kind: 'loose', size: [1, 2] }, react: { flee: 6 }, states: {
    swim: { speed: [0.3, 0.7], dur: [3, 10], next: { swim: 0.5, dive: 0.4, preen: 0.1 }, clip: 'swim', still: 'idle', pose: 'swim' },
    dive: { speed: 0, dur: [8, 25], next: { swim: 1 }, clip: 'dive', pose: 'swim' },
    preen: { speed: 0, dur: [2, 5], next: { swim: 1 }, clip: 'preen', pose: 'swim' },
    idle: { speed: 0, dur: [2, 5], next: { swim: 1 }, clip: 'idle', pose: 'swim' } } },
  // boats under way: mid-channel at walking pace, wakes (A9); traffic owns the schedule and the steering
  boat: { layer: 'swim', kind: 'boat', r: 1.1, h: [1.9, 2.2], turn: 6, views: 'five', start: 'cruise', heavy: true, states: {
    cruise: { speed: [1.0, 1.3], dur: [300, 600], next: { cruise: 1 }, clip: 'cruise', still: 'idle', pose: 'float' },
    idle: { speed: 0, dur: [2, 6], next: { cruise: 1 }, clip: 'idle', pose: 'float' } } },
  'boat-moored': { layer: 'swim', kind: 'moored', r: 1.1, h: [1.9, 2.2], turn: 6, views: 'five', start: 'moored', heavy: true, states: {
    moored: { speed: 0, dur: [1e9, 1e9], next: { moored: 1 }, clip: 'moored', pose: 'float' } } },
  // ---- waders (wade layer): stalk, freeze, then strike (M6) ----
  heron: { layer: 'wade', kind: 'wader', r: 0.25, h: [0.85, 0.95], turn: 0.8, views: 'side', start: 'stalk', space: 3, react: { strike: true, flee: 4 }, states: {
    stalk: { speed: [0.08, 0.2], dur: [6, 20], next: { stalk: 0.35, freeze: 0.4, preen: 0.1, idle: 0.15 }, clip: 'stalk', still: 'idle' },
    freeze: { speed: 0, dur: [3, 12], next: { strike: 0.5, stalk: 0.5 }, clip: 'freeze' },
    strike: { speed: 0, dur: [0.5, 0.9], next: { idle: 0.5, stalk: 0.5 }, clip: 'strike' },
    preen: { speed: 0, dur: [4, 12], next: { stalk: 1 }, clip: 'preen' },
    idle: { speed: 0, dur: [8, 40], next: { stalk: 0.8, freeze: 0.2 }, clip: 'idle' } } },
  // ---- air: perchers need perch points from the knowledge base; flyers circle above every volume ----
  kingfisher: { layer: 'air', kind: 'percher', r: 0.1, h: [0.16, 0.19], turn: 0.15, views: 'side', start: 'perch', perch: { maxY: 4, nearWater: 4 }, alt: [0.6, 1.6], states: {
    perch: { speed: 0, dur: [10, 40], next: { dive: 0.6, fly: 0.4 }, clip: 'perch', pose: 'perch' },
    dive: { speed: 0, dur: [1, 2], next: { perch: 1 }, clip: 'dive', pose: 'fly' },
    fly: { speed: [5, 8], dur: [1, 3], next: { perch: 1 }, clip: 'fly', pose: 'fly' } } },
  gull: { layer: 'air', kind: 'flyer', r: 0.3, h: [0.42, 0.48], turn: 0.6, views: 'side', start: 'fly', alt: [14, 30], states: {
    fly: { speed: [4, 8], dur: [10, 30], next: { fly: 1 }, clip: 'fly', pose: 'fly' } } },
  // ---- traffic (79-world-2traffic.js): lanes on the left, gaps, stops; trains and trams to a timetable ----
  car: { layer: 'drive', kind: 'lane', r: 0.9, h: [1.45, 1.6], turn: 1, views: 'five', start: 'drive', heavy: true, speed: [8, 12.5], states: {
    drive: { speed: [8, 12.5], dur: [1e9, 1e9], next: { drive: 1 }, clip: 'drive', still: 'stopped', pose: 'drive' } } },
  bus: { layer: 'drive', kind: 'lane', r: 1.3, h: [3.0, 4.4], turn: 1.5, views: 'five', start: 'drive', heavy: true, speed: [7, 10], stops: 'bus', dwell: [10, 22], states: {
    drive: { speed: [7, 10], dur: [1e9, 1e9], next: { drive: 1 }, clip: 'drive', still: 'stopped', pose: 'drive' } } },
  'cyclist-road': { layer: 'drive', kind: 'lane', r: 0.4, h: [1.6, 1.8], turn: 0.6, views: 'five', start: 'ride', speed: [4, 6.5], kerb: true, states: {
    ride: { speed: [4, 6.5], dur: [1e9, 1e9], next: { ride: 1 }, clip: 'ride', still: 'stopped', pose: 'ride' } } },
  tram: { layer: 'rail', kind: 'rail', r: 1.4, h: [3.3, 3.6], turn: 2, views: 'five', start: 'drive', heavy: true, speed: [9, 13], accel: 1.0, dwell: [18, 30], states: {
    drive: { speed: [9, 13], dur: [1e9, 1e9], next: { drive: 1 }, clip: 'drive', still: 'stopped', pose: 'drive' } } },
  train: { layer: 'rail', kind: 'rail', r: 1.5, h: [3.6, 3.9], turn: 2, views: 'five', start: 'drive', heavy: true, speed: [26, 36], accel: 0.6, dwell: [30, 45], states: {
    drive: { speed: [26, 36], dur: [1e9, 1e9], next: { drive: 1 }, clip: 'drive', still: 'stopped', pose: 'drive' } } },
};

// scene `who` -> { cls, obj } (a mix picks a who per spawn; a population name with no mix of its own gets `mix`).
// Object ids work too (rail.train-mainline, person.jogger ...): the class comes from the descriptor (worldLifeWhoOf).
var worldLifeWho = {
  walkers: { mix: { stroll: 0.55, brisk: 0.2, 'dog-walker': 0.15, couple: 0.1 } },
  visit: { mix: { stroll: 0.6, elderly: 0.4 } },
  crowd: { mix: { brisk: 0.45, stroll: 0.3, friends: 0.15, couple: 0.1 } },
  crowds: { mix: { brisk: 0.45, stroll: 0.3, friends: 0.15, couple: 0.1 } },
  'dog-walkers': { mix: { 'dog-walker': 1 } },
  stroll: { cls: 'stroll', obj: 'person.walker' },
  walker: { cls: 'stroll', obj: 'person.walker' },
  brisk: { cls: 'brisk', obj: 'person.walker' },
  commuter: { cls: 'brisk', obj: 'person.commuter' },
  commuters: { cls: 'brisk', obj: 'person.commuter' },
  shopper: { cls: 'stroll', obj: 'person.shopper' },
  jogger: { cls: 'jogger', obj: 'person.jogger' },
  joggers: { cls: 'jogger', obj: 'person.jogger' },
  elderly: { cls: 'elderly', obj: 'person.elderly-walker' },
  child: { cls: 'child', obj: 'person.walker' },
  'dog-walker': { cls: 'dog-walker', obj: 'person.walker' },
  birdwatcher: { cls: 'birdwatcher', obj: 'person.birdwatcher' },
  photographer: { cls: 'birdwatcher', obj: 'person.photographer' },
  angler: { cls: 'angler', obj: 'person.walker' },
  boater: { cls: 'boater', obj: 'person.walker' },
  couple: { cls: 'couple', obj: 'person.walker' },
  friends: { cls: 'friends', obj: 'person.walker' },
  chat: { cls: 'friends', obj: 'person.walker' },
  family: { cls: 'family', obj: 'person.walker' },
  buggy: { cls: 'buggy', obj: 'person.buggy-walker' },
  cyclist: { cls: 'cyclist', obj: 'person.cyclist', road: 'cyclist-road' },
  cyclists: { cls: 'cyclist', obj: 'person.cyclist', road: 'cyclist-road' },
  dog: { cls: 'dog', obj: 'animal.dog' },
  cow: { cls: 'cow', obj: 'animal.cattle' },
  cattle: { cls: 'cow', obj: 'animal.cattle' },
  sheep: { cls: 'sheep', obj: 'animal.sheep' },
  pony: { cls: 'pony', obj: 'animal.pony' },
  ponies: { cls: 'pony', obj: 'animal.pony' },
  deer: { cls: 'deer', obj: 'animal.deer' },
  rabbit: { cls: 'rabbit', obj: 'animal.rabbit' },
  rabbits: { cls: 'rabbit', obj: 'animal.rabbit' },
  goose: { cls: 'goose', obj: 'bird.goose' },
  pigeon: { cls: 'pigeon', obj: 'bird.pigeon' },
  pigeons: { cls: 'pigeon', obj: 'bird.pigeon' },
  mallard: { cls: 'duck', obj: 'bird.mallard' },
  duck: { cls: 'duck', obj: 'bird.mallard' },
  coot: { cls: 'coot', obj: 'bird.coot' },
  moorhen: { cls: 'coot', obj: 'bird.moorhen' },
  'mute-swan': { cls: 'swan', obj: 'bird.swan' },
  swan: { cls: 'swan', obj: 'bird.swan' },
  grebe: { cls: 'diver', obj: 'bird.grebe' },
  goosander: { cls: 'diver', obj: 'bird.mallard' },
  'narrowboat-cruising': { cls: 'boat', obj: 'boat.narrowboat' },
  'narrowboat-moored': { cls: 'boat-moored', obj: 'boat.narrowboat' },
  heron: { cls: 'heron', obj: 'bird.heron' },
  egret: { cls: 'heron', obj: 'bird.heron' },
  kingfisher: { cls: 'kingfisher', obj: 'bird.kingfisher' },
  gull: { cls: 'gull', obj: 'bird.gull' },
  gulls: { cls: 'gull', obj: 'bird.gull' },
  car: { cls: 'car', obj: 'vehicle.car' },
  cars: { cls: 'car', obj: 'vehicle.car' },
  bus: { cls: 'bus', obj: 'vehicle.bus' },
  buses: { cls: 'bus', obj: 'vehicle.bus' },
  tram: { cls: 'tram', obj: 'vehicle.supertram' },
  trams: { cls: 'tram', obj: 'vehicle.supertram' },
  train: { cls: 'train', obj: 'rail.train-mainline' },
  trains: { cls: 'train', obj: 'rail.train-mainline' },
};
// a state name a scene may ask for that a class calls something else
var WORLD_STATE_ALIAS = { wade: 'stalk', walk: 'walk', swim: 'swim', dive: 'dive', perch: 'perch', fly: 'fly', rest: 'idle', look: 'look', sit: 'sit', chat: 'chat' };
// world class of a descriptor (0core's _wcClass / the knowledge base) -> brain
var WORLD_BRAIN_OF_CLASS = { person: 'stroll', cyclist: 'cyclist', dog: 'dog', duck: 'duck', coot: 'coot', grebe: 'diver', swan: 'swan', goose: 'goose',
  heron: 'heron', kingfisher: 'kingfisher', gull: 'gull', bird: 'pigeon', 'bird-air': 'gull', grazer: 'cow', animal: 'rabbit', boat: 'boat',
  train: 'train', tram: 'tram', vehicle: 'car', car: 'car', bus: 'bus' };
