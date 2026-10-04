// tools/fake-trip.mjs - a FAKE trip for the travel features' tests and screenshots
// (travel spec 7.3). Owner: TRIPS. Used by tools/make-fake-data.mjs --trip.
//
//   addFakeTrip(data, {t0, homeZone})   mutates buildFakeData()'s result:
//     - an upcoming week in Tokyo: "BA 7 LHR → HND" tomorrow evening (start and end in
//       their own zones, as Gmail-made flight events are), a hotel with a location, a
//       meeting with guests that falls at night in Tokyo, the flight back "BA 8 HND → LHR";
//     - a past long weekend in Lisbon (about 3 weeks ago): both flights, and card payments
//       there in euros (memos with the original amount and the bank's rate), a cash
//       withdrawal, the card's non-sterling fees and an online biller billed from Ireland
//       (which must never count as travel).
// Everything is invented: merchants, places and amounts are generic; times are wall times
// in the home zone (Europe/London unless given) and the destination's zone.

const pad = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/** Minutes east of UTC of a zone at an instant. */
function offsetMin(ms, zone) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(new Date(ms)).filter(x => x.type !== 'literal').map(x => [x.type, Number(x.value)]));
  return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute) - Math.floor(ms / 60000) * 60000) / 60000);
}
/** {dateTime: 'YYYY-MM-DDTHH:MM:00+HH:MM', timeZone} for a wall time in a zone. */
function at(dateIso, hm, zone) {
  const [y, m, d] = dateIso.split('-').map(Number);
  const [h, mi] = hm.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let off = offsetMin(guess, zone);
  off = offsetMin(guess - off * 60000, zone);
  const a = Math.abs(off);
  return { dateTime: `${dateIso}T${pad(h)}:${pad(mi)}:00${off >= 0 ? '+' : '-'}${pad(Math.floor(a / 60))}:${pad(a % 60)}`, timeZone: zone };
}

export function addFakeTrip(data, { t0, homeZone = 'Europe/London' } = {}) {
  const cal = data.calendar.events;
  const self = { email: 'you@example.com', self: true, responseStatus: 'accepted' };
  const day = (n) => isoOf(addDays(t0, n));
  const push = (e) => cal.push(Object.assign({ calendarId: 'you@example.com', status: 'confirmed' }, e));
  // Upcoming: Tokyo, tomorrow evening for 6 nights.
  push({ id: 'demo-trip-out', summary: 'BA 7 LHR → HND', location: 'London Heathrow (LHR)', start: at(day(1), '19:00', homeZone), end: at(day(2), '16:55', 'Asia/Tokyo') });
  push({ id: 'demo-trip-hotel', summary: 'Hotel: Shinjuku', location: 'Shinjuku, Tokyo, Japan', start: { date: day(2) }, end: { date: day(7) } });
  push({ id: 'demo-trip-meet', summary: 'Launch sync with Priya', start: at(day(3), '16:00', homeZone), end: at(day(3), '16:30', homeZone),
    attendees: [self, { email: 'priya.shah@example.com', name: 'Priya Shah', responseStatus: 'accepted' }], hangoutLink: 'https://meet.google.com/trp-sync-abc' });
  push({ id: 'demo-trip-back', summary: 'BA 8 HND → LHR', start: at(day(7), '11:25', 'Asia/Tokyo'), end: at(day(7), '15:35', homeZone) });
  // Past: Lisbon, a long weekend about three weeks ago.
  push({ id: 'demo-lis-out', summary: 'Flight to Lisbon (TP 1353)', start: at(day(-24), '07:40', homeZone), end: at(day(-24), '10:20', 'Europe/Lisbon') });
  push({ id: 'demo-lis-back', summary: 'TP 1352 LIS → LHR', start: at(day(-21), '18:05', 'Europe/Lisbon'), end: at(day(-21), '20:45', homeZone) });
  cal.sort((a, b) => String(a.start.dateTime || a.start.date).localeCompare(String(b.start.dateTime || b.start.date)));

  // Card payments in Lisbon (the bank charges in pounds; the memo keeps the euros and the rate).
  const fin = data.finance;
  if (!fin || !fin.analysis) return data;
  const rows = [
    [-24, 'Eating out', 'Pastelaria Central', -11.12, 'PASTELARIA CENTRAL LISBOA PRT EUR 12.80 @ 1.1511'],
    [-24, 'Bank charges', 'Non-sterling fee', -0.31, 'NON-STERLING TRANSACTION FEE'],
    [-23, 'Transport', 'Metro Lisboa', -5.82, 'METRO LISBOA PRT EUR 6.70 @ 1.1512'],
    [-23, 'Cash', 'Cash withdrawal', -43.44, 'CASH WITHDRAWAL MULTIBANCO LISBOA PRT EUR 50.00 @ 1.1510'],
    [-22, 'Eating out', 'Tasca do Rio', -33.88, 'TASCA DO RIO LISBOA PRT EUR 39.00 @ 1.1511'],
    [-22, 'Bank charges', 'Non-sterling fee', -0.93, 'NON-STERLING TRANSACTION FEE'],
    [-22, 'Subscriptions', 'Cloud Notes', -7.99, 'CLOUDNOTES.COM DUBLIN IE'],
    [-21, 'Shopping', 'Mercado Market', -18.17, 'MERCADO MARKET LISBOA PRT EUR 20.90 @ 1.1503'],
  ];
  const tx = fin.analysis.transactions;
  const lines = [];
  for (const [d, c, m, a, memo] of rows) {
    tx.push({ d: day(d), m, c, a, acct: 'demo-current', memo, how: 'rule', bc: null, k: `demo-trip-${tx.length}` });
    fin.overrides[memo.toUpperCase()] = c;
    lines.push([day(d), a.toFixed(2), 'demo-current', '', `"${memo}"`, 'demo'].join(','));
  }
  tx.sort((a, b) => b.d.localeCompare(a.d));
  for (const c of ['Bank charges', 'Cash']) if (!fin.analysis.categories.includes(c)) fin.analysis.categories.push(c);
  fin.analysis.categories.sort();
  fin.csv += lines.join('\r\n') + '\r\n';
  return data;
}
