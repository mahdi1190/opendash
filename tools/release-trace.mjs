// tools/release-trace.mjs - a preload (`node --import=<this file's URL> ...`)
// that records which files a process reads, lists or checks for. Used by
// tools/release-export.mjs: every file build.mjs touches in the source must
// also be in the release, because build.mjs skips missing optional parts (the
// font, the icon sprite, vendored libraries) without a word.
//
//   RELEASE_TRACE_OUT=<file>   where to write the list (a JSON array of
//                              absolute paths) when the process exits;
//                              without it this module does nothing.
//
// It wraps the fs functions (sync, callback and promise forms) and calls
// syncBuiltinESMExports() so `import { readFileSync } from 'node:fs'` sees the
// wrappers too. Nothing is changed about what the functions do.
// Zero dependencies, Node >= 20.

import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = process.env.RELEASE_TRACE_OUT;

if (out) {
  const seen = new Set();
  const write = fs.writeFileSync;
  const note = (p) => {
    try {
      if (typeof p === 'string') seen.add(resolve(p));
      else if (p instanceof URL && p.protocol === 'file:') seen.add(resolve(fileURLToPath(p)));
      else if (Buffer.isBuffer(p)) seen.add(resolve(p.toString('utf8')));
    } catch { /* not a path */ }
  };
  const wrap = (obj, name) => {
    const orig = obj[name];
    if (typeof orig !== 'function') return;
    obj[name] = function traced(p, ...rest) { note(p); return orig.call(this, p, ...rest); };
  };
  for (const n of ['readFileSync', 'existsSync', 'readdirSync', 'statSync', 'lstatSync', 'openSync', 'accessSync', 'opendirSync',
    'readFile', 'readdir', 'stat', 'lstat', 'open', 'access', 'opendir', 'createReadStream']) wrap(fs, n);
  for (const n of ['readFile', 'readdir', 'stat', 'lstat', 'open', 'access', 'opendir']) wrap(fs.promises, n);
  syncBuiltinESMExports();
  process.on('exit', () => { try { write(out, JSON.stringify([...seen])); } catch { /* best effort */ } });
}
