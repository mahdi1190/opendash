/* Borrowed shadows: a point light, raised brass cutouts and an engraved court.
 * The owner saves one bounded arrangement through the wonder map. Visitors
 * read that arrangement; playing the restored theatre is local presentation. */
const WSH_LAMPS = Object.freeze({ x: Object.freeze([-86, -66, -46]), y: -25, height: Object.freeze([96, 126, 166]) });
const WSH_PIECES = Object.freeze([
  Object.freeze({ id: 'heron', name: 'Brass heron', z: 30, rail: Object.freeze([1, .25]), at: Object.freeze([-32.4761904762, 2.4285714286]), notch: 3, turn: 1, target: Object.freeze([-22, 11]), path: 'M-16 4Q-23 -3-15 -11Q-7 -18 3 -10L5 -20Q6 -28 14 -27L23 -25L13 -23Q10 -23 10 -18L10 -4Q7 6-4 8L-6 23H-3V25H-9L-8 7L-14 22H-11V24H-17L-13 6Z', wing: 'M-16 -1Q-14 -14-3 -12L6 -5Q-4 4-16 -1Z' }),
  Object.freeze({ id: 'moon', name: 'Copper crescent', z: 46, rail: Object.freeze([.2, 1]), at: Object.freeze([.0317460317, -23.0952380952]), notch: 1, turn: 5, target: Object.freeze([38, -22]), path: 'M9 -12Q-11 -17-13 1Q-12 17 8 13Q-2 10-3 1Q-3 -7 9 -12Z' }),
  Object.freeze({ id: 'reeds', name: 'Three iron reeds', z: 38, rail: Object.freeze([-.6, .8]), at: Object.freeze([16.4126984127, 12.7142857143]), notch: 2, turn: 3, target: Object.freeze([52, 29]), path: 'M-13 17L-11 -6Q-18 -9-15 -15Q-9 -18-8 -11L-9 5Q-5 -3-2 -3L-7 10L-8 17ZM-2 17L0 -12Q-5 -14-3 -20Q3 -22 4 -16L2 3Q8 -8 11 -7L3 9L2 17ZM10 17L12 -3Q7 -6 10 -12Q16 -14 17 -8L14 17Z' }),
]);
const WSH_INITIAL = Object.freeze([0, 0, 0, 0, 4, 6, 0, 7, 0]);
const _wsh = { centre: null, row: null, sig: '', paintSig: '', paintRoots: [], sprites: [], floor: null, lamp: null, board: null, pieces: [], talk: null, selection: 'court', pulse: 0, probeAt: 0, revision: 0 };
function gardenShadowCourtyardWire(w) {
  const row = (w || _wdG())['shadow.court'], limits = [2, 2, 4, 7, 4, 7, 4, 7, 1];
  return Array.isArray(row) && row.length === 9 && row.every((n, i) => Number.isInteger(n) && n >= 0 && n <= limits[i]) ? row.slice() : null;
}
function gardenShadowCourtyardAnchor(w) {
  const a = (w || _wdG())['shadow.anchor']; return Array.isArray(a) && a.length === 2 && a.every((n, i) => Number.isInteger(n) && n >= 0 && n <= (i ? GARDEN_WORLD.rows : GARDEN_WORLD.cols) * 100) ? a.slice() : null;
}
function _wshRead(m) { return (m.visit ? _wdTheir(m).sc : gardenShadowCourtyardWire()) || WSH_INITIAL; }
function _wshIndoor() { return !!(typeof _grm !== 'undefined' && _grm.on || typeof _ee !== 'undefined' && _ee.on); }
function _wshEnv() { const n = window.GardenNative; return n && n.active() && n.lighting() ? n.lighting().environment() : null; }
function _wshHeld() { const env = _wshEnv(), root = typeof _gw !== 'undefined' && _gw.svg; return !!(document.hidden || _wshIndoor() || env && env.paused || root && (root.hasAttribute('data-garden-frozen') || root.classList.contains('gd-hush'))); }
function _wshLamp(row) { return { x: WSH_LAMPS.x[row[0]], y: WSH_LAMPS.y, z: WSH_LAMPS.height[row[1]] }; }
function _wshPoint(row, i) { const p = WSH_PIECES[i], d = (row[2 + i * 2] - p.notch) * 8; return { x: p.at[0] + p.rail[0] * d, y: p.at[1] + p.rail[1] * d, z: p.z }; }
function _wshCast(lamp, p) { const scale = lamp.z / (lamp.z - p.z); return { x: lamp.x + (p.x - lamp.x) * scale, y: lamp.y + (p.y - lamp.y) * scale, scale }; }
function _wshAngle(row, i) { return ((row[3 + i * 2] - WSH_PIECES[i].turn + 12) % 8 - 4) * Math.PI / 4; }
function _wshSize(ratio) { return ratio > 1.025 ? 'too large' : ratio < .975 ? 'too small' : 'right size'; }
function _wshDirection(dx, dy, threshold) {
  const words = []; if (Math.abs(dx) > threshold) words.push(dx > 0 ? 'right' : 'left'); if (Math.abs(dy) > threshold) words.push(dy > 0 ? 'toward the front' : 'toward the back');
  return words.length ? words.join(' and ') : 'centred';
}
function _wshGeometry(row) {
  const lamp = _wshLamp(row), reference = { x: WSH_LAMPS.x[1], y: WSH_LAMPS.y, z: WSH_LAMPS.height[1] }, peg = { x: -12, y: -20, z: 20 }, ring = _wshCast(lamp, peg), ringTarget = _wshCast(reference, peg), dx = ringTarget.x - ring.x, dy = ringTarget.y - ring.y;
  const calibration = { size: _wshSize(ring.scale / ringTarget.scale), direction: _wshDirection(dx, dy, .65), fit: Math.hypot(dx, dy) < .9 && Math.abs(ring.scale / ringTarget.scale - 1) < .025 };
  const pieces = WSH_PIECES.map((p, i) => { const point = _wshPoint(row, i), shadow = _wshCast(lamp, point), size = _wshSize(shadow.scale / (reference.z / (reference.z - p.z))), angle = _wshAngle(row, i), dx = p.target[0] - shadow.x, dy = p.target[1] - shadow.y, distance = Math.hypot(dx, dy), turn = Math.abs(angle) < .01 ? 'right way up' : angle > 0 ? 'counterclockwise' : 'clockwise'; return { id: p.id, name: p.name, point, shadow, angle, direction: _wshDirection(dx, dy, 1.5), size, turn, fit: distance < 1.8 && size === 'right size' && Math.abs(angle) < .01 }; });
  return { lamp, ring, ringTarget, calibration, pieces, fits: pieces.filter(p => p.fit).length, solved: calibration.fit && pieces.every(p => p.fit) };
}
function _wshWorldPoint(x, y, centre) { const c = centre || _wsh.centre, W = GARDEN_WORLD; return { x: c.x + x / W.cellW, y: c.y + y / W.cellH }; }
function _wshDry(p) { return _gwFree(p.x, p.y) && !gardenWaterContainsPoint(p.x, p.y); }
function _wshPlace() {
  if (!gardenActivityActive('shadow-courtyard')) return false;
  if (_wsh.centre) return true;
  const now = performance.now(); if (now < _wsh.probeAt || typeof _gwFree !== 'function') return false; _wsh.probeAt = now + 2000;
  const m = gardenHere(), saved = m.visit ? _wdTheir(m).sa : gardenShadowCourtyardAnchor();
  if (m.visit) { if (!saved) return false; _wsh.centre = { x: saved[0] / 100, y: saved[1] / 100 }; return true; }
  const start = GARDEN_WORLD.start, from = _wshDry(start) ? start : wdFreeNear(start.x, start.y, 2); if (!from) return false;
  const candidates = [{ x: 35.5, y: 13.5 }, { x: 36.5, y: 13.5 }, { x: 34.5, y: 13.5 }, { x: 35.5, y: 13 }, { x: 36, y: 13 }]; if (saved) candidates.unshift({ x: saved[0] / 100, y: saved[1] / 100 });
  for (const c of candidates) {
    const targets = [[-88, 10], ...WSH_LAMPS.x.map(x => [x, WSH_LAMPS.y])];
    for (let i = 0; i < 3; i++) for (const notch of [0, 4]) { const row = WSH_INITIAL.slice(); row[2 + i * 2] = notch; const p = _wshPoint(row, i); targets.push([p.x, p.y]); }
    if (targets.some(([x, y]) => !_wshDry(_wshWorldPoint(x, y, c)))) continue;
    const board = _wshWorldPoint(-88, 10, c); if (typeof _gwRoute === 'function' && !_gwRoute(from, board)) continue;
    if (targets.some(([x, y]) => typeof _gwRoute === 'function' && !_gwRoute(board, _wshWorldPoint(x, y, c)))) continue;
    _wsh.centre = c;
    if (!m.visit) { const anchor = [Math.round(c.x * 100), Math.round(c.y * 100)]; if (!saved || saved[0] !== anchor[0] || saved[1] !== anchor[1]) _wdSet('shadow.anchor', anchor); }
    return true;
  }
  return false;
}
function _wshGlyph(i, color, outline) {
  const p = WSH_PIECES[i], paint = outline ? `fill="none" stroke="${color}" stroke-width=".8" stroke-linejoin="round"` : `fill="${color}" stroke="${color}" stroke-width=".35" stroke-linejoin="round"`;
  return `<path d="${p.path}" ${paint}/>` + (p.wing ? `<path class="wsh-wing" d="${p.wing}" ${outline ? paint : 'fill="#506352" stroke="#31483e" stroke-width=".45"'}/>` : '');
}
function _wshFloorArt() {
  let s = '<ellipse cy="55" rx="114" ry="19" fill="#21392d" opacity=".16"/><path d="M-108 -48Q-105 -65-82 -65H81Q105 -65 109 -44L114 47Q113 68 90 70H-86Q-111 69-113 49Z" fill="#847c62" stroke="#5e6655" stroke-width="2"/><path d="M-103 -46Q-100 -58-80 -58H79Q98 -58 102 -41L106 45Q105 61 87 63H-83Q-103 62-105 46Z" fill="#d1c6a1" stroke="#b4a983" stroke-width="1.5"/><path d="M-97 -36H96M-101 48H101M-90 -55L-85 60M87 -55L83 61" fill="none" stroke="#a5a484" stroke-width=".65" opacity=".7"/><path d="M-78 37Q-48 16-9 36Q14 48 35 34M-78 44Q-48 23-9 43Q14 55 35 41" fill="none" stroke="#8c9a83" stroke-width="1"/><path d="M-68 36Q-47 2-23 35M-64 36Q-47 10-27 35M-71 35H-20" fill="none" stroke="#a9a587" stroke-width="1.1"/><g class="wsh-rays" stroke="#c79d48" stroke-width="1" fill="none" opacity=".19">';
  for (let i = 0; i < 3; i++) s += `<path class="wsh-ray${i}" d="M0 0L1 1"/>`;
  s += '</g><g fill="none" stroke="#9b8658" stroke-width="1.4"><path d="M-89 -25H-43"/>';
  for (const x of WSH_LAMPS.x) s += `<path d="M${x} -28V-22"/>`;
  for (let i = 0; i < 3; i++) {
    const row = WSH_INITIAL.slice(), p = WSH_PIECES[i]; row[2 + i * 2] = 0; const a = _wshPoint(row, i); row[2 + i * 2] = 4; const b = _wshPoint(row, i);
    s += `<path d="M${a.x.toFixed(3)} ${a.y.toFixed(3)}L${b.x.toFixed(3)} ${b.y.toFixed(3)}"/>`;
    for (let k = 0; k < 5; k++) { row[2 + i * 2] = k; const at = _wshPoint(row, i); s += `<path d="M${(at.x - p.rail[1] * 2.5).toFixed(3)} ${(at.y + p.rail[0] * 2.5).toFixed(3)}l${(p.rail[1] * 5).toFixed(3)} ${(-p.rail[0] * 5).toFixed(3)}"/>`; }
  }
  s += '</g><g class="wsh-guides">';
  const reference = { x: WSH_LAMPS.x[1], y: WSH_LAMPS.y, z: WSH_LAMPS.height[1] };
  for (let i = 0; i < 3; i++) { const p = WSH_PIECES[i], k = reference.z / (reference.z - p.z); s += `<g transform="translate(${p.target[0]} ${p.target[1]}) scale(${k})">${_wshGlyph(i, '#8f8c69', true)}</g>`; }
  const ring = _wshCast(reference, { x: -12, y: -20, z: 20 });
  s += `<circle cx="${ring.x}" cy="${ring.y}" r="${(4 * ring.scale).toFixed(3)}" fill="none" stroke="#c28d39" stroke-width="1.2"/><path d="M${ring.x - 9} ${ring.y}h4M${ring.x + 5} ${ring.y}h4M${ring.x} ${ring.y - 9}v4M${ring.x} ${ring.y + 5}v4" stroke="#9d8452" stroke-width=".8"/></g>`;
  for (let i = 0; i < 3; i++) s += `<g class="wsh-shadow${i}" opacity=".72"><g class="wsh-life${i}">${_wshGlyph(i, '#31483e', false)}</g></g>`;
  s += '<circle class="wsh-ring" cx="0" cy="0" r="4" fill="none" stroke="#4d6755" stroke-width="1.2"/><g class="wsh-trim" fill="#a47c3c"><circle cx="-96" cy="-49" r="3"/><circle cx="96" cy="-49" r="3"/><circle cx="-98" cy="54" r="3"/><circle cx="98" cy="54" r="3"/></g><path class="wsh-halo" d="M-97 -39Q-63 -58 0 -55Q66 -57 98 -36M-98 47Q-36 68 0 59Q58 72 99 46" fill="none" stroke="#e4c878" stroke-width="2" opacity="0"/><text class="wsh-title" x="0" y="60" text-anchor="middle" font-family="system-ui,sans-serif" font-size="6.5" letter-spacing="1" fill="#6e6c50">BORROWED SHADOWS</text>';
  return s;
}
function _wshLampArt() { return '<ellipse cy="3" rx="17" ry="5" fill="#273c2f" opacity=".19"/><path d="M-15 0L-10 -9H10L15 0Z" fill="#857650"/><path class="wsh-pole" d="M0 -6V-126" stroke="#706042" stroke-width="4"/><path class="wsh-pole-light" d="M-1 -6V-126" stroke="#c5ab68" stroke-width="1"/><g class="wsh-lamp-head"><path d="M-15 -14Q0 -25 15 -14L11 11H-11Z" fill="#8b7446" stroke="#5e5b3c" stroke-width="1.5"/><path d="M-9 -12H9L7 7H-7Z" fill="#f0db94"/><path d="M-3 -10V5M3 -10V5" stroke="#b99b53" stroke-width="1"/><path d="M-17 -15Q0 -31 17 -15Z" fill="#667e67"/><path d="M-4 -26V-32H4V-26" fill="none" stroke="#9b854c" stroke-width="1.5"/><ellipse class="wsh-flame" cy="-1" rx="4" ry="7" fill="#fff0b0"/></g>'; }
function _wshPieceArt(i) {
  const p = WSH_PIECES[i], angle = -p.turn * 45;
  return `<ellipse cy="2" rx="12" ry="3.5" fill="#263b2e" opacity=".16"/><path d="M-11 0L-8 -7H8L11 0Z" fill="#90856a"/><path d="M0 -5V${-p.z}" stroke="#887345" stroke-width="2"/><g transform="translate(0 ${-p.z})"><g class="wsh-cutout" transform="rotate(0)"><g transform="rotate(${angle})">${_wshGlyph(i, i === 1 ? '#c49d5b' : '#ad9d65', false)}</g></g><circle r="2.3" fill="#e6d7a3"/></g>`;
}
function _wshBoardArt() { return '<ellipse cy="2" rx="22" ry="5" fill="#263b2e" opacity=".17"/><path d="M-14 0V-23M14 0V-23" stroke="#7d7355" stroke-width="3"/><path d="M-28 -28Q0 -37 28 -28L25 -9H-25Z" fill="#eee0bb" stroke="#a39567" stroke-width="1.4"/><text x="0" y="-23" text-anchor="middle" font-family="system-ui,sans-serif" font-size="5.3" font-weight="700" fill="#485e4c">BORROWED</text><text x="0" y="-15" text-anchor="middle" font-family="system-ui,sans-serif" font-size="5.3" font-weight="700" fill="#485e4c">SHADOWS</text>'; }
function _wshAdd(spec) { const S = wdSprite(Object.assign({ still: true }, spec)); _wsh.sprites.push(S); return S; }
function _wshBuild() {
  if (!_wd.on || _wshIndoor() || !_wshPlace()) return;
  const c = _wsh.centre;
  if (!_wsh.floor) _wsh.floor = _wshAdd({ id: 'wd-shadow-floor', ...c, z: c.y - 4, hit: 0, svg: _wshFloorArt() });
  if (!_wsh.board) _wsh.board = _wshAdd({ id: 'wd-shadow-court', ..._wshWorldPoint(-88, 10), hit: .4, hitUp: 20, label: 'The courtyard of borrowed shadows', cursor: 'hand', svg: _wshBoardArt(), onClick: () => gardenShadowCourtyardOpen('court') });
  if (!_wsh.peg) _wsh.peg = _wshAdd({ id: 'wd-shadow-calibration', ..._wshWorldPoint(-12, -20), hit: 0, svg: '<ellipse rx="6" ry="2" fill="#8d825c"/><path d="M0 0V-20" stroke="#b2995d" stroke-width="1.3"/><circle cy="-20" r="4" fill="none" stroke="#b2995d" stroke-width="1.4"/>' });
  if (!_wsh.lamp) _wsh.lamp = _wshAdd({ id: 'wd-shadow-lantern', ...c, hit: .4, hitUp: 126, label: 'The courtyard lantern — slide or raise the flame', cursor: 'hand', svg: _wshLampArt(), onClick: () => gardenShadowCourtyardOpen('lantern') });
  for (let i = 0; i < 3; i++) if (!_wsh.pieces[i]) _wsh.pieces[i] = _wshAdd({ id: 'wd-shadow-' + WSH_PIECES[i].id, ...c, hit: .4, hitUp: WSH_PIECES[i].z, label: WSH_PIECES[i].name + ' — slide and turn its silhouette', cursor: 'hand', svg: _wshPieceArt(i), onClick: () => gardenShadowCourtyardOpen(WSH_PIECES[i].id) });
}
function _wshBindings(S) { if (!S || !S.node || !S.node.isConnected || S._off) return null; let b = S.shadowNodes; if (b && b.root === S.node) return b; b = { root: S.node, attrs: {}, nodes: {} }; for (const name of ['pole', 'pole-light', 'lamp-head', 'flame', 'cutout', 'ring', 'halo', 'title', 'shadow0', 'shadow1', 'shadow2', 'life0', 'life1', 'life2', 'ray0', 'ray1', 'ray2']) b.nodes[name] = S.node.querySelector('.wsh-' + name); S.shadowNodes = b; return b; }
function _wshAttr(b, key, attr, value) { const n = b && b.nodes[key], k = key + ':' + attr; if (n && b.attrs[k] !== value) { b.attrs[k] = value; n.setAttribute(attr, value); } }
function _wshApply() {
  if (!_wsh.row || !_wsh.centre) return;
  if (!_wsh.floor || !_wsh.lamp || _wsh.pieces.length !== 3) return;
  const roots = [_wsh.floor.node, _wsh.lamp.node, ..._wsh.pieces.map(S => S.node)];
  if (_wsh.paintSig === _wsh.sig && roots.every((n, i) => n && n.isConnected && n === _wsh.paintRoots[i])) return;
  const row = _wsh.row, g = _wshGeometry(row), f = _wshBindings(_wsh.floor), l = _wshBindings(_wsh.lamp);
  Object.assign(_wsh.lamp, _wshWorldPoint(g.lamp.x, g.lamp.y)); _wsh.lamp.hitUp = g.lamp.z;
  _wshAttr(l, 'pole', 'd', `M0 -6V${-g.lamp.z}`); _wshAttr(l, 'pole-light', 'd', `M-1 -6V${-g.lamp.z}`); _wshAttr(l, 'lamp-head', 'transform', `translate(0 ${-g.lamp.z})`);
  _wshAttr(f, 'ring', 'transform', `translate(${g.ring.x.toFixed(3)} ${g.ring.y.toFixed(3)}) scale(${g.ring.scale.toFixed(4)})`);
  _wshAttr(f, 'ring', 'stroke', g.calibration.fit ? '#39786b' : '#4d6755');
  for (let i = 0; i < 3; i++) {
    const p = g.pieces[i], S = _wsh.pieces[i], b = _wshBindings(S); Object.assign(S, _wshWorldPoint(p.point.x, p.point.y));
    _wshAttr(b, 'cutout', 'transform', `rotate(${row[3 + i * 2] * 45})`);
    _wshAttr(f, 'shadow' + i, 'transform', `translate(${p.shadow.x.toFixed(3)} ${p.shadow.y.toFixed(3)}) rotate(${(p.angle * 180 / Math.PI).toFixed(1)}) scale(${p.shadow.scale.toFixed(4)})`);
    _wshAttr(f, 'ray' + i, 'd', `M${g.lamp.x} ${g.lamp.y - g.lamp.z}L${p.shadow.x.toFixed(3)} ${p.shadow.y.toFixed(3)}`);
    _wshAttr(f, 'shadow' + i, 'opacity', p.fit ? '.88' : '.64');
  }
  if (f && f.nodes.title) { const title = row[8] ? 'THE BORROWED HERON' : 'BORROWED SHADOWS'; if (f.nodes.title.textContent !== title) f.nodes.title.textContent = title; }
  if (roots.every(n => n && n.isConnected)) { _wsh.paintSig = _wsh.sig; _wsh.paintRoots = roots; }
}
function _wshClearSprites() { if (_wshTalkOwn(_wsh.talk)) wdTalkClose(true); _wsh.talk = null; for (const S of _wsh.sprites) S.remove(); _wsh.sprites = []; _wsh.floor = _wsh.lamp = _wsh.board = _wsh.peg = null; _wsh.pieces = []; _wsh.paintSig = ''; _wsh.paintRoots = []; }
function _wshSync(m) {
  if (m.visit && _wsh.centre) { const a = _wdTheir(m).sa; if (!a || _wsh.centre.x !== a[0] / 100 || _wsh.centre.y !== a[1] / 100) { _wshClearSprites(); _wsh.centre = null; _wsh.probeAt = 0; } }
  _wshBuild(); const row = _wshRead(m), sig = row.join(','); if (sig !== _wsh.sig) { _wsh.row = row.slice(); _wsh.sig = sig; _wsh.revision++; } _wshApply(); if (_wsh.talk) _wshPanel();
}
function _wshTalkOwn(T) { return !!(T && _wsh.talk === T && _wd.talk === T && T.el.isConnected); }
function _wshNear() { return !!(_wsh.centre && !_wshIndoor() && wdNear(_wsh.centre.x, _wsh.centre.y, 4.4)); }
function _wshAct(T, index, delta) {
  if (!_wshTalkOwn(T) || !_wshNear() || _wshHeld()) return;
  const m = gardenHere(); if (m.visit || _wsh.row[8]) return;
  const row = _wsh.row.slice(), limit = index < 2 ? 2 : index % 2 ? 7 : 4;
  row[index] = index >= 3 && index % 2 ? (row[index] + delta + 8) % 8 : Math.max(0, Math.min(limit, row[index] + delta));
  if (row[index] === _wsh.row[index]) return;
  const solved = _wshGeometry(row).solved; if (solved) { row[8] = 1; _wsh.pulse = 5; wdSound([[523.25, .5, 'sine', .015], [659.25, .65, 'sine', .013, .13], [783.99, 1, 'sine', .012, .28]]); }
  _wdSet('shadow.court', row); _wshSync(m); if (typeof _gwEnsureLoop === 'function') _gwEnsureLoop();
}
function _wshFeedback(g) { return g.fit ? 'Its shadow fills the engraved outline.' : 'Move its shadow ' + g.direction + '; ' + g.size + '; ' + (g.turn === 'right way up' ? g.turn : 'turn ' + g.turn) + '.'; }
function _wshPanel() {
  const T = _wsh.talk; if (!_wshTalkOwn(T) || !_wsh.row) { _wsh.talk = null; return; }
  const m = gardenHere(), row = _wsh.row, g = _wshGeometry(row), key = _wsh.selection, i = WSH_PIECES.findIndex(p => p.id === key), actions = [];
  let text;
  if (row[8]) { text = 'A heron beneath a copper moon, with reeds at the bridge. The borrowed shadows have found their picture. The lantern keeps this little theatre readable in daylight and after dark.' + (m.visit ? ' This is your host\u0027s restored courtyard; enjoying it leaves their arrangement untouched.' : ' The finished arrangement stays in your garden.'); actions.push({ label: 'Set the shadows dancing', run: () => { if (_wshTalkOwn(T) && _wshNear() && !_wshHeld()) { _wsh.pulse = 6; wdSound([[392, .6, 'sine', .009], [587.33, .8, 'sine', .008, .2]]); if (typeof _gwEnsureLoop === 'function') _gwEnsureLoop(); } } }); }
  else if (key === 'lantern') {
    text = 'The flame is on rail ' + (row[0] + 1) + ' of 3, at height ' + (row[1] + 1) + ' of 3. Calibration ring: ' + (g.calibration.fit ? 'centred and right size.' : g.calibration.size + '; move its shadow ' + g.calibration.direction + '.') + ' Raising the flame shrinks every shadow. Sliding the flame pushes shadows the opposite way. Centre the small shadow ring on its four engraved ticks first.';
    if (!m.visit) actions.push({ label: 'Slide lantern left', run: () => _wshAct(T, 0, -1) }, { label: 'Slide lantern right', run: () => _wshAct(T, 0, 1) }, { label: 'Lower lantern', run: () => _wshAct(T, 1, -1) }, { label: 'Raise lantern', run: () => _wshAct(T, 1, 1) });
  } else if (i >= 0) {
    const p = g.pieces[i]; text = p.name + ', rail position ' + (row[2 + i * 2] + 1) + ' of 5. ' + _wshFeedback(p) + ' Sliding moves the raised cutout and its shadow together; turning changes the outline. ' + g.fits + ' of 3 contours fitted.';
    if (!m.visit) actions.push({ label: 'Slide toward rail start', run: () => _wshAct(T, 2 + i * 2, -1) }, { label: 'Slide toward rail end', run: () => _wshAct(T, 2 + i * 2, 1) }, { label: 'Turn counterclockwise', run: () => _wshAct(T, 3 + i * 2, -1) }, { label: 'Turn clockwise', run: () => _wshAct(T, 3 + i * 2, 1) });
  } else text = 'The stone is engraved with a heron, a crescent moon and reeds at a bridge. A raised lantern projects the three brass cutouts onto it. First match the small calibration ring using the lantern\u0027s height and side rail; then slide and turn each cutout until its shadow fills its outline. The cutouts are raised to different heights, so moving the flame changes their shadows by different amounts. There is no clock, weather requirement or entry cost. ' + g.fits + ' of 3 contours fitted.';
  if (m.visit && !row[8]) text += ' You can inspect every projection, but only this garden\u0027s owner can move the mechanism.';
  if (key !== 'court' && !row[8]) actions.push({ label: 'Read the engraving', run: () => { if (_wshTalkOwn(T)) { _wsh.selection = 'court'; _wshPanel(); } } });
  const signature = key + '|' + text + '|' + actions.map(a => a.label).join(';'); if (T.shadowSignature === signature) return; T.shadowSignature = signature; T.say(text, actions);
}
function gardenShadowCourtyardOpen(selection) {
  if (!_wshNear()) return; const m = gardenHere(); _wshSync(m); _wsh.selection = selection || 'court';
  let T; T = wdTalk({ name: 'The courtyard of borrowed shadows', at: _wsh.centre, lines: ['Brass, stone and a lantern that keeps its own small afternoon.'], bye: 'Leave the courtyard', onClose() { if (_wsh.talk === T) _wsh.talk = null; } }); _wsh.talk = T; _wshPanel();
}
function _wshFrame(dt) {
  if (_wshHeld()) return;
  const env = _wshEnv(), motion = typeof gardenMotionOn !== 'function' || gardenMotionOn(), time = env && Number.isFinite(env.ambientTime) ? env.ambientTime / 1000 : _wd.t;
  _wsh.pulse = Math.max(0, _wsh.pulse - Math.max(0, Math.min(.1, dt || 0))); _wshApply();
  const f = _wshBindings(_wsh.floor), l = _wshBindings(_wsh.lamp), restored = !!(_wsh.row && _wsh.row[8]), pulse = _wsh.pulse;
  if (f && f.root.target && !f.root.target.visible && !pulse) return;
  for (let i = 0; i < 3; i++) _wshAttr(f, 'life' + i, 'transform', `rotate(${(restored && motion ? Math.sin(time * (.7 + i * .15) + i) * (pulse ? 2.2 : .65) : 0).toFixed(2)})`);
  _wshAttr(f, 'halo', 'opacity', restored ? (motion ? .32 + Math.sin(time * 1.3) * .08 + Math.min(1, pulse) * .28 : .4).toFixed(2) : '0');
  _wshAttr(l, 'flame', 'transform', `scale(1 ${(motion ? 1 + Math.sin(time * 3.1) * .045 : 1).toFixed(3)})`);
}
/** Current controls and the same contour feedback a player can read in-world. */
function gardenShadowCourtyardState() {
  const m = gardenHere(), row = _wshRead(m), g = _wshGeometry(row), target = S => S ? { id: S.id, x: S.x, y: S.y, hitUp: S.hitUp || 0, attached: !!S.node && S.node.isConnected } : null;
  return { visit: !!m.visit, restored: !!row[8], arrangement: row.slice(), centre: _wsh.centre && { ..._wsh.centre }, board: target(_wsh.board), lantern: { ...target(_wsh.lamp), calibration: g.calibration }, pieces: g.pieces.map((p, i) => ({ ...target(_wsh.pieces[i]), name: p.name, direction: p.direction, size: p.size, turn: p.turn, fit: p.fit, feedback: _wshFeedback(p) })), fitted: g.fits, viewing: _wshTalkOwn(_wsh.talk), selection: _wsh.selection, paused: _wshHeld(), pulse: _wsh.pulse, revision: _wsh.revision };
}
wdMod({ id: 'shadow-courtyard', fun: false, visit: true,
  begin(m) { _wsh.centre = null; _wsh.row = null; _wsh.sig = _wsh.paintSig = ''; _wsh.paintRoots = []; _wsh.sprites = []; _wsh.floor = _wsh.lamp = _wsh.board = _wsh.peg = null; _wsh.pieces = []; _wsh.talk = null; _wsh.pulse = 0; _wsh.probeAt = 0; _wshSync(m); },
  painted: _wshSync, tick: _wshSync, frame: _wshFrame,
  end() { _wshClearSprites(); _wsh.pulse = 0; _wsh.row = null; _wsh.centre = null; _wsh.sig = ''; },
});
if (window.GardenActivityCamera) GardenActivityCamera.define('shadow-courtyard', () => {
  if (!_wshTalkOwn(_wsh.talk) || !_wsh.centre || _wshIndoor()) return null;
  const p = _wshWorldPoint(-117, -205); return { id: 'shadow-courtyard', insetBottom: GardenActivityCamera.panelInset(_wsh.talk.el, _gw.box), bounds: { x: p.x * GARDEN_WORLD.cellW, y: GARDEN_WORLD.sky + p.y * GARDEN_WORLD.cellH, width: 234, height: 286 } };
}, 35);
gardenPlayAdd({ id: 'shadow-courtyard', name: 'Borrowed shadows', icon: 'lamp', group: 'secret', blurb: 'Move the lantern and raised brass cutouts until their projected shadows fill a heron, moon and reed scene.', status: () => { const s = gardenShadowCourtyardState(); return s.restored ? 'A restored shadow theatre' : s.fitted + ' of 3 contours fitted'; }, open() { if (_wshPlace()) gardenWalkAct(_wshWorldPoint(-88, 10), () => gardenShadowCourtyardOpen('court'), { radius: 2.5, near: 70 }); else wdWhisper('The courtyard needs a clear approach on the village pond path.', 5000); } });
