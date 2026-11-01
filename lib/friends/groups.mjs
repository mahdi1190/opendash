// lib/friends/groups.mjs - Freeflo Groups, this computer's side (docs/dev/GROUPS.md). One per data folder;
// server/routes/groups.mjs makes it and puts it on app.ctx.groups.
//
// Security (FRIENDS.md section 1, which holds for groups too):
//   - a group's keys are in the synced file only sealed at rest; no key, link or token leaves through a view, an
//     event or a log line. The link goes only to the page's Share dialog, for people who run the group, and never to
//     the assistant (mcp/agent-tools.mjs builds its answers field by field)
//   - everything that arrives (a member's profile, a post, a join request, the card, even the roster the relay
//     gives) is untrusted: signature, then opening, then a strict shape, and only then kept. Nothing here calls
//     Claude, the actions layer, MCP or connectors, and nothing a group sends changes the state file or shares
//     anything: friends get what they get through friends, and only after someone accepted
//   - who runs a group comes only from documents signed from the group's first one, whose hash the group's id is. The
//     relay's word is worth nothing: its roster, its labels, its "you are in". Nothing here ever signs what a relay
//     labels, and a key is only ever sealed to a person whose signed proof holds against that signed history
//   - a removal is retried until the relay confirms, and the relay itself remembers that the key must change
//   - nothing a relay says deletes keys at once: they stay for 30 days, and come back if the relay turns out to have been wrong

import {
  GID_RE, parseGroupLink, groupLink, newGroupOrigin, newLinkToken, linkSecrets, codeSecrets, newShortCode, parseShortCode, sealFor, openFor, newGroupKey, groupAes,
  signCard, checkCard, cardFits, signAuth, followAuth, roleIn, runsGroup, namedIn, wrapBatch, openWrap, sealLinkKeys, openLinkKeys, sealEnv, openEnv, sealAsk, openAsk, signAdmit, openTag, checkAdmit, admitRoot, renewedFrom, friendProof, signRekeyText,
  fingerprintOf, cleanProfile, NAME_MAX, ABOUT_MAX, WELCOME_MAX, TEXT_MAX, STATUS_MAX, MEMBER_NAME_MAX,
} from './group-core.mjs';
import { ensureIdentity, loadIdentity, allIdentities, retiredIdentities, readDoc, updateDoc, homeRelay, listRelays, setRelay, removeRelay } from './store.mjs';
import { cleanLine, cleanText, sealAtRest, openAtRest, makeCard, firstName, checkBody, friendIdOf, newEdKeyPair } from './core.mjs';
import { createRelayClient, relayErrorText } from './relay-client.mjs';
import { newKeyPair, isPub } from '../sync/e2e-crypto.mjs';
import { iidOf } from '../relay/auth.mjs';

const MIN = 60000, DAY = 86400000;
const UNDO_MS = 10000, KEPT_EPOCHS = 8, OLD_GIVEN = 4, KEPT_POSTS = 300;
const LEFT_KEEP_MS = 30 * DAY, LEFT_LOOKS = 5;   // what a relay says about me leaving is only believed for good after this long, and this many looks
const SYNC_LIVE_MS = 15 * MIN, SYNC_IDLE_MS = 5 * MIN;
const MSG_OLDEST_MS = 45 * DAY, MSG_AHEAD_MS = DAY;
const JOB_KEEP_MS = 400 * DAY;
const fail = (code, message) => Object.assign(new Error(message), { status: 400, code });
const NO_RELAY = "A group needs a small private service to run on. Set yours up once (it's free): open Settings > Your connection to friends. To join someone else's group you don't need one: just use their link.";

/** Our own sentence for what went wrong: a relay's words are never shown (one could say "visit evil.example"). */
const RELAY_WORDS = {
  gone: 'This link no longer works. Ask the person who shared it for a new one.', forbidden: 'Only the people who run this group can do that.', quota: 'This group is full, or has too much waiting. Try again later.',
  stale: 'Someone else just changed this group. Try again.', exists: 'That has already been done.', scope: "Codes work once someone has let you in. Use the group's link.",
  too_many_misses: "Too many codes that weren't right. Wait 10 minutes, or use the group's link.", not_found: 'They are no longer in this group.', taken: 'That code is in use. Try again.', rate_limit: 'That is a lot in a short time. Wait a little and try again.',
};
function plain(e) {
  if (e && e.status === 400 && !e.relayError && e.code) return e.message;
  const r = e && e.relayError, c = e && e.code;
  if (c === 'RELAY_UNAVAILABLE') return relayErrorText(e);
  if (c === 'ENOTPUBLIC' || c === 'BAD_RELAY') return "That link points somewhere Freeflo won't connect to. Ask for a new one.";
  if (!e || !e.status) return "That group can't be reached right now. Check your internet, then try again.";
  if (r === 'relay_busy') return "That group is resting until midnight UTC: its free daily allowance is used up. Nothing is lost. Try again after then.";
  if (r === 'not_member') return 'You are no longer in this group.';
  if (r === 'too_large') return 'That is too long. Shorten it and try again.';
  if (r === 'rate_limit' && e.retryAfter > 1800) return "Today's share here is used up. It opens again after midnight UTC.";
  if (Object.hasOwn(RELAY_WORDS, r)) return RELAY_WORDS[r];
  return 'Something went wrong with that group. Try again.';
}
const relayFail = (e) => Object.assign(fail(e && e.code === 'RELAY_UNAVAILABLE' ? 'RELAY_UNAVAILABLE' : 'RELAY', plain(e)), { relayError: e && e.relayError, relayStatus: e && e.status });

export function createGroupsEngine({ dataDir, log = () => {}, now = Date.now, emit = () => {}, friends = null, getName = () => '', timers = globalThis }) {
  let L = null, dirty = false, saveT = null, started = false, stopping = false, tick = null;
  const clients = new Map(), sockets = new Map(), states = new Map(), syncT = new Map(), secretCache = new Map();
  let caps = null;
  let chain = Promise.resolve();
  const serial = (fn) => { const p = chain.then(fn, fn); chain = p.catch(() => {}); return p; };
  const changed = () => { try { emit('friends', { type: 'groups' }); } catch { /* no open tabs */ } };

  // ─── This computer's copy ─────────────────────────────────────────────
  async function loadL() { if (!L) L = await readDoc(dataDir, 'groupsLocal'); return L; }
  function dirtyL() {
    dirty = true;
    if (saveT) return;
    saveT = timers.setTimeout(() => { saveT = null; saveL().catch(() => {}); }, 1500);
    if (saveT && saveT.unref) saveT.unref();
  }
  async function saveL() { if (!L || !dirty) return; dirty = false; const snap = L; await updateDoc(dataDir, 'groupsLocal', () => snap); }
  async function localOf(gid) {
    await loadL();
    if (!L.g[gid]) L.g[gid] = { s: 0, roster: [], profiles: {}, posts: [], seen: {}, requests: [], blocks: [], link: null, code: false, n: 0, mode: 'approve', posting: 'all', epoch: 0, due: false, used: 0, limits: null, lastSync: 0, postedE: 0 };
    return L.g[gid];
  }

  // ─── Records and sealed secrets ───────────────────────────────────────
  const getRec = async (gid) => { const d = await readDoc(dataDir, 'groups'); return d.groups[gid] || null; };
  async function putRec(gid, fn) {
    let out = null;
    await updateDoc(dataDir, 'groups', async (d) => {
      const cur = d.groups[gid] ? { ...d.groups[gid] } : null;
      const nx = await fn(cur);
      if (nx === undefined) { out = cur; return undefined; }
      if (nx === null) { delete d.groups[gid]; out = null; return d; }
      d.groups[gid] = { ...nx, id: gid };
      out = d.groups[gid];
      return d;
    });
    return out;
  }
  const label = (gid) => `group|${gid}`;
  const EMPTY = () => ({ keys: {}, j: null, t: null, v: 0, c: null });
  async function secretsOf(rec) {
    if (!rec || !rec.sealed) return EMPTY();
    const c = secretCache.get(rec.id);
    if (c && c.ct === rec.sealed.ct) return structuredClone(c.v);
    for (const i of await allIdentities(dataDir)) {
      const v = await openAtRest(i, rec.sealed, label(rec.id));
      if (v) { const out = { ...EMPTY(), ...v }; secretCache.set(rec.id, { ct: rec.sealed.ct, v: structuredClone(out) }); return out; }
    }
    return EMPTY();
  }
  async function saveSecrets(identity, gid, sec) {
    const es = Object.keys(sec.keys).map(Number).sort((a, b) => b - a).slice(0, KEPT_EPOCHS);
    const keys = {}; for (const e of es) keys[e] = sec.keys[e];
    return sealAtRest(identity, { ...sec, keys }, label(gid));
  }
  async function clientOf(origin, identity = null) {
    const id = identity || await loadIdentity(dataDir);
    if (!id) throw fail('NO_IDENTITY', 'Open Friends first.');
    const k = `${id.id}|${origin}`;
    if (!clients.has(k)) { clients.set(k, createRelayClient({ origin, identity: id })); if (clients.size > 32) clients.delete(clients.keys().next().value); }
    return clients.get(k);
  }
  const relayHostOf = (o) => String(o || '').replace(/^https?:\/\//, '');
  const keyOf = (sec) => (e) => sec.keys[e] || null;
  const latestE = (sec) => Math.max(0, ...Object.keys(sec.keys).map(Number));
  const checkAvatar = (a) => { if (!a || typeof a !== 'object') return null; try { const c = checkBody('profile', { name: 'x', avatar: a }); return c && c.avatar ? c.avatar : null; } catch { return null; } };
  const meOf = (me, fallback) => {
    const out = { name: cleanLine((me && me.name) || fallback || 'Someone', MEMBER_NAME_MAX) || 'Someone' };
    const st = cleanLine(me && me.status, STATUS_MAX); if (st) out.status = st;
    const a = checkAvatar(me && me.avatar); if (a) out.avatar = a;
    return out;
  };
  /** The card people get with my profile: first name only, signed (what "Add as friend" needs). Never where my mail goes: that is for friends, once accepted. */
  const cardFor = (identity, name) => makeCard(identity, { name: firstName(name), relay: null, now });
  /** What a person's proof is judged against: the signed history, the signed card's mode and, if I hold it, the current link. */
  async function proofCtx(rec, sec, strict = false) {
    const open = !!(rec.card && rec.card.mode === 'open');
    return { auth: rec.auth, open, tag: open && sec.t ? (await linkSecrets(rec.id, sec.t)).tag : null, lv: sec.v || 0, strict };
  }
  /** New proofs signed by me, for those `which` picks and whose present proof holds: done when what theirs rests on is about to stop. */
  async function freshAdmits(rec, g, sec, identity, which) {
    const out = {}, ctx = await proofCtx(rec, sec, true), t = now();
    for (const r of g.roster) {
      if (namedIn(rec.auth, r.key, r.x) || !which(r)) continue;
      if ((await checkAdmit(r.admit, rec.id, r.key, r.x, ctx)) === true) out[r.iid] = await signAdmit(identity, rec.id, r.key, r.x, t);
    }
    return out;
  }
  const openLink = (rec) => !!(rec.card && rec.card.mode === 'open');
  const defaultName = async () => { const me = await readDoc(dataDir, 'me'); return cleanLine(me.prefs.name || getName() || 'Someone', MEMBER_NAME_MAX); };

  // ─── What my connection can do ─────────────────────────────────────────────
  /** {hasHome, role, host, groups, canStart} (asked at most every 15 minutes once it is known, a minute while it is not: the page looks every minute, and every look was a request to the relay). */
  async function capabilities(force = false) {
    if (caps && !force && now() - caps.at < (caps.known ? 15 * MIN : MIN)) return caps;
    const home = await homeRelay(dataDir);
    const out = { hasHome: !!home, role: home ? home.role : null, host: home ? home.host : null, groups: false, canStart: false, known: !home, at: now() };
    if (home) {
      try { const me = await (await clientOf(home.origin)).me(); out.groups = me.groups; out.canStart = me.groups && me.canStartGroups; out.known = true; }
      catch (e) { if (e && e.status === 403) { out.known = true; } else out.err = relayErrorText(e); }
    }
    caps = out;
    return out;
  }

  // ─── Starting a group ─────────────────────────────────────────────────
  function cardFields(f, cur) {
    return {
      name: cleanLine(f.name != null ? f.name : cur && cur.name, NAME_MAX), about: cleanText(f.about != null ? f.about : (cur && cur.about) || '', ABOUT_MAX),
      welcome: cleanText(f.welcome != null ? f.welcome : (cur && cur.welcome) || '', WELCOME_MAX), logo: f.logo || (cur && cur.logo) || { e: '', c: '' },
      auto: f.auto != null ? f.auto === true : !!(cur && cur.auto),
    };
  }
  async function create(f = {}) {
    return serial(async () => {
      const identity = await ensureIdentity(dataDir);
      const home = await homeRelay(dataDir);
      if (!home) throw fail('NO_RELAY', NO_RELAY);
      const fields = cardFields(f, null);
      if (!fields.name) throw fail('BAD_NAME', 'Give your group a name.');
      const c = await capabilities(true);
      if (!c.groups) throw oldRelay(home.role);
      if (!c.canStart) throw fail('NOT_ALLOWED', 'Only people the owner of this connection let in themselves can start a group here. Ask them to start it, or set up your own (Settings > Your connection to friends).');
      const owner = { ed: identity.ed.pub, x: identity.x.pub };
      const { gid, nonce } = await newGroupOrigin(owner);
      const token = newLinkToken(), K = newGroupKey(), J = await newKeyPair(), t = now();
      const ls = await linkSecrets(gid, token);
      const name = meOf({ name: f.myName }, await defaultName());
      const auth = await signAuth(identity, { gid, seq: 1, owner, admins: [], at: t, nonce });
      const mode = f.mode === 'open' ? 'open' : 'approve';
      const card = await signCard(identity, { gid, ...fields, mode, auth, owner: { ...owner, name: name.name }, j: J.pub, at: t });
      const batch = await wrapBatch(identity, gid, 1, t);
      const sec = { keys: { 1: K }, j: J, t: token, v: 1, c: null };
      const body = {
        x: identity.x.pub, auth, mode, posts: f.posts === 'admins' ? 'admins' : 'all', hdr: batch.hdr, wrap: await batch.wrap(owner, { k: K, j: J, t: token, v: 1, c: null }),
        cardK: await sealFor(await groupAes(K), card, `card|${gid}`), cardL: await sealFor(ls.seal, card, `card|${gid}`),
        link: { h: ls.h, v: 1, exp: Number.isFinite(f.exp) ? f.exp : null, maxUses: Number.isInteger(f.maxUses) ? f.maxUses : null },
        ...(mode === 'open' ? { linkWrap: await sealLinkKeys(identity, ls.seal, gid, 1, K, {}, t) } : {}),
      };
      try { await (await clientOf(home.origin)).rg('POST', gid, '/create', { body }); }
      catch (e) {
        if (e && e.status === 403) throw fail('TOO_MANY', 'You have started as many groups as one person can here. Delete one first, or set up your own connection in Settings > Your connection to friends.');
        if (e && e.status === 507) throw fail('TOO_MANY', 'This connection holds as many groups as it can. Delete one first, or set up your own in Settings > Your connection to friends.');
        throw relayFail(e);
      }
      const sealed = await saveSecrets(identity, gid, sec);
      const { ever } = await followAuth(gid, null, [auth], []);
      await putRec(gid, () => ({ id: gid, origin: home.origin, status: 'member', at: t, joinedAt: t, ed: identity.ed.pub, via: 'link', card, auth, ever, me: name, sealed, home: false, autoOk: fields.auto, autoAsked: fields.auto }));
      const g = await localOf(gid);
      g.epoch = 1; g.mode = mode; g.posting = body.posts;
      dirtyL();
      await syncNow(gid).catch(() => {});
      listenTo(gid, home.origin);
      changed();
      return { id: gid, ...(await shareNow(gid)) };
    });
  }
  const oldRelay = (role) => fail('RELAY_OLD', role === 'owner'
    ? 'Your connection needs a quick update before it can run groups. Open Settings > Your connection to friends and press Update. It takes a minute and nothing is lost.'
    : 'The connection you use needs a quick update before it can run groups. Ask the person who set it up to press Update in Settings > Your connection to friends, or set up your own.');

  // ─── Sharing ──────────────────────────────────────────────────────────
  async function shareNow(gid) {
    const rec = await getRec(gid), identity = await loadIdentity(dataDir);
    if (!rec || rec.status !== 'member' || !identity || !runsGroup(rec.auth, identity.ed.pub)) throw fail('NOT_ALLOWED', 'Only the people who run this group can share its link.');
    const sec = await secretsOf(rec);
    if (!sec.t) throw fail('NO_LINK', 'This computer does not have the link yet. Ask the owner, or try again in a moment.');
    const g = await localOf(gid);
    const link = await groupLink(rec.origin, gid, sec.t);
    return {
      link, code: sec.c || null, mode: openLink(rec) ? 'open' : 'approve', exp: g.link ? g.link.exp : null, maxUses: g.link ? g.link.maxUses : null, uses: g.link ? g.link.uses : 0,
      message: `Join ${rec.card ? rec.card.name : 'my group'} on Freeflo: ${link}`,
      name: rec.card ? rec.card.name : 'Group',
    };
  }
  const share = (gid) => serial(() => shareNow(gid));
  /**
   * The old link and any code stop at the next request; whoever waited through the old link needs the new one. Someone who came in
   * through a link gets a proof signed by me now, because a link's proof holds only while that link does, and the key then changes:
   * whoever held the old link, or the key through it, reads nothing that comes next.
   */
  async function resetLinkNow(gid, again = true) {
    await syncNow(gid).catch(() => {});   // from the list as it is now: whoever joined a moment ago must get a proof too
    const { rec, identity, sec, g } = await runner(gid);
    const token = newLinkToken(), v = Math.max(g.link ? g.link.v : 0, sec.v || 0, 1) + 1, ls = await linkSecrets(gid, token), t = now();
    const e = latestE(sec), K = sec.keys[e];
    const body = {
      link: { h: ls.h, v, exp: g.link && Number.isFinite(g.link.exp) && g.link.exp > t ? g.link.exp : null, maxUses: g.link ? g.link.maxUses : null },
      cardL: await sealFor(ls.seal, rec.card, `card|${gid}`),
      admits: await freshAdmits(rec, g, sec, identity, (r) => !admitRoot(r.admit)), rs: g.rs,
      ...(openLink(rec) ? { linkWrap: await sealLinkKeys(identity, ls.seal, gid, e, K, oldKeys(sec, e), t) } : {}),
    };
    try { await (await clientOf(rec.origin)).rg('POST', gid, '/link', { body }); }
    catch (x) { if (x && x.status === 409 && again) return resetLinkNow(gid, false); throw relayFail(x); }
    const next = { ...sec, t: token, v };
    await putRec(gid, async (cur) => (cur ? { ...cur, sealed: await saveSecrets(identity, gid, next) } : undefined));
    g.linkNote = null;
    dirtyL();
    // A code goes with the link it came with. If a new one can't be made now, the old one still stops.
    if (sec.c) await writeCode(rec, newShortCode(), next, identity).catch(async () => { await writeCode(rec, null, next, identity).catch(() => {}); const none = { ...next, c: null }; await putRec(gid, async (cur) => (cur ? { ...cur, sealed: await saveSecrets(identity, gid, none) } : undefined)); });
    await syncNow(gid).catch(() => {});
    changed();
    return shareNow(gid);
  }
  const resetLink = (gid) => serial(() => resetLinkNow(gid));
  /** How people get in: {mode: approve | open, exp?, maxUses?}. The mode is in the signed card: a relay's word for it opens nothing. */
  function setJoin(gid, { mode, exp = null, maxUses = null } = {}) {
    return serial(async () => {
      await syncNow(gid).catch(() => {});
      const { rec, identity, sec, g } = await runner(gid);
      const m = mode === 'open' ? 'open' : 'approve', t = now();
      const body = { mode: m, exp: Number.isFinite(exp) ? exp : null, maxUses: Number.isInteger(maxUses) && maxUses > 0 ? maxUses : null, rs: g.rs };
      if (m === 'open' && !sec.t) throw fail('NO_LINK', 'This computer does not have the link yet. Try again in a moment.');
      if (Number.isFinite(exp) && exp <= t && !(g.link && g.link.exp === exp)) throw fail('PAST_DATE', 'That date has already passed. Pick a new one.');
      const e = latestE(sec);
      let card = rec.card;
      if (rec.card.mode !== m) {
        card = await signCard(identity, { gid, ...cardFields({}, rec.card), mode: m, auth: rec.auth, owner: rec.card.owner, j: rec.card.j, at: t });
        body.cardK = await sealFor(await groupAes(sec.keys[e]), card, `card|${gid}`);
        if (sec.t) body.cardL = await sealFor((await linkSecrets(gid, sec.t)).seal, card, `card|${gid}`);
        // Going to "I approve": a link's proof stops counting, so whoever came in that way gets a signed one, and the key then changes.
        if (m === 'approve') body.admits = await freshAdmits(rec, g, sec, identity, (r) => !admitRoot(r.admit));
      }
      if (m === 'open') body.linkWrap = await sealLinkKeys(identity, (await linkSecrets(gid, sec.t)).seal, gid, e, sec.keys[e], oldKeys(sec, e), t);
      try { await (await clientOf(rec.origin)).rg('POST', gid, '/link', { body }); } catch (x) { throw relayFail(x); }
      const out = card === rec.card ? rec : await putRec(gid, (cur) => (cur ? { ...cur, card } : undefined));
      g.mode = m;
      if (sec.c && card !== rec.card) await writeCode(out, sec.c, sec, identity).catch(() => {});
      await syncNow(gid).catch(() => {});
      changed();
      return shareNow(gid);
    });
  }
  async function writeCode(rec, code, sec, identity) {
    const cl = await clientOf(rec.origin);
    if (!code) { await cl.rg('DELETE', rec.id, '/code'); return null; }
    const s = await codeSecrets(code);
    const blob = await sealFor(s.seal, { gid: rec.id, card: rec.card }, `code|${s.key}`);
    await cl.rg('POST', rec.id, '/code', { body: { key: s.key, h: s.h, blob } });
    const next = { ...sec, c: code };
    await putRec(rec.id, async (cur) => (cur ? { ...cur, sealed: await saveSecrets(identity, rec.id, next) } : undefined));
    return code;
  }
  /** The optional 4-letter code. Off by default; it can only ever lead to asking (docs/dev/GROUPS.md). */
  function setCode(gid, on) {
    return serial(async () => {
      const { rec, identity, sec, g } = await runner(gid);
      let code = null;
      try {
        if (on) {
          for (let i = 0; i < 4 && !code; i++) {
            const c = newShortCode();
            try { code = await writeCode(rec, c, sec, identity); }
            catch (e) { if (e.status !== 409) throw e; }
          }
          if (!code) throw fail('RELAY', 'Could not make a code just now. Try again.');
        } else {
          await writeCode(rec, null, sec, identity);
          const next = { ...sec, c: null };
          await putRec(gid, async (cur) => (cur ? { ...cur, sealed: await saveSecrets(identity, gid, next) } : undefined));
        }
      } catch (e) { if (e.status === 400 && e.code) throw e; throw relayFail(e); }
      g.code = !!code;
      dirtyL();
      changed();
      return { code };
    });
  }

  // ─── Joining ──────────────────────────────────────────────────────────
  /** What a link or a code says, before anything is asked -> {via, origin, gid, card, mode, n, full, lv, ls|cs}. */
  async function read(text) {
    const t = String(text == null ? '' : text).trim();
    const link = await parseGroupLink(t);
    if (link && link.error === 'needs-link') throw fail('BAD_LINK', "That's only part of the link. Copy the whole thing, starting with https.");
    if (link && link.error === 'origin') throw fail('BAD_LINK', "That link points somewhere Freeflo won't connect to. Ask for a new one.");
    if (link && link.error === 'check') throw fail('BAD_LINK', 'That link is cut short or was mistyped. Copy the whole thing again.');
    if (link) {
      const ls = await linkSecrets(link.gid, link.token);
      // Looking is not joining: a key made for this one look, so that reading a link tells its relay nothing about who I am.
      let r;
      try { r = await createRelayClient({ origin: link.origin, identity: { ed: await newEdKeyPair() } }).rg('POST', link.gid, '/peek', { body: { proof: ls.proof } }); }
      catch (e) {
        if (e && e.status === 404) throw fail('GONE', 'This group is no longer there, or its connection needs an update. Ask the person who sent the link.');
        if (e && e.status === 410) throw fail('GONE', 'This link no longer works. Ask the person who sent it for a new one.');
        throw relayFail(e);
      }
      const card = await checkCard(await openFor(ls.seal, r.card, `card|${link.gid}`), link.gid);
      if (!card) throw fail('BAD_CARD', "This group's details couldn't be checked. Ask the person who sent the link for a new one.");
      // From the group's first document, whose hash is in the link: nothing else is taken on the relay's word.
      const fa = await followAuth(link.gid, null, r.auths, []);
      if (!cardFits(card, fa)) throw fail('BAD_CARD', "This group's details couldn't be checked. Ask the person who sent the link for a new one.");
      return { via: 'link', origin: link.origin, gid: link.gid, token: link.token, card, auth: fa.auth, ever: fa.ever, mode: card.mode, n: Number(r.n) || 0, full: r.full === true, lv: Number(r.lv) || 1, ls, epoch: Number(r.epoch) || 1 };
    }
    const code = parseShortCode(t);
    if (!code.ok) throw fail('BAD_LINK', "That isn't a group link or code. Copy the whole link, or type the 4 letters.");
    const cs = await codeSecrets(code.code);
    const origins = new Set((await listRelays(dataDir)).map(r => r.origin));
    for (const g of Object.values((await readDoc(dataDir, 'groups')).groups)) if (g.status === 'member') origins.add(g.origin);
    if (!origins.size) throw fail('NO_RELAY', "A code only works if you're already connected to the place the group runs on. Ask for the group's link instead: that works for everyone.");
    let last = null;
    for (const origin of origins) {
      let hit = null;
      try { hit = await (await clientOf(origin)).groupCode(cs.key); } catch (e) { last = e; continue; }
      if (!hit || !GID_RE.test(hit.gid)) continue;
      const v = await openFor(cs.seal, hit.blob, `code|${cs.key}`);
      const card = v ? await checkCard(v.card, hit.gid) : null;
      if (card) return { via: 'code', origin, gid: hit.gid, card, auth: null, ever: [], mode: 'approve', n: 0, full: false, lv: 0, cs };
    }
    if (last && last.status === 429) throw fail('TOO_MANY', "Too many codes that weren't right. Wait 10 minutes, or use the group's link.");
    if (last && !last.status) throw relayFail(last);
    throw fail('NOT_FOUND', "That code isn't right. Check the letters, or ask for the group's link instead.");
  }
  async function preview(text) {
    await ensureIdentity(dataDir);
    const p = await read(text);
    const rec = await getRec(p.gid);
    const identity = await loadIdentity(dataDir);
    return {
      via: p.via, host: relayHostOf(p.origin), gid: p.gid, name: p.card.name, about: p.card.about, logo: p.card.logo, auto: p.card.auto,
      ownerName: p.card.owner.name, ownerFp: await fingerprintOf(p.card.owner.ed), mode: p.mode, count: p.n, full: p.full, firstConnection: !(await homeRelay(dataDir)),
      already: rec && (rec.status === 'member' || rec.status === 'asking') ? rec.status : null,
      suggested: (rec && rec.me && rec.me.name) || await defaultName(), isOwner: !!identity && identity.ed.pub === p.card.owner.ed,
    };
  }
  /**
   * Join, or ask to. {name, status}: what people here will see (this group only). home: this person said yes to also using this
   * group's connection for friends, having none of their own. auto: they saw, and kept, "people here become friends automatically".
   */
  function join(text, { name, status, home: useHome = false, auto = false } = {}) {
    return serial(async () => {
      const identity = await ensureIdentity(dataDir);
      const p = await read(text);
      const had = await getRec(p.gid);
      if (had && had.status === 'member') return { status: 'member', name: p.card.name, welcome: '', id: p.gid };   // already in: what it holds stays
      if (p.full) throw fail('FULL', 'This group is full, or its link has been used as many times as allowed. Ask the person who sent it.');
      const me = meOf({ name, status }, await defaultName());
      const needHome = useHome === true && !(await homeRelay(dataDir));
      const card = await cardFor(identity, me.name);
      const tag = p.via === 'link' ? await openTag(p.ls.tag, p.gid, identity.ed.pub, identity.x.pub) : null;
      // tag: inside what only the people running the group can open, so a relay without the link cannot make up someone asking.
      const body = { x: identity.x.pub, home: needHome, env: await sealAsk(p.card.j, p.gid, { name: me.name, ...(me.status ? { status: me.status } : {}), ...(me.avatar ? { avatar: me.avatar } : {}), card, at: now(), via: p.via, ...(tag ? { tag } : {}) }) };
      if (p.via === 'link') { body.proof = p.ls.proof; body.admit = { tag, lv: p.lv }; }
      else body.codeProof = p.cs.proof;
      let r;
      try { r = await (await clientOf(p.origin)).rg('POST', p.gid, '/join', { body }); }
      catch (e) {
        if (e && e.status === 410) throw fail('GONE', 'This link no longer works. Ask the person who sent it for a new one.');
        if (e && e.status === 403 && p.via === 'code') throw fail('NOT_ALLOWED', "A code only works for people already connected through the same place. Ask for the group's link instead.");
        throw relayFail(e);
      }
      const t = now();
      const sealed = await saveSecrets(identity, p.gid, { ...EMPTY(), t: p.token || null, v: p.lv || 0 });
      const yes = p.card.auto === true && auto === true;
      let rec = await putRec(p.gid, (cur) => ({ ...(cur || {}), id: p.gid, origin: p.origin, status: 'asking', at: t, joinedAt: 0, ed: identity.ed.pub, via: p.via, card: p.card, auth: p.auth, ever: p.ever, me, sealed, home: needHome, asked: t, autoOk: yes, autoAsked: p.card.auto === true }));
      (await localOf(p.gid)).lastAsk = 0;   // asked just now: the next pass looks, whatever an earlier try left behind
      if (r && r.state === 'member') rec = await arrive(rec, r, identity);
      changed();
      return { status: rec.status, name: p.card.name, welcome: rec.status === 'member' ? p.card.welcome : '', id: p.gid };
    });
  }
  /**
   * The relay says I'm in. Believed only as far as a key opens that someone in the signed history wrapped for me (or, anyone-with-the-link only,
   * sealed under the link and signed). Until then I am still asking: a relay's "you are in" is not a way into anything, and nothing of mine goes to it.
   */
  async function arrive(rec, info, identity) {
    const gid = rec.id;
    const fa = await followAuth(gid, rec.auth, info.auths, rec.ever);
    if (!fa.auth || !rec.card || !fa.ever.includes(rec.card.owner.ed)) { log('warn', "groups: the relay said I'm in, but who runs the group could not be checked"); return rec; }
    const sec = await secretsOf(rec);
    if (info.wrap) {
      const w = await openWrap(identity, gid, info.wrap);
      if (w && runsGroup(fa.auth, w.by)) takeBundle(sec, w.e, w.bundle, runsGroup(fa.auth, identity.ed.pub));
    } else if (info.linkWrap && sec.t && rec.via === 'link' && openLink(rec)) {
      const b = await openLinkKeys((await linkSecrets(gid, sec.t)).seal, gid, info.epoch, info.linkWrap, fa.auth);
      if (b) takeBundle(sec, info.epoch, b, false);
    }
    if (!sec.keys[latestE(sec)]) { log('info', 'groups: no key I could check yet; still waiting'); return putRec(gid, (cur) => ({ ...cur, auth: fa.auth, ever: fa.ever })); }
    if (info.mbox && rec.home) {
      await setRelay(dataDir, { origin: rec.origin, role: 'member', scopes: info.scopes || ['message'], mbox: info.mbox }, { home: !(await homeRelay(dataDir)) });
      if (friends) await friends.reload().catch(() => {});
      caps = null;
    }
    const sealed = await saveSecrets(identity, gid, sec);
    const out = await putRec(gid, (cur) => ({ ...cur, status: 'member', joinedAt: now(), auth: fa.auth, ever: fa.ever, sealed, leftAt: 0, leftN: 0 }));
    const g = await localOf(gid);
    g.s = 0;
    g.epoch = latestE(sec);
    await syncNow(gid).catch(() => {});
    listenTo(gid, rec.origin);
    return out;
  }
  /**
   * A bundle someone who runs the group wrapped for me. Never backwards: a replayed old wrap must not put an old (leaked) link or join key
   * back. What runs the group (the link, the join-request key, the code) is taken only by someone the signed document says runs it.
   */
  function takeBundle(sec, e, b, mayRun) {
    if (!Number.isInteger(e) || e < latestE(sec) || (sec.keys[e] && sec.keys[e] !== b.k)) return false;
    sec.keys[e] = b.k;
    if (b.old && typeof b.old === 'object') for (const [k, v] of Object.entries(b.old)) if (/^\d{1,9}$/.test(k) && Number(k) < e && typeof v === 'string' && !sec.keys[k]) sec.keys[k] = v;
    if (mayRun) {
      if (b.j && b.j.pub && b.j.priv) { if (sec.j && sec.j.pub !== b.j.pub) sec.jo = [...(sec.jo || []), sec.j].slice(-3); sec.j = { pub: b.j.pub, priv: b.j.priv }; }
      if (Array.isArray(b.jo)) sec.jo = b.jo.slice(-3);
      if (typeof b.t === 'string') { sec.t = b.t; sec.v = Number(b.v) || sec.v || 1; }
      if (b.c !== undefined && (b.c === null || typeof b.c === 'string')) sec.c = b.c;
    }
    return true;
  }
  /** Older keys for a newcomer: only a few, for the announcements and names sealed under them. */
  const oldKeys = (sec, e) => { const out = {}; for (const k of Object.keys(sec.keys).map(Number).filter(k => k !== e && k < e).sort((a, b) => b - a).slice(0, OLD_GIVEN)) out[k] = sec.keys[k]; return out; };
  function cancelJoin(gid) {
    return serial(async () => {
      const rec = await getRec(gid);
      if (!rec || rec.status !== 'asking') return { ok: true };
      const cl = await clientOf(rec.origin);
      try { await cl.rg('DELETE', gid, '/join'); } catch (e) { log('info', `groups: a request could not be taken back yet (${e && e.relayError})`); }
      await cl.rg('POST', gid, '/leave').catch(() => {});   // let in, but no key I could check came: not staying on the list either
      await forgetRec(gid);
      changed();
      return { ok: true };
    });
  }
  async function pollAsking(rec, identity) {
    let r;
    try { r = await (await clientOf(rec.origin)).rg('GET', rec.id, '/join'); }
    catch (e) { if (e && e.status === 404) { await putRec(rec.id, (cur) => (cur ? { ...cur, status: 'gone' } : undefined)); changed(); } return; }
    if (r.state === 'member') { const out = await arrive(rec, r, identity); changed(); if (out && out.status === 'member') { try { emit('friends', { type: 'groups', note: 'in', name: rec.card ? rec.card.name : '', id: rec.id }); } catch { /* fine */ } } }
    else if (r.state === 'declined' || r.state === 'none' || r.state === 'removed') { await putRec(rec.id, (cur) => (cur ? { ...cur, status: 'declined' } : undefined)); changed(); }
  }

  // ─── Keeping up: the feed ─────────────────────────────────────────────
  async function syncNow(gid) {
    let rec = await getRec(gid);
    if (!rec || rec.status !== 'member') return false;
    const identity = await loadIdentity(dataDir);
    if (!identity) return false;
    const g = await localOf(gid);
    const cl = await clientOf(rec.origin, identity);
    let sec = await secretsOf(rec);
    let got = false, secChanged = false, lastRes = null;
    for (let page = 0; page < 8; page++) {
      let res;
      try { res = await cl.rg('GET', gid, '/feed', { query: `since=${g.s || 0}&ke=${latestE(sec)}&au=${rec.auth ? rec.auth.seq : 0}` }); }
      catch (e) {
        if (e && (e.status === 404 || (e.status === 403 && e.relayError === 'not_member'))) {
          // Asked again, plainly: one answer must not change anything. And a relay with no groups at all (older, or being updated) says nothing about this one.
          const st = await cl.rg('GET', gid, '/join').catch((x) => (x && x.status === 404 ? { state: 'gone' } : null));
          if (!st || st.state === 'member') return false;
          if (st.state === 'gone' && !(await cl.health().then((h) => h.groups === 1, () => false))) return false;
          return leftBehind(rec, identity, st.state === 'gone' ? 'gone' : st.state === 'pending' ? 'asking' : 'removed');
        }
        throw e;
      }
      lastRes = res;
      // Who runs it: only what the signed documents say. A relay cannot change this.
      if (Array.isArray(res.auths) && res.auths.length) {
        const fa = await followAuth(gid, rec.auth, res.auths, rec.ever);
        if (fa.auth && (!rec.auth || fa.auth.seq !== rec.auth.seq || fa.ever.length !== rec.ever.length)) { rec = await putRec(gid, (cur) => (cur ? { ...cur, auth: fa.auth, ever: fa.ever } : undefined)); got = true; }
      }
      if (res.keys) {
        const w = await openWrap(identity, gid, res.keys);
        if (w && runsGroup(rec.auth, w.by) && takeBundle(sec, w.e, w.bundle, runsGroup(rec.auth, identity.ed.pub))) { secChanged = true; got = true; }
      } else if (res.linkWrap && sec.t && rec.via === 'link' && openLink(rec)) {
        // Anyone-with-the-link only, by the signed card, and signed by someone who runs the group. Only keys come from it.
        const b = await openLinkKeys((await linkSecrets(gid, sec.t)).seal, gid, res.epoch, res.linkWrap, rec.auth);
        if (b && takeBundle(sec, res.epoch, b, false)) { secChanged = true; got = true; }
      }
      if (res.card && sec.keys[res.epoch]) {
        const c = await checkCard(await openFor(await groupAes(sec.keys[res.epoch]), res.card, `card|${gid}`), gid);
        if (c && cardFits(c, { auth: rec.auth }) && (!rec.card || c.at >= rec.card.at)) {
          // Automatic friends turned off: a later turning on asks each person again.
          rec = await putRec(gid, (cur) => (cur ? { ...cur, card: c, ...(c.auto ? {} : { autoOk: false, autoAsked: false }) } : undefined));
          got = true;
        }
      }
      g.epoch = Number.isInteger(res.epoch) ? res.epoch : g.epoch; g.rs = Number(res.rs) || 0; g.due = res.due === true; g.n = Number(res.n) || g.n; g.mode = openLink(rec) ? 'open' : 'approve'; g.posting = res.posts === 'admins' ? 'admins' : 'all';
      if (Array.isArray(res.roster)) { g.roster = await checkedRoster(rec, sec, res.roster); const live = new Set(g.roster.map(r => r.iid)); for (const iid of Object.keys(g.profiles)) if (!live.has(iid)) delete g.profiles[iid]; got = true; }
      // Requests through the group, and the handshake that follows, are looked at after the roster: an asker is on it by then.
      if (Array.isArray(res.dms) && res.dms.length) {
        const ack = [];
        for (const d of res.dms.slice(0, 50)) {
          ack.push(d.s);
          if (d.env && friends && typeof friends.receive === 'function') await friends.receive(d.env, 'relay').catch(() => {});
        }
        await cl.rg('POST', gid, '/dm/ack', { body: { ss: ack } }).catch(() => {});
        got = true;
      }
      for (const it of Array.isArray(res.items) ? res.items : []) { if (await takeItem(gid, g, rec, sec, it)) got = true; }
      if (Array.isArray(res.requests)) { g.requests = await readRequests(rec, sec, res.requests); got = true; }
      if (Array.isArray(res.blocks)) g.blocks = res.blocks.filter(b => b && typeof b.iid === 'string').slice(0, 500).map(b => ({ iid: b.iid, at: Number(b.at) || 0 }));
      if (res.link !== undefined) g.link = res.link && typeof res.link === 'object' ? { v: Number(res.link.v) || 1, exp: Number.isFinite(res.link.exp) ? res.link.exp : null, maxUses: Number.isInteger(res.link.maxUses) ? res.link.maxUses : null, uses: Number(res.link.uses) || 0 } : null;
      if (res.code !== undefined) g.code = res.code === true;
      if (Number.isFinite(res.used)) g.used = res.used;
      if (res.limits && typeof res.limits === 'object') g.limits = { warn: Number(res.limits.warn) || 100, max: Number(res.limits.max) || 500 };
      g.s = Number(res.s) || g.s;
      if (!res.more) break;
    }
    if (secChanged) {
      const sealed = await saveSecrets(identity, gid, sec);
      rec = await putRec(gid, (cur) => (cur ? { ...cur, sealed } : undefined));
    }
    g.lastSync = now();
    dirtyL();
    if (lastRes) await upkeep(rec, g, sec, identity, lastRes);
    if (got) changed();
    return got;
  }
  /**
   * The list as the relay gives it: only a row that is what it says (its id is its key's hash, one row per key), and whose signed proof holds
   * against the signed history. A row whose proof fails is not shown and gets nothing. One whose link proof I hold no key for (only the
   * people running the group hold the current link) is shown, but counts for nothing: ok false.
   */
  async function checkedRoster(rec, sec, rows) {
    const ctx = await proofCtx(rec, sec), keys = new Set(), out = [];
    for (const r of rows.slice(0, 1000)) {
      if (!r || typeof r.iid !== 'string' || !isPub(r.key) || !isPub(r.x) || keys.has(r.key) || (await iidOf(r.key)) !== r.iid) continue;
      const ok = await checkAdmit(r.admit, rec.id, r.key, r.x, ctx);
      if (ok === false) { log('warn', 'groups: someone on the list has no proof that holds: not shown, and given nothing'); continue; }
      keys.add(r.key);
      out.push({ iid: r.iid, key: r.key, x: r.x, at: Number(r.at) || 0, admit: r.admit, ok: ok === true });
    }
    return out;
  }
  /** One post or profile from the feed: its signature, its key, then a strict shape. Anything else is dropped. */
  async function takeItem(gid, g, rec, sec, it) {
    if (!it || typeof it !== 'object') return false;
    const m = await openEnv({ gid, env: it.env, keyOf: keyOf(sec) });
    if (!m) return false;
    const t = now();
    if (m.at < t - MSG_OLDEST_MS || m.at > t + MSG_AHEAD_MS) return false;
    if (it.t === 'prof') {
      const row = g.roster.find(r => r.iid === it.iid);
      if (!row || row.key !== m.from || m.k !== 'profile' || m.ch !== 'p') return false;
      const p = await cleanProfile(m.b, m.from, checkAvatar);
      if (!p) return false;
      const was = g.profiles[it.iid];
      if (was && was.at >= m.at) return false;
      g.profiles[it.iid] = { ...p, at: m.at };
      return true;
    }
    if (it.t !== 'post' || m.k !== 'post' || m.ch === 'p' || !m.b || typeof m.b.text !== 'string') return false;
    if (g.seen[m.id]) return false;
    // An announcement only from someone who runs the group, whatever the relay says; or who did when they wrote it (before the last change of who runs it).
    if (m.ch === 'a' && !runsGroup(rec.auth, m.from) && !(rec.ever.includes(m.from) && rec.auth && m.at <= rec.auth.at)) return false;
    const text = cleanText(m.b.text, TEXT_MAX);
    if (!text) return false;
    g.seen[m.id] = m.at;
    g.posts.push({ id: m.id, s: Number(it.s) || 0, ch: m.ch, at: m.at, from: m.from, text });
    g.posts.sort((a, b) => a.s - b.s);
    if (g.posts.length > KEPT_POSTS) g.posts = g.posts.slice(-KEPT_POSTS);
    const seenIds = Object.entries(g.seen);
    if (seenIds.length > KEPT_POSTS * 3) g.seen = Object.fromEntries(seenIds.sort((a, b) => b[1] - a[1]).slice(0, KEPT_POSTS * 2));
    return true;
  }
  async function readRequests(rec, sec, list) {
    const gid = rec.id, out = [], tag = sec.t ? (await linkSecrets(gid, sec.t)).tag : null, t = now();
    for (const q of list.slice(0, 200)) {
      if (!q || typeof q.iid !== 'string' || !isPub(q.key) || !isPub(q.x) || (await iidOf(q.key)) !== q.iid) continue;
      // sealed to the key on the card they read: the current one, or one a key change just left behind
      let b = null;
      for (const j of [sec.j, ...(sec.jo || [])]) { if (!j) continue; b = await openAsk(j, gid, q.env); if (b) break; }
      const row = { iid: q.iid, key: q.key, x: q.x, at: Number(q.at) || 0, via: q.via === 'code' ? 'code' : 'link', ok: false, name: 'Someone', fp: await fingerprintOf(q.key) };
      if (b && typeof b === 'object') {
        const p = await cleanProfile(b, q.key, checkAvatar);
        // A relay can read the card's public key, so it could write a request itself: this one must also prove it holds the link (or that a code is on), and be recent.
        const came = b.via === 'code' ? !!sec.c : !!tag && b.tag === await openTag(tag, gid, q.key, q.x);
        if (p && p.card && p.card.x === q.x && came && Number.isFinite(b.at) && b.at > t - MSG_OLDEST_MS && b.at < t + MSG_AHEAD_MS) { row.ok = true; row.via = b.via === 'code' ? 'code' : 'link'; row.name = p.name; if (p.status) row.status = p.status; if (p.avatar) row.avatar = p.avatar; }
      }
      out.push(row);
    }
    return out;
  }
  /** What a feed answer asks of me: my profile out, a key rotation that is due, a signed list of admins put right. */
  async function upkeep(rec, g, sec, identity, res) {
    if (rec.status !== 'member') return;
    const myIid = await iidOf(identity.ed.pub);
    if (!g.profiles[myIid] || !g.postedE || g.postedE < g.epoch - 4) await postProfile(rec, g, sec, identity).catch((e) => log('info', `groups: profile not posted yet (${e && (e.relayError || e.code)})`));
    rec = await reconcileAuth(rec, g, sec, identity).catch((e) => { log('info', `groups: who runs the group was not put right yet (${e && (e.relayError || e.code)})`); return rec; });
    if (res.due && runsGroup(rec.auth, identity.ed.pub)) {
      await rotateNow(rec.id).catch((e) => log('info', `groups: the key was not changed yet (${e && (e.relayError || e.code)}); trying again shortly`));
    }
  }
  /**
   * The owner's app keeps the signed list true, without anyone pressing anything, in exactly two cases, and on proof or on the safe side only:
   * someone who runs the group renewed their keys (both keys signed it: never because a relay labels a row "admin"), or someone who runs it is gone from the
   * list (they left: at worst a dishonest relay costs someone their role, never gives anyone one). Whoever they let in gets a new proof from me first.
   */
  async function reconcileAuth(rec, g, sec, identity) {
    const a = rec.auth, gid = rec.id;
    if (!a || a.owner.ed !== identity.ed.pub || !g.roster.some(r => r.key === identity.ed.pub)) return rec;
    let admins = a.admins.slice();
    const out = new Set();
    for (const r of g.roster) {
      if (namedIn(a, r.key, r.x) || !r.admit || !r.admit.rk) continue;
      const was = (await renewedFrom(r.admit, gid, r.key, r.x)).find(c => admins.some(x => x.ed === c.from && x.x === c.x));
      if (!was) continue;
      admins = admins.filter(x => x.ed !== was.from);
      admins.push({ ed: r.key, x: r.x });
      out.add(was.from);
    }
    const here = new Set(g.roster.map(r => r.key));
    const left = admins.filter(x => !here.has(x.ed));
    if (!out.size && !left.length) return rec;
    for (const x of left) out.add(x.ed);
    admins = admins.filter(x => here.has(x.ed));
    const admits = await freshAdmits(rec, g, sec, identity, (r) => out.has(admitRoot(r.admit)));
    const auth = await signAuth(identity, { gid, seq: a.seq + 1, owner: a.owner, admins, at: now(), prev: a });
    await (await clientOf(rec.origin, identity)).rg('POST', gid, '/auth', { body: { auth, admits, rs: g.rs } });
    const fa = await followAuth(gid, a, [auth], rec.ever);
    if (left.length) { g.linkNote = 'left'; dirtyL(); }   // they still know the link: the owner is told, and offered a new one
    syncSoon(gid, 500);
    return putRec(gid, (cur) => (cur ? { ...cur, auth: fa.auth, ever: fa.ever } : undefined));
  }
  async function postProfile(rec, g, sec, identity) {
    const e = latestE(sec);
    if (!sec.keys[e]) return false;
    const me = meOf(rec.me, await defaultName());
    const env = await sealEnv({ identity, gid: rec.id, e, key: sec.keys[e], k: 'profile', ch: 'p', b: { ...me, card: await cardFor(identity, me.name) }, at: now() });
    await (await clientOf(rec.origin, identity)).rg('PUT', rec.id, '/me', { body: { env } });
    g.postedE = e;
    dirtyL();
    syncSoon(rec.id, 1000);
    return true;
  }

  // ─── Rotating the key ─────────────────────────────────────────────────
  async function runner(gid) {
    const rec = await getRec(gid);
    if (!rec || rec.status !== 'member') throw fail('NOT_FOUND', 'That group is not here any more.');
    const identity = await ensureIdentity(dataDir);
    if (!runsGroup(rec.auth, identity.ed.pub)) throw fail('NOT_ALLOWED', 'Only the people who run this group can do that.');
    return { rec, identity, sec: await secretsOf(rec), g: await localOf(gid) };
  }
  /**
   * A new key for everyone still here, and only for them. Each person's signed proof is checked against the signed history as it is now, with
   * the exact x key it names: a relay cannot slip in a key of its own, and someone who no longer runs the group vouches for nobody. What runs the group
   * goes only to the exact pair the document names. Someone else may get there first (409): fine, that is what it wanted.
   */
  async function rotateNow(gid) {
    const { rec, identity, sec, g } = await runner(gid);
    if (!sec.t) return false;
    const e = Math.max(g.epoch || 0, latestE(sec)) + 1, K = newGroupKey(), J = await newKeyPair(), t = now();
    const ctx = await proofCtx(rec, sec, true);
    const batch = await wrapBatch(identity, gid, e, t);
    const wraps = {}, admits = {};
    const auth = rec.auth;
    const jo = [...(sec.jo || []), ...(sec.j ? [sec.j] : [])].slice(-3);
    // Older keys too, a few: someone offline through two changes can still read what was said between them.
    const old = oldKeys(sec, e), runnerBundle = { k: K, old, j: J, jo, t: sec.t, v: sec.v, c: sec.c || null };
    for (const r of g.roster) {
      if ((await checkAdmit(r.admit, gid, r.key, r.x, ctx)) !== true) { log('warn', 'groups: someone on the list could not be checked, and did not get the new key'); continue; }
      const runs = namedIn(auth, r.key, r.x);
      wraps[r.iid] = await batch.wrap({ ed: r.key, x: r.x }, runs ? runnerBundle : { k: K, old });
      // A chain of key renewals is made short while it still checks: they would otherwise run out of room.
      if (!runs && r.admit && r.admit.rk && r.admit.prev && r.admit.prev.rk) admits[r.iid] = await signAdmit(identity, gid, r.key, r.x, t);
    }
    const ownerName = (() => { const row = g.roster.find(x => x.key === auth.owner.ed); const p = row && g.profiles[row.iid]; return (p && p.name) || (rec.card && rec.card.owner.ed === auth.owner.ed ? rec.card.owner.name : 'Someone'); })();
    const card = await signCard(identity, { gid, ...cardFields({}, rec.card), mode: rec.card.mode, auth, owner: { ed: auth.owner.ed, x: auth.owner.x, name: ownerName }, j: J.pub, at: t });
    const ls = await linkSecrets(gid, sec.t);
    const body = { rs: g.rs, hdr: batch.hdr, wraps, cardK: await sealFor(await groupAes(K), card, `card|${gid}`), cardL: await sealFor(ls.seal, card, `card|${gid}`), ...(Object.keys(admits).length ? { admits } : {}), ...(openLink(rec) ? { linkWrap: await sealLinkKeys(identity, ls.seal, gid, e, K, oldKeys(sec, e), t) } : {}) };
    const cl = await clientOf(rec.origin, identity);
    try { await cl.rg('POST', gid, '/keys', { body }); }
    catch (x) { if (x && x.status === 409) { g.s = Math.max(0, g.s - 1); dirtyL(); return false; } throw x; }
    const next = { ...sec, keys: { ...sec.keys, [e]: K }, j: J, jo };
    const sealed = await saveSecrets(identity, gid, next);
    const out = await putRec(gid, (cur) => (cur ? { ...cur, card, sealed } : undefined));
    g.epoch = e; g.due = false; g.postedE = e;
    dirtyL();
    if (sec.c) await writeCode(out, sec.c, next, identity).catch(() => {});
    changed();
    return true;
  }

  // ─── People ───────────────────────────────────────────────────────────
  function approve(gid, iid) {
    return serial(async () => {
      const { rec, identity, sec, g } = await runner(gid);
      const q = g.requests.find(r => r.iid === iid);
      if (!q) throw fail('NOT_FOUND', "They're not waiting any more.");
      if (!q.ok) throw fail('NOT_CHECKED', "This request couldn't be checked, so it can't be accepted. Decline it, and ask them to send the request again.");
      const once = async () => {
        const e = latestE(sec), K = sec.keys[e], t = now();
        if (!K) throw fail('NO_KEY', 'This computer does not have the group\'s key yet. Try again in a moment.');
        const batch = await wrapBatch(identity, gid, e, t);
        const body = { hdr: batch.hdr, wrap: await batch.wrap({ ed: q.key, x: q.x }, { k: K, old: oldKeys(sec, e) }), admit: await signAdmit(identity, gid, q.key, q.x, t) };
        await (await clientOf(rec.origin, identity)).rg('POST', gid, `/requests/${iid}/approve`, { body });
      };
      try { await once(); }
      catch (e) {
        if (e && e.status === 409) { await syncNow(gid).catch(() => {}); Object.assign(sec, await secretsOf(await getRec(gid))); await once().catch((x) => { throw relayFail(x); }); }
        else if (e && e.status === 400 && e.code) throw e;
        else throw relayFail(e);
      }
      g.requests = g.requests.filter(r => r.iid !== iid);
      await syncNow(gid).catch(() => {});
      changed();
      return { ok: true };
    });
  }
  function decline(gid, iid, { block = false } = {}) {
    return serial(async () => {
      const { rec, identity, g } = await runner(gid);
      try { await (await clientOf(rec.origin, identity)).rg('POST', gid, `/requests/${iid}/decline`, { body: { block: block === true } }); } catch (e) { throw relayFail(e); }
      g.requests = g.requests.filter(r => r.iid !== iid);
      await syncNow(gid).catch(() => {});
      changed();
      return { ok: true };
    });
  }
  /**
   * Remove (or block): hidden at once, and after the 10 seconds of Undo the relay is told. If it can't be reached the
   * job stays in groups-local.json and the background pass tries until the relay says yes (or that they are already gone).
   */
  function remove(gid, iid, { block = false } = {}) {
    return serial(async () => {
      const { rec, identity, g } = await runner(gid);
      const row = g.roster.find(r => r.iid === iid);
      if (!row) throw fail('NOT_FOUND', 'They are no longer in this group.');
      if (row.key === identity.ed.pub) throw fail('NOT_ALLOWED', 'That is you. Use Leave instead.');
      const at = now();
      L.jobs = L.jobs.filter(j => !(j.t === 'remove' && j.gid === gid && j.iid === iid));
      L.jobs.push({ t: 'remove', gid, iid, block: block === true, at, next: at + UNDO_MS, tries: 0, origin: rec.origin });
      // They still hold the link: in "anyone with the link" that gets them back under a new name. Someone who ran the group gets a new link by itself (runJobs).
      if (openLink(rec) && !rec.auth.admins.some(a => a.ed === row.key)) g.linkNote = 'removed';
      dirtyL();
      const h = timers.setTimeout(() => { serial(runJobs).catch(() => {}); }, UNDO_MS + 200);
      if (h && h.unref) h.unref();
      changed();
      return { ok: true, undoUntil: at + UNDO_MS };
    });
  }
  function undoRemove(gid, iid) {
    return serial(async () => {
      await loadL();
      const j = L.jobs.find(x => x.t === 'remove' && x.gid === gid && x.iid === iid);
      if (!j || j.tries > 0 || j.next <= now()) throw fail('TOO_LATE', 'They were already removed. You can invite them again.');
      L.jobs = L.jobs.filter(x => x !== j);
      dirtyL();
      changed();
      return { ok: true };
    });
  }
  /** What is left to do, until the relay confirms it. */
  async function runJobs() {
    await loadL();
    const keep = [];
    for (const j of L.jobs) {
      if (j.at < now() - JOB_KEEP_MS) continue;
      if (j.next > now()) { keep.push(j); continue; }
      let done = false;
      try {
        if (j.t === 'remove') {
          const cl = await clientOf(j.origin);
          await syncNow(j.gid).catch(() => {});
          const rec = await getRec(j.gid), identity = await loadIdentity(dataDir), g = await localOf(j.gid), row = g.roster.find(r => r.iid === j.iid);
          // Someone who runs the group goes with the owner's signed change: they must not stay in the document, and they vouch for nobody afterwards.
          if (rec && rec.auth && identity && row && rec.auth.owner.ed === identity.ed.pub && rec.auth.admins.some(a => a.ed === row.key)) {
            const sec = await secretsOf(rec);
            const admits = await freshAdmits(rec, g, sec, identity, (r) => r.iid !== row.iid && admitRoot(r.admit) === row.key);
            const auth = await signAuth(identity, { gid: j.gid, seq: rec.auth.seq + 1, owner: rec.auth.owner, admins: rec.auth.admins.filter(a => a.ed !== row.key), at: now(), prev: rec.auth });
            await cl.rg('POST', j.gid, `/members/${j.iid}/remove`, { body: { auth, admits, block: j.block === true, rs: g.rs } });
            const fa = await followAuth(j.gid, rec.auth, [auth], rec.ever);
            await putRec(j.gid, (cur) => (cur ? { ...cur, auth: fa.auth, ever: fa.ever } : undefined));
            done = true;
            await syncNow(j.gid).catch(() => {});
            // They knew the link, and could hand it on: it changes now. The page says so and shows the new one.
            await resetLinkNow(j.gid).catch((x) => { const k = L.g[j.gid]; if (k) k.linkNote = 'removed'; log('info', `groups: a new link was not made yet (${x && (x.relayError || x.code)})`); });
          } else {
            await cl.rg('DELETE', j.gid, `/members/${j.iid}`, { query: j.block ? 'block=1' : '' });
            done = true;
            await syncNow(j.gid).catch(() => {});
          }
        } else if (j.t === 'leave') {
          await (await clientOf(j.origin)).rg('POST', j.gid, '/leave');
          done = true;
        } else done = true;
      } catch (e) {
        // Already done, or not ours to do any more: nothing left to confirm.
        if (e && (e.status === 404 || e.status === 403 || e.status === 410)) done = true;
        else if (e && e.status === 409) { j.next = now(); keep.push(j); continue; }   // the list just moved: from the top on the next pass
        else log('info', `groups: not confirmed yet (${e && (e.relayError || e.code)}); trying again later`);
      }
      if (done) continue;
      j.tries = (j.tries || 0) + 1;
      j.next = now() + Math.min(6 * 3600000, MIN * 2 ** Math.min(9, j.tries));
      keep.push(j);
    }
    L.jobs = keep;
    dirtyL();
    changed();
  }
  function unblock(gid, iid) {
    return serial(async () => {
      const { rec, identity, g } = await runner(gid);
      try { await (await clientOf(rec.origin, identity)).rg('DELETE', gid, `/blocks/${iid}`); } catch (e) { throw relayFail(e); }
      g.blocks = g.blocks.filter(b => b.iid !== iid);
      changed();
      return { ok: true };
    });
  }
  async function setRoleNow(rec, identity, iid, role) {
    const g = await localOf(rec.id), row = g.roster.find(r => r.iid === iid);
    if (!row) throw fail('NOT_FOUND', 'They are no longer in this group.');
    if (!row.ok && !namedIn(rec.auth, row.key, row.x)) throw fail('NOT_CHECKED', "This person's details couldn't be checked, so they can't be given that. Ask them to join again.");
    const admins = rec.auth.admins.filter(a => a.ed !== row.key);
    if (role === 'admin') admins.push({ ed: row.key, x: row.x });
    const auth = await signAuth(identity, { gid: rec.id, seq: rec.auth.seq + 1, owner: rec.auth.owner, admins, at: now(), prev: rec.auth });
    const body = { role, auth, rs: g.rs };
    if (role !== 'admin' && namedIn(rec.auth, row.key, row.x)) {
      // They stay as an ordinary member, on my word now; whoever they let in stays on my word too. They still know the link, so the owner is offered a new one.
      const sec = await secretsOf(rec);
      body.admit = await signAdmit(identity, rec.id, row.key, row.x, now());
      body.admits = await freshAdmits(rec, g, sec, identity, (r) => r.iid !== iid && admitRoot(r.admit) === row.key);
      g.linkNote = 'demoted';
      dirtyL();
    }
    await (await clientOf(rec.origin, identity)).rg('PUT', rec.id, `/members/${iid}/role`, { body });
    await syncNow(rec.id);
  }
  function setRole(gid, iid, role) {
    return serial(async () => {
      const { rec, identity } = await runner(gid);
      if (rec.auth.owner.ed !== identity.ed.pub) throw fail('NOT_ALLOWED', 'Only the owner can do that.');
      try { await setRoleNow(rec, identity, iid, role === 'admin' ? 'admin' : 'member'); } catch (e) { if (e.status === 400 && e.code) throw e; throw relayFail(e); }
      changed();
      return { ok: true };
    });
  }
  function transfer(gid, iid) {
    return serial(async () => {
      const { rec, identity, g } = await runner(gid);
      if (rec.auth.owner.ed !== identity.ed.pub) throw fail('NOT_ALLOWED', 'Only the owner can do that.');
      const row = g.roster.find(r => r.iid === iid);
      if (!row || row.key === identity.ed.pub) throw fail('NOT_FOUND', 'They are no longer in this group.');
      if (!row.ok && !namedIn(rec.auth, row.key, row.x)) throw fail('NOT_CHECKED', "This person's details couldn't be checked, so they can't be given that. Ask them to join again.");
      const admins = [...rec.auth.admins.filter(a => a.ed !== row.key && a.ed !== identity.ed.pub), { ed: identity.ed.pub, x: identity.x.pub }];
      const auth = await signAuth(identity, { gid, seq: rec.auth.seq + 1, owner: { ed: row.key, x: row.x }, admins, at: now(), prev: rec.auth });
      try { await (await clientOf(rec.origin, identity)).rg('POST', gid, '/transfer', { body: { to: iid, auth } }); } catch (e) { throw relayFail(e); }
      await syncNow(gid).catch(() => {});
      changed();
      return { ok: true };
    });
  }
  /** Leave: gone here at once. The relay is told now, or (no answer) until it confirms. */
  function leave(gid) {
    return serial(async () => {
      const rec = await getRec(gid);
      if (!rec) return { ok: true };
      if (rec.status === 'member') {
        try { await (await clientOf(rec.origin)).rg('POST', gid, '/leave'); }
        catch (e) {
          if (e && e.status === 409) throw fail('OWNER', 'Hand the group to someone else before you leave. People here would lose it otherwise.');
          if (!e || !(e.status === 403 || e.status === 404)) {
            await loadL();
            L.jobs.push({ t: 'leave', gid, at: now(), next: now() + MIN, tries: 0, origin: rec.origin });
            dirtyL();
          }
        }
      }
      await forgetRec(gid);
      await homeAfter(rec);
      changed();
      return { ok: true };
    });
  }
  function deleteGroup(gid) {
    return serial(async () => {
      const { rec, identity } = await runner(gid);
      if (rec.auth.owner.ed !== identity.ed.pub) throw fail('NOT_ALLOWED', 'Only the owner can delete a group.');
      try { await (await clientOf(rec.origin, identity)).rg('DELETE', gid); } catch (e) { if (!e || e.status !== 404) throw relayFail(e); }
      await forgetRec(gid);
      changed();
      return { ok: true };
    });
  }
  async function forgetRec(gid) {
    stopListening(gid);
    secretCache.delete(gid);
    await loadL();
    delete L.g[gid];
    L.jobs = L.jobs.filter(j => !(j.t === 'remove' && j.gid === gid));
    dirtyL();
    await putRec(gid, () => null);
  }
  /**
   * The relay says I'm not in it any more. The page says so and nothing is sent, but its word alone deletes nothing: my keys stay, and the background
   * pass looks again now and then. If it was wrong (a dishonest relay, a bad deploy), everything is as it was. After 30 days and several looks,
   * this computer forgets the keys. An owner can't be removed, so a relay saying that of an owner is simply not believed.
   */
  async function leftBehind(rec, identity, why) {
    if (why === 'removed' && rec.auth && rec.auth.owner.ed === identity.ed.pub) { log('warn', 'groups: the relay says I am not in a group I own: not believed'); return false; }
    stopListening(rec.id);
    await putRec(rec.id, (cur) => (cur ? { ...cur, status: why, leftAt: now(), leftN: 1 } : undefined));
    await homeAfter(rec);
    changed();
    return false;
  }
  /** A look at a group the relay says I'm not in: back in if it answers, forgotten only once it has said no for long enough. */
  async function lookAgain(rec, identity) {
    const g = await localOf(rec.id), age = now() - (rec.leftAt || 0);
    if (now() - (g.leftLook || 0) < (age < DAY ? 30 * MIN : 12 * 60 * MIN)) return;
    g.leftLook = now();
    dirtyL();
    try {
      await (await clientOf(rec.origin, identity)).rg('GET', rec.id, '/feed', { query: 'since=999999999999&ke=999999999&au=999999999' });
      await putRec(rec.id, (cur) => (cur ? { ...cur, status: 'member', leftAt: 0, leftN: 0 } : undefined));
      log('info', 'groups: the relay answers again: back in the group');
      listenTo(rec.id, rec.origin);
      await syncNow(rec.id).catch(() => {});
      changed();
    } catch (e) {
      if (!e || !(e.status === 403 || e.status === 404)) return;   // no answer says nothing
      const n = (rec.leftN || 0) + 1;
      if (age >= LEFT_KEEP_MS && n >= LEFT_LOOKS) { secretCache.delete(rec.id); delete L.g[rec.id]; dirtyL(); await putRec(rec.id, (cur) => (cur ? { ...cur, sealed: null, leftN: n } : undefined)); }
      else await putRec(rec.id, (cur) => (cur ? { ...cur, leftN: n } : undefined));
    }
  }
  /** If this group's relay was my home only because of it, and I'm not on it any more, it stops being my home. */
  async function homeAfter(rec) {
    if (!rec.home) return;
    const d = await readDoc(dataDir, 'groups');
    if (Object.values(d.groups).some(g => g.id !== rec.id && g.origin === rec.origin && (g.status === 'member' || g.status === 'asking'))) return;
    const rs = await listRelays(dataDir);
    if (!rs.some(r => r.origin === rec.origin && r.role === 'member')) return;
    try { await (await clientOf(rec.origin)).me(); }
    catch (e) { if (e && e.status === 403) { await removeRelay(dataDir, rec.origin); caps = null; if (friends) await friends.reload().catch(() => {}); } }
  }
  /** Key renewal (FRIENDS.md section 15): my seat moves to my new key, signed by both, and the group's key then rotates. */
  async function rekeyIfNeeded(rec, identity) {
    if (!rec.ed || rec.ed === identity.ed.pub) return rec;
    const retired = (await retiredIdentities(dataDir)).find(x => x.identity.ed.pub === rec.ed);
    try {
      await (await clientOf(rec.origin, identity)).rg('GET', rec.id, '/feed', { query: 'since=999999999999' });
      return putRec(rec.id, (cur) => (cur ? { ...cur, ed: identity.ed.pub } : undefined));   // another of my computers already moved it
    } catch { /* not yet moved */ }
    if (!retired) return rec;
    const old = retired.identity;
    const body = { key: identity.ed.pub, x: identity.x.pub, sig: await signRekeyText(identity, rec.id, old.ed.pub, identity.ed.pub, identity.x.pub), sigOld: await signRekeyText(old, rec.id, old.ed.pub, identity.ed.pub, identity.x.pub) };
    if (rec.auth && rec.auth.owner.ed === old.ed.pub) {
      // The owner's old key stops counting: whoever it let in now stands on the new key's word.
      body.auth = await signAuth(old, { gid: rec.id, seq: rec.auth.seq + 1, owner: { ed: identity.ed.pub, x: identity.x.pub }, admins: rec.auth.admins, at: now(), prev: rec.auth });
      body.admits = await freshAdmits(rec, await localOf(rec.id), await secretsOf(rec), identity, (r) => admitRoot(r.admit) === old.ed.pub);
    }
    await createRelayClient({ origin: rec.origin, identity: old }).rg('POST', rec.id, '/rekey', { body });
    return putRec(rec.id, (cur) => (cur ? { ...cur, ed: identity.ed.pub } : undefined));
  }

  // ─── What I say and show ──────────────────────────────────────────────
  function post(gid, { ch = 'm', text = '' } = {}) {
    return serial(async () => {
      const rec = await getRec(gid);
      if (!rec || rec.status !== 'member') throw fail('NOT_FOUND', 'That group is not here any more.');
      const identity = await ensureIdentity(dataDir);
      const clean = cleanText(text, TEXT_MAX);
      if (!clean) throw fail('EMPTY', 'Write something first.');
      const send = async () => {
        const sec = await secretsOf(await getRec(gid)), e = latestE(sec);
        if (!sec.keys[e]) throw fail('NO_KEY', 'This computer does not have the group\'s key yet. Try again in a moment.');
        const c = ch === 'a' ? 'a' : 'm';
        const env = await sealEnv({ identity, gid, e, key: sec.keys[e], k: 'post', ch: c, b: { text: clean }, at: now() });
        return (await clientOf(rec.origin, identity)).rg('POST', gid, '/post', { body: { ch: c, env } });
      };
      try { await send(); }
      catch (e) {
        if (e && e.status === 409) { await syncNow(gid).catch(() => {}); await send().catch((x) => { throw relayFail(x); }); }
        else if (e && e.status === 400 && e.code) throw e;
        else throw relayFail(e);
      }
      await syncNow(gid).catch(() => {});
      changed();
      return { ok: true };
    });
  }
  /** What I show in this group: {name, status}. Each group can have its own. */
  function setProfile(gid, f = {}) {
    return serial(async () => {
      const rec = await getRec(gid);
      if (!rec) throw fail('NOT_FOUND', 'That group is not here any more.');
      const identity = await ensureIdentity(dataDir);
      const me = meOf({ ...rec.me, ...(f.name != null ? { name: f.name } : {}), ...(f.status != null ? { status: f.status } : {}) }, await defaultName());
      const out = await putRec(gid, (cur) => (cur ? { ...cur, me, ...(typeof f.autoOk === 'boolean' ? { autoOk: f.autoOk, autoAsked: true } : {}) } : undefined));
      if (rec.status === 'member') { try { await postProfile(out, await localOf(gid), await secretsOf(out), identity); await syncNow(gid).catch(() => {}); } catch (e) { throw relayFail(e); } }
      changed();
      return { ok: true };
    });
  }
  /** The group's name, description, welcome message, logo, and two settings. */
  function setCard(gid, f = {}) {
    return serial(async () => {
      const { rec, identity, sec, g } = await runner(gid);
      const fields = cardFields(f, rec.card);
      if (!fields.name) throw fail('BAD_NAME', 'A group needs a name.');
      const card = await signCard(identity, { gid, ...fields, mode: rec.card.mode, auth: rec.auth, owner: rec.card.owner, j: rec.card.j, at: now() });
      const e = latestE(sec);
      const body = { cardK: await sealFor(await groupAes(sec.keys[e]), card, `card|${gid}`), ...(sec.t ? { cardL: await sealFor((await linkSecrets(gid, sec.t)).seal, card, `card|${gid}`) } : {}), ...(f.posts === 'admins' || f.posts === 'all' ? { posts: f.posts } : {}) };
      try { await (await clientOf(rec.origin, identity)).rg('PUT', gid, '/card', { body }); } catch (x) { throw relayFail(x); }
      // Whoever turns automatic friends on says yes for themselves. Everyone else is asked, on their own screen: it never crosses by itself.
      const out = await putRec(gid, (cur) => (cur ? { ...cur, card, ...(fields.auto !== !!rec.card.auto ? { autoOk: fields.auto, autoAsked: fields.auto } : {}) } : undefined));
      if (f.posts === 'admins' || f.posts === 'all') g.posting = f.posts;
      if (sec.c) await writeCode(out, sec.c, sec, identity).catch(() => {});
      dirtyL();
      changed();
      return { ok: true };
    });
  }
  function addFriend(gid, iid) {
    return serial(async () => {
      const rec = await getRec(gid);
      if (!rec || rec.status !== 'member') throw fail('NOT_FOUND', 'That group is not here any more.');
      if (!friends) throw fail('NO_FRIENDS', 'Friends are not ready yet. Try again in a moment.');
      const g = await localOf(gid), p = g.profiles[iid];
      if (!p || !p.card) throw fail('NOT_YET', "They haven't opened Freeflo since joining, so they can't get a request yet. Try again later.");
      await syncNow(gid).catch(() => {});   // the proof must be under the current key
      const cl = await clientOf(rec.origin), identity = await ensureIdentity(dataDir), sec = await secretsOf(await getRec(gid)), e = latestE(sec);
      if (!sec.keys[e]) throw fail('NO_KEY', "This computer does not have the group's key yet. Try again in a moment.");
      const gp = await friendProof(sec.keys[e], gid, e, identity.ed.pub, identity.x.pub);
      const friend = await friends.addFromGroup({ card: p.card, g: gid, gp, cardName: rec.me && rec.me.name, via: (env) => cl.rg('POST', gid, '/dm', { body: { to: iid, env } }) });
      changed();
      return { friend };
    });
  }

  // ─── Hooks for the friends engine ─────────────────────────────────────
  // These only read: they run inside the friends engine's queue, and a sync here would wait on it.
  const hook = {
    /** A friend request through a group: the asker is on the list, and holds the group's key now. A relay's made-up row cannot do the second. */
    okRequest: async (card, gid, gp) => {
      const rec = await getRec(gid);
      if (!rec || rec.status !== 'member') return false;
      const g = await localOf(gid);
      if (!g.roster.some(r => r.key === card.ed && r.x === card.x)) return false;
      const m = /^(\d{1,9})\.[A-Za-z0-9_-]{43}$/.exec(typeof gp === 'string' ? gp : '');
      if (!m) return false;
      const sec = await secretsOf(rec), e = Number(m[1]);
      if (!sec.keys[e] || e < latestE(sec) - 1) return false;
      const want = await friendProof(sec.keys[e], gid, e, card.ed, card.x);
      let d = want.length ^ gp.length;
      for (let i = 0; i < Math.min(want.length, gp.length); i++) d |= want.charCodeAt(i) ^ gp.charCodeAt(i);
      return d === 0;
    },
    /** Only with this person's own yes, given when they joined knowing, or asked afterwards. An owner turning it on later never says it for them. */
    autoAccept: async (gid) => { const rec = await getRec(gid); return !!(rec && rec.status === 'member' && rec.card && rec.card.auto && rec.autoOk === true); },
    /** The name someone knows me by in this group: all a friend made here learns of me, until I choose otherwise. */
    nameIn: async (gid) => { const rec = await getRec(gid); return (rec && rec.me && rec.me.name) || ''; },
    /** The handshake's next step, inside the group: no address anyone named is ever called for it. */
    via: async (gid, ed, env) => {
      const rec = await getRec(gid);
      if (!rec || rec.status !== 'member') throw fail('NOT_FOUND', 'That group is not here any more.');
      await (await clientOf(rec.origin)).rg('POST', gid, '/dm', { body: { to: await iidOf(ed), env } });
    },
  };

  // ─── Views (no key, link or token: FRIENDS.md rule 1) ─────────────────
  const friendStates = async () => { const m = new Map(); for (const f of Object.values((await readDoc(dataDir, 'friends')).friends)) m.set(f.ed, f); return m; };
  const WARN_N = 100;
  async function summary(rec, identity) {
    const g = await localOf(rec.id);
    const role = identity ? roleIn(rec.auth, identity.ed.pub) : 'member';
    return {
      id: rec.id, status: rec.status, name: rec.card ? rec.card.name : 'Group', about: rec.card ? rec.card.about : '', welcome: rec.card ? rec.card.welcome : '', logo: rec.card ? rec.card.logo : { e: '', c: '' }, auto: !!(rec.card && rec.card.auto),
      ownerName: rec.card ? rec.card.owner.name : '', role, count: g.n || g.roster.length, waiting: role !== 'member' ? g.requests.length : 0, host: relayHostOf(rec.origin), via: rec.via, joinedAt: rec.joinedAt, at: rec.at,
      warn: role !== 'member' && (g.n || g.roster.length) >= ((g.limits && g.limits.warn) || WARN_N),
      maxMembers: (g.limits && g.limits.max) || 500,
    };
  }
  async function list() {
    const identity = await loadIdentity(dataDir);
    const d = await readDoc(dataDir, 'groups');
    const out = [];
    for (const rec of Object.values(d.groups)) out.push(await summary(rec, identity));
    out.sort((a, b) => (b.waiting - a.waiting) || String(a.name).localeCompare(String(b.name)));
    // Never held up by a relay that is slow to answer: what is known now, and the answer is there next time.
    const c = await Promise.race([capabilities().catch(() => null), new Promise((r) => { const t = timers.setTimeout(() => r(caps), 1500); if (t && t.unref) t.unref(); })]);
    return { groups: out, caps: c };
  }
  async function detail(gid) {
    const rec = await getRec(gid);
    if (!rec) throw fail('NOT_FOUND', 'That group is not here any more.');
    const identity = await loadIdentity(dataDir);
    const g = await localOf(gid);
    const base = await summary(rec, identity);
    const fr = await friendStates();
    const removing = new Set(L.jobs.filter(j => j.t === 'remove' && j.gid === gid).map(j => j.iid));
    const members = [];
    const byKey = new Map();
    for (const r of g.roster) {
      const p = g.profiles[r.iid] || null;
      const f = fr.get(r.key) || null;
      const m = { iid: r.iid, checked: r.ok !== false, name: (p && p.name) || 'Someone new', status: (p && p.status) || '', emoji: (p && p.emoji) || '', color: (p && p.color) || '', avatar: (p && p.avatar) || null, role: roleIn(rec.auth, r.key), fp: await fingerprintOf(r.key), me: !!identity && r.key === identity.ed.pub, friend: f ? f.status : null, friendId: await friendIdOf(r.x, r.key), canAdd: !!(p && p.card), at: r.at, removing: removing.has(r.iid), leaving: removing.has(r.iid) && L.jobs.find(j => j.t === 'remove' && j.gid === gid && j.iid === r.iid).next };
      members.push(m);
      byKey.set(r.key, m);
    }
    members.sort((a, b) => ({ owner: 0, admin: 1, member: 2 }[a.role] - { owner: 0, admin: 1, member: 2 }[b.role]) || a.name.localeCompare(b.name));
    return {
      group: { ...base, mode: openLink(rec) ? 'open' : 'approve', posting: g.posting, epoch: g.epoch, due: g.due, code: g.code, link: g.link, used: g.used, autoOk: rec.autoOk === true, autoAsked: rec.autoAsked === true, linkNote: base.role !== 'member' ? (g.linkNote || null) : null, lastSync: g.lastSync, me: rec.me },
      members: members.filter(m => !m.removing),
      posts: g.posts.slice().reverse().slice(0, 100).map(p => { const m = byKey.get(p.from); return { id: p.id, ch: p.ch, at: p.at, text: p.text, from: m ? m.name : 'Someone who left', mine: !!identity && p.from === identity.ed.pub }; }),
      requests: base.role !== 'member' ? g.requests.map(q => ({ iid: q.iid, name: q.name, status: q.status || '', avatar: q.avatar || null, at: q.at, via: q.via, ok: q.ok, fp: q.fp })) : [],
      blocks: base.role !== 'member' ? g.blocks : [],
      myFp: identity ? await fingerprintOf(identity.ed.pub) : [],
    };
  }

  // ─── Live push and the background pass ────────────────────────────────
  function syncSoon(gid, ms) {
    if (syncT.has(gid)) return;
    const h = timers.setTimeout(() => { syncT.delete(gid); serial(() => syncNow(gid)).catch((e) => log('info', `groups: no news yet (${e && (e.relayError || e.code)})`)); }, ms);
    if (h && h.unref) h.unref();
    syncT.set(gid, h);
  }
  async function listenTo(gid, origin) {
    if (sockets.has(gid) || stopping) return;
    let cl;
    try { cl = await clientOf(origin); } catch { return; }
    // A large group must not all ask at the same moment: a little waiting, spread out.
    const stop = cl.listenGroup(gid, {
      // A socket that closes may mean I was removed: the next look says.
      onState: (s) => { states.set(gid, s); syncSoon(gid, s === 'live' ? 500 : Math.floor(Math.random() * 8000) + 2000); },
      onMsg: (m) => { if (m && m.t === 'chg') syncSoon(gid, Math.floor(Math.random() * 8000) + 200); },
    });
    if (stop) sockets.set(gid, stop);
  }
  function stopListening(gid) { const s = sockets.get(gid); if (s) { try { s(); } catch { /* closed */ } sockets.delete(gid); states.delete(gid); } const t = syncT.get(gid); if (t) { timers.clearTimeout(t); syncT.delete(gid); } }
  async function onTick() {
    if (stopping) return;
    try {
      const identity = await loadIdentity(dataDir);
      if (!identity) return;
      await loadL();
      const d = await readDoc(dataDir, 'groups');
      for (let rec of Object.values(d.groups)) {
        if (rec.status === 'asking') {
          const age = now() - (rec.asked || rec.at || 0), every = age < 10 * MIN ? 14000 : age < DAY ? 5 * MIN : 30 * MIN;   // someone may be pressing Let in right now
          const g = await localOf(rec.id);
          if (now() - (g.lastAsk || 0) >= every) { g.lastAsk = now(); await serial(() => pollAsking(rec, identity)).catch((e) => log('warn', `groups: could not look at a request (${e && (e.relayError || e.code || e.message)})`)); }
          continue;
        }
        if ((rec.status === 'gone' || rec.status === 'removed') && rec.sealed) { await serial(() => lookAgain(rec, identity)).catch(() => {}); continue; }
        if (rec.status !== 'member') continue;
        try { rec = await serial(() => rekeyIfNeeded(rec, identity)); } catch (e) { log('info', `groups: my seat has not moved to my new keys yet (${e && (e.relayError || e.code)})`); }
        listenTo(rec.id, rec.origin);
        const g = await localOf(rec.id);
        const live = states.get(rec.id) === 'live';
        if (now() - (g.lastSync || 0) >= (live ? SYNC_LIVE_MS : SYNC_IDLE_MS) || (g.due && runsGroup(rec.auth, identity.ed.pub))) await serial(() => syncNow(rec.id)).catch((e) => log('info', `groups: no news yet (${e && (e.relayError || e.code)})`));
      }
      await serial(runJobs);
      await saveL();
    } catch (e) { log('warn', `groups: background pass stopped early (${e && (e.code || e.message)})`); }
  }
  async function start() {
    if (started) return;
    started = true;
    if (friends && typeof friends.setGroupHook === 'function') friends.setGroupHook(hook);
    await loadL();
    tick = timers.setInterval(() => { onTick(); }, 15000);
    if (tick && tick.unref) tick.unref();
    const first = timers.setTimeout(() => { onTick(); }, 2500);
    if (first && first.unref) first.unref();
  }
  async function stop() {
    stopping = true;
    if (tick) timers.clearInterval(tick);
    for (const gid of [...sockets.keys()]) stopListening(gid);
    dirty = true;
    await saveL().catch(() => {});
  }
  async function reload() { secretCache.clear(); caps = null; onTick(); changed(); }
  /** Ask the relay now. */
  async function check(gid) {
    if (gid) await serial(() => syncNow(gid)).catch((e) => { throw relayFail(e); });
    else {
      await onTick();
      for (const rec of Object.values((await readDoc(dataDir, 'groups')).groups)) if (rec.status === 'member') await serial(() => syncNow(rec.id)).catch(() => {});
    }
    return { ok: true };
  }

  return {
    start, stop, reload, list, detail, capabilities, create, share, resetLink, setJoin, setCode, preview, join, cancelJoin, approve, decline, remove, undoRemove, unblock, setRole, transfer, leave, deleteGroup,
    post, setProfile, setCard, addFriend, check, hook,
    /** "Keep this link": the note about someone who still knows it goes away. */
    keepLink: (gid) => serial(async () => { const g = await localOf(gid); g.linkNote = null; dirtyL(); changed(); return { ok: true }; }),
    /** For tests of its own behaviour only: force the rotation that is due, now. */
    rotateDue: (gid) => serial(async () => { await syncNow(gid); return rotateNow(gid); }),
    /** Forget a group I already left or was declined from. */
    forget: (gid) => serial(async () => { await forgetRec(gid); changed(); return { ok: true }; }),
  };
}
