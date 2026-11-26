/* ============================================================
   STORIES YOU SEE, and THE VALE'S STORY (npcs-PLAN 1.6, 1.7, 3.11, 3.12; the folk3 plan, steps 8 and 10). Pure: no page, no DOM, nothing
   called at load.

   MOMENTS are data, played in the world by the real villagers (94-garden-wonder-folk3-8scene.js): soft bars ease in, the camera settles,
   the folk walk to their marks and act it out, and their words come in the talk card. The words are the story bible's, taken from the
   beat itself (`say: k` is the beat's k-th line; a line the gentle telling leaves out is skipped), so a moment never changes the story.
     stage   where it plays: { at: 'teller' } (where the teller stands), { kinds, r } (the nearest thing of a kind within r cells of you),
             { at: 'plaza' } (the village plaza's middle, from the day's kit). No stage: the beat is told in the talk card, as before.
     marks   places relative to the stage's DRAWN footprint (rule 17): { of: 'stage', u, dy } (u a share of its drawn width from its middle,
             dy cells in front of its foot line), { wet: 1, dy } (the stage's side with water beside it: a wheel), { ring: { r, n } } (an arc
             in front), { tree: { r } } (beside the nearest tree trunk behind the ring), { at: 'plaza-middle' }.
     cast    teller (the beat's speaker), crowd ({ any: n, r, not: [...] }: folk who are out and near), named (angler, hollin: as they are)
     steps   { cam: [names], t } a shot (eased over t s; cuts with motion off) | { walk: who, to: mark, gait } | { gather: 'crowd', max }
             | { pose: who, p, face } | { say: k, who? } | { wait: s } | { fx: id } | { end: 1 }; `if: name` skips a step whose name did
             not resolve (no mill near, Hollin not out, the gentle telling).
   THE CHRONICLE (VALE_HISTORY): six eras in the Journal, each a strip of pieces; a piece fills from what you have done (a beat heard, a
   moment seen, a find, a letter, being at a KIND of place at an hour, a festival, a race won). Slots from the heavy arcs never appear here.
   It is private, like the rest of the story (bible tone rule 6): never in the snapshot. What an era gives for your garden is a decoration,
   and friends see that once it is put out.
   ============================================================ */
/** Story places by kind: resolved by kind first (then a preferred id), nearest the teller; the story never names a cell. */
const VALE_ROLES = Object.freeze({
  mill: Object.freeze({ kinds: ['mill'], prefer: ['ld-mill'] }),
  pier: Object.freeze({ kinds: ['pier', 'fishing-bank'] }),
  chapel: Object.freeze({ kinds: ['chapel'], prefer: ['ld-chapel'] }),
  stones: Object.freeze({ kinds: ['stones'] }),
});
const VALE_SCENES = Object.freeze({
  still: Object.freeze({ id: 'still', name: 'The mill on the river', beat: 'mill.still', teller: 'angler', private: 1,
    stage: { at: 'teller' }, look: { role: 'mill', r: 42 },
    steps: [
      { cam: ['teller', 'you'], t: 1.1 },
      { pose: 'teller', p: 'point', face: 'look', if: 'look' },
      { cam: ['teller', 'look'], t: 2.4, if: 'lookNear' },
      { say: 0 },
      { cam: ['teller', 'you'], t: 1.6 },
      { pose: 'teller', p: 'boots', face: 'you' },
      { wait: 1.1 },
      { say: 1 },
      { say: 2 },
      { end: 1 },
    ] }),
  wheel: Object.freeze({ id: 'wheel', name: 'The gap in the wheel', beat: 'mill.wheel', teller: 'pip', private: 1,
    stage: { role: 'mill', r: 24 }, marks: { side: { wet: 1, dy: 0.95, u: 0.42 }, here: { of: 'stage', u: 0, dy: 2.4 } },
    steps: [
      { cam: ['teller', 'you'], t: 0.9 },
      { say: 0 },
      { walk: 'teller', to: 'side', gait: 'r' },
      { cam: ['stage', 'teller'], t: 2.2 },
      { pose: 'teller', p: 'point', face: 'wet' },
      { wait: 0.6 },
      { say: 1 },
      { pose: 'teller', p: 'listen', face: 'wet' },
      { wait: 1.6 },
      { say: 2 },
      { pose: 'teller', p: 'shrug', face: 'you' },
      { cam: ['teller', 'stage', 'you'], t: 1.8 },
      { say: 3 },
      { end: 1 },
    ] }),
  mended: Object.freeze({ id: 'mended', name: 'The wheel turns', beat: 'mill.mended', teller: 'bramble', private: 1,
    stage: { role: 'mill', r: 24 }, crowd: { any: 5, r: 26, not: ['angler', 'hollin', 'wick'] },
    marks: { front: { of: 'stage', u: 0.08, dy: 1.9 }, ring: { ring: { r: 2.7, dy: 2.9, n: 5 } }, back: { tree: { r: 7, dy: 4.4 } } },
    steps: [
      { cam: ['teller', 'you'], t: 0.9 },
      { walk: 'teller', to: 'front', gait: 'w' },
      { gather: 'crowd', max: 11, gait: 'r' },   // (everyone came down to hear it: they hurry)
      { walk: 'hollin', to: 'back', gait: 'w', if: 'hollinDeep' },
      { cam: ['stage', 'teller', 'crowd'], t: 2.4 },
      { pose: 'teller', p: 'listen', face: 'stage' },
      { pose: 'crowd', p: 'listen', face: 'stage' },
      { wait: 1.4 },
      { say: 0 },
      { pose: 'crowd', p: 'clap', face: 'stage' },
      { say: 1 },
      { cam: ['hollin'], t: 2.2, if: 'hollinDeep' },
      { say: 2 },   // (the line is the beat's own: said whether or not Hollin could be there; the gentle telling leaves it out)
      { cam: ['angler'], t: 2.6, if: 'angler' },
      { say: 3 },
      { end: 1 },
    ] }),
  'frost-open': Object.freeze({ id: 'frost-open', name: 'The Frost Fair opens', fest: 'frost-fair', public: 1,
    stage: { at: 'plaza' }, crowd: { any: 6, r: 22, fair: 1 }, opener: ['bramble', 'quince', 'pip', 'tam', 'angler'],
    marks: { middle: { at: 'plaza-middle' }, ring: { ring: { r: 2.4, dy: 0.2, n: 6, about: 'middle' } } },
    lines: Object.freeze([
      'The Frost Fair is open! Mind the ice, and the honey cakes, in that order.',
      'There. Lanterns. Somebody hand me a cake before I make another speech.',
    ]),
    steps: [
      { cam: ['stage', 'you'], t: 1.2 },
      { walk: 'opener', to: 'middle', gait: 'w' },
      { gather: 'crowd', max: 9 },
      { cam: ['stage', 'opener', 'crowd'], t: 1.8 },
      { pose: 'opener', p: 'cheer', face: 'you' },
      { say: 0, who: 'opener' },
      { fx: 'lights' },
      { pose: 'crowd', p: 'cheer', face: 'middle' },
      { wait: 2.6 },
      { pose: 'opener', p: 'laugh', face: 'you' },
      { say: 1, who: 'opener' },
      { end: 1 },
    ] }),
});
/** The beat a moment belongs to ('story.beat' -> scene id). */
const VALE_SCENE_OF_BEAT = new Map(Object.values(VALE_SCENES).filter(s => s.beat).map(s => [s.beat, s.id]));
/* ---------- the vale's story: six eras ---------- */
const VALE_ERAS = Object.freeze([
  Object.freeze({ id: 'i', n: 'I', name: 'The two waters', line: 'A legend. Two streams quarrelled about which of them was the river.', reward: 'vy-two-waters-stone' }),
  Object.freeze({ id: 'ii', n: 'II', name: 'The wardens’ wood', line: 'The wardens planted the woods and kept one rule: what you take, you give back.' }),
  Object.freeze({ id: 'iii', n: 'III', name: 'The mill years', line: 'The mill was built, the boats came, and the fair began.', reward: 'vy-millstone-seat' }),
  Object.freeze({ id: 'iv', n: 'IV', name: 'The year the brook moved', line: 'What happened at the mill, as people tell it.' }),
  Object.freeze({ id: 'v', n: 'V', name: 'The quiet years', line: 'Within living memory: a garden kept, letters not sent.' }),
  Object.freeze({ id: 'vi', n: 'VI', name: 'Now', line: 'What you have done here.' }),
]);
/** The pieces. by: { place: { kinds, tod: [..], r } } at a kind of place at an hour | { beat } heard | { scene } seen | { find } |
 *  { letter } | { fact } (a number from what you have done: 'zones', 'mill', 'fest', 'race', 'market', 'cards'). art: the vignette's
 *  drawing (94-garden-wonder-folk3-9chron.js). soft: the gentle telling's words. */
const VALE_HISTORY = Object.freeze([
  // I, the two waters (a legend, in the vale's own voice)
  { id: 'i-stones', era: 'i', art: 'stones', by: { place: { kinds: ['stones'], tod: ['dusk', 'night'], r: 5 } }, clue: 'The standing stones, as the light goes.', line: 'They say two streams met here first, and stood about like these stones, deciding which of them was the river.' },
  { id: 'i-falls', era: 'i', art: 'falls', by: { place: { kinds: ['falls'], tod: ['dawn', 'morning'], r: 6 } }, clue: 'Where the water falls, early in the day.', line: 'The older water comes down the falls to meet the younger. It has done it every morning since.' },
  { id: 'i-mere', era: 'i', art: 'mere', by: { place: { kinds: ['pier', 'fishing-bank'], tod: ['night'], r: 4 } }, clue: 'Out over the still water, at night.', line: 'In the Mere the two waters stopped arguing and became one river. One river, one vale.' },
  // II, the wardens' wood
  { id: 'ii-chapel', era: 'ii', art: 'chapel', by: { place: { kinds: ['chapel'], tod: ['dawn', 'morning'], r: 5 } }, clue: 'The old chapel in the woods, in the morning.', line: 'The wardens built the chapel with wood they had grown themselves. One tree back for every beam.' },
  { id: 'ii-maze', era: 'ii', art: 'maze', by: { place: { kinds: ['maze'], r: 5 } }, clue: 'Hedges that go round and round.', line: 'The maze was planted to keep goats out of the herbs. The goats learned it in a week. The wardens took a year.' },
  { id: 'ii-tree', era: 'ii', art: 'tree', by: { fact: 'trees', of: 3 }, clue: 'Plant three trees.', line: 'What you take from the wood, you give back. You have put three trees in. The wardens would nod at that.' },
  // III, the mill years
  { id: 'iii-mill', era: 'iii', art: 'mill', by: { place: { kinds: ['mill'], r: 6 } }, clue: 'The mill on the river.', line: 'The mill was built where the river runs fastest. For a hundred years everyone’s bread came through it.' },
  { id: 'iii-light', era: 'iii', art: 'light', by: { place: { kinds: ['lighthouse'], tod: ['dusk', 'night'], r: 7 } }, clue: 'The lighthouse, after dark.', line: 'When the boats came to the quay, somebody lit a lamp on the point so they could find it. Somebody always has.' },
  { id: 'iii-market', era: 'iii', art: 'market', by: { fact: 'market' }, clue: 'A Saturday, on the green.', line: 'The market began when the mill did: honey, maps, stones and stamps. Some things have not changed.' },
  { id: 'iii-fair', era: 'iii', art: 'fair', by: { fact: 'fest' }, clue: 'A fair, once a year, when it is cold.', line: 'There was always a fair. Bunting, a brazier, lanterns on the green. It came back the year you came.' },
  // IV, the year the brook moved (the main line's beats that are not heavy)
  { id: 'iv-still', era: 'iv', art: 'angler', by: { beat: 'mill.still' }, clue: 'The old angler, on the pier.', line: 'The old angler told you about the mill, and the day its wheel stopped. Third of October.' },
  { id: 'iv-brambles', era: 'iv', art: 'thistle', by: { beat: 'mill.brambles' }, clue: 'Mother Thistle, past the old oaks.', line: 'Mother Thistle said the brambles over the arch were planted on purpose, by two who fell out.' },
  { id: 'iv-wheel', era: 'iv', art: 'pip', by: { beat: 'mill.wheel' }, clue: 'Pip, at the mill.', line: 'Pip showed you the gap in the wheel’s teeth, where a cog should be.' },
  { id: 'iv-ledger', era: 'iv', art: 'tam', by: { beat: 'mill.ledger' }, clue: 'Tam digs round the chapel.', line: 'Tam dug up the mill’s book. On the last page: the wheel stopped.' },
  { id: 'iv-mended', era: 'iv', art: 'bramble', by: { beat: 'mill.mended' }, clue: 'The wheel, turning.', line: 'The wheel turned again, and everyone came down to hear it.' },
  { id: 'iv-letters', era: 'iv', art: 'wick', by: { beat: 'mill.letters' }, clue: 'Wick, at the top of the vale.', line: 'Wick told you who wrote the letters. From the top, it is one river, one vale.' },
  // V, the quiet years (finds and letters; told by people, never shown)
  { id: 'v-post', era: 'v', art: 'letter', by: { letter: 'post' }, clue: 'The first post.', line: 'Perpetua brought the first post. She was not fast. It was on time when she left.' },
  { id: 'v-tin', era: 'v', art: 'tin', by: { find: 'tin' }, clue: 'Under a step, where nobody looks down.', line: 'A seed tin with labels in careful pencil. Someone grew runner beans here for a long time.' },
  { id: 'v-glasses', era: 'v', art: 'glasses', by: { find: 'glasses' }, clue: 'A stone seat on the island.', line: 'Reading glasses with one arm mended with garden wire. Somebody read out here of an evening.' },
  { id: 'v-w', era: 'v', art: 'letter', by: { letter: 'w1' }, clue: 'A letter from W.', line: 'A letter from W., who kept the front of the garden for forty-one years.' },
  // VI, now: what you did
  { id: 'vi-gate', era: 'vi', art: 'gate', by: { fact: 'zones', of: 1 }, clue: 'Open your first gate.', line: 'You opened the first gate, and the vale got bigger.' },
  { id: 'vi-wheel', era: 'vi', art: 'wheel', by: { fact: 'mill' }, clue: 'Get the wheel turning.', line: 'You put the cog back. The mill hums again, like someone in the next room.' },
  { id: 'vi-race', era: 'vi', art: 'race', by: { fact: 'race' }, clue: 'Win a race with the folk.', line: 'You won a race with the vale’s folk. Pip asked for a rematch before you had stopped running.' },
  { id: 'vi-cards', era: 'vi', art: 'cards', by: { fact: 'cards' }, clue: 'Sit in at cards, one Wednesday evening.', line: 'You sat in at cards under the lamp. Nobody kept the score properly. Quince says otherwise.' },
  { id: 'vi-moment', era: 'vi', art: 'moment', by: { scene: '*' }, clue: 'Be there when something happens.', line: 'You were there when it happened, and you watched it all.' },
].map(r => Object.freeze(r)));
const VALE_HISTORY_ROW = new Map(VALE_HISTORY.map(r => [r.id, r]));
