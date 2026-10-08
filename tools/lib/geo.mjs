// Geodesy for the scene tools (docs/dev/SCENE_ENGINE_V2.md 17.3 and 18.2; builder E). Node >= 20, no dependencies, pure.
//
//   enuOf(lat0, lon0)                       -> { toLocal(lat, lon) -> [east, north], toLatLon(east, north) -> [lat, lon] }   metres,
//                                              equirectangular about (lat0, lon0): east = (lon - lon0) * cos(lat0) * 111320,
//                                              north = (lat - lat0) * 110540 (V2 17.3; good to a few metres over 2 km)
//   groundOf({ lat, lon, heading })         -> { toGround(lat, lon) -> [x, d], fromGround(x, d) -> [lat, lon], fromLocal, toLocal }
//                                              camera ground metres: x to the right of the view axis, d forward along it
//   haversine(lat1, lon1, lat2, lon2)       -> metres on the sphere (R = 6371 km)
//   destination(lat, lon, bearing, metres)  -> [lat, lon] (great circle)
//   wedgeBBox(cam, range, { fov, pad })     -> [south, west, north, east]: the view wedge's bounding box (V2 17.2), rounded outward to 1e-4 deg
//   circleBBox(lat, lon, radius)            -> [south, west, north, east]
//   wgs84ToOsgb36(lat, lon, h)              -> [lat, lon, h]   the OS 7-parameter Helmert (ETRS89 = WGS84 here); about 5 m from OSTN15
//   osgb36ToGrid(lat, lon)                  -> [easting, northing]   Transverse Mercator on Airy 1830 (the British National Grid)
//   wgs84ToBng(lat, lon)                    -> [easting, northing]
//   gridRef(e, n, digits)                   -> 'SK 1278 8361' (the letters of the 100 km square)
// Coordinates in arrays are [lat, lon] (degrees) or [x, d] / [east, north] (metres).

export const R_EARTH = 6371000;
export const M_PER_DEG_LAT = 110540, M_PER_DEG_LON = 111320;
const RAD = Math.PI / 180;

export function enuOf(lat0, lon0) {
  const kx = Math.cos(lat0 * RAD) * M_PER_DEG_LON, ky = M_PER_DEG_LAT;
  return {
    lat0, lon0,
    toLocal: (lat, lon) => [(lon - lon0) * kx, (lat - lat0) * ky],
    toLatLon: (e, n) => [lat0 + n / ky, lon0 + e / kx],
  };
}

/** Camera ground coordinates: heading h (compass degrees) turns east/north into x (right) and d (forward). */
export function groundOf({ lat, lon, heading = 0 }) {
  const enu = enuOf(lat, lon), s = Math.sin(heading * RAD), c = Math.cos(heading * RAD);
  const fromLocal = (e, n) => [e * c - n * s, e * s + n * c];
  const toLocal = (x, d) => [x * c + d * s, -x * s + d * c];
  return {
    enu, heading,
    fromLocal, toLocal,
    toGround: (la, lo) => { const [e, n] = enu.toLocal(la, lo); return fromLocal(e, n); },
    fromGround: (x, d) => { const [e, n] = toLocal(x, d); return enu.toLatLon(e, n); },
  };
}

export function haversine(lat1, lon1, lat2, lon2) {
  const p1 = lat1 * RAD, p2 = lat2 * RAD, dp = p2 - p1, dl = (lon2 - lon1) * RAD;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function destination(lat, lon, bearing, metres) {
  const p1 = lat * RAD, l1 = lon * RAD, b = bearing * RAD, dr = metres / R_EARTH;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(dr) + Math.cos(p1) * Math.sin(dr) * Math.cos(b));
  const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(dr) * Math.cos(p1), Math.cos(dr) - Math.sin(p1) * Math.sin(p2));
  return [p2 / RAD, ((l2 / RAD + 540) % 360) - 180];
}

const out4 = (v, up) => (up ? Math.ceil(v * 1e4) : Math.floor(v * 1e4)) / 1e4;
/** The bounding box of the view wedge: the camera, plus `range` along the heading, widened by the fov and 20 % (V2 17.2), plus `pad` metres. */
export function wedgeBBox(cam, range, { fov = cam.fov || 66, pad = 40 } = {}) {
  const g = groundOf(cam), t = Math.tan(Math.min(89, fov / 2) * RAD) * 1.2;
  const pts = [[-pad, -pad], [pad, -pad], [-range * t - pad, range + pad], [range * t + pad, range + pad], [0, range + pad]].map(([x, d]) => g.fromGround(x, d));
  return [out4(Math.min(...pts.map(p => p[0])), false), out4(Math.min(...pts.map(p => p[1])), false), out4(Math.max(...pts.map(p => p[0])), true), out4(Math.max(...pts.map(p => p[1])), true)];
}
export function circleBBox(lat, lon, radius) {
  const enu = enuOf(lat, lon), [s, w] = enu.toLatLon(-radius, -radius), [n, e] = enu.toLatLon(radius, radius);
  return [out4(s, false), out4(w, false), out4(n, true), out4(e, true)];
}

/* ---------------------------------------------------------------------------------------------
   The British National Grid (OS "A guide to coordinate systems in Great Britain")
   --------------------------------------------------------------------------------------------- */
const WGS84 = { a: 6378137, b: 6356752.3142 };
const AIRY = { a: 6377563.396, b: 6356256.909 };
const HELMERT = { tx: -446.448, ty: 125.157, tz: -542.060, s: 20.4894e-6, rx: -0.1502, ry: -0.2470, rz: -0.8421 };   // WGS84 -> OSGB36; rotations in arc seconds

function toCartesian(lat, lon, h, { a, b }) {
  const e2 = 1 - (b * b) / (a * a), p = lat * RAD, l = lon * RAD, sp = Math.sin(p);
  const nu = a / Math.sqrt(1 - e2 * sp * sp);
  return [(nu + h) * Math.cos(p) * Math.cos(l), (nu + h) * Math.cos(p) * Math.sin(l), ((1 - e2) * nu + h) * sp];
}
function fromCartesian([x, y, z], { a, b }) {
  const e2 = 1 - (b * b) / (a * a), p = Math.hypot(x, y);
  let lat = Math.atan2(z, p * (1 - e2)), nu = a;
  for (let i = 0; i < 10; i++) { nu = a / Math.sqrt(1 - e2 * Math.sin(lat) ** 2); const next = Math.atan2(z + e2 * nu * Math.sin(lat), p); if (Math.abs(next - lat) < 1e-13) { lat = next; break; } lat = next; }
  const h = p / Math.cos(lat) - nu;
  return [lat / RAD, Math.atan2(y, x) / RAD, h];
}
export function wgs84ToOsgb36(lat, lon, h = 0) {
  const [x, y, z] = toCartesian(lat, lon, h, WGS84), sec = RAD / 3600;
  const { tx, ty, tz, s } = HELMERT, rx = HELMERT.rx * sec, ry = HELMERT.ry * sec, rz = HELMERT.rz * sec;
  const x2 = tx + (1 + s) * x - rz * y + ry * z;
  const y2 = ty + rz * x + (1 + s) * y - rx * z;
  const z2 = tz - ry * x + rx * y + (1 + s) * z;
  return fromCartesian([x2, y2, z2], AIRY);
}
export function osgb36ToGrid(lat, lon) {
  const { a, b } = AIRY, F0 = 0.9996012717, p0 = 49 * RAD, l0 = -2 * RAD, N0 = -100000, E0 = 400000;
  const e2 = 1 - (b * b) / (a * a), n = (a - b) / (a + b), n2 = n * n, n3 = n2 * n;
  const p = lat * RAD, l = lon * RAD, sp = Math.sin(p), cp = Math.cos(p), tp = Math.tan(p);
  const nu = a * F0 / Math.sqrt(1 - e2 * sp * sp), rho = a * F0 * (1 - e2) / Math.pow(1 - e2 * sp * sp, 1.5), eta2 = nu / rho - 1;
  const Ma = (1 + n + (5 / 4) * n2 + (5 / 4) * n3) * (p - p0);
  const Mb = (3 * n + 3 * n2 + (21 / 8) * n3) * Math.sin(p - p0) * Math.cos(p + p0);
  const Mc = ((15 / 8) * n2 + (15 / 8) * n3) * Math.sin(2 * (p - p0)) * Math.cos(2 * (p + p0));
  const Md = (35 / 24) * n3 * Math.sin(3 * (p - p0)) * Math.cos(3 * (p + p0));
  const M = b * F0 * (Ma - Mb + Mc - Md);
  const I = M + N0, II = (nu / 2) * sp * cp, III = (nu / 24) * sp * cp ** 3 * (5 - tp * tp + 9 * eta2), IIIA = (nu / 720) * sp * cp ** 5 * (61 - 58 * tp * tp + tp ** 4);
  const IV = nu * cp, V = (nu / 6) * cp ** 3 * (nu / rho - tp * tp), VI = (nu / 120) * cp ** 5 * (5 - 18 * tp * tp + tp ** 4 + 14 * eta2 - 58 * tp * tp * eta2);
  const dl = l - l0;
  return [E0 + IV * dl + V * dl ** 3 + VI * dl ** 5, I + II * dl ** 2 + III * dl ** 4 + IIIA * dl ** 6];
}
export function wgs84ToBng(lat, lon) { const [p, l] = wgs84ToOsgb36(lat, lon, 0); return osgb36ToGrid(p, l); }

/** A grid reference with the two letters of the 100 km square: gridRef(412780, 383610, 8) -> 'SK 1278 8361'. */
export function gridRef(e, n, digits = 10) {
  const e100 = Math.floor(e / 100000), n100 = Math.floor(n / 100000);
  if (e100 < 0 || e100 > 6 || n100 < 0 || n100 > 12) return null;
  let l1 = (19 - n100) - (19 - n100) % 5 + Math.floor((e100 + 10) / 5), l2 = (19 - n100) * 5 % 25 + e100 % 5;
  if (l1 > 7) l1++; if (l2 > 7) l2++;
  const letters = String.fromCharCode(l1 + 65, l2 + 65), k = digits / 2;
  const f = (v) => String(Math.floor((v % 100000) / 10 ** (5 - k))).padStart(k, '0');
  return `${letters} ${f(e)} ${f(n)}`;
}
