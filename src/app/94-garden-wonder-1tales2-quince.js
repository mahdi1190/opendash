/* ============================================================
   GARDEN WONDER, stories: Quince, “Telling the bees” (drafted in C:/tmp/stories/quince.md; wired by the story lead; format: docs/dev/STORIES.md).
   Loads after 94-garden-wonder-1tales.js (the main line), so it can add beats to it.
   ============================================================ */
/* The stair count for today’s lines: 201 to 214, by day, never 209 (that number is Act VI’s: “He always got two hundred and nine”). */
const _wqStair = (F) => { const n = 201 + gardenHash('stair|' + _wdToday()) % 14; return n === 209 ? 211 : n; };
/* The cider fair (decided 12 Nov): the last Saturday of the first month of autumn (September in the north, March in the south). The poster goes up on the first day
   of the last month of summer and comes down after the fair, so it is up for seven or eight weeks a year. A calendar of festivals (wdFairDay) wins when there is one. */
function _wqFairDate(today) {
  const y = Number(String(today).slice(0, 4)), south = typeof _gdSouth === 'function' && _gdSouth(), mon = south ? 2 : 8;
  const last = new Date(Date.UTC(y, mon + 1, 0)), back = (last.getUTCDay() + 1) % 7;   // back to Saturday
  return new Date(Date.UTC(y, mon + 1, -back)).toISOString().slice(0, 10);
}
const _wqPoster = (m) => { try { if (typeof wdFairPoster === 'function') return wdFairPoster(m, 'cider'); const f = _wqFairDate(m.today), d = _wdDaysBetween(m.today, f); return d >= 0 && m.today >= f.slice(0, 5) + String(Number(f.slice(5, 7)) - 1).padStart(2, '0') + '-01'; } catch (e) { return false; } };
const _wqFairDay = (m) => { try { return typeof wdFairDay === 'function' ? wdFairDay(m, 'cider') : m.today === _wqFairDate(m.today); } catch (e) { return false; } };
const _wqGentle = () => !_wtDeep();

/* ---------- Quince: Telling the bees (STORY_BIBLE §3 and Act VI; C:/tmp/stories/quince.md) ----------
   gentle: 'soft'. In the gentle telling there is no man and no assault: at nineteen she fell out with her mother at the fair, over a “hush”, and hasn’t been back since.
   Hollin’s thread (the echo beats) is full telling only. */
wdTaleAdd({ id: 'quince', kind: 'arc', title: 'Telling the bees', journal: 'Quince, the cider fair, and what she told the bees.', gentle: 'soft', steps: [

  // 1. nodding terms: counting the stair together. The running joke, made into a game with no right answer.
  { id: 'count', who: 'quince', when: { heart: 1, dry: 1, open: [4] }, lines: [
    'You’re on the stair! Stop. Don’t move. We’re counting. Everyone who comes up gets counted. I mean the steps get counted. You get a biscuit.',
    'Right. From the bottom. One, two, three, mind the wobbly one, four...',
    'There. What did you get?'],
    choice: [
      { k: '212', label: 'Two hundred and twelve', t: 'Two hundred and twelve! That’s what I got on the way up, once. Never again. You’re lucky. Or it’s the biscuit.' },
      { k: '213', label: 'Two hundred and thirteen', t: 'Thirteen! That’s a new one. The stair likes you. It’s grown a step to make you welcome.' },
      { k: 'lost', label: 'I lost count', t: 'Everybody loses count. I lose count every day. That’s why I count. Have a jar of honey, it helps.' }],
    give: { honey: 1 },
    note: 'In the open: [4] build the stair is the Orchard stair; a player who meets her before the orchard opens hears this from the bottom of it, which is fine (“you get counted on the way up, when it’s open”).' },

  // 2. friends: the first wrong note. Small, unexplained, followed by weather.
  { id: 'arch', who: 'quince', when: { heart: 2 }, lines: [
    { t: 'Bees don’t go past the ruined arch in the old woodland. Neither do I. No reason. Lovely weather, isn’t it.',
      soft: 'Bees don’t go past the ruined arch in the old woodland. Too shady. Neither do I. I like to see the sky. Lovely weather, isn’t it.' },
    'Red sky at noon, the bees want a tune. Made up. Hum something. Go on. See, they’ve all turned round.'] },

  // 3. good friends: who she was before. The fuller life: the loudest girl in the orchard. Nothing heavy in it.
  { id: 'race', who: 'quince', when: { heart: 3, season: ['summer', 'autumn'], dry: 1, home: 1 }, lines: [
    'Have I told you about the apple race? You roll an apple down the orchard stair and run after it, and the first one to the bottom with an apple still in one piece wins.',
    'I won it every year I entered. Every year. I was the loudest girl in this orchard. You could hear me at the Mere. I poured the cider at the fair, too. Never spilt a drop. Spilt a lot on purpose, on boys I didn’t like.',
    'Go on. Roll one. Not down the stair, you’ll lose it. Across the square. There. That’s a terrible roll. I love it.',
    'I don’t enter any more. Retired undefeated. That’s the only way to retire.'],
    give: { seed: 1 },
    sit: 'You sit on the barrels and watch the apple wobble to a stop by the well. Quince laughs, the big laugh, and three bees and a wasp turn round to look.',
    note: 'seed: 1 means one seed of the season (_wkSeed). Proposed fun later: a real apple race on fair days (FUN_PLAN: festival stalls).' },

  // 4. old friends, after Act VI: the opening-up. Her home, dawn or morning, dry, the poster up. Written in full in quince.md §5.
  { id: 'fair', who: 'quince', heavy: 1, when: { heart: 4, after: 'mill.bees', days: 2, tod: ['dawn', 'day'], dry: 1, home: 1, test: _wqPoster }, lines: [
    'Dawn in the cider square. The bees aren’t up. Someone has pinned a new poster to the post by the barrels: CIDER FAIR, ON THE GREEN. APPLE RACE. BRING A JUG.',
    'Quince is standing in front of it with a basket of windfalls, not moving. You have never seen her not moving.',
    '“I always go quiet when that goes up. You’ve noticed. You notice things. It’s very annoying.”',
    '“Sit down. No, there. The barrel with the good lid.”',
    { t: '“When I was nineteen, at the cider fair, a man raped me. I’ve said it now. That’s the word for it, and I’m done being polite about it.”',
      soft: '“When I was nineteen, my mother and I fell out at the cider fair. Over nothing. Over everything, the way it is at nineteen. I said something true, in front of the whole green, and she said hush.”' },
    { t: '“That’s all I’m saying about the night. It’s the least interesting thing about me, and it doesn’t get the whole morning.”', soft: '' },
    { t: '“I told my mother. She said hush. Not unkindly. Hush, the way you’d say it to a kettle. So I came up here and I told the bees. You tell bees everything, the old way, or they leave you. They didn’t say hush. They listened, and buzzed, and went on making honey. And I thought: right. That’s how it’s done, then.”',
      soft: '“Not unkindly. Hush, the way you’d say it to a kettle. So I came up here and I told the bees. You tell bees everything, the old way, or they leave you. They didn’t say hush. They listened, and buzzed, and went on making honey.”' },
    { t: '“Thistle believed me. First go. No questions. I’ve never forgotten it. I bring her honey every week, and she thinks it’s because I’ve too much honey.”',
      soft: '“Thistle came up the stair that night with soup. No questions. I bring her honey every week, and she thinks it’s because I’ve too much honey.”' },
    { t: '“The counting. The stair. You thought it was a joke. It is a joke. It’s also how I keep my feet on things, on bad days. Two hundred and something. If I’m counting, I’m here.”',
      soft: '“I haven’t been down to the fair since. Forty years, over a hush. Silly, isn’t it.”' },
    '“And I’d still win the apple race, if I entered. Which I don’t. But I would. Write that down somewhere.”',
    '“Now. These windfalls. The wasps’ll have them if we don’t. Grab the other handle.”'],
    choice: [
      { k: 'believe', label: 'I believe you', softLabel: 'It isn’t silly',
        t: { t: '“I know. I could tell you would. That’s why I said it.”', soft: '“No. I suppose it isn’t. Thank you.”' } },
      { k: 'thanks', label: 'Thank you for telling me',
        t: { t: '“Don’t thank me. Thank the bees. They’ve been practising me for forty years.”', soft: '“Don’t thank me. Thank the bees. They’ve heard it so often they could tell you themselves.”' } }],
    set: { 'quince.told': 1 },
    sit: 'You sit. The bees go about their business around you both. “They like you,” she says. “That’s practically a hug.”' },

  // 5. the morning after: ordinary, on purpose. She won’t be tiptoed round.
  { id: 'windfalls', who: 'quince', when: { after: 'quince.fair', days: 1, home: 1 }, lines: [
    'Morning! Wasp war. Grab a basket. We’re outnumbered and they’re drunk.',
    'Don’t tiptoe round me. I’m a hare. We hear tiptoeing from three fields off. It’s worse than stamping.',
    { t: 'I’m glad I said it. I’m not going to say it again. Those are both true, and they don’t argue.', soft: 'I went on a bit yesterday. Fair poster always does it. Now: wasps.' },
    'That one. Behind you. No, the other behind you. Got it! Well done. Pip would have shouted. You were very dignified. I hated it.'],
    sit: 'You fill two baskets. She hums. The wasps lose, eventually, and go to sulk on Bramble.' },

  // 6. her mother’s recipe, and the note on it. The vale’s question at her own weight: she chose to forgive her mother, and says it was her choice, not her mother’s due.
  { id: 'recipe', who: 'quince', when: { after: 'quince.windfalls', days: 4, home: 1 }, lines: [
    'I found my mother’s cider recipe. In the tin with the buttons. I knew it was there. I hadn’t looked.',
    'There’s a note on the back, in her writing. Small. “Hush was for me, not for you. I was frightened. I’m sorry. Mum.”',
    { t: 'I found it the winter after she died. I sat on the stair with it for a long time. I counted. I got every number there is.', soft: 'I found it the winter after she died. I sat on the stair with it for a long time and counted, and got every number there is.' },
    { t: 'I forgave her. Took me twenty years. I don’t think she was owed it. I wanted to, that’s all. That was mine to do, so I did it.',
      soft: 'I forgave her. Took me twenty years, which is silly for a hush. I wanted to, that’s all. That was mine to do, so I did it.' },
    'Here. I’ve copied it out for you. It’s a good recipe. She was better at cider than at saying things. Most people are.'],
    give: { 'recipe:quince-cider': 1, honey: 1 },
    note: 'This is the bible’s next-20 #16, “The cider recipe”, folded into the arc. If there is no recipe item, it goes in the Field Journal as a page (“Quince’s mother’s cider”) and gives 1 honey.' },

  // 7. what heals: the bell. She rings it on fair day from the orchard, which she has never done. She still doesn’t go down.
  { id: 'bell', who: 'quince', when: { after: 'quince.recipe', days: 2, tod: ['dawn', 'day'], weekday: 6, home: 1, test: _wqFairDay }, lines: [
    'Fair day. You can hear the green from up here: the band tuning, Pip shouting, somebody’s goose.',
    'Quince is standing under the orchard bell with the rope in both hands. It’s rung for the start of the fair since before the mill. Nobody up here has rung it in forty years. They ring a handbell down on the green instead, and everyone pretends it’s the same.',
    '“I’ve never rung it. Not once. My mother did, and her mother.” She looks at the rope. “Right.”',
    'She rings it. It is very loud. It goes out over the terraces and down the stair and across the Mere, and down on the green, for a second, everything goes quiet.',
    'Then a cheer comes up the hill, faint and silly, and the band starts, and Quince laughs the big laugh and has to sit down on the steps.',
    '“I’m not going down. Next year. I say that every year.” She rubs her arm. “One year I’ll mean it.”',
    'Later, Pip comes up the stair at a run with a toffee apple, “from the fair, for the bell-ringer”. Quince gives you half. It is mostly stick.'],
    give: { 'food:toffee-apple': 1 },
    sit: 'You sit on the top step together and listen to the fair. She counts the stair under her breath. She gets two hundred and twelve, and doesn’t check.',
    note: 'Needs an orchard bell in the cider square (new anchor ld-bell). The bible: “She rings the orchard bell at the next fair, which she has never done.” Without a toffee apple item, 1 honey.' },

  // 8. the ruined arch, for herself. Not to him: to the arch, and twelve steps through it. She chooses where to stop.
  { id: 'far', who: 'place', near: ['ld-ruined-arch', 'ruin-court'], r: 4, when: { after: 'quince.bell', days: 3, tod: ['dawn', 'day'], dry: 1, open: [3] }, lines: [
    'Quince is waiting at the ruined arch, with a bee on her hat. She came the long way, down the stair and round the Mere and up through the woods. She looks as if she has walked a hundred miles, and also as if she’s fine.',
    { t: '“Bees don’t go past here. Neither do I. I’ve been not going past here for forty years. It’s a lot of not going.”',
      soft: '“Bees don’t go past here. Neither do I. Too shady, I always said. I’ve been saying it so long I can’t remember if it’s true.”' },
    '“I’m going to walk through it. Not far. Just through. You stand there. No, there. Where I can see you.”',
    'She walks through the arch. She counts out loud. “One. Two. Three.” The bee stays on her hat. “Seven. Eight.” She stops at twelve, under a yew, and looks around at the old woodland, the way you look at a room you used to know.',
    { t: '“Twelve. That’ll do. That’s twelve more than last year.” She walks back. She doesn’t hurry. “It’s just woods. They were always just woods. They don’t get to be anything else.”',
      soft: '“Twelve. That’ll do. That’s twelve more than last year.” She walks back, slowly. “It’s lovely in there, actually. Don’t tell anyone. I’ve got a reputation.”' },
    'On the way back, the bee on her hat flies off through the arch, on its own, and doesn’t come back. Quince watches it go. “Well,” she says. “Cheek.”'],
    set: { 'quince.far': 1 },
    sit: 'You sit on the fallen stones by the arch for a while. She tells you a weather saying about yews that she is clearly making up as she goes. It has eleven verses.',
    note: 'A place beat; it needs Quince drawn at the arch (§9). Not heavy, but tender: no care note, and it never comes on the day of a heavy beat. It never goes as far as the hut: the hut is off the ruins circuit, out of sight of the arch.' },
] });

/* Quince’s echoes: free beats, coloured by Hollin’s arc. Full telling only, except tree-g, the gentle twin of the ending. */
wdTaleAdd({ id: 'quince-echo', kind: 'arc', title: 'The woods back', journal: 'What Quince wants, and what she doesn’t.', gentle: 'skip', steps: [

  // shipped already (94-garden-wonder-1tales.js: quince.him), moved here unchanged except for a line about the rope. Keep the id if moving it breaks saves; else leave it where it is.
  { id: 'him', who: 'quince', free: 1, when: { flag: { 'hollin.told': true }, days: 3, deep: 1, home: 1 }, lines: [
    'You’ve been to the hut. I can tell. You’ve got that face.',
    'I know he’s there. I’ve known for years. I don’t want anything from him. Not sorry. Not anything. I want the woods back.',
    'That rope on my wall, by the barrels. Wick thinks I don’t know whose it was. I knew the day it turned up. It was a good rope. You used it. That’s all it gets from me.',
    'That’s all. Now. Honey. I’ve too much of it. Take a jar or I’ll be cross.'], give: { honey: 1 } },

  // the vale’s choice never overrides hers (bible §0). Proposed hollin.seat values: 'set', 'none'; hollin.stall, hollin.supper likewise if those stories come.
  { id: 'vote', who: 'quince', free: 1, when: { flag: { 'hollin.seat': true }, after: 'quince.fair', days: 2, deep: 1, home: 1 }, lines: [
    { t: 'They set a place for him at the mill supper, Thistle says. At the far end. Fine. That’s the vale’s business.', flag: { 'hollin.seat': 'set' } },
    { t: 'No place for him at the mill supper, Thistle says. People keep looking at me like I won something. I didn’t. I wasn’t even there.', flag: { 'hollin.seat': 'none' } },
    'They can vote on the mill. They can’t vote on me. He’s not at my orchard, whatever they decide down there, and nobody gets to ask me to be gracious about it.',
    'Right. That’s that. The Pearmain’s got canker and I’m furious with it. Come and be furious with me. It’s good for you.'] },

  // the ending, once the hut is empty (bible: “the walk into the woods herself, where she plants a quince by the brook. She doesn’t say what it means.”)
  { id: 'tree', who: 'quince', free: 1, when: { flag: { 'hollin.gone': true }, after: 'quince.far', days: 2, season: ['spring'], dry: 1, deep: 1, home: 1 }, lines: [
    'Quince has a quince sapling in a pot, wrapped in sacking, and a spade over her shoulder. “Coming? You don’t have to. You should.”',
    'She walks through the ruined arch without counting. Down past the yews, to the brook, where the bank is soft and gets the morning sun.',
    'She digs. She won’t let you help with the digging. She lets you hold the pot, which she says is the important job, which it isn’t.',
    'She plants the quince by the brook, and treads it in, and stands back.',
    'She doesn’t say what it means. You don’t ask. A bee comes, and looks at it, and stays.',
    '“There,” she says. “Now there’s something of mine down here.” And then, on the way back: “It’ll fruit in four years. Quinces are slow. I’m not. I’ll wait anyway.”'],
    set: { 'quince.tree': 1 },
    sit: 'You sit on the bank by the little tree. The brook goes past. Quince counts nothing at all. After a while she says, “Hungry,” and you go home.',
    note: 'Where: the brook just past the ruined arch (an anchor on the old woodland side, proposed ld-quince; until then ld-bridge or the woodland pond). Not at the hut, and not in sight of it. A small quince tree grows there afterwards, for good (a world prop that appears when quince.tree is set), and in four in-game years it fruits.' },

  // the gentle twin: no Hollin, no empty hut. After the arch, in spring, she plants a quince past it anyway.
  { id: 'tree-g', who: 'quince', free: 1, when: { after: 'quince.far', days: 7, season: ['spring'], dry: 1, test: _wqGentle, home: 1 }, lines: [
    'Quince has a quince sapling in a pot and a spade over her shoulder. “I’m planting it past the arch. Don’t ask why. I don’t know why. It feels right.”',
    'She walks through the ruined arch, counting. She stops counting at twelve and keeps walking anyway, down to the brook.',
    'She plants it on the soft bank in the sun, and treads it in. A bee comes and looks at it, and stays.',
    '“There. Now the bees have somewhere to go on this side. They’ll thank me. They won’t. They’ll hum.”'],
    set: { 'quince.tree': 1 },
    note: 'This beat sits in a gentle: \'skip\' story, so it needs to move to a gentle: \'keep\' twin (e.g. quince-g) to be seen at all. Kept here so the two endings sit side by side.' },
] });

WK_DAY.quince.push(...[
  // weather
  { if: F => F.rain, t: 'Rain. Bees indoors, grumbling. I’m out here, grumbling. We are very alike.' },
  { if: F => F.rain, t: 'Rain on the blossom, honey in the bottle. Made that up just now. Sounds old, doesn’t it? That’s the trick. Say it slowly.' },
  { if: F => F.rain && F.season === 'autumn', t: 'Wet windfalls. The wasps are drunk. I’d be cross if it wasn’t so funny. I’m cross anyway.' },
  { if: F => F.snow, t: 'Snow on the terraces. The trees look like they’ve had a fright. The bees are in their ball. Mustard is in my hat. I’m in a mood.' },
  { if: F => F.snow, t: 'Snow on the stair. I counted the steps by falling down them. Same number as usual. Didn’t help.' },
  { if: F => F.wind /* (new) */, t: 'Windy. When the wind’s from the sea, the bees stay in and write letters. Made up. They might.' },
  { if: F => F.fog /* (new) */, t: 'Fog in the valley and sun up here. I’m above the weather. Literally. Don’t tell Wick, it’s Wick’s job.' },
  // seasons
  { if: F => F.season === 'spring', t: 'Blossom on every tree! Bees off their heads with it. In a good way.' },
  { if: F => F.season === 'spring', t: 'Ne’er cast a clout till the bees come out. That one’s real. I’ve no idea what a clout is.' },
  { if: F => F.season === 'spring', t: 'Pruned the old Pearmain. It looked at me like Mustard does. Trees can hold a grudge. So can I. We get on.' },
  { if: F => F.season === 'summer', t: F => `Hot up the stair today. I counted the steps. ${_wqStair(F)}. They change.` },
  { if: F => F.season === 'summer', t: 'Swarm went off this morning and hung in the plum like a beard. I talked it down. Nicely. It came. Nobody believes me.' },
  { if: F => F.season === 'autumn', t: 'Apples everywhere! Rain of apples. Mind your head. I didn’t, this morning.' },
  { if: F => F.season === 'autumn', t: 'Pressing day. My arms are cider. My hat is cider. Mustard tried some and has been sitting very still ever since.' },
  { if: F => F.season === 'winter', t: 'Bees are asleep in a ball, keeping warm. I tried it with the cat. The cat said no.' },
  { if: F => F.season === 'winter', t: 'Wassail night soon. You sing to the trees so they fruit. I sing to them anyway. They’re used to it.' },
  // the hour
  { if: F => F.tod === 'dawn', t: 'Dawn! Dew on the webs. Bees aren’t up yet. It’s the only quiet hour I get.' },
  { if: F => F.tod === 'day', t: 'Midday. Bees at full tilt. If I stand still they think I’m a tree. I’ve been a tree twice today.' },
  { if: F => F.tod === 'dusk', t: 'Bees coming home, heavy. Like Pip after a picnic. You can hear them landing.' },
  { if: F => F.tod === 'night', t: 'Up late? The hives hum at night. Thinking, I reckon. Mine hums too. That’s just the cider.' },
  // what you did
  { if: F => F.blooms >= 4, t: 'All those flowers! The bees say thank you. Well. They hum. It means thank you.' },
  { if: F => F.blooms >= 8, t: 'My bees have started going to yours instead. Disloyal. I’m charging you for the honey. In compliments.' },
  { if: F => F.newPlant, t: F => `A ${F.newPlant.toLowerCase()}! Bees will be down to look at that. Nosy things.` },
  { if: F => F.newPlant, t: F => `You planted a ${F.newPlant.toLowerCase()}. Plant on a Tuesday, eat on a Sunday. Made up. Plant it anyway.` },
  { if: F => F.ripe >= 2, t: 'You’ve got fruit ready. Pick it, or the wasps will. Wasps don’t say thank you. Wasps don’t say anything nice.' },
  { if: F => F.fishRecent, t: F => `${F.fishRecent}, Pip says. Pip told me with both arms. It’s grown three sizes since the pier.` },
  { if: F => F.bugRecent, t: F => `You netted a ${F.bugRecent.toLowerCase()}! Not a bee, I hope. If it’s a bee, we need to talk.` },
  { if: F => F.away >= 3, t: 'You went away! The bees noticed. They went one way and then the other and then sulked. I didn’t notice at all. Much.' },
  { if: F => F.pet, t: F => `${F.petName} came up the stair! All of it! Mustard has gone to live on the roof in protest.` },
  { if: F => F.friend, t: F => `Your friend ${F.friend} came by. Asked about the bees. I told them everything. You tell bees everything, so I tell people everything about bees. It’s fair.` },
  { if: F => F.stars >= 3, t: 'Wick says you’ve been looking up. Wick says it like it’s a club. It is a club. Wick is the only member, and now you.' },
  { if: F => F.level >= 14, t: 'You’ve got a proper garden now. Big enough for a hive. I’m only saying. I’m saying it twice.' },
  // anytime: the regulars
  { t: 'Rain before seven, fine by eleven. Made it up. Works about half the time, like all of them.' },
  { t: 'Honey’s good this year. I say that every year. It is good every year.' },
  { t: F => `Two hundred and twelve up. ${_wqStair(F)} down. Every time. It’s not the stair, it’s me. It’s probably the stair.` },
  { t: 'A wasp got in the kitchen. We had words. I won. I always win. I’m still shaking.' },
  { t: 'Mustard caught a mouse and brought it to me. Alive. We’re both looking at it. The mouse is winning.' },
  { t: 'Pip came up and did the voices of all the bees. I laughed so hard I had to sit in a barrel. A dry one. Mostly.' },
  { t: 'Wick brought the weather this morning. Said it would be fine. Then it rained. Wick said, “Fine for ducks.” Wick always gets out of it.' },
  { t: 'When the hare runs uphill, the post is late. Made up. True, though. Perpetua’s on her way. Has been since Tuesday.' },
  { t: 'I could still win the apple race. I don’t enter. But I could. I’d like that noted.' },
  { t: 'Lovely to see you. Must dash. I never dash. I’ll stand here and talk about dashing instead.' },
  // after her arc (both tellings)
  { if: F => wdTaleSeen('quince.bell'), t: 'My arm still aches from that bell. Good ache. The kind you earn.' },
  { if: F => wdTaleSeen('quince.bell'), t: 'Next year I’ll go down to the fair. I say that every year. Write it down. Then hide it, so I can’t see it.' },
  { if: F => wdTaleSeen('quince.far'), t: 'Twelve steps past the arch, last time. Thirteen next time. I don’t like thirteen. Fourteen, then.' },
]);   // more of today's lines
// Her side of the woods is told once, in the woodsman's file (quince-woods), so this file's echo of it steps aside.
wdTaleDrop('quince-echo');
// The gentle telling's ending (it was in quince-echo, which the gentle telling skips): after the arch, in spring, she plants a quince past it anyway. Free, so it never holds the arc.
wdTaleBeat('quince', { id: 'tree-g', who: 'quince', free: 1, when: { after: 'quince.far', days: 7, season: ['spring'], dry: 1, test: _wqGentle, home: 1 }, lines: [
  'Quince has a quince sapling in a pot and a spade over her shoulder. “I’m planting it past the arch. Don’t ask why. I don’t know why. It feels right.”',
  'She walks through the ruined arch, counting. She stops counting at twelve and keeps walking anyway, down to the brook.',
  'She plants it on the soft bank in the sun, and treads it in. A bee comes and looks at it, and stays.',
  '“There. Now the bees have somewhere to go on this side. They’ll thank me. They won’t. They’ll hum.”'],
  set: { 'quince.tree': 1 } });
wdTaleRecipe({ id: 'quince-cider', name: 'Quince’s mother’s cider', from: 'copied out by Quince, from the tin with the buttons', text: [
  'Windfalls and pickers, half and half. Sweet ones for the body, sharp ones for the talk.',
  'Mill them, press them, and put the juice in the barrel with the good lid. Leave it alone till the first frost. Leaving it alone is most of the recipe.',
  'Rack it off at midwinter and wassail the trees. Sing, even if you can’t.',
  { t: 'On the back, small: “Hush was for me, not for you. I was frightened. I’m sorry. Mum.”', soft: 'On the back, small: “I should have listened at the fair. I’m sorry. Mum.”' }] });
wdTaleKeep({ id: 'toffee-apple', name: 'Half a toffee apple', text: 'From the fair, for the bell-ringer. Mostly stick. Quince gave you the better half, she says.' });
