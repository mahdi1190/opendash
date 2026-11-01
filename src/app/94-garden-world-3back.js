/* ============================================================
   A ROOM BEHIND THE GARDEN (2.33). A small extra, left for people to find.
   Four garden gnomes round a scarecrow, then a click on the scarecrow: everyone who is in the garden is taken to a stage where four red
   fellows dance and sing, with a song playing. A door on the left takes you back. It is its own little room, drawn over the garden:
   nothing in the garden changes while you are in it, and nothing here is kept.

     gardenBackStep(decor, m)     a click on a decoration in the garden: true when it was a scarecrow with four gnomes round it (and the room opened)
     _eeHear(actor, ev)           somebody else came in, walked or left (gl:fx 'hall': in / at / out; whole units of 16 px on the wire)
     eeTell(fid)                  the host: bring a person who has just arrived along

   The song is a file that is not part of the app: <data>/media/stage.ogg, served by server/routes/garden-room.mjs when it is there. Without it a short
   tune is played by the page itself. Everything drawn comes from the tables and functions below; people's looks go through the avatar kit.
   ============================================================ */
const EE = Object.freeze({ W: 960, H: 600, U: 16, speed: 210, door: Object.freeze({ x: 64, y: 546, x0: 8, x1: 106, y0: 392, y1: 560 }), spawn: Object.freeze({ x: 150, y: 520 }), vol: 0.8, volDefault: 50, fig: 1.3 });
/** The band: where each of the four stands and how it moves (a width to roam, how fast, how high a hop). */
const EE_BAND = Object.freeze([
  Object.freeze({ id: 'sing', x: 392, y: 362, ax: 12, fx: 0.9, hop: 6, tilt: 3, role: 'sing', ph: 0 }),
  Object.freeze({ id: 'gtr', x: 650, y: 352, ax: 46, fx: 0.5, hop: 8, tilt: 5, role: 'gtr', ph: 1.7 }),
  Object.freeze({ id: 'dl', x: 232, y: 338, ax: 96, fx: 0.37, hop: 26, tilt: 10, role: 'dance', ph: 3.1 }),
  Object.freeze({ id: 'dr', x: 770, y: 336, ax: 96, fx: 0.29, hop: 26, tilt: 10, role: 'dance', ph: 4.6 }),
]);
const EE_VOL_KEY = 'ee-vol';
const _ee = { volv: 50, on: false, root: null, svg: null, actors: null, notes: null, raf: 0, last: 0, t: 0, lvl: 0, lvlRaw: 0, m: new Map(), me: null, keys: new Set(), sentAt: 0, pawns: [], ac: null, snd: null, mute: false, left: false, hintT: 0, closing: false };

/* ---------- the red fellows: a pixel pawn, five units to a pixel ---------- */
function _eePawn() {
  const P = 5, rows = [4, 5, 6, 6, 7, 7, 7, 7, 7, 6, 6, 5, 4, 2, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8];
  let base = '', shade = '', light = '';
  rows.forEach((h, i) => {
    const y = (i - rows.length) * P, w = (2 * h + 1) * P, x = -h * P - P / 2;
    base += `M${x} ${y}h${w}v${P}h${-w}z`;
    if (i >= 3) shade += `M${-x - P * (i < 13 ? 2 : 3)} ${y}h${P * (i < 13 ? 2 : 3)}v${P}h${-P * (i < 13 ? 2 : 3)}z`;
    if (i >= 2 && i <= 9) light += `M${x + P} ${y}h${P * 2}v${P}h${-P * 2}z`;
  });
  return `<path d="${base}" fill="#e3171f"/><path d="${shade}" fill="#a60e18"/><path d="${light}" fill="#ff5e66" opacity=".7"/>`
    + '<path d="M-22 -114h10v10h-10zM12 -114h10v10h-10z" fill="#12060a"/>';
}
const _EE_MOUTH_C = '<rect x="-8" y="-94" width="16" height="5" fill="#12060a"/>';
const _EE_MOUTH_O = '<rect x="-9" y="-97" width="18" height="15" rx="3" fill="#12060a"/><rect x="-5" y="-86" width="10" height="3" fill="#8a1a22"/>';
const _EE_PAWN = _eePawn();
function _eeGuitar() {
  return '<g transform="rotate(-42 0 -48)"><rect x="-4" y="-112" width="8" height="64" fill="#7a4a22"/><rect x="-7" y="-124" width="14" height="15" rx="2" fill="#3e2411"/>'
    + '<path d="M-1.5 -110v62M1.5 -110v62" stroke="#e8e0cc" stroke-width="1"/><path d="M-4 -96h8M-4 -84h8M-4 -72h8M-4 -60h8" stroke="#cfa860" stroke-width="1.4"/>'
    + '<ellipse cx="0" cy="-34" rx="19" ry="14" fill="#df8a2e" stroke="#7a4210" stroke-width="3"/><ellipse cx="0" cy="-14" rx="23" ry="17" fill="#df8a2e" stroke="#7a4210" stroke-width="3"/>'
    + '<circle cx="0" cy="-24" r="6" fill="#26140a"/><rect x="-9" y="-9" width="18" height="4" rx="1" fill="#5a3216"/></g>';
}
function _eeStand(x, y) {
  return `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="0" rx="18" ry="5" fill="#000" opacity=".35"/><rect x="-2" y="-104" width="4" height="104" fill="#2c2c34"/>`
    + '<path d="M0 -104Q-12 -112 -26 -100" fill="none" stroke="#2c2c34" stroke-width="3"/><rect x="-36" y="-108" width="14" height="22" rx="6" transform="rotate(24 -29 -97)" fill="#4a4a54" stroke="#12060a" stroke-width="2"/></g>';
}

/* ---------- the room ---------- */
function _eeArt() {
  let s = '<defs>'
    + '<linearGradient id="eew" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e2523"/><stop offset=".55" stop-color="#43161a"/><stop offset="1" stop-color="#2a0c10"/></linearGradient>'
    + '<radialGradient id="eesp" cx=".5" cy=".86" r=".62"><stop offset="0" stop-color="#ffd9a0" stop-opacity=".62"/><stop offset=".6" stop-color="#ff9a5a" stop-opacity=".16"/><stop offset="1" stop-color="#ff9a5a" stop-opacity="0"/></radialGradient>'
    + '<linearGradient id="eeg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6d27a"/><stop offset=".5" stop-color="#b98a3a"/><stop offset="1" stop-color="#7a5322"/></linearGradient>'
    + '<linearGradient id="eecur" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a0a0e"/><stop offset=".5" stop-color="#8a2e30"/><stop offset="1" stop-color="#2a0a0e"/></linearGradient>'
    + '<pattern id="eefold" width="36" height="10" patternUnits="userSpaceOnUse"><rect width="36" height="10" fill="url(#eecur)"/></pattern>'
    + '<linearGradient id="eecar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5c1a1c"/><stop offset="1" stop-color="#2e0b0f"/></linearGradient>'
    + '<linearGradient id="eebeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0c4" stop-opacity=".5"/><stop offset="1" stop-color="#fff0c4" stop-opacity="0"/></linearGradient>'
    + '<linearGradient id="eedoor" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6a3c1e"/><stop offset="1" stop-color="#8a5228"/></linearGradient>'
    + '<clipPath id="eearch"><path d="M72 384V150Q72 40 200 40H760Q888 40 888 150V384Z"/></clipPath></defs>';
  s += '<rect width="960" height="600" fill="#12060a"/>';
  s += '<g clip-path="url(#eearch)"><rect x="60" y="30" width="840" height="360" fill="url(#eew)"/><rect x="60" y="30" width="840" height="360" fill="url(#eesp)"/>';
  // the backdrop: stars on the dark red, and the drapes either side with their gold swags
  for (let i = 0; i < 26; i++) { const x = 250 + ((i * 97) % 460), y = 70 + ((i * 53) % 190); s += `<path d="M${x} ${y - 4}l1.6 3 3.2.6-3.2.7-1.6 3-1.6-3-3.2-.7 3.2-.6z" fill="#ffd9a0" opacity="${0.18 + (i % 4) * 0.06}"/>`; }
  s += '<rect x="72" y="40" width="168" height="270" fill="url(#eefold)"/><rect x="720" y="40" width="168" height="270" fill="url(#eefold)"/>';
  s += '<path d="M72 40H240Q220 96 200 98Q150 120 72 96Z" fill="#7e2a2c"/><path d="M888 40H720Q740 96 760 98Q810 120 888 96Z" fill="#7e2a2c"/>';
  for (let i = 0; i < 6; i++) s += `<circle cx="${96 + i * 28}" cy="${98 - (i % 2) * 4}" r="4" fill="url(#eeg)"/><circle cx="${864 - i * 28}" cy="${98 - (i % 2) * 4}" r="4" fill="url(#eeg)"/>`;
  s += '</g>';
  s += '<path d="M72 384V150Q72 40 200 40H760Q888 40 888 150V384" fill="none" stroke="#3a2210" stroke-width="22"/><path d="M72 384V150Q72 40 200 40H760Q888 40 888 150V384" fill="none" stroke="url(#eeg)" stroke-width="14"/>'
    + '<path d="M68 384V150Q68 36 200 36H760Q892 36 892 150V384" fill="none" stroke="#fff0b0" stroke-width="2" opacity=".5"/>';
  // the stage: boards in two rows of checks, a lit front edge
  s += '<rect x="100" y="300" width="760" height="72" fill="#3c261c"/>';
  for (let r = 0; r < 2; r++) for (let c = 0; c < 16; c++) s += `<rect x="${100 + c * 47.5}" y="${300 + r * 36}" width="47.5" height="36" fill="${(r + c) % 2 ? '#5d4030' : '#8a6a54'}"/><rect x="${100 + c * 47.5}" y="${300 + r * 36}" width="47.5" height="4" fill="#cdb094" opacity="${(r + c) % 2 ? 0.25 : 0.45}"/>`;
  s += '<rect x="100" y="372" width="760" height="14" fill="url(#eeg)"/><rect x="100" y="386" width="760" height="6" fill="#2a1408" opacity=".7"/>';
  // the floor in front: carpet, and a low wooden wall with three lanterns
  s += '<rect x="0" y="392" width="960" height="208" fill="url(#eecar)"/>';
  for (let i = 0; i < 12; i++) s += `<path d="M${40 + i * 80} 392L${i * 90 - 60} 600" stroke="#000" stroke-width="2" opacity=".12"/>`;
  s += '<rect x="170" y="396" width="620" height="6" fill="#000" opacity=".25"/>';
  s += '<rect x="0" y="566" width="960" height="34" fill="#9a5a2a"/><rect x="0" y="566" width="960" height="5" fill="#d89a4a"/><rect x="0" y="590" width="960" height="10" fill="#6a3a18"/>';
  for (const x of [240, 480, 720]) s += `<g transform="translate(${x} 566)"><path d="M0 -22V0" stroke="#2a1a10" stroke-width="2"/><rect x="-8" y="-18" width="16" height="22" rx="3" fill="#3a2414"/><rect x="-5" y="-14" width="10" height="14" rx="2" class="ee-flame" fill="#ffc15a"/><circle cx="0" cy="-8" r="26" fill="#ffb04a" fill-opacity=".18" class="ee-flame"/></g>`;
  // the torches either side of the arch
  for (const x of [38, 922]) s += `<g transform="translate(${x} 214)"><rect x="-3" y="0" width="6" height="40" fill="#3a2414"/><path d="M-9 0h18l-3 -9h-12z" fill="#7a5322"/><path d="M0 -10Q-9 -22 0 -34Q9 -22 0 -10z" fill="#ff9a2e" class="ee-flame"/><path d="M0 -12Q-4 -20 0 -27Q4 -20 0 -12z" fill="#ffe08a" class="ee-flame"/><circle cx="0" cy="-20" r="34" fill="#ff9a2e" fill-opacity=".16" class="ee-flame"/></g>`;
  // the door, and the sign over it
  const D = EE.door;
  s += `<g class="ee-door"><title>Leave the room</title><path class="ee-door-glow" d="M${D.x0 - 6} ${D.y1}V${D.y0 + 38}Q${D.x0 - 6} ${D.y0 - 8} ${(D.x0 + D.x1) / 2} ${D.y0 - 8}Q${D.x1 + 6} ${D.y0 - 8} ${D.x1 + 6} ${D.y0 + 38}V${D.y1}Z" fill="#ffe2a0"/><path d="M${D.x0} ${D.y1}V${D.y0 + 40}Q${D.x0} ${D.y0} ${(D.x0 + D.x1) / 2} ${D.y0}Q${D.x1} ${D.y0} ${D.x1} ${D.y0 + 40}V${D.y1}Z" fill="#3a2414"/>`
    + `<path d="M${D.x0 + 8} ${D.y1}V${D.y0 + 44}Q${D.x0 + 8} ${D.y0 + 10} ${(D.x0 + D.x1) / 2} ${D.y0 + 10}Q${D.x1 - 8} ${D.y0 + 10} ${D.x1 - 8} ${D.y0 + 44}V${D.y1}Z" fill="url(#eedoor)"/>`
    + `<path d="M${(D.x0 + D.x1) / 2} ${D.y0 + 12}V${D.y1}" stroke="#3a2414" stroke-width="2"/><rect x="${D.x0 + 18}" y="${D.y0 + 52}" width="24" height="40" rx="2" fill="none" stroke="#4a2c14" stroke-width="2"/><rect x="${D.x1 - 42}" y="${D.y0 + 52}" width="24" height="40" rx="2" fill="none" stroke="#4a2c14" stroke-width="2"/>`
    + `<circle cx="${D.x1 - 20}" cy="${D.y0 + 108}" r="4" fill="#e8c46a"/>`
    + `<rect x="${(D.x0 + D.x1) / 2 - 24}" y="${D.y0 - 26}" width="48" height="18" rx="3" fill="#0e3a20" stroke="#2a8a50" stroke-width="2"/><text x="${(D.x0 + D.x1) / 2}" y="${D.y0 - 12}" text-anchor="middle" class="ee-exit">EXIT</text></g>`;
  s += `<path d="M${D.x0} ${D.y1}L${D.x1 + 70} 590H${D.x0 - 10}Z" fill="#ffd28a" opacity=".07"/>`;
  return s;
}
function _eeBand() {
  let s = '';
  for (const b of EE_BAND) s += `<g class="ee-pawn" data-b="${b.id}"><g class="ee-sh"><ellipse cx="0" cy="2" rx="40" ry="8" fill="#000" opacity=".35"/></g><g class="ee-pb">${_EE_PAWN}<g class="ee-mc">${_EE_MOUTH_C}</g><g class="ee-mo" style="display:none">${_EE_MOUTH_O}</g>${b.role === 'gtr' ? `<g class="ee-gt">${_eeGuitar()}</g>` : ''}</g></g>`;
  return s;
}

/* ---------- people ---------- */
function _eeFigure(a, dir, moving) {
  let s = '';
  try { s = typeof gartPlayerSvg === 'function' ? gartPlayerSvg(a, { dir, pose: moving ? 'walk' : 'idle', motion: moving }) : ''; } catch (e) { s = ''; }
  return s || '<rect x="-6" y="-40" width="12" height="26" rx="5" fill="#5a8a5a"/><circle cx="0" cy="-48" r="8" fill="#e8b890"/><rect x="-5" y="-14" width="4" height="14" rx="2" fill="#3a3a4a"/><rect x="1" y="-14" width="4" height="14" rx="2" fill="#3a3a4a"/>';
}
function _eeMake(M) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'ee-p' + (M.me ? ' is-me' : ''));
  g.innerHTML = '<ellipse class="ee-pshadow" cx="0" cy="1" rx="17" ry="4.6"/><g class="ee-pb"><g class="ee-pin"></g></g><text class="ee-pname" y="-112" text-anchor="middle"></text>';
  g.querySelector('.ee-pname').textContent = M.me ? 'You' : M.n;
  M.g = g; M.bob = g.querySelector('.ee-pb'); M.in = g.querySelector('.ee-pin'); M.key = '';
  _ee.actors.appendChild(g);
  return g;
}
function _eeAdd(A, x, y) {
  const M = { w: A.w, n: String(A.n || 'A friend').slice(0, 40), a: A.a || null, x, y, tx: null, ty: null, face: 1, dir: 'e', moving: false, me: false, ph: (A.w || 0) * 1.3 };
  _ee.m.set(A.w, M); _eeMake(M);
  return M;
}
function _eeClamp(x, y) {
  y = Math.max(322, Math.min(556, y));
  x = y < 382 ? Math.max(104, Math.min(856, x)) : Math.max(40, Math.min(920, x));
  return { x, y };
}
function _eeMove(M, dt, speed) {
  M.moving = false;
  if (M.tx == null) return;
  const dx = M.tx - M.x, dy = M.ty - M.y, d = Math.hypot(dx, dy), step = speed * dt;
  if (d <= Math.max(step, 1)) { M.x = M.tx; M.y = M.ty; M.tx = M.ty = null; if (M.me && M.leave) _eeLeave(); return; }
  M.x += dx / d * step; M.y += dy / d * step; M.moving = true;
  if (Math.abs(dx) > 1) M.face = dx > 0 ? 1 : -1;
  M.dir = Math.abs(dx) >= Math.abs(dy) * 0.8 ? 'e' : dy > 0 ? 's' : 'n';
}
function _eePaint(M, t) {
  const key = M.dir + (M.moving ? 'w' : 'i');
  if (M.key !== key) { M.key = key; M.in.innerHTML = _eeFigure(M.a, M.dir, M.moving); }
  const calm = typeof gardenMotionOn === 'function' && !gardenMotionOn();
  const bob = calm ? 0 : M.moving ? -Math.abs(Math.sin(t * 11)) * 2 : -Math.abs(Math.sin(t * 4.2 + M.ph)) * (1 + _ee.lvl * 3);
  M.g.setAttribute('transform', `translate(${M.x.toFixed(1)} ${M.y.toFixed(1)})`);
  M.bob.setAttribute('transform', `translate(0 ${bob.toFixed(2)}) scale(${M.dir === 'e' && M.face < 0 ? -EE.fig : EE.fig} ${EE.fig})`);
}
function _eeSendAt(x, y, e) {
  try { if (typeof gardenLiveFx === 'function') gardenLiveFx('hall', e || 'at', { x: Math.max(0, Math.min(59, Math.round(x / EE.U))), y: Math.max(0, Math.min(37, Math.round(y / EE.U))) }); } catch (err) { /* only a message */ }
}

/* ---------- the song ---------- */
function _eeSynth(ctx, dest) {
  const T = 60 / 132 / 2, bass = [45, 45, 52, 45, 43, 43, 50, 43, 41, 41, 48, 41, 43, 43, 50, 55], lead = [69, 72, 76, 72, 71, 74, 79, 74, 69, 72, 77, 72, 67, 71, 74, 71];
  let step = 0, next = ctx.currentTime + 0.1;
  const tone = (m, t, len, type, g) => { const o = ctx.createOscillator(), v = ctx.createGain(); o.type = type; o.frequency.value = 440 * Math.pow(2, (m - 69) / 12); v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.0001, t + len); o.connect(v); v.connect(dest); o.start(t); o.stop(t + len + 0.02); };
  const kick = (t) => { const o = ctx.createOscillator(), v = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.14); v.gain.setValueAtTime(0.7, t); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); o.connect(v); v.connect(dest); o.start(t); o.stop(t + 0.2); };
  const id = setInterval(() => {
    while (next < ctx.currentTime + 0.4) {
      tone(bass[step % 16], next, T * 0.9, 'triangle', 0.5); tone(lead[step % 16], next, T * 0.7, 'square', 0.06); if (step % 4 === 0) kick(next);
      step++; next += T;
    }
  }, 90);
  return () => clearInterval(id);
}
async function _eeSongStart() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC || _ee.ac) return;
  const ctx = new AC(), gain = ctx.createGain(), an = ctx.createAnalyser();
  an.fftSize = 256; an.smoothingTimeConstant = 0.55; gain.gain.value = 0; gain.connect(ctx.destination); gain.connect(an);
  const A = { ctx, gain, an, bins: new Uint8Array(an.frequencyBinCount), stop: null };
  _ee.ac = A;
  try { ctx.resume().catch(() => {}); } catch (e) { /* the first click does it */ }
  let src = null;
  try {
    const r = await fetch('/api/garden/room-sound', { cache: 'force-cache' });
    if (r.ok) { const buf = await ctx.decodeAudioData(await r.arrayBuffer()); src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(gain); }
  } catch (e) { src = null; }
  if (_ee.ac !== A) { try { ctx.close(); } catch (e) { /* gone */ } return; }   // you have left already
  if (src) { src.start(); A.stop = () => { try { src.stop(); } catch (e) { /* done */ } }; } else A.stop = _eeSynth(ctx, gain);
  gain.gain.linearRampToValueAtTime(_eeGain(), ctx.currentTime + 1.4);
}
/** The slider is 0 to 100 and the loudness follows its square, so the low end is gentle. */
function _eeGain() { return _ee.mute ? 0 : Math.pow(_ee.volv / 100, 2) * EE.vol; }
function _eeVolRead() {
  try { const t = localStorage.getItem(EE_VOL_KEY), v = Number(t); if (t !== null && Number.isFinite(v) && v >= 0 && v <= 100) return Math.round(v); } catch (e) { /* no storage: the usual */ }
  return EE.volDefault;
}
function _eeGainApply() {
  const A = _ee.ac; if (!A) return;
  try { A.gain.gain.cancelScheduledValues(A.ctx.currentTime); A.gain.gain.setTargetAtTime(_eeGain(), A.ctx.currentTime, 0.08); } catch (e) { /* later */ }
}
function _eeSoundSync() {
  const r = _ee.root; if (!r) return;
  const b = r.querySelector('.ee-snd span'), v = r.querySelector('.ee-vol');
  if (b) b.textContent = _ee.mute || _ee.volv === 0 ? 'Sound off' : 'Sound on';
  if (v) { v.value = String(_ee.volv); v.style.setProperty('--v', _ee.mute ? '0%' : _ee.volv + '%'); }
}
function _eeSongStop() {
  const A = _ee.ac; _ee.ac = null;
  if (!A) return;
  try { A.gain.gain.cancelScheduledValues(A.ctx.currentTime); A.gain.gain.setTargetAtTime(0, A.ctx.currentTime, 0.12); } catch (e) { /* closing anyway */ }
  setTimeout(() => { try { if (A.stop) A.stop(); A.ctx.close(); } catch (e) { /* gone */ } }, 600);
}
function _eeLevel(t) {
  const A = _ee.ac;
  let raw = 0;
  if (A && A.ctx.state === 'running') { try { A.an.getByteFrequencyData(A.bins); let s = 0; for (let i = 1; i < 14; i++) s += A.bins[i]; raw = Math.min(1, s / 13 / 190); } catch (e) { raw = 0; } }
  if (!raw) raw = 0.25 + 0.55 * Math.pow(Math.abs(Math.sin(t * Math.PI * 2.2)), 3);
  _ee.lvlRaw = raw; _ee.lvl += (raw - _ee.lvl) * 0.35;
}

/* ---------- the loop ---------- */
function _eePawnFrame(b, el, t) {
  const calm = typeof gardenMotionOn === 'function' && !gardenMotionOn(), L = _ee.lvl, ph = b.ph + t * b.fx;
  const dx = calm ? 0 : Math.sin(ph) * b.ax, hop = calm ? 0 : Math.pow(Math.abs(Math.sin(t * 4.4 + b.ph)), 0.9) * b.hop * (0.45 + L);
  const tilt = calm ? 0 : Math.sin(t * 4.4 + b.ph + 1) * b.tilt * (0.5 + L * 0.7);
  let sx = 1;
  if (b.role === 'dance' && !calm) { const c = (t + b.ph * 2) % 9; if (c < 1.2) sx = Math.cos(c / 1.2 * Math.PI * 2); }
  const sq = 1 - (hop < 1.5 ? 0.04 * L : 0);
  const x = b.x + dx, y = b.y;
  el.pawn.setAttribute('transform', `translate(${x.toFixed(1)} ${y})`);
  el.pb.setAttribute('transform', `translate(0 ${(-hop).toFixed(1)}) rotate(${tilt.toFixed(1)}) scale(${sx.toFixed(2)} ${sq.toFixed(2)})`);
  el.sh.setAttribute('transform', `scale(${(1 - hop / 90).toFixed(2)} 1)`);
  const open = b.role === 'sing' ? L * 1.7 + Math.sin(t * 9) * 0.35 > 0.62 : b.role === 'gtr' ? Math.sin(t * 4.4 + 2) > 0.4 && L > 0.3 : Math.sin(t * 8.8 + b.ph) > 0.2 && L > 0.35;
  if (el.open !== open) { el.open = open; el.mo.style.display = open ? '' : 'none'; el.mc.style.display = open ? 'none' : ''; }
  if (el.gt && !calm) el.gt.setAttribute('transform', `translate(${(Math.sin(t * 8.8) * 2).toFixed(1)} ${(Math.cos(t * 8.8) * 2).toFixed(1)})`);
  el.cx = x; el.cy = y;
}
function _eeNote(x, y) {
  if (!_ee.notes || _ee.notes.childNodes.length > 7 || (typeof gardenMotionOn === 'function' && !gardenMotionOn())) return;
  const n = document.createElementNS('http://www.w3.org/2000/svg', 'text'); n.setAttribute('class', 'ee-note'); n.setAttribute('x', String(x)); n.setAttribute('y', String(y));
  n.textContent = ['♪', '♫', '♬'][Math.floor(Math.random() * 3)]; n.style.setProperty('--dx', (Math.random() * 60 - 20).toFixed(0) + 'px');
  n.addEventListener('animationend', () => n.remove()); _ee.notes.appendChild(n);
}
function _eeFrame(ts) {
  _ee.raf = 0;
  if (!_ee.on) return;
  if (!_gw.on) { _eeLeave(); return; }   // the garden itself went away (another page, a visit that ended)
  const dt = Math.min(0.05, _ee.last ? (ts - _ee.last) / 1000 : 0.016); _ee.last = ts; _ee.t += dt;
  const t = _ee.t;
  _eeLevel(t);
  // you
  const M = _ee.me, K = _ee.keys;
  let vx = (K.has('ArrowRight') || K.has('d') ? 1 : 0) - (K.has('ArrowLeft') || K.has('a') ? 1 : 0), vy = (K.has('ArrowDown') || K.has('s') ? 1 : 0) - (K.has('ArrowUp') || K.has('w') ? 1 : 0);
  if (vx || vy) {
    const n = Math.hypot(vx, vy); vx /= n; vy /= n; M.tx = M.ty = null; M.leave = false;
    const p = _eeClamp(M.x + vx * EE.speed * dt, M.y + vy * EE.speed * dt * 0.8); M.x = p.x; M.y = p.y; M.moving = true; M.keyed = true;
    if (vx) M.face = vx > 0 ? 1 : -1; M.dir = Math.abs(vx) >= Math.abs(vy) ? 'e' : vy > 0 ? 's' : 'n';
    if (ts - _ee.sentAt > 420) { _ee.sentAt = ts; _eeSendAt(M.x + vx * 70, M.y + vy * 50); }
  } else {
    if (M.keyed) { M.keyed = false; M.moving = false; _eeSendAt(M.x, M.y); }
    _eeMove(M, dt, EE.speed);
    if (!_ee.on) return;
  }
  _eePaint(M, t);
  // the others
  for (const [w, R] of _ee.m) {
    if (!_gll.actors.has(w)) { R.g.remove(); _ee.m.delete(w); continue; }   // they left the garden
    _eeMove(R, dt, EE.speed * 1.2); _eePaint(R, t);
  }
  // the band
  _ee.pawns.forEach((el, i) => _eePawnFrame(EE_BAND[i], el, t));
  if (_ee.lvlRaw > 0.4 && Math.random() < 0.06) _eeNote(_ee.pawns[0].cx - 6, _ee.pawns[0].cy - 120);
  // in front of or behind: the lower on the screen, the nearer
  const all = [..._ee.m.values(), M].map(r => ({ g: r.g, y: r.y })).concat(_ee.pawns.map(p => ({ g: p.pawn, y: p.cy || 0 })));
  all.sort((a, b) => a.y - b.y);
  const kids = _ee.actors.children;
  let same = kids.length === all.length;
  for (let i = 0; same && i < all.length; i++) if (kids[i] !== all[i].g) same = false;
  if (!same) for (const r of all) _ee.actors.appendChild(r.g);
  _ee.raf = requestAnimationFrame(_eeFrame);
}
function _eeStartLoop() { if (_ee.on && !_ee.raf && !document.hidden) { _ee.last = 0; _ee.raf = requestAnimationFrame(_eeFrame); } }

/* ---------- coming in and going out ---------- */
function _eePt(ev) {
  const r = _ee.svg.getBoundingClientRect(), k = Math.min(r.width / EE.W, r.height / EE.H);
  return { x: (ev.clientX - (r.left + (r.width - EE.W * k) / 2)) / k, y: (ev.clientY - (r.top + (r.height - EE.H * k) / 2)) / k };
}
function _eeWalkTo(x, y, leave) {
  const M = _ee.me, p = _eeClamp(x, y);
  M.tx = p.x; M.ty = p.y; M.leave = !!leave; M.keyed = false;
  _eeSendAt(p.x, p.y);
}
function _eeClick(ev) {
  if (!_ee.on || _ee.closing) return;
  if (ev.target.closest && ev.target.closest('.ee-ui')) return;
  if (_ee.ac && _ee.ac.ctx.state === 'suspended') { try { _ee.ac.ctx.resume(); } catch (e) { /* later */ } }
  const p = _eePt(ev), D = EE.door;
  if (p.x >= D.x0 - 6 && p.x <= D.x1 + 6 && p.y >= D.y0 - 34 && p.y <= D.y1 + 6) _eeWalkTo(D.x, D.y, true);
  else _eeWalkTo(p.x, p.y, false);
}
function _eeKey(ev) {
  if (!_ee.on) return;
  if (ev.ctrlKey || ev.metaKey || ev.altKey || /^F\d+$/.test(ev.key)) return;
  const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key, down = ev.type === 'keydown';
  if (ev.target && ev.target.closest && ev.target.closest('.ee-ui') && k !== 'Escape' && (k === 'Enter' || k === ' ' || k === 'Tab' || ev.target.type === 'range')) return;   // a button or the slider you are on is yours to use
  ev.stopImmediatePropagation();
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's', ' ', 'Enter', 'Escape', 'e', 'm'].includes(k)) ev.preventDefault();
  if (!down) { _ee.keys.delete(k); return; }
  if (_ee.ac && _ee.ac.ctx.state === 'suspended') { try { _ee.ac.ctx.resume(); } catch (e) { /* later */ } }
  if (k === 'Escape') { _eeLeave(); return; }
  if (k === 'm') { _eeMute(); return; }
  if ((k === 'e' || k === 'Enter' || k === ' ') && Math.hypot(_ee.me.x - EE.door.x, _ee.me.y - EE.door.y) < 70) { _eeLeave(); return; }
  _ee.keys.add(k);
}
function _eeMute() {
  _ee.mute = !_ee.mute;
  if (!_ee.mute && _ee.volv === 0) _ee.volv = EE.volDefault;
  _eeGainApply(); _eeSoundSync();
}
function _eeMayEnter() { return !_ee.on && !_ee.closing && !(typeof _grm !== 'undefined' && (_grm.on || _grm.closing)) && !!(typeof _gw !== 'undefined' && _gw.on && _gw.box); }
/** Open the room. quiet: you were brought here by somebody else (they already know where you are). */
function eeEnter(o) {
  if (!_eeMayEnter()) return false;
  o = o || {};
  const root = document.createElement('div'); root.className = 'ee-room'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'A room behind the garden');
  root.innerHTML = `<svg class="ee-svg" viewBox="0 0 ${EE.W} ${EE.H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${_eeArt()}`
    + `${_eeStand(436, 366)}<g class="ee-beams"><path class="ee-beam ee-b1" d="M150 36L330 380L90 380Z" fill="url(#eebeam)"/><path class="ee-beam ee-b2" d="M810 36L870 380L630 380Z" fill="url(#eebeam)"/></g>`
    + `<g class="ee-actors">${_eeBand()}</g><g class="ee-notes"></g></svg>`
    + `<div class="ee-ui"><button type="button" class="btn btn-secondary btn-sm ee-leave">${icon('log-out')}<span>Leave</span></button><div class="ee-sound"><button type="button" class="btn btn-secondary btn-sm ee-snd">${icon('music')}<span>Sound on</span></button><input type="range" class="ee-vol" min="0" max="100" step="1" value="50" aria-label="Volume"></div></div>`
    + '<p class="ee-hint">Click to walk. The door is on the left.</p><div class="ee-flash"></div>';
  document.body.appendChild(root);
  _ee.root = root; _ee.svg = root.querySelector('.ee-svg'); _ee.actors = root.querySelector('.ee-actors'); _ee.notes = root.querySelector('.ee-notes');
  // the band lives among the people (so they are put in front of and behind each other by where they stand)
  _ee.pawns = [...root.querySelectorAll('.ee-actors > .ee-pawn')].map(p => ({ pawn: p, pb: p.querySelector('.ee-pb'), sh: p.querySelector('.ee-sh'), mc: p.querySelector('.ee-mc'), mo: p.querySelector('.ee-mo'), gt: p.querySelector('.ee-gt'), open: false, cx: 0, cy: 0 }));
  _ee.m.clear(); _ee.keys.clear(); _ee.t = 0; _ee.lvl = 0; _ee.last = 0; _ee.mute = false; _ee.volv = _eeVolRead(); _ee.left = false; _ee.closing = false;
  const sp = EE.spawn, p0 = _eeClamp(sp.x + (Math.random() * 80 - 40), sp.y + (Math.random() * 30 - 15));
  const me = { w: -1, n: 'You', a: (function () { try { return typeof profileGet === 'function' ? profileGet().avatar : null; } catch (e) { return null; } })(), x: p0.x, y: p0.y, tx: null, ty: null, face: 1, dir: 'e', moving: false, me: true, ph: 0 };
  _ee.me = me; _eeMake(me); _eePaint(me, 0);
  _ee.on = true;
  root.addEventListener('pointerdown', _eeClick);
  root.querySelector('.ee-leave').onclick = () => _eeLeave();
  root.querySelector('.ee-snd').onclick = () => _eeMute();
  const vol = root.querySelector('.ee-vol');
  vol.addEventListener('input', () => { _ee.volv = Number(vol.value) || 0; if (_ee.mute && _ee.volv > 0) _ee.mute = false; _eeGainApply(); _eeSoundSync(); });
  vol.addEventListener('change', () => { try { localStorage.setItem(EE_VOL_KEY, String(_ee.volv)); } catch (e) { /* only a convenience */ } });
  vol.addEventListener('pointerup', () => vol.blur());   // the keys walk you again
  _eeSoundSync();
  window.addEventListener('keydown', _eeKey, true); window.addEventListener('keyup', _eeKey, true);
  document.addEventListener('visibilitychange', _eeStartLoop);
  requestAnimationFrame(() => root.classList.add('is-on'));
  clearTimeout(_ee.hintT); _ee.hintT = setTimeout(() => { const h = root.querySelector('.ee-hint'); if (h) h.classList.add('is-gone'); }, 7000);
  _eeSongStart();
  _eeStartLoop();
  clearTimeout(_ee.hideT); _ee.hideT = setTimeout(() => { if (_ee.on) _gwIndoors(true); }, 760);   // (once it has faded in: the stage is not drawn under a room)
  _eeSendAt(me.x, me.y, 'in');
  return true;
}
function _eeLeave() {
  if (!_ee.on || _ee.closing) return;
  _ee.closing = true; _ee.on = false;
  try { if (typeof gardenLiveFx === 'function') gardenLiveFx('hall', 'out'); } catch (e) { /* only a message */ }
  window.removeEventListener('keydown', _eeKey, true); window.removeEventListener('keyup', _eeKey, true);
  document.removeEventListener('visibilitychange', _eeStartLoop);
  cancelAnimationFrame(_ee.raf); _ee.raf = 0; clearTimeout(_ee.hintT); clearTimeout(_ee.hideT);
  _gwIndoors(false);
  _eeSongStop();
  const root = _ee.root;
  if (root) { root.classList.remove('is-on'); root.classList.add('is-out'); setTimeout(() => { root.remove(); }, 420); }
  _ee.root = null; _ee.svg = null; _ee.actors = null; _ee.notes = null; _ee.m.clear(); _ee.keys.clear(); _ee.me = null; _ee.pawns = [];
  setTimeout(() => { _ee.closing = false; }, 450);
  try { if (typeof _gwEnsureLoop === 'function') _gwEnsureLoop(); } catch (e) { /* the garden's own loop */ }
}

/* ---------- other people ---------- */
function _eeHear(A, ev) {
  if (!A || A.me || !ev) return;
  if (ev.i) { if (typeof gardenRoomHear === 'function') gardenRoomHear(A, ev); return; }   // (one of the hidden rooms: 94-garden-world-4rooms.js)
  const e = String(ev.e || '');
  if (e === 'out') { const R = _ee.m.get(A.w); if (R) { R.g.remove(); _ee.m.delete(A.w); } return; }
  if (e !== 'in' && e !== 'at') return;
  if (!Number.isInteger(ev.x) || !Number.isInteger(ev.y)) return;
  const x = ev.x * EE.U, y = ev.y * EE.U;
  let pulled = false;
  if (!_ee.on) { if (e !== 'in' || !eeEnter({ from: A })) return; pulled = true; }
  let R = _ee.m.get(A.w);
  if (!R) R = _eeAdd(A, x, y);
  R.a = A.a || R.a; R.n = String(A.n || R.n).slice(0, 40);
  if (e === 'in') { R.x = x; R.y = y; R.tx = R.ty = null; if (!pulled && _ee.me) _eeSendAt(_ee.me.x, _ee.me.y); }   // (somebody new: they see where you are)
  else { R.tx = x; R.ty = y; }
}
/** The host is in the room and somebody has just come into the garden: ask them along (twice, the first may come before they have the host's name). */
function eeTell(fid) {
  if (!_ee.on || !_ee.me || typeof _glhSend !== 'function' || !/^[A-Za-z0-9_-]{1,64}$/.test(String(fid || ''))) return;
  const say = () => { if (_ee.on && _ee.me) _glhSend(fid, 'fx', { c: 'hall', e: 'in', x: Math.max(0, Math.min(59, Math.round(_ee.me.x / EE.U))), y: Math.max(0, Math.min(37, Math.round(_ee.me.y / EE.U))) }); };
  setTimeout(say, 1500); setTimeout(say, 6000);
}

/* ---------- the way in: four gnomes round a scarecrow ---------- */
/** Is this a scarecrow with at least four gnomes standing right round it (in the cells touching it, corners too)? */
function _eeRing(d, m) {
  if (!d || !d.def || d.def.id !== 'scarecrow' || !m || !Array.isArray(m.decor)) return false;
  const x0 = d.x - 1, y0 = d.y - 1, x1 = d.x + (d.def.w || 1), y1 = d.y + (d.def.h || 1);
  const near = (g) => g.def && g.def.id === 'gnome' && g.x >= x0 && g.x <= x1 && g.y >= y0 && g.y <= y1 && !(g.x >= d.x && g.x < x1 && g.y >= d.y && g.y < y1);
  return m.decor.filter(near).length >= 4;
}
function gardenBackStep(d, m) {
  try {
    if (!_eeRing(d, m) || !_eeMayEnter()) return false;
    return eeEnter({});
  } catch (e) { return false; }
}
