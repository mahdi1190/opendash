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
  const h = cardHead({ icon: o.icon || 'layout-grid', title: o.title, count: o.n, cls: 'hgl-h' });
  if (o.link && typeof o.link.run === 'function') {
    const b = uiButton({ label: o.link.label, kind: 'ghost', size: 'sm', cls: 'hgl-link', tip: o.link.title, run: () => o.link.run() });
    b.insertAdjacentHTML('beforeend', icon('arrow-right', 'i-sm'));
    h.appendChild(b);
  }
  return h;
}

/**
 * A small button for a Home row, made by uiButton. `cls` is the class string the row writes
 * (btn-primary | btn-secondary | btn-ghost | btn-danger for the kind, btn-icon for an icon-only
 * button, then its own classes): the kind and size come from the kit, never doubled. A string with
 * none of those is a plain button (a whole row that can be clicked). Click stops are the row's.
 */
function hglBtn(cls) {
  const parts = String(cls || '').split(/s+/).filter(Boolean);
  const KIND = /^btn-(primary|secondary|ghost|danger|danger-solid)$/;
  const kindCls = parts.find(c => KIND.test(c));
  const iconOnly = parts.includes('btn-icon');
  const rest = parts.filter(c => c !== 'btn' && c !== 'btn-sm' && c !== 'btn-icon' && !KIND.test(c)).join(' ');
  const b = uiButton({ size: 'sm', kind: kindCls ? kindCls.slice(4) : 'secondary', cls: rest, bubble: true });
  if (iconOnly) b.className = (kindCls && kindCls !== 'btn-ghost' ? `btn ${kindCls} btn-sm btn-icon` : 'btn-icon btn-sm') + (rest ? ' ' + rest : '');
  else if (!parts.includes('btn') && !kindCls) b.className = rest;
  return b;
}

/**
 * The Money cards (Money, Payday & safe to spend) while another computer reads the bank and nothing
 * has come yet (SIMPLIFY_PLAN.md 5.11, L17) -> the options for ctx.off().
 *   rm: {name, online, trial} (lib/finance-share.mjs); o: {title, icon, reload(), open()}
 *   Preview mode (rm.trial: Sync's "Preview changes first" is on here): "{name} reads your bank.
 *   Preview changes first is on in Sync, so it isn't used here yet." with Use it (apply: true, Undo).
 *   Otherwise: "Your bank is read on {name}. It shows here after its next update." (asleep: "when
 *   {name} wakes"): calm and grey, never "Connect your bank" (P6).
 */
function hglRemoteBank(rm, o) {
  o = o || {};
  const name = String((rm && rm.name) || 'your other computer');
  const base = { icon: o.icon || 'wallet', title: o.title || 'Money' };
  if (rm && rm.trial) {
    return Object.assign(base, { text: `${name} reads your bank. Preview changes first is on in Sync, so it isn’t used here yet.`,
      action: { label: 'Use it', icon: 'check', run: () => hglUseSyncChanges(o.reload) } });
  }
  let asleep = !!(rm && rm.online === false);
  try { const p = typeof presenceFor === 'function' ? presenceFor(name) : null; if (p && p.state) asleep = p.state === 'asleep' || p.state === 'off'; } catch (e) { /* no presence */ }
  return Object.assign(base, { text: `Your bank is read on ${name}. It shows here ${asleep ? `when ${name} wakes` : 'after its next update'}.`,
    action: typeof o.open === 'function' ? { label: 'Open Finances', icon: 'wallet', run: o.open } : undefined });
}
/** Sync's "Preview changes first" off on this computer (POST /api/sync/settings {apply: true}), with Undo; then after(). */
async function hglUseSyncChanges(after) {
  const post = async (apply) => {
    const r = await fetch('/api/sync/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apply }) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error((j && j.error && (j.error.message || j.error)) || 'HTTP ' + r.status); }
  };
  const again = () => { if (typeof after === 'function') try { after(); } catch (e) { console.error('[home] money', e); } };
  try { await post(true); }
  catch (e) { toastError('turn off Preview changes first', e, () => hglUseSyncChanges(after)); return false; }
  toast('Preview changes first turned off', { kind: 'ok', icon: 'check', action: { label: 'Undo', run: async () => {
    try { await post(false); again(); } catch (e) { toastError('undo that', e); }
  } } });
  again();
  return true;
}

function hglScene(type, o) {
  if (typeof animSceneHtml !== 'function' || !type) return '';
  try { return animSceneHtml(type, o || {}); } catch (e) { return ''; }
}

function hglEmpty(o) {
  o = o || {};
  const box = document.createElement('div'); box.className = 'hgl-emp';
  const art = o.scene ? hglScene(o.scene, { size: 'lg', hover: true }) : '';
  box.innerHTML = (art || `<span class="hgl-emp-ic">${icon(o.icon || 'sparkles', 'i-xl')}</span>`)
    + `<h4>${esc(o.title || '')}</h4>` + (o.text ? `<p>${esc(o.text)}</p>` : '');
  // The card template: an empty card offers ONE action (the first one given).
  const a = (o.actions || []).find(x => x && typeof x.run === 'function');
  if (a) {
    const row = document.createElement('div'); row.className = 'hgl-emp-acts';
    row.appendChild(uiButton({ label: a.label, icon: a.icon, size: 'sm', kind: a.primary ? 'primary' : 'secondary', bubble: true, run: () => a.run() }));
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
  if (state.view === 'person:' + id) return;                  // re-selecting is a no-op
  openPerson(id);                                             // the card or the panel (54-people-card.js)
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
