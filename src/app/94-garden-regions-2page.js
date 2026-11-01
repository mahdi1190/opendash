/* ============================================================
   GARDEN, regions: what you see. The small waters in the ground, the prizes standing in the world (one drawing each), and The map tab of the Catch page.
   The drawings go into _GLD_PROP_ART (94-garden-lands-2art.js, loaded before this), so a prize is drawn like any feature, for you and your friends.
   ============================================================ */
function gardenRegionWaterArt(px, py, season) {
  const A = GART, W = GARDEN_WORLD, ice = season === 'winter';
  let s = '';
  for (const w of GARDEN_REGION_WATERS) {
    if (w.room) continue;   // (indoors: not on the map)
    if (w.area || w.sec) continue;   // (the pond and the bought pools are drawn already)
    const cx = px(w.x + w.w / 2), cy = py(w.y + w.h / 2), rx = w.w * W.cellW / 2, ry = w.h * W.cellH / 2;
    s += `<path fill="#6e8a5a" d="${A.ell(cx, cy, rx + 5, ry + 4)}"/><path fill="${ice ? '#c0d8e6' : '#5fb0cc'}" d="${A.ell(cx, cy, rx + 1, ry)}"/><path fill="#ffffff" fill-opacity="0.28" d="${A.ell(cx - rx * 0.25, cy - ry * 0.3, rx * 0.4, ry * 0.22)}"/>`;
  }
  return s;
}
Object.assign(_GLD_PROP_ART, {
  'rg-garden'() { const A = GART, Wd = GART_PAL.wood; return A.P(Wd[1], A.rrect(-1.6, -44, 3.2, 44, 1)) + A.P('#6fae4a', 'M1.6 -43L24 -37L1.6 -29z') + A.P('#f4d04a', A.circ(10, -36.5, 3)) + A.P(Wd[2], A.ell(0, -1, 7, 2.2)); },
  'rg-lake'() { const A = GART, Wd = GART_PAL.wood; return A.P(Wd[1], A.rrect(-11, -8, 3, 8, 1)) + A.P(Wd[1], A.rrect(8, -8, 3, 8, 1)) + A.P(Wd[2], A.rrect(-15, -34, 30, 27, 2)) + A.P('#3f7fa8', 'M-10 -21Q-2 -29 6 -21Q-2 -13 -10 -21zM6 -21L12 -26V-16z') + A.S(Wd[0], 0.9, 'M-15 -28H15M-15 -13H15', 0.5); },
  'rg-hill'() { const A = GART, St = GART_PAL.stone, Wd = GART_PAL.wood; return A.P(St[1], A.ell(0, -5, 14, 6)) + A.P(St[2], A.ell(-1, -12, 9, 5)) + A.P(St[3], A.ell(0, -17, 5, 3.4)) + A.P(Wd[1], A.rrect(-1.2, -44, 2.4, 28, 1)) + A.P('#d8b23a', 'M1.2 -43L20 -38L1.2 -32z'); },
  'rg-orchards'() { const A = GART, Wd = GART_PAL.wood; return A.P(Wd[1], A.rrect(-14, -28, 3, 28, 1)) + A.P(Wd[1], A.rrect(11, -28, 3, 28, 1)) + A.P(Wd[2], A.rrect(-16, -31, 32, 5, 1.5)) + A.P(Wd[0], A.rrect(-1.5, -27, 3, 12, 1)) + A.P(Wd[3], A.rrect(-10, -15, 20, 15, 2)) + A.S(Wd[0], 1.2, 'M-10 -11H10M-10 -4H10', 0.7) + A.P('#d8483a', A.circ(-5, -17, 2.6)) + A.P('#8ab83a', A.circ(1, -17.5, 2.6)) + A.P('#d8483a', A.circ(6, -17, 2.4)); },
  'rg-fields'() { const A = GART; return A.P('#c89a3a', 'M-14 0L-2 -30L2 -30L14 0z') + A.P('#e8c25a', 'M-8 0L-1 -28L1 -8L-3 0zM6 0L1 -22L3 -24L11 0z') + A.P('#a87a2a', A.rrect(-7, -17, 14, 3, 1)) + A.S('#a87a2a', 0.8, 'M-2 -30L-7 -36M0 -30L0 -38M2 -30L7 -36'); },
  'rg-marsh'() { const A = GART, Wd = GART_PAL.wood; return A.P(Wd[1], A.rrect(-2, -30, 4, 30, 1.2)) + A.P('#b8bec4', A.ell(3, -36, 8, 4)) + A.P('#b8bec4', 'M-3 -37Q-8 -44 -5 -50L-2 -49Q-4 -43 1 -39z') + A.P('#e8a83a', 'M-5 -51L-14 -48L-4 -48z') + A.S('#3a3a3a', 0.8, 'M9 -35L15 -32', 0.8) + A.S('#6e8a5a', 1.2, 'M-8 0Q-9 -9 -7 -14M8 0Q10 -8 8 -12'); },
});

/* ---------- The map tab ---------- */
const GRG_LABELS = Object.freeze({ garden: 'core', hill: 'north', orchards: 'east', fields: 'west', marsh: 'south' });
function _grgCellRegion(x, y) {
  const c = gardenLandCell(x, y);
  if (c && c.lane) return 'garden';
  if (!c) return 'lake';
  for (const [name, M] of Object.entries(GARDEN_LAND_MAPS)) if (y >= M.y && y < M.y + M.rows.length && x >= M.x && x < M.x + M.rows[0].length) return M.plot === 'core' ? 'garden' : M.plot === 'grove' ? 'orchards' : M.plot === 'field' ? 'fields' : M.plot === 'marsh' ? 'marsh' : M.plot === 'hill' ? 'hill' : name;
  return 'garden';
}
function _grgMapSvg(m) {
  const W = GARDEN_WORLD, open = {}, shut = {};
  for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
    const c = gardenLandCell(x, y), r = _grgCellRegion(x, y), on = !c || c.lane || c.solid || m.areas.includes(c.id), T = on ? open : shut;
    T[r] = (T[r] || '') + `M${x} ${y}h1v1h-1z`;
  }
  let s = `<svg class="grg-map" viewBox="0 0 ${W.cols} ${W.rows}" role="img" aria-label="A map of the world and how much of each part you have found">`;
  for (const R of GARDEN_REGIONS) s += `<g class="grg-map-r" data-r="${R.id}"><path d="${open[R.id] || ''}" fill="${R.color}"/><path d="${shut[R.id] || ''}" fill="${R.color}" fill-opacity="0.3"/></g>`;
  for (const w of GARDEN_REGION_WATERS) { if (w.room) continue; const on = gardenRegionHomeOpen({ w: w.id }, m.areas); s += `<ellipse cx="${w.x + w.w / 2}" cy="${w.y + w.h / 2}" rx="${w.w / 2 + 0.15}" ry="${w.h / 2 + 0.15}" fill="${on ? '#3f8fc0' : 'none'}" stroke="#2f6a98" stroke-width="0.18"${on ? '' : ' stroke-dasharray="0.4 0.3"'}/>`; }
  for (const R of GARDEN_REGIONS) {
    const M = GARDEN_LAND_MAPS[GRG_LABELS[R.id]], a = R.id === 'lake' ? gardenArea('lake') : null, P = gardenRegionProgress(R.id);
    const cx = a ? a.x + a.w / 2 : M.x + M.rows[0].length / 2, cy = a ? a.y + a.h / 2 : M.y + M.rows.length / 2;
    s += `<text class="grg-map-t" x="${cx}" y="${cy}" text-anchor="middle" data-r="${R.id}">${esc(R.name.replace(/^The (north |east |west |south |main )?/, ''))}</text><text class="grg-map-n" x="${cx}" y="${cy + 2.2}" text-anchor="middle" data-r="${R.id}">${P.found} of ${P.total}</text>`;
  }
  return s + '</svg>';
}
function _grgBar(P) { return `<span class="gdc-bar"><i style="width:${Math.round(P.found / Math.max(1, P.total) * 100)}%"></i></span>`; }
function _grgGo(id) { _gdc.region = id; _gdc.pick = null; _gdc.n = 36; _gdbGo(); }
function _grgPrizeRow(R, step) {
  const P = gardenRegionPrize(R.id, step), S = step === 'half' ? R.half : R.full, row = _gdpEl('div', 'grg-prize' + (P.taken ? ' is-done' : ''));
  const what = step === 'half' ? `${(gardenDecor(S.decor) || {}).name || 'A decoration'} for your bag, and ${S.c} coins` : `${gardenLandFeature(S.feat).name} standing in the world, a ribbon and ${S.c} coins`;
  const text = _gdpEl('div', 'grg-prize-t');
  text.appendChild(_gdpEl('b', null, step === 'half' ? 'Half the page' : 'The whole page'));
  text.appendChild(_gdpEl('span', 'muted', what));
  row.appendChild(text);
  if (P.taken) row.appendChild(_gdpEl('span', 'muted', 'Collected'));
  else if (P.ready) row.appendChild(_gdpBtn('Collect', { icon: 'gift', kind: 'btn-primary', run: () => { _gdcSay(gardenRegionClaim(R.id, step)); _gdbGo(); } }));
  else row.appendChild(_gdpEl('span', 'muted', `${P.left} more to find`));
  return row;
}
function _grgWays(R, m) {
  const out = _gdpEl('ul', 'gdb-how grg-ways'), add = (text, ok) => { const li = _gdpEl('li', ok ? 'is-ok' : 'is-no'); li.innerHTML = `<span class="gdb-how-i">${icon(ok ? 'check' : 'x', 'i-sm')}</span>`; li.appendChild(_gdpEl('span', null, text)); out.appendChild(li); };
  for (const t of R.parts) { const row = gardenLandRow(t); add(`${row.name}: garden level ${row.lv}`, m.areas.includes(t)); }
  for (const w of GARDEN_REGION_WATERS) if (w.r === R.id) { const on = gardenRegionHomeOpen({ w: w.id }, m.areas); add(on ? `${w.name[0].toUpperCase()}${w.name.slice(1)}: open` : `${w.name[0].toUpperCase()}${w.name.slice(1)}: ${gardenRegionWaterNo(w.x, w.y, m.areas).split(': ').pop() || 'not open yet'}`, on); }
  return out;
}
function _grgPage(el, m, R) {
  const P = gardenRegionProgress(R.id), head = _gdpEl('section', 'card gdb-head');
  head.appendChild(_gdpBtn('Back to the map', { icon: 'arrow-left', kind: 'btn-ghost', run: () => _grgGo('') }));
  head.appendChild(_gdpEl('h3', 'gd-h3', R.name));
  head.appendChild(_gdpEl('p', 'muted', R.blurb));
  const top = _gdpEl('div', 'gdb-progress'); top.innerHTML = `<b>${P.found} of ${P.total}</b>${_grgBar(P)}<span class="muted">found</span>`; head.appendChild(top);
  head.appendChild(_grgPrizeRow(R, 'half')); head.appendChild(_grgPrizeRow(R, 'full'));
  if (R.parts.length || GARDEN_REGION_WATERS.some(w => w.r === R.id)) { head.appendChild(_gdpEl('h4', 'gdb-how-h', 'Getting there')); head.appendChild(_grgWays(R, m)); }
  el.appendChild(head);
  const log = gardenCatchLog(), rec = (k, id) => (k === 'fish' ? log.fish : log.bugs).find(x => x.def.id === id), kinds = gardenRegionKinds(R.id), grid = _gdpEl('div', 'gdb-grid');
  for (const { kind, def } of kinds.slice(0, _gdc.n)) grid.appendChild(_gdbCard(rec(kind, def.id), kind, m, ''));
  el.appendChild(grid);
  if (kinds.length > _gdc.n) { const b = _gdpEl('div', 'gd-shop-more'); b.appendChild(_gdpBtn(`Show more (${kinds.length - _gdc.n} left)`, { run: () => { _gdc.n += 36; _gdbGo(); } })); el.appendChild(b); }
}
function gardenRegionTab(el, m) {
  if (_gdc.pick) { const log = gardenCatchLog(), r = (_gdc.pickKind === 'fish' ? log.fish : log.bugs).find(x => x.def.id === _gdc.pick); if (r) { _gdbEntry(el, m, _gdc.pickKind, r); return; } }
  const open = _gdc.region && gardenRegion(_gdc.region);
  if (open) { _grgPage(el, m, open); return; }
  const card = _gdpEl('section', 'card grg-over');
  card.appendChild(_gdpEl('h3', 'gd-h3', 'The map'));
  card.appendChild(_gdpEl('p', 'muted', 'Every fish and bug lives somewhere. Open up the land to find what lives there, and finish a page for a prize that stands in your garden.'));
  const map = _gdpEl('div', 'grg-map-w'); map.innerHTML = _grgMapSvg(m);
  map.onclick = (e) => { const t = e.target.closest && e.target.closest('[data-r]'); if (t) _grgGo(t.getAttribute('data-r')); };
  card.appendChild(map);
  el.appendChild(card);
  const list = _gdpEl('div', 'grg-list');
  for (const R of GARDEN_REGIONS) {
    const P = gardenRegionProgress(R.id), b = _gdpEl('button', 'grg-card card'), ready = ['half', 'full'].some(k => { const q = gardenRegionPrize(R.id, k); return q.ready && !q.taken; }); b.type = 'button';
    b.innerHTML = `<span class="grg-card-i" style="color:${R.color}">${icon(R.icon)}</span><span class="grg-card-t"><b>${esc(R.name)}</b><small class="muted">${P.found} of ${P.total} found${ready ? ' · a prize to collect' : ''}</small>${_grgBar(P)}</span>`;
    b.onclick = () => _grgGo(R.id);
    list.appendChild(b);
  }
  el.appendChild(list);
}
