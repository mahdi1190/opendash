/* The vale's folk live their days (94-garden-folk-*.js, npcs-PLAN Phase 1). The one visible switch: ON now that the folk walk every way
   round on the gardener's rig (94-garden-art-g-cast2.js front and back drawings, the side drawing mirrored, legs driven by the shared stride
   rig _gmvStride with planted feet). Off brings back the old daily callers, the painted old angler on the quay and the residents found at
   home, exactly as before: a developer can turn it off for one browser with localStorage 'freeflo.dev.folkLive' = '0', then reload.
   Read at load by 94-garden-0island.js (the angler's quay seat stops blocking the feet once he walks), so it sorts before it and before
   94-garden-0catalog.js, which reads the static rows at load. */
const VALE_FOLK_LIVE = (() => { try { return !(typeof localStorage !== 'undefined' && localStorage.getItem('freeflo.dev.folkLive') === '0'); } catch (e) { return true; } })();
