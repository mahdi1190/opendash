// 070-resources - seed Files & links (state.resources) from a list the user
// keeps OUTSIDE the repo: the folders, files, repos and links that belong to
// their streams and tasks.
//
// The list (personal: paths, repo names, task ids) is never in this file. It is
// read from, in order:
//   --from <file.json>  |  --plan <file.json>
//   <data>/seed-resources.json
//   <data>/migration-plans/070-resources.json
// Without one, nothing happens.
//
// List format:
//   { "version": 1, "resources": [
//     { "target": "<absolute path or https URL>", "kind"?: "folder|file|url|github|drive",
//       "label"?: "...", "note"?: "...", "pinned"?: false,
//       "links": [ { "type": "stream", "id": "<stream id or label>" },
//                  { "type": "task", "id"?: "<task id>", "titleIncludes"?: ["word", "word"], "all"?: false, "openOnly"?: true },
//                  { "type": "person", "id": "<person id or name>" },
//                  { "type": "section", "id": "<view name>" } ] },
//     { "gitRemoteOf": "<absolute path of a git checkout>", "label"?: "...", "links": [...] }
//   ] }
//
// Rules: a path is only added when it EXISTS on this machine (checked now);
// "gitRemoteOf" reads that checkout's .git/config (no git, no network) and
// adds its GitHub 'origin' as a github resource (credentials stripped). A task
// link uses the id when it exists, else the open tasks whose title contains
// every word of titleIncludes: exactly one, or all of them with "all": true
// (ambiguous matches are skipped and counted). Unknown streams/people are
// skipped. Idempotent: an existing resource with the same target only gains
// the links it lacks. Counts only in the output, never paths or titles.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { readJson, runIfMain } from './_lib.mjs';
import { rsrcNormalize, rsrcFindSame, rsrcGithub, rsrcIsLocalPath, rsrcNormPath, RSRC_LINK_TYPES } from '../../lib/resources.mjs';

export const id = '070-resources';
export const description = 'Files & links: attach folders, files, repos and links from a seed list kept outside the repo (--from <file> or <data>/seed-resources.json); only paths that exist here.';
export const auto = false;

async function loadSeed(ctx) {
  const given = ctx.arg('--from') || ctx.arg('--plan');
  const cands = given ? [resolve(given)] : [join(ctx.dataDir, 'seed-resources.json'), join(ctx.dataDir, 'migration-plans', `${id}.json`)];
  const file = cands.find(f => existsSync(f));
  if (!file) {
    if (given) throw new Error('seed file not found (--from)');
    return null;
  }
  const doc = await readJson(file, { fallback: undefined });
  const list = Array.isArray(doc) ? doc : doc && Array.isArray(doc.resources) ? doc.resources : null;
  if (!list) throw new Error('the seed file must be {"resources":[...]} or a list');
  return list;
}

/** The 'origin' remote of a checkout, as an https GitHub URL, or null. Reads .git/config only. */
export function githubRemoteOf(dir) {
  try {
    let gitDir = join(dir, '.git');
    if (!existsSync(gitDir)) return null;
    if (statSync(gitDir).isFile()) {                       // worktree / submodule: "gitdir: <path>"
      const m = /^gitdir:\s*(.+)$/m.exec(readFileSync(gitDir, 'utf8'));
      if (!m) return null;
      gitDir = isAbsolute(m[1].trim()) ? m[1].trim() : resolve(dir, m[1].trim());
    }
    const cfg = readFileSync(join(gitDir, 'config'), 'utf8');
    const sec = /\[remote\s+"origin"\]([\s\S]*?)(?=\n\s*\[|$)/.exec(cfg);
    const url = sec && /^\s*url\s*=\s*(.+)$/m.exec(sec[1]);
    if (!url) return null;
    const g = rsrcGithub(url[1].trim());
    return g ? g.url : null;
  } catch { return null; }
}

const words = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

export async function run(ctx) {
  const seed = await loadSeed(ctx);
  if (!seed) return { changed: false, notes: ['no seed list (--from <file>, <data>/seed-resources.json): nothing to do'] };
  const state = await ctx.state.read();
  if (!state) return { changed: false, notes: ['no state file: nothing to do'] };
  state.resources = Array.isArray(state.resources) ? state.resources : [];
  const tasks = (Array.isArray(state.custom) ? state.custom : []).filter(t => t && t.id && !(state.deleted && state.deleted[t.id]));
  const isOpen = (t) => ((state.statuses || {})[t.id] || 'todo') !== 'done';
  const streams = Array.isArray(state.streams) ? state.streams : [];
  const people = Array.isArray(state.people) ? state.people : [];
  const n = { listed: seed.length, missing: 0, bad: 0, noRemote: 0, added: 0, existing: 0, links: 0, unknownStream: 0, unknownPerson: 0, taskNotFound: 0, ambiguous: 0, badLink: 0 };

  const resolveLinks = (links) => {
    const out = [];
    for (const l of Array.isArray(links) ? links : []) {
      const type = String(l && l.type || '').toLowerCase();
      if (!RSRC_LINK_TYPES.includes(type)) { n.badLink++; continue; }
      if (type === 'stream') {
        const q = String(l.id || '').toLowerCase();
        const s = streams.find(x => x && (String(x.id).toLowerCase() === q || String(x.label || '').toLowerCase() === q));
        if (s) out.push({ type, id: s.id }); else n.unknownStream++;
      } else if (type === 'person') {
        const q = String(l.id || '').toLowerCase();
        const p = people.find(x => x && (String(x.id).toLowerCase() === q || String(x.name || '').toLowerCase() === q));
        if (p) out.push({ type, id: p.id }); else n.unknownPerson++;
      } else if (type === 'section') {
        if (/^[a-z][a-z0-9-]{0,39}$/.test(String(l.id || ''))) out.push({ type, id: l.id }); else n.badLink++;
      } else {
        const byId = l.id ? tasks.find(t => t.id === l.id) : null;
        if (byId) { out.push({ type, id: byId.id }); continue; }
        const want = (Array.isArray(l.titleIncludes) ? l.titleIncludes : l.titleIncludes ? [l.titleIncludes] : []).map(words).filter(Boolean);
        if (!want.length) { n.taskNotFound++; continue; }
        const hits = tasks.filter(t => (l.openOnly === false || isOpen(t)) && want.every(w => words(t.title).includes(w)));
        if (!hits.length) n.taskNotFound++;
        else if (hits.length > 1 && !l.all) n.ambiguous++;
        else for (const t of hits) out.push({ type, id: t.id });
      }
    }
    return out;
  };

  for (const entry of seed) {
    if (!entry || typeof entry !== 'object') { n.bad++; continue; }
    let target = entry.target, kind = entry.kind;
    if (entry.gitRemoteOf) {
      const dir = rsrcNormPath(String(entry.gitRemoteOf));
      target = rsrcIsLocalPath(dir) && existsSync(dir) ? githubRemoteOf(dir) : null;
      if (!target) { n.noRemote++; continue; }
      kind = 'github';
    }
    if (typeof target !== 'string' || !target.trim()) { n.bad++; continue; }
    if (!/^https?:\/\//i.test(target.trim())) {
      const p = rsrcNormPath(target);
      if (!rsrcIsLocalPath(p) || !existsSync(p)) { n.missing++; continue; }
      kind = statSync(p).isDirectory() ? 'folder' : 'file';
      target = p;
    }
    let r;
    try { r = rsrcNormalize({ kind, target, label: entry.label, note: entry.note, pinned: !!entry.pinned }, { id: 'r-seed-' + createHash('sha1').update(String(target).toLowerCase()).digest('hex').slice(0, 10) }); }
    catch { n.bad++; continue; }
    const links = resolveLinks(entry.links);
    const same = rsrcFindSame(state.resources, r.kind, r.target);
    if (same) {
      n.existing++;
      same.links = Array.isArray(same.links) ? same.links : [];
      for (const l of links) if (!same.links.some(x => x.type === l.type && x.id === l.id)) { same.links.push(l); n.links++; }
      continue;
    }
    r.links = links;
    n.links += links.length;
    state.resources.push(r);
    n.added++;
  }

  const changed = n.added > 0 || n.links > 0;
  const notes = [
    `seed list: ${n.listed} entr${n.listed === 1 ? 'y' : 'ies'}; ${n.added} added, ${n.existing} already there; ${n.links} link(s) added`,
  ];
  const skipped = [['missing on this machine', n.missing], ['no GitHub origin', n.noRemote], ['unreadable entries', n.bad],
    ['unknown streams', n.unknownStream], ['unknown people', n.unknownPerson], ['tasks not found', n.taskNotFound],
    ['ambiguous task matches (use the id, or "all": true)', n.ambiguous], ['bad links', n.badLink]].filter(([, v]) => v);
  if (skipped.length) notes.push('skipped: ' + skipped.map(([k, v]) => `${v} ${k}`).join(', '));
  notes.push(`resources now: ${state.resources.length}`);
  if (changed) await ctx.state.write(state);
  return { changed, notes, counts: n };
}

await runIfMain(import.meta.url, { id, description, auto, run });
