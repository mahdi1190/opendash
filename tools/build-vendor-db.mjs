// tools/build-vendor-db.mjs - builds the vendor table and the bundled logos, at DEVELOPMENT time only.
// Nothing here runs in the app, and the app never fetches anything about a vendor.
//
// Inputs (downloaded by hand into folders of their own, read as data):
//   --nsi <dir>     the npm package name-suggestion-index (BSD-3-Clause): UK and worldwide brand names, Wikidata ids
//   --si <dir>      the npm package simple-icons (CC0-1.0 collection): one-colour marks, with per-icon licences
//   --cache <dir>   downloads from Wikimedia Commons, kept between runs
//   --fetch         ask Commons about the logos Wikidata names (serial, gentle), and download the accepted files
//   tools/vendors/curated.txt   the hand-made rows: top vendors, online-only vendors, colours and pictograms
//
// Outputs:
//   src/app/67-fin-symbols-db.js       one vendor per line (delete the logo field to take a logo out)
//   src/app/67-fin-symbols-dblogos.js  the sanitised logos, keyed by slug
//   assets/brands/SOURCES.json         for each logo: source URL, licence or status, date, bytes, guidelines
//
// Rules this keeps: only openly licensed sources; every file through tools/lib/svg-clean.mjs (no scripts, no
// outside references); logos are stored as drawn (no recolouring, no change of shape); a Commons logo must have
// a public-domain or CC0 status on its own page; a Simple Icons mark with a licence that forbids this use is
// skipped. Betting, money lenders and adult shops are left out of the table: they stay plain monograms.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanSvg } from './lib/svg-clean.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const NSI = arg('--nsi'), SI = arg('--si'), CACHE = arg('--cache'), FETCH = process.argv.includes('--fetch');
if (!NSI || !SI || !CACHE) { console.error('usage: node tools/build-vendor-db.mjs --nsi <dir> --si <dir> --cache <dir> [--fetch]'); process.exit(2); }
mkdirSync(join(CACHE, 'files'), { recursive: true });
const TODAY = new Date().toISOString().slice(0, 10);
// Wikimedia asks for a descriptive agent with a way to reach the project (API:Etiquette).
const UA = 'OpenDash-vendor-db/1.0 (https://github.com/mahdi1190/opendash; development-time logo licence check)';

/* ---------- names ---------- */
const fold = (s) => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’‘`]/g, "'");
/** The form the app matches against: upper case, no apostrophes, punctuation as spaces, & kept. */
const normAlias = (s) => fold(s).toUpperCase().replace(/'/g, '').replace(/[^A-Z0-9& ]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b([A-Z]) & ([A-Z])\b/g, '$1&$2');
const nameKey = (s) => normAlias(s).replace(/[^A-Z0-9&]/g, '');

// One word that is also an everyday word or a first name or surname: only the whole memo counts for these.
const STOP = new Set(`ABOUT ACE ACTION ADVANCE AGE AIR ALL ALPHA ALWAYS AMBER ANGEL APPLE ARC ARCH ARROW ART ASK ATLAS AURA AVENUE BAKER BANK BAR BARN BASE BAY BEACON BEAR BEAU BELL BELLA BEST BETTER BIG BLACK BLISS BLOOM BLUE BOB BOND BOOK BOOKS BOSS BOX BOY BRAND BRIDGE BRIGHT BROWN BROWNS BUDGET BUTCHER BUZZ CAFE CALM CAMEL CAMERA CANDY CAPITAL CARE CARS CASA CASH CASTLE CAT CENTRAL CHAMPION CHANCE CHARLES CHARLIE CHARM CHEF CHIP CHOICE CHRISTIAN CHURCH CITY CLARK CLARKE CLASS CLEAN CLOUD CLUB COAST COLE COLOUR COMET CORE CORNER COSMOS COTTON COUNTRY COURT COW CRAFT CREAM CREW CROSS CROWN CRYSTAL CUBE CURVE DAILY DANIEL DAVID DAWN DAY DEAL DEN DIAMOND DIRECT DISCOVERY DIXON DOLLAR DOME DOVE DREAM DREAMS DRIVE DUKE DUNES EAGLE EARTH EAST EASY EDEN ELITE ELLA EMMA ENERGY EPIC EQUINOX ESSENTIAL EURO EVANS EVE EXPRESS EXTRA FABRIC FACE FAIR FAITH FAME FAMILY FAST FIELD FINE FIRE FIRST FISH FIT FIVE FLAME FLASH FLEX FLOW FLY FOCUS FOOD FOREST FORM FORTUNE FOUR FOX FRAME FRANK FRESH FRIENDS FUEL FULL FUN FUSION FUTURE GALA GAME GAP GARDEN GATE GEM GENERAL GEORGE GIANT GLOBAL GLOBE GO GOLD GOLDEN GOOD GRACE GRAND GREAT GREEN GRILL GROUP GUARD GUESS HALF HALL HAPPY HARBOUR HARRY HARVEST HAVEN HEART HEAT HELLO HENRY HERO HIGH HILL HOLLAND HOME HONEY HOPE HORIZON HOUSE HUB HUGO HUNTER ICE ICON IDEAL IMAGE IMPACT INDEX INFINITY INN INSPIRE IRIS ISLAND IVY JACK JAMES JASMINE JAY JOHN JONES JOY JUNCTION JUNGLE JUST KAREN KEY KING KINGS KIND KITCHEN KNIGHT LAKE LAND LANE LARGE LATE LAUREL LEAF LEE LEGEND LEMON LEWIS LIBERTY LIFE LIGHT LILY LIME LINE LINK LION LITTLE LIVE LOCAL LOGIC LONDON LOOK LOTUS LOUIS LOVE LUCKY LUNA LUXE MAGIC MAIN MAJOR MAPLE MARK MARKET MARS MARTIN MASON MASTER MATCH MAX MAY MAYFAIR MEGA MERCURY METRO MILES MILL MILLER MIND MINI MINT MIRROR MISS MISSION MOBILE MODE MODERN MOMENT MONEY MOON MORE MOTION MOUNTAIN MOVE MR MRS MUSIC NATURAL NATURE NAVY NEST NEW NEWS NEXT NICE NIGHT NINE NOBLE NORTH NOTE NOVA NOW OAK OASIS OCEAN OFFICE OLIVE OMEGA ON ONE OPEN OPTIMA ORANGE ORCHARD ORIGIN OSCAR OUTFIT OXFORD PACE PALACE PALM PARADISE PARK PARTY PASSION PATH PAUL PEACH PEAK PEAR PEARL PENNY PEOPLE PERFECT PETER PHASE PHOENIX PILOT PINE PINK PIONEER PIXEL PLACE PLAN PLANET PLAY PLUM PLUS POINT POLAR POP PORT POST POWER PREMIER PRESS PRICE PRIDE PRIME PRINCE PRINCESS PRO PULSE PURE PURPLE QUEEN QUEST QUICK QUIK RADIO RAIN RAINBOW RANGE RAPID RAVEN RAY REACH REAL RED REED REEF REGAL REX RICHARD RIDGE RING RISE RIVER ROAD ROCK ROGER ROSE ROSS ROUND ROYAL RUBY RUSH SAGE SAIL SAINT SALE SALT SAM SAND SANDS SAVE SCOTT SEA SEASONS SECRET SELECT SENSE SEVEN SHAW SHED SHINE SHOP SHORE SILK SILVER SIMPLE SIMPLY SIX SKY SLICE SMART SMILE SMITH SNOW SOAP SOLO SOUL SOUTH SPACE SPARK SPICE SPIRIT SPOT SPRING SQUARE STAG STAR STARS START STATE STATION STEEL STEP STONE STORE STORM STREET STUDIO STYLE SUMMER SUN SUNRISE SUNSET SUPER SURE SWAN SWEET SWIFT TAILOR TASTE TAYLOR TEA TEAM TEMPLE TEN TERRA THOMAS THREE TIDE TIGER TILE TIME TIMES TOM TONY TOP TOTAL TOUCH TOWER TOWN TRADE TRAIL TREE TRIBE TRIP TRUE TRUST TURNER TWO ULTRA UNION UNIQUE UNITED UNITY URBAN VALLEY VALUE VENUS VICTORIA VIEW VILLAGE VINE VIP VISION VISTA VITAL VIVA VOICE WALKER WALLIS WARD WATER WAVE WAY WELL WELLS WEST WHITE WILD WILLIAM WILLOW WILSON WIND WINE WINTER WISE WOLF WONDER WOOD WORKS WORLD WRIGHT YORK YOUNG YOU YOUR ZEN ZERO ZONE ZOO AFTERS AIDEN ALLIANCE ALPINE ANTIC ATTENDANT AWAY BARNES BARRIO BELIEV BENCH BIRDS BOSCO BRADLEYS BRAINWAVE BREWERS BUTLERS BYRON CAMPER CANOPY CARAVAN CHLOE COACH COCO COLINS CONRAD COOK COSMO COURTYARD CREAMS DEBRA DEFENDER DESA DIESEL DIGNITY EDITION EDWIN EXPERT FASTRACK GENESIS GOALS GRADUATE GREET GRIND GUSTO HAMPTON HARVEYS HUNTERS JOHNSONS KEATONS LAWSON LEADERS LEIGHTONS LINCOLN LOCKE LOOP LOUNGES MAGNET MARATHON MIKEL MILLENNIUM MOSS MUSTANG NATIONAL NEAT NICHOLSONS NOTES NUANCE ONLY ORCHESTRA PARKERS PERSONA POLARIS PRACTICAL QUICKLY QUIZ RELAY RENAISSANCE REPLAY RESERVED REVOLUTION ROBINSONS ROMANS ROOTS ROSSLYN SAVERS SCOPE SCRIBBLER SHARPS SLATERS SONIC STAGS SWINTON TAYLORS THRIFTY THYME TOWNENDS TRIUMPH TUDOR TYPO VAGABOND WAREHOUSE WASH WAVES WEBBERS WEEKDAY WELCOME`.split(/\s+/));
const SUFFIX = /\b(LTD|LIMITED|PLC|LLP|INC|CORP|UK|GB)$/;

/* ---------- which brands, and what they are ---------- */
const SKIP_SENSITIVE = /^brands\/(shop\/(bookmaker|lottery|pawnbroker|money_lender|erotic|tobacco|e-cigarette|cannabis)|amenity\/(casino|gambling|stripclub|brothel|nightclub|love_hotel)|leisure\/(adult_gaming_centre|sauna))$/;
// NSI group -> [scene, pictogram]; a group not listed here is not something people pay at.
const GROUPS = {
  'shop/supermarket': ['groceries', 'trolley'], 'shop/convenience': ['groceries', 'basket'], 'shop/greengrocer': ['groceries', 'leaf'], 'shop/butcher': ['groceries', 'basket'], 'shop/frozen_food': ['groceries', 'trolley'], 'shop/wholesale': ['groceries', 'trolley'], 'shop/deli': ['groceries', 'basket'], 'shop/farm': ['groceries', 'leaf'], 'shop/health_food': ['groceries', 'leaf'], 'shop/seafood': ['groceries', 'fish'], 'shop/confectionery': ['groceries', 'gift'], 'shop/chocolate': ['gifts', 'gift'],
  'shop/bakery': ['eating-out', 'bread'], 'shop/pastry': ['eating-out', 'bread'], 'amenity/fast_food': ['takeaway', 'burger'], 'amenity/restaurant': ['eating-out', 'cutlery'], 'amenity/cafe': ['coffee', 'coffee'], 'shop/coffee': ['coffee', 'coffee'], 'shop/tea': ['coffee', 'tea'], 'amenity/ice_cream': ['eating-out', 'ice'], 'amenity/pub': ['drinks', 'pint'], 'amenity/bar': ['drinks', 'pint'], 'shop/alcohol': ['drinks', 'wine'], 'shop/wine': ['drinks', 'wine'], 'shop/beverages': ['drinks', 'bottle'],
  'amenity/fuel': ['fuel', 'fuel'], 'amenity/charging_station': ['fuel', 'ev'], 'amenity/car_rental': ['car', 'car'], 'amenity/car_sharing': ['car', 'car'], 'amenity/taxi': ['car', 'taxi'], 'amenity/bicycle_rental': ['transport', 'bike'], 'amenity/parking': ['car', 'parking'], 'amenity/car_wash': ['car', 'droplet'], 'shop/car': ['car', 'car'], 'shop/car_repair': ['car', 'wrench'], 'shop/car_parts': ['car', 'wrench'], 'shop/tyres': ['car', 'wrench'], 'shop/motorcycle': ['car', 'scooter'], 'shop/caravan': ['car', 'car'],
  'amenity/bank': ['savings', 'bank'], 'amenity/bureau_de_change': ['cash', 'coins'], 'amenity/money_transfer': ['transfers', 'swap'], 'amenity/payment_centre': ['other', 'card'],
  'amenity/pharmacy': ['health', 'pills'], 'shop/chemist': ['health', 'pills'], 'amenity/dentist': ['health', 'tooth'], 'amenity/clinic': ['health', 'cross'], 'amenity/doctors': ['health', 'cross'], 'shop/optician': ['health', 'glasses'], 'shop/hearing_aids': ['health', 'cross'], 'shop/medical_supply': ['health', 'cross'], 'amenity/veterinary': ['pets', 'paw'], 'shop/pet': ['pets', 'paw'], 'shop/pet_grooming': ['pets', 'paw'],
  'shop/hairdresser': ['personal-care', 'scissors'], 'shop/barber': ['personal-care', 'scissors'], 'shop/beauty': ['personal-care', 'bottle'], 'shop/cosmetics': ['personal-care', 'bottle'], 'shop/perfumery': ['personal-care', 'bottle'], 'shop/massage': ['personal-care', 'bottle'], 'shop/tattoo': ['personal-care', 'bottle'],
  'shop/clothes': ['shopping', 'shirt'], 'shop/shoes': ['shopping', 'shoe'], 'shop/sports': ['shopping', 'shoe'], 'shop/outdoor': ['shopping', 'tent'], 'shop/jewelry': ['shopping', 'gem'], 'shop/watches': ['shopping', 'gem'], 'shop/bag': ['shopping', 'bag'], 'shop/department_store': ['shopping', 'bag'], 'shop/mall': ['shopping', 'bag'], 'shop/variety_store': ['shopping', 'tag'], 'shop/general': ['shopping', 'tag'], 'shop/second_hand': ['shopping', 'tag'], 'shop/gift': ['gifts', 'gift'], 'shop/party': ['gifts', 'gift'], 'shop/toys': ['gifts', 'blocks'], 'shop/baby_goods': ['family', 'blocks'], 'shop/florist': ['gifts', 'leaf'], 'shop/charity': ['gifts', 'heart'], 'shop/craft': ['gifts', 'gift'],
  'shop/electronics': ['shopping', 'laptop'], 'shop/computer': ['shopping', 'laptop'], 'shop/mobile_phone': ['phone', 'phone'], 'shop/telecommunication': ['phone', 'phone'], 'shop/hifi': ['shopping', 'music'], 'shop/music': ['entertainment', 'music'], 'shop/musical_instrument': ['entertainment', 'music'], 'shop/video_games': ['gaming', 'game'], 'shop/games': ['gaming', 'game'], 'shop/books': ['education', 'books'], 'shop/stationery': ['shopping', 'books'], 'shop/newsagent': ['shopping', 'paper'], 'shop/copyshop': ['work', 'doc'], 'shop/photo': ['shopping', 'gift'],
  'shop/furniture': ['home', 'sofa'], 'shop/houseware': ['home', 'sofa'], 'shop/kitchen': ['home', 'sofa'], 'shop/bed': ['home', 'bed'], 'shop/interior_decoration': ['home', 'sofa'], 'shop/doityourself': ['home', 'drill'], 'shop/hardware': ['home', 'drill'], 'shop/trade': ['home', 'drill'], 'shop/paint': ['home', 'drill'], 'shop/flooring': ['home', 'sofa'], 'shop/carpet': ['home', 'sofa'], 'shop/bathroom_furnishing': ['home', 'droplet'], 'shop/appliance': ['home', 'spark'], 'shop/garden_centre': ['home', 'leaf'], 'shop/storage_rental': ['home', 'box'], 'shop/curtain': ['home', 'sofa'], 'shop/tiles': ['home', 'drill'], 'shop/lighting': ['home', 'spark'], 'shop/dry_cleaning': ['personal-care', 'shirt'], 'shop/laundry': ['personal-care', 'shirt'], 'shop/locksmith': ['home', 'key'], 'shop/shoe_repair': ['shopping', 'shoe'], 'shop/funeral_directors': ['other', 'leaf'],
  'shop/travel_agency': ['travel', 'suitcase'], 'tourism/hotel': ['travel', 'bed'], 'tourism/hostel': ['travel', 'bed'], 'tourism/guest_house': ['travel', 'bed'], 'tourism/motel': ['travel', 'bed'], 'tourism/caravan_site': ['travel', 'tent'], 'tourism/camp_site': ['travel', 'tent'], 'tourism/theme_park': ['entertainment', 'ticket'], 'tourism/attraction': ['entertainment', 'ticket'], 'tourism/museum': ['entertainment', 'ticket'], 'tourism/zoo': ['entertainment', 'paw'], 'tourism/aquarium': ['entertainment', 'fish'],
  'amenity/cinema': ['entertainment', 'cinema'], 'amenity/theatre': ['entertainment', 'ticket'], 'amenity/arts_centre': ['entertainment', 'ticket'], 'leisure/bowling_alley': ['entertainment', 'ticket'], 'leisure/amusement_arcade': ['entertainment', 'game'], 'leisure/fitness_centre': ['fitness', 'gym'], 'leisure/sports_centre': ['fitness', 'gym'], 'leisure/swimming_pool': ['fitness', 'droplet'], 'leisure/golf_course': ['fitness', 'gym'], 'leisure/indoor_play': ['entertainment', 'blocks'], 'leisure/water_park': ['entertainment', 'droplet'],
  'office/insurance': ['insurance', 'shield'], 'office/estate_agent': ['housing', 'key'], 'shop/estate_agent': ['housing', 'key'], 'office/telecommunication': ['phone', 'wifi'], 'office/energy_supplier': ['utilities', 'spark'], 'office/water_utility': ['utilities', 'droplet'], 'office/employment_agency': ['work', 'case'], 'office/financial': ['savings', 'coins'], 'office/financial_advisor': ['savings', 'coins'], 'office/moving_company': ['home', 'box'], 'amenity/post_office': ['shopping', 'parcel'], 'shop/courier': ['shopping', 'parcel'], 'office/courier': ['shopping', 'parcel'], 'office/airline': ['travel', 'plane'], 'office/tax_advisor': ['work', 'doc'], 'office/accountant': ['work', 'doc'], 'amenity/driving_school': ['car', 'car'], 'amenity/language_school': ['education', 'cap'], 'amenity/college': ['education', 'cap'], 'amenity/university': ['education', 'cap'], 'amenity/prep_school': ['education', 'cap'], 'amenity/childcare': ['family', 'blocks'], 'amenity/kindergarten': ['family', 'blocks'],
};
// Earlier wins when a brand sits in several groups.
const ORDER = Object.keys(GROUPS);
const CUISINE = [[/pizza/, 'pizza'], [/burger/, 'burger'], [/chicken|wings/, 'chicken'], [/sandwich|bagel|wrap/, 'sandwich'], [/mexican|taco|burrito|tex-mex/, 'taco'], [/noodle|ramen|asian|chinese|thai|vietnamese|korean|wok/, 'noodle'], [/sushi|japanese/, 'sushi'], [/fish|seafood/, 'fish'], [/coffee/, 'coffee'], [/ice_cream|frozen_yogurt/, 'ice'], [/donut|doughnut/, 'donut'], [/bakery|pastry|cake|sausage_roll|pie/, 'bread'], [/juice|smoothie|bubble_tea|tea/, 'tea'], [/italian/, 'pizza']];
const isUK = (ls) => ((ls && ls.include) || []).some(c => /^(gb|uk|gb-[a-z]+)(\.geojson)?$/i.test(String(c)) || /^(england|scotland|wales|northern-ireland|london)/i.test(String(c)));
const notUK = (ls) => ((ls && ls.exclude) || []).some(c => /^(gb|uk)$/i.test(String(c)));
const isWorld = (ls) => ((ls && ls.include) || []).some(c => ['001', '150', 'eu', '154', '155', '039', '021', '019'].includes(String(c).toLowerCase()));

const rows = new Map();   // nameKey -> row
const byQ = new Map();
function row(name) {
  const k = nameKey(name);
  let r = rows.get(k);
  if (!r) { r = { name, aliases: new Set(), scene: '', pict: '', color: '', accent: '', mono: '', logoHint: '', flags: '', q: '', uk: false, world: false, curated: false, legacy: false }; rows.set(k, r); }
  return r;
}

/* the merchants already in src/app/67-fin-symbols.js stay, with their colours and patterns */
const legacy = (() => {
  const box = {};
  // eslint-disable-next-line no-new-func
  new Function('window', readFileSync(join(ROOT, 'src/app/67-fin-symbols.js'), 'utf8'))(box);
  return box.FinSymbols.merchants();
})();
for (const m of legacy) { const r = row(m.name); r.legacy = true; r.uk = true; r.scene = m.scene; r.color = m.color.replace('#', ''); r.mono = m.mono; r.inkLegacy = m.ink; }

/* curated rows */
for (const line of readFileSync(join(ROOT, 'tools/vendors/curated.txt'), 'utf8').split(/\r?\n/)) {
  if (!line.trim() || line.startsWith('#')) continue;
  const f = line.split('|');
  if (/^[tx]+$/.test(f[7] || '') && !f[8]) { f[8] = f[7]; f[7] = ''; }
  const r = row(f[0]);
  r.curated = true; r.uk = true;
  for (const a of String(f[1] || '').split(';').filter(Boolean)) r.aliases.add(a);
  if (f[2]) r.scene = f[2];
  if (f[3]) r.pict = f[3];
  if (f[4]) r.color = f[4];
  if (f[5]) r.accent = f[5];
  if (f[6]) r.mono = f[6];
  if (f[7]) r.logoHint = f[7];
  if (f[8]) r.flags = f[8];
}

/* the name index */
const nsi = JSON.parse(readFileSync(join(NSI, 'dist/json/nsi.min.json'), 'utf8'));
const nsiMeta = nsi._meta;
const wdRaw = JSON.parse(readFileSync(join(NSI, 'dist/wikidata/wikidata.min.json'), 'utf8'));
const WD = wdRaw.wikidata || wdRaw;
const curatedAlias = new Map();
for (const r of rows.values()) if (r.curated) for (const al of r.aliases) if (!curatedAlias.has(nameKey(al))) curatedAlias.set(nameKey(al), r);
const items = [];
for (const grp of Object.keys(nsi.nsi)) {
  if (!grp.startsWith('brands/') || SKIP_SENSITIVE.test(grp)) continue;
  const g = grp.slice('brands/'.length);
  if (!GROUPS[g]) continue;
  for (const it of nsi.nsi[grp].items) {
    const t = it.tags || {};
    const uk = isUK(it.locationSet) && !notUK(it.locationSet), world = isWorld(it.locationSet) && !notUK(it.locationSet);
    if (!uk && !world) continue;
    const name = t.brand || it.displayName;
    if (!name || !t['brand:wikidata']) continue;
    if (!/^[\x20-\x7eÀ-ɏ’]+$/.test(name)) continue;   // Latin script only: the bank writes it in Latin letters
    items.push({ g, name, it, t, uk, world, rank: ORDER.indexOf(g) });
  }
}
items.sort((a, b) => a.rank - b.rank);
for (const x of items) {
  const q = x.t['brand:wikidata'];
  const exist = byQ.get(q);
  // A curated row with this as another name (Pret, "Pret A Manger") is the same vendor.
  const r = exist || curatedAlias.get(nameKey(x.name)) || row(x.name);
  byQ.set(q, r);
  if (!r.q) r.q = q;
  r.uk = r.uk || x.uk; r.world = r.world || x.world;
  const [scene, pict0] = GROUPS[x.g];
  let pict = pict0;
  if (x.t.cuisine && (x.g === 'amenity/fast_food' || x.g === 'amenity/restaurant')) { const c = CUISINE.find(([re]) => re.test(x.t.cuisine)); if (c) pict = c[1]; }
  if (!r.scene) r.scene = scene;
  if (!r.pict) r.pict = pict;
  r.nsi = true;
  for (const a of [x.it.displayName, x.t.name, ...(x.it.matchNames || [])]) if (a && /^[\x20-\x7eÀ-ɏ’]+$/.test(a)) r.aliases.add(a);
}

/* ---------- scene -> default pictogram ---------- */
const SCENE_PICT = { groceries: 'basket', 'eating-out': 'cutlery', coffee: 'coffee', drinks: 'pint', takeaway: 'bag', transport: 'train', car: 'car', fuel: 'fuel', housing: 'house', home: 'sofa', utilities: 'spark', phone: 'phone', subscriptions: 'play', shopping: 'bag', health: 'cross', 'personal-care': 'bottle', fitness: 'gym', travel: 'plane', entertainment: 'ticket', gaming: 'game', gifts: 'gift', education: 'books', savings: 'bank', income: 'coins', transfers: 'swap', people: 'hand', fees: 'receipt', cash: 'note', insurance: 'shield', tax: 'doc', debt: 'card', family: 'heart', pets: 'paw', work: 'case', other: 'spark2' };

/* ---------- which rows are kept ---------- */
const kept = [...rows.values()].filter(r => {
  if (r.legacy || r.curated) return true;
  if (!r.nsi) return false;
  if (nameKey(r.name).length < 3) return false;
  return r.uk || r.world;
});
for (const r of kept) {
  if (!r.scene) r.scene = 'other';
  if (!r.pict) r.pict = SCENE_PICT[r.scene] || 'spark2';
  // Aliases: the ones that say something beyond the name, in the matching form.
  const own = normAlias(r.name);
  const al = new Set();
  for (const a of r.aliases) {
    const n = normAlias(a).replace(SUFFIX, '').trim();
    if (!n || n === own || n.length < 2) continue;
    if (!n.includes(' ') && (STOP.has(n) || n.length < 3) && !r.curated) continue;
    al.add(n);
  }
  r.alias = [...al].slice(0, r.curated ? 12 : 3);
  const single = !own.includes(' ');
  if (single && (STOP.has(own) || own.length <= 3) && !r.flags.includes('t') && !r.legacy && !r.flags.includes('x')) r.flags += 'x';
}

/* ---------- logos: Simple Icons ---------- */
const siData = JSON.parse(readFileSync(join(SI, 'data/simple-icons.json'), 'utf8'));
const siList = Array.isArray(siData) ? siData : siData.icons;
const siSlug = (i) => i.slug || i.title.toLowerCase().replace(/\+/g, 'plus').replace(/\./g, 'dot').replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
const siBy = new Map();
for (const i of siList) { siBy.set(nameKey(i.title), i); for (const a of ((i.aliases && i.aliases.aka) || [])) if (!siBy.has(nameKey(a))) siBy.set(nameKey(a), i); }
// Licences that allow this use, with the licence kept on record. NC, ND, GPL-family and custom terms are skipped.
const SI_OK = /^(CC0-1\.0|MIT|Apache-2\.0|BSD-[23]-Clause|Unlicense|CC-BY-[\d.]+|CC-BY-SA-[\d.]+)$/;
const siSeen = new Set(siList.map(i => siSlug(i)));
function siFor(r) {
  if (r.logoHint === 'none') return null;
  if (r.logoHint && r.logoHint.startsWith('si:')) return siList.find(i => siSlug(i) === r.logoHint.slice(3)) || null;
  return siBy.get(nameKey(r.name)) || null;
}

/* ---------- logos: Wikimedia Commons, through the file Wikidata names ---------- */
const metaFile = join(CACHE, 'commons-meta.json');
const META = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : {};
const wdExtraFile = join(CACHE, 'wd-extra.json');
const WDX = existsSync(wdExtraFile) ? JSON.parse(readFileSync(wdExtraFile, 'utf8')) : {};
function commonsFile(r) {
  if (r.logoHint === 'none') return '';
  if (r.logoHint && r.logoHint.startsWith('c:')) return r.logoHint.slice(2);
  if (WDX[r.name] && WDX[r.name].file) return WDX[r.name].file;
  const u = r.q && WD[r.q] && WD[r.q].logos && WD[r.q].logos.wikidata;
  if (!u) return '';
  let m = /Special:FilePath\/(.+?)(\?|$)/.exec(u);
  if (m) return decodeURIComponent(m[1]);
  m = /Special%3ARedirect%2Ffile%2F(.+?)(&|$)/.exec(u);
  return m ? decodeURIComponent(decodeURIComponent(m[1])) : '';
}
// A file's own page must say public domain or CC0. A free licence that asks for a credit (CC BY, CC BY-SA) is taken
// only for vendors in the curated list, only with a named author, and the credit goes in SOURCES.json and the notices.
function commonsPublic(mt) {
  if (!mt) return false;
  const lic = String(mt.License || '').toLowerCase(), short = String(mt.LicenseShortName || '').toLowerCase();
  return lic === 'pd' || lic === 'cc0' || /^(public domain|cc0|pd[- ])/.test(short) || /^pd/.test(lic);
}
function commonsOk(mt, r) {
  if (commonsPublic(mt)) return true;
  if (!mt || !r || !(r.curated || r.legacy)) return false;
  return /^cc-by(-sa)?-[\d.]+$/.test(String(mt.License || '').toLowerCase()) && !!String(mt.Artist || mt.Credit || '').trim();
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function api(titles) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&maxlag=5&prop=imageinfo&iiprop=url%7Csize%7Cmime%7Cextmetadata&iiurlwidth=128&iiextmetadatafilter=LicenseShortName%7CLicense%7CLicenseUrl%7CArtist%7CCredit%7CUsageTerms%7CCopyrighted%7CRestrictions&redirects=1&titles=' + encodeURIComponent(titles.map(t => 'File:' + t).join('|'));
  for (let tries = 0; tries < 6; tries++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    const retry = Number(res.headers.get('retry-after')) || 0;
    if (res.status === 429 || res.status === 503 || retry) { await sleep(Math.max(retry * 1000, 4000 * (tries + 1))); continue; }
    const j = await res.json();
    if (j.error && j.error.code === 'maxlag') { await sleep(6000); continue; }
    return j;
  }
  throw new Error('Commons kept asking to wait');
}
// Curated rows with no Wikidata id from the name index: search by name, accept a hit whose description reads like a company.
const COMPANY = /compan|brand|bank|building society|airline|operator|retail|chain|supermarket|restaurant|service|provider|insur|charity|shop|store|manufactur|broadcast|network|publisher|newspaper|hotel|cinema|energy|supplier|utility|software|platform|website|delivery|courier|payment|fintech|streaming|video game|game|train|rail|bus|ferry|transport|fitness|gym|pharmacy|cafe|coffee|bakery|takeaway|fast food|pizza|cosmetic|fashion|clothing|apparel|telecom|mobile|internet|conglomerate|multinational|organi[sz]ation|business/i;
async function wd(params) {
  const url = 'https://www.wikidata.org/w/api.php?format=json&maxlag=5&' + new URLSearchParams(params);
  for (let tries = 0; tries < 6; tries++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (res.status === 429 || res.status === 503) { await sleep(5000 * (tries + 1)); continue; }
    const j = await res.json();
    if (j.error && j.error.code === 'maxlag') { await sleep(6000); continue; }
    return j;
  }
  return {};
}
async function searchWikidata() {
  const need = kept.filter(r => (r.curated || r.legacy) && !commonsFile(r) && !(r.name in WDX) && r.logoHint !== 'none');
  console.log('Wikidata: looking up', need.length, 'names');
  let n = 0;
  for (const r of need) {
    const s = await wd({ action: 'wbsearchentities', search: r.name.replace('+', ' plus'), language: 'en', uselang: 'en', type: 'item', limit: '4' });
    const hit = (s.search || []).find(h => COMPANY.test(h.description || ''));
    let out = { q: '', file: '', desc: '' };
    if (hit) {
      const g = await wd({ action: 'wbgetclaims', entity: hit.id, property: 'P154' });
      const cl = ((g.claims && g.claims.P154) || []).filter(c => c.mainsnak && c.mainsnak.datavalue);
      const best = cl.find(c => c.rank === 'preferred') || cl[cl.length - 1];
      out = { q: hit.id, desc: hit.description || '', file: best ? String(best.mainsnak.datavalue.value) : '' };
    }
    WDX[r.name] = out;
    if (++n % 20 === 0) { writeFileSync(wdExtraFile, JSON.stringify(WDX, null, 0)); process.stdout.write('  ' + n + '/' + need.length); }
    await sleep(500);
  }
  writeFileSync(wdExtraFile, JSON.stringify(WDX, null, 0));
  console.log();
}
async function fetchMeta() {
  await searchWikidata();
  const need = [...new Set(kept.filter(r => r.uk || r.curated).map(commonsFile).filter(Boolean))].filter(f => !(f in META));
  console.log('Commons: asking about', need.length, 'files');
  for (let i = 0; i < need.length; i += 40) {
    const batch = need.slice(i, i + 40);
    const j = await api(batch);
    const q = j.query || {};
    const norm = new Map((q.normalized || []).map(n => [n.to, n.from]));
    const red = new Map((q.redirects || []).map(n => [n.to, n.from]));
    for (const p of Object.values(q.pages || {})) {
      const title = p.title || '';
      const back = (s) => { const a = red.get(s) || s; return norm.get(a) || a; };
      const name = back(title).replace(/^File:/, '');
      const ii = p.imageinfo && p.imageinfo[0];
      const ex = ii && ii.extmetadata ? Object.fromEntries(Object.entries(ii.extmetadata).map(([k, v]) => [k, String(v.value || '').replace(/<[^>]+>/g, '').trim().slice(0, 200)])) : null;
      META[name] = ii ? { url: ii.url, page: ii.descriptionurl, thumb: ii.thumburl, mime: ii.mime, w: ii.width, h: ii.height, size: ii.size, ...ex, title } : { missing: true };
    }
    for (const b of batch) if (!(b in META)) META[b] = { missing: true };
    writeFileSync(metaFile, JSON.stringify(META, null, 0));
    process.stdout.write(`\r  ${Math.min(i + 40, need.length)}/${need.length}`);
    await sleep(1100);
  }
  console.log();
}
const fileName = (f) => 'f' + Buffer.from(f).toString('base64url').slice(0, 90);
async function fetchFiles() {
  const wanted = [...new Set(kept.filter(r => r.uk || r.curated).filter(r => { const f = commonsFile(r); return f && commonsOk(META[f], r) && META[f].url; }).map(commonsFile))];
  const todo = wanted.filter(f => !existsSync(join(CACHE, 'files', fileName(f))));
  console.log('Commons: downloading', todo.length, 'accepted files of', wanted.length);
  let n = 0;
  for (const f of todo) {
    const mt = META[f];
    const svg = /svg/i.test(mt.mime || '');
    if (svg && mt.size > 400000) { writeFileSync(join(CACHE, 'files', fileName(f)), ''); continue; }
    const url = svg ? mt.url : mt.thumb;
    if (!url) continue;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.status === 429 || res.status === 503) { await sleep(8000); continue; }
      if (res.ok) writeFileSync(join(CACHE, 'files', fileName(f)), Buffer.from(await res.arrayBuffer()));
    } catch (e) { console.log('skip', f, e.message); }
    if (++n % 25 === 0) process.stdout.write(`\r  ${n}/${todo.length}`);
    await sleep(350);
  }
  console.log();
}

/* ---------- choosing each logo ---------- */
const bboxFile = join(CACHE, 'bbox.json');
const BBOX = existsSync(bboxFile) ? JSON.parse(readFileSync(bboxFile, 'utf8')) : {};
const slugOf = (name) => fold(name).toLowerCase().replace(/\+/g, 'plus').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const aspectOf = (vb) => { const a = vb.split(' ').map(Number); return a[2] / a[3]; };

function chooseLogo(r) {
  const top = r.flags.includes('t');
  const limit = top ? 20000 : (r.curated || r.legacy) ? 6500 : 3600;
  const out = [];
  const si = siFor(r);
  if (si) {
    const lic = si.license ? si.license.type : '';
    if (!lic || SI_OK.test(lic)) {
      const file = join(SI, 'icons', siSlug(si) + '.svg');
      if (existsSync(file)) {
        const c = cleanSvg(readFileSync(file, 'utf8'));
        if (c.ok && c.bytes <= 6000) {
          const d = /<path d="([^"]+)"\/>/.exec(c.inner);
          out.push({ kind: 'mono', src: 'simple-icons', viewBox: c.viewBox, inner: c.inner, d: d && d[0].length === c.inner.length ? d[1] : null, bytes: c.bytes, aspect: 1,
            rec: { source: `https://simpleicons.org/?q=${encodeURIComponent(si.title)}`, sourceFile: `simple-icons@${siPkgVersion()}/icons/${siSlug(si)}.svg`, upstream: si.source || '', licence: lic || 'CC0-1.0 collection; no separate licence listed for this icon', guidelines: si.guidelines || '', hex: si.hex } });
        }
      }
    }
  }
  const f = commonsFile(r);
  const mt = f && META[f];
  if (mt && commonsOk(mt, r)) {
    const p = join(CACHE, 'files', fileName(f));
    if (existsSync(p)) {
      const rec = { source: mt.page || `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(f)}`, licence: mt.LicenseShortName || mt.License || 'public domain', usage: mt.UsageTerms || '', restrictions: mt.Restrictions || '', credit: mt.Artist || mt.Credit || '', wikidata: r.q || '' };
      if (/svg/i.test(mt.mime || '')) {
        const c = cleanSvg(readFileSync(p, 'utf8'));
        if (c.ok && c.bytes <= limit) {
          let vb = c.viewBox; const box = BBOX[slugOf(r.name)];
          // Tight frame: the logo's own bounds with a small margin, so it fills its tile. The drawing itself is untouched.
          if (box && box.w > 0 && box.h > 0) { const m = Math.max(box.w, box.h) * 0.03; const d = (n) => String(Math.round(n * 1000) / 1000); vb = [d(box.x - m), d(box.y - m), d(box.w + 2 * m), d(box.h + 2 * m)].join(' '); }
          out.push({ kind: 'colour', src: 'commons', viewBox: vb, inner: c.inner, bytes: c.bytes, aspect: aspectOf(vb), colours: c.colours, rec });
        }
      } else if (/png|jpeg|webp/i.test(mt.mime || '')) {
        const buf = readFileSync(p);
        if (buf.length && buf.length <= (top ? 9000 : 0)) out.push({ kind: 'raster', src: 'commons', mime: mt.mime, b64: buf.toString('base64'), bytes: Math.ceil(buf.length * 4 / 3), aspect: (mt.w || 1) / (mt.h || 1), rec });
      }
    }
  }
  if (!out.length) return null;
  // A squarer mark reads better in a small tile; a full-colour drawing is the more faithful one when both fit.
  const score = (x) => (x.kind === 'raster' ? 30 : 0) + (x.aspect > 2.6 ? 40 : x.aspect > 1.8 ? 10 : 0) + (x.kind === 'colour' ? 0 : 6) + x.bytes / 1500;
  out.sort((a, b) => score(a) - score(b));
  return out[0];
}
let _siV = '';
function siPkgVersion() { if (!_siV) _siV = JSON.parse(readFileSync(join(SI, 'package.json'), 'utf8')).version; return _siV; }

/* ---------- writing ---------- */
const clean = (s) => String(s).replace(/[|\n\r`$\\]/g, ' ').trim();
async function main() {
  if (FETCH) { await fetchMeta(); await fetchFiles(); }
  const logos = {}, sources = {};
  const taken = new Set();
  // UK and curated first, so the budget goes to the vendors people here actually pay.
  const order = [...kept].sort((a, b) => (Number(b.flags.includes('t')) - Number(a.flags.includes('t'))) || (Number(b.curated || b.legacy) - Number(a.curated || a.legacy)) || (Number(b.uk) - Number(a.uk)) || (a.name < b.name ? -1 : 1));
  const MAX_TOTAL = Number(arg('--budget', 520000));
  let total = 0;
  for (const r of order) {
    const pick = chooseLogo(r);
    if (!pick) continue;
    if (total + pick.bytes > MAX_TOTAL && !r.flags.includes('t')) continue;
    if (!r.uk && !r.flags.includes('t') && total > MAX_TOTAL * 0.8) continue;
    let slug = slugOf(r.name); while (taken.has(slug)) slug += '-2'; taken.add(slug);
    r.logo = slug; r.logoKind = pick.kind; r.logoAspect = pick.aspect;
    total += pick.bytes;
    if (pick.kind === 'mono') logos[slug] = pick.d ? ['m', pick.viewBox, pick.d] : ['g', pick.viewBox, pick.inner];
    else if (pick.kind === 'colour') logos[slug] = ['c', pick.viewBox, pick.inner];
    else logos[slug] = ['r', `${pick.aspect.toFixed(2)}`, `data:${pick.mime};base64,${pick.b64}`];
    sources[slug] = { vendor: r.name, from: pick.src, ...pick.rec, fetched: TODAY, bytes: pick.bytes };
    if (pick.kind === 'mono' && pick.rec.hex && !r.curated && !r.legacy) r.color = pick.rec.hex.toLowerCase();
  }
  const kindOf = (r) => (r.logoAspect > 2.6 ? 'w' : '');
  const lines = kept.sort((a, b) => (a.name < b.name ? -1 : 1)).map(r => [clean(r.name), r.alias.map(clean).join(';'), r.scene, r.pict, r.color, r.accent, clean(r.mono && r.legacy ? '' : r.mono), r.logo || '', (r.flags.replace(/[^tx]/g, '') + kindOf(r) + (r.uk ? '' : 'i'))].join('|').replace(/\|+$/, ''));
  const head = `/* GENERATED by tools/build-vendor-db.mjs. Common vendors, one per line: nothing here is fetched at runtime.
   name | other names as the bank writes them (;) | scene | pictogram | colour | accent | monogram | logo | flags
   flags: t top tier (always a logo if there is one), x only the whole memo counts (an everyday word or name),
          w a wide logo (drawn from size lg up), i not known to be in the UK.
   To take a logo out: delete its logo field (or its line in 67-fin-symbols-dblogos.js). The vendor keeps its pictogram.
   Sources and licences: assets/brands/SOURCES.json, THIRD_PARTY_NOTICES.md. */\n`;
  writeFileSync(join(ROOT, 'src/app/67-fin-symbols-db.js'), `${head}const FSYM_VENDOR_DB = \`${lines.join('\n')}\`;\n`);
  const logoJs = Object.entries(logos).sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(',\n');
  writeFileSync(join(ROOT, 'src/app/67-fin-symbols-dblogos.js'), `/* GENERATED by tools/build-vendor-db.mjs. Sanitised company logos, bundled: never fetched. Logos are trademarks of their owners, used only to identify who a payment went to; no endorsement implied. Sources: assets/brands/SOURCES.json. [kind, view box, drawing]: m one path (takes the tile's ink), g one-colour markup, c full colour, r small raster. */\nconst FSYM_LOGOS = {\n${logoJs}\n};\n`);
  mkdirSync(join(ROOT, 'assets/brands'), { recursive: true });
  writeFileSync(join(ROOT, 'assets/brands/SOURCES.json'), JSON.stringify({ generated: TODAY, tool: 'tools/build-vendor-db.mjs', vendorNames: { source: 'name-suggestion-index', version: nsiMeta.version, licence: 'BSD-3-Clause', url: 'https://github.com/osmlab/name-suggestion-index' }, simpleIcons: { version: siPkgVersion(), licence: 'CC0-1.0 (collection; per-icon licences recorded below)', url: 'https://github.com/simple-icons/simple-icons' }, notice: 'Logos are trademarks of their owners, used only to identify who a payment went to; no endorsement implied.', logos: sources }, null, 1) + '\n');
  // The notices: the section between the markers follows the records above.
  {
    const L = Object.values(sources);
    const by = (t) => L.filter(x => x.from === t).length;
    const credits = L.filter(x => x.from === 'commons' && /CC BY/i.test(x.licence));
    const siLic = L.filter(x => x.from === 'simple-icons' && /^(CC-BY|MIT|Apache|BSD)/.test(x.licence));
    const section = [
      'Logos are trademarks of their owners, used only to identify who a payment went to; no endorsement implied.',
      '',
      "OpenDash's MIT licence does not cover these marks. They are bundled in `src/app/67-fin-symbols-dblogos.js` and nothing about a vendor is ever fetched at runtime. `assets/brands/SOURCES.json` records every logo: its source address, its licence or status, the date it was collected and any brand guidelines listed for it. To take a logo out, delete the vendor's logo field in `src/app/67-fin-symbols-db.js` (or its line in the logos file): the vendor falls back to OpenDash's own pictogram and colours. Settings > Money look > Show company logos switches them all off.",
      '',
      `- **Vendor names and other names**: name-suggestion-index ${nsiMeta.version} (BSD 3-Clause, Copyright 2026, name-suggestion-index contributors; https://github.com/osmlab/name-suggestion-index), reduced to one generated table at development time by \`tools/build-vendor-db.mjs\`. Redistribution and use in source and binary forms, with or without modification, are permitted provided that the copyright notice, this list of conditions and the following disclaimer are retained; the name of the copyright holder may not be used to endorse products derived from this data without permission. THE DATA IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND.`,
      `- **${by('simple-icons')} one-colour marks**: Simple Icons ${siPkgVersion()} (the collection is CC0-1.0; https://github.com/simple-icons/simple-icons). Its disclaimer says this does not mean every icon is CC0, so each icon's own licence is recorded, and icons under NC, ND, GPL-family or custom terms were left out.`,
      `- **${by('commons')} logos**: Wikimedia Commons, found through Wikidata (CC0 data). Each file's page gave a public-domain or CC0 status${credits.length ? `, except the ${credits.length} listed below, which carry a free licence that asks for a credit` : ''}. Commons judges "public domain" mostly under US law, for text and simple shapes; that may differ in other countries, and a trademark is a separate right in any case.`,
      ...credits.map(x => `  - ${x.vendor}: ${x.licence}, ${String(x.credit || 'see source').replace(/\s+/g, ' ').slice(0, 90)}, ${x.source}`),
      ...siLic.map(x => `  - ${x.vendor} (Simple Icons): ${x.licence}, ${x.upstream || x.source}`),
      '',
      'The pictograms, scenes and easter-egg drawings in Money are original to OpenDash (`src/app/67-fin-symbols-kit.js`, `src/finance/28-money-scenes.js`, `src/finance/29-money-eggs.js`).',
    ].join('\n');
    const nf = join(ROOT, 'THIRD_PARTY_NOTICES.md');
    const t = readFileSync(nf, 'utf8');
    const a = t.indexOf('<!-- vendors:begin -->'), b = t.indexOf('<!-- vendors:end -->');
    if (a >= 0 && b > a) writeFileSync(nf, t.slice(0, a) + '<!-- vendors:begin -->\n' + section + '\n' + t.slice(b));
  }
  // A report for the person running this.
  const uk = kept.filter(r => r.uk).length;
  const by = { 'simple-icons': 0, commons: 0 }; let raster = 0, colour = 0, mono = 0, guide = 0;
  for (const s of Object.values(sources)) { by[s.from]++; if (s.guidelines) guide++; }
  for (const v of Object.values(logos)) { if (v[0] === 'r') raster++; else if (v[0] === 'c') colour++; else mono++; }
  console.log(JSON.stringify({ vendors: kept.length, uk, intl: kept.length - uk, logos: Object.keys(logos).length, ...by, colour, mono, raster, guidelinesListed: guide, logoBytes: total, dbBytes: lines.join('\n').length }, null, 0));
  const missing = kept.filter(r => r.flags.includes('t') && !r.logo).map(r => r.name);
  console.log('TOP WITHOUT A LOGO:', missing.join(', '));
  const curatedMissing = kept.filter(r => (r.curated) && !r.flags.includes('t') && !r.logo).length;
  console.log('curated without a logo:', curatedMissing);
  writeFileSync(join(CACHE, 'single-words.txt'), kept.filter(r => r.nsi && !r.curated && !r.legacy && !normAlias(r.name).includes(' ') && !r.flags.includes('x')).map(r => normAlias(r.name)).sort().join(' '));
  writeFileSync(join(CACHE, 'colour-logos.json'), JSON.stringify(Object.fromEntries(kept.filter(r => r.logo && r.logoKind === 'colour').map(r => [r.logo, 1])), null, 0));
  writeFileSync(join(CACHE, 'no-logo-q.json'), JSON.stringify(kept.filter(r => (r.curated || r.legacy) && !r.logo).map(r => ({ name: r.name, q: r.q, top: r.flags.includes('t') })), null, 0));
}
main().catch(e => { console.error(e); process.exit(1); });
