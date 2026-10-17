// People carry an umbrella UP only while it rains (the user, 15 Oct: people carry umbrellas under a blue sky in York by day).
// The wardrobe of a figure said "umbrella up" for a whole season (autumn, winter), whatever the sky. The world engine now draws a
// person in the weather of the day: the form of a person is 'autumn~dry' or 'autumn~wet' (SCENE_LESSONS J); a wardrobe that is not
// told (the v2 scenes) keeps what its season says.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorld } from '../tools/lib/world/load.mjs';

const W = loadWorld(undefined, { extra: 'globalThis.__wfrRec = typeof _wfrRec === "function" ? _wfrRec : null;' });
const width = (id, v, form) => { const b = W.sceneObjShapes(id, v, form).box; return b[2] - b[0]; };
// an open umbrella is a dome over the head and the raised arm: the figure box is wider by it; a furled one is a stick at the side
const UP = [['person.walker', 4, 'autumn'], ['person.walker', 1, 'autumn'], ['person.commuter', 1, 'autumn'], ['person.commuter', 3, 'winter']];

test('dry: no umbrella is up (it is furled or not carried), in any season; wet: it is up', () => {
  for (const [id, v, se] of UP) {
    const dry = width(id, v, se + '~dry'), wet = width(id, v, se + '~wet');
    assert.ok(wet >= dry + 3, `${id} v${v} ${se}: wet ${wet} wide, dry ${dry}: an open umbrella is wider than a furled one`);
  }
});
test('a person who carries a furled umbrella opens it in the rain (a spring brolly)', () => {
  const dry = width('person.walker', 1, 'spring~dry'), wet = width('person.walker', 1, 'spring~wet');
  assert.ok(wet >= dry + 3, `spring v1: wet ${wet}, dry ${dry}`);
});
test('no suffix leaves the season in charge (the v2 scenes draw as they always did)', () => {
  const plain = width('person.walker', 4, 'autumn'), wet = width('person.walker', 4, 'autumn~wet');
  assert.equal(plain, wet, 'autumn without a weather is the old up-umbrella wardrobe');
  assert.equal(W.sceneObjShapes('person.walker', 3, 'summer').order.join(), W.sceneObjShapes('person.walker', 3, 'summer~dry').order.join());
});
test('only a person reads the weather: a tree keeps its plain season whatever the suffix', () => {
  const a = W.sceneObjShapes('tree.bank-oak', 0, 'summer'), b = W.sceneObjShapes('tree.bank-oak', 0, 'summer~wet');
  assert.equal(JSON.stringify(a.box), JSON.stringify(b.box));
  assert.equal(a.order.length, b.order.length);
});
test('the frame records a person in the day\'s weather and leaves everything else in its season', () => {
  assert.ok(W.sceneObj('person.walker'));
  const cam = W.sceneCamera({ camera: { eye: 1.7, fov: 64, horizon: 460, heading: 0 } });
  const rec = (obj, wet) => globalThis.__wfrRec({ id: 'x', obj, x: 0, z: 12, variant: 4, static: false, facing: 90 }, cam, { season: 'autumn', agent: true, wet });
  assert.equal(rec('person.walker', false).season, 'autumn~dry');
  assert.equal(rec('person.walker', true).season, 'autumn~wet');
  assert.equal(rec('person.walker', undefined).season, 'autumn', 'a record made without a light keeps the season');
  const dog = rec('animal.dog', true);
  if (dog) assert.equal(dog.season, 'autumn');
});
