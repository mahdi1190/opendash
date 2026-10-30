// lib/friends/pet-items.mjs - the accessories your pet wears, for your friends (OpenDash 2.22, agent 'pets').
//
// Kind (defined at load; server/routes/pets.mjs imports this module, and every route file loads before the friends engine starts):
//   pet:items   latest   scope profile   {v: 1, d: 'YYYY-MM-DD', items: [design]}   at most 3 designs, the ones your pet wears NOW
//
// A design is data, never markup (src/app/97-pets-0kititems.js): {v, id, label, slot: head|face|neck, cols: [#rrggbb x1-3],
// shapes: [{p (path data), f?, s? (colour references k1..k3 + tone, w, i), w?, o?}], fit?: {dx, dy, s, rot}}. It is the same
// design that sits in your My designs, without your description and with the fit already chosen for YOUR pet's species. No
// pictures, no URLs, no text but the short label.
//
// Why a kind of its own: the profile kind is capped at 6 KB and an app without this kind would drop the WHOLE profile
// if a field went past that, so a pet that wears a wig must never make the profile bigger. An app that does not know
// 'pet:items' simply ignores the kind and shows the plain pet.
//
// Who gets it: whoever gets your profile (scope 'profile': the per-friend Profile permission, on by default). It is
// sent when what your pet wears changes, and at most once a day otherwise (the `d` field makes the body differ), so a
// friend whose profile sharing came back gets it again. The receiver's page checks every design again with
// petItemClean before it draws anything (97-pets-1core.js), and a friend's designs never reach Claude, the MCP or the
// actions layer: they are drawn, nothing else.
//
// Node stdlib only (plus the friends core and the pet kit).

import { defineKind, S } from './core.mjs';
import { PET_ITEM } from '../profile-pets.mjs';

const SHAPE = S.obj({ p: S.str(PET_ITEM.maxPath), f: S.opt(S.str(4)), s: S.opt(S.str(4)), w: S.opt(S.num(0.4, 14)), o: S.opt(S.num(0.1, 1)) });
const FIT = S.obj({ dx: S.num(-PET_ITEM.fit.dx, PET_ITEM.fit.dx), dy: S.num(-PET_ITEM.fit.dy, PET_ITEM.fit.dy), s: S.num(PET_ITEM.fit.smin, PET_ITEM.fit.smax), rot: S.num(-PET_ITEM.fit.rot, PET_ITEM.fit.rot) });
const DESIGN = S.obj({
  v: S.int(1, 1), id: S.str(16), label: S.str(PET_ITEM.maxLabel), slot: S.oneOf(['head', 'face', 'neck']),
  cols: S.list(S.color(), PET_ITEM.maxCols), shapes: S.list(SHAPE, PET_ITEM.maxShapes), fit: S.opt(FIT),
});
export const PET_ITEMS_SCHEMA = S.obj({ v: S.int(1, 1), d: S.opt(S.day()), items: S.list(DESIGN, 3) });
export const PET_ITEMS_MAX_BYTES = 24 * 1024;

defineKind('pet:items', PET_ITEMS_SCHEMA, { store: 'latest', scope: 'profile', passive: true, max: PET_ITEMS_MAX_BYTES });
