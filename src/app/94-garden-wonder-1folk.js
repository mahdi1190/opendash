/* ============================================================
   GARDEN WONDER, the callers (docs/dev/HUNDRED_WORLD.md, rows 1 to 3).
   One row per character (WD_FOLK), and their words (WD_LINES): each line has a test on what has really happened, and is said once.
   At most one caller a day, one at a time. They stand in the world until you walk up: nothing interrupts. Goodbye, or eight minutes, and they go.

   Saved: fv.<id> (the day they last called), fn.<id> (how many times you have spoken), fs.<id>.<line> (said), fd ({d, id, done}: today's), fg.<id>.<n> ({i, d, name}: what you gave them).
   ============================================================ */
function _wdFolkArt(r, o) {
  const A = GART, f = r.fur, c = r.coat, k = r.kind;
  let s = A.P('#000000', A.ell(0, 0.5, 11, 3), 0.18);
  if (k === 'owl') {
    s += A.P(A.dk(f, 0.25), 'M-11 -5C-14 -20 -9 -34 0 -34C9 -34 14 -20 11 -5C5 -1 -5 -1 -11 -5z') + A.P(c, 'M-7 -5C-9 -14 -7 -24 0 -24C7 -24 9 -14 7 -5C3 -3 -3 -3 -7 -5z');
    s += A.P(f, A.ell(0, -37, 12, 10)) + A.P('#f2e8d4', A.circ(-5, -38, 5.2) + A.circ(5, -38, 5.2)) + A.P('#1c1512', A.circ(-4.6, -38, 2.2) + A.circ(5.4, -38, 2.2)) + A.P('#e0a83a', 'M-1.6 -35L1.6 -35L0 -31z');
    s += A.P(A.dk(f, 0.2), 'M-11 -44L-9 -50L-5 -46zM11 -44L9 -50L5 -46z') + A.P('#d8cdb4', 'M-6 -3L-3 -6L0 -3L3 -6L6 -3z');
    return `<g class="wd-flip">${s}</g>`;
  }
  s += A.P(A.dk(c, 0.35), A.rrect(-7, -5, 5, 6, 1.6) + A.rrect(2, -5, 5, 6, 1.6));
  s += A.P(c, 'M-10 -3C-12 -15 -9 -27 0 -27C9 -27 12 -15 10 -3C5 0 -5 0 -10 -3z') + A.P(A.dk(c, 0.18), 'M0 -27L2 -3L0 -2L-2 -3z');
  s += A.P(f, A.rrect(9, -23, 4, 11, 2));   // an arm that holds something
  if (r.spines) s += A.P(A.dk(f, 0.4), 'M-12 -30L-15 -36L-10 -36L-12 -42L-6 -40L-6 -46L-1 -42L2 -46L4 -41L9 -43L8 -37C4 -30 -6 -24 -12 -30z');
  const hx = 1, hy = -34;
  if (k === 'mole') s += A.P(f, A.ell(hx, hy, 10, 8.5));
  else s += A.P(f, A.ell(hx, hy, 9, 8)) + A.P(r.ear || f, A.circ(hx - 7, hy - 7, 3) + A.circ(hx + 5, hy - 8, 3));
  if (r.stripe) s += A.P('#f2f0ea', 'M-1 -42C-2 -36 2 -31 8 -30C9 -33 6 -40 3 -42z') + A.P('#26211f', 'M3 -42C6 -38 8 -34 9 -31L11 -33C10 -37 7 -41 5 -42z');
  s += A.P(r.snout || f, A.ell(hx + 7.5, hy + 2, 4.2, 3.2)) + A.P('#26211f', A.circ(hx + 11, hy + 1, 1.5));
  s += A.P('#1c1512', A.circ(hx + 3.5, hy - 1.5, k === 'mole' ? 0.7 : 1.15));
  if (r.spec) s += A.S('#d8c88a', 0.7, `M${hx + 1} ${hy - 2}a3 3 0 1 0 6 0a3 3 0 1 0 -6 0`);
  if (r.hat === 'cap') s += A.P(r.hatc, 'M-8 -40C-7 -46 7 -47 9 -40z') + A.P(A.dk(r.hatc, 0.25), A.rrect(-8, -41, 21, 2, 1));
  if (r.hat === 'wide') s += A.P(r.hatc, 'M-5 -41C-5 -48 7 -48 7 -41z') + A.P(A.dk(r.hatc, 0.2), A.ell(1, -41, 13, 2.4));
  if (r.hat === 'scarf') s += A.P(r.hatc, A.rrect(-8, -28, 17, 3.4, 1.6) + A.rect(-7, -26, 3.4, 8));
  if (r.prop === 'roll') s += A.P('#efe4c8', A.rrect(10, -18, 5, 13, 1.6)) + A.S('#b09a6a', 0.6, 'M10 -12h5');
  if (r.prop === 'spade') s += A.S('#7a5a38', 1.4, 'M12 -14L12 -2') + A.P('#8e9aa0', 'M9.4 -2h5.2l-1 5h-3.2z');
  if (r.prop === 'bag') s += A.P('#b08a5a', A.rrect(-14, -18, 8, 9, 2)) + A.S('#7a5a38', 0.9, 'M-12 -18L0 -26');
  void o;
  return `<g class="wd-flip">${s}</g>`;
}
const WD_FOLK = Object.freeze([
  { id: 'tam', name: 'Tam', kind: 'mole', fur: '#54484a', coat: '#6e8a4e', snout: '#d9a8a0', hat: 'cap', hatc: '#8a6a44', prop: 'spade', spec: 1, chance: 55, gap: 3, likes: 'crop',
    when: (m) => !!(m.rain.now || (m.rain.last && m.now - m.rain.last < 12 * 3600000)) || ['dawn', 'dusk'].includes(m.tod),
    thanks: (n) => [`That ${n} you gave me. I meant to eat it. I put it down in a side tunnel to keep it safe and forgot which one, and now something is growing through my ceiling.`, 'I have decided to call it a feature. Here is something for your trouble.'], back: 'fertiliser' },
  { id: 'bramble', name: 'Bramble', kind: 'badger', fur: '#8c8a86', coat: '#7a4a3a', stripe: 1, snout: '#f2f0ea', hat: 'wide', hatc: '#5a4a34', prop: 'roll', chance: 50, gap: 4, likes: 'fish',
    when: (m) => ['day', 'dusk'].includes(m.tod) && !m.rain.now,
    thanks: (n) => [`I had the ${n} you gave me for supper and drew it first. It is the best thing I have drawn this year, and I have drawn the whole of the north bank.`, 'I am sending you what was in my pocket. I don’t know what it is, either.'], back: 'seed' },
  { id: 'pip', name: 'Pip', kind: 'otter', fur: '#7a5636', coat: '#3f7fa8', snout: '#d8c4a0', hat: 'scarf', hatc: '#d8503a', prop: 'bag', chance: 45, gap: 5, likes: 'fish',
    when: (m) => ['dawn', 'day'].includes(m.tod),
    thanks: (n) => [`I took the ${n} you gave me all the way up the river. Then I got hungry. It was a very good ${n}, and it saw a lot of the world first.`, 'Here. It came from a long way off.'], back: 'seed' },
  { id: 'thistle', name: 'Mother Thistle', kind: 'hedgehog', fur: '#b08a68', coat: '#a85a6a', spines: 1, snout: '#e8d4bc', chance: 50, gap: 3, likes: 'crop',
    when: (m) => ['dusk', 'night'].includes(m.tod) && m.season !== 'winter',
    thanks: (n) => [`I made soup with the ${n} you gave me, and I gave some to the frogs, who said nothing, as usual. They had seconds.`, 'I saved you a little something from the bottom of the bag.'], back: 'fertiliser' },
  { id: 'wick', name: 'Wick', kind: 'owl', fur: '#8a6a44', coat: '#e4d4b8', chance: 60, gap: 2, likes: 'bug',
    when: (m) => m.tod === 'night' && !m.rain.now,
    thanks: (n) => [`The ${n}. Thank you. I was going to pretend I had caught it myself, but the others have stopped believing me.`, 'I found this while I was looking at something else. I am always looking at something else.'], back: 'seed' },
]);
const WD_FOLK_ROW = new Map(WD_FOLK.map(r => [r.id, r]));
/* ---------- what has really happened ---------- */
function _wdAgeWords(days) {
  if (days < 2) return 'a day old';
  if (days < 7) return `${days} days old`;
  if (days < 30) { const w = Math.round(days / 7); return w === 1 ? 'a week old' : `${w} weeks old`; }
  if (days < 365) { const mo = Math.round(days / 30); return mo === 1 ? 'a month old' : `${mo} months old`; }
  const y = Math.floor(days / 365); return y === 1 ? 'over a year old' : `over ${y} years old`;
}
function wdFacts(m, id) {
  const g = _gdG(), last = id ? _wdGet('fv.' + id) || '' : '', lastMs = last ? _gdDayMs(last, 24 * 60) : 0;
  const F = { m, id, level: m.level.level, season: m.season, tod: m.tod, rain: !!m.rain.now, snow: !!m.rain.snow, blooms: m.blooms, thirsty: m.thirsty, ripe: m.ripe, last, met: !!last };
  F.since = last ? _wdDaysBetween(last, m.today) : 0;
  F.talks = Number(_wdGet('fn.' + id)) || 0;
  let old = null;
  for (const p of m.plants) if (p.planted && (!old || p.planted < old.planted)) old = p;
  if (old) { F.oldest = old.def.name; F.oldestDays = Math.floor((m.now - old.planted) / 86400000); F.oldestAge = _wdAgeWords(F.oldestDays); }
  if (last) {
    const nw = m.plants.filter(p => p.planted > lastMs).sort((a, b) => b.planted - a.planted);
    if (nw.length) { F.newPlant = nw[0].def.name; F.newN = nw.length; }
    const mv = m.decor.filter(d => d.at > lastMs).sort((a, b) => b.at - a.at);
    if (mv.length) F.moved = mv[0].def.name;
  }
  let best = null, nFish = 0;
  for (const [fid, e] of Object.entries(g.fl || {})) { nFish += Number(e && e.n) || 0; if (e && (!best || e.b > best.b)) best = { id: fid, b: e.b }; }
  F.fishN = nFish;
  if (best && typeof GARDEN_FISH !== 'undefined') { const d = GARDEN_FISH.find(x => x.id === best.id); if (d) { F.fish = d.name; F.fishCm = best.b; } }
  F.bugs = Object.keys(g.bl || {}).length;
  F.away = Number(_wdGet('away')) || 0;   // how long you had been gone when you last came back (94-garden-wonder-a-weather.js)
  F.stars = Object.keys(_wdG()).filter(k => k.startsWith('sk.')).length;
  F.finds = Object.keys(_wdG()).filter(k => k.startsWith('ff.')).length;
  F.isle = !!_wdGet('isle');
  F.pet = false; try { const p = typeof petGet === 'function' ? petGet() : null; F.pet = !!(p && p.name); F.petName = p && p.name ? String(p.name) : ''; } catch (e) { /* no pet */ }
  const d = typeof gardenSocialView === 'function' ? gardenSocialView() : null;
  if (d && Array.isArray(d.inbox)) { const v = d.inbox.find(a => a.dir === 'in' && a.t === 'visit' && (!last || a.d >= last)); if (v) F.friend = typeof _gscFirst === 'function' ? _gscFirst(v.f) : ''; }
  return F;
}
/* ---------- their words. `if` says when; the first two new ones are said, in this order; `again` may be said twice ---------- */
const WD_LINES = Object.freeze({
  tam: [
    { k: 'hello', t: 'Tam. Mole. I live under your lawn, so I thought I should come up and say so. It seemed only polite.' },
    { k: 'away', if: F => F.away >= 7, t: 'Thought you might have moved. Didn’t like to ask. Your roots kept on without you, you know. They don’t mind.' },
    { k: 'new', if: F => F.newPlant, t: F => `Something new went in since I was last up. ${F.newPlant}. I felt the roots come down through my ceiling. Good roots.` },
    { k: 'moved', if: F => F.moved, t: F => `You moved the ${F.moved.toLowerCase()}. I know because it is not on my roof any more.` },
    { k: 'old', if: F => F.oldestDays >= 30, t: F => `Your ${F.oldest.toLowerCase()} is ${F.oldestAge} now. It looks a lot bigger from underneath.` },
    { k: 'oldyear', if: F => F.oldestDays >= 365, t: F => `A year and more, that ${F.oldest.toLowerCase()}. There is not much that stays anywhere that long. I would know. I have dug under most of it.` },
    { k: 'thirst', if: F => F.thirsty >= 3, t: 'Your plants are asking about water. I wouldn’t say anything, only they are quite loud down there.' },
    { k: 'lake1', if: F => F.talks >= 2, t: 'I have been digging towards the lake since spring. No reason. You have to have something.' },
    { k: 'lake2', if: F => F.talks >= 4, t: 'Reached the lake. Bit wet. Going back.' },
    { k: 'island', if: F => F.isle, t: 'You went out to the island. I felt you stop being overhead. I don’t go there. It is mostly water, getting there.' },
    { k: 'rain', again: 1, if: F => F.rain, t: 'Nice drop of rain. Brings everything up. Worms, mostly. And me.' },
    { k: 'plain', again: 1, t: 'Ground’s all right. Thought you’d want to know.' },
  ],
  bramble: [
    { k: 'hello', t: 'Bramble. I draw maps. Nobody has ever drawn this place properly, and I have been meaning to since before you came. Hold still. No, you can move, you’re not on it.' },
    { k: 'land', if: F => F.level >= 6, t: 'You have more ground than you had. That means starting again. I don’t mind. It is always the same corner that is wrong.' },
    { k: 'friend', if: F => F.friend, t: F => `Someone came through while you were out. ${F.friend}, I think. They stood about and looked at things. I put them on the map, lightly, in pencil.` },
    { k: 'finds', if: F => F.finds >= 2, t: F => `That is ${F.finds} things you have dug up now. You have started to walk like someone who looks down.` },
    { k: 'island', if: F => F.isle, t: 'You got over to the island, then. I have it down as “mostly willow”. Is that fair? Don’t tell me. I would have to rub it out.' },
    { k: 'moved', if: F => F.moved, t: F => `The ${F.moved.toLowerCase()} is not where I drew it. I am going to leave it on the map and let you be the one who is wrong.` },
    { k: 'plain', again: 1, t: 'I’ll be going on. There’s a bit round the back of the woods I have only ever guessed at.' },
  ],
  pip: [
    { k: 'hello', t: 'Oh! Hello! I’m Pip. I go everywhere. I came back because I forgot my hat. Have you seen a hat? It’s fine. I never had one.' },
    { k: 'fish', if: F => F.fish, t: F => `Is that right, you had a ${F.fish.toLowerCase()} at ${F.fishCm} centimetres? I would say that was a fib, only I’ve read your book. I hope you don’t mind. It was open.` },
    { k: 'fishmany', if: F => F.fishN >= 25, t: F => `${F.fishN} fish! They have started talking about you down at the weir. Not in a good way, but they do talk.` },
    { k: 'river', if: F => F.talks >= 1, t: 'I went up the river. It goes on. Nobody tells you that. You think it’s going to stop and it just goes on.' },
    { k: 'pet', if: F => F.pet, t: F => `I met ${F.petName} on the way in. We had a long talk. Well. I talked.` },
    { k: 'home', if: F => F.talks >= 3, t: 'I think of this place when I am a long way off, you know. The lake from the pier. I couldn’t tell you why. There are bigger lakes.' },
    { k: 'plain', again: 1, t: 'I can’t stay. I never can. I’ll send you a card!' },
  ],
  thistle: [
    { k: 'hello', t: 'Mother Thistle, dear, everyone calls me that and I have stopped asking why. I come through at this hour for the slugs. Don’t get up.' },
    { k: 'away', if: F => F.away >= 3, t: 'There you are. I kept an eye on the place. Nothing happened, and I want you to know I watched it not happen.' },
    { k: 'friend', if: F => F.friend, t: F => `That ${F.friend} came by while you were out. Stood by the water for a bit. Nice manners. I would have said hello, but I was under something.` },
    { k: 'pet', if: F => F.pet, t: F => `Your ${F.petName} tried to eat me on Tuesday. I am not cross. I would only like it known.` },
    { k: 'blooms', if: F => F.blooms >= 5, t: 'It smells lovely here of an evening, with all that out. You won’t have noticed. You never do, the ones who planted it.' },
    { k: 'ripe', if: F => F.ripe >= 3, t: 'You have things ready to pick, dear. I am only saying. I have not touched them. I have looked.' },
    { k: 'winter', if: F => F.season === 'autumn', t: 'I shall be off soon, for the winter, under the leaves. You don’t need to do anything. Leave a pile, if you think of it.' },
    { k: 'plain', again: 1, t: 'Well. These slugs won’t eat themselves.' },
  ],
  wick: [
    { k: 'hello', t: 'Wick. I am up here most nights. You have been looking at the ground a lot. I don’t say that to be rude. It’s just that there is more of it up there.' },
    { k: 'first', if: F => F.stars >= 1, t: F => `You know ${_wdPlural(F.stars, 'pattern')} now. Most people only know the one with the bench in it, and they think it is a saucepan.` },
    { k: 'moon', if: F => wdMoon(_wdToday()).full, t: 'It is full tonight, or as good as. Go down to the shore and look at the water. No, go on. I’ll wait.' },
    { k: 'moon2', if: F => !wdMoon(_wdToday()).full && F.talks >= 1, t: () => `The moon will be full in ${_wdPlural(wdMoon(_wdToday()).toFull, 'night')}. People should know that sort of thing. They used to.` },
    { k: 'many', if: F => F.stars >= 6, t: 'You are getting good at this. I am not used to it. I shall need to think of something else to be mysterious about.' },
    { k: 'plain', again: 1, t: 'Look up. It’s free.' },
  ],
});
function _wdLinesFor(row, F) {
  const said = (k) => !!_wdGet(`fs.${row.id}.${k}`), list = WD_LINES[row.id] || [], ok = (l) => { try { return !l.if || !!l.if(F); } catch (e) { return false; } };
  const fresh = list.filter(l => !l.again && !said(l.k) && ok(l));
  const hello = fresh[0] && fresh[0].k === 'hello';
  const pick = fresh.slice(0, hello ? 1 : 2);
  if (!pick.length) { const st = list.filter(l => l.again && ok(l)); if (st[0]) pick.push(st[0]); }
  const out = [], W = _wdG();
  for (const l of pick) { out.push(typeof l.t === 'function' ? l.t(F) : l.t); if (!l.again) W[`fs.${row.id}.${l.k}`] = _wdToday(); }
  return out;
}
/* ---------- today's caller ---------- */
const _wdf = { S: null, row: null };
function _wdFolkPick(m) {
  const today = m.today, fd = _wdGet('fd');
  if (fd && fd.d === today) { if (fd.done) return null; const r = WD_FOLK_ROW.get(fd.id); return r && r.when(m) ? r : null; }
  const ever = WD_FOLK.some(r => _wdGet('fv.' + r.id));
  const rows = WD_FOLK.filter(r => { const l = _wdGet('fv.' + r.id); return r.when(m) && (!l || _wdDaysBetween(l, today) >= r.gap); }).sort((a, b) => gardenHash(today + a.id) - gardenHash(today + b.id));
  for (const r of rows) if (!ever || gardenHash('wd-folk|' + today + '|' + r.id) % 100 < r.chance) { _wdSet('fd', { d: today, id: r.id }); return r; }
  return null;
}
function _wdFolkSpawn(row) {
  const v = _glCamView(), want = { x: Math.max(1, Math.min(GARDEN_WORLD.cols - 1, _gw.px + (Math.random() < 0.5 ? -2.4 : 2.4))), y: _gw.py + (Math.random() < 0.5 ? 1.2 : -1.2) };
  const to = wdFreeNear(want.x, want.y, 3); if (!to) return;
  const side = _gw.px - v.x0 > v.x1 - _gw.px ? v.x0 - 1 : v.x1 + 1;
  let from = wdFreeNear(Math.max(0.5, Math.min(GARDEN_WORLD.cols - 0.5, side)), to.y, 5) || to;
  let route = null;
  try { route = _gwRoute(from, to); } catch (e) { route = null; }
  if (!route) { from = to; route = []; }
  const spec = {
    id: 'wd-' + row.id, x: from.x, y: from.y, hit: 0.75, hitUp: 16, label: row.name, cursor: 'hand', t: 0, path: route.slice(), face: 1, row, gone: false,
    svg: _wdFolkMarkup(row, true),
    update(dt, S) {
      S.t += dt;
      const here = S.path.length && !S.hold;
      if (here) {
        const G = GARDEN_WORLD, p = S.path[0], dx = (p.x - S.x) * G.cellW, dy = (p.y - S.y) * G.cellH, d = Math.hypot(dx, dy), st = 58 * dt;
        if (d <= st) { S.x = p.x; S.y = p.y; S.path.shift(); } else { S.x += dx / d * st / G.cellW; S.y += dy / d * st / G.cellH; S.face = dx > 0 ? 1 : dx < 0 ? -1 : S.face; }
        S.lift = Math.abs(Math.sin(S.t * 8)) * 1.6;
      } else {
        S.lift = 0;
        if (S.hold && _gw) S.face = _gw.px > S.x ? 1 : -1;
        if (S.gone && !S.path.length) { S.remove(); if (_wdf.S === S) _wdf.S = null; return; }
      }
      const fl = S.node && S.node.querySelector('.wd-flip');
      if (fl && S.fk !== S.face + '' + S.node.childElementCount) { S.fk = S.face + '' + S.node.childElementCount; fl.setAttribute('transform', `scale(${S.face} 1)`); }
      if (!S.gone && !S.hold && S.t > 480) _wdFolkLeave(S);
      else if (!S.gone && !S.hold && S.t > 8 && Math.floor(S.t) !== S.chk) { S.chk = Math.floor(S.t); if (!S.row.when(gardenHere())) _wdFolkLeave(S); }
    },
    onAim(S) { S.hold = true; },
    onClick: (S) => _wdFolkTalk(S),
  };
  _wdf.S = wdSprite(spec); _wdf.row = row; _wdf.S.home = from;
}
function _wdFolkMarkup(row, mark) { return _wdFolkArt(row) + (mark ? '<g class="wd-mark" transform="translate(0 -56)"><rect x="-9" y="-6" width="18" height="11" rx="5.5" fill="#fffdf4" stroke="#6a5a44" stroke-width="0.6"/><circle cx="-4" cy="-0.5" r="1.1" fill="#6a5a44"/><circle cy="-0.5" r="1.1" fill="#6a5a44"/><circle cx="4" cy="-0.5" r="1.1" fill="#6a5a44"/></g>' : ''); }
function _wdFolkLeave(S) {
  if (S.gone) return;
  S.gone = true; S.hold = false; S.hit = 0;
  const fd = _wdGet('fd'); if (fd && fd.id === S.row.id) _wdSet('fd', Object.assign({}, fd, { done: 1 }));
  let r = null; try { r = _gwRoute({ x: S.x, y: S.y }, S.home); } catch (e) { r = null; }
  S.path = r || [];
}
function _wdFolkTalk(S) {
  const row = S.row, m = gardenModel(), F = wdFacts(m, row.id), W = _wdG();
  const lines = _wdLinesFor(row, F), acts = [];
  W['fn.' + row.id] = F.talks + 1; W['fv.' + row.id] = m.today;
  wdArt(S, _wdFolkMarkup(row, false));
  const extra = typeof wdFolkExtra === 'function' ? wdFolkExtra(row, F, S) : null;   // a map, an invitation to look up
  if (extra && extra.lines) lines.push(...extra.lines);
  if (extra && extra.actions) acts.push(...extra.actions);
  if (!S.gave) acts.push({ label: 'Give something', run: (T) => _wdFolkGive(S, T) });
  _wdSave();
  wdTalk({ name: row.name, art: _wdFolkArt(row), lines, actions: acts, at: { x: S.x, y: S.y }, onClose: () => _wdFolkLeave(S), closeQuiet: true });
}
/* ---------- give something: a letter comes later about what became of it (94-garden-wonder-2post.js) ---------- */
function _wdBagFor() {
  const w = gardenWallet(), out = [];
  for (const [item, n] of Object.entries(w.items || {})) {
    if (!(n >= 1)) continue;
    const c = item.indexOf(':'), k = item.slice(0, c), id = item.slice(c + 1);
    let name = '', art = '';
    try {
      if (k === 'crop') { const d = gardenPlant(id); if (!d) continue; name = d.name.replace(/ tree$/i, ''); art = gardenIconSvg(id, { kind: 'plant', stage: 4, px: 28 }); }
      else if (k === 'fish') { const d = GARDEN_FISH.find(x => id.startsWith(x.id + '-')); if (!d) continue; name = d.name; art = gardenCatchSvg('fish', d.id, 28, { uid: 'wdb' + d.id }); }
      else continue;
    } catch (e) { continue; }
    out.push({ item, name, art });
    if (out.length >= 8) break;
  }
  return out;
}
function _wdFolkGive(S, T) {
  const bag = _wdBagFor();
  if (!bag.length) { T.say('You have nothing to give just now: your basket is empty. Crops and fish do. It’s all right. I’ll be round again.', []); return; }
  T.say('Something from your basket? You needn’t.', []);
  const go = T.el.querySelector('.wd-talk-go');
  const row = document.createElement('div'); row.className = 'wd-give';
  for (const b of bag) {
    const x = document.createElement('button'); x.type = 'button'; x.className = 'wd-give-b'; x.title = b.name; x.setAttribute('aria-label', 'Give ' + b.name); x.innerHTML = b.art;
    x.onclick = () => {
      row.remove();
      const key = _gdLed('wd', { i: { [b.item]: -1 }, n: 1 }), r = S.row, W = _wdG(), n = Number(W['fgn.' + r.id] || 0) + 1, gk = `fg.${r.id}.${n}`;
      W['fgn.' + r.id] = n; W[gk] = { i: b.item, d: _wdToday(), name: b.name };
      S.gave = true; _gdSave();
      T.say(r.likes === b.item.slice(0, b.item.indexOf(':')) ? `A ${b.name.toLowerCase()}! Oh, you shouldn’t have. I mean that. I shall be thinking about this.` : `A ${b.name.toLowerCase()}. Well now. I shall find something to do with that.`, [{ label: 'Take it back', run: (T2) => { const G = _gdG(); delete G.led[key]; delete G.wd[gk]; G.wd['fgn.' + r.id] = n - 1; S.gave = false; _gdSave(); T2.say('Quite right. Keep it.', []); } }]);
    };
    row.appendChild(x);
  }
  go.parentNode.insertBefore(row, go);
}
wdMod({
  id: 'folk', pref: 'folk',
  begin() { _wdf.S = null; },
  tick(m) {
    if (_wdf.S || _wd.t < 22 || (_gw.fishing && _gw.fishing.state !== 'idle')) return;
    if (_wd.still) return;
    const r = _wdFolkPick(m); if (r) _wdFolkSpawn(r);
  },
  end() { _wdf.S = null; },
});
