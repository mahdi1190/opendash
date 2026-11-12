/* ============================================================
   GARDEN WONDER, the village folk and the vale's story (C:/tmp/gamedesign/FUN_PLAN.md #7 and #8; docs/dev/GARDEN_PLAN.md, "The folk").
   The callers (94-garden-wonder-1folk.js) get a home in the vale, a line for the day (weather, season, hour, what you did lately), a friendship that grows,
   a small favour now and then, and the hints for the gates. One light thread ties them together: the old mill, told in pieces as the regions open.

   THE CAST. Each has a home (a region id, and landmark ids from the layout, tried in turn: statics, placement anchors or plazas; no cells), and a few habits.
     the old angler  the pier on the Mere (static 'old-angler'). Slow, kind, tells legends, looks at his boots when he would rather not say. Starts the story.
     Mother Thistle  hedgehog, Whispering woodland (the Great Oak clearing). Calls you "dear", makes soup, reports on the frogs, watches things not happen.
     Pip             otter, Millwater valley (the mill race, the bridge). Always leaving, never gone; exclamation marks; "I can’t stay"; went up both ways.
     Tam             mole, the old woodland (the chapel). Deadpan, speaks from underneath, calls accidents "a feature", "Thought you’d want to know."
     Bramble         badger, Millwater valley (the mill yard). Maps everything, rubs things out, "it is always the same corner that is wrong".
     Quince          hare, High orchard (the cider square). Bees, weather sayings she admits she made up, counts the stair and gets a different answer.
     Wick            owl, Cloudbreak mountains (the hut, the cairn). Dry, tries to be mysterious and keeps being found out. "Look up. It’s free."
     Hollin          the woodcutter, the old woodland (a resident in 94-garden-wonder-1tales.js, found at home, never calling).
     Perpetua        snail, the post (94-garden-wonder-2post.js). Slow and proud of it; carries the letter at the end of the story.

   THE STORIES are data (94-garden-wonder-1tales.js; engine 94-garden-wonder-1tale.js; docs/dev/STORIES.md). The main line’s next teller comes that day, whatever the hour,
   and waits at home; this file adds their voice around it: the day’s line, wrong notes (WK_WRONG), the story setting (_wkDeep) and the care note (WK_CARE).

   THE GATES (WK_GATES, keyed by gate id: island-woods, island-mill, island-ruins, island-orchard, island-headland; items shears, plank, lantern, cog/mill, rope,
   the same ids as feat/find-gates' GARDEN_GATE_RULES / GARDEN_GATE_ITEMS). Who hints, in their own voice, plus a second voice (said in three places: the gate, the rumour, a caller).
   For the gates code to call:  wdFolkGateHint(gateId) -> {who, name, line} or null;  wdFolkGateHelpLine(gateId) -> what the helper says once the fallback opened it.
   The fallback giver: one level past a gate's own level, with its find still not found, the hinter hands it over in person (gardenGateTake, when that exists).

   SAVED (garden.wd, per player, local; nothing new in the snapshot): fh.<id> friendship points, fhl.<id> the level last thanked, fy.<id> the day of today's line,
   fq.<id> {d, k, done} a favour asked, fw.<id> a wrong note said, tg.<id> the day of a gate hint, ledger 'wk.<id>.<n>' / 'wkq.<id>.<day>' for gifts.
   ============================================================ */
const WK_HEARTS = Object.freeze([0, 3, 8, 15, 26]);
const WK_HEART_WORDS = Object.freeze(['', 'on nodding terms', 'friends', 'good friends', 'old friends']);
const WK_HOMES = Object.freeze({
  thistle: Object.freeze({ region: 'west-woods', near: Object.freeze(['great-oak-clearing', 'ld-bench-a', 'ld-hollow']), place: 'the Great Oak' }),
  pip: Object.freeze({ region: 'east-mill', near: Object.freeze(['ld-churn', 'ld-mill', 'mill-yard']), place: 'the mill race' }),
  tam: Object.freeze({ region: 'southwest-ruins', near: Object.freeze(['ld-chapel', 'ruin-court', 'ld-statue']), place: 'the old chapel' }),
  bramble: Object.freeze({ region: 'east-mill', near: Object.freeze(['mill-yard', 'ld-mill', 'ld-barn']), place: 'the mill yard' }),
  quince: Object.freeze({ region: 'orchard-headland', near: Object.freeze(['cider-square', 'ld-barrels', 'ld-ring']), place: 'the cider square' }),
  wick: Object.freeze({ region: 'north-headland', near: Object.freeze(['ld-hut', 'summit-cairn', 'ld-cairn']), place: 'the mountain hut' }),
});
/** What each gives when you become good friends: something of theirs for your garden. */
const WK_KEEPSAKE = Object.freeze({ tam: 'decor:boot-planter', bramble: 'decor:signpost', pip: 'decor:fish-flag', thistle: 'decor:hedgehog-house', wick: 'decor:stone-owl', quince: 'decor:bee-skep', angler: 'decor:bait-bucket' });
/* ---------- today's line: one a day each, picked from what is true now ---------- */
const WK_DAY = Object.freeze({
  thistle: [
    { if: F => F.rain, t: 'Rain, dear. The slugs are out in their best. I shall be busy.' },
    { if: F => F.snow, t: 'Snow! I ought to be asleep. I got up to look. Don’t tell anyone.' },
    { if: F => F.season === 'spring', t: 'Everything is coming up at once. It always does that. It never learns.' },
    { if: F => F.season === 'summer', t: 'Warm evening. The frogs are singing. Well. They think it is singing.' },
    { if: F => F.season === 'autumn', t: 'Leaves everywhere. Leave them, dear. Somebody small will be glad of them.' },
    { if: F => F.tod === 'dawn', t: 'You’re up early. So am I. I haven’t been to bed yet, so it hardly counts.' },
    { if: F => F.tod === 'night', t: 'Lovely and dark. You can hear the brook properly at this hour.' },
    { if: F => F.newPlant, t: F => `You put in a ${F.newPlant.toLowerCase()}. I had a good sniff. It will do very well.` },
    { if: F => F.fishRecent, t: F => `A ${F.fishRecent.toLowerCase()}, I heard. The frogs were very upset. They get over things.` },
    { if: F => F.ripe >= 2, t: 'Something is ready to pick. I am only saying. I have looked, not touched.' },
    { t: 'I made soup. It was mostly nettles. Nobody complained, which is not the same as liking it.' },
    { t: 'The frogs say hello. They didn’t, but they would if they talked.' },
  ],
  pip: [
    { if: F => F.rain, t: 'Rain! The river goes all fast and brown and happy. I’ve been in it four times.' },
    { if: F => F.snow, t: 'Snow on the water! It just vanishes. I tried to catch some. It vanished on me too.' },
    { if: F => F.season === 'spring', t: 'The river is high and full of news. I can’t tell you any of it. It’s river news.' },
    { if: F => F.season === 'summer', t: 'I lay on a rock all afternoon. It was the best thing I’ve done all week, and I’ve done loads.' },
    { if: F => F.season === 'autumn', t: 'Leaves go down the river like little boats. I raced one. I lost. It had a head start.' },
    { if: F => F.season === 'winter', t: 'Cold! Lovely! Everyone says cold like it’s a bad thing.' },
    { if: F => F.tod === 'dawn', t: 'Dawn is the best fishing. Don’t tell the fish I said so.' },
    { if: F => F.fishRecent, t: F => `You caught a ${F.fishRecent.toLowerCase()}! I saw! Well, I heard. Well, I guessed. Was I right?` },
    { if: F => F.bugRecent, t: F => `Was that you with the net? A ${F.bugRecent.toLowerCase()}! It looked surprised. So did you.` },
    { if: F => F.away >= 3, t: 'You went away! So did I! We should compare. You go first. No, me.' },
    { t: 'I can’t stay. I say that, and then I do stay, and then I really can’t.' },
    { t: 'Have you been down to the sea? It’s just there! It’s been there the whole time!' },
  ],
  tam: [
    { if: F => F.rain, t: 'Rain. Ceiling’s dripping. I’ve put a bucket under it. The bucket is also a worm now.' },
    { if: F => F.snow, t: 'Snow on top. Very quiet down below. Like being in a sock.' },
    { if: F => F.season === 'spring', t: 'Roots coming down everywhere. Spring is noisy, from underneath.' },
    { if: F => F.season === 'summer', t: 'Ground’s dry. Hard digging. I am going sideways for a bit.' },
    { if: F => F.season === 'autumn', t: 'Autumn. Things fall down. Some of them come through my roof. I keep them.' },
    { if: F => F.season === 'winter', t: 'Winter. I don’t mind it. It’s all the same, under here.' },
    { if: F => F.tod === 'night', t: 'Night, is it? I wouldn’t know. I only come up to check.' },
    { if: F => F.newPlant, t: F => `New ${F.newPlant.toLowerCase()} overhead. I felt it go in. Good roots.` },
    { if: F => F.finds >= 1, t: 'You’ve been digging too. I can tell. Your holes are very tidy. Mine aren’t.' },
    { t: 'Found a button. Not mine. I don’t have buttons. Kept it anyway.' },
    { t: 'Ground’s all right. Thought you’d want to know.' },
  ],
  bramble: [
    { if: F => F.rain, t: 'Rain. I can’t draw in the rain. I can, but it turns into a different map.' },
    { if: F => F.snow, t: 'Snow makes everything the same shape. Terrible for maps. Lovely to look at. I am torn.' },
    { if: F => F.season === 'spring', t: 'The paths move in spring. Grass gets over them. I have to start again. I always have to start again.' },
    { if: F => F.season === 'autumn', t: 'Autumn is good for maps. You can see the shape of things once the leaves go.' },
    { if: F => F.tod === 'dusk', t: 'Good light, this. Long shadows. Everything looks taller than it is, like on my maps.' },
    { if: F => F.moved, t: F => `The ${F.moved.toLowerCase()} has moved. I shall have to rub it out. I don’t mind. I mind a bit.` },
    { if: F => F.newPlant, t: F => `I’ve put your ${F.newPlant.toLowerCase()} on the map. In pencil. Things grow.` },
    { if: F => F.level >= 10, t: 'Your garden has got big. I need a bigger piece of paper. Or smaller handwriting.' },
    { t: 'I drew the falls today. They came out looking like a beard. I kept it.' },
    { t: 'It is always the same corner that is wrong. I am starting to think the corner is right and I am wrong.' },
  ],
  quince: [
    { if: F => F.rain, t: 'Rain. Bees indoors, grumbling. I’m out here, grumbling. We are very alike.' },
    { if: F => F.season === 'spring', t: 'Blossom on every tree! Bees off their heads with it. In a good way.' },
    { if: F => F.season === 'summer', t: 'Hot up the stair today. I counted the steps. Two hundred and four. They change.' },
    { if: F => F.season === 'autumn', t: 'Apples everywhere! Rain of apples. Mind your head. I didn’t, this morning.' },
    { if: F => F.season === 'winter', t: 'Bees are asleep in a ball, keeping warm. I tried it with the cat. The cat said no.' },
    { if: F => F.tod === 'dawn', t: 'Dawn! Dew on the webs. Bees aren’t up yet. It’s the only quiet hour I get.' },
    { if: F => F.blooms >= 4, t: 'All those flowers! The bees say thank you. Well. They hum. It means thank you.' },
    { if: F => F.newPlant, t: F => `A ${F.newPlant.toLowerCase()}! Bees will be down to look at that. Nosy things.` },
    { t: 'Rain before seven, fine by eleven. Made it up. Works about half the time, like all of them.' },
    { t: 'Honey’s good this year. I say that every year. It is good every year.' },
  ],
  wick: [
    { if: F => F.rain, t: 'Cloudy. Nothing to see up there tonight. I came out anyway. Habit.' },
    { if: F => F.snow, t: 'Snow on the tops. Very bright at night. I can see everything, which ruins it.' },
    { if: F => F.season === 'winter', t: 'Long nights. My favourite. More sky for the same money.' },
    { if: F => F.season === 'summer', t: 'Short nights. Barely time to look up before it’s over.' },
    { if: F => F.tod === 'dusk', t: 'You’re early. The stars aren’t out. Neither am I, really.' },
    { if: F => F.bugRecent, t: F => `You caught a ${F.bugRecent.toLowerCase()}. I saw you. I see most things. Sorry.` },
    { if: F => F.stars >= 3, t: 'You keep looking up now. I noticed. I didn’t say anything. I’m saying it now.' },
    { t: 'The one up there that looks like a kettle is a kettle. I named it. Nobody stopped me.' },
    { t: 'I was going to say something mysterious, and then I forgot it. That is also mysterious.' },
  ],
  angler: [
    { if: F => F.rain, t: 'Rain on the water. Fish come up to see what all the noise is. So do I.' },
    { if: F => F.snow, t: 'Snow. Fish go deep and think about things. Can’t blame them.' },
    { if: F => F.season === 'spring', t: 'Spring. Fish are hungry and careless. Me too, at their age.' },
    { if: F => F.season === 'summer', t: 'Warm water. Fish go lazy at noon. Come at dawn or dusk.' },
    { if: F => F.season === 'autumn', t: 'Autumn. Big ones come up before the cold. Patience. That’s all it is.' },
    { if: F => F.season === 'winter', t: 'Cold. Slow fishing. Slow is all right. I am mostly slow.' },
    { if: F => F.tod === 'dusk', t: 'Dusk. Best hour on the Mere. Things rise that don’t rise at noon.' },
    { if: F => F.tod === 'night', t: 'Night. You hear the falls better. Fish hear you better. Quiet, now.' },
    { if: F => F.fishRecent, t: F => `${F.fishRecent}, was it? Nice one. I had one like that, once. Bigger. They’re always bigger, once.` },
    { if: F => F.fishN >= 50, t: F => `${F.fishN} fish. You’re catching up with me. I’ve stopped counting. That’s my trick.` },
    { t: 'Been sitting here since before you came. Not waiting. Just sitting. It’s different.' },
    { t: 'Caught nothing today. Best day I’ve had all week.' },
  ],
});
/* ---------- a small favour: what they might ask for, once you know each other ---------- */
const WK_ASKS = Object.freeze({
  thistle: Object.freeze([['veg', 'something for the soup: a vegetable, any kind'], ['herb', 'a herb, for the soup. Soup without herbs is just hot water with ideas']]),
  pip: Object.freeze([['fish', 'a fish. Any fish! For a friend down the river. The friend is me']]),
  tam: Object.freeze([['veg', 'a vegetable. Something with roots. I like to see the other end of things'], ['fruit', 'a bit of fruit. For a visitor. The visitor is a beetle']]),
  bramble: Object.freeze([['fish', 'a fish. I want to draw one properly. Then eat it. In that order'], ['flower', 'a flower, to press in my map book. It keeps the page flat']]),
  quince: Object.freeze([['flower', 'a flower. The bees are sulking. Something new would cheer them up'], ['fruit', 'a bit of fruit, any kind, for a cake. I don’t bake. I want to try']]),
  wick: Object.freeze([['bug', 'a bug. Not to eat. To look at. I’m not hungry. I am a bit hungry']]),
  angler: Object.freeze([['bug', 'a bug, for bait. A good wriggly one'], ['veg', 'a vegetable for my supper. Fish every night gets you looking at people sideways']]),
});
const WK_ASK_WORD = Object.freeze({ fish: 'a fish', veg: 'a vegetable', herb: 'a herb', fruit: 'some fruit', flower: 'a flower', bug: 'a bug' });
function _wkMatch(tag, item) { if (tag === 'bug') return /^bug:/.test(item); try { return typeof _gpIngTag === 'function' && _gpIngTag(item) === tag; } catch (e) { return false; } }
/* ---------- the vale’s story: the stories themselves are data (94-garden-wonder-1tales.js, engine 94-garden-wonder-1tale.js) ---------- */
const _wkOpen = (m, n) => !!m && Array.isArray(m.areas) && m.areas.includes('zn-' + n);
/** The mill turns: the gates’ 'mill' find, the mill’s first mending, or the orchard open (so nobody is stuck on an older build). */
const _wkMill = (m) => { try { return (typeof gardenGateHas === 'function' && gardenGateHas('mill')) || (typeof _gpMillStage === 'function' && _gpMillStage() >= 1) || _wkOpen(m, 4); } catch (e) { return _wkOpen(m, 4); } };
/* The story setting: on (the default) is the full story, with its dark turns; off is the gentle telling (Settings > Garden). STORY_BIBLE: C:/tmp/folk/STORY_BIBLE.md. */
function _wkDeep() { try { return typeof _wdOn !== 'function' || _wdOn('story'); } catch (e) { return true; } }
/** A line in the right telling: {t, soft} (soft '' means the gentle telling leaves it out), or a plain string. */
function _wkSay(l) { if (l == null) return ''; if (typeof l === 'string') return l; return _wkDeep() || l.soft === undefined ? l.t : l.soft; }
const WK_CARE = Object.freeze({
  note: '(A note before this part: it touches on abuse and loss. You can choose a gentler story in Settings, under Garden.)',
  title: 'You’re not alone',
  text: ['If something in the story brought up something for you, that’s all right. It happens.', 'Talking to someone you trust can help: a friend, family, or your doctor.', 'A local helpline can listen too, any time, and you don’t have to give your name.', 'If you are in danger right now, call your local emergency number.'],
});
function wdKinCarePage() { wdPage({ title: WK_CARE.title, text: WK_CARE.text.slice(), sign: '' }); }

/* ---------- wrong notes: once each, the full telling only, on some days instead of the day’s line, after a piece of the main line ---------- */
const WK_WRONG = Object.freeze({
  angler: { after: 'mill.still', t: 'Caught nothing today. Best day I’ve had all week. Did I say that yesterday? I say it every day. It’s the same day, mostly.' },
  tam: { after: 'mill.ledger', t: 'There are some places I don’t dig. Not many. One.' },
  bramble: { after: 'mill.wheel', t: 'On my old map there’s a little person on the stepping stones. I didn’t draw it. It was there when I looked. I rub it out. It comes back.' },
  wick: { after: 'mill.wheel', t: 'I write letters sometimes, in other people’s handwriting. For practice. Forget I said that. I have.' },
});
function _wkWrong(id, today) {
  const w = WK_WRONG[id], W = _wdG(); if (!w || !_wkDeep() || W['fw.' + id] || typeof wdTaleSeen !== 'function' || !wdTaleSeen(w.after) || gardenHash('wkw|' + today + id) % 4) return '';
  W['fw.' + id] = today; return w.t;
}
/** Today’s caller, when someone has the next piece of the main line (the angler tells his at the pier; a resident at home; the post by post). */
function wdKinPick(m) { const t = typeof wdTaleMainNext === 'function' ? wdTaleMainNext(m) : null; return t && WD_FOLK_ROW.get(t.b.who) || null; }
/* ---------- the gates: who hints, in their own words ---------- */
const WK_GATES = Object.freeze({
  'island-woods': Object.freeze({ who: 'thistle', key: 'shears', zone: 1,
    hint: 'Those brambles over the arch? My good shears will do it, dear. I left them hanging on the bench by the reeds, where you can hear the falls.',
    early: 'There are brambles over the old arch to the woods. I have shears somewhere. Let me think where. Come and ask me again in a bit.',
    also: Object.freeze({ who: 'tam', t: 'Mother Thistle’s got shears. Sharp ones. She’d lend you them. She lends everything, then tells you how to use it.' }),
    give: 'Here, dear, take my shears. I fetched them myself. You have been ever so patient, and the woods have been waiting long enough.', after: 'I cut those brambles back for you, dear. My arms are still talking to me about it.' }),
  'island-mill': Object.freeze({ who: 'pip', key: 'plank', zone: 2,
    hint: 'There’s a plank gone from the causeway over the river! I’ve got a spare. I’ll swap it for a fish. Any fish! I’ll be by the old angler.',
    early: 'There’s a hole in the causeway. I jumped it! You shouldn’t. I’ll find a plank. Probably. Ask me later.',
    also: Object.freeze({ who: 'thistle', t: 'Pip has a plank, dear. Pip has everything, somewhere. Pip never knows where.' }),
    give: 'Here! A plank! I carried it all the way. I didn’t even need a fish. I wanted one, but I didn’t need one.', after: 'I laid a plank across the causeway for you! It only wobbles a bit. That’s the fun part.' }),
  'island-ruins': Object.freeze({ who: 'tam', key: 'lantern', zone: 3,
    hint: 'Dug up a lantern under the old stump in the woods. Still lights. Come and have it. I can’t see what I’d want with a light.',
    early: 'The old arch in the woods is dark inside. Darker than me. I am digging. I may find something. I usually do.',
    also: Object.freeze({ who: 'pip', t: 'Tam found a lantern! Tam told me! Well, Tam said “lantern” and went back underground.' }),
    give: 'Brought the lantern up for you. Lit it, even. Took three goes. Don’t look at my whiskers.', after: 'Left a lit lantern under the arch for you. It’s still going. More than I can say for most things.' }),
  'island-orchard': Object.freeze({ who: 'bramble', key: 'mill', item: 'cog', zone: 4,
    hint: 'The wheel lost a cog. I saw one propping a door open at the boathouse, by the quay. Fit it at the mill and the sluice comes up.',
    early: 'The orchard stair is shut, and the mill is still. I think the two are joined. I am drawing a line between them, in pencil, to see.',
    also: Object.freeze({ who: 'quince', t: 'The stair gate only opens when the mill turns. Bramble has a theory about it. Bramble has a theory about everything.' }),
    give: 'I went and got the cog from the boathouse for you. It was holding a door open. The door is cross. Fit it at the mill, and listen.', after: 'I mended the mill wheel for you, and the sluice is up. I drew it first, then did it. That’s the right order.' }),
  'island-headland': Object.freeze({ who: 'wick', key: 'rope', zone: 5,
    hint: 'Someone left a coil of rope on the old orchard wall, by the cider barrels. I watched them forget it. I didn’t say anything. I’m saying it now.',
    early: 'The pass is steep at the top. You would want a rope. I don’t. I have wings. That isn’t a boast. It is a bit of a boast.',
    also: Object.freeze({ who: 'quince', t: 'There’s a rope on my wall by the barrels. Not mine. Wick keeps staring at it, so I think Wick knows whose.' }),
    give: 'I brought you the rope from the orchard wall. Carried it up in my feet. You don’t need to know how.', after: 'I tied a rope on the steep bit for you. It’s a good knot. I don’t know any others.' }),
});
function _wkGateRow(id) { return WK_GATES[id] || null; }
function _wkGateZone(row) { return row && GARDEN_ZONES[row.zone] || null; }
function _wkGateKey(gateId) { const row = _wkGateRow(gateId); const rule = typeof GARDEN_GATE_RULES !== 'undefined' && GARDEN_GATE_RULES[gateId]; return rule && rule.key || (row && row.key) || ''; }
function _wkHas(key) { try { return typeof gardenGateHas === 'function' && gardenGateHas(key); } catch (e) { return false; } }
/** Is this gate shut, with its near side open (so a hint makes sense)? */
function _wkGateLive(gateId, m) {
  const row = _wkGateRow(gateId); if (!row || !m || m.visit || _wkOpen(m, row.zone)) return false;
  const region = typeof gardenIslandRegionForZone === 'function' ? gardenIslandRegionForZone(row.zone) : null, from = region ? region.fromZone || 0 : 0;
  return !from || _wkOpen(m, from);
}
/** For the gates code: who hints at this gate, and how, today. {who, name, line} or null. */
function wdFolkGateHint(gateId, m) {
  m = m || gardenModel(); const row = _wkGateRow(gateId); if (!row || !_wkGateLive(gateId, m)) return null;
  const who = row.who === 'angler' ? { name: 'The old angler' } : WD_FOLK_ROW.get(row.who), z = _wkGateZone(row);
  const findLv = typeof gardenGateFindLv === 'function' ? gardenGateFindLv(gateId) : z ? Math.max(1, z.lv - 2) : 1;
  return { who: row.who, name: who ? who.name : '', line: m.level.level >= findLv ? row.hint : row.early };
}
/** For the gates code: what the helper says once a gate opened by itself (the fallback). */
function wdFolkGateHelpLine(gateId) { const row = _wkGateRow(gateId); return row ? row.after : ''; }
/** One level past a gate's own level, its find not found: the hinter brings it. Only with the gates' finds in this build. */
function _wkFallbackDue(gateId, m) {
  if (typeof gardenGateTake !== 'function' || !_wkGateLive(gateId, m)) return false;
  const row = _wkGateRow(gateId), z = _wkGateZone(row), key = _wkGateKey(gateId); if (!z || !key) return false;
  if (_wkHas(key) || (row.item && _wkHas(row.item))) return false;
  return m.level.level >= z.lv + 1;
}
/* ---------- where they wait: at home, once you have met and their region is open ---------- */
function _wkAnchor(id) {
  const D = typeof GardenIslandLayout !== 'undefined' && GardenIslandLayout.data ? GardenIslandLayout.data : null; let row = null;
  if (D) {
    const pa = D.placementAnchors || {}; row = (pa.sights || {})[id] || (pa.features || {})[id] || (D.static || []).find(s => s.id === id) || null;
    if (!row && D.presentation && Array.isArray(D.presentation.plazas)) { const p = D.presentation.plazas.find(s => s.id === id); if (p) return { x: p.x, y: p.y }; }
    if (!row && D.presentation && D.presentation.storyAnchors && D.presentation.storyAnchors[id]) { const p = D.presentation.storyAnchors[id]; return { x: p.x, y: p.y }; }   // (points on things already drawn)
    if (!row && D.sectionCells && Array.isArray(D.sectionCells[id]) && D.sectionCells[id].length) { const cs = D.sectionCells[id]; return { x: cs.reduce((s, c) => s + c[0], 0) / cs.length + 0.5, y: cs.reduce((s, c) => s + c[1], 0) / cs.length + 0.5 }; }   // (a land section: its middle)
  }
  if (!row && typeof GARDEN_PROPS !== 'undefined') row = GARDEN_PROPS.find(p => p.id === id) || null;
  if (!row || !Number.isFinite(row.x) || !Number.isFinite(row.y)) return null;
  const d = row.door; return d && Number.isFinite(d.x) ? { x: d.x + 0.5, y: d.y + 0.5 } : { x: row.x + (row.w || 1) / 2, y: row.y + (row.h || 1) + 0.6 };
}
function _wkRegionZone(id) { try { const r = (gardenIslandData().regions || []).find(x => x.id === id); return r ? r.zone : null; } catch (e) { return null; } }
/** Are you near this one’s home (heavy moments are told at home, never in the village square)? */
function wdKinAtHome(who) { const H = WK_HOMES[who] || (typeof WD_TALE_RESIDENTS !== "undefined" && WD_TALE_RESIDENTS.get(who) || {}).home; if (!H || typeof _gw === "undefined") return false; for (const id of H.near) { const p = _wkAnchor(id); if (p && wdNear(p.x, p.y, 8)) return true; } return false; }
function wdKinHome(row) {
  const H = WK_HOMES[row.id]; if (!H || GARDEN_WORLD.v < 3) return null;
  const m = gardenModel(); if (m.visit) return null;
  const st = typeof wdTaleMainNext === 'function' ? wdTaleMainNext(m) : null, telling = !!st && st.b.who === row.id;
  if (!telling && !_wdGet('fv.' + row.id)) return null;   // the first time, they come to the village to meet you
  const z = _wkRegionZone(H.region); if (z == null || (z && !_wkOpen(m, z))) return null;
  for (const id of H.near) {
    const p = _wkAnchor(id); if (!p) continue;
    const to = wdFreeNear(p.x, p.y, 2); if (!to) continue;
    if (typeof gardenAreaOpenAt === 'function' && !gardenAreaOpenAt(Math.floor(to.x), Math.floor(to.y))) continue;
    let route = null; try { route = _gwRoute({ x: _gw.px, y: _gw.py }, to); } catch (e) { route = null; }
    if (!route) continue;
    if (Math.hypot(to.x - _gw.px, to.y - _gw.py) > 14) setTimeout(() => wdAmbient(`${row.name} is at ${H.place} today${telling ? ', and has something to tell you' : ''}.`, 9000, 'folk'), 1500);
    return to;
  }
  return null;
}
/* ---------- friendship ---------- */
function _wkPts(id) { return Number(_wdGet('fh.' + id)) || 0; }
function wdKinHeart(id) { const p = _wkPts(id); let n = 0; for (let i = 0; i < WK_HEARTS.length; i++) if (p >= WK_HEARTS[i]) n = i; return n; }
function _wkAdd(id, n) { const W = _wdG(); W['fh.' + id] = _wkPts(id) + n; }
function _wkGrant(key, item) { const g = _gdG(); if (!item || g.led[key]) return ''; g.led[key] = { d: _wdToday(), k: 'wd', i: { [item]: 1 }, n: 1 }; return item; }
function _wkSeed(salt) { try { const pool = GARDEN_PLANTS.filter(p => p.price > 0 && !p.unlock && gardenInSeason(p, gardenModel().season)); const p = pool.length ? pool[gardenHash(salt) % pool.length] : null; return p ? 'seed:' + p.id : 'fertiliser'; } catch (e) { return 'fertiliser'; } }
function _wkItemWords(item) {
  if (item.startsWith('decor:')) { const d = typeof gardenDecor === 'function' && gardenDecor(item.slice(6)); return d ? 'a ' + d.name.toLowerCase() : 'something for the garden'; }
  return typeof _wdItemWords === 'function' ? _wdItemWords(item) : 'something small';
}
const WK_HEART_LINES = Object.freeze({
  thistle: ['I’ve started saving you the good end of the soup, dear. Don’t tell the frogs.', 'You’re one of my regulars now. I have three. Two are frogs.', 'I want you to have this. It is a house for someone like me. Put it somewhere quiet. Somebody will find it.', 'You’re family now, dear. You don’t get a say in it. Nobody does.'],
  pip: ['I told a heron about you! It didn’t care. Herons don’t. But I told it!', 'I wrote your name on a rock at the top of the river. In mud. It’s probably gone. It was there!', 'Here! A flag! Put it up, and I’ll see it from the river and know I’m nearly back.', 'You’re my best friend in this whole vale. I’ve got a lot of friends. But you’re the one I come back for.'],
  tam: ['Dug a tunnel under your path. Thought you might want to drop in. Don’t. It’s small.', 'You’re all right, you are. I don’t say that. I’ve said it now.', 'Found this boot. Planted something in it. It’s for you. It’s a feature.', 'Been thinking. Mostly about you not being a mole. I’ve decided not to hold it against you.'],
  bramble: ['I have put you on the map. In ink. I have never put anyone in ink.', 'I drew you a little path to my door. On the map, I mean. It is a start.', 'Here. A signpost. It points at things. I like to know where things are, and so, I think, do you.', 'I have drawn the vale a hundred times. You’re in all the good ones.'],
  quince: ['The bees know your step now. They don’t sting it. That’s practically a hug.', 'I named a jar of honey after you. It’s on the top shelf. It’s the good shelf.', 'This is an old skep. A bee house. Put it near flowers, and wait. Bees like a patient person.', 'You’re an old friend now. Old friends are like old honey: they keep, and they go hard if you leave them. Visit.'],
  wick: ['You’re all right. For someone who looks at the ground.', 'I told the stars about you. They didn’t say anything. They never do. That’s why I like them.', 'Here. A stone owl. It doesn’t look like me. I asked it to. It wouldn’t.', 'I would show you something mysterious, but you have seen everything I know. That’s friendship, I suppose. Annoying.'],
  angler: ['You’re a proper angler now. You can tell because you’ve stopped telling people.', 'I’ve had this spot forty years. You can sit in it while I’m gone. Not when I’m here.', 'Here. My old bait bucket. It’s seen more fish than you have. Not for long, I think.', 'You and me and the Mere. That’s enough company for anyone.'],
});
/* ---------- facts for today ---------- */
function _wkFacts(F, m) {
  F.heart = wdKinHeart(F.id);
  try { F.fog = typeof wdTaleFog === 'function' && wdTaleFog(m); } catch (e) { F.fog = false; }
  try {
    const g = _gdG(), today = m.today, recent = (d) => d && _wdDaysBetween(d, today) <= 1;
    let fish = null, bug = null;
    for (const [id, e] of Object.entries(g.fl || {})) if (e && recent(e.l) && (!fish || String(e.l) > String(fish.l))) fish = { id, l: e.l };
    for (const [id, e] of Object.entries(g.bl || {})) if (e && recent(e.l) && (!bug || String(e.l) > String(bug.l))) bug = { id, l: e.l };
    if (fish && typeof gardenFishDef === 'function') { const d = gardenFishDef(fish.id); if (d) F.fishRecent = d.name; }
    if (bug && typeof GARDEN_BUGS !== 'undefined') { const d = GARDEN_BUGS.find(b => b.id === bug.id); if (d) F.bugRecent = d.name; }
  } catch (e) { /* no catches */ }
  return F;
}
function _wkDayLine(id, F, today) {
  const W = _wdG(); if (W['fy.' + id] === today) return '';
  const t = _wkDayPick(id, WK_DAY[id] || [], F, today); if (t) W['fy.' + id] = today; return t;
}
/** One line from a pool for today: what is true now wins most days. Rows: {if(F), t, soft, deep} (deep: only in the full telling, unless it has soft words). */
function _wkDayPick(id, rows, F, today) {
  const deep = _wkDeep(), pool = rows.filter(l => { if (!deep && (l.soft === '' || (l.deep && l.soft === undefined))) return false; try { return !l.if || !!l.if(F); } catch (e) { return false; } }); if (!pool.length) return '';
  const cond = pool.filter(l => l.if), list = cond.length && gardenHash('wkc|' + today + id) % 3 ? cond : pool;   // what is true today wins, most days
  const l = list[gardenHash('wk|' + today + '|' + id) % list.length], t = !deep && l.soft !== undefined ? l.soft : l.t;
  return typeof t === 'function' ? t(F) : t;
}
function _wkFresh(row, F) { const ok = (l) => { try { return !l.if || !!l.if(F); } catch (e) { return false; } }; return (WD_LINES[row.id] || []).some(l => !l.again && !_wdGet(`fs.${row.id}.${l.k}`) && ok(l)); }
/** Everything someone says when you walk up: the story first, then their news, today's line, a gate, a favour, friendship. {lines, actions, name}. */
function wdKinTalk(row, F, m, S) {
  const id = row.id, today = m.today, lines = [], actions = [];
  _wkFacts(F, m);
  const tale = typeof wdTaleFor === 'function' ? wdTaleFor(id, m) : null, firstToday = F.last !== today;
  if (!F.met) lines.push(..._wdLinesFor(row, F));   // hello
  if (tale) { const o = wdTaleTell(tale.s, tale.b); lines.push(...o.lines); actions.push(...o.actions); if (S) S.told = 1; }
  else if (F.met) {
    if (_wkFresh(row, F)) lines.push(..._wdLinesFor(row, F));
    else { const d = _wkWrong(id, today) || _wkDayLine(id, F, today); lines.push(...(d ? [d] : _wdLinesFor(row, F))); }
  }
  if (!tale || tale.s.kind !== 'arc') { _wkGateBits(id, m, lines, actions); _wkAsk(id, m, lines, firstToday && !tale); }
  if (firstToday) _wkAdd(id, 1);
  _wkHeartUp(id, row.name, lines);
  const h = wdKinHeart(id);
  return { lines: lines.filter(Boolean).slice(0, 9), actions, name: h ? `${row.name} (${WK_HEART_WORDS[h]})` : row.name };
}
function _wkGateBits(id, m, lines, actions) {
  const W = _wdG(), today = m.today; if (W['tg.' + id] === today) return;
  for (const gid of Object.keys(WK_GATES)) {
    const row = WK_GATES[gid];
    if (!_wkGateLive(gid, m)) {
      // the fallback opened it, or you did: the helper says so, once
      if (row.who === id && _wkOpen(m, row.zone) && !W['tga.' + gid] && typeof gardenZoneOpenLv === 'function' && !(_gdG().led['gt.' + gid])) { W['tga.' + gid] = today; lines.push(row.after); W['tg.' + id] = today; return; }
      continue;
    }
    if (row.who === id) {
      if (_wkFallbackDue(gid, m)) {
        const key = row.item || _wkGateKey(gid), name = typeof GARDEN_GATE_ITEMS !== 'undefined' && GARDEN_GATE_ITEMS[key] ? GARDEN_GATE_ITEMS[key].name.replace(/^(A|An|The) /, '').toLowerCase() : key;
        lines.push(row.give);
        actions.push({ label: 'Take the ' + name, primary: true, run: (T) => { if (gardenGateTake(key)) { _glSound && _glSound('twinkle'); T.say(`The ${name} is in your bag. Take it to the gate.`, []); } } });
      } else lines.push(wdFolkGateHint(gid, m).line);
      W['tg.' + id] = today; return;
    }
    if (row.also && row.also.who === id && !_wkHas(_wkGateKey(gid))) { lines.push(row.also.t); W['tg.' + id] = today; return; }
  }
}
function _wkAsk(id, m, lines, fresh) {
  const W = _wdG(), today = m.today, asks = WK_ASKS[id]; if (!asks || wdKinHeart(id) < 1) return;
  let q = W['fq.' + id];
  if (q && !q.done && _wdDaysBetween(q.d, today) > 6) { q = null; delete W['fq.' + id]; }   // forgotten, quietly: nobody minds
  if (q && !q.done) { if (fresh && q.d !== today) lines.push(`If you ever have ${WK_ASK_WORD[q.k]} spare, I’d still like one. No hurry at all.`); return; }
  if (!fresh || (q && _wdDaysBetween(q.d, today) < 3) || gardenHash('wkq|' + today + id) % 3) return;
  const a = asks[gardenHash('wka|' + today + id) % asks.length];
  W['fq.' + id] = { d: today, k: a[0] };
  lines.push(`Could I ask a favour? I’m after ${a[1]}. Only if you have one. Give it to me next time you see me.`);
}
function _wkHeartUp(id, name, lines) {
  const W = _wdG(), h = wdKinHeart(id), was = Number(W['fhl.' + id]) || 0; if (h <= was) return;
  W['fhl.' + id] = h;
  const L = WK_HEART_LINES[id]; if (L && L[h - 1]) lines.push(L[h - 1]);
  const item = h === 3 ? WK_KEEPSAKE[id] : h === 1 || h === 4 ? _wkSeed('wkh|' + id + h) : 'fertiliser';
  const got = _wkGrant(`wk.${id}.${h}`, item); _gdSave();
  if (got) lines.push(`(${name} gave you ${_wkItemWords(got)}. It is in your bag.)`);
}
/** Something given (94-garden-wonder-1folk.js): the favour they asked for, or a liked thing. The words they say instead, or null for the usual. */
function wdKinGave(row, b) {
  const W = _wdG(), id = row.id, today = _wdToday(), q = W['fq.' + id];
  if (q && !q.done && _wkMatch(q.k, b.item)) {
    W['fq.' + id] = Object.assign({}, q, { done: today }); _wkAdd(id, 3);
    const got = _wkGrant(`wkq.${id}.${today}`, gardenHash(id + today) % 2 ? _wkSeed('wkq|' + id + today) : 'fertiliser');
    const lines = [`${b.name}! That’s exactly what I was after. You remembered.`];
    _wkHeartUp(id, row.name, lines); _gdSave();
    return lines.join(' ') + (got ? ` (In return: ${_wkItemWords(got)}, in your bag.)` : '');
  }
  if (W['fgd.' + id] !== today) { W['fgd.' + id] = today; _wkAdd(id, row.likes === b.item.slice(0, b.item.indexOf(':')) ? 2 : 1); const lines = []; _wkHeartUp(id, row.name, lines); _gdSave(); if (lines.length) return (row.likes === b.item.slice(0, b.item.indexOf(':')) ? `A ${b.name.toLowerCase()}! Oh, you shouldn’t have. ` : `A ${b.name.toLowerCase()}. How kind. `) + lines.join(' '); }
  return null;
}
/* ---------- the old angler, at the pier: he talks once a day before the lake book ---------- */
const WK_ANGLER = Object.freeze({ id: 'angler', name: 'The old angler', likes: 'bug' });
function _wkAnglerArt() {
  const A = GART;
  return `<g>${A.P('#000000', A.ell(0, 0.5, 11, 3), 0.18)}${A.P('#4a4a3e', A.rrect(-6, -10, 5, 10, 1.6) + A.rrect(1, -10, 5, 10, 1.6))}${A.P('#5f6e4e', 'M-10 -8C-11 -22 -8 -30 0 -30C8 -30 11 -22 10 -8C5 -6 -5 -6 -10 -8z')}${A.P('#e0b894', A.ell(0, -36, 7, 7))}${A.P('#e8e4dc', 'M-6 -34C-6 -27 6 -27 6 -34C3 -31 -3 -31 -6 -34z')}${A.P('#7a6a48', A.ell(0, -42, 11, 2.4) + 'M-6 -42C-6 -48 6 -48 6 -42z')}${A.P('#1c1512', A.circ(-2.6, -37, 0.9) + A.circ(2.6, -37, 0.9))}${A.S('#8a6a44', 1.2, 'M9 -18L20 -46')}</g>`;
}
/** The angler is clicked: true when he talked (the lake book is a button), false to open the book as before. */
function wdAnglerTalk(p) {
  let m; try { m = gardenModel(); } catch (e) { return false; }
  if (m.visit || gardenFun() === 'off') return false;
  const W = _wdG(), today = m.today, tale = typeof wdTaleFor === 'function' ? wdTaleFor('angler', m) : null;
  if (!tale && W['fv.angler'] === today) return false;
  const F = _wkFacts(wdFacts(m, 'angler'), m), lines = [], actions = [];
  if (!F.met) lines.push('Evening. Or morning. I lose track, out here. I’m the old angler. That’s all anyone calls me, and I’ve stopped minding.');
  if (tale) { const o = wdTaleTell(tale.s, tale.b); lines.push(...o.lines); actions.push(...o.actions); }
  else { const d = _wkWrong('angler', today) || (wdTaleFlag && wdTaleFlag('mill.end') ? 'Wheel’s loud. Good.' : _wkDayLine('angler', F, today)); if (d) lines.push(d); }
  _wkAsk('angler', m, lines, F.last !== today && !tale);
  if (F.last !== today) _wkAdd('angler', 1);
  _wkHeartUp('angler', WK_ANGLER.name, lines);
  W['fv.angler'] = today; W['fn.angler'] = F.talks + 1; _wdSave();
  const at = p && p.door ? { x: p.door.x + 0.5, y: p.door.y + 0.5 } : { x: _gw.px, y: _gw.py };
  actions.push({ label: 'The lake book', primary: !actions.length, run: () => { wdTalkClose(true); gardenPopupOpen('catch', { sub: 'lake', title: 'The old angler' }); } });
  actions.push({ label: 'Give something', run: (T) => _wkAnglerGive(T) });
  const h = wdKinHeart('angler');
  wdTalk({ name: h ? `The old angler (${WK_HEART_WORDS[h]})` : 'The old angler', art: _wkAnglerArt(), lines: lines.length ? lines : ['Quiet today. Good.'], actions, at, bye: 'See you' });
  return true;
}
function _wkAnglerGive(T) {
  const bag = typeof _wdBagFor === 'function' ? _wdBagFor() : [];
  if (!bag.length) { T.say('Nothing in your basket? Then nothing is what I’ll have. I like nothing. It’s light.', []); return; }
  T.say('For me? Go on, then.', []);
  const go = T.el.querySelector('.wd-talk-go'), row = document.createElement('div'); row.className = 'wd-give';
  for (const b of bag) {
    const x = document.createElement('button'); x.type = 'button'; x.className = 'wd-give-b'; x.title = b.name; x.setAttribute('aria-label', 'Give ' + b.name); x.innerHTML = b.art;
    x.onclick = () => { row.remove(); _gdLed('wd', { i: { [b.item]: -1 }, n: 1 }); _gdSave(); T.say(wdKinGave(WK_ANGLER, b) || `A ${b.name.toLowerCase()}. Thank you. I’ll think of you when I’m eating it, or using it, or whatever it’s for.`, []); };
    row.appendChild(x);
  }
  go.parentNode.insertBefore(row, go);
}
/* ---------- the angler waves, once a day, when he has something to tell you ---------- */
wdMod({
  id: 'kin', pref: 'folk',
  begin() { },
  tick(m) {
    if (m.visit || _wd.t < 30 || _wd.still) return;
    const W = _wdG(), st = typeof wdTaleMainNext === 'function' ? wdTaleMainNext(m) : null; if (!st || st.b.who !== 'angler' || W['tw.angler'] === m.today) return;
    W['tw.angler'] = m.today; _wdSave();
    wdAmbient('The old angler on the pier lifts his hat to you. He looks as if he has a story.', 9000, 'folk');
  },
  end() { },
});
/* ---------- the post: a last letter, after the wheel turns (94-garden-wonder-2post.js reads WK_LETTERS) ---------- */
const WK_LETTERS = Object.freeze([
  { id: 'mill-turns', from: 'Perpetua', if: () => typeof wdTaleSeen === 'function' && !!wdTaleSeen('mill.mended'), days: 0, text: ['Post, and news, which I don’t usually do.', 'I heard the mill wheel from three fields off. For me that is about a week. I stopped and listened the whole way.', 'Everybody says it was you. I said I knew all along. I didn’t. I am saying it now, which is nearly the same.'], sign: 'Perpetua, Post' },
]);
