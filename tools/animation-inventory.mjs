// Authoring inventory; renders trusted built-in code without accessing user data.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const app = join(root, 'src/app');
const files = ['71-anim-almanac.js', '71-anim-library.js', '71-anim-registry.js', '71-delight-library.js', '71-uk-counties.js', '71-anim-texas-scenes.js', ...readdirSync(app).filter(f => /^71-anim-(us2?|asia2?)[-.]/.test(f)).sort(), ...readdirSync(app).filter(f => /^72-anim-pack-.*\.js$/.test(f)).sort()];
const packs = new Function(files.map(f => readFileSync(join(app, f), 'utf8')).join('\n;\n') + '\nreturn animPacks();')();
const inventory = packs.map(p => ({ id: p.id, name: p.name, count: p.items.length, full: p.items.filter(i => i.full).length, items: p.items.map(i => { const s = i.svg({}); return { ref: i.ref, label: i.label, site: i.site, full: !!i.full, bytes: Buffer.byteLength(s), motion: [...new Set([...s.matchAll(/\bx-([a-z0-9-]+)/g)].map(m => m[1]))], objects: [...s.matchAll(/<(?:path|rect|circle|ellipse|polygon|line|use)\b/g)].length }; }) }));
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(inventory, null, 2));
console.table(inventory.map(({id,count,full}) => ({pack:id,items:count,full,mini:count-full})));
console.log('Total:', inventory.reduce((n,p)=>n+p.count,0), 'items;', inventory.reduce((n,p)=>n+p.full,0), 'full-screen scenes');
