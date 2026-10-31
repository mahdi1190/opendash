/* ============================================================
   A VISIT IS THE GARDEN (2.27.5, docs/dev/GARDEN_TOGETHER.md section 10). The owner, 31 Oct 2026: "a live visit should be identical to being in my own garden."
   There is one world and one engine. On a visit the page, the camera, the walking, the collisions, the depth, the HUD, the hotbar, the bubbles, the ghost and gameDeny are
   the ones you have at home; what differs is what they read and where an action goes:

     gardenHere()               the garden you stand in (94-garden-1core.js): on a visit, gardenVisitModel(): the shape gardenModel() has, drawn from your friend's snapshot
                                (saved, or the live host's), with what you have asked for on top. Its wallet is YOURS; gardenModel() itself stays your own garden, so your shop,
                                coins, crafting and rewards are untouched and nothing here can publish a friend's garden as yours
     gardenVisitAct(t, a)       every garden action in 94-garden-1core.js asks this first. On a visit it never touches your own garden: the action becomes
                                  'live'   an intent to the host (_glvIntent): shown at once with a pending look, rolled back if refused
                                  'queue'  the saved copy, and the host gave you Help or Play: it waits for them (below)
                                  'small'  the saved copy's one watering a day (garden:act)
                                  ''       your level does not reach it: the red flash and the padlock, and one tap asks for more
     gardenVisitMount(root, f, view) / gardenVisitUnmount()    94-garden-social-2visit.js puts the world on the page

   WAITING FOR THEM. What you do on the saved copy with Help or Play comes out of your bag first (ledger `gl.o.<id>`, q: 1, the same record a live intent uses), shows with a
   little clock, and goes by the friend mailbox (POST /api/garden-live/queue -> gl:q). When they next open their garden, their page runs it through _glhIntent, the same code and the
   same id as a live intent. It answers by the same posts as ever: `did` (it happened) or `back` (it could not: your record goes, so it is back in your bag, once).
   ============================================================ */
const _gdv = { on: false, fid: '', f: null, rev: 0, memo: null, memoKey: '', raw: null, clean: null, undo0: 0, watered: new Set(), asked: new Map(), tagKey: '' };
function gardenVisitOn() { return _gdv.on; }
function gardenVisitUndoFloor() { return _gdv.on ? _gdv.undo0 : 0; }
/** What the garden shows changed: draw it again, soon. */
function _gdvTouch() { _gdv.rev++; _gdv.memo = null; _gdv.raw = null; if (_gdv.on && typeof gardenRepaintSoon === 'function') gardenRepaintSoon(); }
function _gdvFirst() { return _gscFirst(_gdv.fid); }
function _gdvSnap() {
  const c = gardenSocialFriendCached(_gdv.fid), raw = c && c.garden ? c.garden.snap : null;
  if (!raw) return _gdv.clean;
  if (raw !== _gdv.raw || !_gdv.clean) { const s = gardenSnapshotClean(raw); if (s) { _gdv.clean = s; _gdv.raw = raw; } }
  return _gdv.clean;
}
/** What their app last told yours you may do there: {lv, q}. It lets you try; their computer has the last word. */
function _gdvTheirs() { const v = _gll.view, r = v && v.theirs ? v.theirs[_gdv.fid] : null; return r || null; }
/** How this act would go just now: 'live', 'queue', 'small' or '' (not allowed). */
function _gdvHow(t) {
  if (!_gdv.on) return '';
  if (_glvLive()) return glMayDo(_glv.lv, t) ? '' : 'live';
  const th = _gdvTheirs();
  if (th && th.q !== false && GL_QUEUE.acts.includes(t) && !glMayDo(th.lv, t)) return 'queue';
  return t === 'water' ? 'small' : '';
}
/** May you do this to this thing? What is yours, always; what is the host's, if they said so; what is another visitor's, never (the host checks again). */
function gardenVisitMay(t, item) {
  if (!_gdvHow(t)) return false;
  const a = GL_ACTS[t];
  if (a && a.mine && item) return !!item.mine || (!item.by && _glv.touch === true);
  return true;
}
function gardenVisitWants(p) { return p.ripe ? gardenVisitMay('harvest', p) : gardenVisitMay('water', p) && _gdvHow('water') !== 'small'; }
function gardenVisitCount(m, t) {
  if (t === 'harvest') return m.plants.filter(p => p.ripe && !p.pend && gardenVisitMay('harvest', p)).length;
  return _gdvHow('water') && _gdvHow('water') !== 'small' ? m.plants.filter(p => p.thirsty && p.def.thirst && p.def.special !== 'heart' && !p.pend).length : 0;
}
/** The cursor over a plant: the same pictures as at home, and the X for what your level does not reach. */
function _gdvActOf(p, tool) { return tool === 'water' ? 'water' : tool === 'feed' ? 'feed' : tool === 'trim' ? 'weed' : tool === 'dig' ? 'dig' : p.def.special === 'heart' ? '' : p.ripe ? 'harvest' : p.thirsty && p.def.thirst ? 'water' : p.overgrown && p.stage >= 3 ? 'weed' : ''; }
function gardenVisitCursor(p, tool) {
  const act = _gdvActOf(p, tool);
  if (!act) return 'hand';
  if (!gardenVisitMay(act, p)) return 'no';
  return { water: 'can', feed: 'feed', weed: 'shears', dig: 'spade', harvest: 'hand' }[act] || 'hand';
}
function gardenVisitPlantLine(p, stageName) { return p.pend === 'wait' ? `Waiting for ${_gdvFirst()}` : p.pend ? 'Just a moment' : p.by ? _gllByLine('p', p.mine ? 'you' : p.by) : p.ripe ? 'Ready' : stageName; }
function gardenVisitDecorLine(d) { return d.pend === 'wait' ? `Waiting for ${_gdvFirst()}` : d.by ? _gllByLine('d', d.mine ? 'you' : d.by) : ''; }
/** A decoration's bubble on a visit: what is yours you can turn, move, take back or give; a seat you can sit on; anything else is theirs to enjoy. */
function gardenVisitDecorBubble(d, m, items) {
  const def = d.def;
  if (def.effect && def.effect.kind === 'sit') items.push({ ic: 'armchair', label: 'Sit down', cls: 'is-go', run: () => _glvSit(d) });
  if (def.effect && def.effect.kind === 'show') items.push({ ic: 'eye', label: `What ${_gdvFirst()} shows`, run: () => gardenPopupOpen('visit') });
  if (d.pend || !gardenVisitMay('move', d)) return;
  if (def.rot) items.push({ ic: 'rotate-cw', label: 'Turn', run: () => _ghDoTo(d.uid, gardenRotateDecor(d.uid)) });
  if (def.v > 1) items.push({ ic: 'palette', label: 'Restyle', run: () => _ghDoTo(d.uid, gardenStyleDecor(d.uid)) });
  items.push({ ic: 'move', label: 'Move', run: () => gardenMoveStart(d.uid, 'decor') });
  items.push({ svg: _GH_GLYPH.bag, label: d.mine ? 'Back in your bag' : 'Take it', run: () => { _ghDoTo(d.uid, gardenRemoveDecor(d.uid)); _gdp.sel = ''; } });
  if (d.mine) items.push({ ic: 'gift', label: `Give it to ${_gdvFirst()}`, run: () => { _gdvDo('give', { p: def.id, x: d.x, y: d.y }, '', _ghNodeOf(d.uid)); _gdp.sel = ''; } });
}
function gardenVisitMayMove(uid) {
  if (!_gdv.on) return true;
  const m = gardenHere(), it = gardenPlantById(m, uid) || gardenDecorById(m, uid);
  if (it && gardenVisitMay('move', it)) return true;
  _gdvDeny('move', _ghNodeOf(uid));
  return false;
}

/* ---------- the model: the shape of gardenModel(), from their snapshot ---------- */
/** What you asked for that has not been settled: shown now, gone again if it is refused. */
function _gdvAsked() {
  const out = [];
  for (const P of _glv.pending.values()) if (P.f) out.push({ t: P.t, f: P.f, pend: 'pend' });
  if (typeof gardenReady === 'function' && gardenReady()) for (const [k, e] of Object.entries(_gdG().led)) if (k.startsWith('gl.o.') && e && e.q && !e.ok && e.to === _gdv.fid) out.push({ t: e.t, f: { p: e.p, x: e.x, y: e.y }, pend: 'wait' });
  return out;
}
function _gdvRows(s) {
  const plants = s.plants.map(r => ({ id: r[0], x: r[1], y: r[2], s: r[3], v: r[4], fl: r[5] || 0 })), decor = s.decor.map(r => ({ id: r[0], x: r[1], y: r[2], r: r[3], v: r[4] }));
  const cell = (list, f) => list.findIndex(q => q.x === f.x && q.y === f.y && (!f.p || q.id === f.p));
  const c = gardenSocialFriendCached(_gdv.fid);
  if (c && Array.isArray(c.mine)) for (const a of c.mine) if (a.t === 'water' && a.d === c.today) { const i = cell(plants, { x: a.x, y: a.y }); if (i >= 0) plants[i].fl &= ~1; }
  for (const key of _gdv.watered) { const [x, y] = key.split(',').map(Number), i = cell(plants, { x, y }); if (i >= 0) plants[i].fl &= ~1; }
  for (const { t, f, pend } of _gdvAsked()) {
    const pi = f.p != null ? cell(plants, f) : -1, di = f.p != null ? cell(decor, f) : -1;
    if (t === 'plant') { if (pi < 0) plants.push({ id: f.p, x: f.x, y: f.y, s: 0, v: 0, fl: 0, pend, mine: true }); }
    else if (t === 'place') { if (di < 0) decor.push({ id: f.p, x: f.x, y: f.y, r: 0, v: 0, pend, mine: true }); }
    else if (t === 'water' && pi >= 0) { plants[pi].fl &= ~1; plants[pi].pend = pend; }
    else if (t === 'weed' && pi >= 0) { plants[pi].fl &= ~2; plants[pi].pend = pend; }
    else if (t === 'feed' && pi >= 0) plants[pi].pend = pend;
    else if (t === 'harvest' && pi >= 0) { plants[pi].fl &= ~4; plants[pi].s = Math.min(3, plants[pi].s); plants[pi].pend = pend; }
    else if (t === 'dig' && pi >= 0) plants.splice(pi, 1);
    else if (t === 'take' && di >= 0) decor.splice(di, 1);
    else if (t === 'move') { const list = pi >= 0 ? plants : decor, i = pi >= 0 ? pi : di; if (i >= 0) { list[i].x = f.tx; list[i].y = f.ty; list[i].pend = pend; } }
    else if ((t === 'turn' || t === 'give') && di >= 0) decor[di].pend = pend;
  }
  return { plants, decor };
}
function gardenVisitModel() {
  if (!_gdv.on) return null;
  const s = _gdvSnap(); if (!s) return null;
  const now = _gdNow(), key = [_gdv.fid, _gdv.rev, _gd.rev, Math.floor(now / 60000), gardenFun()].join('|');
  if (_gdv.memo && _gdv.memoKey === key) return _gdv.memo;
  const today = _gdToday(), season = s.season, tod = _gdTod(now, season, s), rain = { now: s.wx > 0, snow: s.wx === 2, last: s.wx ? now : 0, label: s.wx === 2 ? 'Snow' : s.wx === 1 ? 'Rain' : '' };   // (their weather: what the snapshot said)
  // (a friend on an older version has no lake or woods in their areas: the lake is always there, the woods from level 4)
  const areas = s.areas.slice(); if (!areas.includes('lake')) areas.push('lake'); if (s.lv >= 4 && !areas.includes('woods')) areas.push('woods');
  gardenLandSet(areas.filter(id => { const a = gardenArea(id); return a && a.buy; }));
  const rows = _gdvRows(s), by = (kind, x, y) => (_glvLive() ? _gll.by.get(kind + '|' + x + '|' + y) || '' : '');
  const plants = [], decor = [], cats = {};
  let blooms = 0, ripe = 0, thirsty = 0, trees = 0;
  for (const r of rows.plants) {
    const def = gardenPlant(r.id); if (!def) continue;
    const uid = 'vp' + r.x + '_' + r.y, name = by('p', r.x, r.y), isRipe = !!(r.fl & 4), dry = !!(r.fl & 1);
    plants.push({ uid, def, x: r.x, y: r.y, fp: def.fp || 1, t: (gardenHash(uid) % 1000) / 1000, hc: 0, planted: 0, stage: r.s, hours: 0, thirsty: dry, dry: 0, lastWater: 0, ripe: isRipe, overgrown: !!(r.fl & 2), inSeason: true, nextIn: null, variant: r.v, heart: def.special === 'heart' ? s.heart : undefined, by: name, mine: !!r.mine || (!!name && name === _glv.selfName), pend: r.pend || '' });
    if (r.s >= 4 && ['flower', 'wild', 'water', 'exotic'].includes(def.cat)) blooms++;
    if (isRipe) ripe++;
    if (dry) thirsty++;
    if (def.cat === 'tree' && r.s >= 3) trees++;
    cats[def.cat] = (cats[def.cat] || 0) + 1;
  }
  for (const r of rows.decor) {
    const def = gardenDecor(r.id); if (!def) continue;
    const name = by('d', r.x, r.y);
    decor.push({ uid: 'vd' + (def.layer === 'ground' ? 'g' : '') + r.x + '_' + r.y, def, x: r.x, y: r.y, r: r.r, v: r.v, at: 0, by: name, mine: !!r.mine || (!!name && name === _glv.selfName), pend: r.pend || '' });
  }
  const occ = new Map(), cellOf = (x, y) => { const k = x + ',' + y; let c = occ.get(k); if (!c) occ.set(k, c = {}); return c; };
  for (const p of plants) for (let dy = 0; dy < p.fp; dy++) for (let dx = 0; dx < p.fp; dx++) { const c = cellOf(p.x + dx, p.y + dy); if (!c.plant) c.plant = p.uid; }
  for (const d of decor) for (let dy = 0; dy < (d.def.h || 1); dy++) for (let dx = 0; dx < (d.def.w || 1); dx++) { const c = cellOf(d.x + dx, d.y + dy); if (d.def.layer === 'ground') { if (!c.ground) c.ground = d.uid; } else if (!c.decor) c.decor = d.uid; }
  const cc = gardenSocialFriendCached(_gdv.fid), how = _gdvHow('water'), wleft = how === 'small' ? (cc ? _gsvLeft(cc, 'water') : 0) : how ? GL_CAPS.water : 0;
  const first = _gdvFirst();
  const m = { now, today, season, south: _gdSouth(), tod, events: gardenEventsOn(today), rain, level: { level: s.lv }, areas, plants, decor, occ, blooms, ripe, thirsty, trees, cats, heart: s.heart, wallet: gardenWallet(), totalDone: 0, water: { cap: wleft, bonus: 0, used: 0, left: wleft, raining: false },
    visit: { fid: _gdv.fid, f: _gdv.f, name: gardenSocialName(_gdv.fid), live: _glvLive(), lv: _glvLive() ? _glv.lv : (_gdvTheirs() || {}).lv || 'none', key, snap: s, sh: s.sh || null, shSig: typeof gardenShowSig === 'function' ? gardenShowSig(s.sh) : '', drawFriend: _glvLive() ? null : _gdv.f,
      no: { plant: _gdvHow('plant') ? '' : `${first} has not let you plant here yet`, decor: _gdvHow('place') ? '' : `${first} has not let you place things here yet` } } };
  m.visitors = _gdVisitorsNow(m);
  _gdv.memo = m; _gdv.memoKey = key;
  return m;
}

/* ---------- saying no, and asking for more ---------- */
const _GDV_VERB = Object.freeze({ plant: 'plant', place: 'place things', water: 'water', weed: 'tidy', feed: 'feed the plants', harvest: 'pick', dig: 'dig', move: 'move things', take: 'take things', give: 'give things', turn: 'turn things' });
/** The same red flash and X as at home, with a padlock, and one tap asks them for more. */
function _gdvDeny(t, target) {
  gameDeny(target || null, { kind: 'lock', say: `${_gdvFirst()} has not let you ${_GDV_VERB[t] || 'do that'} here yet.` });
  const was = _gdv.asked.get(_gdv.fid) || 0, now = Date.now();   // clock-ok: spacing a request
  if (now - was > 3600000 && typeof _gw !== 'undefined') {
    const first = _gdvFirst(), fid = _gdv.fid;
    gardenBubbleOpen({ x: _gw.px, y: _gw.py - 1.5 }, { title: 'Not yet', cls: 'is-ask', items: [{ ic: 'hand', label: `Ask ${first} for more`, cls: 'is-go', run: (b) => {
      _gdv.asked.set(fid, Date.now());   // clock-ok: spacing a request
      _gllApi('/api/garden-live/ask', { to: fid }).then(() => { gameCheer(b, { text: '✓', tone: 'xp' }); _gdgNote(`You asked ${first}`, icon('hand')); }).catch(() => { _gdv.asked.delete(fid); gameDeny(null, { say: 'That did not go. Try again in a moment.' }); });
    } }] });
  }
  return { ok: false, msg: '', shown: true };
}
function gardenVisitDenied(t) { return _gdvDeny(t, null); }
function gardenVisitClickNo(p, tool) { return _gdvDeny(_gdvActOf(p, tool), _ghNodeOf(p.uid)); }

/* ---------- an action on a visit ---------- */
/** One act, whichever way it goes. debit: what leaves your bag first. */
function _gdvDo(t, f, debit, target) {
  const how = _gdvHow(t);
  if (!how) return _gdvDeny(t, target);
  if (how === 'live') { _glvIntent(t, f, debit); return { ok: true, msg: '' }; }
  if (how === 'queue') return _gdvQueue(t, f, debit, target);
  return _gdvSmallWater(f, target);
}
function gardenVisitAct(t, a) {
  if (!_gdv.on) return null;
  const m = gardenHere(), p = a.uid ? gardenPlantById(m, a.uid) : null, d = a.uid && !p ? gardenDecorById(m, a.uid) : null, it = p || d, node = a.uid ? _ghNodeOf(a.uid) : null;
  const need = (act) => (gardenVisitMay(act, it) ? null : _gdvDeny(act, node));
  if (it && it.pend === 'pend' && t !== 'plant' && t !== 'place') return { ok: true, msg: '' };   // it is on its way already
  switch (t) {
    case 'plant': {
      const def = gardenPlant(a.id); if (!def) return _gdNo('Unknown seed');
      if (def.special === 'heart') return _gdNo('The old oak stays where it is');
      if (!_gdvHow('plant')) return _gdvDeny('plant');
      if (gardenHas('seed:' + a.id) < 1) return _gdNo(`No ${def.name} seeds left: the shop has more`);
      const why = _gdPlaceOk(m, def, a.x, a.y, 'plant'); if (why) return _gdNo(why);
      return _gdvDo('plant', { p: a.id, x: a.x, y: a.y }, 'seed:' + a.id);
    }
    case 'place': {
      const def = gardenDecor(a.id); if (!def) return _gdNo('Unknown decoration');
      if (!_gdvHow('place')) return _gdvDeny('place');
      if (gardenHas('decor:' + a.id) < 1) return _gdNo(`You have no ${def.name.toLowerCase()} to place: the shop has them`);
      const why = _gdPlaceOk(m, def, a.x, a.y, 'decor'); if (why) return _gdNo(why);
      return _gdvDo('place', { p: a.id, x: a.x, y: a.y, ...(def.rot && a.r ? { r: Number(a.r) & 3 } : {}) }, 'decor:' + a.id);
    }
    case 'water':
      if (!p) return _gdNo('Nothing to water there');
      if (!p.def.thirst || p.def.special === 'heart') return _gdNo(p.def.cat === 'water' ? 'It lives in the pond: never thirsty' : 'Its roots go deep: it finds its own water');
      if (p.pend === 'wait') return _gdNo(`That is already waiting for ${_gdvFirst()}`);
      return need('water') || _gdvDo('water', { p: p.def.id, x: p.x, y: p.y }, '', node);
    case 'weed':
      if (!p) return _gdNo('Nothing to trim there');
      if (p.stage < 3) return _gdNo('Too young for a trim');
      return need('weed') || _gdvDo('weed', { p: p.def.id, x: p.x, y: p.y }, '', node);
    case 'feed':
      if (!p) return _gdNo('Nothing to feed there');
      if (p.def.special === 'heart') return _gdNo('The old oak grows with its owner’s work, not with feed');
      if (!gardenVisitMay('feed', p)) return _gdvDeny('feed', node);
      if (gardenHas('fertiliser') < 1) return _gdNo('No fertiliser: the shop or a compost bin has some');
      return _gdvDo('feed', { p: p.def.id, x: p.x, y: p.y }, 'fertiliser', node);
    case 'harvest':
      if (!p) return _gdNo('Nothing to harvest there');
      if (!p.def.yield) return _gdNo(`${p.def.name} is grown for its looks`);
      if (!p.ripe) return _gdNo('Not ready yet');
      return need('harvest') || _gdvDo('harvest', { p: p.def.id, x: p.x, y: p.y }, '', node);
    case 'dig':
      if (!p) return _gdNo('Nothing to dig up there');
      if (p.def.special === 'heart') return _gdNo('The old oak stays: it is this garden’s heart');
      return need('dig') || _gdvDo('dig', { p: p.def.id, x: p.x, y: p.y }, '', node);
    case 'move': {
      if (!it) return _gdNo('Nothing to move');
      if (it.x === a.x && it.y === a.y) return { ok: true, msg: '' };
      const no = need('move'); if (no) return no;
      const why = _gdPlaceOk(m, it.def, a.x, a.y, p ? 'plant' : 'decor', a.uid); if (why) return _gdNo(why);
      return _gdvDo('move', { p: it.def.id, x: it.x, y: it.y, tx: a.x, ty: a.y }, '', node);
    }
    case 'take':
      if (!d) return _gdNo('Nothing to put away');
      return need('take') || _gdvDo('take', { p: d.def.id, x: d.x, y: d.y }, '', node);
    case 'turn':
      if (!d) return _gdNo('Nothing to turn');
      return need('turn') || _gdvDo('turn', { p: d.def.id, x: d.x, y: d.y, ...(a.style ? { r: 1 } : {}) }, '', node);
    case 'waterAll': {
      if (!_gdvHow('water')) return _gdvDeny('water');
      const list = m.plants.filter(q => q.thirsty && q.def.thirst && q.def.special !== 'heart' && !q.pend);
      if (!list.length) return _gdNo('Everything has had a drink');
      for (const q of list.slice(0, 30)) _gdvDo('water', { p: q.def.id, x: q.x, y: q.y }, '', _ghNodeOf(q.uid));
      return { ok: true, msg: '' };
    }
    case 'harvestAll': {
      if (!_gdvHow('harvest')) return _gdvDeny('harvest');
      const list = m.plants.filter(q => q.ripe && q.def.yield && !q.pend && gardenVisitMay('harvest', q));
      if (!list.length) return _gdNo('Nothing here is yours to pick yet');
      for (const q of list.slice(0, 30)) _gdvDo('harvest', { p: q.def.id, x: q.x, y: q.y }, '', _ghNodeOf(q.uid));
      return { ok: true, msg: '' };
    }
    case 'collect': case 'land': return _gdvDeny('take', node);
    default: return _gdNo('Not here');
  }
}
/** The saved copy's one watering a day (garden:act): the rule it has always had. */
function _gdvSmallWater(f, target) {
  const c = gardenSocialFriendCached(_gdv.fid), key = f.x + ',' + f.y, fid = _gdv.fid;
  if (c && !_gsvLeft(c, 'water')) return _gdNo('You watered here today, come back tomorrow');
  _gdv.watered.add(key); _gdvTouch();
  gardenSocialAct(fid, 'water', { p: f.p, x: f.x, y: f.y }, { quiet: true }).then((r) => {
    if (r) { gameCheer(target && target.isConnected ? target : null, { tone: 'water', text: '+' + GSOC_XP.water }); return; }
    _gdv.watered.delete(key); if (_gdv.fid === fid) _gdvTouch();
  });
  return { ok: true, msg: '' };
}

/* ---------- what waits for them ---------- */
function _gdvQueueMine(fid) { return Object.entries(_gdG().led).filter(([k, e]) => k.startsWith('gl.o.') && e && e.q && e.to === fid); }
/** It comes out of your bag first, shows with a little clock, and goes by the mailbox. Within a small allowance for each friend, which their server holds to as well. */
function _gdvQueue(t, f, debit, target) {
  const rows = _gdvQueueMine(_gdv.fid), today = _gllToday();
  if (rows.filter(([, e]) => !e.ok).length >= GL_QUEUE.perFriend || rows.filter(([, e]) => e.d === today).length >= GL_QUEUE.perDay) { gameDeny(target || null, { kind: 'lock', say: `That is plenty waiting for ${_gdvFirst()} for now.` }); return { ok: false, msg: '', shown: true }; }
  const i = _gllNewId();
  _glvDebit(i, t, f, debit, { q: 1, at: Math.floor(_gdNow()) });
  if (typeof gartPlayerAct === 'function') gartPlayerAct(_GL_POSE[t] || 'pick', 760);
  _gdvTouch();
  _gdvQueueSend(i);
  return { ok: true, msg: '' };
}
function _gdvQueueSend(i) {
  const e = _gdG().led['gl.o.' + i];
  if (!e || !e.q || e.qs || e.ok) return;
  _gllApi('/api/garden-live/queue', { to: e.to, i, t: e.t, p: e.p, x: e.x, y: e.y, ...(e.r != null ? { r: e.r } : {}), at: e.at }).then((r) => {
    const c = _gdG().led['gl.o.' + i];
    if (c && r && r.sent !== false) { c.qs = 1; if (typeof saveUI === 'function') saveUI(); }
  }).catch(() => { /* still in your record: it goes the next time a garden opens */ });
}
/** What never left this computer goes now. */
function gardenVisitQueueFlush() {
  if (typeof gardenReady !== 'function' || !gardenReady()) return;
  for (const [k, e] of Object.entries(_gdG().led)) if (k.startsWith('gl.o.') && e && e.q && !e.qs && !e.ok) _gdvQueueSend(k.slice(5));
}

/* ---------- the page ---------- */
function gardenVisitMount(root, f, view) {
  const same = _gdv.on && _gdv.fid === f.id;
  if (same && root.querySelector(':scope > .gd-tab-garden')) { _gdv.f = f; _gdvTouch(); return; }
  if (!same) { if (typeof _gw !== 'undefined') _gw.placed = false; _gdv.undo0 = _gd.undo.length; _gdv.watered.clear(); _gdv.clean = null; if (typeof gardenLifeVisitStop === 'function') gardenLifeVisitStop(); }
  _gdv.on = true; _gdv.fid = f.id; _gdv.f = f; _gdv.tagKey = ''; _gdvTouch();
  root.textContent = ''; root.className = 'gsv-worldhost';
  _gdpWorldMount(root, view);
  { const box = root.querySelector('.gd-stagebox'); if (box && !document.querySelector('.modal')) box.focus({ preventScroll: true }); }   // (you arrive, and the keys walk at once)
  gardenVisitQueueFlush();
  if (typeof petVisitPerform === 'function' && !_glvLive()) { const st = root.querySelector('.gd-stage'), s = _gdvSnap(); if (st && s) petVisitPerform(st, s, f); }
}
function gardenVisitUnmount() {
  if (!_gdv.on) return;
  _gdpWorldUnmount();
  if (typeof gardenLifeVisitStop === 'function') gardenLifeVisitStop();
  _gdv.on = false; _gdv.fid = ''; _gdv.f = null; _gdv.memo = null; _gdv.raw = null; _gdv.clean = null;
  if (typeof _gw !== 'undefined') _gw.placed = false;
  _gd.memoKey = '';   // (your own land again, the next time your garden is worked out)
}
const _GDV_STATE = Object.freeze({ look: 'Look', help: 'Help', play: 'Play' });
/** One small tag: whose garden this is, how you are here, and the way home. Names go in with textContent. */
function gardenVisitTagPaint(box, m) {
  let el = box.querySelector(':scope > .gd-visittag');
  if (!m.visit) { if (el) el.remove(); return; }
  box.classList.add('is-visit');
  const name = m.visit.name, live = m.visit.live, knock = _glv.state === 'knocking', note = live || knock ? '' : _GLV_NOTES[_glv.why] || '', hint = live ? (_GDV_STATE[_glv.lv] || '') : knock ? 'Knocking…' : 'As they last shared it';
  const key = [name, live, hint, note, _glv.road, _glv.state, _glv.why].join('|');
  if (el && _gdv.tagKey === key) return;
  _gdv.tagKey = key;
  if (!el) { el = document.createElement('div'); el.className = 'gd-visittag'; box.appendChild(el); }
  el.textContent = '';
  el.classList.toggle('is-live', !!live);
  el.setAttribute('role', 'status');
  const t = _gsvEl('button', 'gd-vt-who'); t.type = 'button'; t.setAttribute('data-tip', note || (live ? 'You are in their garden, live' : 'Their garden as they last shared it'));
  t.appendChild(_gsvEl('i', 'gd-vt-dot'));
  t.appendChild(_gsvEl('b', null, `${name}'s garden`));
  t.appendChild(_gsvEl('span', 'gd-vt-how', hint));
  t.onclick = () => gardenPopupOpen('visit');
  el.appendChild(t);
  if (_glv.state === 'look' && _glv.why && _glv.why !== 'home') el.appendChild(_gsvBtn('Knock', { kind: 'btn-ghost', cls: 'gd-vt-knock', tip: 'Knock again', run: _glvKnockAgain }));
  el.appendChild(_gsvBtn('', { icon: 'house', kind: 'btn-ghost', cls: 'gd-vt-home', aria: 'Back to your garden', tip: 'Back to your garden', run: () => setView('garden') }));
}
