// lib/tax-ids.mjs - UTR and National Insurance number. They live in the secret store on this computer (lib/secret-store.mjs):
// never in the tax document, never synced, never shared with friends, never sent to Claude, never logged.
// Only the page's own tap-to-reveal and the return pack, when the person asks, read them whole.
// A Government Gateway password has no place here and is never asked for.
//
//   validUtr(v), validNino(v)     the value in its stored form, or null
//   idStatus(dataDir)             {utr: {set, masked}, nino: {set, masked}}
//   setId / clearId / revealId    one identifier
//   maskIdentifiers(text)         a free-form text with anything that looks like one hidden: {text, utr, nino, hid}

import { secretStore } from './secret-store.mjs';

const KEY = { utr: 'tax/utr', nino: 'tax/nino' };
export const validUtr = (v) => { const s = String(v == null ? '' : v).replace(/[\s-]/g, ''); return /^\d{10}$/.test(s) ? s : null; };
// https://www.gov.uk/hmrc-internal-manuals/national-insurance-manual/nim39110: two letters, six digits, one letter A to D;
// D, F, I, Q, U, V never come first or second, O never second, and these prefixes are never used.
export const validNino = (v) => { const s = String(v == null ? '' : v).replace(/\s/g, '').toUpperCase(); return /^(?!BG|GB|NK|KN|TN|NT|ZZ)[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/.test(s) ? s : null; };
const check = { utr: validUtr, nino: validNino };
const mask = (k, s) => (k === 'utr' ? `•••••• ${s.slice(-4)}` : `${s.slice(0, 2)} •• •• •• ${s.slice(-1)}`);

export async function idStatus(dataDir) {
  const s = secretStore(dataDir), out = {};
  for (const k of Object.keys(KEY)) {
    let v = null;
    try { v = await s.get(KEY[k]); } catch { v = null; }
    out[k] = v && typeof v === 'string' ? { set: true, masked: mask(k, v) } : { set: false, masked: '' };
  }
  return out;
}
export async function setId(dataDir, kind, value) {
  if (!KEY[kind]) return { error: 'That is not something Freeflo keeps.', status: 400 };
  const v = check[kind](value);
  if (!v) return { error: kind === 'utr' ? 'A UTR is 10 digits. It is on letters from HMRC and in your tax account.' : 'A National Insurance number looks like AB 12 34 56 C: two letters, six numbers, one letter.', status: 400 };
  await secretStore(dataDir).set(KEY[kind], v);
  return { ok: true };
}
export async function clearId(dataDir, kind) {
  if (!KEY[kind]) return { error: 'That is not something Freeflo keeps.', status: 400 };
  await secretStore(dataDir).delete(KEY[kind]);
  return { ok: true };
}
export async function revealId(dataDir, kind) {
  if (!KEY[kind]) return null;
  try { const v = await secretStore(dataDir).get(KEY[kind]); return typeof v === 'string' ? v : null; } catch { return null; }
}

/** Hide identifiers before free-form text goes anywhere. A 10-digit number is treated as a UTR; a password someone typed is taken out too. */
export function maskIdentifiers(text) {
  let hid = 0, utr = null, nino = null;
  let t = String(text == null ? '' : text);
  t = t.replace(/\b(?:password|passcode|pass word|pwd)\b\s*(?:is|:|=)?\s*\S+/gi, () => { hid++; return '[a password was here and was not sent]'; });
  t = t.replace(/\b(?:gateway|government gateway)\s*(?:id|user ?id|number)\s*(?:is|:|=)?\s*[\d ]{6,}/gi, () => { hid++; return '[sign-in number hidden]'; });
  t = t.replace(/\b[A-Za-z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-Da-d]\b/g, (m) => { const v = validNino(m); if (!v) return m; hid++; nino = nino || v; return '[NI number hidden]'; });
  t = t.replace(/(?<![\d-])\d{5}\s?\d{5}(?![\d-])/g, (m) => { const v = validUtr(m); if (!v) return m; hid++; utr = utr || v; return '[UTR hidden]'; });
  return { text: t, utr, nino, hid };
}
