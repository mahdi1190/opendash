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
let _agUI = { slot: '', pack: '', technique: '', season: '', place: '', q: '', sel: null, page: 0, time: 'live', prefs: false };
/** Bound the amount of illustrated SVG in the gallery, without hiding later scenes. */
function animGalleryPage(items, page) {
  const size = 24, pages = Math.max(1, Math.ceil(items.length / size));
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
  const preferences = document.createElement('details'); preferences.className = 'apg-preferences'; preferences.open = _agUI.prefs;
  preferences.innerHTML = '<summary>Daily look &amp; pack settings</summary>';
  preferences.ontoggle = () => { _agUI.prefs = preferences.open; };

  // Today's look
  const strip = document.createElement('div'); strip.className = 'apg-today';
  strip.innerHTML = `<div class="apg-sub">Today's look <span class="muted">· picked fresh each day; pin one to keep it</span></div>`;
  const row = document.createElement('div'); row.className = 'apg-today-row';
  for (const s of ANIM_SLOTS) {
    const it = today[s.id] ? animItem(today[s.id]) : null;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'apg-today-tile anim-hover-host';
    if (_agUI.slot === s.id) b.setAttribute('aria-current', 'true');
    b.innerHTML = (it ? animItemHtml(it, { size: 'md', hover: true, reduced }) : '<span class="apg-none">—</span>') + `<span>${esc(s.label)}</span>`;
    b.setAttribute('data-tip', it ? it.label + (look.pin[s.id] === it.ref ? ' (pinned)' : '') : 'Nothing: every one is blocked');
    b.onclick = () => { if (_agUI.slot === s.id) return; Object.assign(_agUI, { slot: s.id, pack: '', technique: '', season: '', place: '', sel: it ? it.ref : null, q: '', page: 0 }); render(); };
    row.appendChild(b);
  }
  strip.appendChild(row);
  preferences.appendChild(strip);

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
  preferences.appendChild(th);

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
    packs.appendChild(_settingsRow('Regional animations (UK)', 'Uses your weather or travel location offline. Backgrounds rotate among places within about 25 km. The title stays your location; the corner names the scene. Nothing is sent anywhere.' + now,
      _settingsSwitch(look.ukRegional, 'Regional animations (UK)', (v) => { animLookSave({ ukRegional: v }); if (v) animUkCheck({ first: true }); render(); })));
  }
  preferences.appendChild(packs);

  // My animations (v2.2 wave 6, 78-anim-make.js): describe one, the assistant draws it.
  if (typeof animMineSection === 'function') preferences.appendChild(animMineSection(() => render()));

  // Search spans the whole catalogue by default, including retained old-technique drawings.
  const catalogue = animGalleryCatalogue(animItems({}));
  const originals = catalogue.length - total;
  if (originals) root.querySelector('.anim-gallery-h .muted').textContent = `${total} animations in ${animPacks().length} packs · ${originals} retained originals`;
  const byRef = new Map(catalogue.map(it => [it.ref, it]));
  const search = document.createElement('div'); search.className = 'apg-search';
  search.innerHTML = `<label for="apg-search">Find a location or animation</label><span class="apg-search-input"><span class="apg-search-icon">${icon('search', 'i-sm')}</span></span><p class="apg-search-hint" id="apg-search-hint">Try Fleet Pond, Tokyo, Texas or a landmark. Search covers every pack; choose a result to see its views and seasons.</p>`;
  const q = document.createElement('input'); q.type = 'search'; q.id = 'apg-search'; q.className = 'control'; q.placeholder = 'Type a town, country, landmark or animation…'; q.value = _agUI.q;
  q.setAttribute('aria-describedby', 'apg-search-hint'); q.autocomplete = 'off'; q.maxLength = 160;
  search.querySelector('.apg-search-input').appendChild(q);
  root.appendChild(search);
  const bar = document.createElement('div'); bar.className = 'apg-browser-bar';
  const fields = {};
  function field(key, title, options) {
    const label = document.createElement('label'); label.className = 'apg-field'; label.innerHTML = `<span>${esc(title)}</span>`;
    const select = _settingsSelect(options, _agUI[key], v => { if (_agUI[key] === v) return; _agUI[key] = v; _agUI.place = ''; _agUI.page = 0; paint(); });
    select.setAttribute('aria-label', title); fields[key] = select; label.appendChild(select); bar.appendChild(label);
  }
  field('pack', 'Pack', [['', 'All packs'], ...animPacks().map(p => [p.id, `${p.name} (${p.items.length})`])]);
  field('slot', 'Animation type', [['', 'All types'], ...ANIM_SLOTS.map(s => [s.id, s.label])]);
  field('season', 'Season', [['', 'All seasons'], ['spring', 'Spring'], ['summer', 'Summer'], ['autumn', 'Autumn'], ['winter', 'Winter']]);
  const techniques = document.createElement('div'); techniques.className = 'apg-techniques'; techniques.setAttribute('role', 'group'); techniques.setAttribute('aria-label', 'Drawing technique');
  const techniqueButtons = [];
  for (const [key, label] of [['', 'All techniques'], ['new', 'New technique'], ['old', 'Old technique']]) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'apg-filter-btn'; b.textContent = label;
    b.onclick = () => { if (_agUI.technique === key) return; _agUI.technique = key; _agUI.page = 0; paint(); };
    techniqueButtons.push([key, label, b]); techniques.appendChild(b);
  }
  const techniqueHint = document.createElement('p'); techniqueHint.className = 'apg-search-hint'; techniqueHint.textContent = 'New technique: scene engine. Old technique: original SVG drawing. Saved originals appear alongside their upgrades.';
  const results = document.createElement('div'); results.className = 'apg-results-head';
  const count = document.createElement('span'); count.setAttribute('role', 'status'); count.setAttribute('aria-atomic', 'true');
  const clear = document.createElement('button'); clear.type = 'button'; clear.className = 'btn btn-ghost btn-sm'; clear.textContent = 'Clear filters'; clear.onclick = reset;
  results.append(count, clear);
  const places = document.createElement('div'); places.className = 'apg-places'; places.setAttribute('role', 'group'); places.setAttribute('aria-label', 'Matching locations');
  const stage = document.createElement('div'); stage.className = 'apg-stage'; stage.setAttribute('aria-label', 'Selected animation preview');
  const grid = document.createElement('div'); grid.className = 'anim-gallery apg-grid';
  const paging = document.createElement('nav'); paging.className = 'apg-paging'; paging.setAttribute('aria-label', 'Animation pages');
  root.append(bar, techniques, techniqueHint, results, places, stage, grid, paging, preferences);
  let searchTimer = 0, replayGeneration = 0;
  function reset() {
    clearTimeout(searchTimer);
    Object.assign(_agUI, { q: '', pack: '', slot: '', season: '', technique: '', place: '', sel: null, page: 0 });
    q.value = ''; for (const s of Object.values(fields)) s.value = '';
    paint(); q.focus();
  }
  function badgeHtml(it) {
    const info = animGalleryInfo(it);
    return `<span class="apg-badge is-${info.technique}">${esc(info.techniqueLabel)}</span>`
      + (info.variantLabel ? `<span class="apg-badge">${esc(info.variantLabel)}</span>` : '');
  }
  function selectItem(it) {
    if (_agUI.sel === it.ref) return;
    _agUI.sel = it.ref;
    grid.querySelectorAll('[data-gallery-ref]').forEach(f => {
      const on = f.getAttribute('data-gallery-ref') === it.ref;
      f.classList.toggle('is-sel', on); f.querySelector('.apg-preview-button')?.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    showStage(it);
  }

  function showStage(it, again) {
    if (!it || animLocked(it, animLook())) { stage.hidden = true; stage.replaceChildren(); stage.removeAttribute('data-ref'); return; }
    // The same item already on the stage keeps playing (a repaint of the grid must not rebuild a 1 MB scene).
    const stageKey = it.ref + '|' + _agUI.time;
    if (!again && !stage.hidden && stage.getAttribute('data-ref') === stageKey && stage.querySelector('.anim-scene')) return;
    stage.setAttribute('data-ref', stageKey);
    if (again) replayGeneration++;
    stage.hidden = false;
    stage.classList.toggle('is-full', !!it.full);   // a full scene plays large, at 16:9 (71-anim-wire.css)
    const info = animGalleryInfo(it), pk = animPack(it.pack);
    const art = time => animItemHtml(it, Object.assign({ size: it.full ? 'fill' : 'hero', live: true, reduced }, animGalleryPreviewOptions(it, time)));
    const allTimes = it.full && _agUI.time === 'all';
    const picture = allTimes ? `<div class="apg-time-comparison">${[['dawn', 'Dawn'], ['day', 'Day'], ['dusk', 'Dusk'], ['night', 'Night']].map(([key, label]) => `<figure class="apg-time-preview" data-scene-key="gallery-${esc(it.ref)}-${key}-${replayGeneration}"><div class="apg-time-art">${art(key)}</div><figcaption>${label}</figcaption></figure>`).join('')}</div>` : `<div class="apg-stage-art" data-scene-key="gallery-${esc(it.ref)}-${esc(_agUI.time)}-${replayGeneration}">${art(_agUI.time)}</div>`;
    stage.innerHTML = `${picture}<div class="apg-stage-meta"><b class="apg-stage-title">${esc(it.label)}</b><span class="muted">${esc([info.placeLabel, pk ? pk.name : it.pack, _agSlotLabel(it.slot)].filter(Boolean).join(' · '))}</span><span class="apg-badges">${badgeHtml(it)}</span></div>`;
    const stageMeta = stage.querySelector('.apg-stage-meta');
    if (it.full) {
      const times = document.createElement('div'); times.className = 'apg-time-row'; times.setAttribute('role', 'group'); times.setAttribute('aria-label', 'Preview time of day');
      times.innerHTML = '<span class="muted">Time of day</span>';
      for (const [key, label] of [['live', 'Live'], ['dawn', 'Dawn'], ['day', 'Day'], ['dusk', 'Dusk'], ['night', 'Night'], ['all', 'All times']]) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.setAttribute('aria-pressed', _agUI.time === key ? 'true' : 'false');
        b.onclick = () => { if (_agUI.time === key) return; _agUI.time = key; showStage(it); stage.querySelector(`.apg-time-row button[data-time="${key}"]`)?.focus(); };
        b.dataset.time = key; times.appendChild(b);
      }
      stageMeta.appendChild(times);
      const note = document.createElement('span'); note.className = 'muted'; note.textContent = 'Preview lighting only. Live follows your clock; fixed times use a clear equinox sky. Original drawings may use a simpler evening tint.';
      stageMeta.appendChild(note);
    }
    if (info.placeKey) {
      const siblings = catalogue.filter(x => animGalleryInfo(x).placeKey === info.placeKey);
      if (siblings.length > 1) {
        const versions = document.createElement('div'); versions.className = 'apg-versions';
        versions.innerHTML = `<div class="apg-sub">All versions at this location (${siblings.length})</div>`;
        function chooseVersion(other) {
          if (_agUI.sel === other.ref) return;
          Object.assign(_agUI, { sel: other.ref, pack: '', slot: '', season: '', technique: '', place: info.placeKey, q: '', page: 0 });
          q.value = ''; for (const s of Object.values(fields)) s.value = '';
          paint();
        }
        let groups = 0;
        for (const [key, label, labelKey] of [['view', 'View', 'viewLabel'], ['season', 'Season', 'seasonLabel'], ['technique', 'Technique', 'techniqueLabel']]) {
          const values = [...new Set(siblings.map(x => animGalleryInfo(x)[key]).filter(Boolean))];
          if (values.length <= 1) continue;
          groups++;
          const variants = document.createElement('div'); variants.className = 'apg-variants'; variants.setAttribute('role', 'group'); variants.setAttribute('aria-label', `Location ${label.toLowerCase()} versions`);
          variants.innerHTML = `<span class="muted">${label}</span>`;
          for (const value of values) {
            const candidates = siblings.filter(x => animGalleryInfo(x)[key] === value);
            const score = x => { const xi = animGalleryInfo(x); return Number(xi.view === info.view) + 2 * Number(xi.season === info.season) + 4 * Number(xi.technique === info.technique); };
            const other = candidates.sort((a, b) => score(b) - score(a))[0];
            const b = document.createElement('button'); b.type = 'button'; b.className = 'apg-variant-btn'; b.textContent = animGalleryInfo(other)[labelKey];
            b.setAttribute('aria-pressed', value === info[key] ? 'true' : 'false');
            b.onclick = () => { chooseVersion(other); stage.querySelector(`.apg-variants[aria-label="Location ${label.toLowerCase()} versions"] button[aria-pressed="true"]`)?.focus(); };
            variants.appendChild(b);
          }
          versions.appendChild(variants);
        }
        // Different landmarks in one town may have no seasonal/viewpoint metadata.
        const sameVariant = siblings.filter(x => { const xi = animGalleryInfo(x); return xi.view === info.view && xi.season === info.season && xi.technique === info.technique; });
        if (!groups || sameVariant.length > 1) {
          const label = document.createElement('label'); label.className = 'apg-field'; label.innerHTML = '<span>Artwork</span>';
          const select = _settingsSelect(siblings.map(x => [x.ref, x.label + ' · ' + animGalleryInfo(x).techniqueLabel]), it.ref, ref => chooseVersion(byRef.get(ref)));
          label.appendChild(select); versions.appendChild(label);
        }
        stageMeta.appendChild(versions);
      }
    }
    if (it.galleryLegacy) {
      const note = document.createElement('span'); note.className = 'muted'; note.textContent = 'Retained original artwork. Favourites and blocks apply to both techniques; pins use the current version.'; stageMeta.appendChild(note);
    }
    const acts = document.createElement('div'); acts.className = 'apg-stage-acts';
    const replay = document.createElement('button'); replay.type = 'button'; replay.className = 'btn btn-secondary btn-sm'; replay.innerHTML = icon('sparkles', 'i-sm') + '<span>Play again</span>';
    replay.onclick = () => showStage(it, true);
    acts.appendChild(replay);
    // The scene editor (78-scene-editor.js, V2 23.4): a developer tool, shown only when its dev route answers.
    if (it.composed && typeof sceneEditorAvailable === 'function') {
      const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'btn btn-secondary btn-sm'; edit.hidden = true;
      edit.innerHTML = icon('pencil', 'i-sm') + '<span>Edit scene</span>';
      edit.onclick = () => sceneEditorOpen(it.ref, { label: it.label, returnFocus: edit });
      acts.appendChild(edit);
      sceneEditorAvailable().then(ok => { if (ok && edit.isConnected) edit.hidden = false; });
    }
    // Map and terrain credits (V2 17.6) under scenes that have any.
    if (typeof sceneCredits === 'function') {
      let cr = [];
      try { cr = sceneCredits(it) || []; } catch (e) { cr = []; }
      if (cr.length) { const c = document.createElement('span'); c.className = 'muted apg-credits'; c.textContent = cr.join(' · '); stageMeta.appendChild(c); }
    }
    if (it.slot === 'theme-switch') {
      const tryIt = document.createElement('button'); tryIt.type = 'button'; tryIt.className = 'btn btn-secondary btn-sm'; tryIt.innerHTML = icon(state.theme === 'dark' ? 'sun' : 'moon', 'i-sm') + '<span>Try it</span>';
      tryIt.onclick = () => { _shellThemeSwapVariant = it.ref; state.theme = state.theme === 'dark' ? 'light' : 'dark'; saveUI(); render(); };
      acts.appendChild(tryIt);
    }
    stageMeta.appendChild(acts);
  }

  function paint() {
    const lk = animLook(), t = animTodayLook();
    const items = animGalleryFilter(catalogue, _agUI).sort((a, b) => Number(!!b.full) - Number(!!a.full) || Number(!!b.composed) - Number(!!a.composed));
    const locationMatches = animGalleryPlaces(animGalleryFilter(catalogue, Object.assign({}, _agUI, { place: '' })));
    for (const [key, label, button] of techniqueButtons) {
      const n = animGalleryFilter(catalogue, Object.assign({}, _agUI, { technique: key })).length;
      button.textContent = `${label} (${n})`; button.setAttribute('aria-pressed', _agUI.technique === key ? 'true' : 'false');
    }
    count.textContent = `${items.length} version${items.length === 1 ? '' : 's'}${_agUI.place ? ' at ' + (animGalleryInfo(items[0] || {}).placeLabel || 'this location') : ` · ${locationMatches.length} location${locationMatches.length === 1 ? '' : 's'}`}`;
    clear.hidden = !(_agUI.q || _agUI.pack || _agUI.slot || _agUI.season || _agUI.technique || _agUI.place);
    places.replaceChildren(); places.hidden = !(_agUI.q || _agUI.place) || !locationMatches.length;
    if (!places.hidden) {
      for (const p of locationMatches.slice(0, 10)) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'apg-place-btn'; b.textContent = `${p.label} (${p.count})`; b.setAttribute('aria-pressed', _agUI.place === p.key ? 'true' : 'false');
        b.onclick = () => { if (_agUI.place === p.key) return; _agUI.place = p.key; _agUI.page = 0; paint(); }; places.appendChild(b);
      }
    }
    // A filter can never leave an unrelated scene on stage.
    if (!items.some(it => it.ref === _agUI.sel)) _agUI.sel = (items.find(it => !animLocked(it, lk)) || {}).ref || null;
    const page = animGalleryPage(items, _agUI.page); _agUI.page = page.page;
    paging.replaceChildren(); paging.hidden = page.pages <= 1;
    const range = document.createElement('span'); range.className = 'muted'; range.setAttribute('aria-live', 'polite');
    range.textContent = `${items.length ? page.start + 1 : 0}–${page.end} of ${items.length} scenes`;
    for (const [label, delta] of [['Previous', -1], ['Next', 1]]) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-secondary btn-sm'; button.textContent = label;
      button.disabled = delta < 0 ? page.page === 0 : page.page === page.pages - 1;
      button.onclick = () => { _agUI.page += delta; paint(); grid.querySelector('.apg-preview-button')?.focus(); };
      paging.appendChild(button);
    }
    paging.insertBefore(range, paging.lastChild);
    grid.replaceChildren();
    for (const it of page.items) {
      const f = document.createElement('figure'), info = animGalleryInfo(it), ref = info.baseRef || it.ref;
      f.setAttribute('data-gallery-ref', it.ref);
      const fav = lk.fav.includes(ref), blk = lk.block.includes(ref), pin = lk.pin[it.slot] === ref, packOff = !animPack(it.pack).core && lk.packsOff.includes(it.pack);
      if (animLocked(it, lk)) {   // a reward not earned yet: a still silhouette and how to earn it
        const d = typeof achDef === 'function' ? achDef(it.unlock) : null;
        f.className = 'ag-item apg-item is-locked' + (it.full ? ' is-full' : '');
        f.setAttribute('aria-label', `${it.label}, locked`);
        f.setAttribute('data-tip', d ? `${d.label}: ${d.hint}` : 'Locked');
        f.innerHTML = `${animItemHtml(it, { size: 'lg', reduced: true })}<span class="apg-lock">${icon('lock', 'i-xs')}</span><figcaption><b>${esc(it.label)}</b><span>${esc(d ? 'Unlock: ' + d.label : 'Locked')}</span></figcaption>`;
        grid.appendChild(f);
        continue;
      }
      f.className = 'ag-item apg-item anim-hover-host' + (it.full ? ' is-full' : '') + (blk || packOff ? ' is-blocked' : '') + (t[it.slot] === ref ? ' is-today' : '') + (_agUI.sel === it.ref ? ' is-sel' : '');
      const preview = document.createElement('button'); preview.type = 'button'; preview.className = 'apg-preview-button'; preview.setAttribute('aria-label', `Preview ${it.label}, ${info.techniqueLabel}`); preview.setAttribute('aria-pressed', _agUI.sel === it.ref ? 'true' : 'false');
      preview.innerHTML = `<span class="apg-card-art">${animItemHtml(it, Object.assign({ size: 'lg', hover: true, reduced }, animGalleryPreviewOptions(it, 'live')))}</span>`;
      preview.onclick = () => selectItem(it);
      f.appendChild(preview);
      const caption = document.createElement('figcaption');
      caption.innerHTML = `<b>${esc(it.label)}</b><span>${esc(animPack(it.pack).name)}${t[it.slot] === ref ? ' · today' : ''}${packOff ? ' · pack off' : ''}${blk ? ' · blocked' : ''}</span>`;
      const badges = document.createElement('div'); badges.className = 'apg-card-badges'; badges.innerHTML = badgeHtml(it);
      f.append(caption, badges);
      const acts = document.createElement('div'); acts.className = 'apg-acts';
      // A favourite changes only its star (in place): repainting the page rebuilt every tile and the
      // playing stage (about 50 rich drawings, seconds of work, and the stage restarted: a flicker).
      const favB = _agBtn('star', fav ? 'Favourite (comes up more often)' : 'Favourite', fav, () => {
        const before = JSON.stringify(animTodayLook());
        animLookSave({ fav: _agToggle(animLook().fav, ref) });
        if (JSON.stringify(animTodayLook()) !== before) { paint(); return; }   // today's picks moved: the "today" marks follow
        // A saved original and its upgrade share one preference identity.
        const on = animLook().fav.includes(ref), label = on ? 'Favourite (comes up more often)' : 'Favourite';
        for (const tile of grid.querySelectorAll('[data-gallery-ref]')) {
          const candidate = byRef.get(tile.getAttribute('data-gallery-ref'));
          if (!candidate || (animGalleryInfo(candidate).baseRef || candidate.ref) !== ref) continue;
          const b = tile.querySelector('.apg-favourite'); if (!b) continue;
          b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('aria-label', label); b.setAttribute('data-tip', label);
        }
      });
      favB.classList.add('apg-favourite');
      acts.append(
        favB,
        _agBtn('pin', pin ? 'Pinned for this slot' : 'Pin for this slot', pin, () => { const p = Object.assign({}, animLook().pin); if (p[it.slot] === ref) delete p[it.slot]; else p[it.slot] = ref; animLookSave({ pin: p }); render(); }),
        _agBtn('eye-off', blk ? 'Blocked (never picked)' : 'Block', blk, () => { animLookSave({ block: _agToggle(animLook().block, ref) }); render(); }));
      f.appendChild(acts);
      f.onclick = e => { if (!e.target.closest('button')) selectItem(it); };
      grid.appendChild(f);
    }
    if (!items.length) {
      const empty = document.createElement('div'); empty.className = 'apg-empty';
      empty.innerHTML = '<h4>No matching animations</h4><p>Try a nearby town, county, country or landmark, or clear the filters to browse every pack. Some locations have no artwork yet.</p>';
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary btn-sm'; b.textContent = 'Browse all animations'; b.onclick = reset; empty.appendChild(b); grid.appendChild(empty);
    }
    showStage(byRef.get(_agUI.sel));
  }
  q.oninput = () => { _agUI.q = q.value; _agUI.place = ''; _agUI.page = 0; clearTimeout(searchTimer); searchTimer = setTimeout(() => { if (root.isConnected) paint(); }, 160); };
  q.onkeydown = e => { if (e.key === 'Enter') { clearTimeout(searchTimer); paint(); stage.scrollIntoView({ block: 'nearest' }); } if (e.key === 'Escape') { e.stopPropagation(); reset(); } };
  paint();
  el.appendChild(root);
}
