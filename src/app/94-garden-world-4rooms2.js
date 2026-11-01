/* ============================================================
   HIDDEN ROOMS, part two (the owner: "rooms that we can place stuff and build in too, and find special species or variants, or higher probabilities").
     Furnishing   a row with `furnish: true`: decorations out of your bag, placed anywhere in the room. One saved entry for each slot (rm.<room>.fu.<n>), so two devices add up. Friends read them from the snapshot's `rf`.
     A water      a row with `water`: the real fishing game (94-garden-world-4rooms3water.js). Its fish have needs.room, so they are in no other water. The book says where (gardenRegionWords, gardenCatchNeedsRows).
     Odds         ctx.room is one more condition for a variant: {room: 'cave'} in its `more`, and gardenVariantHow says it in words.
   ============================================================ */
const GRM_FURN = Object.freeze({ slots: 12, x0: 40, x1: 920, y0: 170, y1: 556, px: 96, firstGift: Object.freeze({ ticket: 3 }) });

/* ---------- what can be clicked, all together ---------- */
function _grmAllSpots(R, S) {
  const out = _grmFurnSpots(R);
  return out.concat(GRM_PLAY[R.play].spots(R, S));
}
function _grmExtraAct(id) {
  const k = String(id);
  if (k.startsWith('fu-')) { _grmFurnTake(_grm.R, Number(k.slice(3))); return true; }
  return false;
}
function _grmExtraFrame(ts) {
  if (_grm.R.furnish && gpVisiting() && ts - (_grm.fuAt || 0) > 5000) {   // a friend's room: they may be moving things about
    _grm.fuAt = ts;
    const k = JSON.stringify(_grmFurnList(_grm.R)); if (k !== _grm.fuKey) { _grm.fuKey = k; _grmPaint(); }
  }
}

/* ---------- furnishing ---------- */
function _grmFurnList(R) {
  if (!R.furnish) return [];
  if (gpVisiting()) { const m = gardenHere(), l = m.visit && m.visit.snap && m.visit.snap.rf && m.visit.snap.rf[R.id]; return Array.isArray(l) ? l.map((r, i) => ({ i, d: r[0], x: r[1], y: r[2] })) : []; }
  const out = [];
  for (let i = 0; i < GRM_FURN.slots; i++) { const v = String(_grmG(R, 'fu.' + i, '') || '').split('|'); if (v.length === 3 && gardenDecor(v[0])) out.push({ i, d: v[0], x: Number(v[1]) || 0, y: Number(v[2]) || 0 }); }
  return out;
}
function _grmFurnArt(id) {
  const c = _grm.icons || (_grm.icons = new Map());
  if (!c.has(id)) c.set(id, `<g transform="translate(${-GRM_FURN.px / 2} ${-GRM_FURN.px + 6})">${gardenIconSvg(id, { kind: 'decor', px: GRM_FURN.px })}</g>`);
  return c.get(id);
}
function _grmFurnSpots(R) { return _grmFurnList(R).map(f => ({ id: 'fu-' + f.i, x: f.x, y: f.y, w: 90, h: 100, tip: 'Take this back', art: _grmFurnArt(f.d), still: !_grm.fu })); }
function _grmBagRows() {
  const out = [];
  for (const [k, v] of Object.entries(gardenWallet().items)) { if (!k.startsWith('decor:') || !(v >= 1)) continue; const d = gardenDecor(k.slice(6)); if (d && d.cat !== 'path') out.push({ d, n: Math.floor(v) }); }
  return out;
}
function _grmBagPaint() {
  const el = _grm.root && _grm.root.querySelector('.grm-bag'); if (!el) return;
  el.innerHTML = ''; el.classList.toggle('is-on', !!_grm.fu);
  if (!_grm.fu) return;
  const rows = _grmBagRows();
  if (!rows.length) { el.appendChild(gpEl('p', 'grm-q', 'Your bag has no decorations in it. The garden shop has plenty.')); return; }
  for (const r of rows) {
    const b = gpEl('button', 'grm-bag-b' + (_grm.carry === r.d.id ? ' is-on' : '')); b.type = 'button'; b.title = r.d.name; b.setAttribute('aria-label', r.d.name);
    b.innerHTML = `${gardenIconSvg(r.d.id, { kind: 'decor', px: 44 })}<i>${r.n}</i>`;
    b.onclick = () => { _grm.carry = r.d.id; _grmSay(`Click where the ${r.d.name.toLowerCase()} should go.`); _grmBagPaint(); };
    el.appendChild(b);
  }
}
function gardenRoomFurnish() {
  _grm.fu = !_grm.fu; _grm.carry = '';
  _grmBagPaint(); _grmPaint();
  if (_grm.fu) _grmSay('Pick something from your bag, then click where it goes. Click anything you have placed to take it back.', 8000);
}
/** You are carrying something and clicked the room: it goes down here. */
function _grmCarryClick(ev) {
  if (!_grm.carry) return false;
  const R = _grm.R, id = _grm.carry; _grm.carry = '';
  const p = _grmPt(ev), used = new Set(_grmFurnList(R).map(f => f.i));
  let slot = -1; for (let i = 0; i < GRM_FURN.slots; i++) if (!used.has(i)) { slot = i; break; }
  if (slot < 0) { _grmSay(`That is ${GRM_FURN.slots} things in here already. Take one back first.`); _grmBagPaint(); return true; }
  if (gardenHas('decor:' + id) < 1) { _grmBagPaint(); return true; }
  const x = Math.round(Math.max(GRM_FURN.x0, Math.min(GRM_FURN.x1, p.x))), y = Math.round(Math.max(GRM_FURN.y0, Math.min(GRM_FURN.y1, p.y)));
  _gdLed('pl', { i: { ['decor:' + id]: -1 }, n: 1, w: 'room' });
  _grmP(R, 'fu.' + slot, `${id}|${x}|${y}`);
  if (_grmOnce(R, 'fu', GRM_FURN.firstGift)) _grmSay('It looks better already. You find 3 tickets behind where it went.');
  _gdSave(); _grmFurnChanged();
  return true;
}
function _grmFurnTake(R, slot) {
  const f = _grmFurnList(R).find(q => q.i === slot); if (!f || gpVisiting()) return;
  _gdLed('pl', { i: { ['decor:' + f.d]: 1 }, n: 1, w: 'room' });
  _grmP(R, 'fu.' + slot, '');
  _gdSave(); _grmFurnChanged();
}
function _grmFurnChanged() {
  _grmBagPaint(); _grmPaint();
  try { _gdEmit('landshow', {}); } catch (e) { /* friends see it at the next snapshot */ }
}
/** For the snapshot: {room: [[decor, x, y], ...]}, or null. Ids and numbers (gardenSnapshotClean checks them). */
function gardenRoomsWire() {
  const out = {};
  for (const R of GRM_ROOMS) { if (!R.furnish) continue; const l = []; for (let i = 0; i < GRM_FURN.slots; i++) { const v = String(_grmG(R, 'fu.' + i, '') || '').split('|'); if (v.length === 3 && gardenDecor(v[0])) l.push([v[0], Number(v[1]) || 0, Number(v[2]) || 0]); } if (l.length) out[R.id] = l; }
  return Object.keys(out).length ? out : null;
}

/* ---------- the bugs of a room: the same three all day, for you ---------- */
function _grmNetToday(R) {
  const m = gardenModel(), today = _gdToday(), ctx = Object.assign({}, gardenVariantCtx(m, { hab: 'flower' }), { room: R.bugRoom, season: 'summer', rain: false, level: m.level.level, caught: (id) => !!_gdG().bl[id] });
  let list = R.kinds.map(gardenBugDef).filter(b => b && gardenBugFits(b, ctx)); const caught = new Set((_gdG().fd[today] && _gdG().fd[today].k) || []), out = [];
  if (!list.length) return out;
  R.perch.forEach((P, i) => {
    const key = `rm${R.id}${today.replace(/-/g, '')}.${i}`, rnd = gardenRand('rm|' + key), w = list.map(b => gardenBugWeight(b, ctx));
    let r = rnd() * w.reduce((a, b) => a + b, 0), k = 0; for (; k < list.length - 1; k++) { r -= w[k]; if (r <= 0) break; }
    out.push({ i, key, id: list[k].id, x: P.x, y: P.y, v: gardenVariantRoll('bug', ctx, rnd), gone: caught.has(key) || !!(_gw.goneKeys && _gw.goneKeys.has(key)) });
    if (list.length > 1) list = list.filter((b, j) => j !== k);   // a different kind on each perch, while there are kinds to go round
  });
  return out;
}
