/* ============================================================
   ANIMATION LOOK + GALLERY (v2.2 wave 1). The page side of the registry
   (71-anim-registry.js, pure) and its packs (72-anim-pack-*.js):
     animLook()               the user's look prefs (data key animPrefs.look)
     animLookSave(patch)      save them (saveData) and re-apply the theme
     animTodayLook()          {slot: ref} for today (seeded; the same all day)
     animToday(slot)          today's item for a slot (or null)
     animBlocked(ref)         blocked in the gallery (celebrations skip it)
     animThemeApply()         html[data-anim-theme] (the style layer), the
                              sketch filter, and the css of add-on packs
     animGalleryRender(el)    Settings > Animations > Animation gallery
   Favourites, blocks, pins, packs on/off and the theme are data
   (state.animPrefs.look), so they follow the user to every device.
   ============================================================ */
let _agMemo = { key: '', look: null };
let _agUI = { by: 'slot', slot: 'event-scene', pack: 'core', q: '', sel: null, page: 0 };
/** Bound the amount of illustrated SVG in the gallery, without hiding later scenes. */
function animGalleryPage(items, page) {
  const size = 80, pages = Math.max(1, Math.ceil(items.length / size));
  page = Math.max(0, Math.min(pages - 1, Math.floor(Number(page) || 0)));
  const start = page * size;
  return { page, pages, start, end: Math.min(items.length, start + size), items: items.slice(start, start + size) };
}

function animLook() {
  const raw = state.animPrefs && typeof state.animPrefs === 'object' ? state.animPrefs.look : null;
  // The achievements earned unlock their rewards (78-achievements.js); kept out of the saved look.
  const unlocked = typeof achUnlockedIds === 'function' ? achUnlockedIds() : [];
  return animLookNormalize(Object.assign({}, raw && typeof raw === 'object' ? raw : {}, { unlocked }));
}
function animLookSave(patch) {
  const look = animLookNormalize(Object.assign(animLook(), patch || {}));
  delete look.unlocked;
  state.animPrefs = Object.assign({}, state.animPrefs || {}, { look });
  _agMemo.key = '';
  saveData();
  animThemeApply();
}
function _agLevel() { return window.Motion && Motion.level ? Motion.level() : 'standard'; }
function animTodayLook() {
  const day = todayStr(), look = animLook(), lv = _agLevel();
  const ctx = Object.assign(typeof animCtx === 'function' ? animCtx() : {}, { level: lv });   // the when() rules (78-anim-wire.js)
  const key = day + '|' + JSON.stringify(ctx) + '|' + JSON.stringify(look);
  if (_agMemo.key !== key) _agMemo = { key, look: animDailyLook(day, look, ctx) };
  return _agMemo.look;
}
function animToday(slot) { const r = animTodayLook()[slot]; return r ? animItem(r) : null; }
function animBlocked(ref) { return animLook().block.includes(ref); }

/* ---------- the style layer ---------- */
const _AG_SKETCH_DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>'
  + '<filter id="ap-sketch-f" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3" result="n"/>'
  + '<feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg>';
function animThemeApply() {
  const html = document.documentElement;
  const th = animThemeFor(todayStr(), animLook());
  if (html.getAttribute('data-anim-theme') !== th) html.setAttribute('data-anim-theme', th);
  const tx = typeof animPageTx === 'function' ? animPageTx() : 'fade';   // the section entrance (71-anim-wire.css)
  if (html.getAttribute('data-ap-page-tx') !== tx) html.setAttribute('data-ap-page-tx', tx);
  if (typeof animMomentsApply === 'function') animMomentsApply();   // the moment styles (78-anim-moments.js)
  if (!document.getElementById('ap-defs') && document.body) {
    const d = document.createElement('div'); d.id = 'ap-defs'; d.hidden = true; d.innerHTML = _AG_SKETCH_DEFS; document.body.appendChild(d);
  }
  const off = animLook().packsOff;
  for (const p of animPacks()) {
    if (!p.css) continue;
    const id = 'ap-css-' + p.id;
    let st = document.getElementById(id);
    if (!st) { st = document.createElement('style'); st.id = id; st.textContent = p.css; document.head.appendChild(st); }
    else if (st.textContent !== p.css) st.textContent = p.css;   // the "mine" pack changes as the user saves and deletes
    st.disabled = off.includes(p.id);
  }
}

/* ---------- the gallery (Settings > Animations) ---------- */
function _agBtn(ic, label, on, fn) {
  const b = document.createElement('button'); b.type = 'button';
  b.className = 'btn btn-ghost btn-sm btn-icon ag-act' + (on ? ' is-on' : '');
  b.setAttribute('aria-label', label); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('data-tip', label);
  b.innerHTML = icon(ic, 'i-sm'); b.onclick = (e) => { e.stopPropagation(); fn(); };
  return b;
}
function _agToggle(list, ref) { return list.includes(ref) ? list.filter(x => x !== ref) : [...list, ref]; }
function _agSlotLabel(id) { const s = ANIM_SLOTS.find(x => x.id === id); return s ? s.label : id; }

function animGalleryRender(el) {
  const look = animLook(), today = animTodayLook();
  const reduced = !!(window.Motion && Motion.prefersReduced && Motion.prefersReduced());
  const root = document.createElement('section'); root.className = 'apg'; root.setAttribute('aria-label', 'Animation gallery');
  const total = animItems({}).length;
  root.innerHTML = `<div class="anim-gallery-h"><h3>Animation gallery</h3><span class="muted">${esc(total)} animations in ${esc(animPacks().length)} pack${animPacks().length === 1 ? '' : 's'}</span></div>`;

  // Today's look
  const strip = document.createElement('div'); strip.className = 'apg-today';
  strip.innerHTML = `<div class="apg-sub">Today's look <span class="muted">· picked fresh each day; pin one to keep it</span></div>`;
  const row = document.createElement('div'); row.className = 'apg-today-row';
  for (const s of ANIM_SLOTS) {
    const it = today[s.id] ? animItem(today[s.id]) : null;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'apg-today-tile anim-hover-host';
    if (_agUI.by === 'slot' && _agUI.slot === s.id) b.setAttribute('aria-current', 'true');
    b.innerHTML = (it ? animItemHtml(it, { size: 'md', hover: true, reduced }) : '<span class="apg-none">—</span>') + `<span>${esc(s.label)}</span>`;
    b.setAttribute('data-tip', it ? it.label + (look.pin[s.id] === it.ref ? ' (pinned)' : '') : 'Nothing: every one is blocked');
    b.onclick = () => { if (_agUI.by === 'slot' && _agUI.slot === s.id) return; _agUI.by = 'slot'; _agUI.slot = s.id; _agUI.sel = it ? it.ref : null; _agUI.q = ''; _agUI.page = 0; render(); };
    row.appendChild(b);
  }
  strip.appendChild(row);
  root.appendChild(strip);

  // Theme
  const th = document.createElement('div'); th.className = 'apg-themes';
  th.innerHTML = '<div class="apg-sub">Theme <span class="muted">· a style for every animation</span></div>';
  const trow = document.createElement('div'); trow.className = 'apg-theme-row'; trow.setAttribute('role', 'radiogroup'); trow.setAttribute('aria-label', 'Animation theme');
  const sample = animToday('symbol') || animItems({ slot: 'symbol' })[0];
  for (const t of ANIM_THEMES) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'apg-theme anim-hover-host'; b.setAttribute('role', 'radio');
    const on = !look.themeDaily && look.theme === t.id;
    b.setAttribute('aria-checked', on ? 'true' : 'false'); b.setAttribute('data-tip', t.hint);
    if (!animThemeOpen(t.id, look)) {   // earned with an achievement (78-achievements.js)
      const d = typeof achDef === 'function' ? achDef(t.unlock) : null;
      b.classList.add('is-locked'); b.disabled = true; b.setAttribute('data-tip', `Locked: ${d ? d.label + '. ' + d.hint : 'earn an achievement'}`);
      b.innerHTML = `<span class="apg-theme-art" data-anim-theme="${t.id}">${icon('lock', 'i-sm')}</span><span>${esc(t.label)}</span>`;
      trow.appendChild(b);
      continue;
    }
    b.innerHTML = `<span class="apg-theme-art" data-anim-theme="${t.id}">${sample ? animItemHtml(sample, { size: 'md', hover: true, reduced }) : ''}</span><span>${esc(t.label)}</span>`;
    b.onclick = () => { if (on) return; animLookSave({ theme: t.id, themeDaily: false }); render(); };
    trow.appendChild(b);
  }
  th.appendChild(trow);
  th.appendChild(_settingsRow('A different theme each day', 'Rotates through the themes, the same one all day.', _settingsSwitch(look.themeDaily, 'A different theme each day', (v) => { animLookSave({ themeDaily: v }); render(); })));
  root.appendChild(th);

  // Packs
  const packs = document.createElement('div'); packs.className = 'apg-packs';
  packs.innerHTML = '<div class="apg-sub">Packs</div>';
  for (const p of animPacks()) {
    const sw = _settingsSwitch(p.core || !look.packsOff.includes(p.id), p.name, (v) => { animLookSave({ packsOff: v ? look.packsOff.filter(x => x !== p.id) : [...look.packsOff, p.id] }); render(); }, p.core);
    const r = _settingsRow(`${p.name} · ${p.items.length}`, p.core ? `${p.description} Always on: it is every slot's fallback.` : p.description, sw);
    packs.appendChild(r);
  }
  // The birthday opening (seasons pack): the day and month only, kept in config.json.
  if (typeof settingsSaveConfig === 'function') {
    const bd = document.createElement('input'); bd.type = 'date'; bd.className = 'control control-sm'; bd.setAttribute('aria-label', 'Your birthday');
    const cur = typeof APP_CONFIG.birthday === 'string' && /^\d{2}-\d{2}$/.test(APP_CONFIG.birthday) ? APP_CONFIG.birthday : '';
    if (cur) bd.value = '2000-' + cur;
    bd.onchange = async () => {
      const v = /^\d{4}-(\d{2}-\d{2})$/.exec(bd.value || '');
      const next = v ? v[1] : null;
      if (await settingsSaveConfig({ birthday: next }, next ? 'Birthday saved: a birthday opening plays that day' : 'Birthday cleared')) { APP_CONFIG.birthday = next; _agMemo.key = ''; }
    };
    packs.appendChild(_settingsRow('Your birthday', 'Only the day and month are kept. Plays a birthday opening and sky on the day.', bd));
  }
  // Regional animations (UK): opt-in, offline (71-uk-counties.js, 78-anim-uk.js).
  if (typeof animUkWhere === 'function') {
    const w = look.ukRegional ? animUkWhere() : null;
    // Only some regions are drawn so far: say plainly when the user's county has no art yet.
    const drawn = [...new Set(animItems({}).filter(it => it.ukRegion).map(it => it.ukRegion))];
    const has = w && animItems({}).some(it => it.county === w.id);
    const nice = (r) => String(r).replace(/-/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
    const gap = w && !has ? ` ${w.name} has no regional animations yet (drawn so far: ${drawn.length ? drawn.map(nice).join(', ') : 'none'}), so a seasonal scene shows its place name.` : '';
    const now = !look.ukRegional ? '' : w ? ` Now: ${w.name}, near ${w.town} (from ${w.source === 'travel' ? 'your travel location' : 'the weather town'}).${gap}` : ' No UK county found: set a weather town in the UK.';
    packs.appendChild(_settingsRow('Regional animations (UK)', 'Uses your weather location or current travel location offline. Two nearby scenes then one from elsewhere in your county, when local art is available. Openings show the place name and landmark caption. Nothing is sent anywhere.' + now,
      _settingsSwitch(look.ukRegional, 'Regional animations (UK)', (v) => { animLookSave({ ukRegional: v }); if (v) animUkCheck({ first: true }); render(); })));
  }
  root.appendChild(packs);

  // My animations (v2.2 wave 6, 78-anim-make.js): describe one, the assistant draws it.
  if (typeof animMineSection === 'function') root.appendChild(animMineSection(() => render()));

  // Browse
  const bar = document.createElement('div'); bar.className = 'apg-bar';
  const by = _settingsSeg([['slot', 'By slot'], ['pack', 'By pack']], _agUI.by, (k) => { if (k === _agUI.by) return; _agUI.by = k; _agUI.page = 0; render(); });
  const pick = _agUI.by === 'slot'
    ? _settingsSelect(ANIM_SLOTS.map(s => [s.id, `${s.label} (${animItems({ slot: s.id }).length})`]), _agUI.slot, (v) => { _agUI.slot = v; _agUI.sel = null; _agUI.page = 0; paint(); })
    : _settingsSelect(animPacks().map(p => [p.id, `${p.name} (${p.items.length})`]), _agUI.pack, (v) => { _agUI.pack = v; _agUI.sel = null; _agUI.page = 0; paint(); });
  const q = document.createElement('input'); q.className = 'control control-sm'; q.placeholder = 'Filter'; q.value = _agUI.q; q.setAttribute('aria-label', 'Filter animations');
  bar.append(by, pick, q);
  root.appendChild(bar);

  const stage = document.createElement('div'); stage.className = 'apg-stage'; stage.setAttribute('aria-live', 'polite');
  const grid = document.createElement('div'); grid.className = 'anim-gallery apg-grid';
  const paging = document.createElement('nav'); paging.className = 'apg-bar'; paging.setAttribute('aria-label', 'Animation pages');
  root.append(stage, grid, paging);

  function showStage(it) {
    if (!it) { stage.hidden = true; return; }
    stage.hidden = false;
    stage.classList.toggle('is-full', !!it.full);   // a full scene plays large, at 16:9 (71-anim-wire.css)
    const meta = [_agSlotLabel(it.slot), it.mood, it.intensity, it.season === 'any' ? '' : it.season.join(', '), it.region === 'any' ? '' : it.region.join(', '), animPack(it.pack).name].filter(Boolean);
    stage.innerHTML = `<div class="apg-stage-art">${animItemHtml(it, { size: it.full ? 'fill' : 'hero', live: true, reduced })}</div><div class="apg-stage-meta"><b>${esc(it.label)}</b><span class="muted">${esc(meta.join(' · '))}</span><span class="apg-tags">${it.tags.slice(0, 8).map(t => `<span class="chip">${esc(t)}</span>`).join('')}</span></div>`;
    const acts = document.createElement('div'); acts.className = 'apg-stage-acts';
    const replay = document.createElement('button'); replay.type = 'button'; replay.className = 'btn btn-secondary btn-sm'; replay.innerHTML = icon('sparkles', 'i-sm') + '<span>Play again</span>';
    replay.onclick = () => showStage(it);
    acts.appendChild(replay);
    if (it.slot === 'theme-switch') {
      const tryIt = document.createElement('button'); tryIt.type = 'button'; tryIt.className = 'btn btn-secondary btn-sm'; tryIt.innerHTML = icon(state.theme === 'dark' ? 'sun' : 'moon', 'i-sm') + '<span>Try it</span>';
      tryIt.onclick = () => { _shellThemeSwapVariant = it.ref; state.theme = state.theme === 'dark' ? 'light' : 'dark'; saveUI(); render(); };
      acts.appendChild(tryIt);
    }
    stage.querySelector('.apg-stage-meta').appendChild(acts);
  }

  function paint() {
    const lk = animLook(), t = animTodayLook();
    const needle = q.value.trim().toLowerCase();
    const items = animItems(_agUI.by === 'slot' ? { slot: _agUI.slot } : { pack: _agUI.pack })
      .filter(it => !needle || it.label.toLowerCase().includes(needle) || it.tags.some(x => String(x).includes(needle)) || it.id.includes(needle)
        || String(it.ukTown || '').toLowerCase().includes(needle) || String(it.ukLocality || '').toLowerCase().includes(needle));
    const page = animGalleryPage(items, _agUI.page); _agUI.page = page.page;
    paging.replaceChildren(); paging.hidden = page.pages <= 1;
    const range = document.createElement('span'); range.className = 'muted'; range.setAttribute('aria-live', 'polite');
    range.textContent = `${items.length ? page.start + 1 : 0}–${page.end} of ${items.length} scenes`;
    for (const [label, delta] of [['Previous', -1], ['Next', 1]]) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-secondary btn-sm'; button.textContent = label;
      button.disabled = delta < 0 ? page.page === 0 : page.page === page.pages - 1;
      button.onclick = () => { _agUI.page += delta; paint(); grid.querySelector('[tabindex="0"]')?.focus(); };
      paging.appendChild(button);
    }
    paging.insertBefore(range, paging.lastChild);
    grid.replaceChildren();
    for (const it of page.items) {
      const f = document.createElement('figure');
      const fav = lk.fav.includes(it.ref), blk = lk.block.includes(it.ref), pin = lk.pin[it.slot] === it.ref, packOff = !animPack(it.pack).core && lk.packsOff.includes(it.pack);
      if (animLocked(it, lk)) {   // a reward not earned yet: a still silhouette and how to earn it
        const d = typeof achDef === 'function' ? achDef(it.unlock) : null;
        f.className = 'ag-item apg-item is-locked';
        f.setAttribute('aria-label', `${it.label}, locked`);
        f.setAttribute('data-tip', d ? `${d.label}: ${d.hint}` : 'Locked');
        f.innerHTML = `${animItemHtml(it, { size: 'lg', reduced: true })}<span class="apg-lock">${icon('lock', 'i-xs')}</span><figcaption><b>${esc(it.label)}</b><span>${esc(d ? 'Unlock: ' + d.label : 'Locked')}</span></figcaption>`;
        grid.appendChild(f);
        continue;
      }
      f.className = 'ag-item apg-item anim-hover-host' + (blk || packOff ? ' is-blocked' : '') + (t[it.slot] === it.ref ? ' is-today' : '') + (_agUI.sel === it.ref ? ' is-sel' : '');
      f.tabIndex = 0; f.setAttribute('role', 'button'); f.setAttribute('aria-label', `Preview ${it.label}`);
      f.innerHTML = `${animItemHtml(it, { size: 'lg', hover: true, reduced })}<figcaption><b>${esc(it.label)}</b><span>${esc(_agUI.by === 'slot' ? animPack(it.pack).name : _agSlotLabel(it.slot))}${t[it.slot] === it.ref ? ' · today' : ''}</span></figcaption>`;
      const acts = document.createElement('div'); acts.className = 'apg-acts';
      acts.append(
        _agBtn('star', fav ? 'Favourite (comes up more often)' : 'Favourite', fav, () => { animLookSave({ fav: _agToggle(lk.fav, it.ref) }); paint(); }),
        _agBtn('pin', pin ? 'Pinned for this slot' : 'Pin for this slot', pin, () => { const p = Object.assign({}, lk.pin); if (pin) delete p[it.slot]; else p[it.slot] = it.ref; animLookSave({ pin: p }); render(); }),
        _agBtn('eye-off', blk ? 'Blocked (never picked)' : 'Block', blk, () => { animLookSave({ block: _agToggle(lk.block, it.ref) }); render(); }));
      f.appendChild(acts);
      const open = () => { if (_agUI.sel === it.ref) return; _agUI.sel = it.ref; grid.querySelectorAll('.is-sel').forEach(x => x.classList.remove('is-sel')); f.classList.add('is-sel'); showStage(it); };
      f.onclick = open;
      f.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };
      grid.appendChild(f);
    }
    if (!items.length) grid.innerHTML = '<p class="muted">Nothing matches.</p>';
    showStage(_agUI.sel ? animItem(_agUI.sel) : null);
  }
  q.oninput = () => { _agUI.q = q.value; _agUI.page = 0; paint(); };
  paint();
  el.appendChild(root);
}
