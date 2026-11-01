/* ============================================================
   PLAY: the games. Today's riddle, skipping stones, pet agility, four in a row, birdsong and tunes, the patchwork map. docs/dev/HUNDRED_PLAY.md 5, 12-16, 22.
   Each is a dialog with its own small loop, which stops when the dialog goes (gpLoop). They pay tickets, never coins.
   ============================================================ */

/* ---------- today's riddle ---------- */
function _gpRiddlePool() {
  if (_gp.pool) return _gp.pool;
  const out = [], word = (c) => { try { const r = GARDEN_CATS[c]; return (r && r.label) || c; } catch (e) { return c; } };
  for (const p of GARDEN_PLANTS) if (!p.retired && p.special !== 'heart' && p.blurb) out.push({ id: 'p:' + p.id, name: p.name, kind: word(p.cat), rar: p.rarity, seasons: p.seasons || [], blurb: p.blurb, art: (px) => gardenIconSvg(p.id, { kind: 'plant', stage: 4, px }) });
  for (const f of GARDEN_FISH) if (f.cat === 'fish' && f.blurb) out.push({ id: 'f:' + f.id, name: f.name, kind: 'Fish', rar: f.rarity, seasons: f.seasons || [], blurb: f.blurb, art: (px) => gardenCatchSvg('fish', f.id, px, { uid: 'gpr' + f.id }) });
  for (const b of GARDEN_BUGS) if (b.blurb) out.push({ id: 'b:' + b.id, name: b.name, kind: 'Bug', rar: b.rarity, seasons: b.seasons || [], blurb: b.blurb, art: (px) => gardenCatchSvg('bug', b.id, px, { uid: 'gpr' + b.id, glow: false }) });
  _gp.pool = out;
  return out;
}
function gpRiddleToday(day) { const pool = _gpRiddlePool(); return pool[gpDayHash('riddle', day) % pool.length]; }
function _gpRiddleState() { const s = gpGet('rd.' + _gdToday()); return s && Array.isArray(s.g) ? s : { g: [], w: 0 }; }
function _gpMask(text, name) { let t = String(text); for (const w of String(name).split(/\s+/)) if (w.length > 2) t = t.replace(new RegExp(w.replace(/[^a-zA-Z]/g, ''), 'gi'), '…'); return t; }
function _gpRiddleOpen() {
  gpStage('Today’s riddle', (el) => {
    const A = gpRiddleToday(), byId = new Map(_gpRiddlePool().map(x => [x.id, x]));
    const seasonsWord = (s) => (!s.length || s.length >= 4 ? 'at any time of year' : `in ${s.join(' and ')}`);
    const clues = [
      `It is in the garden’s books under: ${A.kind}.`,
      `It is ${A.rar}, and you are most likely to meet it ${seasonsWord(A.seasons)}.`,
      'Here is its outline.',
      `Its name starts with ${A.name[0]} and has ${A.name.replace(/\s/g, '').length} letters.`,
      `Somebody once wrote of it: “${_gpMask(A.blurb, A.name)}”`,
      'Last clue: here it is. You just need its name.',
    ];
    const paint = () => {
      el.textContent = '';
      const S = _gpRiddleState(), over = S.w || S.g.length >= 6, shown = over ? 6 : Math.min(6, S.g.length + 1);
      el.appendChild(gpEl('p', 'gp-lead', 'One living thing a day, the same for everyone. Every wrong guess tells you what it got right, and gives one more clue.'));
      const list = gpEl('ol', 'gp-clues');
      clues.slice(0, shown).forEach((c, i) => { const li = gpEl('li', '', c); if (i === 2 || i === 5) { const a = gpEl('div', i === 2 && !over ? 'gp-sil' : 'gp-art'); a.innerHTML = A.art(i === 5 || over ? 96 : 84); li.appendChild(a); } list.appendChild(li); });
      el.appendChild(list);
      for (const id of S.g) {
        const G = byId.get(id); if (!G) continue;
        const row = gpEl('div', 'gp-guess'); row.appendChild(gpEl('b', '', G.name));
        const chip = (ok, t) => row.appendChild(gpEl('span', 'gp-chip ' + (ok ? 'is-yes' : 'is-no'), t));
        if (G.id === A.id) chip(true, 'That is it');
        else { chip(G.kind === A.kind, G.kind === A.kind ? `Also ${A.kind.toLowerCase()}` : `Not ${G.kind.toLowerCase()}`); chip(G.rar === A.rar, G.rar === A.rar ? `${A.rar} too` : `Not ${G.rar}`); const both = G.seasons.some(s => A.seasons.includes(s)) || !A.seasons.length || !G.seasons.length; chip(both, both ? 'Season fits' : 'Wrong season'); row.appendChild(gpEl('span', 'gp-chip', G.name < A.name ? 'Later in the alphabet' : 'Earlier in the alphabet')); }
        el.appendChild(row);
      }
      if (over) {
        const end = gpEl('div', 'gp-result');
        end.appendChild(gpEl('b', '', S.w ? `${A.name}. Solved in ${S.g.length} of 6.` : `It was the ${A.name}. Tomorrow there is another.`));
        end.appendChild(gpEl('p', 'muted', A.blurb));
        const line = `Today’s riddle in Freeflo: ${S.w ? S.g.length : 'X'} of 6  ${S.g.map((x, i) => (S.w && i === S.g.length - 1 ? '●' : '○')).join('')}`;
        end.appendChild(uiButton({ label: 'Copy my result for a friend', icon: 'copy', size: 'sm', run: () => copyText(line, 'Your result') }));
        el.appendChild(end);
        return;
      }
      const wrap = gpEl('div', 'gp-guessbox'), inp = gpEl('input', 'control'); inp.placeholder = 'Type a plant, fish or bug'; inp.setAttribute('aria-label', 'Your guess');
      const sug = gpEl('div', 'gp-sug');
      const guess = (x) => {
        const s = _gpRiddleState(); if (s.g.includes(x.id)) return;
        s.g.push(x.id); if (x.id === A.id) s.w = 1;
        gpSet('rd.' + _gdToday(), s);
        if (s.w) { const r = gpPay('riddle', { tickets: 7 - s.g.length, xp: 3 }); gpTone([523, 659, 784, 1047]); const n = gpPaidLine(r); if (n) toast(`Solved. ${n}.`, { icon: 'ticket' }); }
        paint();
      };
      const fill = () => {
        sug.textContent = ''; const q = inp.value.trim().toLowerCase(); if (!q) return;
        const S2 = _gpRiddleState(), hits = _gpRiddlePool().filter(x => x.name.toLowerCase().includes(q) && !S2.g.includes(x.id)).slice(0, 6);
        if (!hits.length) sug.appendChild(gpEl('span', 'muted', 'Nothing in the books by that name.'));
        for (const h of hits) sug.appendChild(uiButton({ label: h.name, size: 'sm', run: () => guess(h) }));
      };
      inp.oninput = fill;
      inp.onkeydown = (e) => { if (e.key === 'Enter') { const b = sug.querySelector('button'); if (b) b.click(); } };
      wrap.append(inp, sug); el.appendChild(wrap);
      setTimeout(() => { try { inp.focus(); } catch (e) { /* fine */ } }, 0);
    };
    paint();
  }, { size: 'md' });
}
gardenPlayAdd({ id: 'riddle', name: 'Today’s riddle', icon: 'puzzle', group: 'games', blurb: 'Guess the living thing from its clues. A new one each day.',
  status: () => { const S = _gpRiddleState(); return S.w ? `Solved in ${S.g.length}` : S.g.length >= 6 ? 'Done for today' : S.g.length ? `${S.g.length} guesses so far` : 'New today'; }, open: _gpRiddleOpen });

/* ---------- skipping stones ---------- */
function _gpStonesOpen() {
  gpStage('Skipping stones', (el) => {
    el.appendChild(gpEl('p', 'gp-lead', 'Press and hold to wind up, and let go to throw. Then press again just as the stone reaches its shadow to keep it going.'));
    const cv = gpEl('canvas', 'gp-canvas'); cv.width = 720; cv.height = 300; cv.tabIndex = 0; el.appendChild(cv);
    const line = gpEl('p', 'gp-scoreline', ''); el.appendChild(line);
    const g = cv.getContext('2d'), WY = 190;
    const S = { ph: 'ready', p: 0, pd: 1, x: 0, y: 0, vx: 0, vy: 0, skips: 0, rings: [], press: -9, t: 0, cam: 0, perfect: 0, msg: '' };
    const say = () => { const b = gpGet('best.stones'); line.textContent = (S.ph === 'done' ? `${S.skips} skip${S.skips === 1 ? '' : 's'}. ${S.msg} ` : '') + (b ? `Your best: ${b}.` : ''); };
    const down = () => {
      if (S.ph === 'ready' || S.ph === 'done') { Object.assign(S, { ph: 'hold', p: 0, pd: 1, x: 0, y: -50, skips: 0, rings: [], cam: 0, perfect: 0, msg: '' }); say(); return; }
      if (S.ph === 'fly') S.press = S.t;
    };
    const up = () => { if (!cv.isConnected) { window.removeEventListener('pointerup', up); return; } if (S.ph !== 'hold') return; const pw = Math.max(0.15, S.p); Object.assign(S, { ph: 'fly', vx: 220 + 300 * pw, vy: -60 - 60 * pw, x: 0, y: -50 }); };
    cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.focus(); down(); });
    window.addEventListener('pointerup', up);
    cv.addEventListener('keydown', (e) => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); down(); } });
    cv.addEventListener('keyup', (e) => { if (e.code === 'Space') { e.preventDefault(); up(); } });
    setTimeout(() => cv.focus(), 0);
    const finish = () => {
      S.ph = 'done';
      const best = gpBest('stones', S.skips), n = Number(gpGet('st.' + _gdToday(), 0)) + 1; gpSet('st.' + _gdToday(), n);
      const r = n <= 6 ? gpPay('stones', { tickets: Math.min(4, Math.floor(S.skips / 3)), xp: S.skips >= 5 ? 1 : 0 }) : { tickets: 0 };
      S.msg = (best && S.skips ? 'Your best yet. ' : '') + (gpPaidLine(r) ? gpPaidLine(r) + '. ' : '') + 'Press to throw again.';
      say();
    };
    gpLoop(cv, (dt) => {
      S.t += dt;
      if (S.ph === 'hold') { S.p += S.pd * dt * 1.5; if (S.p >= 1) { S.p = 1; S.pd = -1; } if (S.p <= 0) { S.p = 0; S.pd = 1; } }
      if (S.ph === 'fly') {
        S.vy += 340 * dt; S.x += S.vx * dt; S.y += S.vy * dt;
        if (S.y >= 0) {
          const hit = S.t - S.press < 0.17; S.press = -9;
          S.skips++; S.rings.push({ x: S.x, r: 4, a: 1 });
          if (hit) { S.perfect++; gpTone([660 + S.skips * 30], { len: 0.14, vol: 0.04 }); }
          else gpTone([330], { len: 0.1, vol: 0.03 });
          S.y = 0; S.vy = -Math.abs(S.vy) * (hit ? 0.92 : 0.6); S.vx *= hit ? 0.98 : 0.8;
          if (Math.abs(S.vy) < 42 || S.vx < 70) { S.ph = 'sink'; S.sink = 0; }
        }
      }
      if (S.ph === 'sink') { S.sink += dt; if (S.sink > 0.5) finish(); }
      for (const r of S.rings) { r.r += 34 * dt; r.a -= 0.55 * dt; }
      S.rings = S.rings.filter(r => r.a > 0);
      S.cam += (Math.max(0, S.x - 240) - S.cam) * Math.min(1, dt * 4);
      const sky = g.createLinearGradient(0, 0, 0, WY); sky.addColorStop(0, '#9fd4f2'); sky.addColorStop(1, '#f6efe0'); g.fillStyle = sky; g.fillRect(0, 0, 720, WY);
      g.fillStyle = '#8fb08a'; g.beginPath(); g.moveTo(0, WY); for (let i = 0; i <= 720; i += 40) g.lineTo(i, WY - 26 - 16 * Math.sin((i + S.cam * 0.15) / 70)); g.lineTo(720, WY); g.fill();
      const wa = g.createLinearGradient(0, WY, 0, 300); wa.addColorStop(0, '#6fb6d0'); wa.addColorStop(1, '#2c6f9e'); g.fillStyle = wa; g.fillRect(0, WY, 720, 110);
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5; for (let i = 0; i < 26; i++) { const x = ((i * 67 - S.cam * (0.6 + (i % 3) * 0.2)) % 760 + 760) % 760 - 20, y = WY + 12 + (i * 37) % 90; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 16 + i % 12, y); g.stroke(); }
      const sx = 40 + S.x - S.cam, sy = WY + 44 + S.y;
      for (const r of S.rings) { g.strokeStyle = `rgba(255,255,255,${r.a})`; g.lineWidth = 2; g.beginPath(); g.ellipse(40 + r.x - S.cam, WY + 44, r.r * 1.5, r.r * 0.45, 0, 0, 6.3); g.stroke(); }
      if (S.ph === 'fly' || S.ph === 'hold') {
        g.fillStyle = 'rgba(10,30,50,.35)'; const sc = Math.max(0.35, 1 + S.y / 120); g.beginPath(); g.ellipse(sx, WY + 46, 9 * sc, 3 * sc, 0, 0, 6.3); g.fill();
        g.fillStyle = '#7d8790'; g.beginPath(); g.ellipse(sx, sy, 9, 5, S.t * 7, 0, 6.3); g.fill(); g.fillStyle = '#aab4ba'; g.beginPath(); g.ellipse(sx - 2, sy - 1, 4, 2, S.t * 7, 0, 6.3); g.fill();
      }
      g.fillStyle = '#5a7a48'; g.fillRect(-10 - S.cam, WY - 6, 50, 120);
      if (S.ph === 'hold') { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(16, 16, 200, 14); g.fillStyle = S.p > 0.8 ? '#f2b01e' : '#7fbf5a'; g.fillRect(16, 16, 200 * S.p, 14); }
      g.fillStyle = '#10324a'; g.font = 'bold 22px system-ui'; if (S.ph !== 'hold' && S.ph !== 'ready') g.fillText(String(S.skips), 680 - (S.skips > 9 ? 12 : 0), 34);
      if (S.ph === 'ready') { g.fillStyle = '#10324a'; g.font = '16px system-ui'; g.textAlign = 'center'; g.fillText('Press and hold', 360, 110); g.textAlign = 'left'; }
    });
    say();
  });
}
gardenPlayAdd({ id: 'stones', name: 'Skipping stones', icon: 'circle-dot', group: 'games', blurb: 'Throw one, then keep it going, one touch at a time.', status: () => { const b = gpGet('best.stones'); return b ? `Best: ${b} skips` : ''; }, open: _gpStonesOpen });

/* ---------- pet agility ---------- */
const GP_RUN_LEN = 40;
function _gpRunOpen() {
  gpStage('Pet agility', (el) => {
    const pet = gpPet(); if (!pet) { gpNeedPet(el); return; }
    if (gpPetAway()) { el.appendChild(gpEl('p', 'muted', `${pet.name} is on a journey.`)); return; }
    el.appendChild(gpEl('p', 'gp-lead', `${pet.name} runs the course. Press Space, or click, to jump the hurdles. Take the treats. A clean round wins gold.`));
    const box = gpEl('div', 'gp-run'); box.tabIndex = 0;
    const cv = gpEl('canvas', 'gp-canvas'); cv.width = 720; cv.height = 260;
    const pv = gpEl('div', 'gp-runpet'); pv.innerHTML = petSvg(pet.look, { size: 78, pose: 'walk', mood: { eyes: 'happy', mouth: 'open' }, motion: true });
    const root = pv.firstChild; if (root && root.classList) root.classList.add('pt-live', 'pt-run');
    box.append(cv, pv); el.appendChild(box);
    const line = gpEl('p', 'gp-scoreline'); el.appendChild(line);
    const g = cv.getContext('2d'), GY = 214, S = { on: false, over: false, t: 0, y: 0, vy: 0, dist: 0, next: 1, obs: [], treats: 0, faults: 0, stumble: 0, seed: gardenRand('gprun|' + Date.now()) };   // clock-ok: a new course each time
    const say = (t) => { line.textContent = t; };
    const jump = () => { if (S.over) return; if (!S.on) { S.on = true; say(''); return; } if (S.y >= 0) { S.vy = -520; gpTone([392], { len: 0.08, vol: 0.03 }); } };
    box.addEventListener('pointerdown', (e) => { e.preventDefault(); box.focus(); jump(); });
    box.addEventListener('keydown', (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); } });
    setTimeout(() => box.focus(), 0);
    say('Press Space to start.');
    const finish = () => {
      S.over = true;
      const tier = S.faults <= 1 ? 'gold' : S.faults <= 3 ? 'silver' : 'bronze', word = { gold: 'Gold', silver: 'Silver', bronze: 'Bronze' }[tier];
      const pts = S.treats * 2 - S.faults * 3; gpBest('run', pts);
      const n = Number(gpGet('ru.' + _gdToday(), 0)) + 1; gpSet('ru.' + _gdToday(), n);
      const r = n <= 3 ? gpPay('agility', { tickets: { gold: 6, silver: 4, bronze: 3 }[tier], xp: 2 }) : { tickets: 0 };
      const first = gpGrant('ros-' + tier, { ['decor:play-ros-' + tier]: 1 });
      if (n <= 3) { try { petBondGive('play'); } catch (e) { /* fine */ } }
      gpTone(tier === 'gold' ? [523, 659, 784, 1047] : [523, 659]);
      say(`${word}! ${S.treats} treats, ${S.faults} knocked hurdles. ${gpPaidLine(r)}${first ? `. A ${word.toLowerCase()} rosette is in your bag, to stand in the garden.` : ''}`);
      const again = uiButton({ label: 'Run it again', icon: 'rotate-cw', size: 'sm', run: () => { setTimeout(_gpRunOpen, 0); } }); el.appendChild(again);
    };
    gpLoop(box, (dt) => {
      const sp = (250 + S.t * 3.6) * (S.stumble > 0 ? 0.45 : 1);
      if (S.on && !S.over) {
        S.t += dt; S.dist += sp * dt; S.stumble = Math.max(0, S.stumble - dt);
        S.vy += 1500 * dt; S.y += S.vy * dt; if (S.y > 0) { S.y = 0; S.vy = 0; }
        S.next -= dt;
        if (S.next <= 0 && S.t < GP_RUN_LEN - 2) {
          const r = S.seed();
          if (r < 0.72) S.obs.push({ k: 'h', x: 740, h: 28 + S.seed() * 14 }); else S.obs.push({ k: 't', x: 740, up: S.seed() < 0.6 ? 86 : 16 });
          S.next = 0.85 + S.seed() * 0.95;
        }
        for (const o of S.obs) {
          o.x -= sp * dt;
          const near = o.x > 118 && o.x < 168;
          if (o.k === 'h' && near && !o.done && S.y > -o.h + 6) { o.done = true; o.hit = true; S.faults++; S.stumble = 0.5; gpTone([150], { len: 0.14, vol: 0.05 }); }
          if (o.k === 't' && near && !o.done && Math.abs(-S.y - o.up + 16) < 44) { o.done = true; o.got = true; S.treats++; gpTone([880], { len: 0.09, vol: 0.03 }); }
        }
        S.obs = S.obs.filter(o => o.x > -40 && !o.got);
        if (S.t >= GP_RUN_LEN) finish();
      }
      pv.style.transform = `translateY(${Math.round(S.y)}px) rotate(${S.stumble > 0 ? -8 : S.y < 0 ? -5 : 0}deg)`;
      if (root && root.classList) root.classList.toggle('pt-run', S.on && !S.over);
      const sky = g.createLinearGradient(0, 0, 0, GY); sky.addColorStop(0, '#bfe2f4'); sky.addColorStop(1, '#f6f2dc'); g.fillStyle = sky; g.fillRect(0, 0, 720, 260);
      g.fillStyle = '#a8cf88'; g.beginPath(); g.moveTo(0, GY); for (let i = 0; i <= 720; i += 30) g.lineTo(i, GY - 34 - 16 * Math.sin((i + S.dist * 0.2) / 90)); g.lineTo(720, GY); g.fill();
      g.fillStyle = '#7fb45a'; g.fillRect(0, GY, 720, 46);
      g.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 12; i++) { g.fillRect(((i * 74 - S.dist) % 888 + 888) % 888 - 80, GY + 8, 34, 4); }
      for (const o of S.obs) {
        if (o.k === 'h') { g.fillStyle = '#8a5e36'; g.fillRect(o.x - 15, GY - o.h, 5, o.h); g.fillRect(o.x + 10, GY - o.h, 5, o.h); g.save(); g.translate(o.x, GY - o.h + 2); if (o.hit) g.rotate(0.5); g.fillStyle = '#d8453a'; g.fillRect(-20, -3, 40, 6); g.fillStyle = '#f4f2e8'; g.fillRect(-7, -3, 14, 6); g.restore(); }
        else { g.fillStyle = '#c8803c'; g.beginPath(); g.arc(o.x, GY - o.up, 10, 0, 6.3); g.fill(); g.fillStyle = '#6a4a2c'; for (const [a, b] of [[-3, -3], [3, -1], [-1, 4]]) { g.beginPath(); g.arc(o.x + a, GY - o.up + b, 1.6, 0, 6.3); g.fill(); } }
      }
      g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(16, 14, 688, 6); g.fillStyle = '#f2b01e'; g.fillRect(16, 14, 688 * Math.min(1, S.t / GP_RUN_LEN), 6);
      g.fillStyle = '#20402a'; g.font = 'bold 15px system-ui'; g.fillText(`Treats ${S.treats}   Knocked ${S.faults}`, 16, 42);
    });
  });
}
gardenPlayAdd({ id: 'agility', name: 'Pet agility', icon: 'footprints', group: 'pet', blurb: 'Your pet, a course, and three rosettes to win.', status: () => { const b = gpGet('best.run'); return b != null ? `Best round: ${b}` : ''; }, open: _gpRunOpen });

/* ---------- four in a row, against your pet ---------- */
const GP4 = Object.freeze({ W: 7, H: 6 });
function gp4Drop(b, c) { for (let r = GP4.H - 1; r >= 0; r--) if (!b[r][c]) return r; return -1; }
function gp4Line(b, r, c) {
  const v = b[r][c]; if (!v) return null;
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const cells = [[r, c]];
    for (const s of [1, -1]) { let y = r + dr * s, x = c + dc * s; while (y >= 0 && y < GP4.H && x >= 0 && x < GP4.W && b[y][x] === v) { cells.push([y, x]); y += dr * s; x += dc * s; } }
    if (cells.length >= 4) return cells;
  }
  return null;
}
function _gp4WinAt(b, v) { for (let c = 0; c < GP4.W; c++) { const r = gp4Drop(b, c); if (r < 0) continue; b[r][c] = v; const w = gp4Line(b, r, c); b[r][c] = 0; if (w) return c; } return -1; }
/** The pet's move: wins when it sees it, and blocks only as often as it is paying attention. */
function gp4PetMove(b, focus, rnd) {
  const win = _gp4WinAt(b, 2); if (win >= 0 && rnd() < focus + 0.25) return win;
  const blk = _gp4WinAt(b, 1); if (blk >= 0 && rnd() < focus) return blk;
  const open = []; for (let c = 0; c < GP4.W; c++) if (gp4Drop(b, c) >= 0) open.push(c);
  const scored = open.map(c => { const r = gp4Drop(b, c); b[r][c] = 2; b[r][c] = 0; let s = 3 - Math.abs(3 - c) + rnd() * 5; if (r > 0) { b[r][c] = 2; const give = _gp4WinAt(b, 1) >= 0; b[r][c] = 0; if (give && rnd() < focus) s -= 6; } return [s, c]; });
  scored.sort((x, y) => y[0] - x[0]);
  return scored.length ? scored[0][1] : -1;
}
function _gp4Open() {
  gpStage('Four in a row', (el) => {
    const pet = gpPet(); if (!pet) { gpNeedPet(el); return; }
    let bond = 1; try { bond = petBondOf(pet.look.species).level; } catch (e) { /* fine */ }
    const night = gardenModel().tod === 'night', focus = Math.max(0.25, Math.min(0.92, 0.45 + bond * 0.06 - (night ? 0.2 : 0)));
    const THINK = night ? ['It yawns, and looks at the wrong side of the board.', 'Its eyes are closing. It puts one in anyway.', 'It has forgotten whose turn it is.'] : ['It stares at the board for a long time.', 'It sniffs one of the pieces.', 'It looks at you to see if you are looking.', 'It puts a paw out, takes it back, and puts it out again.', 'It seems to have a plan. It may not.'];
    const rnd = gardenRand('gp4|' + Date.now());   // clock-ok: a new game each time
    let b = Array.from({ length: GP4.H }, () => Array(GP4.W).fill(0)), turn = 1, done = false, win = null;
    const top = gpEl('div', 'gp-4top'); top.innerHTML = `${gpPetSvg(pet, 70, 'sit', { eyes: 'open', mouth: 'smile' })}<p class="gp-4say" role="status"></p>`;
    const say = (t) => { top.querySelector('.gp-4say').textContent = t; };
    const board = gpEl('div', 'gp-4board'); board.setAttribute('role', 'grid'); board.setAttribute('aria-label', 'The board');
    el.append(top, board);
    const end = (who) => {
      done = true;
      if (who === 1) { const n = Number(gpGet('f4.' + _gdToday(), 0)) + 1; gpSet('f4.' + _gdToday(), n); const r = n <= 3 ? gpPay('four', { tickets: 3, xp: 1 }) : { tickets: 0 }; gpSet('f4wins', Number(gpGet('f4wins', 0)) + 1); say(`You win. ${pet.name} looks at the board as if it had never seen it before. ${gpPaidLine(r)}`); gpTone([523, 659, 784]); }
      else if (who === 2) { gpSet('f4loss', Number(gpGet('f4loss', 0)) + 1); say(`${pet.name} wins, and is as surprised as you are.`); try { const P = gpPetMe(); if (P) P.hearts(); } catch (e) { /* fine */ } }
      else say('Nobody wins. It is a very full board.');
      el.appendChild(uiButton({ label: 'Play again', icon: 'rotate-cw', size: 'sm', run: () => { setTimeout(_gp4Open, 0); } }));
    };
    const place = (c, v) => {
      const r = gp4Drop(b, c); if (r < 0) return false;
      b[r][c] = v; win = gp4Line(b, r, c); paint();
      if (win) { end(v); return true; }
      if (b[0].every(Boolean)) { end(0); return true; }
      return true;
    };
    const petTurn = () => {
      say(THINK[Math.floor(rnd() * THINK.length)]);
      setTimeout(() => {
        if (!board.isConnected || done) return;
        place(gp4PetMove(b, focus, rnd), 2);
        gpTone([294], { len: 0.1, vol: 0.03 });
        if (!done) { turn = 1; say('Your turn.'); paint(); }
      }, 900 + rnd() * 900);
    };
    const paint = () => {
      board.textContent = '';
      for (let c = 0; c < GP4.W; c++) {
        const col = gpEl('button', 'gp-4col'); col.type = 'button'; col.disabled = done || turn !== 1 || gp4Drop(b, c) < 0; col.setAttribute('aria-label', `Column ${c + 1}`);
        for (let r = 0; r < GP4.H; r++) { const d = gpEl('i', 'gp-4d' + (b[r][c] ? ' is-' + b[r][c] : '') + (win && win.some(([y, x]) => y === r && x === c) ? ' is-win' : '')); col.appendChild(d); }
        col.onclick = () => { if (turn !== 1 || done) return; if (place(c, 1) && !done) { turn = 2; paint(); petTurn(); } gpTone([440], { len: 0.09, vol: 0.03 }); };
        board.appendChild(col);
      }
    };
    say(`${night ? `${pet.name} is sleepy. ` : ''}You go first: yours are the red ones.`);
    paint();
  }, { size: 'md' });
}
gardenPlayAdd({ id: 'four', name: 'Four in a row', icon: 'gamepad-2', group: 'pet', blurb: 'Against your pet, who thinks hard. It plays better as you bond, and worse at bedtime.', status: () => { const w = Number(gpGet('f4wins', 0)), l = Number(gpGet('f4loss', 0)); return w + l ? `You ${w}, your pet ${l}` : ''; }, open: _gp4Open });

/* ---------- birdsong and tunes ---------- */
const GP_NOTES = Object.freeze([523.25, 587.33, 659.25, 783.99, 880]);
const GP_TUNES = Object.freeze([
  { id: 'bird', name: 'Come here, bird', at: 4, seq: [0, 2, 4, 2], words: 'A bird comes to see who is calling.', run() { const ids = ['robin', 'goldfinch', 'blackbird', 'wren', 'sparrow'].filter(x => GL_CREATURE.has(x)); if (!ids.length) return false; return !!gardenLifeSpawn(ids[Math.floor(Math.random() * ids.length)]); } },
  { id: 'pet', name: 'Dance, you', at: 6, seq: [4, 3, 4, 1, 2], words: 'Your pet cannot help itself.', run() { const P = gpPetMe(); if (!P) return false; let n = 3; const go = () => { if (n-- <= 0) { P.sit(); P.busy = 1; if (P.hearts) P.hearts(); return; } P.clip('jump', 700, go); }; P.sit({ eyes: 'happy', mouth: 'open' }); go(); return true; } },
  { id: 'rain', name: 'Small rain', at: 8, seq: [2, 1, 0, 1, 2, 2], once: true, words: 'Once a day, a little rain falls on everything that is thirsty.', run() { const g = _gdG(), m = gardenModel(), now = _gdNow(); let n = 0; for (const p of m.plants) if (p.thirsty && g.plants[p.uid]) { g.plants[p.uid].w = now; n++; } _gdSave(); gpNote(n ? `It rains, a little, on ${n} thirsty plant${n === 1 ? '' : 's'}.` : 'A little rain falls. Nothing was thirsty, but it is nice.'); return true; } },
]);
function _gpSongOpen() {
  gpStage('Birdsong', (el) => {
    el.appendChild(gpEl('p', 'gp-lead', 'A bird sings a little more each time. Sing it back with the bells, or the keys 1 to 5. Get far enough and it teaches you a tune that does something.'));
    const stage = gpEl('div', 'gp-song'), birdEl = gpEl('div', 'gp-bird'), bells = gpEl('div', 'gp-bells'), line = gpEl('p', 'gp-scoreline'), tunes = gpEl('div', 'gp-tunes');
    birdEl.innerHTML = '<svg viewBox="0 0 64 64" width="72" aria-hidden="true"><path d="M8 52h48" stroke="#7a5230" stroke-width="4" stroke-linecap="round"/><ellipse cx="30" cy="34" rx="16" ry="13" fill="#b5764a"/><ellipse cx="29" cy="39" rx="10" ry="8" fill="#e8743c"/><circle cx="42" cy="24" r="9" fill="#b5764a"/><circle cx="45" cy="22" r="1.800" fill="#231a14"/><path d="M50 24l8 1-8 3z" fill="#e8b83c"/><path d="M14 34l-9 8 13-1z" fill="#7a5230"/><path d="M28 47v5M34 47v5" stroke="#6a4a2c" stroke-width="2"/></svg>';
    stage.append(birdEl, bells); el.append(stage, line, tunes);
    const S = { seq: [], at: 0, mode: 'ready', rnd: gardenRand('gps|' + Date.now()), heard: [] };   // clock-ok: a new song each time
    const flash = (i, ms) => { const b = bells.children[i]; if (!b) return; b.classList.add('is-on'); setTimeout(() => b.classList.remove('is-on'), ms || 260); };
    const known = (T) => Number(gpGet('best.song', 0)) >= T.at;
    const paintTunes = () => {
      tunes.textContent = '';
      tunes.appendChild(gpEl('h3', 'gp-h', 'Tunes you know'));
      for (const T of GP_TUNES) {
        const row = gpEl('div', 'gp-tune' + (known(T) ? '' : ' is-locked'));
        if (known(T)) { row.innerHTML = `<b>${esc(T.name)}</b><span class="gp-dots">${T.seq.map(i => `<i data-n="${i + 1}">${i + 1}</i>`).join('')}</span><span class="muted">${esc(T.words)} Play it on the bells.</span>`; }
        else row.innerHTML = `<b>A tune you have not learnt</b><span class="muted">Sing back ${T.at} notes and the bird will teach you.</span>`;
        tunes.appendChild(row);
      }
    };
    const checkTune = () => {
      for (const T of GP_TUNES) {
        if (!known(T)) continue;
        const tail = S.heard.slice(-T.seq.length);
        if (tail.length !== T.seq.length || tail.some((x, i) => x !== T.seq[i])) continue;
        S.heard = [];
        if (T.once) { const k = 'tn.' + T.id + '.' + _gdToday(); if (gpGet(k)) { line.textContent = 'That one works once a day. Try again tomorrow.'; return; } gpSet(k, 1); }
        if (typeof _dialogClose === 'function' && _dialogClose) _dialogClose();
        if (!gpInWorld() || !T.run()) gpNote('Nothing came of it this time. Try it again in your garden, by day.');
        return;
      }
    };
    const playback = () => {
      S.mode = 'bird'; S.at = 0; line.textContent = 'Listen.'; birdEl.classList.add('is-sing');
      S.seq.forEach((n, i) => setTimeout(() => { if (!el.isConnected) return; flash(n); gpTone([GP_NOTES[n]], { force: true, len: 0.35, vol: 0.08 }); }, 500 + i * 480));
      setTimeout(() => { if (!el.isConnected) return; S.mode = 'you'; birdEl.classList.remove('is-sing'); line.textContent = `Your turn: ${S.seq.length} note${S.seq.length === 1 ? '' : 's'}.`; }, 500 + S.seq.length * 480);
    };
    const next = () => { S.seq.push(Math.floor(S.rnd() * 5)); playback(); };
    const press = (i) => {
      flash(i, 180); gpTone([GP_NOTES[i]], { force: true, len: 0.35, vol: 0.08 });
      if (S.mode !== 'you') { S.heard.push(i); if (S.heard.length > 8) S.heard.shift(); checkTune(); return; }
      if (S.seq[S.at] !== i) {
        const got = S.seq.length - 1; S.mode = 'ready';
        const best = gpBest('song', got), n = Number(gpGet('sg.' + _gdToday(), 0)) + 1; gpSet('sg.' + _gdToday(), n);
        const r = n <= 5 ? gpPay('song', { tickets: Math.min(5, Math.floor(got / 2)), xp: got >= 4 ? 1 : 0 }) : { tickets: 0 };
        line.textContent = `The bird tilts its head and starts again. You sang back ${got}.${best && got ? ' Your best yet.' : ''} ${gpPaidLine(r)}`;
        paintTunes(); startBtn.hidden = false; return;
      }
      S.at++;
      if (S.at >= S.seq.length) { S.mode = 'wait'; line.textContent = 'Lovely.'; if (S.seq.length >= 1) gpBest('song', S.seq.length); paintTunes(); setTimeout(() => { if (el.isConnected) next(); }, 700); }
    };
    GP_NOTES.forEach((_, i) => { const b = gpEl('button', 'gp-bell gp-bell' + i, String(i + 1)); b.type = 'button'; b.setAttribute('aria-label', `Bell ${i + 1}`); b.onclick = () => press(i); bells.appendChild(b); });
    const keys = (e) => { if (!el.isConnected) { document.removeEventListener('keydown', keys, true); return; } const n = Number(e.key); if (n >= 1 && n <= 5) { e.stopPropagation(); press(n - 1); } };
    document.addEventListener('keydown', keys, true);
    const startBtn = uiButton({ label: 'Listen to the bird', icon: 'bird', kind: 'primary', run: () => { startBtn.hidden = true; S.seq = []; next(); } });
    el.insertBefore(startBtn, tunes);
    line.textContent = 'You can play the bells whenever you like.';
    paintTunes();
  }, { size: 'md' });
}
gardenPlayAdd({ id: 'song', name: 'Birdsong', icon: 'music', group: 'games', blurb: 'Sing back what the bird sings, and learn tunes that do things.', status: () => { const n = GP_TUNES.filter(T => Number(gpGet('best.song', 0)) >= T.at).length; return n ? `${n} of ${GP_TUNES.length} tunes learnt` : ''; }, open: _gpSongOpen });

/* ---------- the patchwork map ---------- */
const GP_LAND = Object.freeze({ M: ['Meadow', '#a9d870'], W: ['Woods', '#4f8a4a'], V: ['Village', '#d8a878'], R: ['River', '#5fa8d8'], F: ['Fields', '#e8d070'] });
const GP_MAP_R = 4, GP_MAP_DECK = 26;
function _gpHexPt(q, r, s) { return [s * 1.5 * q, s * Math.sqrt(3) * (r + q / 2)]; }
const _GP_HEX_NB = Object.freeze([[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]]);   // the six sides, clockwise from lower right
function _gpMapDeck(day) {
  const rnd = gardenRand('gpm|' + day), L = Object.keys(GP_LAND), out = [];
  for (let i = 0; i < GP_MAP_DECK; i++) { const a = L[Math.floor(rnd() * L.length)], b = L[Math.floor(rnd() * L.length)], split = 1 + Math.floor(rnd() * 5), rot = Math.floor(rnd() * 6), t = []; for (let k = 0; k < 6; k++) t[(k + rot) % 6] = k < split ? a : b; out.push(t); }
  return out;
}
function _gpTileSvg(q, r, s, t, cls) {
  const [cx, cy] = _gpHexPt(q, r, s), c = (k) => { const a = Math.PI / 180 * (60 * k); return [cx + s * Math.cos(a), cy + s * Math.sin(a)]; };
  let out = `<g class="${cls || ''}">`;
  for (let k = 0; k < 6; k++) { const p = c(k), n = c(k + 1); out += `<path d="M${cx.toFixed(1)} ${cy.toFixed(1)}L${p[0].toFixed(1)} ${p[1].toFixed(1)}L${n[0].toFixed(1)} ${n[1].toFixed(1)}Z" fill="${GP_LAND[t[k]][1]}"/>`; if (t[k] === 'W') { const mx = (cx * 0.4 + p[0] * 0.3 + n[0] * 0.3), my = (cy * 0.4 + p[1] * 0.3 + n[1] * 0.3); out += `<path d="M${mx.toFixed(1)} ${(my - 6).toFixed(1)}l5 9h-10z" fill="#2f5f3a"/>`; } if (t[k] === 'V') { const mx = (cx * 0.4 + p[0] * 0.3 + n[0] * 0.3), my = (cy * 0.4 + p[1] * 0.3 + n[1] * 0.3); out += `<path d="M${(mx - 4).toFixed(1)} ${(my + 3).toFixed(1)}v-5l4-3 4 3v5z" fill="#f4e6d0" stroke="#a8603a" stroke-width=".8"/>`; } }
  return out + '</g>';
}
function _gpMapOpen() {
  gpStage('Patchwork map', (el) => {
    const day = _gdToday(), deck = _gpMapDeck(day), cells = new Map(), key = (q, r) => q + ',' + r, S = 30;
    let at = 0, rot = 0, score = 0, hover = null, over = false;
    el.appendChild(gpEl('p', 'gp-lead', 'Grow a little country, one piece at a time. Every side that matches its neighbour scores. A piece that matches all round scores extra. Everyone gets the same pieces today.'));
    const wrap = gpEl('div', 'gp-map'), side = gpEl('div', 'gp-mapside'); el.appendChild(wrap);
    const cur = () => { const t = deck[at]; return t ? t.map((_, i) => t[(i - rot + 60) % 6]) : null; };
    const gain = (q, r, t) => { let m = 0, n = 0; _GP_HEX_NB.forEach(([dq, dr], k) => { const o = cells.get(key(q + dq, r + dr)); if (!o) return; n++; if (o[(k + 3) % 6] === t[_gpSideIdx(k)]) m++; }); return { pts: m * 2 + (n === 6 && m === 6 ? 5 : 0), m, n }; };
    const open = () => { const out = []; if (!cells.size) return [[0, 0]]; const seen = new Set(); for (const k of cells.keys()) { const [q, r] = k.split(',').map(Number); for (const [dq, dr] of _GP_HEX_NB) { const a = q + dq, b = r + dr, kk = key(a, b); if (!cells.has(kk) && !seen.has(kk) && Math.max(Math.abs(a), Math.abs(b), Math.abs(a + b)) <= GP_MAP_R) { seen.add(kk); out.push([a, b]); } } } return out; };
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); const size = (GP_MAP_R * 1.5 + 1.2) * S; svg.setAttribute('viewBox', `${-size} ${-size} ${size * 2} ${size * 2}`); svg.setAttribute('class', 'gp-mapsvg'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Your map');
    wrap.append(svg, side);
    const paint = () => {
      let h = '';
      for (const [k, t] of cells) { const [q, r] = k.split(',').map(Number); h += _gpTileSvg(q, r, S - 0.5, t); }
      if (!over) for (const [q, r] of open()) { const [x, y] = _gpHexPt(q, r, S); const on = hover && hover[0] === q && hover[1] === r; if (on && cur()) h += _gpTileSvg(q, r, S - 0.5, cur(), 'gp-ghost'); h += `<circle class="gp-spot${on ? ' is-on' : ''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${S * 0.8}" data-q="${q}" data-r="${r}"/>`; }
      svg.innerHTML = h;
      side.textContent = '';
      const sc = gpEl('div', 'gp-mapscore'); sc.innerHTML = `<b>${score}</b><span>points</span>`; side.appendChild(sc);
      if (over) {
        const b = gpBest('map', score), r0 = gpGet('map.' + day) ? { tickets: 0 } : gpPay('map', { tickets: Math.min(8, Math.floor(score / 12)), xp: 3 }); gpSet('map.' + day, score);
        side.appendChild(gpEl('p', '', `All laid.${b ? ' Your best map yet.' : ''} ${gpPaidLine(r0)}`));
        side.appendChild(uiButton({ label: 'Start again', icon: 'rotate-cw', size: 'sm', run: () => { setTimeout(_gpMapOpen, 0); } }));
        return;
      }
      side.appendChild(gpEl('p', 'muted', `${GP_MAP_DECK - at} pieces left`));
      const pv = gpEl('div', 'gp-mapnext'); pv.innerHTML = `<svg viewBox="-34 -32 68 64" width="96" aria-hidden="true">${_gpTileSvg(0, 0, 30, cur())}</svg>`; side.appendChild(pv);
      side.appendChild(uiButton({ label: 'Turn it', icon: 'rotate-cw', size: 'sm', kbd: 'R', run: () => { rot = (rot + 1) % 6; paint(); } }));
      if (hover && cur()) { const G = gain(hover[0], hover[1], cur()); side.appendChild(gpEl('p', 'muted', G.n ? `Here: ${G.m} of ${G.n} sides match, ${G.pts} points` : 'The first piece can go anywhere')); }
      const key2 = gpEl('div', 'gp-mapkey'); key2.innerHTML = Object.values(GP_LAND).map(([n, c]) => `<span><i style="background:${c}"></i>${esc(n)}</span>`).join(''); side.appendChild(key2);
    };
    svg.addEventListener('pointermove', (e) => { const c = e.target.closest && e.target.closest('.gp-spot'); const nw = c ? [Number(c.dataset.q), Number(c.dataset.r)] : hover; if (c && (!hover || hover[0] !== nw[0] || hover[1] !== nw[1])) { hover = nw; paint(); } });
    svg.addEventListener('click', (e) => {
      const c = e.target.closest && e.target.closest('.gp-spot'); if (!c || over) return;
      const q = Number(c.dataset.q), r = Number(c.dataset.r), t = cur(), G = gain(q, r, t);
      cells.set(key(q, r), t); score += G.pts; at++; rot = 0; hover = null;
      gpTone(G.pts >= 6 ? [659, 784, 988] : G.pts ? [523, 659] : [392], { gap: 0.07, len: 0.16, vol: 0.04 });
      if (at >= GP_MAP_DECK || !open().length) over = true;
      paint();
    });
    const keys = (e) => { if (!el.isConnected) { document.removeEventListener('keydown', keys, true); return; } if ((e.key === 'r' || e.key === 'R') && !over) { e.stopPropagation(); rot = (rot + 1) % 6; paint(); } };
    document.addEventListener('keydown', keys, true);
    paint();
  });
}
/** Which of a tile's six painted wedges faces neighbour k: wedges start at angle 0 and go clockwise; a neighbour sits across the wedge whose middle points at it. */
function _gpSideIdx(k) { return k; }
gardenPlayAdd({ id: 'map', name: 'Patchwork map', icon: 'map', group: 'games', blurb: 'A quiet puzzle: lay pieces to grow a little country.', status: () => { const t = gpGet('map.' + _gdToday()); const b = gpGet('best.map'); return t ? `Today: ${t}` : b ? `Best: ${b}` : ''; }, open: _gpMapOpen });
