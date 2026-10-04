  // @part 03-filters.js · OWNER: C3 (shared core: range, predicates, buckets, makeCtx, foldCats, filter setters, changed())
  // ── Filtering ─────────────────────────────────────────────────────────
  function getRange() {
    const M = R.model; const end = M.anchor, min = M.minN;
    let from, to = end;
    switch (F.preset) {
      case '1W': from = end - 6; break;
      case '1M': from = addMonths(end, -1) + 1; break;
      case '3M': from = addMonths(end, -3) + 1; break;
      case '6M': from = addMonths(end, -6) + 1; break;
      case 'YTD': from = monthStart(Math.floor(monthIdx(end) / 12) * 12); break;
      case '1Y': from = addMonths(end, -12) + 1; break;
      case 'All': from = min; break;
      default:
        from = validIso(F.from) ? dnum(F.from) : min;
        to = validIso(F.to) ? dnum(F.to) : end;
    }
    to = clamp(to, min, end); from = clamp(from, min, to);
    return { from, to, len: to - from + 1 };
  }
  function pred(skip) {
    skip = skip || {};
    const q = (F.q || '').trim().toLowerCase();
    const cats = F.cats, accts = F.accts, amt = F.amt, merch = F.merchant;
    // @new-begin merchant name variants (C2): "TESCO STORES 3345" and "Tesco" are one merchant (25-vendor-kit.js)
    const mset = merch && !skip.merchant ? VK.groups().setOf(merch) : null;
    // @new-end
    return t => {
      if (!skip.acct && accts.length && !accts.includes(t.acct)) return false;
      if (!skip.merchant && merch && t.m !== merch && !(mset && mset.has(t.m))) return false;
      if (!skip.q && q && !(t.m.toLowerCase().includes(q) || t.memo.toLowerCase().includes(q) || t.c.toLowerCase().includes(q))) return false;
      if (!skip.amt && amt && (t.abs < amt[0] - 0.004 || t.abs > amt[1] + 0.004)) return false;
      if (!skip.cats && cats.length && t.kind === 'spend' && !cats.includes(t.c)) return false;
      return true;
    };
  }
  function split(rows) {
    const o = { spend: [], income: [], xfer: [], all: rows };
    for (const t of rows) (t.kind === 'spend' ? o.spend : t.kind === 'income' ? o.income : o.xfer).push(t);
    return o;
  }
  function makeBuckets(from, to, gran) {
    const out = [];
    const multiYear = dobj(from).getUTCFullYear() !== dobj(to).getUTCFullYear();
    if (gran === 'day') for (let n = from; n <= to; n++) out.push({ s: n, e: n, label: fDay(n), long: fDayLong(n) });
    else if (gran === 'week') for (let s = weekStart(from); s <= to; s += 7) {
      const b = { s: Math.max(s, from), e: Math.min(s + 6, to) };
      b.label = fDay(s); b.long = `Week of ${fDayY(s)}` + (b.s !== s || b.e !== s + 6 ? ' (part)' : '');
      out.push(b);
    } else for (let mi = monthIdx(from); mi <= monthIdx(to); mi++) {
      const b = { s: Math.max(monthStart(mi), from), e: Math.min(monthEnd(mi), to), mi };
      b.label = fMonthS(mi, multiYear); b.long = fMonth(mi) + (b.s !== monthStart(mi) || b.e !== monthEnd(mi) ? ' (part)' : '');
      out.push(b);
    }
    return out;
  }
  function indexer(from, gran) {
    if (gran === 'day') return n => n - from;
    if (gran === 'week') { const w0 = weekStart(from); return n => Math.floor((weekStart(n) - w0) / 7); }
    const m0 = monthIdx(from); return n => monthIdx(n) - m0;
  }
  function seriesBy(rows, buckets, ix, f) {
    const out = new Array(buckets.length).fill(0);
    for (const t of rows) { const i = ix(t.n); if (i >= 0 && i < out.length) out[i] += f(t); }
    return out.map(round2);
  }
  // Everything a section needs, computed once per update pass.
  function makeCtx() {
    const M = R.model; const rg = getRange();
    const prev = { from: rg.from - rg.len, to: rg.from - 1, len: rg.len };
    const p = pred();
    const inR = r => t => t.n >= r.from && t.n <= r.to;
    const cur = split(M.tx.filter(t => inR(rg)(t) && p(t)));
    const prv = split(M.tx.filter(t => inR(prev)(t) && p(t)));
    const buckets = makeBuckets(rg.from, rg.to, F.gran);
    const ix = indexer(rg.from, F.gran);
    const effFrom = Math.max(rg.from, M.minN), effTo = Math.min(rg.to, M.anchor);
    const ctx = { M, rg, prev, p, cur, prv, buckets, ix, hasPrev: prev.to >= M.minN, days: Math.max(1, effTo - effFrom + 1), effFrom, effTo };
    const memo = {};
    ctx.lazy = (k, f) => (k in memo ? memo[k] : (memo[k] = f()));
    ctx.spendNoCat = () => ctx.lazy('snc', () => { const q = pred({ cats: true }); return M.tx.filter(t => t.kind === 'spend' && t.n >= rg.from && t.n <= rg.to && q(t)); });
    ctx.spendNoCatPrev = () => ctx.lazy('sncp', () => { const q = pred({ cats: true }); return M.tx.filter(t => t.kind === 'spend' && t.n >= prev.from && t.n <= prev.to && q(t)); });
    ctx.prevSeries = f => {
      const pb = makeBuckets(prev.from, prev.to, F.gran); const pix = indexer(prev.from, F.gran);
      const arr = seriesBy(ctx.prv.spend, pb, pix, f || (t => t.s));
      return buckets.map((_, i) => arr[i] != null ? arr[i] : 0);
    };
    ctx.catTotals = rows => { const o = {}; rows.forEach(t => { o[t.c] = (o[t.c] || 0) + t.s; }); return o; };
    return ctx;
  }
  // Fold categories without a colour slot into "Other" (never a 9th hue).
  function foldCats(totals) {
    const items = []; let other = 0; const members = [];
    for (const [c, v] of Object.entries(totals)) {
      if (v <= 0.004) continue;
      if (c === 'Uncategorised' || (R.model.slots[c] != null)) items.push({ name: c, value: v, color: catColor(c), members: [c] });
      else { other += v; members.push(c); }
    }
    items.sort((p, q) => q.value - p.value);
    // Not called "Other": rules.json now has a real category of that name.
    if (other > 0.004) items.push({ name: 'Everything else', value: other, color: tk().other, members });
    return items;
  }

  // ── Mutating the filters ──────────────────────────────────────────────
  function pushRangeHistory() {
    R.rangeHistory.push({ preset: F.preset, from: F.from, to: F.to, gran: F.gran });
    if (R.rangeHistory.length > 30) R.rangeHistory.shift();
  }
  function autoGran(len) { return len <= 45 ? 'day' : len <= 220 ? 'week' : 'month'; }
  function setPreset(p) {
    pushRangeHistory();
    F.preset = p; F.from = F.to = null;
    F.gran = autoGran(getRange().len);
    changed();
  }
  function setCustomRange(a, b, opts) {
    const M = R.model; a = clamp(Math.round(a), M.minN, M.anchor); b = clamp(Math.round(b), a, M.anchor);
    if (!(opts && opts.noHistory)) pushRangeHistory();
    F.preset = 'custom'; F.from = diso(a); F.to = diso(b);
    if (!(opts && opts.keepGran)) F.gran = autoGran(b - a + 1);
    changed();
  }
  function rangeBack() {
    const s = R.rangeHistory.pop(); if (!s) return;
    Object.assign(F, s); changed();
  }
  function toggleCat(c, only) {
    if (only) F.cats = (F.cats.length === 1 && F.cats[0] === c) ? [] : [c];
    else F.cats = F.cats.includes(c) ? F.cats.filter(x => x !== c) : [...F.cats, c];
    changed();
  }
  function setCats(list) { F.cats = list.slice(); changed(); }
  function setMerchant(m) { F.merchant = m || ''; R.page = 0; changed(); }
  function setAmt(lo, hi) {
    const M = R.model;
    if (lo <= 0.004 && hi >= M.maxAmt - 0.004) F.amt = null; else F.amt = [round2(lo), round2(hi)];
    changed();
  }
  function resetFilters() {
    pushRangeHistory();
    Object.assign(F, { preset: '3M', from: null, to: null, cats: [], accts: [], merchant: '', q: '', amt: null, inc: true, xfer: false, compare: false });
    F.gran = autoGran(getRange().len);
    R.page = 0; changed();
  }
  let changeRaf = 0;
  function changed() {
    saveF(); R.page = Math.min(R.page, 1e9);
    if (changeRaf) return;
    changeRaf = requestAnimationFrame(() => { changeRaf = 0; if (R.mode === 'ready') updateAll(); });
  }

