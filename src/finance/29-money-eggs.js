  // @part 29-money-eggs.js · NEW (30 Oct 2026) · OWNER: Finance symbols (easter eggs: one entry each; window.FinEggs)
  // ── Easter eggs ───────────────────────────────────────────────────────
  // Small kind surprises on a payment's tile: a sticker the size of a badge, a little motion the first
  // time, a line in a toast at most (Fun level Full) when it is recent. Each happens once, ever.
  // Never about sensitive spending: nothing on health, debt, fees, tax, insurance, betting, or a person.
  // Never judging: no totals, no "you spent too much". Fun level Off: none of it.
  //   { id, art, motion: 'float'|'bounce'|'', title, say (the toast), find(rows, C) -> the row it sits on }
  const EG_ART = {
    goldcup: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h12l-1.3 12.2a1.6 1.6 0 0 1-1.6 1.4H7.9a1.6 1.6 0 0 1-1.6-1.4z" fill="#f5c542" stroke="#a16207" stroke-width="1.1"/><rect x="3.8" y="5.2" width="14.4" height="3" rx="1.2" fill="#fde68a" stroke="#a16207" stroke-width="1.1"/><path d="M20.5 2l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" fill="#f59e0b"/></svg>',
    trainbadge: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.6" fill="#1d4ed8" stroke="#fff" stroke-width="1.4"/><rect x="6.6" y="6" width="10.8" height="10.4" rx="2.6" fill="#fff"/><rect x="8.2" y="7.8" width="7.6" height="3.4" rx=".8" fill="#1d4ed8"/><circle cx="9.2" cy="13.6" r="1" fill="#1d4ed8"/><circle cx="14.8" cy="13.6" r="1" fill="#1d4ed8"/><path d="M8.6 16.4l-1.6 2.2M15.4 16.4l1.6 2.2" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/></svg>',
    ghost: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.4a7.6 7.6 0 0 1 7.6 7.6v11.2l-2.5-1.9-2.5 1.9-2.6-1.9-2.6 1.9-2.5-1.9-2.5 1.9V10A7.6 7.6 0 0 1 12 2.4z" fill="#f8fafc" stroke="#475569" stroke-width="1.1"/><circle cx="9.4" cy="10" r="1.5" fill="#1e293b"/><circle cx="14.6" cy="10" r="1.5" fill="#1e293b"/><ellipse cx="12" cy="14" rx="1.6" ry="1.2" fill="#1e293b"/></svg>',
    paw: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.6" fill="#fff7ed" stroke="#b45309" stroke-width="1.1"/><path d="M12 11.6c2.6 0 4.8 2.6 4.8 4.8 0 1.8-1.3 2.6-2.6 2.6-.9 0-1.4-.5-2.2-.5s-1.3.5-2.2.5c-1.3 0-2.6-.8-2.6-2.6 0-2.2 2.2-4.8 4.8-4.8z" fill="#b45309"/><ellipse cx="6.8" cy="11" rx="1.6" ry="2" fill="#b45309"/><ellipse cx="10" cy="7.4" rx="1.6" ry="2.1" fill="#b45309"/><ellipse cx="14" cy="7.4" rx="1.6" ry="2.1" fill="#b45309"/><ellipse cx="17.2" cy="11" rx="1.6" ry="2" fill="#b45309"/></svg>',
    pizza: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.4 6.6c6-3.4 13.2-3.4 19.2 0L12 22.6z" fill="#fbbf24" stroke="#b45309" stroke-width="1.1" stroke-linejoin="round"/><circle cx="9" cy="9" r="1.7" fill="#dc2626"/><circle cx="14.6" cy="9.8" r="1.5" fill="#dc2626"/><circle cx="12" cy="14.6" r="1.4" fill="#dc2626"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 2l2.2 6.8L20 11l-6.8 2.2L11 20l-2.2-6.8L2 11l6.8-2.2z" fill="#fbbf24" stroke="#fff" stroke-width=".9"/><path d="M19.4 15.4l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z" fill="#f59e0b"/></svg>',
    pi: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.6" fill="#7c3aed" stroke="#fff" stroke-width="1.4"/><path d="M6.6 8.6c.6-1.2 1.6-1.6 3-1.6h8M9.8 7c0 4-.4 7.6-2 10.4M14.4 7c-.2 3.6 0 7.4 1.2 9.2.6.8 1.6.8 2.2 0" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>',
    clover: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8.2" cy="8.2" r="4.2" fill="#16a34a"/><circle cx="15.8" cy="8.2" r="4.2" fill="#16a34a"/><circle cx="8.2" cy="15.2" r="4.2" fill="#16a34a"/><circle cx="15.8" cy="15.2" r="4.2" fill="#16a34a"/><path d="M12 12c0 4 1 7.4 3.4 10" fill="none" stroke="#166534" stroke-width="1.6" stroke-linecap="round"/></svg>',
    frog: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="15" rx="9" ry="7" fill="#22c55e" stroke="#166534" stroke-width="1"/><circle cx="7.6" cy="7.6" r="3" fill="#22c55e" stroke="#166534" stroke-width="1"/><circle cx="16.4" cy="7.6" r="3" fill="#22c55e" stroke="#166534" stroke-width="1"/><circle cx="7.6" cy="7.4" r="1.2" fill="#14532d"/><circle cx="16.4" cy="7.4" r="1.2" fill="#14532d"/><path d="M8 16c2.2 1.8 5.8 1.8 8 0" fill="none" stroke="#14532d" stroke-width="1.3" stroke-linecap="round"/></svg>',
    party: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21l5-14 9 9z" fill="#ec4899" stroke="#9d174d" stroke-width="1"/><path d="M14 3v3M19 5l-2 2M21 11h-3" stroke="#f59e0b" stroke-width="1.7" stroke-linecap="round"/><circle cx="17.4" cy="2.8" r="1" fill="#22d3ee"/><circle cx="21.6" cy="7.4" r="1" fill="#a3e635"/></svg>',
    snow: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.6" fill="#e0f2fe" stroke="#0369a1" stroke-width="1"/><path d="M12 5v14M6 8.5l12 7M18 8.5l-12 7" stroke="#0369a1" stroke-width="1.6" stroke-linecap="round"/></svg>',
    book: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" fill="#0ea5e9" stroke="#0369a1" stroke-width="1"/><path d="M8 3v18" stroke="#0369a1" stroke-width="1"/><path d="M15 9l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" fill="#fde68a"/></svg>',
  };
  const egDay = (x) => { const d = dobj(x.n); return { m: d.getUTCMonth() + 1, d: d.getUTCDate(), y: d.getUTCFullYear() }; };
  const egNth = (rows, n) => (rows.length >= n ? rows[n - 1] : null);
  const egLast = (rows) => (rows.length ? rows[rows.length - 1] : null);
  const egAmt = (x) => round2(Math.abs(x.a));
  const EGGS = [
    { id: 'coffee-100', art: 'goldcup', motion: 'float', title: 'Your 100th coffee', say: 'Your 100th coffee! Here’s a tiny golden cup.', find: (r, C) => egNth(r.filter(C.coffee), 100) },
    { id: 'coffee-500', art: 'goldcup', motion: 'float', title: 'Your 500th coffee', say: 'Coffee number 500. That cup has seen some mornings.', find: (r, C) => egNth(r.filter(C.coffee), 500) },
    { id: 'train-50', art: 'trainbadge', motion: 'bounce', title: 'Train lover: your 50th train', say: 'Your 50th train! You’ve earned a little train-lover badge.', find: (r, C) => egNth(r.filter(C.train), 50) },
    { id: 'pet', art: 'paw', motion: 'bounce', title: 'Something for the pet', say: 'Somebody with paws is going to be pleased.', find: (r, C) => egLast(r.filter(C.pet)) },
    { id: 'halloween', art: 'ghost', motion: 'float', title: 'Boo! Bought at Halloween', say: 'Boo! A little Halloween ghost for that one.', find: (r) => egLast(r.filter(x => { const d = egDay(x); return d.m === 10 && d.d >= 29 && /halloween|party|costume|fancy dress|sweet|candy|pumpkin/i.test(x.m + ' ' + x.c); })) },
    { id: 'pizza-day', art: 'pizza', motion: 'bounce', title: 'Pizza on National Pizza Day', say: 'Pizza on National Pizza Day. Excellent timing.', find: (r, C) => egLast(r.filter(x => { const d = egDay(x); return d.m === 2 && d.d === 9 && C.pizza(x); })) },
    { id: 'round', art: 'sparkle', motion: '', title: 'A nice round number', say: '', find: (r) => egLast(r.filter(x => { const a = egAmt(x); return a >= 20 && a % 10 === 0 && (fnvEgg(x.k) % 5 === 0); })) },
    { id: 'pi', art: 'pi', motion: 'float', title: 'Exactly £3.14. Happy pi.', say: 'Exactly £3.14. Happy pi.', find: (r) => egLast(r.filter(x => egAmt(x) === 3.14)) },
    { id: 'sevens', art: 'clover', motion: 'bounce', title: 'Lucky sevens: £7.77', say: 'Lucky sevens: £7.77.', find: (r) => egLast(r.filter(x => egAmt(x) === 7.77 || egAmt(x) === 77.77)) },
    { id: 'palindrome', art: 'sparkle', motion: '', title: 'The same forwards and backwards', say: '', find: (r) => egLast(r.filter(x => { const s = egAmt(x).toFixed(2).replace('.', ''); return s.length >= 4 && s === [...s].reverse().join('') && /[1-9]/.test(s); })) },
    { id: 'leap-day', art: 'frog', motion: 'bounce', title: 'Bought on a leap day', say: 'Bought on a leap day. That doesn’t happen often.', find: (r) => egLast(r.filter(x => { const d = egDay(x); return d.m === 2 && d.d === 29; })) },
    { id: 'new-year', art: 'party', motion: 'bounce', title: 'First payment of the year', say: 'The first payment of the year. Happy new year!', find: (r) => egLast(r.filter(x => { const d = egDay(x); return d.m === 1 && d.d === 1; })) },
    { id: 'first-snow', art: 'snow', motion: 'float', title: 'Hot chocolate season', say: '', find: (r, C) => egLast(r.filter(x => { const d = egDay(x); return d.m === 12 && d.d === 24 && C.coffee(x); })) },
    { id: 'book-day', art: 'book', motion: '', title: 'A book on World Book Day', say: 'A book on World Book Day. Lovely.', find: (r, C) => egLast(r.filter(x => { const d = egDay(x); return d.m === 3 && d.d >= 1 && d.d <= 7 && d.d === egWorldBookDay(d.y) && C.book(x); })) },
  ];
  // World Book Day in the UK: the first Thursday of March.
  function egWorldBookDay(y) { const w = new Date(Date.UTC(y, 2, 1)).getUTCDay(); return 1 + ((4 - w + 7) % 7); }
  const fnvEgg = (s) => { let h = 0x811c9dc5; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
  const EG_SENSITIVE = /gambl|\bbet|betting|casino|lotter|bingo|poker|\bloan|debt|credit|pawn|\bfine\b|bailiff|vape|tobacco/i;
  const EG_NOT_SCENES = new Set(['health', 'debt', 'fees', 'tax', 'insurance', 'people', 'transfers', 'income', 'savings', 'cash', 'uncategorised']);
  const VE = { fresh: new Set(), checked: false };
  const egFun = () => { try { return typeof gameFun === 'function' ? gameFun() : 'subtle'; } catch (e) { return 'subtle'; } };
  function egMap(M) {
    if (M._eggs) return M._eggs;
    const out = new Map(); const fs = FSY();
    if (!fs) return (M._eggs = out);
    const info = (x) => { try { return fs.merchantInfo(x.m, x.c); } catch (e) { return { known: false, pic: '', scene: null }; } };
    const safe = (x) => {
      if (x.kind !== 'spend' || !(x.s > 0) || x.how === 'own-transfer') return false;
      if (EG_SENSITIVE.test(x.m + ' ' + x.c + ' ' + (x.bc || ''))) return false;
      const cs = fs.categoryScene(x.c, x.bc);
      return !EG_NOT_SCENES.has(cs);
    };
    const rows = M.tx.filter(safe).sort((a, b) => a.n - b.n || (a.k < b.k ? -1 : 1));
    const C = {
      coffee: (x) => { const i = info(x); return i.scene === 'coffee' || i.pic === 'coffee' || fs.categoryScene(x.c, x.bc) === 'coffee'; },
      train: (x) => { const i = info(x); return i.pic === 'train' || i.pic === 'tube' || i.pic === 'tram'; },
      pet: (x) => { const i = info(x); return i.pic === 'paw' || fs.categoryScene(x.c, x.bc) === 'pets'; },
      pizza: (x) => info(x).pic === 'pizza',
      book: (x) => info(x).pic === 'books',
    };
    for (const e of EGGS) {
      let r = null;
      try { r = e.find(rows, C); } catch (err) { r = null; }
      if (r && !out.has(r.k)) out.set(r.k, e);
    }
    return (M._eggs = out);
  }
  function egSeen() { const u = (typeof state !== 'undefined' && state && state.homeUI) || null; return u && typeof u.finEggs === 'object' && u.finEggs ? u.finEggs : {}; }
  /** First look at a model: note what's there. Only something recent gets a moment (and at most one toast, on Full). */
  function egCheck(M) {
    if (M._eggsChecked) return; M._eggsChecked = true;
    if (egFun() === 'off') return;
    const seen = egSeen(); const map = egMap(M);
    const add = [];
    let told = false;
    for (const [k, e] of map) {
      if (seen[e.id]) continue;
      add.push(e.id);
      const row = M.tx.find(t => t.k === k);
      if (!row || M.anchor - row.n > 21) continue;
      VE.fresh.add(e.id);
      if (!told && e.say && egFun() === 'full' && typeof toast === 'function') { told = true; toast(e.say, { icon: 'party-popper' }); }
    }
    if (add.length && typeof state !== 'undefined' && state) {
      if (!state.homeUI || typeof state.homeUI !== 'object') state.homeUI = {};
      state.homeUI.finEggs = Object.assign({}, seen, Object.fromEntries(add.map(id => [id, 1])));
      if (typeof saveUI === 'function') saveUI();
    }
  }
  window.FinEggs = {
    /** The sticker for a row (markup), or ''. Its motion only the first time, and only on a recent payment. */
    badge(x) {
      const M = R.model; if (!M || !x) return '';
      if (egFun() === 'off') return '';
      egCheck(M);
      const e = egMap(M).get(x.k); if (!e) return '';
      const fresh = VE.fresh.has(e.id);
      if (fresh) VE.fresh.delete(e.id);
      return `<span class="fsym-egg${fresh ? ' is-new' + (e.motion ? ' egg-' + e.motion : '') : ''}" title="${esc(e.title)}">${EG_ART[e.art]}</span>`;
    },
    list: () => EGGS.map(e => ({ id: e.id, title: e.title, art: EG_ART[e.art] })),
  };
