/* ============================================================
   WEEKLY STORY (owner: Weekly story). The "Week in review" story, played by
   the story engine (79-story-engine.js) from the model in
   79-story-weekly-model.js. Storyboard: w1 numbers, the week in three
   sentences, w2 wins montage, w3 stream progress, w4 people of the week,
   w5 slipped and why, w6 next week against capacity, w7 three outcomes,
   w8 the hand-off to the guided review (77-brief-review.js) and History.

   Beat types (Story.registerBeatType): stw-numbers, stw-sentence, stw-wins,
   stw-streams, stw-people, stw-slipped, stw-next, stw-outcomes, stw-guided.
   Everything lives in .st-cards (one .stw block per beat) except the
   sentences, which use .st-type (the engine follows the voice there) and a
   hero scene in .st-scene that follows the last entity spoken.
   Interactive beats (slipped fixes, rebalance, outcomes) stop auto-advance
   for that beat as soon as they are used (beat.auto = false).
   Entry points: the first visit to Review > Week each week (setting
   brief.story.weekOpen 'story' | 'page'), the weekly prompt, the palette.
   Styles: src/styles/79-story-weekly.css.
   ============================================================ */
const STW_CONFETTI_KEY = 'dashboard-story-week-confetti';
const STW_AUTO_KEY = 'dashboard-story-week-auto-';

/* ---------- what only the page knows ---------- */
function _stwEnv(ctx) {
  const items = typeof getAllItems === 'function' ? getAllItems() : [];
  let draft = null;
  try { draft = typeof _wkDraft === 'function' ? _wkDraft() : null; } catch (e) { draft = null; }
  const pending = (typeof state !== 'undefined' && state.emailTriage && Array.isArray(state.emailTriage.suggestions)) ? state.emailTriage.suggestions.filter(s => s && s.status === 'pending').length : 0;
  return {
    tasks: items.map(i => ({ id: i.id, title: effTitle(i), stream: effStream(i), done: statusOf(i.id) === 'done', estimate: Number(i.estimate) || 0, due: effDate(i), priority: effPriority(i) })),
    completions: (typeof state !== 'undefined' && state.completionLog) || {},
    streams: typeof STREAMS !== 'undefined' ? STREAMS : {},
    person: (id) => {
      const p = ctx.person(id);
      if (!p || p.inactive || p.self) return null;
      const first = p.first || String(p.name || '').replace(/^(dr|prof|professor|mr|mrs|ms|miss|mx)\.?\s+/i, '').split(/\s+/)[0];
      return { id, name: p.name, first, color: p.color, avatarUrl: p.avatarUrl, kind: p.kind, lastContact: p.lastContact || null };
    },
    peopleAll: (typeof state !== 'undefined' && Array.isArray(state.people) ? state.people : []).filter(p => p && !p.self && !p.inactive),
    dayOf: (ms) => Clock.parts(Number(ms)).iso,
    pending, draft,
    steps: typeof WEEK_STEPS !== 'undefined' ? WEEK_STEPS : null,
  };
}

storyRegisterBuilder('week', (ctx) => {
  const m = stwWeekModel(ctx.data, _stwEnv(ctx));
  _stwAurora(m);
  return stwBuildBeats(m, ctx.script || {}, { sceneFor: (ents, fb) => (typeof storySceneFor === 'function' ? storySceneFor(ents, ctx, fb) : fb), chipsMax: 4 });
});

/* ---------- the stage: an aurora in the colours of the week's streams ---------- */
function _stwAurora(m) {
  const bg = document.querySelector('.story[data-kind="week"] .st-bg');
  if (!bg) return;
  const def = ['var(--sw-indigo)', 'var(--sw-teal)', 'var(--sw-pink)', 'var(--sw-amber)'];
  const cols = def.map((c, i) => (m.aurora[i] ? safeColor(m.aurora[i], c) : c));
  let aur = bg.querySelector('.stw-aur');
  if (!aur) {
    aur = document.createElement('div'); aur.className = 'stw-aur'; aur.setAttribute('aria-hidden', 'true');
    aur.innerHTML = '<i></i><i></i><i></i><i></i>';
    bg.insertBefore(aur, bg.firstChild);
  }
  [...aur.children].forEach((el, i) => el.style.setProperty('--c', cols[i]));
}

/* ---------- small helpers ---------- */
const _stwIn = (i, extra) => `style="--i:${i}${extra ? ';' + extra : ''}"`;
function _stwHead(b, extra) {
  return `<header class="stw-head"><div><div class="stw-over stw-in" ${_stwIn(0)}>${esc(b.overline || '')}</div><h2 class="stw-h stw-in" ${_stwIn(1)}>${esc(b.title || '')}</h2></div>${extra || ''}</header>`;
}
function _stwAv(p, size) { return p ? STORY_KIT.avatarHtml({ id: p.id, name: p.name, color: p.color, avatarUrl: p.avatarUrl, kind: p.kind }, size) : ''; }
function _stwColor(c, fb) { return typeof safeColor === 'function' ? safeColor(c, fb || 'var(--accent)') : (fb || 'var(--accent)'); }
/** Count every [data-to] up once its card has landed. */
function _stwCount(el, base) {
  el.querySelectorAll('[data-to]').forEach((x, k) => {
    const dec = Number(x.dataset.dec) || 0;
    STORY_KIT.countUp(x, Number(x.dataset.to) || 0, { delay: (Number(x.dataset.delay) || base || 320) + k * 70, duration: 900, format: (n) => n.toFixed(dec) });
  });
}
/** Using a beat stops its auto-advance (the progress segment shows it is waiting). */
function _stwHold(b) {
  if (!b || b.auto === false) return;
  b.auto = false;
  const seg = document.querySelector('.story .st-seg.is-cur');
  if (seg) seg.classList.add('stw-held');
}
function _stwFresh(b) {
  b.auto = b._auto0;
  document.querySelectorAll('.story .st-seg.stw-held').forEach(s => s.classList.remove('stw-held'));
}
function _stwConfettiDue(ctx) {
  if (ctx.reduced) return false;
  try { if (localStorage.getItem(STW_CONFETTI_KEY) === todayStrSafe()) return false; localStorage.setItem(STW_CONFETTI_KEY, todayStrSafe()); } catch (e) { return false; }
  return true;
}
function _stwConfetti(n) {
  const cols = ['var(--sw-pink)', 'var(--sw-amber)', 'var(--sw-indigo)', 'var(--sw-teal)', 'var(--sw-violet)', 'var(--sw-green)'];
  let h = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, d = 90 + (i * 53) % 120;
    h += `<i style="--tx:${(Math.cos(a) * d).toFixed(0)}px;--ty:${(Math.sin(a) * d * 0.8 + 60).toFixed(0)}px;--r:${(i * 67) % 360}deg;--c:${cols[i % cols.length]};--k:${i % 4}"></i>`;
  }
  return `<span class="stw-conf" aria-hidden="true">${h}</span>`;
}
/** Remove a card and slide the ones below into place (FLIP, transform only). */
function _stwRemove(el, reduced) {
  const parent = el.parentNode; if (!parent) return;
  const sibs = [...parent.children].filter(x => x !== el);
  const before = new Map(sibs.map(s => [s, s.getBoundingClientRect().top]));
  el.classList.add('is-gone');
  setTimeout(() => {
    el.remove();
    if (reduced) return;
    for (const s of sibs) {
      const dy = before.get(s) - s.getBoundingClientRect().top;
      if (!dy) continue;
      s.style.transition = 'none'; s.style.transform = `translateY(${dy}px)`;
      requestAnimationFrame(() => { s.style.transition = 'transform 320ms var(--m-ease-out, cubic-bezier(.22,1,.36,1))'; s.style.transform = ''; });
    }
  }, reduced ? 0 : 260);
}
/** Type text into an input at about 55 characters a second (instant when still). */
function _stwTypeInto(inp, text, still, done) {
  const arr = Array.from(String(text || ''));
  if (still) { inp.value = arr.join(''); if (done) done(); return; }
  let i = 0;
  const step = () => {
    if (!inp.isConnected) return;
    i = Math.min(arr.length, i + 1);
    inp.value = arr.slice(0, i).join('');
    if (i < arr.length && !document.hidden) setTimeout(step, 18);
    else { inp.value = arr.join(''); if (done) done(); }
  };
  step();
}
function _stwBtn(label, ic, cls, run) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'stw-btn' + (cls ? ' ' + cls : '');
  b.innerHTML = (ic ? icon(ic, 'i-sm') : '') + `<span>${esc(label)}</span>`;
  b.addEventListener('click', (e) => { e.stopPropagation(); run(b, e); });
  return b;
}

/* ---------- 1. the week in numbers ---------- */
storyRegisterBeatType('stw-numbers', (f, b) => {
  _stwFresh(b);
  const m = b.m, n = m.numbers;
  const dayL = m.days.map(x => STW_WEEKDAYS[_stwWd(x)].charAt(0));
  const spark = (vals) => {
    const max = Math.max(1, ...vals), pk = vals.indexOf(Math.max(...vals));
    return `<div class="stw-spark" aria-hidden="true">${vals.map((v, k) => `<i class="${v && k === pk ? 'pk' : ''}${v ? '' : ' z'}" style="--h:${Math.max(5, Math.round(v / max * 100))}%;--k:${k}"></i>`).join('')}</div><div class="stw-days" aria-hidden="true">${dayL.map(x => `<span>${esc(x)}</span>`).join('')}</div>`;
  };
  const delta = (dir, ic, text) => `<span class="stw-dlt ${dir}">${icon(ic, 'i-sm')}<span>${esc(text)}</span></span>`;
  const cards = [];
  const dl = n.delta;
  cards.push({ tone: 'indigo', v: n.done, label: n.done === 1 ? 'task done' : 'tasks done',
    sub: dl === null ? '' : dl > 0 ? delta('up', 'arrow-up', `${dl} more than last week`) : dl < 0 ? delta('dn', 'arrow-down', `${-dl} fewer than last week`) : delta('flat', 'minus', 'Same as last week'),
    viz: spark(n.byDay) });
  if (n.minutes >= 30) cards.push({ tone: 'teal', v: n.hours, dec: n.hours % 1 ? 1 : 0, unit: 'h', label: 'in meetings and events', sub: delta('flat', 'calendar', stwPlural(n.events, 'event')), viz: spark(n.minutesByDay) });
  if (n.people.length) {
    const top = m.people.top;
    cards.push({ tone: 'pink', v: n.people.length, label: n.people.length === 1 ? 'person seen' : 'people seen', sub: top ? delta('flat', 'heart', `Most with ${top.p.first || top.p.name}`) : '',
      viz: `<div class="stw-avs">${n.people.slice(0, 6).map((p, k) => `<span class="stw-av" style="--k:${k}">${_stwAv(p, 34)}</span>`).join('')}${n.people.length > 6 ? `<span class="stw-more">+${n.people.length - 6}</span>` : ''}</div>` });
  }
  cards.push({ tone: 'amber', v: n.activeDays, unit: ` of ${n.daysSoFar}`, label: n.daysSoFar === 7 ? 'days with something done' : 'days so far with something done', sub: n.activeDays >= Math.min(5, n.daysSoFar) ? delta('up', 'trending-up', 'A steady rhythm') : '',
    viz: `<div class="stw-dots" aria-hidden="true">${n.byDay.map((v, k) => `<i class="${v ? 'on' : ''}${m.days[k] > m.today ? ' fut' : ''}" style="--k:${k}"></i>`).join('')}</div><div class="stw-days" aria-hidden="true">${dayL.map(x => `<span>${esc(x)}</span>`).join('')}</div>` });
  f.cards.innerHTML = `<div class="stw stw-numbers">${_stwHead(b)}<div class="stw-nums" style="--n:${cards.length}">${cards.map((c, k) => `
    <div class="stw-nb stw-glass stw-in tone-${c.tone}" ${_stwIn(2 + k)}>
      <span class="stw-v"><b class="stw-num" data-to="${escAttr(c.v)}" data-dec="${c.dec || 0}" data-delay="${380 + k * 70}">${esc((c.dec ? Number(c.v).toFixed(c.dec) : c.v))}</b>${c.unit ? `<small>${esc(c.unit)}</small>` : ''}</span>
      <span class="stw-l">${esc(c.label)}</span>${c.sub}
      <div class="stw-viz">${c.viz}</div>
    </div>`).join('')}</div></div>`;
  _stwCount(f.cards);
});

/* ---------- the week in three sentences (kinetic, read aloud; chips pop as they are named) ---------- */
storyRegisterBeatType('stw-sentence', (f, b, ctx) => {
  _stwFresh(b);
  const pips = Array.from({ length: b.count }, (_, k) => `<i class="${k < b.idx ? 'is-full' : k === b.idx ? 'is-cur' : ''}"></i>`).join('');
  const over = b.count === 3 ? 'Your week in three sentences' : b.count === 2 ? 'Your week in two sentences' : 'Your week in a sentence';
  const trail = b.all.slice(0, b.idx).map((t, k) => `<p class="stw-trail-l" style="--k:${b.idx - k}">${esc(t)}</p>`).join('');
  f.type.innerHTML = `<div class="stw-sent"><div class="stw-over stw-sent-over">${esc(over)}<span class="stw-pips" aria-hidden="true">${pips}</span></div>${trail ? `<div class="stw-trail" aria-hidden="true">${trail}</div>` : ''}<p class="st-sentence" data-caption="1">${STORY_KIT.sentenceHtml(b.text, b.entities, { mode: 'word' })}</p></div>`;
  let cur = typeof b.scene === 'string' ? b.scene : 'review';
  f.scene.innerHTML = `<div class="stw-hero">${STORY_KIT.sceneHtml(cur, { size: 'hero' })}</div>`;
  if (b.chips && b.chips.length) f.cards.innerHTML = `<div class="st-chips stw-chips">${STORY_KIT.chipsHtml(b.chips, ctx)}</div>`;
  // The hero scene follows the last thing the voice named; the pip fills with the words.
  const sceneOf = (key) => {
    const i = String(key || '').indexOf('|'); if (i < 0) return null;
    const type = key.slice(0, i), ref = key.slice(i + 1);
    if (type === 'event') { const e = ctx.event(ref); return e && e.type; }
    if (type === 'task') { const t = ctx.task(ref); return t && t.type; }
    if (type === 'deadline') return 'deadline';
    if (type === 'person') { const p = ctx.person(ref); return p && p.celebration ? (p.celebration.kind === 'birthday' ? 'birthday' : 'celebration') : 'one-on-one'; }
    return null;
  };
  const swap = (type) => {
    if (!type || type === cur) return;
    cur = type;
    const host = f.scene.querySelector('.stw-hero'); if (!host) return;
    const old = [...host.children];
    host.insertAdjacentHTML('beforeend', STORY_KIT.sceneHtml(type, { size: 'hero' }));
    if (!ctx.reduced && host.lastElementChild) host.lastElementChild.classList.add('is-live');
    old.forEach(o => { o.classList.remove('is-live'); o.classList.add('stw-out'); setTimeout(() => o.remove(), ctx.reduced ? 0 : 440); });
  };
  const words = [...f.type.querySelectorAll('[data-caption] .st-w')];
  const pip = f.type.querySelector('.stw-pips .is-cur');
  const hot = new Set();
  let raf = 0;
  const tick = () => {
    raf = 0;
    if (pip && words.length) pip.style.setProperty('--p', String(words.filter(w => w.classList.contains('is-said') || w.classList.contains('is-now')).length / words.length));
    f.type.querySelectorAll('.st-ent.is-hot').forEach(e => { if (!hot.has(e.dataset.key)) { hot.add(e.dataset.key); swap(sceneOf(e.dataset.key)); } });
  };
  const mo = new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(tick); });
  mo.observe(f.type, { subtree: true, attributes: true, attributeFilter: ['class'] });
  return () => { mo.disconnect(); if (raf) cancelAnimationFrame(raf); };
});

/* ---------- 2. wins montage ---------- */
storyRegisterBeatType('stw-wins', (f, b, ctx) => {
  _stwFresh(b);
  const w = b.m.wins, big = w[0], rest = w.slice(1, 5);
  const rots = ['-1deg', '1deg', '0.6deg', '-0.8deg'];
  const fire = _stwConfettiDue(ctx);
  const card = (x, i, isBig) => `<article class="stw-wc${isBig ? ' big' : ''} stw-glass stw-deal" style="--i:${i};--rot:${isBig ? '0deg' : rots[i % 4]};--c:${escAttr(_stwColor(x.color, 'var(--sw-violet)'))}">
      ${isBig && fire ? _stwConfetti(16) : ''}${animSceneHtml(isBig ? stwSceneOr(x.type, 'celebration') : x.type, { size: isBig ? 'hero' : 'lg' })}
      <span class="stw-tag">${isBig ? icon('trophy', 'i-sm') + `<span>${w.length > 1 ? 'Biggest win' : 'Win of the week'}</span>` : `<span>${esc(x.stream || 'Done')}</span>`}${x.weekday ? `<span>· ${esc(x.weekday.slice(0, 3))}</span>` : ''}</span>
      <div class="stw-wt" title="${escAttr(x.full)}">${esc(x.title)}</div>${x.desc ? `<div class="stw-wd">${esc(x.desc)}</div>` : ''}
    </article>`;
  f.cards.innerHTML = `<div class="stw stw-winsb">${_stwHead(b)}<div class="stw-wins n${Math.min(5, w.length)}">${rest.map((x, k) => card(x, k, false)).join('')}${card(big, rest.length, true)}</div></div>`;
});

/* ---------- 3. stream progress ---------- */
storyRegisterBeatType('stw-streams', (f, b) => {
  _stwFresh(b);
  const rows = b.m.streams;
  const top = rows.find(x => x.week > 0);
  const key = `<span class="stw-key stw-in" ${_stwIn(1)}><span><i class="k-a"></i>before this week</span><span><i class="k-b"></i>this week</span></span>`;
  f.cards.innerHTML = `<div class="stw stw-streamsb">${_stwHead(b, key)}<div class="stw-strm">${rows.map((x, k) => {
    const a = Math.max(0, Math.min(100, x.before)), g = Math.max(0, Math.min(100 - a, x.gainRaw));
    return `<div class="stw-sx stw-glass stw-in${x === top ? ' top' : ''}${x.week ? '' : ' still'}" ${_stwIn(2 + k, `--c:${escAttr(_stwColor(x.color, 'var(--accent)'))};--a:${a.toFixed(1)}%;--b:${g.toFixed(1)}%;--k:${k}`)}>
      <span class="stw-nm"><span class="stw-dot"></span><span>${esc(x.label)}</span></span>
      <span class="stw-br" aria-hidden="true"><i class="a"></i><i class="b"></i></span>
      <span class="stw-pc"><b data-to="${x.pct}" data-delay="${500 + k * 70}">${x.pct}</b>%</span>
      <span class="stw-dl${x.week ? '' : ' z'}">${x.week ? `+${x.gain} ${x.gain === 1 ? 'pt' : 'pts'} · ${x.week} done` : 'no change'}</span>
    </div>`;
  }).join('')}</div></div>`;
  _stwCount(f.cards);
});

/* ---------- 4. people of the week ---------- */
const STW_SLOTS = [[50, 13], [81, 31], [19, 34], [74, 73], [26, 74], [50, 81], [92, 56], [8, 58]];
storyRegisterBeatType('stw-people', (f, b) => {
  _stwFresh(b);
  const P = b.m.people;
  const phone = window.innerWidth < 640 || window.innerHeight < 640;
  const k = phone ? 0.6 : Math.max(0.7, Math.min(1, (window.innerHeight - 260) / 600));
  const live = P.nodes.filter(n => !n.faded), faded = P.nodes.filter(n => n.faded);
  const maxMin = Math.max(1, ...live.map(n => n.minutes));
  const placed = [];
  live.forEach((n, i) => placed.push({ n, at: STW_SLOTS[i], sz: Math.round((54 + 50 * Math.sqrt(n.minutes / maxMin)) * k) }));
  faded.forEach((n, i) => placed.push({ n, at: STW_SLOTS[6 + i] || STW_SLOTS[5 - i], sz: Math.round(44 * k) }));
  const lines = placed.map(x => `<line x1="50" y1="50" x2="${x.at[0]}" y2="${x.at[1]}" vector-effect="non-scaling-stroke" class="${x.n.faded ? 'f' : ''}"/>`).join('');
  const nodes = placed.map((x, i) => `<div class="stw-nd${x.n.faded ? ' faded' : ''}" data-name="${escAttr(String(x.n.p.first || x.n.p.name || '').toLowerCase())}" style="--x:${x.at[0]}%;--y:${x.at[1]}%;--k:${i}">${_stwAv(x.n.p, x.sz)}<b>${esc(x.n.p.first || x.n.p.name)}</b>${phone ? '' : `<small>${esc(x.n.meta)}</small>`}</div>`).join('');
  const rowsHtml = (list) => list.map(r => `<div class="stw-prow" data-name="${escAttr(String(r.p.first || r.p.name || '').toLowerCase())}">${_stwAv(r.p, 30)}<span><b>${esc(r.p.first || r.p.name)}</b><small>${esc(r.why)}</small></span></div>`).join('');
  const cards = [];
  if (P.reach.length) cards.push(['Next week', 'calendar', P.reach]);
  if (P.thanks.length) cards.push(['Say thanks', 'heart', P.thanks]);
  if (P.fresh.length) cards.push(['New this week', 'user-plus', P.fresh]);
  f.cards.innerHTML = `<div class="stw stw-peopleb">${_stwHead(b)}<div class="stw-pow${placed.length ? '' : ' no-cons'}">
    ${placed.length ? `<div class="stw-cons stw-in" ${_stwIn(2)}><svg class="stw-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg><span class="stw-me">You</span>${nodes}</div>` : ''}
    ${cards.length ? `<div class="stw-side">${cards.map(([t, ic, list], i) => `<div class="stw-pcard stw-glass stw-in" ${_stwIn(3 + i)}><div class="stw-over">${icon(ic, 'i-sm')}<span>${esc(t)}</span></div>${rowsHtml(list)}</div>`).join('')}</div>` : ''}
  </div></div>`;
  return stwFollowNames(f.cards);
});
/**
 * People named in the narration light up as the voice reaches them (the caption's word
 * spans carry no entities here, so match the spoken word against [data-name]).
 */
function stwFollowNames(host) {
  const cap = document.querySelector('.story .st-caption');
  if (!cap || !host) return () => {};
  const norm = (s) => String(s || '').toLowerCase().replace(/['’]s$/, '').replace(/[^\p{L}\p{N}-]/gu, '');
  let raf = 0;
  const tick = () => {
    raf = 0;
    const w = cap.querySelector('.st-w.is-now');
    const name = w ? norm(w.textContent) : '';
    if (!name) return;
    host.querySelectorAll(`[data-name="${CSS.escape(name)}"]`).forEach(el => el.classList.add('is-hot'));
  };
  const mo = new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(tick); });
  mo.observe(cap, { subtree: true, attributes: true, attributeFilter: ['class'] });
  return () => { mo.disconnect(); if (raf) cancelAnimationFrame(raf); };
}

/* ---------- 5. slipped, and why ---------- */
/** A slipped item's fix as actions-layer ops: move = a new due date (with the reason), drop = won't do. */
function stwFixOps(x) {
  if (!x || !x.id || !x.fix) return [];
  if (x.fix.act === 'move' && /^\d{4}-\d{2}-\d{2}$/.test(String(x.fix.to || ''))) return [{ op: 'task.reschedule', id: x.id, dueDate: x.fix.to, reason: 'Weekly review' }];
  if (x.fix.act === 'drop') return [{ op: 'task.wont_do', id: x.id, reason: 'Weekly review' }];
  return [];
}
storyRegisterBeatType('stw-slipped', (f, b, ctx) => {
  _stwFresh(b);
  const S = b.m.slipped;
  let left = S.total;
  f.cards.innerHTML = `<div class="stw stw-slippedb">${_stwHead(b)}<div class="stw-swy">
    <div class="stw-why stw-glass stw-in" ${_stwIn(2)}><div class="stw-bign"><b class="stw-left" data-to="${S.total}" data-delay="300">${S.total}</b></div><div class="stw-h2">slipped this week</div>
      ${S.reasons.length ? `<div class="stw-stack" aria-hidden="true">${S.reasons.map((x, k) => `<i class="t-${x.tone}" style="--f:${x.n};--k:${k}"></i>`).join('')}</div>
      <div class="stw-leg">${S.reasons.map(x => `<div><span class="stw-sq t-${x.tone}"></span><span>${esc(x.label)}</span><b>${x.n}</b></div>`).join('')}</div>` : ''}
    </div>
    <div class="stw-fixes"></div></div></div>`;
  const list = f.cards.querySelector('.stw-fixes');
  S.items.forEach((x, k) => {
    const card = document.createElement('div');
    card.className = 'stw-fx stw-glass stw-in';
    card.style.setProperty('--i', String(3 + k));
    card.innerHTML = `<div class="stw-fx-b"><div class="stw-fx-t">${esc(x.title)}</div><div class="stw-fx-m"><span class="stw-rsn t-${x.tone}">${esc(x.reason)}</span><span>${x.moves > 1 ? `moved ${x.moves === 2 ? 'twice' : x.moves + ' times'}` : 'moved once'}</span></div><div class="stw-fx-s">${icon('sparkles', 'i-sm')}<span>${esc(x.fix.text)}</span></div></div>`;
    // A fix that would change nothing (already due that day, or gone) is not offered.
    const live = typeof getItem === 'function' ? getItem(x.id) : null;
    const noop = !live || (x.fix.act === 'move' && live.dueDate === x.fix.to);
    if (x.fix.act && x.open && !noop && stwFixOps(x).length) {
      // Through the actions layer with a toast and Undo (user request, 4 Oct: story task options did nothing).
      card.appendChild(_stwBtn(x.fix.label, x.fix.act === 'drop' ? 'circle-x' : 'calendar-plus', 'pri', async (btn) => {
        if (btn && btn.disabled) return;
        _stwHold(b);
        const move = x.fix.act === 'move';
        const ops = stwFixOps(x);
        if (!ops.length) return;
        if (btn) btn.disabled = true;
        const j = await storyTaskOps(ops, {
          done: move ? `${x.title}: due ${STW_WEEKDAYS[_stwWd(x.fix.to)]}` : `${x.title}: dropped`, icon: move ? 'calendar-plus' : 'circle-x',
          onUndo: () => { left = Math.min(S.total, left + 1); const n = f.cards.querySelector('.stw-left'); if (n) n.textContent = String(left); },
        });
        if (!j) { if (btn) btn.disabled = false; return; }
        left = Math.max(0, left - 1);
        const n = f.cards.querySelector('.stw-left'); if (n) n.textContent = String(left);
        _stwRemove(card, ctx.reduced);
      }));
    }
    list.appendChild(card);
  });
  _stwCount(f.cards);
});

/* ---------- 6. next week against capacity ---------- */
storyRegisterBeatType('stw-next', (f, b, ctx) => {
  _stwFresh(b);
  const N = b.m.next;
  const frac = (min) => Math.max(0, Math.min(1.4, min / N.scale)).toFixed(4);
  const segs = (c) => {
    const inside = Math.min(c.total, STW_CAP_MIN), bk = Math.min(c.booked, STW_CAP_MIN), pl = Math.max(0, inside - bk);
    return { bk, pl, ov: c.over };
  };
  const col = (c, k) => {
    const s = segs(c);
    return `<div class="stw-col${c.over ? ' over' : ''}${c.warn ? ' warn' : ''}" data-date="${escAttr(c.date)}" style="--k:${k}">
      <i class="stw-sg mt" style="--b:0;--h:${frac(s.bk)}"></i><i class="stw-sg pl" style="--b:${frac(s.bk)};--h:${frac(s.pl)}"></i><i class="stw-sg ov" style="--b:${frac(STW_CAP_MIN)};--h:${frac(s.ov)}"></i>
      ${c.deadline ? `<span class="stw-dlm" style="--b:${frac(Math.max(c.total, 30))}" title="${escAttr(c.deadline.title)}">${animSceneHtml('deadline', { size: 'xs' })}<span>${esc(c.deadline.title)}</span></span>` : ''}
    </div>`;
  };
  const name = (c) => `<div class="${c.over ? 'over' : c.warn ? 'warn' : ''}" data-date="${escAttr(c.date)}"><b>${esc(c.weekday.slice(0, 3))} ${esc(String(Number(c.date.slice(8))))}</b><small>${esc(c.total ? stwHm(c.total) : 'free')}${c.tasks ? ` · ${c.tasks} due` : ''}</small></div>`;
  const total = N.days.reduce((t, c) => t + c.total, 0);
  const keyHtml = `<div class="stw-key"><span><i class="k-mt"></i>Calendar</span>${N.days.some(c => c.planned) ? '<span><i class="k-pl"></i>Planned task time</span>' : ''}${N.over.length ? '<span><i class="k-ov"></i>Over capacity</span>' : ''}<span class="stw-key-r"><b>${esc(stwHm(total))}</b> booked of ${esc(String(Math.round(STW_CAP_MIN * N.days.length / 60)))} h</span></div>`;
  f.cards.innerHTML = `<div class="stw stw-nextb">${_stwHead(b)}<div class="stw-shape stw-glass stw-in" ${_stwIn(2)}>${keyHtml}
    <div class="stw-cols" style="--cap:${frac(STW_CAP_MIN)}"><div class="stw-capline"><span>${STW_CAP_MIN / 60} h a day</span></div>${N.days.map(col).join('')}</div>
    <div class="stw-dnames">${N.days.map(name).join('')}</div>
    <div class="stw-hint-slot"></div></div></div>`;
  const slot = f.cards.querySelector('.stw-hint-slot');
  const h = N.hint;
  const paint = () => {
    N.days.forEach(c => {
      const el = f.cards.querySelector(`.stw-col[data-date="${CSS.escape(c.date)}"]`); if (!el) return;
      const s = segs(c);
      el.querySelector('.pl').style.setProperty('--b', frac(s.bk)); el.querySelector('.pl').style.setProperty('--h', frac(s.pl));
      el.querySelector('.ov').style.setProperty('--h', frac(s.ov));
      el.classList.toggle('over', c.over > 0); el.classList.toggle('warn', c.warn);
      const dm = el.querySelector('.stw-dlm'); if (dm) dm.style.setProperty('--b', frac(Math.max(c.total, 30)));
      const nm = f.cards.querySelector(`.stw-dnames [data-date="${CSS.escape(c.date)}"]`);
      if (nm) { nm.className = c.over ? 'over' : c.warn ? 'warn' : ''; nm.querySelector('small').textContent = `${c.total ? stwHm(c.total) : 'free'}${c.tasks ? ` · ${c.tasks} due` : ''}`; }
    });
  };
  if (h) {
    const box = document.createElement('div'); box.className = 'stw-hint stw-in'; box.style.setProperty('--i', '4');
    box.innerHTML = `${icon('circle-alert', 'i-sm')}<span class="stw-hint-t"><b>${esc(h.fromWd)} is ${esc(h.overBy ? stwHm(h.overBy) + ' over' : 'nearly full')}.</b> Move “${esc(h.title)}” to ${esc(h.toWd)}, which is lighter?</span>`;
    const acts = document.createElement('span'); acts.className = 'stw-hint-a';
    acts.append(
      _stwBtn('Move it', null, 'pri', async (btn) => {
        if (btn.disabled) return;
        _stwHold(b);
        const from = N.days.find(c => c.date === h.from), to = N.days.find(c => c.date === h.to);
        const shift = (sign) => { for (const [c, d] of [[from, -h.est * sign], [to, h.est * sign]]) if (c) { c.planned = Math.max(0, c.planned + d); c.total = c.booked + c.planned; c.over = Math.max(0, c.total - STW_CAP_MIN); c.load = c.total / STW_CAP_MIN; c.warn = c.load > 0.75; c.tasks += d > 0 ? 1 : -1; } paint(); };
        const putBack = () => { shift(-1); acts.remove(); box.querySelector('.stw-hint-t').textContent = 'Put back.'; };
        btn.disabled = true;
        // The actions layer, with a toast and Undo (user request, 4 Oct).
        const j = await storyTaskOps([{ op: 'task.reschedule', id: h.taskId, dueDate: h.to, reason: 'Weekly review: rebalance' }], { done: `${h.title}: moved to ${h.toWd}`, icon: 'calendar-plus', onUndo: () => { if (box.isConnected) putBack(); } });
        if (!j) { btn.disabled = false; return; }
        shift(1);
        box.querySelector('.stw-hint-t').innerHTML = `<b>Moved.</b> “${esc(h.title)}” is now on ${esc(h.toWd)}.`;
        acts.replaceChildren(_stwBtn('Undo', 'rotate-ccw', '', async (u) => { if (u.disabled || !j.undo) return; u.disabled = true; if (!(await storyTaskUndo(j.undo, putBack))) u.disabled = false; }));
      }),
      _stwBtn('Keep', null, '', () => { _stwHold(b); box.classList.add('is-gone'); }),
    );
    box.appendChild(acts);
    slot.appendChild(box);
  } else if (N.heavy.length) {
    const c = N.heavy.slice().sort((a, x) => x.load - a.load)[0];
    slot.innerHTML = `<div class="stw-hint calm stw-in" ${_stwIn(4)}>${icon('circle-alert', 'i-sm')}<span><b>${esc(c.weekday)} is ${Math.round(c.load * 100)}% booked.</b> Keep its tasks light${N.lightest && N.lightest.date !== c.date ? `; ${esc(N.lightest.weekday)} has the most room` : ''}.</span></div>`;
  } else if (N.lightest && total) {
    slot.innerHTML = `<div class="stw-hint calm ok stw-in" ${_stwIn(4)}>${icon('circle-check', 'i-sm')}<span><b>${esc(N.lightest.weekday)} has the most room</b> for deep work.</span></div>`;
  }
});

/* ---------- 7. three outcomes ---------- */
storyRegisterBeatType('stw-outcomes', (f, b, ctx) => {
  _stwFresh(b);
  const O = b.m.outcomes;
  const slots = O.slots.map(s => ({ text: s.text, area: s.area }));
  const areaColor = (label) => { const a = O.areas.find(x => x.label === label); return _stwColor(a && a.color, 'var(--sw-slate)'); };
  let timer = 0;
  const flush = () => {
    timer = 0;
    try {
      const d = typeof _wkDraft === 'function' ? _wkDraft() : null;
      if (!d) return;
      // Outcomes shown from the guided review are ours once edited here: replace them, never copy them.
      if (!Array.isArray(d.storyOutcomes) || !d.storyOutcomes.length) d.storyOutcomes = O.slots.filter(s => s.text).map(s => ({ text: s.text, area: s.area }));
      stwSyncOutcomes(d, slots);
      if (typeof _wkSaveDraft === 'function') _wkSaveDraft();
    } catch (e) { console.error('[weekly story] outcomes', e); }
  };
  const save = () => { clearTimeout(timer); timer = setTimeout(flush, 250); };
  f.cards.innerHTML = `<div class="stw stw-outb">${_stwHead(b)}<div class="stw-outs"></div><div class="stw-cands stw-in" ${_stwIn(5)}></div></div>`;
  const box = f.cards.querySelector('.stw-outs');
  const els = slots.map((s, k) => {
    const row = document.createElement('div');
    row.className = 'stw-oc stw-glass stw-in' + (s.text ? '' : ' empty');
    row.style.setProperty('--i', String(2 + k));
    row.innerHTML = `<span class="stw-no">${k + 1}</span><input class="stw-oin" maxlength="160" aria-label="Outcome ${k + 1} for next week" placeholder="${escAttr(k === 0 ? 'An outcome, not a task: “Chapter 6 draft with Sam”' : k === 1 ? 'A second outcome…' : 'A third outcome…')}"><button type="button" class="stw-area" title="Area (click to change)"><span class="stw-dot"></span><span class="stw-area-t"></span></button>`;
    const inp = row.querySelector('input'), ab = row.querySelector('.stw-area');
    inp.value = s.text;
    const paintArea = () => { ab.querySelector('.stw-area-t').textContent = s.area; ab.style.setProperty('--c', areaColor(s.area)); ab.hidden = !s.text; };
    paintArea();
    inp.addEventListener('focus', () => _stwHold(b));
    inp.addEventListener('input', () => { _stwHold(b); s.text = inp.value; row.classList.toggle('empty', !s.text.trim()); paintArea(); save(); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const nx = els[k + 1]; if (nx) nx.inp.focus(); else inp.blur(); } });
    ab.addEventListener('click', (e) => {
      e.stopPropagation(); _stwHold(b);
      const list = O.areas.map(a => a.label);
      if (!list.length) return;
      s.area = list[(list.indexOf(s.area) + 1) % list.length];
      paintArea(); ab.classList.remove('stw-popin'); void ab.offsetWidth; ab.classList.add('stw-popin'); save();
    });
    box.appendChild(row);
    return { row, inp, ab, s, paintArea };
  });
  const cands = f.cards.querySelector('.stw-cands');
  const fresh = O.suggestions.filter(x => !slots.some(s => s.text.toLowerCase() === x.text.toLowerCase()));
  if (!fresh.length) cands.remove();
  else {
    cands.innerHTML = `<span class="stw-cands-l">${icon('sparkles', 'i-sm')}<span>Ideas from your week</span></span>`;
    fresh.forEach(x => {
      cands.appendChild(_stwBtn(x.text, null, 'stw-cand', (btn) => {
        _stwHold(b);
        const t = els.find(e => !e.s.text.trim());
        if (!t) { toast('All three outcomes are named. Clear one to use this idea.', { kind: 'info' }); return; }
        btn.disabled = true; btn.classList.add('is-used');
        t.s.text = x.text; if (x.area) t.s.area = x.area;
        t.row.classList.remove('empty');
        _stwTypeInto(t.inp, x.text, ctx.reduced, () => { t.paintArea(); t.ab.classList.add('stw-popin'); save(); });
      }));
    });
  }
  return () => { if (timer) { clearTimeout(timer); flush(); } };   // leaving the beat mid-typing still saves
});

/* ---------- 8. hand-off: the guided review, or straight to History ---------- */
storyRegisterBeatType('stw-guided', (f, b) => {
  _stwFresh(b);
  const G = b.m.guided;
  const named = (() => { try { const d = _wkDraft(); return Object.values(d.outcomes || {}).reduce((t, a) => t + (Array.isArray(a) ? a.filter(Boolean).length : 0), 0); } catch (e) { return 0; } })();
  const saved = _stwSavedThisWeek();
  f.cards.innerHTML = `<div class="stw stw-guidedb"><div class="stw-gr">
    <div class="stw-gr-l"><div class="stw-over stw-in" ${_stwIn(0)}>${esc(b.overline)}</div><h2 class="stw-hero-h stw-in" ${_stwIn(1)}>${esc(b.title)}</h2>
      <p class="stw-lede stw-in" ${_stwIn(2)}>${esc(`${stwWord(G.steps.filter(s => !s.done).length, true)} short steps, about ${G.minutes} minutes.`)} ${esc(named ? `Your ${named === 1 ? 'outcome is' : named + ' outcomes are'} already in.` : 'Your answers are kept until you save.')}</p>
      <div class="stw-go stw-in" ${_stwIn(3)}></div></div>
    <div class="stw-steps stw-glass stw-in" ${_stwIn(3)}>${G.steps.map((s, i) => `<div class="stw-stp${i === G.first ? ' cur' : ''}${s.done ? ' done' : ''}" style="--n:${i}"${i === G.first ? ' aria-current="step"' : ''}><span class="stw-nn">${s.done ? icon('check', 'i-xs') : i + 1}</span><span>${esc(s.label)}</span><span class="stw-v">${esc(s.v)}</span></div>`).join('')}</div>
  </div></div>`;
  const go = f.cards.querySelector('.stw-go');
  const start = _stwBtn('Start the review', 'arrow-right', 'xl', () => storyWeekStartGuided(G.first));
  start.innerHTML = `<span>Start the review</span>${icon('arrow-right')}`;
  go.appendChild(start);
  const sv = _stwBtn(saved ? 'Saved to History' : 'Save the week to History', saved ? 'circle-check' : 'history', 'sec', async (btn) => {
    btn.disabled = true;
    const ok = await storyWeekQuickSave(b.m);
    if (ok) { btn.innerHTML = icon('circle-check', 'i-sm') + '<span>Saved to History</span>'; btn.classList.add('is-ok'); }
    else btn.disabled = false;
  });
  if (saved) sv.disabled = true;
  go.appendChild(sv);
  // The money story of the same week (src/finance/28-money-story.js), when there is money data.
  const money = window.MoneyStory ? window.MoneyStory.status() : null;
  if (money && (money.ok || !money.known)) go.appendChild(_stwBtn('Money this week', 'wallet', 'ghost', () => { let from; try { from = _wkRange().from; } catch (e) { from = undefined; } window.MoneyStory.open({ period: 'week', ref: from }); }));
  go.appendChild(_stwBtn('Later', null, 'ghost', () => storyClose()));
});

/* ---------- guided review + History ---------- */
function _stwSavedThisWeek() {
  try { const r = _wkRange(); return (state.reviews || []).some(x => x && x.kind === 'week' && x.date === r.from); } catch (e) { return false; }
}
/** Close the story and open the step-by-step review at its first open step. */
function storyWeekStartGuided(step) {
  storyClose({ quiet: true });
  try { _wkDraft(); if (typeof _wk !== 'undefined') _wk.step = Math.max(0, Math.min((WEEK_STEPS || []).length - 1, Number(step) || 0)); } catch (e) { /* the page sets it */ }
  if (state.view === 'home:week') renderMain(); else setView('home:week');
}
/** Save the week as it stands (outcomes, wins, slips, stats) as a weekly review in History. */
async function storyWeekQuickSave(m) {
  if (typeof reviewSave !== 'function' || typeof _wkRange !== 'function') return false;
  const r = _wkRange(), d = _wkDraft(), st = _wkStats(r);
  const wins = String(d.wins || '').split('\n').map(s => s.trim()).filter(Boolean);
  const op = {
    op: 'review.save', kind: 'week', date: r.from,
    outcomes: Object.entries(d.outcomes || {}).map(([area, items]) => ({ area: area.slice(0, 80), items: (items || []).map(s => String(s || '').trim()).filter(Boolean).slice(0, 3) })).filter(o => o.items.length).slice(0, 20),
    wins: (wins.length ? wins : m.wins.map(w => w.full || w.title)).slice(0, 30),
    slipped: st.slipped.slice(0, 50).map(x => ({ taskId: x.id, title: String(x.title).slice(0, 300), reason: String(x.reason).slice(0, 300) })),
    notes: d.notes || '', ...(d.summary ? { summary: d.summary } : {}),
    stats: { completed: st.completed, slipped: st.slipped.length, perStream: st.perStream.slice(0, 30).map(x => ({ stream: String(x.stream).slice(0, 80), n: x.n })), spent: typeof _bf !== 'undefined' && _bf.money && _bf.money.week ? _bf.money.week.total : null, spentAvg: typeof _bf !== 'undefined' && _bf.money && _bf.money.week ? _bf.money.week.avg : null },
  };
  const ok = await reviewSave(op, 'Weekly review saved to History');
  if (ok) { state.lastReviewPrompt = Date.now(); saveUI(); }
  return ok;
}

/* ---------- entry points ---------- */
function storyWeekPrefs() {
  const s = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.brief && APP_CONFIG.brief.story) || {};
  return { weekOpen: s.weekOpen === 'page' ? 'page' : 'story' };
}
/**
 * Home > Week calls this on every render: the first visit of each week opens
 * the story (its Play poster) over the page, once. Re-renders, Open details and
 * later visits do nothing.
 */
function storyWeekOnEnter() {
  if (storyWeekPrefs().weekOpen !== 'story' || typeof storyOpen !== 'function' || storyIsOpen()) return;
  let from = '';
  try { from = _wkRange().from; } catch (e) { return; }
  const key = STW_AUTO_KEY + from;
  try { if (localStorage.getItem(key)) return; localStorage.setItem(key, '1'); } catch (e) { return; }
  if (_stwSavedThisWeek()) return;
  setTimeout(() => { if (!storyIsOpen() && String(state.view) === 'home:week') storyOpen('week', { autoplay: false }); }, 0);
}
/** The weekly prompt's Start: the story over the Week page (plays at once: it is a click). */
function storyWeekFromPrompt() {
  if (typeof storyOpen !== 'function') { setView('home:week'); return; }
  try { localStorage.setItem(STW_AUTO_KEY + _wkRange().from, '1'); } catch (e) { /* ignore */ }
  storyOpen('week', { autoplay: true });
  if (state.view !== 'home:week') setView('home:week');
}
/** Settings > Home and stories: how the weekly review opens. */
function storyWeekSettingsRows(el) {
  if (typeof _settingsRow !== 'function' || typeof _settingsSeg !== 'function') return;
  el.appendChild(_settingsRow('Weekly review opens as', 'The first visit to Home > Week each week: the full-screen story with a Play button, or straight to the step-by-step page.',
    _settingsSeg([['story', 'Story'], ['page', 'Page']], storyWeekPrefs().weekOpen, (k) => settingsSaveConfig({ brief: { story: { weekOpen: k } } }, 'Saved').then(ok => { if (ok) render(); }))));
}
