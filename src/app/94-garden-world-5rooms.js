/* ============================================================
   THE HIDDEN ROOMS, one row each (engine: 94-garden-world-4rooms.js). A room's door is `at`, a row of GARDEN_LAND_SIGHTS or GARDEN_LAND_FEATURES, the world cells tables: move that row and the door goes with it. No position is written here.
   Its reach is the land's: a door you cannot walk to is a door you cannot use. The first five need nothing at all: they stand on land a new garden can already walk to, and all that shows is one more thing to try when you go up to it. Nothing points at them.

     id, at, name, verb (the row in the bubble), say (on the way in), door ('arch', 'ladder', 'plank'), shut(m): why not now, or '', art(): the room, play: a kind in GRM_PLAY, and what that kind needs
     gift: a day's gift through _grGive. Ids are stable: marks and ledger keys are built from them.
   ============================================================ */
const _GRM_Q = _grmA;
const _grmTod = (m, list) => list.includes(m.tod);
function _grmBook(c) { const A = _GRM_Q; return A.r(-34, -74, 68, 74, '#5a3c22') + A.r(-38, -78, 76, 7, '#7a5634') + A.p('M-26 -78L0 -84L26 -78L24 -90L0 -96L-24 -90z', '#f2e6c8') + A.p('M0 -84V-96', c || '#8a7a5a'); }
function _grmCounter(x, y, w, c) { return _GRM_Q.r(x, y, w, 12, c) + _GRM_Q.r(x + 8, y + 12, 10, 392 - y - 12, c, 0.8) + _GRM_Q.r(x + w - 18, y + 12, 10, 392 - y - 12, c, 0.8); }

const GRM_ROOMS = Object.freeze([
  /* ---------- open from the start, and hidden ---------- */
  { id: 'cellar', at: 'ld-sunk', name: 'The drowned cellar', verb: 'Feel for a fourth step', door: 'ladder', say: 'There are three steps. Then, if you keep going, a fourth. Then a cellar nobody has needed for years, with the pool for a ceiling.',
    art() { const A = _GRM_Q; let s = A.shell('#16323c', '#0d2028', '#1e4a58', '#0e2a34') + A.stones(0, 380, '#2a4f5a', 0.42);
      for (const x of [240, 700]) s += A.p(`M${x - 120} 392V150Q${x - 120} 40 ${x} 40Q${x + 120} 40 ${x + 120} 150V392H${x + 84}V170Q${x + 84} 80 ${x} 80Q${x - 84} 80 ${x - 84} 170V392Z`, '#0c1e26', 0.6);
      s += A.r(0, 0, 960, 22, '#7ec8c8', 0.25) + A.r(190, 330, 600, 12, '#3f2c1c') + A.glow(480, 10, 260, 0.2);
      for (let i = 0; i < 18; i++) s += A.s(`M${(i * 131) % 900 + 20} ${410 + (i * 37) % 170}q24 -6 48 0`, '#9ee4e4', 2, 0.28);
      return s; },
    play: 'seek', tip: 'Open this jar', gift: { ticket: 1, 'mat:reed': 1 }, doneLine: 'You have had today’s jar. The water will have moved things by tomorrow.', gotLine: 'Under the wax, dry as the day it was sealed: a bundle of reeds and a ticket someone meant to use. Tomorrow it will be another jar.',
    miss: ['Pickled something. It looks back.', 'Lake water, and one very small fish who would like you to shut the lid.', 'Buttons, all of them odd.', 'A smell of 1911.', 'Sand. Just sand. You check twice.'],
    things: ['#7aa84a', '#c8843a', '#6a8ac8', '#b85a6a', '#d8c060'].map((c, i) => ({ x: 250 + i * 115, y: 330, w: 80, h: 90, art: (open) => _GRM_Q.jar(c, 46 + (i * 17) % 22) + (open ? _GRM_Q.c(0, -74, 7, '#fff4b8', 0.9) : '') })) },

  { id: 'den', at: 'ld-mile', name: 'The measurer’s den', verb: 'Lift the iron ring behind it', door: 'ladder', say: 'Under the milestone, the den of whoever decided this was as far as anyone would measure. Maps on every wall, and a chair still warm, somehow.',
    art() { const A = _GRM_Q; let s = A.shell('#6e5236', '#4a3522', '#7a5e3c', '#4e3a24') + A.planks(0, 392, '#2e1f12', 0.35, 74);
      for (const [x, y, w, h, r] of [[150, 70, 190, 130, -2], [370, 50, 240, 160, 1], [640, 80, 170, 120, 3], [240, 220, 150, 100, 2], [660, 220, 140, 90, -3]]) { s += `<g transform="rotate(${r} ${x} ${y})">` + A.r(x, y, w, h, '#e8dcbc') + A.s(`M${x + 12} ${y + h * 0.7}Q${x + w * 0.3} ${y + 10} ${x + w * 0.55} ${y + h * 0.6}T${x + w - 12} ${y + 22}`, '#6a8a5a', 3) + A.s(`M${x + 20} ${y + 20}L${x + w - 30} ${y + h - 16}`, '#b85a3a', 1.6, 0.7) + A.c(x + w * 0.5, y + 8, 3.5, '#a83a2a') + '</g>'; }
      s += A.s('M800 392L830 250L860 392M830 250V392', '#3a2a18', 5) + A.r(808, 226, 46, 20, '#a88a3a', null, 4) + A.c(854, 236, 7, '#6ab0d8');
      s += A.r(70, 318, 46, 74, '#8a5c32') + A.c(93, 308, 16, '#4a6a3a'); return s; },
    play: 'serial', tip: 'Read the notebook', gift: { 'mat:peg': 1, ticket: 1 }, after: { ticket: 1 }, doneLine: 'One page a day. He was a slow writer.',
    end: { items: { 'mat:peg': 3 }, say: 'Behind the last page, three good pegs, tied with string and a label: “For whoever carries on.”' },
    book: { x: 500, y: 392, art: () => _grmBook('#6a8a5a') },
    pages: ['“Day 1. Started at the stone. Measured to the first tree. It is further than it looks.”', '“Day 2. Measured back. It is nearer than it looks. There is a peg in this book for you. I keep finding them.”', '“Day 3. The lane is longer going home. I have written to someone about this.”', '“Day 4. No reply. A snail has been past. It may have been the reply.”', '“Day 5. There is more land than I was told. It will not stay measured. Pegs help.”', '“Day 6. Moved one hill. On paper. Felt good.”', '“Day 7. The lake is the size it is when you are not looking at it.”', '“Day 8. That is enough for one person. I have put a 0 on both sides of the stone, so nobody can say I got it wrong.”'] },

  { id: 'boatloft', at: 'ld-boathouse', name: 'The boat loft', verb: 'Follow the smell of boats', door: 'plank', say: 'Round the back, up behind the old nets: four hulls hung in the roof, and somebody’s chalk marks on the wall. Each hull has a note in it.',
    art() { const A = _GRM_Q; let s = A.shell('#3a4a54', '#27323a', '#6a5038', '#40301f') + A.planks(0, 392, '#141c22', 0.4, 58);
      for (const x of [70, 300, 530, 760]) s += A.p(`M${x} 66L${x + 70} 0H${x + 80}L${x + 12} 66z`, '#20282e');
      s += A.r(0, 60, 960, 14, '#2a2018') + A.s('M780 120Q840 220 790 340M815 120Q870 240 820 350', '#c8b488', 3, 0.5) + A.r(830, 120, 6, 260, '#a07a4a') + A.e(833, 372, 16, 24, '#c8603a');
      for (let i = 0; i < 9; i++) s += A.r(120 + i * 84, 412 + (i % 3) * 40, 60, 4, '#9ee4e4', 0.14); return s; },
    play: 'tune', tip: 'Knock on the hull', wave: 'triangle', len: 0.85, gift: { 'mat:reed': 1, ticket: 2 }, gotLine: 'The whole loft hums for a moment, and a bundle of reeds slides off a rafter. There is a new tune chalked up every day, and you never see who does it.', missLine: 'That is not the tune on the wall. A swallow gives you a look.', doneLine: 'You know today’s tune now. Play it if you like.',
    things: [['#b8623a', 262, 200], ['#3f7486', 330, 350], ['#d8b24a', 392, 500], ['#6a9a5a', 523, 650]].map(([c, f, x]) => ({ x, y: 240, f, w: 120, h: 150, art: (hot) => _GRM_Q.s('M-44 -120V-62M44 -120V-62', '#c8b488', 2.4) + `<g transform="translate(0 ${hot ? 6 : 0})">` + _GRM_Q.p('M-62 -62H62Q50 -14 0 -8Q-50 -14 -62 -62z', c) + _GRM_Q.p('M-62 -62H62L58 -54H-58z', '#000', 0.25) + '</g>' })),
    chart: { x: 410, y: 300, art(seq, at) { const A = _GRM_Q, C = ['#b8623a', '#3f7486', '#d8b24a', '#6a9a5a']; let s = A.r(-20, -16, 200, 60, '#1a2228', 0.85); (seq || []).forEach((k, i) => { s += A.c(10 + i * 48, 14, 15, C[k], i < at ? 0.25 : 1) + A.s(`M${-4 + i * 48} 14h28`, '#f2ead8', 1.4, 0.5); }); return s; } } },

  { id: 'lampcup', at: 'ld-lamp-a', name: 'The lamplighter’s cupboard', verb: 'Try the small door in the post', door: 'plank', say: 'Somebody still comes and lights it, and this is where they keep the wicks. All on the one wire, which was somebody’s idea of saving money.',
    art() { const A = _GRM_Q; let s = A.shell('#1f2a4a', '#161c34', '#3a3448', '#22202e') + A.planks(0, 392, '#0c1020', 0.5, 90);
      s += A.r(820, 60, 90, 140, '#0a1230') + A.c(868, 112, 15, '#f4eec8') + A.r(860, 60, 6, 140, '#2a2030') + A.r(820, 124, 90, 5, '#2a2030');
      s += A.r(220, 332, 520, 14, '#6e4a2a') + A.s('M260 262H700', '#9a9aa8', 2.4) + A.s('M110 392V110M150 392V110', '#7a5634', 7);
      for (let y = 140; y < 392; y += 42) s += A.r(110, y, 40, 7, '#7a5634');
      for (const x of [800, 845]) s += A.r(x, 342, 30, 50, '#6e7078', null, 4) + A.s(`M${x + 30} 354l18 -14`, '#6e7078', 4); return s; },
    play: 'wicks', tip: 'Touch this wick', gift: { ticket: 2, 'mat:stone': 1 }, gotLine: 'All five, and the whole cupboard goes gold. A stone rolls out from under the shelf, for holding the door, and there is a ticket in the wax.', doneLine: 'All lit. Someone will have snuffed them by tomorrow, and rewired them too.',
    wick: (on) => { const A = _GRM_Q; return A.r(-12, -4, 24, 8, '#c8b488') + A.r(-3, -50, 6, 46, '#efe6cc') + (on ? A.flame(0, -50, 1.1) + A.glow(0, -64, 56, 0.34) : A.s('M0 -52q5 -6 0 -12', '#8a8a8a', 1.6, 0.6)); } },

  { id: 'nowhere', at: 'ld-sign-c', name: 'Nowhere in particular', verb: 'Go the way the blank arm points', door: 'arch', say: 'You walk the way nothing is written, and it works. Mist, and a very old guest book. Everyone who ever got here left a sign pointing home.',
    art() { const A = _GRM_Q; let s = A.shell('#d8dcea', '#c4c0d8', '#cfccd8', '#a8a4bc');
      for (let i = 0; i < 12; i++) s += A.e((i * 173) % 960, 120 + (i * 83) % 260, 130 + (i * 29) % 90, 28 + (i % 3) * 8, '#fff', 0.26);
      return s + A.r(470, 150, 10, 242, '#7a6a58') + `<g transform="rotate(-4 475 170)">` + A.r(400, 160, 150, 28, '#efe6cc') + `<text x="475" y="179" text-anchor="middle" font-size="13" font-weight="700" fill="#5a4a3a">YOU ARE HERE</text></g>`; },
    play: 'grow', tip: 'Sign the book', goal: 7, max: 12, gift: { ticket: 2 }, doneLine: 'You have signed for today. Your sign will still be pointing tomorrow.', end: { items: { 'decor:rw-orn-marker': 1 }, say: 'Seven days, and there is a little way marker by the book with your name on. It is in your bag, for pointing at something at home.' },
    lines: ['You sign the book. A sign you do not remember making goes up beside the post.', 'Your second sign. It points somewhere else. They do that.', 'Three signs. A very faint voice says “Oh, you again”, and it is pleased.', 'Four signs. Someone has signed under you: “Same.”', 'Five signs. The mist is getting used to you.', 'Six signs. There is a chair now. There was not a chair.', 'Seven signs, and somebody has started a little fence.', 'Another sign. You know the way by now.'],
    tend: { x: 700, y: 400, art: () => _GRM_Q.r(-40, -56, 80, 56, '#6e5a44') + _GRM_Q.r(-48, -62, 96, 8, '#8a7458') + _GRM_Q.p('M-30 -62L0 -68L30 -62L28 -72L0 -78L-28 -72z', '#fbf6e6') + _GRM_Q.s('M34 -60L46 -96', '#2a2a3a', 2.4) },
    grown(n) { const A = _GRM_Q, C = ['#b8623a', '#3f7486', '#6a9a5a', '#c8984a', '#8a5a9a', '#c85a6a', '#5a8ab8']; let s = ''; for (let i = 0; i < n; i++) { const x = 170 + (i * 149) % 700, y = 392 + (i % 3) * 8, d = i % 2 ? 1 : -1; s += A.r(x - 3, y - 110, 6, 110, '#7a6a58') + A.p(`M${x} ${y - 104}h${d * 50}l${d * 12} 10l${-d * 12} 10h${-d * 50}z`, C[i % C.length]); } if (n >= 6) s += A.r(620, 340, 40, 8, '#7a5a3a') + A.r(622, 348, 6, 44, '#7a5a3a') + A.r(654, 348, 6, 44, '#7a5a3a') + A.r(620, 296, 8, 50, '#7a5a3a'); return s; } },

  /* ---------- further out, or at the right hour, or with the right thing ---------- */
  { id: 'owl', at: 'ld-hollow', name: 'Inside the hollow oak', verb: 'Squeeze in behind the shelf', door: 'arch', say: 'Far bigger inside. The rings go round you like a clock. Someone large and feathered has been reading.', shut: m => _grmTod(m, ['dusk', 'night']) ? '' : 'Something is asleep in there, and snoring. It sounds like it would rather you came at dusk.',
    art() { const A = _GRM_Q; let s = A.shell('#5a3c22', '#3a2412', '#6e4a2a', '#3e2814');
      for (let i = 0; i < 7; i++) s += `<ellipse cx="480" cy="210" rx="${90 + i * 74}" ry="${60 + i * 44}" fill="none" stroke="#2e1c0e" stroke-width="4" opacity=".4"/>`;
      s += A.c(480, 76, 44, '#14203e') + A.c(490, 68, 24, '#f4eec8') + A.r(120, 150, 170, 10, '#2e1c0e') + A.r(120, 270, 170, 10, '#2e1c0e') + A.r(680, 200, 180, 10, '#2e1c0e');
      for (let i = 0; i < 11; i++) { const h = 38 + (i * 13) % 34; s += A.r(128 + i * 14, 150 - h, 12, h, ['#8a3a2a', '#3a5a7a', '#6a7a3a', '#c8984a'][i % 4]) + A.r(128 + i * 14, 270 - h, 12, h, ['#3a5a7a', '#c8984a', '#8a3a2a'][i % 3]); if (i < 9) s += A.r(690 + i * 16, 200 - h, 13, h, ['#6a7a3a', '#8a3a2a', '#c8984a'][i % 3]); }
      return s + A.flame(790, 330, 1.2) + A.r(782, 330, 16, 62, '#efe6cc') + A.glow(790, 300, 120, 0.3); },
    play: 'quiz', tip: 'Speak to the owl', gift: { ticket: 3, 'mat:timber': 1 }, gotLine: '“Hm,” says the owl, which is high praise, and pushes a ticket off the perch. A good log comes down after it.', missLine: '“No,” says the owl. “Go and look. I will ask you something else tomorrow.”', doneLine: 'The owl has gone back to its book. One question a night.',
    who: { x: 480, y: 330, art: () => { const A = _GRM_Q; return A.r(-60, -6, 120, 8, '#3a2412') + A.e(0, -50, 34, 46, '#8a6a46') + A.e(0, -38, 22, 32, '#d8c8a0') + A.c(-14, -72, 13, '#f4eec8') + A.c(14, -72, 13, '#f4eec8') + A.c(-14, -72, 6, '#1a1a1a') + A.c(14, -72, 6, '#1a1a1a') + A.p('M-4 -62L4 -62L0 -54z', '#d89a3a') + A.p('M-30 -88L-18 -82L-26 -74zM30 -88L18 -82L26 -74z', '#6a4a2e'); } },
    qs: [{ q: '“How many stones stand on the hill, by daylight?”', a: ['Five', 'Six', 'Nine'] }, { q: '“What does the signpost’s blank arm say, in very small letters?”', a: ['You are here', 'Go home', 'Mind the step'] }, { q: '“What is written on both sides of the milestone?”', a: ['0', '7', '100'] }, { q: '“Whom does the stone gardener look at as if they owe him money?”', a: ['The greenhouse', 'The lake', 'The owl'] }, { q: '“How many warm days a year is the summer house built for?”', a: ['Three', 'Ten', 'Ninety'] }, { q: '“What did the wheel of the watermill do when the brook moved?”', a: ['It stopped', 'It sang', 'It left'] }] },

  { id: 'grotto', at: 'ld-grotto', name: 'The back of the grotto', verb: 'Go further in than your arm', door: 'arch', say: 'The cold breath comes from here: a low green room, one drip of water, and a bare rock that would like some moss, if you would be so good.',
    art() { const A = _GRM_Q; let s = A.shell('#1c3028', '#10201a', '#2a4034', '#16261e');
      for (let i = 0; i < 9; i++) s += A.p(`M${i * 118 - 20} 0Q${i * 118 + 40} ${90 + (i % 3) * 40} ${i * 118 + 100} 0z`, '#0c1a14', 0.8);
      s += A.p('M180 392Q200 180 480 150Q760 180 790 392z', '#3a4a42') + A.p('M280 392Q300 250 480 226Q660 250 690 392z', '#2a3a32') + A.c(620, 60, 5, '#c8f0f0') + `<circle class="grm-drip" cx="620" cy="72" r="3.4" fill="#c8f0f0"/>` + A.e(620, 396, 40, 10, '#6ab0b8', 0.5);
      for (let i = 0; i < 7; i++) s += A.s(`M${90 + i * 130} 392q-8 -44 -40 -60M${90 + i * 130} 392q10 -48 44 -56`, '#4a7a4e', 4, 0.7); return s; },
    play: 'grow', tip: 'Press on a tuft of moss', goal: 7, max: 14, gift: { 'mat:stone': 1, ticket: 1 }, doneLine: 'Moss will only go so fast. Come back tomorrow, and it will have taken.', end: { items: { 'decor:rw-ground-moss': 4 }, say: 'The rock is green all over, and comes away in neat pieces at the edge. You take four squares for home.' },
    lines: ['You press a tuft on the bare rock. It is not much, yet.', 'Yesterday’s took. Another beside it.', 'It is starting to look deliberate.', 'Something very small has moved in.', 'A fern, that you did not plant.', 'The drip has changed its note. It likes this.', 'Nearly the whole rock now.', 'You press another tuft in. There is always a bare bit.'],
    tend: { x: 300, y: 408, art: () => _GRM_Q.r(-34, -24, 68, 24, '#6a5a44', null, 6) + _GRM_Q.e(-10, -28, 22, 11, '#5a9a4e') + _GRM_Q.e(14, -30, 18, 10, '#6aaa56') },
    grown(n) { const A = _GRM_Q; let s = ''; for (let i = 0; i < n; i++) { const x = 330 + (i * 97) % 300, y = 370 - (i * 41) % 130; s += A.e(x, y, 46 + (i % 3) * 8, 22, i % 2 ? '#5a9a4e' : '#6eb060') + A.e(x - 10, y - 4, 16, 7, '#8acc78', 0.7); } if (n >= 5) s += A.s('M660 392q-8 -60 -46 -78M660 392q6 -66 44 -84M660 392q0 -50 0 -92', '#6eb060', 5); return s; } },

  { id: 'falls', at: 'ld-falls', name: 'Behind the falls', verb: 'Walk through the water', door: 'arch', say: 'A dry ledge, the whole falls for a wall, and three old mirrors on posts. Somebody set them up to catch the first of the sun.', shut: m => _grmTod(m, ['dawn']) ? '' : 'The water is too heavy to walk through. It looks thinner first thing in the morning.',
    art() { const A = _GRM_Q; let s = A.shell('#47768e', '#2f566c', '#4a5258', '#2a3036') + A.r(0, 0, 960, 392, '#a8dcf0', 0.32); let f = ''; for (let i = 0; i < 38; i++) f += A.r(i * 26, -40, 8 + (i % 4) * 4, 460, '#e8fbff', 0.2 + (i % 3) * 0.1); s += `<g class="grm-fall">${f}</g>`; return s + A.r(0, 388, 960, 12, '#1e2428') + A.p('M0 0L170 0L60 210z', '#fff0b8', 0.3); },
    play: 'mirrors', tip: 'Turn this mirror', gift: { ticket: 2, 'mat:stone': 1 }, gotLine: 'The light goes all the way along and the falls turn into a rainbow, just for you, just for a minute. A wet stone and a ticket sit where it lands.', doneLine: 'The sun has moved on. It will be back at this time tomorrow, and it will want the mirrors differently.',
    at3: [{ x: 240, y: 380 }, { x: 490, y: 360 }, { x: 740, y: 380 }],
    mirror: (a) => { const A = _GRM_Q; return A.r(-4, -60, 8, 60, '#4a3a2a') + `<g transform="translate(0 -84) rotate(${[-28, 0, 28][a]})">` + A.r(-26, -30, 52, 60, '#3a2a1c', null, 5) + A.r(-21, -25, 42, 50, '#cfeaf2', null, 3) + A.s('M-14 -14L6 -22', '#fff', 3, 0.8) + '</g>'; },
    ray(upto) { const A = _GRM_Q, pts = [[50, 80], [240, 296], [490, 276], [740, 296], [870, 120]]; let s = ''; for (let i = 0; i <= upto; i++) s += A.s(`M${pts[i][0]} ${pts[i][1]}L${pts[i + 1][0]} ${pts[i + 1][1]}`, '#fff2b0', 6, 0.75); if (upto >= 3) ['#e8504e', '#f0a03e', '#f4e04e', '#5ac06a', '#4a90d8', '#8a5ac0'].forEach((c, i) => { s += A.s(`M380 ${310 - i * 14}Q660 ${40 - i * 14} 930 ${200 - i * 14}`, c, 13, 0.5); }); return s; } },

  { id: 'lamproom', at: 'ld-lighthouse', name: 'The lamp room', verb: 'Climb all the way up', door: 'ladder', say: 'Far too small, and all window. Somewhere out on the dark lake tonight there is somebody who cannot find the way in. Turn the lamp to each window.', shut: m => _grmTod(m, ['night']) ? '' : 'The stairs are roped off and a card says LAMP LIT AT NIGHT. COME BACK THEN.',
    art() { const A = _GRM_Q; let s = A.shell('#0e1a34', '#0a1226', '#c8c0b0', '#8a8478');
      for (let i = 0; i < 60; i++) s += A.c((i * 139) % 960, (i * 71) % 230, 0.7 + (i % 3) * 0.5, '#fff', 0.7);
      s += A.r(0, 268, 960, 124, '#10253e') + A.r(0, 388, 960, 10, '#b84a3a');
      for (let i = 0; i < 7; i++) s += A.r(10 + i * 158, 26, 10, 366, '#e8e4d8'); s += A.r(0, 16, 960, 16, '#b84a3a');
      s += `<g transform="translate(480 392)">` + A.r(-44, -72, 88, 72, '#7a7468') + A.e(0, -130, 56, 66, '#e8f4f8', 0.5) + A.e(0, -130, 34, 44, '#fff7c8', 0.95) + A.flame(0, -112, 1.5) + A.glow(0, -130, 170, 0.45) + '</g>'; return s; },
    play: 'seek', tip: 'Turn the lamp this way', gift: { 'mat:reed': 2, ticket: 2 }, gotLine: 'There. A small boat in the beam, and an arm waving. A bundle of reeds and a ticket come up on the hoist, by way of thanks.', doneLine: 'They are home. There will be someone else out there tomorrow night.',
    miss: ['Black water, and your own light coming back.', 'Only a heron. It is not lost. It wishes you would stop.', 'The far shore. Someone over there blinks a lamp back. That is nice, but not who you are looking for.', 'Nothing. It is quite a big lake when it is dark.'],
    things: [90, 270, 690, 870].map((x, i) => ({ x, y: 300, w: 140, h: 130, tip: 'Turn the lamp this way', art: (on) => { const A = _GRM_Q; return A.p('M0 -130L-60 0H60z', '#fff7c8', on ? 0.34 : 0.05) + (on ? A.p('M-22 -10H22L14 2H-14z', '#b8623a') + A.s('M0 -10V-34', '#f2e4c8', 2) : A.c([-30, 18, -12, 26][i], -30, 2, '#fff', 0.5)); } })) },

  { id: 'ringers', at: 'ld-chapel', name: 'The ringing chamber', verb: 'Try the low door behind the altar', door: 'arch', say: 'The bell has not rung for a hundred years, but the ropes are all still here. The old window shows the order they rang them in. It changes with the light.', shut: () => gpGet('rm.k.iron') ? '' : 'A small door, and a very big lock. The key would have been put somewhere sensible, like an old barn, and forgotten.',
    art() { const A = _GRM_Q; let s = A.shell('#4a4640', '#34302c', '#5e564a', '#3a342e') + A.stones(0, 380, '#6a645a', 0.32);
      s += A.p('M360 280V110Q360 34 480 34Q600 34 600 110V280Z', '#2a2620'); return s + A.glow(480, 150, 240, 0.25) + A.r(0, 0, 960, 34, '#1e1a16'); },
    play: 'tune', tip: 'Pull this rope', wave: 'sine', len: 1.4, gift: { 'mat:timber': 1, ticket: 3 }, gotLine: 'For the first time in a hundred years, and only down here, it rings out properly. Dust falls, with a bit of old beam and a ticket in it.', missLine: 'Wrong rope. A long dull clunk, somewhere up in the dark.', doneLine: 'You rang it true today. It takes a day for the dust to settle.',
    things: [['#c8483a', 196, 180], ['#d8a83a', 247, 300], ['#4a7ab8', 294, 680], ['#5a9a5a', 349, 800]].map(([c, f, x]) => ({ x, y: 380, f, w: 70, h: 370, art: (hot) => _GRM_Q.s(`M0 -380V${hot ? -40 : -60}`, '#d8c8a0', 5) + _GRM_Q.r(-9, hot ? -150 : -170, 18, 74, c, null, 8) })),
    chart: { x: 480, y: 34, art(seq, at) { const A = _GRM_Q, C = ['#c8483a', '#d8a83a', '#4a7ab8', '#5a9a5a']; let s = ''; (seq || []).forEach((k, i) => { s += A.p(`M${-100 + i * 50} 70h46v170h-46z`, C[k], i < at ? 0.25 : 0.9) + A.s(`M${-100 + i * 50} 70v170`, '#1e1a16', 5); }); return s + A.s('M-106 62Q0 -10 106 62V246H-106z', '#1e1a16', 9); } } },

  { id: 'barnloft', at: 'ld-barn', name: 'Up in the barn', verb: 'Climb over the first lot of things', door: 'plank', say: 'Full of things somebody will definitely need one day. Today, somebody is you. Dig in, and mind the rake.',
    art() { const A = _GRM_Q; let s = A.shell('#7a4a2a', '#4e2c18', '#a8904e', '#70603a') + A.planks(0, 392, '#2a180c', 0.45, 48);
      s += A.p('M0 0L480 -40L960 0V30L480 -14L0 30z', '#2a180c') + A.p('M430 40h100v100h-100z', '#ffe9a8', 0.75) + A.s('M480 40v100M430 90h100', '#2a180c', 5) + A.p('M430 140L330 392H630L530 140z', '#ffe9a8', 0.1);
      for (let i = 0; i < 30; i++) s += A.s(`M${(i * 79) % 960} ${414 + (i * 31) % 170}l${12 + i % 6} -4`, '#d8c070', 2, 0.6);
      return s; },
    play: 'seek', tip: 'Dig through this heap', gift: { 'mat:timber': 2, ticket: 1 }, gotLine: 'Under it all, some good straight timber nobody will miss, and a ticket used as a bookmark in nothing.', doneLine: 'That is today’s heap. By tomorrow it will all have slid about again.',
    won(R) { if (!gpVisiting() && !gpGet('rm.k.iron')) { gpSet('rm.k.iron', _gdToday()); setTimeout(() => _grmSay('And hanging on the nail behind it, a great iron key with a little cross on the bow. That is not for any door in a barn.', 9000), 7000); } },
    miss: ['Eleven left boots.', 'A rake. You found it with your foot.', 'A box labelled STRING TOO SHORT TO USE. It is full.', 'A very old hen, who is fine, thanks.'],
    things: [['#8a6a3a', 240], ['#6a5a4a', 420], ['#7a5030', 610], ['#94744a', 800]].map(([c, x], i) => ({ x, y: 400, w: 150, h: 130, art: (on) => { const A = _GRM_Q; return A.p('M-74 0Q-68 -64 -22 -92Q18 -116 54 -70Q78 -40 74 0z', c) + A.r(-46, -44, 34, 26, '#4a3424') + A.s('M0 -24L36 -60', '#c8b488', 4) + A.c(30 - i * 12, -18, 13, '#2e2a26') + (on ? A.c(0, -116, 8, '#fff4b8', 0.9) : ''); } })) },

  { id: 'parlour', at: 'ld-stump', name: 'The very small parlour', verb: 'Knock again, and wait', door: 'plank', say: 'You do not know how you fit. Thimble stools, a cotton reel for a table, and a family of mice being extremely polite about it.', shut: m => _grmTod(m, ['dusk']) ? '' : 'A very small voice says “not at this hour, thank you. We do visitors at dusk.”',
    art() { const A = _GRM_Q; let s = A.shell('#8a5a34', '#5e3a20', '#a8784a', '#6e4a2c');
      for (let i = 0; i < 8; i++) s += A.s(`M${i * 130 + 30} 0q18 196 -6 392`, '#4a2c14', 3, 0.4);
      s += A.r(740, 110, 130, 170, '#efe0b8') + A.r(752, 122, 106, 146, '#4a78a8') + A.c(805, 180, 22, '#f4d478') + A.s('M740 110H870', '#7a4a22', 6);
      s += A.r(180, 292, 150, 100, '#c8a05a', null, 4) + A.r(180, 292, 150, 16, '#e0584a') + A.r(200, 262, 110, 32, '#f4ecd8', null, 6) + `<text x="255" y="350" text-anchor="middle" font-size="16" font-weight="700" fill="#7a5a2a">MATCHES</text>`;
      s += A.r(610, 330, 16, 62, '#efe6cc') + A.flame(618, 330, 1.2) + A.glow(618, 310, 110, 0.36);
      return s; },
    play: 'give', tip: 'Offer them something', gift: { ticket: 3 }, gotLine: 'You hand over some {crop}. There is a lot of bowing, and they press three tickets on you. They are the size of postage stamps, and quite good.', doneLine: 'They have eaten and are being polite about the time. Come back tomorrow at dusk.', emptyLine: 'They look hopefully at your pockets. Next time, bring something you have picked.', guestLine: 'They are your friend’s mice. They wave.',
    who: { x: 480, y: 392, art: (full) => { const A = _GRM_Q, mouse = (x, k) => `<g transform="translate(${x} 0) scale(${k})">` + A.e(0, -22, 18, 24, '#9a8a7a') + A.c(0, -52, 14, '#a8988a') + A.c(-11, -62, 8, '#c8a8a0') + A.c(11, -62, 8, '#c8a8a0') + A.c(-5, -54, 2, '#1a1a1a') + A.c(5, -54, 2, '#1a1a1a') + A.s('M16 -6q26 4 22 -18', '#c8a8a0', 2.4) + '</g>'; return A.e(0, -30, 50, 10, '#d8c8a8') + A.r(-34, -30, 68, 30, '#b88a5a') + A.e(0, -2, 40, 6, '#000', 0.2) + mouse(-76, 1) + mouse(74, 0.85) + (full ? A.c(0, -38, 12, '#c8483a') : ''); } } },

  { id: 'hut', at: 'ld-hut', name: 'In the shepherd’s hut', verb: 'Try the door. It is only on a latch', door: 'plank', say: 'A chair, a kettle, a dog’s bowl. Nobody home, but the stove is warm. It would be rude not to put the kettle on.',
    art() { const A = _GRM_Q; let s = A.shell('#6a7858', '#465440', '#7a5e3c', '#4e3a24') + A.planks(0, 392, '#2e3626', 0.4, 58);
      s += A.r(210, 90, 150, 110, '#6a5a44') + A.r(220, 100, 130, 90, '#a8c8e0') + A.p('M220 190Q280 124 350 170V190z', '#7aa05e') + A.s('M285 100v90M220 145h130', '#6a5a44', 5);
      s += A.r(700, 320, 80, 8, '#7a5a3a') + A.r(704, 328, 7, 64, '#7a5a3a') + A.r(770, 328, 7, 64, '#7a5a3a') + A.r(704, 250, 7, 74, '#7a5a3a') + A.e(600, 392, 30, 8, '#a83a2a');
      s += A.r(180, 340, 60, 8, '#8a6a3a') + A.s('M820 392V60', '#5a4a30', 6) + A.s('M820 100q50 30 70 80', '#ddd', 2, 0.5); return s; },
    play: 'wait', tip: 'See to the kettle', ms: 15 * 60 * 1000, gift: { ticket: 2 }, startLine: 'You put the kettle on. It is an old kettle. It will not be hurried, so go and do something and come back.', waitLine: 'Not yet. It ticks a bit. It knows you are there. A kettle like this wants a quarter of an hour.', guestLine: 'It is your friend’s tea to make.', doneLine: 'You have had your tea. The kettle is cooling, and it will take a day.', gotLine: 'A good strong cup, drunk looking at the view. A ticket has been left under the saucer, for the washing up.',
    won() { if (!gpVisiting() && !gpGet('rm.k.word')) { gpSet('rm.k.word', _gdToday()); setTimeout(() => _grmSay('On the saucer, in a child’s letters: “For the treehouse. The word is ONIONS. Do not tell Dad.”', 10000), 7000); } },
    thing: { x: 480, y: 392, art: (st) => { const A = _GRM_Q; return A.r(-70, -120, 140, 120, '#2e2a26', null, 4) + A.r(-46, -68, 92, 54, '#141210') + (st ? A.flame(0, -26, 1.2) : '') + A.r(-76, -126, 152, 10, '#46403a') + A.p('M-30 -130Q-34 -164 0 -164Q34 -164 30 -130z', '#7a8a8e') + A.p('M30 -152L54 -166L50 -150L30 -142z', '#7a8a8e') + A.s('M-22 -164Q0 -192 22 -164', '#3a3a3a', 3.4) + (st === 2 ? `<circle class="grm-steam" cx="56" cy="-172" r="8" fill="#fff"/><circle class="grm-steam" cx="62" cy="-182" r="5" fill="#fff" style="animation-delay:-.9s"/>` : ''); } } },

  { id: 'treehouse', at: 'ld-treehouse', name: 'The treehouse', verb: 'Say the password up the string', door: 'ladder', say: 'The string goes taut and a rope ladder comes down. KEEP OUT, it says, and under that, in other pencil: THIS MEANS YOU. Inside, the rules of a very serious club.', shut: () => gpGet('rm.k.word') ? '' : 'A tin comes down with a note: “password?” You do not know it. Whoever lived up on the hill might have. Their kettle is still there.',
    art() { const A = _GRM_Q; let s = A.shell('#6e9a5a', '#4a7240', '#8a6238', '#5a3e22');
      for (let i = 0; i < 16; i++) s += A.e((i * 127) % 960, (i * 53) % 150, 80, 44, i % 2 ? '#3f6a38' : '#55884a', 0.8);
      s += A.r(0, 170, 960, 222, '#a07a4a') + A.planks(170, 392, '#5a3e22', 0.55, 66) + A.r(0, 166, 960, 8, '#6e4a2a');
      s += A.r(610, 200, 180, 80, '#efe6cc') + `<text x="700" y="232" text-anchor="middle" font-size="22" font-weight="800" fill="#a83a2a">KEEP OUT</text><text x="700" y="262" text-anchor="middle" font-size="12" font-weight="700" fill="#3a3a3a">THIS MEANS YOU</text>`;
      s += A.r(180, 340, 110, 52, '#3f6a86', null, 3) + A.r(188, 322, 70, 18, '#c8483a', null, 2) + A.s('M820 170V392', '#c8b488', 3) + A.r(800, 300, 40, 26, '#3f7486', null, 3); return s; },
    play: 'serial', tip: 'Read the club rules', gift: { ticket: 2 }, after: { ticket: 1 }, doneLine: 'A rule a day. The club does not rush.', end: { items: { 'decor:rw-orn-logs': 1 }, say: 'You have read all the rules, so you must be a member. There is a stack of logs with your name on it. It is in your bag. That is the clubhouse fund.' },
    book: { x: 480, y: 392, art: () => _grmBook('#a83a2a') },
    pages: ['“RULE 1. No grown ups. You have got this far, so we will assume you are not one.”', '“RULE 2. Tell no one about the club. There is a ticket for keeping quiet.”', '“RULE 3. Onions are not food. They are the password.”', '“RULE 4. If the ladder is up you are out. If the ladder is down you are also out, but less.”', '“RULE 5. Dad may come up on his birthday. He has to knock.”', '“RULE 6. Whoever reads this is in charge now. We have gone to the lake. We will be back for tea.”'] },

  { id: 'icehouse', at: 'ld-icehouse', name: 'Down the ice house', verb: 'Open the door all the way', door: 'arch', say: 'A deep round room, straw on the floor, and cold you can lean on. There is an old cold box. Whatever goes in tonight comes out fresh tomorrow, with a little thank you.',
    art() { const A = _GRM_Q; let s = A.shell('#b8d0dc', '#7a9aac', '#c8d8e0', '#94aeba') + A.p('M0 0Q480 -60 960 0V70Q480 10 0 70z', '#54707e') + A.stones(70, 380, '#d8e8f0', 0.28);
      for (let i = 0; i < 7; i++) s += A.s(`M${60 + i * 140} 100q14 50 -12 94q30 -28 26 -94`, '#f4feff', 3, 0.8);
      for (const [x, y, w] of [[110, 320, 150], [130, 268, 110], [720, 320, 160], [760, 268, 90]]) s += A.r(x, y, w, 52, '#e4f4fa', 0.8, 4) + A.r(x + 8, y + 6, w * 0.4, 8, '#fff', 0.8);
      for (let i = 0; i < 26; i++) s += A.s(`M${(i * 91) % 960} ${414 + (i * 29) % 170}l10 -3`, '#d8c070', 2, 0.55);
      return s; },
    play: 'keep', tip: 'Open the cold box', gift: { ticket: 1, 'mat:stone': 1 }, emptyLine: 'You have nothing to put in. Bring something you have picked.', guestLine: 'It is your friend’s cold box.', leftLine: 'You leave some {crop} in the cold. Come back tomorrow.', waitLine: 'It has not had a night yet. Tomorrow.', gotLine: 'Your {crop}, cold and perfect, and a chip of field stone and a ticket that you did not put in. Nobody knows.', doneLine: 'The box wants a rest. Bring something else tomorrow.',
    box: { x: 480, y: 392, art: (full) => { const A = _GRM_Q; return A.r(-76, -80, 152, 80, '#6e8e9c', null, 4) + A.r(-80, -92, 160, 14, full ? '#a8c4d0' : '#3f5a66', null, 3) + A.s('M-60 -44H60M-60 -24H60', '#4a6470', 3) + (full ? A.c(0, -60, 7, '#fff4b8', 0.95) : ''); } } },

  { id: 'capfloor', at: 'lf-windmill', name: 'Up in the windmill’s cap', verb: 'Climb up to the wheel', door: 'ladder', say: 'The great wheel turns in the dark, tooth by tooth. The brake is the old way of doing it: catch the mark as it comes under the pointer, three times running, and the stones grind true.',
    art() { const A = _GRM_Q; let s = A.shell('#8a6a42', '#5a4228', '#7a5e3c', '#4e3a24') + A.planks(0, 392, '#2e2010', 0.5, 70);
      s += A.p('M120 90L480 16L840 90z', '#3a2a18') + A.r(0, 88, 960, 12, '#3a2a18');
      for (const x of [730, 800]) s += A.r(x, 330, 60, 62, '#e6d8b8', null, 12) + A.r(x + 18, 322, 24, 12, '#c8b488', null, 3);
      for (let i = 0; i < 24; i++) s += A.c((i * 97) % 960, 200 + (i * 53) % 190, 1.5, '#fff8e0', 0.55);
      return s + A.glow(860, 140, 130, 0.25); },
    play: 'catchIt', tip: 'Pull the brake', gift: { 'mat:timber': 2, ticket: 1 }, gotLine: 'Three clean stops, and the whole mill settles to its work. A spare cog-tooth of good timber drops at your feet, and there is a ticket in the flour.', missLine: 'Too late, or too soon. The wheel goes on as if nothing happened. Start again.', doneLine: 'Grinding nicely now. It will have drifted by tomorrow.',
    lever: { x: 650, y: 392, art: (hits) => { const A = _GRM_Q; return A.r(-22, -14, 44, 14, '#3a2a18') + A.s('M0 -14L-20 -120', '#7a5634', 10) + A.c(-20, -124, 11, '#c8483a') + [0, 1, 2].map(i => A.c(24, -30 - i * 22, 7, i < hits ? '#ffd86a' : '#2a1a0c')).join(''); } },
    wheel: { x: 320, y: 240, art: (goal) => { const A = _GRM_Q; let t = ''; for (let i = 0; i < 16; i++) t += `<rect x="-11" y="-152" width="22" height="24" fill="#5a3e22" transform="rotate(${i * 22.5})"/>`; return A.s('M0 -168V-138', '#ffd86a', 7) + `<g transform="rotate(${(goal * 180 / Math.PI * -1).toFixed(1)})"><g class="grm-turn">${t}${A.c(0, 0, 134, '#7a5634')}${A.c(0, 0, 112, '#4e3620')}${A.s('M-112 0H112M0 -112V112M-80 -80L80 80M-80 80L80 -80', '#7a5634', 13)}${A.c(0, 0, 24, '#2e2010')}${A.p('M-12 -134h24v30h-24z', '#ffd86a')}</g></g>`; } } },
]);

/* ---------- Play, under Secrets: only what you have found, and never where the rest are ---------- */
function _grmFoundRows() { return GRM_ROOMS.filter(R => _grmG(R, 'f')); }
gardenPlayAdd({ id: 'rooms', name: 'Places you have been', icon: 'door-open', group: 'secret', verb: 'Look back', blurb: 'There is more to this land than the outside of it.', status: () => { const n = _grmFoundRows().length; return n ? `${n} found` : ''; },
  open() {
    gpStage('Places you have been', (el) => {
      const rows = _grmFoundRows();
      if (!rows.length) { el.appendChild(gpEl('p', 'muted', 'Nowhere yet. Go up to things, and try what they offer.')); return; }
      for (const R of rows) {
        const sight = gardenLandSight(R.at) || gardenLandFeature(R.at), d = gpEl('div', 'gp-row');
        d.appendChild(gpEl('b', null, R.name));
        d.appendChild(gpEl('div', 'muted', `${sight ? sight.name : ''}. ${_grmDone(R) ? 'Done for today: come back tomorrow.' : 'Something to do today.'} ${Number(_grmG(R, 'c', 0)) || 1} day${Number(_grmG(R, 'c', 0)) > 1 ? 's' : ''} here so far.`));
        el.appendChild(d);
      }
    });
  } });
