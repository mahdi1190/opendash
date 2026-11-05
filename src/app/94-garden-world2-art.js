/* Composed plaza preview. Pure artwork at canonical world coordinates: no save,
   collision, economy or multiplayer state is changed. Each bounded SVG becomes
   one renderer texture. Moving water is separate from its stationary rocks. */
window.GardenPlazaArt = (function () {
  const cache = new Map(), MAX_CACHE = 4, TILE_COLS = 8, TILE_ROWS = 8;
  const n = x => Math.round(x * 100) / 100;
  const xml = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rect = (x, y, w, h, c, r, more) => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${r || 0}" fill="${c}"${more || ''}/>`;
  const path = (d, c, more) => `<path d="${d}" fill="${c}"${more || ''}/>`;
  const line = (d, c, w, more) => path(d, 'none', ` stroke="${c}" stroke-width="${w || 1}" stroke-linecap="round" stroke-linejoin="round"${more || ''}`);
  const ell = (x, y, rx, ry, c, more) => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${c}"${more || ''}/>`;
  const circle = (x, y, r, c, more) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${c}"${more || ''}/>`;
  const text = (x, y, label, size, c, more) => `<text x="${n(x)}" y="${n(y)}" text-anchor="middle" font-family="Georgia, serif" font-size="${size}" fill="${c}"${more || ''}>${xml(label)}</text>`;
  function rng(seed) {
    let v = 2166136261;
    for (let i = 0; i < seed.length; i++) v = Math.imul(v ^ seed.charCodeAt(i), 16777619);
    return () => { v = Math.imul(v ^ v >>> 15, 2246822519); v = Math.imul(v ^ v >>> 13, 3266489917); return ((v ^= v >>> 16) >>> 0) / 4294967296; };
  }
  function svg(w, h, body) { return `<svg xmlns="http://www.w3.org/2000/svg" width="${n(w)}" height="${n(h)}" viewBox="0 0 ${n(w)} ${n(h)}">${body}</svg>`; }
  function layer(id, x, y, w, h, body, depth, extra) {
    return Object.assign({ id: 'plaza-' + id, x: n(x), y: n(y), width: n(w), height: n(h), svg: svg(w, h, body), depth }, extra || {});
  }
  function cropLayer(id, x, y, body, box, depth, extra) {
    return layer(id, x + box[0], y + box[1], box[2], box[3], `<g transform="translate(${-box[0]} ${-box[1]})">${body}</g>`, depth, extra);
  }
  function prefsOf(m) {
    if (m && m.prefs) return m.prefs;
    if (m && m.g && m.g.prefs) return m.g.prefs;
    try { return typeof state !== 'undefined' && state.garden && state.garden.prefs || {}; } catch (e) { return {}; }
  }
  function palette(season, tod) {
    const cold = season === 'winter', autumn = season === 'autumn', night = tod === 'night';
    return { stone: cold ? ['#b7bdb6', '#dce0d6', '#929d96'] : ['#b9ae95', '#ddd3b9', '#958b76'],
      pavers: cold ? ['#d8d9cb', '#bfc8be', '#e4e4d8', '#c7cdc1'] : ['#ddc7a2', '#d7bc94', '#e9d7b8', '#cdb28d'],
      mortar: cold ? '#a9b3a6' : '#a59b80', brick: ['#ac6950', '#cd9272', '#e0b69a'],
      leaf: cold ? '#6a8673' : autumn ? '#788043' : '#557f53', lightLeaf: cold ? '#a0b4a1' : autumn ? '#bb9f56' : '#86a469',
      flower: cold ? '#eee9de' : autumn ? '#dfb256' : '#dba4a3', wood: '#76604c', darkWood: '#4c4439',
      cream: cold ? '#e2e3d5' : '#f0e3c6', pane: night ? '#e8ba6b' : '#91b9b3', paneDark: night ? '#c77c46' : '#5e8b8b', night };
  }
  function openOf(m, sc) {
    const open = new Set(sc.areas || m && m.areas || []);
    const level = Number(sc.lv || m && m.level && (m.level.level || m.level) || 1);
    for (const zone of GARDEN_ZONES) if (level >= zone.lv) open.add(zone.id);
    if (!open.has('zn-0')) open.add('zn-0');
    return open;
  }
  function pathCell(x, y, open) {
    const c = gardenLandCell(x, y);
    return !!c && !!(c.lane || c.trail) && (!gardenZoneOf(x, y) || open.has('zn-' + gardenZoneOf(x, y))) && (!c.trail || open.has(c.id));
  }
  function occupied(m, sc) {
    const cells = new Set();
    for (const it of [].concat(sc.plants || m && m.plants || [], sc.decor || m && m.decor || [])) {
      const d = it.def || (typeof gardenPlant === 'function' ? gardenPlant(it.id) : null) || (typeof gardenDecor === 'function' ? gardenDecor(it.id) : null);
      const fp = Math.max(1, Number(d && d.fp) || 1), x = Number(it.x), y = Number(it.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      // Protect the visible canopy as well as the saved footprint.
      for (let dy = -3; dy < fp + 1; dy++) for (let dx = -1; dx < fp + 1; dx++) cells.add((x + dx) + ',' + (y + dy));
    }
    return cells;
  }
  function groundLayers(m, sc, open, P) {
    const W = GARDEN_WORLD, out = [], occupiedCells = occupied(m, sc);
    // One coherent material on the actual connected paths; no extra plazas or
    // pretend walkways are painted over someone's planting space or water.
    for (let cx = 12; cx < 40; cx += 14) {
      const x0 = cx * W.cellW, y0 = W.sky + 8 * W.cellH, width = 14 * W.cellW, height = 13 * W.cellH;
      let pavement = '', edges = '', details = '', clips = '', flowers = '';
      const R = rng('paving|' + cx + '|' + sc.season);
      for (let y = 8; y <= 20; y++) for (let x = cx; x < cx + 14; x++) {
        if (!pathCell(x, y, open)) continue;
        const px = x * W.cellW - x0, py = W.sky + y * W.cellH - y0;
        const adjacent = [pathCell(x - 1, y, open), pathCell(x + 1, y, open), pathCell(x, y - 1, open), pathCell(x, y + 1, open)];
        const tl = !adjacent[0] && !adjacent[2] ? 7 : 0, tr = !adjacent[1] && !adjacent[2] ? 7 : 0, br = !adjacent[1] && !adjacent[3] ? 7 : 0, bl = !adjacent[0] && !adjacent[3] ? 7 : 0;
        const ex = px + W.cellW + .2, ey = py + W.cellH + .2;
        clips += path(`M${n(px + tl)} ${py}H${n(ex - tr)}Q${n(ex)} ${py} ${n(ex)} ${n(py + tr)}V${n(ey - br)}Q${n(ex)} ${n(ey)} ${n(ex - br)} ${n(ey)}H${n(px + bl)}Q${px} ${n(ey)} ${px} ${n(ey - bl)}V${n(py + tl)}Q${px} ${py} ${n(px + tl)} ${py}z`, '#fff');
        pavement += rect(px, py, W.cellW + 0.2, W.cellH + 0.2, P.mortar);
        for (let row = 0; row < 2; row++) for (let col = -1; col < 3; col++) {
          const xx = px + col * 25 + (row % 2 ? 12 : 0), yy = py + row * 15;
          pavement += rect(xx + 0.6, yy + 0.6, 24, 14, P.pavers[Math.floor(R() * P.pavers.length)], 1.5);
          details += line(`M${n(xx + 2)} ${n(yy + 1.7)}h18`, '#f7ebd5', 0.55, ' opacity=".38"');
          if (R() < 0.1) details += path(`M${n(xx + 4)} ${n(yy + 6)}l3 -1 2 1 -2 1z`, P.leaf, ' opacity=".35"');
        }
        const borders = [[-1, 0, px + 1.5, py, px + 1.5, py + W.cellH], [1, 0, px + W.cellW - 1.5, py, px + W.cellW - 1.5, py + W.cellH],
          [0, -1, px, py + 1.5, px + W.cellW, py + 1.5], [0, 1, px, py + W.cellH - 1.5, px + W.cellW, py + W.cellH - 1.5]];
        for (let bi = 0; bi < borders.length; bi++) if (!adjacent[bi]) {
          const [, , ax, ay, bx, by] = borders[bi];
          edges += line(`M${n(ax)} ${n(ay)}L${n(bx)} ${n(by)}`, P.stone[2], 3.4);
          edges += line(`M${n(ax)} ${n(ay - 0.6)}L${n(bx)} ${n(by - 0.6)}`, P.stone[1], 1.1);
        }
      }
      // A single subtle compass mosaic at the village entrance, entirely on
      // the two-row lane, where the main path actually meets it.
      if (cx === 12 && pathCell(22, 20, open)) {
        const mx = 22.5 * W.cellW - x0, my = W.sky + 20 * W.cellH + 8 - y0;
        details += ell(mx, my, 40, 17, '#b4a488') + ell(mx, my, 36, 14, '#e4d5b4') + ell(mx, my, 29, 11, 'none', ' stroke="#ae9873" stroke-width="1.2"');
        details += path(`M${n(mx)} ${n(my - 12)}l5 8 24 4 -24 3 -5 8 -5 -8 -24 -3 24 -4z`, '#9b856a');
        details += path(`M${n(mx)} ${n(my - 10)}l3 7 -3 3 -3 -3z`, '#eee1c1') + circle(mx, my, 2.5, '#d7b26f');
      }
      if (clips) out.push(layer('paving-' + cx, x0, y0, width, height, `<defs><clipPath id="plaza-path-${cx}">${clips}</clipPath></defs><g clip-path="url(#plaza-path-${cx})">${pavement}${details}${edges}</g>`, -9400));
      // Small, low herb edging only on empty public green cells next to paths.
      // It never creates a visible uncollidable bench or another large object.
      for (let y = 10; y < 18; y++) for (let x = cx; x < cx + 14; x++) {
        const c = gardenLandCell(x, y);
        if (!c || !c.green || !open.has(c.id) || occupiedCells.has(x + ',' + y) || !pathCell(x - 1, y, open) || (x + y) % 3) continue;
        const fx = (x - cx) * W.cellW + 9, fy = (y - 8) * W.cellH + 17;
        flowers += ell(fx, fy + 1, 10, 3, '#485d42', ' opacity=".15"');
        for (let k = 0; k < 5; k++) {
          const sx = fx - 7 + k * 3.5, sy = fy - 3 - R() * 8;
          flowers += line(`M${n(sx)} ${n(fy)}Q${n(sx - 2)} ${n(sy + 2)} ${n(sx)} ${n(sy)}`, P.leaf, 1.1);
          flowers += ell(sx - 1.5, sy + 4, 3.1, 1.5, P.lightLeaf) + circle(sx, sy, 1.8, P.flower) + circle(sx, sy, 0.65, '#f4deb0');
        }
      }
      if (flowers) out.push(layer('herb-edge-' + cx, x0, y0, width, height, flowers, -9390));
    }
    return out;
  }
  function flowerBox(x, y, w, P, seed) {
    const R = rng(seed), h = 8;
    let s = path(`M${x} ${y}l3 ${h}h${w - 6}l3 -${h}z`, '#986b50') + rect(x - 1, y - 1, w + 2, 3, '#c29470', 1);
    for (let k = 0; k < Math.round(w / 4); k++) {
      const px = x + 2 + R() * (w - 4), py = y - 2 - R() * 6;
      s += ell(px, py, 3.6, 2.1, P.leaf) + ell(px - 1, py - 1, 2.3, 1.6, P.lightLeaf);
      if (k % 2) s += circle(px + 1.8, py - 2, 1.7, P.flower) + circle(px + 1.8, py - 2, 0.5, '#f3db9c');
    }
    return s;
  }
  function lantern(x, y, P) {
    return line(`M${x + 2} ${y - 8}q-7 -4 -7 4v4`, P.darkWood, 1.8)
      + path(`M${x - 10} ${y - 1}l3 -3h8l3 3z`, P.darkWood)
      + rect(x - 8, y, 10, 12, P.pane, 1.5, ` stroke="${P.darkWood}" stroke-width="1.4"`)
      + line(`M${x - 3} ${y}v12M${x - 8} ${y + 6}h10`, P.darkWood, 0.7)
      + path(`M${x - 9} ${y + 12}h12l-2 3h-8z`, P.darkWood)
      + (P.night ? ell(x - 3, y + 5, 2, 4, '#ffe6ac', ' opacity=".9"') : '');
  }
  function facade(prop, P, type) {
    const W = GARDEN_WORLD, w = Math.max(76, prop.w * W.cellW + 18), h = type === 'board' ? 86 : 136, foot = W.sky + (prop.y + prop.h) * W.cellH;
    let s = '', middle = w / 2;
    if (type === 'board') {
      s += ell(middle, h - 5, w * 0.43, 4, '#253a2c', ' opacity=".17"');
      s += rect(15, 38, 9, 43, '#6b5341', 1) + rect(w - 24, 38, 9, 43, '#6b5341', 1);
      s += rect(13, 24, w - 26, 43, '#8d6c4b', 3, ' stroke="#513f30" stroke-width="1.5"');
      s += rect(18, 29, w - 36, 33, '#d5bd8f', 1.5);
      s += path(`M6 25L${middle} 8 ${w - 6} 25l-5 5H11z`, '#6f8270') + line(`M10 25L${middle} 12 ${w - 10} 25`, '#a6b59a', 2);
      s += rect(25, 35, 23, 19, '#f4ead0', 0.5, ' transform="rotate(-6 36 45)"') + rect(57, 34, 21, 22, '#e9d2a1', 0.5, ' transform="rotate(5 67 45)"');
      s += line('M30 41h13M30 45h10M30 49h12M61 40h13M61 45h10M61 50h12', '#9a8d72', 0.7);
      s += circle(36, 35, 1.2, '#b67354') + circle(67, 35, 1.2, '#b67354') + text(middle, 73, 'Village noticeboard', 6.3, '#4c4439');
      s += flowerBox(10, 77, 22, P, 'board') + flowerBox(w - 32, 77, 22, P, 'board2');
    } else {
      const tackle = type === 'tackle', stall = type === 'stall', roof = tackle ? '#637f85' : '#a15d49', trim = tackle ? '#5d7e73' : '#708765';
      s += ell(middle, h - 3, w * 0.43, 5, '#26372a', ' opacity=".17"');
      s += rect(17, 45, w - 34, 79, P.cream, 1, ' stroke="#958d74" stroke-width="1.1"');
      // Hand-laid brick plinth and soft plaster, with measured, quiet variation.
      s += rect(17, 112, w - 34, 13, '#a16d55');
      for (let row = 0; row < 2; row++) for (let col = 0; col < Math.ceil((w - 34) / 14); col++) {
        const x = 18 + col * 14 + (row % 2 ? -7 : 0);
        if (x >= 18 && x + 12 <= w - 17) s += rect(x, 113 + row * 6, 12.5, 4.7, P.brick[(row + col) % 3], 0.5);
      }
      s += path(`M8 48L${middle} 12 ${w - 8} 48l-7 8H15z`, roof, ' stroke="#5d5146" stroke-width="1.5"');
      for (let row = 0; row < 4; row++) {
        const y = 25 + row * 6, half = (y - 12) / 36 * (middle - 8);
        s += line(`M${n(middle - half)} ${y}H${n(middle + half)}`, tackle ? '#91a6a6' : '#d18b67', 1, ' opacity=".65"');
        for (let col = -4; col <= 4; col++) { const x = middle + col * 13 + (row % 2 ? 6 : 0); if (Math.abs(x - middle) < half - 5) s += line(`M${x} ${y - 5}v4`, '#534b44', 0.65, ' opacity=".45"'); }
      }
      s += line(`M12 49L${middle} 17 ${w - 12} 49`, '#e6c5a0', 2.4) + rect(9, 51, w - 18, 4, '#5d5144', 1);
      s += rect(middle - 13, 76, 26, 49, trim, 1.5, ' stroke="#4e5b49" stroke-width="1.4"') + rect(middle - 9, 80, 18, 25, P.pane, 1);
      s += line(`M${middle} 80v25M${middle - 9} 91h18`, '#d7c6a2', 1.2) + circle(middle + 8, 112, 1.6, '#d3ad63');
      s += rect(middle - 17, 124, 34, 4, P.stone[0], 1) + line(`M${middle - 18} 128h36`, P.stone[1], 1.1);
      for (const x of [25, w - 55]) {
        s += rect(x, 80, 29, 27, trim, 1, ' stroke="#6a7960" stroke-width="1"') + rect(x + 3, 83, 23, 21, P.pane, 0.5);
        s += path(`M${x + 5} 84h6l-7 18h-2zM${x + 17} 84h3l-7 18h-3z`, '#eff1d8', ' opacity=".29"');
        s += line(`M${x + 14} 83v21M${x + 3} 93h23`, '#e7d7b6', 1.1) + flowerBox(x - 2, 108, 33, P, type + x);
      }
      s += rect(middle - 35, 59, 70, 13, '#e8d5ad', 3, ' stroke="#765f43" stroke-width="1"') + text(middle, 68.5, tackle ? 'The Tackle House' : stall ? 'Garden Market' : 'Seed & Sprout', 8.3, '#564d3b');
      s += line(`M21 74H${w - 21}`, trim, 3.5);
      for (let k = 0; k < Math.floor((w - 42) / 10); k++) s += path(`M${21 + k * 10} 74h10v5q-5 5 -10 0z`, k % 2 ? '#eadbbd' : trim);
      s += lantern(w - 13, 82, P);
      if (tackle) {
        s += line(`M20 111l-7 -33q-3 -12 -6 -3`, '#8a6944', 1.2) + line('M10 78l-1 26', '#b7aa85', 0.6);
        s += path(`M${w - 15} 117q9 -8 10 -3q-2 8 -10 3l-5 4v-8z`, '#adb7a4') + circle(w - 9, 115, 0.7, '#3b4a43');
      } else {
        s += rect(7, 111, 12, 13, '#9d7250', 2) + rect(5, 109, 16, 3, '#c7a17a', 1);
        s += line('M12 110v-11m0 5q-8 -9 -7 -3m7 0q7 -10 8 -4', P.leaf, 2.5);
        s += path(`M${w - 13} 125q-6 -12 -3 -16q4 -4 7 0q3 4 -4 16z`, '#b99166') + line(`M${w - 13} 110v10`, '#dcc299', 0.8);
      }
    }
    const width = prop.w * W.cellW + 6, height = Math.min(h, Math.max(54, (Number(prop.tall) || 2.8) * W.cellH + 4));
    return layer('facade-' + prop.id, prop.x * W.cellW - 3, foot - height + 3, width, height, `<g transform="scale(${n(width / w)} ${n(height / h)})">${s}</g>`, foot + 0.1, { replacesProp: prop.id });
  }
  function facades(P) {
    const props = typeof gardenPropsNow === 'function' ? gardenPropsNow() : GARDEN_PROPS;
    const types = { 'garden-shop': 'shop', 'tackle-shop': 'tackle', 'notice-board': 'board' };
    return props.filter(p => {
      if (!types[p.id]) return false;
      // A bought paint, roof, awning or sign keeps the complete existing art
      // contract until that style has its own composed facade.
      return typeof gardenBuildLookOf !== 'function' || !Object.values(gardenBuildLookOf(p.id) || {}).some(v => Number(v) > 0);
    }).map(p => facade(p, P, types[p.id]));
  }
  function waterfall(sc, P) {
    const W = GARDEN_WORLD, x = 36.2 * W.cellW, y = W.sky + 22.7 * W.cellH, width = 178, height = 142, out = [];
    // This bank lies beside water, beyond the village's buildings and planting
    // beds. The waterfall adds no walkable ground, collision or catching spot.
    let rocks = '<defs><linearGradient id="plaza-rock" x2=".2" y2="1"><stop stop-color="#b7b4a0"/><stop offset="1" stop-color="#747e74"/></linearGradient></defs>';
    rocks += ell(92, 126, 69, 11, '#346c70', ' opacity=".28"');
    const stones = [[92, 22, 28, 15], [124, 37, 28, 18], [64, 45, 24, 16], [141, 62, 23, 20], [54, 74, 23, 24], [120, 90, 27, 20], [75, 103, 31, 19], [145, 109, 23, 17], [35, 111, 20, 13]];
    for (const [cx, cy, rx, ry] of stones) {
      rocks += path(`M${cx - rx} ${cy + 3}l${n(rx * .25)} -${n(ry * .8)} ${n(rx * .9)} -${n(ry * .28)} ${n(rx * .85)} ${n(ry * .55)} -${n(rx * .16)} ${n(ry * .98)} -${n(rx * 1.05)} ${n(ry * .25)}z`, 'url(#plaza-rock)', ' stroke="#6e796d" stroke-width="1"');
      rocks += line(`M${cx - rx + 6} ${cy - ry * .5}l${rx * .8} -2 ${rx * .7} 3`, '#d8d7bf', 1.5, ' opacity=".7"');
      rocks += path(`M${cx - rx + 5} ${cy - ry * .45}q8 -7 14 -2t14 -2l-2 4q-10 -1 -16 3z`, P.leaf, ' opacity=".84"');
    }
    rocks += path('M88 27q12 -9 23 0l-5 19 -21 6zM74 62q15 -9 32 -3l-1 32 -26 5zM68 96q21 -6 40 0l2 26 -40 0z', '#547f7e');
    for (const [fx, fy, s] of [[28, 116, 1], [147, 78, .8], [124, 34, .7], [53, 57, .65]]) {
      let fern = '';
      for (let k = 0; k < 6; k++) fern += line(`M0 0q${-8 + k * 3} -${13 + k * 1.3} ${-17 + k * 7} -${18 + k * 2}`, k % 2 ? P.leaf : P.lightLeaf, 2);
      rocks += `<g transform="translate(${fx} ${fy}) scale(${s})">${fern}</g>`;
    }
    out.push(layer('waterfall-rocks', x, y, width, height, rocks, y + 130));
    let water = '<defs><linearGradient id="plaza-falling-water" x1="0" x2="1"><stop stop-color="#b6d9d2" stop-opacity=".6"/><stop offset=".5" stop-color="#eff6e5" stop-opacity=".9"/><stop offset="1" stop-color="#80b7b8" stop-opacity=".45"/></linearGradient></defs>';
    water += path('M89 28q10 -3 20 0l-4 19q-2 6 -15 10l-8 5 20 -2q4 14 0 30l-16 9 -10 -1 1 22q12 9 30 0l-3 -20q9 -8 8 -15l-2 -29q10 -9 7 -29z', 'url(#plaza-falling-water)');
    water += line('M95 30l-2 16 -10 12M103 31l-4 18M86 67l1 20 -5 5M96 65l1 21M83 103l2 13M100 102l1 15', '#f5faf0', 1.4, ' opacity=".8"');
    out.push(cropLayer('waterfall-flow', x, y, water, [72, 22, 50, 104], y + 130.2, { motion: { kind: 'waterfall', periodMs: 1200, amplitude: 1.4 } }));
    let foam = '';
    for (let k = 0; k < 16; k++) foam += ell(78 + k * 2.5, 123 + Math.sin(k * 1.7) * 2.1, 4 + k % 3, 1.2 + k % 2 * .4, '#e2f2df', ' opacity=".72"');
    foam += ell(99, 128, 36, 5, 'none', ' stroke="#c5e2d5" stroke-width="1.2" opacity=".55"');
    out.push(cropLayer('waterfall-foam', x, y, foam, [60, 118, 78, 18], y + 130.3, { motion: { kind: 'shimmer', periodMs: 2300, amplitude: .12 } }));
    return out;
  }
  function closedCell(x, y, open, lakeTo) {
    const cell = gardenLandCell(x, y);
    if (cell && cell.plot && open.has(cell.id)) return false;
    if (x >= 12 && x < 40 && y >= 21 && y < 38 && typeof gardenLakeZoneOfRow === 'function') {
      if (y < lakeTo) return false;
      const z = gardenLakeZoneOfRow(y);
      return !!z.n && !open.has(z.id);
    }
    const zone = gardenZoneOf(x, y);
    return !!zone && !open.has('zn-' + zone);
  }
  function fogLayers(sc, open, lakeTo) {
    const W = GARDEN_WORLD, out = [], night = sc.tod === 'night', tint = night ? '#a7bac4' : sc.tod === 'dusk' ? '#e2dbce' : '#eef3e8';
    const closed = (x, y) => x >= 0 && y >= 0 && x < W.cols && y < W.rows && closedCell(x, y, open, lakeTo);
    // The existing garden already paints distant mist. Add only a quiet band
    // at the reachable frontier, not another opaque layer over the whole map.
    const frontier = new Set();
    for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
      if (!closed(x, y)) continue;
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > 2) continue;
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < W.cols && yy < W.rows && !closed(xx, yy)) { near = true; break; }
      }
      if (near) frontier.add(x + ',' + y);
    }
    for (let cy = 0; cy < W.rows; cy += TILE_ROWS) for (let cx = 0; cx < W.cols; cx += TILE_COLS) {
      const cols = Math.min(TILE_COLS, W.cols - cx), rows = Math.min(TILE_ROWS, W.rows - cy), width = cols * W.cellW, height = rows * W.cellH;
      const fogId = 'plaza-fog-' + cx + '-' + cy;
      let clip = '', wisps = '', left = width, top = height, right = 0, bottom = 0;
      for (let y = cy; y < cy + rows; y++) for (let x = cx; x < cx + cols; x++) if (closed(x, y)) clip += rect((x - cx) * W.cellW, (y - cy) * W.cellH, W.cellW, W.cellH, '#fff');
      if (!clip) continue;
      // Seed neighbouring wisps in world coordinates to keep tile edges
      // continuous. A hard cell clip prevents any fog bleeding onto open land.
      for (let y = Math.max(0, cy - 1); y < Math.min(W.rows, cy + rows + 1); y++) for (let x = Math.max(0, cx - 2); x < Math.min(W.cols, cx + cols + 2); x++) {
        if (!frontier.has(x + ',' + y)) continue;
        const R = rng('frontier-mist|' + x + '|' + y), px = (x - cx + .5) * W.cellW + (R() - .5) * 14, py = (y - cy + .5) * W.cellH + (R() - .5) * 8, rx = 54 + R() * 18, ry = 20 + R() * 8;
        wisps += ell(px, py, rx, ry, 'url(#' + fogId + '-wisp)');
        left = Math.min(left, px - rx); top = Math.min(top, py - ry); right = Math.max(right, px + rx); bottom = Math.max(bottom, py + ry);
      }
      if (!wisps) continue;
      const body = `<defs><clipPath id="${fogId}-cells">${clip}</clipPath><radialGradient id="${fogId}-wisp"><stop stop-color="${tint}" stop-opacity=".24"/><stop offset=".6" stop-color="${tint}" stop-opacity=".12"/><stop offset="1" stop-color="${tint}" stop-opacity="0"/></radialGradient></defs><g clip-path="url(#${fogId}-cells)">${wisps}</g>`;
      const x = Math.max(0, Math.floor(left)), y = Math.max(0, Math.floor(top)), w = Math.min(width, Math.ceil(right)) - x, h = Math.min(height, Math.ceil(bottom)) - y;
      if (w > 0 && h > 0) out.push(cropLayer('mist-' + cx + '-' + cy, cx * W.cellW, W.sky + cy * W.cellH, body, [x, y, w, h], 100000));
    }
    return out;
  }
  function gateLayers(sc, open, P) {
    const W = GARDEN_WORLD, out = [];
    for (const g of GARDEN_ZONE_GATES) {
      const locked = !open.has('zn-' + g.n), inner = gardenZoneOf(g.door.x, g.door.y);
      if (!locked || inner && !open.has('zn-' + inner)) continue;
      const zone = gardenZone(g.n), across = !!g.dx;
      const gx = across ? (g.dx > 0 ? g.x : g.x + 1) * W.cellW : (g.x + .5) * W.cellW;
      const gy = W.sky + (across ? g.y + g.h : g.dy > 0 ? g.y : g.y + 1) * W.cellH;
      const width = across ? 90 : 92, height = across ? 68 + (g.h - 1) * W.cellH : 78;
      const x = gx - width / 2, y = gy - height + 8;
      const post = (px, py, size) => {
        let s = ell(px + 2, py + 1, 9 * size, 3 * size, '#2a4031', ' opacity=".22"');
        s += rect(px - 5 * size, py - 31 * size, 10 * size, 31 * size, P.stone[0], 1.2);
        s += path(`M${n(px + 5 * size)} ${n(py - 31 * size)}l${n(4 * size)} -${n(3 * size)}v${n(31 * size)}l-${n(4 * size)} ${n(3 * size)}z`, P.stone[2]);
        for (let k = 0; k < 4; k++) s += line(`M${n(px - 5 * size)} ${n(py - 6 * size - k * 7 * size)}h${n(10 * size)}`, '#8f937f', .7);
        s += rect(px - 7 * size, py - 36 * size, 16 * size, 5 * size, P.stone[1], 1.3) + circle(px + size, py - 39 * size, 3.4 * size, P.stone[0]);
        s += line(`M${n(px - 3 * size)} ${n(py - 5 * size)}q-${n(5 * size)} -${n(12 * size)} 0 -${n(21 * size)}`, P.leaf, 1.4);
        return s;
      };
      let gate = '';
      if (across) {
        const top = height - 8 - g.h * W.cellH + 8, bottom = height - 8;
        gate += post(34, top, .8);
        gate += path(`M34 ${top - 18}L58 ${bottom - 23}v19L34 ${top - 1}z`, '#887455', ' stroke="#514e3c" stroke-width="1.4"');
        gate += line(`M36 ${top - 15}L56 ${bottom - 20}M36 ${top - 5}L56 ${bottom - 10}M36 ${top - 14}L56 ${bottom - 9}`, '#c1a680', 1.5);
        gate += post(58, bottom, 1);
      } else {
        gate += rect(22, height - 37, 48, 26, '#857256', 2, ' stroke="#514e3c" stroke-width="1.4"');
        for (let k = 0; k < 6; k++) gate += rect(24 + k * 7.6, height - 36, 2, 24, '#b3a183', .7);
        gate += line(`M24 ${height - 15}l43 -17`, '#d0ba92', 2) + post(18, height - 8, 1) + post(74, height - 8, 1);
      }
      out.push(layer('gate-' + g.id, x, y, width, height, gate, gy + .2, { replacesProp: g.id, land: 'zn-' + g.n }));
      const sw = 116, sh = 32;
      let sign = rect(1, 1, sw - 2, sh - 2, '#f2e7cc', 5, ' stroke="#82735b" stroke-width="1.2"');
      sign += rect(4, 4, sw - 8, sh - 8, 'none', 3, ' stroke="#c8b899" stroke-width=".7"');
      sign += text(sw / 2, 13.5, zone.name, 8.6, '#4d5144', ' font-weight="600"');
      sign += text(sw / 2, 25, 'Requires level ' + zone.lv, 7.7, '#676453');
      const signX = across ? gx - g.dx * 64 - sw / 2 : gx + 28;
      out.push(layer('gate-sign-' + g.id, signX, gy - sh - 12, sw, sh, sign, gy + .3, { replacesProp: g.id, land: 'zn-' + g.n }));
    }
    return out;
  }
  function layers(model, scene) {
    const p = prefsOf(model);
    if (p.plazaPreview !== true || p.renderEngine !== 'phaser' || typeof gardenLandCell !== 'function' || typeof gardenZoneOf !== 'function') return [];
    const sc = scene || {}, open = openOf(model, sc), season = sc.season || model && model.season || 'summer', tod = sc.tod || model && model.tod || 'day';
    const normalized = Object.assign({}, sc, { season, tod }), props = typeof gardenPropsNow === 'function' ? gardenPropsNow() : GARDEN_PROPS;
    const lakeTo = typeof gardenLakeOpenToOf === 'function' ? gardenLakeOpenToOf(open) : 28;
    const placementKey = props.filter(q => ['garden-shop', 'tackle-shop', 'notice-board'].includes(q.id)).map(q => [q.id, q.x, q.y, q.w, q.h, typeof gardenBuildSig === 'function' ? gardenBuildSig(q.id) : ''].join(':')).join('|');
    const occupancyKey = [].concat(sc.plants || model && model.plants || [], sc.decor || model && model.decor || []).map(q => [q.uid || q.id, q.x, q.y, q.def && q.def.fp].join(':')).join('|');
    const key = [season, tod, [...open].sort().join(','), lakeTo, placementKey, occupancyKey].join('|');
    const kept = cache.get(key);
    if (kept) return kept;
    const P = palette(season, tod);
    const result = groundLayers(model, normalized, open, P).concat(facades(P), waterfall(normalized, P), fogLayers(normalized, open, lakeTo), gateLayers(normalized, open, P));
    cache.set(key, result);
    while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
    return result;
  }
  return Object.freeze({ version: 2, replaceGround: false, layers });
})();
