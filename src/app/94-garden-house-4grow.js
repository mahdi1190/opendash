/* ============================================================
   YOUR OWN HOUSE, room by room (FUN-ROADMAP Phase 6; BIG-IDEAS 2 "Room by Room"). The plan (HOUSE_PLAN, 94-garden-house-0rules.js):
   the parlour through the kitchen wall, the loft up a ladder from the parlour, the guest room off the loft. One at a time:

     the plans       "Build on" at the top of any room (and the cottage's bubble outside): a cut-through drawing of the house, each room
                     with what it is for and what it costs. Coins, timber and stone (real work earns all three) go in the builders' jar.
     the builders    come the night the jar is full: the room is ready the next day (st 3, d), and the scaffold is up outside until then.
                     A friend who lends a hand finishes it at once (their handprint goes in by the hearth).
     ready           a doorway opens in the room before it (what stood there moves over: houseMakeWay), the cottage grows outside, and
                     a housewarming waits for you (94-garden-house-5warm.js)
     the guest room  named for a friend: their name on its door, from the name they show

   Outside (wdMod 'house-outside', in a friend's garden too, from their snapshot): the scaffold while the builders work, what each room
   added to the cottage, the mailbox by the door (94-garden-house-5post.js) and your banner on a pole on the roof. Placed by the building's own
   drawn picture (its box and foot in the world), never by cells, so any house on any layout gets them.
   No top-level calls.
   ============================================================ */

/* ---------- the button in the room ---------- */
function _hsGrowUi(R, S, bar) {
  const visit = gpVisiting(), live = visit && typeof _glvLive === 'function' && _glvLive();
  if (visit && !live) return;
  const b = gpEl('button', 'btn btn-secondary btn-sm hs-grow', visit ? 'The plans' : 'Build on'); b.type = 'button';
  b.onclick = (ev) => { ev.stopPropagation(); _hsPlanOpen(); };
  const mv = bar.querySelector('.hs-move'); if (mv) bar.insertBefore(b, mv); else bar.appendChild(b);
  S.btnGrow = b;
}

/* ---------- the plans: a little drawing of the house as it is ---------- */
/** The house cut through, as a builder would chalk it: the kitchen and parlour below, the loft and guest room under the roof. */
function _hsPlanSvg(v) {
  const rooms = (v && v.rooms) || {}, st = s => Number((rooms[String(s)] || {}).st) || 0, next = housePlanNext(rooms);
  const box = (s, x, y, w, h, label) => {
    const k = st(s), building = k === 3, built = k === 2 || s === 0, isNext = next && next.s === s;
    const fill = built ? '#f4e6c8' : building ? '#e8d4b0' : 'none', stroke = built || building ? '#6a4a2e' : isNext ? '#a8865a' : '#cbb898';
    let t = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="${built ? 2.4 : 1.8}"${built || building ? '' : ' stroke-dasharray="6 5"'}/>`;
    if (building) for (let i = 0; i < 4; i++) t += `<path d="M${x + 8 + i * (w - 16) / 3} ${y + h}V${y + 6}" stroke="#8a6238" stroke-width="2.4"/>` + `<path d="M${x + 4} ${y + h * .4 + i * 0}H${x + w - 4}" stroke="#a8784a" stroke-width="3"/>`;
    t += `<text x="${x + w / 2}" y="${y + h / 2 + 5}" text-anchor="middle" font-size="13" font-family="Georgia, serif" fill="${built ? '#3a2410' : building ? '#5a3a1a' : '#9a8460'}">${label}</text>`;
    return t;
  };
  return `<svg viewBox="0 0 360 210" class="hs-plan-svg" role="img" aria-label="Your house, room by room">`
    + `<path d="M20 102L180 18L340 102" fill="none" stroke="#6a4a2e" stroke-width="3" stroke-linejoin="round"/><path d="M236 34V52" stroke="#6a4a2e" stroke-width="7"/>`
    + `<path d="M10 196H350" stroke="#8a9a6a" stroke-width="3" stroke-linecap="round"/>`
    + box(2, 92, 62, 100, 42, 'Loft') + box(3, 196, 62, 74, 42, 'Guest')
    + box(0, 40, 108, 140, 86, 'Kitchen') + box(1, 184, 108, 136, 86, 'Parlour')
    + `<rect x="98" y="152" width="18" height="42" rx="2" fill="#6a4a2e" opacity=".85"/><circle cx="112" cy="174" r="1.6" fill="#e8c878"/>`
    + `</svg>`;
}
/** What is in your purse for the builders. */
function _hsPurse() { const w = gardenWallet(); return { c: w.coins === Infinity ? 1e9 : Math.floor(w.coins), t: gardenHas('mat:timber'), st: gardenHas('mat:stone') }; }
function _hsCostWords(c) { return [c.c ? `${c.c} coins` : '', c.t ? `${c.t} timber` : '', c.st ? `${c.st} stone` : ''].filter(Boolean).join(', ') || 'nothing more'; }
function _hsPlanOpen() {
  if (typeof openDialog !== 'function') return;
  let root = null;
  const draw = () => { if (root && root.isConnected) { root.textContent = ''; _hsPlanBody(root, draw); } };
  openDialog({ title: gpVisiting() ? 'Your friend’s house' : 'Building on', width: 560, className: 'hs-plan-dlg gd-popup', body(el) { root = el; _hsPlanBody(el, draw); } });
}
function _hsPlanBody(el, again) {
  const v = _hsView(); if (!v) { el.appendChild(gpEl('p', 'muted', 'Nobody lives here yet.')); return; }
  const visit = gpVisiting(), rooms = v.rooms || {}, next = housePlanNext(rooms);
  const art = gpEl('div', 'hs-plan-art'); art.innerHTML = _hsPlanSvg(v); el.appendChild(art);
  el.appendChild(gpEl('p', 'hs-plan-lead', visit ? 'Their house, room by room. Put something in the builders’ jar, or lend a hand while they build: it is all one house between friends.' : 'One room at a time. Fill the builders’ jar with coins, timber and stone, and they come that night: the room is ready in the morning. Friends can put in too.'));
  for (const row of HOUSE_PLAN) {
    const me = rooms[String(row.s)] || {}, k = Number(me.st) || 0, card = gpEl('div', 'hs-plan-room' + (k === 2 ? ' is-built' : k === 3 ? ' is-building' : next && next.s === row.s ? ' is-next' : ' is-later'));
    const head = gpEl('div', 'hs-plan-h'); head.appendChild(gpEl('b', null, row.name));
    head.appendChild(gpEl('span', 'hs-plan-state', k === 2 ? 'Built' : k === 3 ? 'The builders are at work' : next && next.s === row.s ? 'Next' : 'Later'));
    card.appendChild(head);
    card.appendChild(gpEl('p', 'hs-plan-blurb', row.blurb));
    if (k === 2) {
      card.appendChild(gpEl('p', 'muted hs-plan-use', row.use));
      if (row.id === 'guest') {
        const g = v.guest && v.guest.s === row.s ? v.guest.n : '';
        card.appendChild(gpEl('p', 'hs-plan-guest', g ? `Named for ${g}. Their name is on the door.` : 'Not named for anyone yet.'));
        if (!visit) { const nb = gpEl('button', 'btn btn-secondary btn-sm', g ? 'Name it for someone else' : 'Name it for a friend'); nb.type = 'button'; nb.onclick = () => _hsGuestPick(row.s, again); card.appendChild(nb); }
      }
    } else if (k === 3) {
      const day = me.d || '', today = _gdToday();
      card.appendChild(gpEl('p', 'hs-plan-when', day && day > today ? 'Ready tomorrow morning. The scaffold is up outside.' : 'Nearly done: it will be ready the next time you look in.'));
      if (visit) { const hb = gpEl('button', 'btn btn-primary btn-sm', 'Lend the builders a hand'); hb.type = 'button'; hb.onclick = () => { if (_hsHelp(row.s)) { hb.disabled = true; hb.textContent = 'Off you go with a hammer…'; } }; card.appendChild(hb); }
    } else if (next && next.s === row.s) {
      const jar = v.jar && v.jar.s === row.s ? v.jar : { c: 0, t: 0, st: 0 }, need = houseJarNeed(row, jar);
      const bars = gpEl('div', 'hs-jar');
      for (const [key, label, of] of [['c', 'coins', row.cost.c], ['t', 'timber', row.cost.t], ['st', 'stone', row.cost.st]]) {
        if (!of) continue;
        const r = gpEl('div', 'hs-jar-r'); r.appendChild(gpEl('span', 'hs-jar-l', label));
        const bar = gpEl('span', 'hs-jar-bar'); const fill = gpEl('i'); fill.style.width = Math.round(100 * Math.min(1, (jar[key] | 0) / of)) + '%'; bar.appendChild(fill); r.appendChild(bar);
        r.appendChild(gpEl('span', 'hs-jar-n', `${Math.min(of, jar[key] | 0)} of ${of}`)); bars.appendChild(r);
      }
      card.appendChild(bars);
      const P = _hsPurse(), can = { c: Math.min(need.c, P.c, visit ? 960 : Infinity), t: Math.min(need.t, P.t), st: Math.min(need.st, P.st) };
      const any = can.c + can.t + can.st > 0;
      const put = gpEl('button', 'btn btn-primary btn-sm', any ? 'Put in what I can' : 'Nothing to put in yet'); put.type = 'button'; put.disabled = !any;
      put.title = any ? 'Put in ' + _hsCostWords(can) : 'Coins come from real work, timber from focus time, stone from finished tasks';
      put.onclick = () => { if (_hsJarPut(row, can)) setTimeout(again, 60); };
      card.appendChild(put);
      const n = x => Number(x).toLocaleString();
      card.appendChild(gpEl('p', 'muted hs-plan-need', `Still needed: ${_hsCostWords(need)}. You have ${P.c >= 1e9 ? 'all the' : n(P.c)} coins, ${n(P.t)} timber and ${n(P.st)} stone.`));
    } else {
      const from = HOUSE_PLAN_OF.get(row.from); card.appendChild(gpEl('p', 'muted hs-plan-need', `${_hsCostWords(row.cost)}, after ${from ? from.name.replace(/^The /, 'the ') : 'the room before'}.`));
    }
    el.appendChild(card);
  }
  if (typeof _hsPlanExtras === 'function') _hsPlanExtras(el, v, again);   // the cosy stars and your banner (94-garden-house-5warm.js, -7delight.js)
  el.appendChild(gpEl('p', 'muted hs-plan-foot', 'Coins come from real work, timber from time spent focused, and stone from tasks finished.'));
}
/** Put what you can in the builders' jar: your own house, or (on a visit) your friend's, from your own purse. */
function _hsJarPut(row, can) {
  if (gpVisiting()) {
    if (!(typeof _glvLive === 'function' && _glvLive())) { gardenToast('Your friend is out just now: the jar can wait.', { icon: 'house' }); return false; }
    let sent = 0;
    if (can.c > 0) { _glvIntent('house', { item: 'jar', x: row.s, p: 'coin', fx: Math.min(960, can.c) }, undefined, { c: -Math.min(960, can.c) }); sent++; }
    for (let i = 0; i < can.t; i++) { _glvIntent('house', { item: 'jar', x: row.s, p: 'timber' }, 'mat:timber'); sent++; }
    for (let i = 0; i < can.st; i++) { _glvIntent('house', { item: 'jar', x: row.s, p: 'stone' }, 'mat:stone'); sent++; }
    if (sent) gardenToast(`Into your friend’s builders’ jar: ${_hsCostWords(can)}.`, { icon: 'house', kind: 'ok' });
    return !!sent;
  }
  const op = { o: 'jar', s: row.s, c: can.c, t: can.t, st: can.st, lk: 'hj.' + row.s + '.' + _gdUid('') };
  const r = houseDo(op, 'Put in the builders’ jar', { tomorrow: true });
  if (!r.ok) { gardenToast(r.msg + '.', { icon: 'house' }); return false; }
  const g = _gdG(), me = g.hr[String(row.s)];
  if (me && Number(me.st) === 3) {
    gardenToast(`The jar is full. The builders come tonight: ${row.name.replace(/^The /, 'the ')} will be ready in the morning.`, { icon: 'house', kind: 'ok' });
    if (_hsInside()) _grmSay(`The jar is full. The builders come tonight: ${row.name.replace(/^The /, 'the ')} will be ready in the morning.`, 9000);
    try { if (typeof _fxSound === 'function') _fxSound('chime'); } catch (e) { /* no sound */ }
  } else { try { if (typeof _fxSound === 'function') _fxSound('coin'); } catch (e) { /* no sound */ } }
  _hsOutsideSoon();
  return true;
}
/** A friend lends the builders a hand: their computer asks yours, and the room is finished at once. A thank-you on their side. */
function _hsHelp(slot) {
  if (!(typeof _glvLive === 'function' && _glvLive())) { gardenToast('Your friend is out just now. The builders will manage.', { icon: 'house' }); return false; }
  _glvIntent('house', { item: 'help', x: slot });
  try { if (typeof gartPlayerAct === 'function') gartPlayerAct('pick', 900); } catch (e) { /* a pose */ }
  const got = _hsGive('house.helped', { 'mat:timber': 1 });
  gardenToast(got ? 'You lend a hand: hammer, saw, a cup of tea. The builders give you a spare length of timber to take home.' : 'You lend a hand: hammer, saw, a cup of tea.', { icon: 'house', kind: 'ok' });
  return true;
}
/** Name the guest room for a friend: their name, as they show it, goes on its door. */
function _hsGuestPick(slot, again) {
  const list = typeof _gscFriendList === 'function' ? _gscFriendList() : [];
  if (!list.length) { gardenToast('Add a friend first: the guest room is for them.', { icon: 'users' }); return; }
  openDialog({ title: 'Name the guest room', width: 420, className: 'hs-guest-dlg gd-popup', body(el) {
    el.appendChild(gpEl('p', 'muted', 'Their name goes on the door, and they get a key the first time they come in.'));
    const ul = gpEl('div', 'hs-guest-list');
    for (const f of list.slice(0, 24)) {
      const name = String((typeof _gscFirst === 'function' ? _gscFirst(f.id) : f.name) || 'A friend').slice(0, 22), b = gpEl('button', 'btn btn-secondary btn-sm', name); b.type = 'button';
      b.onclick = () => { const r = houseDo({ o: 'guest', s: slot, n: name, f: f.id }, 'Named the guest room for ' + name); if (!r.ok) { gardenToast(r.msg + '.'); return; } _hsDlgClose(); gardenToast(`The guest room is ${name}’s now. Their name is on the door.`, { icon: 'house', kind: 'ok' }); _hsSnapSoon(); if (again) setTimeout(again, 60); };
      ul.appendChild(b);
    }
    const none = gpEl('button', 'btn btn-ghost btn-sm', 'For nobody just now'); none.type = 'button';
    none.onclick = () => { houseDo({ o: 'guest', s: slot, n: '' }, 'Took the name off the guest room'); _hsDlgClose(); if (again) setTimeout(again, 60); };
    ul.appendChild(none); el.appendChild(ul);
  } });
}

/* ---------- the builders' night ---------- */
/** Your own page: a room whose day has come is finished (never on a visit: their page does theirs). Cheap: a few compares. */
function _hsGrowTick() {
  if (gpVisiting()) return;
  const g = _gdG(), hr = g.hr || {}, today = _gdToday();
  for (const row of HOUSE_PLAN) {
    const me = hr[String(row.s)]; if (!me || Number(me.st) !== 3 || (me.d && String(me.d) > today)) continue;
    const r = houseDo({ o: 'ready', s: row.s, seed: Math.floor(Math.random() * 9999), us: (HOUSE_ROOM_START[row.s] || []).map(() => _gdUid('h')) }, '', { noUndo: true });
    if (r.ok) _hsBuiltNow(row.s, '');
  }
}
/** A room is finished (the builders' night, or a friend's hand): say so, and the cottage outside grows to match. */
function _hsBuiltNow(slot, by) {
  const row = HOUSE_PLAN_OF.get(slot); if (!row) return;
  const g = _gdG(), made = g.hs && g.hs.made && g.hs.made.s === row.from && g.hs.made.d === _gdToday() ? g.hs.made : null;
  const who = by && typeof _glhByName === 'function' ? _glhByName(by) : '';
  const left = (HOUSE_ROOM_START[slot] || []).map(p => p.said).filter(Boolean).join(' and ');
  const line = `${row.name} is finished${who ? `: ${who} lent the builders a hand` : ''}! ${row.via === 'ladder' ? 'There is a ladder up to it from the parlour.' : row.via === 'door' ? 'Its door is in the loft.' : 'Its doorway is at the end of the kitchen.'}${left ? ` The builders left ${left}.` : ''}` + (made && made.n + made.a ? ` The builders moved ${made.n + made.a === 1 ? 'one thing' : 'a few things'} out of the way${made.a ? ' (what had nowhere to go is in your chest)' : ''}.` : '');
  try { gardenToast(line, { icon: 'house', kind: 'ok' }); } catch (e) { /* only words */ }
  if (_hsInside()) { _grmSay(line, 10000); try { GardenNativeRooms.burst(); } catch (e) { /* fine */ } }
  try { if (typeof _fxSound === 'function') _fxSound('fanfare'); } catch (e) { /* no sound */ }
  if (typeof _hsWarmSoon === 'function') _hsWarmSoon(slot);
  _hsOutsideSoon();
}

/* ---------- outside: the cottage as it grows ---------- */
const _hso = { sprites: new Map(), key: '', at: 0, soon: false, ms: 0, roofs: new Map() };
function _hsOutsideSoon() { _hso.soon = true; _hso.key = ''; }
/** The house's drawn picture in the world: { cx, foot, x0, x1, top, w, h } in world px, or null (not drawn yet, or not a painted building). */
function _hsOutBox(id) {
  try {
    const W = _gw.nativeWorld, rec = W && W.entities && W.entities.get('prop:' + id); if (!rec || !rec.bounds) return null;
    const b = rec.bounds, f = rec.metadata && rec.metadata.foot; if (!f || !Number.isFinite(f.x) || !Number.isFinite(f.y) || !(b.width > 20)) return null;
    return { cx: f.x, foot: f.y, x0: b.x, x1: b.x + b.width, top: b.y, w: b.width, h: f.y - b.y, rec };
  } catch (e) { return null; }
}
/**
 * The top edge of the house's own drawn picture (its roof, its chimney), read once from the picture's pixels: { at(dx) -> dy } in world px
 * from the foot point, or null. So what stands on the roof (a chimney, the banner's pole) stands on it, whatever the house is.
 */
function _hsOutRoof(B) {
  try {
    const inner = B.rec && B.rec.node && B.rec.node._inner; if (!inner || !inner.list) return null;
    let main = null; for (const o of inner.list) if (o && o.type === 'Image' && o.frame && (!main || o.displayWidth * o.displayHeight > main.displayWidth * main.displayHeight)) main = o;
    if (!main) return null;
    const key = main.texture.key + '|' + main.frame.name + '|' + Math.round(main.x) + '|' + Math.round(main.y) + '|' + Math.round(main.displayWidth);
    if (_hso.roofs.has(key)) return _hso.roofs.get(key);
    const src = main.texture.getSourceImage(), f = main.frame, N = 64, M = 80, c = document.createElement('canvas'); c.width = N; c.height = M;
    const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(src, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, N, M);
    const data = cx.getImageData(0, 0, N, M).data, tops = [];
    for (let i = 0; i < N; i++) { let y = M; for (let j = 0; j < M; j++) if (data[(j * N + i) * 4 + 3] > 150) { y = j; break; } tops.push(y); }
    const x0 = main.x - main.displayWidth * main.originX, y0 = main.y - main.displayHeight * main.originY, sx = main.displayWidth / N, sy = main.displayHeight / M;
    const R = { at(dx) { const i = Math.floor((B.cx + dx - x0) / sx); if (i < 0 || i >= N || tops[i] >= M) return null; return y0 + (tops[i] + .5) * sy - B.foot; } };
    _hso.roofs.set(key, R); if (_hso.roofs.size > 8) _hso.roofs.delete(_hso.roofs.keys().next().value);
    return R;
  } catch (e) { return null; }
}
/** What the outside shows: the rooms' states, the banner, the mailbox flag, day or night (one string: drawn again only when it changes). */
function gardenHouseOutsideKey() {
  const v = _hsView(); if (!v) return '';
  const r = HOUSE_PLAN.map(p => Number((v.rooms[String(p.s)] || {}).st) || 0).join(''), flag = typeof _hsPostUnread === 'function' && !gpVisiting() ? _hsPostUnread() : 0;
  return v.home + '|' + r + '|' + (v.bn || HOUSE_BANNER0) + '|' + (flag ? 1 : 0) + '|' + (_hsNight() ? 'n' : 'd');
}
function _hsNight() { try { const t = gardenHere().tod; return t === 'dusk' || t === 'night'; } catch (e) { return false; } }
/** One part as a world sprite: anchored (ax, ay) world px from the house's foot point, drawn round that anchor (svg in world px), and
 *  sorted just in front of the house's own row (z: its foot row and a hair), behind anyone who stands in front of it. lift: how high the
 *  anchor is above the ground. */
function _hsOutSprite(key, B, ax, ay, svg, dz, o) {
  const W = GARDEN_WORLD, x = (B.cx + ax) / W.cellW, y = (B.foot + 2 - W.sky) / W.cellH, lift = -ay, z = y + (dz || .02);
  let S = _hso.sprites.get(key);
  if (S && S.node && !S.node.isConnected) { try { S.remove(); } catch (e) { /* gone */ } _hso.sprites.delete(key); S = null; }
  if (!S) { S = wdSprite(Object.assign({ id: 'hs-out-' + key, x, y, z, lift, still: true, svg }, o || {})); _hso.sprites.set(key, S); }
  else { if (S.x !== x || S.y !== y || S.lift !== lift || S.z !== z) { S.x = x; S.y = y; S.z = z; S.lift = lift; S.tf = null; S.zk = null; } wdArt(S, svg); }
  return S;
}
function _hsOutClear(keep) { for (const [k, S] of _hso.sprites) if (!keep.has(k)) { try { S.remove(); } catch (e) { /* gone */ } _hso.sprites.delete(k); } }
/** Draw what the house shows outside, from its rooms (yours, or your friend's snapshot). Placed by its drawn picture: its box and foot,
 *  and the top edge of its roof read from the picture itself. */
function _hsOutsidePaint() {
  const t0 = performance.now(), H = gardenHouseMine(), keep = new Set();
  if (!H || !H.moved) { _hsOutClear(keep); return; }
  const B = _hsOutBox(H.id); if (!B) { _hsOutClear(keep); _hso.key = ''; return; }
  const v = _hsView(); if (!v) { _hsOutClear(keep); return; }
  const st = s => Number((v.rooms[String(s)] || {}).st) || 0, night = _hsNight(), roof = _hsOutRoof(B), w = B.w, h = B.h;
  // what each room added, in the cottage's own picture: the parlour a bay window, the loft a dormer in the thatch, the guest room a chimney of its own
  if (st(1) === 2) { keep.add('add-parlour'); _hsOutSprite('add-parlour', B, w * .235, 0, _hsBaySvg(B, night), .012); }
  if (st(2) === 2) { keep.add('add-loft'); _hsOutSprite('add-loft', B, 0, -h * .62, _hsDormerSvg(B, night), .011); }
  if (st(3) === 2 && roof) { const dx = -w * .3, top = roof.at(dx); if (top != null && top < -h * .35) { keep.add('add-guest'); _hsOutSprite('add-guest', B, dx, top, _hsChimneySvg(B, v.hw), .01); } }
  // the scaffold while the builders work: in front of the right of the house, up to its eaves
  if (HOUSE_PLAN.some(p => st(p.s) === 3)) { keep.add('scaffold'); _hsOutSprite('scaffold', B, w * .25, 0, _hsScaffoldSvg(B), .03, { hit: .9, hitUp: 24, label: 'The builders are at work', cursor: 'hand', onClick: () => _hsPlanOpen() }); }
  // your banner on a pole from the roof, and the mailbox by the door
  if (roof) { const dx = -w * .14, top = roof.at(dx); if (top != null) { keep.add('banner'); _hsOutSprite('banner', B, dx, top + 3, _hsBannerOutSvg(v.bn || HOUSE_BANNER0), .013, { hit: .5, hitUp: 30, label: H.visit ? 'Their banner' : 'Your banner', cursor: 'hand', onClick: () => { if (typeof _hsBannerOpen === 'function') _hsBannerOpen(); } }); } }
  if (typeof _hsMailboxSvg === 'function') { keep.add('mailbox'); _hsOutSprite('mailbox', B, -w * .148, 2, _hsMailboxSvg(B), .04, { hit: .5, hitUp: 18, label: H.visit ? 'Their mailbox' : 'Your mailbox', cursor: 'hand', onClick: () => { if (typeof _hsPostOpen === 'function') _hsPostOpen(); } }); }
  _hsOutClear(keep);
  _hso.ms = Math.round((performance.now() - t0) * 10) / 10;
}
/** Scaffold round its own anchor: three poles, two boards, braces, a ladder, a tarpaulin over the eaves, timber and stone at its foot. */
function _hsScaffoldSvg(B) {
  const hw = B.w * .15, eave = -B.h * .25, x0 = -hw, x1 = hw, top = eave - 8, wood = '#9a7448', dk = '#6a4a2a';
  let s = `<ellipse cx="0" cy="2" rx="${hw * 1.2}" ry="3.2" fill="#2a2418" opacity=".24"/>`;
  for (const x of [x0, 0, x1]) s += `<rect x="${x - 1.3}" y="${top}" width="2.6" height="${-top + 1}" fill="${wood}"/><rect x="${x - 1.3}" y="${top}" width=".9" height="${-top}" fill="#c8a070" opacity=".6"/><ellipse cx="${x}" cy="1" rx="2.6" ry="1" fill="#3a2a1a" opacity=".5"/>`;
  for (const y of [eave * .45, eave + 1]) s += `<rect x="${x0 - 4}" y="${y - 2}" width="${x1 - x0 + 8}" height="3.6" rx="1" fill="${dk}"/><rect x="${x0 - 4}" y="${y - 2}" width="${x1 - x0 + 8}" height="1.1" fill="#b8905a" opacity=".7"/><rect x="${x0 - 4}" y="${y + 1.6}" width="${x1 - x0 + 8}" height="1.6" fill="#000" opacity=".18"/>`;
  s += `<path d="M${x0} ${eave * .45}L0 ${eave + 1}M0 ${eave * .45}L${x1} ${eave + 1}" stroke="${wood}" stroke-width="1.3" opacity=".85"/>`;
  const lx = x1 - 5; s += `<path d="M${lx - 3.5} 0L${lx - 2} ${eave * .45}M${lx + 3.5} 0L${lx + 5} ${eave * .45}" stroke="#b8905a" stroke-width="1.4"/>`; for (let y = -5; y > eave * .45; y -= 5.5) s += `<path d="M${lx - 3.4} ${y}H${lx + 3.6}" stroke="#b8905a" stroke-width="1.1"/>`;
  s += `<path d="M${x0 - 6} ${top + 3}Q0 ${top - 5} ${x1 + 6} ${top + 3}L${x1 + 7} ${top + 12}Q0 ${top + 7} ${x0 - 7} ${top + 12}Z" fill="#4e6e7e" opacity=".95"/><path d="M${x0 - 6} ${top + 3}Q0 ${top - 5} ${x1 + 6} ${top + 3}" fill="none" stroke="#7a9aa8" stroke-width="1"/><path d="M${x0 + 3} ${top + 2}V${top + 12}M${x1 - 3} ${top + 2}V${top + 13}" stroke="#2e4a58" stroke-width=".9"/>`;
  const px = x1 + 10; s += `<ellipse cx="${px + 3}" cy="1.6" rx="10" ry="2.4" fill="#2a2418" opacity=".25"/>`;
  for (let i = 0; i < 3; i++) s += `<rect x="${px - 7}" y="${-3.6 - i * 2.8}" width="16" height="2.6" rx="1" fill="${i % 2 ? '#a87c4f' : '#8a6238'}"/><ellipse cx="${px + 9}" cy="${-2.3 - i * 2.8}" rx="1.2" ry="1.3" fill="#d8b480"/>`;
  for (const [dx, dy, r] of [[12, -2.2, 2.8], [16, -2, 2.3], [14, -5.2, 2.2]]) s += `<ellipse cx="${px + dx}" cy="${dy}" rx="${r}" ry="${r * .8}" fill="#a8a296"/><ellipse cx="${px + dx - .7}" cy="${dy - .7}" rx="${r * .5}" ry="${r * .35}" fill="#d0ccc2" opacity=".7"/>`;
  return s;
}
/** The parlour's bay window, built out over the right-hand window of the front: three lights, a little lead roof, a sill with a pot. */
function _hsBaySvg(B, night) {
  const w = Math.max(18, B.w * .13), h = Math.max(14, B.h * .14), y0 = -B.h * .095, top = y0 - h, glass = night ? '#ffd890' : '#3a4a5a', glass2 = night ? '#f4c070' : '#2e3e4e';
  const side = w * .2;
  return `<path d="M${-w / 2 - 1} ${y0 + 1}H${w / 2 + 1}L${w / 2 - 1} ${y0 + 4}H${-w / 2 + 1}Z" fill="#2a2418" opacity=".22"/>`
    + `<rect x="${-w / 2}" y="${top}" width="${w}" height="${h}" fill="#f2ece0"/>`
    + `<rect x="${-w / 2 + side + 1.4}" y="${top + 2}" width="${w - side * 2 - 2.8}" height="${h - 4}" fill="${glass}"/><rect x="${-w / 2 + 1.2}" y="${top + 2.4}" width="${side - 1.2}" height="${h - 4.8}" fill="${glass2}"/><rect x="${w / 2 - side}" y="${top + 2.4}" width="${side - 1.2}" height="${h - 4.8}" fill="${glass2}"/>`
    + `<path d="M0 ${top + 2}V${y0 - 2}M${-w / 2 + side + 1.4} ${top + h * .42}H${w / 2 - side - 1.4}" stroke="#f2ece0" stroke-width="1"/>`
    + (night ? `<rect x="${-w / 2 + side + 1.4}" y="${top + 2}" width="${w - side * 2 - 2.8}" height="${h - 4}" fill="#fff4c8" opacity=".25"/>` : `<path d="M${-w / 2 + side + 3} ${top + 3}l4 ${h * .5}" stroke="#ffffff" stroke-width="1" opacity=".3"/>`)
    + `<path d="M${-w / 2 - 2} ${top + .5}L${-w / 2 + 2} ${top - 4}H${w / 2 - 2}L${w / 2 + 2} ${top + .5}Z" fill="#5a6470"/><path d="M${-w / 2 + 2} ${top - 4}H${w / 2 - 2}" stroke="#8a949e" stroke-width=".8"/>`
    + `<rect x="${-w / 2 - 1.5}" y="${y0 - 1}" width="${w + 3}" height="2.4" fill="#d8d0c0"/><rect x="${w * .18}" y="${y0 - 5}" width="4" height="4" fill="#b86a44"/><circle cx="${w * .18 + 2}" cy="${y0 - 6.4}" r="2.6" fill="#4a8a3a"/><circle cx="${w * .18 + 2.8}" cy="${y0 - 7.6}" r="1.2" fill="#e84a5a"/>`;
}
/** The loft's dormer in the thatch: a little gable over a window, the thatch curving round it. */
function _hsDormerSvg(B, night) {
  const dw = Math.max(16, B.w * .1), dh = dw * .85, glass = night ? '#ffd890' : '#3a4a5a';
  return `<ellipse cx="0" cy="2" rx="${dw * .75}" ry="3" fill="#5a4220" opacity=".35"/>`
    + `<path d="M${-dw * .72} 2Q${-dw * .6} ${-dh * .7} 0 ${-dh * 1.28}Q${dw * .6} ${-dh * .7} ${dw * .72} 2Z" fill="#b8945a"/><path d="M${-dw * .72} 2Q${-dw * .6} ${-dh * .7} 0 ${-dh * 1.28}Q${dw * .6} ${-dh * .7} ${dw * .72} 2" fill="none" stroke="#d8b878" stroke-width="1.4"/>`
    + `<path d="M${-dw * .5} 1Q${-dw * .2} ${-dh * .4} 0 ${-dh * .9}" stroke="#8a6a3a" stroke-width=".8" fill="none" opacity=".6"/>`
    + `<rect x="${-dw * .36}" y="${-dh * .78}" width="${dw * .72}" height="${dh * .7}" rx="1" fill="#efe6d2"/><rect x="${-dw * .28}" y="${-dh * .7}" width="${dw * .56}" height="${dh * .54}" fill="${glass}"/>`
    + `<path d="M0 ${-dh * .7}V${-dh * .16}M${-dw * .28} ${-dh * .43}H${dw * .28}" stroke="#efe6d2" stroke-width="1.1"/>`
    + (night ? `<rect x="${-dw * .28}" y="${-dh * .7}" width="${dw * .56}" height="${dh * .54}" fill="#fff4c8" opacity=".3"/>` : '');
}
/** The guest room's chimney, standing on the roof where it is (its foot is the roof's top edge there), a wisp of smoke when it is lit. */
function _hsChimneySvg(B, hw) {
  const cw = Math.max(7, B.w * .045), ch = Math.max(14, B.h * .13);
  return `<rect x="${-cw / 2}" y="${-ch}" width="${cw}" height="${ch + 6}" fill="#a85a3a"/><rect x="${-cw / 2}" y="${-ch}" width="${cw * .35}" height="${ch + 6}" fill="#c8704a" opacity=".7"/><rect x="${cw / 2 - 1.5}" y="${-ch}" width="1.5" height="${ch + 6}" fill="#6a3424" opacity=".6"/>`
    + `<rect x="${-cw / 2 - 1.4}" y="${-ch - 2.4}" width="${cw + 2.8}" height="3" fill="#8a4a32"/><rect x="${-1.8}" y="${-ch - 6.4}" width="3.6" height="4.2" fill="#6a3a2a"/>`
    + `<path d="M${-cw / 2} 4Q0 1 ${cw / 2} 4V7H${-cw / 2}Z" fill="#b8945a"/>`
    + `<path d="M0 ${-ch - 7}q-3 -5 1 -9q4 -4 0 -9" stroke="#e8e8ec" stroke-width="2.2" fill="none" opacity=".45" stroke-linecap="round"/>`;
}
/** Your banner flying from a short pole on the roof (drawn from the same grid as inside): the pole's foot at the anchor, in the thatch. */
function _hsBannerOutSvg(bn) {
  const cols = HOUSE_BANNER.cols, rows = HOUSE_BANNER.rows, cw = 2.4, ch = 2.2, pole = 30, fy = -pole + 1.5;
  let cells = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const k = parseInt(bn[r * cols + c], 12) || 0, wave = Math.sin(c / (cols - 1) * Math.PI * 1.6) * 1.5 + c * .12; cells += `<rect x="${1.4 + c * cw}" y="${fy + r * ch + wave}" width="${cw + .25}" height="${ch + .25}" fill="${HOUSE_BANNER.colours[k]}"/>`; }
  return `<ellipse cx="0" cy="1" rx="3.5" ry="1.4" fill="#5a4220" opacity=".4"/>`
    + `<rect x="-1" y="${-pole}" width="2" height="${pole + 2}" fill="#5a4028"/><rect x="-1" y="${-pole}" width=".7" height="${pole}" fill="#a8845a" opacity=".7"/><circle cy="${-pole - 1}" r="1.6" fill="#d8b45a"/>`
    + `<g class="hs-flag">${cells}<rect x="${1.4}" y="${fy + rows * ch + 1.6}" width="${cols * cw}" height=".8" fill="#000" opacity=".12"/></g>`;
}
/** The module that keeps the outside in step (registered on first use: the wonder kit loads after the house's files). */
function _hsOutsideModDef() {
  return {
    id: 'house-outside', fun: false, visit: true,
    begin() { _hso.key = ''; this.tick(); },
    painted() { _hso.key = ''; this.tick(); },
    tick() {
      try {
        _hsGrowTick(); if (typeof _hsPostTick === 'function') _hsPostTick();
        const key = gardenHouseOutsideKey() + '|' + (_hsOutBox((gardenHouseMine() || {}).id) ? 1 : 0);
        if (key === _hso.key && !_hso.soon) return;
        _hso.key = key; _hso.soon = false; _hsOutsidePaint();
      } catch (e) { if (!_hso.warned) { _hso.warned = true; console.error('[house outside]', e); } }
    },
    end() { _hsOutClear(new Set()); _hso.key = ''; },
  };
}

/* ---------- the ribbons' facts ---------- */
/** For the garden's ribbons (gardenFacts): what your house has come to. Yours only, numbers only. */
function gardenHouseFacts() {
  const g = _gdG(), hs = g.hs || {}, hr = g.hr || {};
  if (!hs.home) return null;
  let rooms = 0; for (const p of HOUSE_PLAN) if (hr[String(p.s)] && Number(hr[String(p.s)].st) === 2) rooms++;
  let dyed = 0; for (const p of Object.values(g.hf || {})) { const d = p && gardenDecor(p.d); if (d && d.dye && (p.v | 0) > 0) dyed++; }
  return { hsHome: 1, hsRooms: rooms, hsWarm: Number(hs.warms) || 0, hsStars: Number(hs.stars) || 0, hsBanner: typeof hs.bn === 'string' && hs.bn !== HOUSE_BANNER0 ? 1 : 0, hsDyed: dyed };
}

/* ---------- the helpers' handprints ---------- */
/** Each friend who lent the builders a hand is pressed into a tile along the front of the kitchen's hearthstone: their colour and
 *  initial (never a name), a dozen at most. Drawn live over the room's picture (one graphics, redrawn only when the list changes). */
const HOUSE_HAND_COLS = Object.freeze([0xc8402e, 0xe8893a, 0xf0c040, 0x5e9a44, 0x3a8a8a, 0x4a6aa8, 0x7a4a8a, 0xd86a8a, 0x8a5a32, 0x2e4a7a, 0x9ab84a, 0xc87a3a, 0x6a8ab8, 0xa83a5a, 0x4a7a4a, 0x8a8a9a]);
function _hsHandsDraw(R, S, s) {
  const v = S.view, list = ((v && v.hands) || []).filter(h => Array.isArray(h)).slice(-12), sig = JSON.stringify(list);
  if (S.hands && S.hands.sig === sig && S.hands.g.active) return;
  if (S.hands) { try { S.hands.g.destroy(); for (const t of S.hands.t) t.destroy(); } catch (e) { /* gone */ } }
  S.hands = null; if (!list.length) return;
  const scene = s.context.scene, g = scene.add.graphics().setDepth(106), texts = [], H = (S.shell || HOUSE_SHELL).hearth || { x0: 598, x1: 850 };
  s.root.add(g);
  list.forEach(([ini, col], i) => {
    const x = H.x0 + 22 + i * 19, y = 430, c = HOUSE_HAND_COLS[(col | 0) % 16];
    g.fillStyle(0x000000, .18).fillRoundedRect(x - 8, y - 5, 17, 12, 2);
    g.fillStyle(0xb8664a, 1).fillRoundedRect(x - 8.5, y - 6, 17, 12, 2).fillStyle(0xd8865a, .6).fillRect(x - 7.5, y - 5.5, 15, 2);
    g.fillStyle(c, .9).fillEllipse(x - 2, y + 1.5, 6, 5); for (let k = 0; k < 4; k++) g.fillEllipse(x - 4.4 + k * 1.6, y - 2.4, 1.3, 3); g.fillEllipse(x + 1.2, y + .4, 2.6, 1.4);
    const t = scene.add.text(x + 5, y + .5, String(ini || '?').slice(0, 1), { fontFamily: 'Georgia, serif', fontSize: '8px', color: '#3a1a0a', resolution: 3 }).setOrigin(.5, .5).setDepth(106.1); s.root.add(t); texts.push(t);
  });
  S.hands = { sig, g, t: texts };
}
