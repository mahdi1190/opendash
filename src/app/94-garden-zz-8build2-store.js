/* ============================================================
   BUILD 2: YOUR POCKETS AND YOUR STORAGE, ON SCREEN. Both open over the world where the old bag opened (_gh.bag), so every way the bag
   closed (B, Esc, a number key, the map) closes them too, and nothing behind them answers E.

   Your pockets (B or I, or the bag at the end of the ring): every pocket a painted slot, the thing's own picture and how many. Tap one to
   see what it is and what you can do with it (plant it, put it down, feed plants, let a fish go, give it to the lake hall, sell one,
   send it home); tap it again, or press Enter, for the first of those. Drag one onto another to swap them (the same things join into one
   stack). Delete sends it home.
   Your storage (E at your chest, or "Open your storage" on its bubble): your pockets on the left, home on the right in tabs. Tap a pocket
   to put it away, tap something at home to take a stack. A chest is any thing of the kind `chest` (GARDEN_KINDS), wherever it stands:
   every chest opens the same storage. Walk away and it closes.

     gardenB2Pockets(box)         draws (or takes away) the open panel: the hotbar file's _ghBag calls it
     gardenB2OpenStore(t)         open your storage (at a chest)
     gardenB2ActRows(px, py, rows) the chest's E prompt, for any thing of a storing kind in reach (94-garden-zz-7act-1core.js gartActNearby)
     gardenB2DecorBubble(d, m, items)   "Open your storage" on a chest's bubble (94-garden-world-2hud.js gardenDecorBubble)
   ============================================================ */
const GB2_HOME_PAGE = 24;
function _gb2El(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
/** Whole plants and decorations kept with their growth and history (put away by a garden update): they wait in your storage, on their
 *  own tab, and go back out with the garden's own placing (gardenMoveStart, 94-garden-world-2hud.js). Your own garden only. */
function _gb2Kept0() { try { return gardenStoredIndex(gardenHere()); } catch (e) { return { rows: [], signature: '' }; } }
function _gb2PutOut(kind, uid) {
  // (build2, hands) into your pockets, kept whole; from there you hold it and put it down with the square in front of you
  const v = gardenB2View(), m = kind === 'plant' ? 'plants' : 'decor';
  if (v.slots.some(e => e && e.u === uid)) return { ok: true, msg: 'It is in your pockets already.' };
  const i = v.slots.indexOf(null); if (i < 0) return _gdNo('Your pockets are full. Put something away first.');
  const slots = v.slots.slice(); slots[i] = { u: uid, m }; _gb2Write(slots);
  return { ok: true, msg: 'In your pockets, kept whole. Hold it to put it out in the garden.' };
}
/** A whole thing kept in a pocket: its name, its picture and what can be done with it. */
function _gb2RecOf(e) {
  if (!e || !e.u) return null;
  const kind = e.m === 'plants' ? 'plant' : 'decor'; let it = null; try { it = gardenPlacementItem(gardenModel(), kind, e.u); } catch (err) { it = null; }
  if (!it || !it.packed) return null;
  return { kind, it, name: kind === 'plant' ? `${it.def.name} (in a pot)` : `${it.def.name} (kept whole)`, sub: kind === 'plant' ? 'Still growing, roots and all' : 'Just as it was', svg: (px) => { try { return gardenIconSvg(it.def.id, { kind, stage: it.stage, variant: it.variant, r: it.r, v: it.v, px }); } catch (err) { return _gb2Pic('parcel', px); } } };
}
function _gb2RecActs(e, s) {
  const R = _gb2RecOf(e); if (!R) return [];
  return [{ id: 'hold', go: true, icon: R.kind === 'plant' ? 'sprout' : 'move', label: R.kind === 'plant' ? 'Plant it' : 'Put it down', run: () => (typeof gardenB2HoldRec === 'function' && gardenB2HoldRec(e, s) ? { ok: true } : _gdNo('That cannot go out just now.')) },
    { id: 'home', icon: 'house', label: 'Send home', run: () => gardenB2SendHome(s) }];
}
/** Is any chest yours standing in your garden (not packed away)? */
function _gb2ChestOut() {
  try { const g = _gdG(); for (const d of Object.values(g.decor)) { if (!d || d.own || d._packed) continue; const k = gardenKindOf({ decor: d.d, id: d.d }); if (k && GARDEN_KINDS[k] && GARDEN_KINDS[k].store) return true; } } catch (e) { /* none */ }
  return false;
}
/** A thing of a storing kind waiting at home (any chest), or ''. */
function _gb2ChestAtHome(v) {
  for (const k in v.home) { if (!k.startsWith('decor:')) continue; try { const kd = gardenKindOf({ decor: k.slice(6), id: k.slice(6) }); if (kd && GARDEN_KINDS[kd] && GARDEN_KINDS[kd].store) return k; } catch (e) { /* not one */ } }
  return '';
}
/** What a panel shows, as words to compare: base (everything but which pocket is chosen) and sel (the chosen one and what it offers). */
function _gb2Stamp(v, store) {
  let s = (store ? 's' : 'p') + '|' + _gb2.tab + '|' + _gb2.page + '|' + v.size + '|';
  for (const e of v.slots) s += e ? (e.i || e.u) + '*' + (e.n || 1) + ',' : '-,';
  if (store) { for (const k in v.home) { const r = gardenB2Class(k); if (r && r.tab === _gb2.tab) s += k + '=' + v.home[k] + ';'; } s += '|' + GB2_TABS.map(t => t.id + Object.keys(v.home).filter(k => { const r = gardenB2Class(k); return r && r.tab === t.id; }).length).join(',') + '|k' + _gb2Kept0().signature; return { base: s, sel: '' }; }
  s += '|c' + (_gb2ChestOut() ? 1 : 0) + '|k' + _gb2Kept0().rows.length + '|h' + (_gb2ChestAtHome(v) ? 1 : 0) + '|in' + _gb2HandItem();
  const e = v.slots[_gb2.sel]; let sel = String(_gb2.sel);
  if (e && e.i) sel += '|h' + (v.home[e.i] || 0) + '|' + gardenB2SlotActs(e, gardenB2SlotCtx(e, false)).map(r => r.id).join(',');
  return { base: s, sel };
}
function gardenB2Pockets(box) {
  if (!gardenB2On()) return false;
  let el = box.querySelector(':scope > .gd-bagpop');
  if (!_gh.bag) {
    if (el) { const focused = el.contains(document.activeElement); el.remove(); if (focused) box.focus({ preventScroll: true }); }
    _gb2.panel = 'pockets'; _gb2.popKey = ''; _gb2.at = null;
    return true;
  }
  const fresh = !el || !el.classList.contains('gb2-pop');
  if (fresh) {
    if (el) el.remove();
    el = _gb2El('div', 'gd-bagpop gb2-pop'); el.setAttribute('role', 'dialog'); el.setAttribute('aria-labelledby', 'gb2-title');
    box.appendChild(el); _gb2Bind(el); _gb2.popKey = '';
    if (typeof gardenBubbleClose === 'function') gardenBubbleClose();
  }
  if (_gb2.panel === 'build' && typeof gardenB2BuildDraw === 'function') {   // Build: the tools, things to make, your plans (94-garden-zz-8build2-land.js)
    const k = gardenB2BuildKey(); if (!fresh && el.firstChild && _gb2.popKey === k) return true;
    _gb2.popKey = k; el.className = 'gd-bagpop gb2-pop gb2-build'; gardenB2BuildDraw(el, box);
    if (fresh) { const f = el.querySelector('.gb2-tab[aria-selected="true"]'); if (f) f.focus({ preventScroll: true }); }
    return true;
  }
  const v = gardenB2View(), store = _gb2.panel === 'store';
  if (fresh && !store) { const hand = _gb2HandSlot(v.slots), chest = v.slots.findIndex(e => e && e.i === 'decor:storage-chest'); _gb2.sel = hand != null ? hand : !_gb2ChestOut() && chest >= 0 ? chest : v.slots.findIndex(Boolean); }
  if (_gb2.sel >= v.size) _gb2.sel = -1;
  const st = _gb2Stamp(v, store);
  if (!fresh && el.firstChild && _gb2.popKey === st.base) {
    if (_gb2.popSel === st.sel) return true;
    // only which pocket is chosen changed: the grid stays as it is and the strip under it is drawn again (a whole panel per tap was 20 ms)
    _gb2.popSel = st.sel;
    for (const b of el.querySelectorAll('.gb2-pkgrid .gb2-slot')) b.setAttribute('aria-selected', String(Number(b.dataset.s) === _gb2.sel));
    const det = el.querySelector('.gb2-detail'); if (det) { det.textContent = ''; _gb2Detail(det, v); }
    return true;
  }
  _gb2.popKey = st.base; _gb2.popSel = st.sel;
  const focusKey = el.contains(document.activeElement) ? document.activeElement.dataset.gb2k || '' : '';
  el.textContent = ''; el.classList.remove('gb2-build'); el.classList.toggle('gb2-store', store); el.classList.toggle('gb2-pockets', !store);
  const head = _gb2El('div', 'gb2-head'), pic = _gb2El('span', 'gb2-head-pic'), title = _gb2El('h2', '', store ? 'Your storage' : 'Your pockets'), cap = _gb2El('span', 'gb2-cap', `${v.used} of ${v.size} pockets used`), x = _gb2El('button', 'gb2-x');
  pic.innerHTML = store ? gardenIconSvg('storage-chest', { kind: 'decor', px: 40 }) : _GH_GLYPH.bag; pic.setAttribute('aria-hidden', 'true');
  title.id = 'gb2-title'; x.type = 'button'; x.dataset.gb2k = 'close'; x.setAttribute('aria-label', store ? 'Close your storage' : 'Close your pockets'); x.innerHTML = icon('x');
  x.onclick = () => _gb2Close(box);
  head.append(pic, title, cap, x); el.appendChild(head);
  if (store) _gb2DrawStore(el, v); else _gb2DrawPockets(el, v);
  const want = (focusKey && el.querySelector(`[data-gb2k="${CSS.escape(focusKey)}"]`)) || (fresh ? el.querySelector(store ? '.gb2-side-home [data-gb2k^="h:"], .gb2-side-pk .gb2-slot' : '.gb2-slot[aria-selected="true"], .gb2-slot') : null);
  if (want) want.focus({ preventScroll: true });
  return true;
}
function _gb2Close(box) {
  _gh.bag = false; _ghBag(); _gh.bar = ''; _ghBar(box, gardenHere());
  try { box.focus({ preventScroll: true }); } catch (e) { /* fine */ }
}
/** One pocket as a button: the thing's picture and how many (a fish's stars), or an empty pocket. */
function _gb2SlotBtn(v, s, store) {
  const e = v.slots[s], b = _gb2El('button', 'gb2-slot' + (e ? '' : ' is-empty')); b.type = 'button'; b.dataset.s = String(s); b.dataset.gb2k = 'p:' + s;
  const R = e && e.u ? _gb2RecOf(e) : null;
  if (R) {   // a whole thing, kept: its own picture, with a little pot or a ribbon
    b.innerHTML = R.svg(40) + `<i class="gb2-keptmark${R.kind === 'plant' ? ' is-pot' : ''}" aria-hidden="true"></i>`;
    b.setAttribute('aria-label', R.name + (store ? '. Put it away' : '')); b.setAttribute('data-tip', store ? `${R.name}: put it away` : R.name); b.classList.add('is-kept');
    if (!store) b.setAttribute('aria-selected', String(_gb2.sel === s));
    return b;
  }
  if (!e || !e.i) { b.setAttribute('aria-label', 'An empty pocket'); if (!store) b.setAttribute('aria-selected', String(_gb2.sel === s)); return b; }
  const name = gardenB2Name(e.i), stars = _gb2Stars(e.i), hand = !store && _gb2HandItem() === e.i && _gb2HandSlot(v.slots) === s;
  b.innerHTML = gardenB2Svg(e.i, 40) + (e.n > 1 ? `<i class="gb2-n">${e.n}</i>` : '') + (stars ? `<i class="gb2-star" aria-hidden="true">${stars}</i>` : '') + (hand ? '<i class="gb2-inhandmark" aria-hidden="true"></i>' : '');
  b.setAttribute('aria-label', `${name}${stars ? ' (' + stars.length + ' star)' : ''}, ${e.n}${hand ? ', in your hand' : ''}${store ? '. Put it away' : ''}`);
  b.setAttribute('data-tip', store ? `${name}: put it away` : name);
  b.draggable = true;
  if (!store) b.setAttribute('aria-selected', String(_gb2.sel === s));
  if (hand) b.classList.add('is-hand');
  return b;
}
function _gb2DrawPockets(el, v) {
  const grid = _gb2El('div', 'gb2-grid gb2-pkgrid'); grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', 'Your pockets');
  grid.classList.add('gb2-c10');
  for (let s = 0; s < v.size; s++) grid.appendChild(_gb2SlotBtn(v, s, false));
  el.appendChild(grid);
  const det = _gb2El('div', 'gb2-detail'); det.setAttribute('aria-live', 'polite'); el.appendChild(det);
  _gb2Detail(det, v);
  _gb2Foot(el, v);
}
/** The strip under your pockets: the chosen thing, how many, and what you can do with it. */
function _gb2Detail(det, v) {
  const e = v.slots[_gb2.sel], R = e && e.u ? _gb2RecOf(e) : null;
  if (R) {
    const p = _gb2El('span', 'gb2-detail-pic'); p.innerHTML = R.svg(52); p.setAttribute('aria-hidden', 'true');
    const t = _gb2El('div', 'gb2-detail-t'); t.append(_gb2El('b', '', R.name), _gb2El('small', '', R.sub));
    const acts = _gb2El('div', 'gb2-acts'), s = _gb2.sel;
    _gb2RecActs(e, s).forEach((r, i) => { const a = _gb2El('button', 'gb2-act' + (i === 0 ? ' is-go' : '')); a.type = 'button'; a.dataset.gb2k = 'a:' + r.id; a.innerHTML = icon(r.icon) + '<span></span>'; a.lastChild.textContent = r.label; a.onclick = (ev) => { ev.stopPropagation(); const res = r.run(); if (res && res.ok === false) gameDenyOf(res, a); else if (res && res.msg && r.id === 'home') gardenMessage(res.msg, { icon: 'house', ms: 3500 }); _gb2.popKey = ''; if (_gh.bag) _ghBag(); }; acts.appendChild(a); });
    det.append(p, t, acts);
    return;
  }
  if (e && e.i) {
    const name = gardenB2Name(e.i), stars = _gb2Stars(e.i), atHome = v.home[e.i] || 0, ctx = gardenB2SlotCtx(e, false);
    const p = _gb2El('span', 'gb2-detail-pic'); p.innerHTML = gardenB2Svg(e.i, 52); p.setAttribute('aria-hidden', 'true');
    const t = _gb2El('div', 'gb2-detail-t'), b = _gb2El('b', '', name);
    if (stars) b.appendChild(_gb2El('span', 'gb2-detail-stars', ' ' + stars));
    t.append(b, _gb2El('small', '', `${e.n} in your pockets${atHome ? ` · ${atHome} more at home` : ''}`));
    const acts = _gb2El('div', 'gb2-acts');
    gardenB2SlotActs(e, ctx).forEach((r, i) => {
      const a = _gb2El('button', 'gb2-act' + (i === 0 && r.go ? ' is-go' : '')); a.type = 'button'; a.dataset.gb2k = 'a:' + r.id;
      let label = ''; try { label = r.label(e, ctx); } catch (err) { label = r.id; }
      a.innerHTML = icon(r.icon || 'circle') + '<span></span>'; a.lastChild.textContent = label;
      a.onclick = (ev) => { ev.stopPropagation(); _gb2DoAct(r, _gb2.sel, a); };
      acts.appendChild(a);
    });
    det.append(p, t, acts);
  } else {
    const t = _gb2El('div', 'gb2-detail-t');
    t.append(_gb2El('b', '', v.used ? 'Choose a pocket' : 'Your pockets are empty'), _gb2El('small', '', 'What you pick, catch, find and buy goes in your pockets. When they are full, the rest goes home to your storage.'));
    det.appendChild(t);
  }
}
/** The line at the foot of your pockets: where your storage is (and your chest, should it have gone home). */
function _gb2Foot(el, v) {
  const chestIn = v.slots.some(x => x && x.i === 'decor:storage-chest'), out = _gb2ChestOut(), keptN = _gb2Kept0().rows.length;
  const keptLine = keptN ? ` ${keptN === 1 ? 'A plant or decoration you kept whole waits' : keptN + ' plants and decorations you kept whole wait'} there too.` : '';
  const homeChest = !out && !chestIn ? _gb2ChestAtHome(v) : '';   // (your only chest went home: it could never be opened to take itself out)
  const foot = _gb2El('p', 'gb2-foot', (out ? 'Your storage chest at home keeps everything else: open it to take things out or put them away.' : chestIn ? 'Your storage chest is in your pockets. Choose it and Put it down: it opens your storage.' : homeChest ? 'Your storage chest is at home, packed away.' : 'A storage chest (in the shop) opens your storage at home.') + keptLine);
  if (homeChest) {
    const b = _gb2El('button', 'gb2-act is-go gb2-bring'); b.type = 'button'; b.dataset.gb2k = 'bring'; b.innerHTML = icon('package') + '<span></span>'; b.lastChild.textContent = 'Ask Perpetua to bring it';
    b.onclick = (ev) => { ev.stopPropagation(); const r = gardenB2Take(homeChest, 1); if (!r.ok) { gameDenyOf(r.msg && /full/.test(r.msg) ? { ok: false, msg: 'Your pockets are full. Send something home to make room for your chest.' } : r, b); return; } _gb2.sel = gardenB2View().slots.findIndex(e => e && e.i === homeChest); _gb2.popKey = ''; _ghBag(); gardenMessage('Perpetua brought your chest. Put it down near home.', { icon: 'package', ms: 5000 }); };
    foot.appendChild(document.createTextNode(' ')); foot.appendChild(b);
  }
  el.appendChild(foot);
}
function _gb2HomeList(v, tab) {
  const order = new Map(GB2_POCKET.map((r, i) => [r.c, i]));
  return Object.keys(v.home).filter(k => { const r = gardenB2Class(k); return r && r.tab === tab; })
    .map(k => ({ k, n: v.home[k], r: gardenB2Class(k), name: gardenB2Name(k) }))
    .sort((a, b) => order.get(a.r.c) - order.get(b.r.c) || a.name.localeCompare(b.name) || (a.k < b.k ? -1 : 1));
}
function _gb2DrawStore(el, v) {
  const cols = _gb2El('div', 'gb2-cols'); el.appendChild(cols);
  // your pockets: tap one to put it away
  const pk = _gb2El('section', 'gb2-side gb2-side-pk'), h1 = _gb2El('h3');
  h1.append(_gb2El('span', '', 'Your pockets'), _gb2El('small', '', `${v.used} of ${v.size}`));
  const grid = _gb2El('div', 'gb2-grid gb2-pkgrid'); grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', 'Your pockets: tap one to put it away'); grid.classList.add('gb2-c' + (v.size <= 20 ? 5 : v.size <= 30 ? 6 : 8));
  for (let s = 0; s < v.size; s++) grid.appendChild(_gb2SlotBtn(v, s, true));
  pk.append(h1, grid, _gb2El('p', 'gb2-hint', 'Tap a pocket to put it away.'));
  // home, in tabs: tap a thing to take a stack
  const home = _gb2El('section', 'gb2-side gb2-side-home'), h2 = _gb2El('h3');
  let total = 0; for (const k in v.home) total += 1;
  h2.append(_gb2El('span', '', 'At home'), _gb2El('small', '', total === 1 ? '1 kind of thing' : `${total} kinds of things`));
  const tabs = _gb2El('div', 'gb2-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'What is at home');
  const kept = _gb2Kept0(), keptN = kept.rows.length, onKept = _gb2.tab === 'kept' && keptN > 0;
  if (!onKept && !GB2_TABS.some(t => t.id === _gb2.tab)) _gb2.tab = GB2_TABS[0].id;
  const tabRow = (id, name, ic, n) => { const b = _gb2El('button', 'gb2-tab'); b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.gb2k = 't:' + id; b.dataset.tab = id; b.setAttribute('aria-selected', String(_gb2.tab === id)); b.innerHTML = icon(ic) + '<span></span>' + (n ? `<i>${n}</i>` : ''); b.querySelector('span').textContent = name; tabs.appendChild(b); };
  for (const T of GB2_TABS) tabRow(T.id, T.name, T.icon, _gb2HomeList(v, T.id).length);
  if (keptN) tabRow('kept', 'Kept whole', 'archive', keptN);
  const list = onKept ? kept.rows : _gb2HomeList(v, _gb2.tab), pages = Math.max(1, Math.ceil(list.length / GB2_HOME_PAGE));
  _gb2.page = Math.max(0, Math.min(pages - 1, _gb2.page));
  const hg = _gb2El('div', 'gb2-grid gb2-homegrid'); hg.setAttribute('role', 'group'); hg.setAttribute('aria-label', onKept ? 'Kept whole: tap one to put it out in the garden' : 'At home: tap one to take a stack'); hg.classList.add('gb2-c6');
  if (onKept) {
    // plants and decorations kept with their growth: one tap puts one back out (you choose where)
    for (const item of gardenStoredItems(gardenHere(), _gb2.page * GB2_HOME_PAGE, GB2_HOME_PAGE)) {
      const b = _gb2El('button', 'gb2-slot gb2-kepttile'); b.type = 'button'; b.dataset.kind = item.kind; b.dataset.uid = item.uid; b.dataset.gb2k = 'k:' + item.uid;
      try { b.innerHTML = gardenIconSvg(item.def.id, { kind: item.kind, stage: item.stage, variant: item.variant, r: item.r, v: item.v, px: 40 }); } catch (e) { b.innerHTML = _gb2Pic('parcel', 40); }
      b.setAttribute('aria-label', `${item.def.name}, kept with its ${item.kind === 'plant' ? 'growth' : 'look'}. Put it out in the garden`); b.setAttribute('data-tip', `${item.def.name}: put it out`);
      hg.appendChild(b);
    }
  } else for (const it of list.slice(_gb2.page * GB2_HOME_PAGE, (_gb2.page + 1) * GB2_HOME_PAGE)) {
    const b = _gb2El('button', 'gb2-slot gb2-hometile'); b.type = 'button'; b.dataset.item = it.k; b.dataset.gb2k = 'h:' + it.k;
    const stars = _gb2Stars(it.k);
    b.innerHTML = gardenB2Svg(it.k, 40) + (it.n > 1 ? `<i class="gb2-n">${it.n > 999 ? '999+' : it.n}</i>` : '') + (stars ? `<i class="gb2-star" aria-hidden="true">${stars}</i>` : '');
    b.setAttribute('aria-label', `${it.name}, ${it.n} at home. Take a stack`); b.setAttribute('data-tip', `${it.name}: ${it.n} at home`);
    hg.appendChild(b);
  }
  if (!list.length) { const none = _gb2El('p', 'gb2-none', 'Nothing of this kind at home.'); hg.appendChild(none); }
  home.append(h2, tabs, hg);
  const foot = _gb2El('div', 'gb2-homefoot');
  if (pages > 1) {
    const prev = _gb2El('button', 'gb2-pg'), next = _gb2El('button', 'gb2-pg'), at = _gb2El('span', 'gb2-pgat', `${_gb2.page + 1} of ${pages}`);
    prev.type = next.type = 'button'; prev.innerHTML = icon('chevron-left'); next.innerHTML = icon('chevron-right'); prev.setAttribute('aria-label', 'Previous page'); next.setAttribute('aria-label', 'Next page');
    prev.dataset.gb2k = 'pg:-1'; next.dataset.gb2k = 'pg:1'; prev.disabled = _gb2.page === 0; next.disabled = _gb2.page >= pages - 1;
    foot.append(prev, at, next);
  }
  const T = GB2_TABS.find(t => t.id === _gb2.tab), inPk = v.slots.some(e => e && e.i && gardenB2Class(e.i) && gardenB2Class(e.i).tab === _gb2.tab);
  if (onKept) foot.appendChild(_gb2El('span', 'gb2-pgat gb2-keptnote', 'Plants keep their growth; tap one to put it out.'));
  else { const all = _gb2El('button', 'gb2-act gb2-putall'); all.type = 'button'; all.dataset.gb2k = 'all'; all.disabled = !inPk; all.innerHTML = icon('archive') + '<span></span>'; all.lastChild.textContent = `Put all ${T ? T.name.toLowerCase() : 'of these'} away`; foot.appendChild(all); }
  home.appendChild(foot);
  cols.append(pk, home);
  el.appendChild(_gb2El('p', 'gb2-foot gb2-status', 'Tap a pocket to put it away, or tap something at home to take it. Drag a pocket onto home to put it away.'));
}
/** Do one of a pocket's things: say what happened, in the garden's own words and pictures. */
function _gb2DoAct(r, s, btn) {
  const v = gardenB2View(), e = v.slots[s]; if (!e || !e.i) return;
  const ctx = gardenB2SlotCtx(e, _gb2.panel === 'store');
  let res = null; _gb2.useSlot = s;
  try { res = r.run(e, ctx, s); } catch (err) { console.error('[garden pockets]', err); res = _gdNo('That did not work. Try again.'); }
  try { if (!res || res.ok !== false) _gb2Watch(); } finally { _gb2.useSlot = null; }   // (what it used comes out of this very pocket, now)
  if (res && res.ok === false) { gameDenyOf(res, btn); return; }
  if (r.id === 'home') { try { if (res && res.msg) gardenMessage(res.msg, { icon: 'house', ms: 3000 }); } catch (err) { /* quiet */ } try { gardenSfx('place'); } catch (err) { /* quiet */ } }
  if (btn && btn.isConnected && r.id !== 'plant' && r.id !== 'place' && r.id !== 'feed') gameCheer(btn, { quiet: true });
  _gb2.popKey = ''; if (_gh.bag) _ghBag();
}
function _gb2Bind(el) {
  const box = () => _ghBox();
  el.addEventListener('pointerdown', (ev) => ev.stopPropagation());
  el.addEventListener('click', (ev) => {
    const t = ev.target.closest('button'); if (!t || !el.contains(t)) return;
    const store = _gb2.panel === 'store';
    if (t.classList.contains('gb2-tab')) { _gb2.tab = t.dataset.tab; _gb2.page = 0; _gb2.popKey = ''; _ghBag(); try { gardenSfx('tab'); } catch (e) { /* quiet */ } return; }
    if (t.classList.contains('gb2-pg')) { _gb2.page += Number(t.dataset.gb2k.slice(3)) || 0; _gb2.popKey = ''; _ghBag(); return; }
    if (t.dataset.gb2k === 'all') { const r = gardenB2PutAway(_gb2.tab); if (!r.ok) gameDenyOf(r, t); else { try { gardenSfx('place'); } catch (e) { /* quiet */ } } return; }
    if (t.classList.contains('gb2-kepttile')) { const r = _gb2PutOut(t.dataset.kind, t.dataset.uid); if (!r.ok) gameDenyOf(r, t); else { try { gardenSfx('place'); } catch (e) { /* quiet */ } if (r.msg) gardenMessage(r.msg, { icon: 'package', ms: 3500 }); } return; }
    if (t.classList.contains('gb2-hometile')) { const r = gardenB2Take(t.dataset.item); if (!r.ok) { gameDenyOf(r, t); return; } try { gardenSfx('place'); } catch (e) { /* quiet */ } if (r.msg) gardenMessage(r.msg, { icon: 'package', ms: 3000 }); return; }
    if (t.classList.contains('gb2-slot') && t.dataset.s != null) {
      const s = Number(t.dataset.s), v = gardenB2View(), e = v.slots[s];
      if (store) { if (e && (e.i || e.u)) { const r = gardenB2SendHome(s); if (!r.ok) gameDenyOf(r, t); else { try { gardenSfx('place'); } catch (err) { /* quiet */ } } } return; }
      if (_gb2.sel === s && e && e.u) { const first = _gb2RecActs(e, s)[0]; if (first) { const r = first.run(); if (r && r.ok === false) gameDenyOf(r, t); } return; }   // a whole thing: the second tap holds it
      if (_gb2.sel === s && e && e.i) { const first = gardenB2SlotActs(e, gardenB2SlotCtx(e, false))[0]; if (first) _gb2DoAct(first, s, t); return; }   // a second tap: the first thing it does
      _gb2.sel = s; _ghBag();   // (only the choice changed: the light path in gardenB2Pockets)
    }
  });
  el.addEventListener('dblclick', (ev) => {
    const t = ev.target.closest('.gb2-slot[data-s]'); if (!t || _gb2.panel === 'store') return;
    const s = Number(t.dataset.s), e = gardenB2View().slots[s]; if (!e || !e.i) return;
    const first = gardenB2SlotActs(e, gardenB2SlotCtx(e, false))[0]; if (first && _gb2.sel !== s) { _gb2.sel = s; _gb2DoAct(first, s, t); }
  });
  el.addEventListener('keydown', (ev) => {
    const t = ev.target; if (!t || !t.closest) return;
    const slot = t.closest('.gb2-slot');
    if (slot && /^Arrow(Left|Right|Up|Down)$/.test(ev.key)) {
      const grid = slot.parentElement, all = [...grid.querySelectorAll(':scope > .gb2-slot')], i = all.indexOf(slot), cols = Math.max(1, Number(getComputedStyle(grid).getPropertyValue('--cols')) || 10);
      const n = ev.key === 'ArrowLeft' ? i - 1 : ev.key === 'ArrowRight' ? i + 1 : ev.key === 'ArrowUp' ? i - cols : i + cols;
      if (n >= 0 && n < all.length) { ev.preventDefault(); ev.stopPropagation(); all[n].focus({ preventScroll: true }); if (_gb2.panel !== 'store' && all[n].dataset.s != null) { _gb2.sel = Number(all[n].dataset.s); _ghBag(); } }
      return;
    }
    if (slot && slot.dataset.s != null && (ev.key === 'Delete' || ev.key === 'Backspace')) { ev.preventDefault(); ev.stopPropagation(); const r = gardenB2SendHome(Number(slot.dataset.s)); if (r.ok) { if (r.msg) gardenMessage(r.msg, { icon: 'house', ms: 3000 }); } else gameDenyOf(r, slot); return; }
    if (ev.key === 'i' || ev.key === 'I') { ev.preventDefault(); ev.stopPropagation(); const b = box(); if (b) _gb2Close(b); }
  });
  // drag a pocket onto another to swap them; in your storage, onto home to put it away
  el.addEventListener('dragstart', (ev) => { const t = ev.target.closest && ev.target.closest('.gb2-slot[data-s]'); if (!t || t.classList.contains('is-empty')) { ev.preventDefault(); return; } _gb2.drag = Number(t.dataset.s); try { ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', 'gb2:' + t.dataset.s); } catch (e) { /* fine */ } t.classList.add('is-dragging'); });
  el.addEventListener('dragend', (ev) => { _gb2.drag = null; const t = ev.target.closest && ev.target.closest('.gb2-slot'); if (t) t.classList.remove('is-dragging'); for (const n of el.querySelectorAll('.is-drop')) n.classList.remove('is-drop'); });
  el.addEventListener('dragover', (ev) => { if (_gb2.drag == null) return; const t = ev.target.closest && (ev.target.closest('.gb2-slot[data-s]') || ev.target.closest('.gb2-side-home')); if (!t) return; ev.preventDefault(); for (const n of el.querySelectorAll('.is-drop')) if (n !== t) n.classList.remove('is-drop'); t.classList.add('is-drop'); });
  el.addEventListener('drop', (ev) => {
    if (_gb2.drag == null) return; ev.preventDefault();
    const from = _gb2.drag; _gb2.drag = null;
    const slot = ev.target.closest && ev.target.closest('.gb2-slot[data-s]'), home = ev.target.closest && ev.target.closest('.gb2-side-home');
    if (slot) { if (gardenB2Swap(from, Number(slot.dataset.s))) { if (_gb2.panel !== 'store') _gb2.sel = Number(slot.dataset.s); try { gardenSfx('place'); } catch (e) { /* quiet */ } } }
    else if (home) { const r = gardenB2SendHome(from); if (!r.ok) gameDenyOf(r, home); else { try { gardenSfx('place'); } catch (e) { /* quiet */ } } }
    _gb2.popKey = ''; _ghBag();
  });
  // what something at home is, on the status line, as the pointer or the keys go over it
  const tell = (ev) => { const t = ev.target.closest && ev.target.closest('.gb2-slot'); const line = el.querySelector('.gb2-status'); if (!t || !line) return; const words = t.getAttribute('aria-label'); if (words) line.textContent = words.replace(/\. (Take a stack|Put it away)$/, (m0, w) => '. Tap to ' + w.toLowerCase() + '.'); };
  el.addEventListener('pointerover', tell); el.addEventListener('focusin', tell);
}

/* ---------- your storage, at a chest ---------- */
function gardenB2OpenStore(t) {
  const box = _ghBox(); if (!box || !gardenB2On()) return false;
  try { _ghClosePanels(box); gardenBubbleClose(); } catch (e) { /* fine */ }
  if (t && typeof gardenWorldFace === 'function') { try { gardenWorldFace({ x: Math.floor(t.x), y: Math.floor(t.y - 0.5) }); } catch (e) { /* fine */ } }
  _gb2.panel = 'store'; _gb2.at = typeof _gw !== 'undefined' ? { x: _gw.px, y: _gw.py } : null; _gb2.page = 0; _gb2.popKey = '';
  _gh.bag = true; _ghBag(); _gh.bar = ''; _ghBar(box, gardenHere());   // (pockets already open: the storage opens in their place)
  try { gardenSfx('open'); } catch (e) { /* quiet */ }
  return true;
}
/** Walked away from your chest: the storage closes (you can always send things home from your pockets). */
function _gb2StoreWalk() {
  if (!_gh.bag || _gb2.panel !== 'store' || !_gb2.at || typeof _gw === 'undefined') return;
  let away = Math.hypot(_gw.px - _gb2.at.x, _gw.py - _gb2.at.y) > 2.6;
  try { if (gardenHere().visit) away = true; } catch (e) { /* fine */ }
  if (away) { const box = _ghBox(); if (box) _gb2Close(box); }
}
/** The chest's prompt: any thing of a kind that stores, in reach, in your own garden ("E Open your storage"). */
function gardenB2ActRows(px, py, rows) {
  if (typeof gardenB2HandRows === 'function') { const own = gardenB2HandRows(); if (own) return own; }   // something in your hands: the prompt is only about where it goes (94-garden-zz-8build2-hands.js)
  if (typeof gardenB2LandRows === 'function') { const own = gardenB2LandRows(px, py, rows); if (own) return own; }   // laying a path or a bed, the stakes, the spade on a path (94-garden-zz-8build2-land.js)
  if (gardenB2On() && typeof gardenB2HandPickRows === 'function') { let t = 'hands'; try { t = gardenB2RingTool(); } catch (e) { t = 'hands'; } gardenB2HandPickRows(px, py, rows, t); }
  if (typeof gardenMuseumActRows === 'function') gardenMuseumActRows(px, py, rows);   // any museum's door, yours or a friend's (94-garden-build2-3museum.js)
  if (!gardenB2On() || typeof gardenAffordThings !== 'function') return;
  let m = null; try { m = gardenHere(); } catch (e) { return; }
  if (!m || m.visit) return;   // (a friend's chest is theirs: a shared chest is for later)
  for (const t of gardenAffordThings()) {
    const K = t.kind && GARDEN_KINDS[t.kind]; if (!K || !K.store) continue;
    if (Math.hypot(t.x - px, (t.y - py) * 1.3) > GA_REACH) continue;
    rows.push({ key: 'b2store:' + t.src + ':' + t.id, act: 'b2-store', b2: (spot) => gardenB2OpenStore(spot.thing), words: 'Open your storage', name: K.name, x: t.x, y: t.y, src: 'b2:' + t.id, promptY: t.y - 1.15, thing: t });
  }
}
/** A chest's bubble opens your storage first (E on a bubble is its first button). */
function gardenB2DecorBubble(d, m, items) {
  if (!gardenB2On() || !d || !d.def || (m && m.visit)) return;
  let k = ''; try { k = gardenKindOf({ decor: d.def.id, id: d.def.id }); } catch (e) { k = ''; }
  if (!k || !GARDEN_KINDS[k] || !GARDEN_KINDS[k].store) return;
  items.push({ ic: 'archive', label: 'Open your storage', cls: 'is-go', run: () => gardenB2OpenStore({ x: d.x + (d.def.w || 1) / 2, y: d.y + (d.def.h || 1) }) });
}
