// World engine v3, module C (life): character class tables (data only).
// docs/dev/WORLD_ENGINE.md section 4. Each class says which nav layer it lives on, its radius (for
// avoidance and nav dilation), real height (metres, per pose), turn time (seconds for a 180 degree turn:
// no instant turns), which drawn views exist ('five' = side, q-front, front, q-back, back + mirrors;
// 'side' = side only + mirror), and a state table. States are drawn from the fixed set below; a state
// with speed > 0 moves (wanders or follows the goal list), speed 0 holds still and plays its clip.
// `who` (the scene's life entry) maps to a class plus an object library id via worldLifeWho.

var WORLD_STATES = ['walk', 'turn', 'idle', 'look', 'sit', 'chat', 'graze', 'swim', 'dabble', 'dive',
  'fly', 'stalk', 'perch', 'ride'];

var worldBrains = {
  // ---- people (walk layer) ----
  stroll: { layer: 'walk', r: 0.25, h: 1.7, turn: 0.5, views: 'five', start: 'walk', states: {
    walk: { speed: [1.0, 1.35], dur: [8, 30], next: { walk: 0.8, look: 0.12, idle: 0.08 }, clip: 'walk' },
    look: { speed: 0, dur: [1.5, 4], next: { walk: 1 }, clip: 'look' },
    idle: { speed: 0, dur: [1, 3], next: { walk: 1 }, clip: 'idle' },
    sit: { speed: 0, dur: [20, 60], next: { walk: 1 }, clip: 'sit', h: 1.25 },
    chat: { speed: 0, dur: [6, 20], next: { walk: 1 }, clip: 'chat' } } },
  brisk: { layer: 'walk', r: 0.25, h: 1.75, turn: 0.4, views: 'five', start: 'walk', states: {
    walk: { speed: [1.45, 1.75], dur: [20, 60], next: { walk: 0.95, look: 0.05 }, clip: 'walk' },
    look: { speed: 0, dur: [0.8, 1.6], next: { walk: 1 }, clip: 'look' } } },
  jogger: { layer: 'walk', r: 0.25, h: 1.75, turn: 0.35, views: 'five', start: 'walk', states: {
    walk: { speed: [2.4, 3.2], dur: [30, 90], next: { walk: 1 }, clip: 'run' } } },
  elderly: { layer: 'walk', r: 0.28, h: 1.65, turn: 0.6, views: 'five', start: 'walk', states: {
    walk: { speed: [0.6, 0.9], dur: [10, 30], next: { walk: 0.6, idle: 0.25, look: 0.15 }, clip: 'walk' },
    idle: { speed: 0, dur: [2, 6], next: { walk: 1 }, clip: 'idle' },
    look: { speed: 0, dur: [2, 5], next: { walk: 1 }, clip: 'look' },
    sit: { speed: 0, dur: [20, 60], next: { walk: 1 }, clip: 'sit', h: 1.2 } } },
  child: { layer: 'walk', r: 0.2, h: 1.15, turn: 0.3, views: 'five', start: 'walk', states: {
    walk: { speed: [1.0, 1.9], dur: [4, 14], next: { walk: 0.7, idle: 0.15, look: 0.15 }, clip: 'walk' },
    idle: { speed: 0, dur: [1, 3], next: { walk: 1 }, clip: 'idle' },
    look: { speed: 0, dur: [1, 3], next: { walk: 1 }, clip: 'look' } } },
  'dog-walker': { layer: 'walk', r: 0.25, h: 1.7, turn: 0.5, views: 'five', start: 'walk',
    group: [{ who: 'dog', off: [0.9, 0.6] }], states: {
      walk: { speed: [1.0, 1.3], dur: [10, 30], next: { walk: 0.85, idle: 0.15 }, clip: 'walk' },
      idle: { speed: 0, dur: [2, 5], next: { walk: 1 }, clip: 'idle' } } },
  cyclist: { layer: 'drive', r: 0.4, h: 1.75, turn: 0.6, views: 'five', start: 'ride', states: {
    ride: { speed: [4, 6.5], dur: [30, 90], next: { ride: 1 }, clip: 'ride' } } },
  boater: { layer: 'walk', r: 0.25, h: 1.7, turn: 0.5, views: 'five', start: 'idle', states: {
    walk: { speed: [0.7, 1.0], dur: [3, 10], next: { idle: 0.5, look: 0.5 }, clip: 'walk' },
    idle: { speed: 0, dur: [4, 15], next: { walk: 0.6, look: 0.4 }, clip: 'idle' },
    look: { speed: 0, dur: [2, 6], next: { walk: 0.5, idle: 0.5 }, clip: 'look' } } },
  dog: { layer: 'walk', r: 0.2, h: 0.5, turn: 0.3, views: 'five', start: 'walk', states: {
    walk: { speed: [1.0, 1.8], dur: [3, 10], next: { walk: 0.7, look: 0.3 }, clip: 'trot' },
    look: { speed: 0, dur: [0.6, 2], next: { walk: 1 }, clip: 'sniff' } } },
  // ---- grazers (graze layer) ----
  cow: { layer: 'graze', r: 0.9, h: 1.4, turn: 1.2, views: 'side', start: 'graze', states: {
    graze: { speed: 0, dur: [10, 40], next: { walk: 0.4, graze: 0.4, idle: 0.2 }, clip: 'graze' },
    walk: { speed: [0.3, 0.6], dur: [3, 10], next: { graze: 1 }, clip: 'walk' },
    idle: { speed: 0, dur: [5, 20], next: { graze: 1 }, clip: 'idle' } } },
  sheep: { layer: 'graze', r: 0.5, h: 0.9, turn: 0.8, views: 'side', start: 'graze', states: {
    graze: { speed: 0, dur: [8, 30], next: { walk: 0.5, graze: 0.4, idle: 0.1 }, clip: 'graze' },
    walk: { speed: [0.3, 0.8], dur: [2, 8], next: { graze: 1 }, clip: 'walk' },
    idle: { speed: 0, dur: [3, 10], next: { graze: 1 }, clip: 'idle' } } },
  pigeon: { layer: 'graze', r: 0.12, h: 0.3, turn: 0.2, views: 'side', start: 'walk', states: {
    walk: { speed: [0.3, 0.6], dur: [2, 6], next: { walk: 0.4, graze: 0.6 }, clip: 'walk' },
    graze: { speed: 0, dur: [1, 4], next: { walk: 1 }, clip: 'peck' } } },
  // ---- water birds (swim layer: y is always the water level, derived) ----
  duck: { layer: 'swim', r: 0.15, h: 0.35, turn: 0.4, views: 'side', start: 'swim', states: {
    swim: { speed: [0.2, 0.5], dur: [4, 12], next: { swim: 0.6, dabble: 0.25, idle: 0.15 }, clip: 'swim' },
    dabble: { speed: 0, dur: [1.5, 4], next: { swim: 1 }, clip: 'dabble' },
    idle: { speed: 0, dur: [2, 6], next: { swim: 1 }, clip: 'idle' } } },
  coot: { layer: 'swim', r: 0.15, h: 0.35, turn: 0.35, views: 'side', start: 'swim', states: {
    swim: { speed: [0.25, 0.6], dur: [3, 10], next: { swim: 0.6, dive: 0.25, idle: 0.15 }, clip: 'swim' },
    dive: { speed: 0, dur: [2, 5], next: { swim: 1 }, clip: 'dive' },
    idle: { speed: 0, dur: [2, 5], next: { swim: 1 }, clip: 'idle' } } },
  swan: { layer: 'swim', r: 0.3, h: 0.6, turn: 0.8, views: 'side', start: 'swim', states: {
    swim: { speed: [0.15, 0.4], dur: [6, 20], next: { swim: 0.7, dabble: 0.2, idle: 0.1 }, clip: 'swim' },
    dabble: { speed: 0, dur: [2, 6], next: { swim: 1 }, clip: 'dabble' },
    idle: { speed: 0, dur: [3, 10], next: { swim: 1 }, clip: 'idle' } } },
  diver: { layer: 'swim', r: 0.2, h: 0.45, turn: 0.4, views: 'side', start: 'swim', states: {
    swim: { speed: [0.3, 0.7], dur: [3, 10], next: { swim: 0.5, dive: 0.5 }, clip: 'swim' },
    dive: { speed: 0, dur: [8, 25], next: { swim: 1 }, clip: 'dive' } } },
  boat: { layer: 'swim', r: 1.1, h: 2.2, turn: 6, views: 'five', start: 'swim', heavy: true, states: {
    swim: { speed: [0.9, 1.3], dur: [300, 600], next: { swim: 1 }, clip: 'cruise' } } },
  // ---- waders (wade layer) ----
  heron: { layer: 'wade', r: 0.25, h: 0.95, turn: 0.8, views: 'side', start: 'stalk', states: {
    stalk: { speed: [0.08, 0.2], dur: [6, 20], next: { stalk: 0.4, idle: 0.4, look: 0.2 }, clip: 'stalk' },
    idle: { speed: 0, dur: [8, 40], next: { stalk: 0.8, look: 0.2 }, clip: 'idle' },
    look: { speed: 0, dur: [2, 6], next: { stalk: 1 }, clip: 'strike' } } },
  // ---- air (flyers ignore ground layers; perch needs a host entity with a perch point) ----
  kingfisher: { layer: 'air', r: 0.1, h: 0.17, turn: 0.15, views: 'side', start: 'perch', perch: true, states: {
    perch: { speed: 0, dur: [10, 40], next: { dive: 0.6, fly: 0.4 }, clip: 'perch' },
    dive: { speed: 0, dur: [1, 2], next: { perch: 1 }, clip: 'dive' },
    fly: { speed: [5, 8], dur: [1, 3], next: { perch: 1 }, clip: 'fly' } } },
  gull: { layer: 'air', r: 0.3, h: 0.45, turn: 0.6, views: 'side', start: 'fly', states: {
    fly: { speed: [4, 8], dur: [10, 30], next: { fly: 1 }, clip: 'fly' } } },
};

// scene `who` -> { cls, obj }. Mixes (walkers) pick a who per spawn.
var worldLifeWho = {
  walkers: null,                       // must come with `mix`
  visit: null,
  stroll: { cls: 'stroll', obj: 'person.walker' },
  brisk: { cls: 'brisk', obj: 'person.walker' },
  jogger: { cls: 'jogger', obj: 'person.jogger' },
  elderly: { cls: 'elderly', obj: 'person.elderly' },
  child: { cls: 'child', obj: 'person.child' },
  'dog-walker': { cls: 'dog-walker', obj: 'person.walker' },
  dog: { cls: 'dog', obj: 'animal.dog' },
  cyclist: { cls: 'cyclist', obj: 'person.cyclist' },
  boater: { cls: 'boater', obj: 'person.walker' },
  cow: { cls: 'cow', obj: 'animal.cow' },
  sheep: { cls: 'sheep', obj: 'animal.sheep' },
  pigeon: { cls: 'pigeon', obj: 'bird.pigeon' },
  mallard: { cls: 'duck', obj: 'bird.mallard' },
  duck: { cls: 'duck', obj: 'bird.mallard' },
  coot: { cls: 'coot', obj: 'bird.coot' },
  moorhen: { cls: 'coot', obj: 'bird.moorhen' },
  'mute-swan': { cls: 'swan', obj: 'bird.swan' },
  grebe: { cls: 'diver', obj: 'bird.grebe' },
  goosander: { cls: 'diver', obj: 'bird.goosander' },
  'narrowboat-cruising': { cls: 'boat', obj: 'boat.narrowboat' },
  heron: { cls: 'heron', obj: 'bird.heron' },
  kingfisher: { cls: 'kingfisher', obj: 'bird.kingfisher' },
  gull: { cls: 'gull', obj: 'bird.gull' },
};
