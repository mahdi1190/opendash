// OpenDash brand assets (assets/brand/, made by tools/release-brand.mjs): the
// committed SVGs match the script, every file is self-contained (no fonts, no
// links, no metadata), the PNG exports have the right sizes and no metadata,
// the 16 px icon stays crisp, and BRAND.md lists what GitHub needs. The PNG
// and ICO helpers in tools/release-png.mjs are tested on made-up images.
// No browser is needed, except for one opt-in smoke test of the Chrome driver
// (it runs locally when Chrome is installed; in CI set OPENDASH_BROWSER_TESTS=1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import {
  BRAND_DIR, MARK, PALETTE, PNG_EXPORTS, ICO_SIZES, SOCIAL, PREVIEWS,
  brandSvgs, checkSvgs, sunBands, wordmarkGeometry, loadGlyphs,
} from '../tools/release-brand.mjs';
import {
  crc32, readChunks, writePng, pngInfo, stripPng, decodePng, encodeIco, readIco, KEEP_CHUNKS,
} from '../tools/release-png.mjs';
import { findChrome, launchChrome } from '../tools/release-chrome.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const brand = f => join(BRAND_DIR, f);
const readBrand = f => readFileSync(brand(f));

// ---------------------------------------------------------------- SVGs

test('the committed SVGs are exactly what tools/release-brand.mjs makes', () => {
  assert.deepEqual(checkSvgs(), [], 'run: node tools/release-brand.mjs --svg');
});

test('every brand SVG is self-contained, accessible and free of metadata', () => {
  for (const [f, svg] of Object.entries(brandSvgs())) {
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="[\d. -]+" width="[\d.]+" height="[\d.]+" role="img" aria-label="OpenDash">/, f);
    assert.match(svg, /<title>OpenDash<\/title>/, `${f} has a title`);
    assert.ok(svg.endsWith('</svg>\n'), `${f} ends with </svg> and a newline`);
    const body = svg.replace('xmlns="http://www.w3.org/2000/svg"', '');
    assert.doesNotMatch(body, /https?:|data:|@import|url\((?!#)/i, `${f} links to nothing outside itself`);
    assert.doesNotMatch(body, /<(text|image|script|style|foreignObject|metadata|use)\b|font-family|inkscape|sodipodi|xmlns:/i, `${f} draws only shapes`);
    const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    for (const id of ids) assert.match(id, /^od-/, `${f}: ids are namespaced (od-) so marks can be inlined together`);
    assert.equal(new Set(ids).size, ids.length, `${f}: ids are unique`);
    for (const ref of svg.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(ref[1]), `${f}: #${ref[1]} is defined`);
  }
});

test('light, dark and monochrome variants exist and differ', () => {
  const s = brandSvgs();
  for (const f of ['logo-mark.svg', 'logo-mark-light.svg', 'logo-mark-dark.svg', 'logo-mark-mono.svg', 'logo-mark-mono-white.svg',
    'favicon.svg', 'wordmark.svg', 'wordmark-dark.svg', 'wordmark-mono.svg', 'lockup.svg', 'lockup-dark.svg', 'lockup-mono.svg']) {
    assert.ok(s[f], `${f} is made`);
  }
  assert.notEqual(s['logo-mark-light.svg'], s['logo-mark-dark.svg']);
  for (const f of ['logo-mark-mono.svg', 'wordmark-mono.svg', 'lockup-mono.svg', 'logo-glyph.svg']) {
    assert.doesNotMatch(s[f], /#[0-9a-f]{3,6}\b|linearGradient/i, `${f} is one colour (currentColor)`);
    assert.match(s[f], /currentColor/, f);
  }
  assert.match(s['wordmark.svg'], new RegExp(`fill="${PALETTE.ink}"`));
  assert.match(s['wordmark-dark.svg'], new RegExp(`fill="${PALETTE.mist}"`));
});

test('the mark sits on a pixel grid: every cut is a whole pixel at 16 px', () => {
  const unit = MARK.size / 16;                       // 4 units per pixel at 16 px
  const { cx, cy, r } = MARK.sun;
  for (const y of [cy - r, cy + r, ...MARK.cuts.flat()]) assert.equal(y % unit, 0, `edge at y=${y}`);
  for (const [a, b] of MARK.cuts) assert.ok(b - a >= unit, 'each gap is at least 1 px at 16 px');
  // The sun stays inside the maskable-icon safe zone (a circle of 40 % of the size).
  assert.ok(Math.hypot(cx - MARK.size / 2, cy - MARK.size / 2) + r <= 0.4 * MARK.size);
  // Three bands: a dome, a dash and a sliver; the hinted sliver is exactly 4 x 1 px at 16 px.
  assert.equal(sunBands().length, 3);
  const hinted = sunBands(MARK, { hinted: true });
  assert.equal(hinted[2], 'M24 48H40V52H24Z');
});

test('the wordmark is outlines only, set from the bundled glyphs', () => {
  const glyphs = loadGlyphs();
  assert.equal(glyphs.glyphs.map(g => g.char || g.name).join(''), 'OpenDash');
  assert.match(glyphs.about, /SIL Open Font License/);
  const w = wordmarkGeometry(glyphs);
  assert.ok(w.width > 4 * w.height && w.width < 6 * w.height, `aspect ${w.width / w.height}`);
  assert.doesNotMatch(w.d, /[^MLHVQCZ\d.\s-]/, 'absolute path commands only');
  assert.ok(existsSync(join(ROOT, 'vendor', 'fonts', 'Inter-OFL.txt')), 'the Inter licence ships with the repo');
});

// ---------------------------------------------------------------- PNG exports

test('PNG exports have the right sizes, alpha and no metadata', () => {
  const sizes = Object.fromEntries(PNG_EXPORTS.map(([f, , s]) => [f, s]));
  for (const s of [16, 32, 180, 192, 512]) assert.equal(sizes[`png/icon-${s}.png`], s, `icon-${s}.png is exported`);
  for (const [f, , size, opaque] of PNG_EXPORTS) {
    const buf = readBrand(f);
    const info = pngInfo(buf);
    assert.equal(info.width, size, f); assert.equal(info.height, size, f);
    assert.deepEqual(info.chunks.filter(c => !KEEP_CHUNKS.has(c)), [], `${f} has no metadata chunks`);
    const px = decodePng(buf);
    const alpha = (x, y) => px.data[(y * size + x) * 4 + 3];
    if (opaque) assert.equal(alpha(0, 0), 255, `${f} is opaque (iOS and Android mask it)`);
    else assert.ok(alpha(0, 0) <= 8, `${f} has transparent rounded corners`);
    assert.equal(alpha(size >> 1, size >> 1), 255, `${f} is solid in the middle`);
  }
});

test('the 16 px icon is crisp: the cuts are whole rows of tile colour', () => {
  const { width, data } = decodePng(readBrand('png/icon-16.png'));
  const at = (x, y) => { const o = (y * width + x) * 4; return { r: data[o], g: data[o + 1], b: data[o + 2], a: data[o + 3] }; };
  const tile = p => p.a === 255 && p.b - p.r > 80;
  const sun = p => p.a === 255 && p.r > 0xf0 && p.b < 0x80;
  for (let x = 4; x <= 11; x++) {
    assert.ok(tile(at(x, 8)), `first cut, x=${x}`);
    assert.ok(tile(at(x, 11)), `second cut, x=${x}`);
    for (const y of [5, 6, 7, 9, 10]) assert.ok(sun(at(x, y)), `sun at ${x},${y}`);
  }
  for (let x = 6; x <= 9; x++) assert.ok(sun(at(x, 12)), `the dash at ${x},12`);
  for (const x of [5, 10]) assert.ok(tile(at(x, 12)), `the dash ends cleanly at x=${x}`);
  for (let x = 0; x < 16; x++) assert.ok(!sun(at(x, 2)) && !sun(at(x, 13)), 'clear space above and below the sun');
});

test('favicon.ico holds 16, 32 and 48 px PNGs', () => {
  const entries = readIco(readBrand('favicon.ico'));
  assert.deepEqual(entries.map(e => e.size), ICO_SIZES);
  for (const e of entries) {
    const info = pngInfo(e.png);
    assert.equal(info.width, e.size);
    assert.deepEqual(info.chunks, ['IHDR', 'IDAT', 'IEND']);
  }
});

test('the social preview is 1280 x 640, metadata-free, and its source loads nothing remote', () => {
  const info = pngInfo(readBrand(SOCIAL.file));
  assert.equal(info.width, 1280); assert.equal(info.height, 640);
  assert.deepEqual(info.chunks, ['IHDR', 'IDAT', 'IEND']);
  const html = readFileSync(brand(SOCIAL.source), 'utf8');
  assert.doesNotMatch(html, /https?:\/\/|<script|<link\b/i);
  for (const m of html.matchAll(/(?:src|url)\(?=?"([^"]+)"/g)) {
    assert.ok(existsSync(join(dirname(brand(SOCIAL.source)), m[1])), `${m[1]} exists in the repo`);
  }
  assert.match(html, /Plan your day\.<br><span>Keep your data\.<\/span>/, 'the tagline matches BRAND.md');
});

test('the preview sheets exist and carry no metadata', () => {
  const files = readdirSync(brand('preview')).map(f => `preview/${f}`).sort();
  assert.deepEqual(files, [...PREVIEWS].sort());
  for (const f of files) assert.deepEqual(pngInfo(readBrand(f)).chunks.filter(c => !KEEP_CHUNKS.has(c)), [], f);
});

// ---------------------------------------------------------------- BRAND.md

test('BRAND.md documents every file, the palette and the GitHub settings', () => {
  const md = readFileSync(brand('BRAND.md'), 'utf8');
  for (const f of [...Object.keys(brandSvgs()), ...PNG_EXPORTS.map(([f]) => f), 'favicon.ico', SOCIAL.file]) {
    assert.ok(md.includes(f), `BRAND.md mentions ${f}`);
  }
  for (const hex of [PALETTE.indigo, ...PALETTE.tile, ...PALETTE.sun.map(([, c]) => c), PALETTE.ink, PALETTE.mist, PALETTE.night]) {
    assert.ok(md.toLowerCase().includes(hex), `BRAND.md lists ${hex}`);
  }
  const block = label => {
    const m = md.match(new RegExp(`\\*\\*${label}\\*\\*[^\\n]*\\n+\`\`\`text\\n([\\s\\S]*?)\`\`\``));
    assert.ok(m, `BRAND.md has a **${label}** text block`);
    return m[1].trim();
  };
  const description = block('Repository description');
  assert.ok(description.length > 40 && description.length <= 350, `description is ${description.length} chars (GitHub allows 350)`);
  assert.doesNotMatch(description, /\n/);
  const topics = block('Topics').split(/\s+/);
  assert.ok(topics.length >= 10 && topics.length <= 20, `${topics.length} topics (GitHub allows 20)`);
  for (const t of topics) assert.match(t, /^[a-z0-9][a-z0-9-]{0,49}$/, `topic "${t}"`);
  assert.equal(new Set(topics).size, topics.length, 'topics are unique');
  assert.match(md, /Plan your day\. Keep your data\./);
});

// ---------------------------------------------------------------- tools/release-png.mjs

const ihdr = (w, h, colorType) => {
  const b = Buffer.alloc(13);
  b.writeUInt32BE(w, 0); b.writeUInt32BE(h, 4); b[8] = 8; b[9] = colorType;
  return b;
};
// A 2 x 2 RGBA image, one filter type per row, plus metadata chunks to strip.
function samplePng() {
  const rows = Buffer.from([
    1, 255, 0, 0, 255, 0, 255, 0, 0,       // filter 1 (sub): red, then red + (0,255,0,0) = yellow
    2, 0, 0, 255, 0, 0, 0, 0, 129,         // filter 2 (up): red + (0,0,255,0) = magenta, yellow + (0,0,0,129) = yellow at alpha 128
  ]);
  return writePng([
    { type: 'IHDR', data: ihdr(2, 2, 6) },
    { type: 'tEXt', data: Buffer.from('Author\0Somebody', 'latin1') },
    { type: 'tIME', data: Buffer.from([7, 234, 10, 3, 12, 0, 0]) },
    { type: 'iCCP', data: Buffer.concat([Buffer.from('p\0\0'), deflateSync(Buffer.from('profile'))]) },
    { type: 'IDAT', data: deflateSync(rows).subarray(0, 6) },
    { type: 'IDAT', data: deflateSync(rows).subarray(6) },
    { type: 'eXIf', data: Buffer.from('MM\0*') },
    { type: 'IEND', data: Buffer.alloc(0) },
  ]);
}

test('crc32 matches the standard check value', () => {
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
});

test('stripPng keeps the pixels and drops text, time, profile and EXIF chunks', () => {
  const src = samplePng();
  assert.deepEqual(pngInfo(src).chunks, ['IHDR', 'tEXt', 'tIME', 'iCCP', 'IDAT', 'IDAT', 'eXIf', 'IEND']);
  const out = stripPng(src);
  assert.deepEqual(pngInfo(out).chunks, ['IHDR', 'IDAT', 'IEND']);
  assert.ok(!out.includes(Buffer.from('Somebody')));
  assert.deepEqual(decodePng(out).data, decodePng(src).data);
  assert.deepEqual([...decodePng(out).data], [255, 0, 0, 255, 255, 255, 0, 255, 255, 0, 255, 255, 255, 255, 0, 128]);
});

test('readChunks rejects files that are not intact PNGs', () => {
  const good = samplePng();
  assert.throws(() => readChunks(Buffer.from('GIF89a')), /not a PNG/);
  const bad = Buffer.from(good); bad[bad.length - 20] ^= 0xff;
  assert.throws(() => readChunks(bad), /CRC|truncated|IEND/);
  assert.throws(() => readChunks(good.subarray(0, 40)), /truncated|IEND/);
});

test('encodeIco and readIco round-trip PNG entries, smallest first', () => {
  const a = stripPng(samplePng());
  const big = writePng([{ type: 'IHDR', data: ihdr(1, 1, 0) }, { type: 'IDAT', data: deflateSync(Buffer.from([0, 7])) }, { type: 'IEND', data: Buffer.alloc(0) }]);
  const ico = encodeIco([{ size: 256, png: big }, { size: 16, png: a }]);
  assert.equal(ico.readUInt16LE(2), 1, 'type 1 = icon');
  const back = readIco(ico);
  assert.deepEqual(back.map(e => e.size), [16, 256]);
  assert.ok(back[0].png.equals(a)); assert.ok(back[1].png.equals(big));
  assert.deepEqual([...decodePng(back[1].png).data], [7, 7, 7, 255]);
});

// ---------------------------------------------------------------- tools/release-chrome.mjs

test('findChrome honours CHROME_PATH and returns null when nothing is installed', () => {
  const self = process.execPath;
  assert.equal(findChrome({ CHROME_PATH: self }, 'linux'), self);
  assert.equal(findChrome({ PATH: '' }, 'linux'), null);
  assert.equal(findChrome({ CHROME_PATH: join(ROOT, 'no-such-browser'), PATH: '' }, 'linux'), null);
});

const browserTests = !!findChrome() && (!process.env.CI || process.env.OPENDASH_BROWSER_TESTS === '1');
test('headless Chrome renders a transparent screenshot (smoke test)', { skip: !browserTests && 'no Chrome, or CI without OPENDASH_BROWSER_TESTS=1', timeout: 60000 }, async () => {
  const chrome = await launchChrome();
  try {
    const html = '<!doctype html><html><body style="margin:0;background:transparent"><div style="width:2px;height:2px;background:#ff0000"></div></body></html>';
    const png = stripPng(await chrome.screenshot({ html, width: 4, height: 4, transparent: true }));
    const { width, height, data } = decodePng(png);
    assert.equal(width, 4); assert.equal(height, 4);
    assert.deepEqual([...data.subarray(0, 4)], [255, 0, 0, 255], 'the red square');
    assert.equal(data[(3 * 4 + 3) * 4 + 3], 0, 'the rest is transparent');
  } finally {
    await chrome.close();
  }
});
