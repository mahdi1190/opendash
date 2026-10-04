// The page's Clock (src/app/07-core-clock-logic.js + 07-core-clock.js) for tests that run
// page files in a VM. The page's display code asks Clock for "now", "today" and wall
// times (travel spec 2.7); a VM box gets the same Clock the page has, following this
// process's own zone unless the box's APP_CONFIG says otherwise.
//
//   loadPageClock(box)        evaluate Clock in a vm context (box made by vm.createContext)
//   pageClockSource()         the two files' text, for tests that build one script
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'app');
export const PAGE_CLOCK_FILES = Object.freeze(['07-core-clock-logic.js', '07-core-clock.js']);

export function pageClockSource() {
  return PAGE_CLOCK_FILES.map(f => readFileSync(join(APP, f), 'utf8')).join('\n;\n');
}

export function loadPageClock(box) {
  vm.runInContext(pageClockSource(), box, { filename: '07-core-clock.js' });
  return box;
}
