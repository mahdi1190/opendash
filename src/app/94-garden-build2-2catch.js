/* ============================================================
   BUILD 2: EVERY CATCH OR FIND, FOUR CHOICES (the owner, 21 Nov 2026: "place fish in museums or sell them or let them free or display them").
   From a pocket (94-garden-zz-8build2-store.js), from the catch card the moment you land it, and from the Bag & tackle list:
     - Give to the museum: at any museum (a thing of the kind `museum`: the Vale Museum, the lake hall, the Little museum), or in its
       pop-up. Anywhere else the pocket says it is new for the museum, and where to take it.
     - Sell: the market, as ever (94-garden-build2-1pockets.js 'sell').
     - Let it go: a fish arcs from your hands into the nearest water (read from the cells round you, any water on any layout, not a named
       lake), splashes, and that kind is three times as common in your water for a week (gardenFishRelease); with no water near, it leaps
       and is gone in a sparkle. A bug (new: gardenBugRelease) lifts off from your cupped hands, a butterfly or moth fluttering up and away,
       a beetle or a snail trundling off into the grass, +1 XP, and that kind comes to you a little more often this week.
     - Put it on show at home: the very catch, pinned in your aquarium or bug case (the showcase, 94-garden-fish-2core.js gardenSpecPin):
       friends see it there. The museum's keepers give you the tank and the case with each wing's first piece.

     gardenBugRelease(key)              let a bug go               gardenB2ReleasePicture(kind, def)   the picture (fish into water, bug off)
     gardenB2CatchCard(card, o)         the catch card's choices (94-garden-fish-3game.js _gwCatchCard)
     gardenB2BagExtras(f, kind, r)      the Bag & tackle list's choices (94-garden-fish-9page.js gardenBagExtras)
     gardenB2BugWeight(id)              how much more often a bug you let go this week comes (1 or 1.6)
   ============================================================ */

/* ---------- a museum in reach ---------- */
/** The nearest thing of the kind `museum` within r cells of you, or null. */
function gardenB2MuseumNear(r) {
  if (typeof _gw === 'undefined' || !_gw.on || typeof gardenAffordThings !== 'function') return null;
  let best = null, bd = r == null ? 3.2 : r;
  for (const t of gardenAffordThings()) { if (t.src === 'decor' || !_gb2mIsMuseum(t)) continue; const d = Math.hypot(t.x - _gw.px, (t.y - _gw.py) * 1.3); if (d < bd) { bd = d; best = t; } }
  return best;
}
/** Is the museum's pop-up open, or a museum's door beside you? Then giving happens now. */
function _gb2AtMuseum() { try { if (typeof _gdp !== 'undefined' && _gdp.pop && _gdp.pop.tab === 'museum') return true; } catch (e) { /* no page */ } return !!gardenB2MuseumNear(3.2); }
/** 'f.perch' when this is new for the museum here (yours, or on a visit your friend's), else ''. */
function _gb2NewFor(item) {
  const key = typeof gardenMuseumKeyOf === 'function' ? gardenMuseumKeyOf(item) : ''; if (!key) return '';
  if (key.charAt(0) === 'f') { const d = gardenFishDef(key.slice(2)); if (!d || d.cat !== 'fish') return ''; }
  try { return gardenMuseumHere().rows.has(key) ? '' : key; } catch (e) { return ''; }
}

/* ---------- a pocket's choices ---------- */
const _gb2IsCatch = (e, c) => c.kind === 'fish' || c.kind === 'bug';
const _gb2IsFish = (e) => { const f = typeof gardenFishParse === 'function' ? gardenFishParse(e.i) : null, d = f && gardenFishDef(f.id); return !!d && d.cat === 'fish'; };
gardenB2SlotAct({ id: 'hall', order: 25, icon: 'landmark',
  label: () => (_gb2AtMuseum() ? (gardenMuseumHere().visit ? 'Give to their museum' : 'Give to the museum') : 'New for the museum'),
  when: (e, c) => !c.store && (c.kind === 'bug' || c.kind === 'fos' || c.kind === 'cur' || (c.kind === 'fish' && _gb2IsFish(e))) && !!_gb2NewFor(e.i),
  run: (e) => {
    if (!_gb2AtMuseum()) { const near = gardenB2MuseumNear(60); return _gdNo(`The museum hasn’t got ${gardenMuseumA(gardenB2Name(e.i))} yet! Take it ${near ? 'to the ' + String(near.name || 'museum').replace(/^the /i, '') : 'to the museum'} and give it there.`); }
    const inPop = !!(typeof _gdp !== 'undefined' && _gdp.pop && _gdp.pop.tab === 'museum'), r = gardenMuseumGive(e.i, { quiet: inPop });
    if (r && r.ok !== false && !inPop && !gardenMuseumHere().visit) setTimeout(() => { try { if (typeof _gh !== 'undefined' && _gh.bag) { _gh.bag = false; _ghBag(); } gardenMuseumOpen({ wing: gardenMuseumKeyOf(e.i).charAt(0) }); } catch (err) { /* quiet */ } }, 350);   // (the keeper thanks you in the museum itself)
    return r;
  } });
gardenB2SlotAct({ id: 'release', order: 20, icon: 'waves', label: (e, c) => (c.kind === 'bug' ? 'Let it fly off' : 'Let it go'), when: (e, c) => !c.store && ((c.kind === 'fish' && _gb2IsFish(e)) || c.kind === 'bug'), run: (e, c) => (c.kind === 'bug' ? gardenBugRelease(e.i) : gardenFishRelease(e.i)) });
gardenB2SlotAct({ id: 'show', order: 28, icon: 'trophy', label: (e, c) => (_gb2ShowHas(c.kind) ? (c.kind === 'bug' ? 'Put it in your bug case' : 'Put it in your aquarium') : 'Put it on show at home'),
  when: (e, c) => !c.store && !c.visit && ((c.kind === 'fish' && _gb2IsFish(e)) || c.kind === 'bug') && !_gb2Shown(c.kind, c.kind === 'fish' ? gardenFishParse(e.i).id : c.id),
  run: (e, c) => _gb2ShowIt(c.kind, c.kind === 'fish' ? gardenFishParse(e.i).id : c.id) });
/** Do you have a tank (or a bug case) standing in your garden? */
function _gb2ShowHas(kind) { try { const what = kind === 'bug' ? 'bugs' : 'fish'; return gardenHere().decor.some(d => d.def && d.def.effect && d.def.effect.kind === 'show' && d.def.effect.what === what); } catch (e) { return false; } }
function _gb2Shown(kind, id) { try { const s = gardenShowGet(); return (kind === 'bug' ? s.b : s.f).includes(id); } catch (e) { return false; } }
/** On show at home: this kind's best catch, pinned in the tank or the case. */
function _gb2ShowIt(kind, id) {
  let spec = null; try { spec = gardenSpecShown(kind, id); } catch (e) { spec = null; }
  const r = spec && spec.key && typeof gardenSpecPin === 'function' ? gardenSpecPin(spec.key) : gardenShowToggle(kind, id);
  if (!r || r.ok === false) return r || _gdNo('That did not work. Try again.');
  const d = kind === 'bug' ? gardenBugDef(id) : gardenFishDef(id), name = d ? d.name.toLowerCase() : 'catch';
  if (!_gb2ShowHas(kind)) return { ok: true, msg: `Your best ${name} is on show. Put ${kind === 'bug' ? 'a bug case' : 'an aquarium'} in your garden to see it: the shop has them, and the museum’s keeper gives you one for your first ${kind === 'bug' ? 'bug' : 'fish'}.` };
  return { ok: true, msg: kind === 'bug' ? `Your best ${name} is in your bug case now. Friends see it when they visit.` : `Your best ${name} swims in your aquarium now. Friends see it when they visit.` };
}

/* ---------- letting a bug go ---------- */
function gardenBugRelease(key) {
  const id = String(key || '').replace(/^bug:/, ''), d = typeof gardenBugDef === 'function' ? gardenBugDef(id) : null;
  if (!d) return _gdNo('That cannot fly');
  if (gardenHas('bug:' + id) < 1) return _gdNo('You have none of those');
  const g = _gdG(), c = _gca(), today = _gdToday(), lk = 'ca.' + today + '.' + _gdUid(''), mark = _gdMark([['led', lk], ['prefs', 'ca']]);
  g.led[lk] = { d: today, k: 'ca', x: 1, i: { ['bug:' + id]: -1 }, n: 1 };
  const bst = c.bst && typeof c.bst === 'object' ? c.bst : (c.bst = {}); bst[id] = _gdAddDays(today, 7);
  for (const k of Object.keys(bst)) if (String(bst[k]) < today) delete bst[k];
  const ids = Object.keys(bst); if (ids.length > 8) delete bst[ids[0]];
  c.rl = (Number(c.rl) || 0) + 1;
  try { gardenB2ReleasePicture('bug', d); } catch (e) { /* it flew off out of sight */ }
  try { gardenJobEvent({ kind: 'release', def: d }); } catch (e) { /* no job */ }
  return _gdDone(`You let the ${d.name.toLowerCase()} go. You’ll see more of them about this week.`, 'letting a bug go', mark, { icon: 'bug' });
}
/** A bug you let go this week comes a little more often (the bug spawn's weights, 94-garden-fish-2core.js). */
function gardenB2BugWeight(id) { try { const b = _gca().bst; return b && String(b[id] || '') >= _gdToday() ? 1.6 : 1; } catch (e) { return 1; } }

/* ---------- the picture ---------- */
/** The nearest water within r cells (as painted where the world knows it, else from the cells): { x, y } in cells, or null. */
function _gb2WaterNear(px, py, r) {
  const wet = (x, y) => { try { return typeof _gksWetDrawn === 'function' ? _gksWetDrawn(x, y) : typeof gardenWaterContainsPoint === 'function' ? !!gardenWaterContainsPoint(x, y) : gardenIsWater(Math.floor(x), Math.floor(y)); } catch (e) { return false; } };
  if (wet(px, py)) return null;   // (in the water already, wading: no throw)
  const face = typeof _gw !== 'undefined' && _gw.face < 0 ? -1 : 1;
  let best = null, bd = 1e9;
  for (let d = 0.8; d <= r; d += 0.4) for (let a = 0; a < 16; a++) {
    const ang = a / 16 * Math.PI * 2, x = px + Math.cos(ang) * d, y = py + Math.sin(ang) * d * 0.8;
    if (!wet(x, y) || !wet(x + Math.cos(ang) * 0.6, y + Math.sin(ang) * 0.5)) continue;   // (a lip of water, not a puddle's edge: a little further out is water too)
    const score = d - (Math.sign(Math.cos(ang)) === face ? 0.5 : 0);   // (the way you face first)
    if (score < bd) { bd = score; best = { x, y }; }
  }
  return best;
}
const _gb2Rel = { n: 0 };
/** A fish arcs from your hands into the water and swims off in it; a bug lifts off from your hands. Seen on your screen (friends see the
 *  fish swim, the host's water being theirs too). Nothing is drawn while motion is off: the words say it. */
function gardenB2ReleasePicture(kind, def) {
  if (typeof _gw === 'undefined' || !_gw.on || typeof _gwActors !== 'function' || _gb2Rel.n >= 3) return false;
  const a = _gwActors(); if (!a) return false;
  const W = GARDEN_WORLD, S = typeof GARDEN_ACTOR_SCALE === 'number' ? GARDEN_ACTOR_SCALE : 0.8, [fx, fy] = _gwFeet(), hy = fy - 46 * S;
  if (!gardenMotionOn()) return true;
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'gb2-rel'); g.setAttribute('pointer-events', 'none');
  let art = '';
  try { art = kind === 'fish' ? gardenFishArt(def.id, { uid: 'rel' + def.id }) : gardenBugArt(def.id, { uid: 'relb' + def.id }); } catch (e) { art = ''; }
  if (!art) return false;
  const inner = document.createElementNS('http://www.w3.org/2000/svg', 'g'); inner.innerHTML = `<g transform="scale(${(kind === 'fish' ? 0.5 : 0.62) * S})">${art}</g>`;
  g.appendChild(inner); a.appendChild(g); _gb2Rel.n++;
  const done = () => { g.remove(); _gb2Rel.n = Math.max(0, _gb2Rel.n - 1); };
  if (kind === 'fish') {
    const wet = _gb2WaterNear(_gw.px, _gw.py, 3.4);
    if (wet) {
      const tx = wet.x * W.cellW, ty = W.sky + wet.y * W.cellH, mx = (fx + tx) / 2, my = Math.min(hy, ty) - 34 * S, dir = tx >= fx ? 1 : -1;
      // a hop out of the hands, over, and nose first into the water
      const k = []; for (let i = 0; i <= 12; i++) { const t = i / 12, x = (1 - t) * (1 - t) * fx + 2 * (1 - t) * t * mx + t * t * tx, y = (1 - t) * (1 - t) * hy + 2 * (1 - t) * t * my + t * t * ty, rot = dir * (-30 + 110 * t); k.push({ offset: t, transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${rot.toFixed(0)}deg) scale(${dir}, 1)`, opacity: t > .92 ? 0 : 1 }); }
      const an = g.animate(k, { duration: 760, easing: 'cubic-bezier(.3,.1,.6,1)' });
      an.onfinish = an.oncancel = () => {
        done();
        _gb2Splash(a, tx, ty, S);
        try { if (typeof _gfsDecides === 'function' && _gfsDecides() && typeof _gfsAdd === 'function') { _gfs.u = (_gfs.u + 1) % 1000; _gfsAdd({ u: _gfs.u, id: def.id, cm: Math.round((def.cm[0] + def.cm[1]) / 2), x: wet.x, y: wet.y, tx: wet.x + dir * 2.6, ty: wet.y + 0.8, band: 'b0', life: 200 }); _gfs.dirty = true; if (typeof _gfsRing === 'function') _gfsRing(wet.x, wet.y, 1); } } catch (e) { /* it swam off out of sight */ }
      };
    } else {
      // no water near: it leaps from your hands and is gone in a sparkle
      const an = g.animate([{ transform: `translate(${fx}px, ${hy}px) rotate(-20deg)`, opacity: 1 }, { offset: .5, transform: `translate(${fx + 8}px, ${hy - 40 * S}px) rotate(20deg)`, opacity: 1 }, { transform: `translate(${fx + 14}px, ${hy - 56 * S}px) rotate(40deg) scale(.2)`, opacity: 0 }], { duration: 700, easing: 'ease-out' });
      an.onfinish = an.oncancel = () => { done(); _gb2Sparkle(a, fx + 14, hy - 56 * S); };
    }
    return true;
  }
  // a bug: up from your hands, fluttering (a butterfly, a moth, a bee, a dragonfly) or off along the ground (a beetle, a snail, a spider)
  const shape = String(def.shape || ''), walker = /beetle|snail|spider|ant|louse|worm|slater|hopper|centipede|cricket|grasshopper/.test(shape + ' ' + def.id), dir = typeof _gw !== 'undefined' && _gw.face < 0 ? -1 : 1;
  const k = [];
  if (walker) { for (let i = 0; i <= 8; i++) { const t = i / 8; k.push({ offset: t, transform: `translate(${(fx + dir * (8 + 60 * t)).toFixed(1)}px, ${(fy - 2 + Math.sin(t * 9) * 1.4).toFixed(1)}px) scale(${dir}, 1)`, opacity: t > .85 ? 0 : 1 }); } }
  else { for (let i = 0; i <= 14; i++) { const t = i / 14; k.push({ offset: t, transform: `translate(${(fx + dir * 70 * t + Math.sin(t * 14) * 9).toFixed(1)}px, ${(hy - 120 * t * S + Math.cos(t * 11) * 6).toFixed(1)}px) scale(${(1 - t * .35) * dir}, ${(1 - t * .35) * (i % 2 ? .82 : 1)})`, opacity: t > .8 ? 1 - (t - .8) * 5 : 1 }); } }
  const an = g.animate(k, { duration: walker ? 1600 : 1900, easing: 'linear' });
  an.onfinish = an.oncancel = done;
  return true;
}
function _gb2Splash(a, x, y, S) {
  try {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('pointer-events', 'none'); g.setAttribute('class', 'gb2-splash');
    g.innerHTML = `<ellipse cx="0" cy="0" rx="${10 * S}" ry="${3.4 * S}" fill="none" stroke="#eafaf6" stroke-width="1.6"/><ellipse cx="0" cy="0" rx="${4 * S}" ry="${1.4 * S}" fill="#ffffff" opacity=".7"/>` + [-1, 0, 1].map(i => `<path d="M${i * 3 * S} ${-2 * S}q${i * 4 * S} ${-9 * S} ${i * 7 * S} ${-3 * S}" stroke="#ffffff" stroke-width="1.4" fill="none" stroke-linecap="round"/>`).join('');
    g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`); a.appendChild(g);
    const an = g.animate([{ opacity: 1, transform: `translate(${x}px, ${y}px) scale(.6)` }, { opacity: 0, transform: `translate(${x}px, ${y}px) scale(1.8)` }], { duration: 900, easing: 'ease-out' });
    an.onfinish = an.oncancel = () => g.remove();
  } catch (e) { /* quiet */ }
}
function _gb2Sparkle(a, x, y) {
  try {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('pointer-events', 'none');
    g.innerHTML = [0, 1, 2, 3, 4, 5].map(i => { const an = i / 6 * Math.PI * 2; return `<path d="M${(Math.cos(an) * 6).toFixed(1)} ${(Math.sin(an) * 6).toFixed(1)}l${(Math.cos(an) * 5).toFixed(1)} ${(Math.sin(an) * 5).toFixed(1)}" stroke="#fff6c8" stroke-width="1.6" stroke-linecap="round"/>`; }).join('');
    a.appendChild(g);
    const an = g.animate([{ opacity: 1, transform: `translate(${x}px, ${y}px) scale(.5)` }, { opacity: 0, transform: `translate(${x}px, ${y}px) scale(1.6)` }], { duration: 600, easing: 'ease-out' });
    an.onfinish = an.oncancel = () => g.remove();
  } catch (e) { /* quiet */ }
}

/* ---------- the catch card, the moment you land it ---------- */
function gardenB2CatchCard(c, o) {
  if (!c || !o || !o.item || !gardenB2On()) return;
  const item = String(o.item), kind = item.startsWith('bug:') ? 'bug' : 'fish';
  if (kind === 'fish' && !_gb2IsFish({ i: item })) return;
  const isNew = !!_gb2NewFor(item), box = document.createElement('div'); box.className = 'gb2-ccacts';
  if (isNew) { const em = document.createElement('em'); em.className = 'gb2-ccnew'; em.innerHTML = icon('landmark') + '<span>New for the museum!</span>'; box.appendChild(em); }
  const b = document.createElement('button'); b.type = 'button'; b.className = 'gb2-ccbtn'; b.innerHTML = icon(kind === 'bug' ? 'bug' : 'waves') + '<span></span>'; b.lastChild.textContent = kind === 'bug' ? 'Let it fly off' : 'Let it go';
  b.onclick = (ev) => { ev.stopPropagation(); const r = kind === 'bug' ? gardenBugRelease(item) : gardenFishRelease(item); if (r && r.ok === false) { gameDenyOf(r, b); return; } c.classList.add('is-out'); setTimeout(() => { try { gardenUiGone(c); } catch (e) { /* fine */ } c.remove(); }, 220); };
  box.appendChild(b);
  const txt = c.querySelector('.gd-cc-txt') || c; txt.appendChild(box);
  o.ms = Math.max(6500, Number(o.ms) || 0);   // (a moment longer to choose; it still goes on its own, the catch safe in your pockets)
}

/* ---------- the Bag & tackle list: the same choices ---------- */
function gardenB2BagExtras(f, kind, r) {
  if (!gardenB2On() || !r || !r.def) return false;
  if (kind === 'fish' && r.def.cat !== 'fish') return true;
  const item = kind === 'bug' ? 'bug:' + r.id : r.key, key = _gb2NewFor(item);
  if (key) f.appendChild(_gdpBtn('', { icon: 'landmark', kind: 'btn-ghost', aria: 'New for the museum', tip: _gb2AtMuseum() ? 'Give it to the museum' : 'New for the museum: take it there and give it', run: () => { if (_gb2AtMuseum()) _gcpSay(gardenMuseumGive(item)); else gardenMessage(`The museum hasn’t got one yet. Take it to the museum and give it there.`, { icon: 'landmark', ms: 5000 }); } }));
  f.appendChild(_gdpBtn('', { icon: kind === 'bug' ? 'bug' : 'waves', kind: 'btn-ghost', aria: kind === 'bug' ? 'Let it fly off' : 'Let it go', tip: kind === 'bug' ? 'Let it fly off: you’ll see more of them this week' : 'Let it go: there will be more of them in your water this week', run: () => _gcpSay(kind === 'bug' ? gardenBugRelease(item) : gardenFishRelease(r.key)) }));
  return true;
}
