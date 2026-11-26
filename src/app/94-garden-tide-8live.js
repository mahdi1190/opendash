/* ============================================================
   THE TIDE WITH FRIENDS (live). The tide, the glints, the pools and the storm's set need no messages: every screen works them
   out from the clock, the moon, the layout and the strand's number in the snapshot (ti). What travels is what people DO, as
   gl:fx c 'tide' (94-garden-live-0rules.js validates it; an older app refuses the family and simply sees nothing):
     got    i find, n glint, x y   someone picked a glint: if you are near, your own copy of it hops (nobody is robbed: yours is
                                   still there for you; their catch moment over their head comes with gl:fx got shore)
     lift   n stone, i what        someone lifted a stone: yours tips and settles back on your screen
     haul / heave / open           the storm's chest (94-garden-tide-5storm.js)
   Other tide modules add their own steps to GT_FX (castles, races: castle, cset, race, rstate, rend, rpick, cheer).
   ============================================================ */
const GT_FX = {
  got(A, ev) {
    if (typeof _gw === 'undefined' || !Number.isFinite(ev.x) || Math.hypot(ev.x - _gw.px, ev.y - _gw.py) > 6) return;
    const n = Number(ev.n); if (Number.isInteger(n) && typeof _gtc !== 'undefined') _gtc.hop.set(n, typeof GardenPaintTide !== 'undefined' && GardenPaintTide.scene() ? GardenPaintTide.scene().time.now : 0);
  },
  lift(A, ev) { const n = Number(ev.n); if (Number.isInteger(n) && typeof gardenTideStoneSeen === 'function') gardenTideStoneSeen(n); },
  haul(A, ev) { if (typeof gardenTideStormFx === 'function') gardenTideStormFx(A, ev); },
  heave(A, ev) { if (typeof gardenTideStormFx === 'function') gardenTideStormFx(A, ev); },
  open(A, ev) { if (typeof gardenTideStormFx === 'function') gardenTideStormFx(A, ev); },
};
/** One tide message from someone in the garden (94-garden-live-4fx.js sends every c 'tide' here). */
function gardenTideFx(A, ev) {
  const f = GT_FX[String(ev && ev.e || '')];
  if (f) try { f(A, ev); } catch (e) { console.error('[garden tide]', e); }
}
