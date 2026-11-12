/* ============================================================
   GARDEN WONDER, stories: fifteen more small stories (v-), for the high orchard (zone 4) and Cloudbreak (zone 5), which the first forty left thin.
   Written 12 Nov 2026 on feat/stories-2 (format: docs/dev/STORIES.md; places: C:/tmp/regions/orchard.md and mountains.md).
   Light on purpose: echoes of the vale's question (what do you do with a wrong, and who decides) at the weight of jam jars and wasps. Nothing heavy, all 'keep'.
   ============================================================ */
/* ---------- the high orchard ---------- */
wdTaleAdd({ id: 'v-graft', kind: 'small', title: 'The graft', journal: 'Two trees that didn’t get on, made to.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['ls-nursery', 'ls-espalier', 'cider-square'], when: { open: [4] }, lines: [
    'In the nursery rows, a young tree with a scar halfway up its trunk, bound in raffia. A pencil label on a string: “Pearmain onto crab. They didn’t get on. They’ll have to.”'] },
  { id: 'b', who: 'quince', when: { heart: 1, days: 1, season: ['spring', 'winter'] }, lines: [
    'You read my label. Everyone reads my labels. I write them for the bees, really.',
    'A crab apple’s tough and sour and won’t die. A Pearmain’s sweet and sulks if you look at it. Put one on the other and you get a tree that’s both. Took them three springs to agree. Then they never mentioned it again.',
    'Want a go? Knife, slanting cut, fit the two together like hands, tie it. Then leave it alone. Leaving it alone is most of grafting. It’s most of everything.'],
    choice: [
      { k: 'try', label: 'Have a go', mood: { quince: 1 }, t: 'Slanting. More slanting. There. Tie it tight. Tighter than you think. Good. If it takes, it’s yours. If it doesn’t, it was the weather. That’s the rule.' },
      { k: 'watch', label: 'Watch her do it', t: 'Cut, fit, tie. Twelve seconds. She’s been doing it forty years and still holds her breath at the fit. “Habit,” she says. “Or manners.”' }],
    give: { seed: 1 } },
] });

wdTaleAdd({ id: 'v-wasp', kind: 'small', title: 'The wasp', journal: 'Quince apologises to something that didn’t deserve it.', gentle: 'keep', steps: [
  { id: 'a', who: 'quince', when: { open: [4], season: ['summer', 'autumn'], heart: 2 }, lines: [
    'A wasp got in the jam. I swatted it. I missed, and it went off very offended, and I said sorry. Out loud. To a wasp.',
    'It didn’t accept. Fair enough. I wouldn’t have, in its place. You come for jam and somebody throws a spoon at you.',
    'Wasps don’t forgive. They come back, though. Every year. Same jam. I think that’s their version.'] },
] });

wdTaleAdd({ id: 'v-pear-ring', kind: 'small', title: 'The pear ring', journal: 'Eight trees planted for a wedding that didn’t last.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['ld-ring', 'cider-square'], when: { open: [4] }, lines: [
    'Eight old perry pears stand in a circle, the grass mown short in the middle. Low on one trunk, an old brass tag: “Planted for Ada and Joss, on their wedding day. One each year.”'] },
  { id: 'b', who: 'place', near: ['ld-ring', 'cider-square'], when: { days: 1, season: ['autumn'] }, lines: [
    'On the eighth tree, a newer tag, in two different hands: “We didn’t last.” And under it: “The trees did. Pick them anyway.” And under that, in the first hand again: “Agreed.”'],
    give: { 'keep:pear-tags': 1 } },
] });

wdTaleAdd({ id: 'v-treehouse', kind: 'small', title: 'Treehouse rules', journal: 'Who is allowed up, and why Pip wasn’t.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['ld-treehouse', 'ls-old-plum'], when: { open: [4] }, lines: [
    'Nailed to the ladder of the treehouse, a board in children’s paint: “RULES. 1. No grown-ups. 2. Except Quince. 3. Rule 2 is because of biscuits. 4. No Pip.”',
    'Rule 4 has been crossed out. Next to it, in different paint: “SORRY PIP. 5. Pip is allowed if Pip is quiet.” Rule 5 has also been crossed out.'] },
  { id: 'b', who: 'pip', when: { heart: 1, days: 1 }, lines: [
    'You saw the RULES! I was rule four for a whole summer. I fell through the floor. Twice. Through the same hole! They said it was the floor’s fault the first time.',
    'Then they let me back. Rule five. I lasted one afternoon. Now there’s no rule about me at all. Do you know what that means? It means I’m just a person who comes up the ladder. Best thing that’s ever happened to me.'] },
] });

wdTaleAdd({ id: 'v-folly', kind: 'small', title: 'The folly', journal: 'A tower built to see someone you won’t visit.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['ld-folly', 'ls-sun-terrace'], when: { open: [4], dry: 1, tod: ['day', 'dusk'] }, lines: [
    'Inside the folly, a stair winds up to a little room with one window, facing the sea. A brass spyglass is screwed to the sill. It points at a smudge of land very far off.',
    'Carved in the sill: “Built so I could see my brother’s farm without going. 1 year. 2 years. 9 years.” The numbers stop. Under them, newer: “Went. Should have gone at 1.”'],
    sit: 'You sit on the window seat a while and look through the spyglass. The far land is green, with a white house on it, and someone’s washing out. It is too far to tell whose.' },
] });

wdTaleAdd({ id: 'v-swarm', kind: 'small', title: 'The swarm', journal: 'Quince talks a swarm down from the old plum.', gentle: 'keep', steps: [
  { id: 'a', who: 'quince', when: { open: [4], season: ['spring', 'summer'], dry: 1, heart: 1 }, lines: [
    'Swarm! In the old plum! Don’t run. Don’t flap. They’re not cross, they’re house-hunting. They left in a huff because I moved the hive six inches. Six inches.',
    'I’m going to say sorry and hold out a box. That’s the whole method. It works about half the time. The other half I say sorry to a tree.'],
    choice: [
      { k: 'hold', label: 'Hold the box for her', mood: { quince: 1 }, t: 'Still. Stiller. There. They’re walking in. Listen to them, grumbling all the way. That’s forgiveness, for a bee. Grumbling and walking in.' },
      { k: 'wall', label: 'Watch from the wall', t: 'She holds out the box and hums. The swarm thinks about it for a long time, then pours in like warm treacle. “They always make me wait,” she says. “I would too.”' }],
    give: { honey: 1 } },
] });

wdTaleAdd({ id: 'v-skep', kind: 'small', title: 'The borrowed skep', journal: 'Something brought back, very late.', gentle: 'keep', steps: [
  { id: 'a', who: 'traveller', name: 'An old rabbit with a straw skep', look: { kind: 'rabbit', fur: '#b8a890', coat: '#7a6a4a', hat: 'wide', hatc: '#c8b890' }, near: ['cider-square', 'ld-barrels', 'ld-quay'], when: { open: [4], season: ['spring', 'summer'] }, lines: [
    'An old rabbit is standing in the cider square with a straw bee skep in both arms, looking up at the cottages.',
    '“My mother borrowed this from the orchard. To catch a swarm. She said she’d bring it back the next day. That was a long time before you were born.”',
    '“She meant to every year. I found it in her shed with a label on: ORCHARD. I don’t know who to give it to. I don’t want to make a fuss.”'],
    choice: [
      { k: 'carry', label: 'Take it to Quince', set: { 'v-skep.back': 1 }, t: '“Would you? Thank you. Tell her my mother was sorry. No. Tell her my mother meant to. That’s truer.”' },
      { k: 'show', label: 'Show him her door', set: { 'v-skep.back': 1 }, t: 'He knocks, and gives it over, and says something you can’t hear. Quince laughs the big laugh. The rabbit looks very relieved and goes down the stair at a trot.' }] },
  { id: 'b', who: 'quince', when: { flag: { 'v-skep.back': 1 }, days: 1 }, lines: [
    'A skep came back! From before I was born, nearly. My grandmother always said one went walking. She blamed the bees.',
    'Late’s still back. I’ve put it on the bee bank with the others. It looks a bit shy. It’ll settle. They all do.'] },
] });

wdTaleAdd({ id: 'v-moon-pool', kind: 'small', title: 'The moon pool', journal: 'What people wish for in the orchard pond.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['ls-moon-pool', 'ls-clear-pool'], when: { open: [4], tod: ['night'], dry: 1 }, lines: [
    'The moon sits in the orchard pond, very round and very still. On the bottom, coins, and one flat stone with writing on it in chalk, gone blurry: “I wish I hadn’t said it. I wish she’d say it back.”',
    'Beside it, a second stone, in different chalk: “She did.”'] },
] });

/* ---------- Cloudbreak ---------- */
wdTaleAdd({ id: 'v-sheepfold', kind: 'small', title: 'The sheepfold', journal: 'A wall mended every year, by someone who never asked who broke it.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['ls-high-pasture', 'ld-hut'], when: { open: [5] }, lines: [
    'An old sheepfold on the high pasture, its walls grey and lichened all round, except for one stretch of fresh, pale stone, set very neatly.'] },
  { id: 'b', who: 'wick', when: { days: 1, heart: 1 }, lines: [
    'The fold? The shepherd who had it before me, Dunstan, mended that bit every spring. Every spring it was down again by autumn. Somebody’s cows. Somebody on the other side of the fell.',
    'Forty springs. He never went over to say. I asked him why. He said, “If I go over, I have to be angry at him. If I mend it, I only have to be good at walls.” He was very good at walls.',
    'I mend it now. I don’t know whose cows. I’ve decided not to. Look up. It’s still free.'] },
] });

wdTaleAdd({ id: 'v-warm-stones', kind: 'small', title: 'Warm stones', journal: 'A notice, and a reply.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['ls-warm-stones', 'ls-windy-flats'], when: { open: [5], season: ['spring', 'summer'], dry: 1 }, lines: [
    'On the warm stones where the adders bask, a little painted sign: “PLEASE DON’T STEP ON US.” Somebody has scratched underneath: “PLEASE DON’T BITE US.”',
    'And under that, very small, in a hand that does not look like it belongs to anyone with hands: “DEAL.”'] },
] });

wdTaleAdd({ id: 'v-grotto-names', kind: 'small', title: 'Who sheltered here', journal: 'Names on the grotto wall, and the beans.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['ld-grotto', 'ls-mist-meadow'], when: { open: [5] }, lines: [
    'Inside the grotto, out of the wind, walkers have written their names on the stone in candle soot. One line, near the bottom: “Sorry we ate the beans that were left. We were very cold. — the Tuesday lot.”',
    'Next to it, a fresh tin of beans on the ledge, and a new line: “Forgiven. Left you more. — the Wednesday lot.” And under that: “There was no Tuesday lot. We ate them. — the Thursday lot.”'] },
] });

wdTaleAdd({ id: 'v-curlew', kind: 'small', title: 'The curlew', journal: 'Something that comes back, or doesn’t.', gentle: 'keep', steps: [
  { id: 'a', who: 'wick', when: { open: [5], season: ['spring'], tod: ['dawn', 'day'], heart: 2 }, lines: [
    'Hear that? The bubbling. Curlew. She’s back on the bog by the pass. Same bog every year.',
    'One year she didn’t come. I waited all spring. I made a great deal of tea I didn’t drink. Next year she came back as if nothing had happened.',
    'I wanted to ask where she’d been. You can’t, with a curlew. So I didn’t. I said welcome back, and she said the bubbling thing. That was the whole conversation. It was enough.',
    'Some things come back. You don’t get to make them. You get to be there when they do.'] },
] });

wdTaleAdd({ id: 'v-beacon-log', kind: 'small', title: 'The beacon log', journal: 'Whoever lost the argument lights the beacon.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['ld-beacon', 'summit-cairn'], when: { open: [5], dry: 1 }, lines: [
    'In a tin box at the foot of the beacon, a logbook. The first page: “The beacon is lit once a year, on the longest night, by whoever was most wrong that year. Sign below.”',
    'Inside: “Bramble (the corner).” “Bramble (the corner, again).” “Pip (the heron joke had no end).” “Quince (said it would rain; it did not; said it was resting).” “Wick (all of it, but nobody could prove it).”'],
    choice: [
      { k: 'sign', label: 'Sign it yourself', set: { 'v-beacon-log.signed': 1 }, t: 'You write your name, and in brackets the most wrong thing you did this year. It takes a while to choose. The pencil is very blunt. It feels better than you expected.' },
      { k: 'leave', label: 'Put it back', t: 'You close the tin. Maybe next year. The beacon doesn’t mind. It has been lit by worse.' }] },
  { id: 'b', who: 'bramble', when: { flag: { 'v-beacon-log.signed': 1 }, days: 1 }, lines: [
    'You signed the beacon book. I saw. I go up every year to check it’s not me. It is always me.',
    'I like it, mind. You get to be wrong in writing, and then you light a fire, and everyone comes up with soup, and nobody brings it up again till next year. That’s a system. I’ve drawn it on a map.'] },
] });

wdTaleAdd({ id: 'v-world-end', kind: 'small', title: 'The edge of the map', journal: 'A mapmaker asks where the vale stops.', gentle: 'keep', steps: [
  { id: 'a', who: 'traveller', name: 'A mapmaker with a sketchbook', look: { kind: 'hare', fur: '#8a7a6a', coat: '#3a5a6a', hat: 'cap', hatc: '#6a4a3a', prop: 'roll' }, near: ['ls-world-end', 'ls-far-shore', 'summit-cairn'], when: { open: [5], dry: 1, tod: ['day', 'dusk'] }, lines: [
    'A hare in a long coat is sitting on a rock at the far end of the moor, drawing. “I’m making a map of the coast. Every map I’ve seen of this vale stops right here, at this rock. Somebody wrote ‘and then I stopped’. Do you know why?”',
    '“I thought there’d be a cliff. There isn’t. There’s more moor. It just goes on.”'],
    choice: [
      { k: 'here', label: '“That’s where Bramble got tired”', set: { 'v-world-end.told': 'tired' }, t: '“Ha. That’s the most honest edge a map ever had. I’ll draw it in. Right here. ‘Bramble got tired.’ I’ll carry on from it, if Bramble doesn’t mind.”' },
      { k: 'on', label: '“It doesn’t stop”', set: { 'v-world-end.told': 'on' }, t: '“No. They don’t, do they. You just stop drawing.” She turns the page and keeps going, west, into the haze.' }] },
  { id: 'b', who: 'bramble', when: { flag: { 'v-world-end.told': true }, days: 1 }, lines: [
    { t: 'A mapmaker wrote to me. She’s drawn “Bramble got tired” on the coast map, at the rock. In ink. It’s going to be printed. I want it on record that I was not tired. I was cold. She says she’ll put that in brackets.', flag: { 'v-world-end.told': 'tired' } },
    { t: 'A mapmaker wrote to me. She went on past my rock. Forty miles of moor, she says, and then the sea. She sent me a copy. My bit’s still there, at the start of hers. I don’t mind that. I thought I would.', flag: { 'v-world-end.told': 'on' } }],
    give: { 'keep:coast-map': 1 } },
] });

wdTaleAdd({ id: 'v-cloud-sea', kind: 'small', title: 'Above the cloud', journal: 'A morning when the whole vale went under, and the post came anyway.', gentle: 'keep', steps: [
  { id: 'a', who: 'place', near: ['ls-long-view', 'summit-cairn', 'ld-hut'], when: { open: [5], fog: 1 }, lines: [
    'From the Long View this morning there is no vale. Only cloud, white and flat to the sea, with the sun on it. The top of the folly sticks out of it like a cork. Somewhere under it, very faint, the mill wheel is humming.'],
    sit: 'You sit on the ledge with your feet over the cloud. It moves very slowly, like a sheet on a line. After a while the church weathervane comes up through it, then a roof, then the Mere, shining, and the vale is back, as if it had only gone to fetch something.' },
  { id: 'b', who: 'post', from: 'Perpetua', sign: 'Perpetua, Post (in the fog)', when: { days: 1 }, lines: [
    'Yesterday the cloud came down to the Mere and I could not see my own foot. I delivered everything. By feel.',
    'Two went to the wrong houses. They swapped over the hedge and nobody minded. One of them said it was the best letter she’d had all year, and it wasn’t even hers. I am counting that as a success.'] },
] });

/* what these give, kept on the Stories page */
wdTaleKeep({ id: 'pear-tags', name: 'Two brass tags', text: 'From the pear ring. “We didn’t last.” “The trees did.” “Agreed.”' });
wdTaleKeep({ id: 'coast-map', name: 'A copy of the coast map', text: 'The mapmaker’s, sent on by Bramble. Bramble’s rock is at the start of it.' });
