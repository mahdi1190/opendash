// lib/onedrive.mjs - which OneDrive a folder belongs to: the PERSONAL one or a
// WORK OR SCHOOL one (OneDrive for Business). Personal data never goes to an
// employer's or a university's cloud by default.
//
// Windows sets, for the signed-in accounts:
//   %OneDriveConsumer%    the personal OneDrive
//   %OneDriveCommercial%  the work or school OneDrive (its folder is "OneDrive - <Organisation>")
//   %OneDrive%            whichever account was added LAST: on a computer with
//                         both it is often the work one
// macOS (File Provider): `~/Library/CloudStorage/OneDrive-Personal` is personal,
// OneDrive-<Organisation> is work or school.
//
// Node stdlib only (path); env is injected.

import { basename } from 'node:path';

const norm = (p) => String(p || '').replace(/[\\/]+$/, '');
const WORK_NAME = /^OneDrive - (.+)$/i;          // Windows: "OneDrive - Contoso"
const MAC_NAME = /^OneDrive-(.+)$/i;             // macOS: "OneDrive-Contoso" ("OneDrive-Personal" is personal)

/** {work, org} from a OneDrive root folder's own name, or null when the name says nothing. */
export function kindFromName(dir) {
  const n = basename(norm(dir).replace(/\\/g, '/'));
  let m = WORK_NAME.exec(n);
  if (m) return { work: true, org: m[1].trim() };
  m = MAC_NAME.exec(n);
  if (m) return /^personal$/i.test(m[1]) ? { work: false, org: null } : { work: true, org: m[1].trim() };
  if (/^OneDrive$/i.test(n)) return { work: false, org: null };
  return null;
}

/** The OneDrive roots this computer knows: [{path, work, org}] (personal first). */
export function oneDriveRoots(env = process.env) {
  const out = [];
  const add = (p, kind) => {
    if (!p) return;
    const k = norm(p).toLowerCase();
    if (out.some(r => norm(r.path).toLowerCase() === k)) return;
    out.push({ path: norm(p), ...kind });
  };
  const commercial = env.OneDriveCommercial ? norm(env.OneDriveCommercial).toLowerCase() : null;
  if (env.OneDriveConsumer) add(env.OneDriveConsumer, { work: false, org: null });
  if (env.OneDrive) {
    const same = commercial && norm(env.OneDrive).toLowerCase() === commercial;
    const byName = kindFromName(env.OneDrive);
    add(env.OneDrive, same ? { work: true, org: (kindFromName(env.OneDriveCommercial) || {}).org || null } : byName || { work: false, org: null });
  }
  if (env.OneDriveCommercial) add(env.OneDriveCommercial, { work: true, org: (kindFromName(env.OneDriveCommercial) || {}).org || null });
  return out.sort((a, b) => (a.work === b.work ? 0 : a.work ? 1 : -1));
}

/** The personal OneDrive folder, or null (never a work or school one). */
export function personalOneDrive(env = process.env) {
  const r = oneDriveRoots(env).find(x => !x.work);
  return r ? r.path : null;
}

/**
 * Which OneDrive the path is in: {work, org, root} or null (not in a OneDrive).
 * The known roots first; else a folder named "OneDrive - <Org>" / "OneDrive" on the way.
 */
export function oneDriveOf(p, env = process.env) {
  const s = norm(p);
  if (!s) return null;
  const low = s.toLowerCase();
  for (const r of oneDriveRoots(env)) {
    const rl = r.path.toLowerCase();
    if (low === rl || low.startsWith(rl + '\\') || low.startsWith(rl + '/')) return { work: r.work, org: r.org, root: r.path };
  }
  const parts = s.split(/[\\/]+/);
  for (let i = parts.length - 1; i >= 0; i--) {
    const k = kindFromName(parts[i]);
    if (k) return { ...k, root: parts.slice(0, i + 1).join(s.includes('\\') ? '\\' : '/') };
  }
  return null;
}

/** "OneDrive" or "OneDrive (work or school: Contoso)": how a folder's OneDrive is named to people. */
export function oneDriveLabel(kind) {
  if (!kind || !kind.work) return 'OneDrive';
  return kind.org ? `OneDrive (work or school: ${kind.org})` : 'OneDrive (work or school)';
}

