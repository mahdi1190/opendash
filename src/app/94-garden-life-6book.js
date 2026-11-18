/* ============================================================
   GARDEN LIFE, discoveries and their rewards. The Field Journal shows the creatures and keepsakes you have found.

     gardenLifeFound(kind, id, o)  kind 'c' creature, 'e' surprise, 'k' keepsake: note it (the first time), pay once. Automatic sightings stay in Recent; {userAction:true} answers a real hello/pickup. Synced in state.garden.disc as 'lf.<kind>.<id>': <first day>.
     gardenLifeHas(kind, id)    have you found it?
     gardenLifeFacts()          {creatures, surprises, keepsakes, rare, found: {c: {id: day}, e, k}} for anything that wants to unlock by them: pet unlock rows can say {life: 'fox'} or {lifeCount: 10}
     gardenLifeUnlocked(rule)   the check for those rules: true, or false

   THE ECONOMY stays honest: one payment per discovery, ever, by id (GL_ECON, the ledger's entry 'lf' works like every other row of the wallet). At most GL_ECON.dayCoins a day; what is left over is paid on a later day,
   not lost (gardenLifeSettle). Saying hello again pays nothing, so there is nothing to farm. Keys are prefixed, so nothing that counts plants and visitors in `disc` is affected.
   ============================================================ */
const GL_ECON = Object.freeze({ coins: Object.freeze({ common: 1, uncommon: 2, rare: 4, epic: 8, legendary: 15 }), xp: Object.freeze({ common: 1, uncommon: 2, rare: 3, epic: 5, legendary: 8 }), keepsake: 1, dayCoins: 12 });

function _glKey(kind, id) { return `lf.${kind}.${id}`; }
function gardenLifeHas(kind, id) { try { return !!_gdG().disc[_glKey(kind, id)]; } catch (e) { return false; } }
function _glDefOf(kind, id) { return kind === 'c' ? GL_CREATURE.get(id) : kind === 'e' ? GL_EGG.get(id) : GL_KEEPSAKE.get(id); }
function gardenLifeFound(kind, id, o) {
  try {
    const def = _glDefOf(kind, id); if (!def || !gardenReady()) return false;
    const g = _gdG(), key = _glKey(kind, id);
    if (g.disc[key]) return false;
    g.disc[key] = _gdToday();
    if (kind === 'c' && gardenVisitor(id) && !g.disc[id]) g.disc[id] = _gdToday();   // the Almanac's Visitors page knows it too
    gardenLifeSettle(true);
    _glbShow(kind, def, o);
    if (kind === 'k' && o && o.userAction && typeof gardenCatchMoment === 'function') gardenCatchMoment('keep', id, { isNew: true });
    return true;
  } catch (e) { console.error('[garden life]', e); return false; }
}
/** The garden's day log knows who you saw (a catalogue visitor only): the daily goals and ribbons count it. */
function gardenLifeSeenToday(id) {
  try {
    if (!gardenVisitor(id)) return;
    const g = _gdG(), t = _gdToday(), day = g.vd[t] || (g.vd[t] = {});
    if (!day[id]) { day[id] = 1; _gdSave(); if (typeof gardenTickSoon === 'function') gardenTickSoon(); }
  } catch (e) { /* only a note */ }
}
function _glReward(kind, def) { if (kind === 'k') return { c: GL_ECON.keepsake, x: 1 }; const r = def.rarity || 'common'; return { c: GL_ECON.coins[r] || 1, x: GL_ECON.xp[r] || 1 }; }
/** Pay what is owed for discoveries, up to today's limit. The ledger's key is the discovery's, so two devices cannot pay it twice. */
function gardenLifeSettle(save) {
  const g = _gdG(), today = _gdToday(); let paid = 0, changed = false;
  for (const [k, e] of Object.entries(g.led)) if (e && e.k === 'lf' && e.d === today) paid += Number(e.c) || 0;
  for (const key of Object.keys(g.disc)) {
    if (!key.startsWith('lf.') || g.disc['lp' + key.slice(2)]) continue;
    const dot = key.indexOf('.', 3), kind = key.slice(3, dot), id = key.slice(dot + 1), def = _glDefOf(kind, id);
    if (!def) continue;   // an id from a newer version: it stays noted, and pays when this version knows it
    const r = _glReward(kind, def);
    if (paid + r.c > GL_ECON.dayCoins) continue;
    paid += r.c;
    g.led['lfr.' + kind + '.' + id] = { d: today, k: 'lf', c: r.c, x: r.x, n: 1 };
    g.disc['lp' + key.slice(2)] = today;   // (the ledger is folded by month; this mark is what stops a second payment for good)
    changed = true;
  }
  if (changed || save) { if (typeof _gdSave === 'function') _gdSave(); }
}
/* ---------- discovery feedback: keep the book, not a parade of automatic cards ---------- */
function _glbShow(kind, def, o) {
  const r = _glReward(kind, def), paid = !!_gdG().disc['lp.' + kind + '.' + def.id];
  const text = `New in your Field Journal: ${def.name}.` + (paid ? ` ${r.c} coin${r.c === 1 ? '' : 's'} and ${r.x} XP.` : ' Its reward will be paid on a later day.');
  // The sighting and payment already happened above. Do not defer a card that
  // could later interrupt a fishing bite or another activity the player chose.
  // A picked-up keepsake has its existing catch presentation as the main reply.
  const explicit = !!(o && o.userAction) && kind !== 'k';
  gardenMessage(text, { ambient: !explicit, source: 'nature:' + kind + ':' + def.id, icon: 'book-open', ...(explicit ? { action: { label: 'Field Journal', run: () => gardenJournalOpen({ sec: kind === 'k' ? 'keep' : 'creatures', kind: 'seen' }) } } : {}) });
}
/** A picture for the book: the creature's kit art at rest, in an svg of its own, framed by its real size. */
function _glbArt(kind, def, px) {
  let inner = '';
  try {
    if (kind === 'c') inner = gardenLifeArt(def).svg;
    else if (kind === 'k') inner = gardenKeepsakeSvg(def);
    else { const art = def.icon || (def.effect && def.effect.art); const creature = def.effect && def.effect.kind === 'visitor' && GL_CREATURE.get(def.effect.id); inner = art && GL_THINGS[art] ? GL_THINGS[art]() : creature ? gardenLifeArt(creature).svg : GL_THINGS['wish-star'](); }
  } catch (e) { inner = ''; }
  return `<svg class="gl-bookart" viewBox="-30 -40 60 44" width="${px}" height="${px}" aria-hidden="true"><g class="gl-art gl-still" data-clip="${kind === 'c' ? esc(gardenLifeArt(def).clips.rest || '') : ''}">${inner}</g></svg>`;
}
/** Frame every picture by what is actually in it, so the mouse and the stag both fill their card. */
function _glbFit(root) {
  requestAnimationFrame(() => {
    for (const svg of root.querySelectorAll('.gl-bookart')) {
      try {
        const b = svg.firstElementChild.getBBox(); if (!b.width && !b.height) continue;
        const side = Math.max(b.width, b.height, 18) * 1.1, cx = b.x + b.width / 2, cy = b.y + b.height / 2;
        svg.setAttribute('viewBox', [cx - side / 2, cy - side / 2, side, side].map(_glF).join(' '));
      } catch (e) { /* it keeps the default frame */ }
    }
  });
}
/* ---------- for other agents: unlock rules as data ---------- */
function gardenLifeFacts() {
  const g = _gdG(), found = { c: {}, e: {}, k: {} }; let rare = 0;
  for (const [k, day] of Object.entries(g.disc)) { if (!k.startsWith('lf.')) continue; const dot = k.indexOf('.', 3), kind = k.slice(3, dot), id = k.slice(dot + 1); if (!found[kind]) continue; found[kind][id] = day; if (kind === 'c') { const d = GL_CREATURE.get(id); if (d && ['rare', 'epic', 'legendary'].includes(d.rarity)) rare++; } }
  return { creatures: Object.keys(found.c).length, surprises: Object.keys(found.e).length, keepsakes: Object.keys(found.k).length, rare, found };
}
/** {life: id} found this creature; {lifeCount: n} found n creatures; {lifeKeep: id} kept this; {lifeEgg: id} met this surprise. */
function gardenLifeUnlocked(rule) {
  if (!rule) return false;
  if (rule.life) return gardenLifeHas('c', rule.life);
  if (rule.lifeKeep) return gardenLifeHas('k', rule.lifeKeep);
  if (rule.lifeEgg) return gardenLifeHas('e', rule.lifeEgg);
  if (rule.lifeCount) return gardenLifeFacts().creatures >= rule.lifeCount;
  return false;
}
