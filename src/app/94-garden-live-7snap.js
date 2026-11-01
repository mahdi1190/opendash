/* ============================================================
   THE GROUP PHOTO (2.32, docs/dev/GARDEN_TOGETHER.md section 19). Anyone in a live garden can ask for a group photo: `gl:fx snap ask` carries only an id and the cell the frame is
   centred on. Every screen that hears it counts down three seconds ("Sam wants a group photo", with Skip) and then draws the SAME part of the garden itself (the live stage, with
   the people and pets in it, cropped to that frame), and keeps the picture in its own Memories (93-memories-photos.js; the album is on this computer). The picture is never sent:
   nobody receives your copy, and skipping costs nothing. A friend whose app is older than this just does not hear the ask.

     gardenSnapCan()      is anyone here with you, live?
     gardenSnapAsk()      ask for a photo: the countdown starts for you too
     _glsHear(A, ev)      they asked
   ============================================================ */
const _gls = { job: null, mine: 0, heard: new Map(), seen: new Set() };
function gardenSnapCan() {
  try { return _gll.role === 'visit' ? _glvLive() : _gll.role === 'host' ? !!(_glh.on && _glhAnyone()) : false; } catch (e) { return false; }
}
/** The part of the garden a photo shows, in the garden's units: centred on the cell the asker stood on, kept inside the garden. */
function _glsFrame(cx, cy) {
  const W = GARDEN_WORLD, wpx = W.cols * W.cellW, hpx = W.sky + W.rows * W.cellH;
  const fw = Math.min(GL_SNAP.w, wpx), fh = Math.min(GL_SNAP.h, hpx);
  const px = (cx + 0.5) * W.cellW, py = W.sky + cy * W.cellH;
  return { x: Math.max(0, Math.min(wpx - fw, px - fw / 2)), y: Math.max(0, Math.min(hpx - fh, py - fh * 0.62)), w: fw, h: fh };
}
function gardenSnapAsk() {
  if (!gardenSnapCan() || typeof _gw === 'undefined' || !_gw.on) return false;
  const t = Date.now();   // clock-ok: a rate window
  if (_gls.job) return false;
  if (t - _gls.mine < GL_SNAP.gap * 1000) { if (typeof toast === 'function') gardenToast('One group photo at a time. Try again in a moment.', { icon: 'camera', timeout: 3000 }); return false; }
  _gls.mine = t;
  const x = Math.max(0, Math.min(GARDEN_WORLD.cols - 1, Math.round(_gw.px))), y = Math.max(0, Math.min(GARDEN_WORLD.rows - 1, Math.round(_gw.py))), id = _gllNewId();
  gardenLiveFx('snap', 'ask', { i: id, x, y });
  _glsStart({ id, x, y, by: '', mine: true });
  return true;
}
function _glsHear(A, ev) {
  if (!A || ev.e !== 'ask') return;
  const id = String(ev.i || ''), t = Date.now();   // clock-ok: a rate window
  if (!GL_ID_RE.test(id) || _gls.seen.has(id)) return;
  if (_gls.seen.size > 50) _gls.seen.clear();
  _gls.seen.add(id);
  if (_gls.job || typeof _gw === 'undefined' || !_gw.on || document.hidden) return;   // (one at a time, and only if the garden is in front of you)
  if (t - (_gls.heard.get(A.w) || 0) < GL_SNAP.gap * 1000) return;   // (the same person asking again and again)
  _gls.heard.set(A.w, t);
  _glsStart({ id, x: ev.x, y: ev.y, by: String(A.n || 'Someone').split(/\s+/)[0] || 'Someone', mine: false });
}
function _glsStart(o) {
  const box = _gw.box; if (!box) return;
  const job = _gls.job = { id: o.id, x: o.x, y: o.y, n: GL_SNAP.count, t: 0, el: null };
  const el = document.createElement('div'); el.className = 'gls-count'; el.setAttribute('role', 'status');
  const msg = document.createElement('span'); msg.className = 'gls-msg'; msg.textContent = o.mine ? 'Group photo. Smile!' : `${o.by} wants a group photo`;
  const num = document.createElement('b'); num.className = 'gls-n'; num.textContent = String(job.n);
  const skip = document.createElement('button'); skip.type = 'button'; skip.className = 'gls-skip'; skip.textContent = o.mine ? 'Cancel' : 'Skip';
  skip.onclick = () => _glsEnd(job, false);
  el.append(msg, num, skip); box.appendChild(el); job.el = el;
  job.t = setInterval(() => {
    if (_gls.job !== job) return;
    job.n -= 1;
    if (job.n > 0) { num.textContent = String(job.n); return; }
    _glsEnd(job, true);
  }, 1000);
}
function _glsEnd(job, shoot) {
  if (_gls.job !== job) return;
  _gls.job = null; clearInterval(job.t);
  if (job.el) job.el.remove();
  if (shoot) _glsShoot(job);
}
function _glsFlash() {
  const box = _gw.box; if (!box) return;
  if (!_gllReduced()) { const f = document.createElement('div'); f.className = 'gls-flash'; box.appendChild(f); setTimeout(() => f.remove(), 700); }
  if (typeof _fxSound === 'function') _fxSound('shutter');
}
/** The part of the live stage a photo shows, as a PNG (the same drawing photo mode uses; the people's name tags and the walking guides are left out). */
function _glsBlob(frame) {
  return new Promise((resolve, reject) => {
    const svg = _gw.svg; if (!svg) { reject(new Error('The garden is not on screen.')); return; }
    if (typeof gardenArtAllBack === 'function') gardenArtAllBack(svg);   // (what is out of the window is lifted off the page)
    const clone = svg.cloneNode(true);
    for (const n of clone.querySelectorAll('.gd-row .gart-off')) n.remove();   // (what moves, out of the view: it is not where it was last drawn)
    // (a photo has no pointer guides, grid, thirst bubbles, lock signs, name tags or speech: they are the screen's, not the garden's. The classes are dropped when it is drawn, so what a class dimmed is dimmed here)
    for (const n of clone.querySelectorAll('.gd-gridlines, .gd-ui, .gd-needs, .gd-locksign, .gd-route, .gd-pl-halo, .gll-name, .gll-say, .gll-fx')) n.remove();
    for (const n of clone.querySelectorAll('.gll-shadow')) { n.setAttribute('fill', '#1a2a14'); n.setAttribute('fill-opacity', '0.2'); }
    if (typeof gardenPhotoGhost === 'function') try { gardenPhotoGhost(clone, frame); } catch (e) { /* only a picture */ }   // (94-garden-zz-3pose.js)
    clone.setAttribute('viewBox', `${frame.x.toFixed(1)} ${frame.y.toFixed(1)} ${frame.w} ${frame.h}`);
    clone.removeAttribute('width'); clone.removeAttribute('height'); clone.removeAttribute('style');
    const w = 1600, h = Math.round(frame.h * w / frame.w);
    gardenScenePng(new XMLSerializer().serializeToString(clone), w, h).then(resolve, reject);
  });
}
async function _glsShoot(job) {
  _glsFlash();
  try {
    const frame = _glsFrame(job.x, job.y);
    const blob = await _glsBlob(frame);
    const who = _gll.role === 'host' ? [...new Set([..._gll.actors.values()].map(A => String(A.f || '')).filter(Boolean))] : [];
    await memPhotoKeep(blob, { iso: _gllToday(), ts: Clock.now(), kind: 'group', at: _gll.role === 'visit' ? String(_glv.fid || '') : '', who });
    if (typeof toast === 'function') gardenToast('Group photo kept in your Memories', { icon: 'camera', kind: 'ok', timeout: 6000, action: { label: 'See it', run: () => setView('memories:photos') } });
  } catch (e) {
    if (typeof toast === 'function') gardenToast('The group photo could not be kept.', { icon: 'camera', kind: 'err', timeout: 5000 });
  }
}
