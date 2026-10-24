/* ============================================================
   HOME widget "funfact": Did you know? (Memories, 2.16; memFunFacts in
   93-memories-core.js). One fact a day about your own data ("You finish most
   tasks on Tuesdays, around 10 am"); Another shows the next one. Worked out on
   this computer from the completion log: nothing is sent anywhere.
   Hidden while the Fun level is Off. CSS: 93-memories.css (.hff-*).
   ============================================================ */
registerHomeWidget({
  id: 'funfact', title: 'Did you know?', icon: 'lightbulb', group: 'fun', order: 268, fresh: true, defaultHidden: true,
  sizes: ['s', 'm'], defaultSize: 's',
  description: 'A daily fun fact about your own data: when you work best, your records, your favourite words',
  emptyHint: 'Appears after about fifteen finished tasks',
  aliases: ['fun fact', 'did you know', 'trivia', 'insight', 'stats', 'facts'],
  render(el, ctx) { return typeof memFunFacts === 'function' ? _hffRender(el, ctx || {}) : false; },
});
let _hffShift = 0;
function _hffRender(el, ctx) {
  if (memFunLevel() === 'off' && !ctx.preview) return false;
  const all = memFunFacts();
  const f = ctx.preview && !all.length ? { icon: 'clock', text: 'You finish most tasks on Tuesdays, around 10 am.' } : memFunFactToday(_hffShift);
  if (!f) return false;
  const card = document.createElement('section');
  card.className = 'card home-card hff';
  card.innerHTML = `${cardHeadHtml({ icon: 'lightbulb', title: 'Did you know?', cls: '' })}<div class="card-b hff-b"><span class="hff-ic">${icon(f.icon || 'sparkles', 'i-md')}</span><p class="hff-t"></p></div>`;
  card.querySelector('.hff-t').textContent = f.text;
  if (all.length > 1) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm'; b.innerHTML = `${icon('refresh-cw', 'i-sm')}<span>Another</span>`;
    b.onclick = () => { _hffShift = (_hffShift + 1) % all.length; homeRerenderWidget(ctx.id || 'funfact'); };
    card.querySelector('.card-h').appendChild(b);
  }
  el.appendChild(card);
  return true;
}
