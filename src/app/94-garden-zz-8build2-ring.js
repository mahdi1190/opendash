/* ============================================================
   BUILD 2: THE TOOL RING. Bottom middle, where the hotbar was: Hands, then every tool you carry (watering can, shears, spade, your rod
   and your net), always with you, never in a pocket. Then what is in your hand from your pockets (a seed, a decoration, compost), and your
   pockets. The owner, 21 Nov 2026: "things like a rod and net always equipped".

   Choosing a tool: tap it, or press its number (1 Hands ... 6 Net), or T for the next one (Shift+T back), or Shift and the mouse wheel.
   The plain wheel still zooms. Choosing the same tool again puts it away (Hands). The can, shears and spade are the page's own tools
   (94-garden-4page.js), so a click on a plant does what they do there. The rod and the net were always ready (click the water, click a bug);
   chosen, E or Space casts in front of you or nets the bug in reach before anything else, and the tool is in your hand on every screen:
   friends see it (look `g.t`, lib/friends/live.mjs GEAR: an older app leaves it out).
   X puts back what is in your hand; B or I opens your pockets.

     gardenB2Tools()              the ring's tools you have            gardenB2RingTool()   the one chosen ('hands' while a pocket's thing is held)
     gardenB2PickTool(id, o)      choose one (o.toggle: the same again is Hands)   gardenB2Step(d)   the next (1) or previous (-1)
     gardenB2PutBack()            what is in your hand goes back in your pockets
     gardenB2Bar(box, m)          the ring, drawn into the hotbar's place (94-garden-world-2hud.js _ghBar)
     gardenB2SlotKey(n) / gardenB2Key(ev, k) / gardenB2Wheel(dy)   numbers, T I X, Shift + wheel
     gardenB2GearLook(out)        the tool in your hand, for your figure and for friends (94-garden-fish-7gear.js gardenGearLook)
     gardenB2HeldTool(t, gear)    that tool drawn in a figure's hand (94-garden-art-g-player.js), yours or a friend's
     gardenB2Interact()           E or Space with the rod or the net chosen (94-garden-world-0walk.js gardenWorldInteract)
   ============================================================ */
function gardenB2Tools() {
  let items = {}; try { items = gardenWallet().items; } catch (e) { items = {}; }
  return GB2_TOOLS.filter(t => !t.need || Math.floor(Number(items[t.need]) || 0) > 0);
}
function gardenB2RingTool() {
  let t = 'hand'; try { t = _gdpTool(); } catch (e) { t = 'hand'; }
  const by = GB2_TOOLS.find(r => r.page === t && r.id !== 'hands' && r.id !== 'rod' && r.id !== 'net');
  if (by) return by.id;
  if (t === 'hand' && (_gb2.tool === 'rod' || _gb2.tool === 'net')) return _gb2.tool;
  return 'hands';
}
function _gb2ToolName(id) {
  try { if (id === 'rod') return gardenRod().name || 'Fishing rod'; if (id === 'net') return gardenNet().name || 'Bug net'; } catch (e) { /* the row's name */ }
  const T = GB2_TOOLS.find(t => t.id === id); return T ? T.name : '';
}
function gardenB2PickTool(id, o) {
  const tools = gardenB2Tools(); let T = tools.find(t => t.id === id); if (!T) return false;
  if (o && o.toggle && gardenB2RingTool() === id && id !== 'hands' && !_gb2HandItem()) T = tools[0];   // the same tool again: put it away
  _gb2.tool = T.id;
  try { _gdp.seed = ''; _gdp.decor = ''; _gdpPickTool(T.page); } catch (e) { /* no page */ }
  _gb2.tagT = performance.now() + 2400; clearTimeout(_gb2.tagTimer);
  _gb2.tagTimer = setTimeout(() => { _gb2.tagT = 0; _gb2RingPaint(); }, 2500);
  _gb2GearChanged(); _gb2RingPaint();
  try { if (typeof gardenSfx === 'function') gardenSfx('tab'); } catch (e) { /* quiet */ }
  return true;
}
function gardenB2Step(d) {
  const tools = gardenB2Tools(); if (!tools.length) return false;
  const i = Math.max(0, tools.findIndex(t => t.id === gardenB2RingTool()));
  return gardenB2PickTool(tools[(i + (d < 0 ? tools.length - 1 : 1)) % tools.length].id);
}
function gardenB2PutBack() {
  if (!_gb2HandItem()) return false;
  try { _gdp.seed = ''; _gdp.decor = ''; _gdpPickTool('hand'); } catch (e) { /* no page */ }
  _gb2.tool = 'hands'; _gb2GearChanged(); _gb2RingPaint();
  return true;
}
/** Your figure and friends' screens learn of the change now, not in a second. */
function _gb2GearChanged() {
  try { if (typeof _gplGearMemo !== 'undefined') _gplGearMemo.at = -1e9; } catch (e) { /* fine */ }
  try { if (typeof _gwBody === 'function' && typeof _gw !== 'undefined' && _gw.on) _gwBody(); } catch (e) { /* the next frame */ }
  try { _gdEmit('tool', { tool: gardenB2RingTool() }); } catch (e) { /* fine */ }
}
function _gb2RingPaint() { try { const box = _ghBox(); if (box) { _gh.bar = ''; _ghBar(box, gardenHere()); } } catch (e) { /* no stage */ } }

/* ---------- the keys and the wheel ---------- */
function gardenB2SlotKey(n) {
  if (!gardenB2On()) return null;
  const T = gardenB2Tools()[n - 1]; if (!T) return false;
  return gardenB2PickTool(T.id, { toggle: true });
}
function gardenB2Key(ev, k) {
  if (!gardenB2On() || ev.ctrlKey || ev.metaKey || ev.altKey) return false;
  if (k === 't' || k === 'T') { if (!ev.repeat) gardenB2Step(ev.shiftKey ? -1 : 1); return true; }
  if (k === 'i' || k === 'I') { if (!ev.repeat) gardenSlotPick('bag', true); return true; }
  if ((k === 'x' || k === 'X') && _gb2HandItem()) { gardenB2PutBack(); return true; }
  return false;
}
let _gb2WheelAt = 0;
function gardenB2Wheel(dy) {
  if (!gardenB2On() || !dy) return false;
  const now = performance.now(); if (now - _gb2WheelAt < 140) return true;
  _gb2WheelAt = now; gardenB2Step(dy > 0 ? 1 : -1); return true;
}
/** Shift and the wheel over the world step round the ring: taken on the stage, before the world's own wheel (which zooms) sees it.
 *  Over a panel, Shift and the wheel scroll as they always do. */
function _gb2WheelBind(box) {
  if (!box || box._gb2Wheel) return; box._gb2Wheel = true;
  box.addEventListener('wheel', (ev) => {
    if (!ev.shiftKey || ev.ctrlKey || ev.metaKey || !ev.target || ev.target.tagName !== 'CANVAS') return;
    if (gardenB2Wheel(ev.deltaY || ev.deltaX)) { ev.preventDefault(); ev.stopPropagation(); }
  }, { capture: true, passive: false });
}

/* ---------- the ring ---------- */
function _gb2ToolSvg(id) {
  try {
    if (id === 'hands') return _GH_GLYPH.hand;
    if (id === 'can') return _GH_GLYPH.water;
    if (id === 'shears') return gardenHas('tool:golden-shears') > 0 ? gardenIconSvg('golden-shears', { kind: 'tool', px: 34 }) : _GH_GLYPH.trim;
    if (id === 'spade') return _GH_GLYPH.dig;
    if (id === 'rod') return gardenCatchSvg('rod', gardenRod().id, 36);
    if (id === 'net') return gardenCatchSvg('net', gardenNet().id, 36);
  } catch (e) { /* the hand */ }
  return _GH_GLYPH.hand;
}
/** How many of a thing are in your pockets. */
function _gb2InPockets(v, item) { let n = 0; for (const e of v.slots) if (e && e.i === item) n += e.n; return n; }
function gardenB2Bar(box, m) {
  if (!gardenB2On()) return false;
  const v = gardenB2View(), cur = gardenB2RingTool(), held = _gb2HandItem(), tools = gardenB2Tools(), tag = _gb2.tagT > performance.now();
  let rid = '', nid = ''; try { rid = gardenRod().id; nid = gardenNet().id; } catch (e) { /* none */ }
  const heldN = held ? _gb2InPockets(v, held) : 0;
  const key = ['gb2', cur, held, heldN, v.used, v.size, tools.map(t => t.id).join(','), tag ? 1 : 0, rid, nid, m && m.visit ? 1 : 0, _gh.bag ? 1 : 0, gardenHas('tool:golden-shears') > 0 ? 1 : 0, typeof _gdp !== 'undefined' && _gdp.moving ? _gdp.moving.uid : '', v.slots.some(e => e && e.i === 'decor:storage-chest') && typeof _gb2ChestOut === 'function' && !_gb2ChestOut() ? 'c' : ''].join('|');
  const el = _ghHost(box, 'gd-toolbar gd-hotbar');
  if (_gh.bar === key && el.firstChild && el.classList.contains('gb2-on')) return true;
  _gh.bar = key;
  const mid = (tools.length - 1) / 2;
  let html = '<div class="gb2-ring" role="group" aria-label="Your tools">';
  tools.forEach((t, i) => {
    const on = !held && cur === t.id, name = _gb2ToolName(t.id), a = (i - mid).toFixed(2);
    html += `<button type="button" class="gd-slot gb2-tool" data-gb2-tool="${t.id}" data-tool="${t.page}" style="--a:${a}" aria-pressed="${on ? 'true' : 'false'}" aria-label="${escAttr(name)} (${i + 1})" data-tip="${escAttr(name + ' (' + (i + 1) + '): ' + t.says)}"><kbd>${i + 1}</kbd><span class="gb2-tool-art">${_gb2ToolSvg(t.id)}</span></button>`;
  });
  html += '</div>';
  const moving = typeof _gdp !== 'undefined' && _gdp.moving;
  if (moving && !held) {   // a thing being moved (or put back out from your storage): its picture, and how to stop
    let art = ''; try { art = gardenIconSvg(moving.id, { kind: moving.kind === 'plant' ? 'plant' : 'decor', px: 34 }); } catch (e) { art = ''; }
    html += `<button type="button" class="gd-slot gb2-held" data-gb2="stopmove" aria-pressed="true" aria-label="Moving it: click where it should go. Stop (Esc)" data-tip="Click where it should go. Esc stops"><kbd>Esc</kbd>${art || icon('move')}</button>`;
  }
  if (held) {
    const name = gardenB2Name(held);
    html += `<button type="button" class="gd-slot gb2-held" data-gb2="putback" aria-pressed="true" aria-label="${escAttr(name)} in your hand, ${heldN} in your pockets. Put it back (X)" data-tip="${escAttr(name + ' in your hand. X puts it back')}"><kbd>X</kbd>${gardenB2Svg(held, 34)}<i class="gd-slotn">${heldN}</i></button>`;
  }
  const full = v.free <= 0, fill = v.size ? v.used / v.size : 0;
  const chestWaits = v.slots.some(e => e && e.i === 'decor:storage-chest') && typeof _gb2ChestOut === 'function' && !_gb2ChestOut() && !(m && m.visit);   // (your chest is still in your pockets: a little dot until it is down)
  html += `<button type="button" class="gd-slot gd-slot-bag gb2-bagbtn${full ? ' is-full' : fill >= 0.85 ? ' is-nearly' : ''}" data-slot="bag" aria-pressed="${_gh.bag ? 'true' : 'false'}" aria-label="Your pockets: ${v.used} of ${v.size} used (B)${chestWaits ? '. Your storage chest is in them' : ''}" data-tip="Your pockets (B): ${v.used} of ${v.size} used"><kbd>B</kbd><span class="gb2-bagart">${_GH_GLYPH.bag}</span><span class="gb2-bagcap"><b>${v.used}</b>/${v.size}</span><i class="gb2-bagfill" style="--f:${fill.toFixed(3)}"></i>${chestWaits ? '<i class="gb2-newdot" aria-hidden="true"></i>' : ''}</button>`;
  if (tag && !held) { const T = tools.find(t => t.id === cur); if (T) html += `<span class="gb2-tag" role="status"><b>${esc(_gb2ToolName(T.id))}</b><small>${esc(T.says)}. <kbd>T</kbd> next tool</small></span>`; }
  el.innerHTML = html; el.classList.add('gb2-on'); el.setAttribute('role', 'toolbar'); el.setAttribute('aria-label', 'Your tools and pockets');
  _gb2WheelBind(box);
  if (!el._gb2Bound) {
    el._gb2Bound = true;
    el.addEventListener('click', (ev) => {
      const t = ev.target.closest('[data-gb2-tool]'); if (t) { ev.stopPropagation(); gardenB2PickTool(t.dataset.gb2Tool, { toggle: true }); return; }
      const p = ev.target.closest('[data-gb2="putback"]'); if (p) { ev.stopPropagation(); gardenB2PutBack(); return; }
      const mv = ev.target.closest('[data-gb2="stopmove"]'); if (mv) { ev.stopPropagation(); if (typeof gardenMoveEnd === 'function') gardenMoveEnd(); return; }
      const b = ev.target.closest('[data-slot="bag"]'); if (b) { ev.stopPropagation(); gardenSlotPick('bag'); }
    });
  }
  return true;
}

/* ---------- the tool in your hand, on every screen ---------- */
function gardenB2GearLook(out) { try { const t = gardenB2RingTool(); if (t && t !== 'hands') out.t = t; } catch (e) { /* hands */ } return out; }
/** The tool as a figure holds it while walking or standing: the hand on its handle at 0,0, in the walker's units (about 70 tall). */
const _GB2_IN_HAND = Object.freeze({
  shears: () => '<g transform="rotate(10)"><path d="M-1.6 6L-3 21.4L-.2 22.6z" fill="#c8d0d6"/><path d="M1.6 6L3.2 21L.6 22.6z" fill="#9aa4aa"/><path d="M-.6 7.4L-1.6 20" stroke="#ffffff" stroke-width=".5" opacity=".7"/><path d="M-2.4 -1.6q-4.6 2.4 -2.6 7.2q2.6 2.2 5 -1.2z" fill="none" stroke="#c0453a" stroke-width="1.8"/><path d="M2.4 -1.6q4.6 2.4 2.6 7.2q-2.6 2.2 -5 -1.2z" fill="none" stroke="#a8382e" stroke-width="1.8"/><circle cx="0" cy="5.6" r="1.1" fill="#5a646c"/></g>',
  net: (gear) => { let hoop = '#8a6a3a'; try { const d = gear && gear.n ? gardenGearDef(gear.n) : null; if (d && d.kind === 'net' && typeof GARDEN_NET_HOOP !== 'undefined') hoop = GARDEN_NET_HOOP[d.tier - 1] || hoop; } catch (e) { /* plain */ } return `<path d="M0 3L12.4 -31" stroke="#6a4a2a" stroke-width="1.9" stroke-linecap="round"/><path d="M.6 2L12 -29.6" stroke="#b08a5a" stroke-width=".6" opacity=".8"/><g transform="rotate(22 15 -38)"><ellipse cx="15" cy="-38" rx="5.6" ry="7" fill="#f4f0e6" fill-opacity=".42"/><path d="M10.6 -40q4.4 6 8.8 0M10 -36q5 4 10 0M15 -45v14" stroke="#e8e2d0" stroke-width=".5" opacity=".8" fill="none"/><ellipse cx="15" cy="-38" rx="5.6" ry="7" fill="none" stroke="${hoop}" stroke-width="1.4"/></g>`; },
  rod: (gear) => { if (gear && gear.rk && typeof gardenLookRodInHand === 'function' && typeof gardenLookDef === 'function' && gardenLookDef(gear.rk)) return gardenLookRodInHand(gear.rk); let L = { c: '#7a5a34', w: 1.7 }; try { if (gear && gear.r && typeof gardenRodLook === 'function') L = gardenRodLook(gear.r); } catch (e) { /* plain */ } return `<path d="M0 3L19 -30" stroke="${L.c}" stroke-width="${L.w}" stroke-linecap="round"/><path d="M.4 2L18 -28.4" stroke="#ffffff" stroke-width=".5" opacity=".35"/><circle cx="1.2" cy="1" r="2.4" fill="#4a3a2a"/><path d="M19 -30Q21 -18 20.4 -8" stroke="#e8e8e0" stroke-width=".4" fill="none" opacity=".7"/>`; },
});
function gardenB2HeldTool(t, gear) {
  if (!t || t === 'hands') return null;
  let art = '';
  try {
    if (t === 'can' || t === 'spade') { const T = _gplTools(); art = t === 'can' ? T.can() : T.spade(); if (t === 'can' && gear && gear.c && typeof GARDEN_CAN_LOOK !== 'undefined' && GARDEN_CAN_LOOK[gear.c]) art = art.split('#6f9ab0').join(GARDEN_CAN_LOOK[gear.c]); }
    else if (_GB2_IN_HAND[t]) art = _GB2_IN_HAND[t](gear);
  } catch (e) { art = ''; }
  if (!art) return null;   // (a tool this app does not know, from a newer friend: their hand is drawn empty)
  return (h) => `<g class="gb2-inhand" transform="translate(${(+h[0]).toFixed(2)} ${(+h[1]).toFixed(2)})">${art}</g>`;
}

/* ---------- E or Space with the rod or the net out ---------- */
function gardenB2Interact() {
  const t = gardenB2On() ? gardenB2RingTool() : 'hands';
  if ((t !== 'rod' && t !== 'net') || typeof _gw === 'undefined' || !_gw.on) return false;
  if (t === 'net') {
    if (!_gw.bugs || !_gw.bugs.size || typeof gardenNetSwing !== 'function') return false;
    const R = gardenNet().st.reach * 1.35;
    for (const b of _gw.bugs.values()) if (Math.hypot(b.x - _gw.px, (b.y - _gw.py) * 1.4) < R) { gardenNetSwing(null); return true; }
    return false;   // (no bug in reach: E does what it always does)
  }
  if (typeof gardenFishFront !== 'function') return false;
  const W = GARDEN_WORLD, px = Math.floor(_gw.px), py = Math.floor(_gw.py), range = gardenRod().st.range;
  const wet = (x, y) => (typeof gardenWaterContainsPoint === 'function' ? gardenWaterContainsPoint(x + .5, y + .5) : gardenIsWater(x, y));
  for (let r = 1; r <= range; r++) for (const dy of [1, 0, -1]) { const x = px + _gw.face * r, y = py + dy; if (x >= 0 && x < W.cols && y >= 0 && y < W.rows && wet(x, y)) { gardenFishFront(); return true; } }
  for (let r = 1; r <= range; r++) if (py + r < W.rows && wet(px, py + r)) { gardenFishFront(); return true; }
  return false;
}

/* ---------- looking after your pockets while the garden is open (here: it needs wdMod, 94-garden-wonder-0kit.js) ---------- */
wdMod({
  id: 'b2-pockets', fun: false, visit: true,
  begin() { _gb2.live = true; _gb2.base = null; _gb2.obj = null; _gb2.panel = 'pockets'; _gb2.at = null; _gb2Watch(); },
  tick() { _gb2Watch(); if (typeof _gb2StoreWalk === 'function') _gb2StoreWalk(); },
  end() { _gb2.live = false; _gb2.base = null; _gb2.panel = 'pockets'; _gb2.at = null; },
});
if (typeof document !== 'undefined') document.addEventListener('opendash:garden', () => { if (!_gb2.live) return; clearTimeout(_gb2.t); _gb2.t = setTimeout(_gb2Watch, 60); });
