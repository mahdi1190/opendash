// lib/profile-avatar.mjs - the profile and avatar rules for Node, and the schema of the friends kind 'profile'.
//
// The single source is the page's pure profile files: the avatar kit, src/app/97-profile-0kit.js (tables of
// every avatar part and colour, profileText, profileSanitize, profileWire, profileAvatarSvg) and, since 2.18,
// the look of the card, src/app/97-profile-0look.js (banners, the nameplate, titles, favourite emoji, the
// 'currently' line, the card tint). This module evaluates them once, in the page's order and in one scope, the
// way lib/brief-logic.mjs does, and re-exports what Node needs.
//
// It also REFINES the friends kind 'profile' (docs/dev/FRIENDS.md section 9: agent 'profile' owns it) with
// defineKind at load. server/routes/profile.mjs imports this module, and every route file loads before the
// friends engine starts, so the richer schema is the one in force. What a friend may send:
//   {name, pronouns?, bio?, emoji?, status?, until?, working?, color?, city?, avatar?, badges?, places?, look?, at?}
//   - text: one line each, capped (name 40, pronouns 24, bio 160, status 60, working on 80, a place 40,
//     'currently' 60); the friends core's cleanLine takes out control characters, and the page cleans again
//     (profileText: zero-width, bidi marks and overrides, runs of combining marks)
//   - emoji: one of the status emoji (PF_STATUS_EMOJI), nothing else
//   - avatar: safe ids only (letters, digits, - and _), bgCol a colour; the page maps every id through the
//     kit's tables (an id it does not know becomes the default, so a newer friend's new hat is not an error).
//     2.18 (the wardrobe): one field per part of PF_PARTS, about 70; profileWire sends only the parts that
//     differ from the default (a missing part IS the default everywhere), so a body stays well under the cap
//   - badges: achievement ids; places: {label, cc?} names, never coordinates
//   - look (2.18, agent 'you'): {banner?, col?, col2?, scene?: {pack, item}, np?: {font?, weight?, col?, fx?},
//     title?, favs?: [emoji], cur?: {k, t}, tint?}: ids, colours and one capped line; the page maps every id
//     through 97-profile-0look.js (unknown -> the default), a scene through ITS OWN scene list (a scene it
//     lacks is your colour), the emoji through PF_FAV_EMOJI. Ids and emoji are checked loosely HERE on
//     purpose (S.id / S.emoji, generous list caps): a newer friend's new banner or emoji must not make an
//     older app drop their whole card.
//   - no pictures, no URLs, no markup: an avatar and a banner are data, drawn on each side from the tables
//
// EXTENDING THE KIND (other agents, e.g. 'pets'): call extendProfileKind(field, schema) at the top level of a
// module a route file imports (so it runs before the engine starts; a later call works too, the kind is
// defined again). The field must be optional on the wire (it is wrapped in S.opt), and the page side
// registers the same field with profileExtend({key, wire, sanitize, card}) (97-profile-1core.js).
//
// Node stdlib only (plus the friends core).

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineKind, S } from './friends/core.mjs';

const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
export const SOURCE_FILE = join(APP_DIR, '97-profile-0kit.js');
// ── wardrobe ── (2.18: the kit is split into 97-profile-0kit-*.js, which sort before 97-profile-0kit.js the way
// build.mjs sorts them; they are evaluated together, in that order)
export const SOURCE_FILES = Object.freeze(readdirSync(APP_DIR).filter(f => /^97-profile-0kit(-[a-z0-9-]+)?\.js$/.test(f)).sort().map(f => join(APP_DIR, f)));
// ── end wardrobe ──
export const LOOK_FILE = join(APP_DIR, '97-profile-0look.js');

const NAMES = ['PF_MAX', 'PF_PARTS', 'PF_TABS', 'PF_SKIN', 'PF_HAIR', 'PF_CLOTH', 'PF_SWATCHES', 'PF_EYE_COLS', 'PF_METAL', 'PF_STATUS_EMOJI', 'PF_SEASONS',
  'PF_OUTFIT_PARTS', 'PF_FIGURE_PARTS', 'PF_LOOK_THEMES', 'PF_EXPRESSIONS',
  'pfPart', 'pfOptions', 'profileAvatarDefault', 'profileAvatarNormalize', 'profileAvatarRandom', 'profileLockOf', 'profileSeasonOn',
  'profileText', 'profileEmojiOk', 'profileSanitize', 'profileWire', 'profileFlag', 'profileAvatarSvg', 'profileOutfitOf', 'profileOutfitWear'];
// ── you ── (2.18) the look of the card, evaluated after the kit in the same scope (it uses the kit's palette and text cleaner)
const LOOK_NAMES = ['PF_LOOK_MAX', 'PF_BANNER_GROUPS', 'PF_BANNERS', 'PF_NP_FONTS', 'PF_NP_WEIGHTS', 'PF_NP_COLS', 'PF_NP_FX', 'PF_TITLES', 'PF_FAV_EMOJI',
  'PF_CURRENTLY', 'PF_TINTS', 'PF_LOOK_DEFAULT', 'pfBanner', 'pfTitle', 'profileFavOk', 'profileLookDefault', 'profileLookNormalize', 'profileLookWire',
  'profileLookLockOf', 'profileBannerCols', 'profileBannerSvg', 'profileNameplateCss'];
// ── end you ──
// eslint-disable-next-line no-new-func
const api = new Function(`"use strict";\n${SOURCE_FILES.concat([LOOK_FILE]).map(f => readFileSync(f, 'utf8')).join('\n;\n')}\nreturn { ${NAMES.concat(LOOK_NAMES).join(', ')} };`)();

export const {
  PF_MAX, PF_PARTS, PF_TABS, PF_SKIN, PF_HAIR, PF_CLOTH, PF_SWATCHES, PF_EYE_COLS, PF_METAL, PF_STATUS_EMOJI, PF_SEASONS,
  PF_OUTFIT_PARTS, PF_FIGURE_PARTS, PF_LOOK_THEMES, PF_EXPRESSIONS,
  pfPart, pfOptions, profileAvatarDefault, profileAvatarNormalize, profileAvatarRandom, profileLockOf, profileSeasonOn,
  profileText, profileEmojiOk, profileSanitize, profileWire, profileFlag, profileAvatarSvg, profileOutfitOf, profileOutfitWear,
} = api;
export const {
  PF_LOOK_MAX, PF_BANNER_GROUPS, PF_BANNERS, PF_NP_FONTS, PF_NP_WEIGHTS, PF_NP_COLS, PF_NP_FX, PF_TITLES, PF_FAV_EMOJI,
  PF_CURRENTLY, PF_TINTS, PF_LOOK_DEFAULT, pfBanner, pfTitle, profileFavOk, profileLookDefault, profileLookNormalize, profileLookWire,
  profileLookLockOf, profileBannerCols, profileBannerSvg, profileNameplateCss,
} = api;

/** Every status emoji with and without its variation selector (a keyboard may add or drop U+FE0F). */
export const STATUS_EMOJI_FORMS = Object.freeze([...new Set(PF_STATUS_EMOJI.flatMap(e => [e, e.replace(/\uFE0F/g, '')]))]);

// ── you ── (2.18) the look on the wire: loose ids and emoji (the page maps them), strict types and caps
/** The schema of the profile's `look` (see the header). */
export const LOOK_SCHEMA = S.obj({
  banner: S.opt(S.id()),
  col: S.opt(S.color()),
  col2: S.opt(S.color()),
  scene: S.opt(S.obj({ pack: S.id(), item: S.id() })),
  np: S.opt(S.obj({ font: S.opt(S.id()), weight: S.opt(S.id()), col: S.opt(S.id()), fx: S.opt(S.id()) })),
  title: S.opt(S.id()),
  favs: S.opt(S.list(S.emoji(), 16)),
  cur: S.opt(S.obj({ k: S.id(), t: S.str(PF_LOOK_MAX.currently) })),
  tint: S.opt(S.id()),
});
// ── end you ──

/** The fields of the friends kind 'profile' every version knows (see the header). */
const BASE_FIELDS = Object.freeze({
  name: S.str(PF_MAX.name),
  pronouns: S.opt(S.str(PF_MAX.pronouns)),
  bio: S.opt(S.str(PF_MAX.bio)),
  emoji: S.opt(S.oneOf(STATUS_EMOJI_FORMS)),
  status: S.opt(S.str(PF_MAX.status)),
  until: S.opt(S.ms()),
  working: S.opt(S.str(PF_MAX.working)),
  color: S.opt(S.color()),
  city: S.opt(S.str(PF_MAX.place)),
  avatar: S.opt(S.obj(Object.fromEntries(PF_PARTS.map(p => [p.k, S.opt(p.hex ? S.color() : S.id())])))),
  badges: S.opt(S.list(S.id(), PF_MAX.badges)),
  places: S.opt(S.list(S.obj({ label: S.str(PF_MAX.place), cc: S.opt(S.id()) }), PF_MAX.places)),
  look: S.opt(LOOK_SCHEMA),   // 2.18, agent 'you'
  at: S.opt(S.ms()),
});
const RESERVED = new Set(Object.keys(BASE_FIELDS).concat(['__proto__', 'constructor', 'prototype']));

// ── you ── (2.18) the extension registry: other agents add an optional field without editing the schema above
const EXTENSIONS = new Map();
const KIND_OPTS = Object.freeze({ store: 'latest', scope: 'profile', passive: true, max: 6144 });
/** The profile kind's schema now: the base fields plus every extension (each optional). */
export function profileSchema() {
  return S.obj(Object.assign({}, BASE_FIELDS, Object.fromEntries([...EXTENSIONS].map(([k, sch]) => [k, S.opt(sch)]))));
}
/**
 * Add an optional field to the friends kind 'profile' (e.g. agent 'pets': extendProfileKind('pet', S.obj({...}))).
 * field: /^[a-z][A-Za-z0-9]{1,23}$/, not one of the base fields; schema: a schema built with S (lib/friends/core.mjs).
 * Defines the kind again at once. -> true, or false when refused (a bad name or schema).
 */
export function extendProfileKind(field, schema) {
  if (typeof field !== 'string' || !/^[a-z][A-Za-z0-9]{1,23}$/.test(field) || RESERVED.has(field)) return false;
  if (!schema || typeof schema.f !== 'function') return false;
  EXTENSIONS.set(field, schema);
  defineKind('profile', profileSchema(), KIND_OPTS);
  return true;
}
/** The extension fields registered so far. */
export function profileExtensions() { return [...EXTENSIONS.keys()]; }
// ── end you ──

/** The schema of the friends kind 'profile' as defined at load (see the header; extensions: profileSchema()). */
export const PROFILE_SCHEMA = profileSchema();
defineKind('profile', PROFILE_SCHEMA, KIND_OPTS);
