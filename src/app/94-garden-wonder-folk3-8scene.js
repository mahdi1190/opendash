/* ============================================================
   THE SCENE DIRECTOR: moments, stories you SEE (npcs-PLAN 1.6 and 3.11; the folk3 plan, step 8; the moments themselves are data in
   94-garden-folk3-3story.js). Talk to a teller whose next beat has a moment and it plays in the world: soft bars ease in at the top and
   bottom, the garden's buttons fade, the camera settles on the stage, the real villagers walk to their marks and act it out (point, look
   at their boots, go quiet, cheer), and their words come in the talk card along the bottom with their portrait. E or "Go on" moves it on.
   - SKIP is always in the corner (Esc too). Skipping leaves the world exactly as watching would: the beat was heard, its flags set and its
     gift given when the moment began (wdTaleTell); the actors are given back to their day either way.
   - FALLBACK: no stage of its kind near, a teller not out, the gentle telling leaving a step's line out: the step is skipped, and with no
     stage at all the beat is told in the talk card exactly as before. The story never breaks.
   - WATCH AGAIN from the Field Journal (Letters and stories, "Moments"): today's world, no flags, no gifts. When the cast cannot gather,
     the lines are shown instead.
   - PRIVATE AND PUBLIC: a story's moment plays only on your screen (bible tone rule 6); a friend in your garden sees the folk walk to
     their marks and stand there, as ordinary folk. A public one (a festival's opening) is a host-only fx `mo|play` that every screen plays
     from the same data: bars, the shot and the words, with the folk coming from the host.
   - THE CAMERA: this file's shot is asked first by the native camera (hook in 94-garden-native-world.js cameraTarget), eased over the
     step's seconds (cuts with motion off), at about the player's own zoom. Movement keys and clicks on the world do nothing while a moment
     plays (they never reach the walker); the talk card and Skip stay live.
     gardenSceneForTalk(id, V, m)   the runner asks before ordinary talk (hook R6): true when a moment started instead
     gardenScenePlay(id, o)         start one: o { tale: {s, b}, teller, replay, public }; false when it cannot play here
     gardenSceneBusy() / gardenSceneSkip()
     gardenSceneCam(ar, wpx, hpx)   the shot, for the native camera; null when no moment plays
     gardenSceneGuestEvent(ev)      a guest hears the host's public moment (mo|play, mo|skip)
     gardenMomentsBox(el, m)        the Journal's list of moments seen, with Watch again (hook J2)
     gardenSceneDev(id)             console only: play one now
   Saved: vx.<scene> (the day it was seen, for Watch again).
   ============================================================ */
const _vsc = { S: null, G: null, keys: false, ui: null, cam: null, hint: false };
function _vscM() { try { return gardenHere(); } catch (e) { return null; } }
function gardenSceneBusy() { return !!(_vsc.S || _vsc.G); }
function _vscV(id) { return typeof _vfr !== 'undefined' && _vfr.V ? _vfr.V.get(id) || null : null; }
function _vscOut(id) { const V = _vscV(id); return !!(V && V.x != null && !V.inside && (_vfr.list || []).includes(V) && !(V.entry && (V.entry.act === 'sleep' || V.entry.offmap))); }
function _vscFree(id) { return typeof gardenFolkFree === 'function' && gardenFolkFree(id, 'scene'); }
function _vscWho(id) { const r = VALE_FOLK_ROW.get(id); return r ? r.name : id; }
function _vscArt(id) { try { return typeof gardenCastSvg === 'function' ? gardenCastSvg((VALE_FOLK_ROW.get(id) || {}).cast || id) : ''; } catch (e) { return ''; } }
/* ---------- where things are ---------- */
function _vscThings() { try { return typeof _vfr !== 'undefined' && _vfr.ctx ? _vfr.ctx.things : gardenAffordThings(); } catch (e) { return []; } }
function _vscBase(t) {
  let B = { x: t.x, y: t.y, w: t.w || 1 }; try { if (typeof gardenAffordDrawnBase === 'function') B = gardenAffordDrawnBase(t); } catch (e) { /* the plan's */ }
  let h = 2; try { const w = window.GardenNative && GardenNative.world(), rec = w && w.entities instanceof Map ? w.entities.get('prop:' + t.id) : null; if (rec && rec.bounds && rec.bounds.height) h = rec.bounds.height / GARDEN_WORLD.cellH; } catch (e) { /* not drawn yet */ }
  return { x: B.x, y: B.y, w: Math.max(0.6, B.w || 1), h: Math.min(9, h), id: t.id, kind: t.kind };
}
/** A story place by kind (VALE_ROLES): the same thing next time (sp.<role>), else the nearest thing of its kinds (a preferred id first). */
function _vscRole(role, near, r) {
  const R = VALE_ROLES[role]; if (!R) return null;
  const T = _vscThings(), W = _wdG(), saved = W['sp.' + role];
  let t = saved ? T.find(q => q.id === saved && R.kinds.includes(q.kind)) : null;
  if (!t) { let bd = Infinity; for (const q of T) { if (!R.kinds.includes(q.kind)) continue; const d = Math.hypot(q.x - near.x, q.y - near.y) - ((R.prefer || []).includes(q.id) ? 3 : 0); if (d < bd) { bd = d; t = q; } } if (t) { W['sp.' + role] = t.id; } }
  if (!t || Math.hypot(t.x - near.x, t.y - near.y) > (r || 30)) return null;
  return _vscBase(t);
}
function _vscWet(x, y) { try { const t = typeof gardenTerrainAt === 'function' ? gardenTerrainAt(x, y) : ''; return t === 'water' || t === 'deep'; } catch (e) { return false; } }
/** Room for a standing figure here (feet free, clear of drawn things), or the nearest such place within a cell; null when there is none. */
function _vscStand(x, y) {
  // (clear of everything drawn first: never just behind a pillar or a sign; then, only if nothing is, just clear of standing on it)
  for (const relaxed of [false, true]) {
    const ok = (a, b) => (typeof _vfrBodyOk !== 'function' || _vfrBodyOk(a, b, '', relaxed)) && (typeof _gwFree !== 'function' || _gwFree(a, b));
    if (ok(x, y)) return { x, y };
    for (const [dx, dy] of [[0.4, 0], [-0.4, 0], [0, 0.35], [0, -0.35], [0.7, 0.2], [-0.7, 0.2], [0.5, 0.5], [-0.5, 0.5], [1, 0], [-1, 0]]) if (ok(x + dx, y + dy)) return { x: x + dx, y: y + dy };
  }
  return null;
}
/** Resolve a moment against today's world: its stage, marks, cast. null: it cannot play here (the beat is told as lines). */
function _vscResolve(sc, o) {
  const you = { x: _gw.px, y: _gw.py }, R = { sc, names: new Map(), marks: new Map(), actors: new Map(), crowd: [], why: '' };
  const tellerId = o.teller || sc.teller || '';
  // the stage
  let stage = null;
  if (sc.stage.at === 'teller') { const V = _vscV(tellerId); if (!V || V.x == null) { R.why = 'teller'; return null; } stage = { x: V.x, y: V.y, w: 0.8, h: 1.6 }; }
  else if (sc.stage.at === 'plaza') { const mid = (o.stage) || (typeof gardenKitMark === 'function' ? gardenKitMark('middle') : null); if (!mid) { R.why = 'plaza'; return null; } stage = { x: mid.x, y: mid.y, w: 4, h: 2.4 }; }
  else if (sc.stage.role) { stage = _vscRole(sc.stage.role, you, sc.stage.r); if (!stage) { R.why = 'no ' + sc.stage.role + ' near'; return null; } }
  if (Math.hypot(stage.x - you.x, stage.y - you.y) > 26) { R.why = 'too far off'; return null; }   // (a moment is played where you can see it: a replay of one far off is remembered as words)
  R.stage = stage; R.names.set('stage', { x: stage.x, y: stage.y, w: stage.w, h: stage.h });
  R.names.set('you', { x: you.x, y: you.y, fig: 1 });
  // the teller (or the opener) and the crowd
  const actors = [];
  if (tellerId) { if (!o.replay || _vscOut(tellerId)) actors.push(['teller', tellerId]); else { R.why = 'teller not out'; return null; } }
  if (sc.opener) { const pick = sc.opener.find(id => _vscOut(id) && _vscFree(id) && Math.hypot(_vscV(id).x - stage.x, _vscV(id).y - stage.y) < 30); if (!pick) { R.why = 'no opener'; return null; } actors.push(['opener', pick]); }
  for (const [role, id] of actors) { R.actors.set(role, id); const V = _vscV(id); R.names.set(role, { x: V.x, y: V.y, fig: 1, id }); }
  // the look (the angler pointing down the water to the mill)
  if (sc.look) { const V = _vscV(tellerId); const L = V ? _vscRole(sc.look.role, { x: V.x, y: V.y }, sc.look.r) : null; if (L) { R.names.set('look', L); if (Math.hypot(L.x - V.x, L.y - V.y) < 12) R.names.set('lookNear', L); } }
  // marks, relative to the stage's drawn footprint
  const wetSide = (() => { for (const s of [-1, 1]) for (const dy of [-0.5, -1.5, 0.3]) if (_vscWet(stage.x + s * (stage.w / 2 + 1.1), stage.y + dy)) return s; return 0; })();
  if (wetSide) R.names.set('wet', { x: stage.x + wetSide * (stage.w / 2 + 2), y: stage.y - 0.8, side: wetSide });
  for (const [name, mk] of Object.entries(sc.marks || {})) {
    let p = null;
    if (mk.at === 'plaza-middle') p = { x: stage.x, y: stage.y };
    else if (mk.of === 'stage') p = _vscStand(stage.x + (mk.u || 0) * stage.w, stage.y + (mk.dy || 0));
    else if (mk.wet) { if (!wetSide) continue; p = _vscStand(stage.x + wetSide * (mk.u || 0.4) * stage.w, stage.y + (mk.dy || 0.9)); }
    else if (mk.ring) {
      const c = mk.ring.about === 'middle' && R.marks.get('middle') ? R.marks.get('middle') : { x: stage.x, y: stage.y + (mk.ring.dy || 2.6) }, pts = [];
      for (let k = 0; k < (mk.ring.n || 5) * 3 && pts.length < (mk.ring.n || 5); k++) {
        const a = Math.PI * (0.12 + 0.76 * ((k * 0.381966) % 1)), x = c.x + Math.cos(a) * mk.ring.r * (k % 2 ? 1 : -1), y = c.y + Math.sin(a) * mk.ring.r * 0.55;
        const q = _vscStand(x, y); if (q && !pts.some(o2 => Math.hypot(o2.x - q.x, (o2.y - q.y) * 1.6) < 1.05)) pts.push(q);
      }
      if (pts.length) R.marks.set(name, pts.sort((a, b) => a.x - b.x));
      continue;
    } else if (mk.tree) {
      const ring = R.marks.get('ring') || [], cx = stage.x, cy = stage.y + (mk.tree.dy || 4);
      let best = null, bd = Infinity;
      for (const t of _vscThings()) { if (!/tree/.test(t.kind || '')) continue; const d = Math.hypot(t.x - cx, t.y - cy); if (d > (mk.tree.r || 7) || d >= bd) continue; const q = _vscStand(t.x + 0.9, t.y + 0.15) || _vscStand(t.x - 0.9, t.y + 0.15); if (q && !ring.some(r2 => Math.hypot(r2.x - q.x, r2.y - q.y) < 2.4)) { bd = d; best = q; } }
      p = best || _vscStand(cx + 3.2, cy + 0.6);
    }
    if (p) R.marks.set(name, p);
  }
  // the crowd: folk who are out, free and near (never two who do not get on side by side: Hollin is never in it, he stands apart)
  if (sc.crowd) {
    const not = new Set([...(sc.crowd.not || []), ...R.actors.values()]), have = [];
    for (const V of (typeof _vfr !== 'undefined' && _vfr.list) || []) { if (not.has(V.id) || !_vscOut(V.id) || !_vscFree(V.id)) continue; if (Math.hypot(V.x - stage.x, V.y - stage.y) > (sc.crowd.r || 25)) continue; have.push(V); }
    have.sort((a, b) => Math.hypot(a.x - stage.x, a.y - stage.y) - Math.hypot(b.x - stage.x, b.y - stage.y));
    const ring = (R.marks.get('ring') || []).slice(), ids = [];
    for (const V of have) { if (ids.length >= (sc.crowd.any || 5) || ids.length >= ring.length) break; if (typeof valeGameFolkOk === 'function' && !valeGameFolkOk(ids.concat(V.id))) continue; ids.push(V.id); }
    // pair them with the ring's places left to right as they stand, so nobody crosses another's way
    const order = ids.map(id => _vscV(id)).sort((a, b) => a.x - b.x);
    order.forEach((V, k) => { const q = ring[Math.round(k * (ring.length - 1) / Math.max(1, order.length - 1))] || ring[k]; if (q) R.crowd.push({ id: V.id, to: q }); });
    const pts = R.crowd.map(c => c.to); if (pts.length) R.names.set('crowd', { pts });
  }
  // Hollin at the back by the trees (the full telling only; he is never put beside Quince or Thistle)
  if (sc.marks && sc.marks.back && R.marks.get('back') && typeof _wtDeep === 'function' && _wtDeep() && _vscOut('hollin') && _vscFree('hollin')) {
    const b = R.marks.get('back'), clash = R.crowd.some(c => (c.id === 'quince' || c.id === 'thistle') && Math.hypot(c.to.x - b.x, c.to.y - b.y) < 3);
    if (!clash && Math.hypot(_vscV('hollin').x - b.x, _vscV('hollin').y - b.y) < 26) { R.actors.set('hollin', 'hollin'); R.names.set('hollinDeep', b); R.names.set('hollin', { x: b.x, y: b.y, fig: 1, id: 'hollin' }); }
  }
  // the angler, as he is (his back to the river), for the last shot
  if (_vscOut('angler') && tellerId !== 'angler' && sc.steps.some(s => s.if === 'angler')) { const V = _vscV('angler'); if (Math.hypot(V.x - stage.x, V.y - stage.y) < 32) R.names.set('angler', { x: V.x, y: V.y, fig: 1, id: 'angler', live: 1 }); }
  return R;
}
/* ---------- the shot ---------- */
/** A view framing these names (each a figure's box or a thing's drawn box), at about the zoom you had, the talk card's strip kept clear. */
function _vscShot(R, names) {
  const W = GARDEN_WORLD; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (p, fig) => { if (!p || !Number.isFinite(p.x)) return; const hw = fig ? 0.75 : Math.max(0.8, (p.w || 1) / 2 + 0.3), up = fig ? 2.0 : Math.max(1.6, (p.h || 1.6) + 0.3); x0 = Math.min(x0, p.x - hw); x1 = Math.max(x1, p.x + hw); y0 = Math.min(y0, p.y - up); y1 = Math.max(y1, p.y + 0.6); };
  for (const n of names) {
    const p = R.names.get(n); if (!p) continue;
    if (p.pts) { for (const q of p.pts) add(q, true); continue; }
    if (p.id) { const V = _vscV(p.id); if (V && V.x != null) { const D = V.drive; add({ x: V.x, y: V.y }, true); if (D && D.to) add(D.to, true); continue; } }
    add(p, !!p.fig);
  }
  if (!Number.isFinite(x0)) return null;
  const base = R.baseH, ar = R.ar || 1.6, padX = 0.16, padTop = 0.1, padBot = 0.4;   // (the bottom two fifths hold the talk card and the bar)
  let h = Math.max(base * 0.82, ((y1 - y0) * W.cellH) / (1 - padTop - padBot), ((x1 - x0) * W.cellW) / (ar * (1 - padX * 2)));
  h = Math.min(Math.max(h, base), base * 1.45);   // (about the zoom you had: never closer, a little wider at most, so the painted ground is ready where the shot goes)
  const w = h * ar, cx = (x0 + x1) / 2 * W.cellW, cyTop = W.sky + y0 * W.cellH, cyBot = W.sky + y1 * W.cellH;
  const y = (cyTop + cyBot) / 2 - h * (0.5 + (padTop - padBot) / 2);
  return { x: cx - w / 2, y, w, h };
}
function _vscEase(t) { return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t); }
function _vscCamTo(names, secs) {
  const S = _vsc.S || _vsc.G; if (!S) return;
  const v = _vscShot(S.R, names); if (!v) return;
  const motion = typeof gardenMotionOn !== 'function' || gardenMotionOn();
  const cur = _vsc.cam && _vsc.cam.now ? _vsc.cam.now : (typeof _gw !== 'undefined' && _gw.cam && _gw.cam.init ? { x: _gw.cam.x, y: _gw.cam.y, w: _gw.cam.w, h: _gw.cam.h } : v);
  _vsc.cam = { from: Object.assign({}, cur), to: v, t0: performance.now(), dur: motion ? Math.max(0.05, (secs || 1.2)) * 1000 : 1, now: Object.assign({}, cur), names: names.slice() };
}
/** The native camera asks this first (hook in cameraTarget): the moment's shot, eased, kept inside the world. */
function gardenSceneCam(ar, wpx, hpx) {
  const S = _vsc.S || _vsc.G, C = _vsc.cam; if (!S || !C) return null;
  S.R.ar = ar;
  const k = _vscEase((performance.now() - C.t0) / C.dur), n = C.now;
  // a shot on someone walking follows them (the framing is worked out again while they move)
  if (k >= 1 && S.follow && performance.now() - (S.followT || 0) > 120) { S.followT = performance.now(); const v = _vscShot(S.R, C.names); if (v) { C.from = Object.assign({}, n); C.to = v; C.t0 = performance.now() - C.dur * 0.6; } }
  n.x = C.from.x + (C.to.x - C.from.x) * k; n.y = C.from.y + (C.to.y - C.from.y) * k; n.w = C.from.w + (C.to.w - C.from.w) * k; n.h = C.from.h + (C.to.h - C.from.h) * k;
  let vw = n.w, vh = n.w / ar; if (Math.abs(vh - n.h) / n.h > 0.02) { vh = n.h; vw = vh * ar; }
  if (vw > wpx) { vw = wpx; vh = vw / ar; } if (vh > hpx) { vh = hpx; vw = vh * ar; }
  const cx = Math.max(vw / 2, Math.min(wpx - vw / 2, n.x + n.w / 2)), cy = Math.max(vh / 2, Math.min(hpx - vh / 2, n.y + n.h / 2));
  return { x: cx - vw / 2, y: cy - vh / 2, w: vw, h: vh };
}
/* ---------- the bars, Skip, and the garden's buttons faded ---------- */
function _vscUi(on, title) {
  const box = typeof _ghBox === 'function' ? _ghBox() : null; if (!box) return;
  if (!on) { box.classList.remove('vsc-on'); const u = _vsc.ui; _vsc.ui = null; if (u) { u.classList.remove('is-on'); setTimeout(() => u.remove(), 700); } return; }
  let u = _vsc.ui; if (u && u.isConnected) return;
  u = document.createElement('div'); u.className = 'vsc-ui'; u.setAttribute('role', 'region'); u.setAttribute('aria-label', 'A moment in the vale');
  u.innerHTML = '<div class="vsc-bar vsc-top"></div><div class="vsc-bar vsc-bot"></div><div class="vsc-veil"></div><span class="vsc-title"></span>';
  const sk = document.createElement('button'); sk.type = 'button'; sk.className = 'vsc-skip'; sk.innerHTML = '<span>Skip</span><kbd>Esc</kbd>'; sk.onclick = (ev) => { ev.stopPropagation(); gardenSceneSkip(); }; u.appendChild(sk);
  u.querySelector('.vsc-title').textContent = title || '';
  u.addEventListener('pointerdown', (ev) => { if (!ev.target.closest('.vsc-skip')) { ev.stopPropagation(); ev.preventDefault(); } });   // (no click-to-walk while a moment plays)
  u.addEventListener('wheel', (ev) => { ev.stopPropagation(); ev.preventDefault(); }, { passive: false });
  box.appendChild(u); _vsc.ui = u; box.classList.add('vsc-on');
  requestAnimationFrame(() => requestAnimationFrame(() => u.classList.add('is-on')));
}
function _vscKeys() {
  if (_vsc.keys) return; _vsc.keys = true;
  window.addEventListener('keydown', (ev) => {   // (on the window, so it comes before the garden's own keys: Esc never reached it on the page)
    if (!gardenSceneBusy() || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const tg = ev.target; if (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) return;
    const dlg = document.querySelector('[role="dialog"][aria-modal="true"]'); if (dlg && dlg.getClientRects().length && getComputedStyle(dlg).visibility !== 'hidden') return;   // (a dialog really open over the garden has the keys; a hidden one left in the page does not)
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); gardenSceneSkip(); return; }
    const talk = typeof _wd !== 'undefined' && _wd.talk;
    if (/^(Arrow(Up|Down|Left|Right)|[wasdWASDzZ ]|Shift)$/.test(ev.key) || (!talk && /^[eE]$|^Enter$/.test(ev.key))) { ev.preventDefault(); ev.stopPropagation(); }   // (you stand and watch: walking, running and the act keys rest)
  }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden && _vsc.S) gardenSceneSkip(); });
}
/* ---------- playing ---------- */
function gardenSceneForTalk(id, V, m) {
  try {
    if (!m || m.visit || _vsc.S || _vsc.G || typeof wdTaleFor !== 'function') return false;
    const t = wdTaleFor(id, m); if (!t) return false;
    const sid = VALE_SCENE_OF_BEAT.get(t.s.id + '.' + t.b.id); if (!sid) return false;
    if (t.b.heavy || (t.b.choice && t.b.choice.length) || (typeof gardenGameBusy === 'function' && gardenGameBusy())) return false;   // (heavy beats are quiet, at home: never a moment)
    return gardenScenePlay(sid, { tale: t, teller: id });
  } catch (e) { console.error('[moments]', e); return false; }
}
function gardenScenePlay(id, o) {
  o = o || {};
  const sc = VALE_SCENES[id]; if (!sc || _vsc.S || _vsc.G || typeof _gw === 'undefined' || !_gw.on) return false;
  if (!(typeof gardenFolkLive === 'function' && gardenFolkLive())) return false;
  let R = null; try { R = _vscResolve(sc, o); } catch (e) { console.error('[moments]', e); R = null; }
  if (!R) return false;
  const m = _vscM();
  R.baseH = (_gw.cam && _gw.cam.h) || 420; R.ar = (_gw.cam && _gw.cam.w && _gw.cam.h) ? _gw.cam.w / _gw.cam.h : 1.6;
  // the words: the beat's own lines (wdTaleTell hears it now, sets its flags and gives its gift), or the moment's own
  let lines = [], after = [], acts = [];
  if (sc.beat) {
    const [sid, bid] = sc.beat.split('.'), s = o.tale ? o.tale.s : WD_TALE_BY.get(sid), b = o.tale ? o.tale.b : s && s.steps.find(x => x.id === bid);
    if (!s || !b) return false;
    lines = (b.lines || []).map(l => (typeof _wtLine === 'function' ? _wtLine(l) : (typeof l === 'string' ? l : l.t)) || '');
    if (!o.replay) {
      const told = wdTaleTell(s, b), said = new Set(lines.filter(Boolean));
      after = told.lines.filter(t => !said.has(t)); acts = told.actions || [];
      _vscTalked(o.teller || sc.teller, m, after);
    }
  } else lines = (sc.lines || []).slice();
  const S = _vsc.S = { id, sc, R, i: -1, step: null, t0: performance.now(), st: 0, lines, after, acts, replay: !!o.replay, public: !!(o.public || sc.public), teller: o.teller || sc.teller, driven: new Set(), follow: false };
  for (const [, aid] of R.actors) { const V = _vscV(aid); if (V) { gardenFolkDrive(aid, { by: 'scene', noTalk: true, face: { x: _gw.px, y: _gw.py } }); S.driven.add(aid); } }
  try { if (typeof wdTalkClose === 'function') wdTalkClose(true); } catch (e) { /* none open */ }
  _vscKeys(); _vscUi(true, sc.name);
  try { wdSound([[392, 0.5, 'sine', 0.018], [523, 0.7, 'sine', 0.014, 0.18]]); } catch (e) { /* quiet */ }
  if (S.public) _vscSend('play', S);
  _vscNext(S);
  return true;
}
/** The talk's own bookkeeping, as a talk would have done it (first met, spoken to today, friendship once a day). */
function _vscTalked(id, m, after) {
  try {
    if (!id || !m) return;
    const W = _wdG(), F = wdFacts(m, id);
    if (F.last !== m.today && typeof _wkAdd === 'function') _wkAdd(id, 1);
    W['fv.' + id] = m.today; W['fn.' + id] = (F.talks || 0) + 1;
    if (typeof _wkHeartUp === 'function') _wkHeartUp(id, _vscWho(id), after);
    _wdSave();
  } catch (e) { /* only bookkeeping */ }
}
function _vscPoint(S, name) {
  if (name === 'you') return { x: _gw.px, y: _gw.py };
  const mk = S.R.marks.get(name); if (mk && !Array.isArray(mk)) return mk;
  const p = S.R.names.get(name); if (p && !p.pts) { if (p.id) { const V = _vscV(p.id); if (V) return { x: V.x, y: V.y }; } return p; }
  return null;
}
function _vscFace(S, who, face) {
  if (face == null) return null;
  if (face === 'wet') { const w = S.R.names.get('wet'); return w ? w.side : null; }
  const p = _vscPoint(S, face); return p ? { x: p.x, y: p.y } : null;
}
function _vscIds(S, who) { if (who === 'crowd') return S.R.crowd.map(c => c.id).filter(id => S.driven.has(id)); const id = S.R.actors.get(who); return id ? [id] : []; }
function _vscNext(S) {
  if (_vsc.S !== S) return;
  for (;;) {
    S.i++; const st = S.sc.steps[S.i]; S.step = st; S.st = performance.now();
    if (!st || st.end) { _vscEnd(S, false); return; }
    if (st.if && !S.R.names.has(st.if)) continue;
    if (st.cam) { _vscCamTo(st.cam.filter(n => n === 'you' || S.R.names.has(n)), st.t); S.follow = st.cam.some(n => { const p = S.R.names.get(n); return p && (p.id || p.pts); }); continue; }
    if (st.pose) { const face = _vscFace(S, st.pose, st.face); for (const id of _vscIds(S, st.pose)) { const V = _vscV(id); const f = face && typeof face === 'object' && V && st.pose === 'crowd' && st.face === 'stage' ? { x: S.R.stage.x, y: S.R.stage.y } : face; if (typeof gardenFolkPose === 'function') gardenFolkPose(id, st.p || '', f); } continue; }
    if (st.fx) { _vscFx(S, st.fx); continue; }
    if (st.walk) {
      const id = S.R.actors.get(st.walk), to = S.R.marks.get(st.to); if (!id || !to || Array.isArray(to)) continue;
      if (!S.driven.has(id)) S.driven.add(id);
      S.arrived = false; gardenFolkDrive(id, { by: 'scene', to, gait: st.gait === 'r' ? 'r' : 'w', noTalk: true, face: S.R.names.get('stage') ? { x: S.R.stage.x, y: S.R.stage.y } : null, then: () => { S.arrived = true; } });
      return;   // (wait for them: _vscFrame)
    }
    if (st.gather) {
      if (!S.R.crowd.length) continue;
      for (const c of S.R.crowd) { S.driven.add(c.id); c.in = false; gardenFolkDrive(c.id, { by: 'scene', to: c.to, gait: st.gait === 'r' ? 'r' : 'w', noTalk: true, face: { x: S.R.stage.x, y: S.R.stage.y }, then: () => { c.in = true; } }); }
      return;
    }
    if (st.say != null) {
      const t = S.lines[st.say]; if (!t) continue;   // (a line the gentle telling leaves out)
      const who = st.who ? S.R.actors.get(st.who) : (S.R.actors.get('teller') || S.teller), last = !S.sc.steps.slice(S.i + 1).some(x => x.say != null && S.lines[x.say]);
      try { wdTalk({ name: _vscWho(who), art: _vscArt(who), lines: [t], actions: [], at: null, bye: last ? 'Go on' : 'Go on', onClose: () => { if (_vsc.S === S && S.step === st) _vscNext(S); } }); } catch (e) { continue; }
      return;
    }
    if (st.wait) return;
  }
}
function _vscFx(S, fx) {
  if (fx === 'lights') {
    // the lantern posts round the plaza light one after another, with a spark each
    let P = []; try { const K = typeof gardenKitToday === 'function' ? gardenKitToday() : null; P = K ? K.pieces.filter(q => q.kind === 'lantern') : []; } catch (e) { P = []; }
    P.forEach((q, k) => setTimeout(() => { if (!gardenSceneBusy()) return; try { if (typeof _glFx === 'function') _glFx(q.x + 0.3, q.y, 'sparkle', { lift: 66 }); wdSound([[660 + k * 40, 0.35, 'sine', 0.012]]); } catch (e) { /* quiet */ } }, 300 + k * 380));
    try { if (typeof gardenSfx === 'function') gardenSfx('cheer'); } catch (e) { /* quiet */ }
  }
}
/** Each frame while a moment plays: walking steps wait for their walkers (at most a while; anyone who cannot get there is let go). */
function _vscFrame() {
  const S = _vsc.S; if (!S) { if (_vsc.G) _vscGuestFrame(); return; }
  const st = S.step, secs = (performance.now() - S.st) / 1000;
  if (performance.now() - S.t0 > 150000) { _vscEnd(S, true); return; }
  if (typeof _gw !== 'undefined' && _gw.cam) _gw.cam.dirty = true;
  if (!st) return;
  if (st.walk) { const id = S.R.actors.get(st.walk), D = id && typeof gardenFolkDriven === 'function' ? gardenFolkDriven(id) : null; if (S.arrived || !D || D.failed || secs > 10) { if (D && !S.arrived && secs > 10) { const V = _vscV(id), to = S.R.marks.get(st.to); if (V && to && !Array.isArray(to)) { V.x = to.x; V.y = to.y; } } _vscNext(S); } return; }   // (still short of the mark after ten seconds: they are there, off the shot)
  if (st.gather) {
    const all = S.R.crowd.every(c => c.in || !gardenFolkDriven(c.id) || gardenFolkDriven(c.id).failed);
    if (all || secs > (st.max || 12)) {
      for (const c of S.R.crowd) { if (c.in) continue; const V = _vscV(c.id); if (V && Math.hypot(V.x - c.to.x, V.y - c.to.y) > 2) { gardenFolkRelease(c.id, 'scene'); S.driven.delete(c.id); } else if (V) { V.x = c.to.x; V.y = c.to.y; c.in = true; } }
      S.R.names.set('crowd', { pts: S.R.crowd.filter(c => S.driven.has(c.id)).map(c => c.to) });
      _vscNext(S);
    }
    return;
  }
  if (st.wait && secs >= st.wait) _vscNext(S);
}
/** The end (watched or skipped: the same world): actors back to their day, the last card (the beat's gift or choices, if any). */
function _vscEnd(S, skipped) {
  if (!S || _vsc.S !== S) return;
  _vsc.S = null; _vsc.cam = null;
  if (skipped) { try { const T = _wd.talk; if (T) { T.o.onClose = null; wdTalkClose(true); } } catch (e) { /* none */ } }
  gardenFolkRelease('*', 'scene');
  const box = typeof _ghBox === 'function' ? _ghBox() : null;
  if (skipped && box && _vsc.ui) { _vsc.ui.classList.add('is-skip'); setTimeout(() => _vscUi(false), 320); } else _vscUi(false);
  if (S.public) _vscSend(skipped ? 'skip' : 'end', S);
  const m = _vscM(), W = _wdG();
  if (!S.replay && m) { W['vx.' + S.id] = m.today; _wdSave(); }
  if (typeof _gw !== 'undefined' && _gw.cam) _gw.cam.dirty = true;
  const after = (S.after || []).filter(Boolean);
  if (after.length || (S.acts || []).length) setTimeout(() => { try { const id = S.teller; wdTalk({ name: _vscWho(id), art: _vscArt(id), lines: after.length ? after : ['…'], actions: S.acts || [], at: null, bye: 'Goodbye' }); } catch (e) { /* fine */ } }, skipped ? 380 : 120);
  else if (!S.replay && !_vsc.hint && !W.vxh) { _vsc.hint = true; W.vxh = 1; _wdSave(); setTimeout(() => { try { wdAmbient('You can watch that again from your Field Journal, under Letters.', 6500, 'story'); } catch (e) { /* quiet */ } }, 900); }
}
function gardenSceneSkip() { if (_vsc.S) { _vscEnd(_vsc.S, true); return true; } if (_vsc.G) { _vscGuestEnd(true); return true; } return false; }
/* ---------- public moments with friends: the host sends, every screen plays ---------- */
function _vscSend(step, S) {
  try {
    if (typeof _gll === 'undefined' || _gll.role !== 'host' || typeof _glh === 'undefined' || !_glh.on || !_glhAnyone()) return;
    const st = S.R.stage; gardenLiveFx('mo', step === 'play' ? 'play' : 'skip', { i: S.id, x: Math.max(0, Math.min(GARDEN_WORLD.cols - 1, Math.floor(st.x))), y: Math.max(0, Math.min(GARDEN_WORLD.rows - 1, Math.floor(st.y))), tt: Math.min(999, Math.round((performance.now() - S.t0) / 1000)) });
  } catch (e) { /* only a message */ }
}
function gardenSceneGuestEvent(ev) {
  if (!ev || ev.c !== 'mo') return;
  if (ev.e === 'skip') { if (_vsc.G && _vsc.G.id === ev.i) _vscGuestEnd(false); return; }
  if (ev.e !== 'play' || _vsc.G || _vsc.S) return;
  const sc = VALE_SCENES[ev.i]; if (!sc || !sc.public || typeof _gw === 'undefined' || !_gw.on) return;
  const stage = { x: ev.x + 0.5, y: ev.y + 0.5 };
  if (Math.hypot(_gw.px - stage.x, _gw.py - stage.y) > 24) return;   // (too far off to see it: nothing to play)
  const R = { sc, names: new Map([['stage', { x: stage.x, y: stage.y, w: 6, h: 2.6 }], ['you', { x: _gw.px, y: _gw.py, fig: 1 }]]), marks: new Map(), actors: new Map(), crowd: [], stage, baseH: (_gw.cam && _gw.cam.h) || 420, ar: 1.6 };
  const G = _vsc.G = { id: ev.i, sc, R, t0: performance.now() - (Number(ev.tt) || 0) * 1000, k: -1, lines: (sc.lines || []).slice(), nextT: 0 };
  _vscKeys(); _vscUi(true, sc.name); _vscCamTo(['stage', 'you'], 1.4);
  G.nextT = performance.now() + 2600;
}
function _vscGuestFrame() {
  const G = _vsc.G; if (!G) return;
  if (typeof _gw !== 'undefined' && _gw.cam) _gw.cam.dirty = true;
  if (performance.now() - G.t0 > 60000) { _vscGuestEnd(false); return; }
  if (performance.now() < G.nextT || (typeof _wd !== 'undefined' && _wd.talk)) return;
  G.k++;
  if (G.k >= G.lines.length) { if (performance.now() - G.nextT > 1800) _vscGuestEnd(false); return; }
  G.nextT = performance.now() + 5200;
  try { wdTalk({ name: G.sc.name, art: '', lines: [G.lines[G.k]], actions: [], at: null, bye: 'Go on', onClose: () => { if (_vsc.G === G) G.nextT = performance.now() + 600; } }); } catch (e) { /* fine */ }
}
function _vscGuestEnd() { const G = _vsc.G; if (!G) return; _vsc.G = null; _vsc.cam = null; try { if (_wd.talk) { _wd.talk.o.onClose = null; wdTalkClose(true); } } catch (e) { /* none */ } _vscUi(false); if (typeof _gw !== 'undefined' && _gw.cam) _gw.cam.dirty = true; }
/* ---------- the Journal: moments you have seen, to watch again ---------- */
function gardenMomentsBox(el, m) {
  try {
    // (seen, or its beat heard in words when you were far from its place: it can be watched where it happened)
    const W = _wdG(), heard = (s) => !!s.beat && typeof wdTaleSeen === 'function' && !!wdTaleSeen(s.beat), seen = Object.values(VALE_SCENES).filter(s => W['vx.' + s.id] || heard(s)); if (!seen.length) return;
    el.appendChild(_gdpEl('h4', 'wd-tale-h', 'Moments'));
    const box = el.appendChild(_gdpEl('div', 'vsc-moments'));
    for (const s of seen) {
      const row = box.appendChild(_gdpEl('div', 'vsc-moment'));
      row.appendChild(_gdpEl('span', 'vsc-mname', s.name));
      row.appendChild(_gdpEl('small', 'muted', W['vx.' + s.id] ? 'seen ' + (typeof _gjDay === 'function' ? _gjDay(W['vx.' + s.id]) : W['vx.' + s.id]) : 'heard; watch it where it happened'));
      const b = row.appendChild(_gdpBtn(W['vx.' + s.id] ? 'Watch again' : 'Watch', { icon: 'play', kind: 'btn-ghost', run: () => {
        try { if (typeof gardenPopupClose === 'function') gardenPopupClose(); } catch (e) { /* not a pop-up */ }
        setTimeout(() => { if (!gardenScenePlay(s.id, { replay: true, teller: s.teller, public: false })) _vscRemember(s); }, 420);
      } }));
      void b;
    }
  } catch (e) { /* later */ }
}
/** Watch again when the cast cannot gather (asleep, far off): the words as you heard them. */
function _vscRemember(s) {
  let lines = [];
  if (s.beat) { const [sid, bid] = s.beat.split('.'), st = WD_TALE_BY.get(sid), b = st && st.steps.find(x => x.id === bid); lines = b ? (b.lines || []).map(l => (typeof _wtLine === 'function' ? _wtLine(l) : l)).filter(Boolean) : []; }
  else lines = (s.lines || []).slice();
  const where = s.stage && s.stage.role === 'mill' ? ' Go down to the mill to see it played.' : '';
  try { wdTalk({ name: s.name, art: s.teller ? _vscArt(s.teller) : '', lines: ['You remember it like this.' + where].concat(lines), actions: [], at: null, bye: 'Close' }); } catch (e) { /* fine */ }
}
/** Console only (and the sandbox check): play a moment now, as a replay (no flags, no gifts). */
function gardenSceneDev(id, o) { const sc = VALE_SCENES[id || 'still']; if (!sc) return 'no such moment'; const ok = gardenScenePlay(sc.id, Object.assign({ replay: !sc.public, teller: sc.teller }, o || {})); return ok ? 'playing' : 'cannot play here: ' + (_vscWhy(sc) || 'unknown'); }
function _vscWhy(sc) { try { const R = _vscResolve(sc, { teller: sc.teller, replay: true }); return R ? '' : 'stage or cast not found'; } catch (e) { return String(e); } }
wdMod({
  id: 'vale-scenes', pref: 'folk', visit: true,
  begin() { },
  frame() { try { if (_vsc.S || _vsc.G) _vscFrame(); } catch (e) { console.error('[moments]', e); if (_vsc.S) _vscEnd(_vsc.S, true); } },
  tick(m) { if (_vsc.S && m.visit) _vscEnd(_vsc.S, true); if (_vsc.G && !m.visit) _vscGuestEnd(); },
  end() { if (_vsc.S) _vscEnd(_vsc.S, true); if (_vsc.G) _vscGuestEnd(); },
});
