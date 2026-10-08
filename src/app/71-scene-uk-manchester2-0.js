/* ============================================================
   COMPOSED SCENES uk / Manchester, second batch (docs/dev/SCENE_ENGINE.md 8.1, 8.2): one data row
   per scene, built by the 'mcr2-city' archetype (70-scene-lib-area-manchester2.js) and registered
   by 72-anim-pack-uk-area-manchester2.js. Each row: the item's place fields and caption, the
   archetype params (where it is, which way it looks, the landmarks, the ground, water, tram, the
   passers-by and the features). Four seasons by date and the live sky come from the engine
   (season 'auto', weather 'live'). None of these repeat the first batch's views
   (71-scene-uk-manchester-0.js): new places, or a known place from another side, time or weather.
   Lint and look:
     node tools/anim-pack.mjs scene lint --pack uk-area-manchester2 --perf
     node tools/anim-pack.mjs scene sheet --pack uk-area-manchester2 --contact
   Care: no text (the Chinatown panel is blank, the colour bands on the flats carry no letters),
   no club colours or marks at either stadium, people are tiny anonymous walkers.
   ============================================================ */
const UK_MANCHESTER2_SCENES = (function () {
  const P = (id, lat, lon, heading, landmarks, o) => Object.assign({ id, lat, lon, heading, landmarks }, o || {});
  const M = 'Manchester', S = 'Salford';
  return [
    // ---- Piccadilly Gardens and the trams ----
    { id: 'piccadilly-gardens', town: M, label: 'Piccadilly Gardens', kind: 'signature', colour: 'amber', tags: ['piccadilly', 'gardens', 'fountain', 'metrolink'], ukPlace: 'piccadilly-gardens', ukView: 'wide', reason: 'Fountains by the pavilion wall, a tram crossing the square',
      params: P('piccadilly-gardens', 53.4809, -2.2367, 200, ['landmark.mcr-piccadilly-pavilion@760@140', 'building.mill-red-brick@250@300@mid@-30@1', 'building.tower@1330@400@mid@-40@2'], { ground: 'square', tram: 'street', far: 'mixed', crowd: 'shoppers', features: ['tram2', 'photographer'], at: 'afternoon' }) },
    { id: 'piccadilly-trams', town: M, label: 'Piccadilly at dusk', kind: 'landmark', colour: 'amber', tags: ['piccadilly', 'metrolink', 'tram', 'evening'], ukPlace: 'piccadilly-gardens', ukView: 'evening', reason: 'Trams passing the gardens as the windows light up',
      params: P('piccadilly-trams', 53.4806, -2.2372, 60, ['landmark.mcr-piccadilly-pavilion@520@120', 'building.mcr-mill@1180@320@mid@-20@1', 'building.tower-glass@860@420@mid@-60@4'], { ground: 'square', tram: 'street', far: 'mixed', crowd: 'night', features: ['tram2'], at: 'dusk' }) },
    // ---- the John Rylands, in the rain ----
    { id: 'john-rylands-rain', town: M, label: 'John Rylands Library in the rain', kind: 'landmark', colour: 'slate', tags: ['library', 'gothic', 'deansgate', 'rain'], ukPlace: 'john-rylands', ukView: 'rain', reason: 'Wet Deansgate paving under the sandstone front',
      params: P('john-rylands-rain', 53.4805, -2.2490, 60, ['landmark.john-rylands@820@440', 'building.tower-glass@1380@380@far@-40@6'], { ground: 'street', far: 'brick', crowd: 'walkers', features: ['rain', 'buses', 'cyclists'], at: 'morning' }) },
    // ---- the Cathedral and the Corn Exchange ----
    { id: 'manchester-cathedral', town: M, label: 'Manchester Cathedral', kind: 'signature', colour: 'red', tags: ['cathedral', 'gothic', 'church', 'gardens'], ukPlace: 'manchester-cathedral', ukView: 'wide', reason: 'The battlemented tower and long nave from Cathedral Gardens',
      params: P('manchester-cathedral', 53.4853, -2.2447, 200, ['landmark.mcr-cathedral@780@400'], { ground: 'square', far: 'mixed', crowd: 'walkers', features: ['bench'], at: 'afternoon' }) },
    { id: 'cathedral-dusk', town: M, label: 'Cathedral at dusk', kind: 'heritage', colour: 'red', tags: ['cathedral', 'gothic', 'floodlit', 'evening'], ukPlace: 'manchester-cathedral', ukView: 'evening', reason: 'The floodlit tower with the Corn Exchange dome beyond',
      params: P('cathedral-dusk', 53.4852, -2.2452, 150, ['landmark.mcr-cathedral@660@340', 'landmark.mcr-corn-exchange@1340@260@far@-40'], { ground: 'square', far: 'mixed', crowd: 'night', at: 'dusk' }) },
    { id: 'corn-exchange', town: M, label: 'The Corn Exchange', kind: 'landmark', colour: 'amber', tags: ['corn exchange', 'edwardian', 'dome', 'cafes'], ukPlace: 'corn-exchange', ukView: 'wide', reason: 'The copper dome on the curved corner, cafe tables below',
      params: P('corn-exchange', 53.4846, -2.2437, 110, ['landmark.mcr-corn-exchange@760@340', 'landmark.mcr-cathedral@1400@260@far@-60'], { ground: 'square', far: 'mixed', crowd: 'shoppers', features: ['cafe'], at: 'golden' }) },
    // ---- Chinatown ----
    { id: 'chinatown-arch', town: M, label: 'Chinatown arch', kind: 'signature', colour: 'red', tags: ['chinatown', 'arch', 'lanterns', 'faulkner street'], ukPlace: 'manchester-chinatown', ukView: 'wide', reason: 'The red and gold archway with lanterns strung along the street',
      params: P('chinatown-arch', 53.4789, -2.2393, 170, ['landmark.mcr-chinatown-arch@800@330', 'building.mcr-mill@1360@300@mid@-40@1@flip'], { ground: 'street', far: 'brick', crowd: 'walkers', features: ['lanterns'], at: 'afternoon' }) },
    { id: 'chinatown-night', town: M, label: 'Chinatown at night', kind: 'tradition', colour: 'red', tags: ['chinatown', 'arch', 'lanterns', 'night'], ukPlace: 'manchester-chinatown', ukView: 'night', reason: 'Lanterns glowing under the archway after dark',
      params: P('chinatown-night', 53.4790, -2.2391, 350, ['landmark.mcr-chinatown-arch@780@360'], { ground: 'street', far: 'brick', crowd: 'night', features: ['lanterns'], at: 'night' }) },
    // ---- Canal Street ----
    { id: 'canal-street', town: M, label: 'Canal Street', kind: 'signature', colour: 'violet', tags: ['canal street', 'village', 'canal', 'evening'], ukPlace: 'canal-street', ukView: 'evening', reason: 'Bars along the Rochdale Canal under rainbow bunting',
      params: P('canal-street', 53.4767, -2.2360, 130, ['building.warehouse-canal@420@300@mid@0@0', 'building.warehouse-canal@1180@320@mid@-10@1@flip'], { ground: 'towpath', water: 'canal', far: 'brick', crowd: 'night', features: ['bunting'], horizon: 470, at: 'dusk' }) },
    { id: 'canal-street-morning', town: M, label: 'Canal Street in the morning', kind: 'heritage', colour: 'violet', tags: ['canal street', 'village', 'canal', 'narrowboat'], ukPlace: 'canal-street', ukView: 'morning', reason: 'A quiet towpath and a narrowboat passing the warehouses',
      params: P('canal-street-morning', 53.4772, -2.2354, 310, ['building.warehouse-canal@520@310@mid@0@2', 'building.warehouse-canal@1080@300@mid@0@0@flip', 'building.tower@1420@380@far@-30@3'], { ground: 'towpath', water: 'canal', far: 'brick', crowd: 'walkers', features: ['bunting'], reseed: 3, horizon: 470, at: 'morning' }) },
    // ---- Ancoats and New Islington ----
    { id: 'new-islington-marina', town: M, label: 'New Islington marina', kind: 'signature', colour: 'green', tags: ['new islington', 'marina', 'ancoats', 'flats'], ukPlace: 'new-islington', ukView: 'wide', reason: 'Moored narrowboats below the stacked flats',
      params: P('new-islington-marina', 53.4820, -2.2235, 20, ['landmark.mcr-chips@760@250', 'building.mcr-mill@1360@300@far@-30@0'], { ground: 'towpath', water: 'marina', far: 'mixed', crowd: 'park', horizon: 470, at: 'morning' }) },
    { id: 'new-islington-evening', town: M, label: 'New Islington at golden hour', kind: 'landmark', colour: 'green', tags: ['new islington', 'marina', 'canal', 'evening'], ukPlace: 'new-islington', ukView: 'golden', reason: 'Low sun on the marina and the mills beyond',
      params: P('new-islington-evening', 53.4818, -2.2228, 300, ['landmark.mcr-chips@1040@220', 'building.mill-red-brick@380@320@mid@-10@1'], { ground: 'towpath', water: 'marina', far: 'brick', crowd: 'walkers', horizon: 470, at: 'golden' }) },
    { id: 'ancoats-redhill-street', town: M, label: 'Ancoats mills, Redhill Street', kind: 'heritage', colour: 'red', tags: ['ancoats', 'mills', 'canal', 'industry'], ukPlace: 'ancoats', ukView: 'golden', reason: 'The long mill walls glowing over the Rochdale Canal',
      params: P('ancoats-redhill-street', 53.4842, -2.2290, 240, ['building.mill-red-brick@440@340@mid@0@0', 'building.mill-red-brick@1160@330@mid@0@2@flip'], { ground: 'towpath', water: 'canal', far: 'brick', crowd: 'walkers', horizon: 470, at: 'golden' }) },
    { id: 'rain-on-red-brick', town: M, label: 'Rain on red brick', kind: 'heritage', colour: 'red', tags: ['northern quarter', 'warehouses', 'rain', 'brick'], ukPlace: 'northern-quarter', ukView: 'rain', reason: 'Wet streets reflecting the warehouse windows at dusk',
      params: P('rain-on-red-brick', 53.4835, -2.2340, 330, ['building.mcr-mill@420@330@mid@0@1', 'building.mill-red-brick@1140@330@mid@0@3@flip', 'building.mcr-mill@800@260@far@-40@0'], { ground: 'street', far: 'brick', crowd: 'night', features: ['rain', 'buses'], at: 'dusk' }) },
    // ---- Spinningfields ----
    { id: 'spinningfields', town: M, label: 'Spinningfields', kind: 'landmark', colour: 'blue', tags: ['spinningfields', 'glass', 'offices', 'lawn'], ukPlace: 'spinningfields', ukView: 'wide', reason: 'Glass offices around the lawn and its cafe tables',
      params: P('spinningfields', 53.4801, -2.2531, 20, ['building.tower-glass@480@460@mid@-20@3', 'building.media-block@820@320@mid@0@1', 'building.tower-glass@1160@520@mid@-30@7'], { ground: 'square', far: 'glass', crowd: 'walkers', features: ['cafe', 'cyclists'], at: 'day' }) },
    // ---- the stadia (generic: no crests, no club colours) ----
    { id: 'eastlands-match-day', town: M, label: 'Match day at Eastlands', kind: 'tradition', colour: 'blue', tags: ['football', 'stadium', 'match day', 'eastlands'], ukPlace: 'eastlands-stadium', ukView: 'wide', reason: 'Fans crossing the plaza below the ring of masts',
      params: P('eastlands-match-day', 53.4831, -2.2004, 200, ['landmark.mcr-etihad@800@300'], { ground: 'square', tram: 'street', far: 'mixed', crowd: 'fans', at: 'afternoon' }) },
    { id: 'eastlands-evening', town: M, label: 'Evening kick-off at Eastlands', kind: 'tradition', colour: 'blue', tags: ['football', 'stadium', 'floodlights', 'metrolink'], ukPlace: 'eastlands-stadium', ukView: 'evening', reason: 'Floodlights over the bowl as the trams arrive',
      params: P('eastlands-evening', 53.4836, -2.2010, 160, ['landmark.mcr-etihad@760@270'], { ground: 'square', tram: 'street', far: 'mixed', crowd: 'fans', features: ['tram2'], reseed: 6, at: 'dusk' }) },
    { id: 'old-trafford-match-day', town: M, label: 'Match day at Old Trafford', kind: 'tradition', colour: 'red', tags: ['football', 'stadium', 'match day', 'trafford'], ukPlace: 'old-trafford', ukView: 'golden', reason: 'Crowds walking up to the tall stand at golden hour',
      params: P('old-trafford-match-day', 53.4628, -2.2900, 300, ['landmark.mcr-old-trafford@800@300'], { ground: 'square', far: 'mixed', crowd: 'fans', features: ['buses'], at: 'golden' }) },
    // ---- the Quays ----
    { id: 'mediacity-night', town: S, label: 'MediaCity at night', kind: 'landmark', colour: 'blue', tags: ['salford', 'quays', 'night', 'footbridge'], ukPlace: 'mediacity', ukView: 'night', reason: 'Lit studios and the footbridge mirrored in the dock',
      params: P('mediacity-night', 53.4725, -2.2978, 240, ['structure.mediacity-footbridge@800@230@mid@60', 'building.media-block@1300@340@far@-20@2'], { ground: 'quay', water: 'quays', far: 'mixed', crowd: 'night', reseed: 5, horizon: 470, at: 'night' }) },
    { id: 'lowry-footbridge', town: S, label: 'The Lowry and the Quays footbridge', kind: 'landmark', colour: 'blue', tags: ['salford', 'quays', 'theatre', 'footbridge'], ukPlace: 'salford-quays', ukView: 'evening', reason: 'The steel drum of the Lowry beside the footbridge at dusk',
      params: P('lowry-footbridge', 53.4712, -2.2950, 260, ['landmark.salford-lowry@1080@300', 'structure.mediacity-footbridge@440@190@mid@60'], { ground: 'quay', water: 'quays', far: 'glass', crowd: 'walkers', features: ['gulls'], horizon: 470, at: 'dusk' }) },
    // ---- Heaton Park ----
    { id: 'heaton-park', town: M, label: 'Heaton Park', kind: 'signature', colour: 'green', tags: ['heaton park', 'hall', 'parkland', 'lawns'], ukPlace: 'heaton-park', ukView: 'wide', reason: 'The neoclassical hall above its lawns',
      params: P('heaton-park', 53.5355, -2.2525, 340, ['landmark.heaton-hall@800@230'], { ground: 'park', far: 'trees', crowd: 'park', features: ['bench'], at: 'morning' }) },
    { id: 'heaton-park-lake', town: M, label: 'Heaton Park boating lake', kind: 'heritage', colour: 'green', tags: ['heaton park', 'lake', 'rowing', 'parkland'], ukPlace: 'heaton-park', ukView: 'lake', reason: 'Rowing boats and swans on the lake below the hall',
      params: P('heaton-park-lake', 53.5330, -2.2480, 300, ['landmark.heaton-hall@1120@190@mid@-50'], { ground: 'park', water: 'lake', far: 'trees', crowd: 'park', horizon: 470, at: 'afternoon' }) },
    // ---- students: Oxford Road and Fallowfield ----
    { id: 'oxford-road', town: M, label: 'Oxford Road', kind: 'tradition', colour: 'violet', tags: ['oxford road', 'university', 'students', 'buses'], ukPlace: 'oxford-road', ukView: 'wide', reason: 'Students, bikes and buses on the university mile',
      params: P('oxford-road', 53.4655, -2.2335, 180, ['building.terrace-victorian@420@300@mid@0@2', 'landmark.whitworth-hall@1180@300@mid@-30'], { ground: 'street', far: 'brick', crowd: 'students', features: ['buses', 'cyclists'], at: 'morning' }) },
    { id: 'fallowfield', town: M, label: 'Fallowfield', kind: 'tradition', colour: 'violet', tags: ['fallowfield', 'students', 'terraces', 'halls'], ukPlace: 'fallowfield', ukView: 'golden', reason: 'Terraced streets below the halls tower, students heading home',
      params: P('fallowfield', 53.4440, -2.2195, 200, ['building.terrace-northern@400@170@mid@0@1', 'building.terrace-northern@1000@170@mid@0@3@flip', 'landmark.mcr-owens-park-tower@1360@380@far@-30'], { ground: 'street', far: 'brick', crowd: 'students', features: ['cyclists'], at: 'golden' }) },
    // ---- the Arndale and Market Street ----
    { id: 'market-street', town: M, label: 'Market Street', kind: 'landmark', colour: 'amber', tags: ['market street', 'arndale', 'shopping', 'tram'], ukPlace: 'market-street', ukView: 'wide', reason: 'Shoppers on the pedestrian street by the Arndale',
      params: P('market-street', 53.4826, -2.2412, 90, ['building.shopfront@280@330@mid@0@1', 'building.tower-glass@1080@420@mid@-20@5', 'building.shopfront@1400@330@mid@0@4@flip'], { ground: 'square', tram: 'street', far: 'brick', crowd: 'shoppers', features: ['photographer'], at: 'afternoon' }) },
    // ---- the Science and Industry Museum ----
    { id: 'science-industry-museum', town: M, label: 'Science and Industry Museum', kind: 'heritage', colour: 'slate', tags: ['museum', 'railway', 'steam', 'castlefield'], ukPlace: 'science-industry-museum', ukView: 'wide', reason: 'A heritage engine steaming past the 1830 station',
      params: P('science-industry-museum', 53.4770, -2.2545, 190, ['landmark.mcr-sim-station@760@220'], { ground: 'square', far: 'brick', crowd: 'walkers', features: ['steam'], at: 'noon' }) },
  ];
})();
