/* ============================================================
   GARDEN WONDER, stories (docs/dev/STORIES.md; the bible: STORY_BIBLE.md).
   Every story is plain data: the main line (the mill and the vale), character arcs (optional, opened by friendship and curiosity), and small stories (a scene or three).
   This file is the engine; the stories live in 94-garden-wonder-1tales.js (and any later file that calls wdTaleAdd).

   A story:  {id, kind: 'main' | 'arc' | 'small', title, journal (one line for the Stories page), gentle: 'keep' | 'soft' | 'skip', steps: [beat]}
             gentle: 'skip' hides the whole story in the gentle telling; 'soft' (and 'keep') use each line's soft words where it has them.
   A beat:   {id, who, when, lines, choice, set, give, heavy, sit, free, note}
     who     a caller id (tam, bramble, pip, thistle, wick, quince), 'angler' (the pier), a resident (wdTaleResident: hollin),
             'place' (said as you walk by: `near` anchor ids, `r` cells), 'catch' (comes up on your line or net), 'post' (a letter from `from`).
     when    {after: 'story.beat' | [...], days (since the last of those), open: [zone numbers], heart: n (with who) or {who: n}, season: [], tod: [],
              dry: 1, rain: 1, flag: {k: v}, noflag: [k], item: 'id' (in your bag), level: n, home: 1 (only at their home: heavy moments are told there), deep: 1 (only in the full telling), fish: [ids] (for 'catch'), weekday: [0-6], fog: 1 (a damp or cold dawn, for now)}
     lines   strings, or {t, soft, flag, noflag} (soft '' leaves it out of the gentle telling; flag/noflag: only when those flags are, or are not, set)
     choice  [{label, t, set: {flag: value}, mood: {who: n}}]: what you can say. No choice is the right one, and none pays.
     set     flags set when the beat is heard; give {item: n} (a small gift, once); heavy: 1 (the care note once before, and the quiet link beside it);
     sit     what happens if you just sit with them; free: 1 (does not wait for the beat before it); care: 1 (the care note once, before a beat that leads up to a heavy one).
     give    {item: n}: a garden item ('honey', 'seed' (one of the season), 'seed:x', 'decor:x'), a keepsake ('keep:x', WD_TALE_KEEPS) or a recipe ('recipe:x': a craft recipe if
             there is one, else a story recipe in WD_TALE_RECIPES). A decor or food id the catalogue doesn't have yet is kept as a keepsake of that id, never lost.
     A place beat with choice or sit opens as a conversation (name: who is there, if anyone); without, it is noticed in passing.
     'traveller' (who): someone passing through, drawn at `near` (default: the quay) while their beat is ready: name, look {kind, fur, coat, hat, hatc}.
     near    anchor ids. An anchor the layout doesn't have yet is looked for by its landmark name (WD_TALE_ANCHORS), then its fallbacks.
   Beats in a story go in order unless free; one beat a day per story; at most one heavy beat a day, never on a day the main line moved, and nothing else from
   the stories for the rest of a day with a heavy beat in it (ordinary life after).
   SAVED (garden.wd, per player, never in the snapshot): sx.<story>.<beat> the day heard, sf.<flag> flags, sc.<story>.<beat> the choice, cn (the care note was shown).
   ============================================================ */
const WD_TALES = [];
const WD_TALE_BY = new Map();
/** Add a story (any later file may). */
/** Take a story out (a later file replacing an earlier draft). */
function wdTaleDrop(id) { const s = WD_TALE_BY.get(id); if (!s) return; WD_TALE_BY.delete(id); WD_TALES.splice(WD_TALES.indexOf(s), 1); }
/** Add a beat to a story already added: at the end, or after the beat with id 'after'. */
function wdTaleBeat(storyId, beat, after) { const s = WD_TALE_BY.get(storyId); if (!s || !beat || s.steps.some(b => b.id === beat.id)) return; const i = after ? s.steps.findIndex(b => b.id === after) : -1; if (i >= 0) s.steps.splice(i + 1, 0, beat); else s.steps.push(beat); }
function wdTaleAdd(story) { if (!story || !story.id || WD_TALE_BY.has(story.id)) return; story.steps = (story.steps || []).filter(Boolean); WD_TALES.push(story); WD_TALE_BY.set(story.id, story); }
const WD_TALE_RESIDENTS = new Map();
/** A resident who lives at a place and is found there (not a caller): {id, name, art (svg), home: {region, near: [anchor ids]}, deep, day: [lines]}. */
function wdTaleResident(r) { if (r && r.id) WD_TALE_RESIDENTS.set(r.id, r); }
function _wtW() { return _wdG(); }
function wdTaleFlag(k) { return _wtW()['sf.' + k]; }
function _wtSeen(story, beat) { return _wtW()[`sx.${story}.${beat}`]; }
function wdTaleSeen(ref) { const [s, b] = String(ref).split('.'); return b ? _wtSeen(s, b) : Object.keys(_wtW()).some(k => k.startsWith(`sx.${s}.`)); }
function _wtDeep() { return typeof _wkDeep === 'function' ? _wkDeep() : true; }
function _wtHeart(who) { return typeof wdKinHeart === 'function' ? wdKinHeart(who) : 0; }
function _wtOpen(m, n) { return !n || (Array.isArray(m.areas) && m.areas.includes('zn-' + n)); }
/** Is this beat’s `when` true now? */
function _wtWhen(w, m, who) {
  if (!w) return true;
  const today = m.today, list = (v) => Array.isArray(v) ? v : v == null ? [] : [v];
  if (w.deep && !_wtDeep()) return false;
  if (w.level && m.level.level < w.level) return false;
  for (const n of list(w.open)) if (!_wtOpen(m, n)) return false;
  let last = '';
  for (const ref of list(w.after)) { const d = wdTaleSeen(ref); if (!d) return false; if (typeof d === 'string' && d > last) last = d; }
  if (w.days && last && _wdDaysBetween(last, today) < w.days) return false;
  if (w.heart != null) { const H = typeof w.heart === 'object' ? w.heart : { [who]: w.heart }; for (const [k, n] of Object.entries(H)) if (_wtHeart(k) < n) return false; }
  if (w.season && !list(w.season).includes(m.season)) return false;
  if (w.weekday != null && !list(w.weekday).includes(new Date(m.today + 'T12:00:00').getDay())) return false;   // 0 Sunday … 6 Saturday
  if (w.fog && !wdTaleFog(m)) return false;
  if (w.tod && !list(w.tod).includes(m.tod)) return false;
  if (w.dry && m.rain && m.rain.now) return false;
  if (w.rain && !(m.rain && m.rain.now)) return false;
  if (w.flag) for (const [k, v] of Object.entries(w.flag)) if (v === true ? !wdTaleFlag(k) : wdTaleFlag(k) !== v) return false;
  for (const k of list(w.noflag)) if (wdTaleFlag(k)) return false;
  if (w.home && !(typeof wdKinAtHome === 'function' && wdKinAtHome(who))) return false;
  if (w.item && !(typeof gardenHas === 'function' && gardenHas(w.item) > 0)) return false;
  if (typeof w.test === 'function') { try { if (!w.test(m)) return false; } catch (e) { return false; } }
  return true;
}
function _wtStoryOn(s) { return !(s.gentle === 'skip' && !_wtDeep()); }
/** The next beat of a story that is ready now, or null (in order, one a day). */
function _wtNext(s, m, who) {
  if (!_wtStoryOn(s)) return null;
  const W = _wtW(), today = m.today; let heardToday = false;
  if (_wtHeavyToday()) return null;   // a heavy moment today: the rest of the day is ordinary life
  for (const b of s.steps) if (!b.free && W[`sx.${s.id}.${b.id}`] === today) heardToday = true;
  for (let i = 0; i < s.steps.length; i++) {
    const b = s.steps[i]; if (W[`sx.${s.id}.${b.id}`]) continue;   // (in order: the first beat not yet heard and not free is the only one that can come)
    if (heardToday && !b.free) return null;
    if (who && b.who !== who) { if (!b.free) return null; continue; }
    if (b.heavy && (_wtHeavyToday() || _wtMainToday())) { if (!b.free) return null; continue; }   // one heavy moment a day, and never on a day the main line moved
    if (!_wtWhen(b.when, m, b.who)) { if (!b.free) return null; continue; }
    return b;
  }
  return null;
}
function _wtMainToday() { const W = _wtW(), t = _wdToday(); for (const s of WD_TALES) if (s.kind === "main") for (const b of s.steps) if (W[`sx.${s.id}.${b.id}`] === t) return true; return false; }
function _wtHeavyToday() { const W = _wtW(); return W.hv === _wdToday(); }
/** Fog: the live weather's fog or mist, or (until the vale draws its own) a damp or cold dawn. */
function wdTaleFog(m) {
  try { const w = typeof _gdWeather === 'function' ? _gdWeather() : null, c = w && w.current && w.current.cond; if (c === 'fog' || c === 'mist') return true; } catch (e) { /* no weather */ }
  return !!m && m.tod === 'dawn' && ((m.rain && m.rain.now) || m.season === 'autumn' || m.season === 'winter');
}
const _WT_RANK = { main: 0, arc: 1, small: 2 };
/** The beat this speaker would tell now, with its story: main line first, then arcs, then small stories. */
function wdTaleFor(who, m) {
  if (!m || m.visit) return null;
  const rows = WD_TALES.slice().sort((a, b) => (_WT_RANK[a.kind] || 2) - (_WT_RANK[b.kind] || 2));
  for (const s of rows) { const b = _wtNext(s, m, who); if (b) return { s, b }; }
  return null;
}
/** The main line’s next beat (any speaker): who should come today. */
function wdTaleMainNext(m) { if (!m || m.visit) return null; for (const s of WD_TALES) if (s.kind === 'main') { const b = _wtNext(s, m, ''); if (b) return { s, b }; } return null; }
function _wtLine(l) {
  if (l == null) return '';
  if (typeof l === 'string') return l;
  if (l.flag) for (const [k, v] of Object.entries(l.flag)) if (v === true ? !wdTaleFlag(k) : wdTaleFlag(k) !== v) return '';
  for (const k of l.noflag || []) if (wdTaleFlag(k)) return '';
  return _wtDeep() || l.soft === undefined ? l.t : l.soft;
}
function _wtChoiceT(c) { return c.t && typeof c.t === 'object' ? _wtLine(c.t) : _wtLine({ t: c.t, flag: c.flag, noflag: c.noflag }); }
function _wtChoiceLabel(c) { return !_wtDeep() && c.softLabel ? c.softLabel : c.label; }
/* ---------- keepsakes and recipes from the stories: kept in garden.wd (kp.<id>, rp.<id>), shown on the Stories page, never in the snapshot ---------- */
const WD_TALE_KEEPS = new Map();
const WD_TALE_RECIPES = new Map();
/** A keepsake: {id, name, text}. A recipe: {id, name, from, text: [lines]}. Any later file may add more. */
function wdTaleKeep(k) { if (k && k.id) WD_TALE_KEEPS.set(k.id, k); }
function wdTaleRecipe(r) { if (r && r.id) WD_TALE_RECIPES.set(r.id, r); }
function _wtGiveOne(item, salt) {
  const W = _wtW(), today = _wdToday(), kind = String(item).split(':')[0], id = String(item).slice(kind.length + 1);
  const keep = (kid) => { const k = WD_TALE_KEEPS.get(kid); W['kp.' + kid] = W['kp.' + kid] || today; return `(${k ? k.name : 'A keepsake'}: kept on the Stories page, under Keepsakes.)`; };
  if (kind === 'keep') return keep(id);
  if (kind === 'recipe') {
    if (typeof gardenRecipe === 'function' && gardenRecipe(id)) return _wkGrant('wt.' + salt, item) ? `(A recipe: ${gardenRecipe(id).name}. In your crafting book.)` : '';
    const r = WD_TALE_RECIPES.get(id); W['rp.' + id] = W['rp.' + id] || today; return `(${r ? r.name : 'A recipe'}: written in at the back of the Stories page.)`;
  }
  if (kind === 'decor' && !(typeof gardenDecor === 'function' && gardenDecor(id))) return keep(id);
  if (kind === 'food') return keep(id);
  const real = item === 'seed' ? _wkSeed('wt|' + salt) : item;
  if (!_wkGrant('wt.' + salt, real)) return '';
  const words = real === 'honey' ? 'a jar of honey' : typeof _wkItemWords === 'function' ? _wkItemWords(real) : 'something';
  return `(${words}: in your bag.)`.replace(/^\((.)/, (x, c) => '(' + c.toUpperCase());
}
/** Hear a beat: {lines, actions}. Marks it heard, sets its flags, gives its gift once. */
function wdTaleTell(s, b, o) {
  const W = _wtW(), today = _wdToday(), lines = [], actions = [];
  if ((b.heavy || b.care) && _wtDeep() && !W.cn) { W.cn = today; lines.push(WK_CARE.note); }
  for (const l of b.lines || []) { const t = _wtLine(l); if (t) lines.push(t); }
  W[`sx.${s.id}.${b.id}`] = today; if (b.heavy) W.hv = today;
  for (const [k, v] of Object.entries(b.set || {})) W['sf.' + k] = v;
  if (b.give && !W[`sg.${s.id}.${b.id}`]) { W[`sg.${s.id}.${b.id}`] = today; Object.keys(b.give).forEach((item, i) => { const t = _wtGiveOne(item, `${s.id}.${b.id}${i ? '.' + i : ''}`); if (t) lines.push(t); }); }
  _wdSave();
  const after = (o && o.after) || null;
  for (const c of b.choice || []) actions.push({ label: _wtChoiceLabel(c), primary: true, run: (T) => { if (W[`sc.${s.id}.${b.id}`]) return; W[`sc.${s.id}.${b.id}`] = c.k || c.label; for (const [k, v] of Object.entries(c.set || {})) W['sf.' + k] = v; for (const [who, n] of Object.entries(c.mood || {})) if (typeof _wkAdd === 'function') _wkAdd(who, n); _wdSave(); T.say(_wtChoiceT(c) || '…', b.sit ? [{ label: 'Sit for a while', run: (T2) => T2.say(_wtLine(b.sit), _wtCare(b)) }].concat(_wtCare(b)) : _wtCare(b)); if (after) after(c); } });
  if (b.sit) actions.push({ label: 'Sit for a while', primary: !(b.choice || []).length, run: (T) => T.say(_wtLine(b.sit), _wtCare(b)) });
  actions.push(..._wtCare(b));
  return { lines, actions };
}
function _wtCare(b) { return b.heavy && _wtDeep() ? [{ label: 'If this brings anything up', run: () => { if (typeof wdKinCarePage === 'function') wdKinCarePage(); } }] : []; }
/* ---------- places, catches and the post ---------- */
const _wt = { near: new Set(), res: new Map(), trav: null };
/* Anchors the stories name before the layout has them, keyed to the landmark's name (the layout may add either the id or a landmark of that name), with fallbacks.
   Cells are the layout's business (feat/vale-integration): nothing here is a position. */
const WD_TALE_ANCHORS = Object.freeze({
  'ld-woodhut': { name: 'The woodcutter’s hut', region: 'southwest-ruins', fall: ['ld-labyrinth', 'ld-tower'] },
  'ld-oldhouse': { name: 'The old house', region: 'west-woods', fall: ['ld-hollow', 'great-oak-clearing'] },
  'ld-ruined-arch': { name: 'The ruined arch', region: 'southwest-ruins', fall: ['ruined-arch', 'ruin-court'] },
  'ld-quince': { name: 'The brook past the arch', region: 'southwest-ruins', fall: ['ruin-court', 'ld-ruined-arch'] },
  'ld-bell': { name: 'The orchard bell', region: 'orchard-headland', fall: ['cider-square', 'ld-ring'] },
  'ld-falls-cave': { name: 'The cave behind the falls', region: 'west-woods', fall: ['ld-falls'] },
  'ld-lamp-room': { name: 'The lamp room', region: 'harbour-bay', fall: ['ld-lighthouse'] },
  'ld-mill-office': { name: 'The mill office', region: 'east-mill', fall: ['ld-mill', 'mill-yard'] },
  'ld-hothouse': { name: 'The hothouse', region: 'home-island', fall: ['lc-glasshouse'] },
  'ld-terrace-bench': { name: 'The terrace bench', region: 'orchard-headland', fall: ['ls-thyme-terrace', 'cider-square'] },
  'ld-boathouse': { name: 'The boathouse', region: 'east-mill', fall: ['ls-boat-bank', 'ld-hull'] },
  'ld-cairn': { name: 'The summit cairn', region: 'north-headland', fall: ['summit-cairn', 'ld-beacon'] },
  'ld-hull': { name: 'The old hull', region: 'harbour-bay', fall: ['jetty-post'] },
  'ld-orchard-wall': { name: 'The orchard wall', region: 'orchard-headland', fall: ['cider-square'] },
  'ld-icehouse': { name: 'The ice house', region: 'east-mill', fall: ['ld-mill', 'mill-yard'] },
  'ld-quay': { name: 'The quay', region: 'harbour-bay', fall: ['the-quay', 'jetty-post', 'harbour-walk', 'tackle-shop', 'ld-hull'] },
  // the vale's squares and sights (layout v5), each falling back to the older layout's landmark nearest in kind, so no story waits on the layout
  'ruin-court': { name: 'Ruin court', region: 'southwest-ruins', fall: ['ld-chapel', 'ld-statue'] },
  'ruined-arch': { name: 'Ruined arch', region: 'southwest-ruins', fall: ['ld-ruined-arch', 'ruin-court', 'ld-chapel'] },
  'great-oak-clearing': { name: 'The Great Oak', region: 'west-woods', fall: ['ld-hollow', 'ld-bench-a'] },
  'cider-square': { name: 'Cider square', region: 'orchard-headland', fall: ['ld-barrels', 'ld-ring'] },
  'mill-yard': { name: 'The mill yard', region: 'east-mill', fall: ['ld-mill', 'ld-barn'] },
  'summit-cairn': { name: 'The summit', region: 'north-headland', fall: ['ld-cairn', 'ld-beacon'] },
  'west-rockpool': { name: 'Wren cove', region: 'west-woods', fall: ['ld-driftwood', 'ld-bench-b'] },
  'ls-otter-beach': { name: 'Otter beach', region: 'southwest-ruins', fall: ['ld-driftwood', 'ld-bench-b'] },
  'lc-cottage-bed': { name: 'The cottage bed', region: 'home-island', fall: ['ld-wish', 'ld-statue'] },
  'lc-front-bed': { name: 'The front bed', region: 'home-island', fall: ['ld-wish', 'ld-statue'] },
  'lc-the-green': { name: 'The green', region: 'home-island', fall: ['ld-cross', 'ld-bench-a'] },
  'lc-fountain-green': { name: 'The fountain green', region: 'home-island', fall: ['ld-cross'] },
  'lc-glasshouse': { name: 'The glasshouse', region: 'home-island', fall: ['ld-house'] },
  'ls-frog-steps': { name: 'The frog steps', region: 'east-mill', fall: ['ld-frog'] },
  'ls-allot-row': { name: 'The allotments', region: 'east-mill', fall: ['ld-field-wall', 'ld-hay'] },
  'ls-bean-beds': { name: 'The bean beds', region: 'east-mill', fall: ['ld-field-wall', 'ld-hay'] },
  'ls-first-furrow': { name: 'The first furrow', region: 'east-mill', fall: ['ld-field-wall'] },
  'ls-pea-sticks': { name: 'The pea sticks', region: 'east-mill', fall: ['ld-field-wall'] },
  'ls-bean-corner': { name: 'The bean corner', region: 'east-mill', fall: ['ld-hay'] },
  'ls-heronry': { name: 'The heronry', region: 'east-mill', fall: ['ld-hide'] },
  'ls-heron-isle': { name: 'Heron isle', region: 'east-mill', fall: ['ld-hide'] },
  'ls-owl-wood': { name: 'Owl wood', region: 'west-woods', fall: ['ld-hollow'] },
  'ls-hazel-copse': { name: 'The hazel copse', region: 'west-woods', fall: ['ld-hollow'] },
  'ls-thyme-terrace': { name: 'The thyme terrace', region: 'orchard-headland', fall: ['ld-orchard-wall'] },
  'ls-espalier': { name: 'The espalier', region: 'orchard-headland', fall: ['ld-orchard-wall'] },
  'ls-walled-garden': { name: 'The walled garden', region: 'southwest-ruins', fall: ['ld-orchard-wall'] },
  'ls-nursery': { name: 'The nursery rows', region: 'orchard-headland', fall: ['ld-orchard-wall', 'ld-arch-e'] },
  'ls-moon-pool': { name: 'The moon pool', region: 'orchard-headland', fall: ['ld-sunk', 'ld-ring'] },
  'ls-clear-pool': { name: 'The clear pool', region: 'orchard-headland', fall: ['ld-sunk', 'ld-ring'] },
  'ls-old-plum': { name: 'The old plum', region: 'orchard-headland', fall: ['ld-treehouse'] },
  'ls-sun-terrace': { name: 'The sun terrace', region: 'orchard-headland', fall: ['ld-folly'] },
  'ls-bee-bank': { name: 'The bee bank', region: 'orchard-headland', fall: ['ld-boles'] },
  'ls-warm-stones': { name: 'The warm stones', region: 'north-headland', fall: ['ld-stones'] },
  'ls-windy-flats': { name: 'The windy flats', region: 'north-headland', fall: ['ld-stones'] },
  'ls-world-end': { name: 'World’s end', region: 'north-headland', fall: ['ld-stones', 'ld-cairn'] },
  'ls-far-shore': { name: 'The far shore', region: 'north-headland', fall: ['ld-stones'] },
  'ls-mist-meadow': { name: 'Mist meadow', region: 'north-headland', fall: ['ld-hut'] },
  'ls-long-view': { name: 'The Long View', region: 'north-headland', fall: ['ld-hut', 'ld-beacon'] },
  'ls-high-pasture': { name: 'The high pasture', region: 'north-headland', fall: ['ld-hut'] },
});
function _wtByName(name) {
  try {
    const D = typeof GardenIslandLayout !== 'undefined' && GardenIslandLayout.data ? GardenIslandLayout.data : null;
    const row = (D && (D.static || []).find(s => s.name === name)) || (typeof GARDEN_PROPS !== 'undefined' ? GARDEN_PROPS.find(p => p.name === name) : null);
    return row && row.id && typeof _wkAnchor === 'function' ? _wkAnchor(row.id) : null;
  } catch (e) { return null; }
}
/** Where an anchor is: its id, else a landmark with its name, else its fallbacks. null when none of them is in this layout. */
function wdTaleAnchor(id, depth) {
  const p = typeof _wkAnchor === 'function' ? _wkAnchor(id) : null; if (p) return p;
  const A = WD_TALE_ANCHORS[id]; if (!A) return null;
  const n = _wtByName(A.name); if (n) return n;
  if ((depth || 0) < 3) for (const f of A.fall) { const q = wdTaleAnchor(f, (depth || 0) + 1); if (q) return q; }
  return null;
}
function _wtAnchorPt(ids) { for (const id of ids || []) { const p = wdTaleAnchor(id); if (p) return p; } return null; }
function _wtPlaces(m) {
  for (const s of WD_TALES) {
    if (!_wtStoryOn(s)) continue;
    const W = _wtW(), next = _wtNext(s, m, '');
    for (const b of s.steps) {
      // every free place beat that is ready, and the story's next beat if it is a place (a traveller speaks at the quay as a place does, for now)
      if (b.who !== 'place' || W[`sx.${s.id}.${b.id}`] || _wt.near.has(s.id + b.id) || !(b.free || b === next)) continue;
      if (b.heavy && (_wtHeavyToday() || _wtMainToday())) continue;
      if (!_wtWhen(b.when, m, b.who)) continue;
      const p = _wtAnchorPt(b.near); if (!p || !wdNear(p.x, p.y, b.r || 3)) continue;
      if (((b.choice && b.choice.length) || b.sit) && _wd.talk) return;   // a place you can stop at waits until you are free
      _wt.near.add(s.id + b.id);
      if ((b.choice && b.choice.length) || b.sit) { const o = wdTaleTell(s, b); wdTalk({ name: _wtLine(b.name) || '', lines: o.lines, actions: o.actions, at: { x: _gw.px, y: _gw.py }, bye: 'Walk on' }); return; }
      const t = wdTaleTell(s, b).lines.join(' '); if (t) wdAmbient(t, 11000, 'story');
      return;   // one thing noticed at a time
    }
  }
}
document.addEventListener('opendash:garden', (e) => {
  const d = e.detail || {}; if (d.kind !== 'fish' && d.kind !== 'bug') return;
  try {
    const m = gardenModel(); if (m.visit) return;
    for (const s of WD_TALES) { const b = _wtNext(s, m, 'catch'); if (!b || (b.when && b.when.fish && !b.when.fish.includes(d.id))) continue; const t = wdTaleTell(s, b).lines.join(' '); if (t) setTimeout(() => wdAmbient(t, 11000, 'story'), 2600); return; }
  } catch (x) { /* later */ }
});
/** A letter that may come today from a story (94-garden-wonder-2post.js asks), as a letter row. */
function wdTaleLetterDue(m) {
  for (const s of WD_TALES) { const b = _wtNext(s, m, 'post'); if (b) return _wtLetterRow(s, b); }
  return null;
}
function _wtLetterRow(s, b) { return { id: `tale.${s.id}.${b.id}`, from: b.from || 'Someone', text: (b.lines || []).map(_wtLine).filter(Boolean), sign: b.sign || b.from || '', _tale: [s.id, b.id] }; }
/** Letter rows for letters already come (the Keepsakes list). */
function wdTaleLetterRow(id) { const p = String(id).split('.'); if (p[0] !== 'tale') return null; const s = WD_TALE_BY.get(p[1]), b = s && s.steps.find(x => x.id === p[2]); return b ? _wtLetterRow(s, b) : null; }
function wdTaleLettersHad() { const W = _wtW(), out = []; for (const k of Object.keys(W)) if (k.startsWith('l.tale.')) { const r = wdTaleLetterRow(k.slice(2)); if (r) out.push(r); } return out; }
/** When a story letter arrives: it counts as heard. */
function wdTaleLetterCame(r) { if (r && r._tale) { const W = _wtW(); W[`sx.${r._tale[0]}.${r._tale[1]}`] = _wdToday(); const s = WD_TALE_BY.get(r._tale[0]), b = s && s.steps.find(x => x.id === r._tale[1]); for (const [k, v] of Object.entries((b && b.set) || {})) W['sf.' + k] = v; } }
/* ---------- travellers: someone passing through, drawn where their beat is (the quay, by default) until it is heard ---------- */
const WD_TALE_TRAVELLER_LOOK = Object.freeze({ kind: 'hare', fur: '#9a8a74', coat: '#6a7a8a', snout: '#e8dccb', hat: 'wide', hatc: '#5a5048', prop: 'bag' });
function _wtTravellerNext(m) {
  for (const s of WD_TALES) { if (!_wtStoryOn(s)) continue; const b = _wtNext(s, m, 'traveller'); if (b) return { s, b }; }
  return null;
}
function _wtTravellers(m) {
  const t = _wtTravellerNext(m), cur = _wt.trav;
  if (cur && (!t || cur.key !== t.s.id + '.' + t.b.id)) { cur.S.remove(); _wt.trav = null; }
  if (!t || _wt.trav) return;
  const p = _wtAnchorPt(t.b.near || ['ld-quay']); if (!p) return;
  const to = wdFreeNear(p.x, p.y, 2); if (!to) return;
  if (typeof gardenAreaOpenAt === 'function' && !gardenAreaOpenAt(Math.floor(to.x), Math.floor(to.y))) return;
  const look = Object.assign({ id: 'traveller' }, WD_TALE_TRAVELLER_LOOK, t.b.look || {}), name = t.b.name || 'A traveller';
  const open = () => {
    if (W[`sx.${t.s.id}.${t.b.id}`]) return;   // heard already (it goes at the next tick)
    const o = wdTaleTell(t.s, t.b); wdTalk({ name, art: _wdFolkArt(look), lines: o.lines, actions: o.actions, at: { x: S.x, y: S.y }, bye: 'Goodbye' });
  };
  const W = _wtW(), S = wdSprite({ id: 'wt-trav', x: to.x, y: to.y, still: true, hit: 0.75, hitUp: 16, label: name, cursor: 'hand', svg: _wdFolkArt(look), onClick: open });
  _wt.trav = { key: t.s.id + '.' + t.b.id, S, open };
}
/* ---------- residents: found at home, never calling ---------- */
function _wtResPlace(r, m) {
  if (_wt.res.has(r.id)) return;
  if (r.deep && !_wtDeep()) return;
  if (typeof r.here === 'function' && !r.here(m)) return;
  const z = typeof _wkRegionZone === 'function' ? _wkRegionZone(r.home.region) : 0; if (z == null || !_wtOpen(m, z)) return;
  const p = _wtAnchorPt(r.home.near); if (!p) return;
  const to = wdFreeNear(p.x, p.y, 2); if (!to) return;
  if (typeof gardenAreaOpenAt === 'function' && !gardenAreaOpenAt(Math.floor(to.x), Math.floor(to.y))) return;
  const S = wdSprite({ id: 'wt-' + r.id, x: to.x, y: to.y, still: true, hit: 0.75, hitUp: 16, label: r.name, cursor: 'hand', svg: r.art(), onClick: () => _wtResTalk(r, S) });
  _wt.res.set(r.id, S);
}
function _wtResTalk(r, S) {
  const m = gardenModel(), W = _wtW(), today = m.today, F = wdFacts(m, r.id), lines = [], actions = [];
  const t = wdTaleFor(r.id, m);
  if (t) { const o = wdTaleTell(t.s, t.b); lines.push(...o.lines); actions.push(...o.actions); }
  else if (W['fy.' + r.id] !== today && (r.dayRows || r.day)) { const rows = r.dayRows ? r.dayRows() : null, d = rows && typeof _wkDayPick === 'function' ? _wkDayPick(r.id, rows, _wkFacts(F, m), today) : r.day ? r.day[gardenHash('wt|' + today + r.id) % r.day.length] : ''; W['fy.' + r.id] = today; if (d) lines.push(d); }
  if (F.last !== today && typeof _wkAdd === 'function') _wkAdd(r.id, 1);
  W['fv.' + r.id] = today; W['fn.' + r.id] = F.talks + 1; _wdSave();
  wdTalk({ name: r.name, art: r.art(), lines: lines.length ? lines : [r.quiet || '…'], actions, at: { x: S.x, y: S.y }, bye: 'Goodbye' });
}
wdMod({
  id: 'tales', pref: 'folk',
  begin() { _wt.near.clear(); _wt.res.clear(); },
  tick(m) {
    if (m.visit || _wd.still) return;
    try { _wtPlaces(m); _wtTravellers(m); for (const r of WD_TALE_RESIDENTS.values()) _wtResPlace(r, m); } catch (e) { console.error('[garden stories]', e); }
  },
  end() { for (const S of _wt.res.values()) S.remove(); _wt.res.clear(); if (_wt.trav) { _wt.trav.S.remove(); _wt.trav = null; } },
});
/* ---------- the Stories page (Keepsakes): every story begun, with what was said, so you can read it again ---------- */
function wdBoxStories(el, m) {
  const W = _wtW(), begun = WD_TALES.filter(s => _wtStoryOn(s) && s.steps.some(b => W[`sx.${s.id}.${b.id}`]));
  if (!begun.length) { el.appendChild(_gdpEl('p', 'muted wd-box-empty', 'Nothing yet. The old angler on the pier might have a story, if you sit with him.')); return; }
  const order = { main: 0, arc: 1, small: 2 }, head = { main: 'The vale', arc: 'People', small: 'Small stories' };
  let last = '';
  for (const s of begun.sort((a, b) => order[a.kind] - order[b.kind])) {
    if (s.kind !== last) { last = s.kind; el.appendChild(_gdpEl('h4', 'wd-tale-h', head[s.kind] || '')); }
    const box = _gdpEl('details', 'wd-tale'); const sum = _gdpEl('summary'); sum.appendChild(_gdpEl('b', null, s.title)); sum.appendChild(_gdpEl('small', 'muted', ' ' + (s.journal || ''))); box.appendChild(sum);
    for (const b of s.steps) { if (!W[`sx.${s.id}.${b.id}`]) continue; for (const l of b.lines || []) { const t = _wtLine(l); if (t) box.appendChild(_gdpEl('p', null, t)); } const c = W[`sc.${s.id}.${b.id}`]; if (c) { const ch = (b.choice || []).find(x => (x.k || x.label) === c); if (ch) box.appendChild(_gdpEl('p', 'muted', 'You: ' + _wtChoiceLabel(ch) + '. ' + _wtChoiceT(ch))); } }
    el.appendChild(box);
  }
  _wtKeepsBox(el, W);
  const next = wdTaleMainNext(m);
  if (next) { const n = next.b.who === 'angler' ? 'The old angler' : (WD_FOLK_ROW.get(next.b.who) || {}).name; if (n) el.appendChild(_gdpEl('p', 'muted', `${n} has the next part of the vale’s story.`)); }
}
function _wtKeepsBox(el, W) {
  const keeps = Object.keys(W).filter(k => k.startsWith('kp.')).map(k => k.slice(3)), recs = Object.keys(W).filter(k => k.startsWith('rp.')).map(k => k.slice(3));
  if (keeps.some(id => WD_TALE_KEEPS.has(id))) {
    el.appendChild(_gdpEl('h4', 'wd-tale-h', 'Keepsakes'));
    for (const id of keeps) { const k = WD_TALE_KEEPS.get(id); if (!k) continue; const p = _gdpEl('p'); p.appendChild(_gdpEl('b', null, k.name)); p.appendChild(_gdpEl('span', 'muted', ' ' + _wtLine(k.text))); el.appendChild(p); }
  }
  if (recs.some(id => WD_TALE_RECIPES.has(id))) {
    el.appendChild(_gdpEl('h4', 'wd-tale-h', 'Recipes'));
    for (const id of recs) { const r = WD_TALE_RECIPES.get(id); if (!r) continue; const box = _gdpEl('details', 'wd-tale'); const sum = _gdpEl('summary'); sum.appendChild(_gdpEl('b', null, r.name)); sum.appendChild(_gdpEl('small', 'muted', ' ' + (r.from || ''))); box.appendChild(sum); for (const l of r.text || []) { const t = _wtLine(l); if (t) box.appendChild(_gdpEl('p', null, t)); } el.appendChild(box); }
  }
}
