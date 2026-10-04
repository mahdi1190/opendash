/* ============================================================
   HOME glances kit: small pieces the Money, People today and Waiting on
   widgets share (12-home-w-finance.js, -people.js, -waiting.js).
   Owner: HB4 (finance, people, waiting). CSS: 13-home-w-glances.css.
   Declarations only (it loads before 12-home.js, like the widget files).

     hglHead({icon, title, n, link: {label, title, run}})  the widget header
     hglEmpty({scene, icon, title, text, actions: [{label, icon, run, primary}]})
                                  a calm empty state (scene 64px, title, text)
     hglScene(type, o)            animSceneHtml when the library is there, else ''
     hglAnim(el, keyframes, opts) WAAPI that respects reduced motion and a hidden tab
     hglGrow(els, delay)          meters/bars grow from 0 (once per entry)
     hglAge(days)                 "6 days", "3 weeks", "2 months"
     hglMailto(person, subject, body)   a mailto: draft (never sends) or null
     hglOpenPerson(id)            the person's page
     hglTrackCurrent(row, id, focusEl)  the row whose task card is open is aria-current
     hglOpenTask(ctx, id, row, fromEl)  open it (a no-op when it is already open)
   ============================================================ */

function hglHead(o) {
  o = o || {};
  const h = document.createElement('div'); h.className = 'card-h hgl-h';
  h.innerHTML = `${icon(o.icon || 'layout-grid')}<h3>${esc(o.title || '')}</h3>${o.n ? `<span class="n hgl-n">${esc(o.n)}</span>` : ''}<span class="spacer"></span>`;
  if (o.link && typeof o.link.run === 'function') {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm hgl-link';
    b.innerHTML = `<span>${esc(o.link.label)}</span>${icon('arrow-right')}`;
    if (o.link.title) b.title = o.link.title;
    b.onclick = (e) => { e.stopPropagation(); o.link.run(); };
    h.appendChild(b);
  }
  return h;
}

function hglScene(type, o) {
  if (typeof animSceneHtml !== 'function' || !type) return '';
  try { return animSceneHtml(type, o || {}); } catch (e) { return ''; }
}

function hglEmpty(o) {
  o = o || {};
  const box = document.createElement('div'); box.className = 'hgl-emp';
  const art = o.scene ? hglScene(o.scene, { size: 'lg', hover: true }) : '';
  box.innerHTML = (art || `<span class="hgl-emp-ic">${icon(o.icon || 'sparkles')}</span>`)
    + `<h4>${esc(o.title || '')}</h4>` + (o.text ? `<p>${esc(o.text)}</p>` : '');
  const acts = (o.actions || []).filter(a => a && typeof a.run === 'function');
  if (acts.length) {
    const row = document.createElement('div'); row.className = 'hgl-emp-acts';
    for (const a of acts) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm ' + (a.primary ? 'btn-primary' : 'btn-secondary');
      b.innerHTML = (a.icon ? icon(a.icon) : '') + `<span>${esc(a.label)}</span>`;
      b.onclick = () => a.run();
      row.appendChild(b);
    }
    box.appendChild(row);
  }
  return box;
}

function _hglQuiet() { return !window.Motion || Motion.prefersReduced() || document.hidden; }
function hglAnim(el, keyframes, opts) {
  if (!el || _hglQuiet()) return null;
  return Motion.animate(el, keyframes, Object.assign({ duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }, opts || {}));
}
/** Meter fills and bars grow from 0 (scaleX, 700 ms from 320 ms): the spec's once-per-entry flourish. */
function hglGrow(els, delay) {
  const list = [...(els || [])].filter(Boolean);
  list.forEach((el, i) => hglAnim(el, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 700, delay: (delay == null ? 320 : delay) + i * 40 }));
}

function hglAge(days) {
  const d = Math.max(0, Math.round(Number(days) || 0));
  if (d < 1) return 'today';
  if (d === 1) return '1 day';
  if (d < 14) return d + ' days';
  if (d < 60) return Math.round(d / 7) + ' weeks';
  if (d < 365) return Math.round(d / 30.44) + ' months';
  const y = Math.round(d / 365);
  return y === 1 ? 'a year' : y + ' years';
}

/** The first email address a person uses, or ''. */
function _hglEmailOf(p) {
  if (!p) return '';
  const list = typeof pplPersonEmails === 'function' ? pplPersonEmails(p) : [p.email, ...(Array.isArray(p.emails) ? p.emails : [])];
  const e = (list || []).map(x => String(x || '').trim()).find(x => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(x));
  return e || '';
}
/** A draft in the mail app (mailto: never sends anything by itself), or null without an address. */
function hglMailto(p, subject, body) {
  const to = _hglEmailOf(p);
  if (!to) return null;
  const q = [];
  if (subject) q.push('subject=' + encodeURIComponent(String(subject).slice(0, 180)));
  if (body) q.push('body=' + encodeURIComponent(String(body).slice(0, 1200)));
  return 'mailto:' + encodeURIComponent(to).replace(/%40/g, '@') + (q.length ? '?' + q.join('&') : '');
}
function hglOpenMail(url) {
  if (!url) return false;
  const a = document.createElement('a'); a.href = url; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  return true;
}
function hglOpenPerson(id) {
  if (!id) return;
  const v = 'person:' + id;
  if (state.view === v) return;                               // re-selecting is a no-op
  setView(v);
}
/** First name for short labels ("Owen is waiting"). */
function hglFirst(p) {
  const n = String((p && p.name) || '').replace(/^(dr|prof|professor|mr|mrs|ms|miss|mx)\.?\s+/i, '').trim();
  return n.split(/\s+/)[0] || n || 'Someone';
}

/* The row whose task card is open (61-task-card.js tcCurrentTaskId) is the current
   item; focus comes back to the row when the card closes, which clears it. */
function hglIsCurrentTask(id) {
  try { return typeof tcCurrentTaskId === 'function' && !!id && tcCurrentTaskId() === id; } catch (e) { return false; }
}
function hglTrackCurrent(row, id, focusEl) {
  if (hglIsCurrentTask(id)) row.setAttribute('aria-current', 'true');
  (focusEl || row).addEventListener('focus', () => {
    if (!hglIsCurrentTask(id)) row.removeAttribute('aria-current');
  });
}
/** Open a task from a glance row (the centre card grows out of fromEl, focus comes back to it). */
function hglOpenTask(ctx, id, row, fromEl) {
  if (hglIsCurrentTask(id)) return;                           // already open: no-op
  for (const el of document.querySelectorAll('.hgl-row[aria-current="true"]')) el.removeAttribute('aria-current');
  if (row) row.setAttribute('aria-current', 'true');
  const from = fromEl || row;
  if (ctx && typeof ctx.openTask === 'function') ctx.openTask(id, from);
  else if (typeof homeOpenTask === 'function') homeOpenTask(id, from);
}
