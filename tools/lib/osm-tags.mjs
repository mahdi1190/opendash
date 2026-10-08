// OpenStreetMap tags to scene kinds (docs/dev/SCENE_ENGINE_V2.md 17.3 to 17.5; builder E). Node >= 20, no dependencies, pure data
// plus small pure helpers. Authoring time only: nothing here is read by the app.
//
//   classifyWay(tags, { closed, urban })   -> { section: 'surface' | 'water' | 'building' | null, kind, width?, area?, ... } | null
//   roadWidth(tags), pathWidth(tags), waterWidth(tags), railWidth(tags)   metres (the `width` tag wins, then lanes, then the class)
//   sidewalkSides(tags, urban)             -> ['left', 'right'] | [] (urban roads default to both; 'separate' and 'no' give none)
//   buildingHeight(tags, areaM2)           -> { h, storeys, roof, roofH, src: 'height' | 'levels' | 'type' }
//   buildingStyle(tags, { lat, lon, areaM2, shop }) -> one of SCENE_GEN_STYLES (17.4: architecture, era, type, material, region)
//   shopOf(tags)                           -> { kind, sign: 'Bakery' | false } | null   (never a name, brand or operator: 17.4)
//   landmarkKind(tags)                     -> 'church' | 'station' | 'fountain' | ... | null   (17.5: named or notable features)
//   treeObjectFor(tags)                    -> 'tree.oak' | 'tree.birch' | ...   (species, genus, leaf_type)
//   SCENE_OSM_OBJECTS                      generic library objects per landmark kind (the first one present in the library wins)
//   SCENE_SHOP_WORDS                       the fixed generic fascia words (at most 40 kinds)
//   NOT_TEXT_TAGS                          the tags whose values never reach drawn text (name, brand, operator ...)

export const SCENE_GEN_STYLES = Object.freeze(['victorian-terrace', 'georgian', 'edwardian', '1930s-semi', 'interwar-shops', 'mill', 'norfolk-flint', 'stone-cottage', 'modern-glass', 'brutalist', 'station']);

/** Road classes: the surface kind and the default carriageway width (V2 17.3). */
export const ROAD_CLASSES = Object.freeze({
  motorway: 11, trunk: 10, primary: 9, secondary: 7.5, tertiary: 7, unclassified: 6, residential: 6, service: 4, living_street: 5,
  motorway_link: 7, trunk_link: 7, primary_link: 7, secondary_link: 6.5, tertiary_link: 6, road: 6, busway: 6.5, bus_guideway: 6.5,
});
/** Paths: the kind and the default width. */
export const PATH_CLASSES = Object.freeze({
  footway: { kind: 'path', w: 2 }, path: { kind: 'path', w: 2 }, bridleway: { kind: 'path', w: 2.5 }, cycleway: { kind: 'cycleway', w: 1.5 },
  pedestrian: { kind: 'plaza', w: 3 }, steps: { kind: 'steps', w: 2.5 }, track: { kind: 'track', w: 3 }, corridor: null, proposed: null, construction: null,
});
const PAVED = new Set(['asphalt', 'paved', 'paving_stones', 'concrete', 'concrete:plates', 'sett', 'cobblestone', 'unhewn_cobblestone', 'bricks', 'brick', 'metal', 'wood']);
/** Area kinds by key=value (V2 17.3). */
export const AREA_KINDS = Object.freeze({
  'leisure=park': 'park', 'leisure=garden': 'garden', 'leisure=common': 'grass', 'leisure=recreation_ground': 'grass', 'leisure=pitch': 'lawn',
  'leisure=golf_course': 'lawn', 'leisure=nature_reserve': null, 'leisure=playground': 'plaza',
  'landuse=grass': 'grass', 'landuse=village_green': 'grass', 'landuse=recreation_ground': 'grass', 'landuse=cemetery': 'grass', 'amenity=grave_yard': 'grass',
  'landuse=allotments': 'garden', 'landuse=farmland': 'field', 'landuse=meadow': 'meadow', 'landuse=orchard': 'meadow', 'landuse=forest': 'wood',
  'landuse=residential': 'garden', 'landuse=commercial': 'plot', 'landuse=retail': 'plot', 'landuse=industrial': 'plot', 'landuse=railway': 'rail',
  'landuse=construction': 'plot', 'landuse=brownfield': 'plot', 'landuse=greenfield': 'grass', 'landuse=flowerbed': 'garden',
  'natural=heath': 'heath', 'natural=scrub': 'heath', 'natural=wood': 'wood', 'natural=grassland': 'meadow', 'natural=fell': 'heath', 'natural=moor': 'heath',
  'natural=beach': 'beach', 'natural=sand': 'sand', 'natural=shingle': 'shingle', 'natural=bare_rock': 'rock', 'natural=scree': 'rock', 'natural=mud': 'mud',
  'natural=wetland': 'meadow', 'amenity=parking': 'parking', 'place=square': 'plaza', 'highway=pedestrian': 'plaza', 'area:highway=pedestrian': 'plaza',
  'area:highway=footway': 'plaza', 'area:highway=primary': 'road', 'area:highway=secondary': 'road', 'area:highway=tertiary': 'road', 'area:highway=residential': 'road',
  'area:highway=unclassified': 'road', 'area:highway=service': 'road', 'railway=platform': 'platform', 'public_transport=platform': 'platform',
  'man_made=pier': 'plaza', 'amenity=marketplace': 'plaza', 'leisure=marina': null,
});
/** Paint order of areas (lower first): big land covers under parks, parks under paved places. */
export const AREA_ORDER = Object.freeze({ field: 1, meadow: 1, heath: 1, wood: 2, grass: 3, garden: 3, park: 4, lawn: 5, plot: 2, beach: 3, sand: 3, shingle: 3, rock: 3, mud: 3, rail: 5, parking: 6, road: 7, plaza: 7, platform: 8 });
/** Water area kinds (natural=water + water=*, waterway=riverbank, landuse=reservoir / basin). */
export const WATER_AREA = Object.freeze({ river: 'river', canal: 'canal', lake: 'lake', pond: 'pond', reservoir: 'lake', basin: 'canal', lock: 'canal', oxbow: 'lake', lagoon: 'lake', stream: 'river', moat: 'pond', ditch: 'river', drain: 'river', fishpond: 'pond', wastewater: null, harbour: 'harbour' });
/** Water centrelines (waterway=*): kind and default width (V2 17.3). */
// drains and ditches are narrow (a drain in a square is a rill); a river with no mapped outline is a small one (the big rivers of
// Britain have their banks mapped as areas, which win): 10 m rather than 25 (osm-project.mjs)
export const WATER_LINES = Object.freeze({ canal: { kind: 'canal', w: 10 }, river: { kind: 'river', w: 25, alone: 10 }, stream: { kind: 'river', w: 3 }, drain: { kind: 'river', w: 0.6 }, ditch: { kind: 'river', w: 1.2 }, tidal_channel: { kind: 'river', w: 6 } });
/** The canal water look on a polygon (a basin is still, green and murky like a canal: V2 5.1 canal defaults). */
export const CANAL_LOOK = Object.freeze({ base: ['#4a5a48', '#3a4a3e', '#2a362e'], mirror: 0.85, ripple: 0.15 });

/** Tag values that never become text anywhere (17.4: no names, brands or operators in drawn text). */
export const NOT_TEXT_TAGS = Object.freeze(['name', 'brand', 'operator', 'brand:wikidata', 'brand:wikipedia', 'official_name', 'alt_name', 'old_name', 'short_name', 'website', 'contact:website']);

/** The generic fascia words (17.4): a shop kind to one plain word. At most 40 kinds; anything else has no word. */
export const SCENE_SHOP_WORDS = Object.freeze({
  bakery: 'Bakery', cafe: 'Cafe', books: 'Books', butcher: 'Butcher', greengrocer: 'Greengrocer', florist: 'Florist', hardware: 'Hardware', newsagent: 'News',
  convenience: 'Store', supermarket: 'Market', clothes: 'Clothes', shoes: 'Shoes', hairdresser: 'Hair', barber: 'Barber', optician: 'Optician', chemist: 'Chemist',
  pharmacy: 'Pharmacy', restaurant: 'Restaurant', pub: 'Pub', bar: 'Bar', fast_food: 'Takeaway', ice_cream: 'Ice Cream', deli: 'Deli', jewelry: 'Jeweller',
  gift: 'Gifts', toys: 'Toys', charity: 'Charity Shop', antiques: 'Antiques', bicycle: 'Cycles', electronics: 'Electrical', furniture: 'Furniture',
  stationery: 'Stationer', music: 'Music', art: 'Gallery', bank: 'Bank', post_office: 'Post Office', library: 'Library', laundry: 'Laundrette', tea: 'Tea Room', confectionery: 'Sweets',
});
const SHOP_AMENITIES = new Set(['cafe', 'restaurant', 'pub', 'bar', 'fast_food', 'ice_cream', 'bank', 'pharmacy', 'post_office', 'library']);

/** Landmark kinds (17.5) to generic library objects, first present wins; `gen: 'station'` = F's station style on the footprint. */
export const SCENE_OSM_OBJECTS = Object.freeze({
  church: { objs: ['building.church'], h: 22, what: 'a church' },
  cathedral: { objs: ['building.church'], h: 45, what: 'a cathedral' },
  station: { objs: [], gen: 'station', h: 10, what: 'a railway station' },
  townhall: { objs: [], h: 25, what: 'a town hall' },
  civic: { objs: [], h: 16, what: 'a civic building (museum, theatre, gallery)' },
  fountain: { objs: ['tag:fountain'], h: 3, what: 'a fountain' },
  statue: { objs: ['tag:statue'], h: 4, what: 'a statue' },
  memorial: { objs: ['tag:memorial', 'tag:statue'], h: 5, what: 'a memorial' },
  clock: { objs: ['street.station-clock', 'tag:clock'], h: 4, what: 'a public clock' },
  tower: { objs: ['building.tower-stone', 'building.tower'], h: 30, what: 'a tower' },
  windmill: { objs: ['building.windmill'], h: 18, what: 'a windmill' },
  lighthouse: { objs: ['building.lighthouse'], h: 25, what: 'a lighthouse' },
  water_tower: { objs: ['tag:water-tower'], h: 25, what: 'a water tower' },
  chimney: { objs: ['tag:chimney'], h: 40, what: 'a chimney' },
  castle: { objs: ['tag:castle'], h: 20, what: 'a castle' },
  bridge: { objs: ['structure.bridge-brick', 'structure.bridge-arch'], h: 6, what: 'a bridge' },
  peak: { objs: [], h: 0, what: 'a summit', terrain: true },
  tree: { objs: [], h: 18, what: 'a notable tree' },
  attraction: { objs: [], h: 10, what: 'an attraction' },
  historic: { objs: [], h: 8, what: 'a historic feature' },
});

/** Tree species and genera to library trees (17.5). */
const TREE_GENUS = Object.freeze({ quercus: 'tree.oak', betula: 'tree.birch', pinus: 'tree.pine', salix: 'tree.willow', alnus: 'tree.alder', aesculus: 'tree.horse-chestnut',
  platanus: 'tree.plane', crataegus: 'tree.hawthorn', prunus: 'tree.cherry', acer: 'tree.green-oak', fagus: 'tree.green-oak', tilia: 'tree.plane', fraxinus: 'tree.green-alder',
  cedrus: 'tree.cedar', picea: 'tree.pine', larix: 'tree.pine', taxus: 'tree.pine', sorbus: 'tree.hawthorn', castanea: 'tree.green-chestnut', ulmus: 'tree.green-oak', populus: 'tree.birch' });
const TREE_COMMON = Object.freeze({ oak: 'quercus', birch: 'betula', pine: 'pinus', willow: 'salix', alder: 'alnus', 'horse chestnut': 'aesculus', plane: 'platanus', hawthorn: 'crataegus',
  cherry: 'prunus', maple: 'acer', sycamore: 'acer', beech: 'fagus', lime: 'tilia', linden: 'tilia', ash: 'fraxinus', cedar: 'cedrus', spruce: 'picea', larch: 'larix', yew: 'taxus', rowan: 'sorbus', chestnut: 'castanea', elm: 'ulmus', poplar: 'populus' });

const num = (v) => { if (v == null) return NaN; const m = /^\s*(-?\d+(?:\.\d+)?)\s*(m|ft|')?/.exec(String(v)); if (!m) return NaN; const n = +m[1]; return m[2] === 'ft' || m[2] === "'" ? n * 0.3048 : n; };
export { num as parseMetres };

export function roadWidth(t) {
  const w = num(t.width); if (w > 1 && w < 60) return w;
  const lanes = num(t.lanes); if (lanes >= 1 && lanes <= 10) return Math.round(lanes * 3.2 * 10) / 10;
  return ROAD_CLASSES[t.highway] || 6;
}
export function pathWidth(t) { const w = num(t.width); if (w > 0.4 && w < 30) return w; const c = PATH_CLASSES[t.highway]; return (c && c.w) || 2; }
export function waterWidth(t) { const w = num(t.width); if (w > 0.5 && w < 2000) return w; const c = WATER_LINES[t.waterway]; return (c && c.w) || 5; }
export function railWidth(t) { const n = Math.max(1, Math.min(8, num(t.tracks) || 1)); return Math.round(3.5 * n * 10) / 10; }

/** Which sides of a road get a pavement strip (V2 17.3). */
export function sidewalkSides(t, urban) {
  const s = t.sidewalk || t['sidewalk:both'] && 'both' || null, l = t['sidewalk:left'], r = t['sidewalk:right'];
  if (l || r) return [...(l && l !== 'no' && l !== 'separate' ? ['left'] : []), ...(r && r !== 'no' && r !== 'separate' ? ['right'] : [])];
  if (s === 'both' || s === 'yes') return ['left', 'right'];
  if (s === 'left' || s === 'right') return [s];
  if (s === 'no' || s === 'none' || s === 'separate') return [];
  if (!urban) return [];
  return ['motorway', 'trunk', 'motorway_link', 'trunk_link', 'service', 'track', 'busway'].includes(t.highway) ? [] : ['left', 'right'];
}

const UNDER = (t) => t.tunnel && t.tunnel !== 'no' && t.tunnel !== 'building_passage' || t.location === 'underground' || num(t.layer) <= -3;   // layer -1 alone is NOT underground (towpaths under bridges)
const DEAD = (t) => ['disused', 'abandoned', 'razed', 'dismantled', 'proposed', 'construction', 'planned'].some(k => t[k + ':railway'] || t[k + ':highway'] || t.railway === k || t.highway === k);

/**
 * One way (or relation) to what it becomes. closed: the geometry is a ring. urban: the view is built up (pavements by default).
 * Returns null for anything the scene does not draw (tunnels, boundaries, disused lines, admin areas).
 */
export function classifyWay(t, { closed = false, urban = false } = {}) {
  if (!t) return null;
  if (DEAD(t)) return null;
  const isArea = closed && (t.area === 'yes' || !t.highway && !t.railway && !t.waterway && !t.barrier || t.area === 'yes');
  // water areas first
  if (closed && (t.natural === 'water' || t.waterway === 'riverbank' || t.landuse === 'reservoir' || t.landuse === 'basin' || t.waterway === 'dock')) {
    const k = t.waterway === 'riverbank' ? 'river' : t.waterway === 'dock' ? 'harbour' : t.landuse === 'reservoir' ? 'lake' : t.landuse === 'basin' ? 'pond' : t.water ? WATER_AREA[t.water] : 'lake';
    return k ? { section: 'water', kind: k, area: true } : null;
  }
  if (t.natural === 'coastline') return { section: 'coast', kind: 'sea' };
  if (t.building && t.building !== 'no' && t.building !== 'roof' && closed) return { section: 'building', kind: 'building', area: true };
  if (t['building:part'] && closed) return { section: 'part', kind: 'part', area: true };
  if (t.waterway && WATER_LINES[t.waterway] && !closed || t.waterway && WATER_LINES[t.waterway] && t.area !== 'yes') {
    if (UNDER(t) || t.tunnel === 'culvert') return null;
    return { section: 'water', kind: WATER_LINES[t.waterway].kind, width: waterWidth(t), line: true, waterway: t.waterway };
  }
  if (t.railway) {
    if (UNDER(t)) return null;
    if (t.railway === 'platform') return closed ? { section: 'surface', kind: 'platform', area: true } : { section: 'surface', kind: 'platform', width: num(t.width) > 1 ? num(t.width) : 3, line: true };
    if (['rail', 'light_rail', 'narrow_gauge', 'preserved', 'subway', 'funicular'].includes(t.railway)) return { section: 'surface', kind: 'rail', width: railWidth(t), line: true, bridge: !!(t.bridge && t.bridge !== 'no') };
    if (t.railway === 'tram') return { section: 'surface', kind: 'tramway', width: 3.2, line: true, tram: true, bridge: !!(t.bridge && t.bridge !== 'no') };
  }
  if (t.public_transport === 'platform' && !t.highway) return closed ? { section: 'surface', kind: 'platform', area: true } : { section: 'surface', kind: 'platform', width: 3, line: true };
  if (t['area:highway']) { const k = AREA_KINDS['area:highway=' + t['area:highway']]; return k && closed ? { section: 'surface', kind: k, area: true } : null; }
  if (t.highway) {
    if (UNDER(t)) return null;
    const bridge = !!(t.bridge && t.bridge !== 'no');
    if ((t.highway === 'pedestrian' || t.highway === 'footway' || t.highway === 'service') && closed && t.area === 'yes') return { section: 'surface', kind: t.highway === 'service' ? 'parking' : 'plaza', area: true };
    if (ROAD_CLASSES[t.highway]) {
      return { section: 'surface', kind: 'road', width: roadWidth(t), line: true, road: t.highway, bridge, markings: ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential'].includes(t.highway.replace(/_link$/, '')) && !(t.highway === 'residential' && roadWidth(t) < 5.5) ? 'centre' : 'none' };
    }
    const p = PATH_CLASSES[t.highway];
    if (!p) return null;
    if (t.footway === 'crossing' || t.cycleway === 'crossing' || t.path === 'crossing') {
      const marked = ['zebra', 'marked', 'uncontrolled', 'traffic_signals'].includes(t.crossing) || t['crossing:markings'] && t['crossing:markings'] !== 'no';
      return { section: 'surface', kind: 'road', width: pathWidth(t) < 2.4 ? 2.4 : pathWidth(t), line: true, crossing: true, markings: t.crossing === 'zebra' || t.crossing_ref === 'zebra' ? 'zebra' : marked ? 'none' : 'none' };
    }
    let kind = p.kind;
    if (t.highway === 'footway' && (t.footway === 'sidewalk' || PAVED.has(t.surface) && urban)) kind = 'pavement';
    if (t.highway === 'path' && t.bicycle === 'designated' && PAVED.has(t.surface)) kind = 'cycleway';
    return { section: 'surface', kind, width: pathWidth(t), line: true, path: t.highway, bridge };
  }
  // areas by key=value
  if (closed || isArea) {
    for (const key of ['amenity', 'leisure', 'landuse', 'natural', 'place', 'man_made']) {
      if (!t[key]) continue;
      const k = AREA_KINDS[key + '=' + t[key]];
      if (k === undefined) continue;
      if (k === null) return null;
      if (t.natural === 'wetland' && t.wetland === 'reedbed') return { section: 'surface', kind: 'reedbed', area: true };
      return { section: 'surface', kind: k, area: true, tree: k === 'wood' ? (t.leaf_type || 'mixed') : null };
    }
  }
  if (t.natural === 'tree_row' && !closed) return { section: 'treerow', kind: 'tree' };
  return null;
}

/** Height, storeys and roof of a building (17.4: `height`, `building:levels * 3 + roof`, else by type). */
const TYPE_H = Object.freeze({ house: 8, detached: 8, semidetached_house: 8, terrace: 8.5, bungalow: 5, apartments: 13, residential: 9, commercial: 12, retail: 8, office: 16,
  industrial: 9, warehouse: 9, church: 15, cathedral: 30, chapel: 9, mosque: 12, train_station: 10, transportation: 8, school: 9, university: 14, college: 12, hospital: 15,
  garage: 3, garages: 3, shed: 2.5, hut: 3, cabin: 3.5, barn: 7, farm_auxiliary: 6, greenhouse: 3, kiosk: 3, civic: 14, public: 12, hotel: 18, service: 4, roof: 4 });
const ROOF_SHAPES = Object.freeze({ gabled: 'gable', hipped: 'hip', flat: 'flat', mansard: 'mansard', butterfly: 'butterfly', skillion: 'pitched-side', 'half-hipped': 'hip', pyramidal: 'hip', gambrel: 'mansard', saltbox: 'pitched-side', dome: 'flat', round: 'flat' });
export function buildingHeight(t, areaM2 = 100) {
  const roofShape = ROOF_SHAPES[t['roof:shape']] || null;
  let roofH = num(t['roof:height']);
  const h = num(t.height), levels = num(t['building:levels']), minH = num(t.min_height) || 0;
  const type = t.building || 'yes', small = areaM2 < 140, big = areaM2 > 700;
  const roof = roofShape || (['church', 'chapel', 'house', 'detached', 'semidetached_house', 'terrace', 'bungalow', 'barn', 'cabin', 'hut', 'farm_auxiliary', 'cathedral'].includes(type) ? (type === 'detached' || type === 'house' && areaM2 > 90 ? 'hip' : 'gable')
    : big || ['commercial', 'retail', 'industrial', 'warehouse', 'office', 'apartments', 'hospital', 'university', 'school', 'hotel'].includes(type) ? 'flat' : small ? 'gable' : 'flat');
  if (!(roofH >= 0)) roofH = roof === 'flat' ? 0 : Math.max(2, Math.min(6, Math.sqrt(areaM2) * 0.3));
  if (h > 1 && h < 400) { const storeys = Math.max(1, Math.round((h - roofH - minH) / 3)); return { h: Math.round(h * 10) / 10, storeys, roof, roofH: Math.round(roofH * 10) / 10, src: 'height' }; }
  if (levels >= 1 && levels < 120) { const hh = levels * 3 + roofH; return { h: Math.round(hh * 10) / 10, storeys: Math.round(levels), roof, roofH: Math.round(roofH * 10) / 10, src: 'levels' }; }
  const hh = TYPE_H[type] || (small ? 7.5 : areaM2 < 600 ? 10 : 14);
  return { h: hh, storeys: Math.max(1, Math.round((hh - roofH) / 3)), roof, roofH: Math.round(roofH * 10) / 10, src: 'type' };
}

/** Regions that lean to a material (17.4): Norfolk and Suffolk flint; the Pennines stone. Rough boxes [south, west, north, east]. */
export const STYLE_REGIONS = Object.freeze([
  { id: 'flint', box: [51.95, 0.3, 53.0, 1.8], style: 'norfolk-flint' },
  { id: 'pennines', box: [53.0, -2.4, 55.0, -1.62], style: 'stone-cottage' },
  { id: 'cotswolds', box: [51.6, -2.3, 52.1, -1.6], style: 'stone-cottage' },
]);
const inBox = (lat, lon, b) => lat >= b[0] && lat <= b[2] && lon >= b[1] && lon <= b[3];
const ARCH = Object.freeze({ victorian: 'victorian-terrace', georgian: 'georgian', regency: 'georgian', edwardian: 'edwardian', brutalist: 'brutalist', modern: 'modern-glass', modernist: 'modern-glass',
  contemporary: 'modern-glass', art_deco: 'interwar-shops', 'art deco': 'interwar-shops', industrial: 'mill', vernacular: 'stone-cottage', tudor: 'stone-cottage', gothic_revival: 'victorian-terrace', neo_gothic: 'victorian-terrace' });
/** The year of `start_date` ('1885', 'C19', '~1930', '1890..1900', 'mid C19'). */
export function startYear(v) {
  if (!v) return NaN;
  const s = String(v);
  let m = /(\d{4})/.exec(s); if (m) return +m[1];
  m = /C(\d{2})/i.exec(s); if (m) return (+m[1] - 1) * 100 + (/early/i.test(s) ? 15 : /late/i.test(s) ? 85 : 50);
  return NaN;
}
/** The generator style of a building (17.4). */
export function buildingStyle(t, { lat = 0, lon = 0, areaM2 = 100, shop = false } = {}) {
  const type = t.building || 'yes', mat = String(t['building:material'] || t['building:facade:material'] || '').toLowerCase();
  const arch = String(t['building:architecture'] || '').toLowerCase();
  if (type === 'train_station' || t.railway === 'station' || t.public_transport === 'station') return 'station';
  if (ARCH[arch]) return ARCH[arch];
  // a named mill or warehouse ("Merchant's Warehouse", "Wellington Mills", building=yes) is a mill whatever its type says
  if (/\b(mills?|warehouse|maltings|works)\b/i.test(String(t.name || '')) && !['house', 'detached', 'semidetached_house', 'terrace'].includes(type) && mat !== 'glass') return 'mill';
  if (mat === 'flint') return 'norfolk-flint';
  if (mat === 'glass' || mat === 'metal' || mat === 'steel') return 'modern-glass';
  const y = startYear(t.start_date || t['building:start_date']);
  if (Number.isFinite(y)) {
    if (y < 1840) return mat === 'stone' || mat === 'sandstone' || mat === 'limestone' ? 'stone-cottage' : 'georgian';
    if (y < 1900) return ['industrial', 'warehouse'].includes(type) ? 'mill' : 'victorian-terrace';
    if (y < 1919) return 'edwardian';
    if (y < 1940) return type === 'semidetached_house' ? '1930s-semi' : shop || t.shop ? 'interwar-shops' : type === 'house' ? '1930s-semi' : 'interwar-shops';
    if (y < 1980) return mat === 'concrete' || ['apartments', 'civic', 'office', 'university', 'public'].includes(type) ? 'brutalist' : type === 'semidetached_house' ? '1930s-semi' : 'interwar-shops';
    if (y >= 1990) return 'modern-glass';
  }
  if (mat === 'concrete') return 'brutalist';
  if (mat === 'stone' || mat === 'sandstone' || mat === 'limestone' || mat === 'granite') return 'stone-cottage';
  if (type === 'semidetached_house') return '1930s-semi';
  if (type === 'terrace') return 'victorian-terrace';
  if (['industrial', 'warehouse', 'manufacture'].includes(type)) return 'mill';
  if (['office', 'commercial'].includes(type) && areaM2 > 900) return 'modern-glass';
  if (['retail', 'commercial'].includes(type) || shop) return 'interwar-shops';
  if (['church', 'chapel', 'cathedral'].includes(type)) return mat === 'flint' || STYLE_REGIONS[0] && inBox(lat, lon, STYLE_REGIONS[0].box) ? 'norfolk-flint' : 'stone-cottage';
  for (const r of STYLE_REGIONS) if (inBox(lat, lon, r.box) && ['house', 'detached', 'cottage', 'yes', 'barn', 'farm_auxiliary', 'residential'].includes(type)) return r.style;
  if (['house', 'detached'].includes(type)) return areaM2 > 110 ? 'edwardian' : 'victorian-terrace';
  if (type === 'apartments') return areaM2 > 600 ? 'brutalist' : 'edwardian';
  if (['school', 'civic', 'public', 'hospital', 'university', 'college', 'hotel'].includes(type)) return 'edwardian';
  return areaM2 < 160 ? 'victorian-terrace' : areaM2 < 900 ? 'interwar-shops' : 'mill';
}

/** A shop's generic word (17.4): never the name, brand or operator; features with a brand* tag get no sign. */
export function shopOf(t) {
  if (!t) return null;
  const kind = t.shop || (SHOP_AMENITIES.has(t.amenity) ? t.amenity : null);
  if (!kind || kind === 'no' || kind === 'vacant') return kind === 'vacant' ? { kind: 'vacant', sign: false } : null;
  const branded = Object.keys(t).some(k => /^brand(:|$)/.test(k));
  return { kind, sign: branded ? false : (SCENE_SHOP_WORDS[kind] || false) };
}

/** Named or notable features (17.5) -> a landmark kind, else null. */
export function landmarkKind(t) {
  if (!t) return null;
  if (t.amenity === 'place_of_worship') return t.building === 'cathedral' || /cathedral/i.test(t.name || '') ? 'cathedral' : 'church';
  if (t.building === 'cathedral') return 'cathedral';
  if ((t.building === 'church' || t.building === 'chapel') && t.name) return 'church';
  if (t.railway === 'station' || t.building === 'train_station' || t.public_transport === 'station' && t.train === 'yes') return 'station';
  if (t.amenity === 'townhall' && (t.name || t.building)) return 'townhall';
  if ((t.tourism === 'museum' || t.tourism === 'gallery' || t.amenity === 'theatre' || t.amenity === 'arts_centre' || t.amenity === 'concert_hall') && t.name && t.building) return 'civic';
  if (t.amenity === 'fountain') return 'fountain';
  if (t.amenity === 'clock' && (t.support === 'pole' || t.support === 'wall_mounted' || t.support === 'ground' || t.name)) return 'clock';
  if (t.memorial === 'statue' || t.artwork_type === 'statue' || t.historic === 'statue') return 'statue';
  if (t.historic === 'memorial' || t.memorial) return t.memorial === 'plaque' ? null : 'memorial';
  if (t.man_made === 'windmill' || t.historic === 'windmill') return 'windmill';
  if (t.man_made === 'lighthouse') return 'lighthouse';
  if (t.man_made === 'water_tower') return 'water_tower';
  if (t.man_made === 'chimney' && num(t.height) > 15) return 'chimney';
  if (t.man_made === 'tower' && (t['tower:type'] !== 'communication' || t.name)) return 'tower';
  if (t.historic === 'castle' || t.historic === 'fort') return 'castle';
  if (t.natural === 'peak' && t.name) return 'peak';
  if (t.natural === 'tree' && (t.denotation === 'natural_monument' || t.denotation === 'landmark' || t.name)) return 'tree';
  if (t.tourism === 'attraction' && t.name) return 'attraction';
  if (t.tourism === 'artwork' && (t.artwork_type === 'sculpture' || t.artwork_type === 'statue')) return 'statue';
  if (t.historic && t.name && !['boundary_stone', 'milestone', 'district', 'building', 'heritage', 'yes'].includes(t.historic)) return 'historic';
  return null;
}

/** A library tree for an OSM tree (species, genus, taxon, leaf_type). */
export function treeObjectFor(t = {}) {
  const pick = (s) => { if (!s) return null; s = String(s).toLowerCase(); const g = s.split(/[\s;]/)[0]; if (TREE_GENUS[g]) return TREE_GENUS[g]; for (const [c, gen] of Object.entries(TREE_COMMON)) if (s.includes(c)) return TREE_GENUS[gen]; return null; };
  return pick(t.genus) || pick(t.species) || pick(t.taxon) || pick(t['species:en']) || pick(t['genus:en']) || (t.leaf_type === 'needleleaved' ? 'tree.pine' : 'tree.oak');
}

/** A slug for matching names to library ids (never written to drawn text). */
export function slugOf(s) {
  return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
const STOP = new Set(['the', 'of', 'and', 'st', 'saint', 'church', 'uk', 'a', 'at', 'on', 'in', 'old', 'new', 'great', 'little', 'sheffield2', 'mcr']);
export const nameTokens = (s) => slugOf(s).split('-').filter(w => w && !STOP.has(w));
