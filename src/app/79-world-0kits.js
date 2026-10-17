/* ============================================================
   WORLD ENGINE (scene format v3.1): STYLE KITS (docs/dev/WORLD_ENGINE.md 12.3 'Style kits'; WORLD_ENGINE_REQUIREMENTS.md N1, N2,
   N3, P5, P6, C3). Package `kb`, private prefix _wkt. PURE classic script: only frozen data and functions at load; the object
   library (sceneObj) and the knowledge base (worldKb, worldKbRegionOk) are read through typeof guards when called.

   A kit is the curated set of the BEST library objects for one kind of place, so a new place inherits gold-standard parts
   without an example to copy. The fill (79-world-1fill.js), its edge dressing, its framing foreground and the default backdrop
   draw from the kit BY DEFAULT: WORLD_FILL_STYLES is built from these kits. Weak objects (blob, lollipop and stacked-ball trees,
   placeholder planks, poles and slabs: SCENE_LESSONS A) are in WORLD_KIT_WEAK and may never appear in a kit; dome-crowned
   trees are allowed only in the `distant` band (beyond 120 m), where their shape no longer reads.

     WORLD_KIT_WEAK                  object -> why it is excluded from every kit
     WORLD_KIT_DISTANT_ONLY          objects allowed only in a kit's `distant` lists (round domes: fine at 120 m, weak nearer)
     WORLD_KIT_TRUNK_ONLY            objects allowed only as a framing bough's parent trunk (it stands just outside the frame)
     WORLD_STYLE_KITS                the kits: canal, pond, heath, woodland, village-green, river-city, civic-square, quayside, waterfront-city,
                                     terraced-street, park, moor, coast (and farmland, downs)
     WORLD_KIT_ALIAS                 legacy fill / backdrop style names -> kit (canal-wooded -> canal, city-victorian -> civic-square ...)
     worldKit(key)                   -> the kit of a kit id or an alias, or null
     worldKitIds(kit)                -> [{ id, slot }] every object id the kit names, with the slot that names it
     worldKitCheck(o)                -> [{ kit, slot, id, rule, msg }]: a kit entry for a missing library object (kitMissing), an
                                        object with no descriptor (kitNoKb), a weak object (kitWeak), a dome tree nearer than the
                                        distant band (kitDome), a trunk-only object in a visible slot (kitTrunk), a class that does
                                        not belong in its slot (kitClass), an object that is not valid in the UK (kitRegion) or
                                        breaks the care rules (kitCare). Empty when every kit is sound: the tests fail LOUDLY on
                                        any entry, and the fill never falls back to a weaker object (it skips the entry and logs).
     worldKitFillStyle(key)          -> the fill style record of a kit (the shape the fill reads: fill, edges, frame, rich, life ...)

   Kit shape (every list is [[object id, weight], ...]):
     { label, place: 'rural' | 'park' | 'town' | 'city' (the density and richness kind), backdrop (a WORLD_BACKDROP_STYLES key),
       ground (what bare ground is), sky: [min, max] (the frame's sky share, N2), layers (the depth layers to show, N2),
       look: { grass, path, paving, quay, bank } (the ground detail looks, 79-world-4ground.js), bare: { ground, paving, near } (the most
       undressed ground and bare paving the strict critic allows, and the least dressed near band: 0.15, 0.1 and 0.6 unless the
       setting is open by nature, a civic square),
       fill: { <group>: { near (z < 12 m: low dressing), mid (12-35 m), far (35-120 m: structured trees only), distant (beyond),
               accents (seasonal and occasional), maxH (the tallest near and mid dressing, or per band: { near, mid }), max (paving furniture per band) } },
       edges: { water: { <water kind>: 'natural' | 'urban' | 'quay' | 'none' }, natural: { margin, bank, stands }, quay: { top },
                verge, vergeShare, hedgerow, wallBase, kerb, pavement },
       frame: [{ kind: 'bough', bough, trunk } | { kind: 'fronds', fronds, trunk } | { kind, obj }] (the framing options, best first),
       rich: { mid, far } (the richness tier's perennial pools),
       life: { walk: { who, rate, mix }, paving: { who, rate }, water: [{ who, count }], graze: [{ who, count }] } (N3) }
   How to add a kit: docs/dev/WORLD_ENGINE.md 12.3 'Style kits'.
   ============================================================ */

/* ---------- what may never be in a kit ---------- */
const WORLD_KIT_WEAK = Object.freeze({
  'tree.pond-wood': 'a row of round blobs (SCENE_LESSONS A)', 'tree.pond-oak': 'a lollipop dome on a stick (SCENE_LESSONS A)',
  'tree.pool-oak': 'a round dome (SCENE_LESSONS A)', 'tree.birch-heath': 'stacked balls on a pole (SCENE_LESSONS A)',
  'tree.pond-pine': 'flat discs on a stick (a dark disc canopy in winter)', 'tree.pond-alder': 'stacked balls (lollipop)',
  'tree.pond-birch': 'stacked balls on a pole', 'tree.pond-willow': 'a dome with streaks, no limbs', 'tree.plane': 'a lollipop dome on a pole',
  'tree.bank-birch': 'stacked balls on a pole; a bare white pole in winter', 'ground.log': 'reads as a plank or slab side-on in perspective',
  'tree.fpv-fallen-pine': 'a placeholder pole when seen end-on', 'tree.wp-treeline': 'a flat band, not a tree',
});
const WORLD_KIT_DISTANT_ONLY = Object.freeze(['tree.bank-oak', 'tree.bank-alder', 'tree.bank-willow', 'tree.bank-distant', 'tree.far-broad', 'tree.far-birch',
  'tree.far-pine', 'tree.distant', 'tree.distant-pine', 'tree.woods-edge', 'plant.shrub']);
const WORLD_KIT_TRUNK_ONLY = Object.freeze(['tree.shp-trunk', 'tree.fpv-alder-trunk']);

/* ---------- shared lists ---------- */
// hero trees with limbs and sky gaps (the library's best). The first group keeps its structure in every season in the world
// renderer today; the named hero oaks, willow and birch are the gold-standard art and join at a lower weight.
const _WKT_BROADLEAF = [['tree.oak', 3], ['tree.green-oak', 3], ['tree.green-chestnut', 2], ['tree.canal-oak', 1], ['tree.wyv-far-oak', 1], ['tree.hawthorn', 1]];
const _WKT_WATERSIDE = [['tree.green-willow', 2], ['tree.wyv-far-sallow', 3], ['tree.canal-willow', 1], ['tree.alder', 1], ['tree.green-alder', 1], ['tree.pool-birch', 1]];
const _WKT_DISTANT_WOOD = [['tree.bank-oak', 3], ['tree.bank-alder', 2], ['tree.far-broad', 2], ['tree.bank-distant', 2], ['tree.far-birch', 1], ['tree.distant', 1]];
const _WKT_DISTANT_HEATH = [['tree.far-pine', 2], ['tree.far-birch', 2], ['tree.distant-pine', 2], ['tree.bank-distant', 1]];
const _WKT_DISTANT_TOWN = [['tree.far-broad', 2], ['tree.bank-distant', 1], ['tree.bank-oak', 1]];
// low dressing (near band)
const _WKT_TUFTS = [['plant.grass-long', 4], ['plant.rph-short-grass', 3], ['plant.yg-meadow', 3], ['plant.grass', 2], ['plant.fern', 1], ['plant.rph-rosette', 1]];
const _WKT_MOWN = [['plant.grass', 4], ['plant.rph-short-grass', 3], ['plant.rph-rosette', 1]];
const _WKT_REEDS = [['plant.proof-fleet-reed', 3], ['plant.reed', 3], ['plant.bulrush', 2], ['plant.yg-reedbed', 2], ['plant.proof-fleet-rush', 2]];
const _WKT_BANK = [['plant.grass-long', 4], ['plant.rph-short-grass', 2], ['plant.fern', 1], ['plant.canal-view-meadowsweet', 1], ['plant.canal-view-loosestrife', 1], ['rock.stones', 1]];
const _WKT_FLOWERS = [['plant.wildflowers', 3], ['plant.daisies', 1], ['plant.canal-view-loosestrife', 1], ['plant.canal-view-meadowsweet', 1]];
// the gold framing bough (proof Fleet Pond) and its kin; a framing bough's parent stands just outside the frame
const _WKT_BOUGH = { kind: 'bough', bough: 'plant.proof-fleet-bough', trunk: 'tree.shp-trunk' };
const _WKT_BOUGH_OAK = { kind: 'bough', bough: 'plant.yg-oak-bough', trunk: 'tree.shp-trunk' };
const _WKT_BOUGH_CANAL = { kind: 'bough', bough: 'plant.canal-view-bough', trunk: 'tree.shp-trunk' };
const _WKT_BOUGH_PLANE = { kind: 'bough', bough: 'plant.mcf-plane-bough', trunk: 'tree.shp-trunk' };
const _WKT_BOUGH_SYCAMORE = { kind: 'bough', bough: 'plant.klm-sycamore-bough', trunk: 'tree.shp-trunk' };
const _WKT_BOUGH_PARK = { kind: 'bough', bough: 'plant.shp-bough', trunk: 'tree.shp-trunk' };
// paving furniture (city): bins, planters, benches, lamps, cycle stands and street trees in pits
const _WKT_STREET_NEAR = [['street.mqn-planter-grass', 3], ['street.mcf-litter-bin', 1], ['plant.rph-flower-tub', 1], ['street.mqn-bike-hoop', 1]];
const _WKT_STREET_MID = [['tree.plane-avenue', 3], ['street.bench', 2], ['street.lamppost', 2], ['street.mqn-planter-grass', 2], ['street.mcr-cycle-stand', 1], ['street.mcf-litter-bin', 1], ['structure.mcr-planter', 1]];
const _WKT_STREET_FAR = [['tree.plane-avenue', 3], ['street.lamppost', 1], ['tree.mqn-street-tree', 1], ['street.mqn-planter-grass', 1]];
const _WKT_PAVING_ACCENTS = [['ground.leaf-litter', 3], ['ground.puddle', 1], ['ground.leaves', 1]];
const _WKT_LIFE_RURAL = { walk: { who: 'walkers', rate: '4/min', mix: { stroll: 0.45, brisk: 0.15, 'dog-walker': 0.25, jogger: 0.05, couple: 0.1 } } };
const _WKT_WATERFOWL = [{ who: 'mallard', count: 7 }, { who: 'moorhen', count: 2 }, { who: 'mute-swan', count: 2 }];

// the fill groups every kit shares unless it names its own (a pond in a park, a puddle on a moor ...)
const _WKT_HEATH = { near: [['ground.yc-heath-drift', 4], ['plant.heather', 3], ['plant.wyv-heath-bank', 2], ['plant.moor-heather', 2], ['plant.yc-cotton-grass', 1], ['plant.rph-short-grass', 1]],
  mid: [['plant.gorse', 3], ['plant.yc-gorse-spray', 2], ['plant.wyv-heath-bank', 2], ['plant.bracken', 2], ['tree.wyv-far-sallow', 1], ['tree.pool-birch', 1]],
  far: [['tree.pine-veteran', 3], ['tree.pool-pine', 2], ['tree.pool-birch', 2], ['tree.birch', 1], ['tree.green-birch', 1], ['plant.gorse', 1]], distant: _WKT_DISTANT_HEATH,
  accents: [['plant.yc-cotton-grass', 2], ['rock.stones', 1], ['ground.yc-sphagnum', 1], ['plant.yc-sundew', 1], ['ground.puddle', 1]] };
const _WKT_WOOD = { near: [['plant.fern', 3], ['plant.bracken', 2], ['plant.rph-short-grass', 2], ['plant.grass-long', 1], ['plant.rph-rosette', 1]],
  mid: [['plant.holly', 2], ['plant.rph-church-shrub', 2], ['plant.fern', 1], ['plant.bracken', 2], ['tree.hawthorn', 1], ['tree.green-birch', 1]],
  far: [['tree.oak', 3], ['tree.green-oak', 2], ['tree.green-chestnut', 1], ['tree.canal-oak', 1], ['tree.wyv-far-oak', 1], ['tree.pool-birch', 1], ['tree.green-alder', 1], ['tree.pine-veteran', 1]],
  distant: _WKT_DISTANT_WOOD, accents: [['plant.bluebells', 3], ['ground.leaf-litter', 3], ['ground.leaves', 1], ['rock.stones', 1]] };
const _WKT_FIELD = { near: [['plant.grass-long', 4], ['plant.yg-meadow', 3], ['plant.rph-short-grass', 2]],
  mid: [['plant.yg-meadow', 2], ['plant.hedgerow-blackberry', 2], ['plant.hedge', 1], ['tree.hawthorn', 1]],
  far: [['tree.oak', 3], ['tree.hawthorn', 2], ['tree.green-oak', 1], ['plant.hedgerow-blackberry', 2]], distant: _WKT_DISTANT_WOOD,
  accents: [['plant.wildflowers', 3], ['plant.daisies', 1], ['ground.hay-bales', 1], ['rock.stones', 1]] };
const _WKT_WET = { near: [['plant.rph-short-grass', 2], ['plant.proof-fleet-rush', 1], ['plant.grass-long', 1]], mid: [['plant.yg-reedbed', 2], ['plant.proof-fleet-reed', 1]],
  far: [['plant.yg-reedbed', 1], ['tree.wyv-far-sallow', 1]], accents: [] };
const _WKT_SAND = { near: [['rock.stones', 2], ['plant.grass-long', 1]], mid: [['rock.boulder', 1], ['plant.grass-long', 1]], far: [['rock.boulder', 1]], accents: [['rock.stones', 1]] };
const _WKT_PATH = { near: [], mid: [], far: [], accents: [['ground.leaf-litter', 3], ['ground.puddle', 1]] };
const _WKT_PAVING = { near: _WKT_STREET_NEAR, mid: _WKT_STREET_MID, far: _WKT_STREET_FAR, accents: _WKT_PAVING_ACCENTS, max: { near: 6, mid: 16, far: 12 } };
const _WKT_CALM = { calm: [['water.lily', 5], ['water.fish-ring', 1]], share: 0.35 };
const _WKT_NOLILY = { calm: [], share: 0 };
const _WKT_RICH_RURAL = { mid: _WKT_BROADLEAF.concat(_WKT_WATERSIDE, [['plant.rph-church-shrub', 1], ['plant.bracken', 2], ['plant.fern', 2], ['plant.yg-meadow', 2],
    ['plant.grass-long', 2], ['plant.wyv-heath-bank', 1], ['rock.boulder', 1], ['plant.reed', 1], ['plant.bulrush', 1], ['plant.yg-reedbed', 1], ['plant.hedgerow-blackberry', 1]]),
  far: _WKT_BROADLEAF.concat([['tree.pine-veteran', 1], ['tree.pool-pine', 1], ['tree.green-willow', 1], ['tree.wyv-far-sallow', 1], ['tree.green-birch', 1], ['tree.alder', 1]]) };
const _WKT_RICH_TOWN = { mid: [['tree.plane-avenue', 3], ['tree.green-chestnut', 1], ['tree.green-birch', 1], ['tree.horse-chestnut', 1], ['plant.rph-short-grass', 2], ['street.bench', 1]],
  far: [['tree.plane-avenue', 2], ['tree.green-chestnut', 1], ['tree.horse-chestnut', 1], ['tree.green-oak', 1]] };
const _WKT_EDGES_RURAL = { water: { pond: 'natural', lake: 'natural', canal: 'natural', river: 'natural', estuary: 'natural', sea: 'none', harbour: 'quay', puddle: 'none' },
  natural: { margin: _WKT_REEDS, bank: _WKT_BANK, stands: 0.55 }, quay: { top: [['plant.rph-short-grass', 2], ['plant.mqn-buddleia', 1]] },
  verge: [['plant.grass-long', 4], ['plant.rph-short-grass', 3], ['plant.yg-meadow', 1], ['plant.wildflowers', 1]], vergeShare: 0.6,
  hedgerow: [['plant.hedgerow-blackberry', 3], ['plant.towpath-hedge', 2], ['tree.hawthorn', 1]], wallBase: [['plant.rph-short-grass', 3], ['plant.fern', 1], ['plant.grass-long', 2]], kerb: true, pavement: false };
const _WKT_EDGES_URBAN = { water: { pond: 'natural', lake: 'natural', canal: 'quay', river: 'quay', estuary: 'quay', sea: 'quay', harbour: 'quay', puddle: 'none' },
  natural: { margin: _WKT_REEDS, bank: _WKT_BANK, stands: 0.5 }, quay: { top: [['plant.rph-short-grass', 3], ['plant.mqn-buddleia', 1], ['plant.fern', 1]] },
  verge: [['plant.grass', 3], ['plant.rph-short-grass', 3], ['plant.grass-long', 2], ['plant.daisies', 1]], vergeShare: 0.4, hedgerow: [],
  wallBase: [['plant.rph-short-grass', 3], ['plant.mqn-buddleia', 1], ['plant.fern', 1]], kerb: true, pavement: true };

/* ---------- the kits ---------- */
// a limestone dale's dressing (the `dale` kit): short sheep-grazed turf, limestone scatter, a lone hawthorn, no hedgerow bushes
const _WKT_DALE = { near: [['plant.rph-short-grass', 4], ['plant.rph-rosette', 2], ['plant.daisies', 2], ['plant.yg-meadow', 2], ['plant.grass-long', 2], ['plant.proof-fleet-rush', 2]],
  mid: [['rock.boulder', 2], ['plant.rph-short-grass', 3], ['plant.grass-long', 3], ['plant.yg-meadow', 2], ['plant.proof-fleet-rush', 2], ['plant.rph-rosette', 1], ['plant.daisies', 1], ['rock.stones', 1]],
  far: [['rock.boulder', 2], ['plant.grass-long', 3], ['plant.rph-short-grass', 3], ['plant.yg-meadow', 1], ['plant.bracken', 1]], distant: [],
  accents: [['plant.wildflowers', 3], ['plant.daisies', 2], ['rock.stones', 1], ['ground.leaf-litter', 1]] };
const WORLD_STYLE_KITS = _wkbFreeze({
  // a canal with a towpath through woodland and fields: reed stands with gaps, willows and alders on the offside, hawthorn
  // hedges behind the towpath, the gold bough over the cut, walkers with dogs, mallards, moorhens and a pair of swans
  canal: { label: 'canal and towpath', place: 'park', backdrop: 'canal-wooded', ground: 'grass', sky: [0.12, 0.45], layers: 5,
    look: { grass: 'tussock', path: 'gravel', paving: 'flags', quay: 'stone', bank: 'earth' },
    fill: { grass: { near: _WKT_TUFTS, mid: [['tree.wyv-far-sallow', 2], ['tree.hawthorn', 2], ['tree.green-willow', 1], ['tree.canal-willow', 1], ['plant.hedgerow-blackberry', 1], ['plant.rph-church-shrub', 1], ['plant.yg-meadow', 2], ['plant.bracken', 2], ['plant.holly', 1]],
      far: _WKT_BROADLEAF.concat(_WKT_WATERSIDE), distant: _WKT_DISTANT_WOOD, accents: _WKT_FLOWERS.concat([['ground.leaf-litter', 2], ['rock.stones', 1]]) },
      heath: _WKT_HEATH, wood: _WKT_WOOD, field: _WKT_FIELD, wet: _WKT_WET, sand: _WKT_SAND, paving: _WKT_PAVING, path: _WKT_PATH, water: _WKT_CALM },
    edges: _WKT_EDGES_RURAL, frame: [_WKT_BOUGH_CANAL, { kind: 'reeds', obj: 'plant.proof-fleet-reed' }, { kind: 'reeds', obj: 'plant.yg-reedbed' }, { kind: 'shrub', obj: 'plant.fern' }, { kind: 'shrub', obj: 'plant.hedgerow-blackberry' }, _WKT_BOUGH],
    rich: _WKT_RICH_RURAL, life: Object.assign({ water: _WKT_WATERFOWL.concat([{ who: 'heron', count: 1 }]) }, _WKT_LIFE_RURAL) },
  // a pond or lake: the gold proof Fleet Pond kit. Dense reed and reedmace stands, lilies on calm water, birch, sallow and pine
  // round the far shore, the gold bough over the water
  pond: { label: 'pond or lake', place: 'park', backdrop: 'woodland', ground: 'grass', sky: [0.3, 0.6], layers: 5,
    look: { grass: 'tussock', path: 'gravel', paving: 'flags', quay: 'stone', bank: 'earth' },
    fill: { grass: { near: _WKT_TUFTS, mid: [['tree.wyv-far-sallow', 3], ['tree.green-willow', 1], ['tree.canal-willow', 1], ['tree.pool-birch', 1], ['tree.hawthorn', 1], ['plant.bracken', 2], ['plant.yg-meadow', 2]],
      far: [['tree.pool-birch', 2], ['tree.green-birch', 2], ['tree.oak', 2], ['tree.green-oak', 2], ['tree.wyv-far-oak', 1], ['tree.pine-veteran', 2], ['tree.pool-pine', 2], ['tree.wyv-far-sallow', 2], ['tree.alder', 1]],
      distant: _WKT_DISTANT_WOOD.concat([['tree.far-pine', 1]]), accents: _WKT_FLOWERS.concat([['rock.stones', 1], ['ground.leaf-litter', 1]]) },
      heath: _WKT_HEATH, wood: _WKT_WOOD, field: _WKT_FIELD, wet: _WKT_WET, sand: _WKT_SAND, paving: _WKT_PAVING, path: _WKT_PATH, water: { calm: [['water.lily', 6], ['water.fish-ring', 1]], share: 0.45 } },
    edges: Object.assign({}, _WKT_EDGES_RURAL, { natural: { margin: _WKT_REEDS, bank: _WKT_BANK, stands: 0.7 } }),
    frame: [_WKT_BOUGH, { kind: 'reeds', obj: 'plant.proof-fleet-reed' }, { kind: 'reeds', obj: 'plant.yg-reedbed' }, { kind: 'shrub', obj: 'plant.fern' }, { kind: 'shrub', obj: 'plant.rph-church-shrub' }],
    rich: _WKT_RICH_RURAL, life: Object.assign({ water: [{ who: 'mallard', count: 8 }, { who: 'mute-swan', count: 2 }, { who: 'coot', count: 3 }, { who: 'grebe', count: 2 }] }, _WKT_LIFE_RURAL) },
  // lowland heath: heather and gorse drifts, Scots pine and birch, cotton grass in the wet hollows
  heath: { label: 'heath', place: 'rural', backdrop: 'heath', ground: 'heath', sky: [0.35, 0.62], layers: 5,
    look: { grass: 'tussock', heath: 'heath', path: 'sand', paving: 'flags', quay: 'stone', bank: 'earth' },
    fill: { grass: _WKT_HEATH, heath: _WKT_HEATH, wood: _WKT_WOOD, field: _WKT_FIELD, wet: _WKT_WET, sand: _WKT_SAND, paving: _WKT_PAVING, path: _WKT_PATH, water: _WKT_CALM },
    edges: _WKT_EDGES_RURAL, frame: [{ kind: 'shrub', obj: 'plant.yc-gorse-spray' }, _WKT_BOUGH, { kind: 'shrub', obj: 'plant.gorse' }, { kind: 'reeds', obj: 'plant.yg-reedbed' }],
    rich: _WKT_RICH_RURAL, life: Object.assign({ water: [{ who: 'mallard', count: 4 }] }, _WKT_LIFE_RURAL) },
  // broadleaf woodland: oaks and chestnuts with sky gaps, a holly and hazel understorey, ferns, bluebells in spring
  woodland: { label: 'woodland', place: 'rural', backdrop: 'woodland', ground: 'wood', sky: [0.15, 0.45], layers: 5,
    look: { grass: 'tussock', wood: 'litter', path: 'gravel', paving: 'flags', quay: 'stone', bank: 'earth' },
    fill: { grass: _WKT_WOOD, wood: _WKT_WOOD, heath: _WKT_HEATH, field: _WKT_FIELD, wet: _WKT_WET, sand: _WKT_SAND, paving: _WKT_PAVING, path: _WKT_PATH, water: _WKT_CALM },
    edges: _WKT_EDGES_RURAL, frame: [_WKT_BOUGH_OAK, _WKT_BOUGH, { kind: 'shrub', obj: 'plant.fern' }, { kind: 'shrub', obj: 'plant.holly' }, { kind: 'shrub', obj: 'plant.rph-church-shrub' }],
    rich: _WKT_RICH_RURAL, life: Object.assign({ water: [{ who: 'mallard', count: 4 }] }, _WKT_LIFE_RURAL) },
  // a village green: mown grass with chestnuts and oaks, benches and a lamp, the church and cottages behind (backdrop)
  'village-green': { label: 'village green', place: 'town', backdrop: 'town-low', ground: 'grass', sky: [0.2, 0.5], layers: 5, bare: { ground: 0.3, paving: 0.1 },
    look: { grass: 'mown', path: 'gravel', paving: 'flags', quay: 'stone', bank: 'earth' },
    fill: { grass: { near: _WKT_MOWN, mid: [['tree.hawthorn', 2], ['tree.horse-chestnut', 1], ['tree.green-chestnut', 1], ['tree.oak', 1], ['street.bench', 1], ['plant.rph-short-grass', 2]],
      far: [['tree.green-chestnut', 2], ['tree.horse-chestnut', 1], ['tree.oak', 2], ['tree.green-oak', 1], ['tree.plane-avenue', 1]], distant: _WKT_DISTANT_TOWN,
      accents: [['plant.daisies', 3], ['ground.leaf-litter', 2], ['person.picnicker', 1]], maxH: { near: 3.5, mid: 30 } },
      paving: _WKT_PAVING, path: _WKT_PATH, heath: _WKT_HEATH, wood: _WKT_WOOD, field: _WKT_FIELD, wet: _WKT_WET, sand: _WKT_SAND, water: _WKT_CALM },
    edges: Object.assign({}, _WKT_EDGES_RURAL, { hedgerow: [['plant.hedge', 2], ['plant.towpath-hedge', 1]], verge: [['plant.rph-short-grass', 3], ['plant.grass', 2], ['plant.daisies', 1]], vergeShare: 0.35 }),
    frame: [_WKT_BOUGH_PARK, { kind: 'lamp', obj: 'street.lamp' }, { kind: 'shrub', obj: 'plant.hedge' }],
    rich: _WKT_RICH_TOWN, life: { walk: { who: 'walkers', rate: '5/min', mix: { stroll: 0.4, 'dog-walker': 0.25, family: 0.15, elderly: 0.1, couple: 0.1 } }, water: _WKT_WATERFOWL } },
  // a city river between walled quays (Kelham, Castlefield): textured stone quay walls with coping, buddleia on the banks,
  // plane trees, lamps and benches along the riverside walk, crowds on the paving, mallards and swans on the water
  'river-city': { label: 'river in a city', place: 'city', backdrop: 'city-victorian', ground: 'grass', sky: [0.2, 0.45], layers: 5,
    look: { grass: 'tussock', path: 'flags', paving: 'flags', plaza: 'setts', quay: 'stone', bank: 'stone' },
    fill: { grass: { near: [['plant.grass-long', 3], ['plant.rph-short-grass', 3], ['plant.grass', 2], ['plant.rph-rosette', 1]],
      mid: [['plant.mqn-buddleia', 2], ['plant.rph-church-shrub', 2], ['plant.grass-long', 2], ['tree.plane-avenue', 1], ['tree.green-birch', 1], ['plant.rph-short-grass', 1]],
      far: [['tree.plane-avenue', 3], ['tree.green-chestnut', 1], ['tree.green-birch', 1], ['plant.mqn-buddleia', 1]], distant: _WKT_DISTANT_TOWN,
      accents: [['plant.daisies', 2], ['ground.leaf-litter', 2], ['plant.wildflowers', 1]], maxH: 2.6 },
      paving: _WKT_PAVING, path: _WKT_PATH, heath: _WKT_HEATH, wood: _WKT_WOOD, field: _WKT_FIELD, wet: _WKT_WET, sand: _WKT_SAND, water: _WKT_NOLILY },
    edges: _WKT_EDGES_URBAN, frame: [_WKT_BOUGH_SYCAMORE, _WKT_BOUGH_PLANE, { kind: 'shrub', obj: 'plant.mqn-buddleia' }, { kind: 'reeds', obj: 'plant.reed' }, { kind: 'lamp', obj: 'street.lamppost' }, { kind: 'railing', obj: 'structure.mqn-quayrail-v1' }],
    rich: _WKT_RICH_TOWN, life: { walk: { who: 'walkers', rate: '8/min', mix: { brisk: 0.35, stroll: 0.35, 'dog-walker': 0.1, friends: 0.1, couple: 0.1 } }, paving: { who: 'crowd', rate: '10/min' },
      water: [{ who: 'mallard', count: 8 }, { who: 'mute-swan', count: 2 }, { who: 'heron', count: 1 }] } },
  // a civic square: setts and flags, plane trees in pits, planters, benches, lamps and a crowd; the buildings frame it. No pigeons
  // by default yet: under the systems runner a lifting pigeon reports speed 0 while it flies (invariant animStill, the life
  // package's to fix); add ground: [{ who: 'pigeons', count: 8 }] back once it does
  'civic-square': { label: 'civic square', place: 'city', backdrop: 'city-victorian', ground: 'grass', sky: [0.2, 0.45], layers: 5, bare: { ground: 0.35, paving: 0.2, near: 0.5 },
    look: { grass: 'mown', path: 'flags', paving: 'flags', plaza: 'setts', quay: 'stone', bank: 'stone' },
    fill: { grass: { near: _WKT_MOWN, mid: [['plant.rph-church-shrub', 2], ['tree.plane-avenue', 1], ['plant.shp-border', 1], ['plant.rph-short-grass', 2]], far: [['tree.plane-avenue', 3], ['tree.green-chestnut', 1]],
      distant: _WKT_DISTANT_TOWN, accents: [['plant.daisies', 2], ['ground.leaf-litter', 2]], maxH: 2.6 },
      paving: { near: _WKT_STREET_NEAR.concat([['structure.mcr-planter', 1], ['street.bench', 2], ['tree.plane-avenue', 1], ['street.mqn-totem', 1]]), mid: _WKT_STREET_MID.concat([['street.mqn-totem', 1], ['street.mqn-parasol', 1], ['person.cafe-goer', 2], ['structure.mqn-kiosk-v3', 1]]),
        far: _WKT_STREET_FAR.concat([['person.cafe-goer', 1], ['street.mqn-parasol', 1]]), accents: _WKT_PAVING_ACCENTS, max: { near: 10, mid: 28, far: 18 } },
      path: _WKT_PATH, heath: _WKT_HEATH, wood: _WKT_WOOD, field: _WKT_FIELD, wet: _WKT_WET, sand: _WKT_SAND, water: _WKT_NOLILY },
    edges: _WKT_EDGES_URBAN, frame: [{ kind: 'lamp', obj: 'street.lamppost' }, _WKT_BOUGH_PLANE, { kind: 'planter', obj: 'street.mqn-planter-grass' }],
    rich: _WKT_RICH_TOWN, life: { walk: { who: 'crowd', rate: '12/min' }, paving: { who: 'crowd', rate: '12/min' } } },
  // a quayside or harbour: stone quays with coping, bollards, lifebuoys and railings at the edge, lamps, gulls over the water
  quayside: { label: 'quayside or harbour', place: 'town', backdrop: 'town-low', ground: 'grass', sky: [0.3, 0.55], layers: 5, bare: { ground: 0.25, paving: 0.15, near: 0.5 },
    look: { grass: 'tussock', path: 'flags', paving: 'flags', plaza: 'setts', quay: 'stone', bank: 'stone' },
    fill: { grass: { near: [['plant.grass-long', 3], ['plant.rph-short-grass', 3]], mid: [['plant.rph-church-shrub', 1], ['plant.grass-long', 2], ['plant.mqn-buddleia', 1]], far: [['tree.plane-avenue', 1], ['tree.green-chestnut', 1]],
      distant: _WKT_DISTANT_TOWN, accents: [['ground.leaf-litter', 1], ['plant.daisies', 1]], maxH: 2.6 },
      paving: { near: [['street.bollard', 3], ['street.mqn-lifebuoy', 1], ['street.mcf-litter-bin', 1], ['street.mqn-planter-grass', 1], ['plant.rph-flower-tub', 1], ['street.mqn-aboard', 1]],
        mid: [['street.bollard', 2], ['street.lamppost', 2], ['street.bench', 2], ['street.mqn-lifebuoy', 1], ['street.mqn-planter-grass', 1], ['structure.mcr-planter', 1], ['street.mqn-parasol', 1], ['street.mcr-cycle-stand', 1]],
        far: [['street.lamppost', 2], ['street.bollard', 1], ['tree.plane-avenue', 1], ['street.mqn-planter-grass', 1]], accents: [['ground.puddle', 2], ['ground.leaves', 1]], max: { near: 6, mid: 18, far: 12 } },
      path: _WKT_PATH, heath: _WKT_HEATH, wood: _WKT_WOOD, field: _WKT_FIELD, wet: _WKT_WET, sand: _WKT_SAND, water: _WKT_NOLILY },
    edges: Object.assign({}, _WKT_EDGES_URBAN, { water: { pond: 'natural', lake: 'quay', canal: 'quay', river: 'quay', estuary: 'quay', sea: 'quay', harbour: 'quay', puddle: 'none' },
      quay: { top: [['plant.rph-short-grass', 2]], posts: [['street.bollard', 4], ['street.mqn-lifebuoy', 1]] } }),
    frame: [{ kind: 'railing', obj: 'structure.mqn-quayrail-v1' }, { kind: 'lamp', obj: 'street.lamppost' }],   // never a bollard: a 1 m post cut by the frame's bottom edge is a dark blob (SCENE_LESSONS K)
    rich: _WKT_RICH_TOWN, life: { walk: { who: 'crowd', rate: '8/min' }, paving: { who: 'crowd', rate: '8/min' }, water: [{ who: 'mallard', count: 4 }], air: [{ who: 'gulls', count: 5 }] } },
  // a great city waterfront (the Pier Head, a Thames embankment, a Clyde quay): a river promenade and a wide paved plaza behind it under big
  // public buildings; flags and setts, plane trees in pits, planters, benches, lamp standards, bollards and railings at the quay edge, crowds,
  // pigeons on the paving and gulls over the water (a civic square with a quay: the square's limits for bare paving)
  'waterfront-city': { label: 'city waterfront', place: 'city', backdrop: 'estuary', ground: 'grass', sky: [0.3, 0.55], layers: 5, bare: { ground: 0.35, paving: 0.22, near: 0.5 },
    look: { grass: 'mown', path: 'flags', paving: 'flags', plaza: 'setts', quay: 'stone', bank: 'stone' },
    fill: { grass: { near: _WKT_MOWN, mid: [['plant.rph-church-shrub', 2], ['tree.plane-avenue', 1], ['plant.shp-border', 1], ['plant.rph-short-grass', 2]], far: [['tree.plane-avenue', 3], ['tree.green-chestnut', 1]],
      distant: _WKT_DISTANT_TOWN, accents: [['plant.daisies', 2], ['ground.leaf-litter', 2]], maxH: 2.6 },
      // near the lens a great plaza has low things (tubs, a bin, a bollard, a planter), never a bicycle stand or a bench, which fill a corner of the frame
      paving: { near: [['plant.rph-flower-tub', 3], ['street.mcf-litter-bin', 1], ['street.bollard', 1], ['street.mqn-planter-grass', 2], ['tree.plane-avenue', 1]],
        // the plaza 12 to 35 m from the lens is lived in (user, 16 Oct: "rather empty on the near side"): benches facing the river with their bins,
        // a bike stand, a statue, lamp standards, café-goers and a parasol, never in the near band (a bench there fills a corner of the frame)
        mid: _WKT_STREET_MID.concat([['street.mqn-parasol', 1], ['person.cafe-goer', 3], ['street.bollard', 2], ['street.mqn-lifebuoy', 1], ['street.mqn-bike-hoop', 2], ['street.mcr-statue', 1], ['street.bench', 2], ['street.mcf-litter-bin', 1]]),
        far: _WKT_STREET_FAR.concat([['person.cafe-goer', 1], ['street.bench', 1]]), accents: _WKT_PAVING_ACCENTS, max: { near: 10, mid: 44, far: 22 } },
      path: _WKT_PATH, heath: _WKT_HEATH, wood: _WKT_WOOD, field: _WKT_FIELD, wet: _WKT_WET, sand: _WKT_SAND, water: _WKT_NOLILY },
    edges: Object.assign({}, _WKT_EDGES_URBAN, { water: { pond: 'natural', lake: 'quay', canal: 'quay', river: 'quay', estuary: 'quay', sea: 'quay', harbour: 'quay', puddle: 'none' },
      quay: { top: [['plant.rph-short-grass', 2]], posts: [['street.bollard', 4], ['street.mqn-lifebuoy', 1]] } }),
    frame: [{ kind: 'lamp', obj: 'street.lamppost' }, { kind: 'railing', obj: 'structure.mqn-quayrail-v1' }, _WKT_BOUGH_PLANE, { kind: 'post', obj: 'street.bollard' }],
    rich: _WKT_RICH_TOWN, life: { walk: { who: 'crowd', rate: '10/min' }, paving: { who: 'crowd', rate: '10/min' }, ground: [{ who: 'pigeons', count: 6 }], water: [], air: [{ who: 'gulls', count: 8 }] } },
  // a terraced street: flags and kerbs, street trees in pits, lamps, bins, hedges and front-garden borders
  'terraced-street': { label: 'terraced street', place: 'town', backdrop: 'town-low', ground: 'grass', sky: [0.15, 0.45], layers: 5,
    look: { grass: 'mown', path: 'flags', paving: 'flags', plaza: 'setts', quay: 'stone', bank: 'stone' },
    fill: { grass: { near: [['plant.rph-short-grass', 3], ['plant.grass', 2], ['plant.shp-border', 1]], mid: [['plant.hedge', 2], ['plant.towpath-hedge', 1], ['plant.shp-border', 1], ['plant.rph-church-shrub', 1], ['tree.mqn-street-tree', 1]],
      far: [['tree.plane-avenue', 2], ['tree.green-birch', 1], ['plant.hedge', 1]], distant: _WKT_DISTANT_TOWN, accents: [['plant.daisies', 2], ['ground.leaf-litter', 2]], maxH: 2.4 },
      paving: { near: [['street.mcf-litter-bin', 1], ['plant.rph-flower-tub', 1], ['street.mqn-bike-hoop', 1], ['street.bollard', 1], ['plant.planter', 1]], mid: [['tree.plane-avenue', 2], ['street.lamppost', 2], ['street.mcr-bin', 1], ['street.mqn-bike-hoop', 1], ['tree.mqn-street-tree', 1], ['street.bollard', 1], ['street.mcr-cycle-stand', 1], ['street.bench', 1], ['plant.planter', 1], ['tree.green-birch', 1]],
        far: [['tree.plane-avenue', 2], ['street.lamppost', 1], ['tree.mqn-street-tree', 1], ['tree.green-birch', 1]], accents: _WKT_PAVING_ACCENTS, max: { near: 4, mid: 12, far: 10 } },
      path: _WKT_PATH, heath: _WKT_HEATH, wood: _WKT_WOOD, field: _WKT_FIELD, wet: _WKT_WET, sand: _WKT_SAND, water: _WKT_NOLILY },
    edges: Object.assign({}, _WKT_EDGES_URBAN, { hedgerow: [['plant.hedge', 2]] }), frame: [{ kind: 'lamp', obj: 'street.lamppost' }, _WKT_BOUGH_PLANE, { kind: 'hedge', obj: 'plant.hedge' }],
    rich: _WKT_RICH_TOWN, life: { walk: { who: 'crowd', rate: '6/min' }, paving: { who: 'crowd', rate: '6/min' } } },
  // an old-town lane (the Shambles in York, Chester's Rows, a market-town ginnel): setts or flags between timber-framed or brick fronts a few
  // metres apart. NOTHING stands in the lane (no bench, bin, lamp post or bollard: the lanterns, signs, baskets and stalls belong to the
  // buildings, which the generator hangs on their walls); flower tubs and A-boards stand against the walls; the street is a crowd of visitors
  'old-town-lane': { label: 'old-town lane', place: 'town', backdrop: 'town-low', ground: 'grass', sky: [0.02, 0.18], layers: 5, bare: { ground: 0.3, paving: 0.3, near: 0.4 },
    look: { grass: 'mown', path: 'flags', paving: 'flags', plaza: 'lane', quay: 'stone', bank: 'stone' },
    fill: { grass: { near: [['plant.rph-short-grass', 3], ['plant.grass', 2]], mid: [['plant.hedge', 1]], far: [['plant.hedge', 1]], distant: _WKT_DISTANT_TOWN, accents: [['plant.daisies', 1]], maxH: 1.6 },
      paving: { near: [['plant.rph-flower-tub', 1], ['street.mqn-aboard', 1]], mid: [['plant.rph-flower-tub', 2], ['street.mqn-aboard', 1]], far: [['plant.rph-flower-tub', 1]], accents: [['ground.leaf-litter', 2], ['ground.puddle', 1]], max: { near: 2, mid: 4, far: 4 } },
      path: _WKT_PATH, heath: _WKT_HEATH, wood: _WKT_WOOD, field: _WKT_FIELD, wet: _WKT_WET, sand: _WKT_SAND, water: _WKT_NOLILY },
    edges: Object.assign({}, _WKT_EDGES_URBAN, { hedgerow: [] }), frame: [{ kind: 'planter', obj: 'plant.rph-flower-tub' }],
    rich: { mid: [['plant.rph-flower-tub', 1], ['street.mqn-aboard', 1]], far: [['plant.rph-flower-tub', 1]] },
    life: { walk: { who: 'crowd', rate: '12/min' }, paving: { who: 'crowd', rate: '8/min' } } },   // no pigeons: in a packed lane they lift on every pass (animStill: a pigeon plays 'fly' on the spot)
  // a town park: lawns, flower borders, specimen chestnuts, planes and willows, benches and lamps on the paths
  park: { label: 'park', place: 'park', backdrop: 'town-low', ground: 'grass', sky: [0.25, 0.55], layers: 5, bare: { ground: 0.28, paving: 0.1 },
    look: { grass: 'mown', path: 'gravel', paving: 'flags', plaza: 'setts', quay: 'stone', bank: 'earth' },
    fill: { grass: { near: _WKT_MOWN, mid: [['tree.hawthorn', 2], ['tree.green-chestnut', 1], ['structure.shp-bandstand', 1], ['street.bench', 1], ['plant.rph-short-grass', 2]],
      far: [['tree.plane-avenue', 2], ['tree.horse-chestnut', 1], ['tree.green-oak', 2], ['tree.green-chestnut', 2], ['tree.oak', 1], ['tree.green-birch', 1], ['tree.pine-veteran', 1], ['tree.green-willow', 1]],
      distant: _WKT_DISTANT_TOWN, accents: [['plant.daisies', 3], ['plant.shp-border', 1], ['ground.leaf-litter', 2], ['ground.petals', 1], ['person.picnicker', 1]], maxH: { near: 3.5, mid: 30 } },
      heath: _WKT_HEATH, wood: _WKT_WOOD, field: _WKT_FIELD, wet: _WKT_WET, sand: _WKT_SAND, paving: _WKT_PAVING, path: _WKT_PATH, water: _WKT_CALM },
    edges: Object.assign({}, _WKT_EDGES_RURAL, { verge: [['plant.rph-short-grass', 3], ['plant.grass', 2], ['plant.daisies', 1]], vergeShare: 0.35 }), frame: [_WKT_BOUGH_PARK, { kind: 'lamp', obj: 'street.lamp' }, { kind: 'shrub', obj: 'plant.hedge' }],
    rich: _WKT_RICH_TOWN, life: { walk: { who: 'walkers', rate: '6/min', mix: { stroll: 0.35, 'dog-walker': 0.2, jogger: 0.1, family: 0.15, elderly: 0.1, couple: 0.1 } }, water: _WKT_WATERFOWL } },
  // moorland: heather and cotton grass, boulders and drystone walls, a lone thorn, sheep; big skies
  moor: { label: 'moor', place: 'rural', backdrop: 'heath', ground: 'heath', sky: [0.4, 0.68], layers: 5,
    look: { grass: 'tussock', heath: 'heath', path: 'gravel', paving: 'flags', quay: 'stone', bank: 'earth' },
    fill: { grass: { near: [['plant.moor-heather', 4], ['plant.yc-cotton-grass', 2], ['plant.rph-short-grass', 2], ['plant.grass-long', 2], ['plant.heather', 1]],
      mid: [['rock.boulder', 2], ['plant.bracken', 2], ['plant.moor-heather', 2], ['plant.wyv-heath-bank', 1], ['tree.hawthorn', 1], ['plant.grass-long', 1]],
      far: [['rock.boulder', 2], ['tree.hawthorn', 1], ['plant.bracken', 2], ['tree.pine-veteran', 1], ['plant.moor-heather', 2]], distant: [['tree.far-pine', 1], ['tree.distant', 1]],
      accents: [['plant.yc-cotton-grass', 2], ['rock.stones', 2], ['ground.yc-sphagnum', 1]] },
      heath: null, wood: _WKT_WOOD, field: _WKT_FIELD, wet: _WKT_WET, sand: _WKT_SAND, paving: _WKT_PAVING, path: _WKT_PATH, water: _WKT_NOLILY },
    edges: Object.assign({}, _WKT_EDGES_RURAL, { hedgerow: [] }), frame: [{ kind: 'rock', obj: 'rock.boulder' }, { kind: 'shrub', obj: 'plant.moor-heather' }, { kind: 'shrub', obj: 'plant.bracken' }],
    rich: { mid: [['rock.boulder', 2], ['plant.bracken', 2], ['plant.moor-heather', 2], ['tree.hawthorn', 1], ['plant.yc-cotton-grass', 1], ['plant.wyv-heath-bank', 1]], far: [['rock.boulder', 2], ['tree.hawthorn', 1], ['tree.pine-veteran', 1]] },
    life: { walk: { who: 'walkers', rate: '2/min', mix: { brisk: 0.5, 'dog-walker': 0.3, couple: 0.2 } }, graze: [{ who: 'sheep', count: 8 }] } },
  // the coast: sand and shingle, marram on the dunes, gorse on the cliff top, a railed promenade with lamps and benches, gulls
  coast: { label: 'coast', place: 'rural', backdrop: 'coast', ground: 'sand', sky: [0.38, 0.65], layers: 5, bare: { ground: 0.3, paving: 0.1 },
    look: { grass: 'tussock', sand: 'ripple', path: 'flags', paving: 'flags', quay: 'stone', bank: 'stone' },
    fill: { grass: { near: [['plant.grass-long', 4], ['plant.rph-short-grass', 2], ['plant.yc-gorse-spray', 1], ['plant.yg-meadow', 1]], mid: [['plant.gorse', 2], ['plant.yc-gorse-spray', 2], ['plant.grass-long', 2], ['tree.hawthorn', 1], ['plant.bracken', 1], ['building.beach-huts', 1]],
      far: [['plant.gorse', 2], ['tree.hawthorn', 1], ['tree.pine-veteran', 1], ['building.cottage', 1]], distant: [['tree.far-broad', 1]], accents: [['plant.wildflowers', 2], ['rock.stones', 1]] },
      sand: { near: [['rock.stones', 2]], mid: [['rock.stones', 2], ['rock.boulder', 1]], far: [['structure.groyne', 2], ['rock.boulder', 1]], accents: [['rock.stones', 1]] },
      paving: { near: [['street.mcf-litter-bin', 1], ['street.mqn-lifebuoy', 1], ['street.bollard', 1], ['plant.rph-flower-tub', 1]], mid: [['street.bench', 2], ['street.lamppost', 2], ['street.mqn-lifebuoy', 1], ['street.mqn-planter-grass', 1], ['street.mqn-parasol', 1]], far: [['street.lamppost', 2], ['street.bench', 1]], accents: [['ground.puddle', 1]], max: { near: 4, mid: 12, far: 10 } },
      heath: _WKT_HEATH, wood: _WKT_WOOD, field: _WKT_FIELD, wet: _WKT_WET, path: _WKT_PATH, water: _WKT_NOLILY },
    edges: Object.assign({}, _WKT_EDGES_RURAL, { water: { pond: 'natural', lake: 'natural', canal: 'natural', river: 'natural', estuary: 'natural', sea: 'none', harbour: 'quay', puddle: 'none' } }),
    frame: [{ kind: 'shrub', obj: 'plant.yc-gorse-spray' }, { kind: 'railing', obj: 'structure.mqn-quayrail-v1' }, { kind: 'lamp', obj: 'street.lamppost' }, { kind: 'rock', obj: 'rock.boulder' }],
    // no trees in the richness pools: they are placed on whatever ground is there, and a hawthorn at the tide line is wrong (the trees stay in the grass group)
    rich: { mid: [['plant.gorse', 2], ['plant.yc-gorse-spray', 2], ['rock.boulder', 2], ['plant.grass-long', 2]], far: [['plant.gorse', 2], ['rock.boulder', 1], ['plant.yc-gorse-spray', 1]] },
    life: { walk: { who: 'walkers', rate: '4/min', mix: { stroll: 0.45, 'dog-walker': 0.3, family: 0.15, couple: 0.1 } }, sand: { who: 'walkers', rate: '3/min', mix: { stroll: 0.4, 'dog-walker': 0.3, family: 0.2, child: 0.1 } }, air: [{ who: 'gulls', count: 6 }] } },
  // farmland and downland (the legacy styles): hedgerows with oaks and hawthorns, meadow margins, hay in summer
  farmland: { label: 'farmland', place: 'rural', backdrop: 'farmland', ground: 'field', sky: [0.35, 0.62], layers: 5,
    look: { grass: 'tussock', field: 'rows', path: 'gravel', paving: 'flags', quay: 'stone', bank: 'earth' },
    fill: { grass: _WKT_FIELD, field: _WKT_FIELD, heath: _WKT_HEATH, wood: _WKT_WOOD, wet: _WKT_WET, sand: _WKT_SAND, paving: _WKT_PAVING, path: _WKT_PATH, water: _WKT_CALM },
    edges: _WKT_EDGES_RURAL, frame: [{ kind: 'hedge', obj: 'plant.hedgerow-blackberry' }, _WKT_BOUGH_OAK, { kind: 'shrub', obj: 'plant.rph-church-shrub' }],
    rich: _WKT_RICH_RURAL, life: Object.assign({ graze: [{ who: 'cattle', count: 6 }] }, _WKT_LIFE_RURAL) },
  downs: { label: 'chalk downs', place: 'rural', backdrop: 'downs', ground: 'field', sky: [0.4, 0.66], layers: 5,
    look: { grass: 'tussock', field: 'rows', path: 'gravel', paving: 'flags', quay: 'stone', bank: 'earth' },
    fill: { grass: _WKT_FIELD, field: _WKT_FIELD, heath: _WKT_HEATH, wood: _WKT_WOOD, wet: _WKT_WET, sand: _WKT_SAND, paving: _WKT_PAVING, path: _WKT_PATH, water: _WKT_CALM },
    edges: _WKT_EDGES_RURAL, frame: [{ kind: 'hedge', obj: 'plant.hedgerow-blackberry' }, { kind: 'shrub', obj: 'plant.rph-church-shrub' }, _WKT_BOUGH_OAK],
    rich: _WKT_RICH_RURAL, life: Object.assign({ graze: [{ who: 'sheep', count: 10 }] }, _WKT_LIFE_RURAL) },
  // a limestone dale (Malham, Ingleton, Wharfedale): short sheep-grazed pasture with scattered limestone and rush, dry-stone walls (a spec's
  // lines; no hedgerows), a lone hawthorn or ash, a clear beck with rushes and stones, sheep and walkers; the crag is the spec's cliff
  dale: { label: 'limestone dale', place: 'rural', backdrop: 'downs', ground: 'grass', sky: [0.3, 0.62], layers: 5,
    look: { grass: 'tussock', field: 'tussock', path: 'gravel', paving: 'flags', quay: 'stone', bank: 'earth' },
    fill: { grass: _WKT_DALE, field: _WKT_DALE, heath: _WKT_DALE, wood: _WKT_DALE, wet: _WKT_WET, sand: _WKT_SAND, paving: _WKT_PAVING, path: _WKT_PATH, water: _WKT_NOLILY },
    edges: Object.assign({}, _WKT_EDGES_RURAL, { hedgerow: [], natural: { margin: [['plant.proof-fleet-rush', 1], ['plant.rph-short-grass', 4]], bank: [['rock.stones', 3], ['plant.rph-short-grass', 4]], stands: 0.18 } }),
    frame: [_WKT_BOUGH_OAK, { kind: 'rock', obj: 'rock.boulder' }, { kind: 'shrub', obj: 'tree.hawthorn' }, { kind: 'shrub', obj: 'plant.fern' }],
    rich: { mid: [['rock.boulder', 2], ['plant.rph-short-grass', 3], ['plant.grass-long', 2], ['plant.yg-meadow', 2], ['plant.fern', 1], ['rock.stones', 1]], far: [['rock.boulder', 3], ['plant.grass-long', 2], ['plant.rph-short-grass', 2]] },
    life: { walk: { who: 'walkers', rate: '2/min', mix: { brisk: 0.4, 'dog-walker': 0.3, couple: 0.2, stroll: 0.1 } }, graze: [{ who: 'sheep', count: 9 }] } },
});
// legacy fill and backdrop style names (place.style, backdrop.style) -> kit
const WORLD_KIT_ALIAS = Object.freeze({ 'canal-wooded': 'canal', lake: 'pond', 'lake-pond': 'pond', 'town-low': 'village-green', village: 'village-green', green: 'village-green',
  'city-victorian': 'civic-square', 'city-sheffield-hills': 'river-city', 'city-manchester-towers': 'river-city', harbour: 'quayside', docks: 'quayside', street: 'terraced-street',
  terrace: 'terraced-street', lane: 'old-town-lane', 'medieval-street': 'old-town-lane', ginnel: 'old-town-lane', moorland: 'moor', seaside: 'coast', wood: 'woodland', square: 'civic-square' });
// the slots whose objects stand in the frame (a framing trunk stands outside it), and the classes each kind of slot may hold
const _WKT_SLOT_CLS = { tree: ['tree'], dressing: ['tree', 'shrub', 'hedge', 'reed', 'flower', 'cover', 'rock', 'street', 'bench', 'lamp', 'post', 'signage', 'umbrella', 'fence', 'structure', 'building', 'cafe-table', 'picnic'],
  water: ['lily', 'fish-ring'], margin: ['reed', 'shrub', 'flower'], bough: ['bough', 'frond'], trunk: ['tree'] };

/* ---------- lookups ---------- */
/** The kit of a kit id or an alias (WORLD_KIT_ALIAS), or null. */
function worldKit(key) {
  if (typeof key !== 'string' || !key) return null;
  return WORLD_STYLE_KITS[key] || WORLD_STYLE_KITS[WORLD_KIT_ALIAS[key]] || null;
}
/** Every object a kit names, with its slot: [{ id, slot, band }]. kit: a kit record or a key. */
function worldKitIds(kit) {
  const K = typeof kit === 'string' ? worldKit(kit) : kit, out = [];
  if (!K || typeof K !== 'object') return out;
  const list = (L, slot, band) => { if (Array.isArray(L)) for (const it of L) if (Array.isArray(it) && typeof it[0] === 'string') out.push({ id: it[0], slot, band: band || null }); };
  for (const [g, sp] of Object.entries(K.fill || {})) {
    if (!sp) continue;
    if (g === 'water') { list(sp.calm, 'water.calm', 'water'); continue; }
    for (const b of ['near', 'mid', 'far', 'distant']) list(sp[b], 'fill.' + g + '.' + b, b);
    list(sp.accents, 'fill.' + g + '.accents', 'accents');
  }
  const E = K.edges || {};
  if (E.natural) { list(E.natural.margin, 'edges.margin', 'margin'); list(E.natural.bank, 'edges.bank', 'near'); }
  if (E.quay) { list(E.quay.top, 'edges.quay', 'near'); list(E.quay.posts, 'edges.quay.posts', 'near'); }
  list(E.verge, 'edges.verge', 'near'); list(E.hedgerow, 'edges.hedgerow', 'mid'); list(E.wallBase, 'edges.wallBase', 'near');
  for (const f of K.frame || []) {
    if (!f) continue;
    if (f.bough) out.push({ id: f.bough, slot: 'frame.bough', band: 'bough' });
    if (f.fronds) out.push({ id: f.fronds, slot: 'frame.fronds', band: 'bough' });
    if (f.trunk) out.push({ id: f.trunk, slot: 'frame.trunk', band: 'trunk' });
    if (f.obj) out.push({ id: f.obj, slot: 'frame.' + f.kind, band: 'near' });
  }
  for (const b of ['mid', 'far']) list(K.rich && K.rich[b], 'rich.' + b, b);
  return out;
}
/**
 * Check every kit (or o.kits: { id: kit }) against the library and the rules (see the header). -> problems [{ kit, slot, id, rule,
 * msg }]; empty when sound. o.place: the place a kit is checked for (default: the UK, Hampshire).
 */
function worldKitCheck(o) {
  o = o || {};
  const kits = o.kits || WORLD_STYLE_KITS, place = o.place || { lat: 51.29, lon: -0.82, region: 'hampshire' }, out = [];
  const P = (kit, s, rule, msg) => out.push({ kit, slot: s.slot, id: s.id, rule, msg: `${kit} ${s.slot}: ${s.id} ${msg}` });
  for (const [k, K] of Object.entries(kits)) {
    if (!K || typeof K !== 'object') { out.push({ kit: k, slot: null, id: null, rule: 'kitShape', msg: k + ' is not a kit' }); continue; }
    for (const need of ['place', 'backdrop', 'fill', 'edges', 'frame']) if (!K[need]) out.push({ kit: k, slot: need, id: null, rule: 'kitShape', msg: `${k} has no ${need}` });
    for (const g of ['grass', 'paving', 'path', 'water']) if (!K.fill || !K.fill[g]) out.push({ kit: k, slot: 'fill.' + g, id: null, rule: 'kitShape', msg: `${k} does not dress ${g}` });
    if (!Array.isArray(K.frame) || !K.frame.length) out.push({ kit: k, slot: 'frame', id: null, rule: 'kitShape', msg: `${k} has no framing options` });
    if (typeof WORLD_BACKDROP_STYLES === 'object' && WORLD_BACKDROP_STYLES && !WORLD_BACKDROP_STYLES[K.backdrop]) out.push({ kit: k, slot: 'backdrop', id: K.backdrop, rule: 'kitShape', msg: `${k}: unknown backdrop ${K.backdrop}` });
    // N3: every life default names a known population
    const L = K.life || {}, lives = [].concat(L.walk ? [L.walk] : [], L.paving ? [L.paving] : [], L.sand ? [L.sand] : [], L.water || [], L.graze || [], L.air || [], L.ground || []);
    if (!L.walk) out.push({ kit: k, slot: 'life.walk', id: null, rule: 'kitShape', msg: `${k} has no people (life.walk)` });
    for (const it of lives) if (!it || typeof WORLD_POPULATIONS !== 'object' || !WORLD_POPULATIONS || !WORLD_POPULATIONS[it.who]) out.push({ kit: k, slot: 'life', id: it && it.who, rule: 'kitLife', msg: `${k} life: ${it && it.who} is not a population (WORLD_POPULATIONS)` });
    for (const s of worldKitIds(K)) {
      const def = typeof sceneObj === 'function' ? sceneObj(s.id) : null;
      if (!def) { P(k, s, 'kitMissing', 'is not a library object (a kit names only real, approved objects; never a stand-in)'); continue; }
      const kb = typeof worldKb === 'function' ? worldKb(s.id) : null;
      if (!kb || kb.object === false || !kb.size || !(kb.size.h0 > 0)) { P(k, s, 'kitNoKb', 'has no knowledge-base descriptor with a real size'); continue; }
      if (WORLD_KIT_WEAK[s.id]) { P(k, s, 'kitWeak', 'is a weak object: ' + WORLD_KIT_WEAK[s.id]); continue; }
      if (WORLD_KIT_DISTANT_ONLY.includes(s.id) && s.band !== 'distant') { P(k, s, 'kitDome', 'is a round-dome tree or blob: only in a distant list (beyond 120 m)'); continue; }
      if (WORLD_KIT_TRUNK_ONLY.includes(s.id) && s.band !== 'trunk') { P(k, s, 'kitTrunk', 'is a bare trunk: only as a framing bough\'s parent outside the frame'); continue; }
      const want = s.band === 'water' ? _WKT_SLOT_CLS.water : s.band === 'margin' ? _WKT_SLOT_CLS.margin : s.band === 'bough' ? _WKT_SLOT_CLS.bough : s.band === 'trunk' ? _WKT_SLOT_CLS.trunk : _WKT_SLOT_CLS.dressing;
      if (!want.includes(kb.cls)) { P(k, s, 'kitClass', `is a ${kb.cls}: not a ${s.band} object`); continue; }
      if (typeof worldKbRegionOk === 'function' && !worldKbRegionOk(kb, place).ok) { P(k, s, 'kitRegion', 'does not belong in the UK'); continue; }
      if (kb.care && kb.care.ok === false) P(k, s, 'kitCare', 'breaks the care rules (text, flags, faces, symbols)');
    }
  }
  return out;
}
/** The fill style record of a kit (what the fill reads), or null. */
function worldKitFillStyle(key) {
  const K = worldKit(key);
  if (!K) return null;
  const id = WORLD_STYLE_KITS[key] ? key : WORLD_KIT_ALIAS[key];
  const fill = {};
  for (const [g, sp] of Object.entries(K.fill || {})) if (sp) fill[g] = sp;
  if (!fill.heath && K.fill && K.fill.grass) fill.heath = K.fill.grass;
  return { kit: id, label: K.label, backdrop: K.backdrop, place: K.place, ground: K.ground, sky: K.sky, layers: K.layers, bare: K.bare || null, look: K.look || {}, fill, edges: K.edges, frame: K.frame, rich: K.rich, life: K.life || {} };
}
