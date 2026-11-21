/* One shared bake budget for every painter that bakes in the background (rules 8 and 16).
 * The ground's chunks, the soft and far layers, the sharper sprites, the standing things' queue, the water and the woods each
 * kept their own few milliseconds, on their own timers. Together, while you walked into new ground, they ran back to back and
 * no frame got in between: a second or more of slices with the picture frozen (vf-perf, CPU profile of a real-key tour).
 * Now each asks gardenBakeRoom() first and tells gardenBakeSpent() what it used: a share of the clock, smaller while you
 * walk, in short slices. */
var _gbb = null;   // (frame: frames drawn, kept for a look at the frame rate; tokens: the time painters may still use)
function _gbbState() {
  if (_gbb) return _gbb;
  const S = _gbb = { frame: 0, at: 0, used: 0, usedFrame: -1, lastFree: 0, walkAt: -1e9 };
  const loop = () => { S.frame++; S.at = performance.now(); try { requestAnimationFrame(loop); } catch (e) { /* no frames: the fallback below */ } };
  try { requestAnimationFrame(loop); } catch (e) { /* none */ }
  return S;
}
/** Is the player walking now, or did they stop only a moment ago (a stop between two key presses is still a walk)? */
function gardenBakeWalking() {
  const S = _gbbState(), now = performance.now();
  let w = typeof _gw !== 'undefined' && _gw && !!(_gw.moving || (_gw.keys && _gw.keys.size) || (_gw.path && _gw.path.length));
  // (n-move) a friend walking on your screen is a walk too: their figure is moved and drawn every frame, so the painters take the smaller
  // slices (a friend who had just come in watched the host walk with 50-60 ms frames: the bake's standing slices on top of the walker)
  if (!w && typeof _gll !== 'undefined' && _gll && _gll.actors && _gll.actors.size) for (const A of _gll.actors.values()) if (A && !A.me && A.moving && (typeof _gwInView !== 'function' || _gwInView(A.x, A.y, 1.5))) { w = true; break; }
  if (w) S.walkAt = now;
  return now - S.walkAt < 700;
}
/** Milliseconds a background bake may use now (0: wait). cap: the most this painter wants in one slice.
 *  A share of the clock, not a fixed few milliseconds a frame: painters may use about 40% of the time while you walk and 70%
 *  standing, in slices of at most 8 ms walking (12 standing), so every slice is a short task and the frames always get the rest,
 *  however slow each frame is (a slow graphics card drew few frames, and a fixed amount a frame left the ground unpainted). */
function gardenBakeRoom(cap, low) {
  const S = _gbbState(), now = performance.now(), walking = gardenBakeWalking();
  const rate = walking ? .35 : .7, burst = walking ? 8 : 12;
  if (!(S.tAt > 0)) { S.tAt = now; S.tokens = burst; }
  S.tokens = Math.min(burst, S.tokens + (now - S.tAt) * rate); S.tAt = now;
  // low: work that can wait (the margin round the screen, a soft copy, a sharper sprite, a prebake): it only takes time that the
  // bare ground on the screen has left, so after a repaint the screen fills in first, whatever layer it belongs to
  if (low && S.tokens < burst * .6) return 0;
  // (vf-perf, 2) inside a frame's step that has already taken 14 ms (a sync, the land drawn again), nothing more this frame
  if (S.inStep && now - S.stepAt > 14) return 0;
  let room = Math.min(cap || burst, S.tokens);
  // and no more than 6 ms between two drawn frames while you walk, 12 standing (a measured tour: more, and frames went missing),
  // unless no frame has come for a quarter second (a hidden page): then a slice now and then, so the work still ends
  // (standing too, 12 ms: a tour after a level-up showed a second of bake slices with no frame drawn between them)
  { const per = walking ? 6 : 12; if (S.usedFrame !== S.frame) { S.usedFrame = S.frame; S.used = 0; } if (now - S.at > 250) { if (now - S.lastFree < 120) return 0; S.lastFree = now; room = Math.min(room, per); } else room = Math.min(room, per - S.used); }
  return Math.max(0, room);
}
function gardenBakeSpent(ms) { const S = _gbbState(); ms = Math.max(0, ms || 0); S.tokens = (S.tokens || 0) - ms; if (S.tokens < -40) S.tokens = -40; if (S.usedFrame !== S.frame) { S.usedFrame = S.frame; S.used = 0; } S.used += ms; }
