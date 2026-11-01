// lib/profile-catch.mjs - the 'catch' field of the friends kind 'profile' (OpenDash 2.22, fishing and bug catching).
//
// What a friend may send on their profile card, next to the avatar and the pet:
//   catch: {f?: [{i, q, c}] (up to 6 fish: the kind, its quality 0..3 and its size in cm), b?: [bugId] (up to 9),
//           rod?: 1..5, net?: 1..4}
// Ids only; the page maps every id through the fish and bug tables (src/app/94-garden-fish-0catalog.js, gardenShowClean),
// so a newer friend's new fish is just not drawn and nothing a friend sends is ever written into the markup.
//
// It ADDS the optional field through agent 'you's extension hook (lib/profile-avatar.mjs extendProfileKind), like lib/profile-pets.mjs;
// the page side registers the same field with profileExtend (src/app/97-profile-5catch.js). server/routes/garden-social.mjs imports
// this module, and every route file loads before the friends engine starts. Node stdlib only (plus the friends core).

import { S } from './friends/core.mjs';
import * as profileRules from './profile-avatar.mjs';

/** The schema of the profile kind's 'catch' field (see the header). */
export const CATCH_SCHEMA = S.obj({
  f: S.opt(S.list(S.obj({ i: S.id(), q: S.int(0, 3), c: S.int(1, 400) }), 6)),
  b: S.opt(S.list(S.id(), 9)),
  rod: S.opt(S.int(1, 5)),
  net: S.opt(S.int(1, 4)),
});

const extend = typeof profileRules.extendProfileKind === 'function' ? profileRules.extendProfileKind : null;
export const CATCH_FIELD_ADDED = extend ? extend('catch', CATCH_SCHEMA) : false;
