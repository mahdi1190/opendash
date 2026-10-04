  // @part 24-upcoming.js · OWNER: C2 (upcomingList; Overview calls it too)
  // Bills coming up: date chip, merchant tile, when and how often, the type of
  // payment and the usual amount. Click a row for the merchant's details.
  function upcomingList(cd, ctx, days) {
    const M = ctx.M;
    const ups = M.recurring.filter(r => r.active && r.next <= M.anchor + days && r.next >= M.anchor - 3).sort((p, q) => p.next - q.next);
    cd.body.querySelectorAll('.fv-list').forEach(x => x.remove());
    cd.setSub(ups.length ? `${gbp(sum(ups, r => r.typical))} due in the next ${days} days` : '');
    if (!ups.length) { cd.setEmpty(M.recurring.length ? `Nothing expected in the next ${days} days.` : 'Recurring payments show up after two or three regular charges.'); return; }
    cd.setEmpty(null);
    const ul = h('ul', { class: 'fv-list fv-up-list' });
    for (const r of ups.slice(0, 8)) {
      const dd = r.next - M.anchor;
      const last = VK.lastTx(r.m);
      const sel = isSelMerchant(r.m);
      ul.append(h('li', null, h('button', { type: 'button', class: 'fv-row fv-up-row fsym-host' + (sel ? ' is-current' : ''), 'aria-current': sel ? 'true' : null, onclick: () => openMerchant(r.m) },
        h('span', { class: 'fv-cal', 'aria-hidden': 'true' }, h('b', { text: String(dobj(r.next).getUTCDate()) }), h('small', { text: fd(r.next, { month: 'short' }) })),
        VK.tile(r.m, r.cat, { size: 'sm', badge: false }),
        h('span', { class: 'fv-row-main' }, h('span', { class: 'fv-row-t', text: VK.groups(M).label(VK.groups(M).keyOf(r.m)) }),
          h('span', { class: 'fv-row-s', text: `${dd <= 0 ? 'due now' : dd === 1 ? 'tomorrow' : `in ${dd} days`} · ${r.freq.toLowerCase()}${r.varies ? ' · varies' : ''}` })),
        VK.badgeIf(last ? VK.kind(last) : null, { compact: true }),
        h('span', { class: 'fv-row-v', text: gbp2(r.typical) }))));
    }
    cd.body.append(ul);
  }
