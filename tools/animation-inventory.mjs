// Authoring inventory; renders trusted built-in code without accessing user data.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { animRegistryFiles } from './lib/anim-sources.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const app = join(root, 'src/app');
const files = animRegistryFiles(app);   // the build's order (tools/lib/anim-sources.mjs)
const packs = new Function(files.map(f => readFileSync(join(app, f), 'utf8')).join('\n;\n') + '\nreturn animPacks();')();
const inventory = packs.map(p => ({ id: p.id, name: p.name, count: p.items.length, full: p.items.filter(i => i.full).length, items: p.items.map(i => { const s = i.svg({}); return { ref: i.ref, label: i.label, site: i.site, full: !!i.full, bytes: Buffer.byteLength(s), motion: [...new Set([...s.matchAll(/\bx-([a-z0-9-]+)/g)].map(m => m[1]))], objects: [...s.matchAll(/<(?:path|rect|circle|ellipse|polygon|line|use)\b/g)].length }; }) }));
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(inventory, null, 2));
console.table(inventory.map(({id,count,full}) => ({pack:id,items:count,full,mini:count-full})));
console.log('Total:', inventory.reduce((n,p)=>n+p.count,0), 'items;', inventory.reduce((n,p)=>n+p.full,0), 'full-screen scenes');
