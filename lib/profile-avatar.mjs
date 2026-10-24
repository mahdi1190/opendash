// lib/profile-avatar.mjs - the profile and avatar rules for Node, and the schema of the friends kind 'profile'.
//
// The single source is the page's pure avatar kit, src/app/97-profile-0kit.js (tables of every avatar part
// and colour, profileText, profileSanitize, profileWire, profileAvatarSvg): this module evaluates it once, the
// way lib/brief-logic.mjs does, and re-exports what Node needs.
//
// It also REFINES the friends kind 'profile' (docs/dev/FRIENDS.md section 9: agent 'profile' owns it) with
// defineKind at load. server/routes/profile.mjs imports this module, and every route file loads before the
// friends engine starts, so the richer schema is the one in force. What a friend may send:
//   {name, pronouns?, bio?, emoji?, status?, until?, working?, color?, city?, avatar?, badges?, places?, at?}
//   - text: one line each, capped (name 40, pronouns 24, bio 160, status 60, working on 80, a place 40);
//     the friends core's cleanLine takes out control characters, and the page cleans again (profileText:
//     zero-width, bidi marks and overrides, runs of combining marks)
//   - emoji: one of the status emoji (PF_STATUS_EMOJI), nothing else
//   - avatar: safe ids only (letters, digits, - and _), bgCol a colour; the page maps every id through the
//     kit's tables (an id it does not know becomes the default, so a newer friend's new hat is not an error)
//   - badges: achievement ids; places: {label, cc?} names, never coordinates
//   - no pictures, no URLs, no markup: an avatar is data, drawn on each side from the kit
//
// Node stdlib only (plus the friends core).

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineKind, S } from './friends/core.mjs';

export const SOURCE_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', '97-profile-0kit.js');

const NAMES = ['PF_MAX', 'PF_PARTS', 'PF_TABS', 'PF_SKIN', 'PF_HAIR', 'PF_CLOTH', 'PF_SWATCHES', 'PF_EYE_COLS', 'PF_STATUS_EMOJI', 'PF_SEASONS',
  'pfPart', 'pfOptions', 'profileAvatarDefault', 'profileAvatarNormalize', 'profileAvatarRandom', 'profileLockOf', 'profileSeasonOn',
  'profileText', 'profileEmojiOk', 'profileSanitize', 'profileWire', 'profileFlag', 'profileAvatarSvg'];
// eslint-disable-next-line no-new-func
const api = new Function(`"use strict";\n${readFileSync(SOURCE_FILE, 'utf8')}\nreturn { ${NAMES.join(', ')} };`)();

export const {
  PF_MAX, PF_PARTS, PF_TABS, PF_SKIN, PF_HAIR, PF_CLOTH, PF_SWATCHES, PF_EYE_COLS, PF_STATUS_EMOJI, PF_SEASONS,
  pfPart, pfOptions, profileAvatarDefault, profileAvatarNormalize, profileAvatarRandom, profileLockOf, profileSeasonOn,
  profileText, profileEmojiOk, profileSanitize, profileWire, profileFlag, profileAvatarSvg,
} = api;

/** Every status emoji with and without its variation selector (a keyboard may add or drop U+FE0F). */
export const STATUS_EMOJI_FORMS = Object.freeze([...new Set(PF_STATUS_EMOJI.flatMap(e => [e, e.replace(/\uFE0F/g, '')]))]);

/** The schema of the friends kind 'profile' (see the header). */
export const PROFILE_SCHEMA = S.obj({
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
  at: S.opt(S.ms()),
});
defineKind('profile', PROFILE_SCHEMA, { store: 'latest', scope: 'profile', passive: true, max: 4096 });
