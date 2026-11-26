/* ============================================================
   BOTTLES THAT WASH UP (FUN-ROADMAP phase 2, theme A; it grows the bottle post, 94-garden-zz-5gnome.js). The bottle post gains a beach:
   write a note of up to three lines from the book (never free text), tuck in a shell, sea glass or a pebble from your pockets if you
   like, and throw it into the sea (from the water's edge your figure throws it; from the menu it simply goes). The sea takes it to the
   friend you choose, or one it chooses, and the next day it lies on their strand (a garden with no strand: their lake, three days on,
   as before). Villagers send the odd one too, on a calm day, each with a tiny story. Every bottle you get goes on the bottle shelf in
   the Field Journal (Keepsakes); the first one also brings a bottle rack to stand in your garden.
   The wire: the bottle post's own row (tg.bt, the first line, so a friend on an older app still finds it in their lake) and the whole
   note in the strand's snapshot (ti.b [pair mark, day, line, line, line, tucked find], 99 for none). Lines: the bottle post's book
   (0 to 39) and the shore's (40 on). Both books are append only: the number is what is sent.
   Saved: g.wd['tdbt.<friend>.<day>'] = [l1, l2, l3, tuck] what you sent; g.wd['tdbs.<key>'] = {d, f, l, t, v, s} the bottle shelf;
   g.led['tdbr.<friend>.<day>'] a tucked find received; g.led['tdbv.<w>'] a villager's bottle opened.
   ============================================================ */
const GT_NOTE_MORE = Object.freeze([   // index 40 on. Append only.
  'The tide was out this morning.', 'I found a blue bit of sea glass today!', 'Built a sandcastle. The sea took it. Worth it.', 'A crab beat me in a race.',
  'Wish you were on the beach with me.', 'Come and look in my rock pools.', 'It rained on me, and the fish liked it.', 'My garden says hello to your garden.',
  'Thank you for visiting.', 'This is from the far end of the beach.', 'Found this and thought of you.', 'Skimmed seven skips today. Beat that.',
  'The moon was huge last night.', 'The kettle is always on.', 'Look after yourself.', 'See you soon.',
]);
const GT_BOTTLE = Object.freeze({ lines: 3, none: 99, villagerEvery: 5, rack: 'bottle-rack' });
const GT_BOTTLE_TALES = Object.freeze([
  Object.freeze({ id: 'pip-raft', v: 'pip', t: ['Pip: “I made a raft out of four sticks and a leaf and sailed it to the sea. It sank at once. I swam the rest of the way, which was the plan all along.”'] }),
  Object.freeze({ id: 'pip-fish', v: 'pip', t: ['Pip: “There is a fish out past the rocks that is bigger than me. I have named him Gerald. Do not tell Gerald.”'] }),
  Object.freeze({ id: 'quince-bees', v: 'quince', t: ['Quince: “The bees went to the sea today. They did not like it. They came back and made the saltiest honey anyone has ever tasted. I am keeping it for best.”'] }),
  Object.freeze({ id: 'quince-hat', v: 'quince', t: ['Quince: “If you find a straw hat floating about, it is mine, and it is having a much more interesting day than I am.”'] }),
  Object.freeze({ id: 'bramble-map', v: 'bramble', t: ['Bramble: “I have drawn the coast forty times and it is different every time. I have decided the coast is the one who is wrong.”'] }),
  Object.freeze({ id: 'bramble-gull', v: 'bramble', t: ['Bramble: “A gull took my pencil. I drew the gull with a different pencil. It came out looking smug. Accurate.”'] }),
  Object.freeze({ id: 'tam-sea', v: 'tam', t: ['Tam: “I dug a tunnel to see if it came out under the sea. It came out under my own kitchen. I have learned something about tunnels.”'] }),
  Object.freeze({ id: 'tam-sand', v: 'tam', t: ['Tam: “Sand is very hard to dig in. It keeps falling back in. I respect it.”'] }),
  Object.freeze({ id: 'thistle-soup', v: 'thistle', t: ['Mother Thistle: “Seaweed soup. I am told it is good for you. I am told a lot of things. Come round and I will tell you some of them.”'] }),
  Object.freeze({ id: 'thistle-stars', v: 'thistle', t: ['Mother Thistle: “The stars in the rock pools at night are only the sky, sitting in the water. I knew that. I like to look anyway.”'] }),
  Object.freeze({ id: 'wick-waves', v: 'wick', t: ['Wick: “I counted the waves tonight. There were exactly as many as last night. I find that very reassuring.”'] }),
  Object.freeze({ id: 'wick-moon', v: 'wick', t: ['Wick: “The moon pulls the sea about. I asked it to stop. It did not. We have an understanding.”'] }),
]);
const _gtb = { spots: null, spotsKey: '', img: null, sent: null };
function _gtbLine(i) { i = Number(i); if (!Number.isInteger(i) || i < 0 || i >= GT_BOTTLE.none) return ''; if (i >= 40) return GT_NOTE_MORE[i - 40] || ''; return (typeof GTG_BOTTLE_LINES !== 'undefined' && GTG_BOTTLE_LINES[i]) || ''; }
function _gtbBook() { const out = []; const old = typeof GTG_BOTTLE_LINES !== 'undefined' ? GTG_BOTTLE_LINES : []; old.forEach((t, i) => out.push({ i, t })); GT_NOTE_MORE.forEach((t, k) => out.push({ i: 40 + k, t })); return out; }
/** The finds you could tuck in a bottle: shells, sea glass and stones (never the storm's set). */
function _gtbTuckable() {
  const out = []; let items = {}; try { items = gardenWallet().items || {}; } catch (e) { return out; }
  for (const [k, n] of Object.entries(items)) { if (!k.startsWith('sh:') || !(n > 0)) continue; const d = gardenTideFindDef(k); if (d && !d.storm && ['shell', 'glass', 'stone'].includes(d.what)) out.push({ d, n }); }
  return out.sort((a, b) => GARDEN_SHORE_FINDS.indexOf(a.d) - GARDEN_SHORE_FINDS.indexOf(b.d));
}
function _gtbFindIndex(id) { const i = GARDEN_SHORE_FINDS.findIndex(f => f.id === id); return i >= 0 && i < GT_BOTTLE.none ? i : GT_BOTTLE.none; }

/* ---------- where bottles come to rest: on the strand's low band, near where you arrive ---------- */
/** Three spots on open sand, low on the shore (under the water at high tide: the bottle bobs there), nearest the arrival point. */
function gardenTideBottleSpots() {
  const F = typeof GardenTide !== 'undefined' ? GardenTide.field() : null; if (!F || !F.band.length) return null;
  const key = F.rev + '|' + F.band.length; if (_gtb.spotsKey === key) return _gtb.spots;
  const W = GARDEN_WORLD, D = gardenIslandData(), st = (D.anchors && D.anchors.start) || { x: W.cols / 2, y: W.rows / 2 }, cand = [];
  for (let k = 0; k < F.band.length; k += 3) {
    const at = F.band[k], tx = at % F.FW, ty = (at - tx) / F.FW, x = (tx + .5) * F.P / W.cellW, y = ((ty + .5) * F.P - W.sky) / W.cellH, h = gardenTideH(x, y);
    if (!(h > 8 && h < 26) || F.K[at] !== 1) continue;
    const c = gardenIslandBaseCell(x, y); if (!c || c.regionZone) continue;   // (on the home strand, which is always open)
    cand.push({ x, y, d: Math.hypot(x - st.x, (y - st.y) * 1.3) });
  }
  cand.sort((a, b) => a.d - b.d);
  const out = [];
  for (const c of cand) { if (out.length >= 3) break; if (out.some(q => Math.hypot(q[0] - c.x, q[1] - c.y) < 3.5) || !gardenTideOpenSand(c.x, c.y)) continue; out.push([Math.round(c.x * 10) / 10, Math.round(c.y * 10) / 10]); }
  _gtb.spots = out.length ? out : null; _gtb.spotsKey = key;
  return _gtb.spots;
}
/** How long a friend's bottle takes to reach you: onto a strand, the next day; into a lake, three days. */
function gardenTideBottleDays() { const s = gardenTideBottleSpots(); return s && s.length ? 1 : 3; }

/* ---------- writing one ---------- */
function gardenTideBottleWrite(to) {
  if (typeof gpStage !== 'function') return false;
  const friends = typeof gtgFriendList === 'function' ? gtgFriendList() : [];
  gpStage('Message in a bottle', (el) => {
    el.classList.add('tg-panel', 'gtb-panel');
    el.appendChild(gpEl('p', 'muted', 'Pick up to three lines from the book, tuck something in if you like, and the sea takes it. It washes up on a friend’s beach the next day.'));
    if (!friends.length) { el.appendChild(gpEl('p', 'muted', 'This needs a friend for the sea to take it to. Add one under Friends.')); return; }
    const pick = gpEl('label', 'tg-pick'), sel = document.createElement('select'); sel.className = 'tg-sel'; sel.setAttribute('aria-label', 'Send to');
    { const o = document.createElement('option'); o.value = ''; o.textContent = 'Let the sea choose'; sel.appendChild(o); }
    for (const f of friends) { const o = document.createElement('option'); o.value = f.id; o.textContent = f.name; if (f.id === to) o.selected = true; sel.appendChild(o); }
    pick.append(gpEl('span', null, 'To '), sel); el.appendChild(pick);
    const chosen = [], note = gpEl('div', 'gtb-note'); note.setAttribute('aria-live', 'polite');
    const showNote = () => { note.textContent = chosen.length ? '“' + chosen.map(_gtbLine).join(' ') + '”' : 'Your note is empty. Pick a line or two.'; go.disabled = !chosen.length; };
    el.appendChild(note);
    const list = gpEl('div', 'tg-lines gtb-lines');
    for (const row of _gtbBook()) {
      const b = gpEl('button', 'tg-line', row.t); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
      b.onclick = () => { const k = chosen.indexOf(row.i); if (k >= 0) chosen.splice(k, 1); else if (chosen.length < GT_BOTTLE.lines) chosen.push(row.i); else { gardenToast('Three lines fill the note.', { icon: 'mail', timeout: 2500 }); return; } b.setAttribute('aria-pressed', String(chosen.includes(row.i))); b.classList.toggle('is-on', chosen.includes(row.i)); showNote(); };
      list.appendChild(b);
    }
    el.appendChild(list);
    let tuck = null; const tk = _gtbTuckable();
    if (tk.length) {
      el.appendChild(gpEl('h3', 'gd-h3', 'Tuck something in'));
      const row = gpEl('div', 'gtb-tuck');
      const none = gpEl('button', 'gtb-t is-on', 'Nothing'); none.type = 'button'; none.setAttribute('aria-pressed', 'true'); row.appendChild(none);
      const all = [none];
      none.onclick = () => { tuck = null; all.forEach(x => { x.classList.toggle('is-on', x === none); x.setAttribute('aria-pressed', String(x === none)); }); };
      for (const { d, n } of tk.slice(0, 14)) { const b = gpEl('button', 'gtb-t'); b.type = 'button'; b.title = d.name + ' (' + n + ')'; b.setAttribute('aria-label', 'Tuck in ' + d.name); b.setAttribute('aria-pressed', 'false'); b.innerHTML = gardenTideFindSvg(d.id, 30); b.onclick = () => { tuck = d; all.forEach(x => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', String(x === b)); }); }; row.appendChild(b); all.push(b); }
      el.appendChild(row);
    }
    const go = uiButton({ label: _gtbAtShore() ? 'Throw it into the sea' : 'Send it off', icon: 'waves', kind: 'primary', run: () => { if (gardenTideBottleSend(sel.value, chosen.slice(), tuck)) { try { el.closest('[role=dialog]')?.querySelector('.dlg-close, [aria-label="Close"]')?.click(); } catch (e) { /* fine */ } } } });
    go.classList.add('gtb-go'); el.appendChild(go); showNote();
  });
  return true;
}
/** Are you at the sea's edge now (on the strand, or facing the sea)? Then your figure throws it. */
function _gtbAtShore() {
  try {
    if (typeof _gw === 'undefined' || !_gw.on || (typeof gardenShoreVisit === 'function' && gardenShoreVisit())) return null;
    const w = typeof gardenTerrainWaterAhead === 'function' ? gardenTerrainWaterAhead(_gw.px, _gw.py) : null;
    if (w) { const c = gardenIslandBaseCell(w.x, w.y); if (c && (c.ocean || (typeof gardenTideShallows === 'function' && gardenTideShallows(w.x, w.y)))) return w; }
  } catch (e) { /* not here */ }
  return null;
}
/** Off it goes. to: a friend's id, or '' for the sea to choose. lines: up to three numbers from the book; tuck: a find def or null. */
function gardenTideBottleSend(to, lines, tuck) {
  const W = _gdG().wd, dn = gardenShoreDay(), friends = typeof gtgFriendList === 'function' ? gtgFriendList() : [];
  if (!lines.length || !friends.length) return false;
  let fid = to;
  if (!fid) { const free = friends.filter(f => !W[`tg.bt.${f.id}.${dn}`]); if (!free.length) { gardenToast('You have sent a bottle to everyone today. The sea needs a rest: tomorrow.', { icon: 'waves', timeout: 4000 }); return false; } fid = free[gardenHash('tide-bottle-to|' + dn + '|' + Date.now()) % free.length].id; }   // clock-ok: the sea's choice
  if (W[`tg.bt.${fid}.${dn}`]) { gardenToast(`One bottle a day to ${typeof _gscFirst === 'function' ? _gscFirst(fid) : 'them'}: the next can go tomorrow.`, { icon: 'waves', timeout: 4000 }); return false; }
  const ls = lines.slice(0, 3).map(Number); while (ls.length < 3) ls.push(GT_BOTTLE.none);
  const first = ls[0] < 40 ? ls[0] : 9;   // (the bottle post's own row has room for one line from its own book: an older app reads that)
  W[`tg.bt.${fid}.${dn}`] = { l: first };
  W[`tdbt.${fid}.${dn}`] = ls.concat([tuck ? _gtbFindIndex(tuck.id) : GT_BOTTLE.none]);
  if (tuck) _gdLed('tf', { i: { ['sh:' + tuck.id]: -1 }, n: 1 });
  _gdSaveQuiet(); _wdSave();
  try { if (typeof _gscPublish === 'function') _gscPublish(true).catch(() => {}); } catch (e) { /* the next check tells them */ }
  try { if (typeof _grGive === 'function') _grGive('did.bottle', { x: 1 }); } catch (e) { /* fine */ }
  const name = typeof _gscFirst === 'function' ? _gscFirst(fid) : 'a friend', ahead = _gtbAtShore();
  if (ahead) _gtbThrow(ahead);
  gardenToast(`${to ? `It floats off towards ${name}.` : `The sea has chosen ${name}.`} It will wash up on their beach tomorrow.`, { icon: 'waves', kind: 'ok', timeout: 5500 });
  gardenShoreEmit('bottle', { sent: true });
  return true;
}
/** Your figure throws it out over the water; it arcs, bobs once and is gone. */
function _gtbThrow(w) {
  try {
    if (typeof _gtcDo !== 'function') return;
    _gtcDo('throw', { key: 'tide:bottle-throw', name: 'the bottle', x: w.x, y: w.y, stand: { x: _gw.px, y: _gw.py }, deg: w.deg, noProp: true }, () => {
      if (typeof gardenWorldAdd !== 'function' || !(typeof gardenMotionOn !== 'function' || gardenMotionOn())) return;
      const W = GARDEN_WORLD, x0 = _gw.px, y0 = _gw.py, a = (w.deg || -90) * Math.PI / 180, x1 = x0 + Math.cos(a) * 3.4, y1 = y0 + Math.sin(a) * 2.6, t0 = performance.now();
      const svg = '<g transform="rotate(-30) scale(0.9)"><path d="M-6 -3h8q3 0 4 2l3 .4v2l-3 .4q-1 2 -4 2h-8q-3 0 -3 -3.4q0 -3.4 3 -3.4z" fill="#8ec4b0" opacity="0.85" stroke="#3a6a5a" stroke-width="0.6"/><rect x="9" y="-1.6" width="2.4" height="3.2" fill="#a87a4a"/><rect x="-4" y="-1.6" width="6" height="3.2" rx="1.4" fill="#f4ecd8"/></g>';
      gardenWorldAdd({ id: 'gt-bottle-fly', x: x0, y: y0, lift: 30, svg, update(dt, Sp) {
        const k = (performance.now() - t0) / 900; if (k >= 1) { Sp.remove(); try { if (window.GardenNativeActions) GardenNativeActions.effect('water', x1 * W.cellW, W.sky + y1 * W.cellH, { width: 26 }); } catch (e) { /* fine */ } return; }
        Sp.x = x0 + (x1 - x0) * k; Sp.y = y0 + (y1 - y0) * k; Sp.lift = 30 + Math.sin(k * Math.PI) * 26 - k * 30;
      } });
    }, .42);
  } catch (e) { /* it goes anyway */ }
}
/** For the snapshot (ti.b): the bottles you threw lately, as [pair mark, day, three lines, tuck]. */
GT_WIRE.push((out) => {
  if (typeof gtgPair !== 'function') return;
  const W = _gdG().wd, rows = [];
  for (const k of Object.keys(W)) { if (!k.startsWith('tdbt.')) continue; const p = k.split('.'), v = W[k], dn = Number(p[p.length - 1]), fid = p.slice(1, -1).join('.'); if (!Array.isArray(v) || !Number.isInteger(dn)) continue; const h = gtgPair(fid); if (h) rows.push([h, dn].concat(v.slice(0, 4).map(n => Math.max(0, Math.min(99, n | 0))))); }
  rows.sort((a, b) => b[1] - a[1]);
  if (rows.length) out.b = rows.slice(0, 3);
  // (the old ones go: a bottle more than a week old has long since washed up)
  const cut = gardenShoreDay() - 8; for (const k of Object.keys(W)) if (k.startsWith('tdbt.') && Number(k.split('.').pop()) < cut) delete W[k];
});

/* ---------- reading one (a friend's, on your strand: the bottle post's sprite asks) ---------- */
/** The whole note of a friend's bottle B {fid, name, l, dn}: the lines for the talk card. The find tucked in is yours, and it goes on the shelf. */
function gardenTideBottleRead(B, paid) {
  const f = gardenShoreFriends().find(q => q.id === B.fid), pair = typeof gtgPair === 'function' ? gtgPair(B.fid) : '';
  const row = f && f.ti && Array.isArray(f.ti.b) ? f.ti.b.find(r => r[0] === pair && r[1] === B.dn) : null;
  const ls = row ? row.slice(2, 5).map(_gtbLine).filter(Boolean) : [_gtbLine(B.l)].filter(Boolean);
  const tuck = row && row[5] < GT_BOTTLE.none ? GARDEN_SHORE_FINDS[row[5]] : null;
  const out = [`A bottle from ${B.name}, washed up on your beach.`, '“' + (ls.join(' ') || '…') + '”'];
  if (tuck && !tuck.storm) { if (gardenShoreGive(`tdbr.${B.fid}.${B.dn}`, { i: { ['sh:' + tuck.id]: 1 } })) out.push(`Tucked in with the note: ${/^[aeiou]/i.test(tuck.name) ? 'an' : 'a'} ${tuck.name.toLowerCase()}. It is in your bag now.`); }
  else if (paid) out.push('A smooth stone was in the bottle with the note.');
  _gtbShelfAdd(`f.${B.fid}.${B.dn}`, { f: B.name, l: row ? row.slice(2, 5) : [B.l], t: tuck ? tuck.id : '' });
  return { lines: out };
}
function _gtbShelfAdd(key, rec) {
  const W = _gdG().wd, k = 'tdbs.' + key; if (W[k]) return;
  W[k] = Object.assign({ d: _gdToday() }, rec);
  const all = Object.keys(W).filter(q => q.startsWith('tdbs.')).sort((a, b) => String(W[a].d || '').localeCompare(String(W[b].d || '')));
  for (const q of all.slice(0, Math.max(0, all.length - 40))) delete W[q];
  _wdSave();
  if (gardenShoreGive('tdb.rack', { i: { ['decor:' + GT_BOTTLE.rack]: 1 }, x: 2 })) setTimeout(() => { try { gardenToast('Your first bottle! A bottle rack for your garden, to keep them in. It is in your bag.', { icon: 'gift', timeout: 6500 }); } catch (e) { /* fine */ } }, 2600);
  gardenShoreEmit('bottle', { got: true, from: rec.v ? 'villager' : 'friend' });
}

/* ---------- a villager's bottle, on a calm day ---------- */
/** On about one low water in five, on your own strand, a bottle from one of the folk lies on the sand (not after a storm: the storm
 *  brings its own). {x, y, h, tale} or null. */
function gardenTideVillagerBottle(w) {
  if (gardenShoreVisit()) return null;
  const F = GardenTide.field(); if (!F) return null;
  const seed = gardenTideSeed(); if (gardenHash('tide-vbottle|' + seed + '|' + w) % GT_BOTTLE.villagerEvery) return null;
  if (typeof gardenTideStormBefore === 'function' && gardenTideStormBefore(w) >= 0) return null;
  const key = F.rev + '|' + seed + '|' + w; if (_gtb.vKey === key) return _gtb.v;
  const W = GARDEN_WORLD, r = gardenRand(gardenHash('tide-vbottle-at|' + key)), zones = [...F.bandZ.keys()].filter(z => _gtcOpenZone(z)).sort((a, b) => a - b);
  let out = null;
  for (const z of zones) {
    const list = F.bandZ.get(z) || [];
    for (let k = 0; k < 60 && list.length && !out; k++) { const at = list[Math.floor(r() * list.length)], tx = at % F.FW, ty = (at - tx) / F.FW, x = (tx + .5) * F.P / W.cellW, y = ((ty + .5) * F.P - W.sky) / W.cellH, h = GardenTide.h(x, y); if (!(h > 10 && h < 32) || F.K[at] !== 1 || !gardenTideOpenSand(x, y, true)) continue; out = { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, h, tale: GT_BOTTLE_TALES[gardenHash('tide-vtale|' + seed + '|' + w) % GT_BOTTLE_TALES.length] }; }
    if (out) break;
  }
  _gtb.v = out; _gtb.vKey = key; return out;
}
function gardenTideVillagerBottleRows(px, py, T) {
  const b = gardenTideVillagerBottle(T.w); if (!b || _gdG().led['tdbv.' + T.w] || !(b.h > T.line + 2)) return [];
  if (Math.hypot(b.x - px, (b.y - py) * 1.3) > 1.7) return [];
  return [{ key: 'tide:vb:' + T.w, act: 'scoop', tide: { kind: 'vbottle', w: T.w }, words: 'Pick up the bottle', name: 'a bottle', x: b.x, y: b.y, stand: { x: b.x, y: b.y + .12 }, pri: .66 }];
}
function _gtbVillagerOpen(w) {
  const b = gardenTideVillagerBottle(w), g = _gdG(); if (!b || g.led['tdbv.' + w]) return;
  const r = gardenRand(gardenHash('tide-vgift|' + w)), gift = r() < .5 ? { c: 6 + Math.floor(r() * 6) } : { i: { ['sh:' + gardenTideFindPick(1, r, 1, false).id]: 1 } };
  gardenShoreGive('tdbv.' + w, gift);
  const tale = b.tale, name = gardenShoreFolkName(tale.v);
  _gtbShelfAdd('v.' + w, { f: name, v: tale.v, s: tale.id });
  try { gardenCatchMoment('shore', 'bottle-note', { isNew: !g.disc['td.vbottle'] }); } catch (e) { /* only a picture */ }
  if (!g.disc['td.vbottle']) g.disc['td.vbottle'] = _gdToday();
  setTimeout(() => {
    try { wdTalk({ name: 'A bottle from ' + name, art: typeof gardenCastSvg === 'function' ? gardenCastSvg(tale.v) || '' : '', lines: tale.t.concat([`(${gardenShoreGiftWords(gift).replace(/^./, c => c.toUpperCase())} ${gift.c ? 'were' : 'was'} in the bottle too. The note is on your bottle shelf, in the journal.)`]), actions: [], at: { x: b.x, y: b.y }, bye: 'Keep it' }); } catch (e) { /* fine */ }
  }, 2700);
}
const GardenTideBottleSprite = {
  id: 'bottles',
  paint(scene, root) { this.scene = scene; this.root = root; this.t = 0; this.im = null; },
  clear() { if (this.im) { try { this.im.destroy(); } catch (e) { /* gone */ } } this.im = null; this.scene = null; },
  tick(time, view, T, vis) {
    const scene = this.scene; if (!scene || time - this.t < 450) return; this.t = time;
    if (typeof _gtc === 'undefined' || !_gtc.atlas || !scene.textures.exists(GT_ATLAS)) return;
    const b = vis ? gardenTideVillagerBottle(T.w) : null, show = !!(b && !_gdG().led['tdbv.' + T.w] && b.h > T.line + 2), W = GARDEN_WORLD;
    if (show && !this.im) { this.im = scene.add.image(0, 0, GT_ATLAS, 'f-bottle-note').setDepth(-9345.17).setOrigin(.5, .7); this.root.add(this.im); if (this.root.sort) this.root.sort('depth'); }
    if (this.im) { this.im.setVisible(show); if (show) this.im.setPosition(b.x * W.cellW, W.sky + b.y * W.cellH).setScale(16 / 44).setRotation(-.4); }
  },
};
if (window.GardenPaintTide) GardenPaintTide.parts.push(GardenTideBottleSprite);
GT_ROW_SOURCES.push((px, py, T) => gardenTideVillagerBottleRows(px, py, T));
GT_RUN.vbottle = (spot) => _gtcDo('scoop', spot, () => _gtbVillagerOpen(spot.tide.w), .62);
// at the sea's edge (beside the swim and the skim): throw a message in a bottle, once you have a friend to send it to
gardenShoreWaterOn((w) => {
  if (gardenShoreVisit() || !(typeof gtgFriendList === 'function' && gtgFriendList().length)) return [];
  const c = gardenIslandBaseCell(w.x, w.y); if (!c || !(c.ocean || gardenTideShallows(w.x, w.y))) return [];
  return [{ key: 'water-bottle', act: 'throw', tide: { kind: 'bottle-write' }, words: 'Throw a message in a bottle', name: 'a message in a bottle', x: w.x, y: w.y, stand: null, deg: w.deg, src: 'water-bottle' }];
});
GT_RUN['bottle-write'] = () => gardenTideBottleWrite('');

/* ---------- the bottle shelf (the Field Journal's Keepsakes page: 94-garden-tide-3comb.js asks) ---------- */
function gardenTideBottleShelf(left) {
  const W = _gdG().wd, keys = Object.keys(W).filter(k => k.startsWith('tdbs.')).sort((a, b) => String(W[b].d || '').localeCompare(String(W[a].d || '')));
  const h = left.appendChild(_gjEl('div', 'gj-ptitle')); h.innerHTML = '<h3>The bottle shelf</h3><i class="gj-hand">notes the sea brought</i>';
  const shelf = left.appendChild(_gjEl('div', 'gtb-shelf'));
  if (!keys.length) { shelf.appendChild(_gjEl('p', 'muted', 'No bottles yet. They wash up on the strand at low water: from friends, and now and then from the folk.')); return; }
  for (const k of keys.slice(0, 12)) {
    const r = W[k], card = shelf.appendChild(_gjEl('div', 'gtb-card'));
    const text = r.s ? ((GT_BOTTLE_TALES.find(t => t.id === r.s) || { t: [''] }).t[0] || '') : '“' + (Array.isArray(r.l) ? r.l.map(_gtbLine).filter(Boolean).join(' ') : '') + '”';
    card.innerHTML = `<span class="gtb-art">${gardenTideFindSvg('bottle-note', 34)}</span><span class="gtb-txt"><b>${esc(r.f ? 'From ' + r.f : 'A bottle')}</b><small>${esc(typeof _gjDay === 'function' ? _gjDay(r.d) : r.d || '')}</small><span>${esc(text)}</span>${r.t ? `<small class="gtb-tucked">${gardenTideFindSvg(r.t, 18)} ${esc((gardenTideFindDef(r.t) || {}).name || '')} tucked in</small>` : ''}</span>`;
  }
}
