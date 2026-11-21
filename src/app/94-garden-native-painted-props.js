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
    // (village fix round 2: drawn on a canvas kept in memory: the texture made from it, and the click test that reads its pixels, never wait on the graphics card, which held a level-up for many seconds)
    const c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d', { willReadFrequently: true });
    cx.setTransform(K, 0, 0, K, -x0 * K, -y0 * K);
    if (ok(() => draw(brush(cx), cx)) === false) return null;
    // (village fix round 2) addImage, not addCanvas: a CanvasTexture reads every pixel back from the graphics card as it is
    // made, and at a level-up, with the card busy, that read held the page up for many seconds (a gate's picture: 20 s+)
    const tex = scene.textures.addImage(full, c);
    tex.customData = Object.assign(tex.customData || {}, { gpp: { ox: -x0 / (x1 - x0), oy: -y0 / (y1 - y0) } });
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
    const parts = [], moving = [], over = [], ground = [];
    let dead = false, clock = 0, last = null, paused = false;
    const add = (im, under) => { if (!im) return null; if (under) node._inner.addAt(im, 0); else node._inner.add(im); parts.push(im); return im; };
    const h = {
      root: node.target, rootNode: node, painted: true, cacheNodes: [], bounds: null, lights: [], kind: extra.kind || undefined, dynamic: false,
      // above the night grade (light, not paint): soft pools and halos
      over(im) { if (!im) return null; const layer = o.layer; if (layer && layer.add) { layer.add(im); im.setDepth(80005); over.push(im); } else node._inner.add(im); return im; },
      // Walkable bridge masonry shares the pier-deck layer below all actors.
      ground(im) { if (!im) return null; const layer = o.layer; if (!layer || !layer.add) return add(im); layer.add(im); im.setDepth(-9250); ground.push(im); parts.push(im); return im; },
      // A part of a ground-level picture that stands up (a bridge's near parapet): in the object layer at its own
      // foot line, so whoever walks behind it is drawn behind it. Follows the handle's visibility, goes with it.
      standing(im, depth, hit) { if (!im) return null; const layer = o.standing; if (!layer || !layer.add) return add(im); layer.add(im); im.setDepth(depth); im._gppStanding = true; ground.push(im); if (hit) parts.push(im); return im; },   // (no object layer, a preview: with the rest of the picture)
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
        if (dead) return;
        for (const im of ground) { im.setVisible(node.target.visible); im.setAlpha(node.target.alpha); }
        if (!moving.length) return; const dt = last == null ? 0 : Math.min(.08, Math.max(0, (time - last) / 1000)); last = time;
        const motion = !paused && (typeof gardenMotionOn !== 'function' || gardenMotionOn()); if (motion) clock += dt;
        if (!node.target.visible) return;
        for (let i = moving.length - 1; i >= 0; i--) { const m = moving[i]; if (m.fn(m.im, clock, motion) === false) { m.im.destroy(); moving.splice(i, 1); } }
      },
      pauseAmbient(state) { paused = !!(state && (state.hush || state.frozen)); },
      setLitWindows() {},
      destroy() { if (dead) return; dead = true; for (const im of over) im.destroy(); over.length = 0; for (const im of ground) im.destroy(); ground.length = 0; node.remove(); },
    };
    return h;
  }
  function finish(h, b, foot) { h.bounds = b; h.rootNode.nativeBounds = b; if (foot) h.foot = foot; return h; }
  /** A standing picture's own shadow on the ground (its silhouette laid over along the world's one light, with a contact at its foot),
   *  gone when the picture is: a decoration picked up or moved leaves no shadow behind. (x, y): its foot in world px. */
  function castOf(scene, im, x, y, flip, a) {
    if (!im || !im.texture || !window.GardenPaintGround || !GardenPaintGround.cast) return null;
    const dw = im.displayWidth, dh = im.displayHeight, ox = im.originX, oy = im.originY;
    const id = GardenPaintGround.cast.add(scene, { key: im.texture.key, x, y, box: [-dw * ox, -dh * oy, dw * (1 - ox), dh * (1 - oy)], a: a == null ? .5 : a, flip: !!flip });
    if (id) im.once('destroy', () => GardenPaintGround.cast.drop(id)); return id;
  }
  /** (village fix round 3) The box round what is really drawn in an image (its opaque pixels, the same test the click
   * uses), in world px; worked out once per texture from the canvas kept in memory. The click area is this box, not the
   * picture's padded canvas: the notice board's, the post box's and the lamp's took in the empty paving round them. */
  function tightBox(im) {
    try {
      const tex = im && im.texture, src = tex && tex.getSourceImage(); if (!src || !src.getContext) return null;
      const cd = tex.customData || (tex.customData = {}); let T = cd.gppTight;
      if (T === undefined) { T = null; const w = src.width, hh = src.height, d = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, hh).data; let a0 = w, b0 = hh, a1 = -1, b1 = -1;
        for (let y = 0; y < hh; y += 2) for (let x = 0; x < w; x += 2) if (d[(y * w + x) * 4 + 3] >= 96) { if (x < a0) a0 = x; if (x > a1) a1 = x; if (y < b0) b0 = y; if (y > b1) b1 = y; }
        if (a1 >= 0) { let f0 = w, f1 = -1; const fy = Math.max(b0, b1 - Math.max(4, (b1 - b0) * .15)); for (let y = Math.floor(fy / 2) * 2; y <= b1; y += 2) for (let x = 0; x < w; x += 2) if (d[(y * w + x) * 4 + 3] >= 96) { if (x < f0) f0 = x; if (x > f1) f1 = x; } T = [a0, b0, Math.min(w, a1 + 2), Math.min(hh, b1 + 2), f0, Math.min(w, f1 + 2)]; }
        cd.gppTight = T; }
      if (!T) return null; const sx = im.scaleX, sy = im.scaleY, left = im.x - im.displayOriginX * sx, top = im.y - im.displayOriginY * sy;
      return { x: left + T[0] * sx - 3, y: top + T[1] * sy - 3, width: (T[2] - T[0]) * sx + 6, height: (T[3] - T[1]) * sy + 6, footX: left + (T[4] + T[5]) / 2 * sx };
    } catch (e) { return null; }
  }

  /* ---------- the props of the village ---------- */
  const SIGN = (B, x, y, w, label, size) => { B.f(B.rr(x - w / 2 + 1, y - 6, w, 13, 2.5), 'rgba(40,32,20,.25)').f(B.rr(x - w / 2, y - 7.5, w, 13, 2.5), '#efe4c6').f(B.rect(x - w / 2 + 1, y - 7.5, w - 2, 1.4), '#fff8e6', .8).text(label, x, y - .8, size || 7.2, '#4a3b26'); };
  const PAINT = {
    // UK pillar box: a red drum with a domed cap, the slot, a white plate, a black plinth
    postbox: { box: [-12.5, -64, 12.5, 8], draw(B, o) {   // (fix round 2: as wide as the box itself now no letter lies beside it, so its click area is the box)
      const r = rng(5); B.shadow(1, 1, 11, 4, .32);
      B.f(B.rr(-10, -6, 20, 7, 1.5), IRON[0]).f(B.rect(-10, -6, 20, 1.2), IRON[1]);
      B.f(B.rect(-9, -44, 18, 39), B.lin(-9, 0, 9, 0, [[0, '#d65a48'], [.35, '#c03a2e'], [1, '#86241c']]));
      B.f(B.ell(0, -44, 9, 3), '#a42c22').f('M-10 -45q0 -12 10 -12q10 0 10 12z', B.lin(-10, -57, 8, -45, [[0, '#dc6450'], [1, '#922820']])).f(B.ell(-3, -52, 3, 1.6), '#f08a72', .55);
      B.f(B.rect(-10, -46, 20, 2.4), '#8e2820').f(B.rr(-6, -38, 12, 2.6, 1), '#2a1a16').f(B.rect(-6, -38, 12, .8), '#6a2a22');
      B.f(B.rr(-5, -31, 10, 8, 1), '#f4eee0').s('M-3 -28h6M-3 -25.5h4', '#8a8478', .7).f(B.rect(-9, -10, 18, 2), '#8e2820');
      B.f(B.rect(-8.2, -43, 2.2, 36), '#ee8a70', .35);
      // (village fix round 2) it stands on the square's paving: no grass growing out of the stones at its foot, and no white
      // letter lying on the ground beside it (the flag on the box says when there is post); the plinth's worn foot instead
      void r; B.f(B.ell(0, 1.2, 12, 2.2), '#6a5a44', .22).f(B.rect(-10, -1.2, 20, 1.2), '#5a5048', .5);
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
    seat: ['street.bench', 0, { w: 84 }, 0.66],   /* (a long low bench: the seat at 0.3 of the player's height, the size standard, so you sit with your feet on the ground: 94-garden-zz-7act-0table.js seat) */ lamp: ['street.lamp', 0, { h: Math.round(gardenSizePx('lamp') / .61) }], lampbox: ['street.lamp', 0, { h: Math.round(gardenSizePx('lamp') / .61) }],   /* (a lamp post is 1.8 to 2 times the player; the post is .61 of the library lamp's box) */ lighthouse: ['building.lighthouse', 0, { h: 190 }],
    reeds: null, boat: null,
  };
  // what each painter's thing stands in (GardenPaintSeat): false for things afloat or in reeds
  const SEATS = { postbox: { kind: 'flags', w: 24 }, lectern: { kind: 'flags', w: 30 }, sundial: { kind: 'flags', w: 34 }, tripod: { kind: 'earth', w: 28, way: false }, board: { kind: 'earth', w: 84 }, lakeboard: { kind: 'flags', w: 30 }, smoker: { kind: 'earth', w: 34 }, well: { kind: 'flags', w: 50 }, sign: { kind: 'turf', w: 20, stones: 3 }, fountain: { kind: 'flags', w: 90 }, bench: { kind: 'earth', w: 84 }, 'sight:mill': { kind: 'earth', w: 176, stones: 0 }, 'sight:barn': { kind: 'earth', w: 148 }, 'sight:smoke': { kind: 'earth', w: 112 }, 'sight:hide': { kind: 'turf', w: 80, stones: 0 }, 'sight:churn': { kind: 'flags', w: 50 }, 'sight:frogstone': { kind: 'moss', w: 48, stones: 0, way: false }, 'lib:seat': { kind: 'earth', w: 76, stones: 0 }, 'lib:lamp': { kind: 'flags', w: 14, stones: 2, way: false }, 'lib:lampbox': { kind: 'flags', w: 14, stones: 2, way: false }, 'lib:lighthouse': { kind: 'flags', w: 60 }, 'lib:reeds': false, 'lib:boat': false, post: { kind: 'earth', w: 12, stones: 0, way: false } };
  // (village fix round 1: the harbour's lighthouse is a tower, six and a half times the player, not a little taller than a
  // cottage; the tall white one with the black lantern, which has no keeper's cottage leaning into the foot of its tower)
  LIB.lighthouse = ['building.lighthouse', 1, { h: 300 }];
  function propPainter(prop) {
    if (!prop) return null;
    if (window.GardenPaintedMarks && GardenPaintedMarks.knows(prop.id)) return null;   // (a sight painted into its place: 94-garden-paint-terrain-5sights.js)
    if (prop.id === 'craft-bench') return 'bench';
    // (the old woodland's hut and ice house are drawn to the size standard by 94-garden-paint-vale-1oldwood.js, layout round 3)
    if ((prop.id === 'ld-woodhut' || prop.id === 'ld-icehouse') && window.GardenPaintedMarks && GardenPaintedMarks.knows(prop.id)) return null;
    if (prop.id === 'jetty-post') return 'post';
    const k = prop.art || String(prop.kind || '').replace(/^l[df]-/, '');
    if (PAINT['sight:prop-' + prop.id]) return 'sight:prop-' + prop.id;   // (round 3: a place's own drawing, e.g. the woodland's log benches, 94-garden-paint-vale-1woodland.js)
    if (PAINT[KIND[k] || ''] ) return KIND[k];
    if (PAINT['sight:' + k]) return 'sight:' + k;   // (landmark painters registered by area files, e.g. 94-garden-native-painted-valley.js)
    if (k in LIB) return 'lib:' + k;
    return null;
  }
  function signature(prop, sc, night) { const p = propPainter(prop); const P = p && PAINT[p], more = P && P.sig ? ok(() => P.sig(prop, sc)) || '' : ''; return p ? 'painted-prop-3|' + p + '|' + prop.id + '|' + [prop.x, prop.y, prop.w, prop.h, sc.season, night ? 'n' : 'd'].join(',') + more : null; }
  function prop(scene, prop, sc, o) {
    const which = propPainter(prop); if (!which) return null;
    const season = sc.season || 'summer', night = !!o.night, W = o.W;
    const fx = (prop.x + prop.w / 2) * W.cellW, foot = W.sky + (prop.y + prop.h) * W.cellH - 3;
    const h = handle(scene, o, prop.id, { cls: which.replace(':', '-') });
    let b, visual = null;
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
        if (LIB[k][3]) im.setScale(im.scaleX, im.scaleY * LIB[k][3]);   // (lower, not narrower: it keeps its footprint)
        const top = foot - im.displayHeight * im.originY; b = { x: fx - im.displayWidth / 2 - 6, y: top - 4, width: im.displayWidth + 12, height: foot - top + 12 };
        // (round 3) a seat's picture stood two thirds of a cell to the right of its own foot: its legs over the block
        if (k === 'seat') { const t0 = tightBox(im); if (t0 && Math.abs(t0.footX - fx) > 3) im.x += fx - t0.footX; }
        { const t = tightBox(im); if (t) { visual = b; b = t; } }
        if (k === 'lamp' || k === 'lampbox') { h.lights.push({ x: fx, y: top + 14, radius: 120, pool: true }); if (night) glowPool(scene, h, fx, foot, 110, top + 12); }
      }
    } else {
      const P = PAINT[which], more = P.sig ? ok(() => P.sig(prop, sc)) || '' : '', key = bake(scene, which + '|' + season + '|' + (night ? 'n' : 'd') + more, P.box, B => P.draw(B, { season, night, prop, sc, more }));
      // The public board's two 7px posts stand at +/-36 and end at y=1.
      // Align those feet with its protected span, retaining the roof overhang.
      // (village fix round 3) the post box and the camera on its tripod at the size standard: a pillar box a little under the
      // player's height, not half as tall again; the camera no bigger than a shoebox
      const board = prop.id === 'notice-board' && which === 'board', scale = board ? prop.w * W.cellW / 79 : which === 'postbox' ? .74 : which === 'tripod' ? .8 : P.scale ? ok(() => P.scale(prop)) || 1 : 1, artFoot = foot - (board ? scale : 0) - (P.lift ? ok(() => P.lift(prop)) || 0 : 0);   // (lift: a drawing whose base runs below its foot, raised onto its own footprint)
      const im = h.add(image(scene, key, fx, artFoot)); if (!im) { h.destroy(); return null; }
      if (scale !== 1) im.setScale(scale / K);
      b = { x: fx + P.box[0] * scale, y: artFoot + P.box[1] * scale, width: (P.box[2] - P.box[0]) * scale, height: (P.box[3] - P.box[1]) * scale };
      // (round 3) the lake board's posts stood well right of its foot; the click area is what is drawn, not its canvas
      if (which === 'lakeboard') { const t0 = tightBox(im); if (t0 && Math.abs(t0.footX - fx) > 3) im.x += fx - t0.footX; }
      { const t = tightBox(im); if (t) { visual = b; b = t; } }
      if (which === 'fountain') addDrops(scene, h, fx, foot - 52, 16);
      if (P.extra) ok(() => P.extra(scene, h, fx, artFoot, { season, night, prop, sc, more, W, scale }));
    }
    // seated in the ground it stands on (94-garden-paint-terrain-5sights.js): a worn apron, foundation, contact, growth, a way to the path
    { const st = SEATS[which]; if (st !== false && window.GardenPaintSeat && o.layer) { const seat = ok(() => GardenPaintSeat.add(scene, o.layer, prop, W, Object.assign({ season, x: fx, foot }, st || {}))); if (seat) { const d0 = h.destroy; h.destroy = () => { seat.destroy(); d0(); }; } } }
    finish(h, b, { x: fx, y: foot }); if (visual) h.rootNode.nativeBounds = { x: Math.min(visual.x, b.x), y: Math.min(visual.y, b.y), width: Math.max(visual.x + visual.width, b.x + b.width) - Math.min(visual.x, b.x), height: Math.max(visual.y + visual.height, b.y + b.height) - Math.min(visual.y, b.y) };   // (the drawing keeps its whole canvas for caching)
    return h;
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
  DECOR.lantern = ['lib', 'street.lamp', 0, { h: Math.round(gardenSizePx('lamp', .3) / .61) }];   /* (a lantern on a post is a lamp post: 1.8 to 2 times the player; the post is .61 of the library lamp's box) */
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
    if (castOf(scene, im, fx, foot, !!item.flip)) h.shaded = true;   /* (its silhouette is on the ground: no second, moving shadow from the light module) */
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
    // the opening: the path running on beyond, in shade; shut, it is black dark under the ring until the lantern goes up
    // (it was sunlit and only heaped with rubble, the lantern's hook a faint post: hunter, round 3)
    B.f(`M${-half} 0V${spring}A${half} ${ry} 0 0 1 ${half} ${spring}V0z`, open ? B.lin(0, spring - ry, 0, 0, [[0, 'rgba(36,40,30,.62)'], [.7, 'rgba(60,70,46,.38)'], [1, 'rgba(90,100,70,.12)']]) : B.lin(0, spring - ry, 0, 0, [[0, 'rgba(10,12,10,.96)'], [.6, 'rgba(18,22,16,.9)'], [1, 'rgba(34,40,28,.55)']]));
    if (open) B.f(`M${-half} 0V${spring}A${half} ${ry} 0 0 1 ${half} ${spring}V0z`, B.rad(-half + 16, spring + 18, half * 1.3, [[0, 'rgba(255,214,140,.42)'], [.5, 'rgba(255,200,120,.14)'], [1, 'rgba(255,200,120,0)']]));
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
    // the lantern's iron bracket on the west pier, its hook empty while the way is shut; once open the lantern hangs there, lit
    { const bx = -half, by = spring + 10;
      B.s(`M${bx - 3} ${by}h16M${bx + 1} ${by}l7 -7`, IRON[0], 2.2).s(`M${bx - 3} ${by - .8}h16`, IRON[1], .7, .8).f(B.rect(bx - 6, by - 4, 4, 8), IRON[0]);
      if (!open) B.s(`M${bx + 12} ${by}v4a2 2 0 1 0 3 2`, IRON[0], 1.4);
      else { const lx = bx + 12, ly = by + 4; B.f(B.circ(lx, ly + 9, 18), 'rgba(255,214,140,.28)').s(`M${lx} ${by}v4`, IRON[0], 1.2).f(B.poly([[lx - 5, ly], [lx + 5, ly], [lx + 4, ly + 13], [lx - 4, ly + 13]]), '#ffd27a').s(`M${lx - 5} ${ly}L${lx + 5} ${ly}L${lx + 4} ${ly + 13}L${lx - 4} ${ly + 13}Z`, IRON[0], 1.1).f(B.poly([[lx - 6, ly], [lx, ly - 5], [lx + 6, ly]]), IRON[0]).f(B.circ(lx, ly + 6.5, 2.6), '#fff4c8'); }
    }
  }
  /** The forest arch, face on: two old trees whose trunks lean in and grow into one bough over the way, a crown along the top, ivy hanging in the opening. */
  function livingArch(B, r, half, rise, season, open, side) {
    const L = leafOf(season), tw = 15;
    // the opening: the woodland path beyond, in green shade (seen side on, the way through is the real ground, path and all:
    // a shade there was a dark box standing on the lane)
    if (!side) B.f(`M${-half + 4} 0C${-half + 2} ${-rise * .62} ${-half * .5} ${-rise + 10} 0 ${-rise + 10}C${half * .5} ${-rise + 10} ${half - 2} ${-rise * .62} ${half - 4} 0z`, B.lin(0, -rise, 0, 0, [[0, 'rgba(26,40,24,.7)'], [.65, 'rgba(46,66,36,.42)'], [1, 'rgba(80,100,60,.14)']]));
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
  /** The forest arch where its way runs across the screen (the Vale's: you cross west into the woods). Seen side on, the
   *  old face-on arch sheared into a tilted hoop of leaves standing alone at the mist (art director and hunter, round 3).
   *  Now it is a gap in the woodland edge: a holly and hawthorn bank runs on north and south of the way, an old oak stands
   *  either side of the path and their crowns meet over it in one canopy, ivy hanging. y runs down the screen, (0, 0) is
   *  the middle of the way, S half the span. */
  /** The forest arch seen side on: its feet aslant across the way (north-west and south-east of the crossing) and the
   *  curve between them as screen points, its crown about 3 H over the way. Shared by the art and what blocks walking. */
  function archSide(S) {
    const n = [-34, -S - 12], s = [34, S + 6], HA = 150, pts = [];
    for (let i = 0; i <= 24; i++) { const t = i / 24, z = HA * Math.pow(Math.sin(Math.PI * t), .55); pts.push([n[0] + (s[0] - n[0]) * t, n[1] + (s[1] - n[1]) * t - z]); }
    return { n, s, pts };
  }
  function woodArchSide(B, r, S, season, open) {
    const L = leafOf(season), yn = -S - 10, ys = S + 4, bark = ['#6e5236', '#523c28', '#94744c', '#2e2418'], snowy = season === 'winter';
    const bank = (y0, y1) => {   // a hedge bank from y0 to y1 (ascending), painted far to near
      B.f(D().blob(r, 2, (y0 + y1) / 2 + 4, 34, (y1 - y0) / 2 + 8, 10, .3), '#4e6234', .5);
      for (let y = y0; y <= y1; y += 6.5) { const h = 46 + r() * 12, w = 26 + r() * 9, x = (r() - .5) * 6;
        B.f(D().blob(r, x + 3, y - h * .44, w, h * .56, 9, .42), L[0], .98).f(D().blob(r, x - 3, y - h * .6, w * .74, h * .38, 8, .45), L[1], .96).f(D().blob(r, x - 9, y - h * .76, w * .4, h * .2, 7, .5), L[2], .92);
        if (r() < .35) B.f(D().blob(r, x - 12, y - h * .84, w * .16, h * .08, 6, .5), L[3], .8);
        if (!snowy && r() < .55) for (let k = 0; k < 3; k++) B.f(B.circ(x + (r() - .5) * w * 1.3, y - h * (.3 + r() * .5), 1.5), season === 'autumn' ? '#b8302a' : season === 'spring' ? '#f6f2e8' : '#9e1e26', .95);
        if (snowy) B.f(D().blob(r, x - 4, y - h * .9, w * .6, 3, 7, .5), '#eef2f0', .85);
      }
      for (let y = y0; y <= y1; y += 9) B.tufts(r, 22 + r() * 8, y + 2, 10, 4, season).tufts(r, -22 - r() * 8, y + 2, 10, 4, season);
    };
    const trunk = (x0, y0, x1, y1, w) => {
      for (let i = 0; i < 4; i++) { const s = i % 2 ? 1 : -1; B.s(`M${x0 + s * w * .3} ${y0 - 4}q${s * (8 + i * 5)} 3 ${s * (16 + i * 7)} ${7 - i}`, bark[1], 6 - i, 1); }
      B.shadow(x0 + 6, y0 + 2, w * 1.6, 6, .34);
      B.f(`M${x0 - w * .62} ${y0}C${x0 - w * .5} ${(y0 + y1) / 2} ${x1 - w * .4} ${y1 + 20} ${x1 - w * .36} ${y1}L${x1 + w * .36} ${y1}C${x1 + w * .4} ${y1 + 20} ${x0 + w * .5} ${(y0 + y1) / 2} ${x0 + w * .62} ${y0}Z`, bark[1]);
      B.f(`M${x0 - w * .62} ${y0}C${x0 - w * .5} ${(y0 + y1) / 2} ${x1 - w * .4} ${y1 + 20} ${x1 - w * .36} ${y1}L${x1 - w * .05} ${y1}C${x1 - w * .1} ${y1 + 22} ${x0 - w * .14} ${(y0 + y1) / 2} ${x0 - w * .2} ${y0}Z`, bark[2], .7);
      for (let k = 0; k < 9; k++) { const t = .08 + k * .1, x = x0 + (x1 - x0) * t + (r() - .5) * w * .5, y = y0 + (y1 - y0) * t; B.s(`M${x} ${y}q${(r() - .5) * 3} -7 ${(r() - .5) * 2} -13`, bark[3], 1, .5); }
      B.f(B.ell(x0 + (x1 - x0) * .45 + w * .1, y0 + (y1 - y0) * .45, 3, 4.4), bark[3], .7);
      if (!snowy) for (let k = 0; k < 5; k++) B.f(D().blob(r, x0 - w * .3 + (r() - .5) * 4, y0 - 6 - k * 9, 4, 3, 6, .5), k % 2 ? MOSS[0] : MOSS[2], .8);   // moss up the shaded foot
    };
    // Round 4 (art director: "a tall foliage column ... no arch appears at all"): the arch is a hooped arbour of bent hazel
    // set a little aslant across the way, its far foot north-west and its near foot south-east, so from the south you see
    // its curve and the path running on through it, not a stack of banks and crowns. Low hedge banks run off either side.
    const arch = archSide(S), foot = (p, w) => { B.shadow(p[0] + 4, p[1] + 1, w, 4, .3); for (let i = 0; i < 4; i++) B.f(D().blob(r, p[0] + (r() - .5) * 14, p[1] + 1, 5, 2.4, 6, .4), i % 2 ? MOSS[0] : MOSS[2], .85); };
    bank(yn - 70, yn - 18);
    foot(arch.n, 16);
    // the hoops: three bent rods side by side along the way (it has depth), the far one darkest, tied across with withies
    const hoop = (dx, col, wd) => B.s(arch.pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x + dx} ${y}`).join(''), col, wd);
    // (fix loop 1, west: three rods 7 px apart are one thin bent line from the lane, the curve hidden in itself because a
    // hoop across an east-west way stands edge on to the camera. It is a short tunnel now: three hoops a long stride apart
    // along the way, a roof of leaves grown over the three, so from the lane you see a leafy arch with depth, its posts
    // at the feet, the dark way under it and the path running on through it)
    const GAP = 24, n = arch.pts.length - 1, Ld = leafOf(season);
    hoop(-GAP, bark[3], 5); hoop(-GAP, bark[1], 3.2);
    hoop(0, bark[3], 5.4); hoop(0, bark[1], 3.6); hoop(0, bark[2], 1.2);
    // withies tied across from hoop to hoop up the sides
    for (let i = 2; i < n - 1; i += 3) { const [x, y] = arch.pts[i]; B.s(`M${x - GAP} ${y}L${x} ${y}`, bark[2], 1.6, .9); }
    // the roof: the shade under it first (you look up into it), then lit leaf masses over the whole width, fullest over the crown
    for (let i = 3; i < n - 2; i++) { const [x, y] = arch.pts[i], t = i / n, k = 1 - Math.abs(t - .5) * 1.6; if (k <= 0) continue;
      B.f(D().blob(r, x, y + 6, GAP * .9 + 8, 7 + k * 6, 9, .35), Ld[0], .95); }
    for (let i = 3; i < n - 2; i++) { const [x, y] = arch.pts[i], t = i / n, k = 1 - Math.abs(t - .5) * 1.6; if (k <= 0) continue;
      for (let dx = -GAP - 4; dx <= GAP + 4; dx += 9) { const rr2 = 6 + k * 7 + r() * 3; B.crown(r, x + dx + (r() - .5) * 5, y - 3 - k * 3 + (r() - .5) * 4, rr2, rr2 * .72, season, 3); }
      if (!snowy && season !== 'winter' && r() < .6) B.f(B.circ(x + (r() - .5) * GAP * 2, y - 6 - r() * 6, 1.9), season === 'autumn' ? '#c8402a' : '#f2c8d0').f(B.circ(x + (r() - .5) * GAP * 2, y - 3, 1.4), '#f6e6a0'); }
    // leaves climbing the far posts from their feet
    for (let i = 1; i < 6; i++) for (const dx of [-GAP, 0]) { const [x, y] = arch.pts[i]; if (r() < .7) B.crown(r, x + dx + (r() - .5) * 5, y, 5 + r() * 3, 4 + r() * 2, season, 3); }
    // trails hanging off the roof's underside over the way
    for (let i = 7; i < n - 6; i += 2) for (const dx of [-GAP * .6, GAP * .4]) { const [x, y] = arch.pts[i], len = 8 + r() * 16; B.s(`M${x + dx} ${y + 8}q${(r() - .5) * 6} ${len * .5} ${(r() - .5) * 4} ${len}`, Ld[0], 1.4, .9).f(B.ell(x + dx + (r() - .5) * 3, y + 8 + len, 2.4, 1.7), Ld[1], .9); }
    bank(ys + 10, ys + 64);
    foot(arch.s, 18); foot([arch.s[0] + GAP, arch.s[1]], 16);
    // the near hoop, in front of the way: its post bare at the foot, leafed over the top
    hoop(GAP, bark[3], 5.6); hoop(GAP, bark[1], 3.8); hoop(GAP, bark[2], 1.4);
    for (let i = 2; i < n - 1; i += 3) { const [x, y] = arch.pts[i]; if (i > n * .2 && i < n * .8) continue; B.s(`M${x} ${y}L${x + GAP} ${y}`, bark[2], 1.6, .9); }
    for (let i = 4; i < n - 3; i++) { const [x, y] = arch.pts[i], t = i / n, k = 1 - Math.abs(t - .5) * 1.7; if (k <= 0 || r() < .25) continue; B.crown(r, x + GAP + (r() - .5) * 6, y - 1, 6 + k * 6, 5 + k * 4, season, 3); }
    for (let i = n - 7; i < n; i++) { const [x, y] = arch.pts[i]; if (r() < .6) B.crown(r, x + GAP + (r() - .5) * 6, y, 6 + r() * 4, 5 + r() * 2, season, 3); }
    if (snowy) for (let i = 2; i < arch.pts.length - 2; i += 2) { const [x, y] = arch.pts[i]; B.f(D().blob(r, x, y - 3, 6, 1.8, 6, .5), '#eef2f0', .9); }
    if (open) {
      // cut: the bramble's stubs either side of the way, a heap of cut canes pushed to the bank, flowers where it was
      for (const y of [yn + 14, ys - 12]) for (let i = 0; i < 6; i++) { const x = -26 + i * 9 + (r() - .5) * 4, h = 6 + r() * 7; B.s(`M${x} ${y}l${(r() - .5) * 3} ${-h}`, '#6a3a36', 1.8).f(B.circ(x + .6, y - h, 1), '#c8a888', .9); }
      for (let i = 0; i < 7; i++) { const x = -86 + r() * 22, y = ys - 4 + r() * 6;   // (laid on the grass west of the near foot, not on the hedge bank: hunter, round 3)
        B.s(`M${x} ${y}q${8 + r() * 8} ${-6 - r() * 6} ${16 + r() * 10} ${(r() - .5) * 4}`, '#5e3434', 1.6, .95); B.f(D().blob(r, x + 10, y - 4, 4, 2.4, 6, .5), '#2e4a26', .9); }
      B.flowers(r, 0, yn + 22, 50, 6, snowy ? ['#f2f0e8'] : ['#e8c84a', '#f2f0e8', '#c86aa0']).flowers(r, 0, ys - 18, 50, 6, snowy ? ['#f2f0e8'] : ['#f2f0e8', '#e8c84a']);
    }
  }
  /** Brambles grown right over the way between the two oaks (shut): a mound of arching thorny canes, leaves in threes,
   *  white flowers and berries, canes climbing the trunks. Something shears can cut. */
  function brambleSide(B, r, S, season) {
    const yn = -S - 6, ys = S, cane = ['#5e2e30', '#7a3e3a', '#8e5446'], leaf = season === 'autumn' ? ['#5a3a24', '#8a4a2a', '#a8602e'] : season === 'winter' ? ['#3e4636', '#545c46', '#6a5644'] : ['#24401e', '#34582a', '#4e7438'];
    // (fix loop 1, west: the mound stood 48 px tall and 92 wide down the whole span, so from the lane it read as a column
    // of berries filling the arch. It is a sprawling thicket now: low (it lies under the arch's crown, the opening shows
    // over it), wide along the way, tapering into the grass at both ends with canes arching out over the path)
    const WX = 64;
    B.cx.save(); B.cx.translate(-18, 0);   // (it lies mostly on the shut side: the open lane's side stays walkable to its edge)
    B.shadow(4, 4, WX + 8, ys - yn, .22);
    // a low dark mound of leaves first, so the canes arch out of it, not a stack of red strokes (round 3, first look)
    for (let y = yn; y <= ys; y += 6) { const mid = 1 - Math.abs(y - (yn + ys) / 2) / ((ys - yn) / 2), h = 14 + mid * 14; B.f(D().blob(r, 0, y - h * .45, WX * .62 + mid * 16, h * .55, 10, .4), leaf[0], .97).f(D().blob(r, -6, y - h * .62, WX * .4 + mid * 10, h * .3, 9, .45), leaf[1], .9); }
    for (let y = yn; y <= ys; y += 4.2) {
      const mid = 1 - Math.abs(y - (yn + ys) / 2) / ((ys - yn) / 2), h = 15 + mid * 16 + r() * 5;
      if ((Math.round(y) & 3) < 2) { const k = Math.round(y) & 1, x0 = -WX - 4 + r() * 40, x1 = x0 + 40 + r() * 46, top = y - h * (.8 + r() * .5); B.s(`M${x0} ${y}Q${(x0 + x1) / 2} ${top} ${x1} ${y - 2 + r() * 4}`, cane[k], 1.3 + r() * .6, .9); for (let t = .2; t < .9; t += .2) { const px = x0 + (x1 - x0) * t, py = y + (top - y) * 4 * t * (1 - t) * .5; B.s(`M${px} ${py}l1.6 -1.4`, '#2a1618', .6, .9); } }
      for (let k = 0; k < 7; k++) { const u = r() * 2 - 1, x = u * WX * .92, py = y - h * (1 - Math.abs(u) * .6) * (.2 + r() * .75); for (let j = 0; j < 3; j++) { const a = -1.6 + j * 1.05 + (r() - .5) * .3; B.f(B.ell(x + Math.cos(a) * 3.6, py + Math.sin(a) * 2.6, 3.2, 2), leaf[(j + k) % 3], .97); } }
      if (season !== 'winter' && r() < .55) { const x = (r() - .5) * WX * 1.3, py = y - h * (.4 + r() * .5); if (season === 'summer' || season === 'spring') B.f(B.circ(x, py, 1.8), '#f6f0f0').f(B.circ(x, py, .7), '#e8d070'); else B.f(B.circ(x, py, 1.9), '#1e1426').f(B.circ(x - .6, py - .6, .6), '#6a5a8a', .8); }
      if (season === 'summer' && r() < .5) B.f(B.circ((r() - .5) * WX * 1.2, y - h * (.3 + r() * .4), 1.7), r() < .5 ? '#b0283a' : '#2a1826');
    }
    // long canes reaching out over the lane at both ends, rooting where they touch the ground
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { const y = yn + 8 + r() * (ys - yn - 16), x0 = s * WX * .6, x1 = s * (WX + 14 + r() * 18), top = y - 14 - r() * 10; B.s(`M${x0} ${y - 6}Q${(x0 + x1) / 2} ${top} ${x1} ${y + 1}`, cane[i % 3], 1.3, .9); B.f(B.ell(x1, y + 1, 2.6, 1.4), leaf[i % 3], .9); }
    B.cx.restore();
    // canes climbing the arch's hoops from both feet and hanging off its crown over the way
    const A = archSide(S);
    for (let i = 0; i < A.pts.length - 1; i++) { if (r() < .35) continue; const [x0, y0] = A.pts[i], [x1, y1] = A.pts[i + 1]; B.s(`M${x0 + (r() - .5) * 6} ${y0}Q${(x0 + x1) / 2 + (r() - .5) * 14} ${(y0 + y1) / 2 + (r() - .5) * 10} ${x1} ${y1}`, cane[i % 3], 1.5, .9); if (r() < .5) B.f(B.ell(x0 + (r() - .5) * 8, y0 + (r() - .5) * 6, 3, 2), leaf[i % 3], .95); }
    for (let i = 8; i < 17; i += 2) { const [x, y] = A.pts[i], len = 10 + r() * 16; B.s(`M${x} ${y}q${(r() - .5) * 8} ${len * .6} ${(r() - .5) * 6} ${len}`, cane[i % 3], 1.3, .9).f(B.ell(x + (r() - .5) * 4, y + len, 2.6, 1.7), leaf[1], .9); }
  }
  /** A gate drawn face on. side: the span runs down the screen, so the face is sheared to recede (back pier up the screen, front pier down). */
  function elevation(B, side, half, S, draw) {
    if (!side) return draw();
    B.cx.save(); B.cx.transform(.85, S / half * .8, 0, 1, 0, 0); try { draw(); } finally { B.cx.restore(); }
  }
  /** Where a shut gate's sign is fixed, from the shape of what bars the way (never in the air over the path):
   *  chains from the arch's crown, nailed to the bridge's post or the stair gate, on a stake in the ruin's heap,
   *  hung from the middle of the pass's rope. { x, y } is the board's middle from the gate's frame point; len is how
   *  far the chains, cords or stake run from the board's top (or bottom, for a stake). */
  function gateMount(kind, art, frame, crossing) {
    const side = art.side, half = art.half;
    if (kind === 'arch') return side ? { how: 'chains', x: 0, y: -94, len: 38 } : { how: 'chains', x: 0, y: -80, len: 30 };   // (side on: from the hoops' crown)
    if (kind === 'bridge') {
      if (side && crossing) {
        const W = GARDEN_WORLD, deck = typeof gardenIslandCrossingGeometry === 'function' ? gardenIslandCrossingGeometry().find(d => d.crossing.id === crossing.id) : null, narrow = deck && deck.halfWidth < 40;
        const x = crossing.x * W.cellW - frame.x, y = W.sky + crossing.y * W.cellH - frame.y + (narrow ? deckCentreY(deck, crossing) : 0), a = y - (narrow ? deck.halfWidth - 3 : frame.span);
        return { how: 'post', x, y: a - 40, len: 0, post: [x, a - 50, a - 36] };
      }
      const len = side ? 74 : half;
      return side ? { how: 'post', x: -len * .55 + 6, y: -18 * .7 - 4 - 44, len: 0, post: [-len * .55 + 6, -18 * .7 - 4 - 54, -18 * .7 - 4 - 40] } : { how: 'post', x: -len + 8, y: -48, len: 0, post: [-len + 8, -58, -38] };
    }
    if (kind === 'ruin') return { how: 'stake', x: 4, y: -70, len: 22 };
    if (kind === 'stair') { const g = side ? 0 : 52; return { how: 'nails', x: 0, y: g - 79, len: 0 }; }
    // the pass: from the rope's middle
    return side ? { how: 'cords', x: 7, y: 20, len: 15 } : { how: 'nails', x: -28, y: -24, len: 0 };   // (nailed to the tie post at the foot of the climb)
  }
  /** A shut gate's sign: a weathered oak board with a painted face, the padlock and what opens it written on the board
   *  itself in dark letters (a find), else the level it opens at in the HUD's gold badge. Drawn round the board's middle. */
  function needSign(B, lv, name, have, m) {
    const W2 = 31, H2 = 19, r = rng(hash('gatesign' + (name || lv) + m.how));
    // what holds it: chains or cords up to the arch or the rope, a stake down into the stones, a post behind it
    if (m.how === 'chains' || m.how === 'cords') {
      const top = -H2 - m.len;
      for (const sx of [-W2 + 9, W2 - 9]) {
        if (m.how === 'chains') for (let y = -H2; y > top; y -= 3.6) B.f(B.ell(sx + (y - -H2) * (sx < 0 ? -.06 : .06), y - 1.8, 1, 1.9), '#3e4246').f(B.ell(sx + (y - -H2) * (sx < 0 ? -.06 : .06) - .3, y - 2.2, .4, 1), '#8a9094', .8);
        else B.s(`M${sx} ${-H2}L${sx * .4} ${top}`, '#c8b080', 1.3).s(`M${sx} ${-H2}L${sx * .4} ${top}`, '#7a6440', .5, .7);
      }
      if (m.how === 'cords') B.f(B.circ(0, top, 2.2), '#b89a6a');
    }
    if (m.how === 'stake') B.post(0, H2 - 4, H2 + m.len, 5, OAK).f(B.poly([[-2.5, H2 + m.len], [2.5, H2 + m.len], [0, H2 + m.len + 4]]), OAK[1]);
    if (m.how === 'post') B.post(0, -H2 - 6, H2 + 8, 7, OAK).f(B.rect(-4, -H2 - 8, 8, 3), OAK[2]);
    // the board: two oak planks, end grain at the corners, a dark edge on the shaded side
    B.f(B.rr(-W2 - 1.2, -H2 - .4, W2 * 2 + 2.6, H2 * 2 + 2.4, 3), 'rgba(30,22,14,.35)');
    B.f(B.rr(-W2, -H2, W2 * 2, H2 * 2, 2.6), OAK[1]);
    for (const [y0, h, c] of [[-H2, H2, '#8e6c48'], [0, H2, '#7e5e3e']]) { B.f(B.rect(-W2 + 1, y0 + .8, W2 * 2 - 2, h - 1.6), c); for (let i = 0; i < 5; i++) { const yy = y0 + 2 + r() * (h - 4); B.s(`M${-W2 + 2 + r() * 8} ${yy}q${W2 * .6} ${(r() - .5) * 2} ${W2 * (1.2 + r() * .6)} ${(r() - .5) * 1.5}`, '#5e4430', .5, .45); } }
    B.s(`M${-W2 + 1} 0H${W2 - 1}`, '#3e2c1c', .9, .7).f(B.rect(-W2, -H2, W2 * 2, 1.6), '#c8a476', .65).f(B.rect(W2 - 5, -H2, 5, H2 * 2), '#2e2014', .2);
    // the painted face, cream gone soft at its edges, light falling across it from the upper left
    B.f(B.rr(-W2 + 4, -H2 + 4, W2 * 2 - 8, H2 * 2 - 8, 2), '#efe2c0').f(B.rr(-W2 + 4, -H2 + 4, W2 * 2 - 8, H2 * 2 - 8, 2), B.lin(-W2, -H2, W2, H2, [[0, 'rgba(255,250,232,.35)'], [.6, 'rgba(255,250,232,0)'], [1, 'rgba(90,64,36,.22)']]));
    for (let i = 0; i < 9; i++) B.f(B.circ(-W2 + 5 + r() * (W2 * 2 - 10), -H2 + 5 + r() * (H2 * 2 - 10), .5 + r() * .7), '#b89a70', .35);
    // iron nails or ring bolts at the corners
    for (const [nx, ny] of m.how === 'chains' || m.how === 'cords' ? [[-W2 + 9, -H2 + 2.2], [W2 - 9, -H2 + 2.2]] : [[-W2 + 2.4, -H2 + 2.4], [W2 - 2.4, -H2 + 2.4], [-W2 + 2.4, H2 - 2.4], [W2 - 2.4, H2 - 2.4]]) B.f(B.circ(nx, ny, 1.3), '#3a3e40').f(B.circ(nx - .4, ny - .4, .5), '#9aa0a2');
    // the padlock (its shackle open once you hold what opens it)
    const lx = -W2 + 13, ly = 2;
    B.s(have ? `M${lx - 4} ${ly - 3}v-6a4 4 0 0 1 8 0v-1` : `M${lx - 4} ${ly - 3}v-3a4 4 0 0 1 8 0v3`, '#5a5e60', 2).f(B.rr(lx - 6.4, ly - 3.4, 12.8, 10, 1.8), have ? '#6a9a4a' : '#c89a3a').f(B.rect(lx - 6.4, ly - 3.4, 12.8, 2.4), have ? '#9ac46a' : '#e8c060').f(B.circ(lx, ly + 1.2, 1.4), '#3a2810').f(B.rect(lx - .5, ly + 1.6, 1, 2.6), '#3a2810');
    // the words, dark on the cream, shrunk to fit the face
    const tx = 7, fit = (t, size, weight) => { const cx = B.cx; let s = size; cx.font = weight + ' ' + s + 'px Inter, sans-serif'; const wd = cx.measureText(t).width; if (wd > 34) s = s * 34 / wd; return s; };
    if (!name && !have) {
      B.text('Opens at', tx, -7.4, fit('Opens at', 6.2, '700'), '#6a5034', 'Inter, sans-serif', '700');
      B.f(B.circ(tx, 5, 8.4), '#5a4024').f(B.circ(tx, 5, 7.4), '#e8b530').f(B.circ(tx - 1.6, 3.2, 3.8), '#f6d468', .6).text(String(lv || '?'), tx, 5.4, lv >= 10 ? 8 : 9.5, '#3a2408', 'Inter, sans-serif', '800');
      B.text('level', tx + 15.5, 9.6, 4.6, '#6a5034', 'Inter, sans-serif', '700');
    } else {
      const top = have ? 'Ready' : 'Needs', low = have ? 'to open' : name;
      B.text(top, tx, -6.2, fit(top, 7, '700'), '#6a5034', 'Inter, sans-serif', '700');
      B.text(low, tx, 5.6, fit(low, 9.6, '800'), '#3a2614', 'Inter, sans-serif', '800');
    }
    // weather: a lichen crust on the top plank, a drip stain under a nail
    B.f(D().blob(r, W2 - 7, -H2 + 2, 3.6, 1.4, 6, .5), '#b8b878', .55).s(`M${-W2 + 2.4} ${-H2 + 4}q.4 6 -.2 10`, '#4a3626', .6, .35);
  }
  /** One gate as base art + (closed) a blocker + its sign. side: the span runs down the screen (you cross left to right). */
  /** The deck's centre line at the crossing's x, as a y offset (px) from the crossing point. */
  function deckCentreY(deck, crossing) {
    const W = GARDEN_WORLD, X = crossing.x * W.cellW, t = Math.max(0, Math.min(1, (X - deck.a.x) / ((deck.b.x - deck.a.x) || 1)));
    return deck.a.y + (deck.b.y - deck.a.y) * t - (W.sky + crossing.y * W.cellH);
  }
  /** Millwater bridge: a two-arched stone road bridge on its lane-wide deck
   *  (the shared crossing geometry), drawn round the crossing point. Setts on
   *  the deck, a parapet with a coping either side, the downstream face with
   *  its arches and cutwater going down into the river, ivy and valerian. */
  function millBridge(B, r, deck, crossing, season, open) {
    const W = GARDEN_WORLD, O = { x: crossing.x * W.cellW, y: W.sky + crossing.y * W.cellH }, L = deck.length, hw = deck.halfWidth;
    const hump = t => 4.5 * Math.sin(Math.PI * Math.max(0, Math.min(L, t)) / L);
    const q = (t, s, lift) => { const p = deck.deckPoint(t / L, s); return [p.x - O.x, p.y - O.y - (lift || 0)]; };
    const run = (s, lift, t0, t1, step) => { const out = []; t0 = t0 == null ? 0 : t0; t1 = t1 == null ? L : t1; for (let t = t0; t < t1; t += step || 4) out.push(q(t, s, typeof lift === 'function' ? lift(t) : lift)); out.push(q(t1, s, typeof lift === 'function' ? lift(t1) : lift)); return out; };
    const band = (top, bot) => B.poly(top.concat(bot.slice().reverse()));
    const pathOf = pts => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
    const PAR = 9, FACE = 24, leaf = season === 'winter' ? ['#2f4a2c', '#46663c', '#6a8a54'] : ['#2e4e2a', '#43693a', '#6a9a50'];   // (ivy keeps its green)
    const stone = ['#c3b89c', '#a99e83', '#ddd3b8', '#81786a'], sett = ['#cdbf9c', '#c4b593', '#d6c9a6', '#bcae8c'];
    // 1. The bridge's shadow on the water downstream, and the wet line at its foot.
    B.cx.save(); B.cx.filter = 'blur(4px)';
    B.f(band(run(hw, -FACE + 2, L * .14, L * .86), run(hw, -FACE - 12, L * .14, L * .86)), 'rgba(24,40,46,.35)');
    B.cx.restore();
    // 2. The deck: worn setts the colour of the lane, the wheel-worn middle paler.
    const deckPoly = band(run(-hw), run(hw));
    B.f(deckPoly, '#b3a585');
    B.cx.save(); B.cx.clip(new Path2D(deckPoly));
    for (let s = -hw; s < hw; s += 5.2) {
      const row = Math.round((s + hw) / 5.2);
      for (let t = (row & 1) * 3.5 - 4; t < L + 4; t += 7) { const p = q(t, s), k = (row * 13 + Math.round(t) * 7) % 4; B.f(B.rr(p[0] + .4, p[1] + .4, 6.2, 4.4, 1.2), sett[k]); }
    }
    B.f(band(run(-hw * .38), run(hw * .38)), '#e0d3b0', .22);
    for (let i = 0; i < 26; i++) { const p = q(r() * L, (r() - .5) * hw * 1.6); B.f(B.ell(p[0], p[1], 2 + r() * 3, .9 + r()), r() < .5 ? '#a3967a' : '#efe4c4', .22); }
    // the crown of the old arch fell in long ago and was patched in oak, planks laid across on two bearers; while the
    // bridge is shut one plank is gone and the river shows through the gap (the gate's story: "a plank is missing")
    { const T = millPlanks(L), [t0, t1] = T.span;
      B.f(band(run(-hw, 0, t0 - 1, t1 + 1, 2), run(hw, 0, t0 - 1, t1 + 1, 2)), '#3e3020');
      for (let i = 0; i < T.n; i++) { const [ta, tb] = T.plank(i), quad = [q(ta, -hw + .5), q(tb, -hw + .5), q(tb, hw - .5), q(ta, hw - .5)];
        if (!open && i === T.gap) {
          // the gap: the river seen through it, bright and moving, the plank ends either side dark with the drop
          const wide = [q(ta - 1.2, -hw + .5), q(tb + 1.2, -hw + .5), q(tb + 1.2, hw - .5), q(ta - 1.2, hw - .5)];
          B.f(B.poly(wide), B.lin(0, wide[0][1], 0, wide[2][1], [[0, '#3e6e78'], [.5, '#5a92a0'], [1, '#4a8290']]));
          for (const f of [.3, .62]) { const g0 = q(ta + .5, (f * 2 - 1) * hw * .8), g1 = q(tb - .5, (f * 2 - 1) * hw * .8 + 2); B.s(`M${g0[0]} ${g0[1]}L${g1[0]} ${g1[1]}`, '#e6f4f2', .9, .8); }
          for (const t of [ta - 1.2, tb + 1.2]) { const a = q(t, -hw + .5), b = q(t, hw - .5); B.s(`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`, '#1e1810', 1.4, .9); }
          continue;
        }
        B.f(B.poly(quad), ['#b8996c', '#a8895e', '#c4a576', '#ae9064'][i % 4]);
        const e0 = q(ta + .6, -hw + 1), e1 = q(ta + .6, hw - 1); B.s(`M${e0[0]} ${e0[1]}L${e1[0]} ${e1[1]}`, '#c8a878', .6, .6);
        for (const s of [-hw * .62, hw * .62]) { const n = q((ta + tb) / 2, s); B.f(B.circ(n[0], n[1], .8), '#2a2420'); }
        for (let k = 0; k < 2; k++) { const a = q(ta + 1 + r() * (tb - ta - 2), -hw * .9), b = q(ta + 1 + r() * (tb - ta - 2), hw * (.2 + r() * .6)); B.s(`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`, '#5e4630', .45, .5); } }
    }
    B.cx.restore();
    // 3. The upstream parapet: its inner face (lit, facing the road) and a coping.
    const farTop = run(-hw, t => PAR + hump(t)), farFoot = run(-hw, 0);
    B.f(band(farTop, farFoot), B.lin(0, -hw - PAR, 0, -hw + 4, [[0, stone[0]], [1, stone[1]]]));
    for (let k = 1; k < 3; k++) B.s(pathOf(run(-hw, t => k * PAR / 3 + hump(t) * k / 3)), '#8a8170', .55, .45);
    for (let t = 6; t < L - 4; t += 8 + r() * 3) { const p = q(t, -hw, 1); B.s(`M${p[0].toFixed(1)} ${p[1].toFixed(1)}v${-PAR + 2}`, '#8a8170', .5, .35); }
    B.f(band(run(-hw - 2.5, t => PAR + hump(t) + 1), run(-hw + 1.5, t => PAR + hump(t))), stone[2]).s(pathOf(run(-hw + 1.5, t => PAR + hump(t))), '#958b77', .7, .6);
    // 4. The downstream face: coursed stone from the parapet's coping down into
    //    the river, two arches with the water shadowed beneath them, a cutwater.
    // The face sinks to the river between the banks; at each end it meets the bank
    // as a short wing, not a slab hanging over the grass.
    const foot = t => { const e = Math.min(t, L - t) / (L * .16); return e >= 1 ? -FACE : -2 - (FACE - 2) * e * e * (3 - 2 * e); };
    const faceTop = run(hw, t => PAR + hump(t)), faceBot = run(hw, foot, 0, L, 2);
    B.f(band(faceTop, faceBot), B.lin(0, -PAR + hw * .2, 0, FACE + hw, [[0, stone[0]], [.55, stone[1]], [1, '#7c7666']]));
    B.cx.save(); B.cx.clip(new Path2D(band(faceTop, faceBot)));
    for (let row = 0; row < 8; row++) {
      const lift = PAR - 2 - row * 4.2; if (lift < -FACE) break;
      B.s(pathOf(run(hw, t => lift + hump(t) * (1 - row / 8))), '#80776a', .6, .45);
      for (let t = (row & 1) * 5 + 3; t < L; t += 9 + r() * 4) { const p = q(t, hw, lift + hump(t) * (1 - row / 8)); B.s(`M${p[0].toFixed(1)} ${p[1].toFixed(1)}v4`, '#80776a', .55, .4); if (r() < .18) B.f(B.rect(p[0] + 1, p[1] + .6, 6, 3), r() < .5 ? stone[2] : stone[3], .35); }
    }
    for (const c of [.31, .69]) {
      const t0 = L * (c - .15), t1 = L * (c + .15), crown = 15, arch = [];
      for (let i = 0; i <= 16; i++) { const u = i / 16, t = t0 + (t1 - t0) * u; arch.push(q(t, hw, -FACE + Math.sin(Math.PI * u) * (crown + FACE * .25) )); }
      const opening = pathOf(arch) + 'Z';
      B.f(opening, B.lin(0, -crown, 0, FACE + hw, [[0, '#1e2c2c'], [.6, '#2d4648'], [1, '#3e6266']]));
      // the voussoir ring
      for (let i = 0; i < 16; i++) { const p0 = arch[i], p1 = arch[i + 1], mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2; B.s(`M${p0[0].toFixed(1)} ${(p0[1] - .5).toFixed(1)}L${p1[0].toFixed(1)} ${(p1[1] - .5).toFixed(1)}`, i % 2 ? stone[2] : stone[0], 3.4, .95); B.s(`M${mx.toFixed(1)} ${(my - 2.4).toFixed(1)}v2.8`, '#7d7465', .6, .6); }
      // light on the water under the arch, and the reflection's bright rim
      const w0 = q(t0 + 4, hw, -FACE + 2), w1 = q(t1 - 4, hw, -FACE + 2); B.s(`M${w0[0]} ${w0[1]}L${w1[0]} ${w1[1]}`, '#9cc4c8', 1.2, .5);
    }
    { // the cutwater between the arches, its point upstream hidden, its nose downstream
      const m = q(L * .5, hw, -FACE), top = q(L * .5, hw, -FACE + 13); B.f(B.poly([[m[0] - 6, m[1]], [top[0] - 4, top[1]], [top[0] + 4, top[1]], [m[0] + 6, m[1]], [m[0], m[1] + 5]]), stone[1]).f(B.poly([[m[0] - 6, m[1]], [top[0] - 4, top[1]], [top[0], top[1]], [m[0], m[1] + 5]]), stone[2], .55);
    }
    B.cx.restore();
    // the foot of the face in the water: a pale wet line where the current meets it
    B.s(pathOf(run(hw, -FACE, L * .16, L * .84)), '#e6f0ee', 1.4, .5);
    // 5. The downstream parapet's coping, in front of the road.
    B.f(band(run(hw - 2.5, t => PAR + hump(t) + 1), run(hw + 1.2, t => PAR + hump(t))), stone[2]).s(pathOf(run(hw - 2.5, t => PAR + hump(t) + 1)), '#f0e8d2', .8, .7);
    // 6. End piers: square caps a little proud of each parapet, where the banks begin.
    for (const t of [0, L]) for (const s of [-hw, hw]) {
      const p = q(t, s, PAR + 3), w2 = 4.5;
      B.f(B.rr(p[0] - w2, p[1] - 1, w2 * 2, PAR + 4, 1), stone[1]).f(B.rr(p[0] - w2 - .8, p[1] - 3, w2 * 2 + 1.6, 4, 1.2), stone[2]).f(B.rect(p[0] - w2, p[1] + 1, 2, PAR + 1), stone[2], .5);
    }
    // 7. Ivy down the face by the west pier, moss on the copings, valerian in the joints.
    const ivy = q(L * .08, hw, -2);
    B.f(D().blob(r, ivy[0], ivy[1] + 4, 9, 7, 8, .55), leaf[0], .95).f(D().blob(r, ivy[0] - 2, ivy[1] + 2, 6, 4, 7, .5), leaf[1], .95).f(D().blob(r, ivy[0] - 3, ivy[1] + 1, 3, 2, 6, .5), leaf[2], .9);
    for (let i = 0; i < 4; i++) B.s(`M${ivy[0] + (r() - .5) * 8} ${ivy[1] + 6}q${(r() - .5) * 5} 7 ${(r() - .5) * 3} ${8 + r() * 8}`, leaf[0], 1.3, .9);
    for (const [t, s] of [[L * .22, -hw - 1], [L * .74, -hw - 1], [L * .55, hw]]) { const p = q(t, s, PAR + hump(t) + 1); B.f(D().blob(r, p[0], p[1], 5 + r() * 3, 1.6, 7, .5), MOSS[0], .8).f(D().blob(r, p[0] - 1, p[1] - .6, 3, .9, 6, .5), MOSS[1], .8); }
    if (season !== 'winter') for (const t of [L * .86, L * .9]) { const p = q(t, hw, 2); B.s(`M${p[0]} ${p[1]}q-1 -5 1 -8M${p[0] + 2} ${p[1]}q2 -4 3 -6`, '#6a8a4a', 1, .9).f(B.circ(p[0] + .6, p[1] - 8.4, 1.8), '#c8506a', .95).f(B.circ(p[0] + 3, p[1] - 6.4, 1.4), '#d86a80', .95); }
    if (open) { const p = q(-2, -hw - 6), x = p[0], y = p[1]; B.post(x, y - 34, y, 3, IRON).f(B.rr(x - 4, y - 44, 8, 10, 1.5), '#f2e6b8').f(B.poly([[x - 6, y - 44], [x, y - 50], [x + 6, y - 44]]), IRON[0]); }
  }
  /** Where the Millwater bridge's oak patch lies along its deck (t from its west end, px): the planks and the one that is missing. */
  function millPlanks(L) { const t0 = L * .43, t1 = L * .57, n = 6, w = (t1 - t0) / n; return { span: [t0, t1], n, gap: 3, plank: i => [t0 + i * w + .35, t0 + (i + 1) * w - .35] }; }
  /** A stair crossing's flight: centred on the path that climbs it (the route through the gate, read from the layout) and as
   *  wide as that path, not the whole gap in the wall; px from the gate's frame centre. */
  function stairFit(g, frame, half) {
    const W = GARDEN_WORLD, D0 = typeof gardenIslandData === 'function' ? gardenIslandData() : null, cy = (frame.y - W.sky) / W.cellH;
    let best = null;
    for (const rt of (D0 && D0.routes) || []) { if (rt.gateId !== g.id || !rt.points) continue; for (const p of rt.points) { const x = Array.isArray(p) ? p[0] : p.x, y = Array.isArray(p) ? p[1] : p.y, d = Math.abs(y - cy) + Math.abs(x * W.cellW - frame.x) / W.cellW * .2; if (!best || d < best.d) best = { d, x, w: rt.widthCells || 2.4 }; } }
    if (!best || best.d > 2) return { cx: 0, sw: half * 1.55 };
    return { cx: Math.max(-half, Math.min(half, best.x * W.cellW - frame.x)), sw: Math.min(half * 1.55, Math.min(best.w, 2.6) * W.cellW * .5 * .66 + 2) };   // (the art is drawn a little larger than the cells: this matches the lane's painted width)
  }
  function gateArt(kind, g, frame, season, open, crossing) {
    const side = Math.abs(frame.uy) > Math.abs(frame.ux), half = Math.max(46, Math.min(80, frame.span * .62)), r = rng(hash(g.id + kind));
    const L = leafOf(season), art = { S: frame.span * .9 };
    const oak = season === 'winter' ? 'tree.oak' : 'tree.green-oak';
    // library objects standing in the crossing: [id, variant, size, dx, dy, 'back' | 'front']
    art.lib = kind === 'arch' ? []
      : kind === 'stair' ? [['tree.cherry', 0, { h: 104 }, -(side ? 30 : half * 1.55) - 58, -14, 'back'], ['tree.cherry', 1, { h: 96 }, (side ? 30 : half * 1.55) + 58, -10, 'back']]
      : kind === 'pass' ? (side ? [['tree.pine', 0, { h: 170 }, 34, -art.S - 20, 'back'], ['rock.boulder', 0, { w: 96 }, 0, -art.S * .8, 'back'], ['rock.boulder', 1, { w: 110 }, 0, art.S * .8 + 6, 'front']] : [['rock.boulder', 0, { w: 100 }, -half - 24, 2, 'back']]   /* (Cloudbreak layout: no pine at the pass, its crown stood over the Way's fork; the west boulder a half cell further out, flanking the Way, not on it; no east boulder: its stack stood on the orchard field's hedge corner) */)
      : kind === 'ruin' ? [['tree.proof-yew', 0, { h: 130 }, side ? 40 : half + 52, side ? -art.S : -6, 'back']] : [];
    // what of the drawing blocks walking, [dx, dy, width] px from the crossing (read by gateTrees, so the feet follow the
    // art): the side-on forest arch's north oak and its two hedge banks, so the way through is the gap between them only
    art.feet = [];
    // the orchard stair's two dry-stone cheeks block walking where they are drawn: east of the leat you walked up onto
    // the wall (hunter, round 3). One box per course, as wide as the cheek's stones.
    if (kind === 'stair' && !side) { const sw = half * 1.55, dy = 52; for (const s of [-1, 1]) for (let row = 0; row < 7; row++) art.feet.push([s * (sw + 24), dy - 4 - row * 7.6, 44]); }
    if (kind === 'arch' && side) { const yn = -art.S - 10, ys = art.S + 4, A = archSide(art.S); art.feet.push([A.n[0], A.n[1], 14], [A.s[0], A.s[1], 16], [A.n[0] - 24, A.n[1], 12], [A.s[0] + 24, A.s[1], 14]);   /* (each hoop's posts: woodArchSide's GAP) */ for (let y = yn - 70; y <= yn - 18; y += 6) art.feet.push([0, y, 58]); for (let y = ys + 10; y <= ys + 64; y += 6) art.feet.push([0, y, 58]); }
    // the box of the drawing round the crossing's centre
    const box = kind === 'arch' && side ? [-120, -240, 120, 176] : (kind === 'arch' || kind === 'ruin') && side ? [-half * .85 - 90, -art.S - 200, half * .85 + 90, art.S + 30] : side ? [kind === 'bridge' ? -150 : -100, -170 - half * .9, kind === 'bridge' ? 150 : 100, kind === 'bridge' ? frame.span + 28 : half * .9 + 22] : [-half - 90, -200, half + 90, kind === 'stair' ? 60 : 24];
    const base = (B) => {
      if (kind === 'arch') {
        if (side) { woodArchSide(B, r, art.S, season, open); return; }
        B.shadow(0, 2, half + 30, 10, .26);
        elevation(B, side, half, art.S, () => livingArch(B, r, half, 128, season, open, side));
      } else if (kind === 'bridge') {
        // a stone hump bridge: the arch below, the deck, two parapets with copings
        const len = side ? 74 : half * 1.1, w = side ? frame.span : 30;
        const deck = side && crossing && typeof gardenIslandCrossingGeometry === 'function' ? gardenIslandCrossingGeometry().find(d => d.crossing.id === crossing.id) : null;
        if (deck && deck.halfWidth < 40) millBridge(B, r, deck, crossing, season, open);
        else if (side) {
          // This is a low masonry crossing with broad, flush landings. Tall
          // curved sheets made its standing plane read as a vertical block.
          const N = 24, xs = Array.from({ length: N + 1 }, (_, i) => -len + i * 2 * len / N), band = (top, bot) => B.poly(xs.map(x => [x, top(x)]).concat(xs.slice().reverse().map(x => [x, bot(x)])));
          B.shadow(0, w + 5, len + 2, 3.5, .16);
          B.f(band(() => -w - 5, () => -w), '#908d76').f(band(() => -w - 5, () => -w - 3.5), '#c7bfa4');
          for (let i = 1; i < 9; i++) { const x = -len + i * len / 4.5; B.s(`M${x} ${-w - 4.5}v4`, '#716f5d', .6, .45); }
          // Quiet worn flags fill the complete support. The road through the
          // middle carries the stronger pattern; shoulders remain ground.
          B.f(band(() => -w, () => w), '#aca790');
          const wear = Array.from({ length: 22 }, () => ({ x: r(), y: r(), tone: r() }));
          for (let row = 0; row < 5; row++) for (let col = 0; col < 6; col++) {
            const tone = wear[(row * 6 + col) % wear.length].tone, x = -len + 2 + col * (len * 2 - 4) / 6, y = -w + 2 + row * (w * 2 - 4) / 5, sw = (len * 2 - 4) / 6, sh = (w * 2 - 4) / 5;
            B.f(B.poly([[x + 1, y + 1], [x + sw - 1, y + 2], [x + sw - 2, y + sh - 1], [x + 2, y + sh - 2]]), tone < .5 ? '#bcb59b' : '#a09e86', .25);
            if ((row + col) % 4 === 0) B.s(`M${x + 4} ${y + sh - 2}l${sw - 8} .6`, '#787a65', .65, .28);
          }
          const route = crossing && typeof gardenIslandData === 'function' && (gardenIslandData().routes || []).find(route => route.id === crossing.along);
          if (route) {
            const W = GARDEN_WORLD, road = gardenIslandRoutePath(route).points, roadY = x => {
              const wx = crossing.x + x / W.cellW;
              for (let i = 1; i < road.length; i++) { const a = road[i - 1], b = road[i]; if (wx < Math.min(a.x, b.x) || wx > Math.max(a.x, b.x) || Math.abs(b.x - a.x) < 1e-8) continue; return (a.y + (b.y - a.y) * (wx - a.x) / (b.x - a.x) - crossing.y) * W.cellH; }
              return 0;
            }, roadHalf = gardenIslandRoadStyle(route).radius * W.cellH, width = x => roadHalf + 4 * Math.sin(Math.PI * (x + len) / (2 * len)), upper = x => roadY(x) - width(x), lower = x => roadY(x) + width(x), lane = band(upper, lower);
            B.cx.save(); B.cx.clip(new Path2D(lane));
            B.f(lane, '#c9b58c');
            for (let row = 0; row < 14; row++) for (let col = 0; col < 13; col++) {
              const x = -len + col * 12 + (row & 1) * 6, y = -w + row * 8;
              B.f(B.rr(x + .45, y + .45, 11.1, 7.1, 1), ['#d5c39b', '#cdbb94', '#dccaa2'][(row * 7 + col * 3 + (col & 1)) % 3]);
            }
            B.cx.restore();
            for (const edge of [upper, lower]) B.s(xs.map((x, i) => `${i ? 'L' : 'M'}${x} ${edge(x)}`).join(''), '#daceaf', 1.1, .45);
            // Dressed end stones sit within the supported deck. Their courses
            // turn into each bank while leaving the road-width opening flush.
            for (const sign of [-1, 1]) {
              const x = sign < 0 ? -len : len - 6, y = roadY(sign * len), gap = roadHalf + 2;
              for (const range of [[-w, y - gap], [y + gap, w]]) {
                if (range[1] <= range[0]) continue;
                B.f(B.rect(x, range[0], 6, range[1] - range[0]), '#a29e86').f(B.rect(x + (sign < 0 ? 1 : 4), range[0], 1, range[1] - range[0]), '#c3bba0', .6);
                for (let yy = range[0] + 12; yy < range[1]; yy += 14) B.s(`M${x + 1} ${yy}h4`, '#78735f', .65, .5);
              }
            }
          }
          // A few soft worn faces, kept within the deck and without crack outlines.
          for (const q of wear) B.f(B.ell((q.x - .5) * (len * 2 - 12), (q.y - .5) * (w * 2 - 8), 2.5 + q.tone * 2, .7), q.tone < .5 ? '#a89e85' : '#eee2c4', .16);
          // Only a shallow course is visible below the near edge. Short dark
          // water arches suggest the culvert without a second raised panel.
          B.f(band(() => w, () => w + 6), '#8d8b74');
          for (const x of [-len * .26, len * .26]) B.f(`M${x - 17} ${w + 6}q17 -8 34 0z`, '#456467', .85);
          B.f(band(() => w - 3, () => w + .5), '#b9b297').f(band(() => w - 3, () => w - 1.8), '#d6ccb0', .8);
          for (let i = 1; i < 11; i++) { const x = -len + i * len / 5.5; B.s(`M${x} ${w - 2.5}v3`, '#817e69', .65, .6); }
          B.f(D().blob(r, -len + 5, w + 4, 7, 2.2, 7, .4), MOSS[0], .65).f(D().blob(r, len - 7, w + 3, 6, 2, 7, .4), MOSS[1], .65);
        } else {
          B.f(`M${-len} 0q${len} -40 ${len * 2} 0z`, '#3e5a5e', .5);
          for (const s of [-1, 1]) B.f(B.rr(s * len - (s > 0 ? 14 : 0), -42, 14, 42, 2), STONE[0]).f(B.rect(s * len - (s > 0 ? 14 : 0), -42, 4, 42), STONE[2], .6);
          B.f(`M${-len} -30q${len} -26 ${len * 2} 0v8h${-len * 2}z`, STONE[1]).f(`M${-len} -30q${len} -26 ${len * 2} 0v3q${-len} -26 ${-len * 2} 0z`, STONE[2]);
        }
        if (deck && deck.halfWidth < 40) return;
        B.f(D().blob(r, -len + 6, side ? w - 2 : -30, 10, 4, 7, .5), MOSS[0], .8).f(D().blob(r, len - 10, side ? -w - 6 : -36, 8, 3, 7, .5), MOSS[1], .8);
        if (open) { const lamp = (x, y) => B.post(x, y - 34, y, 3, IRON).f(B.rr(x - 4, y - 44, 8, 10, 1.5), '#f2e6b8').f(B.poly([[x - 6, y - 44], [x, y - 50], [x + 6, y - 44]]), IRON[0]); lamp(side ? -len - 6 : -len - 6, side ? w + 2 : 0); }
      } else if (kind === 'ruin') {
        B.shadow(0, 2, half + 20, 9, .26);
        elevation(B, side, half, art.S, () => ruinedArch(B, r, half, 124, season, open));
        for (let i = 0; i < 4; i++) B.stone(r, (side ? 20 : half + 18) + i * 9 * (side ? 0 : 1), (side ? half * .6 + i * 8 : 2 - i * 2), 7 - i, 4.4 - i * .5, STONE, i < 2 ? MOSS : null);
      } else if (kind === 'stair') {
        // stone steps climbing through the gap in the terrace wall: they fill the wall's opening (its faces stand a
        // cell below the crossing line), their cheeks overlap the wall ends, a small oak gate at the top
        // (vale layouts: as wide as the path that climbs them and centred on it, stairFit: a flight the width of the whole wall
        // gap read as flat bars pasted wider than the lane)
        const st = side ? null : stairFit(g, frame, half), steps = 6, sw = side ? 30 : st.sw, dy = side ? 0 : 52, top = dy - steps * 9;
        B.cx.save(); if (st) B.cx.translate(st.cx, 0);
        // (each tread is laid of slabs of their own widths with rounded ends, worn pale where the trail runs up the middle,
        // the outer slabs mossed and grassed over; the trail is trodden bare on to the bottom step and off the top one. A
        // flat striped rectangle with square ends, wider than its trail, read as pasted on; 19 Nov 2026)
        for (const [ax, ay, a] of [[0, dy + 5, .5], [side ? -24 + steps * 8 : 0, top - 3, .42]]) { const g = B.cx.createRadialGradient(ax, ay, 0, ax, ay, sw * .9); g.addColorStop(0, 'rgba(160,136,96,' + a + ')'); g.addColorStop(.6, 'rgba(160,136,96,' + a * .45 + ')'); g.addColorStop(1, 'rgba(160,136,96,0)'); B.cx.save(); B.cx.translate(ax, ay); B.cx.scale(1, .34); B.cx.translate(-ax, -ay); B.cx.fillStyle = g; B.cx.globalAlpha = 1; B.cx.beginPath(); B.cx.arc(ax, ay, sw * .9, 0, Math.PI * 2); B.cx.fill(); B.cx.restore(); }
        // (highlands fix round 2: the treads were rows of pale slabs stacked nine px apart with a half-clear band between,
        // which read as a see-through panel of brick courses across the lane. Each step is a riser and a tread now: the
        // riser a dark, opaque face in shade (the sun is behind the climb), the tread's nose lit, the tread itself laid of
        // worn slabs, and each step set back from the one below with the shadow of its nose on the riser beneath.)
        for (let i = 0; i < steps; i++) { const y = dy - i * 9, x = side ? -24 + i * 8 : 0, w = sw - i * 1.5;
          B.f(B.rr(x - w + 1, y - 4.2, w * 2 - 2, 4.6, 1.2), '#6e6452').f(B.rr(x - w + 1, y - 4.2, w * 2 - 2, 1.4, .7), '#3e382c', .7);   // the riser in shade, the nose's shadow along its top
          for (let k = 0; k < 5; k++) B.s(`M${x - w + 4 + r() * (w * 2 - 8)} ${y - 3.6}l${(r() - .5) * 1.2} 3.4`, '#4e4636', .7, .6);   // joints in the riser
          for (let sx0 = x - w + (r() - .5) * 3; sx0 < x + w - 3; ) { const sw2 = Math.min(x + w - sx0, 9 + r() * 15), mid = Math.abs(sx0 + sw2 / 2 - x) / w, tone = r();
            B.f(B.rr(sx0 + .6, y - 9 + r() * .8, sw2 - 1.2, 7.2, 2.8), mid > .7 ? STONE[1] : tone < .5 ? STONE[0] : STONE[1]).f(B.rr(sx0 + 1.4, y - 8.4, (sw2 - 2.8) * .7, 2, 1), STONE[2], mid < .4 ? .75 : .45);
            // the riser: the step's face towards you, in its own shade under a lit nosing (a flat rectangle of setts read as no stair)
            B.f(B.rr(sx0 + .8, y - 4.4, sw2 - 1.6, 4.2, 1.2), '#6e6656', .62).s(`M${sx0 + 1.2} ${y - 4.6}h${sw2 - 2.4}`, '#f2ecda', .7, .7);
            if (mid > .62 && r() < .7) B.f(D().blob(r, sx0 + sw2 / 2, y - 5, sw2 * .4, 2.6, 6, .5), MOSS[r() < .5 ? 0 : 1], .55);
            sx0 += sw2; }
          for (const s of [-1, 1]) if (r() < .85) B.tufts(r, x + s * (w - 1), y - 2, 9, 5, season);
        }
        // the trodden lane runs on to the bottom step (no square edge where the stone begins), and a gate hangs open at the
        // top on its left post, its five bars painted a little turned so they read
        for (let k = 0; k < 6; k++) B.f(D().blob(r, (r() - .5) * sw * 1.2, dy + 2 + r() * 4, 10 + r() * 8, 2.6, 7, .5), k % 2 ? '#a08a62' : '#8a7a58', .45);
        { const hx = -sw + 2, hy = top + 2, gw = Math.min(sw * .9, 30), gh = 26, WD = OAK || ['#7a5c3a', '#9a7a52', '#5a4028'];
          B.f(B.poly([[hx, hy + 1], [hx - gw * .55, hy + 7], [hx - gw * .55 + 6, hy + 10], [hx + 6, hy + 4]]), '#2e3420', .2);
          for (let k = 0; k < 5; k++) { const yy = -gh * (.15 + k * .17); B.s(`M${hx} ${hy + yy}L${hx - gw * .55} ${hy + 6 + yy}`, WD[k % 2], 2, .95); }
          B.s(`M${hx} ${hy - gh * .15}L${hx - gw * .55} ${hy + 6 - gh * .83}`, WD[2] || WD[0], 1.8, .9).s(`M${hx - gw * .55} ${hy + 6 - gh * .15}L${hx - gw * .55} ${hy + 6 - gh * .85}`, WD[2] || WD[0], 2.4, .95); }
        for (const s of [-1, 1]) {
          for (let row = 0; row < 7; row++) for (let i = 0; i < 4; i++) { const x = s * (sw + 8 + i * 11) + (row & 1) * 4 * s, y = dy - 4 - row * 7.6; B.f(D().blob(r, x, y, 6.4, 3.8, 6, .3), (row + i) % 3 ? STONE[0] : STONE[1]).f(D().blob(r, x - 1.4, y - 1.2, 3.6, 1.6, 6, .3), STONE[2], .55); }
          B.f(D().blob(r, s * (sw + 22), dy - 58, 22, 7, 9, .5), MOSS[0], .85).f(D().blob(r, s * (sw + 18), dy - 61, 12, 3.6, 7, .5), MOSS[1], .85);
          B.crown(r, s * (sw + 40), dy - 74, 26, 20, season, 4);
          if (season !== 'winter') for (let i = 0; i < 7; i++) B.f(B.circ(s * (sw + 28 + r() * 26), dy - 76 + (r() - .5) * 26, 1.6), season === 'autumn' ? '#c8402a' : '#f4d8e0', .95);
        }
        B.post(-sw + 2, top - 44, top + 2, 5, OAK).post(sw - 2, top - 44, top + 2, 5, OAK);
        // the mill's leat down the east cheek in a stone channel, its sluice board at the top: shut and dry until the wheel
        // turns (the gate's story: the stair waits on the mended mill), then lifted, the water running down step by step
        { const lx = sw - 9, y0 = dy + 6, y1 = top - 8;
          B.f(B.rr(lx - 6, y1, 12, y0 - y1, 3), '#6e6656').f(B.rr(lx - 4, y1 + 1, 8, y0 - y1 - 2, 2.4), open ? B.lin(0, y1, 0, y0, [[0, '#3e6a72'], [.5, '#4e7e86'], [1, '#5f8e94']]) : '#5e584a');
          // (round 4: a white bar at every step read as a blue ladder, art director: the water is one running ribbon now,
          // its light wandering down the channel, white only where it spills over two of the lips)
          if (open) { const wave = (dx, a) => { let d = `M${lx + dx} ${y1 + 2}`; for (let y = y1 + 2; y < y0 - 1; y += 3) d += `L${lx + dx + Math.sin(y * .23 + dx) * .9} ${y}`; return d; }; B.s(wave(-.8, 0), '#a8d4d8', .8, .5); B.f(B.rr(lx - 4, y1 + 1, 2.2, y0 - y1 - 2, 1), '#203c44', .35); for (const i of [1, Math.max(2, steps - 2)]) { const yy = dy - i * 9; B.s(`M${lx - 3.2} ${yy - 4}q3.2 1.6 6.4 0`, '#eef8f8', .9, .7); } B.f(B.ell(lx, y0 + 2, 9, 3), '#5f93a0', .7).f(B.ell(lx - 2, y0 + 1, 4, 1.2), '#e6f2f0', .5); }
          else for (let i = 0; i < 5; i++) B.f(D().blob(r, lx + (r() - .5) * 4, y1 + 6 + r() * (y0 - y1 - 10), 2.6, 1.6, 6, .5), MOSS[i % 2], .8);
          for (let y = y1 + 4; y < y0; y += 7) B.s(`M${lx - 6} ${y}h2M${lx + 4} ${y + 3}h2`, '#4e483c', .7, .6);
          // the sluice: an oak frame across the channel's head, its board down (shut) or wound up on its rack (open)
          B.post(lx - 7, y1 - 22, y1 + 4, 3, OAK).post(lx + 7, y1 - 22, y1 + 4, 3, OAK).beam(lx - 8, y1 - 24, 16, 3, OAK);
          B.f(B.rect(lx - 5.5, open ? y1 - 19 : y1 - 6, 11, 9), WOOD[1]).f(B.rect(lx - 5.5, open ? y1 - 19 : y1 - 6, 11, 1.6), WOOD[2]).s(`M${lx} ${y1 - 24}v${open ? 5 : 18}`, IRON[1], 1.4);
        }
        B.cx.restore();
      } else {
        // the pass: boulders either side of the col, scree, heather, a cairn of stacked stones
        const rock = ['#a8a698', '#848274', '#cfccbe', '#666456'], o = side ? [[0, -half * .8], [0, half * .8]] : [[-half, 0], [half, 0]];
        for (const [x, y] of o) { B.shadow(x + 6, y + 2, 44, 10, .3); for (let i = 0; i < 6; i++) B.f(D().blob(r, x + (r() - .5) * 70, y + 6 + r() * 8, 9, 3.4, 7, .5), i % 2 ? '#8a6a8a' : '#a884a8', .85); }
        for (let i = 0; i < 14; i++) B.stone(r, (r() - .5) * (side ? 40 : half * 1.6), (side ? (r() - .5) * half * 1.4 : 4 + r() * 6), 2.6 + r() * 2, 1.8 + r(), rock, null);
        // (the cairn stood on the right half of the opened stair, over the boulder that blocks walking: it stands out past the boulder)
        // (Cloudbreak layout: no marker cairn across a horizontal pass: east of the lane it stood against the scarp's end and the orchard
        // field's hedge, west of it on the Way's paving; the Way's own cairns mark the col)
        const cxx = side ? 26 : -half - 64, cyy = side ? half * .2 : -6; let y = cyy;
        if (side) for (const [w, h] of [[13, 6], [11, 5.4], [9, 5], [7, 4.4], [5, 3.8], [3.6, 3]]) { B.stone(r, cxx + (r() - .5) * 2, y, w, h, rock, null); y -= h * 1.5; }
        if (open && side) B.s(`M${cxx} ${y}v-18`, WOOD[1], 1.4).f(B.poly([[cxx, y - 18], [cxx + 12, y - 15], [cxx, y - 11]]), '#c84a3a');
        if (!side) {
          // the last climb: gritstone slabs stepping up the col, a smooth steep lip at the top that wants a rope
          // (the pass was a sign between two posts over flat grass: hunter, round 3); a tie post at the foot, a stake at the top
          for (let i = 0; i < 5; i++) { const yy = 24 - i * 11, w = 34 - i * 2; for (let x = -w; x < w;) { const sw2 = 10 + r() * 12; B.f(D().blob(r, x + sw2 / 2, yy - 3, sw2 * .5, 3.6, 7, .3), rock[i % 2 ? 0 : 1]).f(D().blob(r, x + sw2 / 2 - 1, yy - 4.4, sw2 * .34, 1.4, 6, .3), rock[2], .7); x += sw2; } B.f(B.rr(-w, yy - 1, w * 2, 2.6, 1), rock[3], .55); }
          B.f(D().blob(r, 0, -34, 40, 7, 9, .25), rock[3]).f(D().blob(r, -2, -37, 38, 5, 9, .25), rock[1]).f(D().blob(r, -8, -39, 22, 2.4, 8, .3), rock[2], .8);
          for (let i = 0; i < 4; i++) B.s(`M${-30 + i * 18} -32q2 4 0 7`, rock[3], .8, .6);
          B.post(-28, -14, 24, 7, OAK).f(B.rect(-31.5, -16, 7, 3), OAK[2]).s('M-28 -2a3 3 0 1 0 .1 0', IRON[1], 1.4);   // the tie post and its iron ring
          B.post(-20, -64, -38, 4, OAK);   // the stake at the top
          if (open) {
            // the rope tied at the ring, run up the slabs and over the lip to the stake, a coil left at the foot
            B.s('M-27 -2C-36 -10 -28 -30 -20 -50', '#7a6440', 2.6).s('M-27 -2C-36 -10 -28 -30 -20 -50', '#d8c08a', 1.5);
            B.s('M-26 -3l3 2M-26 -1l3 -2', '#7a6440', 1.4);
            for (let i = 0; i < 3; i++) B.s(B.ell(-38, 22 - i * 1.6, 8 - i, 3 - i * .4), i % 2 ? '#d8c08a' : '#b89a6a', 1.6);
          }
        }
      }
    };
    const blocker = (B) => {
      if (kind === 'arch') {
        if (side) { brambleSide(B, r, art.S, season); return; }
        // shut: a hurdle tied across the opening, brambles grown up through it, a fallen branch leaning in
        B.shadow(0, 2, half * .9, 8, .24);
        elevation(B, side, half, art.S, () => {
          for (const x of [-half * .78, -half * .3, half * .2, half * .7]) B.post(x, -40, 2, 4, WOOD);
          for (let i = 0; i < 5; i++) B.s(`M${-half * .86} ${-6 - i * 7.5}q${half * .43} ${i & 1 ? 3 : -3} ${half * .86} 0q${half * .43} ${i & 1 ? -3 : 3} ${half * .86} 0`, i & 1 ? WOOD[0] : WOOD[2], 3.8);
          B.s(`M${-half * .9} -86L${half * .6} -4`, OAK[1], 6).s(`M${-half * .9} -86L${half * .6} -4`, OAK[2], 1.6, .6).s(`M${-half * .3} -52l-14 -12M${half * .1} -30l12 -14`, OAK[1], 2.6);
          for (let i = 0; i < 16; i++) { const x = (r() - .5) * half * 1.7, y = -4 - r() * 52; B.f(D().blob(r, x, y, 12, 8, 8, .6), '#3e5a30', .95).f(D().blob(r, x - 3, y - 3, 6.4, 4, 6, .5), '#5e7e40', .95); B.s(`M${x - 12} ${y + 2}q8 -14 22 -6`, '#6a4a3a', 1.2, .9); B.f(B.circ(x + 3, y - 3, 1.6), '#4a1a30').f(B.circ(x - 4, y + 1, 1.4), '#7a2a3a').f(B.circ(x + 6, y + 2, 1.3), '#c84a5a'); }
        });
      } else if (kind === 'bridge') {
        // A closed bridge's pole spans its deck between two upright posts.
        const len = side ? 74 : half;
        if (side && crossing) {
          // Millwater's locked region starts at the crossing centre. Its
          // far-bank sign is separate; it must not move this visible stop.
          const W = GARDEN_WORLD, deck = typeof gardenIslandCrossingGeometry === 'function' ? gardenIslandCrossingGeometry().find(d => d.crossing.id === crossing.id) : null, narrow = deck && deck.halfWidth < 40;
          // On the lane-wide deck the pole spans parapet to parapet.
          const x = crossing.x * W.cellW - frame.x, y = W.sky + crossing.y * W.cellH - frame.y + (narrow ? deckCentreY(deck, crossing) : 0), a = y - (narrow ? deck.halfWidth - 3 : frame.span), b = y + (narrow ? deck.halfWidth - 3 : frame.span), height = 28;
          // two oak posts at the gap with a rope slung between (it was a red-and-white barber's pole: hunter, round 3)
          B.post(x - 12, a - 36, a, 5, OAK).post(x - 12, b - 36, b, 5, OAK);
          B.s(`M${x - 12} ${a - height}Q${x - 7} ${(a + b) / 2 - height + 12} ${x - 12} ${b - height}`, '#7a6440', 2.6).s(`M${x - 12} ${a - height}Q${x - 7} ${(a + b) / 2 - height + 12} ${x - 12} ${b - height}`, '#d8c08a', 1.4);
          for (const yy of [a, b]) B.f(B.circ(x - 12, yy - height, 2), '#b89a6a');
        } else if (side) { const x = -len * .55, y = -18 * (1 - .3) - 4; B.post(x - 6, y - 30, y + 2, 4, OAK).post(x + 6, y - 40, y - 10, 4, OAK); B.s(`M${x - 6} ${y - 22}L${x + 6} ${y - 34}`, '#f2ece0', 4.4); for (let i = 0; i < 3; i++) B.s(`M${x - 6 + i * 4} ${y - 22 - i * 4}l2 -2`, '#c84a3a', 4.4); }
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
        const st = stairFit(g, frame, half), sw = st.sw, cx = st.cx, g0 = side ? 0 : 52 - 7 * 8.4 + 54; B.beam(cx - sw + 4, g0 - 92, sw * 2 - 8, 5, OAK).beam(cx - sw + 4, g0 - 66, sw * 2 - 8, 5, OAK);
        for (let x = cx - sw + 8; x < cx + sw - 6; x += 8) B.post(x, g0 - 94, g0 - 58, 3.4, OAK);
        B.s(`M${cx - sw + 6} ${g0 - 64}L${cx + sw - 6} ${g0 - 90}`, OAK[1], 3);
        B.f(B.rr(cx - 4, g0 - 82, 8, 7, 1.4), '#6a6e70');
      } else if (!side) {
        // shut: nothing across the way but the bare lip too steep to climb; a cord of pennants marks it from the post
        B.s('M-28 -12Q-4 -24 22 -40', '#c8b080', 1.1);
        for (let i = 1; i < 6; i++) { const t = i / 6, x = -28 + 50 * t, yy = -12 - 28 * t - Math.sin(t * Math.PI) * 6 + 6; B.f(B.poly([[x - 2.6, yy], [x + 2.6, yy], [x, yy + 7]]), ['#c84a3a', '#e8c84a', '#3a7ac0', '#f2f0e8'][i % 4]); }
        B.post(22, -48, -32, 3, WOOD);
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
  /** The Millwater bridge's downstream parapet and face again, as narrow upright strips of the same baked picture
   *  in the object layer (the picture itself stays on the ground, under everyone, because its deck is walked on).
   *  Each strip sorts by the parapet's own foot at that column, so someone who walks up to the near parapet has
   *  their shoes behind its coping. Before, the whole bridge was always under their feet and they stood on top of
   *  the wall (drawing order, 18 Nov 2026). The strips are the base's own pixels: nothing changes until then. */
  function bridgeFront(scene, h, o, baseKey, box, baseX, baseY, crossing) {
    const deck = typeof gardenIslandCrossingGeometry === 'function' ? gardenIslandCrossingGeometry().find(c => c.crossing.id === crossing.id) : null;
    if (!deck || !deck.length || !baseKey) return;
    const [x0, y0, , y1] = box, hw = deck.halfWidth, ux = (deck.b.x - deck.a.x) / deck.length, uy = (deck.b.y - deck.a.y) / deck.length;
    if (ux < .3) return;   // (the painter draws the face on this side: only when that side is the near one)
    const xa = deck.a.x - uy * hw, xb = deck.b.x - uy * hw, STRIP = 8, texH = Math.ceil((y1 - y0) * K);
    for (let X = xa - 8; X < xb + 8; X += STRIP) {
      const X1 = Math.min(xb + 8, X + STRIP), t = Math.max(0, Math.min(1, ((X + X1) / 2 - xa) / (xb - xa))), foot = deck.a.y + (deck.b.y - deck.a.y) * t + ux * hw;
      // from the coping's top edge down (millBridge: the coping stands 9 px and the hump over the parapet's foot, set
      // 2.5 px in; the end piers a little higher): never the setts of the road above it, which would cover the legs
      const end = (X + X1) / 2 < xa + 7 || (X + X1) / 2 > xb - 7, TOP = end ? 18 : 12.5 + 4.5 * Math.sin(Math.PI * t);
      const u = Math.round((X - baseX - x0) * K), v = Math.max(0, Math.round((foot - TOP - baseY - y0) * K)), w = Math.round((X1 - X) * K);
      if (u < 0 || w < 1 || v >= texH) continue;
      const im = image(scene, baseKey, baseX, baseY); if (!im) continue;
      if (!o.standing) { im.destroy(); return; } im.setCrop(u, v, w, texH - v); h.standing(im, foot + 2);
    }
  }
  function gateSignature(g, open, sc) { let have = ''; try { const rule = !open && typeof gardenGateRule === 'function' ? gardenGateRule(g) : null; if (rule && typeof gardenGateHas === 'function' && gardenGateHas(rule.key)) have = '|have'; } catch (e) { /* the sign as before */ } return 'painted-gate-5|' + g.id + '|' + gateKind(g) + '|' + (open ? 'open' : 'shut') + '|' + sc.season + '|' + (g.crossSpan || []).join(';') + have; }
  /** A gate as a handle. open: the region beyond is yours. */
  function gate(scene, g, sc, o, open) {
    open = !!open;
    if (typeof _gldIslandGateFrame !== 'function') return null;
    const frame = g.crossSpan ? _gldIslandGateFrame(g) : null; if (!frame) return null;
    const kind = gateKind(g), season = sc.season || 'summer', zone = typeof gardenZone === 'function' ? gardenZone(g.n) : null, lv = zone && zone.lv;
    const layout = kind === 'bridge' && typeof gardenIslandData === 'function' ? gardenIslandData() : null;
    const crossing = layout && layout.presentation && (layout.presentation.crossings || []).find(c => c.gateId === g.id && c.kind === 'hump-bridge');
    const art = gateArt(kind, g, frame, season, open, crossing), stem = 'gate|' + g.id + '|' + kind + '|' + season + '|' + (art.side ? 's' : 'f');
    const h = handle(scene, o, g.id, { cls: 'gate', kind: open ? 'paintedgate' : 'gate' });
    const baseKey = bake(scene, stem + '|base|' + (open ? 'o' : 'c'), art.box, B => art.base(B));
    // The stone deck belongs to its authored crossing; the sign and inspection
    // remain at crossSpan. The blocker draws its own offset to the locked neck.
    const baseX = crossing ? crossing.x * o.W.cellW : frame.x, baseY = crossing ? o.W.sky + crossing.y * o.W.cellH : frame.y;
    // (a tree or boulder that stands behind the gate's own line sorts by its own foot, not the gate's: someone
    // walking between the two was drawn behind the tree they stood in front of: drawing order, 18 Nov 2026)
    const lib = layer => { for (const [id, v, size, dx, dy, where] of art.lib) if (where === layer) { const im = libImage(scene, id, v, season, size, frame.x + dx, frame.y + dy, false); if (im && dy < -4 && kind !== 'bridge') h.standing(im, frame.y + dy); else h.add(im); } };
    lib('back');
    const base = image(scene, baseKey, baseX, baseY);
    // An open arch seen side-on has one trunk beyond the path and one this side of it, a good step apart, and it
    // sorted as one thing by the path's middle: on the near half of the path you were drawn in front of the trunk you
    // stood behind (drawing order, 18 Nov 2026). Its picture goes in as two halves, each by its own trunk's foot
    // (the side-on drawing puts them at -/+ 0.8 S either side of the crossing line: elevation()).
    // Shut, the whole gate is drawn over everyone (it stands in the mist of the land behind it), and walking up the lane
    // to the hurdle you vanished behind the near trunk and its leaves: the first gate every new player walks to (the
    // verifier, 18 Nov 2026). The near half stands on your side of the hurdle, clear of the mist, so it sorts by its own
    // trunk and thins over you exactly as it does when the gate is open; the far half stays with the shut gate.
    let split = null;
    const halves = art.side && (kind === 'arch' || kind === 'ruin') && o.standing && base ? (() => {
      const [bx0, by0, bx1, by1] = art.box, texW = Math.ceil((bx1 - bx0) * K), texH = Math.ceil((by1 - by0) * K), mid = Math.round(-bx0 * K), near = image(scene, baseKey, baseX, baseY);
      if (!near || mid < 2 || mid > texW - 2) { if (near) near.destroy(); return false; }
      base.setCrop(0, 0, mid, texH); near.setCrop(mid, 0, texW - mid, texH);
      const nearDepth = frame.y + art.S * .8 + 2;
      split = { mid, texW, texH, nearDepth, fadeWith: [] };
      // (shut as well as open: the far half stood with the shut gate over the mist and the near half in the world under it, so
      // the mist cut the arch down its middle, half washed and half bright: final review, round 3. Both halves now sort by their
      // own trunk's foot and take the same mist; only the board stays over it)
      h.standing(base, frame.y - art.S * .8 + 2, true);
      h.standing(near, nearDepth, true);
      // Walking through, you pass behind the near trunk and its leaves: they thin while they cover you, like any
      // crown you stand under, so you never vanish behind your own gate.
      // (the near half's paint, read once into memory at a quarter size the first time you come up to the arch. Asking
      // the texture for a pixel reads it back from its canvas every time: five reads a frame while you stood in the arch,
      // 3 ms a frame and now and then 30, which showed as a long task when walking through. Measured 18 Nov 2026.)
      let mask = null;
      const alphaAt = (u, v) => {
        if (!mask) {
          mask = { a: null, w: 0, h: 0 };
          try {
            const src = scene.textures.get(baseKey).getSourceImage(), w = Math.max(1, Math.ceil(texW / 4)), hh = Math.max(1, Math.ceil(texH / 4)), c = document.createElement('canvas'); c.width = w; c.height = hh;
            const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(src, 0, 0, w, hh);
            const d = cx.getImageData(0, 0, w, hh).data, al = new Uint8Array(w * hh); for (let i = 0; i < al.length; i++) al[i] = d[i * 4 + 3];
            mask = { a: al, w, h: hh };
          } catch (e) { /* no picture to read: the arch stays whole */ }
        }
        if (!mask.a) return 0;
        return mask.a[Math.min(mask.h - 1, Math.floor(v / texH * mask.h)) * mask.w + Math.min(mask.w - 1, Math.floor(u / texW * mask.w))];
      };
      h.move(near, im => {
        if (typeof _gw === 'undefined' || !im.active) return;
        const X = _gw.px * o.W.cellW, Y = o.W.sky + _gw.py * o.W.cellH; let hide = false;
        if (Y < nearDepth && Y > baseY + by0 && X > baseX - 12 && X < baseX + bx1 + 12) for (const [dx, dy] of [[0, -10], [0, -30], [-7, -22], [7, -22], [0, -46]]) {
          const u = Math.round((X + dx - baseX - bx0) * K), v = Math.round((Y + dy - baseY - by0) * K);
          if (u >= mid && u < texW && v >= 0 && v < texH && alphaAt(u, v) >= 96) { hide = true; break; }
        }
        const want = hide ? (typeof GARDEN_CROWN_FADE === 'number' ? GARDEN_CROWN_FADE : .45) : 1, now = im._gppFade == null ? 1 : im._gppFade;
        im._gppFade = Math.abs(want - now) < .03 ? want : now + (want - now) * .25; im.setAlpha(im._gppFade); if (base.active) base.setAlpha(im._gppFade);   // (the whole arch thins together: one half alone left a hard line down its leaves)
        for (const f of split.fadeWith) if (f.active) f.setAlpha(im._gppFade);
      });
      return true;
    })() : false;
    if (!halves && !(kind === 'bridge' ? h.ground(base) : h.add(base))) { h.destroy(); return null; }
    if (kind === 'bridge' && crossing) ok(() => bridgeFront(scene, h, o, baseKey, art.box, baseX, baseY, crossing));
    lib('front');
    const was = gateSeen.get(g.id); gateSeen.set(g.id, !!open);
    const blockKey = bake(scene, stem + '|block', art.box, B => art.blocker(B));
    const rule = typeof gardenGateRule === 'function' ? gardenGateRule(g) : null, item = rule && typeof GARDEN_GATE_ITEMS !== 'undefined' && GARDEN_GATE_ITEMS[rule.key], need = item ? item.tag || item.name.replace(/^(A|An|The) /, '').toLowerCase() : '';   // (the item's own few words: 'Needs a plank', not 'Needs stout plank')   // (feat/find-gates: the gate opens with a find)
    const have = !!(need && typeof gardenGateHas === 'function' && gardenGateHas(rule.key));
    // (the sign is fixed to what bars the way, gateMount: chains, cords, a stake, a post or nails; 19 Nov 2026, round 3:
    // it used to hang in the air over the path with its words in white on the ground below it)
    const mount = gateMount(kind, art, frame, crossing), hangs = mount.how === 'chains' || mount.how === 'cords';
    const signBox = [-36, -24 - (hangs ? mount.len + 4 : mount.how === 'post' ? 12 : 2), 36, 24 + (mount.how === 'stake' ? mount.len + 6 : mount.how === 'post' ? 12 : 2)];
    const signKey = bake(scene, 'gatesign2|' + (lv || 0) + '|' + need + (have ? '|have' : '') + '|' + mount.how + mount.len, signBox, B => needSign(B, lv, need, have, mount));
    const sx = frame.x + mount.x, sy = frame.y + mount.y;
    // a hanging board swings from its chains' top, so it turns about that point
    const pivot = hangs ? -19 - mount.len : 0;
    const place = sign => { if (sign && hangs) { const meta = scene.textures.get(signKey).customData.gpp; sign.setOrigin(meta.ox, (pivot - signBox[1]) / (signBox[3] - signBox[1])).setPosition(sx, sy + pivot); } return sign; };
    if (!open) {
      // (shut and seen side on, the hurdle and its brambles run from the far trunk to the near one. Drawn whole over
      // everyone, they hid you a step to the near side of the hurdle (the audit's shut-gate drawing order, 19 Nov 2026):
      // their near half sorts and thins with the near trunk, the far half stays with the shut gate)
      const blk = image(scene, blockKey, frame.x, frame.y), nb = split && blk && baseX === frame.x && baseY === frame.y ? image(scene, blockKey, frame.x, frame.y) : null;
      if (nb) { blk.setCrop(0, 0, split.mid, split.texH); nb.setCrop(split.mid, 0, split.texW - split.mid, split.texH); h.standing(blk, frame.y - art.S * .8 + 3, true); h.standing(nb, split.nearDepth, true); split.fadeWith.push(nb); }
      else h.add(blk);
      const sign = place(h.add(image(scene, signKey, sx, sy)));
      // a board on chains or cords sways, barely; one nailed or staked keeps still (sights, round 3). It stands over everyone,
      // so it thins while you stand behind it (a step past the shut Forest arch you vanished behind its sign: the verifier, 18 Nov 2026)
      h.move(sign, (node, t, motion) => {
        if (motion && hangs) node.setRotation(Math.sin(t * 1.3) * .03);
        if (typeof _gw === 'undefined' || !node.active) return;
        const X = _gw.px * o.W.cellW, Y = o.W.sky + _gw.py * o.W.cellH, w = node.displayWidth / 2, hh = node.displayHeight / 2;
        const want = Math.abs(X - sx) < w - 4 && Math.abs(Y - 26 - sy) < hh ? .5 : 1, now = node.alpha;   // (only while it covers the middle of your body: standing at the hurdle you read it whole)
        if (Math.abs(want - now) > .01) node.setAlpha(Math.abs(want - now) < .03 ? want : now + (want - now) * .25);
      });
    } else if (was === false) {
      // it has just opened: the barrier goes and the sign drops away
      const block = h.add(image(scene, blockKey, frame.x, frame.y)), sign = place(h.add(image(scene, signKey, sx, sy)));
      h.move(block, (node, t) => { const f = Math.min(1, t / 1.6); node.setAlpha(1 - f * f).setPosition(frame.x + (art.side ? 0 : f * 18), frame.y + f * 8); return f < 1; });
      h.move(sign, (node, t) => { const f = Math.min(1, t / 1.2); node.setAlpha(1 - f).setPosition(sx, sy + pivot + f * f * 40).setRotation(f * .6); return f < 1; });
      const deck = kind === 'bridge' && crossing && typeof gardenIslandCrossingGeometry === 'function' ? gardenIslandCrossingGeometry().find(d => d.crossing.id === crossing.id) : null;
      if (deck && deck.halfWidth < 40) {
        const T = millPlanks(deck.length), [ta, tb] = T.plank(T.gap), pt = (t, s) => deck.deckPoint(t / deck.length, s), c = pt((ta + tb) / 2, 0), hw = deck.halfWidth;
        // (only the length of it that shows between the parapets: drawn over them, the whole plank hung down the bridge's face)
        const quad = [pt(ta, -hw + 1), pt(tb, -hw + 1), pt(tb, hw - 15), pt(ta, hw - 15)].map(p => [p.x - c.x, p.y - c.y]), xs = quad.map(p => p[0]), ys = quad.map(p => p[1]);
        const pk = bake(scene, 'gateplank|' + Math.round(deck.length) + '|' + Math.round(hw), [Math.min(...xs) - 2, Math.min(...ys) - 2, Math.max(...xs) + 2, Math.max(...ys) + 3], B2 => { B2.f(B2.poly(quad.map(([x, y]) => [x + .6, y + 1.4])), 'rgba(30,24,16,.4)').f(B2.poly(quad), '#c4a272').s(`M${quad[0][0]} ${quad[0][1]}L${quad[3][0]} ${quad[3][1]}`, '#e8cc98', .8, .8); for (const p of [.2, .8]) { const x = quad[0][0] + (quad[3][0] - quad[0][0]) * p + 1, y = quad[0][1] + (quad[3][1] - quad[0][1]) * p; B2.f(B2.circ(x, y, .8), '#2a2420'); } });
        const puff = bake(scene, 'gatedust', [-9, -6, 9, 6], B2 => B2.f(B2.ell(0, 0, 8, 5), B2.rad(0, 0, 8, [[0, 'rgba(214,200,170,.8)'], [1, 'rgba(214,200,170,0)']])));
        const plank = h.add(image(scene, pk, c.x, c.y - 46));
        h.move(plank, (node, t) => { const f = Math.min(1, t / .55); node.setPosition(c.x, c.y - 46 * (1 - f * f)).setAlpha(.4 + .6 * f); if (f >= 1 && !node._knocked) { node._knocked = true; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, d = h.add(image(scene, puff, c.x, c.y)); h.move(d, (n2, t2) => { const g = Math.min(1, (t2 - t) / .9); n2.setPosition(c.x + Math.cos(a) * (6 + g * 18), c.y + Math.sin(a) * (2 + g * 6) - g * 6).setAlpha((1 - g) * .8); return g < 1; }); } } return true; });
      }
    }
    const [x0, y0, x1, y1] = art.box;
    return finish(h, { x: Math.min(frame.x, baseX) + x0, y: Math.min(frame.y, baseY) + y0, width: x1 - x0 + Math.abs(baseX - frame.x), height: y1 - y0 + Math.abs(baseY - frame.y) }, { x: frame.x, y: frame.y });
  }

  /* ---------- Fleet Falls: rock step, falling sheet, spray, plunge pool ---------- */
  function falls(scene, spec, o) {
    const season = spec.season || 'summer', Wd0 = Math.round(Math.max(40, Math.min(110, (spec.width || 96) * .55))), r = rng(hash(spec.id || 'falls'));
    let x = spec.x, y = spec.y, H = 176, authoredPool = false, ax = spec.x, ay = spec.y, S = 176, fed = false;   // (ax, ay): the rock step's foot; S: its height
    const data = typeof GardenIslandLayout !== 'undefined' && GardenIslandLayout.data, W = typeof GARDEN_WORLD !== 'undefined' && GARDEN_WORLD;
    const fixed = data && data.version >= 5 && spec.id === 'ld-falls' && (data.static || []).find(p => p.id === spec.id), pool = fixed && data.presentation && data.presentation.falls && data.presentation.falls.pool;
    // The fixed Vale sheet meets its authored pool, not the dry interaction foot.
    // Keep its top lip at the same height; relocated scenery keeps its own anchor.
    if (pool && W && spec.x === (fixed.x + fixed.w / 2) * W.cellW && spec.y === W.sky + (fixed.y + fixed.h) * W.cellH - 4) {
      x = pool[0] * W.cellW; y = W.sky + pool[1] * W.cellH - 8; H += y - spec.y; authoredPool = true;
      // The gorge feeds the sheet: its lip sits where the river reaches the scarp
      // top, and the step is only as tall as the scarp, so the river runs into it.
      const fw = typeof gardenFallsWater === 'function' && gardenFallsWater(data);
      if (fw) { fed = true; ax = fw.lip.x * W.cellW; S = Math.max(64, Math.round(spec.y - (W.sky + fw.lip.y * W.cellH)) + 6); x = fw.foot.x * W.cellW; y = W.sky + fw.foot.y * W.cellH - 8; H = y - (ay - S); }
    }
    // (vale final fix 1, rule 14: Fleet Falls at least 8 H) The scarp gives the water under four rows to fall, about 2.5 H. Where open
    // water lies below the foot, the falls go on down a rock prow that stands out into it, the sheet landing in the deep water
    // well out, so the whole drop is 8 H or more: read from the water cells below the foot (any falls with a lake below it),
    // never from a place. The prow stands only on water, so nothing that is walked on lies under it.
    let deep = 0; const oldY = y;
    if (fed && W && typeof gardenFallsDeepFoot === 'function') { const yy = gardenFallsDeepFoot(data); if (yy && yy - y >= 3 * W.cellH) { deep = yy - y; y = yy; H = y - (ay - S); } }
    const Wd = deep ? Math.max(Wd0, 78) : Wd0, sharedPool = authoredPool && typeof GardenPaintWater !== 'undefined', lipX = ax - x, k = S / 176;
    const h = handle(scene, o, spec.id, { cls: 'falls', kind: 'falls' });
    const rock = ['#a39a86', '#7e7664', '#cbc3ad', '#5e584a'];
    const rockReach = Math.ceil(Wd / 2 + 130) + (fed ? 60 : 0), box = [-rockReach, -H - 50, rockReach, 40];
    const baseKey = bake(scene, 'falls5|' + season + '|' + Wd + '|' + H + '|' + S + '|' + Math.round(lipX) + '|' + fed + '|' + sharedPool + '|' + deep, box, B => {
      if (deep) {
        // the prow: a tall face of rock from the scarp's foot down into the deep water, in courses lit from the upper left,
        // narrow at its top (the shore path beside it stays clear) and spreading at the waterline; wet and dark beside the
        // sheet, mossed and ferned on its ledges, with a darker reflection and a ring of churned water at its foot
        const top = -deep - 6, west = -Wd / 2 - 44, eastTop = Math.min(Wd / 2 + 18, 58), eastFoot = Wd / 2 + 96, westFoot = -Wd / 2 - 70;
        // (its outline is the boulders' own: each course a row of lobed masses, so no edge of it runs as a ruled line)
        const rows = Math.max(5, Math.round(deep / 30)), course = i => { const yy = top + 6 + (i + .5) * (-top - 8) / rows, t = Math.min(1, (yy - top) / -top); return { yy, wl: west + (westFoot - west) * Math.pow(t, 1.4) + (r() - .5) * 10, we: eastTop + (eastFoot - eastTop) * Math.pow(t, 1.6) + (r() - .5) * 10 }; };
        { const g = B.cx.createRadialGradient(0, 6, 4, 0, 6, (eastFoot - westFoot) * .7); g.addColorStop(0, 'rgba(26,52,60,.38)'); g.addColorStop(1, 'rgba(26,52,60,0)'); B.cx.save(); B.cx.fillStyle = g; B.cx.scale(1, .28); B.cx.beginPath(); B.cx.arc(0, 6 / .28, (eastFoot - westFoot) * .7, 0, Math.PI * 2); B.cx.fill(); B.cx.restore(); }   // its reflection darkening the water
        const C0 = []; for (let i = 0; i < rows; i++) C0.push(course(i));
        for (const c of C0) { const hh = (-top - 8) / rows; B.f(D().blob(r, (c.wl + c.we) / 2, c.yy + 2, (c.we - c.wl) / 2 + 6, hh * .78, 14, .22), rock[3]); }
        for (const c of C0) { const hh = (-top - 8) / rows; for (let xx = c.wl + 4; xx < c.we; xx += 22 + r() * 16) B.f(D().blob(r, xx, c.yy, 18 + r() * 10, hh * .62, 9, .3), rock[1]); }
        B.cx.save(); B.cx.globalCompositeOperation = 'source-atop';
        B.f(B.rect(westFoot - 20, top - 20, eastFoot - westFoot + 40, -top + 40), B.lin(westFoot, 0, eastFoot, 0, [[0, 'rgba(203,195,173,.45)'], [.35, 'rgba(203,195,173,.08)'], [.6, 'rgba(30,28,24,.12)'], [1, 'rgba(30,28,24,.4)']]));
        B.f(B.rect(westFoot - 20, -30, eastFoot - westFoot + 40, 40), B.lin(0, -30, 0, 6, [[0, 'rgba(20,30,30,0)'], [1, 'rgba(20,30,30,.45)']]));   // wet and dark at the waterline
        B.cx.restore();
        for (let i = 0; i < rows; i++) { const { yy, wl, we } = C0[i];
          // (slabs of the scarp's own bedded rock, wide and flat-topped and set like courses, a dark joint under each; not round cobbles)
          for (let xx = wl + 10 + (i % 2) * 14; xx < we - 8; xx += 34 + r() * 18) { if (Math.abs(xx) < Wd / 2 + 6) continue; const rx = 18 + r() * 14, ry = 7 + r() * 4;
            B.f(D().blob(r, xx + 2, yy + ry * .9, rx, ry * .55, 8, .25), '#3a372f', .55).f(D().blob(r, xx, yy, rx, ry, 8, .22), rock[1]).f(D().blob(r, xx - rx * .12, yy - ry * .45, rx * .82, ry * .42, 8, .25), rock[2], .85);
            if (r() < .4) B.f(D().blob(r, xx - rx * .2, yy - ry * .62, rx * .5, ry * .22, 7, .4), MOSS[0], .8); }
          for (const sgn of [-1, 1]) { const lx = sgn < 0 ? (wl + (-Wd / 2)) / 2 : (we + Wd / 2) / 2, lw = Math.abs(sgn < 0 ? -Wd / 2 - wl : we - Wd / 2) * .8; if (lw < 14) continue; B.f(D().blob(r, lx, yy + 9, lw / 2, 4, 9, .3), rock[3], .4).f(D().blob(r, lx, yy + 5, lw / 2, 3, 9, .3), rock[2], .6); if (r() < .6) B.s(`M${lx - 6} ${yy + 4}q-3 -9 1 -14M${lx} ${yy + 4}q1 -10 5 -13M${lx + 5} ${yy + 4}q4 -7 8 -9`, leafOf(season)[0], 1.6, .85); } }
        // wet black rock either side of the sheet, streaked with runnels
        for (const sgn of [-1, 1]) { B.f(`M${sgn * (Wd / 2 - 2)} ${top}L${sgn * (Wd / 2 + 16)} ${top + 10}L${sgn * (Wd / 2 + 22)} -4L${sgn * (Wd / 2 - 2)} -2Z`, '#2f3d3c', .55); for (let i = 0; i < 5; i++) { const xx = sgn * (Wd / 2 + 4 + r() * 16); B.s(`M${xx} ${top + r() * 40}q${(r() - .5) * 4} ${-top * .3} ${(r() - .5) * 3} ${-top * .5}`, '#9cc6c6', 1, .35); } }
        // ivy and ferns hanging from the top courses
        for (let i = 0; i < 7; i++) { const xx = west + 6 + r() * (eastTop - west - 12); if (Math.abs(xx) < Wd / 2 + 2) continue; B.s(`M${xx} ${top + 4}q${(r() - .5) * 8} ${20 + r() * 20} ${(r() - .5) * 6} ${36 + r() * 40}`, '#4e6a36', 1.8, .8); }
        // the waterline: a pale lip of water round the prow's foot, and boulders half under it
        for (let i = 0; i < 12; i++) { const xx = westFoot + 6 + r() * (eastFoot - westFoot - 12); B.f(B.ell(xx, 4 + r() * 4, 6 + r() * 8, 1.6 + r()), '#e2f0ec', .35 + r() * .3); }
        for (let i = 0; i < 9; i++) { const xx = westFoot + 10 + r() * (eastFoot - westFoot - 20); if (Math.abs(xx) < Wd / 2 + 10) continue; B.stone(r, xx, 4 + r() * 6, 9 + r() * 7, 5 + r() * 3, ['#6f6a5c', '#4e4a40', '#9c9580', '#3a372f'], r() < .4 ? MOSS : null); }
      }
      // the plunge pool and its pale lip
      if (!sharedPool && !deep) B.f(B.ell(0, 8, 86, 22), '#4e7e8c').f(B.ell(0, 6, 74, 17), '#5f93a0').f(B.ell(-14, 4, 40, 7), '#88b8c0', .55).s(B.ell(0, 8, 86, 22), '#cfe2dc', 2, .5);
      // Keep the scarp at its original landscape anchor while the sheet reaches the Mere.
      B.cx.save(); B.cx.translate(ax - x, ay - y);
      // the rock step: big lobed masses lit from the upper left, darker in the cleft behind the water
      if (fed) {
        // The Vale's falls: the cave mouth and stair stand at the sheet's west edge, so the rock
        // step runs east from the water to the scarp (falls.x + w), with no rock over the cave.
        const east = Math.max(120, (fixed.x + fixed.w + .7) * W.cellW - ax);
        B.f(D().blob(r, east * .55, -S * .5, east * .55, S * .58, 12, .3), rock[1]);
        for (const [t, py, rx, ry] of [[.3, -.42, 34, .46], [.6, -.48, 40, .5], [.9, -.4, 34, .44], [.26, -.9, 30, .26], [.58, -.92, 36, .24], [.88, -.86, 30, .22], [.4, -.04, 26, .2], [.75, -.06, 30, .2], [1, -.08, 22, .16]]) B.stone(r, Wd / 2 + 8 + (east - Wd / 2 - 8) * t, py * S, rx, Math.max(10, ry * S), rock, MOSS);
        // a wet black lip stone under the water's west edge, below the cave sill
        B.stone(r, -Wd / 2 - 2, -6, 10, 7, ['#5e584a', '#3f3b33', '#7e7664', '#2e2b25'], null);
      } else {
      B.f(D().blob(r, 0, -S * .55, 112, S * .62, 12, .35), rock[1]);
      for (const [px, py, rx, ry] of [[-74, -40, 46, 44], [76, -46, 46, 48], [-58, -112, 44, 46], [62, -118, 46, 46], [-30, -176 + 6, 44, 30], [34, -176 + 2, 46, 30], [-86, -4, 30, 18], [90, -6, 30, 18]]) B.stone(r, px, py * k, rx, Math.max(ry * k, Math.min(ry, 16)), rock, MOSS);
      }
      // ledges of the step: each a lit top face with a shadow under it, the strata of the scarp
      for (const [ly, lw] of (fed ? [[-S * .5, 84]] : [[-S * .26, 96], [-S * .52, 104], [-S * .78, 92]])) for (const sgn of (fed ? [1] : [-1, 1])) { const lx = sgn * (Wd / 2 + lw / 2 + 4); B.f(D().blob(r, lx, ly + 5, lw / 2, 5, 9, .3), rock[3], .45).f(D().blob(r, lx, ly, lw / 2, 4, 9, .3), rock[2], .85).f(D().blob(r, lx - sgn * 10, ly - 3, lw / 3, 3, 8, .4), MOSS[1], .75); }
      // trees and ferns crown the top; ivy hangs down the faces
      for (let i = fed ? 3 : 0; i < 6; i++) { const px = (i < 3 ? -1 : 1) * (Wd / 2 + 10 + (i % 3) * 16); B.s(`M${px} ${-S + 10}q${(r() - .5) * 8} ${30 * k} ${(r() - .5) * 4} ${(40 + r() * 30) * Math.max(.5, k)}`, leafOf(season)[0], 2, .8); }
      B.cx.restore();
      // A wet cleft follows the falling water instead of framing it with straight posts.
      // (the lip is a broken, bowed edge where the water humps over the rock, not one straight rule; the sheet fans out a little
      //  as it falls and its sides waver, so it reads as falling water and not a pale panel; art director, round 3)
      const lipPath = (() => { let d = '', n = 6; for (let i = 1; i <= n; i++) { const u0 = (i - 1) / n, u1 = i / n, xm = lipX - Wd / 2 + Wd * (u0 + u1) / 2, x1 = lipX - Wd / 2 + Wd * u1, bow = Math.sin(Math.PI * u1) * 4, ym = -H + 1.5 + Math.sin(Math.PI * (u0 + u1) / 2) * 5 + (r() - .5) * 3.2; d += `Q${xm.toFixed(1)} ${ym.toFixed(1)} ${x1.toFixed(1)} ${(-H + bow + (i < n ? (r() - .5) * 2 : 0)).toFixed(1)}`; } return d; })();
      const sheet = `M${lipX - Wd / 2} ${-H}${lipPath}C${lipX + Wd / 2 + 1} ${-H * .72} ${Wd / 2 - 3} ${-H * .42} ${Wd / 2 + 2} ${-H * .24}S${Wd / 2 + 9} -16 ${Wd / 2 + 8} -8q${-Wd / 2 - 8} 11 ${-Wd - 16} 0C${-Wd / 2 - 6} ${-H * .14} ${-Wd / 2 + 3} ${-H * .3} ${-Wd / 2 + 1} ${-H * .46}S${lipX - Wd / 2 - 1} ${-H * .8} ${lipX - Wd / 2} ${-H}z`;
      // the wet rock the water runs over shows dark at its edges (a soft cleft, never an outline round the sheet)
      { const cl = B.cx; cl.save(); cl.filter = 'blur(' + (3 * K).toFixed(1) + 'px)'; B.f(sheet, '#2f3d3c', .5); cl.restore(); cl.filter = 'none'; }
      // the falling sheet: brightest where it curls over the lip, a deep green-blue body, white again where it breaks below
      // (round 2: deeper and opaque; pale greens read as a see-through pane of glass with the rock showing through)
      B.f(sheet, B.lin(0, -H, 0, 0, [[0, '#f4fbf8'], [.05, '#d4eeea'], [.14, '#6aa8ae'], [.45, '#4f8f98'], [.7, '#6aa6aa'], [.86, '#b8e0dc'], [1, '#f4fbf8']]));
      // lit from the upper left: the left of the sheet catches the sky, the right falls into shade
      B.f(sheet, B.lin(-Wd / 2, 0, Wd / 2, 0, [[0, 'rgba(255,255,255,.34)'], [.45, 'rgba(255,255,255,0)'], [.7, 'rgba(24,58,66,0)'], [1, 'rgba(24,58,66,.3)']]));
      // ribbons of water down its face, each following the sheet's own curve, paler and darker, broken where they thin
      { const cl = B.cx; cl.save(); cl.clip(new Path2D(sheet));
        for (let i = 0; i < 22; i++) { const u = (i + .5) / 22 - .5 + (r() - .5) * .05, top = lipX + u * Wd, mid = u * (Wd - 10) * .92, bot = u * (Wd + 8), pale = i % 3 !== 1, w = pale ? 1.6 + r() * 3.2 : 2.6 + r() * 3, t0 = -H + 3 + r() * H * .1, t1 = -6 - r() * H * .12;
          B.s(`M${top} ${t0}C${top + (mid - top) * .6} ${-H * .62} ${mid} ${-H * .3} ${bot} ${t1}`, pale ? '#f4fbf8' : '#3f7e88', w, pale ? .42 + r() * .36 : .3 + r() * .16); }
        // a soft white veil down each edge, where the falling water thins to spray (a ruled edge against the rock read as a pane)
        for (const sgn of [-1, 1]) { const g = cl.createLinearGradient(sgn * Wd / 2, 0, sgn * (Wd / 2 - 16), 0); g.addColorStop(0, 'rgba(246,252,250,.75)'); g.addColorStop(1, 'rgba(246,252,250,0)'); cl.fillStyle = g; cl.fillRect(Math.min(sgn * Wd / 2 - 4, sgn * (Wd / 2 - 16)) + (sgn < 0 ? lipX * .3 : 0), -H, 20, H); }
        cl.restore(); }
      // spray peeling off both edges of the sheet as it falls, broken and fading (a sheet with clean edges reads as a pipe)
      for (const sgn of [-1, 1]) for (let i = 0; i < 14; i++) { const t = .12 + r() * .82, y0 = -H * (1 - t), xe = sgn * (Wd / 2 - 1 + t * 3) + lipX * (1 - t); B.s(`M${xe} ${y0}q${sgn * (1 + r() * 2)} ${3 + r() * 3} ${sgn * (1 + r() * 2.5)} ${6 + r() * 7}`, '#f4fbf8', 1.2 + r() * 1.6, .16 + r() * .22); }
      // the lip: the river darkens as it gathers to the edge, then bends over it in a bright roll, thick and thin across
      // the drop, broken by two lip stones, with the shade just under the roll (not one clean rim, which read as a cylinder's top)
      { const cl = B.cx, ga = cl.createLinearGradient(0, -H - 12, 0, -H + 2); ga.addColorStop(0, 'rgba(58,118,128,0)'); ga.addColorStop(1, 'rgba(58,118,128,.6)'); cl.save(); cl.fillStyle = ga; cl.beginPath(); cl.ellipse(lipX, -H - 4, Wd / 2 + 3, 8, 0, 0, Math.PI * 2); cl.fill(); cl.restore(); }
      for (let i = 0; i < 9; i++) { const u = (i + .5) / 9 - .5, px = lipX + u * Wd, rr = Wd / 9 * (.75 + r() * .6); B.f(B.ell(px, -H + 1 + (r() - .5) * 2.6, rr, 2.4 + r() * 2.6), i % 3 === 1 ? '#d8eeea' : '#f6fcf9', .78 + r() * .2); }
      B.s(`M${lipX - Wd / 2 + 2} ${-H + 8}q${Wd / 2} 5 ${Wd - 4} 0`, '#4d8d93', 1.4, .36);
      // (no stones set on the lip: two pebbles sitting on the brink read as a garden water feature; wet rock frames its ends)
      for (const sgn of [-1, 1]) B.stone(r, lipX + sgn * (Wd / 2 + 6), -H + 4, 9 + r() * 4, 6 + r() * 2, ['#6f6a5c', '#4e4a40', '#9c9580', '#3a372f'], MOSS);
      // the foam where it lands: a soft churned skirt wider than the sheet, puffed up where the water strikes, a few crisp
      // bubbles on it (flat white blobs read as cotton wool)
      { const cl = B.cx; for (let i = 0; i < 18; i++) { const sx = (r() - .5) * Wd * 1.9, rx = 9 + r() * 13, ry = 4 + r() * 4, sy = -4 + (r() - .5) * 8 - Math.max(0, 1 - Math.abs(sx) / Wd) * 7, g = cl.createRadialGradient(sx, sy, 0, sx, sy, rx); g.addColorStop(0, 'rgba(250,253,251,.78)'); g.addColorStop(.55, 'rgba(238,247,245,.4)'); g.addColorStop(1, 'rgba(238,247,245,0)'); cl.save(); cl.translate(sx, sy); cl.scale(1, ry / rx); cl.translate(-sx, -sy); cl.fillStyle = g; cl.beginPath(); cl.arc(sx, sy, rx, 0, Math.PI * 2); cl.fill(); cl.restore(); } }
      for (let i = 0; i < 14; i++) { const sx = (r() - .5) * Wd * 1.5, rr = 1 + r() * 2.2; B.f(B.ell(sx, -5 + (r() - .5) * 8, rr * 1.4, rr), '#ffffff', .55 + r() * .35); }
      // Standalone falls have a stone rim; the Mere already owns its real shoreline.
      if (!sharedPool && !deep) for (let i = 0; i < 8; i++) { const a = Math.PI * (.08 + .84 * r()), px = Math.cos(a) * 92 * (r() < .5 ? -1 : 1), py = 14 + Math.sin(a) * 14; B.stone(r, px, py, 7 + r() * 5, 4 + r() * 2, STONE, r() < .5 ? MOSS : null); }
    });
    // trees on the scarp top are the library's own, like the planting round them (their trunks join the one trunk list: gateTrees)
    fallsFeet = [];
    for (const [id, v, hh, dx, dy] of (fed ? []   /* (Cloudbreak layout: no birch or pine on the lip beside the Edge walk: the birch's trunk stood on the scarp's face, the pine's crown over the walk; the plan's pines stand back from it) */ : [['tree.pine', 0, 150, -84, -S + 8], [season === 'winter' ? 'tree.birch' : 'tree.green-birch', 1, 110, 86, -S + 14], ['tree.pine', 1, 120, 30 + Wd / 2, -S - 6]])) { h.standing(libImage(scene, id, v, season, { h: hh }, ax + dx, ay + dy, false), ay + dy); fallsFeet.push([+((ax + dx) / o.W.cellW).toFixed(2), +((ay + dy - o.W.sky) / o.W.cellH).toFixed(2), hh > 140 ? .5 : .4, id.slice(5)]); }
    // The falling sheet stops the feet from its foot up to the cave stair's sill, so nobody walks into the water and stands
    // inside the falls (a gap was left between the rock's block and the pool's edge under it; water hunter, round 3). Shared
    // with the walking through the one trunk list (rows of boxes the sheet's width), like the scarp-top trees above.
    if (fed && o.W) { const wC = (Wd0 + 6) / o.W.cellW, footY = (oldY - o.W.sky) / o.W.cellH, cX = x / o.W.cellW; for (let yy = footY - 1.5; yy <= footY - .1; yy += .36) fallsFeet.push([+cX.toFixed(2), +yy.toFixed(2), +wC.toFixed(2), 'water']); }   // ('water': a block of falling water in the trunk list, never a tree to climb: 'Climb up and sit on a branch' showed at the falls)
    // (a deep falls is one picture shown as two crops: down to the scarp's foot it stands where the falls always stood, so you walk
    // in front of its rock step on the shore; the prow below stands at its own foot out in the water, in front of what swims behind it)
    // (both crops stand in the object layer, so they are lit alike: the upper one at the falls' own foot, as before)
    const base = deep ? h.standing(image(scene, baseKey, x, y), spec.y + 4, true) : h.add(image(scene, baseKey, x, y)), live = (im, dz) => deep ? h.standing(im, y + dz) : h.add(im);
    if (deep && base) { const tw = base.width, th = base.height, sr = Math.max(1, Math.min(th - 1, Math.round((oldY - 10 - y - box[1]) * K))); base.setCrop(0, 0, tw, sr); const low = h.standing(image(scene, baseKey, x, y), y, true); if (low) low.setCrop(0, sr, tw, th - sr); }
    // The fixed falls' canvas includes empty padding beside the cave stair.
    // Keep its solid rock/sheet mask once per existing texture; frame probes
    // read this CPU array, never canvas pixels or the current faded alpha.
    if (authoredPool && base) {
      const meta = base.texture.customData.gpp;
      if (!Object.prototype.hasOwnProperty.call(meta, 'fallsMask')) meta.fallsMask = ok(() => {
        const canvas = base.texture.getSourceImage(), width = canvas.width, height = canvas.height;
        const pixels = canvas.getContext('2d').getImageData(0, 0, width, height).data, solid = new Uint8Array(width * height);
        for (let i = 0; i < solid.length; i++) solid[i] = pixels[i * 4 + 3] >= 96 ? 1 : 0;
        return { width, height, solid };
      });
      const mask = meta.fallsMask;
      if (mask) h.fallsCoversPlayer = (px, py) => {
        const matrix = base.getWorldTransformMatrix();
        if (Math.abs(matrix.a * matrix.d - matrix.b * matrix.c) < 1e-10) return false;
        for (const offset of [28, 14, 42]) {
          const p = matrix.applyInverse(px, py - offset);
          let sx = Math.floor(p.x + base.displayOriginX), sy = Math.floor(p.y + base.displayOriginY);
          if (sx < 0 || sy < 0 || sx >= mask.width || sy >= mask.height) continue;
          if (base.flipX) sx = mask.width - sx - 1; if (base.flipY) sy = mask.height - sy - 1;
          if (mask.solid[sy * mask.width + sx]) return true;
        }
        return false;
      };
    }
    // Bank planting stays at the landscape foot when the sheet extends into the Mere.
    for (const [id, v, hh, dx, dy] of (fed ? [['plant.fern', 1, 26, 98, 12], ['plant.fern', 2, 24, 140, 18], ['plant.bracken', 0, 30, 70, 22], ['plant.reed', 1, 30, 46, 30]] : [['plant.fern', 0, 30, -96, 10], ['plant.fern', 1, 26, 98, 12], ['plant.bracken', 0, 34, -70, 24], ['plant.fern', 2, 24, 70, 26], ['plant.reed', 0, 34, -40, 30], ['plant.reed', 1, 30, 46, 30]])) h.add(libImage(scene, id, v, season, { h: hh }, ax + dx, ay + dy, false));
    // live: streaks running down the sheet (a tile sprite scrolls; nothing redraws)
    const streakKey = bake(scene, 'falls-streak|' + Wd, [0, 0, Wd, 64], B => {
      const cx = B.cx; for (let i = 0; i < 10; i++) { const px = 3 + (i * 4.6) % (Wd - 6), py = (i * 23) % 64, len = 14 + (i * 7) % 18; B.s(`M${px} ${py}v${len}`, i % 3 ? '#ffffff' : '#d6eeea', i % 2 ? 1.4 : 2.2, .55); if (py + len > 64) B.s(`M${px} ${py - 64}v${len}`, i % 3 ? '#ffffff' : '#d6eeea', i % 2 ? 1.4 : 2.2, .55); }
      cx.globalCompositeOperation = 'destination-in'; cx.fillStyle = B.lin(0, 0, Wd, 0, [[0, 'rgba(0,0,0,0)'], [.15, 'rgba(0,0,0,1)'], [.85, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]); cx.fillRect(0, 0, Wd, 64); cx.globalCompositeOperation = 'source-over';
    });
    if (streakKey && scene.add.tileSprite) {
      // (a deep falls: the streaks in two lengths, each with its own crop of the picture, the lower one's pattern carried on from the upper)
      const yTop = y - H + 4, ySplit = deep ? oldY - 10 : y - 4;
      for (const [y0, y1, low] of deep ? [[yTop, ySplit, false], [ySplit, y - 4, true]] : [[yTop, y - 4, false]]) {
        const ts = scene.add.tileSprite(x, (y0 + y1) / 2, Wd * K, (y1 - y0) * K, streakKey).setScale(1 / K).setAlpha(.8), off = (y0 - yTop) * K;
        if (low) live(ts, .1); else if (deep) h.standing(ts, spec.y + 4.1); else h.add(ts); h.move(ts, (node, t, motion) => { if (motion) node.tilePositionY = -t * 150 + off; });
      }
    }
    // The authored Mere painter owns pool spray/rings; standalone falls keep these.
    if (!sharedPool) {
    // spray: soft puffs rising and spreading where the water lands
    const puff = bake(scene, 'puff', [-16, -10, 16, 10], B => { B.cx.fillStyle = B.rad(0, 0, 16, [[0, 'rgba(250,253,252,.9)'], [.5, 'rgba(240,248,246,.45)'], [1, 'rgba(240,248,246,0)']]); B.cx.save(); B.cx.scale(1, .62); B.cx.beginPath(); B.cx.arc(0, 0, 16, 0, Math.PI * 2); B.cx.fill(); B.cx.restore(); });
    for (let i = 0; i < 7; i++) { const im = live(image(scene, puff, x, y), .2), ph = i / 7, side = i % 2 ? 1 : -1; h.move(im, (node, t, motion) => { const f = ((motion ? t : 1.3) * .32 + ph) % 1; node.setPosition(x + side * (4 + f * (18 + (i % 3) * 8)), y - 4 - f * 34).setScale((.7 + f * 1.4) / K).setAlpha(Math.sin(f * Math.PI) * .55); }); }
    // ripples spreading over the pool
    const ring = bake(scene, 'ripple', [-40, -12, 40, 12], B => B.s(B.ell(0, 0, 36, 9), '#eef8f4', 1.6, .8));
    for (let i = 0; i < 3; i++) { const im = live(image(scene, ring, x, y + 10), .05), ph = i / 3; h.move(im, (node, t, motion) => { const f = ((motion ? t : .5) * .4 + ph) % 1; node.setScale((.4 + f * 1.2) / K, (.4 + f * 1.1) / K).setAlpha((1 - f) * .5); }); }
    }
    // (a deep falls: what you do there (the shower, a pet's spray) is done at the scarp's foot where it always was, not out in the
    // deep water at the prow's foot: the actions read these bounds, the click and the fade the whole picture's)
    if (deep) h.useBounds = { x: x + box[0], y: y + box[1], width: box[2] - box[0], height: oldY + 40 - (y + box[1]) };
    return finish(h, { x: x + box[0], y: y + box[1], width: box[2] - box[0], height: box[3] - box[1] }, { x: spec.x, y: spec.y });
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
  const kit = Object.freeze({ brush, bake, image, libImage, handle, finish, castOf, glowPool, poolKey, rng, hash, leafOf, PALETTE: { WOOD, OAK, STONE, SLATE, IRON, MOSS, LEAF }, falls: (...a) => falls(...a), paintIntoGround: (scene, fn) => !!(window.GardenNativePainted && GardenNativePainted.paintIntoGround(scene, fn)) });
  /** A gate's drawing as a data URL, for previews: GardenPaintedProps.gatePreview('arch', true, 'summer', false). */
  function gatePreview(kind, side, season, open, span) {
    const sp = span || (side ? 60 : 96), frame = { x: 0, y: 0, span: sp, ux: side ? .16 : 1, uy: side ? 1 : 0 }, art = gateArt(kind, { id: 'preview-' + kind }, frame, season || 'summer', !!open);
    const [x0, y0, x1, y1] = art.box, c = document.createElement('canvas'); c.width = (x1 - x0) * K; c.height = (y1 - y0) * K; const cx = c.getContext('2d');
    cx.fillStyle = '#7d9a5a'; cx.fillRect(0, 0, c.width, c.height); cx.setTransform(K, 0, 0, K, -x0 * K, -y0 * K);
    ok(() => art.base(brush(cx))); if (!open) ok(() => art.blocker(brush(cx))); return c.toDataURL();
  }
  /** The trees the crossings' art stands beside (the stair's cherries, the pass's pine, the ruin's yew), as trunk feet
   *  in cells ([x, y, width]) for the one trunk-collision list (94-garden-world-0walk.js _gwPaintedTrunks). The same
   *  numbers gateArt uses; a tree stands whether the gate is open or not. */
  /** The crossings' standing stonework as boxes the feet cannot enter, in cells ({x0, y0, x1, y1, src}), from the same
   *  numbers the drawings use (gateArt, ruinedArch): the Ruined arch's piers and the wall stubs beside them, the Orchard
   *  stair's stone cheeks and oak posts, the cairn by the pass. They stand whether the gate is open or shut. */
  let gateFeetMemo = null;
  function gateFeet() {
    const D = typeof gardenIslandData === 'function' ? gardenIslandData() : null; if (!D || !D.gates || typeof _gldIslandGateFrame !== 'function') return [];
    if (gateFeetMemo && gateFeetMemo.d === D) return gateFeetMemo.out;
    const W = GARDEN_WORLD, out = [], box = (g, x0, y0, x1, y1, what) => out.push({ x0: x0 / W.cellW, y0: (y0 - W.sky) / W.cellH, x1: x1 / W.cellW, y1: (y1 - W.sky) / W.cellH, src: (g.name || g.id) + ' (' + what + ')' });
    for (const g of D.gates) {
      const frame = g.crossSpan ? ok(() => _gldIslandGateFrame(g)) : null; if (!frame) continue;
      const kind = gateKind(g), side = Math.abs(frame.uy) > Math.abs(frame.ux), half = Math.max(46, Math.min(80, frame.span * .62)); if (side) continue;   // (seen side on, the arch's trunks are in the trunk list and the bridge is its crossing's)
      // (the ruin's reach +20: the wall stub's last stones stand a few pixels past its end)
      if (kind === 'ruin') { const pw = Math.max(12, half * .3), reach = half + pw + half * .7 + 20; for (const s of [-1, 1]) box(g, frame.x + (s < 0 ? -reach : half), frame.y - 8, frame.x + (s < 0 ? -half : reach), frame.y + 1, s < 0 ? 'west pier and wall' : 'east pier and wall'); }
      else if (kind === 'stair') { const sw = half * 1.55, dy = 52, top = dy - 6 * 9; for (const s of [-1, 1]) box(g, frame.x + (s < 0 ? -(sw + 47) : sw - 5), frame.y + top - 6, frame.x + (s < 0 ? -(sw - 5) : sw + 47), frame.y + dy, s < 0 ? 'west cheek and post' : 'east cheek and post'); }
      else if (kind === 'pass') {
        // the cairn (stacked from frame.y - 2 up; its bottom stone's foot lies 2 to 4 px below that)
        box(g, frame.x + half + 36 - 10, frame.y - 7, frame.x + half + 36 + 9, frame.y + 5, 'cairn');
        // the two big boulders either side of the col (art.lib: rock.boulder 100 px at -half, 2 and 110 px at +half, 4; each
        // is drawn about two fifths of its library width across, its foot a pixel or two below its point). They had no
        // block and were walked over (the collision audit, 19 Nov 2026). The col between them stays open.
        for (const [s, w, dy] of [[-1, 100, 2], [1, 110, 4]]) { const c = frame.x + s * half + (s < 0 ? -2 : .5), r = w * .2 + 1; box(g, c - r, frame.y + dy - 10, c + r, frame.y + dy + 2, s < 0 ? 'west boulder' : 'east boulder'); }
      }
    }
    gateFeetMemo = { d: D, out };
    return out;
  }
  let gateTreesMemo = null, fallsFeet = [];
  function gateTrees() {
    const D = typeof gardenIslandData === 'function' ? gardenIslandData() : null; if (!D || !D.gates || typeof _gldIslandGateFrame !== 'function') return [];
    if (gateTreesMemo && gateTreesMemo.d === D) return gateTreesMemo.out.concat(fallsFeet);
    const W = GARDEN_WORLD, out = [];
    for (const g of D.gates) {
      const frame = g.crossSpan ? ok(() => _gldIslandGateFrame(g)) : null; if (!frame) continue;
      const art = ok(() => gateArt(gateKind(g), g, frame, 'summer', true, null)); if (!art) continue;
      for (const [id, , size, dx, dy] of art.lib) if (/^tree\./.test(id)) out.push([+((frame.x + dx) / W.cellW).toFixed(2), +((frame.y + dy - W.sky) / W.cellH).toFixed(2), size.h > 140 ? .5 : .4, id.slice(5)]);
        else if (/^rock\./.test(id) && size.w) { const side = Math.abs(frame.uy) > Math.abs(frame.ux); out.push([+((frame.x + dx) / W.cellW).toFixed(2), +((frame.y + dy + (side ? size.w * .26 : 6) - W.sky) / W.cellH).toFixed(2), +(size.w * .5 / W.cellW).toFixed(2), 'rock']); }   // (Cloudbreak layout: across a horizontal pass the boulders are drawn from their foot, so the block is at the foot, not 0.9 cells below it)   // (the pass's boulders, drawn from their middle: a block along their foot, half the stone wide)
      for (const [dx, dy, wpx] of art.feet || []) out.push([+((frame.x + dx) / W.cellW).toFixed(2), +((frame.y + dy - W.sky) / W.cellH).toFixed(2), +(wpx / W.cellW).toFixed(2)]);
    }
    gateTreesMemo = { d: D, out };
    return out.concat(fallsFeet);
  }
  return { gateTrees, gateFeet, gatePreview, kit, decorTable: DECOR, paintTable: PAINT, memory, glowPool, prop, signature, decor, decorSignature, decorKnown, gate, gateSignature, gateKind, falls, poolKey, image, status, get lastError() { return lastError; } };
})();
