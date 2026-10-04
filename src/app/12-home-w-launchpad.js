/* ============================================================
   HOME widget "launchpad": Launchpad (WIDGETS_CATALOGUE.md 3.13).
   OWNER: the "launchpad" widget builder (Phase 1, wave 1). Styles:
   13-home-w-launchpad.css. Pure rules: 12-home-launchpad-logic.js (lp*).
   The id, sizes, defaultSize, defaultHidden, group, multi and aliases are
   mirrored in lib/home-topbar.mjs HOME_WIDGETS and the settings keys in
   HOME_WIDGET_PREFS (tests compare them).

   The folders, files, links and snippets the user opens every day, one click
   away. The items are the PINNED resources of Files & links (state.resources,
   63-resources.js), in the order the user dragged them (prefs.order; new pins
   go at the end). Nothing new is stored: pinning is the resource's own flag.

     S     6 tiles (icon + short label), "+N" for the rest, and "+" (add)
     M     12: tiles, then the snippets as chips with a copy icon
     L     every pin, grouped by its stream (streamMarkHtml), then Other
     Full  L, plus "Recently added": the newest 6 unpinned, each with Pin

   Click: a folder or file opens on this computer (resOpen; a program is only
   shown in its folder), a link opens in a new tab, a snippet is copied. On a
   phone a local path is copied instead. A second press while it opens does nothing.
   Menu (right-click, hold, the Menu key or Shift+F10): Open, Explore, Reveal,
   Copy path / link / snippet, Move earlier / later, Unpin (Undo).
   Keys: one Tab stop; arrows move, Home / End, 1-9 open the nth tile, Alt+arrows
   move the tile, Enter / Space open it.
   "+": the Files & links editors (paste, Browse, snippet) with the new item pinned,
   or "Something already saved…" (the pin picker).
   Recommendations (the user's rule, 3 Oct): a suggested pin ("Pin from Files" in
   the empty state, Full's "Recently added", a link or path dropped on the widget)
   opens the normal editor filled in (the pin picker with it ticked, or the Attach
   dialog with the dropped lines); the small check pins it as it is, with Undo.
   Drag a tile to reorder (one undo step). Tiles fade in once per entry; new ones
   rise in; reordering glides (FLIP); reduced motion is instant.
   ============================================================ */
let _lpDrop = null;              // a drop waiting for the user: {items, rejected}
let _lpFocusKey = null;          // the roving Tab stop ('r:<id>', 'add', 'more')
let _lpLast = { key: '', at: 0 };  // the last press (a second one while it opens does nothing)
let _lpExploreTimer = 0;

registerHomeWidget({
  id: 'launchpad', title: 'Launchpad', icon: 'rocket', order: 220, group: 'files',
  description: 'Folders, links and snippets you open every day, one click away',
  sizes: ['s', 'm', 'l', 'full'], defaultSize: 's', defaultHidden: true, fresh: true,
  aliases: ['launcher', 'pinned', 'shortcuts', 'favourites', 'favorites', 'bookmarks', 'snippets'],
  defaults: { order: [], labels: true, groupByStream: true },
  emptyHint: 'Pin folders, links and snippets you open every day',
  available: () => true,
  sample: (kit) => ({ resources: (kit.resources || []).map((r, i) => Object.assign({}, r, { pinned: true, links: [], createdAt: i + 1 })) }),
  render(el, ctx) { return _lpRender(el, ctx || {}); },
  settings(anchor, ctx) {
    homeSettingsMenu(anchor, ctx, [
      { key: 'labels', label: 'Show labels', type: 'toggle', hint: 'Off: icons only, so more fit' },
      { key: 'groupByStream', label: 'Group by stream', type: 'toggle', hint: 'Large and full width' },
    ], { foot: 'Pin things with + or from Files & links; right-click a tile to unpin it.' });
  },
  unmount() { _lpDrop = null; clearInterval(_lpExploreTimer); _lpExploreTimer = 0; },
});

/* ---------- data ---------- */
function _lpResources(ctx) {
  if (ctx.preview) { const s = homeSample('launchpad'); return (s && s.resources) || []; }
  return typeof resList === 'function' ? resList() : [];
}
function _lpPhone() {
  try { return !!(window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches); } catch (e) { return false; }
}
function _lpStreamOf(r) {
  return lpStreamOf(r, {
    streams: typeof STREAMS !== 'undefined' ? STREAMS : null,
    taskStream: (id) => { const t = typeof getItem === 'function' ? getItem(id) : null; return t ? effStream(t) : ''; },
  });
}
function _lpShort(r) {
  if (!r) return '';
  if (r.kind === 'snippet') return String(r.target || '').split('\n').find(x => x.trim()) || '';
  if (LP_PATH_KINDS.includes(r.kind)) return String(r.target || '');
  return String(r.target || '').replace(/^https?:\/\/(www\.)?/, '');
}
function _lpTip(r, labels) {
  const what = rsrcKindLabel(r) + (_lpShort(r) ? ' · ' + _lpShort(r).slice(0, 90) : '');
  return labels ? what : `${rsrcDisplayLabel(r)} · ${what}`;
}
/** The pinned ids as shown now (the order a change starts from). */
function _lpShownIds() { return lpPinned(resList(), homePrefs('launchpad').order).map(r => r.id); }
/** Save the resources just changed together with the widget's order: one undo step, a toast with Undo. */
function _lpSave(order, msg) {
  const wp = Object.assign({}, homeState().widgetPrefs || {});
  let o = order.slice();
  // The 4 KB limit per widget (the platform's): the oldest saved places go first.
  while (o.length && JSON.stringify(Object.assign({}, wp.launchpad || {}, { order: o })).length > 3800) o = o.slice(1);
  wp.launchpad = Object.assign({}, wp.launchpad || {}, { order: o });
  homeUpdate({ widgetPrefs: wp }, null);                       // = saveData (one step) + render
  if (msg) toast(msg, { kind: 'ok', icon: 'pin', action: { label: 'Undo', run: () => undo() } });
}

/* ---------- writes (each one undo step) ---------- */
/** Pin saved resources (a suggestion's check, the picker): at the end of the order. */
function lpPinIds(ids) {
  const want = (ids || []).map(String);
  const shown = _lpShownIds();
  const hit = want.map(id => resGet(id)).filter(Boolean);
  const fresh = hit.filter(r => !r.pinned);
  if (!fresh.length) { toast(hit.length ? 'Already pinned' : 'That is not saved any more', { icon: 'pin' }); return false; }
  for (const r of fresh) r.pinned = true;
  _lpSave(lpOrderWith(shown, fresh.map(r => r.id)), fresh.length === 1 ? `Pinned "${rsrcDisplayLabel(fresh[0])}"` : `Pinned ${fresh.length}`);
  if (typeof homeAnnounce === 'function') homeAnnounce(fresh.length === 1 ? `Pinned ${rsrcDisplayLabel(fresh[0])}` : `Pinned ${fresh.length} items`);
  return true;
}
/** Pin detected items (a drop's check): new ones are saved, saved ones are pinned. */
function lpPinItems(items) {
  const list = resList();
  const shown = _lpShownIds();
  const ids = [];
  let n = 0;
  for (const it of items || []) {
    const same = rsrcFindSame(list, it.kind, it.target);
    if (same) { if (!same.pinned) { same.pinned = true; n++; } ids.push(same.id); continue; }
    let r;
    try { r = rsrcNormalize(Object.assign({}, it, { pinned: true, links: [] })); } catch (e) { toast(e.message || 'That cannot be pinned', { kind: 'err' }); continue; }
    while (list.some(x => x.id === r.id)) r.id += 'x';
    list.push(r); ids.push(r.id); n++;
  }
  if (!n) { toast(ids.length ? 'Already pinned' : 'Nothing to pin', { icon: 'pin' }); return false; }
  const first = resGet(ids[0]);
  _lpSave(lpOrderWith(shown, ids), n === 1 && first ? `Pinned "${rsrcDisplayLabel(first)}"` : `Pinned ${n}`);
  if (typeof resRefreshStatus === 'function') resRefreshStatus(ids, true);
  return true;
}
function _lpUnpin(id) {
  const r = resGet(id);
  if (!r || !r.pinned) return;
  r.pinned = false;
  _lpSave(lpOrderWithout(_lpShownIds(), [id]), `Unpinned "${rsrcDisplayLabel(r)}"`);
  if (typeof homeAnnounce === 'function') homeAnnounce(`Unpinned ${rsrcDisplayLabel(r)}`);
}
/** Move a tile one step (the menu, Alt+arrows) within its own row of kind (tiles or chips). */
function _lpMoveBy(ctx, id, dir, scope) {
  const next = lpMove(_lpShownIds(), id, dir, scope);
  if (!next) return false;
  _lpFocusKey = 'r:' + id;
  homeSetPrefs(ctx || 'launchpad', { order: lpOrderWith(next, []) });
  if (typeof homeAnnounce === 'function') { const r = resGet(id); homeAnnounce(`${r ? rsrcDisplayLabel(r) : 'Tile'} moved ${dir < 0 ? 'earlier' : 'later'}`); }
  return true;
}

/* ---------- what a press does ---------- */
function _lpActivate(r, el) {
  if (!r) return;
  const key = 'r:' + r.id;
  const now = Date.now();
  if (_lpLast.key === key && now - _lpLast.at < 1200) return;      // a second press while it opens does nothing
  _lpLast = { key, at: now };
  const a = lpClick(r, { phone: _lpPhone() });
  if (a.act === 'open') return resOpen(r.id);
  if (a.act === 'reveal') return resOpen(r.id, { reveal: true });
  if (a.act === 'url') return resOpenUrl(r);
  if (a.act === 'copy') return resCopyText(a.text, 'Copied');
  if (a.act === 'copy-path') return resCopyText(a.text, 'Path copied');
  if (el) toast('That cannot be opened', { kind: 'err' });
}
function _lpExplore(r) {
  if (typeof _resExplore !== 'undefined' && _resExplore && _resExplore.id === r.id) return;   // already open: no-op
  openExplorePanel(r.id);
  // The tile is the current one while its folder is open in Explore.
  clearInterval(_lpExploreTimer);
  const mark = () => {
    const open = typeof _resExplore !== 'undefined' && _resExplore && _resExplore.id === r.id;
    for (const t of document.querySelectorAll('#main-body .lp [data-lp]')) {
      if (open && t.dataset.lp === r.id) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
    }
    if (!open) { clearInterval(_lpExploreTimer); _lpExploreTimer = 0; }
  };
  mark();
  _lpExploreTimer = setInterval(mark, 400);
}
function _lpMenuItems(r, ctx, scope) {
  const phone = _lpPhone();
  const a = lpClick(r, { phone });
  const isPath = LP_PATH_KINDS.includes(r.kind);
  const exec = r.kind === 'file' && rsrcIsExecutable(r.target);
  const items = [];
  if (isPath) {
    items.push({ label: exec ? 'Open (programs are not opened)' : 'Open', icon: r.kind === 'folder' ? 'folder-open' : 'external-link', disabled: exec, run: () => resOpen(r.id) });
    if (r.kind === 'folder') items.push({ label: 'Explore', icon: 'folder-search', hint: 'here', run: () => _lpExplore(r) });
    items.push({ label: 'Reveal in folder', icon: 'folder-search', run: () => resOpen(r.id, { reveal: true }) });
  } else if (LP_URL_KINDS.includes(r.kind)) {
    items.push({ label: 'Open in a new tab', icon: 'external-link', disabled: a.act === 'none', run: () => resOpenUrl(r) });
  }
  items.push('sep');
  if (isPath) items.push({ label: 'Copy path', icon: 'copy', run: () => resCopyText(r.target, 'Path copied') });
  else if (r.kind === 'snippet') items.push({ label: 'Copy snippet', icon: 'copy', run: () => resCopyText(r.target, 'Copied') });
  else items.push({ label: 'Copy link', icon: 'link', run: () => resCopyText(rsrcLinkOf(r), 'Link copied') });
  const among = scope || [];
  const i = among.indexOf(r.id);
  if (among.length > 1) {
    items.push('sep',
      { label: 'Move earlier', icon: 'arrow-left', kbd: 'Alt+←', disabled: i <= 0, run: () => _lpMoveBy(ctx, r.id, -1, among) },
      { label: 'Move later', icon: 'arrow-right', kbd: 'Alt+→', disabled: i < 0 || i >= among.length - 1, run: () => _lpMoveBy(ctx, r.id, 1, among) });
  }
  items.push('sep', { label: 'Unpin', icon: 'pin-off', run: () => _lpUnpin(r.id) });
  return items;
}
function _lpOpenMenu(tile, ctx) {
  const r = resGet(tile && tile.dataset.lp);
  if (!r) return;
  const scope = [...(tile.parentElement || tile).querySelectorAll(':scope > [data-lp]')].map(x => x.dataset.lp);
  openMenu(tile, _lpMenuItems(r, ctx, scope), { align: 'start', width: 240 });
}
function _lpAddMenu(anchor) {
  const saved = lpSuggest(resList(), 200).length;
  const picker = typeof _resIntegrations === 'undefined' || !_resIntegrations || _resIntegrations.picker !== false;
  const items = [{ label: 'Paste a path or link…', icon: 'clipboard', run: () => openAttachDialog({ links: [], pinned: true }) }];
  if (picker) {
    items.push({ label: 'Browse for a file…', icon: 'file', run: () => resBrowse('file', [], { pinned: true }) });
    items.push({ label: 'Browse for a folder…', icon: 'folder', run: () => resBrowse('folder', [], { pinned: true }) });
  }
  items.push({ label: 'Code snippet…', icon: 'square-code', run: () => openAttachDialog({ links: [], pinned: true, mode: 'snippet' }) });
  if (saved) items.push('sep', { label: 'Something already saved…', icon: 'paperclip', hint: String(saved), run: () => lpOpenPicker([]) });
  openMenu(anchor, items, { align: 'end', width: 260 });
  if (typeof resIntegrations === 'function') resIntegrations();
}
function _lpMoreMenu(anchor, rest) {
  const items = rest.slice(0, 30).map(r => ({ label: rsrcDisplayLabel(r), icon: rsrcIcon(r), hint: lpVerb(r, { phone: _lpPhone() }), run: () => _lpActivate(r, anchor) }));
  if (rest.length > 30) items.push({ label: `${rest.length - 30} more in Files & links`, icon: 'paperclip', run: () => setView('files') });
  items.push('sep', { label: 'All files & links', icon: 'paperclip', run: () => setView('files') });
  openMenu(anchor, items, { align: 'end', width: 260 });
}
/**
 * The pin picker: the Launchpad's editor for what is pinned. Every saved, unpinned
 * resource (the most linked first); `preset` ticked; "Pin selected" pins them (one step).
 */
function lpOpenPicker(preset) {
  const all = lpSuggest(resList(), 200);
  if (!all.length) { toast('Everything saved is already pinned', { icon: 'pin' }); return; }
  const want = new Set((preset || []).map(String));
  const store = { on: new Set(all.filter(r => want.has(r.id)).map(r => r.id)), seen: new Set(all.map(r => r.id)), done: new Set(), errors: new Map() };
  openDialog({
    title: 'Pin to Launchpad', width: 560,
    body: (el, close) => {
      const p = document.createElement('p'); p.className = 'muted lp-pk-intro';
      p.textContent = 'What you tick goes on Launchpad, at the end. The most linked come first.';
      el.appendChild(p);
      let q = null;
      if (all.length > 8) {
        const f = document.createElement('label'); f.className = 'input lp-pk-q'; f.innerHTML = icon('search');
        q = document.createElement('input'); q.type = 'search'; q.placeholder = 'Filter by name, path or link'; q.setAttribute('aria-label', 'Filter');
        f.appendChild(q); el.appendChild(f);
      }
      const list = document.createElement('div'); list.className = 'lp-pk';
      for (const r of all) {
        const row = document.createElement('div'); row.className = 'lp-pk-row'; row.dataset.selId = r.id;
        const n = Array.isArray(r.links) ? r.links.length : 0;
        row.setAttribute('aria-label', rsrcDisplayLabel(r));
        row.innerHTML = `<span class="res-ic k-${escAttr(r.kind)}">${icon(rsrcIcon(r))}</span><span class="lp-pk-t"><span class="lp-pk-n">${esc(rsrcDisplayLabel(r))}</span>`
          + `<span class="lp-pk-s">${esc(rsrcKindLabel(r))}${n ? ` · linked to ${n}` : ''}</span></span>`;
        list.appendChild(row);
      }
      el.appendChild(list);
      selectList(list, {
        store, rows: '.lp-pk-row', label: 'Saved files and links', rowClick: true, compact: true, defaultOn: false,
        apply: { label: 'Pin selected', icon: 'pin', run: (ids) => { close(); lpPinIds(ids); return { done: ids }; } },
      });
      if (q) {
        q.oninput = () => {
          const v = q.value.trim();
          for (const row of list.querySelectorAll('.lp-pk-row')) {
            const r = all.find(x => x.id === row.dataset.selId);
            row.hidden = !!v && !rsrcFilter([r], { q: v }).length;
          }
        };
        q.onkeydown = (e) => e.stopPropagation();
      }
      setTimeout(() => {
        const first = list.querySelector('.lp-pk-row.is-on .sel-cbx') || q || list.querySelector('.sel-cbx');
        if (first) try { first.focus({ preventScroll: true }); } catch (e) { /* gone */ }
      }, 0);
    },
  });
}

/* ---------- drop a link or path on the widget ---------- */
function _lpDragOk(e) {
  const t = e.dataTransfer && e.dataTransfer.types ? [...e.dataTransfer.types] : [];
  return t.includes('text/uri-list') || t.includes('text/plain') || t.includes('Files');
}
function _lpTakeDrop(dt, ctx) {
  let text = '';
  try { text = (dt.getData('text/uri-list') || '').split(/\r?\n/).filter(l => l && !l.startsWith('#')).join('\n') || dt.getData('text/plain') || ''; } catch (e) { text = ''; }
  if (!text.trim()) {
    if (dt.files && dt.files.length) toast('The browser keeps a dropped file\'s path private: paste the path, or use + then Browse', { kind: 'err' });
    return;
  }
  const d = lpDropItems(text);
  if (!d.items.length) { toast('That is not a path or a link: for text, use + then Code snippet', { kind: 'err' }); return; }
  _lpDrop = d;
  _lpFocusKey = 'drop';
  if (ctx && ctx.rerender) ctx.rerender(); else render();
  const ok = document.querySelector('#main-body .lp .lp-drop .lp-drop-go');
  if (ok) try { ok.focus({ preventScroll: true }); } catch (e) { /* gone */ }
}
function _lpDropStrip(ctx) {
  const d = _lpDrop;
  const box = document.createElement('div'); box.className = 'lp-drop'; box.dataset.flip = 'lp:drop';
  box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Dropped: pin it?');
  const one = d.items.length === 1 ? d.items[0] : null;
  const what = one ? `<b>Pin "${esc(one.label)}"?</b><span>${esc(rsrcKindLabel(Object.assign({ id: '' }, one)))}</span>`
    : `<b>Pin ${d.items.length} items?</b><span>${esc(d.items.slice(0, 3).map(x => x.label).join(', '))}${d.items.length > 3 ? '…' : ''}</span>`;
  box.innerHTML = `<span class="lp-drop-ic">${icon('pin')}</span><span class="lp-drop-t">${what}${d.rejected ? `<small>${d.rejected} line${d.rejected === 1 ? ' was' : 's were'} not a path or link</small>` : ''}</span>`;
  const acts = document.createElement('span'); acts.className = 'lp-drop-acts';
  const go = document.createElement('button'); go.type = 'button'; go.className = 'btn btn-primary btn-sm lp-drop-go';
  go.innerHTML = icon('pin') + '<span>Pin…</span>';
  go.setAttribute('aria-label', 'Review and pin (opens the Attach editor filled in)');
  go.onclick = () => {
    const lines = d.items.map(x => x.target).join('\n');
    _lpDrop = null;
    openAttachDialog({ links: [], pinned: true, text: lines });
    if (ctx.rerender) ctx.rerender();
  };
  const ok = document.createElement('button'); ok.type = 'button'; ok.className = 'btn btn-secondary btn-sm btn-icon lp-ok';
  ok.innerHTML = icon('check'); ok.setAttribute('aria-label', 'Pin it as it is now'); ok.setAttribute('data-tip', 'Pin now · Undo');
  ok.onclick = () => { const items = d.items; _lpDrop = null; if (!lpPinItems(items) && ctx.rerender) ctx.rerender(); };
  const x = document.createElement('button'); x.type = 'button'; x.className = 'btn-icon btn-sm lp-drop-x';
  x.innerHTML = icon('x'); x.setAttribute('aria-label', 'Do not pin it');
  x.onclick = () => { _lpDrop = null; if (ctx.rerender) ctx.rerender(); };
  acts.append(go, ok, x);
  box.appendChild(acts);
  return box;
}

/* ---------- render ---------- */
function _lpRender(el, ctx) {
  const size = ctx.size || 's';
  const prefs = ctx.prefs || homePrefs(ctx);
  const labels = prefs.labels !== false;
  const list = _lpResources(ctx);
  const items = lpPinned(list, prefs.order);
  const card = document.createElement('section');
  card.className = `card home-card lp lp--${size}${labels ? '' : ' is-iconic'}`;
  const head = document.createElement('div'); head.className = 'card-h lp-h';
  head.innerHTML = `${icon('rocket')}<h3>Launchpad</h3>${items.length ? `<span class="n num">${esc(items.length)}</span>` : ''}<span class="spacer"></span>`
    + (items.length ? `<span class="lp-help" aria-hidden="true" data-tip="1–9 open a tile · arrows move · right-click or hold for more · drag to reorder · drop a link or path here to pin it">${icon('keyboard')}</span>` : '');
  card.appendChild(head);
  const body = document.createElement('div'); body.className = 'card-b lp-b';
  card.appendChild(body);
  el.appendChild(card);
  if (!ctx.preview) _lpBind(card, ctx);
  if (_lpDrop && !ctx.preview) body.appendChild(_lpDropStrip(ctx));

  if (!items.length) {
    body.appendChild(_lpEmpty(ctx, list, size));
    _lpEnter(body, ctx);
    return true;
  }
  const lay = lpLayout(items, size, { groupByStream: prefs.groupByStream !== false, streamOf: _lpStreamOf, streams: typeof STREAMS !== 'undefined' ? STREAMS : {} });
  const wrap = document.createElement('div'); wrap.className = 'lp-items';
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', `Launchpad, ${items.length} pinned. Arrow keys move, 1 to 9 open a tile, the Menu key shows more.`);
  body.appendChild(wrap);
  const phone = _lpPhone();
  let num = 0;
  // Grouped: the groups flow side by side (a group's share of the row grows with its tiles).
  wrap.classList.toggle('is-grouped', lay.groups.some(g => g.stream != null));
  lay.groups.forEach((g, gi) => {
    const sec = document.createElement('div'); sec.className = 'lp-group'; sec.dataset.flip = 'lpg:' + (g.stream == null ? '*' : g.stream || '-');
    sec.style.setProperty('--n', String(Math.max(1, Math.min(6, g.tiles.length + (gi === lay.groups.length - 1 ? 1 : 0) + Math.ceil(g.chips.length / 2)))));
    if (g.stream != null) {
      const s = typeof STREAMS !== 'undefined' ? STREAMS[g.stream] : null;
      const n = g.tiles.length + g.chips.length;
      sec.insertAdjacentHTML('beforeend', `<div class="lp-gh" data-flip="lpgh:${escAttr(g.stream || '-')}">${g.stream ? streamMarkHtml(g.stream) : icon('layout-grid', 'i-xs')}<span>${esc(g.stream ? ((s && s.label) || g.stream) : 'Other')}</span><span class="lp-gn num">${esc(n)}</span></div>`);
    }
    const last = gi === lay.groups.length - 1;
    const grid = document.createElement('div'); grid.className = 'lp-grid';
    for (const r of g.tiles) grid.appendChild(_lpTile(r, { labels, phone, n: ++num }));
    if (last) {
      if (lay.more.length) {
        const m = document.createElement('button'); m.type = 'button'; m.className = 'lp-tile lp-more'; m.dataset.lpAct = 'more'; m.dataset.flip = 'lp:more';
        m.setAttribute('aria-label', `${lay.more.length} more pinned`); m.setAttribute('aria-haspopup', 'menu');
        m.innerHTML = `<span class="lp-ic"><b class="num">+${esc(lay.more.length)}</b></span>${labels ? '<span class="lp-l">More</span>' : ''}`;
        grid.appendChild(m);
      }
      grid.appendChild(_lpAddTile(labels));
    }
    if (grid.children.length) sec.appendChild(grid);
    if (g.chips.length) {
      const chips = document.createElement('div'); chips.className = 'lp-chips';
      for (const r of g.chips) chips.appendChild(_lpChip(r, ++num));
      sec.appendChild(chips);
    }
    wrap.appendChild(sec);
    if (!ctx.preview && !ctx.editing) {
      if (g.tiles.length > 1) ctx.sortable(grid, { items: '.lp-tile[data-lp]', axis: 'grid', idOf: (x) => x.dataset.lp, onReorder: (ids, moved) => _lpReordered(ctx, ids, moved) });
      const chipsEl = sec.querySelector('.lp-chips');
      if (chipsEl && g.chips.length > 1) ctx.sortable(chipsEl, { items: '.lp-chip[data-lp]', axis: 'x', idOf: (x) => x.dataset.lp, onReorder: (ids, moved) => _lpReordered(ctx, ids, moved) });
    }
  });
  // Numbers 1-9 on the first nine (shown while the keyboard is in the widget).
  for (const t of [...wrap.querySelectorAll('[data-lp]')].slice(9)) { const k = t.querySelector('.lp-k'); if (k) k.remove(); }
  _lpRoving(wrap);
  wrap._lpMore = lay.more;
  if (size === 'full' && !ctx.preview) {
    const recent = lpRecent(list, 6);
    if (recent.length) body.appendChild(_lpSuggestBlock(recent, { title: 'Recently added', hint: 'Newest first' }));
  }
  if (!ctx.preview) {
    if (typeof resRefreshStatus === 'function') resRefreshStatus(items.slice(0, 60).filter(r => LP_PATH_KINDS.includes(r.kind)).map(r => r.id));
    if (size !== 's') homeSuggestSlot(body, ctx);
  }
  _lpEnter(body, ctx);
  return true;
}
function _lpReordered(ctx, ids, moved) {
  const full = _lpShownIds();
  const next = lpSplice(full, ids);
  if (JSON.stringify(next) === JSON.stringify(full)) return;
  _lpFocusKey = moved ? 'r:' + moved : _lpFocusKey;
  homeSetPrefs(ctx, { order: lpOrderWith(next, []) });
  if (typeof homeAnnounce === 'function') { const r = resGet(moved); homeAnnounce(`${r ? rsrcDisplayLabel(r) : 'Tile'} moved`); }
}
/** A label that may break after / \ _ . (repo, folder and site names) rather than mid-word. */
function _lpBreakable(s) { return esc(String(s || '')).replace(/([/\\_]|\.(?=[A-Za-z]))/g, '$1<wbr>'); }
function _lpMissing(r) {
  const st = typeof _resStatus !== 'undefined' ? _resStatus[r.id] : null;
  return !!(st && !st.unknown && st.exists === false);
}
function _lpTile(r, o) {
  const b = document.createElement('button'); b.type = 'button';
  const g = r.kind === 'github' ? rsrcGithub(r.target) : null;
  b.className = 'lp-tile k-' + r.kind + (_lpMissing(r) ? ' is-missing' : '');
  b.dataset.lp = r.id; b.dataset.rid = r.id; b.dataset.flip = 'lp:' + r.id; b.dataset.sceneKey = 'lp:' + r.id;
  b.setAttribute('aria-label', lpAriaLabel(r, { phone: o.phone }));
  b.setAttribute('data-tip', _lpTip(r, o.labels));
  if (typeof _resExplore !== 'undefined' && _resExplore && _resExplore.id === r.id) b.setAttribute('aria-current', 'true');   // open in Explore
  b.innerHTML = `<span class="lp-ic res-ic k-${escAttr(r.kind)}${g ? ' g-' + escAttr(g.type) : ''}">${icon(rsrcIcon(r))}<span class="res-missing lp-miss" ${_lpMissing(r) ? '' : 'hidden'}></span></span>`
    + (o.labels ? `<span class="lp-l">${_lpBreakable(rsrcDisplayLabel(r))}</span>` : '')
    + (o.n <= 9 ? `<span class="lp-k num" aria-hidden="true">${o.n}</span>` : '');
  return b;
}
function _lpChip(r, n) {
  const b = document.createElement('button'); b.type = 'button';
  b.className = 'lp-chip k-snippet';
  b.dataset.lp = r.id; b.dataset.flip = 'lp:' + r.id;
  b.setAttribute('aria-label', lpAriaLabel(r));
  b.setAttribute('data-tip', 'Copy · ' + _lpShort(r).slice(0, 90));
  b.innerHTML = `${icon('square-code', 'i-lpchip')}<span class="lp-chip-l">${esc(rsrcDisplayLabel(r))}</span>${icon('copy', 'i-lpcopy')}`
    + (n <= 9 ? `<span class="lp-k num" aria-hidden="true">${n}</span>` : '');
  return b;
}
function _lpAddTile(labels) {
  const a = document.createElement('button'); a.type = 'button'; a.className = 'lp-tile lp-add'; a.dataset.lpAct = 'add'; a.dataset.flip = 'lp:add';
  a.setAttribute('aria-label', 'Pin something: a folder, file, link or snippet'); a.setAttribute('aria-haspopup', 'menu');
  a.setAttribute('data-tip', 'Pin a folder, file, link or snippet');
  a.innerHTML = `<span class="lp-ic">${icon('plus')}</span>${labels ? '<span class="lp-l">Add</span>' : ''}`;
  return a;
}
/** Suggested pins: the main press opens the pin picker with it ticked; the check pins it now. */
function _lpSuggestBlock(rows, o) {
  const box = document.createElement('div'); box.className = 'lp-sug';
  box.innerHTML = `<div class="lp-sug-h"><span class="hgl-ovl">${esc(o.title)}</span>${o.hint ? `<span class="lp-sug-hint">${esc(o.hint)}</span>` : ''}</div>`;
  const listEl = document.createElement('div'); listEl.className = 'lp-sug-list';
  box.appendChild(listEl);
  for (const r of rows) {
    const row = document.createElement('div'); row.className = 'lp-sug-row'; row.dataset.flip = 'lps:' + r.id;
    const n = Array.isArray(r.links) ? r.links.length : 0;
    const main = document.createElement('button'); main.type = 'button'; main.className = 'lp-sug-main'; main.dataset.lpAct = 'pick'; main.dataset.id = r.id;
    main.setAttribute('aria-label', `Pin ${rsrcDisplayLabel(r)}: choose what to pin, with it ticked`);
    main.setAttribute('data-tip', 'Choose what to pin (this one ticked)');
    main.innerHTML = `<span class="res-ic k-${escAttr(r.kind)}">${icon(rsrcIcon(r))}</span><span class="lp-sug-t"><span class="lp-sug-n">${esc(rsrcDisplayLabel(r))}</span>`
      + `<span class="lp-sug-s">${esc(rsrcKindLabel(r))}${n ? ` · linked to ${n}` : ''}</span></span>`;
    const ok = document.createElement('button'); ok.type = 'button'; ok.className = 'btn btn-secondary btn-sm btn-icon lp-ok'; ok.dataset.lpAct = 'pin'; ok.dataset.id = r.id;
    ok.innerHTML = icon('check'); ok.setAttribute('aria-label', `Pin ${rsrcDisplayLabel(r)} now`); ok.setAttribute('data-tip', 'Pin now · Undo');
    row.append(main, ok);
    listEl.appendChild(row);
  }
  return box;
}
function _lpEmpty(ctx, list, size) {
  const sug = ctx.preview ? [] : lpSuggest(list, size === 's' ? 4 : 6);
  const box = document.createElement('div'); box.className = 'lp-empty' + (sug.length ? ' has-sug' : '');
  const lead = document.createElement('div'); lead.className = 'lp-empty-lead';
  lead.innerHTML = `${sug.length ? `<span class="lp-empty-ic">${icon('rocket')}</span>` : hglScene('work', { size: 'lg', hover: true }) || `<span class="lp-empty-ic">${icon('rocket')}</span>`}`
    + `<div class="lp-empty-t"><b>Pin folders, links and snippets you open every day</b>${sug.length ? '' : '<span>Then they are one click away: a folder opens on this computer, a link in a new tab, a snippet is copied.</span>'}</div>`;
  const add = document.createElement('button'); add.type = 'button'; add.className = 'btn btn-sm ' + (sug.length ? 'btn-secondary' : 'btn-primary') + ' lp-empty-add';
  add.dataset.lpAct = 'add'; add.setAttribute('aria-haspopup', 'menu');
  add.innerHTML = icon('plus') + '<span>Add</span>';
  lead.appendChild(add);
  box.appendChild(lead);
  if (sug.length) {
    const blk = _lpSuggestBlock(sug, { title: 'Pin from Files', hint: 'Most linked' });
    const all = lpSuggest(list, 200).length;
    const more = document.createElement('button'); more.type = 'button'; more.className = 'btn btn-ghost btn-sm lp-sug-more'; more.dataset.lpAct = 'picker';
    more.innerHTML = `<span>${all > sug.length ? `Choose from all ${all}…` : 'Choose several…'}</span>`;
    blk.appendChild(more);
    box.appendChild(blk);
  }
  return box;
}
/* Once per entry: the tiles fade in, 25 ms apart (at most 12); later, only new ones rise in. */
function _lpEnter(body, ctx) {
  const els = [...body.querySelectorAll('[data-lp], .lp-add, .lp-more, .lp-sug-row')];
  if (ctx.preview) return;
  if (ctx.firstPaint) {
    ctx.enterNew(els, (x) => x.dataset.flip);                    // remember them (nothing plays on a first paint)
    if (!window.Motion || Motion.prefersReduced() || document.hidden) return;
    els.slice(0, 12).forEach((x, i) => Motion.animate(x, [{ opacity: 0, transform: 'scale(0.94)' }, { opacity: 1, transform: 'none' }],
      { duration: 240, delay: 120 + i * 25, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }));
  } else ctx.enterNew(els, (x) => x.dataset.flip);
  if (typeof animActivate === 'function') requestAnimationFrame(() => { if (body.isConnected) animActivate(body); });
}

/* ---------- keyboard, pointer, drop ---------- */
function _lpNav(wrap) { return [...wrap.querySelectorAll('[data-lp], [data-lp-act="more"], [data-lp-act="add"]')]; }
function _lpKeyOf(x) { return x.dataset.lp ? 'r:' + x.dataset.lp : x.dataset.lpAct; }
/** One Tab stop for the whole grid: the remembered item, else the first. */
function _lpRoving(wrap) {
  const nav = _lpNav(wrap);
  const cur = nav.find(x => _lpKeyOf(x) === _lpFocusKey) || nav[0];
  for (const x of nav) x.tabIndex = x === cur ? 0 : -1;
}
function _lpFocus(wrap, x) {
  if (!x) return;
  for (const y of _lpNav(wrap)) y.tabIndex = y === x ? 0 : -1;
  _lpFocusKey = _lpKeyOf(x);
  try { x.focus({ preventScroll: false }); } catch (e) { /* gone */ }
}
function _lpBind(card, ctx) {
  card.addEventListener('click', (e) => {
    if (card._lpSwallow) { card._lpSwallow = false; e.preventDefault(); e.stopPropagation(); return; }   // the end of a long press
    const t = e.target.closest('[data-lp], [data-lp-act]');
    if (!t || !card.contains(t)) return;
    if (t.dataset.lp) { _lpActivate(resGet(t.dataset.lp), t); return; }
    const a = t.dataset.lpAct;
    if (a === 'add') _lpAddMenu(t);
    else if (a === 'more') { const w = card.querySelector('.lp-items'); _lpMoreMenu(t, (w && w._lpMore) || []); }
    else if (a === 'pin') lpPinIds([t.dataset.id]);
    else if (a === 'pick') lpOpenPicker([t.dataset.id]);
    else if (a === 'picker') lpOpenPicker(lpSuggest(resList(), 6).map(r => r.id));
  });
  card.addEventListener('contextmenu', (e) => {
    const t = e.target.closest('[data-lp]');
    if (!t || !card.contains(t)) return;
    e.preventDefault();
    clearTimeout(card._lpHold); card._lpHold = 0;
    if (t._popClose) return;                                     // already open (a hold on Android fires this too)
    _lpOpenMenu(t, ctx);
  });
  // Hold a tile (touch): its menu. Moving first is a drag (makeSortable).
  card.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    const t = e.target.closest('[data-lp]');
    if (!t || !card.contains(t)) return;
    const x0 = e.clientX, y0 = e.clientY;
    const stop = () => { clearTimeout(card._lpHold); card._lpHold = 0; window.removeEventListener('pointermove', mv, true); window.removeEventListener('pointerup', stop, true); window.removeEventListener('pointercancel', stop, true); };
    const mv = (ev) => { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 8) stop(); };
    card._lpHold = setTimeout(() => { stop(); if (t.isConnected && !t._popClose) { card._lpSwallow = true; setTimeout(() => { card._lpSwallow = false; }, 700); _lpOpenMenu(t, ctx); } }, 500);
    window.addEventListener('pointermove', mv, true);
    window.addEventListener('pointerup', stop, true);
    window.addEventListener('pointercancel', stop, true);
  });
  card.addEventListener('focusin', (e) => {
    const t = e.target.closest('[data-lp], [data-lp-act="more"], [data-lp-act="add"]');
    const w = t && t.closest('.lp-items');
    if (!w) return;
    _lpFocusKey = _lpKeyOf(t);
    for (const y of _lpNav(w)) y.tabIndex = y === t ? 0 : -1;
  });
  card.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey) return;
    if (e.target && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable)) return;
    const w = card.querySelector('.lp-items');
    // 1-9: the nth tile, from anywhere in the widget.
    if (!e.altKey && !e.shiftKey && /^[1-9]$/.test(e.key) && w) {
      const n = [...w.querySelectorAll('[data-lp]')][Number(e.key) - 1];
      if (n) { e.preventDefault(); e.stopPropagation(); _lpFocus(w, n); _lpActivate(resGet(n.dataset.lp), n); }
      return;
    }
    const t = e.target.closest && e.target.closest('[data-lp], [data-lp-act="more"], [data-lp-act="add"]');
    if (!t || !w || !w.contains(t)) return;
    if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      if (t.dataset.lp) { e.preventDefault(); e.stopPropagation(); _lpOpenMenu(t, ctx); }
      return;
    }
    const arrows = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (!arrows.includes(e.key)) return;
    if (e.altKey) {                                              // Alt+arrows: move the tile
      if (!t.dataset.lp || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
      e.preventDefault(); e.stopPropagation();
      const scope = [...t.parentElement.querySelectorAll(':scope > [data-lp]')].map(x => x.dataset.lp);
      _lpMoveBy(ctx, t.dataset.lp, e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1, scope);
      return;
    }
    if (e.shiftKey) return;
    e.preventDefault(); e.stopPropagation();
    const nav = _lpNav(w);
    const boxes = nav.map(x => { const r = x.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    const j = lpGridMove(boxes, nav.indexOf(t), e.key);
    if (j >= 0 && nav[j] && nav[j] !== t) _lpFocus(w, nav[j]);
  });
  card.addEventListener('dragover', (e) => {
    if (!_lpDragOk(e)) return;
    e.preventDefault();
    try { e.dataTransfer.dropEffect = 'copy'; } catch (x) { /* read-only in some browsers */ }
    card.classList.add('is-drop');
  });
  card.addEventListener('dragleave', (e) => { if (!e.relatedTarget || !card.contains(e.relatedTarget)) card.classList.remove('is-drop'); });
  card.addEventListener('drop', (e) => {
    if (!_lpDragOk(e)) return;
    e.preventDefault();
    card.classList.remove('is-drop');
    _lpTakeDrop(e.dataTransfer, ctx);
  });
}
