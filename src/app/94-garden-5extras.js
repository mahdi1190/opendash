/* ============================================================
   GARDEN, the other tabs and the camera (2.18, agent 'garden-engine').
     gardenShopTab(el, m)       Seeds / Decorations / Tools / Market: today's deal, filters by
                                category, locks that say why ("Garden level 6", "Autumn only",
                                "Event: Trick or treat"), Buy 1 / Buy 5 with Undo
     gardenAlmanacTab(el, m)    Plants / Visitors / Decorations / Ribbons: what you discovered,
                                silhouettes and a hint for the rest, the ribbons and their rewards
     gardenBasketTab(el, m)     what you picked: sell it (one, or all), make bouquets from cut
                                flowers (the style follows the stems), send one as a gift
                                (gardenBouquetGift, agent fun's dialog), honey, your bag
     gardenPhotoOpen()          photo mode: the time of day, a frame, Save picture (PNG)
     gardenTimelapseOpen()      your garden from its first day to now; play, pause, scrub
     _gdpBurst(kind)            a handful of petals over the garden (Full fun level, motion on)
   ============================================================ */
const GDX_TILE_ROW = 138;
const _gdx = { shop: 'seeds', shopCat: '', pick: null, qty: 1, alm: 'plants', almCat: '', stems: {}, q: '' };

function _gdxSeg(list, cur, pick, cls) {
  const seg = _gdpEl('div', 'seg ' + (cls || ''));
  for (const [k, label, ic] of list) {
    const b = _gdpEl('button'); b.type = 'button'; b.innerHTML = (ic ? icon(ic) : '') + `<span>${esc(label)}</span>`;
    b.setAttribute('aria-pressed', cur === k ? 'true' : 'false');
    b.onclick = () => { if (cur !== k) pick(k); };
    seg.appendChild(b);
  }
  return seg;
}
function _gdxChips(list, cur, pick) {
  const row = _gdpEl('div', 'gd-chips');
  for (const [k, label] of list) {
    const b = _gdpEl('button', 'chip' + (cur === k ? ' chip-accent' : '')); b.type = 'button'; b.textContent = label;
    b.setAttribute('aria-pressed', cur === k ? 'true' : 'false');
    b.onclick = () => { if (cur !== k) pick(k); };
    row.appendChild(b);
  }
  return row;
}
function _gdxRepaintTab() { if (typeof _gdpRepaint === 'function') _gdpRepaint(); }

/* ---------- the shop ---------- */
function gardenShopTab(el, m) {
  const w = m.wallet, kind = _gdx.shop;
  const resetPage = () => { _gdx.pick = null; };
  // What you are shopping for, your coins, and kinds as chips (2.23: the shop is a panel of goods, you compare by looking, the details are on hover).
  const top = _gdpEl('div', 'gd-shop-top');
  top.appendChild(_gdxSeg([['seeds', 'Seeds', 'sprout'], ['decor', 'Decorations', 'armchair'], ['tools', 'Tools', 'wrench'], ['market', 'Sell', 'coins']], kind, (k) => { _gdx.shop = k; _gdx.shopCat = ''; resetPage(); _gdxRepaintTab(); }, 'gd-shop-seg'));
  const body = _gdpEl('div', 'gd-shop-body');
  const fill = () => { body.replaceChildren(); _gdxShopBody(body, m, kind); };
  top.appendChild(_gdxSearchRow(() => { resetPage(); fill(); }, kind));   // 2.33: a search box over every shop tab. Typing repaints only the goods below it, so the box keeps its focus and its caret.
  const wallet = _gdpEl('span', 'gd-stat is-coins gd-shop-coins'); wallet.innerHTML = _GH_GLYPH.coin + `<b>${esc(_gdpNum(w.coins))}</b>`; top.appendChild(wallet);
  el.appendChild(top);
  const cats = kind === 'seeds' ? [['', 'All'], ['season', 'In season'], ...GARDEN_CAT_ORDER.map(c => [c, GARDEN_CATS[c].label])]
    : kind === 'decor' ? [['', 'All'], ...GARDEN_DECOR_CAT_ORDER.map(c => [c, GARDEN_DECOR_CATS[c].label])] : null;
  if (cats) el.appendChild(_gdxChips(cats, _gdx.shopCat, (k) => { _gdx.shopCat = k; resetPage(); _gdxRepaintTab(); }));
  el.appendChild(body);
  fill();
}
/** The words in the box, lower case: every one of them has to be somewhere in a thing's name, its kind or its blurb. */
function _gdxTerms() { return String(_gdx.q || '').toLowerCase().split(/\s+/).filter(Boolean); }
function _gdxMatch(...texts) { const t = _gdxTerms(); if (!t.length) return true; const hay = texts.filter(Boolean).join(' ').toLowerCase(); return t.every(w => hay.includes(w)); }
function _gdxSearchRow(onChange, kind) {
  const row = _gdpEl('div', 'gd-shop-search');
  const q = document.createElement('input'); q.type = 'search'; q.className = 'control control-sm gd-shop-q'; q.autocomplete = 'off'; q.spellcheck = false;
  q.placeholder = kind === 'market' ? 'Search what you can sell' : kind === 'tools' ? 'Search tools' : kind === 'decor' ? 'Search decorations' : 'Search seeds';
  q.setAttribute('aria-label', 'Search the shop'); q.value = _gdx.q || '';
  q.addEventListener('input', () => { _gdx.q = q.value; onChange(); });
  q.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && q.value) { ev.stopPropagation(); q.value = ''; _gdx.q = ''; onChange(); } });
  row.appendChild(q);
  // (a pop-up puts the focus in its first box as it opens: the arrows and a phone's keyboard should not have to get past it)
  if (!q.value) setTimeout(() => { if (document.activeElement === q && !q.value) q.blur(); }, 30);
  return row;
}
/** What the shop sells right now, for the kind of thing and the words in the box. */
function _gdxShopBody(el, m, kind) {
  if (kind === 'market') { gardenMarket(el, m); return; }
  const searching = _gdxTerms().length > 0;
  const none = () => el.appendChild(_gdpEl('p', 'muted gd-shop-none', searching ? `Nothing matches “${String(_gdx.q).trim().slice(0, 40)}”. Try another word.` : 'Nothing here yet.'));
  if (kind === 'tools') {
    const tools = GARDEN_TOOLS.filter(t => _gdxMatch(t.name, t.blurb, 'tool'));
    if (!tools.length) { none(); return; }
    gardenPager(el, { key: 'shop:tools' + (searching ? '?' : ''), sig: searching ? _gdx.q : '', items: tools, grid: 'gd-grid gd-shop-grid', row: GDX_TILE_ROW, draw: (t) => _gdxCard({ id: t.id, item: t.id, name: t.name, art: () => gardenIconSvg(t.id, { kind: 'tool', px: 56 }), have: t.kind === 'consumable' ? gardenHas('fertiliser') : 0, owned: t.kind !== 'consumable' && _gdOwnsTool(t.id), facts: [t.blurb], blurb: t.blurb }, m) });
    return;
  }
  const uc = gardenUnlockCtx(m), coins = m.wallet.coins;
  let rows;   // [{ key: sort key, o: card options }]
  if (kind === 'seeds') {
    const deal = gardenPlant(gardenDailyDeal(m.today));
    if (deal && !searching) el.appendChild(_gdxDealStrip(deal, m));
    let list = GARDEN_PLANTS.filter(p => !(p.unlock && p.unlock.find));
    if (_gdx.shopCat === 'season') list = list.filter(p => gardenInSeason(p, m.season));
    else if (_gdx.shopCat) list = list.filter(p => p.cat === _gdx.shopCat);
    if (searching) list = list.filter(p => _gdxMatch(p.name, p.blurb, GARDEN_CATS[p.cat] && GARDEN_CATS[p.cat].label, p.rarity, 'seed seeds'));
    rows = list.map(p => {
      const pr = gardenPriceOf('seed:' + p.id, m), lock = !!gardenLockOf(p, uc);
      const gh = GARDEN_GROW[p.grow], hrs = gh ? _gdHoursLabel(gh[3] / 1.3) : '';
      const grows = p.special === 'heart' ? 'grows with every task you finish' : hrs ? (/^within/.test(hrs) ? 'grows ' + hrs : 'grows in about ' + hrs) : '';
      const sell = p.yield ? gardenSellPrice('crop:' + p.id, m) : 0;
      const sells = p.yield ? `sells for ${sell} coin${sell === 1 ? '' : 's'}` : 'just for looks';
      const inSeason = gardenInSeason(p, m.season);
      return { key: [lock ? 1 : 0, !lock && pr.price != null && pr.price <= coins ? 0 : 1, inSeason ? 0 : 1, GARDEN_CAT_ORDER.indexOf(p.cat), pr.price == null ? 1e9 : pr.price, p.name],
        o: { id: p.id, item: 'seed:' + p.id, name: p.name, art: () => gardenIconSvg(p.id, { kind: 'seed', px: 56 }), rarity: p.rarity, inSeason, grow: gh ? gh[3] / 1.3 : 0, sell, facts: [GARDEN_CATS[p.cat].one, grows, sells].filter(Boolean), blurb: p.blurb, have: gardenHas('seed:' + p.id) } };
    });
  } else {
    let list = GARDEN_DECOR.filter(d => !d.craft);
    if (_gdx.shopCat) list = list.filter(d => d.cat === _gdx.shopCat);
    if (searching) list = list.filter(d => _gdxMatch(d.name, d.blurb, GARDEN_DECOR_CATS[d.cat] && GARDEN_DECOR_CATS[d.cat].label, 'decoration'));
    rows = list.map(d => {
      const pr = gardenPriceOf('decor:' + d.id, m), lock = !!gardenLockOf(d, uc);
      const size = d.w > 1 || d.h > 1 ? `takes ${d.w} × ${d.h} tiles` : '';
      return { key: [lock ? 1 : 0, !lock && pr.price != null && pr.price <= coins ? 0 : 1, 0, GARDEN_DECOR_CAT_ORDER.indexOf(d.cat), pr.price == null ? 1e9 : pr.price, d.name],
        o: { id: d.id, item: 'decor:' + d.id, name: d.name, art: () => gardenIconSvg(d.id, { kind: 'decor', px: 56 }), facts: [size, _gdpEffectText(d)].filter(Boolean), blurb: d.blurb, have: gardenHas('decor:' + d.id), placed: m.decor.filter(x => x.def.id === d.id).length } };
    });
  }
  // What you can buy now comes first (affordable, in season), then by type and price; what is locked comes last. A search puts the names that start with your words first. Once sorted the order holds until the shop is opened again, so buying one thing moves nothing.
  const lead = (r) => { const t = _gdxTerms(); return t.length && String(r.o.name).toLowerCase().startsWith(t[0]) ? 0 : 1; };
  const cmp = (a, b) => { if (searching && lead(a) !== lead(b)) return lead(a) - lead(b); for (let i = 0; i < a.key.length; i++) { if (a.key[i] === b.key[i]) continue; return typeof a.key[i] === 'string' ? a.key[i].localeCompare(b.key[i]) : a.key[i] - b.key[i]; } return 0; };
  if (!rows.length) { none(); return; }
  const place = `shop:${kind}:${_gdx.shopCat}` + (searching ? '?' : ''), sig = searching ? _gdx.q : '';
  gardenPager(el, { key: place, sig, items: gardenPagerOrder(place, rows, r => r.o.id, cmp, sig), grid: 'gd-grid gd-shop-grid', row: GDX_TILE_ROW, rowSm: 128, draw: (r) => _gdxCard(r.o, m) });
}
/** Today's deal as one slim strip: the seed, its name and the price button. */
function _gdxDealStrip(deal, m) {
  const pr = gardenPriceOf('seed:' + deal.id, m);
  const d = _gdpEl('div', 'gd-deal');
  const art = _gdpEl('span', 'gd-deal-art'); art.innerHTML = gardenIconSvg(deal.id, { kind: 'seed', px: 28 }); d.appendChild(art);
  const t = _gdpEl('span', 'gd-deal-t');
  t.appendChild(_gdpEl('span', 'gd-deal-tag', '½ price'));
  t.appendChild(_gdpEl('b', null, deal.name));
  d.appendChild(t);
  d.appendChild(_gdxPriceBtn('seed:' + deal.id, m, pr));
  return d;
}
/** The price on a thing, and the way to buy it: press it. Short of coins or locked, it says no the way a game does. */
function _gdxPriceBtn(item, m, pr, card) {
  const short = pr.price != null && !pr.why && m.wallet.coins < pr.price, locked = pr.price == null || !!pr.why;
  const b = _gdpEl('button', 'gd-price' + (short ? ' is-short' : '') + (locked ? ' is-locked' : '')); b.type = 'button';
  if (locked) { b.innerHTML = icon('lock', 'i-xs'); b.appendChild(_gdpEl('span', null, _gdxWhyShort(pr.why))); b.setAttribute('aria-label', pr.why || 'Not for sale'); }
  else { b.innerHTML = _GH_GLYPH.coin; b.appendChild(_gdpEl('b', null, _gdpNum(pr.price))); b.setAttribute('aria-label', `Buy for ${pr.price} coins`); }
  b.onclick = (ev) => { ev.stopPropagation(); _gdxBuy(item, 1, card || b, pr, b); };
  return b;
}
function _gdxWhyShort(why) { const w = String(why || ''); const lv = /level (\d+)/i.exec(w); return lv ? 'Lv ' + lv[1] : w.replace(/^Event: /, '').replace(/ only$/, ''); }
/** A short time ('15h', '4d') for a tile. */
function _gdxShortH(h) { return h < 24 ? Math.max(1, Math.round(h)) + 'h' : Math.round(h / 24) + 'd'; }
/** One thing for sale: a picture, its name, and a price you press. How long it takes and what it sells for are small marks; the sentence is on hover. */
function _gdxCard(o, m) {
  const pr = gardenPriceOf(o.item, m);
  const c = _gdpEl('div', 'gd-tile' + (pr.why || pr.price == null ? ' is-locked' : '') + (o.rarity ? ' gd-r-' + o.rarity : ''));
  const art = _gdpEl('div', 'gd-tile-art'); art.innerHTML = o.art(); c.appendChild(art);
  if (o.have) c.appendChild(_gdpEl('i', 'gd-slotn gd-tile-have', '×' + o.have));
  if (o.inSeason) { const lf = _gdpEl('span', 'gd-tile-season'); lf.innerHTML = icon('leaf', 'i-xs'); lf.setAttribute('data-tip', 'In season: grows faster now'); c.appendChild(lf); }
  c.appendChild(_gdpEl('b', 'gd-tile-n', o.name));
  const facts = _gdpEl('div', 'gd-tile-f');
  if (o.grow) { const g = _gdpEl('span'); g.innerHTML = icon('clock', 'i-xs'); g.appendChild(document.createTextNode(_gdxShortH(o.grow))); facts.appendChild(g); }
  if (o.sell) { const g = _gdpEl('span'); g.innerHTML = _GH_GLYPH.coin; g.appendChild(document.createTextNode(String(o.sell))); facts.appendChild(g); }
  if (o.placed) { const g = _gdpEl('span'); g.innerHTML = icon('map-pin', 'i-xs'); g.appendChild(document.createTextNode(String(o.placed))); facts.appendChild(g); }
  if (facts.children.length) c.appendChild(facts);
  if (o.owned) c.appendChild(_gdpEl('span', 'gd-price is-owned', '✓'));
  else c.appendChild(_gdxPriceBtn(o.item, m, pr, c));
  c.setAttribute('data-tip', [o.name, ...(o.facts || []), o.blurb].filter(Boolean).join(' · '));
  return c;
}
function _gdxBuy(item, n, target, pr, btn) {
  _gdx.pick = null;
  const r = gardenBuy(item, n);
  if (!r.ok) { gameDenyOf(r, target || null, pr && pr.price != null && !pr.why ? { kind: 'coins', badge: String(pr.price) } : undefined); return; }
  if (pr && pr.price != null) gameCheer(btn || target, { text: '-' + pr.price * n, tone: 'coin', sound: true });
}
function gardenMarket(el, m) {
  const items = Object.entries(m.wallet.items).filter(([k, n]) => n > 0 && gardenSellPrice(k, m) > 0 && !k.startsWith('decor:') && _gdxMatch(_gdxItemName(k)));
  const decor = Object.entries(m.wallet.items).filter(([k, n]) => n > 0 && k.startsWith('decor:') && _gdxMatch(_gdxItemName(k)));
  if (m.events.includes('harvest-home')) el.appendChild(_gdpEl('p', 'gd-note', 'Harvest home: the market pays a fifth more this week.'));
  if (!items.length && !decor.length) { if (_gdxTerms().length) el.appendChild(_gdpEl('p', 'muted gd-shop-none', `Nothing in your basket matches “${String(_gdx.q).trim().slice(0, 40)}”.`)); else mountEmptyState(el, { icon: 'shopping-basket', title: 'Nothing to sell yet', text: '' }); return; }
  let total = 0;
  for (const [k, n] of items) total += gardenSellPrice(k, m) * Math.floor(n);
  if (items.length > 1) el.appendChild(_gdpBtn(`${_gdxTerms().length ? "Sell these" : "Sell everything"} for ${total}`, { kind: 'btn-secondary', icon: 'coins', sm: false, run: () => { let sum = 0, mark = []; const u0 = _gd.undo.length; for (const [k, n] of items) { const r = gardenSell(k, Math.floor(n), { quiet: true }); if (r.ok) sum++; } const steps = _gd.undo.splice(u0); for (const s of steps) mark.push(...s.mark); if (mark.length) { _gdPushUndo('selling everything', mark); const u = _gd.undo[_gd.undo.length - 1]; toast(`Sold everything for ${total} coins`, { icon: 'coins', action: { label: 'Undo', run: () => { if (_gd.undo[_gd.undo.length - 1] === u) gardenUndo(); } } }); } void sum; } }));
  // what is worth the most first, then the decorations in your bag
  const rows = items.map(([k, n]) => ({ k, n: Math.floor(n), each: gardenSellPrice(k, m), group: 'What you picked' })).sort((a, b) => b.each * b.n - a.each * a.n || a.k.localeCompare(b.k))
    .concat(decor.map(([k, n]) => ({ k, n: Math.floor(n), each: gardenSellPrice(k, m), note: 'Half what it cost', group: 'Decorations in your bag' })).sort((a, b) => b.each - a.each || a.k.localeCompare(b.k)));
  const searching = _gdxTerms().length > 0;
  gardenPager(el, { key: 'shop:market' + (searching ? '?' : ''), sig: searching ? _gdx.q : '', items: rows, grid: 'gd-sell gpg-sell', row: 60, rowSm: 92, label: (r) => r.group, draw: (r) => _gdxSellRow(r.k, r.n, r.each, r.note) });
}
function _gdxItemName(k) {
  const [kind, id] = k.split(':');
  if (kind === 'crop') { const p = gardenPlant(id); return p ? (p.yield && p.yield.item ? p.yield.item[0].toUpperCase() + p.yield.item.slice(1) : p.name) : id; }
  if (kind === 'bq') { const b = GARDEN_BOUQUETS.find(x => x.id === id); return b ? b.name : id; }
  if (kind === 'decor') { const d = gardenDecor(id); return d ? d.name : id; }
  if (kind === 'seed') { const p = gardenPlant(id); return p ? p.name + ' seeds' : id; }
  return { honey: 'Honey', fertiliser: 'Fertiliser', clover: 'Four-leaf clover' }[k] || k;
}
function _gdxItemIcon(k, px) {
  const [kind, id] = k.split(':');
  if (kind === 'crop') return gardenIconSvg(id, { kind: 'crop', px });
  if (kind === 'bq') return gardenIconSvg(id, { kind: 'bouquet', px });
  if (kind === 'decor') return gardenIconSvg(id, { kind: 'decor', px });
  if (kind === 'seed') return gardenIconSvg(id, { kind: 'seed', px });
  return gardenIconSvg(k, { kind: 'tool', px });
}
function _gdxSellRow(k, n, each, note) {
  const r = _gdpEl('div', 'gd-sellrow');
  const a = _gdpEl('span', 'gd-sellrow-art'); a.innerHTML = _gdxItemIcon(k, 40); r.appendChild(a);
  const t = _gdpEl('span', 'gd-sellrow-t'); t.appendChild(_gdpEl('b', null, _gdxItemName(k))); t.appendChild(_gdpEl('small', 'muted', `${n} · ${each} coin${each === 1 ? '' : 's'} each${note ? ' · ' + note : ''}`)); r.appendChild(t);
  const sell = (q, ev) => { const b = ev.currentTarget, x = gardenSell(k, q); if (x.ok) gameCheer(b, { text: '+' + each * q, tone: 'coin', sound: true }); else gameDenyOf(x, b); };
  r.appendChild(_gdpBtn(`Sell 1 · ${each}`, { run: (ev) => sell(1, ev) }));
  if (n > 1) r.appendChild(_gdpBtn(`All · ${each * n}`, { kind: 'btn-primary', run: (ev) => sell(n, ev) }));
  return r;
}

/* ---------- the almanac ---------- */
function gardenAlmanacTab(el, m) {
  const g = _gdG();
  const plantsFound = GARDEN_PLANTS.filter(p => g.disc[p.id]).length, visFound = GARDEN_VISITORS.filter(v => g.disc[v.id]).length, decFound = GARDEN_DECOR.filter(d => g.disc[d.id]).length;
  const ribs = gardenRibbonRows(m), ribDone = ribs.filter(r => r.earned).length;
  const top = _gdpEl('div', 'gd-alm-top');
  top.appendChild(_gdxSeg([['plants', `Plants ${plantsFound}/${GARDEN_PLANTS.length}`, 'flower-2'], ['visitors', `Visitors ${visFound}/${GARDEN_VISITORS.length}`, 'bird'], ['decor', `Decorations ${decFound}/${GARDEN_DECOR.length}`, 'armchair'], ['ribbons', `Ribbons ${ribDone}/${ribs.length}`, 'award'], ...(typeof gardenLifeBookTab === 'function' ? [['nature', 'Nature book', 'leaf']] : [])], _gdx.alm, (k) => { _gdx.alm = k; _gdx.almCat = ''; _gdxRepaintTab(); }, 'gd-alm-seg'));
  el.appendChild(top);
  if (_gdx.alm === 'nature' && typeof gardenLifeBookTab === 'function') { gardenLifeBookTab(el, m); return; }   // the creatures and the surprises: 94-garden-life-6book.js
  if (_gdx.alm === 'ribbons') {
    // the ones nearest to being earned first, what you have earned after them
    const cmp = (x, y) => (x.earned ? 1 : 0) - (y.earned ? 1 : 0) || y.n / y.of - x.n / x.of || String(x.def.label).localeCompare(y.def.label);
    gardenPager(el, { key: 'alm:ribbons', items: gardenPagerOrder('alm:ribbons', ribs, r => r.def.label, cmp), grid: 'gd-ribbons', row: 126, draw: (r) => {
      const c = _gdpEl('div', 'gd-ribbon' + (r.earned ? ' is-earned' : ''));
      c.innerHTML = `<span class="gd-rib-ic">${icon(r.def.icon)}</span>`;
      const t = _gdpEl('div', 'gd-rib-t');
      t.appendChild(_gdpEl('b', null, r.def.label));
      t.appendChild(_gdpEl('small', 'muted', r.def.hint));
      const bar = _gdpEl('span', 'gd-xpbar'); const fill = _gdpEl('i'); fill.style.width = Math.round(r.n / r.of * 100) + '%'; bar.appendChild(fill); t.appendChild(bar);
      const rw = r.def.reward, items = rw.i ? Object.keys(rw.i).map(_gdxItemName).join(', ') : '';
      t.appendChild(_gdpEl('small', 'gd-rib-rw', r.earned ? `Earned ${r.earned} · ${rw.c} coins${items ? ' and ' + items : ''}` : `${r.n} of ${r.of} · reward: ${rw.c} coins${items ? ' and ' + items : ''}`));
      c.appendChild(t);
      return c;
    } });
    return;
  }
  const kind = _gdx.alm === 'visitors' ? 'visitor' : _gdx.alm === 'decor' ? 'decor' : 'plant';
  let list = kind === 'plant' ? GARDEN_PLANTS : kind === 'visitor' ? GARDEN_VISITORS : GARDEN_DECOR;
  // by family (the chips jump to one), and inside a family what you have found comes first
  const cats = kind === 'plant' ? GARDEN_CAT_ORDER : kind === 'decor' ? GARDEN_DECOR_CAT_ORDER : null, names = kind === 'plant' ? GARDEN_CATS : GARDEN_DECOR_CATS;
  if (cats) { el.appendChild(_gdxChips([['', 'All'], ...cats.map(c => [c, names[c].label])], _gdx.almCat, (k) => { _gdx.almCat = k; _gdxRepaintTab(); })); if (_gdx.almCat) list = list.filter(p => p.cat === _gdx.almCat); }
  const rarities = Object.keys(GARDEN_RARITY), rank = (d) => Math.max(0, rarities.indexOf(d.rarity));
  const cmp = (a, b) => (cats ? cats.indexOf(a.cat) - cats.indexOf(b.cat) : 0) || (g.disc[a.id] ? 0 : 1) - (g.disc[b.id] ? 0 : 1) || rank(a) - rank(b) || String(a.name).localeCompare(b.name);
  const place = `alm:${kind}:${_gdx.almCat}`;
  gardenPager(el, { key: place, items: gardenPagerOrder(place, list, d => d.id, cmp), grid: 'gd-grid gd-alm-grid gpg-book', row: 146, rowSm: 126, label: cats ? (d) => names[d.cat].label : null, draw: (d) => {
    const found = !!g.disc[d.id];
    const c = _gdpEl('button', 'gd-almcard' + (found ? '' : ' is-unknown') + (d.rarity ? ' gd-r-' + d.rarity : '')); c.type = 'button';
    const art = _gdpEl('div', 'gd-card-art');
    art.innerHTML = kind === 'plant' ? gardenIconSvg(d.id, { kind: 'plant', stage: 4, season: (d.seasons || ['summer'])[0], silhouette: !found, ripe: true, heart: d.special === 'heart' ? Math.min(6, m.heart) : undefined, px: 64 }) : gardenIconSvg(d.id, { kind, silhouette: !found, px: 64 });
    c.appendChild(art);
    c.appendChild(_gdpEl('b', null, found ? d.name : '???'));
    c.appendChild(_gdpEl('small', 'muted', found ? (kind === 'plant' ? GARDEN_CATS[d.cat].one + ' · ' + GARDEN_RARITY[d.rarity].label.toLowerCase() : kind === 'visitor' ? GARDEN_RARITY[d.rarity].label + ' · ' + d.when.tod.join(', ') : GARDEN_DECOR_CATS[d.cat].label) : _gdxHint(d, kind, m)));
    c.onclick = () => _gdxAlmDetail(d, kind, found, m);
    return c;
  } });
}
function _gdxHint(d, kind, m) {
  if (kind === 'plant') { const why = gardenLockOf(d, gardenUnlockCtx(m)); return why ? why : 'In the shop: plant one to discover it'; }
  if (kind === 'decor') return 'In the shop';
  const n = d.needs || {}, bits = [];
  if (n.bloom) bits.push(`${n.bloom}+ flowers in bloom`);
  if (n.plants) bits.push('likes ' + n.plants.slice(0, 2).map(id => gardenPlant(id).name.toLowerCase()).join(' or '));
  if (n.decor) bits.push('comes to a ' + gardenDecor(n.decor[0]).name.toLowerCase());
  if (n.effect) bits.push({ pond: 'needs water', birds: 'a bird bath or feeder', light: 'drawn to lights', hedgehog: 'a hedgehog house or leaf pile', sit: 'a seat in the sun' }[n.effect] || '');
  if (n.area) bits.push('the ' + gardenArea(n.area).name.toLowerCase());
  if (n.trees) bits.push('grown trees'); if (n.ripe) bits.push('ripe fruit'); if (n.rain) bits.push('after rain');
  const when = d.when.tod.length < 4 ? d.when.tod.join(' or ') : '';
  return [bits.filter(Boolean)[0], when].filter(Boolean).join(' · ') || 'Keep gardening';
}
function _gdxAlmDetail(d, kind, found, m) {
  const back = _gdp.pop && _gdp.pop.tab;   // closing an entry goes back to the page of the book you were on
  openDialog({
    title: found ? d.name : 'Not discovered yet', width: 520, onClose: back ? () => setTimeout(() => gardenPopupOpen(back), 0) : undefined,
    body(el) {
      el.classList.add('gd-almdlg');
      const art = _gdpEl('div', 'gd-almdlg-art');
      if (kind === 'plant') art.innerHTML = [1, 2, 3, 4].map(s => gardenIconSvg(d.id, { kind: 'plant', stage: s, season: (d.seasons || ['summer'])[0], silhouette: !found, ripe: s === 4, heart: d.special === 'heart' ? s + 1 : undefined, px: 84 })).join('');
      else art.innerHTML = gardenIconSvg(d.id, { kind, silhouette: !found, px: 120 });
      el.appendChild(art);
      if (!found) { el.appendChild(_gdpEl('p', null, _gdxHint(d, kind, m))); return; }
      if (d.blurb) el.appendChild(_gdpEl('p', 'gd-almdlg-blurb', d.blurb));
      const ul = _gdpEl('ul', 'gd-insp-facts');
      const li = (ic, t) => { const x = _gdpEl('li'); x.innerHTML = icon(ic, 'i-sm'); x.appendChild(_gdpEl('span', null, t)); ul.appendChild(x); };
      if (kind === 'plant') {
        li('tag', `${GARDEN_RARITY[d.rarity].label} ${GARDEN_CATS[d.cat].one}`);
        li('map-pin', 'Grows in the ' + (d.areas || GARDEN_CATS[d.cat].areas).map(a => gardenArea(a).name.toLowerCase()).join(', '));
        li('calendar', 'In season: ' + (d.seasons.length === 4 ? 'all year' : d.seasons.map(s => GARDEN_SEASON_LABEL[s]).join(', ')));
        const gh = GARDEN_GROW[d.grow]; li('timer', d.special === 'heart' ? 'Grows with every task you finish' : `About ${_gdHoursLabel(gh[3] / 1.3)} to ${d.cat === 'veg' || d.cat === 'fruit' ? 'harvest' : 'full bloom'} in season, faster as you finish tasks`);
        if (d.thirst) li('droplet', `Wants water every ${_gdHoursLabel(d.thirst)}`); else li('droplet', 'Never thirsty');
        if (d.yield) li('shopping-basket', `${d.yield.regrow ? 'Picked again and again' : 'Lifted at harvest'}; sells for ${gardenSellPrice('crop:' + d.id, m)} each`);
        if (d.attracts) li('bird', 'Attracts ' + d.attracts.map(id => (gardenVisitor(id) || {}).name).filter(Boolean).join(', ').toLowerCase());
        const n = m.plants.filter(p => p.def.id === d.id).length; if (n) li('sprout', `${n} in your garden now`);
      } else if (kind === 'visitor') {
        li('clock', 'Comes at ' + d.when.tod.join(', ')); li('calendar', d.when.seasons.length === 4 ? 'All year' : d.when.seasons.map(s => GARDEN_SEASON_LABEL[s]).join(', '));
        li('sparkles', 'Brought by: ' + _gdxHint(d, kind, m));
        const seen = _gdG().disc[d.id]; if (seen) li('eye', 'First seen ' + seen);
      } else {
        li('ruler', `${d.w} × ${d.h} cell${d.w * d.h > 1 ? 's' : ''}`); if (d.effect) li('sparkles', _gdpEffectText(d));
        li('coins', `${d.price} coins`);
      }
      el.appendChild(ul);
    },
  });
}

/* ---------- the basket ---------- */
function gardenBasketTab(el, m) {
  const items = m.wallet.items;
  const crops = Object.entries(items).filter(([k, n]) => k.startsWith('crop:') && n > 0);
  const bqs = Object.entries(items).filter(([k, n]) => k.startsWith('bq:') && n > 0);
  const flowers = crops.filter(([k]) => { const p = gardenPlant(k.slice(5)); return p && ['flower', 'wild', 'water', 'exotic'].includes(p.cat); }).concat(crops.filter(([k]) => k === 'crop:holly'));
  if (!crops.length && !bqs.length && !(items.honey > 0)) {
    mountEmptyState(el, { icon: 'shopping-basket', title: 'Your basket is empty', text: '' });
    return;
  }
  // bouquets
  const bq = _gdpEl('section', 'card gd-bq');
  bq.appendChild(_gdpEl('h3', null, 'Make a bouquet'));
  if (flowers.length) {
    const pick = _gdx.stems;
    for (const k of Object.keys(pick)) if (!flowers.some(([f]) => f === k)) delete pick[k];
    const stems = []; for (const [k, n] of Object.entries(pick)) for (let i = 0; i < n; i++) stems.push({ id: k.slice(5) });
    const style = gardenBouquetOf(stems);
    bq.appendChild(_gdpEl('p', 'muted', 'Three stems or more.'));
    const row = _gdpEl('div', 'gd-stems');
    for (const [k, n] of flowers) {
      const c = _gdpEl('div', 'gd-stem');
      c.innerHTML = _gdxItemIcon(k, 44);
      c.appendChild(_gdpEl('small', null, `${_gdxItemName(k)} · ${pick[k] || 0}/${Math.floor(n)}`));
      const minus = _gdpBtn('', { icon: 'minus', aria: 'One less', disabled: !pick[k], run: () => { pick[k] = Math.max(0, (pick[k] || 0) - 1); if (!pick[k]) delete pick[k]; _gdxRepaintTab(); } });
      const plus = _gdpBtn('', { icon: 'plus', aria: 'One more', disabled: (pick[k] || 0) >= Math.floor(n) || stems.length >= 12, run: () => { pick[k] = (pick[k] || 0) + 1; _gdxRepaintTab(); } });
      const ctl = _gdpEl('span', 'gd-stem-ctl'); ctl.append(minus, plus); c.appendChild(ctl);
      row.appendChild(c);
    }
    bq.appendChild(row);
    const f = _gdpEl('div', 'gd-bq-f');
    if (style) { const pv = _gdpEl('span', 'gd-bq-pv'); pv.innerHTML = gardenIconSvg(style.id, { kind: 'bouquet', px: 56 }); pv.appendChild(_gdpEl('b', null, `${stems.length} stems: a ${style.name.toLowerCase()}`)); f.appendChild(pv); }
    else f.appendChild(_gdpEl('span', 'muted', stems.length ? `${stems.length} stem${stems.length === 1 ? '' : 's'}: ${3 - stems.length} more for a posy` : 'No stems picked yet'));
    f.appendChild(_gdpBtn('Make the bouquet', { kind: 'btn-primary', icon: 'flower', disabled: !style, run: () => { const r = gardenMakeBouquet(stems); if (r.ok) _gdx.stems = {}; else _gdpSay(r); } }));
    bq.appendChild(f);
  } else bq.appendChild(_gdpEl('p', 'muted', 'Pick some flowers first.'));
  el.appendChild(bq);
  if (bqs.length) {
    const sec = _gdpEl('section', 'gd-bqs');
    sec.appendChild(_gdpEl('h3', 'gd-h3', 'Your bouquets'));
    const list = _gdpEl('div', 'gd-sell');
    for (const [k, n] of bqs) {
      const r = _gdxSellRow(k, Math.floor(n), gardenSellPrice(k, m));
      const canGift = typeof funGiftDialog === 'function' && window.Friends && Friends.list && Friends.list().length;
      if (canGift) r.insertBefore(_gdpBtn('Send to a friend', { icon: 'gift', tip: 'Opens the gift dialog', run: () => { if (!gardenBouquetGift(k.slice(3))) toast('Gifts are not available right now.', { icon: 'gift' }); } }), r.querySelector('button'));
      list.appendChild(r);
    }
    sec.appendChild(list);
    el.appendChild(sec);
  }
  const sec = _gdpEl('section', 'gd-crops');
  sec.appendChild(_gdpEl('h3', 'gd-h3', 'In your basket'));
  const list = _gdpEl('div', 'gd-sell');
  for (const [k, n] of crops) list.appendChild(_gdxSellRow(k, Math.floor(n), gardenSellPrice(k, m)));
  if (items.honey > 0) list.appendChild(_gdxSellRow('honey', Math.floor(items.honey), gardenSellPrice('honey', m)));
  sec.appendChild(list);
  el.appendChild(sec);
}
function _gdxBag(el, m) {
  const items = m.wallet.items;
  const seeds = Object.entries(items).filter(([k, n]) => k.startsWith('seed:') && n > 0);
  const decor = Object.entries(items).filter(([k, n]) => k.startsWith('decor:') && n > 0);
  const sec = _gdpEl('section', 'gd-bag');
  sec.appendChild(_gdpEl('h3', 'gd-h3', 'Your bag'));
  const p = _gdpEl('p', 'muted');
  p.textContent = `${seeds.reduce((s, [, n]) => s + Math.floor(n), 0)} seeds of ${seeds.length} kinds · ${decor.reduce((s, [, n]) => s + Math.floor(n), 0)} decorations waiting to be placed · ${gardenHas('fertiliser')} fertiliser${items.clover > 0 ? ' · a four-leaf clover' : ''}`;
  sec.appendChild(p);
  el.appendChild(sec);
}

/* ---------- photo mode ---------- */
function gardenPhotoOpen() {
  gardenEnsure();
  const st = { tod: '', frame: 'none', crop: 'all', visitors: true };
  openDialog({
    title: 'Photo mode', width: 980, resizeKey: 'garden-photo',
    body(el, close) {
      el.classList.add('gd-photo');
      const paint = () => {
        el.textContent = '';
        const m = gardenModel(), sc = gardenSceneFromModel(m);
        if (st.tod) { sc.tod = st.tod; sc.hour = { dawn: 6.5, day: 13, dusk: 19, night: 23 }[st.tod]; }
        if (!st.visitors) sc.visitors = [];
        const frame = _gdpEl('div', 'gd-photo-frame gd-frame-' + st.frame);
        frame.innerHTML = gardenSceneSvg(sc, { size: 'l', crop: st.crop, still: !gardenMotionOn(), uid: 'gdph', photo: true, label: 'Your garden', fit: 'xMidYMid meet' });
        if (st.frame !== 'none') frame.appendChild(_gdpEl('div', 'gd-photo-cap', `${st.frame === 'postcard' ? 'Greetings from ' : ''}my garden · ${Clock.fmtDate ? Clock.fmtDate(m.now, { day: 'numeric', month: 'long', year: 'numeric' }) : m.today}`));
        el.appendChild(frame);
        const ctl = _gdpEl('div', 'gd-photo-ctl');
        ctl.appendChild(_gdxSeg([['', 'Now'], ['dawn', 'Dawn'], ['day', 'Midday'], ['dusk', 'Golden hour'], ['night', 'Night']], st.tod, (k) => { st.tod = k; paint(); }));
        ctl.appendChild(_gdxSeg([...(gardenCropFor(gardenModel().areas) === 'world' ? [['world', 'Everything']] : []), ['all', 'Whole garden'], ['wide', 'Closer'], ['bed', 'Front garden']], st.crop, (k) => { st.crop = k; paint(); }));
        ctl.appendChild(_gdxSeg([['none', 'No frame'], ['polaroid', 'Polaroid'], ['postcard', 'Postcard']], st.frame, (k) => { st.frame = k; paint(); }));
        if (typeof gardenPoseOpen === 'function') ctl.appendChild(_gdpBtn('Pose with a catch', { icon: 'fish', run: () => { if (close) close(); gardenPoseOpen(); } }));   // (94-garden-zz-3pose.js)
        const vis = _gdpBtn(st.visitors ? 'Visitors on' : 'Visitors off', { icon: 'bird', run: () => { st.visitors = !st.visitors; paint(); } });
        ctl.appendChild(vis);
        const save = _gdpBtn('Save picture', { kind: 'btn-primary', icon: 'download', run: () => _gdxSavePhoto(sc, st) });
        ctl.appendChild(save);
        if (typeof memPhotoKeep === 'function') ctl.appendChild(_gdpBtn('Keep in Memories', { icon: 'book-open', run: () => _gdxKeepPhoto(sc, st) }));   // 2.32
        el.appendChild(ctl);
      };
      paint();
    },
  });
}
function _gdxSavePhoto(sc, st) {
  const box = gardenCropBox(st.crop), k = 2400 / box.w;
  const svg = gardenSceneSvg(sc, { size: 'l', crop: st.crop, still: true, uid: 'gdpng', photo: true, label: 'My garden', fit: 'xMidYMid meet' });
  const busy = toast('Developing the photo…', { icon: 'camera', busy: true });
  gardenScenePng(svg, Math.round(box.w * k), Math.round(box.h * k)).then((blob) => {
    if (typeof busy === 'function') busy();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `garden-${_gdToday()}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Saved to your downloads', { icon: 'camera', kind: 'ok', now: true });
    try { if (typeof gardenLiveCheer === 'function') gardenLiveCheer('photo'); } catch (e) { /* only a moment */ }   // 2.29.0: the others in a live garden see the flash
  }).catch(() => { if (typeof busy === 'function') busy(); toast('The photo could not be saved.', { kind: 'err', retry: () => _gdxSavePhoto(sc, st) }); });
}

/** 2.32: the same picture, kept in Memories (the Photos tab) instead of downloaded. */
function _gdxKeepPhoto(sc, st) {
  const box = gardenCropBox(st.crop), k = 2400 / box.w;
  const svg = gardenSceneSvg(sc, { size: 'l', crop: st.crop, still: true, uid: 'gdkeep', photo: true, label: 'My garden', fit: 'xMidYMid meet' });
  const busy = toast('Developing the photo…', { icon: 'camera', busy: true });
  gardenScenePng(svg, Math.round(box.w * k), Math.round(box.h * k)).then((blob) => memPhotoKeep(blob, { iso: _gdToday(), ts: Clock.now(), kind: 'garden' })).then(() => {
    if (typeof busy === 'function') busy();
    toast('Kept in your Memories', { icon: 'camera', kind: 'ok', now: true, action: { label: 'See it', run: () => setView('memories:photos') } });
    try { if (typeof gardenLiveCheer === 'function') gardenLiveCheer('photo'); } catch (e) { /* only a moment */ }
  }).catch(() => { if (typeof busy === 'function') busy(); toast('The photo could not be kept.', { kind: 'err', retry: () => _gdxKeepPhoto(sc, st) }); });
}

/* ---------- the time-lapse ---------- */
function gardenTimelapseOpen() {
  gardenEnsure();
  const g = _gdG(), now = _gdNow();
  const plantedTimes = Object.values(g.plants).map(p => Number(p.t) || now).filter(t => t < now);
  const start = Math.min(_gdDayMs(g.since, 13 * 60), ...plantedTimes.length ? [Math.min(...plantedTimes)] : [now]);
  const span = Math.max(3600000, now - start);
  const frames = Math.max(12, Math.min(72, Math.ceil(span / (span > 6 * 86400000 ? 86400000 : 6 * 3600000)) + 1));
  const at = (i) => Math.round(start + span * (i / (frames - 1)));
  const st = { i: 0, playing: false, timer: 0 };
  const reduced = !gardenMotionOn();
  let svgEl = null, label = null, range = null, playBtn = null;
  const paint = () => {
    const t = at(st.i);
    const m = gardenModel(t), sc = gardenSceneFromModel(m);
    sc.tod = span > 2 * 86400000 ? 'day' : sc.tod; sc.hour = span > 2 * 86400000 ? 13 : sc.hour; sc.visitors = [];
    const parts = gardenSceneParts(sc, { size: 'm', crop: 'all', still: true, uid: 'gdtl', photo: true, label: 'Your garden on ' + _gdDayOf(t), fit: 'xMidYMid meet' });
    if (svgEl && svgEl.isConnected) svgEl = gardenSvgPatch(svgEl, parts);
    if (label) label.textContent = `${Clock.fmtDate ? Clock.fmtDate(t, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : _gdDayOf(t)} · ${m.plants.length} plant${m.plants.length === 1 ? '' : 's'}`;
    if (range) range.value = String(st.i);
  };
  const stop = () => { st.playing = false; clearTimeout(st.timer); if (playBtn) playBtn.innerHTML = icon('play') + '<span>Play</span>'; };
  const tick = () => { if (!st.playing) return; if (st.i >= frames - 1) { stop(); return; } st.i++; paint(); st.timer = setTimeout(tick, 160); };
  openDialog({
    title: 'Your garden’s story', width: 980, resizeKey: 'garden-timelapse', onClose: stop,
    body(el) {
      el.classList.add('gd-tl');
      const stage = _gdpEl('div', 'gd-photo-frame');
      stage.innerHTML = '<svg></svg>';
      svgEl = stage.firstElementChild;
      el.appendChild(stage);
      const ctl = _gdpEl('div', 'gd-photo-ctl');
      playBtn = _gdpBtn('Play', { kind: 'btn-primary', icon: 'play', run: () => { if (st.playing) { stop(); return; } if (st.i >= frames - 1) st.i = 0; st.playing = true; playBtn.innerHTML = icon('pause') + '<span>Pause</span>'; tick(); } });
      ctl.appendChild(playBtn);
      range = document.createElement('input'); range.type = 'range'; range.min = '0'; range.max = String(frames - 1); range.value = '0'; range.className = 'gd-tl-range'; range.setAttribute('aria-label', 'Move through time');
      range.oninput = () => { stop(); st.i = Number(range.value) || 0; paint(); };
      ctl.appendChild(range);
      label = _gdpEl('span', 'gd-tl-label muted');
      ctl.appendChild(label);
      el.appendChild(ctl);
      el.appendChild(_gdpEl('p', 'muted gd-tl-note', 'Plants you dug up are not in the story; everything else grows back in, just as it happened.'));
      // the first frame replaces the placeholder svg
      const m0 = gardenModel(at(0)), sc0 = gardenSceneFromModel(m0); sc0.visitors = []; if (span > 2 * 86400000) { sc0.tod = 'day'; sc0.hour = 13; }
      svgEl = gardenSvgMount(stage, gardenSceneParts(sc0, { size: 'm', crop: 'all', still: true, uid: 'gdtl', photo: true, label: 'Your garden', fit: 'xMidYMid meet' }));
      paint();
      if (!reduced) setTimeout(() => { if (svgEl && svgEl.isConnected) playBtn.click(); }, 500);
    },
  });
}

/* ---------- a little celebration (Full fun level only) ---------- */
function _gdpBurst(kind) {
  if (gardenFun() !== 'full' || !gardenMotionOn()) return;
  const host = document.createElement('div'); host.className = 'gd-burst'; host.setAttribute('aria-hidden', 'true');
  const cols = kind === 'ribbon' ? ['#f2b01e', '#e0566e', '#4a6fe3'] : ['#f29ac4', '#f6c445', '#9fd36a', '#fbfbf6'];
  for (let i = 0; i < 22; i++) { const p = document.createElement('i'); p.style.setProperty('--x', (Math.random() * 100).toFixed(1) + 'vw'); p.style.setProperty('--d', (1.6 + Math.random() * 1.6).toFixed(2) + 's'); p.style.setProperty('--dl', (Math.random() * 0.6).toFixed(2) + 's'); p.style.setProperty('--r', Math.round(Math.random() * 360) + 'deg'); p.style.background = cols[i % cols.length]; host.appendChild(p); }
  document.body.appendChild(host);
  setTimeout(() => host.remove(), 4200);
}
