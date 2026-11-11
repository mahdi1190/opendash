/* ============================================================
   GARDEN WONDER, stories: Mother Thistle, “The old house” (drafted in C:/tmp/stories/thistle.md; wired by the story lead; format: docs/dev/STORIES.md).
   Loads after 94-garden-wonder-1tales.js (the main line), so it can add beats to it.
   ============================================================ */
/* ---------- Mother Thistle: The old house (STORY_BIBLE §3; C:/tmp/stories/thistle.md) ----------
   gentle: 'soft'. In the gentle telling there is no husband: the old house was a cold, lonely place she left one winter, and the steps become simple kind ones.
   (If the story lead keeps gentle: 'skip', see thistle.md §9: the light steps 1 and 4 then need to move to a 'keep' story.) */
const _wtGentle = () => !_wtDeep();
wdTaleAdd({ id: 'thistle', kind: 'arc', title: 'The old house', journal: 'Mother Thistle, and the door she learned to watch.', gentle: 'soft', steps: [

  // 1. nodding terms: the first bowl. A favour, told as a story: the first time she feeds you.
  { id: 'bowl', who: 'thistle', when: { heart: 1, dry: 1, home: 1 }, lines: [
    'Sit down, dear. No, there, the bench. That end. The other end wobbles. It’s been wobbling since before you were born, and it’s got worse since.',
    'I’m making soup and I’ve run out of herbs. Have you got anything green? Anything. I’ve made soup from less. I’ve made soup from nothing, once. Long story.',
    'There. That’s the first bowl. Everybody who sits on this bench gets one. Even the beetle. Especially the beetle.'],
    give: { fertiliser: 1 },
    note: 'Needs a herb or vegetable in the bag (when.item: a tag, not an id; see §9). Until that exists, she simply gives the bowl. Reward: nettle soup as a dish if the kitchen has it, else the fertiliser.' },

  // 2. friends, after Act II: the first wrong note. Small, unexplained, followed straight away by ordinary life.
  { id: 'jump', who: 'thistle', when: { heart: 2, after: 'mill.brambles', days: 1 }, lines: [
    'A door bangs somewhere in the village, and Mother Thistle jumps clean off the ground.',
    { t: 'Don’t mind me jumping, dear. Old habit. Doors, mostly. And men who shout. Not you. You don’t shout.', soft: 'Don’t mind me jumping, dear. Old habit. Doors, mostly. I lived in a creaky house once. You never stop listening.' },
    'Now. Have you seen the size of Quince’s marrow? She’s put it in the post office window. Bramble’s measuring it. It’s turned into a whole thing.'] },

  // 3. good friends: the opening-up. Her home, dusk, dry. Written in full in thistle.md §5.
  { id: 'door', who: 'thistle', heavy: 1, when: { heart: 3, after: 'thistle.jump', days: 2, tod: ['dusk', 'night'], dry: 1, season: ['spring', 'summer', 'autumn'], home: 1 }, lines: [
    'The frogs are tuning up in the hollow. Mother Thistle is telling you which one is Norman. “That one. Hear him? Flat as a plate. Proud as a bishop.”',
    'Behind you, in the dark of the wood, a branch cracks.',
    'She jumps. Every spine goes up at once. Then she laughs. “Squirrel. A big one. Probably owes somebody money.”',
    { t: 'Then she stops laughing, and doesn’t start again.', soft: 'Then she sits back down, and looks up the hill for a while.' },
    { t: '“I was married once, dear. Up in the old house at the top of the woods. You can see the chimney from the brook, if you know where to look. I don’t look.”',
      soft: '“I lived up at the old house once, dear. At the top of the woods. You can see the chimney from the brook, if you know where to look. I don’t look much.”' },
    { t: '“He was not a kind man. He hurt me. For years. I’m not going to tell you how. It doesn’t need telling. It needed stopping, and in the end I stopped it.”',
      soft: '“Cold old place. Draughty. I was on my own up there a long time, and I didn’t know I was lonely, the way you don’t, until you aren’t.”' },
    { t: '“You learn to watch a door, in a house like that. Which way the latch goes. What a footstep means. ‘I watched it not happen,’ I say, and everybody laughs, and I let them. That’s where it comes from. It’s still funny. Both things are true.”',
      soft: '“You learn to listen to a house like that. Every creak. ‘I watched it not happen,’ I say, and everybody laughs. That’s where it comes from. Years of watching nothing happen, all on my own.”' },
    { t: '“One winter night I took the soup pot. It was on the stove, and I was holding the spoon, so I took it. And I walked. Down through the snow, until the woods were between us. I made soup under this oak with nothing in it but snow and an old onion. Best soup I ever made.”',
      soft: '“One winter night the roof gave up on the back room, and I thought: that’s enough of that. I took the soup pot and walked down here through the snow. I made soup under this oak with nothing in it but snow and an old onion. Best soup I ever made. And there were frogs. And then there were people.”' },
    { t: '“He’s long dead. I never went back. People think the woods hid me. They didn’t. They kept me company. There’s a difference.”', soft: '' },
    { t: '“I’m still here. I’ve got soup, and frogs, and three regulars, and you. That’s the whole of my revenge, and it’s plenty.”',
      soft: '“I never went back. I’ve got soup, and frogs, and three regulars, and you. That’s plenty.”' },
    '“Now. Norman. Listen. There he goes. Every single evening, and every single evening it’s a surprise to him.”'],
    choice: [{ k: 'thanks', label: 'Thank you for telling me',
      t: { t: '“Thank you for listening. That’s rarer than you’d think. Most people want to fix it. It’s been fixed a long time, dear. It just echoes.”', soft: '“Thank you for listening. Most people don’t, with an old hedgehog. They think it’ll be about slugs. It usually is.”' } }],
    set: { 'thistle.told': 1 },
    sit: 'You sit. The frogs start up again. Norman comes in late and flat. After a while she pats your hand. “There. That’s better than talking. Most things are.”' },

  // 4. the morning after: ordinary life, on purpose. She makes it clear nothing has changed, and that it was fine to be told.
  { id: 'morning', who: 'thistle', when: { after: 'thistle.door', days: 1 }, lines: [
    'Morning, dear. Or whatever it is. I’ve been up since the slugs.',
    'Don’t look at me like I’m an egg. I’m a hedgehog. We’re built for it. That’s what the spines are for.',
    { t: 'I’m glad I told you. I don’t want to tell you again. Both of those, please.', soft: 'I went on a bit last night. Old hedgehogs do. You were very patient.' },
    'Now. Tam took my jam once and I forgave Tam on the spot. Practice, I call it. Here. A jar for you. Nobody needs to steal this one.'],
    give: { 'food:bramble-jam': 1 },
    note: 'If there is no jam item, 1 seed of the season (_wkSeed). The jam is a callback to the small story "The jam".' },

  // 5. what doesn’t heal: the raised voice. Pip, overjoyed, at full volume. She asks for quiet, plainly, and Pip gets it at once.
  { id: 'voice', who: 'thistle', when: { after: 'thistle.morning', days: 3, home: 1 }, lines: [
    '“THISTLE! THISTLE! There’s a frog in the mill race the size of a HAT!” Pip comes through the clearing at full volume, dripping.',
    'Mother Thistle goes very still. Not a jump. Just still, the way a pond is.',
    { t: '“Pip, dear. Quieter, please. Not because you’ve done anything wrong. Because I can’t, with shouting. I never could, after the old house, and I don’t think I ever will.”',
      soft: '“Pip, dear. Quieter, please. Not because you’ve done anything wrong. I just can’t, with shouting. Never could. Some people can’t, and I’m some people.”' },
    'Pip stops. Pip goes pink under the fur. Then Pip whispers the whole hat-frog story, start to finish, very fast and very quietly, and Mother Thistle laughs until she has to hold the bench.',
    { t: 'When Pip has gone: “I used to jump and say nothing. Now I say something. That’s the bit that got better. The rest is just how I am.”',
      soft: 'When Pip has gone: “I used to jump and say nothing. Now I say something. Much easier for everybody.”' }],
    set: { 'thistle.voice': 1 } },

  // 6. old friends: the ask. Not today. She needs to know someone would come.
  { id: 'cup', who: 'thistle', when: { heart: 4, after: 'thistle.voice', days: 3, home: 1 }, lines: [
    'I’ve been thinking about my mother’s teacup.',
    { t: 'It’s up at the old house, on the shelf by the window. Blue, with a chip out of the handle the shape of a thumb. I didn’t take it, that night. I took the pot. I was holding the pot.',
      soft: 'It’s up at the old house, on the shelf by the window. Blue, with a chip out of the handle the shape of a thumb. I took the pot and forgot the cup. I was in a hurry to be somewhere warmer.' },
    'Will you walk up there with me, one day? I’d like it back.',
    'Not today. But one day. It helps, knowing someone would come.'],
    sit: 'You sit together a while. She hums something with no tune at all. It might be Norman’s.' },

  // 7a. she picks the day. Daylight only: she will not go up in the dark, and says so, and the game doesn’t argue.
  { id: 'ready', who: 'thistle', when: { after: 'thistle.cup', days: 2, tod: ['dawn', 'day'], dry: 1, season: ['spring', 'summer', 'autumn'], home: 1 }, lines: [
    'Today, dear. Now. Before I think about it.',
    'Up the path past the brook, all the way to the top. You go ahead. I’ll be at the gate. I’m slow uphill. That’s spines for you. Heavy.',
    { t: 'In daylight. I don’t go up there in the dark. I never will, and I don’t need to.', soft: 'In daylight. That house was always cold enough with the sun on it.' }],
    set: { 'thistle.walking': 1 } },

  // 7b. the old house. Said when you reach it. She is at the gate, out of breath, “not waiting”.
  { id: 'house', who: 'place', near: ['ld-oldhouse', 'ld-hollow'], r: 3, heavy: 1, when: { after: 'thistle.ready', tod: ['dawn', 'day'], dry: 1 }, lines: [
    'Mother Thistle is at the gate of the old house, a bit out of breath. “I wasn’t waiting,” she says. She was.',
    'The house is small, and the roof has come down at the back. Moss on the step. A rowan has grown up through the woodshed. It looks like a house that gave up a long time ago.',
    { t: '“It’s smaller than I remember. They always are, aren’t they. He made it feel enormous. It’s just a house. It’s just a cold little house.”',
      soft: '“It’s smaller than I remember. They always are. It’s just a house. A cold little house with a nice view.”' },
    { t: 'She stands at the door a long time. She doesn’t watch it. She just looks at it, like anyone looks at a door.', soft: 'She stands at the door a long time, and pats the frame like it’s an old dog.' }],
    choice: [
      { k: 'in', label: 'Go in with her', t: { t: 'You go in together. She doesn’t look at the rooms. She goes straight to the shelf by the window, and the teacup is there, blue, dusty, the chip on the handle. “Hello,” she says to it. “Sorry I was so long.”', soft: 'You go in together. She goes straight to the shelf by the window, and the teacup is there, blue, dusty, the chip on the handle. “Hello,” she says to it. “Sorry I was so long.”' } },
      { k: 'wait', label: 'Wait at the gate', t: { t: 'You wait at the gate. She goes in on her own, which you think she wanted. She comes out with the teacup held in both hands, blue and dusty, and leaves the door wide open behind her. On purpose. “Let the weather have it,” she says.', soft: 'You wait at the gate. She goes in on her own and comes out with the teacup held in both hands, blue and dusty. She leaves the door open behind her. “Let the weather have it,” she says.' } }],
    set: { 'thistle.gotcup': 1 },
    sit: 'You both sit on the wall by the gate for a bit. The rowan rattles. Far below, very faint, you can hear the frogs. “Norman,” she says. “Flat.” And then: “Home, I think.”',
    note: 'A place beat (§9: place beats need choice and sit, and Thistle shown at the gate). If the engine can’t move her, the first line covers it: she is “at the gate” in the telling.' },

  // 8. what heals: soup in the teacup. Ordinary, small, and the end of the arc.
  { id: 'teacup', who: 'thistle', when: { after: 'thistle.house', days: 1, home: 1 }, lines: [
    'Mother Thistle is ladling soup into a small blue teacup with a chipped handle. It holds four spoonfuls. She has the soup pot right beside her.',
    '“There. Soup in my mother’s cup. She’d have said it was common. She’d have had seconds.”',
    { t: '“The pot stays by the door. Some habits are just sense. But I don’t need to be holding it any more. Not every day.”',
      soft: '“The pot stays by the door. It’s been there forty years. It’d sulk if I moved it.”' },
    '“Everyone who sits on this bench gets a bowl. You’re not a visitor any more, so you get a cup. Your own. Take it home. Put soup in it. Or a frog. Your choice.”'],
    give: { 'decor:odd-teacup': 1 },
    sit: 'You sit and drink your four spoonfuls. They are very good spoonfuls. Norman starts up, and for once she doesn’t say anything about the key he’s in.',
    note: 'decor:odd-teacup is new: a small blue cup, chipped handle, for the garden. If there is no new decor, 1 rare seed (the arc’s only “big” gift, and still small).' },
] });

/* Thistle’s echoes: free beats, so they never hold the arc up. Full telling only: in the gentle telling, Hollin’s thread is not there. */
wdTaleAdd({ id: 'thistle-echo', kind: 'arc', title: 'He can have the woods', journal: 'What Mother Thistle thinks, and doesn’t.', gentle: 'skip', steps: [

  // her view on Hollin. Only after Quince has told you, so Thistle never tells Quince’s story for her.
  { id: 'woods', who: 'thistle', free: 1, when: { heart: 3, after: 'quince.fair', days: 2, deep: 1, home: 1 }, lines: [
    'You’ve been up at the orchard. She told you. I can see it. You’ve got a careful face on. Take it off, dear, it doesn’t suit you.',
    'I was the one she told, after the bees. I believed her. We were girls together. It wasn’t hard. She was telling the truth, and you could see it, like weather.',
    { t: 'The woodcutter. I don’t speak to him. People think I’m being hard. I’m not being anything. I just don’t.', flag: { 'hollin.told': true } },
    { t: 'There’s a man in the old woodland. I don’t speak to him. I won’t say why. It isn’t mine to say.', noflag: ['hollin.told'] },
    'He can have the woods. He can’t have her. That’s all I’ve got to say on it, and I’ve said it.',
    'People ask me if I ever forgave mine. He never asked. Not once. And I’m not going to do his asking for him.'],
    sit: 'You sit. She goes back to shelling peas, a little harder than peas need.' },

  // the mill supper (bible: next 20, #1, “The seat at the mill”). Thistle cooks it. Coloured by hollin.seat; values proposed: 'set' (a place was set for him), 'none'.
  { id: 'supper', who: 'thistle', free: 1, when: { after: 'mill.truth', days: 2, flag: { 'hollin.seat': true }, deep: 1 }, lines: [
    'I did the soup for the mill supper. Forty bowls. Pip had three and said it was “mostly fine”. Pip is barred.',
    { t: 'They set a place for him at the far end. I put my bowl at the other end. I’m allowed. Setting a place is the vale’s business. Where I sit is mine.', flag: { 'hollin.seat': 'set' } },
    { t: 'There was no place for him. Somebody asked me if I was glad. I said I was busy with the soup. That’s true, and it’s all they’re getting.', flag: { 'hollin.seat': 'none' } },
    'Quince didn’t come down. I took her a bowl up the stair after. Two hundred and something steps, with soup. That’s friendship, dear. That’s what it looks like. Wet sleeves.'] },
] });

WK_DAY.thistle.push(...[
  // weather
  { if: F => F.rain, t: 'Rain, dear. The slugs are out in their best. I shall be busy.' },
  { if: F => F.rain, t: 'Wet again. The frogs are thrilled. Norman has been singing since six. Flat, of course. He thinks it’s a style.' },
  { if: F => F.rain && F.tod === 'night', t: 'Listen to it on the leaves. Like soup coming to the boil. Everything reminds me of soup. I’ve stopped apologising.' },
  { if: F => F.snow, t: 'Snow! I ought to be asleep. I got up to look. Don’t tell anyone.' },
  { if: F => F.snow, t: 'I’m not here. I’m under the leaves, fast asleep. You’re dreaming me. Bring a scarf.' },
  { if: F => F.wind /* (new) */, t: 'Windy. All the trees talking at once and none of them listening. Like a parish meeting.' },
  { if: F => F.fog /* (new) */, t: 'Fog in the hollow. I can’t see the frogs, but I can hear Norman. You always can.' },
  // seasons
  { if: F => F.season === 'spring', t: 'Everything is coming up at once. It always does that. It never learns.' },
  { if: F => F.season === 'spring', t: 'Spawn in the brook! Hundreds. I’ve named the first forty. I’ll run out of names before they run out of frogs.' },
  { if: F => F.season === 'spring', t: 'Wild garlic’s out. Garlic soup, garlic stew, garlic on its own for anyone who’s been rude.' },
  { if: F => F.season === 'summer', t: 'Warm evening. The frogs are singing. Well. They think it is singing.' },
  { if: F => F.season === 'summer', t: 'Too hot for soup, they tell me. Nothing is too hot for soup. I made cold soup. Nobody likes cold soup. I’ve proved it.' },
  { if: F => F.season === 'autumn', t: 'Leaves everywhere. Leave them, dear. Somebody small will be glad of them.' },
  { if: F => F.season === 'autumn', t: 'Mushrooms up under the oak. Some for soup, some for looking at, and some for neither. I know which. Ask before you pick.' },
  { if: F => F.season === 'autumn', t: 'I’m eating for two this month. Me, and the me that goes to sleep in November.' },
  { if: F => F.season === 'winter', t: 'Winter. I’m mostly asleep. This is me sleep-talking. Lovely to see you. Don’t tread on the pile.' },
  // the hour
  { if: F => F.tod === 'dawn', t: 'You’re up early. So am I. I haven’t been to bed yet, so it hardly counts.' },
  { if: F => F.tod === 'dawn', t: 'Dawn. The slugs are going home and I’m seeing them off. Somebody has to.' },
  { if: F => F.tod === 'day', t: 'Midday. I’m not a midday person. I’m an evening person who has been woken up by a woodpecker.' },
  { if: F => F.tod === 'dusk', t: 'Dusk. My hour. Everything comes out and I get to see who’s been doing what.' },
  { if: F => F.tod === 'night', t: 'Lovely and dark. You can hear the brook properly at this hour.' },
  { if: F => F.tod === 'night', t: 'Out late, dear? So am I. We’re the same, you and me. Except for the spines. And the slugs.' },
  // what you did
  { if: F => F.newPlant, t: F => `You put in a ${F.newPlant.toLowerCase()}. I had a good sniff. It will do very well.` },
  { if: F => F.newPlant, t: F => `New ${F.newPlant.toLowerCase()}! I shan’t eat it. I might look at it in a soupish way. That’s allowed.` },
  { if: F => F.fishRecent, t: F => `A ${F.fishRecent.toLowerCase()}, I heard. The frogs were very upset. They get over things.` },
  { if: F => F.fishRecent, t: F => `${F.fishRecent}, was it? Fish soup is a soup. I’m only saying. I’m not asking. I’m asking a bit.` },
  { if: F => F.bugRecent, t: F => `You netted a ${F.bugRecent.toLowerCase()}. Let it go somewhere nice, won’t you. Under a leaf. Everyone deserves a leaf.` },
  { if: F => F.ripe >= 2, t: 'Something is ready to pick. I am only saying. I have looked, not touched.' },
  { if: F => F.blooms >= 5, t: 'Your garden smells of honey from here. The bees are queuing. I’ve told them to be patient. They don’t listen. Like Pip.' },
  { if: F => F.away >= 3, t: 'There you are. I kept an eye on the place. Nothing happened. I watched it not happen, very closely.' },
  { if: F => F.away >= 7, t: 'A whole week! I’ve kept your soup warm. It’s gone a bit thick. So would you.' },
  { if: F => F.finds >= 1, t: 'You’ve been digging. Tam says you dig like someone who wants to find something. Tam says that like it’s rude.' },
  { if: F => F.pet, t: F => `${F.petName} came and sat with me. Very good company. Said nothing at all. I said enough for both of us.` },
  { if: F => F.friend, t: F => `Your friend ${F.friend} came by. I gave them soup. They said it was lovely. They’re a good liar. I like that in a guest.` },
  { if: F => F.stars >= 3, t: 'Wick says you’ve been looking at the stars. I prefer frogs. You can’t hear a star sing flat.' },
  { if: F => F.level >= 10, t: 'Your garden’s ever so big now. I could get lost in it. I won’t. But I could.' },
  // anytime: the regulars
  { t: 'I made soup. It was mostly nettles. Nobody complained, which is not the same as liking it.' },
  { t: 'The frogs say hello. They didn’t, but they would if they talked.' },
  { t: 'Soup league table: nettle top again. Mushroom second. Pip’s “river soup” is bottom, and Pip knows why.' },
  { t: 'Norman sang flat all night. I told him. He sang louder. That’s confidence, dear. You can’t teach it.' },
  { t: 'There’s a beetle in my spare bed. He came for one night in June. I haven’t the heart.' },
  { t: 'Somebody asked if I get lonely out here. With all these frogs? I can’t get a word in.' },
  { t: 'I’ve put the kettle on. I haven’t got a kettle. It’s a way of speaking.' },
  { t: 'Quince sent down honey. Wick brought the weather. Tam brought a button. I am very well off for friends and buttons.' },
  { t: 'I watched the sun go down today. It went down. I like a thing you can rely on.' },
  // after her arc (both tellings: nothing heavy in them)
  { if: F => wdTaleSeen('thistle.teacup'), t: 'Soup in the teacup today. It holds four spoonfuls. Exactly the right amount. My mother knew.' },
  { if: F => wdTaleSeen('thistle.teacup'), t: 'I told Norman about the teacup. He sang about it. Flat. It was lovely.' },
  { if: F => wdTaleSeen('thistle.voice'), t: 'Pip’s been whispering all week. Whispering, at Pip’s speed. It’s like being shouted at by a moth.' },
]);   // more of today's lines
