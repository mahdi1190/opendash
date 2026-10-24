/* ============================================================
   HOME widget "garden": Your garden (Memories, 2.16; model in 93-memories-ui.js).
   A calm companion: every day you finish something grows a plant (one task a sprout,
   two or three a plant, four or more a flower), a streak makes them bloom, a week's
   streak brings butterflies, and the tree grows with everything you ever finished.
   Neglect only slows it: nothing ever wilts, the garden just rests. S: two weeks,
   M: a month, L: two months. Hidden while the Fun level is Off (agent game).
   CSS: 93-memories.css (.hgd-*, .mg-*).
   ============================================================ */
registerHomeWidget({
  id: 'garden', title: 'Your garden', icon: 'sprout', group: 'fun', order: 265, fresh: true,
  sizes: ['s', 'm', 'l'], defaultSize: 's',
  description: 'Every finished task grows something; streaks make it bloom. Calm, never guilt',
  emptyHint: 'Hidden while the Fun level is Off',
  aliases: ['garden', 'plants', 'companion', 'grow', 'flowers', 'pet', 'tamagotchi', 'streak'],
  render(el, ctx) { return typeof memGardenModel === 'function' ? _hgdRender(el, ctx || {}) : false; },
});

function _hgdRender(el, ctx) {
  if (memFunLevel() === 'off' && !ctx.preview) return false;
  const size = ctx.size || 's';
  const g = memGardenModel(size === 's' ? 14 : size === 'm' ? 30 : 60);
  const card = document.createElement('section');
  card.className = 'card home-card hgd hgd-sz-' + size + (g.resting ? ' is-resting' : '') + (g.streak >= 3 ? ' is-blooming' : '');
  card.innerHTML = `<div class="card-h">${icon('sprout')}<h3>Your garden</h3><span class="n"></span></div><div class="card-b hgd-b"><div class="hgd-art"></div><p class="hgd-msg"></p></div>`;
  const lv = ['A seedling', 'A sapling', 'A young tree', 'A tall tree', 'An old oak', 'A great oak', 'The ancient tree'][g.tree] || 'A seedling';
  card.querySelector('.n').textContent = g.total ? `${lv} · ${g.total} grown` : '';
  card.querySelector('.hgd-art').innerHTML = memGardenSvg(g, { w: size === 's' ? 260 : 360, h: size === 's' ? 112 : 124 });
  card.querySelector('.hgd-msg').textContent = g.msg;
  el.appendChild(card);
  return true;
}
