/* ============================================================
   PROFILE, your catches on your card (2.22): the showcase of the garden's fishing and bug catching (94-garden-fish-*.js) as the optional
   profile field 'catch' (lib/profile-catch.mjs is its server half, a friend's card is cleaned with gardenShowClean). A few fish with their
   size and stars, a few bugs, and the rod and net you carry, in a strip on the card. Nothing shows until you pin something in the garden's
   Catch page > Showcase. Hats, pins and titles that need a garden ribbon are in the avatar kit (97-profile-0kit*.js) and the card's look.
   ============================================================ */
function _pctPayload() {
  try {
    if (typeof gardenReady !== 'function' || !gardenReady() || typeof gardenShowEntries !== 'function') return undefined;
    const e = gardenShowEntries();
    if (!e.f.length && !e.b.length) return undefined;   // nothing pinned: nothing to show (gear alone is not worth a strip)
    return { f: e.f.map(([i, q, c]) => ({ i, q, c })), b: e.b.slice(0, 9), rod: gardenRod().tier, net: gardenNet().tier };
  } catch (err) { return undefined; }
}
function _pctSanitize(v) {
  if (!v || typeof v !== 'object' || typeof gardenShowClean !== 'function') return null;
  const f = Array.isArray(v.f) ? v.f.map(x => (x && typeof x === 'object' ? [x.i, x.q, x.c] : null)).filter(Boolean) : [];
  const c = gardenShowClean({ f, b: v.b, rod: v.rod, net: v.net });
  return c && (c.f.length || c.b.length) ? c : null;
}
function _pctCard(card, view, o) {
  const c = view && view.profile && view.profile.ext ? view.profile.ext.catch : null;
  if (!c || !card || typeof gardenCatchSvg !== 'function') return;
  const strip = document.createElement('div'); strip.className = 'pf-card-catch' + (o && o.compact ? ' is-compact' : '');
  strip.setAttribute('aria-label', 'Catches');
  const add = (svg, tip) => { const s = document.createElement('span'); s.className = 'pf-catch-i'; s.innerHTML = svg; s.setAttribute('data-tip', tip); strip.appendChild(s); };
  for (const [id, q, cm] of c.f.slice(0, o && o.compact ? 3 : 6)) { const d = gardenFishDef(id); if (d) add(gardenCatchSvg('fish', id, o && o.compact ? 30 : 40, { uid: 'pcf' + id }), `${d.name} · ${cm} cm${q ? ' ' + gardenQuality(q).stars : ''}`); }
  for (const id of c.b.slice(0, o && o.compact ? 3 : 6)) { const d = gardenBugDef(id); if (d) add(gardenCatchSvg('bug', id, o && o.compact ? 24 : 30, { uid: 'pcb' + id, glow: false }), d.name); }
  if (!strip.children.length) return;
  const rod = c.rod ? GARDEN_RODS.find(r => r.tier === c.rod) : null;
  if (rod && !(o && o.compact)) { const g = document.createElement('span'); g.className = 'pf-catch-gear'; g.textContent = rod.name; strip.appendChild(g); }
  card.appendChild(strip);
}
// profileExtend is a function declaration in 97-profile-1core.js, which has run by now (this file sorts after it)
if (typeof profileExtend === 'function') {
  try { profileExtend({ key: 'catch', order: 25, wire: () => _pctPayload(), sanitize: (v) => _pctSanitize(v), card: (el, view, o) => _pctCard(el, view, o) }); } catch (e) { /* the card does fine without it */ }
}
// the catch strip follows the garden: share the new showcase soon after you change it
document.addEventListener('opendash:garden', (ev) => { if (ev && ev.detail && (ev.detail.kind === 'show' || ev.detail.kind === 'gear')) { try { if (typeof _pfShareSoon === 'function') _pfShareSoon(); } catch (e) { /* later */ } } });
