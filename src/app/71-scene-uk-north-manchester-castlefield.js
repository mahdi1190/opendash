/* ============================================================
   COMPOSED SCENES (v2, by hand) uk-north / Manchester, Castlefield: four views of the canal basin, its viaducts and its fort.
   docs/dev/SCENE_ENGINE_V2.md. The ground plans and the in-perspective objects (viaducts, Merchants' Bridge, narrowboats,
   the Roman gate, the shipping holes, the frames) are SCENE_MCF in 70-scene-lib-manchester-castlefield.js; the warehouses
   and the towers are the engine's generated buildings on real-sized footprints (red-brick 'mill', 'modern-glass').
   Registered by 72-anim-pack-uk-north-manchester-castlefield.js.

     1 basin       Slate Wharf, looking east down the basin: boats on the north quay, Merchants' Bridge, the two viaducts
                   striding over the water, Beetham Tower and the Deansgate towers beyond
     2 viaducts    the towpath at Castlefield Junction, looking west-south-west under three viaducts, layer on layer
     3 warehouses  from the crown of Merchants' Bridge up the reach to the Middle Warehouse and Merchants' Warehouse
     4 fort        Castlefield Arena's lawn, the reconstructed north gate of Mamucium, the tram viaduct striding past behind it
   The trams and trains run on timed pixel paths along the deck (real speed, a scale by row), drawn between the back and the
   front of their viaduct (the front is one depth band nearer), so they pass between the girders and behind the parapets.
   PURE: functions only; each builds its scene data once, lazily.
     https://www.castlefield.org.uk
   ============================================================ */

/* ---------- 1: the basin from Slate Wharf ---------- */
function sceneUkNorthMcfBasin() { return null; }   // superseded: a world scene (79-world-zzgallery.js OPENING) draws this item; the old builder is gone

/* ---------- 2: under the viaducts at Castlefield Junction ---------- */
function sceneUkNorthMcfViaducts() { return null; }   // superseded: a world scene (79-world-zzgallery.js OPENING) draws this item; the old builder is gone

/* ---------- 3: from Merchants' Bridge up the reach to the warehouses ---------- */
function sceneUkNorthMcfWarehouses() { return null; }   // superseded: a world scene (79-world-zzgallery.js OPENING) draws this item; the old builder is gone

/* ---------- 4: the Roman fort's north gate from Castlefield Arena ---------- */
function sceneUkNorthMcfFort() { return null; }   // superseded: a world scene (79-world-zzgallery.js OPENING) draws this item; the old builder is gone
