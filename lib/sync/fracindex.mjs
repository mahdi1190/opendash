// lib/sync/fracindex.mjs - fractional positions for ordered lists in folder sync.
//
// A position is a base-36 digit string read as a fraction: "i" = 0.i, "i8" =
// 0.i8 (in base 36). Plain string comparison orders them, and there is always
// room between two positions, so moving one item writes ONE position and two
// devices that reorder different items both keep their moves.
//
//   keysBetween(lo, hi, n)   n increasing positions strictly between lo and hi
//                            (lo '' or null = the start, hi null = the end)
//   isPos(s)                 a valid position (no trailing '0', so equal
//                            fractions are always equal strings)
//
// Ties (two devices inserting at the same spot pick the same string) are
// broken by the item's key wherever lists are sorted (lib/sync/model.mjs).

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';
const B = 36n;
export const POS_RE = /^[0-9a-z]{0,199}[1-9a-z]$/;
export const isPos = (s) => typeof s === 'string' && POS_RE.test(s);

function toInt(s, len) {
  let v = 0n;
  for (let i = 0; i < len; i++) v = v * B + BigInt(i < s.length ? DIGITS.indexOf(s[i]) : 0);
  return v;
}
function toStr(v, len) {
  const out = new Array(len);
  for (let i = len - 1; i >= 0; i--) { out[i] = DIGITS[Number(v % B)]; v /= B; }
  return out.join('').replace(/0+$/, '');
}

/** n positions, evenly spread, strictly between lo and hi. */
export function keysBetween(lo, hi, n = 1) {
  lo = lo || '';
  if (hi != null && !(lo < hi)) throw new Error(`keysBetween: ${JSON.stringify(lo)} is not before ${JSON.stringify(hi)}`);
  if (n <= 0) return [];
  // Enough digits that the gap holds n+1 steps, and at least one more than
  // the longer bound (so the result is never one of the bounds).
  let len = Math.max(lo.length, hi ? hi.length : 0, 1);
  for (;;) {
    const L = toInt(lo, len);
    const H = hi == null ? B ** BigInt(len) : toInt(hi, len);
    const gap = H - L;
    if (gap > BigInt(n)) {
      const step = gap / BigInt(n + 1);
      const out = [];
      for (let i = 1; i <= n; i++) out.push(toStr(L + step * BigInt(i), len));
      return out;
    }
    len += 1;
  }
}
