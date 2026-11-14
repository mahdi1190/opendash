/* ============================================================
   WORLD ENGINE (v3): the world scenes in the opening rotation, and the rest in the Animations gallery only.
   Loads after 79-world-zscene-*.js (they register into _scPacks['world-test']) and after every 72-anim-pack file.
   - PROMOTED (the table below, edited by `node tools/world.mjs promote <id>` / `demote <id>`; docs/dev/SCENE_FACTORY.md 2):
     * a world version of a registered opening ("supersedes"): that item keeps its ref, id, pack, when(), county, place, view,
       caption and priority, so pins, favourites, blocks and the synced rotation (seen.openingLast) keep working; only its
       picture becomes the world scene (animSupersede, 71-anim-registry.js). A base view takes its seasonal siblings too (the
       world draws the season of the day). The old gallery ref 'world-preview/<id>' now opens that item.
     * a place that only has a world scene: registered in the real pack 'uk-world' with its county, town, place, view, lat/lon
       and a when() that holds near that place (25 km, the same rule as every UK pack) in its months; priority 1, subtle.
   - NOT PROMOTED: the pack 'world-preview' with when() always false and priority 0, exactly as before (the user asked, 14 Oct,
     to see the test scenes in the gallery before they pass review): never in the rotation, the splash or the Home card.
   WORLD_OPENING_ON = false turns every promotion off at once (everything back to gallery-only).
   ============================================================ */
const WORLD_OPENING_ON = true;
(function () {
  if (typeof animRegisterPack !== 'function' || typeof _scPacks !== 'object' || !_scPacks) return;
  const src = (_scPacks['world-test'] || []).filter(it => it && it.id);
  if (!src.length) return;
  const OPENING = {
    // @opening-begin  (one line a promoted world scene, sorted; written by `node tools/world.mjs promote <id>`, removed by `demote <id>`)
    'cotswold-green-1-w3': {"county":"gloucestershire","ukTown":"Bibury","ukPlace":"cotswold-green","ukView":"green","ukLat":51.76,"ukLon":-1.835},
    'fleet-canal-1-w3': {"supersedes":["uk-south-east/hampshire-fleet-canal-1-spring","uk-south-east/hampshire-fleet-canal-1","uk-south-east/hampshire-fleet-canal-1-autumn","uk-south-east/hampshire-fleet-canal-1-winter"]},
    'fleet-canal-2-w3': {"supersedes":["uk-south-east/hampshire-fleet-canal-2-spring","uk-south-east/hampshire-fleet-canal-2","uk-south-east/hampshire-fleet-canal-2-autumn","uk-south-east/hampshire-fleet-canal-2-winter"]},
    'fleet-canal-3-w3': {"supersedes":["uk-south-east/hampshire-fleet-canal-3-spring","uk-south-east/hampshire-fleet-canal-3-summer","uk-south-east/hampshire-fleet-canal-3","uk-south-east/hampshire-fleet-canal-3-winter"]},
    'fleet-canal-4-w3': {"supersedes":["uk-south-east/hampshire-fleet-canal-4-spring","uk-south-east/hampshire-fleet-canal-4","uk-south-east/hampshire-fleet-canal-4-autumn","uk-south-east/hampshire-fleet-canal-4-winter"]},
    'fleet-pond-2-w3': {"supersedes":["uk-south-east/hampshire-fleet-pond-2-spring","uk-south-east/hampshire-fleet-pond-2","uk-south-east/hampshire-fleet-pond-2-autumn","uk-south-east/hampshire-fleet-pond-2-winter"]},
    'greater-manchester-ancoats-canal-w3': {"supersedes":["uk-north-manchester-quays-nq/greater-manchester-ancoats-canal"]},
    'greater-manchester-castlefield-basin-w3': {"supersedes":["uk-north-manchester-castlefield/greater-manchester-castlefield-basin"]},
    'greater-manchester-castlefield-viaducts-w3': {"supersedes":["uk-north-manchester-castlefield/greater-manchester-castlefield-viaducts"]},
    'greater-manchester-castlefield-warehouses-w3': {"supersedes":["uk-north-manchester-castlefield/greater-manchester-castlefield-warehouses"]},
    'greater-manchester-manchester-centre-1-w3': {"supersedes":["uk-north-manchester-centre/greater-manchester-manchester-centre-1"]},
    'greater-manchester-manchester-centre-3-w3': {"supersedes":["uk-north-manchester-centre/greater-manchester-manchester-centre-3"]},
    'greater-manchester-manchester-centre-4-w3': {"supersedes":["uk-north-manchester-centre/greater-manchester-manchester-centre-4"]},
    'greater-manchester-mediacity-piazza-w3': {"supersedes":["uk-north-manchester-quays-nq/greater-manchester-mediacity-piazza"]},
    'greater-manchester-stevenson-square-w3': {"supersedes":["uk-north-manchester-quays-nq/greater-manchester-stevenson-square"]},
    'hampshire-wyndhams-pool-1-w3': {"supersedes":["uk-south-east/hampshire-wyndhams-pool-1-spring","uk-south-east/hampshire-wyndhams-pool-1","uk-south-east/hampshire-wyndhams-pool-1-autumn","uk-south-east/hampshire-wyndhams-pool-1-winter"]},
    'hampshire-wyndhams-pool-dusk-w3': {"supersedes":["proof-wyndhams-pool/hampshire-wyndhams-pool-dusk"]},
    'hampshire-yateley-green-1-w3': {"supersedes":["uk-south-east/hampshire-yateley-green-1-spring","uk-south-east/hampshire-yateley-green-1","uk-south-east/hampshire-yateley-green-1-autumn","uk-south-east/hampshire-yateley-green-1-winter"]},
    'liverpool-pier-head-1-w3': {"county":"merseyside","ukTown":"Liverpool","ukPlace":"liverpool-pier-head","ukView":"world","ukLat":53.4064,"ukLon":-2.9958},
    'malham-cove-1-w3': {"county":"north-yorkshire","ukTown":"Malham","ukPlace":"malham-cove","ukView":"world","ukLat":54.0715,"ukLon":-2.165},
    'manchester-castlefield-1-w3': {"county":"greater-manchester","ukTown":"Manchester","ukPlace":"manchester-castlefield","ukView":"basin-world","ukLat":53.4773,"ukLon":-2.2554},
    'norwich-elm-hill-1-w3': {"county":"norfolk","ukTown":"Norwich","ukPlace":"norwich-elm-hill","ukView":"world","ukLat":52.6314,"ukLon":1.2918},
    'sheffield-centre-1-w3': {"supersedes":["uk-north-sheffield-centre/south-yorkshire-sheffield-centre-1"]},
    'sheffield-centre-3-w3': {"supersedes":["uk-north-sheffield-centre/south-yorkshire-sheffield-centre-3"]},
    'sheffield-kelham-1-w3': {"supersedes":["uk-north-sheffield-kelham/south-yorkshire-sheffield-kelham-1"]},
    'sheffield-kelham-2-w3': {"supersedes":["uk-north-sheffield-kelham/south-yorkshire-sheffield-kelham-2"]},
    'sheffield-kelham-3-w3': {"supersedes":["uk-north-sheffield-kelham/south-yorkshire-sheffield-kelham-3"]},
    'sheffield-parks-2-w3': {"supersedes":["uk-north-sheffield-parks/south-yorkshire-sheffield-parks-2"]},
    'sheffield-parks-4-w3': {"supersedes":["uk-north-sheffield-parks/south-yorkshire-sheffield-parks-4"]},
    'sheffield-winter-garden-1-w3': {"supersedes":["uk-north-sheffield-centre/south-yorkshire-sheffield-centre-2"]},
    'whitby-harbour-1-w3': {"county":"north-yorkshire","ukTown":"Whitby","ukPlace":"whitby-harbour","ukView":"world","ukLat":54.4858,"ukLon":-0.6133},
    'york-shambles-1-w3': {"county":"north-yorkshire","ukTown":"York","ukPlace":"york-shambles","ukView":"world","ukLat":53.959,"ukLon":-1.0815},
    // @opening-end
  };
  // group each under its real place, next to its v2 views (the gallery's "all versions at this location")
  const PLACE = { 'fleet-canal-2-w3': ['fleet-canal', 'hampshire', 'Fleet'], 'fleet-pond-2-w3': ['fleet-pond', 'hampshire', 'Fleet'],
    'sheffield-kelham-1-w3': ['kelham-island', 'south-yorkshire', 'Sheffield'], 'whitby-harbour-1-w3': ['whitby-harbour', 'north-yorkshire', 'Whitby'],
    'liverpool-pier-head-1-w3': ['liverpool-pier-head', 'merseyside', 'Liverpool'],
    'malham-cove-1-w3': ['malham-cove', 'north-yorkshire', 'Malham'],
    'york-shambles-1-w3': ['york-shambles', 'north-yorkshire', 'York'] };
  const preview = [], places = [];
  for (const it of src) {
    const op = WORLD_OPENING_ON ? OPENING[it.id] : null;
    if (op && Array.isArray(op.supersedes) && typeof animSupersede === 'function') {
      // the old gallery ref opens the base view (the item without a season in its id), else the first
      const main = op.supersedes.find(r => !/-(spring|summer|autumn|winter)$/.test(r)) || op.supersedes[0];
      let n = 0;
      for (const ref of op.supersedes) { try { if (animSupersede(ref, it, { from: ref === main ? 'world-preview/' + it.id : null })) n++; } catch (e) { /* that item stays as it was */ } }
      if (n) continue;   // nothing to take over (a pack switched off at build, a renamed item): the scene stays a preview
    } else if (op && op.county && op.ukTown) { places.push([it, op]); continue; }
    preview.push(it);
  }
  const items = preview.map(it => Object.assign({}, it, !PLACE[it.id] && it.ukPlace ? { ukView: it.ukView || 'world-engine' } : null, PLACE[it.id] ? { ukPlace: PLACE[it.id][0], county: PLACE[it.id][1], ukTown: PLACE[it.id][2], ukView: 'world-engine' } : {}, {
    label: /\(world\)/.test(String(it.label || '')) ? it.label : String(it.label || it.id) + ' (world)',
    tags: (Array.isArray(it.tags) ? it.tags : []).concat(['world-engine', 'preview']),
    mood: ['calm', 'cheerful', 'proud', 'cosy', 'focused', 'dreamy', 'energetic', 'neutral'].includes(it.mood) ? it.mood : 'neutral',
    colour: typeof ANIM_SWATCHES === 'object' && ANIM_SWATCHES.includes(it.colour) ? it.colour : 'slate',
    priority: 0,
    when: () => false,   // gallery only: never chosen for the day
  }));
  // the places that only have a world scene: a real pack, the same nearness rule as the UK packs (72-anim-pack-uk-*.js)
  const near = (op, ctx) => !!ctx && !!ctx.county && (ctx.county === op.county || (typeof animUkScenePools === 'function'
    && animUkScenePools([{ county: op.county, ukTown: op.ukTown, ukLat: op.ukLat, ukLon: op.ukLon }], ctx).nearby.length > 0));
  const inMonths = (op, day) => !Array.isArray(op.months) || !op.months.length || op.months.includes(+String(day || '').slice(5, 7));
  const own = places.map(([it, op]) => {
    const c = typeof ukCounty === 'function' ? ukCounty(op.county) : null;
    return Object.assign({}, it, {
      label: String(op.label || it.label || it.id).replace(/\s*\(world\)\s*$/, ''),
      tags: (Array.isArray(it.tags) ? it.tags : []).filter(t => t !== 'world-v3').concat(['world-engine']),
      mood: ['calm', 'cheerful', 'proud', 'cosy', 'focused', 'dreamy', 'energetic', 'neutral'].includes(it.mood) ? it.mood : 'calm',
      colour: typeof ANIM_SWATCHES === 'object' && ANIM_SWATCHES.includes(it.colour) ? it.colour : 'slate',
      intensity: 'subtle', theme: 'any', region: [c ? c.nation : 'GB-ENG'], county: op.county, ukRegion: c ? c.region : undefined, ukKind: 'place',
      ukPart: 'uk-world', ukPlace: op.ukPlace, ukView: op.ukView, ukTown: op.ukTown, ukLocality: op.ukTown,
      ukLat: Number.isFinite(op.ukLat) ? op.ukLat : undefined, ukLon: Number.isFinite(op.ukLon) ? op.ukLon : undefined,
      priority: 1, signature: false,
      when: (day, ctx) => inMonths(op, day) && near(op, ctx),
    });
  });
  try {
    if (own.length) animRegisterPack({ id: 'uk-world', name: 'UK: places on the world engine', version: '1.0.0', movedFrom: ['world-preview'],
      description: 'Places drawn on the world engine (format v3) that have no older scene: they play as the opening near the place, in its months.',
      items: own });
  } catch (e) { /* a promotion must never break the app: these stay out of the rotation */ }
  try {
    if (items.length) animRegisterPack({ id: 'world-preview', name: 'World engine preview (gallery only)', version: '0.1.0',
      description: 'Test scenes on the new world engine (format v3), shown in the gallery for review. They never play in the rotation.',
      items });
  } catch (e) { /* a preview must never break the app */ }
})();
