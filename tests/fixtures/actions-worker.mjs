// Child process for the lock-contention test: applies N single-op batches to
// the same task through the actions library, printing each new version.
import { pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const [dataDir, name, n] = process.argv.slice(2);
const here = dirname(fileURLToPath(import.meta.url));
const { createActions } = await import(pathToFileURL(join(here, '..', '..', 'server', 'actions', 'index.mjs')).href);
const a = createActions({ dataDir });
const versions = [];
for (let i = 0; i < Number(n); i++) {
  const r = await a.apply({ ops: [{ op: 'task.add_subtask', id: 'u-1-aaa', title: `${name} step ${i}` }], source: 'script', client: name });
  versions.push(r.version);
}
process.stdout.write(JSON.stringify(versions));
