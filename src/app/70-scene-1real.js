/* ============================================================
   SCENE ENGINE v2: real sizes (docs/dev/SCENE_ENGINE_V2.md 4.2; builder A). PURE data and one lookup.

   Every library object gets a REAL size in metres, so a ground placement's scale is never the author's choice:
     s = k * (f / d) * (real.h / size[1])
   real: { h, l, w }. h is the height that size[1] stands for (a mast, a spire, a crane's jib included); l the length that
   size[0] stands for in the object's own view; w the depth across it (a boat's beam, a car's width, a building's depth).

     SCENE_REAL_SIZE        by id ('vehicle.car'), by glob ('person.*', 'tree.pond-*'), by role ('role:tree'); a value is
                            { h, l?, w? } or { h, per } (h scales with size[1] / per: the people share one figure, 64 units
                            to 1.72 m, so a seated or a child figure keeps the same metric)
     sceneObjReal(id)       -> { h, l, w, src: 'def' | 'table' | 'class', warn? }: the object's own `real` field first, then the
                            table (id, then the most specific glob, then its role), then the class default with a warning.
   Landmark heights are the real structures' (to the roof, the spire or the antenna that is drawn); where the drawing holds a
   hill or a crag under the building, the height is of what is drawn. Natural landmarks (hills, mountains): the visible rise.
   ============================================================ */
const SCENE_REAL_SIZE = Object.freeze({
  // people: the shared figure (64 units = 1.72 m), so children, sitters and riders keep one metric
  'person.*': { h: 1.72, per: 64, l: 0.5, w: 0.45 },
  'person.cyclist': { h: 1.72, per: 64, l: 1.75, w: 0.6 }, 'person.cyclist-commuter': { h: 1.72, per: 64, l: 1.75, w: 0.6 },
  'person.cyclist-front': { h: 1.75, l: 0.6, w: 1.75 }, 'person.cyclist-rear': { h: 1.75, l: 0.6, w: 1.75 },
  'person.kayaker': { h: 1.72, per: 64, l: 3.6, w: 0.7 }, 'person.rower': { h: 1.72, per: 64, l: 7, w: 0.8 }, 'person.paddleboarder': { h: 1.72, per: 64, l: 3.2, w: 0.8 }, 'person.sailor': { h: 1.72, per: 64, l: 4, w: 1.5 },
  // vehicles
  'vehicle.car': { h: 1.5, l: 4.2, w: 1.8 }, 'vehicle.car-city': { h: 1.5, l: 4.3, w: 1.8 }, 'vehicle.taxi': { h: 1.6, l: 4.5, w: 1.8 }, 'vehicle.taxi-black': { h: 1.8, l: 4.6, w: 2 },
  'vehicle.car-front': { h: 1.5, l: 1.8, w: 4.2 }, 'vehicle.car-rear': { h: 1.5, l: 1.8, w: 4.2 }, 'vehicle.taxi-front': { h: 1.6, l: 1.8, w: 4.5 }, 'vehicle.taxi-rear': { h: 1.6, l: 1.8, w: 4.5 },
  'vehicle.taxi-black-front': { h: 1.8, l: 2, w: 4.6 }, 'vehicle.taxi-black-rear': { h: 1.8, l: 2, w: 4.6 },
  'vehicle.bus': { h: 4.4, l: 11, w: 2.55 }, 'vehicle.bus-double-decker': { h: 4.4, l: 11, w: 2.55 }, 'vehicle.bus-front': { h: 4.4, l: 2.55, w: 11 }, 'vehicle.bus-rear': { h: 4.4, l: 2.55, w: 11 },
  'vehicle.tram-front': { h: 3.4, l: 2.65, w: 30 }, 'vehicle.tram-rear': { h: 3.4, l: 2.65, w: 30 },
  'vehicle.nottingham-tram': { h: 3.4, l: 33, w: 2.4 }, 'vehicle.metrolink-tram': { h: 3.4, l: 29, w: 2.65 }, 'vehicle.metrolink-m5000': { h: 3.4, l: 28.4, w: 2.65 },
  'vehicle.supertram': { h: 3.4, l: 34.8, w: 2.65 }, 'vehicle.sheffield-supertram': { h: 3.4, l: 34.8, w: 2.65 },
  'vehicle.tractor': { h: 2.9, l: 4.5, w: 2.4 }, 'vehicle.tuk-tuk': { h: 1.9, l: 2.9, w: 1.4 }, 'vehicle.scooter': { h: 1.6, l: 1.8, w: 0.7 },
  'vehicle.display-jet': { h: 4, l: 14, w: 9 }, 'vehicle.airliner': { h: 12, l: 40, w: 35 }, 'vehicle.light-aircraft': { h: 2.4, l: 7, w: 10 }, 'vehicle.paraglider': { h: 8, l: 10, w: 3 },
  // rail
  'rail.train': { h: 3.8, l: 60, w: 2.8 }, 'rail.train-mainline': { h: 3.8, l: 60, w: 2.8 }, 'rail.train-tube': { h: 2.9, l: 50, w: 2.6 }, 'rail.train-subsurface': { h: 3.7, l: 50, w: 2.9 },
  'rail.train-dlr': { h: 3.5, l: 28, w: 2.65 }, 'rail.l-train': { h: 3.7, l: 30, w: 2.8 }, 'rail.steam-train': { h: 4, l: 60, w: 2.8 }, 'rail.heritage-steam-loco': { h: 4, l: 19, w: 2.8 },
  'rail.heritage-coach': { h: 3.9, l: 20, w: 2.8 }, 'rail.canopy': { h: 4.5, l: 24, w: 6 }, 'rail.embankment': { h: 4, l: 14, w: 12 }, 'rail.platform': { h: 1, l: 30, w: 4 }, 'rail.track': { h: 0.4, l: 30, w: 3 },
  'rail.*': { h: 3.8, l: 40, w: 2.8 },
  // boats (h above the water, masts included)
  'boat.narrowboat': { h: 1.9, l: 18, w: 2.1 }, 'boat.narrowboat-bow': { h: 1.9, l: 2.1, w: 18 }, 'boat.narrowboat-stern': { h: 1.9, l: 2.1, w: 18 }, 'boat.narrowboat-receding': { h: 2.6, l: 6, w: 18 },
  'boat.yacht': { h: 14, l: 10, w: 3.4 }, 'boat.broads-cruiser': { h: 3, l: 10, w: 3.4 }, 'boat.broads-sail': { h: 12, l: 9, w: 2.8 }, 'boat.solent-cruise-liner': { h: 60, l: 300, w: 38 },
  'boat.solent-car-ferry': { h: 18, l: 90, w: 18 }, 'boat.solent-hovercraft': { h: 6.5, l: 22, w: 12 }, 'boat.solent-yacht': { h: 13, l: 9, w: 3.2 }, 'boat.solent-container-ship': { h: 45, l: 300, w: 45 },
  'boat.junk': { h: 15, l: 20, w: 5 }, 'boat.dinghy': { h: 6, l: 4.2, w: 1.6 }, 'boat.fishing-boat': { h: 7, l: 12, w: 4 }, 'boat.ferry': { h: 10, l: 30, w: 8 }, 'boat.tug': { h: 9, l: 25, w: 9 },
  'boat.water-taxi': { h: 2.5, l: 8, w: 2.6 }, 'boat.longtail': { h: 1.6, l: 12, w: 1.6 }, 'boat.sampan': { h: 2, l: 7, w: 2 }, 'boat.bumboat': { h: 2.6, l: 12, w: 3.5 }, 'boat.cruise-liner': { h: 60, l: 300, w: 38 },
  'boat.island-ferry': { h: 18, l: 90, w: 18 }, 'boat.*': { h: 2, l: 8, w: 2.5 },
  // animals and birds
  'animal.fox': { h: 0.45, l: 1, w: 0.3 }, 'animal.sheep': { h: 0.9, l: 1.3, w: 0.5 }, 'animal.sheep-moor': { h: 0.85, l: 1.25, w: 0.5 }, 'animal.pony': { h: 1.35, l: 2, w: 0.6 }, 'animal.donkey': { h: 1.3, l: 1.9, w: 0.6 },
  'animal.cattle': { h: 1.45, l: 2.4, w: 0.8 }, 'animal.deer': { h: 1.1, l: 1.3, w: 0.4 }, 'animal.rabbit': { h: 0.3, l: 0.4, w: 0.18 }, 'animal.squirrel': { h: 0.3, l: 0.45, w: 0.12 }, 'animal.dog': { h: 0.6, l: 0.9, w: 0.3 },
  'animal.butterfly': { h: 0.06, l: 0.06, w: 0.06 }, 'animal.dragonfly': { h: 0.07, l: 0.09, w: 0.09 }, 'animal.pond-dragonfly': { h: 0.08, l: 0.12, w: 0.1 }, 'animal.bee': { h: 0.03, l: 0.03, w: 0.02 }, 'animal.trout': { h: 0.15, l: 0.5, w: 0.1 },
  'animal.*': { h: 0.8, l: 1, w: 0.4 },
  'bird.mallard': { h: 0.35, l: 0.6, w: 0.3 }, 'bird.swan': { h: 0.8, l: 1.5, w: 0.6 }, 'bird.coot': { h: 0.3, l: 0.4, w: 0.2 }, 'bird.moorhen': { h: 0.3, l: 0.38, w: 0.2 }, 'bird.grebe': { h: 0.4, l: 0.5, w: 0.2 },
  'bird.goose': { h: 0.75, l: 1, w: 0.4 }, 'bird.heron': { h: 0.95, l: 0.8, w: 0.3 }, 'bird.kingfisher': { h: 0.18, l: 0.17, w: 0.06 }, 'bird.robin': { h: 0.15, l: 0.14, w: 0.06 }, 'bird.stonechat': { h: 0.13, l: 0.13, w: 0.05 },
  'bird.dartford-warbler': { h: 0.13, l: 0.13, w: 0.05 }, 'bird.pigeon': { h: 0.3, l: 0.33, w: 0.12 }, 'bird.pigeon-feral': { h: 0.3, l: 0.33, w: 0.12 }, 'bird.herring-gull': { h: 0.55, l: 0.6, w: 0.2 },
  'bird.nightjar': { h: 0.2, l: 0.6, w: 0.25 }, 'bird.curlew-flight': { h: 0.3, l: 0.9, w: 0.55 }, 'bird.herring-gull-flight': { h: 0.5, l: 1.4, w: 0.6 }, 'bird.gull': { h: 0.45, l: 1.3, w: 0.55 },
  'bird.egret-flight': { h: 0.45, l: 1, w: 0.9 }, 'bird.kite-brahminy': { h: 0.45, l: 1.2, w: 0.5 }, 'bird.goose-flight': { h: 0.6, l: 1.7, w: 1 }, 'bird.kingfisher-flight': { h: 0.08, l: 0.26, w: 0.17 }, 'bird.small-flight': { h: 0.12, l: 0.25, w: 0.15 },
  'bird.*': { h: 0.35, l: 0.5, w: 0.3 },
  // trees (to the crown's top) and plants
  'tree.oak': { h: 18 }, 'tree.birch': { h: 15 }, 'tree.pine': { h: 20 }, 'tree.plane': { h: 24 }, 'tree.willow': { h: 14 }, 'tree.alder': { h: 15 }, 'tree.horse-chestnut': { h: 20 }, 'tree.hawthorn': { h: 7 },
  'tree.ancient-oak': { h: 16 }, 'tree.plane-avenue': { h: 22 }, 'tree.cherry-blossom': { h: 8 }, 'tree.cherry': { h: 7 }, 'tree.maple-momiji': { h: 7 }, 'tree.maple-japanese': { h: 5 }, 'tree.cedar': { h: 20 },
  'tree.distant': { h: 15 }, 'tree.distant-pine': { h: 18 }, 'tree.green-oak': { h: 18 }, 'tree.green-chestnut': { h: 20 }, 'tree.green-willow': { h: 14 }, 'tree.green-alder': { h: 15 }, 'tree.green-birch': { h: 15 },
  'tree.pine-veteran': { h: 18 }, 'tree.birch-heath': { h: 12 }, 'tree.woods-edge': { h: 12, w: 20 }, 'tree.rain-tree': { h: 18 }, 'tree.pond-wood': { h: 14, w: 20 }, 'tree.pool-pine': { h: 20 }, 'tree.pool-birch': { h: 15 }, 'tree.pool-oak': { h: 17 },
  'tree.bank-oak': { h: 16 }, 'tree.bank-alder': { h: 14 }, 'tree.bank-willow': { h: 12 }, 'tree.bank-birch': { h: 15 }, 'tree.bank-distant': { h: 15 },
  'tree.pond-oak': { h: 16 }, 'tree.pond-alder': { h: 14 }, 'tree.pond-willow': { h: 12 }, 'tree.pond-birch': { h: 14 }, 'tree.pond-pine': { h: 16 },
  'tree.far-pine': { h: 16 }, 'tree.far-birch': { h: 14 }, 'tree.far-broad': { h: 15 }, 'tree.*': { h: 15 },
  'plant.grass': { h: 0.35 }, 'plant.heather': { h: 0.4 }, 'plant.gorse': { h: 1.4 }, 'plant.reed': { h: 1.8 }, 'plant.bulrush': { h: 1.6 }, 'plant.bracken': { h: 0.9 }, 'plant.fern': { h: 0.8 },
  'plant.wildflowers': { h: 0.5 }, 'plant.bluebells': { h: 0.25 }, 'plant.hedge': { h: 1.8, w: 1.2 }, 'plant.shrub': { h: 2.2 }, 'plant.holly': { h: 3.5 }, 'plant.planter': { h: 0.7, w: 0.6 },
  'plant.moor-heather': { h: 0.35 }, 'plant.bilberry': { h: 0.3 }, 'plant.towpath-hedge': { h: 2.2, w: 1.2 }, 'plant.hedgerow-blackberry': { h: 2.5, w: 1.5 }, 'plant.water-crowfoot': { h: 0.08 }, 'plant.watercress': { h: 0.15 },
  'plant.palm-coconut': { h: 15 }, 'plant.palm-coconut-tall': { h: 22 }, 'plant.palm-royal': { h: 18 }, 'plant.banana': { h: 4 }, 'plant.banana-grove': { h: 5 }, 'plant.frangipani': { h: 6 },
  'plant.bougainvillea': { h: 1.5 }, 'plant.bougainvillea-hedge': { h: 2, w: 1.2 }, 'plant.ixora': { h: 0.8 }, 'plant.grass-tropical': { h: 0.6 }, 'plant.bamboo': { h: 10 }, 'plant.sasa': { h: 0.6 }, 'plant.azalea': { h: 1.2 }, 'plant.susuki': { h: 1.5 },
  'plant.daisies': { h: 0.12 }, 'plant.grass-long': { h: 0.6 }, 'plant.*': { h: 0.8 },
  // ground, water details and rocks (flat pieces: the height of what is drawn above the ground)
  'ground.beach': { h: 1.5 }, 'ground.hay-bales': { h: 1.5 }, 'ground.monsoon-puddle': { h: 0.15 }, 'ground.swim': { h: 0.5 }, 'ground.path': { h: 3 }, 'ground.log': { h: 0.6 }, 'ground.puddle': { h: 0.12 },
  'ground.leaves': { h: 0.1 }, 'ground.heathland': { h: 0.5 }, 'ground.leaf-litter': { h: 0.06 }, 'ground.petals': { h: 0.04 }, 'ground.*': { h: 0.3 },
  'water.chalk-stream': { h: 0.5 }, 'water.koi-pond': { h: 0.8 }, 'water.edge': { h: 0.5 }, 'water.lily': { h: 0.1 }, 'water.fish-ring': { h: 0.08 }, 'water.*': { h: 0.3 },
  'rock.millstone': { h: 1.4 }, 'rock.stones': { h: 0.3 }, 'rock.boulder': { h: 1.2 }, 'rock.chalk-downs': { h: 60 }, 'rock.gritstone-edge': { h: 25 }, 'rock.chalk-cliff': { h: 60 }, 'rock.*': { h: 1 },
  // street furniture
  'street.lamp': { h: 5.5 }, 'street.lamppost': { h: 5.5 }, 'street.bench': { h: 0.85, w: 0.6 }, 'street.bollard': { h: 1 }, 'street.mcr-bunting': { h: 4 }, 'street.tram-shelter': { h: 2.8, w: 1.6 },
  'street.sheffield2-festoon': { h: 1.5 }, 'street.market-stall': { h: 2.6, w: 2 }, 'street.lantern-string': { h: 3 }, 'street.station-nameboard': { h: 2.6 }, 'street.station-clock': { h: 3.5 },
  'street.station-entrance': { h: 3.5, w: 4 }, 'street.*': { h: 2 },
  // buildings (to the ridge or the parapet), structures
  'building.terrace': { h: 9, w: 9 }, 'building.terrace-victorian': { h: 9, w: 9 }, 'building.terrace-northern': { h: 8, w: 9 }, 'building.sheffield-terrace': { h: 8, w: 9 }, 'building.townhouse': { h: 13, w: 12 },
  'building.business-park-office': { h: 12, w: 20 }, 'building.mcr-mill': { h: 22, w: 20 }, 'building.norwich-market': { h: 7, w: 20 }, 'building.elm-hill-house': { h: 9, w: 9 }, 'building.riverside-stand': { h: 14, w: 20 },
  'building.lace-market-warehouse': { h: 22, w: 18 }, 'building.peak-cottage': { h: 6, w: 7 }, 'building.sheffield-works': { h: 12, w: 15 }, 'building.sheffield2-shoprow': { h: 10, w: 12 }, 'building.sheffield2-pub': { h: 9, w: 12 },
  'building.solent-dock-crane': { h: 40, w: 12 }, 'building.solent-containers': { h: 5.2, w: 12 }, 'building.solent-storehouse': { h: 10, w: 15 }, 'building.solent-harbour-fort': { h: 12, w: 25 }, 'building.solent-sea-fort': { h: 12, w: 50 },
  'building.solent-seafront-villa': { h: 11, w: 12 }, 'building.wokingham-street': { h: 10, w: 12 }, 'building.skyscraper': { h: 200, w: 40 }, 'building.shopfront': { h: 10, w: 10 }, 'building.lighthouse': { h: 26, w: 8 },
  'building.beach-huts': { h: 2.6, w: 2.5 }, 'building.oast-house': { h: 14, w: 10 }, 'building.windmill': { h: 18, w: 8 }, 'building.thatched-cottage': { h: 7, w: 7 }, 'building.pagoda': { h: 30, w: 12 },
  'building.temple-hall': { h: 14, w: 20 }, 'building.house-jp': { h: 7, w: 9 }, 'building.apartment-jp': { h: 9, w: 12 }, 'building.green-cottage': { h: 7, w: 7 }, 'building.cottage': { h: 7, w: 7 },
  'building.station-1930s': { h: 9, w: 12 }, 'building.station-terminus': { h: 20, w: 30 }, 'building.train-shed': { h: 18, w: 40 }, 'building.station-glass': { h: 10, w: 15 }, 'building.station-cut-cover': { h: 7, w: 12 },
  'building.station-dlr': { h: 10, w: 12 }, 'building.station-brick': { h: 9, w: 12 }, 'building.ticket-hall': { h: 6, w: 10 }, 'building.station-victorian': { h: 12, w: 15 }, 'building.station-holden': { h: 12, w: 15 },
  'building.station-modern': { h: 10, w: 15 }, 'building.tower': { h: 60, w: 25 }, 'building.tower-glass': { h: 120, w: 35 }, 'building.tower-stone': { h: 90, w: 30 }, 'building.skyline-band': { h: 60, w: 100 },
  'building.shophouse': { h: 11, w: 15 }, 'building.shophouse-row': { h: 11, w: 15 }, 'building.church': { h: 20, w: 20 }, 'building.mill-red-brick': { h: 20, w: 18 }, 'building.warehouse-canal': { h: 18, w: 15 },
  'building.media-block': { h: 20, w: 20 }, 'building.stadium': { h: 30, w: 150 }, 'building.*': { h: 9, w: 10 },
  'structure.airshow-chalet': { h: 5, w: 8 }, 'structure.mediacity-footbridge': { h: 25, w: 6 }, 'structure.goose-fair-wheel': { h: 40, w: 8 }, 'structure.sandstone-steps': { h: 6, w: 10 }, 'structure.dry-wall': { h: 1.2, w: 0.6 },
  'structure.stepping-stones': { h: 0.3, w: 1 }, 'structure.bellmouth': { h: 1, w: 3 }, 'structure.sheffield2-shelter': { h: 3, w: 2 }, 'structure.sheffield2-weir': { h: 1.5, w: 3 }, 'structure.sheffield2-headstones': { h: 1, w: 1 },
  'structure.solent-pier': { h: 6, w: 8 }, 'structure.level-crossing': { h: 3, w: 8 }, 'structure.lantern-stone': { h: 2, w: 0.8 }, 'structure.cattle-grid': { h: 0.6, w: 3 }, 'structure.dock-crane': { h: 35, w: 12 },
  'structure.drystone-wall': { h: 1.3, w: 0.6 }, 'structure.packhorse-bridge': { h: 4, w: 3 }, 'structure.bridge-arch': { h: 20, w: 10 }, 'structure.bridge-suspension': { h: 60, w: 25 }, 'structure.groyne': { h: 1.5, w: 1 },
  'structure.stone-wall': { h: 1.2, w: 0.6 }, 'structure.field-gate': { h: 1.3, w: 0.2 }, 'structure.torii': { h: 8, w: 2 }, 'structure.lantern-stone-garden': { h: 2, w: 0.8 }, 'structure.bridge-brick': { h: 8, w: 6 },
  'structure.boardwalk': { h: 1.2, w: 2 }, 'structure.viewing-platform': { h: 2, w: 4 }, 'structure.fence': { h: 1.2, w: 0.2 }, 'structure.lock-gate': { h: 2.5, w: 1 }, 'structure.*': { h: 4, w: 4 },
  // landmarks (the real structure's height; see the header)
  'landmark.st-michaels-abbey': { h: 30 }, 'landmark.fast-museum': { h: 15 }, 'landmark.farnborough-main-station': { h: 10 }, 'landmark.farnborough-north-station': { h: 8 }, 'landmark.farnborough-airport': { h: 25 },
  'landmark.queensmead': { h: 12 }, 'landmark.farnborough-cut-bridge': { h: 8 }, 'landmark.fleet-canal-bridge': { h: 8 }, 'landmark.all-saints-fleet': { h: 25 }, 'landmark.southwood-oak': { h: 20 },
  'landmark.greywell-tunnel-portal': { h: 8 }, 'landmark.odiham-castle': { h: 12 }, 'landmark.hook-coaching-inn': { h: 10 }, 'landmark.hook-station': { h: 8 }, 'landmark.butter-wood-oak': { h: 20 },
  'landmark.whitewater-brick-bridge': { h: 5 }, 'landmark.manchester-town-hall': { h: 87 }, 'landmark.manchester-town-hall-front': { h: 87 }, 'landmark.beetham-tower': { h: 169 }, 'landmark.beetham-tower-blade': { h: 169 },
  'landmark.castlefield-viaduct': { h: 15 }, 'landmark.castlefield-viaducts': { h: 15 }, 'landmark.john-rylands': { h: 30 }, 'landmark.whitworth-hall': { h: 30 }, 'landmark.whitworth-gallery': { h: 15 },
  'landmark.salford-lowry': { h: 30 }, 'landmark.mcr-central-library': { h: 30 }, 'landmark.mcr-stadium': { h: 30 }, 'landmark.mcr-cathedral': { h: 42 }, 'landmark.mcr-corn-exchange': { h: 25 },
  'landmark.mcr-chinatown-arch': { h: 10 }, 'landmark.mcr-etihad': { h: 40 }, 'landmark.mcr-old-trafford': { h: 40 }, 'landmark.mcr-sim-station': { h: 15 }, 'landmark.heaton-hall': { h: 15 },
  'landmark.mcr-chips': { h: 30 }, 'landmark.mcr-piccadilly-pavilion': { h: 8 }, 'landmark.mcr-owens-park-tower': { h: 60 }, 'landmark.iwm-north': { h: 55 }, 'landmark.ordsall-chord': { h: 20 },
  'landmark.stockport-viaduct': { h: 33 }, 'landmark.st-michaels-lyndhurst': { h: 46 }, 'landmark.hurst-castle': { h: 15 }, 'landmark.bucklers-hard-row': { h: 8 }, 'landmark.palace-house-beaulieu': { h: 18 },
  'landmark.st-thomas-lymington': { h: 30 }, 'landmark.norwich-cathedral': { h: 96 }, 'landmark.norwich-castle': { h: 35 }, 'landmark.pulls-ferry': { h: 10 }, 'landmark.cow-tower': { h: 15 },
  'landmark.norwich-forum': { h: 20 }, 'landmark.erpingham-gate': { h: 15 }, 'landmark.norfolk-windpump': { h: 15 }, 'landmark.nottingham-castle': { h: 40 }, 'landmark.trip-to-jerusalem': { h: 20 },
  'landmark.nottingham-council-house': { h: 61 }, 'landmark.market-square-fountains': { h: 4 }, 'landmark.wollaton-hall': { h: 30 }, 'landmark.trent-bridge': { h: 10 }, 'landmark.major-oak': { h: 16 },
  'landmark.goose-fair-rides': { h: 30 }, 'landmark.edwinstowe-church': { h: 25 }, 'landmark.stanage-edge': { h: 25 }, 'landmark.mam-tor': { h: 150 }, 'landmark.thorpe-cloud': { h: 120 },
  'landmark.peveril-castle': { h: 40 }, 'landmark.bakewell-bridge': { h: 6 }, 'landmark.hathersage-church': { h: 30 }, 'landmark.derwent-dam': { h: 35 }, 'landmark.ladybower-viaduct': { h: 15 }, 'landmark.ladybower-dam': { h: 35 },
  'landmark.reepham-market-place': { h: 10 }, 'landmark.reepham-churches': { h: 25 }, 'landmark.reepham-station': { h: 7 }, 'landmark.marriotts-way-bridge': { h: 8 },
  'landmark.sheffield-arts-tower': { h: 78 }, 'landmark.sheffield-arts-tower-glass': { h: 78 }, 'landmark.sheffield-diamond': { h: 15 }, 'landmark.sheffield-winter-garden': { h: 22 }, 'landmark.sheffield-winter-garden-arches': { h: 22 },
  'landmark.sheffield-kelham': { h: 25 }, 'landmark.kelham-island': { h: 25 }, 'landmark.sheffield-park-hill': { h: 40 }, 'landmark.park-hill-flats': { h: 40 }, 'landmark.sheffield-botanical': { h: 12 },
  'landmark.sheffield-town-hall': { h: 59 }, 'landmark.sheffield-town-hall-tower': { h: 59 }, 'landmark.endcliffe-bridge': { h: 4 }, 'landmark.peace-gardens-fountains': { h: 3 },
  'landmark.sheffield2-division-corner': { h: 15 }, 'landmark.sheffield2-chimney': { h: 30 }, 'landmark.sheffield2-crucible': { h: 15 }, 'landmark.sheffield2-lyceum': { h: 25 }, 'landmark.sheffield2-moor-market': { h: 12 },
  'landmark.sheffield2-station': { h: 12 }, 'landmark.sheffield2-cutting-edge': { h: 8 }, 'landmark.sheffield2-weston-museum': { h: 12 }, 'landmark.sheffield2-meadowhall': { h: 25 }, 'landmark.sheffield2-cemetery-gate': { h: 15 },
  'landmark.sheffield2-abbeydale': { h: 12 }, 'landmark.sheffield2-hillsborough-house': { h: 12 }, 'landmark.sheffield2-forge-dam': { h: 5 }, 'landmark.sheffield2-rivelin-dam': { h: 8 }, 'landmark.sheffield2-wardsend': { h: 8 },
  'landmark.sheffield2-bramall-lane': { h: 30 }, 'landmark.solent-spinnaker-tower': { h: 170 }, 'landmark.spinnaker-tower': { h: 170 }, 'landmark.solent-hms-victory': { h: 62 }, 'landmark.hms-victory': { h: 62 },
  'landmark.hms-warrior': { h: 50 }, 'landmark.bargate': { h: 15 }, 'landmark.winchester-cathedral': { h: 46 }, 'landmark.winchester-cathedral-close': { h: 15 }, 'landmark.winchester-city-mill': { h: 10 },
  'landmark.winchester-great-hall': { h: 20 }, 'landmark.king-alfred-statue': { h: 10 }, 'landmark.jane-austens-house': { h: 9 }, 'landmark.jane-austen-house': { h: 9 }, 'landmark.butser-hill': { h: 100 },
  'landmark.st-catherines-hill': { h: 60 }, 'landmark.ropley-station': { h: 6 }, 'landmark.test-fishing-hut': { h: 4 }, 'landmark.alresford-fulling-mill': { h: 7 }, 'landmark.kingfield-floodlights': { h: 30 },
  'landmark.old-woking-church': { h: 20 }, 'landmark.basingstoke-lock': { h: 5 }, 'landmark.necropolis-station': { h: 8 }, 'landmark.wey-bridge': { h: 6 }, 'landmark.woking-martian': { h: 7 },
  'landmark.shah-jahan-mosque': { h: 15 }, 'landmark.woking-lightbox': { h: 10 }, 'landmark.woking-towers': { h: 120 }, 'landmark.woking-station': { h: 10 }, 'landmark.horsell-sandpits': { h: 8 },
  'landmark.wokingham-town-hall': { h: 25 }, 'landmark.all-saints-wokingham': { h: 25 }, 'landmark.wokingham-station': { h: 7 }, 'landmark.dinton-island': { h: 15 }, 'landmark.wellingtonia-avenue': { h: 35 },
  'landmark.heath-pine-stand': { h: 20 }, 'landmark.farnborough-airship-hangar': { h: 20 }, 'landmark.fleet-station': { h: 7 }, 'landmark.fleet-pond-boardwalk': { h: 3 }, 'landmark.st-peters-yateley': { h: 20 },
  'landmark.al-faisaliah': { h: 267 }, 'landmark.ararat': { h: 3000 }, 'landmark.bank-of-america-plaza': { h: 312 }, 'landmark.bank-of-china': { h: 367 }, 'landmark.big-wild-goose-pagoda': { h: 64 },
  'landmark.brooklyn-bridge': { h: 84 }, 'landmark.burj-khalifa': { h: 828 }, 'landmark.canton-tower': { h: 600 }, 'landmark.central-plaza': { h: 374 }, 'landmark.chicago-l': { h: 6 }, 'landmark.chrysler': { h: 319 },
  'landmark.chureito-pagoda': { h: 25 }, 'landmark.devon-tower': { h: 260 }, 'landmark.dragon-bridge': { h: 40 }, 'landmark.emirates-towers': { h: 355 }, 'landmark.empire-state': { h: 443 }, 'landmark.flame-towers': { h: 190 },
  'landmark.golden-gate-bridge': { h: 227 }, 'landmark.golden-horn-bridge': { h: 226 }, 'landmark.great-american-tower': { h: 202 }, 'landmark.hancock-tower': { h: 241 }, 'landmark.jin-mao': { h: 421 },
  'landmark.khor-virap': { h: 30 }, 'landmark.kingdom-centre': { h: 302 }, 'landmark.kl-tower': { h: 421 }, 'landmark.longfellow-bridge': { h: 20 }, 'landmark.macau-taipa-bridge': { h: 30 }, 'landmark.macau-tower': { h: 338 },
  'landmark.mackinac-bridge': { h: 168 }, 'landmark.maiden-tower': { h: 29 }, 'landmark.margaret-hunt-hill-bridge': { h: 122 }, 'landmark.marina-bay-sands': { h: 200 }, 'landmark.monas': { h: 132 }, 'landmark.mount-fuji': { h: 3000 },
  'landmark.nashville-twin-spires': { h: 188 }, 'landmark.one-wtc': { h: 541 }, 'landmark.oriental-pearl': { h: 468 }, 'landmark.petronas-towers': { h: 452 }, 'landmark.philadelphia-city-hall': { h: 167 },
  'landmark.prudential-tower': { h: 229 }, 'landmark.reunion-tower': { h: 171 }, 'landmark.roebling-bridge': { h: 30 }, 'landmark.shanghai-tower': { h: 632 }, 'landmark.shanghai-wfc': { h: 492 }, 'landmark.shelby-street-bridge': { h: 20 },
  'landmark.singapore-flyer': { h: 165 }, 'landmark.skydance-bridge': { h: 37 }, 'landmark.skytree': { h: 634 }, 'landmark.space-needle': { h: 184 }, 'landmark.st-pauls-facade': { h: 111 }, 'landmark.statue-of-liberty': { h: 93 },
  'landmark.supertrees': { h: 50 }, 'landmark.taipei-101': { h: 508 }, 'landmark.tokyo-tower': { h: 333 }, 'landmark.two-ifc': { h: 412 }, 'landmark.wheeler-wheel': { h: 53 }, 'landmark.willis-tower': { h: 527 }, 'landmark.xian-city-wall': { h: 12 },
  'landmark.*': { h: 30 },
  // roles (objects added later fall back here before their category)
  'role:tree': { h: 15 }, 'role:shrub': { h: 1.5 }, 'role:ground': { h: 0.4 }, 'role:edge': { h: 1 }, 'role:rock': { h: 1 }, 'role:building-far': { h: 30, w: 15 }, 'role:building-mid': { h: 12, w: 12 },
  'role:building-near': { h: 8, w: 10 }, 'role:street': { h: 2 }, 'role:walker': { h: 1.72, per: 64 }, 'role:vehicle': { h: 1.6, l: 4.4, w: 1.8 }, 'role:boat': { h: 2, l: 8, w: 2.5 }, 'role:bird': { h: 0.35 },
  'role:animal': { h: 0.8 }, 'role:sky': { h: 1 },
});
/** Class defaults (the last resort, with a warning): metres. */
const _SCRE_CLASS_H = { person: 1.72, cyclist: 1.75, car: 1.5, bus: 4.4, tram: 3.4, train: 3.8, bike: 1.6, tractor: 2.9, boat: 2, animal: 0.8, 'animal-graze': 1, 'animal-dog': 0.6,
  'bird-water': 0.35, 'bird-ground': 0.3, 'bird-air': 0.4, air: 1, tree: 15, shrub: 1, cover: 0.2, street: 2, rail: 1, building: 9, structure: 4, landmark: 30, rock: 1 };
const _screGlobs = Object.keys(SCENE_REAL_SIZE).filter(k => k.includes('*')).map(k => ({ k, re: new RegExp('^' + k.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'), n: k.replace(/\*/g, '').length })).sort((a, b) => b.n - a.n);
const _screMemo = new Map();
/** The real size of an object (4.2): { h, l, w, src: 'def' | 'table' | 'class', warn? } (memoised; a redefined object is looked up again). */
function sceneObjReal(id) {
  const def = typeof sceneObj === 'function' ? sceneObj(id) : null;
  const hit = _screMemo.get(id);
  if (hit && hit.def === def) return hit.r;
  const size = def && Array.isArray(def.size) ? def.size : null, aspect = size ? size[0] / Math.max(1, size[1]) : 1;
  const fill = (v, src) => {
    const h = v.per && size ? v.h * size[1] / v.per : v.h, l = v.l != null && !v.per ? v.l : (v.l != null ? v.l : h * aspect), w = v.w != null ? v.w : Math.max(0.05, Math.min(l, h) * 0.6);
    return { h: Math.round(h * 1000) / 1000, l: Math.round(l * 1000) / 1000, w: Math.round(w * 1000) / 1000, src };
  };
  let r = null;
  if (def && def.real && def.real.h > 0) r = fill(def.real, 'def');
  else if (SCENE_REAL_SIZE[id] && !String(id).includes('*')) r = fill(SCENE_REAL_SIZE[id], 'table');
  else {
    const g = _screGlobs.find(x => x.re.test(id) && x.k !== String(id).split('.')[0] + '.*');
    const role = def && (def.tags || []).find(t => t.startsWith('role:'));
    const cat = _screGlobs.find(x => x.k === String(id).split('.')[0] + '.*');
    const v = (g && SCENE_REAL_SIZE[g.k]) || (role && SCENE_REAL_SIZE[role]) || (cat && SCENE_REAL_SIZE[cat.k]);
    if (v) r = fill(v, 'table');
  }
  if (!r) {
    const cls = typeof sceneObjClass === 'function' ? sceneObjClass(id) : 'street';
    r = fill({ h: _SCRE_CLASS_H[cls] || 1 }, 'class');
    r.warn = `no real size for ${id}: the ${cls} class default (${r.h} m); add it to SCENE_REAL_SIZE or give the object real: { h }`;
  }
  _screMemo.set(id, { def, r });
  return r;
}
