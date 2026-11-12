/* Painted rooms, the game pieces: every room game's things (jars, hulls,
 * ropes, hay, the mill wheel, bellows, wicks, mirrors, the map, the tea
 * things...) painted in the rooms' own hand when the Painted village style is
 * on. Each body is a small canvas painting made once with the room painter's
 * kit (94-garden-native-roomart-0kit.js) and kept as a texture; the spot's
 * art then places it with <image>, keeping every class the games move
 * (.grm-turn, .grm-needle, .grm-pot, .grm-block ...), so the rules in
 * 94-garden-world-4rooms*.js run unchanged. Only presentation lives here.
 * art(s, q) returns the painted art for a spot, or null for the flat one. */
window.GardenRoomPieces = (function () {
  'use strict';
  const K = 2;
  let sceneNow = null;
  const n1 = v => Math.round(v * 10) / 10;
  /** A painted body as an <image>: box (x0, y0, w, h) in the spot's own units. */
  // Paintings not made yet wait in a queue, one to a task between frames, so
  // walking in never pays for them at once; the spot shows when all of its own are ready.
  const queue = new Map(); let pending = 0, pumping = false;
  const stats = { bakes: [], paints: [] };
  function bake(scene, name, job) {
    if (scene.textures.exists(name)) return;
    const t0 = performance.now();
    const c = document.createElement('canvas'); c.width = Math.ceil(job.w * K); c.height = Math.ceil(job.h * K);
    const cx = c.getContext('2d', { willReadFrequently: true }); cx.setTransform(K, 0, 0, K, -job.x0 * K, -job.y0 * K);
    try { job.paint(GardenRoomArt.kit(cx, 'piece|' + name), cx); cx.getImageData(0, 0, 1, 1); } catch (e) { console.error('[room pieces]', name, e); }   // (reading a pixel makes the canvas pay for its drawing now, not at upload)
    scene.textures.addCanvas(name, c);
    if (job.after) job.after(scene);
    stats.bakes.push([name.slice(8), Math.round(performance.now() - t0)]); if (stats.bakes.length > 60) stats.bakes.shift();
  }
  function pump() {
    const s = window.GardenNativeRooms && GardenNativeRooms.current(), scene = s && s.context.scene;
    if (!scene || !queue.size) { pumping = false; queue.clear(); return; }
    const [name, job] = queue.entries().next().value; queue.delete(name); bake(scene, name, job);
    if (queue.size) setTimeout(pump, 0); else { pumping = false; const t0 = performance.now(); GardenNativeRooms.paint(); stats.paints.push(Math.round(performance.now() - t0)); if (stats.paints.length > 30) stats.paints.shift(); }
  }
  function img(key, x0, y0, w, h, paint, extra, after) {
    const name = 'gdpiece-' + key;
    if (sceneNow && !sceneNow.textures.exists(name)) {
      pending++; if (!queue.has(name)) queue.set(name, { x0, y0, w, h, paint, after });
      if (!pumping) { pumping = true; setTimeout(pump, 0); }
    }
    return `<image href="${name}" x="${n1(x0)}" y="${n1(y0)}" width="${n1(w)}" height="${n1(h)}"${extra || ''}/>`;
  }
  const at = (x, y, s, extra) => `<g transform="translate(${n1(x)} ${n1(y)})"${extra || ''}>${s}</g>`;
  const glowDot = (x, y, r, c, o) => `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" fill="${c}" opacity="${o}"/>`;
  /** soft light: three rings of falling opacity read as a glow without a gradient */
  const halo = (x, y, r, c, o) => glowDot(x, y, r, c, (o * .25).toFixed(3)) + glowDot(x, y, r * .66, c, (o * .35).toFixed(3)) + glowDot(x, y, r * .36, c, (o * .5).toFixed(3));
  function save(cx, fn) { cx.save(); try { fn(); } finally { cx.restore(); } }

  /* ---------- small shared painters ---------- */
  function plank(T, x, y, w, h, base, vertical) {
    T.rect(x, y, w, h, T.lin(x, y, vertical ? x + w : x, vertical ? y : y + h, [[0, T.shade(base, .16)], [.5, base], [1, T.shade(base, -.28)]]));
    T.grain(x, y, w, h, T.shade(base, -.45), .35, vertical, 3.5);
    T.rect(x, y, vertical ? 1.5 : w, vertical ? h : 1.5, T.shade(base, .3), .55);
  }
  function brass(T, x, y, w, h, rr) { T.rrect(x, y, w, h, rr || 2, T.lin(x, y, x + w, y + h, [[0, '#f4d88a'], [.35, '#c8963e'], [.7, '#8a5e22'], [1, '#d8a85a']])); T.rrect(x + w * .15, y + 1, w * .25, h - 2, rr || 2, '#fff4c8', .35); }
  function rope(T, d, w) { T.stroke(d, '#6a5434', w + 1.6, .9); T.stroke(d, '#c8b088', w, 1); T.cx.setLineDash([2.4, 3.2]); T.stroke(d, '#8a7048', w * .5, .8); T.cx.setLineDash([]); T.stroke(d, '#f0e2c0', w * .25, .5); }
  function flameP(T, x, y, k) { T.glow(x, y - 10 * k, 36 * k, '#ffb050', .55); T.flame(x, y, k); }

  /* ---------- the drowned cellar: jars ---------- */
  const JAR = 'M-16 -40Q-17 -46 -12 -47H12Q17 -46 16 -40V-6Q16 0 10 0H-10Q-16 0 -16 -6Z';
  const JAR_IN = [
    T => { T.rect(-17, -24, 34, 24, T.lin(0, -24, 0, 0, [[0, '#c8d86a', .35], [1, '#7a8a2a', .7]])); for (const [x, y, r] of [[-5, -13, .2], [5, -22, -.3], [-3, -31, .1]]) { T.ell(x, y, 5.2, 9, T.lin(x - 5, 0, x + 5, 0, [[0, '#4a6a1e'], [.4, '#9ac04a'], [1, '#3a5a16']]), 1, r); for (let i = 0; i < 4; i++) T.ell(x + T.rnd(-3, 3), y + T.rnd(-6, 6), 1, 1, '#d4ec8a', .7); } },
    T => { T.rect(-17, -10, 34, 10, '#3a2a40', .35); for (const [x, y, c] of [[-5, -12, '#e8b4c8'], [6, -18, '#b8d0f0'], [-4, -27, '#f0e0a0'], [5, -33, '#c8f0c8']]) { T.ell(x, y, 5, 5, T.rad(x - 1.5, y - 1.5, 6, [[0, T.shade(c, .4)], [.7, c], [1, T.shade(c, -.35)]])); T.ell(x - 1.2, y, .9, .9, T.shade(c, -.6)); T.ell(x + 1.2, y, .9, .9, T.shade(c, -.6)); } },
    T => { T.fill('M-17 -24Q-6 -30 4 -25Q12 -21 17 -26V0H-17Z', T.lin(0, -28, 0, 0, [[0, '#f0d898'], [1, '#b08a48']])); for (let i = 0; i < 26; i++) T.ell(T.rnd(-14, 14), T.rnd(-22, -2), .7, .7, T.pick(['#8a6a30', '#fff2c8']), .6); T.fill('M-2 -24Q2 -32 7 -25Z', '#f4e0d0'); },
    T => { T.rect(-17, -40, 34, 40, T.lin(0, -40, 0, 0, [[0, '#8ad0d8', .25], [1, '#2a7a8a', .45]])); T.fill('M-9 -22Q0 -31 8 -22Q0 -13 -9 -22ZM8 -22L14 -28V-16Z', T.lin(-9, -26, 9, -18, [[0, '#ffe0a0'], [.5, '#f0a040'], [1, '#c86a1a']])); T.ell(-4, -23, 1.2, 1.2, '#1a1a1a'); T.ell(-2, -26, 2, 1, '#fff4d0', .7); },
  ];
  function jarLid(T) { T.fill('M-15 -50Q-16 -58 -10 -59H10Q16 -58 15 -50Q12 -47 8 -48Q6 -44 4 -48Q0 -49 -6 -48Q-9 -45 -11 -48Q-14 -47 -15 -50Z', T.lin(0, -59, 0, -45, [[0, '#e4745a'], [.5, '#a83a2a'], [1, '#6a1e16']])); T.ell(-6, -56, 5, 1.4, '#ffc0a0', .55); T.stroke('M-15 -52Q0 -49 15 -52', '#eadcb4', 1.1, .8); }
  function jar(open, k) {
    return img('cellar-jar-' + (open ? 'o' + k : 'shut'), -34, -66, 68, 72, T => {
      T.soft(0, 1, 26, 6, .55);
      if (!open) {
        T.fill(JAR, T.lin(-16, 0, 16, 0, [[0, '#0e2c2a'], [.45, '#2a564c'], [1, '#0a2220']]));
        T.clip(JAR, () => { T.rect(-17, -34, 34, 34, T.lin(0, -34, 0, 0, [[0, '#6a8a4a', .55], [1, '#14241a', .85]])); for (let i = 0; i < 8; i++) T.ell(T.rnd(-12, 12), T.rnd(-28, -4), T.rnd(1.5, 3.5), T.rnd(1, 2.6), '#08140e', .55); T.ell(-1, -17, 8, 11, '#06100a', .4); });
      } else {
        T.fill(JAR, T.lin(-16, 0, 16, 0, [[0, '#5a9a90', .55], [.5, '#d8f4ea', .28], [1, '#3a7a72', .6]]));
        T.clip(JAR, () => { JAR_IN[k](T); T.glow(0, -24, 26, '#fff4c8', .28); });
      }
      T.rrect(-13, -50, 26, 5, 2, T.lin(-13, 0, 13, 0, [[0, '#2a5a54'], [.4, '#b8e8dc'], [1, '#1e4844']]), .92);
      T.rrect(-13, -42, 3.6, 34, 2, '#ffffff', .3); T.ell(-10.5, -37, 1.4, 2.6, '#ffffff', .85); T.rrect(11.5, -40, 3, 32, 2, '#000', .22); T.ell(0, -2, 12, 1.8, '#b8f0e0', .3);
      if (!open) { jarLid(T); T.rrect(-9, -30, 18, 11, 1.5, T.lin(0, -30, 0, -19, [[0, '#efe0b8'], [1, '#c8b488']]), .9); T.stroke('M-6 -26h12M-6 -22.5h8', '#5a4028', .8, .7); }
      else save(T.cx, () => { T.cx.translate(19, -50); T.cx.rotate(.6); T.cx.translate(0, 54); jarLid(T); });
    });
  }
  const sparkle = (x, y, k, c) => at(x, y, halo(0, 0, 14 * k, c || '#fff4b8', .9) + `<path d="M0 ${-9 * k}L${2 * k} ${-2 * k}L${9 * k} 0L${2 * k} ${2 * k}L0 ${9 * k}L${-2 * k} ${2 * k}L${-9 * k} 0L${-2 * k} ${-2 * k}Z" fill="${c || '#fff8d8'}"/>`);

  /* ---------- the measurer's den: the torn map, the notebook ---------- */
  function mapPaint(R, day) {
    const B = R.board, name = 'den-map-' + day;
    if (sceneNow && !sceneNow.textures.exists('gdpiece-' + name)) {
      const h = gardenRand('rm-mapart|' + R.id + '|' + day), a = 20 + h() * 40, b = 60 + h() * 70, c = 110 + h() * 60;
      const tiles = scene => {
        const full = scene.textures.get('gdpiece-' + name).getSourceImage(), tw = B.w / 3, th = B.h / 3;
        for (let t = 0; t < 9; t++) {
          const c2 = document.createElement('canvas'); c2.width = Math.ceil(tw * K); c2.height = Math.ceil(th * K);
          const cx = c2.getContext('2d', { willReadFrequently: true }); cx.drawImage(full, (t % 3) * tw * K, Math.floor(t / 3) * th * K, tw * K, th * K, 0, 0, tw * K, th * K);
          // torn paper: a lit top edge, a shaded lower edge
          cx.fillStyle = 'rgba(255,250,230,.5)'; cx.fillRect(0, 0, c2.width, 2); cx.fillStyle = 'rgba(60,36,14,.35)'; cx.fillRect(0, c2.height - 3, c2.width, 3); cx.fillRect(c2.width - 2, 0, 2, c2.height);
          scene.textures.addCanvas('gdpiece-' + name + '-t' + t, c2);
        }
      };
      img(name, 0, 0, B.w, B.h, T => {
        T.rect(0, 0, B.w, B.h, T.lin(0, 0, B.w, B.h, [[0, '#f2e6c4'], [.5, '#e6d4a8'], [1, '#d4bc8a']]));
        for (let i = 0; i < 14; i++) T.blob(T.rnd(0, B.w), T.rnd(0, B.h), T.rnd(14, 40), T.rnd(8, 24), T.pick(['#c8a870', '#fff8e0', '#b89860']), .16, 8, .5);
        for (let i = 0; i < 5; i++) T.stroke(`M0 ${i * 48 + 10}H${B.w}M${i * 60 + 10} 0V${B.h}`, '#a88a5a', .6, .35);
        T.blob(70, 50, 46, 30, '#9ab878', .55); T.blob(214, 168, 56, 38, '#9ab878', .55); T.blob(66, 46, 30, 18, '#b8d090', .45); T.blob(208, 162, 36, 22, '#b8d090', .45);
        for (const [x, y, s] of [[190, 76, 1], [212, 82, .8], [56, 170, .9]]) { T.poly([[x - 18 * s, y], [x, y - 30 * s], [x + 18 * s, y]], '#a89070'); T.poly([[x, y - 30 * s], [x + 18 * s, y], [x + 2 * s, y]], '#7a6448'); T.poly([[x - 5 * s, y - 20 * s], [x, y - 30 * s], [x + 5 * s, y - 20 * s]], '#f4f0e4', .8); }
        const river = `M-4 ${a}C60 ${b} 90 ${a + 40} 135 ${c}S220 ${b} 274 ${c + 40}`;
        T.stroke(river, '#3a78a4', 10, .85); T.stroke(river, '#6aa8d0', 6, .9); T.stroke(river, '#bfe0f0', 1.8, .7);
        T.cx.setLineDash([6, 5]); T.stroke(`M20 200L${70 + a} 130L150 ${60 + a / 2}L250 24`, '#a83a2a', 2.4, .85); T.cx.setLineDash([]);
        for (const [x, y] of [[250, 24], [20, 200]]) { T.ell(x, y + 1, 5, 2, '#000', .25); T.ell(x, y - 2, 4.5, 4.5, T.rad(x - 1.5, y - 3.5, 5, [[0, '#ff9a8a'], [1, '#8a1e14']])); }
        T.stroke('M30 30l10 -10M36 22l-10 -2', '#5a4a2a', 1.8, .8);
        T.rect(0, 0, B.w, B.h, T.rad(B.w / 2, B.h / 2, B.w * .7, [[0, '#000', 0], [.7, '#000', 0], [1, '#4a2a10', .28]]));
      }, '', tiles);
    }
    return 'gdpiece-' + name;
  }
  function den(q, R, S) {
    const day = _gdToday(), B = R.board, tw = B.w / 3, th = B.h / 3;
    if (q.id === 'done') { const key = mapPaint(R, day); return `<image href="${key}" x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}"/>` + sparkle(B.x + B.w - 20, B.y + 18, .8); }
    if (typeof q.id === 'number' && S && S.ord && !S.open) {
      const key = mapPaint(R, day), t = S.ord[q.id], on = S.sel === q.id;
      return (on ? `<rect x="${-tw / 2 - 5}" y="${-th - 3}" width="${tw + 10}" height="${th + 10}" rx="4" fill="#1a0e04" opacity=".35"/>` : '')
        + `<g transform="translate(0 ${on ? -5 : 0})"><image href="${key}-t${t}" x="${n1(-tw / 2)}" y="${n1(-th)}" width="${n1(tw)}" height="${n1(th)}"/>`
        + (on ? `<rect x="${n1(-tw / 2 - 2)}" y="${n1(-th - 2)}" width="${n1(tw + 4)}" height="${n1(th + 4)}" rx="3" fill="none" stroke="#ffd86a" stroke-width="3"/>` + halo(0, -th / 2, tw * .7, '#ffe8a0', .35) : '') + '</g>';
    }
    if (q.id === 0 && S && S.open) return notebook('den-book', '#7a2a22');
    return null;
  }
  function notebook(key, ribbon) {
    return img(key, -50, -40, 100, 46, T => {
      T.soft(0, 0, 44, 8, .5);
      T.fill('M-40 -6L-36 -24L0 -30L36 -24L40 -6L0 -12Z', T.lin(0, -30, 0, -6, [[0, '#5a3820'], [1, '#3a2010']]));
      T.fill('M-36 -10L-33 -26L-1 -31V-14Z', T.lin(-36, 0, 0, 0, [[0, '#e8dcbc'], [1, '#fff8e8']])); T.fill('M36 -10L33 -26L1 -31V-14Z', T.lin(0, 0, 36, 0, [[0, '#f0e6cc'], [1, '#d8c8a0']]));
      for (let i = 0; i < 5; i++) { T.stroke(`M-29 ${-23 + i * 3}L-6 ${-27 + i * 3}`, '#5a4a6a', .7, .55); T.stroke(`M6 ${-27 + i * 3}L29 ${-23 + i * 3}`, '#5a4a6a', .7, .55); }
      T.rect(-1.2, -31, 2.4, 18, '#000', .2); T.fill('M3 -14L5 0L7 -3L9 0L7 -14Z', ribbon);
    });
  }

  /* ---------- the boat loft: hulls on ropes, the chalk board ---------- */
  const HULL = 'M-68 -66H68Q60 -18 0 -6Q-60 -18 -68 -66Z';
  function hull(i, c) {
    return img('boat-hull-' + i, -78, -84, 156, 84, T => {
      T.fill(HULL, T.lin(-68, -66, 40, -6, [[0, T.shade(c, .2)], [.55, c], [1, T.shade(c, -.4)]]));
      T.clip(HULL, () => {
        for (let k = 0; k < 6; k++) { const y = -60 + k * 9.5, d = `M-74 ${y}Q0 ${y + 30 - k * 3} 74 ${y}`; T.stroke(d, T.shade(c, -.45), 2.2, .5); T.stroke(`M-74 ${y + 2}Q0 ${y + 32 - k * 3} 74 ${y + 2}`, T.shade(c, .3), 1.2, .45); }
        for (let k = 0; k < 7; k++) T.blob(T.rnd(-56, 56), T.rnd(-58, -18), T.rnd(5, 14), T.rnd(2, 5), '#8a6a44', .35, 7, .5);
        T.rect(-70, -66, 140, 70, T.lin(-70, 0, 70, 0, [[0, '#000', .35], [.3, '#000', 0], [.75, '#000', 0], [1, '#000', .35]]));
        T.rect(-70, -66, 140, 70, T.lin(0, -66, 0, -6, [[0, '#000', 0], [1, '#000', .3]]));
      });
      T.rrect(-70, -70, 140, 7, 3, T.lin(0, -70, 0, -63, [[0, '#a0784a'], [1, '#5a3a1e']])); T.rect(-66, -69.5, 132, 1.3, '#e8c890', .6);
      T.rrect(-20, -76, 40, 8, 2, T.lin(0, -76, 0, -68, [[0, '#8a6038'], [1, '#4a2e16']]));
      for (const x of [-44, 44]) { T.ell(x, -70, 4, 4, '#3a2a1a'); T.ell(x - 1, -71, 1.5, 1.5, '#c8a878', .7); }
    });
  }
  function boat(q, R, S) {
    if (q.id === 'chart') {
      const C = ['#e0866a', '#8ac0d0', '#f0d070', '#9ac88a']; let s = img('boat-board', -40, -42, 240, 80, T => {
        T.soft(80, 34, 120, 8, .45); T.rrect(-34, -36, 228, 68, 5, T.lin(0, -36, 0, 32, [[0, '#8a6a42'], [1, '#4a321a']]));
        T.rrect(-28, -30, 216, 56, 3, T.lin(-28, -30, 188, 26, [[0, '#2a3a3c'], [.5, '#1c2628'], [1, '#141c1e']]));
        for (let i = 0; i < 18; i++) T.ell(T.rnd(-24, 184), T.rnd(-26, 22), T.rnd(6, 22), T.rnd(1, 3), '#e8e8e0', .05, T.rnd(-.3, .3));
        T.rect(-28, 26, 216, 3, '#c8b8a0', .4);
      });
      (S.seq || []).forEach((k, i) => { const x = 10 + i * 48, done = i < S.i; s += `<circle cx="${x}" cy="-2" r="16" fill="${C[k]}" opacity="${done ? .22 : .82}"/><circle cx="${x - 4}" cy="-6" r="7" fill="#fff" opacity="${done ? .05 : .18}"/><circle cx="${x}" cy="-2" r="16.5" fill="none" stroke="${C[k]}" stroke-width="1.4" opacity=".55" stroke-dasharray="5 3"/>` + (done ? `<path d="M${x - 8} -2l6 7l10 -13" fill="none" stroke="#f2ead8" stroke-width="3" stroke-linecap="round" opacity=".9"/>` : ''); });
      return s;
    }
    const t = R.things[q.id]; if (!t) return null; const hot = S.hot === q.id, y = t.y;
    const ropes = [-44, 44].map(x => `<path d="M${x} ${-y + 70}V-70" stroke="#5a4428" stroke-width="3.6" fill="none"/><path d="M${x - .6} ${-y + 70}V-70" stroke="#c8b088" stroke-width="2" fill="none" stroke-dasharray="2.5 2.5"/>`).join('');
    return `<g class="grm-tune-part${q.id}" transform="translate(0 0)">${ropes}<g transform="translate(0 ${hot ? 8 : 0})">${hull(q.id, ['#b8623a', '#3f7486', '#d8b24a', '#6a9a5a'][q.id] || '#b8623a')}${hot ? halo(0, -36, 70, '#fff4c8', .55) + '<path d="M-92 -40q-10 14 0 28M-104 -46q-16 20 0 40M92 -40q10 14 0 28M104 -46q16 20 0 40" fill="none" stroke="#fff4d0" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>' : ''}</g></g>`;
  }

  /* ---------- the lamplighter's cupboard: wicks on a wire ---------- */
  function wick(on) {
    return img('lamp-wick-' + (on ? 'on' : 'off'), -40, -100, 80, 106, T => {
      T.soft(0, 0, 18, 4, .55);
      brass(T, -15, -6, 30, 6, 2); T.ell(0, -6, 15, 3, T.lin(-15, 0, 15, 0, [[0, '#8a5e22'], [.4, '#f4d88a'], [1, '#6a4416']]));
      T.rrect(-5, -56, 10, 51, 3, T.lin(-5, 0, 5, 0, [[0, '#fff6e0'], [.55, '#efe3c4'], [1, '#b8a888']]));
      T.fill('M-5 -56q2 6 1 12q-1 3 1 4q2 -2 1 -8q1 -6 4 -8Z', '#fffaf0', .9); T.ell(0, -56, 5, 1.6, '#fffaf0');
      T.stroke('M0 -56v-5', '#1a120c', 1.3);
      if (on) { T.glow(0, -66, 40, '#ffb050', .7); T.glow(0, -40, 26, '#ffd890', .3); }
      else { T.stroke('M0 -62q4 -6 0 -12q-4 -6 1 -14', '#c8c8c8', 1.4, .35); T.ell(0, -61, 1.4, 1.4, '#6a3a1a'); }
    });
  }
  function lampcup(q, R, S) {
    if (q.id === 'dim') return null;
    if (typeof q.id !== 'number') return null;
    const on = S.l[q.id];
    return wick(on) + (on ? `<g transform="translate(0 -60) scale(1.15)"><path class="ee-flame" d="M0 0Q-8 -10 0 -24Q8 -10 0 0z" fill="#ffb040"/><path class="ee-flame" d="M0 -2Q-3.6 -8 0 -15Q3.6 -8 0 -2z" fill="#fff2c0"/></g>` + halo(0, -70, 60, '#ffc870', .35) : '');
  }

  /* ---------- nowhere: signposts in the mist, the guest book ---------- */
  function post() { return img('nw-post', -24, -104, 48, 110, T => { T.soft(0, 1, 18, 4, .3, '#3a3a5a'); T.rrect(-3.5, -98, 7, 98, 1.5, T.lin(-3.5, 0, 3.5, 0, [[0, '#a8988a'], [.5, '#7a6a58'], [1, '#4a3e34']])); T.grain(-3.5, -98, 7, 98, '#3a2e24', .3, true, 2); T.ell(0, -99, 4, 1.6, '#c8b8a8'); }); }
  function arm(c) { return img('nw-arm-' + c.slice(1), -2, -12, 62, 24, T => { const d = 'M0 -9H44L56 0L44 9H0Z'; T.fill(d, T.lin(0, -9, 0, 9, [[0, T.shade(c, .25)], [.6, c], [1, T.shade(c, -.35)]])); T.clip(d, () => T.grain(0, -9, 56, 18, T.shade(c, -.5), .3, false, 3)); T.stroke('M6 0H34', T.shade(c, -.55), 1.6, .7); T.rect(0, -9, 56, 1.4, '#fff', .3); }); }
  function nowhere(q, R, S) {
    if (typeof q.id === 'string' && q.id[0] === 'p' && q.id.length > 1) { const x = Number(q.id.slice(1)), d = S.tx >= x ? 1 : -1; return post() + `<g transform="translate(0 -84) scale(${d} 1)">${arm('#efe6cc')}</g>`; }
    if (q.id === 'grown') {
      const C = ['#b8623a', '#3f7486', '#6a9a5a', '#c8984a', '#8a5a9a', '#c85a6a', '#5a8ab8'], n = gpVisiting() ? Math.max(3, S.n) : S.n; let s = '';
      for (let i = 0; i < n; i++) { const x = 230 + (i * 149) % 640, y = 408 + (i % 3) * 8, d = i % 2 ? 1 : -1; s += at(x, y, img('nw-post-s', -24, -116, 48, 122, T => { T.soft(0, 1, 16, 4, .25, '#3a3a5a'); T.rrect(-3, -110, 6, 110, 1.5, T.lin(-3, 0, 3, 0, [[0, '#a8988a'], [1, '#4a3e34']])); }) + `<g transform="translate(0 -104) scale(${d} 1)">${arm(C[i % C.length])}</g>`); }
      if (n >= 6) s += at(640, 422, img('nw-chair', -30, -104, 60, 108, T => { T.soft(0, 0, 26, 5, .3, '#3a3a5a'); plank(T, -20, -52, 40, 8, '#8a6a44'); plank(T, -18, -44, 6, 44, '#6a4a2c', true); plank(T, 12, -44, 6, 44, '#6a4a2c', true); plank(T, -20, -98, 7, 50, '#7a5a3a', true); plank(T, -20, -96, 34, 6, '#8a6a44'); }));
      return s;
    }
    if (q.id === 'book') return halo(0, -50, 90, '#fff8e8', .5) + lectern();
    return null;
  }
  function lectern() {
    return img('nw-lectern', -56, -104, 112, 110, T => {
      T.soft(0, 1, 46, 7, .35, '#3a3a5a');
      T.rrect(-6, -60, 12, 60, 2, T.lin(-6, 0, 6, 0, [[0, '#9a7a58'], [1, '#4a3420']])); T.rrect(-30, -6, 60, 7, 3, T.lin(0, -6, 0, 1, [[0, '#8a6a48'], [1, '#4a3420']]));
      T.fill('M-48 -58L48 -58L40 -72L-40 -72Z', T.lin(0, -72, 0, -58, [[0, '#a8845a'], [1, '#5a3c22']]));
      T.fill('M-40 -70Q-20 -84 -1 -76V-62Q-20 -70 -40 -62Z', T.lin(-40, 0, 0, 0, [[0, '#e8dcc0'], [1, '#fffaf0']])); T.fill('M40 -70Q20 -84 1 -76V-62Q20 -70 40 -62Z', T.lin(0, 0, 40, 0, [[0, '#f6eedc'], [1, '#d8ccb0']]));
      for (let i = 0; i < 4; i++) { T.stroke(`M-34 ${-69 + i * 2.4}Q-20 ${-77 + i * 2.4} -6 ${-73 + i * 2.4}`, '#4a3a5a', .6, .5); T.stroke(`M6 ${-73 + i * 2.4}Q20 ${-77 + i * 2.4} 34 ${-69 + i * 2.4}`, '#4a3a5a', .6, .5); }
      T.stroke('M30 -66L50 -100', '#f8f4ec', 3, .95); T.stroke('M36 -76Q46 -88 50 -100', '#d8d0c4', 5, .6);
    });
  }

  /* ---------- the hollow oak: the owl ---------- */
  function owl(rest) {
    return img('owl-' + (rest ? 'rest' : 'wake'), -56, -128, 112, 134, T => {
      T.soft(0, 0, 36, 6, .5);
      T.rrect(-46, -8, 92, 8, 3, T.lin(0, -8, 0, 0, [[0, '#7a5232'], [1, '#3a2412']]));
      T.ell(0, -52, 38, 50, T.rad(-12, -70, 70, [[0, '#a8845a'], [.6, '#7a5634'], [1, '#4a301a']]));
      for (let r = 0; r < 6; r++) for (let k = 0; k < 7; k++) { const x = -27 + k * 9 + (r % 2) * 4, y = -76 + r * 11; T.fill(`M${x - 4} ${y}Q${x} ${y + 6} ${x + 4} ${y}`, '#3a2414', .0); T.stroke(`M${x - 4} ${y}Q${x} ${y + 5} ${x + 4} ${y}`, '#4a2e16', 1, .35); }
      T.ell(0, -36, 25, 34, T.lin(0, -70, 0, -2, [[0, '#ece0bc'], [1, '#c8b48a']]));
      for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) T.stroke(`M${-14 + k * 14 + (r % 2) * 4} ${-52 + r * 10}q3 4 6 0`, '#7a5a36', 1.4, .7);
      for (const s of [-1, 1]) { T.fill(`M${s * 27} -70Q${s * 44} -44 ${s * 30} -14Q${s * 22} -40 ${s * 22} -66Z`, T.lin(s * 22, -70, s * 44, -14, [[0, '#8a6440'], [1, '#4a2e16']])); T.fill(`M${s * 34} -92L${s * 20} -84L${s * 28} -76Z`, '#5a3a1e'); }
      for (const s of [-1, 1]) { T.ell(s * 15, -74, 15, 15, T.rad(s * 15, -74, 15, [[0, '#fff8e0'], [.8, '#e8dcb8'], [1, '#b8a47a']])); }
      if (rest) for (const s of [-1, 1]) T.stroke(`M${s * 15 - 9} -74q9 6 18 0`, '#2a1a10', 2.4);
      else for (const s of [-1, 1]) { T.ell(s * 15, -74, 8, 8, T.rad(s * 15, -74, 8, [[0, '#ffd04a'], [.7, '#e89a1a'], [1, '#8a4a0a']])); T.ell(s * 15, -74, 4.4, 4.6, '#140c06'); T.ell(s * 15 - 2.4, -77, 1.8, 1.8, '#fff'); }
      T.fill('M-4 -64L4 -64L0 -55Z', T.lin(0, -64, 0, -55, [[0, '#f0b04a'], [1, '#8a5a1a']]));
      for (const x of [-12, -4, 4, 12]) T.stroke(`M${x} -6v4`, '#c89a3a', 2.4);
    });
  }

  /* ---------- the grotto: moss ---------- */
  function mossTuft(T, x, y, s) { for (let i = 0; i < 9; i++) { const a = T.rnd(-1, 1); T.ell(x + a * 22 * s, y - T.rnd(0, 14) * s, T.rnd(8, 14) * s, T.rnd(5, 8) * s, T.pick(['#4a8a3a', '#6aaa4a', '#8ac860', '#3a7032']), .9); } for (let i = 0; i < 14; i++) T.ell(x + T.rnd(-22, 22) * s, y - T.rnd(2, 18) * s, 1.4 * s, 1.4 * s, '#c8f0a0', .7); }
  function grotto(q, R, S) {
    if (q.id === 'go' || q.id === 0) return img('grotto-tray', -50, -48, 100, 54, T => { T.soft(0, 2, 42, 8, .55); T.blob(0, -12, 36, 14, T.lin(0, -26, 0, 2, [[0, '#8a7a64'], [1, '#3a3228']]), 1, 9, .25); mossTuft(T, -4, -22, 1); });
    if (q.id === 'tuft') return `<g class="grm-pop">${img('grotto-tuft', -46, -40, 92, 46, T => { T.soft(0, 2, 34, 9, .5, '#0a2a10'); mossTuft(T, 0, -6, 1.15); T.glow(0, -14, 30, '#c8ffa0', .25); })}</g>`;
    if (q.id === 'pips') return [0, 1, 2, 3, 4].map(i => i < S.hits ? halo(-44 + i * 22, -30, 16, '#a8f080', .7) + glowDot(-44 + i * 22, -30, 6, '#d8ffb8', 1) : glowDot(-44 + i * 22, -30, 7, '#1a2a1e', .85) + glowDot(-46 + i * 22, -32, 2.4, '#4a6a4e', .7)).join('');
    if (q.id === 'grown') {
      const n = gpVisiting() ? Math.max(3, S.n) : S.n; let s = '';
      for (let i = 0; i < n; i++) { const x = 232 + (i * 67) % 170, y = 258 + (i * 41) % 110; s += at(x, y, img('grotto-patch-' + (i % 3), -56, -30, 112, 56, T => { for (let k = 0; k < 16; k++) T.ell(T.rnd(-38, 38), T.rnd(-14, 14) * (1 - Math.abs(k - 8) / 12), T.rnd(10, 18), T.rnd(5, 9), T.pick(['#3f7a38', '#5a9a48', '#76b85a', '#2e6a2a']), .85); for (let k = 0; k < 18; k++) T.ell(T.rnd(-36, 36), T.rnd(-14, 12), 1.3, 1.3, '#d0f4a8', .6); })); }
      if (n >= 5) s += at(392, 300, img('grotto-fern', -40, -60, 80, 66, T => { for (let k = 0; k < 7; k++) { const a = -2.6 + k * .35, ex = Math.cos(a) * 34, ey = Math.sin(a) * 40; T.stroke(`M0 0Q${ex * .4} ${ey * .7} ${ex} ${ey}`, '#4a8a3a', 2); for (let j = 1; j < 7; j++) { const u = j / 7, px = ex * u, py = ey * u - 4 * u; T.ell(px, py, 4 * (1 - u * .5), 1.8, '#7ac060', .9, a + 1.2); } } }));
      return s;
    }
    return null;
  }

  /* ---------- behind the falls: mirrors and the light ---------- */
  function falls(q, R, S) {
    if (q.id === 'ray') {
      const pts = [[40, 60], [240, 298], [490, 280], [740, 298], [900, 110]]; let upto = 0; while (upto < 3 && S.a[upto] === S.want[upto]) upto++; let s = '';
      for (let i = 0; i <= upto; i++) { const d = `M${pts[i][0]} ${pts[i][1]}L${pts[i + 1][0]} ${pts[i + 1][1]}`; s += `<path d="${d}" stroke="#fff2b0" stroke-width="26" opacity=".12" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#fff4c0" stroke-width="12" opacity=".3" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#fffbe8" stroke-width="3.5" opacity=".9" fill="none" stroke-linecap="round"/>`; if (i) s += halo(pts[i][0], pts[i][1], 40, '#fff6c8', .6); }
      if (upto >= 3) ['#e8504e', '#f0a03e', '#f4e04e', '#5ac06a', '#4a90d8', '#8a5ac0'].forEach((c, i) => { s += `<path d="M300 ${380 - i * 14}Q620 ${30 - i * 14} 900 ${320 - i * 14}" stroke="${c}" stroke-width="16" opacity=".26" fill="none"/>`; });
      return s;
    }
    if (typeof q.id !== 'number') return null;
    return img('falls-post', -30, -76, 60, 82, T => { T.soft(0, 1, 24, 5, .5); T.rrect(-5, -70, 10, 70, 2, T.lin(-5, 0, 5, 0, [[0, '#6a5038'], [.4, '#4a3420'], [1, '#22160c']])); T.grain(-5, -70, 10, 70, '#140c06', .3, true, 2.5); T.rrect(-12, -6, 24, 6, 2, '#3a3a40'); T.ell(-4, -40, 3, 10, '#5a8a6a', .35); })
      + `<g transform="translate(0 -92) rotate(${[-28, 0, 28][S.a[q.id]]})">${img('falls-mirror', -38, -42, 76, 84, T => {
        T.rrect(-31, -35, 62, 70, 7, T.lin(-31, -35, 31, 35, [[0, '#f0c870'], [.4, '#b8903a'], [.8, '#7a5420'], [1, '#c8a050']]));
        T.rrect(-24, -28, 48, 56, 4, T.lin(-24, -28, 24, 28, [[0, '#f4fcff'], [.45, '#b8dce8'], [.55, '#e8f8fc'], [1, '#88b8c8']]));
        T.fill('M-24 -10L-10 -28H0L-24 4Z', '#fff', .45); T.fill('M4 28L24 0V12L14 28Z', '#fff', .25); for (let i = 0; i < 6; i++) T.ell(T.rnd(-20, 20), T.rnd(-24, 24), T.rnd(2, 5), T.rnd(1, 3), '#5a6a5a', .18);
        for (const [x, y] of [[-27, -31], [27, -31], [-27, 31], [27, 31]]) T.ell(x, y, 2, 2, '#fff2c0', .8);
      })}${S.a[q.id] === S.want[q.id] ? halo(0, 0, 40, '#fff4c8', .45) : ''}</g>`;
  }

  /* ---------- the lamp room: the great lamp, the beam, the boat ---------- */
  function lamproom(q, R, S) {
    const L = R.lamp;
    if (q.id === 'beam') return `<defs><linearGradient id="grpbeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe0" stop-opacity=".75"/><stop offset=".6" stop-color="#fff2b8" stop-opacity=".35"/><stop offset="1" stop-color="#fff2b8" stop-opacity=".08"/></linearGradient></defs><path class="grm-beamp" d="" fill="url(#grpbeam)" opacity="${S.on ? 0.3 : 0}"/><g class="grm-boat" opacity="${S.won ? 1 : 0}" transform="translate(${S.ox} ${L.sea})">${img('lamp-boat', -40, -42, 80, 52, T => {
      T.ell(0, 6, 36, 4, '#fff8d0', .35); T.fill('M-30 -8H30L22 6H-22Z', T.lin(0, -8, 0, 6, [[0, '#d8784a'], [1, '#7a2e16']])); T.rect(-30, -9, 60, 2.4, '#f0c8a0', .7);
      T.stroke('M0 -8V-34', '#f2e4c8', 2.2); T.fill('M1 -34L19 -12H1Z', T.lin(0, -34, 19, -12, [[0, '#fffaf0'], [1, '#d8d0c0']])); T.stroke('M-9 -9L-14 -24', '#e8c8a8', 3); T.ell(-9, -17, 4, 4, '#e8c8a8'); T.ell(-14, -25, 2.4, 2.4, '#f4dcc0');
    })}</g>`;
    if (q.id === 'lamp') return img('lamp-lens', -70, -196, 140, 202, T => {
      T.soft(0, 0, 50, 8, .55); T.rrect(-40, -70, 80, 70, 4, T.lin(-40, 0, 40, 0, [[0, '#a09a8a'], [.4, '#7a7468'], [1, '#3a3630']])); T.rect(-40, -70, 80, 3, '#d8d0c0', .6); for (const x of [-26, 0, 26]) T.rrect(x - 3, -60, 6, 50, 2, '#000', .18);
      T.ell(0, -126, 54, 62, T.rad(-14, -146, 70, [[0, '#ffffff', .75], [.5, '#d8eef4', .45], [1, '#88b0c0', .5]]));
      for (let k = -3; k <= 3; k++) T.stroke(`M-52 ${-126 + k * 15}Q0 ${-122 + k * 15} 52 ${-126 + k * 15}`, '#ffffff', 1.4, .35);
      T.ell(0, -126, 30, 40, T.rad(0, -118, 40, [[0, '#fffbe0'], [.6, '#ffe89a', .9], [1, '#ffd060', .5]]));
      T.glow(0, -120, 80, '#ffd890', .55); brass(T, -50, -190, 100, 8, 3); brass(T, -46, -70, 92, 6, 2);
    }) + `<g transform="translate(0 -108) scale(1.5)"><path class="ee-flame" d="M0 0Q-8 -10 0 -24Q8 -10 0 0z" fill="#ffb040"/><path class="ee-flame" d="M0 -2Q-3.6 -8 0 -15Q3.6 -8 0 -2z" fill="#fff2c0"/></g>` + halo(0, -126, 140, '#ffe8a8', .3) + `<circle class="grm-beamm" cx="0" cy="-126" r="60" fill="none" stroke="#ffd86a" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(S.m * 377).toFixed(0)} 377" transform="rotate(-90 0 -126)"/>`;
    return null;
  }

  /* ---------- the ringing chamber: bell ropes, the window ---------- */
  function sally(c) { return img('ring-sally-' + c.slice(1), -16, -4, 32, 100, T => { T.rrect(-11, 0, 22, 92, 10, T.lin(-11, 0, 11, 0, [[0, T.shade(c, -.35)], [.35, T.shade(c, .25)], [.6, c], [1, T.shade(c, -.5)]])); for (let i = 0; i < 9; i++) T.stroke(`M-11 ${8 + i * 9.5}Q0 ${4 + i * 9.5} 11 ${8 + i * 9.5}`, T.shade(c, -.45), 1.4, .45); for (let i = 0; i < 40; i++) T.ell(T.rnd(-11, 11), T.rnd(2, 90), .8, 1.6, T.shade(c, .5), .35); T.stroke('M-11 30H11M-11 60H11', '#f0e8d0', 2.4, .55); }); }
  function ringers(q, R, S) {
    if (q.id === 'chart') {
      const C = ['#e0584a', '#f0c050', '#5a90d0', '#6ab86a']; let s = '';
      (S.seq || []).forEach((k, i) => { const x = -100 + i * 50, done = i < S.i; s += `<defs><linearGradient id="grpw${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".35" stop-color="${C[k]}"/><stop offset="1" stop-color="${C[k]}" stop-opacity=".7"/></linearGradient></defs><path d="M${x} 40h48v196h-48z" fill="url(#grpw${i})" opacity="${done ? .28 : .92}"/><path d="M${x + 6} 52h14v170h-14z" fill="#fff" opacity="${done ? .04 : .14}"/>` + (done ? '' : halo(x + 24, 120, 40, C[k], .25)); });
      return s + '<path d="M-100 40v196M-50 40v196M0 40v196M50 40v196M-106 130H106" stroke="#1e1a16" stroke-width="4" fill="none" opacity=".9"/><path d="M-106 60Q0 -34 106 60V240H-106z" stroke="#2a241e" stroke-width="11" fill="none"/>';
    }
    const t = R.things[q.id]; if (!t) return null; const hot = S.hot === q.id, end = hot ? -36 : -60, top = hot ? -190 : -214;
    return `<g class="grm-tune-part${q.id}" transform="translate(0 0)"><ellipse cx="0" cy="0" rx="40" ry="10" fill="#000" opacity=".22"/><path d="M0 -450V${end}" stroke="#6a5a3a" stroke-width="7.4" fill="none"/><path d="M0 -450V${end}" stroke="#d8c8a0" stroke-width="5" fill="none"/><path d="M-1 -450V${end}" stroke="#8a7a54" stroke-width="1.8" stroke-dasharray="3 4" fill="none"/><path d="M-1.6 -450V${end}" stroke="#fff8e0" stroke-width="1" opacity=".45" fill="none"/><ellipse cx="0" cy="${end + 2}" rx="5" ry="7" fill="#c8b890"/>${at(0, top, sally(t.c || ['#c8483a', '#d8a83a', '#4a7ab8', '#5a9a5a'][q.id]))}${hot ? halo(0, top + 46, 60, '#fff2c0', .4) : ''}</g>`;
  }

  /* ---------- the barn loft: hay ---------- */
  function hay(R, v) {
    const H = R.hay, w = H.cw, h = H.ch;
    return img('barn-hay-' + v, -w * .72, -h * 1.4, w * 1.44, h * 1.5, T => {
      const c = ['#d8b452', '#e8c868', '#c49e40'][v], d = `M${-w * .62} 0Q${-w * .55} ${-h * .8} ${-w * .1} ${-h * 1.12}Q${w * .2} ${-h * 1.22} ${w * .48} ${-h * .8}Q${w * .66} ${-h * .4} ${w * .62} 0Z`;
      T.soft(0, 0, w * .62, 8, .55);
      T.fill(d, T.rad(-w * .18, -h * .9, w * .8, [[0, T.shade(c, .35)], [.55, c], [1, T.shade(c, -.45)]]));
      T.clip(d, () => { for (let i = 0; i < 160; i++) { const x = T.rnd(-w * .6, w * .6), y = T.rnd(-h * 1.15, 0), a = T.rnd(-1.2, 1.2), l = T.rnd(6, 16); T.stroke(`M${x} ${y}l${Math.cos(a) * l} ${Math.sin(a) * l * .5 - l * .3}`, T.pick([T.shade(c, .45), T.shade(c, -.4), T.shade(c, .15), '#fff2b8']), T.rnd(.6, 1.3), T.rnd(.35, .8)); } T.rect(-w, -h * 1.3, w * 2, h * 1.4, T.lin(0, -h * 1.2, 0, 0, [[0, '#000', 0], [.7, '#000', .05], [1, '#2a1a08', .4]])); });
      for (let i = 0; i < 18; i++) { const x = T.rnd(-w * .5, w * .5), y = -h * T.rnd(.6, 1.1); T.stroke(`M${x} ${y}l${T.rnd(-8, 8)} ${T.rnd(-10, -4)}`, T.shade(c, .3), .9, .8); }
    });
  }
  function barn(q, R, S) {
    const H = R.hay;
    if (typeof q.id === 'number') return hay(R, gardenRand('rm-hay|' + _gdToday() + '|' + q.id)() * 3 | 0);
    if (typeof q.id === 'string' && q.id[0] === 'd') {
      const dd = S.dug.get(Number(q.id.slice(1)));
      const hole = img('barn-dug', -H.cw * .6, -24, H.cw * 1.2, 32, T => { T.ell(0, -2, H.cw * .44, 9, T.rad(0, -2, H.cw * .44, [[0, '#2a1a0a'], [.7, '#5a4228'], [1, '#5a4228', 0]])); for (let i = 0; i < 40; i++) { const a = T.rnd(0, 6.28), r = T.rnd(H.cw * .3, H.cw * .55); T.stroke(`M${Math.cos(a) * r} ${Math.sin(a) * 8 - 2}l${T.rnd(-6, 6)} ${T.rnd(-3, 3)}`, T.pick(['#d8b452', '#b8923e', '#f0d070']), 1, .8); } });
      if (dd === 9) return hole + at(0, -18, img('barn-key', -34, -14, 60, 28, T => { T.ell(-20, 0, 9, 9, T.lin(-29, -9, -11, 9, [[0, '#9aa0a8'], [1, '#3a3e44']])); T.ell(-20, 0, 4.6, 4.6, '#2a1a0a'); T.rrect(-12, -2.6, 30, 5.2, 2, T.lin(0, -3, 0, 3, [[0, '#a8aeb6'], [1, '#3a3e44']])); T.rect(8, 2, 4, 8, '#5a5e66'); T.rect(14, 2, 4, 6, '#5a5e66'); T.ell(-22, -3, 2.4, 1.2, '#fff', .6); })) + halo(0, -18, 40, '#fff4c8', .5);
      return hole + [0, 1, 2].slice(0, dd).map(k => halo(-14 + k * 14, -18, 12, '#ffd86a', .7) + glowDot(-14 + k * 14, -18, 4, '#fff2b0', 1)).join('');
    }
    return null;
  }

  /* ---------- the very small parlour: cups, the pot, the plate ---------- */
  const CUP = 'M-22 -56L-18 0H18L22 -56Z';
  function cupBack() { return img('parl-cup-back', -34, -64, 68, 70, T => { T.soft(0, 1, 28, 6, .5); T.fill(CUP, T.lin(-22, 0, 22, 0, [[0, '#9aa4ac'], [.35, '#f4f6f8'], [.7, '#d0d6dc'], [1, '#7a848c']])); T.fill('M-17 -50L-14 -6H14L17 -50Z', T.lin(-17, 0, 17, 0, [[0, '#8a8278'], [.5, '#cfc8bc'], [1, '#a8a094']])); T.fill('M-17 -50L-14 -6H14L17 -50Z', T.lin(0, -50, 0, -6, [[0, '#3a302a', .45], [.4, '#3a302a', .1], [1, '#3a302a', 0]])); T.fill('M22 -44Q34 -40 30 -26Q26 -16 19 -14', 'rgba(0,0,0,0)'); T.stroke('M21 -44Q34 -40 30 -26Q26 -16 19 -14', '#c8ced4', 4); T.stroke('M21 -44Q31 -40 28 -28', '#ffffff', 1.4, .6); for (let i = 0; i < 5; i++) T.ell(-18 + i * 9, -36, 2, 3, '#7aa0c8', .5); }); }
  function cupFront() { return img('parl-cup-front', -26, -62, 52, 64, T => { T.ell(0, -56, 22, 4, T.lin(-22, 0, 22, 0, [[0, '#c8ced4'], [.4, '#ffffff'], [1, '#a8b0b8']])); T.ell(0, -56, 17, 2.6, '#6a6058', .7); T.rect(-14, -40, 2.6, 30, '#fff', .35); T.fill('M-18 -2H18L19 -6H-19Z', '#8a949c', .7); }); }
  function parlour(q, R, S) {
    const P = R.pour;
    if (typeof q.id === 'string' && /^c\d$/.test(q.id)) { const i = Number(q.id[1]), f = S.fill[i]; return cupBack() + `<rect class="grm-lv grm-lv${i}" x="-15" y="${(-6 - f * 44).toFixed(1)}" width="30" height="${(f * 44).toFixed(1)}" fill="#b8682a"/>` + cupFront() + '<rect x="-21" y="-46.5" width="42" height="2" rx="1" fill="#ffd86a"/><rect x="-21" y="-38.5" width="42" height="2" rx="1" fill="#ffd86a"/>' + `<g class="grm-cup-next" opacity="${i === S.i ? 1 : 0}">${halo(0, -74, 14, '#ffe8a0', .7)}<path d="M-7 -78L7 -78L0 -67z" fill="#ffd86a"/></g>`; }
    if (q.id === 'pot') return `<g class="grm-pot">${img('parl-pot', -64, -80, 112, 80, T => {
      T.ell(0, -40, 34, 28, T.rad(-12, -52, 44, [[0, '#f4c27a'], [.5, '#c88a40'], [1, '#6a3e14']])); T.ell(-12, -52, 10, 6, '#fff4d8', .55);
      T.fill('M-30 -40Q-52 -48 -56 -66L-46 -66Q-42 -54 -24 -52Z', T.lin(-56, -66, -24, -40, [[0, '#d8a050'], [1, '#7a4a1a']])); T.stroke('M32 -54Q52 -40 32 -24', '#7a4a1a', 5); T.stroke('M33 -52Q48 -40 33 -27', '#d8a050', 1.6, .7);
      T.ell(0, -66, 18, 4, '#8a5a24'); T.ell(-12, -70, 6, 6, T.rad(-14, -72, 6, [[0, '#d8a860'], [1, '#5a3a14']])); for (let i = 0; i < 6; i++) T.ell(-24 + i * 10, -36, 2.4, 3.4, '#f8eed8', .7);
    })}</g><path class="grm-stream" d="M-56 -64Q-58 -30 -54 62" fill="none" stroke="#b8682a" stroke-width="4" opacity="0"/>`;
    if (q.id === 'done') return P.cups.filter((_, i) => i !== 1).map(x => at(x, P.y, cupBack() + '<rect x="-15" y="-50" width="30" height="44" fill="#b8682a"/>' + cupFront() + '<ellipse cx="0" cy="-50" rx="15" ry="2.6" fill="#d88a40"/>' + halo(0, -66, 10, '#fff', .3))).join('');
    if (q.id === 0) { const full = S.won; return img('parl-plate-' + (full ? 'f' : 'e'), -48, -32, 96, 38, T => { T.soft(0, 0, 40, 7, .45); T.ell(0, -8, 40, 8, T.lin(-40, 0, 40, 0, [[0, '#c8bca8'], [.4, '#fffaf0'], [1, '#b8ac98']])); T.ell(0, -10, 30, 5, '#e8dcc8'); if (full) { T.ell(-8, -18, 10, 10, T.rad(-11, -21, 11, [[0, '#ff8a6a'], [1, '#8a1e14']])); T.ell(8, -16, 8, 8, T.rad(6, -18, 9, [[0, '#ffd88a'], [1, '#a8601a']])); T.ell(-11, -22, 2.4, 1.6, '#fff', .7); } }); }
    return null;
  }

  /* ---------- the shepherd's hut: the stove, the gauge, the bellows ---------- */
  function hut(q, R, S) {
    const T0 = R.stove;
    if (q.id === 'stove') {
      const a = -60 + S.h * 120, won = S.won;
      return img('hut-stove', -96, -340, 196, 348, T => {
        T.soft(0, 2, 92, 12, .55);
        T.rrect(-74, -126, 148, 126, 5, T.lin(-74, 0, 74, 0, [[0, '#4a4440'], [.3, '#2e2a26'], [1, '#141210']])); T.rect(-74, -126, 148, 3, '#8a8078', .5);
        T.rrect(-50, -92, 100, 60, 4, '#0c0a08'); T.rrect(-50, -92, 100, 60, 4, T.rad(0, -40, 60, [[0, '#ff8a2a', .55], [1, '#2a0a00', 0]]));
        T.stroke('M-50 -62H50M-20 -92V-32M20 -92V-32', '#3a342e', 3); T.rrect(-66, -30, 132, 8, 2, '#46403a');
        T.rrect(-82, -134, 164, 10, 3, T.lin(0, -134, 0, -124, [[0, '#6a625a'], [1, '#2a2622']]));
        T.rect(54, -330, 12, 196, T.lin(54, 0, 66, 0, [[0, '#5a5650'], [.4, '#3a3632'], [1, '#141210']])); for (let y = -320; y < -140; y += 46) T.rect(52, y, 16, 4, '#22201c');
        T.fill('M-34 -136Q-38 -172 0 -172Q38 -172 34 -136Z', T.rad(-12, -164, 44, [[0, '#d8e4e8'], [.5, '#8a9a9e'], [1, '#3a4448']])); T.fill('M34 -160L60 -174L56 -158L34 -148Z', T.lin(34, -170, 60, -150, [[0, '#a8b8bc'], [1, '#4a5458']]));
        T.stroke('M-24 -172Q0 -202 24 -172', '#2a2a2a', 3.6); T.ell(0, -176, 4, 4, '#3a3a3a'); T.ell(-14, -160, 8, 4, '#fff', .35);
        T.glow(0, -40, 70, '#ff9a40', .35);
      }) + `<g class="grm-fire" transform="translate(0 -24) scale(${(.5 + S.h * 1.1).toFixed(2)})">${img('hut-fire', -46, -46, 92, 52, T => { T.glow(0, -14, 44, '#ff8a2a', .7); for (const [x, k] of [[-22, 1.4], [4, 1.9], [26, 1.2]]) T.flame(x, 0, k); T.ell(0, 2, 40, 5, '#ff5a1a', .6); })}${_grmA.flame(4, -4, 1.4)}</g>`
        + `<g class="grm-kettle-s" opacity="${won ? 1 : 0}"><circle class="grm-steam" cx="62" cy="-180" r="9" fill="#fff" opacity=".7"/><circle class="grm-steam" cx="68" cy="-192" r="6" fill="#fff" opacity=".7" style="animation-delay:-.9s"/><circle class="grm-steam" cx="58" cy="-196" r="7" fill="#fff" opacity=".7" style="animation-delay:-1.6s"/></g>`
        + (won ? at(-112, -2, img('hut-cup', -18, -28, 40, 32, T => { T.soft(0, 0, 14, 3, .4); T.fill('M-12 -22L-9 0H9L12 -22Z', T.lin(-12, 0, 12, 0, [[0, '#c8bca8'], [.4, '#fffaf0'], [1, '#a89c88']])); T.ell(0, -22, 12, 2.6, '#7a4a20'); T.stroke('M12 -16q10 2 0 12', '#e8dcc8', 2.6); })) : '')
        + `<g transform="translate(-122 -96)">${img('hut-gauge', -46, -46, 92, 144, T => { T.rect(-3, 30, 6, 66, T.lin(-3, 0, 3, 0, [[0, '#6a625a'], [1, '#2a2622']])); T.ell(0, 0, 42, 42, T.lin(-42, -42, 42, 42, [[0, '#f0d080'], [1, '#6a4a1a']])); T.ell(0, 0, 37, 37, T.rad(-10, -12, 46, [[0, '#fffaf0'], [1, '#d8ccb0']]));
          const arc = (a0, a1, c) => { T.cx.beginPath(); T.cx.arc(0, 0, 29, (a0 - 90) * Math.PI / 180, (a1 - 90) * Math.PI / 180); T.cx.strokeStyle = c; T.cx.lineWidth = 9; T.cx.lineCap = 'butt'; T.cx.stroke(); }; arc(-60, -6, '#c8c0a8'); arc(-6, 36, '#5aa84a'); arc(36, 60, '#d8483a'); T.fill('M-30 -26Q0 -40 30 -26Q0 -34 -30 -26Z', '#fff', .5); })}<g class="grm-needle" transform="rotate(${a.toFixed(0)})"><path d="M0 4V-30" stroke="#1e1610" stroke-width="3" stroke-linecap="round"/><circle cx="0" cy="0" r="5" fill="#3a2a1a"/><circle cx="-1" cy="-1" r="1.6" fill="#d8c8a8"/></g></g>`;
    }
    if (q.id === 'bellows') return `<ellipse cx="0" cy="2" rx="56" ry="7" fill="#000" opacity=".22"/><g class="grm-bel">${img('hut-bellows', -80, -100, 150, 106, T => {
      T.fill('M-40 -70Q10 -96 44 -78Q56 -70 44 -62L-40 -48Z', T.lin(0, -96, 0, -48, [[0, '#b8804a'], [1, '#6a3e1e']])); T.fill('M-40 -18Q10 8 44 -10Q56 -18 44 -26L-40 -40Z', T.lin(0, -40, 0, 8, [[0, '#8a5a2e'], [1, '#4a2a12']]));
      T.fill('M-40 -48L44 -62Q32 -44 44 -26L-40 -40Z', T.lin(0, -62, 0, -26, [[0, '#3a2418'], [.5, '#5a3a24'], [1, '#2a180e']])); for (let i = 0; i < 4; i++) T.stroke(`M${-30 + i * 18} ${-50 - i * 2.6}Q${-36 + i * 18} -44 ${-30 + i * 18} ${-38 + i * 2.6}`, '#1e120a', 1.6, .6);
      T.grain(-30, -92, 70, 30, '#3a200c', .25, false, 4); T.stroke('M-40 -44H-74', '#8a8c94', 7); T.stroke('M-40 -46H-72', '#d0d2d8', 1.6, .6); T.stroke('M44 -78L62 -86M44 -10L62 -2', '#4a2e18', 7); T.ell(-8, -80, 14, 4, '#f0c890', .35); for (const [x, y] of [[-30, -66], [20, -76], [-30, -28], [20, -18]]) T.ell(x, y, 2, 2, '#e8c070', .8);
    })}</g>`;
    return null;
  }

  /* ---------- the treehouse: the tin, the knock card, the hatch, the rule book ---------- */
  function tree(q, R, S) {
    if (q.id === 'can') return '<path d="M0 -60V-300" stroke="#c8b488" stroke-width="2" fill="none"/>' + img('tree-can', -26, -66, 52, 54, T => { T.ell(0, -16, 15, 4, '#4a5458'); T.rect(-15, -60, 30, 44, T.lin(-15, 0, 15, 0, [[0, '#6a7478'], [.35, '#e8eef0'], [.6, '#a8b4b8'], [1, '#4a5458']])); for (let y = -54; y < -20; y += 6) T.rect(-15, y, 30, 1.2, '#000', .12); T.ell(0, -60, 15, 4, '#8a9498'); T.ell(0, -60, 12, 3, '#3a3e40'); T.rect(-10, -48, 5, 24, '#fff', .35); }) + '<path d="M22 -46q8 8 0 18M30 -52q14 14 0 30M-22 -46q-8 8 0 18M-30 -52q-14 14 0 30" stroke="#fff4c8" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".75"/>';
    if (q.id === 'sign') { let x = 0, dots = ''; S.pat.forEach((g, i) => { dots += S.tap.length > i ? halo(x, 0, 12, '#ff9a7a', .6) + glowDot(x, 0, 6.5, '#c8483a', 1) : glowDot(x, 0, 6.5, '#3a2a1c', .9); x += g * 80; }); dots += S.tap.length > S.pat.length ? glowDot(x, 0, 6.5, '#c8483a', 1) : glowDot(x, 0, 6.5, '#3a2a1c', .9); return `<image href="${img('tree-card', 0, 0, 100, 50, T => { T.rrect(2, 4, 96, 44, 3, '#000', .25); T.rrect(0, 0, 96, 44, 3, T.lin(0, 0, 96, 44, [[0, '#fffaf0'], [1, '#e0d4b4']])); for (let i = 0; i < 8; i++) T.ell(T.rnd(4, 92), T.rnd(4, 40), T.rnd(4, 12), T.rnd(1, 3), '#a89060', .08); T.ell(48, 3, 3, 3, '#a83a2a'); }).match(/href="([^"]+)"/)[1]}" x="-12" y="-22" width="${n1(x + 24)}" height="44"/>` + dots; }
    if (q.id === 'hatch') return img('tree-hatch', -92, -124, 184, 128, T => { T.soft(0, 0, 80, 6, .4); T.rrect(-78, -118, 156, 118, 6, '#3a2410'); for (let i = 0; i < 4; i++) plank(T, -70 + i * 35, -110, 35, 102, ['#9a6a3e', '#8a5c32', '#a8764a', '#92643a'][i], true); T.rect(-70, -110, 140, 102, T.lin(0, -110, 0, -8, [[0, '#fff', .08], [1, '#000', .25]])); for (const y of [-96, -34]) { T.rrect(-86, y, 34, 12, 2, T.lin(0, y, 0, y + 12, [[0, '#6a6a74'], [1, '#2a2a32']])); T.ell(-78, y + 6, 2, 2, '#c8c8d0'); T.ell(-60, y + 6, 2, 2, '#c8c8d0'); } T.ell(50, -60, 8, 8, T.rad(47, -63, 8, [[0, '#ffe08a'], [1, '#8a6a1a']])); });
    if (q.id === 'done') { const H = R.club.hatch; return at(H[0], H[1], img('tree-hatch-open', -132, -124, 214, 128, T => { T.rrect(-78, -118, 156, 118, 6, '#1e1208'); T.rrect(-70, -110, 140, 102, 4, T.lin(0, -110, 0, -8, [[0, '#a8e090'], [1, '#4a8a3a']])); T.glow(0, -60, 70, '#e8ffd0', .35); T.fill('M-78 -118L-128 -100V-8L-78 0Z', T.lin(-128, 0, -78, 0, [[0, '#6a4626'], [1, '#a8764a']])); T.grain(-126, -112, 46, 108, '#4a2e14', .3, true, 4); })); }
    if (q.id === 0) return img('tree-book', -44, -100, 88, 106, T => { T.soft(0, 0, 36, 6, .45); T.rrect(-34, -74, 68, 74, 3, T.lin(-34, 0, 34, 0, [[0, '#7a5434'], [1, '#3a2412']])); T.grain(-34, -74, 68, 74, '#2a180a', .25, true, 4); T.rrect(-38, -78, 76, 7, 2, '#8a6440'); T.fill('M-26 -78L0 -84L26 -78L24 -90L0 -96L-24 -90Z', T.lin(0, -96, 0, -78, [[0, '#fffaf0'], [1, '#e0d4b4']])); T.stroke('M0 -84V-96', '#a83a2a', 2); for (let i = 0; i < 3; i++) { T.stroke(`M-20 ${-88 + i * 2.5}L-6 ${-91 + i * 2.5}`, '#4a3a5a', .6, .5); T.stroke(`M6 ${-91 + i * 2.5}L20 ${-88 + i * 2.5}`, '#4a3a5a', .6, .5); } });
    return null;
  }

  /* ---------- the ice house: the floor of ice, the block, the cold box ---------- */
  function icehouse(q, R, S) {
    const G = R.ice;
    const box = (full, open) => img('ice-box-' + (open ? 'o' : full ? 'f' : 'e'), -92, -106, 184, 112, T => {
      T.soft(0, 0, 84, 8, .5); T.rrect(-76, -80, 152, 80, 4, T.lin(-76, 0, 76, 0, [[0, '#8aa8b4'], [.4, '#6e8e9c'], [1, '#3a5460']])); T.stroke('M-60 -44H60M-60 -24H60', '#4a6470', 3); for (const x of [-62, 62]) T.rrect(x - 4, -76, 8, 72, 2, T.lin(0, -80, 0, 0, [[0, '#a8b0b8'], [1, '#4a525a']]));
      T.rrect(-80, -92, 160, 14, 3, T.lin(0, -92, 0, -78, [[0, full ? '#c8e4ec' : '#5a7480'], [1, full ? '#88aab8' : '#2a404a']]));
      if (open) { T.rrect(-80, -92, 160, 14, 3, '#e4f6fc', .7); T.stroke('M-70 -92L-50 -60M60 -92L40 -70', '#fff', 2.4, .8); T.ell(-30, -86, 30, 3, '#fff', .5); }
      if (full) { T.glow(0, -60, 30, '#fff4b8', .7); T.ell(0, -60, 6, 6, '#fff8d8'); }
    });
    if (q.id === 'bx') return box(false, true);
    if (q.id === 0) return box(!!S.k, false);
    if (q.id === 'ice') {
      const lvl = _GRM_ICE.indexOf(S.L), self = _grmSlide, [ox, oy] = self.at(R, 0, 0), x0 = ox - G.cw / 2 - 20, y0 = oy - G.ch - 30, x1 = self.at(R, S.W - 1, S.H - 1)[0] + G.cw / 2 + 20, y1 = self.at(R, S.W - 1, S.H - 1)[1] + 10;
      return img('ice-floor-' + R.id + '-' + lvl, x0, y0, x1 - x0, y1 - y0, T => {
        for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) { const [px, py] = self.at(R, x, y), c = (x + y) % 2 ? '#d8eef6' : '#c0dcea'; T.rrect(px - G.cw / 2 + 1, py - G.ch + 1, G.cw - 2, G.ch - 2, 3, T.lin(px - G.cw / 2, py - G.ch, px + G.cw / 2, py, [[0, T.shade(c, .3)], [.5, c], [1, T.shade(c, -.15)]]), .9); T.stroke(`M${px - G.cw / 2 + 6} ${py - G.ch + 6}l${G.cw * .35} ${G.ch * .2}`, '#fff', 1.2, .45); if (T.r() < .4) T.stroke(`M${px + T.rnd(-30, 20)} ${py - T.rnd(6, 30)}l${T.rnd(8, 20)} ${T.rnd(-6, 6)}l${T.rnd(4, 12)} ${T.rnd(-4, 8)}`, '#88b8cc', .8, .6); }
        const [gx, gy] = self.at(R, S.L.goal[0], S.L.goal[1]); T.rrect(gx - G.cw / 2 + 4, gy - G.ch + 3, G.cw - 8, G.ch - 6, 3, T.lin(0, gy - G.ch, 0, gy, [[0, '#f0d070'], [1, '#b89040']])); for (let i = 0; i < 70; i++) T.stroke(`M${gx + T.rnd(-38, 34)} ${gy - T.rnd(6, 34)}l${T.rnd(4, 10)} ${T.rnd(-3, 3)}`, T.pick(['#8a6a2a', '#fff0a0', '#c8a040']), .9, .8);
        for (const [x, y] of S.L.pegs) { const [px, py] = self.at(R, x, y); T.soft(px, py - 4, 26, 8, .4); T.blob(px, py - 16, 24, 18, T.rad(px - 8, py - 24, 30, [[0, '#b8c4cc'], [.6, '#7a8a94'], [1, '#3a4650']]), 1, 9, .25); T.ell(px - 7, py - 24, 8, 4, '#e8f4f8', .6); }
      });
    }
    if (q.id === 'blk') {
      const motion = gardenMotionOn(), [bx, by] = _grmSlide.at(R, motion ? S.px : S.x, motion ? S.py : S.y);
      return `<g class="grm-block" transform="translate(${bx} ${by})">${img('ice-block', -46, -72, 96, 78, T => {
        T.soft(0, -2, 38, 9, .45, '#0a2030'); T.rrect(-30, -52, 60, 48, 6, T.lin(-30, -52, 30, -4, [[0, '#e8f8ff'], [.5, '#a8d8ec'], [1, '#6aa8c4']]), .95);
        T.fill('M-30 -52L-18 -62H40L30 -52Z', T.lin(0, -62, 0, -52, [[0, '#ffffff'], [1, '#d4f0fa']])); T.fill('M30 -52L40 -62V-14L30 -4Z', T.lin(30, 0, 40, 0, [[0, '#7ab8d0'], [1, '#4a88a4']]));
        T.stroke('M-20 -40L-6 -20M4 -44L14 -30', '#fff', 2.4, .8); T.stroke('M-10 -30l8 6l-4 8', '#5a9ab8', 1, .6); for (let i = 0; i < 8; i++) T.ell(T.rnd(-24, 24), T.rnd(-46, -10), 1.6, 1.6, '#fff', .6); T.glow(-8, -30, 26, '#e8faff', .3);
      })}</g>`;
    }
    if (/^[rldu]$/.test(String(q.id))) { const a = { r: 0, l: 180, d: 90, u: 270 }[q.id]; return `<g opacity="${S.moving ? 0 : 1}" transform="translate(0 -22) rotate(${a})">${halo(0, 0, 26, '#bfe6f4', .45)}<circle cx="0" cy="0" r="18" fill="#163444" opacity=".88"/><circle cx="-4" cy="-5" r="9" fill="#5a8aa0" opacity=".35"/><path d="M-8 -7L8 0L-8 7Z" fill="#ffe9a8"/></g>`; }
    return null;
  }

  /* ---------- the windmill cap: the great wheel, the brake ---------- */
  function capfloor(q, R, S) {
    if (q.id === 'wheel') return `<path d="M0 -172V-136" stroke="#2a1a0a" stroke-width="10" stroke-linecap="round"/><path d="M0 -170V-138" stroke="#ffd86a" stroke-width="6" stroke-linecap="round"/>${halo(0, -168, 20, '#ffe08a', .6)}<g transform="rotate(${(S.goal * 180 / Math.PI * -1).toFixed(1)})"><g class="grm-turn">${img('cap-wheel', -160, -160, 320, 320, T => {
      T.ell(0, 0, 150, 150, '#000', .0);
      for (let i = 0; i < 16; i++) save(T.cx, () => { T.cx.rotate(i * Math.PI / 8); T.rrect(-11, -154, 22, 26, 3, T.lin(-11, 0, 11, 0, [[0, '#8a6038'], [.5, '#6a4626'], [1, '#3a2410']])); T.rect(-9, -153, 18, 2.5, '#c8985a', .6); if (i === 0) { T.rrect(-12, -156, 24, 30, 3, T.lin(-12, 0, 12, 0, [[0, '#ffe8a0'], [.5, '#e0b040'], [1, '#8a6018']])); } });
      T.ell(0, 0, 134, 134, T.rad(-30, -40, 170, [[0, '#9a7048'], [.7, '#7a5634'], [1, '#4a3018']])); T.ell(0, 0, 112, 112, T.rad(0, 0, 112, [[0, '#2a1a0c'], [.85, '#3e2a16'], [1, '#2a1a0a']]));
      for (let i = 0; i < 4; i++) save(T.cx, () => { T.cx.rotate(i * Math.PI / 4); T.rrect(-114, -7, 228, 14, 3, T.lin(0, -7, 0, 7, [[0, '#a07a50'], [.5, '#7a5634'], [1, '#3e2a16']])); T.grain(-114, -7, 228, 14, '#2a1a0a', .3, false, 3); });
      for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12; T.ell(Math.cos(a) * 123, Math.sin(a) * 123, 2, 2, '#2a1a0a', .8); }
      T.ell(0, 0, 26, 26, T.rad(-6, -6, 28, [[0, '#7a7a80'], [1, '#1e1e22']])); T.ell(0, 0, 9, 9, '#0e0e10'); T.ell(-8, -9, 6, 3, '#fff', .3);
    })}</g></g>`;
    if (q.id === 0) return img('cap-lever', -40, -142, 80, 148, T => { T.soft(0, 0, 30, 5, .45); T.rrect(-22, -14, 44, 14, 3, T.lin(0, -14, 0, 0, [[0, '#6a4a2a'], [1, '#2a1a0a']])); T.stroke('M0 -14L-20 -120', '#3a2410', 11); T.stroke('M0 -14L-20 -120', '#8a6038', 8); T.stroke('M-2 -18L-21 -118', '#d8a870', 2, .6); T.ell(-20, -124, 11, 11, T.rad(-24, -128, 13, [[0, '#ff8a7a'], [.6, '#c8483a'], [1, '#6a1810']])); T.ell(-24, -128, 3.4, 2.4, '#fff', .6); })
      + [0, 1, 2].map(i => i < S.hits ? halo(24, -30 - i * 22, 14, '#ffd86a', .7) + glowDot(24, -30 - i * 22, 6.5, '#fff0a0', 1) : glowDot(24, -30 - i * 22, 7, '#1e1208', .9) + glowDot(23, -31 - i * 22, 2.4, '#5a4028', .8)).join('');
    return null;
  }

  const ROOMS = { cellar: (q, R, S) => typeof q.id === 'number' && S.deck ? jar(S.up.includes(q.id) || S.got.has(q.id), S.deck[q.id]) + (S.got.has(q.id) ? sparkle(0, -66, .7) : '') : null,
    den, boatloft: boat, lampcup, nowhere, owl: (q, R, S) => q.id === 0 ? owl(!!S.won) : null, grotto, falls, lamproom, ringers, barnloft: barn, parlour, hut, treehouse: tree, icehouse, capfloor };
  function art(s, q) {
    const fn = ROOMS[s.R.id], S = _grm.S; if (!fn || !S || q.cls === 'grm-furn' || String(q.id).startsWith('fu-')) return null;
    sceneNow = s.context.scene; pending = 0;
    try { const out = fn(q, s.R, S); return out != null && pending ? '' : out; } catch (e) { console.error('[room pieces]', s.R.id, q.id, e); return null; } finally { sceneNow = null; }
  }
  return { art, stats };
})();
