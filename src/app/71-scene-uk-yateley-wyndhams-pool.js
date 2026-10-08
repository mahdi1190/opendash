/* ============================================================
   SCENE ROWS uk / Wyndham's Pool (archetype yateley-pool,
   70-scene-lib-area-yateley.js): the wooded pond on Yateley Common,
   ringed by Scots pine and birch, with anglers' swims on the bank.
   Views 1 to 4 keep the ids, views and captions of the earlier items;
   5 and 6 are new. hz the far bank, wl the near shore, sx / ss the
   signature Scots pines on the far bank.
     https://www.hants.gov.uk/thingstodo/countryside/finder/yateleycommon
   ============================================================ */
(function () {
  if (typeof sceneTableDefine !== 'function') return;
  sceneTableDefine('uk-yateley-wyndhams-pool', {
    cols: ['id', 'place', 'n', 'view', 'orig', 'at', 'heading', 'hz', 'wl', 'px', 'sx', 'ss', 'frame', 'features', 'rsp', 'rsu', 'rau', 'rwi'],
    lists: ['features'],
    rows: [
      ['wyndhams-pool-1', 'wyndhams-pool', 1, 'wide', 'summer', 'afternoon', 20, 470, 720, 0, 1040, 0.36, 'birch-pine', 'anglers|busy',
        'New birch leaves above the spring pool', 'Leafy shade and open summer water', 'Golden birches above the wooded pool', 'Bare birches above winter water'],
      ['wyndhams-pool-2', 'wyndhams-pool', 2, 'close', 'summer', 'morning', 60, 430, 780, 140, 760, 0.32, 'pine-birch', 'kingfisher',
        'Spring waterbirds beside the reeds', 'Dragonflies above the near reeds', 'Falling leaves beside the near reeds', 'A robin beside the frost-lined reeds'],
      ['wyndhams-pool-3', 'wyndhams-pool', 3, 'detail', 'autumn', 'afternoon', 330, 450, 700, 260, 1220, 0.4, 'oak-pine', 'margin|kingfisher',
        'Catkins over the woodland margin', 'Summer waterbirds at the woodland margin', 'Autumn birches along the water', 'Snow over the frozen woodland pool'],
      ['wyndhams-pool-4', 'wyndhams-pool', 4, 'evening', 'summer', 'dusk', 290, 480, 730, 420, 900, 0.42, 'birch-pine', 'anglers',
        'Spring evening at the wooded pool', 'Warm evening water beneath the trees', 'Autumn evening at the wooded bank', 'Winter evening at the misty pool'],
      ['wyndhams-pool-5', 'wyndhams-pool', 5, 'dawn', 'summer', 'dawn', 100, 460, 740, 560, 620, 0.38, 'pine-birch', 'anglers|kingfisher',
        'Anglers at the spring pool at first light', 'Anglers at their swims as the sun comes up', 'An autumn dawn over the still pool', 'A frosty dawn at the anglers\' swims'],
      ['wyndhams-pool-6', 'wyndhams-pool', 6, 'far-bank', 'summer', 'golden', 200, 500, 760, 700, 420, 0.4, 'oak-pine', 'busy|margin',
        'Walkers on the far bank in spring', 'Golden light across the pool from the far bank', 'Autumn colour across the pool from the far bank', 'Winter light across the pool from the far bank'],
    ],
  });
})();
