/* ============================================================
   HOME widget "animday": Animation of the day (v2.2 wave 5). Today's opening
   from the animation library (animToday('opening'): pins, favourites, blocks,
   packs off, the season, festivals, the UK county when that is on) with its
   origin line ("Durdle Door, Dorset", "For Bonfire night", "From the Seasons
   pack"; 71-achievements.js animOriginLine).
     S   the art, its name and the origin line
     M   plus today's theme and a button to the gallery
   Motion: the art plays once per entry into Home (first paint), then draws
   still; a click on it plays it again. Off / reduced motion: still art only.
   ============================================================ */
registerHomeWidget({
  id: 'animday', title: 'Animation of the day', icon: 'sparkles', group: 'fun', sizes: ['s', 'm'], defaultSize: 's',
  order: 270, defaultHidden: true,   // the default board is whole shelves of 12 (HOME_SPEC.md 3): offered in Add widget
  description: 'Today\'s animation from your library, and where it comes from',
  aliases: ['animation of the day', 'animation', 'today\'s animation', 'look of the day', 'opening'],
  render(el, ctx) { return _hwaRender(el, ctx || {}); },
});
function _hwaOn() { return typeof _awOn === 'function' ? _awOn() : !(window.Motion && Motion.prefersReduced && Motion.prefersReduced()); }
function _hwaRender(el, ctx) {
  if (typeof animToday !== 'function') return false;
  const it = animToday('opening') || animToday('symbol');
  if (!it) return false;
  const day = todayStr();
  const on = _hwaOn() && !ctx.preview;
  const live = on && !!ctx.firstPaint && (typeof _awEntryOnce !== 'function' || _awEntryOnce('animday'));
  let origin = '';
  try { origin = animOriginLine(it, day, Object.assign(typeof animCtx === 'function' ? animCtx() : {}, { level: _agLevel() })); } catch (e) { origin = ''; }
  const card = document.createElement('div'); card.className = 'card hwa hwa-full hwa-' + (ctx.size || 's');   // the art fills the card (71-anim-wire.css)
  const art = document.createElement('button'); art.type = 'button'; art.className = 'hwa-art'; art.setAttribute('aria-label', on ? `Play ${it.label} again` : it.label);
  art.innerHTML = animItemHtml(it, { size: 'fill', live, reduced: !live });
  art.onclick = () => { if (!_hwaOn()) return; art.innerHTML = animItemHtml(it, { size: 'fill', live: true }); };
  const txt = document.createElement('div'); txt.className = 'hwa-t';
  txt.innerHTML = '<span class="subtle hwa-over">Today</span><b class="hwa-name"></b><span class="subtle hwa-origin"></span>';
  txt.querySelector('.hwa-name').textContent = it.label;
  txt.querySelector('.hwa-origin').textContent = origin;
  if (ctx.size === 'm') {
    const th = ANIM_THEMES.find(t => t.id === animThemeFor(day, animLook()));
    const foot = document.createElement('div'); foot.className = 'hwa-foot';
    foot.innerHTML = `<span class="chip">${icon('palette', 'i-xs')}${esc(th ? th.label : 'Calm')} theme</span>`;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm'; b.innerHTML = icon('layout-grid', 'i-sm') + '<span>Gallery</span>';
    b.onclick = () => setView('settings:animations');
    foot.appendChild(b);
    txt.appendChild(foot);
  }
  card.append(art, txt);
  el.appendChild(card);
  return true;
}
