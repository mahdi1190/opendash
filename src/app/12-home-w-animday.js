/* ============================================================
   HOME widget "animday": Animation of the day (v2.2 wave 5). Today's opening
   from the animation library (animToday('opening'): pins, favourites, blocks,
   packs off, the season, festivals, the UK county when that is on) with its
   origin line ("Durdle Door, Dorset", "For Bonfire night", "From the Seasons
   pack"; 71-achievements.js animOriginLine).
     S   the art, its name and the origin line
     M   plus today's theme and a button to the gallery
   Motion: the art starts playing on entry into Home (first paint) and keeps
   playing across re-renders (the same node is kept, see _hwaArt); a click on
   it plays it again. Off / reduced motion: still art only.
   ============================================================ */
registerHomeWidget({
  id: 'animday', title: 'Animation of the day', icon: 'sparkles', group: 'fun', sizes: ['s', 'm'], defaultSize: 's',
  order: 270, defaultHidden: true,   // the default board is whole shelves of 12 (HOME_SPEC.md 3): offered in Add widget
  description: 'Today\'s animation from your library, and where it comes from',
  aliases: ['animation of the day', 'animation', 'today\'s animation', 'look of the day', 'opening'],
  render(el, ctx) { return _hwaRender(el, ctx || {}); },
  // Home's minute refresh (12-home-refresh.js) skips this card while the key it painted still holds.
  refreshKey() { const it = typeof animToday === 'function' ? animToday('opening') || animToday('symbol') : null; return it ? _hwaKey(it, _hwaOn()) : ''; },
});
function _hwaOn() { return typeof _awOn === 'function' ? _awOn() : !(window.Motion && Motion.prefersReduced && Motion.prefersReduced()); }
/* The art is kept across re-renders (a save, live sync, Home's minute refresh): a rich scene is up to
   1 MB of SVG and took over half a second to rebuild, and every rebuild restarted (or stilled) it, a
   visible flicker. It is redrawn only when its key changes: the item, the day, the hour (the live
   sky moves slowly) or motion on/off. A kept live scene carries on where it was (animSceneResume). */
let _hwaArt = null;   // {key, node, live}
/* The card draws the tile level of detail (registry o.detail 'tile') and plays for a minute, then rests
   on the frame it reached (.is-rested pauses the loops, 76-scenes.css): a looping rich scene repainted
   the whole drawing every frame for as long as Home stayed open. A click plays it again. */
const _HWA_PLAY_MS = 60000;
let _hwaRestT = 0;
function _hwaPlay(art) {
  clearTimeout(_hwaRestT);
  _hwaRestT = setTimeout(() => { const sc = art.querySelector('.anim-scene.is-live'); if (sc) sc.classList.add('is-rested'); }, _HWA_PLAY_MS);
}
function _hwaKey(it, on) {
  let h = 0;
  try { h = Clock.parts(Clock.now()).h; } catch (e) { h = 0; }
  return [it.ref, todayStr(), h, on ? 1 : 0, typeof _agLevel === 'function' ? _agLevel() : ''].join('|');
}
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
  const key = _hwaKey(it, on);
  const frame = !ctx.preview && el.closest ? el.closest('.hg-w') : null;
  if (frame) frame.dataset.refreshKey = _hwaKey(it, _hwaOn());
  const keep = !ctx.preview && _hwaArt && _hwaArt.key === key && (!live || _hwaArt.live) ? _hwaArt : null;
  const art = keep ? keep.node : document.createElement('button');
  if (!keep) {
    art.type = 'button'; art.className = 'hwa-art'; art.setAttribute('data-scene-key', 'home-animday');
    art.innerHTML = animItemHtml(it, { size: 'fill', detail: 'tile', live, reduced: !live });
    if (!ctx.preview) _hwaArt = { key, node: art, live };
    if (live && !ctx.preview) _hwaPlay(art);
  }
  art.setAttribute('aria-label', on ? `Play ${it.label} again` : it.label);
  art.onclick = () => {
    if (!_hwaOn()) return;
    art.innerHTML = animItemHtml(it, { size: 'fill', detail: 'tile', live: true });
    if (_hwaArt && _hwaArt.node === art) _hwaArt.live = true;
    _hwaPlay(art);
  };
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
  if (keep && keep.live && typeof animSceneResume === 'function') animSceneResume(art);
  return true;
}
