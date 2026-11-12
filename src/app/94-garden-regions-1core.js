/* ============================================================
   GARDEN, regions: the page's side of 94-garden-regions-0table.js. How far through each journal page you are, and the bugs on open land.
   A page's reward is the Field Journal's (94-garden-journal-1core.js): legends never count towards it.
   ============================================================ */
function gardenRegionProgress(id) {
  const g = _gdG(), list = gardenRegionKinds(id).filter(x => !x.def.legend);
  let found = 0;
  for (const { kind, def } of list) if ((kind === 'fish' ? g.fl : g.bl)[def.id]) found++;
  return { found, total: list.length };
}
/** For the stamps and anything that counts pages: 1 once a region's creatures are all caught. */
function gardenRegionFacts() {
  const out = {};
  for (const r of GARDEN_REGIONS) { const P = gardenRegionProgress(r.id); out['rg-' + r.id] = P.total && P.found >= P.total ? 1 : 0; }
  return out;
}
/* ---------- the bugs: what _gcBugsBase asks. The counts stay its own: this only says which kinds, and where. ---------- */
function gardenRegionBugs(m, habOk) {
  const home = (b) => gardenRegionHome(b) || { r: 'village', g: 1 }, areas = m.areas;
  return {
    /** The village's kinds come to your own garden and whatever you grow; the rest live out on their page's land, once it is open. */
    ok: (b) => { const H = home(b); return H.g ? b.hab.some(habOk) : gardenRegionHomeOpen(H, areas); },
    away: (b) => !home(b).g,
    cell: (b, rnd, free) => gardenRegionBugCell(home(b), rnd, areas, free),
    /** Each region's share of the draw is the same (your own garden has two), however many kinds it holds. */
    even: (pool, weights) => {
      const key = (b) => home(b).g ? 'g' : home(b).r, sum = new Map();
      pool.forEach((b, i) => { const r = key(b); sum.set(r, (sum.get(r) || 0) + weights[i]); });
      pool.forEach((b, i) => { const r = key(b); weights[i] = weights[i] / (sum.get(r) || 1) * (r === 'g' ? 2 : 1); });
    },
  };
}
