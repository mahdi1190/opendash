/* ============================================================
   PROFILE, THE WARDROBE (2.18, agent 'wardrobe'): saved outfits, 'Surprise me' and quick expressions
   in the character builder (Settings > Profile). User request: "way way more clothes customisable
   options". The kit (what each piece is and how it is drawn) is 97-profile-0kit*.js; the builder
   (97-profile-2ui.js) asks this file for two strips through guarded hooks.

   state.wardrobe (a UI key: saveUI, never an undo step; synced like the profile, lib/sync/manifest.mjs
   '── wardrobe ──'):
     {v: 1, outfits: {id: {name (plain text, 24), look: {part: id} (PF_OUTFIT_PARTS only), at (ms), n (order)}}}
   At most six outfits. An outfit holds ids only: wearing one maps every id through the kit's tables
   (profileOutfitWear), so an outfit synced from a newer device never breaks this one.

   PUBLIC API (safe to call at any time; never throws):
     profileWardrobeList()              the saved outfits, in order: [{id, name, look, at, n}]
     profileWardrobeSave(look, name)    save an outfit -> its id, or '' when six are saved
     profileWardrobeRename(id, name) / profileWardrobeRemove(id) -> the removed entry (for Undo) / profileWardrobeRestore(entry)
     profileWardrobeName(a)             a friendly name for an avatar's outfit ("Navy jumper", "Coral sundress")
     profileWardrobeEl({get, apply, tab})   the builder's strip above its tabs: outfits and 'Surprise me'
     profileWardrobeTabEl(tab, {get, apply})   a tab's extras below the tabs: quick expressions on Face
     window.OpenDashWardrobe            {list, save, wear(id), surprise(theme)}
   Private names: _pfw*. Styles: src/styles/97-profile-wardrobe.css.
   2.18 templates (UI_CLEANUP_PLAN.md C6): a section of the builder (secHead), buttons through uiButton, at most
   three style chips and then "+N" (a menu), Undo on every removal.
   ============================================================ */
const PFW_MAX = 6, PFW_NAME_MAX = 24;
const _pfw = { editing: '', n: 0 };

function _pfwEl(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function _pfwMotionOk() {
  try { if (window.Motion && Motion.prefersReduced && Motion.prefersReduced()) return false; } catch (e) { /* below */ }
  try { if (typeof animEnabled === 'function' && !animEnabled()) return false; } catch (e) { /* on */ }
  try { if (typeof memFunLevel === 'function' && memFunLevel() === 'off') return false; } catch (e) { /* on */ }
  return true;
}
function _pfwOk() {
  const ctx = typeof profileUnlockCtx === 'function' ? profileUnlockCtx() : {};
  return (k, id) => !profileLockOf(k, id, ctx);
}
function _pfwUid() { return 'pfw' + (++_pfw.n).toString(36); }

/* ---------- the state ---------- */
function _pfwState() {
  if (typeof state === 'undefined' || !state) return { v: 1, outfits: {} };
  if (!state.wardrobe || typeof state.wardrobe !== 'object' || Array.isArray(state.wardrobe)) state.wardrobe = { v: 1, outfits: {} };
  const w = state.wardrobe;
  if (!w.outfits || typeof w.outfits !== 'object' || Array.isArray(w.outfits)) w.outfits = {};
  if (!w.v) w.v = 1;
  return w;
}
function _pfwSave() { try { if (typeof saveUI === 'function') saveUI(); } catch (e) { console.error('[wardrobe] save', e); } }
function _pfwClean(id, o) {
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(String(id)) || !o || typeof o !== 'object') return null;
  const look = {};
  const src = o.look && typeof o.look === 'object' ? o.look : {};
  for (const k of PF_OUTFIT_PARTS) if (typeof src[k] === 'string' && /^[A-Za-z0-9_#-]{1,64}$/.test(src[k])) look[k] = src[k];
  return { id: String(id), name: profileText(o.name, PFW_NAME_MAX) || 'Outfit', look, at: Number(o.at) || 0, n: Number.isFinite(Number(o.n)) ? Number(o.n) : 0 };
}
function profileWardrobeList() {
  try {
    const w = _pfwState();
    return Object.entries(w.outfits).map(([id, o]) => _pfwClean(id, o)).filter(Boolean).sort((x, y) => x.n - y.n || x.at - y.at).slice(0, PFW_MAX);
  } catch (e) { return []; }
}
/** A friendly name for an outfit: the piece people notice first, in its colour. */
function profileWardrobeName(a0) {
  try {
    const a = profileAvatarNormalize(a0);
    const lab = (k, id) => { const o = pfOptions(k).find(x => x.id === id); return o ? o.label : ''; };
    const col = (id) => { const o = pfOptions('topCol').find(x => x.id === id); return o ? o.label : ''; };
    let c, piece;
    if (a.dress !== 'none') { c = col(a.dressCol); piece = lab('dress', a.dress); }
    else if (a.outer !== 'none' && a.outer !== 'hivis') { c = col(a.outerCol); piece = lab('outer', a.outer); }
    else { c = a.top === 'lab' ? '' : col(a.topCol); piece = lab('top', a.top); }
    const s = [c, piece.toLowerCase()].filter(Boolean).join(' ');
    return profileText(s.charAt(0).toUpperCase() + s.slice(1), PFW_NAME_MAX) || 'My outfit';
  } catch (e) { return 'My outfit'; }
}
function profileWardrobeSave(look, name) {
  try {
    const list = profileWardrobeList();
    if (list.length >= PFW_MAX) return '';
    const w = _pfwState(), id = 'o' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);   // clock-ok: an id
    const clean = profileOutfitOf(Object.assign(profileAvatarDefault(), look || {}));
    w.outfits[id] = { name: profileText(name, PFW_NAME_MAX) || profileWardrobeName(clean), look: clean, at: Date.now(), n: list.length ? Math.max(...list.map(x => x.n)) + 1 : 0 };   // clock-ok
    _pfwSave();
    if (list.length === 0) { try { if (typeof gameAward === 'function') gameAward({ kind: 'wardrobe', key: 'first-outfit', xp: 5 }); } catch (e) { /* no game */ } }
    return id;
  } catch (e) { console.error('[wardrobe] save', e); return ''; }
}
function profileWardrobeRename(id, name) {
  try {
    const w = _pfwState(), o = w.outfits[id];
    const v = profileText(name, PFW_NAME_MAX);
    if (!o || !v || v === o.name) return false;
    w.outfits[id] = Object.assign({}, o, { name: v });
    _pfwSave();
    return true;
  } catch (e) { return false; }
}
function profileWardrobeRemove(id) {
  try {
    const w = _pfwState(), o = _pfwClean(id, w.outfits[id]);
    if (!o) return null;
    delete w.outfits[id];
    _pfwSave();
    return o;
  } catch (e) { return null; }
}
function profileWardrobeRestore(entry) {
  try {
    const o = entry && _pfwClean(entry.id, entry);
    if (!o) return false;
    const w = _pfwState();
    if (Object.keys(w.outfits).length >= PFW_MAX) return false;
    w.outfits[o.id] = { name: o.name, look: o.look, at: o.at, n: o.n };
    _pfwSave();
    return true;
  } catch (e) { return false; }
}
function _pfwSame(a, look) {
  for (const k of PF_OUTFIT_PARTS) if (look[k] != null && look[k] !== a[k]) return false;
  return true;
}
function _pfwRoll() {
  if (!_pfwMotionOk()) return;
  const big = document.querySelector('#pf-builder .pf-b-big');
  if (big) { big.classList.remove('is-roll'); void big.offsetWidth; big.classList.add('is-roll'); }
}

/* ---------- the strip above the builder's tabs ---------- */
function profileWardrobeEl(o) {
  try {
    o = o || {};
    const get = typeof o.get === 'function' ? o.get : () => profileGet().avatar;
    const apply = typeof o.apply === 'function' ? o.apply : (next) => profileSet({ avatar: next });
    const wrap = _pfwEl('section', 'pfw');
    wrap.setAttribute('aria-label', 'Outfits');
    wrap.setAttribute('data-whats-new', 'wardrobe');   // What's new 2.18 and Life › You › Wardrobe point here (95-whats-new.js, 15-nav-life.js)
    const paint = () => {
      wrap.replaceChildren();
      const a = profileAvatarNormalize(get()), list = profileWardrobeList(), theme = profileGet().theme;
      wrap.appendChild(secHead({ title: 'Outfits', cls: 'pfw-head', sub: list.length ? 'Click one to put it on; click a name to rename it.' : 'Save what you are wearing and put it back on in one click. Up to six.' }));
      const row = _pfwEl('div', 'pfw-row');
      row.setAttribute('role', 'list');
      for (const it of list) row.appendChild(_pfwSlot(it, a, theme, apply, paint));
      if (list.length < PFW_MAX) {
        const add = _pfwEl('button', 'pfw-add'); add.type = 'button';
        add.innerHTML = icon('plus', 'i-sm');
        add.appendChild(_pfwEl('span', null, list.length ? 'Save this outfit' : 'Save what I’m wearing'));
        add.setAttribute('data-tip', 'Saves your clothes, shoes, jewellery and accessories');
        add.onclick = () => {
          const id = profileWardrobeSave(profileOutfitOf(get()));
          if (!id) { toast('Six outfits saved: remove one to save another', { icon: 'shirt' }); return; }
          const saved = profileWardrobeList().find(x => x.id === id);
          _pfw.editing = '';
          paint();
          toast(`Saved “${saved ? saved.name : 'your outfit'}”`, { icon: 'shirt', action: { label: 'Undo', run: () => { profileWardrobeRemove(id); paint(); } } });
        };
        row.appendChild(add);
      } else {
        row.appendChild(_pfwEl('div', 'pfw-full', 'Six saved. Remove one to save another.'));
      }
      wrap.appendChild(row);
      // Surprise me
      const ok = _pfwOk(), themes = profileLookThemes(typeof profileUnlockCtx === 'function' ? profileUnlockCtx().today : '', ok);
      if (themes.length) {
        const sur = _pfwEl('div', 'pfw-surprise');
        sur.appendChild(_pfwEl('span', 'pfw-sur-l', 'Surprise me'));
        const wearTheme = (t) => { apply(profileOutfitThemed(t.id, Math.random, ok, get())); _pfwRoll(); };
        // at most three chips, then "+N" (a menu of the rest): a season's style comes first while it lasts
        const ordered = themes.slice().sort((x, y) => (y.season ? 1 : 0) - (x.season ? 1 : 0));
        for (const t of ordered.slice(0, 3)) {
          const b = _pfwEl('button', 'chip chip-lg pfw-theme' + (t.season ? ' is-season' : '')); b.type = 'button';
          b.innerHTML = icon(/^[a-z0-9-]+$/.test(t.icon) ? t.icon : 'sparkles', 'i-sm');
          b.appendChild(_pfwEl('span', null, t.label));
          b.setAttribute('data-tip', t.season ? `A ${t.label.toLowerCase()} outfit, while the season lasts` : `A ${t.label.toLowerCase()} outfit from what you have unlocked`);
          b.onclick = () => wearTheme(t);
          sur.appendChild(b);
        }
        if (ordered.length > 3) {
          const rest = ordered.slice(3);
          sur.appendChild(uiButton({ label: `+${rest.length}`, kind: 'ghost', size: 'sm', tip: 'More styles to surprise you with', run: (e, b) => openMenu(b, rest.map(t => ({ label: t.label, icon: /^[a-z0-9-]+$/.test(t.icon) ? t.icon : 'sparkles', run: () => wearTheme(t) }))) }));
        }
        wrap.appendChild(sur);
      }
    };
    paint();
    return wrap;
  } catch (e) { console.error('[wardrobe] strip', e); return null; }
}
function _pfwSlot(it, a, theme, apply, repaint) {
  const on = _pfwSame(a, it.look);
  const slot = _pfwEl('div', 'pfw-slot' + (on ? ' is-on' : ''));
  slot.setAttribute('role', 'listitem');
  const wear = _pfwEl('button', 'pfw-look'); wear.type = 'button';
  wear.setAttribute('aria-pressed', on ? 'true' : 'false');
  wear.setAttribute('aria-label', on ? `${it.name} (wearing it)` : `Put on ${it.name}`);
  wear.setAttribute('data-tip', on ? 'You are wearing this' : `Put on “${it.name}”`);
  wear.innerHTML = profileAvatarSvg(profileOutfitWear(a, it.look), { size: 52, uid: _pfwUid(), theme, crop: 'bust' });   // the kit's markup: allow-listed ids only
  wear.onclick = () => { if (!on) { apply(profileOutfitWear(a, it.look, _pfwOk())); _pfwRoll(); } };
  slot.appendChild(wear);
  if (_pfw.editing === it.id) {
    const inp = _pfwEl('input', 'control control-sm pfw-name-in'); inp.maxLength = PFW_NAME_MAX; inp.value = it.name; inp.setAttribute('aria-label', 'Outfit name');
    let done = false;
    const finish = (save) => { if (done) return; done = true; if (save) profileWardrobeRename(it.id, inp.value); _pfw.editing = ''; repaint(); };
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); finish(true); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); } };
    inp.onblur = () => finish(true);
    slot.appendChild(inp);
    setTimeout(() => { try { inp.focus(); inp.select(); } catch (e) { /* gone */ } }, 0);
  } else {
    const nm = _pfwEl('button', 'pfw-name', it.name); nm.type = 'button';
    nm.setAttribute('data-tip', 'Rename'); nm.setAttribute('aria-label', `Rename ${it.name}`);
    nm.onclick = () => { _pfw.editing = it.id; repaint(); };
    slot.appendChild(nm);
  }
  slot.appendChild(uiButton({ icon: 'x', iconCls: 'i-xs', kind: 'ghost', size: 'sm', cls: 'pfw-x', aria: `Remove ${it.name}`, tip: 'Remove', run: () => {
    const gone = profileWardrobeRemove(it.id);
    repaint();
    if (gone) toast(`Removed “${gone.name}”`, { icon: 'shirt', action: { label: 'Undo', run: () => { profileWardrobeRestore(gone); repaint(); } } });
  } }));
  return slot;
}

/* ---------- a tab's extras: quick expressions on the Face tab ---------- */
function profileWardrobeTabEl(tab, o) {
  try {
    if (tab !== 'face') return null;
    o = o || {};
    const get = typeof o.get === 'function' ? o.get : () => profileGet().avatar;
    const apply = typeof o.apply === 'function' ? o.apply : (next) => profileSet({ avatar: next });
    const a = profileAvatarNormalize(get()), ctx = typeof profileUnlockCtx === 'function' ? profileUnlockCtx() : {}, theme = profileGet().theme;
    const box = _pfwEl('div', 'pfw-expr');
    box.appendChild(_pfwEl('div', 'pf-b-part-h', 'Quick expressions'));
    const row = _pfwEl('div', 'pfw-expr-row');
    for (const ex of PF_EXPRESSIONS) {
      const why = ['eyes', 'brows', 'mouth'].map(k => profileLockOf(k, ex[k], ctx)).find(Boolean) || '';
      const on = a.eyes === ex.eyes && a.brows === ex.brows && a.mouth === ex.mouth;
      const b = _pfwEl('button', 'pfw-ex' + (why ? ' is-locked' : '')); b.type = 'button';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.setAttribute('aria-label', ex.label + (why ? ' (locked: ' + why + ')' : ''));
      b.setAttribute('data-tip', why ? `${ex.label}: ${why}` : ex.label);
      b.innerHTML = profileAvatarSvg(Object.assign({}, a, { eyes: ex.eyes, brows: ex.brows, mouth: ex.mouth }), { size: 40, uid: _pfwUid(), theme, crop: 'face' })
        + `<span class="pfw-ex-l">${esc(ex.label)}</span>` + (why ? `<span class="pf-lock">${icon('lock', 'i-xs')}</span>` : '');
      b.onclick = () => {
        if (why) { toast(`${ex.label}: ${why.charAt(0).toLowerCase() + why.slice(1)}.`, { icon: 'lock' }); return; }
        if (!on) apply(Object.assign({}, a, { eyes: ex.eyes, brows: ex.brows, mouth: ex.mouth }));
      };
      row.appendChild(b);
    }
    box.appendChild(row);
    return box;
  } catch (e) { console.error('[wardrobe] expressions', e); return null; }
}

if (typeof window !== 'undefined') {
  window.OpenDashWardrobe = Object.freeze({
    list: () => profileWardrobeList(),
    save: (name) => profileWardrobeSave(profileOutfitOf(profileGet().avatar), name),
    wear: (id) => { const it = profileWardrobeList().find(x => x.id === id); if (!it) return false; profileSet({ avatar: profileOutfitWear(profileGet().avatar, it.look, _pfwOk()) }); return true; },
    surprise: (theme) => { const before = profileGet().avatar; profileSet({ avatar: profileOutfitThemed(theme, Math.random, _pfwOk(), before) }); return before; },
  });
}
if (typeof registerCommand === 'function') {
  registerCommand({ id: 'profile-outfit-surprise', label: 'Surprise me with a new outfit', icon: 'shirt', keywords: 'outfit clothes wardrobe random surprise dress up avatar',
    run: () => {
      const before = profileGet().avatar, ok = _pfwOk(), themes = profileLookThemes(profileUnlockCtx().today, ok);
      const t = themes[Math.floor(Math.random() * themes.length)] || { id: 'casual', label: 'Casual' };
      profileSet({ avatar: profileOutfitThemed(t.id, Math.random, ok, before) });
      toast(`New ${t.label.toLowerCase()} outfit`, { icon: 'shirt', action: { label: 'Undo', run: () => profileSet({ avatar: before }) } });
    } });
}
