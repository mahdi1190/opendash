/* ============================================================
   PHOTO MODE, IN THE WORLD: stand where you like, hold up something you caught, frame the shot, pick a filter, keep it in Memories. It draws the live stage the way the group photo does (_glsBlob in 94-garden-live-7snap.js), so the people and pets in it are real; only your own computer keeps the picture, and nothing is sent. Friends here see the flash.
   THE GHOST IN THE PHOTOGRAPH (HUNDRED_WORLD.md row 29): at dusk, by the sundial, the camera sees someone you do not. Only in the picture, in every photo taken then, including a group photo, so two of you can each have her. No cross on any map: a line about the camera going cold when you are close.
   ============================================================ */
const GTG_GHOST_AT = Object.freeze(_wdPt('sundial', -1.1, -0.2));   // world cells
const GTG_POSE = Object.freeze({
  zooms: Object.freeze([[0.6, 'Close'], [1, 'Middle'], [1.7, 'Wide']]),
  filters: Object.freeze([['', 'As it is'], ['saturate(1.25) sepia(.18) brightness(1.04)', 'Warm'], ['sepia(.75) contrast(.92) brightness(1.02)', 'Old'], ['grayscale(1) contrast(1.12)', 'Black and white'], ['saturate(1.5) brightness(1.1) contrast(.94)', 'Dream'], ['hue-rotate(195deg) saturate(.55) brightness(.82)', 'Moonlight']]),
  frames: Object.freeze([['', 'No frame'], ['snap', 'Snapshot'], ['card', 'Postcard']]),
});
const _gtgo = { on: false, el: null, f: 0, z: 1, frame: '', dx: 0, dy: 0, hold: null, iv: 0, held: null, view: null };
/** One preview filter for the standard SVG and the optional renderer. The
 * saved photo still receives its filter exactly once in _gtgoDevelop. */
function _gtgoFilter(filter, svg) {
  if (window.GardenNative && GardenNative.active()) { GardenNative.setPhotoFilter(filter); return; }
  svg = svg || _gw.svg; if (!svg) return;
  if (svg.style.filter !== filter) svg.style.filter = filter;
  const engine = window.GardenPhaser;
  if (engine && typeof engine.setPhotoFilter === 'function') engine.setPhotoFilter(svg, filter);
}
function _gtgoFrame() {
  const W = GARDEN_WORLD, wpx = W.cols * W.cellW, hpx = W.sky + W.rows * W.cellH, k = GTG_POSE.zooms[_gtgo.z][0], fw = Math.min(GL_SNAP.w * k, wpx), fh = Math.min(GL_SNAP.h * k, hpx), [px, py] = _gwFeet();
  return { x: Math.max(0, Math.min(wpx - fw, px - fw / 2 + _gtgo.dx)), y: Math.max(0, Math.min(hpx - fh, py - fh * 0.62 + _gtgo.dy)), w: fw, h: fh };
}
/** The dark round the frame, in the world, so you see what the picture will be. It is in the fx layer: the photo leaves that out. */
function _gtgoViewPaint(followOnly) {
  if (!_gtgo.on) return;
  if (!followOnly) _gtgoFilter(GTG_POSE.filters[_gtgo.f][0]);   // also restores the preview after a stage remount
  const svg = _gw.svg, mounted = _gtgo.view && _gtgo.view.isConnected && _gtgo.view.ownerSVGElement === svg;
  const host = mounted ? _gtgo.view.parentNode : svg && (svg.querySelector('.gd-ui .gd-fx') || svg.querySelector('.gd-actors')); if (!host) return;
  if (!mounted) {
    if (_gtgo.view) _gtgo.view.remove();
    _gtgo.view = gardenSceneElement('g'); _gtgo.view.setAttribute('class', 'gd-photo-frame'); _gtgo.view.setAttribute('pointer-events', 'none');
    _gtgo.view.innerHTML = '<rect class="gd-photo-mask" fill="#101820" fill-opacity="0.42"/>'.repeat(4) + '<path class="gd-photo-corners" fill="none" stroke="#ffffff" stroke-width="3"/>';
    _gtgo.view._masks = [..._gtgo.view.querySelectorAll('rect')]; _gtgo.view._corners = _gtgo.view.querySelector('path');
    host.appendChild(_gtgo.view);
  }
  const f = _gtgoFrame(), W = GARDEN_WORLD, O = 2000, c = 22;
  const transform = `translate(${f.x} ${f.y})`; if (_gtgo.view.getAttribute('transform') !== transform) _gtgo.view.setAttribute('transform', transform);
  const key = [f.w, f.h, W.cols, W.rows].join('|'); if (_gtgo.view._frameSizeKey === key) return; _gtgo.view._frameSizeKey = key;
  // Four nonoverlapping rectangles preserve the hole without baking a bitmap
  // over the world. Translation moves the whole frame; only a size change
  // rebuilds its local geometry. Overscan covers any allowed camera position.
  const x = W.cols * W.cellW + O, y = W.sky + W.rows * W.cellH + O;
  const masks = [[-x, -y, f.w + x * 2, y], [-x, f.h, f.w + x * 2, y], [-x, 0, x, f.h], [f.w, 0, x, f.h]];
  masks.forEach((values, i) => { const rect = _gtgo.view._masks[i]; ['x', 'y', 'width', 'height'].forEach((name, j) => { const value = String(values[j]); if (rect.getAttribute(name) !== value) rect.setAttribute(name, value); }); });
  _gtgo.view._corners.setAttribute('d', `M0 ${c}V0H${c}M${f.w - c} 0H${f.w}V${c}M${f.w} ${f.h - c}V${f.h}H${f.w - c}M${c} ${f.h}H0V${f.h - c}`);
}
/** What you can hold up: what you have caught, your best first, then what is in your bag today. */
function _gtgoCatches() {
  const g = _gdG(), out = [];
  const add = (kind, id, d, r) => { out.push({ kind, id, d, at: String(r.l || r.d || ''), rec: r }); };
  for (const [id, r] of Object.entries(g.fl)) { const d = gardenFishDef(id); if (d && d.cat === 'fish') add('fish', id, d, r); }
  for (const [id, r] of Object.entries(g.bl)) { const d = gardenBugDef(id); if (d) add('bug', id, d, r); }
  // Only the visible choices need specimen lookup, not the whole catch book.
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 14).map(c => { const s = typeof gardenSpecShown === 'function' ? gardenSpecShown(c.kind, c.id) : null, r = c.rec; return { kind: c.kind, id: c.id, d: c.d, at: c.at, v: s && s.v || '', cm: Math.max(1, Math.min(c.kind === 'fish' ? 400 : 999, Math.round(Number(s && s.c || r.b) || 1))), q: Math.max(0, Math.min(3, Number(s && s.q != null ? s.q : r.q) || 0)) }; });
}
function _gtgoHoldSvg(c) {
  const px = 50, y = GPL_HOLD.y, spark = (x, yy, s) => `<path transform="translate(${x} ${yy}) scale(${s})" d="M0-5L1.3-1.3L5 0L1.3 1.3L0 5L-1.3 1.3L-5 0L-1.3-1.3z" fill="#ffe27a" stroke="#e8a83a" stroke-width=".5"/>`;
  const art = c.kind === 'gear' ? gardenMomentSpec('gear', c.id, {}).art(px) : gardenCatchSvg(c.kind, c.id, px, { uid: 'tgo' + c.id, glow: false, v: c.v });
  return `<ellipse cx="0" cy="${y}" rx="26" ry="22" fill="#fff6c8" fill-opacity=".34"/><g transform="translate(${-px / 2} ${y - px / 2 + 2})">${art}</g>${spark(-26, y - 16, 1)}${spark(27, y - 10, 0.8)}${spark(8, y - 30, 0.7)}`;
}
function _gtgoHoldSync() {
  if (!_gtgo.on) return;
  if (_gw.moving && _gtgo.hold) { _gtgo.hold = null; _gtgoPaint(); }
  if (typeof gardenLivePhoto === 'function') { const c = _gtgo.hold; gardenLivePhoto(c ? { kd: c.kind, i: c.id, ...(c.v ? { v: c.v } : {}), n: c.cm, ql: c.q } : {}); }
  const a = _gwActors(); if (!a) return;
  if (!_gtgo.hold) { if (_gtgo.held) { _gtgo.held.remove(); _gtgo.held = null; try { gartPlayerAct('idle', 1); } catch (e) { /* no figure */ } } return; }
  const heldKey = [_gtgo.hold.kind, _gtgo.hold.id, _gtgo.hold.v || ''].join('|');
  if (!_gtgo.held || !_gtgo.held.isConnected || _gtgo.held._id !== heldKey) {
    if (_gtgo.held) _gtgo.held.remove();
    _gtgo.held = gardenSceneElement('g'); _gtgo.held.setAttribute('class', 'gd-photo-held'); _gtgo.held._id = heldKey; _gtgo.held.innerHTML = _gtgoHoldSvg(_gtgo.hold); a.appendChild(_gtgo.held);
  }
  _gtgoHeldFollow();
  try { gartPlayerAct('hold', 1500); } catch (e) { /* no figure */ }
}
function _gtgoHeldFollow() {
  if (!_gtgo.held || !_gtgo.held.isConnected) return;
  const [x, y] = _gwFeet(), scale = typeof GW_SCALE === 'number' ? GW_SCALE : .74, transform = `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale})`;
  if (_gtgo.held.getAttribute('transform') !== transform) _gtgo.held.setAttribute('transform', transform);
}
/** NativeRuntime calls this from its scene clock. The slow heartbeat still
 * owns selection UI and live-photo refreshes; follow changes only geometry. */
function gardenPoseFrame() {
  if (!_gtgo.on) return;
  if (!_gw.on || _grm.on || _ee.on || _gwFishBusy()) { _gtgoClose(); return; }
  if (_gw.moving && _gtgo.hold) _gtgoHoldSync();
  _gtgoViewPaint(true); _gtgoHeldFollow();
}
function _gtgoClose() {
  if (!_gtgo.on) return;
  if (typeof gardenLivePhoto === 'function') gardenLivePhoto(null);
  _gtgo.on = false; clearInterval(_gtgo.iv);
  if (_gtgo.el) _gtgo.el.remove(); _gtgo.el = null;
  if (_gtgo.view) _gtgo.view.remove(); _gtgo.view = null;
  if (_gtgo.held) _gtgo.held.remove(); _gtgo.held = null;
  _gtgo.hold = null;
  if (_gtgo.cam0) { const C = _gdpPrefs(); C.zoom = _gtgo.cam0.zoom; gardenCamSet(_gtgo.cam0.cam || 'follow'); _gtgo.cam0 = null; }
  _gtgoFilter('');
  try { gartPlayerAct('idle', 1); } catch (e) { /* no figure */ }
}
function _gtgoPaint() {
  const el = _gtgo.el; if (!el) return;
  el.textContent = '';
  const seg = (label, rows, cur, on) => { const g = gpEl('div', 'tg-pose-seg'); g.setAttribute('role', 'group'); g.setAttribute('aria-label', label); rows.forEach((r, i) => { const b = gpEl('button', 'btn btn-sm' + (i === cur ? ' btn-primary' : ' btn-ghost'), r[1]); b.type = 'button'; b.onclick = () => { on(i); _gtgoPaint(); _gtgoViewPaint(); }; g.appendChild(b); }); return g; };
  const row = gpEl('div', 'tg-pose-hold');
  const none = gpEl('button', 'tg-pose-c' + (_gtgo.hold ? '' : ' is-on'), 'Nothing'); none.type = 'button'; none.onclick = () => { _gtgo.hold = null; _gtgoHoldSync(); _gtgoPaint(); }; row.appendChild(none);
  const list = _gtgoCatches();
  for (const c of list) { const b = gpEl('button', 'tg-pose-c' + (_gtgo.hold && _gtgo.hold.kind === c.kind && _gtgo.hold.id === c.id ? ' is-on' : '')); b.type = 'button'; b.setAttribute('aria-label', 'Hold up ' + c.d.name); b.setAttribute('data-tip', c.d.name); b.innerHTML = gardenCatchSvg(c.kind, c.id, 32, { uid: 'tgoc' + c.id, glow: false, v: c.v }); b.onclick = () => { _gtgo.hold = c; _gtgoHoldSync(); _gtgoPaint(); }; row.appendChild(b); }
  if (!list.length) row.appendChild(gpEl('small', 'muted', 'Catch something and you can hold it up here.'));
  const nudge = gpEl('div', 'tg-pose-seg'); nudge.setAttribute('role', 'group'); nudge.setAttribute('aria-label', 'Move the frame');
  for (const [lab, dx, dy] of [['Left', -40, 0], ['Up', 0, -30], ['Down', 0, 30], ['Right', 40, 0]]) { const b = gpEl('button', 'btn btn-sm btn-ghost', lab); b.type = 'button'; b.onclick = () => { _gtgo.dx += dx; _gtgo.dy += dy; _gtgoViewPaint(); }; nudge.appendChild(b); }
  const go = gpEl('div', 'tg-pose-go');
  const shoot = gpEl('button', 'btn btn-primary', 'Take it'); shoot.type = 'button'; shoot.onclick = _gtgoShoot;
  const out = gpEl('button', 'btn btn-ghost', 'Done'); out.type = 'button'; out.onclick = _gtgoClose;
  go.append(shoot, out);
  el.append(gpEl('b', 'tg-pose-t', 'Hold up'), row, gpEl('b', 'tg-pose-t', 'Frame'), seg('How close', GTG_POSE.zooms, _gtgo.z, (i) => { _gtgo.z = i; }), nudge, seg('The frame around it', GTG_POSE.frames, GTG_POSE.frames.findIndex(r => r[0] === _gtgo.frame), (i) => { _gtgo.frame = GTG_POSE.frames[i][0]; }), gpEl('b', 'tg-pose-t', 'Filter'), seg('Filter', GTG_POSE.filters, _gtgo.f, (i) => { _gtgo.f = i; }), go);
}
function gardenPoseOpen() {
  if (typeof _gw === 'undefined' || !_gw.on || !_gw.box) { setView('garden'); gardenToast('Open your garden first, then Pose with a catch.', { icon: 'camera', timeout: 4000 }); return; }
  if (_grm.on || _ee.on || _gwFishBusy()) return; // its capture is the outdoor stage, with no line out
  if (_gtgo.on) return;
  gardenBubbleClose && gardenBubbleClose();
  _gtgo.on = true; _gtgo.dx = 0; _gtgo.dy = 0; _gtgo.f = 0;
  { const C = _gdpPrefs(); _gtgo.cam0 = { zoom: C.zoom, cam: C.cam }; const want = GW_ZOOMS.findIndex(h => h >= GL_SNAP.h * 1.25), i = _gwCamZoomIdx(); if (want > i) gardenCamSet(null, want - i); }
  _gtgo.el = gpEl('div', 'tg-pose'); _gtgo.el.setAttribute('role', 'group'); _gtgo.el.setAttribute('aria-label', 'Photo mode');
  _gtgo.el.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); _gtgoClose(); } });
  _gw.box.appendChild(_gtgo.el);
  _gtgoPaint(); _gtgoViewPaint(); _gtgoHoldSync();
  _gtgo.iv = setInterval(() => { if (!_gtgo.on) return; if (!_gw.on || _grm.on || _ee.on || _gwFishBusy()) { _gtgoClose(); return; } if (_gtgo.el && !_gtgo.el.isConnected && _gw.box) _gw.box.appendChild(_gtgo.el); _gtgoViewPaint(); _gtgoHoldSync(); if (_gtgoNearGhost()) { if (!_gtgk.said.has('ghost-near')) { _gtgk.said.add('ghost-near'); wdWhisper('The camera has gone cold in your hands.', 5000); } } }, 400);
}
/** One picture out of the camera: the filter and the frame are drawn on it. */
async function _gtgoDevelop(blob, filter, frame, caption) {
  const bmp = await createImageBitmap(blob), m = frame === 'snap' ? { l: 40, t: 40, r: 40, b: 150 } : frame === 'card' ? { l: 28, t: 28, r: 28, b: 28 } : { l: 0, t: 0, r: 0, b: 0 };
  const c = document.createElement('canvas'); c.width = bmp.width + m.l + m.r; c.height = bmp.height + m.t + m.b;
  const x = c.getContext('2d');
  x.fillStyle = frame === 'card' ? '#f8efd9' : '#fbf9f2'; x.fillRect(0, 0, c.width, c.height);
  if (filter && 'filter' in x) x.filter = filter;
  x.drawImage(bmp, m.l, m.t);
  if ('filter' in x) x.filter = 'none';
  if (frame === 'snap' && caption) { x.fillStyle = '#3a3226'; x.font = 'italic 54px Georgia, serif'; x.textAlign = 'center'; x.fillText(caption, c.width / 2, c.height - 54, c.width - 80); }
  if (frame === 'card') { x.fillStyle = 'rgba(255,253,245,.9)'; x.fillRect(m.l + 24, c.height - m.b - 110, Math.min(c.width - 120, 1100), 78); x.fillStyle = '#3a3226'; x.font = 'italic 46px Georgia, serif'; x.textAlign = 'left'; x.fillText(caption ? `Greetings from the garden: ${caption}` : 'Greetings from the garden', m.l + 44, c.height - m.b - 56, Math.min(c.width - 160, 1060)); }
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('No picture'))), 'image/png'));
}
async function _gtgoShoot() {
  const frame = _gtgoFrame(), hold = _gtgo.hold, filter = GTG_POSE.filters[_gtgo.f][0], m = gardenHere();
  try {
    _glsFlash();
    _gtgoFilter('');   // the preview is not part of the picture: _gtgoDevelop applies the filter
    let shot;
    try { shot = await _glsBlob(frame); }
    finally { _gtgoFilter(_gtgo.on ? GTG_POSE.filters[_gtgo.f][0] : ''); }
    const blob = await _gtgoDevelop(shot, filter, _gtgo.frame, hold ? hold.d.name : m.visit ? `${_gscFirst(m.visit.fid)}’s` : '');
    await memPhotoKeep(blob, { iso: _gdToday(), ts: Clock.now(), kind: 'garden', at: m.visit ? String(m.visit.fid || '') : '' });
    try { if (typeof gardenLiveCheer === 'function') gardenLiveCheer('photo'); } catch (e) { /* only a moment */ }
    const paid = _grGive('did.pose', { x: 1 });
    gardenToast('Kept in your Memories', { icon: 'camera', kind: 'ok', timeout: 6000, action: { label: 'See it', run: () => setView('memories:photos') } });
    if (_gtgGhostIn(frame, m)) { if (gpGrant('tg-ghost', { 'mat:stone': 3 })) setTimeout(() => wdWhisper('There is someone in that photograph. She was not there. Three stones she left.', 9000), 1800); }
  } catch (e) { gardenToast('The photo could not be kept.', { icon: 'camera', kind: 'err', timeout: 5000, retry: _gtgoShoot }); }
}
gardenPlayAdd({ id: 'tg-pose', name: 'Photo mode', icon: 'camera', group: 'secret', blurb: 'Hold up something you caught, frame the shot, pick a filter, and keep it in Memories. A photo a day gives a couple of tickets.', open: () => { if (typeof gardenPopupClose === 'function') gardenPopupClose(); setTimeout(gardenPoseOpen, 60); } });
registerCommand({ id: 'garden-pose', label: 'Pose in the garden with a catch', icon: 'camera', keywords: 'garden photo pose catch filter memories', run: () => gardenPoseOpen() });
/* ---------- the ghost ---------- */
function _gtgGhostIn(frame, m) {
  if (!m || m.tod !== 'dusk' || !frame) return false;
  const W = GARDEN_WORLD, x = GTG_GHOST_AT.x * W.cellW, y = W.sky + GTG_GHOST_AT.y * W.cellH;
  return x > frame.x + 12 && x < frame.x + frame.w - 12 && y > frame.y + 50 && y < frame.y + frame.h;
}
function _gtgoNearGhost() { const m = gardenHere(); return m.tod === 'dusk' && wdNear(GTG_GHOST_AT.x, GTG_GHOST_AT.y, 5); }
function _gtgGhostSvg() {
  const A = GART;
  return `<g opacity="0.46">${A.P('#eaf2f4', 'M-13 0C-12 -18 -8 -36 -6 -46L6 -46C8 -36 12 -18 13 0Q6 3 0 0Q-6 -3 -13 0z')}${A.P('#dfe9ec', A.circ(0, -53, 7.5))}${A.P('#cfdde2', 'M-13 -56L13 -56Q13 -60 7 -60Q5 -67 0 -67Q-5 -67 -7 -60Q-13 -60 -13 -56z')}${A.S('#eaf2f4', 2.4, 'M6 -42L14 -30')}${A.P('#dfe9ec', A.rrect(11, -33, 6, 7, 1))}</g>`;
}
/** The camera sees her. Called on the copy that is about to be drawn, never on the stage. */
function gardenPhotoGhost(clone, frame) {
  const m = gardenHere(); if (!_gtgGhostIn(frame, m)) return;
  const W = GARDEN_WORLD, host = clone.querySelector('.gd-objects') || clone; if (!host) return;
  const g = gardenSceneElement('g'); g.setAttribute('transform', `translate(${(GTG_GHOST_AT.x * W.cellW).toFixed(1)} ${(W.sky + GTG_GHOST_AT.y * W.cellH).toFixed(1)})`); g.innerHTML = _gtgGhostSvg(); host.appendChild(g);
  return g;
}
