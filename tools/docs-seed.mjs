// Seeds a FAKE sandbox data folder with what make-fake-data does not: expenses, friends (with profiles and a few
// feed items), so the README screenshots have something to show. Sandbox only: refuses the owner's real folders.
//   node tools/docs-capture.mjs --seed C:/tmp/sbx-docs        (stop the server first, then start it again)
import { resolve, join } from 'node:path';
import { rm } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { createExpense, submitClaim, markPaid, setPayer } from '../lib/expenses.mjs';
import { newIdentity } from '../lib/friends/core.mjs';
import { updateDoc } from '../lib/friends/store.mjs';

const iso = (d) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);

export async function seed(dir) {
  dir = resolve(dir);
  if (!/sbx|sandbox|tmp/i.test(dir) || /OneDrive|Documents/i.test(dir)) throw new Error('docs-seed only writes to a throwaway sandbox folder: ' + dir);
  const today = iso(0);
  await rm(join(dir, 'expenses'), { recursive: true, force: true });   // seeding twice must not double the list

  // ---- expenses: a mix of to claim, submitted and paid
  await setPayer(dir, 'Northwind Ltd', { match: ['NORTHWIND'], deadline: { mode: 'monthEnd' } }, { today });
  const rows = [
    ['Train to client workshop', 48.6, 3, 'Northwind Ltd', 'Rail', 'Avanti Rail'],
    ['Team lunch with the client', 86.4, 5, 'Northwind Ltd', 'Meals', 'Pret A Manger'],
    ['Taxi from the station', 18.2, 5, 'Northwind Ltd', 'Travel', 'Uber'],
    ['Conference ticket', 240, 12, 'Northwind Ltd', 'Training', 'DevDays'],
    ['Hotel, one night', 119, 18, 'Northwind Ltd', 'Accommodation', 'Premier Inn'],
    ['Printer paper and pens', 22.35, 25, 'Northwind Ltd', 'Supplies', 'Staples'],
    ['Dinner for the offsite', 64, 9, 'Birch & Co', 'Meals', 'The Crown'],
    ['Coworking day pass', 15, 14, 'Birch & Co', 'Workspace', 'Desk Club'],
    ['Domain renewal', 11.99, 30, 'Side project', 'Software', 'Namecheap'],
  ];
  const ids = [];
  for (const [title, amount, ago, payer, category, merchant] of rows) {
    const r = await createExpense(dir, { title, amount, date: iso(ago), payer, category, merchant, source: { type: 'manual' } }, { today });
    if (r.id) ids.push(r.id);
  }
  if (ids.length >= 9) {
    await submitClaim(dir, [ids[3], ids[4]], { payer: 'Northwind Ltd', method: 'email', date: iso(8), today });
    await submitClaim(dir, [ids[6]], { payer: 'Birch & Co', method: 'portal', date: iso(7), today });
    await markPaid(dir, [ids[6]], { date: iso(2), today });
    await markPaid(dir, [ids[8]], { date: iso(10), today });
  }

  for (const f of ['spaces.json', 'spaces-clock.json']) await rm(join(dir, 'friends', f), { force: true });   // the Together shot makes a space

  // ---- friends: made-up people with their own (invented) keys; no relay, so nothing is ever sent
  const people = [
    { name: 'Sam Rivera', pronouns: 'he/him', emoji: '🎧', status: 'Deep in a podcast edit', bio: 'Audio engineer, tea drinker, terrible at chess.', city: 'Leeds', color: '#e07a5f', working: 'Season 2 mix' },
    { name: 'Priya Nair', pronouns: 'she/her', emoji: '🌱', status: 'Repotting everything', bio: 'Data analyst. Weekend gardener. Will trade cuttings.', city: 'Bristol', color: '#3d9a6a', working: 'Quarterly report' },
    { name: 'Jonas Weber', pronouns: 'he/him', emoji: '🚲', status: 'Out on a long ride', bio: 'Designer who cycles to every meeting he can.', city: 'Berlin', color: '#5b8def' },
    { name: 'Mia Chen', pronouns: 'she/her', emoji: '📚', status: 'Revision week', bio: 'Second-year medic. Flashcards for breakfast.', city: 'Glasgow', color: '#a06cd5', working: 'Anatomy flashcards' },
  ];
  const made = [];
  for (const p of people) { const i = await newIdentity(); made.push({ id: i.id, x: i.x.pub, ed: i.ed.pub, p }); }
  const now = Date.now();
  await updateDoc(dir, 'friends', (doc) => {
    doc.friends = {};
    made.forEach((m, k) => { doc.friends[m.id] = { id: m.id, x: m.x, ed: m.ed, name: m.p.name, status: 'friend', role: 'r', how: 'code', relay: null, addedAt: now - (40 - k * 7) * 864e5, friendsAt: now - (40 - k * 7) * 864e5, updatedAt: now }; });
    return doc;
  });
  await updateDoc(dir, 'shared', (doc) => {
    doc.items = {};
    made.forEach((m, k) => { doc.items[m.id + '|profile'] = { f: m.id, k: 'profile', at: now - k * 3600e3, lc: now - k * 3600e3, b: { ...m.p, at: now - k * 3600e3 } }; });
    return doc;
  });
  await updateDoc(dir, 'local', (doc) => {
    made.forEach((m, k) => { if (k !== 3) doc.presence[m.id] = { s: k === 1 ? 'focusing' : 'online', at: now, ttl: null }; });
    return doc;
  });
  await updateDoc(dir, 'feed', (doc) => {
    doc.msgs = {};
    made.forEach((m, k) => {
      const mid = randomBytes(16).toString('hex');
      doc.msgs[mid] = { id: mid, f: m.id, dir: 'in', k: 'profile', at: now - k * 3600e3, lc: now - k * 3600e3, b: { ...m.p, at: now - k * 3600e3 } };
    });
    return doc;
  });
  console.log(`  seeded ${ids.length} expenses and ${made.length} fake friends in ${dir}`);
}
