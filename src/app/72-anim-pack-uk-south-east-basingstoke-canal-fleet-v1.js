// UK_SCENE_PART: uk-south-east/basingstoke-canal-fleet-v1
/* Basingstoke Canal at Fleet: a narrow, tree-lined cut, a gravel towpath and moored narrowboats.
     https://www.hart.gov.uk/sites/default/files/2023-04/Bas%20Canal%20appraisal%20and%20character.pdf
     https://www.hants.gov.uk/thingstodo/basingstokecanal/onthetowpath/walkingandcycling
     https://basingstoke-canal.org.uk/boating/
   View 1 of 4 (wide): one file per view (the others: 72-anim-pack-uk-south-east-basingstoke-canal-fleet-v1..v4.js).
   Drawn with the rich nature kit T.K (src/app/71-anim-uk-nature-kit.js) and its live light (K.live).
   Keep every id, ukPlace, ukView, ukSeason and season unchanged so saved pins and the rotation keep working.

   Brief: the canal (opened 1794, restored and reopened 1991) crosses Fleet on its long lock-free
   summit pound between Pondtail Bridges and Reading Road Wharf. It is a narrow cut, not a lake:
   about 12-13 m of still, clear green water (two narrowboats side by side with room to pass),
   a 2.5-3 m gravel towpath between the water and a hedge or tree line, oak, alder, willow and
   birch leaning over both banks, Fleet's back gardens running down to the offside, and low
   brick arch road bridges (Reading Road, Pondtail) where the bridge hole narrows to one boat and
   the towpath passes under. Boats moor on the towpath side at Reading Road Wharf.
   Here: from the parapet of Reading Road bridge, looking west-south-west (heading 240) straight
   down the cut: moored boats at the wharf below on the left, garden fences, houses and boats on
   the offside, the towpath with walkers and a cyclist, and the next brick bridge far down the reach. */
function ukSouthEastFleetCanalV1(T) {
  const { add, U, R, rnd, mv } = T;
  const K = T.K;   // the rich nature kit (71-anim-uk-nature-kit.js); null only if that file is missing
  if (!K) return;
  // The hand-drawn art that was here is gone: the world scene fleet-canal-1-w3 (79-world-zzgallery.js) took these items over,
  // and the composed version below is the art when it does not. The stub is the art only without the scene engine.
  const LAT = 51.28, LON = -0.84;
  const scene = () => '';
  const place = 'fleet-canal', label = 'Basingstoke Canal', town = 'Fleet', kind = 'heritage', tags = ['canal', 'towpath', 'narrowboat'];
  const reasons = {
    spring: 'Cow parsley and hawthorn along the towpath',
    summer: 'A narrowboat below the tree line',
    autumn: 'Golden leaves on the cut at the bridge',
    winter: 'Stove smoke over the winter canal',
  };
  // The composed version (scene engine, 71-scene-uk-south-east-basingstoke-canal-fleet-1.js): the SAME items (ids, place, view and
  // season fields), drawn by the canvas renderer with the season by date and the live sky.
  const composed = typeof sceneItems === 'function' ? sceneItems('uk-south-east').find(it => it.id === 'fleet-canal-1') : null;
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const reason = reasons[season];
    add('hampshire', kind, { id: `${place}-1${season !== 'summer' ? '-' + season : ''}`, label, site: `${label} — ${reason}`,
      colour: 'slate', mood: 'calm', tags: tags.concat(season),
      ukPlace: place, ukLocality: town, ukTown: town, ukView: 'wide', viewReason: reason,
      ukSeason: season, season: [season], rich: true, liveSky: { lat: LAT, lon: LON },
      ...(composed ? { composed: true, full: true, scene: composed.scene, svg: (o = {}) => composed.svg(o.season || (o.sky && Number.isFinite(o.sky.ms)) ? o : Object.assign({}, o, { season })), reduced: 'static' } : { svg: (o = {}) => scene(season, o) }) });
  }
}
