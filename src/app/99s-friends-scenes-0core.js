/* ============================================================
   FRIENDS IN YOUR SCENES (2.17, agent 'scenes'): the shared part.
   The user: friends visit your scenes, postcards, full figures in the hangout. Three files:
     99s-friends-scenes-0core.js       this file: who may visit, the figure as a scene object and as an element
     99s-friends-scenes-1visit.js      a friend who is around walks through the scene you are watching (a render pass)
     99s-friends-scenes-2postcards.js  "Send a postcard" from the scene's menu, postcard cards and the album
   Styles: src/styles/99s-friends-scenes.css. Server: lib/friends/postcards.mjs (the kind 'postcard'), loaded
   by server/routes/postcards.mjs.

   THE FIGURE IS DATA. A friend's figure is their shared profile's avatar (the friends kind 'profile', checked
   by lib/profile-avatar.mjs on arrival), and only its allow-listed ids: profileAvatarNormalize maps every id
   through the avatar kit's tables (an unknown id becomes the default), profileFigureOpts turns them into the
   scene people builder's options (scenePeople.figure), and every colour is looked up in the kit's tables. No
   text, markup, colour or picture from a friend is ever drawn, and nothing here sends anything.

   PUBLIC API (safe to call at any time; never throws):
     friendsSceneFigureEl(who, size, o)  the full figure (a scene person in their outfit) as an element, or null
                                         when they share no avatar. who: a friend view (window.Friends), 'me' or
                                         null (you). size: px height (24..400). o: {walk: true} a gentle walk cycle
                                         (never under reduced motion). The Friends tab's hangout shows these.
                                         2.18: their pet sits (or walks) beside them (97-pets-3scene.js); o.pet false: alone.
     window.friendsSceneFigureEl         the same
     friendsScenesOn() / friendsScenesSet(on)   friends may walk through your scenes (this computer; on by default)
     fscFigureObj(avatar)                the scene object id of an outfit ('person.fv-<hash>', defined once per
                                         outfit, at most 12 a page): variant 0 walks, variant 1 waves
     fscOutfitOf(avatar)                 the figure's part ids of an avatar (the postcard's outfit field)
     fscFriendsAround()                  confirmed friends who are around now (online, focusing, travelling) and
                                         share an avatar
   Private names: _fsc*.
   ============================================================ */
const _fsc = { objs: 0, ids: new Map(), store: null, n: 0 };
const _FSC_STORE_KEY = 'opendash.friendsScenes.v1';
/** The avatar parts that dress the full figure (lib/friends/postcards.mjs POSTCARD_OUTFIT_PARTS: keep in step).
 *  2.18 (agent 'wardrobe'): the kit's own list, PF_FIGURE_PARTS (97-profile-0kit-6looks.js): outerwear, dresses,
 *  patterns, jewellery, glasses, ties, watches and more ride along. */
const FSC_OUTFIT_PARTS = typeof PF_FIGURE_PARTS !== 'undefined' && Array.isArray(PF_FIGURE_PARTS) ? PF_FIGURE_PARTS
  : Object.freeze(['skin', 'hair', 'hairCol', 'top', 'topCol', 'top2Col', 'bottom', 'bottomCol', 'shoes', 'shoesCol', 'build', 'hat', 'hatCol', 'scarf', 'scarfCol', 'scarf2Col', 'bag', 'bagCol']);
const FSC_AROUND = Object.freeze(['online', 'focusing', 'travelling']);
const _FSC_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

function _fscEl(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = String(text);
  return el;
}
function _fscHash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
function _fscReduced() {
  try { if (window.Motion && Motion.prefersReduced && Motion.prefersReduced()) return true; } catch (e) { /* below */ }
  try { return !!(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
}
/** Animations on (Settings > Look) and no reduced motion. */
function _fscMotionOk() {
  if (_fscReduced()) return false;
  try { if (typeof animEnabled === 'function' && !animEnabled()) return false; } catch (e) { /* the default: on */ }
  return true;
}
function _fscToday() { try { return todayStr(); } catch (e) { return new Date().toISOString().slice(0, 10); } }   // clock-ok: fallback only

/* ---------- this computer's settings and the visit record (no friend content: ids and times only) ---------- */
function _fscStore() {
  if (_fsc.store) return _fsc.store;
  let s = null;
  try { s = JSON.parse(localStorage.getItem(_FSC_STORE_KEY) || 'null'); } catch (e) { s = null; }
  s = s && typeof s === 'object' && !Array.isArray(s) ? s : {};
  const per = {};
  if (s.per && typeof s.per === 'object') for (const k of Object.keys(s.per).slice(0, 200)) if (_FSC_ID_RE.test(k) && Number.isFinite(s.per[k])) per[k] = s.per[k];
  _fsc.store = { on: s.on !== false, last: Number.isFinite(s.last) ? s.last : 0, per, day: typeof s.day === 'string' ? s.day.slice(0, 10) : '', n: Number.isFinite(s.n) ? Math.max(0, s.n | 0) : 0 };
  return _fsc.store;
}
function _fscSave() { try { localStorage.setItem(_FSC_STORE_KEY, JSON.stringify(_fscStore())); } catch (e) { /* private mode: kept for this page */ } }
function friendsScenesOn() { return _fscStore().on; }
function friendsScenesSet(on) {
  _fscStore().on = !!on;
  _fscSave();
  if (!on && typeof _fsvEndAll === 'function') _fsvEndAll();
  return !!on;
}

/* ---------- who: the avatar of a friend view, or yours ---------- */
function _fscIsMe(who) { return who == null || who === 'me' || (who && typeof who === 'object' && who.self === true); }
/** The normalised avatar of a friend view (their shared profile) or yours; null when a friend shares none. */
function _fscAvatarOf(who) {
  if (typeof profileAvatarNormalize !== 'function') return null;
  try {
    if (_fscIsMe(who)) return typeof profileGet === 'function' ? profileAvatarNormalize(profileGet().avatar) : null;
    const p = who && typeof who === 'object' && who.profile && typeof who.profile === 'object' ? who.profile : null;
    return p && p.avatar && typeof p.avatar === 'object' && !Array.isArray(p.avatar) ? profileAvatarNormalize(p.avatar) : null;
  } catch (e) { return null; }
}
/** A friend's name as plain text (the nickname you gave, else theirs). */
function _fscName(who) {
  if (_fscIsMe(who)) return 'You';
  const n = typeof friendName === 'function' ? friendName(who) : (who && (who.nick || who.name)) || 'Your friend';
  return typeof profileText === 'function' ? profileText(n, 40) || 'Your friend' : String(n).slice(0, 40);
}
/** The figure's part ids of an avatar: what the postcard's outfit carries. 2.18: a part at its default is left out
 *  (a missing part IS the default on every side), so the postcard stays small however many parts the kit has. */
function fscOutfitOf(avatar) {
  const a = typeof profileAvatarNormalize === 'function' ? profileAvatarNormalize(avatar) : (avatar || {});
  const dflt = typeof profileAvatarDefault === 'function' ? profileAvatarDefault() : {};
  const o = {};
  for (const k of FSC_OUTFIT_PARTS) if (typeof a[k] === 'string' && _FSC_ID_RE.test(a[k]) && (a[k] !== dflt[k] || k === 'skin' || k === 'hair')) o[k] = a[k];
  return o;
}
/** Confirmed friends who are around now and share an avatar (presence is the friends engine's: Friends.presence). */
function fscFriendsAround() {
  const F = window.Friends;
  if (!F || typeof F.list !== 'function') return [];
  let list = [];
  try { list = F.list() || []; } catch (e) { return []; }
  return list.filter(f => f && f.status === 'friend' && _FSC_ID_RE.test(String(f.id || '')) && FSC_AROUND.includes(typeof F.presence === 'function' ? F.presence(f.id) : f.presence) && !!_fscAvatarOf(f));
}

/* ---------- the figure as an element (the hangout, the postcard's stamp) ---------- */
function friendsSceneFigureEl(who, size, o) {
  try {
    o = o || {};
    if (typeof profileFigureSvg !== 'function') return null;
    const a = _fscAvatarOf(who);
    if (!a) return null;
    const h = Math.max(24, Math.min(400, Math.round(Number(typeof size === 'object' && size ? size.size : size) || 64)));
    const svg = profileFigureSvg(a, { size: h, walk: !!o.walk && _fscMotionOk() });
    if (!svg) return null;
    const el = _fscEl('span', 'fsc-fig' + (o.cls ? ' ' + String(o.cls).replace(/[^a-z0-9 _-]/gi, '') : ''));
    el.style.setProperty('--fsc-h', h + 'px');
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', _fscIsMe(who) ? 'You, as you look in the scenes' : _fscName(who) + ', as they look in the scenes');
    el.innerHTML = svg;   // built from the kit's allow-listed ids, numbers and path data only (97-profile-0kit.js profileFigureSvg)
    // ── pets ── (2.18, agent 'pets'): their pet beside them (97-pets-3scene.js; o.pet === false: alone)
    if (o.pet !== false && typeof petFigureCompanion === 'function') { try { petFigureCompanion(el, who, h, o); } catch (e) { /* the pet is a nicety */ } }
    return el;
  } catch (e) { console.error('[friends scenes] figure', e); return null; }
}
if (typeof window !== 'undefined') window.friendsSceneFigureEl = friendsSceneFigureEl;

/* ---------- the figure as a scene object (the visit pass draws it with the engine's own sprites) ---------- */
/**
 * The scene object of an outfit: scenePeople.figure() in the avatar's figure parts (profileFigureOpts), the people library's
 * build (a swinging near arm on the person-walk hooks, sceneBehave.hooks), size class person (1.72 m, 64 units like
 * person.walker). Variant 0 walks; variant 1 stands and waves (the near arm raised; one 'walk' hook on that arm only, ±18
 * degrees). Never picked by a kit or a flow: no kit: or role: tag, weight 0. Defined once per outfit (sceneObjDefine
 * clears the shape memo, so a page defines at most 12 and reuses them).
 */
function fscFigureObj(avatar) {
  try {
    if (typeof scenePeople === 'undefined' || !scenePeople || typeof scenePeople.define !== 'function' || typeof profileFigureOpts !== 'function' || typeof sceneObj !== 'function') return null;
    const out = fscOutfitOf(avatar), key = FSC_OUTFIT_PARTS.map(k => out[k] || '').join('|');
    if (_fsc.ids.has(key)) return _fsc.ids.get(key);
    const id = 'person.fv-' + _fscHash(key);
    if (sceneObj(id)) { _fsc.ids.set(key, id); return id; }
    if (_fsc.objs >= 12) return null;
    const PP = scenePeople, fig = profileFigureOpts(out);
    // the kit's cloth colours the scene palette lacks (the level colours), and a hair colour of its own on slot hr0
    const extra = {}, slots = PP.palette().base;
    if (typeof PF_CLOTH === 'object') for (const [k, v] of Object.entries(PF_CLOTH)) if (!slots[k] && v && /^#[0-9a-f]{6}$/i.test(v.hex)) extra[k] = PP.tone4(v.hex);
    if (fig.hairHex && /^#[0-9a-f]{6}$/i.test(fig.hairHex)) extra.hr0 = PP.tone4(fig.hairHex);
    // 2.18 (agent 'wardrobe'): the kit's own slots (pfTop, pfBot, pfShoe, pfMetal..., sk0 for a skin tone the scene palette lacks)
    if (fig.slots && typeof fig.slots === 'object') for (const [k, v] of Object.entries(fig.slots)) if (/^[A-Za-z0-9_-]{1,16}$/.test(k) && /^#[0-9a-f]{6}$/i.test(v)) extra[k] = PP.tone4(v);
    const opts = Object.assign({}, fig.o, { arms: 'walk', legs: 'walk' });
    const dressed = typeof profileAvatarNormalize === 'function' ? profileAvatarNormalize(out) : null;
    PP.define({
      id, category: 'person', size: [29, 64], variants: 2, seasonal: false, flippable: true, parts: ['legB', 'body', 'legA', 'armA'],
      palette: PP.palette(extra), night: PP.NIGHT, detailPx: true, real: { h: 1.72, l: 0.5, w: 0.36 }, weight: 0,
      tags: ['people', 'friend-visit'], credit: 'a friend in their own outfit (Friends, 2.17): the shared people builder',
      build(v) { return _fscFigureParts(PP, opts, v === 1, dressed); },
    });
    _fsc.objs++;
    _fsc.ids.set(key, id);
    return id;
  } catch (e) { console.error('[friends scenes] figure object', e); return null; }
}
/** The parts of the figure: walking (the near arm free to swing) or waving (the near arm raised, the far one at rest). */
function _fscFigureParts(PP, o, wave, avatar) {
  // the far arm keeps the walkers' pose in both (no jump when they stop to wave); the near arm hangs free, or is raised
  const base = PP.figure(o), shN = base.shoulders.near;
  const arms = { far: 'forward', near: { hand: wave ? [shN[0] + 5.2, shN[1] - 14.2] : [shN[0] + 1.6, shN[1] + 18.4] } };
  let f = PP.figure(Object.assign({}, o, { arms }));
  // 2.18 (agent 'wardrobe'): what the people builder has no option for (outerwear over the top, jewellery, hats, shoes...)
  if (avatar && typeof profileFigureDress === 'function') { try { f = profileFigureDress(avatar, f, { PP }); } catch (e) { console.error('[friends scenes] dress', e); } }
  const body = f.body.slice(), parts = { legB: f.legB, body, legA: f.legA };
  parts.armA = body.splice(f.at.nearArm[0], f.at.nearArm[1] - f.at.nearArm[0]);
  const sh = f.shoulders.near.slice();
  const hooks = wave ? [{ kind: 'walk', parts: ['armA'], pivot: sh, deg: 18, period: 0.62, bob: 0 }]
    : (typeof sceneBehave !== 'undefined' ? sceneBehave.hooks('person-walk', { hip: f.pivot.slice(), shoulder: sh, deg: 20, period: 1.15, bob: 1.3, arm: 16 })
      : [{ kind: 'walk', parts: ['legB', 'legA'], pivot: f.pivot.slice(), deg: 20, period: 1.15, bob: 1.3 }, { kind: 'walk', parts: ['armA'], pivot: sh, deg: 16, period: 1.15, bob: 0 }]);
  Object.defineProperty(parts, '$anim', { value: hooks, enumerable: false });
  return parts;   // scenePeople.define tidies them (empty shapes out, round caps)
}
