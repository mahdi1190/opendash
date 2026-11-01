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
                                      coats, marks, breeds?, lock?, rar? (1 to 4), back? (the older species friends on older versions see), blurb}]
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
     petRoute(id)                   how a species is earned, for the page: {type, icon, line, of, cost?, ...} (see the section below)
     PET_RARITY, PET_LURES, PET_ENCOUNTERS, PET_TOYS, PET_BEDS   what the collection reads (97-pets-1collect.js)
   ============================================================ */
const PET_MAX = Object.freeze({ name: 24, journal: 400 });
const _PT_ID = /^[a-z][a-z0-9-]{0,31}$/;
const _ptO = (list) => Object.freeze(list.map(([id, label, x]) => Object.freeze(Object.assign({ id, label }, x || {}))));
/** A coat: [id, label, main fur, second (belly, muzzle, chest), third (pattern: stripes, spots, points), nose?]. */
const _ptC = (list) => Object.freeze(list.map(([id, label, a, b, c, n, x]) => Object.freeze(Object.assign({ id, label, a, b, c, n: n || '' }, x || {}))));

/* ---------- species: each drawn by hand in 97-pets-0kitdraw.js ---------- */
const PET_SPECIES = Object.freeze([
  { id: 'cat', persona: {acts: ['look', 'groom', 'stretch', 'scratch', 'play'], nap: 0.34}, label: 'Cat', kind: 'mammal', h: 0.3, gait: 'trot', sound: 'Mrrp!', treat: 'fish', blurb: 'Naps in sunbeams, judges gently',
    breeds: _ptO([['short', 'Shorthair'], ['fluffy', 'Fluffy'], ['fold', 'Folded ears']]),
    coats: _ptC([['ginger', 'Ginger', '#e8995a', '#f8e4c8', '#c0672e'], ['black', 'Black', '#34323b', '#4a4752', '#1d1c22', '#5a4a52'], ['grey', 'Grey', '#9198a3', '#e3e5ea', '#666c77'],
      ['cream', 'Cream', '#f0d6ae', '#fbf1df', '#d6ad78'], ['white', 'White', '#f7f4ef', '#ffffff', '#dcd6cc'], ['brown', 'Chocolate', '#8c5f3e', '#dcbd9b', '#5c3a22'],
      ['siamese', 'Seal point', '#f1e5d0', '#faf4ea', '#5a4234'], ['calico', 'Calico', '#f6f1e8', '#e8995a', '#3a3434']]),
    marks: _ptO([['plain', 'Plain'], ['tabby', 'Tabby stripes'], ['tuxedo', 'Tuxedo'], ['socks', 'White socks'], ['patches', 'Patches'], ['points', 'Points']]) },
  { id: 'dog', persona: {speed: 1.2, acts: ['sniff', 'jump', 'play', 'wiggle', 'look', 'scratch'], nap: 0.1}, label: 'Dog', kind: 'mammal', h: 0.5, gait: 'trot', sound: 'Woof!', treat: 'bone', blurb: 'Thinks every task you finish is the best one yet',
    breeds: _ptO([['lab', 'Retriever'], ['corgi', 'Corgi'], ['dachshund', 'Dachshund'], ['pug', 'Pug'], ['husky', 'Husky'], ['poodle', 'Poodle'], ['shiba', 'Shiba'], ['beagle', 'Beagle']]),
    coats: _ptC([['golden', 'Golden', '#e3b56c', '#f7e6c4', '#b9853f'], ['cream', 'Cream', '#efdcb9', '#fbf4e6', '#cdb488'], ['red', 'Red', '#cd7740', '#f6dcc0', '#8f4a1d'],
      ['chocolate', 'Chocolate', '#704530', '#b98a66', '#4a2a18'], ['black', 'Black', '#2f2b2c', '#56504f', '#171415'], ['grey', 'Grey', '#8f96a1', '#f1f2f4', '#5c626c'],
      ['sable', 'Sable', '#b07a40', '#f3e2c8', '#5a3a1e'], ['white', 'White', '#f6f3ee', '#ffffff', '#d6d0c6']]),
    marks: _ptO([['plain', 'Plain'], ['bib', 'White bib'], ['saddle', 'Saddle'], ['spots', 'Spots'], ['mask', 'Mask'], ['socks', 'White socks']]) },
  { id: 'rabbit', persona: {acts: ['look', 'groom', 'jump', 'sniff']}, label: 'Rabbit', kind: 'mammal', h: 0.26, gait: 'hop', sound: '*thump thump*', treat: 'carrot', blurb: 'Does a happy jump when you finish things',
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
  { id: 'fox', persona: {acts: ['look', 'sniff', 'play', 'stretch'], night: true}, label: 'Fox', kind: 'mammal', h: 0.4, gait: 'trot', sound: 'Yip yip!', treat: 'berry', blurb: 'Curious about everything on your list',
    coats: _ptC([['red', 'Red', '#e2773a', '#fbf5ee', '#3a2a26'], ['arctic', 'Arctic', '#f1f3f6', '#ffffff', '#b9c3d0'], ['silver', 'Silver', '#5e616b', '#f2f2f4', '#25262b'],
      ['desert', 'Desert', '#e9c48e', '#fbf3e4', '#b48b52'], ['marble', 'Marble', '#efe8e0', '#ffffff', '#8a7a6a']]),
    marks: _ptO([['plain', 'Plain'], ['socks', 'Dark socks'], ['frost', 'Frosted'], ['bigears', 'Big ears']]) },
  { id: 'owl', persona: {acts: ['look', 'look', 'preen'], night: true, nap: 0.3}, label: 'Owl', kind: 'bird', h: 0.3, gait: 'fly', sound: 'Hoo hoo!', treat: 'cookie', blurb: 'Keeps you company on late evenings',
    coats: _ptC([['barn', 'Barn', '#d9a464', '#fbf6ec', '#9a6a36'], ['tawny', 'Tawny', '#9b6a3f', '#e6cfae', '#5e3c20'], ['snowy', 'Snowy', '#f7f7f5', '#ffffff', '#3c3a3a'],
      ['grey', 'Grey', '#8c8884', '#e9e5df', '#57524d'], ['eagle', 'Eagle', '#c38b4e', '#ecd4ae', '#4a2f1c']]),
    marks: _ptO([['plain', 'Plain'], ['spots', 'Spots'], ['tufts', 'Ear tufts'], ['bars', 'Bars']]) },
  { id: 'hedgehog', persona: {speed: 0.75, acts: ['sniff', 'look', 'sniff'], night: true}, label: 'Hedgehog', kind: 'mammal', h: 0.15, gait: 'scurry', sound: 'Huff huff!', treat: 'berry', blurb: 'Prickly outside, soft as anything inside',
    coats: _ptC([['brown', 'Brown', '#6e5240', '#efdcc2', '#d9c2a2', '#2a2124'], ['pale', 'Pale', '#cbb39a', '#fbf0e2', '#f5ead8', '#a8607a'], ['dark', 'Dark', '#3f3632', '#e9d6be', '#8a7a6c', '#2a2124'],
      ['cinnamon', 'Cinnamon', '#a8693f', '#f6e3cb', '#e7c79e', '#2a2124']]),
    marks: _ptO([['plain', 'Plain'], ['mask', 'Mask'], ['tips', 'Frosted tips']]) },
  { id: 'tortoise', persona: {speed: 0.26, acts: ['look', 'chew'], nap: 0.34}, label: 'Tortoise', kind: 'reptile', h: 0.15, gait: 'plod', sound: '...', treat: 'strawberry', blurb: 'Slow and steady, like a good streak',
    coats: _ptC([['olive', 'Olive', '#7d8c3e', '#a9b37a', '#55602a'], ['amber', 'Amber', '#c08b3d', '#c2b07c', '#7a5220'], ['leopard', 'Leopard', '#d6b56e', '#c9b98a', '#5a4220'],
      ['star', 'Star', '#3a3022', '#b9a774', '#f0c94a'], ['mossy', 'Mossy', '#5f7d4a', '#9aa77f', '#3a5230']]),
    marks: _ptO([['plain', 'Plain'], ['rings', 'Rings'], ['spots', 'Spots']]) },
  { id: 'axolotl', persona: {acts: ['wiggle', 'look'], nap: 0.2}, label: 'Axolotl', kind: 'amphibian', h: 0.1, gait: 'paddle', sound: 'Blub!', treat: 'pellet', blurb: 'Always smiling, whatever the day brings',
    coats: _ptC([['pink', 'Pink', '#f6b2c3', '#fbd3dd', '#e05a82'], ['wild', 'Wild', '#6a7550', '#8f9a74', '#8a5a7a'], ['gold', 'Gold', '#f4cf5c', '#fae6a8', '#ef8a3c'],
      ['white', 'Albino', '#f8f1ec', '#ffffff', '#f28fab'], ['midnight', 'Midnight', '#3e4262', '#5a5f86', '#9a86e0'], ['mint', 'Mint', '#9fe0c6', '#d2f4e6', '#3fae86']]),
    marks: _ptO([['plain', 'Plain'], ['speckled', 'Speckled'], ['freckles', 'Freckles']]) },
  { id: 'redpanda', persona: {acts: ['look', 'stand', 'groom', 'play'], nap: 0.24}, label: 'Red panda', kind: 'mammal', h: 0.32, gait: 'trot', sound: 'Squee!', treat: 'bamboo', blurb: 'Stands up tall when something is exciting',
    coats: _ptC([['rust', 'Rust', '#c75a2a', '#fbf6ee', '#3a2420'], ['ginger', 'Ginger', '#dd8346', '#fdf7ef', '#4a2e22'], ['chestnut', 'Chestnut', '#9a4524', '#f6efe6', '#2c1a16']]),
    marks: _ptO([['plain', 'Plain'], ['tears', 'Tear marks'], ['bright', 'Bright face']]) },
  { id: 'duck', persona: {acts: ['preen', 'wiggle', 'sniff']}, label: 'Duck', kind: 'bird', h: 0.3, gait: 'waddle', sound: 'Quack!', treat: 'pea', blurb: 'Waddles after you wherever you go',
    coats: _ptC([['duckling', 'Duckling', '#f7d64c', '#fbe98c', '#e9a82a', '#f08a3c'], ['pekin', 'White', '#f8f5ec', '#ffffff', '#dcd6c6', '#f29a3a'], ['mallard', 'Mallard', '#9c8e7c', '#cfc4b4', '#2f7048', '#e5c14a'],
      ['brown', 'Brown', '#9b7651', '#d6bfa0', '#5e4228', '#c99a3a'], ['cayuga', 'Cayuga', '#2e322e', '#4a504a', '#2f5a48', '#2a2a2a']]),
    marks: _ptO([['plain', 'Plain'], ['ring', 'Neck ring'], ['tuft', 'Head tuft']]) },
  { id: 'parrot', persona: {acts: ['look', 'preen', 'wiggle', 'loop']}, label: 'Parrot', kind: 'bird', h: 0.25, gait: 'fly', sound: 'Hello!', treat: 'millet', blurb: 'Learns your favourite words',
    coats: _ptC([['budgie', 'Green budgie', '#6cc04a', '#f2dc4f', '#2a3a1a', '#eedba0'], ['blue', 'Blue budgie', '#5ea4e2', '#f4f6f8', '#2a2f3a', '#eedba0'], ['macaw', 'Scarlet macaw', '#d9362c', '#f2c43a', '#2f6fd0', '#f0e8e0'],
      ['cockatiel', 'Cockatiel', '#a3a3a6', '#f2d65a', '#f08a3c', '#c4bab0'], ['lovebird', 'Lovebird', '#58b860', '#f4a27c', '#3a8ad0', '#e8523a'], ['conure', 'Sun conure', '#f6a623', '#f9d548', '#3fae6a', '#3a3a3a']]),
    marks: _ptO([['plain', 'Plain'], ['crest', 'Crest'], ['cheeks', 'Rosy cheeks']]) },
  { id: 'frog', persona: {speed: 1, acts: ['look', 'jump', 'look']}, label: 'Frog', kind: 'amphibian', h: 0.12, gait: 'hop', sound: 'Ribbit!', treat: 'cookie', blurb: 'Leaps for joy at every finished task',
    coats: _ptC([['green', 'Green', '#64b85a', '#c9e6a6', '#3a7a36'], ['tree', 'Tree frog', '#5ccf4f', '#e9f6d6', '#f08a3c'], ['blue', 'Poison blue', '#2f74d0', '#5a98e6', '#141820'],
      ['yellow', 'Sunny', '#f4c534', '#fae58c', '#2a2420'], ['toad', 'Toad', '#8c6c47', '#d6c09a', '#5a4228']]),
    marks: _ptO([['plain', 'Plain'], ['spots', 'Spots'], ['stripe', 'Back stripe']]) },
  { id: 'dragon', persona: {acts: ['look', 'flap', 'stretch', 'puff']}, label: 'Dragon', kind: 'myth', h: 0.45, gait: 'trot', sound: 'Rawr! (tiny)', treat: 'chilli', blurb: 'Breathes the tiniest, friendliest puff of smoke',
    lock: { level: 15 },
    coats: _ptC([['emerald', 'Emerald', '#3fae6a', '#f2d36a', '#2a7a4a'], ['ruby', 'Ruby', '#d8463e', '#f6c66a', '#9a2a2a'], ['amethyst', 'Amethyst', '#8b5cd6', '#f0c8f0', '#5a3a9a'],
      ['sapphire', 'Sapphire', '#3b74d6', '#a6e0f6', '#24488a'], ['gold', 'Gold', '#e2b13c', '#fbefc0', '#a6781e']]),
    marks: _ptO([['plain', 'Plain'], ['spots', 'Spots'], ['stripes', 'Stripes']]) },
  { id: 'phoenix', persona: {acts: ['look', 'flap', 'preen']}, label: 'Phoenix', kind: 'myth', h: 0.35, gait: 'fly', sound: 'Kree-ee!', treat: 'sunberry', blurb: 'Glows a little brighter on every streak day',
    lock: { streak: 30 },
    coats: _ptC([['flame', 'Flame', '#f0642c', '#f8c24a', '#ffe9a0'], ['azure', 'Azure', '#3b82f6', '#7fd6f8', '#e0f6ff'], ['violet', 'Violet', '#8f5cf0', '#f2a6f0', '#fde6ff'],
      ['ember', 'Ember', '#c2362a', '#f08a3c', '#ffd48a'], ['gold', 'Gold', '#e0aa2c', '#fff0a6', '#ffffff']]),
    marks: _ptO([['plain', 'Plain'], ['plume', 'Long plume'], ['sparks', 'Sparks']]) },
  { id: 'unicorn', persona: {acts: ['look', 'prance', 'stretch']}, label: 'Unicorn', kind: 'myth', h: 0.45, gait: 'trot', sound: 'Neigh! ✨', treat: 'apple', blurb: 'Leaves a faint rainbow wherever it trots',
    lock: { level: 20 },
    coats: _ptC([['snow', 'Snow', '#f8f6fb', '#ffffff', '#d9d3e6'], ['blush', 'Blush', '#f8d8e4', '#fdf0f5', '#e2a9c0'], ['lilac', 'Lilac', '#ddcdf4', '#f4eefc', '#b9a2e0'],
      ['midnight', 'Midnight', '#33335e', '#4a4a7a', '#1e1e3a'], ['mint', 'Mint', '#cdeee0', '#effaf5', '#97d2bb']]),
    marks: _ptO([['rainbow', 'Rainbow mane'], ['pastel', 'Pastel mane'], ['gold', 'Gold mane'], ['silver', 'Silver mane']]) },
  { id: 'robot', persona: {acts: ['look', 'wiggle', 'loop']}, label: 'Robot', kind: 'machine', h: 0.3, gait: 'roll', sound: 'Beep boop!', treat: 'battery', blurb: 'Runs on finished tasks and good vibes',
    lock: { level: 8 },
    coats: _ptC([['silver', 'Silver', '#b9c2cc', '#e8edf2', '#5a6470'], ['mint', 'Mint', '#8edcc2', '#d6f4ea', '#3a7a66'], ['tangerine', 'Tangerine', '#f2994a', '#fbd8b4', '#9a4f1a'],
      ['navy', 'Navy', '#3e4b6c', '#7f8cab', '#1e2538'], ['bubblegum', 'Bubblegum', '#f39ab8', '#fbd6e3', '#b4517a']]),
    marks: _ptO([['plain', 'Plain'], ['stripe', 'Racing stripe'], ['bolts', 'Bolts']]) },
  /* ---- 2.23: earned by playing. lock says how (petRoute); back is the older species a friend on an older version sees instead ---- */
  { id: 'ferret', label: 'Ferret', kind: 'mammal', h: 0.2, gait: 'scurry', sound: 'Dook dook!', treat: 'pellet', rar: 1, back: 'redpanda', lock: { fact: ['bouquets', 3] }, persona: { speed: 1.4, acts: ['dart', 'wiggle', 'sniff', 'groom'] }, blurb: 'Steals one sock. Never the pair',
    art: { kit: 'quad', hr: 13, bl: 1.34, bh: 0.78, leg: 0.5, sit: 1.0, legW: 4.6, ear: 'round', earSize: 0.25, tail: 'bushy', tailSize: 0.7, belly: true, muzzle: [0.42, 0.3], nose: '#e88a9a', whisk: true, patterns: { mask: 'mask', socks: 'socks' } },
    coats: _ptC([['sable', 'Sable', '#8a6a50', '#f4e6d0', '#3e2c22'], ['albino', 'Pale', '#f6f0e4', '#ffffff', '#dccfba'], ['silver', 'Silver', '#a4a4ac', '#f2f2f4', '#54545c']]),
    marks: _ptO([['mask', 'Mask'], ['plain', 'Plain'], ['socks', 'Dark socks']]) },
  { id: 'wren', label: 'Wren', kind: 'bird', h: 0.1, gait: 'hop', sound: 'Tt-tt-tt!', treat: 'seed', rar: 1, back: 'parrot', lock: { fact: ['visitorsFound', 6] }, persona: { speed: 1.1, acts: ['look', 'jump', 'preen'] }, blurb: 'Tiny bird, enormous song',
    art: { kit: 'bird', rx: 18, ry: 17, ll: 8, r: 12, hx: 7, hy: 13, tail: 'cocked', belly: true, feet: '#8a6a50', bill: '#4a3a30', es: 0.24 },
    coats: _ptC([['brown', 'Brown', '#a07a54', '#efe0c8', '#6e5238', '#4a3a30'], ['russet', 'Russet', '#b8683e', '#f6dcc0', '#7e4424', '#4a3a30'], ['slate', 'Slate', '#7a8290', '#e8ecf0', '#4e5664', '#3a3a44']]),
    marks: _ptO([['plain', 'Plain']]) },
  { id: 'mouse', persona: {speed: 1.5, acts: ['groom', 'dart', 'sniff'], nap: 0.1}, label: 'Field mouse', kind: 'mammal', h: 0.08, gait: 'scurry', sound: 'Eep!', treat: 'seed', rar: 1, back: 'hamster', lock: { treats: 10 }, blurb: 'Small, quick and very interested in crumbs',
    coats: _ptC([['brown', 'Brown', '#a98a6c', '#f4e8d8', '#6e553e'], ['grey', 'Grey', '#a3a5ac', '#f0f0f2', '#6c6e76'], ['white', 'White', '#f8f6f2', '#ffffff', '#d8d2c8'], ['cream', 'Cream', '#eed9b8', '#fbf4e6', '#c2a678']]),
    marks: _ptO([['plain', 'Plain'], ['patch', 'Eye patch'], ['blaze', 'Blaze']]) },
  { id: 'squirrel', persona: {speed: 1.5, acts: ['groom', 'dart', 'look', 'chew'], nap: 0.08}, label: 'Squirrel', kind: 'mammal', h: 0.2, gait: 'scurry', sound: 'Chk chk!', treat: 'seed', rar: 1, back: 'fox', lock: { fact: ['harvests', 5] }, blurb: 'Buries things and forgets where, like most of us',
    coats: _ptC([['red', 'Red', '#c9672e', '#fbf0e0', '#8f4318'], ['grey', 'Grey', '#8e9098', '#f4f2ee', '#5c5e66'], ['black', 'Black', '#39363c', '#6a666e', '#1f1d22', '', {}], ['gold', 'Golden', '#e0a64a', '#fbf2dc', '#a6742a']]),
    marks: _ptO([['plain', 'Plain'], ['acorn', 'With an acorn'], ['tufts', 'Ear tufts']]) },
  { id: 'chick', persona: {speed: 0.9, acts: ['sniff', 'wiggle', 'jump']}, label: 'Chick', kind: 'bird', h: 0.15, gait: 'waddle', sound: 'Peep!', treat: 'millet', rar: 1, back: 'duck', lock: { treats: 15 }, blurb: 'Round, loud and certain you are its mother',
    coats: _ptC([['yellow', 'Fluffy yellow', '#f8d84e', '#fdeea0', '#e0a82a'], ['white', 'White hen', '#f8f5ee', '#ffffff', '#dcd4c4'], ['brown', 'Brown hen', '#b67a44', '#ecd2ac', '#7a4c26'], ['black', 'Black hen', '#35333a', '#5a5760', '#1e1c22']]),
    marks: _ptO([['plain', 'Tuft'], ['comb', 'Red comb'], ['shell', 'Eggshell hat'], ['speckle', 'Speckled']]) },
  { id: 'mole', persona: {speed: 0.6, acts: ['sniff', 'dig', 'sniff'], nap: 0.2}, label: 'Mole', kind: 'mammal', h: 0.12, gait: 'scurry', sound: 'Snff!', treat: 'pellet', rar: 1, back: 'hamster', lock: { fact: ['planted', 20] }, blurb: 'Digs the best tunnels in the garden, sees nothing of them',
    coats: _ptC([['velvet', 'Velvet', '#4a4148', '#6a6068', '#2c262c'], ['umber', 'Umber', '#6e5244', '#8e7264', '#44322a'], ['ash', 'Ash', '#7c7c84', '#a0a0a8', '#4e4e56']]),
    marks: _ptO([['plain', 'Plain'], ['miner', 'Miner’s helmet']]) },
  { id: 'robin', persona: {speed: 1, acts: ['look', 'sniff', 'preen', 'jump']}, label: 'Robin', kind: 'bird', h: 0.14, gait: 'hop', sound: 'Tsip!', treat: 'seed', rar: 1, back: 'parrot', lock: { enc: {lure: 'seedcake', tod: ['dawn', 'day'], every: 3, when: 'Mornings'} }, blurb: 'Turns up the moment you pick up a spade',
    coats: _ptC([['european', 'Robin red', '#8a6a4c', '#e8703a', '#5a4230', '#3a2e2a'], ['bluethroat', 'Blue breast', '#7a6a58', '#4a84d0', '#4e4234', '#3a2e2a'], ['goldie', 'Gold breast', '#8a7a50', '#f0b63a', '#5a4e30', '#3a2e2a']]),
    marks: _ptO([['plain', 'Plain'], ['speckle', 'Speckled']]) },
  { id: 'ladybird', label: 'Ladybird', kind: 'bug', h: 0.08, gait: 'scurry', sound: 'Bzzt.', treat: 'leaf', rar: 1, back: 'tortoise', lock: { fact: ['netted', 5] }, blurb: 'Eats greenfly. A gardener’s best friend, in spots',
    coats: _ptC([['red', 'Red', '#e0392e', '#f4a39a', '#1f1b22'], ['orange', 'Orange', '#f08a2c', '#f8c48a', '#1f1b22'], ['yellow', 'Yellow', '#f4c82e', '#fbe68a', '#1f1b22'], ['black', 'Black', '#26222c', '#54505c', '#e0392e']]),
    marks: _ptO([['five', 'Five spots'], ['two', 'Two spots'], ['many', 'Many spots']]) },
  { id: 'snail', persona: {nap: 0.4}, label: 'Snail', kind: 'bug', h: 0.08, gait: 'glide', sound: '...', treat: 'leaf', rar: 1, back: 'tortoise', lock: { enc: {lure: 'lettuce', rain: true, every: 2, when: 'When it rains'} }, blurb: 'In no hurry. Comes out when it rains',
    coats: _ptC([['honey', 'Honey shell', '#d99a4e', '#ecdcc0', '#7e5026'], ['rose', 'Rose shell', '#e88fa0', '#f2e4d6', '#a84a62'], ['mint', 'Mint shell', '#8ed2b4', '#eae6d2', '#3e8a6c'], ['plum', 'Plum shell', '#8a5aa8', '#e8e0d4', '#55306e']]),
    marks: _ptO([['plain', 'Spiral'], ['bold', 'Bold spiral'], ['dots', 'Dotted']]) },
  { id: 'goose', persona: {speed: 0.95, acts: ['preen', 'look', 'wiggle'], nap: 0.1}, label: 'Goose', kind: 'bird', h: 0.6, gait: 'waddle', sound: 'HONK.', treat: 'pea', rar: 1, back: 'duck', lock: { treats: 25 }, blurb: 'Fearless. Takes the garden very seriously',
    coats: _ptC([['white', 'White', '#f8f6ef', '#ffffff', '#d8d2c4', '#f08a3c'], ['grey', 'Greylag', '#a29c92', '#d8d2c6', '#6c665c', '#e8784a'], ['brown', 'Brown', '#8e7458', '#d0bea4', '#5a4630', '#3a3030']]),
    marks: _ptO([['plain', 'Plain'], ['bow', 'Blue bow'], ['cap', 'Dark cap']]) },
  { id: 'lamb', persona: {speed: 0.9, acts: ['jump', 'prance', 'look', 'chew'], nap: 0.16}, label: 'Lamb', kind: 'mammal', h: 0.45, gait: 'trot', sound: 'Baa!', treat: 'leaf', rar: 1, back: 'rabbit', lock: { coins: 120 }, blurb: 'Springs straight up for no reason at all',
    coats: _ptC([['white', 'White wool', '#f8f5ee', '#fffdf8', '#3e3638'], ['cream', 'Cream wool', '#f0e0c2', '#fbf4e4', '#6e5a48'], ['black', 'Black sheep', '#47434a', '#5e5a62', '#26222a'], ['rose', 'Rose wool', '#f4cdd4', '#fbe9ec', '#6a4a52']]),
    marks: _ptO([['plain', 'Plain'], ['patch', 'Patch']]) },
  { id: 'piglet', persona: {acts: ['sniff', 'dig', 'wiggle'], nap: 0.2}, label: 'Piglet', kind: 'mammal', h: 0.3, gait: 'trot', sound: 'Oink!', treat: 'apple', rar: 1, back: 'guinea', lock: { coins: 180 }, blurb: 'Clever, tidy, and in love with mud',
    coats: _ptC([['pink', 'Pink', '#f6b6b8', '#fbdcdc', '#7a4a4a'], ['ginger', 'Ginger', '#e0a06a', '#f6d8b6', '#7a4a26'], ['black', 'Black', '#46424a', '#6a666e', '#fbf6ee'], ['spotted', 'Tamworth', '#d9804a', '#f2c4a0', '#3a2a2a']]),
    marks: _ptO([['plain', 'Plain'], ['spots', 'Spots'], ['belt', 'Belted']]) },
  { id: 'bee', label: 'Bumblebee', kind: 'bug', h: 0.1, gait: 'fly', sound: 'Bzzzz!', treat: 'sunberry', rar: 2, back: 'parrot', lock: { grow: ['sunflower', 3] }, blurb: 'Too round to fly, and nobody has told it',
    coats: _ptC([['honey', 'Honey', '#f6c63a', '#fbe68e', '#2a2428'], ['amber', 'Amber', '#ee9a34', '#f8cc8a', '#2a2428'], ['snow', 'Snow', '#f4f0e4', '#ffffff', '#3a3640'], ['violet', 'Violet', '#a98ae0', '#e0d0f6', '#2a2438']]),
    marks: _ptO([['plain', 'Three bands'], ['tail', 'White tail']]) },
  { id: 'butterfly', label: 'Butterfly', kind: 'bug', h: 0.12, gait: 'fly', sound: '(flutter)', treat: 'sunberry', rar: 2, back: 'parrot', lock: { fact: ['bugSpecies', 5] }, blurb: 'Stays near the flowers you grow',
    coats: _ptC([['monarch', 'Monarch', '#f08a2c', '#fbe4b0', '#2a2024'], ['blue', 'Morpho', '#3e8ae0', '#c8e6fb', '#1e2a44'], ['sulphur', 'Sulphur', '#f6da4e', '#fff6c0', '#5a4a1e'], ['rose', 'Rose', '#f08fb3', '#fde2ec', '#6a2a48'], ['white', 'Cabbage white', '#f6f4ee', '#e4e0d4', '#3a3a3a']]),
    marks: _ptO([['plain', 'Plain'], ['eyes', 'Eye spots'], ['stripes', 'Stripes']]) },
  { id: 'goat', persona: {acts: ['chew', 'jump', 'look', 'prance']}, label: 'Goat', kind: 'mammal', h: 0.55, gait: 'trot', sound: 'Meh-eh-eh!', treat: 'leaf', rar: 2, back: 'dog', lock: { fact: ['harvests', 30] }, blurb: 'Eats the washing and looks you in the eye',
    coats: _ptC([['white', 'White', '#f6f3ec', '#ffffff', '#c8c0b0'], ['brown', 'Brown', '#9a6c46', '#ecd6bc', '#5a3e26'], ['black', 'Black', '#3a363a', '#d8d2ca', '#22202a'], ['toggen', 'Toggenburg', '#a68a5e', '#f4ead8', '#6e5834']]),
    marks: _ptO([['plain', 'Plain'], ['blaze', 'Blaze'], ['saddle', 'Saddle']]) },
  { id: 'badger', persona: {speed: 0.7, acts: ['sniff', 'dig', 'scratch'], night: true}, label: 'Badger', kind: 'mammal', h: 0.3, gait: 'trot', sound: 'Grmph.', treat: 'pellet', rar: 2, back: 'dog', lock: { enc: {lure: 'peanut', tod: ['night'], every: 3, when: 'After dark'} }, blurb: 'Comes out after dark. Knows every path',
    coats: _ptC([['classic', 'Classic', '#9b9a9e', '#fbf8f2', '#26232a'], ['honey', 'Honey', '#c8a468', '#fbf4e2', '#3a2a22'], ['albino', 'Pale', '#e8e2d8', '#ffffff', '#b8a690']]),
    marks: _ptO([['plain', 'Plain'], ['grizzled', 'Grizzled']]) },
  { id: 'otter', persona: {speed: 1.1, acts: ['groom', 'play', 'wiggle', 'jump'], nap: 0.14}, label: 'Otter', kind: 'mammal', h: 0.3, gait: 'scurry', sound: 'Eek-eek!', treat: 'fish', rar: 2, back: 'redpanda', lock: { fact: ['fished', 15] }, blurb: 'Holds hands when it sleeps. Has a favourite stone',
    coats: _ptC([['brown', 'River brown', '#8a5e3e', '#e8d0b4', '#5a3a24'], ['dark', 'Sea dark', '#5a4438', '#cfc0ac', '#38281e'], ['pale', 'Pale', '#c4a07a', '#f6ead8', '#8a6a48']]),
    marks: _ptO([['plain', 'Plain'], ['shell', 'With a shell'], ['pale', 'Pale head']]) },
  { id: 'raccoon', persona: {acts: ['sniff', 'groom', 'look'], night: true}, label: 'Raccoon', kind: 'mammal', h: 0.3, gait: 'trot', sound: 'Chrrr!', treat: 'cookie', rar: 2, back: 'redpanda', lock: { enc: {lure: 'cookie', tod: ['dusk', 'night'], every: 3, when: 'Evenings'} }, blurb: 'Washes its food and borrows your things',
    coats: _ptC([['grey', 'Grey', '#8e8e94', '#ece8e0', '#2c2a30'], ['warm', 'Warm', '#a38a70', '#f2e6d4', '#33282a'], ['albino', 'Pale', '#e6e0d6', '#fbf8f2', '#8a8078']]),
    marks: _ptO([['plain', 'Plain'], ['bandit', 'With a loot bag']]) },
  { id: 'fawn', persona: {acts: ['look', 'prance', 'sniff'], nap: 0.2}, label: 'Fawn', kind: 'mammal', h: 0.6, gait: 'trot', sound: 'Mew?', treat: 'apple', rar: 2, back: 'dog', lock: { enc: {lure: 'apple', tod: ['dawn'], every: 2, when: 'At dawn'} }, blurb: 'Wobbly, wide-eyed. Comes at first light',
    coats: _ptC([['tawny', 'Tawny', '#c98d58', '#fbf2e4', '#8a5a30'], ['red', 'Red deer', '#b4602e', '#f6e4d0', '#7a3e1a'], ['snow', 'Snow', '#f4f2ec', '#ffffff', '#c8c0b0'], ['dusk', 'Dusk', '#8e7a92', '#efe6f2', '#5a4a60']]),
    marks: _ptO([['spots', 'Spots'], ['plain', 'Plain'], ['stag', 'Little antlers']]) },
  { id: 'pony', persona: {acts: ['look', 'prance', 'chew'], nap: 0.1}, label: 'Pony', kind: 'mammal', h: 0.9, gait: 'trot', sound: 'Nicker!', treat: 'carrot', rar: 2, back: 'unicorn', lock: { coins: 350 }, blurb: 'Short, stubborn and extremely good company',
    coats: _ptC([['chestnut', 'Chestnut', '#a8623a', '#e6c8a8', '#f0e2c8'], ['grey', 'Dapple grey', '#a8abb2', '#e6e6ea', '#5a5c66'], ['palomino', 'Palomino', '#dfae62', '#f6e4c0', '#fbf6e8'], ['black', 'Black', '#39353a', '#5e5a60', '#1f1c22'], ['bay', 'Bay', '#7a4a2c', '#c49c78', '#2a1e1a']]),
    marks: _ptO([['plain', 'Plain'], ['blaze', 'Blaze'], ['star', 'Star'], ['socks', 'White socks'], ['dapple', 'Dappled']]) },
  { id: 'capybara', persona: {speed: 0.42, acts: ['look', 'chew'], nap: 0.5}, label: 'Capybara', kind: 'mammal', h: 0.55, gait: 'plod', sound: 'Hm.', treat: 'leaf', rar: 2, back: 'guinea', lock: { fact: ['fishSpecies', 5] }, blurb: 'Nothing has ever bothered it. Nothing will',
    coats: _ptC([['brown', 'Brown', '#a67c52', '#d8bc98', '#6e5034'], ['russet', 'Russet', '#b56a3e', '#e4b68e', '#7a4424'], ['cocoa', 'Cocoa', '#6e4e3c', '#a88a74', '#44302a']]),
    marks: _ptO([['plain', 'Plain'], ['yuzu', 'Yuzu on its head'], ['bird', 'A bird on its head']]) },
  { id: 'crab', label: 'Crab', kind: 'sea', h: 0.1, gait: 'scuttle', sound: 'Click click!', treat: 'fish', rar: 2, back: 'tortoise', lock: { fact: ['fished', 30] }, blurb: 'Goes sideways, and is right to',
    coats: _ptC([['coral', 'Coral', '#ee6a4a', '#fbd8b8', '#a83a22'], ['blue', 'Blue', '#4a84d0', '#cfe2f6', '#274e8a'], ['sand', 'Sand', '#dcb478', '#f6e6c8', '#a07a44'], ['violet', 'Violet', '#9a62d0', '#e6d4f6', '#5e3490']]),
    marks: _ptO([['plain', 'Plain'], ['spots', 'Spots'], ['bigclaw', 'One big claw'], ['shell', 'Shell on its back']]) },
  { id: 'bat', persona: {night: true, nap: 0.16}, label: 'Bat', kind: 'mammal', h: 0.12, gait: 'fly', sound: 'Eep eep!', treat: 'berry', rar: 2, back: 'owl', lock: { enc: {lure: 'fig', tod: ['dusk'], every: 2, when: 'At dusk'} }, blurb: 'Hangs about at dusk. Eats the midges',
    coats: _ptC([['brown', 'Brown', '#6e5244', '#e0c8b0', '#3e2e2a'], ['grey', 'Grey', '#6a6a76', '#d8d6dc', '#34343e'], ['fruit', 'Fruit bat', '#b4693a', '#f2d8bc', '#3e2a22'], ['violet', 'Violet', '#6a5490', '#dcd0ea', '#332650']]),
    marks: _ptO([['plain', 'Two fangs'], ['nofang', 'No fangs']]) },
  { id: 'flamingo', persona: {speed: 0.5, acts: ['preen', 'look'], nap: 0.2}, label: 'Flamingo', kind: 'bird', h: 1.0, gait: 'plod', sound: 'Gronk.', treat: 'fish', rar: 2, back: 'parrot', lock: { fact: ['h-summer', 15] }, blurb: 'Balances on one leg to prove a point',
    coats: _ptC([['pink', 'Pink', '#f48fa8', '#fbd0da', '#f06a8a'], ['coral', 'Coral', '#f27a62', '#fbcdbc', '#e0603e'], ['white', 'Pale', '#f8e8ec', '#ffffff', '#e0a8b8'], ['lilac', 'Lilac', '#c0a0e0', '#ece0f8', '#9a70c8']]),
    marks: _ptO([['plain', 'Plain'], ['tips', 'Dark wingtips'], ['shades', 'Sunglasses']]) },
  { id: 'bear', persona: {speed: 0.6, acts: ['sniff', 'scratch', 'stand'], nap: 0.34}, label: 'Bear cub', kind: 'mammal', h: 0.5, gait: 'plod', sound: 'Rrrf!', treat: 'berry', rar: 3, back: 'dog', lock: { fact: ['h-autumn', 15] }, blurb: 'Eating for winter. All year round',
    coats: _ptC([['brown', 'Brown', '#8e5e3c', '#d8b48c', '#5a3820'], ['black', 'Black', '#35323a', '#8a8078', '#1f1c22'], ['polar', 'Polar', '#f4f2ea', '#ffffff', '#c8c4b4'], ['honey', 'Honey', '#c8924e', '#f0d4a4', '#8a5e2a']]),
    marks: _ptO([['plain', 'Plain'], ['moon', 'Moon on its chest']]) },
  { id: 'penguin', persona: {speed: 0.55, acts: ['wiggle', 'look', 'preen']}, label: 'Penguin', kind: 'bird', h: 0.5, gait: 'waddle', sound: 'Awk!', treat: 'fish', rar: 3, back: 'duck', lock: { fact: ['h-winter', 10] }, blurb: 'Formally dressed for everything',
    coats: _ptC([['classic', 'Classic', '#2e2e38', '#fbf8f2', '#5a5a68', '#f08a3c'], ['blue', 'Little blue', '#4a6a94', '#f4f6f8', '#2e4464', '#3a3a44'], ['chick', 'Grey chick', '#8e9098', '#e4e4e8', '#5e6068', '#3a3a44']]),
    marks: _ptO([['plain', 'Plain'], ['crest', 'Golden crest'], ['scarf', 'Scarf']]) },
  { id: 'koala', persona: {speed: 0.3, acts: ['look', 'chew'], nap: 0.7}, label: 'Koala', kind: 'mammal', h: 0.4, gait: 'plod', sound: 'Mrr...', treat: 'leaf', rar: 3, back: 'hamster', lock: { bond: ['*', 4] }, blurb: 'Asleep twenty hours a day. Respect',
    coats: _ptC([['grey', 'Grey', '#a0a2a8', '#f0eee8', '#6a6c74'], ['brown', 'Brown', '#94806e', '#ece2d4', '#5e4e40'], ['silver', 'Silver', '#cfd0d4', '#ffffff', '#8e9096']]),
    marks: _ptO([['plain', 'Plain'], ['leaf', 'With a gum leaf']]) },
  { id: 'panda', persona: {speed: 0.5, acts: ['chew', 'roll', 'scratch', 'look'], nap: 0.34}, label: 'Panda', kind: 'mammal', h: 0.55, gait: 'plod', sound: 'Bleat!', treat: 'bamboo', rar: 3, back: 'redpanda', lock: { bond: ['redpanda', 4] }, blurb: 'Falls over on purpose. Probably',
    coats: _ptC([['classic', 'Classic', '#f6f4ee', '#ffffff', '#2a282e'], ['brown', 'Qinling', '#efe2d2', '#fbf4ea', '#5a402e']]),
    marks: _ptO([['plain', 'Plain'], ['bamboo', 'With bamboo']]) },
  { id: 'wolf', persona: {speed: 1.2, acts: ['sniff', 'howl', 'look', 'stretch'], night: true}, label: 'Wolf pup', kind: 'mammal', h: 0.55, gait: 'trot', sound: 'Awoooo!', treat: 'bone', rar: 3, back: 'dog', lock: { bond: ['dog', 5] }, blurb: 'Howls at the moon, then asks for a biscuit',
    coats: _ptC([['grey', 'Timber', '#8a8c94', '#f0eee8', '#4a4c54'], ['arctic', 'Arctic', '#eeeef0', '#ffffff', '#b4b8c4'], ['black', 'Black', '#3a383e', '#8e8c92', '#1e1c22'], ['red', 'Red', '#b87646', '#f2dcc2', '#6a4426']]),
    marks: _ptO([['mask', 'Mask'], ['plain', 'Plain'], ['saddle', 'Saddle']]) },
  { id: 'lion', persona: {acts: ['look', 'play', 'stretch'], nap: 0.34}, label: 'Lion cub', kind: 'mammal', h: 0.5, gait: 'trot', sound: 'Mrowr!', treat: 'fish', rar: 3, back: 'cat', lock: { bond: ['cat', 5] }, blurb: 'Practising being in charge',
    coats: _ptC([['gold', 'Gold', '#e4b566', '#fbf0d8', '#b0702e'], ['white', 'White', '#f4eee2', '#ffffff', '#d8c8a8'], ['sand', 'Sand', '#d8a97a', '#f6e6d0', '#8a5a34']]),
    marks: _ptO([['tuft', 'Tuft'], ['mane', 'Full mane'], ['dark', 'Dark mane'], ['plain', 'Plain']]) },
  { id: 'tiger', persona: {acts: ['look', 'play', 'stretch', 'groom'], nap: 0.26}, label: 'Tiger cub', kind: 'mammal', h: 0.5, gait: 'trot', sound: 'Prusten!', treat: 'fish', rar: 3, back: 'cat', lock: { ach: 25 }, blurb: 'Loves water. Do not tell the cats',
    coats: _ptC([['orange', 'Orange', '#ec9140', '#fbf3e4', '#26212a'], ['white', 'White', '#f4efe6', '#ffffff', '#3a3438'], ['gold', 'Golden', '#f2c46a', '#fff6e0', '#b4742a']]),
    marks: _ptO([['plain', 'Stripes'], ['bold', 'Bold stripes']]) },
  { id: 'alpaca', persona: {speed: 0.7, acts: ['look', 'chew', 'prance']}, label: 'Alpaca', kind: 'mammal', h: 0.9, gait: 'trot', sound: 'Hmmmm.', treat: 'carrot', rar: 3, back: 'unicorn', lock: { coins: 700 }, blurb: 'Hums when it is happy. Has an excellent fringe',
    coats: _ptC([['cream', 'Cream', '#f4e6cc', '#fbf6ea', '#b4966a'], ['white', 'White', '#f8f6f0', '#ffffff', '#d4ccbc'], ['fawn', 'Fawn', '#d2a678', '#f2e0c8', '#8e6a44'], ['cocoa', 'Cocoa', '#7a5a46', '#c0a48e', '#4a3428'], ['rose', 'Rose', '#f2c6cc', '#fbe6ea', '#c08a94']]),
    marks: _ptO([['plain', 'Plain'], ['scarf', 'Red scarf'], ['patch', 'Patch']]) },
  { id: 'octopus', label: 'Octopus', kind: 'sea', h: 0.2, gait: 'paddle', sound: 'Bloop.', treat: 'fish', rar: 3, back: 'axolotl', lock: { fact: ['rareFish', 3] }, blurb: 'Eight arms, three hearts, all of them for you',
    coats: _ptC([['coral', 'Coral', '#f2806a', '#fbd8c8', '#c0483a'], ['violet', 'Violet', '#9a6ad8', '#e6d8f8', '#623a9e'], ['teal', 'Teal', '#3eb4a8', '#c8f0e8', '#1e7a70'], ['deep', 'Kraken', '#34406e', '#8ea0d8', '#7ff0e0']]),
    marks: _ptO([['plain', 'Plain'], ['spots', 'Spots'], ['stripes', 'Stripes']]) },
  { id: 'peacock', persona: {speed: 0.5, acts: ['look', 'preen', 'wiggle']}, label: 'Peacock', kind: 'bird', h: 1.0, gait: 'plod', sound: 'May-awe!', treat: 'millet', rar: 3, back: 'parrot', lock: { coins: 1200 }, blurb: 'Knows exactly how it looks',
    coats: _ptC([['indian', 'Indian blue', '#2a64c0', '#3fae8a', '#f2c23a'], ['green', 'Green', '#2e9a6a', '#6ad0a0', '#e0a43a'], ['white', 'White', '#f6f4f0', '#ffffff', '#e0dcd2'], ['violet', 'Violet', '#6a4ac8', '#c88ae8', '#f2c23a']]),
    marks: _ptO([['plain', 'Fan open'], ['folded', 'Fan folded']]) },
  { id: 'griffin', persona: {acts: ['flap', 'look', 'preen']}, label: 'Griffin', kind: 'myth', h: 0.6, gait: 'trot', sound: 'Skreee!', treat: 'chilli', rar: 4, back: 'dragon', lock: { ach: 60 }, blurb: 'Half eagle, half lion, fully sure of itself',
    coats: _ptC([['gold', 'Gold', '#d9a960', '#fbf6ea', '#8a5e30'], ['storm', 'Storm', '#8e96a4', '#f2f4f6', '#3e4656'], ['ruby', 'Ruby', '#c0543e', '#fbeade', '#7a2a24'], ['night', 'Night', '#3e3e54', '#c8c8dc', '#1e1e32']]),
    marks: _ptO([['plain', 'Plain'], ['gold', 'Gold-tipped wings']]) },
  { id: 'pegasus', persona: {acts: ['flap', 'prance', 'look'], nap: 0.1}, label: 'Pegasus', kind: 'myth', h: 0.9, gait: 'trot', sound: 'Neigh!', treat: 'apple', rar: 4, back: 'unicorn', lock: { bond: ['pony', 5] }, blurb: 'A pony that took a good look at the sky',
    coats: _ptC([['snow', 'Snow', '#f8f6fb', '#ffffff', '#b8c4e8'], ['dawn', 'Dawn', '#f8dcd0', '#fdf2ea', '#e88fa0'], ['sky', 'Sky', '#c4e0f6', '#eef8ff', '#5a94d6'], ['night', 'Night', '#39396a', '#5a5a8e', '#f2d67a']]),
    marks: _ptO([['plain', 'Plain'], ['stars', 'Stars'], ['blaze', 'Blaze']]) },
  { id: 'kitsune', persona: {acts: ['look', 'groom', 'play'], night: true}, label: 'Kitsune', kind: 'myth', h: 0.45, gait: 'trot', sound: 'Kon kon!', treat: 'sunberry', rar: 4, back: 'fox', lock: { enc: {lure: 'sunberry', tod: ['dusk'], seasons: ['autumn'], every: 4, when: 'Autumn,  at dusk'} }, blurb: 'A fox of many tails, seen at dusk in autumn',
    coats: _ptC([['white', 'Spirit white', '#f6f2ec', '#ffffff', '#e0473e'], ['gold', 'Gold', '#ecb864', '#fbf2dc', '#d0502e'], ['night', 'Night', '#3a3a58', '#d4d4ea', '#7fd6f8'], ['ember', 'Ember', '#d8542e', '#fbeade', '#f6c03a']]),
    marks: _ptO([['plain', 'Five tails'], ['nine', 'Seven tails'], ['bigears', 'Big ears'], ['wisp', 'With a foxfire']]) },
  { id: 'jackalope', persona: {speed: 1.2, acts: ['jump', 'look', 'sniff']}, label: 'Jackalope', kind: 'myth', h: 0.3, gait: 'hop', sound: 'Tk-tk!', treat: 'carrot', rar: 4, back: 'rabbit', lock: { enc: {lure: 'carrot', tod: ['dawn', 'dusk'], seasons: ['spring'], every: 4, when: 'Spring,  dawn or dusk'} }, blurb: 'A rabbit with antlers. Nobody believes you',
    coats: _ptC([['wild', 'Wild', '#a2805c', '#efe2cf', '#c8ad84'], ['snow', 'Snow', '#f7f5f2', '#ffffff', '#b89a70'], ['night', 'Dusk', '#5a4a6e', '#b8acc8', '#d4c8a0']]),
    marks: _ptO([['plain', 'Plain'], ['spots', 'Spots'], ['blaze', 'Blaze']]) },
  { id: 'ghost', persona: {night: true}, label: 'Little ghost', kind: 'myth', h: 0.4, gait: 'float', sound: 'Boo? (sorry)', treat: 'candy', rar: 4, back: 'owl', lock: { enc: {lure: 'candy', tod: ['night'], seasons: ['autumn'], every: 4, when: 'Autumn nights'} }, blurb: 'Not scary. Quite shy, in fact',
    coats: _ptC([['white', 'Sheet white', '#f6f6fb', '#ffffff', '#b8b8d4'], ['mint', 'Mint', '#c8f4e4', '#effdf7', '#74c8a8'], ['lilac', 'Lilac', '#dcd0f8', '#f4f0fd', '#9a84e0'], ['ember', 'Ember', '#fbd4b8', '#fff0e2', '#e8834a']]),
    marks: _ptO([['plain', 'Plain'], ['stripes', 'Striped'], ['chain', 'A little chain']]) },
  { id: 'wisp', persona: {night: true, nap: 0.04}, label: 'Will-o’-wisp', kind: 'myth', h: 0.3, gait: 'float', sound: 'Fff!', treat: 'jar', rar: 4, back: 'phoenix', lock: { enc: {lure: 'jar', tod: ['night'], every: 6, when: 'Late at night'} }, blurb: 'A small warm light that follows you home',
    coats: _ptC([['blue', 'Blue', '#4aa0f0', '#a6dcfb', '#f4fbff'], ['green', 'Green', '#46c88a', '#b0f0cc', '#f6fff4'], ['gold', 'Gold', '#f4a93a', '#fbdc7a', '#fffbe0'], ['rose', 'Rose', '#f0608a', '#fbb4c8', '#fff2f6']]),
    marks: _ptO([['plain', 'Plain'], ['sparks', 'Sparks'], ['twin', 'A little twin']]) },
  { id: 'yeti', persona: {speed: 0.6, acts: ['stretch', 'wave', 'look']}, label: 'Yeti', kind: 'myth', h: 0.7, gait: 'stomp', sound: 'Hrrroo!', treat: 'chilli', rar: 4, back: 'dog', lock: { enc: {lure: 'chilli', seasons: ['winter'], every: 5, when: 'In winter'} }, blurb: 'Comes down the mountain when it snows, for snacks',
    coats: _ptC([['snow', 'Snow', '#eef2f8', '#8ec4e8', '#c0d0e4'], ['ice', 'Ice blue', '#b4d8f4', '#f4d8c8', '#6a9ad0'], ['pink', 'Pink', '#f6cede', '#a4d4f0', '#d88eb0'], ['moss', 'Moss', '#a8c090', '#f2e2c8', '#6a8a58']]),
    marks: _ptO([['plain', 'Plain'], ['belly', 'Round belly'], ['nohorn', 'No horns']]) },
  { id: 'moosh', persona: {speed: 0.6, acts: ['wiggle', 'look', 'jump']}, label: 'Mooshling', kind: 'myth', h: 0.25, gait: 'waddle', sound: 'Pff!', treat: 'pellet', rar: 4, back: 'frog', lock: { fact: ['plantsFound', 25] }, blurb: 'A mushroom that decided to go for a walk',
    coats: _ptC([['red', 'Red cap', '#e0473e', '#f8f0e0', '#fbf6ee'], ['brown', 'Brown cap', '#a0683e', '#f4e6d0', '#e8d4b4'], ['blue', 'Glowcap', '#4ac4d0', '#e8f6f4', '#d8fff8'], ['gold', 'Gold cap', '#eab03a', '#f8f0d8', '#fff4c0']]),
    marks: _ptO([['dots', 'Dots'], ['plain', 'Plain'], ['rings', 'Rings']]) },
  { id: 'cloud', persona: {speed: 0.5, nap: 0.2}, label: 'Cloudling', kind: 'myth', h: 0.4, gait: 'float', sound: 'Fwoo.', treat: 'cookie', rar: 4, back: 'owl', lock: { fact: ['seasons', 4] }, blurb: 'Saw all four seasons with you, and stayed',
    coats: _ptC([['white', 'Fair weather', '#fbfcff', '#c4d8ee', '#8ea8c8'], ['dawn', 'Dawn', '#fbdcd6', '#f6b8b0', '#d88a84'], ['storm', 'Storm', '#8e96a8', '#5e6678', '#3e4656'], ['gold', 'Golden', '#fbecb4', '#f4cf6a', '#c89a34']]),
    marks: _ptO([['plain', 'Plain'], ['rain', 'Rain'], ['bolt', 'Lightning'], ['rainbow', 'Rainbow']]) },
  { id: 'golem', persona: {speed: 0.42, acts: ['look', 'stretch'], nap: 0.2}, label: 'Pebble golem', kind: 'myth', h: 0.6, gait: 'stomp', sound: 'Grnd.', treat: 'battery', rar: 4, back: 'robot', lock: { fact: ['decorPlaced', 20] }, blurb: 'Your garden’s stones got together and woke up',
    coats: _ptC([['granite', 'Granite', '#9a9ca4', '#7ff0e0', '#6cae5a'], ['sand', 'Sandstone', '#d4b080', '#f6d35e', '#7ea048'], ['slate', 'Slate', '#5e6474', '#f08a5a', '#5a9a6a'], ['rose', 'Rose quartz', '#e4b4c0', '#ffffff', '#88b878']]),
    marks: _ptO([['plain', 'Moss'], ['sprout', 'A sprout'], ['flower', 'A flower'], ['bare', 'Bare']]) },
].map(s => Object.freeze(s)));
const _PT_SP = new Map(PET_SPECIES.map(s => [s.id, s]));
function petSpecies(id) { return _PT_SP.get(id) || null; }


/* ---------- how a pet is earned (2.23) ----------
   A species' lock says one thing to do:
     {treats: n}  spend treats       {coins: n}  spend garden coins
     {fact: [key, n]}   a garden milestone (gardenFacts, plus 'h-spring' .. 'h-winter': crops picked in that season)
     {grow: [plantId, n]}   that many grown at once     {bond: [species | '*', level]}   friendship with a pet
     {ach: n}  achievements earned  {enc: {lure, tod?, seasons?, rain?, every, when}}  a rare visitor in the garden who needs the right lure; one 20-minute spell in 'every'
     {level: n} / {streak: n}   the game's best level or streak (the first rare ones, unchanged)
   petRoute(species) turns that into what the page draws: {type, icon, line (one short line), of, cost?}. */
const PET_RARITY = Object.freeze({ 0: { id: 'home', label: 'Friend' }, 1: { id: 'common', label: 'Common' }, 2: { id: 'uncommon', label: 'Uncommon' }, 3: { id: 'rare', label: 'Rare' }, 4: { id: 'myth', label: 'Mythical' } });
/* Lures: bought once for each visit, with treats or coins. art: a treat drawing. */
const PET_LURES = _ptO([
  ['seedcake', 'Seed cake', { art: 'millet', treats: 3 }], ['lettuce', 'Crisp lettuce', { art: 'leaf', treats: 3 }], ['peanut', 'Peanuts', { art: 'pellet', treats: 4 }], ['cookie', 'Cookie', { art: 'cookie', treats: 4 }],
  ['apple', 'Windfall apple', { art: 'apple', treats: 5 }], ['fig', 'Ripe figs', { art: 'berry', treats: 5 }], ['carrot', 'Sweet carrot', { art: 'carrot', coins: 80 }], ['chilli', 'Hot chilli', { art: 'chilli', coins: 120 }],
  ['jar', 'Glow jar', { art: 'jar', coins: 150 }], ['candy', 'Candy', { art: 'candy', treats: 8 }], ['sunberry', 'Sunberry', { art: 'sunberry', coins: 200 }],
]);
const PET_ENCOUNTERS = Object.freeze(Object.fromEntries(PET_SPECIES.filter(s => s.lock && s.lock.enc).map(s => [s.id, s.lock.enc])));   // read from the rows
const PET_FACT_LINES = Object.freeze({ bouquets: ['flower-2', 'Make {n} bouquets'], visitorsFound: ['bird', 'Meet {n} garden visitors'], harvests: ['shopping-basket', 'Pick {n} crops'], planted: ['sprout', 'Plant {n} seeds'], netted: ['bug', 'Catch {n} bugs'], fished: ['fish', 'Catch {n} fish'], bugSpecies: ['bug', 'Find {n} kinds of bug'], fishSpecies: ['fish', 'Find {n} kinds of fish'],
  rareFish: ['fish', 'Land {n} rare fish'], plantsFound: ['flower-2', 'Discover {n} plants'], seasons: ['sun', 'See all {n} seasons'], decorPlaced: ['flag', 'Place {n} decorations'], 'h-spring': ['flower-2', 'Pick {n} crops in spring'], 'h-summer': ['sun', 'Pick {n} crops in summer'], 'h-autumn': ['leaf', 'Pick {n} crops in autumn'], 'h-winter': ['snowflake', 'Pick {n} crops in winter'] });
function petRoute(id) {
  const sp = petSpecies(id), L = sp && sp.lock;
  if (!L) return null;
  if (L.treats) return { type: 'treats', icon: 'cookie', line: L.treats + ' treats', of: L.treats, cost: L.treats };
  if (L.coins) return { type: 'coins', icon: 'coins', line: L.coins + ' coins', of: L.coins, cost: L.coins };
  if (L.fact) { const f = PET_FACT_LINES[L.fact[0]] || ['sprout', 'Keep gardening']; return { type: 'fact', key: L.fact[0], icon: f[0], line: f[1].replace('{n}', String(L.fact[1])), of: L.fact[1] }; }
  if (L.grow) return { type: 'grow', plant: L.grow[0], icon: 'sprout', line: 'Grow ' + L.grow[1] + ' ' + L.grow[0].replace(/-/g, ' ') + 's', of: L.grow[1] };
  if (L.bond) { const o = petSpecies(L.bond[0]); return { type: 'bond', with: L.bond[0], icon: 'heart', line: (o ? o.label + ' friend' : 'Any pet') + ' level ' + L.bond[1], of: L.bond[1] }; }
  if (L.ach) return { type: 'ach', icon: 'trophy', line: 'Earn ' + L.ach + ' achievements', of: L.ach };
  if (L.enc) { const E = L.enc; const lure = PET_LURES.find(x => x.id === E.lure); return { type: 'enc', enc: id, lure: E ? E.lure : '', art: lure ? lure.art : 'cookie', icon: 'sparkles', line: (E ? E.when : 'Now and then') + ' in the garden', of: 1, when: E ? E.when : '' }; }
  if (L.life) return { type: 'life', rule: L.life, icon: 'bird', line: L.life.hint || 'Meet it in your garden', of: 1 };   // {life: {life: 'fox', hint: 'Say hello to a fox'}}: any rule gardenLifeUnlocked knows
  if (L.level) return { type: 'level', icon: 'star', line: 'Reach level ' + L.level, of: L.level };
  if (L.streak) return { type: 'streak', icon: 'zap', line: 'A ' + L.streak + '-day streak', of: L.streak };
  return null;
}
/* Treat-and-coin extras: toys, beds (the pet's room and garden). free: yours from the start. */
const PET_TOYS = _ptO([['ball', 'Ball', { free: true }], ['yarn', 'Yarn', { treats: 8 }], ['feather', 'Feather wand', { treats: 10 }], ['frisbee', 'Flying disc', { treats: 14 }], ['squeak', 'Squeaky duck', { coins: 60 }], ['star', 'Star ball', { coins: 180 }]]);
const PET_BEDS = _ptO([['cushion', 'Cushion', { free: true }], ['basket', 'Basket', { treats: 12 }], ['hammock', 'Hammock', { coins: 120 }], ['igloo', 'Igloo', { coins: 200 }], ['cloud', 'Cloud bed', { bondAny: 6 }]]);

/* ---------- accessories ---------- */
const PET_ACC = Object.freeze({
  collar: _ptO([['none', 'None'], ['plain', 'Collar'], ['bell', 'Bell'], ['tag', 'Heart tag'], ['pearls', 'Pearls', { level: 12 }]]),
  bandana: _ptO([['none', 'None'], ['plain', 'Bandana'], ['dots', 'Polka dots'], ['stripes', 'Stripes', { level: 4 }]]),
  bow: _ptO([['none', 'None'], ['bow', 'Bow'], ['big', 'Big bow', { level: 6 }], ['flower', 'Flower', { season: 'spring' }], ['daisy', 'Daisy']]),
  hat: _ptO([['none', 'None'], ['beanie', 'Beanie'], ['party', 'Party hat'], ['tophat', 'Top hat', { level: 8 }], ['wizard', 'Wizard hat', { level: 12 }], ['crown', 'Crown', { level: 25 }],
    ['witch', 'Witch hat', { season: 'halloween' }], ['santa', 'Santa hat', { season: 'december' }], ['pumpkin', 'Pumpkin', { season: 'halloween' }], ['flowers', 'Flower crown', { season: 'spring' }],
    ['anglerhat', 'Angler’s hat', { ribbon: 'angler' }], ['explorer', 'Explorer’s hat', { ribbon: 'bug-catcher' }],   // 2.22: garden ribbons
    ['beret', 'Beret', { treats: 8 }], ['chef', 'Chef’s hat', { treats: 14 }], ['cowboy', 'Cowboy hat', { coins: 90 }], ['leaf', 'Leaf hat', { treats: 6 }], ['halo', 'Halo', { bondAny: 8 }]]),   // 2.23: paid for, or by friendship
  glasses: _ptO([['none', 'None'], ['round', 'Round glasses'], ['sun', 'Sunglasses'], ['heart', 'Heart shades', { level: 16 }], ['monocle', 'Monocle', { level: 30 }]]),
});
const PET_ACC_COLS = Object.freeze(Object.fromEntries([
  ['red', 'Red', '#e0473e'], ['pink', 'Pink', '#f08fb3'], ['coral', 'Coral', '#f27a62'], ['orange', 'Orange', '#f08a3c'], ['yellow', 'Yellow', '#f4cf4a'], ['mint', 'Mint', '#7fd1ae'],
  ['green', 'Green', '#3fa463'], ['teal', 'Teal', '#1fa7a0'], ['sky', 'Sky', '#7cc0ea'], ['blue', 'Blue', '#3b74d6'], ['navy', 'Navy', '#2f3d5c'], ['lilac', 'Lilac', '#b39ce6'],
  ['purple', 'Purple', '#7a4ccc'], ['brown', 'Brown', '#8a5a36'], ['black', 'Black', '#26252b'], ['white', 'White', '#f7f5f0'],
  ['gold', 'Gold', '#e0b03a', { level: 10 }], ['rainbow', 'Rainbow', '#e0473e', { level: 18 }],
  ['cherry', 'Cherry', '#b81e3e', { treats: 5 }], ['lime', 'Lime', '#a6d43a', { treats: 5 }], ['peach', 'Peach', '#f8c0a0', { treats: 5 }], ['ocean', 'Ocean', '#127a94', { coins: 40 }], ['sunset', 'Sunset', '#f2683a', { coins: 40 }],
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
const PET_FIELDS = Object.freeze(['species', 'breed', 'coat', 'marks', 'eyes', 'collar', 'collarCol', 'bandana', 'bandanaCol', 'bow', 'bowCol', 'hat', 'hatCol', 'glasses', 'glassesCol', 'coatB', 'coatC', 'itemHead', 'itemFace', 'itemNeck', 'itemBack']);
/* Custom accessories (2.22): the three item fields hold the id of a design ('pi-' + 6 to 12 lower-case letters or digits) or ''.
   The design itself is data too (97-pets-0kititems.js: petItemClean) and travels separately; an id with no design behind it
   draws nothing. */
const _PT_ITEM_ID = /^pi-[a-z0-9]{6,12}$/;
const _PT_ITEM_FIELDS = Object.freeze(['itemHead', 'itemFace', 'itemNeck', 'itemBack']);   // itemBack (2.23): wings from the crafting bench; an older app drops the field
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
    case 'species': return PET_SPECIES.map(s => Object.assign({ id: s.id, label: s.label }, s.lock || {}, s.lock ? { locked: 1 } : {}));
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
  return Object.assign({ species: sp.id, breed: sp.breeds ? sp.breeds[0].id : '', coat: sp.coats[0].id, coatB: '', coatC: '', itemHead: '', itemFace: '', itemNeck: '', itemBack: '', marks: sp.marks[0].id, eyes: 'auto' }, _PT_DEF_ACC);
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
  // 2.23: a species that is earned: once it is yours it is yours (the collection, 97-pets-1collect.js)
  if (field === 'species' && o.locked) {
    if (ctx.unl && ctx.unl[id]) return '';
    const rt = petRoute(id);
    if (!rt) return '';
    if (rt.type === 'level' || rt.type === 'streak') { if (!ctx.game) return ''; if (rt.type === 'level' && (Number(ctx.levelMax) || 1) >= rt.of) return ''; if (rt.type === 'streak' && (Number(ctx.bestStreak) || 0) >= rt.of) return ''; }
    return rt.line;
  }
  // 2.23: an accessory paid for with treats or coins, or won by friendship
  if (o.treats || o.coins || o.bondAny) {
    if (ctx.bought && ctx.bought[field + ':' + id]) return '';
    if (o.bondAny) return (Number(ctx.bondBest) || 0) >= o.bondAny ? '' : 'Friend level ' + o.bondAny;
    return o.treats ? o.treats + ' treats' : o.coins + ' coins';
  }
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
  const p = petNormalize(p0), sp = petSpecies(p.species), out = { species: p.species };
  if (sp.back) {
    // 2.23: friends on an older version know only the first 18 species and would show no pet at all. Their schema drops a field it does
    // not know, so 'real' is safe; they draw the cousin in 'back', in the same colours (custom colours they read since 2.22). Here petSanitize puts it back.
    out.species = sp.back; out.real = sp.id;
    const c = sp.coats.find(x => x.id === p.coat);
    if (c) { p.coat = 'x' + c.a.slice(1); if (!p.coatB) p.coatB = 'x' + c.b.slice(1); if (!p.coatC) p.coatC = 'x' + c.c.slice(1); }
  }
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
  if (!w || typeof w !== 'object' || Array.isArray(w) || typeof w.species !== 'string' || !w.species) return null;
  const p = Object.assign({}, w);
  // 2.23: the real species when this version knows it; a cousin otherwise; a species nobody here has heard of is a cat, not a missing pet
  const real = petSpecies(p.real);
  if (real) {
    p.species = real.id;
    const c = real.coats.find(x => 'x' + x.a.slice(1) === p.coat);
    if (c) { p.coat = c.id; if (p.coatB === 'x' + c.b.slice(1)) p.coatB = ''; if (p.coatC === 'x' + c.c.slice(1)) p.coatC = ''; }
  } else if (!petSpecies(p.species)) p.species = PET_SPECIES[0].id;
  delete p.real;
  for (const f of ['collar', 'bandana', 'bow', 'hat', 'glasses']) if (p[f] == null) p[f] = 'none';
  if (p.eyes == null) p.eyes = 'auto';
  return petNormalize(p);
}
