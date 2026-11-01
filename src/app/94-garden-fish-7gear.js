/* ============================================================
   WHAT YOU OWN SHOWS (2.39, docs/dev/GARDEN_TOGETHER.md section 22). The owner, 1 Nov 2026: "if we buy items like a new rod or new fish feeders... it should appear and show in the garden and
   we can see each other's stuff... I want to see if my friend has a cool new rod." THE RULE, for everything that can be bought or unlocked from now on: it appears in the world or on your figure,
   and friends see it, live and on a saved copy. A number on a card is not enough.

     On you: the rod and net you have chosen hang on your back (the starter ones do not, so a new one shows); your rod in your hand, your float on the water and your can when you water are yours on
     every screen. These go to friends as `g` in your look (gl:me, gl:who: ids, each side draws them from its own tables; an id it does not know is left out).
     In the garden: what is built for the lake is drawn where it stands (gardenWorksArt, from _GD_WORKS: yours, or your friend's from the snapshot's `wk`).
     When you get something: you hold it up, and friends see "Sam got a carbon rod!" (fx got gear, 94-garden-fish-5moment.js).
     Click a person: what they carry (gardenGearRow).
   ============================================================ */
const GARDEN_ROD_LOOK = Object.freeze({ c: Object.freeze(['#c8a46a', '#4a8ab4', '#2a2a32', '#7a3a8a', '#f2c432']), w: Object.freeze([2, 2.2, 2.2, 2.5, 2.8]) });
const GARDEN_NET_HOOP = Object.freeze(['#8a6a3a', '#4aa86a', '#4a7ab4', '#f2c432']);
const GARDEN_CAN_LOOK = Object.freeze({ 'can-2': '#3f8f5a', 'can-3': '#c8743a', 'can-4': '#e0b43a' });

function gardenRodLook(id) {
  const d = id ? gardenGearDef(id) : null, t = d && d.kind === 'rod' ? d.tier : 1;
  return { c: GARDEN_ROD_LOOK.c[t - 1], w: GARDEN_ROD_LOOK.w[t - 1], tier: t };
}
/** What you carry, as friends are told it: ids only. */
function gardenGearLook() {
  const out = { r: gardenRod().id, n: gardenNet().id, b: gardenBobber().id };
  for (const id of ['can-4', 'can-3', 'can-2']) if (gardenHas('tool:' + id) > 0) { out.c = id; break; }
  return out;
}
/** Yours, for your own figure (it is asked every frame; what you carry changes rarely). */
const _gplGearMemo = { at: -1e9, v: null };
function _gplMyGear() {
  const t = performance.now();
  if (t - _gplGearMemo.at > 1000) { _gplGearMemo.at = t; try { _gplGearMemo.v = gardenGearLook(); } catch (e) { _gplGearMemo.v = null; } }
  return _gplGearMemo.v;
}
/** What hangs on someone's back: nothing while their hands are full of it, and nothing for the starter ones. Feet at 0,0, the walker's units. */
function _gplSlung(gear, pose) {
  if (!gear || pose === 'fish' || pose === 'hold') return '';
  const rod = gear.r ? gardenGearDef(gear.r) : null, net = gear.n ? gardenGearDef(gear.n) : null;
  let s = '';
  if (net && net.kind === 'net' && net.tier > 1) {
    const hoop = GARDEN_NET_HOOP[net.tier - 1] || GARDEN_NET_HOOP[0], k = 1 + net.tier * 0.08;
    s += `<g class="gpl-slung"><path d="M9 -24L-9 -62" stroke="#6a4a2a" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="-11.5" cy="-67" rx="${(6 * k).toFixed(1)}" ry="${(7.5 * k).toFixed(1)}" fill="#f4f0e6" fill-opacity="0.55" stroke="${hoop}" stroke-width="1.5"/></g>`;
  }
  if (rod && rod.kind === 'rod' && rod.tier > 1) {
    const L = gardenRodLook(rod.id), tip = -80 - rod.tier * 2;
    s += `<g class="gpl-slung"><path d="M-9 -22L14 ${tip}" stroke="#1a1a1a" stroke-opacity="0.35" stroke-width="${(L.w + 0.8).toFixed(1)}" stroke-linecap="round"/><path d="M-9 -22L14 ${tip}" stroke="${L.c}" stroke-width="${L.w}" stroke-linecap="round"/><circle cx="-6.2" cy="-28.5" r="2.6" fill="#3a2a1a"/>${rod.tier >= 4 ? `<circle cx="14" cy="${tip}" r="1.7" fill="#fff4b0"/>` : ''}</g>`;
  }
  return s;
}

/* ---------- what is built for the lake ---------- */
/** Its drawing, with its foot at 0,0. */
function gardenWorkArt(id, sc) {
  const night = !!sc && (sc.tod === 'night' || sc.tod === 'dusk');
  switch (id) {
    case 'pier-2': return '<path d="M-2 0V-16h4V0z" fill="#6e4c2a"/><ellipse cx="0" cy="-16" rx="4.4" ry="1.8" fill="#8a6238"/><path d="M-4.5 -10q4.5 3 9 0" fill="none" stroke="#e8dcb0" stroke-width="1.2"/>';
    case 'pier-3': return '<path d="M-1 0V-44h2V0z" fill="#6e4c2a"/><path d="M1 -44L19 -38L1 -32z" fill="#d8452a" stroke="#8a2a1a" stroke-width="0.6"/><path d="M1 -40L10 -38L1 -36z" fill="#fbf5e6"/>';
    case 'fish-feeder': return '<ellipse cx="0" cy="1" rx="14" ry="4" fill="#ffffff" fill-opacity="0.2"/><path d="M-1.6 1V-20h3.2V1z" fill="#6e4c2a"/><path d="M-9 -32V-23Q0 -19 9 -23V-32z" fill="#8a9298" stroke="#59636a" stroke-width="0.9"/><ellipse cx="0" cy="-32" rx="9" ry="3.4" fill="#b8c0c6" stroke="#59636a" stroke-width="0.9"/><path d="M-9 -27Q0 -23 9 -27" fill="none" stroke="#d8452a" stroke-width="1.6"/><circle cx="-7" cy="-3" r="1" fill="#e8c88a"/><circle cx="5" cy="-1" r="1" fill="#e8c88a"/><circle cx="9" cy="-5" r="0.9" fill="#e8c88a"/>';
    case 'reed-beds': return '<ellipse cx="0" cy="1" rx="17" ry="4.6" fill="#0a2a1e" fill-opacity="0.18"/><g fill="none" stroke-linecap="round"><path d="M-11 0Q-13 -18 -9 -32" stroke="#4f8a3f" stroke-width="1.7"/><path d="M-5 0Q-7 -24 -3 -42" stroke="#3f7a35" stroke-width="1.9"/><path d="M1 0Q0 -22 3 -36" stroke="#5a9a48" stroke-width="1.7"/><path d="M7 0Q7 -18 11 -30" stroke="#3f7a35" stroke-width="1.8"/><path d="M12 0Q13 -10 16 -20" stroke="#5a9a48" stroke-width="1.5"/></g><path d="M-4.6 -36l2.6 .3 -.5 -9 -2.5 -.1z" fill="#6a4426"/><path d="M1.8 -30l2.5 .3 -.2 -8 -2.4 -.1z" fill="#7a5230"/><path d="M-10 -28l2.2 .4 .4 -7 -2.2 -.2z" fill="#6a4426"/>';
    case 'fishing-station': return '<ellipse cx="0" cy="1" rx="17" ry="4" fill="#1a1208" fill-opacity="0.2"/><path d="M-11 0L-3 -13M-3 0L-11 -13" stroke="#5a3e22" stroke-width="1.6"/><path d="M-13 -15h12l1 -3h-14z" fill="#3f7a8a" stroke="#2a5560" stroke-width="0.7"/><path d="M-14 -18L-13 -29h11L-1 -18" fill="#4f8ea0" stroke="#2a5560" stroke-width="0.7"/><path d="M4 0V-11h10V0z" fill="#8a9298" stroke="#59636a" stroke-width="0.8"/><path d="M4 -11Q9 -19 14 -11" fill="none" stroke="#59636a" stroke-width="1.1"/><path d="M15 0L19 -18M19 -18L21 -19" stroke="#6e4c2a" stroke-width="1.5" stroke-linecap="round"/>';
    case 'night-lantern': return `${night ? '<ellipse cx="0" cy="-46" rx="30" ry="24" fill="#ffd97a" fill-opacity="0.26"/><ellipse cx="0" cy="-46" rx="13" ry="11" fill="#ffe9a8" fill-opacity="0.5"/><ellipse cx="0" cy="2" rx="22" ry="6" fill="#ffd97a" fill-opacity="0.18"/>' : ''}<path d="M-1.4 0V-40h2.8V0z" fill="#3a3a42"/><path d="M-6 -41h12l-2 -11h-8z" fill="${night ? '#ffe28a' : '#e8e0c0'}" stroke="#2a2a32" stroke-width="1"/><path d="M-7.5 -52h15L0 -58z" fill="#3a3a42"/><path d="M-5 0h10l-1 -3h-8z" fill="#3a3a42"/>`;
    case 'pool-stock': return '<ellipse cx="0" cy="1" rx="13" ry="3.4" fill="#1a1208" fill-opacity="0.18"/><path d="M-9 0V-10h9V0z" fill="#8a9298" stroke="#59636a" stroke-width="0.8"/><path d="M-9 -10Q-4.5 -17 0 -10" fill="none" stroke="#59636a" stroke-width="1"/><path d="M-7.5 -7q2 -2.4 4 0q-2 2.4 -4 0z" fill="#f08a2a"/><path d="M6 0V-20h2V0z" fill="#6e4c2a"/><rect x="2" y="-27" width="11" height="8" rx="1.2" fill="#c8a46a" stroke="#6e4c2a" stroke-width="0.7"/><path d="M4.4 -23q1.4 -1.8 3.2 0q-1.8 1.8 -3.2 0zM7.6 -23l2 -1.4v2.8z" fill="#3f6f8a"/>';
    default: return '';
  }
}
/** A picture of one, for the shop and the moment you get it. */
function gardenWorkSvg(id, px) {
  const art = gardenWorkArt(id, { tod: 'night' });
  return art ? `<svg class="gd-catch-ico" viewBox="-30 -60 60 66" width="${px}" height="${Math.round(px * 66 / 60)}" aria-hidden="true" focusable="false">${art}</svg>` : '';
}
/** Where they stand: [{id, x, y, svg}] in cells. Beside the pier they follow its end; a pond's stock stands by each pond you have. */
function gardenWorksArt(sc) {
  const out = [], end = 17 + gardenPierMore(), put = (id, x, y) => { if (gardenWorkOwned(id)) { const svg = gardenWorkArt(id, sc); if (svg) out.push({ id, key: id + '-' + x + '-' + y, x, y, svg }); } };
  put('pier-2', 12.1, 17.1);
  put('pier-3', 13.85, end - 0.4);
  put('fish-feeder', 9.6, 14.5);
  put('reed-beds', 3.4, 15.2); put('reed-beds', 18.6, 14.6); put('reed-beds', 25, 15.6);
  put('fishing-station', 13.45, end - 1);
  put('night-lantern', 12.15, end - 0.15);
  const open = new Set(sc.areas || []);
  for (const a of GARDEN_AREAS) if (a.water && !a.fishing && open.has(a.id)) put('pool-stock', a.water.x - 0.5, a.water.y + a.water.h - 0.2);
  return out;
}
/* ---------- what someone carries ---------- */
/** Click a person: a row of what they have with them, in pictures and words. */
function gardenGearRow(g) {
  if (!g) return null;
  const row = document.createElement('div'); row.className = 'gll-gear';
  const add = (svg, name) => { if (!name) return; const s = document.createElement('span'); s.className = 'gll-gear-i'; s.innerHTML = svg || ''; const t = document.createElement('span'); t.textContent = name; s.appendChild(t); row.appendChild(s); };
  const rod = g.r ? gardenGearDef(g.r) : null, net = g.n ? gardenGearDef(g.n) : null, can = g.c ? gardenTool(g.c) : null, bob = g.b ? GARDEN_BOBBERS.find(x => x.id === g.b) : null;
  if (rod && rod.kind === 'rod') add(gardenCatchSvg('rod', rod.id, 22), rod.name);
  if (net && net.kind === 'net') add(gardenCatchSvg('net', net.id, 22), net.name);
  if (bob) add(gardenCatchSvg('bobber', bob.id, 22), bob.name);
  if (can) add(typeof _gdxItemIcon === 'function' ? _gdxItemIcon('tool:' + can.id, 22) : '', can.name);
  return row.children.length ? row : null;
}
/** What they have built, in words, for the top of a visit. */
function gardenWorksWords(wk) {
  const names = (wk || []).map(id => gardenGearDef(id)).filter(d => d && d.kind === 'lake').map(d => d.name.toLowerCase());
  return names.length ? `They have built: ${names.join(', ')}.` : '';
}
/* ---------- it arrives ---------- */
if (typeof document !== 'undefined') document.addEventListener('opendash:garden', (ev) => {
  const d = ev && ev.detail; if (!d || d.kind !== 'buy' || typeof d.item !== 'string') return;
  const m = /^(gear|tool):([a-z0-9-]+)$/.exec(d.item); if (!m) return;   // (bait, seeds and decorations: a decoration shows when you place it)
  _gplGearMemo.at = -1e9;
  if (typeof gardenCatchMoment === 'function') gardenCatchMomentSoon('gear', m[2], { isNew: true });
  const def = gardenGearDef(m[2]);
  if (def && def.kind === 'lake') {
    try { if (typeof _gw !== 'undefined') _gw.reach = null; } catch (e) { /* no stage */ }
    // whoever is in your garden sees it go up now, not at their next visit
    setTimeout(() => { try { if (_gll.role === 'host' && _glh.on && _glhAnyone()) for (const A of _gll.actors.values()) if (A.f) _glhSendSnap(A.f); } catch (e) { /* the next visit has it */ } }, 300);
  }
});
