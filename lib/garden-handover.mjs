import{GARDEN_EXPANDED_WORLD,GARDEN_EARLIER_WORLDS}from'./garden-island-identity.mjs';
// Platform-neutral bounds and shape for one complete, deliberate island handover.
// SHA-256, JSON content and same-group writer checks belong to the callers.
export const GARDEN_HANDOVER_LEGACY_REL='garden/island-handover.json';
export const GARDEN_HANDOVER_MECHANICS_REL='garden/island-handover-mechanics1.json';
export const GARDEN_HANDOVER_REL='garden/island-handover-expanded.json';
export const GARDEN_HANDOVER_RELS=Object.freeze([GARDEN_HANDOVER_LEGACY_REL,GARDEN_HANDOVER_MECHANICS_REL,GARDEN_HANDOVER_REL]);
export const GARDEN_HANDOVER_SEEN_KEY='world4.handoverId';
export function gardenHandoverSeenKey(meta){return meta?.v===3?GARDEN_HANDOVER_SEEN_KEY:meta?.v===2?'world3.mechanics1.handoverId':'world3.handoverId'}
export const GARDEN_HANDOVER_PART_CHARS = 16384;
export const GARDEN_HANDOVER_MAX_PARTS = 1024;
export const GARDEN_HANDOVER_MAX_FILE_BYTES = 128 * 1024 * 1024;
const object = value => !!value && typeof value === 'object' && !Array.isArray(value);
const META_FIELDS = new Set(['v', 'id', 'wv', 'lh', 'group', 'source', 'sha256', 'parts', 'chars']);

export function gardenHandoverMeta(value) {
  const fields=value?.v>=2?new Set([...META_FIELDS,'previous']):META_FIELDS;
  if (!object(value) || Object.keys(value).length !== fields.size || Object.keys(value).some(k => !fields.has(k))) return null;
  const { v, id, wv, lh, group, source, sha256, parts, chars } = value;
  if (![1,2,3].includes(v) || !/^[0-9a-f]{32}$/.test(id || '') || !Number.isInteger(wv) || wv < 3 || wv > 9 || !/^[0-9a-f]{24}$/.test(lh || '')) return null;
  if (!/^[0-9a-f]{16}$/.test(group || '') || !/^[0-9a-f]{16}$/.test(source || '') || !/^[0-9a-f]{64}$/.test(sha256 || '')) return null;
  if (!Number.isSafeInteger(chars) || chars < 1 || chars > GARDEN_HANDOVER_PART_CHARS * GARDEN_HANDOVER_MAX_PARTS) return null;
  if (!Number.isSafeInteger(parts) || parts < 1 || parts > GARDEN_HANDOVER_MAX_PARTS || parts !== Math.ceil(chars / GARDEN_HANDOVER_PART_CHARS)) return null;
  if(v===3){
    const p=value.previous;
    if(wv!==GARDEN_EXPANDED_WORLD[0]||lh!==GARDEN_EXPANDED_WORLD[1]||!object(p)||Object.keys(p).length!==3||!['wv','lh','sha256'].every(k=>Object.hasOwn(p,k))||!((p.wv===1||p.wv===2)&&p.lh===null||GARDEN_EARLIER_WORLDS.some(t=>t[0]===p.wv&&t[1]===p.lh))||!/^[0-9a-f]{64}$/.test(p.sha256||''))return null;
    return{v,id,wv,lh,group,source,sha256,parts,chars,previous:{wv:p.wv,lh:p.lh,sha256:p.sha256}};
  }
  if(v===2){
    const p=value.previous;
    if(wv!==3||lh!=='c34545b986e497d5d9df5d51'||!object(p)||Object.keys(p).length!==3||!['wv','lh','sha256'].every(k=>Object.hasOwn(p,k))||![1,2,3].includes(p.wv)||p.lh!==(p.wv===3?'94f5b2dbe4dce765cafb2b40':null)||!/^[0-9a-f]{64}$/.test(p.sha256||''))return null;
    return{v,id,wv,lh,group,source,sha256,parts,chars,previous:{wv:p.wv,lh:p.lh,sha256:p.sha256}};
  }
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
