/* ============================================================
   THE SPECTACLES (2.23, agent 'craft'): the rare, wonderful things a pet can do. Each is ONE DATA ENTRY in PET_WOW, a list of what happens when, from the effects
   library (97-pets-tricks-2fx.js). How you get one and how rare it is lives in PET_TRICK_BOOK (97-pets-tricks-1rules.js). Add a new spectacle: add a row here and a row there.

     petWowRun(id, where, o)   where: the page's stage (petStageMount's S), or 'garden' (your pet in the garden). -> a handle, or null when there is nothing to play it on
     _fxOutlineOf(svg)         the pet's own shapes as chains of points, in window pixels (the constellation is YOUR pet)
   ============================================================ */
const _WN = '#060a2a', _WSTAR = Object.freeze({ from: 'wide', spr: 'star', speed: 0, size: [4, 11], life: [1.6, 3.2], c: ['#dfe8ff', '#ffffff', '#bcd4ff'], fi: 0.3, fo: 0.4, o: 0.9 });
const _WBURST = Object.freeze({ from: 'pet', spr: 'spark', speed: [90, 460], drag: 0.42, g: 120, life: [0.6, 1.6], size: [9, 24], end: 0.1, fo: 0.6 });
const PET_WOW = {
  constellation: { ms: 9000, still: 4.2, steps: [
    [0, 'tint', { c: _WN, a: 0.74, dur: 9, in: 0.08, out: 0.08 }], [0, 'vignette', { a: 0.7, dur: 9 }], [0, 'sound', { s: 'night' }],
    [0, 'emit', Object.assign({ rate: 34, dur: 7.6 }, _WSTAR)],
    [0.5, 'glow', { c: '#7fa8ff', r: 150, a: 0.9, dur: 1.5 }], [0.9, 'hide', { ms: 500 }], [0.9, 'react', { clip: 'look' }],
    [0.8, 'constellation', { dur: 6.9 }],
    [6.4, 'sound', { s: 'sparkle' }],
    [7.7, 'hide', { on: false, ms: 120 }], [7.7, 'pet', { clip: 'reborn' }], [7.7, 'flash', { a: 0.5, c: '#cfe0ff' }], [7.7, 'ring', { c: '#bcd4ff', r1: 460, w: 14, dur: 1.2 }], [7.7, 'emit', Object.assign({ n: 70, c: ['#ffffff', '#bcd4ff', '#8ab0ff'] }, _WBURST)], [7.7, 'sound', { s: 'chime' }],
  ] },
  phoenix: { ms: 7200, still: 2.6, res: 0.8, steps: [
    [0, 'tint', { c: '#2a0800', a: 0.52, dur: 7.2, in: 0.08, out: 0.14 }], [0, 'vignette', { c: '#160300', a: 0.6, dur: 7.2 }], [0, 'sound', { s: 'flame' }],
    [0, 'emit', { from: 'ring', r: [150, 300], spr: 'ember', speed: 0, attract: 620, swirl: 170, rate: 90, dur: 1.4, life: [0.5, 0.9], size: [10, 22], end: 0.5, c: ['#ff7a30', '#ffb040', '#ffd060'] }],
    [0, 'glow', { c: '#ff8a30', r: 200, a: 0.95, dur: 1.7, grow: 1, in: 0.6, out: 0.1 }],
    [0.3, 'pet', { clip: 'dissolve' }], [1.4, 'hide', { ms: 160 }],
    [1.45, 'flash', { a: 0.45, c: '#ffb060' }], [1.45, 'nudge', { px: 9, dur: 0.6 }], [1.45, 'ring', { c: '#ffb040', r1: 500, w: 18, dur: 1 }], [1.45, 'shake', { r: 640 }], [1.45, 'sound', { s: 'roar' }], [1.5, 'react', { clip: 'startled' }],
    [1.45, 'wings', { dur: 2.5 }], [1.45, 'glow', { c: '#ffa030', r: 340, a: 0.9, dur: 2.5 }],
    [1.45, 'emit', { from: 'ground', spread: 34, spr: 'ember', dir: -90, arc: 34, speed: [260, 620], drag: 0.68, rate: 130, dur: 2.3, life: [0.5, 1.2], size: [12, 30], end: 0.3, c: ['#ff6a20', '#ffa030', '#ffd060', '#fff0b0'] }],
    [4, 'glow', { c: '#ff7a30', r: 70, a: 1, y: 0.1, dur: 1.15, in: 0.2, out: 0.05, pulse: 0.2 }], [4.1, 'ring', { c: '#ffa030', r0: 10, r1: 90, w: 5, dur: 0.5, y: 0.1 }], [4.1, 'sound', { s: 'pop' }], [4.62, 'ring', { c: '#ffc060', r0: 10, r1: 130, w: 6, dur: 0.5, y: 0.1 }], [4.62, 'sound', { s: 'pop' }],
    [5.15, 'flash', { a: 0.9, c: '#fff0c0' }], [5.15, 'hide', { on: false, ms: 30 }], [5.15, 'pet', { clip: 'reborn' }], [5.15, 'ring', { c: '#ffe08a', r1: 640, w: 20, dur: 1.1 }], [5.15, 'rays', { n: 18, len: 800, dur: 1.8, a: 0.5, spin: 0.7, c: '#ffd080' }], [5.15, 'nudge', { px: 13, dur: 0.6 }], [5.15, 'sound', { s: 'chime' }],
    [5.15, 'emit', Object.assign({ n: 130, c: ['#ffd060', '#ffffff', '#ff9a40'] }, _WBURST)],
    [5.3, 'emit', { from: 'pet', spread: 160, y: 1.8, spr: 'ash', c: '#4a3a34', add: false, g: 28, sway: 1, rate: 22, dur: 1.5, speed: [4, 20], life: [1.2, 1.9], size: [5, 10], spin: 3, o: 0.8 }],
  ] },
  rainbow: { ms: 7000, still: 3.5, steps: [
    [0, 'tint', { c: '#fff4d0', a: 0.14, dur: 7 }], [0, 'glow', { c: '#fff4c0', r: 520, a: 0.5, dur: 7 }], [0, 'pet', { clip: 'highjump' }],
    [0.45, 'sound', { s: 'chime' }], [0.5, 'rainbow', { dur: 6.3 }], [0.5, 'emit', Object.assign({ n: 30, c: ['#ffffff', '#ffe14a', '#ff9ac0'] }, _WBURST)],
    [0.8, 'shake', { r: 900, wave: 1 }], [1.1, 'react', { clip: 'jump' }], [1.8, 'pet', { clip: 'dance' }], [1.6, 'sound', { s: 'sparkle' }], [3.1, 'shake', { r: 900, wave: 1 }], [4.3, 'pet', { clip: 'proud' }],
  ] },
  dragon: { ms: 6800, still: 3.1, res: 0.8, steps: [
    [0, 'tint', { c: '#120500', a: 0.56, dur: 6.8, in: 0.08, out: 0.12 }], [0, 'vignette', { c: '#0a0300', a: 0.62, dur: 6.8 }],
    [0, 'emit', { from: 'edge', spr: 'leaf', c: '#6a7a3a', add: false, speed: 0, attract: 700, rate: 42, dur: 1.5, life: [0.6, 1.1], size: [8, 16], spin: 8, o: 0.8 }], [0, 'sound', { s: 'whoosh' }], [0, 'shake', { r: 900 }],
    [0.1, 'pet', { clip: 'rearup' }], [0.3, 'dragon', { dur: 6.3 }], [0.3, 'sound', { s: 'flame' }], [0.5, 'glow', { c: '#ff9030', r: 260, a: 0.6, dur: 5.6 }],
    [2, 'pet', { clip: 'proud' }], [3.05, 'sound', { s: 'roar' }], [3.05, 'nudge', { px: 15, dur: 0.9 }], [3.05, 'flash', { a: 0.22, c: '#ffc070' }], [3.05, 'react', { clip: 'startled' }], [3.05, 'shake', { r: 1000 }],
    [3.05, 'emit', { from: 'pet', y: 3, spread: 200, spr: 'ember', speed: [60, 280], drag: 0.6, n: 80, life: [0.6, 1.4], size: [8, 22], end: 0.3, c: ['#ffd060', '#ffa030', '#fff0b0'] }],
  ] },
  timestop: { ms: 7800, still: 3.6, steps: [
    [0, 'timestop', { dur: 7.8, freeze: 0.24, spiral: 0.36, go: 0.82 }], [0.2, 'tint', { c: '#1a1a3a', a: 0.14, dur: 1.7, in: 0.3, out: 0.01 }],
    [1.87, 'sound', { s: 'tick' }], [1.87, 'tint', { c: '#22305e', a: 0.46, dur: 4.5, in: 0.03, out: 0.02 }], [1.87, 'freeze', {}], [1.87, 'ring', { c: '#dfe8ff', r1: 900, w: 8, dur: 1, flat: 0.7 }], [1.87, 'flash', { a: 0.28, c: '#dfe8ff' }],
    [2.6, 'pet', { clip: 'sway' }], [4.2, 'sound', { s: 'tick' }], [5.2, 'sound', { s: 'tick' }],
    [6.4, 'freeze', { on: false }], [6.4, 'sound', { s: 'whoosh' }], [6.4, 'flash', { a: 0.45, c: '#ffe8f0' }], [6.4, 'ring', { c: '#ffd8e8', r1: 800, w: 16, dur: 1 }], [6.4, 'nudge', { px: 8, dur: 0.4 }], [6.4, 'pet', { clip: 'jazz' }], [6.45, 'react', { clip: 'startled' }], [6.4, 'shake', { r: 900 }],
  ] },
  ascend: { ms: 6800, still: 3, res: 0.75, steps: [
    [0, 'tint', { c: '#101a40', a: 0.42, dur: 6.8 }], [0, 'vignette', { a: 0.5, dur: 6.8 }], [0, 'sound', { s: 'choir' }],
    [0.2, 'beam', { dur: 6.2, w: 130 }], [0.3, 'emit', { from: 'ground', spread: 38, spr: 'spark', dir: -90, arc: 8, speed: [70, 210], rate: 46, dur: 5.6, life: [1, 2.2], size: [5, 15], c: ['#fff6d0', '#ffffff', '#ffe08a'] }],
    [0.3, 'react', { clip: 'bow' }], [0.5, 'pet', { clip: 'hover' }], [0.9, 'lift', { y: -170, dur: 2.2, ease: 'cubic-bezier(.45,0,.3,1)' }], [1.2, 'glow', { c: '#fff4c0', r: 170, a: 0.85, dur: 3.2, y: 2.4 }],
    [1.6, 'ring', { c: '#fff0b0', r0: 20, r1: 70, w: 4, dur: 0.9, y: 2.6, flat: 0.32 }], [2.3, 'ring', { c: '#fff0b0', r0: 20, r1: 70, w: 4, dur: 0.9, y: 2.6, flat: 0.32 }], [3, 'ring', { c: '#fff0b0', r0: 20, r1: 70, w: 4, dur: 0.9, y: 2.6, flat: 0.32 }],
    [1.4, 'emit', { from: 'pet', spread: 90, y: 2.4, spr: 'feather', c: '#ffffff', add: false, g: 16, sway: 1, rate: 11, dur: 3.2, speed: [4, 22], life: [2, 3], size: [14, 24], spin: 1.6 }],
    [3.7, 'lift', { y: 0, dur: 1.9, ease: 'cubic-bezier(.3,0,.3,1)' }], [3.7, 'pet', { clip: 'hover' }], [5.6, 'ring', { c: '#fff0c0', r1: 420, w: 10, dur: 1.1 }], [5.6, 'emit', Object.assign({ n: 34, c: ['#fff6d0', '#ffffff'] }, _WBURST)], [5.6, 'sound', { s: 'sparkle' }],
  ] },
  portal: { ms: 4400, still: 1.5, steps: [
    [0, 'tint', { c: '#120a30', a: 0.3, dur: 4.4 }], [0, 'far', {}], [0, 'portal', { dur: 2.6, r: 96 }], [0.1, 'sound', { s: 'whoosh' }], [0.1, 'emit', { from: 'ground', spread: 50, spr: 'spark', dir: -90, arc: 20, speed: [60, 180], rate: 40, dur: 1.2, life: [0.4, 0.9], size: [6, 14], c: ['#c8a8ff', '#ffffff'] }],
    [0.42, 'pet', { clip: 'leapin' }], [1.3, 'hide', { ms: 30 }], [1.3, 'portal', { far: 1, dur: 2.4, r: 96 }], [1.36, 'hop', {}], [1.3, 'sound', { s: 'whoosh' }],
    [1.7, 'hide', { on: false, ms: 30 }], [1.7, 'pet', { clip: 'popout' }], [1.72, 'sound', { s: 'pop' }], [2, 'emit', Object.assign({ n: 44, c: ['#c8a8ff', '#ffffff', '#8a6aff'] }, _WBURST)], [2, 'ring', { c: '#b48aff', r1: 240, w: 8, dur: 0.8, y: 0 }], [2.3, 'react', { clip: 'look' }],
  ] },
  meteors: { ms: 7600, still: 3.4, steps: [
    [0, 'tint', { c: _WN, a: 0.7, dur: 7.6, in: 0.08, out: 0.1 }], [0, 'vignette', { a: 0.65, dur: 7.6 }], [0, 'sound', { s: 'night' }], [0, 'emit', Object.assign({ rate: 26, dur: 6.8 }, _WSTAR)],
    [0.3, 'pet', { clip: 'conduct' }], [0.5, 'meteors', { dur: 6.6, finale: 0.8, beats: [0.03, 0.08, 0.12, 0.18, 0.22, 0.26, 0.3, 0.34, 0.38, 0.42, 0.46, 0.5, 0.53, 0.56, 0.6, 0.63, 0.66, 0.7, 0.74] }], [1.2, 'sound', { s: 'sparkle' }], [2.9, 'pet', { clip: 'conduct' }], [3.2, 'sound', { s: 'sparkle' }], [2.2, 'react', { clip: 'look' }], [5.8, 'pet', { clip: 'proud' }],
    [5.9, 'ring', { c: '#ffe9c0', r1: 700, w: 14, dur: 1.2 }], [5.9, 'react', { clip: 'startled' }], [5.9, 'shake', { r: 1000 }],
  ] },
  goldenhour: { ms: 6000, still: 2.8, res: 0.6, steps: [
    [0, 'tint', { c: '#ff9a30', a: 0.26, dur: 6, in: 0.25, out: 0.3 }], [0, 'glow', { c: '#ffc060', r: 800, a: 0.5, dur: 6, in: 0.25, out: 0.3 }], [0, 'sound', { s: 'choir' }],
    [0.2, 'rays', { n: 34, len: 1500, dur: 5.6, a: 0.11, spin: 0.08, w: 0.05, c: '#ffe0a0' }], [0.2, 'pet', { clip: 'proud' }], [0.2, 'glow', { c: '#fff0c0', r: 130, a: 0.6, dur: 5.6 }],
    [0.4, 'emit', { from: 'wide', spr: 'ember', dir: -90, arc: 40, speed: [14, 50], rate: 46, dur: 5, life: [1.6, 3], size: [5, 13], c: ['#ffe08a', '#ffc860', '#fff0c0'], sway: 1, fi: 0.3 }],
    [0.6, 'shake', { r: 400, wave: 1 }], [1.2, 'shake', { r: 800, wave: 1 }], [1.9, 'shake', { r: 1200, wave: 1 }], [2.6, 'pet', { clip: 'sway' }], [0.8, 'react', { clip: 'sway' }],
  ] },
  galaxy: { ms: 6800, still: 3.2, res: 0.8, steps: [
    [0, 'tint', { c: _WN, a: 0.66, dur: 6.8, in: 0.1, out: 0.1 }], [0, 'vignette', { a: 0.7, dur: 6.8 }], [0, 'sound', { s: 'night' }], [0, 'emit', Object.assign({ rate: 22, dur: 5.8 }, _WSTAR)],
    [0.3, 'pet', { clip: 'beg' }], [0.5, 'galaxy', { dur: 5.2, r: 260, go: 0.8, y: 1.7, dx: 8 }], [0.8, 'sound', { s: 'rise' }], [2.5, 'pet', { clip: 'beg' }], [2.6, 'sound', { s: 'sparkle' }],
    [4.65, 'flash', { a: 0.6, c: '#dfd0ff' }], [4.65, 'ring', { c: '#c8a8ff', r1: 720, w: 16, dur: 1.2, y: 1.7, flat: 0.5 }], [4.65, 'nudge', { px: 10, dur: 0.5 }], [4.65, 'sound', { s: 'boom' }], [4.65, 'react', { clip: 'startled' }], [4.7, 'pet', { clip: 'jazz' }],
  ] },
  aurora: { ms: 7400, still: 3.6, res: 0.6, steps: [
    [0, 'tint', { c: '#04102a', a: 0.62, dur: 7.4, in: 0.1, out: 0.12 }], [0, 'emit', Object.assign({ rate: 24, dur: 6.4 }, _WSTAR)], [0, 'sound', { s: 'night' }],
    [0.2, 'aurora', { dur: 7 }], [0.7, 'pet', { clip: 'sing' }], [3.8, 'pet', { clip: 'sing' }], [0.9, 'emit', { from: 'pet', y: 1, spread: 24, spr: 'note', c: ['#c8ffe8', '#ffffff', '#a8e0ff'], dir: -80, arc: 40, speed: [30, 70], g: -12, rate: 3.5, dur: 5.4, life: [1.6, 2.6], size: [15, 24], spin: 0.5, add: false }], [1, 'react', { clip: 'sway' }],
  ] },
  fireflies: { ms: 6400, still: 3.2, res: 0.8, steps: [
    [0, 'tint', { c: '#0a1a30', a: 0.52, dur: 6.4 }], [0, 'vignette', { a: 0.45, dur: 6.4 }], [0, 'sound', { s: 'sparkle' }], [0.2, 'swarm', { dur: 6, gather: 0.36, hold: 0.76, n: 170 }],
    [0.4, 'pet', { clip: 'look' }], [2.6, 'pet', { clip: 'blowkiss' }], [3, 'sound', { s: 'chime' }], [4.7, 'pet', { clip: 'jump' }], [4.8, 'sound', { s: 'sparkle' }],
  ] },
  petalwhirl: { ms: 3800, still: 1.8, steps: [
    [0, 'pet', { clip: 'twirl' }], [0, 'sound', { s: 'whoosh' }], [0, 'shake', { r: 300 }],
    [0.05, 'emit', { from: 'ring', r: [50, 150], spr: 'petal', c: ['#ffc0d8', '#ffd8e8', '#ffa8c8', '#fff0f4', '#ff9ab8'], add: false, speed: 0, swirl: 1500, g: -260, drag: 0.42, rate: 130, dur: 2.3, life: [0.9, 1.5], size: [18, 34], spin: 7 }],
    [2.3, 'emit', { from: 'pet', spr: 'petal', c: ['#ffc0d8', '#ffd8e8', '#ffa8c8'], add: false, speed: [200, 700], drag: 0.5, g: 90, n: 80, life: [0.9, 1.6], size: [18, 32], spin: 8 }], [2.3, 'sound', { s: 'sparkle' }],
  ] },
  comet: { ms: 3800, still: 1.6, steps: [
    [0, 'tint', { c: '#0a1030', a: 0.34, dur: 3.8 }], [0, 'pet', { clip: 'leapin' }], [0.8, 'hide', { ms: 30 }], [0.72, 'flash', { a: 0.28, c: '#dff0ff' }], [0.72, 'sound', { s: 'whoosh' }],
    [0.75, 'comet', { dur: 2.2 }], [2.9, 'hide', { on: false, ms: 30 }], [2.9, 'pet', { clip: 'popout' }], [2.92, 'ring', { c: '#bfe0ff', r1: 300, w: 8, dur: 0.8, y: 0.1 }], [2.92, 'emit', Object.assign({ n: 44, c: ['#ffffff', '#bfe0ff', '#ffe9a8'] }, _WBURST)], [2.92, 'sound', { s: 'pop' }],
  ] },
  confetti: { ms: 2800, still: 1, steps: [
    [0, 'pet', { clip: 'jazz' }], [0.26, 'sound', { s: 'pop' }], [0.26, 'emit', { from: 'pet', y: 1, spr: 'petal', c: ['#f2607a', '#f6d35e', '#7cc0ea', '#7fd1ae', '#b39ce6', '#f08a3c'], add: false, dir: -90, arc: 80, speed: [360, 900], drag: 0.46, g: 420, n: 130, life: [1.3, 2.2], size: [14, 26], spin: 10, fi: 0.02 }],
  ] },
  bubbles: { ms: 3200, still: 1.4, steps: [
    [0, 'pet', { clip: 'hiccup' }], [0, 'sound', { s: 'pop' }], [0.1, 'emit', { from: 'pet', y: 0.7, spread: 34, spr: 'bubble', c: '#bfe8ff', add: false, dir: -90, arc: 54, speed: [40, 130], g: -30, sway: 1, rate: 30, dur: 2.2, life: [1.2, 2.4], size: [16, 46], fi: 0.1 }],
  ] },
};
function petWowIds() { return Object.keys(PET_WOW); }

/* ---------- your pet's own shape, in points ---------- */
/** The silhouette as one closed chain of points (and the eyes as two more stars), window pixels. The drawing's own paths are filled on a tiny canvas, and the edge traced. */
function _fxOutlineOf(svg) {
  const out = [];
  try {
    const body = svg.querySelector('.pt-bodyg'); if (!body) return out;
    const N = 96, can = document.createElement('canvas'); can.width = can.height = N;
    const g = can.getContext('2d', { willReadFrequently: true });
    const bb = body.getBoundingClientRect(), sc = (N - 8) / Math.max(bb.width, bb.height, 1), ox = bb.left - 4 / sc, oy = bb.top - 4 / sc;
    g.fillStyle = g.strokeStyle = '#000'; g.lineJoin = g.lineCap = 'round';
    for (const p of body.querySelectorAll('path')) {
      const d = p.getAttribute('d'); if (!d) continue;
      const m = p.getScreenCTM(); if (!m) continue;
      g.setTransform(m.a * sc, m.b * sc, m.c * sc, m.d * sc, (m.e - ox) * sc, (m.f - oy) * sc);
      const P2 = new Path2D(d), f = p.getAttribute('fill'), st = p.getAttribute('stroke');
      if (f && f !== 'none') g.fill(P2);
      if (st && st !== 'none') { g.lineWidth = Number(p.getAttribute('stroke-width')) || 1; g.stroke(P2); }
    }
    const px = g.getImageData(0, 0, N, N).data, on = (x, y) => x >= 0 && y >= 0 && x < N && y < N && px[(y * N + x) * 4 + 3] > 90;
    // the edge, walked with a hand on the wall (Moore neighbours), from the first filled pixel found
    let sx = -1, sy = -1;
    for (let y = 0; y < N && sx < 0; y++) for (let x = 0; x < N; x++) if (on(x, y)) { sx = x; sy = y; break; }
    if (sx < 0) return out;
    const DX = [1, 1, 0, -1, -1, -1, 0, 1], DY = [0, 1, 1, 1, 0, -1, -1, -1], edge = [];
    let x = sx, y = sy, dir = 6, guard = 0;
    do {
      edge.push([x, y]);
      let found = false;
      for (let i = 0; i < 8; i++) { const k = (dir + 6 + i) % 8, nx = x + DX[k], ny = y + DY[k]; if (on(nx, ny)) { x = nx; y = ny; dir = k; found = true; break; } }
      if (!found) break;
    } while ((x !== sx || y !== sy) && ++guard < 3000);
    // keep the corners, thin the rest
    const rdp = (a, b, tol, keep) => { let far = -1, dm = 0; const ax = edge[a][0], ay = edge[a][1], bx = edge[b][0], by = edge[b][1], L = Math.hypot(bx - ax, by - ay) || 1; for (let i = a + 1; i < b; i++) { const d = Math.abs((edge[i][0] - ax) * (by - ay) - (edge[i][1] - ay) * (bx - ax)) / L; if (d > dm) { dm = d; far = i; } } if (dm > tol) { rdp(a, far, tol, keep); keep.push(far); rdp(far, b, tol, keep); } };
    let idx = [];
    for (const tol of [1.6, 2.2, 3, 4]) { idx = [0]; const mid = Math.floor(edge.length / 2); rdp(0, mid, tol, idx); idx.push(mid); rdp(mid, edge.length - 1, tol, idx); if (idx.length <= 64) break; }
    const line = idx.map(i => ({ x: edge[i][0] / sc + ox, y: edge[i][1] / sc + oy })); line.closed = true;
    if (line.length > 3) out.push(line);
    const eyes = svg.querySelector('.pt-eyes');
    if (eyes) { const r = eyes.getBoundingClientRect(); if (r.width) { out.push([{ x: r.left + r.width * 0.2, y: r.top + r.height / 2 }]); out.push([{ x: r.right - r.width * 0.2, y: r.top + r.height / 2 }]); } }
  } catch (e) { /* a plain ring instead */ }
  return out;
}

/* ---------- where it happens: the pet page's stage ---------- */
function _fxStageHost(S) {
  const A = S.actor, stage = S.stage, lifts = [], paused = [];
  const rect = () => (A.svg || A.face).getBoundingClientRect();
  const H = {
    pos() { const r = rect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.9, h: r.height * 0.62 }; },
    outline() { return A.svg ? _fxOutlineOf(A.svg) : []; },
    pet: {
      play(clip) { const c = petClipDef(clip); if (!c) return; A.draw(c.pose || 'sit', c.face || { eyes: 'open', mouth: 'smile' }, true); petClipRun(A.svg, clip); },
      hide(on, ms) { try { A.el.style.transition = `opacity ${ms || 200}ms linear`; A.el.style.opacity = on ? '0' : '1'; } catch (e) { /* fine */ } },
      lift(y, ms, ease) { const a = A.face.animate({ translate: [getComputedStyle(A.face).translate === 'none' ? '0 0' : getComputedStyle(A.face).translate, `0 ${y}px`] }, { duration: ms, easing: ease || 'ease-in-out', fill: 'forwards' }); lifts.push(a); },
      far() { const w = stage.clientWidth, x = A.x > w / 2 ? _fxR(w * 0.14, w * 0.36) : _fxR(w * 0.64, w * 0.86), r = rect(); H._x = x; return { x: stage.getBoundingClientRect().left + x, y: r.top + r.height * 0.9, h: r.height * 0.62 }; },
      hop() { if (H._x != null) { A.x = H._x; A.apply(); } },
    },
    world: {
      nudge(px, ms) { _fxNudge(stage, px, ms); },
      freeze(on) { try { if (on) { for (const a of stage.getAnimations({ subtree: true })) { if (a.playState === 'running' && !(a.effect && a.effect.target && A.el.contains(a.effect.target))) { a.pause(); paused.push(a); } } } else { for (const a of paused.splice(0)) { try { a.play(); } catch (e) { /* gone */ } } } } catch (e) { /* older browser */ } },
      shake() { for (const n of stage.querySelectorAll('.pts-toy,.pts-bed')) { try { n.animate({ rotate: ['0deg', '6deg', '-5deg', '3deg', '0deg'] }, { duration: 700, easing: 'ease-out' }); } catch (e) { /* fine */ } } },
      react() {},
    },
    end() { for (const a of lifts) { try { a.cancel(); } catch (e) { /* gone */ } } H.pet.hide(false, 60); H.world.freeze(false); },
  };
  return H;
}
/* ---------- where it happens: your garden ---------- */
function _fxGardenHost(P) {
  const lifts = [], paused = [];
  const svg = () => (typeof _gdp !== 'undefined' && _gdp.svg) || null;
  const H = {
    pos() { const m = P.node.getScreenCTM(), r = P.node.getBoundingClientRect(); return { x: m.e, y: m.f, h: Math.max(30, r.height * 0.8) }; },
    outline() { return P.root ? _fxOutlineOf(P.root) : []; },
    pet: {
      play(clip) { const c = petClipDef(clip); if (!c) return; P.draw(c.pose || 'sit', c.face || { eyes: 'open', mouth: 'smile' }); P.clip(clip, c.ms); },
      hide(on, ms) { try { P.lift.style.transition = `opacity ${ms || 200}ms linear`; P.lift.style.opacity = on ? '0' : '1'; } catch (e) { /* fine */ } },
      lift(y, ms, ease) { const k = P.node.getScreenCTM().a || 1, cur = getComputedStyle(P.lift).translate; const a = P.lift.animate({ translate: [cur === 'none' ? '0 0' : cur, `0 ${y / k}px`] }, { duration: ms, easing: ease || 'ease-in-out', fill: 'forwards' }); lifts.push(a); },
      far() {
        const W = GARDEN_WORLD, box = (typeof _gw !== 'undefined' && _gw.box) ? _gw.box.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight }, m = svg().getScreenCTM(); H._to = null;
        for (let i = 0; i < 28 && !H._to; i++) { const d = _fxR(4, 9) * (i % 2 ? -1 : 1), x = P.x + d, y = P.y + _fxR(-2, 2); if (!_ptwFree(x, y)) continue; const c = _ptwCell(x, y), sx = m.a * c.x + m.e, sy = m.d * c.y + m.f; if (sx > box.left + 60 && sx < box.left + box.width - 60 && sy > box.top + 80 && sy < box.top + box.height - 60) H._to = { x, y, sx, sy }; }
        if (!H._to) { const r = H.pos(); return r; }
        return { x: H._to.sx, y: H._to.sy, h: H.pos().h };
      },
      hop() { if (H._to) { P.x = H._to.x; P.y = H._to.y; P.tx = null; const c = _ptwCell(P.x, P.y); P.node.setAttribute('transform', `translate(${c.x.toFixed(1)} ${c.y.toFixed(1)})`); P.tf = ''; P.z = -1; } },
    },
    world: {
      nudge(px, ms) { const s = svg(); if (s) _fxNudge(s, px, ms); },
      freeze(on) { const s = svg(); if (!s) return; try { if (on) { _ptw.frozen = true; for (const a of s.getAnimations({ subtree: true })) if (a.playState === 'running') { a.pause(); paused.push(a); } } else { _ptw.frozen = false; for (const a of paused.splice(0)) { try { a.play(); } catch (e) { /* gone */ } } } } catch (e) { /* older browser */ } },
      shake(o) {
        const s = svg(); if (!s) return;
        const c = H.pos(), R = (o && o.r) || 500, wave = o && o.wave, nodes = [...s.querySelectorAll('.gd-objects > .gd-it')].slice(0, 500), hit = [];
        for (const n of nodes) { const m = n.getScreenCTM && n.getScreenCTM(); if (!m) continue; const d = Math.hypot(m.e - c.x, (m.f - c.y) * 1.3); if (d < R && m.e > -80 && m.e < innerWidth + 80 && m.f > -40 && m.f < innerHeight + 200) hit.push([n, d]); }
        hit.sort((a, b) => a[1] - b[1]);
        for (const [n, d] of hit.slice(0, 70)) { const q = n.firstElementChild; if (!q) continue; try { const k = _fxR(2.2, 5); q.animate({ rotate: ['0deg', k + 'deg', -k * 0.8 + 'deg', k * 0.5 + 'deg', '0deg'], transformOrigin: ['0 0', '0 0'] }, { duration: _fxR(800, 1200), easing: 'ease-in-out', delay: wave ? d * 0.5 : d * 0.12 }); } catch (e) { /* fine */ } }
      },
      react(clip) {
        for (const q of _ptw.pets) { if (q === P || q.pose === 'sleep') continue; q.tx = null; q.dir = q.x < P.x ? 1 : -1; const c = petClipDef(clip); if (c && petClipSuits(clip, q.look.species)) { q.draw(c.pose || 'sit', c.face || { eyes: 'open', mouth: 'smile' }); q.clip(clip, c.ms, () => { q.sit(); q.busy = 1; }); } }
        try { if (typeof gartEmoteRun === 'function') gartEmoteRun(clip === 'startled' ? 'startled' : clip === 'bow' ? 'bow' : 'cheer', { quiet: true }); } catch (e) { /* no gardener */ }
      },
    },
    end() { for (const a of lifts) { try { a.cancel(); } catch (e) { /* gone */ } } H.pet.hide(false, 60); H.world.freeze(false); P.wow = false; if (!P.tx) { P.sit(); P.busy = 1; } const s = svg(); if (s) s.classList.remove('gd-hush'); },
  };
  return H;
}
function _fxNudge(el, px, ms) {
  try { const f = []; const n = 7; for (let i = 0; i <= n; i++) { const k = 1 - i / n; f.push(i === n ? '0px 0px' : `${(_fxR(-1, 1) * px * k).toFixed(1)}px ${(_fxR(-1, 1) * px * k * 0.7).toFixed(1)}px`); } el.animate({ translate: f }, { duration: ms || 500, easing: 'linear' }); } catch (e) { /* fine */ }
}
/** Play a spectacle on your pet: where = the page's stage, or 'garden'. */
function petWowRun(id, where, o) {
  const def = PET_WOW[id]; o = o || {};
  if (!def) return null;
  if (typeof _ptFun === 'function' && _ptFun() === 'off') { if (o.done) o.done(); return null; }
  let host = null;
  if (where === 'garden') {
    const P = typeof _ptw !== 'undefined' && _ptw.on ? (_ptw.pets.find(q => q.me) || _ptw.pets[0]) : null;
    if (!P) return null;
    if (typeof gardenLivePet === 'function') gardenLivePet('wow', id);
    P.tx = null; P.wow = true; P.busy = def.ms / 1000 + 0.3; P.cb = null; P.sit();
    host = _fxGardenHost(P);
    if (_gdp.svg) _gdp.svg.classList.add('gd-hush');
  } else if (where && where.actor) {
    host = _fxStageHost(where);
    where.busy = true;
    const d0 = o.done; o = Object.assign({}, o, { done() { where.busy = false; if (d0) d0(); } });
  } else return null;
  return petFxRun(def, host, o);
}
