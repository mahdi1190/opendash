/* ============================================================
   PLAYING WITH THE VALE'S FOLK, the words (pure: plain data, nothing called at load). Each villager in their own voice (the story
   bible's section 2): Pip all exclamation marks and off again, Tam deadpan ("It's a feature", "Thought you'd want to know"), Bramble
   and his maps and the wrong corner, Quince counting and her bees and the sayings she made up, the angler's few words.
   Lines are chosen by the day's seed (the same on every device). {at} is the kind's own name for a place ('the sign', 'the well').
   VF3_LINES[villager][game][moment] -> [line]; moments: ask (they come to ask), yes (you said yes), no (not now), go (the start), win
   (they won), lose (you won), found (you found them), memWon / memLost (the next time you talk: you won / they won, last time).
   ============================================================ */
const VF3_LINES = Object.freeze({
  pip: Object.freeze({
    race: Object.freeze({
      ask: ['Race you to {at}! Now! Go! No, wait, not yet. Now!', 'I bet I can get to {at} before you. I bet my whole hat.', 'Race? Race. Race! To {at}! I’ve been sat still for nearly a minute.'],
      yes: ['Yes! Right. Flags. Follow the flags. I put them out. Well, they’re out.', 'Brilliant! Don’t look at me, look at the flags!'],
      no: ['Later, then! I’ll practise. I’ll go and run about somewhere.', 'Oh. All right! I’ll race a leaf. Leaves always lose.'],
      go: ['Go go go!', 'Last one there is a damp sock!'],
      win: ['I won! Did you see? You saw. I’ll tell the heron anyway.', 'First! I’ve never been first at anything. Well. At this, now.'],
      lose: ['You’re fast! How are you that fast? You don’t even have a tail.', 'I stopped to look at a fish. That’s my excuse. It was a good fish.'],
      memWon: ['You beat me in the race! I’ve been practising. I ran to the sea and back. Twice. Once.', 'Rematch? You won last time. I’ve had a big breakfast since.'],
      memLost: ['I beat you in the race! I keep telling people. They keep saying "we know, Pip".', 'Want to race again? I’ll go slower. I won’t. But I’ll think about it.'],
    }),
    seek: Object.freeze({
      ask: ['Hide and seek! You count, we hide! I know the best place. Don’t look where I look.', 'Can we play hide and seek? I’m very good. I always win. Mostly.'],
      yes: ['Eyes shut! Properly shut! No peeping!', 'Count to ten! Slowly! Slower than that!'],
      no: ['All right! I’ll hide anyway. You won’t even know.', 'Later! I’ll find a really good place for later.'],
      found: ['How?! I was so still! I was a stone!', 'You found me! Was it the tail? It’s always the tail.', 'Ha! Again! No. Find the others first!'],
      win: ['Nobody found me! I was right there the whole time! In plain sight! Plainish.'],
      lose: ['You found everyone! You’ve got eyes like a heron. That’s a nice thing. Herons are nice. Mostly.'],
      memWon: ['You found me last time. I’ve found a new place. I’m not saying where. It’s near a tree.'],
      memLost: ['You never found me last time! I was behind the thing! You walked right past!'],
    }),
    stones: Object.freeze({
      ask: ['Skimming! I can do nine. I did nine once. Bet you can’t do nine.', 'The water’s flat as a plate. Let’s skim stones! Flat ones! I’ve got some!'],
      yes: ['Flat ones! Low! Flick it! Like a fish!', 'You first. No, me. No, you. Go on.'],
      no: ['I’ll skim on my own. The fish can watch.', 'Later! I’ll find the flattest stones in the vale. They’ll be ready.'],
      win: ['Mine went all the way! Well, a long way! Further than yours!'],
      lose: ['That was a good one. That was a really good one. Show me how. Don’t show me. I’ll work it out.'],
      memWon: ['You beat me at skimming! I practised. I lost three stones in the river. They’re very flat now. Somewhere.'],
      memLost: ['I won at skimming! Nine skips! It was eight. It felt like nine.'],
    }),
    hunt: Object.freeze({
      found: ['You dug it up! I was digging in the wrong place. A very good wrong place.'],
      win: ['I found more! I was guessing. Guessing counts!'],
      lose: ['You found all the good ones! Next time I’m reading the clues first.'],
    }),
  }),
  quince: Object.freeze({
    seek: Object.freeze({
      ask: ['Hide and seek? I used to be the best in the orchard. Bees told on me, mind.', 'Fancy a game of hide and seek? I’ll count my breaths. Keeps me quiet.'],
      yes: ['Eyes closed, and count. Ten. Not nine. Pip always says nine.', 'Right. Shut your eyes. I’ll know if you don’t. The bees will tell me.'],
      no: ['Another time, then. I’ll be about. Humming, probably.', 'Fair enough. Bees need seeing to anyway.'],
      found: ['Oh, you! I giggled, didn’t I. I always giggle. Since I was six.', 'Found! Was it my ears? It’s always my ears.'],
      win: ['Never found me! I’ve still got it. Whatever it is.'],
      lose: ['Everyone found! You’ve a good eye. My mother had a good eye. Too good.'],
      memWon: ['You found me first last time. I’ve been practising keeping my ears down. It gives me a headache.'],
      memLost: ['You didn’t find me last time! I was right there, counting the stair in my head.'],
    }),
    race: Object.freeze({
      ask: ['I always won the apple race. Years ago. Race you to {at}? Steady does it.', 'Fancy a run to {at}? I don’t cut corners. That’s how I win.'],
      yes: ['Steady, now. Steady wins. Mostly.', 'Count your steps. I count mine. It helps.'],
      no: ['Another day. My knees say another day.', 'Fair enough. I’ll walk it. Walking counts too.'],
      win: ['Steady wins! Every time. Nearly every time.', 'First! Don’t tell Pip. Tell Pip.'],
      lose: ['Too quick for me! You must have bees after you.', 'Beaten fair. I counted. You were faster by about forty steps.'],
      memWon: ['You beat me in the race last time. I’ve been running up the stair. Two hundred and nine. It changes.'],
      memLost: ['I beat you to the finish last time! Steady does it. I told you.'],
    }),
    stones: Object.freeze({
      win: ['Flat stone, flat water, flat out. Made that up just now.'],
      lose: ['Lovely throw. My stones sink. They like it down there.'],
    }),
  }),
  tam: Object.freeze({
    seek: Object.freeze({
      ask: ['Hide and seek. I’ll hide. You won’t find me. Thought you’d want to know.', 'Game of hide and seek? I’m good at it. I’m small and brown and I don’t move.'],
      yes: ['Right. Count. I’ll be somewhere.', 'Eyes shut. I’m already gone.'],
      no: ['Suit yourself. I’ll hide anyway. Nobody will notice. Nobody ever does.', 'Later. I’ll be underground. Not playing. Just there.'],
      found: ['Found me. Took you long enough. It’s a compliment.', 'You found me. Must’ve been the heap. The heap’s a feature.'],
      win: ['Nobody found me. I was there the whole time. I usually am.'],
      lose: ['You found everyone. Even me. That doesn’t happen. Thought you’d want to know.'],
      memWon: ['You found me last time. I’ve dug a better hiding place. It’s under the old one.'],
      memLost: ['You never found me last time. I had a nice sit-down.'],
    }),
    hunt: Object.freeze({
      ask: ['Fancy a treasure hunt? I buried some things. Well, I dug them up. Then I buried them again. For you.', 'Bramble drew a map. I did the digging. Treasure hunt?'],
      yes: ['Clues are on the map. Dig where it says. Not where I’d dig. I dig everywhere.', 'Right. Three things. I know where they are. I’m not saying.'],
      no: ['Suit yourself. They’ll keep. Things keep, underground.', 'Another day. The treasure isn’t going anywhere. It’s treasure.'],
      found: ['You found one. Good hole. Very tidy.', 'That’s one. Your holes are better than mine. I’m not jealous. I’m a bit jealous.'],
      win: ['I found more. I had a head start. I had a head start of being a mole.'],
      lose: ['You found them all. You’d make a good mole. I don’t say that to everyone.'],
      memWon: ['You found all the treasure last time. I buried some more. Deeper. Just to see.'],
      memLost: ['I dug more up than you, last time. It’s not a competition. It is a bit.'],
    }),
  }),
  bramble: Object.freeze({
    hunt: Object.freeze({
      ask: ['I have drawn you a treasure map. Three crosses. One of the corners is wrong, but not the crosses.', 'Treasure hunt? I made the map. Tam did the burying. We disagree about one of the holes.'],
      yes: ['Here is the map. Read the clue, find the place, dig beside it. Mind the wrong corner.', 'Off you go. I shall be here, being right about the map.'],
      no: ['Another day. I shall go over the map in ink.', 'Of course. Maps are patient. That is what I like about them.'],
      found: ['There! Just where I drew it. Well. Near where I drew it.', 'You found one. I shall put a tick on the map. A small one.'],
      win: ['All found! My map was right. Even the corner. No. Not the corner.'],
      lose: ['All found! You read a map better than most. Better than me, some days.'],
      memWon: ['You found every cross on my map last time. I am drawing a harder one. With more corners.'],
      memLost: ['Last time a cross went unfound. I have been wondering if it was the map or the corner.'],
    }),
    race: Object.freeze({
      go: ['Ready... steady... go!'],
    }),
  }),
  angler: Object.freeze({
    stones: Object.freeze({
      ask: ['Flat water. Good for stones. Bet I can beat you.', 'You skim? Go on, then. Three each.'],
      yes: ['Flat ones. Like this. Low.', 'Wrist. Not arm. Wrist.'],
      no: ['Another day, then. The water will be here.', 'Suit yourself. Stones keep.'],
      win: ['Seven. Not bad, for an old man.', 'Forty years of flat stones. That’s all it is.'],
      lose: ['Good throw. Better than mine. Don’t tell anyone.', 'You’ve the knack. Took me years.'],
      memWon: ['Beat me at stones, last time. I’ve been finding flatter ones.'],
      memLost: ['Still got the wrist. Beat you, last time. Again?'],
    }),
  }),
});
/** What the game itself says (no villager): plain, short, friendly. */
const VF3_SAY = Object.freeze({
  play: 'Play',
  pick: 'What shall we play?',
  notNow: 'Not now',
  yes: 'You’re on!',
  leave: 'Leave game',
  again: 'Play again',
  enough: 'That’s enough',
  join: (g) => 'Join in: ' + g,
  ready: ['Ready...', 'Steady...', 'Go!'],
  notHere: (k) => `Not here! There’s ${k} over that way. Come on!`,
  noWhere: 'Nowhere round here for that. Another time!',
  first: 'You won!',
  place: (n) => n === 1 ? 'You came first!' : n === 2 ? 'You came second.' : n === 3 ? 'You came third.' : 'You came ' + n + 'th.',
  tie: 'A draw!',
  left: 'You left the game. No harm done.',
  hostGone: 'The game stopped: your host left it.',
  board: 'Games board',
});
