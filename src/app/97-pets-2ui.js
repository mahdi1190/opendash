/* ============================================================
   PETS, the page (2.18, agent 'pets'): #view=pet (Together: pat, treats,
   tricks), #view=pet:wardrobe (make it yours: species, breed, coat,
   markings, eyes, five accessory slots with colours, a name), #view=pet:journal
   (milestones, kept for good). Adopting is the empty state. Also the Home
   widget 'pet', the Friends panels (a friend's pet on their page, friends'
   pets in the hangout), a hidden sidebar item and palette commands.
   Undo instead of confirms everywhere; text from friends with textContent only.
   ============================================================ */
const _ptUI = { entry: '', undo: [], redo: [], pose: 'sit', adoptSpecies: '', busy: false, trickT: 0 };
const PET_TABS = Object.freeze([['together', 'Together', 'heart'], ['wardrobe', 'Wardrobe', 'shirt'], ['journal', 'Journal', 'notebook-pen']]);
function _ptTab(v) { const m = /^pet:([a-z]+)$/.exec(String(v || '')); return m && PET_TABS.some(t => t[0] === m[1]) ? m[1] : 'together'; }
function _ptEl(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
/** The pet page's button: a thin adapter over the kit's uiButton (run(button, event); cls 'btn-primary' | 'btn-ghost'; no label = an icon button). */
function _ptBtn(label, ic, run, cls) {
  return uiButton({ label, icon: ic, kind: String(cls || 'btn-secondary').replace(/^btn-/, ''), size: 'sm', run: (e, b) => run(b, e) });
}
/** A section of the page: the kit's section header, then its content. */
function _ptSec(title, ic, extra) {
  const s = _ptEl('section', 'pt-sec');
  s.appendChild(secHead({ title, icon: ic, actions: extra ? [extra] : [] }));
  return s;
}
function _ptAge(born) {
  const d = born ? _ptDays(born, _ptToday()) : 0;
  if (d <= 0) return 'Together since today';
  if (d < 14) return `${d} day${d === 1 ? '' : 's'} together`;
  if (d < 60) return `${Math.round(d / 7)} weeks together`;
  if (d < 730) return `${Math.round(d / 30.4)} months together`;
  return `${Math.round(d / 365)} years together`;
}

/* ---------- the page ---------- */
if (typeof registerSection === 'function') {
  registerSection('pet', {
    match: (v) => v === 'pet' || /^pet:[a-z]+$/.test(String(v)),
    title: () => { const g = petGet(); return g.has ? petName(g) : 'Your pet'; },
    crumb: (v) => (_ptTab(v) === 'together' ? [] : [(PET_TABS.find(t => t[0] === _ptTab(v)) || [])[1] || '']),
    group: 'home', layout: 'page', hashable: true, taskControls: false,
    mount(container, view) { _ptMount(container, view || state.view); },
    unmount() { _ptUI.entry = ''; },
  });
}
function _ptMount(container, view) {
  const tab = _ptTab(view), entering = _ptUI.entry !== view;
  _ptUI.entry = view;
  const sub = document.getElementById('view-subtitle');
  const g = petGet();
  const root = _ptEl('div', 'pt-page pt-tab-' + tab + (entering ? ' is-enter' : ''));
  try {
    if (!g.has) { if (sub) sub.textContent = 'A little companion that grows with what you do'; _ptAdopt(root); container.appendChild(root); return; }
    if (sub) sub.textContent = (petMood() || {}).line || '';
    const tabs = _ptEl('div', 'pt-tabs'); tabs.setAttribute('role', 'tablist');
    for (const [id, label, ic] of PET_TABS) {
      const b = _ptEl('button', 'pt-tabbtn'); b.type = 'button'; b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', id === tab ? 'true' : 'false');
      b.innerHTML = icon(ic, 'i-sm'); b.appendChild(_ptEl('span', null, label));
      b.onclick = () => { if (id === tab) { const m = document.getElementById('main'); if (m && m.scrollTop > 0) m.scrollTo({ top: 0, behavior: 'smooth' }); return; } setView(id === 'together' ? 'pet' : 'pet:' + id); };
      tabs.appendChild(b);
    }
    root.appendChild(tabs);
    if (!g.on) root.appendChild(_ptAwayNote(g));
    if (_ptFun() === 'off') {
      const n = _ptEl('div', 'card pt-note'); n.innerHTML = icon('circle-x', 'i-sm');
      n.appendChild(_ptEl('span', null, `The Fun level is Off: ${petName(g)} stays on this page and keeps still, and is not on Home, your card or the garden.`));
      n.appendChild(_ptBtn('Change the Fun level', 'party-popper', () => setView('game'), 'btn-ghost'));
      root.appendChild(n);
    }
    if (tab === 'together') _ptTogether(root, g);
    else if (tab === 'wardrobe') _ptWardrobe(root, g);
    else _ptJournalTab(root, g);
  } catch (e) {
    console.error('[pets] page', e);
    root.replaceChildren();
    mountEmptyState(root, { icon: 'circle-alert', compact: true, title: 'Your pet couldn’t load just now', text: 'Nothing is lost.', actions: [{ label: 'Try again', icon: 'refresh-cw', primary: true, run: () => { if (typeof render === 'function') render(); } }] });
  }
  container.appendChild(root);
}
function _ptAwayNote(g) {
  const n = _ptEl('div', 'card pt-note');
  n.innerHTML = icon('moon', 'i-sm');
  n.appendChild(_ptEl('span', null, `${petName(g)} is put away: not on Home, the corner, the garden or the scenes, and friends do not see them.`));
  n.appendChild(_ptBtn('Bring ' + petName(g) + ' back', 'heart', () => { petSet({ on: true }); _ptRefresh(); }, 'btn-primary'));
  return n;
}
function _ptRefresh() { if (typeof render === 'function') render(); }

/* ---------- adopting (the empty state) ---------- */
function _ptAdopt(root) {
  const head = _ptEl('div', 'pt-adopt-h');
  // The shared header draws the title (UX_BLUEPRINT.md 3): one sentence here, then the choice.
  head.appendChild(_ptEl('p', 'muted', 'Pick a companion: finishing things earns it treats, streaks teach it tricks, and it is never sad because of you (on a quiet day it just naps).'));
  root.appendChild(head);
  const ctx = petUnlockCtx();
  const grid = _ptEl('div', 'pt-adopt-grid');
  let rs = _ptHash(_ptToday());
  const rnd = () => ((rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (const sp of PET_SPECIES) {
    const lock = petLockOf('species', sp.id, ctx);
    const look = petRandom(rnd, (f, id, s) => !petLockOf(f, id, ctx, s), { species: sp.id, collar: 'plain', hat: 'none', glasses: 'none', bandana: 'none', bow: 'none' });
    const card = _ptEl('button', 'pt-adopt-card' + (lock ? ' is-locked' : '')); card.type = 'button';
    const art = _ptEl('span', 'pt-adopt-art');
    art.innerHTML = petSvg(look, { size: 96, pose: 'sit', motion: !lock && _ptMotionOk() && _ptFun() !== 'off', mood: { eyes: 'open', mouth: 'smile' } });   // allow-listed ids only
    card.appendChild(art);
    card.appendChild(_ptEl('b', null, sp.label));
    card.appendChild(_ptEl('span', 'muted', lock ? 'Rare · ' + lock : sp.blurb));
    if (lock) { card.disabled = true; card.setAttribute('aria-label', `${sp.label}: rare, ${lock}`); }
    else card.onclick = () => {
      const nm = petRandomName(sp.id, _ptHash(sp.id + Date.now()));   // clock-ok: a seed for a name idea
      petAdopt(Object.assign({}, look, { name: nm }));
      toast(`${nm} the ${sp.label.toLowerCase()} came home: three treats are waiting in the jar`, { icon: 'heart', timeout: 8000, action: { label: 'Rename', run: () => { setView('pet:wardrobe'); setTimeout(() => { const i = document.querySelector('.pt-name-in'); if (i) i.focus(); }, 80); } } });
      setView('pet');
    };
    grid.appendChild(card);
  }
  root.appendChild(grid);
}

/* ---------- Together: the hero, treats, tricks ---------- */
function _ptStageEl(g, size, o) {
  o = o || {};
  const stage = _ptEl('div', 'pt-stage pt-sky-' + _ptSky());
  stage._ptSize = size;
  stage.innerHTML = '<span class="pt-stage-sky" aria-hidden="true"></span><span class="pt-stage-rug" aria-hidden="true"></span>';
  const mood = petMood() || {};
  const pe = petEl('me', size, { pose: o.pose || mood.pose, mood, motion: true });
  if (pe) { pe.classList.add('pt-stage-pet'); stage.appendChild(pe); }
  const bubble = _ptEl('span', 'pt-bubble'); bubble.setAttribute('aria-hidden', 'true'); stage.appendChild(bubble);
  stage.tabIndex = 0;
  stage.setAttribute('role', 'button');
  stage.setAttribute('aria-label', `Pat ${petName(g)}`);
  const pat = () => {
    const r = petPat();
    if (!r.ok) return;
    _ptRedrawStage(stage, g, size, { pose: o.pose });
    petHeartsAt(stage);
    if (o.onPat) o.onPat(r);
  };
  stage.onclick = pat;
  stage.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pat(); } };
  return stage;
}
function _ptSky() { const h = _ptHour(); return h >= 21 || h < 6 ? 'night' : h < 9 ? 'dawn' : h >= 17 ? 'dusk' : 'day'; }
function _ptRedrawStage(stage, g, size, o) {
  const old = stage.querySelector('.pt-stage-pet');
  const mood = petMood() || {};
  const pe = petEl('me', size, { pose: (o && o.pose) || mood.pose, mood, motion: true });
  if (old && pe) { pe.classList.add('pt-stage-pet', 'is-pop'); old.replaceWith(pe); }
  stage.classList.remove('pt-sky-night', 'pt-sky-dawn', 'pt-sky-dusk', 'pt-sky-day');
  stage.classList.add('pt-sky-' + _ptSky());
}
function _ptSay(stage, text, ms) {
  const b = stage && stage.querySelector('.pt-bubble');
  if (!b) return;
  b.textContent = text;
  b.classList.add('is-on');
  clearTimeout(b._t);
  b._t = setTimeout(() => b.classList.remove('is-on'), ms || 2200);
}
function _ptTogether(root, g) {
  const hero = _ptEl('section', 'card pt-hero');
  const stage = _ptStageEl(g, 200, { onPat: () => paintSide() });
  hero.appendChild(stage);
  const side = _ptEl('div', 'pt-hero-side');
  hero.appendChild(side);
  const sp = petSpecies(g.look.species) || {};
  const paintSide = () => {
    const mood = petMood() || {}, t = petTreats();
    side.replaceChildren();
    side.appendChild(_ptEl('div', 'overline', [sp.label, g.look.breed && sp.breeds ? (sp.breeds.find(b => b.id === g.look.breed) || {}).label : ''].filter(Boolean).join(' · ')));
    side.appendChild(_ptEl('p', 'pt-hero-mood', mood.line || ''));
    side.appendChild(_ptEl('p', 'muted pt-hero-age', _ptAge(g.born)));
    const acts = _ptEl('div', 'pt-acts');
    acts.appendChild(_ptBtn('Give a pat', 'heart', () => { const r = petPat(); if (r.ok) { _ptRedrawStage(stage, g, stage._ptSize); petHeartsAt(stage); paintSide(); } }));
    const feed = _ptBtn(t.have ? `Give a treat (${t.have})` : 'Give a treat', 'cookie', () => _ptFeedNow(stage, () => { paintSide(); paintTricks(); }), 'btn-primary');
    acts.appendChild(feed);
    side.appendChild(acts);
    const jar = _ptEl('div', 'pt-jar');
    const ic = _ptEl('span', 'pt-jar-ic'); ic.innerHTML = petTreatSvg((sp.treat || 'cookie'), 26); jar.appendChild(ic);
    const jt = _ptEl('div');
    jt.appendChild(_ptEl('b', null, `${t.have} ${t.have === 1 ? 'treat' : 'treats'} in the jar`));
    jt.appendChild(_ptEl('span', 'muted', t.todayEarned ? `+${t.todayEarned} earned today · ${t.todayFed} given today` : (typeof gameOn === 'function' && gameOn() ? 'Each task you finish earns a treat (up to five a day); a focus session of 10 minutes earns two.' : 'Three treats a day while the game is off.')));
    jar.appendChild(jt);
    side.appendChild(jar);
  };
  paintSide();
  root.appendChild(hero);

  // tricks
  const tricksSec = _ptSec('Tricks', 'sparkles');
  const tgrid = _ptEl('div', 'pt-tricks');
  tricksSec.appendChild(tgrid);
  const paintTricks = () => {
    tgrid.replaceChildren();
    for (const t of petTricks()) {
      const c = _ptEl('div', 'pt-trick' + (t.taught ? ' is-taught' : '') + (t.lock ? ' is-locked' : ''));
      const ic = _ptEl('span', 'pt-trick-ic'); ic.innerHTML = icon(t.lock ? 'lock' : t.icon, 'i-sm'); c.appendChild(ic);
      const tx = _ptEl('div', 'pt-trick-t');
      tx.appendChild(_ptEl('b', null, t.label));
      tx.appendChild(_ptEl('span', 'muted', t.taught ? 'Learned' : t.lock ? 'Unlocks with ' + t.lock.replace(/^Reach /, '').replace(/^A /, 'a ') : `Teach for ${t.cost} treat${t.cost === 1 ? '' : 's'}`));
      c.appendChild(tx);
      if (t.taught) c.appendChild(_ptBtn('Do it', 'wand-sparkles', () => _ptPerform(stage, t.id)));
      else if (!t.lock) c.appendChild(_ptBtn('Teach', 'graduation-cap', () => _ptTeachNow(stage, t, () => { paintTricks(); paintSide(); })));
      tgrid.appendChild(c);
    }
  };
  paintTricks();
  root.appendChild(tricksSec);

  // the latest from the journal
  const jSec = _ptSec('Lately', 'notebook-pen', _ptBtn('Open the journal', 'arrow-right', () => setView('pet:journal'), 'btn-ghost'));
  jSec.appendChild(_ptJournalList(petJournal().slice(0, 4), g));
  root.appendChild(jSec);

  // with you: friends and scenes
  root.appendChild(_ptPrefsSec(g));
}
function _ptFeedNow(stage, after) {
  const g = petGet(), r = petFeed();
  if (!r.ok) { toast(r.msg, { icon: r.full ? 'heart' : 'cookie' }); return; }
  const treat = _ptEl('span', 'pt-fly-treat'); treat.setAttribute('aria-hidden', 'true');
  treat.innerHTML = petTreatSvg(r.treat, 30);
  stage.appendChild(treat);
  setTimeout(() => treat.remove(), 900);
  setTimeout(() => { _ptRedrawStage(stage, g, stage._ptSize); petHeartsAt(stage); _ptSay(stage, 'Nom nom!', 1500); }, _ptMotionOk() ? 650 : 0);
  const today = _ptToday();
  toast(r.msg, { icon: 'cookie', action: { label: 'Undo', run: () => { const p = _ptS(); p.fed[today] = Math.max(0, (Number(p.fed[today]) || 1) - 1); petSet({}, {}); if (after) after(); } } });
  if (after) after();
}
function _ptTeachNow(stage, t, after) {
  const g = petGet(), r = petTeach(t.id);
  if (!r.ok) { toast(r.msg, { icon: 'graduation-cap' }); return; }
  if (r.already) return;
  _ptPerform(stage, t.id, true);
  toast(`${petName(g)} learned ${t.label.toLowerCase()}`, { icon: 'graduation-cap', action: { label: 'Undo', run: () => { petUnteach(t.id); if (after) after(); } } });
  if (after) after();
}
const _PT_TRICK_MS = { sit: 900, paw: 1400, spin: 1100, speak: 1600, roll: 1300, jump: 1100, dance: 2000, bow: 1400, moon: 2200, flip: 1300 };
function _ptPerform(stage, id, learned) {
  const t = petTrick(id); if (!t) return;
  const g = petGet(), pe = stage.querySelector('.pt-stage-pet');
  if (!pe) return;
  petWake(60000);   // asked to do a trick at night, it wakes for a minute
  if (pe._petPose !== 'sit' || t.anim === 'sit' || t.anim === 'paw') _ptRedrawStage(stage, g, stage._ptSize, { pose: 'sit' });
  const el = stage.querySelector('.pt-stage-pet');
  clearTimeout(_ptUI.trickT);
  el.classList.remove(...[...el.classList].filter(c => c.startsWith('do-')));
  void el.offsetWidth;
  if (_ptMotionOk()) el.classList.add('do-' + t.anim);
  const sp = petSpecies(g.look.species) || {};
  if (t.anim === 'speak') _ptSay(stage, sp.sound || 'Hi!', 1600);
  else if (learned) _ptSay(stage, 'Ta-da!', 1300);
  if (t.anim === 'paw') _ptSay(stage, 'High five!', 1300);
  _ptUI.trickT = setTimeout(() => { el.classList.remove('do-' + t.anim); if (id !== 'sit') _ptRedrawStage(stage, g, stage._ptSize); }, _PT_TRICK_MS[t.anim] || 1200);
  if (!_ptMotionOk()) _ptSay(stage, `${petName(g)} did ${t.label.toLowerCase()}!`, 1600);
}
function _ptPrefsSec(g) {
  const s = _ptSec('With you', 'users');
  const rows = _ptEl('div', 'pt-prefs');
  const row = (label, hint, on, set) => {
    const r = _ptEl('div', 'pt-pref');
    const t = _ptEl('div'); t.appendChild(_ptEl('b', null, label)); t.appendChild(_ptEl('span', 'muted', hint)); r.appendChild(t);
    const sw = _ptEl('button', 'switch' + (on ? ' on' : '')); sw.type = 'button'; sw.setAttribute('role', 'switch'); sw.setAttribute('aria-checked', String(on)); sw.setAttribute('aria-label', label);
    sw.onclick = () => { const v = !sw.classList.contains('on'); set(v); sw.classList.toggle('on', v); sw.setAttribute('aria-checked', String(v)); };
    r.appendChild(sw);
    rows.appendChild(r);
  };
  row('Friends see ' + petName(g), 'On your profile card and when you visit their scenes: the species, colours, accessories and name, nothing else. Off keeps them to yourself: they still sit on your own card, but not on the one friends see.', g.share, (v) => petSet({ share: v }));
  row('Walks with you in the scenes', 'Trots beside your figure in the Friends hangout, and beside you when you visit a friend\'s scene.', g.scenes, (v) => petSet({ scenes: v }));
  s.appendChild(rows);
  const away = _ptBtn('Put ' + petName(g) + ' away for now', 'moon', () => {
    petSet({ on: false });
    toast(`${petName(g)} is resting out of sight`, { icon: 'moon', action: { label: 'Undo', run: () => { petSet({ on: true }); _ptRefresh(); } } });
    _ptRefresh();
  }, 'btn-ghost');
  if (g.on) s.appendChild(away);
  return s;
}

/* ---------- the wardrobe: make it yours ---------- */
function _ptLook() { const g = petGet(); return Object.assign({}, g.look || petDefault()); }
function _ptLookSet(patch, keepRedo) {
  const before = _ptLook();
  const after = petNormalize(Object.assign({}, before, patch));
  if (JSON.stringify(before) === JSON.stringify(after)) return false;
  _ptUI.undo.push(before); if (_ptUI.undo.length > 40) _ptUI.undo.shift();
  if (!keepRedo) _ptUI.redo = [];
  const name = after.name; delete after.name;
  petSet({ look: after });
  return true;
}
function _ptWardrobe(root, g) {
  const wrap = _ptEl('div', 'pt-ward');
  const prev = _ptEl('div', 'card pt-ward-prev');
  const stageBox = _ptEl('div', 'pt-ward-stage');
  prev.appendChild(stageBox);
  const poses = _ptEl('span', 'seg pt-poses'); poses.setAttribute('role', 'radiogroup'); poses.setAttribute('aria-label', 'Preview pose');
  for (const [id, label] of [['sit', 'Sit'], ['walk', 'Walk'], ['sleep', 'Nap']]) {
    const b = _ptEl('button', _ptUI.pose === id ? 'on' : '', label); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(_ptUI.pose === id));
    b.onclick = () => { if (_ptUI.pose === id) return; _ptUI.pose = id; for (const x of poses.children) { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); } paintPrev(); };
    poses.appendChild(b);
  }
  prev.appendChild(poses);
  // the name
  const nameRow = _ptEl('label', 'pt-name');
  nameRow.appendChild(_ptEl('span', 'muted', 'Name'));
  const inp = _ptEl('input', 'input pt-name-in'); inp.type = 'text'; inp.maxLength = PET_MAX.name * 2; inp.value = g.name; inp.placeholder = petRandomName(g.look.species, _ptHash(g.born || 'x')); inp.setAttribute('aria-label', 'Your pet\'s name');
  inp.onchange = () => {
    const before = petGet().name, v = petText(inp.value, PET_MAX.name);
    inp.value = v;
    if (v === before) return;
    petSet({ name: v });
    toast(v ? `Hello, ${v}!` : 'Name cleared', { icon: 'tag', action: { label: 'Undo', run: () => { petSet({ name: before }); inp.value = before; } } });
  };
  nameRow.appendChild(inp);
  const dice = _ptBtn('', 'wand-sparkles', () => { inp.value = petRandomName(petGet().look.species, Math.floor(Math.random() * 1e6)); inp.onchange(); }, 'btn-ghost');
  dice.setAttribute('aria-label', 'Suggest a name'); dice.setAttribute('data-tip', 'Suggest a name');
  nameRow.appendChild(dice);
  prev.appendChild(nameRow);
  const tools = _ptEl('div', 'pt-ward-tools');
  const undoB = _ptBtn('Undo', 'undo-2', () => { const x = _ptUI.undo.pop(); if (!x) return; _ptUI.redo.push(_ptLook()); delete x.name; petSet({ look: x }); paintAll(); }, 'btn-ghost');
  const redoB = _ptBtn('Redo', 'redo-2', () => { const x = _ptUI.redo.pop(); if (!x) return; _ptUI.undo.push(_ptLook()); delete x.name; petSet({ look: x }); paintAll(); }, 'btn-ghost');
  const rand = _ptBtn('Surprise me', 'wand-sparkles', () => {
    const ctx = petUnlockCtx(), cur = _ptLook();
    _ptLookSet(petRandom(Math.random, (f, id, s) => !petLockOf(f, id, ctx, s), { species: cur.species }));
    paintAll();
  });
  tools.append(rand, undoB, redoB);
  prev.appendChild(tools);
  wrap.appendChild(prev);
  const opts = _ptEl('div', 'pt-ward-opts');
  wrap.appendChild(opts);
  root.appendChild(wrap);
  const paintPrev = () => {
    stageBox.replaceChildren();
    const pe = petEl('me', 176, { pose: _ptUI.pose, mood: _ptUI.pose === 'sleep' ? { eyes: 'closed' } : { eyes: 'open', mouth: 'smile' }, motion: true, crop: 'none' });
    if (pe) stageBox.appendChild(pe);
    undoB.disabled = !_ptUI.undo.length; redoB.disabled = !_ptUI.redo.length;
  };
  const paintAll = () => { paintPrev(); paintOpts(); };
  const paintOpts = () => {
    const keepScroll = document.getElementById('main') ? document.getElementById('main').scrollTop : 0;
    opts.replaceChildren();
    const look = _ptLook(), sp = petSpecies(look.species), ctx = petUnlockCtx();
    const pick = (field, id) => { if (_ptLookSet({ [field]: id })) paintAll(); };
    // species
    const sSec = _ptSec('Companion', 'paw-print');
    const sg = _ptEl('div', 'pt-tiles pt-tiles-sp');
    for (const s of PET_SPECIES) {
      const lock = petLockOf('species', s.id, ctx);
      const on = s.id === look.species;
      const t = _ptTile(lock, on, s.label, petSvg(Object.assign({}, look, { species: s.id, breed: '', coat: '', marks: '' }), { size: 64, pose: 'sit', mood: { eyes: 'open' } }));
      t.onclick = () => { if (!lock && !on) pick('species', s.id); };
      sg.appendChild(t);
    }
    sSec.appendChild(sg); opts.appendChild(sSec);
    // breed
    if (sp.breeds) {
      const bSec = _ptSec(sp.id === 'dog' ? 'Breed' : sp.id === 'cat' ? 'Fur' : 'Ears', 'sparkles');
      const bg = _ptEl('div', 'pt-tiles');
      for (const b of sp.breeds) {
        const on = b.id === look.breed;
        const t = _ptTile('', on, b.label, petSvg(Object.assign({}, look, { breed: b.id }), { size: 56, pose: 'sit', crop: sp.id === 'dog' ? 'none' : 'head' }));
        t.onclick = () => { if (!on) pick('breed', b.id); };
        bg.appendChild(t);
      }
      bSec.appendChild(bg); opts.appendChild(bSec);
    }
    // coat and markings
    const cSec = _ptSec('Coat', 'palette');
    const sw = _ptEl('div', 'pt-swatches');
    for (const c of sp.coats) {
      const on = c.id === look.coat;
      const b = _ptEl('button', 'pt-sw pt-sw-coat' + (on ? ' is-on' : '')); b.type = 'button';
      b.style.setProperty('--a', c.a); b.style.setProperty('--b', c.b); b.style.setProperty('--c', c.c);
      b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', c.label); b.setAttribute('data-tip', c.label);
      b.onclick = () => { if (!on) pick('coat', c.id); };
      sw.appendChild(b);
    }
    cSec.appendChild(sw);
    const mg = _ptEl('div', 'pt-tiles');
    for (const m of sp.marks) {
      const on = m.id === look.marks;
      const t = _ptTile('', on, m.label, petSvg(Object.assign({}, look, { marks: m.id }), { size: 56, pose: 'sit' }));
      t.onclick = () => { if (!on) pick('marks', m.id); };
      mg.appendChild(t);
    }
    cSec.appendChild(mg);
    const eg = _ptEl('div', 'pt-swatches pt-eyes');
    eg.appendChild(_ptEl('span', 'muted', 'Eyes'));
    for (const [id, e] of Object.entries(PET_EYES)) {
      const lock = petLockOf('eyes', id, ctx, look.species), on = id === look.eyes;
      const b = _ptEl('button', 'pt-sw pt-sw-eye' + (on ? ' is-on' : '') + (lock ? ' is-locked' : '')); b.type = 'button';
      b.style.setProperty('--a', id === 'auto' ? (petAutoEye(look) || '#2a2124') : e.hex); b.style.setProperty('--b', e.hex2 || (id === 'auto' ? (petAutoEye(look) || '#2a2124') : e.hex));
      b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', e.label + (lock ? ': ' + lock : '')); b.setAttribute('data-tip', lock ? `${e.label}: ${lock}` : e.label);
      if (lock) b.disabled = true; else b.onclick = () => { if (!on) pick('eyes', id); };
      eg.appendChild(b);
    }
    cSec.appendChild(eg);
    opts.appendChild(cSec);
    // accessories
    const aSec = _ptSec('Accessories', 'shirt');
    for (const [field, label] of [['hat', 'Hat'], ['glasses', 'Glasses'], ['bow', 'Bow or flower'], ['collar', 'Collar'], ['bandana', 'Bandana']]) {
      const sub = _ptEl('div', 'pt-acc');
      sub.appendChild(_ptEl('h3', null, label));
      const tg = _ptEl('div', 'pt-tiles pt-tiles-acc');
      for (const o of PET_ACC[field]) {
        const lock = petLockOf(field, o.id, ctx, look.species), on = o.id === look[field];
        const crop = field === 'collar' || field === 'bandana' ? 'none' : 'head';
        const t = _ptTile(lock, on, o.label, o.id === 'none' ? '<span class="pt-none" aria-hidden="true"></span>' : petSvg(Object.assign({}, look, { [field]: o.id }), { size: 52, pose: 'sit', crop }));
        t.onclick = () => { if (!lock && !on) pick(field, o.id); };
        tg.appendChild(t);
      }
      sub.appendChild(tg);
      if (look[field] !== 'none') {
        const cf = field + 'Col', row = _ptEl('div', 'pt-swatches');
        for (const [id, c] of Object.entries(PET_ACC_COLS)) {
          if (field === 'glasses' && id === 'rainbow') continue;
          const lock = petLockOf(cf, id, ctx, look.species), on = id === look[cf];
          const b = _ptEl('button', 'pt-sw' + (on ? ' is-on' : '') + (lock ? ' is-locked' : '') + (id === 'rainbow' ? ' is-rainbow' : '')); b.type = 'button';
          b.style.setProperty('--a', c.hex); b.style.setProperty('--b', c.hex);
          b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', `${label} colour: ${c.label}${lock ? ', ' + lock : ''}`); b.setAttribute('data-tip', lock ? `${c.label}: ${lock}` : c.label);
          if (lock) b.disabled = true; else b.onclick = () => { if (!on) pick(cf, id); };
          row.appendChild(b);
        }
        sub.appendChild(row);
      }
      aSec.appendChild(sub);
    }
    opts.appendChild(aSec);
    const m = document.getElementById('main'); if (m && keepScroll) m.scrollTop = keepScroll;
  };
  paintAll();
}
/** An option tile: its preview, its name, a lock when it is not yours yet. art is markup from petSvg (allow-listed ids only). */
function _ptTile(lock, on, label, art) {
  const t = _ptEl('button', 'pt-tile' + (on ? ' is-on' : '') + (lock ? ' is-locked' : '')); t.type = 'button';
  const a = _ptEl('span', 'pt-tile-art'); a.innerHTML = art; t.appendChild(a);
  t.appendChild(_ptEl('span', 'pt-tile-l', label));
  if (lock) { const l = _ptEl('span', 'pt-tile-lock'); l.innerHTML = icon('lock', 'i-xs'); t.appendChild(l); t.setAttribute('data-tip', lock); t.setAttribute('aria-label', `${label}: ${lock}`); t.disabled = true; }
  t.setAttribute('aria-pressed', String(on));
  return t;
}

/* ---------- the journal ---------- */
function _ptJournalTab(root, g) {
  const s = _ptSec('Journal', 'notebook-pen');
  const list = petJournal();
  s.appendChild(list.length ? _ptJournalList(list, g) : emptyLine('Milestones land here: treats, tricks, streaks, levels, weeks together.'));
  root.appendChild(s);
}
function _ptJournalList(list, g) {
  const ul = _ptEl('ol', 'pt-journal');
  if (!list.length) return emptyLine(`Days with ${petName(g)} will write themselves here.`);
  for (const e of list) {
    const li = _ptEl('li', 'pt-j');
    const ic = _ptEl('span', 'pt-j-ic'); ic.innerHTML = icon(e.icon, 'i-sm'); li.appendChild(ic);
    li.appendChild(_ptEl('span', 'pt-j-t', e.line));
    let when = e.d;
    try { when = new Date(e.d + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: e.d.slice(0, 4) === _ptToday().slice(0, 4) ? undefined : 'numeric' }); } catch (err) { /* the iso date */ }
    li.appendChild(_ptEl('span', 'pt-j-d muted', when));
    ul.appendChild(li);
  }
  return ul;
}

/* ---------- the Home widget ---------- */
if (typeof registerHomeWidget === 'function') {
  registerHomeWidget({
    id: 'pet', title: 'Your pet', icon: 'paw-print', group: 'fun', order: 266, fresh: true, defaultHidden: true,
    sizes: ['s', 'm'], defaultSize: 's',
    description: 'Your companion: pat it, give it the treats you earn, watch it nap. Never guilt',
    emptyHint: 'Hidden while the Fun level is Off',
    aliases: ['pet', 'cat', 'dog', 'companion', 'tamagotchi', 'treat', 'buddy', 'animal'],
    render(el, ctx) { return _ptWidget(el, ctx || {}); },
  });
}
function _ptWidget(el, ctx) {
  if (_ptFun() === 'off' && !ctx.preview) return false;
  const g = petGet(), size = ctx.size || 's';
  const card = _ptEl('section', 'card home-card pt-w pt-w-' + size);
  card.innerHTML = `<div class="card-h">${icon('paw-print')}<h3></h3><span class="n"></span></div><div class="card-b pt-w-b"></div>`;
  const h3 = card.querySelector('h3'), n = card.querySelector('.n'), body = card.querySelector('.pt-w-b');
  if (!g.has || !g.on) {
    h3.textContent = 'A companion';
    const art = _ptEl('span', 'pt-w-adopt-art');
    art.innerHTML = petSvg(petDefault(['cat', 'dog', 'rabbit', 'fox'][_ptHash(_ptToday()) % 4]), { size: 64, pose: 'sleep' });
    body.appendChild(art);
    const t = _ptEl('div', 'pt-w-adopt');
    t.appendChild(_ptEl('p', null, g.has ? `${petName(g)} is resting out of sight.` : 'Adopt a pet that grows with what you do.'));
    t.appendChild(_ptBtn(g.has ? 'Bring them back' : 'Adopt a pet', 'heart', () => { if (g.has) petSet({ on: true }); setView('pet'); }, 'btn-primary'));
    body.appendChild(t);
    el.appendChild(card);
    return true;
  }
  h3.textContent = petName(g);
  const t = petTreats();
  n.textContent = t.have ? `${t.have} ${t.have === 1 ? 'treat' : 'treats'}` : '';
  const stage = _ptStageEl(g, size === 's' ? 92 : 112, { onPat: () => paintMood() });
  body.appendChild(stage);
  const side = _ptEl('div', 'pt-w-side');
  const mood = _ptEl('p', 'pt-w-mood');
  const paintMood = () => { mood.textContent = (petMood() || {}).line || ''; const tt = petTreats(); n.textContent = tt.have ? `${tt.have} ${tt.have === 1 ? 'treat' : 'treats'}` : ''; };
  paintMood();
  side.appendChild(mood);
  const acts = _ptEl('div', 'pt-w-acts');
  acts.appendChild(_ptBtn('Treat', 'cookie', () => _ptFeedNow(stage, paintMood)));
  const open = _ptBtn('Open', 'arrow-right', () => setView('pet'), 'btn-ghost');
  acts.appendChild(open);
  side.appendChild(acts);
  body.appendChild(side);
  el.appendChild(card);
  return true;
}
// keep the widget and the page in step when the pet changes elsewhere (another tab or device: live sync re-renders the rest)
document.addEventListener('opendash:pet', () => {
  try {
    for (const w of document.querySelectorAll('.pt-w .pt-stage')) { const g = petGet(); if (g.has) _ptRedrawStage(w, g, w._ptSize || 92); }
  } catch (e) { /* the next render */ }
});

/* ---------- Friends: a friend's pet on their page, friends' pets in the hangout ---------- */
if (typeof Friends !== 'undefined' && Friends && typeof Friends.registerPanel === 'function') {
  Friends.registerPanel({ id: 'pet', order: 9, where: 'friend', title: 'Their pet', icon: 'paw-print', render: (el, friend) => _ptFriendPanel(el, friend) });
  Friends.registerPanel({ id: 'pets', order: 30, where: 'hangout', title: "Friends' pets", icon: 'paw-print', render: (el) => _ptHangoutPanel(el) });
}
function _ptFriendPanel(el, friend) {
  if (!friend || !friend.profile) return false;
  const w = _ptWho(friend);
  if (!w.look) return false;
  const box = _ptEl('div', 'pt-fr');
  const stage = _ptEl('div', 'pt-stage pt-fr-stage pt-sky-day');
  stage.innerHTML = '<span class="pt-stage-sky" aria-hidden="true"></span><span class="pt-stage-rug" aria-hidden="true"></span>';
  const pe = petEl(friend, 112, { motion: true });
  if (pe) { pe.classList.add('pt-stage-pet'); stage.appendChild(pe); }
  box.appendChild(stage);
  const t = _ptEl('div', 'pt-fr-t');
  const sp = petSpecies(w.look.species) || {};
  t.appendChild(_ptEl('b', null, w.name || sp.label || 'Their pet'));
  t.appendChild(_ptEl('span', 'muted', [sp.label, w.look.breed && sp.breeds ? (sp.breeds.find(b => b.id === w.look.breed) || {}).label : ''].filter(Boolean).join(' · ')));
  t.appendChild(_ptBtn('Give ' + (w.name || 'them') + ' a pat', 'heart', () => petHeartsAt(stage)));
  t.appendChild(_ptEl('span', 'muted pt-fr-note', 'Pats stay on this computer.'));
  box.appendChild(t);
  el.appendChild(box);
  return true;
}
function _ptHangoutPanel(el) {
  let list = [];
  try { list = (Friends.list() || []).filter(f => f && f.status === 'friend' && _ptWho(f).look); } catch (e) { list = []; }
  const mine = petHas();
  if (!list.length && !mine) return false;
  const row = _ptEl('div', 'pt-hang');
  if (mine) { const b = petCardBadge('me', { size: 52 }); if (b) row.appendChild(b); }
  for (const f of list.slice(0, 12)) {
    const b = petCardBadge(f, { size: 52 });
    if (!b) continue;
    const owner = _ptEl('span', 'pt-hang-o muted', typeof friendName === 'function' ? friendName(f) : 'Friend');
    b.appendChild(owner);
    b.onclick = (e) => { e.stopPropagation(); petHeartsAt(b); };
    b.ondblclick = () => { if (Friends.open) Friends.open(f.id); };
    row.appendChild(b);
  }
  if (!list.length) row.appendChild(emptyLine('When your friends adopt pets, they gather here.'));
  el.appendChild(row);
  return true;
}

/* ---------- the sidebar (hidden until shown in Customise sidebar) and the palette ---------- */
if (typeof registerSidebarBlock === 'function') {
  registerSidebarBlock('home', {
    id: 'pet-nav', order: 15, label: 'Your pet', hiddenByDefault: true,
    render(el) {
      const g = petGet();
      el.appendChild(sbNavItem({ label: g.has ? petName(g) : 'Your pet', icon: 'paw-print', view: 'pet', active: /^pet(:|$)/.test(String(state.view || '')), title: g.has ? (petMood() || {}).line || '' : 'Adopt a pet' }));
    },
  });
}
// integrate 2.18: once adopted, your pet has a row under Home's 'Fun' heading with the Garden (gardenFunNavAdd,
// 94-garden-4page.js). It steps aside while the separate 'Your pet' block above is shown (Customise sidebar), so never twice.
function _ptNavBlockShown() {
  try { return typeof sbBlockHidden === 'function' && typeof sbLayout === 'function' && !sbBlockHidden(sbLayout(), 'home', { id: 'pet-nav', hiddenByDefault: true }); } catch (e) { return false; }
}
if (typeof gardenFunNavAdd === 'function') {
  gardenFunNavAdd({ id: 'pet', order: 10, icon: 'paw-print', view: 'pet', get label() { try { return petName(); } catch (e) { return 'Your pet'; } }, when: () => petHas() && !_ptNavBlockShown() });
}
if (typeof registerCommand === 'function') {
  registerCommand({ id: 'pet-open', label: 'Your pet', icon: 'paw-print', group: 'Go to', keywords: 'pet companion cat dog animal tamagotchi buddy', run: () => setView('pet') });
  registerCommand({ id: 'pet-wardrobe', label: "Pet: dress up your pet", icon: 'shirt', keywords: 'pet wardrobe hat collar accessories customise colour breed', run: () => setView('pet:wardrobe') });
  registerCommand({ id: 'pet-treat', label: 'Pet: give a treat', icon: 'cookie', keywords: 'pet feed treat snack', run: () => { const r = petFeed(); toast(r.msg || 'Adopt a pet first', { icon: 'cookie', action: r.ok ? null : { label: 'Open', run: () => setView('pet') } }); } });
  registerCommand({ id: 'pet-pat', label: 'Pet: give a pat', icon: 'heart', keywords: 'pet pat stroke cuddle', run: () => { const r = petPat(); toast(r.ok ? `${petName()} leans in happily` : 'Adopt a pet first', { icon: 'heart' }); } });
  registerCommand({ id: 'pet-journal', label: "Pet: journal", icon: 'notebook-pen', keywords: 'pet journal milestones', run: () => setView('pet:journal') });
}
