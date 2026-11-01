/* ============================================================
   GARDEN, the pager: one set of side arrows for every long list in the garden's panels (the owner, 1 Nov 2026: "show more, x left" should be arrows you click through, no scroll wheel).

     gardenPager(parent, o)          draws one page of o.items into parent, with the arrows under it. Call it again on every repaint: it costs one page, whatever the length of the list.
       key       where you were is kept under this, outside the DOM, so a repaint or closing the panel loses nothing. A filter in the key has its own place.
       sig       optional: when it changes (a new search) the list starts again at page 1
       items     the whole list                draw(item) -> element (only the items on the page are ever drawn)
       grid      the classes of the grid; its columns come from its CSS
       row       the height of a row in px, and rowSm for a small window: the page is as many rows as fit, so nothing needs a scroll wheel
       label     optional: item -> its family or area. The bar says what is on this page ("Flowers to Herbs").
       rows      how many rows when the panel has no fixed height (a page of the app, not a pop-up)
       none      optional: the words for an empty list
     gardenPagerOrder(key, rows, idOf, cmp, sig)   sorts once, then holds the order until the panel is opened again: buying a thing must not move the things beside it
     gardenPagerFresh()              a panel has just opened: sort afresh
     gardenPagerFit()                something above the list changed height (a filter drawer opened)

   Left and right arrow keys turn the page of the pager in the dialog on top, unless you are moving a caret in a box that has words in it.
   Arrows act on the press rather than the release: the garden repaints often, and a repaint between press and release would swallow the click.
   ============================================================ */
const _gpg = { at: new Map(), sig: new Map(), per: new Map(), order: new Map(), session: 0, live: [], ro: null, keys: false, focus: '' };
function gardenPagerFresh() { _gpg.session++; }
function gardenPagerOrder(key, rows, idOf, cmp, sig) {
  const s = sig == null ? '' : String(sig), C = _gpg.order.get(key), list = rows.slice();
  if (C && C.session === _gpg.session && C.sig === s) {
    const pos = (r) => { const p = C.pos.get(idOf(r)); return p == null ? Infinity : p; };
    return list.sort((a, b) => { const x = pos(a), y = pos(b); return x === y ? cmp(a, b) : x - y; });
  }
  list.sort(cmp);
  _gpg.order.set(key, { session: _gpg.session, sig: s, pos: new Map(list.map((r, i) => [idOf(r), i])) });
  return list;
}
function _gpgRow(P) { return window.innerWidth <= 760 && P.o.rowSm ? P.o.rowSm : P.o.row || 150; }
/** The panel that bounds the page, if it has a height of its own. */
function _gpgBox(P) { return P.root.closest('.gpg-box, .modal.is-fixed > .modal-b'); }
function _gpgPages(P) { return Math.max(1, Math.ceil(P.items.length / Math.max(1, P.per))); }
function _gpgPageNow(P) {
  const first = Math.max(0, Math.min(_gpg.at.get(P.key) || 0, Math.max(0, P.items.length - 1)));
  return Math.floor(first / Math.max(1, P.per));
}
function _gpgPaint(P, dir) {
  const n = _gpgPageNow(P), per = Math.max(1, P.per), on = P.items.slice(n * per, (n + 1) * per), frag = document.createDocumentFragment();
  for (const it of on) { const e = P.o.draw(it); if (e) frag.appendChild(e); }
  P.page.replaceChildren(frag);
  if (dir) { P.page.classList.remove('gpg-in-l', 'gpg-in-r'); void P.page.offsetWidth; P.page.classList.add(dir < 0 ? 'gpg-in-l' : 'gpg-in-r'); }
  const pages = _gpgPages(P);
  P.bar.hidden = pages <= 1;
  P.num.textContent = `Page ${n + 1} of ${pages}`;
  if (P.what) {
    const a = on.length ? P.o.label(on[0]) : '', b = on.length ? P.o.label(on[on.length - 1]) : '';
    P.what.textContent = !a && !b ? '' : a === b || !b ? a : !a ? b : `${a} to ${b}`;
  }
  for (const [btn, off] of [[P.prev, n <= 0], [P.next, n >= pages - 1]]) { btn.setAttribute('aria-disabled', off ? 'true' : 'false'); btn.classList.toggle('is-off', off); }
}
function _gpgTurn(P, d) {
  const n = _gpgPageNow(P) + d;
  if (n < 0 || n >= _gpgPages(P)) return false;
  _gpg.at.set(P.key, n * P.per);
  _gpgPaint(P, d);
  return true;
}
/** How many fit: measured against the panel, never against what is on the page, so a short last page and a full one are the same size and the arrows stay under your mouse. */
function _gpgFit(P) {
  if (!P.root.isConnected) return;
  const cs = getComputedStyle(P.page), cols = Math.max(1, (cs.gridTemplateColumns || '').split(' ').filter(Boolean).length), G = parseFloat(cs.rowGap) || 0, row = _gpgRow(P), box = _gpgBox(P);
  let rows = P.o.rows || 3, h = row;
  if (box) {
    const bb = box.getBoundingClientRect(), top = P.page.getBoundingClientRect().top - bb.top - box.clientTop + box.scrollTop, bs = getComputedStyle(box);
    const room = box.clientHeight - top - (parseFloat(bs.paddingBottom) || 0) - 1, bar = 46;
    const fit = (space) => Math.max(1, Math.floor((space + G) / (row + G)));
    rows = fit(room - bar);
    if (P.items.length <= cols * fit(room)) rows = fit(room);   // it all fits with no arrows at all
    const space = P.items.length <= cols * rows ? room : room - bar;
    h = Math.max(row, Math.min(Math.round(row * 1.2), Math.floor((space - (rows - 1) * G) / rows)));   // the spare height goes to the rows, not to a gap under the arrows
  }
  const per = cols * rows, changed = per !== P.per;
  P.page.style.setProperty('--gpg-row', h + 'px');
  P.page.style.minHeight = P.items.length > per ? `${rows * h + (rows - 1) * G}px` : '';
  _gpg.per.set(P.key, per);
  if (changed) { P.per = per; _gpgPaint(P); }
}
function gardenPagerFit() { for (const P of _gpg.live) _gpgFit(P); }
function _gpgKey(ev) {
  if ((ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') || ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
  const t = ev.target, tag = t && t.tagName;
  if (t && (tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable || (tag === 'INPUT' && (t.value || !['text', 'search'].includes(t.type))))) return;
  if (document.querySelector('.pop')) return;
  const live = _gpg.live.filter(P => P.root.isConnected && P.root.offsetParent), modals = document.querySelectorAll('.modal'), top = modals[modals.length - 1];
  const P = live.filter(p => !top || top.contains(p.root)).pop();
  if (!P) return;
  ev.preventDefault(); ev.stopPropagation();
  _gpgTurn(P, ev.key === 'ArrowLeft' ? -1 : 1);
}
function _gpgWatch() {
  _gpg.live = _gpg.live.filter(P => P.root.isConnected);
  if (typeof ResizeObserver === 'undefined') return;
  if (!_gpg.ro) _gpg.ro = new ResizeObserver(() => { requestAnimationFrame(gardenPagerFit); });
  _gpg.ro.disconnect();
  for (const P of _gpg.live) { const b = _gpgBox(P); if (b) _gpg.ro.observe(b); }
}
function _gpgArrow(P, d) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'gpg-arrow ' + (d < 0 ? 'is-prev' : 'is-next');
  b.innerHTML = icon(d < 0 ? 'chevron-left' : 'chevron-right');
  b.setAttribute('aria-label', d < 0 ? 'Previous page' : 'Next page');
  let pressed = false;
  b.addEventListener('pointerdown', (ev) => { if (ev.button !== 0) return; pressed = true; _gpg.focus = P.key + d; _gpgTurn(P, d); });
  b.addEventListener('click', () => { if (pressed) { pressed = false; return; } _gpg.focus = P.key + d; _gpgTurn(P, d); });   // Enter or Space
  return b;
}
function gardenPager(parent, o) {
  const key = String(o.key);
  if (o.sig != null && _gpg.sig.get(key) !== String(o.sig)) { _gpg.sig.set(key, String(o.sig)); _gpg.at.delete(key); }
  const root = document.createElement('div'); root.className = 'gpg' + (o.cls ? ' ' + o.cls : '');
  const page = document.createElement('div'); page.className = 'gpg-page ' + (o.grid || '');
  page.style.setProperty('--gpg-row', (window.innerWidth <= 760 && o.rowSm ? o.rowSm : o.row || 150) + 'px');
  const bar = document.createElement('nav'); bar.className = 'gpg-bar'; bar.setAttribute('aria-label', 'Pages');
  const P = { key, o, items: o.items || [], root, page, bar, per: _gpg.per.get(key) || o.guess || 12 };
  P.prev = _gpgArrow(P, -1); P.next = _gpgArrow(P, 1);
  const mid = document.createElement('div'); mid.className = 'gpg-mid'; mid.setAttribute('aria-live', 'polite');
  P.num = document.createElement('b'); P.num.className = 'gpg-num'; mid.appendChild(P.num);
  if (o.label) { P.what = document.createElement('span'); P.what.className = 'gpg-what'; mid.appendChild(P.what); }
  bar.append(P.prev, mid, P.next);
  root.append(page, bar);
  parent.appendChild(root);
  if (!P.items.length && o.none) { const p = document.createElement('p'); p.className = 'muted gpg-none'; p.textContent = o.none; root.replaceChildren(p); return P; }
  _gpgPaint(P);
  if (_gpg.focus === key + '-1') P.prev.focus({ preventScroll: true }); else if (_gpg.focus === key + '1') P.next.focus({ preventScroll: true });
  _gpg.live.push(P);
  if (!_gpg.keys) { _gpg.keys = true; document.addEventListener('keydown', _gpgKey, true); }
  // (a panel opening is not in the page yet: it is by the time this runs, and before anything is on the screen)
  queueMicrotask(() => { _gpgWatch(); _gpgFit(P); });
  return P;
}
