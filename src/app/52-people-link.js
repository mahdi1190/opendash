/* ============================================================
   PEOPLE LINKING - pure functions (no DOM, no globals, no I/O).
   Owner: People.

   ONE source for the page AND Node: lib/people-tags.mjs loads this file
   (together with 27-tags-logic.js) so the actions layer, the MCP server and
   the migrations link people exactly the way the page does. Keep it pure:
   never touch `state`, `document`, `window` or APP_CONFIG here; take what you
   need as arguments. Every name starts with ppl / PPL_.

   How a task is linked to a person (pplLinked):
     1. task.people (explicit ids), minus task.peopleExcluded;
     2. a tag that names someone: their id, an alias, first name, surname or
        "first-last", optionally wrapped as blocked-/waiting-/with-/for-/re-/
        from-/ask-/email-/call-... and -asked/-cleared/-request/-reply...
        (never the user's own record, never an ambiguous name).
   Mentions in text (pplMentions) are only ever SUGGESTIONS (pplSuggest) or,
   when the user switched it on, links made as a task is created (pplAutoLink,
   title and subtasks only). Matching is whole-word, accent-folded and
   case-aware ("Sam" links, "sam" in a Title-cased sentence does not),
   possessives count ("Sam's"), names shorter than 3 letters and generic
   role words never match, a name shared by two people never matches, and
   "<name> group|lab|team" (a meeting series) is skipped.
   ============================================================ */

// Alias words that mean something else in a sentence: they never match free
// text (they still resolve tags).
const PPL_GENERIC_WORDS = new Set([
  'i', 'me', 'my', 'myself', 'you', 'we', 'us', 'our', 'self',
  'supervisor', 'supervisors', 'cosupervisor', 'co-supervisor', 'examiner', 'examiners', 'manager', 'boss', 'client', 'clients',
  'team', 'group', 'lab', 'admin', 'support', 'summary', 'forms', 'form', 'office', 'pgr', 'phd', 'student', 'candidate',
  'colleague', 'collaborator', 'partner', 'contact', 'person', 'people', 'the', 'and', 'for', 'with', 'all', 'everyone',
]);
// Names that are also everyday words: not matched at the start of a sentence
// ("Mark the draft done", "Will check").
const PPL_START_WORDS = new Set([
  'mark', 'will', 'bill', 'grant', 'may', 'chase', 'frank', 'rose', 'pat', 'sue', 'art', 'rich', 'page', 'hunter',
  'june', 'april', 'august', 'max', 'joy', 'hope', 'dawn', 'summer', 'rob', 'drew', 'ray', 'jack', 'faith', 'gene',
  'guy', 'nick', 'sky', 'jay', 'miles', 'jean', 'don', 'ben', 'bob', 'victor', 'harry', 'penny', 'carol', 'holly',
]);
const PPL_HONORIFICS = new Set(['dr', 'prof', 'professor', 'mr', 'mrs', 'ms', 'miss', 'mx', 'sir', 'dame']);
const PPL_TAG_PREFIX = /^(?:blocked|waiting-on|waiting|wait|with|for|re|from|ask|asked|email|meet|call|chase|ping|cc|via|to)-(?=[^-])/;
const PPL_TAG_SUFFIX = /-(?:asked|cleared|request|requests|reply|replied|followup|follow-up|meeting|mtg|call|email|review|comments|feedback)$/;
const PPL_MIN_LEN = 3;

/** Lower-case and strip accents WITHOUT changing the length (indices stay valid). */
function pplFold(s) {
  const str = String(s == null ? '' : s);
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    const code = c.charCodeAt(0);
    if (code < 128) { out += c.toLowerCase(); continue; }
    if (code >= 0xD800 && code <= 0xDFFF) { out += c; continue; }
    if (c === '’' || c === '‘' || c === 'ʼ' || c === '′') { out += "'"; continue; }
    const base = c.normalize('NFD').charAt(0).toLowerCase().charAt(0);
    out += base || c;
  }
  return out;
}
function pplEscRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function pplIsSelf(p) { return !!(p && (p.self || p.isSelf)); }
function pplKind(p) { const k = p && p.kind; return k === 'org' || k === 'mailbox' ? k : 'person'; }

/** Every address a person has (emails[] plus the legacy single email), lower-case, unique. */
function pplPersonEmails(p) {
  const out = [];
  const add = (e) => { const v = String(e || '').trim().toLowerCase(); if (v && /@/.test(v) && !out.includes(v)) out.push(v); };
  if (p) { for (const e of Array.isArray(p.emails) ? p.emails : []) add(e); add(p.email); }
  return out;
}

// Shared/role mailboxes (dept-support@, weekly-summary@, noreply@ ...).
const PPL_MAILBOX_RE = /(^|[._-])(support|summary|noreply|no-reply|donotreply|info|admin|office|enquiries|enquiry|helpdesk|help|team|hello|contact|reception|accounts|billing|hr|careers|jobs|news|newsletter|notifications?|alerts?|mailer|postmaster)([._-]|$)/;
function pplLooksLikeMailbox(p) {
  const emails = pplPersonEmails(p);
  if (!emails.length) return false;
  return emails.every(e => PPL_MAILBOX_RE.test(e.split('@')[0]));
}

/**
 * The current person shape. Fills emails[] (keeps `email` = the first one for
 * older readers), kind, aliases (lower-case, unique), streams[] and notes[].
 * Returns a NEW object; unknown fields are kept.
 */
function pplNormalizePerson(p) {
  const o = Object.assign({}, p);
  o.name = String(o.name || '').trim() || String(o.id || 'Unnamed');
  const emails = pplPersonEmails(p);
  o.emails = emails;
  o.email = emails[0] || '';
  o.kind = p && (p.kind === 'org' || p.kind === 'mailbox' || p.kind === 'person') ? p.kind : (pplLooksLikeMailbox(p) ? 'mailbox' : 'person');
  const al = [];
  for (const a of Array.isArray(o.aliases) ? o.aliases : []) { const v = String(a || '').trim().toLowerCase(); if (v && !al.includes(v)) al.push(v); }
  o.aliases = al;
  o.streams = Array.isArray(o.streams) ? o.streams.filter(s => typeof s === 'string' && s) : [];
  if (!Array.isArray(o.notes)) delete o.notes;
  if (o.isSelf && !o.self) o.self = true;
  delete o.isSelf;
  return o;
}

/** Name words without honorifics or a "(qualifier)". */
function pplNameParts(name) {
  const clean = String(name || '').replace(/\([^)]*\)/g, ' ').replace(/[^\p{L}\p{N}'’ .-]/gu, ' ').trim();
  return clean.split(/\s+/).filter(w => w && !PPL_HONORIFICS.has(pplFold(w).replace(/\.$/, '')));
}

/** The words that identify a person: {text:[...], tag:[...]}, folded. */
function pplTerms(p) {
  const text = new Set(), tag = new Set();
  const ok = (f) => f.length >= PPL_MIN_LEN && !PPL_GENERIC_WORDS.has(f);
  const add = (t, forText) => {
    const f = pplFold(t).trim().replace(/\s+/g, ' ').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    if (!ok(f)) return;
    tag.add(f.replace(/[\s_.]+/g, '-'));
    if (forText !== false) text.add(f);
  };
  if (!p) return { text: [], tag: [] };
  const kind = pplKind(p);
  const qualified = /\(/.test(String(p.name || ''));
  const parts = pplNameParts(p.name);
  if (kind !== 'mailbox' && parts.length) {
    if (parts.length >= 2) add(parts.join(' '));
    if (!qualified) {
      add(parts[0]);
      if (parts.length >= 2) add(parts[parts.length - 1]);
    } else if (parts.length === 1) add(parts[0], false);   // "Quinn (lab)": tags only, never free text
  }
  if (kind === 'mailbox' || kind === 'org') { if (parts.length === 1) add(parts[0]); }
  for (const a of Array.isArray(p.aliases) ? p.aliases : []) add(a);
  const id = String(p.id || '');
  if (/^[a-z][a-z-]*[a-z]$/.test(id) && !/^p-/.test(id)) add(id.replace(/-/g, ' '));
  for (const e of pplPersonEmails(p)) { const local = e.split('@')[0]; if (local.length >= 4) add(local); }
  return { text: [...text], tag: [...tag] };
}

/**
 * Index for matching. Build once per render / request:
 *   {byId, self:Set, text:Map term->Set(ids), tag:Map term->Set(ids), email:Map addr->id|null, re}
 */
function pplBuildIndex(people) {
  const list = Array.isArray(people) ? people.filter(p => p && typeof p.id === 'string' && p.id) : [];
  const byId = new Map(), self = new Set(), text = new Map(), tag = new Map(), email = new Map();
  const put = (m, k, id) => { let s = m.get(k); if (!s) { s = new Set(); m.set(k, s); } s.add(id); };
  for (const p of list) {
    byId.set(p.id, p);
    if (pplIsSelf(p)) { self.add(p.id); continue; }
    const t = pplTerms(p);
    for (const x of t.text) put(text, x, p.id);
    for (const x of t.tag) put(tag, x, p.id);
    put(tag, pplFold(p.id), p.id);
    for (const e of pplPersonEmails(p)) email.set(e, email.has(e) && email.get(e) !== p.id ? null : p.id);
  }
  const terms = [...text.keys()].filter(k => text.get(k).size === 1).sort((a, b) => b.length - a.length || (a < b ? -1 : 1));
  const re = terms.length ? new RegExp('(?<![\\p{L}\\p{N}_])(' + terms.map(pplEscRe).join('|') + ')(?![\\p{L}\\p{N}_])', 'gu') : null;
  return { byId, self, text, tag, email, re };
}

/** The person a tag names (id), or null. Unambiguous, never the user. */
function pplTagPerson(tag, idx) {
  if (!idx) return null;
  const raw = pplFold(String(tag || '').replace(/^#+/, '')).trim();
  if (!raw) return null;
  const tries = [raw];
  const noPre = raw.replace(PPL_TAG_PREFIX, '');
  const noSuf = raw.replace(PPL_TAG_SUFFIX, '');
  tries.push(noPre, noSuf, noPre.replace(PPL_TAG_SUFFIX, ''));
  for (const t of tries) {
    if (!t || t.length < PPL_MIN_LEN) continue;
    if (idx.byId.has(t) && !idx.self.has(t)) return t;
    const ids = idx.tag.get(t);
    if (ids && ids.size === 1) { const id = [...ids][0]; if (!idx.self.has(id)) return id; }
  }
  return null;
}
/** Is this tag a "waiting on someone" marker (blocked-x, waiting-x, waiting)? */
function pplTagIsWaiting(tag) {
  const t = pplFold(tag);
  return /^(blocked|waiting|wait|blocker)(-|$)/.test(t) && !/-cleared$/.test(t);
}

/** People linked to a task: explicit ids + tag inference - exclusions. */
function pplLinked(state, task, idx) {
  if (!task) return [];
  idx = idx || pplBuildIndex(state && state.people);
  const excluded = new Set(Array.isArray(task.peopleExcluded) ? task.peopleExcluded : []);
  const out = [];
  for (const id of Array.isArray(task.people) ? task.people : []) {
    if (typeof id === 'string' && id && !excluded.has(id) && !out.includes(id)) out.push(id);
  }
  for (const tag of Array.isArray(task.tags) ? task.tags : []) {
    const id = pplTagPerson(tag, idx);
    if (id && !excluded.has(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

/** Whole-word, case-aware mentions of people in a piece of text: [{pid, term, index}]. */
function pplMentions(text, idx) {
  const out = [];
  if (!idx || !idx.re || text == null || text === '') return out;
  const src = String(text);
  const f = pplFold(src);
  const anyUpper = /\p{Lu}/u.test(src);
  idx.re.lastIndex = 0;
  let m;
  while ((m = idx.re.exec(f))) {
    const term = m[1], at = m.index, end = at + term.length;
    const ids = idx.text.get(term);
    if (!ids || ids.size !== 1) continue;
    const orig = src.slice(at, end);
    const loose = /[\d@._]/.test(term);
    if (!loose && anyUpper && !/^\p{Lu}/u.test(orig)) continue;
    if (/^(?:['’]s)?\s+(?:group|lab|team)(?![\p{L}])/iu.test(src.slice(end, end + 24))) continue;
    if (PPL_START_WORDS.has(term)) {
      const before = src.slice(0, at).replace(/\s+$/, '');
      if (!before || /[.!?:;\-–—•*(]$/.test(before)) continue;
    }
    out.push({ pid: [...ids][0], term, index: at });
  }
  return out;
}

/**
 * Link suggestions: people mentioned in a task they are not linked to.
 * opts: {index, includeDone, details (default true), taskIds}
 * -> [{taskId, personId, where:'title'|'subtask'|'detail', strength:'strong'|'weak', term, open}]
 */
function pplSuggest(state, opts) {
  opts = opts || {};
  const out = [];
  if (!state) return out;
  const idx = opts.index || pplBuildIndex(state.people);
  if (!idx.re) return out;
  const st = state.statuses || {}, del = state.deleted || {};
  const only = opts.taskIds ? new Set(opts.taskIds) : null;
  for (const t of Array.isArray(state.custom) ? state.custom : []) {
    if (!t || !t.id || del[t.id]) continue;
    const open = st[t.id] !== 'done';
    if (!open && !opts.includeDone) continue;
    if (only && !only.has(t.id)) continue;
    const linked = new Set(pplLinked(state, t, idx));
    const excluded = new Set(Array.isArray(t.peopleExcluded) ? t.peopleExcluded : []);
    const seen = new Map();
    const scan = (text, where) => { for (const x of pplMentions(text, idx)) if (!seen.has(x.pid)) seen.set(x.pid, { where, term: x.term }); };
    scan(t.title, 'title');
    for (const s of Array.isArray(t.subtasks) ? t.subtasks : []) scan(s && s.title, 'subtask');
    if (opts.details !== false) scan(t.detail, 'detail');
    for (const [pid, w] of seen) {
      if (linked.has(pid) || excluded.has(pid) || idx.self.has(pid)) continue;
      out.push({ taskId: t.id, personId: pid, where: w.where, term: w.term, strength: w.where === 'detail' ? 'weak' : 'strong', open });
    }
  }
  return out;
}

/** Link the people a task's title/subtasks name (the auto-link-on-create rule). Mutates task; returns the ids added. */
function pplAutoLink(state, task, idx) {
  if (!task) return [];
  idx = idx || pplBuildIndex(state && state.people);
  const linked = new Set(pplLinked(state, task, idx));
  const excluded = new Set(Array.isArray(task.peopleExcluded) ? task.peopleExcluded : []);
  const add = [];
  const scan = (text) => { for (const x of pplMentions(text, idx)) if (!linked.has(x.pid) && !excluded.has(x.pid) && !add.includes(x.pid)) add.push(x.pid); };
  scan(task.title);
  for (const s of Array.isArray(task.subtasks) ? task.subtasks : []) scan(s && s.title);
  if (add.length) task.people = [...(Array.isArray(task.people) ? task.people : []), ...add];
  return add;
}

/** Ids tasks point at that have no person record: Map id -> {open, total, taskIds}. */
function pplOrphans(state) {
  const known = new Set((Array.isArray(state && state.people) ? state.people : []).map(p => p && p.id));
  const st = (state && state.statuses) || {}, del = (state && state.deleted) || {};
  const out = new Map();
  for (const t of Array.isArray(state && state.custom) ? state.custom : []) {
    if (!t || del[t.id]) continue;
    for (const id of Array.isArray(t.people) ? t.people : []) {
      if (typeof id !== 'string' || !id || known.has(id)) continue;
      const r = out.get(id) || { open: 0, total: 0, taskIds: [] };
      r.total++; if (st[t.id] !== 'done') r.open++; r.taskIds.push(t.id);
      out.set(id, r);
    }
  }
  return out;
}

/** Does a task wait on someone (vs. something I owe them)? */
function pplIsWaiting(task) {
  if (!task) return false;
  if ((Array.isArray(task.tags) ? task.tags : []).some(pplTagIsWaiting)) return true;
  return /^\s*(wait(ing)?\s+(for|on)|await(ing)?|chase|nudge|follow[\s-]?up\s+(with|on)|blocked\s+(by|on))\b/i.test(String(task.title || ''));
}

/** People in a calendar event: attendee/organiser addresses, then names in the title. */
function pplEventPeople(ev, idx) {
  const out = [];
  if (!ev || !idx) return out;
  const add = (id) => { if (id && !idx.self.has(id) && !out.includes(id)) out.push(id); };
  const addr = (a) => { const e = String((a && typeof a === 'object' ? a.email : a) || '').trim().toLowerCase(); if (e) add(idx.email.get(e) || null); };
  addr(ev.organizer);
  for (const a of Array.isArray(ev.attendees) ? ev.attendees : []) addr(a);
  for (const x of pplMentions(ev.summary || ev.title || '', idx)) add(x.pid);
  return out;
}

// Words that start a task or name a thing, never a person.
const PPL_STOP = new Set(('a an and the or but for with to from in on at by of off re if when after before about into over under via per vs versus this that these those my our your his her their its it is be are was not no yes all any each every some new next last first second third final weekly daily monthly yearly today tomorrow tonight yesterday week weeks day days month months year years morning afternoon evening '
  + 'mon tue tues wed thu thur thurs fri sat sun monday tuesday wednesday thursday friday saturday sunday jan feb mar apr jun jul aug sep sept oct nov dec january february march april may june july august september october november december '
  + 'email emails send sent draft write review book ask call check read prepare finish submit update plan set get make follow reply chase meet fix add build run start tell confirm share decide agree sort pay apply register buy order look find clean move test try learn watch listen think note log track schedule organise organize arrange respond contact ping message post upload download print sign fill complete close open create design discuss present prep wrap merge push pull rerun refresh rework revise resubmit list go do see sync deploy finalise finalize collect gather compile summarise summarize outline sketch block hold keep stop pause cancel bring take give put tidy request request remind thank invite introduce intro catch '
  + 'chapter chapters paper papers thesis section sections figure figures table tables appendix data model models code deck slides slide notes note report reports meeting meetings phase tier stage milestone part version drafts doc docs proposal abstract poster talk seminar workshop conference journal editor reviewer reviewers response letter cover form forms '
  + 'phd msc bsc cv uk eu us usa nhs ai ml api sdk mcp pdf ppt excel word python github git notion slack teams zoom outlook gmail google microsoft linkedin whatsapp overleaf latex zotero calendar inbox deadline deadlines viva corrections correction submission minor major internal external initial annual lit literature grant grants funding budget invoice invoices tax bank pension salary contract offer job jobs interview application applications '
  + 'university school department dept faculty college institute centre center lab group team company ltd limited inc plc project projects client clients customer customers partner partners board committee council office home house flat car train flight hotel trip holiday dentist doctor gp gym run walk '
  + 'manager supervisor examiner app apps tool tools fig figs eq eqs ref refs tbc tbd todo fyi asap eod eow etc via also then still only just maybe need needs must should could would yes ok okay '
  + 'self myself me you everyone anyone someone nobody').split(/\s+/).filter(Boolean));

/**
 * Capitalised names in open tasks (titles and subtasks) that match nobody.
 * opts: {index, stop:[words], ignore:[names], minTasks (default 2)}
 * -> [{name, key, count, taskIds, cue}] most frequent first. A name counts
 * once per task; a single mention counts when it reads like a person
 * ("Ana's", "email Ana", "with Ana").
 */
function pplUnknownNames(state, opts) {
  opts = opts || {};
  const out = [];
  if (!state) return out;
  const idx = opts.index || pplBuildIndex(state.people);
  const st = state.statuses || {}, del = state.deleted || {};
  const open = (Array.isArray(state.custom) ? state.custom : []).filter(t => t && t.id && !del[t.id] && st[t.id] !== 'done');
  // Words written in lower case are everyday words, not names: any in a
  // title or subtask, or in the descriptions of two or more tasks (one
  // pasted message with a lower-case name must not hide that name).
  const lower = new Set(), inDetails = new Map();
  const lowRe = /(?<![\p{L}\p{N}_])\p{Ll}{2,}(?![\p{L}\p{N}_])/gu;
  const scrub = (s) => String(s || '').replace(/\S+@\S+|https?:\/\/\S+|`[^`]*`|[\w]+(?:[-_.\/][\w]+)+/g, ' ');
  for (const t of open) {
    const short = scrub([t.title, ...(Array.isArray(t.subtasks) ? t.subtasks.map(s => s && s.title) : [])].filter(Boolean).join('\n'));
    for (const w of short.match(lowRe) || []) lower.add(pplFold(w));
    for (const w of new Set((scrub(t.detail).match(lowRe) || []).map(pplFold))) inDetails.set(w, (inDetails.get(w) || 0) + 1);
  }
  for (const [w, n] of inDetails) if (n >= 2) lower.add(w);
  const stop = new Set(PPL_STOP);
  for (const w of opts.stop || []) for (const x of pplFold(w).split(/[^\p{L}\p{N}]+/u)) if (x) stop.add(x);
  const known = new Set([...idx.text.keys(), ...idx.tag.keys()]);
  for (const p of idx.byId.values()) for (const x of pplNameParts(p.name)) known.add(pplFold(x));
  const ignore = new Set((opts.ignore || []).map(x => pplFold(x)));
  const good = (f) => f.length >= PPL_MIN_LEN && !stop.has(f) && !lower.has(f) && !known.has(f) && !ignore.has(f);
  const CUE = /(?:^|[\s(])(?:email|e-mail|ask|tell|call|meet|meeting with|ping|chase|with|from|cc|thank|thanks|remind|reply to|message|text|invite|intro|introduce|update|send|book|catch up with|1:1 with|sync with|for|to)\s+$/i;
  const tokRe = /(?<![\p{L}\p{N}_'’])(\p{Lu}\p{Ll}+)(['’]s)?(?![\p{L}\p{N}_])/gu;
  const found = new Map();
  const note = (key, name, tid, cue) => {
    let r = found.get(key);
    if (!r) { r = { name, key, tasks: new Set(), cue: false, names: new Map() }; found.set(key, r); }
    r.tasks.add(tid); if (cue) r.cue = true;
    r.names.set(name, (r.names.get(name) || 0) + 1);
  };
  for (const t of open) {
    const texts = [String(t.title || ''), ...(Array.isArray(t.subtasks) ? t.subtasks : []).map(s => String((s && s.title) || ''))];
    for (const text of texts) {
      const toks = [];
      tokRe.lastIndex = 0;
      let m;
      while ((m = tokRe.exec(text))) toks.push({ w: m[1], at: m.index, end: m.index + m[0].length, poss: !!m[2], ok: good(pplFold(m[1])) });
      for (let i = 0; i < toks.length; i++) {
        if (!toks[i].ok) continue;
        const grp = [toks[i]];
        while (grp.length < 3 && i + 1 < toks.length && toks[i + 1].ok && !grp[grp.length - 1].poss && text.slice(grp[grp.length - 1].end, toks[i + 1].at) === ' ') { grp.push(toks[i + 1]); i++; }
        const first = grp[0], last = grp[grp.length - 1];
        const before = text.slice(0, first.at);
        const atStart = !before.trim() || /[.!?:;\-–—•*(]\s*$/.test(before);
        const cue = last.poss || CUE.test(before.slice(-24)) || grp.length >= 2;
        // At the start of a title the first word is usually a verb ("Practise
        // Spanish"): only a possessive ("Ana's notes") counts there.
        if (atStart && !last.poss) continue;
        const name = grp.map(g => g.w).join(' ');
        note(pplFold(name), name, t.id, cue);
      }
    }
  }
  // "Ana" and "Ana Lopez": fold the single word into the full name.
  for (const [key, r] of [...found]) {
    if (key.includes(' ')) continue;
    const full = [...found.values()].find(x => x.key.startsWith(key + ' '));
    if (full) { for (const tid of r.tasks) full.tasks.add(tid); if (r.cue) full.cue = true; found.delete(key); }
  }
  const min = opts.minTasks || 2;
  for (const r of found.values()) {
    if (r.tasks.size < min && !r.cue) continue;
    const name = [...r.names.entries()].sort((a, b) => b[1] - a[1])[0][0];
    out.push({ name, key: r.key, count: r.tasks.size, taskIds: [...r.tasks], cue: r.cue });
  }
  return out.sort((a, b) => b.count - a.count || (a.cue === b.cue ? a.name.localeCompare(b.name) : a.cue ? -1 : 1));
}
