// server/actions/ops-resources.mjs - Files & links: folders, files, links,
// GitHub and Google Drive URLs and code snippets attached to tasks, streams,
// people and sections (state.resources; model in src/app/62-resources-logic.js
// through lib/resources.mjs). Added to OPS in ops.mjs and QUERIES in queries.mjs.
//
//   resource.create  [create_resource]   attach something (kind detected from the target);
//                                        the same path/URL again just adds the new links
//   resource.update  [update_resource]   label, note, pinned, target, lang
//   resource.delete  [delete_resource]   forget it (the file or page itself is never touched; danger:
//                                        a dry run and its confirm token first)
//   resource.link    [link_resource]     attach an existing resource to more things
//   resource.unlink  [unlink_resource]   detach it from some things
//   resources.list   [list_resources]    filter by task / stream / person / section / kind / text
//
// Opening a file, revealing it or listing a folder is NOT an op: only the page
// can ask the server for that (server/routes/resources.mjs), and only for a
// resource saved here. Undo uses the 'resource:<id>' entity (entities.mjs).

import { statSync } from 'node:fs';
import { ActionError, cleanLine, truncate, resolveStream, resolvePerson } from './model.mjs';
import {
  RSRC_KINDS, RSRC_LINK_TYPES, RSRC_LIMITS, RSRC_PATH_KINDS, rsrcNormalize, rsrcNormLinks, rsrcFindSame, rsrcFilter, rsrcIsLocalPath,
  rsrcDisplayLabel, rsrcKindLabel, rsrcGithub, rsrcDrive, resourcesOf,
} from '../../lib/resources.mjs';

// Path facts for warnings and file/folder detection. Tests swap it.
let _fsInfo = (p) => {
  if (!rsrcIsLocalPath(p)) return null;
  try { const st = statSync(p); return { exists: true, dir: st.isDirectory() }; } catch { return { exists: false, dir: false }; }
};
export function setResourceFsInfo(fn) { _fsInfo = typeof fn === 'function' ? fn : _fsInfo; }

const SECTION_RE = /^[a-z][a-z0-9-]{0,39}(:[A-Za-z0-9_.@-]{1,120})?$/;
const obj = (properties, required = [], extra = {}) => ({ type: 'object', properties, required, additionalProperties: false, ...extra });
const linkSchema = { type: 'object', properties: { type: { type: 'string', enum: [...RSRC_LINK_TYPES] }, id: { type: 'string', minLength: 1, maxLength: 160, description: 'task id (search_tasks), stream id (get_context), person id (list_people) or section view name (e.g. finance, calendar)' } }, required: ['type', 'id'], additionalProperties: false };
const S = {
  id: { type: 'string', minLength: 1, maxLength: 160, description: 'resource id from list_resources' },
  links: { type: 'array', items: linkSchema, maxItems: RSRC_LIMITS.links, description: 'what to attach it to: [{type:"task", id:"u-..."}, {type:"stream", id:"thesis"}, ...]' },
  task: { type: 'string', minLength: 1, maxLength: 160, description: "shortcut for links:[{type:'task', id}] (task id from search_tasks, or '$ref' of a task made earlier in the batch)" },
  stream: { type: 'string', minLength: 1, maxLength: 60, description: "shortcut for links:[{type:'stream', id}] (stream id or label)" },
  person: { type: 'string', minLength: 1, maxLength: 100, description: "shortcut for links:[{type:'person', id}] (person id or name)" },
  section: { type: 'string', minLength: 1, maxLength: 160, description: "shortcut for links:[{type:'section', id}] (a dashboard view such as 'finance' or 'calendar')" },
  label: { type: 'string', maxLength: RSRC_LIMITS.label, description: 'a short name (default: the file or folder name, owner/repo #123 for GitHub)' },
  note: { type: 'string', maxLength: RSRC_LIMITS.note, description: 'optional note' },
  pinned: { type: 'boolean', description: 'pinned resources are listed first' },
  lang: { type: 'string', maxLength: RSRC_LIMITS.lang, description: "snippets: the language, e.g. 'python', 'bash', 'sql'" },
  target: { type: 'string', minLength: 1, maxLength: RSRC_LIMITS.snippet, description: 'an ABSOLUTE local path (C:\\\\Users\\\\... or /home/...), an http(s) URL (GitHub and Google Drive links are recognised), or the snippet text' },
  kind: { type: 'string', enum: [...RSRC_KINDS], description: 'optional: folder, file, url, github, drive or snippet (detected from the target when left out; a snippet must say kind:"snippet")' },
};

function list(ctx) {
  const s = ctx.s;
  if (!Array.isArray(s.resources)) s.resources = [];
  return s.resources;
}
function find(ctx, id, field = 'id') {
  const rid = String(id ?? '').trim();
  const r = resourcesOf(ctx.s).find(x => x.id === rid);
  if (r) { ctx.touch('resource:' + r.id); return r; }
  const all = resourcesOf(ctx.s);
  const q = rid.toLowerCase();
  const near = all.filter(x => String(x.label || '').toLowerCase().includes(q) || String(x.target || '').toLowerCase().includes(q)).slice(0, 5);
  throw new ActionError('UNKNOWN_RESOURCE', `no resource with id '${truncate(rid, 40)}'`, {
    field, candidates: near.map(x => ({ id: x.id, label: rsrcDisplayLabel(x), kind: x.kind })), hint: 'list_resources shows them with their ids',
  });
}
const label = (r) => truncate(rsrcDisplayLabel(r), 60);
const NOUN = { folder: 'folder', file: 'file', url: 'link', github: 'GitHub link', drive: 'Google Drive link', snippet: 'snippet' };
const change = (r, field, from, to) => ({ entity: 'resource', id: r.id, label: label(r), field, from: from ?? null, to: to ?? null });
const rsErr = (e) => (e && e.name === 'RsrcError' ? new ActionError(e.code === 'BAD_TARGET' ? 'BAD_TARGET' : 'BAD_VALUE', e.message, { field: e.field || 'target' }) : e);

/** Links from {links, task, stream, person, section}, each checked against the data; ids resolved. */
function wantedLinks(ctx, p) {
  let raw;
  try { raw = rsrcNormLinks(p.links || [], 'links'); } catch (e) { throw rsErr(e); }
  if (p.task) raw.push({ type: 'task', id: String(p.task) });
  if (p.stream) raw.push({ type: 'stream', id: String(p.stream) });
  if (p.person) raw.push({ type: 'person', id: String(p.person) });
  if (p.section) raw.push({ type: 'section', id: String(p.section) });
  const out = [], seen = new Set();
  raw.forEach((l, i) => {
    const field = i < (p.links || []).length ? `links[${i}].id` : l.type;
    let id = l.id;
    if (l.type === 'task') id = ctx.task(l.id, field).id;
    else if (l.type === 'stream') id = resolveStream(ctx.s, l.id, field);
    else if (l.type === 'person') id = resolvePerson(ctx.s, l.id, field).id;
    else if (l.type === 'section' && !SECTION_RE.test(l.id)) throw new ActionError('BAD_VALUE', `section '${truncate(l.id, 40)}' is not a view name (e.g. finance, calendar, people)`, { field });
    const k = l.type + ':' + id;
    if (!seen.has(k)) { seen.add(k); out.push({ type: l.type, id }); }
  });
  return out;
}
function linkLabel(ctx, l) {
  if (l.type === 'task') { const t = (ctx.s.custom || []).find(x => x && x.id === l.id); return t ? `task "${truncate(t.title, 50)}"` : `task ${l.id}`; }
  if (l.type === 'person') { const p = (ctx.s.people || []).find(x => x && x.id === l.id); return p ? p.name : l.id; }
  return `${l.type} ${l.id}`;
}
function addLinks(ctx, r, links) {
  r.links = Array.isArray(r.links) ? r.links : [];
  const added = [];
  for (const l of links) {
    if (r.links.some(x => x.type === l.type && x.id === l.id)) continue;
    if (r.links.length >= RSRC_LIMITS.links) throw new ActionError('TOO_MANY_LINKS', `a resource can have at most ${RSRC_LIMITS.links} links`, { field: 'links' });
    r.links.push({ type: l.type, id: l.id }); added.push(l);
  }
  return added;
}
/** file vs folder from the disk when the path exists here; a warning when it does not. */
function checkPath(ctx, r) {
  if (!RSRC_PATH_KINDS.includes(r.kind)) return;
  const info = _fsInfo(r.target);
  if (!info) return;
  if (!info.exists) { ctx.warn(`'${truncate(r.target, 80)}' was not found on this computer; it is saved anyway (check the path)`); return; }
  const kind = info.dir ? 'folder' : 'file';
  if (kind !== r.kind) r.kind = kind;
}

export const RESOURCE_OPS = [
  {
    name: 'resource.create', tool: 'create_resource',
    description: 'Attach a folder, a file, a web link, a GitHub repo/PR/issue link, a Google Drive link or a code snippet to tasks, streams, people or sections (the "Files & links" of each). Give an ABSOLUTE path or an http(s) URL as target (kind is detected); for text set kind:"snippet" and lang. Attaching a path or URL that is already saved just adds the new links to it. Find the task first with search_tasks.',
    schema: obj({ kind: S.kind, target: S.target, label: S.label, lang: S.lang, note: S.note, pinned: S.pinned, links: S.links, task: S.task, stream: S.stream, person: S.person, section: S.section, allowDuplicate: { type: 'boolean', description: 'true keeps a second copy of a path/URL that is already saved' } }, ['target']),
    run(ctx, p) {
      const links = wantedLinks(ctx, p);
      let r;
      try { r = rsrcNormalize({ ...p, links: [] }, { now: ctx.now }); } catch (e) { throw rsErr(e); }
      const all = list(ctx);
      const same = p.allowDuplicate ? null : rsrcFindSame(all, r.kind, r.target);
      if (same) {
        ctx.touch('resource:' + same.id);
        const added = addLinks(ctx, same, links);
        const ch = added.map(l => change(same, 'link', null, `${l.type}:${l.id}`));
        if (p.pinned === true && !same.pinned) { ch.push(change(same, 'pinned', false, true)); same.pinned = true; }
        if (!ch.length) ctx.warn(`'${label(same)}' is already saved${links.length ? ' and attached there' : ''} (id ${same.id})`);
        return {
          summary: ch.length ? `Attach existing "${label(same)}" to ${added.map(l => linkLabel(ctx, l)).join(', ') || 'the same places'}` : `"${label(same)}" is already attached`,
          changes: ch, created: { resourceId: same.id, existing: true },
        };
      }
      while (all.some(x => x.id === r.id)) r.id += 'x';
      ctx.touch('resource:' + r.id);
      r.links = links;
      checkPath(ctx, r);
      all.push(r);
      const where = links.length ? ` to ${links.map(l => linkLabel(ctx, l)).join(', ')}` : '';
      return { summary: `Attach ${NOUN[r.kind] || 'item'} "${label(r)}"${where}`, changes: [change(r, 'created', null, r.kind === 'snippet' ? truncate(r.target, 80) : r.target)], created: { resourceId: r.id } };
    },
  },
  {
    name: 'resource.update', tool: 'update_resource',
    description: 'Rename a resource, change its note, pin it, fix its path/URL or a snippet\'s text or language.',
    schema: obj({ id: S.id, label: S.label, note: S.note, pinned: S.pinned, target: S.target, lang: S.lang }, ['id'], { minProperties: 2, minPropertiesMessage: 'update_resource needs label, note, pinned, target or lang' }),
    run(ctx, p) {
      const r = find(ctx, p.id);
      const ch = [];
      if (p.label !== undefined) {
        const v = cleanLine(p.label, RSRC_LIMITS.label);
        if (v && v !== r.label) { ch.push(change(r, 'label', r.label, v)); r.label = v; }
      }
      if (p.note !== undefined) {
        const v = String(p.note).replace(/\r\n?/g, '\n').trim().slice(0, RSRC_LIMITS.note);
        if (v !== (r.note || '')) { ch.push(change(r, 'note', r.note || null, v || null)); if (v) r.note = v; else delete r.note; }
      }
      if (p.pinned !== undefined && !!p.pinned !== !!r.pinned) { ch.push(change(r, 'pinned', !!r.pinned, !!p.pinned)); r.pinned = !!p.pinned; }
      if (p.target !== undefined || p.lang !== undefined) {
        let n;
        try { n = rsrcNormalize({ kind: r.kind, target: p.target !== undefined ? p.target : r.target, lang: p.lang !== undefined ? p.lang : r.lang, label: r.label }, { id: r.id }); } catch (e) { throw rsErr(e); }
        if (n.target !== r.target) {
          const clash = rsrcFindSame(resourcesOf(ctx.s).filter(x => x !== r), n.kind, n.target);
          if (clash) throw new ActionError('DUPLICATE', `that ${n.kind === 'url' ? 'link' : 'path'} is already saved as '${label(clash)}' (${clash.id})`, { field: 'target', hint: 'link_resource attaches that one instead' });
          ch.push(change(r, 'target', r.target, n.target)); r.target = n.target; r.kind = n.kind; checkPath(ctx, r);
        }
        if (r.kind === 'snippet' && (n.lang || '') !== (r.lang || '')) { ch.push(change(r, 'lang', r.lang || null, n.lang || null)); if (n.lang) r.lang = n.lang; else delete r.lang; }
      }
      if (!ch.length) ctx.warn(`resource '${label(r)}': nothing to change`);
      return { summary: ch.length ? `Update "${label(r)}": ${ch.map(c => c.field).join(', ')}` : `No change to "${label(r)}"`, changes: ch };
    },
  },
  {
    // danger: a delete (a snippet's text goes with it) needs a dry run + confirm, like the other deletes.
    name: 'resource.delete', tool: 'delete_resource', danger: true,
    description: 'Remove a saved resource from the dashboard everywhere it is attached. The file, folder or web page itself is never touched. To detach it from one task only, use unlink_resource.',
    schema: obj({ id: S.id }, ['id']),
    run(ctx, p) {
      const r = find(ctx, p.id);
      const all = list(ctx);
      all.splice(all.indexOf(r), 1);
      return { summary: `Remove "${label(r)}" from the dashboard (the ${r.kind === 'snippet' ? 'snippet text is gone' : 'original is not touched'})`, changes: [change(r, 'deleted', r.kind === 'snippet' ? truncate(r.target, 80) : r.target, null)] };
    },
  },
  {
    name: 'resource.link', tool: 'link_resource',
    description: 'Attach an existing resource to more tasks, streams, people or sections.',
    schema: obj({ id: S.id, links: S.links, task: S.task, stream: S.stream, person: S.person, section: S.section }, ['id'], { minProperties: 2, minPropertiesMessage: 'link_resource needs links, task, stream, person or section' }),
    run(ctx, p) {
      const r = find(ctx, p.id);
      const added = addLinks(ctx, r, wantedLinks(ctx, p));
      if (!added.length) ctx.warn(`'${label(r)}' was already attached there`);
      return { summary: added.length ? `Attach "${label(r)}" to ${added.map(l => linkLabel(ctx, l)).join(', ')}` : `No change to "${label(r)}"`, changes: added.map(l => change(r, 'link', null, `${l.type}:${l.id}`)) };
    },
  },
  {
    name: 'resource.unlink', tool: 'unlink_resource',
    description: 'Detach a resource from some tasks, streams, people or sections (it stays saved; delete_resource removes it).',
    schema: obj({ id: S.id, links: S.links, task: S.task, stream: S.stream, person: S.person, section: S.section }, ['id'], { minProperties: 2, minPropertiesMessage: 'unlink_resource needs links, task, stream, person or section' }),
    run(ctx, p) {
      const r = find(ctx, p.id);
      let want;
      try { want = rsrcNormLinks(p.links || [], 'links'); } catch (e) { throw rsErr(e); }
      for (const k of ['task', 'stream', 'person', 'section']) if (p[k]) want.push({ type: k, id: String(p[k]) });
      const before = (r.links || []).slice();
      const hit = (x) => want.some(l => l.type === x.type && (l.id === x.id || (l.type === 'person' && (() => { try { return resolvePerson(ctx.s, l.id).id === x.id; } catch { return false; } })())
        || (l.type === 'stream' && (() => { try { return resolveStream(ctx.s, l.id) === x.id; } catch { return false; } })())));
      r.links = before.filter(x => !hit(x));
      const removed = before.filter(x => !r.links.includes(x));
      if (!removed.length) ctx.warn(`'${label(r)}' was not attached there`);
      return { summary: removed.length ? `Detach "${label(r)}" from ${removed.map(l => linkLabel(ctx, l)).join(', ')}` : `No change to "${label(r)}"`, changes: removed.map(l => change(r, 'link', `${l.type}:${l.id}`, null)) };
    },
  },
];

// ─── Query ──────────────────────────────────────────────────────────────────
function compact(s, r) {
  const g = r.kind === 'github' ? rsrcGithub(r.target) : null;
  const d = r.kind === 'drive' ? rsrcDrive(r.target) : null;
  const links = (r.links || []).map(l => {
    if (l.type === 'task') { const t = (s.custom || []).find(x => x && x.id === l.id); return { ...l, ...(t ? { title: truncate(t.title, 80) } : { missing: true }) }; }
    if (l.type === 'person') { const p = (s.people || []).find(x => x && x.id === l.id); return { ...l, ...(p ? { name: p.name } : { missing: true }) }; }
    return l;
  });
  return {
    id: r.id, kind: r.kind, label: rsrcDisplayLabel(r), what: rsrcKindLabel(r),
    target: r.kind === 'snippet' ? truncate(r.target, 400) : r.target,
    ...(r.lang ? { lang: r.lang } : {}), ...(r.note ? { note: truncate(r.note, 300) } : {}), ...(r.pinned ? { pinned: true } : {}),
    ...(g ? { github: { owner: g.owner, repo: g.repo, type: g.type, ...(g.number ? { number: g.number } : {}) } } : {}),
    ...(d ? { drive: d.type } : {}),
    links,
  };
}

export const RESOURCE_QUERIES = [
  {
    name: 'resources.list', tool: 'list_resources',
    description: 'Files & links saved in the dashboard (folders, files, links, GitHub, Google Drive, snippets) with what each is attached to. Filter by task, stream, person, section, kind or text.',
    schema: obj({
      id: { type: 'string', maxLength: 160, description: 'one resource' }, task: { type: 'string', maxLength: 160 }, stream: { type: 'string', maxLength: 60 },
      person: { type: 'string', maxLength: 100 }, section: { type: 'string', maxLength: 160 }, kind: { type: 'string', enum: [...RSRC_KINDS] },
      q: { type: 'string', maxLength: 100, description: 'words in the label, path/URL or note' }, pinned: { type: 'boolean' },
      limit: { type: 'integer', minimum: 1, maximum: 200 },
    }),
    run(q, p) {
      const s = q.s;
      const f = { kind: p.kind, q: p.q, pinned: p.pinned === true };
      if (p.task) f.task = p.task;
      if (p.stream) { try { f.stream = resolveStream(s, p.stream); } catch { f.stream = p.stream; } }
      if (p.person) { try { f.person = resolvePerson(s, p.person).id; } catch { f.person = p.person; } }
      if (p.section) f.section = p.section;
      let all = rsrcFilter(resourcesOf(s), f);
      if (p.id) all = all.filter(r => r.id === p.id);
      all.sort((a, b) => (!!b.pinned - !!a.pinned) || ((b.createdAt || 0) - (a.createdAt || 0)));
      const limit = p.limit || 50;
      return { count: all.length, ...(all.length > limit ? { more: all.length - limit } : {}), resources: all.slice(0, limit).map(r => compact(s, r)) };
    },
  },
];
