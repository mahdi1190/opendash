#!/usr/bin/env node
// OpenDash brand assets: makes every file in assets/brand/ from one place.
//
//   node tools/release-brand.mjs           the SVGs, then the PNGs, favicon.ico, the
//                                          social preview and the preview sheets
//   node tools/release-brand.mjs --svg     the SVGs only (no browser needed)
//   node tools/release-brand.mjs --check   exit 1 if a committed SVG differs from
//                                          what this script makes (no browser)
//
// The mark's geometry and colours live here (MARK, PALETTE). The wordmark is
// built from the Inter outlines in assets/brand/src/wordmark-glyphs.json, so no
// font is needed to show the logo. PNGs are rendered by headless Chrome,
// Chromium or Edge (set CHROME_PATH if it is somewhere unusual) and have all
// metadata stripped. Node 20+ built-ins only. See assets/brand/BRAND.md.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { stripPng, encodeIco } from './release-png.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const BRAND_DIR = join(ROOT, 'assets', 'brand');
const FONT = join(ROOT, 'vendor', 'fonts', 'InterVariable-latin.woff2');

// ---------------------------------------------------------------- design
// Colours come from the app's tokens (src/styles/00-tokens.css): the tile is
// the indigo accent leaning towards violet, as in the app's sidebar mark; the
// sun is the one warm thing on the page.
export const PALETTE = {
  indigo: '#5b5bd6',            // --accent (light theme)
  indigoInk: '#4343b4',         // --accent-ink
  tile: ['#6767e0', '#7650d4'], // primary tile, top-left to bottom-right
  sun: [[0, '#ffd36b'], [0.6, '#ffa257'], [1, '#ff7a7a']],
  sunOnLight: [[0, '#ffbe3d'], [0.6, '#ff8f45'], [1, '#f2607a']],
  paperTile: ['#ffffff', '#f0efff'],
  paperEdge: ['#5b5bd6', 0.18],
  nightTile: ['#2a2a5c', '#1f1a40'],
  nightEdge: ['#a9a9ff', 0.22],
  ink: '#1b1b1f',               // --fg (light)
  mist: '#ececef',              // --fg (dark)
  paper: '#ffffff',             // --bg (light)
  night: '#141417',             // --bg (dark)
};

// A 64-unit tile: at 16 px one pixel is 4 units, so every straight edge of the
// sun (the cuts) lands on a whole pixel at 16, 32, 48 and 64 px.
export const MARK = {
  size: 64, radius: 14,
  sun: { cx: 32, cy: 32, r: 20 },
  cuts: [[32, 36], [44, 48]],     // the two gaps that turn the sun into dashes
};

export const WORDMARK = { capHeight: 36, tracking: -0.022 }; // tracking in em, as --tracking-tighter
export const LOCKUP = { gap: 18 };                           // mark-to-text gap, in mark units

const n = v => String(Math.round(v * 1000) / 1000);

/** The sun as separate bands (top to bottom): a dome, a dash, a sliver.
 *  hinted: the sliver becomes a straight 16-unit dash (exactly 4 x 1 px at
 *  16 px), which stays crisp in a browser tab; used by favicon.svg only. */
export function sunBands(m = MARK, { hinted = false } = {}) {
  const { cx, cy, r } = m.sun;
  const half = y => Math.sqrt(Math.max(0, r * r - (y - cy) ** 2));
  const edges = [cy - r, ...m.cuts.flat(), cy + r];
  const out = [];
  for (let i = 0; i < edges.length; i += 2) {
    const y1 = edges[i], y2 = edges[i + 1];
    if (i === 0) out.push(`M${n(cx - half(y2))} ${n(y2)}A${r} ${r} 0 ${y2 > cy ? 1 : 0} 1 ${n(cx + half(y2))} ${n(y2)}Z`);
    else if (i === edges.length - 2 && hinted) out.push(`M${n(cx - 8)} ${n(y1)}H${n(cx + 8)}V${n(y2)}H${n(cx - 8)}Z`);
    else if (i === edges.length - 2) out.push(`M${n(cx - half(y1))} ${n(y1)}H${n(cx + half(y1))}A${r} ${r} 0 ${y1 < cy ? 1 : 0} 1 ${n(cx - half(y1))} ${n(y1)}Z`);
    else out.push(`M${n(cx - half(y1))} ${n(y1)}H${n(cx + half(y1))}A${r} ${r} 0 0 1 ${n(cx + half(y2))} ${n(y2)}H${n(cx - half(y2))}A${r} ${r} 0 0 1 ${n(cx - half(y1))} ${n(y1)}Z`);
  }
  return out;
}

function tilePath(m = MARK, inset = 0) {
  const s = m.size - inset, r = m.radius - inset, o = inset;
  return `M${n(o + r)} ${n(o)}H${n(s - r)}A${n(r)} ${n(r)} 0 0 1 ${n(s)} ${n(o + r)}V${n(s - r)}A${n(r)} ${n(r)} 0 0 1 ${n(s - r)} ${n(s)}H${n(o + r)}A${n(r)} ${n(r)} 0 0 1 ${n(o)} ${n(s - r)}V${n(o + r)}A${n(r)} ${n(r)} 0 0 1 ${n(o + r)} ${n(o)}Z`;
}

const stops = list => list.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');
const tileGradient = (id, [a, b]) => `<linearGradient id="${id}" x1="0" y1="0" x2="${MARK.size}" y2="${MARK.size}" gradientUnits="userSpaceOnUse">${stops([[0, a], [1, b]])}</linearGradient>`;
const sunGradient = (id, list) => `<linearGradient id="${id}" x1="0" y1="${MARK.sun.cy - MARK.sun.r}" x2="0" y2="${MARK.sun.cy + MARK.sun.r}" gradientUnits="userSpaceOnUse">${stops(list)}</linearGradient>`;

/** The mark's drawing (no <svg> wrapper), for one variant. ids are prefixed so
 *  several marks can share an HTML page. */
export function markBody(variant = 'primary', { id = `od-${variant}`, square = false, hinted = false } = {}) {
  const sun = sunBands(MARK, { hinted }).join('');
  if (variant === 'mono' || variant === 'mono-white') {
    const fill = variant === 'mono' ? 'currentColor' : PALETTE.paper;
    return `<path fill="${fill}" fill-rule="evenodd" d="${tilePath()}${sun}"/>`;
  }
  const tiles = { primary: PALETTE.tile, light: PALETTE.paperTile, dark: PALETTE.nightTile };
  const edges = { light: PALETTE.paperEdge, dark: PALETTE.nightEdge };
  if (!tiles[variant]) throw new Error(`unknown mark variant: ${variant}`);
  const sunStops = variant === 'light' ? PALETTE.sunOnLight : PALETTE.sun;
  const tile = square ? `<rect width="${MARK.size}" height="${MARK.size}" fill="url(#${id}-tile)"/>` : `<rect width="${MARK.size}" height="${MARK.size}" rx="${MARK.radius}" fill="url(#${id}-tile)"/>`;
  const edge = edges[variant] && !square ? `<rect x=".5" y=".5" width="${MARK.size - 1}" height="${MARK.size - 1}" rx="${MARK.radius - 0.5}" fill="none" stroke="${edges[variant][0]}" stroke-opacity="${edges[variant][1]}"/>` : '';
  return `<defs>${tileGradient(`${id}-tile`, tiles[variant])}${sunGradient(`${id}-sun`, sunStops)}</defs>${tile}${edge}<path fill="url(#${id}-sun)" d="${sun}"/>`;
}

const svgOpen = (w, h, vb = `0 0 ${n(w)} ${n(h)}`, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${n(w)}" height="${n(h)}" role="img" aria-label="OpenDash"${extra}>`;

export function markSvg(variant = 'primary', opts = {}) {
  return `${svgOpen(MARK.size, MARK.size)}<title>OpenDash</title>${markBody(variant, opts)}</svg>\n`;
}

/** The sun on its own (one colour), cropped to the sun. */
export function glyphSvg() {
  const { cx, cy, r } = MARK.sun;
  return `${svgOpen(2 * r, 2 * r, `${cx - r} ${cy - r} ${2 * r} ${2 * r}`)}<title>OpenDash</title><path fill="currentColor" d="${sunBands().join('')}"/></svg>\n`;
}

// ---------------------------------------------------------------- wordmark
export function loadGlyphs(file = join(BRAND_DIR, 'src', 'wordmark-glyphs.json')) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

// Re-plot an absolute path (M L H V Q C Z, font units, y up) at an offset and scale, y down.
function transformPath(d, ox, baseline, s, box) {
  const tok = d.match(/[MLHVQCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) || [];
  let out = '', cmd = '', i = 0, lastX = 0, lastY = 0;
  const X = v => { const x = (+v + ox) * s; box.minX = Math.min(box.minX, x); box.maxX = Math.max(box.maxX, x); return x; };
  const Y = v => { const y = baseline - +v * s; box.minY = Math.min(box.minY, y); box.maxY = Math.max(box.maxY, y); return y; };
  while (i < tok.length) {
    if (/^[A-Z]$/i.test(tok[i])) { cmd = tok[i++].toUpperCase(); if (cmd === 'Z') { out += 'Z'; continue; } out += cmd; }
    else if (cmd === 'M') { cmd = 'L'; out += 'L'; }
    if (cmd === 'H') { lastX = X(tok[i++]); out += n(lastX); continue; }
    if (cmd === 'V') { lastY = Y(tok[i++]); out += n(lastY); continue; }
    const pts = cmd === 'Q' ? 2 : cmd === 'C' ? 3 : 1;
    const parts = [];
    for (let p = 0; p < pts; p++) { lastX = X(tok[i++]); lastY = Y(tok[i++]); parts.push(`${n(lastX)} ${n(lastY)}`); }
    out += parts.join(' ');
  }
  return out.replace(/ -/g, '-');
}

/** "OpenDash" as one path. Returns { d, width, height, top, baseline }, with the
 *  ink starting at x = 0 and the top of the "O" at y = 0. */
export function wordmarkGeometry(glyphs = loadGlyphs(), { capHeight = WORDMARK.capHeight, tracking = WORDMARK.tracking } = {}) {
  const s = capHeight / glyphs.capHeight;
  const set = (shiftX, baseline, box) => {
    let pen = shiftX;
    return glyphs.glyphs.map((g, i) => {
      const d = transformPath(g.d, pen, baseline, s, box);
      pen += g.advance + (i < glyphs.glyphs.length - 1 ? tracking * glyphs.unitsPerEm : 0);
      return d;
    }).join('');
  };
  const box = () => ({ minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  const ink = box();
  set(0, 0, ink);                                  // measure the ink first,
  const baseline = -ink.minY, final = box();       // then set it again starting at (0, 0)
  const d = set(-ink.minX / s, baseline, final);
  return { d, width: final.maxX, height: final.maxY, top: 0, baseline };
}

export function wordmarkSvg(fill = PALETTE.ink, glyphs = loadGlyphs()) {
  const w = wordmarkGeometry(glyphs);
  return `${svgOpen(w.width, w.height)}<title>OpenDash</title><path fill="${fill}" d="${w.d}"/></svg>\n`;
}

/** Mark + wordmark, side by side; the capitals are centred on the mark. */
export function lockupSvg({ mark = 'primary', text = PALETTE.ink } = {}, glyphs = loadGlyphs()) {
  const w = wordmarkGeometry(glyphs);
  const capTop = MARK.size / 2 - WORDMARK.capHeight / 2;
  const capTopInWord = w.baseline - WORDMARK.capHeight;     // the O's overshoot sits slightly above the cap line
  const dy = capTop - capTopInWord, dx = MARK.size + LOCKUP.gap;
  const width = dx + w.width;
  const body = mark === 'mono' ? markBody('mono') : markBody(mark, { id: `od-lockup-${mark}` });
  return `${svgOpen(width, MARK.size)}<title>OpenDash</title>${body}<path fill="${text}" transform="translate(${n(dx)} ${n(dy)})" d="${w.d}"/></svg>\n`;
}

/** Every SVG file this script owns, by path relative to assets/brand/. */
export function brandSvgs(glyphs = loadGlyphs()) {
  return {
    'logo-mark.svg': markSvg('primary'),
    'logo-mark-light.svg': markSvg('light'),
    'logo-mark-dark.svg': markSvg('dark'),
    'logo-mark-mono.svg': markSvg('mono'),
    'logo-mark-mono-white.svg': markSvg('mono-white'),
    'logo-mark-square.svg': markSvg('primary', { id: 'od-square', square: true }),
    'logo-glyph.svg': glyphSvg(),
    'favicon.svg': markSvg('primary', { id: 'od-favicon', hinted: true }),
    'wordmark.svg': wordmarkSvg(PALETTE.ink, glyphs),
    'wordmark-dark.svg': wordmarkSvg(PALETTE.mist, glyphs),
    'wordmark-mono.svg': wordmarkSvg('currentColor', glyphs),
    'lockup.svg': lockupSvg({ mark: 'primary', text: PALETTE.ink }, glyphs),
    'lockup-dark.svg': lockupSvg({ mark: 'primary', text: PALETTE.mist }, glyphs),
    'lockup-mono.svg': lockupSvg({ mark: 'mono', text: 'currentColor' }, glyphs),
  };
}

// PNG exports: [file, source SVG, size, opaque?]. 16 px uses the hinted favicon
// drawing; 32 px and up have room for the true circular sliver.
export const PNG_EXPORTS = [
  ['png/icon-16.png', 'favicon.svg', 16, false],
  ['png/icon-32.png', 'logo-mark.svg', 32, false],
  ['png/icon-180.png', 'logo-mark.svg', 180, false],
  ['png/icon-192.png', 'logo-mark.svg', 192, false],
  ['png/icon-512.png', 'logo-mark.svg', 512, false],
  ['png/apple-touch-icon.png', 'logo-mark-square.svg', 180, true],
  ['png/icon-maskable-512.png', 'logo-mark-square.svg', 512, true],
];
export const ICO_SIZES = [16, 32, 48];
export const SOCIAL = { file: 'social-preview.png', source: 'src/social-preview.html', width: 1280, height: 640 };
export const PREVIEWS = ['preview/marks-light.png', 'preview/marks-dark.png', 'preview/pixels.png', 'preview/lockups.png', 'preview/in-context.png'];

// ---------------------------------------------------------------- rendering
const b64 = (s, type) => `data:${type};base64,${Buffer.from(s).toString('base64')}`;
const svgUri = s => b64(s, 'image/svg+xml');
const pngUri = buf => b64(buf, 'image/png');

function page(body, css = '') {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Inter"; src: url("${pathToFileURL(FONT).href}") format("woff2"); font-weight: 100 900; font-display: block; }
html, body { margin: 0; padding: 0; background: transparent; }
body { font-family: "Inter", system-ui, sans-serif; font-feature-settings: "cv02", "cv03", "cv04", "cv11"; -webkit-font-smoothing: antialiased; }
${css}</style></head><body>${body}</body></html>`;
}

async function renderSvg(chrome, svg, size, opaque) {
  const html = page(`<img alt="" src="${svgUri(svg)}" style="display:block;width:${size}px;height:${size}px">`);
  return stripPng(await chrome.screenshot({ html, width: size, height: size, transparent: !opaque }));
}

function previewMarks(svgs, pngs, dark) {
  const bg = dark ? PALETTE.night : PALETTE.paper, fg = dark ? PALETTE.mist : PALETTE.ink, sub = dark ? '#a1a1aa' : '#5d5e66';
  const sizes = [16, 20, 24, 32, 48, 64, 96, 128];
  const rows = [['Primary', 'logo-mark.svg'], ['Light', 'logo-mark-light.svg'], ['Dark', 'logo-mark-dark.svg'], ['Mono', dark ? 'logo-mark-mono-white.svg' : 'logo-mark-mono.svg']];
  const row = ([label, file]) => `<div class="row"><div class="lab">${label}<small>${file}</small></div>${sizes.map(s => `<figure><img src="${svgUri(svgs[file])}" width="${s}" height="${s}" alt=""><figcaption>${s}</figcaption></figure>`).join('')}</div>`;
  const exp = PNG_EXPORTS.filter(([, , , o]) => !o).map(([f, , s]) => `<figure><img src="${pngUri(pngs[f])}" width="${Math.min(s, 128)}" height="${Math.min(s, 128)}" alt=""><figcaption>${f.replace('png/', '')}</figcaption></figure>`).join('');
  return page(`<main><h1>OpenDash mark on ${dark ? 'dark' : 'light'}</h1><p>SVG at real sizes (CSS px, 1x)</p>${rows.map(row).join('')}
  <p>PNG exports (shown at most 128 px)</p><div class="row">${exp}</div></main>`, `
  main { background: ${bg}; color: ${fg}; padding: 32px 40px 36px; width: 1120px; }
  h1 { font-size: 20px; line-height: 28px; font-weight: 650; letter-spacing: -0.022em; margin: 0 0 4px; }
  p { font-size: 13px; color: ${sub}; margin: 20px 0 8px; }
  .row { display: flex; align-items: flex-end; gap: 28px; padding: 14px 0; border-bottom: 1px solid ${dark ? '#26262c' : '#f0f0f2'}; }
  .lab { width: 150px; font-size: 14px; font-weight: 600; align-self: center; }
  .lab small { display: block; font-weight: 400; font-size: 11px; color: ${sub}; margin-top: 2px; }
  figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; }
  figcaption { font-size: 11px; color: ${sub}; font-variant-numeric: tabular-nums; }
  img { display: block; }`);
}

function previewPixels(pngs) {
  const cell = (f, bg, label) => `<figure style="background:${bg}"><img src="${pngUri(pngs[f])}" class="z" alt=""><figcaption style="color:${bg === PALETTE.night ? '#a1a1aa' : '#5d5e66'}">${label}</figcaption></figure>`;
  return page(`<main><h1>Pixel check (each pixel drawn 12 x 12)</h1><div class="grid">
    ${cell('png/icon-16.png', PALETTE.paper, 'icon-16.png on light')}${cell('png/icon-16.png', PALETTE.night, 'icon-16.png on dark')}
    ${cell('png/icon-32.png', PALETTE.paper, 'icon-32.png on light')}${cell('png/icon-32.png', PALETTE.night, 'icon-32.png on dark')}</div></main>`, `
  main { background: #f1f1f3; padding: 28px 32px 32px; width: 1180px; }
  h1 { font-size: 18px; font-weight: 650; letter-spacing: -0.022em; margin: 0 0 16px; color: ${PALETTE.ink}; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  figure { margin: 0; padding: 20px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .z { width: 240px; height: 240px; image-rendering: pixelated; display: block; }
  figcaption { font-size: 12px; }`);
}

function previewLockups(svgs) {
  const img = (f, h) => `<img src="${svgUri(svgs[f])}" style="height:${h}px" alt="">`;
  return page(`<main>
    <section class="l"><h2>lockup.svg</h2>${img('lockup.svg', 64)}${img('lockup.svg', 32)}${img('lockup.svg', 20)}<h2>wordmark.svg</h2>${img('wordmark.svg', 40)}<h2>logo-mark-mono.svg, lockup-mono.svg, logo-glyph.svg</h2><div class="r">${img('logo-mark-mono.svg', 48)}${img('lockup-mono.svg', 48)}${img('logo-glyph.svg', 40)}</div></section>
    <section class="d"><h2>lockup-dark.svg</h2>${img('lockup-dark.svg', 64)}${img('lockup-dark.svg', 32)}${img('lockup-dark.svg', 20)}<h2>wordmark-dark.svg</h2>${img('wordmark-dark.svg', 40)}<h2>logo-mark-dark.svg, logo-mark-light.svg, logo-mark-mono-white.svg</h2><div class="r">${img('logo-mark-dark.svg', 48)}${img('logo-mark-light.svg', 48)}${img('logo-mark-mono-white.svg', 48)}</div></section>
  </main>`, `
  main { display: grid; grid-template-columns: 1fr 1fr; width: 1200px; }
  section { padding: 32px 40px 40px; display: flex; flex-direction: column; align-items: flex-start; gap: 20px; }
  .l { background: ${PALETTE.paper}; color: #5d5e66; } .d { background: ${PALETTE.night}; color: #a1a1aa; }
  h2 { font-size: 12px; font-weight: 500; margin: 8px 0 -6px; }
  .r { display: flex; align-items: center; gap: 24px; }
  img { display: block; }`);
}

function previewInContext(svgs, pngs) {
  const fav = `<img src="${pngUri(pngs['png/icon-16.png'])}" width="16" height="16" alt="">`;
  const tabs = dark => `<div class="tabs ${dark ? 'dk' : ''}"><div class="tab on">${fav}<span>OpenDash</span><b>×</b></div><div class="tab"><i></i><span>Recipes for the week</span><b>×</b></div><div class="tab"><i></i><span>Team notes</span><b>×</b></div></div>`;
  const side = dark => `<div class="side ${dark ? 'dk' : ''}"><div class="ws"><img src="${svgUri(svgs['logo-mark.svg'])}" width="22" height="22" alt=""><span>OpenDash</span></div><div class="nav on">Home</div><div class="nav">Today</div><div class="nav">Upcoming</div></div>`;
  const readme = dark => `<div class="readme ${dark ? 'dk' : ''}"><img src="${svgUri(svgs[dark ? 'lockup-dark.svg' : 'lockup.svg'])}" style="height:56px" alt=""><p>Plan your day. Keep your data.</p><div class="badges"><span>MIT licence</span><span>Node 20+</span><span>0 dependencies</span></div></div>`;
  const home = `<div class="home"><div class="app"><img src="${pngUri(pngs['png/apple-touch-icon.png'])}" alt=""><span>OpenDash</span></div><div class="app"><i style="background:#3f9f52"></i><span>Notes</span></div><div class="app"><i style="background:#0b84e8"></i><span>Weather</span></div><div class="app"><i style="background:#f76b15"></i><span>Music</span></div></div>`;
  return page(`<main><div class="col">${tabs(false)}${tabs(true)}<div class="pair">${side(false)}${side(true)}</div>${home}</div><div class="col">${readme(false)}${readme(true)}</div></main>`, `
  main { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 28px; width: 1144px; background: #e9e9ec; }
  .col { display: flex; flex-direction: column; gap: 24px; }
  .tabs { display: flex; gap: 2px; padding: 8px 8px 0; background: #dfe1e5; border-radius: 10px 10px 0 0; height: 34px; }
  .tabs.dk { background: #202124; }
  .tab { display: flex; align-items: center; gap: 8px; padding: 0 12px; width: 170px; font-size: 12px; color: #3c4043; border-radius: 8px 8px 0 0; }
  .tab.on { background: #fff; } .tabs.dk .tab { color: #bdc1c6; } .tabs.dk .tab.on { background: #35363a; color: #e8eaed; }
  .tab span { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .tab b { font-weight: 400; opacity: .6; }
  .tab i { width: 16px; height: 16px; border-radius: 50%; background: #9aa0a6; opacity: .5; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .side { background: #f8f8f9; border: 1px solid #e5e5e9; border-radius: 12px; padding: 12px; font-size: 13px; color: ${PALETTE.ink}; }
  .side.dk { background: #0f0f12; border-color: #26262c; color: ${PALETTE.mist}; }
  .ws { display: flex; align-items: center; gap: 8px; font-weight: 600; margin-bottom: 10px; }
  .nav { padding: 6px 8px; border-radius: 6px; color: #5d5e66; } .nav.on { background: #e9e9ec; color: ${PALETTE.ink}; font-weight: 500; }
  .side.dk .nav { color: #a1a1aa; } .side.dk .nav.on { background: #25252b; color: ${PALETTE.mist}; }
  .home { display: flex; gap: 28px; padding: 28px 32px; border-radius: 18px; background: linear-gradient(160deg, #3b3b8f, #8a5a9e 60%, #f0a77a); }
  .app { display: flex; flex-direction: column; align-items: center; gap: 6px; font-size: 11px; color: #fff; }
  .app img, .app i { width: 60px; height: 60px; border-radius: 14px; display: block; box-shadow: 0 2px 6px rgba(0,0,0,.18); }
  .readme { background: #fff; border: 1px solid #d0d7de; border-radius: 8px; padding: 40px 32px; display: flex; flex-direction: column; align-items: center; gap: 14px; color: #1f2328; }
  .readme.dk { background: #0d1117; border-color: #30363d; color: #e6edf3; }
  .readme p { margin: 0; font-size: 18px; font-weight: 500; }
  .badges { display: flex; gap: 6px; } .badges span { font-size: 11px; padding: 3px 8px; border-radius: 4px; background: #eaeef2; color: #1f2328; }
  .readme.dk .badges span { background: #21262d; color: #e6edf3; }
  img { display: block; }`);
}

// ---------------------------------------------------------------- main
function writeSvgs(svgs) {
  for (const [f, s] of Object.entries(svgs)) {
    const p = join(BRAND_DIR, f);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, s);
  }
}

export function checkSvgs(svgs = brandSvgs()) {
  return Object.entries(svgs).filter(([f, s]) => !existsSync(join(BRAND_DIR, f)) || readFileSync(join(BRAND_DIR, f), 'utf8') !== s).map(([f]) => f);
}

async function main(argv) {
  const svgs = brandSvgs();
  if (argv.includes('--check')) {
    const stale = checkSvgs(svgs);
    if (stale.length) { console.error(`Out of date (run node tools/release-brand.mjs --svg): ${stale.join(', ')}`); process.exit(1); }
    console.log(`All ${Object.keys(svgs).length} brand SVGs are up to date.`);
    return;
  }
  writeSvgs(svgs);
  console.log(`Wrote ${Object.keys(svgs).length} SVGs to ${relative(ROOT, BRAND_DIR)}`);
  if (argv.includes('--svg')) return;

  const { launchChrome } = await import('./release-chrome.mjs');
  const chrome = await launchChrome();
  const put = (f, buf) => { const p = join(BRAND_DIR, f); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, buf); console.log(`  ${f}  ${buf.length} bytes`); };
  try {
    const pngs = {};
    for (const [f, src, size, opaque] of PNG_EXPORTS) put(f, pngs[f] = await renderSvg(chrome, svgs[src], size, opaque));
    const ico = [];
    for (const size of ICO_SIZES) ico.push({ size, png: await renderSvg(chrome, svgs[size <= 16 ? 'favicon.svg' : 'logo-mark.svg'], size, false) });
    put('favicon.ico', encodeIco(ico));

    const social = join(BRAND_DIR, SOCIAL.source);
    put(SOCIAL.file, stripPng(await chrome.screenshot({ url: pathToFileURL(social).href, width: SOCIAL.width, height: SOCIAL.height, transparent: false })));
    const fontOk = await chrome.evaluate('document.fonts.check(\'600 20px "Inter"\') && [...document.fonts].some(f => f.family.replace(/"/g, "") === "Inter" && f.status === "loaded")');
    if (!fontOk) throw new Error('the social preview did not load Inter (vendor/fonts/InterVariable-latin.woff2)');

    const shots = {
      'preview/marks-light.png': previewMarks(svgs, pngs, false),
      'preview/marks-dark.png': previewMarks(svgs, pngs, true),
      'preview/pixels.png': previewPixels(pngs),
      'preview/lockups.png': previewLockups(svgs),
      'preview/in-context.png': previewInContext(svgs, pngs),
    };
    for (const [f, html] of Object.entries(shots)) put(f, stripPng(await chrome.screenshot({ html, width: f.includes('marks-') ? 1200 : 1200, height: 'auto', transparent: false })));
  } finally {
    await chrome.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(e => { console.error(e.message || e); process.exit(1); });
}
