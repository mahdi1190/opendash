/* ============================================================
   GARDEN LIFE, the creature art kit (2.23). User request, 30 Oct 2026: "proper collisions and interactions with ... the random insects, animals etc
   that can visit ... it's cool to have something fly around and settle on a placed object" and "think Animal Crossing ... build it in a way where
   we can add so much content and scale it easily."

   A creature's picture is a kit plus a few colours: art: ['butterfly', {fore: '#...', marks: 'eyes'}]. A kit returns {svg, clips}:
     svg     drawn facing RIGHT with its feet at 0,0, in stage units (the player is about 52 tall). Moving parts are <g class="gl-wing ..."> pivoting
             about their own hinge (_glPart). Plain flat colours, the same light from the upper left as the rest of the garden.
     clips   {name: 'token token'}: what each named clip does. A token is one rule in src/styles/94-garden-life.css that moves parts by their class:
             'flap', 'flutter', 'walk', 'peck', 'preen', 'blink'... A sprite's data-clip attribute holds the tokens, so changing clip costs one attribute,
             and the page repaints only that little creature.
   Clip names the behaviours ask for: rest, fly, preen, walk, run, hop, peck, sleep, swim, sniff, alert, react, hide, dig. A kit leaves out what it has
   no use for: the engine falls back to rest. A row's own `clips` replace single names.

   GL_KITS[name](params) is the whole interface: a new kit is one function here and needs no engine code. PURE: nothing is drawn at load.
   ============================================================ */
const GL_KITS = {};

const _glF = v => Math.round(v * 100) / 100;
/** A moving part: its transforms pivot about (ox, oy). */
function _glPart(cls, ox, oy, inner) { return `<g class="${cls.split(' ').map(c => 'gl-' + c).join(' ')}" style="transform-origin:${_glF(ox)}px ${_glF(oy)}px">${inner}</g>`; }
/** A soft shine on a round thing. */
function _glShine(x, y, rx, ry, o) { return GART.P('#ffffff', GART.ell(x, y, rx, ry), o == null ? 0.35 : o); }
function _glEye(x, y, r) { return `<g class="gl-eye" style="transform-origin:${_glF(x)}px ${_glF(y)}px">${GART.P('#1c1512', GART.circ(x, y, r))}${GART.P('#ffffff', GART.circ(x + r * 0.3, y - r * 0.35, r * 0.34), 0.95)}</g>`; }

/* ---------- butterflies: seen from above, as you see one on a flower: two wings hinged on the body, opening and closing over its back ---------- */
GL_KITS.butterfly = function (p) {
  const A = GART, fore = p.fore || '#f7f5ee', hind = p.hind || A.lt(fore, 0.15), edge = p.edge || A.dk(fore, 0.55), body = p.body || '#332a24', k = p.k || 1;
  const fd = 'M0.5 -11C3 -19.4 9 -24.4 14.6 -22.8C16.8 -18.2 14.2 -11.4 0.8 -8z', hd = 'M0.7 -8.6C6.8 -10.4 12.2 -8.2 12.2 -4.2C12.2 -0.6 7 1.2 3 -1.4C1.4 -3 0.7 -6 0.7 -8.6z';
  let marks = '';
  if (p.marks === 'tips') marks = A.P(edge, 'M10.8 -23.4C12.4 -23.5 13.8 -23.2 14.6 -22.8C15.4 -21 15.5 -19 15 -17.2C13.8 -19.4 12.4 -21.6 10.8 -23.4z') + A.P(edge, A.circ(8.6, -15.2, 1.2)) + A.P(edge, A.circ(7.6, -6.4, 0.8));
  else if (p.marks === 'eyes') marks = A.P('#f2d050', A.circ(10.6, -18.2, 3.2) + A.circ(8, -4.6, 2.9)) + A.P(p.eye || '#34489e', A.circ(10.6, -18.2, 2.2) + A.circ(8, -4.6, 2)) + A.P('#141424', A.circ(10.6, -18.2, 1) + A.circ(8, -4.6, 0.9)) + A.P(edge, A.circ(5.2, -14.4, 1.1) + A.circ(3.6, -11.8, 0.8));
  else if (p.marks === 'band') marks = A.P(p.band || '#e2442b', 'M4 -14C7.4 -17 10.8 -18.6 14.6 -19L15 -17C11.4 -15.8 8.2 -14 5.6 -11.2z' + 'M4.2 -0.8C7.6 0.2 11 -1.4 12.2 -4.6L12.1 -2.6C10.8 0.4 6.8 1.4 3.4 -0.6z') + A.P('#ffffff', A.circ(12.2, -21.4, 0.9) + A.circ(10.2, -21.6, 0.6) + A.circ(14, -20.6, 0.6));
  else if (p.marks === 'veins') marks = A.S(edge, 0.4, 'M1.2 -10.4L12.4 -21.6M1.2 -9.6L14.4 -17.6M1.2 -9L12.4 -13M1.4 -7.8L11 -5.4M1.6 -6.4L8.6 -1.2', 0.7);
  const wing = (dim) => A.P(dim ? A.dk(hind, dim) : hind, hd) + A.P(dim ? A.dk(fore, dim) : fore, fd) + A.P('#ffffff', 'M2 -11.6C4 -17 8 -21 12.4 -21.6C8.6 -19 5.6 -15.4 3.4 -10.6z', dim ? 0.1 : 0.22) + marks + A.S(edge, 0.45, fd + hd, 0.55);
  const svg = `<g transform="scale(${k}) translate(0 -1) rotate(-14 0 -7)">`
    + _glPart('wing-l', 0, -7, `<g transform="scale(-1 1)">${wing(0)}</g>`)
    + _glPart('wing-r', 0, -7, wing(0.14))
    + A.P(body, A.ell(0, -6, 1.25, 5)) + A.P(body, A.circ(0, -11.8, 1.4)) + A.S(body, 0.45, 'M-0.3 -13Q-1.6 -16 -3.6 -17M0.3 -13Q1.6 -16 3.6 -17') + A.P(body, A.circ(-3.7, -17, 0.5) + A.circ(3.7, -17, 0.5))
    + '</g>';
  return { svg, clips: { rest: 'wings-slow', preen: 'wings-still', fly: 'flutter', react: 'flutter', hide: 'wings-still' } };
};

/* ---------- bees: a striped bean with a blur of wings; fuzz: a bumblebee's round fur ---------- */
GL_KITS.bee = function (p) {
  const A = GART, band = p.band || '#f2b01e', dark = p.dark || '#2c2520', tail = p.tail || dark, k = p.k || 1;
  let fur = '';
  if (p.fuzz) for (let i = 0; i < 13; i++) { const a = i / 13 * Math.PI * 2; fur += A.circ(Math.cos(a) * 6.8, -6 + Math.sin(a) * 5, 1.15); }
  const w = A.P('#e6f4f8', A.ell(-1.6, -12.4, 3.3, 5) + A.ell(2.2, -12.2, 2.6, 4.2), 0.82) + A.S('#a6c4d2', 0.3, A.ell(-1.6, -12.4, 3.3, 5), 0.7);
  const body = (p.fuzz ? A.P(dark, fur) : '') + A.P(dark, A.ell(0, -6, p.fuzz ? 6.8 : 6.2, p.fuzz ? 5 : 3.9)) + A.P(band, 'M-3 -9.4Q-1.2 -6 -3 -2.4L-0.4 -2.2Q1 -6 -0.4 -9.8zM1.8 -9.8Q3.2 -6 1.8 -2.2L3.8 -2.8Q5 -6 3.8 -9.2z')
    + A.P(tail, A.ell(-5.6, -6, 1.5, 2.1)) + A.P(dark, A.circ(6.2, -6.6, p.fuzz ? 2.9 : 2.6)) + _glEye(7, -7.2, 0.8) + A.S(dark, 0.5, 'M7 -9Q8.6 -11 10 -10.6M6.2 -9Q6.8 -11.4 8.2 -11.8') + _glShine(-0.4, -8.2, 3, 0.8, 0.26);
  const legs = A.S(dark, 0.6, 'M-2 -2L-3.4 0M1 -2L0.8 0.2M3.4 -2.4L4.6 -0.2') + (p.pollen ? A.P(p.pollen, A.circ(-3.4, -0.4, 1.1)) : '');
  return { svg: `<g transform="scale(${k})">${_glPart('body', 0, -6, legs + body)}${_glPart('buzz', 0, -8, w)}</g>`, clips: { rest: 'buzz', fly: 'buzz hover', preen: 'buzz', react: 'buzz wiggle', sleep: 'still' } };
};

/* ---------- ladybird: a dome that lifts to fly ---------- */
GL_KITS.ladybird = function (p) {
  const A = GART, c = p.c || '#d8232c', d = p.dark || '#1a1612', k = p.k || 1;
  const shell = A.P(c, 'M-5.4 -1Q-5.4 -7.8 0 -7.8Q5.4 -7.8 5.4 -1z') + A.P(d, A.circ(-2.6, -4.8, 1) + A.circ(1.6, -5.4, 1) + A.circ(-0.4, -2.6, 0.9) + A.circ(3.4, -2.8, 0.8)) + _glShine(-2.2, -6.2, 1.6, 0.8, 0.5);
  const wings = A.P('#eef3f2', A.ell(-3, -7, 4.4, 1.7) + A.ell(-1, -8.4, 3.6, 1.4), 0.75);
  return { svg: `<g transform="scale(${k})">${A.S(d, 0.55, 'M-3 -1L-4 0.2M0 -1L0 0.3M3 -1L4 0.2')}${_glPart('buzz', 0, -6, wings)}${A.P(d, A.circ(5.2, -3, 2.2))}${A.P('#ffffff', A.circ(6, -3.8, 0.5) + A.circ(6.2, -2.4, 0.45))}${_glPart('shell', 4, -1, shell)}</g>`,
    clips: { rest: 'wings-hide', walk: 'wings-hide crawl', fly: 'buzz shell-up', react: 'wings-hide wiggle', hide: 'wings-hide' } };
};

/* ---------- dragonfly: a long thin body, four clear wings that shiver ---------- */
GL_KITS.dragonfly = function (p) {
  const A = GART, c = p.c || '#2fa8bc', c2 = p.c2 || '#1b5f78', k = p.k || 1;
  let seg = ''; for (let i = 0; i < 6; i++) seg += A.rect(-5 - i * 3.1, -7.6 + i * 0.3, 1.2, 1.6);
  const wing = (x, y, a, L) => `<g transform="rotate(${a} ${x} ${y})">${A.P('#d6f2f6', A.ell(x, y - L / 2, 2.3, L / 2), 0.6)}${A.S('#7cc0ce', 0.3, `M${x} ${y}V${y - L}`, 0.8)}</g>`;
  const far = wing(-0.6, -8.4, -30, 13) + wing(1.8, -8.4, 18, 13), near = wing(-1.4, -8.2, -62, 14) + wing(2.4, -8.2, 48, 14);
  return { svg: `<g transform="scale(${k})">${_glPart('shiver', 0, -8, far)}${A.S(c2, 1.5, 'M-20 -5.8L2 -7.8')}${A.P(c, seg)}${A.P(c, A.ell(2.4, -8, 3.6, 2.2))}${A.P(c2, A.circ(6.4, -8.6, 2.1))}${_glEye(7.2, -9.2, 1)}${_glPart('shiver2', 0, -8, near)}</g>`,
    clips: { rest: 'shiver-slow', fly: 'shiver', react: 'shiver' } };
};

/* ---------- moth: seen from above, soft and furry, wings swept back; tails: long streamers for a very rare one ---------- */
GL_KITS.moth = function (p) {
  const A = GART, c = p.c || '#b9a98e', c2 = p.c2 || A.dk(c, 0.3), k = p.k || 1;
  const hd = 'M0.6 -8C6 -8.4 10.4 -6.4 10 -3C9.6 -0.2 5 0.6 1 -2z', fd = 'M0.5 -11C5 -16.6 11.6 -19 16 -16.4C16.6 -12 12 -7.4 0.8 -6.6z';
  const tail = p.tails ? A.P(c, 'M4 -2C6.4 2 8.4 8 12.6 12.6C13.6 7.6 11.8 1 9 -2.4z') : '';
  const wing = (dim) => tail + A.P(dim ? A.dk(c, dim) : A.dk(c, 0.12), hd) + A.P(dim ? A.dk(c, dim * 0.8) : c, fd) + A.S(c2, 0.6, 'M2 -9.6Q7 -12.4 13.6 -15.4M3.4 -8Q8.6 -9 13.8 -11.6', 0.55) + (p.spot ? A.P(p.spot, A.circ(9, -11.8, 1.5)) + A.P('#ffffff', A.circ(9, -11.8, 0.55)) : A.P(c2, A.circ(8.4, -11.4, 0.8), 0.7));
  const svg = `<g transform="scale(${k}) translate(0 -1) rotate(-10 0 -7)">`
    + _glPart('wing-l', 0, -7, `<g transform="scale(-1 1)">${wing(0)}</g>`) + _glPart('wing-r', 0, -7, wing(0.1))
    + A.P(A.lt(c, 0.28), A.ell(0, -6, 2, 5.2)) + A.P(A.lt(c, 0.42), A.circ(0, -11, 2.2)) + A.P('#1c1512', A.circ(-1.3, -12, 0.55) + A.circ(1.3, -12, 0.55)) + A.S(c2, 0.6, 'M-0.5 -12.8Q-2.4 -16.2 -5.4 -16.4M0.5 -12.8Q2.4 -16.2 5.4 -16.4')
    + '</g>';
  return { svg, clips: { rest: 'wings-slow', preen: 'wings-still', fly: 'flutter', react: 'flutter', hide: 'wings-still' } };
};

/* ---------- firefly: a speck with a lantern: the glow is drawn once and breathes ---------- */
GL_KITS.firefly = function (p) {
  const A = GART, glow = p.glow || '#e8f26a', k = p.k || 1;
  const lamp = A.P('#fbffc8', A.circ(-3, -4.6, 1.6)) + A.P(glow, A.circ(-3, -4.6, 2.8), 0.5);
  return { svg: `<g transform="scale(${k})">${_glPart('glow', -3, -4.6, lamp)}${A.P('#2c2a22', A.ell(0, -5, 3.2, 1.6))}${A.P('#2c2a22', A.circ(3, -5.4, 1.1))}${_glPart('buzz', 0, -6, A.P('#e6f0f0', A.ell(-0.6, -7.4, 2.6, 1.3), 0.6))}</g>`,
    clips: { rest: 'glow', fly: 'glow buzz', react: 'glow-fast buzz', hide: 'glow' } };
};

/* ---------- snail: stretches as it goes, tentacles feel about, tucks in when alarmed ---------- */
GL_KITS.snail = function (p) {
  const A = GART, shell = p.shell || '#b77a42', band = p.band || A.dk(shell, 0.35), foot = p.foot || '#cdb99a', k = p.k || 1;
  const swirl = A.S(band, 1.15, 'M-1.6 -6.6C-0.2 -8.4 2.4 -7.4 2 -5.2C1.6 -3 -2.6 -2.8 -4 -5.2C-5.6 -8.2 -2.6 -11.6 1.2 -10.8C5 -10 6.4 -5.8 4.4 -2.6');
  const soft = A.P(foot, 'M-9 0Q-10 -1.4 -7 -1.6L5 -2.4C7 -3 7.8 -5 8.4 -7.4L11 -7.2C11.8 -3.6 10.8 0 7 0z') + _glPart('feelers', 9.4, -7, A.S(foot, 0.8, 'M9.2 -7L8.2 -11M10.4 -7L11.6 -10.6') + A.P('#3a2c22', A.circ(8.2, -11.2, 0.75) + A.circ(11.7, -10.8, 0.75)));
  const sh = A.P(shell, A.circ(0, -6, 6.2)) + A.P(A.lt(shell, 0.3), 'M-4 -9.4Q-1.4 -11.8 2 -11.2Q-2 -10.4 -4.6 -7.6z', 0.8) + swirl;
  return { svg: `<g transform="scale(${k})">${_glPart('foot', -8, 0, soft)}${sh}</g>`, clips: { rest: 'feel', walk: 'crawl feel', hide: 'tuck', react: 'tuck', sleep: 'tuck' } };
};

/* ---------- frog: sits low, throat pulses, stretches in a hop; in water only eyes and back show ---------- */
GL_KITS.frog = function (p) {
  const A = GART, c = p.c || '#6aa84a', d = p.d || A.dk(c, 0.3), b = p.b || '#e6ecc0', k = p.k || 1;
  const legs = _glPart('legs', -5, -2, A.P(d, 'M-7 0Q-11.4 -1 -10.4 -4.6Q-7 -8.4 -2 -5L-3.4 -0.4z') + A.P(d, 'M-11 -0.2L-5.2 0.1L-5.4 -1L-10 -1.6z'));
  const front = A.S(d, 1.5, 'M4.4 -3.4L5.4 -0.2') + A.P(d, A.ell(6, 0, 2, 0.6));
  const body = A.P(c, 'M-7.4 -3.6C-6.4 -8.8 -0.6 -11 4 -10.2C8 -9.6 10 -7 9.4 -4.6C8.6 -1.8 4 -0.6 -1 -0.8C-5 -1 -7.8 -1.6 -7.4 -3.6z') + A.P(A.lt(c, 0.25), 'M-4.6 -6.6Q-1 -9.4 3 -9.2Q-0.8 -8 -3.2 -5.6z', 0.7)
    + A.P(A.dk(c, 0.34), A.circ(-2.4, -5.2, 1.1) + A.circ(-4.8, -3.8, 0.8));
  const throat = _glPart('throat', 6, -3.4, A.P(b, A.ell(5.6, -3.2, 3.6, 2.2)));
  const eyes = A.P(c, A.circ(5.4, -9.8, 2.6)) + _glEye(5.9, -10.2, 1.5) + A.S(d, 0.6, 'M7.2 -6Q9 -5.4 9.4 -6.4');
  const upper = _glPart('dry', 0, 0, legs + front) ;
  return { svg: `<g transform="scale(${k})">${_glPart('frog', 0, 0, upper + body + throat + eyes)}</g>`, clips: { rest: 'blink', hop: 'stretch', react: 'croak', swim: 'in-water blink', hide: 'in-water', fly: 'stretch', sleep: 'blink' } };
};

/* ---------- birds: a plump side-on bird: wing, head and tail are parts, legs tuck up to fly ---------- */
GL_KITS.bird = function (p) {
  const A = GART, body = p.body || '#8a6a4a', belly = p.belly || A.lt(body, 0.45), wing = p.wing || A.dk(body, 0.2), head = p.head || body, beak = p.beak || '#3a2c20', leg = p.leg || '#5a4030', k = p.k || 1, bib = p.bib, cap = p.cap;
  const tailLen = p.tail || 8, tail = _glPart('tail', -6, -8, A.P(A.dk(wing, 0.15), `M-5 -9.4L${-6 - tailLen} -${10.6 + tailLen * 0.14}L${-6.6 - tailLen} -${7.2 + tailLen * 0.1}L-5 -6.6z`));
  const legs = _glPart('legs', 0, -3, A.S(leg, 0.9, 'M-0.4 -3.4L-1.2 -0.1L0.8 0M2.4 -3.4L2.4 -0.1L4.4 0'));
  const torso = A.P(body, 'M-6.8 -8.6C-6.4 -13 -2 -15.2 2.4 -14.6C7 -14 8.8 -10.8 8.2 -7.8C7.6 -4.2 3.6 -2.4 -0.4 -2.8C-4.4 -3.2 -7.2 -5.4 -6.8 -8.6z') + A.P(belly, 'M-3.4 -3.8C0.4 -2.2 6.2 -3.2 7.8 -7.8C8 -9 7.8 -10 7.4 -10.8C5.4 -7.2 0.6 -5 -3.4 -3.8z');
  const wingD = 'M-7.6 -8.6C-5.2 -11.8 -0.6 -12.8 2.6 -11C2.2 -7.8 -1.6 -5.6 -5.2 -6C-6.4 -6.2 -8 -7.4 -7.6 -8.6z';
  const wg = _glPart('wing', 1.6, -10.6, A.P(wing, wingD) + A.S(A.dk(wing, 0.3), 0.45, 'M-5.4 -8.8Q-2 -9.8 1 -10M-5 -7.4Q-2.4 -8 0 -8.8', 0.7));
  const headG = _glPart('head', 5, -12, A.P(head, A.circ(6.4, -14.8, 4.6)) + (cap ? A.P(cap, 'M2.2 -16.2C3 -19.6 8.8 -20.6 10.4 -16.8C7.8 -18 4.6 -17.8 2.2 -16.2z') : '') + (bib ? A.P(bib, 'M5.4 -12.2C7.2 -13 9.8 -13 10.8 -14.2C11.2 -11.8 9.8 -9.2 7.6 -8.2C5.4 -8 4.4 -10.4 5.4 -12.2z') : '') + _glEye(8, -15.8, 0.95) + A.P(beak, 'M10.6 -15.6L13.8 -14.6L10.6 -13.6z'));
  return { svg: `<g transform="scale(${k})">${tail}${legs}${_glPart('torso', 0, -3, torso + wg)}${headG}</g>`,
    clips: { rest: 'blink tail-bob', preen: 'preen blink', peck: 'peck', walk: 'hopstep blink', hop: 'hopstep', fly: 'flap legs-up', alert: 'look', react: 'hopstep look', sleep: 'sleep-bird', sniff: 'peck' } };
};

/* ---------- duck: on the water: a boat of a bird; the lower half is the water's ---------- */
GL_KITS.duck = function (p) {
  const A = GART, body = p.body || '#a08462', head = p.head || '#2f6a4a', collar = p.collar, belly = p.belly || A.lt(body, 0.4), beak = p.beak || '#e8b838', k = p.k || 1;
  const hull = A.P(body, 'M-12 -6.6C-10 -9.6 -4 -10.8 2 -10.2C7 -9.6 10 -7.4 10 -5C10 -2.4 5 -1 -1 -1C-6 -1 -10 -2.4 -12 -6.6z') + A.P(belly, 'M-9 -3.4C-4 -1.2 5 -1 9.6 -4.2C6 -3.8 -3 -3.6 -9 -3.4z') + A.P(A.dk(body, 0.25), 'M-14.6 -9.4L-9 -7.6L-10 -5.4z') + A.P(A.dk(body, 0.2), 'M-8 -7.2C-4 -9.2 1 -8.8 3 -7C0 -4.8 -5 -4.8 -8 -7.2z');
  const hd = _glPart('head', 7, -9, (collar ? A.S(collar, 1.3, 'M6.2 -9.6Q8.4 -8.6 10.2 -9.8') : '') + A.S(head, 3.6, 'M7.6 -8.6L8.8 -13') + A.P(head, A.circ(9, -15, 3.9)) + _glEye(10.4, -15.8, 0.8) + A.P(beak, 'M12.4 -15.6Q16 -15.2 16.6 -13.8Q14.4 -13 12.2 -13.6z'));
  return { svg: `<g transform="scale(${k})">${_glPart('float', 0, -2, hull + hd)}</g>`, clips: { rest: 'float blink', swim: 'float', peck: 'dabble', preen: 'float look', react: 'float look', fly: 'float', sleep: 'float' } };
};

/* ---------- hedgehog: a dome of spines; curls to a ball ---------- */
GL_KITS.hedgehog = function (p) {
  const A = GART, sp = p.spine || '#6a5240', sp2 = A.lt(sp, 0.35), face = p.face || '#d6bb97', k = p.k || 1;
  let spines = ''; const r = A.rng('hog');
  for (let i = 0; i < 40; i++) { const a = -Math.PI + (i / 39) * Math.PI * 0.82, R = 9 + r() * 4.5, x = -2 + Math.cos(a) * R * 1.05, y = -3 + Math.sin(a) * R * 0.86; spines += `M${_glF(x)} ${_glF(y)}l${_glF(Math.cos(a - 0.4) * 2.8)} ${_glF(Math.sin(a - 0.4) * 2.8)}`; }
  const open = A.P(A.dk(face, 0.25), A.ell(4, 0, 2.2, 0.8) + A.ell(-6, 0, 2.2, 0.8)) + _glPart('legs', 0, -1, A.S(A.dk(face, 0.3), 1.8, 'M-5 -2V-0.4') + A.S(A.dk(face, 0.3), 1.8, 'M4 -2V-0.4'))
    + _glPart('head', 6, -5, A.P(face, 'M4 -8.6C8 -9 12 -6 15.6 -3.6C13 -1.4 7 -1 4 -2.2z') + A.P('#2a1c14', A.circ(15.6, -3.8, 1.15)) + _glEye(9.4, -6.2, 0.9) + A.P(A.dk(face, 0.15), A.circ(5.6, -9, 1.5)));
  const dome = A.P(sp, 'M-13 -1.4C-14 -8 -8 -14 -1 -13.6C4 -13.2 7.4 -9.4 7.6 -3.6C4 -1.6 -8 -0.8 -13 -1.4z') + A.S(sp2, 0.75, spines) + A.S(A.dk(sp, 0.25), 0.7, spines, 0.5);
  const ball = _glPart('ball', 0, -6, A.P(sp, A.circ(-1, -6.8, 7.8)) + A.S(sp2, 0.8, 'M-7 -9l-2 -2M-4 -12l-1 -2.6M0 -13l0.6 -2.6M4 -11l2 -2M6 -7l2.6 -0.6M-9 -5l-2.4 0M5 -3l2.4 1M-6 -2l-2 1.6') + A.P(face, 'M4.4 -5C5.8 -4.8 6.2 -3 5 -2.4C4 -2.6 3.4 -4 4.4 -5z'));
  return { svg: `<g transform="scale(${k})">${_glPart('open', 0, 0, open + dome)}${ball}</g>`, clips: { rest: 'ball-off breathe', walk: 'ball-off walk-legs', run: 'ball-off walk-legs', sniff: 'ball-off sniff', hide: 'open-off', react: 'open-off', sleep: 'open-off breathe-ball', alert: 'open-off' } };
};

/* ---------- four legs: fox, cat, otter, stag: one body in proportions, a stand and a curled sleep ---------- */
GL_KITS.quad = function (p) {
  const A = GART, c = p.coat || '#c8693a', b = p.belly || A.lt(c, 0.5), d = p.dark || A.dk(c, 0.42), L = p.len || 16, H = p.h || 14, legH = p.legH || 8, k = p.k || 1, tailKind = p.tail || 'brush';
  const by = -legH - H * 0.45, hx = L * 0.62, hy = by - H * (p.neckUp || 0.72), br = H * 0.46;
  const leg = (x, cls, cDark) => _glPart(cls, x, by + 2, A.S(cDark, Math.max(1.6, H * 0.17), `M${_glF(x)} ${_glF(by + 2)}L${_glF(x)} -0.6`) + A.P(p.sock || cDark, A.ell(x + 0.6, -0.5, Math.max(1.3, H * 0.13), 0.8)));
  const legsFar = leg(-L * 0.46, 'leg-b', d) + leg(L * 0.22, 'leg-a', d), legsNear = leg(-L * 0.26, 'leg-a', A.dk(c, 0.1)) + leg(L * 0.42, 'leg-b', A.dk(c, 0.1));
  let tail = '', tx = -L * 0.56, ty = by - H * 0.1;
  if (tailKind === 'brush') tail = A.P(c, `M${tx} ${ty}C${tx - L * 0.5} ${ty - 1} ${tx - L * 0.82} ${ty + H * 0.2} ${tx - L * 0.9} ${ty + H * 0.46}C${tx - L * 0.6} ${ty + H * 0.72} ${tx - L * 0.2} ${ty + H * 0.5} ${tx + 2} ${ty + H * 0.34}z`) + A.P(p.tip || '#f4ecdc', `M${tx - L * 0.9} ${ty + H * 0.46}C${tx - L * 0.76} ${ty + H * 0.24} ${tx - L * 0.66} ${ty + H * 0.32} ${tx - L * 0.58} ${ty + H * 0.32}C${tx - L * 0.6} ${ty + H * 0.54} ${tx - L * 0.76} ${ty + H * 0.58} ${tx - L * 0.9} ${ty + H * 0.46}z`);
  else if (tailKind === 'whip') tail = A.S(c, Math.max(1.8, H * 0.18), `M${tx + 1} ${ty}C${tx - L * 0.4} ${ty - H * 0.2} ${tx - L * 0.5} ${ty - H * 0.9} ${tx - L * 0.3} ${ty - H * 1.25}`) + (p.tip ? A.S(p.tip, Math.max(1.8, H * 0.18), `M${tx - L * 0.33} ${ty - H * 1.05}L${tx - L * 0.3} ${ty - H * 1.25}`) : '');
  else if (tailKind === 'long') tail = A.S(c, Math.max(2.4, H * 0.24), `M${tx + 1} ${ty}C${tx - L * 0.5} ${ty + 1} ${tx - L * 0.8} ${ty + H * 0.4} ${tx - L * 1.05} ${ty + H * 0.8}`);
  else tail = A.P(p.tip || b, A.circ(tx - 1, ty - 1, H * 0.2));
  const torso = A.P(c, `M${-L * 0.62} ${by}C${-L * 0.62} ${by - H * 0.6} ${-L * 0.1} ${by - H * 0.62} ${L * 0.36} ${by - H * 0.56}C${L * 0.6} ${by - H * 0.5} ${L * 0.68} ${by + H * 0.16} ${L * 0.5} ${by + H * 0.42}C${L * 0.1} ${by + H * 0.56} ${-L * 0.4} ${by + H * 0.6} ${-L * 0.62} ${by}z`)
    + A.P(b, `M${-L * 0.34} ${by + H * 0.46}C${0} ${by + H * 0.6} ${L * 0.34} ${by + H * 0.5} ${L * 0.52} ${by + H * 0.3}C${L * 0.3} ${by + H * 0.3} ${-L * 0.1} ${by + H * 0.36} ${-L * 0.34} ${by + H * 0.46}z`, 0.95)
    + A.P(p.saddle || A.dk(c, 0.12), `M${-L * 0.5} ${by - H * 0.24}C${-L * 0.24} ${by - H * 0.58} ${L * 0.2} ${by - H * 0.6} ${L * 0.38} ${by - H * 0.46}C${L * 0.1} ${by - H * 0.34} ${-L * 0.26} ${by - H * 0.22} ${-L * 0.5} ${by - H * 0.24}z`, 0.75);
  const ear = (x, cc) => A.P(cc, p.earKind === 'round' ? A.circ(x, hy - br * 0.9, br * 0.36) : `M${_glF(x - br * 0.36)} ${_glF(hy - br * 0.62)}L${_glF(x + br * 0.04)} ${_glF(hy - br * 1.55)}L${_glF(x + br * 0.42)} ${_glF(hy - br * 0.58)}z`);
  const antlers = p.antlers ? A.S(p.antlers, 1.2, `M${hx - 1} ${hy - br * 0.8}C${hx - 3} ${hy - br * 2} ${hx - 8} ${hy - br * 2.6} ${hx - 7} ${hy - br * 3.6}M${hx - 3} ${hy - br * 1.8}L${hx + 1} ${hy - br * 2.8}M${hx - 5.4} ${hy - br * 2.6}L${hx - 11} ${hy - br * 3}M${hx + 1} ${hy - br * 0.8}C${hx + 3} ${hy - br * 2} ${hx + 7} ${hy - br * 2.4} ${hx + 7} ${hy - br * 3.4}M${hx + 3} ${hy - br * 1.8}L${hx + 8} ${hy - br * 2}`) : '';
  const headG = _glPart('head', hx - br * 0.4, hy + br * 0.6, antlers + ear(hx - br * 0.5, d) + (p.neck !== false ? A.S(c, H * 0.5, `M${L * 0.42} ${by - H * 0.2}L${hx - br * 0.1} ${hy + br * 0.3}`) : '') + A.P(c, A.ell(hx, hy, br * 1.04, br * 0.94)) + ear(hx + br * 0.34, c)
    + A.P(p.muzzle || b, `M${hx + br * 0.16} ${hy + br * 0.08}C${hx + br * 0.7} ${hy - br * 0.1} ${hx + br * 1.4} ${hy + br * 0.14} ${hx + br * (p.snout || 1.5)} ${hy + br * 0.42}C${hx + br} ${hy + br * 0.8} ${hx + br * 0.3} ${hy + br * 0.84} ${hx + br * 0.16} ${hy + br * 0.08}z`)
    + A.P('#201612', A.circ(hx + br * (p.snout || 1.5), hy + br * 0.38, Math.max(0.8, br * 0.17))) + _glEye(hx + br * 0.44, hy - br * 0.18, Math.max(0.8, br * 0.17)));
  const stand = _glPart('stand', 0, 0, legsFar + _glPart('tail', tx, ty, tail) + _glPart('body', 0, by, torso + legsNear) + headG);
  const SR = (H * 0.7 + L * 0.34), sx = SR * 0.54, sy = -SR * 0.52;   // the curled sleep: one soft bun, the head resting on it, the tail round the front
  const earS = (x, cc) => A.P(cc, p.earKind === 'round' ? A.circ(x, sy - br * 0.8, br * 0.34) : `M${_glF(x - br * 0.38)} ${_glF(sy - br * 0.5)}L${_glF(x)} ${_glF(sy - br * 1.45)}L${_glF(x + br * 0.4)} ${_glF(sy - br * 0.5)}z`);
  const curled = _glPart('curl', 0, -SR * 0.5, A.P(c, `M${-SR} -0.6C${-SR * 1.1} ${-SR * 0.86} ${-SR * 0.3} ${-SR * 1.06} ${SR * 0.3} ${-SR * 0.96}C${SR * 0.9} ${-SR * 0.88} ${SR * 1.06} ${-SR * 0.3} ${SR} -0.6z`) + A.P(p.saddle || A.dk(c, 0.12), `M${-SR * 0.84} ${-SR * 0.42}C${-SR * 0.54} ${-SR * 0.86} ${SR * 0.04} ${-SR * 0.96} ${SR * 0.3} ${-SR * 0.84}C${SR * 0.02} ${-SR * 0.72} ${-SR * 0.44} ${-SR * 0.5} ${-SR * 0.84} ${-SR * 0.42}z`, 0.8)
    + (tailKind === 'long' || tailKind === 'whip' || tailKind === 'brush' ? A.S(p.tailC || (tailKind === 'brush' ? c : A.dk(c, 0.06)), Math.max(2.4, H * 0.3), `M${-SR * 0.94} ${-SR * 0.16}C${-SR * 0.4} ${SR * 0.02} ${SR * 0.3} ${SR * 0.02} ${SR * 0.8} ${-SR * 0.16}`) + (p.tip ? A.S(p.tip, Math.max(2.4, H * 0.3), `M${SR * 0.58} ${-SR * 0.08}L${SR * 0.8} ${-SR * 0.16}`) : '') : '')
    + earS(sx - br * 0.5, d) + A.P(c, A.ell(sx, sy, br * 1.04, br * 0.88)) + earS(sx + br * 0.42, c) + A.P(p.muzzle || b, A.ell(sx + br * 0.62, sy + br * 0.36, br * 0.5, br * 0.36)) + A.P('#201612', A.circ(sx + br * 1.06, sy + br * 0.24, Math.max(0.7, br * 0.13))) + A.S('#201612', 0.8, `M${_glF(sx + br * 0.04)} ${_glF(sy - br * 0.08)}q${_glF(br * 0.3)} ${_glF(br * 0.24)} ${_glF(br * 0.6)} 0`));
  return { svg: `<g transform="scale(${k})">${stand}${curled}</g>`, clips: { rest: 'curl-off blink tail-sway', walk: 'curl-off legs-walk tail-sway', run: 'curl-off legs-run', sniff: 'curl-off sniff', alert: 'curl-off look blink', react: 'curl-off look', sleep: 'stand-off breathe-curl', hop: 'curl-off legs-run', peck: 'curl-off sniff', hide: 'curl-off look' } };
};

/* ---------- squirrel: sits up with a great S of tail ---------- */
GL_KITS.squirrel = function (p) {
  const A = GART, c = p.c || '#b0562c', b = p.b || '#f2e6d0', d = A.dk(c, 0.28), k = p.k || 1;
  const tail = _glPart('tail', -5, -3, A.P(c, 'M-4 -1C-11 -1 -16 -7 -14.6 -14C-13.6 -19 -9 -22 -6 -20C-3.6 -18.4 -5.4 -15 -7.6 -13.6C-9.6 -11 -8 -6.6 -3 -5.6z') + A.P(A.lt(c, 0.22), 'M-12.4 -15C-11.4 -18.6 -8.6 -20 -6.8 -19C-9.4 -18.2 -10.8 -15 -11.2 -11.8z', 0.85));
  const body = A.P(c, 'M-5.4 -1C-7.4 -6 -4.6 -11.4 0.2 -12.4C4.6 -12.4 6.6 -7 5.4 -1.2C2 0 -3 0.2 -5.4 -1z') + A.P(b, 'M1 -11C4.6 -10 5.8 -6 4.6 -1.4C2.6 -1 0.8 -3.4 0.4 -6.8z');
  const legs = _glPart('legs', 0, -2, A.P(d, A.ell(-1.8, -0.6, 3.4, 1.2) + A.ell(4.2, -0.5, 2, 0.8)) + A.S(d, 1.2, 'M3.6 -8L6 -6.4'));
  const head = _glPart('head', 2, -12, A.P(c, 'M-1 -15C-1 -18.6 3.6 -20 6.4 -18C8.8 -16.4 9.6 -14.2 9.8 -13.2C8 -11.2 1.6 -10.6 -1 -15z') + A.P(d, 'M0.4 -18.2L0.4 -21.4L3 -19.4z') + A.P(b, 'M4 -13.6Q7 -12.4 9.6 -13.2Q7.4 -11.2 4.6 -11.6z') + A.P('#201612', A.circ(9.6, -13.8, 0.65)) + _glEye(5.4, -16, 0.95) );
  return { svg: `<g transform="scale(${k})">${tail}${legs}${body}${head}</g>`, clips: { rest: 'blink tail-flick', walk: 'hopstep tail-flick', run: 'hopstep', hop: 'hopstep', peck: 'nibble', sniff: 'nibble', alert: 'look tail-flick', react: 'nibble tail-flick', preen: 'nibble', sleep: 'blink' } };
};

/* ---------- rabbit: long ears; nose twitches ---------- */
GL_KITS.rabbit = function (p) {
  const A = GART, c = p.c || '#9a8468', b = p.b || '#efe6d4', d = A.dk(c, 0.28), k = p.k || 1;
  const ears = _glPart('ears', 6, -15, A.P(d, 'M3.4 -15C2 -20 2 -27 4.4 -28C6.8 -27 6.8 -20 6 -15z') + A.P(c, 'M6 -15.4C6.4 -20.6 7.6 -27 10 -27.4C12 -26 11 -19.4 8.8 -14.8z') + A.P('#e6b5a6', 'M7.4 -16C8 -20 8.8 -24.6 9.8 -25.4C10.4 -23 9.6 -19 8.4 -15.8z', 0.85));
  const body = _glPart('body', 0, -2, A.P(c, 'M-10 -1C-11.6 -7 -7 -13 -0.6 -13.4C4.4 -13.4 7 -9 6.6 -1.2C2 -0.4 -5 -0.2 -10 -1z') + A.P(b, A.circ(-10.4, -5, 3)) + A.P(d, A.ell(-3, -0.8, 4.6, 1.3) + A.ell(5.6, -0.5, 2.1, 0.8)) + A.P(b, 'M2 -9C4.6 -8.2 5.4 -5 4.6 -2C3 -2.6 1.6 -5.6 2 -9z', 0.9));
  const head = _glPart('head', 5, -12, A.P(c, A.ell(6.8, -14.6, 5, 4.3)) + A.P(b, A.ell(10, -13.2, 2.1, 1.7)) + _glPart('nose', 11.4, -14, A.P('#c88a7a', A.circ(11.6, -14, 0.8))) + _glEye(7.8, -15.8, 1));
  return { svg: `<g transform="scale(${k})">${ears}${body}${head}</g>`, clips: { rest: 'blink nose ear-twitch', hop: 'stretch-body ears-back', walk: 'stretch-body ears-back', run: 'stretch-body ears-back', peck: 'nibble', sniff: 'nibble', alert: 'look blink', react: 'nibble ear-twitch', dig: 'nibble', sleep: 'blink' } };
};

/* ---------- things that do not move much (eggs, gifts): kit 'thing' takes ready markup ---------- */
GL_KITS.thing = function (p) { return { svg: p.svg || '', clips: Object.assign({ rest: p.clip || '' }, p.clips || {}) }; };

/** The art for a row: {svg, clips}, built once per row. */
const _glArtCache = new Map();
function gardenLifeArt(def) {
  let a = _glArtCache.get(def);
  if (a) return a;
  const spec = def.art || ['thing', {}], fn = GL_KITS[spec[0]];
  try { a = fn ? fn(spec[1] || {}) : { svg: '', clips: {} }; } catch (e) { console.error('[garden life]', def.id, e); a = { svg: '', clips: {} }; }
  if (def.clips) a = { svg: a.svg, clips: Object.assign({}, a.clips, def.clips) };
  _glArtCache.set(def, a);
  return a;
}

/* ---------- bat: membranes on two hinges; the body hangs between ---------- */
GL_KITS.bat = function (p) {
  const A = GART, c = p.c || '#3a3038', d = A.dk(c, 0.3), k = p.k || 1;
  const wl = _glPart('wing-b', -1, -6, A.P(d, 'M-1 -7C-5 -11 -11 -12 -16 -9C-14 -7.4 -13 -6 -12.6 -4.4C-11 -5.4 -9.4 -5.4 -8.4 -3.6C-6.6 -5 -4.4 -5 -1.4 -4z')), wr = _glPart('wing-b', 1, -6, A.P(c, 'M1 -7C5 -11 11 -12 16 -9C14 -7.4 13 -6 12.6 -4.4C11 -5.4 9.4 -5.4 8.4 -3.6C6.6 -5 4.4 -5 1.4 -4z'));
  return { svg: `<g transform="scale(${k})">${wl}${A.P(c, A.ell(0, -5.4, 3, 3.6))}${A.P(c, 'M-2.4 -8L-2.8 -11.6L-0.8 -9.2zM2.4 -8L2.8 -11.6L0.8 -9.2z')}${A.P('#ffd24a', A.circ(-1, -7, 0.5) + A.circ(1, -7, 0.5))}${wr}</g>`, clips: { rest: 'flap-b', fly: 'flap-b', react: 'flap-b' } };
};
