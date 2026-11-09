// Platform-neutral bounds and shape for one complete, deliberate island handover.
// SHA-256, JSON content and same-group writer checks belong to the callers.
export const GARDEN_HANDOVER_REL = 'garden/island-handover.json';
export const GARDEN_HANDOVER_PART_CHARS = 16384;
export const GARDEN_HANDOVER_MAX_PARTS = 1024;
export const GARDEN_HANDOVER_MAX_FILE_BYTES = 128 * 1024 * 1024;
const object = value => !!value && typeof value === 'object' && !Array.isArray(value);
const META_FIELDS = new Set(['v', 'id', 'wv', 'lh', 'group', 'source', 'sha256', 'parts', 'chars']);

export function gardenHandoverMeta(value) {
  if (!object(value) || Object.keys(value).length !== META_FIELDS.size || Object.keys(value).some(k => !META_FIELDS.has(k))) return null;
  const { v, id, wv, lh, group, source, sha256, parts, chars } = value;
  if (v !== 1 || !/^[0-9a-f]{32}$/.test(id || '') || !Number.isInteger(wv) || wv < 3 || wv > 9 || !/^[0-9a-f]{24}$/.test(lh || '')) return null;
  if (!/^[0-9a-f]{16}$/.test(group || '') || !/^[0-9a-f]{16}$/.test(source || '') || !/^[0-9a-f]{64}$/.test(sha256 || '')) return null;
  if (!Number.isSafeInteger(chars) || chars < 1 || chars > GARDEN_HANDOVER_PART_CHARS * GARDEN_HANDOVER_MAX_PARTS) return null;
  if (!Number.isSafeInteger(parts) || parts < 1 || parts > GARDEN_HANDOVER_MAX_PARTS || parts !== Math.ceil(chars / GARDEN_HANDOVER_PART_CHARS)) return null;
  return { v, id, wv, lh, group, source, sha256, parts, chars };
}

export function gardenHandoverText(file) {
  if (!object(file) || Object.keys(file).length !== 2 || !Object.hasOwn(file, 'meta') || !Object.hasOwn(file, 'parts')) return null;
  const meta = gardenHandoverMeta(file.meta);
  if (!meta || !object(file.parts) || Object.keys(file.parts).length !== meta.parts) return null;
  const chunks = [];
  for (let i = 0; i < meta.parts; i++) {
    const key = String(i).padStart(4, '0'), text = file.parts[key];
    const length = Math.min(GARDEN_HANDOVER_PART_CHARS, meta.chars - i * GARDEN_HANDOVER_PART_CHARS);
    if (!Object.hasOwn(file.parts, key) || typeof text !== 'string' || text.length !== length) return null;
    chunks.push(text);
  }
  return chunks.join('');
}
