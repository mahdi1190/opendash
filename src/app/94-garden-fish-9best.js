/* ============================================================
   GARDEN, "MY BEST CATCHES": the collection (a tab of the Catch page, docs/dev/GARDEN_TOGETHER.md section 23). Every catch with its size, weight, day, place and number; every variant and how to find it, in plain words; your records;
   and a board of your friends. There is no central server, and the page says so: the friends board is the "user base", and it knows only what friends already share with their garden.

     gardenSpecTab(el, m)            the tab
     gardenVariantEvent(spec, o)     a catch rare enough to stop what you are doing: a card over the garden
     gardenSpecVisitRow(snap)        a friend's best specimens on their visit card
   ============================================================ */
const _gvb = { view: 'catches', kind: '', sort: 'rare', tier: '', id: '', vtier: '' };
const _GVB_VIEWS = Object.freeze([['catches', 'My best catches'], ['records', 'Records'], ['variants', 'Variants'], ['friends', 'Friends board']]);
function _gvbSet(k, v) { const ae = document.activeElement; if (ae && ae.tagName === 'SELECT') ae.blur(); _gvb[k] = v; _gdxRepaintTab(); }   // (a pop-up does not repaint under a focused list: gardenPopupRefresh)
function _gvbPill(v) { const t = gardenVariantTier(v); return t ? _gdpEl('span', 'gd-rar gvb-t-' + t.id, t.label) : null; }

function gardenSpecTab(el) {
  const rows = gardenSpecRows(), all = GARDEN_VARIANTS.length, found = gardenSpecFound();
  const head = _gdpEl('section', 'card gvb-head');
  const nums = _gdpEl('div', 'gvb-nums');
  nums.appendChild(_gdpEl('b', 'gvb-big', `${found} of ${all} variants found`));
  const bar = _gdpEl('span', 'gdc-bar gvb-bar'); bar.innerHTML = `<i style="width:${Math.round(found / all * 100)}%"></i>`; nums.appendChild(bar);
  nums.appendChild(_gdpEl('small', 'muted', rows.length ? `${rows.length} catch${rows.length === 1 ? '' : 'es'} kept. Each has its own size, weight, day and number. When there are too many, the best stay.` : 'Everything you catch is kept here, with its own size, weight, day and number.'));
  head.appendChild(nums);
  head.appendChild(_gdxChips(_GVB_VIEWS, _gvb.view, (k) => _gvbSet('view', k)));
  el.appendChild(head);
  if (_gvb.view === 'records') { _gvbRecords(el, rows); if (!rows.length) el.appendChild(_gdpEl('p', 'muted gdc-none', 'Nothing here yet.')); }
  else if (_gvb.view === 'variants') _gvbVariants(el);
  else if (_gvb.view === 'friends') _gvbFriends(el);
  else _gvbCatches(el, rows);
}

/* ---------- every catch ---------- */
function _gvbRecords(el, rows) {
  const fish = rows.filter(r => r.k === 'f'), best = (list, score) => list.slice().sort((a, b) => score(b) - score(a))[0];
  const items = [];
  if (rows.length) items.push(['Rarest', best(rows, gardenSpecScore)]);
  if (fish.length) { items.push(['Biggest', best(fish, r => Number(r.c) || 0)]); items.push(['Heaviest', best(fish, r => Number(r.g) || 0)]); items.push(['Smallest', best(fish, r => -(Number(r.c) || 0))]); }
  if (!items.length) return;
  const box = _gdpEl('div', 'gvb-records');
  for (const [label, r] of items) {
    const kind = r.k === 'b' ? 'bug' : 'fish', c = _gdpEl('div', 'gvb-record');
    const art = _gdpEl('span', 'gvb-record-art'); art.innerHTML = gardenCatchSvg(kind, r.i, 44, { uid: 'rc' + label + r.key, v: r.v, glow: false }); c.appendChild(art);
    const t = _gdpEl('span', 'gvb-record-t');
    t.appendChild(_gdpEl('small', 'muted', label));
    t.appendChild(_gdpEl('b', null, gardenSpecName(kind, r.i, r.v)));
    t.appendChild(_gdpEl('small', 'muted', `${gardenSpecSize(kind, r.c)} · ${gardenSpecWeight(kind, r.g)}`));
    c.appendChild(t); box.appendChild(c);
  }
  el.appendChild(box);
}
function _gvbCard(r) {
  const kind = r.k === 'b' ? 'bug' : 'fish', def = kind === 'bug' ? gardenBugDef(r.i) : gardenFishDef(r.i); if (!def) return null;
  const t0 = gardenVariantTier(r.v), c = _gdpEl('div', 'gd-card gvb-card' + (t0 ? ' gvb-c-' + t0.id : ''));
  const art = _gdpEl('div', 'gd-card-art'); art.innerHTML = gardenCatchSvg(kind, r.i, 96, { uid: 'sp' + r.key, v: r.v, glow: false }); c.appendChild(art);
  const t = _gdpEl('div', 'gd-card-t');
  t.appendChild(_gdpEl('b', null, gardenSpecName(kind, r.i, r.v)));
  const p = _gvbPill(r.v) || _gdcPill(def.rarity); if (p) t.appendChild(p);
  const q = Number(r.q) ? gardenQuality(r.q).label + ' ' + gardenQuality(r.q).stars : '';
  t.appendChild(_gdpEl('small', 'gd-facts', [gardenSpecSize(kind, r.c), gardenSpecWeight(kind, r.g), q].filter(Boolean).join(' · ')));
  t.appendChild(_gdpEl('small', 'muted', [gardenSpecDay(r.d), gardenSpecWhere(r), gardenSpecWith(r)].filter(Boolean).join(' · ')));
  t.appendChild(_gdpEl('small', 'muted', `No. ${Number(r.n) || 0}${r.s ? ' · sold, still in your records' : ''}`));
  c.appendChild(t);
  const f = _gdpEl('div', 'gd-card-f'), on = gardenSpecIsPinned(r.key);
  const b = _gdpBtn(on ? 'On show' : 'Show it off', { icon: on ? 'check' : 'trophy', kind: on ? 'btn-secondary' : 'btn-ghost', tip: `Put this very one in your ${kind === 'bug' ? 'bug case' : 'tank'}, for friends to see`, disabled: on, run: () => _gdcSay(gardenSpecPin(r.key)) });
  f.appendChild(b); c.appendChild(f);
  return c;
}
function _gvbCatches(el, rows) {
  if (!rows.length) { const e = _gdpEl('div', 'card gdc-empty'); e.innerHTML = `${icon('fish')}<div><b>Nothing here yet</b><br><span class="muted">Catch a fish or a bug and it will be here. Now and then one is something special: a glowing perch, say, or a golden beetle.</span></div>`; el.appendChild(e); return; }
  const bar = _gdpEl('div', 'gdc-filters gvb-filters');
  bar.appendChild(_gdxChips([['', 'Fish and bugs'], ['f', 'Fish'], ['b', 'Bugs']], _gvb.kind, (k) => { _gvb.id = ''; _gvbSet('kind', k); }));
  bar.appendChild(_gdxChips([['rare', 'Rarest'], ['big', 'Biggest'], ['new', 'Newest']], _gvb.sort, (k) => _gvbSet('sort', k)));
  const tiers = [['', 'Any rarity'], ['plain', 'Ordinary']].concat(Object.values(GARDEN_VARIANT_TIERS).map(t => [t.id, t.label]));
  const sel = _gdpEl('select', 'control gvb-sel'); sel.setAttribute('aria-label', 'Rarity');
  for (const [k, label] of tiers) { const o = document.createElement('option'); o.value = k; o.textContent = label; if (k === _gvb.tier) o.selected = true; sel.appendChild(o); }
  sel.onchange = () => _gvbSet('tier', sel.value); bar.appendChild(sel);
  // by kind: only the kinds you have
  const kinds = new Map(); for (const r of rows) if (!_gvb.kind || r.k === _gvb.kind) { const d = _gspDef(r); if (d) kinds.set(r.k + '|' + r.i, d.name); }
  const sk = _gdpEl('select', 'control gvb-sel'); sk.setAttribute('aria-label', 'Kind');
  { const o = document.createElement('option'); o.value = ''; o.textContent = 'Every kind'; sk.appendChild(o); }
  for (const [k, name] of [...kinds.entries()].sort((a, b) => a[1].localeCompare(b[1]))) { const o = document.createElement('option'); o.value = k; o.textContent = name; if (k === _gvb.id) o.selected = true; sk.appendChild(o); }
  sk.onchange = () => _gvbSet('id', sk.value); bar.appendChild(sk);
  el.appendChild(bar);
  let list = rows;
  if (_gvb.kind) list = list.filter(r => r.k === _gvb.kind);
  if (_gvb.id) list = list.filter(r => r.k + '|' + r.i === _gvb.id);
  if (_gvb.tier) list = list.filter(r => (_gvb.tier === 'plain' ? !gardenVariantTier(r.v) : (gardenVariantTier(r.v) || {}).id === _gvb.tier));
  const by = _gvb.sort === 'big' ? (r) => (r.k === 'b' ? (Number(r.c) || 0) / 10 : Number(r.c) || 0) : _gvb.sort === 'new' ? (r) => Number(r.n) || 0 : gardenSpecScore;
  list = list.slice().sort((a, b) => by(b) - by(a));
  const place = ['best', _gvb.kind, _gvb.sort, _gvb.tier, _gvb.id].join(':');
  gardenPager(el, { key: place, items: list, grid: 'gd-grid gdc-grid gvb-grid gpg-gear', row: 232, rowSm: 232, draw: _gvbCard, none: 'Nothing here with those filters.' });
}

/* ---------- every variant, and how to find it ---------- */
function _gvbVariants(el) {
  const g = _gdG(), intro = _gdpEl('p', 'muted gdc-intro');
  intro.textContent = 'Any fish or bug can turn out to be one of these. It is decided the moment it appears, so you can spot it in the water. The chances below are real: they are what the game uses.';
  el.appendChild(intro);
  // one kind of rarity at a time, what you have found first
  const tiers = Object.values(GARDEN_VARIANT_TIERS), cur = tiers.some(t => t.id === _gvb.vtier) ? _gvb.vtier : tiers[0].id;
  el.appendChild(_gdxChips(tiers.map(t => [t.id, `${t.label} ${GARDEN_VARIANTS.filter(V => V.tier === t.id && g.vl[V.id]).length}/${GARDEN_VARIANTS.filter(V => V.tier === t.id).length}`]), cur, (k) => { _gvb.vtier = k; _gdxRepaintTab(); }));
  const t = tiers.find(x => x.id === cur), place = 'best:variants:' + cur, cmp = (a, b) => (g.vl[a.id] ? 0 : 1) - (g.vl[b.id] ? 0 : 1) || String(a.name).localeCompare(b.name);
  gardenPager(el, { key: place, items: gardenPagerOrder(place, GARDEN_VARIANTS.filter(V => V.tier === t.id), V => V.id, cmp), grid: 'gd-grid gdc-grid gvb-grid gpg-gear', row: 240, rowSm: 240, draw: (V) => {
    const l = g.vl[V.id], kind = V.for === 'bug' ? 'bug' : 'fish', c = _gdpEl('div', 'gd-card gvb-var' + (l ? ' gvb-c-' + t.id : ' is-unknown'));
    const onId = l && l.i && (gardenFishDef(l.i) || gardenBugDef(l.i)) ? l.i : (kind === 'bug' ? 'small-tortoiseshell' : 'perch');
    const k2 = gardenFishDef(onId) ? 'fish' : 'bug';
    const art = _gdpEl('div', 'gd-card-art'); art.innerHTML = gardenCatchSvg(k2, onId, 96, { uid: 'vv' + V.id, v: V.id, silhouette: !l, glow: false }); c.appendChild(art);
    const b = _gdpEl('div', 'gd-card-t');
    b.appendChild(_gdpEl('b', null, l ? V.name : '???'));
    const p = _gvbPill(V.id); if (p) b.appendChild(p);
    if (l) { b.appendChild(_gdpEl('small', 'gd-facts', `${Number(l.n) || 0} caught · first on ${gardenSpecDay(l.d)}`)); if (V.blurb) b.appendChild(_gdpEl('small', 'muted', V.blurb)); }
    for (const line of gardenVariantHow(V)) b.appendChild(_gdpEl('small', 'muted gvb-how', line));
    c.appendChild(b);
    return c;
  } });
}

/* ---------- the friends board ---------- */
function _gvbFriends(el) {
  const note = _gdpEl('section', 'card gvb-note');
  note.innerHTML = `${icon('users', 'i-sm')} <span>There is no central server and no list of everyone in the world: Freeflo does not keep one. This board is you and your friends, from what they already share with their garden. It shows only each person's best few catches and how many variants they have found, never where or when. If you turn off sharing your garden with a friend, your catches stop going to them too.</span>`;
  el.appendChild(note);
  if (typeof gardenSocialLoad === 'function') gardenSocialLoad().then(() => { if (_gvb.view === 'friends' && !_gvb.loaded) { _gvb.loaded = true; _gdxRepaintTab(); } }).catch(() => {});
  const B = gardenSpecBoard(), wrap = _gdpEl('div', 'gvb-boards');
  const name = (p) => (p.me ? 'You' : String(p.name).split(/\s+/)[0]);
  const board = (title, ic, rows, line) => {
    const c = _gdpEl('section', 'card gvb-board');
    const h = _gdpEl('div', 'gvb-board-h'); h.innerHTML = icon(ic, 'i-sm'); h.appendChild(_gdpEl('b', null, title)); c.appendChild(h);
    if (!rows.length) c.appendChild(_gdpEl('p', 'muted gvb-none', 'Nobody yet.'));
    rows.slice(0, 10).forEach((x, i) => {
      const r = _gdpEl('div', 'gvb-row' + (x.p.me ? ' is-me' : ''));
      r.appendChild(_gdpEl('span', 'gvb-pos', String(i + 1)));
      if (x.c) { const a = _gdpEl('span', 'gvb-row-art'); a.innerHTML = gardenCatchSvg(x.c.kind, x.c.id, 40, { uid: 'bd' + title.length + i, v: x.c.v, glow: false }); r.appendChild(a); }
      const t = _gdpEl('span', 'gvb-row-t'); t.appendChild(_gdpEl('b', null, name(x.p))); t.appendChild(_gdpEl('small', 'muted', line(x))); r.appendChild(t);
      c.appendChild(r);
    });
    return c;
  };
  const say = (x) => `${gardenSpecName(x.c.kind, x.c.id, x.c.v)}, ${gardenSpecSize(x.c.kind, x.c.c)}`;
  wrap.appendChild(board('Rarest catch', 'gem', B.rarest, say));
  wrap.appendChild(board('Biggest fish', 'trophy', B.biggest, say));
  wrap.appendChild(board('Most variants found', 'sparkles', B.most.map(p => ({ p })), (x) => `${x.p.sp.vn} of ${GARDEN_VARIANTS.length}${x.p.sp.c ? ` · ${x.p.sp.c} catches` : ''}`));
  el.appendChild(wrap);
  if (B.people.length < 2) { const e = _gdpEl('p', 'muted gvb-none'); e.textContent = 'Add friends in Friends, and their best catches will appear here.'; el.appendChild(e); }
  else if (B.quiet) el.appendChild(_gdpEl('p', 'muted gvb-none', `${B.quiet} friend${B.quiet === 1 ? ' has' : 's have'} nothing to show here yet: they may not have updated, or may not share their garden with you.`));
}

/* ---------- a friend's best, on their visit card ---------- */
function gardenSpecVisitRow(snap) {
  const sp = snap ? gardenSpecClean(snap.sp) : null; if (!sp || (!sp.f.length && !sp.b.length)) return null;
  const box = _gdpEl('div', 'gvb-visit');
  box.appendChild(_gdpEl('small', 'muted', `Their best catches${sp.vn ? ` · ${sp.vn} of ${GARDEN_VARIANTS.length} variants found` : ''}`));
  const row = _gdpEl('div', 'gdc-visit-row');
  const add = (kind, x, i) => {
    const s = _gdpEl('span', 'gdc-visit-i' + (kind === 'bug' ? ' is-bug' : '')), v = x[1] === '-' ? '' : x[1];
    s.innerHTML = gardenCatchSvg(kind, x[0], kind === 'bug' ? 44 : 62, { uid: 'vs' + kind + i, v, glow: false });
    s.appendChild(_gdpEl('small', null, gardenSpecSize(kind, x[2]))); s.setAttribute('data-tip', gardenSpecName(kind, x[0], v)); row.appendChild(s);
  };
  sp.f.forEach((x, i) => add('fish', x, i)); sp.b.forEach((x, i) => add('bug', x, i));
  box.appendChild(row);
  return box;
}

/* ---------- once in a lifetime: it stops what you are doing, for a moment ---------- */
function gardenVariantEvent(spec, o) {
  o = o || {};
  const box = typeof _gdgBox === 'function' ? _gdgBox() : null, t = gardenVariantTier(spec.v); if (!box || !t || t.rank < 4 || gardenFun() === 'off') return false;
  const old = box.querySelector('.gvb-event'); if (old) old.remove();
  const el = document.createElement('div'); el.className = 'gvb-event gvb-e-' + t.id; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', t.label);
  const card = _gdpEl('div', 'gvb-event-card');
  card.appendChild(_gdpEl('div', 'gvb-event-tier', t.label + '!'));
  const art = _gdpEl('div', 'gvb-event-art'); art.innerHTML = spec.art(240); card.appendChild(art);
  card.appendChild(_gdpEl('b', 'gvb-event-name', `${_gscA(spec.name)}!`.replace(/^./, (c) => c.toUpperCase())));
  if (spec.sub) card.appendChild(_gdpEl('span', 'gvb-event-sub', spec.sub));
  card.appendChild(_gdpEl('p', 'gvb-event-p', t.rank >= 5 ? 'Most people will never see one of these.' : 'You could fish for years and never see another.'));
  const close = () => { clearTimeout(tm); el.classList.add('is-out'); setTimeout(() => el.remove(), 260); };
  const row = _gdpEl('div', 'gvb-event-acts');
  row.appendChild(_gdpBtn('See it in my best catches', { icon: 'trophy', kind: 'btn-primary', run: () => { close(); _gdG().prefs.catchTab = 'best'; _gvb.view = 'catches'; gardenCatchOpen('best'); } }));
  row.appendChild(_gdpBtn('Lovely', { kind: 'btn-ghost', run: close }));
  card.appendChild(row); el.appendChild(card);
  box.appendChild(el);
  const tm = setTimeout(close, o.ms || 14000);
  if (typeof _fxSound === 'function') _fxSound('chime');
  return true;
}
