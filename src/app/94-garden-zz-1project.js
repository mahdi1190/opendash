/* ============================================================
   A SHARED PROJECT (docs/dev/GARDEN_TOGETHER.md section 24): two friends build something big over weeks, each from their own pegs, timber and stone. It stands in both gardens, and anyone visiting either sees how far it has got.

   MERGING. Each person writes only their own part: wd['tg.pa.<friend>.<uid>'] = {p, t, s, d}, one entry per time they add, so their own two devices add up. Your snapshot says your part (`tg.pj` [mark, kind, pegs, timber, stone, tenths of a percent]). What you see is your part plus theirs,
   so two people adding at the same moment both count. If that goes over what the thing needs, the one whose friend id sorts last takes back the extra, once, so nobody loses materials and it cannot happen twice. A friend's number is never above what the project needs. You are thanked only if your own part is real (GTG_PJ.minShare).
   ============================================================ */
const GTG_PJ = Object.freeze({ stages: 5, minShare: 0.1, stageGift: Object.freeze({ ticket: 8 }), doneGift: Object.freeze({ ticket: 40, 'mat:timber': 6, 'mat:stone': 6 }) });
const _GTG_MATS = Object.freeze([['p', 'mat:peg', 'Survey pegs'], ['t', 'mat:timber', 'Timber'], ['s', 'mat:stone', 'Field stone']]);
/* What can be built. cost is for the two of you together. Ids are stable. */
const GTG_PROJECTS = Object.freeze([
  Object.freeze({ id: 'bridge', name: 'A bridge between gardens', short: 'bridge', icon: 'landmark', x: 15.5, y: 21.4, cost: Object.freeze({ p: 40, t: 110, s: 60 }), blurb: 'Stone piers and a timber deck, going out over your lake towards theirs. When it is done, you can walk across.', go: 'Walk across' }),   // world cells
  Object.freeze({ id: 'lighthouse', name: 'A lighthouse', short: 'lighthouse', icon: 'lightbulb', x: 38.4, y: 20.6, cost: Object.freeze({ p: 30, t: 70, s: 110 }), blurb: 'On the shore at the end of the lake, the same one in both gardens. When it is done, it is lit every night.', go: 'Go over' }),   // world cells
  Object.freeze({ id: 'statue', name: 'A shared statue', short: 'statue', icon: 'trophy', x: 26, y: 13.2, cost: Object.freeze({ p: 20, t: 50, s: 130 }), blurb: 'Two gardeners in stone, in the middle of the green. People will ask who they are.', go: 'Go over' }),   // world cells
]);
const _GTG_PJ_ROW = new Map(GTG_PROJECTS.map(r => [r.id, r]));
function _gtgpMine(fid) { const W = _gtgW(), out = { p: 0, t: 0, s: 0 }, pre = 'tg.pa.' + fid + '.'; for (const k of Object.keys(W)) if (k.startsWith(pre) && W[k]) for (const m of ['p', 't', 's']) out[m] += Number(W[k][m]) || 0; for (const m of ['p', 't', 's']) out[m] = Math.max(0, out[m]); return out; }
/** Your friend's part: from their garden as you hold it, kept so it survives their being away. Never more than the thing needs. */
function _gtgpTheirs(fid, row) {
  const W = _gtgW(), f = gtgFriends().find(x => x.id === fid), h = gtgPair(fid), got = f && Array.isArray(f.tg.pj) ? f.tg.pj.find(r => r[0] === h && r[1] === row.id) : null, key = 'tg.py.' + fid;
  if (got) { const v = { p: Math.min(got[2], row.cost.p), t: Math.min(got[3], row.cost.t), s: Math.min(got[4], row.cost.s) }, o = W[key]; if (!o || o.p !== v.p || o.t !== v.t || o.s !== v.s) { W[key] = v; _gdSave(); } return v; }
  return W[key] || { p: 0, t: 0, s: 0 };
}
function _gtgpList() {
  const W = _gtgW(), out = [];
  for (const k of Object.keys(W)) { if (!k.startsWith('tg.pj.') || !W[k] || W[k].x) continue; const row = _GTG_PJ_ROW.get(W[k].c); if (row) out.push({ fid: k.slice(6), row, d: W[k].d }); }
  return out.sort((a, b) => String(a.d).localeCompare(String(b.d))).slice(0, 3);
}
function _gtgpState(P) {
  const mine = _gtgpMine(P.fid), theirs = _gtgpTheirs(P.fid, P.row), c = P.row.cost; let have = 0, all = 0;
  for (const m of ['p', 't', 's']) { have += Math.min(c[m], mine[m] + theirs[m]); all += c[m]; }
  const share = have / all, mineAll = mine.p + mine.t + mine.s;
  return { mine, theirs, share, stage: Math.min(GTG_PJ.stages, Math.floor(share * GTG_PJ.stages + 1e-9)), done: have >= all, real: mineAll >= all * GTG_PJ.minShare };
}
/** Friends who have staked something out with you, and you have not answered. */
function _gtgpInvites() {
  const W = _gtgW(), out = [], mine = _gtgpList();
  for (const f of gtgFriends()) {
    if (!Array.isArray(f.tg.pj)) continue;
    const h = gtgPair(f.id); if (!h) continue;
    for (const r of f.tg.pj) { if (r[0] !== h) continue; const row = _GTG_PJ_ROW.get(r[1]); if (!row || W['tg.pj.' + f.id]) continue; if (!mine.some(P => P.row.id === row.id)) out.push({ fid: f.id, name: f.name, row }); }
  }
  return out;
}
gtgWire((o) => {
  const pj = [];
  for (const P of _gtgpList()) { const h = gtgPair(P.fid); if (!h) continue; const S = _gtgpState(P); pj.push([h, P.row.id, Math.min(9999, S.mine.p), Math.min(9999, S.mine.t), Math.min(9999, S.mine.s), Math.round(S.share * 1000)]); }
  if (pj.length) o.pj = pj;
});
/* ---------- what you do ---------- */
function _gtgpStart(fid, id) {
  const W = _gtgW(), row = _GTG_PJ_ROW.get(id); if (!row) return;
  if (_gtgpList().length >= 3) return gpNote('Three projects at a time is plenty.');
  if (_gtgpList().some(P => P.row.id === id)) return gpNote(`You are already building ${row.name.toLowerCase()}.`);
  W['tg.pj.' + fid] = { c: id, d: gtgToday() }; _gdSave();
  try { if (typeof _gscPublish === 'function') _gscPublish(true).catch(() => {}); } catch (e) { /* the next check tells them */ }
  gpNote(`Staked out. ${_gscFirst(fid)} will see it in their garden.`); _gtgpDraw(gardenHere());
}
function _gtgpLeave(P) {
  const W = _gtgW(); W['tg.pj.' + P.fid] = Object.assign({}, W['tg.pj.' + P.fid], { x: gtgToday() }); _gdSave(); gtgPublishSoon();
  gtgSprite('pj-' + P.row.id, null);
}
/** Materials out of your bag and onto the project, with an Undo. */
function _gtgpAdd(P, m, n) {
  const R = _GTG_MATS.find(r => r[0] === m), S = _gtgpState(P), room = Math.max(0, P.row.cost[m] - S.mine[m] - S.theirs[m]), v = Math.min(n, room, gardenHas(R[1])); if (v <= 0) return 0;
  const g = _gdG(), W = g.wd, uid = _gdUid('').toLowerCase(), k = 'tg.pa.' + P.fid + '.' + uid, today = gtgToday();
  W[k] = { [m]: v, d: today };
  g.led['pl.' + today + '.' + uid] = { d: today, k: 'pl', i: { [R[1]]: -v }, n: 1, w: 'project' };
  _gdSave(); gardenTickSoon(); gtgPublishSoon();
  _fxSoundOk('sparkle');
  toast(`${v} ${R[2].toLowerCase()} on the ${P.row.short}`, { icon: 'hammer', timeout: 6000, action: { label: 'Undo', run: () => { const u = _gdUid('').toLowerCase(); W['tg.pa.' + P.fid + '.' + u] = { [m]: -v, d: gtgToday() }; g.led['pl.' + gtgToday() + '.' + u] = { d: gtgToday(), k: 'pl', i: { [R[1]]: v }, n: 1, w: 'project' }; _gdSave(); gardenTickSoon(); gtgPublishSoon(); _gtgpDraw(gardenHere()); } } });
  _gtgpTick(); _gtgpDraw(gardenHere());
  return v;
}
function _fxSoundOk(k) { try { if (typeof _fxSound === 'function') _fxSound(k); } catch (e) { /* no sound, no matter */ } }
function _gtgpTick() {
  const W = _gtgW(), me = gtgMeId();
  for (const P of _gtgpList()) {
    // you each staked out something different at the same moment: the one whose id sorts last builds the other's, and what they added counts towards it
    const fr = gtgFriends().find(x => x.id === P.fid), hh = gtgPair(P.fid), other = fr && Array.isArray(fr.tg.pj) ? fr.tg.pj.find(r => r[0] === hh && r[1] !== P.row.id && _GTG_PJ_ROW.has(r[1])) : null;
    if (other && me > P.fid && !_gtgpList().some(Q => Q.row.id === other[1])) { W['tg.pj.' + P.fid] = { c: other[1], d: P.d }; _gdSave(); gtgPublishSoon(); continue; }
    const S = _gtgpState(P), c = P.row.cost;
    for (const m of ['p', 't', 's']) {   // both added the last of it at the same moment: one of you takes back the extra, once
      const over = S.mine[m] + S.theirs[m] - c[m], key = 'tg.pf.' + P.fid + '.' + m + '.' + S.mine[m];
      if (over <= 0 || !me || me < P.fid || W[key]) continue;
      const v = Math.min(over, S.mine[m]); if (v <= 0) continue;
      const u = _gdUid('').toLowerCase(), R = _GTG_MATS.find(r => r[0] === m), g = _gdG();
      W[key] = gtgToday(); W['tg.pa.' + P.fid + '.' + u] = { [m]: -v, d: gtgToday() }; g.led['pl.' + gtgToday() + '.' + u] = { d: gtgToday(), k: 'pl', i: { [R[1]]: v }, n: 1, w: 'project' };
      _gdSave(); gtgPublishSoon(); gpNote(`You both added the last of the ${R[2].toLowerCase()}: ${v} came back to your bag.`);
    }
    if (!S.real) continue;
    for (let st = 1; st <= S.stage; st++) {
      const done = st === GTG_PJ.stages;
      if (gpGrant(`tg-pj-${P.fid}-${P.row.id}-${st}`, done ? Object.assign({}, GTG_PJ.doneGift) : Object.assign({}, GTG_PJ.stageGift))) gpNote(done ? `The ${P.row.short} is finished, you and ${_gscFirst(P.fid)}. 40 tickets, and timber and stone` : `The ${P.row.short} has grown. ${GTG_PJ.stageGift.ticket} tickets`);
    }
  }
}
/* ---------- the drawings: stage 0 is a stake and a string, 5 is finished. Plain attributes, so a photo has it too ---------- */
function _gtgpBridgeSvg(st, m) {
  const A = GART; let s = '', dark = m && (m.tod === 'night' || m.tod === 'dusk');
  s += A.P('#000000', A.ell(70, 4, 96, 8), 0.14);
  if (st < 1) return s + A.S('#8a6a3a', 2, 'M-6 0L-6 -18M90 2L90 -14') + A.S('#d8c49a', 1, 'M-6 -16L90 -12');
  for (let i = 0; i < Math.min(st + 1, 4); i++) { const x = i * 44; s += A.P('#9a958a', `M${x - 8} 4L${x - 6} -18L${x + 6} -18L${x + 8} 4z`) + A.P('#b6b0a2', `M${x - 6} -18L${x - 3} -18L${x - 4} 4L${x - 8} 4z`); }
  if (st >= 2) s += A.S('#7e5a34', 7, `M-14 -18L${Math.min(st - 1, 3) * 44 + 8} -18`) + A.S('#a8804e', 3, `M-14 -20L${Math.min(st - 1, 3) * 44 + 8} -20`);
  if (st >= 4) for (let i = 0; i <= 7; i++) { const x = -10 + i * 20; s += A.S('#7e5a34', 2.4, `M${x} -20L${x} -33`); }
  if (st >= 4) s += A.S('#8e6a3e', 2.6, 'M-12 -33L134 -33');
  if (st >= 5) { s += A.P('#ffffff', A.ell(170, -20, 44, 14), 0.5) + A.P('#ffffff', A.ell(150, -24, 30, 10), 0.7); s += A.S('#3a3024', 1.8, 'M-10 -33L-10 -46') + A.P(dark ? '#ffd98a' : '#d8c49a', A.rrect(-13, -54, 6, 8, 1)); }
  return s;
}
function _gtgpLighthouseSvg(st, m) {
  const A = GART; let s = A.P('#000000', A.ell(0, 3, 40, 8), 0.14) + A.P('#7e796e', A.ell(0, 1, 36, 9)) + A.P('#9a958a', A.ell(-6, -2, 26, 7));
  if (st < 1) return s + A.S('#8a6a3a', 2, 'M-14 -2L-14 -18M14 -2L14 -18') + A.S('#d8c49a', 1, 'M-14 -16L14 -16');
  const hi = [0, 24, 54, 90, 90, 90][st], tw = (h) => 17 - h * 0.075;
  s += A.P('#f2ece0', `M-18 -2L${-tw(hi)} ${-hi - 2}L${tw(hi)} ${-hi - 2}L18 -2z`);
  for (let y = 18; y < hi; y += 34) s += A.P('#c8483a', `M${-tw(y)} ${-y}L${tw(y)} ${-y}L${tw(y + 14)} ${-y - 14}L${-tw(y + 14)} ${-y - 14}z`);
  if (st >= 2) s += A.P('#6a4a2a', A.rrect(-5, -15, 10, 13, 2));
  if (st >= 4) s += A.P('#4a4238', A.rrect(-14, -96, 28, 5, 1)) + A.S('#4a4238', 1.4, 'M-13 -96L-13 -104M13 -96L13 -104M-13 -104L13 -104');
  if (st >= 5) { const lit = m && (m.tod === 'night' || m.tod === 'dusk'); s += A.P(lit ? '#ffe9a0' : '#cfe4ec', A.rrect(-8, -112, 16, 18, 1)) + A.P('#c8483a', 'M-11 -112L0 -124L11 -112z'); }
  return s;
}
function _gtgpStatueSvg(st) {
  const A = GART; let s = A.P('#000000', A.ell(0, 3, 30, 7), 0.15);
  if (st < 1) return s + A.S('#8a6a3a', 2, 'M-16 0L-16 -16M16 0L16 -16') + A.S('#d8c49a', 1, 'M-16 -14L16 -14');
  const stone = '#b0aca0', hi = '#c8c4b8', fig = (x, h) => A.P(stone, `M${x - 8} -24L${x - 6} ${-24 - h * 0.6}L${x + 6} ${-24 - h * 0.6}L${x + 8} -24z`) + (h > 34 ? A.P(hi, A.circ(x, -24 - h * 0.6 - 8, 8)) + A.S(stone, 4, `M${x + 6} ${-24 - h * 0.5}L${x + 16} ${-24 - h * 0.74}`) : '');
  s += A.P('#8e8a80', A.rrect(-26, -12, 52, 13, 2)) + A.P('#a8a498', A.rrect(-22, -24, 44, 13, 2));
  if (st >= 2) s += fig(-11, Math.min(50, 16 + st * 8)) ;
  if (st >= 3) s += fig(11, Math.min(50, 8 + st * 8));
  if (st >= 5) s += A.S('#7a9e58', 2.2, 'M-26 -13q10 4 22 1') + A.S('#7a9e58', 2.2, 'M26 -13q-10 4 -22 1');
  return s;
}
function _gtgpBox(id, w, h) { return `<svg viewBox="${id === 'bridge' ? -40 : -120} -130 240 150" width="${w}" height="${h}" aria-hidden="true">`; }
function gtgProjectSvg(id, st, m) { return id === 'bridge' ? _gtgpBridgeSvg(st, m) : id === 'lighthouse' ? _gtgpLighthouseSvg(st, m) : _gtgpStatueSvg(st); }
function _gtgpDraw(m) {
  if (!m) return;
  const seen = new Set();
  if (m.visit) {
    for (const r of _gtgTheirs(m).pj || []) {
      const row = _GTG_PJ_ROW.get(r[1]); if (!row || seen.has(row.id)) continue; seen.add(row.id);
      gtgSprite('pj-' + row.id, { x: row.x, y: row.y, z: row.y, hit: 1.2, hitUp: 22, label: row.name, svg: gtgProjectSvg(row.id, Math.min(GTG_PJ.stages, Math.floor(r[5] / 200)), m), onClick: () => wdTalk({ lines: [r[0] === gtgPair(m.visit.fid) ? `Yours and ${_gscFirst(m.visit.fid)}’s. ${Math.floor(r[5] / 10)}% of the way there.` : `${_gscFirst(m.visit.fid)} is building this with someone. ${Math.floor(r[5] / 10)}% of the way there.`], bye: 'Lovely' }) });
    }
  } else {
    for (const P of _gtgpList()) {
      seen.add(P.row.id); const S = _gtgpState(P);
      gtgSprite('pj-' + P.row.id, { x: P.row.x, y: P.row.y, z: P.row.y, hit: 1.2, hitUp: 22, label: `${P.row.name}, with ${_gscFirst(P.fid)}`, svg: gtgProjectSvg(P.row.id, S.stage, m), onClick: () => (S.done ? wdTalk({ lines: [`Yours and ${_gscFirst(P.fid)}’s, and finished.`], actions: [{ label: P.row.go, primary: true, run: () => { wdTalkClose(true); setView('garden:visit:' + P.fid); } }], bye: 'Leave it' }) : gardenProjectOpen()) });
    }
    for (const I of _gtgpInvites()) {
      if (seen.has(I.row.id)) continue; seen.add(I.row.id);
      gtgSprite('pj-' + I.row.id, { x: I.row.x, y: I.row.y, z: I.row.y, hit: 1.2, hitUp: 22, label: `${I.name} has staked something out`, svg: gtgProjectSvg(I.row.id, 0, m) + gtgSaySvg(`${I.name}?`, -28), onClick: () => wdTalk({ lines: [`A stake and a string, and ${I.name}’s handwriting on a label: ${I.row.name.toLowerCase()}, with you. ${I.row.blurb}`], actions: [{ label: 'Build it together', primary: true, run: () => { wdTalkClose(true); _gtgpStart(I.fid, I.row.id); gardenProjectOpen(); } }], bye: 'Not now' }) });
    }
  }
  for (const row of GTG_PROJECTS) if (!seen.has(row.id)) gtgSprite('pj-' + row.id, null);
  const lit = GTG_PROJECTS.find(r => r.id === 'lighthouse'), litOn = seen.has('lighthouse') && (m.tod === 'night' || m.tod === 'dusk') && (m.visit ? (_gtgTheirs(m).pj || []).some(r => r[1] === 'lighthouse' && r[5] >= 1000) : _gtgpList().some(P => P.row.id === 'lighthouse' && _gtgpState(P).done));
  if (litOn) wdGlow('tg-lighthouse', '<circle cy="-103" r="46" fill="#ffe08a" opacity="0.16"/><circle cy="-103" r="16" fill="#fff0b8" opacity="0.5"/><path d="M0 -103L220 -130L220 -80z" fill="#fff4c8" opacity="0.12"/><path d="M0 -103L-220 -130L-220 -80z" fill="#fff4c8" opacity="0.12"/>', lit.x, lit.y); else wdGlowOff('tg-lighthouse');
}
/* ---------- the panel ---------- */
function _gtgpBar(row, m, S) {
  const c = row.cost[m[0]], a = Math.min(c, S.mine[m[0]]), b = Math.min(c - a, S.theirs[m[0]]);
  const el = gpEl('div', 'tg-bar');
  el.setAttribute('role', 'img'); el.setAttribute('aria-label', `${m[2]}: you ${a}, your friend ${b}, of ${c}`);
  const A = gpEl('span', 'tg-bar-a'), B = gpEl('span', 'tg-bar-b'); A.style.width = (a / c * 100).toFixed(1) + '%'; B.style.width = (b / c * 100).toFixed(1) + '%'; el.append(A, B);
  return el;
}
function _gtgpCard(P, repaint) {
  const S = _gtgpState(P), row = P.row, card = gpEl('section', 'tg-pj'), first = _gscFirst(P.fid);
  const art = gpEl('div', 'tg-pj-art'); art.innerHTML = `${_gtgpBox(row.id, 180, 112)}${gtgProjectSvg(row.id, S.stage, null)}</svg>`;
  const body = gpEl('div', 'tg-pj-body');
  body.append(gpEl('h3', 'gd-h3', `${row.name}, with ${first}`), gpEl('p', 'muted', S.done ? 'Finished. It stands in both your gardens.' : `${Math.floor(S.share * 100)}% of the way there. You and ${first} each add what you have earned, and it shows in both gardens.`));
  for (const m of _GTG_MATS) {
    const c = row.cost[m[0]], line = gpEl('div', 'tg-pj-mat'), have = gardenHas(m[1]), room = c - S.mine[m[0]] - S.theirs[m[0]];
    line.append(gpEl('b', null, m[2]), _gtgpBar(row, m, S), gpEl('small', null, `${Math.min(c, S.mine[m[0]] + S.theirs[m[0]])} of ${c}`));
    for (const n of [1, 5]) { const b = _gdpBtn('+' + n, { run: () => { _gtgpAdd(P, m[0], n); repaint(); } }); b.disabled = have < 1 || room < 1; line.appendChild(b); }
    line.appendChild(gpEl('small', 'muted', `${have} in your bag`));
    body.appendChild(line);
  }
  body.appendChild(gpEl('p', 'muted tg-pj-say', S.real ? 'Each step of it gives you both tickets. Pegs come from finished tasks, timber from focus, stone from finished tasks and digs.' : 'Add a little of your own and each step of it gives you tickets too. Pegs come from finished tasks, timber from focus, stone from finished tasks and digs.'));
  if (S.done) body.appendChild(_gdpBtn(row.go, { kind: 'btn-primary', icon: 'footprints', run: () => setView('garden:visit:' + P.fid) }));
  else body.appendChild(_gdpBtn('Stop building this', { kind: 'btn-ghost', run: () => { const was = _gtgW()['tg.pj.' + P.fid]; _gtgpLeave(P); toast(`Stopped the ${row.short}. What you added stays on it.`, { timeout: 6000, action: { label: 'Undo', run: () => { _gtgW()['tg.pj.' + P.fid] = was; _gdSave(); gtgPublishSoon(); _gtgpDraw(gardenHere()); } } }); repaint(); } }));
  card.append(art, body);
  return card;
}
function gardenProjectOpen() {
  gpStage('Build something together', (el) => {
    el.classList.add('tg-panel');
    const paint = () => {
      el.textContent = '';
      const list = _gtgpList(), inv = _gtgpInvites(), friends = gtgFriendList();
      for (const P of list) el.appendChild(_gtgpCard(P, paint));
      for (const I of inv) { const c = gpEl('section', 'tg-pj'); c.append(gpEl('p', null, `${I.name} has staked out ${I.row.name.toLowerCase()} with you. ${I.row.blurb}`), _gdpBtn('Build it together', { kind: 'btn-primary', run: () => { _gtgpStart(I.fid, I.row.id); paint(); } })); el.appendChild(c); }
      if (list.length >= 3) return;
      const free = friends.filter(f => !_gtgW()['tg.pj.' + f.id] || _gtgW()['tg.pj.' + f.id].x), rows = GTG_PROJECTS.filter(r => !list.some(P => P.row.id === r.id));
      if (!friends.length) { el.appendChild(gpEl('p', 'muted', 'This one takes two. Add a friend under Friends, and you can build something with them from here.')); return; }
      if (!free.length) return;
      el.appendChild(gpEl('h3', 'gd-h3', list.length ? 'Start another' : 'What shall it be?'));
      const sel = document.createElement('select'); sel.className = 'tg-sel'; sel.setAttribute('aria-label', 'Build it with'); for (const f of free) { const o = document.createElement('option'); o.value = f.id; o.textContent = f.name; sel.appendChild(o); }
      const pick = gpEl('label', 'tg-pick'); pick.append(gpEl('span', null, 'Build it with '), sel); el.appendChild(pick);
      for (const r of rows) { const c = gpEl('section', 'tg-pj tg-pj-new'), a = gpEl('div', 'tg-pj-art'); a.innerHTML = `${_gtgpBox(r.id, 120, 75)}${gtgProjectSvg(r.id, GTG_PJ.stages, null)}</svg>`; const b = gpEl('div', 'tg-pj-body'); b.append(gpEl('h3', 'gd-h3', r.name), gpEl('p', 'muted', `${r.blurb} Takes ${r.cost.p} pegs, ${r.cost.t} timber and ${r.cost.s} stone between you: weeks of real work.`), _gdpBtn('Stake it out', { kind: 'btn-primary', icon: 'hammer', run: () => { _gtgpStart(sel.value, r.id); paint(); } })); c.append(a, b); el.appendChild(c); }
    };
    paint();
  });
}
gardenPlayAdd({ id: 'tg-project', name: 'Build something together', icon: 'landmark', group: 'make', blurb: 'A bridge, a lighthouse or a statue, with a friend, over weeks, from what your real work earns.', status: () => { try { const l = _gtgpList(); return l.length ? `${Math.floor(_gtgpState(l[0]).share * 100)}% of the ${l[0].row.short}` : ''; } catch (e) { return ''; } }, open: gardenProjectOpen });
wdMod({ id: 'tg-project', visit: true, begin(m) { _gtgpDraw(m); }, painted(m) { _gtgpDraw(m); }, tick(m) { if (Math.floor(_wd.t) % 20 === 0) { if (!m.visit) _gtgpTick(); _gtgpDraw(m); } } });
