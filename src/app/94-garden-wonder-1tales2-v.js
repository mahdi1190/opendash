/* ============================================================
   GARDEN WONDER, stories: forty small stories (v-) (drafted in C:/tmp/stories/vignettes.md; wired by the story lead; format: docs/dev/STORIES.md).
   Loads after 94-garden-wonder-1tales.js (the main line), so it can add beats to it.
   ============================================================ */
wdTaleAdd({ id: 'v-bottle', kind: 'small', title: 'The bottle', journal: 'Someone very bored, twice.', gentle: 'keep', steps: [
  { id: 'a', who: 'catch', when: { level: 2 }, lines: [
    'A bottle on the line, corked, with paper inside. In pencil: “If you find this I am eleven and I am SO bored. It is raining. Write back. You can’t, can you. Never mind. — Fen.”'] },
  { id: 'b', who: 'place', near: ['west-rockpool', 'ls-otter-beach'], when: { open: [1], season: ['summer'], days: 3 }, lines: [
    'Wedged in the rocks at Wren cove, another bottle. Same handwriting, only bigger and more slanted.',
    '“I am forty-one. I am still bored. It is still raining. If you found the first one, hello again. If you didn’t, hello. — Fen.”'],
    give: { 'decor:play-sv-sea': 1 } },
  { id: 'c', who: 'place', free: 1, near: ['west-rockpool', 'ls-otter-beach'], when: { after: 'v-bottle.b' }, lines: ['You set Fen’s two bottles side by side. Thirty years between them, and the same rain.'], give: { 'keep:fen-bottles': 1 } },
] });

wdTaleAdd({ id: 'v-gerald', kind: 'small', title: 'Gerald', journal: 'The duck census, and its most loyal entry.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['lake-board', 'lake-hall'], lines: [
    'Pinned to the lake board, a duck count, kept weekly in a careful hand. Mallards 11. Tufted 4. Coot 3 (rude). Gerald 1.',
    'The sheet underneath is older. Gerald 1. The one under that: Gerald 1. Gerald has been counted for a very long time.'] },
  { id: 'b', who: 'place', near: ['reed-bank', 'pond-grove'], when: { tod: ['dawn'], days: 1 }, lines: [
    'In the reeds, a wooden decoy duck, painted and repainted, anchored by a string. Someone has given it a little knitted hat.',
    'It is plainly Gerald. It is plainly not a duck. Nobody has ever crossed it off.'] },
] });

wdTaleAdd({ id: 'v-specs', kind: 'small', title: 'Tam’s spectacles', journal: 'Spectacles for a mole, who can’t see with them either.', gentle: 'keep', steps: [
  { id: 'a', who: 'tam', when: { heart: 1 }, lines: [
    'Lost my spectacles. Don’t say it. I know. Moles. They’re not for seeing. They’re for looking like someone who reads.',
    'Had them on near the cottage beds. Then I didn’t. Have a look? I’d go myself but I can’t see without them. That’s a joke. I can’t see with them either.'] },
  { id: 'b', who: 'place', free: 1, near: ['lc-cottage-bed', 'lc-front-bed'], when: { after: 'v-specs.a' }, lines: [
    'Half-buried by the bean poles: a tiny pair of round spectacles. No glass in them at all. You pocket them for Tam.'], set: { 'v-specs.found': 1 } },
  { id: 'c', who: 'tam', when: { flag: { 'v-specs.found': 1 } }, lines: [
    'You found them. Right. Thank you. Don’t look at me while I put them on. There. Clever. Distinguished.',
    'For your trouble. Worms made most of it. Credit where it’s due.'],
    give: { fertiliser: 1 } },
] });

wdTaleAdd({ id: 'v-umbrella', kind: 'small', title: 'The umbrella', journal: 'An umbrella with very clear instructions.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['lc-the-green', 'lc-fountain-green'], when: { rain: 1 }, lines: [
    'Hooked over the bench on the green, a black umbrella. A brown label on a string: “If found, please return to the owner of this umbrella.”',
    'You turn the label over. On the back: “That’s you now. Sorry. It leaks on the left.”'] },
  { id: 'b', who: 'pip', when: { days: 2, rain: 1 }, lines: [
    'You’ve got Hazel’s umbrella! She came through on the boat last spring. Leaves one everywhere she goes. On purpose. She says the world has enough people who keep things.',
    'Leaks on the left, does it? They all leak on the left. I think she buys them like that.'] },
] });

wdTaleAdd({ id: 'v-frogs', kind: 'small', title: 'The frog choir', journal: 'Mother Thistle’s choir, which is mostly frogs and entirely flat.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['great-oak-clearing', 'ls-frog-steps'], when: { open: [1], season: ['summer'], tod: ['night'], dry: 1 }, lines: [
    'From the clearing, a sound like twenty small doors creaking. Mother Thistle stands on a root with a twig, conducting. The frogs are not following the twig.'] },
  { id: 'b', who: 'thistle', when: { heart: 1, days: 1 }, lines: [
    'You heard my choir. Be honest, dear. No, don’t. I know. They sing whatever they like, whenever they like. I just stand there and wave.',
    'It isn’t about the singing. It’s that nobody has to sing on their own. You can join in. Nobody minds what you sound like. Least of all the frogs.'],
    choice: [{ k: 'sing', label: 'Croak along', mood: { thistle: 1 }, t: 'Oh, lovely. Flat as a griddle. You’ll fit right in.' }, { k: 'listen', label: 'Just listen', t: 'Listening counts. Somebody has to be the audience. They like an audience.' }],
    give: { 'decor:stone-frog': 1 } },
] });

wdTaleAdd({ id: 'v-hats', kind: 'small', title: 'Where hats go', journal: 'Pip’s hats, all of them.', gentle: 'keep', steps: [
  { id: 'a', who: 'pip', when: { heart: 1 }, lines: [
    'Lost my hat. In the falls. Leaned over to look at a trout, and the hat leaned further. That’s my seventh this year. Hats don’t like me. Or they like waterfalls more.'] },
  { id: 'b', who: 'place', free: 1, near: ['ld-falls-cave', 'ld-falls'], r: 2, when: { after: 'v-hats.a' }, lines: [ // anchor (proposed): ld-falls-cave
    'Behind the curtain of water, on a ledge where the spray eddies round, a heap of soggy hats. A straw one. A woolly one. A sou’wester. Something that was once a feather.',
    'Eleven, at least. All Pip’s size.'], set: { 'v-hats.pile': 1 } },
  { id: 'c', who: 'pip', when: { flag: { 'v-hats.pile': 1 } }, lines: [
    'ELEVEN? Behind the falls? So that’s where they go! I thought they were going to sea. I was quite proud of them.',
    'You have one. No, have the good one. The green one. It’s been through a waterfall. It’s had a more interesting life than most hats.'], give: { 'keep:pip-hat': 1 } },

] });

wdTaleAdd({ id: 'v-scarecrow', kind: 'small', title: 'I am a heron', journal: 'Bramble’s scarecrow, and its sign.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['ls-allot-row', 'ls-bean-beds', 'ls-first-furrow'], when: { open: [2] }, lines: [
    'In the allotments, a scarecrow made of a broom, a grey coat and a very long sock for a neck. Its sign says, in capitals: I AM A HERON. GO AWAY.',
    'A real heron is standing next to it, looking at it.'] },
  { id: 'b', who: 'bramble', when: { heart: 1, days: 1 }, lines: [
    'The scarecrow is mine. Crows aren’t afraid of people. They are afraid of herons. So I made a heron. It is accurate. I measured one.',
    'Yes, a heron moved in beside it. Yes, it eats my peas. I am treating it as a compliment to the likeness.'],
    give: { 'decor:scarecrow': 1 } },
] });

wdTaleAdd({ id: 'v-weather', kind: 'small', title: 'To the Weather', journal: 'A complaint, and a reply.', gentle: 'keep', steps: [
  { id: 'a', who: 'post', from: 'Perpetua', sign: 'Perpetua, Post', when: { rain: 1, level: 3 }, lines: [
    'Somebody has posted a letter addressed TO THE WEATHER, CLOUDBREAK. It says: “Dear Weather, Three Tuesdays. THREE. My washing has never been dry. Yours, Disappointed.”',
    'I can’t deliver it. I don’t know where the weather lives. I am sending it to you, because you get about.'] },
  { id: 'b', who: 'wick', when: { open: [5], days: 2 }, lines: [
    'I got a letter for the weather. I’m the nearest thing up here. I wrote back.',
    '“Dear Disappointed. Noted. Try Thursdays. — The Weather (per W.)” Don’t tell them it’s me. It’s the most important I’ve felt in years.'], give: { 'keep:weather-letters': 1 } },

] });

wdTaleAdd({ id: 'v-under-bench', kind: 'small', title: 'Under the bench', journal: 'An old insult, and an old answer.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['ld-terrace-bench', 'ld-bench-a'], lines: [ // anchor (proposed): ld-terrace-bench
    'You drop your trowel and kneel to fetch it. Carved on the underside of the bench, in big young letters: BRAMBLE IS A GOOSE. — Q.',
    'On the leg beside it, much smaller and very neat: I AM NOT. — B. Under that, in Q’s hand again: GOOSE.'] },
  { id: 'b', who: 'quince', when: { heart: 1, days: 1 }, lines: [
    'You found the bench. I was twelve. Bramble was eleven and correcting everybody’s spelling, and I had a penknife. The bees will tell you I regret it. I don’t.',
    'Bramble came back the next day with a ruler to make the letters straight. That’s the whole friendship, really. Sixty years. Still a goose.'] },
] });

wdTaleAdd({ id: 'v-fog-bell', kind: 'small', title: 'The fog bell', journal: 'A bell over the Mere, rung for one boat.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['tackle-shop', 'jetty-post', 'reed-bank'], when: { fog: 1 }, lines: [
    'A bell rings out over the grey water, slowly, every so often. The tackle shop’s shutter is up. A badger in a cardigan rings a ship’s bell on the step, and peers.'] },
  { id: 'b', who: 'place', near: ['tackle-shop', 'jetty-post'], when: { fog: 1, days: 1 }, lines: [
    'A rowing boat noses out of the murk and bumps the jetty. A second badger climbs out with a flask. “I know where the shop is, Len. I’ve lived across the Mere for thirty-one years.”',
    '“I know you do,” says Len, and rings it once more, for luck. She takes his arm. Neither of them mentions that the fog has already lifted.'],
    give: { 'decor:wind-chimes': 1 } },
] });

wdTaleAdd({ id: 'v-worms', kind: 'small', title: 'The worm tally', journal: 'Everything you’ve taken, written down by a mole.', gentle: 'keep', steps: [
  { id: 'a', who: 'tam', when: { heart: 2, level: 5 }, lines: [
    'Two hundred and fourteen. Worms. From my tunnels. For your fishing. I’ve been keeping a tally. On the wall. With a claw.',
    'I don’t want them back. Obviously. They’re used. I just thought you should know there was a number.'],
    choice: [
      { k: 'thanks', label: 'Say thank you', mood: { tam: 1 }, set: { 'v-worms.thanked': 1 }, t: 'There. That’s what I wanted. Nobody says it. Not to moles. Not about worms. Go on, take two hundred and fifteen.' },
      { k: 'pay', label: 'Offer to pay', t: 'Pay? With what, coins? I live in the ground. Where would I put a coin. I’d just have a coin in my wall. Forget it. A thank you would do.' },
      { k: 'joke', label: 'Ask if the worms mind', t: 'Course they mind. They’re worms. They mind everything. That’s not the point and you know it.' }] },
] });

wdTaleAdd({ id: 'v-toy-duck', kind: 'small', title: 'The duck in the reeds', journal: 'A toy Pip lost, and kept looking for.', gentle: 'keep', steps: [
  { id: 'a', who: 'catch', when: { level: 4 }, lines: [
    'Your net comes up with weed, a snail, and a small wooden duck on wheels. The wheels are gone. The paint is nearly gone. Someone carved a P under its tail.'], set: { 'v-toy-duck.got': 1 } },
  { id: 'b', who: 'pip', when: { heart: 2, flag: { 'v-toy-duck.got': 1 } }, lines: [
    'That’s MINE. That’s Quack! I lost Quack in a river when I was tiny. I don’t know which river. I’ve been looking in all of them. That’s partly why I go down all of them.',
    'Was it the Mere? All this time it was the Mere? I’ve swum past it about a thousand times.',
    'You keep it. No. I’ll keep it. No. We’ll take turns. Same as with a dog.'] },
] });

wdTaleAdd({ id: 'v-clapper', kind: 'small', title: 'The clapper', journal: 'A silent bell, and the owl who took its voice.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['ld-chapel', 'ruin-court'], when: { open: [3] }, lines: [
    'The chapel bell hangs in its little arch, green with age. You give the rope a pull. Nothing. Inside the bell, where the clapper should be, a sparrow’s nest.'] },
  { id: 'b', who: 'wick', when: { heart: 2, days: 1 }, lines: [
    'The clapper? Yes. I have it. It’s holding my door open. I took it the summer they rang it every morning at five. Every morning. For a whole summer. Somebody’s idea.',
    'I suppose that makes me a thief. I suppose I am one. Forty years, it’s been a doorstop.'],
    choice: [
      { k: 'back', label: 'Ask him to give it back', set: { 'v-clapper.back': 1 }, t: 'Oh, very well. Take it. Tell them it was the wind. No. Tell them it was me. If you’re going to give a thing back you may as well do it properly.' },
      { k: 'keep', label: 'Say the sparrows like the quiet', t: 'They do, don’t they. Quiet’s a thing you can give, as well. Leave it, then. For now.' }] },
  { id: 'c', who: 'place', near: ['ld-chapel'], when: { flag: { 'v-clapper.back': 1 }, days: 2 }, lines: [
    'Someone has hung the clapper back, and moved the sparrows’ nest to a ledge beside the bell, very carefully. It rings once at noon, quite softly, and stops.'] },
] });

wdTaleAdd({ id: 'v-beans', kind: 'small', title: 'Danny’s beans', journal: 'Beans grown for someone who isn’t here.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['ls-bean-beds', 'ls-pea-sticks', 'ls-bean-corner'], when: { open: [2], season: ['summer'] }, lines: [
    'At the end of a bean row, a lolly-stick marker in felt-tip, redone so many times the stick is more ink than wood: DANNYS BEANS. AGE 6. KEEP OFF.',
    'The beans are tall and very well tended.'] },
  { id: 'b', who: 'bramble', when: { days: 1 }, lines: [
    'Danny’s beans. His mother grows them. Danny is thirty-eight. He lives over the hills and works in an office and rings on Sundays. Nobody has died. I say that because people assume.',
    'She grows them anyway. She says he planted the first one and she hasn’t had the heart to stop. I think it is the most sensible thing anyone in this vale does. Don’t tell her I said.'],
    give: { fertiliser: 1 } },
] });

wdTaleAdd({ id: 'v-heron', kind: 'small', title: 'One spot', journal: 'The heron on the second stone.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['ls-heronry', 'ls-heron-isle'], when: { open: [2], tod: ['dusk'] }, lines: [
    'Two flat stones in the shallows. An old heron stands on the left one. The right one is empty, and the heron faces it.'] },
  { id: 'b', who: 'wick', when: { heart: 2, days: 1 }, lines: [
    'The old heron. Its mate stood on the other stone for twenty years. Then didn’t. It still stands there at dusk. Not waiting. Herons aren’t daft.',
    'Keeping her company, I think. You do that for a while. Then it turns into just where you stand.'],
    sit: 'You watch the heron for a while. It doesn’t move. Neither do you. The light goes.' },
] });

wdTaleAdd({ id: 'v-map-home', kind: 'small', title: 'The map comes home', journal: 'One of Bramble’s father’s maps, back over the hills.', gentle: 'keep', steps: [
  { id: 'a', who: 'traveller', name: 'A tall hare with a rucksack', look: { kind: 'hare', fur: '#a08868', coat: '#5a6a4a', hat: 'cap', hatc: '#4a4a3a' }, near: ['ld-quay'], when: { after: 'bramble-sister.a', days: 3 }, lines: [
    'A tall hare with a rucksack is waiting on the quay with a flat parcel. “Excuse me. Is there someone called Bramble here? My grandfather bought this from a woman, years ago. I think it should come home. Could you take it? I don’t want to make a fuss.”',
    'The parcel is a map of the vale in brown ink. The signature in the corner is not Bramble’s, but the handwriting is very like it.'], set: { 'v-map-home.have': 1 } },
  { id: 'b', who: 'bramble', when: { flag: { 'v-map-home.have': 1 }, heart: 3 }, lines: [
    'That is my father’s. That is the mill as it was. Look, he put the goats in.',
    'You want to know if this changes anything about my sister. It doesn’t. This came back. She didn’t bring it.'],
    choice: [
      { k: 'tell', label: 'Say you could write to her about it', set: { 'v-map-home.write': 1 }, t: 'I could. I won’t this year. I’ll keep it on the desk. That is not a reply. It is a desk.' },
      { k: 'hang', label: 'Help hang it in the barn', mood: { bramble: 1 }, t: 'Left a bit. Your left. There. It goes next to mine. His is better. Don’t agree with me.' }] },
] });

wdTaleAdd({ id: 'v-less-salt', kind: 'small', title: 'Less salt', journal: 'A recipe with two cooks in it.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['market-stall'], lines: [
    'In the box of old books on the market stall, a cookbook falling apart at the soups. Beside the leek and potato, in pencil: “Mum’s. Less salt. She always said I’d put too much.”',
    'Lower, in different pencil, years later: “I put too much. It was right.”'] },
  { id: 'b', who: 'thistle', when: { season: ['autumn', 'winter'], days: 1 }, lines: [
    'You’ve got Marigold’s book. She sold it on when she moved. Here, give it me, dear. I know that soup.',
    'Her mother and her used to fight about the salt every Sunday for twenty years. Then it was just her, and she put too much in, and cried, and said it was perfect. I’ll make you some. I’ll put too much in.'], give: { 'recipe:less-salt': 1 } },

] });

wdTaleAdd({ id: 'v-lead', kind: 'small', title: 'The lead on the hook', journal: 'A walk that still happens.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['jetty-post', 'harbour-walk', 'ld-lighthouse'], when: { tod: ['dusk'] }, lines: [
    'An old otter takes a red dog lead down from a hook by the harbour office and walks the length of the quay with it looped over one arm. At the end she stops, looks at the sea for a while, and walks back.',
    'She hangs it up again. There is no dog.'] },
  { id: 'b', who: 'angler', when: { days: 2 }, lines: [
    'Morwenna. Her dog was called Biscuit. Biscuit liked the end of the quay, so she still goes. Fifteen years he’s been gone. Fifteen years she’s gone to the end of the quay.',
    'People say she should stop. I don’t. It’s a good walk.'] },
] });

wdTaleAdd({ id: 'v-ring', kind: 'small', title: 'Always', journal: 'A ring the Mere kept for fifty years.', gentle: 'keep', steps: [
  { id: 'a', who: 'catch', when: { after: 'v-fog-bell.b', level: 6 }, lines: [
    'Something tiny glints in the weed on your hook. A gold ring, thin with wear. Inside, worn almost smooth: ALWAYS.'], set: { 'v-ring.got': 1 } },
  { id: 'b', who: 'place', near: ['tackle-shop'], when: { flag: { 'v-ring.got': 1 } }, lines: [
    'Len the badger turns the ring over and over. “I threw that in. Fifty-one years ago. We had a row about a boat. I don’t remember what about the boat. I threw it, and then I swam all night looking for it.”',
    '“She bought me another one the week after. Cheaper. Says it suits me better.” He puts the old one on his little finger. “Don’t tell her. I’ll tell her. Tonight. I’ll row over.”'],
    choice: [{ k: 'tell', label: 'Say she’ll be glad', t: '“She’ll say I’m a fool.” He smiles. “She’ll be right. She usually is.”' }, { k: 'quiet', label: 'Say nothing', t: 'He nods, and puts a bait bucket into your arms as if that settled something.' }],
    give: { 'decor:bait-bucket': 1 } },
] });

wdTaleAdd({ id: 'v-walker-stone', kind: 'small', title: 'The walker’s stone', journal: 'A stone carried up a mountain for someone.', gentle: 'keep', steps: [
  { id: 'a', who: 'traveller', name: 'A grey goat in good boots', look: { kind: 'goat', fur: '#9a9890', coat: '#6a4e3a', hat: 'wide', hatc: '#4e4438' }, near: ['ld-quay'], when: { open: [5], dry: 1 }, lines: [
    'A grey goat in good boots asks the way to the summit. In her hand, a flat garden stone with a painted blue stripe.',
    '“My brother and I didn’t speak for nine years. Something about our father’s house. He died in the spring. This is from his garden. The top of Cloudbreak was the only place we both ever liked.”'],
    choice: [{ k: 'walk', label: 'Offer to walk with her', set: { 'v-walker-stone.walk': 1 }, t: '“Would you? Only to the pass. I’d like to do the last bit on my own.”' }, { k: 'way', label: 'Show her the way', t: '“Thank you. I’ll manage. I’ve been carrying it this far.”' }] },
  { id: 'b', who: 'place', near: ['ld-cairn', 'cloudbreak-west-peak', 'ls-skylark-top'], when: { days: 1, dry: 1 }, lines: [ // anchor (proposed): ld-cairn
    'On the summit cairn, near the top, a flat stone with a blue stripe. Wedged under it, a folded note in pencil.',
    '“Never did say it, did I. Sorry. You too, probably. — M.”'],
    give: { 'decor:rw-orn-cairn': 1 } },
] });

wdTaleAdd({ id: 'v-sheaf', kind: 'small', title: 'The last sheaf', journal: 'A corn dolly, and who taught Quince to make one.', gentle: 'keep', steps: [
  { id: 'a', who: 'quince', when: { open: [4], season: ['autumn'], heart: 2 }, lines: [
    'Last sheaf of the year. You plait it into a dolly and keep it over the door till spring, and then it goes back in the ground. That’s the luck. I made the luck up. The dolly’s real.',
    'My mother taught me. Over, under, and pull. She was good at the hands of things. Less good at other things. Hold this end.'],
    choice: [{ k: 'plait', label: 'Help plait it', mood: { quince: 1 }, t: 'Over, under, pull. Too tight. Good. Tight’s better than loose. She’d have said that. She did say that.' }, { k: 'watch', label: 'Watch her hands', t: 'Fourteen crossings. I count them. Of course I count them. There.' }],
    give: { 'decor:rw-orn-sheaf': 1, 'keep:corn-dolly': 1 } },

] });

wdTaleAdd({ id: 'v-swallows', kind: 'small', title: 'Swallows', journal: 'Perpetua, and the quick ones.', gentle: 'keep', steps: [
  { id: 'a', who: 'post', from: 'Perpetua', sign: 'Perpetua, Post', when: { season: ['spring'], level: 3 }, lines: [
    'Not post. The swallows came back today. They go all the way to the hot countries and back again, in less time than I take to do the high street.',
    'I am not jealous. I am a little jealous. My sister went with the swallows, in a manner of speaking. She sailed south when we were young and sends one card a year, at about this time.',
    'Here is this year’s. She says “Still hot. Still miss the rain. Still miss you, slowcoach.” She is the only one allowed to call me that. Keep it for me. My shell is full.'] },
] });

wdTaleAdd({ id: 'v-knitter', kind: 'small', title: 'The knitter', journal: 'Small jumpers, posted every autumn.', gentle: 'soft', steps: [
  { id: 'a', who: 'traveller', name: 'A sheep, knitting', look: { kind: 'sheep', fur: '#ece4d4', coat: '#5a8a5a', hat: 'scarf', hatc: '#c84a4a' }, near: ['ld-quay'], when: { after: 'mill.brambles', season: ['autumn'] }, lines: [
    'A sheep sits on a bollard on the quay, knitting very fast, waiting for the boat. She nods at the needles. “Jumpers. For children. I knit for half the coast.”',
    '“I used to send one here every autumn. To a W. Green, always green. A little bigger each year. She’d write back, very proper: it fits; he says it itches; he says thank you.”',
    { t: '“Then one October she wrote: no more, thank you. Nothing else. I always wondered. You don’t like to ask.”', soft: '“Then one year she wrote: no more, thank you, he’s gone to sea. I always wondered if he took the jumper.”' },
    'The boat comes. The sheep packs her needles and is gone before you can say anything.'] },
] });

wdTaleAdd({ id: 'v-sweet-peas', kind: 'small', title: 'No sweet peas', journal: 'The last gardener’s diary, and one gap in it.', gentle: 'soft', steps: [
  { id: 'a', who: 'place', near: ['ld-hothouse', 'lc-glasshouse'], when: { after: 'mill.still', season: ['spring'] }, lines: [ // anchor (proposed): ld-hothouse
    'On a shelf in the hothouse, a planting diary in W.’s hand. Every spring the same first line: Sweet peas, by the south glass. T. NOT to pick them.',
    'Year after year. Then a spring with only one line: No sweet peas.',
    { t: 'The spring after: No sweet peas. Not this year. And after that, nothing about sweet peas at all.', soft: 'The spring after: No sweet peas. He never liked them anyway. And after that, nothing about sweet peas at all.' },
    'Tucked in the back cover, a paper twist of seed, labelled in the same hand. It rattles.'],
    give: { 'seed:sweet-pea': 1 } },
] });

wdTaleAdd({ id: 'v-snow-prints', kind: 'small', title: 'Footprints in the snow', journal: 'Who goes out on the coldest night.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['post-box', 'lc-the-green'], when: { season: ['winter'], tod: ['night'] }, lines: [
    'Fresh snow, and in it a single trail: not footprints exactly, a long smooth line, from the post box to the first door, and back, and to the next door, and back.',
    'It goes on past the green. It will take all night at that speed.'] },
  { id: 'b', who: 'post', from: 'Perpetua', sign: 'Perpetua, Post', when: { season: ['winter'], days: 1 }, lines: [
    'Yes, it was me. The winter cards go out the night before the long night, so nobody wakes to an empty mat on the darkest day. It has always been done that way. Mostly by me.',
    'I was slow. I am always slow. But I wasn’t late. Not one. I want somebody to know that, so I am telling you.'],
    give: { 'decor:festive-lights': 1 } },
] });

wdTaleAdd({ id: 'v-quiz-chair', kind: 'small', title: 'The empty chair', journal: 'The lake hall quiz, one member short.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['lake-hall'], when: { tod: ['night'] }, lines: [
    'Through the lake hall window: the quiz team, four round a table set for five. On the fifth chair, a card: RESERVED. ROOK.',
    'A vole at the door explains. “Rook said the capital of somewhere was somewhere else. We marked it wrong. It was wrong. Rook left. That was eight years ago. We keep the chair. You never know.”'] },
  { id: 'b', who: 'place', near: ['lake-hall', 'notice-board'], when: { tod: ['night', 'dusk'], days: 7 }, lines: [
    'A rook in a scarf is standing at the lake hall door, not going in. “I was right, you know. About the capital. It changed. The year after.”'],
    choice: [
      { k: 'in', label: 'Hold the door open', set: { 'v-quiz-chair.in': 1 }, t: 'The rook goes in. Nobody makes a fuss. Someone pushes a pencil across. They come third.' },
      { k: 'right', label: 'Say being right isn’t the point', t: '“No,” says the rook. “No, I suppose it isn’t.” It stays on the step a while longer, then goes in.' },
      { k: 'leave', label: 'Leave it to the rook', t: 'You walk on. When you look back, the door is shut and the rook isn’t on the step. You don’t know which side of it they went.' }] },
] });

wdTaleAdd({ id: 'v-pie', kind: 'small', title: 'Paid back', journal: 'A pie, a fox, and what being paid back is worth.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['market-stall'], when: { level: 2 }, lines: [
    'A shout from the market stall. A thin young fox runs off across the green with a whole pork pie. The hen at the stall sits down hard. “That’s the third.”'] },
  { id: 'b', who: 'place', near: ['market-stall'], when: { days: 7 }, lines: [
    'On the stall this morning, a twist of paper with coins in it. Far too many for three pies. And a note: “sorry. got work now. at the boatyard.”',
    'The hen counts the coins twice. “Paid back,” she says. “More than.” She doesn’t sound pleased, or not pleased. She looks at you.'],
    choice: [
      { k: 'trust', label: '“You could let it go now”', t: '“I could. I will, the pies. I’ll still put the pies at the back of the stall.” She does, and then moves one to the front again.' },
      { k: 'keep', label: '“You don’t have to let it go”', t: '“No. I don’t, do I.” She pockets the coins. “Being paid back isn’t the same as it not having happened. Nice to have it, though.”' },
      { k: 'ask', label: 'Ask what she wants', t: '“I want my Thursdays back. When I didn’t watch the green.” She sighs. “That’s not his to give. Coins, he can give.”' }] },
] });

wdTaleAdd({ id: 'v-ledger-debt', kind: 'small', title: 'Forgiven, and repaid anyway', journal: 'A debt let go, and paid back anyway.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['ld-mill', 'ld-mill-office', 'mill-yard'], when: { after: 'mill.wheel' }, lines: [ // anchor (proposed): ld-mill-office
    'A loose page from the old debt book, curled by damp. Flour owed, family by family, in sacks. One line is long: the Fernleys, eleven sacks, one bad winter.',
    'Struck through, in the miller’s hand: “Forgiven. They have the little ones.”',
    'Under it, in a different ink, twelve years later: “Repaid in full. Not asked for. Taken anyway, because they would not leave the yard until it was.”'] },
  { id: 'b', who: 'bramble', when: { days: 1, heart: 2 }, lines: [
    'The Fernleys. The miller let it go and they paid it anyway. People argued about which of them was right for years. I think they were both right. It is very annoying.',
    'Being let off a thing and choosing to pay it are two different presents. You can give someone both.'] },
  // reward (proposed): journal page 'The Fernley line'.
] });

wdTaleAdd({ id: 'v-cuckoo', kind: 'small', title: 'The cuckoo', journal: 'Who a mother is.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['ls-owl-wood', 'ls-hazel-copse'], when: { open: [1], season: ['spring', 'summer'] }, lines: [
    'In a low hedge, a tiny wren is pushing a grub into the mouth of a chick three times her size. The chick shrieks for more. She goes for more.'] },
  { id: 'b', who: 'wick', when: { heart: 2, days: 1 }, lines: [
    'Cuckoo. The mother laid it and flew. Doesn’t come back. Never does. The wren will feed it till it’s twice her size and leaves without looking round.',
    'People ask me which is its mother. The one who laid it, or the one up all night. I say the wren. Then I say, the cuckoo doesn’t get to choose either. It’s just hungry.',
    'Don’t tell Pip I said that. Pip would be kind about the cuckoo. Pip is kind about everybody’s cuckoo.'],
    give: { 'decor:bird-box': 1 } },
] });

wdTaleAdd({ id: 'v-wall-letters', kind: 'small', title: 'Letters in the wall', journal: 'Promises, kept somewhere other than a house.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['ls-thyme-terrace', 'ls-espalier', 'ls-walled-garden'], when: { open: [4] }, lines: [
    'A stone in the terrace wall is loose. Behind it, a bundle of letters in a plastic bag, kept dry. The top one says: “I’ll be there for your birthday, I promise. Dad.”',
    'So does the next one. A different year. So does the next.'],
    choice: [{ k: 'back', label: 'Put them back as you found them', set: { 'v-wall-letters.back': 1 }, t: 'You fit the stone back so nobody would know.' }, { k: 'read', label: 'Read one more', t: 'The last one is shorter. “Next year. Definitely.” There is no next one.' }] },
  { id: 'b', who: 'quince', when: { heart: 2, days: 1 }, lines: [
    'The letters in the wall. They’re Fennick’s, the lad who does the ladders. He’s forty. He keeps them there so they’re not in his house, but he can’t throw them out either. He told me once.',
    'His dad came for one birthday, the year he was nine. Brought a kite. Fennick still flies it. Make of that what you like. He has.'] },
] });

wdTaleAdd({ id: 'v-sorry-box', kind: 'small', title: 'The sorry box', journal: 'Things people were sorry for, posted and left.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['ld-chapel', 'ruin-court'], when: { open: [3] }, lines: [
    'Inside the chapel door, a wooden box with a slot, lettered SORRY. The lid isn’t locked. A few slips have fallen out on the flags.',
    '“I ate the harvest loaf. All of it. On the way.” “I said I’d visit and I didn’t, and then it was too late to.” “I knew, and I said nothing, for years.”',
    { t: 'You can’t tell how old the last one is.', flag: { 'hollin.told': true } }, // colours if the player has heard Hollin; reads as a stray slip otherwise
    'There is a pencil on a string.'],
    choice: [
      { k: 'tunnel', label: 'Write about Tam’s tunnel', set: { 'v-sorry-box.wrote': 'tunnel' }, t: 'You write: “I trod on a tunnel and nearly said it wasn’t me.” You post it. It is a small thing. It feels like a small thing put down.' },
      { k: 'own', label: 'Write something of your own', set: { 'v-sorry-box.wrote': 'own' }, t: 'You write something that isn’t anybody else’s business, fold it twice, and post it. Nobody reads them. That is the point of the box.' },
      { k: 'none', label: 'Put the slips back', t: 'You tuck the fallen slips back through the slot, without reading any more.' }] },
] });

wdTaleAdd({ id: 'v-apologiser', kind: 'small', title: 'The man who apologises', journal: 'A list of sorries, and who took them.', gentle: 'keep', steps: [
  { id: 'a', who: 'traveller', name: 'A grey badger with a list', look: { kind: 'badger', fur: '#8c8a86', coat: '#3a4a5a', stripe: 1, hat: 'cap', hatc: '#3a3a3a' }, near: ['lc-the-green', 'notice-board', 'ld-quay'], when: { level: 6, dry: 1 }, lines: [
    'A grey badger with a list is knocking on doors round the green. “I stayed here one summer as a boy. I broke a window, ate a whole row of strawberries, and pushed a girl in the Mere. I’m saying sorry to everyone I can find.”',
    'He ticks off the strawberries. “She laughed. Said they were sour that year anyway.”'] },
  { id: 'b', who: 'bramble', when: { open: [2], days: 2 }, lines: [
    'He came to the yard. The window was mine. I said thank you for coming and no, I don’t forgive you. He said that was fair, and wrote it down. Then he asked if he could pay for the glass.',
    'I let him pay for the glass. I’m not unreasonable. I just don’t think a list makes a thing go away. He didn’t think so either. That is why I liked him, a bit.'],
    choice: [{ k: 'fair', label: 'Say both answers seem fair', t: 'They are. That’s the trouble with fair. There’s usually more than one.' }, { k: 'girl', label: 'Ask about the girl in the Mere', t: 'Morwenna. She pushed him back in. Forty years late. Said it was the best afternoon she’s had in ages.' }] },
] });

wdTaleAdd({ id: 'v-glow-worms', kind: 'small', title: 'Glow-worms', journal: 'Small lights in the yews, and where Hollin stops.', gentle: 'keep', steps: [
  { id: 'a', who: 'hollin', when: { open: [3], season: ['summer'], tod: ['night', 'dusk'], heart: 1 }, lines: [
    'Glow-worms are out. Past the yews, on the bank by the old arch. Come on. Mind the roots. They mind you back.',
    'There. See. Little green lamps. They light up to say where they are. Not many things are that honest.',
    'This is as far as I go. The arch. You go on if you like. I’ll wait here.'],
    sit: 'You sit on the bank and watch the small lights. Hollin stands just this side of the arch, and doesn’t come further, and doesn’t say why.',
    give: { 'decor:firefly-jar': 1 } },
] });

wdTaleAdd({ id: 'v-two-knots', kind: 'small', title: 'Two knots', journal: 'A net, mended by two people who never meet.', gentle: 'keep', steps: [
  { id: 'a', who: 'angler', when: { open: [3] }, lines: [
    'You’ll be going down the old woods? Take this net to the woodcutter. He mends it Thursdays. I don’t ask him. He doesn’t ask me.'], set: { 'v-two-knots.net': 1 } },
  { id: 'b', who: 'hollin', when: { flag: { 'v-two-knots.net': 1 }, heart: 2 }, lines: [
    'His net. Right. Look here. Every week I mend it, and every week he undoes one knot and ties it his way. A bowline where I’d put a sheet bend. Thirty years.',
    'It’s not wrong, his way. It’s just his. I leave it. He leaves mine. That’s a conversation, if you know how to read it.'],
    choice: [{ k: 'carry', label: 'Offer to carry it back', set: { 'v-two-knots.carried': 1 }, t: 'Go on, then. Tell him nothing. He’ll know.' }, { k: 'ask', label: 'Ask if they ever talk', t: 'We talk. Like that. Some people have said all the words they’ve got. Then there’s knots.' }] },
  { id: 'c', who: 'angler', when: { flag: { 'v-two-knots.carried': 1 } }, lines: [
    'He mended it. Course he did. Ta.',
    'Here. I had a spare. Hang it somewhere the wind gets at it.'],
    give: { 'decor:dc-net-rack': 1 } },
] });

wdTaleAdd({ id: 'v-lamp-room', kind: 'small', title: 'The lamp room', journal: 'A keeper who watched the wrong way.', gentle: 'soft', steps: [
  { id: 'a', who: 'place', near: ['ld-lamp-room', 'ld-lighthouse'], r: 2, when: { after: 'mill.wheel', tod: ['night'] }, lines: [ // anchor (proposed): ld-lamp-room
    'At the top of the lighthouse, the lamp turns slowly. Under the back window, a chair worn to the shape of somebody. It faces inland. From here you can see the little island in the Mere, and the stepping stones, black on silver.',
    'A keeper’s log on the sill, decades old. Most nights, at the bottom of the page, a line that has nothing to do with ships: “Lamp on the island. W. reading.”',
    { t: 'One October page says only: “3rd. Island lamp out early. Lights at the mill till dawn.” After that, no more lines about the island.', soft: 'One October page says only: “3rd. Island lamp out early. Storm coming.” After that, no more lines about the island.' }] },
] });

wdTaleAdd({ id: 'v-candle', kind: 'small', title: 'One candle', journal: 'A light in an empty mill.', gentle: 'soft', steps: [
  { id: 'a', who: 'place', near: ['ld-mill', 'mill-approach', 'mill-yard'], r: 5, when: { after: 'mill.ledger', season: ['autumn'], tod: ['night'] }, lines: [
    'One window in the dark mill is lit. A single candle, low on the sill, set where it would be seen from the race.',
    'Nobody lives in the mill.'] },
  { id: 'b', who: 'place', near: ['ld-mill', 'mill-yard'], when: { tod: ['dawn', 'day'], days: 1 }, lines: [
    'On the sill in the morning: a stub of candle, and a scrap of fishing line round it, the kind the old angler uses, knotted in a bowline.',
    { t: 'The wax has run down over older wax. Forty layers of it, perhaps. Someone comes every year.', soft: 'The wax has run down over older wax. Someone comes every year, for the old days.' }] },
] });

wdTaleAdd({ id: 'v-frost', kind: 'small', title: 'Frost on the glass', journal: 'A word that only shows in the cold.', gentle: 'soft', steps: [
  { id: 'a', who: 'place', near: ['ld-boathouse', 'ls-boat-bank', 'ld-hull'], when: { after: 'mill.cog', season: ['winter'], tod: ['dawn'], dry: 1 }, lines: [ // anchor (proposed): ld-boathouse
    'The first frost has furred the boathouse window white. All but a few lines, where a finger once pressed the glass years ago and the grease never quite cleaned off. The frost won’t settle there.',
    'It reads backwards from out here. Written from inside, then: SORRY W.',
    'By noon the frost is gone, and so is the word, until next year.'] },
] });

wdTaleAdd({ id: 'v-oar', kind: 'small', title: 'The little oar', journal: 'The other half of a boat.', gentle: 'soft', steps: [
  { id: 'a', who: 'catch', when: { after: 'mill.wheel', open: [2] }, lines: [
    'In the net, among the reed stems, a wooden oar no longer than your hand. A toy. The blade is split. On the handle, cut deep with a penknife: T.'], set: { 'v-oar.got': 1 } },
  { id: 'b', who: 'pip', when: { flag: { 'v-oar.got': 1 }, heart: 2, days: 1 }, lines: [
    'Can I see? Oh.',
    'That goes with a boat. I know which boat. It’s the right size. I had the boat, once. I gave it back. Just the boat. There wasn’t an oar.',
    { t: 'I looked for one. For a long time. In the dark, mostly. I should have looked in the reeds.', soft: 'I always wondered where the oar went. I should have looked in the reeds.' },
    'You keep it safe. Not with me. I’d only take it down every river looking for the rest.'],
    sit: 'Pip turns the oar over and over, and gives it back, and goes on talking about herons as if nothing happened. You let Pip.' },
] });

wdTaleAdd({ id: 'v-calendar', kind: 'small', title: 'The calendar', journal: 'October, kept.', gentle: 'soft', steps: [
  { id: 'a', who: 'place', near: ['ld-mill-office', 'ld-mill'], r: 2, when: { after: 'mill.ledger', deep: 1 }, lines: [ // anchor (proposed): ld-mill-office
    'On a nail in the mill office, a calendar from the feed merchant, its picture faded to blue. It is still on October. Nobody has turned it in forty years.',
    'Most days are blank. The 1st: sacks to the Fernleys. The 2nd: grease the gear. On the 3rd, in small careful pencil: T. to tea, if W. will let him.',
    'Someone has drawn a little boat beside it, and a little wheel.'] },
] });

wdTaleAdd({ id: 'v-frog-key', kind: 'small', title: 'The key under the frog', journal: 'A door that is always open, and why.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['great-oak-clearing'], r: 2, when: { open: [1], rain: 1, tod: ['dusk', 'night'] }, lines: [
    'By Mother Thistle’s door, a stone frog, tipped a little. Under it, a key on a loop of wool, and a card in a jar so the rain can’t get at it:',
    '“For whoever needs to come in out of it. Soup on the hob. You don’t have to say why. You don’t have to say anything. — T.”'] },
  { id: 'b', who: 'thistle', when: { heart: 2, days: 1 }, lines: [
    'You found my frog. Everybody does, eventually. That key’s been under there since I came to these woods.',
    { t: 'I walked a long way one night, dear, with a soup pot and nothing else. Nobody had a frog. I promised myself somebody would.', soft: 'I came to these woods with a soup pot and nothing else, a long time ago. Somebody gave me a door. I thought I’d pass it on.' },
    'Folk have used it. A badger, once, in the snow. A girl who didn’t say her name and left the bowl washed. Never asked. That’s the rule. Now, are you staying for soup or are you just standing in my rain?'],
    choice: [{ k: 'stay', label: 'Stay for soup', mood: { thistle: 1 }, t: 'Good. Sit. No, the other chair. That one’s the frog’s.' }, { k: 'later', label: 'Say you’ll come back', t: 'Course you will. The frog’s not going anywhere. Neither am I.' }],
    give: { 'decor:lantern': 1 } },
] });
/* keepsakes and recipes the small stories give (the drafts' "reward (proposed)" lines) */
wdTaleKeep({ id: 'fen-bottles', name: 'Fen’s two bottles', text: 'Eleven and bored; forty-one and bored. Side by side on the shelf.' });
wdTaleKeep({ id: 'pip-hat', name: 'Pip’s green hat (damp)', text: 'Found behind the falls with all the others. Pip says keep it. Pip has a new one. Pip always has a new one.' });
wdTaleKeep({ id: 'weather-letters', name: 'Dear Weather, and Dear Disappointed', text: 'Two letters: one to the weather, and the weather’s answer, in Wick’s handwriting.' });
wdTaleKeep({ id: 'corn-dolly', name: 'A corn dolly', text: 'Fourteen crossings, over, under and pull. It goes back in the ground in spring. That’s the luck.' });
wdTaleRecipe({ id: 'less-salt', name: 'Mum’s soup (too much salt)', from: 'from the market stall', text: ['Leek and potato, from Marigold’s cookbook, with Mother Thistle’s say-so. Leeks, potatoes, an onion, water.', 'In pencil: “Mum’s. Less salt. She always said I’d put too much.” Lower, years later: “I put too much. It was right.”'] });
