/* ============================================================
   THE VALE'S STORY, the Chronicle (npcs-PLAN 1.7 and 3.12; the folk3 plan, step 10; the pieces are data: VALE_HISTORY in
   94-garden-folk3-3story.js). A ribbon of its own in the Field Journal: six eras, each a strip of framed pieces. A filled piece is a small
   painted vignette and one line; an empty one a pale outline and one clue ("The standing stones, as the light goes."). Pieces fill from
   what you do: a story beat heard, a moment seen, something found, a letter, being at a KIND of place at the right hour (the standing
   stones at dusk, the falls in the morning, any of them, on any layout), a festival, a race won, cards on a Wednesday.
   - Each piece is 1 XP (inside the day's cap); a whole era gives something for your garden (the two-waters stone, a millstone seat), once.
   - It is yours alone (bible tone rule 6): never in the snapshot, nothing of it is sent. What an era gives is a decoration, and friends see
     that once you put it out. Saved in garden.wd entry by entry (ch.<piece> = the day), so your own computers add up.
     gardenChronicleTab(left, right, m)   the Journal's page (hook J1)
     gardenChronicleFacts()               { vhist: pieces filled } for the ribbons
     gardenChronicleDev(fill)             console only: what is filled; fill: 'all' fills every piece (a sandbox only)
   ============================================================ */
const _vch = { era: 'i', t: 0, stillT: 0 };
function _vchFilled(id) { try { return !!_wdG()['ch.' + id]; } catch (e) { return false; } }
function _vchFacts(m) {
  const W = _wdG(), F = {};
  F.zones = ((m && m.areas) || []).filter(a => /^zn-/.test(a)).length;
  F.mill = (() => { try { return typeof _wkMill === 'function' && _wkMill(m) ? 1 : 0; } catch (e) { return 0; } })();
  F.race = Number(W['vr.race']) || 0;
  F.cards = Number(W.vyc) || 0; F.market = Number(W.vym) || 0;
  F.fest = Object.keys(W).filter(k => /^vf\./.test(k)).length;
  F.trees = ((m && m.plants) || []).filter(p => p && p.def && p.def.cat === 'tree').length;
  return F;
}
/** Has this piece been earned? (by its own rule; places are checked where you stand, at the hour they ask for) */
function _vchEarned(r, m, F, near) {
  const b = r.by, W = _wdG();
  if (b.beat) return typeof wdTaleSeen === 'function' && !!wdTaleSeen(b.beat);
  if (b.scene) return b.scene === '*' ? Object.keys(W).some(k => /^vx\./.test(k) && k !== 'vxh') : !!W['vx.' + b.scene];
  if (b.find) return !!W['ff.' + b.find];
  if (b.letter) return !!W['l.' + b.letter];
  if (b.fact) return (F[b.fact] || 0) >= (b.of || 1);
  if (b.place) { if (b.place.tod && !b.place.tod.includes(m.tod)) return false; return near.some(t => b.place.kinds.includes(t.kind) && Math.hypot(t.x - _gw.px, (t.y - _gw.py) * 1.2) <= (b.place.r || 5)); }
  return false;
}
function _vchCheck(m) {
  if (!m || m.visit || typeof _gw === 'undefined' || !_gw.on) return;
  const W = _wdG(), F = _vchFacts(m), got = [];
  let near = null;
  for (const r of VALE_HISTORY) {
    if (W['ch.' + r.id]) continue;
    if (r.by.place && !near) { try { near = gardenAffordThings().filter(t => Math.abs(t.x - _gw.px) < 9 && Math.abs(t.y - _gw.py) < 9); } catch (e) { near = []; } }
    if (!_vchEarned(r, m, F, near || [])) continue;
    W['ch.' + r.id] = m.today; got.push(r);
    try { if (typeof _grGive === 'function') _grGive('ch.' + r.id, { x: 1 }); } catch (e) { /* the day's XP is full */ }
  }
  if (!got.length) return;
  _wdSave();
  const r = got[0], era = VALE_ERAS.find(e => e.id === r.era);
  try { wdAmbient(`In the vale’s story (${era ? era.name : ''}): ${r.line}`, 9000, 'story'); } catch (e) { /* quiet */ }
  // a whole era: its thing for your garden, once
  for (const e of VALE_ERAS) {
    if (!e.reward || W['che.' + e.id]) continue;
    if (!VALE_HISTORY.filter(p => p.era === e.id).every(p => W['ch.' + p.id])) continue;
    W['che.' + e.id] = m.today; _wdSave();
    let ok = false; try { ok = typeof gpGrant === 'function' && gpGrant('ch-' + e.id, { ['decor:' + e.reward]: 1 }); } catch (x) { ok = false; }
    if (ok) { const def = typeof gardenDecor === 'function' ? gardenDecor(e.reward) : null; setTimeout(() => { try { gardenToast(`${e.name}: the whole of it. ${def ? def.name : 'Something'} for your garden, in your bag.`, { icon: 'gift' }); } catch (x) { /* fine */ } }, 2600); }
  }
}
function gardenChronicleFacts() { try { const W = _wdG(); return { vhist: VALE_HISTORY.filter(r => W['ch.' + r.id]).length }; } catch (e) { return { vhist: 0 }; } }
/* ---------- the vignettes: small paintings on a paper frame, composed from a few shapes (a figure from the cast's own drawing) ---------- */
function _vchSky(tod) { return tod === 'night' ? ['#2e3a5a', '#4a5a7a'] : tod === 'dusk' ? ['#e8a878', '#f4d2a0'] : tod === 'dawn' ? ['#f2c8a8', '#f8e8d0'] : ['#a8c8e0', '#e4eef0']; }
function _vchFrame(inner, sky, ground) {
  const [s0, s1] = _vchSky(sky);
  return `<svg viewBox="0 0 96 72" width="96" height="72" aria-hidden="true"><defs><linearGradient id="vchs${sky}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s0}"/><stop offset="1" stop-color="${s1}"/></linearGradient></defs>`
    + `<rect x="2" y="2" width="92" height="68" rx="3" fill="url(#vchs${sky})"/><path d="M2 ${ground || 50}Q30 ${(ground || 50) - 4} 60 ${(ground || 50) - 1}T94 ${(ground || 50) - 2}V70H2z" fill="#8aa860"/><path d="M2 ${(ground || 50) + 6}Q40 ${(ground || 50) + 2} 94 ${(ground || 50) + 7}V70H2z" fill="#6e8a4a" opacity=".6"/>`
    + inner + `<rect x="2" y="2" width="92" height="68" rx="3" fill="none" stroke="#7a5a38" stroke-width="2.4"/><rect x="4.6" y="4.6" width="86.8" height="62.8" rx="2" fill="none" stroke="#e8d8b0" stroke-width=".8" opacity=".7"/></svg>`;
}
function _vchFig(cast, x, y, s) { let fig = ''; try { fig = typeof gardenCastSvg === 'function' ? gardenCastSvg(cast) : ''; } catch (e) { fig = ''; } return fig ? `<g transform="translate(${x} ${y}) scale(${s || 0.5})">${fig}</g>` : ''; }
const VCH_ART = Object.freeze({
  stones: () => _vchFrame('<g fill="#8a8478"><path d="M22 50V30l5-4 4 4v20z"/><path d="M38 52V24l6-5 5 5v28z"/><path d="M56 50V32l4-3 5 3v18z"/><path d="M71 51V36l4-3 3 3v15z"/></g><g fill="#a8a294" opacity=".8"><path d="M23 49V31l4-3v21z"/><path d="M39 51V25l5-4v30z"/></g><circle cx="78" cy="16" r="6" fill="#f8e8c0" opacity=".85"/>', 'dusk'),
  falls: () => _vchFrame('<path d="M30 8h36v42H30z" fill="#7a7468"/><path d="M40 8h16l2 44H38z" fill="#d8ecf4"/><path d="M44 10v40M50 10v40" stroke="#ffffff" stroke-width="1.4" opacity=".7"/><ellipse cx="48" cy="52" rx="20" ry="5" fill="#c8e0ea"/>', 'dawn'),
  mere: () => _vchFrame('<ellipse cx="48" cy="52" rx="44" ry="10" fill="#3a5a7a"/><path d="M10 52h76" stroke="#f8e8c0" stroke-width="1" opacity=".5"/><path d="M18 30q14 8 30 22M78 30q-14 8 -30 22" stroke="#bcd8f0" stroke-width="2" fill="none" opacity=".75"/><circle cx="74" cy="14" r="5" fill="#f4ecd0"/>', 'night', 46),
  chapel: () => _vchFrame('<path d="M34 50V30l14-10 14 10v20z" fill="#b8ae98"/><path d="M34 30l14-10 14 10z" fill="#7a6a58"/><path d="M45 50v-9a3 3 0 0 1 6 0v9z" fill="#4a3a2a"/><path d="M48 20v-7M45 15h6" stroke="#6a5a48" stroke-width="1.6"/>', 'dawn'),
  maze: () => _vchFrame('<g fill="none" stroke="#4f7a35" stroke-width="4"><ellipse cx="48" cy="48" rx="34" ry="12"/><ellipse cx="48" cy="48" rx="22" ry="7.6"/><ellipse cx="48" cy="48" rx="10" ry="3.6"/></g><path d="M48 36v6" stroke="#8aa860" stroke-width="5"/>', 'day', 40),
  tree: () => _vchFrame('<rect x="45" y="30" width="6" height="22" fill="#6a4a32"/><circle cx="48" cy="26" r="16" fill="#5e8a44"/><circle cx="42" cy="22" r="9" fill="#7aa858"/><path d="M20 52v-6l3-3 3 3v6zM72 52v-5l2-2 2 2v5z" fill="#6a8a4a"/>', 'day'),
  mill: () => _vchFrame('<path d="M40 50V24h30v26z" fill="#a8503a"/><path d="M38 24l17-10 17 10z" fill="#4a5056"/><circle cx="32" cy="40" r="11" fill="none" stroke="#6a4a2e" stroke-width="2.4"/><path d="M32 29v22M21 40h22M24 32l16 16M40 32L24 48" stroke="#6a4a2e" stroke-width="1.4"/><path d="M2 54q20-4 40 0" stroke="#7ab0d0" stroke-width="5" fill="none"/>', 'day'),
  light: () => _vchFrame('<path d="M42 52l3-36h8l3 36z" fill="#f4f0e6"/><path d="M43 40h12M44 28h10" stroke="#c8442e" stroke-width="4"/><path d="M44 16h10v-5H44z" fill="#4a5056"/><circle cx="49" cy="13" r="3" fill="#ffe08a"/><path d="M54 13L94 4M54 13l40 16" stroke="#ffe08a" stroke-width="3" opacity=".35"/>', 'night'),
  market: () => _vchFrame('<path d="M14 50V34h30v16zM52 50V34h30v16z" fill="#8a6a46"/><path d="M10 34l4-10h30l4 10zM48 34l4-10h30l4 10z" fill="#e8b830"/><path d="M14 24h4l-2 10zM24 24h4l-2 10zM34 24h4l-2 10zM52 24h4l-2 10zM62 24h4l-2 10zM72 24h4l-2 10z" fill="#fbf3dc"/><circle cx="22" cy="31" r="2.4" fill="#e8a028"/><circle cx="29" cy="31" r="2.4" fill="#e8a028"/>', 'day'),
  fair: () => _vchFrame('<path d="M8 22q20 10 40 0t40 0" stroke="#5a4630" stroke-width="1" fill="none"/><g><path d="M14 25l3 7 3-6z" fill="#d8352a"/><path d="M26 28l3 7 3-6z" fill="#f2c43a"/><path d="M40 28l3 7 3-6z" fill="#3a6a4a"/><path d="M56 27l3 7 3-6z" fill="#d8352a"/><path d="M70 25l3 7 3-6z" fill="#fbf5ec"/></g><path d="M42 52l4-12h6l4 12z" fill="#3e4246"/><path d="M44 40q5-10 4-16q6 8 4 16z" fill="#f08a2a"/>', 'dusk'),
  angler: () => _vchFrame('<path d="M2 52h50v4H2z" fill="#8a6a46"/><path d="M52 50h42v20H52z" fill="#4a7aa0"/>' + _vchFig('angler', 34, 52, 0.42), 'dusk'),
  thistle: () => _vchFrame('<path d="M10 50q20-14 40-2" stroke="#6a3a44" stroke-width="3" fill="none"/><path d="M60 50q10-16 30-6" stroke="#6a3a44" stroke-width="3" fill="none"/>' + _vchFig('thistle', 48, 54, 0.48), 'dusk'),
  pip: () => _vchFrame('<circle cx="70" cy="34" r="13" fill="none" stroke="#6a4a2e" stroke-width="2.4"/><path d="M70 21v26M57 34h26" stroke="#6a4a2e" stroke-width="1.4"/><path d="M66 22l4-4 4 4" fill="#a8c8e0"/>' + _vchFig('pip', 36, 56, 0.44), 'day'),
  tam: () => _vchFrame('<rect x="58" y="36" width="20" height="14" rx="1" fill="#6a4a32"/><path d="M60 40h16M60 44h16" stroke="#e8d8b0" stroke-width=".8"/>' + _vchFig('tam', 38, 56, 0.5), 'day'),
  bramble: () => _vchFrame('<path d="M60 52V30h26v22z" fill="#a8503a"/><circle cx="56" cy="44" r="9" fill="none" stroke="#6a4a2e" stroke-width="2"/>' + _vchFig('bramble', 30, 56, 0.42), 'day'),
  wick: () => _vchFrame('<path d="M2 50L40 20l24 18 30-14v46H2z" fill="#8a929a"/><ellipse cx="60" cy="40" rx="8" ry="2.4" fill="#a8c8e0"/>' + _vchFig('wick', 34, 46, 0.42), 'night'),
  letter: () => _vchFrame('<path d="M24 22h48v32H24z" fill="#f8f2e4"/><path d="M24 22l24 18 24-18" stroke="#8a6a44" stroke-width="1.2" fill="none"/><path d="M30 46h20M30 50h14" stroke="#8a6a44" stroke-width=".8" opacity=".6"/><rect x="60" y="25" width="8" height="9" fill="#c8442e"/>', 'day', 64),
  tin: () => _vchFrame('<rect x="32" y="30" width="32" height="20" rx="2" fill="#7a8a92"/><rect x="32" y="28" width="32" height="5" rx="1.6" fill="#9aa8b0"/><rect x="38" y="36" width="20" height="9" fill="#e8dcb8"/><path d="M41 40h14" stroke="#6a5a48" stroke-width=".8"/>', 'day'),
  glasses: () => _vchFrame('<path d="M20 50q28-10 56 0" stroke="#8a8478" stroke-width="6" fill="none"/><g fill="none" stroke="#5a4a38" stroke-width="2"><circle cx="40" cy="38" r="7"/><circle cx="58" cy="38" r="7"/><path d="M47 38h4M33 36l-8-3M65 36l9-4"/></g><path d="M68 32l6-2" stroke="#9aa4aa" stroke-width="1.4"/>', 'dusk'),
  gate: () => _vchFrame('<path d="M26 52V22M70 52V22" stroke="#6a4a2e" stroke-width="4"/><path d="M30 26h18v24H30zM50 26h16v24H50z" fill="none" stroke="#8a6a46" stroke-width="2"/><path d="M50 26l14 24" stroke="#8a6a46" stroke-width="1.4"/><path d="M48 52l14-6" stroke="#c8a050" stroke-width="2"/>', 'day'),
  wheel: () => _vchFrame('<circle cx="48" cy="34" r="18" fill="none" stroke="#6a4a2e" stroke-width="3"/><path d="M48 16v36M30 34h36M35 21l26 26M61 21L35 47" stroke="#6a4a2e" stroke-width="1.8"/><path d="M8 54q40-8 80 0" stroke="#7ab0d0" stroke-width="5" fill="none"/><path d="M66 20q8-4 14 2" stroke="#ffffff" stroke-width="1.4" fill="none" opacity=".7"/>', 'day'),
  race: () => _vchFrame('<path d="M70 52V18" stroke="#6a4a2e" stroke-width="2"/><path d="M70 18h16v10H70z" fill="#c8402a"/><path d="M8 50q30-6 60-2" stroke="#d8c8a0" stroke-width="6" fill="none"/>' + _vchFig('pip', 40, 54, 0.4), 'day'),
  cards: () => _vchFrame('<path d="M30 46h36l-4 6H34z" fill="#3a6a4a"/><path d="M34 52v-6M62 52v-6" stroke="#6a4a2e" stroke-width="2"/><g transform="translate(40 40)"><path d="M-4-6h8v10h-8z" fill="#f8f2e4" transform="rotate(-14)"/><path d="M2-6h8v10H2z" fill="#f8f2e4" transform="rotate(10)"/></g><circle cx="64" cy="40" r="3" fill="#ffe08a"/><path d="M64 14v22" stroke="#4a4e52" stroke-width="1.4"/>', 'night'),
  moment: () => _vchFrame('<rect x="2" y="2" width="92" height="9" fill="#1a1612" opacity=".8"/><rect x="2" y="61" width="92" height="9" fill="#1a1612" opacity=".8"/><circle cx="48" cy="36" r="10" fill="#f8e8c0" opacity=".8"/>', 'dusk'),
});
function _vchArt(r, filled) {
  const f = VCH_ART[r.art] || VCH_ART.moment; let svg = '';
  try { svg = f(); } catch (e) { svg = VCH_ART.moment(); }
  return filled ? svg : svg.replace('<svg ', '<svg class="vch-sil" ');
}
/* ---------- the page ---------- */
function gardenChronicleTab(left, right, m) {
  const W = _wdG(), deep = typeof _wtDeep === 'function' ? _wtDeep() : true;
  const h = left.appendChild(_gdpEl('div', 'gj-ptitle')); h.innerHTML = '<h3>The vale’s story</h3><i class="gj-hand">from the two waters to now</i>';
  const strip = left.appendChild(_gdpEl('nav', 'vch-eras')); strip.setAttribute('aria-label', 'The six eras');
  for (const e of VALE_ERAS) {
    const all = VALE_HISTORY.filter(r => r.era === e.id), any = all.some(r => W['ch.' + r.id]), whole = all.every(r => W['ch.' + r.id]);
    const b = strip.appendChild(_gdpEl('button', 'vch-era' + (_vch.era === e.id ? ' is-on' : '') + (any ? ' is-begun' : '') + (whole ? ' is-whole' : ''))); b.type = 'button';
    b.innerHTML = `<b>${esc(e.n)}</b><small>${esc(any ? e.name : '· · ·')}</small>`; b.setAttribute('aria-pressed', String(_vch.era === e.id));
    b.onclick = () => { _vch.era = e.id; if (typeof _gjRepaint === 'function') _gjRepaint(); };
  }
  const era = VALE_ERAS.find(e => e.id === _vch.era) || VALE_ERAS[0], pieces = VALE_HISTORY.filter(r => r.era === era.id);
  const grid = left.appendChild(_gdpEl('div', 'vch-grid'));
  for (const r of pieces) {
    const filled = !!W['ch.' + r.id], c = grid.appendChild(_gdpEl('div', 'vch-piece' + (filled ? ' is-filled' : '')));
    c.innerHTML = `<span class="vch-art">${_vchArt(r, filled)}</span>`;
    c.appendChild(_gdpEl(filled ? 'p' : 'small', filled ? 'vch-line gj-hand' : 'vch-clue', filled ? (!deep && r.soft ? r.soft : r.line) : '“' + r.clue + '”'));
  }
  // the right page: the era in a line, what it holds, what filling it brings
  const any = pieces.some(r => W['ch.' + r.id]), whole = pieces.every(r => W['ch.' + r.id]);
  const head = right.appendChild(_gdpEl('div', 'gj-etitle')); head.innerHTML = `<h3>${esc(era.n)}. ${esc(any ? era.name : 'Not yet known')}</h3><small>${esc(any ? era.line : 'Something happened here, long ago. Nobody has told you yet.')}</small>`;
  // the era's picture, large: the latest piece you found in it (an empty frame until you have one)
  const latest = pieces.filter(r => W['ch.' + r.id]).sort((a, b) => String(W['ch.' + b.id]).localeCompare(String(W['ch.' + a.id])))[0];
  const big = right.appendChild(_gdpEl('div', 'vch-big' + (latest ? '' : ' is-empty'))); big.innerHTML = latest ? _vchArt(latest, true) : _vchArt(pieces[0] || VALE_HISTORY[0], false);
  if (latest) big.appendChild(_gdpEl('p', 'vch-line gj-hand', !deep && latest.soft ? latest.soft : latest.line));
  const note = right.appendChild(_gdpEl('div', 'vch-note wd-box'));
  if (era.reward) { const def = typeof gardenDecor === 'function' ? gardenDecor(era.reward) : null; note.appendChild(_gdpEl('p', 'gj-hand', whole ? `You have the whole of it. ${def ? def.name : 'A keepsake'} is yours, for the garden.` : `When this part of the story is whole, there is something for your garden: ${def ? def.name.toLowerCase() : 'a keepsake'}.`)); }
  note.appendChild(_gdpEl('p', 'muted', 'Pieces come from what you do: listening to people, finding things, being in the right place at the right hour, and what you get up to yourself.'));
  if (era.id === 'iv') note.appendChild(_gdpEl('p', 'muted', 'The heavier parts of the story stay on their own pages, under Letters.'));
  const sum = right.appendChild(_gdpEl('div', 'vch-whole'));
  for (const e of VALE_ERAS) { const all = VALE_HISTORY.filter(r => r.era === e.id), n = all.filter(r => W['ch.' + r.id]).length; const dot = sum.appendChild(_gdpEl('span', 'vch-dot' + (n === all.length ? ' is-whole' : n ? ' is-begun' : ''))); dot.title = e.n + (n ? '. ' + e.name : ''); }
}
/** Console only (a sandbox's made-up save): what is filled; 'all' fills every piece, as an advanced save would have. */
function gardenChronicleDev(fill) {
  const W = _wdG(), m = gardenHere();
  if (fill === 'all' || Array.isArray(fill)) { for (const r of VALE_HISTORY) if (fill === 'all' || fill.includes(r.id)) W['ch.' + r.id] = W['ch.' + r.id] || m.today; _wdSave(); }
  return JSON.stringify({ filled: VALE_HISTORY.filter(r => W['ch.' + r.id]).map(r => r.id) });
}
wdMod({
  id: 'vale-chronicle', pref: 'folk',
  begin() { _vch.t = 0; },
  tick(m) {
    if (m.visit || performance.now() - _vch.t < 2400) return; _vch.t = performance.now();
    if (typeof wdWalkingLately === 'function' && wdWalkingLately() && performance.now() - _vch.stillT < 12000) return;   // (looked at while you stand, or now and then while you walk)
    _vch.stillT = performance.now();
    try { _vchCheck(m); } catch (e) { console.error('[chronicle]', e); }
  },
  end() { },
});
