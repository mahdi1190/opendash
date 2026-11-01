/* ============================================================
   THINGS YOU HOLD AND THE LOOK OF BUILDINGS, the pages, under Play. (Rules: 94-garden-style-0rules.js.)
   ============================================================ */
function _gsFigure(px) {
  let gear = {}; try { gear = gardenGearLook(); } catch (e) { /* plain */ }
  let art = ''; try { art = gartPlayerSvg(_gplAvatar(), { dir: 's', pose: 'idle', gear }); } catch (e) { art = ''; }
  return `<svg viewBox="-60 -112 120 128" width="${px}" height="${Math.round(px * 128 / 120)}" aria-hidden="true" focusable="false">${art}</svg>`;
}
let _gsLooksTab = 'rod';
function _gsLooksPage() {
  gpStage('Things you hold', (el) => {
    const paint = () => {
      const m = gardenModel(), ctx = _gsCtx(m), tabs = [['rod', 'Rod looks', GARDEN_ROD_SKINS], ['net', 'Net looks', GARDEN_NET_SKINS], ['held', 'To carry', GARDEN_HELD]], [kind, , list] = tabs.find(t => t[0] === _gsLooksTab) || tabs[0];
      el.textContent = '';
      el.appendChild(gpEl('p', 'gp-lead', 'A rod or net look changes how it looks, not how it fishes: keep your best rod and wear your favourite. Friends see all of it.'));
      const worn = gardenLookWorn(kind), wrap = gpEl('div', 'gs-looks'), you = gpEl('div', 'gs-you'), side = gpEl('div', 'gs-looks-r');
      you.innerHTML = _gsFigure(150); wrap.append(you, side); el.appendChild(wrap);
      side.appendChild(_gdxChips(tabs.map(t => [t[0], t[1]]), kind, (k) => { _gsLooksTab = k; paint(); }));
      // what is yours, then what you can get, then what is still locked
      const rank = (r) => (gardenLookOwned(r.id) ? 0 : gardenLookOpen(r, m, ctx) ? 1 : 2), place = 'looks:' + kind;
      gardenPager(side, { key: place, items: gardenPagerOrder(place, list, r => r.id, (a, b) => rank(a) - rank(b)), grid: 'gp-prizes', row: 196, rowSm: 196, draw: (r) => {
        const own = gardenLookOwned(r.id), open = own || gardenLookOpen(r, m, ctx);
        const c = gpEl('div', 'gp-prize' + (open ? '' : ' is-locked'));
        c.innerHTML = `<div class="gp-prize-art">${gardenLookSvg(r.id, 72)}</div><b>${esc(r.name)}</b><span class="muted">${esc(own ? 'Yours' : open ? gardenLookCostLine(r.cost) : r.how)}</span>`;
        if (own) c.appendChild(uiButton({ label: worn === r.id ? 'Take it off' : 'Wear it', icon: worn === r.id ? 'x' : 'check', size: 'sm', run: () => { gardenLookWear(kind, worn === r.id ? '' : r.id); paint(); } }));
        else if (open) c.appendChild(uiButton({ label: 'Get it', icon: 'sparkles', size: 'sm', disabled: !_gsCanPay(r.cost, m), run: () => { gardenLookBuy(r.id); paint(); } }));
        return c;
      } });
    };
    paint();
  }, { fixed: true });
}
function _gsPaintPage(firstId) {
  gpStage('Paint the buildings', (el) => {
    let id = firstId || GARDEN_BUILDINGS[0].id, draft = null;
    const loadDraft = () => { draft = Object.assign({}, _gsParse(_gdG().prefs['bk_' + id])); };
    loadDraft();
    const paint = () => {
      const m = gardenModel(), ctx = _gsCtx(m), b = _GS_BUILD.get(id), was = _gsParse(_gdG().prefs['bk_' + id]), cost = gardenBuildCost(b, was, draft), changed = _GS_KEYS.some(k => (draft[k] || 0) !== (was[k] || 0));
      el.textContent = '';
      el.appendChild(gpEl('p', 'gp-lead', 'Pick how it looks and see it here first. You pay in materials when you paint, friends see it when they visit, and it stays with the building wherever it stands.'));
      const tabs = gpEl('div', 'gs-tabs');
      for (const x of GARDEN_BUILDINGS) tabs.appendChild(uiButton({ label: x.name, size: 'sm', kind: x.id === id ? 'primary' : 'secondary', run: () => { id = x.id; loadDraft(); paint(); } }));
      el.appendChild(tabs);
      const pic = gpEl('div', 'gs-build'); pic.innerHTML = gardenBuildPreview(id, draft); el.appendChild(pic);
      const act = gpEl('div', 'gs-act');
      act.appendChild(gpEl('span', 'muted', changed ? (Object.keys(cost).length ? `This takes ${gardenLookCostLine(cost)}.` : 'This is free.') : 'Nothing changed yet.'));
      act.appendChild(uiButton({ label: 'Paint it', icon: 'paintbrush', size: 'sm', disabled: !changed || !_gsCanPay(cost, m), run: () => { gardenBuildPaint(id, draft); loadDraft(); paint(); } }));
      act.appendChild(uiButton({ label: 'As it was built', icon: 'undo-2', size: 'sm', kind: 'secondary', disabled: _gsIsBlank(draft), run: () => { draft = _gsBlank(); paint(); } }));
      el.appendChild(act);
      for (const p of GARDEN_BUILD_PARTS) {
        if (!b.parts.includes(p.k)) continue;
        el.appendChild(gpEl('h3', 'gp-h', `${p.name} (${gardenLookCostLine(p.cost)})`));
        const row = gpEl('div', 'gs-swatches');
        p.opts.forEach((opt, i) => {
          const name = opt ? opt.n : 'As built', open = (draft[p.k] === i) || (was[p.k] === i) || gardenBuildOptOpen(opt, ctx);
          const sw = document.createElement('button'); sw.type = 'button';
          sw.className = 'gs-sw' + (draft[p.k] === i ? ' is-on' : '') + (open ? '' : ' is-locked');
          sw.title = open ? name : `${name}: ${opt.how}`;
          sw.setAttribute('aria-label', sw.title); sw.setAttribute('aria-pressed', draft[p.k] === i ? 'true' : 'false');
          if (opt && opt.c) sw.innerHTML = `<i style="background:${opt.c}"></i>`; else sw.textContent = name;
          if (opt && opt.c) sw.classList.add('is-col');
          sw.disabled = !open;
          sw.onclick = () => { draft[p.k] = i; paint(); };
          row.appendChild(sw);
        });
        el.appendChild(row);
      }
    };
    paint();
  });
}
gardenPlayAdd({ id: 'looks', name: 'Things you hold', icon: 'umbrella', group: 'make', blurb: 'Rod and net looks, umbrellas, balloons and lanterns. Friends see them on you.', status: () => { const n = GARDEN_ROD_SKINS.concat(GARDEN_NET_SKINS, GARDEN_HELD).filter(r => gardenLookOwned(r.id)).length; return n ? `${n} yours` : ''; }, open: () => _gsLooksPage() });
gardenPlayAdd({ id: 'paint', name: 'Paint the buildings', icon: 'paintbrush', group: 'make', blurb: 'Colours, roofs, doors, awnings and signs for each shop, paid for in materials.', status: () => { const n = GARDEN_BUILDINGS.filter(b => !_gsIsBlank(_gsParse(_gdG().prefs['bk_' + b.id]))).length; return n ? `${n} painted` : ''; }, open: () => _gsPaintPage() });
