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
  const w = typeof _gw !== 'undefined' && _gw && !!(_gw.moving || (_gw.keys && _gw.keys.size) || (_gw.path && _gw.path.length));
  if (w) S.walkAt = now;
  return now - S.walkAt < 700;
}
/** Milliseconds a background bake may use now (0: wait). cap: the most this painter wants in one slice.
 *  A share of the clock, not a fixed few milliseconds a frame: painters may use about 40% of the time while you walk and 70%
 *  standing, in slices of at most 8 ms walking (12 standing), so every slice is a short task and the frames always get the rest,
 *  however slow each frame is (a slow graphics card drew few frames, and a fixed amount a frame left the ground unpainted). */
function gardenBakeRoom(cap) {
  const S = _gbbState(), now = performance.now(), walking = gardenBakeWalking();
  const rate = walking ? .4 : .7, burst = walking ? 8 : 12;
  if (!(S.tAt > 0)) { S.tAt = now; S.tokens = burst; }
  S.tokens = Math.min(burst, S.tokens + (now - S.tAt) * rate); S.tAt = now;
  return Math.max(0, Math.min(cap || burst, S.tokens));
}
function gardenBakeSpent(ms) { const S = _gbbState(); S.tokens = (S.tokens || 0) - Math.max(0, ms || 0); if (S.tokens < -40) S.tokens = -40; }
