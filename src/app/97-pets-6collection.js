/* ============================================================
   PETS, the collection screen and the room (2.23, agent 'pets').
   #view=pet:collection: a progress bar, a grid of every pet (the ones you have
   not met are dark outlines with one short line and an icon saying what to do),
   and a big panel for the one you picked. Text is the name and that one line; the
   rest is pictures. Something you cannot do yet shakes (gameDeny), no messages.
   The room (toys, beds) sits beside the stage on the pet's page.
   ============================================================ */
const _ptCol = { sel: '', filter: 'all' };
const _PT_SIL = '#3c4152';   // the outline of a pet you have not met
const _ptSilCache = new Map();
function _ptSilhouette(id, size) {
  const k = id + '|' + size;
  if (!_ptSilCache.has(k)) _ptSilCache.set(k, petSvg(petDefault(id), { size, pose: 'sit', mono: _PT_SIL, crop: 'none', shadow: false, mood: { eyes: 'open' } }));
  return _ptSilCache.get(k);
}
function _ptCostIcon(pay, n, size) {
  const c = _ptEl('span', 'ptl-cost');
  c.innerHTML = pay === 'coins' ? icon('coins', 'i-xs') : petTreatSvg('cookie', size || 15);
  c.appendChild(_ptEl('b', null, String(n)));
  return c;
}
function _ptBar(pct, cls) {
  const b = _ptEl('span', 'pt-bar' + (cls ? ' ' + cls : ''));
  const f = _ptEl('i'); f.style.width = Math.max(0, Math.min(100, pct)) + '%'; b.appendChild(f);
  return b;
}
function _ptHeartsRow(level) {
  const h = _ptEl('span', 'ptl-lv');
  h.innerHTML = '<svg viewBox="0 0 20 20" width="12" height="12" aria-hidden="true"><path d="M10 17C2 11 2 5 6 4c2-.5 3.4.6 4 2 .6-1.4 2-2.5 4-2 4 1 4 7-4 13z"/></svg>';
  h.appendChild(_ptEl('b', null, String(level)));
  return h;
}
const _PT_FILTERS = Object.freeze([['all', 'Everyone', 'paw-print'], ['mine', 'Mine', 'heart'], ['find', 'To find', 'search'], ['now', 'Ready now', 'sparkles']]);
function _ptCollection(root) {
  petCollectTick();
  const wrap = _ptEl('div', 'ptl');
  const rows = () => petCollection();
  const head = _ptEl('div', 'ptl-head');
  const paintHead = () => {
    head.replaceChildren();
    const c = petCollectCount();
    const cnt = _ptEl('div', 'ptl-count'); cnt.innerHTML = icon('paw-print');
    cnt.appendChild(_ptEl('b', null, String(c.owned))); cnt.appendChild(_ptEl('span', null, '/ ' + c.total));
    head.appendChild(cnt);
    head.appendChild(_ptBar(c.pct, 'ptl-bar'));
    const t = petTreats(), jar = _ptEl('div', 'ptl-wallet');
    jar.appendChild(_ptCostIcon('treats', t.have, 18));
    const w = _ptcWallet(); if (w) jar.appendChild(_ptCostIcon('coins', w.coins));
    jar.firstChild.setAttribute('data-tip', 'Treats'); if (jar.lastChild !== jar.firstChild) jar.lastChild.setAttribute('data-tip', 'Garden coins');
    head.appendChild(jar);
  };
  paintHead();
  wrap.appendChild(head);
  const filters = _ptEl('div', 'ptl-filters'); filters.setAttribute('role', 'group'); filters.setAttribute('aria-label', 'Show');
  const body = _ptEl('div', 'ptl-body');
  const grid = _ptEl('div', 'ptl-grid'), panel = _ptEl('aside', 'ptl-panel');
  body.append(grid, panel);
  wrap.append(filters, body);
  root.appendChild(wrap);
  const paintFilters = (all) => {
    filters.replaceChildren();
    for (const [id, label, ic] of _PT_FILTERS) {
      const n = id === 'mine' ? all.filter(r => r.owned).length : id === 'find' ? all.filter(r => !r.owned).length : id === 'now' ? all.filter(r => r.can).length : all.length;
      const b = _ptEl('button', 'ptl-f' + (_ptCol.filter === id ? ' on' : '')); b.type = 'button';
      b.innerHTML = icon(ic, 'i-sm');
      b.appendChild(_ptEl('span', null, label)); b.appendChild(_ptEl('b', null, String(n)));
      b.setAttribute('aria-pressed', String(_ptCol.filter === id));
      b.onclick = () => { _ptCol.filter = id; paint(); };
      filters.appendChild(b);
    }
  };
  const card = (r) => {
    const c = _ptEl('button', 'ptl-card ptr-' + (PET_RARITY[r.rar] || PET_RARITY[0]).id + (r.owned ? ' is-owned' : ' is-locked') + (r.me ? ' is-me' : '') + (r.can ? ' is-ready' : '') + (r.fresh ? ' is-fresh' : '') + (_ptCol.sel === r.id ? ' is-sel' : ''));
    c.type = 'button'; c.dataset.id = r.id;
    const art = _ptEl('span', 'ptl-art');
    if (r.owned) art.innerHTML = petSvg(r.me ? petGet().look : petRosterLook(r.id), { size: 92, pose: 'sit', crop: 'none', mood: { eyes: 'open', mouth: 'smile' } });
    else { art.innerHTML = _ptSilhouette(r.id, 92); }
    c.appendChild(art);
    const label = r.owned ? r.sp.label : '';
    if (r.owned) {
      c.appendChild(_ptEl('span', 'ptl-name', label));
      c.appendChild(_ptHeartsRow(r.bond ? r.bond.level : 1));
      if (r.me) { const m = _ptEl('span', 'ptl-badge is-with'); m.innerHTML = icon('heart', 'i-xs'); c.appendChild(m); }
      else if (r.out) { const m = _ptEl('span', 'ptl-badge is-out'); m.innerHTML = icon('sprout', 'i-xs'); c.appendChild(m); }
      c.setAttribute('aria-label', `${r.sp.label}, friend level ${r.bond ? r.bond.level : 1}${r.me ? ', with you' : ''}`);
    } else {
      const rt = r.route || { icon: 'lock', line: 'Keep playing' };
      const how = _ptEl('span', 'ptl-how');
      how.innerHTML = rt.type === 'enc' ? petTreatSvg(rt.art, 18) : rt.type === 'treats' ? petTreatSvg('cookie', 16) : icon(rt.icon, 'i-xs');
      how.appendChild(_ptEl('span', null, rt.line));
      c.appendChild(how);
      if (rt.type !== 'enc') c.appendChild(_ptBar(r.pct));
      c.setAttribute('aria-label', `A pet you have not met yet: ${rt.line}`);
    }
    c.onclick = () => { _ptCol.sel = r.id; for (const x of grid.querySelectorAll('.is-sel')) x.classList.remove('is-sel'); c.classList.add('is-sel'); paintPanel(r.id); if (matchMedia('(max-width: 900px)').matches) panel.scrollIntoView({ block: 'nearest' }); };
    return c;
  };
  const paint = () => {
    const all = rows();
    paintFilters(all);
    grid.replaceChildren();
    const show = all.filter(r => (_ptCol.filter === 'all' ? true : _ptCol.filter === 'mine' ? r.owned : _ptCol.filter === 'find' ? !r.owned : r.can));
    for (const r of show) grid.appendChild(card(r));
    if (!show.length) grid.appendChild(emptyLine(_ptCol.filter === 'now' ? 'Nothing ready yet. Keep playing.' : 'Nobody here yet.'));
    if (!_ptCol.sel || !all.some(r => r.id === _ptCol.sel)) _ptCol.sel = (all.find(r => r.can) || all.find(r => !r.owned) || all[0]).id;
    paintPanel(_ptCol.sel);
    petCollectSeen();
  };
  const after = () => { paintHead(); paint(); };
  function paintPanel(id) {
    const r = rows().find(x => x.id === id);
    panel.replaceChildren();
    if (!r) return;
    const box = _ptEl('div', 'ptl-big ptr-' + (PET_RARITY[r.rar] || PET_RARITY[0]).id);
    const scene = _ptEl('div', 'ptl-scene');
    const motion = _ptMotionOk() && _ptFun() !== 'off';
    if (r.owned) scene.innerHTML = petSvg(r.me ? petWithItems(petGet().look, 'me') : petRosterLook(r.id), { size: 220, pose: 'sit', motion, crop: 'none', mood: { eyes: 'open', mouth: 'smile' }, cls: 'pt-fun-full' });
    else scene.innerHTML = petSvg(petDefault(r.id), { size: 220, pose: 'sit', mono: _PT_SIL, crop: 'none', shadow: false, mood: { eyes: 'open' } }) + '<span class="ptl-q" aria-hidden="true">?</span>';
    box.appendChild(scene);
    box.appendChild(_ptEl('div', 'ptl-rar', (PET_RARITY[r.rar] || PET_RARITY[0]).label));
    box.appendChild(_ptEl('h2', 'ptl-title', r.owned ? r.sp.label : '? ? ?'));
    if (r.owned) {
      box.appendChild(_ptEl('p', 'ptl-blurb', r.sp.blurb || ''));
      if (r.bond) { const b = _ptEl('div', 'ptl-bond'); b.appendChild(_ptHeartsRow(r.bond.level)); b.appendChild(_ptBar(r.bond.pct, 'pt-bar-love')); box.appendChild(b); }
      if (r.me && typeof gardenPalRows === 'function') {   // 2.32: the friends it has played with in a live garden
        const pals = gardenPalRows().slice(0, 6);
        if (pals.length) {
          const pl = _ptEl('div', 'ptl-pals');
          pl.appendChild(_ptEl('h3', 'ptl-pals-h', 'Pet friends'));
          for (const x of pals) pl.appendChild(_ptEl('div', 'ptl-pal', `${x.name}\u2019s ${x.species ? x.species.toLowerCase() : 'pet'}: ${x.level >= 3 ? 'best pals' : x.level === 2 ? 'pals' : 'met'}, ${x.days} ${x.days === 1 ? 'day' : 'days'} together`));
          box.appendChild(pl);
        }
      }
      const acts = _ptEl('div', 'ptl-acts');
      if (r.me) { const with_ = _ptEl('span', 'ptl-with'); with_.innerHTML = icon('heart', 'i-sm'); with_.appendChild(_ptEl('span', null, 'With you')); acts.appendChild(with_); }
      else {
        acts.appendChild(uiButton({ label: 'Be with me', icon: 'heart', kind: 'primary', run: () => { const x = petChoose(r.id); if (x.ok) { _ptCheer(scene, {}); after(); } } }));
        const out = uiButton({ label: r.out ? 'Bring in' : 'In the garden', icon: 'sprout', kind: r.out ? 'secondary' : 'ghost', run: (e, btn) => { const x = petPackToggle(r.id); if (!x.ok) { _ptDeny(btn || out); return; } after(); } });
        acts.appendChild(out);
      }
      box.appendChild(acts);
    } else {
      const rt = r.route || { icon: 'lock', line: 'Keep playing' };
      const how = _ptEl('div', 'ptl-howbig');
      how.innerHTML = rt.type === 'enc' ? petTreatSvg(rt.art, 34) : rt.type === 'treats' ? petTreatSvg('cookie', 30) : icon(rt.icon);
      how.appendChild(_ptEl('span', null, rt.line));
      box.appendChild(how);
      if (rt.type === 'enc') box.appendChild(_ptLureRow(rt, after, scene));
      else {
        const pr = _ptEl('div', 'ptl-prog'); pr.appendChild(_ptBar(r.pct)); pr.appendChild(_ptEl('span', null, r.have + ' / ' + r.of)); box.appendChild(pr);
        if (r.pay) {
          const b = uiButton({ label: 'Meet it', icon: 'paw-print', kind: r.can ? 'primary' : 'secondary', run: () => {
            const res = petUnlock(r.id);
            if (!res.ok) { _ptDeny(b, { kind: res.why === 'coins' ? 'coins' : '', badge: r.of, say: 'Not enough ' + r.pay }); const w0 = head.querySelector('.ptl-wallet'); if (w0) { w0.classList.remove('pts-wobble'); void w0.offsetWidth; w0.classList.add('pts-wobble'); } return; }
            petCelebrate(r.id);
            if (res.spent) toast(`${r.sp.label} joined you`, { icon: 'paw-print', timeout: 7000, action: { label: 'Undo', run: () => { petUnlockUndo(r.id); after(); } } });
            after();
          } });
          b.appendChild(_ptCostIcon(r.pay, r.of));
          if (!r.can) b.classList.add('is-short');
          box.appendChild(b);
        }
      }
    }
    panel.appendChild(box);
  }
  paint();
  // a pet earned while looking
  document.addEventListener('opendash:pet-new', function fresh() { if (!wrap.isConnected) { document.removeEventListener('opendash:pet-new', fresh); return; } after(); });
}
/** The right lure for a rare visitor: how many you hold, and a button to get one. */
function _ptLureRow(rt, after, near) {
  const l = PET_LURES.find(x => x.id === rt.lure), row = _ptEl('div', 'ptl-lure');
  if (!l) return row;
  const held = petLureHave(l.id);
  const t = _ptEl('div', 'ptl-lure-t'); t.innerHTML = petTreatSvg(l.art, 34);
  t.appendChild(_ptEl('b', null, '× ' + held));
  t.setAttribute('data-tip', l.label); row.appendChild(t);
  const b = uiButton({ label: 'Get one', icon: 'plus', kind: 'secondary', run: () => {
    const r = petLureBuy(l.id);
    if (!r.ok) { _ptDeny(b, { kind: r.why === 'coins' ? 'coins' : '', badge: r.need, say: 'Not enough ' + r.why }); return; }
    _ptCheer(t, {});
    after();
  } });
  b.appendChild(_ptCostIcon(l.treats ? 'treats' : 'coins', l.treats || l.coins));
  row.appendChild(b);
  return row;
}

/* ---------- the room: toys and beds (beside the stage) ---------- */
function _ptRoomCard(S) {
  const sec = _ptEl('section', 'card ptr-room');
  const list = (kind, table, now, set) => {
    const row = _ptEl('div', 'ptr-items');
    for (const x of table) {
      const key = kind + ':' + x.id, own = petOwnsExtra(key), on = now === x.id;
      const b = _ptEl('button', 'ptr-item' + (on ? ' is-on' : '') + (own ? '' : ' is-locked')); b.type = 'button';
      b.innerHTML = petPropSvg(kind, x.id, kind === 'bed' ? 58 : 40);
      b.setAttribute('aria-label', x.label + (own ? '' : x.bondAny ? ': friend level ' + x.bondAny : '')); b.setAttribute('data-tip', x.label); b.setAttribute('aria-pressed', String(on));
      if (!own) {
        if (x.bondAny) { const h = _ptEl('span', 'ptl-cost'); h.innerHTML = icon('heart', 'i-xs'); h.appendChild(_ptEl('b', null, String(x.bondAny))); b.appendChild(h); }
        else b.appendChild(_ptCostIcon(x.treats ? 'treats' : 'coins', x.treats || x.coins, 13));
      }
      b.onclick = () => {
        if (!own) {
          const r = petBuy(key);
          if (!r.ok) { _ptDeny(b, r.why === 'bond' ? { kind: 'lock', badge: r.need, say: 'Needs a higher friend level' } : { kind: r.why === 'coins' ? 'coins' : '', badge: r.need, say: 'Not enough ' + r.why }); return; }
          if (r.spent) toast(`${x.label} is yours`, { icon: 'gift', timeout: 6000, action: { label: 'Undo', run: () => { petBuyUndo(key); paint(); if (S) { S.paintHud(); S.refreshProps(); } } } });
          _ptCheer(b, {});
        }
        set(x.id); paint();
        if (S) { S.paintHud(); S.refreshProps(); }
      };
      row.appendChild(b);
    }
    return row;
  };
  const paint = () => {
    sec.replaceChildren();
    const t1 = _ptEl('div', 'ptr-title'); t1.innerHTML = icon('party-popper', 'i-sm'); t1.appendChild(_ptEl('span', null, 'Toys'));
    sec.appendChild(t1);
    sec.appendChild(list('toy', PET_TOYS, petToyNow(), petToySet));
    const t2 = _ptEl('div', 'ptr-title'); t2.innerHTML = icon('bed', 'i-sm'); t2.appendChild(_ptEl('span', null, 'Beds'));
    sec.appendChild(t2);
    sec.appendChild(list('bed', PET_BEDS, petBedNow(), petBedSet));
  };
  paint();
  return sec;
}
/** The way to the collection, beside the stage: a progress bar and the next few outlines. */
function _ptCollectPeek() {
  const sec = _ptEl('button', 'card ptl-peek'); sec.type = 'button';
  const c = petCollectCount(), rows = petCollection();
  const top = _ptEl('div', 'ptl-peek-top');
  const cnt = _ptEl('div', 'ptl-count'); cnt.innerHTML = icon('paw-print');
  cnt.appendChild(_ptEl('b', null, String(c.owned))); cnt.appendChild(_ptEl('span', null, '/ ' + c.total));
  top.appendChild(cnt); top.appendChild(_ptBar(c.pct, 'ptl-bar'));
  sec.appendChild(top);
  const next = rows.filter(r => !r.owned).sort((a, b) => (b.can ? 1 : 0) - (a.can ? 1 : 0) || b.pct - a.pct).slice(0, 3);
  const row = _ptEl('div', 'ptl-peek-row');
  for (const r of next) {
    const it = _ptEl('span', 'ptl-peek-it' + (r.can ? ' is-ready' : ''));
    const a = _ptEl('span', 'ptl-peek-art'); a.innerHTML = _ptSilhouette(r.id, 60); it.appendChild(a);
    const how = _ptEl('span', 'ptl-how');
    how.innerHTML = r.route && r.route.type === 'enc' ? petTreatSvg(r.route.art, 15) : r.route && r.route.type === 'treats' ? petTreatSvg('cookie', 14) : icon(r.route ? r.route.icon : 'lock', 'i-xs');
    how.appendChild(_ptEl('span', null, r.route ? r.route.line : ''));
    it.appendChild(how);
    if (r.route && r.route.type !== 'enc') it.appendChild(_ptBar(r.pct));
    row.appendChild(it);
  }
  sec.appendChild(row);
  sec.setAttribute('aria-label', `Your collection: ${c.owned} of ${c.total} pets`);
  sec.onclick = () => setView('pet:collection');
  return sec;
}
