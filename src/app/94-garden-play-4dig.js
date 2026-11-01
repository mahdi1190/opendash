/* ============================================================
   PLAY: the dig, and fossil skeletons. docs/dev/HUNDRED_PLAY.md 10-11. A patch of old ground: the brush is gentle, the pick is quick, and every tap cracks the wall.
   One free dig a day, then 3 tickets each. Pieces are items (fos:<skeleton>-<part>), and a full set gives you the skeleton, a decoration anyone can see. Pure rules at the top.
   ============================================================ */
const GP_DIG = Object.freeze({ W: 11, H: 8, crack: 34, extra: 3 });
const GP_FOSSILS = Object.freeze([
  { id: 'raptor', name: 'Raptor', parts: [['skull', 'Raptor skull', [[0, 0], [1, 0], [0, 1]]], ['ribs', 'Raptor ribs', [[0, 0], [1, 0], [2, 0], [1, 1]]], ['claw', 'Raptor claw', [[0, 0], [0, 1]]], ['tail', 'Raptor tail', [[0, 0], [1, 0], [2, 0]]]] },
  { id: 'turtle', name: 'Giant turtle', parts: [['shell', 'Turtle shell', [[0, 0], [1, 0], [0, 1], [1, 1]]], ['head', 'Turtle head', [[0, 0], [1, 0]]], ['flip', 'Turtle flipper', [[0, 0], [1, 1], [1, 0]]], ['tail', 'Turtle tail', [[0, 0]]]] },
  { id: 'mammoth', name: 'Mammoth', parts: [['skull', 'Mammoth skull', [[0, 0], [1, 0], [0, 1], [1, 1]]], ['tusk', 'Mammoth tusk', [[0, 0], [1, 0], [2, 0], [3, 0]]], ['leg', 'Mammoth leg', [[0, 0], [0, 1], [0, 2]]], ['spine', 'Mammoth spine', [[0, 0], [1, 0], [2, 0], [3, 0]]]] },
]);
const GP_GEMS = Object.freeze([['amber', 'A piece of amber', '#e8a43c', [[0, 0], [1, 0]], 2], ['jade', 'A green stone', '#4fae7a', [[0, 0], [0, 1]], 3], ['opal', 'A milky opal', '#b8d4ee', [[0, 0], [1, 0], [0, 1]], 4], ['ruby', 'A small ruby', '#d8405a', [[0, 0]], 5]]);
function _gpPiecesLeft() { const out = []; for (const F of GP_FOSSILS) for (const P of F.parts) if (gardenHas(`fos:${F.id}-${P[0]}`) < 1) out.push({ F, P }); return out; }
/** A new patch. PURE on its seed: items placed so they do not overlap, then some rock, then soil 1 to 3 deep. */
function gpDigMake(seed, wanted) {
  const r = gardenRand(seed), W = GP_DIG.W, H = GP_DIG.H, cell = [], items = [];
  for (let y = 0; y < H; y++) { cell.push([]); for (let x = 0; x < W; x++) cell[y].push({ d: 1 + Math.floor(r() * 3), item: -1, rock: false }); }
  const put = (shape, base) => { for (let t = 0; t < 40; t++) { const ox = Math.floor(r() * W), oy = Math.floor(r() * H), cells = shape.map(([a, b]) => [ox + a, oy + b]); if (cells.some(([x, y]) => x >= W || y >= H || cell[y][x].item >= 0)) continue; const id = items.length; items.push(Object.assign({ cells, got: false }, base)); for (const [x, y] of cells) cell[y][x].item = id; return true; } return false; };
  const n = 2 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    if (wanted.length && r() < 0.75) { const w = wanted[Math.floor(r() * wanted.length)]; put(w.P[2], { kind: 'fos', key: `fos:${w.F.id}-${w.P[0]}`, name: w.P[1], c: '#ece3cf' }); }
    else { const G = GP_GEMS[Math.floor(r() * GP_GEMS.length)]; put(G[3], { kind: 'gem', tickets: G[4], name: G[1], c: G[2] }); }
  }
  const rocks = 4 + Math.floor(r() * 4);
  for (let i = 0; i < rocks; i++) { const x = Math.floor(r() * W), y = Math.floor(r() * H); if (cell[y][x].item < 0) cell[y][x].rock = true; }
  return { cell, items, crack: 0, over: false };
}
function _gpDigOpen() {
  gpStage('The dig', (el) => {
    const day = _gdToday(), done = Number(gpGet('dg.' + day, 0));
    const intro = () => {
      el.textContent = '';
      el.appendChild(gpEl('p', 'gp-lead', 'Old ground, with old things in it. Clear the soil to get them out. The brush takes one layer and hardly hurts the wall. The pick takes more, in a wider patch, but the wall cracks faster. When the wall gives way, you keep only what is fully clear.'));
      el.appendChild(uiButton({ label: done ? `Dig again (${GP_DIG.extra} tickets)` : 'Start today’s dig', icon: 'shovel', kind: 'primary', disabled: done > 0 && gpTickets() < GP_DIG.extra, run: () => {
        const nd = Number(gpGet('dg.' + day, 0)); if (nd > 0) { if (gpTickets() < GP_DIG.extra) return; gpSpend('a dig', { ticket: -GP_DIG.extra }, 'A new patch of ground'); }
        gpSet('dg.' + day, nd + 1); play(gpDigMake(`gpdig|${day}|${nd}|${Math.random()}`, _gpPiecesLeft()));
      } }));
      _gpFossilShelf(el);
    };
    const play = (D) => {
      let tool = 'brush';
      el.textContent = '';
      const top = gpEl('div', 'gp-digtop'), crack = gpEl('div', 'gp-crack'), bar = gpEl('i'); crack.appendChild(bar); crack.setAttribute('aria-label', 'How much the wall can take');
      const tools = gpEl('div', 'gp-row');
      const tb = (id, label, ic) => { const b = uiButton({ label, icon: ic, size: 'sm', pressed: tool === id, run: () => { tool = id; for (const x of tools.children) x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); } }); tools.appendChild(b); };
      tb('brush', 'Brush', 'feather'); tb('pick', 'Pick', 'shovel');
      top.append(tools, crack); el.appendChild(top);
      const grid = gpEl('div', 'gp-diggrid'); grid.style.setProperty('--w', GP_DIG.W); el.appendChild(grid);
      const line = gpEl('p', 'gp-scoreline', 'Tap the ground.'); el.appendChild(line);
      const paint = () => {
        bar.style.width = Math.max(0, 100 - D.crack / GP_DIG.crack * 100) + '%';
        grid.textContent = '';
        D.cell.forEach((row, y) => row.forEach((c, x) => {
          const b = gpEl('button', 'gp-dc'); b.type = 'button'; b.dataset.d = c.rock ? 'r' : c.d;
          if (c.d <= 0 && !c.rock && c.item >= 0) { const it = D.items[c.item]; b.classList.add('is-item'); b.style.setProperty('--c', it.c); if (it.got) b.classList.add('is-got'); }
          b.disabled = D.over; b.onclick = () => tap(x, y); grid.appendChild(b);
        }));
      };
      const hit = (x, y, n) => { const c = D.cell[y] && D.cell[y][x]; if (!c || c.rock || c.d <= 0) return; c.d = Math.max(0, c.d - n); };
      const check = () => {
        for (const it of D.items) {
          if (it.got || !it.cells.every(([x, y]) => D.cell[y][x].d <= 0)) continue;
          it.got = true;
          if (it.kind === 'fos') { const was = gardenHas(it.key); gpPay('dig', { items: { [it.key]: 1 }, xp: 2 }); line.textContent = `${it.name}!${was ? ' You have one of those, but it is still a nice thing to have.' : ' New for the shelf.'}`; _gpFossilCheck(); }
          else { const r = gpPay('dig', { tickets: it.tickets }); line.textContent = `${it.name}. ${gpPaidLine(r)}`; }
          gpTone([784, 988, 1175], { gap: 0.08 });
        }
        if (D.items.every(i => i.got)) end('Everything is out.');
      };
      const tap = (x, y) => {
        if (D.over) return;
        const c = D.cell[y][x]; if (c.rock) { D.crack += 2; line.textContent = 'That is solid rock. The wall did not like that.'; gpTone([140], { len: 0.1, vol: 0.05 }); }
        else if (tool === 'brush') { hit(x, y, 1); D.crack += 1; gpTone([1200], { len: 0.03, vol: 0.012, type: 'square' }); }
        else { hit(x, y, 2); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) hit(x + a, y + b, 1); D.crack += 2; gpTone([220], { len: 0.06, vol: 0.04, type: 'square' }); }
        check();
        if (!D.over && D.crack >= GP_DIG.crack) end('The wall gives way, and the rest is buried again.');
        paint();
      };
      const end = (t) => {
        D.over = true;
        const got = D.items.filter(i => i.got).length;
        line.textContent = `${t} You got ${got} of ${D.items.length}.`;
        if (el.querySelector('.gp-digagain')) return;
        const b = uiButton({ label: 'Back to the dig', size: 'sm', cls: 'gp-digagain', run: () => { setTimeout(_gpDigOpen, 0); } }); el.appendChild(b);
      };
      paint();
    };
    intro();
  });
}
function _gpFossilCheck() {
  for (const F of GP_FOSSILS) {
    if (!F.parts.every(P => gardenHas(`fos:${F.id}-${P[0]}`) > 0)) continue;
    if (gpGrant('fos-' + F.id, { ['decor:play-fos-' + F.id]: 1 })) { gpSet('ev.skeleton', 1); gardenToast(`The ${F.name.toLowerCase()} is complete. It is in your bag, to stand in the garden.`, { icon: 'gem', dismiss: true }); }
  }
}
function _gpFossilShelf(el) {
  el.appendChild(gpEl('h3', 'gp-h', 'The shelf'));
  const wrap = gpEl('div', 'gp-shelf');
  for (const F of GP_FOSSILS) {
    const c = gpEl('div', 'gp-shelfrow'), have = F.parts.filter(P => gardenHas(`fos:${F.id}-${P[0]}`) > 0).length, whole = have === F.parts.length;
    c.innerHTML = `<div class="${whole ? '' : 'gp-sil'}">${gardenIconSvg('play-fos-' + F.id, { kind: 'decor', px: 72 })}</div><b>${esc(whole ? F.name : have ? `${F.name}: ${have} of ${F.parts.length} pieces` : 'Something big, and very old')}</b><span class="muted">${esc(F.parts.filter(P => gardenHas(`fos:${F.id}-${P[0]}`) > 0).map(P => P[1]).join(', '))}</span>`;
    wrap.appendChild(c);
  }
  el.appendChild(wrap);
}
gardenPlayAdd({ id: 'dig', name: 'The dig', icon: 'shovel', group: 'games', blurb: 'Clear old ground before the wall gives way. Fossils join up into skeletons.', status: () => { const whole = GP_FOSSILS.filter(F => F.parts.every(P => gardenHas(`fos:${F.id}-${P[0]}`) > 0)).length, has = GP_FOSSILS.reduce((a, F) => a + F.parts.filter(P => gardenHas(`fos:${F.id}-${P[0]}`) > 0).length, 0); return gpGet('dg.' + _gdToday()) ? `Dug today. ${has} pieces` : `${has ? has + ' pieces, ' + whole + ' skeletons. ' : ''}A dig is free today`; }, open: _gpDigOpen });

/* ---------- the drawings: skeletons, the mill, the marble jar (a variant says how far along) ---------- */
{
  const bone = (d, w) => `<path d="${d}" fill="none" stroke="#ece3cf" stroke-width="${w || 4}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const base = (w) => `<path d="M${-w} 0h${2 * w}l-4-7h${-(2 * w - 8)}z" fill="#8a7a66"/>`;
  gartDefine('decor:play-fos-raptor', { box: [104, 84], fit: 'none', draw() {
    return base(44) + bone('M-4 -7V-22M12 -7V-22', 5) + bone('M-30 -30c10-10 30-12 44-6 8 2 14 6 18 12', 5) + bone('M-30 -30c-8 1-14 6-20 2', 4) + bone('M-14 -35v14M-7 -36v15M0 -36v15M7 -35v13', 3) + `<path d="M30 -28c8-14 22-14 26-5 2 6-8 10-20 8z" fill="#ece3cf"/><circle cx="44" cy="-30" r="2.500" fill="#4a3a2a"/>` + bone('M40 -24l8 1', 2);
  } });
  gartDefine('decor:play-fos-turtle', { box: [104, 56], fit: 'none', draw() {
    return base(44) + `<path d="M-30 -12c0-28 60-28 60 0z" fill="#ece3cf"/>` + bone('M-16 -14c2-10 8-14 16-14s14 4 16 14M0 -28v16M-9 -24l-6 12M9 -24l6 12', 2.500).replace(/#ece3cf/g, '#b8a888') + `<path d="M30 -18c10-6 20-4 20 3 0 5-12 5-20 2z" fill="#ece3cf"/><circle cx="42" cy="-15" r="1.800" fill="#4a3a2a"/>` + bone('M-22 -10l-12 3M22 -10l10 3', 5);
  } });
  gartDefine('decor:play-fos-mammoth', { box: [110, 112], fit: 'none', draw() {
    return base(48) + bone('M-26 -7V-46M-14 -7V-46M16 -7V-46M28 -7V-46', 6) + bone('M-32 -50c10-14 44-16 60-4', 6) + bone('M-20 -56v16M-10 -60v20M0 -60v20M10 -59v19M20 -56v14', 3) + `<path d="M26 -60c8-16 26-14 28 0 1 10-12 16-24 10z" fill="#ece3cf"/><circle cx="42" cy="-56" r="2.800" fill="#4a3a2a"/>` + bone('M44 -46c14 14 6 28-8 30', 5);
  } });
  gartDefine('decor:play-mill', { box: [110, 136], fit: 'none', draw(o) {
    const v = Math.max(0, Math.min(5, Number(o.variant) || 0)), c = '#a89a84', d = '#847664', roofd = '#7a3a2a';
    let s = `<path d="M-40 0V-58h52V0z" fill="${c}"/><path d="M12 0V-58h6V0z" fill="${d}"/><path d="M-40 -14h52M-40 -30h52M-40 -46h52M-26 -14v-16M-6 -30v-16M-18 -46v-12M0 0v-14" stroke="${d}" stroke-width="1.500"/>`;
    if (v < 2) s += `<path d="M-40 -58l10-6 8 8 10-10 12 6 8-6 10 8H-40z" fill="${c}"/><path d="M-30 -62l6 12-14 6z" fill="${d}"/>`;
    if (v >= 2) s += `<path d="M-48 -56l34-34 40 34z" fill="${roofd}"/><path d="M-48 -56l34-34 3 3-30 31z" fill="#94503a"/>`;
    if (v >= 3) s += `<path d="M-20 0v-22c0-10 16-10 16 0v22z" fill="#5a4028"/><circle cx="-7" cy="-11" r="1.500" fill="#e8c33a"/>`;
    else s += `<path d="M-20 0v-22c0-10 16-10 16 0v22z" fill="#2a2622"/><path d="M-20 -8h16M-18 -18l12 8" stroke="#6a4a2c" stroke-width="2"/>`;
    if (v >= 4) s += `<path d="M-34 -40h12v12h-12z" fill="#ffe08a" class="gda-glow"/><path d="M-28 -40v12M-34 -34h12" stroke="#5a4028" stroke-width="1.500"/>`;
    else s += `<path d="M-34 -40h12v12h-12z" fill="#2a2622"/>`;
    const wheel = (spin) => `<g${spin ? ' class="gda-spin" style="transform-origin: 28px -24px"' : ''}><circle cx="28" cy="-24" r="22" fill="none" stroke="#6a4a2c" stroke-width="4"/>${[0, 1, 2, 3, 4, 5].map(i => { const a = i * Math.PI / 3, x = 28 + Math.cos(a) * 24, y = -24 + Math.sin(a) * 24; return `<path d="M28 -24L${x.toFixed(1)} ${y.toFixed(1)}" stroke="#7a5a3a" stroke-width="3"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.500" fill="#7a5a3a"/>`; }).join('')}</g>`;
    if (v >= 1) s += wheel(v >= 5); else s += `<path d="M12 -2l26-16 3 3-22 18z" fill="#6a4a2c"/>`;
    if (v >= 5) s += `<path d="M6 0c12 3 34 3 46 0v5H6z" fill="#7fc4d8"/>`;
    return s;
  } });
  gartDefine('decor:play-jar', { box: [40, 56], fit: 'none', draw(o) {
    const v = Math.max(0, Math.min(6, Number(o.variant) || 0)), cols = ['#e8843c', '#3aa8c8', '#d8405a', '#7fbf5a', '#f2c21e', '#8a5ac8'];
    let s = '<path d="M-14 0c-3-14-3-26 0-34h28c3 8 3 20 0 34z" fill="#cfe6ee" opacity=".55"/><path d="M-11 -36h22v-5h-22z" fill="#8a5e36"/>';
    for (let i = 0; i < v * 3; i++) { const row = Math.floor(i / 3), x = -7 + (i % 3) * 7 + (row % 2 ? 2 : 0), y = -6 - row * 6; s += `<circle cx="${x}" cy="${y}" r="3.400" fill="${cols[i % cols.length]}"/>`; }
    return s + '<path d="M-10 -30c-2 8-2 16 0 24" fill="none" stroke="#fff" stroke-width="2" opacity=".6"/>';
  } });
}
