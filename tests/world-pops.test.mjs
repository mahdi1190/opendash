// People that pop, slide, snap and shake (tools/lib/world/pops.mjs; docs/dev/SCENE_LESSONS.md section AE). The user (20 Oct): "people are
// changing size when they change movement directions", then "people are shaking about". Run: node --test tests/world-pops.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../tools/lib/world/convert.mjs';
import { popsTracker, worldPopsRun } from '../tools/lib/world/pops.mjs';
import { specOf } from '../tools/world.mjs';

const E = loadEngine();

/** A walker at 9 m turning from crossing the view (side) to coming toward the eye (front) over 1.5 s, drawn as the compositor scales it. */
function turningWalker(scale) {
  const spec = specOf(E, 'york-shambles-1-w3').spec, cam = E.worldHostWorld(spec, { season: 'summer' }).cam, frames = [];
  let prev = null;
  for (let i = 0; i <= 90; i++) {
    const t = i / 30, f = 90 + Math.min(1, Math.max(0, (t - 1) / 1.5)) * 90, x = 0.2 + t * 0.3, z = 9 - Math.max(0, t - 1) * 0.6;
    const vx = Math.sin(f * Math.PI / 180) * 1.2, vz = Math.cos(f * Math.PI / 180) * 1.2;
    const ent = { id: 'w', obj: 'person.walker', x, z, vx, vz, height: 1.7, variant: 0 };
    const v = E.worldViewOf(ent, cam, prev ? { prev: prev.view, prevMirror: prev.mirror } : undefined);
    prev = v;
    const P = E.sceneProject(cam, x, z, 0), s = scale(v);
    frames.push({ t, figs: [{ id: 'w', obj: 'person.walker', X: P.X, Y: P.Y, x, z, height: 1.7, view: v.view, mirror: v.mirror,
      draws: [{ o: v.obj, v: 0, season: 'summer~dry', flip: v.mirror, s, a: 1, blits: [{ part: '*', a: 1, M: [v.mirror ? -s : s, 0, 0, s, P.X, P.Y] }] }],
      agent: { vx, vz }, raw: null, anim: { clip: 'walk', rate: 1, k: 1, gait: null } }] });
  }
  return frames;
}
function run(frames) { const T = popsTracker(E, { fps: 30 }); for (const f of frames) T.frame(f.t, f.figs); return T.report(); }

test('the detector sees the size pop of a turn drawn at the views\' declared sizes, and none at one height from every side', () => {
  // as the engine drew it until 20 Oct: s = f / z x h / size[1] of the view object (person.walker 29 x 64, its views 30 x 80)
  const before = run(turningWalker(v => v.s / (v.norm || 1)));
  assert.ok(before.counts.swaps >= 2, 'the walker turns through its views (' + before.counts.swaps + ')');
  assert.ok(before.counts.swapPop >= 1, 'a change of view drawn a fifth smaller is a size pop');
  const w = before.swaps.find(x => x.pops);
  assert.ok(w && w.max > 0.15 && w.max < 0.3, `side -> q-front shrinks the figure 15 to 30 % (${w && w.max})`);
  // now: worldViewNorm draws each view at the height of its side art
  const after = run(turningWalker(v => v.s));
  assert.equal(after.counts.swapPop, 0, 'no change of view changes the drawn height by over 6 %');
  assert.equal(after.counts.sizePop, 0);
  for (const x of after.swaps) assert.ok(x.max < 0.03, `${x.pair}: ${x.max}`);
});

test('every directional view of the movers is drawn at its side object\'s height (worldViewNorm on exact outlines)', () => {
  for (const id of ['person.walker', 'person.jogger', 'person.dog-walker', 'person.family', 'animal.dog']) {
    const d = E.sceneObj(id), vw = d.views;
    for (const [name, o] of Object.entries(vw)) {
      if (typeof o !== 'string' || name === 'rear' || name === 'q' || !E.sceneObj(o)) continue;
      for (let v = 0; v < Math.min(d.variants || 1, 4); v++) {
        const a = E.worldArtBounds(id, v, 'summer~dry', '*'), b = E.worldArtBounds(o, v, 'summer~dry', '*'), k = E.worldViewNorm(id, o, v);
        const ha = (a[3] - a[1]) / d.size[1], hb = (b[3] - b[1]) / E.sceneObj(o).size[1] * k;
        assert.ok(Math.abs(hb / ha - 1) < 0.06, `${id} ${name} v${v}: drawn ${Math.round((hb / ha - 1) * 100)} % off the side's height`);
      }
    }
  }
});

test('a real scene (York, 40 s at 30 fps): no size pops, the bodies move every frame, the feet are planted side-on', () => {
  const r = worldPopsRun(E, specOf(E, 'york-shambles-1-w3').spec, { seconds: 40, fps: 30 });
  assert.ok(!r.error, r.error);
  assert.ok(r.personMinutes > 3, 'people drawn ' + r.personMinutes);
  assert.ok(r.counts.swaps > 0, 'views change');
  assert.equal(r.counts.swapPop, 0, 'no view change pops in size');
  assert.equal(r.counts.sizePop, 0);
  // the facing follows the way the body moves (the facing invariant, A5) through 4 degrees of play: the snaps left are walkers shuffling aside
  // (a sidestep at up to 0.9 m/s across their heading, the steering's), 1.65 a person-minute on York before 20 Oct and 0.7 after over 240 s
  assert.ok(r.perMin.headingSnap < 2, 'few facing snaps (' + r.perMin.headingSnap + ' a person-minute)');
  // until 20 Oct the runner's life left life.alpha unset: the records stood still one 30 Hz tick in two (stutter: 100 % of walking)
  assert.ok(r.stutterShare < 0.02, 'the bodies move every frame (stutter ' + r.stutterShare + ')');
  assert.ok(r.slideShare < 0.35, 'the planted foot stands (slide ' + r.slideShare + ')');
});
