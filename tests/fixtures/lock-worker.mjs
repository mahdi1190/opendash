// Child process for tests/fsutil.test.mjs: increments a counter file N times,
// each time read-modify-write under withLock. Without a working cross-process
// lock, two of these running at once lose increments.
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const { withLock, atomicWrite } = await import(pathToFileURL(join(here, '..', '..', 'lib', 'fsutil.mjs')).href);
const [file, n] = process.argv.slice(2);
for (let i = 0; i < Number(n); i++) {
  await withLock(file, async () => {
    const cur = existsSync(file) ? Number(readFileSync(file, 'utf8')) || 0 : 0;
    await new Promise(r => setTimeout(r, 2));   // widen the race window
    await atomicWrite(file, String(cur + 1));
  }, { timeoutMs: 30000 });
}
