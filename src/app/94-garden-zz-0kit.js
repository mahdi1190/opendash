/* ============================================================
   TOGETHER, MORE: the kit, and each garden's own kinds (docs/dev/GARDEN_TOGETHER.md section 24). The owner, 1 Nov 2026: friends' gardens as places to catch things, a project built together, photo mode, seasons on the map, a day's end, and "surprise me".

   Everything here reads what a friend has already published. THE CHANNEL IS THE SEALED SNAPSHOT, the one each garden already sends its friends: one new strict field, `tg`
   (lib/friends/garden.mjs GARDEN_SCHEMA, gardenTogetherClean in the catalogue), ids and numbers only, and an older app drops it. No new message, no new server part, no relay change.
   Each person writes only their own numbers, and everything shared is worked out by adding the two up, so nothing can clash however two people act at once.

     gardenPlaceKinds(key)      the few kinds a garden has: 2 fish and 2 bugs, picked from the garden's own id, the same on every screen
     gardenPlaceHas(id)         does the garden you stand in have this one? (ctx.home in gardenFishFits, gardenBugFits)
     gtgFriends()                [{id, name, tg}]: your friends' gardens as you already hold them
     gtgPair(fid)                a mark for you and this friend together: it names neither of you, so a third friend reading your garden learns nothing
     gtgWire(fn)                 add to what your garden tells friends     gardenTogetherWire() is what the snapshot asks
     gtgSprite(id, spec | null)  keep a thing in the world up to date (a repaint keeps it)

   SAVES: state.garden.wd, entry by entry (lib/sync/model.mjs), keys starting tg. Ids, days and numbers only; a friend's words never get in. Rewards are ledger lines (gpGrant, _grGive). Ids are stable: never rename a kind or a key.
   ============================================================ */
const GTG_PLACE = Object.freeze({ fish: 2, bug: 2, ticket: 3 });
const _GTG_HOME_FISH = GARDEN_FISH_ONLY.filter(f => f.needs && f.needs.home), _GTG_HOME_BUGS = GARDEN_BUGS.filter(b => b.needs && b.needs.home);
const _gtgk = { kinds: new Map(), wire: [], sprites: new Map(), said: new Set(), loadAt: 0 };
function _gtgW() { return _gdG().wd; }
function gtgToday() { return _gdToday(); }
/** A day as a number, for the wire: days since 2026. */
function gtgDayNum(iso) { return Math.max(0, _wdDaysBetween('2026-01-01', iso || gtgToday())); }
function gtgMeId() { try { const me = window.Friends && Friends.me && Friends.me(); return (me && me.id) || ''; } catch (e) { return ''; } }
function gtgPair(fid) {
  const me = gtgMeId(); if (!me || !fid) return '';
  const s = [me, String(fid)].sort().join('|');
  return ((gardenHash('tg1|' + s) >>> 0).toString(36) + (gardenHash('tg2|' + s) >>> 0).toString(36)).slice(0, 14);
}
/** Your friends' gardens as this page holds them. Each `tg` has been through the same check as the rest of the snapshot. */
function gtgFriends() {
  const d = typeof gardenSocialView === 'function' ? gardenSocialView() : null;
  if (!d || !d.gardens || typeof _gscFriendList !== 'function') return [];
  try {
    const out = [];
    for (const f of _gscFriendList()) { const g = d.gardens[f.id]; if (g) out.push({ id: f.id, name: _gscFirst(f.id), tg: gardenTogetherClean(g.snap && g.snap.tg) || {}, at: g.at || 0 }); }
    return out;
  } catch (e) { return []; }
}
/** Every friend you could share something with, garden or no garden yet. */
function gtgFriendList() { try { return typeof _gscFriendList === 'function' ? _gscFriendList().map(f => ({ id: f.id, name: _gscFirst(f.id) })) : []; } catch (e) { return []; } }
function gtgLoadSoon() { const t = performance.now(); if (t - _gtgk.loadAt < 120000) return; _gtgk.loadAt = t; try { if (typeof gardenSocialLoad === 'function') gardenSocialLoad(false).catch(() => {}); } catch (e) { /* later */ } }
/** Tell friends soon: not before the usual gap between snapshots. */
function gtgPublishSoon() { try { if (typeof _gscPublishSoon === 'function') _gscPublishSoon(4000); } catch (e) { /* the 5-minute check tells them */ } }
function gtgWire(fn) { _gtgk.wire.push(fn); }
function gardenTogetherWire() {
  const out = { k: gardenPlaceOwnKey() };
  for (const fn of _gtgk.wire) { try { fn(out); } catch (e) { console.error('[garden together]', e); } }
  return gardenTogetherClean(out);
}
function _gtgTheirs(m) { return (m && m.visit && m.visit.snap && m.visit.snap.tg) || {}; }
function gtgIsVisit() { return typeof gardenVisitOn === 'function' && !!gardenVisitOn(); }
/* ---------- things in the world ---------- */
/** spec null takes it away. A repaint keeps it; a change of drawing or place shows at once. */
function gtgSprite(id, spec) {
  let S = _gtgk.sprites.get(id);
  if (!spec) { if (S) { S.remove(); _gtgk.sprites.delete(id); } return null; }
  if (S && !_wd.sprites.has(S)) S = null;   // (the world's sprites went with the garden you left)
  if (!S) { S = wdSprite(Object.assign({ id: 'tg-' + id, still: true, cursor: 'hand' }, spec)); _gtgk.sprites.set(id, S); return S; }
  wdArt(S, spec.svg); S.x = spec.x; S.y = spec.y; S.label = spec.label; S.onClick = spec.onClick; S.hit = spec.hit == null ? S.hit : spec.hit;
  return S;
}
function gtgSaySvg(text, y) {
  const w = Math.max(30, String(text).length * 5.2 + 14);
  return `<g transform="translate(0 ${y})"><rect x="${-w / 2}" y="-11" width="${w}" height="15" rx="4" fill="#fff8e6" stroke="#8a6a3a" stroke-width="1"/><text text-anchor="middle" y="0" font-size="9.5" font-family="system-ui,sans-serif" fill="#4a3a24">${esc(text)}</text></g>`;
}
/* ---------- a garden's own kinds ---------- */
/** The garden's own id: a random mark made once, nothing to do with who you are. Your devices agree through the sync, and friends read it in the snapshot. */
function gardenPlaceOwnKey() {
  const g = _gdG();
  if (!/^[a-z0-9-]{1,32}$/.test(String(g.seen['tg.k'] || ''))) { g.seen['tg.k'] = _gdUid('k').toLowerCase(); _gdSave(); }
  return g.seen['tg.k'];
}
function gardenPlaceKinds(key) {
  let c = _gtgk.kinds.get(key); if (c) return c;
  const take = (list, n, salt) => { const left = list.slice(), out = []; for (let i = 0; i < n && left.length; i++) out.push(left.splice((gardenHash(`tg|${salt}|${key}|${i}`) >>> 0) % left.length, 1)[0]); return out; };
  c = { fish: take(_GTG_HOME_FISH, GTG_PLACE.fish, 'f'), bugs: take(_GTG_HOME_BUGS, GTG_PLACE.bug, 'b'), ids: new Set() };
  for (const d of c.fish.concat(c.bugs)) c.ids.add(d.id);
  _gtgk.kinds.set(key, c);
  return c;
}
function gardenPlaceKey() {
  if (gtgIsVisit()) { const s = _gdvSnap(), k = s && s.tg && s.tg.k; return k || 'f' + _gdv.fid; }   // (a friend on an older app: their kinds come from their friend id, so a visit still has its own)
  return gardenPlaceOwnKey();
}
function gardenPlaceHas(id) { try { return gardenPlaceKinds(gardenPlaceKey()).ids.has(id); } catch (e) { return false; } }
function _gtgCaught(d) { const g = _gdG(); return !!(d.cat === 'bug' ? g.bl : g.fl)[d.id]; }
function _gtgPlaceTick(m) {
  const g = _gdG();
  for (const d of _GTG_HOME_FISH.concat(_GTG_HOME_BUGS)) {
    if (!(d.cat === 'bug' ? g.bl : g.fl)[d.id]) continue;
    if (gpGrant('tg-home-' + d.id, { ticket: GTG_PLACE.ticket })) gpNote(`${d.name}: not every garden has one. ${GTG_PLACE.ticket} tickets`);
  }
  if (!m.visit) return;
  const fid = m.visit.fid, key = 'tg.vw.' + fid, W = _gtgW();
  if (W[key] === m.today || _gtgk.said.has(key)) return;
  _gtgk.said.add(key);
  const here = gardenPlaceKinds(gardenPlaceKey()), mine = gardenPlaceKinds(gardenPlaceOwnKey()).ids, news = here.fish.concat(here.bugs).filter(d => !mine.has(d.id) && !_gtgCaught(d));
  if (news.length) { W[key] = m.today; _gdSave(); setTimeout(() => wdWhisper(`Something lives here that you have not seen at home: ${news.length === 1 ? 'one kind' : news.length + ' kinds'} to look for.`, 7000), 2500); }
}
function _gtgKindCard(d) {
  const got = _gtgCaught(d), it = gpEl('div', 'tg-kind' + (got ? ' is-got' : ''));
  const art = gpEl('div', 'tg-kind-art'); art.innerHTML = gardenCatchSvg(d.cat === 'bug' ? 'bug' : 'fish', d.id, 44, { uid: 'tgk' + d.id, glow: false });
  it.append(art, gpEl('b', null, got ? d.name : 'Not caught yet'), gpEl('small', null, got ? d.blurb : d.cat === 'bug' ? 'A bug. Look on the grass.' : 'A fish. Near the shore or a little way out.'));
  return it;
}
function gardenPlaceOpen() {
  gpStage('What each garden has', (el) => {
    el.classList.add('tg-panel');
    el.appendChild(gpEl('p', 'muted', 'Every garden has a few kinds found only there. Visit a friend to catch theirs, or trade for what you lack.'));
    const own = gardenPlaceKinds(gardenPlaceOwnKey());
    el.appendChild(gpEl('h3', 'gd-h3', 'Your garden'));
    const row = gpEl('div', 'tg-kinds'); own.fish.concat(own.bugs).forEach(d => row.appendChild(_gtgKindCard(d))); el.appendChild(row);
    for (const f of gtgFriends().slice(0, 8)) {
      el.appendChild(gpEl('h3', 'gd-h3', `${f.name}’s garden`));
      const c = gardenPlaceKinds(f.tg.k || 'f' + f.id), r = gpEl('div', 'tg-kinds'); c.fish.concat(c.bugs).forEach(d => r.appendChild(_gtgKindCard(d))); el.appendChild(r);
    }
    if (!gtgFriendList().length) el.appendChild(gpEl('p', 'muted', 'When you have friends here, what their gardens hold shows too.'));
  });
}
gardenPlayAdd({ id: 'tg-kinds', name: 'What each garden has', icon: 'map-pin', group: 'secret', blurb: 'A few kinds live in only some gardens. See which yours has, and which your friends have.', status: () => { try { const c = gardenPlaceKinds(gardenPlaceOwnKey()); return `${c.fish.concat(c.bugs).filter(_gtgCaught).length} of ${c.ids.size} here`; } catch (e) { return ''; } }, open: gardenPlaceOpen });
wdMod({ id: 'tg-place', visit: true, tick(m) { if (Math.floor(_wd.t) % 5 === 0) _gtgPlaceTick(m); gtgLoadSoon(); }, end() { for (const S of _gtgk.sprites.values()) { try { S.remove(); } catch (e) { /* gone */ } } _gtgk.sprites.clear(); } });
