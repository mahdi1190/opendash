/* ============================================================
   YOUR OWN HOUSE, small delights (FUN-ROADMAP Phase 6: dye pots, your banner).

   The dye pot (any piece of kind 'dye': Quince sends one, the shop has them): boil a crop from your garden for its colour (HOUSE_DYES:
   blueberries a blue, beetroot a red, onions a gold...) and dip a piece of cloth in this room in it: a rug, a quilt, a cushion, the
   armchair (rows with `dye`). Its colour is its look (v), so friends see it as you do; "wash it" takes it back to its own colours.
   One crop a dip. A friend can dye things in your house with their own crops (it is all one house).

   Your banner: a little flag on a grid (HOUSE_BANNER: 8 by 6 squares, 12 colours). It flies on a bracket at your cottage's corner
   outside (94-garden-house-4grow.js), friends see it (the snapshot's `b`), and the first one you make comes framed for indoors too.
   No top-level calls.
   ============================================================ */

/* ---------- the dye pot ---------- */
/** The crops you have that make a colour: [{ dye, crop: 'crop:id', n }] (one row per colour: the crop you have most of). */
function _hsDyesHad() {
  const w = gardenWallet(), best = new Map();
  for (const [k, n] of Object.entries(w.items)) { if (!k.startsWith('crop:') || !(n >= 1)) continue; const d = houseDyeFrom(k); if (!d) continue; const had = best.get(d.v); if (!had || n > had.n) best.set(d.v, { dye: d, crop: k, n: Math.floor(n) }); }
  return [...best.values()].sort((a, b) => a.dye.v - b.dye.v);
}
function _hsDyeOpen(R, S, pot) {
  if (typeof openDialog !== 'function') return;
  const visit = gpVisiting();
  if (visit && !(typeof _glvLive === 'function' && _glvLive())) { _grmSay('Your friend’s dye pot. It is cold: they are out.'); return; }
  let pick = null;
  openDialog({ title: 'The dye pot', width: 520, className: 'hs-dye-dlg gd-popup', body(el) {
    const cloth = S.pieces.filter(p => { const d = gardenDecor(p.d); return d && d.dye; });
    el.appendChild(gpEl('p', 'muted', 'Boil a crop for its colour and dip a piece of cloth in it. One crop a dip. Rugs, quilts, cushions and the armchair all take a dye.'));
    if (!cloth.length) { el.appendChild(gpEl('p', 'hs-dye-none', 'There is nothing in this room that takes a dye. Bring in a rug, a bed or the armchair.')); return; }
    const row1 = gpEl('div', 'hs-dye-row'); row1.appendChild(gpEl('p', 'hs-dye-h', 'What to dip')); const list = gpEl('div', 'hs-dye-pieces');
    const dyes = gpEl('div', 'hs-dye-cols'), go = gpEl('button', 'btn btn-primary btn-sm', 'Dip it'); go.type = 'button'; go.disabled = true;
    let colour = null;
    const ready = () => { go.disabled = !(pick && colour); go.textContent = colour && colour.wash ? 'Wash it' : 'Dip it'; };
    for (const p of cloth) {
      const d = gardenDecor(p.d), b = gpEl('button', 'hs-bag-b hs-dye-p'); b.type = 'button'; b.title = d.name; b.setAttribute('aria-label', d.name);
      b.innerHTML = gardenIconSvg(d.id, { kind: 'decor', px: 44 }) + (p.v ? `<i style="background:${houseDyeCol(p.v, '#fff')}"></i>` : '');
      b.onclick = () => { pick = p; for (const x of list.children) x.classList.toggle('is-on', x === b); ready(); };
      list.appendChild(b);
    }
    row1.appendChild(list); el.appendChild(row1);
    const row2 = gpEl('div', 'hs-dye-row'); row2.appendChild(gpEl('p', 'hs-dye-h', 'Which colour'));
    const had = _hsDyesHad();
    for (const H of had) {
      const plant = gardenPlant(H.crop.slice(5)), b = gpEl('button', 'hs-dye-c'); b.type = 'button';
      b.innerHTML = `<span class="hs-dye-sw" style="background:${H.dye.c}"></span><span>${esc(H.dye.name)}</span><small>${esc(plant ? plant.name.toLowerCase() : 'a crop')}, you have ${H.n}</small>`;
      b.onclick = () => { colour = H; for (const x of dyes.children) x.classList.toggle('is-on', x === b); ready(); };
      dyes.appendChild(b);
    }
    { const b = gpEl('button', 'hs-dye-c'); b.type = 'button'; b.innerHTML = '<span class="hs-dye-sw hs-dye-wash"></span><span>Wash it</span><small>back to its own colours, free</small>'; b.onclick = () => { colour = { wash: true }; for (const x of dyes.children) x.classList.toggle('is-on', x === b); ready(); }; dyes.appendChild(b); }
    if (!had.length) row2.appendChild(gpEl('p', 'muted hs-dye-none', 'You have nothing to boil yet. Blueberries, cornflowers and bluebells make a blue; beetroot and raspberries a red; onions and marigolds a gold; kale and mint a green; blackcurrants and lavender a plum; roses and strawberries a pink; carrots and pumpkins an orange.'));
    row2.appendChild(dyes); el.appendChild(row2);
    go.onclick = () => {
      if (!pick || !colour) return;
      const v = colour.wash ? 0 : colour.dye.v, op = Object.assign({ o: 'dye', u: pick.u, v }, v ? { k: colour.crop, lk: 'hdy.' + _gdUid('') } : {});
      let ok = false;
      if (visit) ok = typeof _hsGuestDo === 'function' && _hsGuestDo(R, S, op);
      else { const r = houseDo(op, v ? 'Dyed the ' + houseLowName(gardenDecor(pick.d)) + ' ' + colour.dye.name.toLowerCase() : 'Washed the ' + houseLowName(gardenDecor(pick.d))); if (!r.ok) { gardenToast(r.msg + '.', { icon: 'droplets' }); return; } ok = true; _hsRoomRefresh(R, S, false); }
      if (!ok) return;
      try { closeDialog(); } catch (e) { /* closed */ }
      const name = houseLowName(gardenDecor(pick.d));
      _grmSay(v ? `You boil the ${colour.crop.slice(5).replace(/-/g, ' ')}, dip the ${name}, and hang it to dry. ${colour.dye.name}. It suits it.` : `You wash the ${name} through. Its own colours come back.`, 7000);
      _hsDyeSteam(pot, v ? colour.dye.c : '#dfe8ee');
      if (v && !visit) { const first = _hsGrant('hs-first-dye', { 'mat:timber': 1 }); if (first) setTimeout(() => { if (_hsInside()) _grmSay('Your first dye. The pot’s old paddle is a good length of timber: you keep it.', 6000); }, 7200); }
    };
    el.appendChild(go);
  } });
}
/** Coloured steam off the pot. */
function _hsDyeSteam(pot, col) {
  const s = _hsNative(); if (!s || !pot || !gardenMotionOn()) return;
  const scene = s.context.scene, key = _hsGlowKey(scene), c = parseInt(String(col).replace('#', ''), 16);
  for (let i = 0; i < 9; i++) { const im = scene.add.image(pot.x + (Math.random() - .5) * 26, pot.y - 34, key).setTint(c).setAlpha(.55).setScale(.18 + Math.random() * .12).setDepth(9500); s.root.add(im); scene.tweens.add({ targets: im, x: im.x + (Math.random() - .5) * 30, y: im.y - 40 - Math.random() * 40, alpha: 0, scale: .5, duration: 900 + Math.random() * 600, delay: i * 70, ease: 'Sine.easeOut', onComplete: () => im.destroy() }); }
}

/* ---------- your banner ---------- */
function _hsBannerNow() { const v = _hsView(); return (v && v.bn) || HOUSE_BANNER0; }
/** The banner maker: a grid to paint square by square, the twelve colours, Save. On a visit: their banner, to look at. */
function _hsBannerOpen() {
  if (typeof openDialog !== 'function') return;
  const visit = gpVisiting(), B = HOUSE_BANNER;
  let cells = _hsBannerNow().split(''), ink = 1, down = false;
  openDialog({ title: visit ? 'Their banner' : 'Your banner', width: 520, className: 'hs-banner-dlg gd-popup', body(el) {
    el.appendChild(gpEl('p', 'muted', visit ? 'It flies from a little pole on their roof.' : 'It flies from a little pole on your cottage’s roof, and your friends see it there. Pick a colour, then paint the squares: click, or press and drag.'));
    const grid = gpEl('div', 'hs-ban-grid'); grid.style.setProperty('--cols', B.cols); grid.setAttribute('role', 'grid'); grid.setAttribute('aria-label', 'Your banner');
    const paint = (i, b) => { cells[i] = ink.toString(12); b.style.background = B.colours[ink]; };
    cells.forEach((c, i) => {
      const b = gpEl('button', 'hs-ban-cell'); b.type = 'button'; b.style.background = B.colours[parseInt(c, 12) || 0]; b.setAttribute('aria-label', `Square ${i % B.cols + 1}, row ${Math.floor(i / B.cols) + 1}`); b.disabled = visit;
      b.onpointerdown = (ev) => { ev.preventDefault(); down = true; paint(i, b); };
      b.onpointerenter = (ev) => { if (down && ev.buttons) paint(i, b); };
      b.onclick = (ev) => { if (ev.detail === 0) paint(i, b); };   // (the keyboard: Enter or Space paints the square)
      grid.appendChild(b);
    });
    el.addEventListener('pointerup', () => { down = false; });
    el.appendChild(grid);
    if (visit) return;
    const pal = gpEl('div', 'hs-ban-pal'); pal.setAttribute('role', 'radiogroup'); pal.setAttribute('aria-label', 'Colours');
    B.colours.forEach((c, k) => { const b = gpEl('button', 'hs-ban-ink' + (k === ink ? ' is-on' : '')); b.type = 'button'; b.style.background = c; b.title = B.names[k]; b.setAttribute('aria-label', B.names[k]); b.onclick = () => { ink = k; for (const x of pal.children) x.classList.toggle('is-on', x === b); }; pal.appendChild(b); });
    el.appendChild(pal);
    const row = gpEl('div', 'hs-ban-go');
    const reset = gpEl('button', 'btn btn-ghost btn-sm', 'Start again'); reset.type = 'button'; reset.onclick = () => { cells = HOUSE_BANNER0.split(''); [...grid.children].forEach((b, i) => { b.style.background = B.colours[parseInt(cells[i], 12) || 0]; }); };
    const save = gpEl('button', 'btn btn-primary btn-sm', 'Fly it'); save.type = 'button';
    save.onclick = () => {
      const bn = cells.join(''); const r = houseDo({ o: 'banner', b: bn }, 'Changed your banner');
      if (!r.ok && !/like that already/.test(r.msg)) { gardenToast(r.msg + '.', { icon: 'flag' }); return; }
      try { closeDialog(); } catch (e) { /* closed */ }
      const first = _hsGrant('hs-banner', { 'decor:hf-banner': 1 });
      gardenToast(first ? 'Your banner is flying over the cottage. A framed one for indoors is in your things.' : 'Your banner is flying over the cottage.', { icon: 'flag', kind: 'ok' });
      if (typeof _hsOutsideSoon === 'function') _hsOutsideSoon();
      if (_hsInside()) { _grm.S.dirty = true; _hsRoomRefresh(_grm.R, _grm.S, false); }
    };
    row.appendChild(reset); row.appendChild(save); el.appendChild(row);
  } });
}
/** The plans panel's foot: the cosy stars, and your banner. */
function _hsPlanExtras(el, v, again) {
  if (typeof _hsStarsRow === 'function') _hsStarsRow(el, v);
  const row = gpEl('div', 'hs-ban-row'), sw = gpEl('span', 'hs-ban-mini'); sw.innerHTML = _hsBannerMini(v.bn || HOUSE_BANNER0, 48);
  row.appendChild(sw); row.appendChild(gpEl('span', 'hs-ban-t', gpVisiting() ? 'Their banner, flying over their house.' : 'Your banner flies over the cottage.'));
  if (!gpVisiting()) { const b = gpEl('button', 'btn btn-secondary btn-sm', 'Change it'); b.type = 'button'; b.onclick = () => { try { closeDialog(); } catch (e) { /* closed */ } setTimeout(_hsBannerOpen, 60); }; row.appendChild(b); }
  el.appendChild(row); void again;
}
/** A banner as a little SVG (for panels): w px wide. */
function _hsBannerMini(bn, w) {
  const B = HOUSE_BANNER, cw = w / B.cols, h = cw * B.rows; let s = '';
  for (let r = 0; r < B.rows; r++) for (let c = 0; c < B.cols; c++) s += `<rect x="${(c * cw).toFixed(1)}" y="${(r * cw).toFixed(1)}" width="${(cw + .3).toFixed(1)}" height="${(cw + .3).toFixed(1)}" fill="${B.colours[parseInt(bn[r * B.cols + c], 12) || 0]}"/>`;
  return `<svg viewBox="0 0 ${w} ${h.toFixed(1)}" width="${w}" height="${h.toFixed(0)}" aria-hidden="true">${s}</svg>`;
}
