/* ============================================================
   GARDEN WONDER, the High orchard's two shortcuts (round 3 layouts, assets/garden/vale-orchard.json; fix round 1).
   - The lakeside hurdle stands in the gap in the orchard bank where the steps come up from the lake. It is pegged from the
     orchard side: come down to it from the orchard and you lift it aside, and from then on the steps are a short way
     between the lake walk and the pass.
   - The cliff gate stands at the foot of the cliff steps, where they climb the rock face at the head of the cove. It is
     tied from the top: come along the cliff walk to the pippin and you untie it, and the cove and the cliff top are
     joined from then on.
   Shut, each stops the feet across its gap (a hurdle, a gate tied with rope: you see why); open, it stands aside for
   good. The cliff face itself, with the blackthorn along the cliff top's edge, stops the feet always. In your own garden
   only: in a friend's garden both stand open. The state is one ledger line each ('sc.' + id), saved with the garden.
   ============================================================ */
const GARDEN_ORCHARD_SHORTCUTS = Object.freeze([
  // (layfix east) the steps climb straight up the screen from the footbridge between the lake and the fence, and the hurdle stands
  // square across their head, seen face on (set on the slant beside a flight that ran up the bank it read as a side rail): one
  // box across the gap from the water to the fence. From the orchard side: above it.
  Object.freeze({ id: 'hurdle', pres: 'hurdle', name: 'The lakeside hurdle', box: [59.68, 38.62, 61.12, 38.92], at: [60.4, 38.86],
    from: (x, y) => y < 38.6 && y > 36.9 && x > 59.6 && x < 63.4,
    open: 'You lift the hurdle aside. The steps down to the lake are a short way now.', shut: 'A hurdle across the steps, pegged from the orchard side.' }),
  Object.freeze({ id: 'cliff', pres: 'cliffGate', name: 'The cliff gate', box: [85.2, 40.42, 87.12, 40.72], at: [86.15, 40.55], from: (x, y) => y < 40.4 && y > 38.2 && Math.abs(x - 86.2) < 1.3,
    open: 'You untie the cliff gate and swing it back. The steps go down to the cove now.', shut: 'A little gate, its rope knotted on the cliff side. Someone untied it from the top, once.' }),
]);
/** The cliff at the head of the cove (east of the steps to the sea, and the nick west of them) and the blackthorn along the
 *  cliff top's edge above the beach walk: always solid, drawn by the orchard painter (94-garden-paint-vale-1orchard.js 1e). */
const GARDEN_ORCHARD_CLIFF = Object.freeze([
  // (the hurdle fence either side of the lakeside hurdle is the orchard painter's, its feet solid through GardenPaintVale.feet)
  // (vale layouts merge: the box east of the steps, 87.12 to 91.5, is gone: the coast ends at 87.15 there, so it stood only over
  //  the sea, where nothing is drawn standing and the sea stops the feet anyway; the steps fill the face from the nick to the coast)
  Object.freeze({ box: [84.95, 40.3, 85.2, 40.8], src: 'the cliff at the head of the cove' }),
  Object.freeze({ box: [85.05, 36.5, 85.45, 40.35], src: 'blackthorn on the cliff top' }),
]);
function _gscOrchard() { const D = typeof gardenIslandData === 'function' ? gardenIslandData() : null; return D && D.version >= 5 && D.presentation && D.presentation.orchard || null; }
function gardenShortcutOpen(id) { try { const m = typeof gardenHere === 'function' ? gardenHere() : null; if (m && m.visit) return true; const g = _gdG(); return !!(g && g.led && g.led['sc.' + id]); } catch (e) { return true; } }
/** What stops the feet: the shut shortcuts and the cliff, [{x0, y0, x1, y1, src}] in cells (94-garden-world-0walk.js). */
function gardenOrchardShortcutBlocks() {
  const O = _gscOrchard(); if (!O) return [];
  const out = GARDEN_ORCHARD_CLIFF.map(c => ({ x0: c.box[0], y0: c.box[1], x1: c.box[2], y1: c.box[3], src: c.src }));
  for (const s of GARDEN_ORCHARD_SHORTCUTS) if (O[s.pres] && !gardenShortcutOpen(s.id)) for (const b of s.boxes || [s.box]) out.push({ x0: b[0], y0: b[1], x1: b[2], y1: b[3], src: s.name.toLowerCase() + ' (shut)' });
  return out;
}
/** A signature of the shortcuts' state, so the walking grid is made again when one opens. */
function gardenOrchardShortcutSig() { return _gscOrchard() ? GARDEN_ORCHARD_SHORTCUTS.map(s => gardenShortcutOpen(s.id) ? 1 : 0).join('') : ''; }

// their pictures: a woven hazel hurdle and a little ash field gate, shut across the gap or stood aside
function _gscArt(id, open) {
  const post = (x, y, h) => `<rect x="${x - 2.2}" y="${y - h}" width="4.4" height="${h}" rx="1" fill="#6a5034"/><rect x="${x - 2.2}" y="${y - h}" width="1.5" height="${h}" fill="#9a7a54"/><ellipse cx="${x + 2}" cy="${y + .6}" rx="5" ry="1.6" fill="#22301a" opacity=".3"/>`;
  if (id === 'hurdle') {
    // (fix round 2) the gap runs up the screen, so a hurdle set straight along it was seen end on, a thin stick. It stands
    // across the gap on the slant, from the fence post by the bank's end to the post by the outlet, so its woven face shows:
    // a panel of hazel rods woven through upright sails, a lit binding along its top, its shadow on the steps.
    const panel = (x0, y0, x1, y1, h) => {
      let s = `<path d="M${x0 + 4} ${y0 + 2}L${x1 + 10} ${y1 + 3}L${x1 + 20} ${y1 + 1}L${x0 + 14} ${y0}Z" fill="#22301a" opacity=".2"/>`;
      s += `<path d="M${x0} ${y0}L${x1} ${y1}L${x1} ${y1 - h}L${x0} ${y0 - h}Z" fill="#7a5a34"/>`;
      for (let k = 0; k < 7; k++) { const o = 2.5 + k * (h - 4) / 6; s += `<path d="M${x0} ${y0 - o}L${x1} ${y1 - o}" stroke="${k % 2 ? '#c49a62' : '#a07a4a'}" stroke-width="3.2" stroke-linecap="round"/>`; }
      for (let k = 1; k < 7; k++) { const t = k / 7, y = y0 + (y1 - y0) * t, x = x0 + (x1 - x0) * t; s += `<path d="M${x} ${y + 1}V${y - h - 3}" stroke="#4e3620" stroke-width="1.8"/>`; }
      s += `<path d="M${x0} ${y0 - h - 1}L${x1} ${y1 - h - 1}" stroke="#d8b47a" stroke-width="2.4" stroke-linecap="round"/>`;
      return s;
    };
    const A = [-33, 0], Bp = [33, 0], H = 24;   // (layfix east: square across the head of the flight, the water's edge to the fence)
    if (open) return `${post(A[0], A[1], H + 6)}${post(Bp[0], Bp[1], H + 6)}<ellipse cx="${Bp[0] + 10}" cy="${Bp[1] + 6}" rx="18" ry="3" fill="#22301a" opacity=".22"/>${panel(Bp[0] + 2, Bp[1] - 14, Bp[0] + 24, Bp[1] + 8, 20)}`;
    // shut: a peg through its top binding into the post on the orchard side, with a twist of withy
    return `${post(A[0], A[1], H + 6)}${panel(A[0], A[1], Bp[0], Bp[1], H)}${post(Bp[0], Bp[1], H + 6)}<path d="M${Bp[0] - 4} ${Bp[1] - H + 2}h9" stroke="#e8d2a0" stroke-width="2.6" stroke-linecap="round"/><path d="M${Bp[0] + 2} ${Bp[1] - H - 3}q4 4 0 8" stroke="#c9b07a" stroke-width="1.6" fill="none"/>`;
  }
  // the cliff gate: seen face on across the steps; shut, a rope knotted round its latch post; open, swung back against the rock
  const bars = (x0, x1, top, bot) => [0, 1, 2, 3].map(k => `<path d="M${x0} ${bot - 3 - k * (bot - top - 6) / 3}H${x1}" stroke="${k % 2 ? '#c2b08a' : '#a8946c'}" stroke-width="2.6" stroke-linecap="round"/>`).join('') + `<path d="M${x0 + 2} ${bot - 3}L${x1 - 2} ${top + 3}" stroke="#a8946c" stroke-width="2.4"/>`;
  return open ? `${post(-44, 0, 30)}${post(44, 0, 30)}<g transform="translate(-44 0) skewY(14) scale(.34 1)">${bars(0, 84, -24, -2)}</g>`
    : `<ellipse cx="0" cy="2" rx="46" ry="3" fill="#22301a" opacity=".22"/>${post(-44, 0, 30)}${post(44, 0, 30)}${bars(-42, 42, -24, -2)}<path d="M38 -16c6 -3 9 2 6 5c-3 3 -8 1 -6 -3M42 -11q2 6 -2 9" stroke="#c9b07a" stroke-width="2" fill="none"/>`;
}
const _wsc = { S: new Map(), said: new Set() };
function _wscPlace(s, open) {
  const old = _wsc.S.get(s.id); if (old && old._open === open) return;
  if (old) { old.remove(); _wsc.S.delete(s.id); }
  const [x, y] = s.at;
  const S = wdSprite({ id: 'sc-' + s.id, x: x + (open && s.id === 'hurdle' ? .2 : 0), y: y + (s.id === 'hurdle' ? 0 : .12), still: true, hit: 1.1, hitUp: 10, label: s.name, cursor: 'hand', svg: _gscArt(s.id, open),
    onClick: () => { if (open) gardenMessage(s.name + ': open. ' + s.open.replace(/^You [^.]*\. /, ''), { ms: 3500 }); else if (!_wscTry(s)) gardenMessage(s.shut, { ms: 4000 }); } });
  S._open = open; _wsc.S.set(s.id, S);
}
/** Open it, from its own side. True when it opened. */
function _wscTry(s) {
  const m = typeof gardenHere === 'function' ? gardenHere() : null; if (!m || m.visit || gardenShortcutOpen(s.id) || typeof _gw === 'undefined' || !s.from(_gw.px, _gw.py)) return false;
  const g = _gdG(); g.led['sc.' + s.id] = { d: _gdToday(), k: 'sc', n: 1 }; _gdSave();
  if (typeof _glFx === 'function') _glFx(s.at[0], s.at[1], 'sparkle', { lift: 12 }); if (typeof _glSound === 'function') _glSound('twinkle');
  gardenMessage(s.open, { ms: 4500 });
  _wscPlace(s, true);
  if (typeof _gw !== 'undefined') _gw.grid = null;   // (the walking grid is made again without its block)
  return true;
}
wdMod({
  id: 'orchard-shortcuts', fun: false,
  begin(m) { _wsc.S.clear(); _wsc.said.clear(); },
  tick(m) {
    const O = _gscOrchard(); if (!O) return;
    for (const s of GARDEN_ORCHARD_SHORTCUTS) {
      if (!O[s.pres]) continue;
      const open = m.visit ? true : gardenShortcutOpen(s.id);
      if (typeof gardenAreaOpenAt === 'function' && !gardenAreaOpenAt(Math.floor(s.at[0]), Math.floor(s.at[1]))) { const S = _wsc.S.get(s.id); if (S) { S.remove(); _wsc.S.delete(s.id); } continue; }
      _wscPlace(s, open);
      if (open || m.visit || !wdNear(s.at[0], s.at[1], 1.6)) continue;
      if (_wscTry(s)) continue;
      if (!_wsc.said.has(s.id)) { _wsc.said.add(s.id); gardenMessage(s.shut, { ms: 4000 }); }
    }
  },
  end() { for (const S of _wsc.S.values()) S.remove(); _wsc.S.clear(); },
});
