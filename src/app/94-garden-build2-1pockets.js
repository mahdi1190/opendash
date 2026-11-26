/* ============================================================
   BUILD 2: YOUR POCKETS AND YOUR STORAGE AT HOME (the state and what you do with it). The rules are in 94-garden-build2-0rules.js, the
   tool ring in 94-garden-zz-8build2-ring.js, the pockets and storage panels in 94-garden-zz-8build2-store.js.

   Where things go (Animal Crossing's way, in our words):
     - What you pick, catch, find, buy or are given while the garden is open goes into your POCKETS: onto its own stack first, then into a
       free pocket. A big delivery (two hundred bags of compost) puts one stack in your pockets and the rest at home. When your pockets are
       full, Perpetua (the vale's snail post) takes it home for you, and one line says so. Nothing is ever thrown away.
     - What arrives while the garden is closed (real work's rewards, the post) waits at HOME, like the mail.
     - What you use (plant, place, feed, sell, give) comes out of your pockets first: the pocket in your hand first, then the last ones.
     - Home is everything else you own. Your storage chest at home (any thing of the kind `chest`) shows both: tap to move a stack.
     - Pockets are yours wherever you are, a friend's garden too. They are never in the snapshot; they sync between your own devices
       slot by slot (g.pk in _GD_MAPS and lib/sync/model.mjs).

     gardenB2On()                 the garden exists (pockets are in use)
     gardenB2View()               { size, slots, home, avail, used, free } (memoised; the first time it fills your pockets)
     gardenB2SendHome(s)          a pocket's stack goes home           gardenB2Take(item, n)   a stack comes out of storage
     gardenB2PutAway(tab)         a tab's things in your pockets go home   gardenB2Swap(a, b)  two pockets change places (a stack joins its own)
     gardenB2Name(item) / gardenB2Svg(item, px)   a thing's name and its own picture
     gardenB2SlotAct(row)         add (or replace, same id) a thing you can do with what is in a pocket; gardenB2SlotActs(slot, ctx) lists them
     gardenB2SeedList()           the seeds in your pockets, for the page's seed tool and the bed's bubble (94-garden-4page.js _gdpSeedList)
   ============================================================ */
const _gb2 = { live: false, base: null, obj: null, wallet: null, rev: 0, view: null, t: 0, said: new Map(), panel: 'pockets', sel: -1, tab: 'seeds', page: 0, at: null, tool: 'hands', tagT: 0, flying: 0, ringKey: '', popKey: '' };

function gardenB2On() { try { return !!_gdG().since; } catch (e) { return false; } }
function _gb2Kept() { try { return typeof gardenB2Kept === 'function' ? gardenB2Kept() : null; } catch (e) { return null; } }   // (what is on show elsewhere, a later step's museum)
function _gb2RecOk(e) { try { const g = _gdG(), rec = (e.m === 'plants' ? g.plants : g.decor)[e.u]; return !!rec && rec._packed === 3; } catch (err) { return false; } }
function _gb2Save() {
  // which thing is in which pocket changes nothing that is drawn in the world or counted in the purse: saved without working the garden out again
  try { if (typeof state !== 'undefined' && state) state._localDirty = true; if (typeof saveUI === 'function') saveUI(); if (typeof schedulePersist === 'function') schedulePersist(); } catch (e) { /* the next save carries it */ }
}
function gardenB2View() {
  const g = _gdG();
  if (!g.seen['b2.pk'] && g.since) _gb2FirstRun(g);
  const w = gardenWallet(), V = _gb2.view;
  if (V && V.w === w && V.g === g && V.rev === _gb2.rev) return V;
  const size = gardenB2Size(w.items), avail = gardenB2Avail(w.items, _gb2Kept()), slots = gardenB2Slots(g.pk, avail, size, _gb2RecOk), home = gardenB2Home(avail, slots);
  let used = 0; for (const s of slots) if (s) used++;
  _gb2.view = { w, g, rev: _gb2.rev, size, avail, slots, home, used, free: size - used };
  return _gb2.view;
}
/** Write the slots back: only the pockets that changed (two devices merge pocket by pocket). Past the size: left as they are. */
function _gb2Write(slots) {
  const pk = _gdG().pk; let changed = false;
  for (let s = 0; s < slots.length && s < GB2_SIZE.max; s++) {
    const e = slots[s], cur = pk[s];
    if (!e) { if (cur) { delete pk[s]; changed = true; } continue; }
    const want = e.u ? { u: e.u, m: e.m } : { i: e.i, n: e.n };
    if (!cur || cur.i !== want.i || cur.n !== want.n || cur.u !== want.u || cur.m !== want.m) { pk[s] = want; changed = true; }
  }
  if (changed) { _gb2.rev++; _gb2Save(); _gb2Paint(); }
  return changed;
}
function _gb2AsPk(slots) { const o = {}; slots.forEach((e, s) => { if (e) o[s] = e; }); return o; }
/** Something on the page that shows pockets: the ring and an open panel, brought up to date (cheap: each compares what it would show). */
function _gb2Paint() {
  if (_gb2.painting) return;   // (a write while the ring itself is being drawn: it is drawn with it)
  _gb2.painting = true;
  try { if (typeof _gh !== 'undefined' && typeof _ghBox === 'function') { const box = _ghBox(); if (box) { _gh.bar = ''; _ghBar(box, gardenHere()); if (_gh.bag) _ghBag(); } } } catch (e) { /* no stage */ } finally { _gb2.painting = false; }
}

/* ---------- the first time ---------- */
function _gb2FirstRun(g) {
  if (g.seen['b2.pk']) return;
  g.seen['b2.pk'] = _gdToday();
  // the chest: one gift, once (a ledger line of its own, so a second device never gives it again)
  if (!g.led['b2.chest']) { g.led['b2.chest'] = { d: _gdToday(), k: 'b2', i: { 'decor:storage-chest': 1 }, n: 0 }; _gd.rev++; _gd.walletKey = ''; }
  const w = gardenWallet(), size = gardenB2Size(w.items), avail = gardenB2Avail(w.items, _gb2Kept());
  const keep = gardenB2Slots(g.pk, avail, size, _gb2RecOk);   // (a device that already filled them: those stay)
  const slots = keep.some(Boolean) ? keep : gardenB2FirstFill(avail, size);
  _gb2Write(slots);
  _gb2.base = null;
  try { if (typeof _gdSave === 'function') _gdSave(); } catch (e) { /* saved with the next change */ }
  setTimeout(() => { try { gardenMessage('Your things are in your pockets now (B), and the rest is safe at home. Your storage chest is in your pockets: put it down near your home, and open it to take things out or put them away.', { icon: 'package', ms: 12000 }); } catch (e) { /* said next time */ } }, 1200);
}

/* ---------- what comes in, what goes out ---------- */
/** The pocket in your hand: the seed, decoration or compost the page's tool holds. */
function _gb2HandItem() {
  try { const t = _gdpTool(); if (t === 'seed' && _gdp.seed) return 'seed:' + _gdp.seed; if (t === 'decorate' && _gdp.decor) return 'decor:' + _gdp.decor; if (t === 'feed') return 'fertiliser'; } catch (e) { /* no page */ }
  return '';
}
function _gb2HandSlot(slots) { const it = _gb2HandItem(); if (!it) return null; const i = slots.findIndex(e => e && e.i === it); return i < 0 ? null : i; }
/** Whatever is in your hand has to be in your pockets: the last one used, or sent home, puts your hands away. */
function _gb2HandCheck() {
  const it = _gb2HandItem(); if (!it) return;
  const v = gardenB2View(); if (v.slots.some(e => e && e.i === it)) return;
  try { _gdp.seed = ''; _gdp.decor = ''; _gdpPickTool('hand'); } catch (e) { /* no page */ }
  if (v.home[it] > 0) _gb2Say('hand:' + it, `That was the last ${gardenB2Name(it).toLowerCase()} in your pockets. There are more at home: take some from your chest.`, 'package');
}
/** Looked at after every change in the garden and once a second while it is open (cheap when nothing changed: the purse is the same object). */
function _gb2Watch() {
  if (!_gb2.live || !gardenB2On()) return;
  const g = _gdG();
  if (_gb2.obj !== g) { _gb2.obj = g; _gb2.base = null; }   // a newer copy from another tab or device: what it put in your pockets came with it
  if (!g.seen['b2.pk']) gardenB2View();
  const w = gardenWallet();
  if (_gb2.base && w === _gb2.wallet) return;
  _gb2.wallet = w;
  const avail = gardenB2Avail(w.items, _gb2Kept());
  if (!_gb2.base) { _gb2.base = avail; return; }
  const before = _gb2.base; _gb2.base = avail;
  const { up, down } = gardenB2Diff(before, avail);
  if (!up.length && !down.length) return;
  const size = gardenB2Size(w.items);
  let slots = gardenB2Slots(g.pk, before, size, _gb2RecOk), home = [];
  if (down.length) slots = gardenB2Spend(slots, down, _gb2.useSlot != null ? _gb2.useSlot : _gb2HandSlot(slots));   // (a pocket's own button: that pocket first)
  if (up.length) { const a = gardenB2Arrive(slots, up); slots = a.slots; home = a.home; }
  slots = gardenB2Slots(_gb2AsPk(slots), avail, size, _gb2RecOk);
  _gb2Write(slots);
  if (up.length) _gb2Arrived(up, home);
  _gb2HandCheck();
}
/** One line at most, and the same words not again for a while (gap ms: 20 s unless said). */
function _gb2Say(key, text, icon, ms, gap) {
  const now = performance.now(), at = _gb2.said.get(key) || -1e9;
  if (now - at < (gap || 20000)) return;
  _gb2.said.set(key, now); if (_gb2.said.size > 40) _gb2.said.delete(_gb2.said.keys().next().value);
  try { gardenMessage(text, { icon: icon || 'package', ms: ms || 6000 }); } catch (e) { /* quiet */ }
}
function _gb2Arrived(up, home) {
  const went = new Map(home.map(h => [h[0], h])), full = home.filter(h => h[2] === 'full'), more = home.filter(h => h[2] === 'more' && h[1] >= 5);
  let flown = 0;
  for (const [it, n] of up) { const h = went.get(it); if (h && h[1] >= n) continue; if (flown < 2) { _gb2Fly(it); flown++; } }
  if (full.length) {
    const name = 'the ' + gardenB2Name(full[0][0]).toLowerCase(), rest = full.length - 1;
    let line = `Your pockets are full, so Perpetua took ${name}${rest ? ` and ${rest} more thing${rest === 1 ? '' : 's'}` : ''} home.`;
    const g = _gdG();
    if (!g.seen['b2.full']) { g.seen['b2.full'] = _gdToday(); _gb2Save(); if (gardenHas('tool:satchel') < 1) line += ' A satchel from the shop holds 30.'; }
    _gb2Say('full:' + full[0][0], line, 'package', 7000, 4000);   // (each thing that goes home is said: a second catch a moment later names itself)
    _gb2Bump(true);
  } else if (more.length) {
    const [it, n] = more[0];
    _gb2Say('more:' + it, `Perpetua took the other ${n} ${gardenB2Name(it).toLowerCase()} home for you.`, 'package');
  }
}
/** What came in flies from you into the pockets button (a moment, on screen; nothing when motion is reduced). */
function _gb2Fly(item) {
  try {
    if (!gardenMotionOn() || _gb2.flying >= 3 || typeof _gw === 'undefined' || !_gw.on) { _gb2Bump(); return; }
    const box = _ghBox(), btn = box && box.querySelector('.gb2-bagbtn'); if (!btn || !btn.isConnected) return;
    const p = _ghProject(_gw.px, _gw.py - 1.25); if (!p) return;
    const br = box.getBoundingClientRect(), bb = btn.getBoundingClientRect(), x1 = bb.left - br.left + bb.width / 2, y1 = bb.top - br.top + bb.height / 2;
    const el = document.createElement('div'); el.className = 'gb2-fly'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = gardenB2Svg(item, 34);
    box.appendChild(el); _gb2.flying++;
    const a = el.animate([
      { transform: `translate(${p.x - 18}px, ${p.y - 18}px) scale(.5)`, opacity: 0 },
      { offset: .22, transform: `translate(${p.x - 18}px, ${p.y - 44}px) scale(1.12)`, opacity: 1 },
      { offset: .4, transform: `translate(${p.x - 18}px, ${p.y - 40}px) scale(1)`, opacity: 1 },
      { transform: `translate(${x1 - 18}px, ${y1 - 18}px) scale(.42)`, opacity: .35 },
    ], { duration: 820, easing: 'cubic-bezier(.4,0,.6,1)' });
    a.onfinish = a.oncancel = () => { el.remove(); _gb2.flying = Math.max(0, _gb2.flying - 1); _gb2Bump(); };
  } catch (e) { _gb2.flying = 0; }
}
function _gb2Bump(full) {
  try { const box = _ghBox(), b = box && box.querySelector('.gb2-bagbtn'); if (!b) return; const cls = full ? 'is-full-shake' : 'is-bump'; b.classList.remove(cls); void b.offsetWidth; b.classList.add(cls); setTimeout(() => b.classList.remove(cls), 700); } catch (e) { /* fine */ }
}

/* ---------- moving things between your pockets and home ---------- */
function gardenB2SendHome(s) {
  const v = gardenB2View(), e = v.slots[s]; if (!e || !e.i) return _gdNo('That pocket is empty');
  const slots = v.slots.slice(); slots[s] = null; _gb2Write(slots); _gb2HandCheck();
  return { ok: true, msg: `${gardenB2Name(e.i)} ${e.n > 1 ? 'are' : 'is'} safe at home.`, item: e.i };
}
function gardenB2Take(item, n) {
  const v = gardenB2View(), have = v.home[item] || 0, row = gardenB2Class(item);
  if (!have || !row) return _gdNo('There is none of that at home');
  const want = Math.min(have, n == null ? row.stack : Math.max(1, Math.floor(n))), fit = gardenB2Fit(v.slots, item, want);
  if (!fit) return _gdNo('Your pockets are full. Put something away first.');
  const a = gardenB2Arrive(v.slots, [[item, fit]], { fresh: 3 }); _gb2Write(a.slots);
  return { ok: true, n: fit, item, msg: fit < want ? `Your pockets had room for ${fit}.` : '' };
}
function gardenB2PutAway(tab) {
  const v = gardenB2View(), slots = v.slots.slice(); let n = 0;
  slots.forEach((e, s) => { const r = e && e.i && gardenB2Class(e.i); if (r && (!tab || r.tab === tab)) { slots[s] = null; n++; } });
  if (!n) return _gdNo('Nothing of that kind is in your pockets');
  _gb2Write(slots); _gb2HandCheck();
  return { ok: true, n };
}
function gardenB2Swap(a, b) {
  const v = gardenB2View(); if (a === b || a < 0 || b < 0 || a >= v.size || b >= v.size) return false;
  const slots = v.slots.slice(), A = slots[a], B = slots[b];
  if (A && B && A.i && A.i === B.i) { const row = gardenB2Class(A.i), t = Math.min(A.n, row.stack - B.n); if (t <= 0) return false; slots[b] = { i: B.i, n: B.n + t }; slots[a] = A.n - t > 0 ? { i: A.i, n: A.n - t } : null; }   // the same thing: one stack takes as much as it can
  else { slots[a] = B; slots[b] = A; }
  return _gb2Write(slots);
}

/* ---------- names and pictures ---------- */
function _gb2Split(item) { const k = String(item || ''), i = k.indexOf(':'); return [k, i < 0 ? k : k.slice(0, i), i < 0 ? '' : k.slice(i + 1)]; }
function gardenB2Name(item) {
  const [k, kind, id] = _gb2Split(item);
  try {
    if (kind === 'seed') { const p = gardenPlant(id); return p ? p.name + ' seeds' : 'Seeds'; }
    if (kind === 'crop') { const p = gardenPlant(id); if (!p) return 'Something picked'; const n = p.yield && p.yield.item ? p.yield.item : p.name.replace(/ (tree|bush|plant|vine)$/i, ''); return n.charAt(0).toUpperCase() + n.slice(1); }
    if (kind === 'decor') { const d = gardenDecor(id); return d ? d.name : 'A decoration'; }
    if (kind === 'bq') { const b = GARDEN_BOUQUETS.find(x => x.id === id); return b ? b.name : 'A bouquet'; }
    if (kind === 'fish') { const f = gardenFishParse(k), d = f && gardenFishDef(f.id); return d ? d.name : 'A fish'; }
    if (kind === 'bug') { const d = gardenBugDef(id); return d ? d.name : 'A bug'; }
    if (kind === 'fos') { for (const F of GP_FOSSILS) for (const P of F.parts) if (F.id + '-' + P[0] === id) return P[1]; return 'A piece of fossil'; }
    if (kind === 'cur') { const c = GARDEN_LAND_CURIOS.find(x => x.id === id); return c ? c.name : 'A curio'; }
    if (kind === 'dish') { const d = typeof gpDish === 'function' ? gpDish(id) : null; return d ? d.name : 'Something you cooked'; }
    if (kind === 'meal') return id === 'smoked' ? 'Smoked fish' : 'A meal';
  } catch (e) { /* below */ }
  return { fertiliser: 'Compost', honey: 'Jar of honey', clover: 'Four-leaf clover', egg: 'Egg', flour: 'Bag of flour' }[k] || 'Something';
}
/* small pictures of our own for the few things nothing else draws, lit from the upper left like the rest */
const _GB2_PICS = Object.freeze({
  egg: '<ellipse cx="0" cy="-3" rx="15" ry="4.4" fill="#6a4a24" opacity=".3"/><path d="M-15 -6q2 -7 15 -7t15 7q-6 5 -15 5t-15 -5z" fill="#c8a058"/><path d="M-13 -8q5 -3 9 -1M-3 -9q6 -3 11 0M5 -8q5 -1 8 1" stroke="#8a6a34" stroke-width="1.2" fill="none"/><ellipse cx="0" cy="-17" rx="9.4" ry="12" fill="#e8c8a0"/><ellipse cx="2.4" cy="-14" rx="7" ry="9.6" fill="#d4ac80" opacity=".7"/><ellipse cx="-3.4" cy="-22" rx="3" ry="4.4" fill="#fff6e8" opacity=".8"/>',
  flour: '<ellipse cx="0" cy="-2" rx="14" ry="3.6" fill="#4a3a24" opacity=".25"/><path d="M-12 -3q-3 -14 3 -24h18q6 10 3 24q-12 3 -24 0z" fill="#efe6d2"/><path d="M2 -27h7q6 10 3 24q-5 1.6 -10 1.4z" fill="#d8ccb4" opacity=".75"/><path d="M-9 -27q9 3 18 0l-2 -5q-7 2 -14 0z" fill="#d8ccb4"/><path d="M-8 -29.4q8 2 16 0" stroke="#a8743e" stroke-width="1.6" fill="none"/><path d="M0 -8v-12M0 -16q-4 -1 -4 -5M0 -13q4 -1 4 -5M0 -10q-3 -1 -4 -4" stroke="#c89a3a" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
  meal: '<ellipse cx="0" cy="-2" rx="17" ry="3.6" fill="#4a3a24" opacity=".25"/><path d="M-17 -5h34l-2 3h-30z" fill="#8a5e36"/><path d="M-17 -7h34v2h-34z" fill="#b08050"/><path d="M-13 -11q8 -9 20 -3q3 1 5 -2l1 7q-2 -2 -6 -1q-12 6 -20 -1z" fill="#b8742e"/><path d="M-11 -11q7 -6 16 -3" stroke="#e8b060" stroke-width="1.4" fill="none" opacity=".8"/><circle cx="-8.6" cy="-11.6" r="1" fill="#3a2414"/><path d="M-4 -15l1 3M0 -16l1 3M4 -15l1 3" stroke="#7a4418" stroke-width="1" stroke-linecap="round"/>',
  fos: '<ellipse cx="0" cy="-2" rx="16" ry="3.8" fill="#3a2e24" opacity=".25"/><path d="M-15 -4q-2 -9 6 -14q10 -5 18 0q8 5 5 14q-14 4 -29 0z" fill="#8a7c6a"/><path d="M-12 -12q8 -7 18 -3" stroke="#a89a86" stroke-width="2" fill="none" opacity=".7"/><path d="M-10 -9q3 -3 6 -1q2 -4 6 -2q4 -2 6 1q3 0 3 3q-4 1 -6 0q-3 2 -6 0q-3 2 -6 0q-3 1 -3 -1z" fill="#efe3c8"/><circle cx="-7.6" cy="-9.4" r="1.6" fill="#efe3c8"/><circle cx="9.4" cy="-8.4" r="1.6" fill="#efe3c8"/><path d="M-6 -8.6h13" stroke="#c8b896" stroke-width=".8"/>',
  parcel: '<ellipse cx="0" cy="-2" rx="14" ry="3.4" fill="#3a2e24" opacity=".25"/><path d="M-12 -4v-18h24v18z" fill="#c89a5e"/><path d="M4 -22h8v18h-8z" fill="#a87c44" opacity=".7"/><path d="M-12 -22l4 -4h24l-4 4z" fill="#dab47a"/><path d="M0 -4v-18M-12 -13h24" stroke="#7a3a2a" stroke-width="1.4"/>',
});
function _gb2Pic(name, px) { return `<svg class="gd-ico gb2-pic" viewBox="-20 -34 40 38" width="${px}" height="${px}" aria-hidden="true" focusable="false">${_GB2_PICS[name] || _GB2_PICS.parcel}</svg>`; }
function gardenB2Svg(item, px) {
  const [k, kind, id] = _gb2Split(item); px = px || 40;
  try {
    if (kind === 'seed') return gardenIconSvg(id, { kind: 'seed', px });
    if (kind === 'crop') return gardenIconSvg(id, { kind: 'crop', px });
    if (kind === 'decor') return gardenIconSvg(id, { kind: 'decor', px });
    if (kind === 'bq') return gardenIconSvg(id, { kind: 'bouquet', px });
    if (kind === 'fish') { const f = gardenFishParse(k); if (f) return gardenCatchSvg('fish', f.id, px, { uid: 'gb2f' + f.id }); }
    if (kind === 'bug') return gardenCatchSvg('bug', id, px, { uid: 'gb2b' + id });
    if (kind === 'cur' && typeof gardenLandCurioSvg === 'function') { const s = gardenLandCurioSvg(id, px); if (s) return s; }
    if (kind === 'dish' && typeof gpDish === 'function') { const d = gpDish(id); if (d) return gpDishSvg(d, px); }
    if (k === 'fertiliser' || k === 'honey' || k === 'clover') return gardenIconSvg(k, { kind: 'tool', px });
    if (kind === 'fos' || kind === 'meal' || k === 'egg' || k === 'flour') return _gb2Pic(kind === 'fos' || kind === 'meal' ? kind : k, px);
  } catch (e) { /* the parcel below */ }
  return _gb2Pic('parcel', px);
}
/** The satchel and the big bag in the shop (94-garden-2art.js _gdaTool's box: about -32..32 across, -60..6 up and down). */
function gardenB2ToolArt(id) {
  if (id === 'satchel') return '<ellipse cx="0" cy="2" rx="20" ry="4" fill="#3a2a18" opacity=".22"/><path d="M-14 -34Q-16 -50 0 -52Q16 -50 14 -34" fill="none" stroke="#6a4424" stroke-width="3.4"/><path d="M-19 -32q-1 -4 3 -4h32q4 0 3 4l-2 30q0 3 -3 3h-28q-3 0 -3 -3z" fill="#a8703e"/><path d="M8 -36h8q4 0 3 4l-2 30q0 3 -3 3h-6z" fill="#8a5a30" opacity=".75"/><path d="M-19 -32q-1 -4 3 -4h32q4 0 3 4l-1 12q-18 6 -36 0z" fill="#c08a52"/><path d="M-17 -33h32" stroke="#e8b880" stroke-width="1.2" opacity=".7"/><rect x="-4.5" y="-24" width="9" height="7" rx="1.6" fill="#e0b43a"/><rect x="-2.2" y="-22" width="4.4" height="3" fill="#8a6418"/><path d="M-12 -12h24" stroke="#8a5a30" stroke-width="1" stroke-dasharray="2 2" opacity=".6"/>';
  if (id === 'big-bag') return '<ellipse cx="0" cy="2" rx="22" ry="4.4" fill="#3a2a18" opacity=".22"/><path d="M-10 -46Q0 -56 10 -46" fill="none" stroke="#5a3a1e" stroke-width="3.2"/><path d="M-20 -38q0 -8 8 -8h24q8 0 8 8v34q0 4 -4 4h-32q-4 0 -4 -4z" fill="#5f8a54"/><path d="M8 -46h4q8 0 8 8v34q0 4 -4 4h-8z" fill="#4a7042" opacity=".8"/><path d="M-20 -38q0 -8 8 -8h24q8 0 8 8v8q-20 7 -40 0z" fill="#79a66a"/><path d="M-12 -22h24v14q0 2 -2 2h-20q-2 0 -2 -2z" fill="#4a7042"/><rect x="-3" y="-34" width="6" height="8" rx="1.4" fill="#d8a83a"/><path d="M-17 -40h34" stroke="#a8cc90" stroke-width="1.2" opacity=".6"/><path d="M-14 -16h28" stroke="#3a5a34" stroke-width="1" stroke-dasharray="2 2" opacity=".7"/>';
  return '';
}
/** A fish's quality as small stars ('' for an ordinary one). */
function _gb2Stars(item) { const f = typeof gardenFishParse === 'function' ? gardenFishParse(item) : null; return f && f.q > 0 ? '★'.repeat(f.q) : ''; }

/* ---------- what you can do with what is in a pocket ----------
   One row each, in order: { id, order, label(e, ctx) -> words, icon (a sprite name), when(e, ctx) -> bool, run(e, ctx, s) -> {ok, msg} or nothing,
   go: true (the main one, shown first and done by Enter or a double tap), close: true (the panel closes first) }.
   e: the pocket { i, n }; ctx: { m (the garden here), visit, store (at your chest), row (its GB2_POCKET class), kind, id }. A later step
   adds Hold, Display and the museum by adding rows; a row with the same id replaces the one here. */
const GB2_SLOT_ACTS = [];
function gardenB2SlotAct(row) {
  if (!row || !row.id || typeof row.run !== 'function') return;
  const i = GB2_SLOT_ACTS.findIndex(r => r.id === row.id); if (i >= 0) GB2_SLOT_ACTS[i] = row; else GB2_SLOT_ACTS.push(row);
  GB2_SLOT_ACTS.sort((a, b) => (a.order || 50) - (b.order || 50));
}
function gardenB2SlotCtx(e, store) {
  const m = gardenHere(), [, kind, id] = _gb2Split(e && e.i);
  return { m, visit: !!m.visit, store: !!store, row: e && e.i ? gardenB2Class(e.i) : null, kind, id };
}
function gardenB2SlotActs(e, ctx) { if (!e || !e.i) return []; return GB2_SLOT_ACTS.filter(r => { try { return !!r.when(e, ctx); } catch (err) { return false; } }); }
/** Hold a thing from your pockets for the page's own tool: a seed plants where you click a bed, a decoration goes down where you click,
 *  compost feeds the plant you click. X or Esc puts it back. */
function _gb2Hold(kind, id) {
  try { if (typeof _gh !== 'undefined' && _gh.bag) { _gh.bag = false; _ghBag(); } } catch (e) { /* no panel */ }
  const g = _gdG(), first = !g.seen['b2.h.' + kind];
  if (kind === 'seed') { _gdp.seed = id; _gdpPickTool('seed'); }
  else if (kind === 'decor') { _gdp.decor = id; _gdpPickTool('decorate'); }
  else _gdpPickTool('feed');
  if (first) { g.seen['b2.h.' + kind] = _gdToday(); _gb2Save(); gardenMessage(kind === 'seed' ? 'Click a bed to plant it, or sweep across the beds. X puts it back in your pockets.' : kind === 'decor' ? 'Click the garden where it should go. X puts it back in your pockets.' : 'Click a plant to give it compost. X puts it back in your pockets.', { icon: 'hand', ms: 7000 }); }
  return { ok: true };
}
const _gb2Catch = (e, ctx) => (ctx.kind === 'fish' || ctx.kind === 'bug');
const _gb2RealFish = (e) => { const f = typeof gardenFishParse === 'function' ? gardenFishParse(e.i) : null, d = f && gardenFishDef(f.id); return !!d && d.cat === 'fish'; };
gardenB2SlotAct({ id: 'plant', order: 10, go: true, icon: 'sprout', label: () => 'Plant it', when: (e, c) => c.kind === 'seed' && !c.store, run: (e, c) => _gb2Hold('seed', c.id) });
gardenB2SlotAct({ id: 'place', order: 10, go: true, icon: 'move', label: () => 'Put it down', when: (e, c) => c.kind === 'decor' && !c.store, run: (e, c) => _gb2Hold('decor', c.id) });
gardenB2SlotAct({ id: 'feed', order: 10, go: true, icon: 'sprout', label: () => 'Feed plants', when: (e, c) => e.i === 'fertiliser' && !c.store, run: () => _gb2Hold('feed', '') });
gardenB2SlotAct({ id: 'release', order: 20, icon: 'waves', label: () => 'Let it go', when: (e, c) => c.kind === 'fish' && _gb2RealFish(e) && !c.store, run: (e) => gardenFishRelease(e.i) });
gardenB2SlotAct({ id: 'hall', order: 25, icon: 'landmark', label: () => 'Give to the lake hall', when: (e, c) => { if (!_gb2Catch(e, c) || c.store || (c.kind === 'fish' && !_gb2RealFish(e))) return false; const hall = (_gca().hall || {}), given = (c.kind === 'bug' ? hall.b : hall.f) || {}, id = c.kind === 'fish' ? gardenFishParse(e.i).id : c.id; return !given[id]; }, run: (e, c) => gardenHallGive(c.kind === 'bug' ? 'bug' : 'fish', c.kind === 'fish' ? gardenFishParse(e.i).id : c.id) });
gardenB2SlotAct({ id: 'sell', order: 30, icon: 'coins', label: (e, c) => { const p = _gb2SellEach(e, c); return `Sell one for ${p}`; }, when: (e, c) => _gb2SellEach(e, c) > 0, run: (e, c) => (_gb2Catch(e, c) ? gardenCatchSell(e.i, 1) : gardenSell(e.i, 1)) });
gardenB2SlotAct({ id: 'home', order: 90, icon: 'house', label: (e, c) => (c.store ? 'Put it away' : 'Send home'), when: () => true, run: (e, c, s) => gardenB2SendHome(s) });
function _gb2SellEach(e, c) { try { if (_gb2Catch(e, c)) return gardenCatchEach(e.i) || 0; if (c.kind === 'crop' || c.kind === 'bq' || c.kind === 'decor' || e.i === 'honey') return gardenSellPrice(e.i) || 0; } catch (err) { /* not sold */ } return 0; }

/** The seeds in your pockets, the way the page's own list has them (94-garden-4page.js _gdpSeedList); null before pockets are filled. */
function gardenB2SeedList() {
  if (!gardenB2On() || !_gdG().seen['b2.pk']) return null;
  const v = gardenB2View(), by = new Map();
  for (const e of v.slots) if (e && e.i && e.i.startsWith('seed:')) by.set(e.i, (by.get(e.i) || 0) + e.n);
  const out = []; for (const [k, n] of by) { const p = gardenPlant(k.slice(5)); if (p) out.push({ id: p.id, def: p, n }); }
  return out.sort((a, b) => GARDEN_CAT_ORDER.indexOf(a.def.cat) - GARDEN_CAT_ORDER.indexOf(b.def.cat) || a.def.name.localeCompare(b.def.name));
}
