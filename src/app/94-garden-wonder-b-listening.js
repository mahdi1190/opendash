/* The Listening Walk: a phrase learned at three real places restores a wind harp.
   Saves are dated discoveries in garden.wd; visitors only read their host's marks. */
const WD_LISTEN = Object.freeze([
  Object.freeze({ id: 'reed', name: 'Reeds', color: '#70b9bb', note: 392, step: 1, at: Object.freeze(_wdPt('field-journal', 3.3, .12)), clue: 'At the east end of the village promenade, beside the water and beyond the field journal.', line: 'FIRST: Reeds. Three carved waves run under your thumb. The low string answers like water under a little bridge. Next, look beside the garden shop for a leaf.' }),
  Object.freeze({ id: 'leaf', name: 'Leaves', color: '#a6bc69', note: 493.88, step: 2, at: Object.freeze(_wdPt('garden-shop', -1.65, .15)), clue: 'At the garden shop end of the promenade, where the lawn meets the paving.', line: 'SECOND: Leaves. A leaf has been cut right through the wood. Air hums in it when you cover the small hole. The last mark is a bell, just beyond the camera.' }),
  Object.freeze({ id: 'bell', name: 'Bell', color: '#ddb968', note: 587.33, step: 3, at: Object.freeze(_wdPt('camera-tripod', .7, .12)), clue: 'Just beyond the camera on the village promenade, before the tackle shop.', line: 'THIRD: Bell. The little tongue rings once. Below it: TAKE THE WALK HOME IN THE SAME ORDER. The old harp waits beside the notice board.' }),
]);
const _wdel = { head: null, posts: [], mask: -1, phrase: 0, pulses: [0, 0, 0], wrong: 0, jobs: [], talk: null, lastFrame: 0, lastWindBeat: null, revision: 0 };

function gardenListeningWalkMask(w) {
  w = w || _wdG();
  let mask = w['listen.harp'] ? 8 : 0;
  for (let i = 0; i < WD_LISTEN.length; i++) if (w['listen.' + WD_LISTEN[i].id]) mask |= 1 << i;
  return mask;
}
function _wdelMask(m) { return m && m.visit ? Number(_wdTheir(m).el) & 15 : gardenListeningWalkMask(); }
function _wdelGlyph(id, color, width) {
  const stroke = `fill="none" stroke="${color}" stroke-width="${width || 1.8}" stroke-linecap="round" stroke-linejoin="round"`;
  if (id === 'reed') return `<path d="M-9 -5Q-5 -9-1 -5T7 -5M-9 0Q-5 -4-1 0T7 0M-9 5Q-5 1-1 5T7 5" ${stroke}/>`;
  if (id === 'leaf') return `<path d="M-8 6Q-12 -5 7 -10Q13 6-8 6ZM-8 6L6 -8M-3 1L-5 -4M1 -3L6 -2" ${stroke}/>`;
  return `<path d="M-7 4L-5 0V-4Q-5 -10 0 -10Q5 -10 5 -4V0L7 4ZM-2 7Q0 10 2 7M0 -12V-14" ${stroke}/>`;
}
function _wdelPostArt(row, found) {
  const c = found ? row.color : '#b9ae8b';
  return `<ellipse cy="2" rx="15" ry="4" fill="#172b22" opacity=".17"/><path d="M-5 0L-6 -42L6 -42L5 0Z" fill="#71543c"/><path d="M-4 -2L-4 -39" stroke="#aa855a" stroke-width="1.5"/><path d="M-15 -38Q-16 -57 0 -61Q16 -57 15 -38L12 -15H-12Z" fill="#927047" stroke="#5b4734" stroke-width="1.6"/><path d="M-11 -39Q-11 -53 0 -56Q11 -53 11 -39L9 -19H-9Z" fill="#d2bd8a"/><g transform="translate(0 -34)">${_wdelGlyph(row.id, found ? '#3b625a' : '#71644a', 1.6)}</g><circle cx="0" cy="-13" r="6" fill="#4b4435"/><circle class="wdel-post-light" cx="0" cy="-13" r="4.2" fill="${c}" opacity="${found ? .85 : .3}"/><g class="wdel-post-ring" transform="translate(0 0)"><ellipse cy="-13" rx="8.4" ry="7.4" fill="none" stroke="${c}" stroke-width="1" opacity="${found ? .6 : .18}"/></g><text x="0" y="-46" text-anchor="middle" font-size="6.5" fill="#514730">${row.step}</text>`;
}
function _wdelHarpArt(mask) {
  const restored = !!(mask & 8), colors = WD_LISTEN.map((r, i) => mask & 1 << i ? r.color : '#81796a');
  let s = '<ellipse cy="3" rx="43" ry="8" fill="#172b22" opacity=".18"/><path d="M-40 0L-34 -12L31 -12L40 0Z" fill="#756b55"/><path d="M-36 -12L-32 -16L28 -16L35 -12Z" fill="#c6bb97"/>';
  s += '<path d="M-31 -12L-31 -91Q-32 -109-13 -110Q13 -110 25 -85L31 -12H22L16 -81Q9 -98-11 -99Q-22 -99-22 -86V-12Z" fill="#71553e" stroke="#514434" stroke-width="2"/><path d="M-27 -18L-27 -89Q-26 -103-12 -104" fill="none" stroke="#b5915f" stroke-width="2"/><path d="M-21 -86Q-1 -96 17 -78L20 -65Q1 -84-21 -73Z" fill="#b7864e" stroke="#5b4a35" stroke-width="1.3"/>';
  s += `<g class="wdel-sail" transform="translate(0 0)" opacity="${restored ? 1 : .2}"><path d="M-9 -111L-5 -132L14 -119L-5 -118Z" fill="${restored ? '#d5b46d' : '#8a7b5c'}" stroke="#805f37" stroke-width="1"/><path d="M-5 -132L-5 -110" stroke="#735132" stroke-width="1.8"/></g>`;
  for (let i = 0; i < 3; i++) {
    const x = -12 + i * 11, y = -79 + i * 3;
    s += `<g class="wdel-string${i}" transform="translate(0 0)"><path d="M${x} ${y}L${x} -31" stroke="${colors[i]}" stroke-width="${restored ? 1.9 : 1}" opacity="${restored ? .95 : .5}"/><path d="M${x + 2} ${y}L${x + 2} -31" stroke="#f4e6bd" stroke-width=".5" opacity=".5"/></g><circle class="wdel-tone${i}" cx="${x + 1}" cy="-29" r="4" fill="${colors[i]}" opacity=".28"/>`;
  }
  s += '<path d="M-24 -24L25 -24L25 -13H-24Z" fill="#4e5b4a" stroke="#b5a779" stroke-width="1"/>';
  for (let i = 0; i < 3; i++) s += `<g transform="translate(${-15 + i * 16} -18.5) scale(.3)">${_wdelGlyph(WD_LISTEN[i].id, colors[i], 2.2)}</g>`;
  s += `<path class="wdel-harp-halo" d="M-38 -4Q-48 -78-13 -115Q35 -105 40 -4" fill="none" stroke="${restored ? '#d6bd7b' : '#a6aa8f'}" stroke-width="1.2" opacity="${restored ? .22 : 0}"/>`;
  return s;
}
function _wdelPlace(at, from) {
  const offsets = [[0, 0], [0, -.25], [0, .25], [-.5, 0], [.5, 0], [-.5, -.25], [.5, -.25], [-1, 0], [1, 0], [0, -.75], [-1.5, 0], [1.5, 0], [0, -1.25]];
  for (const [dx, dy] of offsets) {
    const p = { x: at.x + dx, y: at.y + dy };
    if (!_gwFree(p.x, p.y) || typeof gardenWaterContainsPoint === 'function' && gardenWaterContainsPoint(p.x, p.y)) continue;
    if (from && typeof _gwRoute === 'function' && !_gwRoute(from, p)) continue;
    return p;
  }
  return null;
}
function _wdelDraw(S, art) { if (!S || S.svg === art) return; wdArt(S, art); S._listenBindings = null; }
function _wdelBind(S) {
  if (!S || S._off || !S.node || !S.node.isConnected) return null;
  let b = S._listenBindings;
  if (b && b.root === S.node) return b;
  b = { root: S.node, values: {}, strings: [], tones: [] };
  if (S === _wdel.head) {
    for (let i = 0; i < 3; i++) { b.strings.push(S.node.querySelector('.wdel-string' + i)); b.tones.push(S.node.querySelector('.wdel-tone' + i)); }
    b.sail = S.node.querySelector('.wdel-sail'); b.halo = S.node.querySelector('.wdel-harp-halo');
  } else { b.ring = S.node.querySelector('.wdel-post-ring'); b.light = S.node.querySelector('.wdel-post-light'); }
  S._listenBindings = b; return b;
}
function _wdelAttr(b, node, key, name, value) { if (node && b.values[key] !== value) { b.values[key] = value; node.setAttribute(name, value); } }
function _wdelEnvironment() {
  const native = window.GardenNative;
  return native && native.active() && native.lighting() ? native.lighting().environment() : null;
}
function _wdelHeld(env) {
  const root = typeof _gw !== 'undefined' && _gw.svg;
  return !!(document.hidden || typeof _grm !== 'undefined' && _grm.on || env && env.paused || root && (root.hasAttribute('data-garden-frozen') || root.classList.contains('gd-hush')));
}
function _wdelSound(i, quiet) {
  const r = WD_LISTEN[i];
  wdSound([[r.note, quiet ? .7 : .9, 'sine', quiet ? .009 : .022], [r.note * 2, .45, 'triangle', quiet ? .003 : .007, .025]]);
}
function _wdelPulse(i, quiet) { _wdel.pulses[i] = quiet ? .65 : 1; _wdelSound(i, quiet); }
function _wdelQueue(indices, quiet) {
  _wdel.jobs = indices.slice(0, 6).map((i, n) => ({ i, in: n * .28, quiet: !!quiet }));
  if (typeof _gwEnsureLoop === 'function') _gwEnsureLoop();
}
function _wdelNoteActions(T, m) {
  return WD_LISTEN.map((r, i) => ({ label: 'Pluck ' + r.name, primary: false, run: () => _wdelPluck(i, T, m) }));
}
function _wdelPattern() { return '1 Reeds, 2 Leaves, 3 Bell'; }
function _wdelKnown(mask) { return WD_LISTEN.filter((r, i) => mask & 1 << i).map(r => r.step + ' ' + r.name).join('; '); }
function _wdelNear(S) { return !!(S && typeof _gw !== 'undefined' && wdNear(S.x, S.y, 2.5) && !(typeof _grm !== 'undefined' && _grm.on)); }
function _wdelOwnTalk(T) { return !!(T && _wdel.talk === T && _wd.talk === T && T.el.isConnected); }
function _wdelHarpOpen() {
  const S = _wdel.head; if (!_wdelNear(S)) return;
  const m = gardenHere(), mask = _wdelMask(m), restored = !!(mask & 8);
  _wdel.phrase = 0;
  let T;
  T = wdTalk({ name: restored ? 'The listening harp' : 'The silent harp', at: { x: S.x, y: S.y }, lines: [restored ? 'Three strings, one small sail. The garden can play it now. You can answer, if you like.' : 'Three old strings hang slack. The rail has a wave, a leaf and a bell, but the order has worn away. Three listening posts along the village promenade still remember.'], bye: 'Leave the harp', onClose() { if (_wdel.talk === T) { _wdel.talk = null; _wdel.phrase = 0; } } });
  _wdel.talk = T;
  const actions = _wdelNoteActions(T, m);
  if (restored) { T.say('The phrase on its rail reads: ' + _wdelPattern() + '. Pluck any string, or let the wind play.', actions); return; }
  if (m.visit) { T.say('Your host has not restored this harp yet. You can read the listening posts, but the garden and its discoveries belong to them.'); return; }
  if ((mask & 7) !== 7) {
    const next = WD_LISTEN.find((r, i) => !(mask & 1 << i));
    T.say((mask & 7 ? 'Your markings so far: ' + _wdelKnown(mask) + '. ' : '') + 'Find the ' + next.name.toLowerCase() + ' listening post. ' + next.clue, [{ label: 'Read the whole walk', run: () => T.say(WD_LISTEN.map(r => r.name + ': ' + r.clue).join(' ')) }]);
    return;
  }
  T.say('All three markings are clear: ' + _wdelPattern() + '. Play them in that order to tighten the strings.', actions);
}
function _wdelPluck(i, T, openedModel) {
  if (!_wdelOwnTalk(T) || !_wdelNear(_wdel.head)) return;
  const m = gardenHere(), same = !!m.visit === !!openedModel.visit && (!m.visit || m.visit.fid === openedModel.visit.fid);
  if (!same || _wdelHeld(_wdelEnvironment())) return;
  const mask = _wdelMask(m), restored = !!(mask & 8), actions = _wdelNoteActions(T, openedModel);
  _wdelPulse(i);
  if (restored) { T.say(WD_LISTEN[i].name + '. The other strings answer softly. Its phrase is ' + _wdelPattern() + '.', actions); return; }
  if (m.visit || (mask & 7) !== 7) return;
  if (i !== _wdel.phrase) { _wdel.phrase = 0; _wdel.wrong = .8; T.say('That note trails away. Start the whole phrase again: ' + _wdelPattern() + '.', actions); return; }
  _wdel.phrase++;
  if (_wdel.phrase < 3) { T.say(WD_LISTEN.slice(0, _wdel.phrase).map(r => r.name).join(', ') + '. The frame begins to hum. The next mark is ' + WD_LISTEN[_wdel.phrase].name.toLowerCase() + '.', actions); return; }
  if (!_wdGet('listen.harp')) _wdSet('listen.harp', _wdToday());
  _wdel.phrase = 0; _wdelSync(m); _wdelQueue([0, 1, 2, 1, 0], false);
  T.say('The last string tightens. A copper sail turns into the air, and all three notes travel out across the lake. The listening harp is restored. It stays here, for you and anyone who visits.', _wdelNoteActions(T, openedModel));
}
function _wdelPostOpen(i) {
  const S = _wdel.posts[i]; if (!_wdelNear(S) || _wdelHeld(_wdelEnvironment())) return;
  const m = gardenHere(), row = WD_LISTEN[i];
  if (!m.visit && !_wdGet('listen.' + row.id)) _wdSet('listen.' + row.id, _wdToday());
  _wdelSync(m); _wdelPulse(i);
  let T;
  T = wdTalk({ name: 'The ' + row.name.toLowerCase() + ' listening post', at: { x: S.x, y: S.y }, lines: [row.line], actions: [{ label: 'Listen again', run() { if (_wdelOwnTalk(T) && _wdelNear(S) && !_wdelHeld(_wdelEnvironment())) _wdelPulse(i); } }], bye: 'Continue the walk', onClose() { if (_wdel.talk === T) _wdel.talk = null; } });
  _wdel.talk = T;
}
function _wdelSync(m) {
  const mask = _wdelMask(m); if (_wdel.mask === mask) return;
  _wdel.mask = mask; _wdel.revision++;
  _wdelDraw(_wdel.head, _wdelHarpArt(mask));
  for (let i = 0; i < 3; i++) _wdelDraw(_wdel.posts[i], _wdelPostArt(WD_LISTEN[i], !!(mask & 1 << i)));
}
function _wdelResetTransient(close) {
  _wdel.jobs = []; _wdel.pulses.fill(0); _wdel.wrong = 0; _wdel.phrase = 0;
  if (close && _wdel.talk && _wd.talk === _wdel.talk) wdTalkClose(true);
  if (close) _wdel.talk = null;
}
function _wdelFrame(dt) {
  const now = performance.now(), env = _wdelEnvironment(), held = _wdelHeld(env);
  // An indoor or hidden view is not a place to replay queued outdoor notes.
  if (_wdel.lastFrame && now - _wdel.lastFrame > 500) _wdelResetTransient(true);
  _wdel.lastFrame = now;
  if (held) return;
  const step = Math.max(0, Math.min(.1, dt || 0)), motion = typeof gardenMotionOn !== 'function' || gardenMotionOn();
  for (let i = 0; i < 3; i++) _wdel.pulses[i] = Math.max(0, _wdel.pulses[i] - step);
  _wdel.wrong = Math.max(0, _wdel.wrong - step);
  for (let i = _wdel.jobs.length - 1; i >= 0; i--) { const job = _wdel.jobs[i]; job.in -= step; if (job.in <= 0) { _wdel.jobs.splice(i, 1); _wdelPulse(job.i, job.quiet); } }
  const time = env && Number.isFinite(env.ambientTime) ? env.ambientTime / 1000 : _wd.t, wind = env ? Number(env.windX) || 0 : .25 + Math.sin(time * .17) * .1, restored = !!(_wdel.mask & 8);
  const beat = Math.floor(time / 9);
  if (beat !== _wdel.lastWindBeat) {
    const hadBeat = _wdel.lastWindBeat != null; _wdel.lastWindBeat = beat;
    if (hadBeat && restored && motion && gardenFun() !== 'off' && _wdel.head && wdNear(_wdel.head.x, _wdel.head.y, 7) && !_wdel.jobs.length && !_wdel.talk) _wdelQueue([Math.abs(beat) % 3, (Math.abs(beat) + 1) % 3], true);
  }
  const b = _wdelBind(_wdel.head);
  if (b) {
    for (let i = 0; i < 3; i++) {
      const pulse = _wdel.pulses[i], wave = pulse ? Math.sin((1 - pulse) * 41) * pulse * pulse * 3.6 : 0, angle = motion ? wave + (restored ? Math.sin(time * (2.6 + i * .3) + i) * wind * .7 : 0) : 0;
      _wdelAttr(b, b.strings[i], 's' + i, 'transform', `rotate(${angle.toFixed(2)} ${-12 + i * 11} ${-79 + i * 3})`);
      _wdelAttr(b, b.tones[i], 't' + i, 'opacity', (pulse ? .65 + pulse * .35 : restored ? .55 : .28).toFixed(2));
    }
    _wdelAttr(b, b.sail, 'sail', 'transform', `rotate(${(motion && restored ? Math.sin(time * 1.2) * wind * 9 : 0).toFixed(2)} -5 -111)`);
    _wdelAttr(b, b.halo, 'halo', 'opacity', (restored ? .15 + Math.max(..._wdel.pulses) * .35 : _wdel.wrong * .3).toFixed(2));
  }
  for (let i = 0; i < 3; i++) {
    const p = _wdelBind(_wdel.posts[i]); if (!p) continue;
    const pulse = _wdel.pulses[i], found = !!(_wdel.mask & 1 << i), scale = motion ? 1 + pulse * .3 : 1;
    _wdelAttr(p, p.ring, 'ring', 'transform', `translate(0 -13) scale(${scale.toFixed(2)}) translate(0 13)`);
    _wdelAttr(p, p.light, 'light', 'opacity', (pulse ? .65 + pulse * .35 : found ? .85 : .3).toFixed(2));
  }
}
/** Public observation of current world targets and already visible markings. */
function gardenListeningWalkInfo() {
  const m = gardenHere(), mask = _wdelMask(m), point = S => S ? { id: S.id, x: S.x, y: S.y, attached: !!S.node && S.node.isConnected } : null;
  return { mask, restored: !!(mask & 8), visit: !!m.visit, phraseLength: _wdel.phrase, head: point(_wdel.head), posts: WD_LISTEN.map((r, i) => ({ name: r.name, step: mask & 1 << i ? r.step : null, found: !!(mask & 1 << i), ...point(_wdel.posts[i]) })), revision: _wdel.revision };
}
wdMod({
  id: 'listening-walk', fun: false, visit: true,
  begin(m) {
    _wdel.head = null; _wdel.posts = []; _wdel.mask = -1; _wdel.lastFrame = 0; _wdel.lastWindBeat = null; _wdelResetTransient(true);
    const start = GARDEN_WORLD.start, home = _gwFree(start.x, start.y) ? start : wdFreeNear(start.x, start.y, 2), at = _wdelPlace(_wdPt('notice-board', 1.1, .28), home);
    if (!at) return;
    // The sprite picker centres its hit circle at hitUp; it is not an extent.
    // Centre the targets on the visible strings and carved post faces.
    _wdel.head = wdSprite({ id: 'wd-listen-harp', ...at, still: true, hit: 1, hitUp: 58, label: 'The listening harp', cursor: 'hand', svg: '', onClick: _wdelHarpOpen });
    for (let i = 0; i < 3; i++) { const p = _wdelPlace(WD_LISTEN[i].at, home); if (p) _wdel.posts[i] = wdSprite({ id: 'wd-listen-' + WD_LISTEN[i].id, ...p, still: true, hit: .65, hitUp: 31, label: 'The ' + WD_LISTEN[i].name.toLowerCase() + ' listening post', cursor: 'hand', svg: '', onClick: () => _wdelPostOpen(i) }); }
    _wdelSync(m);
  },
  painted(m) { _wdelSync(m); },
  tick(m) { _wdelSync(m); if (_wdel.talk && (!_wdelOwnTalk(_wdel.talk) || _wdel.head && !wdNear(_wdel.head.x, _wdel.head.y, 28))) { _wdel.talk = null; _wdel.phrase = 0; } },
  frame: _wdelFrame,
  end() { _wdelResetTransient(true); _wdel.head = null; _wdel.posts = []; _wdel.mask = -1; _wdel.lastFrame = 0; _wdel.lastWindBeat = null; },
});
gardenPlayAdd({ id: 'listening-walk', name: 'The listening walk', icon: 'music', group: 'world', blurb: 'Follow three carved posts and restore their wind harp at your own pace.', open() { if (_wdel.head) gardenWalkAct({ x: _wdel.head.x, y: _wdel.head.y + .6 }, _wdelHarpOpen, { radius: 2.5, near: 70 }); } });
