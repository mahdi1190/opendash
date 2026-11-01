/* ============================================================
   GARDEN DESIGNER, the panel: big plain tools, one way to do each thing, the same by mouse and by finger. Every word in it goes in with textContent. Tools: 94-garden-design-2tools.js.
   ============================================================ */
function _gdzEl(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function _gdzBtn(cls, label, ic, run, o) {
  const b = _gdzEl('button', 'gdz-btn ' + (cls || '')); b.type = 'button';
  if (ic) { const s = document.createElement('span'); s.className = 'gdz-ic'; s.innerHTML = icon(ic); b.appendChild(s); }
  b.appendChild(_gdzEl('span', 'gdz-lab', label));
  if (o && o.pressed != null) b.setAttribute('aria-pressed', o.pressed ? 'true' : 'false');
  if (o && o.disabled) b.disabled = true;
  if (o && o.title) b.title = o.title;
  b.addEventListener('click', (ev) => { ev.stopPropagation(); run(); });
  return b;
}
const _GDZ_TOOLS = Object.freeze([['path', 'Paths', 'footprints'], ['ground', 'Ground', 'sprout'], ['move', 'Move', 'move'], ['make', 'Make', 'hammer'], ['layouts', 'Layouts', 'layers']]);
function _gdzRw(m) { try { return typeof gardenDesignRows === 'function' ? gardenDesignRows(m) : null; } catch (e) { return null; } }
function _gdzSwatch(label, on, open, says, draw, pick) {
  const b = _gdzEl('button', 'gdz-sw' + (on ? ' is-on' : '') + (open ? '' : ' is-shut')); b.type = 'button';
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
  const pic = _gdzEl('span', 'gdz-sw-pic'); draw(pic); b.appendChild(pic);
  b.appendChild(_gdzEl('span', 'gdz-sw-name', label));
  if (!open) b.appendChild(_gdzEl('span', 'gdz-sw-how', says));
  b.addEventListener('click', (ev) => { ev.stopPropagation(); if (open) pick(); else _gdzSay(`${label} is not yours yet. ${says} to have it.`, true); });
  return b;
}
function _gdzPicPath(st) { return (el) => { el.innerHTML = `<svg viewBox="0 0 92 40" aria-hidden="true">${gardenDesignPathMarkup(st, 'M6 30Q28 2 46 20T86 12')}</svg>`; }; }
function _gdzPicGround(st) { return (el) => { const dots = (st.dots || []).map((c, i) => `<circle cx="${14 + i * 18}" cy="${12 + (i % 2) * 14}" r="3" fill="${c}"/>`).join(''); el.innerHTML = `<svg viewBox="0 0 92 40" aria-hidden="true"><rect x="4" y="4" width="84" height="32" rx="15" fill="${st.c}"/>${st.rows ? `<path d="M12 15H80M12 26H80" stroke="${st.rows}" stroke-width="3" stroke-linecap="round"/>` : ''}${dots}</svg>`; }; }
function _gdzRub(label) {
  const T = _gdzT();
  return _gdzBtn('gdz-rub', label, 'x', () => { T.rubbing = !T.rubbing; gardenDesignPanel(); _gdzSay(T.rubbing ? 'Draw over what you want gone.' : 'Back to drawing.'); }, { pressed: T.rubbing });
}
function _gdzPanelPath(box, m, c, rw) {
  const T = _gdzT(), row = _gdzEl('div', 'gdz-row');
  GDZ_PATHS.forEach((st, i) => { const open = gardenDesignOpen(st, c, rw); row.appendChild(_gdzSwatch(st.name, T.pathStyle === i && !T.rubbing, open, st.earn ? st.earn.says : '', _gdzPicPath(st), () => { T.pathStyle = i; T.rubbing = false; gardenDesignPanel(); _gdzSay(`${st.name}: press and draw.`); })); });
  box.append(row, _gdzRub('Rub out a path'));
}
function _gdzPanelGround(box, m, c, rw) {
  const T = _gdzT(), row = _gdzEl('div', 'gdz-row');
  GDZ_GROUND.forEach((st, i) => { const open = gardenDesignOpen(st, c, rw); row.appendChild(_gdzSwatch(st.name, T.groundStyle === i && !T.rubbing, open, st.earn ? st.earn.says : '', _gdzPicGround(st), () => { T.groundStyle = i; T.rubbing = false; gardenDesignPanel(); _gdzSay(st.area ? `${st.name}: paint it on your green, and plants can grow there.` : `${st.name}: paint it on your own land.`); })); });
  box.append(row, _gdzRub('Rub out ground'));
}
function _gdzPanelMove(box) {
  const T = _gdzT(), L = T.lifted;
  if (L) {
    box.appendChild(_gdzEl('p', 'gdz-hold', `You are holding: ${_gdzFootName(L)}`));
    const r = _gdzEl('div', 'gdz-acts');
    r.appendChild(_gdzBtn('', 'Put it down again', 'x', _gdzDropCancel));
    if (L.kind === 'prop' && T.draft.m.some(q => q[0] === L.row.id)) r.appendChild(_gdzBtn('', 'Put it back where it started', 'undo-2', () => gardenDesignPutBack(L.row.id)));
    if (L.kind === 'made') r.appendChild(_gdzBtn('', 'Put it away', 'trash-2', gardenDesignPutAway));
    box.appendChild(r);
    return;
  }
  box.appendChild(_gdzEl('p', 'gdz-note', 'Tap a shop, a bench, a lamp, a decoration or anything you made, then tap where it should go. You can drag it too.'));
  if (!T.draft.m.length) return;
  box.appendChild(_gdzEl('p', 'gdz-sub', 'What you have moved'));
  const list = _gdzEl('div', 'gdz-list');
  for (const [id] of T.draft.m) { const row = gardenDesignRow(id); if (!row) continue; const li = _gdzEl('div', 'gdz-li'); li.appendChild(_gdzEl('span', 'gdz-li-n', row.name)); li.appendChild(_gdzBtn('gdz-small', 'Put it back', 'undo-2', () => gardenDesignPutBack(id))); list.appendChild(li); }
  box.appendChild(list);
}
function _gdzPanelMake(box, m, c, rw) {
  const T = _gdzT(), M = T.make;
  if (T.lifted) { _gdzPanelMove(box); return; }
  box.appendChild(_gdzBtn('gdz-go gdz-place', 'Put it in the garden', 'plus', gardenDesignPlaceNew));
  const kinds = _gdzEl('div', 'gdz-row');
  GDZ_MADE.forEach((d, i) => { const open = gardenDesignOpen(d, c, rw); kinds.appendChild(_gdzSwatch(d.name, M.kind === i, open, d.earn ? d.earn.says : '', (el) => { const pr = GDZ_STRICT.pairs[d.id][0], s = [i, 0, 0, pr[0], pr[1], 0, '']; el.innerHTML = `<svg viewBox="-46 -92 92 96" aria-hidden="true">${gardenDesignMadeArt(s, 0)}</svg>`; }, () => { M.kind = i; M.pat = 0; M.pair = 0; gardenDesignPanel(); })); });
  box.appendChild(kinds);
  const kind = GDZ_MADE[M.kind].id, pairs = GDZ_STRICT.pairs[kind];
  { const w = _gdzEl('div', 'gdz-cols'); w.appendChild(_gdzEl('span', 'gdz-sub', 'Colours'));
    if (!pairs[M.pair]) M.pair = 0;
    pairs.forEach(([a, b], i) => { const ca = GDZ_COLOURS[a], cb = GDZ_COLOURS[b], shut = [ca, cb].find(q => !gardenDesignOpen(q, c, rw)), on = M.pair === i, o = _gdzEl('button', 'gdz-col' + (on ? ' is-on' : '') + (shut ? ' is-shut' : '')); o.type = 'button'; o.title = shut ? `${ca.n} and ${cb.n}: ${shut.earn.says}` : `${ca.n} and ${cb.n}`; o.setAttribute('aria-label', o.title); o.setAttribute('aria-pressed', on ? 'true' : 'false'); o.style.background = `linear-gradient(135deg, ${ca.c} 50%, ${cb.c} 50%)`; o.addEventListener('click', (ev) => { ev.stopPropagation(); if (shut) { _gdzSay(`${o.title} to have these.`, true); return; } M.pair = i; gardenDesignPanel(); }); w.appendChild(o); });
    box.appendChild(w); }
  if (kind === 'sign') {
    const lab = _gdzEl('label', 'gdz-field'); lab.appendChild(_gdzEl('span', 'gdz-sub', `Your words (friends can read them when they visit, at most ${GDZ_STRICT.signText} letters)`));
    const inp = _gdzEl('input', 'gdz-input'); inp.type = 'text'; inp.maxLength = GDZ_STRICT.signText; inp.value = M.text; inp.autocomplete = 'off'; inp.addEventListener('input', () => { M.text = inp.value; }); lab.appendChild(inp); box.appendChild(lab);
  } else {
    const list = kind === 'flag' ? GDZ_FLAGS : GDZ_POSES, row = _gdzEl('div', 'gdz-row');
    list.forEach((p, i) => { const open = gardenDesignOpen(p, c, rw); row.appendChild(_gdzSwatch(p.name, M.pat === i, open, p.earn ? p.earn.says : '', (el) => { { const pr = GDZ_STRICT.pairs[GDZ_MADE[M.kind].id], q = pr[M.pair] || pr[0]; el.innerHTML = `<svg viewBox="-46 -92 92 96" aria-hidden="true">${gardenDesignMadeArt([M.kind, 0, 0, q[0], q[1], i, ''], 0)}</svg>`; } }, () => { M.pat = i; gardenDesignPanel(); })); });
    box.appendChild(row);
  }
}
function _gdzPanelLayouts(box) {
  const T = _gdzT(), list = _gdzEl('div', 'gdz-list');
  box.appendChild(_gdzEl('p', 'gdz-note', 'A layout keeps your paths, your ground, where things stand and what you made. Plants and decorations stay as they are.'));
  for (const [id, L] of Object.entries(T.lay.lay)) {
    const li = _gdzEl('div', 'gdz-li' + (id === T.lay.cur ? ' is-on' : '')); li.appendChild(_gdzEl('span', 'gdz-li-n', L.n));
    if (id === T.lay.cur) li.appendChild(_gdzEl('span', 'gdz-sub', 'Showing now'));
    else { li.appendChild(_gdzBtn('gdz-small', 'Use this', 'check', () => gardenDesignLayoutUse(id))); li.appendChild(_gdzBtn('gdz-small', 'Remove', 'trash-2', () => gardenDesignLayoutRemove(id))); }
    list.appendChild(li);
  }
  box.appendChild(list);
  const n = Object.keys(T.lay.lay).length;
  if (n < GDZ_LIMITS.layouts) {
    const row = _gdzEl('div', 'gdz-acts'), inp = _gdzEl('input', 'gdz-input'); inp.type = 'text'; inp.maxLength = GDZ_LIMITS.text; inp.placeholder = 'A name, like Summer'; inp.setAttribute('aria-label', 'Name for a new layout');
    row.append(inp, _gdzBtn('', 'Save as a new layout', 'plus', () => gardenDesignLayoutNew(inp.value))); box.appendChild(row);
  }
}
/** Does it fit? The one line that says so, and what is left out. */
function _gdzFitLine() {
  const T = _gdzT(), w = gardenDesignWire(T.draft).dropped, a = w.paths.length, b = w.cells;
  return !a && !b ? '' : `Too big to send whole: friends would not see ${[a ? `${a} of your paths (dashed red)` : '', b ? `${b} squares of ground` : ''].filter(Boolean).join(' or ')}. Rub some out, or keep it this way.`;
}
function gardenDesignPanel() {
  const T = _gdzT(), box = _gdp.root && _gdp.root.querySelector('.gd-stagebox'); if (!box || !T.on) return;
  const m = gardenModel(), c = gardenDesignCtx(m), rw = _gdzRw(m);
  let el = box.querySelector(':scope > .gdz');
  const scroll = el && el.querySelector('.gdz-opts') ? el.querySelector('.gdz-opts').scrollTop : 0;
  if (el) el.remove();
  el = _gdzEl('div', 'gdz'); el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'Garden designer');
  for (const t of ['keydown', 'keyup']) el.addEventListener(t, (ev) => ev.stopPropagation());
  const top = _gdzEl('div', 'gdz-top');
  top.appendChild(_gdzEl('h2', 'gdz-title', 'Garden designer'));
  top.appendChild(_gdzBtn('', 'Undo', 'undo-2', gardenDesignUndo, { disabled: !T.hist.length }));
  top.appendChild(_gdzBtn('', 'Cancel', 'x', gardenDesignCancel));
  top.appendChild(_gdzBtn('gdz-go', 'Keep my changes', 'check', gardenDesignKeep));
  el.appendChild(top);
  const say = _gdzEl('p', 'gdz-say' + (T.bad ? ' is-bad' : ''), T.say); say.setAttribute('role', 'status'); el.appendChild(say);
  const fit = _gdzFitLine(); if (fit) el.appendChild(_gdzEl('p', 'gdz-fit', fit));
  const pad = _gdzEl('div', 'gdz-pad'); pad.setAttribute('role', 'group'); pad.setAttribute('aria-label', 'Look around');
  for (const [cls, ic, label, run] of [['up', 'chevron-up', 'Look north', () => gardenDesignPan(0, -1)], ['left', 'chevron-left', 'Look west', () => gardenDesignPan(-1, 0)], ['right', 'chevron-right', 'Look east', () => gardenDesignPan(1, 0)], ['down', 'chevron-down', 'Look south', () => gardenDesignPan(0, 1)], ['in', 'plus', 'Closer', () => gardenDesignZoom(-1)], ['out', 'minus', 'Further away', () => gardenDesignZoom(1)]]) {
    const b = _gdzEl('button', 'gdz-pb gdz-pb-' + cls); b.type = 'button'; b.innerHTML = icon(ic); b.setAttribute('aria-label', label); b.title = label; b.addEventListener('click', (ev) => { ev.stopPropagation(); run(); }); pad.appendChild(b);
  }
  el.appendChild(pad);
  const bottom = _gdzEl('div', 'gdz-bottom');
  const opts = _gdzEl('div', 'gdz-opts');
  ({ path: _gdzPanelPath, ground: _gdzPanelGround, move: _gdzPanelMove, make: _gdzPanelMake, layouts: _gdzPanelLayouts }[T.tool] || _gdzPanelPath)(opts, m, c, rw);
  bottom.appendChild(opts);
  const tools = _gdzEl('div', 'gdz-tools');
  for (const [k, label, ic] of _GDZ_TOOLS) tools.appendChild(_gdzBtn('gdz-tool', label, ic, () => { if (T.lifted && !T.lifted.fresh) _gdzDropCancel(); T.tool = k; T.rubbing = false; gardenDesignPanel(); _gdzSay({ path: 'Press on a path, a plaza or a door, and draw to another one.', ground: 'Paint a whole soft patch on your own land. Each land has its own colours.', move: 'Tap what you want to move.', make: 'Make something, then put it in the garden.', layouts: 'Keep a few designs and swap between them.' }[k]); }, { pressed: T.tool === k }));
  bottom.appendChild(tools);
  el.appendChild(bottom);
  box.appendChild(el);
  opts.scrollTop = scroll;
}
