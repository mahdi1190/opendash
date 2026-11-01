/* ============================================================
   GARDEN, CRAFTING: the bench's panel, the making, the bottle on the shore (2.23, agent 'craft').
   Everything you can make now is bright and first; what you lack is greyed, ingredient by ingredient; what you have not learnt is an outline. A blocked craft says nothing: it shakes, with the missing ingredient flashing (gameDeny).
     gardenCraftTab(el, m)     the panel (a row of _GDPOP in 94-garden-world-1popup.js)
     gardenCraftWearToggle(r)  put it on, or take it off
   ============================================================ */
const _gcr = { sel: '', group: '', busy: false, bottle: null, checkT: 0, last: 0 };
function _gcrEl(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
function _gcrMotion() { return typeof gardenMotionOn === 'function' ? gardenMotionOn() : !(window.Motion && Motion.prefersReduced && Motion.prefersReduced()); }

/* ---------- wearing what you made ---------- */
function gardenCraftWorn(r) {
  const mk = r.make;
  try {
    if (mk.wear) return profileGet().avatar[mk.wear[0]] === mk.wear[1];
    if (mk.pet) { const g = petGet(); return !!g.look && g.look[petCraftField(mk.pet)] === mk.pet; }
  } catch (e) { /* not worn */ }
  return false;
}
function gardenCraftWearToggle(r) {
  const mk = r.make;
  if (mk.wear) {
    const a = profileGet().avatar, on = a[mk.wear[0]] === mk.wear[1], next = Object.assign({}, a, { [mk.wear[0]]: on ? 'none' : mk.wear[1] });
    profileSet({ avatar: next });
    try { if (typeof gardenWorldRedress === 'function') gardenWorldRedress(); } catch (e) { /* no walker */ }
    return !on;
  }
  if (mk.pet) {
    const g = petGet(); if (!g.look) return false;
    const f = petCraftField(mk.pet), on = g.look[f] === mk.pet, patch = { [f]: on ? '' : mk.pet };
    if (!on && f === 'itemHead') patch.hat = 'none';   // one thing on the head
    if (!on && f === 'itemNeck') { patch.bandana = 'none'; patch.collar = 'none'; }
    petSet({ look: patch });
    return !on;
  }
  return false;
}
function _gcrHowLine(r) {
  const L = r.learn || {};
  if (L.level) return { ic: 'sprout', text: 'Garden level ' + L.level };
  if (L.visitor) { const v = gardenVisitor(L.visitor); return { ic: 'bird', text: (v ? v.name : 'A visitor') + ' might bring it' }; }
  if (L.season) return { ic: 'leaf', text: 'A find, in ' + L.season };
  if (L.bottle) return { ic: 'waves', text: 'Washes up on the shore' };
  if (L.fact) { const words = { harvests: 'Pick {n} times', bouquets: 'Make {n} bouquets', netted: 'Net {n} bugs', planted: 'Plant {n} seeds', fished: 'Catch {n} fish', bugSpecies: 'Find {n} kinds of bug', plantsFound: 'Discover {n} plants', nightVisitors: 'Spot a night visitor', heartsReceived: 'A friend’s visit', clover: 'Find a four-leaf clover' }[L.fact[0]] || 'Keep gardening'; return { ic: 'target', text: words.replace('{n}', L.fact[1]) }; }
  return { ic: 'book-open', text: 'Keep gardening' };
}

/* ---------- the panel ---------- */
function gardenCraftTab(el, m) {
  if (!el.dataset.gcrInit) { el.dataset.gcrInit = '1'; el.classList.add('gcr-body'); }
  m = m || gardenModel();
  const all = gardenRecipes(m);
  if (!_gcr.sel || !all.some(r => r.id === _gcr.sel)) { const first = all.find(r => r.can) || all.find(r => r.known) || all[0]; _gcr.sel = first ? first.id : ''; }
  const wrap = _gcrEl('div', 'gcr');
  const left = _gcrEl('div', 'gcr-left'), right = _gcrEl('div', 'gcr-right');
  wrap.append(left, right);
  // the groups, as pictures; the count of what you can make now is the first thing you see
  const pills = _gcrEl('div', 'gcr-pills');
  const canN = all.filter(r => r.can).length;
  const pill = (id, label, ic, n) => { const b = _gcrEl('button', 'gcr-pill' + (_gcr.group === id ? ' is-on' : '')); b.type = 'button'; b.innerHTML = icon(ic, 'i-sm'); b.appendChild(_gcrEl('span', null, label)); if (n) b.appendChild(_gcrEl('b', null, String(n))); b.onclick = () => { _gcr.group = id; _gcrRepaint(el); }; return b; };
  pills.appendChild(pill('', 'All', 'layout-grid', canN));
  for (const [id, label, ic] of _GR_GROUPS) pills.appendChild(pill(id, label, ic, all.filter(r => r.can && r.def.group === id).length));
  left.appendChild(pills);
  const grid = _gcrEl('div', 'gcr-grid');
  const rows = all.filter(r => !_gcr.group || r.def.group === _gcr.group).sort((a, b) => (b.can - a.can) || (b.known - a.known) || (a.missing.length - b.missing.length));
  for (const r of rows) {
    const c = _gcrEl('button', 'gcr-card' + (r.can ? ' is-can' : r.known ? ' is-miss' : ' is-unknown') + (r.id === _gcr.sel ? ' is-sel' : '')); c.type = 'button';
    c.setAttribute('aria-label', r.known ? r.def.name : 'A recipe you have not found yet'); c.dataset.rid = r.id;
    const art = _gcrEl('span', 'gcr-card-art'); art.innerHTML = r.known ? gardenCraftArt(r.def, 62) : icon('circle-help'); c.appendChild(art);
    c.appendChild(_gcrEl('span', 'gcr-card-n', r.known ? r.def.name : '???'));
    if (r.known && !r.seen) c.appendChild(_gcrEl('i', 'gcr-new'));
    if (r.owned) c.appendChild(_gcrEl('b', 'gcr-own', String(r.owned)));
    c.onclick = () => { _gcr.sel = r.id; _gcrRepaint(el); };
    grid.appendChild(c);
  }
  left.appendChild(grid);
  const sel = all.find(r => r.id === _gcr.sel);
  if (sel) right.appendChild(_gcrDetail(sel, el));
  el.textContent = '';
  el.appendChild(wrap);
  try { gardenCraftSeen(); } catch (e) { /* later */ }
}
function _gcrRepaint(el) { const box = el && el.isConnected ? el : document.querySelector('.gcr-body'); if (!box) return; const y = box.scrollTop; const g = box.querySelector('.gcr-grid'), gy = g ? g.scrollTop : 0; gardenCraftTab(box, gardenModel()); box.scrollTop = y; const g2 = box.querySelector('.gcr-grid'); if (g2) g2.scrollTop = gy; }
function _gcrDetail(r, el) {
  const d = _gcrEl('div', 'gcr-detail');
  const bench = _gcrEl('div', 'gcr-bench'); bench.innerHTML = '<span class="gcr-rays" aria-hidden="true"></span>';
  const art = _gcrEl('span', 'gcr-big'); art.innerHTML = r.known ? gardenCraftArt(r.def, 110) : icon('circle-help'); bench.appendChild(art);
  const ham = _gcrEl('span', 'gcr-hammer'); ham.setAttribute('aria-hidden', 'true'); ham.innerHTML = '<svg viewBox="0 0 64 64" width="56" height="56"><rect x="28" y="20" width="9" height="40" rx="3" fill="#b08a58" stroke="#6a4426" stroke-width="2"/><rect x="14" y="6" width="36" height="20" rx="4" fill="#7a8a96" stroke="#3e4a54" stroke-width="2"/><rect x="18" y="9" width="20" height="4" rx="2" fill="#c8d4dc"/></svg>';
  bench.appendChild(ham);
  d.appendChild(bench);
  d.appendChild(_gcrEl('h3', 'gcr-name', r.known ? r.def.name : '???'));
  if (!r.known) {
    const h = _gcrHowLine(r.def), line = _gcrEl('p', 'gcr-how'); line.innerHTML = icon(h.ic, 'i-sm'); line.appendChild(_gcrEl('span', null, h.text)); d.appendChild(line);
    return d;
  }
  if (r.def.blurb) d.appendChild(_gcrEl('p', 'gcr-blurb', r.def.blurb));
  const list = _gcrEl('div', 'gcr-needs');
  for (const n of r.need) {
    const row = _gcrEl('div', 'gcr-need' + (n.have >= n.n ? ' is-ok' : ' is-no')); row.dataset.key = n.key;
    const a = _gcrEl('span', 'gcr-need-art'); a.innerHTML = gardenCraftIngredientArt(n.key, 34); row.appendChild(a);
    row.appendChild(_gcrEl('span', 'gcr-need-n', gardenCraftItemName(n.key)));
    row.appendChild(_gcrEl('b', 'gcr-need-c', `${n.have}/${n.n}`));
    row.setAttribute('aria-label', `${gardenCraftItemName(n.key)}: ${n.have} of ${n.n}`);
    list.appendChild(row);
  }
  d.appendChild(list);
  const acts = _gcrEl('div', 'gcr-acts');
  const make = uiButton({ label: 'Make', icon: 'hammer', kind: 'primary', cls: 'gcr-make' + (r.can ? '' : ' is-off'), run: () => _gcrMake(r, d, el) });
  acts.appendChild(make);
  if (r.owned && (r.def.make.wear || r.def.make.pet)) {
    const worn = gardenCraftWorn(r.def);
    acts.appendChild(uiButton({ label: worn ? 'Take off' : (r.def.make.pet ? 'Put on my pet' : 'Wear it'), icon: worn ? 'circle-x' : r.def.make.pet ? 'paw-print' : 'shirt', kind: 'secondary', run: (e, b) => { const on = gardenCraftWearToggle(r.def); if (on) gameCheer(b, { tone: 'gold', sound: true }); _gcrRepaint(el); } }));
  }
  if (r.def.make.decor && gardenHas('decor:' + r.def.make.decor) > 0) acts.appendChild(uiButton({ label: 'Place it', icon: 'hand', kind: 'secondary', run: () => { gardenPopupClose(); try { _gh.bag = true; _ghBag(); } catch (e) { /* the bag is by the hotbar */ } } }));
  d.appendChild(acts);
  if (r.owned && gardenCraftSellPrice(r.id) > 0) {
    const L = gardenCraftMarket(), each = gardenCraftSellPrice(r.id);
    const sell = uiButton({ label: String(each), icon: 'coins', kind: 'ghost', size: 'sm', tip: 'Sell one', cls: 'gcr-sell', run: (e, b) => { const res = gardenCraftSell('craft:' + r.id, 1, { quiet: true }); if (!res.ok) { gameDeny(b, { kind: 'coins', say: res.msg }); return; } gameCheer(b, { text: '+' + Math.min(L.left, each), tone: 'coin', sound: true }); _gcrRepaint(el); } });
    d.appendChild(sell);
  }
  return d;
}
/* the making: the ingredients fly in, three taps of the hammer, and it pops out */
function _gcrMake(r, d, el) {
  if (_gcr.busy) return;
  const btn = d.querySelector('.gcr-make');
  if (!r.can) {
    for (const row of d.querySelectorAll('.gcr-need.is-no')) gameDeny(row, { silent: true });
    gameDeny(btn, { say: `Still need: ${r.missing.map(x => gardenCraftItemName(x.key)).join(', ')}` });
    return;
  }
  const res = gardenCraft(r.id);
  if (!res.ok) { gameDeny(btn, { say: res.msg, kind: res.why === 'cap' ? 'tool' : '' }); return; }
  const bench = d.querySelector('.gcr-bench'), big = d.querySelector('.gcr-big'), ham = d.querySelector('.gcr-hammer');
  const end = () => { _gcr.busy = false; gameCheer(big, { tone: 'gold', text: r.def.make.treats ? '+' + r.def.make.treats : '+1', sound: true }); _gcrRepaint(el); };
  if (!_gcrMotion()) { end(); return; }
  _gcr.busy = true;
  try { if (typeof gartPlayerAct === 'function') gartPlayerAct('dig', 1100); } catch (e) { /* no gardener */ }
  btn.disabled = true;
  bench.classList.add('is-making');
  big.animate({ opacity: [1, 0], scale: ['1', '0.4'] }, { duration: 160, fill: 'forwards' });
  const c = bench.getBoundingClientRect(), cx = c.left + c.width / 2, cy = c.top + c.height * 0.6;
  let i = 0;
  for (const row of d.querySelectorAll('.gcr-need-art')) {
    const q = row.getBoundingClientRect(), f = row.cloneNode(true); f.classList.add('gcr-fly'); f.style.left = q.left + 'px'; f.style.top = q.top + 'px'; document.body.appendChild(f);
    const a = f.animate([{ transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1, easing: 'cubic-bezier(.3,0,.6,1)' }, { transform: `translate(${(cx - q.left - 17) * 0.55}px,${(cy - q.top - 17) * 0.55 - 34}px) scale(1.1) rotate(${(i % 2 ? 1 : -1) * 90}deg)`, opacity: 1, easing: 'cubic-bezier(.5,0,.9,.6)', offset: 0.55 }, { transform: `translate(${cx - q.left - 17}px,${cy - q.top - 17}px) scale(.3) rotate(${(i % 2 ? 1 : -1) * 200}deg)`, opacity: 0.4 }], { duration: 430, delay: i * 70, fill: 'both' });
    a.onfinish = () => f.remove(); i++;
  }
  const t0 = 420 + (i - 1) * 70, hits = [0, 240, 480];
  hits.forEach((h, k) => {
    setTimeout(() => {
      if (!bench.isConnected) return;
      ham.animate([{ transform: 'rotate(-50deg) translateY(-14px)', opacity: 1, easing: 'cubic-bezier(.6,0,1,.6)' }, { transform: 'rotate(10deg) translateY(10px)', opacity: 1, offset: 0.7 }, { transform: 'rotate(-14deg) translateY(0)', opacity: 1 }], { duration: 230, fill: 'both' });
      setTimeout(() => {
        if (!bench.isConnected) return;
        bench.animate({ scale: ['1 1', '1.05 .92', '1 1'] }, { duration: 150, easing: 'ease-out' });
        gameCheer({ x: cx, y: cy }, { quiet: false, tone: k === 2 ? 'gold' : '' });
      }, 160);
    }, t0 + h);
  });
  setTimeout(() => {
    if (!bench.isConnected) { _gcr.busy = false; return; }
    ham.animate({ opacity: [1, 0] }, { duration: 120, fill: 'forwards' });
    big.getAnimations().forEach(a => a.cancel());
    bench.classList.add('is-done');
    big.animate([{ transform: 'translateY(26px) scale(.2)', opacity: 0, easing: 'cubic-bezier(.2,1.7,.4,1)' }, { transform: 'translateY(0) scale(1)', opacity: 1 }], { duration: 520, fill: 'both' });
    setTimeout(end, 620);
  }, t0 + 740);
}

/* ---------- the world: a bottle on the shore, a mark when you have learnt something ---------- */
const _GC_BOTTLE = '<g class="gc-bottle"><ellipse cx="0" cy="1" rx="11" ry="3" fill="#1a2a14" fill-opacity=".2"/><g transform="rotate(-24)"><rect x="-10" y="-8" width="16" height="9" rx="3.500" fill="#a8e0d8" fill-opacity=".85" stroke="#4a8a84" stroke-width="1"/><rect x="5" y="-6" width="6" height="5" fill="#a8e0d8" fill-opacity=".85" stroke="#4a8a84" stroke-width="1"/><rect x="10" y="-6.500" width="4" height="6" rx="1" fill="#b08a58" stroke="#6a4426" stroke-width=".7"/><rect x="-7" y="-6" width="9" height="5.500" rx="1" fill="#fbf4e0" stroke="#c8b88a" stroke-width=".5"/><path d="M-5.500 -4.500h6M-5.500 -3h5" stroke="#9a8a60" stroke-width=".5"/><path d="M-8 -7h8" stroke="#fff" stroke-width="1" stroke-opacity=".7" stroke-linecap="round"/></g></g>';
function _gcrWorld() {
  try {
    if (typeof _gw === 'undefined' || !_gw.on || typeof gardenWorldAdd !== 'function') { if (_gcr.bottle) { _gcr.bottle.remove(); _gcr.bottle = null; } return; }
    const m = gardenModel(), B = gardenBottleNow(m);
    if (_gdG().prefs.rchn == null) gardenCraftTick(m);
    if (!B) { if (_gcr.bottle) { _gcr.bottle.remove(); _gcr.bottle = null; } return; }
    if (_gcr.bottle) return;
    _gcr.bottle = gardenWorldAdd({ id: 'gc-bottle', svg: _GC_BOTTLE, x: B.x, y: B.y, hit: 0.75, label: 'A message in a bottle', cursor: 'hand', t: 0,
      update(dt, s) { s.t += dt; if (s.node && s.node.firstChild && gardenMotionOn()) { s.node.firstChild.setAttribute('transform', `translate(0 ${(Math.sin(s.t * 2.2) * 1.2).toFixed(2)}) rotate(${(Math.sin(s.t * 1.5) * 5).toFixed(1)})`); } },
      onClick(s) { const r = gardenBottleOpen(); s.remove(); _gcr.bottle = null; if (!r.ok) return; const node = _gdp.svg && _gdp.svg.querySelector('.gd-player'); gameCheer(node, { text: 'Recipe!', tone: 'gold', sound: true }); _gcr.sel = r.recipe; _gcr.group = ''; setTimeout(() => { if (_gdopen()) gardenPopupOpen('craft'); }, 500); } });
  } catch (e) { console.error('[craft]', e); }
}
function _gdopen() { return typeof _gdp !== 'undefined' && _gdp.root && _gdp.root.isConnected && !_gdp.pop; }
if (typeof document !== 'undefined') {
  setInterval(_gcrWorld, 4000);
  document.addEventListener('opendash:garden', (ev) => {
    const d = ev && ev.detail; if (!d) return;
    if (d.kind === 'harvest') { clearTimeout(_gcr.checkT); _gcr.checkT = setTimeout(() => { try { gardenCraftTick(); } catch (e) { /* later */ } }, 600); }
    if (d.kind === 'recipe' && !d.bottle) { try { if (typeof _gdOnPage === 'function' && _gdOnPage()) { const node = _gdp.svg && _gdp.svg.querySelector('.gd-player'); gameCheer(node, { text: 'New recipe', tone: 'gold', sound: true }); } } catch (e) { /* later */ } }
  });
}
