/* ============================================================
   THE CATCH MOMENT (2.27.9). The owner, 31 Oct 2026: when anyone catches a fish or a bug, or finds something, the gardener turns to face you and holds it
   over their head with both hands for two or three seconds, with a small sparkle, then a small banner: "A rainbow trout!" (size, and "New!" if it is one). For the
   others it is the same over that person's head with their name: "Sam caught a rainbow trout!". Our own drawing (the gardener's 'hold' pose, 94-garden-art-g-player.js).

   A KIND IS ONE ROW of GART_MOMENTS: its verb, how to find its definition, its name, its picture (the catalogue's own art). Add a find: add a row, send the kind in gl:fx got (GL_FX_STEPS.got).
     gardenCatchMoment(kind, id, o)     something was caught or found by YOU: it is held up on your screen (true) and told to everyone in the garden. o: {cm, q, isNew, record, own: false to only tell}
     gardenMomentSvg(spec, o)           the held item, sparkle and banner as an SVG fragment with the feet at 0,0 (also what other people's figures use, 94-garden-live-4fx.js)
     gardenMomentSpec(kind, id, o)      {kind, id, name, art(px), verb, sub, isNew} or null when this version does not know the id
   Fun Off: no moment (the catch card as before). Reduced motion: the same, still. Any key or click ends it for you.
   ============================================================ */
const GART_MOMENTS = Object.freeze({
  fish: { verb: (d) => (d.cat === 'fish' ? 'caught' : 'fished up'), def: (id) => gardenFishDef(id), name: (d) => d.name, art: (id, px) => gardenCatchSvg('fish', id, px, { uid: 'mo' + id }) },
  bug: { verb: () => 'caught', def: (id) => gardenBugDef(id), name: (d) => d.name, art: (id, px) => gardenCatchSvg('bug', id, px, { uid: 'mo' + id, glow: false }) },
  keep: { verb: () => 'found', def: (id) => GL_KEEPSAKE.get(id), name: (d) => d.name, art: (id, px, d) => `<svg viewBox="-12 -16 24 20" width="${px}" height="${Math.round(px * 20 / 24)}">${gardenKeepsakeSvg(d)}</svg>` },
  craft: { verb: () => 'made', def: (id) => gardenRecipe(id), name: (d) => d.name, art: (id, px, d) => gardenCraftArt(d, px) },
  crop: { verb: () => 'picked', def: (id) => gardenPlant(id), name: (d) => (d.yield && d.yield.item ? d.yield.item : d.name), art: (id, px) => _gdxItemIcon('crop:' + id, px) },
});
const GART_MOMENT_MS = 2700;
function gardenMomentSpec(kind, id, o) {
  const row = GART_MOMENTS[kind]; if (!row) return null;
  let d = null; try { d = row.def(id); } catch (e) { d = null; }
  if (!d) return null;
  o = o || {};
  const name = String(row.name(d) || '').toLowerCase().replace(/^the /, '');
  const sub = [kind === 'fish' && o.cm ? o.cm + ' cm' : '', o.q ? (typeof gardenQuality === 'function' ? gardenQuality(o.q).label : '') : ''].filter(Boolean).join(' · ');
  return { kind, id, d, name, verb: row.verb(d), sub, isNew: !!o.isNew, record: !!o.record, art: (px) => { try { return row.art(id, px, d) || ''; } catch (e) { return ''; } } };
}
/** The held item, its sparkle and the banner, as a fragment: feet at 0,0, the item between the hands. o.who: a name (others see "Sam caught a bream!"), else "A bream!". */
function gardenMomentSvg(spec, o) {
  o = o || {};
  const title = o.who ? `${o.who} ${spec.verb} ${_gscA(spec.name)}!` : `${_gscA(spec.name)}!`.replace(/^./, (c) => c.toUpperCase());
  const px = 46, y = GPL_HOLD.y, tw = Math.max(40, title.length * 5.4 + 16), sub = o.who ? '' : spec.sub;
  const by = y - 40, flag = spec.isNew ? 'New!' : spec.record ? 'Record!' : '';
  const star = (x, yy, s, dl) => `<path class="gmo-spark" style="animation-delay:${dl}s" transform="translate(${x} ${yy}) scale(${s})" d="M0-5L1.3-1.3L5 0L1.3 1.3L0 5L-1.3 1.3L-5 0L-1.3-1.3z" fill="#ffe27a" stroke="#e8a83a" stroke-width=".5"/>`;
  return `<g class="gmo"><g class="gmo-pop"><ellipse cx="0" cy="${y}" rx="26" ry="22" fill="#fff6c8" fill-opacity=".38"/><g transform="translate(${-px / 2} ${y - px / 2 + 2})">${spec.art(px)}</g></g>`
    + star(-26, y - 16, 1, 0) + star(27, y - 10, .8, .3) + star(8, y - 30, .7, .6)
    + `<g class="gmo-pop" style="animation-delay:.12s"><rect class="gmo-b" x="${-tw / 2}" y="${by - 12}" width="${tw}" height="${sub ? 24 : 17}" rx="8"/><text class="gmo-t" text-anchor="middle" y="${by}">${esc(title)}</text>${sub ? `<text class="gmo-s" text-anchor="middle" y="${by + 10}">${esc(sub)}</text>` : ''}`
    + (flag ? `<rect class="gmo-nb" x="${tw / 2 - 16}" y="${by - 20}" width="${flag.length * 4.8 + 8}" height="11" rx="5.5"/><text class="gmo-new" x="${tw / 2 - 12}" y="${by - 12}">${flag}</text>` : '') + '</g></g>';
}
let _gmo = { g: null, t: 0, off: null };
function gardenMomentEnd() {
  clearTimeout(_gmo.t); if (_gmo.g) { _gmo.g.remove(); _gmo.g = null; }
  if (_gmo.off) { _gmo.off(); _gmo.off = null; }
  if (typeof gartPlayerAct === 'function') gartPlayerAct('idle', 1);
}
function gardenCatchMoment(kind, id, o) {
  o = o || {};
  try { if (typeof gardenLiveFx === 'function') gardenLiveFx('got', kind, { i: id, n: o.cm || 0, ql: o.q || 0, nw: (o.isNew ? 1 : 0) | (o.record ? 2 : 0) }); } catch (e) { /* only a message */ }
  try { if (typeof gardenContestMine === 'function') gardenContestMine(kind, id, o); } catch (e) { /* a contest is only a game */ }
  if (o.own === false || gardenFun() === 'off' || typeof _gw === 'undefined' || !_gw.on) return false;
  const spec = gardenMomentSpec(kind, id, o), a = typeof _gwActors === 'function' ? _gwActors() : null;
  if (!spec || !a) return false;
  gardenMomentEnd();
  const [x, y] = _gwFeet(), g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(.74)`);   // (the figure is drawn at this scale)
  g.innerHTML = gardenMomentSvg(spec, {});
  a.appendChild(g); _gmo.g = g;
  gartPlayerAct('hold', GART_MOMENT_MS);
  if (typeof _fxSound === 'function') _fxSound(spec.isNew ? 'chime' : 'sparkle');
  _gmo.t = setTimeout(gardenMomentEnd, GART_MOMENT_MS);
  // any key or click ends it (and does what it was going to do); moving ends it too
  // (not for the first moment: a press that was still going when the fish came in must not take it away before you have seen it)
  const shown = performance.now(), end = () => { if (performance.now() - shown > 1300) setTimeout(gardenMomentEnd, 0); };
  const iv = setInterval(() => {
    if (_gw.moving) end();
    // saving what you caught draws the garden again, which empties this layer: it goes back, or nobody ever saw it
    if (_gmo.g === g && !g.isConnected) { const la = _gwActors(); if (la) la.appendChild(g); }
  }, 60);
  document.addEventListener('keydown', end, true); document.addEventListener('pointerdown', end, true);
  _gmo.off = () => { clearInterval(iv); document.removeEventListener('keydown', end, true); document.removeEventListener('pointerdown', end, true); };
  return true;
}
document.addEventListener('opendash:garden', (ev) => {
  const d = ev && ev.detail; if (!d) return;
  if (d.kind === 'craft' && d.id) { if (typeof gardenLiveFx === 'function') gardenLiveFx('make', d.id); setTimeout(() => gardenCatchMoment('craft', d.id, { own: false }), 1300); }
  else if (d.kind === 'harvest' && d.gold && d.id) gardenCatchMoment('crop', d.id, { isNew: false });
});
