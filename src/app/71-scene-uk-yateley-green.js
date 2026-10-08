/* ============================================================
   SCENE ROWS uk / Yateley Green and the village (archetype
   yateley-green, 70-scene-lib-area-yateley.js): the open green and
   its pond, oaks and chestnuts, benches and lamps, St Peter's church
   (timber tower and spire) and the cottages at Church End.
   Views 1 to 4 keep the ids, views and captions of the earlier Yateley
   Green items; green 5 and the village views are new. cx / cs / clayer
   place the church, px / pw the pond.
     https://yateley-tc.gov.uk/our-services/open-spaces/
   ============================================================ */
(function () {
  if (typeof sceneTableDefine !== 'function') return;
  sceneTableDefine('uk-yateley-green', {
    cols: ['id', 'place', 'label', 'n', 'view', 'orig', 'at', 'heading', 'hz', 'cx', 'cs', 'clayer', 'px', 'pw', 'features', 'rsp', 'rsu', 'rau', 'rwi'],
    lists: ['features'],
    rows: [
      ['yateley-green-1', 'yateley-green', 'Yateley Green', 1, 'wide', 'summer', 'afternoon', 100, 470, 1150, 0.78, 'far', 800, 900, 'pond',
        'Spring blossom around the green pond', 'The pond within the summer green', 'Golden leaves around the green pond', 'Bare birches around the green pond'],
      ['yateley-green-2', 'yateley-green', 'Yateley Green', 2, 'close', 'summer', 'morning', 70, 440, 330, 0.78, 'far', 860, 1300, 'pond',
        'Spring flowers along the pond margin', 'Summer insects across the pond margin', 'Autumn reeds along the water margin', 'Frosted reeds and winter waterbirds'],
      ['yateley-green-3', 'yateley-green', 'Yateley Green', 3, 'detail', 'autumn', 'afternoon', 140, 490, 640, 0.78, 'far', 1220, 520, 'pond|birches',
        'Fresh birches beside the open green', 'Leafy shade beside the open green', 'Autumn shade beside the open green', 'Snow around the frozen green pond'],
      ['yateley-green-4', 'yateley-green', 'Yateley Green', 4, 'evening', 'summer', 'dusk', 260, 480, 1000, 0.78, 'far', 640, 700, 'pond|birches|lamps',
        'Spring dusk beneath the birches', 'A summer evening beneath the birches', 'Autumn dusk beneath the birches', 'Winter dusk beneath the bare branches'],
      ['yateley-green-5', 'yateley-green', 'Yateley Green', 5, 'church', 'summer', 'afternoon', 80, 500, 820, 1.1, 'mid', 0, 0, 'lamps',
        'St Peter\'s across the spring green', 'St Peter\'s church across the summer green', 'St Peter\'s beyond the autumn oaks', 'St Peter\'s across the frosted green'],
      ['yateley-village-1', 'yateley-village', 'Yateley village', 1, 'lane', 'summer', 'golden', 120, 490, 900, 0.9, 'far', 0, 0, 'village|lamps',
        'Spring blossom along the village lane', 'Golden light on the cottages at Church End', 'Autumn leaves along the village lane', 'A winter afternoon at Church End'],
      ['yateley-village-2', 'yateley-village', 'Yateley village', 2, 'evening', 'summer', 'dusk', 230, 480, 560, 0.84, 'far', 1180, 560, 'village|lamps|pond',
        'Lamps coming on in the spring village', 'Lamplight and the church at Church End', 'An autumn evening in the village', 'A winter evening in the lamplit village'],
    ],
  });
})();
