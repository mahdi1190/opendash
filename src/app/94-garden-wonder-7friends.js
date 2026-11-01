/* ============================================================
   GARDEN WONDER, friends in the landscape (docs/dev/HUNDRED_WORLD.md, rows 15 to 17). Nothing new is sent but one thing, and that goes through the sealed `garden:act`, its strict schema and its daily caps.
     Far lights: one small lamp per friend on the water after dusk, from the snapshots you already hold. No feed, no counts.
     The cairn: a stone is the react id `stone`. It stays. Saved: st.<message id> = {f, d} (a friend id and a day, never a name). A visitor sees how many from the snapshot's wd.st.
     A hidden parcel: the existing gift with x and y (a person with an older app gets an ordinary parcel). It can always be opened from the post box too, so nothing is lost by not finding it.
   ============================================================ */
const _wdl = { lamps: new Map(), cairn: null, glint: null, parcel: null, hideOn: false, added: 0, scanT: 0, lampT: 0 };
function _wdFriendRows() {
  const d = typeof gardenSocialView === 'function' ? gardenSocialView() : null; if (!d || !d.gardens || typeof _gscFriendList !== 'function') return [];
  try { return _gscFriendList().filter(f => d.gardens[f.id]).map(f => ({ id: f.id, name: _gscFirst(f.id), at: d.gardens[f.id].at || 0 })).sort((a, b) => String(a.id).localeCompare(String(b.id))).slice(0, 6); } catch (e) { return []; }
}
/* ---------- far lights ---------- */
function _wdLampSvg() { const A = GART; return A.P('#000000', A.ell(0, 1, 6, 1.6), 0.25) + A.S('#3a3024', 1.8, 'M0 0L0 -20') + A.P('#3a3024', A.rrect(-3.4, -28, 6.8, 8, 1)); }
function _wdLampsSync(m) {
  const on = m.tod === 'dusk' || m.tod === 'night', rows = on ? _wdFriendRows() : [], keep = new Set(rows.map(r => r.id));
  for (const [id, L] of _wdl.lamps) if (!keep.has(id)) { L.S.remove(); wdGlowOff('lamp-' + id); _wdl.lamps.delete(id); }
  const A = WD_AT.farShore, n = rows.length;
  rows.forEach((r, i) => {
    const lit = !!r.at && _gdDayOf(r.at) === m.today, x = A.x0 + (A.x1 - A.x0) * (n > 1 ? i / (n - 1) : 0.5), y = A.y + (gardenHash(r.id) % 5) * 0.28;
    let L = _wdl.lamps.get(r.id);
    if (!L) {
      L = { S: wdSprite({ id: 'wd-lamp-' + r.id, x, y, z: y, still: true, hit: 0.7, hitUp: 22, label: r.name + '’s lamp', cursor: 'hand', svg: _wdLampSvg(), onAim: () => _wdLampTalk(r.id) }) };
      _wdl.lamps.set(r.id, L);
    }
    if (lit) wdGlow('lamp-' + r.id, '<circle class="wd-lamp-g" cy="-24" r="17" fill="#ffc768" opacity="0.2"/><circle cy="-24" r="6" fill="#ffd98a" opacity="0.5"/><circle cy="-24" r="2.6" fill="#fff6d0"/><path d="M-5 6h10M-3 12h6" stroke="#ffd98a" stroke-width="1.2" opacity="0.4"/>', x, y); else wdGlowOff('lamp-' + r.id);
  });
}
function _wdLampTalk(id) {
  const r = _wdFriendRows().find(x => x.id === id); if (!r) return;
  const lit = !!r.at && _gdDayOf(r.at) === _wdToday();
  wdTalk({ lines: [lit ? `${r.name}’s lamp. It is lit: they have been about today.` : `${r.name}’s lamp is out for now. It will be lit again the next time they are about.`], actions: [{ label: 'Row over', primary: true, run: () => { wdTalkClose(true); setView('garden:visit:' + id); } }], bye: 'Leave it' });
}
/* ---------- the cairn ---------- */
function _wdCairnSvg(n) {
  const A = GART; let s = A.P('#000000', A.ell(0, 0.5, 13, 3), 0.16), y = 0;
  const cols = ['#9a958a', '#aca69a', '#8a8578', '#b6b0a2', '#7e796e'], rows = Math.max(1, Math.min(14, n));
  for (let i = 0; i < rows; i++) { const h = gardenHash('stone' + i), w = Math.max(3.4, 11.5 - i * 0.7) + (h % 3) * 0.5, hh = 2.6 + (h % 3) * 0.5, dx = ((h >> 3) % 5) * 0.5 - 1; y -= hh * 0.8; s += A.P(cols[h % cols.length], A.ell(dx, y, w, hh)); }
  return s;
}
function _wdStoneList() { const W = _wdG(); return Object.keys(W).filter(k => k.startsWith('st.')).map(k => W[k]).filter(Boolean); }
function _wdCairnScan() {
  const d = typeof gardenSocialView === 'function' ? gardenSocialView() : null; if (!d || !Array.isArray(d.inbox)) return;
  const W = _wdG(); let more = false;
  for (const a of d.inbox) if (a && a.t === 'react' && a.e === 'stone' && a.dir === 'in' && !W['st.' + a.id]) { W['st.' + a.id] = { f: a.f, d: a.d }; more = true; }
  if (more) { _wdSave(); _gdEmit('wonder', { what: 'stone' }); }
}
function _wdCairnSync(m) {
  const n = m.visit ? (Number(_wdTheir(m).st) || 0) + _wdl.added : _wdStoneList().length;
  if (!n && !m.visit) { if (_wdl.cairn) { _wdl.cairn.remove(); _wdl.cairn = null; } return; }
  const svg = _wdCairnSvg(n);
  if (!_wdl.cairn) _wdl.cairn = wdSprite({ id: 'wd-cairn', x: WD_AT.cairn.x, y: WD_AT.cairn.y, still: true, hit: 0.6, hitUp: 8, label: m.visit ? 'A cairn' : 'Your cairn', cursor: 'hand', svg, onClick: () => _wdCairnTalk() });
  else wdArt(_wdl.cairn, svg);
}
function _wdCairnTalk() {
  const m = gardenHere(), at = { x: WD_AT.cairn.x, y: WD_AT.cairn.y };
  if (m.visit) {
    const fid = _wdFriendId(), W = _wdG(), done = W['sg.' + fid] === _wdToday(), n = (Number(_wdTheir(m).st) || 0) + _wdl.added;
    const who = fid && typeof _gscFirst === 'function' ? _gscFirst(fid) : 'your friend';
    wdTalk({ at, lines: [n ? `${_wdPlural(n, 'stone')} left here by people passing through. It only ever gets taller.` : 'A flat place, where a cairn could start.'], actions: done ? [] : [{ label: `Add a stone for ${who}`, primary: true, run: async (T) => {
      if (!fid || typeof gardenSocialAct !== 'function') return;
      const r = await gardenSocialAct(fid, 'react', { e: 'stone' }, { quiet: true });
      if (!r) { T.say('It would not stay. They may not be taking visits just now. Try again later.', []); return; }
      W['sg.' + fid] = _wdToday(); _wdl.added++; _wdSave(); _wdCairnSync(gardenHere());
      wdSound([[300, 0.14, 'triangle', 0.05], [220, 0.12, 'triangle', 0.05, 0.08]]);
      T.say('You put it on the top. It stays there. They will see it when they next come by.', []);
    } }], bye: done ? 'Leave it' : 'Not today' });
    return;
  }
  const list = _wdStoneList(), by = new Map();
  for (const s of list) by.set(s.f, (by.get(s.f) || 0) + 1);
  const names = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([f, c]) => `${typeof _gscFirst === 'function' ? _gscFirst(f) : 'A friend'} (${c})`);
  wdTalk({ at, lines: [`${_wdPlural(list.length, 'stone')}, left by ${names.join(', ')}. You didn’t build this. People just stopped here.`], bye: 'Leave it' });
}
/* ---------- a parcel, hidden ---------- */
/** The tick box in the gift menu, on a visit only. */
function gardenWonderHideRow() {
  if (typeof gardenVisitOn !== 'function' || !gardenVisitOn()) return null;
  const l = document.createElement('label'); l.className = 'wd-hide-row';
  const c = document.createElement('input'); c.type = 'checkbox'; c.checked = _wdl.hideOn; c.onchange = () => { _wdl.hideOn = c.checked; };
  l.appendChild(c); l.appendChild(_gdpEl('span', null, 'Hide it where I am standing, for them to find'));
  return l;
}
function gardenWonderHideAt() {
  if (!_wdl.hideOn || typeof gardenVisitOn !== 'function' || !gardenVisitOn() || typeof _gw === 'undefined') return null;
  return { x: Math.max(0, Math.min(63, Math.floor(_gw.px))), y: Math.max(0, Math.min(63, Math.floor(_gw.py))) };
}
function _wdLandmark(x, y) { let best = '', bd = 1e9; for (const p of GARDEN_PROPS) { if (!p.name || p.needs || p.id === 'forest-edge') continue; const d = Math.hypot(p.x + p.w / 2 - x, p.y + p.h / 2 - y); if (d < bd) { bd = d; best = p.name; } } return best ? best.replace(/^The /, 'the ').replace(/^([A-Z])/, (c) => 'the ' + c.toLowerCase()) : 'the lane'; }
function _wdHiddenParcels() { const d = typeof gardenSocialView === 'function' ? gardenSocialView() : null; return d && Array.isArray(d.pending) ? d.pending.filter(a => a && a.t === 'gift' && a.dir === 'in' && Number.isInteger(a.x) && Number.isInteger(a.y) && !(_gdG().led['gg.' + a.id])) : []; }
function _wdParcelTick() {
  const W = _wdG(), list = _wdHiddenParcels();
  for (const a of list) if (!W['ht.' + a.id]) { W['ht.' + a.id] = _wdToday(); _wdSave(); wdWhisper(`${typeof _gscFirst === 'function' ? _gscFirst(a.f) : 'A friend'} hid something in your garden. Somewhere near ${_wdLandmark(a.x, a.y)}.`, 8000); break; }
  if (_wdl.glint) { const a = _wdl.parcel; if (!list.some(x => x.id === a.id) || !wdNear(a.x + 0.5, a.y + 0.5, 2)) { _wdl.glint.remove(); _wdl.glint = null; _wdl.parcel = null; } return; }
  for (const a of list) {
    if (!wdNear(a.x + 0.5, a.y + 0.5, 1.5)) continue;
    _wdl.parcel = a;
    _wdl.glint = wdSprite({ id: 'wd-parcel', x: a.x + 0.5, y: a.y + 0.6, still: true, hit: 0.9, hitUp: 6, label: 'Somebody hid something here', cursor: 'hand',
      svg: `<g class="gl-gift">${GART.P('#c8a070', GART.rrect(-7, -11, 14, 11, 1.4))}${GART.P('#d84a4a', GART.rect(-1.2, -11, 2.4, 11) + GART.rect(-7, -6.6, 14, 2.2))}</g><g class="gl-twinkle" transform="translate(0 -18)"><path d="M0 -6L1.4 -1.4L6 0L1.4 1.4L0 6L-1.4 1.4L-6 0L-1.4 -1.4z" fill="#fff4b8"/></g>`,
      onClick: () => { const p = _wdl.parcel; if (!p) return; const who = typeof _gscFirst === 'function' ? _gscFirst(p.f) : 'A friend'; gardenSocialUnwrap(p.id); _glFx(p.x + 0.5, p.y + 0.5, 'sparkle', { lift: 14 }); _glSound('twinkle'); wdWhisper(`You found what ${who} hid.`, 5000); _wdl.glint.remove(); _wdl.glint = null; _wdl.parcel = null; } });
    break;
  }
}
wdMod({
  id: 'friends', visit: true,
  begin(m) {
    _wdl.lamps = new Map(); _wdl.cairn = null; _wdl.glint = null; _wdl.parcel = null; _wdl.added = 0; _wdl.scanT = 3; _wdl.lampT = 2;
    if (typeof gardenSocialLoad === 'function') gardenSocialLoad(false).catch(() => {});
    _wdCairnSync(m);
  },
  tick(m) {
    if (!m.visit) {
      if ((_wdl.scanT -= 1) <= 0) { _wdl.scanT = 60; _wdCairnScan(); _wdCairnSync(m); }
      if ((_wdl.lampT -= 1) <= 0) { _wdl.lampT = 20; _wdLampsSync(m); }
      else for (const [id, L] of _wdl.lamps) { const g = _wd.glows.get('lamp-' + id); if (g && !g.isConnected) { _wdl.lampT = 0; void L; } }
      _wdParcelTick();
    } else _wdCairnSync(m);
  },
  end() { for (const id of _wdl.lamps.keys()) wdGlowOff('lamp-' + id); _wdl.lamps = new Map(); _wdl.cairn = null; _wdl.glint = null; },
});
