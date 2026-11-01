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
function _gtgoFrame() {
  const W = GARDEN_WORLD, wpx = W.cols * W.cellW, hpx = W.sky + W.rows * W.cellH, k = GTG_POSE.zooms[_gtgo.z][0], fw = Math.min(GL_SNAP.w * k, wpx), fh = Math.min(GL_SNAP.h * k, hpx), [px, py] = _gwFeet();
  return { x: Math.max(0, Math.min(wpx - fw, px - fw / 2 + _gtgo.dx)), y: Math.max(0, Math.min(hpx - fh, py - fh * 0.62 + _gtgo.dy)), w: fw, h: fh };
}
/** The dark round the frame, in the world, so you see what the picture will be. It is in the fx layer: the photo leaves that out. */
function _gtgoViewPaint() {
  if (!_gtgo.on) return;
  const svg = _gw.svg, host = svg && (svg.querySelector('.gd-ui .gd-fx') || svg.querySelector('.gd-actors')); if (!host) return;
  if (!_gtgo.view || !_gtgo.view.isConnected) { _gtgo.view = document.createElementNS('http://www.w3.org/2000/svg', 'g'); _gtgo.view.setAttribute('pointer-events', 'none'); host.appendChild(_gtgo.view); }
  const f = _gtgoFrame(), W = GARDEN_WORLD, O = 2000, c = 22, x1 = f.x + f.w, y1 = f.y + f.h;
  _gtgo.view.innerHTML = `<path fill-rule="evenodd" fill="#101820" fill-opacity="0.42" d="M${-O} ${-O}H${W.cols * W.cellW + O}V${W.sky + W.rows * W.cellH + O}H${-O}ZM${f.x} ${f.y}H${x1}V${y1}H${f.x}Z"/><path fill="none" stroke="#ffffff" stroke-width="3" d="M${f.x} ${f.y + c}V${f.y}H${f.x + c}M${x1 - c} ${f.y}H${x1}V${f.y + c}M${x1} ${y1 - c}V${y1}H${x1 - c}M${f.x + c} ${y1}H${f.x}V${y1 - c}"/>`;
}
/** What you can hold up: what you have caught, your best first, then what is in your bag today. */
function _gtgoCatches() {
  const g = _gdG(), out = [];
  for (const [id, r] of Object.entries(g.fl)) { const d = gardenFishDef(id); if (d && d.cat === 'fish') out.push({ kind: 'fish', id, d, at: String(r.l || r.d || '') }); }
  for (const [id, r] of Object.entries(g.bl)) { const d = gardenBugDef(id); if (d) out.push({ kind: 'bug', id, d, at: String(r.l || r.d || '') }); }
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 14);
}
function _gtgoHoldSvg(c) {
  const px = 50, y = GPL_HOLD.y, spark = (x, yy, s) => `<path transform="translate(${x} ${yy}) scale(${s})" d="M0-5L1.3-1.3L5 0L1.3 1.3L0 5L-1.3 1.3L-5 0L-1.3-1.3z" fill="#ffe27a" stroke="#e8a83a" stroke-width=".5"/>`;
  return `<ellipse cx="0" cy="${y}" rx="26" ry="22" fill="#fff6c8" fill-opacity=".34"/><g transform="translate(${-px / 2} ${y - px / 2 + 2})">${gardenCatchSvg(c.kind, c.id, px, { uid: 'tgo' + c.id, glow: false })}</g>${spark(-26, y - 16, 1)}${spark(27, y - 10, 0.8)}${spark(8, y - 30, 0.7)}`;
}
function _gtgoHoldSync() {
  if (!_gtgo.on) return;
  if (_gw.moving && _gtgo.hold) { _gtgo.hold = null; _gtgoPaint(); }
  const a = _gwActors(); if (!a) return;
  if (!_gtgo.hold) { if (_gtgo.held) { _gtgo.held.remove(); _gtgo.held = null; try { gartPlayerAct('idle', 1); } catch (e) { /* no figure */ } } return; }
  if (!_gtgo.held || !_gtgo.held.isConnected || _gtgo.held._id !== _gtgo.hold.id) {
    if (_gtgo.held) _gtgo.held.remove();
    _gtgo.held = document.createElementNS('http://www.w3.org/2000/svg', 'g'); _gtgo.held._id = _gtgo.hold.id; _gtgo.held.innerHTML = _gtgoHoldSvg(_gtgo.hold); a.appendChild(_gtgo.held);
  }
  const [x, y] = _gwFeet(); _gtgo.held.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(.74)`);
  try { gartPlayerAct('hold', 1500); } catch (e) { /* no figure */ }
}
function _gtgoClose() {
  if (!_gtgo.on) return;
  _gtgo.on = false; clearInterval(_gtgo.iv);
  if (_gtgo.el) _gtgo.el.remove(); _gtgo.el = null;
  if (_gtgo.view) _gtgo.view.remove(); _gtgo.view = null;
  if (_gtgo.held) _gtgo.held.remove(); _gtgo.held = null;
  _gtgo.hold = null;
  if (_gtgo.cam0) { const C = _gdpPrefs(); C.zoom = _gtgo.cam0.zoom; gardenCamSet(_gtgo.cam0.cam || 'follow'); _gtgo.cam0 = null; }
  if (_gw.svg) _gw.svg.style.filter = '';
  try { gartPlayerAct('idle', 1); } catch (e) { /* no figure */ }
}
function _gtgoPaint() {
  const el = _gtgo.el; if (!el) return;
  el.textContent = '';
  const seg = (label, rows, cur, on) => { const g = gpEl('div', 'tg-pose-seg'); g.setAttribute('role', 'group'); g.setAttribute('aria-label', label); rows.forEach((r, i) => { const b = gpEl('button', 'btn btn-sm' + (i === cur ? ' btn-primary' : ' btn-ghost'), r[1]); b.type = 'button'; b.onclick = () => { on(i); _gtgoPaint(); _gtgoViewPaint(); }; g.appendChild(b); }); return g; };
  const row = gpEl('div', 'tg-pose-hold');
  const none = gpEl('button', 'tg-pose-c' + (_gtgo.hold ? '' : ' is-on'), 'Nothing'); none.type = 'button'; none.onclick = () => { _gtgo.hold = null; _gtgoHoldSync(); _gtgoPaint(); }; row.appendChild(none);
  const list = _gtgoCatches();
  for (const c of list) { const b = gpEl('button', 'tg-pose-c' + (_gtgo.hold && _gtgo.hold.id === c.id ? ' is-on' : '')); b.type = 'button'; b.setAttribute('aria-label', 'Hold up ' + c.d.name); b.setAttribute('data-tip', c.d.name); b.innerHTML = gardenCatchSvg(c.kind, c.id, 32, { uid: 'tgoc' + c.id, glow: false }); b.onclick = () => { _gtgo.hold = c; _gtgoHoldSync(); _gtgoPaint(); }; row.appendChild(b); }
  if (!list.length) row.appendChild(gpEl('small', 'muted', 'Catch something and you can hold it up here.'));
  const nudge = gpEl('div', 'tg-pose-seg'); nudge.setAttribute('role', 'group'); nudge.setAttribute('aria-label', 'Move the frame');
  for (const [lab, dx, dy] of [['Left', -40, 0], ['Up', 0, -30], ['Down', 0, 30], ['Right', 40, 0]]) { const b = gpEl('button', 'btn btn-sm btn-ghost', lab); b.type = 'button'; b.onclick = () => { _gtgo.dx += dx; _gtgo.dy += dy; _gtgoViewPaint(); }; nudge.appendChild(b); }
  const go = gpEl('div', 'tg-pose-go');
  const shoot = gpEl('button', 'btn btn-primary', 'Take it'); shoot.type = 'button'; shoot.onclick = _gtgoShoot;
  const out = gpEl('button', 'btn btn-ghost', 'Done'); out.type = 'button'; out.onclick = _gtgoClose;
  go.append(shoot, out);
  el.append(gpEl('b', 'tg-pose-t', 'Hold up'), row, gpEl('b', 'tg-pose-t', 'Frame'), seg('How close', GTG_POSE.zooms, _gtgo.z, (i) => { _gtgo.z = i; }), nudge, seg('The frame around it', GTG_POSE.frames, GTG_POSE.frames.findIndex(r => r[0] === _gtgo.frame), (i) => { _gtgo.frame = GTG_POSE.frames[i][0]; }), gpEl('b', 'tg-pose-t', 'Filter'), seg('Filter', GTG_POSE.filters, _gtgo.f, (i) => { _gtgo.f = i; _gw.svg.style.filter = GTG_POSE.filters[i][0]; }), go);
}
function gardenPoseOpen() {
  if (typeof _gw === 'undefined' || !_gw.on || !_gw.box) { setView('garden'); gardenToast('Open your garden first, then Pose with a catch.', { icon: 'camera', timeout: 4000 }); return; }
  if (_gtgo.on) return;
  gardenBubbleClose && gardenBubbleClose();
  _gtgo.on = true; _gtgo.dx = 0; _gtgo.dy = 0; _gtgo.f = 0;
  { const C = _gdpPrefs(); _gtgo.cam0 = { zoom: C.zoom, cam: C.cam }; const want = GW_ZOOMS.findIndex(h => h >= GL_SNAP.h * 1.25), i = _gwCamZoomIdx(); if (want > i) gardenCamSet(null, want - i); }
  _gtgo.el = gpEl('div', 'tg-pose'); _gtgo.el.setAttribute('role', 'group'); _gtgo.el.setAttribute('aria-label', 'Photo mode');
  _gtgo.el.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); _gtgoClose(); } });
  _gw.box.appendChild(_gtgo.el);
  _gtgoPaint(); _gtgoViewPaint(); _gtgoHoldSync();
  _gtgo.iv = setInterval(() => { if (!_gtgo.on) return; if (!_gw.on) { _gtgoClose(); return; } if (_gtgo.el && !_gtgo.el.isConnected && _gw.box) _gw.box.appendChild(_gtgo.el); _gtgoViewPaint(); _gtgoHoldSync(); if (_gtgoNearGhost()) { if (!_gtgk.said.has('ghost-near')) { _gtgk.said.add('ghost-near'); wdWhisper('The camera has gone cold in your hands.', 5000); } } }, 400);
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
    const was = _gw.svg.style.filter; _gw.svg.style.filter = '';   // (the preview is not part of the picture: the filter is drawn on it)
    const shot = await _glsBlob(frame); _gw.svg.style.filter = was;
    const blob = await _gtgoDevelop(shot, filter, _gtgo.frame, hold ? hold.d.name : m.visit ? `${_gscFirst(m.visit.fid)}’s` : '');
    await memPhotoKeep(blob, { iso: _gdToday(), ts: Clock.now(), kind: 'garden', at: m.visit ? String(m.visit.fid || '') : '' });
    try { if (typeof gardenLiveCheer === 'function') gardenLiveCheer('photo'); } catch (e) { /* only a moment */ }
    const paid = _grGive('did.pose', { ticket: 2, x: 1 });
    gardenToast(paid ? 'Kept in your Memories. 2 tickets' : 'Kept in your Memories', { icon: 'camera', kind: 'ok', timeout: 6000, action: { label: 'See it', run: () => setView('memories:photos') } });
    if (_gtgGhostIn(frame, m)) { if (gpGrant('tg-ghost', { ticket: 15, 'mat:stone': 3 })) setTimeout(() => wdWhisper('There is someone in that photograph. She was not there. 15 tickets, and three stones she left.', 9000), 1800); }
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
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('transform', `translate(${(GTG_GHOST_AT.x * W.cellW).toFixed(1)} ${(W.sky + GTG_GHOST_AT.y * W.cellH).toFixed(1)})`); g.innerHTML = _gtgGhostSvg(); host.appendChild(g);
}
