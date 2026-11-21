/* One shared budget a frame for every painter that bakes in the background (rules 8 and 16).
 * The ground's chunks, the soft and far layers, the sharper sprites, the standing things' queue, the water and the woods each
 * kept their own few milliseconds, on their own timers. Together, while you walked into new ground, they ran back to back and
 * no frame got in between: a second or more of slices with the picture frozen (vf-perf, CPU profile of a real-key tour).
 * Now each asks gardenBakeRoom() first and tells gardenBakeSpent() what it used: a few milliseconds a frame in all while you
 * walk, more when you stand still, and nothing more until the next frame has been drawn. */
var _gbb = null;
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
/** Milliseconds a background bake may use now (0: wait for the next frame). cap: the most this painter wants. */
function gardenBakeRoom(cap) {
  const S = _gbbState(), now = performance.now();
  if (S.usedFrame !== S.frame) { S.usedFrame = S.frame; S.used = 0; }
  const most = gardenBakeWalking() ? 5 : 11, want = Math.min(cap || most, most);
  // no frame for a while (a hidden page, or a frame still being drawn): one slice a quarter second, so the work still ends
  if (now - S.at > 250) { if (now - S.lastFree < 250) return 0; S.lastFree = now; return want; }
  return Math.max(0, Math.min(want, most - S.used));
}
function gardenBakeSpent(ms) { const S = _gbbState(); if (S.usedFrame !== S.frame) { S.usedFrame = S.frame; S.used = 0; } S.used += Math.max(0, ms || 0); }
