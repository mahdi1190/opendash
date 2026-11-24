/* ============================================================
   TEXAS FULL-SCREEN SCENES (the Texas pack's big art). PURE classic script: it only defines
   animTexasScenes() and animTexasSceneCss(), which 72-anim-pack-texas.js reads when it
   registers the pack (so there is one "Texas" pack in the gallery). Drawn like the UK
   Hampshire scenes (docs/dev/UK_PACK.md, "Full-viewport scenes"): 1600 x 900 user units,
   sliced to fill any screen (item.full), layered: a sky gradient and its light, far / mid /
   near layers that drift at different speeds, and ambient life. Colours are painted; the dark
   theme or a tod-dusk / tod-night class lays an evening grade over them and lights the
   windows and lamps (.tx-tint, .tx-lit, .tx-star in animTexasSceneCss). Motion is
   transform and opacity only; the still frame (reduced motion) is the scene at rest.
   Each scene returns the inside of the svg (<= ANIM_FULL_ITEM_MAX_BYTES, 32 KB).
     statewide   hill-country bluebonnets, a West Texas sunset, the Gulf coast at sunrise
     city        Fort Worth stockyards, Dallas, Houston liftoff, Austin Capitol walk, the Alamo, El Paso
   ============================================================ */
function animTexasScenes() {
  // The hand-drawn art of these scenes is gone: every one has a live composed upgrade (71-scene-upgrade-texas-*.js),
  // which is what the app draws. The entries stay so each item keeps its id, label, site, tags and season.
  const S = [];
  const add = (o) => S.push(o);

  /* ---------- statewide: hill-country bluebonnets ---------- */
  add({ id: 'hill-country-bluebonnets', label: 'Bluebonnets in the Hill Country', site: 'Bluebonnets in the Hill Country', colour: 'indigo', mood: 'calm', season: ['spring'], texasKind: 'scene', tags: ['bluebonnet', 'hill country', 'spring'],
    svg: () => '' });

  /* ---------- statewide: a West Texas sunset ---------- */
  add({ id: 'west-texas-sunset', label: 'Sunset over West Texas', site: 'Sunset over West Texas', colour: 'orange', mood: 'dreamy', texasKind: 'scene', tags: ['west texas', 'sunset', 'windmill', 'mesa'],
    svg: () => '' });

  /* ---------- statewide: the Gulf coast at sunrise ---------- */
  add({ id: 'gulf-coast-sunrise', label: 'Sunrise on the Gulf Coast', site: 'Sunrise on the Gulf Coast', colour: 'teal', mood: 'calm', texasKind: 'scene', tags: ['gulf', 'coast', 'galveston', 'pier', 'sunrise'],
    svg: () => '' });

  /* ---------- Fort Worth: the Stockyards at dusk ---------- */
  add({ id: 'fort-worth-stockyards-scene', label: 'The Stockyards at dusk, Fort Worth', site: 'The Stockyards at dusk', colour: 'red', mood: 'cheerful', texasKind: 'scene', tags: ['fort worth', 'stockyards', 'longhorns', 'cattle drive'],
    svg: () => '' });

  /* ---------- Dallas: the skyline at golden hour ---------- */
  add({ id: 'dallas-skyline', label: 'The skyline at golden hour, Dallas', site: 'The skyline at golden hour', colour: 'blue', mood: 'focused', texasKind: 'scene', tags: ['dallas', 'skyline', 'reunion tower', 'bridge'],
    svg: () => '' });

  /* ---------- Houston: liftoff on the Gulf prairie ---------- */
  add({ id: 'houston-liftoff-scene', label: 'Liftoff at dawn, Houston', site: 'Liftoff at dawn', colour: 'blue', mood: 'energetic', texasKind: 'scene', tags: ['houston', 'space', 'rocket', 'nasa'],
    svg: () => '' });

  /* ---------- Austin: the walk up to the Capitol ---------- */
  add({ id: 'austin-capitol-walk', label: 'The walk up to the Capitol, Austin', site: 'The walk up to the Capitol', colour: 'orange', mood: 'calm', texasKind: 'scene', tags: ['austin', 'capitol', 'live oaks', 'statues', 'path'],
    svg: () => '' });

  /* ---------- San Antonio: the Alamo in the morning ---------- */
  add({ id: 'alamo-morning', label: 'The Alamo in the morning light, San Antonio', site: 'The Alamo in the morning light', colour: 'amber', mood: 'calm', texasKind: 'scene', tags: ['san antonio', 'alamo', 'mission', 'plaza'],
    svg: () => '' });

  /* ---------- El Paso: the star on the Franklin Mountains ---------- */
  add({ id: 'el-paso-star-scene', label: 'The star on the mountain, El Paso', site: 'The star on the Franklin Mountains', colour: 'amber', mood: 'proud', texasKind: 'scene', tags: ['el paso', 'franklin mountains', 'star', 'desert'],
    svg: () => '' });

  return S;
}
/** The css the scenes need (the Texas pack adds it to its own). */
function animTexasSceneCss() {
  const A = '.anim-scene .x-';
  return [
    '.anim-scene.ap-full .tx-tint { fill: #4a4f94; mix-blend-mode: multiply; opacity: 0; pointer-events: none; }',
    '.anim-scene.ap-full .tx-lit { fill: #ffd27a; stroke: #ffd27a; opacity: 0; }',
    '.anim-scene.ap-full .tx-lamps { opacity: 0; }',
    '.anim-scene.ap-full .tx-star { opacity: 0; }',
    '[data-theme="dark"] .anim-scene.ap-full .tx-tint, .anim-scene.ap-full.tod-dusk .tx-tint { opacity: .6; }',
    '.anim-scene.ap-full.tod-night .tx-tint { opacity: .85; }',
    '[data-theme="dark"] .anim-scene.ap-full :is(.tx-lit, .tx-lamps), .anim-scene.ap-full.tod-dusk :is(.tx-lit, .tx-lamps), .anim-scene.ap-full.tod-night :is(.tx-lit, .tx-lamps) { opacity: .92; }',
    '[data-theme="dark"] .anim-scene.ap-full .tx-star, .anim-scene.ap-full.tod-night .tx-star { opacity: .8; }',
    'html .anim-scene.ap-full:is(.tod-day, .tod-dawn) :is(.tx-tint, .tx-lit, .tx-lamps, .tx-star) { opacity: 0; }',
    A + 'txdrift { --an: ap-txdrift; --ad: 46s; }', A + 'txpar { --an: ap-txdrift; --ad: 30s; }', A + 'txglide { --an: ap-txglide; --ad: 18s; --ae: linear; }',
    A + 'txflap { --an: ap-txflap; --ad: .7s; }', A + 'txshim { --an: ap-txshim; --ad: 3s; }', A + 'txpuff { --an: ap-txpuff; --ad: 3.6s; --ae: cubic-bezier(.2, .6, .4, 1); }',
    A + 'txmove { --an: ap-txmove; --ad: 24s; --ae: linear; }', A + 'txbob { --an: ap-txbob; --ad: 3s; }', A + 'txglow { --an: ap-txglow; --ad: 6s; }',
    A + 'txrise { --an: ap-txrise; --ad: 9s; --ai: 1; --ae: cubic-bezier(.2, .7, .3, 1); }', A + 'txsway { --an: ap-txsway; --ad: 4s; }', A + 'txsway2 { --an: ap-txsway2; --ad: 6s; }',
    A + 'txspin { --an: ap-txspin; --ad: 40s; --ae: linear; }', A + 'txflag { --an: ap-txflag; --ad: 2s; }', A + 'txflicker { --an: ap-txflicker; --ad: .22s; }',
    A + 'txlift { --an: ap-txlift; --ad: 14s; --ai: 1; --ae: cubic-bezier(.5, 0, .7, .6); }', A + 'txfall { --an: ap-txfall; --ad: 10s; --ae: linear; }',
    '@keyframes ap-txdrift { 0%, 100% { transform: translateX(calc(var(--dx, 80px) * -1)); } 50% { transform: translateX(var(--dx, 80px)); } }',
    '@keyframes ap-txglide { 0% { transform: translate(calc(var(--dx, 500px) * -.5), 0); opacity: 0; } 10%, 85% { opacity: 1; } 100% { transform: translate(calc(var(--dx, 500px) * .5), var(--dy, -30px)); opacity: 0; } }',
    '@keyframes ap-txflap { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(-.35); } }',
    '@keyframes ap-txshim { 0%, 100% { opacity: .1; transform: translateX(-8px); } 50% { opacity: .9; transform: translateX(8px); } }',
    '@keyframes ap-txpuff { 0% { transform: translate(0, 0) scale(.35); opacity: 0; } 12% { opacity: .95; } 100% { transform: translate(var(--dx, -120px), var(--dy, -260px)) scale(var(--sc, 2.6)); opacity: 0; } }',
    '@keyframes ap-txmove { from { transform: translateX(calc(var(--dx, 400px) * -.5)); } to { transform: translateX(calc(var(--dx, 400px) * .5)); } }',
    '@keyframes ap-txbob { 0%, 100% { transform: translateY(calc(var(--dy, 5px) * -1)); } 50% { transform: translateY(var(--dy, 5px)); } }',
    '@keyframes ap-txglow { 0%, 100% { opacity: .82; transform: scale(.97); } 50% { opacity: 1; transform: scale(1.04); } }',
    '@keyframes ap-txrise { from { transform: translateY(90px); opacity: .6; } to { transform: none; opacity: 1; } }',
    '@keyframes ap-txsway { 0%, 100% { transform: skewX(-3deg); } 50% { transform: skewX(3deg); } }',
    '@keyframes ap-txsway2 { 0%, 100% { transform: rotate(-.8deg); } 50% { transform: rotate(.8deg); } }',
    '@keyframes ap-txspin { to { transform: rotate(1turn); } }',
    '@keyframes ap-txflag { 0%, 100% { transform: skewY(0) scaleX(1); } 50% { transform: skewY(-4deg) scaleX(.94); } }',
    '@keyframes ap-txflicker { 0%, 100% { transform: scaleY(1); opacity: .95; } 50% { transform: scaleY(1.18); opacity: .8; } }',
    '@keyframes ap-txlift { from { transform: translateY(0); } to { transform: translateY(-620px); } }',
    '@keyframes ap-txfall { 0% { transform: translate(0, -20px) rotate(0); opacity: 0; } 10%, 85% { opacity: 1; } 100% { transform: translate(var(--dx, 80px), 640px) rotate(380deg); opacity: 0; } }',
  ].join('\n');
}
