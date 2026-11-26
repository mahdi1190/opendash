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
   added to the cottage, the mailbox by the door (94-garden-house-5post.js) and your banner on its bracket. Placed by the building's own
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
      card.appendChild(gpEl('p', 'muted hs-plan-need', `Still needed: ${_hsCostWords(need)}. You have ${P.c >= 1e9 ? 'all the' : P.c} coins, ${P.t} timber and ${P.st} stone.`));
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
      b.onclick = () => { const r = houseDo({ o: 'guest', s: slot, n: name, f: f.id }, 'Named the guest room for ' + name); if (!r.ok) { gardenToast(r.msg + '.'); return; } try { closeDialog(); } catch (e) { /* closed */ } gardenToast(`The guest room is ${name}’s now. Their name is on the door.`, { icon: 'house', kind: 'ok' }); _hsSnapSoon(); if (again) setTimeout(again, 60); };
      ul.appendChild(b);
    }
    const none = gpEl('button', 'btn btn-ghost btn-sm', 'For nobody just now'); none.type = 'button';
    none.onclick = () => { houseDo({ o: 'guest', s: slot, n: '' }, 'Took the name off the guest room'); try { closeDialog(); } catch (e) { /* closed */ } if (again) setTimeout(again, 60); };
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
    const r = houseDo({ o: 'ready', s: row.s, seed: Math.floor(Math.random() * 9999) }, '', { noUndo: true });
    if (r.ok) _hsBuiltNow(row.s, '');
  }
}
/** A room is finished (the builders' night, or a friend's hand): say so, and the cottage outside grows to match. */
function _hsBuiltNow(slot, by) {
  const row = HOUSE_PLAN_OF.get(slot); if (!row) return;
  const g = _gdG(), made = g.hs && g.hs.made && g.hs.made.s === row.from && g.hs.made.d === _gdToday() ? g.hs.made : null;
  const who = by && typeof _glhByName === 'function' ? _glhByName(by) : '';
  const line = `${row.name} is finished${who ? `: ${who} lent the builders a hand` : ''}! ${row.via === 'ladder' ? 'There is a ladder up to it from the parlour.' : row.via === 'door' ? 'Its door is in the loft.' : 'Its doorway is at the end of the kitchen.'}` + (made && made.n + made.a ? ` The builders moved ${made.n + made.a === 1 ? 'one thing' : 'a few things'} out of the way${made.a ? ' (what had nowhere to go is in your chest)' : ''}.` : '');
  try { gardenToast(line, { icon: 'house', kind: 'ok' }); } catch (e) { /* only words */ }
  if (_hsInside()) { _grmSay(line, 10000); try { GardenNativeRooms.burst(); } catch (e) { /* fine */ } }
  try { if (typeof _fxSound === 'function') _fxSound('fanfare'); } catch (e) { /* no sound */ }
  if (typeof _hsWarmSoon === 'function') _hsWarmSoon(slot);
  _hsOutsideSoon();
}

/* ---------- outside: the cottage as it grows ---------- */
const _hso = { sprites: new Map(), key: '', at: 0, soon: false };
function _hsOutsideSoon() { _hso.soon = true; _hso.key = ''; }
/** The house's drawn picture in the world: { cx, foot, x0, x1, top, w, h } in world px, or null (not drawn yet, or not a painted building). */
function _hsOutBox(id) {
  try {
    const W = _gw.nativeWorld, rec = W && W.entities && W.entities.get('prop:' + id); if (!rec || !rec.bounds) return null;
    const b = rec.bounds, f = rec.metadata && rec.metadata.foot; if (!f || !Number.isFinite(f.x) || !Number.isFinite(f.y) || !(b.width > 20)) return null;
    return { cx: f.x, foot: f.y, x0: b.x, x1: b.x + b.width, top: b.y, w: b.width, h: f.y - b.y };
  } catch (e) { return null; }
}
/** What the outside shows: the rooms' states, the banner, the mailbox flag (one string: drawn again only when it changes). */
function gardenHouseOutsideKey() {
  const v = _hsView(); if (!v) return '';
  const r = HOUSE_PLAN.map(p => Number((v.rooms[String(p.s)] || {}).st) || 0).join(''), flag = typeof _hsPostUnread === 'function' && !gpVisiting() ? _hsPostUnread() : 0;
  return v.home + '|' + r + '|' + (v.bn || HOUSE_BANNER0) + '|' + (flag ? 1 : 0);
}
/** One part as a world sprite: anchored (ax, ay) world px from the house's foot point, drawn round that anchor (svg in world px), and
 *  sorted with the house (z just in front of its foot). lift: how high the anchor stands above the ground (for what hangs on the walls). */
function _hsOutSprite(key, B, ax, ay, svg, dz, o) {
  const W = GARDEN_WORLD, x = (B.cx + ax) / W.cellW, y = (B.foot - W.sky) / W.cellH, lift = -ay;
  let S = _hso.sprites.get(key);
  if (S && S.node && !S.node.isConnected) { try { S.remove(); } catch (e) { /* gone */ } _hso.sprites.delete(key); S = null; }
  if (!S) { S = wdSprite(Object.assign({ id: 'hs-out-' + key, x, y, z: y + (dz || .02), lift, still: true, svg }, o || {})); _hso.sprites.set(key, S); }
  else { if (S.x !== x || S.y !== y || S.lift !== lift) { S.x = x; S.y = y; S.z = y + (dz || .02); S.lift = lift; S.tf = null; } wdArt(S, svg); }
  return S;
}
function _hsOutClear(keep) { for (const [k, S] of _hso.sprites) if (!keep.has(k)) { try { S.remove(); } catch (e) { /* gone */ } _hso.sprites.delete(k); } }
/** Draw what the house shows outside, from its rooms (yours, or your friend's snapshot). */
function _hsOutsidePaint() {
  const H = gardenHouseMine(), keep = new Set();
  if (!H || !H.moved) { _hsOutClear(keep); return; }
  const B = _hsOutBox(H.id); if (!B) { _hsOutClear(keep); _hso.key = ''; return; }
  const v = _hsView(); if (!v) { _hsOutClear(keep); return; }
  const st = s => Number((v.rooms[String(s)] || {}).st) || 0;
  // the scaffold while the builders work: poles, boards and a ladder on the right of the front, timber and stone at its foot
  if (HOUSE_PLAN.some(p => st(p.s) === 3)) { keep.add('scaffold'); _hsOutSprite('scaffold', B, B.w * .28, 0, _hsScaffoldSvg(B, -B.w * .28), .03, { hit: .9, hitUp: 30, label: 'The builders are at work', cursor: 'hand', onClick: () => _hsPlanOpen() }); }
  // what each room added: the parlour window boxes, the loft a little dormer in the roof, the guest room a chimney of its own
  for (const p of HOUSE_PLAN) if (st(p.s) === 2) { const svg = _hsAddSvg(p.id, B); if (svg) { keep.add('add-' + p.id); _hsOutSprite('add-' + p.id, B, 0, 0, svg, .015); } }
  // your banner on its bracket at the corner, and the mailbox by the door
  const fx = -B.w * .45 - 22, fy = -B.h * .3 - 20;
  keep.add('banner'); _hsOutSprite('banner', B, fx, fy, _hsBannerOutSvg(B, v.bn || HOUSE_BANNER0, -fx, -fy), .025, { hit: .45, hitUp: 0, label: H.visit ? 'Their banner' : 'Your banner', cursor: 'hand', onClick: () => { if (typeof _hsBannerOpen === 'function') _hsBannerOpen(); } });
  if (typeof _hsMailboxSvg === 'function') { const mx = -B.w * .2; keep.add('mailbox'); _hsOutSprite('mailbox', B, mx, 6, _hsMailboxSvg(B), .04, { hit: .55, hitUp: 24, label: H.visit ? 'Their mailbox' : 'Your mailbox', cursor: 'hand', onClick: () => { if (typeof _hsPostOpen === 'function') _hsPostOpen(); } }); }
  _hsOutClear(keep);
}
/** Scaffold: two bays of poles and boards across the right of the front, a ladder, a tarpaulin, the materials stacked at its foot. */
function _hsScaffoldSvg(B, ox) {
  const x0 = ox + B.w * .1, x1 = ox + B.w * .46, top = -B.h * .66, mid = -B.h * .34, wood = '#9a7448', dk = '#6a4a2a';
  let s = `<ellipse cx="${(x0 + x1) / 2}" cy="2" rx="${(x1 - x0) * .6}" ry="3.4" fill="#2a2418" opacity=".22"/>`;
  for (const x of [x0, (x0 + x1) / 2, x1]) s += `<rect x="${x - 1.4}" y="${top}" width="2.8" height="${-top + 1}" fill="${wood}"/><rect x="${x - 1.4}" y="${top}" width="1" height="${-top}" fill="#c8a070" opacity=".6"/>`;
  for (const y of [mid, top + 6]) s += `<rect x="${x0 - 4}" y="${y - 2}" width="${x1 - x0 + 8}" height="4" rx="1" fill="${dk}"/><rect x="${x0 - 4}" y="${y - 2}" width="${x1 - x0 + 8}" height="1.2" fill="#b8905a" opacity=".7"/>`;
  s += `<path d="M${x0} ${mid}L${(x0 + x1) / 2} ${top + 6}M${(x0 + x1) / 2} ${mid}L${x1} ${top + 6}" stroke="${wood}" stroke-width="1.6" opacity=".85"/>`;
  // a ladder up the front to the lower boards
  const lx = x1 - 10; s += `<path d="M${lx - 4} 0L${lx - 2} ${mid}M${lx + 4} 0L${lx + 6} ${mid}" stroke="#b8905a" stroke-width="1.6"/>`; for (let y = -6; y > mid; y -= 7) s += `<path d="M${lx - 4 + (y / mid) * 2} ${y}H${lx + 4 + (y / mid) * 2}" stroke="#b8905a" stroke-width="1.2"/>`;
  // a tarpaulin over the top boards, tied down
  s += `<path d="M${x0 - 6} ${top + 4}Q${(x0 + x1) / 2} ${top - 8} ${x1 + 6} ${top + 4}L${x1 + 8} ${top + 18}Q${(x0 + x1) / 2} ${top + 12} ${x0 - 8} ${top + 18}Z" fill="#5a7a8a" opacity=".92"/><path d="M${x0 + 4} ${top + 2}V${top + 14}M${x1 - 4} ${top + 2}V${top + 16}" stroke="#3a5a6a" stroke-width="1"/>`;
  // timber and stone at the foot
  const px = x0 - 22; s += `<ellipse cx="${px + 6}" cy="1.5" rx="13" ry="2.6" fill="#2a2418" opacity=".25"/>`;
  for (let i = 0; i < 3; i++) s += `<rect x="${px - 6}" y="${-4 - i * 3.2}" width="22" height="3" rx="1" fill="${i % 2 ? '#a87c4f' : '#8a6238'}"/><ellipse cx="${px + 16}" cy="${-2.5 - i * 3.2}" rx="1.4" ry="1.5" fill="#d8b480"/>`;
  for (const [dx, dy, r] of [[18, -2.4, 3.4], [23, -2.2, 2.8], [20.5, -6, 2.6]]) s += `<ellipse cx="${px + dx}" cy="${dy}" rx="${r}" ry="${r * .8}" fill="#a8a296"/><ellipse cx="${px + dx - .8}" cy="${dy - .8}" rx="${r * .5}" ry="${r * .35}" fill="#d0ccc2" opacity=".7"/>`;
  return s;
}
/** What a finished room adds to the cottage's own picture, in proportion to it (fractions of its drawn box). */
function _hsAddSvg(id, B) {
  const w = B.w, h = B.h, eave = -h * .3;
  if (id === 'parlour') {   // window boxes of flowers along the front, one under each window
    let s = '';
    for (const fx of [-.27, .27]) { const x = w * fx, y = -h * .07; s += `<ellipse cx="${x}" cy="${y + 3}" rx="13" ry="2" fill="#2a2418" opacity=".2"/><rect x="${x - 12}" y="${y - 4}" width="24" height="6" rx="1" fill="#7a5232"/><rect x="${x - 12}" y="${y - 4}" width="24" height="1.6" fill="#a87c4f"/>`; for (let i = 0; i < 7; i++) { const fx2 = x - 10 + i * 3.4, c = ['#e84a5a', '#f4c040', '#c870d8', '#ffffff'][i % 4]; s += `<circle cx="${fx2}" cy="${y - 6 - (i % 2) * 2}" r="2.6" fill="#4a8a3a"/><circle cx="${fx2 + .6}" cy="${y - 8 - (i % 3)}" r="1.5" fill="${c}"/>`; } }
    return s;
  }
  if (id === 'loft') {   // a little gabled dormer in the roof, over the door, its window lit
    const x = 0, y = eave - h * .2, dw = Math.max(16, w * .12), dh = dw * .9;
    return `<path d="M${x - dw / 2 - 3} ${y - dh * .55}L${x} ${y - dh * 1.15}L${x + dw / 2 + 3} ${y - dh * .55}Z" fill="#8a6a3a"/><path d="M${x - dw / 2 - 3} ${y - dh * .55}L${x} ${y - dh * 1.15}L${x + dw / 2 + 3} ${y - dh * .55}" fill="none" stroke="#c8a464" stroke-width="1.6"/>`
      + `<rect x="${x - dw / 2}" y="${y - dh * .58}" width="${dw}" height="${dh * .62}" fill="#efe6d2"/><rect x="${x - dw / 2 + 2.5}" y="${y - dh * .5}" width="${dw - 5}" height="${dh * .46}" fill="#3a4a5a"/><path d="M${x} ${y - dh * .5}V${y - dh * .04}M${x - dw / 2 + 2.5} ${y - dh * .28}H${x + dw / 2 - 2.5}" stroke="#efe6d2" stroke-width="1.2"/>`
      + `<path d="M${x - dw / 2 - 2} ${y + 1}Q${x} ${y + 5} ${x + dw / 2 + 2} ${y + 1}" fill="#b8945a"/>`;
  }
  if (id === 'guest') {   // a second chimney at the other end of the ridge
    const x = -w * .3, y = -h * .86, cw = Math.max(8, w * .06);
    return `<rect x="${x - cw / 2}" y="${y}" width="${cw}" height="${h * .2}" fill="#a85a3a"/><rect x="${x - cw / 2}" y="${y}" width="${cw * .35}" height="${h * .2}" fill="#c8704a" opacity=".7"/><rect x="${x - cw / 2 - 1.5}" y="${y - 2}" width="${cw + 3}" height="3" fill="#8a4a32"/><rect x="${x - 2}" y="${y - 6}" width="4" height="4" fill="#7a4a3a"/>`;
  }
  return '';
}
/** Your banner flying from a bracket on the house's corner (drawn from the same grid as inside). Round its own anchor: the flag hangs
 *  from the bracket's end there, and the bracket runs back (bx, by) to the corner post. */
function _hsBannerOutSvg(B, bn, bx, by) {
  const cols = HOUSE_BANNER.cols, rows = HOUSE_BANNER.rows, cw = 2.6, ch = 2.6;
  let cells = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const k = parseInt(bn[r * cols + c], 12) || 0, sag = Math.sin(c / (cols - 1) * Math.PI) * 1.4; cells += `<rect x="${-c * cw - cw}" y="${r * ch + sag + 1}" width="${cw + .25}" height="${ch + .25}" fill="${HOUSE_BANNER.colours[k]}"/>`; }
  return `<path d="M${bx} ${by}L0 0" stroke="#4a3a2a" stroke-width="1.6" stroke-linecap="round"/><rect x="${bx - 2}" y="${by - 2}" width="4" height="5" rx="1" fill="#3a2a1a"/><circle r="1.4" fill="#d8b45a"/>`
    + `<g class="hs-flag">${cells}<path d="M0 1V${rows * ch + 2}" stroke="#2a2418" stroke-width=".5" opacity=".4"/></g>`;
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
