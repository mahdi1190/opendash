/* ============================================================
   PETS, THE TRICK BOOK: the page (2.23, agent 'craft'). #view=pet:tricks and a panel in the garden. Your pet is on a stage at the top; the book is a grid of what it can do.
   Yours are in colour, in the very pose; the rest are its outline; secrets are ???. Tap one: it does it, live, on your own pet, before you pay a thing. A price is a button. Coins and treats fly when you buy.
     petBookPage(root, o)     fill an element with the book (o.panel: in the garden's pop-up, where a spectacle plays in the world)
     petSecretReveal(id)      the big moment
   ============================================================ */
const _ptb = { sel: '', tier: '', stage: null };
const _PTB_TIERS = Object.freeze(['', 'common', 'rare', 'epic', 'legendary', 'mythical']);
function _ptbEl(t, c, x) { return _ptEl(t, c, x); }
/** The little picture: your pet caught in the telling moment of the trick (a still pose, no timers). */
function _ptbArt(look, row, size) {
  const span = _ptbEl('span', 'ptb-art');
  const clip = row.wow ? null : petClipDef(row.clip);
  const silhouette = !row.owned;
  const pose = clip ? clip.pose : 'sit';
  span.innerHTML = petSvg(look, { size, pose, crop: 'none', shadow: !silhouette, mono: silhouette ? (row.hidden ? '#b8b0c8' : _PT_SIL) : '', mood: clip && clip.face ? clip.face : { eyes: 'happy', mouth: 'smile' } });
  if (clip) { const root = span.firstChild, comp = _pcCompile(clip, _pcOrg(root, clip)), at = (clip.still == null ? 0.5 : clip.still) * clip.ms; requestAnimationFrame(() => { if (!span.isConnected) return; for (const [part, frames] of comp.tracks) for (const el of root.querySelectorAll(_PC_SEL[part])) { try { if (part === 'shadow') { el.style.transformBox = 'fill-box'; el.style.transformOrigin = '50% 50%'; } const a = el.animate(frames, { duration: clip.ms, fill: 'both' }); a.pause(); a.currentTime = at; } catch (e) { /* the plain pose */ } } }); }
  return span;
}
function petBookPage(root, o) {
  o = o || {};
  const g = petGet();
  const wrap = _ptbEl('div', 'ptb' + (o.panel ? ' is-panel' : ''));
  root.appendChild(wrap);
  if (!g.has) { mountEmptyState(wrap, { icon: 'paw-print', compact: true, title: 'Adopt a companion first', text: '' }); return; }
  const stageHost = _ptbEl('div', 'ptb-stage');
  wrap.appendChild(stageHost);
  if (_ptb.stage) { try { _ptb.stage.stop(); } catch (e) { /* gone */ } }
  const S = petStageMount(stageHost, g, { onChange: () => paint(), size: o.panel ? 150 : 190 });
  stageHost.firstChild.classList.add('pts-compact');
  _ptb.stage = S;
  if (!o.panel) { _ptUI.stage = S; }
  const top = _ptbEl('div', 'ptb-top'), list = _ptbEl('div', 'ptb-grid'), side = _ptbEl('div', 'ptb-side');
  const body = _ptbEl('div', 'ptb-body'); body.append(list, side);
  wrap.append(top, body);
  const perform = (row) => {
    if (row.owned && typeof petBookTick === 'function') { const tt = petBookTick('perform'); for (const id of tt.secret) petSecretReveal(id); }
    if (_ptMotionOk() && _ptFun() !== 'off' && row.wow) { if (o.panel && row.owned) { gardenPopupClose(); setTimeout(() => petWowRun(row.def.wow, 'garden'), 260); return; } petWowRun(row.def.wow, S); return; }
    petBookPerformOn(S, row);
  };
  const paint = () => {
    const rows = petBookList(g.look.species).filter(r => r.suits && !r.def.how.free).sort((a, b) => (b.owned - a.owned) || (PET_TIERS[a.tier].rank - PET_TIERS[b.tier].rank));
    const count = petBookCount();
    top.replaceChildren();
    const c = _ptbEl('span', 'ptb-count'); c.innerHTML = icon('wand-sparkles', 'i-sm'); c.appendChild(_ptbEl('b', null, `${count.owned}/${count.total}`)); top.appendChild(c);
    const seg = _ptbEl('div', 'ptb-tiers');
    for (const t of _PTB_TIERS) { const b = _ptbEl('button', 'ptb-tier' + (_ptb.tier === t ? ' is-on' : '')); b.type = 'button'; b.textContent = t ? PET_TIERS[t].label : 'All'; if (t) b.style.setProperty('--tc', PET_TIERS[t].c); b.onclick = () => { _ptb.tier = t; paint(); }; seg.appendChild(b); }
    top.appendChild(seg);
    const treat = _ptCostIcon('treats', petTreats().have, 16); treat.classList.add('ptb-purse'); top.appendChild(treat);
    const w = _ptcWallet(); if (w) { const co = _ptCostIcon('coins', w.coins, 16); co.classList.add('ptb-purse'); top.appendChild(co); }
    const shown = rows.filter(r => !_ptb.tier || r.tier === _ptb.tier);
    list.replaceChildren();
    if (o.panel) list.classList.add('gpg-box');
    gardenPager(list, { key: 'tricks:' + (_ptb.tier || ''), items: shown, grid: 'ptb-cards', row: 128, rowSm: 112, rows: 4, draw: (r) => card(r) });
    paintSide(rows.find(r => r.id === _ptb.sel));
  };
  const card = (r) => {
    const b = _ptbEl('button', 'ptb-card ptr-' + r.tier + (r.owned ? ' is-owned' : ' is-locked') + (r.hidden ? ' is-secret' : '') + (_ptb.sel === r.id ? ' is-sel' : '')); b.type = 'button';
    b.style.setProperty('--tc', PET_TIERS[r.tier].c);
    b.setAttribute('aria-label', r.hidden ? 'A secret trick' : r.def.name);
    b.appendChild(_ptbArt(g.look, r, 78));
    b.appendChild(_ptbEl('span', 'ptb-name', r.hidden ? '???' : r.def.name));
    if (r.wow) { const st = _ptbEl('i', 'ptb-wow'); st.innerHTML = icon('sparkles', 'i-xs'); b.appendChild(st); }
    b.onclick = () => { _ptb.sel = r.id; for (const n of list.querySelectorAll('.ptb-card.is-sel')) n.classList.remove('is-sel'); b.classList.add('is-sel'); paintSide(r); if (!r.hidden) perform(r); };
    return b;
  };
  const paintSide = (r) => {
    side.replaceChildren();
    if (!r) { side.appendChild(_ptbEl('p', 'ptb-tap', 'Tap a trick to see it.')); return; }
    const head = _ptbEl('div', 'ptb-s-h');
    head.appendChild(_ptbEl('b', 'ptb-s-name', r.hidden ? '???' : r.def.name));
    const tag = _ptbEl('span', 'ptb-s-tier', PET_TIERS[r.tier].label); tag.style.setProperty('--tc', PET_TIERS[r.tier].c); head.appendChild(tag);
    side.appendChild(head);
    if (r.hidden) { const n = _ptbEl('p', 'ptb-s-hint'); n.innerHTML = icon('moon', 'i-sm'); n.appendChild(_ptbEl('span', null, 'Nobody can teach this one. It happens when it happens.')); side.appendChild(n); return; }
    const acts = _ptbEl('div', 'ptb-s-acts');
    if (r.owned) acts.appendChild(uiButton({ label: 'Do it', icon: 'play', kind: 'primary', run: () => perform(r) }));
    else {
      for (const [pay, n] of r.pay) {
        const can = pay === 'coins' ? r.canCoins >= n : r.canTreats >= n;
        const btn = uiButton({ label: String(n), icon: pay === 'coins' ? 'coins' : 'cookie', kind: 'primary', cls: 'ptb-buy' + (can ? '' : ' is-off'), run: (e, bb) => {
          if (!can) { _ptDeny(bb, { kind: pay === 'coins' ? 'coins' : '', badge: n, say: `It takes ${n} ${pay}` }); return; }
          const res = petBookBuy(r.id, pay);
          if (!res.ok) { _ptDeny(bb, { kind: res.why === 'coins' ? 'coins' : '', badge: n, say: res.msg || `It takes ${n} ${pay}` }); return; }
          _ptCheer(bb, { tone: 'gold', sound: true, text: 'New!' });
          toast(`${petName(g)} can do ${r.def.name.toLowerCase()}`, { icon: 'wand-sparkles', timeout: 6000, action: { label: 'Undo', run: () => { petBookUndo(r.id); paint(); } } });
          perform(Object.assign({}, r, { owned: true })); paint();
        } });
        acts.appendChild(btn);
      }
      if (r.why) { const n = _ptbEl('p', 'ptb-s-how'); n.appendChild(_ptbEl('span', null, r.why.line)); if (r.why.of) { const bar = _ptBar(Math.round(r.why.have / r.why.of * 100)); n.appendChild(bar); n.appendChild(_ptbEl('small', null, `${r.why.have}/${r.why.of}`)); } side.appendChild(n); }
      acts.appendChild(uiButton({ label: 'See it', icon: 'eye', kind: 'ghost', run: () => perform(r) }));
    }
    side.appendChild(acts);
  };
  paint();
  try { const t = petBookTick(''); if (t.secret.length) for (const id of t.secret) petSecretReveal(id); } catch (e) { /* later */ }
}
/** Perform on a stage: an ordinary clip, or (reduced motion) its still pose. */
function petBookPerformOn(S, r) {
  const clip = r.clip; if (!clip) return;
  const c = petClipDef(clip); if (!c) return;
  if (S.asleep) S.wakeNow && S.wakeNow();
  petWake(60000);
  S.actor.play(clip, c.ms, () => { if (!S.actor.moving) S.actor.draw('sit', { eyes: 'open', mouth: 'smile' }); });
}

/* ---------- a secret found: the big moment ---------- */
const _ptSecq = { q: [], open: false };
function petSecretReveal(id) { if (petBookRow(id)) { _ptSecq.q.push(id); _ptSecretNext(); } }
function _ptSecretNext() {
  if (_ptSecq.open || !_ptSecq.q.length) return;
  if (typeof _ptFun === 'function' && _ptFun() === 'off') { _ptSecq.q.length = 0; return; }
  if (typeof _gw !== 'undefined' && _gw && _gw.reel) { setTimeout(_ptSecretNext, 4000); return; }
  const id = _ptSecq.q.shift(), r = petBookRow(id), g = petGet();
  _ptSecq.open = true;
  const box = _ptbEl('div', 'ptc ptb-reveal' + (_ptMotionOk() ? ' is-live' : ''));
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', `A secret: ${r.name}`);
  const rays = _ptbEl('div', 'ptc-rays'); rays.setAttribute('aria-hidden', 'true'); box.appendChild(rays);
  const card = _ptbEl('div', 'ptc-card ptb-rcard'); card.style.setProperty('--tc', PET_TIERS[r.tier].c);
  const art = _ptbEl('div', 'ptc-art'); art.innerHTML = petSvg(g.look, { size: 220, pose: 'sit', mood: { eyes: 'sparkle', mouth: 'open' }, motion: _ptMotionOk(), crop: 'none', cls: 'pt-fun-full' }); card.appendChild(art);
  const q = _ptbEl('div', 'ptb-rq', '???'); card.appendChild(q);
  const tier = _ptbEl('div', 'ptc-rar', PET_TIERS[r.tier].label); card.appendChild(tier);
  const acts = _ptbEl('div', 'ptc-acts');
  const close = () => { clearTimeout(box._t); box.remove(); _ptSecq.open = false; document.removeEventListener('keydown', onKey, true); setTimeout(_ptSecretNext, 400); };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  document.addEventListener('keydown', onKey, true);
  const see = uiButton({ label: 'Show me', icon: 'sparkles', kind: 'primary', run: () => {
    close();
    const garden = typeof _ptw !== 'undefined' && _ptw.on && _ptw.pets.length;
    if (garden) petWowRun(r.wow, 'garden');
    else if (_ptUI.stage) petWowRun(r.wow, _ptUI.stage);
    else { setView('pet:tricks'); setTimeout(() => { if (_ptb.stage) petWowRun(r.wow, _ptb.stage); }, 900); }
  } });
  acts.appendChild(see);
  card.appendChild(acts);
  box.appendChild(card);
  box.onclick = (e) => { if (e.target === box || e.target === rays) close(); };
  document.body.appendChild(box);
  see.focus();
  _ptCheer(card, { tone: 'gold', sound: true });
  try { if (typeof _fxSound === 'function') _fxSound('choir'); } catch (e) { /* quiet */ }
  // the name comes through the ??? after a beat
  setTimeout(() => { if (!q.isConnected) return; q.textContent = r.name; q.classList.add('is-named'); }, _ptMotionOk() ? 1100 : 0);
  box._t = setTimeout(close, 20000);
}
