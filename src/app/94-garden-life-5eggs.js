/* ============================================================
   GARDEN LIFE, the surprises (2.23). User request, 30 Oct 2026: "easter eggs, so many unique things that literally there is something cool every time we look".
   GARDEN_LIFE_EGGS is one row per surprise: a trigger and an effect, no engine code. docs/dev/GARDEN.md section 17 has the recipe.

     id, name, rarity     as in the creature rows; rarity also sets how often it is picked among what could happen now
     when                 {seasons, tod, weather (as creatures), from: 'MM-DD', to: 'MM-DD' (may wrap the new year), dow: 0-6, dom: 1-31, birthday: true, all: [selectors] (all of these stand in this garden), spot: {x, y, r} (you walked there)}
     always               every visit while `when` holds (date events), rather than a draw
     effect               {kind, ...}: a name in GARDEN_LIFE_EFFECTS: visitor (a creature row), thing (something placed), streak (a falling star), fireworks, whirl (leaves round you), rainbow, balloon
     hint, blurb, icon    for the Nature book (icon: a name in GL_THINGS, when the effect has no picture of its own)
   A thing: {art: name in GL_THINGS, n, where: 'near' | 'water' | 'spot' | 'sky', moves: 'unseen', click: {mark, sound, keep (a keepsake id), read: [lines]}, life (seconds)}.

   Restraint keeps it special: at most one surprise a visit, on about half of visits, never the same one twice running (GL_TUNE.eggs, 94-garden-life-3engine.js). The pick favours what you have not seen lately (a note per device, localStorage).
   Nothing is saved but the id once you have found it, so an unknown id from a newer version is harmless, and friends' gardens never run these.
   ============================================================ */
/* ---------- things' pictures: a function each, feet at 0,0 ---------- */
const GL_THINGS = {
  gnome() { const A = GART; return A.P('#000000', A.ell(0, 0.5, 8, 2), 0.16) + A.P('#3a64a0', 'M-6 -1C-6.4 -8 -5 -12 0 -12C5 -12 6.4 -8 6 -1C2 0 -2 0 -6 -1z') + A.P('#6a4a2a', A.rect(-6, -5, 12, 1.5)) + A.P('#f2f0ea', 'M-5 -11C-5.6 -7 -3 -3.4 0 -2.6C3 -3.4 5.6 -7 5 -11C2 -9.6 -2 -9.6 -5 -11z') + A.P('#eab89a', A.ell(0, -13.4, 4.2, 3.2)) + A.P('#d88a6e', A.circ(0, -12.4, 1.3)) + A.P('#1c1512', A.circ(-1.8, -14, 0.6) + A.circ(1.8, -14, 0.6)) + A.P('#c8362a', 'M-5.4 -14.6C-4 -20 -1 -27 2.4 -28C3.4 -22 4.4 -18 5.4 -14.6C2 -16.2 -2 -16.2 -5.4 -14.6z') + A.P('#ffffff', 'M-1.4 -21Q0.8 -24 2.6 -25Q1 -22.4 -0.4 -19.4z', 0.22); },
  bottle() { const A = GART; return `<g class="gl-bob">${A.P('#6ea88c', 'M-9 -4C-9 -7 -6 -8 -2 -8L4 -8.4L6 -9.6L10 -9.6L10 -6L6 -6L4 -4C0 -2.6 -9 -1.4 -9 -4z', 0.72)}${A.P('#b08a5a', A.rect(9.4, -10, 2.4, 4.4))}${A.P('#f2ead0', A.rect(-5.4, -7, 7, 3.6))}${A.P('#ffffff', 'M-7 -6.6Q-3 -7.6 2 -7.4Q-3 -6.8 -6.6 -5.4z', 0.5)}</g><ellipse class="gl-ring-soft" cx="0" cy="-2" rx="13" ry="3.4" fill="none" stroke="#ffffff" stroke-width="0.8"/>`; },
  'glade-ring': function () { const A = GART; let s = A.P('#7fbf5a', A.ell(0, 0, 40, 15), 0.28); const shroom = (x, y, k, c) => `<g transform="translate(${x} ${y}) scale(${k})">${A.P('#f2e8d4', A.rect(-1.6, -5, 3.2, 5))}${A.P(c, 'M-6 -4.4Q-6 -10.4 0 -10.4Q6 -10.4 6 -4.4z')}${A.P('#ffffff', A.circ(-2.4, -6.6, 1) + A.circ(2.2, -7.8, 0.9))}</g>`; for (let i = 0; i < 11; i++) { const a = i / 11 * 6.283; s += shroom(Math.round(Math.cos(a) * 36), Math.round(Math.sin(a) * 12), i % 3 ? 0.8 : 1.05, i % 2 ? '#c8453a' : '#e88a3a'); } return s; },
  pumpkin() { const A = GART, c = '#e6822a'; return A.P('#000000', A.ell(0, 0.5, 12, 2.6), 0.16) + A.P(A.dk(c, 0.2), A.ell(-6, -7, 6, 7) + A.ell(6, -7, 6, 7)) + A.P(c, A.ell(-2.6, -7.4, 5.6, 7.4) + A.ell(2.6, -7.4, 5.6, 7.4)) + A.S('#5a7a30', 2, 'M0 -14Q0.6 -17 3 -18') + A.P('#3a2410', 'M-6.2 -9.6L-3 -9.6L-4.6 -6.8zM6.2 -9.6L3 -9.6L4.6 -6.8zM-6 -4.6Q0 -1.4 6 -4.6Q4 -4 3 -5L1.6 -3.6L0 -5L-1.6 -3.6L-3 -5Q-4 -4 -6 -4.6z') + `<g class="gl-glow-soft">${A.P('#ffd24a', 'M-5.6 -9.2L-3.4 -9.2L-4.6 -7.4zM5.6 -9.2L3.4 -9.2L4.6 -7.4zM-5 -4.4Q0 -2 5 -4.4Q3.4 -3.8 3 -4.4L1.6 -3.2L0 -4.4L-1.6 -3.2L-3 -4.4Q-3.4 -3.8 -5 -4.4z')}</g>`; },
  snowman() { const A = GART, w = '#f6f8fb'; return A.P('#5a6a80', A.ell(0, 0.5, 14, 3), 0.22) + A.P(w, A.circ(0, -9, 10)) + A.P('#d9e2ec', 'M3 -1C8 -3 10 -8 9 -13C8 -7 5 -3 -2 -0.6z') + A.P(w, A.circ(0, -24, 7.4)) + A.P('#d9e2ec', 'M3 -18C6 -20 7.6 -24 6.6 -27C5.8 -23 4 -20 0 -17.6z') + A.P('#26211f', A.circ(-2.4, -26, 0.9) + A.circ(2.4, -26, 0.9) + A.circ(0, -13, 0.9) + A.circ(0, -8, 0.9)) + A.P('#ef8a2a', 'M0 -24.6L7 -23.4L0 -22.6z') + A.P('#c8362a', A.rrect(-7, -19, 14, 2.8, 1.2)) + A.P('#c8362a', A.rect(3, -18, 3.2, 8)) + A.P('#26211f', A.rect(-5, -37, 10, 7) + A.rrect(-7.4, -31, 14.8, 1.8, 0.8)) + A.S('#6a4a2a', 1.2, 'M-9 -15L-16 -21M-14 -19L-17 -18M9 -15L16 -20M14 -18.6L17 -18');
  },
  balloons() { const A = GART, b = (x, y, c) => A.S('#7a7a7a', 0.5, `M${x} ${y + 7}Q${x * 0.4} ${(y + 7) / 2} 0 -6`) + A.P(c, A.ell(x, y, 5, 6.4)) + A.P('#ffffff', A.ell(x - 1.8, y - 2.2, 1.2, 1.7), 0.5); return `<g class="gl-bob-slow">${b(-8, -36, '#e8506e') + b(2, -44, '#f2c43a') + b(10, -34, '#4a9ae0')}</g>` + A.P('#c8a070', A.rect(-5, -6, 10, 6)) + A.P('#f4ead8', A.rect(-5, -7.6, 10, 2)) + A.P('#e8506e', A.rect(-1, -7.6, 2, 7.6)); },
  'wish-star': function () { const A = GART; return `<g class="gl-twinkle">${A.P('#fff8c0', A.circ(0, 0, 13), 0.16)}${A.P('#fff1a8', A.star(0, 0, 4, 9, 1.8))}${A.P('#ffffff', A.circ(0, 0, 1.6))}</g>`; },
  clover() { const A = GART; return `<g class="gl-gift"><g class="gl-glint">${GL_MARKS.spark()}</g>${gardenKeepsakeSvg(GL_KEEPSAKE.get('clover'))}</g>`; void A; },
  'ico-rainbow': function () { const A = GART; return ['#e8504e', '#f2d44a', '#62b85a', '#4a8ae0'].map((c, i) => A.S(c, 2.4, `M${-16 + i * 2.6} 0A${16 - i * 2.6} ${16 - i * 2.6} 0 0 1 ${16 - i * 2.6} 0`)).join(''); },
  'ico-firework': function () { const A = GART; let d = ''; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; d += `M${(Math.cos(a) * 5).toFixed(1)} ${(Math.sin(a) * 5).toFixed(1)}L${(Math.cos(a) * 14).toFixed(1)} ${(Math.sin(a) * 14).toFixed(1)}`; } return A.S('#e8506e', 1.4, d) + A.P('#ffd94a', A.circ(0, 0, 3)); },
  'ico-leaves': function () { const A = GART; return A.P('#c8782a', 'M-8 -8Q-3 -13 2 -8Q-3 -3 -8 -8z') + A.P('#b84a2a', 'M2 -2Q7 -7 12 -2Q7 3 2 -2z') + A.P('#d8a83a', 'M-5 4Q0 -1 5 4Q0 9 -5 4z') + A.S('#8a6a44', 0.6, 'M-10 8Q0 12 12 6', 0.6); },
  'balloon-far': function () { const A = GART; return `<g class="gl-bob-slow">${A.P('#e8644a', 'M-16 -30C-16 -44 16 -44 16 -30C16 -22 6 -14 4 -10L-4 -10C-6 -14 -16 -22 -16 -30z')}${A.P('#f4d04a', 'M-6 -42C-8 -32 -5 -18 -2 -10L2 -10C5 -18 8 -32 6 -42C2 -43 -2 -43 -6 -42z')}${A.P('#7a4a2a', A.rect(-4, -5, 8, 5))}${A.S('#7a4a2a', 0.5, 'M-4 -10L-3.6 -5M4 -10L3.6 -5')}</g>`; },
};
const _GL_BOTTLE_NOTES = Object.freeze(['Whoever finds this: the fish by the pier are bigger than they look.', 'It is calm out here. Hope you are having a good day.', 'If you can read this, you are nearer the shore than I was.', 'Water your thirsty ones. They do notice.', 'Dear garden, I think of you often. Yours, a duck.', 'Nothing urgent. Just saying hello.']);

const GARDEN_LIFE_EGGS = Object.freeze([
  { id: 'shooting-star', name: 'A shooting star', rarity: 'uncommon', when: { tod: ['night'], weather: ['clear'] }, effect: { kind: 'streak', keep: 'wish-star' }, hint: 'Look up on a clear night. Be quick: click it to wish.', blurb: 'You wished. It is not telling you whether it worked.' },
  { id: 'wandering-gnome', name: 'The gnome that moves', rarity: 'uncommon', when: {}, effect: { kind: 'thing', art: 'gnome', where: 'near', moves: 'unseen', click: { mark: 'spark', sound: 'pop' } }, hint: 'He was not there a minute ago. Look away and look back.', blurb: 'You have never once seen him move. You are sure he has.' },
  { id: 'message-in-a-bottle', name: 'A message in a bottle', rarity: 'uncommon', when: { tod: ['dawn', 'day', 'dusk'] }, effect: { kind: 'thing', art: 'bottle', where: 'water', drift: true, click: { read: _GL_BOTTLE_NOTES, keep: 'bottle-note', sound: 'pop', gone: true } }, hint: 'Something is bobbing near the shore.', blurb: 'Someone, somewhere, had something to say.' },
  { id: 'hidden-glade', name: 'The hidden glade', rarity: 'rare', when: { spot: { x: 25.5, y: 12.5, r: 1.6 } }, effect: { kind: 'thing', art: 'glade-ring', where: 'spot', life: 90, cheer: true, click: { mark: 'spark', sound: 'twinkle', keep: 'toadstool-cap' } }, hint: 'Somewhere along the lane by the reeds, past the last building. Stand in the right spot.', blurb: 'A ring of toadstools that was not there when you got here.' },
  { id: 'halloween', name: 'Pumpkins and bats', rarity: 'rare', always: true, when: { from: '10-24', to: '11-02' }, effect: { kind: 'thing', art: 'pumpkin', n: 3, where: 'near', guests: { id: 'bat', n: 3, tod: ['dusk', 'night'] }, click: { mark: 'bang', sound: 'pop' } }, hint: 'The last week of October.', blurb: 'They were not carved by anyone you know.' },
  { id: 'winter-snowman', name: 'A snowman nobody built', rarity: 'rare', always: true, when: { from: '12-10', to: '02-10' }, effect: { kind: 'thing', art: 'snowman', where: 'near', click: { mark: 'heart' } }, hint: 'Deep winter. Who made it?', blurb: 'His nose is your carrot.' },
  { id: 'new-year-fireworks', name: 'New Year fireworks', rarity: 'epic', always: true, when: { from: '12-31', to: '01-01', tod: ['dusk', 'night'] }, icon: 'ico-firework', effect: { kind: 'fireworks', shots: 14 }, hint: 'See the year out in the garden.', blurb: 'Happy New Year. Your pet disapproves.' },
  { id: 'bonfire-night', name: 'Bonfire Night', rarity: 'rare', always: true, when: { from: '11-05', to: '11-05', tod: ['dusk', 'night'] }, icon: 'ico-firework', effect: { kind: 'fireworks', shots: 8 }, hint: 'Remember, remember.', blurb: 'From somewhere over the hedge.' },
  { id: 'birthday', name: 'Many happy returns', rarity: 'epic', always: true, when: { birthday: true }, effect: { kind: 'thing', art: 'balloons', where: 'near', cheer: true, click: { mark: 'heart', sound: 'twinkle' } }, hint: 'One day a year. It is yours.', blurb: 'The whole garden knew.' },
  { id: 'bench-pond-lamp', name: 'An evening guest', rarity: 'rare', when: { all: ['effect:sit', 'effect:light'], tod: ['dusk', 'night'] }, effect: { kind: 'visitor', id: 'otter' }, hint: 'A seat and a lamp, and somewhere to swim. Then an evening with nothing to do.', blurb: 'Word gets round about a nice garden.' },
  { id: 'friday-thirteenth', name: 'Friday the thirteenth', rarity: 'rare', always: true, when: { dow: 5, dom: 13 }, effect: { kind: 'visitor', id: 'black-cat' }, hint: 'Only on one kind of Friday.', blurb: 'It crossed your path, on purpose.' },
  { id: 'white-stag', name: 'The white stag', rarity: 'legendary', when: { tod: ['dawn'] }, effect: { kind: 'visitor', id: 'white-stag' }, hint: 'A very long shot, at dawn.', blurb: 'Gone before you could tell anybody.' },
  { id: 'moon-moth', name: 'The moon moth', rarity: 'legendary', when: { tod: ['night'], seasons: ['spring', 'summer', 'autumn'] }, effect: { kind: 'visitor', id: 'moon-moth' }, hint: 'A long shot, on a still night.', blurb: 'It is real. You saw it.' },
  { id: 'rainbow', name: 'A rainbow', rarity: 'uncommon', when: { weather: ['wet'], tod: ['day', 'dawn', 'dusk'] }, icon: 'ico-rainbow', effect: { kind: 'rainbow' }, hint: 'When the rain stops and the sun comes out.', blurb: 'One end is in the veg patch. You checked.' },
  { id: 'four-leaf-clover', name: 'A four-leaf clover', rarity: 'rare', when: { seasons: ['spring', 'summer', 'autumn'], tod: ['day'] }, effect: { kind: 'thing', art: 'clover', where: 'near', click: { keep: 'clover', sound: 'twinkle', gone: true } }, hint: 'Keep your eyes on the grass.', blurb: 'They say it is lucky. It is certainly small.' },
  { id: 'leaf-whirl', name: 'A whirl of leaves', rarity: 'common', when: { seasons: ['autumn'], tod: ['day', 'dusk'] }, icon: 'ico-leaves', effect: { kind: 'whirl' }, hint: 'A windy autumn day.', blurb: 'They follow you for a bit, then lose interest.' },
  { id: 'hot-air-balloon', name: 'A balloon going over', rarity: 'rare', when: { tod: ['dawn', 'day'], weather: ['clear'] }, icon: 'balloon-far', effect: { kind: 'balloon' }, hint: 'Look up on a still, clear day.', blurb: 'They waved. You think they waved.' },
]);
const GL_EGG = new Map(GARDEN_LIFE_EGGS.map(e => [e.id, e]));

/* ---------- triggers ---------- */
function _glMd(iso) { return String(iso || '').slice(5); }
function _glEggOk(e, W) {
  const w = e.when || {};
  if (!_glWhenOk(w, W)) return false;
  const md = _glMd(W.day);
  if (w.from && w.to) { const inside = w.from <= w.to ? md >= w.from && md <= w.to : md >= w.from || md <= w.to; if (!inside) return false; }
  if (w.dow != null || w.dom != null) { const d = new Date(W.day + 'T12:00:00Z'); if (w.dow != null && d.getUTCDay() !== w.dow) return false; if (w.dom != null && d.getUTCDate() !== w.dom) return false; }   // clock-ok: the weekday of an ISO date
  if (w.birthday) { const b = typeof APP_CONFIG !== 'undefined' && APP_CONFIG && typeof APP_CONFIG.birthday === 'string' ? APP_CONFIG.birthday.slice(-5) : ''; if (!b || b !== md) return false; }
  if (w.all && !w.all.every(s => W.find(s).length)) return false;
  if (w.spot) return false;   // only by walking there (_glEggFrame)
  return true;
}
/* ---------- what you have seen lately: a note on this device ---------- */
const GL_SEEN_KEY = 'opendash.garden.life.seen';
function _glSeenMap() { try { const o = JSON.parse(localStorage.getItem(GL_SEEN_KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
function _glSeenMark(id) { try { const o = _glSeenMap(); o[id] = Date.now(); localStorage.setItem(GL_SEEN_KEY, JSON.stringify(o)); } catch (e) { /* a private window forgets */ } }   // clock-ok: a local note, not a date anyone reads
const _glE = { nextT: 0, session: new Set(), things: new Set(), spotCool: 0, whirlT: 0, fwT: 0, fwN: 0, active: new Set() };
function _glEggsBegin(W) { void W; const T = GL_TUNE.eggs; _glE.nextT = _glR(T.firstAfter[0], T.firstAfter[1]); _glE.lucky = Math.random() < T.chance; _glE.fired = 0; _glE.session = new Set(); _glE.things = new Set(); _glE.active = new Set(); _glE.whirl = 0; _glE.fwN = 0; }
/** The surprise you saw last on this device: it never comes twice running. */
function _glEggLast() { const seen = _glSeenMap(); let id = '', at = 0; for (const k of Object.keys(seen)) if (seen[k] > at && GL_EGG.has(k)) { at = seen[k]; id = k; } return id; }
function _glEggsEnd() { for (const S of [..._glE.things]) { try { S.remove(); } catch (e) { /* gone */ } } _glE.things = new Set(); _glE.active = new Set(); _glE.fwN = 0; _glE.whirl = 0; const n = _glE.note; if (n && n.remove) n.remove(); _glE.note = null; }
/** Once a second: is it time for something? Date events first, then a draw favouring what has not been seen lately. */
function _glEggTick(W) {
  if (W.still || gardenFun() === 'off') return;
  if (_gl.dev.noEggs || (_glE.fired || 0) >= GL_TUNE.eggs.perVisit) return;
  const seen = _glSeenMap(), now = Date.now(), last = _glEggLast();   // clock-ok: comparing with the note above
  // a date's own event (a birthday, Halloween) comes on the first look of the day, whatever the draw says, and counts as this visit's surprise
  for (const e of GARDEN_LIFE_EGGS) { if (e.always && !_glE.session.has(e.id) && _glEggOk(e, W) && !(seen[e.id] && now - seen[e.id] < 16 * 3600000)) { _glEggFire(e, W); return; } }
  _glE.nextT -= 1;
  if (_glE.nextT > 0 || !_glE.lucky) return;
  const pool = []; let total = 0;
  for (const e of GARDEN_LIFE_EGGS) {
    if (e.always || _glE.session.has(e.id) || e.id === last || !_glEggOk(e, W)) continue;
    const ago = seen[e.id] ? (now - seen[e.id]) / 3600000 : 1e6;
    if (ago < (e.again == null ? 6 : e.again)) continue;
    // "rarity" is how often, and the longer since you saw it the likelier (an old favourite comes back; a new one wins)
    const w = (GL_RARITY_ODDS[e.rarity] || 0.3) * Math.min(4, 1 + ago / 48);
    pool.push([e, w]); total += w;
  }
  _glE.nextT = _glR(130, 280);
  if (!pool.length) return;
  // rare things only if the draw says so
  let r = Math.random() * Math.max(total, 0.6), pick = null;
  for (const [e, w] of pool) { r -= w; if (r <= 0) { pick = e; break; } }
  if (pick) _glEggFire(pick, W);
}
/** Every frame: did you walk onto a secret, and how the running effects are doing. */
function _glEggFrame(dt, W) {
  if (W.still) return;
  _glE.spotCool -= dt;
  if (_glE.spotCool <= 0) {
    _glE.spotCool = 0.4;
    const P = W.player();
    if (P && (_glE.fired || 0) < GL_TUNE.eggs.perVisit) for (const e of GARDEN_LIFE_EGGS) { const sp = e.when && e.when.spot; if (!sp || _glE.session.has(e.id)) continue; if (_glDist(P.x, P.y, sp.x, sp.y) < (sp.r || 1.5)) _glEggFire(e, W); }
  }
  if (_glE.fwN > 0) { _glE.fwT -= dt; if (_glE.fwT <= 0) { _glE.fwN--; _glE.fwT = _glR(0.4, 1.3); _glFirework(W); } }
  if (_glE.whirl > 0) { _glE.whirl -= dt; _glE.whirlT -= dt; if (_glE.whirlT <= 0) { _glE.whirlT = 0.22; _glWhirlLeaf(W); } }
}
function _glEggFire(e, W) {
  _glE.session.add(e.id);
  const fn = GARDEN_LIFE_EFFECTS[e.effect && e.effect.kind];
  if (!fn) return;
  let ok = false;
  try { ok = fn(e, e.effect, W) !== false; } catch (err) { console.error('[garden life] egg', e.id, err); }
  if (!ok) return;
  _glE.fired = (_glE.fired || 0) + 1;
  _glSeenMark(e.id);
  if (typeof gardenLiveEgg === 'function') gardenLiveEgg(e.id);   // everyone in the garden sees it
  if (typeof gardenLifeFound === 'function' && !e.effect.foundOnClick) gardenLifeFound('e', e.id);
}
/* ---------- a thing put in the world ---------- */
function _glThingSpot(cfg, W, i) {
  const v = W.view(), G = GARDEN_WORLD;
  if (cfg.where === 'spot' && cfg.at) return cfg.at;
  const clear = (x, y) => W.free(x, y, 0.45) && !W.water(x, y) && !(typeof gardenPropAt === 'function' && gardenPropAt(Math.floor(x), Math.floor(y)));
  if (cfg.where === 'water') {
    // near a shore, so you can get to it
    for (let k = 0; k < 80; k++) {
      const x = _glR(Math.max(1, v.x0 + 1), Math.min(G.cols - 1, v.x1 - 1)), y = _glR(Math.max(1, v.y0), Math.min(G.rows - 1, v.y1));
      if (W.water(x, y) && !W.water(x, y - 1.2) && W.water(x + 0.6, y) && W.water(x - 0.6, y)) return { x, y };
    }
    return null;
  }
  // near you, not on you, in view if it can be, never on top of anything
  const P = W.player() || { x: (v.x0 + v.x1) / 2, y: (v.y0 + v.y1) / 2 };
  for (let k = 0; k < 40; k++) {
    const a = Math.random() * 6.283, r = _glR(2.2, 5.5) + (i || 0) * 0.3, x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r * 0.65;
    if (x > 0.5 && y > 0.5 && clear(x, y) && _glInView({ x, y }, v, -0.5)) return { x, y };
  }
  return _glFreeAround(W, P.x + 2, P.y + 1, 0.4, 5);
}
function _glPlaceThing(e, cfg, W, i) {
  const at = _glThingSpot(cfg, W, i); if (!at) return null;
  const draw = GL_THINGS[cfg.art]; if (!draw) return null;
  const C = cfg.click;
  const spec = {
    id: 'egg-' + e.id + '-' + i, svg: `<g class="gl-thing">${draw()}</g>`, x: at.x, y: at.y, lift: 0, ground: false, label: C ? e.name : '', cursor: 'hand', hit: C ? (cfg.hit || 0.7) : 0, t0: 0, offT: 0, seenHere: false, life: cfg.life || 0,
    update(dt, S) {
      if (S.node && S.boundThing !== S.node) { S.boundThing = S.node; S.node.setAttribute('class', 'gd-sprite gl-c gl-thing-s'); }
      S.t0 += dt;
      if (cfg.drift) { S.x += Math.sin(S.t0 * 0.17) * dt * 0.03; if (!W.water(S.x, S.y + 0.1)) S.x -= Math.sin(S.t0 * 0.17) * dt * 0.05; }
      if (cfg.moves === 'unseen') {
        // he moves when nobody is looking: while a panel is open, when you were away from the tab, or as soon as he is out of view (he goes to somewhere just past the edge of it)
        const now = performance.now(), v = W.view(), away = now - (S.lastT || now) > 3000, panel = typeof _gdp !== 'undefined' && !!_gdp.pop;
        S.lastT = now;
        if (panel) S.wasAway = true;
        if (away || (!panel && S.wasAway)) { S.wasAway = false; const q = _glThingSpot({ where: 'near' }, W, 0); if (q) { S.x = q.x; S.y = q.y; } }
        if (_glInView({ x: S.x, y: S.y }, v, 0.2)) S.offT = 0;
        else if ((S.offT += dt) > 0.8) {
          S.offT = 0;
          for (let k = 0; k < 24; k++) { const x = _glR(v.x0 - 5, v.x1 + 5), y = _glR(v.y0 - 3, v.y1 + 3); if (!_glInView({ x, y }, v, 0.5) && x > 0.5 && y > 0.5 && W.free(x, y, 0.45) && !W.water(x, y)) { S.x = x; S.y = y; break; } }
        }
      }
      if (S.life && S.t0 > S.life) { _glE.things.delete(S); S.remove(); }
    },
  };
  if (C) spec.onClick = () => _glThingClick(e, cfg, spec);
  const S = W.add(spec);
  _glE.things.add(S);
  return S;
}
function _glThingClick(e, cfg, S) {
  const C = cfg.click || {};
  if (C.mark) _glMark({ S, def: { markY: cfg.markY || 34 } }, C.mark);
  if (C.sound) _glSound(C.sound);
  if (C.keep && typeof gardenLifeFound === 'function') gardenLifeFound('k', C.keep);
  if (C.read) _glNote(C.read[Math.floor(Math.random() * C.read.length)]);
  if (C.gone) { _glFx(S.x, S.y, 'sparkle', { lift: 6 }); _glE.things.delete(S); S.remove(); }
}
/** A little paper note over the garden: click anywhere to put it down. */
function _glNote(text) {
  const box = typeof _gw !== 'undefined' && _gw.root ? _gw.root.querySelector('.gd-stagebox') : null; if (!box) return;
  if (_glE.note) _glE.note.remove();
  const n = document.createElement('button'); n.type = 'button'; n.className = 'gl-note'; n.textContent = String(text); n.setAttribute('aria-label', 'A note. ' + text + ' Press to put it down.');
  n.onclick = () => { n.remove(); _glE.note = null; };
  box.appendChild(n); _glE.note = n; try { n.focus({ preventScroll: true }); } catch (e) { /* fine */ }
}
/* ---------- the effects: one function each. A new kind of surprise is one more here; a new surprise of an old kind is only a row. ---------- */
const GARDEN_LIFE_EFFECTS = {
  visitor(e, cfg, W) { const n = cfg.n || 1; let any = false; for (let i = 0; i < n; i++) if (gardenLifeSpawn(cfg.id)) any = true; void W; return any; },
  thing(e, cfg, W) {
    const c2 = cfg.where === 'spot' ? Object.assign({}, cfg, { at: e.when.spot }) : cfg;
    let any = false;
    for (let i = 0; i < (cfg.n || 1); i++) if (_glPlaceThing(e, c2, W, i)) any = true;
    if (any && cfg.cheer) { const P = W.player(); if (P) _glFx(P.x, P.y, 'sparkle', { lift: 20 }); _glSound('twinkle'); }
    if (cfg.guests && (!cfg.guests.tod || cfg.guests.tod.includes(W.tod))) for (let i = 0; i < cfg.guests.n; i++) gardenLifeSpawn(cfg.guests.id);
    return any;
  },
  /* a star falls across your view, and leaves a glint you can click to wish on */
  streak(e, cfg, W) {
    const v = W.view(), G = GARDEN_WORLD, x0 = _glR(v.x0 + 2, v.x1 - 6), y0 = v.y0 + _glR(0.3, 2), s = _glStage(x0, y0);
    const g = _glSvgEl('gl-fx gl-streak'); g.setAttribute('transform', `translate(${_glF(s.x)} ${_glF(s.y)})`);
    g.innerHTML = '<path class="gl-streak-in" fill="none" stroke="#fff6c8" stroke-width="2.2" stroke-linecap="round" d="M0 0L170 58"/>';
    _glFxAdd(g, 1200);
    const dest = { x: x0 + 170 / G.cellW, y: y0 + 58 / G.cellH };
    setTimeout(() => {
      if (!_gl.W || _gl.W !== W) return;
      const glow = _glSvgEl('gl-fx'), st = _glStage(dest.x, dest.y); glow.setAttribute('transform', `translate(${_glF(st.x)} ${_glF(st.y)})`); glow.innerHTML = GL_THINGS['wish-star'](); _glFxAdd(glow, 9000);
      const Sp = W.add({ id: 'egg-wish', svg: '', x: dest.x, y: dest.y, lift: 0, z: 999, hit: 0.9, label: 'Make a wish', cursor: 'hand', ground: false, t0: 0,
        update(dt, S) { S.t0 += dt; if (S.t0 > 9) { _glE.things.delete(S); S.remove(); } },
        onAim() { if (cfg.keep && typeof gardenLifeFound === 'function') gardenLifeFound('k', cfg.keep); glow.remove(); _glFx(Sp.x, Sp.y, 'sparkle'); _glSound('twinkle'); _glE.things.delete(Sp); Sp.remove(); },
      });
      _glE.things.add(Sp);
    }, 720);
    return true;
  },
  fireworks(e, cfg) { _glE.fwN = cfg.shots || 8; _glE.fwT = 0.6; return true; },
  whirl() { _glE.whirl = 7; _glE.whirlT = 0; return true; },
  rainbow(e, cfg, W) {
    const G = GARDEN_WORLD, v = W.view(), cx = (v.x0 + v.x1) / 2 * G.cellW, top = _glStage(0, v.y0).y, span = (v.x1 - v.x0) * G.cellW * 0.44, cols = ['#e8504e', '#f09a3e', '#f2d44a', '#62b85a', '#4a8ae0', '#7a5ac0'];
    const g = _glSvgEl('gl-fx gl-rainbow'); g.setAttribute('transform', `translate(${_glF(cx)} ${_glF(top + span * 0.72)})`);
    g.innerHTML = cols.map((c, i) => `<path fill="none" stroke="${c}" stroke-width="5" d="M${-span + i * 5} 0A${span - i * 5} ${span * 0.68 - i * 5} 0 0 1 ${span - i * 5} 0"/>`).join('');
    _glFxAdd(g, 21500);
    return true;
  },
  balloon(e, cfg, W) {
    const v = W.view(), y = v.y0 + _glR(0.6, 2.2);
    const S = W.add({ id: 'egg-balloon', svg: `<g class="gl-thing" transform="scale(1.1)">${GL_THINGS['balloon-far']()}</g>`, x: v.x0 - 1, y, lift: 0, z: 999, ground: false, t0: 0,
      update(dt, Sp) { Sp.t0 += dt; Sp.x += dt * 0.38; const vv = W.view(); if (Sp.x > vv.x1 + 2) { _glE.things.delete(Sp); Sp.remove(); } } });
    _glE.things.add(S);
    return true;
  },
};
function _glFirework(W) {
  const v = W.view(), wd = v.x1 - v.x0, x = v.x0 + wd * _glR(0.18, 0.82), y = v.y0 + (v.y1 - v.y0) * _glR(0.16, 0.42), s = _glStage(x, y), cols = ['#ff6a6a', '#ffd94a', '#6ad0ff', '#c88aff', '#7aff9a'], c = cols[Math.floor(Math.random() * cols.length)];
  const g = _glSvgEl('gl-fx gl-firework'); g.setAttribute('transform', `translate(${_glF(s.x)} ${_glF(s.y)})`);
  let h = ''; const n = 22;
  for (let i = 0; i < n; i++) { const a = i / n * 6.283, R = _glR(38, 66); h += `<circle class="gl-spark-fw" r="1.7" fill="${c}" style="--dx:${_glF(Math.cos(a) * R)}px;--dy:${_glF(Math.sin(a) * R)}px"/>`; }
  g.innerHTML = h;
  _glFxAdd(g, 1250);
  _glSound('pop');
}
function _glWhirlLeaf(W) {
  const P = W.player(); if (!P) return;
  const a = Math.random() * 6.283, s = _glStage(P.x + Math.cos(a) * _glR(0.6, 1.5), P.y + Math.sin(a) * 0.7, _glR(4, 36)), c = ['#c8782a', '#b84a2a', '#d8a83a', '#8a5a2a'][Math.floor(Math.random() * 4)];
  const g = _glSvgEl('gl-fx gl-leaf'); g.setAttribute('transform', `translate(${_glF(s.x)} ${_glF(s.y)})`);
  g.innerHTML = `<path class="gl-leaf-in" fill="${c}" d="M-3.4 0Q0 -3.4 3.4 0Q0 3.4 -3.4 0z" style="--dx:${_glF(_glR(-46, 46))}px;--dy:${_glF(_glR(-30, -6))}px;--dr:${Math.round(_glR(-500, 500))}deg"/>`;
  _glFxAdd(g, 1500);
}
