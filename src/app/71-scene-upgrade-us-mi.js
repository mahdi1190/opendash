/* ============================================================
   UPGRADE (GOLD, held at draft) of us-midwest/mi-mackinac-bridge (docs/dev/SCENE_ENGINE.md section 16)
   Written by hand after `node tools/anim-pack.mjs scene upgrade us-midwest/mi-mackinac-bridge --dry-run`.
   HELD AT DRAFT pending the American rebuild visual panel. When live, the app
   shows this composed scene in place of the hand-drawn art (kept
   as the item's legacySvg). The item keeps its identity: the id, key, place
   fields, label, site, tags and when come from the region entry
   (tests/scene-upgrades-live.test.mjs). After any change, re-check:
     node tools/anim-pack.mjs scene sheet us-midwest/mi-mackinac-bridge --compare --upgrades --times
     node tools/anim-pack.mjs scene lint us-midwest/mi-mackinac-bridge --upgrades --perf   (GOLD)
   Care: no signs or text, at most 8 tiny anonymous people, no crowds, no flags or emblems.
   ============================================================ */
(function () {
  if (typeof animRegionSceneUpgrade !== 'function') return;
  // The Straits of Mackinac from the shore west of the bridge, looking east at sunrise: the Mackinac Bridge striding
  // across the straits on its two ivory towers, the low wooded shores and the islands beyond, ferries and fishing
  // boats on the water in front of it, gulls, a cedar and a paper birch framing the shoreline path.
  const params = { id: 'mi', lat: 45.79, lon: -84.77, heading: 80, at: 'dawn', climate: 'temperate',
    kits: ['temperate', 'alpine', 'people', 'boats', 'birds', 'water'],
    // An offset view keeps both towers on wide screens and the nearer tower
    // inside a central phone crop, where the old centered span lost them both.
    landmarks: ['landmark.mackinac-bridge@800@190@front@0'], water: 'bay', horizon: 540,
    palette: { base: { water: ['#9ab8cc', '#4a7a98', '#1e4662'], quay: ['#40564a', '#2e4036'] } } };
  // the straits' boats, all in front of the bridge's waterline (566), scaled by depth
  const boat = (obj, y, back, speed, seed, offset, v) => ({ obj, layer: 'mid', path: back ? [[1820, y], [-220, y]] : [[-220, y], [1820, y]], speed, loop: 'loop', s: 1, sByY: [[566, 0.24], [732, 0.5]], seed, offset, flip: back, variant: v });
  const patch = {
    // the scene's own picks and mixes (8.6), so a new library object never moves them: pines and birches on the far
    // shores, meadow grass and wildflowers by the path, the path's lamps, gulls
    picks: { lamp: ['street.lamp'] },
    mix: { tree: { 'tree.us-mackinac-shore': 2, 'tree.us-loon-spruce': 1 }, ground: { 'plant.grass': 4, 'plant.wildflowers': .8, 'plant.reed': 1.2 }, shrub: { 'plant.hedge': 1 },
      boat: { 'boat.ferry': 1 }, bird: { 'bird.gull': 1, 'bird.herring-gull-flight': 1 } },
    // the archetype's one boat (behind the bridge's waterline) and its two frame trees are replaced by the scene's own
    // the far quay's tree row becomes a loose wooded shore (pines and birches in clumps)
    drop: { place: [1, 2], actors: [0], scatter: [0] },
    scatter: [
      { obj: { 'tree.us-mackinac-shore': 2, 'tree.us-loon-spruce': 1 }, layer: 'mid', seed: 15, area: { rect: [-140, 551, 1740, 563] }, maxH: 85, n: 18, minGap: 70, s: [0.24, 0.62], flip: 0.5, variant: [0, 1, 2, 3], tint: { col: '#6a8a9a', k: [0, 0.16] }, mask: { noise: { scale: 170, cut: 0.35 } }, anim: false, reflect: true },
    ],
    // the far shores: low wooded hills on the horizon (the north shore and the islands)
    ground: [
      { layer: 'horizon', d: 'M-160 546Q120 512 380 522T900 526Q1080 508 1240 518T1760 522V554H-160Z', fill: { lin: [[0, '@hills.0'], [1, '@hills.1']], x1: 0, y1: 508, x2: 0, y2: 554 } },
      // the near shore line over the archetype's straight quay: low and wooded, with an uneven top
      { layer: 'mid', d: 'M-160 551Q140 538 420 545T980 542T1760 547V568H-160Z', fill: { lin: [[0, '@quay.0'], [1, '@quay.1']], x1: 0, y1: 540, x2: 0, y2: 568 } },
    ],
    place: [
      { obj: 'tree.cedar', x: 30, y: 910, s: 1.7, layer: 'front', seed: 21, variant: 0, tint: ['#50665c', .24] },
      { obj: 'tree.us-mackinac-paper-birch', x: 1600, y: 912, s: 1.25, layer: 'front', seed: 22, flip: true, variant: 1 },
    ],
    actors: [boat('boat.ferry', 604, true, 9, 41, 0.2, 0), boat('boat.fishing-boat', 640, false, 7, 42, 0.62, 1), boat('boat.dinghy', 680, true, 6, 43, 0.4, 0), boat('boat.ferry', 714, false, 10, 44, 0.86, 1)],
  };
  animRegionSceneUpgrade('us', 'state:MI', {
    state: 'draft',
    archetype: 'skyline-water',
    landmarks: ['landmark.mackinac-bridge'],
    scene: () => {
      const d=sceneFromArchetype('skyline-water',params,patch),w=d.water[0];
      const reflection=Object.assign({},w,{shimmer:18,lightPath:false});
      let strips='';for(let j=0;j<19;j++){const y=w.y0+3+j*8.7,h=1.8+(j%4)*.75,x=350+(j%3)*19,len=900-(j%5)*31;strips+='M'+x+' '+y+'q'+len*.45+' -1.8 '+len+' .8v'+h+'q'+(-len*.53)+' 1.6 '+(-len)+' -.8Z';}
      reflection.d=strips;w.reflect=false;d.water.push(reflection);
      for(const q of d.scatter)if(q.obj&&q.obj['plant.shrub']){q.obj={'plant.hedge':1};q.n=4;q.s=[.27,.42];q.tint={col:'#485b52',k:[.16,.24]};}
      for(const q of d.scatter)if(q.obj&&q.obj['plant.grass']){q.obj={'plant.grass':3,'plant.reed':1.5,'plant.wildflowers':.8};q.tint={col:'#657566',k:[0,.24]};q.n=Math.round(q.n*.55);}
      const bridge=d.place.find(q=>q.obj==='landmark.mackinac-bridge');bridge.tint=['#3c5965',.08];
      for(const a of d.actors)a.tint=['#4c6269',.24];
      return d;
    },
  });
})();
