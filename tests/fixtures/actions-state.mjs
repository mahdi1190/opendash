// A small synthetic dashboard (generic names only) for the actions/MCP tests.
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export const TODAY = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function sampleState() {
  const t = (id, title, extra = {}) => ({ id, title, dueDate: null, priority: 'p0', tags: [], stream: 'work', detail: '', subtasks: [], recurrence: 'none', people: [], ...extra });
  return {
    _lastSave: 1000,
    view: 'today', selectedTaskId: null, theme: 'light',
    streams: [
      { id: 'work', label: 'Work', color: '#2563eb', order: 0, archived: false },
      { id: 'thesis', label: 'Thesis', color: '#7c3aed', order: 1, archived: false },
      { id: 'personal', label: 'Personal', color: '#6b7280', order: 2, archived: false },
    ],
    people: [
      { id: 'sam', name: 'Sam Taylor', email: 'sam@example.com', role: 'supervisor', color: '#2563eb', aliases: ['samt'] },
      { id: 'alex', name: 'Alex Kim', email: '', role: 'colleague', color: '#059669', aliases: [] },
      { id: 'me', name: 'Test User (you)', email: '', role: '', color: '#6b7280', aliases: [], self: true },
    ],
    custom: [
      t('u-1-aaa', 'Email Sam about chapter corrections', { dueDate: addDays(TODAY, 1), priority: 'p1', tags: ['email', 'corrections'], stream: 'thesis', people: ['sam'], subtasks: [{ id: 'st-1', title: 'Draft reply', done: false, ts: 1 }] }),
      t('u-2-bbb', 'Prepare slides for group meeting', { dueDate: addDays(TODAY, 8), priority: 'p2', tags: ['presentation'], stream: 'work', people: ['alex'] }),
      t('u-3-ccc', 'Pay council tax', { dueDate: addDays(TODAY, -2), tags: ['admin', 'money'], stream: 'personal' }),
      t('u-4-ddd', 'Weekly review', { dueDate: TODAY, recurrence: 'weekly', stream: 'personal' }),
      t('u-5-eee', 'Read chapter three draft', { dueDate: addDays(TODAY, 9), tags: ['writing'], stream: 'thesis', people: ['sam'] }),
      t('t-seed-1', 'Old seed task', { stream: 'work', tags: ['admin'] }),
      t('u-6-fff', 'Finished thing', { stream: 'work', tags: ['email'] }),
    ],
    statuses: { 'u-6-fff': 'done' },
    pinned: {}, notes: { 'u-1-aaa': [{ id: 'n-1', ts: 1, text: 'Sam prefers Thursday' }] },
    deleted: {}, bin: { tasks: [], notes: [] }, completionLog: {}, taskActivity: {},
    countdowns: [{ id: 'cd-1', label: 'Submission', date: addDays(TODAY, 60) }, { id: 'cd-2', label: 'Holiday', date: addDays(TODAY, 20) }],
  };
}

/** A fresh data dir with config + the sample state. */
export function makeDataDir(state = sampleState()) {
  const dir = mkdtempSync(join(tmpdir(), 'actions-test-'));
  mkdirSync(join(dir, 'state'), { recursive: true });
  writeFileSync(join(dir, 'config.json'), JSON.stringify({ userName: 'Test', timezone: 'Europe/London', weekStart: 'Mon' }));
  writeFileSync(join(dir, 'state', 'dashboard-state.json'), JSON.stringify(state));
  mkdirSync(join(dir, 'calendar'), { recursive: true });
  writeFileSync(join(dir, 'calendar', 'calendar.json'), JSON.stringify({ fetchedAt: new Date().toISOString(), events: [
    { id: 'e1', summary: 'Group meeting', start: { dateTime: `${TODAY}T10:00:00Z` }, end: { dateTime: `${TODAY}T11:00:00Z` } },
    { id: 'e2', summary: 'Conference', start: { date: addDays(TODAY, 3) }, end: { date: addDays(TODAY, 5) } },
    { id: 'e3', summary: 'Far away', start: { date: addDays(TODAY, 40) }, end: { date: addDays(TODAY, 41) } },
  ] }));
  mkdirSync(join(dir, 'finance', '_system'), { recursive: true });
  writeFileSync(join(dir, 'finance', '_system', 'analysis.json'), JSON.stringify({
    latest_transaction: TODAY, stale_days: 0,
    week: { start: TODAY, end: TODAY, total: 120.5, avg_prev: 100, by_category: { Groceries: 80, Transport: 40.5 } },
    month: { label: 'This month', mtd: 900, last_month_to_date: 850, last_month_full: 1500, by_category: { Rent: 700, Groceries: 200 }, avg3_by_category: {} },
    income_month: 2000, recurring: [{ merchant: 'Some Shop', monthly_cost: 10 }], recurring_monthly_total: 10,
    flags: [{ merchant: 'X', amount: 5 }], uncategorised_merchants: ['A', 'B'],
    balances: [{ acct: '1', name: 'Current', balance: 1234.5, currency: 'GBP' }], transactions: [{ merchant: 'Secret Shop', amount: 9 }],
  }));
  return dir;
}
