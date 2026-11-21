/* The vale's folk live their days (94-garden-folk-*.js, npcs-PLAN Phase 1). The one visible switch. It stays OFF until section 1's rig
   (figures drawn facing any way, front and back walks with planted feet) is on main: npcs-PLAN 8 says the logic merges hidden and the
   visible switch flips only then, because today's folk are side-on figures that can only face left or right, and walking up or down the
   screen they would show a side view (the owner's 4-direction complaint). Off brings back the old daily callers, the painted old angler on
   the quay and the residents found at home, exactly as before. For checks a developer can turn it on for one browser:
   localStorage 'freeflo.dev.folkLive' = '1', then reload. Read at load by 94-garden-0island.js (the angler's quay seat stops blocking the
   feet once he walks), so it sorts before it and before 94-garden-0catalog.js, which reads the static rows at load. */
const VALE_FOLK_LIVE = (() => { try { return typeof localStorage !== 'undefined' && localStorage.getItem('freeflo.dev.folkLive') === '1'; } catch (e) { return false; } })();
