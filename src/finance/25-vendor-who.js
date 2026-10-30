  // @part 25-vendor-who.js · NEW (30 Oct 2026) · OWNER: Finance symbols (who a payment went to: People, family or friend; a merchant's own picture; a transaction's tile)
  // ── Who and what ──────────────────────────────────────────────────────
  //   VK.who(x)            the person in People this row paid or came from: {name, avatarHtml, family} | null
  //   VK.place(x)          {cc, label} when the row was paid abroad, else null
  //   VK.txTile(x, o)      the tile for a row: a person, a kind of money (salary, refund...), or the shop with a corner badge
  //   VK.pickOwnImage(raw, cat)   choose a picture for a merchant from this computer (Undo in the toast)
  // Matching a name never runs for a shop people know: a payment to "Leon" stays a person only
  // when the bank says it was a transfer, or when it is a name the user has in People.
  const VW = { sig: '', byName: new Map(), own: false };
  const VW_FAMILY = /famil|\bmum\b|\bmom\b|\bmam\b|\bma\b|\bdad\b|\bpa\b|mother|father|parent|sister|brother|sibling|\bsis\b|\bbro\b|wife|husband|partner|spouse|\bson\b|daughter|\bchild|\bkids?\b|\bnan\b|\bnana\b|\bgran\b|grandma|grandad|grandpa|grandmother|grandfather|\baunt|\buncle\b|cousin|\bniece\b|\bnephew\b|in-law/i;
  const vwFold = s => String(s == null ? '' : s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  function vwIndex() {
    const list = (typeof state !== 'undefined' && state && Array.isArray(state.people)) ? state.people : [];
    const sig = list.length + ':' + list.map(p => (p && p.id) + (p && p.name) + (p && p.group) + (p && p.role)).join('').length;
    if (sig === VW.sig) return VW.byName;
    VW.sig = sig; VW.byName = new Map();
    const put = (k, p) => { if (!k || k.length < 3) return; VW.byName.set(k, VW.byName.has(k) && VW.byName.get(k) !== p ? null : p); };
    for (const p of list) {
      if (!p || p.self || p.isSelf || p.inactive || p.kind === 'mailbox' || p.kind === 'org' || !p.name) continue;
      const nm = vwFold(p.name);
      put(nm, p);
      for (const a of Array.isArray(p.aliases) ? p.aliases : []) put(vwFold(a), p);
      // Banks often write "J SMITH" or "SMITH J".
      const w = nm.split(' ');
      if (w.length >= 2) { const first = w[0], last = w[w.length - 1]; put(first[0] + ' ' + last, p); put(last + ' ' + first[0], p); put(first + ' ' + last, p); }
    }
    return VW.byName;
  }
  VK.who = function (x) {
    if (!x) return null;
    if (x._who !== undefined) return x._who;
    let out = null;
    const fs = FSY();
    try {
      const idx = vwIndex();
      if (idx.size) {
        const cleaned = fs ? fs.merchantInfo(x.m, 'Payments to people').name : x.m;
        const key = vwFold(cleaned);
        let p = idx.get(key) || null;
        // A longer memo ("J SMITH DINNER"): the first words, only for a bank transfer.
        const kind = VK.kind(x);
        if (!p && (kind === 'transfer-in' || kind === 'transfer-out' || /^(payments? to people|friends ?(&|and) ?family)$/i.test(String(x.c)))) {
          const w = key.split(' ');
          for (let n = Math.min(3, w.length); n >= 2 && !p; n--) p = idx.get(w.slice(0, n).join(' ')) || null;
          // One word ("MUM BIRTHDAY"): only money the user already filed as going to people.
          if (!p && /^(payments? to people|friends ?(&|and) ?family)$/i.test(String(x.c))) p = idx.get(w[0]) || null;
        }
        // A brand with the same spelling stays a brand unless the money moved by transfer.
        if (p && fs && fs.merchantInfo(x.m, x.c).known && kind !== 'transfer-in' && kind !== 'transfer-out') p = null;
        if (p) {
          let av = '';
          try { if (typeof avatarHtml === 'function') av = avatarHtml(p, 40); } catch (e) { av = ''; }
          out = { id: p.id, name: p.name, avatarHtml: av, family: VW_FAMILY.test(`${p.group || ''} ${p.role || ''}`) };
        }
      }
    } catch (e) { out = null; }
    x._who = out;
    return out;
  };
  VK.place = function (x) {
    if (!x) return null;
    const M = R.model;
    const cc = x.pc && x.pc !== 'HOME' && x.ps !== 'home' && !(M && x.pc === M._plHome) ? x.pc : '';
    if (!cc || !/^[A-Z]{2}$/.test(cc)) return null;
    let label = cc;
    try { label = PL.label(cc) || cc; } catch (e) { /* the code */ }
    return { cc, label };
  };
  VK.txTile = function (x, o) {
    o = o || {}; const fs = FSY();
    VK.loadOwnImages();
    if (!fs || typeof fs.txSymbol !== 'function') return VK.tile(x.m, x.c, o);
    const where = VK.place(x);
    const egg = window.FinEggs && typeof window.FinEggs.badge === 'function' ? window.FinEggs.badge(x) : '';
    return htmlNode(fs.txSymbol({ m: x.m, c: x.c, a: x.a, memo: x.memo, bc: x.bc, how: x.how }, Object.assign({ size: 'md', kind: VK.kind(x), person: VK.who(x), cc: where ? where.cc : '', ccLabel: where ? 'Paid in ' + where.label : '', egg }, o)));
  };
  // People change on another page: forget what the rows remembered.
  VK.forgetWho = function () { VW.sig = ''; const M = R.model; if (M) for (const t of M.tx) t._who = undefined; };

  /* ---------- a merchant's own picture ---------- */
  const VW_SIZE = 128;
  async function vwResize(file) {
    if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Choose a PNG, JPEG or WebP picture.');
    if (file.size > 15 * 1024 * 1024) throw new Error('That picture is over 15 MB. Choose a smaller one.');
    let bmp;
    try { bmp = await createImageBitmap(file); } catch (e) { throw new Error('That picture could not be read. Try another one.'); }
    const side = Math.min(bmp.width, bmp.height);
    const cv = document.createElement('canvas'); cv.width = cv.height = VW_SIZE;
    const g = cv.getContext('2d'); g.imageSmoothingQuality = 'high';
    g.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, VW_SIZE, VW_SIZE);
    if (bmp.close) bmp.close();
    for (const [type, q] of [['image/webp', 0.9], ['image/jpeg', 0.85], ['image/png', 1]]) {
      const url = cv.toDataURL(type, q);
      if (url.startsWith('data:' + type)) return url;
    }
    throw new Error('That picture could not be prepared. Try another one.');
  }
  async function vwPost(path, body) {
    let r;
    try { r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); } catch (e) { throw new Error(typeof netErrorMessage === 'function' ? netErrorMessage(e) : 'Could not reach Freeflo.'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) throw new Error(j.error || 'That did not work. Try again.');
    return j;
  }
  function vwApply(items) {
    const fs = FSY(); if (fs && fs.setOwnImages) fs.setOwnImages(items || {});
    VK_IMG.clear();
    try { if (R.model) { paintKpis(R.ctx); updateSection(R.ctx); } } catch (e) { /* not on the page */ }
  }
  VK.loadOwnImages = function () {
    if (VW.own) return; VW.own = true;
    fetch('/api/finance/vendor-images', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(j => { if (j && j.items && Object.keys(j.items).length) vwApply(j.items); }).catch(() => { VW.own = false; });
  };
  VK.pickOwnImage = function (raw, cat, done) {
    const fs = FSY(); if (!fs) return;
    const info = fs.merchantInfo(raw, cat);
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/png,image/jpeg,image/webp'; inp.style.display = 'none';
    inp.addEventListener('change', async () => {
      const file = inp.files && inp.files[0]; inp.remove();
      if (!file) return;
      try {
        const data = await vwResize(file);
        const j = await vwPost('/api/finance/vendor-image', { merchant: info.key, data });
        vwApply(j.items);
        if (done) done();
        toast(`${info.name} now uses your picture`, { icon: 'image', action: { label: 'Undo', run: async () => { try { const u = j.prev ? await vwPost('/api/finance/vendor-image/restore', { merchant: info.key, ref: j.prev }) : await vwPost('/api/finance/vendor-image/remove', { merchant: info.key }); vwApply(u.items); if (done) done(); } catch (e) { toast(e.message, { kind: 'err' }); } } } });
      } catch (e) { toast(e.message, { kind: 'err' }); }
    });
    document.body.appendChild(inp); inp.click();
  };
  VK.removeOwnImage = async function (raw, cat, done) {
    const fs = FSY(); if (!fs) return;
    const info = fs.merchantInfo(raw, cat);
    try {
      const j = await vwPost('/api/finance/vendor-image/remove', { merchant: info.key });
      vwApply(j.items); if (done) done();
      if (j.prev) toast(`${info.name} is back to its usual symbol`, { icon: 'image', action: { label: 'Undo', run: async () => { try { const u = await vwPost('/api/finance/vendor-image/restore', { merchant: info.key, ref: j.prev }); vwApply(u.items); if (done) done(); } catch (e) { toast(e.message, { kind: 'err' }); } } } });
    } catch (e) { toast(e.message, { kind: 'err' }); }
  };
