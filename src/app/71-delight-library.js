/* ============================================================
   DELIGHT LIBRARY (prototype M3, 3 Oct 2026). PURE classic script, the
   same shape as 71-anim-library.js: no DOM, nothing runs at load except
   building constants, so Node can evaluate it (tests, the build script).

   DL_ART        celebration scenes: {colour, svg()} in the anim-library
                 vocabulary (64x64; fills k c s w m + g y yl fr fp; strokes
                 lk lc lm lw lg ly lw2; once-only motion .ar, idle x-*)
   DL_ARRIVE     event/task scenes WITH an arrival: {type, colour, arrive ms,
                 svg()}; new types (doctor, exam, gift, popcorn, pill,
                 flight-window) plus arrival versions of existing ones
   DL_MOTIFS     travel motifs for the "you have landed" card
   DL_MOMENTS    the "big database" of moments: {id, trigger, level, dur,
                 variants:[art ids], fx, why}
   delightFamily(item, ctx)       -> moment id (the classifier + context)
   delightPick(id, recent, seed)  -> variant (rotated; never the last one)
   delightFor(item, ctx)          -> {moment, variant, level, dur, fx}
   No user text ever goes into the markup.

   In the app (ported from the M3 prototype, 4 Oct): wrapped in one scope so
   its short helper names (ar, RING, PEN...) stay private; the page and the
   tests read the Delight object. Celebrations: 78-delight-hooks.js.
   ============================================================ */
const Delight = (function () {
'use strict';
/* ---------- markup helpers ---------- */
const DL_E = Object.freeze({ out: 'cubic-bezier(.22,1,.36,1)', in: 'cubic-bezier(.5,0,.9,.4)', io: 'cubic-bezier(.65,0,.35,1)', back: 'cubic-bezier(.3,1.45,.55,1)', lin: 'linear' });
/** A once-only move around some markup: ar('dl-pop', {d: 300, dur: 400, cls: 'gone o-b', ease, v: {dy: '8px'}, origin}, inner). */
function ar(aa, o, inner) {
  o = o || {};
  const v = Object.assign({ aa }, o.dur ? { aad: o.dur + 'ms' } : {}, o.d ? { a0: o.d + 'ms' } : {}, o.ease ? { aae: o.ease } : {}, o.n ? { aai: o.n } : {}, o.v || {});
  const style = Object.entries(v).map(([k, x]) => `--${k}:${x}`).join(';') + (o.origin ? `;transform-origin:${o.origin}` : '');
  return `<g class="ar${o.cls ? ' ' + o.cls : ''}" style="${style}">${inner}</g>`;
}
const _n = (x) => +Number(x).toFixed(2);
const STAR4 = (x, y, r) => `M${x} ${y - r}l${_n(r * 0.3)} ${_n(r * 0.7)} ${_n(r * 0.7)} ${_n(r * 0.3)}-${_n(r * 0.7)} ${_n(r * 0.3)}-${_n(r * 0.3)} ${_n(r * 0.7)}-${_n(r * 0.3)}-${_n(r * 0.7)}-${_n(r * 0.7)}-${_n(r * 0.3)} ${_n(r * 0.7)}-${_n(r * 0.3)}z`;
function STAR5(cx, cy, r) {
  let d = '';
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; d += (i ? 'L' : 'M') + _n(cx + rr * Math.cos(a)) + ' ' + _n(cy + rr * Math.sin(a)); }
  return d + 'z';
}
const HEART = (cx, cy, s) => `M${cx} ${_n(cy + 5 * s)}c${_n(-1.4 * s)}-${_n(1 * s)}-${_n(7 * s)}-${_n(4.6 * s)}-${_n(7 * s)}-${_n(9 * s)}a${_n(3.8 * s)} ${_n(3.8 * s)} 0 0 1 ${_n(7 * s)}-${_n(2 * s)}a${_n(3.8 * s)} ${_n(3.8 * s)} 0 0 1 ${_n(7 * s)} ${_n(2 * s)}c0 ${_n(4.4 * s)}-${_n(5.6 * s)} ${_n(8 * s)}-${_n(7 * s)} ${_n(9 * s)}z`;
/** A sparkle that flashes once and is gone. */
const SPARK = (x, y, r, d, cls) => ar('dl-spark', { d, dur: 700, cls: 'gone' }, `<path class="${cls || 'c'}" d="${STAR4(x, y, r)}"/>`);
/** A sparkle that pops in and stays (twinkles if the scene keeps looping). */
const SPARK_STAY = (x, y, r, d, cls) => ar('dl-pop', { d, dur: 420 }, `<path class="${cls || 'y'} x-twinkle" style="--d:${(d / 1000 + 0.3).toFixed(2)}s" d="${STAR4(x, y, r)}"/>`);
const RING = (x, y, r, d, cls, rs) => ar('dl-ring', { d, dur: 650, cls: 'gone', v: { rs: rs || 1.6 } }, `<circle class="${cls || 'lc'}" cx="${x}" cy="${y}" r="${r}"/>`);
/** The "done" badge: a filled circle with a tick, popping in. */
const CHECK = (x, y, r, d, fill) => ar('dl-pop', { d, dur: 460 }, `<circle class="${fill || 'g'}" cx="${x}" cy="${y}" r="${r}"/><path class="lw2" d="M${_n(x - r * 0.45)} ${_n(y + 0.2)}l${_n(r * 0.3)} ${_n(r * 0.32)} ${_n(r * 0.58)}-${_n(r * 0.62)}"/>`);
/** n dots flying out of (x, y) once (a small firework or a splash). */
function BURST(x, y, n, dist, d, cls, r) {
  let o = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    o += ar('dl-fly', { d, dur: 760, cls: 'gone', ease: 'cubic-bezier(.1,.7,.3,1)', v: { tx: _n(Math.cos(a) * dist) + 'px', ty: _n(Math.sin(a) * dist) + 'px', sc: 0.6 } },
      `<circle class="${Array.isArray(cls) ? cls[i % cls.length] : (cls || 'c')}" cx="${x}" cy="${y}" r="${r || 1.8}"/>`);
  }
  return o;
}
const MUG = `<path class="c" d="M14 28h28v13a13 13 0 0 1-13 13h-2a13 13 0 0 1-13-13z"/><path class="lc t" d="M42 32h3a5 5 0 0 1 0 10h-3"/>`;
const TRAY = (cls) => `<path class="${cls || 'c'}" d="M6 36h14l3 6h18l3-6h14v14a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5z"/>`;
const PLANE_TOP = `<path class="c" d="M47 28.8c0-1.5-1.4-2.4-3.2-2.4h-7.6L28.4 14.6h-3.6l3.8 11.8h-7l-2.8-3.9h-2.8l1.7 6.3-1.7 6.3h2.8l2.8-3.9h7L24.8 43h3.6l7.8-11.8h7.6c1.8 0 3.2-.9 3.2-2.4z"/>`;
const PERSON = (x, y, cls, d) => `<g class="x-pop" style="--d:${d || 0}s"><circle class="${cls}" cx="${x}" cy="${y}" r="4.5"/><path class="${cls}" d="M${x - 7.5} ${y + 12}a7.5 6.5 0 0 1 15 0z"/></g>`;
const STEAM = (x, y, d) => `<path class="lm x-steam" style="--d:${d || 0}s" d="M${x} ${y}c-2.5-3 2.5-5 0-8.5"/>`;
const WAVE = (y, cls, d) => `<g class="x-wave" style="--d:${d || 0}s"><path class="${cls}" d="M-12 ${y}q3-4 6 0t6 0 6 0 6 0 6 0 6 0 6 0 6 0 6 0 6 0 6 0 6 0 6 0 6 0"/></g>`;
/** A pen with its tip at (0, 0), body up and to the right. */
const PEN = `<path class="k" d="M2.2-6.4l12-12 4.2 4.2-12 12z"/><path class="c" d="M0 0l2.2-6.4 4.2 4.2z"/>`;
/** An arc segment of a circle (degrees, 0 = top, clockwise). */
function ARC(cx, cy, r, a0, a1) {
  const p = (a) => { const t = (a - 90) * Math.PI / 180; return _n(cx + r * Math.cos(t)) + ' ' + _n(cy + r * Math.sin(t)); };
  return `M${p(a0)}A${r} ${r} 0 0 1 ${p(a1)}`;
}

/* ============================================================
   1. CELEBRATION ART (once-only; the pop or card around it fades it out)
   ============================================================ */
const DL_ART = {
  /* ── email ── */
  'email-plane': { colour: 'blue', label: 'Paper plane', svg: () =>
    ar('dl-flap-open', { dur: 1100, cls: 'gone' }, `<path class="m" d="M10 30h44L32 15z"/>`)
    + ar('dl-letter', { d: 150, dur: 900, cls: 'gone' }, `<rect class="w lm" x="20" y="16" width="24" height="22" rx="2"/><rect class="m" x="24" y="21" width="12" height="2.4" rx="1"/><rect class="m" x="24" y="26" width="16" height="2.4" rx="1"/>`)
    + ar('dl-in-up', { dur: 380, v: { dy: '8px' } }, `<rect class="s" x="10" y="30" width="44" height="24" rx="4"/><path class="lc" d="M12 52l16-11M52 52L36 41"/>`)
    + ar('dl-flap-close', { d: 960, dur: 420, cls: 'o-t', ease: DL_E.back }, `<path class="c" d="M10 30h44L32 45z"/>`)
    + ar('dl-plane', { d: 560, dur: 980, cls: 'gone', ease: 'cubic-bezier(.45,0,.25,1)' }, `<path class="c" d="M48 14L16 23l10 7z"/><path class="k" d="M48 14L26 30l4 5z"/>`)
    + [[34, 20, 800], [42, 15, 900], [50, 10, 1000]].map(([x, y, d]) => ar('dl-puff', { d, dur: 520, cls: 'gone', v: { sc: 1.4 } }, `<circle class="m" cx="${x}" cy="${y}" r="1.8"/>`)).join('')
    + CHECK(50, 49, 7, 1180) },
  'email-seal': { colour: 'blue', label: 'Sealed and sent', svg: () =>
    ar('dl-in-up', { dur: 380, v: { dy: '8px' } }, `<rect class="s" x="10" y="26" width="44" height="28" rx="4"/><path class="lc" d="M12 52l16-12M52 52L36 40"/>`)
    + ar('dl-flap-close', { d: 220, dur: 460, cls: 'o-t', ease: DL_E.back }, `<path class="w lc" d="M10 26h44L32 43z"/>`)
    + ar('dl-thump', { d: 620, dur: 440 }, `<circle class="c" cx="32" cy="42" r="8"/><circle class="lw" cx="32" cy="42" r="5.2"/><path class="lw2" d="M29.2 42l2 2 4-4"/>`)
    + RING(32, 42, 9, 760) + BURST(32, 42, 6, 14, 760, 'c', 1.4)
    + SPARK(52, 16, 5, 860) + SPARK(13, 18, 3.6, 960, 'y') },
  'email-whoosh': { colour: 'blue', label: 'Whoosh', svg: () =>
    [[2, 24, 260], [0, 32, 300], [4, 40, 340]].map(([x, y, d]) => ar('dl-trail1', { d, dur: 460, cls: 'gone' }, `<rect class="m" x="${x}" y="${y}" width="16" height="2.4" rx="1.2"/>`)).join('')
    + CHECK(32, 32, 11, 560) + RING(32, 32, 12, 600)
    + ar('dl-whoosh', { d: 100, dur: 620, cls: 'gone', ease: DL_E.in }, `<rect class="s" x="14" y="22" width="36" height="22" rx="3.5"/><path class="c" d="M14 22h36L32 36z"/><path class="lc" d="M16 42l12-8M48 42l-12-8"/>`)
    + SPARK(54, 18, 4.5, 820) },

  /* ── writing ── */
  'page-signed': { colour: 'indigo', label: 'Signed off', svg: () =>
    ar('dl-in-up', { dur: 360 }, `<rect class="w lm" x="12" y="6" width="38" height="50" rx="3"/>`)
    + [[14, 24, 150], [20, 18, 260], [26, 22, 370]].map(([y, w, d]) => ar('dl-grow-x', { d, dur: 320, cls: 'o-l' }, `<rect class="m" x="18" y="${y}" width="${w}" height="2.4" rx="1"/>`)).join('')
    + ar('dl-ink', { d: 600, dur: 160, cls: 'o-l' }, `<path class="lc" d="M18 44c2-6 5-8 6-4s-1 6 2 5 3-4 4-4"/>`)
    + ar('dl-ink', { d: 800, dur: 160, cls: 'o-l' }, `<path class="lc" d="M30 41c1 3 2 4 4 3s2-5 3-4"/>`)
    + ar('dl-ink', { d: 950, dur: 160, cls: 'o-l' }, `<path class="lc" d="M37 40c0 3 1 5 3 4s3-3 6-2"/>`)
    + ar('dl-sign', { d: 520, dur: 720, cls: 'gone' }, `<g transform="translate(18 44)">${PEN}</g>`)
    + CHECK(48, 50, 7.5, 1150) },
  'pages-stack': { colour: 'indigo', label: 'Draft stacked', svg: () =>
    [[22, 12, 0], [18, 16, 160], [14, 20, 320]].map(([x, y, d], i) => ar('dl-deal', { d, dur: 480 }, `<rect class="w lm" x="${x}" y="${y}" width="30" height="38" rx="3"/>${i === 2 ? `<rect class="m" x="${x + 5}" y="${y + 9}" width="18" height="2.4" rx="1"/><rect class="m" x="${x + 5}" y="${y + 15}" width="14" height="2.4" rx="1"/><rect class="c" x="${x + 5}" y="${y + 21}" width="16" height="2.4" rx="1"/>` : ''}`)).join('')
    + ar('dl-drop-in', { d: 820, dur: 520, v: { dy: '16px' } }, `<path class="lk" d="M24 17l-3.5-7.5h3M32 17l3.5-7.5h-3"/><path class="k" d="M21.5 16h13l-1.6 6.5h-9.8z"/>`)
    + SPARK(50, 14, 5, 1080) + SPARK(10, 54, 3.5, 1160, 'y') },
  'quill-flourish': { colour: 'indigo', label: 'Flourish', svg: () =>
    ar('dl-in-up', { dur: 300 }, `<rect class="k" x="10" y="22" width="18" height="5" rx="2.5"/><rect class="k" x="32" y="22" width="22" height="5" rx="2.5"/>`)
    + [['M8 44c6-8 14-10 18-4', 180], ['M26 40c3 5 6 7 10 2', 330], ['M36 42c3-5 7-8 11-5', 480], ['M47 37c3 2 5 0 8-4', 630]].map(([p, d]) => ar('dl-ink', { d, dur: 170, cls: 'o-l' }, `<path class="lc t" d="${p}"/>`)).join('')
    + ar('dl-quill', { d: 120, dur: 760, cls: 'gone' }, `<g transform="translate(8 44)">${PEN}</g>`)
    + SPARK(14, 12, 4, 820, 'y') + SPARK(33, 8, 5.5, 900) + SPARK(54, 14, 4, 980, 'y') },

  /* ── coding ── */
  'build-passed': { colour: 'slate', label: 'Build passed', svg: () =>
    ar('dl-in-up', { dur: 360 }, `<rect class="k" x="6" y="10" width="52" height="40" rx="5"/><circle class="c" cx="12" cy="15.5" r="1.6"/><circle class="m" cx="17" cy="15.5" r="1.6"/><circle class="m" cx="22" cy="15.5" r="1.6"/>`)
    + [[22, 20, 120], [28, 26, 220], [34, 14, 320]].map(([y, w, d], i) => ar('dl-grow-x', { d, dur: 260, cls: 'o-l' }, `<rect class="w" x="${i === 2 ? 20 : 14}" y="${y}" width="${w}" height="2.4" rx="1"/>`)).join('')
    + ar('dl-fade-in', { d: 380, dur: 200 }, `<rect class="m" x="14" y="41" width="36" height="4" rx="2"/>`)
    + ar('dl-grow-x', { d: 450, dur: 650, cls: 'o-l', ease: DL_E.io }, `<rect class="c" x="14" y="41" width="36" height="4" rx="2"/>`)
    + ar('dl-fade-in', { d: 1080, dur: 200 }, `<rect class="g" x="14" y="41" width="36" height="4" rx="2"/>`)
    + CHECK(52, 47, 8, 1160) + RING(52, 47, 9, 1200, 'lg') },
  'brackets-snap': { colour: 'slate', label: 'Brackets snap', svg: () =>
    ar('dl-in-left', { dur: 420, ease: DL_E.back, v: { dx: '18px' } }, `<path class="lc t" d="M22 18l-12 14 12 14"/>`)
    + ar('dl-in-right', { dur: 420, ease: DL_E.back, v: { dx: '18px' } }, `<path class="lc t" d="M42 18l12 14-12 14"/>`)
    + ar('dl-slash-out', { d: 150, dur: 700, cls: 'gone' }, `<path class="lm t" d="M36 18l-8 28"/>`)
    + ar('dl-pop', { d: 720, dur: 440 }, `<path class="lg t" d="M24 33l5 5 11-12"/>`)
    + RING(32, 32, 13, 760, 'lg') + SPARK(12, 12, 4, 800, 'y') + SPARK(52, 12, 4, 880) },
  'merge-branch': { colour: 'slate', label: 'Merged', svg: () =>
    ar('dl-fade-in', { dur: 260 }, `<path class="lm t" d="M22 56V8"/><path class="lc t" d="M22 46c0-7 18-7 18-14v-4c0-7-18-7-18-14"/><circle class="k" cx="22" cy="50" r="4"/><circle class="w lk" cx="22" cy="14" r="4.2"/>`)
    + ar('dl-merge', { d: 300, dur: 620, ease: DL_E.io }, `<circle class="c" cx="40" cy="30" r="4.2"/>`)
    + ar('dl-pop', { d: 900, dur: 420 }, `<circle class="g" cx="22" cy="14" r="5.4"/>`)
    + RING(22, 14, 6, 920, 'lg') + BURST(22, 14, 6, 12, 940, ['g', 'y'], 1.5) + SPARK(48, 50, 4.5, 1040, 'y') },

  /* ── admin ── */
  'stamp-done': { colour: 'slate', label: 'Stamped', svg: () =>
    ar('dl-in-up', { dur: 340 }, `<rect class="w lm" x="10" y="30" width="44" height="26" rx="3"/><rect class="m" x="16" y="35" width="20" height="2.4" rx="1"/>`)
    + ar('dl-mark', { d: 575, dur: 240 }, `<rect class="g" x="20" y="41" width="24" height="10" rx="2.5"/><path class="lw2" d="M27.5 46l3 3 6-6"/>`)
    + ar('dl-stamp-once', { d: 300, dur: 780, cls: 'o-b' }, `<rect class="k" x="27" y="2" width="10" height="14" rx="3"/><rect class="c" x="20" y="16" width="24" height="7" rx="2"/>`)
    + RING(32, 46, 12, 590, 'lg', 1.5) + BURST(32, 46, 6, 13, 590, 'g', 1.3) },
  'filed-away': { colour: 'amber', label: 'Filed away', svg: () =>
    `<rect class="m" x="12" y="26" width="40" height="6" rx="2"/>`
    + ar('dl-file', { dur: 900, ease: DL_E.io, cls: 'gone' }, `<rect class="w lm" x="18" y="4" width="28" height="26" rx="2"/><rect class="m" x="22" y="10" width="16" height="2.4" rx="1"/><rect class="m" x="22" y="15" width="12" height="2.4" rx="1"/>`)
    + `<rect class="c" x="10" y="30" width="44" height="26" rx="3"/><rect class="w" x="24" y="38" width="16" height="9" rx="1.5"/>`
    + ar('dl-lid-close', { d: 640, dur: 460, cls: 'o-v', origin: '8px 30px', ease: DL_E.back }, `<rect class="k" x="8" y="25" width="48" height="6" rx="2"/>`)
    + ar('dl-pop', { d: 1040, dur: 420 }, `<path class="lc t" d="M28 42.5l3 3 5.5-5.5"/>`)
    + SPARK(54, 14, 4.5, 1120, 'y') },
  'form-ticks': { colour: 'slate', label: 'Form done', svg: () =>
    ar('dl-in-up', { dur: 320 }, `<rect class="w lm" x="12" y="4" width="40" height="56" rx="4"/>`)
    + [14, 26, 38].map((y, i) => `<rect class="lm" x="18" y="${y}" width="7" height="7" rx="2"/><rect class="m" x="29" y="${y + 2.3}" width="17" height="2.4" rx="1"/>` + ar('dl-pop', { d: 250 + i * 170, dur: 300 }, `<path class="lc t" d="M19.5 ${y + 3.5}l2 2 4.5-4.5"/>`)).join('')
    + ar('dl-press', { d: 820, dur: 320 }, `<rect class="c" x="30" y="49" width="16" height="6" rx="3"/>`)
    + RING(38, 52, 7, 900) + SPARK(8, 10, 4, 950, 'y') },

  /* ── meeting prep ── */
  'agenda-ticked': { colour: 'blue', label: 'Agenda ready', svg: () =>
    ar('dl-in-up', { dur: 340 }, `<rect class="w lm" x="12" y="8" width="40" height="50" rx="4"/>`)
    + [20, 31, 42].map((y, i) => `<circle class="lm" cx="20" cy="${y}" r="3"/><rect class="m" x="27" y="${y - 1.2}" width="${[18, 14, 16][i]}" height="2.4" rx="1"/>` + ar('dl-pop', { d: 220 + i * 170, dur: 300 }, `<circle class="c" cx="20" cy="${y}" r="3.8"/><path class="lw2" d="M18.3 ${y}l1.2 1.3 2.4-2.6"/>`)).join('')
    + ar('dl-squash', { d: 790, dur: 300, cls: 'o-b' }, `<rect class="k" x="24" y="4" width="16" height="8" rx="3"/>`)
    + SPARK(54, 10, 5, 880, 'y') },
  /* review fix (3 Oct): the old 'chairs-ready' (a table seen from above) did not read at md size.
     A pull-down screen with a chart reads as "the slides are ready" at every size. */
  'slides-ready': { colour: 'blue', label: 'Slides ready', svg: () =>
    ar('dl-grow-x', { dur: 300 }, `<rect class="k" x="7" y="7" width="50" height="5" rx="2.5"/>`)
    + ar('dl-unroll', { d: 140, dur: 560, cls: 'o-t' }, `<rect class="w lm" x="10" y="11" width="44" height="31" rx="2"/><rect class="m" x="15" y="36" width="34" height="1.8" rx=".9"/><rect class="k" x="28.5" y="42" width="7" height="3" rx="1.5"/>`)
    + ar('dl-grow-y', { d: 470, dur: 400, ease: DL_E.back, cls: 'o-b' }, `<rect class="s" x="17" y="27" width="6" height="9" rx="1"/>`)
    + ar('dl-grow-y', { d: 550, dur: 400, ease: DL_E.back, cls: 'o-b' }, `<rect class="c" x="26" y="21" width="6" height="15" rx="1"/>`)
    + ar('dl-grow-y', { d: 630, dur: 400, ease: DL_E.back, cls: 'o-b' }, `<rect class="c" x="35" y="16" width="6" height="20" rx="1"/>`)
    + CHECK(49, 47, 7.5, 900)
    + SPARK(55, 18, 4, 1040, 'y') },

  /* ── submission / deadline ── */
  'slot-drop': { colour: 'green', label: 'Into the tray', svg: () =>
    `<rect class="m" x="10" y="36" width="44" height="4" rx="2"/>`
    + ar('dl-slot', { dur: 900, ease: DL_E.io, cls: 'gone' }, `<rect class="w lm" x="18" y="4" width="28" height="34" rx="2"/><rect class="fr" x="22" y="9" width="12" height="3" rx="1.5"/><rect class="m" x="22" y="16" width="20" height="2.4" rx="1"/><rect class="m" x="22" y="21" width="16" height="2.4" rx="1"/>`)
    + ar('dl-squash', { d: 880, dur: 320, cls: 'o-b' }, `<rect class="c" x="6" y="38" width="52" height="18" rx="4"/><rect class="w" x="14" y="44" width="36" height="3" rx="1.5" opacity=".6"/>`)
    + ar('dl-pop', { d: 960, dur: 440 }, `<circle class="w lc" cx="32" cy="22" r="9"/><path class="lc t" d="M27.5 22.3l3 3 6-6.2"/>`)
    + RING(32, 22, 10, 1000) + SPARK(10, 16, 4, 1080, 'y') + SPARK(54, 12, 5, 1150, 'y') },
  'hourglass-freeze': { colour: 'red', label: 'Time stops', svg: () =>
    ar('dl-pop', { d: 900, dur: 460 }, `<circle class="lg t" cx="32" cy="32" r="27"/>`)
    + `<rect class="k" x="14" y="6" width="36" height="4" rx="2"/><rect class="k" x="14" y="54" width="36" height="4" rx="2"/><path class="w lm" d="M18 10h28c0 10-9 16-11 22 2 6 11 12 11 22H18c0-10 9-16 11-22-2-6-11-12-11-22z"/>`
    + ar('dl-drain', { d: 100, dur: 760, cls: 'o-b', ease: DL_E.in }, `<path class="c" d="M21 14h22c-1 6-7 10-11 15-4-5-10-9-11-15z"/>`)
    + ar('dl-hold-out', { d: 100, dur: 820, cls: 'gone' }, `<rect class="c" x="31" y="30" width="2" height="20"/>`)
    + ar('dl-grow-y', { d: 100, dur: 820, cls: 'o-b', ease: DL_E.out }, `<path class="c" d="M20 52h24c-1-7-6-12-12-14-6 2-11 7-12 14z"/>`)
    + ar('dl-fade-in', { d: 860, dur: 300 }, `<path class="g" d="M20 52h24c-1-7-6-12-12-14-6 2-11 7-12 14z"/>`)
    + CHECK(50, 50, 8, 1060) + BURST(32, 32, 8, 22, 960, ['y', 'c'], 1.6) },
  'paper-rocket': { colour: 'violet', label: 'Shipped', svg: () =>
    `<rect class="m" x="10" y="56" width="44" height="3" rx="1.5"/>`
    + [[24, 56, 260, -6], [32, 58, 300, 0], [40, 56, 340, 6]].map(([x, y, d, tx]) => ar('dl-puff', { d, dur: 800, cls: 'gone', v: { tx: tx + 'px', ty: '-3px', sc: 2.2 } }, `<circle class="m" cx="${x}" cy="${y}" r="3"/>`)).join('')
    + ar('dl-launch', { dur: 900, ease: 'cubic-bezier(.5,0,.3,1)' },
      ar('dl-flame-on', { d: 220, dur: 300, cls: 'o-t' }, `<path class="y" d="M28 43h8l-4 9z"/>`)
      + `<path class="w lc t" d="M32 18c5 5 7 11 7 19v6H25v-6c0-8 2-14 7-19z"/><circle class="c" cx="32" cy="30" r="3"/><path class="c" d="M25 37l-5 7v3l5-2zM39 37l5 7v3l-5-2z"/>`)
    + SPARK(12, 14, 4, 760, 'y') + SPARK(52, 22, 5, 860) + SPARK(46, 6, 3.5, 960, 'y') },

  /* ── exercise / health ── */
  'rep-lift': { colour: 'orange', label: 'Rep done', svg: () =>
    ar('dl-shadow-once', { d: 100, dur: 700 }, `<ellipse class="m" cx="32" cy="56" rx="18" ry="3"/>`)
    + ar('dl-rep', { d: 100, dur: 720 }, `<rect class="k" x="14" y="24" width="36" height="4" rx="2"/><rect class="c" x="8" y="16" width="7" height="20" rx="2"/><rect class="c" x="49" y="16" width="7" height="20" rx="2"/><rect class="c" x="3" y="20" width="5" height="12" rx="1.5"/><rect class="c" x="56" y="20" width="5" height="12" rx="1.5"/>`)
    + [[10, 12, -8, -8], [54, 12, 8, -8], [32, 8, 0, -10]].map(([x, y, tx, ty], i) => ar('dl-fly', { d: 560 + i * 40, dur: 600, cls: 'gone', v: { tx: tx + 'px', ty: ty + 'px' } }, `<path class="lc" d="M${x} ${y}q-2 3 0 4.5q2-1.5 0-4.5z"/>`)).join('')
    + ar('dl-pop', { d: 820, dur: 400 }, ar('dl-beat2', { d: 1240, dur: 700 }, `<path class="fp" d="${HEART(52, 48, 0.9)}"/>`)) },
  'heart-ring': { colour: 'orange', label: 'Ring closed', svg: () =>
    `<circle class="lm t" cx="32" cy="32" r="21"/>`
    + Array.from({ length: 8 }, (_, i) => ar('dl-seg', { d: i * 85, dur: 180 }, `<path class="lc t" d="${ARC(32, 32, 21, i * 45 + 2, i * 45 + 43)}"/>`)).join('')
    + ar('dl-pop', { d: 720, dur: 380 }, ar('dl-beat2', { d: 1000, dur: 760 }, `<path class="fp" d="${HEART(32, 32, 1.3)}"/>`))
    + RING(32, 32, 22, 720, 'lc', 1.25) + SPARK(54, 8, 4.5, 860, 'y') },
  'sneaker-dash': { colour: 'orange', label: 'Dash', svg: () =>
    [[2, 26, 60], [0, 34, 100], [4, 42, 140]].map(([x, y, d]) => ar('dl-trail1', { d, dur: 520, cls: 'gone' }, `<rect class="m" x="${x}" y="${y}" width="16" height="2.4" rx="1.2"/>`)).join('')
    + ar('dl-dash', { dur: 660 }, `<path class="c" d="M12 47c0-8 2-16 6-18l8 4c4 2 8 2 12 4l12 6c3 1 4 2 4 4z"/><path class="k" d="M10 47h44a4 4 0 0 1 0 8H14a4 4 0 0 1-4-4z"/><path class="lw" d="M23 35l3-3M28 37l3-3M33 39l3-3"/><rect class="w" x="14" y="49" width="38" height="2" rx="1" opacity=".5"/>`)
    + [[12, 54, 380, -6], [8, 50, 420, -9]].map(([x, y, d, tx]) => ar('dl-puff', { d, dur: 600, cls: 'gone', v: { tx: tx + 'px', ty: '-4px' } }, `<circle class="m" cx="${x}" cy="${y}" r="3"/>`)).join('')
    + SPARK(54, 22, 5, 620, 'y') },

  /* ── milestone ── */
  'summit-flag': { colour: 'violet', label: 'Summit', svg: () =>
    ar('dl-in-up', { dur: 420, v: { dy: '10px' } }, `<path class="s" d="M30 56L46 28l18 28z"/><path class="c" d="M0 56l24-36 22 36z"/><path class="w" d="M24 20l-6.4 9.6 3.4 2 3-3 3 3 3.4-2z"/>`)
    + ar('dl-fade-in', { d: 250, dur: 200 }, `<path class="lk" d="M24 20V3"/>`)
    + ar('dl-raise', { d: 360, dur: 520, cls: 'o-l' }, `<path class="y x-flag o-l" d="M24 3h14l-3.5 4.5 3.5 4.5H24z"/>`)
    + BURST(50, 12, 8, 9, 820, ['y', 'c'], 1.6) + BURST(12, 10, 8, 8, 1020, ['c', 'y'], 1.5)
    + RING(50, 12, 3, 820, 'ly', 2.4) + SPARK(58, 30, 3.5, 1100, 'y') },
  'trophy-rise': { colour: 'violet', label: 'Trophy', svg: () =>
    ar('dl-rays-in', { d: 480, dur: 700, cls: 'o-v', origin: '32px 22px' }, `<path class="ly" d="M32 2v4M14 8l3 3M50 8l-3 3M8 24h4M52 24h4"/>`)
    + ar('dl-rise-in', { dur: 720, v: { dy: '34px' } }, `<path class="ly t" d="M20 14h-5a5 5 0 0 0 6 9M44 14h5a5 5 0 0 1-6 9"/><path class="y" d="M20 10h24v10a12 12 0 0 1-24 0z"/><rect class="k" x="29" y="31" width="6" height="7"/><rect class="k" x="22" y="38" width="20" height="5" rx="1.5"/><rect class="c" x="18" y="43" width="28" height="9" rx="2"/><rect class="w" x="26" y="46" width="12" height="2.4" rx="1" opacity=".7"/>`)
    + SPARK(26, 15, 3.5, 760, 'w') + SPARK(10, 40, 4, 880, 'y') + SPARK(54, 36, 4.5, 960, 'y') },
  'medal-drop': { colour: 'violet', label: 'Medal', svg: () =>
    ar('dl-swing-in', { dur: 1150, cls: 'o-v', origin: '32px 0px' }, `<path class="c" d="M18 0h9l8 26h-8z"/><path class="s lc" d="M46 0h-9l-8 26h8z"/><circle class="y" cx="32" cy="38" r="13"/><circle class="lw" cx="32" cy="38" r="9"/><path class="k" d="${STAR5(32, 38.5, 6)}"/>`)
    + SPARK(25, 32, 3.5, 980, 'w') + SPARK(52, 50, 4, 1060, 'y') + SPARK(10, 22, 3.5, 1120, 'y') },

  /* ── inbox zero ── */
  'tray-sunrise': { colour: 'teal', label: 'Clear skies', svg: () =>
    ar('dl-rays-in', { d: 560, dur: 700, cls: 'o-v', origin: '32px 30px' }, `<path class="ly" d="M32 13v-5M20 18l-3.5-3.5M44 18l3.5-3.5M15 30h-5M49 30h5"/>`)
    + ar('dl-sunrise', { d: 120, dur: 820, v: { dy: '20px' } }, `<circle class="y" cx="32" cy="30" r="9"/>`)
    + TRAY('c') + `<rect class="w" x="16" y="47" width="32" height="3" rx="1.5" opacity=".5"/>`
    + ar('dl-birds', { d: 980, dur: 900, cls: 'gone' }, `<path class="lk" d="M40 12q2.5-2.5 5 0q2.5-2.5 5 0"/><path class="lk" d="M48 18q2-2 4 0q2-2 4 0"/>`) },
  'bird-free': { colour: 'teal', label: 'Set free', svg: () =>
    TRAY('c')
    + ar('dl-env-morph', { dur: 900, cls: 'gone' }, `<rect class="s" x="19" y="14" width="26" height="18" rx="2.5"/><path class="w lc" d="M19 14h26L32 25z"/>`)
    + ar('dl-bird', { d: 560, dur: 960, cls: 'gone' }, `<ellipse class="c" cx="31" cy="24" rx="7" ry="4.5"/><circle class="c" cx="37" cy="21" r="3.4"/><path class="y" d="M40 21l3.5 1-3.5 1.2z"/><circle class="w" cx="38" cy="20.4" r=".9"/>`
      + ar('dl-wing', { d: 560, dur: 280, n: 4, cls: 'o-v', origin: '30px 23px' }, `<path class="s lc" d="M30 23l-8-9 12 5z"/>`))
    + SPARK(48, 10, 4, 1120, 'y') + SPARK(16, 12, 3.5, 1200) },
  'zen-ripple': { colour: 'teal', label: 'Still water', svg: () =>
    TRAY('c') + `<ellipse class="s" cx="32" cy="41" rx="16" ry="2.6"/>`
    + ar('dl-drop-fall', { dur: 700, cls: 'gone', ease: DL_E.in }, `<path class="c" d="M32 5c2.6 3.4 4 5.4 4 7.4a4 4 0 0 1-8 0c0-2 1.4-4 4-7.4z"/>`)
    + [420, 580, 740].map(d => ar('dl-ripple', { d, dur: 1000, cls: 'gone' }, `<ellipse class="lc" cx="32" cy="41" rx="5" ry="1.4"/>`)).join('')
    + ar('dl-leaf', { d: 380, dur: 1300, ease: DL_E.io }, `<path class="g" d="M44 10c5-2 10 0 11 4-4 3-9 3-11-4z"/><path class="lw" d="M44.5 10.2c3 .6 6 1.6 9.6 3.6"/>`) },

  /* ── streak ── */
  'flame-grow': { colour: 'orange', label: 'Streak flame', svg: () =>
    `<rect class="k" x="12" y="50" width="40" height="5" rx="2.5" transform="rotate(-9 32 52)"/><rect class="k" x="12" y="50" width="40" height="5" rx="2.5" transform="rotate(9 32 52)"/>`
    + ar('dl-ignite', { d: 80, dur: 660, cls: 'o-b' }, `<g class="x-flame o-b"><path class="c" d="M32 8c4 8 14 14 14 26a14 14 0 0 1-28 0c0-6 3-10 6-13 0 5 2 8 4 8-1-8 2-15 4-21z"/><path class="y" d="M32 26c3 4 7 7 7 13a7 7 0 0 1-14 0c0-3 2-6 3-7 0 3 1 4 2 4 0-4 1-8 2-10z"/></g>`)
    + [[24, 28, 600, -4], [40, 24, 740, 5], [32, 18, 880, 0]].map(([x, y, d, tx]) => ar('dl-fly', { d, dur: 800, cls: 'gone', v: { tx: tx + 'px', ty: '-18px', sc: 0.5 } }, `<circle class="y" cx="${x}" cy="${y}" r="1.7"/>`)).join('') },
  'chain-link': { colour: 'orange', label: 'Another link', svg: () =>
    `<rect class="lk t" x="4" y="26" width="22" height="12" rx="6"/><rect class="lc t" x="20" y="26" width="22" height="12" rx="6"/>`
    + ar('dl-link-in', { d: 150, dur: 600, ease: DL_E.out }, `<rect class="lc t" x="36" y="26" width="22" height="12" rx="6"/>`)
    + RING(47, 32, 8, 640) + ar('dl-glint', { d: 820, dur: 520, cls: 'gone' }, `<circle class="y" cx="8" cy="26" r="2.2"/>`)
    + SPARK(56, 16, 4.5, 760, 'y') },
  'calendar-crosses': { colour: 'orange', label: 'Seven in a row', svg: () => {
    const cells = [[5, 12], [19, 12], [33, 12], [47, 12], [12, 30], [26, 30]];
    return ar('dl-fade-in', { dur: 200 }, cells.map(([x, y]) => `<rect class="w lm" x="${x}" y="${y}" width="12" height="12" rx="3"/>`).join('') + `<rect class="w lm" x="40" y="30" width="16" height="16" rx="4"/>`)
      + cells.map(([x, y], i) => ar('dl-pop', { d: 120 + i * 70, dur: 260 }, `<path class="lc t" d="M${x + 3} ${y + 6.4}l2.2 2.2 4-4.4"/>`)).join('')
      + ar('dl-thump', { d: 620, dur: 420 }, `<rect class="c" x="40" y="30" width="16" height="16" rx="4"/><path class="lw2" d="M44 38.3l3 3 5-5.6"/>`)
      + RING(48, 38, 9, 720) + SPARK(58, 54, 4, 820, 'y') + SPARK(30, 52, 3.5, 900, 'y');
  } },

  /* ── first / last of the day ── */
  'sunrise-check': { colour: 'amber', label: 'First one', svg: () =>
    ar('dl-rays-in', { d: 520, dur: 700, cls: 'o-v', origin: '32px 40px' }, `<path class="ly" d="M32 22v-6M18 28l-4-4M46 28l4-4M12 40H6M52 40h6"/>`)
    + ar('dl-sunrise', { d: 100, dur: 820, v: { dy: '24px' } }, `<circle class="y" cx="32" cy="40" r="12"/>` + ar('dl-pop', { d: 860, dur: 380 }, `<path class="lk t" d="M26.5 39l4 4 7.5-8"/>`))
    + `<rect class="s" x="0" y="45" width="64" height="19"/><path class="lm" d="M4 45h56"/>`
    + SPARK(52, 12, 4, 980, 'y') },
  'first-sip': { colour: 'amber', label: 'Day started', arrive: 700, svg: () =>
    ar('dl-grow-x', { dur: 300 }, `<rect class="m" x="9" y="55" width="38" height="3" rx="1.5"/>`)
    + ar('dl-in-left', { dur: 520, ease: DL_E.back, v: { dx: '26px' } }, MUG)
    + [[22, 22, 480], [28, 21, 600], [34, 22, 720]].map(([x, y, d]) => ar('dl-in-up', { d, dur: 320, v: { dy: '4px' } }, STEAM(x, y, (d - 480) / 1000))).join('')
    + ar('dl-pop', { d: 780, dur: 400 }, `<circle class="y" cx="52" cy="14" r="5"/><path class="ly" d="M52 5v-2M52 25v-2M43 14h-2M63 14h-2M45.6 7.6l-1.4-1.4M58.4 7.6l1.4-1.4"/>`) },
  'lamp-off': { colour: 'indigo', label: 'Lights out', svg: () =>
    ar('dl-light-off', { d: 260, dur: 520, cls: 'gone' }, `<path class="yl" style="opacity:1" d="M27 26L14 56h36L39 29z" fill-opacity=".32"/>`)
    + `<rect class="k" x="8" y="54" width="22" height="4" rx="2"/><path class="lk t" d="M19 54V36l9-11"/><circle class="k" cx="19" cy="36" r="2.4"/><path class="c" d="M24 16l15 5-5 9-15-5z"/>`
    + ar('dl-dim', { d: 520, dur: 260 }, `<path class="k" d="M24 16l15 5-5 9-15-5z"/>`)
    + ar('dl-rise-in', { d: 640, dur: 640, v: { dy: '10px' } }, `<path class="y" d="M50 4a9 9 0 1 0 9 12.4 7.2 7.2 0 1 1-9-12.4z"/>`)
    + SPARK_STAY(40, 8, 2.6, 900) + SPARK_STAY(58, 30, 2.2, 1020) + SPARK_STAY(46, 22, 1.8, 1140, 'c') },
  'laptop-close': { colour: 'indigo', label: 'Laptop closed', svg: () =>
    ar('dl-lid-shut', { d: 300, dur: 520, cls: 'o-b', ease: DL_E.in }, `<rect class="k" x="12" y="18" width="40" height="32" rx="3"/><rect class="c" x="18" y="25" width="18" height="2.4" rx="1"/><rect class="w" x="18" y="31" width="24" height="2.4" rx="1" opacity=".7"/><rect class="w" x="18" y="37" width="14" height="2.4" rx="1" opacity=".7"/>`)
    + `<path class="m" d="M6 50h52l-4 6H10z"/>`
    + [[42, 30, 820], [48, 22, 960], [54, 14, 1100]].map(([x, y, d], i) => ar('dl-fly', { d, dur: 700, cls: 'gone', v: { tx: '3px', ty: '-6px' } }, `<path class="lc" style="stroke-width:${2 - i * 0.3}" d="M${x} ${y}h${5 - i}l-${5 - i} ${6 - i}h${5 - i}"/>`)).join('') },

  /* ── all focus done ── */
  'three-to-ring': { colour: 'violet', label: 'All three', svg: () =>
    [[18, 0.1, 8], [32, 0, -16], [46, -0.1, 8]].map(([x, tx, ty], i) => ar('dl-gather', { d: 80 + i * 60, dur: 760, cls: 'gone', ease: DL_E.io, v: { tx: tx + 'px', ty: ty + 'px' } }, `<circle class="c" cx="${x}" cy="32" r="4.5"/>`)).join('')
    + [0, 120, 240].map((a, i) => ar('dl-arc-in', { d: 640 + i * 70, dur: 320, cls: 'o-v', origin: '32px 32px' }, `<path class="lc t" d="${ARC(32, 32, 16, a - 120 + 4, a - 4)}"/>`)).join('')
    + ar('dl-spin-in', { d: 860, dur: 520 }, `<path class="y" d="${STAR5(32, 32.5, 9)}"/>`)
    + RING(32, 32, 17, 940, 'lc', 1.4) + SPARK(54, 10, 4.5, 1020, 'y') + SPARK(10, 54, 3.5, 1100, 'y') },
  'bullseye': { colour: 'violet', label: 'Bullseye', svg: () =>
    ar('dl-shake', { d: 470, dur: 420 }, `<circle class="c" cx="28" cy="36" r="20"/><circle class="w" cx="28" cy="36" r="14"/><circle class="c" cx="28" cy="36" r="8"/><circle class="w" cx="28" cy="36" r="2.6"/>`)
    + ar('dl-arrow', { d: 100, dur: 620, ease: DL_E.in },
      ar('dl-quiver', { d: 480, dur: 420, cls: 'o-v', origin: '29px 35px' }, `<path class="lk t" d="M29 35l22-22"/><path class="y" d="M51 13l1-8 4 4zM51 13l8-1-4-4z"/>`))
    + RING(28, 36, 6, 480, 'lw', 2) + SPARK(50, 44, 4.5, 560, 'y') + SPARK(8, 12, 3.5, 640, 'y') },

  /* ── money ── */
  'piggy-full': { colour: 'green', label: 'Saved', svg: () =>
    [0, 250, 500].map(d => ar('dl-coin-drop', { d, dur: 620, cls: 'gone', ease: DL_E.in }, `<circle class="y" cx="31" cy="6" r="5"/><rect class="w" x="29.6" y="3" width="2.8" height="6" rx="1.4" opacity=".55"/>`)).join('')
    + ar('dl-squash', { d: 420, dur: 250, n: 3, cls: 'o-b' }, `<path class="lc" d="M13 38c-4 0-4-5 0-4"/><path class="c" d="M22 28l3-8 6 6z"/><ellipse class="c" cx="31" cy="40" rx="18" ry="13"/><ellipse class="s" cx="49" cy="40" rx="5" ry="4"/><circle class="k" cx="48" cy="39" r=".9"/><circle class="k" cx="50.6" cy="39" r=".9"/><circle class="k" cx="40" cy="35" r="1.6"/><rect class="k" x="26" y="27" width="10" height="2.4" rx="1.2"/><rect class="k" x="19" y="50" width="5" height="7" rx="2"/><rect class="k" x="35" y="50" width="5" height="7" rx="2"/>`)
    + ar('dl-pop', { d: 1120, dur: 400 }, `<path class="fp" d="${HEART(54, 16, 0.85)}"/>`) + SPARK(10, 22, 4, 1180, 'y') },
  'chain-break': { colour: 'green', label: 'Paid off', svg: () =>
    ar('dl-fall-away', { d: 700, dur: 520, v: { tx: '-6px', rot: '-35deg' } }, `<rect class="lm t" x="2" y="36" width="13" height="7" rx="3.5"/>`)
    + ar('dl-fall-away', { d: 740, dur: 520, v: { tx: '6px', rot: '35deg' } }, `<rect class="lm t" x="49" y="36" width="13" height="7" rx="3.5"/>`)
    + ar('dl-unlock', { d: 280, dur: 620, cls: 'o-v', origin: '40px 30px', ease: DL_E.back }, `<path class="lk t" d="M24 31v-9a8 8 0 0 1 16 0v9"/>`)
    + `<rect class="y" x="17" y="30" width="30" height="24" rx="4"/><circle class="k" cx="32" cy="40" r="2.8"/><rect class="k" x="30.8" y="41" width="2.4" height="6" rx="1.2"/>`
    + CHECK(48, 50, 7, 900) + SPARK(10, 14, 4, 980, 'y') + SPARK(54, 12, 4.5, 1060) },
  'bar-to-coins': { colour: 'green', label: 'Budget met', svg: () =>
    `<rect class="m" x="6" y="18" width="52" height="8" rx="4"/>`
    + ar('dl-grow-x', { dur: 720, cls: 'o-l', ease: DL_E.io }, `<rect class="c" x="6" y="18" width="52" height="8" rx="4"/>`)
    + [0, 1, 2].map(i => ar('dl-hop', { d: 760 + i * 160, dur: 460, ease: DL_E.out, v: { hx: '10px', hy: (-30 + i * 5) + 'px' } }, `<ellipse class="y" cx="44" cy="${52 - i * 5}" rx="8" ry="3"/><ellipse class="ly" style="stroke-width:1.2" cx="44" cy="${52 - i * 5}" rx="5" ry="1.4"/>`)).join('')
    + CHECK(16, 46, 7.5, 1280) + SPARK(58, 34, 4, 1340, 'y') },
};

/* ============================================================
   2. SCENES WITH AN ARRIVAL (and the new types)
   ============================================================ */
const _CONFETTI = (n, seed) => { let o = ''; for (let i = 0; i < n; i++) { const x = 6 + ((i * 37 + (seed || 0) * 11) % 52), y = 2 + ((i * 13) % 14), d = ((i * 0.37) % 2).toFixed(2); o += `<rect class="${i % 3 === 0 ? 'k' : i % 3 === 1 ? 'c' : 's'} x-fall" style="--d:${d}s" x="${x}" y="${y}" width="3" height="5" rx="1"/>`; } return o; };
const DL_ARRIVE = [
  { type: 'party', label: 'Party', colour: 'pink', arrive: 1000, svg: () =>
    ar('dl-rise-in', { dur: 720, v: { dy: '48px' } }, `<g class="x-float2"><ellipse class="c" cx="17" cy="22" rx="8" ry="10"/><path class="lm" d="M17 32q-2 8 2 18"/></g>`)
    + ar('dl-rise-in', { d: 130, dur: 720, v: { dy: '52px' } }, `<g class="x-float2" style="--d:.9s"><ellipse class="s lc" cx="33" cy="17" rx="8" ry="10"/><path class="lm" d="M33 27q2 9-2 22"/></g>`)
    + ar('dl-rise-in', { d: 260, dur: 720, v: { dy: '48px' } }, `<g class="x-float2" style="--d:.4s"><ellipse class="k" cx="49" cy="24" rx="7" ry="9"/><path class="lm" d="M49 33q-2 8 1 16"/></g>`)
    + Array.from({ length: 9 }, (_, i) => { const a = -Math.PI * (0.12 + 0.76 * i / 8); return ar('dl-fly', { d: 420, dur: 820, cls: 'gone', ease: 'cubic-bezier(.1,.7,.3,1)', v: { tx: _n(Math.cos(a) * 26) + 'px', ty: _n(Math.sin(a) * 30) + 'px', rot: (i * 70) + 'deg' } }, `<rect class="${['c', 'k', 's', 'y'][i % 4]}" x="31" y="54" width="3" height="5" rx="1"/>`); }).join('')
    + ar('dl-fade-in', { d: 900, dur: 300 }, _CONFETTI(7, 2)) },
  { type: 'birthday', label: 'Birthday', colour: 'pink', arrive: 1150, svg: () =>
    ar('dl-in-up', { dur: 460, v: { dy: '14px' } }, `<rect class="s lc" x="12" y="34" width="40" height="20" rx="3"/><path class="c" d="M12 37a3 3 0 0 1 3-3h34a3 3 0 0 1 3 3v4c-3 3-7 3-10 0-3 3-7 3-10 0-3 3-7 3-10 0-3 3-7 3-10 0z"/><rect class="m" x="8" y="54" width="48" height="3" rx="1.5"/>`)
    + [20, 30.5, 41].map((x, i) => ar('dl-grow-y', { d: 260 + i * 90, dur: 260, cls: 'o-b' }, `<rect class="w lm" x="${x}" y="24" width="3" height="10" rx="1"/>`)
      + ar('dl-pop', { d: 640 + i * 150, dur: 320, cls: 'o-b' }, `<path class="c x-flicker" style="--d:${i * 0.23}s" d="M${x + 1.5} 14c2.3 3 3 5.4 0 7.6-3-2.2-2.3-4.6 0-7.6z"/>`)).join('')
    + SPARK(54, 12, 5, 1050, 'y') + SPARK(8, 18, 3.5, 1120, 'y') },
  { type: 'dinner', label: 'Dinner', colour: 'orange', arrive: 1050, svg: () =>
    `<circle class="w lm" cx="32" cy="40" r="16"/><path class="lk" d="M9 27v28M6 27v7a3 3 0 0 0 6 0v-7"/><path class="lk" d="M55 55V27c-3 0-4 6-4 12h4"/>`
    + ar('dl-pop', { d: 620, dur: 380 }, `<circle class="s" cx="32" cy="40" r="10"/>`)
    + ar('dl-fade-in', { d: 760, dur: 300 }, STEAM(27, 26, 0) + STEAM(32, 25, 0.7) + STEAM(37, 26, 1.4))
    + ar('dl-lift-off', { d: 200, dur: 820, cls: 'gone', ease: DL_E.io }, `<path class="c" d="M13 46a19 18 0 0 1 38 0z"/><path class="lw" d="M19 40a13 12 0 0 1 9-9" opacity=".7"/><circle class="k" cx="32" cy="26" r="2.6"/><rect class="k" x="10" y="45" width="44" height="4" rx="2"/>`) },
  { type: 'coffee', label: 'Coffee', colour: 'amber', arrive: 1100, svg: () =>
    ar('dl-grow-x', { dur: 300 }, `<rect class="m" x="9" y="55" width="38" height="3" rx="1.5"/>`)
    + ar('dl-pour', { d: 460, dur: 620, cls: 'gone o-t' }, `<rect class="k" x="26.5" y="0" width="4" height="30" rx="2"/>`)
    + ar('dl-in-left', { dur: 540, ease: DL_E.back, v: { dx: '28px' } }, MUG)
    + ar('dl-fade-in', { d: 900, dur: 300 }, STEAM(22, 22, 0) + STEAM(28, 21, 0.6) + STEAM(34, 22, 1.2)) },
  { type: 'cinema', label: 'Cinema', colour: 'slate', arrive: 1100, svg: () =>
    `<g class="x-spin-slow"><circle class="c" cx="26" cy="30" r="15"/>${[[26, 21.5], [34.1, 27.4], [31, 37], [21, 37], [17.9, 27.4]].map(([x, y]) => `<circle class="w" cx="${x}" cy="${y}" r="3.2"/>`).join('')}<circle class="k" cx="26" cy="30" r="2"/></g>`
    + `<rect class="k" x="34" y="44" width="28" height="10" rx="1"/><g class="x-slidel">${[30, 37, 44, 51, 58, 65].map(x => `<rect class="w" x="${x}" y="46" width="3" height="2" rx=".5"/><rect class="w" x="${x}" y="50" width="3" height="2" rx=".5"/>`).join('')}</g>`
    + ar('dl-curtain', { d: 160, dur: 900, cls: 'o-l', ease: DL_E.io }, `<path class="fr" d="M0 4h33v58c-5-2-10 1-16-1S5 62 0 60z"/><path class="lw" d="M8 6v52M16 6v54M25 6v52" opacity=".45"/>`)
    + ar('dl-curtain', { d: 160, dur: 900, cls: 'o-r', ease: DL_E.io }, `<path class="fr" d="M64 4H31v58c5-2 10 1 16-1s12 2 17 0z"/><path class="lw" d="M56 6v52M48 6v54M39 6v52" opacity=".45"/>`)
    + `<rect class="fr" x="0" y="0" width="64" height="6" rx="1"/>` },
  { type: 'meeting', label: 'Meeting', colour: 'blue', arrive: 950, svg: () =>
    ar('dl-grow-x', { dur: 360 }, `<ellipse class="s" cx="32" cy="44" rx="23" ry="7"/>`)
    + ar('dl-rise-in', { d: 160, dur: 460, v: { dy: '12px' } }, PERSON(15, 26, 'c', 0))
    + ar('dl-rise-in', { d: 260, dur: 460, v: { dy: '12px' } }, PERSON(32, 21, 'k', 0.4))
    + ar('dl-rise-in', { d: 360, dur: 460, v: { dy: '12px' } }, PERSON(49, 26, 'c', 0.8))
    + ar('dl-pop', { d: 640, dur: 360 }, `<g class="x-float" style="--d:1.2s"><rect class="w lc" x="38" y="4" width="17" height="10" rx="5"/></g>`) },
  { type: 'interview', label: 'Interview', colour: 'amber', arrive: 850, svg: () =>
    ar('dl-in-left', { dur: 460, ease: DL_E.back, v: { dx: '18px' } }, `<rect class="m" x="8" y="40" width="16" height="4" rx="2"/><rect class="m" x="8" y="26" width="4" height="18" rx="2"/><rect class="m" x="10" y="44" width="3" height="11"/><rect class="m" x="20" y="44" width="3" height="11"/>`)
    + ar('dl-in-right', { d: 90, dur: 460, ease: DL_E.back, v: { dx: '18px' } }, `<rect class="m" x="40" y="40" width="16" height="4" rx="2"/><rect class="m" x="52" y="26" width="4" height="18" rx="2"/><rect class="m" x="41" y="44" width="3" height="11"/><rect class="m" x="51" y="44" width="3" height="11"/>`)
    + ar('dl-pop', { d: 460, dur: 400 }, `<g class="x-pop"><path class="c" d="M18 8h22a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H29l-5 5v-5h-6a4 4 0 0 1-4-4v-8a4 4 0 0 1 4-4z"/><circle class="w x-blink" cx="23" cy="16" r="1.6"/><circle class="w x-blink" style="--d:.3s" cx="29" cy="16" r="1.6"/><circle class="w x-blink" style="--d:.6s" cx="35" cy="16" r="1.6"/></g>`) },
  { type: 'call', label: 'Call', colour: 'teal', arrive: 1000, svg: () =>
    ar('dl-drop-in', { dur: 620, v: { dy: '20px' } }, `<path class="c x-wobble" d="M20 13c2-2 5-2 6 1l2 6c1 2 0 4-2 5l-2 1c2 5 6 9 11 11l1-2c1-2 3-3 5-2l6 2c3 1 3 4 1 6l-3 3c-3 3-9 2-16-3s-12-13-12-19c0-3 1-5 3-6z"/>`)
    + [380, 520, 660].map((d, i) => ar('dl-ring', { d, dur: 560, cls: 'gone o-v', origin: '40px 24px', v: { rs: 1.25 } }, `<path class="lc t" d="${['M40 13a11 11 0 0 1 11 11', 'M40 5a19 19 0 0 1 19 19', 'M40 -3a27 27 0 0 1 27 27'][i]}"/>`)).join('')
    + `<path class="lc t x-ring" d="M40 13a11 11 0 0 1 11 11"/><path class="lc t x-ring" style="--d:.45s" d="M40 5a19 19 0 0 1 19 19"/>` },
  { type: 'lecture', label: 'Lecture', colour: 'green', arrive: 750, svg: () =>
    ar('dl-unroll', { dur: 520, cls: 'o-t', ease: DL_E.out }, `<rect class="c" x="6" y="8" width="52" height="34" rx="3"/>`)
    + ar('dl-fade-in', { d: 420, dur: 200 }, `<rect class="w x-grow o-l" x="12" y="15" width="30" height="2.5" rx="1"/><rect class="w x-grow o-l" style="--d:.8s" x="12" y="22" width="36" height="2.5" rx="1"/><rect class="w x-grow o-l" style="--d:1.6s" x="12" y="29" width="22" height="2.5" rx="1"/>`)
    + ar('dl-grow-y', { d: 300, dur: 300, cls: 'o-t' }, `<rect class="m" x="20" y="42" width="3" height="14"/><rect class="m" x="41" y="42" width="3" height="14"/>`)
    + ar('dl-pop', { d: 480, dur: 300 }, `<rect class="s" x="44" y="36" width="9" height="3" rx="1"/>`) },
  { type: 'flight', label: 'Flight', colour: 'blue', arrive: 1150, svg: () =>
    ar('dl-hold-out', { dur: 1150, cls: 'gone' }, `<rect class="m" x="0" y="53" width="64" height="5" rx="1"/>${[4, 18, 32, 46, 60].map(x => `<rect class="w" x="${x}" y="55" width="7" height="1.2" rx=".6"/>`).join('')}`)
    + ar('dl-takeoff', { dur: 1000, cls: 'gone', ease: DL_E.in }, `<g transform="translate(0 25) scale(.62)">${PLANE_TOP}</g>`)
    + ar('dl-fade-in', { d: 900, dur: 380 }, `<path class="lm dash" d="M4 48A30 30 0 0 1 60 48"/><circle class="k" cx="4" cy="48" r="2.5"/><circle class="c" cx="60" cy="48" r="2.5"/>`)
    + `<g class="x-arc o-v" style="transform-origin:32px 58.8px">${PLANE_TOP}</g>` },
  { type: 'travel', label: 'Travel', colour: 'blue', arrive: 1100, svg: () =>
    ar('dl-roll-in', { dur: 680 }, `<rect class="c" x="12" y="24" width="32" height="28" rx="4"/><path class="lk" d="M22 24v-5h12v5"/><rect class="w" x="19" y="30" width="2.5" height="16" rx="1"/><rect class="w" x="34.5" y="30" width="2.5" height="16" rx="1"/><circle class="k" cx="18" cy="55" r="2.5"/><circle class="k" cx="38" cy="55" r="2.5"/>`)
    + ar('dl-drop-in', { d: 460, dur: 620, v: { dy: '26px' } }, `<g class="x-bounce o-b"><path class="k" d="M51 6a7 7 0 0 1 7 7c0 6-7 12-7 12s-7-6-7-12a7 7 0 0 1 7-7z"/><circle class="w" cx="51" cy="13" r="2.5"/></g>`)
    + RING(51, 25, 4, 760, 'lc', 2) },
  { type: 'holiday', label: 'Holiday', colour: 'teal', arrive: 1100, svg: () =>
    ar('dl-sunrise', { dur: 900, v: { dy: '34px' } }, `<circle class="c x-glow" cx="44" cy="20" r="9"/>`)
    + ar('dl-spring', { d: 300, dur: 620, cls: 'o-b' }, `<path class="lk" d="M18 46V22"/><path class="c" d="M18 22c-6 0-11 3-12 7 4-2 8-2 12 0 4-2 8-2 12 0-1-4-6-7-12-7z"/>`)
    + ar('dl-in-right', { d: 120, dur: 600, v: { dx: '18px' } }, WAVE(42, 'lc', 0))
    + ar('dl-in-right', { d: 220, dur: 600, v: { dx: '18px' } }, WAVE(50, 'lm', -0.8))
    + `<path class="s" d="M0 54h64v10H0z"/>` },
  { type: 'moving', label: 'Moving house', colour: 'orange', arrive: 1000, svg: () =>
    ar('dl-grow-x', { dur: 280 }, `<rect class="m" x="2" y="55" width="60" height="2" rx="1"/>`)
    + ar('dl-drop-in', { d: 60, dur: 560, v: { dy: '34px' } }, `<g class="x-bounce o-b"><rect class="c" x="6" y="34" width="24" height="20" rx="2"/><rect class="w" x="16" y="34" width="4" height="8"/></g>`)
    + ar('dl-drop-in', { d: 220, dur: 560, v: { dy: '34px' } }, `<g class="x-bounce o-b" style="--d:.3s"><rect class="s lc" x="34" y="36" width="22" height="18" rx="2"/><rect class="lc" x="43" y="36" width="4" height="7"/></g>`)
    + ar('dl-drop-in', { d: 420, dur: 560, v: { dy: '30px' } }, `<g class="x-bounce o-b" style="--d:.6s"><rect class="k" x="12" y="14" width="18" height="18" rx="2"/><rect class="w" x="19" y="14" width="4" height="7"/></g>`) },
  { type: 'gym', label: 'Gym', colour: 'orange', arrive: 760, svg: () =>
    `<g class="x-lift">` + ar('dl-grow-x', { dur: 300 }, `<rect class="k" x="14" y="24" width="36" height="4" rx="2"/>`)
    + ar('dl-in-left', { d: 200, dur: 360, ease: DL_E.back, v: { dx: '14px' } }, `<rect class="c" x="8" y="16" width="7" height="20" rx="2"/><rect class="c" x="3" y="20" width="5" height="12" rx="1.5"/>`)
    + ar('dl-in-right', { d: 300, dur: 360, ease: DL_E.back, v: { dx: '14px' } }, `<rect class="c" x="49" y="16" width="7" height="20" rx="2"/><rect class="c" x="56" y="20" width="5" height="12" rx="1.5"/>`) + `</g>`
    + ar('dl-fade-in', { d: 400, dur: 300 }, `<ellipse class="m x-shadow" cx="32" cy="54" rx="18" ry="3"/>`) },
  { type: 'doctor', label: 'Doctor (new)', colour: 'red', arrive: 950, isNew: true, keywords: ['doctor', 'gp', 'clinic', 'surgery', 'check-up', 'checkup', 'consultant', 'nurse', 'appointment', '🩺'], svg: () =>
    ar('dl-drop-in', { dur: 620, v: { dy: '18px' } }, `<circle class="k" cx="12" cy="8" r="2.4"/><circle class="k" cx="28" cy="8" r="2.4"/><path class="lk t" d="M12 9v8a8 8 0 0 0 16 0V9"/><path class="lk t" d="M20 25v8a10 10 0 0 0 10 10h4"/><g class="x-beat" style="--d:.15s"><circle class="c" cx="40" cy="43" r="6.5"/><circle class="w" cx="40" cy="43" r="2.6"/></g>`)
    + ar('dl-pop', { d: 520, dur: 380 }, `<path class="fr x-beat" d="${HEART(50, 17, 1.05)}"/>`)
    + [['M2 57h14', 300], ['M16 57l3-6 4 10', 390], ['M23 61l3-12 3 8', 480], ['M29 57h33', 570]].map(([p, d], i) => ar('dl-ink', { d, dur: 120, cls: 'o-l' }, `<path class="lc x-blip" style="--d:${(i * 0.18).toFixed(2)}s" d="${p}"/>`)).join('') },
  { type: 'exam', label: 'Exam (new)', colour: 'indigo', arrive: 950, isNew: true, keywords: ['exam', 'exams', 'test', 'quiz', 'assessment', 'mock exam', 'finals', 'midterm', 'paper 1', '📝'], svg: () =>
    ar('dl-flip-x', { dur: 520 }, `<rect class="w lm" x="8" y="6" width="36" height="50" rx="3"/><rect class="m" x="13" y="11" width="18" height="3" rx="1.5"/>`
      + [[20, 24], [29, 16], [38, 32], [47, 24]].map(([y, fx], i) => [16, 24, 32].map(x => `<circle class="lm" cx="${x}" cy="${y}" r="2.6"/>`).join('') + `<circle class="c x-pop" style="--d:${(i * 0.7).toFixed(1)}s" cx="${fx}" cy="${y}" r="2.6"/>`).join(''))
    + ar('dl-drop-in', { d: 360, dur: 520, v: { dy: '16px' } }, `<circle class="w lc t" cx="49" cy="46" r="11"/><path class="lk" d="M49 46l-4-3"/><path class="lk x-hand o-v" style="transform-origin:49px 46px" d="M49 46v-7.5"/><circle class="k" cx="49" cy="46" r="1.6"/>`)
    + RING(49, 46, 11, 820, 'lc', 1.4) },
  { type: 'deadline', label: 'Deadline', colour: 'red', arrive: 760, svg: () =>
    ar('dl-flip180', { dur: 720 }, `<rect class="k" x="14" y="6" width="36" height="4" rx="2"/><rect class="k" x="14" y="54" width="36" height="4" rx="2"/><path class="w lm" d="M18 10h28c0 10-9 16-11 22 2 6 11 12 11 22H18c0-10 9-16 11-22-2-6-11-12-11-22z"/>`
      + `<path class="c x-sandtop o-b" d="M21 14h22c-1 6-7 10-11 15-4-5-10-9-11-15z"/><path class="c x-sandbot o-b" d="M20 52h24c-1-6-6-10-12-12-6 2-11 6-12 12z"/><rect class="c x-stream" x="31" y="30" width="2" height="20"/>`) },
  { type: 'outing', label: 'Outing', colour: 'green', arrive: 1000, svg: () =>
    ar('dl-pop', { d: 300, dur: 420 }, `<circle class="c x-glow" cx="14" cy="14" r="6"/>`)
    + ar('dl-in-up', { dur: 620, v: { dy: '16px' } }, `<path class="s" d="M0 44c12-13 25-15 36-8s19 3 28-6v34H0z"/>`)
    + ar('dl-spring', { d: 460, dur: 520, cls: 'o-b' }, `<g class="x-tree o-b"><rect class="k" x="44.6" y="27" width="2.8" height="10" rx="1"/><circle class="c" cx="46" cy="23" r="7.5"/></g>`)
    + ar('dl-in-up', { d: 110, dur: 620, v: { dy: '12px' } }, `<path class="c" d="M0 52c13-8 27-8 38-3s18 3 26-1v16H0z"/>`)
    + [[10, 58.5, 0], [17, 56, 0.4], [24, 57.5, 0.8], [31, 55, 1.2]].map(([x, y, d]) => `<ellipse class="w x-step" style="--d:${d}s" cx="${x}" cy="${y}" rx="1.6" ry="1.1"/>`).join('') },
  /* motion variants (new types) */
  { type: 'gift', label: 'Gift (variant)', colour: 'pink', arrive: 1100, isNew: true, keywords: ['gift', 'present', 'presents', 'secret santa', '🎁'], svg: () =>
    ar('dl-drop-in', { dur: 560, v: { dy: '26px' } }, `<rect class="c" x="14" y="30" width="36" height="26" rx="3"/><rect class="w" x="29" y="30" width="6" height="26"/>`
      + ar('dl-lid-pop', { d: 460, dur: 620 }, `<g class="x-lid"><rect class="c" x="11" y="22" width="42" height="9" rx="2.5"/><rect class="w" x="29" y="22" width="6" height="9"/><path class="lc t" d="M32 22c-6-8-14-4-8 0M32 22c6-8 14-4 8 0"/></g>`))
    + BURST(32, 22, 7, 16, 640, ['c', 'y', 'k'], 1.6) + SPARK_STAY(54, 12, 4, 900) + SPARK_STAY(9, 20, 3, 1000, 'c') },
  { type: 'flight-window', label: 'In the air (variant)', colour: 'blue', arrive: 900, isNew: true, keywords: ['in flight', 'on the plane', 'flying to'], svg: () =>
    `<rect class="m" x="13" y="5" width="38" height="54" rx="19"/><rect class="s" x="17" y="9" width="30" height="46" rx="15"/>`
    + `<g class="x-cloudby"><ellipse class="w" cx="36" cy="22" rx="7" ry="3.4"/></g><g class="x-cloudby" style="--d:-2.6s"><ellipse class="w" cx="32" cy="36" rx="9" ry="3.8"/></g><g class="x-cloudby" style="--d:-1.3s"><ellipse class="w" cx="38" cy="46" rx="5" ry="2.4"/></g>`
    + `<path class="k" d="M18 50l22-8 6 2-26 10z"/>`
    + ar('dl-shade-up', { dur: 700, cls: 'o-t', ease: DL_E.io }, `<rect class="w lm" x="17" y="9" width="30" height="9" rx="4"/>`) },
  { type: 'popcorn', label: 'Popcorn (variant)', colour: 'red', arrive: 1000, isNew: true, keywords: ['popcorn', 'movie night', 'film night'], svg: () =>
    [[20, 24], [27, 19], [34, 22], [41, 18], [46, 24]].map(([x, y], i) => ar('dl-pop', { d: 300 + i * 110, dur: 320 }, `<g class="x-pop" style="--d:${(i * 0.8).toFixed(1)}s"><circle class="w lm" cx="${x}" cy="${y}" r="5"/></g>`)).join('')
    + ar('dl-in-up', { dur: 460, v: { dy: '20px' } }, `<path class="w lm" d="M16 28h32l-4 30H20z"/><path class="c" d="M22.5 28l2 30h4.5l-1-30zM36.5 28l-1 30H40l2-30z"/><rect class="c" x="14" y="26" width="36" height="4" rx="2"/>`)
    + `<g class="x-float" style="--d:.6s"><circle class="w lm" cx="52" cy="12" r="3.2"/></g>` },
  { type: 'pill', label: 'Medication (variant)', colour: 'red', arrive: 800, isNew: true, keywords: ['medication', 'meds', 'tablets', 'pills', 'prescription', 'pharmacy', '💊'], svg: () =>
    ar('dl-spin-in', { dur: 620 }, `<g class="x-rock"><g transform="rotate(-38 30 34)"><path class="c" d="M16 27h14v14H16a7 7 0 0 1 0-14z"/><path class="w lc" d="M30 27h14a7 7 0 0 1 0 14H30z"/><rect class="w" x="14" y="30" width="10" height="2.4" rx="1.2" opacity=".55"/></g></g>`)
    + ar('dl-pop', { d: 480, dur: 360 }, `<path class="fr x-pulse" d="M48 8h5v5h5v5h-5v5h-5v-5h-5v-5h5z"/>`)
    + SPARK_STAY(12, 54, 3.5, 700, 'c') },
];
const DL_ARRIVE_BY = new Map(DL_ARRIVE.map(s => [s.type, s]));

/* ============================================================
   3. TRAVEL MOTIFS (the "you've landed" card); regional, original, no landmarks copied
   ============================================================ */
const DL_MOTIFS = {
  coast: { colour: 'teal', label: 'Coast and hills (Southern Europe)', svg: () =>
    `<circle class="y x-glow" cx="14" cy="13" r="6"/><path class="s" d="M0 46L64 24v40H0z"/><path class="lm" d="M0 50L64 28"/>`
    + `<g class="x-tram"><g transform="rotate(-19 32 40)"><path class="lk" d="M30 26l-3-5h10"/><rect class="y" x="18" y="27" width="28" height="15" rx="3.5"/><rect class="w" x="22" y="30" width="5" height="5" rx="1"/><rect class="w" x="29.5" y="30" width="5" height="5" rx="1"/><rect class="w" x="37" y="30" width="5" height="5" rx="1"/><rect class="k" x="18" y="38" width="28" height="2.4"/></g></g>`
    + `<path class="c" d="M0 58h64v6H0z"/>` + WAVE(57, 'lw', 0) },
  alpine: { colour: 'blue', label: 'Mountains (Alpine)', svg: () =>
    `<path class="s" d="M24 58L44 22l20 36z"/><path class="c" d="M-4 58L20 16l26 42z"/><path class="w" d="M20 16l-6.6 11.4 3.6 1.8 3-3.2 3.2 3.2 3.4-1.8z"/><path class="w" d="M44 22l-4.8 8.6 2.6 1.4 2.2-2.4 2.4 2.4 2.4-1.4z"/>`
    + `<path class="lk" d="M-2 8L66 30"/>` + `<g class="x-glide"><path class="lk" d="M32 18v6"/><rect class="y" x="25" y="24" width="14" height="11" rx="3"/><rect class="w" x="27.5" y="26.5" width="9" height="4" rx="1"/></g>` },
  skyline: { colour: 'indigo', label: 'City at night', svg: () =>
    `<path class="y" d="M52 4a7 7 0 1 0 7 9.6 5.6 5.6 0 1 1-7-9.6z"/>`
    + `<rect class="k" x="4" y="30" width="12" height="28"/><rect class="c" x="17" y="18" width="13" height="40"/><rect class="k" x="31" y="26" width="10" height="32"/><rect class="s lc" x="42" y="34" width="14" height="24"/><path class="lk" d="M23.5 18v-8"/>`
    + [[7, 34], [11, 42], [7, 50], [20, 23], [25, 30], [20, 38], [25, 46], [34, 31], [37, 40], [34, 49], [46, 39], [51, 47]].map(([x, y], i) => `<rect class="y x-twink" style="--d:${((i * 0.53) % 2.6).toFixed(2)}s" x="${x}" y="${y}" width="2.6" height="3" rx=".6"/>`).join('')
    + `<rect class="m" x="0" y="58" width="64" height="3" rx="1"/>` },
  windmill: { colour: 'orange', label: 'Windmills and tulips (Low Countries)', svg: () =>
    `<path class="s" d="M0 50c16-6 34-6 64 0v14H0z"/><path class="c" d="M25 56l3-26h8l3 26z"/><path class="k" d="M26 31l6-6 6 6z"/><rect class="w" x="30" y="44" width="4" height="7" rx="2"/>`
    + `<g class="x-spin-slow o-v" style="transform-origin:32px 27px">${[0, 90, 180, 270].map(a => `<g transform="rotate(${a} 32 27)"><rect class="w lc" x="30" y="5" width="4.6" height="20" rx="1"/></g>`).join('')}<circle class="k" cx="32" cy="27" r="2.2"/></g>`
    + [[6, 'fr'], [12, 'fp'], [48, 'fr'], [54, 'y'], [60, 'fp']].map(([x, c]) => `<path class="lg" d="M${x} 62v-6"/><path class="${c}" d="M${x - 2.6} 52.5c0 3 1.2 4 2.6 4s2.6-1 2.6-4l-1.3 1.2-1.3-1.8-1.3 1.8z"/>`).join('') },
  aurora: { colour: 'teal', label: 'Northern lights (Nordic)', svg: () =>
    `<g class="x-aurora o-b"><path class="s" d="M0 30c10-14 20 4 32-6s22 2 32-8v12c-10 8-20-2-32 8S10 38 0 44z"/></g><g class="x-aurora o-b" style="--d:-3s"><path class="c" d="M0 22c12-8 22 4 34-4s20 0 30-6v5c-10 6-20-2-30 6S12 32 0 28z" opacity=".55"/></g>`
    + [[10, 8], [26, 5], [50, 9], [58, 4]].map(([x, y], i) => `<circle class="y x-twink" style="--d:${i * 0.6}s" cx="${x}" cy="${y}" r="1.2"/>`).join('')
    + [[8, 46], [20, 42], [44, 44], [56, 40]].map(([x, y]) => `<path class="k" d="M${x} ${y}l-6 16h12z"/>`).join('') + `<rect class="m" x="0" y="58" width="64" height="4"/>` },
  desert: { colour: 'amber', label: 'Dunes (desert)', svg: () =>
    `<circle class="y x-glow" cx="46" cy="16" r="9"/><path class="s" d="M0 44c14-10 26-10 40 0s18 6 24 2v18H0z"/><path class="c" d="M0 52c18-8 30-6 44 0s14 4 20 2v10H0z"/>`
    + `<path class="lk" d="M14 50V32"/><path class="g" d="M14 32c-5 0-9 2-10 5 3-1.6 7-1.6 10 0 3-1.6 7-1.6 10 0-1-3-5-5-10-5z"/>` },
};

/* ============================================================
   4. THE MOMENTS ("the big database")
   level: 0 whisper (in place) · 1 pop (scene at the pointer) · 2 flourish (pop + themed
   particles) · 3 moment (card with words) · 4 story (only inside the story player)
   ============================================================ */
/** Streaks only celebrate on these days. */
const DL_STREAK_STEPS = Object.freeze([3, 5, 7, 10, 14, 21, 30, 50, 75, 100, 150, 200, 365]);
const DL_MOMENTS = [
  // ── done, by kind of task (the anim-library classifier decides the kind) ──
  { id: 'done.email', trigger: 'task done · email', types: ['email'], level: 2, dur: 1800, variants: ['email-plane', 'email-seal', 'email-whoosh'], fx: 'planes', why: 'Replied / sent: the letter leaves.' },
  { id: 'done.writing', trigger: 'task done · writing', types: ['writing', 'reading', 'review'], level: 2, dur: 1800, variants: ['page-signed', 'pages-stack', 'quill-flourish'], fx: 'stars', why: 'A page finished.' },
  { id: 'done.coding', trigger: 'task done · coding', types: ['coding'], level: 2, dur: 1900, variants: ['build-passed', 'brackets-snap', 'merge-branch'], fx: 'brackets', why: 'Green build energy.' },
  { id: 'done.admin', trigger: 'task done · admin / forms / bills', types: ['admin', 'finance', 'delivery'], level: 1, dur: 1600, variants: ['stamp-done', 'filed-away', 'form-ticks'], fx: null, why: 'Boring thing, officially done.' },
  { id: 'done.prep', trigger: 'task done · meeting prep', types: ['meeting', 'one-on-one', 'video-call', 'conference', 'interview'], level: 1, dur: 1600, variants: ['agenda-ticked', 'slides-ready'], fx: null, why: 'Ready for the room.' },
  { id: 'done.submission', trigger: 'task done · submit / deadline / exam / due today P1', types: ['deadline', 'exam'], level: 3, dur: 3400, variants: ['slot-drop', 'hourglass-freeze', 'paper-rocket'], fx: 'confetti', why: 'A deadline met is a moment.' },
  { id: 'done.exercise', trigger: 'task done · gym / run / sport / health / doctor / medication', types: ['gym', 'run', 'sport', 'bowling', 'health', 'rest', 'dentist', 'doctor', 'pill'], level: 2, dur: 1800, variants: ['rep-lift', 'heart-ring', 'sneaker-dash'], fx: 'hearts', why: 'Body thanks you.' },
  { id: 'done.milestone', trigger: 'task done · milestone tag / last subtask of a project / P1 with 5+ subtasks all done / launch, go live, release vN', types: [], level: 3, dur: 3600, variants: ['summit-flag', 'trophy-rise', 'medal-drop'], fx: 'confetti', why: 'Projects deserve a summit.' },
  // ── context moments (checked first) ──
  { id: 'moment.inbox-zero', trigger: 'Inbox widget / triage reaches 0 (from 5+ today)', level: 3, dur: 3200, variants: ['tray-sunrise', 'bird-free', 'zen-ripple'], fx: 'leaves', why: 'Rare and earned: once a day.' },
  { id: 'moment.all-focus', trigger: 'the last of today\'s Focus tasks is done', level: 3, dur: 3200, variants: ['three-to-ring', 'bullseye'], fx: 'stars', why: 'The plan for the day, done.' },
  { id: 'moment.streak', trigger: `the streak reaches a milestone day: ${DL_STREAK_STEPS.join(', ')}`, level: 3, dur: 3000, variants: ['flame-grow', 'chain-link', 'calendar-crosses'], fx: 'embers', why: 'Milestones only, never every day.' },
  { id: 'moment.first', trigger: 'the first completion of the day (before 14:00)', level: 1, dur: 1600, variants: ['sunrise-check', 'first-sip'], fx: null, why: 'Momentum.' },
  { id: 'moment.last', trigger: 'Finish the day saved, or the last task done after the evening hour', level: 2, dur: 1900, variants: ['lamp-off', 'laptop-close'], fx: 'stars', why: 'Permission to stop.' },
  { id: 'moment.budget', trigger: 'a budget month closes under / a debt reaches 0 / a savings goal hits 100 %', level: 3, dur: 3200, variants: ['piggy-full', 'chain-break', 'bar-to-coins'], fx: 'coins', why: 'Money milestones in the Finances story too.' },
];
const DL_MOMENT_BY = new Map(DL_MOMENTS.map(m => [m.id, m]));
/** Which moments win when several apply (first wins). */
const DL_PRECEDENCE = Object.freeze(['moment.budget', 'done.milestone', 'done.submission', 'moment.inbox-zero', 'moment.all-focus', 'moment.streak', 'moment.last', 'moment.first']);

/* themed particles (currentColor) for L2/L3 */
const DL_PARTICLES = {
  planes: ['<svg viewBox="0 0 12 12"><path fill="currentColor" d="M11 1L1 4.5l3.5 1.6zM11 1L4.5 6.1 5.6 10z"/></svg>'],
  stars: ['<svg viewBox="0 0 12 12"><path fill="currentColor" d="M6 0l1.6 4.4L12 6 7.6 7.6 6 12 4.4 7.6 0 6l4.4-1.6z"/></svg>'],
  brackets: ['<svg viewBox="0 0 12 12"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 2L1 6l3 4M8 2l3 4-3 4"/></svg>', '<svg viewBox="0 0 12 12"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M2 6.5l2.6 2.6L10 3.5"/></svg>'],
  hearts: ['<svg viewBox="0 0 12 12"><path fill="currentColor" d="M6 11S0 7.4 0 3.6A3 3 0 0 1 6 2a3 3 0 0 1 6 1.6C12 7.4 6 11 6 11z"/></svg>'],
  confetti: ['<svg viewBox="0 0 12 12"><rect fill="currentColor" x="3" y="1" width="6" height="10" rx="1.5"/></svg>', '<svg viewBox="0 0 12 12"><circle fill="currentColor" cx="6" cy="6" r="4"/></svg>', '<svg viewBox="0 0 12 12"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M1 8c2-4 4 0 5-3s3-2 5-4"/></svg>'],
  leaves: ['<svg viewBox="0 0 12 12"><path fill="currentColor" d="M1 11C1 4 5 1 11 1c0 6-3 10-10 10z"/></svg>'],
  embers: ['<svg viewBox="0 0 12 12"><circle fill="currentColor" cx="6" cy="6" r="3"/></svg>'],
  coins: ['<svg viewBox="0 0 12 12"><circle fill="currentColor" cx="6" cy="6" r="5"/><rect fill="#fff" opacity=".55" x="5" y="3" width="2" height="6" rx="1"/></svg>'],
};
const DL_FX_COLOURS = { planes: ['var(--sw-blue)', 'var(--sw-indigo)'], stars: ['#f2b01e', 'var(--c)'], brackets: ['var(--sw-slate)', 'var(--success)'], hearts: ['var(--sw-pink)', 'var(--sw-red)'],
  confetti: ['var(--sw-pink)', '#f2b01e', 'var(--sw-indigo)', 'var(--sw-teal)', 'var(--sw-violet)', 'var(--sw-green)'], leaves: ['var(--sw-green)', 'var(--sw-teal)'], embers: ['#f2b01e', 'var(--sw-orange)'], coins: ['#f2b01e'] };
/** Particle markup for a burst (deterministic: seed). n <= 18. */
function delightFxHtml(kind, n, seed, spread) {
  const shapes = DL_PARTICLES[kind]; if (!shapes) return '';
  const cols = DL_FX_COLOURS[kind] || ['var(--c)'];
  let o = '';
  for (let i = 0; i < Math.min(18, n || 12); i++) {
    const k = (i * 7 + (seed || 0) * 3) % 13;
    const a = (i / n) * Math.PI * 2 + (k / 13) * 0.5 - Math.PI / 2;
    const dist = (spread || 70) * (0.62 + (k % 5) * 0.1);
    const up = kind === 'embers' || kind === 'leaves' ? -30 : 0;
    o += `<i style="--tx:${_n(Math.cos(a) * dist)}px;--ty:${_n(Math.sin(a) * dist * 0.8 + up)}px;--r:${(k * 53) % 360 - 180}deg;--pdl:${80 + (i % 4) * 40}ms;--ps:${9 + (k % 4) * 2}px;--pc:${cols[i % cols.length]};--g:${kind === 'embers' ? -18 : kind === 'leaves' ? 30 : 22}px">${shapes[i % shapes.length]}</i>`;
  }
  return `<div class="dl-fx" aria-hidden="true">${o}</div>`;
}

/* ============================================================
   5. CHOOSING (pure)
   ============================================================ */
/** fnv-1a, for a stable seed per day and moment. */
function _dlHash(s) { let h = 0x811c9dc5; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
/**
 * The moment for a completion (or a context event).
 *   item  {kind:'task', title, tags, priority, dueToday, subtasks, ...}  (or null for context-only)
 *   ctx   {type (the animClassify type), event: 'inbox-zero'|'focus-done'|'budget'|'evening-saved',
 *          doneToday (count before this one), hour, eveningHour, streak (days, after this one),
 *          streakBefore, milestoneTag (bool), projectLast (bool: the last open subtask of a
 *          project), lastOpen (open tasks due today after this one)}
 * -> moment id, or 'done.generic' (the existing anim-pop with the task's own scene).
 */
function delightFamily(item, ctx) {
  ctx = ctx || {};
  const hits = new Set();
  if (ctx.event === 'budget') hits.add('moment.budget');
  if (ctx.event === 'inbox-zero') hits.add('moment.inbox-zero');
  if (ctx.event === 'focus-done') hits.add('moment.all-focus');
  if (ctx.event === 'evening-saved') hits.add('moment.last');
  const title = ' ' + String(item && item.title || '').toLowerCase() + ' ';
  const tags = (item && Array.isArray(item.tags) ? item.tags : []).map(t => String(t).toLowerCase());
  if (item) {
    const subs = Array.isArray(item.subtasks) ? item.subtasks : [];
    const bigP1 = item.priority === 'p1' && subs.length >= 5 && subs.every(x => x && x.done);
    if (ctx.milestoneTag || ctx.projectLast || bigP1 || tags.includes('milestone') || / (milestone|launch|launched|go live) | (ship|release) v\d/.test(title)) hits.add('done.milestone');
    if (ctx.type === 'deadline' || / (submit|submission|hand in|send off) /.test(title) || (item.dueToday && item.priority === 'p1')) hits.add('done.submission');
    if (ctx.streak && DL_STREAK_STEPS.includes(ctx.streak) && ctx.streak !== ctx.streakBefore) hits.add('moment.streak');
    if (ctx.hour != null && ctx.eveningHour != null && ctx.hour >= ctx.eveningHour && ctx.lastOpen === 0) hits.add('moment.last');
    if (ctx.doneToday === 0 && ctx.hour != null && ctx.hour < 14) hits.add('moment.first');
  }
  for (const id of DL_PRECEDENCE) if (hits.has(id)) return id;
  if (!item) return null;
  for (const m of DL_MOMENTS) if (m.types && m.types.includes(ctx.type)) return m.id;
  return 'done.generic';
}
/**
 * The variant to show: stable for the day (seed), rotated by how many times the moment has
 * played today, and never the same as the last one shown (recent[id]).
 */
function delightPick(id, recent, seed) {
  const m = DL_MOMENT_BY.get(id);
  if (!m) return null;
  const n = m.variants.length;
  const last = recent && recent[id] ? recent[id].v : null;
  const plays = recent && recent[id] ? (recent[id].n || 0) : 0;
  let i = (_dlHash(String(seed || '') + '|' + id) + plays) % n;
  if (n > 1 && m.variants[i] === last) i = (i + 1) % n;
  return m.variants[i];
}
/**
 * Budget and level: whether a moment plays now, and at what level. This follows MOTION_SYSTEM
 * v3.1 (§3.8, §9.1); that spec owns the levels and the moment queue.
 * prefs.level: the motion level ('off' | 'reduced' | 'subtle' | 'standard' | 'playful') or the
 * names motionDelightPrefs() passes ('off' | 'subtle' | 'normal' | 'lots').
 *   L1 / L2 (pop, flourish)   off, reduced: none.  subtle: at most L1 (the pop, no particles).
 *                             standard, playful: as designed.
 *   L3 (a card; it carries information, so it never fully disappears)
 *                             off, reduced: shown still.  subtle: the card rises, no particles or actors.
 *                             standard: as choreographed.  playful: plus the tilt-in and a second wave.
 * Caps:
 *   - bulk (3+ completions inside 2.5 s, or no user input in the last 3 s): nothing.
 *   - habituation: one kind plays at most 3 times an hour; after that, the L0 tick.
 *   - L3: one card per 10 minutes (then a flourish) and 3 cards a day (then a pop). In the app the
 *     moment queue (motionMomentNext) applies these two; they are mirrored here so they are tested.
 *   - each context L3 once a day (then a pop), except done.submission / done.milestone; Playful lifts it.
 * st: {bulk, lastL3 (ms), l3Today (n), playedToday {id: n}, lastHour {id: n}}
 * -> {ok, level, still?, quiet?, extra?, why}
 */
const DL_LEVELS = Object.freeze({ off: 'off', reduced: 'reduced', subtle: 'subtle', normal: 'standard', standard: 'standard', lots: 'playful', playful: 'playful' });
function delightAllowed(m, st, prefs, now) {
  prefs = prefs || {}; st = st || {};
  const lv = DL_LEVELS[prefs.level] || 'standard';
  const still = lv === 'off' || lv === 'reduced';
  if (st.bulk) return { ok: false, level: 0, why: 'bulk' };
  let level = m.level, why = '';
  if (level < 3) {
    if (still) return { ok: false, level: 0, why: 'motion ' + lv };
    if (((st.lastHour && st.lastHour[m.id]) || 0) >= 3) return { ok: true, level: 0, why: 'habituation: 3 an hour' };
  } else {
    const rare = m.id === 'done.submission' || m.id === 'done.milestone';
    if (st.lastL3 && now - st.lastL3 < 10 * 60000) { level = 2; why = 'L3 cool-down: plays as a flourish'; }
    else if ((st.l3Today || 0) >= 3) { level = 1; why = 'daily cap: plays as a pop'; }
    else if (!rare && lv !== 'playful' && st.playedToday && st.playedToday[m.id]) { level = 1; why = 'once a day: plays as a pop'; }
    if (level === 3) {
      if (still) return { ok: true, level: 3, still: true, why: 'a card carries information: shown still' };
      if (lv === 'subtle') return { ok: true, level: 3, quiet: true, why: 'subtle: the card rises, no particles or actors' };
      return lv === 'playful' ? { ok: true, level: 3, extra: true, why: 'playful: plus the tilt-in and a second wave' } : { ok: true, level: 3 };
    }
    if (still) return { ok: false, level: 0, why: why + ' (motion ' + lv + ')' };
  }
  if (lv === 'subtle' && level > 1) return { ok: true, level: 1, why: (why ? why + '; ' : '') + 'subtle: at most a pop' };
  return why ? { ok: true, level, why } : { ok: true, level };
}
/** Everything the page needs: the moment, its variant, level and duration. */
function delightFor(item, ctx, recent, seed) {
  const id = delightFamily(item, ctx);
  if (!id) return null;
  if (id === 'done.generic') return { moment: id, variant: null, level: 1, dur: 1600, fx: null };
  const m = DL_MOMENT_BY.get(id);
  return { moment: id, variant: delightPick(id, recent, seed), level: m.level, dur: m.dur, fx: m.fx };
}

/** Markup for a celebration or arrival scene (trusted: constants only). */
function delightSceneHtml(key, o) {
  o = o || {};
  const art = DL_ART[key] || DL_ARRIVE_BY.get(key) || DL_MOTIFS[key];
  if (!art) return '';
  const arrive = art.arrive || o.arrive;
  const cls = ['anim-scene', 'c-' + art.colour, 'sz-' + (o.size || 'md'), 'is-live'];
  if (arrive) cls.push('has-arrive');
  if (o.cls) cls.push(o.cls);
  return `<span class="${cls.join(' ')}" data-scene="${key}"${arrive ? ` style="--arrive:${arrive}ms"` : ''} aria-hidden="true"><svg class="as as-${key}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${art.svg()}</svg></span>`;
}

return Object.freeze({ DL_LEVELS, DL_ART, DL_ARRIVE, DL_ARRIVE_BY, DL_MOTIFS, DL_MOMENTS, DL_MOMENT_BY, DL_PRECEDENCE, DL_STREAK_STEPS, DL_PARTICLES, delightFxHtml, delightFamily, delightPick, delightAllowed, delightFor, delightSceneHtml });
})();
