/* The Painted village's props, gates, waterfall and decorations, in the
 * opening scenes' flat-vector house style (soft shading lit from the upper
 * left, no outlines, lobed natural shapes; docs/dev/SCENE_LESSONS.md).
 *
 * Everything still is baked once into a canvas that becomes a Phaser texture
 * (keyed by what it shows, so a redraw reuses it); only moving parts stay
 * live, as plain images whose position, scale or alpha changes: water
 * streaks on a tile sprite, spray puffs, ripples, a bobbing boat, a gate's
 * barrier going away the moment it opens. Positions come from the layout
 * (props, gates, sights, features), so the same painters serve the current
 * island and the Fleetwater Vale. Only rendering: cells, walking, picking and
 * saved rows are untouched. Nothing here runs at load. */
window.GardenPaintedProps = (function () {
  'use strict';
  const K = 2, TEX = 'gpp';                              // canvas pixels per world pixel (sharp at close zoom)
  let lastError = null, baked = 0, bakeMs = 0;
  const gateSeen = new Map();                            // gate id -> last drawn open state (an opening plays once)
  const ok = f => { try { return f(); } catch (e) { lastError = String(e && e.stack || e); return null; } };
  const D = () => sceneDraw;
  function rng(seed) { let s = (seed >>> 0) % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const paths = new Map();
  const P2 = d => { let p = paths.get(d); if (!p) { if (paths.size > 6000) paths.clear(); p = new Path2D(d); paths.set(d, p); } return p; };

  /* ---------- palettes (the scene kit's colours) ---------- */
  const WOOD = ['#9a7a54', '#7a5e40', '#c4a478', '#4a3a2c'], OAK = ['#8a6a46', '#6a5034', '#b08c5e', '#3e3022'];
  const STONE = ['#c9c1aa', '#a89f88', '#e4ddc8', '#867d69'], SLATE = ['#5f6b70', '#47525a', '#7d8a8e'], IRON = ['#2a2e30', '#4a5054', '#1a1c1e'];
  const MOSS = ['#7d8f4e', '#a3b06a', '#5f723c'];
  const LEAF = {
    summer: ['#46703a', '#5e8a44', '#82aa58', '#a9c674'], spring: ['#4d7a3c', '#69984a', '#8fba5e', '#c2dc8a'],
    autumn: ['#7a5a2c', '#b0682a', '#d38f3a', '#e9bd5a'], winter: ['#5f6f5e', '#77877a', '#98a698', '#c4cec4'],
  };
  const leafOf = season => LEAF[season] || LEAF.summer;

  /* ---------- the brush: world units, drawn into a supersampled canvas ---------- */
  function brush(cx) {
    const B = {
      cx,
      f(d, fill, op) { cx.globalAlpha = op == null ? 1 : op; cx.fillStyle = fill; cx.fill(P2(d)); cx.globalAlpha = 1; return B; },
      s(d, stroke, w, op, cap) { cx.globalAlpha = op == null ? 1 : op; cx.strokeStyle = stroke; cx.lineWidth = w; cx.lineCap = cap || 'round'; cx.lineJoin = 'round'; cx.stroke(P2(d)); cx.globalAlpha = 1; return B; },
      lin(x1, y1, x2, y2, stops) { const g = cx.createLinearGradient(x1, y1, x2, y2); for (const [o, c] of stops) g.addColorStop(o, c); return g; },
      rad(x, y, r, stops) { const g = cx.createRadialGradient(x, y, 0, x, y, r); for (const [o, c] of stops) g.addColorStop(o, c); return g; },
      rect: (x, y, w, h) => D().rect(x, y, w, h), ell: (x, y, rx, ry) => D().ell(x, y, rx, ry), poly: pts => D().poly(pts), circ: (x, y, r) => D().circ(x, y, r),
      rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); return `M${x + r} ${y}h${w - 2 * r}q${r} 0 ${r} ${r}v${h - 2 * r}q0 ${r} ${-r} ${r}h${-(w - 2 * r)}q${-r} 0 ${-r} ${-r}v${-(h - 2 * r)}q0 ${-r} ${r} ${-r}z`; },
      // a soft ground shadow (the scenes' contact shadow): an ellipse fading out
      shadow(x, y, rx, ry, op) { cx.save(); cx.translate(x, y); cx.scale(1, ry / rx); cx.fillStyle = B.rad(0, 0, rx, [[0, 'rgba(46,52,30,' + (op || .28) + ')'], [.6, 'rgba(46,52,30,' + (op || .28) * .55 + ')'], [1, 'rgba(46,52,30,0)']]); cx.beginPath(); cx.arc(0, 0, rx, 0, Math.PI * 2); cx.fill(); cx.restore(); return B; },
      // an upright timber or stone member, lit from the upper left
      post(x, top, bottom, w, pal) { B.f(B.rect(x - w / 2, top, w, bottom - top), pal[0]).f(B.rect(x - w / 2, top, Math.max(1, w * .28), bottom - top), pal[2], .55).f(B.rect(x + w / 2 - w * .3, top, w * .3, bottom - top), pal[1], .7); return B; },
      beam(x, y, w, h, pal) { B.f(B.rect(x, y, w, h), pal[0]).f(B.rect(x, y, w, Math.max(.8, h * .3)), pal[2], .6).f(B.rect(x, y + h * .7, w, h * .3), pal[1], .6); return B; },
      // a lobed stone: base, a light face to the upper left, a shade below, moss on top
      stone(r, x, y, rx, ry, pal, moss) {
        B.f(D().blob(r, x, y, rx, ry, 7, .35), pal[1]).f(D().blob(r, x - rx * .18, y - ry * .2, rx * .78, ry * .7, 7, .3), pal[0]).f(D().blob(r, x - rx * .34, y - ry * .38, rx * .42, ry * .34, 6, .3), pal[2], .8);
        if (moss) B.f(D().blob(r, x - rx * .1, y - ry * .72, rx * .55, ry * .28, 7, .5), moss[0], .85).f(D().blob(r, x - rx * .25, y - ry * .82, rx * .3, ry * .16, 6, .5), moss[1], .8);
        return B;
      },
      // a crown of leaves in the scenes' three tones: dark below right, mid, light upper left
      crown(r, x, y, rx, ry, season, n) {
        const L = leafOf(season), k = n || 5;
        for (let i = 0; i < k; i++) { const a = i / k * Math.PI * 2, px = x + Math.cos(a) * rx * .42, py = y + Math.sin(a) * ry * .38; B.f(D().blob(r, px + rx * .08, py + ry * .1, rx * .62, ry * .6, 8, .4), L[0]); }
        B.f(D().blob(r, x, y, rx * .9, ry * .82, 10, .38), L[1]);
        for (let i = 0; i < 4; i++) B.f(D().blob(r, x - rx * .28 + (r() - .5) * rx * .5, y - ry * .3 + (r() - .5) * ry * .4, rx * .38, ry * .32, 7, .45), L[2], .9);
        for (let i = 0; i < 3; i++) B.f(D().blob(r, x - rx * .4 + r() * rx * .3, y - ry * .5 + r() * ry * .25, rx * .16, ry * .13, 6, .5), L[3], .8);
        if (season === 'autumn') for (let i = 0; i < 3; i++) B.f(D().blob(r, x + (r() - .3) * rx, y + (r() - .4) * ry, rx * .26, ry * .2, 7, .5), ['#c45a26', '#e0a040', '#8e8a3c'][i], .85);
        if (season === 'spring') for (let i = 0; i < 14; i++) B.f(B.circ(x + (r() - .5) * rx * 1.5, y + (r() - .5) * ry * 1.3, 1.3), r() < .5 ? '#f4d8e0' : '#fff4f4', .9);
        return B;
      },
      tufts(r, x, y, w, n, season) { const L = leafOf(season); for (let i = 0; i < n; i++) { const px = x + (r() - .5) * w, h = 4 + r() * 6; B.s(`M${px} ${y}q${(r() - .5) * 3} ${-h * .6} ${(r() - .5) * 5} ${-h}`, i % 2 ? L[1] : L[2], 1.2, .9); } return B; },
      flowers(r, x, y, w, n, cols) { for (let i = 0; i < n; i++) { const px = x + (r() - .5) * w, py = y - r() * 4; B.s(`M${px} ${py + 3}v-3`, '#5e8a44', .8).f(B.circ(px, py - .6, 1.4), cols[i % cols.length]); } return B; },
      text(t, x, y, size, color, font, weight) { cx.font = (weight || '') + ' ' + size + 'px ' + (font || 'Georgia, serif'); cx.fillStyle = color; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(t, x, y); return B; },
    };
    return B;
  }
  /** Bake a drawing once: box [x0, y0, x1, y1] in world px round its anchor (0, 0). Returns the texture key. */
  function bake(scene, key, box, draw) {
    const full = TEX + '|' + key;
    if (scene.textures.exists(full)) return full;
    const t0 = performance.now(), [x0, y0, x1, y1] = box, w = Math.ceil((x1 - x0) * K), h = Math.ceil((y1 - y0) * K);
    if (w < 2 || h < 2 || w > 4096 || h > 4096) return null;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d');
    cx.setTransform(K, 0, 0, K, -x0 * K, -y0 * K);
    if (ok(() => draw(brush(cx), cx)) === false) return null;
    const tex = scene.textures.addCanvas(full, c); tex.customData = Object.assign(tex.customData || {}, { gpp: { ox: -x0 / (x1 - x0), oy: -y0 / (y1 - y0) } });
    baked++; bakeMs += performance.now() - t0; return full;
  }
  function image(scene, key, x, y) {
    if (!key) return null; const meta = scene.textures.get(key).customData.gpp;
    return scene.add.image(x, y, key).setOrigin(meta.ox, meta.oy).setScale(1 / K);
  }
  /** A library object (70-scene-lib-*) as an image, through the Painted village's own baker. */
  function libImage(scene, id, v, season, size, x, y, night) {
    const GP = window.GardenNativePainted; if (!GP || !GP.objectImage || typeof sceneObj !== 'function' || !sceneObj(id)) return null;
    return GP.objectImage(scene, id, v, season, size, x, y, night);
  }

  /* ---------- the handle every painter returns ---------- */
  function handle(scene, o, id, extra) {
    const node = o.element(scene, 'g', { class: 'gd-it gd-prop gd-painted gd-painted-' + (extra.cls || 'prop'), 'data-prop': id });
    const parts = [], moving = [], over = [];
    let dead = false, clock = 0, last = null, paused = false;
    const add = (im, under) => { if (!im) return null; if (under) node._inner.addAt(im, 0); else node._inner.add(im); parts.push(im); return im; };
    const h = {
      root: node.target, rootNode: node, painted: true, cacheNodes: [], bounds: null, lights: [], kind: extra.kind || undefined, dynamic: false,
      // above the night grade (light, not paint): soft pools and halos
      over(im) { if (!im) return null; const layer = o.layer; if (layer && layer.add) { layer.add(im); im.setDepth(80005); over.push(im); } else node._inner.add(im); return im; },
      add, move(im, fn) { if (im) { moving.push({ im, fn }); h.dynamic = true; if (!h.kind) h.kind = 'painted'; } return im; },
      // Bounds include transparent canvas padding and soft ground shadows.
      // Only the opaque painted parts own a visual hit; canonical feet and
      // doors are handled separately by the world's picking rules.
      hitPoint(x, y) {
        if (dead || !node.target.visible || !node.target.active) return false;
        for (let i = parts.length - 1; i >= 0; i--) {
          const im = parts[i], frame = im.frame;
          if (!im.active || !im.visible || im.alpha <= .025 || !frame || !im.texture) continue;
          const m = im.getWorldTransformMatrix(); if (Math.abs(m.a * m.d - m.b * m.c) < 1e-10) continue;
          const p = m.applyInverse(x, y), width = frame.realWidth, height = frame.realHeight;
          let px = Math.floor(p.x + im.displayOriginX), py = Math.floor(p.y + im.displayOriginY);
          if (px < 0 || py < 0 || px >= width || py >= height) continue;
          if (im.flipX) px = width - px - 1; if (im.flipY) py = height - py - 1;
          if (scene.textures.getPixelAlpha(px, py, im.texture.key, frame.name) >= 96) return true;
        }
        return false;
      },
      update(time) {
        if (dead || !moving.length) return; const dt = last == null ? 0 : Math.min(.08, Math.max(0, (time - last) / 1000)); last = time;
        const motion = !paused && (typeof gardenMotionOn !== 'function' || gardenMotionOn()); if (motion) clock += dt;
        if (!node.target.visible) return;
        for (let i = moving.length - 1; i >= 0; i--) { const m = moving[i]; if (m.fn(m.im, clock, motion) === false) { m.im.destroy(); moving.splice(i, 1); } }
      },
      pauseAmbient(state) { paused = !!(state && (state.hush || state.frozen)); },
      setLitWindows() {},
      destroy() { if (dead) return; dead = true; for (const im of over) im.destroy(); over.length = 0; node.remove(); },
    };
    return h;
  }
  function finish(h, b, foot) { h.bounds = b; h.rootNode.nativeBounds = b; if (foot) h.foot = foot; return h; }

  /* ---------- the props of the village ---------- */
  const SIGN = (B, x, y, w, label, size) => { B.f(B.rr(x - w / 2 + 1, y - 6, w, 13, 2.5), 'rgba(40,32,20,.25)').f(B.rr(x - w / 2, y - 7.5, w, 13, 2.5), '#efe4c6').f(B.rect(x - w / 2 + 1, y - 7.5, w - 2, 1.4), '#fff8e6', .8).text(label, x, y - .8, size || 7.2, '#4a3b26'); };
  const PAINT = {
    // UK pillar box: a red drum with a domed cap, the slot, a white plate, a black plinth
    postbox: { box: [-20, -64, 24, 8], draw(B, o) {
      const r = rng(5); B.shadow(2, 1, 17, 5, .3);
      B.f(B.rr(-10, -6, 20, 7, 1.5), IRON[0]).f(B.rect(-10, -6, 20, 1.2), IRON[1]);
      B.f(B.rect(-9, -44, 18, 39), B.lin(-9, 0, 9, 0, [[0, '#d65a48'], [.35, '#c03a2e'], [1, '#86241c']]));
      B.f(B.ell(0, -44, 9, 3), '#a42c22').f('M-10 -45q0 -12 10 -12q10 0 10 12z', B.lin(-10, -57, 8, -45, [[0, '#dc6450'], [1, '#922820']])).f(B.ell(-3, -52, 3, 1.6), '#f08a72', .55);
      B.f(B.rect(-10, -46, 20, 2.4), '#8e2820').f(B.rr(-6, -38, 12, 2.6, 1), '#2a1a16').f(B.rect(-6, -38, 12, .8), '#6a2a22');
      B.f(B.rr(-5, -31, 10, 8, 1), '#f4eee0').s('M-3 -28h6M-3 -25.5h4', '#8a8478', .7).f(B.rect(-9, -10, 18, 2), '#8e2820');
      B.f(B.rect(-8.2, -43, 2.2, 36), '#ee8a70', .35);
      // a letter waiting on the plinth, and grass at the foot
      B.f(B.poly([[7, -4], [17, -7], [19, -1], [9, 2]]), '#fbf6ea').s('M7 -4l6 1.5l6 -4.5', '#c8bfa8', .7);
      B.tufts(r, 0, 1, 26, 9, o.season);
    } },
    // the field journal: an oak lectern, the book open on fish and bugs, a quill
    lectern: { box: [-26, -64, 26, 8], draw(B, o) {
      const r = rng(8); B.shadow(2, 1, 18, 5, .28);
      B.f(B.poly([[-12, 1], [-4, -6], [4, -6], [12, 1]]), OAK[1]).f(B.poly([[-12, 1], [-4, -6], [0, -6], [-5, 1]]), OAK[2], .5);
      B.post(0, -36, -5, 7, OAK);
      B.f(B.poly([[-20, -36], [20, -36], [16, -48], [-16, -48]]), OAK[1]).f(B.poly([[-19, -38], [19, -38], [15.5, -47], [-15.5, -47]]), OAK[0]);
      B.f(B.poly([[-17, -40], [0, -38.5], [0, -52], [-15, -54]]), '#f7f0dc').f(B.poly([[17, -40], [0, -38.5], [0, -52], [15, -54]]), '#ece2c8');
      B.f(B.rect(-.6, -52, 1.2, 13.5), '#c9bd9c');
      for (let i = 0; i < 4; i++) B.s(`M-13 ${-49 + i * 2.4 + i * .1}l9 .6`, '#a8a08a', .6, .9);
      B.f(B.ell(8, -47, 4.4, 1.8), '#6d93a4').f(B.poly([[11.5, -47], [14, -49], [14, -45]]), '#6d93a4').f(B.circ(6, -47.4, .5), '#2a2e30');
      B.s('M5 -43l6 .4', '#a8a08a', .6).s('M5 -41l5 .3', '#a8a08a', .6);
      B.s('M17 -46q4 -10 9 -15', '#f6f1e4', 2.2).s('M17 -46q4 -10 9 -15', '#d9d0bc', .6).f(B.ell(25, -59, 2.2, 4.6), '#fbf8ef', .95);
      B.f(B.rect(-20, -37.5, 40, 1.2), OAK[2], .7);
      B.tufts(r, 0, 1, 30, 8, o.season);
    } },
    // the sundial: a stone baluster, a bronze dial and its gnomon, flowers at its foot
    sundial: { box: [-24, -50, 24, 8], draw(B, o) {
      const r = rng(9); B.shadow(3, 1, 20, 6, .26);
      B.f(B.ell(0, 0, 14, 4.2), STONE[1]).f(B.ell(0, -1.5, 13, 3.6), STONE[0]).f(B.ell(-3, -2.4, 7, 1.6), STONE[2], .6);
      B.f('M-6 -2q-3 -8 0 -14q-3 -7 0 -13h12q3 6 0 13q3 6 0 14z', B.lin(-7, 0, 7, 0, [[0, STONE[2]], [.45, STONE[0]], [1, STONE[3]]]));
      B.f(B.ell(0, -31, 12, 3.6), STONE[1]).f(B.ell(0, -32.5, 12, 3.6), STONE[0]).f(B.ell(0, -33, 9.5, 2.8), '#b08a4c').f(B.ell(-2, -33.6, 6, 1.6), '#d4b070', .7);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; B.f(B.circ(Math.cos(a) * 8, -33 + Math.sin(a) * 2.3, .45), '#6a5028'); }
      B.f(B.poly([[0, -33], [5.5, -33.4], [0, -39]]), '#8a6a36').f(B.poly([[0, -33], [1.4, -33.1], [0, -39]]), '#c8a464');
      B.f(B.poly([[0, -33], [9, -31.5], [8.5, -30.5]]), 'rgba(60,40,20,.35)');
      B.f(B.rect(-5.5, -28, 2, 24), STONE[2], .45);
      B.flowers(r, -10, 0, 9, 6, ['#e8c84a', '#f2f0e8', '#c86aa0']).flowers(r, 11, 1, 9, 5, ['#9a7ad0', '#f2f0e8']).tufts(r, 0, 2, 32, 8, o.season);
    } },
    // the camera: a wooden tripod and a brass and leather box camera, its lens catching light
    tripod: { box: [-22, -64, 22, 8], draw(B, o) {
      const r = rng(4); B.shadow(1, 1, 16, 4.5, .24);
      B.s('M0 -38L-13 1', WOOD[1], 2.6).s('M0 -38L13 1', WOOD[0], 2.6).s('M0 -38L2 2', WOOD[1], 2.4).s('M-.6 -37L-12.6 0', WOOD[2], .8, .7);
      B.f(B.rect(-4, -40, 8, 3), IRON[1]);
      B.f(B.rr(-11, -55, 22, 15, 2), '#3e3228').f(B.rr(-11, -55, 22, 4, 2), '#5a4a3a').f(B.rect(-11, -46, 22, 1.4), '#b89a58');
      B.f(B.rect(-7, -59, 7, 4), '#2e2620').f(B.circ(6, -48, 6), '#b89a58').f(B.circ(6, -48, 4.4), '#2a2e30').f(B.circ(6, -48, 2.6), '#4e6a80').f(B.circ(4.8, -49.3, 1), '#e8f2f6', .9);
      B.f(B.rect(-9, -53, 5, 2), '#e8e0cc', .5);
      B.tufts(r, 0, 2, 28, 7, o.season);
    } },
    // the crafting bench: a thick oak top, a vice, a rack of tools, shavings, a pot of brushes
    bench: { box: [-58, -96, 58, 10], draw(B, o) {
      const r = rng(12); B.shadow(4, 2, 58, 9, .3);
      // the back rack with its tools
      B.post(-42, -88, -36, 4, OAK).post(42, -88, -36, 4, OAK).beam(-46, -90, 92, 5, OAK);
      B.f(B.rect(-40, -85, 80, 30), '#b5966a').f(B.rect(-40, -85, 80, 3), '#cdb184', .8);
      for (let i = 0; i < 4; i++) B.s(`M-40 ${-78 + i * 7}h80`, '#9a7c54', .6, .7);
      B.s('M-30 -82v18', '#6a5034', 2.2).f(B.poly([[-35, -66], [-25, -66], [-26, -59], [-34, -59]]), '#8a949a');                                  // a mallet
      B.f(B.poly([[-18, -82], [-6, -82], [-6, -62], [-18, -66]]), '#a9b4b8').f(B.rect(-18, -84, 12, 3), OAK[0]).s('M-16 -70l2 -2l2 2l2 -2l2 2', '#6e787c', .6);   // a saw
      B.s('M4 -82q-4 6 0 12M12 -82q4 6 0 12', '#5e6a70', 1.4).f(B.circ(4, -69, 2.4), '#c04a3a').f(B.circ(12, -69, 2.4), '#c04a3a');     // shears
      B.f(B.rr(22, -82, 12, 16, 2), '#6a8a70').f(B.rect(22, -82, 12, 3), '#86a68a');                                                           // a tin of nails
      B.f(B.ell(-2, -88, 6, 3), '#d7c294').s('M-6 -89q4 -5 8 0', '#8b6a44', 1.2);                                                              // a ball of twine
      // the bench itself
      B.post(-44, -36, 0, 7, OAK).post(44, -36, 0, 7, OAK).post(-30, -36, 0, 5, OAK).post(30, -36, 0, 5, OAK);
      B.beam(-50, -10, 100, 4, OAK);
      B.f(B.rect(-54, -44, 108, 10), OAK[1]).f(B.rect(-54, -46, 108, 4), '#c8a878').f(B.rect(-54, -46, 108, 1.2), '#e4caa0');
      B.f(B.rect(-54, -36, 108, 2), OAK[3], .45);
      // a vice at the left end, a pot of brushes and a planed board on top, shavings
      B.f(B.rect(-58, -52, 10, 12), '#5a6a70').f(B.rect(-58, -52, 10, 2), '#8a9aa0').s('M-60 -47h-4', '#3a4448', 2);
      B.f(B.rr(30, -60, 9, 14, 2), '#c06a3a').f(B.rect(30, -60, 9, 2.5), '#d88a5a');
      for (const [dx, c] of [[-2, '#e8c84a'], [1, '#5a8ac0'], [4, '#c85a5a']]) B.s(`M${34.5 + dx * .6} -60l${dx} -10`, '#8b6a44', 1).f(B.circ(34.5 + dx * 1.6, -70, 1.4), c);
      B.f(B.poly([[-22, -48], [12, -50], [14, -46], [-20, -45]]), '#e2c996').f(B.poly([[-22, -48], [12, -50], [12, -49], [-22, -47]]), '#f4e2b8');
      for (let i = 0; i < 9; i++) B.s(`M${-40 + r() * 80} ${-2 + r() * 4}q2 -3 4 0`, '#e4caa0', 1.2, .9);
      B.f(B.rr(-14, -33, 28, 9, 2), '#efe4c6').text('CRAFT', 0, -28.4, 6.4, '#4a3b26', 'Inter, sans-serif', '700');
      B.tufts(r, -50, 4, 20, 8, o.season).tufts(r, 50, 4, 20, 8, o.season);
    } },
    // the notice board: two oak posts, a small shingled roof, a cork board full of notes and a rosette
    board: { box: [-56, -112, 56, 10], draw(B, o) {
      const r = rng(21); B.shadow(3, 2, 50, 8, .28);
      B.post(-36, -82, 1, 7, OAK).post(36, -82, 1, 7, OAK);
      B.f(B.rect(-42, -78, 84, 52), OAK[1]).f(B.rect(-39, -75, 78, 46), '#b8946a').f(B.rect(-39, -75, 78, 46), B.lin(-39, -75, 39, -29, [[0, 'rgba(255,240,210,.18)'], [1, 'rgba(60,40,20,.12)']]));
      for (let i = 0; i < 40; i++) B.f(B.circ(-37 + r() * 74, -73 + r() * 42, .6), '#8a6a46', .5);
      const notes = [[-34, -71, 20, 16, '#f6efdc', -3], [-10, -72, 16, 20, '#dfe8ee', 2], [10, -70, 22, 14, '#f3dcdc', -1], [-30, -50, 18, 17, '#eef0d8', 4], [-6, -48, 22, 15, '#f6efdc', -2], [19, -52, 15, 19, '#e8e0f0', 3]];
      for (const [x, y, w, h, c, a] of notes) {
        const cx = B.cx; cx.save(); cx.translate(x + w / 2, y + h / 2); cx.rotate(a * Math.PI / 180);
        B.f(B.rect(-w / 2 + 1, -h / 2 + 1.4, w, h), 'rgba(40,30,20,.22)').f(B.rect(-w / 2, -h / 2, w, h), c);
        for (let i = 0; i < 3; i++) B.s(`M${-w / 2 + 3} ${-h / 2 + 5 + i * 3.4}h${w - 7 - (i === 2 ? 4 : 0)}`, '#9a9488', .7);
        B.f(B.circ(0, -h / 2 + 1.8, 1.3), ['#c84a3a', '#3a7ac0', '#e0b040'][Math.floor(r() * 3)]); cx.restore();
      }
      B.f(B.circ(30, -36, 5), '#3a6ab0').f(B.circ(30, -36, 3), '#e0c050').f(B.poly([[27, -32], [25, -24], [29, -27]]), '#3a6ab0').f(B.poly([[33, -32], [35, -24], [31, -27]]), '#3a6ab0');
      // the roof: two pitches of shingles, light on the left
      B.f(B.poly([[-50, -78], [0, -100], [50, -78], [46, -74], [-46, -74]]), '#5e4632');
      B.f(B.poly([[-48, -79], [0, -99], [0, -76]]), '#8e6a4a').f(B.poly([[48, -79], [0, -99], [0, -76]]), '#6e5038');
      for (let i = 1; i < 5; i++) { const t = i / 5; B.s(`M${-48 + 48 * t} ${-79 - 20 * t}L${-46 + 46 * t} ${-76 + 0}`, '#6e5038', .6, .5); }
      for (let i = 0; i < 4; i++) B.s(`M${-46 + i * 4} ${-80 - i * 4.2}L${-2} ${-80 - i * 4.2 + (i - 1.5) * 0}`, '#a8845e', .7, .6);
      B.s('M-49 -79L0 -100L49 -79', '#b08c62', 1.6).f(B.rect(-2, -103, 4, 5), '#5e4632');
      B.f(B.rr(-18, -22, 36, 11, 2), '#efe4c6').text('NOTICES', 0, -16.4, 6.6, '#4a3b26', 'Inter, sans-serif', '700');
      B.tufts(r, -36, 3, 16, 7, o.season).tufts(r, 36, 3, 16, 7, o.season).flowers(r, -44, 3, 10, 4, ['#e8c84a', '#f2f0e8']);
    } },
    // the lake board: a slate on an A-frame with the forecast and a chalk fish
    lakeboard: { box: [-28, -76, 28, 8], draw(B, o) {
      const r = rng(31); B.shadow(2, 1, 22, 5, .26);
      B.s('M-14 -62L-20 1M14 -62L20 1', OAK[1], 3.2).s('M-14 -62L-19.6 0', OAK[2], .9, .7).s('M-14 -62L-8 -2M14 -62L8 -2', OAK[3], 1.8, .7);
      B.f(B.rr(-18, -66, 36, 40, 2), OAK[0]).f(B.rect(-15, -63, 30, 34), '#3c4a44').f(B.rect(-15, -63, 30, 34), B.lin(-15, -63, 15, -29, [[0, 'rgba(255,255,255,.08)'], [1, 'rgba(0,0,0,.1)']]));
      B.f(B.circ(-8, -55, 3.2), '#f2e6a8', .9); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; B.s(`M${-8 + Math.cos(a) * 4.6} ${-55 + Math.sin(a) * 4.6}l${Math.cos(a) * 1.8} ${Math.sin(a) * 1.8}`, '#f2e6a8', .7, .9); }
      B.f(D().blob(r, 6, -55, 6, 3, 6, .3), '#e8ecea', .85);
      B.s('M-10 -40q8 -6 16 0q-8 6 -16 0zM6 -40l5 -3v6z', '#eef0ea', .9, .9).f(B.circ(-6, -40.6, .6), '#eef0ea');
      B.s('M-11 -33h22', '#eef0ea', .6, .6);
      B.f(B.rect(-18, -27, 36, 2.4), OAK[1]).f(B.rect(-6, -26, 5, 1.6), '#f2f0e8');
      B.tufts(r, 0, 2, 40, 9, o.season);
    } },
    // the smoker: a small brick smokehouse with a tin roof and a chimney
    smoker: { box: [-30, -88, 30, 8], draw(B, o) {
      const r = rng(41); B.shadow(3, 1, 26, 6, .28);
      B.f(B.rect(-20, -40, 40, 40), '#a65a40').f(B.rect(-20, -40, 6, 40), '#c47a5c', .6).f(B.rect(12, -40, 8, 40), '#7c3e2c', .6);
      for (let y = -36; y < 0; y += 5) for (let x = -20 + ((y / 5) & 1) * 4; x < 20; x += 8) B.f(B.rect(x + .5, y + .5, 7, 4), r() < .5 ? '#b46a4c' : '#984e38', .55);
      B.f(B.rr(-8, -26, 16, 24, 1.5), '#3e2a20').f(B.rect(-7, -25, 14, 3), '#5a3e30').f(B.circ(5, -14, 1), '#c8a464');
      B.f(B.poly([[-26, -38], [0, -54], [26, -38], [24, -35], [-24, -35]]), '#7a858a').f(B.poly([[-26, -38], [0, -54], [0, -36]]), '#9aa6aa');
      for (let i = -3; i <= 3; i++) B.s(`M${i * 7} ${-38 - (3 - Math.abs(i)) * 0}L0 -54`, '#6a7478', .5, .5);
      B.post(12, -66, -44, 8, ['#8e4a36', '#6e382a', '#b0664e']).f(B.rect(10, -68, 12, 3), '#5a3428');
      for (let i = 0; i < 3; i++) B.f(D().blob(r, 17 + i * 4, -74 - i * 5, 5 + i * 1.5, 3.6 + i, 7, .4), '#e8e6e0', .5 - i * .12);
      B.tufts(r, 0, 2, 46, 10, o.season);
    } },
    // a mooring post with a coil of rope
    post: { box: [-12, -40, 14, 6], draw(B) {
      B.shadow(1, 1, 8, 3, .25).post(0, -30, 0, 8, OAK).f(B.ell(0, -30, 4, 1.6), '#b08c5e');
      B.s('M-4.5 -22q4.5 2.6 9 0M-4.5 -18q4.5 2.6 9 0', '#d8c08a', 2).s('M4 -20q5 4 3 12', '#d8c08a', 1.8);
    } },
    // a wishing well: a stone ring, oak posts, a little roof, a bucket on its rope
    well: { box: [-40, -96, 40, 10], draw(B, o) {
      const r = rng(51); B.shadow(3, 2, 34, 8, .3);
      B.f(B.ell(0, -22, 26, 8), '#2e3a3a').f(B.rect(-26, -22, 52, 22), STONE[1]).f(B.ell(0, 0, 26, 8), STONE[1]);
      for (let row = 0; row < 4; row++) for (let i = 0; i < 7; i++) { const x = -26 + i * 7.6 + (row & 1) * 3.6, y = -21 + row * 5.4; B.f(B.rr(x + .5, y, 6.6, 4.6, 1.4), r() < .5 ? STONE[0] : STONE[2], .9); }
      B.f(B.ell(0, -22, 26, 8), STONE[0]).f(B.ell(0, -22, 21, 5.6), '#24302e').f(B.ell(-3, -21, 12, 3), '#3e5a5a', .8).f(B.ell(-4, -22, 4, 1), '#8ab4b4', .6);
      B.post(-22, -76, -18, 5, OAK).post(22, -76, -18, 5, OAK);
      B.s('M-22 -60h44', OAK[1], 2.4).f(B.circ(22, -60, 3), OAK[3]).s('M22 -60l6 5', OAK[3], 2);
      B.s('M2 -60v18', '#d8c08a', .9).f(B.poly([[-3, -42], [7, -42], [6, -34], [-2, -34]]), OAK[1]).f(B.rect(-3, -42, 10, 1.6), '#9aa4a8');
      B.f(B.poly([[-32, -72], [0, -90], [32, -72], [29, -68], [-29, -68]]), '#5e4632').f(B.poly([[-30, -73], [0, -89], [0, -70]]), '#a07656').f(B.poly([[30, -73], [0, -89], [0, -70]]), '#7a5840');
      B.f(D().blob(r, -24, -12, 8, 5, 7, .5), MOSS[0], .8).f(D().blob(r, 20, -6, 6, 3.6, 7, .5), MOSS[1], .8);
      B.flowers(r, -30, 4, 10, 5, ['#e8c84a', '#f2f0e8', '#c86aa0']).tufts(r, 26, 4, 14, 7, o.season);
    } },
    // a fingerpost: an oak post with three arms pointing on
    sign: { box: [-36, -80, 36, 8], draw(B, o) {
      const r = rng(61); B.shadow(1, 1, 12, 4, .26).post(0, -70, 0, 6, OAK).f(B.ell(0, -70, 3, 1.4), OAK[2]);
      for (const [y, dir, w] of [[-62, 1, 30], [-52, -1, 28], [-42, 1, 24]]) { const x0 = dir > 0 ? 3 : -3, x1 = x0 + dir * w; B.f(B.poly([[x0, y - 4], [x1 - dir * 5, y - 4], [x1, y], [x1 - dir * 5, y + 4], [x0, y + 4]]), '#efe4c6').f(B.rect(Math.min(x0, x1 - dir * 5), y - 4, Math.abs(w - 5), 1.2), '#fff8e6', .8); B.s(`M${x0 + dir * 4} ${y}h${dir * (w - 12)}`, '#8a7a5a', .8, .7); }
      B.tufts(r, 0, 2, 22, 8, o.season);
    } },
    // a stone fountain: a round basin, a fluted column and a bowl, water falling (the drops move)
    fountain: { box: [-50, -84, 50, 12], draw(B, o) {
      const r = rng(71); B.shadow(3, 2, 46, 10, .26);
      B.f(B.ell(0, -8, 42, 13), STONE[1]).f(B.rect(-42, -14, 84, 8), STONE[1]).f(B.ell(0, -14, 42, 13), STONE[0]).f(B.ell(0, -14, 36, 10), '#5e8c98').f(B.ell(-6, -16, 22, 5), '#8ab8c0', .7);
      B.f(B.ell(-10, -17, 6, 1.2), '#e8f4f2', .7).f(B.ell(12, -12, 8, 1.4), '#e8f4f2', .5);
      B.f(B.rect(-5, -50, 10, 38), B.lin(-5, 0, 5, 0, [[0, STONE[2]], [.5, STONE[0]], [1, STONE[3]]]));
      B.f(B.ell(0, -50, 18, 5), STONE[1]).f(B.ell(0, -52, 18, 5), STONE[0]).f(B.ell(0, -52, 14, 3.4), '#6e9aa4');
      B.f(B.ell(0, -58, 3, 6), STONE[0]).f(B.circ(0, -64, 3), STONE[2]);
      B.s('M-14 -50q-4 14 -6 34M14 -50q4 14 6 34', '#d8eef0', 1.4, .55);
      B.f(D().blob(r, -36, -6, 7, 4, 7, .5), MOSS[0], .7).flowers(r, 40, 2, 10, 5, ['#e8c84a', '#f2f0e8']);
    } },
  };
  // A sight's art name or a prop's kind -> its painter (and the size of the classic drawing it replaces).
  const KIND = { postbox: 'postbox', lectern: 'lectern', sundial: 'sundial', tripod: 'tripod', board: 'board', lakeboard: 'lakeboard', smoker: 'smoker', well: 'well', wish: 'well', post: 'sign', fountain: 'fountain' };
  const LIB = {
    // library objects for the rest: [id, variant, size]
    seat: ['street.bench', 0, { w: 84 }], lamp: ['street.lamp', 0, { h: 96 }], lampbox: ['street.lamp', 0, { h: 96 }], lighthouse: ['building.lighthouse', 0, { h: 190 }],
    reeds: null, boat: null,
  };
  function propPainter(prop) {
    if (!prop) return null;
    if (prop.id === 'craft-bench') return 'bench';
    if (prop.id === 'jetty-post') return 'post';
    const k = prop.art || String(prop.kind || '').replace(/^l[df]-/, '');
    if (PAINT[KIND[k] || ''] ) return KIND[k];
    if (k in LIB) return 'lib:' + k;
    return null;
  }
  function signature(prop, sc, night) { const p = propPainter(prop); return p ? 'painted-prop-3|' + p + '|' + prop.id + '|' + [prop.x, prop.y, prop.w, prop.h, sc.season, night ? 'n' : 'd'].join(',') : null; }
  function prop(scene, prop, sc, o) {
    const which = propPainter(prop); if (!which) return null;
    const season = sc.season || 'summer', night = !!o.night, W = o.W;
    const fx = (prop.x + prop.w / 2) * W.cellW, foot = W.sky + (prop.y + prop.h) * W.cellH - 3;
    const h = handle(scene, o, prop.id, { cls: which.replace(':', '-') });
    let b;
    if (which.startsWith('lib:')) {
      const k = which.slice(4);
      if (k === 'reeds') {
        // a reed bed: bulrushes and reeds in a loose drift along the bank
        const r = rng(hash(prop.id)), n = Math.max(4, Math.round(prop.w * 3));
        for (let i = 0; i < n; i++) { const x = prop.x * W.cellW + (i + .5) / n * prop.w * W.cellW + (r() - .5) * 10, y = foot - 2 + (r() - .5) * 8; const im = libImage(scene, r() < .35 ? 'plant.bulrush' : 'plant.reed', Math.floor(r() * 3), season, { h: 30 + r() * 18 }, x, y, false); if (im) { h.add(im); h.move(im, (node, t, motion) => { if (motion) node.setRotation(Math.sin(t * 1.1 + x * .05) * .035); }); } }
        b = { x: prop.x * W.cellW - 12, y: foot - 56, width: prop.w * W.cellW + 24, height: 64 };
      } else if (k === 'boat') {
        // the rowing boat bobs on its mooring
        const im = h.add(libImage(scene, 'boat.dinghy', 0, season, { w: 66 }, fx, foot + 2, false)) || h.add(libImage(scene, 'boat.fpv-dinghy-moored', 0, season, { w: 66 }, fx, foot + 2, false));
        if (!im) { h.destroy(); return null; }
        const y0 = im.y; h.move(im, (node, t, motion) => { if (motion) { node.y = y0 + Math.sin(t * 1.3) * 1.2; node.setRotation(Math.sin(t * .9) * .018); } });
        b = { x: fx - 40, y: foot - 40, width: 80, height: 48 };
      } else {
        const [id, v, size] = LIB[k], im = h.add(libImage(scene, id, v, season, size, fx, foot, night)); if (!im) { h.destroy(); return null; }
        const top = foot - im.displayHeight * im.originY; b = { x: fx - im.displayWidth / 2 - 6, y: top - 4, width: im.displayWidth + 12, height: foot - top + 12 };
        if (k === 'lamp' || k === 'lampbox') { h.lights.push({ x: fx, y: top + 14, radius: 120, pool: true }); if (night) glowPool(scene, h, fx, foot, 110, top + 12); }
      }
    } else {
      const P = PAINT[which], key = bake(scene, which + '|' + season + '|' + (night ? 'n' : 'd'), P.box, B => P.draw(B, { season, night }));
      const im = h.add(image(scene, key, fx, foot)); if (!im) { h.destroy(); return null; }
      b = { x: fx + P.box[0], y: foot + P.box[1], width: P.box[2] - P.box[0], height: P.box[3] - P.box[1] };
      if (which === 'fountain') addDrops(scene, h, fx, foot - 52, 16);
    }
    return finish(h, b, { x: fx, y: foot });
  }
  function addDrops(scene, h, x, y, spread) {
    const key = bake(scene, 'drop', [-2, -3, 2, 3], B => B.f(B.ell(0, 0, 1.1, 2.2), '#eaf6f6', .9));
    for (let i = 0; i < 6; i++) { const im = h.add(image(scene, key, x, y)); const side = i % 2 ? 1 : -1, ph = i / 6; h.move(im, (node, t, motion) => { const f = ((motion ? t : 0) * .9 + ph) % 1; node.setPosition(x + side * (spread * .7 + f * spread * .5), y + f * f * 36 - 4 + f * 4).setAlpha(Math.sin(f * Math.PI) * .8); }); }
  }

  /* ---------- decorations people buy ---------- */
  const DECOR = {
    bench: ['lib', 'street.bench', 0, { w: 84 }], 'stone-bench': ['paint', 'stonebench'], lantern: ['lib', 'street.lamp', 0, { h: 70 }], 'solar-lights': ['paint', 'solar'],
    'picket-fence': ['paint', 'picket'], 'wattle-fence': ['paint', 'wattle'], 'stone-wall': ['paint', 'drywall'], 'iron-railings': ['paint', 'railings'], 'box-hedge': ['lib', 'plant.hedge', 0, { h: 34 }],
    'bird-bath': ['paint', 'birdbath'], 'wishing-well': ['paint', 'well'], fountain: ['paint', 'fountain'], sundial: ['paint', 'sundial'], signpost: ['paint', 'sign'], letterbox: ['paint', 'postbox'],
    'planter-box': ['lib', 'plant.planter', 1, { w: 70 }], 'terracotta-pots': ['lib', 'plant.planter', 0, { w: 40 }], 'stone-urn': ['paint', 'urn'], 'rw-orn-cairn': ['paint', 'cairn'], 'dc-old-wall': ['paint', 'drywall'], 'dc-ruin-arch': ['paint', 'ruinarch'],
    gnome: ['paint', 'gnome'], wheelbarrow: ['paint', 'barrow'], 'water-butt': ['paint', 'butt'], 'bird-feeder': ['paint', 'feeder'], 'rose-arch': ['paint', 'rosearch'], 'bird-box': ['paint', 'birdbox'], 'compost-bin': ['paint', 'compost'],
    'log-pile': ['paint', 'logs'], 'rw-orn-logs': ['paint', 'logs'], 'hay-bale': ['paint', 'hay'], beehive: ['paint', 'hive'], 'bee-skep': ['paint', 'skep'],
  };
  Object.assign(PAINT, {
    stonebench: { box: [-50, -36, 50, 8], draw(B) { B.shadow(2, 1, 44, 7, .26); for (const x of [-32, 32]) B.f(B.rect(x - 6, -16, 12, 16), STONE[1]).f(B.rect(x - 6, -16, 4, 16), STONE[2], .6); B.f(B.rr(-44, -22, 88, 8, 2), STONE[0]).f(B.rect(-44, -22, 88, 2), STONE[2]).f(B.rect(-44, -16, 88, 2), STONE[3], .5); B.f(D().blob(rng(3), -30, -21, 9, 2.4, 7, .5), MOSS[1], .7); } },
    // the lantern's second style: a shepherd's crook of oiled oak with a pierced tin lantern hanging from it
    crooklamp: { box: [-30, -96, 30, 8], draw(B, o) {
      const lit = o && o.night; B.shadow(0, 1, 10, 3, .26);
      B.post(-6, -78, 0, 5, OAK).s('M-6 -78q0 -12 12 -12q12 0 12 10', OAK[1], 4.4).s('M-6 -78q0 -10 11 -10q10 0 11 8', OAK[2], 1.2, .55);
      B.s('M17 -80v8', IRON[0], 1.2);
      B.f(B.poly([[10, -72], [24, -72], [21, -78], [13, -78]]), IRON[1]).f(B.circ(17, -80, 2), IRON[0]);
      B.f(B.rr(11, -72, 12, 18, 2), lit ? '#ffd56a' : '#cfc7a8').f(B.rect(11, -72, 12, 18), IRON[0], .0);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) B.f(B.circ(13.6 + i * 3.4, -68.5 + j * 4, .8), lit ? '#fff4c8' : IRON[1], lit ? .95 : .7);
      B.s('M11 -72v18M23 -72v18', IRON[0], 1.4).f(B.rect(10, -55, 14, 3), IRON[1]).f(B.poly([[12, -52], [22, -52], [17, -48]]), IRON[0]);
      if (lit) B.f(B.circ(17, -63, 14), 'rgba(255,214,110,.22)');
      B.f(D().blob(rng(41), -10, -2, 9, 3.4, 7, .5), MOSS[0], .7).f(D().blob(rng(42), 2, -1, 6, 2.4, 6, .5), MOSS[1], .7);
    } },
    solar: { box: [-20, -30, 20, 6], draw(B) { for (const x of [-12, 0, 12]) { B.shadow(x, 1, 4, 1.4, .2).s(`M${x} 0v-14`, IRON[1], 1.4).f(B.rr(x - 3, -22, 6, 8, 1.5), '#e8f0e6').f(B.rect(x - 3.6, -23, 7.2, 2), IRON[0]); } } },
    picket: { box: [-28, -40, 28, 6], draw(B) { B.shadow(0, 1, 26, 3, .2).beam(-26, -26, 52, 3, ['#f2eee2', '#cfc8b4', '#ffffff']).beam(-26, -12, 52, 3, ['#f2eee2', '#cfc8b4', '#ffffff']); for (let x = -23; x <= 23; x += 7.6) B.f(B.poly([[x - 2.6, 0], [x - 2.6, -30], [x, -34], [x + 2.6, -30], [x + 2.6, 0]]), '#f4f0e4').f(B.rect(x + 1, -30, 1.6, 30), '#cfc8b4', .7); } },
    wattle: { box: [-28, -40, 28, 6], draw(B) { B.shadow(0, 1, 26, 3, .2); for (const x of [-22, -7, 8, 23]) B.post(x, -34, 0, 3, WOOD); for (let i = 0; i < 6; i++) B.s(`M-25 ${-6 - i * 4.6}q12 ${i & 1 ? 2 : -2} 25 0q12 ${i & 1 ? -2 : 2} 25 0`, i & 1 ? WOOD[0] : WOOD[2], 3.4); } },
    drywall: { box: [-28, -30, 28, 6], draw(B) { const r = rng(7); B.shadow(0, 1, 27, 4, .22); for (let row = 0; row < 4; row++) for (let i = 0; i < 6; i++) { const x = -25 + i * 9.6 + (row & 1) * 4, y = -4 - row * 5.6; B.f(D().blob(r, x, y, 5.4, 3.2, 6, .3), r() < .5 ? STONE[0] : STONE[1]).f(D().blob(r, x - 1.4, y - 1, 3, 1.4, 6, .3), STONE[2], .6); } B.f(D().blob(r, -12, -24, 10, 3, 7, .5), MOSS[0], .75).f(D().blob(r, 10, -24, 7, 2.4, 7, .5), MOSS[1], .7); } },
    railings: { box: [-28, -42, 28, 6], draw(B) { B.shadow(0, 1, 26, 3, .2).s('M-25 -30h50M-25 -6h50', IRON[0], 2); for (let x = -23; x <= 23; x += 5) B.s(`M${x} 0v-34`, IRON[0], 1.4).f(B.poly([[x - 1.6, -34], [x, -38], [x + 1.6, -34]]), IRON[1]); } },
    birdbath: { box: [-24, -44, 24, 6], draw(B, o) { const r = rng(11); B.shadow(2, 1, 16, 5, .24); B.f('M-5 0q-2 -10 2 -24h6q4 14 2 24z', B.lin(-6, 0, 6, 0, [[0, STONE[2]], [1, STONE[3]]])); B.f(B.ell(0, -26, 17, 5), STONE[1]).f(B.ell(0, -28, 17, 5), STONE[0]).f(B.ell(0, -28, 13, 3.4), '#78a4ae').f(B.ell(-4, -29, 6, 1.2), '#cfe6ea', .8); B.f(B.ell(9, -33, 4, 3), '#8a6a4a').f(B.circ(12, -36, 2.4), '#8a6a4a').f(B.poly([[14, -36], [17, -35.4], [14, -35]]), '#e0a040').f(B.ell(8, -33, 2.2, 1.4), '#c86a3a'); B.tufts(r, 0, 2, 26, 7, o.season); } },
    urn: { box: [-18, -42, 18, 6], draw(B, o) { const r = rng(13); B.shadow(1, 1, 12, 3.6, .24).f(B.rect(-8, -6, 16, 6), STONE[1]).f('M-12 -26q0 14 8 20h8q8 -6 8 -20z', B.lin(-12, 0, 12, 0, [[0, STONE[2]], [.5, STONE[0]], [1, STONE[3]]])).f(B.ell(0, -26, 13, 3.6), STONE[0]).crown(r, 0, -30, 12, 8, o.season, 4); } },
    cairn: { box: [-22, -50, 22, 6], draw(B) { const r = rng(17); B.shadow(2, 1, 18, 5, .28); let y = -3; for (const [w, h] of [[16, 7], [13, 6], [11, 5.4], [8.6, 5], [6.4, 4.4], [4.4, 3.6]]) { B.stone(r, (r() - .5) * 2.4, y, w, h, ['#b4ae9c', '#8e8878', '#d6d0c0'], null); y -= h * 1.55; } } },
    ruinarch: { box: [-52, -100, 52, 8], draw(B) { const r = rng(19); ruinedArch(B, r, 38, 84, 'summer', true); } },
    logs: { box: [-26, -26, 26, 6], draw(B) { B.shadow(0, 1, 24, 4, .26); for (const [x, y] of [[-12, -5], [0, -5], [12, -5], [-6, -14], [6, -14], [0, -23]]) B.f(B.circ(x, y, 5.6), WOOD[1]).f(B.circ(x, y, 4.4), '#d8b888').s(`M${x} ${y}m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0`, '#a8844e', .6); } },
    hay: { box: [-26, -32, 26, 6], draw(B) { B.shadow(1, 1, 24, 4, .26).f(B.rr(-22, -24, 44, 24, 4), '#d4b45a').f(B.rr(-22, -24, 44, 6, 4), '#e8cc78').f(B.rect(10, -24, 12, 24), '#b8963e', .5); for (let i = 0; i < 12; i++) B.s(`M${-20 + i * 3.6} -2v-${6 + (i % 3) * 4}`, '#b8963e', .6, .6); B.s('M-8 -24v24M8 -24v24', '#8a6a3a', 1); } },
    hive: { box: [-20, -50, 20, 6], draw(B) { B.shadow(1, 1, 14, 4, .26).post(-8, -8, 0, 3, WOOD).post(8, -8, 0, 3, WOOD); for (let i = 0; i < 3; i++) B.f(B.rect(-12, -18 - i * 10, 24, 10), i % 2 ? '#f2eee2' : '#e8e2d0').f(B.rect(-12, -18 - i * 10, 4, 10), '#ffffff', .6); B.f(B.poly([[-15, -38], [0, -46], [15, -38]]), '#8a949a').f(B.rect(-4, -12, 8, 2), '#3a3028'); } },
    gnome: { box: [-16, -46, 16, 6], draw(B, o) { const r = rng(23); B.shadow(1, 1, 11, 3.4, .26); B.f(B.rr(-7, -4, 6, 4, 1.6), '#4a3a2c').f(B.rr(1, -4, 6, 4, 1.6), '#4a3a2c'); B.f('M-8 -4q0 -12 8 -14q8 2 8 14z', B.lin(-8, 0, 8, 0, [[0, '#5a8ac8'], [1, '#3a5a90']])).f(B.rect(-8, -8, 16, 2), '#6a4a2a'); B.f('M-6 -15q6 12 12 0q-2 -6 -6 -6q-4 0 -6 6z', '#f4f2ec').f(B.circ(0, -21, 5), '#f0c8a8').f(B.circ(0, -19.6, 1.4), '#e09a8a'); B.f('M-7 -23q7 -26 9 -20q5 5 5 2q-6 -4 -14 18z', '#c8402e').f('M-7 -23q4 -14 7 -19l1 2q-3 6 -5 17z', '#e0624a', .8).f(B.ell(0, -23, 7.4, 2), '#a8342a'); B.f(B.circ(-2, -21.6, .7), '#3a2a20').f(B.circ(2, -21.6, .7), '#3a2a20'); B.tufts(r, 0, 2, 18, 6, o.season); } },
    barrow: { box: [-30, -32, 30, 6], draw(B) { B.shadow(0, 1, 24, 4, .26); B.f(B.circ(-16, -6, 6), '#3a3e40').f(B.circ(-16, -6, 2.4), '#8a9094'); B.s('M-10 -10L24 -4M24 -4l4 -2', WOOD[1], 2.6).s('M8 -10v10M14 -9v9', IRON[1], 1.6); B.f('M-22 -24h34l-6 14h-24z', '#5a8a6a').f('M-22 -24h34l-1 3h-33z', '#7aaa8a').f(B.ell(-5, -24, 16, 3), '#6a5034'); B.f(D().blob(rng(2), -8, -27, 9, 4, 7, .4), '#5e8a44').f(B.circ(-10, -29, 1.6), '#e0b040').f(B.circ(-4, -28, 1.6), '#c84a5a'); } },
    butt: { box: [-16, -46, 16, 6], draw(B) { B.shadow(1, 1, 12, 3.6, .26).f(B.rect(-10, -38, 20, 38), B.lin(-10, 0, 10, 0, [[0, '#6a8a70'], [.4, '#58785e'], [1, '#3e5a44']])).f(B.ell(0, -38, 10, 3), '#4a6a50').f(B.ell(0, -38, 8, 2.2), '#3a5a6a'); for (const y of [-30, -12]) B.f(B.rect(-10, y, 20, 2), '#46664c'); B.f(B.rect(6, -8, 6, 2), '#9aa4a8').s('M10 -38v-8h-8', '#7a8488', 2); } },
    feeder: { box: [-16, -60, 16, 6], draw(B) { B.shadow(0, 1, 8, 2.6, .24).post(0, -46, 0, 3, WOOD); B.f(B.poly([[-12, -46], [0, -54], [12, -46]]), '#8a5a3a').f(B.rect(-8, -46, 16, 10), '#c8a870').f(B.rect(-9, -36, 18, 2), WOOD[1]); for (let i = 0; i < 6; i++) B.f(B.circ(-6 + i * 2.4, -38, .9), '#e8d4a0'); B.f(B.ell(8, -39, 3.4, 2.4), '#6a8ab8').f(B.circ(10, -41, 2), '#6a8ab8').f(B.ell(8, -38.4, 2, 1.2), '#f0e0a0'); } },
    birdbox: { box: [-14, -60, 14, 6], draw(B) { B.shadow(0, 1, 7, 2.4, .24).post(0, -38, 0, 3, WOOD).f(B.rect(-8, -52, 16, 16), '#b08c5e').f(B.rect(-8, -52, 4, 16), '#c8a878', .7).f(B.poly([[-11, -51], [0, -58], [11, -51]]), '#6a5034').f(B.circ(0, -45, 2.4), '#2a2016').f(B.rect(-1, -41, 2, 2), WOOD[1]); } },
    compost: { box: [-24, -36, 24, 6], draw(B) { B.shadow(0, 1, 20, 4, .26); B.f(B.rect(-18, -26, 36, 26), WOOD[1]); for (let i = 0; i < 4; i++) B.beam(-18, -26 + i * 6.6, 36, 5.4, WOOD); B.f(D().blob(rng(4), 0, -27, 16, 5, 8, .5), '#5a4030').f(D().blob(rng(5), -4, -29, 6, 2.4, 6, .5), '#7a9a48'); } },
    rosearch: { box: [-56, -110, 56, 8], draw(B, o) { const r = rng(29); B.shadow(0, 2, 48, 6, .24); B.s('M-38 0v-62q0 -36 38 -36q38 0 38 36v62', WOOD[1], 4).s('M-34 0v-62q0 -32 34 -32q34 0 34 32v62', WOOD[2], 1.2, .6); for (let i = 0; i < 16; i++) { const t = i / 15, a = Math.PI * (1 - t), x = Math.cos(a) * 38, y = t < .2 || t > .8 ? -10 - (t < .2 ? t : 1 - t) * 260 : -62 - Math.sin(a) * 36; B.f(D().blob(r, x, y, 9, 7, 7, .5), leafOf(o.season)[1], .95).f(D().blob(r, x - 2, y - 2, 5, 3.4, 6, .5), leafOf(o.season)[2], .9); if (o.season !== 'winter' && i % 2 === 0) B.f(B.circ(x + 3, y + 1, 2.4), i % 4 ? '#e06a8a' : '#f4c0d0').f(B.circ(x + 2.4, y + .4, 1), '#fff0f4', .7); } } },
    skep: { box: [-18, -34, 18, 6], draw(B) { B.shadow(1, 1, 13, 4, .26); for (let i = 0; i < 6; i++) B.f(B.ell(0, -4 - i * 4.4, 13 - i * 1.6, 3), i % 2 ? '#c8a050' : '#d8b868'); B.f(B.ell(0, -4, 3.4, 2.2), '#3a2a18'); } },
  });
  const PD = () => window.GardenPaintedDecor && GardenPaintedDecor.has ? GardenPaintedDecor : null;   // the decorations' own painters (94-garden-native-painted-decor-*.js) come first
  function decorSignature(item, sc, night) { const pd = PD(); if (pd && pd.has(item.id)) return pd.signature(item, sc, night); const d = DECOR[item.id]; return d ? 'painted-decor-2|' + item.id + '|' + item.x + ',' + item.y + '|' + (item.flip ? 'f' : '') + '|' + sc.season + (night ? '|n' : '') + (item.v ? '|v' + item.v : '') : null; }
  function decor(scene, item, sc, o) {
    const pd = PD(); if (pd && pd.has(item.id)) return pd.world(scene, item, sc, o);
    const d = item.id === 'lantern' && (Number(item.v) || 0) % 2 === 1 ? ['paint', 'crooklamp'] : DECOR[item.id], def = typeof gardenDecor === 'function' ? gardenDecor(item.id) : null; if (!d || !def) return null;   // (the lantern's second style)
    const W = o.W, season = sc.season || 'summer', fx = (item.x + (def.w || 1) / 2) * W.cellW, foot = W.sky + (item.y + (def.h || 1)) * W.cellH - 4;
    const h = handle(scene, o, 'decor:' + item.uid, { cls: 'decor' });
    let im;
    if (d[0] === 'lib') im = h.add(libImage(scene, d[1], d[2], season, d[3], fx, foot, !!o.night));
    else { const P = PAINT[d[1]]; im = h.add(image(scene, bake(scene, d[1] + '|' + season + '|' + (o.night ? 'n' : 'd'), P.box, B => P.draw(B, { season, night: o.night })), fx, foot)); if (d[1] === 'fountain') addDrops(scene, h, fx, foot - 52, 16); }
    if (!im) { h.destroy(); return null; }
    if (item.flip) im.setFlipX(true);
    if ((item.id === 'lantern' || item.id === 'solar-lights') && o.night) glowPool(scene, h, fx, foot, item.id === 'lantern' ? 90 : 60, item.id === 'lantern' ? foot - ((Number(item.v) || 0) % 2 ? 63 : 58) : null);
    const top = foot - im.displayHeight * im.originY;
    return finish(h, { x: fx - im.displayWidth / 2 - 4, y: top - 2, width: im.displayWidth + 8, height: foot - top + 10 }, { x: fx, y: foot });
  }
  function decorKnown(id) { const pd = PD(); return !!DECOR[id] || !!(pd && pd.has(id)); }

  /* ---------- gates: the natural crossings ---------- */
  // gate id -> its crossing. The ids are kept by the Fleetwater Vale, so each
  // gate keeps its kind of crossing wherever the layout puts it.
  const GATE_KIND = { 'island-woods': 'arch', 'island-mill': 'bridge', 'island-ruins': 'ruin', 'island-orchard': 'stair', 'island-headland': 'pass' };
  function gateKind(g) { return GATE_KIND[g.id] || ['arch', 'bridge', 'ruin', 'stair', 'pass'][((g.n || 1) - 1) % 5]; }
  function ruinedArch(B, r, half, rise, season, open) {
    // a whole round-headed arch in coursed stone: two piers, a ring of voussoirs with a keystone,
    // wall stubs either side, one stone fallen from the ring, ivy. The opening shows the way through.
    const st = ['#c4bca4', '#a39a82', '#ddd6c0', '#7e7662'], L = leafOf(season), pw = Math.max(12, half * .3), spring = -rise * .58, ry = rise + spring - 6;
    const ring = (t, rr) => [Math.cos(Math.PI - t * Math.PI) * rr, spring - Math.sin(t * Math.PI) * rr * ry / half];
    // the opening: the path running on beyond, in shade
    B.f(`M${-half} 0V${spring}A${half} ${ry} 0 0 1 ${half} ${spring}V0z`, B.lin(0, spring - ry, 0, 0, [[0, 'rgba(36,40,30,.62)'], [.7, 'rgba(60,70,46,.38)'], [1, 'rgba(90,100,70,.12)']]));
    // wall stubs running off either side, broken lower than the arch
    for (const s of [-1, 1]) {
      const x0 = s * (half + pw), len = half * .7, top = s < 0 ? -rise * .52 : -rise * .36;
      for (let y = -2, i = 0; y > top; y -= 8, i++) for (let x = 0; x < len; x += 13) { const h = top + (x / len) * 18 * (s < 0 ? 1 : 1.6); if (y - 8 < h) continue; const bx = x0 + s * x + (s < 0 ? -12 : 0) + (i % 2) * 5 * s; B.f(B.rr(bx, y - 7.4, 12.4, 7.4, 1.4), r() < .55 ? st[1] : st[0]).f(B.rect(bx + 1, y - 7.4, 4, 2), st[2], .5); }
    }
    // the piers, coursed blocks lit from the upper left
    for (const s of [-1, 1]) {
      const cx0 = s * (half + pw / 2);
      B.f(B.rect(cx0 - pw / 2, spring, pw, -spring), st[1]);
      for (let y = 0, i = 0; y > spring; y -= 9, i++) { const w = pw + (i % 2 ? -2 : 1); B.f(B.rr(cx0 - w / 2, y - 8.6, w, 8.6, 1.4), i % 3 ? st[0] : st[1]).f(B.rect(cx0 - w / 2 + 1, y - 8.6, w * .3, 8.6), st[2], .5).f(B.rect(cx0 - w / 2, y - 1, w, 1), st[3], .45); }
      B.f(B.rect(cx0 + s * pw / 2 - (s > 0 ? 3 : 0), spring, 3, -spring), st[3], .3);
    }
    // the ring of voussoirs, the keystone proud at the top, one stone gone on the right shoulder
    const n = 13, outer = half + pw * .95;
    for (let i = 0; i < n; i++) {
      if (i === 9) continue;
      const [ax, ay] = ring(i / n, half), [bx, by] = ring((i + 1) / n, half), [cx1, cy1] = ring((i + 1) / n, outer), [dx, dy] = ring(i / n, outer), key = i === (n >> 1);
      const ex = key ? (cx1 - bx) * .14 : 0, ey = key ? (cy1 - by) * .14 : 0, ex2 = key ? (dx - ax) * .14 : 0, ey2 = key ? (dy - ay) * .14 : 0;
      B.f(B.poly([[ax, ay], [bx, by], [cx1 + ex, cy1 + ey], [dx + ex2, dy + ey2]]), key ? st[2] : i % 2 ? st[0] : st[1]).s(`M${ax} ${ay}L${bx} ${by}L${cx1 + ex} ${cy1 + ey}L${dx + ex2} ${dy + ey2}z`, st[3], .9, .55);
    }
    // the gap where a voussoir fell, and the stone itself on the ground by the pier
    { const [ax, ay] = ring(9 / n, half), [bx, by] = ring(10 / n, half), [cx1, cy1] = ring(10 / n, outer), [dx, dy] = ring(9 / n, outer); B.f(B.poly([[ax, ay], [bx, by], [cx1, cy1], [dx, dy]]), 'rgba(40,44,34,.35)'); }
    B.stone(r, half + pw * 1.4, -3, 8, 4.4, STONE, MOSS);
    // a coping of turf and moss along the top of the ring
    for (let i = 0; i <= 8; i++) { const [x, y] = ring(i / 8, outer + 3); B.f(D().blob(r, x, y - 1, 7, 3.4, 7, .5), i % 3 ? MOSS[0] : MOSS[2], .9); }
    // ivy over the left shoulder and down the pier, a tuft on the right
    for (const [x, y, rx] of [[-half - pw * .8, spring - ry * .5, 13], [-half * .6, spring - ry * .95, 10], [half + pw * .6, spring - 4, 9]]) B.f(D().blob(r, x, y, rx, rx * .7, 8, .5), L[0], .92).f(D().blob(r, x - 2, y - 2, rx * .62, rx * .4, 7, .5), L[1], .92).f(D().blob(r, x - 3, y - 3, rx * .3, rx * .2, 6, .5), L[2], .9);
    for (let i = 0; i < 6; i++) { const x = -half - pw + r() * pw * 1.3, len = 18 + r() * 34; B.s(`M${x} ${spring - ry * .4}q${(r() - .5) * 8} ${len * .5} ${(r() - .5) * 6} ${len}`, L[0], 1.5, .9); }
    if (open) B.flowers(r, 0, -1, half * 1.4, 12, season === 'winter' ? ['#f2f0e8', '#d8e0e8'] : ['#e8c84a', '#f2f0e8', '#c86aa0']);
  }
  /** The forest arch, face on: two old trees whose trunks lean in and grow into one bough over the way, a crown along the top, ivy hanging in the opening. */
  function livingArch(B, r, half, rise, season, open) {
    const L = leafOf(season), tw = 15;
    // the opening: the woodland path beyond, in green shade
    B.f(`M${-half + 4} 0C${-half + 2} ${-rise * .62} ${-half * .5} ${-rise + 10} 0 ${-rise + 10}C${half * .5} ${-rise + 10} ${half - 2} ${-rise * .62} ${half - 4} 0z`, B.lin(0, -rise, 0, 0, [[0, 'rgba(26,40,24,.7)'], [.65, 'rgba(46,66,36,.42)'], [1, 'rgba(80,100,60,.14)']]));
    // roots
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) B.s(`M${s * half} -6q${s * (8 + i * 6)} 2 ${s * (14 + i * 8)} ${6 - i}`, OAK[1], 5 - i, 1);
    // the two trunks leaning in and meeting: a thick dark bough, a lit edge, bark lines
    const bough = s => `M${s * (half + 2)} 2C${s * (half + 4)} ${-rise * .66} ${s * half * .55} ${-rise - 4} 0 ${-rise - 4}`;
    for (const s of [-1, 1]) B.s(bough(s), OAK[3], tw + 3).s(bough(s), OAK[1], tw).s(`M${s * (half - 3)} -4C${s * (half - 1)} ${-rise * .62} ${s * half * .5} ${-rise + 2} 0 ${-rise + 2}`, OAK[2], 3, .55);
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { const y = -10 - i * rise * .13; B.s(`M${s * (half + 3 - i * 1.6)} ${y}q${s * 2} -6 0 -12`, OAK[3], 1, .5); }
    // the braid where the boughs twist together at the top, a knot
    B.s(`M-14 ${-rise - 2}q14 -8 28 0`, OAK[3], 2, .6).s(`M-10 ${-rise + 4}q10 -10 22 -4`, OAK[2], 1.6, .5).f(B.ell(-half - 1, -rise * .38, 3, 4), OAK[3], .7);
    // the crown sits along the top of the arch, never in the opening
    for (let i = 0; i <= 8; i++) { const t = i / 8, a = Math.PI - t * Math.PI, x = Math.cos(a) * (half + 10), y = -rise * .55 - Math.sin(a) * rise * .62 - 10; B.crown(r, x, y, 30 - Math.abs(t - .5) * 16, 22, season, 4); }
    // ivy hanging down inside the arch
    for (let i = 0; i < 11; i++) { const t = .12 + i / 10 * .76, a = Math.PI - t * Math.PI, x = Math.cos(a) * (half - 6), y = -rise * .5 - Math.sin(a) * rise * .45, len = 8 + r() * 18; B.s(`M${x} ${y}q${(r() - .5) * 5} ${len * .5} ${(r() - .5) * 4} ${len}`, L[0], 1.4, .9); B.f(B.ell(x + (r() - .5) * 3, y + len * .8, 2.2, 1.6), L[2], .9); }
    if (open) {
      // open: flowers along the foot of the way, blossom in the crown
      B.flowers(r, 0, -1, half * 1.5, 14, season === 'winter' ? ['#f2f0e8', '#d8e0e8'] : ['#e8c84a', '#f2f0e8', '#c86aa0']);
      if (season !== 'winter') for (let i = 0; i < 12; i++) { const a = Math.PI - r() * Math.PI, x = Math.cos(a) * (half + 12), y = -rise * .6 - Math.sin(a) * rise * .62; B.f(B.circ(x, y, 1.8), season === 'autumn' ? '#e0a040' : '#f4d8e0', .95); }
    }
  }
  /** A gate drawn face on. side: the span runs down the screen, so the face is sheared to recede (back pier up the screen, front pier down). */
  function elevation(B, side, half, S, draw) {
    if (!side) return draw();
    B.cx.save(); B.cx.transform(.85, S / half * .8, 0, 1, 0, 0); try { draw(); } finally { B.cx.restore(); }
  }
  function needSign(B, x, y, lv, name, have) {
    // a hanging sign anyone reads at a glance: a padlock and what opens it (the find), else the level it opens at, the HUD's gold badge
    B.s(`M${x - 13} ${y - 22}L${x - 11} ${y - 12}M${x + 13} ${y - 22}L${x + 11} ${y - 12}`, '#8a7a5a', 1);
    B.f(B.rr(x - 21, y - 13, 42, 26, 3), 'rgba(40,30,20,.25)').f(B.rr(x - 22, y - 14, 42, 26, 3), '#6a5034').f(B.rr(x - 20, y - 12, 38, 22, 2.4), '#efe4c6').f(B.rect(x - 20, y - 12, 38, 1.6), '#fff8e6');
    // the padlock
    B.s(have ? `M${x - 13} ${y - 3}v-6a4 4 0 0 1 8 0v-1` : `M${x - 13} ${y - 3}v-3a4 4 0 0 1 8 0v3`, '#6a6e70', 1.8).f(B.rr(x - 15.4, y - 3.4, 12.8, 10, 1.8), '#c89a3a').f(B.rect(x - 15.4, y - 3.4, 12.8, 2.4), '#e8c060').f(B.circ(x - 9, y + 1.4, 1.4), '#5a4020');
    // the gold level badge, like the one at the top of the screen
    if (!name) B.f(B.circ(x + 7, y - 1, 8), '#6a5034').f(B.circ(x + 7, y - 1, 7), '#e8b530').f(B.circ(x + 5.6, y - 2.6, 3.8), '#f6d468', .6).text(String(lv || '?'), x + 7, y - .6, lv >= 10 ? 8 : 9.5, '#4a3010', 'Inter, sans-serif', '800');
    B.text(have ? 'Ready to open' : name ? 'Needs ' + name : 'Level ' + (lv || '?'), x - 1, y + 16.5, 7, '#f4ecd8', 'Inter, sans-serif', '700');   // (have: the shackle stands open, and the sign says so)
  }
  /** One gate as base art + (closed) a blocker + its sign. side: the span runs down the screen (you cross left to right). */
  function gateArt(kind, g, frame, season, open) {
    const side = Math.abs(frame.uy) > Math.abs(frame.ux), half = Math.max(46, Math.min(80, frame.span * .62)), r = rng(hash(g.id + kind));
    const L = leafOf(season), art = { S: frame.span * .9 };
    const oak = season === 'winter' ? 'tree.oak' : 'tree.green-oak';
    // library objects standing in the crossing: [id, variant, size, dx, dy, 'back' | 'front']
    art.lib = kind === 'arch' ? []
      : kind === 'stair' ? [['tree.cherry', 0, { h: 104 }, -(side ? 30 : half * 1.15) - 52, -40, 'back'], ['tree.cherry', 1, { h: 96 }, (side ? 30 : half * 1.15) + 52, -36, 'back']]
      : kind === 'pass' ? (side ? [['tree.pine', 0, { h: 170 }, 34, -art.S - 20, 'back'], ['rock.boulder', 0, { w: 96 }, 0, -art.S * .8, 'back'], ['rock.boulder', 1, { w: 110 }, 0, art.S * .8 + 6, 'front']] : [['tree.pine', 0, { h: 170 }, -half - 50, -16, 'back'], ['rock.boulder', 0, { w: 100 }, -half, 2, 'back'], ['rock.boulder', 1, { w: 110 }, half, 4, 'back']])
      : kind === 'ruin' ? [['tree.proof-yew', 0, { h: 130 }, side ? 40 : half + 52, side ? -art.S : -6, 'back']] : [];
    // the box of the drawing round the crossing's centre
    const box = (kind === 'arch' || kind === 'ruin') && side ? [-half * .85 - 90, -art.S - 200, half * .85 + 90, art.S + 30] : side ? [-100, -170 - half * .9, 100, half * .9 + 22] : [-half - 90, -200, half + 90, 24];
    const base = (B) => {
      if (kind === 'arch') {
        B.shadow(0, 2, half + 30, 10, .26);
        elevation(B, side, half, art.S, () => livingArch(B, r, half, 128, season, open));
      } else if (kind === 'bridge') {
        // a stone hump bridge: the arch below, the deck, two parapets with copings
        const len = side ? 74 : half * 1.1, w = side ? half * .8 : 30;
        if (side) {
          // seen from the south in profile: the near face with its arch, the deck behind a low near parapet, the far parapet beyond
          const N = 24, hump = x => -18 * (1 - (x / len) * (x / len)), xs = Array.from({ length: N + 1 }, (_, i) => -len + i * 2 * len / N), band = (top, bot) => B.poly(xs.map(x => [x, top(x)]).concat(xs.slice().reverse().map(x => [x, bot(x)])));
          const d = 10;                                         // how much of the deck the 3/4 view shows
          B.shadow(0, 14, len + 10, 8, .28);
          B.f(band(x => hump(x) - d - 12, x => hump(x) - d), STONE[1]).f(band(x => hump(x) - d - 12, x => hump(x) - d - 9.5), STONE[2]);
          for (let i = 1; i < 10; i++) { const x = -len + i * len / 5; B.s(`M${x} ${hump(x) - d - 9}v8`, STONE[3], .7, .5); }
          B.f(band(x => hump(x) - d, x => hump(x)), '#d8cba6');
          for (let i = 0; i < 22; i++) { const x = (r() - .5) * len * 1.8; B.f(B.rect(x - 3, hump(x) - d + 1 + r() * (d - 4), 6, 2.6), r() < .5 ? '#c4b690' : '#e6dbbb', .8); }
          B.f(band(x => hump(x), x => 16), STONE[0]).f(`M${-len * .42} 16q${len * .42} -34 ${len * .84} 0z`, '#344c50').f(`M${-len * .36} 16q${len * .36} -26 ${len * .72} 0z`, '#4e7478', .7);
          for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) { const x = -len + 4 + i * len / 4.4 + (row & 1) * 6, y = hump(x) + 3 + row * 5; if (Math.abs(x) < len * .44 && y > 16 - Math.sqrt(Math.max(0, 1 - (x / (len * .42)) ** 2)) * 30) continue; B.f(B.rect(x, y, len / 5, 4), r() < .5 ? STONE[2] : STONE[1], .5); }
          for (let i = 0; i < 9; i++) { const a = Math.PI * (i / 8), x = -Math.cos(a) * len * .44, y = 16 - Math.sin(a) * 31; B.f(B.rr(x - 3.6, y - 3, 7.2, 6, 1), STONE[2], .9); }
          B.f(band(x => hump(x) - 5, x => hump(x) + 1), STONE[1]).f(band(x => hump(x) - 5, x => hump(x) - 3.4), STONE[2]);
          B.f(D().blob(r, -len + 4, 12, 12, 5, 7, .5), MOSS[0], .85).f(D().blob(r, len - 6, 10, 10, 4, 7, .5), MOSS[1], .85).f(B.ell(0, 20, len * .4, 3), '#9cc4c8', .45);
        } else {
          B.f(`M${-len} 0q${len} -40 ${len * 2} 0z`, '#3e5a5e', .5);
          for (const s of [-1, 1]) B.f(B.rr(s * len - (s > 0 ? 14 : 0), -42, 14, 42, 2), STONE[0]).f(B.rect(s * len - (s > 0 ? 14 : 0), -42, 4, 42), STONE[2], .6);
          B.f(`M${-len} -30q${len} -26 ${len * 2} 0v8h${-len * 2}z`, STONE[1]).f(`M${-len} -30q${len} -26 ${len * 2} 0v3q${-len} -26 ${-len * 2} 0z`, STONE[2]);
        }
        B.f(D().blob(r, -len + 6, side ? w - 2 : -30, 10, 4, 7, .5), MOSS[0], .8).f(D().blob(r, len - 10, side ? -w - 6 : -36, 8, 3, 7, .5), MOSS[1], .8);
        if (open) { const lamp = (x, y) => B.post(x, y - 34, y, 3, IRON).f(B.rr(x - 4, y - 44, 8, 10, 1.5), '#f2e6b8').f(B.poly([[x - 6, y - 44], [x, y - 50], [x + 6, y - 44]]), IRON[0]); lamp(side ? -len - 6 : -len - 6, side ? w + 2 : 0); }
      } else if (kind === 'ruin') {
        B.shadow(0, 2, half + 20, 9, .26);
        elevation(B, side, half, art.S, () => ruinedArch(B, r, half, 124, season, open));
        for (let i = 0; i < 4; i++) B.stone(r, (side ? 20 : half + 18) + i * 9 * (side ? 0 : 1), (side ? half * .6 + i * 8 : 2 - i * 2), 7 - i, 4.4 - i * .5, STONE, i < 2 ? MOSS : null);
      } else if (kind === 'stair') {
        // stone steps climbing through a gap in a dry-stone wall, a small oak gate at the top
        const steps = 6, sw = side ? 30 : half * 1.15;
        for (let i = 0; i < steps; i++) { const y = -i * 9, x = side ? -24 + i * 8 : 0, w = sw - i * 1.5; B.f(B.rect(x - w, y - 9, w * 2, 9), STONE[1]).f(B.rect(x - w, y - 9, w * 2, 3), STONE[2]).f(B.rect(x - w, y - 2, w * 2, 2), STONE[3], .4); }
        for (const s of [-1, 1]) {
          for (let row = 0; row < 7; row++) for (let i = 0; i < 4; i++) { const x = s * (sw + 8 + i * 11) + (row & 1) * 4 * s, y = -4 - row * 7.6 - (side ? 0 : 0); B.f(D().blob(r, x, y, 6.4, 3.8, 6, .3), (row + i) % 3 ? STONE[0] : STONE[1]).f(D().blob(r, x - 1.4, y - 1.2, 3.6, 1.6, 6, .3), STONE[2], .55); }
          B.f(D().blob(r, s * (sw + 22), -58, 22, 7, 9, .5), MOSS[0], .85).f(D().blob(r, s * (sw + 18), -61, 12, 3.6, 7, .5), MOSS[1], .85);
          B.crown(r, s * (sw + 40), -74, 26, 20, season, 4);
          if (season !== 'winter') for (let i = 0; i < 7; i++) B.f(B.circ(s * (sw + 28 + r() * 26), -76 + (r() - .5) * 26, 1.6), season === 'autumn' ? '#c8402a' : '#f4d8e0', .95);
        }
        B.post(-sw + 2, -96, -52, 5, OAK).post(sw - 2, -96, -52, 5, OAK);
      } else {
        // the pass: boulders either side of the col, scree, heather, a cairn of stacked stones
        const rock = ['#a8a698', '#848274', '#cfccbe', '#666456'], o = side ? [[0, -half * .8], [0, half * .8]] : [[-half, 0], [half, 0]];
        for (const [x, y] of o) { B.shadow(x + 6, y + 2, 44, 10, .3); for (let i = 0; i < 6; i++) B.f(D().blob(r, x + (r() - .5) * 70, y + 6 + r() * 8, 9, 3.4, 7, .5), i % 2 ? '#8a6a8a' : '#a884a8', .85); }
        for (let i = 0; i < 14; i++) B.stone(r, (r() - .5) * (side ? 40 : half * 1.6), (side ? (r() - .5) * half * 1.4 : 4 + r() * 6), 2.6 + r() * 2, 1.8 + r(), rock, null);
        const cxx = side ? 26 : half + 36, cyy = side ? half * .2 : -2; let y = cyy;
        for (const [w, h] of [[13, 6], [11, 5.4], [9, 5], [7, 4.4], [5, 3.8], [3.6, 3]]) { B.stone(r, cxx + (r() - .5) * 2, y, w, h, rock, null); y -= h * 1.5; }
        if (open) B.s(`M${cxx} ${y}v-18`, WOOD[1], 1.4).f(B.poly([[cxx, y - 18], [cxx + 12, y - 15], [cxx, y - 11]]), '#c84a3a');
      }
    };
    const blocker = (B) => {
      if (kind === 'arch') {
        // shut: a hurdle tied across the opening, brambles grown up through it, a fallen branch leaning in
        B.shadow(0, 2, half * .9, 8, .24);
        elevation(B, side, half, art.S, () => {
          for (const x of [-half * .78, -half * .3, half * .2, half * .7]) B.post(x, -40, 2, 4, WOOD);
          for (let i = 0; i < 5; i++) B.s(`M${-half * .86} ${-6 - i * 7.5}q${half * .43} ${i & 1 ? 3 : -3} ${half * .86} 0q${half * .43} ${i & 1 ? -3 : 3} ${half * .86} 0`, i & 1 ? WOOD[0] : WOOD[2], 3.8);
          B.s(`M${-half * .9} -86L${half * .6} -4`, OAK[1], 6).s(`M${-half * .9} -86L${half * .6} -4`, OAK[2], 1.6, .6).s(`M${-half * .3} -52l-14 -12M${half * .1} -30l12 -14`, OAK[1], 2.6);
          for (let i = 0; i < 16; i++) { const x = (r() - .5) * half * 1.7, y = -4 - r() * 52; B.f(D().blob(r, x, y, 12, 8, 8, .6), '#3e5a30', .95).f(D().blob(r, x - 3, y - 3, 6.4, 4, 6, .5), '#5e7e40', .95); B.s(`M${x - 12} ${y + 2}q8 -14 22 -6`, '#6a4a3a', 1.2, .9); B.f(B.circ(x + 3, y - 3, 1.6), '#4a1a30').f(B.circ(x - 4, y + 1, 1.4), '#7a2a3a').f(B.circ(x + 6, y + 2, 1.3), '#c84a5a'); }
        });
      } else if (kind === 'bridge') {
        // a barrier pole across the deck, on a post, with a chain
        const len = side ? 74 : half;
        if (side) { const x = -len * .55, y = -18 * (1 - .3) - 4; B.post(x - 6, y - 30, y + 2, 4, OAK).post(x + 6, y - 40, y - 10, 4, OAK); B.s(`M${x - 6} ${y - 22}L${x + 6} ${y - 34}`, '#f2ece0', 4.4); for (let i = 0; i < 3; i++) B.s(`M${x - 6 + i * 4} ${y - 22 - i * 4}l2 -2`, '#c84a3a', 4.4); }
        else { B.post(-len + 8, -38, 0, 5, OAK); B.beam(-len + 6, -36, len * 2 - 12, 6, ['#e8e0cc', '#b8ae98', '#ffffff']); for (let x = -len + 14; x < len - 10; x += 16) B.f(B.rect(x, -36, 8, 6), '#c84a3a'); }
      } else if (kind === 'ruin') {
        // shut: the ring's fallen stones heaped in the opening, a voussoir on top, nettles through them
        B.shadow(0, 2, half * .9, 9, .3);
        elevation(B, side, half, art.S, () => {
          for (let row = 0; row < 4; row++) for (let i = 0; i < 6 - row; i++) { const x = (i - (5 - row) / 2) * half * .3 + (r() - .5) * 6, y = -4 - row * 11; B.stone(r, x, y, 10 + r() * 4, 6 + r() * 2, STONE, r() < .35 ? MOSS : null); }
          B.f(B.poly([[-10, -50], [12, -56], [16, -42], [-6, -38]]), STONE[0]).f(B.poly([[-10, -50], [12, -56], [13, -52], [-9, -47]]), STONE[2]);
          for (let i = 0; i < 9; i++) { const x = (r() - .5) * half * 1.4; B.s(`M${x} -2q${(r() - .5) * 6} -14 ${(r() - .5) * 4} ${-18 - r() * 16}`, '#4e6a36', 1.6, .9); }
        });
      } else if (kind === 'stair') {
        // the oak gate at the top of the steps, shut
        const sw = side ? 30 : half * 1.15; B.beam(-sw + 4, -92, sw * 2 - 8, 5, OAK).beam(-sw + 4, -66, sw * 2 - 8, 5, OAK);
        for (let x = -sw + 8; x < sw - 6; x += 8) B.post(x, -94, -58, 3.4, OAK);
        B.s(`M${-sw + 6} -64L${sw - 6} -90`, OAK[1], 3);
        B.f(B.rr(-4, -82, 8, 7, 1.4), '#6a6e70');
      } else {
        // a rope with prayer-flag pennants across the col
        const a = side ? [0, -half * .6] : [-half + 20, -40], b2 = side ? [0, half * .6] : [half - 20, -40];
        B.s(`M${a[0]} ${a[1]}Q${(a[0] + b2[0]) / 2 + (side ? 14 : 0)} ${(a[1] + b2[1]) / 2 + (side ? 0 : 12)} ${b2[0]} ${b2[1]}`, '#d8c08a', 1.6);
        for (let i = 1; i < 8; i++) { const t = i / 8, x = a[0] + (b2[0] - a[0]) * t + (side ? Math.sin(t * Math.PI) * 14 : 0), y = a[1] + (b2[1] - a[1]) * t + (side ? 0 : Math.sin(t * Math.PI) * 12); B.f(B.poly([[x - 3, y], [x + 3, y], [x, y + 8]]), ['#c84a3a', '#e8c84a', '#3a7ac0', '#f2f0e8'][i % 4]); }
        for (const p of [a, b2]) B.post(p[0], p[1] - 4, p[1] + 34, 3, WOOD);
      }
    };
    return Object.assign(art, { box, base, blocker, side, half });
  }
  function gateSignature(g, open, sc) { let have = ''; try { const rule = !open && typeof gardenGateRule === 'function' ? gardenGateRule(g) : null; if (rule && typeof gardenGateHas === 'function' && gardenGateHas(rule.key)) have = '|have'; } catch (e) { /* the sign as before */ } return 'painted-gate-3|' + g.id + '|' + gateKind(g) + '|' + (open ? 'open' : 'shut') + '|' + sc.season + '|' + (g.crossSpan || []).join(';') + have; }
  /** A gate as a handle. open: the region beyond is yours. */
  function gate(scene, g, sc, o, open) {
    open = !!open;
    if (typeof _gldIslandGateFrame !== 'function') return null;
    const frame = g.crossSpan ? _gldIslandGateFrame(g) : null; if (!frame) return null;
    const kind = gateKind(g), season = sc.season || 'summer', zone = typeof gardenZone === 'function' ? gardenZone(g.n) : null, lv = zone && zone.lv;
    const art = gateArt(kind, g, frame, season, open), stem = 'gate|' + g.id + '|' + kind + '|' + season + '|' + (art.side ? 's' : 'f');
    const h = handle(scene, o, g.id, { cls: 'gate', kind: open ? 'paintedgate' : 'gate' });
    const baseKey = bake(scene, stem + '|base|' + (open ? 'o' : 'c'), art.box, B => art.base(B));
    const lib = layer => { for (const [id, v, size, dx, dy, where] of art.lib) if (where === layer) h.add(libImage(scene, id, v, season, size, frame.x + dx, frame.y + dy, false)); };
    lib('back');
    if (!h.add(image(scene, baseKey, frame.x, frame.y))) { h.destroy(); return null; }
    lib('front');
    const was = gateSeen.get(g.id); gateSeen.set(g.id, !!open);
    const blockKey = bake(scene, stem + '|block', art.box, B => art.blocker(B));
    const rule = typeof gardenGateRule === 'function' ? gardenGateRule(g) : null, item = rule && typeof GARDEN_GATE_ITEMS !== 'undefined' && GARDEN_GATE_ITEMS[rule.key], need = item ? item.name.replace(/^(A|An|The) /, '').replace(/^(coil|bag) of /, '').replace(/^mill turning$/, 'the mill').toLowerCase() : '';   // (feat/find-gates: the gate opens with a find)
    const have = !!(need && typeof gardenGateHas === 'function' && gardenGateHas(rule.key));
    const signBox = [-40, -30, 40, 26], signKey = bake(scene, 'gatesign|' + (lv || 0) + '|' + need + (have ? '|have' : ''), signBox, B => needSign(B, 0, 0, lv, need, have));
    const sx = frame.x + (art.side ? 0 : 0), sy = frame.y - (kind === 'arch' ? 84 : kind === 'stair' ? 116 : kind === 'ruin' ? 72 : 70) + (art.side && kind !== 'stair' && kind !== 'arch' && kind !== 'ruin' ? -art.half * .2 : 0);
    if (!open) {
      h.add(image(scene, blockKey, frame.x, frame.y));
      const sign = h.add(image(scene, signKey, sx, sy)); sign.setScale(1.7 / K);
      // the sign sways on its hooks, barely
      h.move(sign, (node, t, motion) => { if (motion) node.setRotation(Math.sin(t * 1.3) * .03); });
    } else if (was === false) {
      // it has just opened: the barrier goes and the sign drops away
      const block = h.add(image(scene, blockKey, frame.x, frame.y)), sign = h.add(image(scene, signKey, sx, sy)); sign.setScale(1.7 / K);
      h.move(block, (node, t) => { const f = Math.min(1, t / 1.6); node.setAlpha(1 - f * f).setPosition(frame.x + (art.side ? 0 : f * 18), frame.y + f * 8); return f < 1; });
      h.move(sign, (node, t) => { const f = Math.min(1, t / 1.2); node.setAlpha(1 - f).setPosition(sx, sy + f * f * 40).setRotation(f * .6); return f < 1; });
    }
    const [x0, y0, x1, y1] = art.box;
    return finish(h, { x: frame.x + x0, y: frame.y + y0, width: x1 - x0, height: y1 - y0 }, { x: frame.x, y: frame.y });
  }

  /* ---------- Fleet Falls: rock step, falling sheet, spray, plunge pool ---------- */
  function falls(scene, spec, o) {
    const season = spec.season || 'summer', x = spec.x, y = spec.y, H = 176, Wd = Math.round(Math.max(40, Math.min(110, (spec.width || 96) * .55))), r = rng(hash(spec.id || 'falls'));
    const h = handle(scene, o, spec.id, { cls: 'falls', kind: 'falls' });
    const rock = ['#a39a86', '#7e7664', '#cbc3ad', '#5e584a'];
    const box = [-120, -H - 50, 120, 40];
    const baseKey = bake(scene, 'falls|' + season + '|' + Wd, box, B => {
      // the plunge pool and its pale lip
      B.f(B.ell(0, 8, 86, 22), '#4e7e8c').f(B.ell(0, 6, 74, 17), '#5f93a0').f(B.ell(-14, 4, 40, 7), '#88b8c0', .55).s(B.ell(0, 8, 86, 22), '#cfe2dc', 2, .5);
      // the rock step: big lobed masses lit from the upper left, darker in the cleft behind the water
      B.f(D().blob(r, 0, -H * .55, 112, H * .62, 12, .35), rock[1]);
      for (const [px, py, rx, ry] of [[-74, -40, 46, 44], [76, -46, 46, 48], [-58, -112, 44, 46], [62, -118, 46, 46], [-30, -H + 6, 44, 30], [34, -H + 2, 46, 30], [-86, -4, 30, 18], [90, -6, 30, 18]]) B.stone(r, px, py, rx, ry, rock, MOSS);
      // ledges of the step: each a lit top face with a shadow under it, the strata of the scarp
      for (const [ly, lw] of [[-H * .26, 96], [-H * .52, 104], [-H * .78, 92]]) for (const sgn of [-1, 1]) { const lx = sgn * (Wd / 2 + lw / 2 + 4); B.f(D().blob(r, lx, ly + 5, lw / 2, 5, 9, .3), rock[3], .45).f(D().blob(r, lx, ly, lw / 2, 4, 9, .3), rock[2], .85).f(D().blob(r, lx - sgn * 10, ly - 3, lw / 3, 3, 8, .4), MOSS[1], .75); }
      // the rock darkens where the spray keeps it wet
      for (const sgn of [-1, 1]) B.f(B.rect(sgn > 0 ? Wd / 2 + 2 : -Wd / 2 - 16, -H + 6, 14, H - 10), B.lin(0, -H, 0, 0, [[0, 'rgba(60,70,64,.15)'], [1, 'rgba(50,62,58,.55)']]));
      B.f(B.rect(-Wd / 2 - 6, -H, Wd + 12, H), '#3e4a4a');
      // trees and ferns crown the top; ivy hangs down the faces
      for (let i = 0; i < 6; i++) { const px = (i < 3 ? -1 : 1) * (Wd / 2 + 10 + (i % 3) * 16); B.s(`M${px} ${-H + 10}q${(r() - .5) * 8} 30 ${(r() - .5) * 4} ${40 + r() * 30}`, leafOf(season)[0], 2, .8); }
      // the falling sheet: a pale gradient, brightest at the lip, a green-blue core
      B.f(`M${-Wd / 2} ${-H}h${Wd}l4 ${H - 8}q${-Wd / 2 - 4} 10 ${-Wd - 8} 0z`, B.lin(0, -H, 0, 0, [[0, '#e8f4ee'], [.12, '#b6dcd8'], [.6, '#8cc4c4'], [1, '#d8eeea']]));
      B.f(`M${-Wd / 2 + 6} ${-H + 4}h${Wd * .3}l-2 ${H - 16}h${-Wd * .3}z`, '#eef8f2', .35);
      B.f(B.ell(0, -H, Wd / 2 + 4, 4), '#f2faf6', .9);
      // the foam where it lands
      for (let i = 0; i < 9; i++) B.f(D().blob(r, (r() - .5) * Wd * 1.6, -2 + (r() - .5) * 6, 10 + r() * 8, 4 + r() * 3, 7, .5), '#f4faf6', .7);
      // reeds and stones round the pool
      for (let i = 0; i < 8; i++) { const a = Math.PI * (.08 + .84 * r()), px = Math.cos(a) * 92 * (r() < .5 ? -1 : 1), py = 14 + Math.sin(a) * 14; B.stone(r, px, py, 7 + r() * 5, 4 + r() * 2, STONE, r() < .5 ? MOSS : null); }
    });
    // trees on the scarp top are the library's own, like the planting round them
    for (const [id, v, hh, dx, dy] of [['tree.pine', 0, 150, -84, -H + 8], [season === 'winter' ? 'tree.birch' : 'tree.green-birch', 1, 110, 86, -H + 14], ['tree.pine', 1, 120, 30 + Wd / 2, -H - 6]]) h.add(libImage(scene, id, v, season, { h: hh }, x + dx, y + dy, false));
    h.add(image(scene, baseKey, x, y));
    // ferns and bracken round the pool, the library's own plants
    for (const [id, v, hh, dx, dy] of [['plant.fern', 0, 30, -96, 10], ['plant.fern', 1, 26, 98, 12], ['plant.bracken', 0, 34, -70, 24], ['plant.fern', 2, 24, 70, 26], ['plant.reed', 0, 34, -40, 30], ['plant.reed', 1, 30, 46, 30]]) h.add(libImage(scene, id, v, season, { h: hh }, x + dx, y + dy, false));
    // live: streaks running down the sheet (a tile sprite scrolls; nothing redraws)
    const streakKey = bake(scene, 'falls-streak|' + Wd, [0, 0, Wd, 64], B => {
      const cx = B.cx; for (let i = 0; i < 10; i++) { const px = 3 + (i * 4.6) % (Wd - 6), py = (i * 23) % 64, len = 14 + (i * 7) % 18; B.s(`M${px} ${py}v${len}`, i % 3 ? '#ffffff' : '#d6eeea', i % 2 ? 1.4 : 2.2, .55); if (py + len > 64) B.s(`M${px} ${py - 64}v${len}`, i % 3 ? '#ffffff' : '#d6eeea', i % 2 ? 1.4 : 2.2, .55); }
      cx.globalCompositeOperation = 'destination-in'; cx.fillStyle = B.lin(0, 0, Wd, 0, [[0, 'rgba(0,0,0,0)'], [.15, 'rgba(0,0,0,1)'], [.85, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]); cx.fillRect(0, 0, Wd, 64); cx.globalCompositeOperation = 'source-over';
    });
    if (streakKey && scene.add.tileSprite) {
      const ts = scene.add.tileSprite(x, y - H / 2 - 4, Wd * K, (H - 8) * K, streakKey).setScale(1 / K).setAlpha(.8);
      h.add(ts); h.move(ts, (node, t, motion) => { if (motion) node.tilePositionY = -t * 150; });
    }
    // spray: soft puffs rising and spreading where the water lands
    const puff = bake(scene, 'puff', [-16, -10, 16, 10], B => { B.cx.fillStyle = B.rad(0, 0, 16, [[0, 'rgba(250,253,252,.9)'], [.5, 'rgba(240,248,246,.45)'], [1, 'rgba(240,248,246,0)']]); B.cx.save(); B.cx.scale(1, .62); B.cx.beginPath(); B.cx.arc(0, 0, 16, 0, Math.PI * 2); B.cx.fill(); B.cx.restore(); });
    for (let i = 0; i < 7; i++) { const im = h.add(image(scene, puff, x, y)), ph = i / 7, side = i % 2 ? 1 : -1; h.move(im, (node, t, motion) => { const f = ((motion ? t : 1.3) * .32 + ph) % 1; node.setPosition(x + side * (4 + f * (18 + (i % 3) * 8)), y - 4 - f * 34).setScale((.7 + f * 1.4) / K).setAlpha(Math.sin(f * Math.PI) * .55); }); }
    // ripples spreading over the pool
    const ring = bake(scene, 'ripple', [-40, -12, 40, 12], B => B.s(B.ell(0, 0, 36, 9), '#eef8f4', 1.6, .8));
    for (let i = 0; i < 3; i++) { const im = h.add(image(scene, ring, x, y + 10)), ph = i / 3; h.move(im, (node, t, motion) => { const f = ((motion ? t : .5) * .4 + ph) % 1; node.setScale((.4 + f * 1.2) / K, (.4 + f * 1.1) / K).setAlpha((1 - f) * .5); }); }
    return finish(h, { x: x + box[0], y: y + box[1], width: box[2] - box[0], height: box[3] - box[1] }, { x, y });
  }

  /* ---------- light pools: one soft texture, no hard disc ---------- */
  function poolKey(scene) {
    return bake(scene, 'lightpool', [-64, -64, 64, 64], B => { const cx = B.cx; cx.fillStyle = B.rad(0, 0, 64, [[0, 'rgba(255,226,160,.95)'], [.25, 'rgba(255,214,140,.55)'], [.55, 'rgba(255,200,120,.2)'], [.8, 'rgba(255,190,110,.06)'], [1, 'rgba(255,190,110,0)']]); cx.fillRect(-64, -64, 128, 128); });
  }

  /** At dusk and night: a soft warm pool on the ground (and a halo at the lamp), added light, no hard edge. */
  function glowPool(scene, h, x, y, w, haloY) {
    const key = poolKey(scene); if (!key) return;
    const pool = h.over(image(scene, key, x, y + 4)); pool.setScale(w / 256, w * .42 / 256).setAlpha(.34);
    if (haloY != null) { const halo = h.over(image(scene, key, x, haloY)); halo.setScale(.3).setAlpha(.5); h.move(halo, (node, t, motion) => { if (motion) node.setAlpha(.46 + Math.sin(t * 2.3 + x) * .04); }); }
  }
  function memory(scene) { let bytes = 0, n = 0; if (scene) for (const key of scene.textures.getTextureKeys()) if (key.startsWith(TEX + '|')) { const c = scene.textures.get(key).getSourceImage(); bytes += (c.width || 0) * (c.height || 0) * 4; n++; } return { propBytes: bytes, propTextures: n }; }
  function status(scene) { return Object.assign({ baked, bakeMs: Math.round(bakeMs), lastError, gates: [...gateSeen.entries()] }, scene ? memory(scene) : {}); }
  /* The kit API, for the painted scenery kits (terrain, water, forests):
   *   kit.brush(ctx)                  the scene-style brush (f, s, lin, rad, post, beam, stone, crown, tufts, flowers, shadow, text)
   *   kit.bake(scene, key, box, fn)   draw once into a supersampled canvas texture keyed by what it shows; returns the texture key
   *   kit.image(scene, key, x, y)     that texture as an image anchored at its (0, 0)
   *   kit.libImage(scene, id, v, season, size, x, y, night)  a 70-scene-lib object (trees, rocks, plants) as an image
   *   kit.handle(scene, o, id, {kind}) and kit.finish(h, bounds, foot)  a world drawing handle: h.add(im), h.move(im, fn(im, t, motion)), h.over(im) (above the night grade), h.lights
   *   kit.glowPool(scene, h, x, y, w, haloY)  a soft light pool and halo at dusk and night
   *   kit.paintIntoGround(scene, fn(ctx, {box, meadow, palette, rng, path}))  paint straight into the composed ground picture
   *   kit.falls(scene, {id, x, y, width, season}, o)  the village waterfall (rock step, sheet, streaks, spray, ripples) */
  const kit = Object.freeze({ brush, bake, image, libImage, handle, finish, glowPool, poolKey, rng, hash, leafOf, PALETTE: { WOOD, OAK, STONE, SLATE, IRON, MOSS, LEAF }, falls: (...a) => falls(...a), paintIntoGround: (scene, fn) => !!(window.GardenNativePainted && GardenNativePainted.paintIntoGround(scene, fn)) });
  /** A gate's drawing as a data URL, for previews: GardenPaintedProps.gatePreview('arch', true, 'summer', false). */
  function gatePreview(kind, side, season, open, span) {
    const sp = span || (side ? 60 : 96), frame = { x: 0, y: 0, span: sp, ux: side ? .16 : 1, uy: side ? 1 : 0 }, art = gateArt(kind, { id: 'preview-' + kind }, frame, season || 'summer', !!open);
    const [x0, y0, x1, y1] = art.box, c = document.createElement('canvas'); c.width = (x1 - x0) * K; c.height = (y1 - y0) * K; const cx = c.getContext('2d');
    cx.fillStyle = '#7d9a5a'; cx.fillRect(0, 0, c.width, c.height); cx.setTransform(K, 0, 0, K, -x0 * K, -y0 * K);
    ok(() => art.base(brush(cx))); if (!open) ok(() => art.blocker(brush(cx))); return c.toDataURL();
  }
  return { gatePreview, kit, decorTable: DECOR, paintTable: PAINT, memory, glowPool, prop, signature, decor, decorSignature, decorKnown, gate, gateSignature, gateKind, falls, poolKey, image, status, get lastError() { return lastError; } };
})();
