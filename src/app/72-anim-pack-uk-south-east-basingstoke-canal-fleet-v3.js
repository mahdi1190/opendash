// UK_SCENE_PART: uk-south-east/basingstoke-canal-fleet-v3
/* Basingstoke Canal at Fleet: a narrow, tree-lined cut, a gravel towpath and moored narrowboats.
     https://www.hart.gov.uk/sites/default/files/2023-04/Bas%20Canal%20appraisal%20and%20character.pdf
     https://www.hants.gov.uk/thingstodo/basingstokecanal/onthetowpath/walkingandcycling
   View 3 of 4 ('autumn', the wooded towpath), in all four seasons. One file per view
   (the others: 72-anim-pack-uk-south-east-basingstoke-canal-fleet-v1..v4.js). Drawn with the rich
   nature kit T.K (src/app/71-anim-uk-nature-kit.js) and its live light (K.live).
   Brief: between Fleet and Crookham the canal is a narrow, still, clear green channel (about
   12-13 m) in a tunnel of mature oak, alder and willow; the gravel towpath runs between the water
   and the wood, busy with walkers, dog walkers, joggers and cyclists; narrowboats moor along the
   offside under the trees, and a low brick arch road bridge (Crookham Road style) closes the
   reach, the bridge hole narrowing to one boat with the towpath passing under it.
   Here: on the towpath, canal on the right, looking south-west (heading 215) to the bridge.
   Keep every id, ukPlace, ukView, ukSeason and season unchanged so saved pins keep working. */
function ukSouthEastFleetCanalV3(T) {
  const { add, U, R, rnd, mv } = T;
  const K = T.K;   // the rich nature kit (71-anim-uk-nature-kit.js); null only if that file is missing
  if (!K) return;
  // The hand-drawn art that was here is gone: the world scene fleet-canal-3-w3 (79-world-zzgallery.js) took these items over,
  // and the composed version below is the art when it does not. The stub is the art only without the scene engine.
  const LAT = 51.28, LON = -0.84;
  const scene = () => '';
  const place = 'fleet-canal', label = 'Basingstoke Canal', town = 'Fleet', kind = 'heritage', tags = ['canal', 'towpath', 'narrowboat'];
  const reasons = {
    spring: 'Spring on the wooded towpath',
    summer: 'A summer afternoon on the towpath',
    autumn: 'Autumn on the wooded towpath',
    winter: 'A frosty towpath by the still canal',
  };
  // The composed version (scene engine, 71-scene-uk-south-east-basingstoke-canal-fleet-3.js): the SAME items (ids, place, view and
  // season fields), drawn by the canvas renderer with the season by date and the live sky.
  const composed = typeof sceneItems === 'function' ? sceneItems('uk-south-east').find(it => it.id === 'fleet-canal-3') : null;
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const reason = reasons[season];
    add('hampshire', kind, { id: `fleet-canal-3${season !== 'autumn' ? '-' + season : ''}`, label, site: `${label} — ${reason}`,
      colour: 'slate', mood: 'calm', tags: tags.concat(season),
      ukPlace: place, ukLocality: town, ukTown: town, ukView: 'autumn', viewReason: reason,
      ukSeason: season, season: [season], rich: true, liveSky: { lat: LAT, lon: LON },
      ...(composed ? { composed: true, full: true, scene: composed.scene, svg: (o = {}) => composed.svg(o.season || (o.sky && Number.isFinite(o.sky.ms)) ? o : Object.assign({}, o, { season })), reduced: 'static' } : { svg: (o = {}) => scene(season, o) }) });
  }
}
