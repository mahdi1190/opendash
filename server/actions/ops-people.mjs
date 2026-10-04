// server/actions/ops-people.mjs - write operations for People and the tag
// registry (owner: People/Tags). ops.mjs calls extendPeopleOps(OPS): ops with
// the same name REPLACE the built-in ones, the rest are added, so the HTTP
// API, the MCP server and the CLI all pick them up.
//
//   person.create         [create_person]          name; kind, role, org, group, emails[], aliases[], streams[] ...
//   person.update         [update_person]          any of those fields (lists replace; addAliases/addEmails add);
//                                                   a rename keeps the old name's match words as aliases;
//                                                   icon = a symbol or emoji avatar
//   person.merge          [merge_people]           fold one record into another: links, aliases, emails, notes (danger)
//   person.delete         [delete_person]          remove a person and unlink their tasks (danger)
//   person.add_note       [add_person_note]        a dated note about someone
//   task.link_person      [link_person]            (replaces A3's: also lifts an earlier "not this person")
//   task.unlink_person    [unlink_person]          (replaces A3's: remembers the removal, so tags and
//                                                   suggestions never bring that person back)
//   people.link_suggested [link_suggested_people]  link the people tasks mention by name
//   tag.create            [create_tag]             add a tag to the canonical list
//   tag.update            [update_tag]             pin to the sidebar, archive, note, colour, symbol (icon)
// task.create and task.update are wrapped: a new task links the people its
// title/subtasks name when state.peopleAutoLink is not false, and people
// removed through update_task's `people` list are remembered as removed.
//
// The matching rules live in ONE place, src/app/52-people-link.js, loaded
// through lib/people-tags.mjs (the page uses the same file).

import { ActionError, LIMITS, cleanLine, cleanText, normTag, slug, resolvePerson, truncate, clone } from './model.mjs';
import { pplBuildIndex, pplLinked, pplAutoLink, pplSuggest, pplFold, pplNormalizePerson, pplTerms, tglRegistry, tglSetFlags } from '../../lib/people-tags.mjs';
import { czCleanSymbol, czRenameAliases, spriteIconNames } from '../../lib/customise.mjs';

const obj = (properties, required = [], extra = {}) => ({ type: 'object', properties, required, additionalProperties: false, ...extra });
const PALETTE = ['#2563eb', '#7c3aed', '#059669', '#0891b2', '#ea580c', '#db2777', '#dc2626', '#0d9488', '#ca8a04', '#4f46e5'];
const KINDS = ['person', 'org', 'mailbox'];
const S = {
  taskId: { type: 'string', minLength: 1, maxLength: 160, description: 'task id from list_tasks / search_tasks / get_task' },
  person: { type: 'string', minLength: 1, maxLength: 100, description: 'person id from list_people (an exact name or alias also works)' },
  name: { type: 'string', minLength: 1, maxLength: 100 },
  kind: { type: 'string', enum: KINDS, description: "person (default), org (a company or group) or mailbox (a shared address such as support@)" },
  role: { type: 'string', maxLength: 200, description: 'role or relationship, e.g. "client, Acme project"' },
  org: { type: 'string', maxLength: 120, description: 'organisation, e.g. "University of Northfield"' },
  group: { type: 'string', maxLength: 40, description: 'a short group for the People filters, e.g. "Lab" or "Clients"' },
  emails: { type: 'array', items: { type: 'string', minLength: 3, maxLength: 200 }, maxItems: 10, description: 'every address they use' },
  aliases: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 60 }, maxItems: 20, description: 'other names or nicknames; tasks that mention them link to this person' },
  streams: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 60 }, maxItems: 20, description: 'stream ids they work in' },
  phone: { type: 'string', maxLength: 60 }, linkedin: { type: 'string', maxLength: 500 },
  color: { type: 'string', maxLength: 40, description: "colour, e.g. '#2563eb'" },
  icon: { type: 'string', maxLength: 40, description: "symbol: an icon name from the app such as 'rocket' or 'book-open', or one emoji; '' removes it" },
  tag: { type: 'string', minLength: 1, maxLength: 60, description: "tag, e.g. 'email' (a leading # is dropped)" },
};
/** A checked symbol ('' = none), or BAD_VALUE naming the closest icons (rules: lib/customise.mjs). */
function cleanIcon(v, field = 'icon') {
  const r = czCleanSymbol(v, spriteIconNames());
  if (r.error) throw new ActionError('BAD_VALUE', r.error, { field, ...(r.near.length ? { valid: r.near, hint: `did you mean ${r.near.map(n => `'${n}'`).join(' or ')}?` } : {}) });
  return r.value;
}
const EMAIL_RE = /^[^\s@<>"',;:()]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$/;

const pchange = (p, field, from, to) => ({ entity: 'person', id: p.id, label: p.name, field, from: from ?? null, to: to ?? null });
const tchange = (t, field, from, to) => ({ entity: 'task', id: t.id, label: truncate(t.title, 60), field, from: from ?? null, to: to ?? null });
function cleanColor(v) {
  if (v == null || v === '') return undefined;
  const c = String(v).trim();
  if (!/^(#[0-9a-f]{3,8}|[a-z]{3,20})$/i.test(c)) throw new ActionError('BAD_VALUE', `color must be a hex colour like '#2563eb'; got '${truncate(c, 20)}'`, { field: 'color' });
  return c;
}
function cleanEmails(list, field = 'emails') {
  const out = [];
  (list || []).forEach((e, i) => {
    const v = cleanLine(e, LIMITS.email).toLowerCase();
    if (!v) return;
    if (!EMAIL_RE.test(v)) throw new ActionError('BAD_VALUE', `'${truncate(v, 40)}' is not an email address`, { field: `${field}[${i}]` });
    if (!out.includes(v)) out.push(v);
  });
  return out;
}
const cleanAliases = (list) => [...new Set((list || []).map(a => cleanLine(a, LIMITS.alias).toLowerCase()).filter(Boolean))];
function cleanStreams(ctx, list) {
  const known = new Set([...(Array.isArray(ctx.s.streams) ? ctx.s.streams.map(x => x && x.id) : []), ...(ctx.s.custom || []).map(t => t && t.stream)]);
  return [...new Set((list || []).map(x => cleanLine(x, 60)).filter(Boolean))].map((x, i) => {
    if (known.size && !known.has(x)) throw new ActionError('UNKNOWN_STREAM', `unknown stream '${x}'`, { field: `streams[${i}]`, valid: [...known].filter(Boolean).slice(0, 40) });
    return x;
  });
}
function people(ctx) { ctx.s.people = Array.isArray(ctx.s.people) ? ctx.s.people : []; return ctx.s.people; }
function liveTasks(s) { return (s.custom || []).filter(t => t && !(s.deleted && s.deleted[t.id])); }

/** Set the optional profile fields shared by create and update; returns the changes. */
function setFields(ctx, who, p, { replaceLists = true } = {}) {
  const ch = [];
  const set = (field, v) => {
    if (v === undefined) return;
    const cur = who[field] === undefined ? (Array.isArray(v) ? [] : '') : who[field];
    if (JSON.stringify(cur) === JSON.stringify(v)) return;
    ch.push(pchange(who, field, Array.isArray(cur) ? cur.join(', ') : cur, Array.isArray(v) ? v.join(', ') : v));
    if (v === '' || v === false) delete who[field]; else who[field] = v;
  };
  // A rename keeps the old name's match words as aliases (unless keepOldName:false),
  // so tasks that say the old name still link and auto-link keeps working.
  let oldAliases = [];
  if (p.name !== undefined) {
    const n = cleanLine(p.name, LIMITS.name);
    if (!n) throw new ActionError('BAD_VALUE', 'name must not be empty', { field: 'name' });
    if (who.name && n !== who.name && p.keepOldName !== false && p.aliases === undefined) oldAliases = czRenameAliases(pplTerms(who).text, pplTerms({ ...who, name: n }).text, who.aliases);
    set('name', n);
  }
  if (p.icon !== undefined) set('icon', cleanIcon(p.icon));
  if (p.kind !== undefined) set('kind', p.kind);
  for (const f of ['role', 'org', 'group']) if (p[f] !== undefined) set(f, cleanLine(p[f], f === 'group' ? 40 : LIMITS.role));
  if (p.phone !== undefined) set('phone', cleanLine(p.phone, LIMITS.phone));
  if (p.linkedin !== undefined) set('linkedin', cleanLine(p.linkedin, LIMITS.url));
  if (p.color !== undefined) set('color', cleanColor(p.color) || '');
  if (p.inactive !== undefined) set('inactive', !!p.inactive);
  if (p.pinned !== undefined) set('pinned', !!p.pinned);
  let emails = Array.isArray(who.emails) ? who.emails.slice() : (who.email ? [String(who.email).toLowerCase()] : []);
  if (p.emails !== undefined && replaceLists) emails = cleanEmails(p.emails);
  else if (p.emails !== undefined) for (const e of cleanEmails(p.emails)) if (!emails.includes(e)) emails.push(e);
  if (p.email !== undefined && p.email !== '') for (const e of cleanEmails([p.email], 'email')) if (!emails.includes(e)) emails.unshift(e);
  if (p.addEmails !== undefined) for (const e of cleanEmails(p.addEmails, 'addEmails')) if (!emails.includes(e)) emails.push(e);
  if (p.emails !== undefined || p.email !== undefined || p.addEmails !== undefined) { set('emails', emails); who.email = emails[0] || ''; }
  let aliases = Array.isArray(who.aliases) ? who.aliases.slice() : [];
  if (p.aliases !== undefined) aliases = replaceLists ? cleanAliases(p.aliases) : [...new Set([...aliases, ...cleanAliases(p.aliases)])];
  if (p.addAliases !== undefined) for (const a of cleanAliases(p.addAliases)) if (!aliases.includes(a)) aliases.push(a);
  for (const a of cleanAliases(oldAliases)) if (!aliases.includes(a)) aliases.push(a);
  if (p.removeAliases !== undefined) { const rm = new Set(cleanAliases(p.removeAliases)); aliases = aliases.filter(a => !rm.has(a)); }
  if (p.aliases !== undefined || p.addAliases !== undefined || p.removeAliases !== undefined || oldAliases.length) set('aliases', aliases.slice(0, 20));
  if (p.streams !== undefined) set('streams', cleanStreams(ctx, p.streams));
  return ch;
}
const PROFILE = {
  kind: S.kind, role: S.role, org: S.org, group: S.group, emails: S.emails, email: { type: 'string', maxLength: 200, description: 'one address (added first)' },
  aliases: S.aliases, streams: S.streams, phone: S.phone, linkedin: S.linkedin, color: S.color,
  icon: { ...S.icon, description: "a symbol or emoji shown in their avatar instead of the initials ('' = initials again)" },
  inactive: { type: 'boolean', description: 'no longer active: sinks to the bottom of People' },
};

/** Add `pid` to a task's people (lifting a previous removal). */
function linkTask(ctx, t, pid, why) {
  const cur = Array.isArray(t.people) ? t.people : [];
  const excl = Array.isArray(t.peopleExcluded) ? t.peopleExcluded : [];
  if (cur.includes(pid) && !excl.includes(pid)) return null;
  ctx.touch('task:' + t.id);
  t.people = cur.includes(pid) ? cur : [...cur, pid];
  if (excl.includes(pid)) { t.peopleExcluded = excl.filter(x => x !== pid); if (!t.peopleExcluded.length) delete t.peopleExcluded; }
  ctx.log(t.id, 'people', { text: `Linked ${why || pid}` });
  return tchange(t, 'people', cur, t.people);
}

export const PEOPLE_OPS = [
  {
    name: 'person.create', tool: 'create_person',
    description: 'Add a person, organisation or shared mailbox. Check list_people first. Tasks that already point at the id, or later mention the name, link to them.',
    schema: obj({
      name: S.name,
      id: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]{0,39}$', formatHint: 'lower-case letters, digits and -', description: 'optional id; default: the first name in lower case (tasks that already point at that id get linked)' },
      ...PROFILE,
      allowDuplicate: { type: 'boolean', description: 'create even if someone with this name or address exists' },
    }, ['name']),
    run(ctx, p) {
      const list = people(ctx);
      const name = cleanLine(p.name, LIMITS.name);
      if (!name) throw new ActionError('BAD_VALUE', 'name must not be empty', { field: 'name' });
      const fname = pplFold(name);
      const mails = cleanEmails([...(p.emails || []), ...(p.email ? [p.email] : [])]);
      const dup = list.find(x => pplFold(x.name) === fname || (x.aliases || []).some(a => pplFold(a) === fname)
        || (mails.length && [...(x.emails || []), x.email].filter(Boolean).some(e => mails.includes(String(e).toLowerCase()))));
      if (dup && !p.allowDuplicate) throw new ActionError('DUPLICATE_PERSON', `${dup.name} already exists (id '${dup.id}')`, { field: 'name', candidates: [{ id: dup.id, name: dup.name }], hint: 'use update_person, or allowDuplicate:true for a different person with the same name' });
      const taken = new Set(list.map(x => x.id));
      let id = p.id;
      if (id && taken.has(id)) throw new ActionError('ID_TAKEN', `person id '${id}' is already used by ${list.find(x => x.id === id).name}`, { field: 'id' });
      if (!id) {
        const first = slug(name.replace(/\([^)]*\)/g, ' ').trim().split(/\s+/)[0]) || 'person';
        id = !taken.has(first) ? first : slug(name) && !taken.has(slug(name)) ? slug(name) : null;
        for (let n = 2; !id; n++) if (!taken.has(`${first}-${n}`)) id = `${first}-${n}`;
      }
      ctx.touch('person:' + id);
      const who = { id, name, kind: 'person', email: '', emails: [], aliases: [], streams: [], color: PALETTE[list.length % PALETTE.length] };
      setFields(ctx, who, { ...p, name: undefined });
      if (!who.kind) who.kind = 'person';
      if (!who.color) who.color = PALETTE[list.length % PALETTE.length];
      list.push(pplNormalizePerson(who));
      const linked = liveTasks(ctx.s).filter(t => Array.isArray(t.people) && t.people.includes(id)).length;
      if (linked) ctx.warn(`${linked} existing task(s) already pointed at '${id}' and are now linked to ${name}`);
      const sug = pplSuggest(ctx.s, { index: pplBuildIndex(ctx.s.people), details: false }).filter(x => x.personId === id).length;
      if (sug) ctx.warn(`${sug} open task(s) mention ${name} by name; link_suggested_people {personIds:['${id}']} links them`);
      return { summary: `Add ${who.kind === 'person' ? 'person' : who.kind} ${name} (id '${id}')`, changes: [{ entity: 'person', id, label: name, field: 'created', from: null, to: name }], created: { personId: id } };
    },
  },
  {
    name: 'person.update', tool: 'update_person',
    description: "Change a person: name, kind, role, org, group, emails / aliases / streams (these REPLACE the list; addEmails / addAliases / removeAliases edit it), phone, linkedin, colour, icon (a symbol or emoji avatar), inactive, pinned. Renaming keeps the old name as an alias, so tasks that use it still link (keepOldName:false to skip that).",
    schema: obj({
      id: S.person, name: S.name, ...PROFILE,
      addEmails: S.emails, addAliases: S.aliases, removeAliases: S.aliases,
      pinned: { type: 'boolean', description: 'show in the sidebar shortcuts' },
      keepOldName: { type: 'boolean', description: 'with name: keep the old name as an alias (default true)' },
    }, ['id'], { minProperties: 2, minPropertiesMessage: 'update_person needs at least one field to change' }),
    run(ctx, p) {
      const who = resolvePerson(ctx.s, p.id, 'id');
      ctx.touch('person:' + who.id);
      const ch = setFields(ctx, who, p);
      return { summary: ch.length ? `Update ${who.name}: ${ch.map(c => c.field).join(', ')}` : `No change to ${who.name}`, changes: ch };
    },
  },
  {
    name: 'person.merge', tool: 'merge_people', danger: true,
    description: 'Fold one person record into another (duplicates such as "Sam" and "Sam Taylor"): task links, aliases, emails, streams and notes move to `into`, the old name becomes an alias, and `from` is removed. Needs a dry run first.',
    schema: obj({ from: S.person, into: S.person }, ['from', 'into']),
    run(ctx, p) {
      const a = resolvePerson(ctx.s, p.from, 'from');
      const b = resolvePerson(ctx.s, p.into, 'into');
      if (a.id === b.id) throw new ActionError('BAD_VALUE', 'from and into are the same person', { field: 'into' });
      if (a.self) throw new ActionError('FORBIDDEN', "your own record can't be merged away", { field: 'from', status: 400 });
      ctx.touch('person:' + a.id); ctx.touch('person:' + b.id);
      const ch = [];
      const mails = [...(b.emails || (b.email ? [b.email] : []))];
      for (const e of [...(a.emails || []), a.email].filter(Boolean)) if (!mails.includes(String(e).toLowerCase())) mails.push(String(e).toLowerCase());
      const aliases = [...(b.aliases || [])];
      for (const x of [...(a.aliases || []), pplFold(a.name), a.id].filter(Boolean)) { const v = String(x).toLowerCase(); if (!aliases.includes(v) && pplFold(b.name) !== v && v !== b.id) aliases.push(v); }
      const streams = [...new Set([...(b.streams || []), ...(a.streams || [])])];
      const notes = [...(Array.isArray(b.notes) ? b.notes : []), ...(Array.isArray(a.notes) ? a.notes : [])].sort((x, y) => (y.ts || 0) - (x.ts || 0));
      b.emails = mails; b.email = mails[0] || ''; b.aliases = aliases; b.streams = streams; if (notes.length) b.notes = notes;
      for (const f of ['role', 'org', 'group', 'phone', 'linkedin', 'avatarUrl']) if (!b[f] && a[f]) b[f] = a[f];
      ch.push(pchange(b, 'merged', null, a.name));
      let moved = 0;
      const fix = (t, live) => {
        let hit = false;
        for (const key of ['people', 'peopleExcluded']) {
          if (!Array.isArray(t[key]) || !t[key].includes(a.id)) continue;
          if (live && !hit) ctx.touch('task:' + t.id);
          hit = true;
          const cur = t[key];
          t[key] = [...new Set(cur.map(x => (x === a.id ? b.id : x)))];
          if (key === 'people' && live) { ch.push(tchange(t, 'people', cur, t[key])); ctx.log(t.id, 'people', { text: `${a.name} merged into ${b.name}` }); }
        }
        if (hit && live) moved++;
      };
      for (const t of ctx.s.custom || []) if (t) fix(t, true);
      for (const bt of (ctx.s.bin && ctx.s.bin.tasks) || []) if (bt && bt.customData) fix(bt.customData, false);
      ctx.s.people = people(ctx).filter(x => x.id !== a.id);
      return { summary: `Merge ${a.name} into ${b.name} (${moved} task${moved === 1 ? '' : 's'} relinked)`, changes: ch };
    },
  },
  {
    name: 'person.delete', tool: 'delete_person', danger: true,
    description: 'Remove a person and unlink them from every task (the tasks stay). Prefer update_person {inactive:true} for someone you no longer work with. Needs a dry run first.',
    schema: obj({ id: S.person }, ['id']),
    run(ctx, p) {
      const who = resolvePerson(ctx.s, p.id, 'id');
      if (who.self) throw new ActionError('FORBIDDEN', "your own record can't be deleted", { field: 'id', status: 400 });
      ctx.touch('person:' + who.id);
      const ch = [pchange(who, 'deleted', who.name, null)];
      for (const t of ctx.s.custom || []) {
        if (!t) continue;
        const hasP = Array.isArray(t.people) && t.people.includes(who.id);
        const hasX = Array.isArray(t.peopleExcluded) && t.peopleExcluded.includes(who.id);
        if (!hasP && !hasX) continue;
        ctx.touch('task:' + t.id);
        if (hasP) { const cur = t.people; t.people = cur.filter(x => x !== who.id); ch.push(tchange(t, 'people', cur, t.people)); ctx.log(t.id, 'people', { text: `Unlinked ${who.name} (person deleted)` }); }
        if (hasX) { t.peopleExcluded = t.peopleExcluded.filter(x => x !== who.id); if (!t.peopleExcluded.length) delete t.peopleExcluded; }
      }
      ctx.s.people = people(ctx).filter(x => x.id !== who.id);
      return { summary: `Delete ${who.name} (unlinked from ${ch.length - 1} task${ch.length === 2 ? '' : 's'})`, changes: ch };
    },
  },
  {
    name: 'person.add_note', tool: 'add_person_note',
    description: 'Add a dated note about a person (preferences, context, what was agreed). Newest first.',
    schema: obj({ id: S.person, text: { type: 'string', minLength: 1, maxLength: 4000 } }, ['id', 'text']),
    run(ctx, p) {
      const who = resolvePerson(ctx.s, p.id, 'id');
      const text = cleanText(p.text, 4000);
      if (!text) throw new ActionError('BAD_VALUE', 'note text must not be empty', { field: 'text' });
      ctx.touch('person:' + who.id);
      const n = { id: `pn-${ctx.now}-${Math.random().toString(36).slice(2, 7)}`, ts: ctx.now, text, via: ctx.source };
      who.notes = [n, ...(Array.isArray(who.notes) ? who.notes : [])];
      return { summary: `Add a note about ${who.name}`, changes: [pchange(who, 'note+', null, truncate(text, 80))], created: { noteId: n.id } };
    },
  },
  {
    name: 'task.link_person', tool: 'link_person',
    description: 'Link a person to a task.',
    schema: obj({ id: S.taskId, person: S.person }, ['id', 'person']),
    run(ctx, p) {
      const t = ctx.task(p.id);
      const who = resolvePerson(ctx.s, p.person);
      const c = linkTask(ctx, t, who.id, who.name || who.id);
      if (!c) { ctx.warn(`${who.name || who.id} is already linked to '${truncate(t.title, 60)}'`); return { summary: 'No change', changes: [] }; }
      return { summary: `Link ${who.name || who.id} to "${truncate(t.title, 60)}"`, changes: [c] };
    },
  },
  {
    name: 'task.unlink_person', tool: 'unlink_person',
    description: 'Remove a person from a task. The removal is remembered: a tag or a name in the text will not link them again.',
    schema: obj({ id: S.taskId, person: S.person }, ['id', 'person']),
    run(ctx, p) {
      const t = ctx.task(p.id);
      const idx = pplBuildIndex(ctx.s.people);
      const linked = pplLinked(ctx.s, t, idx);
      let pid = String(p.person).trim();
      if (!linked.includes(pid)) { try { pid = resolvePerson(ctx.s, p.person).id; } catch (e) { if (!linked.includes(pid)) throw e; } }
      if (!linked.includes(pid)) { ctx.warn(`'${pid}' is not linked to '${truncate(t.title, 60)}'`); return { summary: 'No change', changes: [] }; }
      const cur = Array.isArray(t.people) ? t.people : [];
      t.people = cur.filter(x => x !== pid);
      const excl = Array.isArray(t.peopleExcluded) ? t.peopleExcluded : [];
      if (!excl.includes(pid)) t.peopleExcluded = [...excl, pid];
      const who = idx.byId.get(pid);
      ctx.log(t.id, 'people', { text: `Unlinked ${(who && who.name) || pid}` });
      return { summary: `Unlink ${(who && who.name) || pid} from "${truncate(t.title, 60)}"`, changes: [tchange(t, 'people', linked, pplLinked(ctx.s, t, idx))] };
    },
  },
  {
    name: 'people.link_suggested', tool: 'link_suggested_people',
    description: 'Link people to the open tasks that mention them by name (whole words in the title or subtasks; strength "all" also uses descriptions). list_link_suggestions shows the same list first.',
    schema: obj({
      strength: { type: 'string', enum: ['strong', 'all'], description: 'strong (default) = title and subtasks only; all = also descriptions' },
      personIds: { type: 'array', items: S.person, maxItems: 100, description: 'only these people' },
      taskIds: { type: 'array', items: S.taskId, maxItems: 200, description: 'only these tasks' },
    }),
    run(ctx, p) {
      const idx = pplBuildIndex(ctx.s.people);
      const only = p.personIds ? new Set(p.personIds.map((x, i) => resolvePerson(ctx.s, x, `personIds[${i}]`).id)) : null;
      const sug = pplSuggest(ctx.s, { index: idx, details: p.strength === 'all', taskIds: p.taskIds }).filter(x => !only || only.has(x.personId));
      const ch = [];
      for (const x of sug) {
        const t = ctx.task(x.taskId);
        const who = idx.byId.get(x.personId);
        const c = linkTask(ctx, t, x.personId, `${(who && who.name) || x.personId} (named in the ${x.where})`);
        if (c) ch.push(c);
      }
      return { summary: ch.length ? `Link ${ch.length} mention${ch.length === 1 ? '' : 's'} to people` : 'Nothing to link', changes: ch };
    },
  },
  {
    name: 'tag.create', tool: 'create_tag',
    description: 'Add a tag to the canonical list (the list pickers and autocomplete offer). Only for a kind of work or a cross-stream project that 3+ open tasks will use; never for a person, stream, date or priority.',
    schema: obj({ tag: S.tag, note: { type: 'string', maxLength: 200, description: 'what the tag is for' } }, ['tag']),
    run(ctx, p) {
      const tag = normTag(p.tag);
      if (!tag) throw new ActionError('BAD_VALUE', 'the tag is empty after cleaning', { field: 'tag' });
      ctx.touch('tagRegistry');
      const before = tglRegistry(ctx.s) || [];
      if (before.some(e => e.id === tag)) { ctx.warn(`#${tag} is already on the list`); return { summary: 'No change', changes: [] }; }
      tglSetFlags(ctx.s, tag, { note: p.note ? cleanLine(p.note, 200) : undefined });
      return { summary: `Add #${tag} to the tag list`, changes: [{ entity: 'tag', id: tag, label: '#' + tag, field: 'created', from: null, to: tag }] };
    },
  },
  {
    name: 'tag.update', tool: 'update_tag',
    description: "Pin a tag to the sidebar, archive it (it stays on its tasks but leaves the sidebar and pickers), or set its note (what it is for), colour or symbol (icon name such as 'mail', or an emoji; '' removes it). Tag chips show the colour and symbol everywhere.",
    schema: obj({ tag: S.tag, pinned: { type: 'boolean' }, archived: { type: 'boolean' }, note: { type: 'string', maxLength: 200, description: 'what the tag is for (its description)' }, color: S.color, icon: S.icon }, ['tag'], { minProperties: 2, minPropertiesMessage: 'update_tag needs pinned, archived, note, color or icon' }),
    run(ctx, p) {
      const tag = normTag(p.tag);
      const used = liveTasks(ctx.s).some(t => Array.isArray(t.tags) && t.tags.includes(tag));
      const reg = tglRegistry(ctx.s) || [];
      if (!used && !reg.some(e => e.id === tag)) throw new ActionError('UNKNOWN_TAG', `no tag '${tag}'`, { field: 'tag', hint: 'list_tags shows every tag' });
      ctx.touch('tagRegistry');
      // Unpinning also drops the tag from the older pinnedTags list (tglSetFlags edits it).
      if (p.pinned === false) ctx.touch('key:pinnedTags');
      const before = clone(reg.find(e => e.id === tag) || { id: tag });
      const e = tglSetFlags(ctx.s, tag, { pinned: p.pinned, archived: p.archived, note: p.note, color: p.color === undefined ? undefined : (cleanColor(p.color) || ''), icon: p.icon === undefined ? undefined : cleanIcon(p.icon) });
      const ch = [];
      for (const f of ['pinned', 'archived', 'note', 'color', 'icon']) if (JSON.stringify(before[f]) !== JSON.stringify(e[f])) ch.push({ entity: 'tag', id: tag, label: '#' + tag, field: f, from: before[f] ?? null, to: e[f] ?? null });
      return { summary: ch.length ? `Update #${tag}: ${ch.map(c => c.field).join(', ')}` : 'No change', changes: ch };
    },
  },
];

/**
 * Called by ops.mjs: replace by name / add, and wrap task.create and
 * task.update for the people rules.
 */
export function extendPeopleOps(OPS) {
  for (const op of PEOPLE_OPS) {
    const i = OPS.findIndex(o => o.name === op.name);
    if (i >= 0) OPS[i] = op; else OPS.push(op);
  }
  const create = OPS.find(o => o.name === 'task.create');
  if (create && !create._people) {
    const run0 = create.run;
    create.run = (ctx, p) => {
      const r = run0(ctx, p);
      if (ctx.s.peopleAutoLink === false) return r;
      const id = r && r.created && r.created.id;
      const t = id && (ctx.s.custom || []).find(x => x && x.id === id);
      if (!t) return r;
      const added = pplAutoLink(ctx.s, t, pplBuildIndex(ctx.s.people));
      if (added.length) {
        const names = added.map(pid => (ctx.s.people.find(x => x.id === pid) || {}).name || pid);
        ctx.log(id, 'people', { text: `Linked ${names.join(', ')} (named in the title)` });
        r.summary += `; linked ${names.join(', ')}`;
      }
      return r;
    };
    create._people = true;
  }
  const update = OPS.find(o => o.name === 'task.update');
  if (update && !update._people) {
    const run0 = update.run;
    update.run = (ctx, p) => {
      if (p.people === undefined) return run0(ctx, p);
      const t = ctx.task(p.id);
      const idx = pplBuildIndex(ctx.s.people);
      const before = pplLinked(ctx.s, t, idx);
      const r = run0(ctx, p);
      const now = Array.isArray(t.people) ? t.people : [];
      const removed = before.filter(x => !now.includes(x));
      const excl = (Array.isArray(t.peopleExcluded) ? t.peopleExcluded : []).filter(x => !now.includes(x));
      for (const x of removed) if (!excl.includes(x)) excl.push(x);
      if (excl.length) t.peopleExcluded = excl; else delete t.peopleExcluded;
      return r;
    };
    update._people = true;
  }
  return OPS;
}
