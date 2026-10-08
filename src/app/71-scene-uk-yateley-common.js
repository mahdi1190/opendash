/* ============================================================
   SCENE ROWS uk / Yateley Common (archetype yateley-heath,
   70-scene-lib-area-yateley.js). One row per VIEW; the pack file
   72-anim-pack-uk-area-yateley.js makes four seasonal items of each.
   Views 1 to 4 keep the ids, views and captions of the earlier Yateley
   Common items; 5 to 7 are new spots. Coordinates are scene units
   (1600 x 900): hz the horizon, tx / tb the sandy ride's far and near x,
   px / pw the heath pond, sx / ss the lone veteran Scots pine.
     https://www.hants.gov.uk/thingstodo/countryside/walking/yateleycommon
   ============================================================ */
(function () {
  if (typeof sceneTableDefine !== 'function') return;
  sceneTableDefine('uk-yateley-common', {
    cols: ['id', 'place', 'n', 'view', 'orig', 'at', 'heading', 'hz', 'tx', 'tb', 'bend', 'px', 'pw', 'sx', 'ss', 'frame', 'features', 'rsp', 'rsu', 'rau', 'rwi'],
    lists: ['features'],
    rows: [
      ['yateley-common-1', 'yateley-common', 1, 'wide', 'summer', 'afternoon', 215, 500, 905, 700, 60, 420, 400, 716, 0.42, 'pine-birch', 'track|pond|cattle|aircraft|family',
        'Fresh heath shoots and flowering gorse', 'Flowering heather beside the sandy trail', 'Golden birches and dry heath seed heads', 'Frosted heath and a winter robin'],
      ['yateley-common-2', 'yateley-common', 2, 'close', 'summer', 'morning', 160, 470, 820, 830, 90, 0, 0, 1220, 0.36, 'birches', 'track|birches|cyclist|aircraft',
        'Birch catkins above the sandy path', 'Butterflies beneath the leafy birches', 'Falling leaves above the winding path', 'Bare birches above the pale sandy path'],
      ['yateley-common-3', 'yateley-common', 3, 'detail', 'autumn', 'afternoon', 250, 520, 1260, 1480, 40, 0, 0, 520, 0.44, 'pine-birch', 'track|log|cattle|aircraft',
        'New growth beside the fallen branch', 'Summer heather around the fallen branch', 'Autumn gorse beside the fallen branch', 'Snow over the heath and fallen branch'],
      ['yateley-common-4', 'yateley-common', 4, 'evening', 'summer', 'dusk', 290, 510, 700, 900, 70, 1180, 360, 860, 0.5, 'pines', 'track|pond|nightjar|deer',
        'Spring dusk across the heath', 'A summer dusk perch over the heath', 'Amber dusk over the open heath', 'Winter dusk over the frosted heath'],
      ['yateley-common-5', 'yateley-common', 5, 'airfield', 'summer', 'morning', 180, 530, 640, 560, 50, 0, 0, 1080, 0.4, 'birch-pine', 'track|cattle|aircraft|cyclist',
        'Light aircraft over the spring heath', 'A light aircraft low over the heath from Blackbushe', 'Bracken turning gold under the flight path', 'Frost on the heath under the flight path'],
      ['yateley-common-6', 'yateley-common', 6, 'pond', 'summer', 'afternoon', 120, 480, 0, 0, 0, 760, 980, 1250, 0.38, 'birches', 'pond|deer|aircraft',
        'Spring light on a heathland pond', 'Dragonflies over a heathland pond', 'Golden birches round a heathland pond', 'A still winter pond on the Common'],
      ['yateley-common-7', 'yateley-common', 7, 'ride', 'summer', 'dawn', 75, 490, 980, 760, 110, 0, 0, 420, 0.46, 'pine-birch', 'track|birches|cyclist|family|deer',
        'Spring dawn on the sandy ride', 'Early walkers on the sandy ride at dawn', 'Misty autumn dawn on the sandy ride', 'Frosty dawn on the sandy ride'],
    ],
  });
})();
