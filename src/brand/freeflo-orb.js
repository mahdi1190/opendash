/* ============================================================
   FREEFLO ORB (src/brand/freeflo-orb.js). Owner: Shell / Brand.
   The logo: the name written in one monoline stroke, its last o a glass orb of
   moving liquid. The season colours the orb (four palettes), and on a holiday the
   orb turns into the holiday (a jack-o'-lantern, a snow globe, a lantern ...).

   A PLAIN classic script, no dependencies. build.mjs inlines it in its own
   <script> in front of the opening animation (src/body.html, <!--@freeflo-orb-->),
   because the opening picks its orb at parse time, before the app's own scripts run.
   In Node (tools/release-brand.mjs) it is run in a vm context and read from
   globalThis.FreefloBrand. All motion is CSS inside the SVG, so the same markup works
   inline, as an <img> and as a data: URL; there is no per-frame script.

     FreefloBrand.current(o)    what to show now: { id, kind, label, pal } (date, hemisphere, birthday, the saved choice)
     FreefloBrand.orb(o)        the orb alone as an <svg> string (sidebar, welcome)
     FreefloBrand.lockup(o)     the name with the orb as its last o, as an <svg> string (the opening)
     FreefloBrand.favicon(o)    the static orb as a data: URL (the tab icon)
     FreefloBrand.VARIANTS      id -> { label, kind, pal }   (the gallery, Settings)
   Options (all optional): id (force a variant), name (the word, default NAME), intro ('pop'|'drop'|''), mono (one colour), color (the letters),
   speed (intro length multiplier; 0.6 = quicker), static (no motion at all), size (px), cls, day, mode, south, birthday.
   The saved choice is localStorage 'freeflo-logo': auto (default) | seasons | classic | a variant id.
   ============================================================ */
(function (root) {
  'use strict';
  var NAME = 'Freeflo';           // the one place the spelling of the name lives for the artwork
  var ORB_D = 78;                 // the orb's outer diameter in wordmark units (the letters are 100 tall)
  var SW = 12, GAP = 7;           // wordmark stroke width and letter gap
  var uid = 0;
  var f = function (n) { return +(+n).toFixed(2); };

  /* ---------- palettes: [from, mid, to] on the ring and the liquid ---------- */
  var SEASON = {
    spring: ['#35d28a', '#2cb8dc', '#ff8fc1'],
    summer: ['#ffb000', '#ff7a1a', '#ff3d68'],
    autumn: ['#ffb02e', '#e8642c', '#b0364f'],
    winter: ['#7fc8ff', '#5a7bff', '#8b5cf6'],
    classic: ['#6f6cf0', '#a05af0', '#ff8a6b'],
  };

  /* ---------- the stylesheet, embedded in every animated svg ---------- */
  var CSS = [
    '.fo-orb,.fo-lock{overflow:visible}',
    '.fo-orb .a,.fo-lock .a{transform-box:fill-box;transform-origin:50% 50%}',
    '.fo-orb .tp,.fo-lock .tp{transform-box:fill-box;transform-origin:50% 0}',
    '.fo-orb .bt,.fo-lock .bt{transform-box:fill-box;transform-origin:50% 100%}',
    /* idle motion (always on unless the svg is .fo-still) */
    '.fo-w{animation:fo-wv var(--wd,5s) linear infinite}.fo-w.r{animation-direction:reverse}',
    '.fo-sl{transform-origin:32px 40px;animation:fo-sl 5.5s ease-in-out infinite alternate}',
    '.fo-b{animation:fo-bub var(--t,3.6s) ease-in infinite;animation-delay:var(--d,0s)}',
    '.fo-fa{animation:fo-fall var(--t,4s) linear infinite;animation-delay:var(--d,0s)}',
    '.fo-tw{animation:fo-tw 2.4s ease-in-out infinite;animation-delay:var(--d,0s)}',
    '.fo-fl{animation:fo-fl 1.3s ease-in-out infinite;animation-delay:var(--d,0s)}',
    '.fo-gl{animation:fo-gl 2.2s ease-in-out infinite;animation-delay:var(--d,0s)}',
    '.fo-sw{animation:fo-sw 3.4s ease-in-out infinite alternate}',
    '.fo-bu{animation:fo-bu 3.6s ease-out infinite;animation-delay:var(--d,0s)}',
    '.fo-bt{animation:fo-bt 1.8s ease-in-out infinite;animation-delay:var(--d,0s)}',
    '.fo-sp{animation:fo-sp var(--t,16s) linear infinite}',
    '.fo-bo{animation:fo-bob 2.6s ease-in-out infinite alternate;animation-delay:var(--d,0s)}',
    '.fo-sc{animation:fo-sc var(--t,14s) linear infinite}',
    '.fo-bat{animation:fo-bat 8s linear infinite;animation-delay:var(--d,0s)}',
    '.fo-pt{animation:fo-pt var(--t,5s) ease-out infinite;animation-delay:var(--d,0s)}',
    '.fo-fp{animation:fo-flip 3.2s cubic-bezier(.45,0,.55,1) infinite}',
    '.fo-eg{animation:fo-egg 2.8s ease-in-out infinite}',
    '.fo-zz{animation:fo-zz 2.4s ease-in-out infinite alternate}',
    '@keyframes fo-wv{to{transform:translateX(calc(var(--wl) * -1px))}}',
    '@keyframes fo-sl{from{transform:rotate(-2.6deg)}to{transform:rotate(2.6deg)}}',
    '@keyframes fo-bub{0%{transform:translateY(0);opacity:0}15%{opacity:.85}100%{transform:translateY(-24px);opacity:0}}',
    '@keyframes fo-fall{0%{transform:translate(0,0);opacity:0}12%{opacity:.95}100%{transform:translate(var(--dx,0px),30px);opacity:0}}',
    '@keyframes fo-tw{0%,100%{transform:scale(.35);opacity:.25}50%{transform:scale(1);opacity:1}}',
    '@keyframes fo-fl{0%,100%{transform:scale(1,1)}25%{transform:scale(.93,1.09)}50%{transform:scale(1.05,.95)}75%{transform:scale(.97,1.05)}}',
    '@keyframes fo-gl{0%,100%{opacity:.65}50%{opacity:1}}',
    '@keyframes fo-sw{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}',
    '@keyframes fo-bu{0%{transform:scale(0);opacity:0}8%{opacity:1}55%{transform:scale(1);opacity:1}100%{transform:scale(1.2);opacity:0}}',
    '@keyframes fo-bt{0%,42%,100%{transform:scale(1)}14%{transform:scale(1.17)}28%{transform:scale(.97)}}',
    '@keyframes fo-sp{to{transform:rotate(360deg)}}',
    '@keyframes fo-bob{from{transform:translateY(-1.3px) rotate(-7deg)}to{transform:translateY(1.3px) rotate(7deg)}}',
    '@keyframes fo-sc{to{transform:translateX(-64px)}}',
    '@keyframes fo-bat{0%,62%{transform:translateX(-16px);opacity:0}64%{opacity:1}100%{transform:translateX(84px);opacity:1}}',
    '@keyframes fo-pt{0%{transform:translate(0,0) rotate(0);opacity:0}20%{opacity:.95}100%{transform:translate(var(--dx,4px),-22px) rotate(200deg);opacity:0}}',
    '@keyframes fo-flip{0%{transform:translateY(0) scaleY(1)}38%{transform:translateY(-21px) scaleY(-1)}68%,100%{transform:translateY(0) scaleY(-1)}}',
    '@keyframes fo-egg{0%,55%,100%{transform:translateY(0) scale(1,1)}12%{transform:translateY(1px) scale(1.07,.92)}30%{transform:translateY(-4px) scale(.97,1.04)}42%{transform:translateY(0) scale(1.05,.95)}}',
    '@keyframes fo-zz{from{transform:translateX(-4px)}to{transform:translateX(4px)}}',
    /* the opening (only when the svg has .fo-in) */
    '.fo-in .fo-pop{animation:fo-pop calc(520ms * var(--fo-s,1)) cubic-bezier(.3,1.45,.55,1) both}',
    '.fo-in .fo-dr{animation:fo-drop calc(860ms * var(--fo-s,1)) cubic-bezier(.45,0,.6,1) calc(var(--fo-d,0ms) * var(--fo-s,1)) both}',
    '.fo-in .fo-rise{animation:fo-rise calc(800ms * var(--fo-s,1)) cubic-bezier(.3,.8,.3,1) calc((var(--fo-d,0ms) + 300ms) * var(--fo-s,1)) both}',
    '.fo-in .fo-ls{stroke-dasharray:1 1;animation:fo-dw calc(var(--dur,420ms) * var(--fo-s,1)) cubic-bezier(.4,0,.2,1) calc(var(--dl,0ms) * var(--fo-s,1)) both}',
    '@keyframes fo-pop{from{opacity:0;transform:scale(.55) rotate(-10deg)}60%{opacity:1}}',
    '@keyframes fo-drop{0%{opacity:0;transform:translateY(-84px) scale(.88,1.16)}8%{opacity:1}56%{transform:translateY(0) scale(.9,1.12)}68%{transform:translateY(0) scale(1.16,.8)}84%{transform:translateY(0) scale(.96,1.05)}100%{transform:none}}',
    '@keyframes fo-rise{from{transform:translateY(32px)}}',
    '@keyframes fo-dw{0%{stroke-dashoffset:1;opacity:0}3%{opacity:1}100%{stroke-dashoffset:0;opacity:1}}',
    /* no motion: still, reduced */
    '.fo-still *{animation:none!important}',
    '@media (prefers-reduced-motion:reduce){.fo-orb *,.fo-lock *{animation:none!important}}',
  ].join('');

  /* ---------- small drawing helpers (all in the 64-unit orb box; the glass interior is r = 22.4 around 32,32) ---------- */
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function pts(n, x0, x1, y0, y1, s) { seed = s || 11; var o = []; for (var i = 0; i < n; i++) o.push([f(x0 + rnd() * (x1 - x0)), f(y0 + rnd() * (y1 - y0)), f(rnd() * 4)]); return o; }
  function disc(fill) { return '<circle cx="32" cy="32" r="23.5" fill="' + fill + '"/>'; }
  function lg(id, c0, c1, y0, y1) { return '<linearGradient id="' + id + '" x1="0" y1="' + (y0 === undefined ? 0 : y0) + '" x2="0" y2="' + (y1 === undefined ? 64 : y1) + '" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="' + c0 + '"/><stop offset="1" stop-color="' + c1 + '"/></linearGradient>'; }
  function rg(id, c0, c1, cx, cy, r) { return '<radialGradient id="' + id + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="' + c0 + '"/><stop offset="1" stop-color="' + c1 + '"/></radialGradient>'; }
  function star4(x, y, r, d, c) { return '<path class="a fo-tw" style="--d:' + d + 's" fill="' + (c || '#fff') + '" d="M' + x + ' ' + f(y - r) + 'L' + f(x + r * .3) + ' ' + f(y - r * .3) + ' ' + f(x + r) + ' ' + y + ' ' + f(x + r * .3) + ' ' + f(y + r * .3) + ' ' + x + ' ' + f(y + r) + ' ' + f(x - r * .3) + ' ' + f(y + r * .3) + ' ' + f(x - r) + ' ' + y + ' ' + f(x - r * .3) + ' ' + f(y - r * .3) + 'z"/>'; }
  function star5(x, y, R, r, rot) { var d = ''; for (var i = 0; i < 10; i++) { var a = (i * Math.PI / 5) - Math.PI / 2 + (rot || 0), q = i % 2 ? r : R; d += (i ? 'L' : 'M') + f(x + q * Math.cos(a)) + ' ' + f(y + q * Math.sin(a)); } return d + 'Z'; }
  function burst(x, y, r, n, d, c) { var s = ''; for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; s += '<path d="M' + f(x + Math.cos(a) * r * .38) + ' ' + f(y + Math.sin(a) * r * .38) + 'L' + f(x + Math.cos(a) * r) + ' ' + f(y + Math.sin(a) * r) + '"/>'; } return '<g class="a fo-bu" style="--d:' + d + 's" stroke="' + c + '" stroke-width="1.5" stroke-linecap="round" fill="none">' + s + '<circle cx="' + x + '" cy="' + y + '" r=".01"/></g>'; }
  function heart(x, y, s, c, cls, d) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><path class="a ' + (cls || '') + '" ' + (d !== undefined ? 'style="--d:' + d + 's" ' : '') + 'fill="' + c + '" d="M0 .9C-1.2-.1-1.1-1.1-.5-1.1C-.2-1.1 0-.8 0-.6C0-.8 .2-1.1 .5-1.1C1.1-1.1 1.2-.1 0 .9Z"/></g>'; }
  function bubbles(list, c, op) { return list.map(function (b) { return '<circle class="fo-b" cx="' + b[0] + '" cy="' + b[1] + '" r="' + f(.9 + b[2] * .35) + '" fill="' + c + '" opacity="' + (op || .8) + '" style="--d:' + b[2] + 's;--t:' + f(3 + b[2] * .5) + 's"/>'; }).join(''); }
  function flakes(list, c) { return list.map(function (b, i) { return '<circle class="fo-fa" cx="' + b[0] + '" cy="' + b[1] + '" r="' + (i % 3 ? 1 : 1.5) + '" fill="' + (c || '#fff') + '" style="--d:' + b[2] + 's;--t:' + f(3 + b[2] * .6) + 's;--dx:' + (i % 2 ? 3 : -3) + 'px"/>'; }).join(''); }
  /* a travelling wave filled down to the bottom: 3 wavelengths wide, so it can slide by exactly one */
  function wavePath(y, A, L) {
    var x0 = 4 - L, n = Math.ceil((60 + 2 * L) / (L / 2)) + 1;
    var d = 'M' + f(x0) + ' ' + f(y) + 'q' + f(L / 4) + ' ' + f(-2 * A) + ' ' + f(L / 2) + ' 0';
    for (var i = 1; i < n; i++) d += 't' + f(L / 2) + ' 0';
    return d + 'V72H' + f(x0) + 'Z';
  }
  function wave(y, A, L, dur, fill, op, rev) { return '<path class="fo-w' + (rev ? ' r' : '') + '" style="--wl:' + L + ';--wd:' + dur + 's" fill="' + fill + '"' + (op ? ' opacity="' + op + '"' : '') + ' d="' + wavePath(y, A, L) + '"/>'; }
  /* the liquid: two layers that slide the opposite ways, on a slow slosh, rising when the opening plays */
  function liquid(u, y, A) { A = A || 2.1; var fill = 'url(#fo' + u + 'r)'; return '<g class="fo-rise"><g class="fo-sl">' + wave(y - 1.3, A + .5, 27, 6.2, fill, .5) + wave(y, A, 21, 4.4, fill, 0, true) + '</g></g>'; }

  /* ---------- the scenes ---------- */
  /* each: function (u, P, id) -> { defs, body (inside the glass), over (outside, above the ring; stay inside the 64 box), shape ('egg'), noHl } */
  var SCENES = {};
  function seasonScene(season) {
    return function (u, P) {
      var x = '';
      if (season === 'spring') x = [[21, 46, 0, 4], [34, 49, 1.7, -3], [43, 44, 3.2, 5]].map(function (p) { return '<ellipse class="a fo-pt" cx="' + p[0] + '" cy="' + p[1] + '" rx="2.3" ry="1.3" fill="#ffd9ec" style="--d:' + p[2] + 's;--dx:' + p[3] + 'px"/>'; }).join('');
      else if (season === 'summer') x = bubbles([[24, 52, 0], [34, 54, 1.1], [42, 52, 2.2], [30, 56, 3.1]], '#fff', .75) + star4(21, 21, 4, 0, '#fff') + star4(45, 17, 2.6, 1.2, '#fff');
      else if (season === 'autumn') x = '<g transform="translate(35 33.5)"><g class="a fo-bo"><path fill="#ffd9a0" d="M-6 1.5C-5-4 1-6.5 6-4.5C5.5 1-.5 5.5-6 1.5Z"/><path d="M-6.5 2 L5 -3.5" stroke="#d9822b" stroke-width="1" fill="none" stroke-linecap="round"/></g></g>';
      else if (season === 'winter') x = flakes([[20, 12, 0], [29, 10, 1.2], [38, 13, 2.4], [46, 11, .7], [25, 16, 3.1], [42, 17, 1.9]]) + star4(45, 24, 3, .5, '#fff');
      return { defs: '', body: liquid(u, 37) + x };
    };
  }
  SCENES.spring = seasonScene('spring'); SCENES.summer = seasonScene('summer'); SCENES.autumn = seasonScene('autumn'); SCENES.winter = seasonScene('winter');
  SCENES.classic = function (u) { return { defs: '', body: liquid(u, 37) }; };

  SCENES.halloween = function (u) {
    return {
      defs: lg('fo' + u + 'a', '#ffa62b', '#e8590c', 14, 56) + rg('fo' + u + 'b', '#ffd24a', '#ffd24a', 32, 38, 18),
      body: disc('#27104a') + star4(14, 18, 2, .3, '#ffd24a') + star4(50, 14, 1.6, 1.5, '#ffd24a')
        + '<circle class="a fo-gl" cx="32" cy="38" r="19" fill="#ffb300" opacity=".3"/>'
        + '<path d="M32 17C22 13 9 21 10 37C11 50 22 56 32 56C42 56 53 50 54 37C55 21 42 13 32 17Z" fill="url(#fo' + u + 'a)"/>'
        + '<path d="M32 17C25 24 25 49 32 56M32 17C39 24 39 49 32 56M22 18.5C14.5 28 14.5 46 22 54M42 18.5C49.5 28 49.5 46 42 54" stroke="#b83c0a" stroke-width="1.5" fill="none" opacity=".5"/>'
        + '<g class="a fo-fl" fill="#ffe27a"><path d="M20 37L25.5 28.5L30.5 37Z"/><path d="M33.5 37L38.5 28.5L44 37Z"/><path d="M32 39L29.6 43.5L34.4 43.5Z"/><path d="M18.5 45L23 49.5L27 46L32 51.5L37 46L41 49.5L45.5 45Q32 56 18.5 45Z"/></g>'
        + '<g class="fo-bat" style="--d:2s"><path d="M0 12q-3-4-7-1.5 2 .8 2.4 3.2 2.2-1.6 4.6 0 2.4-1.6 4.6 0 .4-2.4 2.4-3.2-4-2.5-7 1.5z" fill="#0d0620"/></g>',
      over: '<path d="M31 20C30 13 32 8 38 6" stroke="#5f8a2c" stroke-width="4.6" stroke-linecap="round" fill="none"/>',
    };
  };

  SCENES.christmas = function (u) {
    return {
      defs: lg('fo' + u + 'a', '#1d3470', '#4d82cf', 10, 56),
      body: disc('url(#fo' + u + 'a)') + flakes(pts(12, 14, 50, 9, 30, 5))
        + '<path d="M6 49C17 42 28 43 34 46C42 50 50 45 60 43V66H6Z" fill="#f7fbff"/>'
        + '<g class="a fo-gl"><path d="M32 17l-8 11h5l-7 9h6l-8 11h24l-8-11h6l-7-9h5Z" fill="#2fa05d"/></g><rect x="30" y="47" width="4" height="5" fill="#7a4a21"/>'
        + '<circle cx="29" cy="31" r="1.5" fill="#ff5a5f"/><circle cx="36" cy="37" r="1.5" fill="#ffd36b"/><circle cx="28" cy="43" r="1.5" fill="#ff5a5f"/>'
        + '<path d="' + star5(32, 14.5, 4.6, 2, 0) + '" fill="#ffd36b" class="a fo-tw" style="--d:.2s"/>',
      over: '<path d="M13 54.5Q32 49.5 51 54.5L54.5 63Q32 67.5 9.5 63Z" fill="#c4262d"/><path d="M11.5 59.8Q32 64.3 52.5 59.8" stroke="#ffd36b" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
    };
  };

  SCENES['new-year'] = function (u) {
    return {
      defs: lg('fo' + u + 'a', '#12154a', '#2c3590', 8, 56),
      body: disc('url(#fo' + u + 'a)') + burst(23, 24, 12, 11, 0, '#ffcf4a') + burst(43, 21, 10, 9, 1.2, '#ff6fae') + burst(35, 39, 9, 9, 2.3, '#55d6ff')
        + bubbles([[22, 54, 0], [29, 56, .8], [36, 55, 1.6], [43, 57, 2.4], [26, 58, 3.2]], '#ffe07a', .85) + star4(14, 36, 2.4, .5, '#ffe07a') + star4(51, 40, 2, 1.4, '#fff'),
    };
  };

  SCENES.valentines = function (u) {
    return {
      defs: lg('fo' + u + 'a', '#fff6f9', '#ffd3e2', 8, 56),
      body: disc('url(#fo' + u + 'a)') + liquid(u, 41, 2)
        + '<g transform="translate(32 31) scale(13.5)"><g class="a fo-bt"><path fill="#ec2d6c" d="M0 .9C-1.2-.1-1.1-1.1-.5-1.1C-.2-1.1 0-.8 0-.6C0-.8 .2-1.1 .5-1.1C1.1-1.1 1.2-.1 0 .9Z"/><path d="M-.62-.5C-.5-.72-.28-.76-.12-.62" stroke="#fff" stroke-width=".13" fill="none" stroke-linecap="round" opacity=".85"/></g></g>'
        + heart(20, 52, 2.4, '#ffd0e0', 'fo-pt', 0) + heart(43, 54, 2, '#ffd0e0', 'fo-pt', 1.6) + heart(31, 57, 1.6, '#fff', 'fo-pt', 3),
    };
  };

  SCENES['lunar-new-year'] = function (u) {
    return {
      defs: rg('fo' + u + 'a', '#f0434f', '#a4141d', 32, 30, 28),
      body: disc('url(#fo' + u + 'a)') + '<circle class="a fo-gl" cx="32" cy="32" r="16" fill="#ffb347" opacity=".28"/>'
        + '<g fill="none" stroke="#ffd36b" stroke-width="1.4" opacity=".85"><ellipse cx="32" cy="32" rx="8.5" ry="22"/><ellipse cx="32" cy="32" rx="17" ry="22"/><path d="M32 8v48"/></g>'
        + '<circle cx="32" cy="32" r="7.4" fill="none" stroke="#ffd36b" stroke-width="2"/><rect x="29" y="29" width="6" height="6" fill="none" stroke="#ffd36b" stroke-width="1.6"/>'
        + '<rect x="19" y="8" width="26" height="6" rx="1.5" fill="#ffd36b"/><rect x="19" y="50" width="26" height="6" rx="1.5" fill="#ffd36b"/>',
      over: '<g class="tp fo-sw" style="transform-origin:32px 56px"><path d="M32 57V62" stroke="#ffd36b" stroke-width="1.6" stroke-linecap="round"/><path d="M29.5 62h5l1.2 2.4h-7.4z" fill="#e4262e"/></g>',
    };
  };

  SCENES.diwali = function (u) {
    return {
      defs: lg('fo' + u + 'a', '#2a0f55', '#6d1f93', 8, 56),
      body: disc('url(#fo' + u + 'a)') + '<circle class="a fo-gl" cx="32" cy="34" r="17" fill="#ffb703" opacity=".3"/>'
        + star4(16, 20, 3, 0, '#ffd36b') + star4(48, 18, 2.6, .9, '#ffd36b') + star4(51, 33, 2, 1.6, '#fff') + star4(14, 36, 1.8, 2.2, '#fff')
        + '<path d="M13 43H51Q49 56 32 57Q15 56 13 43Z" fill="#e0662c"/><ellipse cx="32" cy="43" rx="19" ry="3.6" fill="#ffb703"/><path d="M16 49.5Q32 54 48 49.5" stroke="#ffd36b" stroke-width="1.2" fill="none" opacity=".7"/>'
        + '<g class="a bt fo-fl"><path d="M32 22C39 30 40 37 32 43C24 37 25 30 32 22Z" fill="#ffd36b"/><path d="M32 31C35.5 35 35.5 39 32 42C28.5 39 28.5 35 32 31Z" fill="#fb5607"/></g>',
    };
  };

  SCENES.eid = function (u) {
    return {
      defs: lg('fo' + u + 'a', '#06263f', '#0e6b6e', 8, 56) + '<mask id="fo' + u + 'm"><rect width="64" height="64" fill="#fff"/><circle cx="38" cy="27" r="12.5" fill="#000"/></mask>',
      body: disc('url(#fo' + u + 'a)') + '<circle cx="31" cy="31" r="14" fill="#ffd36b" mask="url(#fo' + u + 'm)"/>'
        + '<path class="a fo-tw" style="--d:.3s" fill="#ffd36b" d="' + star5(43, 24, 5.6, 2.4, .2) + '"/>' + star4(20, 15, 2.2, .8, '#fff') + star4(46, 43, 2.4, 1.6, '#fff') + star4(18, 46, 1.8, 2.3, '#ffd36b')
        + '<path d="M9 54Q20 47 32 51Q44 47 55 54V64H9Z" fill="#052c3c"/><path d="M26 52V46q0-3 3-4 .8-1.6 2-2 1.2.4 2 2 3 1 3 4v6z" fill="#073645"/>',
    };
  };

  SCENES.easter = function (u) {
    return {
      shape: 'egg', noHl: true,
      defs: lg('fo' + u + 'a', '#fff1fb', '#e7dcff', 9, 56),
      body: '<path d="M32 3C46 3 56 24 56 38C56 51 46 60 32 60C18 60 8 51 8 38C8 24 18 3 32 3Z" fill="url(#fo' + u + 'a)"/><g class="a fo-eg">'
        + '<g class="a fo-zz"><path d="M2 26l6-5 6 5 6-5 6 5 6-5 6 5 6-5 6 5 6-5 6 5 6-5 6 5" stroke="#ff8fc9" stroke-width="5" fill="none"/><path d="M2 40l6-5 6 5 6-5 6 5 6-5 6 5 6-5 6 5 6-5 6 5 6-5 6 5" stroke="#4fd8b0" stroke-width="5" fill="none" opacity=".95"/></g>'
        + '<circle cx="22" cy="51" r="2.3" fill="#ffd84d"/><circle cx="32" cy="48" r="2.3" fill="#8f7bff"/><circle cx="42" cy="51" r="2.3" fill="#ffd84d"/><circle cx="26" cy="14" r="1.8" fill="#8f7bff"/><circle cx="38" cy="14" r="1.8" fill="#ffd84d"/></g>'
        + star4(47, 22, 3, .4, '#fff') + star4(17, 33, 2.2, 1.3, '#fff'),
      over: '',
    };
  };

  SCENES['pancake-day'] = function (u) {
    return {
      defs: lg('fo' + u + 'a', '#fff6dc', '#ffdca1', 8, 56),
      body: disc('url(#fo' + u + 'a)')
        + '<g fill="none" stroke="#d6a45c" stroke-width="1.6" stroke-linecap="round" opacity=".7"><path class="a fo-pt" style="--d:0s;--dx:2px" d="M25 40c-2-3 2-4 0-7"/><path class="a fo-pt" style="--d:1.4s;--dx:-2px" d="M38 41c-2-3 2-4 0-7"/></g>'
        + '<ellipse cx="32" cy="47" rx="22" ry="7" fill="#3a3a44"/><ellipse cx="32" cy="45.5" rx="19" ry="5.4" fill="#26262e"/>'
        + '<g class="a fo-fp"><ellipse cx="32" cy="43" rx="14.5" ry="4.4" fill="#d98a2b"/><ellipse cx="32" cy="42.2" rx="11" ry="2.8" fill="#f1b25a"/></g>'
        + '<g transform="translate(18 24)"><path class="a fo-tw" style="--d:.5s" fill="#ffd36b" d="M0-3L.9-.9 3 0 .9.9 0 3-.9.9-3 0-.9-.9Z"/></g>',
      over: '<rect x="49" y="45" width="14" height="4.4" rx="2.2" fill="#3a3a44" transform="rotate(14 49 47)"/>',
    };
  };

  SCENES['bonfire-night'] = function (u) {
    return {
      defs: lg('fo' + u + 'a', '#0a0e2e', '#20256a', 8, 56),
      body: disc('url(#fo' + u + 'a)') + burst(41, 20, 11, 12, 0, '#ff6fae') + burst(22, 24, 8, 9, 1.5, '#ffd36b') + star4(50, 38, 1.8, .6, '#fff') + star4(15, 38, 1.6, 1.4, '#fff')
        + '<rect x="12" y="47" width="40" height="6.4" rx="3.2" fill="#6a3d1c" transform="rotate(-9 32 50)"/><rect x="12" y="47" width="40" height="6.4" rx="3.2" fill="#85502a" transform="rotate(9 32 50)"/>'
        + '<g class="a bt fo-fl"><path d="M32 18C41 29 46 36 42 45C39 51 25 51 22 45C19 38 25 33 27 28C28 32 30 33 31 32C30 27 30 22 32 18Z" fill="#ff4d1a"/><path d="M32 28C38 35 40 40 37.5 45C35 49 29 49 27 45C25 41 29 37 32 28Z" fill="#ff9d2f"/><path d="M32 37C35 40 35.5 43 33.5 45.5C31.5 47 29.5 46 29.5 43.5C29.5 41 31 39.5 32 37Z" fill="#ffe27a"/></g>'
        + bubbles([[27, 40, 0], [37, 40, 1], [32, 38, 2], [41, 42, 2.8]], '#ffcf4a', .95),
    };
  };

  SCENES['st-patricks'] = function (u) {
    var leaf = function (rot) { return '<path transform="rotate(' + rot + ')" d="M0-1.2C-8-3-9-12.5-4.5-12.5C-1.6-12.5 0-10 0-8.4C0-10 1.6-12.5 4.5-12.5C9-12.5 8-3 0-1.2Z" fill="#37e07f"/>'; };
    return {
      defs: lg('fo' + u + 'a', '#08502c', '#15935a', 8, 56),
      body: disc('url(#fo' + u + 'a)') + '<path d="M32 33Q30 44 36 52" stroke="#d9a520" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
        + '<g transform="translate(32 28) scale(1.18)"><g class="a fo-sp" style="--t:18s">' + leaf(0) + leaf(90) + leaf(180) + leaf(270) + '<circle r="1.4" fill="#d9ffe9"/></g></g>'
        + star4(15, 20, 2.4, 0, '#ffd36b') + star4(49, 17, 2.8, .8, '#ffd36b') + star4(47, 46, 2, 1.7, '#fff') + star4(17, 44, 1.8, 2.4, '#fff')
        + '<circle cx="46" cy="49" r="3.4" fill="#ffd36b" stroke="#c99a1d" stroke-width="1"/><circle cx="40" cy="52.5" r="3" fill="#ffd36b" stroke="#c99a1d" stroke-width="1"/>',
    };
  };

  SCENES['earth-day'] = function (u) {
    var land = '<path fill="#45c56f" d="M4 22C8 14 18 14 22 20C26 26 20 34 14 34C8 34 2 30 4 22Z"/><path fill="#2fa059" d="M34 34C40 30 50 32 52 40C54 48 46 54 40 50C34 46 30 40 34 34Z"/><path fill="#45c56f" d="M44 12C50 10 58 14 56 20C54 24 46 22 44 12Z"/>';
    return {
      defs: lg('fo' + u + 'a', '#2d93ff', '#0c4bb0', 8, 56) + rg('fo' + u + 'b', 'rgba(0,12,50,0)', 'rgba(0,12,50,.55)', 32, 32, 23.5).replace('<stop offset="0"', '<stop offset=".55"') + rg('fo' + u + 'c', '#fff', 'rgba(255,255,255,0)', 22, 20, 14),
      body: disc('url(#fo' + u + 'a)') + '<g class="fo-sc" style="--t:16s"><g>' + land + '</g><g transform="translate(64 0)">' + land + '</g></g>'
        + '<g class="fo-sc" style="--t:11s" fill="#fff" opacity=".6"><ellipse cx="18" cy="42" rx="9" ry="2"/><ellipse cx="50" cy="26" rx="8" ry="1.8"/><g transform="translate(64 0)"><ellipse cx="18" cy="42" rx="9" ry="2"/><ellipse cx="50" cy="26" rx="8" ry="1.8"/></g></g>'
        + disc('url(#fo' + u + 'b)') + '<circle cx="22" cy="20" r="14" fill="url(#fo' + u + 'c)" opacity=".35"/>',
    };
  };

  SCENES.pride = function () {
    var cols = ['#e40303', '#ff8c00', '#ffed00', '#008026', '#2f6bff', '#8b2fc9'], s = '';
    cols.forEach(function (c, i) { s += wave(16 + i * 6.7, 1.7, 22 + (i % 3) * 5, 4 + i * .7, c, 0, i % 2); });
    return { defs: '', body: '<g class="fo-sl">' + s + '</g>' };
  };

  SCENES.birthday = function (u) {
    var conf = pts(9, 12, 52, 9, 24, 3).map(function (p, i) { return '<rect class="a fo-fa" x="' + p[0] + '" y="' + p[1] + '" width="2.6" height="1.6" rx=".5" fill="' + ['#ff6fae', '#ffd36b', '#5ad0ff', '#8f7bff', '#4fd8b0'][i % 5] + '" style="--d:' + p[2] + 's;--t:' + f(3.4 + p[2] * .3) + 's;--dx:' + (i % 2 ? 4 : -4) + 'px"/>'; }).join('');
    return {
      defs: lg('fo' + u + 'a', '#ffe0f1', '#cfe2ff', 8, 56),
      body: disc('url(#fo' + u + 'a)') + conf + '<ellipse cx="32" cy="53" rx="22" ry="3.8" fill="#fff" opacity=".9"/>'
        + '<rect x="15" y="39" width="34" height="14" rx="3.4" fill="#7b4a2a"/><path d="M15 43.5q4 4 8 0t8 0 8 0 8 0 3 0V39H15z" fill="#ffb6d9"/>'
        + '<rect x="21" y="29" width="22" height="10.4" rx="3" fill="#ffa0cf"/><path d="M21 32.6q3.7 3.6 7.3 0t7.3 0 7.4 0V29H21z" fill="#fff"/>'
        + '<rect x="30.4" y="20" width="3.2" height="9" rx="1" fill="#5ad0ff"/><path d="M30.4 23l3.2 1.6M30.4 26.5l3.2 1.6" stroke="#fff" stroke-width=".9"/>'
        + '<g class="a bt fo-fl"><path d="M32 12.4C35 16 35.5 18.6 32 20.4C28.5 18.6 29 16 32 12.4Z" fill="#ffd36b"/><path d="M32 15.6C33.6 17.4 33.6 18.8 32 19.8C30.4 18.8 30.4 17.4 32 15.6Z" fill="#ff7a3d"/></g>',
    };
  };

  SCENES['summer-solstice'] = function (u) {
    var rays = ''; for (var i = 0; i < 12; i++) { var a = i * Math.PI / 6; rays += '<path d="M' + f(32 + 13.5 * Math.cos(a)) + ' ' + f(32 + 13.5 * Math.sin(a)) + 'L' + f(32 + 21 * Math.cos(a)) + ' ' + f(32 + 21 * Math.sin(a)) + '"/>'; }
    return {
      defs: rg('fo' + u + 'a', '#ffe98a', '#ff9a33', 32, 32, 26) + lg('fo' + u + 'b', '#fffbe0', '#ffc233', 20, 44),
      body: disc('url(#fo' + u + 'a)') + '<g class="a fo-sp" style="--t:30s" stroke="#fff3b0" stroke-width="2.6" stroke-linecap="round">' + rays + '</g><circle cx="32" cy="32" r="10.5" fill="url(#fo' + u + 'b)"/>' + star4(17, 19, 3, 0, '#fff') + star4(48, 46, 2.6, 1.1, '#fff'),
    };
  };

  SCENES['winter-solstice'] = function (u) {
    return {
      defs: lg('fo' + u + 'a', '#080c2e', '#222d78', 8, 56) + '<mask id="fo' + u + 'm"><rect width="64" height="64" fill="#fff"/><circle cx="43" cy="19" r="8" fill="#000"/></mask>',
      body: disc('url(#fo' + u + 'a)') + [[16, 18, 0, 2.6], [26, 12, .7, 1.8], [22, 28, 1.4, 2], [48, 34, 2, 2.4], [38, 44, .4, 1.6], [14, 42, 1.8, 1.8], [30, 38, 2.6, 1.4]].map(function (s) { return star4(s[0], s[1], s[3], s[2], '#fff'); }).join('')
        + '<circle cx="38" cy="22" r="8.5" fill="#ffe9a8" mask="url(#fo' + u + 'm)"/>'
        + '<g class="fo-bat" style="--d:1s"><path d="M0 14l9-3" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".9"/></g>'
        + '<path d="M8 56L18 44 25 50 34 40 44 51 56 46V64H8Z" fill="#0c1240"/><path d="M34 40l3 3.4-3 1-3-1zM18 44l2.4 2.6-2.4.8-2.4-.8z" fill="#dfeaff"/>',
    };
  };

  /* ---------- variants ---------- */
  var V = {};
  function def(id, label, kind, pal) { V[id] = { id: id, label: label, kind: kind, pal: pal, scene: SCENES[id] }; }
  ['spring', 'summer', 'autumn', 'winter'].forEach(function (s) { def(s, s.charAt(0).toUpperCase() + s.slice(1), 'season', SEASON[s]); });
  def('classic', 'Classic', 'classic', SEASON.classic);
  def('halloween', 'Halloween', 'holiday', ['#ffa31a', '#ff6a00', '#7b2ff7']);
  def('christmas', 'Christmas', 'holiday', ['#e5484d', '#f0a24a', '#ffd36b']);
  def('new-year', 'New Year', 'holiday', ['#ffcf4a', '#ff6fae', '#55d6ff']);
  def('valentines', 'Valentine\'s Day', 'holiday', ['#ff8fb4', '#ff3d7f', '#c9184a']);
  def('lunar-new-year', 'Lunar New Year', 'holiday', ['#ffd36b', '#ff8a3d', '#e4262e']);
  def('diwali', 'Diwali', 'holiday', ['#ffd36b', '#fb5607', '#8338ec']);
  def('eid', 'Eid', 'holiday', ['#ffd36b', '#2dd4bf', '#0ea5a4']);
  def('easter', 'Easter', 'holiday', ['#ff9ad5', '#b79cff', '#5de0b8']);
  def('pancake-day', 'Pancake Day', 'holiday', ['#ffcf6e', '#f59e0b', '#b45309']);
  def('bonfire-night', 'Bonfire Night', 'holiday', ['#ffcf4a', '#ff5a1f', '#c1121f']);
  def('st-patricks', 'St Patrick\'s Day', 'holiday', ['#35c26b', '#12a15a', '#ffd36b']);
  def('earth-day', 'Earth Day', 'holiday', ['#34d399', '#38bdf8', '#2f80ed']);
  def('pride', 'Pride', 'holiday', ['#ff4d6d', '#ffd400', '#3b82f6']);
  def('birthday', 'Birthday', 'holiday', ['#ff7eb6', '#ffd36b', '#7c5cff']);
  def('summer-solstice', 'Summer solstice', 'holiday', ['#ffd54a', '#ff9a2f', '#ff5f3f']);
  def('winter-solstice', 'Winter solstice', 'holiday', ['#8fb4ff', '#5a6bff', '#9b6bff']);

  /* ---------- which one is it today ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayStr() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dnum(day) { var p = String(day).split('-'); return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000); }
  function dstr(n) { var d = new Date(n * 86400000); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function easter(y) {   // the Western Easter Sunday (Meeus / Jones / Butcher)
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, g = Math.floor((8 * b + 13) / 25), h = (19 * a + b - d - g + 15) % 30,
      i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
    return y + '-' + pad(mo) + '-' + pad(da);
  }
  /* the festivals that follow the moon: the same compact table as the almanac (src/app/71-anim-almanac.js ALM_MOVING) */
  var MOVING = {
    'lunar-new-year': ['2025-01-29', '2026-02-17', '2027-02-06', '2028-01-26', '2029-02-13', '2030-02-03', '2031-01-23'],
    diwali: ['2025-10-20', '2026-11-08', '2027-10-29', '2028-10-17', '2029-11-05', '2030-10-26', '2031-11-14'],
    eid: ['2025-03-30', '2025-06-06', '2026-03-20', '2026-05-27', '2027-03-10', '2027-05-16', '2028-02-27', '2028-05-05', '2029-02-14', '2029-04-24', '2030-02-04', '2030-04-13', '2031-01-24', '2031-04-02'],
  };
  function near(list, n, before, after) { for (var i = 0; i < list.length; i++) { var d = n - dnum(list[i]); if (d >= -before && d <= after) return true; } return false; }
  function southern() {
    try {
      var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || '';
      return /^(Australia|Antarctica)\//.test(tz) || /^Pacific\/(Auckland|Fiji|Chatham|Tongatapu|Apia)/.test(tz) || /^America\/(Sao_Paulo|Argentina|Buenos_Aires|Santiago|Montevideo|Asuncion|La_Paz|Lima|Bahia|Recife|Fortaleza|Cuiaba|Manaus)/.test(tz) || /^Africa\/(Johannesburg|Maputo|Harare|Windhoek|Lusaka|Gaborone|Maseru|Mbabane|Blantyre|Luanda|Lubumbashi)/.test(tz) || /^Indian\/(Mauritius|Reunion|Antananarivo)/.test(tz);
    } catch (e) { return false; }
  }
  function seasonOf(day, south) {
    var m = +String(day).slice(5, 7), s = m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
    if (!south) return s;
    return { spring: 'autumn', summer: 'winter', autumn: 'spring', winter: 'summer' }[s];
  }
  /** The holiday id whose window holds the day, or ''. Windows are a few days wide so the logo is not a one-day surprise. */
  function holidayOf(day, o) {
    o = o || {};
    var y = +day.slice(0, 4), md = day.slice(5), n = dnum(day), m = +day.slice(5, 7), d = +day.slice(8, 10);
    if (o.birthday && String(o.birthday).slice(-5) === md) return 'birthday';
    if (near(MOVING.diwali, n, 2, 2)) return 'diwali';
    if (near(MOVING['lunar-new-year'], n, 2, 6)) return 'lunar-new-year';
    if (near(MOVING.eid, n, 0, 2)) return 'eid';
    var e = dnum(easter(y));
    if (n >= e - 2 && n <= e + 1) return 'easter';
    if (n === e - 47) return 'pancake-day';
    if (m === 10 && d >= 24) return 'halloween';
    if (m === 11 && d >= 3 && d <= 5) return 'bonfire-night';
    if ((m === 12 && d >= 20 && d <= 26)) return 'christmas';
    if ((m === 12 && d >= 29) || (m === 1 && d <= 2)) return 'new-year';
    if (m === 2 && d >= 10 && d <= 14) return 'valentines';
    if (m === 3 && d >= 15 && d <= 17) return 'st-patricks';
    if (m === 4 && d === 22) return 'earth-day';
    if (m === 6 && d >= 20 && d <= 22) return o.south ? 'winter-solstice' : 'summer-solstice';
    if (m === 6) return 'pride';
    return '';
  }
  function saved() {
    var v = 'auto';
    try { v = localStorage.getItem('freeflo-logo') || 'auto'; } catch (e) { /* storage blocked */ }
    try { var q = /[?&#]logo=([\w-]+)/.exec(location.href); if (q) v = q[1]; } catch (e) { /* no location */ }
    return v;
  }
  function configBirthday() {
    try { var el = document.getElementById('dashboard-config'); var c = el ? JSON.parse(el.textContent || '{}') : {}; return c.birthday || null; } catch (e) { return null; }
  }
  function current(o) {
    o = o || {};
    var mode = o.mode || saved(), day = o.day || todayStr(), south = o.south !== undefined ? o.south : southern();
    var id = '';
    if (o.id && V[o.id]) id = o.id;
    else if (V[mode]) id = mode;                                              // a pinned variant (preview, or the user's pick)
    else if (mode === 'classic') id = 'classic';
    else {
      var h = mode === 'seasons' ? '' : holidayOf(day, { birthday: o.birthday !== undefined ? o.birthday : configBirthday(), south: south });
      id = h || seasonOf(day, south);
    }
    return V[id];
  }

  /* ---------- assembling an orb ---------- */
  var EGG_RING = 'M32 6C45 6 54 25 54 38C54 50 45 58 32 58C19 58 10 50 10 38C10 25 19 6 32 6Z';
  var EGG_CLIP = 'M32 9C43.5 9 51 26 51 38C51 48.5 43 55 32 55C21 55 13 48.5 13 38C13 26 20.5 9 32 9Z';
  function parts(v, o) {
    var u = (++uid).toString(36), P = o.pal || v.pal, sc = v.scene(u, P, v.id), egg = sc.shape === 'egg';
    var defs = '<linearGradient id="fo' + u + 'r" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="' + P[0] + '"/><stop offset=".55" stop-color="' + P[1] + '"/><stop offset="1" stop-color="' + P[2] + '"/></linearGradient>'
      + '<clipPath id="fo' + u + 'c">' + (egg ? '<path d="' + EGG_CLIP + '"/>' : '<circle cx="32" cy="32" r="22.4"/>') + '</clipPath>' + (sc.defs || '');
    var ring = egg ? '<path d="' + EGG_RING + '" fill="none" stroke="url(#fo' + u + 'r)" stroke-width="3.6" stroke-linejoin="round"/>' : '<circle cx="32" cy="32" r="26" fill="none" stroke="url(#fo' + u + 'r)" stroke-width="3.6"/>';
    var hl = sc.noHl ? '<path d="M17 30C18 22 22 15 27 11.5" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2.4" stroke-linecap="round"/>' : '<path d="M15.5 25.5A17.5 17.5 0 0 1 26 15" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2.4" stroke-linecap="round"/>';
    var body = '<g clip-path="url(#fo' + u + 'c)">' + sc.body + '</g>' + ring + hl + (sc.over || '');
    if (o.mono) body = body.split('url(#fo' + u + 'r)').join(o.mono);   // one colour (the printable logo)
    return { defs: defs, body: body };
  }
  function style(o) { return o.static ? '' : '<style>' + CSS + '</style>'; }
  function vars(o) { return '--fo-s:' + (o.speed || 1) + (o.delay ? ';--fo-d:' + o.delay + 'ms' : '') + (o.color ? ';color:' + o.color : ''); }
  function labelOf(v) { return NAME + (v.kind === 'holiday' ? ' · ' + v.label : ''); }

  /** The orb alone as an <svg> string. */
  function orb(o) {
    o = o || {}; var v = current(o), p = parts(v, o), px = o.size ? ' width="' + o.size + '" height="' + o.size + '"' : '';
    return '<svg class="fo-orb' + (o.static ? ' fo-still' : '') + (o.intro ? ' fo-in' : '') + (o.cls ? ' ' + o.cls : '') + '" data-fo="' + v.id + '" viewBox="0 0 64 64"' + px + ' role="img" aria-label="' + labelOf(v) + '" style="' + vars(o) + '">'
      + style(o) + '<defs>' + p.defs + '</defs><g class="a ' + (o.intro ? 'fo-pop' : '') + '">' + p.body + '</g></svg>';
  }

  /* the wordmark: monoline letters on a y = 0 (ascender) .. 100 (baseline) scale; the orb takes the place of the last o */
  var GL = {
    F: { w: 52, p: ['M11 94.5V18Q11 5.5 24 5.5H46', 'M11 48H38'] },
    f: { w: 46, p: ['M19 94.5V28Q19 5.5 41 5.5', 'M5.5 40.5H35'] },
    r: { w: 38, p: ['M11 40.5V94.5', 'M11 68C11 50 20 40.5 33 40.5'] },
    e: { w: 66, p: ['M5.5 67.5H59.5A27 27 0 1 0 52.6 85.6'] },
    l: { w: 38, p: ['M11 5.5V80Q11 94.5 27 94.5'] },
    o: { w: 66, p: ['M32.5 40.5A27 27 0 1 1 32.5 94.5A27 27 0 1 1 32.5 40.5'] },
    w: { w: 82, p: ['M5.5 40.5L24 94.5L41 52L58 94.5L76.5 40.5'] },
  };
  /** The name as an <svg> string with the orb as its last o. o.name overrides the spelling. */
  function lockup(o) {
    o = o || {}; var v = current(o), p = parts(v, o), chars = (o.name || NAME).split(''), x = 0, idx = 0, body = '', orbX = 0, drop = 0;
    var slot = chars.lastIndexOf('o'), d0 = 100;
    chars.forEach(function (ch, n) {
      var g = GL[ch]; if (!g) return;
      if (n === slot) { orbX = x + ORB_D / 2; drop = d0 + idx * 60 + 60; x += ORB_D + GAP; idx++; return; }
      g.p.forEach(function (d, j) { body += '<path class="fo-ls" pathLength="1" d="' + d + '" transform="translate(' + x + ' 0)" style="--dur:' + (j ? 300 : 420) + 'ms;--dl:' + (d0 + idx * 60 + j * 110) + 'ms"/>'; });
      x += g.w + GAP; idx++;
    });
    var W = x - GAP, sc = ORB_D / 55.6, cy = 100.5 - ORB_D / 2;
    var o2 = Object.assign({}, o, { delay: drop });
    var orbG = slot < 0 ? '' : '<g class="a ' + (o.intro ? 'fo-dr' : '') + '"><g transform="translate(' + f(orbX) + ' ' + f(cy) + ') scale(' + f(sc) + ') translate(-32 -32)">' + p.body + '</g></g>';
    var h = o.size ? ' height="' + o.size + '" width="' + f(o.size * W / 100) + '"' : '';
    return '<svg class="fo-lock' + (o.static ? ' fo-still' : '') + (o.intro ? ' fo-in' : '') + (o.cls ? ' ' + o.cls : '') + '" data-fo="' + v.id + '" viewBox="0 0 ' + f(W) + ' 100"' + h + ' role="img" aria-label="' + (o.name || NAME) + '" style="' + vars(o2) + '">'
      + style(o) + '<defs>' + p.defs + '</defs><g fill="none" stroke="currentColor" stroke-width="' + SW + '" stroke-linecap="round" stroke-linejoin="round">' + body + '</g>' + orbG + '</svg>';
  }

  /** The static orb as a data: URL (a tab icon, an <img>). */
  function favicon(o) {
    o = Object.assign({}, o || {}, { static: true });
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(orb(o).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
  }

  var API = { NAME: NAME, ORB_D: ORB_D, VARIANTS: V, SEASONS: SEASON, current: current, orb: orb, lockup: lockup, favicon: favicon, seasonOf: seasonOf, holidayOf: holidayOf, southern: southern, easter: easter, today: todayStr, saved: saved };
  root.FreefloBrand = API;
})(typeof window !== 'undefined' ? window : globalThis);
