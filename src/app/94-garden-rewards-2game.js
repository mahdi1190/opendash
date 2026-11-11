/* ============================================================
   REWARDS in play (docs/dev/REWARDS.md): small things for what paid nothing, the builder's yard, materials in the bag, opening a path early at the land office.
   Every gift is a ledger line of kind 'pl' under a key made from the day and the thing, so two devices give it once. XP stays inside GP_ECON; materials (timber and stone) inside GR_ECON.matDay. Never coins, and no tickets: they are gone (JOURNAL.md section 9).
     gardenRewardDid(id)     a one-line hook where something happens: GR_DID, once a day
     gardenRewardTick(m)     from gardenTick: GR_DAILY (what today's ledger shows you did) and GR_ONCE (milestones)
   ============================================================ */
const GR_DID = Object.freeze({
  sit: { x: 1, say: 'A quiet minute' },
  mice: { 'mat:stone': 1, x: 1, say: 'The mice left a smooth stone on the step' },
  bird: { x: 1, say: 'The bird sang you the rest of its song' },
  tracks: { 'mat:timber': 1, say: 'The tracks went past a fallen branch: good timber' },
  lantern: { x: 1, say: 'The lantern is lit' },
  fire: { 'mat:timber': 1, x: 1, say: 'You kept a good log from the fire' },
  diary: { x: 1, say: 'A pressed flower fell out of the diary' },
  visit: { 'mat:stone': 1, x: 1, say: 'Your friend left a good stone by their gate for you' },
});
/* One step for each `per` of that kind in today's ledger, at most `max` steps a day. w: only lines marked so. */
const GR_DAILY = Object.freeze([
  { id: 'prune', k: 'r', per: 3, max: 2, i: { 'mat:timber': 1 } },
  { id: 'forage', k: 'lc', per: 2, max: 2, i: { 'mat:stone': 1 } },
  { id: 'dig', k: 'pl', w: 'dig', per: 1, max: 2, i: { 'mat:stone': 1 } },
]);
/* Once ever at each step: an old save gets these the first time it opens, and no more. */
const GR_ONCE = Object.freeze([
  { id: 'sec', of: 'sections', at: [[1, { 'mat:timber': 2 }], [5, { 'mat:timber': 4 }], [15, { 'mat:stone': 6 }], [40, { 'mat:timber': 10, 'mat:stone': 10 }]] },
  { id: 'built', of: 'built', at: [[1, { 'mat:stone': 3 }], [5, { 'mat:timber': 6 }], [12, { 'mat:stone': 10 }]] },
  { id: 'curio', of: 'curios', at: [[3, { 'mat:stone': 3 }], [10, { 'mat:stone': 6 }]] },
  { id: 'fish', of: 'fish', at: [[5, { 'mat:timber': 3 }], [25, { 'mat:timber': 6 }]] },
  { id: 'bug', of: 'bugs', at: [[5, { 'mat:stone': 2 }], [25, { 'mat:stone': 5 }]] },
  { id: 'placed', of: 'placed', at: [[10, { 'mat:timber': 2 }], [50, { 'mat:stone': 5 }]] },
  { id: 'star', of: 'stars', at: [[1, { 'mat:stone': 2 }], [4, { 'mat:stone': 4 }], [12, { 'decor:rw-orn-urn': 1 }]] },
  { id: 'isle', of: 'isle', at: [[1, { 'mat:timber': 3 }]] },
]);

/** One gift, cut to what is left of today's limits. Returns whether anything was given. */
function _grGive(key, gift) {
  const g = _gdG(), today = _gdToday(), k = 'rwd.' + today + '.' + key;
  if (g.led[k]) return false;
  const day = gpToday(), i = {}; let matLeft = GR_ECON.matDay;
  for (const [lk, e] of Object.entries(g.led)) if (lk.startsWith('rwd.' + today + '.') && e && e.i) for (const [it, n] of Object.entries(e.i)) if (it.startsWith('mat:')) matLeft -= Number(n) || 0;
  for (const [it, n] of Object.entries(gift)) {
    if (it === 'x' || it === 'say') continue;
    if (GARDEN_GONE_ITEMS.includes(it)) continue;   // (an old gift: tickets, pegs and reeds are gone)
    const v = it.startsWith('mat:') ? Math.min(n, matLeft) : n;
    if (v > 0) { i[it] = v; if (it.startsWith('mat:')) matLeft -= v; }
  }
  const x = Math.max(0, Math.min(gift.x || 0, GP_ECON.xpDay - day.xp));
  if (!Object.keys(i).length && !x) return false;
  g.led[k] = { d: today, k: 'pl', i, x, n: 1 };
  _gdSave();
  return true;
}
function gardenRewardDid(id) {
  try {
    const r = GR_DID[id]; if (!r) return;
    if (id !== 'visit' && gpVisiting()) return;
    if (_grGive('did.' + id, r) && r.say) {
      if (id === 'visit') {
        const m = gardenHere();
        // The automatic gate ticket is still earned once by the same ledger.
        // Its receipt is a quiet arrival note, not another activity prompt.
        if (m.visit && gpVisiting()) gardenMessage(r.say, { ambient: true, source: 'visit-ticket:' + m.visit.fid, icon: 'ticket' });
      } else gpNote(r.say);
    }
  } catch (e) { console.error('[garden rewards]', e); }
}
function gardenRewardTick(m) {
  if (gpVisiting()) { gardenRewardDid('visit'); return; }
  const g = _gdG(), today = _gdToday(), seen = {};
  for (const e of Object.values(g.led)) if (e && e.d === today && e.k) { const n = Number(e.n) || 1; seen[e.k] = (seen[e.k] || 0) + n; if (e.w) seen[e.k + '/' + e.w] = (seen[e.k + '/' + e.w] || 0) + n; }
  for (const r of GR_DAILY) {
    const steps = Math.min(r.max, Math.floor((seen[r.w ? r.k + '/' + r.w : r.k] || 0) / r.per));
    for (let s = 1; s <= steps; s++) _grGive(`${r.id}.${s}`, r.i);
  }
  const c = gardenRewardCtx(m);
  for (const r of GR_ONCE) for (const [n, items] of r.at) if ((c[r.of] || 0) >= n) gpGrant(`rw-${r.id}-${n}`, items);
  if (GR_MATERIALS.some(x => gardenHas('mat:' + x.id) > 0)) gpGrant('rw-yard', { 'decor:rw-yard': 1 });   // your stack, to stand in the garden: friends see that you are building
}

/* ---------- in the bag ---------- */
function gardenRewardBagCard(el) {
  const have = GR_MATERIALS.filter(r => gardenHas('mat:' + r.id) > 0);
  const card = _gdpEl('section', 'card grw-bag');
  card.appendChild(_gdpEl('b', null, 'Materials'));
  if (!have.length) card.appendChild(_gdpEl('p', 'muted', 'Finish tasks and use the focus timer: timber and stone turn up here.'));
  const row = _gdpEl('div', 'grw-mats');
  for (const r of GR_MATERIALS) {
    const it = _gdpEl('div', 'grw-mat' + (gardenHas('mat:' + r.id) > 0 ? '' : ' is-none'));
    it.innerHTML = `${gardenRewardMatSvg(r.id, 28)}<span><b>${gardenHas('mat:' + r.id)}</b> ${esc(r.name)}<small>From: ${esc(r.from.toLowerCase())}. For: ${esc(r.goes.toLowerCase())}.</small></span>`;
    row.appendChild(it);
  }
  card.appendChild(row);
  el.appendChild(card);
}

/* ---------- the builder's yard, in Play ---------- */
const _GR_KINDS = Object.freeze([['path', 'Paths'], ['fence', 'Fences'], ['ground', 'Ground'], ['ornament', 'Ornaments']]);
function _grNeedWord(k) { if (k === 'ticket') return 'tickets'; const r = GR_MATERIALS.find(x => 'mat:' + x.id === k); return r ? r.name.toLowerCase() : k; }
function _grNeedLine(need) { return Object.entries(need).map(([k, n]) => `${n} ${_grNeedWord(k)}`).join(', '); }
function _grYard() {
  gpStage('The builder’s yard', (el) => {
    const paint = () => {
      el.textContent = '';
      el.appendChild(gpEl('p', 'gp-lead', 'Make paths, fences, ground and ornaments from what your work and play bring in. They go in your bag, to put where you like, and friends can see them.'));
      gardenRewardBagCard(el);
      const rows = gardenDesignRows(gardenModel());
      for (const [kind, label] of _GR_KINDS) {
        el.appendChild(gpEl('h3', 'gp-h', label));
        const grid = gpEl('div', 'gp-prizes');
        for (const r of rows.filter(x => x.kind === kind)) {
          const c = gpEl('div', 'gp-prize' + (r.isOpen ? '' : ' is-locked'));
          c.innerHTML = `<div class="gp-prize-art">${gardenIconSvg(r.id, { kind: 'decor', px: 72 })}</div><b>${esc(r.def.name)}</b><span class="muted">${esc(r.isOpen ? _grNeedLine(r.need) : r.how)}</span>`;
          if (r.isOpen) c.appendChild(uiButton({ label: 'Make it', icon: 'hammer', size: 'sm', disabled: !r.can, run: () => {
            const items = { ['decor:' + r.id]: 1 }; for (const [k, n] of Object.entries(r.need)) items[k] = -n;
            gpSpend('making ' + r.def.name.toLowerCase(), items, `${r.def.name}: it is in your bag`); paint();
          } }));
          grid.appendChild(c);
        }
        el.appendChild(grid);
      }
    };
    paint();
  });
}
gardenPlayAdd({ id: 'yard', name: 'The builder’s yard', icon: 'hammer', group: 'make', blurb: 'Pegs, timber, stone and reeds become paths, fences, ground and ornaments.', status: () => { const n = GR_MATERIALS.reduce((a, r) => a + gardenHas('mat:' + r.id), 0); return n ? `${n} materials` : ''; }, open: _grYard });
/* The diary is read, not played: a small thank-you when you open it. */
{ const R = _gpRows.find(r => r.id === 'diary'); if (R) { const was = R.open; R.open = () => { gardenRewardDid('diary'); return was(); }; } }

/* ---------- at the land office ---------- */
/** The second button on a buy row: pay part of it in materials. */
function gardenRewardBtn2(cost, m, act) {
  const q = gardenRewardOffer(cost); if (!q) return {};
  return { btn2: `${_gdpNum(q.c)} coins and ${q.n} material${q.n === 1 ? '' : 's'}`, off2: m.wallet.coins < q.c, run2: (b) => { const r = gardenRewardWithMaterials(act); if (!r.ok) gameDenyOf(r, b); else gameCheer(b, { text: '-' + q.c, tone: 'coin', sound: true }); } };
}
/** Paths you could open early, at the top of the land office. */
function gardenRewardLandRows(sec, m) {
  const rows = GARDEN_LAND_TRAILS.map(t => gardenRewardTrailInfo(t, m)).filter(I => I.early);
  if (!rows.length) return;
  const d = sec('Open a path early');
  for (const I of rows) _gldRow(d, { icon: 'footprints', name: I.t.name, sub: `Its gate opens at level ${I.t.lv}. With timber you can open it now, and buy the land along it ${GR_ECON.trailEarly} levels sooner. You have ${I.have}.`, btn: `${I.pegs} timber`, off: I.have < I.pegs, run: (b) => { const r = gardenRewardOpenTrail(I.t.id); if (!r.ok) gameDenyOf(r, b); } });
}
