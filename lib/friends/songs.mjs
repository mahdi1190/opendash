// lib/friends/songs.mjs - songs between friends (Freeflo 2.26): the friends kind 'song' and the profile field 'music'.
//
// ONLY IDS AND PLAIN TEXT CROSS THE WIRE. A song suggestion names a Spotify item; it never carries a picture or a link:
//   song: {t: track | album | playlist | artist, id (22 letters and digits), n (the name, 100), by? (the artist or
//          owner, 100), note? (one line, 140), at?}
//   The receiving page makes the link itself (https://open.spotify.com/<t>/<id>, from an id that passed the check
//   below) and asks its OWN server for the cover (GET /api/spotify/art, which only ever asks Spotify, by id).
//   A song is an event (kept in the feed, both ways), scope 'song' (the friends policy decides who may get one: a
//   confirmed friend by default; "Stop sharing" stops it too), 3 friendship XP.
//
//   music (an optional field of the friends kind 'profile', added with extendProfileKind like 'pet' and 'catch'):
//   {f?: [{t, id, n, by?}] (up to 3 favourites: a song, an album, a playlist, an artist),
//    a?: [{id, n}] (up to 5 top artists), r?: short | medium | long (which stretch of listening the artists are from)}
//   Kept small on purpose: an app that does not know the field drops it, and one whose profile body is over its cap
//   drops the whole profile (97-profile-1core.js takes extension fields out first when the card gets large).
//
// server/routes/spotify.mjs imports this module, so both are defined before the friends engine starts
// (docs/dev/FRIENDS.md section 9). Node stdlib only (plus the friends core).

import { defineKind, S } from './core.mjs';
import * as profileRules from '../profile-avatar.mjs';

export const SONG_TYPES = Object.freeze(['track', 'album', 'playlist', 'artist']);
export const SONG_NOTE_MAX = 140;
export const MUSIC_RANGES = Object.freeze(['short', 'medium', 'long']);

// A Spotify id is 22 letters and digits. S has no pattern schema, so a schema is written by hand: {f, opt}. The
// invalid marker is whatever S gives back for a bad value.
const BAD = S.id().f('');
const spotifyId = Object.freeze({ f: (v) => (typeof v === 'string' && /^[0-9A-Za-z]{22}$/.test(v) ? v : BAD), opt: false });

export const SONG_SCHEMA = S.obj({
  t: S.oneOf(SONG_TYPES),
  id: spotifyId,
  n: S.str(100),
  by: S.opt(S.str(100)),
  note: S.opt(S.str(SONG_NOTE_MAX)),
  at: S.opt(S.ms()),
});
defineKind('song', SONG_SCHEMA, { store: 'event', scope: 'song', xp: 3, max: 1024 });

export const MUSIC_SCHEMA = S.obj({
  f: S.opt(S.list(S.obj({ t: S.oneOf(SONG_TYPES), id: spotifyId, n: S.str(80), by: S.opt(S.str(60)) }), 3)),
  a: S.opt(S.list(S.obj({ id: spotifyId, n: S.str(50) }), 5)),
  r: S.opt(S.oneOf(MUSIC_RANGES)),
});
const extend = typeof profileRules.extendProfileKind === 'function' ? profileRules.extendProfileKind : null;
export const MUSIC_FIELD_ADDED = extend ? extend('music', MUSIC_SCHEMA) : false;
