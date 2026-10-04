// server/log.mjs - the server log: <data>/logs/server.log, rotated by size.
//
// One line per event: ISO time, level, message. Never log prompts, task text,
// email content or money: routes log method, path, status and timing only.
// server.log -> server.1.log -> ... -> server.<keep>.log, oldest dropped.

import { promises as fsp } from 'node:fs';
import { dirname } from 'node:path';
import { retryFs } from '../lib/fsutil.mjs';

export function createLogger(file, { maxBytes = 1024 * 1024, keep = 5, echo = true, echoInfo = false } = {}) {
  let chain = Promise.resolve();
  let size = null;

  async function rotate() {
    for (let i = keep - 1; i >= 1; i--) {
      await fsp.rename(`${file.replace(/\.log$/, '')}.${i}.log`, `${file.replace(/\.log$/, '')}.${i + 1}.log`).catch(() => {});
    }
    await retryFs(() => fsp.rename(file, `${file.replace(/\.log$/, '')}.1.log`), { retries: 4 }).catch(() => {});
    size = 0;
  }

  async function write(line) {
    if (!file) return;
    if (size === null) {
      await fsp.mkdir(dirname(file), { recursive: true }).catch(() => {});
      size = await fsp.stat(file).then(s => s.size).catch(() => 0);
    }
    if (size + line.length > maxBytes) await rotate();
    await retryFs(() => fsp.appendFile(file, line, 'utf8'), { retries: 4 }).catch(() => {});
    size += Buffer.byteLength(line);
  }

  function log(level, msg) {
    const text = String(msg).replace(/[\r\n]+/g, ' ').slice(0, 2000);
    const line = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} ${text}\n`;
    if (echo && (level !== 'info' || echoInfo)) process.stdout.write(`  ${text}\n`);
    chain = chain.then(() => write(line)).catch(() => {});
    return chain;
  }
  log.flush = () => chain;
  return log;
}
