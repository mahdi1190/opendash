// Optional ElevenLabs narration. Keys and quota accounting stay outside exports;
// only the requested script is sent to the fixed ElevenLabs API origin.
import { createHash, randomBytes } from 'node:crypto';
import { promises as fsp } from 'node:fs';
import { join, resolve } from 'node:path';
import { atomicWrite, readJson, writeJson, withLock, retryFs } from './fsutil.mjs';
import { loadConfig, saveConfig } from './datadir.mjs';

export const NARRATION_DEFAULTS = Object.freeze({ provider: 'browser', voiceId: '', modelId: 'eleven_flash_v2_5', scope: 'all', monthlyLimit: 18000 });
export const NARRATION_MODELS = Object.freeze(['eleven_flash_v2_5', 'eleven_v3', 'eleven_multilingual_v2']);
export const NARRATION_TONES = Object.freeze(['warm', 'calm', 'bright', 'reflective', 'focused', 'gentle']);
export const NARRATION_PACES = Object.freeze(['slow', 'steady', 'brisk']);
export const NARRATION_TEXT_LIMIT = 4000;
const API = 'https://api.elevenlabs.io';
const VOICE_ID = /^[A-Za-z0-9_-]{1,80}$/;
const AUDIO_ID = /^[a-f0-9]{64}$/;
const KEY = /^[A-Za-z0-9_-]{8,512}$/;
const PERIOD = /^\d{4}-\d{2}$/;
const MAX_AUDIO = 10 * 1024 * 1024;
const MAX_CACHE_BYTES = 128 * 1024 * 1024;
const MAX_CACHE_FILES = 500;
const MAX_JSON = 2 * 1024 * 1024;
const TIERS = new Set(['free', 'trial', 'starter', 'creator', 'pro', 'scale', 'business', 'enterprise']);
const HIGHLIGHTS = new Set(['intro', 'outro', 'opening', 'closing', 'recap', 'evening', 'weekly', 'review', 'title', 'summary']);
const services = new Map();
const fail = (code, message, status = 409, extra = {}) => Object.assign(new Error(message), { code, status, ...extra });
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const hash = value => createHash('sha256').update(value).digest('hex');
const safeCount = n => Number.isSafeInteger(n) && n >= 0 ? n : null;

function settingsOf(raw) {
  const c = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return { provider: c.provider === 'elevenlabs' ? 'elevenlabs' : 'browser',
    voiceId: typeof c.voiceId === 'string' && VOICE_ID.test(c.voiceId) ? c.voiceId : '',
    modelId: NARRATION_MODELS.includes(c.modelId) ? c.modelId : NARRATION_DEFAULTS.modelId,
    scope: c.scope === 'highlights' ? 'highlights' : 'all',
    monthlyLimit: safeCount(c.monthlyLimit) !== null && c.monthlyLimit <= 1000000 ? c.monthlyLimit : NARRATION_DEFAULTS.monthlyLimit };
}

function deliveryOf(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw fail('BAD_REQUEST', 'Choose a valid narration delivery.', 400);
  if (raw.tone !== undefined && !NARRATION_TONES.includes(raw.tone)) throw fail('BAD_REQUEST', 'Choose a supported narration tone.', 400);
  if (raw.pace !== undefined && !NARRATION_PACES.includes(raw.pace)) throw fail('BAD_REQUEST', 'Choose a supported narration pace.', 400);
  if (raw.pauseMs !== undefined && (!Number.isFinite(raw.pauseMs) || raw.pauseMs < 0 || raw.pauseMs > 1200)) throw fail('BAD_REQUEST', 'Narration pauses must be between 0 and 1200 milliseconds.', 400);
  return { tone: raw.tone || 'warm', pace: raw.pace || 'steady', pauseMs: raw.pauseMs === undefined ? 300 : Math.round(raw.pauseMs) };
}

// Delivery directions are data, never literal words in the captions or the
// browser voice. Only these bounded directions become provider-specific tags.
export function narrationRequest(text, delivery, modelId) {
  if (typeof text !== 'string' || !text.trim() || text.length > NARRATION_TEXT_LIMIT || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) {
    throw fail('BAD_REQUEST', `Narration text must contain 1 to ${NARRATION_TEXT_LIMIT} characters.`, 400);
  }
  if (!NARRATION_MODELS.includes(modelId)) throw fail('BAD_REQUEST', 'Choose a supported narration model.', 400);
  const d = deliveryOf(delivery);
  // Text from Claude may still contain stage directions from older scripts.
  // Strip markup before adding our own allowlisted cues; raw SSML cannot add
  // arbitrarily long pauses, and stage directions cannot leak into Flash.
  const cues = /\[(?:warmly|warm|calm|calmly|cheerful|cheerfully|bright|thoughtful|reflective|confident|focused|gentle|gently|unhurried|slowly|briskly|short pause|long pause|pause|whisper|whispers|whispering|laughing|laughs|chuckles|sighs|excited|happy|sad|angry|curious|sarcastic|mischievously|crying|shouting|inhales|exhales)\]/gi;
  const plain = text.replace(/<\/?[A-Za-z][^>]{0,200}>/g, '').replace(cues, '').replace(/\r/g, '').replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (!plain) throw fail('BAD_REQUEST', 'Narration text has no spoken words.', 400);
  const speed = { slow: 0.9, steady: 1, brisk: 1.1 }[d.pace];
  const stable = { warm: 0.5, calm: 0.7, bright: 0.4, reflective: 0.65, focused: 0.7, gentle: 0.65 }[d.tone];
  let generated = plain;
  const separators = /(?<=[.!?])\s+(?=[A-Z\u00c0-\u024f])|\n+/g;
  // At most three short pauses per clip avoids the documented excess-break
  // artifacts and keeps the tags' character overhead small on the free plan.
  let pauses = 0;
  if (modelId === 'eleven_v3') {
    const tones = { warm: '[warmly]', calm: '[calm]', bright: '[cheerful]', reflective: '[thoughtful]', focused: '[confident]', gentle: '[gently]' };
    const pacing = d.pace === 'slow' ? ' [unhurried]' : d.pace === 'brisk' ? ' [briskly]' : '';
    generated = generated.replace(/\[([^\]\n]+)\]/g, '($1)');
    if (d.pauseMs) generated = generated.replace(separators, match => pauses++ < 3 ? ' [short pause] ' : match);
    generated = tones[d.tone] + pacing + ' ' + generated;
    // v3's stability modes are discrete; natural follows gentle audio tags.
    return { text: generated, model_id: modelId, voice_settings: { stability: 0.5, similarity_boost: 0.75 } };
  }
  generated = generated.replace(/[<>&]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[ch]);
  if (d.pauseMs) generated = generated.replace(separators, match => pauses++ < 3 ? ` <break time="${(d.pauseMs / 1000).toFixed(2)}s" /> ` : match);
  return { text: generated, model_id: modelId, voice_settings: { stability: stable, similarity_boost: 0.75, style: d.tone === 'bright' ? 0.15 : 0, use_speaker_boost: true, speed } };
}

async function boundedBytes(response, max, controller) {
  const declared = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declared) && declared > max) { controller?.abort(); throw fail('ELEVENLABS_RESPONSE', 'ElevenLabs returned too much data.', 502); }
  const reader = response.body?.getReader?.();
  if (!reader) throw fail('ELEVENLABS_RESPONSE', 'ElevenLabs returned an unreadable response.', 502);
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) { controller?.abort(); await reader.cancel().catch(() => {}); throw fail('ELEVENLABS_RESPONSE', 'ElevenLabs returned too much data.', 502); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, size);
}

function providerError(status, doc) {
  const reason = typeof doc?.detail?.status === 'string' ? doc.detail.status : '';
  const definite = status >= 400 && status < 500;
  if (status === 401) return fail('ELEVENLABS_AUTH', 'ElevenLabs rejected the API key. Check it in voice settings.', 401, { definite });
  if (status === 402 || reason === 'quota_exceeded' || reason === 'payment_required') return fail('ELEVENLABS_QUOTA', 'The ElevenLabs allowance is used up. The free computer voice will take over.', 429, { definite });
  if (status === 403) return fail('ELEVENLABS_PERMISSION', 'ElevenLabs refused this voice or API permission. Choose an eligible voice and check the key permissions.', 403, { definite });
  if (status === 404) return fail('ELEVENLABS_VOICE', 'This ElevenLabs voice is no longer available. Choose another voice.', 404, { definite });
  if (status === 429) return fail('ELEVENLABS_RATE_LIMIT', 'ElevenLabs is busy. The free computer voice will take over for now.', 429, { definite });
  if (definite) return fail('ELEVENLABS_REQUEST', 'ElevenLabs could not use these voice settings. Choose another voice or model.', 400, { definite });
  return fail('ELEVENLABS_NETWORK', 'ElevenLabs could not finish the narration. The free computer voice will take over.', 502);
}

function publicAccount(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const tier = TIERS.has(raw.tier) ? raw.tier : 'unknown';
  const remaining = safeCount(raw.remaining);
  const resetAt = typeof raw.resetAt === 'string' && Number.isFinite(Date.parse(raw.resetAt)) ? new Date(raw.resetAt).toISOString() : null;
  return { tier, remaining, resetAt };
}

const cleanLabel = (s, key) => typeof s === 'string' && !s.includes(key) ? s.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 120) : '';
function publicVoice(raw, tier, key) {
  if (!raw || !VOICE_ID.test(raw.voice_id || '') || raw.voice_id === key) return null;
  const category = ['premade', 'generated', 'cloned', 'professional', 'high_quality'].includes(raw.category) ? raw.category : 'other';
  const free = tier === 'free' || tier === 'trial' || tier === 'unknown';
  const library = category === 'professional' || category === 'high_quality' || (!!raw.sharing && raw.is_owner !== true && category !== 'premade');
  const tiers = Array.isArray(raw.available_for_tiers) ? raw.available_for_tiers.filter(t => TIERS.has(t)) : [];
  const unavailable = (free && library) || (tiers.length > 0 && tier !== 'unknown' && !tiers.includes(tier));
  const labels = {};
  for (const field of ['accent', 'gender', 'language', 'use_case']) { const value = cleanLabel(raw.labels?.[field], key); if (value) labels[field] = value; }
  return { voiceId: raw.voice_id, name: cleanLabel(raw.name, key) || 'ElevenLabs voice', category, labels, eligible: !unavailable,
    ...(unavailable ? { reason: tier === 'unknown' ? 'Verify your subscription to use this voice.' : free ? 'Voice Library voices require a paid ElevenLabs plan for API use.' : 'This voice is unavailable on your ElevenLabs plan.' } : {}) };
}

export function createNarration({ dataDir, getConfig, setConfig, fetchFn = fetch, now = () => Date.now(), timeoutMs = 45000 } = {}) {
  if (!dataDir) throw new Error('Narration needs a data directory.');
  const root = resolve(dataDir), secretFile = join(root, 'secrets', 'narration.json'), usageFile = join(root, 'secrets', 'narration-usage.json'), cacheDir = join(root, 'cache', 'narration');
  const readConfig = getConfig || (() => loadConfig(root));
  const writeConfig = setConfig || (patch => saveConfig(root, patch));
  const inFlight = new Map(); let refreshing = null;
  const secret = async () => { const s = await readJson(secretFile, { fallback: null }); return s && KEY.test(s.apiKey || '') && typeof s.revision === 'string' ? s : null; };
  const config = async () => settingsOf((await readConfig())?.brief?.story?.narration);
  const changed = () => fail('ELEVENLABS_CHANGED', 'The ElevenLabs connection changed. Try again.', 409);

  async function period() {
    let timezone = (await readConfig())?.timezone || 'UTC';
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit' }).formatToParts(now());
      return parts.find(p => p.type === 'year').value + '-' + parts.find(p => p.type === 'month').value;
    } catch { return new Date(now()).toISOString().slice(0, 7); }
  }
  async function ledger() {
    let doc;
    try { doc = await readJson(usageFile); }
    catch { throw fail('ELEVENLABS_USAGE', 'The local voice allowance could not be read. New audio is paused until it is repaired.', 503); }
    if (doc === null) {
      // A missing ledger starts empty. A present null/corrupt ledger must never
      // silently reset the allowance and permit more billed generations.
      const exists = await fsp.stat(usageFile).then(() => true, e => { if (e.code === 'ENOENT') return false; throw e; });
      if (!exists) return { version: 1, months: {} };
    }
    if (!doc || doc.version !== 1 || !doc.months || typeof doc.months !== 'object' || Array.isArray(doc.months)
      || Object.entries(doc.months).some(([p, n]) => !PERIOD.test(p) || safeCount(n) === null)) throw fail('ELEVENLABS_USAGE', 'The local voice allowance could not be read. New audio is paused until it is repaired.', 503);
    return doc;
  }
  async function usage(c = null) {
    const settings = c || await config(), p = await period(), doc = await ledger(), used = doc.months[p] || 0;
    return { used, remaining: Math.max(0, settings.monthlyLimit - used), period: p };
  }
  async function status() {
    const c = await config(), s = await secret(), u = await usage(c), account = s ? publicAccount(s.account) : null;
    return { connected: !!s, ...c, usage: u, ...(account ? { account } : {}),
      ...(s && Array.isArray(s.voices) ? { voices: s.voices } : {}), ...(s?.refreshedAt ? { refreshedAt: s.refreshedAt } : {}), ...(s?.warning ? { warning: s.warning } : {}) };
  }

  async function configure(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail('BAD_REQUEST', 'Choose valid voice settings.', 400);
    const fields = new Set(['apiKey', 'removeKey', 'provider', 'voiceId', 'modelId', 'scope', 'monthlyLimit']);
    if (Object.keys(body).some(k => !fields.has(k))) throw fail('BAD_REQUEST', 'Unsupported voice setting.', 400);
    if (own(body, 'apiKey') && (typeof body.apiKey !== 'string' || !KEY.test(body.apiKey.trim()))) throw fail('BAD_REQUEST', 'Paste a valid ElevenLabs API key.', 400);
    if (own(body, 'removeKey') && typeof body.removeKey !== 'boolean') throw fail('BAD_REQUEST', 'Choose a valid disconnect setting.', 400);
    if (body.removeKey && own(body, 'apiKey')) throw fail('BAD_REQUEST', 'Connect or remove the key in separate requests.', 400);
    if (own(body, 'provider') && !['browser', 'elevenlabs'].includes(body.provider)) throw fail('BAD_REQUEST', 'Choose a supported voice provider.', 400);
    if (own(body, 'voiceId') && (typeof body.voiceId !== 'string' || (body.voiceId !== '' && !VOICE_ID.test(body.voiceId)))) throw fail('BAD_REQUEST', 'Choose a valid ElevenLabs voice.', 400);
    if (own(body, 'modelId') && !NARRATION_MODELS.includes(body.modelId)) throw fail('BAD_REQUEST', 'Choose a supported voice model.', 400);
    if (own(body, 'scope') && !['highlights', 'all'].includes(body.scope)) throw fail('BAD_REQUEST', 'Choose introductions and recaps, or all narration.', 400);
    if (own(body, 'monthlyLimit') && (safeCount(body.monthlyLimit) === null || body.monthlyLimit > 1000000)) throw fail('BAD_REQUEST', 'The monthly character limit must be between 0 and 1000000.', 400);
    await withLock(secretFile, async () => {
      const old = await secret(), key = own(body, 'apiKey') ? body.apiKey.trim() : old?.apiKey;
      if (body.voiceId && body.voiceId === key) throw fail('BAD_REQUEST', 'Choose a voice ID, separate from the API key.', 400);
      const known = old?.voices?.find(v => v.voiceId === body.voiceId);
      if (known && !known.eligible && !own(body, 'apiKey')) throw fail('ELEVENLABS_VOICE_UNAVAILABLE', known.reason || 'Choose an eligible voice.', 403);
      if (body.removeKey) await writeJson(secretFile, null, { mode: 0o600 });
      else if (own(body, 'apiKey') && key !== old?.apiKey) await writeJson(secretFile, { version: 1, apiKey: key, revision: randomBytes(16).toString('hex'), creditsSpent: 0, reservations: {} }, { mode: 0o600 });
      const next = await config();
      for (const k of ['provider', 'voiceId', 'modelId', 'scope', 'monthlyLimit']) if (own(body, k)) next[k] = body[k];
      if (body.removeKey) next.provider = 'browser';
      await writeConfig({ brief: { story: { narration: next } } });
    });
    return status();
  }

  async function request(path, s, { body, audio = false } = {}) {
    const url = new URL(path, API);
    if (url.origin !== API || url.username || url.password) throw fail('ELEVENLABS_REQUEST', 'Unsupported ElevenLabs request.', 400);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(50, Math.min(60000, timeoutMs)));
    try {
      const res = await fetchFn(url.href, { method: body ? 'POST' : 'GET', redirect: 'error', signal: controller.signal,
        headers: { 'xi-api-key': s.apiKey, Accept: audio ? 'audio/mpeg' : 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const bytes = await boundedBytes(res, res.ok && audio ? MAX_AUDIO : MAX_JSON, controller);
      if (!res.ok) { let doc = {}; try { doc = JSON.parse(bytes.toString('utf8')); } catch { /* provider detail is never exposed */ } throw providerError(res.status, doc); }
      if (audio) {
        const type = res.headers?.get?.('content-type') || '';
        const mp3 = bytes.length >= 3 && (bytes.subarray(0, 3).toString('ascii') === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0));
        if ((type && !/^audio\/(mpeg|mp3)(?:;|$)/i.test(type)) || !mp3) throw fail('ELEVENLABS_RESPONSE', 'ElevenLabs returned unreadable audio.', 502);
        return bytes;
      }
      let doc; try { doc = JSON.parse(bytes.toString('utf8')); } catch { throw fail('ELEVENLABS_RESPONSE', 'ElevenLabs returned an unreadable response.', 502); }
      if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw fail('ELEVENLABS_RESPONSE', 'ElevenLabs returned an unreadable response.', 502);
      return doc;
    } catch (e) {
      if (typeof e?.code === 'string' && e.code.startsWith('ELEVENLABS_')) throw e;
      throw fail('ELEVENLABS_NETWORK', 'ElevenLabs could not be reached. The free computer voice will take over.', 502);
    } finally { clearTimeout(timer); }
  }

  async function voices() {
    if (refreshing) return refreshing;
    refreshing = refreshVoices().finally(() => { refreshing = null; });
    return refreshing;
  }
  async function refreshVoices() {
    const s = await secret(); if (!s) throw fail('ELEVENLABS_NOT_CONNECTED', 'Add an ElevenLabs API key in voice settings first.', 400);
    const [sub, initial] = await Promise.allSettled([request('/v1/user/subscription', s), request('/v2/voices?page_size=100&include_total_count=false', s)]);
    if (initial.status === 'rejected') throw initial.reason;
    if (sub.status === 'rejected' && sub.reason.code === 'ELEVENLABS_AUTH') throw sub.reason;
    const rawAccount = sub.status === 'fulfilled' ? sub.value : null;
    const tier = TIERS.has(rawAccount?.tier) ? rawAccount.tier : publicAccount(s.account)?.tier || 'unknown';
    const count = safeCount(rawAccount?.character_count), limit = safeCount(rawAccount?.character_limit), reset = safeCount(rawAccount?.next_character_count_reset_unix);
    let account = rawAccount ? { tier, remaining: count !== null && limit !== null ? Math.max(0, limit - count) : null, resetAt: reset !== null && reset < 253402300800 ? new Date(reset * 1000).toISOString() : null } : publicAccount(s.account);
    const rows = [], tokens = new Set(); let page = initial.value, truncated = false;
    for (let i = 0; i < 5; i++) {
      if (!Array.isArray(page.voices)) throw fail('ELEVENLABS_RESPONSE', 'ElevenLabs returned an unreadable voice list.', 502);
      for (const v of page.voices.slice(0, 200)) { const row = publicVoice(v, tier, s.apiKey); if (row && !rows.some(r => r.voiceId === row.voiceId)) rows.push(row); }
      if (!page.has_more) break;
      const token = page.next_page_token;
      if (i === 4) { truncated = true; break; }
      if (typeof token !== 'string' || !token || token.length > 2048 || tokens.has(token)) throw fail('ELEVENLABS_RESPONSE', 'ElevenLabs returned an invalid voice page.', 502);
      tokens.add(token);
      page = await request('/v2/voices?' + new URLSearchParams({ page_size: '100', include_total_count: 'false', next_page_token: token }), s);
    }
    const warning = sub.status === 'rejected' ? 'Voices loaded. Account allowance could not be checked; allow User Read on this API key to show it.' : truncated ? 'Showing the first 500 account voices.' : null;
    await withLock(secretFile, async () => {
      const current = await secret(); if (!current || current.revision !== s.revision) throw changed();
      const pendingAtStart = Object.values(s.reservations || {}).filter(r => safeCount(r?.credits) !== null
        && (!r.resetAt || Date.parse(r.resetAt) > now() || r.resetAt === account?.resetAt)).reduce((total, r) => total + r.credits, 0);
      const spentDuringRefresh = Math.max(0, (safeCount(current.creditsSpent) || 0) - (safeCount(s.creditsSpent) || 0));
      if (rawAccount && account && account.remaining !== null) account.remaining = Math.max(0, account.remaining - pendingAtStart - spentDuringRefresh);
      // A temporarily unavailable subscription read must not erase a known
      // exhausted included allowance or overwrite newer local deductions.
      if (!rawAccount) account = publicAccount(current.account);
      const reservations = Object.fromEntries(Object.entries(current.reservations || {}).filter(([, r]) => !r.resetAt || Date.parse(r.resetAt) > now() || r.resetAt === account?.resetAt));
      await writeJson(secretFile, { ...current, account, reservations, voices: rows, refreshedAt: new Date(now()).toISOString(), warning }, { mode: 0o600 });
    });
    return status();
  }

  async function cachedAudio(id) {
    if (!AUDIO_ID.test(id || '')) throw fail('BAD_REQUEST', 'Choose a valid cached audio ID.', 400);
    const file = join(cacheDir, id + '.mp3');
    const stat = await fsp.stat(file).catch(e => { if (e.code === 'ENOENT') return null; throw e; });
    if (!stat || !stat.isFile() || stat.size < 3 || stat.size > MAX_AUDIO) return null;
    const bytes = await fsp.readFile(file);
    // Reused intros remain in the bounded cache. Least recently played clips
    // are evicted first once the disk allowance is full.
    await retryFs(() => fsp.utimes(file, new Date(now()), new Date(now())), { retries: 2 }).catch(() => {});
    return bytes;
  }
  async function audio(id) {
    const bytes = await cachedAudio(id);
    if (!bytes) throw fail('NARRATION_AUDIO_MISSING', 'This narration audio is no longer cached.', 404);
    return bytes;
  }
  async function speech(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail('BAD_REQUEST', 'Choose valid narration text.', 400);
    if (own(body, 'preview') && typeof body.preview !== 'boolean') throw fail('BAD_REQUEST', 'Choose a valid voice preview.', 400);
    if (own(body, 'kind') && (typeof body.kind !== 'string' || body.kind.length > 40 || !/^[a-z0-9_-]*$/i.test(body.kind))) throw fail('BAD_REQUEST', 'Choose a valid narration kind.', 400);
    const c = await config(), d = deliveryOf(body.delivery), payload = narrationRequest(body.text, d, c.modelId);
    if (c.provider !== 'elevenlabs' && !body.preview) throw fail('NARRATION_BROWSER', 'The free computer voice is selected.', 409);
    if (!c.voiceId) throw fail('ELEVENLABS_VOICE_REQUIRED', 'Choose an ElevenLabs voice in voice settings first.', 400);
    if (c.scope === 'highlights' && !body.preview && !HIGHLIGHTS.has(body.kind)) throw fail('NARRATION_SCOPE', 'This story section uses the free computer voice.', 409);
    const id = hash(JSON.stringify({ version: 1, voiceId: c.voiceId, modelId: c.modelId, delivery: d, outputFormat: 'mp3_44100_128', payload }));
    if (inFlight.has(id)) return inFlight.get(id);
    // A disk lock also deduplicates the same clip across dashboard processes.
    const job = withLock(join(cacheDir, id + '.mp3'), async () => {
      if (await cachedAudio(id)) return { url: '/api/narration/audio?id=' + id, cached: true, usage: await usage() };
      const s = await secret(); if (!s) throw fail('ELEVENLABS_NOT_CONNECTED', 'Add an ElevenLabs API key in voice settings first.', 400);
      const selected = s.voices?.find(v => v.voiceId === c.voiceId);
      if (selected && !selected.eligible) throw fail('ELEVENLABS_VOICE_UNAVAILABLE', selected.reason || 'Choose an eligible voice.', 403);
      const chars = Array.from(payload.text).length;
      const credits = Math.ceil(chars * (c.modelId === 'eleven_flash_v2_5' ? 0.5 : 1));
      let reservation;
      await withLock(usageFile, async () => {
        const current = await config(), key = await secret();
        if (!key || key.revision !== s.revision || current.voiceId !== c.voiceId || current.modelId !== c.modelId || (current.provider !== 'elevenlabs' && !body.preview)) throw changed();
        const p = await period(), doc = await ledger(), used = doc.months[p] || 0;
        if (used + chars > current.monthlyLimit) throw fail('NARRATION_LIMIT', 'The monthly OpenDash voice limit is reached. Cached clips still replay; the free computer voice will take over.', 429);
        // Fail closed against a known exhausted included provider allowance.
        // No subscription extensions, top-ups or upgrade endpoints are called.
        const account = publicAccount(key.account);
        if (account && account.remaining !== null && account.remaining < credits && (!account.resetAt || Date.parse(account.resetAt) > now())) throw fail('ELEVENLABS_QUOTA', 'The ElevenLabs allowance is used up. The free computer voice will take over.', 429);
        doc.months[p] = used + chars;
        await writeJson(usageFile, doc, { mode: 0o600 });
        reservation = { period: p, chars, credits, token: randomBytes(16).toString('hex') };
        // Reserve provider credits as well as local characters, so concurrent
        // different clips cannot race a known included account allowance.
        await withLock(secretFile, async () => {
          const currentKey = await secret(), currentAccount = publicAccount(currentKey?.account);
          if (!currentKey || currentKey.revision !== s.revision) {
            doc.months[p] = used; await writeJson(usageFile, doc, { mode: 0o600 });
            throw changed();
          }
          if (currentAccount && currentAccount.remaining !== null && currentAccount.remaining < credits && (!currentAccount.resetAt || Date.parse(currentAccount.resetAt) > now())) {
            doc.months[p] = used; await writeJson(usageFile, doc, { mode: 0o600 });
            throw fail('ELEVENLABS_QUOTA', 'The ElevenLabs allowance is used up. The free computer voice will take over.', 429);
          }
          if (currentAccount && currentAccount.remaining !== null && (!currentAccount.resetAt || Date.parse(currentAccount.resetAt) > now())) {
            reservation.accountRefreshedAt = currentKey.refreshedAt;
            reservation.accountDebited = true;
            currentKey.account = { ...currentAccount, remaining: Math.max(0, currentAccount.remaining - credits) };
          }
          currentKey.creditsSpent = (safeCount(currentKey.creditsSpent) || 0) + credits;
          currentKey.reservations = { ...(currentKey.reservations || {}), [reservation.token]: { credits, at: new Date(now()).toISOString(), resetAt: currentAccount?.resetAt || null, state: 'pending' } };
          await writeJson(secretFile, currentKey, { mode: 0o600 });
        });
      });
      try {
        const bytes = await request(`/v1/text-to-speech/${encodeURIComponent(c.voiceId)}?output_format=mp3_44100_128`, s, { body: payload, audio: true });
        await atomicWrite(join(cacheDir, id + '.mp3'), bytes, { mode: 0o600, encoding: null });
        await finishReservation(s, reservation, 'success').catch(() => {});
        await pruneCache(id).catch(() => {});
        return { url: '/api/narration/audio?id=' + id, cached: false, usage: await usage() };
      } catch (e) {
        // Explicit 4xx refusals did not synthesize audio. Timeouts, broken
        // streams, 5xx and local save failures may already have been billed;
        // retain their reservation instead of silently granting a retry.
        if (e.definite) await withLock(usageFile, async () => {
          const doc = await ledger(); doc.months[reservation.period] = Math.max(0, (doc.months[reservation.period] || 0) - reservation.chars);
          await writeJson(usageFile, doc, { mode: 0o600 });
          await finishReservation(s, reservation, 'refused');
        });
        else await finishReservation(s, reservation, 'uncertain').catch(() => {});
        throw e;
      }
    }, { timeoutMs: 65000 }).finally(() => { if (inFlight.get(id) === job) inFlight.delete(id); });
    inFlight.set(id, job);
    return job;
  }
  async function finishReservation(s, reservation, outcome) {
    await withLock(secretFile, async () => {
      const current = await secret();
      if (!current || current.revision !== s.revision || !current.reservations?.[reservation.token]) return;
      if (outcome === 'uncertain') current.reservations[reservation.token].state = 'uncertain';
      else delete current.reservations[reservation.token];
      const account = publicAccount(current.account);
      if (outcome === 'refused' && reservation.accountDebited && current.refreshedAt === reservation.accountRefreshedAt && account && account.remaining !== null) {
        current.account = { ...account, remaining: account.remaining + reservation.credits };
      }
      await writeJson(secretFile, current, { mode: 0o600 });
    });
  }
  async function pruneCache(keepId) {
    await withLock(join(cacheDir, 'prune'), async () => {
      const names = (await fsp.readdir(cacheDir)).filter(n => /^[a-f0-9]{64}\.mp3$/.test(n));
      const entries = (await Promise.all(names.map(async name => {
        const file = join(cacheDir, name), stat = await fsp.stat(file).catch(() => null);
        return stat?.isFile() ? { name, file, size: stat.size, time: stat.mtimeMs } : null;
      }))).filter(Boolean).sort((a, b) => a.time - b.time);
      let total = entries.reduce((sum, e) => sum + e.size, 0), count = entries.length;
      for (const entry of entries) {
        if (total <= MAX_CACHE_BYTES && count <= MAX_CACHE_FILES) break;
        if (entry.name === keepId + '.mp3') continue;
        const removed = await retryFs(() => fsp.unlink(entry.file), { retries: 2 }).then(() => true, () => false);
        if (removed) { total -= entry.size; count--; }
      }
    });
  }

  return { status, configure, voices, speech, audio };
}

export function narrationFor(dataDir, options = {}) {
  const key = resolve(dataDir);
  if (!services.has(key)) services.set(key, createNarration({ ...options, dataDir: key }));
  return services.get(key);
}
