/* Photo-mode looks are transient state, never catches or inventory. A visitor
 * speaks only for their own authenticated slot; the host checks catalogue ids
 * before forwarding. Full state on change and a slow refresh recover loss. */
const GL_PHOTO = Object.freeze({ gap: 400, beat: 6000, stale: 18000 });
const _glphoto = { mine: null, timer: 0 };
function _gllPhotoContext() {
  if (typeof _gw === 'undefined' || !_gw.on || typeof _grm !== 'undefined' && _grm.on || typeof _ee !== 'undefined' && _ee.on || typeof _gwFishBusy === 'function' && _gwFishBusy()) return '';
  if (_gll.role === 'visit') return _glvLive() ? 'v|' + _glv.fid + '|' + _glv.boot + '|' + _glv.gen : '';
  return _gll.role === 'host' && _glh.on ? 'h|' + _GLL_TAB : '';
}
/** Only catalogue data crosses this bridge; names, specimen provenance and
 * photo pixels stay local. Gear worn by the figure uses the existing look. */
function _gllPhotoBody(b) {
  if (glFxOk(b)) return null;
  const out = { c: 'pose', e: b.e, p: b.p };
  if (b.e === 'off' || !b.i) return out;
  const spec = gardenMomentSpec(b.kd, b.i, { cm: b.n, q: b.ql, v: b.v });
  if (!spec || b.kd === 'fish' && spec.d.cat !== 'fish' || b.v && spec.v !== b.v) return null;
  Object.assign(out, { kd: b.kd, i: b.i });
  for (const k of ['n', 'ql', 'v']) if (b[k] != null) out[k] = b[k];
  return out;
}
function _gllPhotoSend(body, to) {
  if (_gll.role === 'visit' && _glvLive()) return _glvSend('fx', body);
  if (_gll.role === 'host' && _glh.on && _glhAnyone()) return _glhSend(to || 'all', 'fx', body);
  return null;
}
/** Called by photo mode's existing slow heartbeat and selection changes. */
function gardenLivePhoto(state) {
  const context = _gllPhotoContext(), old = _glphoto.mine, now = Date.now(); // clock-ok: refresh spacing
  if (!state || !context) {
    if (old && context === old.context) _gllPhotoSend({ c: 'pose', e: 'off', p: old.body.p });
    _glphoto.mine = null; return;
  }
  let mine = old;
  if (!mine || mine.context !== context) mine = _glphoto.mine = { context, body: { p: _gllNewId() }, at: 0, sig: '' };
  const body = _gllPhotoBody({ c: 'pose', e: 'on', p: mine.body.p, ...state }); if (!body) return;
  const sig = JSON.stringify(body);
  if (now - mine.at < (sig === mine.sig ? GL_PHOTO.beat : GL_PHOTO.gap)) return;
  if (sig !== mine.sig) _gllGoNow(); // where the pose begins precedes what is held
  mine.body = body; mine.sig = sig; mine.at = now;
  _gllPhotoSend(body);
  _gllPhotoTimer();
}
function _gllPhotoClear(A) {
  if (!A) return;
  if (A.photoG) { A.photoG.remove(); A.photoG = null; }
  if (!A.photo) return;
  A.photo = null; A.key = '';
  const tag = A.root && A.root.querySelector('.gll-name'); if (tag && !A.heldG) tag.style.display = '';
  if (A.inner) _gllPaint(A);
}
function _gllPhotoDraw(A) {
  if (!A.photo || !A.root) return;
  if (!A.photo.body.i || A.moving || A.rm || gardenFun() === 'off') {
    if (A.photoG) { A.photoG.remove(); A.photoG = null; }
    const tag = A.root.querySelector('.gll-name'); if (tag && !A.heldG) tag.style.display = '';
    return;
  }
  if (!A.photoG) {
    const b = A.photo.body, spec = gardenMomentSpec(b.kd, b.i, { cm: b.n, q: b.ql, v: b.v });
    if (!spec || typeof _gtgoHoldSvg !== 'function') return;
    const g = _gllSvgEl('g', 'gll-photo-held gd-photo-held');
    g.setAttribute('transform', 'scale(' + GL_ACT_SCALE + ')');
    g.innerHTML = _gtgoHoldSvg({ kind: b.kd, id: b.i, d: spec.d, v: spec.v }); A.photoG = g;
  }
  if (!A.root.contains(A.photoG)) A.root.appendChild(A.photoG);
  const tag = A.root.querySelector('.gll-name'); if (tag) tag.style.display = 'none';
}
function _gllPhotoIn(A, ev) {
  const body = _gllPhotoBody(ev); if (!body) return;
  if (body.e === 'off') {
    if (A.photo && A.photo.body.p !== body.p) return;
    _gllPhotoClear(A);
  } else {
    if (A.rm) return; // photo capture is an outdoor feature; a hall transition ends it
    A.fish = null; if (typeof _gllFxClear === 'function') _gllFxClear(A);
    if (A.heldG) { A.heldG.remove(); A.heldG = null; }
    if (A.pose === 'hold') A.pose = '';
    if (A.photo && JSON.stringify(A.photo.body) !== JSON.stringify(body) && A.photoG) { A.photoG.remove(); A.photoG = null; }
    A.photo = { body, until: Date.now() + GL_PHOTO.stale }; // clock-ok: transient state expires without a refresh
    A.key = ''; _gllPaint(A); _gllPhotoDraw(A); _gllPhotoTimer();
  }
  if (_gll.role === 'host' && _glh.on) _glhSend('all', 'fx', { ...body, w: A.w });
}
/** A late arrival gets current looks only, never an expired pose replay. */
function _gllPhotoTell(fid) {
  const mine = _glphoto.mine, now = Date.now(); // clock-ok: freshness
  if (mine && mine.context === _gllPhotoContext() && now - mine.at < GL_PHOTO.stale) _gllPhotoSend(mine.body, fid);
  for (const A of _gll.actors.values()) if (A.photo && now < A.photo.until && !A.rm) _glhSend(fid, 'fx', { ...A.photo.body, w: A.w });
}
function _gllPhotoReset() {
  _glphoto.mine = null;
  for (const A of _gll.actors.values()) _gllPhotoClear(A);
}
function _gllPhotoTimer() {
  if (_glphoto.timer) return;
  _glphoto.timer = setInterval(() => {
    const now = Date.now(); let any = false; // clock-ok: expiry, no animation clock or network frame stream
    for (const A of _gll.actors.values()) if (A.photo) {
      if (now >= A.photo.until || A.rm) _gllPhotoClear(A);
      else { any = true; _gllPhotoDraw(A); }
    }
    if (!any && !_glphoto.mine) { clearInterval(_glphoto.timer); _glphoto.timer = 0; }
  }, 500);
}
