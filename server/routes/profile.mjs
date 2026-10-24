// server/routes/profile.mjs - loads the profile rules so the friends kind 'profile' has its full schema
// (lib/profile-avatar.mjs calls defineKind at load; every route file loads before the friends engine starts:
// docs/dev/FRIENDS.md section 9). No routes of its own: the profile is part of the state (state.profile,
// a synced UI key) and goes to friends through Friends.publish('profile', body) on the page.

import '../../lib/profile-avatar.mjs';

export default function register() { /* nothing to register */ }
