// lib/sync/hlc.mjs (hybrid logical clock) and lib/sync/fracindex.mjs
// (fractional positions) for folder sync.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClock, decodeHlc, encodeHlc, isHlc } from '../lib/sync/hlc.mjs';
import { keysBetween, isPos } from '../lib/sync/fracindex.mjs';

const A = 'aaaaaaaaaaaaaaaa', B = 'bbbbbbbbbbbbbbbb';

test('timestamps sort as strings, by time then counter then device', () => {
  const t = [encodeHlc(5, 0, B), encodeHlc(5, 1, A), encodeHlc(4, 9, B), encodeHlc(5, 0, A), encodeHlc(1e12, 0, A)];
  assert.deepEqual([...t].sort(), [encodeHlc(4, 9, B), encodeHlc(5, 0, A), encodeHlc(5, 0, B), encodeHlc(5, 1, A), encodeHlc(1e12, 0, A)]);
  for (const h of t) assert.ok(isHlc(h));
  assert.deepEqual(decodeHlc(encodeHlc(1792771200000, 7, A)), { wall: 1792771200000, counter: 7, deviceId: A });
  assert.equal(decodeHlc('not a clock'), null);
});

test('tick is strictly increasing even when the wall clock stands still or goes back', () => {
  let now = 1000;
  const c = createClock({ deviceId: A, now: () => now });
  const a = c.tick(), b = c.tick();
  now = 500;
  const d = c.tick();
  assert.ok(a < b && b < d);
  assert.equal(decodeHlc(d).wall, 1000);
});

test('observe moves past a remote timestamp, so a later local change sorts after it', () => {
  let now = 1000;
  const c = createClock({ deviceId: A, now: () => now });
  const remote = encodeHlc(5000, 3, B);   // the other computer's clock is 4 s ahead
  c.observe(remote);
  const mine = c.tick();
  assert.ok(mine > remote, `${mine} > ${remote}`);
});

test('a clock far ahead is followed only up to the drift cap, and noted', () => {
  let now = 1_000_000;
  const c = createClock({ deviceId: A, now: () => now, maxDriftMs: 60_000 });
  c.observe(encodeHlc(now + 10 * 86400000, 0, B));   // ten days ahead
  assert.ok(decodeHlc(c.tick()).wall <= now + 60_000);
  assert.equal(c.skewed.deviceId, B);
  assert.ok(c.skewed.aheadMs > 9 * 86400000);
  // ...but forced (a local edit must beat the value it replaces) it follows.
  const far = encodeHlc(now + 10 * 86400000, 0, B);
  c.observe(far, { force: true });
  assert.ok(c.tick() > far);
});

test('a restored clock never goes back; the floor is older than anything real', () => {
  const c1 = createClock({ deviceId: A, now: () => 9000 });
  const last = c1.tick();
  const c2 = createClock({ deviceId: A, now: () => 10, last });
  assert.ok(c2.tick() > last);
  assert.ok(c2.floor() < encodeHlc(1, 0, '0000000000000000'));
});

test('keysBetween gives increasing positions strictly inside the gap', () => {
  const ks = keysBetween('', null, 1000);
  assert.equal(ks.length, 1000);
  for (let i = 1; i < ks.length; i++) assert.ok(ks[i - 1] < ks[i]);
  assert.ok(ks.every(k => isPos(k) && k.length <= 2), 'a thousand positions fit in two characters');
  // Repeatedly inserting between two neighbours keeps working.
  let lo = 'a', hi = 'b';
  for (let i = 0; i < 200; i++) { const [m] = keysBetween(lo, hi, 1); assert.ok(lo < m && m < hi && isPos(m)); if (i % 2) lo = m; else hi = m; }
  assert.throws(() => keysBetween('b', 'a', 1));
  assert.ok(!isPos('a0') && !isPos('') && isPos('a01'));
});
