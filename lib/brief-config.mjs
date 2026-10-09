// lib/brief-config.mjs - the Morning brief / Review settings in config.json.
// (owner: Brief + Review). lib/datadir.mjs validates them with these helpers.
//
//   config.location  null | { name, admin, country, countryCode, lat, lon, timezone }
//                    the place the weather is for (Settings > Profile, onboarding)
//   config.brief     { autoOpen, ai, model, eveningHour, animations, celebrate, units }
//     autoOpen     open the Morning brief on the first visit of each day (default true)
//     ai           the short "your day in 3 sentences" (needs Claude; default true)
//     model        model for the brief / recap / review summaries (default Haiku)
//     eveningHour  hour from which "Finish the day" is offered (12-23, default 17)
//     animations   weather and content animations (default true; reduced motion always wins)
//     celebrate    a small animation when a task is completed (default true)
//     units        'metric' | 'imperial' (temperatures; default metric)
//     story        the full-screen stories (src/app/79-story-engine.js, server/routes/story.mjs):
//                  { autoOpen (the day's first brief opens as a story), voice (read it out by
//                    default), voiceName ('' = best en-GB voice), rate, pitch, volume, speed, model,
//                    weekOpen 'story' | 'page': how Review > Week opens on the first visit each week }

import { MODELS } from './claude-runner.mjs';

export const STORY_DEFAULTS = Object.freeze({
  autoOpen: true, voice: true, voiceName: '', rate: 1, pitch: 1, volume: 1, speed: 1, model: 'claude-haiku-4-5', weekOpen: 'story',
  narration: Object.freeze({ provider: 'browser', voiceId: '', modelId: 'eleven_flash_v2_5', scope: 'all', monthlyLimit: 18000 }),
});
const STORY_SPEEDS = [0.8, 1, 1.25];
const clampNum = (v, lo, hi, d) => { const n = Number(v); return v !== null && v !== '' && Number.isFinite(n) ? Math.round(Math.max(lo, Math.min(hi, n)) * 100) / 100 : d; };
/** Public preferences only. Credentials are kept separately in data/secrets. */
export function normNarration(v) {
  const s = isObj(v) ? v : {};
  const cap = Number(s.monthlyLimit);
  const voiceId = typeof s.voiceId === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(s.voiceId) ? s.voiceId : '';
  return {
    provider: s.provider === 'elevenlabs' ? 'elevenlabs' : 'browser', voiceId,
    modelId: ['eleven_flash_v2_5', 'eleven_v3', 'eleven_multilingual_v2'].includes(s.modelId) ? s.modelId : 'eleven_flash_v2_5',
    scope: s.scope === 'highlights' ? 'highlights' : 'all',
    monthlyLimit: s.monthlyLimit !== null && s.monthlyLimit !== '' && Number.isFinite(cap) ? Math.max(0, Math.min(1000000, Math.round(cap))) : 18000,
  };
}
/** The story settings with defaults filled in and bad values replaced. */
export function normStory(v) {
  const s = isObj(v) ? v : {};
  return {
    autoOpen: s.autoOpen !== false, voice: s.voice !== false,
    voiceName: cleanText(s.voiceName, 120),
    rate: clampNum(s.rate, 0.6, 1.6, 1), pitch: clampNum(s.pitch, 0.6, 1.4, 1), volume: clampNum(s.volume, 0, 1, 1),
    speed: STORY_SPEEDS.includes(Number(s.speed)) ? Number(s.speed) : 1,
    model: MODELS.includes(s.model) ? s.model : STORY_DEFAULTS.model,
    weekOpen: s.weekOpen === 'page' ? 'page' : 'story',   // Review > Week, first visit each week (79-story-weekly.js)
    narration: normNarration(s.narration),
  };
}

export const BRIEF_DEFAULTS = Object.freeze({
  autoOpen: true, ai: true, advisorAuto: false, model: 'claude-haiku-4-5', eveningHour: 17, animations: true, celebrate: true, units: 'metric',
  story: STORY_DEFAULTS,
});

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const cleanText = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** A valid location or null. Coordinates are rounded to 4 decimals (about 10 m). */
export function normLocation(v) {
  if (!isObj(v)) return null;
  const lat = Number(v.lat ?? v.latitude), lon = Number(v.lon ?? v.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const name = cleanText(v.name, 80);
  if (!name) return null;
  let tz = cleanText(v.timezone, 64);
  if (tz) { try { new Intl.DateTimeFormat('en-GB', { timeZone: tz }); } catch { tz = ''; } }
  const cc = cleanText(v.countryCode ?? v.country_code, 2).toUpperCase();
  return {
    name, admin: cleanText(v.admin ?? v.admin1, 80), country: cleanText(v.country, 80),
    countryCode: /^[A-Z]{2}$/.test(cc) ? cc : '', lat: Math.round(lat * 1e4) / 1e4, lon: Math.round(lon * 1e4) / 1e4, timezone: tz,
  };
}

/** The brief settings with defaults filled in and bad values replaced. */
export function normBrief(v) {
  const b = isObj(v) ? v : {};
  const h = Math.round(Number(b.eveningHour));
  return {
    autoOpen: b.autoOpen !== false,
    advisorAuto: b.advisorAuto === true,
    ai: b.ai !== false,
    model: MODELS.includes(b.model) ? b.model : BRIEF_DEFAULTS.model,
    eveningHour: Number.isFinite(h) ? Math.max(12, Math.min(23, h)) : BRIEF_DEFAULTS.eveningHour,
    animations: b.animations !== false,
    celebrate: b.celebrate !== false,
    units: b.units === 'imperial' ? 'imperial' : 'metric',
    story: normStory(b.story),
  };
}
