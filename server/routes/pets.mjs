// server/routes/pets.mjs - loads the pet rules so the friends kind 'profile' carries a friend's pet
// (lib/profile-pets.mjs adds the optional field 'pet' with extendProfileKind at load; every route file loads
// before the friends engine starts: docs/dev/FRIENDS.md section 9). No routes of its own: your pet is part of
// the state (state.pet, a synced UI key) and goes to friends inside your profile (profileExtend, 97-pets-1core.js).

import '../../lib/profile-pets.mjs';
import '../../lib/friends/pet-items.mjs';   // 2.19: the kind 'pet:items' (the accessories your pet wears, for friends)

export default function register() { /* nothing to register */ }
