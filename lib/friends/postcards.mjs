// lib/friends/postcards.mjs - the friends kind 'postcard' (2.17, agent 'scenes'): a scene from the app's own
// list, sent to a friend, who draws it with THEIR OWN scene engine (src/app/99s-friends-scenes-2postcards.js).
//
// ONLY IDS AND PLAIN TEXT CROSS THE WIRE. A postcard names a scene and a moment, never a picture:
//   {pack, item, tod, season, wx?, caption?, outfit?, at?}
//   - pack, item   the scene's registry ref is `${pack}/${item}`; each a safe id (letters, digits, - and _, 1 to 64).
//                  The receiving page looks the ref up in its own scene list: a scene it does not have is shown as
//                  a plain card ("update OpenDash to see it"), never fetched from anywhere
//   - tod          the time of day it shows: dawn | day | dusk | night (the gallery's preview moments)
//   - season       spring | summer | autumn | winter
//   - wx           the weather: one of the scene engine's kinds (SCENE_WEATHER_KINDS in src/app/70-scene-1weather.js)
//   - caption      one line of plain text, at most 140 characters (cleanLine: control, bidi and zero-width
//                  characters out); the page draws it with textContent only
//   - outfit       the sender's figure: one safe id per figure part of the avatar kit (src/app/97-profile-0kit.js
//                  PF_PARTS that dress the full figure); the page maps every id through the kit's own tables
//                  (profileAvatarNormalize), so an id it does not know is the default and no colour or markup
//                  from outside is ever drawn. Ids, not an allow-list here: a friend on a newer OpenDash with a
//                  new hat still gets their postcard through (the profile kind does the same)
//   - at           when it was written (ms)
// No URL, no image, no markup, no coordinates. Unknown fields are dropped; a wrong type or a value over its cap
// drops the whole message (lib/friends/core.mjs S.obj). A postcard is an event (kept in the feed, both ways),
// scope 'postcard' (the friends policy decides who may get one; a confirmed friend by default), 6 friendship XP.
//
// server/routes/postcards.mjs imports this module so the kind is defined before the friends engine starts
// (docs/dev/FRIENDS.md section 9). Node stdlib only (plus the friends core).

import { defineKind, S } from './core.mjs';

export const POSTCARD_TODS = Object.freeze(['dawn', 'day', 'dusk', 'night']);
export const POSTCARD_SEASONS = Object.freeze(['spring', 'summer', 'autumn', 'winter']);
/** The scene engine's weather kinds (keep in step with SCENE_WEATHER_KINDS, src/app/70-scene-1weather.js). */
export const POSTCARD_WEATHER = Object.freeze(['clear', 'partly', 'cloudy', 'rain', 'drizzle', 'showers', 'thunder', 'snow', 'sleet', 'fog', 'mist', 'frost']);
export const POSTCARD_CAPTION_MAX = 140;
/** The avatar parts that dress the full scene figure (the kit's profileFigureOpts reads these and only these). */
export const POSTCARD_OUTFIT_PARTS = Object.freeze(['skin', 'hair', 'hairCol', 'top', 'topCol', 'top2Col', 'bottom', 'bottomCol', 'shoes', 'shoesCol',
  'build', 'hat', 'hatCol', 'scarf', 'scarfCol', 'scarf2Col', 'bag', 'bagCol',
  // ── wardrobe ── (2.18: the kit's PF_FIGURE_PARTS, src/app/97-profile-0kit-6looks.js; a part at its default is left out by the sender)
  'facial', 'pattern', 'patCol', 'outer', 'outerCol', 'dress', 'dressCol', 'glasses', 'glassesCol', 'headphones', 'headphonesCol',
  'tie', 'tieCol', 'earrings', 'necklace', 'metal', 'watch', 'pin',
  // ── end wardrobe ──
]);

export const POSTCARD_SCHEMA = S.obj({
  pack: S.id(),
  item: S.id(),
  tod: S.oneOf(POSTCARD_TODS),
  season: S.oneOf(POSTCARD_SEASONS),
  wx: S.opt(S.oneOf(POSTCARD_WEATHER)),
  caption: S.opt(S.str(POSTCARD_CAPTION_MAX)),
  outfit: S.opt(S.obj(Object.fromEntries(POSTCARD_OUTFIT_PARTS.map(k => [k, S.opt(S.id())])))),
  at: S.opt(S.ms()),
});

defineKind('postcard', POSTCARD_SCHEMA, { store: 'event', scope: 'postcard', xp: 6, max: 2048 });
