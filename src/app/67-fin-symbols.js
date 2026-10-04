/* ============================================================
   FINANCE SYMBOLS (owner: Finance symbols) - window.FinSymbols.
   Merchant tiles, animated category icons and transaction-type badges,
   usable anywhere (the Finances view, tasks about bills, the brief).
   Styles: src/styles/67-fin-symbols.css. Debug gallery: #view=fin-symbols.

   Pure (no DOM; tests/fin-symbols.test.mjs runs them in Node):
     merchantCanonical(name)          'SQ *BLUE DOOR 0042' -> 'Blue Door', 'TESCO STORES 3345' -> 'Tesco'
     merchantKey(name)                lower-case canonical, for grouping
     merchantInfo(name, category)     {name, key, known, color, ink, mono, scene}
     merchantMonogram(name, category) 'Tesco' -> 'T', 'Transport for London' -> 'TfL'
     merchantColor(name)              curated brand-ish colour, else a hashed one
     categoryScene(category, bc)      a dashboard category (+ bank category id) -> scene key
     txKind(tx, {recurring})          {a, memo, bc, c, how, m} -> one of TX_KINDS
     contrast(a, b), inkFor(bg)       WCAG contrast helpers
   HTML (trusted markup; every piece of text is escaped):
     merchantSymbol(name, category, {size, live, enter, i, badge, label, selected, dim, cls})
     categoryIcon(category, {size, live: 'hover'|'loop'|'once'|false, label, color, bc, plain, cls})
     txTypeBadge(kindOrTx, {compact, size, label, recurring, cls})
   Runtime: activate(root, {max}) lets at most `max` looping icons on screen
   run (IntersectionObserver); hidden tab -> html.fsym-paused.

   No logos: every glyph is an original drawing; brands get a colour and a
   monogram only. Nothing is fetched. Motion is CSS (transform/opacity),
   static under reduced motion and paused while the tab is hidden.
   ============================================================ */
(function (root) {
  'use strict';

  /* ---------- small helpers ---------- */
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC[c]);
  const SIZES = ['xs', 'sm', 'md', 'lg', 'xl', 'hero'];
  const sizeOf = (s, d) => (SIZES.includes(s) ? s : d);
  const SWATCHES = ['indigo', 'blue', 'teal', 'green', 'amber', 'orange', 'red', 'pink', 'violet', 'slate'];
  /** A CSS colour from a caller, or '' (only hex, rgb/hsl/oklch() and var(--x) pass). */
  function safeCssColor(c) {
    const v = String(c == null ? '' : c).trim();
    return /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([\d\s.,%/deg-]+\)|okl(ch|ab)\([\d\s.,%/-]+\)|var\(--[a-z0-9-]+\))$/i.test(v) ? v : '';
  }
  function fnv(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }

  /* ---------- colour maths (pure) ---------- */
  function hexRgb(hex) {
    let h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [0, 0, 0];
  }
  function luminance(hex) {
    const ch = hexRgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }
  function contrast(a, b) {
    const x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  const INK_LIGHT = '#ffffff', INK_DARK = '#16161a';
  /** The monogram colour for a tile: white when it reads well, else near-black. */
  function inkFor(bg) {
    const w = contrast(bg, INK_LIGHT), d = contrast(bg, INK_DARK);
    return w >= 4.5 || w >= d ? INK_LIGHT : INK_DARK;
  }
  /** OKLCH -> #rrggbb, chroma reduced until it fits sRGB. */
  function oklchHex(L, C, hDeg) {
    const h = hDeg * Math.PI / 180;
    for (let c = C; c >= 0; c -= 0.005) {
      const a = c * Math.cos(h), b = c * Math.sin(h);
      const l_ = L + 0.3963377774 * a + 0.2158037573 * b, m_ = L - 0.1055613458 * a - 0.0638541728 * b, s_ = L - 0.0894841775 * a - 1.2914855480 * b;
      const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
      const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
      if (lin.every(v => v >= -0.0005 && v <= 1.0005)) {
        return '#' + lin.map(v => { v = Math.min(1, Math.max(0, v)); v = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; return Math.round(v * 255).toString(16).padStart(2, '0'); }).join('');
      }
    }
    return '#6b7280';
  }
  /** A stable colour for an unknown merchant: even lightness, white text at 4.5:1+, visible on light and dark. */
  function hashColor(key) {
    const h = fnv(String(key || '?'));
    const hue = h % 360, chroma = 0.105 + ((h >>> 9) % 4) * 0.012;
    for (let L = 0.56; L > 0.3; L -= 0.02) {
      const hex = oklchHex(L, chroma, hue);
      if (contrast(hex, INK_LIGHT) >= 4.6) return hex;
    }
    return '#4b5563';
  }

  /* ---------- scenes: one animated drawing per spending category ----------
     64x64 view box, the anim library's vocabulary (src/app/71-anim-library.js):
     fills k (ink) c (colour) s (soft colour) w (surface) m (muted) y (warm light),
     strokes lk lc lm lw (+ t thick, dash), motion fx-* (CSS names a keyframe).
     `fam` groups scenes that can stand in for each other (coffee is eating out). */
  const n2 = (v) => String(Math.round(v * 100) / 100);
  const steam = (x, y, d) => `<path class="lm fx-steam" style="--d:${d}s" d="M${x} ${y}c-2.4-2.8 2.4-4.8 0-8"/>`;
  const spark = (x, y, r, d, cls) => `<path class="${cls || 'c'} fx-twinkle" style="--d:${d}s" d="M${n2(x)} ${n2(y - r)}q${n2(r * 0.18)} ${n2(r * 0.82)} ${n2(r)} ${n2(r)}q${n2(-r * 0.82)} ${n2(r * 0.18)} ${n2(-r)} ${n2(r)}q${n2(-r * 0.18)} ${n2(-r * 0.82)} ${n2(-r)} ${n2(-r)}q${n2(r * 0.82)} ${n2(-r * 0.18)} ${n2(r)} ${n2(-r)}z"/>`;
  const star = (cx, cy, R, r) => {
    let d = '';
    for (let i = 0; i < 10; i++) { const a = (-90 + i * 36) * Math.PI / 180, rr = i % 2 ? r : R; d += (i ? 'L' : 'M') + n2(cx + rr * Math.cos(a)) + ' ' + n2(cy + rr * Math.sin(a)); }
    return d + 'z';
  };
  const coin = (x, y, r, cls) => `<circle class="${cls || 'c'}" cx="${x}" cy="${y}" r="${r}"/><circle class="lw" cx="${x}" cy="${y}" r="${n2(r * 0.58)}"/>`;
  const paw = (x, y, cls, d) => `<g class="fx-step" style="--d:${d}s"><ellipse class="${cls}" cx="${x}" cy="${y + 3}" rx="5" ry="4.2"/>`
    + [[-5.4, -2.4], [-1.9, -5.6], [1.9, -5.6], [5.4, -2.4]].map(([dx, dy]) => `<circle class="${cls}" cx="${n2(x + dx)}" cy="${n2(y + dy)}" r="2"/>`).join('') + '</g>';

  const SCENES = [
    { key: 'groceries', label: 'Groceries', fam: 'groceries', colour: 'green',
      svg: () => `<rect class="m" x="4" y="55" width="56" height="2" rx="1"/><g class="fx-cart">`
        + `<g class="fx-load" style="--d:.2s"><circle class="c" cx="27" cy="15.5" r="6"/><path class="lk" d="M27.5 9.8c.2-2.4 1.4-4 3.6-4.8"/></g>`
        + `<g class="fx-load" style="--d:.35s"><rect class="y" x="34" y="7" width="7" height="15" rx="3.5"/></g>`
        + `<path class="lk t" d="M5 13h6.5l6.2 27.5h29"/><path class="w lc t" d="M15 19.5h41.5l-5.3 15.5H18.5z"/><path class="lm" d="M27 21v13M38.5 21v13"/>`
        + [22, 43].map(x => `<g class="fx-wheel"><circle class="k" cx="${x}" cy="47" r="4.2"/><rect class="w" x="${x - 0.7}" y="43.6" width="1.4" height="3.2" rx=".7"/></g>`).join('') + '</g>' },
    { key: 'eating-out', label: 'Eating out', fam: 'eating-out', colour: 'orange',
      svg: () => `<path class="lk t" d="M41 26l11-20M45 27.5l13-17"/>` + steam(20, 18, 0) + steam(27, 16, 0.8) + steam(34, 18, 1.6)
        + `<path class="w lm" d="M15 27.5c3-5 9-7.5 17-7.5s14 2.5 17 7.5z"/><path class="lc" d="M20 25.5c3-2.4 5-2.4 8 0s5 2.4 8 0 5-2.4 8 0"/>`
        + `<path class="c" d="M8 28h48c0 13-10.7 23-24 23S8 41 8 28z"/><rect class="s" x="6" y="26" width="52" height="4.6" rx="2.3"/>`
        + `<path class="lw" d="M15 36c2.6 3.4 6.4 5.6 10.6 6.4"/><rect class="k" x="24" y="51" width="16" height="3.2" rx="1.6"/>` },
    { key: 'coffee', label: 'Coffee', fam: 'eating-out', colour: 'amber',
      svg: () => steam(27, 12, 0) + steam(33, 11, 0.7) + steam(39, 12, 1.4)
        + `<path class="c" d="M19 24h26l-3.2 30.5a3 3 0 0 1-3 2.5H25.2a3 3 0 0 1-3-2.5z"/><path class="w" d="M20.6 33h22.8l-1.3 12.6H21.9z"/>`
        + `<path class="c" d="M32 35.4c2.3 1.6 2.3 6.4 0 8-2.3-1.6-2.3-6.4 0-8z"/><path class="k" d="M21 19.2l1.6-4.2h18.8l1.6 4.2z"/><rect class="k" x="16.5" y="18.6" width="31" height="5.6" rx="2.6"/>` },
    { key: 'drinks', label: 'Drinks', fam: 'eating-out', colour: 'amber',
      svg: () => `<path class="s lc" d="M17 13h30l-3.4 41.5a3 3 0 0 1-3 2.5H23.4a3 3 0 0 1-3-2.5z"/><path class="c" d="M18.6 24h26.8l-2.5 30.3a1.6 1.6 0 0 1-1.6 1.4H22.7a1.6 1.6 0 0 1-1.6-1.4z"/>`
        + [[26, 50, 1.6, 0], [31, 47, 1.2, 0.7], [36, 52, 1.4, 1.3], [39.5, 45, 1, 0.4]].map(([x, y, r, d]) => `<circle class="w fx-bubble" style="--d:${d}s" cx="${x}" cy="${y}" r="${r}"/>`).join('')
        + `<path class="wf lm" d="M15.5 17.5c0-3.4 3.2-5.5 6.3-4 1.6-3 6.4-3.6 8.6-.8 2.2-2.4 7-2.2 8.6.8 3.2-1.6 7.5.4 7.5 4 0 2.2-1.4 4-3.5 4.5v3H19v-3c-2-.5-3.5-2.3-3.5-4.5z"/>` },
    { key: 'takeaway', label: 'Takeaway', fam: 'eating-out', colour: 'orange',
      svg: () => [[3, 27, 12, 0], [1, 34, 14, 0.3], [5, 41, 10, 0.6]].map(([x, y, w, d]) => `<rect class="m fx-trail" style="--d:${d}s" x="${x}" y="${y}" width="${w}" height="2.6" rx="1.3"/>`).join('')
        + `<ellipse class="m fx-shadow" cx="35" cy="58.5" rx="13" ry="2"/><g class="fx-hop o-b"><path class="lk t" d="M28.5 19v-3.5a6.5 6.5 0 0 1 13 0V19"/>`
        + `<path class="c" d="M20 21h30l-2 31.2a3 3 0 0 1-3 2.8H25a3 3 0 0 1-3-2.8z"/><path class="s" d="M20 21l3-5.5h24l3 5.5z"/>`
        + `<rect class="w" x="27" y="31" width="16" height="11" rx="2.5"/><path class="lc" d="M31 36.5h8"/></g>` },
    { key: 'transport', label: 'Transport', fam: 'transport', colour: 'blue',
      svg: () => [[1, 24, 6, 0], [0, 31, 4, 0.3]].map(([x, y, w, d]) => `<rect class="m fx-trail" style="--d:${d}s" x="${x}" y="${y}" width="${w}" height="2.4" rx="1.2"/>`).join('')
        + `<g class="fx-glide"><path class="c" d="M8 20h36c8.8 0 15 6.5 15 14v5a3 3 0 0 1-3 3H8z"/>`
        + [11.5, 22.5, 33.5].map(x => `<rect class="w" x="${x}" y="25" width="8" height="7" rx="1.6"/>`).join('')
        + `<path class="w" d="M46 25h3c3.4 0 6.2 2.6 7 7H46z"/><rect class="w" x="8" y="36" width="51" height="1.6" opacity=".55"/>`
        + [15, 26, 41, 52].map(x => `<circle class="k" cx="${x}" cy="44" r="3.2"/>`).join('') + '</g>'
        + `<rect class="m" x="2" y="48.5" width="60" height="2" rx="1"/><g class="fx-sleepers">${[0, 8, 16, 24, 32, 40, 48, 56, 64].map(x => `<rect class="m" x="${x}" y="52" width="4" height="2.2" rx="1"/>`).join('')}</g>` },
    { key: 'car', label: 'Car & taxi', fam: 'transport', colour: 'slate',
      svg: () => `<g class="fx-bob"><path class="c" d="M5 42.5v-6.2c0-2.3 1.6-4.2 3.8-4.7l8.8-2 6.4-7.8a5 5 0 0 1 3.9-1.8h12.6a5 5 0 0 1 4.2 2.3l5 7.6 5.5 1.1a4.4 4.4 0 0 1 3.5 4.3v7.2z"/>`
        + `<path class="w" d="M20.5 29.6l5.1-6.1a2 2 0 0 1 1.5-.7H33v6.8zM36.5 29.6v-6.8h5.2a2 2 0 0 1 1.7.9l3.9 5.9z"/><rect class="y" x="53.5" y="35" width="4.5" height="2.6" rx="1.3"/></g>`
        + [18, 47].map(x => `<g class="fx-spin"><circle class="k" cx="${x}" cy="43" r="5.2"/><circle class="w" cx="${x}" cy="43" r="1.9"/><rect class="w" x="${x - 0.6}" y="38.4" width="1.2" height="2.4"/></g>`).join('')
        + `<g class="fx-road">${[0, 14, 28, 42, 56, 70].map(x => `<rect class="m" x="${x}" y="54" width="8" height="2" rx="1"/>`).join('')}</g>` },
    { key: 'fuel', label: 'Fuel', fam: 'transport', colour: 'teal',
      svg: () => `<rect class="c" x="9" y="12" width="24" height="42" rx="4"/><rect class="w" x="13.5" y="17" width="15" height="11" rx="2"/><rect class="w" x="13.5" y="33" width="15" height="2.6" rx="1.3" opacity=".55"/>`
        + `<rect class="k" x="6" y="53" width="30" height="4" rx="2"/><path class="lk t" d="M33 21h5.5a4 4 0 0 1 4 4v12"/><rect class="k" x="38" y="36" width="9" height="6" rx="2"/><rect class="k" x="44.5" y="40" width="3" height="5" rx="1"/>`
        + `<path class="c fx-drip" d="M46 47c2.6 3.4 3.9 5.6 3.9 7.4a3.9 3.9 0 0 1-7.8 0c0-1.8 1.3-4 3.9-7.4z"/>` },
    { key: 'housing', label: 'Housing', fam: 'housing', colour: 'indigo',
      svg: () => `<rect class="k" x="41" y="12" width="6" height="12" rx="1"/>` + steam(44, 10, 0)
        + `<path class="s lc" d="M12 30.5L32 14l20 16.5V54H12z"/><path class="c" d="M5.5 31.6L32 9.4l26.5 22.2-3.4 3.9L32 16.2 8.9 35.5z"/>`
        + `<rect class="k" x="28" y="40" width="8" height="14" rx="1.6"/>`
        + [[16.5, 0], [39.5, 1.2]].map(([x, d]) => `<rect class="w lc" x="${x}" y="36" width="8" height="8" rx="1.2"/><rect class="y fx-lamp" style="--d:${d}s" x="${x + 1.3}" y="37.3" width="5.4" height="5.4" rx=".6"/>`).join('')
        + `<rect class="m" x="5" y="54" width="54" height="2" rx="1"/>` },
    { key: 'home', label: 'Home', fam: 'home', colour: 'amber',
      svg: () => `<rect class="s" x="10" y="8" width="26" height="48" rx="3"/><rect class="c fx-paint o-t" x="10" y="8" width="26" height="31" rx="3"/>`
        + `<g class="fx-roller"><path class="lk t" d="M38 38h6.5V48H23v6"/><rect class="w lc t" x="8.5" y="33.5" width="29" height="9.5" rx="3.5"/><rect class="k" x="19.5" y="53" width="7" height="9" rx="2.5"/></g>`
        + spark(52, 14, 5, 0.6) },
    { key: 'utilities', label: 'Bills & utilities', fam: 'utilities', colour: 'amber',
      svg: () => `<circle class="s fx-halo" cx="32" cy="32" r="24"/><path class="c fx-zap" d="M36 6L15 36h14l-4 22 24-32H34.5z"/>`
        + `<g class="fx-flash"><path class="lc t" d="M51 13l4-4M54.5 22H60M10 49l-4 4"/></g>` },
    { key: 'phone', label: 'Phone & internet', fam: 'utilities', colour: 'teal',
      svg: () => [[9, 12], [21, 20], [33, 28], [45, 36]].map(([x, h], i) => `<rect class="m" x="${x}" y="${54 - h}" width="9" height="${h}" rx="2.5"/><rect class="c fx-bar o-b" style="--d:${(i * 0.16).toFixed(2)}s" x="${x}" y="${54 - h}" width="9" height="${h}" rx="2.5"/>`).join('')
        + `<rect class="m" x="5" y="56.5" width="54" height="2" rx="1"/>` },
    { key: 'subscriptions', label: 'Subscriptions', fam: 'subscriptions', colour: 'violet',
      svg: () => `<rect class="s lc" x="7" y="10" width="50" height="36" rx="7"/><path class="c fx-play" d="M27.5 19.8v16.4a1.6 1.6 0 0 0 2.4 1.4l13-8.2a1.6 1.6 0 0 0 0-2.8l-13-8.2a1.6 1.6 0 0 0-2.4 1.4z"/>`
        + `<rect class="m" x="13" y="52" width="38" height="3.2" rx="1.6"/><rect class="c fx-progress o-l" x="13" y="52" width="23.6" height="3.2" rx="1.6"/>` },
    { key: 'shopping', label: 'Shopping', fam: 'shopping', colour: 'pink',
      svg: () => `<ellipse class="m fx-shadow" cx="32" cy="57.5" rx="15" ry="2.2"/><g class="fx-bounce o-b"><path class="lk t" d="M24.5 27v-9.5a7.5 7.5 0 0 1 15 0V27"/>`
        + `<path class="c" d="M14 22h36l-2.6 29.5a3.5 3.5 0 0 1-3.5 3.2H20.1a3.5 3.5 0 0 1-3.5-3.2z"/><path class="w" d="${star(32, 39.5, 7, 3)}"/>`
        + `<circle class="w" cx="24.5" cy="27" r="1.7"/><circle class="w" cx="39.5" cy="27" r="1.7"/></g>` + spark(53, 12, 5, 0.3) + spark(10, 16, 3.5, 1.1) },
    { key: 'health', label: 'Health', fam: 'health', colour: 'red',
      svg: () => `<circle class="s fx-ring" cx="32" cy="33" r="24"/><path class="c fx-beat" d="M32 53S9.5 40 9.5 24.3A11.3 11.3 0 0 1 32 19.8a11.3 11.3 0 0 1 22.5 4.5C54.5 40 32 53 32 53z"/>`
        + `<path class="lw t" d="M14 32h8l3.5-6 5.5 13 4.5-17 3.5 10H50"/>` },
    { key: 'personal-care', label: 'Personal care', fam: 'personal-care', colour: 'pink',
      svg: () => `<rect class="c" x="19" y="25" width="26" height="31" rx="7"/><rect class="w" x="23.5" y="34" width="17" height="13" rx="2.5"/><path class="lc" d="M27.5 40.5h9"/>`
        + `<rect class="k" x="27.5" y="18.5" width="9" height="7" rx="1.5"/><g class="fx-pump"><rect class="k" x="24.5" y="12" width="15" height="4.6" rx="2"/><path class="lk t" d="M39.5 14.3h5.5v4"/><rect class="k" x="30.5" y="15.5" width="3" height="4"/></g>`
        + [[50, 26, 3, 0.2], [55, 35, 2, 0.9], [47.5, 17, 1.7, 1.5]].map(([x, y, r, d]) => `<circle class="w lc fx-bubble" style="--d:${d}s" cx="${x}" cy="${y}" r="${r}"/>`).join('') },
    { key: 'fitness', label: 'Fitness', fam: 'fitness', colour: 'orange',
      svg: () => `<ellipse class="m fx-shadow" cx="32" cy="56" rx="20" ry="2.6"/><g class="fx-lift"><rect class="k" x="14" y="27.5" width="36" height="5" rx="2.5"/>`
        + `<path class="c" d="M9.5 17.5h7l1.5 3v19l-1.5 3h-7L8 39.5v-19z"/><path class="c" d="M47.5 17.5h7l1.5 3v19l-1.5 3h-7L46 39.5v-19z"/>`
        + `<rect class="c" x="3" y="22.5" width="5" height="15" rx="2"/><rect class="c" x="56" y="22.5" width="5" height="15" rx="2"/></g>`
        + `<path class="lc fx-sweat" d="M32 9c1.6 2.2 2.4 3.6 2.4 4.8a2.4 2.4 0 0 1-4.8 0c0-1.2.8-2.6 2.4-4.8z"/>` },
    { key: 'travel', label: 'Travel', fam: 'travel', colour: 'blue',
      svg: () => `<path class="m fx-cloud" d="M44 16a4 4 0 0 1 7.6-1.4A3.2 3.2 0 1 1 53 21H44a2.5 2.5 0 0 1 0-5z"/><path class="lm dash" d="M6 50a26 26 0 0 1 52 0"/>`
        + `<circle class="k" cx="6" cy="50" r="2.6"/><circle class="c" cx="58" cy="50" r="2.6"/>`
        + `<g class="fx-orbit o-v" style="transform-origin:32px 50px"><g transform="translate(32 24)"><rect class="c" x="-11" y="-2.3" width="23" height="4.6" rx="2.3"/>`
        + `<path class="c" d="M-1-1.5L-6.5-11h3.4L6-1.5zM-1 1.5L-6.5 11h3.4L6 1.5zM-8.5-1.5l-2.8-5.6h2.5L-4.6-1.5zM-8.5 1.5l-2.8 5.6h2.5L-4.6 1.5z"/></g></g>` },
    { key: 'entertainment', label: 'Entertainment', fam: 'entertainment', colour: 'violet',
      svg: () => `<g transform="rotate(-10 32 32)"><g class="fx-wiggle"><path class="c" d="M7 21.5a3 3 0 0 1 3-3h44a3 3 0 0 1 3 3v6a4.5 4.5 0 0 0 0 9v6a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3v-6a4.5 4.5 0 0 0 0-9z"/>`
        + `<path class="lw dash2" d="M43 21v22.5"/><path class="w" d="${star(25, 32, 7, 3)}"/></g></g>` + spark(54, 9, 4.5, 0.4) + spark(9, 54, 3.5, 1.2) },
    { key: 'gaming', label: 'Gaming', fam: 'entertainment', colour: 'indigo',
      svg: () => `<g class="fx-rock"><path class="c" d="M19 18h26c6.6 0 11.6 5 12.6 11.6l2.2 14.2a6.6 6.6 0 0 1-11.8 5.1L44 43H20l-4 5.9a6.6 6.6 0 0 1-11.8-5.1l2.2-14.2C7.4 23 12.4 18 19 18z"/>`
        + `<path class="w" d="M17 26.5h4V31h4.5v4H21v4.5h-4V35h-4.5v-4H17z"/>`
        + [[44, 27.5, 0], [50, 33, 0.4], [38, 33, 0.8], [44, 38.5, 1.2]].map(([x, y, d]) => `<circle class="w fx-blink" style="--d:${d}s" cx="${x}" cy="${y}" r="2.5"/>`).join('') + '</g>' },
    { key: 'gifts', label: 'Gifts & charity', fam: 'gifts', colour: 'pink',
      svg: () => `<g class="fx-burst">${spark(10, 15, 4.5, 0)}${spark(54, 11, 5.5, 0)}${spark(56, 30, 3, 0)}</g>`
        + `<rect class="c" x="13" y="33" width="38" height="22" rx="3"/><rect class="w" x="29" y="33" width="6" height="22"/>`
        + `<g class="fx-lid o-b"><rect class="c" x="10" y="23" width="44" height="8.6" rx="2.5"/><rect class="w" x="29" y="23" width="6" height="8.6"/>`
        + `<path class="lc t" d="M32 23c-2.5-6-11.5-9.5-12-4.5-.4 3.8 7 4.5 12 4.5zm0 0c2.5-6 11.5-9.5 12-4.5.4 3.8-7 4.5-12 4.5z"/></g>` },
    { key: 'education', label: 'Education', fam: 'education', colour: 'indigo',
      svg: () => `<path class="s lc" d="M5 17c9-3.5 18-3.5 27 1.8v35c-9-5.3-18-5.3-27-1.8z"/><path class="s lc" d="M59 17c-9-3.5-18-3.5-27 1.8v35c9-5.3 18-5.3 27-1.8z"/>`
        + `<path class="lm" d="M11 25c5-1.4 10-1.2 15 .8M11 32c5-1.4 10-1.2 15 .8M11 39c5-1.4 10-1.2 15 .8M38 25.8c5-2 10-2.2 15-.8M38 32.8c5-2 10-2.2 15-.8M38 39.8c5-2 10-2.2 15-.8"/>`
        + `<path class="w lc fx-flip o-l" d="M32 18.8c9-5.3 18-5.3 27-1.8v35c-9-3.5-18-3.5-27 1.8z"/><path class="c" d="M48 14.5h5v12.5l-2.5-2-2.5 2z"/>` },
    { key: 'savings', label: 'Savings & investments', fam: 'savings', colour: 'green',
      svg: () => `<g class="fx-coin">${coin(32, 7, 5.5)}</g><rect class="k" x="20" y="17" width="24" height="5" rx="2"/><rect class="w" x="27" y="18.5" width="10" height="2" rx="1"/>`
        + `<g class="fx-jar o-b"><path class="s lc" d="M19 22h26v3c3 2.2 5 5.6 5 9.6V50a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6V34.6c0-4 2-7.4 5-9.6z"/>`
        + `<rect class="c" x="19.5" y="47" width="25" height="5.2" rx="2.6"/><rect class="c" x="22" y="41.4" width="20" height="5" rx="2.5"/><path class="lw" d="M19.5 32v8"/></g>` },
    { key: 'income', label: 'Income', fam: 'income', colour: 'green',
      svg: () => `<rect class="c" x="7" y="49" width="24" height="6.2" rx="3.1"/><rect class="s lc" x="7" y="42.6" width="24" height="6.2" rx="3.1"/><rect class="c" x="7" y="36.2" width="24" height="6.2" rx="3.1"/>`
        + `<rect class="s lc" x="34" y="49" width="24" height="6.2" rx="3.1"/><rect class="c" x="34" y="42.6" width="24" height="6.2" rx="3.1"/>`
        + `<g class="fx-nudge"><path class="lc t" d="M19 29V9M12.5 15.5L19 9l6.5 6.5"/></g>`
        + `<g class="fx-rise">${coin(46, 31, 6)}</g><g class="fx-rise" style="--d:1.4s">${coin(51, 20, 4.5)}</g>` },
    { key: 'transfers', label: 'Transfers', fam: 'transfers', colour: 'slate',
      svg: () => `<circle class="s" cx="32" cy="32" r="26"/><g class="fx-swapr"><path class="lc t" d="M15 25h31M39.5 17.5L47 25l-7.5 7.5"/></g>`
        + `<g class="fx-swapl"><path class="lk t" d="M49 39H18M24.5 31.5L17 39l7.5 7.5"/></g>` },
    { key: 'people', label: 'Payments to people', fam: 'people', colour: 'teal',
      svg: () => `<circle class="k" cx="13" cy="24" r="5.5"/><path class="k" d="M3 47a10 10 0 0 1 20 0v2H3z"/><circle class="c" cx="51" cy="24" r="5.5"/><path class="c" d="M41 47a10 10 0 0 1 20 0v2H41z"/>`
        + `<path class="lm dash" d="M21 36q11-14 22 0"/><g class="fx-pass">${coin(21, 36, 4.2)}</g><rect class="m" x="3" y="52" width="58" height="2" rx="1"/>` },
    { key: 'fees', label: 'Fees & interest', fam: 'fees', colour: 'red',
      svg: () => `<g class="fx-print o-t"><path class="w lm" d="M17 12h30v40l-3.75 3-3.75-3-3.75 3-3.75-3-3.75 3-3.75-3-3.75 3L17 52z"/>`
        + `<rect class="m" x="22" y="20" width="14" height="2.6" rx="1.3"/><rect class="m" x="22" y="26.5" width="20" height="2.6" rx="1.3"/><rect class="m" x="22" y="33" width="10" height="2.6" rx="1.3"/><rect class="c" x="22" y="42" width="20" height="3.6" rx="1.8"/></g>`
        + `<rect class="k" x="11" y="8" width="42" height="7" rx="3.5"/>` },
    { key: 'cash', label: 'Cash', fam: 'cash', colour: 'green',
      svg: () => `<g class="fx-note"><rect class="c" x="17" y="17" width="30" height="34" rx="2.5"/><circle class="w" cx="32" cy="34" r="5"/><circle class="lc" cx="32" cy="34" r="2.6"/>`
        + `<rect class="w" x="20.5" y="21" width="5" height="2.6" rx="1" opacity=".75"/><rect class="w" x="38.5" y="44.4" width="5" height="2.6" rx="1" opacity=".75"/></g>`
        + `<rect class="s lc" x="8" y="4" width="48" height="18" rx="4"/><rect class="k" x="14" y="14.5" width="36" height="4.5" rx="2.2"/><circle class="c fx-blink" cx="49" cy="9" r="1.8"/>` },
    { key: 'insurance', label: 'Insurance', fam: 'insurance', colour: 'blue',
      svg: () => `<circle class="s fx-halo" cx="32" cy="32" r="25"/><path class="c" d="M32 7l19 7.5v14c0 12.4-8.1 22.4-19 27.5C21.1 50.9 13 40.9 13 28.5v-14z"/>`
        + `<path class="w" opacity=".16" d="M32 7v49c-10.9-5.1-19-15.1-19-27.5v-14z"/><path class="lw t fx-tick" d="M23.5 31.5l6 6 11.5-12"/>` },
    { key: 'tax', label: 'Tax', fam: 'tax', colour: 'slate',
      svg: () => `<path class="w lm" d="M12 6h28l12 12v40H12z"/><path class="lm" d="M40 6v12h12"/><rect class="m" x="17" y="13" width="16" height="2.6" rx="1.3"/><rect class="m" x="17" y="19" width="11" height="2.6" rx="1.3"/>`
        + `<circle class="s" cx="30" cy="40" r="11"/><path class="lc" d="M30 40V29M30 40l-8.9 6.5"/><path class="c fx-slice" d="M30 40V29a11 11 0 0 1 10.46 7.6z"/>` },
    { key: 'debt', label: 'Debt repayments', fam: 'debt', colour: 'red',
      svg: () => `<g class="fx-tilt"><rect class="c" x="8" y="10" width="44" height="28" rx="4"/><rect class="k" x="8" y="16" width="44" height="5"/>`
        + `<rect class="w" x="13" y="27" width="9" height="6.4" rx="1.6" opacity=".85"/><rect class="w" x="33" y="29.5" width="14" height="2.6" rx="1.3" opacity=".6"/></g>`
        + `<rect class="m" x="8" y="47" width="48" height="5" rx="2.5"/><rect class="c fx-pay o-l" x="8" y="47" width="33.6" height="5" rx="2.5"/>` },
    { key: 'family', label: 'Family', fam: 'family', colour: 'pink',
      svg: () => `<path class="c fx-heart" d="M33 18s-5.5-3.3-5.5-7.3a2.8 2.8 0 0 1 5.5-1.1 2.8 2.8 0 0 1 5.5 1.1c0 4-5.5 7.3-5.5 7.3z"/>`
        + `<circle class="c" cx="21" cy="21" r="6.5"/><path class="c" d="M9 51V39a12 12 0 0 1 24 0v12z"/>`
        + `<g class="fx-bob"><circle class="s lc" cx="45" cy="31" r="5"/><path class="s lc" d="M36.5 51v-6a8.5 8.5 0 0 1 17 0v6z"/></g><rect class="m" x="5" y="52" width="54" height="2" rx="1"/>` },
    { key: 'pets', label: 'Pets', fam: 'family', colour: 'amber',
      svg: () => paw(16, 47, 'c', 0) + paw(31, 34, 'k', 0.45) + paw(45, 20, 'c', 0.9) },
    { key: 'work', label: 'Work expenses', fam: 'work', colour: 'indigo',
      svg: () => `<g class="fx-peek"><path class="w lm" d="M36 7h15v22H36z"/><rect class="m" x="39" y="11" width="9" height="2.2" rx="1.1"/><rect class="c" x="39" y="16" width="7" height="2.2" rx="1.1"/></g>`
        + `<path class="lk t" d="M24.5 23v-4a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v4"/><rect class="c" x="8" y="23" width="48" height="32" rx="5"/>`
        + `<rect class="w" x="8" y="36" width="48" height="2.4" opacity=".5"/><rect class="k" x="28.5" y="33" width="7" height="8.4" rx="1.6"/>` },
    { key: 'other', label: 'Other', fam: 'other', colour: 'violet',
      svg: () => spark(29, 35, 18, 0) + spark(51, 13, 6.5, 0.7, 's') + spark(13, 12, 4.5, 1.3) },
    { key: 'uncategorised', label: 'Uncategorised', fam: 'uncategorised', colour: 'slate',
      svg: () => `<path class="lm" d="M32 2v8"/><g class="fx-swing o-v" style="transform-origin:32px 8px"><path class="s lc" d="M32 8l14 12v31a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V20z"/>`
        + `<circle class="w lc" cx="32" cy="19" r="2.6"/><path class="lc t" d="M27.5 32a4.6 4.6 0 1 1 6.8 4c-1.4.7-2.3 1.8-2.3 3.2v1.2"/><circle class="c" cx="32" cy="46.4" r="2.1"/></g>` },
  ];
  const _SCENE = new Map(SCENES.map(s => [s.key, s]));
  /* every animated part also gets the bare "fx" class the CSS keys on */
  const _markFx = (svg) => svg.replace(/class="([^"]*\bfx-[a-z0-9-]+[^"]*)"/g, (m, c) => `class="fx ${c}"`);
  const _svgCache = new Map();
  function sceneSvg(key) {
    const s = _SCENE.get(key) || _SCENE.get('other');
    if (!_svgCache.has(s.key)) _svgCache.set(s.key, `<svg class="fs-scene fs-${s.key}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${_markFx(s.svg())}</svg>`);
    return _svgCache.get(s.key);
  }

  /* ---------- mini glyphs (24x24 line icons: badges, pills, tight rows) ---------- */
  const MINI = {
    groceries: '<path d="M3 4.5h2.4l2.2 10h10.2l2-7.3H6.3"/><circle class="f" cx="9.3" cy="19" r="1.5"/><circle class="f" cx="16.3" cy="19" r="1.5"/>',
    'eating-out': '<path d="M4 11h16a8 7.5 0 0 1-16 0z"/><path d="M9.5 21h5M10 7.5c-1-1.4 1-2.4 0-4M14 7.5c-1-1.4 1-2.4 0-4"/>',
    coffee: '<path d="M7 9h10l-1.2 11.6a1.6 1.6 0 0 1-1.6 1.4H9.8a1.6 1.6 0 0 1-1.6-1.4z"/><path d="M6 9h12M8 9l.8-3h6.4l.8 3"/>',
    drinks: '<path d="M7 4h10l-1.3 15.6a1.6 1.6 0 0 1-1.6 1.4H9.9a1.6 1.6 0 0 1-1.6-1.4z"/><path d="M7.4 8.5h9.2"/>',
    takeaway: '<path d="M5.5 8.5h13l-1 12.5H6.5z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>',
    transport: '<rect x="6" y="3" width="12" height="14" rx="3"/><path d="M6 10.5h12M8.5 21l1.5-4M15.5 21L14 17"/><circle class="f" cx="9" cy="13.8" r="1"/><circle class="f" cx="15" cy="13.8" r="1"/>',
    car: '<path d="M3.5 16.5v-3.2l2.2-5a1.6 1.6 0 0 1 1.5-1h9.6a1.6 1.6 0 0 1 1.5 1l2.2 5v3.2z"/><path d="M3.5 13h17"/><circle class="f" cx="7.5" cy="17.5" r="1.7"/><circle class="f" cx="16.5" cy="17.5" r="1.7"/>',
    fuel: '<path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3.5 21h13M7.5 8h5"/><path d="M15 10h2a2 2 0 0 1 2 2v4.5a1.5 1.5 0 0 0 3 0V8l-3-3"/>',
    housing: '<path d="M3.5 11L12 3.8l8.5 7.2"/><path d="M6 9.5V20h12V9.5M10 20v-5h4v5"/>',
    home: '<rect x="4" y="3.5" width="13" height="5.5" rx="1.6"/><path d="M17 6.2h2.5v5.5H11v3"/><rect x="9.5" y="14.7" width="3" height="6.3" rx="1"/>',
    utilities: '<path class="f" d="M13.5 2L5 13.2h6.2L10 22l8.6-11.6h-6.3z"/>',
    phone: '<path d="M5 20v-3M10 20v-6.5M15 20v-10M20 20V6"/>',
    subscriptions: '<rect x="3" y="4.5" width="18" height="13" rx="3"/><path class="f" d="M10 8.4l5 2.6-5 2.6z"/><path d="M8 21h8"/>',
    shopping: '<path d="M5 8h14l-1 13H6z"/><path d="M9 10.5V7a3 3 0 0 1 6 0v3.5"/>',
    health: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 2.2C19.5 15.4 12 20 12 20z"/>',
    'personal-care': '<rect x="7" y="10" width="10" height="11" rx="2.6"/><path d="M10 10V7.2h4V10M9 4.4h6M14.5 4.4h2.4v1.8"/>',
    fitness: '<path d="M7 7v10M17 7v10M4.4 9.6v4.8M19.6 9.6v4.8M7 12h10"/>',
    travel: '<path d="M4 12h15.4"/><path d="M10 12L7.2 5.6h2.1L14.4 12M10 12l-2.8 6.4h2.1L14.4 12M5.5 12L4 8.8h1.6L7.8 12M5.5 12L4 15.2h1.6L7.8 12"/>',
    entertainment: '<path d="M4 8a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2.4a1.6 1.6 0 0 0 0 3.2V16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2.4a1.6 1.6 0 0 0 0-3.2z"/><path d="M14.5 7.5v1.2M14.5 11.4v1.2M14.5 15.3v1.2"/>',
    gaming: '<path d="M7.2 8h9.6a4 4 0 0 1 3.9 3.3l.8 4.6a2.4 2.4 0 0 1-4.3 1.8L15.6 16H8.4l-1.6 1.7a2.4 2.4 0 0 1-4.3-1.8l.8-4.6A4 4 0 0 1 7.2 8z"/><path d="M7.5 10.6v3M6 12.1h3"/><circle class="f" cx="15.6" cy="11.4" r="1"/><circle class="f" cx="17.6" cy="13.2" r="1"/>',
    gifts: '<rect x="4" y="9" width="16" height="4" rx="1"/><path d="M5.5 13v7h13v-7M12 9v11"/><path d="M12 9c-1.6-3-5-3.4-5-1.4S10.4 9 12 9zm0 0c1.6-3 5-3.4 5-1.4S13.6 9 12 9z"/>',
    education: '<path d="M3 5.6c3-1 6-1 9 1v13c-3-2-6-2-9-1zM21 5.6c-3-1-6-1-9 1v13c3-2 6-2 9-1z"/>',
    savings: '<path d="M7 7.5h10V9c1.6 1 2.4 2.6 2.4 4.6V18a3 3 0 0 1-3 3H7.6a3 3 0 0 1-3-3v-4.4C4.6 11.6 5.4 10 7 9z"/><path d="M8 4.5h8"/><circle cx="12" cy="15" r="2.2"/>',
    income: '<rect x="3" y="16" width="11" height="4.4" rx="2.2"/><rect x="3" y="11.2" width="11" height="4.4" rx="2.2"/><path d="M18.5 20V5.5M15.3 8.7l3.2-3.2 3.2 3.2"/>',
    transfers: '<path d="M4 8h14.5M15 4.5L18.5 8 15 11.5M20 16H5.5M9 12.5L5.5 16 9 19.5"/>',
    people: '<circle cx="8.5" cy="8" r="2.7"/><path d="M3.5 19a5 4.6 0 0 1 10 0"/><circle cx="16.5" cy="9" r="2.2"/><path d="M15 14.4a4 4 0 0 1 5.5 4.6"/>',
    fees: '<path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    cash: '<rect x="2.5" y="6.5" width="19" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.6v.01M18 14.4v.01"/>',
    insurance: '<path d="M12 3l7 3v5.6c0 4.4-3 7.6-7 9.4-4-1.8-7-5-7-9.4V6z"/><path d="M9 12l2 2 4-4"/>',
    tax: '<path d="M6 3h9l4 4v14H6z"/><circle cx="12" cy="14" r="3.6"/><path class="f" d="M12 14v-3.6a3.6 3.6 0 0 1 3.6 3.6z"/>',
    debt: '<rect x="3" y="5.5" width="18" height="12.5" rx="2.2"/><path d="M3 9.5h18M7 14.5h4"/>',
    family: '<circle cx="9" cy="6.5" r="2.5"/><path d="M4.5 20v-5a4.5 4.5 0 0 1 9 0v5"/><circle cx="17" cy="10.5" r="1.9"/><path d="M14 20v-3a3 3 0 0 1 6 0v3"/>',
    pets: '<path class="f" d="M12 12.8c3 0 5 3 5 5s-1.8 2.6-5 2.6-5-.6-5-2.6 2-5 5-5z"/><circle class="f" cx="6.4" cy="10.6" r="1.7"/><circle class="f" cx="9.6" cy="7" r="1.7"/><circle class="f" cx="14.4" cy="7" r="1.7"/><circle class="f" cx="17.6" cy="10.6" r="1.7"/>',
    work: '<rect x="3" y="7.5" width="18" height="12" rx="2"/><path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3 12.5h18"/>',
    other: '<path class="f" d="M11 3.5l1.7 5.2 5.3 1.6-5.3 1.6L11 17.1l-1.7-5.2L4 10.3l5.3-1.6z"/><path class="f" d="M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    uncategorised: '<circle cx="12" cy="12" r="8.6" stroke-dasharray="2.6 2.6"/><path d="M9.8 9.7a2.3 2.3 0 1 1 3.3 2.1c-.7.3-1.1.9-1.1 1.6M12 16.3v.01"/>',
  };
  function miniSvg(key, cls) {
    const body = MINI[key] || MINI.other;
    return `<svg class="fsym-mini${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
  }

  /* ---------- categories -> scenes ---------- */
  const _norm = (s) => String(s == null ? '' : s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  // The dashboard's categories (lib/finance/default-rules.json) and common names from other apps.
  const CAT_EXACT = {
    'groceries': 'groceries', 'grocery': 'groceries', 'food shopping': 'groceries', 'supermarket': 'groceries',
    'eating out': 'eating-out', 'restaurants': 'eating-out', 'food & drink': 'eating-out', 'food and drink': 'eating-out', 'dining': 'eating-out',
    'coffee': 'coffee', 'coffee & snacks': 'coffee', 'takeaway': 'takeaway', 'takeaways': 'takeaway', 'drinks': 'drinks', 'pubs & bars': 'drinks', 'bars': 'drinks',
    'transport': 'transport', 'transportation': 'transport', 'public transport': 'transport', 'car': 'car', 'taxi': 'car', 'taxis': 'car', 'parking': 'car', 'fuel': 'fuel', 'petrol': 'fuel',
    'housing': 'housing', 'rent': 'housing', 'mortgage': 'housing', 'home': 'home', 'household': 'home', 'diy': 'home',
    'bills & utilities': 'utilities', 'bills and utilities': 'utilities', 'bills': 'utilities', 'utilities': 'utilities', 'energy': 'utilities',
    'phone': 'phone', 'mobile': 'phone', 'phone & internet': 'phone', 'internet': 'phone', 'broadband': 'phone',
    'subscriptions': 'subscriptions', 'subscription': 'subscriptions', 'shopping': 'shopping', 'clothes': 'shopping', 'clothing': 'shopping',
    'health': 'health', 'healthcare': 'health', 'medical': 'health', 'personal care': 'personal-care', 'beauty': 'personal-care',
    'fitness': 'fitness', 'sport': 'fitness', 'sports': 'fitness', 'gym': 'fitness', 'travel': 'travel', 'holidays': 'travel', 'holiday': 'travel',
    'entertainment': 'entertainment', 'leisure': 'entertainment', 'gaming': 'gaming', 'games': 'gaming',
    'gifts & charity': 'gifts', 'gifts and charity': 'gifts', 'gifts': 'gifts', 'charity': 'gifts', 'donations': 'gifts',
    'education': 'education', 'books': 'education', 'savings & investments': 'savings', 'savings': 'savings', 'investments': 'savings', 'saving': 'savings',
    'income': 'income', 'salary': 'income', 'wages': 'income', 'internal transfers': 'transfers', 'internal transfer': 'transfers', 'transfers': 'transfers', 'transfer': 'transfers',
    'payments to people': 'people', 'friends & family': 'people', 'fees & interest': 'fees', 'fees': 'fees', 'bank fees': 'fees', 'bank charges': 'fees', 'interest': 'fees',
    'cash': 'cash', 'atm': 'cash', 'insurance': 'insurance', 'tax': 'tax', 'taxes': 'tax', 'council tax': 'tax',
    'debt repayments': 'debt', 'debt': 'debt', 'loans': 'debt', 'credit card': 'debt', 'family': 'family', 'kids': 'family', 'childcare': 'family', 'pets': 'pets',
    'work expenses': 'work', 'work': 'work', 'business': 'work', 'expenses': 'work', 'other': 'other', 'general': 'other', 'miscellaneous': 'other',
    'uncategorised': 'uncategorised', 'uncategorized': 'uncategorised', 'unknown': 'uncategorised', '': 'uncategorised',
  };
  // First keyword that appears in a custom category name wins (insurance before car: "Car insurance").
  // Word starts (\b) keep "coffee" out of fees, "learning" out of income and "business" out of transport.
  const CAT_WORDS = [
    [/insur/, 'insurance'], [/\btax(es|ation)?\b|hmrc/, 'tax'], [/\bdebts?\b|\bloans?\b|credit card|\brepay|overpay/, 'debt'], [/\bsaving|\binvest|\bisa\b|pension|crypto|\bstocks?\b/, 'savings'],
    [/salary|income|\bwages?\b|payday|stipend|bursary|\bearn/, 'income'], [/transfer/, 'transfers'], [/\bfees?\b|\bcharges?\b|interest|\bbank/, 'fees'], [/\bcash\b|\batm\b/, 'cash'],
    [/grocer|supermarket|food shop/, 'groceries'], [/coffee|\bcafe/, 'coffee'], [/takeaway|\bdelivery/, 'takeaway'], [/\bpubs?\b|\bbars?\b|drink|alcohol|\bbeer|\bwine/, 'drinks'],
    [/\beat|restaurant|dining|\bfood|lunch|dinner|\bmeals?\b/, 'eating-out'], [/\bfuel|petrol|diesel|charging/, 'fuel'], [/\bcars?\b|\btaxi|parking|vehicle|\bmotor/, 'car'],
    [/transport|\btrains?\b|\brail|\bbus(es)?\b|commut|travelcard|\btube\b/, 'transport'], [/holiday|travel|flight|hotel|\btrips?\b/, 'travel'], [/\brent|mortgage|housing|council|landlord/, 'housing'],
    [/\bhome|furni|\bdiy\b|garden|household/, 'home'], [/phone|mobile|internet|broadband|wifi/, 'phone'], [/energy|electric|\bgas\b|\bwater\b|utilit|\bbills?\b/, 'utilities'],
    [/subscri|stream|digital|software|\bapps?\b/, 'subscriptions'], [/\bgam(e|es|ing)\b/, 'gaming'], [/cinema|entertain|music|concert|\bevents?\b|ticket|hobb|leisure|theat|\bfun\b/, 'entertainment'],
    [/\bgym|fitness|\bsports?\b|exercise/, 'fitness'], [/health|medic|pharm|\bdent|optic|doctor|therap/, 'health'], [/beauty|\bhair|barber|personal|cosmetic|self.?care/, 'personal-care'],
    [/cloth|fashion|\bshop|retail|electronic|amazon/, 'shopping'], [/gift|charit|donat|\bpresents?\b/, 'gifts'], [/educat|school|course|\bbooks?\b|tuition|universit|\blearn|\bstud(y|ies)\b/, 'education'],
    [/people|friend|\bsplit|\bpaid to\b/, 'people'], [/family|child|\bkids?\b|\bbaby|nursery/, 'family'], [/\bpets?\b|\bvets?\b|\bdogs?\b|\bcats?\b/, 'pets'], [/\bwork|business|expense|office/, 'work'],
  ];
  // Bank category ids (the Bank connector, list_transaction_categories) that name a more specific scene.
  const BC_SCENE = {
    coffee_snacks: 'coffee', pubs_bars: 'drinks', takeaway: 'takeaway', eating_out: 'eating-out', groceries: 'groceries',
    public_transport: 'transport', taxis: 'car', fuel: 'fuel', parking_tolls: 'car', vehicle_running_costs: 'car',
    mobile_phone: 'phone', broadband: 'phone', energy: 'utilities', water: 'utilities', tv_licence: 'utilities',
    streaming_digital: 'subscriptions', gaming: 'gaming', events_tickets: 'entertainment', hobbies: 'entertainment', gambling: 'entertainment',
    flights: 'travel', accommodation: 'travel', holiday_other: 'travel', pets: 'pets', childcare: 'family', children: 'family', family_support: 'family',
    charity: 'gifts', gifts_given: 'gifts', education: 'education', fitness: 'fitness', healthcare: 'health', dental_optical: 'health', personal_care: 'personal-care',
    clothing: 'shopping', electronics: 'shopping', general_shopping: 'shopping', rent: 'housing', mortgage: 'housing', council_tax: 'tax',
    home_maintenance: 'home', home_improvement: 'home', furniture_homeware: 'home', garden: 'home', household_services: 'home',
  };
  const _catCache = new Map();
  /** The scene for a category name: exact names first, then words in it; a bank category only refines within the same family. */
  function categoryScene(category, bc) {
    const ck = _norm(category) + '|' + String(bc || '').toLowerCase();
    if (_catCache.has(ck)) return _catCache.get(ck);
    const n = _norm(category);
    let base = Object.prototype.hasOwnProperty.call(CAT_EXACT, n) ? CAT_EXACT[n] : null;
    if (!base) { const hit = CAT_WORDS.find(([re]) => re.test(n)); base = hit ? hit[1] : 'other'; }
    const refined = BC_SCENE[String(bc || '').toLowerCase()];
    const out = refined && _SCENE.get(refined).fam === _SCENE.get(base).fam ? refined : base;
    if (_catCache.size > 2000) _catCache.clear();
    _catCache.set(ck, out);
    return out;
  }
  const sceneLabel = (key) => (_SCENE.get(key) || _SCENE.get('other')).label;

  /* ---------- merchants ----------
     [canonical name, pattern (tested on the cleaned, upper-case name), brand-ish colour, scene, monogram?, ink?]
     Colours only, no logos. More specific entries come first (Tesco Mobile before Tesco). */
  const MERCHANTS = [
    // groceries
    ['Tesco Mobile', /\btesco mobile\b/i, '#00539f', 'phone', 'T'],
    ['Tesco Bank', /\btesco bank\b/i, '#00539f', 'debt', 'T'],
    ['Tesco', /\btesco\b/i, '#00539f', 'groceries'],
    ["Sainsbury's Bank", /\bsainsbury'?s bank\b/i, '#c24e00', 'debt', 'S'],
    ["Sainsbury's", /\bsainsbury/i, '#c24e00', 'groceries'],
    ['Asda', /\basda\b/i, '#3f7d1c', 'groceries'],
    ['Morrisons', /\bmorrisons?\b/i, '#00563f', 'groceries', 'M', '#ffd400'],
    ['Waitrose', /\bwaitrose\b/i, '#4f6f18', 'groceries'],
    ['Aldi', /\baldi\b/i, '#00205b', 'groceries', 'A', '#ffb81c'],
    ['Lidl', /\blidl\b/i, '#0050aa', 'groceries', 'L', '#fff000'],
    ['Co-op', /\bco ?op(erative)?\b/i, '#00799e', 'groceries', 'C'],
    ['M&S', /\bm ?& ?s\b|\bmarks ?(and|&) ?spencers?\b|\bm and s\b/i, '#1f3d2b', 'groceries', 'M&S'],
    ['Iceland', /\biceland (foods?|stores?|frozen)\b|^iceland$/i, '#c41e2a', 'groceries'],
    ['Ocado', /\bocado\b/i, '#6b2d86', 'groceries'],
    ['Farmfoods', /\bfarmfoods\b/i, '#0067b1', 'groceries'],
    ['Spar', /\bspar\b/i, '#00703c', 'groceries'],
    ['One Stop', /\bone stop\b/i, '#c8102e', 'groceries', 'O'],
    ['Nisa', /\bnisa\b/i, '#c8102e', 'groceries'],
    ['Costco', /\bcostco\b/i, '#005daa', 'groceries'],
    ['Whole Foods', /\bwhole ?foods\b/i, '#00674b', 'groceries', 'W'],
    ['Amazon Fresh', /\bamazon ?fresh\b/i, '#3a7d34', 'groceries', 'A'],
    ['Gousto', /\bgousto\b/i, '#c63d2a', 'groceries'],
    ['HelloFresh', /\bhello ?fresh\b/i, '#4c7a12', 'groceries', 'H'],
    ['Budgens', /\bbudgens\b/i, '#b5121b', 'groceries'],
    ['Londis', /\blondis\b/i, '#b5121b', 'groceries'],
    ['Booker', /\bbooker\b/i, '#003b71', 'groceries'],
    ['Too Good To Go', /\btoo good to go\b|\btgtg\b/i, '#00615f', 'groceries', 'T'],
    // coffee, food, drink
    ['Costa', /\bcosta\b/i, '#6d1f37', 'coffee'],
    ['Starbucks', /\bstarbucks\b/i, '#00704a', 'coffee'],
    ['Pret', /\bpret\b/i, '#862633', 'coffee'],
    ['Caffè Nero', /\bcaff?e nero\b|\bnero\b/i, '#1c2c4c', 'coffee', 'N'],
    ['Tim Hortons', /\btim hortons?\b/i, '#b5121b', 'coffee', 'T'],
    ["Gail's", /\bgail ?'?s\b/i, '#3b3a36', 'coffee', 'G'],
    ['Black Sheep Coffee', /\bblack sheep coffee\b/i, '#1d1d1b', 'coffee', 'B'],
    ['Joe & the Juice', /\bjoe ?(&|and) ?the ?juice\b/i, '#c2185b', 'coffee', 'J'],
    ['Greggs', /\bgreggs\b/i, '#00609c', 'eating-out', 'G', '#ffd200'],
    ["McDonald's", /\bmc ?donald'?s?\b/i, '#a50f18', 'takeaway', 'M', '#ffc72c'],
    ['KFC', /\bkfc\b|\bkentucky fried\b/i, '#a3080c', 'takeaway', 'KFC'],
    ['Burger King', /\bburger king\b/i, '#c21f00', 'takeaway', 'BK'],
    ['Subway', /\bsubway\b/i, '#005a30', 'takeaway', 'S', '#ffc600'],
    ["Nando's", /\bnando'?s?\b/i, '#b5121b', 'eating-out', 'N'],
    ['Wagamama', /\bwagamama\b/i, '#c8102e', 'eating-out'],
    ["Domino's", /\bdomino'?s\b/i, '#006491', 'takeaway', 'D'],
    ['Pizza Hut', /\bpizza hut\b/i, '#b5121b', 'takeaway', 'PH'],
    ['Pizza Express', /\bpizza ?express\b/i, '#00205b', 'eating-out', 'P'],
    ["Papa John's", /\bpapa john'?s?\b/i, '#00703c', 'takeaway', 'PJ'],
    ['Five Guys', /\bfive guys\b/i, '#b5121b', 'takeaway', 'F'],
    ['Itsu', /\bitsu\b/i, '#c8102e', 'eating-out'],
    ['Wasabi', /\bwasabi\b/i, '#b5121b', 'eating-out'],
    ['Tortilla', /\btortilla\b/i, '#b03a0f', 'eating-out'],
    ['Dishoom', /\bdishoom\b/i, '#2f3e46', 'eating-out'],
    ['Wingstop', /\bwingstop\b/i, '#006938', 'takeaway'],
    ['Chopstix', /\bchopstix\b/i, '#c8102e', 'takeaway'],
    ['Taco Bell', /\btaco bell\b/i, '#702082', 'takeaway', 'TB'],
    ['Krispy Kreme', /\bkrispy kreme\b/i, '#00653a', 'eating-out', 'KK'],
    ['Zizzi', /\bzizzi\b/i, '#1d1d1b', 'eating-out'],
    ['Toby Carvery', /\btoby carvery\b/i, '#7a1f1f', 'eating-out', 'T'],
    ['YO! Sushi', /\byo ?sushi\b/i, '#c8102e', 'eating-out', 'YO'],
    ['GBK', /\bgbk\b|\bgourmet burger\b/i, '#1d1d1b', 'eating-out', 'GBK'],
    ['Honest Burgers', /\bhonest burgers?\b/i, '#b5121b', 'eating-out', 'H'],
    ['Deliveroo', /\bdeliveroo\b/i, '#007a73', 'takeaway'],
    ['Just Eat', /\bjust ?eat\b/i, '#f36d00', 'takeaway', 'J'],
    ['Uber Eats', /\buber ?eats\b/i, '#06c167', 'takeaway', 'UE'],
    ['Wetherspoon', /\bwetherspoons?\b/i, '#1d3557', 'drinks', 'W'],
    ['BrewDog', /\bbrewdog\b/i, '#0a6fae', 'drinks', 'B'],
    ['Greene King', /\bgreene king\b/i, '#00573f', 'drinks', 'GK'],
    // transport
    ['TfL', /\btfl\b|\btransport for london\b/i, '#0019a8', 'transport', 'TfL'],
    ['Trainline', /\btrainline\b/i, '#00a88f', 'transport'],
    ['National Rail', /\bnational rail\b/i, '#b5121b', 'transport', 'NR'],
    ['Avanti West Coast', /\bavanti\b/i, '#004354', 'transport', 'A'],
    ['LNER', /\blner\b/i, '#b30c28', 'transport', 'L'],
    ['GWR', /\bgwr\b|\bgreat western rail/i, '#0a493e', 'transport', 'GWR'],
    ['Northern', /\bnorthern (rail|trains)\b|^northern$/i, '#262262', 'transport', 'N'],
    ['TransPennine Express', /\btranspennine\b|\btpe\b/i, '#0d4f6b', 'transport', 'TPE'],
    ['CrossCountry', /\bcross ?country\b/i, '#7a1e3a', 'transport', 'XC'],
    ['East Midlands Railway', /\bemr\b|\beast midlands railway\b/i, '#4b2e5a', 'transport', 'EMR'],
    ['South Western Railway', /\bsouth western rail|\bswr\b/i, '#24398c', 'transport', 'SWR'],
    ['Southern Water', /\bsouthern water\b/i, '#0067a5', 'utilities', 'SW'],
    ['Southern', /\bsouthern rail(way)?\b|^southern$/i, '#3d7a2a', 'transport', 'S'],
    ['Thameslink', /\bthameslink\b/i, '#b0005f', 'transport', 'T'],
    ['ScotRail', /\bscotrail\b/i, '#1e467d', 'transport', 'S'],
    ['Southeastern', /\bsoutheastern\b/i, '#00609c', 'transport', 'SE'],
    ['Merseyrail', /\bmerseyrail\b/i, '#ffcc00', 'transport', 'M'],
    ['Eurostar', /\beurostar\b/i, '#1c2b5a', 'travel', 'E', '#ffd200'],
    ['Stagecoach', /\bstagecoach\b/i, '#005daa', 'transport'],
    ['First Bus', /\bfirst ?bus\b|\bfirst (group|south|west|bristol|glasgow|manchester|york)\b/i, '#6a2c91', 'transport', 'F'],
    ['Arriva', /\barriva\b/i, '#00a5b5', 'transport'],
    ['National Express', /\bnational express\b/i, '#c8102e', 'transport', 'NX'],
    ['Megabus', /\bmegabus\b/i, '#0b4ea2', 'transport'],
    ['Bee Network', /\bbee ?network\b/i, '#ffd100', 'transport', 'B'],
    ['Metrolink', /\bmetrolink\b/i, '#fecb00', 'transport', 'M'],
    ['Santander Cycles', /\bsantander cycles\b/i, '#c80000', 'transport', 'SC'],
    ['Lime', /\blime\b/i, '#00a316', 'transport'],
    ['Uber', /\buber\b/i, '#000000', 'car', 'U'],
    ['Bolt', /\bbolt\b/i, '#2a9d5c', 'car'],
    ['Addison Lee', /\baddison lee\b/i, '#1d1d1b', 'car', 'AL'],
    ['FREENOW', /\bfree ?now\b/i, '#b5003b', 'car', 'F'],
    ['Shell', /\bshell\b/i, '#fbce07', 'fuel', 'S'],
    ['BP', /\bbp\b/i, '#007f00', 'fuel', 'BP'],
    ['Esso', /\besso\b/i, '#0038a8', 'fuel'],
    ['Texaco', /\btexaco\b/i, '#c8102e', 'fuel'],
    ['Jet', /\bjet\b(?! ?2)/i, '#ffcc00', 'fuel'],
    ['Gulf', /\bgulf\b/i, '#f47b20', 'fuel'],
    ['Applegreen', /\bapplegreen\b/i, '#00703c', 'fuel'],
    ['RingGo', /\bringgo\b/i, '#0a6fae', 'car', 'R'],
    ['PayByPhone', /\bpay ?by ?phone\b/i, '#0072b0', 'car', 'P'],
    ['JustPark', /\bjust ?park\b/i, '#0076a8', 'car', 'J'],
    ['NCP', /\bncp\b/i, '#5a2d82', 'car', 'NCP'],
    ['Dart Charge', /\bdart ?charge\b/i, '#00703c', 'car', 'D'],
    ['Halfords', /\bhalfords\b/i, '#c41e1a', 'car'],
    ['Kwik Fit', /\bkwik ?fit\b/i, '#004b8d', 'car', 'KF'],
    ['DVLA', /\bdvla\b|\bvehicle tax\b/i, '#006b3f', 'tax', 'DV'],
    // housing, bills, phone and internet
    ['OpenRent', /\bopenrent\b/i, '#00805e', 'housing', 'O'],
    ['Council Tax', /\bcouncil tax\b/i, '#4a5568', 'tax', 'CT'],
    ['TV Licensing', /\btv licen[cs]/i, '#b5121b', 'utilities', 'TV'],
    ['Octopus Energy', /\boctopus\b/i, '#c3009a', 'utilities', 'O'],
    ['British Gas', /\bbritish gas\b/i, '#0067a5', 'utilities', 'BG'],
    ['EDF', /\bedf\b/i, '#fe5815', 'utilities', 'EDF'],
    ['E.ON', /\beon\b|\be on (next|energy|uk)\b|^e on$/i, '#c8001a', 'utilities', 'E'],
    ['OVO', /\bovo\b/i, '#0a7d27', 'utilities', 'OVO'],
    ['Scottish Power', /\bscottish ?power\b/i, '#00703c', 'utilities', 'SP'],
    ['SSE', /\bsse\b/i, '#0a2d82', 'utilities', 'SSE'],
    ['Thames Water', /\bthames water\b/i, '#005eb8', 'utilities', 'TW'],
    ['Severn Trent', /\bsevern trent\b/i, '#007a87', 'utilities', 'ST'],
    ['United Utilities', /\bunited utilities\b/i, '#0067a5', 'utilities', 'UU'],
    ['Yorkshire Water', /\byorkshire water\b/i, '#0067b1', 'utilities', 'YW'],
    ['Anglian Water', /\banglian water\b/i, '#00788a', 'utilities', 'AW'],
    ['Virgin Media', /\bvirgin media\b/i, '#b5121b', 'phone', 'VM'],
    ['BT', /\bbt\b|\bbritish telecom/i, '#5514b4', 'phone', 'BT'],
    ['Sky', /\bsky\b(?! ?scanner)/i, '#0072c9', 'subscriptions', 'S'],
    ['EE', /\bee\b/i, '#007b85', 'phone', 'EE'],
    ['Vodafone', /\bvodafone\b/i, '#d50000', 'phone', 'V'],
    ['O2', /\bo2\b|\btelefonica\b/i, '#0019a5', 'phone', 'O2'],
    ['Three', /^(three|three uk|three mobile|three co uk)$|\bhutchison\b/i, '#1d1d1b', 'phone', '3'],
    ['giffgaff', /\bgiff ?gaff\b/i, '#1d1d1b', 'phone', 'g'],
    ['Lebara', /\blebara\b/i, '#0f2c75', 'phone'],
    ['SMARTY', /\bsmarty\b/i, '#1d1d1b', 'phone', 'S'],
    ['VOXI', /\bvoxi\b/i, '#c2006f', 'phone', 'V'],
    ['iD Mobile', /\bid mobile\b/i, '#0071a0', 'phone', 'iD'],
    ['Lyca Mobile', /\blyca ?mobile\b/i, '#0b4ea2', 'phone', 'L'],
    ['Hyperoptic', /\bhyperoptic\b/i, '#d6005f', 'phone', 'H'],
    ['Community Fibre', /\bcommunity ?fibre\b/i, '#3a0ca3', 'phone', 'CF'],
    ['Plusnet', /\bplusnet\b/i, '#7f2a85', 'phone', 'P'],
    ['TalkTalk', /\btalk ?talk\b/i, '#7f1d79', 'phone', 'TT'],
    // insurance, health, personal care
    ['Aviva', /\baviva\b/i, '#ffd900', 'insurance', 'A', '#004fb6'],
    ['Admiral', /\badmiral\b/i, '#00387b', 'insurance'],
    ['Direct Line', /\bdirect line\b/i, '#c8001a', 'insurance', 'DL'],
    ['Hastings Direct', /\bhastings (direct|insurance)\b/i, '#1d1d1b', 'insurance', 'H'],
    ['LV=', /\blv\b|\bliverpool victoria\b/i, '#00703c', 'insurance', 'LV'],
    ['Churchill', /\bchurchill\b/i, '#1d4f91', 'insurance'],
    ['AXA', /\baxa\b/i, '#00008f', 'insurance', 'AXA'],
    ['Legal & General', /\blegal ?(&|and) ?general\b/i, '#0b2d71', 'insurance', 'L&G'],
    ['Vitality', /\bvitality\b/i, '#c2006b', 'health', 'V'],
    ['Bupa', /\bbupa\b/i, '#0067a8', 'health'],
    ['Specsavers', /\bspecsavers\b/i, '#00704a', 'health', 'S'],
    ['Vision Express', /\bvision express\b/i, '#b5121b', 'health', 'VE'],
    ['Lloyds Pharmacy', /\blloyds ?pharm/i, '#00736b', 'health', 'L'],
    ['NHS', /\bnhs\b/i, '#005eb8', 'health', 'NHS'],
    ['Holland & Barrett', /\bholland ?(&|and) ?barrett\b/i, '#00573f', 'health', 'H&B'],
    ['Headspace', /\bheadspace\b/i, '#b35210', 'health'],
    ['Boots', /\bboots\b/i, '#05054b', 'personal-care'],
    ['Superdrug', /\bsuperdrug\b/i, '#c2006b', 'personal-care'],
    ['Lush', /\blush\b/i, '#1d1d1b', 'personal-care'],
    // fitness
    ['PureGym', /\bpure ?gym\b/i, '#00818c', 'fitness', 'P'],
    ['The Gym Group', /\bthe gym\b|\bgym group\b/i, '#1d1d1b', 'fitness', 'G'],
    ['David Lloyd', /\bdavid lloyd\b/i, '#002b49', 'fitness', 'DL'],
    ['Nuffield Health', /\bnuffield\b/i, '#00807a', 'fitness', 'N'],
    ['Anytime Fitness', /\banytime fitness\b/i, '#5e2d91', 'fitness', 'AF'],
    ['Better', /\bbetter (leisure|gym)\b|\bgll\b|^better$/i, '#1f3f8f', 'fitness', 'B'],
    ['Everyone Active', /\beveryone active\b/i, '#c8102e', 'fitness', 'EA'],
    ['Strava', /\bstrava\b/i, '#fc4c02', 'fitness'],
    ['Myprotein', /\bmy ?protein\b/i, '#1d2a44', 'fitness', 'M'],
    ['Gymshark', /\bgymshark\b/i, '#1d1d1b', 'fitness', 'G'],
    ['Decathlon', /\bdecathlon\b/i, '#0074ad', 'fitness'],
    // subscriptions, digital, gaming
    ['Netflix', /\bnetflix\b/i, '#d10812', 'subscriptions'],
    ['Spotify', /\bspotify\b/i, '#1db954', 'subscriptions'],
    ['Amazon Prime', /\bamazon ?prime\b|\bamzn ?prime\b|\bprime ?video\b/i, '#0073a8', 'subscriptions', 'P'],
    ['Disney+', /\bdisney\b/i, '#113ccf', 'subscriptions', 'D+'],
    ['YouTube', /\byoutube\b/i, '#d00000', 'subscriptions', 'Y'],
    ['Apple Store', /\bapple (store|online|retail)\b/i, '#1d1d1f', 'shopping', 'A'],
    ['Apple', /\bapple (com )?bill\b|\bapple com\b|\bitunes\b|\bicloud\b|\bapple services\b|^apple$/i, '#1d1d1f', 'subscriptions', 'A'],
    ['Google Play', /\bgoogle ?play\b/i, '#01875f', 'subscriptions', 'G'],
    ['Google', /\bgoogle\b/i, '#1a73e8', 'subscriptions', 'G'],
    ['NOW', /\bnow ?tv\b|^now$/i, '#0f1f3d', 'subscriptions', 'N'],
    ['Paramount+', /\bparamount\b/i, '#0050e0', 'subscriptions', 'P+'],
    ['Audible', /\baudible\b/i, '#f7991c', 'subscriptions'],
    ['Kindle', /\bkindle\b/i, '#1d1d1b', 'education', 'K'],
    ['OpenAI', /\bopenai\b|\bchatgpt\b/i, '#0b7a60', 'subscriptions', 'O'],
    ['Anthropic', /\banthropic\b|\bclaude ai\b/i, '#b4553a', 'subscriptions', 'A'],
    ['Xbox', /\bxbox\b|\bgame pass\b/i, '#107c10', 'gaming', 'X'],
    ['Microsoft', /\bmicrosoft\b|\bmsft\b/i, '#0067b8', 'subscriptions', 'M'],
    ['Adobe', /\badobe\b/i, '#c8102e', 'subscriptions'],
    ['Patreon', /\bpatreon\b/i, '#d42a36', 'subscriptions'],
    ['Duolingo', /\bduolingo\b/i, '#58cc02', 'education'],
    ['Notion', /\bnotion\b/i, '#1d1d1b', 'subscriptions'],
    ['GitHub', /\bgithub\b/i, '#24292f', 'subscriptions', 'GH'],
    ['Dropbox', /\bdropbox\b/i, '#0057e5', 'subscriptions'],
    ['LinkedIn', /\blinkedin\b/i, '#0a66c2', 'subscriptions', 'in'],
    ['Substack', /\bsubstack\b/i, '#ff6719', 'subscriptions'],
    ['Canva', /\bcanva\b/i, '#00838f', 'subscriptions'],
    ['The Guardian', /\bguardian\b/i, '#052962', 'education', 'G'],
    ['Udemy', /\budemy\b/i, '#8710d8', 'education'],
    ['Coursera', /\bcoursera\b/i, '#0056d2', 'education'],
    ['PlayStation', /\bplaystation\b|\bsony interactive\b|\bpsn\b/i, '#003791', 'gaming', 'PS'],
    ['Nintendo', /\bnintendo\b/i, '#d10010', 'gaming', 'N'],
    ['Steam', /\bsteam(games|powered)?\b|\bvalve\b/i, '#1b2838', 'gaming', 'S'],
    ['Epic Games', /\bepic games\b/i, '#2a2a2a', 'gaming', 'E'],
    ['Twitch', /\btwitch\b/i, '#7c3aed', 'entertainment'],
    // shopping and home
    ['Amazon', /\bamazon\b|\bamzn\b|\bamznmktplace\b|\bamazon ?mktplace\b/i, '#ff9900', 'shopping', 'A'],
    ['eBay', /\bebay\b/i, '#d4202b', 'shopping', 'e'],
    ['Argos', /\bargos\b/i, '#c41e1a', 'shopping'],
    ['ASOS', /\basos\b/i, '#2d2d2d', 'shopping'],
    ['John Lewis', /\bjohn lewis\b/i, '#1d1d1b', 'shopping', 'JL'],
    ['IKEA', /\bikea\b/i, '#0058a3', 'home', 'I', '#ffdb00'],
    ['Primark', /\bprimark\b/i, '#0077ad', 'shopping'],
    ['Next', /^next( retail| plc| directory| online)?$|\bnext retail\b|\bnext directory\b/i, '#1d1d1b', 'shopping', 'N'],
    ['H&M', /\bh ?& ?m\b|\bh and m\b|\bhennes\b/i, '#d1000e', 'shopping', 'H&M'],
    ['Zara', /\bzara\b/i, '#1d1d1b', 'shopping'],
    ['Uniqlo', /\buniqlo\b/i, '#d10010', 'shopping', 'U'],
    ['Currys', /\bcurrys\b/i, '#6c2c91', 'shopping'],
    ['JD Sports', /\bjd sports\b|^jd$/i, '#1d1d1b', 'shopping', 'JD'],
    ['Sports Direct', /\bsports ?direct\b/i, '#0033a0', 'shopping', 'SD'],
    ['TK Maxx', /\btk ?maxx\b/i, '#b5121b', 'shopping', 'TK'],
    ['B&Q', /\bb ?& ?q\b|\bb and q\b/i, '#f37321', 'home', 'B&Q'],
    ['Wickes', /\bwickes\b/i, '#0b4ea2', 'home'],
    ['Screwfix', /\bscrewfix\b/i, '#0a3d91', 'home'],
    ['Homebase', /\bhomebase\b/i, '#b35210', 'home'],
    ['Dunelm', /\bdunelm\b/i, '#1d1d1b', 'home'],
    ['Wilko', /\bwilko\b/i, '#b5121b', 'home'],
    ['The Range', /\bthe range\b/i, '#1d4f91', 'home', 'R'],
    ['Poundland', /\bpoundland\b/i, '#00703c', 'shopping'],
    ['B&M', /\bb ?& ?m\b|\bb and m\b/i, '#2b2a6b', 'shopping', 'B&M'],
    ['Home Bargains', /\bhome bargains\b/i, '#b5121b', 'shopping', 'HB'],
    ['WHSmith', /\bw ?h ?smith\b/i, '#0e2d6e', 'shopping', 'WH'],
    ['Waterstones', /\bwaterstones\b/i, '#1d1d1b', 'education', 'W'],
    ['Vinted', /\bvinted\b/i, '#007782', 'shopping'],
    ['Depop', /\bdepop\b/i, '#c8102e', 'shopping'],
    ['SHEIN', /\bshein\b/i, '#1d1d1b', 'shopping', 'S'],
    ['Temu', /\btemu\b/i, '#e86b00', 'shopping'],
    ['AliExpress', /\baliexpress\b/i, '#c8102e', 'shopping'],
    ['Etsy', /\betsy\b/i, '#f1641e', 'shopping'],
    ['Selfridges', /\bselfridges\b/i, '#ffe500', 'shopping'],
    ['New Look', /\bnew look\b/i, '#1d1d1b', 'shopping', 'NL'],
    ['River Island', /\briver island\b/i, '#1d1d1b', 'shopping', 'RI'],
    ['Matalan', /\bmatalan\b/i, '#00205b', 'shopping'],
    ['Card Factory', /\bcard ?factory\b/i, '#b0005f', 'gifts', 'CF'],
    ['Moonpig', /\bmoonpig\b/i, '#c2006b', 'gifts'],
    ['Smyths', /\bsmyths\b/i, '#003da5', 'gifts'],
    ['Pets at Home', /\bpets at home\b/i, '#00703c', 'pets', 'P'],
    ['Post Office', /\bpost office\b/i, '#c41e1a', 'shopping', 'PO'],
    ['Royal Mail', /\broyal mail\b/i, '#c41e1a', 'shopping', 'RM'],
    ['Evri', /\bevri\b|\bhermes\b/i, '#0067a5', 'shopping'],
    ['DPD', /\bdpd\b/i, '#c8102e', 'shopping', 'DPD'],
    ['PayPal', /\bpaypal\b/i, '#003087', 'shopping', 'P'],
    ['Klarna', /\bklarna\b/i, '#ffb3c7', 'debt', 'K'],
    ['Clearpay', /\bclearpay\b/i, '#b2fce4', 'debt', 'C'],
    // travel
    ['Ryanair', /\bryanair\b/i, '#073590', 'travel', 'R', '#f1c933'],
    ['easyJet', /\beasy ?jet\b/i, '#ff6600', 'travel', 'e'],
    ['British Airways', /\bbritish airways\b|\bbritish a ?w\b|\bba com\b/i, '#075aaa', 'travel', 'BA'],
    ['Jet2', /\bjet ?2\b/i, '#c8001a', 'travel', 'J2'],
    ['Wizz Air', /\bwizz\b/i, '#c6007e', 'travel', 'W'],
    ['Virgin Atlantic', /\bvirgin atlantic\b/i, '#b5121b', 'travel', 'VA'],
    ['Emirates', /\bemirates\b/i, '#c8102e', 'travel'],
    ['Qatar Airways', /\bqatar\b/i, '#5c0632', 'travel', 'Q'],
    ['Turkish Airlines', /\bturkish airlines\b/i, '#c70a0c', 'travel', 'TK'],
    ['KLM', /\bklm\b/i, '#00a1de', 'travel', 'KLM'],
    ['Lufthansa', /\blufthansa\b/i, '#05164d', 'travel', 'L', '#f9b000'],
    ['Booking.com', /\bbooking com\b/i, '#003580', 'travel', 'B'],
    ['Airbnb', /\bairbnb\b/i, '#e61e4d', 'travel'],
    ['Expedia', /\bexpedia\b/i, '#1d3b8f', 'travel'],
    ['Hotels.com', /\bhotels com\b/i, '#c62828', 'travel', 'H'],
    ['Premier Inn', /\bpremier inn\b/i, '#4b1f6f', 'travel', 'PI'],
    ['Travelodge', /\btravelodge\b/i, '#005ea8', 'travel', 'T'],
    ['Holiday Inn', /\bholiday inn\b/i, '#007a53', 'travel', 'HI'],
    ['Hilton', /\bhilton\b/i, '#104c97', 'travel'],
    ['Skyscanner', /\bskyscanner\b/i, '#0062e3', 'travel'],
    ['Heathrow', /\bheathrow\b/i, '#4b0f6b', 'travel'],
    ['Gatwick', /\bgatwick\b/i, '#00205b', 'travel'],
    // entertainment
    ['Odeon', /\bodeon\b/i, '#003da5', 'entertainment'],
    ['Vue', /\bvue\b/i, '#1d1d1b', 'entertainment'],
    ['Cineworld', /\bcineworld\b/i, '#9b0d33', 'entertainment'],
    ['Picturehouse', /\bpicturehouse\b/i, '#1d1d1b', 'entertainment'],
    ['Everyman', /\beveryman\b/i, '#1d1d1b', 'entertainment'],
    ['Ticketmaster', /\bticketmaster\b/i, '#026cdf', 'entertainment', 'T'],
    ['See Tickets', /\bsee tickets\b/i, '#1d1d1b', 'entertainment', 'S'],
    ['DICE', /\bdice fm\b|^dice$/i, '#1d1d1b', 'entertainment', 'D'],
    ['Eventbrite', /\beventbrite\b/i, '#d1410c', 'entertainment'],
    ['Skiddle', /\bskiddle\b/i, '#1d1d1b', 'entertainment'],
    ['Hollywood Bowl', /\bhollywood bowl\b/i, '#5a2d82', 'entertainment', 'HB'],
    ['National Trust', /\bnational trust\b/i, '#3c6e47', 'entertainment', 'NT'],
    // banks, money, savings, debt, tax, charity
    ['Barclaycard', /\bbarclaycard\b/i, '#00395d', 'debt', 'B'],
    ['Barclays', /\bbarclays\b/i, '#0076b6', 'transfers', 'B'],
    ['HSBC', /\bhsbc\b/i, '#c8000f', 'transfers', 'H'],
    ['Lloyds Bank', /\blloyds\b/i, '#006a4d', 'transfers', 'L'],
    ['NatWest', /\bnat ?west\b/i, '#5a287d', 'transfers', 'N'],
    ['Santander', /\bsantander\b/i, '#c80000', 'transfers', 'S'],
    ['Nationwide', /\bnationwide\b/i, '#003366', 'transfers', 'N'],
    ['Halifax', /\bhalifax\b/i, '#005eb8', 'transfers', 'H'],
    ['TSB', /\btsb\b/i, '#1d3b8f', 'transfers', 'TSB'],
    ['Monzo', /\bmonzo\b/i, '#14233c', 'transfers', 'M', '#ff7a6d'],
    ['Revolut', /\brevolut\b/i, '#191c1f', 'transfers', 'R'],
    ['Starling', /\bstarling\b/i, '#5b2fc0', 'transfers', 'S'],
    ['Chase', /\bchase\b/i, '#117aca', 'transfers', 'C'],
    ['American Express', /\bamerican express\b|\bamex\b/i, '#006fcf', 'debt', 'AE'],
    ['Wise', /^wise( payments)?\b|\btransferwise\b/i, '#9fe870', 'transfers', 'W', '#163300'],
    ['Trading 212', /\btrading ?212\b/i, '#0c5bd6', 'savings', 'T'],
    ['Vanguard', /\bvanguard\b/i, '#96151d', 'savings', 'V'],
    ['Freetrade', /\bfreetrade\b/i, '#1d1d1b', 'savings', 'F'],
    ['Hargreaves Lansdown', /\bhargreaves lansdown\b/i, '#003e7e', 'savings', 'HL'],
    ['Moneybox', /\bmoneybox\b/i, '#1d3b8f', 'savings', 'M'],
    ['NS&I', /\bns ?& ?i\b|\bnsandi\b|\bpremium bonds\b/i, '#7b2d84', 'savings', 'NS'],
    ['Coinbase', /\bcoinbase\b/i, '#0052ff', 'savings', 'C'],
    ['Kraken', /\bkraken\b/i, '#5741d9', 'savings', 'K'],
    ['Binance', /\bbinance\b/i, '#f3ba2f', 'savings', 'B'],
    ['HMRC', /\bhmrc\b|\bhm revenue\b/i, '#00703c', 'tax', 'HM'],
    ['Student Loans Company', /\bstudent loans? co|\bslc\b/i, '#1d4f91', 'debt', 'SLC'],
    ['Cancer Research UK', /\bcancer research\b/i, '#2e008b', 'gifts', 'CR'],
    ['British Red Cross', /\bred cross\b/i, '#c8102e', 'gifts', 'RC'],
    ['Oxfam', /\boxfam\b/i, '#3a7d22', 'gifts'],
    ['JustGiving', /\bjust ?giving\b/i, '#8a1f99', 'gifts', 'J'],
    ['GoFundMe', /\bgo ?fund ?me\b/i, '#00804a', 'gifts', 'G'],
    ['British Heart Foundation', /\bbritish heart\b|\bbhf\b/i, '#c8102e', 'gifts', 'BHF'],
  ];

  /* Card processors and wallets that put their name in front of the shop's. */
  const PROCESSOR = /^(?:SQ|SUMUP|SUM UP|SMP|ZETTLE|ZTL|IZ|IZETTLE|PAYPAL|PP|CRV|CURVE|TZP|SP|WL|TST|CKO|PADDLE|PADDLE NET|FS|DNH|GOCARDLESS|STRIPE|STR|LS|YOYO|HANDEPAY|DOJO|PAYZONE|EPOS|SAGEPAY|OPAYO|WORLDPAY|ICP|NYX|VIRGIN WALLET|APPLE PAY|GOOGLE PAY|GPAY)\s*[*_#]\s*/i;
  const TRAILER = /\s+ON\s+\d{1,2}\s+[A-Z]{3}(\s+\d{2,4})?\b.*$/i;
  // Bank type codes at the end of a memo. Ones that are also ordinary words (So, Dr, Bp...) only go when written in capitals.
  const CODE_SET = new Set(['BCC', 'CPM', 'CLP', 'BGC', 'DDR', 'DD', 'STO', 'SO', 'FPI', 'FPO', 'FT', 'TFR', 'BP', 'CPT', 'POS', 'VIS', 'DEB', 'CHG', 'ATM', 'CRE', 'CR', 'DR']);
  const SAFE_CODES = new Set(['BCC', 'CPM', 'CLP', 'BGC', 'DDR', 'FPI', 'FPO', 'TFR', 'CPT', 'FT', 'STO', 'ATM', 'CRE']);
  const LEGAL = new Set(['LTD', 'LIMITED', 'PLC', 'LLP', 'INC', 'CORP', 'GB', 'GBR', 'UK']);
  const DOMAIN = /^(?:www\.)?(.+?)\.(?:co\.uk|org\.uk|ac\.uk|com|net|org|io|uk|co|app|ai)$/i;

  /** The cleaned name: processor prefix, card trailer, codes and store numbers gone. -> {match (upper, for patterns), display} */
  function _clean(name) {
    let s = String(name == null ? '' : name).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim();
    for (let i = 0; i < 2; i++) {
      const m = PROCESSOR.exec(s);
      if (!m || !s.slice(m[0].length).trim()) break;
      s = s.slice(m[0].length);
    }
    s = s.replace(TRAILER, '');
    for (let i = 0; i < 2; i++) {
      const m = /\s+([A-Za-z]{2,3})$/.exec(s);
      const up = m && m[1].toUpperCase();
      if (!m || !CODE_SET.has(up) || (m[1] !== up && !SAFE_CODES.has(up))) break;
      s = s.slice(0, m.index);
    }
    // Punctuation becomes a space (keeping & and the apostrophe), so "BOOKING.COM" is "BOOKING COM".
    const match = s.toUpperCase().replace(/[^A-Z0-9&' ]+/g, ' ').replace(/\s+/g, ' ').trim();
    let toks = s.replace(/[^\p{L}\p{N}&'.\- ]+/gu, ' ').split(' ')
      .map(t => t.replace(/^[.\-']+|[.\-]+$/g, '')).filter(Boolean)
      .map(t => { const d = DOMAIN.exec(t); return d && d[1].length >= 2 ? d[1] : t; });
    while (toks.length > 1) {
      const last = toks[toks.length - 1], up = last.toUpperCase();
      const code = /\d/.test(last) && /[a-z]/i.test(last) && last.length >= 5 && (last.match(/\d/g) || []).length >= 2;
      if (LEGAL.has(up) || /^\d{4,}$/.test(last) || code) toks.pop();
      else break;
    }
    return { match, display: toks.join(' ') };
  }
  const SMALL = new Set(['of', 'for', 'and', 'the', 'at', 'in', 'on', 'by', 'to', 'de', 'la', 'le', 'du', 'da', 'del', 'a']);
  /** Display case for an ALL-CAPS (or all lower-case) name; mixed-case names keep their case. */
  function smartTitle(s) {
    if (/[a-z]/.test(s) && /[A-Z]/.test(s)) return s;
    return s.toUpperCase().split(' ').map((w, i) => {
      if (/&/.test(w) || (/^[A-Z]{2,3}$/.test(w) && !/[AEIOUY]/.test(w))) return w;
      const lw = w.toLowerCase();
      if (i > 0 && SMALL.has(lw)) return lw;
      return (lw.charAt(0).toUpperCase() + lw.slice(1))
        .replace(/-([a-z])/g, (m, b) => '-' + b.toUpperCase())
        .replace(/^(O')([a-z])/, (m, a, b) => a + b.toUpperCase()).replace(/^(Mc)([a-z])/, (m, a, b) => a + b.toUpperCase());
    }).join(' ');
  }
  const PERSON_CATS = /^(payments? to people|friends ?(&|and) ?family|people)$/i;
  const _infoCache = new Map();
  /** Everything about a merchant name (pure, cached). */
  function merchantInfo(name, category) {
    const person = PERSON_CATS.test(_norm(category));
    const ck = (person ? 'p|' : 'm|') + String(name == null ? '' : name);
    if (_infoCache.has(ck)) return _infoCache.get(ck);
    const cl = _clean(name);
    let hit = null;
    // A payment to a person is never a brand ("Leon Smith" is not a café).
    if (!person && cl.match) for (const e of MERCHANTS) if (e[1].test(cl.match)) { hit = e; break; }
    let info;
    if (hit) {
      const [n, , color, scene, mono, ink] = hit;
      info = { name: n, key: n.toLowerCase(), known: true, color, ink: ink || inkFor(color), mono: mono || _firstChar(n), scene };
    } else {
      const disp = smartTitle(cl.display || String(name == null ? '' : name).trim()) || 'Unknown';
      const key = disp.toLowerCase();
      const color = hashColor(key);
      info = { name: disp, key, known: false, color, ink: INK_LIGHT, mono: _monogram(disp, person), scene: null };
    }
    if (_infoCache.size > 5000) _infoCache.clear();
    _infoCache.set(ck, info);
    return info;
  }
  function _firstChar(s) { const m = /[\p{L}\p{N}]/u.exec(String(s)); return m ? m[0].toUpperCase() : '?'; }
  /** 1-2 letters: a person's initials, a short acronym (JD, NCP, B&M), else the first letter (skipping "The"). */
  function _monogram(disp, person) {
    const words = disp.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w));
    if (!words.length) return '?';
    if (person && words.length >= 2) return (_firstChar(words[0]) + _firstChar(words[words.length - 1]));
    let w = words[0];
    if (words.length > 1 && /^(the|a)$/i.test(w)) w = words[1];
    // An acronym stays whole (JD, NCP), as does a short "X&Y" (B&M).
    if (/^[A-Z0-9]{2,3}$/.test(w) && /[A-Z]/.test(w) && !/[AEIOUY]/.test(w.slice(1))) return w;
    if (/^[A-Z]&[A-Z]$/.test(w)) return w;
    return _firstChar(w);
  }
  const merchantCanonical = (name) => merchantInfo(name).name;
  const merchantKey = (name) => merchantInfo(name).key;
  const merchantColor = (name) => merchantInfo(name).color;
  const merchantMonogram = (name, category) => merchantInfo(name, category).mono;

  /* ---------- transaction types ---------- */
  const TX_KINDS = [
    { kind: 'card', label: 'Card', title: 'Card payment', colour: 'indigo',
      mini: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 9.5h18"/><g class="fx-tx"><path d="M6.5 14.5h4"/></g>' },
    { kind: 'contactless', label: 'Contactless', title: 'Contactless payment', colour: 'teal',
      mini: '<path class="fx-tx" style="--d:0s" d="M6.5 9a4.4 4.4 0 0 1 0 6"/><path class="fx-tx" style="--d:.12s" d="M10.5 6.5a8 8 0 0 1 0 11"/><path class="fx-tx" style="--d:.24s" d="M14.5 4a11.6 11.6 0 0 1 0 16"/><path class="fx-tx" style="--d:.36s" d="M18.5 2.6a14 14 0 0 1 0 18.8"/>' },
    { kind: 'direct-debit', label: 'Direct Debit', title: 'Direct Debit', colour: 'violet',
      mini: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><g class="fx-tx"><path d="M15 13.6a3.1 3.1 0 1 1-1.3-2.3M15.1 10.4v2.7h-2.7"/></g>' },
    { kind: 'standing-order', label: 'Standing order', title: 'Standing order', colour: 'blue',
      mini: '<g class="fx-tx"><path d="M17 3.5l3 3-3 3M4 11.5v-1a4 4 0 0 1 4-4h12M7 20.5l-3-3 3-3M20 12.5v1a4 4 0 0 1-4 4H4"/></g>' },
    { kind: 'transfer-in', label: 'Transfer in', title: 'Money in by bank transfer', colour: 'green',
      mini: '<g class="fx-tx"><path d="M12 3v11M7.5 9.5L12 14l4.5-4.5"/></g><path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"/>' },
    { kind: 'transfer-out', label: 'Transfer out', title: 'Money out by bank transfer', colour: 'orange',
      mini: '<g class="fx-tx"><path d="M12 14V3M7.5 7.5L12 3l4.5 4.5"/></g><path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"/>' },
    { kind: 'income', label: 'Income', title: 'Salary or income', colour: 'green',
      mini: '<rect x="2.5" y="8" width="13" height="9" rx="1.6"/><circle cx="9" cy="12.5" r="1.9"/><g class="fx-tx"><path d="M19.5 20V6M16.5 9l3-3 3 3"/></g>' },
    { kind: 'refund', label: 'Refund', title: 'Refund', colour: 'teal',
      mini: '<g class="fx-tx"><path d="M9 14L4.5 9.5 9 5M4.5 9.5H15a5 5 0 0 1 0 10h-3"/></g>' },
    { kind: 'atm', label: 'Cash', title: 'Cash machine withdrawal', colour: 'amber',
      mini: '<rect x="3" y="3.5" width="18" height="7" rx="2"/><path d="M6.5 7h11"/><g class="fx-tx"><rect x="7.5" y="9.5" width="9" height="11" rx="1.2"/><circle cx="12" cy="15" r="1.6"/></g>' },
    { kind: 'subscription', label: 'Subscription', title: 'Recurring subscription', colour: 'pink',
      mini: '<g class="fx-tx"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4.4h-4.4"/></g><path class="f" d="M10.4 9.4l4.4 2.6-4.4 2.6z"/>' },
    { kind: 'fee', label: 'Fee', title: 'Bank fee or charge', colour: 'red',
      mini: '<g class="fx-tx"><path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5z"/><path d="M9 8h6M9 12h6M9 16h3"/></g>' },
    { kind: 'interest', label: 'Interest', title: 'Interest', colour: 'amber',
      mini: '<circle cx="12" cy="12" r="9"/><g class="fx-tx"><path d="M9 15l6-6"/><circle class="f" cx="9.3" cy="9.3" r="1.2"/><circle class="f" cx="14.7" cy="14.7" r="1.2"/></g>' },
    { kind: 'own-transfer', label: 'Between accounts', title: 'Between your own accounts', colour: 'slate',
      mini: '<g class="fx-tx"><path d="M4 8h14.5M15 4.5L18.5 8 15 11.5"/></g><g class="fx-tx2"><path d="M20 16H5.5M9 12.5L5.5 16 9 19.5"/></g>' },
    { kind: 'payment', label: 'Payment', title: 'Payment', colour: 'slate',
      mini: '<circle cx="12" cy="12" r="9"/><g class="fx-tx"><path d="M9 15l6-6M10 9h5v5"/></g>' },
  ];
  const _KIND = new Map(TX_KINDS.map(k => [k.kind, k]));
  const CH_CODE = { CPM: 'contactless', CLP: 'contactless', CTLS: 'contactless', BCC: 'card', DEB: 'card', VIS: 'card', POS: 'card', CARD: 'card', DDR: 'dd', DD: 'dd', STO: 'so', SO: 'so', FT: 'transfer', FPI: 'transfer', FPO: 'transfer', TFR: 'transfer', BP: 'transfer', BGC: 'credit', CRE: 'cardcredit', ATM: 'atm', CPT: 'atm', CHG: 'fee', INT: 'interest' };
  const RX = {
    atm: /\bATM\b|CASH ?WITHDRAWAL|CASHPOINT|CASH MACHINE/,
    own: /\b(TO|FROM) (MY )?(SAVINGS|ISA|CURRENT|JOINT|POT|RESERVE|SAVER)\b|SAVINGS TRANSFER|ISA TRANSFER|OWN ACCOUNT|BETWEEN ACCOUNTS|POT TRANSFER|INTERNAL TRANSFER/,
    interest: /\bINTEREST\b|\bGROSS INT\b/,
    fee: /NON-?STERLING|FOREIGN (TRANSACTION |EXCHANGE )?FEE|OVERDRAFT|ARRANGED OD|UNARRANGED|ACCOUNT FEE|MONTHLY FEE|\bFEES?\b|COMMISSION|\bBANK CHARGES?\b/,
    refund: /REFUND|\bRETURN(ED|S)?\b|REVERSAL|REVERSED|CHARGEBACK|CASHBACK|\bRFND\b/,
    salary: /SALARY|PAYROLL|\bWAGES?\b|\bPAYE\b|\bPENSION\b|\bBONUS\b|\bSTIPEND\b|\bBURSARY\b/,
    dd: /DIRECT DEBIT|\bD\/D\b/,
    so: /STANDING ORDER|\bS\/O\b/,
    transfer: /FASTER PAYMENT|BANK TRANSFER|\bFPS\b|\bBACS\b|BILL PAYMENT|\bTRANSFER\b/,
    contactless: /CONTACTLESS|^\)\)\)|APPLE ?PAY|GOOGLE ?PAY/,
    card: /CARD PAYMENT|\bON \d{1,2} [A-Z]{3}\b/,
  };
  const BC_SETS = {
    income: new Set(['salary', 'bonus_commission', 'self_employment', 'dividends', 'rental_income', 'pension_income', 'benefits', 'other_income', 'gifts_received', 'cashback_rewards']),
    interest: new Set(['interest_earned', 'interest_charges']),
    own: new Set(['internal_transfer', 'credit_card_repayment', 'savings', 'investments', 'pension_contributions']),
    people: new Set(['personal_transfer', 'family_support']),
  };
  const CAT_RX = {
    own: /^(internal transfers?|transfers? between accounts|savings( (&|and) investments)?|investments?)$/,
    people: /^(payments? to people|friends ?(&|and) ?family)$/,
    subs: /^subscriptions?$/,
    cash: /^cash$/,
    fees: /^(fees?( (&|and) interest)?|bank (fees|charges)|charges)$/,
    income: /^(income|salary|wages)$/,
  };
  function _channel(memo, type) {
    const last = (memo.match(/(?:^|\s)([A-Z]{2,4})$/) || [])[1];
    if (last && CH_CODE[last]) return CH_CODE[last];
    const t = String(type || '').toUpperCase().trim();
    if (t && CH_CODE[t]) return CH_CODE[t];
    if (/DIRECT DEBIT/.test(t)) return 'dd';
    if (/STANDING ORDER/.test(t)) return 'so';
    if (RX.dd.test(memo)) return 'dd';
    if (RX.so.test(memo)) return 'so';
    if (RX.atm.test(memo)) return 'atm';
    if (RX.contactless.test(memo)) return 'contactless';
    if (RX.transfer.test(memo) || /TRANSFER|FASTER/.test(t)) return 'transfer';
    if (RX.card.test(memo) || /CARD|DEBIT/.test(t)) return 'card';
    return null;
  }
  // opts.recurring: a Set of merchant keys, or names / analysis.recurring rows (turned into keys once per array).
  const _recKeys = new WeakMap();
  function _recurringHas(rec, name) {
    if (!rec || !name) return false;
    const k = merchantKey(name);
    if (rec instanceof Set) return rec.has(k) || rec.has(name);
    if (!Array.isArray(rec)) return false;
    if (!_recKeys.has(rec)) _recKeys.set(rec, new Set(rec.map(r => merchantKey(typeof r === 'string' ? r : (r && (r.merchant || r.m)) || ''))));
    return _recKeys.get(rec).has(k);
  }
  /**
   * How the money moved, from the fields the analysis keeps per transaction
   * (lib/finance/analyse.mjs): a (signed amount), memo (the bank's text, with
   * Barclays-style codes such as CPM/BCC/DDR/FT/BGC/ATM at the end), bc (the
   * bank's category id), c (our category), how (override|rule|bank|default|
   * unmatched|own-transfer), m (merchant). opts.recurring: merchant names (or
   * analysis.recurring) that make a card payment a subscription.
   */
  function txKind(tx, opts) {
    tx = tx || {}; opts = opts || {};
    const a = Number(tx.a != null ? tx.a : tx.amount) || 0;
    const inflow = a > 0;
    const memo = String(tx.memo || '').normalize('NFKD').toUpperCase().replace(/\s+/g, ' ').trim();
    const bc = String(tx.bc || '').toLowerCase().trim();
    const c = _norm(tx.c != null ? tx.c : tx.category);
    const how = String(tx.how || '').toLowerCase();
    const ch = _channel(memo, tx.type || tx.sub || tx.subcategory);

    if (ch === 'atm' || bc === 'cash_withdrawal' || (CAT_RX.cash.test(c) && !inflow)) return inflow ? 'transfer-in' : 'atm';
    if (how === 'own-transfer' || BC_SETS.own.has(bc) || CAT_RX.own.test(c) || RX.own.test(memo)) return 'own-transfer';
    if (BC_SETS.interest.has(bc) || ch === 'interest' || c === 'interest' || (RX.interest.test(memo) && (!c || /^(income|fees.*|bank.*|uncategori[sz]ed|other)$/.test(c)))) return 'interest';
    if (bc === 'bank_fees' || ch === 'fee' || CAT_RX.fees.test(c) || (RX.fee.test(memo) && (!c || /^(fees.*|bank.*|uncategori[sz]ed|other)$/.test(c)))) return inflow ? 'refund' : 'fee';
    if (inflow) {
      if (RX.refund.test(memo)) return 'refund';
      if (BC_SETS.income.has(bc) || RX.salary.test(memo) || ch === 'credit') return 'income';
      if (ch === 'transfer' || BC_SETS.people.has(bc) || CAT_RX.people.test(c)) return 'transfer-in';
      if (ch === 'card' || ch === 'contactless' || ch === 'cardcredit') return 'refund';
      if (CAT_RX.income.test(c)) return 'income';
      return c && c !== 'uncategorised' && c !== 'uncategorized' ? 'refund' : 'transfer-in';
    }
    if (ch === 'dd') return 'direct-debit';
    if (ch === 'so') return 'standing-order';
    if ((bc === 'streaming_digital' || CAT_RX.subs.test(c) || _recurringHas(opts.recurring, tx.m)) && ch !== 'transfer') return 'subscription';
    if (ch === 'transfer' || BC_SETS.people.has(bc) || CAT_RX.people.test(c)) return 'transfer-out';
    if (ch === 'contactless') return 'contactless';
    if (ch === 'card' || ch === 'cardcredit') return 'card';
    return 'payment';
  }
  const txKindInfo = (kind) => { const k = _KIND.get(kind) || _KIND.get('payment'); return { kind: k.kind, label: k.label, title: k.title, colour: k.colour }; };

  /* ---------- markup ---------- */
  function _cls(base, o) {
    const out = [base];
    if (o && o.cls) out.push(String(o.cls).replace(/[^a-zA-Z0-9 _-]/g, ''));
    return out.join(' ');
  }
  /**
   * A merchant tile: brand-ish colour, monogram, category badge.
   * o: {size xs|sm|md|lg|xl (md), live: 'hover' (default) | false, enter: pop in once (o.i = stagger index),
   *     badge (default: not at xs), label (true = the name, or a string; default decorative), selected, dim, cls}
   */
  function merchantSymbol(name, category, o) {
    o = o || {};
    const info = merchantInfo(name, category);
    const size = sizeOf(o.size, 'md');
    const catScene = category ? categoryScene(category, o.bc) : null;
    // The curated glyph is more specific (coffee rather than eating out) unless the user filed it elsewhere.
    const scene = info.scene && (!catScene || _SCENE.get(info.scene).fam === _SCENE.get(catScene).fam) ? info.scene : (catScene || info.scene || 'other');
    const sc = _SCENE.get(scene) || _SCENE.get('other');
    const badge = o.badge != null ? !!o.badge : size !== 'xs';
    const cls = ['fsym', 'fsym-m', 'sz-' + size];
    if (o.live !== false) cls.push('fsym-hover');
    if (o.enter) cls.push('fsym-enter');
    if (o.selected) cls.push('is-selected');
    if (o.dim) cls.push('is-dim');
    const label = o.label === true ? info.name + (category ? ', ' + category : '') : (typeof o.label === 'string' ? o.label : '');
    const a11y = label ? ` role="img" aria-label="${esc(label)}"` : ' aria-hidden="true"';
    const style = `--mc:${info.color};--mi:${info.ink}` + (o.i != null ? `;--i:${Math.max(0, Math.min(40, Number(o.i) || 0))}` : '');
    return `<span class="${_cls(cls.join(' '), o)}" style="${style}" data-mkey="${esc(info.key)}"${a11y}>`
      + `<span class="fsym-face"><span class="fsym-mono" data-n="${[...info.mono].length}">${esc(info.mono)}</span></span>`
      + (badge ? `<span class="fsym-badge c-${sc.colour}">${miniSvg(scene)}</span>` : '') + '</span>';
  }
  /**
   * An animated category icon. o: {size (md), live: 'hover' (default: moves while it or a .fsym-host
   * row is hovered) | 'loop' (always, see activate) | 'once' (plays on insertion) | false,
   * label (true = the category, or a string), color (CSS colour, e.g. the chart's), bc, plain (no tile), cls}
   */
  function categoryIcon(category, o) {
    o = o || {};
    const key = o.scene && _SCENE.has(o.scene) ? o.scene : categoryScene(category, o.bc);
    const sc = _SCENE.get(key);
    const live = o.live == null ? 'hover' : o.live;
    const cls = ['fsym', 'fsym-cat', 'c-' + sc.colour, 'sz-' + sizeOf(o.size, 'md')];
    if (live === 'hover') cls.push('fsym-hover');
    else if (live === 'loop') cls.push('fsym-loop', 'is-live');
    else if (live === 'once') cls.push('is-live', 'is-once');
    if (o.plain) cls.push('is-plain');
    if (o.selected) cls.push('is-selected');
    if (o.dim) cls.push('is-dim');
    const col = safeCssColor(o.color);
    const label = o.label === true ? String(category || sc.label) : (typeof o.label === 'string' ? o.label : '');
    const a11y = label ? ` role="img" aria-label="${esc(label)}"` : ' aria-hidden="true"';
    return `<span class="${_cls(cls.join(' '), o)}"${col ? ` style="--c:${col}"` : ''} data-scene="${key}"${a11y}>${sceneSvg(key)}</span>`;
  }
  /** The scene's small line glyph alone (inherits currentColor). */
  const categoryGlyph = (category, o) => miniSvg(o && o.scene && _SCENE.has(o.scene) ? o.scene : categoryScene(category, o && o.bc), o && o.cls);
  /**
   * A transaction-type pill. kindOrTx: a kind ('contactless') or a transaction (classified with txKind).
   * o: {compact (icon only, labelled), size sm|md|lg, label (override text), recurring, cls}
   */
  function txTypeBadge(kindOrTx, o) {
    o = o || {};
    const kind = typeof kindOrTx === 'string' ? (_KIND.has(kindOrTx) ? kindOrTx : 'payment') : txKind(kindOrTx, o);
    const k = _KIND.get(kind);
    const text = typeof o.label === 'string' && o.label ? o.label : k.label;
    const cls = ['fsym', 'fsym-tx', 'k-' + kind, 'c-' + k.colour, 'sz-' + sizeOf(o.size, 'md')];
    if (o.compact) cls.push('is-compact');
    const svg = `<svg class="fsym-mini" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${k.mini}</svg>`;
    return o.compact
      ? `<span class="${_cls(cls.join(' '), o)}" role="img" aria-label="${esc(k.title)}" title="${esc(k.title)}" data-kind="${kind}">${svg}</span>`
      : `<span class="${_cls(cls.join(' '), o)}" title="${esc(k.title)}" data-kind="${kind}">${svg}<span class="fsym-tx-l">${esc(text)}</span></span>`;
  }

  /* ---------- runtime: only the looping icons on screen run, at most `max` ---------- */
  let _io = null;
  const _seen = new Set();
  let _max = 12;
  function activate(scope, o) {
    if (!scope || typeof scope.querySelectorAll !== 'function') return;
    _max = (o && o.max) || _max;
    const els = [...scope.querySelectorAll('.fsym-loop')];
    if (typeof IntersectionObserver === 'undefined') { els.forEach((e, i) => e.classList.toggle('is-live', i < _max)); return; }
    if (!_io) _io = new IntersectionObserver((entries) => {
      for (const e of entries) { if (e.isIntersecting) _seen.add(e.target); else { _seen.delete(e.target); e.target.classList.remove('is-live'); } }
      for (const el of [..._seen]) if (!el.isConnected) { _seen.delete(el); try { _io.unobserve(el); } catch (err) { /* gone */ } }
      [..._seen].sort((p, q) => ((p.compareDocumentPosition(q) & 4) ? -1 : 1)).forEach((el, i) => el.classList.toggle('is-live', i < _max));
    }, { threshold: 0.1 });
    els.forEach(e => { e.classList.remove('is-live'); _io.observe(e); });
  }
  if (typeof document !== 'undefined' && document && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', () => { document.documentElement.classList.toggle('fsym-paused', !!document.hidden); });
  }

  const api = {
    version: 1,
    merchantSymbol, merchantCanonical, merchantKey, merchantInfo, merchantColor, merchantMonogram,
    categoryIcon, categoryScene, categoryGlyph, sceneLabel, txTypeBadge, txKind, txKindInfo,
    activate, contrast, inkFor, hashColor,
    scenes: () => SCENES.map(s => ({ key: s.key, label: s.label, fam: s.fam, colour: s.colour })),
    kinds: () => TX_KINDS.map(k => ({ kind: k.kind, label: k.label, title: k.title, colour: k.colour })),
    merchants: () => MERCHANTS.map(e => ({ name: e[0], color: e[2], scene: e[3], mono: e[4] || _firstChar(e[0]), ink: e[5] || inkFor(e[2]) })),
    categoryMap: () => Object.assign({}, CAT_EXACT),
    bankCategoryMap: () => Object.assign({}, BC_SCENE),
    _swatches: SWATCHES,
  };
  root.FinSymbols = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* ---------- debug gallery: #view=fin-symbols (every symbol, light and dark) ---------- */
if (typeof registerSection === 'function') {
  registerSection('fin-symbols', {
    group: 'finance',
    title: () => 'Finance symbols',
    layout: 'wide',
    mount(container) { finSymbolsGallery(container); },
    unmount() { _fsGalleryEntered = false; },
  });
}
let _fsGalleryEntered = false, _fsGalleryLoop = true;
function finSymbolsGallery(container) {
  const FS = window.FinSymbols;
  const e = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const enter = !_fsGalleryEntered; _fsGalleryEntered = true;
  const loop = _fsGalleryLoop;
  const scenes = FS.scenes(), kinds = FS.kinds(), merchants = FS.merchants();
  const catMap = FS.categoryMap();
  const usedBy = (key) => Object.keys(catMap).filter(k => k && catMap[k] === key).slice(0, 4).join(', ');
  const fams = scenes.map(s => s.key).filter(k => merchants.some(m => m.scene === k));
  // Invented examples only (no real transactions here).
  const odd = [['SQ *BLUE DOOR BAKERY', 'Eating out'], ['SumUp *Riverside Deli', 'Eating out'], ['PAYPAL *EBAY', 'Shopping'], ['CRV*TESCO STORES 3345', 'Groceries'],
    ['AMZNMKTPLACE', 'Shopping'], ['AMZN Mktp UK*AB12CD3', 'Shopping'], ['UBER *EATS', 'Eating out'], ['UBER *TRIP HELP.UBER.COM', 'Transport'], ['Transport for London', 'Transport'],
    ['The Corner Bistro', 'Eating out'], ['NORTHWIND LABS LTD', 'Income'], ['Jordan Lee', 'Payments to people'], ['Oak Lane Lettings', 'Housing'], ['Studio 54 Yoga', 'Fitness'], ['www.example-shop.co.uk', 'Shopping']];
  const rows = [
    { m: 'Bean There Coffee', c: 'Eating out', bc: 'coffee_snacks', a: -3.1, memo: 'BEAN THERE COFFEE ON 02 OCT CPM' },
    { m: 'Tesco', c: 'Groceries', bc: 'groceries', a: -42.6, memo: 'TESCO STORES 3345 ON 01 OCT CPM' },
    { m: 'Streamflix', c: 'Subscriptions', bc: 'streaming_digital', a: -10.99, memo: 'STREAMFLIX.COM ON 30 SEP BCC' },
    { m: 'City Power & Water', c: 'Bills & utilities', bc: 'energy', a: -86, memo: 'CITY POWER & WATER DDR' },
    { m: 'Oak Lane Lettings', c: 'Housing', bc: 'rent', a: -1150, memo: 'OAK LANE LETTINGS STO' },
    { m: 'Northwind Labs', c: 'Income', bc: 'salary', a: 3150, memo: 'NORTHWIND LABS SALARY BGC' },
    { m: 'Jordan Lee', c: 'Payments to people', bc: 'personal_transfer', a: -25, memo: 'JORDAN LEE DINNER FT' },
    { m: 'Pixel Electronics', c: 'Shopping', bc: 'electronics', a: 39.99, memo: 'PIXEL ELECTRONICS ON 28 SEP CRE' },
    { m: 'Cash Machine', c: 'Cash', bc: 'cash_withdrawal', a: -40, memo: 'HIGH ST ATM' },
    { m: 'Savings Pot', c: 'Internal transfers', bc: 'savings', a: -200, memo: 'TO SAVINGS FT' },
    { m: 'Bank', c: 'Fees & interest', bc: 'bank_fees', a: -2.99, memo: 'NON-STERLING TRANSACTION FEE' },
    { m: 'Bank', c: 'Income', bc: 'interest_earned', a: 4.12, memo: 'GROSS INTEREST' },
  ];
  const money = (v) => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.currency) || 'GBP' }).format(v); } catch (err) { return v.toFixed(2); } };
  let i = 0;
  container.innerHTML = `<div class="fsg${enter ? ' is-enter' : ''}">
    <header class="fsg-h"><div><p>${merchants.length} merchants, ${scenes.length} category scenes, ${kinds.length} transaction types. Original glyphs and brand-ish colours only (no logos); nothing is fetched. Hover anything.</p></div>
      <label class="fsg-loop"><input type="checkbox"${loop ? ' checked' : ''}> Loop category scenes</label></header>
    <section><h3>Category scenes</h3><div class="fsg-cats">${scenes.map(s => `<figure class="fsg-cat fsym-host">${FS.categoryIcon(s.label, { scene: s.key, size: 'xl', live: loop ? 'loop' : 'hover' })}<figcaption><b>${e(s.label)}</b><span>${e(usedBy(s.key))}</span></figcaption><span class="fsg-mini c-${s.colour}">${FS.categoryGlyph(s.label, { scene: s.key })}</span></figure>`).join('')}</div></section>
    <section><h3>Sizes</h3><div class="fsg-sizes">${['xs', 'sm', 'md', 'lg', 'xl'].map(z => `<div>${FS.merchantSymbol('Tesco', 'Groceries', { size: z })}${FS.merchantSymbol('Bean There Coffee', 'Eating out', { size: z })}${FS.categoryIcon('Travel', { size: z })}<span>${z}</span></div>`).join('')}
      <div>${FS.merchantSymbol('Costa', 'Eating out', { size: 'lg', selected: true })}${FS.merchantSymbol('Greggs', 'Eating out', { size: 'lg', dim: true })}${FS.categoryIcon('Groceries', { size: 'lg', selected: true })}${FS.categoryIcon('Shopping', { size: 'lg', dim: true })}<span>selected / dimmed</span></div></div></section>
    <section><h3>Transaction types</h3><div class="fsg-kinds">${kinds.map(k => `<div class="fsym-host">${FS.txTypeBadge(k.kind, { size: 'lg' })}${FS.txTypeBadge(k.kind)}${FS.txTypeBadge(k.kind, { compact: true })}<span>${e(k.title)}</span></div>`).join('')}</div></section>
    <section><h3>In a list</h3><ul class="fsg-rows">${rows.map(r => `<li class="fsym-host">${FS.merchantSymbol(r.m, r.c, { size: 'md', bc: r.bc, enter, i: i++ })}<span class="fsg-rm"><b>${e(r.m)}</b><span>${FS.categoryIcon(r.c, { size: 'xs', bc: r.bc, plain: true })}${e(r.c)}</span></span>${FS.txTypeBadge(r)}<span class="fsg-ra${r.a > 0 ? ' in' : ''}">${e(money(r.a))}</span></li>`).join('')}</ul></section>
    <section><h3>Cleaning and monograms</h3><ul class="fsg-odd">${odd.map(([n, c]) => `<li>${FS.merchantSymbol(n, c, { size: 'sm' })}<code>${e(n)}</code><span>&rarr;</span><b>${e(FS.merchantCanonical(n))}</b><span class="muted">${e(c)}</span></li>`).join('')}</ul></section>
    <section><h3>Merchants</h3>${fams.map(f => `<h4>${FS.categoryIcon(FS.sceneLabel(f), { scene: f, size: 'sm' })}${e(FS.sceneLabel(f))}</h4><div class="fsg-ms">${merchants.filter(m => m.scene === f).map(m => `<figure class="fsym-host">${FS.merchantSymbol(m.name, null, { size: 'lg', enter, i: Math.min(30, i++) })}<figcaption>${e(m.name)}</figcaption></figure>`).join('')}</div>`).join('')}</section>
  </div>`;
  const cb = container.querySelector('.fsg-loop input');
  if (cb) cb.addEventListener('change', () => { _fsGalleryLoop = cb.checked; finSymbolsGallery(container); });
  FS.activate(container, { max: 40 });
}
