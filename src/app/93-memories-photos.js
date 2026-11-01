/* ============================================================
   MEMORIES: garden photos (2.32, owner: Memories; the data notes are in 93-memories-core.js). Pictures taken in the garden are kept on THIS computer, in <data>/memories/photos
   (lib/memory-photos.mjs, server/routes/memory-photos.mjs), and shown in the Photos tab. A group photo in a live garden (94-garden-live-7snap.js) lands here for each person who was
   there, each from their own screen: the picture itself is never sent to anyone. A row holds ids and numbers only: `who` the friends who were there and `at` whose garden it was
   (names are read from Friends when a photo is shown), `kind` 'garden' or 'group'.

     memPhotos()                         the rows we know of, newest first
     memPhotosLoad(force)                -> Promise of the rows (asks the server once, then remembers)
     memPhotoKeep(blob, meta)            -> Promise of the row: meta {iso, ts, who: [friend ids], at: friend id | '', kind}. A big picture is shrunk first (at most 1600 px wide, JPEG)
     memPhotoShrink(blob, maxW)          -> Promise of a JPEG blob
     memPhotoUrl(row)                    the picture's address
     memPhotoEl(row)                     one card for the album
   ============================================================ */
const _mph = { items: null, loading: null };
function memPhotos() { return Array.isArray(_mph.items) ? _mph.items : []; }
function memPhotoUrl(row) { return '/api/memories/photo/' + encodeURIComponent(String(row && row.name || '')); }
function memPhotosLoad(force) {
  if (_mph.items && !force) return Promise.resolve(_mph.items);
  if (!_mph.loading) {
    _mph.loading = fetch('/api/memories/photos', { cache: 'no-store' }).then((r) => r.json()).then((j) => {
      _mph.items = j && j.ok && Array.isArray(j.items) ? j.items : [];
      _mph.loading = null;
      return _mph.items;
    }).catch((e) => { _mph.loading = null; throw e; });
  }
  return _mph.loading;
}
function memPhotoShrink(blob, maxW) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob), img = new Image();
    img.onload = () => {
      try {
        const k = Math.min(1, (maxW || 1600) / img.naturalWidth), w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const ctx = c.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
        c.toBlob((b) => { URL.revokeObjectURL(url); if (b) resolve(b); else reject(new Error('No image')); }, 'image/jpeg', 0.84);
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('The picture could not be read')); };
    img.src = url;
  });
}
function _mphDataUrl(blob) {
  return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result || '')); r.onerror = () => reject(new Error('The picture could not be read')); r.readAsDataURL(blob); });
}
async function memPhotoKeep(blob, meta) {
  meta = meta || {};
  const small = await memPhotoShrink(blob, 1600), data = await _mphDataUrl(small);
  const body = { data, iso: meta.iso || todayStr(), ts: meta.ts || Clock.now(), kind: meta.kind === 'group' ? 'group' : 'garden', at: meta.at || '', who: Array.isArray(meta.who) ? meta.who.slice(0, 8) : [] };
  const r = await fetch('/api/memories/photo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  let j = null; try { j = await r.json(); } catch (e) { j = null; }
  if (!r.ok || !j || !j.ok) throw new Error((j && j.error) || 'The photo could not be kept.');
  const items = _mph.items || (_mph.items = []);
  const at = items.findIndex(x => x.id === j.item.id);
  if (at >= 0) items.splice(at, 1);
  items.unshift(j.item);
  try { document.dispatchEvent(new CustomEvent('opendash:memory-photos')); } catch (e) { /* old browser */ }
  return j.item;
}
async function memPhotoRemove(row) {
  const r = await fetch('/api/memories/photo/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id }) });
  if (!r.ok) throw new Error('The photo could not be removed.');
  if (_mph.items) _mph.items = _mph.items.filter(x => x.id !== row.id);
}
/** Who was there, in words: "At Sam's garden, with Alex" (a friend you no longer have is "a friend"). */
function _mphCaption(row) {
  const nm = (id) => { try { const f = typeof _gscFriend === 'function' ? _gscFriend(id) : null; return f && f.status === 'friend' && typeof _gscFirst === 'function' ? _gscFirst(id) : 'a friend'; } catch (e) { return 'a friend'; } };
  const list = (a) => (a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : a[0] || '');
  const who = (row.who || []).filter(id => id !== row.at).map(nm);
  const place = row.at ? `${nm(row.at)}’s garden` : 'My garden';
  return row.kind === 'group' || who.length ? `${place}${who.length ? ', with ' + list(who) : ''}` : place;
}
function memPhotoEl(row) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'mph-card';
  const img = document.createElement('img'); img.className = 'mph-img'; img.loading = 'lazy'; img.alt = _mphCaption(row); img.src = memPhotoUrl(row);
  const cap = document.createElement('span'); cap.className = 'mph-cap';
  const d = document.createElement('b'); d.textContent = _memFmt(row.iso, { day: 'numeric', month: 'short', year: 'numeric' });
  const w = document.createElement('span'); w.className = 'subtle'; w.textContent = _mphCaption(row);
  cap.append(d, w); b.append(img, cap);
  b.onclick = () => memPhotoOpen(row);
  return b;
}
function memPhotoOpen(row) {
  openDialog({
    title: _memFmt(row.iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), width: 900, resizeKey: 'mem-photo',
    body(el) {
      el.classList.add('mph-open');
      const img = document.createElement('img'); img.className = 'mph-big'; img.alt = _mphCaption(row); img.src = memPhotoUrl(row);
      const p = document.createElement('p'); p.className = 'muted'; p.textContent = _mphCaption(row);
      el.append(img, p);
    },
    actions: [
      { label: 'Remove', danger: true, run: () => { confirmDialog({ title: 'Remove this photo?', text: 'It is deleted from this computer. Nobody else has a copy of it from you.', confirmLabel: 'Remove', danger: true }).then((ok) => { if (!ok) return; memPhotoRemove(row).then(() => { toast('Photo removed', { icon: 'trash-2' }); if (typeof render === 'function') render(); }).catch((e) => toastError('remove the photo', e)); }); return false; } },
      { label: 'Save a copy', run: () => { const a = document.createElement('a'); a.href = memPhotoUrl(row); a.download = 'garden-' + row.iso + '.' + (row.name.split('.').pop() || 'jpg'); document.body.appendChild(a); a.click(); a.remove(); return false; } },
      { label: 'Close', primary: true, run: () => {} },
    ],
  });
}
/** The Photos tab of the Memories page. */
function _mpPhotos(outer) {
  const body = document.createElement('div'); body.className = 'mph-tab';
  outer.appendChild(body);
  const paint = (items) => {
    body.replaceChildren();
    if (!items.length) {
      body.appendChild(emptyLine('Photos from the garden are kept here. Take one in photo mode, or ask for a group photo when friends are in your garden.', { label: 'Open the garden', run: () => setView('garden') }));
      return;
    }
    body.appendChild(pagedList({ items, pageSize: 24, cls: 'mph-grid', render: memPhotoEl }));
  };
  if (_mph.items) paint(_mph.items);
  else { body.appendChild(emptyLine('Looking for your photos…')); memPhotosLoad().then(paint).catch(() => { body.replaceChildren(emptyLine('The photos could not be loaded just now.')); }); }
}
