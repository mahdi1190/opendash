/* ============================================================
   GARDENS WITH FRIENDS, the rules (2.18, agent 'garden-social'; docs/dev/GARDEN.md section 11).
   PURE: tables and small functions, no DOM, no state. lib/friends/garden.mjs evaluates this file
   together with the catalogue (94-garden-0catalog.js), so what the page offers and what the server
   accepts from a friend are the same tables.

   What crosses to a friend is ids, cells and numbers, plus one capped line of plain text (a
   guestbook signature). A friend's app never writes your garden: it sends a small, capped request
   ("Sam watered the sunflower at 9,6") that YOUR app checks against your own garden and applies
   only when it fits (gsocBoostOk). Nothing here ever reaches Claude, the MCP or People.

     GSOC_REACTS         the emoji reactions a visitor may leave (allow-listed ids; the emoji are drawn
                         from this table on each side, never sent)
     GSOC_ACTS           what a visit can do: visit, water, gift, react, sign, like
     GSOC_CAPS           per-day caps: send[t] / recv[t] = [all friends, one friend]
     GSOC_BOOST          a friend's watering: +hours of growth, at most once a plant a day, a few a day
     GSOC_XP             your garden XP for each kind of visit act (once a friend a day, by the caps)
     GSOC_TEXT_MAX       a guestbook line (characters)
     gsocText(s)         a guestbook line cleaned (one line, no control, bidi or zero-width marks)
     gsocGiftOk(k, id)   may this be given? k 'seed' | 'decor'
     gsocWaterOk(id)     does this plant take water from a visitor? (not the old oak, not pond plants)
     gsocActOk(b)        '' or why an act's body does not fit the tables
     gsocReact(id)       the reaction row, or null
     GSOC_BED / gsocBedPlantOk(def) / gsocBedState(el, def, now, season)
                         the co-op bed of a Together space (lib/friends/spaces.mjs part 'bed')
   ============================================================ */
const GSOC_V = 1;
const GSOC_REACTS = Object.freeze([
  Object.freeze({ id: 'lovely', e: '🌸', label: 'Lovely' }),
  Object.freeze({ id: 'sunny', e: '🌻', label: 'Sunny' }),
  Object.freeze({ id: 'buzzing', e: '🐝', label: 'Buzzing with life' }),
  Object.freeze({ id: 'magic', e: '✨', label: 'Magical' }),
  Object.freeze({ id: 'green', e: '💚', label: 'So green' }),
  Object.freeze({ id: 'wow', e: '🤩', label: 'Wow' }),
  Object.freeze({ id: 'cosy', e: '🍵', label: 'Cosy' }),
  Object.freeze({ id: 'flutter', e: '🦋', label: 'Fluttery' }),
  Object.freeze({ id: 'stone', e: '🪨', label: 'A stone for the cairn' }),   // docs/dev/HUNDRED_WORLD.md: it stays, in the world, by their gate
]);
const GSOC_REACT_IDS = Object.freeze(GSOC_REACTS.map(r => r.id));
/** Each act: its icon, what the visitor's button says, and how it reads for the gardener. */
const GSOC_ACTS = Object.freeze({
  visit: Object.freeze({ icon: 'footprints', verb: 'Visit', past: 'visited your garden' }),
  water: Object.freeze({ icon: 'droplet', verb: 'Water a plant', past: 'watered your' }),
  gift: Object.freeze({ icon: 'gift', verb: 'Leave a gift', past: 'left you a parcel' }),
  react: Object.freeze({ icon: 'smile-plus', verb: 'React', past: 'loved your garden' }),
  sign: Object.freeze({ icon: 'feather', verb: 'Sign the guestbook', past: 'signed your guestbook' }),
  like: Object.freeze({ icon: 'heart', verb: 'Give a heart', past: 'gave your garden a heart' }),
});
const GSOC_ACT_IDS = Object.freeze(Object.keys(GSOC_ACTS));
/** [all friends a day, one friend a day]. Sending is checked by the sender, receiving by the gardener's app. */
const GSOC_CAPS = Object.freeze({
  send: Object.freeze({ visit: [12, 1], water: [5, 1], gift: [3, 1], react: [16, 3], sign: [6, 1], like: [12, 1], ask: [40, 6] }),
  recv: Object.freeze({ visit: [60, 1], water: [12, 1], gift: [8, 1], react: [80, 3], sign: [30, 1], like: [80, 1], ask: [200, 8] }),
  askGapMs: 10 * 60 * 1000,      // a friend's "send me your garden" is answered at most this often
  unopened: 12,                  // parcels waiting to be unwrapped, from one friend
});
const GSOC_BOOST = Object.freeze({ hours: 3, perDay: 6, maxAgeDays: 30 });
const GSOC_XP = Object.freeze({ visit: 2, water: 3, gift: 3, sign: 2, like: 1, react: 1 });
const GSOC_TEXT_MAX = 140;
const GSOC_BOOK_KEEP = 200;

/** A guestbook line: one line, no control characters, no bidi overrides or zero-width marks, capped. */
function gsocText(s) {
  if (typeof s !== 'string') return '';
  let t = s.normalize ? s.normalize('NFC') : s;
  t = t.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/[​-‏‪-‮⁠-⁩﻿­]/g, '')
    .replace(/(\p{M}{3})\p{M}+/gu, '$1')
    .replace(/\s+/g, ' ').trim();
  const cps = Array.from(t);
  return cps.length > GSOC_TEXT_MAX ? cps.slice(0, GSOC_TEXT_MAX).join('').trim() : t;
}
function gsocReact(id) { return GSOC_REACTS.find(r => r.id === id) || null; }
/** Gifts: any decoration; any seed but the ones found only (the four-leaf clover) and the old oak; a fish or a bug you caught (2.22). */
function gsocGiftOk(k, id) {
  if (k === 'decor') return !!gardenDecor(id);
  // 2.22: a caught fish ('carp-2': its kind and quality) or bug (94-garden-fish-0catalog.js); never junk or treasure
  if (k === 'fish') { const m = /^([a-z0-9-]+)-([0-3])$/.exec(String(id)); const d = m && typeof gardenFishDef === 'function' ? gardenFishDef(m[1]) : null; return !!d && d.cat === 'fish'; }
  if (k === 'bug') return typeof gardenBugDef === 'function' && !!gardenBugDef(id);
  if (k !== 'seed') return false;
  const p = gardenPlant(id);
  return !!p && p.special !== 'heart' && !(p.unlock && p.unlock.find);
}
/** A visitor's can: plants that drink (not the old oak, not what lives in the pond). */
function gsocWaterOk(id) { const p = gardenPlant(id); return !!p && p.thirst > 0 && p.special !== 'heart'; }
/** '' when an act's body fits the tables, else a short reason (never shown to the friend). */
function gsocActOk(b) {
  if (!b || typeof b !== 'object' || !GSOC_ACT_IDS.includes(b.t)) return 'kind';
  if (b.t === 'water') {
    if (!gsocWaterOk(b.p)) return 'plant';
    if (!Number.isInteger(b.x) || !Number.isInteger(b.y) || b.x < 0 || b.y < 0 || b.x >= GARDEN_WORLD.cols || b.y >= GARDEN_WORLD.rows) return 'cell';
  }
  if (b.t === 'gift' && !gsocGiftOk(b.k, b.item)) return 'gift';
  if (b.t === 'react' && !gsocReact(b.e)) return 'react';
  if (b.t === 'sign' && !gsocText(b.txt)) return 'text';
  return '';
}

/* ---------- the co-op bed of a Together space ----------
   A raised bed of 8 x 3 cells that everyone in the space plants in (lib/friends/spaces.mjs part 'bed': an
   element {id, by, at, plant, x, y, v} per plant, and a map water {memberKey: ms}, each member's own last
   watering). It grows from time and season like the garden, slower when it is dry, and every member who
   has watered it adds GSOC_BED.bonusH hours (at most maxWaterers): the more of you tend it, the faster it
   blooms. Worked out the same on every member's computer from the space's data. Nothing dies. */
const GSOC_BED = Object.freeze({ cols: 8, rows: 3, max: 24, bonusH: 4, maxWaterers: 6, waterGapH: 6 });
function gsocBedPlantOk(def) {
  return !!def && (def.fp || 1) === 1 && def.cat !== 'tree' && def.cat !== 'water' && !def.special && !(def.unlock && def.unlock.find);
}
/** {stage, eff, thirsty, dry, waterers, lastWater, nextIn, inSeason} for one bed element at `now`. */
function gsocBedState(el, def, now, season) {
  const H = 3600000;
  const t0 = Number(el && el.at) || now;
  const water = el && el.water && typeof el.water === 'object' ? el.water : {};
  let last = t0, waterers = 0;
  for (const v of Object.values(water)) { const w = Number(v) || 0; if (w > t0) { waterers++; if (w > last && w <= now + 600000) last = w; } }
  const inSeason = gardenInSeason(def, season);
  const sf = inSeason ? 1.3 : 0.8;
  const dry = def.thirst ? Math.max(0, (now - last) / H - def.thirst) : 0;
  const realH = Math.max(0, (now - t0) / H);
  const eff = Math.max(0, realH - 0.5 * dry) * sf + GSOC_BED.bonusH * Math.min(GSOC_BED.maxWaterers, waterers);
  const stage = gardenStageAt(def, eff);
  const nextIn = stage < 4 ? Math.max(0.1, (gardenHoursFor(def, stage + 1) - eff) / sf) : null;
  return { stage, eff, thirsty: dry > 0, dry, waterers, lastWater: last, nextIn, inSeason };
}
