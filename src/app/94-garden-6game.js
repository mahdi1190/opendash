/* ============================================================
   GARDEN, the game layer (2.18.1): everything that makes the full-screen garden clear and alive.
     - "What to do next": one suggested step with a pulsing ring on the thing to click
     - the income panel ("Today: 42 coins from 1h40 focused (cap 120)") and its small log
     - the first-run tour (6 steps, skippable, replay from the ? button) and the Garden guide
     - feedback: floating "+2 XP", splashes, dark soil, harvest arcs into the basket, growth pops,
       visitor notes, the level-up card
     - the hover card with a growth ring
   Draws into the page built by 94-garden-4page.js (_gdp). Reduced motion and the Fun level are respected
   (gardenMotionOn): without motion nothing flies, the toasts still say what happened.
   ============================================================ */
const _gdg = { tour: -1, bound: false, stages: null, visitors: null, wlSeen: null, ro: null, noteT: 0, nextKey: '' };

/* ---------- geometry: a cell rectangle in the stage box's pixels ---------- */
function _gdgBox() { return _gdp.root ? _gdp.root.querySelector('.gd-stagebox') : null; }
function _gdgRectPx(x, y, w, h) {
  const svg = _gdp.svg, box = _gdgBox();
  if (!svg || !box || !svg.getScreenCTM) return null;
  const ctm = svg.getScreenCTM(); if (!ctm) return null;
  const W = GARDEN_WORLD, pt = (ux, uy) => { const p = svg.createSVGPoint(); p.x = ux; p.y = uy; return p.matrixTransform(ctm); };
  const a = pt(x * W.cellW, W.sky + y * W.cellH), b = pt((x + w) * W.cellW, W.sky + (y + h) * W.cellH), r = box.getBoundingClientRect();
  return { l: a.x - r.left, t: a.y - r.top, w: b.x - a.x, h: b.y - a.y };
}
function _gdgOv() {
  const box = _gdgBox(); if (!box) return null;
  let ov = box.querySelector('.gd-ov');
  if (!ov) { ov = document.createElement('div'); ov.className = 'gd-ov'; ov.setAttribute('aria-hidden', 'true'); box.appendChild(ov); }
  return ov;
}
function _gdgNode(cls, html, r) {
  const ov = _gdgOv(); if (!ov || !r) return null;
  const n = document.createElement('div'); n.className = cls; if (html != null) n.innerHTML = html;
  n.style.left = r.l + 'px'; n.style.top = r.t + 'px'; n.style.width = r.w + 'px'; n.style.height = r.h + 'px';
  ov.appendChild(n);
  return n;
}
function _gdgGone(n, ms) { setTimeout(() => { if (n && n.parentNode) n.remove(); }, ms); }

/* ---------- feedback ---------- */
function gardenFloat(text, x, y, w, h, cls) {
  if (!gardenMotionOn()) return;
  const r = _gdgRectPx(x, y, w || 1, h || 1); if (!r) return;
  const n = _gdgNode('gd-float ' + (cls || ''), null, { l: r.l, t: r.t, w: r.w, h: r.h });
  if (!n) return;
  n.textContent = text;
  _gdgGone(n, 1700);
}
function gardenPop(x, y, w, h, cls) {
  if (!gardenMotionOn()) return;
  const r = _gdgRectPx(x, y, w || 1, h || 1); if (!r) return;
  const n = _gdgNode('gd-pop ' + (cls || ''), '<i></i><i></i><i></i><i></i>', r);
  _gdgGone(n, 1100);
}
function _gdgSoil(x, y, w, h) {
  if (!gardenMotionOn()) return;
  const r = _gdgRectPx(x, y, w || 1, h || 1); if (!r) return;
  const n = _gdgNode('gd-soil', null, { l: r.l + r.w * 0.08, t: r.t + r.h * 0.45, w: r.w * 0.84, h: r.h * 0.55 });
  _gdgGone(n, 30000);
}
/** A harvested item flies from the plant to the basket in the toolbar. */
function _gdgFly(plantId, x, y, w, h, delay) {
  if (!gardenMotionOn()) return;
  const box = _gdgBox(), ov = _gdgOv(); if (!box || !ov) return;
  const r = _gdgRectPx(x, y, w || 1, h || 1); if (!r) return;
  const tgt = _gdp.root.querySelector('.gd-tool[data-tool="hand"]') || _gdp.root.querySelector('.gd-tabbtn[data-tab="basket"]');
  const br = box.getBoundingClientRect(), tr = tgt ? tgt.getBoundingClientRect() : null;
  const n = document.createElement('div'); n.className = 'gd-fly';
  try { n.innerHTML = gardenIconSvg(plantId, { kind: 'crop', px: 30 }); } catch (e) { n.textContent = ''; }
  const sx = r.l + r.w / 2 - 15, sy = r.t + r.h / 2 - 15;
  n.style.left = sx + 'px'; n.style.top = sy + 'px';
  ov.appendChild(n);
  const dx = tr ? tr.left + tr.width / 2 - br.left - 15 - sx : -sx, dy = tr ? tr.top + tr.height / 2 - br.top - 15 - sy : 0;
  try {
    const a = n.animate([
      { transform: 'translate(0,0) scale(.6)', opacity: 0 },
      { transform: `translate(${dx * 0.15}px,${Math.min(dy * 0.15, 0) - 46}px) scale(1.15)`, opacity: 1, offset: 0.28 },
      { transform: `translate(${dx}px,${dy}px) scale(.55)`, opacity: 0.9 },
    ], { duration: 780, delay: delay || 0, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'both' });
    a.onfinish = () => { n.remove(); if (tgt) { tgt.classList.remove('is-bump'); void tgt.offsetWidth; tgt.classList.add('is-bump'); } };
  } catch (e) { n.remove(); }
}
function _gdgPlantsNow() { try { return gardenModel().plants; } catch (e) { return []; } }
/** Plants whose watering is new since the last look (a sweep, "Water all" or one click). */
function _gdgWatered(m) {
  const g = _gdG(), now = new Set(Object.keys(g.wl[m.today] || {}));
  const prev = _gdg.wlSeen;
  _gdg.wlSeen = now;
  if (!prev) return [];
  return m.plants.filter(p => now.has(p.uid) && !prev.has(p.uid));
}
function _gdgOnEvent(ev) {
  const d = ev && ev.detail; if (!d || !_gdp.root || !_gdp.root.isConnected) return;
  const tab = _gdpTab(state.view); if (tab !== 'garden') return;
  try {
    if (d.kind === 'plant') {
      gardenFloat('+2 XP', d.x, d.y, 1, 1, 'is-xp'); gardenPop(d.x, d.y, 1, 1, 'is-plant');
      gardenTourEvent('plant');
    } else if (d.kind === 'feed') { gardenFloat('+half a day', d.x, d.y, d.fp || 1, d.fp || 1, 'is-feed'); gardenPop(d.x, d.y, d.fp || 1, d.fp || 1, 'is-feed'); }
    else if (d.kind === 'prune') { gardenFloat('Tidy', d.x, d.y, d.fp || 1, d.fp || 1); }
    else if (d.kind === 'harvest') {
      if (d.cells) d.cells.forEach((c, i) => { _gdgFly(c[3], c[0], c[1], c[2], c[2], i * 90); gardenPop(c[0], c[1], c[2], c[2], 'is-harvest'); });
      else if (d.x != null) { for (let i = 0; i < Math.min(3, d.n || 1); i++) _gdgFly(d.id, d.x, d.y, d.fp || 1, d.fp || 1, i * 110); gardenFloat((d.gold ? 'Golden! +' : '+') + d.n, d.x, d.y, d.fp || 1, d.fp || 1, d.gold ? 'is-gold' : 'is-xp'); gardenPop(d.x, d.y, d.fp || 1, d.fp || 1, d.gold ? 'is-gold' : 'is-harvest'); }
    } else if (d.kind === 'level') gardenLevelUpCard(d);
    else if (d.kind === 'area') gardenLevelUpCard(d);
    else if (d.kind === 'buy') { const t = _gdp.root.querySelector('.gd-tabbtn[data-tab="shop"]'); if (t) { t.classList.remove('is-bump'); void t.offsetWidth; t.classList.add('is-bump'); } }
  } catch (e) { console.error('[garden fx]', e); }
  if (d.kind === 'water') gardenTourEvent('water');
}
/** After every paint of the stage: new waterings, stages that grew, new visitors. */
function gardenGamePainted(m) {
  if (!gardenMotionOn() && gardenFun() === 'off') { _gdg.stages = null; return; }
  for (const p of _gdgWatered(m)) { _gdpSplash(p); _gdgSoil(p.x, p.y, p.fp, p.fp); gardenFloat('Watered', p.x, p.y, p.fp, p.fp, 'is-water'); }
  const prev = _gdg.stages, now = new Map();
  for (const p of m.plants) now.set(p.uid, p.stage);
  _gdg.stages = now;
  if (prev) for (const p of m.plants) { const was = prev.get(p.uid); if (was != null && p.stage > was && p.def.special !== 'heart') { gardenPop(p.x, p.y, p.fp, p.fp, 'is-grow'); gardenFloat(p.ripe ? 'Ready!' : 'Grew!', p.x, p.y, p.fp, p.fp, 'is-grow'); } }
  // visitors drifting in
  const ids = new Set(m.visitors.map(v => v.id)), pv = _gdg.visitors; _gdg.visitors = ids;
  if (pv && gardenFun() !== 'off') for (const v of m.visitors) if (!pv.has(v.id)) _gdgNote(`${/^[aeiou]/i.test(v.def.name) ? 'An' : 'A'} ${v.def.name.toLowerCase()} visited!`, gardenIconSvg(v.id, { kind: 'visitor', px: 28 }));
}
function _gdgNote(text, svg) {
  const box = _gdgBox(); if (!box) return;
  let host = box.querySelector('.gd-notes');
  if (!host) { host = document.createElement('div'); host.className = 'gd-notes'; host.setAttribute('role', 'status'); box.appendChild(host); }
  const n = document.createElement('div'); n.className = 'gd-note'; n.innerHTML = (svg || '') + '<span></span>'; n.querySelector('span').textContent = text;
  host.appendChild(n);
  setTimeout(() => n.remove(), 5200);
}
function gardenLevelUpCard(d) {
  if (gardenFun() === 'off' || !_gdp.root) return;
  let c = _gdp.root.querySelector('.gd-levelup');
  if (d.kind === 'level') {
    if (c) c.remove();
    c = document.createElement('div'); c.className = 'gd-levelup'; c.setAttribute('role', 'status');
    c.innerHTML = `<div class="gd-lu-ic">${icon('sparkles')}</div><b></b><p></p><ul></ul><button type="button" class="btn btn-primary btn-sm">Lovely</button>`;
    c.querySelector('b').textContent = `Garden level ${d.level}`;
    c.querySelector('p').textContent = d.text.replace(/^Garden level \d+:\s*/, '');
    c.querySelector('button').onclick = () => c.remove();
    _gdp.root.appendChild(c);
    setTimeout(() => { if (c.parentNode) c.remove(); }, 9000);
  } else if (c && d.kind === 'area') {
    const li = document.createElement('li'); li.textContent = d.text; c.querySelector('ul').appendChild(li);
  }
}

/* ---------- hover card with a growth ring ---------- */
function gardenHoverCard(ev, m, uid) {
  const box = _gdgBox(); if (!box) return;
  let c = box.querySelector('.gd-hovercard');
  const p = uid ? gardenPlantById(m, uid) : null;
  if (!p || p.def.special === 'heart') { if (c) c.hidden = true; return; }
  if (!c) { c = document.createElement('div'); c.className = 'gd-hovercard'; c.setAttribute('aria-hidden', 'true'); box.appendChild(c); }
  const def = p.def, st = p.stage;
  const a = gardenHoursFor(def, st), b = st >= 4 ? a : gardenHoursFor(def, st + 1);
  const pct = st >= 4 ? 100 : Math.max(0, Math.min(100, Math.round(100 * (p.hours - a) / Math.max(1, b - a))));
  const key = [uid, st, pct, p.thirsty ? 1 : 0, p.ripe ? 1 : 0].join('|');
  if (c.dataset.k !== key) {
    c.dataset.k = key;
    c.innerHTML = `<span class="gd-ringp" style="--p:${pct}"><b>${st >= 4 ? icon('check') : pct + '%'}</b></span><span class="gd-hc-t"><b></b><small></small></span>`;
    c.querySelector('.gd-hc-t b').textContent = def.name;
    c.querySelector('small').textContent = (p.ripe ? 'Ready to pick' : gardenStageName(def, st)) + (p.thirsty ? ' · thirsty' : '');
  }
  c.hidden = false;
  const r = box.getBoundingClientRect();
  c.style.left = Math.min(r.width - 190, Math.max(6, ev.clientX - r.left + 14)) + 'px';
  c.style.top = Math.max(6, ev.clientY - r.top - 54) + 'px';
}
function gardenHoverCardHide() { const box = _gdgBox(), c = box && box.querySelector('.gd-hovercard'); if (c) c.hidden = true; }

/* ---------- what to do next ---------- */
function _gdgFreeSpot(m, def) {
  for (const [x, y] of [[9, 6], [10, 6], [11, 6], [9, 5], [10, 5], [11, 5], [8, 6], [12, 6], [8, 5], [12, 5], [10, 7], [9, 7], [11, 7], [13, 6], [7, 6], [8, 7], [12, 7], [13, 7], [13, 5], [7, 7]]) {
    if (m.occ.has(x + ',' + y)) continue;
    if (!_gdPlaceOk(m, def, x, y, 'plant')) return { x, y };
  }
  for (let y = 0; y < GARDEN_WORLD.rows; y++) for (let x = 0; x < GARDEN_WORLD.cols; x++) { if (m.occ.has(x + ',' + y)) continue; if (!_gdPlaceOk(m, def, x, y, 'plant')) return { x, y }; }
  return null;
}
function gardenNextStep(m) {
  const seeds = _gdpSeedList(), w = m.wallet, wi = m.water;
  const go = (label, run) => ({ label, run });
  // 1. something is ready
  const ripe = m.plants.find(p => p.ripe && p.def.yield);
  if (ripe) return { icon: 'shopping-basket', title: m.ripe > 1 ? `${m.ripe} things are ready to pick` : `Your ${ripe.def.name.toLowerCase()} is ready`, text: 'Click it with the Harvest tool and it flies into your basket.', target: { x: ripe.x, y: ripe.y, w: ripe.fp, h: ripe.fp }, btn: go(m.ripe > 1 ? 'Harvest all' : 'Pick it', () => _gdpAct(m.ripe > 1 ? gardenHarvestAll() : gardenHarvest(ripe.uid))), key: 'ripe' + ripe.uid };
  // 2. an empty garden
  const nPlants = m.plants.filter(p => p.def.special !== 'heart').length;
  if (!seeds.length && !nPlants) {
    const cheap = GARDEN_PLANTS.filter(p => p.price > 0 && !p.unlock && p.lv <= 1).sort((a, b) => a.price - b.price)[0];
    return { icon: 'store', title: 'Your plot is empty', text: `Seeds start at ${cheap ? cheap.price : 6} coins in the shop. Coins come from time spent on tasks.`, target: null, btn: go('Open the shop', () => setView('garden:shop')), key: 'empty' };
  }
  // 3. thirsty
  const dry = m.plants.filter(p => p.thirsty && p.def.thirst && p.def.special !== 'heart');
  if (dry.length && wi.left > 0 && !m.rain.now) { const p = dry[0]; return { icon: 'droplet', title: dry.length > 1 ? `${dry.length} plants are thirsty` : `Your ${p.def.name.toLowerCase()} is thirsty`, text: 'Thirsty plants droop and grow slowly. They never die. Pick Water and click them.', target: { x: p.x, y: p.y, w: p.fp, h: p.fp }, btn: go(dry.length > 1 ? 'Water them all' : 'Water it', () => _gdpAct(dry.length > 1 ? gardenWaterAll() : gardenWater(p.uid))), key: 'dry' + p.uid }; }
  // 4. a seed to plant
  if (seeds.length && nPlants < 4) {
    const s = seeds[0], spot = _gdgFreeSpot(m, s.def);
    if (spot) return { icon: 'sprout', title: nPlants ? 'Plant another seed' : 'Plant your first seed', text: `You have ${s.n} ${s.def.name.toLowerCase()} seed${s.n === 1 ? '' : 's'}. Pick Plant, pick the seed below, click a free tile.`, target: { x: spot.x, y: spot.y, w: 1, h: 1 }, btn: go('Plant it here', () => { _gdp.seed = s.id; const r = gardenPlantAt(s.id, spot.x, spot.y); _gdpAct(r); _gdpPickTool('seed'); }), key: 'plant' + s.id };
  }
  // 5. money to spend
  const buy = GARDEN_PLANTS.filter(p => p.price > 0 && !p.unlock && p.lv <= m.level.level && !_gdG().disc[p.id] && p.price <= w.coins).sort((a, b) => a.price - b.price)[0];
  if (buy) return { icon: 'store', title: `You have ${_gdpNum(w.coins)} coins`, text: `The shop has a ${buy.name.toLowerCase()} seed for ${buy.price}: a plant you have not grown yet.`, target: null, btn: go('See the shop', () => setView('garden:shop')), key: 'buy' + buy.id };
  // 6. a seed to plant, any time
  if (seeds.length) { const s = seeds[0], spot = _gdgFreeSpot(m, s.def); if (spot) return { icon: 'sprout', title: 'Seeds in your bag', text: `${s.n} ${s.def.name.toLowerCase()} seed${s.n === 1 ? '' : 's'} waiting. A fuller garden brings more visitors.`, target: { x: spot.x, y: spot.y, w: 1, h: 1 }, btn: go('Plant it here', () => { _gdp.seed = s.id; _gdpAct(gardenPlantAt(s.id, spot.x, spot.y)); _gdpPickTool('seed'); }), key: 'plant2' + s.id }; }
  // 7. a daily goal
  const goal = gardenDailyTasks(m).find(t => !t.done);
  if (goal) return { icon: goal.def.icon || 'target', title: 'Today’s goal: ' + goal.label, text: `${Math.min(goal.have, goal.n)} of ${goal.n} done. It pays ${gardenDailyCoins(goal.def)} coins.`, target: null, btn: null, key: 'goal' + goal.id };
  // 8. earn
  const tid = typeof gameFocusNextTask === 'function' ? gameFocusNextTask() : null;
  return { icon: 'timer', title: 'Earn coins by working', text: 'Focus on a task with the timer: about 12 coins an hour, plus a bonus when you finish it.', target: null, btn: tid && typeof gameFocusStart === 'function' ? go('Start a focus timer', () => { gameFocusStart(tid); toast('Focus timer started. Coins arrive as the minutes add up.', { icon: 'timer' }); }) : go('Open my tasks', () => setView('list')), key: 'earn' };
}
function gardenNextCard(m) {
  const n = gardenNextStep(m), c = _gdpEl('section', 'gd-next card');
  c.innerHTML = `<div class="gd-next-h"><span class="gd-next-ic">${icon(n.icon)}</span><span class="overline">What to do next</span></div><h3></h3><p class="muted"></p>`;
  c.querySelector('h3').textContent = n.title; c.querySelector('p').textContent = n.text;
  if (n.btn) c.appendChild(_gdpBtn(n.btn.label, { kind: 'btn-primary', run: n.btn.run }));
  _gdg.next = n;
  return c;
}
/** The pulsing ring on whatever the next step points at. */
function gardenNextRing() {
  const box = _gdgBox(); if (!box) return;
  const ov = _gdgOv(); if (!ov) return;
  ov.querySelectorAll('.gd-hint').forEach(x => x.remove());
  const n = _gdg.next; if (!n || !n.target || _gdg.tour >= 0) return;
  const r = _gdgRectPx(n.target.x, n.target.y, n.target.w, n.target.h); if (!r) return;
  _gdgNode('gd-hint', '<i></i>', { l: r.l - 3, t: r.t - 3, w: r.w + 6, h: r.h + 6 });
}

/* ---------- today's income ---------- */
function gardenEconCard(m) {
  const w = m.wallet, e = w.econToday, g = _gdG();
  const c = _gdpEl('section', 'gd-econ card');
  const pct = Math.min(100, Math.round(100 * e.coins / e.cap));
  c.innerHTML = `<div class="gd-econ-h"><b>Coins today</b><span class="num"></span></div><div class="gd-capbar" role="progressbar" aria-valuemin="0" aria-valuemax="${e.cap}" aria-valuenow="${e.coins}"><i style="width:${pct}%"></i></div><p class="gd-econ-line"></p>`;
  c.querySelector('.num').textContent = `${e.coins} / ${e.cap}`;
  c.querySelector('.gd-econ-line').textContent = gardenEconLine(e);
  const rows = e.log.slice();
  for (const id of Object.keys(g.dt[m.today] || {})) { const def = GARDEN_DAILY.find(x => x.id === id); if (def) rows.push({ why: 'Garden goal: ' + def.label.replace('{n}', def.n), c: gardenDailyCoins(def, m.today) }); }
  let sold = 0, soldN = 0; for (const x of Object.values(g.led)) if (x && x.k === 's' && x.d === m.today) { sold += Number(x.c) || 0; soldN += Number(x.n) || 0; }
  if (sold) rows.push({ why: `Sold ${soldN} thing${soldN === 1 ? '' : 's'} at the market`, c: sold });
  const det = document.createElement('details'); det.className = 'gd-econ-log';
  det.innerHTML = '<summary>Where today’s coins came from</summary>';
  const ul = _gdpEl('ul');
  if (!rows.length) ul.appendChild(_gdpEl('li', 'muted', 'Nothing yet today. Start a focus timer on a task: 12 coins an hour.'));
  for (const r of rows) { const li = _gdpEl('li'); li.appendChild(_gdpEl('span', null, r.why)); li.appendChild(_gdpEl('b', r.c < 0 ? 'neg' : '', (r.c > 0 ? '+' : '') + r.c)); ul.appendChild(li); }
  det.appendChild(ul);
  det.appendChild(_gdpEl('p', 'muted gd-econ-how', 'Rules: 1 coin per 5 focused minutes (first 2 hours a day, half after, none past 4), a bonus for the time a finished task took, sessions under 5 minutes and quick or empty tasks pay nothing, each task pays once.'));
  det.open = !!_gdp.econOpen;
  det.addEventListener('toggle', () => { _gdp.econOpen = det.open; });
  c.appendChild(det);
  const tid = typeof gameFocusNextTask === 'function' ? gameFocusNextTask() : null;
  if (tid && typeof gameFocusStart === 'function' && typeof gameFocusRun === 'function' && !gameFocusRun()) c.appendChild(_gdpBtn('Start a focus timer', { icon: 'timer', run: () => { gameFocusStart(tid); toast('Focus timer started. Coins arrive as the minutes add up.', { icon: 'timer' }); } }));
  return c;
}

/* ---------- the tour (first run; replay from the ? button) ---------- */
const GARDEN_TOUR = Object.freeze([
  { id: 'plot', title: 'This is your plot', text: 'Every square is a tile. Plants go on free tiles, paths and seats go anywhere. Hover over a tile to see what your tool would do there.', target: '.gd-stagebox' },
  { id: 'plant', title: 'Plant your first seed', text: 'We gave you a free seed. Pick Plant, pick the seed in the tray under the garden, then click a free tile. Or just drag the seed onto the garden.', target: '.gd-tool[data-tool="seed"]', wait: 'plant' },
  { id: 'water', title: 'Give it a drink', text: 'Pick Water and click a plant, or drag across a row. Thirsty plants droop and grow slowly (they never die). Rain waters everything for you.', target: '.gd-tool[data-tool="water"]' },
  { id: 'grow', title: 'Watch it grow', text: 'Plants grow with real time: seed, sprout, young, bud, bloom. Hover over a plant for a progress ring. Working on your tasks speeds them up a little.', target: '.gd-stagebox' },
  { id: 'earn', title: 'Earn coins by working', text: 'Coins come from time: about 12 an hour while the focus timer runs on a task, plus a bonus when you finish it. This box shows today’s coins and why.', target: '.gd-econ, .gd-chip.is-coins' },
  { id: 'shop', title: 'Spend them in the shop', text: 'The shop sells seeds, decorations and tools. Fancier things cost more and open as your garden levels up. The ? button explains everything again.', target: '[data-act="shop"]' },
]);
function gardenTourStart(force) {
  const g = _gdG();
  if (!force && g.seen.tour) return;
  _gdg.tour = 0;
  // the free seed (once), unless you already have some
  if (!g.seen.tourSeed && _gdpSeedList().length === 0) {
    g.seen.tourSeed = _gdToday();
    _gdLed('onb', { c: 0, i: { 'seed:daisy': 1 }, n: 0 });
    _gdSave();
  }
  gardenTourPaint();
}
function gardenTourEnd(done) {
  _gdg.tour = -1;
  const g = _gdG(); if (!g.seen.tour) { g.seen.tour = _gdToday(); _gdSave(); }
  if (_gdp.root) { _gdp.root.querySelectorAll('.gd-tour').forEach(x => x.remove()); _gdp.root.querySelectorAll('.gd-spot').forEach(x => x.classList.remove('gd-spot')); }
  if (done) toast('That is the tour. The ? button explains everything again.', { icon: 'sprout', timeout: 3500 });
  try { _gdpPaintSide(gardenModel()); } catch (e) { /* page gone */ }
}
function gardenTourEvent(kind) {
  if (_gdg.tour < 0) return;
  const s = GARDEN_TOUR[_gdg.tour];
  if (s && s.wait === kind) setTimeout(() => gardenTourNext(), 700);
}
function gardenTourNext() {
  if (_gdg.tour < 0) return;
  if (_gdg.tour >= GARDEN_TOUR.length - 1) { gardenTourEnd(true); return; }
  _gdg.tour++;
  gardenTourPaint();
}
function gardenTourPaint() {
  const root = _gdp.root; if (!root || _gdg.tour < 0) return;
  const s = GARDEN_TOUR[_gdg.tour];
  root.querySelectorAll('.gd-spot').forEach(x => x.classList.remove('gd-spot'));
  for (const el of root.querySelectorAll(s.target)) el.classList.add('gd-spot');
  let c = root.querySelector('.gd-tour');
  if (!c) { c = document.createElement('div'); c.className = 'gd-tour card'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-label', 'Garden tour'); root.appendChild(c); }
  c.innerHTML = '<div class="gd-tour-n"></div><h3></h3><p></p><div class="gd-tour-a"></div>';
  c.querySelector('.gd-tour-n').textContent = `Step ${_gdg.tour + 1} of ${GARDEN_TOUR.length}`;
  c.querySelector('h3').textContent = s.title; c.querySelector('p').textContent = s.text;
  const a = c.querySelector('.gd-tour-a');
  a.appendChild(_gdpBtn('Skip tour', { kind: 'btn-ghost', run: () => gardenTourEnd(false) }));
  const last = _gdg.tour >= GARDEN_TOUR.length - 1;
  a.appendChild(_gdpBtn(last ? 'Start gardening' : s.wait ? 'I’ll do it later' : 'Next', { kind: s.wait ? 'btn-secondary' : 'btn-primary', run: () => gardenTourNext() }));
  gardenNextRing();
}
/** Keep the tour's highlight on after the toolbar or HUD is rebuilt. */
function gardenTourReapply() { if (_gdg.tour >= 0 && _gdp.root) { const s = GARDEN_TOUR[_gdg.tour]; for (const el of _gdp.root.querySelectorAll(s.target)) el.classList.add('gd-spot'); } }

/* ---------- the guide ---------- */
function gardenGuideOpen() {
  const root = _gdp.root; if (!root) return;
  if (root.querySelector('.gd-guide')) { root.querySelector('.gd-guide').remove(); return; }
  const E = GARDEN_ECON;
  const sec = (ic, title, html) => `<section class="gd-gsec"><h3>${icon(ic)}<span>${esc(title)}</span></h3>${html}</section>`;
  const g = document.createElement('div'); g.className = 'gd-guide'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-label', 'Garden guide');
  g.innerHTML = `<div class="gd-guide-card card"><div class="gd-guide-h"><h2>Garden guide</h2><span class="gd-guide-b"></span></div><div class="gd-guide-body">`
    + sec('sprout', 'How plants grow', `<p>Plant a seed on a free tile. It grows through five stages (seed, sprout, young, bud, bloom) as real time passes: quick flowers take hours, trees take weeks. In season a plant grows faster, out of season a little slower. Finishing tasks and focusing nudge growth along.</p><p>A thirsty plant droops and grows at half speed. It <b>never dies</b> and never loses what it has grown.</p>`)
    + sec('coins', 'What makes coins', `<p>Coins come from <b>time spent working</b>, not from clicking:</p><ul><li><b>Focus timer</b>: 1 coin per 5 focused minutes for the first 2 hours of the day, half after that, nothing past 4 hours. Sessions under ${E.minSessionMin} minutes do not count.</li><li><b>Finishing a task</b>: a bonus for the time it took (1 coin per ${E.bonusMinPerCoin} minutes logged, up to ${E.bonusEach}). With no timer, half of the estimate counts, up to ${E.noLogCapMin} minutes. A big estimate does not help: it counts up to 1.5 times the time you logged.</li><li>Tasks done within 5 minutes of being created, empty ones and re-closed ones pay nothing. Each task pays once.</li><li>A small streak bonus (up to ${E.streakMax}) and a hard cap of <b>${E.dayCap} coins a day</b>.</li><li>Garden goals pay a few coins, weekly quests pay more, and the market buys what you grow.</li></ul>`)
    + sec('droplet', 'Water and seeds', `<p>Your can holds 10 waterings a day plus more for each task and half hour of focus you put in. Free seed packets arrive for every ${E.packetEveryMin} minutes of work (two a day at most). Seeds, decorations and tools are sold in the shop; prices are higher for rarer things and unlock as your garden levels up.</p>`)
    + sec('hand', 'The tools', `<ul><li><b>Plant</b>: pick a seed in the tray, click a free tile (or drag the seed in).</li><li><b>Water</b>: click a thirsty plant, or drag across a row.</li><li><b>Harvest</b>: click a ripe plant, and anything else to read about it.</li><li><b>Fertilise</b>: half a day of growth (one a day each).</li><li><b>Trim</b>: tidy a wild plant; sometimes you get a cutting.</li><li><b>Dig up</b>: lift a plant (Undo puts it back).</li><li><b>Decorate</b>: place benches, paths and lanterns; drag to move, R turns, S restyles.</li></ul><p>Keys: 1 to 7 pick tools, W waters all, H harvests all, arrows move a tile cursor, Enter uses the tool, Esc clears, Ctrl+Z undoes.</p>`)
    + sec('bird', 'What visitors want', `<p>Bees and butterflies come for flowers, robins for a bird bath, frogs for a pond, hedgehogs and owls at dusk. Fuller, more varied gardens bring rarer visitors; each new one goes in the Almanac.</p>`)
    + sec('trophy', 'Levels, goals and surprises', `<p>Planting, harvesting and discovering earn garden XP. Each level can open a new area (veg patch, orchard, pond, greenhouse, meadow). Daily goals and weekly quests give coins and seeds. Now and then a harvest is golden (double) or a rare seed drops out.</p>`)
    + `</div></div>`;
  const b = g.querySelector('.gd-guide-b');
  b.appendChild(_gdpBtn('Replay the tour', { icon: 'sprout', run: () => { g.remove(); gardenTourStart(true); } }));
  b.appendChild(_gdpBtn('', { icon: 'x', aria: 'Close the guide', kind: 'btn-ghost', run: () => g.remove() }));
  g.addEventListener('click', (ev) => { if (ev.target === g) g.remove(); });
  g.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); g.remove(); } });
  root.appendChild(g);
  const first = g.querySelector('button'); if (first) first.focus({ preventScroll: true });
}

/* ---------- start and stop ---------- */
function gardenGameStart(root, m) {
  _gdg.stages = null; _gdg.visitors = null; _gdg.wlSeen = null; _gdg.next = null;
  if (!_gdg.bound) { _gdg.bound = true; document.addEventListener('opendash:garden', _gdgOnEvent); }
  const box = _gdgBox();
  if (box && typeof ResizeObserver !== 'undefined') {
    if (_gdg.ro) _gdg.ro.disconnect();
    _gdg.ro = new ResizeObserver(() => { if (_gdg.rq) return; _gdg.rq = requestAnimationFrame(() => { _gdg.rq = 0; gardenNextRing(); }); });
    _gdg.ro.observe(box);
  }
  _gdgWatered(m);
  if (!_gdG().seen.tour) setTimeout(() => { if (_gdp.root === root && root.isConnected) gardenTourStart(false); }, 500);
  else _gdg.tour = -1;
}
function gardenGameStop() { if (_gdg.ro) { _gdg.ro.disconnect(); _gdg.ro = null; } _gdg.tour = -1; }
