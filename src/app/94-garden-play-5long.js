/* ============================================================
   PLAY: what takes a long time. The old mill, the old gardener's pages, lost marbles. docs/dev/HUNDRED_PLAY.md 17, 18, 20.
   The mill and the jar show how far you have got through a decoration's variant, which friends already receive, so a friend sees it mending with no new message.
   Saved: pl.ml.<stage>.<slot> (how many handed in), pl.jn.<page> (a page's day), pl.jn.mine (your own last page: it stays with you), pl.mb.<id> (a marble's day).
   ============================================================ */

/* ---------- the old mill ---------- */
const GP_MILL = Object.freeze([
  { id: 'wheel', name: 'The water wheel', words: 'The wheel lies in the stream. Once it is back up, the mill gives you flour for the pot, one bag a day.', tickets: 10, slots: [['veg', 5, 'vegetables'], ['fish', 2, 'fish, any kind'], ['fertiliser', 1, 'a bag of fertiliser']] },
  { id: 'roof', name: 'A roof', words: 'Rain has been coming in for fifty years.', tickets: 15, slots: [['flower', 6, 'flowers, any kind'], ['bug', 3, 'bugs, any kind'], ['honey', 1, 'a jar of honey']] },
  { id: 'door', name: 'A proper door', words: 'Somebody nailed it shut, and then lost the hammer.', tickets: 20, slots: [['fruit', 6, 'fruit, any kind'], ['herb', 4, 'herbs, any kind'], ['fish', 5, 'fish, any kind']] },
  { id: 'lamp', name: 'A light in the window', words: 'So you can see it from the lake at night.', tickets: 25, slots: [['dish', 3, 'things you cooked'], ['egg', 4, 'eggs'], ['flour', 5, 'bags of flour']] },
  { id: 'water', name: 'Let the water through', words: 'This is the last of it. Open the old sluice and see what happens.', tickets: 40, slots: [['veg', 15, 'vegetables'], ['fish', 10, 'fish, any kind'], ['flower', 15, 'flowers, any kind'], ['dish', 6, 'things you cooked']] },
]);
function _gpMillMatch(tag, item) {
  if (tag === 'fertiliser' || tag === 'honey' || tag === 'egg' || tag === 'flour') return item === tag;
  if (tag === 'dish') return /^dish:/.test(item);
  if (tag === 'bug') return /^bug:/.test(item);
  return _gpIngTag(item) === tag;
}
function _gpMillStage() { let n = 0; for (const st of GP_MILL) { if (st.slots.every((s, i) => Number(gpGet(`ml.${st.id}.${i}`, 0)) >= s[1])) n++; else break; } return n; }
function _gpMillGive(st, i) {
  const s = st.slots[i], key = `ml.${st.id}.${i}`, have = Number(gpGet(key, 0)), want = s[1] - have; if (want <= 0) return 0;
  const items = gardenWallet().items, out = {}; let left = want;
  for (const k of Object.keys(items)) { if (left <= 0) break; const n = Math.floor(items[k] || 0); if (n < 1 || !_gpMillMatch(s[0], k)) continue; const t = Math.min(n, left); out[k] = -t; left -= t; }
  const gave = want - left; if (!gave) return 0;
  const lk = 'pl.' + _gdToday() + '.' + _gdUid(''), mark = _gdMark([['led', lk], ['seen', 'pl.' + key]]), g = _gdG();
  g.led[lk] = { d: _gdToday(), k: 'pl', i: out, n: 1 }; g.seen['pl.' + key] = have + gave;
  _gdDone(`Handed in ${gave}`, 'handing that in', mark, { icon: 'gift' });
  return gave;
}
function _gpMillOpen() {
  gpStage('The old mill', (el) => {
    const paint = () => {
      el.textContent = '';
      gpGrant('start', { 'decor:play-pot': 1, 'decor:play-mill': 1 });
      const stage = _gpMillStage(), head = gpEl('div', 'gp-millhead'), placed = Object.values(_gdG().decor).some(d => d && d.d === 'play-mill');
      head.innerHTML = `<div class="gp-millart">${gardenIconSvg('play-mill', { kind: 'decor', px: 120, variant: stage })}</div><div><p class="gp-lead">Somebody worked here once. It has been a ruin a long time. Bring it what it needs, a bit at a time, and it will mend where it stands.</p>${placed ? '' : '<p class="muted">The mill is in your bag. Put it somewhere with a bit of room: you will see it change.</p>'}<p class="muted">${stage} of ${GP_MILL.length} done.</p></div>`;
      el.appendChild(head);
      GP_MILL.forEach((st, si) => {
        const done = si < stage, cur = si === stage, card = gpEl('div', 'gp-millcard' + (done ? ' is-done' : cur ? ' is-now' : ' is-later'));
        card.appendChild(gpEl('b', '', cur || done ? st.name : 'Later'));
        if (cur) {
          card.appendChild(gpEl('p', 'muted', st.words));
          st.slots.forEach((s, i) => {
            const got = Number(gpGet(`ml.${st.id}.${i}`, 0)), row = gpEl('div', 'gp-millslot'), any = Object.keys(gardenWallet().items).filter(k => gardenWallet().items[k] >= 1 && _gpMillMatch(s[0], k)).reduce((a, k) => a + Math.floor(gardenWallet().items[k]), 0);
            row.innerHTML = `<span class="gp-t"><b>${Math.min(got, s[1])} of ${s[1]}</b> ${esc(s[2])}</span><span class="gp-bar"><i style="width:${Math.min(100, got / s[1] * 100)}%"></i></span>`;
            if (got < s[1]) row.appendChild(uiButton({ label: any ? `Hand in (you have ${any})` : 'You have none yet', size: 'sm', disabled: !any, run: () => {
              const was = _gpMillStage(); _gpMillGive(st, i);
              if (_gpMillStage() > was) { const r = gpPay('mill', { tickets: st.tickets, xp: 10 }); gpTone([392, 523, 659, 784], { gap: 0.14 }); gpSet('ev.mill', _gpMillStage()); gardenToast(`${st.name}: done. ${gpPaidLine(r)}`, { icon: 'sparkles', dismiss: true }); _gpMillSync(); }
              paint();
            } }));
            card.appendChild(row);
          });
        }
        el.appendChild(card);
      });
      if (stage >= GP_MILL.length) el.appendChild(gpEl('p', 'gp-lead', 'The wheel turns. Nobody has heard that sound in fifty years.'));
    };
    paint();
  });
}
function _gpMillSync() {
  const g = _gdG(), v = _gpMillStage(); let changed = false;
  for (const d of Object.values(g.decor)) if (d && d.d === 'play-mill' && d.v !== v) { d.v = v; changed = true; }
  const j = Object.keys(_gpMarblesFound()).length, jv = Math.min(6, Math.floor(j / 4) + (j ? 1 : 0));
  for (const d of Object.values(g.decor)) if (d && d.d === 'play-jar' && d.v !== jv) { d.v = jv; changed = true; }
  if (changed) _gdSave();
}
gardenPlayAdd({ id: 'mill', name: 'The old mill', icon: 'wheat', group: 'make', verb: 'See what it needs', blurb: 'Bring a ruin back, a piece at a time, until the wheel turns.', status: () => `${_gpMillStage()} of ${GP_MILL.length} mended`, hud: () => _gpMillSync(),
  bubble: (d, items) => { if (_gpMillStage() < 1) return; const key = 'plfl.' + _gdToday(), ready = !_gdG().led[key]; items.unshift({ ic: 'wheat', label: ready ? 'Take the flour' : 'More flour tomorrow', cls: ready ? 'is-go' : 'is-off', run: () => { if (_gdG().led[key]) return; const mark = _gdMark([['led', key]]); _gdG().led[key] = { d: _gdToday(), k: 'pl', i: { flour: 1 }, n: 1 }; _gdDone('A bag of flour', 'taking the flour', mark, { icon: 'wheat' }); gardenBubbleClose(); } }); },
  open: _gpMillOpen });

/* ---------- the old gardener's pages: a page, and what you have to do to find the next one ---------- */
const GP_PAGES = Object.freeze([
  { text: 'If you are reading this, the pot is yours now. I left a few pages about the place. I was never tidy. I got up early all my life, and it was not for the work. Water something at first light and you will see.', clue: 'Water something at dawn.', ok: (c) => c.ev('dawnwater') },
  { text: 'There. At dawn the garden tells the truth: everything looks like what it is. My father ran the mill down by the water, and his father. I let it go. I am sorry about that. It wants somebody who is not in a hurry.', clue: 'Get the mill’s wheel back up.', ok: () => _gpMillStage() >= 1 },
  { text: 'You did that faster than I would have. My father used to say a mill is only a way of making people come and see you. Nobody came to see me, by the end, except the dog, and he was after the flour. Make something with it.', clue: 'Cook something with flour in it.', ok: (c) => c.ev('flour') },
  { text: 'Good smell, I expect. I always gave the first of everything to the dog. It is the only rule I ever kept. You will find it is a good one.', clue: 'Give your pet something you cooked.', ok: (c) => c.ev('fedpet') },
  { text: 'He went off, that dog, days at a time. He came back with burrs in his ears and no explanation. I used to sit up. I never told him. Let yours go. They come back. It is the whole point of them.', clue: 'Send your pet on a journey, and get its postcard.', ok: () => _gpCards().length >= 1 },
  { text: 'I dug this whole place over, once, for potatoes, and hit something that was not a potato. I covered it up again. I was afraid it would turn out to be important, and that people would come. It is still down there. You go.', clue: 'Find an old piece of something, on a dig.', ok: () => GP_FOSSILS.some(F => F.parts.some(P => gardenHas(`fos:${F.id}-${P[0]}`) > 0)) },
  { text: 'There was a bird, one summer, that sang the same thing every evening from the same post. I took to singing it back. I am not musical. It did not seem to mind. I think it is the nearest I came to talking to anybody that year.', clue: 'Learn a tune from the bird.', ok: () => Number(gpGet('best.song', 0)) >= 4 },
  { text: 'I lost my marbles here. I mean that both ways. I had them as a boy and they turned up all over the garden for sixty years: under a root, in the rain gutter. They only show when they feel like it. You have to walk slowly. That was always the trouble with people.', clue: 'Find six lost marbles.', ok: () => Object.keys(_gpMarblesFound()).length >= 6 },
  { text: 'This is the last one, and my hand is not what it was. There is a chair I left out by the shed, which has moved about a bit. Sit in it some evening. Do nothing at all. Everything you have been doing will carry on without you, and that is not a sad thing, it took me eighty years to see that. I have left you the next page blank. It is not for me.', clue: '', ok: () => false, end: true },
]);
function gpPagesFound() { let n = 0; for (let i = 0; i < GP_PAGES.length; i++) if (gpGet('jn.' + i)) n = i + 1; else break; return n; }
function _gpPagesCheck(quiet) {
  let n = gpPagesFound();
  if (!n) return 0;
  const ctx = { ev: (k) => !!gpGet('ev.' + k) };
  let moved = false;
  while (n < GP_PAGES.length && GP_PAGES[n - 1].ok(ctx)) { gpSet('jn.' + n, _gdToday()); n++; moved = true; }
  if (moved) {
    gpSet('jnnew', 1);
    if (n >= GP_PAGES.length) gpGrant('chair', { 'decor:play-chair': 1 });
    if (!quiet) gpNote('A torn page blew against your foot. It is under Play.');
  }
  return n;
}
document.addEventListener('opendash:garden', (e) => { const d = e.detail || {}; if (d.kind === 'water') { try { if (gardenModel().tod === 'dawn' && !gpGet('ev.dawnwater')) gpSet('ev.dawnwater', 1); } catch (x) { /* later */ } } });
function _gpPagesOpen() {
  gpStage('The old gardener’s pages', (el) => {
    if (!gpGet('jn.0')) gpSet('jn.0', _gdToday());
    _gpPagesCheck(true);
    gpSet('jnnew', 0);
    const n = gpPagesFound();
    let at = n - 1;
    const paint = () => {
      el.textContent = '';
      const blank = at >= GP_PAGES.length, page = gpEl('div', 'gp-page' + (blank ? ' is-blank' : ''));
      if (blank) {
        page.appendChild(gpEl('p', 'gp-pagehand', 'For whoever comes next.'));
        const ta = gpEl('textarea', 'control gp-mine'); ta.rows = 6; ta.value = String(gpGet('jn.mine', '')); ta.placeholder = 'This page is yours. It stays here with you.'; ta.setAttribute('aria-label', 'Your page');
        ta.onchange = () => gpSet('jn.mine', ta.value.slice(0, 2000));
        page.appendChild(ta);
      } else {
        const P = GP_PAGES[at];
        page.appendChild(gpEl('span', 'gp-pageno', `${at + 1}`));
        page.appendChild(gpEl('p', 'gp-pagehand', P.text));
        if (at === n - 1 && P.clue) page.appendChild(gpEl('p', 'gp-clue', P.clue));
        if (P.end) page.appendChild(gpEl('p', 'gp-clue', 'The chair is in your bag.'));
      }
      el.appendChild(page);
      const nav = gpEl('div', 'gp-row');
      nav.appendChild(uiButton({ label: 'Page before', icon: 'chevron-left', size: 'sm', disabled: at <= 0, run: () => { at--; paint(); } }));
      nav.appendChild(uiButton({ label: 'Page after', icon: 'chevron-right', size: 'sm', disabled: at >= (n >= GP_PAGES.length ? GP_PAGES.length : n - 1), run: () => { at++; paint(); } }));
      el.appendChild(nav);
    };
    paint();
  }, { size: 'md' });
}
gardenPlayAdd({ id: 'pages', name: 'A torn page', icon: 'scroll-text', group: 'secret', blurb: 'Somebody was here before you, and left things about.', status: () => { const n = gpPagesFound(); return n ? `${n} of ${GP_PAGES.length} pages` : 'Read it'; }, fresh: () => !!gpGet('jnnew') || !gpGet('jn.0'), hud: () => { _gpPagesCheck(false); }, open: _gpPagesOpen });

/* ---------- lost marbles: a glint when you are close, some only at certain times ---------- */
const GP_MARBLES = Object.freeze(Array.from({ length: 24 }, (_, i) => ({ id: 'm' + i, c: ['#e8843c', '#3aa8c8', '#d8405a', '#7fbf5a', '#f2c21e', '#8a5ac8'][i % 6],
  when: i < 10 ? {} : i < 14 ? { tod: ['night'] } : i < 17 ? { tod: ['dawn'] } : i < 19 ? { tod: ['dusk'] } : i < 21 ? { rain: true } : { season: ['spring', 'summer', 'autumn', 'winter'][i - 21 < 3 ? i - 21 : 3] } })));
function _gpMarblesFound() { const out = {}; const s = _gdG().seen; for (const k of Object.keys(s)) if (k.startsWith('pl.mb.')) out[k.slice(6)] = s[k]; return out; }
function _gpMarbleOk(M, m) { const w = M.when; if (w.tod && !w.tod.includes(m.tod)) return false; if (w.rain && !(m.rain && m.rain.now)) return false; if (w.season && m.season !== w.season) return false; return true; }
function _gpMarbleCell(M) {
  const W = GARDEN_WORLD;
  for (let t = 0; t < 30; t++) { const h = gardenHash('gpmb|' + _gdG().since + '|' + M.id + '|' + t), x = h % W.cols, y = (h >> 8) % W.rows; try { if (gardenReachable(x, y) && !gardenIceAt(x, y) && gardenWorldFree(x + 0.5, y + 0.5, 0.1)) return { x: x + 0.5, y: y + 0.5 }; } catch (e) { return null; } }
  return null;
}
const _gpMb = { timer: 0, live: new Map(), cells: new Map() };
function _gpMarbleScan() {
  if (!gpInWorld() || document.hidden) { if (!gpInWorld()) { clearInterval(_gpMb.timer); _gpMb.timer = 0; for (const s of _gpMb.live.values()) s.remove(); _gpMb.live.clear(); } return; }
  const m = gardenModel(), found = _gpMarblesFound(), px = _gw.px, py = _gw.py, R = 3.2;
  for (const M of GP_MARBLES) {
    const live = _gpMb.live.get(M.id);
    if (found[M.id]) { if (live) { live.remove(); _gpMb.live.delete(M.id); } continue; }
    if (!_gpMarbleOk(M, m)) { if (live) { live.remove(); _gpMb.live.delete(M.id); } continue; }
    if (!_gpMb.cells.has(M.id)) _gpMb.cells.set(M.id, _gpMarbleCell(M));
    const C = _gpMb.cells.get(M.id); if (!C) continue;
    const d = Math.hypot(C.x - px, C.y - py);
    if (d < R && !live) {
      const S = gardenWorldAdd({ id: 'gp-mb-' + M.id, x: C.x, y: C.y, hit: 0.5, label: 'Something glinting', cursor: 'pointer',
        svg: `<g class="gp-glint"><circle r="4" cy="-3" fill="${M.c}"/><circle r="1.300" cx="-1.200" cy="-4.400" fill="#fff"/><path d="M0 -13v5M-5 -9l3 2M5 -9l-3 2" stroke="#fff" stroke-width="1.200" stroke-linecap="round"/></g>`,
        onClick: () => _gpMarbleTake(M) });
      _gpMb.live.set(M.id, S);
    } else if (d > R + 2 && live) { live.remove(); _gpMb.live.delete(M.id); }
  }
}
function _gpMarbleTake(M) {
  const S = _gpMb.live.get(M.id); if (S) { S.remove(); _gpMb.live.delete(M.id); }
  gpSet('mb.' + M.id, _gdToday());
  const n = Object.keys(_gpMarblesFound()).length;
  const first = gpGrant('jar', { 'decor:play-jar': 1 });
  const r = n % 6 === 0 ? gpPay('marbles', { tickets: 5, xp: 3 }) : { tickets: 0 };
  if (n >= GP_MARBLES.length) gpGrant('bigmarble', { 'decor:play-pz-marble': 1 });
  gpTone([988, 1319], { gap: 0.09, len: 0.2 });
  try { gameCheer(null, { text: `${n} / ${GP_MARBLES.length}` }); } catch (e) { /* fine */ }
  gpNote(`A lost marble: ${n} of ${GP_MARBLES.length}.${first ? ' There is a jar for them in your bag.' : ''} ${gpPaidLine(r)}`);
  _gpMillSync();
}
function _gpMarblesOpen() {
  gpStage('Lost marbles', (el) => {
    const found = _gpMarblesFound(), n = Object.keys(found).length;
    el.appendChild(gpEl('p', 'gp-lead', `${n} of ${GP_MARBLES.length} found. They are lying about in your garden, and you only see a glint when you are close. Walk slowly. Some only show themselves at certain times.`));
    const g = gpEl('div', 'gp-marbles');
    for (const M of GP_MARBLES) { const has = !!found[M.id], c = gpEl('span', 'gp-marble' + (has ? '' : ' is-blank')); if (has) c.style.setProperty('--c', M.c); const w = M.when; c.setAttribute('data-tip', has ? 'Found' : w.tod ? `Only at ${w.tod[0] === 'night' ? 'night' : w.tod[0]}` : w.rain ? 'Only in the rain' : w.season ? `Only in ${w.season}` : 'Any time'); g.appendChild(c); }
    el.appendChild(g);
  }, { size: 'sm' });
}
gardenPlayAdd({ id: 'marbles', name: 'Lost marbles', icon: 'gem', group: 'secret', verb: 'See your marbles', blurb: 'Somebody lost 24 of them, all over your garden.', status: () => { const n = Object.keys(_gpMarblesFound()).length; return n ? `${n} of ${GP_MARBLES.length}` : ''; },
  hud: () => { if (gpInWorld() && !_gpMb.timer) _gpMb.timer = setInterval(_gpMarbleScan, 1500); },
  open: _gpMarblesOpen });
