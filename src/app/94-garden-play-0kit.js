/* ============================================================
   PLAY, the kit (2.40; docs/dev/HUNDRED_PLAY.md). The owner, 1 Nov 2026: "Garden features and game related ... take ideas of any game you can think of."
   One place for things to do beyond catching: Play in the garden's menu. A game is one row, gardenPlayAdd({id, name, icon, group, blurb, open(), status?()}).

     gpGet(key, dflt), gpSet(key, value)     one saved value (g.seen under 'pl.'): latest wins per key, no sync change, an old save has none
     gpPay(why, {tickets, xp, items})        a ledger line of kind 'pl'; tickets at most GP_ECON.ticketsDay a day, XP at most GP_ECON.xpDay. Games never pay coins
     gpSpend(label, items, msg)              things out of (or into) the bag as one ledger line, with the garden's Undo
     gpGrant(key, items)                     once ever, by key (a ledger key, so two devices give it once)
     gpStage(title, build, o)                a dialog for a game, with Back to Play
     gpPet(), gpPetMe()                      your pet's look and name; its roaming self in the world
     gpTone(notes, o)                        a few notes. Only when sounds are on, unless o.force (you pressed a note yourself)
     gardenPlayHud(box, m)                   from the garden's HUD paint: rows' `hud(m)`, at most once every few seconds
   ============================================================ */
const GP_ECON = Object.freeze({ ticketsDay: 30, xpDay: 20 });
const GP_GROUPS = Object.freeze([['pet', 'With your pet'], ['games', 'Games'], ['make', 'Make and mend'], ['secret', 'Secrets'], ['stall', 'Prizes']]);
const _gpRows = [];
const _gp = { hudAt: 0, ac: null };
function gardenPlayAdd(row) { _gpRows.push(row); }
function gpGet(k, d) { const v = _gdG().seen['pl.' + k]; return v === undefined ? d : v; }
function gpSet(k, v) { _gdG().seen['pl.' + k] = v; _gdSave(); }
function gpEsc(s) { return esc(String(s == null ? '' : s)); }
function gpEl(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
function gpDayHash(salt, day) { return gardenHash('gp|' + salt + '|' + (day || _gdToday())); }

/* ---------- tickets ---------- */
function gpToday() {
  const g = _gdG(), d = _gdToday(); let t = 0, x = 0;
  for (const e of Object.values(g.led)) if (e && e.k === 'pl' && e.d === d) { const n = e.i && Number(e.i.ticket); if (n > 0) t += n; if (e.x > 0) x += Number(e.x); }
  return { tickets: t, xp: x };
}
function gpTickets() { return gardenHas('ticket'); }
function gpPay(why, o) {
  o = o || {};
  const day = gpToday(), n = Math.max(0, Math.min(Math.floor(o.tickets || 0), GP_ECON.ticketsDay - day.tickets)), x = Math.max(0, Math.min(Math.floor(o.xp || 0), GP_ECON.xpDay - day.xp));
  const items = Object.assign({}, o.items || {}); if (n) items.ticket = n;
  if (!n && !x && !Object.keys(items).length) return { tickets: 0, full: !!o.tickets };
  _gdLed('pl', { i: items, x, n: 1, w: String(why || '').slice(0, 16) });
  _gdSave(); gardenTickSoon();
  return { tickets: n, full: !!o.tickets && n < o.tickets };
}
function gpPaidLine(r) { return r.tickets ? `${r.tickets} ticket${r.tickets === 1 ? '' : 's'}` + (r.full ? ' (that is all the tickets for today)' : '') : r.full ? 'No more tickets today, but the game is yours to play' : ''; }
function gpSpend(label, items, msg) {
  const key = 'pl.' + _gdToday() + '.' + _gdUid(''), mark = _gdMark([['led', key]]);
  _gdG().led[key] = { d: _gdToday(), k: 'pl', i: items, n: 1 };
  return _gdDone(msg, label, mark, { icon: 'gift' });
}
function gpGrant(key, items) {
  const g = _gdG(), k = 'plg.' + key;
  if (g.led[k] || g.seen['pl.gr.' + key]) return false;   // (the seen mark: the ledger folds old lines into the bank)
  g.led[k] = { d: _gdToday(), k: 'pl', i: items, n: 1 };
  g.seen['pl.gr.' + key] = _gdToday();
  _gdSave();
  return true;
}
function gpNote(text) { try { if (typeof _gdgNote === 'function') _gdgNote(text); else gardenToast(text, { icon: 'gamepad-2', dismiss: true }); } catch (e) { /* no stage */ } }
function gpVisiting() { return typeof gardenVisitOn === 'function' && !!gardenVisitOn(); }
function gpInWorld() { return typeof _gdpopInGarden === 'function' && _gdpopInGarden() && !gpVisiting(); }

/* ---------- pets ---------- */
function gpPet() {
  try { if (typeof petHas === 'function' && petHas()) { const g = petGet(); return { look: g.look, name: petName(g), sp: petSpecies(g.look.species) || {} }; } } catch (e) { /* no pets here */ }
  return null;
}
function gpPetMe() { try { return (_ptw.pets || []).find(P => P.me) || null; } catch (e) { return null; } }
function gpPetSvg(pet, size, pose, mood) { return petSvg(pet.look, { size, pose: pose || 'sit', mood: mood || { eyes: 'happy', mouth: 'smile' } }); }
function gpNeedPet(el) { el.appendChild(gpEl('p', 'muted', 'This one needs a pet. You can adopt one from the Pets page, under Life.')); }

/* ---------- sound ---------- */
function gpTone(notes, o) {
  o = o || {};
  try {
    if (!o.force && !(typeof _gmG === 'function' && _gmG().prefs.sounds)) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC || document.hidden) return;
    const ac = _gp.ac || (_gp.ac = new AC()); if (ac.state === 'suspended') ac.resume();
    const t0 = ac.currentTime + 0.02, gap = o.gap || 0.12, len = o.len || 0.32;
    notes.forEach((f, i) => {
      const s = ac.createOscillator(), v = ac.createGain(); s.type = o.type || 'triangle'; s.frequency.value = f;
      const t = t0 + i * gap; v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(o.vol || 0.07, t + 0.015); v.gain.exponentialRampToValueAtTime(0.0001, t + len);
      s.connect(v); v.connect(ac.destination); s.start(t); s.stop(t + len + 0.02);
    });
  } catch (e) { /* no audio here */ }
}

/* ---------- the stage: a game's dialog ---------- */
function gpStage(title, build, o) {
  o = o || {};
  try { if (typeof _gw !== 'undefined') { _gw.keys.clear(); _gw.path = []; } gardenBubbleClose(); if (typeof _gwFishBusy === 'function' && _gwFishBusy()) _gwFishCancel(''); } catch (e) { /* not in the world */ }
  return openDialog({ title, size: o.size || 'lg', className: 'gd-popup gp-stage', keepOnOutside: false, resizable: false,
    body(el, close) { el.classList.add('gd-body', 'gp-body'); build(el, close); },
    actions: [{ label: 'Back to Play', icon: 'gamepad-2', run: () => { setTimeout(() => gardenPopupOpen('play'), 0); } }],
    onClose: o.onClose });
}
/** Stops a game's loop when its dialog goes. */
function gpLoop(el, step) {
  let last = performance.now(), raf = 0;
  const f = (t) => { if (!el.isConnected) return; const dt = Math.min(0.05, (t - last) / 1000); last = t; if (step(dt) === false) return; raf = requestAnimationFrame(f); };
  raf = requestAnimationFrame(f);
  return () => cancelAnimationFrame(raf);
}
function gpBest(key, v, low) { const b = gpGet('best.' + key); if (v != null && (b === undefined || (low ? v < b : v > b))) { gpSet('best.' + key, v); return true; } return false; }

/* ---------- the panel ---------- */
function gardenPlayTab(el) {
  el.textContent = '';
  const given = gpGrant('start', { 'decor:play-pot': 1, 'decor:play-mill': 1 });
  const day = gpToday(), head = gpEl('div', 'gp-head');
  head.innerHTML = `<span class="gp-tickets">${icon('ticket')}<b>${gpTickets()}</b> tickets</span><span class="muted">${esc(day.tickets >= GP_ECON.ticketsDay ? 'All of today’s tickets are won. Keep playing if you like, it is just for fun now.' : `Games pay tickets, up to ${GP_ECON.ticketsDay} a day. The prize stall takes them.`)}</span>`;
  el.appendChild(head);
  if (given || !Object.values(_gdG().decor).some(d => d && d.d === 'play-pot') && gardenHas('decor:play-pot')) el.appendChild(gpEl('p', 'gp-lead', 'There is a cooking pot and an old mill in your bag. Put them in the garden, and click them to use them.'));
  for (const [g, label] of GP_GROUPS) {
    const rows = _gpRows.filter(r => r.group === g); if (!rows.length) continue;
    el.appendChild(gpEl('h3', 'gp-h', label));
    const grid = gpEl('div', 'gp-grid');
    for (const r of rows) {
      let st = ''; try { st = r.status ? r.status() : ''; } catch (e) { st = ''; }
      let fresh = false; try { fresh = !!(r.fresh && r.fresh()); } catch (e) { /* no */ }
      const b = gpEl('button', 'gp-card' + (fresh ? ' is-fresh' : '')); b.type = 'button'; b.dataset.game = r.id;
      b.innerHTML = `<span class="gp-ic">${icon(r.icon)}</span><span class="gp-t"><b>${esc(r.name)}</b><span>${esc(r.blurb)}</span>${st ? `<em>${esc(st)}</em>` : ''}</span>`;
      b.onclick = () => { try { r.open(); } catch (e) { console.error('[play]', e); toastError('open that', e); } };
      grid.appendChild(b);
    }
    el.appendChild(grid);
  }
}
function gardenPlayOpen(id) { const r = _gpRows.find(x => x.id === id); if (r) r.open(); }
function gardenPlayBubble(d, items) {
  const r = _gpRows.find(x => x.id === (d.def.effect && d.def.effect.game)); if (!r) return;
  items.unshift({ ic: r.icon, label: r.verb || r.name, cls: 'is-go', run: () => { gardenBubbleClose(); r.open(); } });
  if (r.bubble) r.bubble(d, items);
}
function gardenPlayBadge() { let n = 0; for (const r of _gpRows) { try { if (r.fresh && r.fresh()) n++; } catch (e) { /* no */ } } return n; }
function _gpTidy() {
  const today = _gdToday(); if (_gp.tidied === today) return; _gp.tidied = today;
  const s = _gdG().seen, cut = _gdAddDays(today, -30); let n = 0;
  for (const k of Object.keys(s)) { if (!k.startsWith('pl.')) continue; const m = /\.(\d{4}-\d{2}-\d{2})$/.exec(k); if (m && m[1] < cut) { delete s[k]; n++; } }
  if (n) _gdSave();
}
/** From the HUD's paint, which runs when something changes: quiet work, at most every few seconds. */
function gardenPlayHud(box, m) {
  const t = Date.now(); if (t - _gp.hudAt < 3000) return; _gp.hudAt = t;   // clock-ok: only paces the work
  _gpTidy();
  for (const r of _gpRows) if (r.hud) { try { r.hud(m, box); } catch (e) { console.error('[play]', e); } }
}

/* ---------- the prize stall ---------- */
const GP_PRIZES = Object.freeze([['play-pz-gnome', 25], ['play-pz-flamingo', 25], ['play-pz-balloon', 30], ['play-pz-marble', 40], ['play-pz-trophy', 60], ['play-pz-stand', 120]]);
function _gpStall() {
  gpStage('Prize stall', (el) => {
    const paint = () => {
      el.textContent = '';
      el.appendChild(gpEl('p', 'gp-lead', `You have ${gpTickets()} tickets. Everything here goes in your bag, to put where you like, and friends can see it.`));
      const grid = gpEl('div', 'gp-prizes');
      for (const [id, cost] of GP_PRIZES) {
        const d = gardenDecor(id); if (!d) continue;
        const c = gpEl('div', 'gp-prize');
        c.innerHTML = `<div class="gp-prize-art">${gardenIconSvg(id, { kind: 'decor', px: 72 })}</div><b>${esc(d.name)}</b><span class="muted">${esc(d.blurb || '')}</span>`;
        c.appendChild(uiButton({ label: `${cost} tickets`, icon: 'ticket', size: 'sm', disabled: gpTickets() < cost, tip: gpTickets() < cost ? `You need ${cost - gpTickets()} more` : '', run: () => {
          if (gpTickets() < cost) return;
          gpSpend('a prize', { ticket: -cost, ['decor:' + id]: 1 }, `${d.name}: it is in your bag`); paint();
          gardenToast(`${d.name} is in your bag`, { icon: 'gift', action: { label: 'Undo', run: () => { gardenUndo(); paint(); } } });
        } }));
        grid.appendChild(c);
      }
      el.appendChild(grid);
    };
    paint();
  });
}
gardenPlayAdd({ id: 'stall', name: 'Prize stall', icon: 'ticket', group: 'stall', blurb: 'Tickets buy silly things that stand in your garden.', status: () => `${gpTickets()} tickets`, open: _gpStall });
