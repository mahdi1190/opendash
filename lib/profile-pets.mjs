// lib/profile-pets.mjs - the pet rules for Node, and the 'pet' field of the friends kind 'profile' (2.18, agent 'pets').
//
// The single source is the page's pure pet kit, src/app/97-pets-0kit.js (the species, coats, markings, accessories and
// colours, petText, petWire, petSanitize): this module evaluates it once, the way lib/profile-avatar.mjs evaluates the
// avatar kit, and re-exports what Node needs.
//
// It ADDS the optional field 'pet' to the friends kind 'profile' through agent 'you's extension hook
// (lib/profile-avatar.mjs extendProfileKind; the page side registers the same field with profileExtend in
// 97-pets-1core.js). server/routes/pets.mjs imports this module, and every route file loads before the friends
// engine starts. What a friend may send:
//   pet: {species, breed?, coat?, marks?, eyes?, collar?, collarCol?, bandana?, bandanaCol?, bow?, bowCol?,
//         hat?, hatCol?, glasses?, glassesCol?, name?, walks?}
//   - every value but the name is an id (letters, digits, - and _): the page maps each one through the kit's tables
//     (petSanitize: an unknown species means no pet, any other unknown id becomes the default), so a newer friend's
//     new hat is not an error and nothing a friend sends is ever written into the markup
//   - name: one line of plain text, at most 24 characters (the friends core's cleanLine, then the page's petText)
//   - walks: false when their pet stays home while they visit your scenes
//   - no pictures, no URLs, no markup
//
// Node stdlib only (plus the friends core and the profile rules).

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { S } from './friends/core.mjs';
import * as profileRules from './profile-avatar.mjs';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
export const SOURCE_FILE = join(APP, '97-pets-0kit.js');
/** The custom accessories' rules (2.22): evaluated together with the kit, so one scope, one source for the page and the server. */
export const ITEMS_FILE = join(APP, '97-pets-0kititems.js');

const NAMES = ['PET_MAX', 'PET_SPECIES', 'PET_ACC', 'PET_ACC_COLS', 'PET_EYES', 'PET_TRICKS', 'PET_FIELDS', 'PET_SEASONS', 'PET_STYLE_FIELDS',
  'petSpecies', 'petOptions', 'petDefault', 'petNormalize', 'petRandom', 'petLockOf', 'petSeasonOn', 'petText', 'petWire', 'petSanitize', 'petHexOf',
  'PET_ITEM', 'PET_ITEM_SLOTS', 'petItemClean', 'petItemWire', 'petItemSig', 'petItemFitOf', 'petItemPathSegs', 'petItemCovers'];
// eslint-disable-next-line no-new-func
const api = new Function(`"use strict";\n${readFileSync(SOURCE_FILE, 'utf8')}\n${readFileSync(ITEMS_FILE, 'utf8')}\nreturn { ${NAMES.join(', ')} };`)();

export const {
  PET_MAX, PET_SPECIES, PET_ACC, PET_ACC_COLS, PET_EYES, PET_TRICKS, PET_FIELDS, PET_SEASONS, PET_STYLE_FIELDS,
  petSpecies, petOptions, petDefault, petNormalize, petRandom, petLockOf, petSeasonOn, petText, petWire, petSanitize, petHexOf,
  PET_ITEM, PET_ITEM_SLOTS, petItemClean, petItemWire, petItemSig, petItemFitOf, petItemPathSegs, petItemCovers,
} = api;

/** The schema of the profile kind's 'pet' field (see the header). */
export const PET_SCHEMA = S.obj(Object.assign(
  Object.fromEntries(PET_FIELDS.map(f => [f, f === 'species' ? S.id() : S.opt(S.id())])),
  { name: S.opt(S.str(PET_MAX.name)), walks: S.opt(S.bool()) },
));

// The hook is agent 'you's (2.18). Guarded: a build without it simply does not carry pets to friends.
const extend = typeof profileRules.extendProfileKind === 'function' ? profileRules.extendProfileKind : null;
export const PET_FIELD_ADDED = extend ? extend('pet', PET_SCHEMA) : false;
