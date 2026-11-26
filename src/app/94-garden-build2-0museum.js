/* ============================================================
   BUILD 2: THE VALE MUSEUM (the rules: plain data and pure functions, no page and no clock). The owner, 21 Nov 2026: "place fish in
   museums or sell them or let them free or display them". FUN-ROADMAP: "The Vale Museum. A real building on the green. Each wing opens
   when you give it its first piece ... Each wing has a keeper from the cast who says one line about every new piece ... Empty spaces show
   as outlines ... Every piece has a small plaque, 'Given by Sam'."

   A KIND, NOT A PLACE. Any thing of the kind `museum` (94-garden-zz-7act-0kinds.js: the lake hall by the village; the Little museum you can
   build; a museum building any layout places through its data where it has room) opens THE SAME collection, as every chest opens the
   same storage. One collection per garden, saved as g.mu (one entry per exhibit, so two devices add up):
     mu['f.perch'] = { d: day given, q?: quality, cm?: size, by?: a friend's id (a friend gave it) }   keys f. fish, b. bugs, o. fossil
     pieces, c. curios (a later lane adds a wing with gardenB2WingAdd: shells, stones)
   Read merged with the old lake hall's record (prefs.ca.hall.f / .b): nothing is migrated, nothing is lost.

   Two kinds of "on show": fish and bugs are GIVEN (they leave the ledger, as the lake hall always did; the fish log and the bug book still
   remember them). Fossil pieces and curios are KEPT ON SHOW (they stay in the ledger, so every "found" count, milestone and dig rule keeps
   working, and pockets and home simply do not list them: gardenB2Kept). A wing's `keep` says which.

     GB2_WINGS              the wings, in order: { id, name, short, item (the item kind it takes), keeper (a villager), case (how an
                            exhibit is shown), keep, icon, gift (the keeper's present for the wing's first piece) }
     GB2_MUSEUM             the rewards: xp a gift, the milestones of the whole collection (a present each, from a keeper)
     GB2_FACTS[wing][id]    the keeper's fact about each kind (a kind with none: its own note from the catalogue)
     gardenMuseumKeyOf(item)        'f.perch' for 'fish:perch-2', 'b.comma' for 'bug:comma', 'o.raptor-skull', 'c.clay-pipe', or ''
     gardenMuseumWing(id)           a wing's row                         gardenMuseumIds(wing)   every id the wing can hold, in book order
     gardenMuseumThanks(keeper, name, n)   the keeper's thank-you        gardenMuseumFact(wing, id)  the fact ('' when none)
     gardenMuseumClean(raw)         a friend's museum as a snapshot says it (`mu`): ids from the tables, numbers in bounds, or null
   Evaluated by the friends' server too (lib/friends/garden.mjs): it names the catalogue's tables only inside functions, guarded.
   ============================================================ */
const GB2_WINGS = [
  Object.freeze({ id: 'f', name: 'The River Hall', short: 'River Hall', item: 'fish', what: 'fish', keeper: 'pip', case: 'tank', icon: 'fish', gift: 'decor:aquarium', giftSay: 'Here, have my old tank. Your own best catches can swim in it at home.', blurb: 'Every fish of the vale, each in its own water: the village pond to the mountain tarn, and on to the sea.' }),
  Object.freeze({ id: 'b', name: 'The Glasshouse', short: 'Glasshouse', item: 'bug', what: 'bugs', keeper: 'quince', case: 'jar', icon: 'bug', gift: 'decor:bug-case', giftSay: 'Take this case home with you. Pin your favourites in it, so friends can see them.', blurb: 'A warm glass room for the vale’s butterflies, bees, beetles and moths.' }),
  Object.freeze({ id: 'o', name: 'The Stone Gallery', short: 'Stone Gallery', item: 'fos', what: 'fossil pieces', keeper: 'tam', case: 'plinth', keep: true, icon: 'bone', gift: 'decor:stone-urn', giftSay: 'I dug this old urn up years ago. It wants a garden.', blurb: 'Bones of beasts that walked the vale long before anyone. A whole skeleton stands up when it is complete.' }),
  Object.freeze({ id: 'c', name: 'The Curio Cabinet', short: 'Curio Cabinet', item: 'cur', what: 'curios', keeper: 'bramble', case: 'frame', keep: true, icon: 'gem', gift: 'decor:dc-snow-globe', giftSay: 'A curio for your own shelf. Somebody left it on my step.', blurb: 'Odd little things people lost, each with a story and a tidy label.' }),
];
/** Another wing (a lane's shells, stones): { id (one letter, unused), name, short, item (the item kind: its ids are what `ids` lists),
 *  keeper, case ('tank' | 'jar' | 'plinth' | 'frame'), keep, icon, ids() -> [id], nameOf(id) -> words, svg(id, px) -> markup }. */
function gardenB2WingAdd(row) {
  if (!row || !/^[a-z]$/.test(String(row.id || '')) || GB2_WINGS.some(w => w.id === row.id || w.item === row.item) || typeof row.ids !== 'function') return false;
  GB2_WINGS.push(Object.freeze(Object.assign({ case: 'frame', icon: 'gem', keeper: 'bramble', what: 'things' }, row)));
  return true;
}
const GB2_MUSEUM = Object.freeze({
  xp: 3,
  // the whole collection's milestones: a present from a keeper, shown in your garden (all existing things)
  steps: Object.freeze([
    Object.freeze({ at: 10, item: 'decor:trophy-board', who: 'pip', say: 'Ten on show! Have a trophy board for your three biggest fish.' }),
    Object.freeze({ at: 25, item: 'tool:satchel', who: 'bramble', say: 'Twenty-five. You’ll be wanting more pockets, carrying all this about. Have my old satchel.' }),
    Object.freeze({ at: 50, item: 'decor:fish-flag', who: 'quince', say: 'Fifty! The whole village is talking. Fly this flag over your garden.' }),
    Object.freeze({ at: 100, item: 'tool:can-4', who: 'tam', say: 'A hundred. I polished this can for you. It is gold all the way through. Probably.' }),
  ]),
});
/* ---------- the keepers' words ---------- */
const GB2_KEEPER_SAYS = Object.freeze({
  pip: Object.freeze({ hi: 'Welcome to the River Hall! Every fish in the vale, each in its own water. Bring me one I haven’t got.', thanks: Object.freeze(['Oh, {a}! Thank you! Straight into a tank it goes.', '{A}! Brilliant. Look at it go round.', 'You found {a}! The River Hall is glad of it.']), have: 'We have {a} already. Thank you, though!', done: 'That is every fish in the vale. The River Hall is complete!' }),
  quince: Object.freeze({ hi: 'The Glasshouse is warm, mind your step. Butterflies at the front, beetles at the back.', thanks: Object.freeze(['{A}! Oh, it’s lovely. Thank you!', 'Into the Glasshouse with you. Thank you, dear.', '{A}, how kind. It has a corner of its own now.']), have: 'We have {a} already. Thank you, though!', done: 'Every bug in the vale, under one roof. The Glasshouse is complete!' }),
  tam: Object.freeze({ hi: 'The Stone Gallery. Dig something up and I’ll stand it on a plinth.', thanks: Object.freeze(['{A}. Good. I’ll stand it on a plinth. Thank you.', 'Hm. {A}. That took some digging, I expect. Thank you.', '{A}. Old as anything. Thank you.']), have: 'We have {a} already. Thank you, though.', done: 'Every bone on its plinth. The Stone Gallery is complete.' }),
  bramble: Object.freeze({ hi: 'The Curio Cabinet. Odd little things, every one with a story. I keep the labels tidy.', thanks: Object.freeze(['Well now. {A}. That goes in the cabinet, with a label. Thank you.', '{A}! I’ve been wanting one of those. Thank you kindly.', '{A}. Somebody lost that a long time ago. Thank you.']), have: 'We have {a} already. Thank you, though!', done: 'Every curio, labelled. The Curio Cabinet is complete!' }),
});
/** The keeper's thank-you for the n-th gift, the thing's name worked in ('a perch', 'an eel', 'Old Whiskers'). proper: a legend's own
 *  name, said without 'a'. */
function gardenMuseumThanks(keeper, name, n, proper) {
  const K = GB2_KEEPER_SAYS[keeper] || GB2_KEEPER_SAYS.pip, list = K.thanks, line = list[Math.abs(Math.floor(Number(n) || 0)) % list.length];
  return _gb2muWords(line, name, proper);
}
function gardenMuseumHave(keeper, name, proper) { const K = GB2_KEEPER_SAYS[keeper] || GB2_KEEPER_SAYS.pip; return _gb2muWords(K.have, name, proper); }
/** 'a perch', 'an eel', 'an Atlantic salmon', 'the Duchess', 'Old Whiskers'. */
function gardenMuseumA(name, proper) {
  const n = String(name || 'that');
  if (proper) return n.replace(/^The /, 'the ');
  const first = n.split(/[\s-]/)[0], lower = /^(Atlantic|Arctic|Camberwell)$/.test(first) || !/^[A-Z][a-z’']*$/.test(first) ? n : n.charAt(0).toLowerCase() + n.slice(1);
  return (/^[aeiou]/i.test(lower) ? 'an ' : 'a ') + lower;
}
function _gb2muWords(line, name, proper) {
  const a = gardenMuseumA(name, proper);
  return String(line).replace('{A}', a.charAt(0).toUpperCase() + a.slice(1)).replace('{a}', a);
}
/* ---------- the facts: one a kind, said by the wing's keeper ---------- */
const GB2_FACTS = Object.freeze({
  f: Object.freeze({
    minnow: 'Minnows swim in shoals, and a frightened one lets off a scent that warns all the others.',
    roach: 'A roach has red eyes, and can live for more than ten years.',
    perch: 'Perch hunt together in little packs, and their stripes hide them among the reeds.',
    goldfish: 'Goldfish were bred from a plain grey-green carp in China, more than a thousand years ago.',
    rudd: 'A rudd’s mouth turns upwards, so it can sip insects from the top of the water.',
    tench: 'The tench is called the doctor fish: old stories said its slime could heal other fish.',
    'brown-trout': 'No two brown trout have quite the same spots: every one has its own pattern.',
    eel: 'Every eel hatches far away in the Sargasso Sea and swims across the ocean to reach our rivers.',
    grayling: 'The grayling has a great sail of a back fin, and a fresh one smells faintly of thyme.',
    pike: 'A pike waits perfectly still among the weed, then strikes faster than you can blink.',
    'old-whiskers': 'Nobody knows how old he is. The old angler says forty years at least, and Old Whiskers isn’t telling.',
    stickleback: 'The father stickleback builds the nest and guards the eggs all by himself.',
    dace: 'Dace are quick silver fish that only live where the water runs clean and fast.',
    'stone-loach': 'Stone loach hide under stones by day, and feel for food with six little whiskers.',
    'smooth-newt': 'A newt starts life in the water with feathery gills, then grows legs and walks out onto land.',
    'signal-crayfish': 'The white-clawed crayfish is the only crayfish that truly belongs here, and it needs very clean water.',
    'great-crested-newt': 'In spring the male great crested newt grows a wavy crest all along his back.',
    'ballan-wrasse': 'Every ballan wrasse starts life as a female. Some turn into males when they are older.',
    'sprite-of-the-shallows': 'Thistle swears it hums when the foxgloves open. I have never heard it. But then, I’m an otter.',
    gudgeon: 'A gudgeon feels its way along the riverbed with two whiskers at the corners of its mouth.',
    chub: 'Chub eat almost anything: beetles, crayfish, even berries that fall into the river.',
    bullhead: 'It is called the miller’s thumb because its flat head looks like a thumb squashed in a mill.',
    bream: 'Bream nose about in the mud, and you can follow them by their trails of bubbles.',
    'crucian-carp': 'A crucian carp can live through a winter in a pond with almost no air left in the water.',
    'weather-loach': 'Weather loach wriggle when a storm is coming, so people once kept them to forecast the weather.',
    barbel: 'Barbel have four whiskers and love the fast, gravelly runs of big rivers.',
    'atlantic-salmon': 'A salmon swims all the way out to sea and back, and leaps up waterfalls to get home.',
    burbot: 'The burbot is a freshwater cousin of the cod, and it lays its eggs under the ice.',
    'old-log-barbel': 'It has lived under the mill wheel so long the miller counts it as part of the mill.',
    carp: 'Common carp can live for more than forty years.',
    'silver-bream': 'Silver bream have red-tinged fins: that is how you tell them from young common bream.',
    ruffe: 'The ruffe is a small, spiny cousin of the perch, and very slimy to hold.',
    'mud-crab': 'A shore crab grows by climbing out of its old shell and puffing up before the new one hardens.',
    shanny: 'Shannies can wait out of the water under wet seaweed until the tide comes back for them.',
    'wishing-fish': 'They say it eats the coins people throw in the well. It certainly looks well fed.',
    'lantern-minnow': 'It glows faintly in the dark water, like a lantern somebody dropped.',
    'old-gran': 'Old Gran has been in the stone pool longer than the stones, according to Tam. Tam may be exaggerating.',
    ide: 'The ide is a silvery river fish. The golden orfe is its golden form.',
    'golden-orfe': 'Golden orfe swim in shoals near the top of the water, so they are easy to watch.',
    'mirror-carp': 'A mirror carp has only a few big shiny scales, scattered over it like little mirrors.',
    'berry-roach': 'It turns a little pink in autumn, when the brambles drop their fruit into the water.',
    'silver-mullet': 'Grey mullet graze on the green film on stones, and are famous for being hard to hook.',
    'moon-gazer': 'It only rises on clear nights. Quince thinks it is counting the stars.',
    'sea-bass': 'Young sea bass swim far up estuaries and grow up in the half-salty water.',
    'the-duchess': 'Quince’s mother called her the Duchess because she never once hurried.',
    whitefish: 'The schelly lives in only a few cold, deep lakes in the hills, and nowhere else at all.',
    'golden-trout': 'Gorge trout live in the white water below the falls, and are stronger than they look.',
    cod: 'A big cod can lay millions of eggs in a single year.',
    vendace: 'The vendace is one of the rarest fish of all, left behind in cold lakes since the Ice Age.',
    lumpsucker: 'The lumpsucker holds onto rocks with a sucker on its belly, and the father guards the eggs.',
    'blind-loach': 'It lives so deep in the grotto that it never needed eyes at all.',
    'arctic-char': 'Arctic char have lived in our coldest lakes since the end of the last Ice Age.',
    'the-frost-maiden': 'Wick says she only rises when the tarn first freezes. Wick says a lot of things.',
    mackerel: 'Mackerel hardly ever stop swimming: the water rushing over their gills helps them breathe.',
    plaice: 'A young plaice swims upright. Then one eye moves over, and it lies flat on its side for good.',
    flounder: 'Flounders swim further up rivers than any other flatfish.',
    'sea-trout': 'A sea trout is a brown trout that went to sea and came back silver.',
    conger: 'Conger eels hide in wrecks and rocky holes, and can grow longer than a grown-up is tall.',
    'old-sun': 'The old angler has seen Old Sun twice in forty summers. Both times he forgot to cast.',
    'great-grey-ghost': 'Nobody has seen all of it at once. It is that big, or it is that shy.',
  }),
  b: Object.freeze({
    'cabbage-white': 'Cabbage white caterpillars eat cabbage leaves, which is how the butterfly got its name.',
    bumblebee: 'Bumblebees warm up by shivering their wing muscles, so they can fly on cold mornings.',
    ladybird: 'One ladybird can eat dozens of greenfly in a single day.',
    'pond-skater': 'Pond skaters feel the ripples with their legs to find insects that fall in.',
    'garden-spider': 'A garden spider often eats its old web in the morning and spins a fresh one.',
    'banded-snail': 'Banded snails come in yellow, pink and brown, with up to five dark stripes.',
    'peacock-butterfly': 'The eyes on a peacock butterfly’s wings flash open to startle birds away.',
    'elephant-hawk-moth': 'Its caterpillar looks like a little elephant’s trunk, which is how it got its name.',
    'long-tailed-blue': 'Long-tailed blues fly all the way here from the south, and only now and then.',
    'emperor-dragonfly': 'The emperor dragonfly catches its food in the air and eats it without landing.',
    'camberwell-beauty': 'Camberwell beauties sometimes fly over the sea from far in the north. Very few ever arrive.',
    'speckled-wood': 'A male speckled wood guards a sunny patch of woodland, and spirals up to chase rivals away.',
    woodlouse: 'A woodlouse is not an insect at all: it is a crustacean, a cousin of crabs and shrimps.',
    'violet-ground-beetle': 'The violet ground beetle cannot fly. It hunts slugs on foot, at night.',
    mayfly: 'A grown-up mayfly has no working mouth, and lives only a day or so.',
    'red-ant': 'Wood ants build great mounds of pine needles, and squirt a sour spray to guard them.',
    'banded-demoiselle': 'The male banded demoiselle has a dark band on each wing, and dances to show it off.',
    'oak-bush-cricket': 'The oak bush-cricket sings by drumming its back leg on a leaf.',
    'glow-worm': 'Glow-worms are beetles. The females have no wings, and glow to call the males.',
    'purple-emperor': 'The purple emperor lives high in the oak tops, and comes down to drink from puddles.',
    'the-walking-branch': 'Thistle sat on it once, thinking it was a stick. It did not mind.',
    'meadow-brown': 'Meadow browns fly even on dull days, when other butterflies stay put.',
    'field-grasshopper': 'A grasshopper sings by rubbing its back legs against its wings.',
    honeybee: 'Honeybees dance to tell each other where the best flowers are.',
    'common-darter': 'Common darters keep flying late into autumn, on chilly sunny days.',
    'field-cricket': 'Field crickets sing from the doorways of their burrows on warm evenings.',
    'old-lady': 'The old lady moth’s wings look like an old shawl, and it likes to hide in sheds.',
    'raft-spider': 'A raft spider waits at the water’s edge and can run right across the top of it.',
    'great-diving-beetle': 'It carries a bubble of air under its wing cases, so it can breathe under water.',
    swallowtail: 'The swallowtail is one of the biggest butterflies here, and one of the rarest.',
    'silver-mayfly': 'It hatches only on still summer evenings, and the whole river shimmers.',
    'the-dragon-king': 'Bramble says it has been king of the marsh since before the mill was built.',
    centipede: 'A centipede always has an odd number of pairs of legs, so never exactly a hundred.',
    'glass-snail': 'Glass snails have shells so thin you can almost see through them.',
    'lesser-stag': 'Lesser stag beetle grubs live for years inside rotting wood before they come out.',
    'minotaur-beetle': 'Minotaur beetles roll rabbit droppings down their burrows to feed their young.',
    'frost-beetle': 'It is only about when there is frost on the ground, and it does not seem to feel the cold.',
    'emperor-moth': 'Emperor moths have no mouths. The males can find a female by her scent from far away.',
    'stag-beetle': 'A stag beetle spends years as a grub in dead wood, and only a few weeks as a beetle.',
    'ice-worm': 'It lives in the snow on the tops, and goes still if you warm it in your hand.',
    'king-stag': 'Hollin has watched him for years and never once tried to catch him. You did, though.',
    'red-admiral': 'Red admirals fly here from the south every spring, and more of them stay the winter now.',
    comma: 'The comma has a little white mark under its wing, shaped just like a comma.',
    'common-wasp': 'Wasps make their paper nests by chewing up wood.',
    brimstone: 'They say the brimstone is the butter-coloured fly that gave butterflies their name.',
    cockchafer: 'Cockchafers spend three or four years underground as grubs before they fly.',
    hornet: 'Hornets look fierce, but they are calmer than wasps and rarely sting.',
    'ruby-tailed-wasp': 'The ruby-tailed wasp sneaks its eggs into other bees’ nests, and rolls into a ball when caught.',
    'honey-queen': 'A queen bee can lay two thousand eggs in a single summer’s day.',
    'singing-cicada-queen': 'One long note, once a summer. Quince waits up for it every year.',
    'small-heath': 'The small heath always rests with its wings shut, showing one little eyespot.',
    'wolf-spider': 'Wolf spiders spin no webs. The mother carries her babies about on her back.',
    'snow-flea': 'Snow fleas are tiny springtails that hop about on the snow on mild winter days.',
    'green-hairstreak': 'The green hairstreak is the only green butterfly in this country.',
    'marbled-white': 'For all its black and white, the marbled white is really one of the brown butterflies.',
    'glowcap-beetle': 'It glows a soft green in the grotto, and goes dark the moment you cough.',
    'ghost-moth': 'At dusk the male ghost moths hover over the grass like little pale ghosts.',
    'the-moonlit-bride': 'Wick says she flies only under a full moon, in a dress of white dust.',
    'sand-hopper': 'Sand hoppers steer by the sun and the moon to stay at the right height on the beach.',
    'sea-slater': 'The sea slater is a big seaside cousin of the woodlouse.',
    'fog-moth': 'It comes in with the sea fog and goes out with it. Nobody knows where to.',
  }),
  o: Object.freeze({
    'raptor-skull': 'Raptors had big eyes and sharp teeth, and many of them had feathers, like birds.',
    'raptor-ribs': 'Raptors were light and quick on their feet. Their ribs are thin, like a bird’s.',
    'raptor-claw': 'A raptor held its great curved toe claw up off the ground as it ran.',
    'raptor-tail': 'A stiff tail helped a raptor keep its balance and turn sharply.',
    'turtle-shell': 'A turtle’s shell is part of its skeleton: its ribs and its backbone grow into it.',
    'turtle-head': 'Giant sea turtles were swimming the oceans while the dinosaurs walked the land.',
    'turtle-flip': 'A sea turtle’s front legs became flippers, so it could fly through the water.',
    'turtle-tail': 'Even a turtle this big had only a short stub of a tail.',
    'mammoth-skull': 'A mammoth had a high domed head and small ears, to keep the cold out.',
    'mammoth-tusk': 'Mammoth tusks were teeth that grew all their lives, and could curl right round.',
    'mammoth-leg': 'Woolly mammoths lived here in the Ice Age, when the vale was all snow and grass.',
    'mammoth-spine': 'A mammoth kept a store of fat in the hump on its back, to see it through the winter.',
  }),
  c: Object.freeze({
    'clay-pipe': 'Clay pipes were cheap and broke easily, so bits of them turn up in every old garden.',
    farthing: 'A farthing was a quarter of a penny. The smallest coin had the smallest bird on it.',
    'blue-bottle': 'Medicine came in little blue bottles, so nobody drank from one by mistake.',
    'sea-shell': 'This shell lived in a warm sea that covered all this land, millions of years ago.',
    arrowhead: 'Flint breaks into sharp flakes, so people made arrowheads from it thousands of years ago.',
    token: 'Shops and inns once made their own tokens when there were not enough real coins about.',
    'tin-soldier': 'Toy soldiers were cast in tin and painted by hand, one at a time.',
    thimble: 'A thimble keeps your finger safe when you push a needle through thick cloth.',
    marble: 'The twist inside is made by pulling coloured glass through clear glass while it is hot.',
    horseshoe: 'People hang a horseshoe with its points up, so the luck does not run out.',
    ammonite: 'Ammonites were sea creatures with coiled shells, cousins of the octopus and the squid.',
    'pot-shard': 'Broken pots went out with the rubbish, and that is how they ended up in the ground.',
    'bird-ring': 'Every bird ring has its own number, so whoever finds one can tell where the bird has been.',
    stopper: 'A glass stopper was ground to fit its own bottle and no other.',
    button: 'Buttons with anchors on were sewn on sailors’ coats.',
    'lead-seal': 'Lead seals were squeezed onto bales of cloth to show where the cloth was made.',
    bell: 'Little bells like this hung on harnesses, and on cats who were not to be trusted with birds.',
    spoon: 'Bent spoons are some of the commonest finds in old gardens. Everybody digs with one sooner or later.',
    'key-tag': 'Key tags hung on hooks in inns and big houses, so every key could find its door.',
    dice: 'People have played with dice carved from bone for thousands of years.',
  }),
});
function gardenMuseumFact(wing, id) { const t = GB2_FACTS[wing]; return (t && t[id]) || ''; }
/* ---------- which wing a thing belongs to ---------- */
function gardenMuseumWing(id) { return GB2_WINGS.find(w => w.id === id) || null; }
const _GB2MU_ITEM = Object.freeze({ fish: 'f', bug: 'b', fos: 'o', cur: 'c' });
/** 'f.perch' for 'fish:perch-2' (any quality), 'b.comma', 'o.raptor-skull', 'c.clay-pipe'; '' for anything a museum does not take. */
function gardenMuseumKeyOf(item) {
  const k = String(item || ''), i = k.indexOf(':'); if (i < 0) return '';
  const kind = k.slice(0, i), id = k.slice(i + 1);
  let wing = _GB2MU_ITEM[kind]; if (!wing) { const W = GB2_WINGS.find(w => w.item === kind); wing = W ? W.id : ''; }
  if (!wing) return '';
  if (kind === 'fish') { const m = /^([a-z0-9-]+)-[0-3]$/.exec(id), fid = m ? m[1] : id; return gardenMuseumIds('f').includes(fid) ? 'f.' + fid : ''; }
  return gardenMuseumIds(wing).includes(id) ? wing + '.' + id : '';
}
const _gb2muIdMemo = new Map();
/** Every id a wing holds, in the book's order (fish and bugs by their number in the Field Journal). Only real fish: no junk, no treasure. */
function gardenMuseumIds(wing) {
  if (_gb2muIdMemo.has(wing)) return _gb2muIdMemo.get(wing);
  let ids = [];
  try {
    if (wing === 'f' && typeof GARDEN_FISH_ONLY !== 'undefined') ids = GARDEN_FISH_ONLY.filter(d => d.cat === 'fish').slice().sort((a, b) => (a.legend - b.legend) || (a.n - b.n)).map(d => d.id);
    else if (wing === 'b' && typeof GARDEN_BUGS !== 'undefined') ids = GARDEN_BUGS.slice().sort((a, b) => (a.legend - b.legend) || (a.n - b.n)).map(d => d.id);
    else if (wing === 'o') ids = typeof GP_FOSSILS !== 'undefined' ? GP_FOSSILS.flatMap(F => F.parts.map(P => F.id + '-' + P[0])) : Object.keys(GB2_FACTS.o);
    else if (wing === 'c' && typeof GARDEN_LAND_CURIOS !== 'undefined') ids = GARDEN_LAND_CURIOS.map(c => c.id);
    else { const W = gardenMuseumWing(wing); if (W && typeof W.ids === 'function') ids = W.ids().map(String); }
  } catch (e) { ids = []; }
  const out = Object.freeze(ids.filter(id => /^[a-z0-9-]{1,40}$/.test(id)));
  if (out.length) _gb2muIdMemo.set(wing, out);   // (an empty list is not kept: the table may not be loaded yet)
  return out;
}
/* ---------- a friend's museum, as their snapshot says it ---------- */
/** { n, f: [[id, cm]], b: [id], o: [id], c: [id], g?: [[wing, id]] (given by a friend), w?: [[wing, ids]] (a wing a newer app added) }
 *  Only ids this app knows, only numbers in bounds; null when there is nothing. The sender cleans with this too, so a field that is sent
 *  is never refused (one bad row would fail the whole snapshot). */
function gardenMuseumClean(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const known = (w) => new Set(gardenMuseumIds(w)), int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(Number(v) || 0)));
  const out = { n: 0, f: [], b: [], o: [], c: [] };
  const F = known('f'), seenF = new Set();
  for (const r of Array.isArray(raw.f) ? raw.f.slice(0, 80) : []) { if (!Array.isArray(r) || !F.has(r[0]) || seenF.has(r[0])) continue; seenF.add(r[0]); out.f.push([String(r[0]), int(r[1], 0, 400)]); }
  for (const w of ['b', 'o', 'c']) { const K = known(w), seen = new Set(), max = w === 'b' ? 80 : w === 'o' ? 24 : 64; for (const id of Array.isArray(raw[w]) ? raw[w].slice(0, max) : []) { if (typeof id !== 'string' || !K.has(id) || seen.has(id)) continue; seen.add(id); out[w].push(id); } }
  if (Array.isArray(raw.g)) { const g = []; for (const r of raw.g.slice(0, 64)) { if (!Array.isArray(r) || !['f', 'b', 'o', 'c'].includes(r[0]) || typeof r[1] !== 'string') continue; const list = r[0] === 'f' ? out.f.map(x => x[0]) : out[r[0]]; if (list.includes(r[1])) g.push([r[0], r[1]]); } if (g.length) out.g = g; }
  out.n = int(Math.max(Number(raw.n) || 0, out.f.length + out.b.length + out.o.length + out.c.length), 0, 9999);
  return out;   // (empty too: a museum with nothing in it yet, and a friend's page knows it can be given to)
}
