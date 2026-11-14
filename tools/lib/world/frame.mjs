// Frame-relative placement for the scene factory (docs/dev/SCENE_FACTORY.md 3). PURE maths, no engine: the v3 camera stands at the
// origin looking along +z (x to the right, metres), and projects like sceneProject (70-scene-1ground.js):
//     f = 800 / tan(fov / 2),   X = 800 + f x / z,   Y = horizon + f (eye - h) / z        (a 1600 x 900 frame)
// so a framing tree, a landmark on a third or a walker on the near band is placed by WHERE IT SHOULD APPEAR, solved against the
// frustum, and a scene never puts its framing outside the view (the raw-metre trap: trees at x +-7 m, z 6 m lie outside a 64 degree
// view; the solver then moved them and the fill added its own bough).
//
//   frameCam(camera)                      -> { eye, fov, horizon, f, dMin }   (dMin: the nearest ground in view, at the frame's foot)
//   project(cam, x, z, h)                 -> { X, Y, k }                     (k: screen units a metre at that depth)
//   ground(cam, X, Y)                     -> { x, z } | null                 the ground point under a screen point (flat ground)
//   xAt(cam, X, z)                        -> x of the screen column X at depth z
//   at(cam, want)                         -> [x, z]: want is one of
//        { bearing, dist }                  degrees off the view axis (negative = left) and metres along the ground
//        { third: 'left'|'right'|'centre', z }     on a vertical third at depth z (z from { band } when omitted)
//        { screen: [X, Y] }                 the ground under a screen point
//        { frame: 'left'|'right', z, w, show }    a framing element w metres wide whose inner `show` share (default 0.55) is in frame
//        { band: 'near'|'mid'|'far', third? } the middle of a depth band on a third
//   bands(cam)                            -> { near: [z0, z1], mid: [z0, z1], far: [z0, z1] }: the depth bands of the frame (the critic's)
//   shown(cam, x, z, w, h)                -> { X0, X1, Y0, Y1, share }: the screen box and the share of its width inside the frame
//   along(cam, from, to, n)               -> n points of a leading line from a near screen point to a far one, on the ground
//   leadingLine(cam, path)                -> { meets, startX, endX, endY, rises }: does a ground path run from the frame's foot into the vista
const r1 = (v) => Math.round(v * 10) / 10;
const DEG = Math.PI / 180;

export function frameCam(c = {}) {
  const eye = Number.isFinite(c.eye) ? c.eye : 1.65, fov = Number.isFinite(c.fov) ? c.fov : 66, horizon = Number.isFinite(c.horizon) ? c.horizon : 470;
  const f = 800 / Math.tan(fov * DEG / 2);
  return { eye, fov, horizon, f, dMin: f * eye / Math.max(1, 900 - horizon) };
}
export function project(cam, x, z, h = 0) { const d = Math.max(0.01, z), k = cam.f / d; return { X: 800 + k * x, Y: cam.horizon + k * (cam.eye - h), k }; }
export function ground(cam, X, Y) { if (!(Y > cam.horizon + 1e-6)) return null; const z = cam.f * cam.eye / (Y - cam.horizon); return { x: (X - 800) * z / cam.f, z }; }
export function xAt(cam, X, z) { return (X - 800) * z / cam.f; }
/** The depth bands of the frame: near is the foot of the frame to 15 m (or 3x the nearest ground), mid to 80 m, far beyond (the critic's bands). */
export function bands(cam) { const n1 = Math.max(15, cam.dMin * 3); return { near: [cam.dMin, n1], mid: [n1, 80], far: [80, 400] }; }
const THIRD = { left: 1600 / 3, centre: 800, center: 800, right: 3200 / 3 };

export function at(cam, w) {
  if (Array.isArray(w)) return w;
  if (w.screen) { const g = ground(cam, w.screen[0], w.screen[1]); return g ? [r1(g.x), r1(g.z)] : null; }
  if (Number.isFinite(w.bearing) && Number.isFinite(w.dist)) return [r1(Math.sin(w.bearing * DEG) * w.dist), r1(Math.cos(w.bearing * DEG) * w.dist)];
  const B = bands(cam);
  let z = Number.isFinite(w.z) ? w.z : null;
  if (z == null && w.band) { const b = B[w.band] || B.mid; z = w.band === 'far' ? b[0] * 1.6 : Math.sqrt(b[0] * b[1]); }
  if (w.frame) {
    // a framing element: its inner `show` share inside the frame, the rest cut by the edge (never wholly in, never wholly out);
    // or (reach) its inner edge reaches that share of the frame's width in from its side (a near canopy overhanging the view)
    z = z == null ? Math.max(cam.dMin * 1.3, 4) : z;
    const width = Number.isFinite(w.w) ? w.w : 6, show = Number.isFinite(w.show) ? w.show : 0.55, half = xAt(cam, 1600, z);
    if (Number.isFinite(w.reach)) { const xi = xAt(cam, 1600 * (1 - w.reach), z) + width / 2; return [r1(w.frame === 'left' ? -xi : xi), r1(z)]; }
    const cx = half + width * (0.5 - show);   // the right edge at x = half; the element's centre so `show` of it lies left of the edge
    return [r1(w.frame === 'left' ? -cx : cx), r1(z)];
  }
  if (w.third) { z = z == null ? 30 : z; return [r1(xAt(cam, THIRD[w.third] || 800, z)), r1(z)]; }
  return [0, r1(z == null ? 20 : z)];
}
export function shown(cam, x, z, w = 1, h = 1) {
  const p = project(cam, x, z, 0), X0 = p.X - p.k * w / 2, X1 = p.X + p.k * w / 2;
  const share = Math.max(0, Math.min(1600, X1) - Math.max(0, X0)) / Math.max(1e-6, X1 - X0);
  return { X0, X1, Y0: p.Y - p.k * h, Y1: p.Y, share };
}
/** n points of a ground line from screen point a to screen point b (both below the horizon), evenly spaced in depth. */
export function along(cam, a, b, n = 6) {
  const A = ground(cam, a[0], a[1]), B = ground(cam, b[0], b[1]);
  if (!A || !B) return [];
  const out = [];
  for (let i = 0; i < n; i++) { const t = i / (n - 1), z = A.z * Math.pow(B.z / A.z, t), x = A.x + (B.x - A.x) * (z - A.z) / (B.z - A.z || 1); out.push([r1(x), r1(z)]); }
  return out;
}
/** Does a ground path lead the eye: it starts in the bottom fifth of the frame and ends near the horizon within the middle 70 %. */
export function leadingLine(cam, path) {
  if (!Array.isArray(path) || path.length < 2) return { meets: false };
  const pts = path.filter(p => p[1] > 0.5).map(p => project(cam, p[0], p[1], 0));
  if (pts.length < 2) return { meets: false };
  const first = pts[0], last = pts[pts.length - 1];
  const startsLow = first.Y > 900 - 180 || pts.some(p => p.Y > 900 - 180);
  const endsDeep = last.Y < cam.horizon + (900 - cam.horizon) * 0.35 && last.X > 1600 * 0.15 && last.X < 1600 * 0.85;
  return { meets: startsLow && endsDeep, startX: Math.round(first.X), startY: Math.round(first.Y), endX: Math.round(last.X), endY: Math.round(last.Y), rises: Math.round(first.Y - last.Y) };
}
