/* ============================================================
   PERSON CARD LOGIC (pure; owner: People). No DOM, no page globals:
   everything comes in as arguments, so tests (tests/people-card.test.mjs)
   and the server agree with the page. The page side is 54-people-card.js.

     pcOpenMode({mode, session, setting})  where a person opens: 'card' | 'panel'.
                                           An explicit mode wins, then this
                                           session's switch, then Settings > Tasks.
     PC_COVERS                             the built-in covers: [{id, label, css}]
                                           (ids match lib/people-images.mjs COVER_PRESETS)
     pcCoverLook(ref)                      'preset:<id>' | 'file:<name>' | '' ->
                                           {kind:'preset'|'file'|'default', id?, css?, url?}
     pcPhotoUrl(ref)                       'file:<name>' -> '/api/people/image/<name>';
                                           'gravatar:<sha256>' -> the gravatar.com URL; else ''
     pcRefKind(ref)                        'file' | 'gravatar' | 'preset' | ''
     PC_IMG_NAME_RE                        a stored picture's file name (the server's rule)
     pcMailCandidates(messages, people, o) senders and recipients of recent email who are
                                           not in People: [{email, name, count, last, threadIds,
                                           match, person}] (match = a person of the same name without
                                           this address: offer to add the address to them;
                                           person = the name reads like a person's). Bulk hosts
                                           (newsletters., mail., careers. ...) are left out.
     pcIsBulkAddress(email), pcLooksLikeName(name)
     pcNameFromAddress(email)              'sam.lee@x' -> 'Sam Lee' (when the email gives no name)
     pcAssignPairs(taskIds, personIds, linkedOf)
                                           [{taskId, personId}] still to link (linkedOf(taskId)
                                           -> ids already linked); task order, then people order
     pcFold(s)                             lower case, accents stripped
   ============================================================ */

function pcOpenMode(o) {
  o = o || {};
  if (o.mode === 'card' || o.mode === 'panel') return o.mode;
  if (o.session === 'card' || o.session === 'panel') return o.session;
  return o.setting === 'panel' ? 'panel' : 'card';
}

/* ---------- pictures ---------- */
const PC_IMG_NAME_RE = /^[a-z0-9][a-z0-9-]{0,59}-(avatar|cover)-[0-9a-f]{16}\.(png|jpg|webp|gif)$/;
const PC_GRAVATAR_RE = /^[0-9a-f]{64}$/;
// Generated covers: gradients and patterns, no image files. The css strings are
// constants (never user text), applied as a background.
const PC_COVERS = Object.freeze([
  { id: 'aurora', label: 'Aurora', css: 'radial-gradient(120% 140% at 10% 0%, #7c5cff 0%, transparent 55%), radial-gradient(90% 120% at 100% 100%, #12a594 0%, transparent 60%), linear-gradient(135deg, #1f1b4d, #0e3b47)' },
  { id: 'dawn', label: 'Dawn', css: 'linear-gradient(135deg, #ffb38a 0%, #f76b8a 45%, #8e4ec6 100%)' },
  { id: 'meadow', label: 'Meadow', css: 'radial-gradient(100% 120% at 0% 100%, #c5f08a 0%, transparent 60%), linear-gradient(160deg, #3f9f52, #12a594)' },
  { id: 'ocean', label: 'Ocean', css: 'radial-gradient(120% 120% at 100% 0%, #7cd4fd 0%, transparent 55%), linear-gradient(200deg, #0b84e8, #1e3a8a)' },
  { id: 'ember', label: 'Ember', css: 'radial-gradient(110% 130% at 90% 10%, #ffd166 0%, transparent 50%), linear-gradient(135deg, #e5484d, #7a1f2b)' },
  { id: 'dusk', label: 'Dusk', css: 'linear-gradient(180deg, #2b2d6e 0%, #6b3fa0 55%, #f0a000 130%)' },
  { id: 'slate', label: 'Slate', css: 'linear-gradient(135deg, #475569, #1e293b)' },
  { id: 'sand', label: 'Sand', css: 'linear-gradient(135deg, #f5e6c8, #d9b88f)' },
  { id: 'grid', label: 'Grid', css: 'linear-gradient(rgba(255,255,255,.14) 1px, transparent 1px) 0 0 / 22px 22px, linear-gradient(90deg, rgba(255,255,255,.14) 1px, transparent 1px) 0 0 / 22px 22px, linear-gradient(135deg, #5b5bd6, #0b84e8)' },
  { id: 'dots', label: 'Dots', css: 'radial-gradient(rgba(255,255,255,.28) 1.5px, transparent 1.6px) 0 0 / 16px 16px, linear-gradient(135deg, #d6409f, #8e4ec6)' },
  { id: 'stripes', label: 'Stripes', css: 'repeating-linear-gradient(135deg, rgba(255,255,255,.10) 0 12px, transparent 12px 24px), linear-gradient(135deg, #12a594, #3f9f52)' },
  { id: 'night', label: 'Night', css: 'radial-gradient(1px 1px at 20% 30%, #fff, transparent), radial-gradient(1px 1px at 70% 60%, #fff, transparent), radial-gradient(1.5px 1.5px at 40% 80%, #fff, transparent), radial-gradient(1px 1px at 85% 20%, #fff, transparent), linear-gradient(180deg, #0f172a, #312e81)' },
]);
function pcRefKind(ref) {
  const s = String(ref || '');
  if (/^file:/.test(s)) return PC_IMG_NAME_RE.test(s.slice(5)) ? 'file' : '';
  if (/^gravatar:/.test(s)) return PC_GRAVATAR_RE.test(s.slice(9)) ? 'gravatar' : '';
  if (/^preset:/.test(s)) return PC_COVERS.some(c => c.id === s.slice(7)) ? 'preset' : '';
  return '';
}
function pcPhotoUrl(ref) {
  const k = pcRefKind(ref), s = String(ref || '');
  if (k === 'file' && /-avatar-/.test(s)) return '/api/people/image/' + s.slice(5);
  // d=404: no picture there -> the image fails and the initials show instead.
  if (k === 'gravatar') return 'https://gravatar.com/avatar/' + s.slice(9) + '?s=256&d=404';
  return '';
}
function pcCoverLook(ref) {
  const k = pcRefKind(ref), s = String(ref || '');
  if (k === 'preset') { const c = PC_COVERS.find(x => x.id === s.slice(7)); return { kind: 'preset', id: c.id, css: c.css }; }
  if (k === 'file' && /-cover-/.test(s)) return { kind: 'file', url: '/api/people/image/' + s.slice(5) };
  return { kind: 'default' };
}

/* ---------- people in email ---------- */
function pcFold(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
// Bulk-mail hosts: a sub-domain such as newsletters., mail., careers. or marketing. in front of the
// organisation's own domain (people write from the organisation's domain itself).
const PC_BULK_HOST_RE = /(^|\.)(newsletters?|news|mail|mailer|mailing|email|e|em|marketing|mktg|bounces?|notifications?|notify|alerts?|careers?|jobs|info|updates?|campaigns?|enterprise|comms|list|lists|digest)\.[^.]+\.[^.]+/;
function pcIsBulkAddress(email) { const at = String(email || '').lastIndexOf('@'); return at > 0 && PC_BULK_HOST_RE.test(String(email).slice(at + 1).toLowerCase()); }
/** A display name that reads like a person: two or more words of letters ("Sam Lee", not "ft" or "Careers"). */
function pcLooksLikeName(name) { return String(name || '').trim().split(/\s+/).filter(w => /^\p{L}[\p{L}'.-]*$/u.test(w)).length >= 2; }
const PC_EMAIL_RE = /^[^\s@<>"',;:()]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$/;
/** "Lee, Sam" -> "Sam Lee"; quotes and an address used as a name are dropped. */
function _pcCleanName(name, email) {
  let n = String(name || '').replace(/["']/g, '').trim();
  if (!n || /@/.test(n)) return '';
  if (/^[^,]+,\s*[^,]+$/.test(n)) n = n.split(',').map(x => x.trim()).reverse().join(' ');
  return n.slice(0, 100);
}
/** "sam.lee@x" / "sam_lee@x" -> "Sam Lee"; anything else (one word, digits, initials) -> ''. */
function pcNameFromAddress(email) {
  const local = String(email || '').split('@')[0].toLowerCase();
  const m = /^(\p{L}{2,})[._](\p{L}{2,})$/u.exec(local);
  return m ? [m[1], m[2]].map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
}
/**
 * messages: inbox threads ({id, from:{name,email}, to?:[{name,email}], cc?:[...], date}).
 * people: state.people. o: {myEmails, ignore (addresses), automated(email) -> bool, limit}
 */
function pcMailCandidates(messages, people, o) {
  o = o || {};
  const known = new Set();
  const byName = new Map();
  for (const p of Array.isArray(people) ? people : []) {
    if (!p) continue;
    for (const e of [...(Array.isArray(p.emails) ? p.emails : []), p.email]) if (e) known.add(String(e).trim().toLowerCase());
    if (p.self) continue;
    for (const n of [p.name, ...(Array.isArray(p.aliases) ? p.aliases : [])]) {
      const f = pcFold(n);
      if (f.length < 3) continue;
      if (byName.has(f) && byName.get(f) !== p.id) byName.set(f, null); else byName.set(f, p.id);
    }
  }
  const mine = new Set((o.myEmails || []).map(e => String(e).toLowerCase()));
  const ignore = new Set((o.ignore || []).map(e => String(e).toLowerCase()));
  const found = new Map();
  const note = (addr, m) => {
    const email = String((addr && addr.email) || '').trim().toLowerCase();
    if (!email || !PC_EMAIL_RE.test(email) || known.has(email) || mine.has(email) || ignore.has(email)) return;
    if ((typeof o.automated === 'function' && o.automated(email)) || pcIsBulkAddress(email)) return;
    let r = found.get(email);
    if (!r) { r = { email, names: new Map(), count: 0, last: '', threadIds: [] }; found.set(email, r); }
    const nm = _pcCleanName(addr.name, email);
    if (nm) r.names.set(nm, (r.names.get(nm) || 0) + 1);
    if (m.id && !r.threadIds.includes(m.id)) { r.count++; if (r.threadIds.length < 5) r.threadIds.push(m.id); }
    const d = String(m.date || '');
    if (d > r.last) r.last = d;
  };
  for (const m of Array.isArray(messages) ? messages : []) {
    if (!m) continue;
    note(m.from, m);
    for (const k of ['to', 'cc']) for (const a of Array.isArray(m[k]) ? m[k] : []) note(a, m);
  }
  const out = [];
  for (const r of found.values()) {
    const name = [...r.names.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    // Many snapshots carry the address only: "sam.lee@..." still reads as "Sam Lee".
    const nm = name ? name[0] : pcNameFromAddress(r.email);
    const match = nm ? byName.get(pcFold(nm)) || null : null;
    out.push({ email: r.email, name: nm, count: r.count, last: r.last, threadIds: r.threadIds, match, person: pcLooksLikeName(nm) });
  }
  // People first (a two-word name), then the most threads, then the newest.
  out.sort((a, b) => (b.person - a.person) || b.count - a.count || (b.last > a.last ? 1 : b.last < a.last ? -1 : 0) || a.email.localeCompare(b.email));
  return o.limit ? out.slice(0, o.limit) : out;
}

/* ---------- assigning people to tasks ---------- */
function pcAssignPairs(taskIds, personIds, linkedOf) {
  const out = [];
  const people = [...new Set((personIds || []).filter(Boolean))];
  for (const tid of [...new Set((taskIds || []).filter(Boolean))]) {
    const have = new Set((typeof linkedOf === 'function' ? linkedOf(tid) : null) || []);
    for (const pid of people) if (!have.has(pid)) out.push({ taskId: tid, personId: pid });
  }
  return out;
}
