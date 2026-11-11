/* ============================================================
   GARDEN WONDER, the stories themselves (the engine: 94-garden-wonder-1tale.js; how to add one: docs/dev/STORIES.md; the bible: STORY_BIBLE.md).
   The question underneath everything: is everything forgivable? The game asks and never answers. Nobody is owed forgiveness, and those who were hurt decide for themselves.
   ============================================================ */
const _wtMill = (m) => typeof _wkMill === 'function' ? _wkMill(m) : false;
/* ---------- THE MAIN LINE: the mill and the vale ---------- */
wdTaleAdd({ id: 'mill', kind: 'main', title: 'The still wheel', journal: 'Why did the mill stop?', gentle: 'soft', steps: [
  { id: 'still', who: 'angler', lines: [
    'See the river going out of the Mere? There was a mill on it once. When the wheel turned you could hear it from here. Like someone humming in the next room.',
    'The miller’s boy stopped it. Third of October, the year the brook moved. Funny, the things you keep.',
    'Took a cog out and walked off with it. Never said why. He wasn’t one for saying. Mother Thistle lives past the old oaks now. She’d know more. She lets on a lot.'] },
  { id: 'brambles', who: 'thistle', when: { open: [1] }, lines: [
    'So you got through. Good. Those brambles were planted on purpose, dear. The miller’s boy and his sister, to keep the goats out.',
    { t: 'Then they fell out, and neither would cut them back first. It was after the boy. No. After the goats. I get my years muddled.', soft: 'Then they fell out over something, and neither would cut them back first. Forty years. Stubbornness grows faster than brambles.' },
    'He crossed the river every morning to the mill, by the causeway. There’s a plank gone now. Ask Pip. Pip has crossed everything. Twice, Pip says.'] },
  { id: 'wheel', who: 'pip', when: { open: [2] }, lines: [
    'You’re over! That’s the mill! Look at the wheel. Look at it not going round!',
    { t: 'There’s a gap in its teeth where a cog should be. And a dark stain in the grain of the millstone. Rust, I said. Bramble said rust doesn’t go that colour.', soft: 'There’s a gap in its teeth where a cog should be. And old red paint on the millstone. Bramble says it was a sign, once.' },
    { t: 'Then Bramble went quiet, which Bramble never does. Then I went quiet, which I never do. It was horrible. We stopped quickly.', soft: '' },
    'They say the miller’s boy went to the old chapel in the woods, after. To think. Tam digs round there. Tam digs round everywhere.'] },
  { id: 'ledger', who: 'tam', when: { open: [3] }, lines: [
    'Dug up a book under the chapel floor. The mill’s book. Who brought what to grind. Every name in the vale is in it.',
    { t: 'Last page, his writing: “3 October. Wheel stopped. Something in the race.” Under that: “Told W. it was the brook.”', soft: 'Last page, his writing: “3 October. Wheel stopped. Told W. it was the brook.” The brook never moved. Bramble’s maps say so.' },
    'Third of October. The old angler says that date like it’s his own birthday. And the woodcutter by the yews knew the miller. Ask him about the cog. Thought you’d want to know.'] },
  // the main line meets the woodcutter here, early: every player finds him as a likeable woodsman (STORY_BIBLE §3)
  { id: 'cog', who: 'hollin', when: { open: [3] }, lines: [
    'The cog at the boathouse? I carved that. He asked me to, the miller’s boy. A long time ago.',
    'Said someone would want the wheel to turn one day without remembering. I didn’t ask what. You don’t, with him.',
    { t: 'The old one he kept. In the ice house, I think. He went in there the night it stopped and came out without it.', soft: 'The old one he kept somewhere cold. The ice house, I think.' }] },
  { id: 'icehouse', who: 'tam', when: { open: [3] }, lines: [
    'Went in the ice house. Moles like cold. Don’t ask. Something was wrapped up on the top shelf.',
    { t: 'A cog. The old one, the mill’s. Wrapped in a little knitted jumper. A child’s. It had gone stiff and dark.', soft: 'A cog. The old one, the mill’s. Wrapped in a little knitted jumper, very old, with a boat on the front.' },
    { t: 'There’s a stone by the chapel. Small. No name. I dug it. I was asked to. I don’t talk about it, so I’m not.', soft: 'Someone kept that jumper a long time. I put it back. Some things want leaving where they are.' },
    'So the cog at the boathouse is the new one. Fit it, if you like. I’m going underground for a bit.'] },
  { id: 'mended', who: 'bramble', when: { test: _wtMill }, lines: [
    'Listen. No, don’t talk. That’s the wheel. I’ve drawn this mill for years with the wheel turning, out of hope. Now I don’t have to rub it out.',
    'Everyone came down to hear it. Tam came up. Pip stayed a whole hour. Mother Thistle cried and said it was the spray.',
    { t: 'Hollin stood at the back by the trees. Nobody asked him in. Nobody told him to go. That’s the vale for you.', soft: '' },
    'Everyone but the old angler. He sat on the pier with his back to the river. He’d like to see you, I think. He won’t say so.'] },
  { id: 'truth', who: 'angler', when: { test: _wtMill }, lines: [
    'Heard it. Couldn’t not. Sit down a minute.',
    'I was the miller’s boy. Still am, I suppose. Nobody’s called me it in forty years.',
    { t: 'My sister read on the island of an evening. Her boy, Tomas, went after her across the stones. He was seven. He slipped.', soft: 'My sister and I quarrelled, the autumn her boy Tomas was seven. Years later he took a boat to sea and never wrote. We each blamed the other.' },
    { t: 'The river brought him down to the race. I saw something in the water and stopped the wheel. Too late. I took the cog out so it would never turn again.', soft: 'I stopped the wheel the day we quarrelled. If the mill couldn’t hum, I wouldn’t have to hear what I’d said.' },
    { t: 'I let them say I was careless. Better me than her. She had to live in that garden.', soft: 'She wrote that he came back, grey. Maybe he did. I never asked her.' },
    // coloured by what you did in Hollin’s story (the second place his arc touches the main line)
    { t: 'Hollin mends my nets. I know what he did. You know too, now. I can’t forgive myself, and it turns out I can’t do it for him either. It isn’t mine.', flag: { 'hollin.told': true } },
    { t: 'Hollin mends my nets. Good hands. Never says much. Nor do I. We’re a pair.', noflag: ['hollin.told'] },
    { t: 'She wrote that he came back. He didn’t. What do we do with that, do you think?', soft: 'What do we do with an old story like that, do you think?' }],
    choice: [
      { k: 'name', label: 'Say his name', set: { 'mill.end': 'name' }, t: 'Then we’ll go up to the chapel. Both of us. I haven’t been in forty years. I’ll carve it. T, O, M, A, S. My hands still know how.' },
      { k: 'rest', label: 'Let her story stand', set: { 'mill.end': 'rest' }, t: 'Then he came back. Grey, and taller, and he said the place looked well kept. That’s how she’d want it. That’s how I’ll have it too.' }],
    sit: 'You sit on the pier with him. The wheel hums across the water. For the first time, he turns round to listen to it.' },
  { id: 'old-letter', who: 'post', from: 'Perpetua', sign: 'Your brother (delivered by Perpetua, forty years late, sorry)', when: { after: 'mill.truth', days: 1 }, lines: [
    'Post. This one has been in my satchel a long time. I kept meaning to. Here.',
    { t: 'Dear W., I should have told you the truth and let you hate me for the right thing. I told you a lie, and let you hate me for the wrong one. I am sorry for the lie. I am not sorry I stopped the wheel.', soft: 'Dear W., I am sorry for the quarrel. I stopped the wheel because I could not stand the quiet in it. Come down to the pier one evening.' }] },
  { id: 'bees', who: 'quince', when: { open: [4] }, lines: [
    'You came up the stair! All of it? Don’t tell me how many. I’ll only count.',
    'From up here you can see the whole river. The falls, the Mere, the mill turning, out to the sea. Somebody used to say it looked like a sentence. I think I know what he meant now.',
    'The year the mill stopped, I told the bees. You tell bees everything, the old way. They went away for a year.',
    { t: 'There was a boy who counted the stair with me. He always got two hundred and nine. I get his number on bad days.', soft: 'There was a boy who counted the stair with me. He always got it wrong. I get his number on silly days.' },
    'Wick goes up to the pass at night. There’s smoke from the hut up there some mornings, and nobody lives in it. Wick says that’s the interesting part.'] },
  { id: 'letters', who: 'wick', when: { open: [5] }, lines: [
    'You found the top. That little tarn is where the river starts. All of it. It is very small, for something that ends in the sea.',
    'The smoke was me. I make tea. I don’t drink it. I like to watch it go up.',
    'I have to tell you something about the post. “W. No, not that W. The owl.” I lied. It was that W.',
    { t: 'She died nine winters ago. She left me a box of letters she never sent. I’ve been sending them to you. The last few, I wrote. Somebody had to finish them.', soft: 'She moved away nine winters ago and left me a box of letters she never sent. I’ve been sending them to you. The last few, I wrote.' },
    'From here it is one river, one vale, and someone looking after it. That’s you. Look up. It’s still free.'] },
] });
/* ---------- things you notice along the main line (free: they don’t hold it up) ---------- */
wdTaleAdd({ id: 'signs', kind: 'small', title: 'Things noticed', journal: 'Small things that don’t add up, yet.', gentle: 'soft', steps: [
  { id: 'oak', who: 'place', free: 1, near: ['great-oak-clearing', 'ld-bench-a'], when: { after: 'mill.brambles' }, lines: ['Carved low on the Great Oak: W, and a small T, and a third letter scratched out so hard the bark has healed over it.'] },
  { id: 'stone', who: 'place', free: 1, near: ['ld-mill', 'mill-yard'], when: { after: 'mill.wheel' }, lines: [{ t: 'In the grain of the old millstone, a stain that has never quite washed out.', soft: 'Old red paint is flaking off the millstone.' }] },
  { id: 'map', who: 'place', free: 1, near: ['ld-barn'], when: { after: 'mill.wheel', deep: 1 }, lines: ['Pinned up in the barn, one of Bramble’s old maps. On the stepping stones, a small figure, rubbed out and drawn in again.'] },
  { id: 'chapel', who: 'place', free: 1, near: ['ld-chapel', 'ruin-court'], when: { after: 'mill.ledger' }, lines: [{ t: 'By the chapel wall, a small stone with no name. Someone has left a carved wooden bird on it.', soft: 'On the chapel step, a carved wooden bird, left for nobody in particular.' }] },
  { id: 'falls', who: 'place', free: 1, near: ['ld-falls'], when: { after: 'mill.ledger', tod: ['night', 'dusk'], deep: 1 }, lines: ['In the plunge pool’s reflection, for a moment, a small pale shape under the falling water. Then it is only foam.'] },
  { id: 'ice', who: 'place', free: 1, near: ['ld-icehouse'], when: { after: 'mill.icehouse' }, lines: ['The ice house door is ajar. Cold comes out of it like a held breath.'] },
  { id: 'shoe', who: 'catch', free: 1, when: { after: 'mill.wheel', tod: ['dusk'], deep: 1 }, lines: ['Something else came up with it, tangled in weed: a child’s shoe, very old. You put it on the bank, carefully.'] },
] });
/* ---------- CHARACTER ARCS (optional; opened by friendship) ---------- */
wdTaleAdd({ id: 'thistle', kind: 'arc', title: 'The old house', journal: 'Mother Thistle, and the door she learned to watch.', gentle: 'skip', steps: [
  { id: 'jump', who: 'thistle', when: { heart: 2, after: 'mill.brambles', deep: 1 }, lines: ['Don’t mind me jumping, dear. Old habit. Doors, mostly. And men who shout. Not you. You don’t shout.'] },
  { id: 'door', who: 'thistle', heavy: 1, when: { heart: 3, tod: ['dusk', 'night'], dry: 1, deep: 1, days: 2, after: 'thistle.jump' }, lines: [
    'A branch cracks behind you both, and Mother Thistle jumps. Then she laughs. Then she doesn’t.',
    'Sorry, dear. I was married once, up in the old house at the top of the woods. He was not a kind man.',
    'He hurt me. For years. I got very good at watching a door. “I watched it not happen,” I say. That’s where it comes from.',
    'One winter night I took the soup pot and walked until the woods were between us. Best soup I ever made, and I made it with nothing.',
    'He’s long gone. I’m still here. That’s the whole of my revenge, and it’s plenty.'],
    sit: 'You sit. The frogs start up. After a while she pats your hand. “There. That’s better than talking. Most things are.”' },
  { id: 'cup', who: 'thistle', when: { heart: 4, days: 3 }, lines: [
    'Will you walk up to the old house with me one day? My mother’s teacup is still there, on the shelf. I left it. I’d like it back.',
    'Not today. But one day. It helps, knowing someone would come.'], sit: 'You sit together a while. She hums something with no tune at all.' },
  // later beats (STORY_BIBLE §3): the walk to the old house (ld-house), soup in the teacup, and the raised voice she still can’t bear
] });
wdTaleAdd({ id: 'quince', kind: 'arc', title: 'Telling the bees', journal: 'Quince, the cider fair, and what she told the bees.', gentle: 'skip', steps: [
  { id: 'arch', who: 'quince', when: { heart: 2, deep: 1 }, lines: ['Bees don’t go past the ruined arch in the old woodland. Neither do I. No reason. Lovely weather, isn’t it.'] },
  { id: 'fair', who: 'quince', heavy: 1, when: { heart: 4, after: 'mill.bees', tod: ['dawn', 'day'], dry: 1, deep: 1, days: 2 }, lines: [
    'The fair poster’s up in the square. I always go quiet when it goes up. You’ve noticed. You notice things.',
    'When I was nineteen, at the cider fair, a man raped me. I’ve said it now. That’s the word for it, and I’m done being polite about it.',
    'I told my mother. She said hush. So I told the bees. You tell bees everything, the old way. They didn’t say hush.',
    'I count the stair because counting keeps my feet on things. That’s all it is. And I’d still win the apple race, if I entered. Which I don’t. But I would.'],
    choice: [{ k: 'believe', label: 'I believe you', t: 'I know. I could tell you would. That’s why I said it.' }],
    set: { 'quince.told': 1 },
    sit: 'You sit. The bees go about their business around you both. “They like you,” she says. “That’s practically a hug.”' },
  { id: 'him', who: 'quince', when: { flag: { 'hollin.told': true }, days: 3 }, lines: [
    'You’ve been to the hut. I can tell. You’ve got that face.',
    'I know he’s there. I’ve known for years. I don’t want anything from him. Not sorry. Not anything. I want the woods back.',
    'That’s all. Now. Honey. I’ve too much of it. Take a jar or I’ll be cross.'], give: { honey: 1 } },
  // later: the bell at the fair; the walk to the ruined arch, for herself; once the hut is empty, a quince planted by the brook
] });
wdTaleAdd({ id: 'hollin', kind: 'arc', title: 'What the woods keep', journal: 'Hollin the woodcutter, and what he did.', gentle: 'skip', steps: [
  { id: 'meet', who: 'hollin', when: { open: [3] }, lines: [
    'Lost? No. You’ve got the look of someone who wants to be. That’s different. Mind the axe.',
    'Your net’s torn. Give it here. Takes me a minute. Took me forty years to learn, so call it a bargain.'] },
  { id: 'wren', who: 'hollin', when: { heart: 1, days: 1 }, lines: [
    'I carved you a wren. It doesn’t look like a wren. It looks like what a wren would look like if it had a hard week.',
    'I mend the old angler’s nets on Thursdays. We don’t talk. It’s the best conversation I have all week.'], give: { fertiliser: 1 } },
  { id: 'beetles', who: 'hollin', when: { heart: 2, tod: ['dusk', 'night'] }, lines: ['Stag beetles are on the old oak by the brook, after dark. Don’t tell the owl I told you. He likes to be the one who knows.'] },
  { id: 'wrong', who: 'hollin', when: { heart: 2, season: ['autumn', 'winter'], deep: 1, days: 2 }, lines: [
    'You’ve seen the ribbon on my door. You’re wondering.',
    'I did something, a long time ago. I won’t pretend it was anything other than what it was. Not today. Maybe not ever. That’s yours to decide, not mine.'] },
  { id: 'truth', who: 'hollin', heavy: 1, when: { after: 'quince.fair', days: 2, deep: 1 }, lines: [
    'You’ve been up at the orchard. She told you. Good. She should get to say it first.',
    'At the cider fair, forty years ago, I raped a woman. She was nineteen. She did nothing to bring it on. I did it.',
    'I keep away from her. I wrote it down, signed it, and left it at the chapel. Not with her. She doesn’t owe me reading it.',
    'I’m not asking you for anything. You can go. Most should.'],
    set: { 'hollin.told': 1 },
    choice: [
      { k: 'listen', label: 'Listen', set: { 'hollin.view': 'listen' }, t: 'He nods, and goes back to the net. His hands are shaking. He doesn’t ask you to stay, and he doesn’t ask you to go.' },
      { k: 'say', label: 'Tell him what you think of it', set: { 'hollin.view': 'condemn' }, mood: { hollin: -4 }, t: 'He hears all of it. He doesn’t argue. “Yes,” he says. “That’s right. All of that is right.”' },
      { k: 'leave', label: 'Leave', set: { 'hollin.view': 'leave' }, mood: { hollin: -6 }, t: 'You walk away. Behind you, the axe starts again, slow, the same rhythm as before.' }] },
  // later (STORY_BIBLE §3): the village divides over a seat at the mill’s reopening and the harvest festival; the hut empty in spring; the note on the door
] });
wdTaleAdd({ id: 'pip', kind: 'arc', title: 'Up both ways', journal: 'Why Pip never stays.', gentle: 'soft', steps: [
  { id: 'boat', who: 'pip', when: { heart: 3, after: 'mill.wheel' }, lines: [
    'I found a boat once. A little one. In the river, a long time ago. I gave it to the reeds to look after. I don’t know why I told you that.',
    { t: 'I dived and dived that night. That’s all that came up. A little boat. I keep going up the river, and down it. Looking. I know. I know.', soft: 'I keep going up the river, and down it. I always think there’s something round the next bend. There never is. There’s always another bend.' }],
    sit: 'You sit on the bank. Pip sits too, which Pip never does, and is quiet for nearly a whole minute.' },
  { id: 'stay', who: 'pip', when: { heart: 4, days: 3 }, lines: ['I think I’ll stay a while. Here, I mean. I don’t know how. Show me.'] },
] });
/* ---------- SMALL STORIES: echoes, from light to heavy ---------- */
wdTaleAdd({ id: 'jam', kind: 'small', title: 'The jam', journal: 'Who took Mother Thistle’s jam.', steps: [
  { id: 'a', who: 'thistle', when: { heart: 1 }, lines: ['Somebody took my bramble jam off the sill. The whole jar. I’m not cross. I’m a bit cross.'] },
  { id: 'b', who: 'tam', when: { heart: 1, days: 1 }, lines: ['It was me. The jam. I don’t like jam. I wanted the jar. For a window. Underground. It’s a long story. Tell her? I can’t. She’ll be nice about it.'],
    choice: [{ k: 'tell', label: 'I’ll tell her', set: { 'jam.told': 1 }, t: 'Right. Fine. Good. I’ll be underground.' }, { k: 'you', label: 'You tell her', t: 'You’re right. Worst thing. Going now. Before I stop.' }] },
  { id: 'c', who: 'thistle', when: { days: 1 }, lines: ['Tam came round about the jam. Went the colour of a beetroot. I said keep the jar, dear, and here’s another with jam in. Some things are very easy to forgive. That’s how you practise for the hard ones.'] },
] });
wdTaleAdd({ id: 'seedlings', kind: 'small', title: 'Trodden', journal: 'Something you did, and what you did about it.', steps: [
  { id: 'a', who: 'tam', when: { heart: 2 }, lines: ['Someone walked right across my roof yesterday. Heavy. Big feet. Squashed a whole tunnel. It was you. It’s fine. I’m saying so you can say sorry, not so you have to.'],
    choice: [{ k: 'sorry', label: 'Say sorry', mood: { tam: 1 }, t: 'There. That’s all it was. Tunnel’s already mended. Feature, now.' }, { k: 'no', label: 'Say it wasn’t you', mood: { tam: -1 }, t: 'Right. Must have been someone else with your feet. Fine.' }] },
] });
wdTaleAdd({ id: 'pip-dad', kind: 'small', title: 'Gone fishing', journal: 'Pip’s father, who was always somewhere else.', gentle: 'soft', steps: [
  { id: 'a', who: 'pip', when: { heart: 3, season: ['summer', 'autumn'] }, lines: [
    'My dad used to go fishing for days and leave us on the bank. Me and my sisters. We got very good at fishing. We had to.',
    'I forgave him. Then he did it again. I forgave him again. I don’t know if that’s good or if I just like being on the bank.'] },
] });
wdTaleAdd({ id: 'bramble-sister', kind: 'small', title: 'The sold maps', journal: 'Bramble, who never forgave, and is all right.', steps: [
  { id: 'a', who: 'bramble', when: { heart: 3 }, lines: [
    'My sister sold our father’s maps. Every one. To a man going over the hills. I never forgave her. I want that on record.',
    'Funny thing. I’m all right anyway. I drew new ones. Better ones. Not forgiving her didn’t stop me being happy. I thought it would.',
    'She writes every year. I read them. I don’t answer. That might change. It might not. Both are allowed.'] },
] });
wdTaleAdd({ id: 'wick-forgave', kind: 'small', title: 'A second chance', journal: 'Wick forgave someone once.', gentle: 'soft', steps: [
  { id: 'a', who: 'wick', when: { heart: 3, tod: ['night'] }, lines: [
    'I forgave a magpie once. It stole my eggs. It said it was sorry, and it cried, and I believed it.',
    'It stole the next lot too. I don’t regret forgiving it. I regret letting it back in the tree. Those are different things. It took me years to see that.'] },
] });
wdTaleAdd({ id: 'plaque', kind: 'small', title: 'The bench', journal: 'Someone who was sorry.', steps: [
  { id: 'a', who: 'place', near: ['reed-bank', 'ld-bench-b'], lines: ['A small brass plate on the bench, worn smooth: “For E., who was sorry, and for everyone who let her sit here anyway.”'] },
] });
wdTaleAdd({ id: 'initials', kind: 'small', title: 'Crossed out', journal: 'Two names in the mill yard.', steps: [
  { id: 'a', who: 'place', near: ['ld-churn', 'mill-yard'], when: { open: [2] }, lines: ['Scratched into the old churn: two sets of initials. One crossed out. Then, in different, later scratches, written in again, smaller.'] },
] });
wdTaleAdd({ id: 'reed-card', kind: 'small', title: 'A card from Reed', journal: 'The travelling angler won’t fish the race.', gentle: 'soft', steps: [
  { id: 'a', who: 'post', from: 'Reed', sign: 'Reed, travelling angler', when: { after: 'mill.wheel', days: 2 }, lines: ['I hear you got over to the mill. Good fishing in the race, people say. I won’t fish it. I did once, years back, and the line came up wrong. I won’t say more. Try the estuary. The bass are friendly.'] },
] });
wdTaleAdd({ id: 'boot', kind: 'small', title: 'An old boot', journal: 'Something fished up.', steps: [
  { id: 'a', who: 'catch', when: { level: 3 }, lines: ['Your line snags something heavy. A boot. Inside the boot, a note in a jar: “Sorry I sold your bike. I’ll buy you another. — your brother.” It is very old. Nobody knows whose.'] },
] });
wdTaleAdd({ id: 'perpetua-late', kind: 'small', title: 'Late', journal: 'Perpetua, who is always late, and minds.', steps: [
  { id: 'a', who: 'post', from: 'Perpetua', sign: 'Perpetua, Post', when: { level: 4 }, lines: ['A short note, which is not post, it is from me. People laugh about me being slow. I laugh too. Once I was so late with a letter that someone missed saying goodbye. I think about that. I go as fast as I can. It isn’t very fast.'] },
] });
/* ---------- the woodcutter, at home among the yews of the old woodland (layout: 'ld-woodhut'; until then the labyrinth) ---------- */
const WK_HOLLIN_ROW = Object.freeze({ id: 'hollin', name: 'Hollin', kind: 'stoat', fur: '#8a7058', coat: '#4e5a46', snout: '#d8c8b0', hat: 'cap', hatc: '#5a4a38', prop: 'bag', likes: 'fish' });
wdTaleResident({ id: 'hollin', name: 'Hollin', home: { region: 'southwest-ruins', near: ['ld-woodhut', 'ld-labyrinth', 'ld-tower'] }, art: () => _wdFolkArt(WK_HOLLIN_ROW),
  here: (m) => !(wdTaleFlag('hollin.gone')),
  quiet: 'He nods, and goes on with the net.',
  day: ['Wood’s dry. Good splitting weather. You can tell by the sound.', 'Owl was round. Said nothing useful. Owls don’t.', 'Mended the angler’s nets. He said “Ta.” Longest speech he’s made this year.', 'I talk to the trees. They’re good listeners. Bad at answers.', 'Mind the yews. They’re older than the chapel and they know it.'] });
