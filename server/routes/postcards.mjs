// server/routes/postcards.mjs - loads the postcard rules so the friends kind 'postcard' has its schema
// (lib/friends/postcards.mjs calls defineKind at load; every route file loads before the friends engine starts:
// docs/dev/FRIENDS.md section 9), the way server/routes/profile.mjs loads lib/profile-avatar.mjs. No routes of
// its own: the page sends a postcard with friendsFeedPost({kind: 'postcard', to, body}) (POST /api/friends/feed,
// with the normal router's local-only protections) and reads them back with GET /api/friends/feed?kind=postcard.

import '../../lib/friends/postcards.mjs';

export default function register() { /* nothing to register */ }
