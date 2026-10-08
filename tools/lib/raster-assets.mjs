// Raster object assets (docs/dev/OBJECT_IMPORT.md): where they live, how the build embeds them, and the generated library file.
// Node >= 20, no dependencies. Shared by build.mjs, the registry loaders (tools/lib/anim-render.mjs, tools/lib/scene-page.mjs)
// and the import commands (tools/lib/object-import.mjs).
//
//   assets/objects/<category>/<name>/       one folder per raster object (the id is <category>.<name>)
//       meta.json                           the definition: size, anchor, variants (file names), parts, frames, tags, provenance
//       base.png [spring|summer|autumn|winter|night|lit|snow|mask_lit].png   variant 0; v1/, v2/ ... the other variants
//       parts/*.png                         animation parts and frames
//
//   RASTER_DIR, RASTER_LIB_FILE
//   readRasterMetas(root)                   -> [{ meta, dir, rel }] sorted by id (every meta.json under assets/objects)
//   rasterKeyOf(meta, file)                 -> the asset key ('building/terrace-ai/base.png'): the path under assets/objects
//   rasterKeys(metas)                       -> [key] every key the metas reference (only these are embedded)
//   readRasterAsset(root, key)              -> Buffer | null (rejects keys that leave assets/objects)
//   rasterAssetBlocks(root)                 -> the page's <script type="application/octet-stream" data-scene-raster="key"> blocks
//   rasterAssetBytes(root)                  -> { files, bytes, base64Bytes } (the install-size note)
//   installRasterSource(get, root)          -> give a registry load the reader (get: a bundle's name getter)
//   rasterLibSource(metas)                  -> the text of src/app/70-scene-lib-raster.js (GENERATED: never edit it by hand)
//   writeRasterLib(root)                    -> { file, changed }: regenerate it from the metas
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, sep, dirname } from 'node:path';

export const RASTER_DIR = join('assets', 'objects');
export const RASTER_LIB_FILE = join('src', 'app', '70-scene-lib-raster.js');
const KEY_RE = /^[a-z]+\/[a-z0-9-]{1,40}\/(?:[a-z0-9_-]+\/)*[a-z0-9_.-]+\.(png|webp)$/;

export function readRasterMetas(root) {
  const base = join(root, RASTER_DIR), out = [];
  if (!existsSync(base)) return out;
  for (const cat of readdirSync(base).sort()) {
    const cdir = join(base, cat);
    if (!statSync(cdir).isDirectory()) continue;
    for (const name of readdirSync(cdir).sort()) {
      const dir = join(cdir, name), f = join(dir, 'meta.json');
      if (!existsSync(f)) continue;
      let meta;
      try { meta = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { throw new Error(`${join(RASTER_DIR, cat, name, 'meta.json')}: not valid JSON (${e.message})`); }
      if (meta.id !== `${cat}.${name}`) throw new Error(`${join(RASTER_DIR, cat, name, 'meta.json')}: id must be ${cat}.${name} (the folder), got ${meta.id}`);
      out.push({ meta, dir, rel: `${cat}/${name}` });
    }
  }
  return out.sort((a, b) => (a.meta.id < b.meta.id ? -1 : 1));
}
export function rasterKeyOf(meta, file) {
  const [cat, name] = String(meta.id).split('.');
  return `${cat}/${name}/${String(file).replace(/\\/g, '/')}`;
}
/** Every file a meta references, relative to its folder. */
export function metaFiles(meta) {
  const s = new Set();
  for (const v of meta.variants || []) for (const f of Object.values(v)) s.add(f);
  for (const p of meta.parts || []) s.add(p.image);
  if (meta.frames) for (const f of meta.frames.images || []) s.add(f);
  return [...s];
}
export function rasterKeys(metas) {
  return metas.flatMap(({ meta }) => metaFiles(meta).map(f => rasterKeyOf(meta, f)));
}
export function readRasterAsset(root, key) {
  if (!KEY_RE.test(String(key))) return null;
  const base = resolve(root, RASTER_DIR), p = resolve(base, ...String(key).split('/'));
  if (!p.startsWith(base + sep) || !existsSync(p)) return null;
  return readFileSync(p);
}
/** The embedded image blocks of the page (base64 inside non-script <script> elements: the HTML parser copies text, nothing runs). */
export function rasterAssetBlocks(root) {
  const metas = readRasterMetas(root);
  let out = '';
  for (const key of rasterKeys(metas)) {
    const buf = readRasterAsset(root, key);
    if (!buf) throw new Error(`raster asset missing: ${RASTER_DIR}/${key} (named in its meta.json)`);
    out += `<script type="application/octet-stream" data-scene-raster="${key}">${buf.toString('base64')}</script>\n`;
  }
  return out;
}
export function rasterAssetBytes(root) {
  const metas = readRasterMetas(root);
  let bytes = 0, files = 0;
  for (const key of rasterKeys(metas)) { const b = readRasterAsset(root, key); if (b) { bytes += b.length; files++; } }
  return { objects: metas.length, files, bytes, base64Bytes: Math.ceil(bytes / 3) * 4 };
}
/** Give a registry load (a bundle's name getter, e.g. reg.R.get) the file reader, so the SVG still and the lint see the images. */
export function installRasterSource(get, root) {
  const fn = typeof get === 'function' ? get('sceneRasterSource') : null;
  if (typeof fn === 'function') fn((key) => readRasterAsset(root, key));
}

const js = (v) => JSON.stringify(v);
/** One sceneObjDefine call for a meta (keys instead of file names). */
function defineCall(meta) {
  const k = (f) => rasterKeyOf(meta, f);
  const d = { id: meta.id, kind: 'raster', category: meta.category || meta.id.split('.')[0], size: meta.size, anchor: meta.anchor || 'bottom-centre' };
  d.images = (meta.variants || []).map(v => Object.fromEntries(Object.entries(v).map(([n, f]) => [n, k(f)])));
  if (meta.parts && meta.parts.length) d.parts = meta.parts.map(p => Object.assign({}, p, { image: k(p.image) }));
  if (meta.frames && (meta.frames.images || []).length) d.frames = { images: meta.frames.images.map(k), period: meta.frames.period || 0.9 };
  for (const f of ['seasonal', 'flippable', 'reflect', 'shadow', 'weight', 'means']) if (meta[f] != null) d[f] = meta[f];
  d.tags = meta.tags || [];
  if (meta.credit) d.credit = meta.credit;
  return `  sceneObjDefine(${js(d)});\n`;
}
export function rasterLibSource(metas) {
  return `/* ============================================================
   SCENE LIBRARY: raster objects (docs/dev/OBJECT_IMPORT.md, SCENE_ENGINE.md 2.9).
   GENERATED from assets/objects/<category>/<name>/meta.json by node tools/anim-pack.mjs object import | import-batch | import-sheet:
   never edit it by hand (tests/raster-objects.test.mjs checks it is in step). The images are embedded in the built page
   by build.mjs and decoded lazily when a scene draws them (70-scene-0raster.js).
   ============================================================ */
(function () {
${metas.map(({ meta }) => defineCall(meta)).join('')}})();
`;
}
export function writeRasterLib(root) {
  const file = join(root, RASTER_LIB_FILE), text = rasterLibSource(readRasterMetas(root));
  const before = existsSync(file) ? readFileSync(file, 'utf8') : '';
  if (before !== text) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); }
  return { file, changed: before !== text };
}
