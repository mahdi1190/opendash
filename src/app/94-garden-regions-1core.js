/* ============================================================
   GARDEN, regions: the page's side of 94-garden-regions-0table.js. How far through each page you are, the prizes for it, and the bugs on open land.
     Half a page   coins and a decoration in your bag (it shows when you place it, and friends see it like any other).
     A whole page  coins, a ribbon, and a prize standing in the world (a feature with no price: `lf`, so friends see it, live and on a saved copy).
   Paid through the ledger (`lc`, with Undo) and keyed in `seen` (rg.<region>.<half|full>), so doing it twice adds nothing and it syncs like the land's milestones.
   ============================================================ */
function gardenRegionProgress(id) {
  const g = _gdG(), list = gardenRegionKinds(id);
  let found = 0;
  for (const { kind, def } of list) if ((kind === 'fish' ? g.fl : g.bl)[def.id]) found++;
  return { found, total: list.length };
}
/** For the ribbons: 1 once a region's page is finished. */
function gardenRegionFacts() {
  const out = {};
  for (const r of GARDEN_REGIONS) { const P = gardenRegionProgress(r.id); out['rg-' + r.id] = P.total && P.found >= P.total ? 1 : 0; }
  return out;
}
/** {step: 'half' | 'full', ready, taken, left (how many more to find)} */
function gardenRegionPrize(id, step) {
  const P = gardenRegionProgress(id), need = step === 'half' ? Math.ceil(P.total / 2) : P.total;
  return { step, need, left: Math.max(0, need - P.found), ready: P.found >= need, taken: !!_gdG().seen['rg.' + id + '.' + step] };
}
function gardenRegionClaim(id, step) {
  const R = gardenRegion(id); if (!R) return _gdNo('There is no such place');
  const P = gardenRegionPrize(id, step), S = step === 'half' ? R.half : R.full;
  if (P.taken) return _gdNo('You have that already');
  if (!P.ready) return _gdNo(`${P.left} more to find first`);
  const items = step === 'half' ? { ['decor:' + S.decor]: 1 } : { ['feat:' + S.feat]: 1 };
  const prize = step === 'half' ? (gardenDecor(S.decor) || {}).name : gardenLandFeature(S.feat).name;
  const out = _gldPay(`a prize from ${R.name.toLowerCase()}`, `${prize}, and ${S.c} coins`, { c: S.c, x: 20, i: items, n: 1 }, [['rg.' + id + '.' + step, _gdToday()]], R.icon);
  if (step === 'full') { const f = gardenLandFeature(S.feat); _gdEmit('land', { id: f.id, x: f.x, y: f.y, w: f.w, h: f.h }); gardenModel(); }   // it stands in the world from this moment, and friends in a live garden see it
  return out;
}
/* ---------- the bugs: what _gcBugsBase asks. The counts stay its own: this only says which kinds, and where. ---------- */
function gardenRegionBugs(m, habOk) {
  const home = (b) => gardenRegionHome(b), areas = m.areas;
  return {
    /** The garden's own kinds still come to what you grow; the rest live out on their land, whatever you have planted. */
    ok: (b) => { const H = home(b); return H.r === 'garden' ? b.hab.some(habOk) : gardenRegionHomeOpen(H, areas); },
    away: (b) => home(b).r !== 'garden',
    cell: (b, rnd, free) => gardenRegionBugCell(home(b), rnd, areas, free),
    /** Each region's share of the draw is the same (the garden has two), however many kinds it holds: opening the marsh does not empty the front bed. */
    even: (pool, weights) => {
      const sum = new Map();
      pool.forEach((b, i) => { const r = home(b).r; sum.set(r, (sum.get(r) || 0) + weights[i]); });
      pool.forEach((b, i) => { const r = home(b).r; weights[i] = weights[i] / (sum.get(r) || 1) * (r === 'garden' ? 2 : 1); });
    },
  };
}
