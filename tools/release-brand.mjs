#!/usr/bin/env node
// Freeflo brand assets: makes every file in assets/brand/ from one place, the orb module
// (src/brand/freeflo-orb.js), so the logo never drifts between sizes or between the app and the repo.
//
//   node tools/release-brand.mjs           the SVGs, then the PNGs, favicon.ico, the social
//                                          card and the preview sheets
//   node tools/release-brand.mjs --svg     the SVGs only (no browser needed)
//   node tools/release-brand.mjs --check   exit 1 if a committed SVG differs from what this
//                                          script makes (no browser)
//
// The orb module runs here in a vm context, exactly as the page runs it. PNGs are rendered by
// headless Chrome, Chromium or Edge (set CHROME_PATH if it is somewhere unusual) and have all
// metadata stripped. Node 20+ built-ins only. See assets/brand/BRAND.md.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';
import { stripPng, encodeIco } from './release-png.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const BRAND_DIR = join(ROOT, 'assets', 'brand');
const FONT = join(ROOT, 'vendor', 'fonts', 'InterVariable-latin.woff2');

// ---------------------------------------------------------------- design
// The canonical Freeflo orb is the "classic" palette (indigo to violet to coral). The app colours
// it by season and turns it into holidays; these files are the fixed, season-less brand.
export const PALETTE = {
  tile: ['#6767e0', '#7650d4'],   // the app-icon tile, top-left to bottom-right
  ink: '#1b1b1f',                 // the name on light
  mist: '#ececef',                // the name on dark
  paper: '#ffffff',
  night: '#141417',
};

export function loadBrand() {
  const sandbox = {}; sandbox.globalThis = sandbox;
  vm.runInNewContext(readFileSync(join(ROOT, 'src', 'brand', 'freeflo-orb.js'), 'utf8'), sandbox);
  return sandbox.FreefloBrand;
}
const NS = s => s.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
const n = v => String(Math.round(v * 1000) / 1000);

/** Every SVG file this script owns, by path relative to assets/brand/. */
export function brandSvgs(B = loadBrand()) {
  const orb = (o = {}) => NS(B.orb(Object.assign({ id: 'classic', static: true }, o)));
  const lock = (o = {}) => NS(B.lockup(Object.assign({ id: 'classic', static: true }, o)));
  const out = {
    'logo-mark.svg': orb({ size: 64 }) + '\n',
    'logo-mark-mono.svg': orb({ size: 64, mono: 'currentColor' }) + '\n',
    'logo-mark-mono-white.svg': orb({ size: 64, mono: '#ffffff' }) + '\n',
    'favicon.svg': orb({ size: 64 }) + '\n',
    'lockup.svg': lock({ color: PALETTE.ink }) + '\n',
    'lockup-dark.svg': lock({ color: PALETTE.mist }) + '\n',
    'lockup-mono.svg': lock({ color: 'currentColor', mono: 'currentColor' }) + '\n',
  };
  // The orb alone, one colour, cropped to the ring.
  out['logo-glyph.svg'] = orb({ mono: 'currentColor' }).replace('viewBox="0 0 64 64"', 'viewBox="4 4 56 56" width="56" height="56"') + '\n';
  // The app icon: the white orb on the gradient tile (square: iOS and Android round the corners themselves).
  const inner = orb({ mono: '#ffffff' }).replace('<svg ', '<svg x="7" y="7" width="50" height="50" ');
  out['logo-mark-square.svg'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="Freeflo"><title>Freeflo</title><defs><linearGradient id="fo-tile" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${PALETTE.tile[0]}"/><stop offset="1" stop-color="${PALETTE.tile[1]}"/></linearGradient></defs><rect width="64" height="64" fill="url(#fo-tile)"/>${inner}</svg>\n`;
  // Every orb the logo can become, one static file each (the README and BRAND.md show them).
  for (const id of Object.keys(B.VARIANTS)) out[`orbs/${id}.svg`] = orb({ id, size: 64 }) + '\n';
  return out;
}

// PNG exports: [file, source SVG, size, opaque?].
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
export const PREVIEWS = ['preview/lockups.png', 'preview/orbs.png'];
// Files an earlier brand wrote that nothing makes any more.
const RETIRED = ['wordmark.svg', 'wordmark-dark.svg', 'wordmark-mono.svg', 'logo-mark-light.svg', 'logo-mark-dark.svg', 'preview/marks-light.png', 'preview/marks-dark.png', 'preview/pixels.png', 'preview/in-context.png', 'src/wordmark-glyphs.json'];

// ---------------------------------------------------------------- rendering
const b64 = (s, type) => `data:${type};base64,${Buffer.from(s).toString('base64')}`;
const svgUri = s => b64(s, 'image/svg+xml');

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

function previewLockups(svgs) {
  const img = (f, h) => `<img src="${svgUri(svgs[f])}" style="height:${h}px" alt="">`;
  return page(`<main>
    <section class="l"><h2>lockup.svg</h2>${img('lockup.svg', 72)}${img('lockup.svg', 40)}${img('lockup.svg', 24)}<h2>logo-mark.svg, logo-mark-mono.svg, logo-glyph.svg, logo-mark-square.svg</h2><div class="r">${img('logo-mark.svg', 56)}${img('logo-mark-mono.svg', 56)}<span style="color:${PALETTE.ink}">${img('logo-glyph.svg', 48)}</span>${img('logo-mark-square.svg', 56)}</div></section>
    <section class="d"><h2>lockup-dark.svg</h2>${img('lockup-dark.svg', 72)}${img('lockup-dark.svg', 40)}${img('lockup-dark.svg', 24)}<h2>logo-mark.svg, logo-mark-mono-white.svg, lockup-mono.svg</h2><div class="r">${img('logo-mark.svg', 56)}${img('logo-mark-mono-white.svg', 56)}<span style="color:${PALETTE.mist}">${img('lockup-mono.svg', 40)}</span></div></section>
  </main>`, `
  main { display: grid; grid-template-columns: 1fr 1fr; width: 1200px; }
  section { padding: 32px 40px 40px; display: flex; flex-direction: column; align-items: flex-start; gap: 22px; }
  .l { background: ${PALETTE.paper}; color: #5d5e66; } .d { background: ${PALETTE.night}; color: #a1a1aa; }
  h2 { font-size: 12px; font-weight: 500; margin: 8px 0 -6px; }
  .r { display: flex; align-items: center; gap: 26px; }
  img { display: block; }`);
}

function previewOrbs(svgs, B) {
  const cells = ids => ids.map(id => `<figure><img src="${svgUri(svgs[`orbs/${id}.svg`])}" width="104" height="104" alt=""><figcaption>${B.VARIANTS[id].label}</figcaption></figure>`).join('');
  const ids = Object.keys(B.VARIANTS), by = k => ids.filter(i => B.VARIANTS[i].kind === k);
  return page(`<main><h2>Seasons</h2><div class="g">${cells(['spring', 'summer', 'autumn', 'winter', 'classic'])}</div><h2>Holidays</h2><div class="g">${cells(by('holiday'))}</div></main>`, `
  main { background: ${PALETTE.paper}; width: 1200px; padding: 28px 36px 34px; color: ${PALETTE.ink}; }
  h2 { font-size: 14px; font-weight: 600; margin: 8px 0 14px; letter-spacing: -0.01em; }
  .g { display: grid; grid-template-columns: repeat(6, 1fr); gap: 22px 12px; margin-bottom: 18px; }
  figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; }
  figcaption { font-size: 12px; color: #5d5e66; text-align: center; }
  img { display: block; }`);
}

// ---------------------------------------------------------------- main
function writeSvgs(svgs) {
  for (const [f, s] of Object.entries(svgs)) {
    const p = join(BRAND_DIR, f);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, s);
  }
  for (const f of RETIRED) { const p = join(BRAND_DIR, f); if (existsSync(p)) rmSync(p); }
}

export function checkSvgs(svgs = brandSvgs()) {
  return Object.entries(svgs).filter(([f, s]) => !existsSync(join(BRAND_DIR, f)) || readFileSync(join(BRAND_DIR, f), 'utf8') !== s).map(([f]) => f);
}

async function main(argv) {
  const B = loadBrand(), svgs = brandSvgs(B);
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
    for (const [f, src, size, opaque] of PNG_EXPORTS) put(f, await renderSvg(chrome, svgs[src], size, opaque));
    const ico = [];
    for (const size of ICO_SIZES) ico.push({ size, png: await renderSvg(chrome, svgs[size <= 16 ? 'favicon.svg' : 'logo-mark.svg'], size, false) });
    put('favicon.ico', encodeIco(ico));

    const social = join(BRAND_DIR, SOCIAL.source);
    put(SOCIAL.file, stripPng(await chrome.screenshot({ url: pathToFileURL(social).href, width: SOCIAL.width, height: SOCIAL.height, transparent: false })));
    const fontOk = await chrome.evaluate('document.fonts.check(\'600 20px "Inter"\') && [...document.fonts].some(f => f.family.replace(/"/g, "") === "Inter" && f.status === "loaded")');
    if (!fontOk) throw new Error('the social preview did not load Inter (vendor/fonts/InterVariable-latin.woff2)');

    const shots = { 'preview/lockups.png': previewLockups(svgs), 'preview/orbs.png': previewOrbs(svgs, B) };
    for (const [f, html] of Object.entries(shots)) put(f, stripPng(await chrome.screenshot({ html, width: 1200, height: 'auto', transparent: false })));
  } finally {
    await chrome.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(e => { console.error(e.message || e); process.exit(1); });
}
