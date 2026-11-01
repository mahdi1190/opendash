/* ============================================================
   GARDEN DESIGNER, the drawing (rules: 94-garden-design-0rules.js). Light on purpose: all the lines of one style are one <path d> per layer of that style, and all the cells of one
   ground one <path> of round dots, so a garden full of paths is a few dozen elements. The layer is its own part of the scene, patched by itself.
   Words on signs are never in this markup: the <text> is empty here and gardenDesignPainted fills it with textContent.
   ============================================================ */
const _gdzN = (v) => Math.round(v);
/** A design's path row as points in the stage's pixels. */
function gardenDesignPts(row) {
  const W = GARDEN_WORLD, out = []; let x = 0, y = 0;
  for (let i = 1; i + 1 < row.length; i += 2) { x += row[i]; y += row[i + 1]; out.push([x / 10 * W.cellW, W.sky + y / 10 * W.cellH]); }
  return out;
}
/** A soft line through points: straight runs between the midpoints, curved through each point. */
function gardenDesignCurve(pts) {
  if (pts.length < 2) return '';
  let d = `M${_gdzN(pts[0][0])} ${_gdzN(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; d += `Q${_gdzN(pts[i][0])} ${_gdzN(pts[i][1])} ${_gdzN(mx)} ${_gdzN(my)}`; }
  const e = pts[pts.length - 1];
  return d + `L${_gdzN(e[0])} ${_gdzN(e[1])}`;
}
function gardenDesignPathMarkup(st, d) {
  return st.layers.map(([c, w, dash, cap]) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="${cap || 'round'}" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`).join('');
}
function _gdzGroundMarkup(row) {
  const W = GARDEN_WORLD, st = GDZ_GROUND[row[0]]; if (!st) return '';
  let d = '', rows = ''; const dots = (st.dots || []).map(() => '');
  for (let i = 1; i + 1 < row.length; i += 2) for (let c = row[i]; c < row[i] + row[i + 1]; c++) {
    const x = c % W.cols, y = (c - x) / W.cols, px = (x + 0.5) * W.cellW, py = W.sky + (y + 0.5) * W.cellH;
    d += `M${_gdzN(px)} ${_gdzN(py)}h.1`;
    if (st.rows) rows += `M${_gdzN(px - 22)} ${_gdzN(py - 5)}h44M${_gdzN(px - 22)} ${_gdzN(py + 7)}h44`;
    if (dots.length) { const r = gardenRand('dz|' + c); for (let k = 0; k < 5; k++) dots[Math.floor(r() * dots.length)] += `M${_gdzN(px - 21 + r() * 42)} ${_gdzN(py - 13 + r() * 26)}h.1`; }
  }
  let s = `<path d="${d}" fill="none" stroke="${st.c}" stroke-width="50" stroke-linecap="round"/>`;
  if (st.rows) s += `<path d="${rows}" fill="none" stroke="${st.rows}" stroke-width="3" stroke-linecap="round"/>`;
  dots.forEach((q, i) => { if (q) s += `<path d="${q}" fill="none" stroke="${st.dots[i]}" stroke-width="4" stroke-linecap="round"/>`; });
  return s;
}
/** The scene's design layer: ground, then paths, nothing that takes a click. */
function gardenDesignLayer(sc) {
  const d = sc && sc.dz; let s = '';
  if (d) {
    for (const row of d.g || []) s += _gdzGroundMarkup(row);
    const by = new Map();
    for (const row of d.p || []) { if (!GDZ_PATHS[row[0]]) continue; by.set(row[0], (by.get(row[0]) || '') + gardenDesignCurve(gardenDesignPts(row))); }
    for (const [st, line] of by) s += gardenDesignPathMarkup(GDZ_PATHS[st], line);
  }
  return `<g class="gd-dz" pointer-events="none">${s}</g>`;
}

/* ---------- things you make ---------- */
function _gdzCol(i, fb) { const c = GDZ_COLOURS[i]; return c ? c.c : fb; }
function _gdzFlagCloth(pat, x, y, w, h, a, b) {
  const P = GDZ_FLAGS[pat] ? GDZ_FLAGS[pat].id : 'plain';
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${a}"/>`;
  if (P === 'stripes') for (let i = 1; i < 5; i += 2) s += `<rect x="${x}" y="${y + i * h / 5}" width="${w}" height="${h / 5}" fill="${b}"/>`;
  if (P === 'cross') s += `<rect x="${x + w * 0.32}" y="${y}" width="${w * 0.16}" height="${h}" fill="${b}"/><rect x="${x}" y="${y + h * 0.4}" width="${w}" height="${h * 0.2}" fill="${b}"/>`;
  if (P === 'split') s += `<rect x="${x + w / 2}" y="${y}" width="${w / 2}" height="${h}" fill="${b}"/>`;
  if (P === 'dots') for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) s += `<circle cx="${x + w * (0.2 + i * 0.3)}" cy="${y + h * (0.3 + k * 0.4)}" r="${h * 0.09}" fill="${b}"/>`;
  if (P === 'sun') s += `<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${h * 0.27}" fill="${b}"/>`;
  return s;
}
/** One thing you made, its foot at 0, 0. `n` numbers its words for gardenDesignPainted. */
function gardenDesignMadeArt(c, n) {
  const kind = GDZ_MADE[c[0]] ? GDZ_MADE[c[0]].id : '', a = _gdzCol(c[3], '#f2e8cf'), b = _gdzCol(c[4], '#c8452f');
  const shadow = '<ellipse cx="1" cy="0" rx="12" ry="3" fill="#1a2a14" fill-opacity="0.22"/>';
  if (kind === 'sign') return shadow + `<rect x="-2.500" y="-34" width="5" height="34" rx="1" fill="#6e4c2c" stroke="#3f2a16" stroke-width="0.8"/><rect x="-37" y="-58" width="74" height="30" rx="4" fill="${a}" stroke="${b}" stroke-width="2.600"/>`
    + `<text data-dzt="${n}" data-l="0" x="0" y="-46" text-anchor="middle" font-size="8" font-weight="700" font-family="Inter, Arial, sans-serif" fill="#2c2418"></text><text data-dzt="${n}" data-l="1" x="0" y="-34" text-anchor="middle" font-size="8" font-weight="700" font-family="Inter, Arial, sans-serif" fill="#2c2418"></text>`;
  if (kind === 'flag') return shadow + `<rect x="-1.800" y="-84" width="3.600" height="84" rx="1" fill="#7a5636" stroke="#3f2a16" stroke-width="0.7"/><circle cx="0" cy="-85" r="2.800" fill="#d9a520"/>`
    + `<g class="gda-flutter"><g>${_gdzFlagCloth(c[5], 2, -82, 40, 26, a, b)}</g><rect x="2" y="-82" width="40" height="26" fill="none" stroke="#2c2418" stroke-opacity="0.45" stroke-width="1"/></g>`;
  if (kind === 'statue') {
    const pose = GDZ_POSES[c[5]] || GDZ_POSES[0], ink = '#2c2418', arm = (sx, deg) => { const r = deg * Math.PI / 180; return `<path d="M${sx * 8} -52L${(sx * 8 + sx * Math.sin(r) * 20).toFixed(1)} ${(-52 + Math.cos(r) * 20).toFixed(1)}" stroke="${a}" stroke-width="6.500" stroke-linecap="round"/>`; };
    return shadow + `<rect x="-14" y="-12" width="28" height="12" rx="1.500" fill="${b}" stroke="${ink}" stroke-opacity="0.5" stroke-width="1"/>`
      + `<path d="M-5 -13V-28M5 -13V-28" stroke="${a}" stroke-width="7" stroke-linecap="round"/>${arm(-1, pose.a[0])}${arm(1, pose.a[1])}<rect x="-9" y="-56" width="18" height="30" rx="5" fill="${a}" stroke="${ink}" stroke-opacity="0.35" stroke-width="1"/><circle cx="0" cy="-64" r="8" fill="${a}" stroke="${ink}" stroke-opacity="0.35" stroke-width="1"/>`;
  }
  return '';
}
/** The things you made, as rows for gardenWorldProps: they stand in their row, in depth order, with the rest of the world. */
function gardenDesignWorldProps(sc) {
  const d = sc && sc.dz, out = []; if (!d || !d.c) return out;
  const W = GARDEN_WORLD;
  d.c.forEach((c, i) => {
    const inner = gardenDesignMadeArt(c, i); if (!inner) return;
    out.push({ cls: 'gd-prop-dz', z: c[2] + 1, x: c[1], inner: `<g transform="translate(${_gdzN((c[1] + 0.5) * W.cellW)} ${_gdzN(W.sky + (c[2] + 1) * W.cellH - 4)})">${inner}</g>`, key: gardenDesignMadeKey(c, i) });
  });
  return out;
}
/** A sign's words in two short lines. */
function gardenDesignLines(t) {
  const words = String(t || '').split(' '), a = []; let n = 0;
  while (words.length && n + words[0].length <= 13) { n += words[0].length + 1; a.push(words.shift()); }
  if (!a.length) { const w = words.shift() || ''; return [w.slice(0, 13), w.slice(13, 26)]; }
  return [a.join(' '), words.join(' ').slice(0, 13)];
}
/** After any paint: the words on signs, as text and nothing else. Friends' too: gardenDesignClean has capped them, textContent cannot make them anything but words. */
function gardenDesignPainted(root, d) {
  if (!root || !d || !d.c || !d.c.length) return;
  for (const el of root.querySelectorAll('text[data-dzt]')) {
    const c = d.c[Number(el.getAttribute('data-dzt'))], line = c ? gardenDesignLines(gardenDesignText(c[6]))[Number(el.getAttribute('data-l'))] || '' : '';
    if (el.textContent !== line) el.textContent = line;
  }
}
