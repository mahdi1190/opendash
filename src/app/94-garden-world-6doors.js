/* ============================================================
   HIDDEN ROOMS, the ways in and out (the owner: "it really needs to have its own symbol too"). Every door is a picture, out in the world, in the bubble, and from inside.
     GRM_SYM[id]()         the way in, feet at 0,0, about 44 tall: drawn at the sight (a sprite), and in small on the bubble's button
     gardenRoomSym(R, px)  the same as an <svg>
     gardenRoomGo(R, here) walk up to it and go through: is it open, then the moment of going in
     _grmDoorArt(R)        the way out, inside the room: its own drawing for each, a badge with an arrow over it
   And out on the land: things that had no words (a spot in the lake, the rack) say what they are when you go up to them or point at them (gardenWorldTip).
   ============================================================ */
const _GD = () => _grmA;
const GRM_SYM = Object.freeze({
  cellar() { const A = _GD(); return A.r(-20, -30, 40, 30, '#0a2a32', null, 2) + A.r(-16, -26, 32, 8, '#6a7a78') + A.r(-13, -18, 26, 8, '#55696a') + A.r(-10, -10, 20, 8, '#3f5560') + A.e(0, -2, 13, 3.4, '#1f8a8a') + A.s('M-6 -3q3 -2 6 0M1 -1q3 -1 5 0', '#c0fff0', 1, 0.8); },
  den() { const A = _GD(); return A.r(-18, -22, 36, 22, '#5a4026', null, 2) + A.s('M-6 -22V0M6 -22V0', '#2a1c0e', 2) + `<circle cx="0" cy="-11" r="6.5" fill="none" stroke="#9a9aa8" stroke-width="2.6"/>` + A.r(-20, -38, 12, 16, '#a8a498', null, 3) + `<text x="-14" y="-26" text-anchor="middle" font-size="9" font-weight="800" fill="#3a3a32">0</text>`; },
  boatloft() { const A = _GD(); return A.r(-16, -40, 32, 40, '#3a4a54', null, 2) + A.p('M-16 -40L0 -48L16 -40Z', '#27323a') + A.r(-11, -34, 22, 34, '#20282e') + A.p('M-10 -24H10Q7 -13 0 -11Q-7 -13 -10 -24Z', '#b8623a') + A.s('M-6 -34V-24M6 -34V-24', '#c8b488', 1); },
  lampcup() { const A = _GD(); return A.r(-7, -46, 14, 46, '#2a3040') + A.r(-5, -16, 10, 14, '#10121e', null, 1) + A.c(3, -9, 1.2, '#d8b24a') + A.p('M-9 -46H9L6 -56H-6Z', '#3a4254') + `<path class="grm-glowp" d="M0 -48Q-4 -52 0 -56Q4 -52 0 -48Z" fill="#ffc15a"/>` + A.c(0, -52, 9, '#ffc15a', 0.3); },
  nowhere() { const A = _GD(); return A.r(-2, -44, 4, 44, '#7a6a58') + A.p('M0 -42H22L28 -36L22 -30H0Z', '#efe6cc') + A.e(-4, -6, 22, 6, '#fff', 0.8) + A.e(10, -14, 18, 5, '#fff', 0.6) + A.e(-10, -22, 16, 4, '#fff', 0.5); },
  owl() { const A = _GD(); return A.e(0, -22, 18, 24, '#3a2412') + A.e(0, -22, 14, 20, '#140a04') + `<g class="grm-glowp">${A.c(-5, -26, 3.6, '#ffe28a')}${A.c(5, -26, 3.6, '#ffe28a')}</g>` + A.c(-5, -26, 1.4, '#140a04') + A.c(5, -26, 1.4, '#140a04') + A.s('M-18 -8q-5 4 -8 8M18 -8q5 4 8 8', '#3a2412', 4); },
  grotto() { const A = _GD(); return A.p('M-24 0Q-27 -38 0 -44Q27 -38 24 0Z', '#3a4a40') + A.p('M-16 0Q-18 -28 0 -33Q18 -28 16 0Z', '#061410') + A.e(0, -3, 12, 3, '#62e0c0', 0.8) + A.e(0, -16, 12, 14, '#62e0c0', 0.22) + `<circle class="grm-glowp" cx="-4" cy="-20" r="1.6" fill="#a0ffe0"/><circle class="grm-glowp" cx="5" cy="-24" r="1.3" fill="#a0ffe0" style="animation-delay:-.8s"/>` + A.e(-16, -32, 12, 6, '#5a9a4e') + A.e(14, -36, 13, 6, '#6aaa56') + A.e(0, -42, 12, 5, '#4f8a48') + A.e(-22, -14, 6, 8, '#5a9a4e') + A.e(22, -18, 6, 9, '#4f8a48'); },
  falls() { const A = _GD(); return A.r(-20, -46, 40, 46, '#a8dcf0', 0.85, 4) + A.s('M-14 -46V0M-6 -46V0M6 -46V0M14 -46V0', '#f4fdff', 3, 0.85) + A.p('M-7 0V-22Q0 -30 7 -22V0Z', '#10181c') + A.e(0, -12, 3, 5, '#ffd27a'); },
  lamproom() { const A = _GD(); return A.r(-13, -36, 26, 36, '#efe6d8', null, 2) + A.p('M-5 0V-14Q0 -20 5 -14V0Z', '#3a2c20') + A.s('M-13 -10H13M-13 -24H13', '#b84a3a', 4) + `<path class="grm-glowp" d="M13 -32L42 -46V-20Z" fill="#fff4b8" opacity=".55"/>` + A.c(0, -32, 4.4, '#fff4b8'); },
  ringers() { const A = _GD(); return A.p('M-13 0V-24Q-13 -36 0 -42Q13 -36 13 -24V0Z', '#2a2620') + A.p('M-9 0V-23Q-9 -32 0 -36Q9 -32 9 -23V0Z', '#5a3e22') + A.s('M-9 -20H9M-9 -8H9', '#1a1a20', 2) + A.r(-4, -16, 8, 8, '#8a8a92', null, 1) + A.c(0, -13, 1.2, '#1a1a20') + A.p('M-5 -44Q0 -56 5 -44L7 -40H-7Z', '#b8903a'); },
  barnloft() { const A = _GD(); return A.p('M-18 -42H18V-18H-18Z', '#3a2010') + A.s('M0 -42V-18', '#6a4a2a', 2) + A.e(0, -22, 14, 5, '#d8b65a') + A.s('M-10 0L-7 -20M10 0L7 -20', '#8a6238', 3) + A.s('M-9 -6H9M-8 -13H8', '#8a6238', 2.4); },
  parlour() { const A = _GD(); return A.c(0, -11, 11, '#6e4a24') + A.c(0, -11, 9, '#c84a3a') + A.c(4, -11, 1.4, '#e8c24a') + A.r(-5, -29, 10, 7, '#ffe28a', null, 2) + A.s('M0 -29V-22M-5 -25.5H5', '#6e4a24', 1); },
  hut() { const A = _GD(); return A.r(-12, -34, 24, 34, '#6a5038', null, 2) + A.s('M-4 -34V0M4 -34V0', '#3a2a18', 1.6) + A.r(-13, -21, 18, 3, '#2a2a30') + A.c(8, -19, 2, '#9a9aa8'); },
  treehouse() { const A = _GD(); return A.s('M-6 -46V0M6 -46V0', '#c8b488', 2.4) + A.s('M-6 -8H6M-6 -18H6M-6 -28H6M-6 -38H6', '#8a6238', 3) + A.r(-16, -56, 32, 10, '#7a5a34', null, 2) + A.s('M18 -54V-20', '#efe6cc', 1) + A.r(14, -20, 8, 10, '#9aa8ac', null, 1); },
  icehouse() { const A = _GD(); return A.p('M-18 0V-20Q-18 -38 0 -38Q18 -38 18 -20V0Z', '#d8e8f0') + A.p('M-12 0V-20Q-12 -31 0 -31Q12 -31 12 -20V0Z', '#5a7a8a') + A.s('M-6 -28L-3 -20M4 -29L6 -23', '#fff', 1.6) + A.p('M-8 -38l2 7l2 -7zM2 -38l2 9l2 -9zM10 -36l1.6 6l1.6 -6z', '#f4feff') + A.c(7, -12, 1.6, '#3a4a54'); },
  hothouse() { const A = _GD(); return A.p('M-14 0V-28Q-14 -42 0 -42Q14 -42 14 -28V0Z', '#bfe0c4', 0.85) + A.s('M-14 0V-28Q-14 -42 0 -42Q14 -42 14 -28V0M0 -42V0M-14 -24H14M-14 -12H14', '#f4f4ec', 2.2) + A.fern(-3, 0, 0.4, '#2f7a4e') + `<circle class="grm-steam" cx="10" cy="-44" r="4" fill="#fff"/>`; },
  capfloor() { const A = _GD(); let t = ''; for (let i = 0; i < 8; i++) t += `<rect x="-3" y="-19" width="6" height="6" fill="#3a2814" transform="rotate(${i * 45})"/>`; return A.r(-11, -24, 22, 24, '#5a4228', null, 2) + A.c(10, -30, 2, 'none') + `<g transform="translate(0 -34) scale(.8)">${t}<circle r="14" fill="#7a5634"/><circle r="4" fill="#ffd86a"/></g>`; },
});
function gardenRoomSym(R, px) { const s = GRM_SYM[R.id]; return `<svg viewBox="-30 -60 60 66" width="${px}" height="${px}" aria-hidden="true">${s ? s() : ''}</svg>`; }

/* ---------- going through ---------- */
/** Walk up to it (here: you are already there), see whether it is open, and go in. */
function gardenRoomGo(R, here) {
  const why = !gpVisiting() && R.shut ? R.shut(gardenHere()) : '';
  gardenBubbleClose();
  if (why) { wdWhisper(why, 7000); return; }
  const go = () => {
    if (!_grmMayEnter()) return;
    if (!gardenMotionOn()) { gardenRoomEnter(R); return; }
    const el = document.createElement('div'); el.className = 'grm-through'; el.style.setProperty('--grm-c', R.bg || '#000');
    el.innerHTML = `<i></i><b>${gardenRoomSym(R, 96)}</b><span>${esc(R.name)}</span>`;
    document.body.appendChild(el);
    if (typeof _fxSound === 'function') _fxSound('pop');
    setTimeout(() => gardenRoomEnter(R), 620);
    setTimeout(() => el.remove(), 1500);
  };
  const P = _grmDoorPt(R);
  if (here || !P || Math.hypot(_gw.px - P.x, _gw.py - P.y) < 1.6 || !gardenWalkToPoint(P, go, { radius: 2 })) go();
}
function _grmDoorProp(R) { try { return gardenPropsNow().find(p => p.lf === R.at && !p.site) || null; } catch (e) { return null; } }
function _grmDoorPt(R) {
  const p = _grmDoorProp(R); if (!p) return null;
  if (R.doorAt) return { x: R.doorAt[0], y: R.doorAt[1] };   // (its sight is hidden behind the shops: the steps are by the path round to it)
  // beside its sight: on the right if it can be, never in water or inside a building, where you could not see it or get to it
  const cx = p.x + p.w * 0.5, foot = p.y + p.h, spots = [[cx + 0.9, foot + 0.45], [cx - 0.9, foot + 0.45], [cx, foot + 1.45], [cx + 0.9, foot + 1.45]];
  const ok = ([x, y]) => !gardenIsWater(Math.floor(x), Math.floor(y)) && !gardenPropsNow().some(q => !q.walk && (q.col || 'full') === 'full' && x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h + 0.2);
  const at = spots.find(ok) || spots[0];
  return { x: at[0], y: at[1] };
}
/* each way in stands at its sight, on every land that has it. It follows the sight if the land is laid out again; a building's door comes when it is built */
const _grd = { list: new Map() };
wdMod({
  id: 'room-doors', fun: false, visit: true,
  begin() { this.paint(); },
  painted() { this.paint(); },
  paint() {
    for (const R of GRM_ROOMS) {
      const P = _grmDoorPt(R), S = _grd.list.get(R.id);
      if (!P || !GRM_SYM[R.id] || gardenZoneLockAt(Math.floor(P.x), Math.floor(P.y))) { if (S) { S.remove(); _grd.list.delete(R.id); } continue; }
      if (S) { if (S.x !== P.x || S.y !== P.y - 0.3) { S.x = P.x; S.y = P.y - 0.3; S.z = P.y; S.tf = null; } continue; }
      _grd.list.set(R.id, wdSprite({ id: 'grm-door-' + R.id, x: P.x, y: P.y - 0.3, z: P.y, still: true, hit: 0.9, hitUp: 30, label: R.verb, cursor: 'hand', svg: `<g class="grm-wayin" transform="scale(.82)">${GRM_SYM[R.id]()}</g>`, onClick: () => gardenRoomGo(R) }));
    }
  },
  end() { for (const S of _grd.list.values()) S.remove(); _grd.list.clear(); },
});

/* ---------- the way out, inside ---------- */
const GRM_DOOR = Object.freeze({
  /* wet stone steps going up to green light */
  steps(D, A) { let s = A.p(`M${D.x0} ${D.y1}V${D.y0 - 10}H${D.x1 + 8}V${D.y1}Z`, '#0a2a32') + A.r(D.x0 + 6, D.y0 - 4, 84, 40, '#b8fff0', 0.75, 4); for (let i = 0; i < 7; i++) s += A.r(D.x0 + i * 2, D.y1 - 20 - i * 18, 100 - i * 6, 20, i % 2 ? '#4a6068' : '#5a7078') + A.r(D.x0 + i * 2, D.y1 - 20 - i * 18, 100 - i * 6, 3, '#9ee4e4', 0.5); return s; },
  /* a ladder up to the trap, lamp-lit paper round it */
  trap(D, A) { let s = A.r(D.x0 + 8, 40, 84, 16, '#20140a') + A.r(D.x0 + 14, 56, 72, 12, '#fff4c8', 0.75) + A.p(`M${D.x0 + 86} 56L${D.x1 + 18} 12L${D.x1 + 18} 26L${D.x0 + 86} 68Z`, '#6e5236'); for (const dx of [26, 72]) s += A.r(D.x0 + dx - 3, 64, 7, D.y1 - 64, '#7a5634'); for (let y = 90; y < D.y1 - 6; y += 30) s += A.r(D.x0 + 23, y, 52, 7, '#94703e'); return s; },
  /* a plank door, the evening under it */
  plank(D, A) { return A.r(D.x0, D.y0, 92, D.y1 - D.y0, '#141008') + A.r(D.x0 + 7, D.y0 + 7, 78, D.y1 - D.y0 - 10, '#6a5238') + [20, 38, 56, 74].map(x => A.r(D.x0 + x, D.y0 + 8, 2, D.y1 - D.y0 - 12, '#2a1c10', 0.7)).join('') + A.r(D.x0 + 7, D.y0 + 34, 78, 8, '#3a2c1c') + A.r(D.x0 + 7, D.y1 - 44, 78, 8, '#3a2c1c') + `<circle cx="${D.x0 + 72}" cy="${D.y0 + 86}" r="7" fill="none" stroke="#c8a23a" stroke-width="3"/>` + A.r(D.x0 + 4, D.y1 - 4, 86, 4, '#f4c07a', 0.8); },
  /* the small iron door, left ajar, the night outside */
  post(D, A) { return A.r(D.x0 + 20, D.y0 + 30, 66, D.y1 - D.y0 - 30, '#0a1a44', null, 8) + A.c(D.x0 + 44, D.y0 + 62, 2, '#fff') + A.c(D.x0 + 62, D.y0 + 90, 1.6, '#fff') + A.r(D.x0 + 34, D.y1 - 90, 8, 90, '#3a4254') + A.c(D.x0 + 38, D.y1 - 96, 9, '#ffe28a', 0.8) + A.p(`M${D.x0 + 86} ${D.y0 + 30}L${D.x1 + 16} ${D.y0 + 50}V${D.y1 + 10}L${D.x0 + 86} ${D.y1}Z`, '#2a3040') + A.c(D.x1 + 4, D.y0 + 96, 3.4, '#d8b24a'); },
  /* a thin place in the mist, a brighter way between two old stones */
  mist(D, A) { const mx = (D.x0 + D.x1) / 2; return `<defs><radialGradient id="grmdm"><stop offset="0" stop-color="#fff8d8"/><stop offset=".6" stop-color="#fff4c8" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>` + A.e(mx, D.y0 + 70, 70, 110, 'url(#grmdm)') + A.r(D.x0 + 4, D.y0 + 8, 20, D.y1 - D.y0 - 8, '#8a8498', null, 5) + A.r(D.x1 - 24, D.y0 + 16, 20, D.y1 - D.y0 - 16, '#7e788e', null, 5) + A.r(D.x0 - 8, D.y0 - 12, D.x1 - D.x0 + 16, 24, '#9a94a8', null, 6) + A.s(`M${D.x0 + 10} ${D.y0 + 40}v40M${D.x1 - 16} ${D.y0 + 60}v50`, '#6e6880', 2.4, 0.6) + A.e(mx, D.y1 + 2, 62, 8, '#6a6078', 0.3); },
  /* the split in the bark, dusk outside */
  bark(D, A) { const mx = (D.x0 + D.x1) / 2, top = D.y0 - 30; return `<defs><linearGradient id="grmdb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#27496e"/><stop offset=".55" stop-color="#d87a54"/><stop offset="1" stop-color="#f4c07a"/></linearGradient></defs>` + A.p(`M${mx - 58} ${D.y1 + 4}Q${mx - 62} ${D.y0 + 60} ${mx - 30} ${top + 40}Q${mx - 8} ${top - 8} ${mx + 8} ${top + 20}Q${mx + 52} ${D.y0 + 60} ${mx + 58} ${D.y1 + 4}Z`, '#2a180a') + A.p(`M${mx - 38} ${D.y1}Q${mx - 40} ${D.y0 + 70} ${mx - 20} ${top + 56}Q${mx - 6} ${top + 26} ${mx + 6} ${top + 44}Q${mx + 34} ${D.y0 + 70} ${mx + 38} ${D.y1}Z`, 'url(#grmdb)') + A.p(`M${mx - 38} ${D.y1}Q${mx - 18} ${D.y1 - 30} ${mx + 6} ${D.y1 - 22}T${mx + 38} ${D.y1 - 12}V${D.y1}Z`, '#2c3a24') + A.s(`M${mx - 48} ${D.y1}Q${mx - 52} ${D.y0 + 66} ${mx - 26} ${top + 48}M${mx + 48} ${D.y1}Q${mx + 44} ${D.y0 + 70} ${mx + 16} ${top + 40}`, '#4a2e16', 4); },
  /* the rock mouth you came in by, ferns, daylight far along it */
  cave(D, A) { const mx = (D.x0 + D.x1) / 2; return A.blob(mx, D.y0 + 60, 74, 130, 'cv', 0.14, '#26342c') + A.p(`M${D.x0 + 6} ${D.y1}Q${D.x0 + 2} ${D.y0 + 16} ${mx} ${D.y0 - 6}Q${D.x1 - 2} ${D.y0 + 16} ${D.x1 - 6} ${D.y1}Z`, '#0e1c16') + A.e(mx, D.y0 + 100, 24, 44, '#e8ffd8', 0.9) + A.e(mx, D.y0 + 100, 42, 70, '#d8ffd0', 0.22) + A.p(`M${mx - 18} ${D.y0 + 136}L${mx + 18} ${D.y0 + 136}L${mx + 44} ${D.y1}H${mx - 44}Z`, '#26402c') + A.e(mx - 36, D.y0 + 8, 28, 13, '#568a50') + A.e(mx + 34, D.y0 + 2, 30, 14, '#4f8a48') + A.fern(D.x0 + 2, D.y1, 0.7, '#3f7a44') + A.fern(D.x1, D.y1, 0.7, '#3f7a44', 1); },
  /* a parting in the water: light on the far side */
  water(D, A) { const mx = (D.x0 + D.x1) / 2, top = D.y0 - 26; return `<defs><linearGradient id="grmdw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8f0f8"/><stop offset="1" stop-color="#7ec0dc"/></linearGradient><radialGradient id="grmdg"><stop offset="0" stop-color="#fff4c8"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient></defs>` + A.blob(mx, D.y0 + 70, 74, 124, 'fd', 0.12, '#1a2428') + A.p(`M${D.x0 + 2} ${D.y1}V${top + 34}Q${mx} ${top - 22} ${D.x1 - 2} ${top + 34}V${D.y1}Z`, 'url(#grmdw)') + A.e(mx, D.y0 + 76, 40, 92, 'url(#grmdg)') + A.p(`M${mx - 13} ${D.y1}Q${mx - 7} ${D.y0 + 50} ${mx} ${top + 22}Q${mx + 7} ${D.y0 + 50} ${mx + 13} ${D.y1}Z`, '#fff8dc') + [10, 22, 34, 62, 74, 86].map((x, i) => A.s(`M${D.x0 + x} ${top + 30}V${D.y1 - (i % 3) * 12}`, '#f4fdff', 3, 0.7)).join('') + A.e(mx, D.y1, 52, 7, '#f4fdff', 0.5); },
  /* the top of the spiral stairs, an iron rail curling down */
  spiral(D, A) { const mx = (D.x0 + D.x1) / 2, cy = D.y1 - 32; let s = A.e(mx, cy, 60, 30, '#b8b4a8') + A.e(mx, cy, 52, 25, '#14120e'); for (let i = 0; i < 5; i++) { const k = 1 - i * 0.17; s += `<path d="M${mx - 50 * k} ${cy + i * 3}A${50 * k} ${24 * k} 0 0 1 ${mx + 30 * k} ${cy - 20 * k + i * 3}" fill="none" stroke="${['#8a8678', '#6e6a60', '#54514a', '#3e3c36', '#2a2824'][i]}" stroke-width="9"/>`; } return s + A.s(`M${mx - 58} ${cy - 4}V${D.y0 + 18}M${mx + 58} ${cy - 4}V${D.y0 + 18}`, '#a83a2c', 6) + A.s(`M${mx - 58} ${D.y0 + 18}Q${mx} ${D.y0 - 22} ${mx + 58} ${D.y0 + 18}`, '#a83a2c', 6) + A.s(`M${mx - 58} ${D.y0 + 70}H${mx - 34}M${mx + 58} ${D.y0 + 70}H${mx + 34}`, '#a83a2c', 3); },
  /* a pointed door with iron straps */
  gothic(D, A) { const mx = (D.x0 + D.x1) / 2; return A.p(`M${D.x0} ${D.y1}V${D.y0 + 50}Q${D.x0 + 4} ${D.y0 + 6} ${mx} ${D.y0 - 22}Q${D.x1 - 4} ${D.y0 + 6} ${D.x1} ${D.y0 + 50}V${D.y1}Z`, '#6a645a') + A.p(`M${D.x0 + 10} ${D.y1}V${D.y0 + 54}Q${D.x0 + 14} ${D.y0 + 16} ${mx} ${D.y0 - 8}Q${D.x1 - 14} ${D.y0 + 16} ${D.x1 - 10} ${D.y0 + 54}V${D.y1}Z`, '#5a3e22') + A.s(`M${D.x0 + 12} ${D.y0 + 74}H${D.x1 - 30}M${D.x0 + 12} ${D.y1 - 40}H${D.x1 - 30}`, '#1a1a20', 6) + A.c(D.x1 - 22, D.y0 + 100, 7, '#8a8a92'); },
  /* a hole in the boards, the ladder's top and the light from below */
  barn(D, A) { const mx = (D.x0 + D.x1) / 2; return A.e(mx, D.y1 - 34, 60, 30, '#2a180c') + A.e(mx, D.y1 - 32, 50, 24, '#ffe9a8', 0.85) + A.s(`M${mx - 22} ${D.y1 - 40}V${D.y0 + 10}M${mx + 22} ${D.y1 - 40}V${D.y0 + 10}`, '#8a6238', 7) + [20, 50, 80, 110].map(y => A.r(mx - 24, D.y0 + y, 48, 6, '#8a6238')).join(''); },
  /* a little round door, a very big knocker */
  mouse(D, A) { const mx = (D.x0 + D.x1) / 2, cy = D.y1 - 74; return A.c(mx, cy, 72, '#6e4a24') + A.c(mx, cy, 60, '#c84a3a') + A.s(`M${mx - 60} ${cy}H${mx + 60}M${mx} ${cy - 60}V${cy + 60}`, '#a83a2a', 3) + `<circle cx="${mx + 30}" cy="${cy}" r="9" fill="none" stroke="#e8c24a" stroke-width="4"/>` + A.c(mx + 30, cy - 6, 3, '#e8c24a'); },
  /* the door on the latch, a pane with the hill in it */
  latch(D, A) { return A.r(D.x0, D.y0 - 16, 92, D.y1 - D.y0 + 16, '#3a2c1c') + A.r(D.x0 + 7, D.y0 - 9, 78, D.y1 - D.y0 + 9, '#7a5c3a') + A.r(D.x0 + 18, D.y0 + 4, 56, 44, '#b8d4e4') + A.p(`M${D.x0 + 18} ${D.y0 + 48}Q${D.x0 + 44} ${D.y0 + 22} ${D.x0 + 74} ${D.y0 + 40}V${D.y0 + 48}Z`, '#88a868') + [30, 54].map(x => A.r(D.x0 + x, D.y0 + 56, 2, D.y1 - D.y0 - 60, '#3a2c1c', 0.7)).join('') + A.r(D.x0 + 54, D.y0 + 88, 30, 6, '#2a2a30') + A.c(D.x0 + 82, D.y0 + 91, 5, '#9a9aa8'); },
  /* a rope ladder through a hole in the floor, leaves below */
  rope(D, A) { const mx = (D.x0 + D.x1) / 2; return A.e(mx, D.y1 - 30, 58, 28, '#2a1c0e') + A.e(mx, D.y1 - 28, 48, 22, '#55984a') + A.blob(mx - 16, D.y1 - 28, 22, 10, 'r1', 0.4, '#3f7a38') + A.blob(mx + 20, D.y1 - 24, 20, 9, 'r2', 0.4, '#6ab058') + A.s(`M${mx - 18} ${D.y1 - 28}V${D.y0 + 8}M${mx + 18} ${D.y1 - 28}V${D.y0 + 8}`, '#c8b488', 4) + [24, 52, 80, 108].map(y => A.r(mx - 22, D.y0 + y, 44, 6, '#8a6238', null, 2)).join('') + A.s(`M${mx - 26} ${D.y0 + 4}H${mx + 26}`, '#5a3e22', 9); },
  /* the thick round-topped door, straw-stuffed, frost on it */
  ice(D, A) { const mx = (D.x0 + D.x1) / 2; return A.p(`M${D.x0} ${D.y1}V${D.y0 + 38}Q${D.x0} ${D.y0 - 6} ${mx} ${D.y0 - 6}Q${D.x1} ${D.y0 - 6} ${D.x1} ${D.y0 + 38}V${D.y1}Z`, '#4e6a7a') + A.p(`M${D.x0 + 12} ${D.y1}V${D.y0 + 44}Q${D.x0 + 12} ${D.y0 + 8} ${mx} ${D.y0 + 8}Q${D.x1 - 12} ${D.y0 + 8} ${D.x1 - 12} ${D.y0 + 44}V${D.y1}Z`, '#fff4d8', 0.92) + A.p(`M${D.x0} ${D.y0 + 38}l8 20l6 -18l8 26l8 -30l8 18l6 -24H${D.x0}Z`, '#f4feff', 0.9); },
  /* a glazed iron door, the green of outside through it */
  glass(D, A) { const x = D.x0, w = 92, top = D.y0 - 30, mx = x + w / 2; return A.p(`M${x} ${D.y1}V${top + 36}Q${x} ${top} ${mx} ${top}Q${x + w} ${top} ${x + w} ${top + 36}V${D.y1}Z`, '#5a6a58') + A.p(`M${x + 7} ${D.y1}V${top + 38}Q${x + 7} ${top + 7} ${mx} ${top + 7}Q${x + w - 7} ${top + 7} ${x + w - 7} ${top + 38}V${D.y1}Z`, '#f0fce4') + A.p(`M${x + 7} ${D.y1}V${D.y1 - 54}Q${mx} ${D.y1 - 92} ${x + w - 7} ${D.y1 - 54}V${D.y1}Z`, '#7fb068') + A.c(x + 26, D.y1 - 66, 12, '#fff8c8') + A.s(`M${mx} ${top + 7}V${D.y1}M${x + 7} ${top + 62}H${x + w - 7}M${x + 7} ${top + 124}H${x + w - 7}M${x + 7} ${D.y1 - 44}H${x + w - 7}`, '#5a6a58', 4) + A.c(x + w - 18, D.y0 + 74, 5, '#a8603a'); },
  /* the mill's own steep ladder, down through the floor */
  cap(D, A) { const mx = (D.x0 + D.x1) / 2; let s = A.p(`M${D.x0 + 2} ${D.y1}L${D.x0 + 14} ${D.y0 + 60}H${D.x1 - 14}L${D.x1 - 2} ${D.y1}Z`, '#1a1006') + A.p(`M${D.x0 + 14} ${D.y0 + 60}L${D.x0 + 2} ${D.y0 - 34}H${D.x1 - 2}L${D.x1 - 14} ${D.y0 + 60}Z`, '#6e5230') + A.s(`M${mx - 26} ${D.y0 - 24}L${mx - 22} ${D.y0 + 52}M${mx + 26} ${D.y0 - 24}L${mx + 22} ${D.y0 + 52}`, '#3a2814', 5) + A.c(mx, D.y0 + 2, 9, '#3a3a42') + A.c(mx, D.y0 + 2, 4, '#6e5230'); for (let i = 0; i < 5; i++) { const y = D.y0 + 74 + i * 20, ins = 22 - i * 3.4; s += A.r(D.x0 + ins, y, D.x1 - D.x0 - ins * 2, 12, i % 2 ? '#94703e' : '#a88048') + A.r(D.x0 + ins, y, D.x1 - D.x0 - ins * 2, 2.4, '#fff8e0', 0.5); } return s; },
});
function _grmDoorArt(R) {
  const D = GRM.door, A = _grmA, f = GRM_DOOR[R.door] || GRM_DOOR.plank, mx = (D.x0 + D.x1) / 2, badgeY = D.y0 - 56;
  return `<g class="ee-door"><title>Way out</title>${f(D, A)}<g class="grm-outmark" transform="translate(${mx} ${badgeY})"><circle r="19" fill="#0e1a12" stroke="#ffe9a8" stroke-width="2.5"/><path d="M-9 0H6M0 -8L8 0L0 8" fill="none" stroke="#ffe9a8" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" transform="rotate(180)"/></g></g>`;
}

/* ---------- things out on the land that say what they are when you go up to them ---------- */
const _gwt = { el: null, said: new Set(), at: 0 };
/** What is at this place on the land, in words. */
function _gwtAt(x, y) {
  let hot = null; try { hot = gardenHotSpot(gardenHere().today); } catch (e) { hot = null; }
  for (const s of GARDEN_SPOTS) if (Math.hypot(x - s.x, (y - s.y) * 1.3) <= s.r + 0.3) return { key: s.id, t: s.name, d: s.says + (hot && hot.id === s.id ? ' Gulls over it today: more fish here.' : '') };
  const C = GARDEN_CATCH_CELLS.rack;
  try { if (Math.abs(x - C.x) < 1.4 && y < C.y + 0.4 && y > C.y - 1.8) { const ca = gardenCatchHere(); if (ca.rk && ca.rk.length) return { key: 'rack', t: 'The drying rack', d: 'Today’s five best fish, hung up for everyone to see.' }; } } catch (e) { /* no rack */ }
  return null;
}
function _gwtShow(T, ev) {
  const box = _gw.box; if (!box) return;
  let c = _gwt.el; if (!c || !c.isConnected) { c = document.createElement('div'); c.className = 'grm-tip'; c.setAttribute('role', 'status'); box.appendChild(c); _gwt.el = c; }
  if (!T) { c.hidden = true; return; }
  if (c._k !== T.key) { c._k = T.key; c.innerHTML = `<b>${esc(T.t)}</b><span>${esc(T.d)}</span>`; }
  c.hidden = false;
  const r = box.getBoundingClientRect(), w = c.offsetWidth, h = c.offsetHeight;
  c.style.left = Math.max(8, Math.min(r.width - w - 8, ev.clientX - r.left + 14)) + 'px'; c.style.top = Math.max(8, Math.min(r.height - h - 8, ev.clientY - r.top + 16)) + 'px';
}
wdMod({
  id: 'world-tip', fun: false, visit: true,
  begin() {
    const on = (ev) => { if (!_gw.on || !_gw.svg || _gwFishBusy()) { _gwtShow(null); return; } const t = performance.now(); if (t - _gwt.at < 90) return; _gwt.at = t; const p = _gwPointAt(ev); _gwtShow(p ? _gwtAt(p.x, p.y) : null, ev); };
    this.on = on; if (_gw.box) _gw.box.addEventListener('pointermove', on, { passive: true });
  },
  tick() {
    // going up to one: said once, in words that fade. In a boat, on the pier, on the shore.
    if (_grm.on) return;
    for (const s of GARDEN_SPOTS) if (!_gwt.said.has(s.id) && Math.hypot(_gw.px - s.x, (_gw.py - s.y) * 1.3) <= s.r + 1.6) { _gwt.said.add(s.id); wdWhisper(`${s.name}. ${s.says}`, 7000); return; }
  },
  end() { if (_gw.box && this.on) _gw.box.removeEventListener('pointermove', this.on); if (_gwt.el) { _gwt.el.remove(); _gwt.el = null; } },
});
