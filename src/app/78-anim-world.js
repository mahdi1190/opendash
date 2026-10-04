/* ============================================================
   WORLD CITIES (v2.2 wave 6). The page side of the world pack
   (72-anim-pack-world.js): where travel places you, offline. No setting of
   its own: it follows Settings > Travel (on, and away from home) and the
   "World cities" pack switch in the gallery.
     animWorldWhere()          {city, country} while travel places you away from home, else null
     animWorldSignature(city)  the city's signature item (opening), or null (no art, pack off, blocked)
     animWorldElement(city)    the city's second element (symbol), or null
     animWorldArrivalHtml(city, level)  the art for the travel arrival card ('' when none):
                               still at Reduced/Off or with animations off
   animCtx() (78-anim-wire.js) carries city and country, so the world items win the
   day's opening and symbol while you are there (their when() rules).
   ============================================================ */
function animWorldWhere() {
  try {
    if (typeof TravelStore === 'undefined' || !TravelStore.on()) return null;
    const w = TravelStore.snapshot().where;
    const pl = w && w.source !== 'home' ? w.place : null;
    if (!pl || !pl.cityId) return null;
    return { city: String(pl.cityId), country: String(pl.cc || '') };
  } catch (e) { return null; }
}
function _awdFind(city, kind) {
  if (!city) return null;
  const look = typeof animLook === 'function' ? animLook() : null;
  return animItems({ look }).find(it => it.city === city && it.worldKind === kind && !(look && look.block.includes(it.ref))) || null;
}
function animWorldSignature(city) { return _awdFind(city, 'signature'); }
function animWorldElement(city) { return _awdFind(city, 'element'); }
/* The arrival card's level ('off' | 'reduced' | 'subtle' | 'standard' | 'playful', 69-travel-moments.js). */
function animWorldArrivalHtml(city, level) {
  const sig = animWorldSignature(city);
  if (!sig) return '';
  const el = animWorldElement(city);
  const still = level === 'reduced' || level === 'off' || document.documentElement.classList.contains('anim-off');
  return `<div class="trm-world" aria-hidden="true">${animItemHtml(sig, { size: 'xl', live: !still, reduced: still, cls: 'trm-world-sig' })}`
    + (el ? animItemHtml(el, { size: 'md', live: !still, reduced: still, cls: 'trm-world-el' }) : '') + '</div>';
}
