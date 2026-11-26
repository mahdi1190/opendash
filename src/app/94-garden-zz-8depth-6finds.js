/* ============================================================
   DEPTH: WHAT LIES UNDERNEATH, AND WHAT IT PAYS (26 Nov 2026, the depth lane, its third part). Lost things under bridges and piers, the
   finds in the chambers underground, cave crystals, the spoil of an old working, a coin down a well; each a real reward, each in the Field
   Journal, and every keepsake held up over your head for friends to see (gardenCatchMoment tells everyone in the garden).

   BY KIND, NEVER BY NAME (rule 17):
     a footbridge you swim under   something glints in the shade under its near beam, one a day (an old penny, a brass button, a cork
                                   float, a clay pipe stem, blue bottle glass): a few coins, and each the first time a keepsake
     a pier                        a lost thing beside its piles, one a day (a lead weight, sea glass ...), and mussels on a pile to gather
     a bridge with arches          the mason's mark cut under an arch: a rubbing of it to keep, and the story of it
     a chamber with a find         its row says what (vale-depth.json chambers[].find): a map, a bell, a token, a slate ... once, with its story
     a chamber of crystals         chip off a crystal, once a day: a cave crystal to keep the first time, good stone after
     a working with a tub          sift the spoil, once a day: stone for building, and the first time a miner's tag
     a well                        drop a coin down it, once a day: a wish, and a scoop of compost for the garden
   The money is honest: a daily find pays once a day by its place (the same key in any garden, so a friend's bridge is not a second one),
   a keepsake pays once ever (gardenLifeFound, and a ledger line kept by a seen mark), materials keep inside the day's cap (_grGive).

   FRIENDS see what you find held up over your head with its name; your snapshot lists what you have found under the vale (dp.k), and a
   friend's Field Journal shows it on their page of yours (Under the vale, in Places).
   ============================================================ */
const _gdf = { glints: new Map(), scanT: 0, inside: new Map(), pageOn: false };
/* ---------- the keepsakes (GL_KEEPSAKE rows: the Field Journal's shelf, the catch moment's picture) ---------- */
const GDF_KEEP = Object.freeze([
  // lost under a footbridge
  { id: 'old-penny', name: 'An old penny', c: '#b06a3a', kind: 'dpcoin', at: 'bridge', hint: 'Something glints under a footbridge, in the shade.', story: ['Worn as smooth as a pebble. You can just make out a king’s head, looking the other way.'] },
  { id: 'brass-button', name: 'A brass button', c: '#c8a040', kind: 'dpbutton', at: 'bridge', hint: 'Lost under a footbridge.', story: ['A brass button with an anchor on it, off somebody’s best coat. They will have looked everywhere.'] },
  { id: 'cork-float', name: 'A cork float', c: '#d24a32', kind: 'dpfloat', at: 'bridge', hint: 'Caught under a footbridge, after it got away.', story: ['A red and white float, lost from a line. The fish got away, and so did the float.'] },
  { id: 'clay-pipe', name: 'A clay pipe stem', c: '#ece4d2', kind: 'dppipe', at: 'bridge', hint: 'In the mud under a footbridge.', story: ['A broken stem of white clay pipe. People who search old riverbeds find these everywhere, and still love finding them.'] },
  { id: 'bottle-glass', name: 'Blue bottle glass', c: '#5a8ac8', kind: 'dpglass', at: 'bridge', hint: 'Under a footbridge, worn smooth by the water.', story: ['A piece of blue glass from a bottle, its edges worn soft by years of water.'] },
  // lost beside a pier
  { id: 'lead-weight', name: 'A fishing weight', c: '#8a8e94', kind: 'dpweight', at: 'pier', hint: 'Lost off a line, by the piles under a pier.', story: ['A lead weight, lost off somebody’s line and grown over with a little green weed.'] },
  { id: 'sea-glass', name: 'Green sea glass', c: '#7ab89a', kind: 'dpglass', at: 'pier', hint: 'Under a pier, rolled smooth by the sea.', story: ['Green glass, rolled by the sea until it is as smooth as a sweet.'] },
  // under an arch
  { id: 'mason-mark', name: 'The mason’s mark', c: '#ece6d6', kind: 'dprubbing', at: 'arch', hint: 'Cut in the stone under the arch of an old bridge.', story: ['Under the arch, cut into one stone: a little mark like an arrow with a hook on its tail.', 'Every mason had a mark of his own and cut it on each stone, so he was paid for every one. You take a rubbing of it with a bit of charcoal.'] },
  // in the chambers underground (a row's chambers[].find)
  { id: 'first-map', name: 'The vale’s first map', c: '#e6d8b0', kind: 'dpmap', at: 'chamber', hint: 'In a cellar under an office, among the deeds.', story: ['A map of the vale, drawn before the village had its green. Dotted lines run under the hills, and someone has marked them with question marks.', 'One mark sits at the foot of the scarp on the lake’s north shore, east of the falls. Beside it, in faded ink: “the cutters’ way, walled up”.'] },
  { id: 'letter-tin', name: 'A tin of old letters', c: '#4e6e7e', kind: 'dptin', at: 'alcove', hint: 'Behind some loose bricks, somewhere underground.', story: ['Letters tied with string, the ink gone brown. “The slates go down the cut to the lake again on Monday. Mind the step at the bottom, it is loose.”', 'They are from long before the last gardener. Somebody kept them anyway, and so will you.'] },
  { id: 'drovers-bell', name: 'A drover’s bell', c: '#b8902c', kind: 'dpbell', at: 'chamber', hint: 'Left in a store under an empty house in the woods.', story: ['A dented bell on a leather strap. Drovers hung one on the lead cow so the herd would follow it over the moor.', 'It still rings, a little flat.'] },
  { id: 'cider-token', name: 'A cider token', c: '#a87a3a', kind: 'dptoken', at: 'chamber', hint: 'Among the barrels in a vault under the terraces.', story: ['A brass token stamped with an apple: good for one jug at the cider press.', 'The press is long gone. The token never heard.'] },
  { id: 'miners-tag', name: 'A miner’s tag', c: '#c8a040', kind: 'dptag', at: 'chamber', hint: 'In the spoil of an old working, deep in the rock.', story: ['A brass tag with a number punched in it. Each miner hung his on a board going in and took it back coming out.', 'So everyone always knew who was still underground.'] },
  { id: 'cave-crystal', name: 'A cave crystal', c: '#bfe8f4', kind: 'dpcrystal', at: 'chamber', hint: 'Chip one off the wall where crystals grow in the rock.', story: ['A clear point of quartz, cold in your hand.', 'Hold it up to a light and it throws tiny rainbows on everything.'] },
  { id: 'miners-tin', name: 'A miner’s snap tin', c: '#6a6e72', kind: 'dptin', at: 'alcove', hint: 'Behind loose rock in a mine, where someone hid it.', story: ['A dented tin for a miner’s lunch. Inside, a crust gone hard as stone, and a note:', '“Back by four. Tell nobody about the crystals.”'] },
  { id: 'cutters-slate', name: 'A slate with a name on it', c: '#56606c', kind: 'dpslate', at: 'chamber', hint: 'In the store of a forgotten way through the scarp.', story: ['A roofing slate with a name scratched in it, and a date too worn to read.', 'Every slate cutter scratched his name on his first good slate, and kept it.'] },
]);
const GDF_KEEP_ROW = new Map(GDF_KEEP.map(k => [k.id, k]));
for (const k of GDF_KEEP) { try { if (typeof GL_KEEPSAKE !== 'undefined' && !GL_KEEPSAKE.has(k.id)) GL_KEEPSAKE.set(k.id, Object.freeze({ id: k.id, name: k.name, c: k.c, kind: k.kind, hint: k.hint, museum: true, depth: true })); } catch (e) { /* the shelf without it */ } }
/* the pictures of the keepsakes found underneath (feet at 0, 0, about 16 across), in the shelf's own style: lit from the upper left */
const _GDF_SHAPES = {
  dpcoin(c) { const A = GART; return A.P(A.dk(c, 0.35), A.ell(0.4, -3.2, 5.4, 3.1)) + A.P(c, A.ell(0, -3.7, 5.2, 3)) + A.S(A.dk(c, 0.3), 0.6, A.ell(0, -3.7, 3.7, 2.1), 0.8) + A.P(A.dk(c, 0.3), 'M-0.8 -4.8C0.4 -5.6 1.6 -4.8 1.2 -3.6C1 -2.8 -0.4 -2.6 -0.8 -3.2z', 0.7) + _glShine(-2, -4.6, 1.6, 0.7, 0.5); },
  dptoken(c) { const A = GART; return A.P(A.dk(c, 0.35), A.ell(0.4, -3.2, 5, 3)) + A.P(c, A.ell(0, -3.7, 4.8, 2.8)) + A.P(A.dk(c, 0.35), A.ell(0, -3.6, 1.6, 1.3)) + A.S('#4e6a2a', 0.6, 'M0 -4.8Q0.8 -5.8 1.8 -5.6') + _glShine(-2, -4.6, 1.4, 0.6, 0.5); },
  dpbutton(c) { const A = GART; return A.P(A.dk(c, 0.35), A.ell(0.3, -3.6, 4.4, 3.6)) + A.P(c, A.ell(0, -4, 4.2, 3.5)) + A.S(A.dk(c, 0.35), 0.6, A.ell(0, -4, 2.8, 2.3)) + A.P(A.dk(c, 0.5), A.circ(-0.9, -4.5, 0.5) + A.circ(0.9, -4.5, 0.5) + A.circ(-0.9, -3.4, 0.5) + A.circ(0.9, -3.4, 0.5)) + _glShine(-1.8, -5.4, 1.2, 0.8, 0.55); },
  dpfloat(c) { const A = GART; return A.S('#5a4228', 0.7, 'M0 -7.2V-11.4M0 -1.4V0.4') + A.P('#f2ece0', A.ell(0, -4.2, 2.5, 3.3)) + A.P(c, 'M-2.5 -4.6C-2.5 -7.6 2.5 -7.6 2.5 -4.6z') + _glShine(-1, -5.8, 0.6, 1.2, 0.5); },
  dppipe(c) { const A = GART; return A.S(A.dk(c, 0.25), 1.9, 'M-6.4 -1.2L3.6 -4.6') + A.S(c, 1.3, 'M-6.4 -1.6L3.6 -5') + A.P(A.dk(c, 0.2), 'M2.8 -4.2C3 -7.8 6.8 -8.4 7.2 -5.2C7.4 -3.6 5.8 -2.6 4.4 -3.2z') + A.P(c, 'M3.2 -4.8C3.6 -7.4 6.4 -7.8 6.8 -5.6z') + A.P('#3a3028', A.ell(5.1, -6.6, 1.3, 0.6)); },
  dpglass(c) { const A = GART; return A.P(A.dk(c, 0.3), 'M-4.6 -1.2C-5.4 -4.4 -2 -7 1.6 -6.4C4.6 -5.8 5.6 -3.2 4.2 -1.2C2.6 0.4 -3.4 0.8 -4.6 -1.2z', 0.5) + A.P(c, 'M-4.6 -1.6C-5.4 -4.6 -2 -7.2 1.6 -6.6C4.6 -6 5.4 -3.4 4.2 -1.6C2.6 0 -3.4 0.4 -4.6 -1.6z', 0.85) + A.P('#ffffff', 'M-2.6 -4.6Q0 -6.4 2.4 -5.6Q-0.2 -5 -2 -3.6z', 0.6); },
  dpweight(c) { const A = GART; return A.S(A.dk(c, 0.3), 0.7, A.ell(0, -10.8, 1, 0.9) + 'M0 -8.6V-9.8') + A.P(c, 'M0 -8.6C2.4 -8.6 3.6 -4.6 3.4 -2.6C3.2 -0.8 1.8 0 0 0C-1.8 0 -3.2 -0.8 -3.4 -2.6C-3.6 -4.6 -2.4 -8.6 0 -8.6z') + A.P('#5e7a4a', 'M-3.2 -2C-2 -0.6 2 -0.6 3.2 -2C3 -1 2 0 0 0C-2 0 -3 -1 -3.2 -2z', 0.8) + _glShine(-1.2, -4.6, 0.8, 1.8, 0.45); },
  dprubbing(c) { const A = GART; return A.P(A.dk(c, 0.25), A.rect(-4.6, -8.4, 10, 7.8)) + A.P(c, A.rect(-5, -8.8, 10, 7.8)) + A.P('#7a746a', A.rect(-3.8, -7.8, 7.6, 5.8), 0.28) + A.S('#2a2622', 0.9, 'M0 -2.6V-7M-2 -5L0 -7L2 -5M0 -2.6Q1.8 -2.2 2 -3.6'); },
  dpmap(c) { const A = GART; return A.P(A.dk(c, 0.3), 'M-6 -0.6L-6 -8L-2 -7.2L2 -8L6 -7.2L6 0.2L2 -0.6L-2 0.2z', 0.6) + A.P(c, 'M-6 -1L-6 -8.4L-2 -7.6L2 -8.4L6 -7.6L6 -0.2L2 -1L-2 -0.2z') + A.S(A.dk(c, 0.25), 0.5, 'M-2 -7.6V-0.2M2 -8.4V-1') + A.S('#8a5a3a', 0.6, 'M-4.6 -6.2Q-3 -3.4 -0.6 -4.6Q1.4 -5.6 3.6 -3', 0.9) + A.S('#b8402a', 0.7, 'M3 -2.4L4.4 -3.8M4.4 -2.4L3 -3.8'); },
  dptin(c) { const A = GART; return A.P(A.dk(c, 0.3), A.rrect(-5.4, -6.4, 10.8, 6.4, 1.2)) + A.P(c, A.rrect(-5.6, -8.2, 11.2, 2.8, 1)) + A.P(A.lt(c, 0.35), A.rect(-4.6, -7.8, 9.2, 0.8), 0.6) + A.P('#e8dcc0', A.rect(-2.8, -5, 5.6, 2.8)) + A.S('#8a7a5a', 0.4, 'M-2 -4.2h4M-2 -3.2h3'); },
  dpbell(c) { const A = GART; return A.S('#6a4a2a', 1.1, 'M-1.8 -7.6Q0 -10.8 1.8 -7.6') + A.P(A.dk(c, 0.25), 'M-3.4 -1.2L-2.4 -7.6L2.4 -7.6L3.4 -1.2z') + A.P(c, 'M-3.2 -1.4L-2.4 -7.6L0.4 -7.6L-0.6 -1.4z') + A.P(A.dk(c, 0.45), A.rect(-3.6, -1.6, 7.2, 1.2)) + A.P('#3a2e22', A.circ(0.2, -0.3, 0.8)); },
  dptag(c) { const A = GART; return A.P(A.dk(c, 0.35), A.circ(0.3, -4, 3.9)) + A.P(c, A.circ(0, -4.4, 3.8)) + A.P('#2a2620', A.circ(0, -7, 0.6)) + A.S(A.dk(c, 0.45), 0.6, 'M-1.6 -5.2V-2.8M-0.2 -5.2H1.4L0.2 -2.8') + _glShine(-1.6, -5.4, 0.9, 0.7, 0.5); },
  dpcrystal(c) { const A = GART; return A.P(A.dk(c, 0.35), 'M-3.4 0L-3.8 -5L-2.4 -7.2L-1 -5L-1.2 0z') + A.P(c, 'M-1.2 0L-1.6 -7.4L0.4 -10.6L2.4 -7.4L2 0z') + A.P('#ffffff', 'M-0.8 -7.2L0.4 -10.2L0 -6.6z', 0.85) + A.P(A.lt(c, 0.25), 'M2 0L2.4 -4.6L3.8 -6.2L4.8 -4.2L4.2 0z') + A.P(A.dk(c, 0.2), 'M0.4 -10.6L2.4 -7.4L2 0L1 0z', 0.35); },
  dpslate(c) { const A = GART; return A.P(A.dk(c, 0.35), 'M-5 -0.2L-4.4 -8L5.4 -7.6L5.8 0.2z') + A.P(c, 'M-5.4 -0.6L-4.8 -8.4L5 -8L5.4 -0.2z') + A.P(A.lt(c, 0.25), 'M-4.8 -8.4L5 -8L4.9 -7.2L-4.8 -7.6z', 0.6) + A.S('#e0dcd2', 0.5, 'M-3.4 -5.8L-2.6 -3.2L-1.8 -5.8M-0.8 -5.6V-3.2H0.8M2 -5.6L3.4 -3.2M3.4 -5.6L2 -3.2', 0.85); },
};
if (typeof gardenKeepsakeSvg === 'function') {
  const _gdfSvg0 = gardenKeepsakeSvg;
  gardenKeepsakeSvg = function (k) {   // eslint-disable-line no-func-assign
    if (k && _GDF_SHAPES[k.kind]) { try { return GART.P('#000000', GART.ell(0, 0.4, 6, 1.5), 0.14) + _GDF_SHAPES[k.kind](k.c || '#c8a24a'); } catch (e) { /* the plain one */ } }
    return _gdfSvg0(k);
  };
}
/* ---------- paying ---------- */
function _gdfG() { try { return _gdG(); } catch (e) { return null; } }
function _gdfToday() { try { return _gdToday(); } catch (e) { return ''; } }
/** A daily find at a place: once a day by its key, in any garden (the same key at home and at a friend's). Coins and xp. */
function _gdfPayDay(key, c, x) {
  const g = _gdfG(); if (!g || !g.led) return false;
  const k = 'dpf.' + _gdfToday() + '.' + key; if (g.led[k]) return false;
  g.led[k] = { d: _gdfToday(), k: 'dp', c, x, n: 1 }; return true;
}
function _gdfTookToday(key) { const g = _gdfG(); return !!(g && g.led && g.led['dpf.' + _gdfToday() + '.' + key]); }
/** A keepsake's own payment the first time ever (kept by a seen mark: the ledger folds old lines away). */
function _gdfPayOnce(id, c, x) {
  const g = _gdfG(); if (!g || !g.led || !g.seen) return false;
  if (g.seen['dp.k.' + id] || g.led['dpk.' + id]) return false;
  g.led['dpk.' + id] = { d: _gdfToday(), k: 'dp', c, x, n: 1 }; g.seen['dp.k.' + id] = _gdfToday(); return true;
}
function _gdfHas(id) { return typeof gardenLifeHas === 'function' && gardenLifeHas('k', id); }
/** It is yours: in the Field Journal, held up over your head (friends see it with its name), its story to read. */
function _gdfKeep(id, o) {
  o = o || {};
  const row = GDF_KEEP_ROW.get(id); if (!row) return;
  const isNew = !_gdfHas(id), swim = _gdqSwimming();
  if (isNew && typeof gardenLifeFound === 'function') gardenLifeFound('k', id, { userAction: !swim });
  if (swim || !isNew) try { if (typeof gardenCatchMoment === 'function') gardenCatchMoment('keep', id, { isNew, own: !swim }); } catch (e) { /* only a moment */ }
  if (isNew && o.pay) _gdfPayOnce(id, o.pay.c, o.pay.x);
  try { _gdSave(); } catch (e) { /* with the next change */ }
  if (isNew && row.story && typeof wdPage === 'function') setTimeout(() => { try { wdPage({ title: row.name, art: `<svg viewBox="-12 -15 24 18" width="128" height="96" aria-hidden="true">${gardenKeepsakeSvg(GL_KEEPSAKE.get(id))}</svg>`, text: row.story, foot: 'It is in your Field Journal, under Keepsakes.' + (o.pay ? ` You turned up ${o.pay.c} coins as well.` : '') }); } catch (e) { /* the toast says it */ } }, swim ? 300 : 2400);
}
/* ---------- under the raised things: what lies there today ---------- */
const GDF_DAY = Object.freeze({ bridge: Object.freeze({ chance: 0.85, pool: Object.freeze(['old-penny', 'brass-button', 'cork-float', 'clay-pipe', 'bottle-glass']), c: [2, 5], x: 1 }), pier: Object.freeze({ chance: 0.85, pool: Object.freeze(['lead-weight', 'sea-glass', 'old-penny']), c: [2, 4], x: 1 }), mussels: Object.freeze({ c: 3, x: 1 }) });
/** The places under raised things where something lies, by kind (zones): [{ kind, id, z, x, y (cells), pool, what }]. Cached with the zones. */
function _gdfPlaces() {
  const zs = typeof gardenUnderZones === 'function' ? gardenUnderZones() || [] : [], key = (typeof _gdu !== 'undefined' ? _gdu.key : '') + '|' + zs.length + '|' + (typeof _gduOpenSig === 'function' ? _gduOpenSig() : '');   // (and what land is open: a spot in water not open yet is no spot)
  if (_gdf.places && _gdf.placesKey === key) return _gdf.places;
  const out = [], W = GARDEN_WORLD, cell = (p) => ({ x: p.x / W.cellW, y: (p.y - W.sky) / W.cellH });
  const free = (q) => typeof _ghtSwimFree !== 'function' || _ghtSwimFree(q.x, q.y);
  for (const z of zs) {
    if (!z.swim) continue;
    if (z.deck && z.kind === 'footbridge') {   // in the stream just upstream of its far beam (where nothing standing in front of the bridge hides it), where a swimmer reaches it: clear of the dipper's stones (5life)
      const d = z.deck, span = z.wet[1] - z.wet[0], keep = (z.posts.length ? z.posts.map(p => p.t) : [(z.wet[0] + z.wet[1]) / 2]).concat([z.wet[0] + span * 0.22]), h = (_gdqHash(z.id + 'f') % 1000) / 1000;
      for (const share of [0.8 + h * 0.06, 0.66, 0.4, 0.9, 0.12]) {
        const t = z.wet[0] + span * share; if (keep.some(k => Math.abs(k - t) < 18)) continue;
        const p = z.crossing.deckPoint(t / d.L, -d.hw * d.near), o = z.crossing.deckPoint(t / d.L, 0), n = Math.hypot(p.x - o.x, p.y - o.y) || 1, q = cell({ x: p.x + (p.x - o.x) / n * 15, y: p.y + (p.y - o.y) / n * 15 }); if (free(q)) { out.push({ kind: 'bridge', id: z.id, z, x: q.x, y: q.y }); break; }
      }
    }
    if (z.deck && z.rule && z.rule.spans && z.open && z.open.length) {   // the mason's mark, under the first arch, just over the water
      const d = z.deck, o = z.open[0], p = z.crossing.deckPoint((o[0] + o[1]) / 2 / d.L, d.hw * d.near), q = cell({ x: p.x, y: p.y + (z.face || 20) + 4 });
      out.push({ kind: 'arch', id: z.id, z, x: q.x, y: q.y });
    }
    if (z.rect && z.kind === 'pier' && z.posts && z.posts.length > 1) {   // beside one pile a lost thing; on another, the mussels
      const n = z.posts.length, a = z.posts[(_gdqHash(z.id + 'f') % n)], b = z.posts[(_gdqHash(z.id + 'm') % n)] === a ? z.posts[(_gdqHash(z.id + 'f') + 1) % n] : z.posts[(_gdqHash(z.id + 'm') % n)];
      const side = a.x < (z.rect[0] + z.rect[2]) / 2 * W.cellW ? -1 : 1, qa = cell({ x: a.x + side * 17, y: a.y + 3 }), qb = cell({ x: b.x, y: b.y + 4 });   // (beside the pile, outside its hold on a swimmer: its radius and a little)
      if (free(qa)) out.push({ kind: 'pier', id: z.id, z, x: qa.x, y: qa.y });
      out.push({ kind: 'mussels', id: z.id, z, x: qb.x, y: qb.y });
    }
  }
  _gdf.places = out; _gdf.placesKey = key;
  return out;
}
/** What lies at a daily place today (the same on every screen): a keepsake id, or '' when nothing does. */
function _gdfToday01(P) {
  const R = GDF_DAY[P.kind]; if (!R || !R.pool) return '';
  if (_gdqDay01('find|' + P.id) >= R.chance) return '';
  return R.pool[_gdqHash(_gdfToday() + '|' + P.id) % R.pool.length];
}
function _gdfCoins(P) { const R = GDF_DAY[P.kind]; return R && R.c ? (Array.isArray(R.c) ? R.c[0] + (_gdqHash(_gdfToday() + P.id + 'c') % (R.c[1] - R.c[0] + 1)) : R.c) : 0; }
/* the glints: a small star twinkling where something lies today, only near you; nothing at all once you have it */
const GDF_GLINT = '<ellipse cy="1.6" rx="7" ry="2.2" fill="none" stroke="#eef6f2" stroke-width="0.8" opacity="0.65"/><g transform="translate(0 -2) scale(0.72)"><g class="gl-twinkle"><path d="M0 -12L2.2 -5L9 -3L2.2 -1L0 6L-2.2 -1L-9 -3L-2.2 -5z" fill="#fff4b8" stroke="#c8983a" stroke-width="0.6"/></g></g>';
function _gdfGlintFrame(now) {
  if (now - _gdf.scanT < 600 || typeof _gw === 'undefined' || !_gw.on || typeof gardenWorldAdd !== 'function') return;
  _gdf.scanT = now;
  const want = new Set(), inside = typeof _gdt !== 'undefined' && _gdt.cur;
  if (!inside) for (const P of _gdfPlaces()) {
    if (P.kind !== 'bridge' && P.kind !== 'pier') continue;
    if (Math.abs(P.x - _gw.px) > 12 || Math.abs(P.y - _gw.py) > 9 || !_gdfToday01(P) || _gdfTookToday(P.kind + '.' + P.id)) continue;
    want.add(P.kind + '|' + P.id);
  }
  for (const [k, S] of _gdf.glints) if (!want.has(k)) { try { S.remove(); } catch (e) { /* gone */ } _gdf.glints.delete(k); }
  for (const k of want) if (!_gdf.glints.has(k)) {
    const [kind, id] = k.split('|'), P = _gdfPlaces().find(q => q.kind === kind && q.id === id); if (!P) continue;
    _gdf.glints.set(k, gardenWorldAdd({ id: 'dpf-' + k, x: P.x, y: P.y, z: P.y + 0.02, svg: GDF_GLINT, still: true, hit: 0.5, hitUp: 4, label: 'Something glints here', cursor: 'hand', onClick: () => { const r = _gdfRowOf(P); gartActRun(r.act, r); } }));
  }
}
function _gdfRowOf(P) {
  const what = P.kind === 'mussels' || P.kind === 'arch' ? '' : _gdfToday01(P);
  return { key: 'dpf:' + P.kind + ':' + P.id, act: 'dpfind', name: '', x: P.x, y: P.y, promptY: P.y - 1.1, stand: null, deg: null, lift: 0, src: 'dpf:' + P.kind + ':' + P.id, kind: 'depth', dq: true, reach: P.kind === 'arch' ? 1.6 : 1.3, pri: 0.5, place: P, what };
}
gardenDepthPromptRows((out, C, px, py) => {
  if (C) return;
  const swim = _gdqSwimming();
  for (const P of _gdfPlaces()) {
    if (Math.abs(P.x - px) > 3.5 || Math.abs(P.y - py) > 3.5) continue;
    if (P.kind === 'bridge' || P.kind === 'pier') { if (!_gdfToday01(P) || _gdfTookToday(P.kind + '.' + P.id)) continue; }
    else if (P.kind === 'mussels') { if (!swim || _gdfTookToday('mussels.' + P.id)) continue; }
    else if (P.kind === 'arch') { if (!swim || _gdfHas('mason-mark') && _gdfTookToday('arch.' + P.id)) continue; }
    const r = _gdfRowOf(P); if (!swim && P.kind !== 'mussels') r.reach = 3.2;   // (from the bank you see it glint: a swim fetches it)
    out.push(r);
  }
});
gardenDepthActs('dpfind', {
  words: (r) => {
    const P = r.place;
    if (P.kind === 'mussels') return 'Gather mussels off the pile';
    if (P.kind === 'arch') return 'Look at the mason’s mark';
    return _gdqSwimming() ? 'Pick it up' : 'Something glints in the water';
  },
  run: (r) => {
    const P = r.place, swim = _gdqSwimming(), d = Math.hypot(P.x - _gw.px, (P.y - _gw.py) * 1.3);
    _gdqFace(P.x, P.y);
    if (!swim) { _gdqSay(P.kind === 'pier' ? 'Something glints in the water by the piles. Go for a swim to reach it.' : 'Something glints in the shade under the bridge. Go for a swim to reach it.', 'waves'); return true; }
    if (d > 1.4) { _gdqSay('Swim a little nearer to reach it.', 'waves'); return true; }
    if (P.kind === 'mussels') {
      if (!_gdfPayDay('mussels.' + P.id, GDF_DAY.mussels.c, GDF_DAY.mussels.x)) { _gdqSay('You have had the best of the mussels today.'); return true; }
      try { _gdSave(); } catch (e) { /* later */ }
      _gdqSay(`You pull a handful of mussels off the pile, black and shining. +${GDF_DAY.mussels.c} coins from the fishmonger’s box.`, 'droplets'); try { gardenSfx('splash'); } catch (e) { /* quiet */ }
      return true;
    }
    if (P.kind === 'arch') {
      const first = !_gdfHas('mason-mark'); _gdfPayDay('arch.' + P.id, 0, 1);
      if (first) _gdfKeep('mason-mark', { pay: { c: 6, x: 3 } }); else _gdqSay('The mason’s mark under the arch: an arrow with a hook. You know it now, like a friend’s handwriting.');
      return true;
    }
    const id = r.what || _gdfToday01(P); if (!id) return true;
    const c = _gdfCoins(P);
    if (!_gdfPayDay(P.kind + '.' + P.id, c, GDF_DAY[P.kind].x)) { _gdqSay('Nothing more here today.'); return true; }
    const row = GDF_KEEP_ROW.get(id), had = _gdfHas(id);
    _gdqSay((had ? `Another ${row.name.replace(/^(An?|The) /, '').toLowerCase()} from the mud` : row.name) + `. +${c} coins.`, 'sparkles');
    _gdfKeep(id);
    _gdf.scanT = 0; try { gardenSfx('sparkle'); } catch (e) { /* quiet */ }
    return true;
  },
});
/* ---------- underground: the chambers ---------- */
/** What a chamber offers by its piece and its row (the find laid in it), and where (world px): [{ c, act, x, y (where you stand to do it, in
 *  front of the piece: what the prompt measures from), at (the piece itself: its glint), find, daily }]. */
function _gdfChamberSpots(T) {
  if (T._gdf) return T._gdf;
  const out = [];
  for (const c of T.ells) {
    const R = GARDEN_CHAMBERS[c.what]; if (!R) continue;
    const back = c.y - c.ry, cx = c.x + (c.pieceDx || 0);
    if (R.piece === 'crystals') out.push({ c, act: 'dpchip', x: cx + c.rx * 0.1, y: c.y - c.ry * 0.2, at: { x: cx + c.rx * 0.08, y: back - 12 }, find: c.find || 'cave-crystal', daily: true });
    else if (R.piece === 'tub') out.push({ c, act: 'dpsift', x: cx - 9, y: c.y - c.ry * 0.2, at: { x: cx - 9, y: back - 18 }, find: c.find || '', daily: true });
    else if (R.piece === 'well' && c.hole) out.push({ c, act: 'dpwish', x: c.hole.x, y: c.hole.y + 14, at: { x: c.hole.x, y: c.hole.y - 6 }, find: '', daily: true });
    else if (c.find && (R.piece === 'shelves' || R.piece === 'barrels' || R.piece === 'bench')) out.push({ c, act: 'dplookfor', x: cx, y: c.y - c.ry * 0.2, at: { x: cx + (R.piece === 'barrels' ? 17 : 0), y: back - (R.piece === 'shelves' ? 14 : 12) }, find: c.find, piece: R.piece });
  }
  T._gdf = out; return out;
}
gardenDepthPromptRows((out, C, px, py) => {
  if (!C) return;
  const W = GARDEN_WORLD, cur = gardenTunnelChamberAt(C.T, px * W.cellW, W.sky + py * W.cellH);   // (what is in the chamber you stand in comes first)
  for (const s of _gdfChamberSpots(C.T)) {
    if (s.act === 'dplookfor' && _gdfHas(s.find)) continue;   // (taken: nothing more there)
    const x = s.x / W.cellW, y = (s.y - W.sky) / W.cellH;
    out.push({ key: 'dpc:' + C.T.id + ':' + s.c.i + ':' + s.act, act: s.act, name: '', x, y, promptY: (s.at.y - W.sky) / W.cellH - 0.9, stand: null, deg: null, lift: 0, src: 'dpc:' + C.T.id + ':' + s.c.i + ':' + s.act, kind: 'depth', dq: true, reach: 2, pri: 0.4 + (s.c.i === cur ? 0.6 : 0), spot: s, T: C.T });
  }
});
function _gdfInsideAct(r, fn) { _gdqFace((r.spot.at.x) / GARDEN_WORLD.cellW, (r.spot.at.y - GARDEN_WORLD.sky) / GARDEN_WORLD.cellH); try { if (typeof gartPlayerAct === 'function') gartPlayerAct('pick', 900); } catch (e) { /* fine */ } return fn(); }
gardenDepthActs('dplookfor', {
  words: (r) => ({ shelves: (GARDEN_TUNNEL_STYLES[r.T.style] || {}).wall === 'rock' ? 'Look through the old store' : 'Look among the deeds', barrels: 'Look along the barrels', bench: 'Look under the bench' }[r.spot.piece] || 'Look closer'),
  run: (r) => _gdfInsideAct(r, () => { if (_gdfHas(r.spot.find)) { _gdqSay('Nothing more here: you have it already.'); return true; } _gdfKeep(r.spot.find, { pay: { c: 8, x: 3 } }); _gdfInsideSync(r.T); return true; }),
});
gardenDepthActs('dpchip', {
  words: () => 'Chip off a crystal',
  run: (r) => _gdfInsideAct(r, () => {
    const key = 'chip.' + r.T.id + '.' + r.spot.c.i;
    if (_gdfTookToday(key)) { _gdqSay('Leave them be until tomorrow. The rock gives one a day, and grows it back.'); return true; }
    _gdfPayDay(key, 0, 1);
    try { gardenSfx('craft'); } catch (e) { /* quiet */ }
    if (!_gdfHas(r.spot.find)) { _gdfKeep(r.spot.find, { pay: { c: 5, x: 3 } }); return true; }
    const got = typeof _grGive === 'function' && _grGive('dp.chip.' + r.T.id, { 'mat:stone': 1, x: 1 });
    _gdqSay(got ? 'A crystal comes away with a clean little crack. Too cloudy to keep: good stone for building, though. +1 stone.' : 'A crystal comes away with a clean little crack. Your bag is full of stone for today.', 'gem');
    try { _gdSave(); } catch (e) { /* later */ }
    return true;
  }),
});
gardenDepthActs('dpsift', {
  words: () => 'Sift through the spoil',
  run: (r) => _gdfInsideAct(r, () => {
    const key = 'sift.' + r.T.id + '.' + r.spot.c.i;
    if (_gdfTookToday(key)) { _gdqSay('You have been through the spoil today. Tomorrow the drips will have washed a little more out.'); return true; }
    _gdfPayDay(key, 0, 1);
    try { gardenSfx('dig'); } catch (e) { /* quiet */ }
    if (r.spot.find && !_gdfHas(r.spot.find)) { _gdfKeep(r.spot.find, { pay: { c: 6, x: 3 } }); }
    const got = typeof _grGive === 'function' && _grGive('dp.sift.' + r.T.id, { 'mat:stone': 2, x: 1 });
    _gdqSay(got ? 'Good square stones among the spoil, the miners’ leavings. +2 stone for building.' : 'Good stone among the spoil, but you have carried all you can for today.', 'shovel');
    try { _gdSave(); } catch (e) { /* later */ }
    return true;
  }),
});
gardenDepthActs('dpwish', {
  words: () => 'Drop a coin down the well',
  run: (r) => _gdfInsideAct(r, () => {
    const key = 'wish.' + r.T.id + '.' + r.spot.c.i;
    if (_gdfTookToday(key)) { _gdqSay('You have made today’s wish. Wishes keep better one at a time.'); return true; }
    let coins = 0; try { coins = gardenWallet().coins; } catch (e) { coins = 1; }
    if (coins < 1) { _gdqSay('You need a coin to make a wish.'); return true; }
    const g = _gdfG(); if (!g) return true;
    g.led['dpf.' + _gdfToday() + '.' + key] = { d: _gdfToday(), k: 'dp', c: -1, x: 3, n: 1 };
    const got = typeof _grGive === 'function' && _grGive('dp.wish.' + r.T.id, { fertiliser: 1 });
    try { _gdSave(); gardenSfx('splash'); } catch (e) { /* quiet */ }
    _gdqSay('The coin falls a long way. Then, very small, a plink. You make your wish.' + (got ? ' On the rim, where nobody put it, a scoop of good compost. +1 compost, +3 XP.' : ' +3 XP.'), 'sparkles');
    return true;
  }),
});
/* the glints of the finds still to be found in a chamber, drawn in the tunnel's own light (added over the dark) */
function _gdfInsideTex(sc) {
  const key = 'gdf|glint';
  if (!sc.textures.exists(key)) { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); x.translate(16, 16); x.fillStyle = 'rgba(255,240,190,.95)'; x.beginPath(); x.moveTo(0, -13); x.lineTo(2.2, -2.2); x.lineTo(13, 0); x.lineTo(2.2, 2.2); x.lineTo(0, 13); x.lineTo(-2.2, 2.2); x.lineTo(-13, 0); x.lineTo(-2.2, -2.2); x.closePath(); x.fill(); const g = x.createRadialGradient(0, 0, 0, 0, 0, 7); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,240,190,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 7, 0, Math.PI * 2); x.fill(); sc.textures.addImage(key, c); }
  return key;
}
function _gdfInsideSync(T) { const set = _gdf.inside.get(T.id); if (set) set.sig = ''; }
function _gdfInsideFrame(C, now) {
  const st = typeof _gdi !== 'undefined' ? _gdi.st : null; if (!st || !st.shown || !C || !C.T) return;
  const sc = st.scene, rec = st.rec, a = rec && rec.im ? rec.im.alpha : 0;
  let set = _gdf.inside.get(C.T.id);
  if (!set || set.scene !== sc || (set.items[0] && !set.items[0].im.active)) {
    if (set) for (const q of set.items) { try { q.im.destroy(); } catch (e) { /* gone */ } }
    const key = _gdfInsideTex(sc); set = { scene: sc, items: [], sig: '' };
    for (const s of _gdfChamberSpots(C.T)) { if (!s.find) continue; const im = sc.add.image(s.at.x, s.at.y, key).setBlendMode(Phaser.BlendModes.ADD).setVisible(false); st.glows.add(im); set.items.push({ s, im, ph: (_gdqHash(C.T.id + s.c.i) % 628) / 100, on: false }); }
    _gdf.inside.set(C.T.id, set);
  }
  const t = now / 1000, motion = typeof gardenMotionOn !== 'function' || gardenMotionOn();
  if (!set.flagT || now - set.flagT > 1000 || set.sig === '') { set.flagT = now; set.sig = 'k'; for (const q of set.items) q.had = _gdfHas(q.s.find); }   // (asked once a second, or at once after a find: nothing made each frame)
  for (const q of set.items) {
    const on = a > 0.05 && !q.had;
    if (q.im.visible !== on) q.im.setVisible(on);
    if (!on) continue;
    const k = motion ? 0.5 + 0.5 * Math.max(0, Math.sin(t * 2.3 + q.ph)) ** 3 : 0.7;
    q.im.setAlpha(a * (0.25 + 0.75 * k)).setScale(0.35 + 0.35 * k);
  }
}
if (typeof gardenTunnelStageFrame === 'function') {
  const _gdfStage0 = gardenTunnelStageFrame;
  gardenTunnelStageFrame = function (C, now) { _gdfStage0(C, now); try { _gdfInsideFrame(C, now); } catch (e) { /* drawn as it is */ } };   // eslint-disable-line no-func-assign
}
if (typeof gardenTunnelStageClose === 'function') {
  const _gdfClose0 = gardenTunnelStageClose;
  gardenTunnelStageClose = function (force) { try { for (const set of _gdf.inside.values()) for (const q of set.items) if (q.im.active && q.im.visible) q.im.setVisible(false); } catch (e) { /* gone */ } return _gdfClose0(force); };   // eslint-disable-line no-func-assign
}
/* ---------- what friends see, what the ribbons count ---------- */
/** The keepsakes found under the vale (dp.k in the snapshot). */
function gardenDepthFound() { return GDF_KEEP.filter(k => _gdfHas(k.id)).map(k => k.id); }
if (typeof gardenDepthTunnelWire === 'function') {
  const _gdfWire0 = gardenDepthTunnelWire;
  gardenDepthTunnelWire = function () {   // eslint-disable-line no-func-assign
    let dp = null; try { dp = _gdfWire0(); } catch (e) { dp = null; }
    const k = gardenDepthFound().slice(0, GARDEN_DEPTH_WIRE.finds);
    if (!k.length) return dp;
    return Object.assign({}, dp || {}, { k });
  };
}
if (typeof gardenDepthFacts === 'function') {
  const _gdfFacts0 = gardenDepthFacts;
  gardenDepthFacts = function () {   // eslint-disable-line no-func-assign
    const f = Object.assign({}, _gdfFacts0());
    try { f.depthFinds = gardenDepthFound().length; f.depthFindsOf = GDF_KEEP.length; } catch (e) { /* none */ }
    return f;
  };
}
if (typeof gartActFrame === 'function') {
  const _gdfFrame0 = gartActFrame;
  gartActFrame = function () { try { _gdfGlintFrame(performance.now()); } catch (e) { /* later */ } return _gdfFrame0(); };   // eslint-disable-line no-func-assign
}
if (typeof gardenWorldStop === 'function') {
  const _gdfStop0 = gardenWorldStop;
  gardenWorldStop = function (keepOn) { if (!keepOn) { for (const S of _gdf.glints.values()) { try { S.remove(); } catch (e) { /* gone */ } } _gdf.glints.clear(); } return _gdfStop0(keepOn); };   // eslint-disable-line no-func-assign
}
/* ---------- the Field Journal: Under the vale (in Places) ---------- */
function _gdfFriendSnap() {
  try { if (typeof gardenVisitOn !== 'function' || !gardenVisitOn()) return null; const s = (typeof _glv !== 'undefined' && _glv.snap) || (typeof _gdvSnap === 'function' ? _gdvSnap() : null); return s || null; } catch (e) { return null; }
}
function _gdfUnderPage(left, right, m) {
  const E = (t, c, x) => _gjEl(t, c, x);
  const h = left.appendChild(E('div', 'gj-ptitle')); h.innerHTML = `<h3>Under the vale</h3><i class="gj-hand">the ways below, and what lives and lies there</i>`;
  left.appendChild(_gdpBtn('Back to the places', { icon: 'map', kind: 'btn-ghost', run: () => { _gdf.pageOn = false; _gjRepaint(); } }));
  // the ways underground: walked, or not yet (a secret one shows only once it is found)
  const T = typeof gardenTunnels === 'function' ? gardenTunnels() : [], g = _gdfG(), walked = (id) => !!(g && ((g.seen && g.seen['dp.t.' + id]) || (g.led && g.led['dpt.' + id])));
  const ways = left.appendChild(E('div', 'gj-places'));
  for (const t of T) {
    const secret = t.secret && !(typeof gardenDepthSecretOpen === 'function' && gardenDepthSecretOpen(t)), w = walked(t.id), row = ways.appendChild(E('div', 'gj-place' + (w ? '' : ' is-far')));
    row.innerHTML = `<i class="gj-swatch" style="background:${w ? '#7a6a52' : '#3a3632'}"></i><span><b>${esc(secret ? '? ? ?' : t.name.replace(/^the /, 'The '))}</b><small class="gj-hand">${esc(secret ? 'Somewhere a way lies walled up. An old map might know.' : w ? 'walked, ' + t.ells.length + (t.ells.length === 1 ? ' chamber' : ' chambers') : 'not yet explored')}</small></span>${w ? '<span class="gj-stampsm">walked</span>' : ''}`;
  }
  if (!T.length) ways.appendChild(E('p', 'gj-hand gj-empty', 'No ways underground in this vale.'));
  // what lives underneath
  left.appendChild(E('h4', null, 'Lives underneath'));
  const grid = left.appendChild(E('div', 'gj-grid gj-grid-sm'));
  for (const L of GDL_LIFE) {
    const def = GDL_BOOK.get(L.id), seen = typeof gardenLifeHas === 'function' && gardenLifeHas('c', L.id), c = grid.appendChild(E('div', 'gj-card' + (seen ? ' is-caught' : ' is-unheard')));
    const art = typeof _glbArt === 'function' ? _glbArt('c', def, 56) : '';
    c.innerHTML = `<span class="gj-cart${seen ? '' : ' gj-sil'}">${art}</span>${seen ? `<b>${esc(L.name)}</b>` : `<b class="gj-q">? ? ?</b><small class="gj-clue">${esc(L.book.hint)}</small>`}`;
  }
  if (typeof _glbFit === 'function') _glbFit(grid);
  // what lies underneath: yours, and on a visit theirs
  const fr = _gdfFriendSnap(), theirs = fr && fr.dp && Array.isArray(fr.dp.k) ? new Set(fr.dp.k) : null, mine = new Set(gardenDepthFound());
  const h2 = right.appendChild(E('div', 'gj-etitle')); h2.innerHTML = `<h3>Found underneath</h3><small>${mine.size} of ${GDF_KEEP.length}${theirs ? ` · your friend has found ${theirs.size}` : ''}</small>`;
  const shelf = right.appendChild(E('div', 'gj-grid gj-shelf'));
  for (const k of GDF_KEEP) {
    const have = mine.has(k.id), they = theirs && theirs.has(k.id), d = GL_KEEPSAKE.get(k.id), c = shelf.appendChild(E('button', 'gj-card' + (have ? ' is-caught' : ' is-unheard'))); c.type = 'button';
    const art = typeof _glbArt === 'function' && d ? _glbArt('k', d, 44) : '';
    c.innerHTML = `<span class="gj-cart${have ? '' : ' gj-sil'}">${art}</span>${have ? `<b>${esc(k.name)}</b>` : `<b class="gj-q">? ? ?</b><small class="gj-clue">${esc(k.hint)}</small>`}${they ? `<small class="gj-hand">${have ? 'they have one too' : 'your friend found this'}</small>` : ''}`;
    if (have) c.onclick = () => { try { wdPage({ title: k.name, art: `<svg viewBox="-12 -15 24 18" width="128" height="96" aria-hidden="true">${gardenKeepsakeSvg(d)}</svg>`, text: k.story, foot: 'From under the vale.' }); } catch (e) { /* only a card */ } };
  }
  if (typeof _glbFit === 'function') _glbFit(shelf);
  right.appendChild(E('p', 'gj-margin', 'Swim under the bridges, look in the chambers, chip at the rock. Some things are there every day.'));
  void m;
}
if (typeof _gjPlaces === 'function') {
  const _gdfPlaces0 = _gjPlaces;
  _gjPlaces = function (left, right, m) {   // eslint-disable-line no-func-assign
    if (_gdf.pageOn) { try { _gdfUnderPage(left, right, m); return; } catch (e) { console.error('[garden depth] journal', e); _gdf.pageOn = false; left.textContent = ''; right.textContent = ''; } }
    _gdfPlaces0(left, right, m);
    try { left.appendChild(_gdpBtn('Under the vale', { icon: 'lamp', run: () => { _gdf.pageOn = true; _gjRepaint(); } })); } catch (e) { /* the page as before */ }
  };
}
if (typeof gardenJournalTab === 'function') {
  const _gdfTab0 = gardenJournalTab;
  gardenJournalTab = function (el, m) { if (typeof _gj !== 'undefined' && _gj.sec !== 'places') _gdf.pageOn = false; return _gdfTab0(el, m); };   // eslint-disable-line no-func-assign
}
