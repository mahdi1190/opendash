/* ============================================================
   REWARDS on Home: one calm card saying what your work earned today and what it leads to next. No pop-ups, no counts of what you failed to do. Hidden while the Fun level is Off.
   gardenRewardLine(m) is also the extra line on the "Your garden" card.
   ============================================================ */
function gardenRewardNext(m) {
  const out = [], lv = m.level.level;
  const t = GARDEN_LAND_TRAILS.map(x => gardenRewardTrailInfo(x, m)).filter(I => !I.open && I.fromOk).sort((a, b) => a.t.lv - b.t.lv)[0];
  if (t) {
    if (t.early) { const need = t.pegs - t.have; out.push({ ic: 'footprints', text: need > 0 ? `${need} more finished task${need === 1 ? '' : 's'} and you can open ${t.t.name}` : `You have the pegs to open ${t.t.name}`, pct: Math.min(1, t.have / t.pegs) }); }
    else if (lv < t.opensAt) out.push({ ic: 'footprints', text: `At garden level ${t.opensAt} you can open ${t.t.name} early` });
  }
  const land = GARDEN_LAND_SECTIONS.filter(s => { const i = gardenLandInfo(s.id, m); return i && !i.owned && i.lvOk && i.reach && i.keyOk; }).sort((a, b) => a.buy - b.buy)[0];
  if (land) {
    const short = land.buy - m.wallet.coins;
    out.push({ ic: 'trees', text: short > 0 ? `${short} more coin${short === 1 ? '' : 's'} for ${land.name}` : `You can buy ${land.name} for ${land.buy} coins`, pct: Math.min(1, m.wallet.coins / land.buy) });
  }
  const d = gardenDesignRows(m).filter(r => r.isOpen && !gardenHas('decor:' + r.id) && !Object.values(_gdG().decor).some(x => x && x.d === r.id))[0];
  if (d) out.push({ ic: 'hammer', text: d.can ? `You can make ${d.def.name.toLowerCase()} at the yard` : `Next at the yard: ${d.def.name.toLowerCase()} (${_grNeedLine(d.need)})` });
  return out;
}
function gardenRewardTodayLine() {
  const today = _gdToday(), inp = _gdEconInputs(_gdAct()).get(today); if (!inp) return '';
  const got = gardenRewardWorkDay(inp, gardenEconDay(Object.assign({ sessions: [], done: [] }, inp, { run: 1 })), today); if (!got) return '';
  const word = (k, n) => { if (k === 'ticket') return `${n} ticket${n === 1 ? '' : 's'}`; if (k === 'bait:maggot') return `${n} bait`; const r = GR_MATERIALS.find(x => 'mat:' + x.id === k); return r ? `${n} ${n === 1 ? r.one : r.name.toLowerCase()}` : ''; };
  const bits = Object.entries(got).map(([k, n]) => word(k, n)).filter(Boolean);
  return bits.length ? `Today your work earned ${bits.join(', ')}.` : '';
}
/** One line for the garden card, or ''. */
function gardenRewardLine(m) { const n = gardenRewardNext(m)[0]; return n ? n.text + '.' : ''; }
function _grHomeKey() { const m = gardenModel(); return [m.level.level, m.wallet.coins, ...GR_MATERIALS.map(r => gardenHas('mat:' + r.id)), gardenHas('ticket'), m.areas.length].join('|'); }
registerHomeWidget({
  id: 'gardengoal', title: 'Garden: what’s next', icon: 'footprints', group: 'fun', order: 267, fresh: true,
  sizes: ['s', 'm'], defaultSize: 's', defaultHidden: true,
  description: 'What your finished tasks and focus time earned today, and what they open next in the garden',
  emptyHint: 'Hidden while the Fun level is Off',
  aliases: ['garden goal', 'garden next', 'whats next in the garden', 'rewards', 'materials'],
  refreshKey: () => { try { return state.garden && state.garden.since ? _grHomeKey() : ''; } catch (e) { return ''; } },
  render(el, ctx) {
    ctx = ctx || {};
    if (memFunLevel() === 'off' && !ctx.preview) return false;
    const live = !!(state.garden && state.garden.since) && gardenEnsure();
    const card = document.createElement('section');
    card.className = 'card home-card grw-home';
    card.innerHTML = `<div class="card-h">${icon('footprints')}<h3>Garden: what’s next</h3></div><div class="card-b"></div>`;
    const b = card.querySelector('.card-b');
    if (!live) { b.appendChild(_gdpEl('p', 'muted', 'Finished tasks bring survey pegs. Pegs open new paths in your garden.')); el.appendChild(card); return true; }
    const m = gardenModel(), lines = gardenRewardNext(m).slice(0, ctx.size === 'm' ? 3 : 2);
    if (!lines.length) b.appendChild(_gdpEl('p', 'muted', 'All is calm in the garden.'));
    for (const n of lines) {
      const r = _gdpEl('button', 'grw-line'); r.type = 'button'; r.onclick = () => setView('garden');
      r.innerHTML = `${icon(n.ic, 'i-sm')}<span>${esc(n.text)}${n.pct != null ? `<i class="grw-bar"><i style="width:${Math.round(n.pct * 100)}%"></i></i>` : ''}</span>`;
      b.appendChild(r);
    }
    const today = gardenRewardTodayLine();
    if (today) b.appendChild(_gdpEl('p', 'grw-today muted', today));
    el.appendChild(card);
    return true;
  },
});
