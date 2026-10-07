import fs from 'node:fs';
const W = 'C:/tmp/cc-work/', OUT = 'C:/tmp/objects-staging/coast-country/';
const banners = {
  buildings: ['buildings', 'Coast and countryside buildings: a lighthouse, a row of beach huts, an oast\n   house, a windmill (smock, tower and post) and a thatched cottage. Generic\n   designs, no names, liveries or lettering. Front elevations lit from the\n   LEFT; windows light at real dusk (glow \'window\'); roofs carry snow in\n   winter and the grass at the foot follows the season. Anchor: the ground\n   at the middle of the front.'],
  structures: ['structures', 'Coast and countryside structures: a timber groyne, a dry stone wall and a\n   five-bar field gate. Anchor: the ground at the middle.'],
  ground: ['ground', 'Coast and countryside ground cover: a sand and shingle beach strip and\n   round hay bales. Anchor: the ground at the middle.'],
  rocks: ['rocks', 'Chalk cliffs: white chalk with flint bands, a turf cap that follows the\n   season, fallen blocks at the foot. Anchor: the beach at the middle.'],
  birds: ['birds', 'Herring gulls: standing (with a winter-streaked head in autumn and winter)\n   and flying. FACING RIGHT. Anchor: the feet (standing), the body centre\n   (flying).'],
  boats: ['boats', 'A sailing dinghy and an inshore fishing boat. FACING RIGHT (the bow on the\n   right). No sail numbers, names or registration letters. Anchor: the\n   waterline at the middle.'],
  animals: ['animals', 'Sheep and New Forest ponies, FACING RIGHT, lit from the LEFT. Anchor: the\n   feet on the ground. Fleece and coats follow the season.'],
  plants: ['plants', 'A field hedgerow of hawthorn and bramble: blossom in spring, bramble\n   flowers in summer, blackberries and haws in autumn, bare twigs in winter.\n   Anchor: the ground at the middle.'],
  vehicles: ['vehicles', 'A farm tractor, FACING RIGHT, no maker\'s marks. Head and work lamps light\n   at real dusk. Anchor: the ground under the middle.'],
};
const header = fs.readFileSync(W + '_header.txt', 'utf8');
for (const [k, [cat, txt]] of Object.entries(banners)) {
  if (!fs.existsSync(W + '_' + k + '.body')) continue;
  const body = fs.readFileSync(W + '_' + k + '.body', 'utf8');
  const src = `/* ============================================================\n   SCENE LIBRARY: ${cat}, coast-country kit (docs/dev/SCENE_ENGINE.md, section 2).\n   PURE: sceneObjDefine calls only, built lazily per (variant, season).\n\n   ${txt}\n   ============================================================ */\n` + header + '\n' + body + '})();\n';
  fs.writeFileSync(OUT + `70-scene-lib-${k}-coast-country.js`, src);
  console.log('wrote', k);
}
