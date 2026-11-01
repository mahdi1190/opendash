/* ============================================================
   GARDEN ART, the living part (2.23, agent 'garden-art'). The art files are pure strings; this one is what happens to them
   on screen. Optional from end to end: without it (or with any step failing) the garden is the same picture, only slower
   and a little less alive. Nothing here is on the wire or in the state.

     Baking     every `.gart-bake` group (the ground, the far distance, the dark of the night) becomes one bitmap with a little
                paper grain, so a painted ground of thousands of strokes costs one image to repaint. The strings stay vector, so
                the photo mode, friends' thumbnails and any browser that cannot bake all draw the same thing. Cached by content.
     Motion     only the plants you can see move, and at most GART_MOTION_CAP of them, the nearest the middle first
                (`gart-rest` on the rest). Checked a few times a second, never per frame, and only when the view changed.
     Moments    a plant growing pops and settles; a harvest bursts; a watering splashes; a planting puffs up earth. WAAPI on
                transforms and opacity, under the art's own `.gd-fx` layer, stopped by reduced motion and the Fun level.

   The rule for all of it: no requestAnimationFrame of its own, nothing while the tab is hidden, nothing when no garden is on screen.
   ============================================================ */
const GART_MOTION_CAP = 24;
const GART_OFF_MARGIN = 200;   // stage units past the window before a thing stops being drawn (faster than you can walk in a look, wide enough for a tree)
const _gartLife = { urls: new Map(), busy: false, grain: null, timer: 0, bound: false };

function _gartMotionOk() {
  try { return typeof gardenMotionOn === 'function' ? gardenMotionOn() : !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
}

/* ---------- baking ---------- */
/** A small tile of neutral noise: the grain of the paper. Made once, reused for every bake. */
function _gartGrain() {
  if (_gartLife.grain) return _gartLife.grain;
  const c = document.createElement('canvas'); c.width = c.height = 192;
  const x = c.getContext('2d'), im = x.createImageData(192, 192), d = im.data, r = GART.rng(7741);
  for (let i = 0; i < d.length; i += 4) { const v = 128 + (r() + r() - 1) * 90; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  x.putImageData(im, 0, 0);
  _gartLife.grain = c;
  return c;
}
function _gartBakeCap() { const dpr = window.devicePixelRatio || 1; return Math.min(2, Math.max(1.5, dpr)); }
/** Turn one group into a bitmap. Resolves to a blob: URL (cached by the group's own markup), or null when it cannot. */
async function _gartBakeOne(markup, box, scale, alpha, pieces) {
  const key = gardenHash(markup) + '|' + markup.length + '|' + box.join(',') + '|' + scale;
  if (_gartLife.urls.has(key)) return _gartLife.urls.get(key);
  const w = Math.max(1, Math.round(box[2] * scale)), h = Math.max(1, Math.round(box[3] * scale));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  // one piece at a time, with a breath for the page between them: the picture only appears when it is whole
  for (const part of pieces && pieces.length ? pieces : [markup]) {
    const img = new Image(); img.decoding = 'async';
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${box.join(' ')}">${part}</svg>`);
    await img.decode();
    x.drawImage(img, 0, 0, w, h);
    await new Promise(res => setTimeout(res, 16));
  }
  // the paper's grain, only where there is paint: 'source-atop' leaves the transparent parts of the picture alone
  if (!alpha) { x.globalCompositeOperation = 'source-atop'; x.globalAlpha = 0.07; x.fillStyle = x.createPattern(_gartGrain(), 'repeat'); x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; }
  const blob = await new Promise(res => { try { c.toBlob(res, 'image/webp', 0.92); } catch (e) { res(null); } });
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  _gartLife.urls.set(key, url);
  if (_gartLife.urls.size > 16) { const first = _gartLife.urls.keys().next().value, u = _gartLife.urls.get(first); _gartLife.urls.delete(first); try { URL.revokeObjectURL(u); } catch (e) { /* gone */ } }
  return url;
}
async function _gartBakeNext(svg) {
  const el = svg.querySelector('.gart-bake:not(.is-baked):not(.no-bake)');
  if (!el) return false;
  _gartLife.busy = true;
  try {
    const W = GARDEN_WORLD, ww = W.cols * W.cellW, hh = W.sky + W.rows * W.cellH;
    const wanted = el.dataset.bs ? +el.dataset.bs : 1;
    let box = [0, 0, ww, hh];
    if (el.dataset.bake === 'far') box = [0, 0, ww, W.sky + 8];
    const cap = Math.min(_gartBakeCap() * wanted, 6000 / box[2], 4096 / box[3]);
    const markup = el.innerHTML;
    const pieces = el.dataset.split ? [...el.children].map(k => k.outerHTML) : null;
    const url = await _gartBakeOne(markup, box, cap, el.dataset.alpha === '1', pieces);
    if (!url) { el.classList.add('no-bake'); return true; }
    const pre = new Image(); pre.src = url; await pre.decode();
    if (!el.isConnected || el.innerHTML !== markup) return true;   // redrawn meanwhile: the next look bakes the new one
    const im = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    im.setAttribute('x', box[0]); im.setAttribute('y', box[1]); im.setAttribute('width', box[2]); im.setAttribute('height', box[3]);
    im.setAttribute('preserveAspectRatio', 'none'); im.setAttribute('href', url);
    el.classList.add('is-baked');
    // the paper's grain makes the picture a shade different from the drawing it replaces: fade it in over the drawing rather than jump. (A see-through layer has no grain, and two darks over each other would flash)
    let eased = false;
    if (el.dataset.alpha !== '1' && !document.hidden && _gartMotionOk()) { try { el.appendChild(im); const a = im.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, easing: 'ease-out' }); a.onfinish = () => { if (im.parentNode === el) el.replaceChildren(im); }; eased = true; } catch (e) { /* no WAAPI */ } }
    if (!eased) el.replaceChildren(im);
  } catch (e) {
    el.classList.add('no-bake');
  } finally { _gartLife.busy = false; }
  return true;
}

/* ---------- who may move ---------- */
function _gartRestItems(svg) {
  const layer = svg.querySelector('.gd-objects'); if (!layer) return;
  const vb = svg.viewBox && svg.viewBox.baseVal; if (!vb) return;
  const needs = svg.querySelector('.gd-needs'), liveL = svg.querySelector('.gart-live');
  const key = (vb.x / 24 | 0) + ',' + (vb.y / 24 | 0) + ',' + vb.width.toFixed(0) + ',' + vb.height.toFixed(0) + ',' + layer.childElementCount + ',' + (needs ? needs.childElementCount : 0) + ',' + (liveL ? liveL.childElementCount : 0);
  if (svg._gartViewKey === key) return;
  svg._gartViewKey = key;
  // what moves on the water and in the sky is the same: nothing off screen runs. A running animation costs every frame, seen or not
  svg.classList.toggle('gart-nosky', vb.y > GARDEN_WORLD.sky);
  for (const el of svg.querySelectorAll('.gart-live > *, .gd-needs > g, .gl-puddles > g')) {
    let b = el._gartBox;
    if (!b) { try { const bb = el.getBBox(), tf = el.transform && el.transform.baseVal && el.transform.baseVal.numberOfItems ? el.transform.baseVal.consolidate().matrix : null; b = { x: bb.x + (tf ? tf.e : 0), y: bb.y + (tf ? tf.f : 0), w: bb.width, h: bb.height }; } catch (e) { b = { x: 0, y: 0, w: 1e5, h: 1e5 }; } el._gartBox = b; }
    const seen = b.x + b.w > vb.x - 12 && b.x < vb.x + vb.width + 12 && b.y + b.h > vb.y - 12 && b.y < vb.y + vb.height + 12;
    if (!!el._gartRest === seen) { el._gartRest = !seen; el.classList.toggle('gart-rest', !seen); }
    // not drawn only once well out of the window: this runs every few steps, so a tight edge showed things popping in inside the view
    const off = !(b.x + b.w > vb.x - GART_OFF_MARGIN && b.x < vb.x + vb.width + GART_OFF_MARGIN && b.y + b.h > vb.y - GART_OFF_MARGIN && b.y < vb.y + vb.height + GART_OFF_MARGIN);
    if (!!el._gartOff !== off) { el._gartOff = off; el.classList.toggle('gart-off', off); }
  }
  const W = GARDEN_WORLD, m = W.cellW * 2, cx = vb.x + vb.width / 2, cy = vb.y + vb.height / 2, near = [];
  const items = layer.children;
  for (let i = 0; i < items.length; i++) {
    const el = items[i], gx = el.getAttribute('data-x'); if (gx == null) continue;
    const x = (+gx + 0.5) * W.cellW, gy = el.getAttribute('data-y'), y = W.sky + (gy == null ? +el.getAttribute('data-z') || 0 : +gy) * W.cellH;
    const seen = x > vb.x - m && x < vb.x + vb.width + m && y > vb.y - m && y < vb.y + vb.height + m * 2;
    // well out of the window it is not drawn at all: a frame that changes anything paints whatever is drawn, seen or not. This took a 200-plant garden from about 420 ms of each second to under 200
    const far = !(x > vb.x - GART_OFF_MARGIN && x < vb.x + vb.width + GART_OFF_MARGIN && y > vb.y - GART_OFF_MARGIN && y < vb.y + vb.height + GART_OFF_MARGIN + 60);
    if (!!el._gartOff !== far) { el._gartOff = far; el.classList.toggle('gart-off', far); }
    if (!seen) { if (!el._gartRest) { el._gartRest = true; el.classList.add('gart-rest'); } continue; }
    near.push([(x - cx) * (x - cx) + (y - cy) * (y - cy), el]);
  }
  near.sort((a, b) => a[0] - b[0]);
  near.forEach((n, i) => { const rest = i >= GART_MOTION_CAP; if (!!n[1]._gartRest !== rest) { n[1]._gartRest = rest; n[1].classList.toggle('gart-rest', rest); } });
}

/* ---------- moments ---------- */
const _GART_EASE = 'cubic-bezier(.2,.8,.25,1)';
/** A plant that grew: a squash, an overshoot, a settle. Round its own foot, in a wrapper so its placing is left alone. */
function _gartPop(el, big) {
  if (!_gartMotionOk() || !el || !el.isConnected) return;
  let wrap = el.querySelector(':scope > .gart-popw');
  if (!wrap) {
    wrap = document.createElementNS('http://www.w3.org/2000/svg', 'g'); wrap.setAttribute('class', 'gart-popw');
    while (el.firstChild) wrap.appendChild(el.firstChild);
    el.appendChild(wrap);
  }
  try {
    wrap.animate(big ? [
      { transform: 'scale(.72,.5)', offset: 0 }, { transform: 'scale(1.18,1.22)', offset: 0.42 }, { transform: 'scale(.95,.96)', offset: 0.68 }, { transform: 'scale(1.02,1.02)', offset: 0.85 }, { transform: 'scale(1,1)', offset: 1 },
    ] : [
      { transform: 'scale(1,1)' }, { transform: 'scale(1.08,.92)', offset: 0.3 }, { transform: 'scale(.97,1.05)', offset: 0.62 }, { transform: 'scale(1,1)' },
    ], { duration: big ? 620 : 420, easing: 'ease-out' });
  } catch (e) { /* no WAAPI: it is just there */ }
}
/** A small burst of particles in the scene's fx layer. kinds: 'harvest' | 'water' | 'plant' | 'feed' | 'prune'. */
function _gartBurst(kind, x, y, fp, col) {
  if (!_gartMotionOk()) return;
  const svg = document.querySelector('.gd-page .gd-svg') || document.querySelector('.gd-svg');
  const layer = svg && svg.querySelector('.gd-fx'); if (!layer) return;
  const W = GARDEN_WORLD, A = GART, px = (x + (fp || 1) / 2) * W.cellW, py = W.sky + (y + (fp || 1)) * W.cellH - 8;
  const NS = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(NS, 'g'); g.setAttribute('transform', `translate(${A.f1(px)} ${A.f1(py)})`); g.setAttribute('class', 'gart-fx');
  const c = A.HEX.test(String(col)) ? col : '#f2c21e', r = A.rng(((px * 7 + py * 13) | 0) + (Date.now() & 1023));   // clock-ok: only which way the bits fly
  const spec = {
    harvest: { n: 12, up: 46, wide: 34, dur: 760, shapes: [A.star(0, 0, 4, 3.6, 1.3), A.petal(0, 0, 0.6, 4.4, 2.2), A.circ(0, 0, 1.8)], cols: [c, '#fff3b0', A.lt(c, 0.4)] },
    water: { n: 9, up: 22, wide: 22, dur: 560, shapes: [`M0 -2.6Q2 0 0 1.6Q-2 0 0 -2.6z`, A.circ(0, 0, 1.1)], cols: ['#a8dcf4', '#ffffff', '#6fb8e4'] },
    plant: { n: 8, up: 14, wide: 20, dur: 480, shapes: [A.ell(0, 0, 1.8, 1.2), A.circ(0, 0, 1)], cols: ['#6b4a32', '#8a6242', '#a8805a'] },
    feed: { n: 9, up: 34, wide: 16, dur: 820, shapes: [A.star(0, 0, 4, 3, 1), A.circ(0, 0, 1.2)], cols: ['#d8f07a', '#fff3b0', '#9ad04a'] },
    prune: { n: 7, up: 18, wide: 26, dur: 700, shapes: [A.leaf(0, 3, 0.2, 7, 1.8)], cols: ['#5f9a3a', '#8fc451', '#3f6f2e'] },
  }[kind];
  if (!spec) return;
  if (kind === 'water') {
    const ring = document.createElementNS(NS, 'ellipse'); ring.setAttribute('rx', '6'); ring.setAttribute('ry', '2'); ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', '#d8f0fc'); ring.setAttribute('stroke-width', '1.4');
    g.appendChild(ring);
    try { ring.animate([{ transform: 'scale(.4)', opacity: 0.9 }, { transform: 'scale(2.4)', opacity: 0 }], { duration: 620, easing: 'ease-out', fill: 'forwards' }); } catch (e) { /* none */ }
  }
  for (let i = 0; i < spec.n; i++) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', spec.shapes[i % spec.shapes.length]); p.setAttribute('fill', spec.cols[i % spec.cols.length]);
    g.appendChild(p);
    const a = (i / spec.n - 0.5) * 2.4 + (r() - 0.5) * 0.5, dx = Math.sin(a) * spec.wide * (0.6 + r() * 0.6), top = -spec.up * (0.6 + r() * 0.6), fall = 8 + r() * 12, rot = (r() - 0.5) * 540;
    try { p.animate([{ transform: 'translate(0,-4px) scale(.3) rotate(0deg)', opacity: 1 }, { transform: `translate(${(dx * 0.62).toFixed(1)}px,${top.toFixed(1)}px) scale(1.1) rotate(${(rot * 0.5).toFixed(0)}deg)`, opacity: 1, offset: 0.46, easing: 'ease-in' }, { transform: `translate(${dx.toFixed(1)}px,${(top + fall + spec.up * 0.5).toFixed(1)}px) scale(.8) rotate(${rot.toFixed(0)}deg)`, opacity: 0 }], { duration: spec.dur * (0.8 + r() * 0.4), easing: _GART_EASE, fill: 'forwards' }); } catch (e) { /* none */ }
  }
  layer.appendChild(g);
  setTimeout(() => g.remove(), spec.dur * 1.4);
}
function _gartOnGarden(ev) {
  const d = ev && ev.detail; if (!d) return;
  try {
    const colOf = id => { const p = typeof gardenPlant === 'function' && gardenPlant(id); return p && p.look ? p.look.c : ''; };
    if (d.kind === 'harvest') {
      if (d.cells) d.cells.slice(0, 12).forEach((c, i) => setTimeout(() => _gartBurst('harvest', c[0], c[1], c[2], colOf(c[3])), i * 60));
      else if (d.x != null) _gartBurst('harvest', d.x, d.y, d.fp, colOf(d.id));
    } else if (d.kind === 'water' && d.x != null) _gartBurst('water', d.x, d.y, d.fp);
    else if (d.kind === 'plant' && d.x != null) _gartBurst('plant', d.x, d.y, 1);
    else if (d.kind === 'feed' && d.x != null) _gartBurst('feed', d.x, d.y, d.fp);
  } catch (e) { /* a moment is never worth an error */ }
}
/** Watch one garden's objects: a plant whose stage went up pops; a new plant pops in. The player moving past is ignored quickly. */
function _gartWatch(svg) {
  if (svg._gartMO) return;
  const layer = svg.querySelector('.gd-objects');
  if (!layer || typeof MutationObserver === 'undefined') return;
  svg._gartMO = new MutationObserver(recs => {
    const gone = new Map(), came = [];
    for (const r of recs) {
      for (const n of r.removedNodes) if (n.nodeType === 1 && n.classList.contains('gd-plant')) gone.set(n.getAttribute('data-uid'), +n.getAttribute('data-st') || 0);
      for (const n of r.addedNodes) if (n.nodeType === 1 && n.classList.contains('gd-plant')) came.push(n);
    }
    for (const n of came.slice(0, 20)) {
      const uid = n.getAttribute('data-uid'), st = +n.getAttribute('data-st') || 0;
      if (!gone.has(uid)) _gartPop(n, true);
      else if (st > gone.get(uid)) _gartPop(n, true);
    }
  });
  svg._gartMO.observe(layer, { childList: true });
}

/* ---------- the one slow heartbeat ---------- */
function _gartTick() {
  if (document.hidden) return;
  const list = document.querySelectorAll('.gd-svg');
  if (!list.length) return;
  for (const svg of list) {
    const r = svg.getBoundingClientRect();
    if (r.width < 240) continue;   // a thumbnail stays as it is
    _gartWatch(svg);
    _gartRestItems(svg);
    if (!_gartLife.busy) _gartBakeNext(svg);
  }
  if ((_gartLife.beat = (_gartLife.beat || 0) + 1) % 8 === 1 && typeof gardenLightCheck === 'function') { try { gardenLightCheck(); } catch (e) { console.error('[garden]', e); } }   // about every 2.5 s: is the light still the right one?
}
function _gartLifeStart() {
  if (_gartLife.bound || typeof document === 'undefined' || typeof setInterval !== 'function') return;
  _gartLife.bound = true;
  document.addEventListener('opendash:garden', _gartOnGarden);
  _gartLife.timer = setInterval(_gartTick, 320);
}
if (typeof document !== 'undefined') _gartLifeStart();
