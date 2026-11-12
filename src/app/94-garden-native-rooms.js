/* Indoor game scenes. Room rules keep their saved marks and rewards; native
 * components, camera projection and the shared engine clock own presentation. */
window.GardenNativeRooms = (function () {
  'use strict';
  let live = null, roomSerial = 0;
  const mutableSpotTags = new Set(['g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan']);
  const blockedKeys = new Set(), heldKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's', 'shift', ' ', 'Enter', 'Escape', 'e', 'm']);
  const keyName = event => event.key === 'Shift' ? 'shift' : event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const escText = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function current() { return live && !live.dead ? live : null; }
  function consume(event) { event.preventDefault(); event.stopImmediatePropagation(); return true; }
  /** A key held through a room/control transition belongs to its old action.
   * Runtime calls this before either room or outdoor keyboard routing. */
  function filterKey(event) {
    const k = keyName(event); if (!blockedKeys.has(k)) return false;
    if (event.type === 'keydown' && !event.repeat) { blockedKeys.delete(k); return false; }
    if (event.type === 'keyup') blockedKeys.delete(k);
    const s = current(); if (s) { s.held.delete(k); (s.music ? _ee : _grm).keys.delete(k); }
    const direction = typeof _GW_KEYMAP !== 'undefined' && _GW_KEYMAP[event.key];
    if (typeof _gw !== 'undefined') { if (direction) _gw.keys.delete(direction); if (k === 'shift') _gw.keys.delete('shift'); }
    return consume(event);
  }
  function focusScene(s) { s = s || current(); if (s && s.context.box && s.context.box.focus) s.context.box.focus({ preventScroll: true }); }
  function suspendInput(s, quarantine) {
    if (!s || s.dead) return;
    if (quarantine) for (const k of s.held) blockedKeys.add(k);
    const state = s.music ? _ee : _grm, M = state.me;
    state.keys.clear(); if (typeof _gw !== 'undefined') _gw.keys.clear();
    _gwFishRelease();
    if (!s.music && state.R && state.S) { const P = GRM_PLAY[state.R.play]; if (P.cancel) P.cancel(state.R, state.S); }
    if (M) {
      const moving = M.moving || M.tx != null || M.keyed;
      M.tx = M.ty = null; M.go = null; M.leave = false; M.moving = M.keyed = false;
      if (moving) (s.music ? _eeSendAt : _grmSend)(M.x, M.y);
    }
  }
  function controlsOpen(element) {
    const s = current(); if (!s || !element || !s.ui.contains(element)) return false;
    suspendInput(s, true);
    const first = element.querySelector('button,input,select,textarea,[tabindex]'); if (first) first.focus({ preventScroll: true });
    return true;
  }
  function controlsClose(element) {
    const s = current(); if (!s || !element || !s.ui.contains(element)) return false;
    suspendInput(s, true); focusScene(s); return true;
  }
  function bindRoomInput(s) {
    s.held = new Set(); s.ask = s.ui.querySelector('.grm-ask');
    s.ui.addEventListener('keydown', event => { const k = keyName(event); if (heldKeys.has(k)) s.held.add(k); }, true);
    s.controlFocus = event => {
      if (current() !== s || !event.target.closest) return;
      if (event.target.closest('button,input,select,textarea,[contenteditable="true"],[role="menu"]') || event.target.closest('[role="dialog"]') && !s.ui.contains(event.target)) suspendInput(s, true);
    };
    s.inputBlur = event => { if (event && event.type === 'blur' && event.target !== window) return; blockedKeys.clear(); s.held.clear(); suspendInput(s, false); };
    s.inputVisibility = () => { if (document.hidden) s.inputBlur(); };
    document.addEventListener('focusin', s.controlFocus, true);
    window.addEventListener('blur', s.inputBlur, true); document.addEventListener('visibilitychange', s.inputVisibility);
  }
  window.addEventListener('blur', event => { if (event.target === window) blockedKeys.clear(); }, true);
  function art(scene, source, parent, depth) {
    const handle = GardenNativeArt.create(scene, source || '', { depth: depth || 0 });
    if (parent && handle.root.parentContainer !== parent) parent.add(handle.root);
    return handle;
  }
  function framedArt(s, source, parent, depth) {
    const handle = art(s.context.scene, '<svg data-native-room-layer="1" width="' + GRM.W + '" height="' + GRM.H + '" viewBox="0 0 ' + GRM.W + ' ' + GRM.H + '" overflow="hidden">' + source + '</svg>', parent, depth);
    handle.roomLayer = handle.node.children.find(node => node.localName === 'svg'); return handle;
  }
  function unwrap(node) { return node && (node.target || node.object || node.root || node); }
  function removeHandle(handle) { if (handle && handle.destroy) handle.destroy(); }
  function sourceBounds(source, local, target) {
    const m = source.getWorldTransformMatrix(), e = m.tx == null ? m.e || 0 : m.tx, f = m.ty == null ? m.f || 0 : m.ty;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const x of [local.x, local.x + local.width]) for (const y of [local.y, local.y + local.height]) { const px = m.a * x + m.c * y + e, py = m.b * x + m.d * y + f; x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py); }
    target.x = x0; target.y = y0; target.width = x1 - x0; target.height = y1 - y0; return target;
  }
  function physicalSource(s, node, id, kind, contact) {
    const source = unwrap(node), local = node.getBBox ? node.getBBox() : { x: -30, y: -80, width: 60, height: 80 };
    if (!source || !source.getWorldTransformMatrix || !(local.width > 0 && local.height > 0)) return null;
    const captureKey = 'room:' + s.serial + ':source:' + (++s.sourceSerial);
    return { id, source, captureKey, baseCaptureKey: captureKey, localBounds: local, bounds: sourceBounds(source, local, {}), x: 0, y: 0, w: 0, h: 0, tall: 0, kind, dynamic: kind === 'actor' || kind === 'pet', moving: false, bakedContact: !!contact };
  }
  function nearWater(s, row) {
    if (!s.water) return false;
    const w = s.water, reach = Math.max(100, Math.min(220, row.h * 1.5));
    return row.bounds.x + row.bounds.width >= w.x0 - 70 && row.bounds.x <= w.x1 + 70 && row.y >= w.y0 - reach && row.y <= w.y1 + 70;
  }
  function roomLights(s) {
    if (!s.lights) s.lights = s.music ? [{ x: 150, y: 36, radius: 440, color: '#ef8663', intensity: .75 }, { x: 810, y: 36, radius: 440, color: '#8b9eeb', intensity: .75 }] : [{ x: 480, y: 120, radius: 500, color: '#ffe3a8', intensity: .65 }];
    if (s.music) for (const light of s.lights) light.intensity = .75 + _ee.lvl * .2;
    return s.lights;
  }
  function trimWaterSurface(s, handle) {
    if (!s.water || !window.GardenNativeWater || !handle) return;
    // Keep ceiling water, the cave's drip and fishing-specific effects. Only
    // the broad in-pool surface marks belong to the shared water renderer.
    for (const cls of ['grm-rip', 'grm-tw']) for (const node of handle.queryAll('.' + cls)) {
      const local = node.getBBox(), bounds = sourceBounds(node.target, local, {});
      if (_grwIn(s.water, bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, 10)) node.remove();
    }
  }
  function backgroundSources(s) {
    if (!s.water) return;
    for (const node of (s.background.roomLayer || s.background.node).children) {
      if (node.localName !== 'g' || !node.hasAttribute('transform')) continue;
      const row = physicalSource(s, node, 'room:' + s.serial + ':scenery:' + s.scenery.length, 'scenery', true);
      if (!row || row.bounds.width > 380 || row.bounds.height > 250 || row.bounds.height < 18) continue;
      row.x = row.bounds.x + row.bounds.width / 2; row.y = row.bounds.y + row.bounds.height; row.w = row.bounds.width; row.h = row.bounds.height; row.tall = row.h;
      if (nearWater(s, row)) s.scenery.push(row);
    }
  }
  function roomUi(s, music) {
    const root = document.createElement('div'); root.className = 'grm-native-room'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', music ? 'A room behind the garden' : s.R.name);
    root.style.cssText = 'position:absolute;inset:0;z-index:40;pointer-events:none';
    root.innerHTML = '<div class="ee-ui"><button type="button" class="btn btn-secondary btn-sm ee-leave">Leave</button>'
      + (music ? '<div class="ee-sound"><button type="button" class="btn btn-secondary btn-sm ee-snd"><span>Sound on</span></button><input type="range" class="ee-vol" min="0" max="100" step="1" value="50" aria-label="Volume"></div>' : s.R.furnish && !gpVisiting() ? '<button type="button" class="btn btn-secondary btn-sm grm-furn">Furnish</button>' : '')
      + '</div><div class="grm-bag"></div><div class="grm-ask"></div><p class="grm-say" role="status"></p>';
    for (const node of root.querySelectorAll('.ee-ui,.grm-bag,.grm-ask')) node.style.pointerEvents = 'auto';
    root.querySelector('.ee-leave').onclick = () => leave();
    const furnish = root.querySelector('.grm-furn'); if (furnish) furnish.onclick = gardenRoomFurnish;
    (s.context.box || sceneCanvas(s).parentElement).appendChild(root);
    root.addEventListener('pointermove', ev => { if (!s.music && _grm.S && _grm.S.on && s.R.play === 'beam') { const p = point(ev.clientX, ev.clientY); _grm.S.bx = Math.max(60, Math.min(900, p.x)); } });
    return root;
  }
  function sceneCanvas(s) { return s.context.scene.game.canvas; }
  function resize(s) {
    const scene = s.context.scene, w = scene.scale.width, h = scene.scale.height;
    if (s.width === w && s.height === h) return;
    s.width = w; s.height = h; s.zoom = Math.min(w / GRM.W, h / GRM.H);
    const cam = scene.cameras.main; cam.setZoom(s.zoom); cam.centerOn(GRM.W / 2, GRM.H / 2);
  }
  function point(clientX, clientY) {
    const s = current(); if (!s) return null;
    const b = sceneCanvas(s).getBoundingClientRect(), x = (clientX - b.left) * s.width / Math.max(1, b.width), y = (clientY - b.top) * s.height / Math.max(1, b.height);
    return { x: (x - (s.width - GRM.W * s.zoom) / 2) / s.zoom, y: (y - (s.height - GRM.H * s.zoom) / 2) / s.zoom };
  }
  function nativeActor(s, M) {
    if (s.people.has(M)) return s.people.get(M);
    const root = s.context.scene.add.container(M.x, M.y), body = s.context.scene.add.container(0, 0);
    const shadow = s.context.scene.add.ellipse(0, 1, 34, 9, 0x111511, .24);
    const label = s.context.scene.add.text(0, -112, M.me ? 'You' : M.n, { fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#fff2d8', stroke: '#22180f', strokeThickness: 3 }).setOrigin(.5, 1);
    root.add([shadow, body, label]); s.root.add(root);
    const N = { root, body, label, shadow, poses: new Map(), active: null, key: '', dead: false, effect: { id: 'room:' + s.serial + ':actor:' + (M.me ? 'local' : M.w), source: body, bounds: {}, kind: 'actor', dynamic: true, bakedContact: true } };
    const ref = { target: root, get isConnected() { return !N.dead && !s.dead; }, remove() { if (!N.dead) { N.dead = true; clearPeerFishing(M); for (const handle of N.poses.values()) removeHandle(handle); root.destroy(); s.people.delete(M); s.effectRevision++; } }, querySelector(selector) { return selector === '.ee-pname' ? { style: { set display(value) { label.setVisible(value !== 'none'); } } } : null; } };
    M.g = ref; M.in = null; M.bob = body; M.key = ''; s.people.set(M, N); s.effectRevision++; return N;
  }
  function poseActor(s, M) {
    const N = nativeActor(s, M), P = s.music ? { pose: M.moving && gardenMotionOn() ? 'walk' : 'idle', dir: M.dir, rod: false, gear: null } : _grmPose(M);
    if (N.avatar !== M.a) { for (const handle of N.poses.values()) removeHandle(handle); N.poses.clear(); N.active = null; N.key = ''; N.avatar = M.a; }
    if (N.name !== M.n) { N.name = M.n; N.label.setText(M.me ? 'You' : M.n); }
    const key = [P.pose, P.dir, !!gardenMotionOn(), !!P.rod, JSON.stringify(P.gear || null)].join('|');
    if (N.key !== key) {
      if (N.active) N.active.root.setVisible(false);
      let handle = N.poses.get(key);
      if (!handle) {
        const source = typeof gartPlayerSvg === 'function' ? gartPlayerSvg(M.a, { dir: P.dir, pose: P.pose, motion: gardenMotionOn(), stageRod: P.rod, gear: P.gear }) : _eeFigure(M.a, P.dir, M.moving);
        handle = art(s.context.scene, source, N.body); handle.nativeGait = /\bgpl-root\b/.test(source); handle.effectBounds = handle.bounds; handle.effectKey = 'room:' + s.serial + ':pose:' + (++s.sourceSerial); N.poses.set(key, handle);
      }
      N.poses.delete(key); N.poses.set(key, handle);
      if (N.poses.size > 10) { const first = N.poses.keys().next().value; removeHandle(N.poses.get(first)); N.poses.delete(first); }
      handle.root.setVisible(true); N.active = handle; N.key = key;
    }
    // Authored gpl walk poses already animate their root bounce. Adding the
    // legacy wrapper bob made two unsynchronised gaits lift the same figure.
    const motion = gardenMotionOn(), bob = !motion ? 0 : M.moving ? N.active && N.active.nativeGait ? 0 : -Math.abs(Math.sin(s.time * 11)) * 2 : s.music ? -Math.abs(Math.sin(s.time * 4.2 + (M.ph || 0))) * (.4 + _ee.lvl) : 0;
    if (P.rod && M.me) M.face = _gw.face;
    const facing = P.dir === 'e' ? M.face < 0 ? 'w' : 'e' : P.dir, ordinary = !P.rod && (P.pose === 'idle' || P.pose === 'walk');
    if (motion && ordinary) {
      if (N.facing != null && N.facing !== facing && M.moving) N.turnAt = s.time;
      if (N.wasMoving && !M.moving && P.pose === 'idle') N.arriveAt = s.time;
    } else N.turnAt = N.arriveAt = -Infinity;
    const turnAge = s.time - N.turnAt, arriveAge = s.time - N.arriveAt;
    const turn = turnAge >= 0 && turnAge < .12 ? (1 - turnAge / .12) ** 2 : 0, arrive = arriveAge >= 0 && arriveAge < .2 ? Math.sin(arriveAge / .2 * Math.PI) * (1 - arriveAge / .2) : 0;
    N.facing = facing; N.wasMoving = !!M.moving;
    N.root.setPosition(M.x, M.y).setDepth(1000 + M.y);
    N.body.setPosition(0, bob).setScale((P.dir === 'e' && M.face < 0 ? -1 : 1) * EE.fig * (1 - .035 * turn + .018 * arrive), EE.fig * (1 + .012 * turn - .025 * arrive));
    N.label.setVisible(!(M.me ? _gmo.g : M.heldG));
  }
  function clearPeerFishing(M) {
    if (!M || !M.fxr) return;
    const A = _gll.actors.get(M.w);
    if (A && A.fxg && A.fxg.parentNode === M.fxr) _gllFxClear(A);
    M.fxr.remove(); M.fxr = null;
  }
  function fishingAnchor(A, F) {
    const s = current();
    if (!s || s.music || !s.water || !s.gameNode || !A || !F || F.bx < GARDEN_ROOM_X || A.rm !== s.R.id || _grwByCell(F.bx, F.by) !== s.water) return false;
    const Q = _grm.m.get(A.w); if (!Q || !Q.g || !Q.g.isConnected) return false;
    if (!Q.fxr || !Q.fxr.isConnected) { Q.fxr = gardenSceneElement('g', { class: 'grm-fxr', 'data-peer': String(A.w) }); s.gameNode.appendChild(Q.fxr); }
    const transform = `translate(${(Q.x / GRW.k).toFixed(2)} ${(Q.y / GRW.k).toFixed(2)})`;
    if (Q.fxr.getAttribute('transform') !== transform) Q.fxr.setAttribute('transform', transform);
    const at = _grwCell(s.water, Q.x, Q.y), face = F.bx >= at.x ? 1 : -1, turned = Q.face !== face;
    A.face = face; Q.face = face; if (turned) poseActor(s, Q);
    return { root: Q.fxr, x: at.x, y: at.y, native: true };
  }
  function peerFishingFrame(s, dt) {
    // The outdoor sprites sleep while a native room is active. Advance each
    // visible peer's existing presentation once, using the shared live rig.
    for (const Q of _grm.m.values()) {
      const A = _gll.actors.get(Q.w), F = A && A.fish;
      if (s.water && F && F.bx >= GARDEN_ROOM_X && A.rm === s.R.id && _grwByCell(F.bx, F.by) === s.water) _gllFxStep(A, dt);
      else clearPeerFishing(Q);
    }
  }
  /** Reconcile small authored state changes without replacing live joints.
   * Only authored deltas are written: a wheel's current rotation, a held pot's
   * tilt and ambient animation phases belong to their existing frame writers. */
  function patchSpot(item, ast) {
    const changes = []; let count = 0;
    const identical = (a, b) => ++count <= 256 && a.tag === b.tag && a.text === b.text && Object.keys(a.attrs).length === Object.keys(b.attrs).length && Object.keys(a.attrs).every(k => a.attrs[k] === b.attrs[k]) && a.children.length === b.children.length && a.children.every((child, i) => identical(child, b.children[i]));
    const collect = (node, before, after) => {
      if (++count > 256 || !node || node._dead || before.tag !== after.tag) return false;
      if (!mutableSpotTags.has(after.tag)) return identical(before, after);
      if (before.attrs.id !== after.attrs.id) return false;
      if (before.children.length !== after.children.length || node.children.length !== after.children.length) return false;
      for (const key of Object.keys(before.attrs)) if (!(key in after.attrs)) changes.push([node, key, null]);
      for (const [key, value] of Object.entries(after.attrs)) if (before.attrs[key] !== value) changes.push([node, key, value]);
      if (before.text !== after.text) changes.push([node, null, after.text]);
      return before.children.every((child, i) => collect(node.children[i], child, after.children[i]));
    };
    if (!item.ast || !collect(item.art.node, item.ast, ast)) return false;
    for (const [node, key, value] of changes) {
      if (key == null) node.textContent = value;
      else { if (node._grmAttrs) delete node._grmAttrs[key]; if (value == null) node.removeAttribute(key); else node.setAttribute(key, value); }
    }
    return true;
  }
  function paint() {
    const s = current(); if (!s || s.music || !_grm.R || !_grm.S) return;
    const next = _grmAllSpots(s.R, _grm.S), keep = new Set(), occurrences = new Map(), stats = s.spotStats || (s.spotStats = { built: 0, patched: 0, moved: 0 });
    for (let i = 0; i < next.length; i++) {
      const q = next[i], id = String(q.id), occurrence = occurrences.get(id) || 0, key = id + '|' + occurrence, source = '<g class="' + escText(q.cls || '') + '">' + q.art + '</g>';
      occurrences.set(id, occurrence + 1);
      keep.add(key); let item = s.spots.get(key);
      let changed = false;
      if (!item || item.source !== source) {
        const ast = GardenNativeArt.parse(source);
        if (item && patchSpot(item, ast)) { item.source = source; item.ast = ast; stats.patched++; }
        else { if (item) removeHandle(item.art); item = { q, source, ast, art: art(s.context.scene, source, s.root, 100 + i / 1000) }; stats.built++; }
        changed = true; s.spots.set(key, item); s.effectRevision++;
      }
      if (item.art.root.x !== q.x || item.art.root.y !== q.y) { item.art.root.setPosition(q.x, q.y); stats.moved++; }
      item.art.root.setDepth(100 + i / 1000); item.q = q;
      if (changed) {
        const body = item.art.node.children[0]; if (body && !/^(dim|ray|beam|pips|chart)$/.test(String(q.id))) item.effect = physicalSource(s, body, 'room:' + s.serial + ':spot:' + key, 'scenery', true);
      }
    }
    for (const [key, item] of s.spots) if (!keep.has(key)) { removeHandle(item.art); s.spots.delete(key); s.effectRevision++; }
    s.spotList = next; s.queries.clear();
  }
  function query(selector, all) {
    const s = current(); if (!s) return all ? [] : null;
    const key = (all ? '*' : '') + selector; if (s.queries.has(key)) return s.queries.get(key);
    const result = [];
    for (const item of s.spots.values()) { if (item.art.queryAll) result.push(...item.art.queryAll(selector)); else if (item.art.find && selector[0] === '.') { const match = item.art.find(selector.slice(1)); if (match) result.push(...(Array.isArray(match) ? match : [match])); } }
    const value = all ? result : result[0] || null; s.queries.set(key, value); return value;
  }
  function water() { const s = current(); return s && !s.music ? s.water : null; }
  function cell(x, y) { const w = water(); return w ? _grwCell(w, x, y) : null; }
  function roomPoint(x, y) { const w = water(); return w ? _grwRoomPt(w, x, y) : null; }
  function pick(x, y) {
    const s = current(); if (!s) return null;
    for (let i = s.spotList.length - 1; i >= 0; i--) { const q = s.spotList[i]; if (!q.still && x >= q.x - q.w / 2 && x <= q.x + q.w / 2 && y >= q.y - q.h && y <= q.y) return { kind: 'room-spot', id: q.id, spot: q }; }
    if (s.water && _grwIn(s.water, x, y)) return { kind: 'water', room: s.R, x, y, cell: _grwCell(s.water, x, y) };
    return { kind: 'ground', x, y };
  }
  function pointer(event) {
    const s = current(); if (!s || event.target && event.target.closest && event.target.closest('.ee-ui,.grm-ask,.grm-bag,.gd-fishhud-b,.gd-catchcard')) return false;
    const p = typeof event.clientX === 'number' ? point(event.clientX, event.clientY) : event; if (!p) return false;
    if (event.button != null && event.button !== 0 || p.x < 0 || p.x > GRM.W || p.y < 0 || p.y > GRM.H) return false;
    if (s.music) { const D = EE.door; _eeWalkTo(p.x, p.y, p.x >= D.x0 - 6 && p.x <= D.x1 + 6 && p.y >= D.y0 - 34 && p.y <= D.y1 + 6); return true; }
    if (_gwFishBusy()) { if (s.context.onInteract) s.context.onInteract({ kind: 'fish-press', room: s.R }); return true; }
    if (s.ask && s.ask.childElementCount) { s.ask.textContent = ''; controlsClose(s.ask); return true; }
    if (_grm.carry) { _grmCarryClick(event); return true; }
    const P = GRM_PLAY[s.R.play], hit = pick(p.x, p.y), F = s.R.floor || GRM.floor, D = GRM.door;
    if (hit.kind === 'room-spot') { const q = hit.spot; if (q.now) _grmAct(q.id); else _grmWalk(q.x, Math.max(q.y + 26, F.y0 + 8), () => _grmAct(q.id)); return true; }
    if (P.tap && P.tap(s.R, _grm.S, p)) return true;
    if (p.x >= D.x0 - 6 && p.x <= D.x1 + 6 && p.y >= D.y0 - 20 && p.y <= D.y1 + 6) { _grmWalk(D.x, D.y, leave); return true; }
    if (hit.kind === 'water') { castAt(p.x, p.y); return true; }
    if (s.R.play === 'net') { let best = null, distance = 56; for (const bug of _grm.S.bugs || []) { const d = Math.hypot(bug.x - p.x, bug.y - (bug.lift || 0) - p.y); if (d < distance) { distance = d; best = bug; } } if (best) { _grbChase(best); return true; } }
    _grmWalk(p.x, p.y); return true;
  }
  function castAt(x, y) {
    const s = current(), w = water(), M = _grm.me; if (!s || !w || !M) return;
    const target = _grwSnap(w, _grwCell(w, x, y)); if (!target) return;
    const targetRoom = _grwRoomPt(w, target.x, target.y), me = _grwCell(w, M.x, M.y), reach = gardenRod().st.range - .15;
    const cast = () => { M.tx = M.ty = null; M.go = null; if (s.context.onInteract) s.context.onInteract({ kind: 'water', room: s.R, x: targetRoom.x, y: targetRoom.y, cell: target, me: _grwCell(w, M.x, M.y) }); };
    if (Math.hypot(me.x - target.x, me.y - target.y) <= reach) { cast(); return; }
    let best = null, distance = Infinity;
    for (let a = 0; a < Math.PI * 2; a += .2) for (const r of [reach, reach * .8, reach * .6]) { const px = targetRoom.x + Math.cos(a) * r * GRW.cw, py = targetRoom.y + Math.sin(a) * r * GRW.ch, q = _grmClamp(px, py); if (Math.abs(q.x - px) > 1 || Math.abs(q.y - py) > 1) continue; const d = Math.hypot(q.x - M.x, q.y - M.y); if (d < distance) { distance = d; best = q; } }
    if (best) _grmWalk(best.x, best.y, cast); else _grmSay('Out of reach. Try from nearer the water.');
  }
  function front() {
    const w = water(), M = _grm.me; if (!w || !M) return;
    let best = null, distance = Infinity;
    for (const [x, y, rx, ry] of w.e) { const n = Math.hypot((M.x - x) / rx, (M.y - y) / ry) || 1, p = { x: x + (M.x - x) / n * .55, y: y + (M.y - y) / n * .55 }, d = Math.hypot(p.x - M.x, p.y - M.y); if (d < distance) { distance = d; best = p; } }
    if (best) castAt(best.x, best.y);
  }
  function key(event) {
    const s = current(); if (!s) return false;
    const k = keyName(event), state = s.music ? _ee : _grm;
    if (event.type === 'keyup') {
      s.held.delete(k); state.keys.delete(k); if (k === 'shift') state.keys.delete('Shift');
      if (!s.music && (k === ' ' || k === 'e' || k === 'Enter')) { _gwFishRelease(); _grmUp(); }
      else if (k === 'ArrowUp') _gwFishRelease();
      return true;
    }
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return false;
    if (heldKeys.has(k)) s.held.add(k);
    if (!s.music && s.ask && s.ask.childElementCount) {
      if (k === 'Escape') { s.ask.textContent = ''; controlsClose(s.ask); return consume(event); }
      if (k.startsWith('Arrow')) {
        const choices = [...s.ask.querySelectorAll('button')], at = choices.indexOf(document.activeElement), next = (at + (k === 'ArrowLeft' || k === 'ArrowUp' ? -1 : 1) + choices.length) % choices.length;
        if (choices[next]) choices[next].focus({ preventScroll: true }); return consume(event);
      }
      if (k !== 'Tab' && k !== 'Enter' && k !== ' ') return consume(event);
      return true;
    }
    if (!s.music && k === 'Escape' && !_gwFishBusy() && (_grm.carry || _grm.fu)) {
      if (_grm.carry) { _grm.carry = ''; _grmBagPaint(); } else gardenRoomFurnish();
      suspendInput(s, true); focusScene(s); return consume(event);
    }
    if (s.music) _eeKey(event); else _grmKey(event); return true;
  }
  function pointerMove(event) { const s = current(); if (!s || s.music || s.R.play !== 'beam' || !_grm.S.on) return; const p = point(event.clientX, event.clientY); if (p) _grm.S.bx = Math.max(60, Math.min(900, p.x)); }
  function up() { const s = current(); if (s && !s.music) { _gwFishRelease(); _grmUp(); } }
  function swing(M) {
    const s = current(); if (!s || !M) return;
    const handle = art(s.context.scene, '<g transform="translate(0 -52) scale(' + ((M.face < 0 ? -1 : 1) * EE.fig) + ' ' + EE.fig + ')"><path d="M6 8Q30 -16 30 -34" stroke="#fbfbf2" stroke-width="2.6" fill="none"/>' + (typeof gardenLookNetSwing === 'function' ? gardenLookNetSwing(gardenLookWorn('net')) : '') + '</g>', s.root, 2000 + M.y);
    handle.root.setPosition(M.x, M.y); s.effects.push({ art: handle, until: s.now + 360 });
  }
  function bugs(dt) {
    const s = current(), S = _grm.S, M = _grm.me; if (!s || !S || !S.bugs || !M) return;
    const moving = gardenMotionOn(), sneak = _grm.keys.has('shift') || !!M.net, keep = new Set();
    for (const b of S.bugs) {
      keep.add(b.key); let item = s.bugArts.get(b.key);
      if (!item) { item = art(s.context.scene, gardenBugArt(b.id, { uid: 'native-room-' + b.key, v: b.v }), s.root); s.bugArts.set(b.key, item); }
      const floor = s.R.floor || GRM.floor;
      if (b.state === 'flee' && (b.tx < 0 || b.tx > GRM.W || b.ty < 0 || b.ty > floor.y1 + 40 || b.needPick)) { const q = _grbPick(b, true); b.tx = q.x; b.ty = q.y; b.needPick = false; }
      if (moving) {
        const distance = Math.hypot(b.x - M.x, (b.y - M.y) * 1.2), skit = GRW.cw * (.9 + .38 * b.def.skit), danger = M.moving && !sneak ? skit : M.moving ? skit * .42 : skit * .28;
        if (b.state !== 'flee' && distance < danger && Math.random() < dt * (M.moving && !sneak ? 9 : 1.1 * b.def.skit / 3)) { b.state = 'flee'; b.fleeT = 1.6 + Math.random(); const q = _grbPick(b, true); b.tx = q.x; b.ty = q.y; }
        b.timer -= dt; const crawl = b.def.rest === 'crawl';
        if (b.state === 'rest') { if (b.timer <= 0 && M.net !== b) { const q = _grbPick(b, false); b.tx = q.x; b.ty = q.y; b.state = 'fly'; b.timer = 3; } b.lift += ((crawl ? 0 : 8 + (b.def.rest === 'hover' ? 10 : 0)) - b.lift) * Math.min(1, dt * 5); }
        else { const speed = b.state === 'flee' ? 260 : crawl ? 26 : 90, dx = b.tx - b.x, dy = b.ty - b.y, distance = Math.hypot(dx, dy); if (distance < 6 || b.timer < -6) { b.state = 'rest'; b.timer = crawl ? 1 + Math.random() * 3 : 2.5 + Math.random() * 5; } else { b.x += dx / distance * speed * dt; b.y += dy / distance * speed * dt * .7; if (Math.abs(dx) > 1) b.face = dx > 0 ? 1 : -1; b.lift += ((crawl ? 0 : 26 + Math.sin(s.time * 5 + b.seed) * 5) - b.lift) * Math.min(1, dt * 4); } if (b.state === 'flee') { b.fleeT -= dt; if (b.fleeT <= 0) { b.state = 'fly'; b.timer = 3; } } }
      }
      item.root.setPosition(b.x, b.y - b.lift).setScale(b.face * GRB.scale * b.def.size, GRB.scale * b.def.size).setDepth(1000 + b.y);
    }
    for (const [id, handle] of s.bugArts) if (!keep.has(id)) { removeHandle(handle); s.bugArts.delete(id); }
    if (M.net) {
      const b = M.net; if (!S.bugs.includes(b)) { M.net = null; return; }
      if (M.swing > 0) { M.swing -= dt; if (M.swing <= 0) { M.net = null; _grbResolve(b); } return; }
      if (Math.hypot(b.x - M.x, (b.y - M.y) * 1.3) <= gardenNet().st.reach * GRB.reach) { M.tx = M.ty = null; M.swing = gardenNet().st.swing; M.face = b.x >= M.x ? 1 : -1; _gw.face = M.face; swing(M); gardenLiveFx('bug', 'swing'); return; }
      if (M.keyed) { M.net = null; return; }
      const q = _grmClamp(b.x + (M.x < b.x ? -30 : 30), Math.max((s.R.floor || GRM.floor).y0 + 4, b.y + 14)); M.tx = q.x; M.ty = q.y; M.netT = (M.netT || 0) + dt; if (M.netT > 9) { M.net = null; _grmSay('It got away from you.'); }
    }
  }
  function fish(dt) {
    const s = current(), w = water(); if (!s || !w || typeof _gfs === 'undefined') return;
    const keep = new Set(), motion = gardenMotionOn();
    for (const f of _gfs.list.values()) {
      if (f.x < GARDEN_ROOM_X || f.y < w.cy || f.y >= w.cy + GRW.rows) continue;
      keep.add(f.u); let item = s.fishArts.get(f.u);
      if (!item) { item = art(s.context.scene, _gfsArt(f.def, f.cm, f.v), s.fishLayer || s.root, 60); s.fishArts.set(f.u, item); }
      _gfsVisualStep(f, item, dt, s.time, motion);
      const p = _gwPx(item.sx, item.sy); _gfsVisualProject(f, item, p[0], p[1]);
      const angle = item.angle == null ? item.heading || 0 : item.angle, scale = GRW.k * (item.size || 1);
      item.root.setPosition(item.drawX * GRW.k, item.drawY * GRW.k).setRotation(angle).setScale(scale * (item.bodyScaleX || 1), scale * (item.bodyScaleY || 1)).setAlpha(Math.min(1, (item.alpha || 0) + dt * .8)); item.alpha = item.root.alpha;
      _gfsVisualParts(f, item.node, item, motion);
      _gfsVisualReaction(f, item, motion);
    }
    for (const [id, handle] of s.fishArts) if (!keep.has(id)) { removeHandle(handle); s.fishArts.delete(id); }
  }
  function move(s, dt, ts) {
    const state = s.music ? _ee : _grm, M = state.me, K = state.keys, P = !s.music && GRM_PLAY[s.R.play]; if (!M) return;
    const sneak = K.has('shift') || K.has('Shift');
    let vx = (K.has('ArrowRight') || K.has('d') ? 1 : 0) - (K.has('ArrowLeft') || K.has('a') ? 1 : 0), vy = (K.has('ArrowDown') || K.has('s') ? 1 : 0) - (K.has('ArrowUp') || K.has('w') ? 1 : 0);
    const locked = !s.music && (_gwFishBusy() || P.lock && P.lock(s.R, _grm.S)), clamp = s.music ? _eeClamp : _grmClamp, send = s.music ? _eeSendAt : _grmSend;
    if (locked) { M.moving = false; if (M.tx != null && !_gwFishBusy()) M.tx = M.ty = null; }
    else if (vx || vy) { const n = Math.hypot(vx, vy); vx /= n; vy /= n; M.tx = M.ty = null; M.go = null; M.leave = false; const speed = sneak ? GRB.sneak : s.music ? EE.speed : GRM.speed, q = clamp(M.x + vx * speed * dt, M.y + vy * speed * dt * .8); M.moving = q.x !== M.x || q.y !== M.y; M.x = q.x; M.y = q.y; M.keyed = true; if (vx) M.face = vx > 0 ? 1 : -1; M.dir = Math.abs(vx) >= Math.abs(vy) ? 'e' : vy > 0 ? 's' : 'n'; if (ts - state.sentAt > 420) { state.sentAt = ts; send(M.x + vx * 70, M.y + vy * 50); } }
    else { if (M.keyed) { M.keyed = false; M.moving = false; send(M.x, M.y); } const x0 = M.x, y0 = M.y; _eeMove(M, dt, M.net || sneak ? GRB.sneak : s.music ? EE.speed : GRM.speed); if (s.dead) return; if (M.tx != null) { const q = clamp(M.x, M.y); M.x = q.x; M.y = q.y; if (Math.hypot(M.x - x0, M.y - y0) < .1) { M.moving = false; M.stuck = (M.stuck || 0) + dt; if (M.stuck > .5) { M.tx = M.ty = null; M.stuck = 0; } } else M.stuck = 0; } if (M.tx == null && M.go) { const go = M.go; M.go = null; go(); } }
    if (s.dead) return; poseActor(s, M);
    for (const [id, Q] of state.m) { if (!_gll.actors.has(id)) { Q.g.remove(); state.m.delete(id); continue; } _eeMove(Q, dt, GRM.speed * 1.2); poseActor(s, Q); }
  }
  function update(time, delta) {
    const s = current(); if (!s || document.hidden) return;
    // Same capped catch-up as the outdoor world: slow frames run up to five
    // 50 ms movement sub-steps, so rooms do not play in slow motion.
    const frameDt = Math.min(.25, Math.max(0, delta > 1 ? delta / 1000 : delta || 1 / 60)), steps = Math.max(1, Math.ceil(frameDt / .05 - 1e-9)), dt = frameDt / steps;
    s.now = time; resize(s); if (s.paintSpec && s.background.update) s.background.update(s.time, frameDt);
    for (let i = 0; i < steps; i++) {
      s.time += dt;
      if (s.music) { _ee.t = s.time; _eeLevel(s.time); }
      else { _grm.t = s.time; _grm.dtNow = dt; }
      move(s, dt, time); if (s.dead) return;
    }
    if (s.music) { for (let i = 0; i < s.pawns.length; i++) { const pawn = s.pawns[i]; _eePawnFrame(EE_BAND[i], pawn, s.time); const obj = unwrap(pawn.pawn); if (obj && obj.setDepth) obj.setDepth(1000 + pawn.cy); } if (gardenMotionOn() && _ee.lvlRaw > .4 && s.time > (s.nextNote || 0)) { s.nextNote = s.time + .2 + Math.random() * .4; const pawn = s.pawns[Math.floor(Math.random() * Math.max(1, s.pawns.length))]; if (pawn) { const note = s.context.scene.add.text(pawn.cx, pawn.cy - 120, Math.random() < .5 ? '♪' : '♫', { fontFamily: 'serif', fontSize: '24px', color: '#ffe7a8' }).setDepth(10000); s.root.add(note); s.context.scene.tweens.add({ targets: note, x: note.x + Math.random() * 50 - 25, y: note.y - 80, alpha: 0, duration: 1600, onComplete: () => note.destroy() }); } } }
    else { const P = GRM_PLAY[s.R.play]; if (P.frame) P.frame(s.R, _grm.S, frameDt); _grmExtraFrame(time); fish(frameDt); peerFishingFrame(s, frameDt); }
    for (const item of s.effects) if (item.until <= time) { removeHandle(item.art); if (item.onEnd) item.onEnd(); } s.effects = s.effects.filter(item => item.until > time);
    if (s.root.sort) s.root.sort('depth');
  }
  function enter(R, context) {
    if (current() || !R || !context || !context.scene || !window.GardenNativeArt) return false;
    const scene = context.scene, music = R === 'back' || R.id === 'back', room = music ? { id: 'back', name: 'A room behind the garden', bg: '#12060a' } : R;
    const s = { context, R: room, music, serial: ++roomSerial, sourceSerial: 0, effectRevision: 0, scenery: [], root: scene.add.container(0, 0).setDepth(100000), people: new Map(), spots: new Map(), spotList: [], queries: new Map(), fishArts: new Map(), bugArts: new Map(), effects: [], pawns: [], time: 0, now: performance.now(), dead: false, water: music ? null : _grwOf(room) };
    s.effectState = { revision: s.serial + ':0', parent: s.root, regions: s.water ? [{ id: 'room-water:' + room.id, parent: s.root, ellipses: s.water.e, bounds: { x: s.water.x0, y: s.water.y0, width: s.water.x1 - s.water.x0, height: s.water.y1 - s.water.y0 }, frozen: false }] : [], containsWater: (x, y) => !!(s.water && _grwIn(s.water, x, y)), actors: [], reflectables: [], lights: [] };
    live = s;
    s.previousCamera = { zoom: scene.cameras.main.zoom, x: scene.cameras.main.midPoint.x, y: scene.cameras.main.midPoint.y, background: scene.cameras.main.backgroundColor && scene.cameras.main.backgroundColor.rgba, bounded: scene.cameras.main.useBounds, bounds: scene.cameras.main._bounds ? { ...scene.cameras.main._bounds } : null };
    if (scene.cameras.main.removeBounds) scene.cameras.main.removeBounds();
    scene.cameras.main.setBackgroundColor(room.bg || '#101b19');
    s.paintSpec = !music && window.GardenRoomArt && GardenRoomArt.wanted(room) ? GardenRoomArt.spec(room) : null;
    if (s.paintSpec) {
      // Painted village style: the room's own painting, baked in slices (94-garden-native-roomart-*.js); the way-out badge stays live.
      s.background = GardenRoomArt.create(s, room); s.doorMark = framedArt(s, '<g class="ee-door"><title>Way out</title>' + _grmOutMark() + '</g>', s.root, 5);
      if (s.paintSpec.lights) s.lights = s.paintSpec.lights.map(light => Object.assign({}, light));
    } else s.background = framedArt(s, music ? _eeArt() + _eeStand(436, 366) + '<g class="ee-beams"><path class="ee-beam ee-b1" d="M150 36L330 380L90 380Z" fill="url(#eebeam)"/><path class="ee-beam ee-b2" d="M810 36L870 380L630 380Z" fill="url(#eebeam)"/></g>' : room.art() + _grmDoorArt(room), s.root, 0);
    if (!music && room.id === 'den' && !s.paintSpec) {
      // The lamp itself stays in the authored art. The engine supplies its
      // continuous falloff instead of caching a tessellated radial halo.
      for (const node of s.background.queryAll('ellipse')) if (node.getAttribute('fill') === 'url(#dl)') node.remove();
      s.lights = [{ id: 'den-desk-lamp', x: 846, y: 350, radius: 210, height: 90, color: '#ffdda0', intensity: 1.15 }];
    }
    if (!s.paintSpec) { trimWaterSurface(s, s.background); backgroundSources(s); }
    if (s.background.cache) s.background.cache({ staticOnly: true, tileSize: 1024 });
    if (s.water) {
      s.fishLayer = scene.add.container(0, 0).setDepth(60); s.root.add(s.fishLayer);
      try { s.waterMask = scene.make.graphics(); s.waterMask.fillStyle(0xffffff); for (const [x, y, rx, ry] of s.water.e) s.waterMask.fillEllipse(x, y, rx * 2, ry * 2); s.fishLayer.enableFilters(); s.maskFilter = s.fishLayer.filters.external.addMask(s.waterMask, false, scene.cameras.main, 'world'); s.maskFilter.autoUpdate = false; }
      catch (e) { if (s.waterMask) { s.waterMask.destroy(); s.waterMask = null; } }
    }
    if (!music && room.waterTop) { s.waterTop = art(scene, room.waterTop(), s.root, 65); trimWaterSurface(s, s.waterTop); }
    if (!music && room.front && !(s.paintSpec && s.paintSpec.ownFront)) { s.front = framedArt(s, room.front(), s.root, 9000); if (s.front.cache) s.front.cache({ staticOnly: true, tileSize: 1024 }); }
    if (!music && typeof gardenSceneElement === 'function') {
      s.gameNode = gardenSceneElement('g', { class: 'grm-game', transform: 'scale(' + GRW.k + ')' });
      const gameObject = unwrap(s.gameNode); if (gameObject && gameObject.setDepth) { gameObject.setDepth(9500); s.root.add(gameObject); }
    }
    s.ui = roomUi(s, music); bindRoomInput(s); resize(s);
    if (context.world && context.world.root) context.world.root.setVisible(false);
    if (music) {
      _ee.root = s.ui; _ee.svg = null; _ee.actors = null; _ee.notes = null; _ee.m.clear(); _ee.keys.clear(); _ee.t = 0; _ee.lvl = 0; _ee.last = 0; _ee.mute = false; _ee.volv = _eeVolRead(); _ee.left = false; _ee.closing = false;
      const p = _eeClamp(EE.spawn.x, EE.spawn.y); _ee.me = { w: -1, n: 'You', a: typeof profileGet === 'function' ? profileGet().avatar : null, x: p.x, y: p.y, tx: null, ty: null, face: 1, dir: 'e', moving: false, me: true, ph: 0 }; _ee.on = true; nativeActor(s, _ee.me); poseActor(s, _ee.me);
      const band = art(scene, _eeBand(), s.root); s.band = band;
      s.pawns = band.queryAll('.ee-pawn').map(pawn => ({ pawn, pb: pawn.querySelector('.ee-pb'), sh: pawn.querySelector('.ee-sh'), mc: pawn.querySelector('.ee-mc'), mo: pawn.querySelector('.ee-mo'), gt: pawn.querySelector('.ee-gt'), open: false, cx: 0, cy: 0 })); _ee.pawns = s.pawns; for (const pawn of s.pawns) s.root.add(unwrap(pawn.pawn));
      for (let i = 0; i < s.pawns.length; i++) { const pawn = s.pawns[i]; pawn.cx = EE_BAND[i].x; pawn.cy = EE_BAND[i].y; pawn.effect = physicalSource(s, pawn.pb, 'room:' + s.serial + ':band:' + EE_BAND[i].id, 'actor', true); }
      s.ui.querySelector('.ee-snd').onclick = _eeMute; const vol = s.ui.querySelector('.ee-vol'); vol.oninput = () => { _ee.volv = Number(vol.value) || 0; if (_ee.mute && _ee.volv > 0) _ee.mute = false; _eeGainApply(); _eeSoundSync(); }; vol.onchange = () => { try { localStorage.setItem(EE_VOL_KEY, String(_ee.volv)); } catch (e) { /* optional preference */ } }; _eeSoundSync(); _eeSongStart(); _eeSendAt(_ee.me.x, _ee.me.y, 'in');
    } else {
      _grm.root = s.ui; _grm.svg = null; _grm.props = { native: true }; _grm.actors = null; _grm.game = s.gameNode || null; _grm.school = null; _grm.bugL = null; _grwa.w = s.water;
      _grm.R = room; _grm.S = {}; _grm.fu = false; _grm.carry = ''; _grm.icons = null; _grm.fuKey = ''; _grm.fuAt = 0; _grm.m.clear(); _grm.keys.clear(); _grm.t = 0; _grm.last = 0; _grm.closing = false;
      GRM_PLAY[room.play].begin(room, _grm.S); const spawn = room.spawn || GRM.spawn, p = _grmClamp(spawn.x, spawn.y); _grm.me = { w: -1, n: 'You', a: typeof profileGet === 'function' ? profileGet().avatar : null, x: p.x, y: p.y, tx: null, ty: null, face: 1, dir: 'e', moving: false, me: true, ph: 0 }; _grm.on = true; nativeActor(s, _grm.me); poseActor(s, _grm.me); paint(); _grwStock(room);
      const first = _grmMarkFound(room); _grmSay(room.say + (first ? ' You have not been here before: you find 3 tickets on the way in.' : ''), 9000); if (room.how) s.howTimer = setTimeout(() => { if (current() === s) _grmSay(room.how, 9000); }, 9200); _grmSend(_grm.me.x, _grm.me.y, 'in');
    }
    if (context.onEnter) context.onEnter(room);
    if (context.box && context.box.focus) context.box.focus({ preventScroll: true });
    return true;
  }
  function leave() {
    const s = current(); if (!s || s.leaving) return false; s.leaving = true;
    suspendInput(s, true);
    document.removeEventListener('focusin', s.controlFocus, true); window.removeEventListener('blur', s.inputBlur, true); document.removeEventListener('visibilitychange', s.inputVisibility);
    if (!s.music) { if (_gwFishBusy()) _gwFishCancel(); gardenMomentEnd(); _gwReelClose(); _grwFishForget(); }
    if (s.context.onInteract) s.context.onInteract({ kind: 'room-leave', room: s.R });
    if (s.music) { _eeSendAt(0, 0, 'out'); _ee.on = false; _ee.closing = false; _eeSongStop(); _ee.root = _ee.svg = _ee.actors = _ee.notes = _ee.me = null; _ee.m.clear(); _ee.keys.clear(); _ee.pawns = []; }
    else { _grmSend(0, 0, 'out'); const S = _grm.S; if (S && S.leave) S.leave(); _grm.on = false; _grm.closing = false; clearTimeout(_grm.sayT); clearTimeout(_grm.howT); _grm.root = _grm.svg = _grm.props = _grm.game = _grm.actors = _grm.school = _grm.bugL = _grm.me = _grm.R = _grm.S = null; _grm.m.clear(); _grm.keys.clear(); _grm.carry = ''; _grm.fu = false; _grwa.w = null; }
    s.dead = true; live = null; clearTimeout(s.howTimer); for (const [M, N] of s.people) { clearPeerFishing(M); for (const handle of N.poses.values()) removeHandle(handle); } for (const item of s.spots.values()) removeHandle(item.art); for (const handle of s.fishArts.values()) removeHandle(handle); for (const handle of s.bugArts.values()) removeHandle(handle); for (const item of s.effects) removeHandle(item.art); removeHandle(s.background); removeHandle(s.doorMark); removeHandle(s.front); removeHandle(s.band); removeHandle(s.waterTop); s.root.destroy(); if (s.waterMask) s.waterMask.destroy(); s.ui.remove();
    if (s.context.world && s.context.world.root) s.context.world.root.setVisible(true);
    if (s.context.box) s.context.box.classList.remove('gd-native-indoor');
    const cam = s.context.scene.cameras.main; if (s.previousCamera.bounded && s.previousCamera.bounds) { const b = s.previousCamera.bounds; cam.setBounds(b.x, b.y, b.width, b.height); } if (s.previousCamera.background) cam.setBackgroundColor(s.previousCamera.background); cam.setZoom(s.previousCamera.zoom); cam.centerOn(s.previousCamera.x, s.previousCamera.y);
    if (s.context.onExit) s.context.onExit(s.R); focusScene(s); return true;
  }
  function addActor(M) { const s = current(); return s ? nativeActor(s, M) : null; }
  function got(A, spec, who) {
    const s = current(); if (!s || !A || !A.rm) return false;
    A.fish = null; const Q = !s.music && s.R.id === A.rm ? _grm.m.get(A.w) : null;
    if (!Q || gardenFun() === 'off') { if (typeof _gllFeed === 'function') _gllFeed(String(who || 'A friend') + ' ' + spec.verb + ' ' + _gscA(spec.name)); return true; }
    const N = nativeActor(s, Q), handle = art(s.context.scene, gardenMomentSvg(spec, { who }), N.root); handle.root.setScale(EE.fig).setDepth(10000);
    const ms = gardenMomentMs(spec); Q.pose = 'hold'; Q.until = Date.now() + ms; Q.dir = 's'; Q.heldG = handle;
    s.effects.push({ art: handle, until: s.now + ms, onEnd: () => { if (Q.heldG === handle) Q.heldG = null; } });
    if (typeof _fxSound === 'function') _fxSound('sparkle'); return true;
  }
  function float(text) { const s = current(), M = s && (s.music ? _ee.me : _grm.me); if (!M) return; const object = s.context.scene.add.text(M.x, M.y - 84, String(text), { fontFamily: 'Inter, sans-serif', fontSize: '20px', color: '#fff2b8', stroke: '#30220f', strokeThickness: 3 }).setOrigin(.5, 1).setDepth(10000); s.root.add(object); s.context.scene.tweens.add({ targets: object, y: object.y - 40, alpha: 0, duration: 1500, onComplete: () => object.destroy() }); }
  function effectsState() {
    const s = current(); if (!s) return null; const state = s.effectState; state.actors.length = 0; state.reflectables.length = 0; state.fishingRigs = [];
    for (const [M, N] of s.people) {
      if (N.dead || !N.active || !N.body.active) continue;
      const row = N.effect; row.captureKey = N.active.effectKey + ':' + (N.body.scaleX < 0 ? -1 : 1); row.revision = row.captureKey; row.localBounds = N.active.effectBounds;
      sourceBounds(N.body, row.localBounds, row.bounds); row.x = M.x; row.y = M.y; row.groundX = M.x; row.groundY = M.y; row.waterline = M.y; row.sourceFootY = N.body.getWorldTransformMatrix().ty; row.w = row.bounds.width; row.h = row.bounds.height; row.tall = row.h; row.moving = !!M.moving;
      state.actors.push(row); state.reflectables.push(row);
      const A = !M.me && typeof _gll !== 'undefined' ? _gll.actors.get(M.w) : null, F = M.me ? _gw.fishing : A && A.fish, fx = M.me ? _gw.fx : A && A.fxe;
      if (s.water && F && F.state !== 'idle' && F.bx >= GARDEN_ROOM_X && _grwByCell(F.bx, F.by) === s.water && fx && fx.rod && fx.line && fx.bob) {
        const p = _grwRoomPt(s.water, F.bx, F.by), u = F.state === 'cast' ? Math.max(0, Math.min(1, (F.t - .22) / .5)) : F.state === 'land' ? (1 - Math.min(1, F.t / .5)) ** 2 : 1;
        state.fishingRigs.push({ id: M.me ? 'player-rig' : 'peer-rig:' + M.w, rod: fx.rod, rodSkin: fx.skin && fx.skin.g, line: fx.line, bob: fx.bob, footX: M.x, footY: M.y, waterX: p.x, waterY: p.y, floatPlaneY: M.y + (p.y - M.y) * u, state: F.state });
      }
    }
    for (const pawn of s.pawns) if (pawn.effect && pawn.effect.source.active) {
      const row = pawn.effect; sourceBounds(row.source, row.localBounds, row.bounds); row.x = pawn.cx; row.y = pawn.cy; row.w = row.bounds.width; row.h = row.bounds.height; row.tall = row.h; row.moving = gardenMotionOn(); row.captureKey = row.baseCaptureKey + ':' + (pawn.open ? 1 : 0); row.revision = row.captureKey;
      state.actors.push(row); state.reflectables.push(row);
    }
    for (const row of s.scenery) if (row.source.active) state.reflectables.push(row);
    for (const item of s.spots.values()) if (item.effect && item.effect.source.active) {
      const row = item.effect; sourceBounds(row.source, row.localBounds, row.bounds); row.x = item.q.x; row.y = item.q.y; row.w = row.bounds.width; row.h = row.bounds.height; row.tall = row.h;
      if (nearWater(s, row)) state.reflectables.push(row);
    }
    state.revision = s.serial + ':' + s.effectRevision; state.lights = roomLights(s); return state;
  }
  function lighting() { const s = current(); if (!s) return null; return { indoor: true, room: s.R.id, background: s.R.bg, width: GRM.W, height: GRM.H, ambient: s.music ? .38 : s.paintSpec && s.paintSpec.ambient != null ? s.paintSpec.ambient : /cellar|cave|grotto/.test(s.R.id) ? .42 : .58, lights: roomLights(s), occluders: s.spotList.filter(q => !q.still && q.w > 30 && q.h > 60).map(q => ({ x: q.x - q.w * .35, y: q.y - 12, width: q.w * .7, height: 12, tall: q.h })) }; }
  return { current, enter, leave, update, paint, query, point, pick, pointer, pointerMove, key, filterKey, controlsOpen, controlsClose, focusScene, up, water, cell, roomPoint, front, castAt, addActor, fishingAnchor, poseActor: M => { const s = current(); if (s) poseActor(s, M); }, bugs, float, swing, got, lighting, effectsState };
})();
