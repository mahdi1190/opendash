/* ============================================================
   "NEW IN 2.2: ANIMATIONS" (one-time card). Shown once per device, a few
   seconds after the page loads (after the daily opening), so the new
   animations are discoverable and anything that silences them is fixed in
   one click: the OS reduced-motion request (Animate anyway), Intensity Off,
   the Animations switch off, and the opt-in UK regional packs.
     animNewPlan(o)  PURE: {show, reasons[], actions[]} from the settings
     animNewCardShow(force)  the card (fixed, bottom-right; Escape closes)
   Seen flag: localStorage 'dashboard-new22-anim' (per device).
   ============================================================ */
const _ANEW_KEY = 'dashboard-new22-anim';

/**
 * o: {seen, firstRun, osReduced, osOverride, level ('off'|'subtle'|...), scenesOn, inUK, ukOn}
 * -> {show, reasons:[text], actions:[id]}; ids: 'anyway' | 'level' | 'scenes' | 'uk' | 'play' | 'settings'.
 */
function animNewPlan(o) {
  o = o || {};
  const out = { show: !o.seen && !o.firstRun, reasons: [], actions: [] };
  if (o.osReduced && !o.osOverride) { out.reasons.push('Your computer asks apps for reduced motion (Windows: Animation effects is off), so they were hidden.'); out.actions.push('anyway'); }
  if (o.level === 'off') { out.reasons.push('Intensity is set to Off on this device.'); out.actions.push('level'); }
  if (o.scenesOn === false) { out.reasons.push('The Animations switch is off.'); out.actions.push('scenes'); }
  if (o.inUK && !o.ukOn) out.actions.push('uk');
  out.actions.push('play', 'settings');
  return out;
}

function _anewSeen() { try { return localStorage.getItem(_ANEW_KEY) === '1'; } catch (e) { return false; } }
function _anewSetSeen() { try { localStorage.setItem(_ANEW_KEY, '1'); } catch (e) { /* private mode */ } }

function animNewCardShow(force) {
  try {
    if (document.querySelector('.anew-card')) return false;
    const M = window.Motion || null;
    const loc = APP_CONFIG.location && typeof APP_CONFIG.location === 'object' ? APP_CONFIG.location : {};
    const plan = animNewPlan({
      seen: !force && _anewSeen(),
      firstRun: !APP_CONFIG.onboardedAt && typeof getAllItems === 'function' && !getAllItems().length,
      osReduced: !!(M && M.osReduced && M.osReduced()), osOverride: !!(M && M.osOverride && M.osOverride()),
      level: M && M.chosenLevel ? M.chosenLevel() : 'standard',
      scenesOn: typeof briefPrefs === 'function' ? briefPrefs().animations : true,
      inUK: String(loc.countryCode || '').toUpperCase() === 'GB', ukOn: typeof animUkOn === 'function' && animUkOn(),
    });
    if (!plan.show) return false;
    const card = document.createElement('div');
    card.className = 'anew-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'New in 2.2: animations');
    const it = typeof animToday === 'function' ? animToday('opening') : null;
    card.innerHTML = `<div class="anew-art" aria-hidden="true">${it ? animItemHtml(it, { size: 'md', live: true }) : ''}</div>`
      + `<div class="anew-body"><div class="anew-h">New in 2.2: animations</div>`
      + `<div class="anew-t">A short opening each day, scenes on your events, skies that follow the real sun and moon, seasonal art, and moments when you finish tasks.${it ? ` Today's opening: ${esc(it.label)}.` : ''}</div>`
      + plan.reasons.map(r => `<div class="anew-t anew-warn">${esc(r)}</div>`).join('')
      + `<div class="anew-acts"></div></div>`;
    const acts = card.querySelector('.anew-acts');
    const close = () => { _anewSetSeen(); card.remove(); document.removeEventListener('keydown', onKey, true); };
    const onKey = (e) => { if (e.key === 'Escape' && card.isConnected) { close(); } };
    const btn = (label, cls, run) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm ' + cls; b.textContent = label;
      b.onclick = run; acts.appendChild(b); return b;
    };
    const after = () => { if (typeof _animSyncRoot === 'function') _animSyncRoot(); if (typeof render === 'function') render(); };
    for (const a of plan.actions) {
      if (a === 'anyway') btn('Animate anyway', 'btn-primary', () => { M.setOsOverride(true); after(); close(); setTimeout(() => animOpeningPlay(true), 150); });
      else if (a === 'level') btn('Turn on (Standard)', 'btn-primary', () => { M.setLevel('standard'); after(); close(); setTimeout(() => animOpeningPlay(true), 150); });
      else if (a === 'scenes') btn('Switch Animations on', 'btn-primary', () => { settingsSaveConfig({ brief: { animations: true } }, false).then(after); close(); });
      else if (a === 'uk') btn('Turn on UK regional animations', 'btn-secondary', () => { animLookSave({ ukRegional: true }); close(); animUkCheck({ first: true, force: true }); after(); });
      else if (a === 'play') btn('Play today’s opening', 'btn-secondary', () => animOpeningPlay(true));
      else if (a === 'settings') btn('Animation settings', 'btn-ghost', () => { close(); setView('settings:animations'); });
    }
    const x = document.createElement('button'); x.type = 'button'; x.className = 'btn-icon btn-sm anew-x'; x.innerHTML = icon('x', 'i-sm');
    x.setAttribute('aria-label', 'Got it, close'); x.onclick = close;
    card.appendChild(x);
    document.body.appendChild(card);
    document.addEventListener('keydown', onKey, true);
    return true;
  } catch (e) { return false; }
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // After the opening (350 ms + up to 2.3 s); wait while the brief, a story or a dialog is up.
  window.addEventListener('load', () => {
    let tries = 0;
    const tick = () => {
      const busy = document.hidden || document.querySelector('.ap-opening:not(.anim-scene), .modal, .story, .bf-overlay') || document.documentElement.classList.contains('story-open');
      if (busy) { if (++tries < 40) setTimeout(tick, 3000); return; }
      animNewCardShow(false);
    };
    setTimeout(tick, 3200);
  }, { once: true });
}
