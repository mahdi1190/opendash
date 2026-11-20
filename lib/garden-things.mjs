// Things placed through layout data (20 Nov 2026): a ball, a log seat, a campfire, a telescope ... each a row of a KIND
// (src/app/94-garden-zz-7act-0kinds.js GARDEN_KINDS) that the game gives that kind's affordances, wherever it is put.
// Read from assets/garden/vale-things.json and from a `things` array in any region file (assets/garden/vale-<region>.json),
// so the layout's authors and painters place them, never code. Not part of the saved-world identity: moving a ball does
// not start anyone's garden again. A row: { id, kind, x, y (the foot's middle, cells) | on (a fixed thing's id) + at [dx, dy]
// (cells from that thing's foot middle), w?, h?, front? (the way its front faces, degrees: 90 = towards you), season?, level?, drawn? }.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const thingsRoot = dirname(dirname(fileURLToPath(import.meta.url)));
/** Every placed thing: the shared file first, then each region file's own rows (a region's row wins for the same id). */
export function loadGardenThings(root = thingsRoot) {
  const dir = join(root, 'assets/garden'), out = new Map(), from = [];
  const take = (file) => {
    let d; try { d = JSON.parse(readFileSync(join(dir, file), 'utf8')); } catch (e) { return; }
    const rows = Array.isArray(d) ? d : Array.isArray(d.things) ? d.things : null; if (!rows) return;
    from.push(file);
    for (const r of rows) if (r && typeof r.id === 'string' && typeof r.kind === 'string') out.set(r.id, Object.assign({}, r));
  };
  if (existsSync(join(dir, 'vale-things.json'))) take('vale-things.json');
  let files = []; try { files = readdirSync(dir).filter(f => /^vale-[a-z0-9-]+\.json$/.test(f) && f !== 'vale-things.json').sort(); } catch (e) { files = []; }
  for (const f of files) take(f);
  return { things: [...out.values()], from };
}
export function gardenThingsScript(root = thingsRoot) {
  const t = loadGardenThings(root);
  return `window.GardenValeThings=Object.freeze({things:Object.freeze(${JSON.stringify(t.things)}.map(Object.freeze)),from:${JSON.stringify(t.from)}});`;
}
