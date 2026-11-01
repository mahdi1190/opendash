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
  fish: { verb: (d) => (d.cat === 'fish' ? 'caught' : 'fished up'), def: (id) => gardenFishDef(id), name: (d) => d.name, art: (id, px, d, v) => gardenCatchSvg('fish', id, px, { uid: 'mo' + id, v }) },
  bug: { verb: () => 'caught', def: (id) => gardenBugDef(id), name: (d) => d.name, art: (id, px, d, v) => gardenCatchSvg('bug', id, px, { uid: 'mo' + id, glow: false, v }) },
  keep: { verb: () => 'found', def: (id) => GL_KEEPSAKE.get(id), name: (d) => d.name, art: (id, px, d) => `<svg viewBox="-12 -16 24 20" width="${px}" height="${Math.round(px * 20 / 24)}">${gardenKeepsakeSvg(d)}</svg>` },
  craft: { verb: () => 'made', def: (id) => gardenRecipe(id), name: (d) => d.name, art: (id, px, d) => gardenCraftArt(d, px) },
  // what you bought or built: a rod, a net, a can, something for the lake (94-garden-fish-7gear.js)
  gear: { verb: () => 'got', def: (id) => gardenGearDef(id) || gardenTool(id), name: (d) => d.name, art: (id, px, d) => (d.tackle ? gardenTackleSvg(d, px) : d.kind === 'rod' || d.kind === 'net' ? gardenCatchSvg(d.kind, id, px) : d.kind === 'lake' ? gardenWorkSvg(id, px) : _gdxItemIcon('tool:' + id, px)) },
  crop: { verb: () => 'picked', def: (id) => gardenPlant(id), name: (d) => (d.yield && d.yield.item ? d.yield.item : d.name), art: (id, px) => _gdxItemIcon('crop:' + id, px) },
});
const GART_MOMENT_MS = 2700;
function gardenMomentSpec(kind, id, o) {
  const row = GART_MOMENTS[kind]; if (!row) return null;
  let d = null; try { d = row.def(id); } catch (e) { d = null; }
  if (!d) return null;
  o = o || {};
  const V = (kind === 'fish' || kind === 'bug') && o.v && typeof gardenVariantFor === 'function' ? gardenVariantFor(kind, d, o.v) : null, tier = V ? gardenVariantTier(V) : null;   // an id this version does not know: an ordinary one
  const name = (V ? V.name.toLowerCase() + ' ' : '') + String(row.name(d) || '').toLowerCase().replace(/^the /, '');
  const sub = [tier && tier.rank >= 2 ? tier.label : '', kind === 'fish' && o.cm ? o.cm + ' cm' : '', o.q ? (typeof gardenQuality === 'function' ? gardenQuality(o.q).label : '') : ''].filter(Boolean).join(' · ');
  return { kind, id, d, name, verb: row.verb(d), sub, isNew: !!o.isNew, record: !!o.record, v: V ? V.id : '', rank: tier ? tier.rank : 0, tier: tier ? tier.label : '', art: (px) => { try { return row.art(id, px, d, V ? V.id : '') || ''; } catch (e) { return ''; } } };
}
/** How long it is held up: the rarer, the longer. */
function gardenMomentMs(spec) { const r = (spec && spec.rank) || 0; return GART_MOMENT_MS + (r >= 5 ? 3000 : r >= 4 ? 2000 : r >= 3 ? 1000 : 0); }
/** The held item, its sparkle and the banner, as a fragment: feet at 0,0, the item between the hands. o.who: a name (others see "Sam caught a bream!"), else "A bream!". */
function gardenMomentSvg(spec, o) {
  o = o || {};
  const title = o.who ? `${o.who} ${spec.verb} ${_gscA(spec.name)}!` : `${_gscA(spec.name)}!`.replace(/^./, (c) => c.toUpperCase());
  const rank = spec.rank || 0, px = rank >= 4 ? 66 : rank >= 2 ? 54 : 46, y = GPL_HOLD.y, tw = Math.max(40, title.length * 5.4 + 16), sub = o.who ? '' : spec.sub;
  const by = y - 40, flag = spec.isNew ? 'New!' : spec.record ? 'Record!' : '';
  const star = (x, yy, s, dl) => `<path class="gmo-spark" style="animation-delay:${dl}s" transform="translate(${x} ${yy}) scale(${s})" d="M0-5L1.3-1.3L5 0L1.3 1.3L0 5L-1.3 1.3L-5 0L-1.3-1.3z" fill="#ffe27a" stroke="#e8a83a" stroke-width=".5"/>`;
  const rays = rank >= 2 && typeof gardenVariantMomentSvg === 'function' ? gardenVariantMomentSvg(rank, y) : '';
  const tag = rank >= 3 ? `${spec.tier}!` : '', tagW = tag.length * 4.8 + 10;
  return `<g class="gmo">${rays}<g class="gmo-pop"><ellipse cx="0" cy="${y}" rx="26" ry="22" fill="#fff6c8" fill-opacity=".38"/><g transform="translate(${-px / 2} ${y - px / 2 + 2})">${spec.art(px)}</g></g>`
    + star(-26, y - 16, 1, 0) + star(27, y - 10, .8, .3) + star(8, y - 30, .7, .6) + (rank >= 2 ? star(-34, y + 8, .8, .45) + star(36, y + 12, .9, .15) + star(-12, y - 36, .8, .75) : '')
    + `<g class="gmo-pop" style="animation-delay:.12s"><rect class="gmo-b" x="${-tw / 2}" y="${by - 12}" width="${tw}" height="${sub ? 24 : 17}" rx="8"/><text class="gmo-t" text-anchor="middle" y="${by}">${esc(title)}</text>${sub ? `<text class="gmo-s" text-anchor="middle" y="${by + 10}">${esc(sub)}</text>` : ''}`
    + (flag ? `<rect class="gmo-nb" x="${tw / 2 - 16}" y="${by - 20}" width="${flag.length * 4.8 + 8}" height="11" rx="5.5"/><text class="gmo-new" x="${tw / 2 - 12}" y="${by - 12}">${flag}</text>` : '') + (tag ? `<rect class="gmo-nb gmo-tag" x="${-tagW / 2}" y="${by - 26}" width="${tagW}" height="12" rx="6"/><text class="gmo-new" text-anchor="middle" y="${by - 17}">${esc(tag)}</text>` : '') + '</g></g>';
}
let _gmo = { g: null, t: 0, off: null };
function gardenMomentEnd() {
  clearTimeout(_gmo.t); if (_gmo.g) { _gmo.g.remove(); _gmo.g = null; }
  if (_gmo.off) { _gmo.off(); _gmo.off = null; }
  if (typeof gartPlayerAct === 'function') gartPlayerAct('idle', 1);
}
function gardenCatchMoment(kind, id, o) {
  o = o || {};
  if (o.tell !== false) try { if (typeof gardenLiveFx === 'function') gardenLiveFx('got', kind, { i: id, n: o.cm || 0, ql: o.q || 0, nw: (o.isNew ? 1 : 0) | (o.record ? 2 : 0), v: o.v || null }); } catch (e) { /* only a message */ }
  if (o.tell !== false) try { if (typeof gardenContestMine === 'function') gardenContestMine(kind, id, o); } catch (e) { /* a contest is only a game */ }
  if (o.own === false || gardenFun() === 'off' || typeof _gw === 'undefined' || !_gw.on) return false;
  const spec = gardenMomentSpec(kind, id, o), a = typeof _gwActors === 'function' ? _gwActors() : null;
  if (!spec || !a) return false;
  gardenMomentEnd();
  const [x, y] = _gwFeet(), g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(.74)`);   // (the figure is drawn at this scale)
  g.innerHTML = gardenMomentSvg(spec, {});
  a.appendChild(g); _gmo.g = g;
  const holdMs = gardenMomentMs(spec);
  gartPlayerAct('hold', holdMs);
  if (typeof _fxSound === 'function') _fxSound(spec.isNew || spec.rank >= 3 ? 'chime' : 'sparkle');
  _gmo.t = setTimeout(gardenMomentEnd, holdMs);
  if (spec.rank >= 4 && !o.contest && typeof gardenVariantEvent === 'function') setTimeout(() => gardenVariantEvent(spec), 1200);   // once in a lifetime: it stops what you are doing, for a moment
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
/** Told to friends now; held up on your screen as soon as you are back in the garden with the shop closed. */
function gardenCatchMomentSoon(kind, id, o) {
  gardenCatchMoment(kind, id, Object.assign({}, o, { own: false }));
  let tries = 0;
  const t = setInterval(() => {
    if (++tries > 200) { clearInterval(t); return; }
    if (typeof _gw === 'undefined' || !_gw.on || (typeof _gdp !== 'undefined' && _gdp.pop)) return;
    clearInterval(t);
    gardenCatchMoment(kind, id, Object.assign({}, o, { tell: false }));
  }, 300);
}
document.addEventListener('opendash:garden', (ev) => {
  const d = ev && ev.detail; if (!d) return;
  if (d.kind === 'craft' && d.id) { if (typeof gardenLiveFx === 'function') gardenLiveFx('make', d.id); setTimeout(() => gardenCatchMoment('craft', d.id, { own: false }), 1300); }
  else if (d.kind === 'harvest' && d.gold && d.id) gardenCatchMoment('crop', d.id, { isNew: false });
});
