  // @part 25-vendor-kit.js · NEW (3 Oct 2026) · OWNER: C2 (merchant symbols in the view, merchant groups, monotone sparklines, chart tile images; pure helpers VL.* are tested in tests/finance-vendors.test.mjs)
  // ── Vendor kit (VK) and vendor logic (VL) ─────────────────────────────
  // VK puts window.FinSymbols (src/app/67-fin-symbols.js) into the Finances
  // view: merchant tiles, category icons and transaction-type badges as DOM
  // nodes, the same tiles as canvas images for ECharts axis labels, and
  // monotone (never overshooting) SVG sparklines. Everything degrades to
  // plain text when the symbol library is missing.
  //
  //   VK.tile(name, cat, o)      merchant tile node (o: size xs|sm|md|lg|xl, enter, i, selected, dim, badge, bc)
  //   VK.cat(cat, o)             category icon node (o: size, live, plain, color)
  //   VK.badge(kindOrTx, o)      transaction-type pill node (o: compact, size)
  //   VK.kind(x)                 a model row's type ('contactless', 'direct-debit', ...), cached on the row
  //   VK.kindInfo(kind)          { kind, label, title, colour }
  //   VK.spark(values, o)        sparkline node (o: color, area, dot, i (stagger), enter, h)
  //   VK.tileImg(name, cat, px)  data URL of the tile for ECharts rich text (cached per theme)
  //   VK.richTiles(items, px)    { rich, fmt } for a category axis whose labels carry tiles
  //   VK.groups(M)               merchant groups of the model (canonical names): { keyOf, label, members, setOf }
  //
  // VL holds the pure analysis (no DOM; NEW analysis, see MODULES.md):
  //   VL.monoPath, VL.groupAgg, VL.bucketSeries, VL.raceFrames, VL.occurrences,
  //   VL.priceChange, VL.isNew, VL.payday, VL.dayGroups, VL.unseen
  const FSY = () => (typeof window !== 'undefined' && window.FinSymbols) || null;
  function htmlNode(html) {
    const t = document.createElement('template');
    t.innerHTML = String(html).trim();
    return t.content.firstElementChild;
  }
  let vkUid = 0;
  const VK_IMG = new Map();
  const VK = {
    tile(name, cat, o) {
      o = o || {}; const fs = FSY();
      if (!fs) return h('span', { class: 'fv-mt-fallback sz-' + (o.size || 'md'), 'aria-hidden': 'true', text: String(name || '?').trim().charAt(0).toUpperCase() || '?' });
      return htmlNode(fs.merchantSymbol(name, cat, Object.assign({ size: 'md' }, o)));
    },
    cat(cat, o) {
      o = o || {}; const fs = FSY();
      if (!fs) return sw(catColor(cat));
      return htmlNode(fs.categoryIcon(cat, Object.assign({ size: 'xs', plain: true }, o)));
    },
    badge(kindOrTx, o) {
      const fs = FSY();
      if (!fs) return h('span', { class: 'fv-kind-fallback', text: typeof kindOrTx === 'string' ? kindOrTx : '' });
      return htmlNode(fs.txTypeBadge(kindOrTx, Object.assign({ size: 'sm' }, o || {})));
    },
    // Bars: the selected one keeps its colour and a soft lift (no hard outline); FX.sel dims the rest.
    barSelect() {
      const t = tk();
      return { selectedMode: 'single', select: { itemStyle: { borderWidth: 0, shadowBlur: 14, shadowOffsetY: 2, shadowColor: alpha(t.text, t.dark ? 0.55 : 0.22), opacity: 1 }, label: { fontWeight: 700, color: t.text } } };
    },
    // The badge only when it says something ("Payment" means the bank gave no method).
    badgeIf(kind, o, empty) { return kind && kind !== 'payment' ? VK.badge(kind, o) : (empty ? h('span', { class: 'fv-kind-none' }) : null); },
    kind(x) {
      if (!x) return 'payment';
      if (x._kind) return x._kind;
      const fs = FSY(); if (!fs) return 'payment';
      const M = R.model; const raw = M && M.a && Array.isArray(M.a.transactions) ? M.a.transactions[x.i] : null;
      let k = 'payment';
      // Only subscription-like regulars make a plain card payment a "Subscription"
      // (rent, bills and insurance are regular too, but they are not subscriptions).
      if (M && !M._vkSubs) M._vkSubs = M.recurring.filter(r => /subscri|stream|entertain|music|software|digital|media|news|gaming|fitness|gym|member|cloud/i.test(r.cat || ''));
      try { k = fs.txKind({ a: x.a, memo: x.memo, bc: x.bc, c: x.c, how: x.how, m: x.m, type: raw && raw.ty ? String(raw.ty) : '' }, { recurring: M ? M._vkSubs : null }); } catch (e) { k = 'payment'; }
      x._kind = k;
      return k;
    },
    kindInfo(kind) {
      const fs = FSY();
      return fs ? fs.txKindInfo(kind) : { kind, label: kind, title: kind, colour: 'slate' };
    },
    // Monotone cubic sparkline (passes through every point, never overshoots): a
    // stretched path with a non-scaling stroke, a gradient wash and an HTML end dot.
    spark(values, o) {
      o = o || {};
      const v = (values || []).map(x => (isFinite(x) ? +x : 0));
      const el = h('span', { class: 'fv-spk' + (o.enter ? ' enter' : ''), 'aria-hidden': 'true', style: o.i != null ? { '--i': o.i } : null });
      if (v.length < 2) return el;
      const w = 100, ht = o.h || 34, pad = 3;
      const lo = Math.min(0, ...v), hi = Math.max(...v); const span = (hi - lo) || 1;
      const P = v.map((y, i) => [i / (v.length - 1) * w, pad + (1 - (y - lo) / span) * (ht - pad * 2)]);
      const id = 'fvspk' + (++vkUid);
      const c = /^(#[0-9a-f]{3,8}|var\(--[a-z0-9-]+\)|rgba?\([\d\s.,%]+\))$/i.test(o.color || '') ? o.color : 'var(--accent)';
      const line = VL.monoPath(P);
      const last = P[P.length - 1];
      el.innerHTML = `<svg viewBox="0 0 ${w} ${ht}" preserveAspectRatio="none"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity="${o.a0 == null ? 0.2 : o.a0}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs>`
        + `<g class="fv-spk-clip">${o.area === false ? '' : `<path d="${line}L${w} ${ht}L0 ${ht}Z" fill="url(#${id})"/>`}<path d="${line}" fill="none" stroke="${c}" stroke-width="${o.sw || 1.75}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></g></svg>`
        + (o.dot === false ? '' : `<i class="fv-spk-dot" style="left:${(last[0] / w * 100).toFixed(2)}%;top:${(last[1] / ht * 100).toFixed(2)}%;--c:${c}"></i>`);
      return el;
    },
    // The merchant tile drawn once on a canvas (Inter, the brand-ish colour and
    // monogram), for ECharts rich-text images. Never fetched; cached per theme.
    tileImg(name, cat, px) {
      const fs = FSY(); const t = tk(); px = px || 44;
      const info = fs ? fs.merchantInfo(name, cat) : { key: String(name || ''), color: catColor(cat), ink: '#ffffff', mono: String(name || '?').charAt(0).toUpperCase() };
      const key = info.key + '|' + info.color + '|' + px + (t.dark ? 'd' : 'l');
      if (VK_IMG.has(key)) return VK_IMG.get(key);
      let url = '';
      try {
        const cv = document.createElement('canvas'); const r = 2; cv.width = cv.height = px * r;
        const g = cv.getContext('2d'); g.scale(r, r);
        const rad = px * 0.28;
        g.fillStyle = info.color;
        g.beginPath(); g.moveTo(rad, 0); g.arcTo(px, 0, px, px, rad); g.arcTo(px, px, 0, px, rad); g.arcTo(0, px, 0, 0, rad); g.arcTo(0, 0, px, 0, rad); g.closePath(); g.fill();
        const mono = String(info.mono || '?'); const len = [...mono].length;
        const fsz = px * (len >= 3 ? 0.3 : len === 2 ? 0.38 : 0.48);
        g.fillStyle = info.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = `700 ${fsz}px ${FONT}`; g.fillText(mono, px / 2, px / 2 + fsz * 0.05);
        url = cv.toDataURL();
      } catch (e) { url = ''; }
      if (VK_IMG.size > 400) VK_IMG.clear();
      VK_IMG.set(key, url);
      return url;
    },
    // items: [{ name, cat }] in axis order. fmt(value, index) gives "{t3|}{n|Name}".
    richTiles(items, px, o) {
      o = o || {}; const t = tk(); px = px || 20;
      const rich = { n: { color: t.text, fontSize: o.fontSize || 12, fontWeight: o.weight || 500, fontFamily: FONT, padding: [0, 0, 0, 8] } };
      const idx = new Map();
      items.forEach((it, i) => {
        const url = VK.tileImg(it.name, it.cat, px * 2);
        rich['t' + i] = url ? { backgroundColor: { image: url }, width: px, height: px, borderRadius: Math.round(px * 0.28) } : { width: px, height: px };
        idx.set(it.label != null ? it.label : it.name, i);
      });
      const clean = s => String(s).replace(/[{}|]/g, '');
      const cut = s => (o.max && s.length > o.max ? s.slice(0, o.max - 1).trimEnd() + '…' : s);
      const fmt = v => { const i = idx.get(v); return (i != null ? `{t${i}|}` : "") + `{n|${cut(clean(i != null && items[i].text ? items[i].text : v))}}`; };
      // Left-aligned labels in a gutter of width w (the grid's left must be w + 12, no containLabel).
      const axisLabel = w => ({ formatter: fmt, rich, align: 'left', margin: 10, padding: [0, 0, 0, -w] });
      return { rich, fmt, axisLabel };
    },
    // Merchant groups: raw bank names that clean to the same merchant
    // (FinSymbols.merchantKey) count as one ("TESCO STORES 3345" and "Tesco").
    groups(M) {
      M = M || R.model;
      if (!M) return { keyOf: s => s, label: k => k, members: new Map(), setOf: () => null };
      if (M._vkGroups) return M._vkGroups;
      const fs = FSY();
      const keyOf0 = s => { try { return fs ? fs.merchantKey(s) : String(s).trim().toLowerCase(); } catch (e) { return String(s).trim().toLowerCase(); } };
      const key = new Map(), members = new Map(), weight = new Map(), catOf = new Map();
      const catW = new Map();   // @na spending per name and category, for the guard below
      for (const t of M.tx) {
        if (!key.has(t.m)) { const k = (/^(payments? to people|friends ?(&|and) ?family|people)$/i.test(t.c) ? 'person:' + t.m.toLowerCase() : keyOf0(t.m)) || t.m.toLowerCase(); key.set(t.m, k); if (!members.has(k)) members.set(k, new Set()); members.get(k).add(t.m); catOf.set(t.m, t.c); }
        weight.set(t.m, (weight.get(t.m) || 0) + Math.abs(t.a));
        if (t.kind === 'spend') { let cw = catW.get(t.m); if (!cw) catW.set(t.m, cw = new Map()); cw.set(t.c, (cw.get(t.c) || 0) + Math.abs(t.a)); }
      }
      // @na-fix (numbers audit) A brand pattern can catch different businesses
      // that share a word ("LIME*RIDE" and "LIME LEAF THAI", Shell fuel and
      // "SHELL COTTAGE B&B"), and then their totals and the merchant filter
      // merged. In a group, a name whose spending sits mainly in another
      // category than the group's lead stands alone (Uncategorised names stay
      // in: a new spelling waiting for its category). The lead is the biggest
      // name whose category fits the brand (FinSymbols scene family: Lime is
      // transport, so LIME*RIDE keeps "Lime" and the Thai restaurant goes), else the biggest.
      const mainCat = m => { const cw = catW.get(m); if (!cw) return null; let b = null; for (const [c, v] of cw) if (b == null || v > cw.get(b)) b = c; return b; };
      const fams = new Map(); try { if (fs && typeof fs.scenes === 'function') for (const s of fs.scenes()) fams.set(s.key, s.fam); } catch (e) { /* no families: the biggest name leads */ }
      const fits = (r, bf) => { const c = mainCat(r); if (!c || !bf) return false; try { return fams.get(fs.categoryScene(c)) === bf; } catch (e) { return false; } };
      const own = new Set();
      for (const set of [...members.values()]) {
        if (set.size < 2) continue;
        const raws = [...set].sort((p, q) => (weight.get(q) || 0) - (weight.get(p) || 0));
        let bf = null; try { const inf = fs ? fs.merchantInfo(raws[0]) : null; bf = inf && inf.known ? fams.get(inf.scene) || null : null; } catch (e) { /* unknown brand */ }
        const leadName = raws.find(r => fits(r, bf)) || raws.find(r => mainCat(r));
        const lead = leadName ? mainCat(leadName) : null;
        if (!lead || lead === 'Uncategorised') continue;
        for (const r of raws) {
          const c = mainCat(r); if (!c || c === lead || c === 'Uncategorised') continue;
          const nk = 'name:' + r.toLowerCase();
          set.delete(r); key.set(r, nk); members.set(nk, new Set([r])); own.add(nk);
        }
      }
      // The display name is the cleaned one ("Www.Voxi.Co.Uk" -> "Voxi", a trailing
      // bank code or store number dropped); a person's name is never matched to a brand.
      const label = new Map();
      for (const [k, set] of members) {
        const raws = [...set].sort((p, q) => (weight.get(q) || 0) - (weight.get(p) || 0));
        let name = raws[0];
        // A name split off by the guard above reads as itself, not as the brand (FinSymbols cleans without brand patterns for people).
        try { if (fs) name = fs.merchantInfo(raws[0], own.has(k) ? 'Payments to people' : catOf.get(raws[0])).name || raws[0]; } catch (e) { /* keep the raw name */ }
        label.set(k, name);
      }
      const G = {
        keyOf: s => key.get(s) || keyOf0(s),
        label: k => label.get(k) || k,
        members,
        // The raw names that share s's group, or null when s stands alone.
        setOf: s => { const m = members.get(key.get(s)); return m && m.size > 1 ? m : null; },
        primary: k => { const m = members.get(k); return m ? [...m].sort((p, q) => (weight.get(q) || 0) - (weight.get(p) || 0))[0] : k; },
      };
      M._vkGroups = G;
      return G;
    },
  };
  // Drop an entrance class once it has played, so moving the node later (a
  // re-sort, a re-append) never replays it.
  function vkSettle(el, cls, ms) {
    if (!el) return;
    const names = cls.split(' ');
    const done = () => el.classList.remove(...names);
    el.addEventListener('animationend', function f(e) { if (e.target === el) { el.removeEventListener('animationend', f); done(); } });
    setTimeout(done, ms || 2500);
  }
  // The newest transaction for a raw merchant name (model rows are newest first).
  VK.lastTx = function (m) {
    const M = R.model; if (!M) return null;
    if (!M._vkLast) { M._vkLast = new Map(); for (const x of M.tx) if (!M._vkLast.has(x.m)) M._vkLast.set(x.m, x); }
    return M._vkLast.get(m) || null;
  };
  // The glass tooltip (FX.tip) with the merchant's tile beside its name.
  function vkTip(title, raw, cat, rows, foot, hero) {
    const fs = FSY();
    const tile = fs ? fs.merchantSymbol(raw || title, cat, { size: 'xs', live: false, badge: false }) : '';
    return FX.tip(title, rows, foot, hero).replace('<div class="fv-tt-h">', '<div class="fv-tt-h fv-tt-mh">' + tile);
  }
  // The display name for a raw merchant name (its group's cleaned name).
  function vkName(raw) { const G = VK.groups(); return G.label(G.keyOf(raw)); }
  // Is raw merchant name `m` the selected merchant (F.merchant) or one of its name variants?
  function isSelMerchant(m) {
    if (!F.merchant || !m) return false;
    if (m === F.merchant) return true;
    const set = VK.groups().setOf(F.merchant);
    return !!(set && set.has(m));
  }
  // Esc clears the selected merchant (the chip × and the filter pill do too),
  // unless a drawer, a popover or a text field has the key.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !F.merchant || R.mode !== 'ready' || !R.root || !R.root.isConnected) return;
    if (R.pop || (R.layer && R.layer.classList.contains('drawer-open'))) return;
    const a = document.activeElement;
    if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) return;
    if (document.querySelector('.modal-backdrop, [role="dialog"][aria-modal="true"]:not(.fv-drawer)')) return;
    setMerchant('');
  });
  // Spending in the range with every filter except the merchant one, so the
  // merchant views can light the selected merchant and dim the rest.
  function spendNoMerchant(ctx) {
    return ctx.lazy('c2:snm', () => { const q = pred({ merchant: true }); const rg = ctx.rg; return ctx.M.tx.filter(t => t.kind === 'spend' && t.n >= rg.from && t.n <= rg.to && q(t)); });
  }
  function spendNoMerchantPrev(ctx) {
    return ctx.lazy('c2:snmp', () => { const q = pred({ merchant: true }); const p = ctx.prev; return ctx.M.tx.filter(t => t.kind === 'spend' && t.n >= p.from && t.n <= p.to && q(t)); });
  }

  // ── VL: pure vendor analysis (NEW; numbers come from the same model rows) ──
  const VL = {
    // Monotone cubic (Fritsch–Carlson) path through [[x, y], ...], x increasing.
    monoPath(P) {
      const n = P.length; if (!n) return '';
      const f = v => +(+v).toFixed(2);
      if (n === 1) return `M${f(P[0][0])} ${f(P[0][1])}`;
      const dx = [], m = [], tg = [];
      for (let i = 0; i < n - 1; i++) { dx[i] = (P[i + 1][0] - P[i][0]) || 1e-6; m[i] = (P[i + 1][1] - P[i][1]) / dx[i]; }
      tg[0] = m[0]; tg[n - 1] = m[n - 2];
      for (let i = 1; i < n - 1; i++) tg[i] = m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
      let d = `M${f(P[0][0])} ${f(P[0][1])}`;
      for (let i = 0; i < n - 1; i++) {
        const k = dx[i] / 3;
        d += `C${f(P[i][0] + k)} ${f(P[i][1] + tg[i] * k)} ${f(P[i + 1][0] - k)} ${f(P[i + 1][1] - tg[i + 1] * k)} ${f(P[i + 1][0])} ${f(P[i + 1][1])}`;
      }
      return d;
    },
    // Merge per-name rows ({ m, total, count, cats, first, last }) into merchant groups.
    groupAgg(list, keyOf, labelOf) {
      const map = new Map();
      for (const r of list) {
        const k = keyOf(r.m);
        let g = map.get(k);
        if (!g) { g = { key: k, m: '', raw: [], rawTotals: {}, total: 0, count: 0, cats: {}, first: r.first, last: r.last }; map.set(k, g); }
        g.raw.push(r.m); g.rawTotals[r.m] = r.total;
        g.total += r.total; g.count += r.count;
        for (const c in r.cats) g.cats[c] = (g.cats[c] || 0) + r.cats[c];
        g.first = Math.min(g.first, r.first); g.last = Math.max(g.last, r.last);
      }
      for (const g of map.values()) {
        g.raw.sort((p, q) => Math.abs(g.rawTotals[q]) - Math.abs(g.rawTotals[p]) || (p < q ? -1 : 1));
        g.primary = g.raw[0];
        g.m = labelOf ? labelOf(g.key, g.primary) : g.primary;
        const top = Object.entries(g.cats).sort((p, q) => q[1] - p[1])[0];
        g.cat = top ? top[0] : 'Uncategorised';
        g.avg = g.count ? g.total / g.count : 0;
      }
      return [...map.values()];
    },
    // Per-group sums by bucket: Map key -> number[nb]. ix(n) -> bucket index.
    bucketSeries(rows, keyOf, ix, nb, f) {
      const out = new Map();
      for (const t of rows) {
        const i = ix(t.n); if (i < 0 || i >= nb) continue;
        const k = keyOf(t.m);
        let a = out.get(k); if (!a) { a = new Array(nb).fill(0); out.set(k, a); }
        a[i] += f ? f(t) : t.s;
      }
      for (const a of out.values()) for (let i = 0; i < a.length; i++) a[i] = round2(a[i]);
      return out;
    },
    // A leaderboard race: cumulative spend (or visits) per group at the end of
    // each bucket, for the n groups with the most at the end.
    // -> { keys, frames: [{ label, long, values (same order as keys) }] }
    raceFrames(rows, keyOf, buckets, ix, metric, n) {
      const nb = buckets.length;
      const per = VL.bucketSeries(rows.filter(t => metric !== 'visits' || t.s > 0), keyOf, ix, nb, metric === 'visits' ? () => 1 : null);
      const cum = new Map();
      for (const [k, a] of per) { let run = 0; cum.set(k, a.map(v => (run = round2(run + v)))); }
      const keys = [...cum.keys()].filter(k => cum.get(k)[nb - 1] > 0)
        .sort((p, q) => cum.get(q)[nb - 1] - cum.get(p)[nb - 1] || (p < q ? -1 : 1)).slice(0, n || 10);
      const frames = buckets.map((b, i) => ({ label: b.label, long: b.long, values: keys.map(k => cum.get(k)[i]) }));
      return { keys, frames };
    },
    // One recurring payment's charges in [from, to]: past charges (paid) and,
    // while it is active, the expected ones from r.next on (same day of the
    // month for monthly / quarterly / yearly, every 7 or 14 days otherwise).
    occurrences(r, from, to) {
      const out = [];
      let lastPaid = -Infinity;
      for (const c of r.charges || []) { lastPaid = Math.max(lastPaid, c.n); if (c.n >= from && c.n <= to) out.push({ n: c.n, amt: round2(c.s), paid: true }); }
      if (r.active && isFinite(r.next)) {
        const p = r.period || 30.44;
        const months = p >= 300 ? 12 : p >= 80 ? 3 : p >= 26 ? 1 : 0;
        for (let k = 0; k < 500; k++) {
          const n = months ? addMonths(r.next, k * months) : r.next + k * Math.round(p);
          if (n > to) break;
          if (n >= from && n > lastPaid) out.push({ n, amt: round2(r.typical), paid: false });
        }
      }
      return out.sort((a, b) => a.n - b.n);
    },
    // The latest price change (the newest charge that differs from the one
    // before it), if it happened in the last `days` days. -> { from, to, diff, n, up } | null
    priceChange(r, anchor, days) {
      const ch = r.charges || [];
      for (let i = ch.length - 1; i > 0; i--) {
        const a = ch[i].s, b = ch[i - 1].s;
        if (Math.abs(a - b) > Math.max(0.005, Math.abs(b) * 0.01)) {
          if (anchor - ch[i].n > (days == null ? 70 : days)) return null;
          return { from: round2(b), to: round2(a), diff: round2(a - b), n: ch[i].n, up: a > b };
        }
      }
      return null;
    },
    isNew: (r, anchor, days) => isFinite(r.first) && r.first >= anchor - (days == null ? 70 : days),
    // Paydays: days with income of at least `min`. The next one is a month on,
    // on the usual day of the month (the latest of the last three, as weekends
    // move pay earlier), moved back to the Friday when it falls on a weekend.
    // rows: [{ n, inc }] -> { days: [{ n, amt }], last, next, amount } | null
    payday(rows, anchor, min) {
      const by = new Map();
      for (const t of rows) if (t.inc > 0) by.set(t.n, (by.get(t.n) || 0) + t.inc);
      const days = [...by.entries()].filter(e => e[1] >= (min == null ? 500 : min)).sort((p, q) => p[0] - q[0]).map(e => ({ n: e[0], amt: round2(e[1]) }));
      if (!days.length) return null;
      const last = days[days.length - 1];
      const recent = days.slice(-3);
      const out = { days, last: last.n, next: null, amount: round2(median(recent.map(d => d.amt))) };
      if (days.length < 2) return out;
      const gaps = []; for (let i = 1; i < days.length; i++) gaps.push(days[i].n - days[i - 1].n);
      const g = median(gaps.slice(-4));
      if (g < 26 || g > 35) return out;
      const dom = Math.max(...recent.map(d => dobj(d.n).getUTCDate()));
      const mi = monthIdx(last.n) + 1;
      let next = monthStart(mi) + Math.min(dom, monthEnd(mi) - monthStart(mi) + 1) - 1;
      const wd = dow(next); if (wd >= 5) next -= wd - 4;
      out.next = next <= last.n + 20 ? null : next;
      return out;
    },
    // Rows already in date order -> [{ n, rows, spent, inc }] (one group per day).
    dayGroups(rows) {
      const out = []; let g = null;
      for (const x of rows) {
        if (!g || g.n !== x.n) { g = { n: x.n, rows: [], spent: 0, inc: 0 }; out.push(g); }
        g.rows.push(x); g.spent += x.s || 0; if (x.a > 0) g.inc += x.a;
      }
      for (const d of out) { d.spent = round2(d.spent); d.inc = round2(d.inc); }
      return out;
    },
    // Keys of rows that were not there last time (only rows on or after `since`,
    // the oldest day the last snapshot covered). No snapshot -> nothing is new.
    unseen(rows, seen) {
      const out = new Set();
      if (!seen || !Array.isArray(seen.keys) || !seen.keys.length || !isFinite(seen.since)) return out;
      const had = new Set(seen.keys);
      for (const x of rows) if (x.n >= seen.since && !had.has(x.k)) out.add(x.k);
      return out;
    },
  };
