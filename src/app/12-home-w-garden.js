/* ============================================================
   HOME widget "garden": a live window into your garden (2.18, agent 'garden-engine';
   the garden itself is 94-garden-*.js, docs/dev/GARDEN.md).
   S: the front garden, M: closer in on most of it, L: the whole garden. The scene is
   the Garden page's (plants sway, visitors come and go, rain and night), patched in
   place so nothing jumps when Home repaints. One click waters every thirsty plant or
   picks everything ripe (both with Undo); a click on the picture opens the Garden page.
   Calm, never guilt: nothing wilts, the words are gentle. Hidden while the Fun level
   is Off. Before the 2.18 garden files load (or if they fail), the 2.16 strip from
   memGardenModel / memGardenSvg (93-memories-ui.js) is drawn instead.
   CSS: 94-garden.css (.hgd-*), and 93-memories.css for the 2.16 strip.
   ============================================================ */
const _hgd = { node: null, parts: null, size: '' };
registerHomeWidget({
  id: 'garden', title: 'Your garden', icon: 'sprout', group: 'fun', order: 265, fresh: true,
  sizes: ['s', 'm', 'l'], defaultSize: 's', defaultHidden: true,
  description: 'A live window into your garden: water and pick in one click. Every finished task helps it grow',
  emptyHint: 'Hidden while the Fun level is Off',
  aliases: ['garden', 'plants', 'grow', 'flowers', 'streak', 'harvest', 'water'],   // 'pet', 'companion' and 'tamagotchi' are the pet's card now (2.18)
  refreshKey: () => { try { return typeof gardenModel === 'function' && state.garden && state.garden.since ? _hgdKey(gardenModel()) : ''; } catch (e) { return ''; } },
  render(el, ctx) {
    ctx = ctx || {};
    if (typeof gardenModel === 'function') { try { return _hgdRender(el, ctx); } catch (e) { console.error('[garden home]', e); } }
    return typeof memGardenModel === 'function' ? _hgdLegacy(el, ctx) : false;
  },
});

function _hgdKey(m) { return [m.wallet.coins, m.wallet.econToday.coins, m.ripe, m.thirsty, m.water.left, m.rain.now ? 1 : 0, m.visitors.map(v => v.id).join(','), m.tod, m.plants.length, m.decor.length, m.level.level, _gd.rev].join('|'); }
function _hgdCrop(size) { return size === 'l' ? 'all' : size === 'm' ? 'wide' : 'bed'; }
function _hgdRender(el, ctx) {
  if (memFunLevel() === 'off' && !ctx.preview) return false;
  const size = ctx.size || 's';
  // the gallery's preview never sets a garden up: it shows a sample one
  if (ctx.preview && !(state.garden && state.garden.since)) return _hgdSample(el, size);
  if (!gardenEnsure()) return _hgdSample(el, size, 'Your garden is waking up…');
  const m = gardenModel();
  const card = document.createElement('section');
  card.className = 'card home-card hgd hgd-live hgd-sz-' + size;
  card.dataset.size = size;
  card.innerHTML = `<div class="card-h">${icon('sprout')}<h3>Your garden</h3><span class="n"></span></div><div class="card-b hgd-b"><button type="button" class="hgd-art" aria-label="Open your garden"></button><div class="hgd-stats"></div><div class="hgd-foot"><p class="hgd-msg"></p><div class="hgd-acts"></div></div></div>`;
  card.querySelector('.hgd-art').onclick = () => setView('garden');
  el.appendChild(card);
  _hgdFill(card, m, size, !!ctx.preview);
  if (!ctx.preview && typeof gardenTickSoon === 'function') gardenTickSoon(4000);   // daily tasks and ribbons, quietly
  return true;
}
/** Paint (or bring up to date) one garden card. */
function _hgdFill(card, m, size, preview) {
  card.querySelector('.n').textContent = `Level ${m.level.level} · ${m.wallet.coins.toLocaleString()} coins`;
  const art = card.querySelector('.hgd-art');
  const still = !gardenMotionOn() || preview;
  const parts = gardenSceneParts(gardenSceneFromModel(m), { size: size === 'l' ? 'm' : 's', crop: _hgdCrop(size), still, uid: 'hgd' + size, label: `Your garden: ${m.plants.length} plants`, cacheKey: 'home|' + _gd.memoKey + '|' + size + '|' + (still ? 1 : 0) });
  // keep the drawing's nodes between Home repaints (the plants keep swaying); patch only what changed
  if (_hgd.node && _hgd.size === size && !preview) {
    art.appendChild(_hgd.node);
    if (_hgd.parts !== parts) _hgd.node = gardenSvgPatch(_hgd.node, parts);
  } else { const svg = gardenSvgMount(art, parts); if (!preview) _hgd.node = svg; }
  if (!preview) { _hgd.parts = parts; _hgd.size = size; }
  card.querySelector('.hgd-msg').textContent = _hgdMsg(m);
  const stats = card.querySelector('.hgd-stats');
  if (stats) {
    const e = m.wallet.econToday, nT = m.plants.filter(p => p.thirsty && p.def.thirst).length;
    const chip = (ic, text, tip) => `<span class="hgd-st" data-tip="${esc(tip)}">${icon(ic, 'i-sm')}<b>${esc(text)}</b></span>`;
    stats.innerHTML = chip('coins', `${e.coins} today`, gardenEconLine(e)) + chip('droplet', m.rain.now ? 'rain' : `${m.water.left} water`, 'Waterings left in the can today')
      + (m.ripe ? chip('shopping-basket', `${m.ripe} ripe`, 'Ready to pick') : nT && !m.rain.now ? chip('droplets', `${nT} thirsty`, 'Plants that would like a drink') : chip('sprout', `${m.plants.length} plants`, 'Plants in your garden'));
  }
  const acts = card.querySelector('.hgd-acts');
  acts.textContent = '';
  const btn = (label, ic, tip, run, primary) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm ' + (primary ? 'btn-primary' : 'btn-secondary');
    b.innerHTML = icon(ic) + (size === 's' ? '' : `<span>${esc(label)}</span>`);
    b.setAttribute('data-tip', tip); b.setAttribute('aria-label', tip);
    b.onclick = (e) => { e.stopPropagation(); if (preview) return; const r = run(); if (r && !r.ok && r.msg) { if (typeof gameDenyOf === 'function') gameDenyOf(r, b); else toast(r.msg, { icon: 'sprout', timeout: 3200 }); } };
    acts.appendChild(b);
  };
  const thirsty = m.plants.filter(p => p.thirsty && p.def.thirst).length;
  if (m.ripe) btn(`Pick ${m.ripe}`, 'shopping-basket', `Pick everything ripe (${m.ripe})`, () => gardenHarvestAll(), true);
  if (thirsty && !m.rain.now) btn(`Water ${thirsty}`, 'droplets', m.water.left ? `Water the thirsty plants (${thirsty})` : 'The can is empty: it refills tomorrow', () => gardenWaterAll(), !m.ripe);
  btn('Open garden', 'arrow-right', 'Open your garden', () => { setView('garden'); return { ok: true }; }, !m.ripe && !(thirsty && !m.rain.now));
  if (!preview && m.visitors.length && document.visibilityState === 'visible') setTimeout(() => { if (typeof gardenNoteVisitors === 'function') gardenNoteVisitors(m.visitors); }, 2500);
}
function _hgdMsg(m) {
  const v = m.visitors[0];
  const thirsty = m.plants.filter(p => p.thirsty && p.def.thirst).length;
  const bits = [];
  let nx = null; try { nx = typeof gardenNextStep === 'function' ? gardenNextStep(m) : null; } catch (e) { nx = null; }
  if (nx && !m.rain.now) bits.push(nx.title + '.');
  else if (m.rain.now) bits.push('Rain is watering the garden for you.');
  else if (m.ripe) bits.push(`${m.ripe} ready to pick.`);
  else if (thirsty) bits.push(`${thirsty === 1 ? 'One plant would' : thirsty + ' plants would'} love a drink.`);
  if (v) bits.push(`${/^[aeiou]/i.test(v.def.name) ? 'An' : 'A'} ${v.def.name.toLowerCase().replace(/^next door’s/, 'neighbour’s')} is visiting.`);
  if (!bits.length) {
    const next = m.plants.filter(p => p.nextIn && !p.def.special).sort((a, b) => a.nextIn - b.nextIn)[0];
    bits.push(next ? `The ${next.def.name.toLowerCase()} grows again in about ${_gdHoursLabel(next.nextIn)}.` : m.plants.length > 1 ? 'All is calm in the garden.' : 'Plant something: finished tasks earn seeds and coins.');
  }
  return bits.join(' ');
}
/** Home's live update after a garden change (the engine's gardenRepaintSoon): only the garden cards, in place. */
function _hgdRepaint() {
  if (state.view !== 'home') return;
  const cards = document.querySelectorAll('#main-body .hgd-live');
  if (!cards.length) return;
  const m = gardenModel();
  for (const c of cards) _hgdFill(c, m, c.dataset.size || 's', false);
}
/** The gallery's preview before a garden exists: a sample garden (no state is touched). */
function _hgdSample(el, size, msg) {
  const card = document.createElement('section');
  card.className = 'card home-card hgd hgd-sz-' + size;
  card.innerHTML = `<div class="card-h">${icon('sprout')}<h3>Your garden</h3><span class="n">Level 3</span></div><div class="card-b hgd-b"><div class="hgd-art"></div><div class="hgd-foot"><p class="hgd-msg"></p></div></div>`;
  card.querySelector('.hgd-msg').textContent = msg || 'Every finished task grows something. Water, pick, decorate.';
  el.appendChild(card);
  gardenRender(card.querySelector('.hgd-art'), _hgdSampleSnap(), { size: 's', crop: _hgdCrop(size), still: true });
  return true;
}
function _hgdSampleSnap() {
  const plants = [['heart-oak', 6, 4, 3, 2, 0], ['rose', 8, 4, 4, 0, 4], ['lavender', 9, 4, 4, 0, 0], ['sunflower', 10, 4, 4, 0, 0], ['tulip', 11, 4, 4, 2, 4], ['dahlia', 12, 4, 3, 1, 0],
    ['daisy', 8, 5, 4, 0, 4], ['cosmos', 9, 5, 4, 0, 0], ['basil', 10, 5, 3, 0, 0], ['peony', 11, 5, 4, 0, 0], ['marigold', 12, 5, 4, 0, 0], ['strawberry', 13, 5, 4, 0, 4],
    ['pansy', 8, 6, 4, 1, 0], ['foxglove', 9, 6, 4, 0, 0], ['mint', 10, 6, 2, 0, 1], ['hydrangea', 11, 6, 4, 0, 0], ['thyme', 12, 6, 4, 0, 0], ['crocus', 7, 7, 4, 0, 0], ['clover', 8, 7, 4, 0, 0], ['chives', 9, 7, 3, 0, 0]];
  const decor = [];
  for (let x = 5; x <= 15; x++) decor.push(['flagstones', x, 8, 0, 0]);
  decor.push(['bench', 9, 9, 0, 0], ['bird-bath', 13, 9, 0, 0], ['lantern', 7, 9, 0, 0], ['gnome', 14, 7, 0, 0]);
  return { v: 1, lv: 3, season: 'summer', areas: ['bed'], plants, decor, heart: 3, at: 1 };
}

/* ---------- the 2.16 strip (fallback when the 2.18 garden is not there) ---------- */
function _hgdLegacy(el, ctx) {
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
