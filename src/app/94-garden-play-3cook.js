/* ============================================================
   PLAY: the cooking pot. docs/dev/HUNDRED_PLAY.md 6-9. Put in up to four things, stir, see what comes out.
   Dishes are items (dish:<id>): they cannot be sold, so cooking never makes coins. Found dishes: pl.ck.<id>. Effects: pl.fx.feet (until, ms), pl.fx.arm.<day> (water).
   ============================================================ */
const GP_DISHES = Object.freeze([
  { id: 'fish-pie', name: 'Fish pie', need: { fish: 1, flour: 1 }, fx: 'feet', hint: 'Fish, with a lid made of flour' },
  { id: 'fruit-pie', name: 'Fruit pie', need: { fruit: 1, flour: 1 }, fx: 'arm', hint: 'Fruit, with a lid made of flour' },
  { id: 'honey-cake', name: 'Honey cake', need: { honey: 1, flour: 1 }, fx: 'feet', hint: 'Something sweet, and something from the mill' },
  { id: 'pancakes', name: 'Pancakes', need: { egg: 1, flour: 1 }, fx: 'arm', hint: 'An egg and something from the mill' },
  { id: 'bread', name: 'A small loaf', need: { flour: 2 }, fx: 'arm', hint: 'Only what the mill gives you, twice' },
  { id: 'custard', name: 'Honey custard', need: { egg: 1, honey: 1 }, fx: 'feet', hint: 'From a hen and from a bee' },
  { id: 'herb-omelette', name: 'Herb omelette', need: { egg: 1, herb: 1 }, fx: 'feet', hint: 'An egg and something that smells good' },
  { id: 'omelette', name: 'Omelette', need: { egg: 1, veg: 1 }, fx: 'arm', hint: 'An egg and something from the veg patch' },
  { id: 'fish-feast', name: 'Fisher’s platter', need: { fish: 2 }, fx: 'feet', hint: 'Two from the lake' },
  { id: 'baked-fish', name: 'Baked fish', need: { fish: 1, herb: 1 }, fx: 'feet', hint: 'A fish and something that smells good' },
  { id: 'fish-stew', name: 'Fish stew', need: { fish: 1, veg: 1 }, fx: 'arm', hint: 'A fish and something from the veg patch' },
  { id: 'compote', name: 'Fruit in honey', need: { fruit: 1, honey: 1 }, fx: 'feet', hint: 'Fruit and something sweet' },
  { id: 'big-stew', name: 'A very big stew', need: { veg: 3 }, fx: 'arm', hint: 'Three from the veg patch' },
  { id: 'soup', name: 'Soup', need: { veg: 2 }, fx: 'arm', hint: 'Two from the veg patch' },
  { id: 'broth', name: 'Herb broth', need: { veg: 1, herb: 1 }, fx: 'arm', hint: 'A vegetable and a herb' },
  { id: 'fruit-salad', name: 'Fruit salad', need: { fruit: 2 }, fx: 'feet', hint: 'Two kinds of picking' },
  { id: 'flower-tea', name: 'Flower tea', need: { flower: 1, honey: 1 }, fx: 'feet', hint: 'A flower, sweetened' },
  { id: 'herb-tea', name: 'Herb tea', need: { herb: 1 }, fx: 'arm', hint: 'Just one good-smelling thing' },
  { id: 'petal-salad', name: 'Petal salad', need: { flower: 2 }, fx: 'feet', hint: 'Two flowers, and some nerve' },
  { id: 'mash', name: 'Mystery mash', need: {}, fx: 'pet', hint: 'Anything else at all' },
]);
const GP_FX = Object.freeze({ feet: 'Light feet: you walk a good bit faster for 15 minutes', arm: 'Strong arm: four more cans of water today', pet: 'Only your pet will touch this' });
function gpDish(id) { return GP_DISHES.find(d => d.id === id) || null; }
function _gpIngTag(item) {
  if (item === 'egg') return 'egg'; if (item === 'honey') return 'honey'; if (item === 'flour') return 'flour';
  if (/^fish:/.test(item)) { const m = /^fish:(.+)-[0-3]$/.exec(item), d = m && gardenFishDef(m[1]); return d && d.cat === 'fish' ? 'fish' : ''; }
  const c = /^crop:(.+)$/.exec(item), p = c && gardenPlant(c[1]); if (!p) return '';
  return { veg: 'veg', fruit: 'fruit', tree: 'fruit', herb: 'herb', flower: 'flower', wild: 'flower', exotic: 'fruit', succulent: 'veg', water: 'veg' }[p.cat] || '';
}
/** What these ingredients make. PURE on the tags: the first row whose needs are exactly met. */
function gpCookResult(items) {
  const n = {}; for (const it of items) { const t = _gpIngTag(it); if (t) n[t] = (n[t] || 0) + 1; }
  const total = items.length;
  for (const d of GP_DISHES) { const keys = Object.keys(d.need); if (!keys.length) continue; const used = keys.reduce((a, k) => a + d.need[k], 0); if (used === total && keys.every(k => n[k] === d.need[k])) return d; }
  return gpDish('mash');
}
function _gpIngredients() { const out = []; for (const [k, v] of Object.entries(gardenWallet().items)) if (v >= 1 && _gpIngTag(k)) out.push({ item: k, n: Math.floor(v), tag: _gpIngTag(k) }); const order = ['egg', 'flour', 'honey', 'veg', 'fruit', 'herb', 'flower', 'fish']; return out.sort((a, b) => order.indexOf(a.tag) - order.indexOf(b.tag)); }
function gardenPlayWater(day) { return Number(gpGet('fx.arm.' + day, 0)) || 0; }
function gardenPlayWalk() { const u = Number(gpGet('fx.feet', 0)); return u > _gdNow() ? 1.3 : 1; }
function gpDishesOwned() { const out = []; for (const d of GP_DISHES) { const n = gardenHas('dish:' + d.id); if (n) out.push({ d, n }); } return out; }
function _gpEat(d) {
  const key = 'pl.' + _gdToday() + '.' + _gdUid(''), today = _gdToday(), seenKey = d.fx === 'feet' ? 'pl.fx.feet' : 'pl.fx.arm.' + today, mark = _gdMark([['led', key], ['seen', seenKey]]), g = _gdG();
  g.led[key] = { d: today, k: 'pl', i: { ['dish:' + d.id]: -1 }, n: 1 };
  if (d.fx === 'feet') g.seen[seenKey] = Math.max(Number(g.seen[seenKey]) || 0, _gdNow()) + 15 * 60000;
  else g.seen[seenKey] = Math.min(12, (Number(g.seen[seenKey]) || 0) + 4);
  _gdDone(`${d.name}. ${GP_FX[d.fx]}.`, 'eating', mark, { icon: 'utensils' });
}
function _gpFeed(d) {
  const pet = gpPet(); if (!pet) return;
  gpSpend('feeding your pet', { ['dish:' + d.id]: -1 }, `${pet.name} eats the ${d.name}`);
  gpSet('ev.fedpet', 1);
  try { petBondGive('treat'); } catch (e) { /* fine */ }
  try { const P = gpPetMe(); if (P) { P.sit({ eyes: 'happy', mouth: 'open' }); P.clip('wiggle', 1200, () => { P.sit(); P.busy = 1; if (P.hearts) P.hearts(); }); } } catch (e) { /* fine */ }
}
/** A dish's plate: its tag colours, so each one looks different. */
function gpDishSvg(d, px) {
  const h = gardenHash('dish|' + d.id), hue = ['#d8843c', '#c8453a', '#e8b83c', '#8fb04a', '#b5764a', '#e8d8a0', '#d87a9a', '#6a8fc8'][h % 8], c2 = ['#f4e6c0', '#7a4a2a', '#f4d890', '#5a8a3a'][(h >> 3) % 4];
  return `<svg viewBox="0 0 64 48" width="${px}" aria-hidden="true"><ellipse cx="32" cy="38" rx="28" ry="8" fill="#e8eef2"/><ellipse cx="32" cy="36" rx="22" ry="6" fill="#c8d4dc"/><path d="M14 34c0-14 36-14 36 0 0 4-36 4-36 0z" fill="${hue}"/><circle cx="${24 + h % 6}" cy="27" r="3" fill="${c2}"/><circle cx="${36 + h % 5}" cy="${29 - h % 3}" r="2.500" fill="${c2}"/><path d="M26 16c-3-4 3-5 0-9M36 16c-3-4 3-5 0-9" fill="none" stroke="#c8d4dc" stroke-width="2" stroke-linecap="round"/></svg>`;
}
function _gpCookOpen() {
  gpStage('The cooking pot', (el) => {
    const chosen = [];
    const paint = () => {
      el.textContent = '';
      el.appendChild(gpEl('p', 'gp-lead', 'Choose up to four things and put them in. There is no wrong answer, only mash. Eggs come from a hen coop, flour from the mill.'));
      const pot = gpEl('div', 'gp-potrow');
      const slots = gpEl('div', 'gp-slots');
      for (let i = 0; i < 4; i++) {
        const it = chosen[i], s = gpEl('button', 'gp-slotb' + (it ? ' is-full' : '')); s.type = 'button';
        if (it) { s.innerHTML = _gpLunchSvg(it, 40); s.setAttribute('data-tip', 'Take it out'); s.onclick = () => { chosen.splice(i, 1); paint(); }; } else s.disabled = true;
        slots.appendChild(s);
      }
      pot.appendChild(slots);
      pot.appendChild(uiButton({ label: 'Start stirring', icon: 'flame', kind: 'primary', disabled: !chosen.length, run: () => _gpStir(el, chosen.slice(), paint) }));
      el.appendChild(pot);
      const ing = _gpIngredients();
      if (!ing.length) el.appendChild(emptyLine('Your basket has nothing to cook yet. Pick some crops or catch a fish, and come back.'));
      const grid = gpEl('div', 'gp-lunches is-small');
      for (const L of ing.slice(0, 40)) {
        const left = L.n - chosen.filter(x => x === L.item).length, b = gpEl('button', 'gp-lunch'); b.type = 'button'; b.disabled = left < 1 || chosen.length >= 4;
        b.innerHTML = `<span class="gp-lunch-art">${_gpLunchSvg(L.item, 36)}</span><b>${esc(_gpIngName(L.item))}</b><span class="muted">${left}</span>`;
        b.onclick = () => { chosen.push(L.item); paint(); };
        grid.appendChild(b);
      }
      el.appendChild(grid);
      const have = gpDishesOwned();
      if (have.length) {
        el.appendChild(gpEl('h3', 'gp-h', 'What you have made'));
        const list = gpEl('div', 'gp-dishes');
        for (const { d, n } of have) {
          const r = gpEl('div', 'gp-dish'); r.innerHTML = `${gpDishSvg(d, 56)}<span class="gp-t"><b>${esc(d.name)}${n > 1 ? ` ×${n}` : ''}</b><span class="muted">${esc(GP_FX[d.fx])}</span></span>`;
          if (d.fx !== 'pet') r.appendChild(uiButton({ label: 'Eat it', size: 'sm', run: () => { _gpEat(d); paint(); } }));
          if (gpPet()) r.appendChild(uiButton({ label: 'Give it to your pet', size: 'sm', kind: 'ghost', run: () => { _gpFeed(d); paint(); } }));
          list.appendChild(r);
        }
        el.appendChild(list);
      }
      const found = GP_DISHES.filter(d => gpGet('ck.' + d.id));
      el.appendChild(gpEl('h3', 'gp-h', `The cookbook: ${found.length} of ${GP_DISHES.length}`));
      const book = gpEl('div', 'gp-book');
      for (const d of GP_DISHES) { const has = !!gpGet('ck.' + d.id), c = gpEl('div', 'gp-bookrow' + (has ? '' : ' is-blank')); c.innerHTML = has ? `${gpDishSvg(d, 40)}<b>${esc(d.name)}</b>` : `<span class="gp-q">?</span><span class="muted">${esc(d.hint)}</span>`; book.appendChild(c); }
      el.appendChild(book);
    };
    paint();
  });
}
function _gpIngName(item) { if (item === 'flour') return 'Flour'; return _gpLunchName(item); }
/** Three stirs: press as the spoon crosses the bright part. How good it comes out decides how many you get. */
function _gpStir(el, items, back) {
  el.textContent = '';
  el.appendChild(gpEl('p', 'gp-lead', 'Press Stir, or Space, each time the spoon crosses the bright part. Three stirs.'));
  const size = 240, cv = gpEl('canvas', 'gp-canvas gp-stir'); cv.width = size; cv.height = size; cv.tabIndex = 0; el.appendChild(cv);
  const line = gpEl('p', 'gp-scoreline', 'Stir when it is bright.'); el.appendChild(line);
  const g = cv.getContext('2d'), S = { a: 0, spd: 2.6, n: 0, hits: 0, zone: 1.2, end: false };
  const press = () => {
    if (S.end) return;
    const d = Math.abs(((S.a - S.zone + Math.PI * 3) % (Math.PI * 2)) - Math.PI), ok = d < 0.42;
    S.n++; if (ok) S.hits++;
    gpTone(ok ? [659] : [262], { len: 0.14, vol: 0.05 });
    line.textContent = ok ? 'Lovely.' : 'Slopped a bit.';
    S.zone = (S.zone + 2 + Math.random() * 2.2) % (Math.PI * 2); S.spd += 0.8;
    if (S.n >= 3) { S.end = true; setTimeout(() => { if (el.isConnected) _gpServe(el, items, S.hits, back); }, 450); }
  };
  const btn = uiButton({ label: 'Stir', icon: 'flame', kind: 'primary', run: press }); el.appendChild(btn);
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); press(); });
  cv.addEventListener('keydown', (e) => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); press(); } });
  setTimeout(() => cv.focus(), 0);
  gpLoop(cv, (dt) => {
    S.a = (S.a + S.spd * dt) % (Math.PI * 2);
    const c = size / 2; g.clearRect(0, 0, size, size);
    g.fillStyle = '#3a3f46'; g.beginPath(); g.arc(c, c, 112, 0, 6.3); g.fill();
    g.fillStyle = '#c88a4c'; g.beginPath(); g.arc(c, c, 98, 0, 6.3); g.fill();
    g.strokeStyle = '#ffe08a'; g.lineWidth = 22; g.beginPath(); g.arc(c, c, 70, S.zone - 0.42, S.zone + 0.42); g.stroke();
    g.strokeStyle = '#6a4a2c'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(c + Math.cos(S.a) * 40, c + Math.sin(S.a) * 40); g.lineTo(c + Math.cos(S.a) * 92, c + Math.sin(S.a) * 92); g.stroke();
    g.fillStyle = '#f4e6c0'; for (let i = 0; i < S.hits; i++) { g.beginPath(); g.arc(c - 18 + i * 18, c, 6, 0, 6.3); g.fill(); }
  });
}
function _gpServe(el, items, hits, back) {
  const d = gpCookResult(items), n = hits >= 3 ? 2 : 1, first = !gpGet('ck.' + d.id), spend = {};
  for (const it of items) spend[it] = (spend[it] || 0) - 1;
  spend['dish:' + d.id] = n;
  gpSpend('cooking', spend, `You made ${d.name}`);
  gpSet('ck.' + d.id, _gdToday());
  if (items.includes('flour')) gpSet('ev.flour', 1);
  gpPay('cook', { xp: first ? 5 : 1, tickets: first ? 4 : 0 });
  gpTone(first ? [523, 659, 784, 1047] : [523, 659], {});
  el.textContent = '';
  const r = gpEl('div', 'gp-served');
  r.innerHTML = `${gpDishSvg(d, 150)}<h3>${esc(d.name)}${n > 1 ? ', and enough for two' : ''}</h3><p class="muted">${esc(first ? 'New in the cookbook. ' : '')}${esc(GP_FX[d.fx])}.</p>`;
  el.appendChild(r);
  const row = gpEl('div', 'gp-row');
  row.appendChild(uiButton({ label: 'Undo that', size: 'sm', kind: 'ghost', icon: 'undo-2', run: () => { gardenUndo(); back(); } }));
  row.appendChild(uiButton({ label: 'Back to the pot', kind: 'primary', size: 'sm', run: () => back() }));
  el.appendChild(row);
}
gardenPlayAdd({ id: 'cook', name: 'The cooking pot', icon: 'utensils', group: 'make', verb: 'Cook something', blurb: 'Put in what you like. Find every dish. Each one does something.', status: () => { const n = GP_DISHES.filter(d => gpGet('ck.' + d.id)).length; return n ? `${n} of ${GP_DISHES.length} dishes found` : ''; }, open: _gpCookOpen });
