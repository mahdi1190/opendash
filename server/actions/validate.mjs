// server/actions/validate.mjs - a small JSON Schema checker for op parameters.
//
// Supports the subset the op schemas use: type (incl. arrays of types),
// properties, required, additionalProperties:false, enum, const, minLength,
// maxLength, pattern, minimum, maximum, items, minItems, maxItems,
// uniqueItems, anyOf (first match wins), and minProperties.
// Errors name the field and list valid values, so a model can fix its call.

import { ActionError, closest } from './model.mjs';

const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);
const typeOk = (v, t) => {
  const actual = typeOf(v);
  if (Array.isArray(t)) return t.some(x => typeOk(v, x));
  if (t === 'number') return actual === 'number' || actual === 'integer';
  return actual === t;
};

/** Returns an array of {field, message, valid?, hint?}. Empty when valid. */
export function check(schema, value, path = '') {
  const errs = [];
  const at = path || '(params)';
  if (!schema) return errs;
  if (schema.anyOf) {
    const results = schema.anyOf.map(s => check(s, value, path));
    if (results.some(r => !r.length)) return errs;
    return results.sort((a, b) => a.length - b.length)[0];
  }
  if (schema.type && !typeOk(value, schema.type)) {
    const want = [].concat(schema.type).join(' or ');
    errs.push({ field: at, message: `${at} must be ${want}, got ${typeOf(value)}`, ...(schema.enum ? { valid: schema.enum } : {}) });
    return errs;
  }
  if (schema.const !== undefined && value !== schema.const) errs.push({ field: at, message: `${at} must be ${JSON.stringify(schema.const)}` });
  if (schema.enum && !schema.enum.includes(value)) {
    const near = closest(value, schema.enum.filter(x => typeof x === 'string'));
    errs.push({ field: at, message: `${at}: '${value}' is not allowed; valid: ${schema.enum.join(', ')}`, valid: schema.enum, ...(near.length ? { hint: `did you mean '${near[0]}'?` } : {}) });
  }
  if (typeof value === 'string') {
    if (schema.minLength != null && value.trim().length < schema.minLength) errs.push({ field: at, message: schema.minLength === 1 ? `${at} must not be empty` : `${at} must be at least ${schema.minLength} characters` });
    if (schema.maxLength != null && Array.from(value).length > schema.maxLength) errs.push({ field: at, message: `${at} is too long (max ${schema.maxLength} characters)` });
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) errs.push({ field: at, message: `${at} has the wrong format${schema.formatHint ? ` (${schema.formatHint})` : ''}: ${JSON.stringify(value.slice(0, 40))}` });
  }
  if (typeof value === 'number') {
    if (schema.minimum != null && value < schema.minimum) errs.push({ field: at, message: `${at} must be >= ${schema.minimum}` });
    if (schema.maximum != null && value > schema.maximum) errs.push({ field: at, message: `${at} must be <= ${schema.maximum}` });
  }
  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) errs.push({ field: at, message: `${at} needs at least ${schema.minItems} item(s)` });
    if (schema.maxItems != null && value.length > schema.maxItems) errs.push({ field: at, message: `${at} has too many items (max ${schema.maxItems})` });
    if (schema.uniqueItems && new Set(value.map(v => JSON.stringify(v))).size !== value.length) errs.push({ field: at, message: `${at} has duplicate items` });
    if (schema.items) value.forEach((v, i) => errs.push(...check(schema.items, v, `${path}[${i}]`)));
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const props = schema.properties || {};
    // Keys that could reach an object's prototype are never valid fields
    // (JSON.parse makes "__proto__" an own key; a later copy could act on it).
    for (const k of ['__proto__', 'constructor', 'prototype']) {
      if (Object.hasOwn(value, k) && !Object.hasOwn(props, k)) errs.push({ field: path ? `${path}.${k}` : k, message: `field name '${k}' is not allowed` });
    }
    for (const r of schema.required || []) {
      if (value[r] === undefined) errs.push({ field: path ? `${path}.${r}` : r, message: `${path ? `${path}.${r}` : r} is required${props[r]?.description ? ` (${props[r].description})` : ''}` });
    }
    if (schema.additionalProperties === false) {
      const known = Object.keys(props);
      for (const k of Object.keys(value)) {
        if (['__proto__', 'constructor', 'prototype'].includes(k)) continue;   // reported above
        if (!Object.hasOwn(props, k)) {
          const near = closest(k, known, 1);
          errs.push({ field: path ? `${path}.${k}` : k, message: `unknown field '${k}'`, valid: known, ...(near.length ? { hint: `did you mean '${near[0]}'?` } : {}) });
        }
      }
    }
    for (const [k, s] of Object.entries(props)) if (Object.hasOwn(value, k) && value[k] !== undefined) errs.push(...check(s, value[k], path ? `${path}.${k}` : k));
    if (schema.minProperties != null) {
      const n = Object.keys(value).filter(k => value[k] !== undefined && !(schema.ignoreForMin || []).includes(k)).length;
      if (n < schema.minProperties) errs.push({ field: at, message: schema.minPropertiesMessage || `${at} needs at least ${schema.minProperties} field(s)` });
    }
  }
  return errs;
}

/** Throw an ActionError for the first problem (all of them in .details). */
export function assertValid(schema, value, { opIndex, op } = {}) {
  const errs = check(schema, value);
  if (!errs.length) return;
  const first = errs[0];
  const e = new ActionError('INVALID_PARAMS', first.message, { field: first.field, valid: first.valid, hint: first.hint, opIndex, op });
  if (errs.length > 1) e.more = errs.slice(1, 6).map(x => x.message);
  throw e;
}

/** Strip our private keywords so tools/list carries standard JSON Schema only. */
export function publicSchema(schema) {
  if (Array.isArray(schema)) return schema.map(publicSchema);
  if (!schema || typeof schema !== 'object') return schema;
  const out = {};
  for (const [k, v] of Object.entries(schema)) {
    if (k === 'formatHint' || k === 'ignoreForMin' || k === 'minPropertiesMessage') continue;
    out[k] = (k === 'properties') ? Object.fromEntries(Object.entries(v).map(([pk, pv]) => [pk, publicSchema(pv)])) : publicSchema(v);
  }
  return out;
}
