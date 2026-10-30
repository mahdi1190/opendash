/* ============================================================
   PETS, the living stage (2.23, agent 'pets'). A little world the pet lives in
   on its page: it wanders, sniffs, stretches, plays with its toy, naps on its
   bed; a pat, a treat or a game makes it react. The drawing stays
   97-pets-0kit*.js; every limb moves by CSS (src/styles/97-pets.css, classes
   pt-act-* on the drawing); this file only says what it is doing and where it
   stands (one transform).

   Light: requestAnimationFrame runs only while it walks, timers stop while the
   stage is off screen or the tab is hidden, and with reduced motion or the Fun
   level Off it simply sits still (the buttons still work).

     petPersona(species)                 how a species behaves {speed, acts: [clip names], nap, night: stays up at night, flies, likes} (its row's persona over its gait's defaults)
     PET_CLIPS                           the named animation clips
     petActorNew(host, look, o)          an animated pet in host: {say, act, walkTo, sit, sleep, wake, stop, x}
     petPropSvg(kind, id, size)          a toy or a bed as an <svg> string
     petStageMount(el, g, o)             the page's big stage; returns {act, feed, play, nap, refresh}
     petCelebrate(id)                    a new friend! a small party, click anywhere to go on
   ============================================================ */

/* ---------- personality: a gait's defaults, and a species' row may override any of them (persona in 97-pets-0kit.js) ---------- */
const PET_LIKES = Object.freeze(['flowers', 'butterflies', 'sun', 'friends', 'toy']);   // what the garden's behaviour library may have it do
const _PTA_BASE = {
  trot: { speed: 1, acts: ['look', 'sniff', 'stretch', 'scratch', 'play'], nap: 0.14 },
  scurry: { speed: 1.25, acts: ['look', 'sniff', 'groom', 'dart', 'look'], nap: 0.12 },
  hop: { speed: 0.95, acts: ['look', 'sniff', 'jump', 'groom'], nap: 0.14 },
  plod: { speed: 0.45, acts: ['look', 'sniff', 'chew'], nap: 0.3 },
  waddle: { speed: 0.7, acts: ['look', 'sniff', 'wiggle', 'preen'], nap: 0.14 },
  fly: { speed: 1.1, acts: ['look', 'loop', 'look', 'preen'], nap: 0.1, flies: true },
  float: { speed: 0.6, acts: ['look', 'loop', 'wiggle'], nap: 0.1, flies: true },
  paddle: { speed: 0.5, acts: ['look', 'wiggle', 'jump'], nap: 0.2 },
  glide: { speed: 0.22, acts: ['look', 'look', 'sniff'], nap: 0.34 },
  scuttle: { speed: 0.8, acts: ['look', 'wiggle', 'dart', 'wave'], nap: 0.1 },
  stomp: { speed: 0.55, acts: ['look', 'stretch', 'wave'], nap: 0.18 },
  roll: { speed: 0.9, acts: ['look', 'wiggle', 'loop'], nap: 0.06 },
};
function petPersona(id) {
  const sp = petSpecies(id) || {}, base = _PTA_BASE[sp.gait] || _PTA_BASE.trot, o = sp.persona || {};
  return { speed: o.speed || base.speed, acts: o.acts || base.acts, nap: o.nap == null ? base.nap : o.nap, night: !!o.night, flies: !!base.flies, likes: o.likes || base.likes || PET_LIKES };
}
/* THE CLIPS: a name a species' persona may list -> [the CSS clip pt-act-<clip> on the drawing, how long in ms]. New clip = one line here and its keyframes in 97-pets.css. */
const PET_CLIPS = Object.freeze({ look: ['look', 2800], sniff: ['sniff', 2400], stretch: ['stretch', 1800], scratch: ['scratch', 1700], play: ['pounce', 1500], groom: ['groom', 2300], dart: ['look', 500], jump: ['jump', 900], chew: ['eat', 2200], wiggle: ['wiggle', 1500], preen: ['groom', 2000],
  loop: ['loop', 1400], stand: ['stand', 1700], flap: ['flap', 1400], puff: ['look', 1600], prance: ['prance', 1200], dig: ['dig', 2000], roll: ['roll', 1500], howl: ['howl', 1900], wave: ['wave', 1400] });

/* ---------- a pet that moves ---------- */
function _ptaMotion() { return _ptMotionOk() && _ptFun() !== 'off'; }
function petActorNew(host, look0, o) {
  o = o || {};
  const look = o.me ? null : look0, per = petPersona(look0.species);
  const el = document.createElement('div'); el.className = 'pta';
  const face = document.createElement('div'); face.className = 'pta-face'; el.appendChild(face);
  const fx = document.createElement('div'); fx.className = 'pta-fx'; el.appendChild(fx);
  host.appendChild(el);
  const A = { el, face, fx, x: o.x == null ? 100 : o.x, dir: 1, pose: '', moodKey: '', moving: false, raf: 0, stopped: false, per, size: o.size || 200, act: '' };
  const lookNow = () => (o.me ? (petGet().look ? petWithItems(petGet().look, 'me') : look0) : look0);
  const apply = () => { el.style.transform = `translate3d(${(A.x - A.size / 2).toFixed(1)}px, ${(A.lift || 0).toFixed(1)}px, 0)`; face.style.transform = A.dir < 0 ? 'scaleX(-1)' : ''; };
  A.draw = (pose, mood, force) => {
    const key = JSON.stringify([pose, mood && mood.eyes, mood && mood.mouth, mood && mood.extra]);
    if (!force && key === A.moodKey) return;
    A.moodKey = key; A.pose = pose; A.lastMood = mood;
    const moving = _ptaMotion();
    face.innerHTML = petSvg(lookNow(), { size: A.size, pose, mood: mood || {}, motion: moving, crop: 'none', cls: 'pt-fun-' + _ptFun() + (moving ? '' : ' pt-still') });   // allow-listed ids and numbers only
    A.svg = face.firstChild;
    if (A.act) A.svg.classList.add('pt-act-' + A.act);
    if (A.moving && A.run && A.svg) A.svg.classList.add('pt-run');
  };
  A.setAct = (name) => {
    if (A.svg && A.act) A.svg.classList.remove('pt-act-' + A.act);
    A.act = name || '';
    if (A.svg && name) A.svg.classList.add('pt-act-' + name);
  };
  /** Play an act for a moment (a look, a sniff, a jump); done() after. */
  A.play = (name, ms, done) => {
    clearTimeout(A.actT);
    // 2.23: the clip library (97-pets-tricks-0clips.js) plays everything it knows; the CSS clips below are what is left
    const lib = typeof petClipDef === 'function' ? petClipDef(name) : null;
    if (lib && A.svg) {
      const was = A.pose, wasMood = A.lastMood;
      A.setAct('');
      if (lib.pose !== was || lib.face) A.draw(lib.pose, lib.face || wasMood || { eyes: 'open', mouth: 'smile' }, true);
      petClipRun(A.svg, name, { ms });
      A.actT = setTimeout(() => { if (lib.pose !== was && !A.moving) A.draw(was || 'sit', wasMood || { eyes: 'open', mouth: 'smile' }, true); else if (lib.face && !A.moving) A.draw(was || 'sit', wasMood || { eyes: 'open', mouth: 'smile' }, true); if (done) done(); }, _ptaMotion() ? lib.ms : Math.min(1200, lib.ms));
      return;
    }
    A.setAct(name);
    A.actT = setTimeout(() => { A.setAct(''); if (done) done(); }, _ptaMotion() ? ms : 0);
  };
  /** Walk to x (px in the host). run: at a run. */
  A.walkTo = (x, opt, done) => {
    opt = opt || {};
    cancelAnimationFrame(A.raf);
    if (!_ptaMotion()) { A.x = x; apply(); if (done) done(); return; }
    A.dir = x < A.x ? -1 : 1; A.moving = true; A.run = !!opt.run;
    A.draw('walk', opt.mood || { eyes: 'open', mouth: A.run ? 'open' : 'smile' });
    if (A.svg) A.svg.classList.toggle('pt-run', A.run);
    apply();
    const speed = (A.run ? 2.1 : 1) * (A.size * 0.62) * per.speed * (opt.speed || 1);   // bigger pets take longer strides, in px a second
    let last = performance.now();
    const step = (now) => {
      if (A.stopped) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const d = x - A.x, go = speed * dt;
      if (Math.abs(d) <= go) { A.x = x; A.moving = false; apply(); if (A.svg) A.svg.classList.remove('pt-run'); if (done) done(); return; }
      A.x += Math.sign(d) * go; apply();
      A.raf = requestAnimationFrame(step);
    };
    A.raf = requestAnimationFrame(step);
  };
  A.stop = () => { A.stopped = true; cancelAnimationFrame(A.raf); clearTimeout(A.actT); clearTimeout(A.loopT); };
  A.apply = apply;
  apply();
  return A;
}

/* ---------- toys and beds, in the kit's flat style ---------- */
function petPropSvg(kind, id, size) {
  const S = Math.max(12, Number(size) || 40);
  const wrap = (shapes, vb) => `<svg class="pt-prop" viewBox="${vb || '0 0 48 48'}" width="${S}" height="${S}" aria-hidden="true" focusable="false">${shapes.map(s => _ptShapeSvg(s)).join('')}</svg>`;
  if (kind === 'toy') {
    switch (id) {
      case 'yarn': return wrap([_pF(_pC(24, 26, 15), '#e8678a'), _pL('M12 20Q24 12 36 22M10 28Q24 18 38 30M14 37Q26 26 36 36M19 12Q14 26 22 40M28 12Q36 26 30 40', '#c0436a', 1.4, 0.8), _pF(_pE(19, 19, 4, 2.4), '#ffffff', 0.4), _pL('M34 37Q42 42 40 46', '#e8678a', 2)]);
      case 'feather': return wrap([_pL('M8 44L30 20', '#a9835a', 2.4), _pF('M28 22Q26 8 42 4Q44 18 30 24z', '#7cc0ea'), _pF('M30 21Q30 11 40 7Q40 16 32 22z', '#f6d35e'), _pL('M31 21L41 6', '#3b74d6', 0.9)]);
      case 'frisbee': return wrap([_pF(_pE(24, 28, 19, 9), '#e0473e'), _pF(_pE(24, 25, 19, 9), '#f27a62'), _pF(_pE(24, 25, 11, 5), '#e0473e'), _pF(_pE(18, 22, 6, 1.8), '#ffffff', 0.45)]);
      case 'squeak': return wrap([_pF(_pE(22, 32, 15, 11), '#f6d35e'), _pF(_pC(33, 20, 9), '#f6d35e'), _pF('M41 19L47 21L41 24z', '#f08a3c'), _pF(_pC(35, 18, 1.5), '#2a2124'), _pF('M9 30Q4 24 8 20Q12 26 14 28z', '#f2c23a'), _pF(_pE(20, 33, 6, 4), '#f2c23a')]);
      case 'star': return wrap([_pF(_pC(24, 26, 15), '#3b4bb0'), _pF(_ptStar(24, 26, 9, 3.6), '#f6d35e'), _pF(_pC(16, 18, 1.2), '#ffffff'), _pF(_pC(34, 33, 1.2), '#ffffff'), _pF(_pE(18, 17, 4, 2.2), '#ffffff', 0.3)]);
      default: return wrap([_pF(_pC(24, 26, 15), '#e0473e'), _pF('M9.5 22Q24 34 38.5 22Q38 30 34 35Q24 41 14 35Q10 30 9.5 22z', '#f7f5f0'), _pF(_pE(18, 18, 4.4, 2.6), '#ffffff', 0.55)]);
    }
  }
  const B = '0 0 120 60';
  switch (id) {
    case 'basket': return wrap([_pF('M8 28Q60 18 112 28L104 54Q60 62 16 54z', '#c8924e'), _pF('M18 30Q60 24 102 30Q98 44 60 46Q22 44 18 30z', '#f2d6d6'), _pL('M14 36L106 36M16 44L104 44M30 28L34 56M60 26L60 58M90 28L86 56', '#a06e34', 1.4, 0.7), _pL('M8 28Q60 18 112 28', '#a06e34', 3)], B);
    case 'hammock': return wrap([_pL('M6 4L10 58M114 4L110 58', '#8a6a48', 3.4), _pF('M8 14Q60 62 112 14Q60 40 8 14z', '#3fa4a0'), _pF('M8 14Q60 50 112 14Q60 40 8 14z', '#5fc4be'), _pL('M20 22Q60 50 100 22', '#f7f5f0', 1.4, 0.7)], B);
    case 'igloo': return wrap([_pF('M10 56Q10 10 60 10Q110 10 110 56z', '#e4f2fa'), _pF('M40 56Q40 28 60 28Q80 28 80 56z', '#4a6a8a'), _pL('M14 38L106 38M24 24L96 24M40 10L38 24M78 10L80 24M28 24L26 38M60 24L60 28M92 24L94 38', '#b0cfe2', 1.3, 0.9)], B);
    case 'cloud': return wrap([_pF(_pC(32, 36, 20), '#ffffff'), _pF(_pC(60, 30, 24), '#ffffff'), _pF(_pC(88, 36, 20), '#ffffff'), _pF('M16 44H104Q112 56 96 56H24Q8 56 16 44z', '#e4ecf6'), _pF(_pE(50, 18, 12, 4), '#fff', 0.8)], B);
    default: return wrap([_pF(_pE(60, 44, 54, 15), '#a86ad0'), _pF(_pE(60, 38, 54, 15), '#c592e6'), _pF(_pE(60, 37, 38, 9), '#b278d8'), _pL('M12 38Q60 58 108 38', '#8a4cb4', 1.2, 0.5)], B);
  }
}

/* ---------- the stage ---------- */
function _ptsBackdrop(sky, season) {
  const hill = { spring: ['#a6dc8e', '#8ccb78'], summer: ['#9ad67e', '#7fc268'], autumn: ['#d8c46a', '#c4a84e'], winter: ['#eef4f8', '#d8e6ef'] }[season] || ['#9ad67e', '#7fc268'];
  const dark = sky === 'night', k = dark ? '#3e5a6e' : hill[0], k2 = dark ? '#2f4858' : hill[1], tree = dark ? '#2e4654' : season === 'autumn' ? '#d99040' : season === 'winter' ? '#c8d8e2' : '#6db35a', trunk = dark ? '#28323c' : '#8a6a48';
  const halo = dark ? '' : `<circle cx="960" cy="${sky === 'dawn' ? 170 : sky === 'dusk' ? 190 : 86}" r="66" fill="#fff6d0" opacity=".24"/>`;
  const body = dark ? `<circle cx="960" cy="86" r="40" fill="#f6efd0"/><circle cx="976" cy="74" r="34" fill="#28315e"/>` + [[120, 60], [260, 120], [420, 50], [560, 140], [700, 70], [860, 44], [980, 150], [1240, 170], [340, 200], [620, 40]].map(([x, y], i) => `<circle class="pts-star" cx="${x}" cy="${y}" r="${i % 3 ? 1.8 : 2.6}" fill="#fff"/>`).join('')
    : `<circle cx="960" cy="${sky === 'dawn' ? 170 : sky === 'dusk' ? 190 : 86}" r="46" fill="${sky === 'day' ? '#fff3b8' : '#ffd9a0'}" opacity="0.95"/>` + (sky === 'day' ? '<g class="pts-cloud"><ellipse cx="460" cy="96" rx="70" ry="18" fill="#fff" opacity=".85"/><ellipse cx="500" cy="80" rx="46" ry="20" fill="#fff" opacity=".85"/><ellipse cx="760" cy="62" rx="54" ry="13" fill="#fff" opacity=".7"/><ellipse cx="790" cy="50" rx="34" ry="14" fill="#fff" opacity=".7"/></g>' : '');
  return `<svg class="pts-bg" viewBox="0 0 1400 520" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">${halo}${body}<path d="M0 330Q240 250 520 310T1000 290T1400 330V520H0z" fill="${k}" opacity=".62"/>`
    + `<g fill="${tree}"><ellipse cx="170" cy="282" rx="44" ry="50"/><ellipse cx="1260" cy="276" rx="52" ry="58"/><ellipse cx="440" cy="288" rx="38" ry="46"/><ellipse cx="478" cy="306" rx="26" ry="30"/><ellipse cx="1020" cy="284" rx="42" ry="50"/></g><rect x="163" y="320" width="14" height="40" fill="${trunk}"/><rect x="1252" y="322" width="16" height="40" fill="${trunk}"/><rect x="434" y="322" width="12" height="44" fill="${trunk}"/><rect x="1014" y="322" width="13" height="44" fill="${trunk}"/>`
    + `<g stroke="${dark ? '#55677a' : '#c9a878'}" stroke-width="5" stroke-linecap="round" fill="none"><path d="M560 362V322M640 360V320M720 358V318M800 358V318M880 360V320M544 340H900"/></g>`
    + `<g>${season === 'winter' ? '' : [[520, 440, '#f6a5c0'], [610, 470, '#fff4c0'], [720, 436, '#f6d35e'], [820, 478, '#c9a7f0'], [930, 442, '#f6a5c0'], [420, 470, '#fff4c0'], [1000, 476, '#f6d35e']].map(([x, y, c]) => `<g><circle cx="${x - 4}" cy="${y}" r="4" fill="${c}"/><circle cx="${x + 4}" cy="${y}" r="4" fill="${c}"/><circle cx="${x}" cy="${y - 4}" r="4" fill="${c}"/><circle cx="${x}" cy="${y + 4}" r="4" fill="${c}"/><circle cx="${x}" cy="${y}" r="2.6" fill="#f2b33d"/></g>`).join('')}</g>`
    + `<path d="M0 390Q360 340 700 372T1400 372V520H0z" fill="${k2}"/><path d="M0 420Q420 386 760 408T1400 404V520H0z" fill="${k}"/>`
    + [[300, 448], [520, 490], [860, 460], [1100, 494], [1310, 452], [140, 482]].map(([x, y], i) => `<g class="pts-tuft" fill="${k2}"><path d="M${x} ${y}q-6 -14 -2 -18q3 10 4 12q1 -12 5 -16q1 12 0 18z"/></g>`).join('')
    + `</svg>`;
}
const _PTS_MOOD_ICON = { sleepy: 'moon', dozy: 'moon', excited: 'sparkles', happy: 'smile', reacting: 'heart', playful: 'party-popper', focused: 'target', content: 'smile' };
function _ptsWeather() {
  try {
    if (typeof gardenModel !== 'function') return { season: 'summer', rain: false };
    const m = gardenModel();
    return { season: m.season, rain: !!(m.rain && m.rain.now), snow: m.season === 'winter' };
  } catch (e) { return { season: 'summer', rain: false }; }
}
function _ptDeny(target, o) {
  if (typeof gameDeny === 'function') {
    try {
      const k = o && o.kind, opts = { say: (o && o.say) || 'Not yet' };
      if (k === 'coins' || k === 'lock') opts.kind = k;
      if (o && o.badge != null) opts.badge = String(o.badge);
      gameDeny(target, opts);
      return;
    } catch (e) { /* the plain shake below */ }
  }
  if (!target || !target.classList) return;
  target.classList.remove('pt-deny'); void target.getBoundingClientRect(); target.classList.add('pt-deny');
  setTimeout(() => target.classList.remove('pt-deny'), 520);
}
function _ptCheer(target, o) { if (typeof gameCheer === 'function') { try { gameCheer(target, o || {}); } catch (e) { /* the pet's own joy is enough */ } } }
/**
 * The big stage. o {size}. The stage takes the width of its parent; the pet's size follows. A pet that is asleep (late at night, a
 * quiet afternoon) sleeps on its bed until you wake it.
 */
function petStageMount(root, g, o) {
  o = o || {};
  const weather = _ptsWeather(), sky = typeof _ptSky === 'function' ? _ptSky() : 'day';
  const stage = document.createElement('div');
  stage.className = 'pts pts-sky-' + sky + (weather.rain ? ' is-rain' : '') + (weather.snow && !weather.rain ? ' is-snow' : '');
  stage.innerHTML = _ptsBackdrop(sky, weather.season);
  root.appendChild(stage);
  const hudL = _ptEl('div', 'pts-plate'), hudR = _ptEl('div', 'pts-jar');
  const moodEl = _ptEl('span', 'pts-mood'); moodEl.setAttribute('aria-hidden', 'true');
  const bed = _ptEl('div', 'pts-bed'), toy = _ptEl('div', 'pts-toy');
  const floor = _ptEl('div', 'pts-floor');
  const bubble = _ptEl('div', 'pts-think'); bubble.setAttribute('aria-hidden', 'true');
  stage.append(bed, floor, toy, hudL, hudR);
  floor.appendChild(bubble);
  if (weather.rain || weather.snow) { const wx = _ptEl('div', weather.rain ? 'pts-rain' : 'pts-snow'); wx.setAttribute('aria-hidden', 'true'); stage.appendChild(wx); }
  const W = () => stage.clientWidth || 800;
  let w = W(), size = o.size || Math.round(Math.max(150, Math.min(320, w * 0.3)));
  bed.innerHTML = petPropSvg('bed', petBedNow(), 120);
  toy.innerHTML = petPropSvg('toy', petToyNow(), 44);
  const actor = petActorNew(floor, g.look, { me: true, size, x: w * 0.56 });
  actor.el.tabIndex = 0;
  actor.el.setAttribute('role', 'button');
  actor.el.setAttribute('aria-label', `Pat ${petName(g)}`);
  actor.el.classList.add('is-me');
  const S = { actor, stage, floor, asleep: false, busy: false, dead: false, visible: true, t: 0 };

  const moodNow = () => petMood() || {};
  const paintMood = () => {
    const m = moodNow();
    moodEl.innerHTML = icon(_PTS_MOOD_ICON[m.key] || 'smile', 'i-sm');
    moodEl.dataset.mood = m.key || 'content';
  };
  const stand = () => { actor.draw('sit', { eyes: 'open', mouth: 'smile' }); };
  const think = (html, ms) => {
    bubble.innerHTML = html; bubble.classList.add('is-on');
    bubble.style.left = actor.x + 'px';
    clearTimeout(S.thinkT); S.thinkT = setTimeout(() => bubble.classList.remove('is-on'), ms || 1500);
  };
  S.think = think;
  const hearts = () => { if (_ptMotionOk()) petHeartsAt(actor.fx, 4); };

  /* what it does on its own */
  const nightOwl = actor.per.night;
  const shouldSleep = () => { const k = moodNow().key; return (k === 'sleepy' && !nightOwl) || k === 'dozy'; };
  const goToBed = (then) => { S.busy = true; actor.walkTo(bedX(), { speed: 0.9 }, () => { S.asleep = true; S.busy = false; actor.dir = 1; actor.apply(); actor.draw('sleep', { eyes: 'closed', mouth: 'calm', extra: 'zzz' }); stage.classList.add('is-asleep'); if (then) then(); }); };
  const bedX = () => Math.max(size * 0.5, Math.min(w * 0.22, w - size)) ;
  const wakeUp = (then) => {
    S.asleep = false; stage.classList.remove('is-asleep');
    petWake(90000);
    stand(); actor.play('stretch', 1500, () => { if (then) then(); });
  };
  const nextAct = () => {
    if (S.dead || !S.visible || !_ptaMotion()) return;
    if (S.busy || S.asleep || actor.moving) { later(3000); return; }
    const per = actor.per, r = Math.random();
    if (r < per.nap * 0.25 && !weather.rain) { goToBed(); later(9000); return; }
    if (r < 0.46) {
      // wander: never too near the bed or the edge
      const margin = size * 0.42, nx = margin + Math.random() * (w - margin * 2), near = Math.abs(nx - actor.x) < size * 0.3;
      actor.walkTo(near ? (actor.x > w / 2 ? actor.x - size : actor.x + size) : nx, {}, () => { stand(); later(1800 + Math.random() * 3000); });
      return;
    }
    if (typeof petSurpriseMaybe === 'function' && petSurpriseMaybe(S, 8)) { later(14000); return; }
    if (typeof petCueCheck === 'function' && petCueCheck(S)) { later(9000); return; }
    const pick = typeof petIdlePick === 'function' ? petIdlePick(g.look.species, per) : per.acts[Math.floor(Math.random() * per.acts.length)], libd = typeof petClipDef === 'function' ? petClipDef(pick) : null, def = libd ? [pick, libd.ms] : PET_CLIPS[pick] || PET_CLIPS.look;
    if (pick === 'pounce' || pick === 'play' || (pick === 'dart' && r > 0.7)) { chaseToy(false); return; }
    if (weather.rain && r > 0.9) { actor.play('shake', 900); later(2000); return; }
    actor.play(def[0], def[1]);
    later(def[1] + 1600 + Math.random() * 3200);
  };
  const later = (ms) => { clearTimeout(actor.loopT); actor.loopT = setTimeout(nextAct, ms); };

  /* the toy rolls and it chases it */
  const toyAt = (x, h) => { toy.style.transform = `translate3d(${x.toFixed(0)}px, ${(h || 0).toFixed(0)}px, 0)`; };
  S.toyX = w * 0.74; toyAt(S.toyX);
  const chaseToy = (thrown, done) => {
    if (S.busy && !thrown) return later(2000);
    S.busy = true;
    const go = () => {
      const tx = S.toyX;
      actor.walkTo(tx + (actor.x < tx ? -size * 0.42 : size * 0.42), { run: true, mood: { eyes: 'happy', mouth: 'open' } }, () => {
        stand();
        actor.dir = actor.x < tx ? 1 : -1; actor.apply();
        actor.play('pounce', 720, () => {
          // the toy flies off again, and it jumps for joy
          const nx = Math.max(size * 0.6, Math.min(w - size * 0.6, tx + (Math.random() < 0.5 ? -1 : 1) * (w * 0.18 + Math.random() * w * 0.2)));
          S.toyX = nx; toy.classList.add('is-fly'); toyAt(nx); setTimeout(() => toy.classList.remove('is-fly'), 700);
          actor.draw('sit', { eyes: 'happy', mouth: 'open' });
          actor.play('jump', 820, () => { S.busy = false; stand(); if (done) done(); later(2200); });
        });
      });
    };
    if (S.asleep) wakeUp(go); else go();
  };

  /* what you do */
  S.pat = () => {
    const r = petPat();
    if (!r.ok) return;
    if (typeof petBookTick === 'function') { const tt = petBookTick('pat'); for (const id of tt.secret) petSecretReveal(id); }
    if (S.asleep) { wakeUp(); paintHud(); return; }
    actor.draw(actor.pose === 'walk' ? 'walk' : 'sit', { eyes: 'happy', mouth: 'open', extra: 'hearts' });
    hearts();
    actor.play('petted', 1500, () => { if (!actor.moving) stand(); });
    if (r.bondUp) bondUp();
    paintHud();
  };
  S.feed = (btn) => {
    const r = petFeed();
    if (!r.ok) {
      _ptDeny(btn, { say: r.msg });
      if (r.full) { actor.play('no', 700); think(petTreatSvg(petSpecies(g.look.species).treat, 30) + icon('circle-x', 'i-sm')); }
      else { hudR.classList.remove('pts-wobble'); void hudR.offsetWidth; hudR.classList.add('pts-wobble'); }
      return;
    }
    if (o.onChange) o.onChange();
    S.busy = true;
    const eat = () => {
      if (actor.moving) return;
      const pieces = _ptEl('span', 'pts-treat'); pieces.innerHTML = petTreatSvg(r.treat, 34);
      pieces.style.left = (actor.x + actor.dir * size * 0.34) + 'px';
      floor.appendChild(pieces);
      actor.draw('sit', { eyes: 'happy', mouth: 'open' });
      actor.play('eat', 1500, () => {
        pieces.remove();
        actor.draw('sit', { eyes: 'happy', mouth: 'smile', extra: 'hearts' });
        hearts();
        actor.play('jump', 780, () => { S.busy = false; stand(); later(2200); });
      });
    };
    if (S.asleep) wakeUp(eat); else eat();
    if (r.bondUp) bondUp();
    paintHud();
  };
  S.playNow = (btn) => {
    const r = petPlay();
    if (!r.ok) { _ptDeny(btn); return; }
    if (r.level) bondUp();
    chaseToy(true);
    paintHud();
  };
  S.nap = () => {
    if (S.asleep) { wakeUp(() => { stand(); later(2000); }); return; }
    if (S.busy) return;
    goToBed(); paintMood();
  };
  const bondUp = () => {
    const b = petBondOf(g.look.species);
    if (typeof gameCheer === 'function') _ptCheer(hudL, { kind: 'bond' });
    hudL.classList.remove('pts-pop'); void hudL.offsetWidth; hudL.classList.add('pts-pop');
    think(`<b class="pts-lv">${b.level}</b>` + icon('heart', 'i-sm'), 2200);
  };
  S.wakeNow = () => { if (S.asleep) wakeUp(); };
  S.trick = (t) => {
    if (S.asleep) wakeUp();
    petWake(60000);
    stand();
    const svg = actor.svg, outer = actor.face;
    if (_ptaMotion()) { outer.classList.remove(...[...outer.classList].filter(c => c.startsWith('do-'))); void outer.offsetWidth; outer.classList.add('do-' + t.anim); setTimeout(() => outer.classList.remove('do-' + t.anim), _PT_TRICK_MS[t.anim] || 1200); }
    if (t.anim === 'speak') think(`<span class="pts-say"></span>`), bubble.querySelector('.pts-say').textContent = (petSpecies(g.look.species) || {}).sound || 'Hi!';
    return svg;
  };
  actor.el.onclick = S.pat;
  actor.el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); S.pat(); } };
  bed.onclick = () => S.nap();
  toy.onclick = () => S.playNow(toy);

  /* hud */
  const paintHud = () => {
    const gg = petGet(), b = petBondOf(gg.look.species), t = petTreats();
    hudL.replaceChildren();
    const ring = _ptEl('span', 'pts-ring'); ring.style.setProperty('--p', b.pct + '%');
    const lv = _ptEl('b', null, String(b.level)); ring.appendChild(lv);
    ring.setAttribute('data-tip', `Friend level ${b.level}`);
    hudL.appendChild(ring);
    const nb = _ptEl('div', 'pts-plate-t'); nb.appendChild(_ptEl('b', 'pts-name', petName(gg)));
    const love = _ptEl('span', 'pts-love'); love.setAttribute('aria-label', 'Love today');
    const today = _ptToday(), p = _ptS(), care = Math.min(5, Math.min(2, Number(p.petted[today]) || 0) + Math.min(2, Number(p.fed[today]) || 0) + Math.min(1, Number((p.played || {})[today]) || 0));
    for (let i = 0; i < 5; i++) { const h = _ptEl('span', 'pts-heart' + (i < care ? ' on' : '')); h.innerHTML = '<svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path d="M10 17C2 11 2 5 6 4c2-.5 3.4.6 4 2 .6-1.4 2-2.5 4-2 4 1 4 7-4 13z"/></svg>'; love.appendChild(h); }
    nb.appendChild(love);
    hudL.appendChild(nb);
    hudL.appendChild(moodEl);
    hudR.replaceChildren();
    const j1 = _ptEl('span', 'pts-chip'); j1.innerHTML = petTreatSvg('cookie', 22); j1.appendChild(_ptEl('b', null, String(t.have))); j1.setAttribute('data-tip', 'Treats'); hudR.appendChild(j1);
    const w = _ptcWallet();
    if (w) { const j2 = _ptEl('span', 'pts-chip'); j2.innerHTML = icon('coins', 'i-sm'); j2.appendChild(_ptEl('b', null, String(w.coins))); j2.setAttribute('data-tip', 'Garden coins'); hudR.appendChild(j2); }
    paintMood();
  };
  S.paintHud = paintHud;
  S.refreshProps = () => { bed.innerHTML = petPropSvg('bed', petBedNow(), 120); toy.innerHTML = petPropSvg('toy', petToyNow(), 44); };
  paintHud();

  /* start: asleep if it should be, else sitting */
  const start = () => {
    w = W();
    if (shouldSleep() && _ptaMotion()) { actor.x = bedX(); actor.apply(); S.asleep = true; stage.classList.add('is-asleep'); actor.draw('sleep', { eyes: 'closed', mouth: 'calm', extra: 'zzz' }); }
    else stand();
    if (_ptaMotion()) { actor.el.classList.add('is-in'); later(1500); }
  };
  start();
  // off screen or hidden: nothing runs; back: carry on
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => {
    for (const e of es) {
      S.visible = e.isIntersecting;
      stage.classList.toggle('pt-off', !e.isIntersecting);
      if (e.isIntersecting && !S.dead) later(800); else clearTimeout(actor.loopT);
    }
  }, { threshold: 0.05 }) : null;
  if (io) io.observe(stage);
  const onVis = () => { if (document.hidden) clearTimeout(actor.loopT); else if (S.visible && !S.dead) later(800); };
  document.addEventListener('visibilitychange', onVis);
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { const nw = stage.clientWidth; if (nw && nw !== w) { w = nw; if (actor.x > w - size * 0.3) { actor.x = w - size * 0.5; actor.apply(); } if (S.toyX > w - 30) { S.toyX = w * 0.7; toyAt(S.toyX); } } }) : null;
  if (ro) ro.observe(stage);
  // the moment it leaves the page, everything stops
  const gone = setInterval(() => { if (!stage.isConnected) { S.stop(); } }, 2000);
  S.stop = () => { S.dead = true; actor.stop(); clearInterval(gone); clearTimeout(S.thinkT); if (io) io.disconnect(); if (ro) ro.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  return S;
}

/* ---------- a new friend ---------- */
const _ptCeleb = { q: [], open: false };
function petCelebrate(id) {
  if (!petSpecies(id)) return;
  _ptCeleb.q.push(id);
  _ptCelebNext();
}
function _ptCelebNext() {
  if (_ptCeleb.open || !_ptCeleb.q.length) return;
  if (typeof _gw !== 'undefined' && _gw && _gw.reel) { setTimeout(_ptCelebNext, 4000); return; }   // never in the middle of landing a fish
  const id = _ptCeleb.q.shift(), sp = petSpecies(id);
  _ptCeleb.open = true;
  const box = _ptEl('div', 'ptc' + (_ptMotionOk() ? ' is-live' : ''));
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', `New friend: ${sp.label}`);
  const rays = _ptEl('div', 'ptc-rays'); rays.setAttribute('aria-hidden', 'true'); box.appendChild(rays);
  const conf = _ptEl('div', 'ptc-conf'); conf.setAttribute('aria-hidden', 'true');
  const cols = ['#f2607a', '#f6d35e', '#7cc0ea', '#7fd1ae', '#b39ce6', '#f08a3c'];
  for (let i = 0; i < 26; i++) { const c = _ptEl('i'); c.style.cssText = `--x:${(Math.random() * 100).toFixed(1)}%;--d:${(Math.random() * 500).toFixed(0)}ms;--r:${(Math.random() * 540 - 270).toFixed(0)}deg;--c:${cols[i % cols.length]}`; conf.appendChild(c); }
  box.appendChild(conf);
  const card = _ptEl('div', 'ptc-card ptr-' + (PET_RARITY[sp.rar || 0] || PET_RARITY[0]).id);
  const art = _ptEl('div', 'ptc-art');
  art.innerHTML = petSvg(petRosterLook(id), { size: 240, pose: 'sit', mood: { eyes: 'sparkle', mouth: 'open', extra: 'sparkle' }, motion: _ptMotionOk(), crop: 'none', cls: 'pt-fun-full pt-act-jump' });
  card.appendChild(art);
  card.appendChild(_ptEl('div', 'ptc-rar', (PET_RARITY[sp.rar || 0] || PET_RARITY[0]).label));
  card.appendChild(_ptEl('h2', 'ptc-name', sp.label));
  const acts = _ptEl('div', 'ptc-acts');
  const close = () => { clearTimeout(box._t); box.remove(); _ptCeleb.open = false; document.removeEventListener('keydown', onKey, true); setTimeout(_ptCelebNext, 260); };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  document.addEventListener('keydown', onKey, true);
  const be = uiButton({ label: 'Be with me', icon: 'heart', kind: 'primary', run: () => { petChoose(id); close(); if (/^pet(:|$)/.test(String(state.view || ''))) _ptRefresh(); } });
  const later = uiButton({ label: 'Later', icon: 'check', kind: 'ghost', run: close });
  acts.append(be, later);
  card.appendChild(acts);
  box.appendChild(card);
  box.onclick = (e) => { if (e.target === box || e.target === rays) close(); };
  document.body.appendChild(box);
  be.focus();
  _ptCheer(card, { kind: 'unlock' });
  box._t = setTimeout(close, 14000);
}
if (typeof document !== 'undefined') {
  document.addEventListener('opendash:pet-new', () => {
    try {
      if (_ptFun() === 'off') { petCelebrationsTake(); return; }
      for (const id of petCelebrationsTake()) petCelebrate(id);
    } catch (e) { console.error('[pets] celebration', e); }
  });
}
