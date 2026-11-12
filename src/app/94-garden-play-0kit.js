/* ============================================================
   PLAY, the kit (2.40; docs/dev/HUNDRED_PLAY.md). The owner, 1 Nov 2026: "Garden features and game related ... take ideas of any game you can think of."
   One place for things to do beyond catching: Play in the garden's menu. A game is one row, gardenPlayAdd({id, name, icon, group, blurb, open(), status?()}).

     gpGet(key, dflt), gpSet(key, value)     one saved value (g.seen under 'pl.'): latest wins per key, no sync change, an old save has none
     gpPay(why, {xp, items})                 a ledger line of kind 'pl'; XP at most GP_ECON.xpDay. Games never pay coins, and pay no tickets: tickets are gone (JOURNAL.md section 9)
     gpSpend(label, items, msg)              things out of (or into) the bag as one ledger line, with the garden's Undo
     gpGrant(key, items)                     once ever, by key (a ledger key, so two devices give it once)
     gpStage(title, build, o)                a dialog for a game, with Back to Play
     gpPet(), gpPetMe()                      your pet's look and name; its roaming self in the world
     gpTone(notes, o)                        a few notes. Only when sounds are on, unless o.force (you pressed a note yourself)
     gardenPlayHud(box, m)                   from the garden's HUD paint: rows' `hud(m)`, at most once every few seconds
   ============================================================ */
const GP_ECON = Object.freeze({ ticketsDay: 30, xpDay: 20 });
const GP_GROUPS = Object.freeze([['games', 'Games'], ['pet', 'With your pet'], ['world', 'In the garden'], ['make', 'Make and mend'], ['secret', 'Stories and finds'], ['stall', 'Prizes']]);
const _gpRows = [];
const _gp = { hudAt: 0, ac: null, group: 'games' };
function gardenPlayAdd(row) { _gpRows.push(gardenActivityRow(row.id) ? Object.assign({}, row, { group: 'world' }) : row); }
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
function gpTickets() { return 0; }   // (tickets are gone)
function gpPay(why, o) {
  o = o || {};
  const day = gpToday(), n = 0, x = Math.max(0, Math.min(Math.floor(o.xp || 0), GP_ECON.xpDay - day.xp));
  const items = Object.assign({}, o.items || {}); if (n) items.ticket = n;
  if (!x && !Object.keys(items).length) return { tickets: 0, full: false };
  _gdLed('pl', { i: items, x, n: 1, w: String(why || '').slice(0, 16) });
  _gdSave(); gardenTickSoon();
  return { tickets: 0, full: false };
}
function gpPaidLine(r) { void r; return ''; }   // (games paid tickets once; now the game is the reward)
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
  gardenPagerFresh();
  return openDialog({ title, size: o.size || 'lg', fixed: !!o.fixed, height: o.fixed ? '82vh' : '', className: 'gd-popup gp-stage', keepOnOutside: false, resizable: false,
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
/** A routine model refresh must not detach a pressed game button. Keep the
 * current page connected; a real group/list/page change still uses the pager. */
function _gpPlayCardPatch(b, r, selected) {
  let st = ''; try { st = r.status ? r.status() : ''; } catch (e) { st = ''; }
  let fresh = false; try { fresh = !!(r.fresh && r.fresh()); } catch (e) { /* no */ }
  const active = r.group === 'world' && selected === r.id, cls = 'gp-card' + (fresh ? ' is-fresh' : '') + (active ? ' is-selected' : '');
  const html = `<span class="gp-ic">${icon(r.icon)}</span><span class="gp-t"><b>${esc(r.name)}</b>${active ? '<small class="gp-current">Set out · Return to it</small>' : ''}<span>${esc(r.blurb)}</span>${st ? `<em>${esc(st)}</em>` : ''}</span>`;
  if (b.className !== cls) b.className = cls;
  if (active) { if (b.getAttribute('aria-current') !== 'true') b.setAttribute('aria-current', 'true'); }
  else if (b.hasAttribute('aria-current')) b.removeAttribute('aria-current');
  if (b._gpPlayHtml !== html) { b.innerHTML = html; b._gpPlayHtml = html; }
  return b;
}
function _gpPlayCard(r, selected) {
  const b = gpEl('button'); b.type = 'button'; b.dataset.game = r.id;
  b.onclick = () => { try { gardenPlayOpen(r.id); } catch (e) { console.error('[play]', e); toastError('open that', e); } };
  return _gpPlayCardPatch(b, r, selected);
}
function _gpPlayHead(groups, m, selected, activity, next) {
  const head = document.createDocumentFragment();
  head.appendChild(_gdxChips(groups, _gp.group, (k) => { _gp.group = k; _gdxRepaintTab(); }));
  if (_gp.group === 'world') {
    const lead = gpEl('div', 'gp-head');
    lead.appendChild(gpEl('p', 'gp-lead', activity ? activity.name + ' is set out.' : m.visit ? 'Your host chooses what to set out here.' : 'Set out one activity when you feel like it. The rest stays packed away.'));
    if (activity) {
      const back = uiButton({ label: 'Return to it', icon: 'arrow-right', size: 'sm', run: () => gardenPlayOpen(selected) });
      back.dataset.activityReturn = selected; lead.appendChild(back);
    }
    if (activity && !m.visit) lead.appendChild(uiButton({ label: 'Put it away', icon: 'archive', size: 'sm', run: () => { gardenActivityChoose(''); _gdxRepaintTab(); } }));
    head.appendChild(lead);
    if (next) head.appendChild(gpEl('p', 'muted', 'Next, at garden level ' + next.level + ': ' + next.name + '.'));
  } else if (_gp.group === 'stall') {
    head.appendChild(gpEl('p', 'gp-lead', 'Play whenever you like. The prize stall has one thing a day for you, free.'));
  }
  return head;
}
function gardenPlayTab(el) {
  const m = gardenHere(), selected = gardenActivitySelection(m), activity = gardenActivityRow(selected);
  const shown = r => r.group !== 'world' || (m.visit ? r.id === selected : gardenActivityUnlocked(r.id, m));
  const groups = GP_GROUPS.filter(([g]) => g === 'world' || _gpRows.some(r => r.group === g && shown(r))), nameOf = new Map(groups);
  if (!groups.some(([g]) => g === _gp.group)) _gp.group = groups[0][0];
  const rows = _gpRows.filter(r => r.group === _gp.group && shown(r)), ids = JSON.stringify(rows.map(r => r.id));
  const next = _gp.group === 'world' && !m.visit ? GARDEN_WORLD_ACTIVITIES.find(r => !gardenActivityUnlocked(r.id, m)) : null;
  const headKey = JSON.stringify([groups, _gp.group, _gp.group === 'world' ? [selected, activity && activity.name, !!m.visit, next && [next.id, next.level, next.name]] : _gp.group === 'stall' ? gpTickets() : null]);
  const view = el._gpPlayView;
  if (view && view.group === _gp.group && view.ids === ids && view.pager.root.parentNode === el && view.pager.root.isConnected && view.head.every(n => n.parentNode === el)) {
    view.selected = selected; view.pager.items = rows;
    const byId = new Map(rows.map(r => [r.id, r]));
    for (const b of view.pager.page.querySelectorAll(':scope > .gp-card[data-game]')) { const r = byId.get(b.dataset.game); if (r) _gpPlayCardPatch(b, r, selected); }
    if (view.headKey !== headKey) {
      const head = _gpPlayHead(groups, m, selected, activity, next), nodes = [...head.childNodes];
      for (const n of view.head) n.remove();
      el.insertBefore(head, view.pager.root); view.head = nodes; view.headKey = headKey;
      gardenPagerFit();   // a changed lead can change the real page capacity
    }
    return;
  }
  el.textContent = '';
  const head = _gpPlayHead(groups, m, selected, activity, next), current = { group: _gp.group, ids, selected, headKey, head: [...head.childNodes], pager: null };
  el.appendChild(head);
  current.pager = gardenPager(el, { key: 'play:' + _gp.group, items: rows, grid: 'gp-grid', row: 132, rowSm: 132, label: (r) => nameOf.get(r.group), draw: (r) => _gpPlayCard(r, current.selected) });
  el._gpPlayView = current;
}
function gardenPlayOpen(id) {
  const r = _gpRows.find(x => x.id === id); if (!r) return;
  if (gardenActivityRow(id)) {
    if (!gardenActivityChoose(id)) { if (gardenHere().visit) gardenMessage('Your host chooses the activity in this garden.', { ms: 4500 }); return; }
    gardenPopupClose();
  }
  if (!gpGet('opened.' + id)) gpSet('opened.' + id, _gdToday());
  r.open();
}
function gardenPlayBubble(d, items) {
  const r = _gpRows.find(x => x.id === (d.def.effect && d.def.effect.game)); if (!r) return;
  items.unshift({ ic: r.icon, label: r.verb || r.name, cls: 'is-go', run: () => { gardenBubbleClose(); gardenPlayOpen(r.id); } });
  if (r.bubble) r.bubble(d, items);
}
function gardenPlayBadge() { let n = 0; for (const r of _gpRows) { try { if (gpGet('opened.' + r.id) && r.fresh && r.fresh()) n++; } catch (e) { /* no */ } } return n; }
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
      const took = gpGet('pz.' + _gdToday());
      el.appendChild(gpEl('p', 'gp-lead', took ? 'You have had today’s prize. Come back tomorrow for another.' : 'One prize a day, free: pick the one you like. It goes in your bag, to put where you like, and friends can see it.'));
      const grid = gpEl('div', 'gp-prizes');
      for (const [id, cost] of GP_PRIZES) {
        const d = gardenDecor(id); if (!d) continue;
        const c = gpEl('div', 'gp-prize');
        c.innerHTML = `<div class="gp-prize-art">${gardenIconSvg(id, { kind: 'decor', px: 72 })}</div><b>${esc(d.name)}</b><span class="muted">${esc(d.blurb || '')}</span>`;
        void cost;
        c.appendChild(uiButton({ label: took ? 'Tomorrow' : 'Take this one', icon: 'gift', size: 'sm', disabled: !!took, run: () => {
          if (gpGet('pz.' + _gdToday())) return;
          gpSpend('a prize', { ['decor:' + id]: 1 }, `${d.name}: it is in your bag`); gpSet('pz.' + _gdToday(), id); paint();
          gardenToast(`${d.name} is in your bag`, { icon: 'gift', action: { label: 'Undo', run: () => { gardenUndo(); paint(); } } });
        } }));
        grid.appendChild(c);
      }
      el.appendChild(grid);
    };
    paint();
  });
}
gardenPlayAdd({ id: 'stall', name: 'Prize stall', icon: 'ticket', group: 'stall', blurb: 'A silly thing a day for your garden, free.', status: () => gpGet('pz.' + _gdToday()) ? 'Come back tomorrow' : 'Today’s prize is waiting', open: _gpStall });
