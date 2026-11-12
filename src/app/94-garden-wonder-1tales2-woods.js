/* ============================================================
   GARDEN WONDER, stories: Hollin and Quince, “What the woods keep” (drafted in C:/tmp/stories/woodsman.md; wired by the story lead; format: docs/dev/STORIES.md).
   Loads after 94-garden-wonder-1tales.js (the main line), so it can add beats to it.
   ============================================================ */
const _hf = (k) => typeof wdTaleFlag === 'function' ? wdTaleFlag(k) : null;
const _hTold = () => !!_hf('hollin.told');
const _hView = (v) => _hf('hollin.view') === v;
const WK_DAY_HOLLIN = [
  /* weather */
  { if: F => F.rain, t: 'Rain. Good. The yews drink, and nobody comes. Except you. You’re wet.' },
  { if: F => F.rain, t: 'Rain’s on the roof. I’ve mended that roof eleven times. It’s winning.' },
  { if: F => F.rain && F.season === 'autumn', t: 'Wet leaves. Mind the path. It goes from under you like a bad rung.' },
  { if: F => F.snow, t: 'Snow. You can read the woods today. Fox went past at four. In a hurry. Owes someone money, by the look of it.' },
  { if: F => F.snow, t: 'Snow on the woodpile. I split it yesterday. I’m not often ahead of the weather. Let me have it.' },
  { if: F => F.snow && F.tod === 'night', t: 'Hear that? No. Nor me. Snow does that. Best quiet there is.' },
  /* spring */
  { if: F => F.season === 'spring', t: 'Hazel’s in catkin. I cut that stool right down seven years ago. Look at it now.', soft: 'Hazel’s in catkin. I cut that stool right down seven years ago. Look at it now. Stubborn thing.' },
  { if: F => F.season === 'spring', t: 'Bluebells under the beeches. Don’t walk on them. They take years to come back, and they remember feet.' },
  { if: F => F.season === 'spring', t: 'Woodpecker started at five. Same tree. He’s not getting in. He knows. It’s the principle.' },
  { if: F => F.season === 'spring' && F.tod === 'dawn', t: 'Listen. Blackcap. Sings like he’s got something to prove. Don’t we all.' },
  /* summer */
  { if: F => F.season === 'summer', t: 'Too hot to split. I’m carving instead. A heron. It’s going to be a duck. They often are.' },
  { if: F => F.season === 'summer', t: 'Midges. Every year they find me. Very loyal. I wish they wouldn’t be.' },
  { if: F => F.season === 'summer' && F.tod === 'dusk', t: 'Long evening. I sit out with the net and the light goes on for ever. That’s summer’s one trick. It’s a good one.' },
  { if: F => F.season === 'summer', t: 'Grass snake on the woodpile. We’ve agreed she has the top and I have the rest.' },
  /* autumn */
  { if: F => F.season === 'autumn', t: 'Ceps under the birches. I’ll not tell you which birches. A man has to keep something.' },
  { if: F => F.season === 'autumn', t: 'Jays burying acorns and forgetting where. Half this wood was planted by a bird with a bad memory.' },
  { if: F => F.season === 'autumn', t: 'Logs for winter. Stack them bark up, so the rain runs off. Nobody asked. I’m telling you anyway.' },
  { if: F => F.season === 'autumn', deep: 1, t: 'Fair’s on, up the orchard. You can hear the band from here if the wind’s wrong. I go further in, that week.', soft: '' },
  /* winter */
  { if: F => F.season === 'winter', t: 'Cold. I keep the stove in all night. It and me, we’ve an understanding.' },
  { if: F => F.season === 'winter', t: 'Robin’s at the door every morning. Wants the crumbs. Doesn’t want me. Fair enough.' },
  { if: F => F.season === 'winter', t: 'Short days. I get up in the dark and go to bed in it. The bit in between I spend splitting things.' },
  { if: F => F.season === 'winter' && F.tod === 'night', t: 'Frost on the inside of the window. Ferns, it makes. I’ve tried to carve that. Can’t. Some things you only get to look at.' },
  /* the hour */
  { if: F => F.tod === 'dawn', t: 'You’re up early. Dawn’s the best of it here. Deer come through the yews like they’re late for chapel.' },
  { if: F => F.tod === 'dusk', t: 'Getting dark. Go back by the chapel path. It’s longer. It’s also the one with no bog in it.' },
  { if: F => F.tod === 'dusk', t: 'Bats out. Pipistrelles. Nine times round the hut and then off. I’ve never once counted ten.' },
  { if: F => F.tod === 'night', t: 'Owl’s about. He’ll tell you he saw you. He did. He sees everything and makes a meal of it.' },
  { if: F => F.tod === 'night', t: 'Lamp’s on. Nets don’t mend themselves, more’s the pity.' },
  /* what you did */
  { if: F => F.fishRecent, t: F => `A ${F.fishRecent.toLowerCase()}. Bring the net round after. You’ll have torn it. Everyone does, the first hundred times.` },
  { if: F => F.bugRecent, t: F => `A ${F.bugRecent.toLowerCase()}? Off the old oak, I’d guess. They keep to their trees. You learn which.` },
  { if: F => F.newPlant, t: F => `Heard you put a ${F.newPlant.toLowerCase()} in. Water the roots, not the leaves. Leaves are for show.` },
  { if: F => F.away >= 3, t: 'You’ve been away. The woods didn’t notice. I did, a bit. Don’t make anything of it.' },
  { if: F => F.ripe >= 2, t: 'Something of yours wants picking. I don’t do gardens. I do trees. Same thing, slower.' },
  /* the main line around him */
  { if: F => _wtMill(F), t: 'Hear that? The wheel. Right through the woods, the old way. I made the cog. I’m allowed to stand here and listen to it. Aren’t I.', soft: 'Hear that? The wheel. Right through the woods, the old way. I made the cog. Forty years. Sounds right.' },
  /* plain days */
  { t: 'Wood’s dry. Good splitting weather. You can tell by the sound.' },
  { t: 'Owl was round. Said nothing useful. Owls don’t.' },
  { t: 'I talk to the trees. They’re good listeners. Bad at answers.' },
  { t: 'Mind the yews. They’re older than the chapel and they know it.' },
  { t: 'Mended the angler’s nets. He said “Ta.” Longest speech he’s made this year.' },
  { t: 'Tam brought worms. I gave Tam a box to keep them in. Tam said the box was a worm now. I didn’t argue.' },
  { t: 'Pip came by. Pip didn’t stop. Pip left a fish on the step. I think that’s Pip for “hello”.' },
  { t: 'Sheet bend, that knot. Holds two different ropes together. Most knots only like their own kind.' },
  { t: 'Axe wants a new handle. Ash, it has to be. I’ve told the axe. It knows.' },
  { t: 'Someone borrowed my saw in the spring and never brought it back. I know who. I’ve not asked. I’ve a second saw. That’s not the same as it being all right.' },
  { t: 'Fox had two of my hens, years back. I still put scraps out for him. I also built a fence. You can do both.' },
  { t: 'Jay took the butter off the sill. Third time. I’ve moved the butter. I’ve not moved the jay. It’s his wood too.' },
  { t: 'Someone left a cake on the step. Pip, by the crumbs. I’ll take the plate back. I always take the plate back.' },
  { t: 'Thursday tomorrow? Nets. I lose track. The angler doesn’t. He’s there before the tide is.' },
  { t: 'Charcoal burns slow if you let it. Most good things do. Most bad ones, as well.' },
  { t: 'Wick says I should get a clock. I’ve got the light. It’s never once been wrong.' },
  /* wrong notes, before the truth (deep; gone in gentle) */
  { if: F => !_hTold(), deep: 1, t: 'Carved a hare. Burned it. Not right. Some things you don’t carve.', soft: 'Carved a hare. It came out a rabbit. I’ve kept it, as a rabbit.' },
  { if: F => !_hTold(), deep: 1, t: 'Don’t bring me apples. I know you mean it kindly. Don’t.', soft: '' },
  { if: F => !_hTold(), deep: 1, t: 'The bees stop at the arch. Never come past it. Clever things, bees.', soft: '' },
  { if: F => !_hTold(), deep: 1, t: 'People call me Hollin. That’s what the woods call me. I had another name. I took it off the door.', soft: 'People call me Hollin. Holly, that means. Prickly. Fair.' },
  /* after the truth: listened, asked, or sat */
  { if: F => _hTold() && (_hView('listen') || _hView('ask')), deep: 1, t: 'You came back. I’ll not ask why. Net?', soft: '' },
  { if: F => _hTold() && (_hView('listen') || _hView('ask')), deep: 1, t: 'I’ll not talk about it every time you come. It isn’t a thing you visit. Sit if you want. Or don’t.', soft: '' },
  { if: F => _hTold() && (_hView('listen') || _hView('ask')), deep: 1, t: 'People will say I’ve paid for it. Forty years in a hut. It isn’t paying. There’s nobody it’s paid to.', soft: '' },
  { if: F => _hTold() && (_hView('listen') || _hView('ask')), deep: 1, t: 'Don’t call me a good man. You’ll want to, some days. Don’t.', soft: '' },
  { if: F => _hTold() && (_hView('listen') || _hView('ask')), deep: 1, t: 'I’ll mend your net. That’s not me making up for anything. Nothing makes up for it. It’s a net.', soft: '' },
  { if: F => _hTold(), deep: 1, t: 'Trees grow back if you cut them right. People aren’t trees. Don’t let anyone tell you otherwise. Me included.', soft: '' },
  /* after the truth: told him what you thought */
  { if: F => _hTold() && _hView('condemn'), deep: 1, t: 'You came anyway. I heard what you said. I’ve not stopped hearing it. That’s right, as well.', soft: '' },
  { if: F => _hTold() && _hView('condemn'), deep: 1, t: 'Net’s there if you need it. You don’t have to talk to me to take it.', soft: '' },
  { if: F => _hTold() && _hView('condemn'), deep: 1, t: 'You don’t have to be civil. I know what I am to you. I’d think it too.', soft: '' },
  /* after the truth: walked away, and came back anyway */
  { if: F => _hTold() && _hView('leave'), deep: 1, t: 'You’re back. You don’t have to say anything. I didn’t think you’d come. I’d not have blamed you.', soft: '' },
  { if: F => _hTold() && _hView('leave'), deep: 1, t: 'The path’s yours as much as mine. More, probably.', soft: '' },
  /* after the vale's questions */
  { if: F => _hf('hollin.stall') === 'yes', deep: 1, t: 'Bramble gave me a stall. Far end, by the drain. Only on days the honey isn’t out. I asked for that. Sold four birds. Nobody spoke to me. That was fair.', soft: '' },
  { if: F => _hf('hollin.stall') === 'no', deep: 1, t: 'No stall. Bramble said it to my face. I respect that more than most things anyone’s said to me in years.', soft: '' },
  { if: F => _hf('mill.seat') === 'yes', deep: 1, t: 'There was a place at the mill supper. I sat in it for one cup of tea. Then I came home. It was more than I should have had.', soft: 'There was a place at the mill supper. One cup of tea and home. Too many people. Lovely wheel.' },
  { if: F => _hf('mill.seat') === 'no', deep: 1, t: 'No place for me at the mill. I stood by the trees and heard the wheel. That’s what I came for. The rest isn’t mine.', soft: '' },
  { if: F => _hf('hollin.feast') === 'yes', deep: 1, t: 'Someone laid me a place at the harvest supper. Thistle said so, the way you’d mention a draught. I didn’t go. She was there. That’s the rule. It was always the rule.', soft: '' },
  { if: F => _hTold() && F.season === 'winter', deep: 1, t: 'I’ve been looking at the hills. Over them. I’ve said that to nobody. Don’t make it a thing.', soft: '' },
];

const _qf = (k) => typeof wdTaleFlag === 'function' ? wdTaleFlag(k) : null;
const WK_DAY_QUINCE_MORE = [
  /* weather */
  { if: F => F.rain, t: 'Rain. Buckets under the press. Free cider water. Don’t drink it.' },
  { if: F => F.rain && F.season === 'spring', t: 'Rain on the blossom. Knocks it off. I go out with an umbrella and hold it over the best tree like a fool. Every year.' },
  { if: F => F.rain && F.season === 'autumn', t: 'Rain in pressing week. Windfalls go to mush. Mush makes cider too. Everything does, if you’re stubborn.' },
  { if: F => F.snow, t: 'Snow! I’ve wrapped the hives in sacking. They look like little old men. Grumpy little old men.' },
  { if: F => F.snow, t: 'I counted the stair in the snow and lost count at nine. Best morning I’ve had all month.' },
  /* spring */
  { if: F => F.season === 'spring', t: 'Grafting today. You cut one tree and tie it to another and tell them to get on. They mostly do.' },
  { if: F => F.season === 'spring', t: 'First swarm went up the oak. I said please. They said no. I got a ladder.' },
  { if: F => F.season === 'spring' && F.tod === 'dawn', t: 'Blackbird on the press roof at four, singing like he’s been paid. I should charge him rent.' },
  /* summer */
  { if: F => F.season === 'summer', t: 'Honey flow. The whole square smells of it. Stung four times and I’m in a wonderful mood.' },
  { if: F => F.season === 'summer', t: 'Wasps in the orchard. They think they’re bees. I don’t correct them. Let them have a dream.' },
  { if: F => F.season === 'summer', t: 'Pip came up and told me a joke about a heron. I had to sit on the steps. I still don’t know the end. Neither did Pip.' },
  /* autumn */
  { if: F => F.season === 'autumn', t: 'Pressing week. My arms will fall off by Friday. I’ll stick them back on with honey.' },
  { if: F => F.season === 'autumn', t: 'New cider. Medlar. Mother Thistle says it’ll taste of socks. Mother Thistle is going to be wrong in public.' },
  { if: F => F.season === 'autumn', deep: 1, t: 'Fair posters in the square. I’ve turned that one round. It can face the wall till October’s done.', soft: 'Fair posters in the square. Somebody’s spelt cider with a y. I’ve corrected it in pen.' },
  /* winter */
  { if: F => F.season === 'winter', t: 'Wassail soon. You bang a pot at the trees and pour cider on the roots and sing at them. They like it. I like it more.' },
  { if: F => F.season === 'winter', t: 'Winter. I do the books. The bees cost more than they make. Don’t tell them. They’d be unbearable.' },
  { if: F => F.season === 'winter' && F.tod === 'night', t: 'Cat, stove, a cup of last year’s and a book I’ve read nine times. I’m fine. I’m better than fine. Go home, you’ll freeze.' },
  /* the hour */
  { if: F => F.tod === 'dawn', t: 'I say good morning to every hive. Twelve good mornings. I mean all of them.' },
  { if: F => F.tod === 'day', t: 'Busy day. If I stop talking it means I’ve been stung. Carry on without me.' },
  { if: F => F.tod === 'dusk', t: 'Bats round the barrels. They want the moths. The moths want the cider. Everybody wants something up here.' },
  { if: F => F.tod === 'dusk', t: 'Sun’s going down over the Mere. The whole river goes gold from up here. I’ve seen it a thousand times. I still stop.' },
  { if: F => F.tod === 'night', t: 'You’re up late. So’s the cat. Don’t encourage her.' },
  /* what you did */
  { if: F => F.bugRecent, t: F => `A ${F.bugRecent.toLowerCase()}! Did it sting? No? Then you were polite to it. They can tell.` },
  { if: F => F.fishRecent, t: F => `You smell of ${F.fishRecent.toLowerCase()}. Stand downwind of the hives. They’re very particular.` },
  { if: F => F.ripe >= 2, t: 'Something of yours wants picking. I can see it from here. I can see everything from here. It’s a hill.' },
  { if: F => F.away >= 3, t: 'There you are! The bees asked. Well. They didn’t. I did.' },
  /* plain days */
  { t: 'May the wind be dry and your boots be wet. That’s backwards. I made it up. It still counts.' },
  { t: 'Red sky at night, the hare’s delight. Red sky in the morning, the hare had a lie-in. They all work if you believe them.' },
  { t: 'I’ve beaten Pip at the apple race in my head eleven times this week. I don’t enter. I’d win.' },
  { t: 'The cat’s called Marmalade. She’s grey. I named her when I was cross.' },
  { t: 'Thistle sent soup up the stair with Tam. Tam counted the stair on the way. Two hundred and seven. Even Tam gets a different number.' },
  { t: 'Wick brought me the weather. “Rain Thursday.” He’s never once been right. I plan round him anyway. It’s nice to be told.' },
  { t: 'I keep the orchard by myself. People say “all by yourself?” as if the trees weren’t here.' },
  { t: 'Honey on toast is a meal. I’ve decided. Don’t argue with a woman who owns twelve hives.' },
  { t: 'I sing to the trees when I prune. Badly. They fruit anyway. Says a lot about trees.' },
  { if: F => !_qf('quince.bell'), t: 'I polish the orchard bell every year and never ring it. It’s the shiniest bell nobody’s heard.' },
  /* after her own telling (deep) */
  { if: F => _qf('quince.told'), deep: 1, t: 'I told you a big thing and the sky stayed up. I keep checking. Still up.', soft: '' },
  { if: F => _qf('quince.told'), deep: 1, t: 'Some days I’m only counting. Today I’m not. Today it’s just a stair, and it’s a nice stair.', soft: '' },
  { if: F => _qf('quince.told'), deep: 1, t: 'Thistle came up. We didn’t talk. We shelled beans. Forty years of shelling beans. Best friend I have.', soft: '' },
  { if: F => _qf('quince.bell'), deep: 1, t: 'I rang the bell. You heard. Don’t look at me like that, I’ll cry, and the bees will think it’s rain.', soft: '' },
  /* after his (deep): she sets the terms, every time */
  { if: F => _qf('hollin.told'), deep: 1, t: 'Don’t tell me about the woods. Not today, not as a kindness. Tell me about your garden.', soft: '' },
  { if: F => _qf('hollin.told'), deep: 1, t: 'You can be friends with whoever you like down there. I mean that. I’m not lending you my side of it, that’s all.', soft: '' },
  { if: F => _qf('quince-woods.brook'), deep: 1, t: 'Quince by the brook’s got two leaves. Two. I counted. Of course I counted.', soft: '' },
  { if: F => _qf('quince-woods.bees'), deep: 1, t: 'There’s a bee past the arch. I saw it go. I didn’t follow. Next time I might.', soft: '' },
];

/* Replaces hollin.meet, hollin.wren, hollin.beetles (ids move from 'hollin' to 'woods'; the branch is unreleased, so no saves to migrate). */
wdTaleAdd({ id: 'woods', kind: 'small', title: 'The woodcutter', journal: 'Hollin, who lives by the yews and mends things.', gentle: 'keep', steps: [
  { id: 'meet', who: 'hollin', when: { open: [3], home: 1 }, lines: [
    'Lost? No. You’ve the look of someone who wants to be. That’s different. Mind the axe.',
    'Your net’s torn. Give it here. Takes me a minute. Took me forty years to learn, so call it a bargain.',
    'There. Sheet bend. Holds. Go on, then. The yews don’t like being stared at.'] },
  { id: 'wren', who: 'hollin', when: { heart: 1, days: 1, home: 1 }, lines: [
    'I carved you a wren. It doesn’t look like a wren. It looks like a wren that’s had a hard week.',
    'Lime wood. Keep it out of the wet. Put it where you’ll see it going out. That’s where I keep mine.',
    { t: 'Don’t thank me. I’d only not know what to do with it.', soft: 'Don’t thank me. I’ve a shelf of them. They were getting ideas.' }],
    give: { 'keep:carved-wren': 1 } },
  { id: 'beetles', who: 'hollin', when: { heart: 2, tod: ['dusk', 'night'], home: 1 }, lines: [
    'Stag beetles are on the old oak by the brook, after dark. Not the big oak. The leaning one. Big oak’s all show.',
    'Don’t tell the owl I told you. He likes to be the one who knows.'], set: { 'woods.beetles': 1 } },
  { id: 'nets', who: 'angler', when: { heart: { hollin: 2 }, after: 'woods.beetles', days: 1, weekday: 4 }, lines: [   // Thursday: the nets are out on the pier
    'Thursday. Nets day. Hollin says you’ve been down his way. He mends my nets on Thursdays. Has done for, oh. A long time.',
    'We don’t talk. He sits there, I sit here, the nets go between us. Best company I’ve had in years.',
    { t: 'We each carry something. We’ve never once asked. I think that’s why it works.', soft: 'Two old men and a pile of string. Don’t laugh. It’s a very good pile of string.' },
    'Come Thursday, if you like. Bring a torn one. He likes a torn one. Gives his hands something to say.'] },
  { id: 'carve', who: 'hollin', when: { heart: 3, home: 1, dry: 1 }, lines: [
    'Sit there. Knife away from you, always. The wood goes where it wants. You go with it, or you go to the doctor.',
    'Lime’s soft. Holly’s hard. Holly’s what they named me after. Prickly. Keeps its leaves all winter, out of spite.',
    'What do you want to make?'],
    choice: [
      { k: 'bird', label: 'A bird', set: { 'woods.carved': 'bird' }, t: 'A bird. Everyone’s first is a bird. Mine was a bird. It looked like a potato with opinions. Yours looks like a bird. Huh.' },
      { k: 'fish', label: 'A fish', set: { 'woods.carved': 'fish' }, t: 'A fish. That’s harder than it looks, a fish. It’s all one curve. You found it, mostly. The angler will want one now.' }],
    give: { 'keep:carved-bird': 1 },
    sit: 'You carve in silence. Shavings pile up between your feet. Every so often he reaches over and turns your hand a little, without a word.' },
  { id: 'trees', who: 'hollin', when: { heart: 3, after: 'woods.carve', days: 2, tod: ['day', 'dusk'] }, lines: [
    'Walk with me. You keep asking where things are. I’ll show you once. I’ll not show you twice.',
    'Every bug in this wood has its tree. Stag beetles, the leaning oak. Purple emperors, the sallow by the brook, high up, if you’re patient. Glow-worms on the bank under the chapel yews in June.',
    'Lacewings in the ivy on the ruined wall. Woodlice everywhere, because woodlice don’t care.',
    'That yew there is older than anything in the vale with a name. I come and stand by it when I need telling how small I am.',
    'Right. That’s the woods. Don’t tell the owl.'], set: { 'woods.trees': 1 } /* NEW: marks bug trees in the Field Journal */ },
  { id: 'needle', who: 'hollin', when: { heart: 4, home: 1, days: 3 }, lines: [
    'Here. Netting needle. Yew. My father’s. No, his father’s. Someone’s father’s.',
    'You can mend your own now. You’ve watched enough. Don’t bring them to me any more.',
    { t: 'I’d like to think of it being used after I’m not about.', soft: 'Go on. I’ve another. I’ve always another.' }],
    give: { 'keep:netting-needle': 1 } },
] });

wdTaleAdd({ id: 'hollin', kind: 'arc', title: 'What the woods keep', journal: 'Hollin the woodcutter, what he did, and what the vale does about it.', gentle: 'skip', steps: [
  /* ---- the clue trail: free beats, at the hut, in any order once you are nodding (§4) ---- */
  { id: 'ribbon', who: 'place', free: 1, near: ['ld-woodhut', 'ld-labyrinth'], when: { after: 'woods.wren', deep: 1 }, lines: [
    'Inside his door, at eye height, a cider-fair ribbon is nailed to the wood. Faded to the colour of weak tea. FIRST, it says, and a year forty years gone.'] },
  { id: 'door', who: 'place', free: 1, near: ['ld-woodhut', 'ld-labyrinth'], when: { after: 'hollin.ribbon', days: 1, deep: 1 }, lines: [
    'There was a name on the hut door once. Someone has taken a knife to it, carefully, letter by letter, until there is only a pale patch the shape of a word.'] },
  { id: 'flowers', who: 'place', free: 1, near: ['ld-woodhut', 'ld-labyrinth'], when: { after: 'woods.beetles', season: ['spring', 'summer'], deep: 1 }, lines: [
    'Beside the hut, on a flat stone, a jam jar of fresh primroses. There is no grave here. The stone is just a stone.'] },
  { id: 'jar', who: 'hollin', when: { after: 'hollin.flowers', heart: 2, home: 1, deep: 1 }, lines: [
    'The jar? For my mother. She’s in the churchyard up the orchard.',
    'I don’t go up there. So she gets a stone by the hut, and primroses. She’d have said I picked them too short. I do.'] },

  /* ---- the island: the truth about the mill he has kept for the angler (it colours mill.toast) ---- */
  { id: 'island', who: 'hollin', when: { heart: 3, after: 'mill.icehouse', home: 1, deep: 1, tod: ['dusk', 'night'] }, lines: [
    'Tam’s been in the ice house. I can tell. Tam’s quieter than usual, and Tam’s always quiet.',
    'I’ll tell you a thing I’ve told nobody. That evening, the third of October, I was cutting withies down by the water. I saw her. His sister. Reading, on the island, the way she did.',
    'I didn’t see the boy. I heard the wheel stop. You don’t forget a wheel stopping. Like a heart.',
    'He came to me after. The miller’s boy. He said: you saw her on the island. I said I did. He said: you didn’t. So I didn’t. Forty years.',
    'He took the blame so she wouldn’t have to carry it. I can’t do much. I can keep my mouth shut for someone. I’ve broken that now. For you. Don’t make me sorry.'],
    set: { 'hollin.island': 1 } },

  /* ---- the wrong note (kept from the current file; needs good friends now) ---- */
  { id: 'wrong', who: 'hollin', when: { heart: 3, season: ['autumn', 'winter'], deep: 1, days: 2, after: 'hollin.ribbon', home: 1 }, care: 1, set: { 'hollin.wrong': 1 }, lines: [
    'You’ve seen the ribbon on my door. You’re wondering. You’ve been wondering a while.',
    'I won it, carving. First prize. The same day I did something. A long time ago.',
    'I won’t pretend it was anything other than what it was. I won’t tell you today. Maybe not ever. It isn’t mine to say first.'] },

  /* ---- the truth (§3.4 has the scene with its staging notes) ---- */
  { id: 'truth', who: 'hollin', heavy: 1, when: { heart: 3, after: 'quince.fair', days: 2, deep: 1, home: 1, dry: 1, tod: ['day', 'dusk'] }, lines: [
    'He’s on the step with a net across his knees. He doesn’t look up when you come.',
    'You’ve been up at the orchard. She told you. Good. She should get to say it first. It’s hers.',
    'I’ll say mine once, and plain, because she had to.',
    'At the cider fair, forty years ago, I raped a woman. She was nineteen. She did nothing to bring it on. I did it.',
    'There’s no more of it that’s any use to you. I’ll not tell you I was drunk, or young, or that I didn’t know. I knew. I’ve had forty years to look for a way round that, and there isn’t one.',
    'I stay this side of the arch. She has the other. It’s the only thing I do that’s for her and not for me.',
    'I wrote it down, all of it, and signed it with the name off the door, and left it at the chapel. Not with her. If she ever wants it said in front of the vale, it’s there in my hand. She’ll not have to be believed. I’ve said it.',
    'I’m not asking you for anything. Not to stay. Not to understand. You can go. Most should.'],
    set: { 'hollin.told': 1 },
    choice: [
      { k: 'listen', label: 'Listen', set: { 'hollin.view': 'listen' }, t: 'He nods, and goes back to the net. His hands aren’t steady. He doesn’t ask you to stay, and he doesn’t ask you to go.' },
      { k: 'ask', label: 'Ask him why', set: { 'hollin.view': 'ask' }, t: 'He’s quiet a long time. “Because I wanted to, and I thought what she wanted didn’t count. That’s the whole of the why. Anything longer is me dressing it up.”' },
      { k: 'say', label: 'Tell him what you think of it', set: { 'hollin.view': 'condemn' }, mood: { hollin: -4 }, t: 'He hears all of it. He doesn’t argue, and he doesn’t look away. “Yes,” he says. “That’s right. All of that is right.”' },
      { k: 'leave', label: 'Leave', set: { 'hollin.view': 'leave' }, mood: { hollin: -6 }, t: 'You walk away. Behind you, after a long while, the axe starts again, slow, the same rhythm as before.' }],
    sit: 'You sit on the other end of the step. Neither of you speaks. A wren comes down for the crumbs, looks at you both, and goes. After a while he picks the net up again. “Don’t mistake that for anything,” he says. “I won’t.”' },

  /* ---- after: only if you go back. He never brings it up. */
  { id: 'after', who: 'hollin', when: { after: 'hollin.truth', days: 2, home: 1, deep: 1 }, lines: [
    { t: 'You came back. I didn’t know if you would. Kettle’s on. That’s all that’s on.', flag: { 'hollin.view': 'listen' } },
    { t: 'You asked me why. I’ve been asking it forty years and it’s still the same short answer. I’ll not make it longer for you.', flag: { 'hollin.view': 'ask' } },
    { t: 'You came anyway. After what you said. You don’t have to stay. The net’s on the hook if it’s the net you came for.', flag: { 'hollin.view': 'condemn' } },
    { t: 'You’re back. I won’t ask. I’ll not ask you anything, ever. That’s easier for both of us.', flag: { 'hollin.view': 'leave' } },
    'I’ll not talk about her. Not to you, not to anyone. Don’t ask me how she is. It isn’t mine to know.',
    'Bring me your torn nets, or don’t. The woods are the same either way. They don’t care what I am. That’s why I’m in them.'] },

  /* ---- the account, at the chapel. Tam keeps the chapel. ---- */
  { id: 'account', who: 'tam', heavy: 1, when: { after: 'hollin.truth', days: 3, deep: 1, home: 1 }, lines: [
    'There’s a paper in the chapel. Under the shelf with his wooden birds on. Forty years it’s been there. I dust round it.',
    'I don’t read other folk’s paper. I don’t talk about it, so I’m not. It’s there if you want it. It’s there if you don’t.'],
    choice: [
      { k: 'read', label: 'Read it', set: { 'hollin.read': 1 }, t: 'Two lines, in a careful hand, signed with a name you have never heard: “At the cider fair I raped a girl of nineteen. She did not want it and did nothing to cause it; the wrong is all mine. I will not write her name. It is not mine to put on paper.” Under it, the ink is newer: “Still true.”' },
      { k: 'leave', label: 'Leave it where it is', t: 'You leave it under the shelf with the birds. It isn’t addressed to you. Tam, who was watching from a hole by the door, says nothing, which is the most Tam has ever said.' }] },

  /* ---- the vale's first question: a stall (Bramble runs the market on the green) ---- */
  { id: 'stall', who: 'bramble', when: { after: 'hollin.truth', days: 4, home: 1 }, lines: [
    'Hollin came to the mill yard. Forty years, and he came to the mill yard, cap in his hands, and asked for a stall at the harvest market. Carved birds. Kindling.',
    'He asked for the far end. He asked which days Quince sells honey, so he wouldn’t be there on them. He’s thought about it. I’ll give him that and nothing else.',
    'I think he should have been driven out the year it happened. I’ve said so at every meeting since. Nobody listened, because she didn’t want a fuss, and I’ll respect what she wanted before I respect my own opinion. Just.',
    'But you’ve been down there. You know him now, which is more than most. You mended the mill, more or less. So. Does he get a stall?'],
    choice: [
      { k: 'yes', label: 'Give him the stall', set: { 'hollin.stall': 'yes' }, mood: { bramble: -1, thistle: -1, pip: 1 }, t: 'Right. Far end, by the drain. I’ll put it on the map. In pencil. Don’t expect me to buy a bird.' },
      { k: 'no', label: 'Don’t give him one', set: { 'hollin.stall': 'no' }, mood: { pip: -1 }, t: 'Right. I’ll tell him myself. To his face. He’ll take it. That’s almost the worst part.' },
      { k: 'ask', label: 'Ask Quince first', set: { 'hollin.stall': 'asked' }, t: 'Ask her if you like. I’ll wait. I’ve a feeling I know what she’ll say, and it isn’t yes or no.' }] },
  { id: 'stall2', who: 'bramble', free: 1, when: { after: 'quince-woods.notvote', flag: { 'hollin.stall': 'asked' }, home: 1 }, lines: [
    'She told you not to make her the vote. I know. She told me the same, years ago, louder. So it’s you and me again.'],
    choice: [
      { k: 'yes', label: 'Give him the stall', set: { 'hollin.stall': 'yes' }, mood: { bramble: -1, thistle: -1, pip: 1 }, t: 'Far end. By the drain. Pencil.' },
      { k: 'no', label: 'Don’t give him one', set: { 'hollin.stall': 'no' }, mood: { pip: -1 }, t: 'I’ll tell him. To his face.' }] },

  /* ---- the vale's third question: a place at the harvest supper on the green (the second, mill.supper, is main line: §6) ---- */
  { id: 'feast', who: 'thistle', when: { after: ['hollin.truth', 'mill.toast'], days: 2, home: 1 }, lines: [
    'Harvest supper on the green, dear. I’m doing the tables. I always do the tables. Nobody else can count chairs.',
    'Pip wants a place for Hollin. Pip wants a place for everybody. Pip would lay a place for the weather.',
    'I won’t lay it. I believed her the day she told me, and I’ve believed her every day since. He can have the woods. He can’t have her supper.',
    'But it’s not my green. It’s everybody’s. If you lay it, I’ll not take it away. I’ll just not pass him the bread.'],
    choice: [
      { k: 'yes', label: 'Lay him a place', set: { 'hollin.feast': 'yes' }, mood: { thistle: -2, pip: 1, wick: -1 }, t: 'Your plate, then. Your chair. Put it at the far end. Further. There.' },
      { k: 'no', label: 'Don’t lay one', set: { 'hollin.feast': 'no' }, mood: { pip: -1 }, t: 'Thank you, dear. I don’t mean thank you. I mean: good. I’ll get the soup on.' },
      { k: 'her', label: 'It’s your table, Thistle', set: { 'hollin.feast': 'no' }, t: 'Then it’s no. Don’t look relieved, dear. You still had a say. You just gave it me.' }] },

  /* ---- he goes ---- */
  { id: 'gone', who: 'place', near: ['ld-woodhut', 'ld-labyrinth'], when: { after: 'quince-woods.feast', days: 10 }, lines: [
    'The hut is empty. The stove is cold. The woodpile is stacked bark up to the eaves, and the nets are folded on the step with a label in pencil: ANGLER.',
    'The ribbon has gone from inside the door. In the stove’s ashes, the curled end of something that was once red.',
    'Pinned under the scratched-out name, a note: “Don’t tell her I’ve gone. It isn’t hers to be told things about me. I’ve given the woods back. They were never mine. H.”',
    { t: 'Under it, smaller: “Your net’s mended. Last one.”', flag: { 'hollin.view': 'listen' } },
    { t: 'Under it, smaller: “Your net’s mended. Last one.”', flag: { 'hollin.view': 'ask' } },
    { t: 'Under it, smaller: “You were right. I’ve kept all of it.”', flag: { 'hollin.view': 'condemn' } }],
    set: { 'hollin.gone': 1 } },
] });

wdTaleAdd({ id: 'quince-woods', kind: 'arc', title: 'The woods back', journal: 'Quince, the cider fair, and what she told the bees.', gentle: 'skip', steps: [
  { id: 'arch', who: 'quince', when: { heart: 2, deep: 1 }, lines: [
    'Bees don’t go past the ruined arch in the old woodland. Neither do I. No reason. Lovely weather, isn’t it.',
    'You’ve been down there? Mind the yews. And mind your net. Things catch, down there.'] },
  { id: 'apples', who: 'quince', when: { heart: 3, home: 1, dry: 1 }, lines: [
    'I used to win the apple race every year. You run with an apple on a spoon from the square to the bottom of the stair. Two hundred and something steps. Uphill on the way back.',
    'I never dropped it. Not once. I’d hold the spoon like this, see, and look at nothing but the apple, and the whole fair went quiet round me.',
    'I don’t race now. I’ve kept the spoon. It’s in the drawer with the good knives. Here, hold it. No, like this. There. Now you’re a champion. Don’t let it go to your head.'],
    sit: 'You stand in the square holding a spoon. She laughs so hard she has to sit on the barrels, and the laugh turns heads all the way down the stair.' },
  { id: 'fair', who: 'quince', heavy: 1, when: { heart: 4, after: 'mill.bees', tod: ['dawn', 'day'], dry: 1, deep: 1, days: 2, home: 1 }, lines: [
    'The fair poster’s up in the square. I always go quiet when it goes up. You’ve noticed. You notice things.',
    'When I was nineteen, at the cider fair, a man raped me. I’ve said it now. That’s the word for it, and I’m done being polite about it.',
    'I’m not going to tell you who. Not because it’s a secret. Because he doesn’t get to be the interesting part.',
    'I told my mother. She said hush. So I told the bees. You tell bees everything, the old way. They didn’t say hush. They went away for a year, and then they came back, and so did I. Mostly.',
    'Thistle believed me. Just like that. She came up the stair with soup and sat on the step for a week. That’s the whole reason I’m still here and not over the hills.',
    'I count the stair because counting keeps my feet on things. That’s all it is. And I’d still win the apple race, if I entered. Which I don’t. But I would.'],
    choice: [
      { k: 'believe', label: 'I believe you', t: 'I know. I could tell you would. That’s why I said it.' },
      { k: 'thanks', label: 'Thank you for telling me', t: 'Don’t thank me. I didn’t do it for you. Well. A bit for you. Mostly for me. That’s allowed.' }],
    set: { 'quince.told': 1 },
    sit: 'You sit. The bees go about their business around you both. “They like you,” she says. “That’s practically a hug.”' },
  { id: 'him', who: 'quince', when: { after: 'hollin.truth', flag: { 'hollin.told': true }, days: 3, home: 1 }, lines: [
    'You’ve been to the hut. I can tell. You’ve got that face.',
    'Yes. Him. I know he’s there. I’ve known for years. I don’t want anything from him. Not sorry. Not anything. I want the woods back.',
    { t: 'You sat with him, I expect. You’re allowed. I’m not your conscience. I’m a hare with a lot of bees.', flag: { 'hollin.view': 'listen' } },
    { t: 'You asked him why, I expect. Everyone wants a why. I stopped wanting one about twenty years ago. It was the best year I’ve had.', flag: { 'hollin.view': 'ask' } },
    { t: 'You told him off, didn’t you. Don’t tell me what you said. I don’t need shouting done for me. I can shout. I just don’t want to spend a shout on him.', flag: { 'hollin.view': 'condemn' } },
    { t: 'You walked off. I can see it on you. Don’t do it on my account. Do it on yours, if you do it.', flag: { 'hollin.view': 'leave' } },
    'That’s all. That’s all there is about him, from me. Now. Honey. I’ve too much of it. Take a jar or I’ll be cross.'], give: { honey: 1 } },
  /* if you asked her about the stall */
  { id: 'notvote', who: 'quince', free: 1, when: { flag: { 'hollin.stall': 'asked' }, home: 1 }, lines: [
    'Bramble sent you up the stair to ask me about a stall. Didn’t Bramble. Or you came on your own. That’s worse. That’s kind.',
    'Don’t make me the vote. I’ve been the reason for enough. I decided what happens to me, years ago, and I’m still deciding it, every morning. What happens to him, that’s the vale’s. Not mine.',
    'I’ll be selling honey either way. Thursdays and Saturdays. He’ll know that already, I expect. Off you go. Mind the stair. Two hundred and twelve today.'] },
  /* after the stall was decided */
  { id: 'stallheard', who: 'quince', when: { after: 'hollin.stall', days: 2, flag: { 'hollin.stall': true }, home: 1 }, lines: [
    { t: 'Bramble says he asked which days I sell. So he could be somewhere else on them.', flag: { 'hollin.stall': 'yes' } },
    { t: 'I don’t know what to do with that. I don’t have to do anything with it. That’s the best thing anyone ever told me: I don’t have to do anything with things.', flag: { 'hollin.stall': 'yes' } },
    { t: 'Bramble came up to tell me he’s not to have a stall. Like it was a present. It isn’t a present. It isn’t anything to do with me.', flag: { 'hollin.stall': 'no' } },
    { t: 'I gave Bramble honey anyway. Bramble meant well. Bramble always means well, very loudly.', flag: { 'hollin.stall': 'no' } },
    'Now. I’ve a new saying. “When the swallows fly low, sit down and have a cake.” Not weather, really. Just good advice.'] },
  /* the bell: hers alone, on the fair's evening */
  { id: 'bell', who: 'quince', when: { after: 'quince.fair', days: 4, home: 1 }, lines: [
    'You heard it? You did. Everyone did. They heard it at the pier.',
    'The fair was on, down in the square. I didn’t go down. I went up to the top terrace and rang the orchard bell. Nobody’s rung it since I was a girl.',
    'The whole fair stopped and looked up the hill. I let them look. Then I rang it again.',
    'My arm’s killing me. It was very loud. Good.',
    'I still won’t go to the fair. Next year, I say. I say that every year. One year I’ll mean it.'],
    set: { 'quince.bell': 1 },
    sit: 'You sit on the terrace wall. Down below the fair starts up again, music and voices. She hums along, flat, and doesn’t stop.' },
  /* the walk to the ruined arch: for herself, not towards him */
  { id: 'walk', who: 'quince', when: { heart: 4, after: 'quince.bell', days: 3, dry: 1, tod: ['day'], home: 1 }, lines: [
    'Walk with me? Not far. I want to go and look at the ruined arch. Just look.',
    'You go down the stair with her, through the valley and the woodland lanes. She talks the whole way: grafting, the cat, Pip’s heron joke, a woman at the market who bought eleven jars and returned ten.',
    'At the arch she stops. The yews are dark beyond it. A bee came with you from the orchard. It hovers at the stones, and goes back.',
    'That’s far enough today. It’s further than last year. Last year it was the bottom of the stair.',
    'Sensible bee. Come on. I’ll race you up. I’ll win.'],
    set: { 'quince.walked': 1 } },
  /* the harvest supper: she comes. He never does, wherever his place is. */
  { id: 'feast', who: 'quince', when: { after: 'hollin.feast', days: 1, home: 1 }, lines: [
    'I went to a supper. On the green. In front of people. That’s the news. Write it down somewhere.',
    { t: 'Someone laid him a place, at the far end. He wasn’t in it. I knew he wouldn’t be. I don’t know which of those I mind more, the plate or the knowing.', flag: { 'hollin.feast': 'yes' } },
    { t: 'There was no place for him. I didn’t ask who decided. I didn’t want to owe anybody for it.', flag: { 'hollin.feast': 'no' } },
    'Thistle passed me the bread before I asked for it. Pip told the heron joke and it had an end this time. I won the apple bob. I’m not apologising.'],
    sit: 'You sit with her on the bench by the terrace steps. The lanterns are still up on the green. She counts them, gets thirty-one, counts again, gets thirty-one. “Same twice,” she says. “Look at that.”' },
  /* after the hut is empty: the brook */
  { id: 'brook', who: 'quince', when: { after: 'hollin.gone', days: 5, home: 1, deep: 1 }, lines: [
    'I know the hut’s empty. Nobody told me. Nobody had to. The woods sound different from up here. Like a room after a clock’s stopped.',
    'I went down. All the way. Past the arch, on my own. I didn’t go near the hut. I went to the brook.',
    'There’s a quince by the brook now. I planted it. Little thing, on a stick. I dug the hole with my hands because I forgot a spade, which tells you how much I’d planned it.',
    'Don’t ask me what it means. I haven’t decided. I might never. It’s a tree. It’ll fruit in four years. I’ll have decided by then, or I won’t, and there’ll still be fruit.'],
    set: { 'quince-woods.brook': 1 },
    sit: 'You sit with her in the square. She smells of earth and brook water. She doesn’t count anything at all.' },
  { id: 'bees', who: 'place', near: ['ld-ruined-arch', 'ld-labyrinth', 'ruin-court'], when: { after: 'quince-woods.brook', season: ['spring', 'summer'], days: 3, deep: 1 }, lines: [
    'A bee goes past the ruined arch, into the old woodland. Then another. They go towards the brook, and the young tree there.'],
    set: { 'quince-woods.bees': 1 } },
] });

// Quince's own arc (94-garden-wonder-1tales2-quince.js) tells the arch, the fair and the bell; this one keeps only her side of the woods.
// (the apple race and the walk to the arch are hers too: quince.race and quince.far)
{ const s = WD_TALE_BY.get('quince-woods'); if (s) s.steps = s.steps.filter(b => !['arch', 'fair', 'bell', 'apples', 'walk'].includes(b.id)); }
wdTaleKeep({ id: 'carved-wren', name: 'A carved wren', text: 'Lime wood, from Hollin. It looks like a wren that’s had a hard week. Keep it out of the wet.' });
wdTaleKeep({ id: 'carved-bird', name: 'Your first carving', text: 'A bird, or a fish, carved at Hollin’s step. Everyone’s first is a bird, he says.' });
wdTaleKeep({ id: 'netting-needle', name: 'A yew netting needle', text: 'Hollin’s. Someone’s father’s. You can mend your own nets now.' });
// the rope for the pass: his
wdTaleBeat('hollin', { id: 'rope', who: 'hollin', free: 1, when: { heart: 2, item: 'rope', home: 1, deep: 1 }, lines: [
  'That rope on the orchard wall. Mine. Good hemp. You needed it for the pass, the owl said, so I gave it him.',
  'He took it up. I don’t go up there. I’ll go as far as the wall in my head and no further, and I don’t go as far as the wall.'] });
// the mill's reopening supper and the angler's toast: the main line, after Act VII
[{ id: 'supper', who: 'bramble', when: { after: 'mill.letters', days: 2, home: 1 }, lines: [
  'The reopening supper. Here, in the mill yard, under the wheel. I’m doing the seating plan. On a map, obviously.',
  'Everyone’s coming. Even Tam is coming up. Quince says she’s sorry, it’s swarm week, but she’s sending a cake shaped like the wheel. It has eleven spokes. I’ve not said.',
  'Pip wants a place for Hollin. He carved the cog. Without the cog there’s no wheel, and without the wheel there’s no supper. Pip’s logic. It’s not bad logic.',
  { t: 'You know what I think of him. You might know why, by now. Or you might not.', soft: '' },
  'You mended it, more or less. Your call. Do we lay Hollin a place?'],
  choice: [
    { k: 'yes', label: 'Lay him a place', set: { 'mill.seat': 'yes' }, t: 'Far end. Pencil. There.' },
    { k: 'no', label: 'Don’t', set: { 'mill.seat': 'no' }, t: 'Right. I’ll not, then.' },
    { k: 'apart', label: 'It’s not mine to say', set: { 'mill.seat': 'apart' }, t: 'Isn’t it? Hm. Then I’ll do what the vale always does. A stool by the trees. Watch.' }] },
{ id: 'toast', who: 'angler', when: { after: 'mill.supper', days: 1 }, lines: [
  'Some supper. I came. Sat with my face to the wheel, all night. Haven’t done that in forty years.',
  /* what happened about the seat */
  { t: 'Bramble laid Hollin a place at the far end. He came. Sat with his cap on his knee, drank one cup of tea, and was gone before the speeches. Pip passed him the sugar. That was the whole of it.', flag: { 'mill.seat': 'yes' } },
  { t: 'Thistle moved her chair up a bit when he sat down. She didn’t make a show of it. She didn’t have to.', flag: { 'mill.seat': 'yes', 'hollin.told': true }, soft: '' },
  { t: 'No place for Hollin. He stood at the back by the trees, the way he does, and listened to the wheel. When the speeches started he’d gone.', flag: { 'mill.seat': 'no' } },
  { t: 'Bramble couldn’t decide, so Bramble put a chair by the trees. Not at the table. Not not at it. Hollin sat on it a while. That’s the vale for you.', flag: { 'mill.seat': 'apart' } },
  /* the toast, coloured by what you know and what you said */
  { t: 'They made me stand up. I said thank you for the wheel. I said Hollin carved the cog. He went red to the ears. Good hands. Never says much. Nor do I.', noflag: ['hollin.told', 'hollin.wrong'] },
  { t: 'They made me stand up. I said thank you for the wheel, and I said Hollin carved the cog. There’s a thing about him you’ve not been told. It isn’t mine to tell. Ask him, or don’t.', flag: { 'hollin.wrong': true }, noflag: ['hollin.told'], soft: '' },
  { t: 'They made me stand up. I said thank you for the wheel, and I said Hollin carved the cog, because he did. I didn’t say anything else about him. I know what he did. You know too. I can’t forgive myself, and it turns out I can’t do it for him either. It isn’t mine.', flag: { 'hollin.told': true }, soft: '' },
  { t: 'He told me Thursday you’d said your piece to him. Didn’t say what. Said you were right. So I raised my cup to the wheel, and not to who carved it. I don’t know if that was right either.', flag: { 'hollin.view': 'condemn' }, soft: '' },
  { t: 'He said Thursday you don’t come down his way now. I didn’t ask why. We don’t ask. That’s how it’s always worked. I wonder now if it should have.', flag: { 'hollin.view': 'leave' }, soft: '' },
  /* the truth about the mill he kept */
  { t: 'He saw her on the island that evening. He told you, I know. Forty years he kept it, because I asked him. I don’t know what to do with a kindness from a man like him. I take it. I don’t thank him for it. Both, every Thursday.', flag: { 'hollin.island': true, 'hollin.told': true }, soft: '' },
  { t: 'He saw her on the island that evening. He told you, I know. Forty years he kept it, because I asked. Whatever else he is, and he’ll tell you himself one day, he kept that.', flag: { 'hollin.island': true }, noflag: ['hollin.told'], soft: '' },
  'Quince’s cake had eleven spokes. The wheel has twelve. Nobody said. It was the best cake I ever had.'],
  sit: 'You sit on the pier with him. Across the water, the wheel hums. He faces it.' }].forEach(b => wdTaleBeat('mill', b));
