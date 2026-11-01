/* ============================================================
   GARDEN, the game layer (2.18.1): everything that makes the full-screen garden clear and alive.
     - "What to do next": one suggested step (gardenNextStep): an arrow in the world (94-garden-world-2hud.js), a line in the Goals panel
     - the income panel ("Today: 42 coins from 1h40 focused (cap 120)") and its small log
     - the Garden guide (Help)
     - feedback: floating "+2 XP", splashes, dark soil, harvest arcs into the basket, growth pops,
       visitor notes, the level-up card
     - the hover card with a growth ring
   Draws into the page built by 94-garden-4page.js (_gdp). Reduced motion and the Fun level are respected
   (gardenMotionOn): without motion nothing flies, the toasts still say what happened.
   ============================================================ */
const _gdg = { bound: false, stages: null, visitors: null, wlSeen: null, noteT: 0, nextKey: '' };

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
  const tgt = _gdp.root.querySelector('.gd-mbtn[data-menu="basket"]');
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
function _gdgPlantsNow() { try { return gardenHere().plants; } catch (e) { return []; } }
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
    } else if (d.kind === 'feed') { gardenFloat('+half a day', d.x, d.y, d.fp || 1, d.fp || 1, 'is-feed'); gardenPop(d.x, d.y, d.fp || 1, d.fp || 1, 'is-feed'); }
    else if (d.kind === 'prune') { gardenFloat('Tidy', d.x, d.y, d.fp || 1, d.fp || 1); }
    else if (d.kind === 'harvest') {
      if (d.cells) d.cells.forEach((c, i) => { _gdgFly(c[3], c[0], c[1], c[2], c[2], i * 90); gardenPop(c[0], c[1], c[2], c[2], 'is-harvest'); });
      else if (d.x != null) { for (let i = 0; i < Math.min(3, d.n || 1); i++) _gdgFly(d.id, d.x, d.y, d.fp || 1, d.fp || 1, i * 110); gardenFloat((d.gold ? 'Golden! +' : '+') + d.n, d.x, d.y, d.fp || 1, d.fp || 1, d.gold ? 'is-gold' : 'is-xp'); gardenPop(d.x, d.y, d.fp || 1, d.fp || 1, d.gold ? 'is-gold' : 'is-harvest'); }
    } else if (d.kind === 'level') gardenLevelUpCard(d);
    else if (d.kind === 'area') gardenLevelUpCard(d);
    else if (d.kind === 'land') { gardenPop(d.x + d.w / 2 - 1, d.y + d.h / 2 - 1, 2, 2, 'is-gold'); if (typeof _gw !== 'undefined') _gw.reach = null; }
  } catch (e) { console.error('[garden fx]', e); }
}
/** After every paint of the stage: new waterings, stages that grew, new visitors. */
function gardenGamePainted(m) {
  if (!gardenMotionOn() && gardenFun() === 'off') { _gdg.stages = null; return; }
  for (const p of _gdgWatered(m)) { _gdpSplash(p); _gdgSoil(p.x, p.y, p.fp, p.fp); gardenFloat('+1', p.x, p.y, p.fp, p.fp, 'is-water'); }
  const prev = _gdg.stages, now = new Map();
  for (const p of m.plants) now.set(p.uid, p.stage);
  _gdg.stages = now;
  if (prev) for (const p of m.plants) { const was = prev.get(p.uid); if (was != null && p.stage > was && p.def.special !== 'heart') { gardenPop(p.x, p.y, p.fp, p.fp, 'is-grow'); void 0; } }
  // visitors drifting in
  const ids = new Set(m.visitors.map(v => v.id)), pv = _gdg.visitors; _gdg.visitors = ids;
  // (one you have never met gets its "New visitor" moment instead of this as well)
  if (pv && gardenFun() !== 'off') for (const v of m.visitors) if (!pv.has(v.id) && _gdG().disc[v.id] && !(typeof gardenLifeOwns === 'function' && gardenLifeOwns(v.id))) { const nm = v.def.name; _gdgNote(/[’']s /.test(nm) ? `${nm} visited!` : `${/^[aeiou]/i.test(nm) ? 'An' : 'A'} ${nm.toLowerCase()} visited!`, gardenIconSvg(v.id, { kind: 'visitor', px: 28 })); }
}
function _gdgNote(text, svg) {
  const box = _gdgBox(); if (!box) return;
  let host = box.querySelector('.gd-notes');
  if (!host) { host = document.createElement('div'); host.className = 'gd-notes'; host.setAttribute('role', 'status'); box.appendChild(host); }
  for (const o of host.children) if (o.textContent === text) return;   // clicking the same thing again does not stack the same note
  while (host.children.length >= 3) host.firstChild.remove();
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
  const pct = st >= 4 ? 100 : m.visit ? st * 25 : Math.max(0, Math.min(100, Math.round(100 * (p.hours - a) / Math.max(1, b - a))));
  const key = [uid, st, pct, p.thirsty ? 1 : 0, p.ripe ? 1 : 0].join('|');
  if (c.dataset.k !== key) {
    c.dataset.k = key;
    c.innerHTML = `<span class="gd-ringp" style="--p:${pct}"><b>${st >= 4 ? icon('check') : pct + '%'}</b></span><span class="gd-hc-t"><b></b><small></small></span>`;
    c.querySelector('.gd-hc-t b').textContent = def.name;
    c.querySelector('small').textContent = (p.ripe ? 'Ready to pick' : gardenStageName(def, st)) + (p.thirsty ? ' · thirsty' : '') + (p.by ? ' · ' + _gllByLine('p', p.by) : '');
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
  if (ripe) return { icon: 'shopping-basket', title: m.ripe > 1 ? `${m.ripe} things are ready to pick` : `Your ${ripe.def.name.toLowerCase()} is ready`, text: 'Click it: it flies into your basket.', target: { x: ripe.x, y: ripe.y, w: ripe.fp, h: ripe.fp }, btn: go(m.ripe > 1 ? 'Harvest all' : 'Pick it', () => _gdpAct(m.ripe > 1 ? gardenHarvestAll() : gardenHarvest(ripe.uid))), key: 'ripe' + ripe.uid };
  // 2. an empty garden
  const nPlants = m.plants.filter(p => p.def.special !== 'heart').length;
  if (!seeds.length && !nPlants) {
    const cheap = GARDEN_PLANTS.filter(p => p.price > 0 && !p.unlock && p.lv <= 1).sort((a, b) => a.price - b.price)[0];
    return { icon: 'store', title: 'Your plot is empty', text: `Seeds start at ${cheap ? cheap.price : 6} coins in the shop. Coins come from time spent on tasks.`, target: null, btn: go('Walk to the shop', () => gardenGoToAct('shop')), key: 'empty' };
  }
  // 3. thirsty
  const dry = m.plants.filter(p => p.thirsty && p.def.thirst && p.def.special !== 'heart');
  if (dry.length && wi.left > 0 && !m.rain.now) { const p = dry[0]; return { icon: 'droplet', title: dry.length > 1 ? `${dry.length} plants are thirsty` : `Your ${p.def.name.toLowerCase()} is thirsty`, text: 'Click them: they never die, they just wait.', target: { x: p.x, y: p.y, w: p.fp, h: p.fp }, btn: go(dry.length > 1 ? 'Water them all' : 'Water it', () => _gdpAct(dry.length > 1 ? gardenWaterAll() : gardenWater(p.uid))), key: 'dry' + p.uid }; }
  // 4. a seed to plant
  if (seeds.length && nPlants < 4) {
    const s = seeds[0], spot = _gdgFreeSpot(m, s.def);
    if (spot) return { icon: 'sprout', title: nPlants ? 'Plant another seed' : 'Plant your first seed', text: `Click the soil and pick the ${s.def.name.toLowerCase()} seed.`, target: { x: spot.x, y: spot.y, w: 1, h: 1 }, btn: go('Plant it here', () => { _gdp.seed = s.id; const r = gardenPlantAt(s.id, spot.x, spot.y); _gdpAct(r); _gdpPickTool('seed'); }), key: 'plant' + s.id };
  }
  // 5. money to spend
  const buy = GARDEN_PLANTS.filter(p => p.price > 0 && !p.unlock && p.lv <= m.level.level && !_gdG().disc[p.id] && p.price <= w.coins).sort((a, b) => a.price - b.price)[0];
  if (buy) return { icon: 'store', title: `You have ${_gdpNum(w.coins)} coins`, text: `The shop has a ${buy.name.toLowerCase()} seed for ${buy.price}: a plant you have not grown yet.`, target: null, btn: go('Walk to the shop', () => gardenGoToAct('shop')), key: 'buy' + buy.id };
  // 6. a seed to plant, any time
  if (seeds.length) { const s = seeds[0], spot = _gdgFreeSpot(m, s.def); if (spot) return { icon: 'sprout', title: 'Seeds in your bag', text: `${s.n} ${s.def.name.toLowerCase()} seed${s.n === 1 ? '' : 's'} waiting. A fuller garden brings more visitors.`, target: { x: spot.x, y: spot.y, w: 1, h: 1 }, btn: go('Plant it here', () => { _gdp.seed = s.id; _gdpAct(gardenPlantAt(s.id, spot.x, spot.y)); _gdpPickTool('seed'); }), key: 'plant2' + s.id }; }
  // 7. a daily goal
  const goal = gardenDailyTasks(m).find(t => !t.done);
  if (goal) return { icon: goal.def.icon || 'target', title: 'Today’s goal: ' + goal.label, text: `${Math.min(goal.have, goal.n)} of ${goal.n} done. It pays ${gardenDailyCoins(goal.def)} coins.`, target: null, btn: null, key: 'goal' + goal.id };
  // 8. earn
  const tid = typeof gameFocusNextTask === 'function' ? gameFocusNextTask() : null;
  return { icon: 'timer', title: 'Earn coins by working', text: 'Focus on a task with the timer: about 12 coins an hour, plus a bonus when you finish it.', target: null, btn: tid && typeof gameFocusStart === 'function' ? go('Start a focus timer', () => { gameFocusStart(tid); toast('Focus timer started. Coins arrive as the minutes add up.', { icon: 'timer' }); }) : go('Open my tasks', () => setView('list')), key: 'earn' };
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

/* ---------- first run: no tour (2.23): a bouncing arrow does it (94-garden-world-2hud.js). The free seed is still there. ---------- */
function _gdgFirstSeed() {
  const g = _gdG();
  if (g.seen.tourSeed || _gdpSeedList().length || gardenModel().plants.some(p => p.def.special !== 'heart')) return;
  g.seen.tourSeed = _gdToday();
  _gdLed('onb', { c: 0, i: { 'seed:daisy': 1 }, n: 0 });
  _gdSave();
}
/** The goals panel: the next step as one line with one button, today's goals, the week's quests, where today's coins came from. */
function gardenGoalsPanel(el, m) {
  const n = gardenNextStep(m), row = _gdpEl('div', 'gd-goal-next');
  row.innerHTML = `<span class="gd-next-ic">${icon(n.icon)}</span>`;
  row.appendChild(_gdpEl('b', null, n.title));
  if (n.btn) row.appendChild(_gdpBtn(n.btn.label, { kind: 'btn-primary', run: () => { gardenPopupClose(); n.btn.run(); } }));
  el.appendChild(row);
  const goals = _gdpEl('section', 'gd-goals'); _gdpToday(goals, m); el.appendChild(goals);
  el.appendChild(gardenEconCard(m));
}

/* ---------- the guide ---------- */
function gardenGuideOpen() {
  const root = _gdp.root; if (!root) return;
  if (root.querySelector('.gd-guide')) { root.querySelector('.gd-guide').remove(); return; }
  const E = GARDEN_ECON;
  const sec = (ic, title, html) => `<section class="gd-gsec"><h3>${icon(ic)}<span>${esc(title)}</span></h3>${html}</section>`;
  const g = document.createElement('div'); g.className = 'gd-guide'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-label', 'Garden guide');
  g.innerHTML = `<div class="gd-guide-card card"><div class="gd-guide-h"><h2>How it works</h2><span class="gd-guide-b"></span></div><div class="gd-guide-body">`
    + sec('footprints', 'Walking', `<p>Click or tap a spot and you walk there. W A S D and the arrow keys work too. Wheel or pinch to zoom.</p>`)
    + sec('hand', 'Doing things', `<p>Click what you want and you walk over and do it: a ripe plant is picked, a thirsty one watered, an empty bed offers its seeds. Right-click (or click a happy plant) for everything else. A red X means it can't be done there.</p>`)
    + sec('coins', 'Coins come from your work', `<ul><li>1 coin per 5 focused minutes for the first 2 hours of the day, half after that, none past 4 hours (sessions under ${E.minSessionMin} minutes do not count).</li><li>A bonus when you finish a task, for the time it took. Each task pays once.</li><li>At most <b>${E.dayCap} coins a day</b> from work. Garden goals, quests and the market pay extra.</li></ul>`)
    + sec('sprout', 'Plants', `<p>They grow with real time, faster in season. Thirsty ones droop and grow slowly. They <b>never die</b>.</p>`)
    + sec('trees', 'More land', `<p>Follow the lane east along the shore. Each sign is a piece of land you can buy with coins.</p>`)
    + sec('fish', 'Fishing and bugs', `<p>You can see the fish: they are the shadows in the water. Click near one to cast. It may swim over and nibble. Wait for the big splash, then click straight away and it is yours. Click too soon and it bolts. Further out the fish are bigger, so a longer rod reaches better ones, and better bait draws them from further away. Fish are a pleasant surprise, so there are only a few at a time. Each one can only be caught once. Click a bug to creep up and net it.</p>`)
    + `</div></div>`;
  const b = g.querySelector('.gd-guide-b');
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
  _gdgWatered(m);
  if (!m.visit) setTimeout(() => { if (_gdp.root === root && root.isConnected) _gdgFirstSeed(); }, 500);
  void root;
}
function gardenGameStop() { }
