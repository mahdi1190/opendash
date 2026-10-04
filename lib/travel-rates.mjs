// lib/travel-rates.mjs - exchange rates for the travel features (travel spec 3.5, 5.5).
// Owner: TRIPS.
//
// By default rates come only from the user's own card payments: a memo like
// "JPY 1,200.00 @ 189.50" gives the bank's rate, else the original amount over
// the amount charged ("£1 ≈ ¥190 from your last payment"): ownRate(rows, ccy).
// Opt-in (Settings > Travel > Exchange rates: online, config.travel.rates ===
// 'online'): the Frankfurter API, https://api.frankfurter.app/latest?from=GBP&to=JPY.
// It sends two currency codes and nothing else; one fixed host, a timeout, a
// size cap, one answer per currency pair and day cached in <data>/travel/.
// Logs: "travel rate ok/failed" and timings only.
//
//   createRates({dir, fetchImpl, log, now}) -> {online(from, to) -> Promise<{rate, date, source:'online'} | null>}
//   ownRate(rows, ccy) -> {rate, date, source:'own'} | null
//   RATES_HOST

import { join } from 'node:path';
import { readJson, writeJson } from './fsutil.mjs';

export const RATES_HOST = 'api.frankfurter.app';
const MAX_BYTES = 64 * 1024;
const TIMEOUT_MS = 8000;
const CCY_RE = /^[A-Z]{3}$/;

/**
 * The rate implied by the user's own payments in `ccy` (rows from /api/finance/travel's
 * reading: {date, amount, fx: {ccy, amt, rate}}): the newest one wins.
 */
export function ownRate(rows, ccy) {
  let best = null;
  for (const r of rows || []) {
    const fx = r && r.fx;
    if (!fx || fx.ccy !== ccy) continue;
    let rate = Number(fx.rate) > 0 ? Number(fx.rate) : 0;
    if (!rate && Number(fx.amt) > 0 && Math.abs(Number(r.amount)) > 0) rate = Number(fx.amt) / Math.abs(Number(r.amount));
    if (!(rate > 0) || !Number.isFinite(rate)) continue;
    if (!best || String(r.date) > best.date) best = { rate: Math.round(rate * 10000) / 10000, date: String(r.date || ''), source: 'own' };
  }
  return best;
}

export function createRates({ dir, fetchImpl = globalThis.fetch, log = () => {}, now = () => new Date() } = {}) {
  const mem = new Map();
  async function online(from, to) {
    const a = String(from || '').toUpperCase(), b = String(to || '').toUpperCase();
    if (!CCY_RE.test(a) || !CCY_RE.test(b) || a === b) return null;
    const day = now().toISOString().slice(0, 10);
    const key = `${a}-${b}`;
    const hit = mem.get(key);
    if (hit && hit.day === day) return hit.value;
    const file = dir ? join(dir, `rates-${key}.json`) : null;
    if (file) {
      const j = await readJson(file, { fallback: null }).catch(() => null);
      if (j && j.day === day && j.value && j.value.rate > 0) { mem.set(key, j); return j.value; }
    }
    const t0 = Date.now();
    try {
      const url = `https://${RATES_HOST}/latest?${new URLSearchParams({ from: a, to: b })}`;
      const r = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: 'application/json' }, redirect: 'error' });
      if (!r || !r.ok) throw Object.assign(new Error('HTTP ' + (r && r.status)), { code: 'HTTP' });
      const len = Number(r.headers && r.headers.get && r.headers.get('content-length'));
      if (len > MAX_BYTES) throw new Error('too large');
      const text = await r.text();
      if (text.length > MAX_BYTES) throw new Error('too large');
      const j = JSON.parse(text);
      const rate = Number(j && j.rates && j.rates[b]);
      if (!(rate > 0)) throw new Error('no rate');
      const value = { rate, date: typeof j.date === 'string' ? j.date.slice(0, 10) : day, source: 'online' };
      const rec = { day, value };
      mem.set(key, rec);
      if (file) await writeJson(file, rec).catch(() => {});
      log('info', `travel rate ok ${Date.now() - t0}ms`);
      return value;
    } catch (e) {
      log('warn', `travel rate failed (${e.code || e.name || 'error'})`);
      return null;
    }
  }
  return { online };
}
