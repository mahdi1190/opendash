// Shared build/CSP identity of the exact locally bundled game engine.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const GAME_ENGINE_VERSION = '4.2.1';
export const GAME_ENGINE_JS = 'vendor/phaser/phaser-4.2.1.min.js';
export const GAME_ENGINE_SHA256 = '66348b1b5141e49b7d5ebbe688cddcb502eab1cb00f21c538686a5b2c5abe4de';

/** Both offline page builders embed the same checked JavaScript as inert JSON. */
export function readGameEngine(root) {
  const bytes = readFileSync(join(root, GAME_ENGINE_JS));
  if (createHash('sha256').update(bytes).digest('hex') !== GAME_ENGINE_SHA256) throw new Error('The bundled Phaser file does not match its pinned version');
  const source = bytes.toString('utf8');
  // A literal less-than could be read as markup inside a script data block.
  const json = JSON.stringify(source).replaceAll('<', '\\u003c');
  return { source, html: `<script id="freeflo-game-engine" type="application/json" data-version="${GAME_ENGINE_VERSION}">${json}</script>\n` };
}
