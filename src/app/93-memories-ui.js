/* ============================================================
   MEMORIES: shared pieces (owner: Memories). Used by the Home widgets, the
   Memories page and Wrapped; agent locations can mount the postcard album.
     memHeatmapEl({to, weeks, year, labels, cell})   a GitHub-style year of finished tasks
                                                     (a click on a day opens memDayDialog)
     memGardenModel(days), memGardenSvg(model)       the dashboard garden
     memPostcardHtml(p), memPostcardAlbumEl({limit, compact})   postcards (a click flips one)
     memCapsuleWrite(), memCapsuleReveal(id), memCapsuleListEl()  time capsules
     memDayDialog(iso)                               one day: journal, what you finished, who, where
     memGoalsDialog(year), memAdventDoor(year, day)  the seasons
     memPersonBirthdayField(v, F, field)             the person editor's Birthday box (51-people-section.js)
     memPersonRowHtml(p)                             "Birthday" and "In touch" lines on a person's details
     memMoodDecorate(card, ctx)                      the living Home scene (12-home-w-animday.js)
     memBurst()                                      a burst of confetti (Fun level Full)
   Everything escapes text (esc / escAttr / textContent); nothing moves under reduced motion
   (motion.css zeroes animations) and the art pauses while the tab is hidden.
   ============================================================ */

/* ---------- the heatmap ---------- */
function memHeatmapModel(o) {
  o = o || {};
  const today = todayStr();
  const to = o.year ? (String(o.year) + '-12-31' < today ? String(o.year) + '-12-31' : today) : (o.to || today);
  const weeks = o.year ? Math.ceil((_memBetween(_memWeekOf(String(o.year) + '-01-01'), _memWeekOf(String(o.year) + '-12-31')) + 7) / 7) : Math.max(4, Math.min(60, o.weeks || 53));
  const start = o.year ? _memWeekOf(String(o.year) + '-01-01') : _memAdd(_memWeekOf(to), -7 * (weeks - 1));
  const cells = [], counts = [];
  let total = 0;
  for (let w = 0; w < weeks; w++) for (let r = 0; r < 7; r++) {
    const iso = _memAdd(start, w * 7 + r);
    const out = iso > today || (o.year && iso.slice(0, 4) !== String(o.year));
    const n = out ? 0 : memDayCount(iso);
    if (n) counts.push(n);
    total += n;
    cells.push({ iso, w, r, n, out, today: iso === today });
  }
  counts.sort((a, b) => a - b);
  const q = (p) => counts.length ? counts[Math.min(counts.length - 1, Math.floor(counts.length * p))] : 1;
  const q50 = q(0.5), q75 = q(0.75), q90 = q(0.9);
  for (const c of cells) c.l = !c.n ? 0 : c.n >= q90 && c.n > q75 ? 4 : c.n >= q75 && c.n > q50 ? 3 : c.n >= q50 && c.n > 1 ? 2 : 1;
  const months = [];
  let prev = '';
  for (let w = 0; w < weeks; w++) { const iso = _memAdd(start, w * 7); const mo = iso.slice(0, 7); if (mo !== prev && (w > 0 || +iso.slice(8) <= 7)) months.push({ w, label: _memFmt(iso, { month: 'short' }) }); prev = mo; }
  return { start, to, weeks, cells, months, total, active: counts.length };
}
function memHeatmapEl(o) {
  o = o || {};
  const M = memHeatmapModel(o);
  const cell = o.cell || 11, gap = 3, step = cell + gap, left = o.labels === false ? 0 : 26, top = o.labels === false ? 0 : 14;
  const W = left + M.weeks * step, H = top + 7 * step;
  const ws = _memWeekStartIdx();
  let s = `<svg class="mhm-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${escAttr(`${M.total} tasks finished, on ${M.active} days`)}">`;
  if (top) for (const m of M.months) s += `<text class="mhm-m" x="${left + m.w * step}" y="9">${esc(m.label)}</text>`;
  if (left) for (const r of [1, 3, 5]) s += `<text class="mhm-d" x="0" y="${top + r * step + cell - 2}">${esc(_memFmt('2026-01-' + String(4 + ((ws + r) % 7)).padStart(2, '0'), { weekday: 'short' }))}</text>`;
  for (const c of M.cells) {
    if (c.out && o.year) continue;
    const tip = c.out ? '' : `${c.n ? _memPlural(c.n, 'task') : 'Nothing'} on ${_memFmt(c.iso, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}`;
    s += `<rect class="mhm-c mhm-l${c.l}${c.today ? ' is-today' : ''}${c.out ? ' is-out' : ''}" x="${left + c.w * step}" y="${top + c.r * step}" width="${cell}" height="${cell}" rx="2.5"${c.out ? '' : ` data-d="${c.iso}"`}>${tip ? `<title>${esc(tip)}</title>` : ''}</rect>`;
  }
  s += '</svg>';
  const el = document.createElement('div');
  el.className = 'mhm' + (o.cls ? ' ' + o.cls : '');
  el.innerHTML = s;
  el.addEventListener('click', (e) => { const r = e.target.closest && e.target.closest('rect[data-d]'); if (r) memDayDialog(r.getAttribute('data-d')); });
  el._model = M;
  return el;
}
function memHeatmapLegendHtml() {
  return `<span class="mhm-legend" aria-hidden="true">Less${[0, 1, 2, 3, 4].map(l => `<i class="mhm-l${l}"></i>`).join('')}More</span>`;
}

/* ---------- the garden ---------- */
const _MEM_PETALS = ['var(--sw-pink)', '#f2b01e', 'var(--sw-violet)', 'var(--sw-red)', 'var(--sw-orange)', 'var(--sw-blue)'];
function memGardenModel(days) {
  days = Math.max(7, Math.min(60, days || 21));
  const today = todayStr(), streak = memStreak(), total = memIndex().all.length;
  const runFrom = streak ? _memAdd(memDayCount(today) ? today : _memAdd(today, -1), -(streak - 1)) : '9999';
  const plots = [];
  for (let k = days - 1; k >= 0; k--) {
    const iso = _memAdd(today, -k), n = memDayCount(iso);
    plots.push({ iso, n, kind: _memHash(iso + '|kind') % 5, colour: _MEM_PETALS[_memHash(iso + '|c') % _MEM_PETALS.length], stage: !n ? 0 : n === 1 ? 1 : n <= 3 ? 2 : 3, bloom: n > 0 && iso >= runFrom });
  }
  const tree = [0, 10, 50, 150, 400, 1000, 2500].filter(x => total >= x).length - 1;
  const recent = plots.slice(-3).every(p => !p.n);
  const grown = plots.filter(p => p.n).length;
  const flowers = plots.filter(p => p.stage >= 2).length;
  const msg = !total ? 'Plant your first seed: finish a task and something grows here.'
    : recent ? 'The garden is resting. It will be here, just as you left it.'
    : streak >= 7 ? `${streak} days in a row: everything is in bloom${streak >= 14 ? ', and the butterflies have found it' : ''}.`
    : streak >= 3 ? `A ${streak}-day streak: the flowers are opening.`
    : `${_memPlural(grown, 'day')} of growth in the last ${days} days.`;
  return { days, plots, tree, total, streak, butterflies: streak >= 7 ? Math.min(4, 1 + Math.floor(streak / 14)) : 0, flowers, grown, resting: recent, msg };
}
function _memPlantSvg(p, x, base, w) {
  if (!p.stage) return `<ellipse class="mg-seed" cx="${x}" cy="${base}" rx="${Math.max(2, w * 0.22)}" ry="1.6"/>`;
  const hgt = p.stage === 1 ? 9 : p.stage === 2 ? 18 : 24 + (p.kind === 2 ? 8 : 0);
  const top = base - hgt;
  let s = `<g class="mg-plant${p.bloom ? ' is-bloom' : ''}" style="--d:${(2.6 + (_memHash(p.iso) % 10) / 6).toFixed(2)}s;--dl:-${(_memHash(p.iso + 's') % 30) / 10}s;transform-origin:${x}px ${base}px">`;
  s += `<path class="mg-stem" d="M${x} ${base} C ${x - 1.5} ${base - hgt * 0.4}, ${x + 1.5} ${base - hgt * 0.7}, ${x} ${top}"/>`;
  s += `<path class="mg-leaf" d="M${x} ${base - hgt * 0.35} q ${-5} ${-3} ${-7} ${-7} q ${5} ${0} ${7} ${5}z"/>`;
  if (p.stage >= 2) s += `<path class="mg-leaf" d="M${x} ${base - hgt * 0.55} q ${5} ${-3} ${7} ${-7} q ${-5} ${0} ${-7} ${5}z"/>`;
  if (p.stage === 2 && !p.bloom) s += `<ellipse class="mg-bud" cx="${x}" cy="${top}" rx="2.2" ry="3.2" style="fill:${p.colour}"/>`;
  else if (p.stage >= 2) {
    const c = p.colour, r = p.bloom ? 5.4 : 4.4;
    if (p.kind === 0) s += `<path d="M${x - r} ${top + 1} q 0 ${-r * 1.6} ${r} ${-r * 1.4} q ${r} ${-0.2} ${r} ${r * 1.4} q ${-r} ${r * 0.8} ${-r * 2} 0z" style="fill:${c}"/>`;
    else if (p.kind === 2) { for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; s += `<ellipse cx="${(x + Math.cos(a) * r).toFixed(1)}" cy="${(top + Math.sin(a) * r).toFixed(1)}" rx="2.6" ry="1.4" transform="rotate(${Math.round(a * 57.3)} ${(x + Math.cos(a) * r).toFixed(1)} ${(top + Math.sin(a) * r).toFixed(1)})" style="fill:#f2b01e"/>`; } s += `<circle cx="${x}" cy="${top}" r="${r * 0.62}" class="mg-core"/>`; }
    else if (p.kind === 4) { for (let i = 0; i < 6; i++) s += `<circle cx="${x + (i % 2 ? 1.6 : -1.6)}" cy="${top + i * 2.2}" r="1.7" style="fill:var(--sw-violet)"/>`; }
    else if (p.kind === 3) s += `<path class="mg-leaf" d="M${x} ${top + 3} q -6 -2 -8 -8 q 6 1 8 6z M${x} ${top + 3} q 6 -2 8 -8 q -6 1 -8 6z"/>`;
    else { for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; s += `<circle cx="${(x + Math.cos(a) * r * 0.75).toFixed(1)}" cy="${(top + Math.sin(a) * r * 0.75).toFixed(1)}" r="${(r * 0.5).toFixed(1)}" style="fill:${c}"/>`; } s += `<circle cx="${x}" cy="${top}" r="${(r * 0.42).toFixed(1)}" class="mg-core"/>`; }
    if (p.bloom && p.stage === 3) s += `<path class="mg-spark" d="M${x + 7} ${top - 6} l1 2.4 2.4 1 -2.4 1 -1 2.4 -1 -2.4 -2.4 -1 2.4 -1z"/>`;
  }
  return s + `<title>${esc(`${_memFmt(p.iso)}: ${p.n ? _memPlural(p.n, 'task') : 'resting'}`)}</title></g>`;
}
function memGardenSvg(g, o) {
  o = o || {};
  const W = o.w || 320, H = o.h || 118, base = H - 18;
  let s = `<svg class="mg-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax meet" role="img" aria-label="${escAttr(g.msg)}">`;
  s += `<defs><linearGradient id="mg-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--mg-sky-top)"/><stop offset="1" stop-color="var(--mg-sky-bot)"/></linearGradient></defs>`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="url(#mg-sky)"/>`;
  s += `<circle class="mg-sun" cx="${W - 34}" cy="24" r="11"/>`;
  s += `<path class="mg-hill" d="M0 ${base - 6} Q ${W * 0.3} ${base - 26} ${W * 0.6} ${base - 10} T ${W} ${base - 14} V ${H} H 0z"/>`;
  s += `<rect class="mg-soil" x="0" y="${base}" width="${W}" height="${H - base}" rx="0"/>`;
  // the tree grows with everything you ever finished
  const tx = 34, ts = [0.45, 0.6, 0.75, 0.9, 1.05, 1.2, 1.32][g.tree] || 0.45;
  s += `<g class="mg-tree" style="transform-origin:${tx}px ${base}px;transform:scale(${ts})">`
    + `<path class="mg-trunk" d="M${tx - 4} ${base} L${tx - 2.5} ${base - 34} L${tx + 2.5} ${base - 34} L${tx + 4} ${base}z"/>`
    + `<circle class="mg-canopy" cx="${tx}" cy="${base - 48}" r="20"/><circle class="mg-canopy b" cx="${tx - 13}" cy="${base - 38}" r="13"/><circle class="mg-canopy b" cx="${tx + 13}" cy="${base - 39}" r="14"/>`
    + (g.tree >= 3 ? `<circle class="mg-fruit" cx="${tx - 8}" cy="${base - 44}" r="2.4"/><circle class="mg-fruit" cx="${tx + 9}" cy="${base - 50}" r="2.4"/><circle class="mg-fruit" cx="${tx + 2}" cy="${base - 36}" r="2.4"/>` : '')
    + '</g>';
  const x0 = 70, span = W - x0 - 8, w = span / g.plots.length;
  g.plots.forEach((p, i) => { s += _memPlantSvg(p, Math.round((x0 + w * (i + 0.5)) * 10) / 10, base + 1, w); });
  for (let b = 0; b < g.butterflies; b++) {
    const y = 28 + b * 13, dl = b * 2.3;
    s += `<g class="mg-fly" style="--dl:-${dl}s;--y:${y}px"><path d="M0 0 q -5 -6 -7 -1 q 2 4 7 1z M0 0 q 5 -6 7 -1 q -2 4 -7 1z" style="fill:${_MEM_PETALS[(b + 2) % _MEM_PETALS.length]}"/></g>`;
  }
  return s + '</svg>';
}

/* ---------- postcards ---------- */
function _memPostcardArtHtml(p) {
  const it = p.art && typeof animItem === 'function' ? animItem(p.art) : null;
  if (it && typeof animItemHtml === 'function') { try { return animItemHtml(it, { size: 'lg', reduced: true, label: it.label }); } catch (e) { /* the generic card */ } }
  // the generic postcard: a seeded sky, sun, hills and sea
  const h = _memHash(p.cc), hue = h % 360, sea = (hue + 180) % 360;
  return `<svg class="mpc-gen" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="mpc-g-${escAttr(p.cc)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue} 70% 72%)"/><stop offset="1" stop-color="hsl(${(hue + 30) % 360} 80% 86%)"/></linearGradient></defs>`
    + `<rect width="160" height="100" fill="url(#mpc-g-${escAttr(p.cc)})"/><circle cx="${40 + h % 80}" cy="34" r="13" fill="hsl(${(hue + 40) % 360} 95% 92%)"/>`
    + `<path d="M0 70 L30 44 L52 62 L80 32 L112 64 L134 48 L160 66 V100 H0z" fill="hsl(${(hue + 200) % 360} 25% 42%)" opacity=".85"/>`
    + `<path d="M0 78 Q 40 72 80 78 T 160 76 V100 H0z" fill="hsl(${sea} 55% 48%)"/><path d="M0 86 Q 40 81 80 86 T 160 85" stroke="#fff" stroke-opacity=".5" fill="none"/></svg>`;
}
function memPostcardHtml(p, o) {
  o = o || {};
  const yr = String(p.from || '').slice(0, 4);
  const stats = [p.city && p.city !== p.name ? p.city : '', p.days ? _memPlural(p.days, 'day') : '', p.done ? _memPlural(p.done, 'task') + ' done' : '', p.people && p.people.length ? 'with ' + _memList(p.people) : ''].filter(Boolean).join(' · ');
  const when = p.from ? _memFmt(p.from, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  return `<article class="mpc${o.compact ? ' is-compact' : ''}" data-cc="${escAttr(p.cc)}" tabindex="0" role="button" aria-label="${escAttr(`Postcard from ${p.name}, ${when}. Turn it over`)}"><div class="mpc-in">`
    + `<div class="mpc-front"><div class="mpc-art">${_memPostcardArtHtml(p)}</div><div class="mpc-greet"><span>Greetings from</span><b>${esc(p.name)}</b></div>`
    + `<span class="mpc-stamp"><b>${esc(p.cc)}</b><small>${esc(yr)}</small></span></div>`
    + `<div class="mpc-back"><div class="mpc-lines"><p class="mpc-msg">${p.note ? esc(p.note) : `<span class="subtle">${esc(p.days > 1 ? `Your first visit: ${p.days} days in ${p.name}.` : `Your first visit to ${p.name}.`)}</span>`}</p>`
    + `<p class="mpc-stats">${esc(stats)}</p></div><div class="mpc-side"><span class="mpc-postmark"><span>${esc(when.toUpperCase())}</span></span>`
    + `${o.noEdit ? '' : `<button type="button" class="btn btn-ghost btn-sm mpc-note">${icon('pencil', 'i-sm')}<span>${p.note ? 'Edit' : 'Write on it'}</span></button>`}</div></div>`
    + '</div></article>';
}
function _memPostcardWire(root) {
  root.addEventListener('click', (e) => {
    const card = e.target.closest && e.target.closest('.mpc');
    if (!card) return;
    if (e.target.closest('.mpc-note')) { e.stopPropagation(); memPostcardNote(card.getAttribute('data-cc')); return; }
    card.classList.toggle('is-flipped');
  });
  root.addEventListener('keydown', (e) => { const card = e.target.closest && e.target.closest('.mpc'); if (card && (e.key === 'Enter' || e.key === ' ') && e.target === card) { e.preventDefault(); card.classList.toggle('is-flipped'); } });
}
/** The postcards album (newest first). o: {limit, compact, title}. Agent locations mounts this in its tab. */
function memPostcardAlbumEl(o) {
  o = o || {};
  const el = document.createElement('div');
  el.className = 'mpc-album' + (o.compact ? ' is-compact' : '');
  const list = memPostcards().slice(0, o.limit || 200);
  if (!list.length) {   // a section's teaching empty state (UI_CLEANUP_PLAN.md 3.6); not a grid
    el.className = 'mpc-album-empty';
    mountEmptyState(el, { icon: 'map', compact: true, title: 'No postcards yet', text: 'Your first visit to a new country makes one. Trips come from your calendar and time zone (Settings > Travel & time).',
      actions: [{ label: 'Travel & time', icon: 'globe', run: () => setView('settings:time') }] });
    return el;
  }
  el.innerHTML = list.map(p => memPostcardHtml(p, o)).join('');
  _memPostcardWire(el);
  return el;
}
function memPostcardNote(cc) {
  const p = memState().postcards[cc];
  if (!p) return;
  let ta;
  openDialog({
    title: `Postcard from ${p.name}`, size: 'sm',
    body: (el) => {
      ta = document.createElement('textarea'); ta.className = 'control mem-ta'; ta.rows = 4; ta.maxLength = 300; ta.placeholder = 'Wish you were here… What do you want to remember about this trip?'; ta.value = p.note || '';
      el.appendChild(ta);
    },
    actions: [{ label: 'Cancel' }, { label: 'Save', primary: true, run: () => { p.note = ta.value.trim().slice(0, 300); memSave(); render(); toast('Written on the postcard', { kind: 'ok', icon: 'pencil' }); } }],
  });
}

/* ---------- time capsules ---------- */
function _memCapsuleChoices() {
  const t = todayStr(), y = +t.slice(0, 4);
  const out = [['In a month', _memMonthsAgo(t, -1)], ['In 6 months', _memMonthsAgo(t, -6)], ['In a year', _memMonthsAgo(t, -12)], ['New Year’s Day', (y + 1) + '-01-01']];
  const bd = typeof APP_CONFIG.birthday === 'string' ? memNextBirthday({ birthday: APP_CONFIG.birthday }, _memAdd(t, 1)) : null;
  if (bd) out.splice(3, 0, ['On my birthday', bd.iso]);
  return out;
}
/** Write a note to your future self. */
function memCapsuleWrite(prefill) {
  let ta, date, pick = _memCapsuleChoices()[2][1];
  openDialog({
    title: 'A note to your future self', size: 'md', resizeKey: 'mem-capsule',
    body: (el) => {
      el.classList.add('mem-cap-form');
      const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'It stays sealed until the day you choose, then arrives on Home like a letter. It syncs to your other computers, sealed.'; el.appendChild(p);
      ta = document.createElement('textarea'); ta.className = 'control mem-ta'; ta.rows = 7; ta.maxLength = 4000; ta.setAttribute('autofocus', '');
      ta.placeholder = 'Dear future me,\n\nRight now I am working on… I hope that by the time you read this…';
      ta.value = prefill || '';
      el.appendChild(ta);
      const seg = document.createElement('div'); seg.className = 'mem-cap-when';
      const lab = document.createElement('span'); lab.className = 'field-label'; lab.textContent = 'Open it'; seg.appendChild(lab);
      const row = document.createElement('div'); row.className = 'mem-chips';
      date = document.createElement('input'); date.type = 'date'; date.className = 'control control-sm'; date.min = _memAdd(todayStr(), 1); date.value = pick;
      const mark = () => row.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.d === date.value ? 'true' : 'false'));
      for (const [label, iso] of _memCapsuleChoices()) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.dataset.d = iso; b.textContent = label;
        b.title = _memFmtLong(iso);
        b.onclick = () => { date.value = iso; mark(); };
        row.appendChild(b);
      }
      date.oninput = mark;
      row.appendChild(date);
      seg.appendChild(row);
      el.appendChild(seg);
      mark();
    },
    actions: [{ label: 'Cancel' }, { label: 'Seal it', primary: true, run: () => {
      const c = memCapsuleAdd(ta.value, date.value);
      if (!c) { toast(!ta.value.trim() ? 'Write something first' : 'Pick a day after today', { icon: 'triangle-alert' }); return false; }
      render();
      toast(`Sealed until ${_memFmt(c.opens, { day: 'numeric', month: 'long', year: 'numeric' })}`, { kind: 'ok', icon: 'lock' });
      if (memFunLevel() !== 'off') memBurst('hearts');
      return true;
    } }],
  });
}
/** Open a capsule whose day has come: the envelope opens, the letter rises. */
function memCapsuleReveal(id) {
  const c = memCapsules().find(x => x.id === id);
  if (!c) return;
  if (c.opens > todayStr()) { toast(`Sealed until ${_memFmt(c.opens, { day: 'numeric', month: 'long', year: 'numeric' })}`, { icon: 'lock' }); return; }
  const first = !c.opened;
  memCapsuleOpen(id);
  const written = Clock.parts(c.created).iso;
  openDialog({
    title: 'A letter from past you', size: 'md', resizeKey: 'mem-capsule-open',
    body: (el) => {
      el.classList.add('mem-letter-b');
      el.innerHTML = `<div class="mem-env${first ? ' is-opening' : ' is-open'}" aria-hidden="true"><div class="mem-env-back"></div><div class="mem-env-paper"></div><div class="mem-env-front"></div><div class="mem-env-flap"></div></div>`
        + `<div class="mem-letter${first ? ' is-rising' : ''}"><p class="mem-letter-meta"></p><div class="mem-letter-text"></div></div>`;
      el.querySelector('.mem-letter-meta').textContent = `Written on ${_memFmtLong(written)}, ${_memPlural(_memBetween(written, todayStr()), 'day')} ago.`;
      el.querySelector('.mem-letter-text').textContent = c.text;
    },
    actions: [{ label: 'Write another', run: () => { setTimeout(() => memCapsuleWrite(), 50); } }, { label: 'Close', primary: true }],
  });
  if (first && memFunLevel() !== 'off') setTimeout(() => memBurst('hearts'), 700);
  render();
}
function memCapsuleListEl() {
  const el = document.createElement('div'); el.className = 'mem-caps';
  const list = memCapsules().slice().sort((a, b) => (a.opened ? 1 : 0) - (b.opened ? 1 : 0) || a.opens.localeCompare(b.opens));
  if (!list.length) { mountEmptyState(el, { icon: 'mail', compact: true, title: 'No time capsules yet', text: 'Write a note to your future self. It opens on the day you choose.', actions: [{ label: 'Write a time capsule', icon: 'mail', primary: true, run: () => memCapsuleWrite() }] }); return el; }
  const today = todayStr();
  for (const c of list) {
    const ready = c.opens <= today, row = document.createElement('div');
    row.className = 'mem-cap' + (c.opened ? ' is-opened' : ready ? ' is-ready' : ' is-sealed');
    const left = _memBetween(today, c.opens);
    row.innerHTML = `<span class="mem-cap-ic">${icon(c.opened ? 'mail' : ready ? 'sparkles' : 'lock', 'i-md')}</span><div class="mem-cap-t"><b></b><span class="subtle"></span></div><span class="spacer"></span>`;
    row.querySelector('b').textContent = c.opened ? (c.text.split('\n')[0].slice(0, 80) || 'A letter') : ready ? 'Ready to open' : `Opens ${_memFmt(c.opens, { day: 'numeric', month: 'long', year: 'numeric' })}`;
    row.querySelector('.subtle').textContent = `Written ${_memFmt(Clock.parts(c.created).iso, { day: 'numeric', month: 'short', year: 'numeric' })}` + (c.opened ? ' · opened' : ready ? '' : ` · ${_memPlural(left, 'day')} to go`);
    if (c.opened || ready) row.appendChild(uiButton({ label: c.opened ? 'Read' : 'Open', kind: ready && !c.opened ? 'primary' : 'secondary', size: 'sm', run: () => memCapsuleReveal(c.id) }));
    row.appendChild(uiButton({ icon: 'trash-2', iconCls: 'i-sm', aria: 'Delete this capsule',
      run: async () => { const ok = typeof confirmDialog === 'function' ? await confirmDialog({ title: 'Delete this time capsule?', text: c.opened ? 'The letter goes for good.' : 'It has not been opened yet. It goes for good, unread.', confirmLabel: 'Delete', danger: true }) : true; if (ok) { memCapsuleDelete(c.id); render(); } } }));
    el.appendChild(row);
  }
  return el;
}

/* ---------- one day ---------- */
function memMoodPickerEl(iso) {
  const j = memState().journal[iso] || {};
  const el = document.createElement('div'); el.className = 'mem-moods'; el.setAttribute('role', 'radiogroup'); el.setAttribute('aria-label', 'How was the day?');
  for (const [v, label] of MEM_MOODS) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'mem-mood-b mem-mood-' + v; b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', j.mood === v ? 'true' : 'false'); b.title = label; b.innerHTML = `<i></i><span>${esc(label)}</span>`;
    b.onclick = () => { memJournalSetMood(iso, j.mood === v ? 0 : v); j.mood = j.mood === v ? 0 : v; el.querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', x === b && j.mood ? 'true' : 'false')); };
    el.appendChild(b);
  }
  return el;
}
function memLineInputEl(iso, o) {
  o = o || {};
  const j = memState().journal[iso] || {};
  const wrap = document.createElement('div'); wrap.className = 'mem-line';
  const inp = document.createElement('input'); inp.className = 'control'; inp.maxLength = 280;
  inp.placeholder = o.placeholder || (iso === todayStr() ? 'Today in one line…' : 'That day in one line…'); inp.value = j.line || '';
  inp.setAttribute('aria-label', 'Your line for ' + _memFmtLong(iso));
  const save = () => { if (memJournalSetLine(iso, inp.value)) { wrap.classList.add('is-saved'); setTimeout(() => wrap.classList.remove('is-saved'), 1400); if (o.onSave) o.onSave(); } };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); save(); inp.blur(); } });
  inp.addEventListener('blur', save);
  wrap.append(inp);
  const ok = document.createElement('span'); ok.className = 'mem-line-ok'; ok.innerHTML = icon('check', 'i-sm'); ok.setAttribute('aria-hidden', 'true');
  wrap.appendChild(ok);
  return wrap;
}
function memDayBodyEl(iso, o) {
  o = o || {};
  const d = memDay(iso), j = d.journal;
  const el = document.createElement('div'); el.className = 'mem-day';
  const text = (j && (j.polished || j.text)) || memJournalDraft(iso).text;
  const top = document.createElement('div'); top.className = 'mem-day-j';
  top.innerHTML = `<p class="mem-day-text"></p>`;
  top.querySelector('.mem-day-text').textContent = text || 'Nothing written for this day.';
  if (j && j.polished) { const n = document.createElement('span'); n.className = 'mem-tag'; n.innerHTML = icon('wand-sparkles', 'i-xs') + '<span>Polished by Claude</span>'; top.appendChild(n); }
  el.appendChild(top);
  el.appendChild(memLineInputEl(iso));
  el.appendChild(memMoodPickerEl(iso));
  const meta = document.createElement('div'); meta.className = 'mem-day-meta';
  if (d.place) meta.insertAdjacentHTML('beforeend', `<span class="chip">${icon(d.place.trip ? 'plane' : 'map', 'i-xs')}${esc(d.place.name)}</span>`);
  for (const [id] of d.people.slice(0, 6)) { const p = getPerson(id); if (p) meta.insertAdjacentHTML('beforeend', `<button type="button" class="chip mem-person" data-pid="${escAttr(id)}">${avatarHtml(p, 16)}<span>${esc(p.name)}</span></button>`); }
  if (meta.firstChild) el.appendChild(meta);
  meta.addEventListener('click', (e) => { const b = e.target.closest('.mem-person'); if (b && typeof openPerson === 'function') { if (o.close) o.close(); openPerson(b.dataset.pid); } });
  if (d.done.length) {
    const h = document.createElement('h4'); h.className = 'mem-h4'; h.textContent = `Finished (${d.done.length})`; el.appendChild(h);
    const ul = document.createElement('ul'); ul.className = 'mem-done';
    for (const t of d.done) {
      const li = document.createElement('li');
      li.innerHTML = `${t.stream && typeof streamMarkHtml === 'function' ? streamMarkHtml(t.stream) : ''}<span class="mem-done-t"></span><span class="subtle">${esc(_memTime(t.ts))}</span>`;
      li.querySelector('.mem-done-t').textContent = t.title;
      if (!t.gone && getItem(t.id)) { li.tabIndex = 0; li.classList.add('is-link'); li.onclick = () => { if (o.close) o.close(); openTask(t.id); }; li.onkeydown = (e) => { if (e.key === 'Enter') li.click(); }; }
      ul.appendChild(li);
    }
    el.appendChild(ul);
  } else el.appendChild(emptyLine(iso > todayStr() ? 'This day hasn’t happened yet.' : 'No tasks finished this day.'));
  return el;
}
function memDayDialog(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return;
  openDialog({
    title: _memFmtLong(iso), size: 'md', resizeKey: 'mem-day',
    body: (el, close) => { el.appendChild(memDayBodyEl(iso, { close })); },
    // The line and the mood save as you go, so the dialog ends with Done (UI_CLEANUP_PLAN.md 3.4).
    actions: [{ label: 'Open the journal', run: () => { setView('memories:journal'); } }, { label: 'Done', primary: true }],
  });
}

/* ---------- seasons ---------- */
function memGoalsDialog(year) {
  const cur = memGoals(year), prev = memGoals(year - 1);
  const inputs = [];
  openDialog({
    title: `Your goals for ${year}`, size: 'md', resizeKey: 'mem-goals',
    body: (el) => {
      el.classList.add('mem-goals-form');
      if (prev.length) {
        const h = document.createElement('h4'); h.className = 'mem-h4'; h.textContent = `Looking back: ${year - 1}`; el.appendChild(h);
        const ul = document.createElement('ul'); ul.className = 'mem-goal-list';
        for (const g of prev) {
          const li = document.createElement('li'); const b = document.createElement('button'); b.type = 'button'; b.className = 'mem-goal' + (g.done ? ' is-done' : '');
          b.setAttribute('aria-pressed', g.done ? 'true' : 'false'); b.innerHTML = `<span class="mem-goal-box">${icon('check', 'i-xs')}</span><span></span>`; b.lastChild.textContent = g.text;
          b.onclick = () => { memGoalToggle(year - 1, g.id); b.classList.toggle('is-done'); b.setAttribute('aria-pressed', b.classList.contains('is-done') ? 'true' : 'false'); };
          li.appendChild(b); ul.appendChild(li);
        }
        el.appendChild(ul);
      }
      const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Up to five things you would love this year to hold. Small or big; Wrapped shows them back to you next December.'; el.appendChild(p);
      for (let i = 0; i < 5; i++) {
        const inp = document.createElement('input'); inp.className = 'control'; inp.maxLength = 200; inp.placeholder = ['Finish the thing I keep putting off', 'Learn something new', 'See more of the people I love', 'Travel somewhere new', 'Rest more'][i];
        inp.value = cur[i] ? cur[i].text : ''; if (!i) inp.setAttribute('autofocus', '');
        inputs.push(inp); el.appendChild(inp);
      }
    },
    actions: [{ label: 'Cancel' }, { label: 'Save my goals', primary: true, run: () => { memGoalsSet(year, inputs.map(i => i.value)); render(); toast(`Saved your ${year} goals`, { kind: 'ok', icon: 'target' }); if (memFunLevel() !== 'off') memBurst(); } }],
  });
}
function memAdventDoor(year, day) {
  const text = MEM_ADVENT[(day - 1) % MEM_ADVENT.length];
  const done = memAdventDone(year, day);
  openDialog({
    title: `Advent, day ${day}`, size: 'sm',
    body: (el) => { el.innerHTML = `<div class="mem-adv-open">${icon('gift', 'i-lg')}<p></p><span class="subtle">A small kind thing for today. No pressure: tick it when it is done, or skip it.</span></div>`; el.querySelector('p').textContent = text; },
    actions: [
      { label: 'Add to today', run: () => { const id = addCustomTask(text, todayStr(), 'p0', [], null, 'none', {}); if (id) toast('Added to today', { kind: 'ok', icon: 'plus', action: { label: 'Open', run: () => openTask(id) } }); } },
      { label: done ? 'Not done after all' : 'Done', primary: true, run: () => { memAdventMark(year, day, !done); render(); if (!done && memFunLevel() !== 'off') memBurst('stars'); } },
    ],
  });
}

/* ---------- people: the birthday field and details lines ---------- */
function _memBirthdayText(b) {
  const r = /^(?:(\d{4})-)?(\d{2})-(\d{2})$/.exec(String(b || ''));
  if (!r) return '';
  return _memFmt(`${r[1] || '2000'}-${r[2]}-${r[3]}`, r[1] ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' });
}
/** The person editor's Birthday box (51-people-section.js openPersonEditor): F.birthday holds the text. */
function memPersonBirthdayField(v, F, field) {
  const i = document.createElement('input'); i.className = 'control'; i.placeholder = 'e.g. 14 March (the year is optional)'; i.autocomplete = 'off';
  i.value = _memBirthdayText(v.birthday) || '';
  F.birthday = i;
  return field('Birthday', i, 'Optional. On the day, Home and their card say so.');
}
/** Lines for a person's details: Birthday and In touch (51-people-section.js). [[icon, label, html]] */
function memPersonRows(p) {
  const out = [];
  if (!p || p.self || p.isSelf) return out;
  if (p.birthday) {
    const n = memNextBirthday(p);
    const when = n ? (n.inDays === 0 ? 'today!' : n.inDays === 1 ? 'tomorrow' : n.inDays < 45 ? `in ${n.inDays} days` : '') : '';
    out.push(['cake', 'Birthday', `<span>${esc(_memBirthdayText(p.birthday))}</span>${when ? `<span class="subtle"> · ${esc(when)}${n.turning ? esc(` (turning ${n.turning})`) : ''}</span>` : ''}`]);
  }
  const f = memFriendship(p.id);
  if (f) {
    const ago = f.daysAgo === 0 ? 'today' : f.daysAgo === 1 ? 'yesterday' : `${f.daysAgo} days ago`;
    const streak = f.weeks >= 2 ? `<span class="mem-fstreak">${icon('flame', 'i-xs')}${esc(f.weeks + ' weeks in a row')}</span>` : '';
    out.push(['heart', 'In touch', `<span>${esc('Last ' + ago)}</span>${streak}<span class="subtle">${esc(` · ${_memPlural(f.total, 'day')} together since ${_memFmt(f.sinceIso, { month: 'short', year: 'numeric' })}`)}</span>`]);
  }
  return out;
}

/* ---------- the living Home scene ---------- */
let _memMoodLayer = null;   // {key, node}: kept across re-renders so the effects do not restart
function _memMoodLayerHtml(m) {
  let s = '';
  const birds = m.key === 'buzzing' ? 5 : m.key === 'lively' ? 3 : 0;
  for (let i = 0; i < birds; i++) s += `<i class="mm-bird" style="--y:${12 + i * 9}%;--d:${9 + i * 2.5}s;--dl:-${i * 3.1}s"><svg viewBox="0 0 20 8"><path d="M1 6 Q5 0 10 5 Q15 0 19 6"/></svg></i>`;
  if (m.key === 'buzzing') { s += '<div class="mm-bunting">'; for (let i = 0; i < 14; i++) s += `<i style="--c:${_MEM_PETALS[i % _MEM_PETALS.length]};--dl:-${(i % 5) * 0.4}s"></i>`; s += '</div>'; }
  if (m.key === 'quiet') s += '<div class="mm-veil"></div><i class="mm-leaf" style="--x:22%;--dl:0s"></i><i class="mm-leaf" style="--x:68%;--dl:-5s"></i>';
  if (m.key === 'lively' || m.key === 'buzzing') for (let i = 0; i < (m.key === 'buzzing' ? 6 : 3); i++) s += `<i class="mm-spark" style="--x:${12 + (i * 37) % 76}%;--y:${18 + (i * 23) % 50}%;--dl:-${i * 0.9}s"></i>`;
  if (m.fireworks) {
    const n = m.fun === 'full' ? 4 : 2;
    for (let b = 0; b < n; b++) {
      s += `<span class="mm-fw" style="--x:${18 + b * 22 + (b % 2) * 6}%;--y:${16 + (b % 2) * 14}%;--c:${_MEM_PETALS[b % _MEM_PETALS.length]};--dl:${(b * 0.9).toFixed(1)}s">`;
      for (let r = 0; r < 12; r++) s += `<i style="--r:${r * 30}deg"></i>`;
      s += '</span>';
    }
  }
  return s;
}
/** The animation of the day reacts to your day (one input: homeSceneMood()). 12-home-w-animday.js calls this. */
function memMoodDecorate(card, ctx) {
  if (!card || (ctx && ctx.preview)) return;
  let m;
  try { m = homeSceneMood(); } catch (e) { return; }
  card.setAttribute('data-mood', m.key);
  if (typeof document !== 'undefined') document.documentElement.setAttribute('data-home-mood', m.key);
  if (m.fun === 'off') return;
  const on = _memMotionOn();
  const key = [m.key, m.fireworks ? 1 : 0, m.fun, on ? 1 : 0, todayStr()].join('|');
  let layer = _memMoodLayer && _memMoodLayer.key === key ? _memMoodLayer.node : null;
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'mem-mood mm-' + m.key + (m.fireworks ? ' has-fw' : '') + (on ? '' : ' is-still');
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = on ? _memMoodLayerHtml(m) : (m.key === 'quiet' ? '<div class="mm-veil"></div>' : '');
    _memMoodLayer = { key, node: layer };
  }
  const t = card.querySelector('.hwa-t');
  if (t) card.insertBefore(layer, t); else card.appendChild(layer);
  if (t && (m.key !== 'calm' || m.fireworks)) {
    const chip = document.createElement('span'); chip.className = 'mem-mood-chip mm-c-' + m.key;
    chip.innerHTML = icon(m.fireworks ? 'party-popper' : m.key === 'buzzing' ? 'zap' : m.key === 'lively' ? 'sun' : 'moon', 'i-xs') + '<span></span>';
    chip.lastChild.textContent = m.fireworks ? `${m.streak}-day streak!` : m.label;
    chip.title = 'The scene follows your day (Memories)';
    t.appendChild(chip);
  }
}

/* ---------- a burst of confetti ---------- */
function memBurst(kind) {
  if (!_memMotionOn() || typeof delightFxHtml !== 'function' || document.hidden) return;
  const el = document.createElement('div');
  el.className = 'mem-burst'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = delightFxHtml(kind || 'confetti', 18, _memHash(String(Date.now())) % 97, 180);   // clock-ok: a seed
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}
