/* ============================================================
   PETS, the kit (2.18, agent 'pets'). PURE: tables and checks only; nothing
   is drawn at load and nothing here touches the DOM or the state, so Node can
   load it the way the page does (lib/profile-pets.mjs evaluates this file to
   build the schema of the 'pet' field friends receive).
   User request (24 Oct 2026): "maybe pets and other things ... we are really
   building out the dashboard so it's fun to use".

   A PET IS DATA, NOT MARKUP. It is a flat object of allow-listed ids (every
   field is a key of the tables below) plus a plain-text name. petNormalize()
   keeps only those; the drawing (97-pets-0kitdraw.js) looks every colour up in
   these tables, so nothing a friend sends is ever written into the markup.

     PET_MAX                        text limits (name 24)
     PET_SPECIES / petSpecies(id)   [{id, label, kind, h (metres, the scene size class), gait, sound, treat,
                                      coats, marks, breeds?, lock?, blurb}]
     PET_ACC                        accessory slots {collar, bandana, bow, hat, glasses}: [{id, label, lock?}]
     PET_ACC_COLS                   accessory colours {id: {label, hex, level?}}
     PET_EYES                       eye colours {id: {label, hex, hex2?, level?}} ('auto': the species' own)
     PET_TRICKS                     [{id, label, icon, lock: {level|streak}, cost}] (taught with treats)
     PET_FIELDS                     the fields of a pet, in order
     petHexOf(id)                   '#rrggbb' for a custom-colour id ('x' + 6 lower-case hex digits, e.g. x3b74d6), else ''
     PET_STYLE_FIELDS               the fields an AI restyle may change (lib/pet-ai.mjs, 97-pets-4ai.js)
     itemHead / itemFace / itemNeck the ids of the custom accessories worn (designs: 97-pets-0kititems.js)
     petDefault(species?)           a starting pet
     petNormalize(p)                a clean pet: every field an allow-listed id (unknown -> the default), the name plain text
     petRandom(rnd, ok)             a random pet; ok(field, id) says whether an option may be picked (unlocks)
     petOptions(field, species)     the options of a field for a species [{id, label, hex?, lock?}]
     petLockOf(field, id, ctx)      why an option is locked ('Reach level 12', 'A 7-day streak', 'Seasonal: ...') or ''
                                    ctx {game, levelMax, bestStreak, collected: {'field:id': day}, today}
     petText(s, max)                plain text: controls, zero-width and bidi characters out, spaces folded, capped
     petWire(p)                     what friends get (the 'pet' field of the profile kind): ids and the name
     petSanitize(w)                 a friend's pet, cleaned (null when there is none)
     petSeasonOn(key, iso)          is a seasonal window open on that day
   ============================================================ */
const PET_MAX = Object.freeze({ name: 24, journal: 400 });
const _PT_ID = /^[a-z][a-z0-9-]{0,31}$/;
const _ptO = (list) => Object.freeze(list.map(([id, label, x]) => Object.freeze(Object.assign({ id, label }, x || {}))));
/** A coat: [id, label, main fur, second (belly, muzzle, chest), third (pattern: stripes, spots, points), nose?]. */
const _ptC = (list) => Object.freeze(list.map(([id, label, a, b, c, n, x]) => Object.freeze(Object.assign({ id, label, a, b, c, n: n || '' }, x || {}))));

/* ---------- species: each drawn by hand in 97-pets-0kitdraw.js ---------- */
const PET_SPECIES = Object.freeze([
  { id: 'cat', label: 'Cat', kind: 'mammal', h: 0.3, gait: 'trot', sound: 'Mrrp!', treat: 'fish', blurb: 'Naps in sunbeams, judges gently',
    breeds: _ptO([['short', 'Shorthair'], ['fluffy', 'Fluffy'], ['fold', 'Folded ears']]),
    coats: _ptC([['ginger', 'Ginger', '#e8995a', '#f8e4c8', '#c0672e'], ['black', 'Black', '#34323b', '#4a4752', '#1d1c22', '#5a4a52'], ['grey', 'Grey', '#9198a3', '#e3e5ea', '#666c77'],
      ['cream', 'Cream', '#f0d6ae', '#fbf1df', '#d6ad78'], ['white', 'White', '#f7f4ef', '#ffffff', '#dcd6cc'], ['brown', 'Chocolate', '#8c5f3e', '#dcbd9b', '#5c3a22'],
      ['siamese', 'Seal point', '#f1e5d0', '#faf4ea', '#5a4234'], ['calico', 'Calico', '#f6f1e8', '#e8995a', '#3a3434']]),
    marks: _ptO([['plain', 'Plain'], ['tabby', 'Tabby stripes'], ['tuxedo', 'Tuxedo'], ['socks', 'White socks'], ['patches', 'Patches'], ['points', 'Points']]) },
  { id: 'dog', label: 'Dog', kind: 'mammal', h: 0.5, gait: 'trot', sound: 'Woof!', treat: 'bone', blurb: 'Thinks every task you finish is the best one yet',
    breeds: _ptO([['lab', 'Retriever'], ['corgi', 'Corgi'], ['dachshund', 'Dachshund'], ['pug', 'Pug'], ['husky', 'Husky'], ['poodle', 'Poodle'], ['shiba', 'Shiba'], ['beagle', 'Beagle']]),
    coats: _ptC([['golden', 'Golden', '#e3b56c', '#f7e6c4', '#b9853f'], ['cream', 'Cream', '#efdcb9', '#fbf4e6', '#cdb488'], ['red', 'Red', '#cd7740', '#f6dcc0', '#8f4a1d'],
      ['chocolate', 'Chocolate', '#704530', '#b98a66', '#4a2a18'], ['black', 'Black', '#2f2b2c', '#56504f', '#171415'], ['grey', 'Grey', '#8f96a1', '#f1f2f4', '#5c626c'],
      ['sable', 'Sable', '#b07a40', '#f3e2c8', '#5a3a1e'], ['white', 'White', '#f6f3ee', '#ffffff', '#d6d0c6']]),
    marks: _ptO([['plain', 'Plain'], ['bib', 'White bib'], ['saddle', 'Saddle'], ['spots', 'Spots'], ['mask', 'Mask'], ['socks', 'White socks']]) },
  { id: 'rabbit', label: 'Rabbit', kind: 'mammal', h: 0.26, gait: 'hop', sound: '*thump thump*', treat: 'carrot', blurb: 'Does a happy jump when you finish things',
    breeds: _ptO([['up', 'Upright ears'], ['lop', 'Lop ears']]),
    coats: _ptC([['white', 'Snow', '#f7f5f2', '#ffffff', '#ded7cf'], ['grey', 'Grey', '#a3a6ad', '#eceef1', '#6d7079'], ['brown', 'Brown', '#9a6c48', '#e6cfb6', '#634026'],
      ['agouti', 'Wild', '#a2805c', '#efe2cf', '#6a4c30'], ['black', 'Black', '#36333a', '#5b5761', '#1e1c21'], ['cream', 'Cream', '#efd9b6', '#fbf2e3', '#d2b384']]),
    marks: _ptO([['plain', 'Plain'], ['dutch', 'Dutch'], ['spots', 'Spots'], ['blaze', 'Blaze']]) },
  { id: 'hamster', label: 'Hamster', kind: 'mammal', h: 0.08, gait: 'scurry', sound: 'Squeak!', treat: 'seed', blurb: 'Stores snacks in its cheeks for a rainy day',
    coats: _ptC([['golden', 'Golden', '#e7a65c', '#fbf0e0', '#b7742f'], ['cream', 'Cream', '#f1d7ab', '#fff8ec', '#d1ad75'], ['grey', 'Grey', '#9a9ca4', '#f1f1f3', '#6a6c74'],
      ['white', 'White', '#f8f6f2', '#ffffff', '#ddd6cc'], ['cinnamon', 'Cinnamon', '#c98454', '#f6e0c8', '#93532a']]),
    marks: _ptO([['plain', 'Plain'], ['banded', 'Banded'], ['panda', 'Panda']]) },
  { id: 'guinea', label: 'Guinea pig', kind: 'mammal', h: 0.12, gait: 'scurry', sound: 'Wheek wheek!', treat: 'leaf', blurb: 'Popcorns with joy at the sound of a crisp leaf',
    coats: _ptC([['tan', 'Ginger', '#d9904c', '#f6e3cb', '#3a2e2a'], ['brown', 'Brown', '#7f5536', '#f2e6d6', '#3a2a22'], ['cream', 'Cream', '#eed6ac', '#fcf6ea', '#c9a46b'],
      ['black', 'Black', '#2f2b2d', '#f4f0ea', '#d9904c'], ['grey', 'Grey', '#8f9198', '#f6f4f0', '#d9904c']]),
    marks: _ptO([['patches', 'Patches'], ['plain', 'Plain'], ['crest', 'Crest'], ['swirls', 'Swirls']]) },
  { id: 'fox', label: 'Fox', kind: 'mammal', h: 0.4, gait: 'trot', sound: 'Yip yip!', treat: 'berry', blurb: 'Curious about everything on your list',
    coats: _ptC([['red', 'Red', '#e2773a', '#fbf5ee', '#3a2a26'], ['arctic', 'Arctic', '#f1f3f6', '#ffffff', '#b9c3d0'], ['silver', 'Silver', '#5e616b', '#f2f2f4', '#25262b'],
      ['desert', 'Desert', '#e9c48e', '#fbf3e4', '#b48b52'], ['marble', 'Marble', '#efe8e0', '#ffffff', '#8a7a6a']]),
    marks: _ptO([['plain', 'Plain'], ['socks', 'Dark socks'], ['frost', 'Frosted'], ['bigears', 'Big ears']]) },
  { id: 'owl', label: 'Owl', kind: 'bird', h: 0.3, gait: 'fly', sound: 'Hoo hoo!', treat: 'cookie', blurb: 'Keeps you company on late evenings',
    coats: _ptC([['barn', 'Barn', '#d9a464', '#fbf6ec', '#9a6a36'], ['tawny', 'Tawny', '#9b6a3f', '#e6cfae', '#5e3c20'], ['snowy', 'Snowy', '#f7f7f5', '#ffffff', '#3c3a3a'],
      ['grey', 'Grey', '#8c8884', '#e9e5df', '#57524d'], ['eagle', 'Eagle', '#c38b4e', '#ecd4ae', '#4a2f1c']]),
    marks: _ptO([['plain', 'Plain'], ['spots', 'Spots'], ['tufts', 'Ear tufts'], ['bars', 'Bars']]) },
  { id: 'hedgehog', label: 'Hedgehog', kind: 'mammal', h: 0.15, gait: 'scurry', sound: 'Huff huff!', treat: 'berry', blurb: 'Prickly outside, soft as anything inside',
    coats: _ptC([['brown', 'Brown', '#6e5240', '#efdcc2', '#d9c2a2', '#2a2124'], ['pale', 'Pale', '#cbb39a', '#fbf0e2', '#f5ead8', '#a8607a'], ['dark', 'Dark', '#3f3632', '#e9d6be', '#8a7a6c', '#2a2124'],
      ['cinnamon', 'Cinnamon', '#a8693f', '#f6e3cb', '#e7c79e', '#2a2124']]),
    marks: _ptO([['plain', 'Plain'], ['mask', 'Mask'], ['tips', 'Frosted tips']]) },
  { id: 'tortoise', label: 'Tortoise', kind: 'reptile', h: 0.15, gait: 'plod', sound: '...', treat: 'strawberry', blurb: 'Slow and steady, like a good streak',
    coats: _ptC([['olive', 'Olive', '#7d8c3e', '#a9b37a', '#55602a'], ['amber', 'Amber', '#c08b3d', '#c2b07c', '#7a5220'], ['leopard', 'Leopard', '#d6b56e', '#c9b98a', '#5a4220'],
      ['star', 'Star', '#3a3022', '#b9a774', '#f0c94a'], ['mossy', 'Mossy', '#5f7d4a', '#9aa77f', '#3a5230']]),
    marks: _ptO([['plain', 'Plain'], ['rings', 'Rings'], ['spots', 'Spots']]) },
  { id: 'axolotl', label: 'Axolotl', kind: 'amphibian', h: 0.1, gait: 'paddle', sound: 'Blub!', treat: 'pellet', blurb: 'Always smiling, whatever the day brings',
    coats: _ptC([['pink', 'Pink', '#f6b2c3', '#fbd3dd', '#e05a82'], ['wild', 'Wild', '#6a7550', '#8f9a74', '#8a5a7a'], ['gold', 'Gold', '#f4cf5c', '#fae6a8', '#ef8a3c'],
      ['white', 'Albino', '#f8f1ec', '#ffffff', '#f28fab'], ['midnight', 'Midnight', '#3e4262', '#5a5f86', '#9a86e0'], ['mint', 'Mint', '#9fe0c6', '#d2f4e6', '#3fae86']]),
    marks: _ptO([['plain', 'Plain'], ['speckled', 'Speckled'], ['freckles', 'Freckles']]) },
  { id: 'redpanda', label: 'Red panda', kind: 'mammal', h: 0.32, gait: 'trot', sound: 'Squee!', treat: 'bamboo', blurb: 'Stands up tall when something is exciting',
    coats: _ptC([['rust', 'Rust', '#c75a2a', '#fbf6ee', '#3a2420'], ['ginger', 'Ginger', '#dd8346', '#fdf7ef', '#4a2e22'], ['chestnut', 'Chestnut', '#9a4524', '#f6efe6', '#2c1a16']]),
    marks: _ptO([['plain', 'Plain'], ['tears', 'Tear marks'], ['bright', 'Bright face']]) },
  { id: 'duck', label: 'Duck', kind: 'bird', h: 0.3, gait: 'waddle', sound: 'Quack!', treat: 'pea', blurb: 'Waddles after you wherever you go',
    coats: _ptC([['duckling', 'Duckling', '#f7d64c', '#fbe98c', '#e9a82a', '#f08a3c'], ['pekin', 'White', '#f8f5ec', '#ffffff', '#dcd6c6', '#f29a3a'], ['mallard', 'Mallard', '#9c8e7c', '#cfc4b4', '#2f7048', '#e5c14a'],
      ['brown', 'Brown', '#9b7651', '#d6bfa0', '#5e4228', '#c99a3a'], ['cayuga', 'Cayuga', '#2e322e', '#4a504a', '#2f5a48', '#2a2a2a']]),
    marks: _ptO([['plain', 'Plain'], ['ring', 'Neck ring'], ['tuft', 'Head tuft']]) },
  { id: 'parrot', label: 'Parrot', kind: 'bird', h: 0.25, gait: 'fly', sound: 'Hello!', treat: 'millet', blurb: 'Learns your favourite words',
    coats: _ptC([['budgie', 'Green budgie', '#6cc04a', '#f2dc4f', '#2a3a1a', '#eedba0'], ['blue', 'Blue budgie', '#5ea4e2', '#f4f6f8', '#2a2f3a', '#eedba0'], ['macaw', 'Scarlet macaw', '#d9362c', '#f2c43a', '#2f6fd0', '#f0e8e0'],
      ['cockatiel', 'Cockatiel', '#a3a3a6', '#f2d65a', '#f08a3c', '#c4bab0'], ['lovebird', 'Lovebird', '#58b860', '#f4a27c', '#3a8ad0', '#e8523a'], ['conure', 'Sun conure', '#f6a623', '#f9d548', '#3fae6a', '#3a3a3a']]),
    marks: _ptO([['plain', 'Plain'], ['crest', 'Crest'], ['cheeks', 'Rosy cheeks']]) },
  { id: 'frog', label: 'Frog', kind: 'amphibian', h: 0.12, gait: 'hop', sound: 'Ribbit!', treat: 'cookie', blurb: 'Leaps for joy at every finished task',
    coats: _ptC([['green', 'Green', '#64b85a', '#c9e6a6', '#3a7a36'], ['tree', 'Tree frog', '#5ccf4f', '#e9f6d6', '#f08a3c'], ['blue', 'Poison blue', '#2f74d0', '#5a98e6', '#141820'],
      ['yellow', 'Sunny', '#f4c534', '#fae58c', '#2a2420'], ['toad', 'Toad', '#8c6c47', '#d6c09a', '#5a4228']]),
    marks: _ptO([['plain', 'Plain'], ['spots', 'Spots'], ['stripe', 'Back stripe']]) },
  { id: 'dragon', label: 'Dragon', kind: 'myth', h: 0.45, gait: 'trot', sound: 'Rawr! (tiny)', treat: 'chilli', blurb: 'Breathes the tiniest, friendliest puff of smoke',
    lock: { level: 15 },
    coats: _ptC([['emerald', 'Emerald', '#3fae6a', '#f2d36a', '#2a7a4a'], ['ruby', 'Ruby', '#d8463e', '#f6c66a', '#9a2a2a'], ['amethyst', 'Amethyst', '#8b5cd6', '#f0c8f0', '#5a3a9a'],
      ['sapphire', 'Sapphire', '#3b74d6', '#a6e0f6', '#24488a'], ['gold', 'Gold', '#e2b13c', '#fbefc0', '#a6781e']]),
    marks: _ptO([['plain', 'Plain'], ['spots', 'Spots'], ['stripes', 'Stripes']]) },
  { id: 'phoenix', label: 'Phoenix', kind: 'myth', h: 0.35, gait: 'fly', sound: 'Kree-ee!', treat: 'sunberry', blurb: 'Glows a little brighter on every streak day',
    lock: { streak: 30 },
    coats: _ptC([['flame', 'Flame', '#f0642c', '#f8c24a', '#ffe9a0'], ['azure', 'Azure', '#3b82f6', '#7fd6f8', '#e0f6ff'], ['violet', 'Violet', '#8f5cf0', '#f2a6f0', '#fde6ff'],
      ['ember', 'Ember', '#c2362a', '#f08a3c', '#ffd48a'], ['gold', 'Gold', '#e0aa2c', '#fff0a6', '#ffffff']]),
    marks: _ptO([['plain', 'Plain'], ['plume', 'Long plume'], ['sparks', 'Sparks']]) },
  { id: 'unicorn', label: 'Unicorn', kind: 'myth', h: 0.45, gait: 'trot', sound: 'Neigh! ✨', treat: 'apple', blurb: 'Leaves a faint rainbow wherever it trots',
    lock: { level: 20 },
    coats: _ptC([['snow', 'Snow', '#f8f6fb', '#ffffff', '#d9d3e6'], ['blush', 'Blush', '#f8d8e4', '#fdf0f5', '#e2a9c0'], ['lilac', 'Lilac', '#ddcdf4', '#f4eefc', '#b9a2e0'],
      ['midnight', 'Midnight', '#33335e', '#4a4a7a', '#1e1e3a'], ['mint', 'Mint', '#cdeee0', '#effaf5', '#97d2bb']]),
    marks: _ptO([['rainbow', 'Rainbow mane'], ['pastel', 'Pastel mane'], ['gold', 'Gold mane'], ['silver', 'Silver mane']]) },
  { id: 'robot', label: 'Robot', kind: 'machine', h: 0.3, gait: 'roll', sound: 'Beep boop!', treat: 'battery', blurb: 'Runs on finished tasks and good vibes',
    lock: { level: 8 },
    coats: _ptC([['silver', 'Silver', '#b9c2cc', '#e8edf2', '#5a6470'], ['mint', 'Mint', '#8edcc2', '#d6f4ea', '#3a7a66'], ['tangerine', 'Tangerine', '#f2994a', '#fbd8b4', '#9a4f1a'],
      ['navy', 'Navy', '#3e4b6c', '#7f8cab', '#1e2538'], ['bubblegum', 'Bubblegum', '#f39ab8', '#fbd6e3', '#b4517a']]),
    marks: _ptO([['plain', 'Plain'], ['stripe', 'Racing stripe'], ['bolts', 'Bolts']]) },
].map(s => Object.freeze(s)));
const _PT_SP = new Map(PET_SPECIES.map(s => [s.id, s]));
function petSpecies(id) { return _PT_SP.get(id) || null; }

/* ---------- accessories ---------- */
const PET_ACC = Object.freeze({
  collar: _ptO([['none', 'None'], ['plain', 'Collar'], ['bell', 'Bell'], ['tag', 'Heart tag'], ['pearls', 'Pearls', { level: 12 }]]),
  bandana: _ptO([['none', 'None'], ['plain', 'Bandana'], ['dots', 'Polka dots'], ['stripes', 'Stripes', { level: 4 }]]),
  bow: _ptO([['none', 'None'], ['bow', 'Bow'], ['big', 'Big bow', { level: 6 }], ['flower', 'Flower', { season: 'spring' }], ['daisy', 'Daisy']]),
  hat: _ptO([['none', 'None'], ['beanie', 'Beanie'], ['party', 'Party hat'], ['tophat', 'Top hat', { level: 8 }], ['wizard', 'Wizard hat', { level: 12 }], ['crown', 'Crown', { level: 25 }],
    ['witch', 'Witch hat', { season: 'halloween' }], ['santa', 'Santa hat', { season: 'december' }], ['pumpkin', 'Pumpkin', { season: 'halloween' }], ['flowers', 'Flower crown', { season: 'spring' }],
    ['anglerhat', 'Angler’s hat', { ribbon: 'angler' }], ['explorer', 'Explorer’s hat', { ribbon: 'bug-catcher' }]]),   // 2.22: garden ribbons
  glasses: _ptO([['none', 'None'], ['round', 'Round glasses'], ['sun', 'Sunglasses'], ['heart', 'Heart shades', { level: 16 }], ['monocle', 'Monocle', { level: 30 }]]),
});
const PET_ACC_COLS = Object.freeze(Object.fromEntries([
  ['red', 'Red', '#e0473e'], ['pink', 'Pink', '#f08fb3'], ['coral', 'Coral', '#f27a62'], ['orange', 'Orange', '#f08a3c'], ['yellow', 'Yellow', '#f4cf4a'], ['mint', 'Mint', '#7fd1ae'],
  ['green', 'Green', '#3fa463'], ['teal', 'Teal', '#1fa7a0'], ['sky', 'Sky', '#7cc0ea'], ['blue', 'Blue', '#3b74d6'], ['navy', 'Navy', '#2f3d5c'], ['lilac', 'Lilac', '#b39ce6'],
  ['purple', 'Purple', '#7a4ccc'], ['brown', 'Brown', '#8a5a36'], ['black', 'Black', '#26252b'], ['white', 'White', '#f7f5f0'],
  ['gold', 'Gold', '#e0b03a', { level: 10 }], ['rainbow', 'Rainbow', '#e0473e', { level: 18 }],
].map(([id, label, hex, x]) => [id, Object.freeze(Object.assign({ label, hex }, x || {}))])));
const PET_EYES = Object.freeze(Object.fromEntries([
  ['auto', 'Natural', ''], ['dark', 'Dark', '#2a2124'], ['amber', 'Amber', '#d9922c'], ['green', 'Green', '#5aa34a'], ['blue', 'Blue', '#4a8ad6'], ['hazel', 'Hazel', '#9a7a3a'],
  ['violet', 'Violet', '#8a5ad6', { level: 14 }], ['odd', 'Odd-eyed', '#4a8ad6', { level: 9, hex2: '#d9922c' }],
].map(([id, label, hex, x]) => [id, Object.freeze(Object.assign({ label, hex }, x || {}))])));

/* ---------- tricks: unlocked by levels and streaks (the best ever: nothing is taken away), taught with treats ---------- */
const PET_TRICKS = _ptO([
  ['sit', 'Sit', { icon: 'paw-print', cost: 0, anim: 'sit' }],
  ['highfive', 'High five', { icon: 'star', cost: 2, level: 2, anim: 'paw' }],
  ['spin', 'Spin', { icon: 'rotate-ccw', cost: 3, streak: 3, anim: 'spin' }],
  ['speak', 'Speak', { icon: 'music', cost: 3, level: 4, anim: 'speak' }],
  ['rollover', 'Roll over', { icon: 'refresh-cw', cost: 4, level: 6, anim: 'roll' }],
  ['jump', 'Big jump', { icon: 'zap', cost: 4, streak: 7, anim: 'jump' }],
  ['dance', 'Happy dance', { icon: 'party-popper', cost: 5, level: 10, anim: 'dance' }],
  ['bow', 'Take a bow', { icon: 'crown', cost: 5, streak: 14, anim: 'bow' }],
  ['moonwalk', 'Moonwalk', { icon: 'moon', cost: 6, level: 15, anim: 'moon' }],
  ['backflip', 'Backflip', { icon: 'sparkles', cost: 8, streak: 30, anim: 'flip' }],
]);

/* ---------- seasons: seasonal items are collected while in season and kept for good ---------- */
const PET_SEASONS = Object.freeze({
  halloween: { from: '10-15', to: '11-05', label: 'around Halloween (15 Oct to 5 Nov)' },
  december: { from: '12-01', to: '12-31', label: 'in December' },
  spring: { from: '03-01', to: '05-31', label: 'in spring (March to May)' },
});
function petSeasonOn(key, iso) {
  const s = PET_SEASONS[key];
  if (!s || typeof iso !== 'string' || iso.length < 10) return false;
  const md = iso.slice(5, 10);
  return s.from <= s.to ? md >= s.from && md <= s.to : md >= s.from || md <= s.to;
}

/* ---------- the pet object ---------- */
const PET_FIELDS = Object.freeze(['species', 'breed', 'coat', 'marks', 'eyes', 'collar', 'collarCol', 'bandana', 'bandanaCol', 'bow', 'bowCol', 'hat', 'hatCol', 'glasses', 'glassesCol', 'coatB', 'coatC', 'itemHead', 'itemFace', 'itemNeck']);
/* Custom accessories (2.22): the three item fields hold the id of a design ('pi-' + 6 to 12 lower-case letters or digits) or ''.
   The design itself is data too (97-pets-0kititems.js: petItemClean) and travels separately; an id with no design behind it
   draws nothing. */
const _PT_ITEM_ID = /^pi-[a-z0-9]{6,12}$/;
const _PT_ITEM_FIELDS = Object.freeze(['itemHead', 'itemFace', 'itemNeck']);
const _PT_ACC_COL_OF = Object.freeze({ collarCol: 'collar', bandanaCol: 'bandana', bowCol: 'bow', hatCol: 'hat', glassesCol: 'glasses' });
const _PT_DEF_ACC = Object.freeze({ collar: 'plain', collarCol: 'red', bandana: 'none', bandanaCol: 'blue', bow: 'none', bowCol: 'pink', hat: 'none', hatCol: 'teal', glasses: 'none', glassesCol: 'black' });
/** The options of a field for a species: [{id, label, hex?, level?, season?, streak?}]. */
/* Custom colours (2.22): a colour field may hold 'x' + six lower-case hex digits instead of a table id. It is still an id by
   the friends schema's rules (letters and digits), so the wire needs no new shape, and an app without this rule maps it to the
   field's default (a plain colour, never an error). coatB / coatC override the coat's second (belly, muzzle) and third (pattern)
   colours; empty means "derived from the coat". */
const _PT_HEXID = /^x[0-9a-f]{6}$/;
const _PT_HEX_FIELDS = Object.freeze(['coat', 'coatB', 'coatC', 'eyes', 'collarCol', 'bandanaCol', 'bowCol', 'hatCol', 'glassesCol']);
function petHexOf(id) { return typeof id === 'string' && _PT_HEXID.test(id) ? '#' + id.slice(1) : ''; }
/** The fields an AI restyle may change (everything but the species and the name). Keep in step with lib/claude-runner.mjs PET_STYLE_FIELDS. */
const PET_STYLE_FIELDS = Object.freeze(['breed', 'coat', 'coatB', 'coatC', 'marks', 'eyes', 'collar', 'collarCol', 'bandana', 'bandanaCol', 'bow', 'bowCol', 'hat', 'hatCol', 'glasses', 'glassesCol']);
function petOptions(field, species) {
  const sp = petSpecies(species) || PET_SPECIES[0];
  switch (field) {
    case 'species': return PET_SPECIES.map(s => Object.assign({ id: s.id, label: s.label }, s.lock || {}));
    case 'breed': return sp.breeds || [];
    case 'coat': return sp.coats.map(c => ({ id: c.id, label: c.label, hex: c.a, hex2: c.b }));
    case 'marks': return sp.marks;
    case 'eyes': return Object.entries(PET_EYES).map(([id, v]) => Object.assign({ id }, v));
    default:
      if (PET_ACC[field]) return PET_ACC[field];
      if (_PT_ACC_COL_OF[field]) return Object.entries(PET_ACC_COLS).map(([id, v]) => Object.assign({ id }, v));
      return [];
  }
}
function _ptHas(field, id, species) {
  if (typeof id === 'string' && _PT_ITEM_FIELDS.includes(field)) return _PT_ITEM_ID.test(id);
  if (typeof id !== 'string' || !_PT_ID.test(id)) return false;
  if (_PT_HEXID.test(id) && _PT_HEX_FIELDS.includes(field)) return true;
  return petOptions(field, species).some(o => o.id === id);
}
function petDefault(species) {
  const sp = petSpecies(species) || PET_SPECIES[0];
  return Object.assign({ species: sp.id, breed: sp.breeds ? sp.breeds[0].id : '', coat: sp.coats[0].id, coatB: '', coatC: '', itemHead: '', itemFace: '', itemNeck: '', marks: sp.marks[0].id, eyes: 'auto' }, _PT_DEF_ACC);
}
/** Every field an allow-listed id (unknown -> the species' default), the name plain text. Anything else is dropped. */
function petNormalize(p0) {
  const src = p0 && typeof p0 === 'object' && !Array.isArray(p0) ? p0 : {};
  const species = petSpecies(src.species) ? src.species : PET_SPECIES[0].id;
  const d = petDefault(species), out = { species };
  for (const f of PET_FIELDS) {
    if (f === 'species') continue;
    if (f === 'breed' && !(petSpecies(species).breeds)) { out.breed = ''; continue; }
    out[f] = _ptHas(f, src[f], species) ? src[f] : d[f];
  }
  out.name = petText(src.name, PET_MAX.name);
  return out;
}
/** A random pet (ok(field, id) -> may it be picked). keep: {field: value} fields kept as they are. */
function petRandom(rnd, ok, keep) {
  rnd = typeof rnd === 'function' ? rnd : Math.random;
  const can = (f, id, sp) => (typeof ok === 'function' ? ok(f, id, sp) : true);
  const pick = (f, sp, w) => {
    const list = petOptions(f, sp).filter(o => can(f, o.id, sp));
    if (!list.length) return petDefault(sp)[f];
    if (w != null && rnd() > w) return list[0].id;   // accessories: the first option is 'none'
    const rest = w != null ? list.slice(1) : list, l = rest.length ? rest : list;
    return l[Math.floor(rnd() * l.length)].id;
  };
  const species = keep && keep.species && petSpecies(keep.species) ? keep.species : pick('species', null);
  const p = { species };
  for (const f of PET_FIELDS) if (f !== 'species') p[f] = pick(f, species, ['collar', 'bandana', 'bow', 'hat', 'glasses'].includes(f) ? (f === 'collar' ? 0.7 : f === 'glasses' ? 0.18 : 0.3) : null);
  if (rnd() < 0.75) p.eyes = 'auto';
  if (p.bandana !== 'none' && p.collar !== 'none' && rnd() < 0.6) p.collar = 'none';
  if (keep && typeof keep === 'object') for (const k of Object.keys(keep)) if (k !== 'species' && _ptHas(k, keep[k], species)) p[k] = keep[k];
  if (keep && typeof keep.name === 'string') p.name = keep.name;
  return petNormalize(p);
}
/** '' when the option can be picked, else why not (the game's level and best streak ever: unlocks are never taken away). */
function petLockOf(field, id, ctx, species) {
  const o = petOptions(field, species).find(x => x.id === id);
  if (_PT_HEXID.test(String(id)) && _PT_HEX_FIELDS.includes(field)) return '';   // a colour you picked yourself is never locked
  if (!o) return 'Not available';
  ctx = ctx || {};
  if (o.season) {
    if (ctx.collected && ctx.collected[field + ':' + id]) return '';
    return petSeasonOn(o.season, ctx.today || '') ? '' : 'Seasonal: comes ' + PET_SEASONS[o.season].label;
  }
  if (o.ribbon && ctx.ribbons && !ctx.ribbons.has(o.ribbon)) return 'Earn the garden ribbon “' + ((ctx.ribbonLabel && ctx.ribbonLabel(o.ribbon)) || o.ribbon) + '”';   // 2.22
  if (!ctx.game) return '';   // no game on this page: nothing to unlock
  if (o.level && (Number(ctx.levelMax) || 1) < o.level) return 'Reach level ' + o.level;
  if (o.streak && (Number(ctx.bestStreak) || 0) < o.streak) return 'A ' + o.streak + '-day streak';
  return '';
}
function petTrick(id) { return PET_TRICKS.find(t => t.id === id) || null; }

/* ---------- text: everything a friend can send is checked here (the same rules as the avatar kit's profileText) ---------- */
const _PT_BAD = /[\u0000-\u001F\u007F-\u009F\u061C\u200B\u200E\u200F\u2028\u2029\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\uFFF9-\uFFFB]/g;
const _PT_ZALGO = /([\u0300-\u036F\u0483-\u0489\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]{2})[\u0300-\u036F\u0483-\u0489\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]+/g;
function petText(v, max) {
  if (typeof v !== 'string' && typeof v !== 'number') return '';
  let s = String(v);
  try { s = s.normalize('NFC'); } catch (e) { /* old engine */ }
  s = s.replace(_PT_BAD, ' ').replace(_PT_ZALGO, '$1').replace(/\s+/g, ' ').trim();
  const cp = Array.from(s);
  return cp.length > (max || PET_MAX.name) ? cp.slice(0, max || PET_MAX.name).join('').trim() : s;
}

/* ---------- what friends get, and what a friend sends (lib/profile-pets.mjs has the schema) ---------- */
/** The 'pet' field of the profile kind: the ids that differ from 'none' and the name. Null for no pet. */
function petWire(p0) {
  if (!p0 || typeof p0 !== 'object' || !petSpecies(p0.species)) return null;
  const p = petNormalize(p0), out = { species: p.species };
  for (const f of PET_FIELDS) {
    if (f === 'species' || !p[f]) continue;
    const acc = _PT_ACC_COL_OF[f];
    if (acc && p[acc] === 'none') continue;   // a colour of an accessory not worn
    if (PET_ACC[f] && p[f] === 'none') continue;
    if (f === 'eyes' && p[f] === 'auto') continue;
    out[f] = p[f];
  }
  if (p.name) out.name = p.name;
  return out;
}
/** A friend's pet (already schema-checked on the server), mapped through the tables again: null when none. */
function petSanitize(w) {
  if (!w || typeof w !== 'object' || Array.isArray(w) || !petSpecies(w.species)) return null;
  const p = Object.assign({}, w);
  for (const f of ['collar', 'bandana', 'bow', 'hat', 'glasses']) if (p[f] == null) p[f] = 'none';
  if (p.eyes == null) p.eyes = 'auto';
  return petNormalize(p);
}
