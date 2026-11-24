// UK_SCENE_PART: uk-south-east/basingstoke-canal-fleet-v2
/* Basingstoke Canal at Fleet: a narrow, tree-lined cut, a gravel towpath and moored narrowboats.
     https://www.hart.gov.uk/sites/default/files/2023-04/Bas%20Canal%20appraisal%20and%20character.pdf
     https://www.basingstoke-canal.org.uk/
   View 2 of 4 (close): one file per view (the others: 72-anim-pack-uk-south-east-basingstoke-canal-fleet-v1..v4.js).
   Drawn with the rich nature kit T.K (src/app/71-anim-uk-nature-kit.js) and its live light (K.live).
   Keep every id, ukPlace, ukView, ukSeason and season unchanged so saved pins and the rotation keep working.

   Brief: through Fleet the canal is a narrow cut about 12-13 m wide (two narrowboats side by side)
   in a green corridor: the gravel towpath on one side between the water and a hedge and tree line,
   alder, oak and willow overhanging the offside with boats moored nose to tail beneath them, still,
   clear green water (an SSSI for water plants and dragonflies). Here: standing on the towpath,
   canal on the left, looking south-west (heading 215) along the cut as a narrowboat chugs slowly
   past close alongside, its stove chimney smoking, with walkers and a cyclist on the towpath. */
function ukSouthEastFleetCanalV2(T) {
  const { add, U, R, rnd, mv } = T;
  const K = T.K;   // the rich nature kit (71-anim-uk-nature-kit.js); null only if that file is missing
  if (!K) return;
  // The hand-drawn art that was here is gone: the world scene fleet-canal-2-w3 (79-world-zzgallery.js) took these items over,
  // and the composed version below is the art when it does not. The stub is the art only without the scene engine.
  const LAT = 51.279, LON = -0.836;
  const scene = () => '';
  const place = 'fleet-canal', label = 'Basingstoke Canal', town = 'Fleet', kind = 'heritage', tags = ['canal', 'towpath', 'narrowboat'];
  const view = 1, originalSeason = 'summer';
  const reasons = { spring: 'Hawthorn blossom as a narrowboat chugs past', summer: 'Close alongside a passing narrowboat', autumn: 'Falling leaves and wood smoke on the towpath', winter: 'A narrowboat chugging past bare winter trees' };
  // The composed version (scene engine, 71-scene-uk-south-east-basingstoke-canal-fleet-2.js): the SAME items (ids, place, view and
  // season fields), drawn by the canvas renderer with the season by date and the live sky.
  const composed = typeof sceneItems === 'function' ? sceneItems('uk-south-east').find(it => it.id === 'fleet-canal-2') : null;
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const reason = reasons[season];
    add('hampshire', kind, { id: `${place}-${view + 1}${season !== originalSeason ? '-' + season : ''}`, label, site: `${label} — ${reason}`,
      colour: 'slate', mood: 'calm', tags: tags.concat(season),
      ukPlace: place, ukLocality: town, ukTown: town, ukView: 'close', viewReason: reason,
      ukSeason: season, season: [season], rich: true, liveSky: { lat: LAT, lon: LON },
      ...(composed ? { composed: true, full: true, scene: composed.scene, svg: (o = {}) => composed.svg(o.season || (o.sky && Number.isFinite(o.sky.ms)) ? o : Object.assign({}, o, { season })), reduced: 'static' } : { svg: (o = {}) => scene(season, o) }) });
  }
}
