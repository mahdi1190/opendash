/* ============================================================
   PETS, LIFE (2.23, agent 'craft'): what pets do by themselves with all this, and what they do for friends.
     petIdlePick(species, per)   the next thing to do on its own: its persona's habits, the moods, the tricks you own; never the same few in a row
     petSurpriseMaybe(where)     now and then, with nobody asking, something rare. At most one a day, and a good while apart
     petVisitPerform(holder, snap, friend)   on a friend's garden: their pet does what they have taught it (ids from their snapshot, whatever this version knows), and takes requests
     petCueCheck()               a trick the assistant asked for
   ============================================================ */
const _ptl = { recent: [], key: '', own: null, ownAt: 0, cueAt: 0, surpriseT: 0, sawKey: '' };
const _PTL_WINDOW = 6;   // nothing repeats within this many
function _ptlOwned(species) {
  const k = species + '|' + JSON.stringify(_ptS().buy ? Object.keys(_ptS().buy).length : 0) + '|' + Object.keys(_ptS().tricks || {}).length;
  if (_ptl.key !== k || Date.now() - _ptl.ownAt > 60000) { _ptl.key = k; _ptl.ownAt = Date.now(); _ptl.own = petBookOwnedIds(species); }   // clock-ok: a memo
  return _ptl.own;
}
function petIdlePick(species, per) {
  try {
    const habit = (per && per.acts) || ['look', 'sniff'], own = _ptlOwned(species), pool = [];
    for (const n of habit) { const c = petClipDef(n) ? (PET_CLIP_ALIAS[n] || n) : null; if (c && petClipSuits(c, species)) pool.push([c, 3]); }   // what this kind of pet is like
    for (const c of own) pool.push([c, 1]);
    const open = pool.filter(([c]) => !_ptl.recent.includes(c)), list = open.length ? open : pool;
    if (!list.length) return 'look';
    let sum = 0; for (const [, w] of list) sum += w;
    let r = Math.random() * sum, pick = list[0][0];
    for (const [c, w] of list) { r -= w; if (r <= 0) { pick = c; break; } }
    _ptl.recent.push(pick); if (_ptl.recent.length > _PTL_WINDOW) _ptl.recent.shift();
    return pick;
  } catch (e) { return 'look'; }
}
/* ---------- a surprise ---------- */
const _PTL_GAP = 40 * 60000, _PTL_PER_MIN = 0.012;   // at most one in forty minutes, about one chance in eighty for each idle minute: rare
function _ptlSurpriseAllowed() {
  const p = _ptS(), today = _ptToday();
  if (p.wowDay === today) return false;
  return Date.now() - _ptl.surpriseT > _PTL_GAP;   // clock-ok: a pause between surprises
}
/** Called when a pet with you has nothing to do. dt in seconds since the last ask. */
function petSurpriseMaybe(where, dt) {
  try {
    if (!_ptMotionOk() || _ptFun() !== 'full' || document.hidden || !_ptlSurpriseAllowed()) return false;
    if (Math.random() > _PTL_PER_MIN * (dt || 0) / 60) return false;
    const p = _ptS(), mine = petBookWowOwned(p);
    let row = mine.length ? mine[Math.floor(Math.random() * mine.length)] : null;
    // nothing wonderful yet? once a week it shows you what might be possible, a taste of one you could earn (not a secret)
    if (!row) { const wk = Math.floor(_ptDays('2026-01-01', _ptToday()) / 7); if (p.wowTaste === wk) return false; const can = PET_TRICK_BOOK.filter(r => r.wow && !r.how.secret); row = can[wk % can.length]; p.wowTaste = wk; }
    p.wowDay = _ptToday();
    if (typeof saveUI === 'function') saveUI();
    _ptl.surpriseT = Date.now();   // clock-ok: see above
    return !!petWowRun(row.wow, where);
  } catch (e) { return false; }
}
/* ---------- the assistant asked ---------- */
function petCueCheck(where) {
  try {
    const c = _ptS().cue; if (!c || !c.id) return false;
    const key = c.id + '|' + c.at; if (_ptl.sawKey === key) return false;
    const fresh = Math.abs((typeof Clock !== 'undefined' ? Clock.now() : Date.now()) - Number(c.at)) < 3 * 60000;   // clock-ok: too late is too late
    _ptl.sawKey = key;
    if (!fresh) return false;
    const r = petBookRow(c.id); if (!r) return false;
    if (r.wow) return !!petWowRun(r.wow, where);
    const clip = r.clip || r.id;
    if (where === 'garden') { const P = _ptw.pets.find(q => q.me); if (!P) return false; const d = petClipDef(clip); P.tx = null; P.draw(d.pose, d.face || { eyes: 'open', mouth: 'smile' }); P.clip(clip, d.ms, () => { P.sit(); P.busy = 1; }); return true; }
    if (where && where.actor) { const d = petClipDef(clip); where.actor.play(clip, d.ms); return true; }
  } catch (e) { /* quiet */ }
  return false;
}
/* ---------- for friends: only ids over the wire, and an id we do not know is skipped ---------- */
function _ptlFriendPets(holder) { return [...holder.querySelectorAll('.pt-g')].filter(n => n.isConnected); }
function petVisitPerform(holder, snap, f) {
  try {
    const ids = (snap && Array.isArray(snap.tk) ? snap.tk : []).filter(id => petBookRow(id));
    if (!ids.length || !_ptMotionOk() || _ptFun() === 'off') return;
    const clips = ids.map(petBookRow).filter(r => !r.wow), wows = ids.map(petBookRow).filter(r => r.wow);
    const box = holder.closest('.gsv-stage') || holder.parentElement || holder;
    const pet = () => _ptlFriendPets(holder)[0];
    const play = (r) => { const n = pet(); if (!n) return; if (r.wow) { petFriendWow(r.wow, n); return; } const clip = r.clip || r.id, sp = (/pt-sp-([a-z]+)/.exec(n.getAttribute('class') || '') || [])[1]; if (!petClipSuits(clip, sp)) return; petClipRun(n, clip); };
    const ask = _ptEl('button', 'ptb-ask'); ask.type = 'button'; ask.innerHTML = icon('wand-sparkles', 'i-sm'); ask.setAttribute('data-tip', 'Ask for a trick'); ask.setAttribute('aria-label', 'Ask their pet for a trick');
    let n = 0;
    ask.onclick = () => { n++; const r = (wows.length && n % 4 === 0) ? wows[(n / 4 - 1) % wows.length] : clips.length ? clips[Math.floor(Math.random() * clips.length)] : wows[0]; if (r) play(r); };
    if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
    box.appendChild(ask);
    // and now and then, unasked
    const tick = () => { if (!holder.isConnected) return; if (!document.hidden && clips.length && Math.random() < 0.5) play(clips[Math.floor(Math.random() * clips.length)]); setTimeout(tick, 9000 + Math.random() * 11000); };
    setTimeout(tick, 5000);
  } catch (e) { console.error('[tricks] visit', e); }
}
/** A friend's pet doing something wonderful in their garden: the same library on a drawn pet. */
function petFriendWow(id, node) {
  const def = PET_WOW[id]; if (!def) return;
  const host = {
    pos() { const m = node.getScreenCTM(), r = node.getBoundingClientRect(); return { x: m.e, y: m.f, h: Math.max(30, r.height * 0.8) }; },
    outline() { return _fxOutlineOf(node); },
    pet: { play(clip) { petClipRun(node, clip); }, hide(on, ms) { try { node.style.transition = `opacity ${ms || 200}ms`; node.style.opacity = on ? '0' : '1'; } catch (e) { /* fine */ } }, lift() {}, far() { return null; }, hop() {} },
    world: { nudge() {}, shake() {}, freeze() {}, react() {} },
    end() { node.style.opacity = ''; },
  };
  petFxRun(def, host, {});
}
