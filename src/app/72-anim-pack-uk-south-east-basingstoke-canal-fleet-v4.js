// UK_SCENE_PART: uk-south-east/basingstoke-canal-fleet-v4
/* Basingstoke Canal at Fleet: a narrow, tree-lined cut, a gravel towpath and moored narrowboats.
     https://www.hart.gov.uk/sites/default/files/2023-04/Bas%20Canal%20appraisal%20and%20character.pdf
     https://www.hants.gov.uk/thingstodo/basingstokecanal
     https://canalplan.uk/place/y5i4 (Old Pondtail Bridge)
   View 4 of 4 (evening), drawn with the rich nature kit T.K (71-anim-uk-nature-kit.js).
   Brief: the canal (1794) runs along Fleet's northern edge between Pondtail Bridge (an old brick
   arch beside the newer road bridge) and Reading Road Wharf, a narrow cut about 12-13 m wide; the
   back gardens of Fleet houses run down to the offside, where boats moor; the gravel towpath runs
   between the water and a line of oak, birch and alder. This view: from the towpath near Pondtail,
   looking west-south-west along the cut into the evening sun, the brick arch ahead with the
   towpath passing under it, lit house and boat windows from real dusk.
   Live: sky, sun, moon (real phase), stars, light, reflections, lit windows and the bridge lamp
   from real dusk, all from K.live (the user's clock and location). */
function ukSouthEastFleetCanalV4(T) {
  const { add, U, R, rnd, mv } = T;
  const K = T.K;   // the rich nature kit (71-anim-uk-nature-kit.js); null only if that file is missing
  if (!K) return;
  // The hand-drawn art that was here is gone: the world scene fleet-canal-4-w3 (79-world-zzgallery.js) took these items over,
  // and the composed version below is the art when it does not. The stub is the art only without the scene engine.
  const LAT = 51.29, LON = -0.83;
  const scene = () => '';
  const place = 'fleet-canal', label = 'Basingstoke Canal', town = 'Fleet', kind = 'heritage', tags = ['canal', 'towpath', 'narrowboat'];
  const reasons = {
    spring: 'Cygnets and cow parsley on a spring evening towpath',
    summer: 'Lit cabin windows at dusk',
    autumn: 'Woodsmoke and falling leaves by Pondtail Bridge',
    winter: 'A frosty towpath and a chimney smoking at dusk',
  };
  // The composed version (scene engine, 71-scene-uk-south-east-basingstoke-canal-fleet-4.js): the SAME items (ids, place, view and
  // season fields), drawn by the canvas renderer with the season by date and the live sky.
  const composed = typeof sceneItems === 'function' ? sceneItems('uk-south-east').find(it => it.id === 'fleet-canal-4') : null;
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const reason = reasons[season];
    add('hampshire', kind, { id: `${place}-4${season !== 'summer' ? '-' + season : ''}`, label, site: `${label} — ${reason}`,
      colour: 'slate', mood: 'dreamy', tags: tags.concat(season),
      ukPlace: place, ukLocality: town, ukTown: town, ukView: 'evening', viewReason: reason,
      ukSeason: season, season: [season], rich: true, liveSky: { lat: LAT, lon: LON },
      ...(composed ? { composed: true, full: true, scene: composed.scene, svg: (o = {}) => composed.svg(o.season || (o.sky && Number.isFinite(o.sky.ms)) ? o : Object.assign({}, o, { season })), reduced: 'static' } : { svg: (o = {}) => scene(season, o) }) });
  }
}
