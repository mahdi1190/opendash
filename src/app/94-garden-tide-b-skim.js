/* ============================================================
   THE SKIMMING LEAGUE (FUN-ROADMAP phase 2, theme G; it grows skipping stones, 94-garden-zz-7act-1core.js). At any still water where
   you can skim a stone, three league throws a day: "A league throw". A marker runs along a little bar; press E, Space or click as
   it crosses the middle. Nearer the middle, more skips; dead on, the stone curves as it goes (style). A thin slate from a rocky shore
   (94-garden-tide-0rules.js, sh:slate) skips two further, and is used up. Skips and style make the score.
   The league is a chalk board of the month: the villagers each have their best, with Pip at the top. You start at the bottom and
   climb by beating whoever is one place above you; beat Pip and his champion stone is yours to stand in your garden. A new league
   each month, and nothing is lost if you miss a day. Friends' best throws this month are on your board too (the snapshot's ti.sk).
   Saved: g.wd['tsk.<month>'] = {r: places climbed, b: your best}, g.wd['tskd.<day>'] throws today; rewards in the ledger
   (tsk.<month>.<rung>, tsk.champ.<month>), the champion stone once (tsk.stone).
   ============================================================ */
const GT_SKIM = Object.freeze({ day: 3, stone: 'skim-stone', zone: .24, gold: .06, sweepMs: 1150 });
// the villagers' bests this month (a little different each month), lowest first: Pip is always at the top
const GT_SKIM_FOLK = Object.freeze([['thistle', 34], ['tam', 45], ['wick', 57], ['bramble', 68], ['quince', 79], ['pip', 94]]);
const GT_SKIM_BEAT = Object.freeze({
  thistle: '“Well thrown, dear. I only skim to keep my wrist in.”', tam: '“Hm. Fair. I throw them more downwards, as a rule.”', wick: '“I see. I shall have to practise in the dark, where nobody can see me lose.”',
  bramble: '“I will be drawing that throw. In the margin. Small.”', quince: '“Oh, well done! The bees will be so disappointed in me.”',
  pip: '“No! No, that was brilliant. Here: my champion stone. It is yours now. I will win it back. Probably. Next month.”',
});
const _gtsk = { el: null, raf: 0, off: null };
function _gtskMonth() { return gardenShoreMonth(); }
/** The villagers' ladder this month, lowest first: [{who, name, score, rung}] (Pip always top: his base is well clear of the rest). */
function _gtskLadder() { const mo = _gtskMonth(), r = gardenRand(gardenHash('tide-skim|' + mo)); return GT_SKIM_FOLK.map(([id, s]) => ({ who: id, name: gardenShoreFolkName(id), score: s + Math.floor(r() * 9) - 4 })).sort((a, b) => a.score - b.score).map((q, i) => Object.assign(q, { rung: i })); }
/** The board this month: {ladder: top first, you placed above the villagers you have beaten; friends: their best this month}. */
function gardenSkimBoard() {
  const L = _gtskLadder(), me = _gtskMine(), ladder = [];
  for (let i = L.length - 1; i >= 0; i--) { if (i === me.r - 1 || (me.r === 0 && i === -1)) ladder.push({ who: 'me', name: 'You', score: me.b, me: true }); ladder.push(L[i]); }
  if (me.r === 0) ladder.push({ who: 'me', name: 'You', score: me.b, me: true });
  if (me.r >= L.length) { const k = ladder.findIndex(q => q.me); if (k > 0) { const [you] = ladder.splice(k, 1); ladder.unshift(you); } }
  const mo = _gtskMonth(), friends = [];
  for (const f of gardenShoreFriends()) { const sk = f.ti && f.ti.sk; if (Array.isArray(sk) && sk[0] === mo && sk[1] > 0) friends.push({ who: 'f:' + f.id, name: f.name, score: sk[1], friend: true }); }
  friends.sort((a, b) => b.score - a.score);
  return { ladder, friends };
}
/** Your place this month: {r: villagers climbed past (0 to 6), b: your best throw}. */
function _gtskMine() { const v = _gdG().wd['tsk.' + _gtskMonth()]; return v && typeof v === 'object' ? { r: v.r | 0, b: v.b | 0 } : { r: 0, b: 0 }; }
function _gtskLeft() { return Math.max(0, GT_SKIM.day - (Number(_gdG().wd['tskd.' + _gdToday()]) || 0)); }
/** The villager one place above you now, or null when you are top. */
function _gtskAbove() { return _gtskLadder()[_gtskMine().r] || null; }

/* ---------- at the water's edge ---------- */
gardenShoreWaterOn((w) => {
  const left = _gtskLeft(); if (!left) return [];
  return [{ key: 'water-league', act: 'skim', tide: { kind: 'league' }, words: `A league throw (${left} left today)`, name: 'the skimming league', x: w.x, y: w.y, stand: null, deg: w.deg, src: 'water-league' }];
});
GT_RUN.league = (spot) => { _gtskGauge(spot); return true; };
/** The throw: a marker runs along the bar; press as it crosses the middle. */
function _gtskGauge(spot) {
  _gtskGaugeEnd();
  const box = typeof _gw !== 'undefined' && _gw.box; if (!box) return;
  const slate = (() => { try { return (gardenWallet().items || {})['sh:slate'] > 0; } catch (e) { return false; } })();
  const el = document.createElement('div'); el.className = 'gtsk-gauge'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'League throw');
  el.innerHTML = `<p class="gtsk-t">League throw${slate ? ' <small>with a thin slate</small>' : ''}</p><div class="gtsk-bar" aria-hidden="true"><i class="gtsk-zone"></i><i class="gtsk-gold"></i><i class="gtsk-mark"></i></div><p class="gtsk-h"><kbd>E</kbd> or <kbd>Space</kbd> as it crosses the middle. <kbd>Esc</kbd> to stop.</p>`;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'gtsk-go'; b.textContent = 'Throw!'; el.appendChild(b);
  box.appendChild(el); box.classList.add('gt-quick-on'); _gtsk.el = el;
  const mark = el.querySelector('.gtsk-mark'), t0 = performance.now(), motion = typeof gardenMotionOn !== 'function' || gardenMotionOn(), sweep = GT_SKIM.sweepMs * (motion ? 1 : 1.8);
  let pos = 0;
  const place = () => { const s = typeof _ghProject === 'function' ? _ghProject(_gw.px, _gw.py - 2.6) : null; if (s) el.style.transform = `translate(${Math.round(s.x)}px, ${Math.round(s.y)}px) translate(-50%, -100%)`; };
  const step = () => { if (_gtsk.el !== el) return; const u = ((performance.now() - t0) / sweep) % 2; pos = u < 1 ? u : 2 - u; mark.style.left = (pos * 100).toFixed(1) + '%'; place(); _gtsk.raf = requestAnimationFrame(step); };
  step();
  const go = (ev) => {
    if (ev && ev.type === 'keydown') { if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); _gtskGaugeEnd(); return; } if (!(ev.key === 'e' || ev.key === 'E' || ev.key === ' ')) return; }
    if (ev) { ev.preventDefault(); ev.stopPropagation(); }
    const d = Math.abs(pos - .5); _gtskGaugeEnd(); _gtskThrow(spot, d, slate);
  };
  b.addEventListener('click', go); el.addEventListener('pointerdown', (ev) => ev.stopPropagation());
  document.addEventListener('keydown', go, true);
  _gtsk.off = () => document.removeEventListener('keydown', go, true);
  _gtsk.at = { x: _gw.px, y: _gw.py };
}
function _gtskGaugeEnd() { if (_gtsk.raf) cancelAnimationFrame(_gtsk.raf); _gtsk.raf = 0; if (_gtsk.off) _gtsk.off(); _gtsk.off = null; if (_gtsk.el) { if (_gtsk.el.parentNode) _gtsk.el.parentNode.classList.remove('gt-quick-on'); _gtsk.el.remove(); } _gtsk.el = null; }
/** How the throw went (d: how far from the middle, 0 to 0.5): the skips, the style, the score. */
function gardenSkimThrowScore(d, slate, rnd) {
  const inZone = d <= GT_SKIM.zone / 2, gold = d <= GT_SKIM.gold / 2, q = inZone ? 1 - d / (GT_SKIM.zone / 2) : 0;
  let skips = inZone ? 2 + Math.round(q * 7) : 1 + (rnd() < .5 ? 1 : 0);
  if (slate) skips += 2;
  if (inZone && rnd() < .3) skips += rnd() < .5 ? 1 : -1;
  skips = Math.max(1, Math.min(14, skips));
  const style = gold ? 6 : 0;
  return { skips, style, score: skips * 10 + style, gold, inZone };
}
function _gtskThrow(spot, d, slate) {
  const W = _gdG().wd, today = _gdToday(); if (!_gtskLeft()) return;
  W['tskd.' + today] = (Number(W['tskd.' + today]) || 0) + 1;
  for (const k of Object.keys(W)) if (k.startsWith('tskd.') && k !== 'tskd.' + today) delete W[k];
  if (slate) _gdLed('tf', { i: { 'sh:slate': -1 }, n: 1 });
  _wdSave();
  const res = gardenSkimThrowScore(d, slate, gardenRand(gardenHash('tide-skimr|' + today + '|' + W['tskd.' + today] + '|' + Math.round(d * 1000))));
  const pseudo = { key: 'water:skim', act: 'skim', name: 'still water', x: spot.x, y: spot.y, stand: null, deg: spot.deg, src: 'water', skips: res.skips, onSkips: () => _gtskResult(res) };
  if (typeof gartActRun !== 'function' || !gartActRun('skim', pseudo)) _gtskResult(res);
}
/** The board after a throw: your best, a rung climbed, the champion stone. */
function _gtskResult(res) {
  const W = _gdG().wd, mo = _gtskMonth(), me = _gtskMine(), above = _gtskAbove(), lines = [`${res.skips} skip${res.skips === 1 ? '' : 's'}${res.gold ? ', and it curved beautifully' : ''}: ${res.score} points.`];
  const best = Math.max(me.b, res.score); let r = me.r, gift = null, beat = null;
  if (above && res.score > above.score) {
    r = me.r + 1; beat = above.who;
    gift = { c: 5 + 3 * r, x: 2, i: {} };
    if (r === GT_SKIM_FOLK.length) { gift.c += 25; if (!_gdG().led['tsk.stone']) { gift.i['decor:' + GT_SKIM.stone] = 1; gardenShoreGive('tsk.stone', { x: 2 }); } }
    gardenShoreGive('tsk.' + mo + '.' + r, gift);
    lines.push(`You beat ${gardenShoreFolkName(above.who)}’s ${above.score}. ${GT_SKIM_BEAT[above.who] || ''} ${gift ? '(' + gardenShoreGiftWords(gift).replace(/^./, c => c.toUpperCase()) + '.)' : ''}`.trim());
  } else if (above) lines.push(`${gardenShoreFolkName(above.who)} is one place above you, with ${above.score}.`);
  else lines.push('You are top of the league this month.');
  W['tsk.' + mo] = { r, b: best }; _wdSave();
  if (res.score > me.b) gardenShoreGive('tsk.best.' + mo + '.' + res.score, { x: 1 });
  gardenShoreSay(lines.join(' '), beat === 'pip' ? 'trophy' : 'waves', 8000);
  setTimeout(() => { try { gardenToast(_gtskLeft() ? `${_gtskLeft()} league throw${_gtskLeft() === 1 ? '' : 's'} left today.` : 'That was your last league throw today.', { icon: 'waves', timeout: 4500, action: { label: 'See the board', run: () => gardenSkimBoardOpen() } }); } catch (e) { /* fine */ } }, 1200);
  gardenShoreEmit('skim', { skips: res.skips, score: res.score, curve: res.gold, climbed: !!beat, champ: beat === 'pip' });
}
/** For the snapshot (ti.sk): this month's best league throw. */
GT_WIRE.push((out) => { const me = _gtskMine(); if (me.b > 0) out.sk = [_gtskMonth(), Math.min(999, me.b)]; });

/* ---------- the chalk board ---------- */
function gardenSkimBoardOpen() {
  if (typeof gpStage !== 'function') return;
  gpStage('The skimming league', (el) => {
    el.classList.add('gtsk-panel');
    const mo = new Date(Date.UTC(2026, _gtskMonth(), 1)).toLocaleString(undefined, { month: 'long', timeZone: 'UTC' });   // clock-ok: the month's name
    el.appendChild(gpEl('p', 'muted', `Three league throws a day at any still water. Beat whoever is one place above you to climb. Thin slate from rocky shores skips furthest.`));
    const board = gpEl('div', 'gtsk-board'); board.setAttribute('role', 'table'); board.setAttribute('aria-label', mo + ' skimming league');
    board.appendChild(gpEl('div', 'gtsk-title', mo + '’s league'));
    const B = gardenSkimBoard(), row = (q, n) => { const r = gpEl('div', 'gtsk-row' + (q.me ? ' is-me' : '') + (q.friend ? ' is-friend' : '')); r.setAttribute('role', 'row'); r.append(gpEl('span', 'gtsk-n', n), gpEl('span', 'gtsk-name', q.name + (q.who === 'pip' ? ' (champion)' : '')), gpEl('span', 'gtsk-s', q.me && !q.score ? '–' : String(q.score))); return r; };
    B.ladder.forEach((q, i) => board.appendChild(row(q, String(i + 1))));
    if (B.friends.length) { board.appendChild(gpEl('div', 'gtsk-sub', 'Friends this month')); for (const q of B.friends.slice(0, 8)) board.appendChild(row(q, '·')); }
    el.appendChild(board);
    const me = _gtskMine(), above = _gtskAbove(), left = _gtskLeft();
    el.appendChild(gpEl('p', 'gtsk-foot', (above ? `Next to beat: ${gardenShoreFolkName(above.who)}, with ${above.score}.` : 'You are champion this month. Pip says he wants a rematch.') + ` ${left ? left + ' throw' + (left === 1 ? '' : 's') + ' left today.' : 'No throws left today: tomorrow.'}${me.b ? ' Your best: ' + me.b + '.' : ''}`));
  });
}
if (typeof gardenPlayAdd === 'function') gardenPlayAdd({ id: 'tide-skim', name: 'The skimming league', icon: 'waves', group: 'games', blurb: 'Three league throws a day at any still water. Climb the board past the villagers to Pip, the champion.', status: () => { try { const a = _gtskAbove(), l = _gtskLeft(); return a ? `Next: ${gardenShoreFolkName(a.who)} · ${l} left today` : 'Champion this month'; } catch (e) { return ''; } }, open: () => gardenSkimBoardOpen() });
