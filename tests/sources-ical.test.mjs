// iCal sources (lib/ical.mjs): the safe fetch, the parser, RRULE expansion and
// time zones, and the calendar-source fetch (lib/calendar-sources.mjs). No network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { parseIcal, expandIcal, parseRrule, parseDuration, zonedToUtc, resolveZone, isPrivateAddress, fetchIcal } from '../lib/ical.mjs';
import { fetchCalendarSource } from '../lib/calendar-sources.mjs';

const ICS = [
  'BEGIN:VCALENDAR', 'VERSION:2.0', 'X-WR-CALNAME:Uni timetable', 'X-WR-TIMEZONE:Europe/London',
  'BEGIN:VTIMEZONE', 'TZID:Europe/London', 'BEGIN:DAYLIGHT', 'DTSTART:19700329T010000', 'END:DAYLIGHT', 'END:VTIMEZONE',
  'BEGIN:VEVENT', 'UID:weekly-1@test', 'SUMMARY:Lecture\\, CHE101', 'DTSTART;TZID=Europe/London:20261012T090000', 'DTEND;TZID=Europe/London:20261012T100000',
  'RRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=6', 'EXDATE;TZID=Europe/London:20261014T090000', 'LOCATION:Room 1',
  'DESCRIPTION:Bring <b>notes</b>\\nand a pen', 'ATTENDEE;CN="Sam, Lee";PARTSTAT=ACCEPTED:mailto:sam@uni.example', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:weekly-1@test', 'RECURRENCE-ID;TZID=Europe/London:20261019T090000', 'SUMMARY:Lecture moved',
  'DTSTART;TZID=Europe/London:20261019T140000', 'DTEND;TZID=Europe/London:20261019T150000', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:monthly@test', 'SUMMARY:Last Friday review', 'DTSTART:20261030T150000Z', 'DURATION:PT30M',
  'RRULE:FREQ=MONTHLY;BYDAY=-1FR;UNTIL=20270131T235959Z', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:allday@test', 'SUMMARY:Reading week', 'DTSTART;VALUE=DATE:20261102', 'DTEND;VALUE=DATE:20261107', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:bad@test', 'SUMMARY:Odd rule', 'DTSTART:20261015T120000Z', 'RRULE:FREQ=HOURLY;COUNT=3', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:dst@test', 'SUMMARY:Daily standup', 'DTSTART;TZID=GMT Standard Time:20261023T093000',
  'DTEND;TZID=GMT Standard Time:20261023T094500', 'RRULE:FREQ=DAILY;INTERVAL=2;COUNT=4', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:cancelled@test', 'STATUS:CANCELLED', 'SUMMARY:Gone', 'DTSTART:20261020T100000Z', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:yearly@test', 'SUMMARY:Birthday', 'DTSTART;VALUE=DATE:20200110', 'RRULE:FREQ=YEARLY', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:until-date@test', 'SUMMARY:Weekly till date', 'DTSTART:20261001T080000Z', 'DTEND:20261001T083000Z', 'RRULE:FREQ=WEEKLY;UNTIL=20261015', 'END:VEVENT',
  'END:VCALENDAR'].join('\r\n');

const at = (r, title) => r.events.filter(e => e.summary === title).map(e => e.start.dateTime || e.start.date);

test('parseIcal: unfolding, escapes, quoted params, nested blocks ignored', () => {
  const folded = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:x\r\nSUMMARY:A very long\r\n  title\r\nDTSTART:20261001T100000Z\r\nBEGIN:VALARM\r\nSUMMARY:Alarm text\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR';
  const p = parseIcal(folded);
  assert.equal(p.events.length, 1);
  assert.equal(p.events[0].SUMMARY, 'A very long title', 'folded lines join; the alarm does not overwrite it');
  const q = parseIcal(ICS);
  assert.equal(q.name, 'Uni timetable');
  assert.equal(q.timezone, 'Europe/London');
  assert.equal(q.events[0].ATTENDEE[0].params.CN, 'Sam, Lee');
});

test('expandIcal: weekly BYDAY + COUNT + EXDATE + a moved occurrence, across the clocks going back', () => {
  const r = expandIcal(parseIcal(ICS), { from: '2026-10-01', to: '2027-02-28', timeZone: 'Europe/London', calendarId: 'calendar-uni/feed' });
  // Mon 12, (Wed 14 excluded), Mon 19 moved to 14:00, Wed 21, Mon 26, Wed 28: six occurrences counted, five shown.
  assert.deepEqual(at(r, 'Lecture, CHE101'), ['2026-10-12T08:00:00.000Z', '2026-10-21T08:00:00.000Z', '2026-10-26T09:00:00.000Z', '2026-10-28T09:00:00.000Z']);
  assert.deepEqual(at(r, 'Lecture moved'), ['2026-10-19T13:00:00.000Z']);
  const lec = r.events.find(e => e.summary === 'Lecture, CHE101');
  assert.equal(lec.location, 'Room 1');
  assert.equal(lec.description, 'Bring notes\nand a pen', 'HTML stripped, line breaks kept');
  assert.equal(lec.attendees[0].email, 'sam@uni.example');
  assert.equal(lec.attendees[0].response, 'accepted');
  assert.equal(lec.calendarId, 'calendar-uni/feed');
  assert.equal(lec.recurring, true);
  assert.equal(lec.iCalUID, 'weekly-1@test');
  // Windows zone name, every other day, 09:30 local before and after 25 Oct.
  assert.deepEqual(at(r, 'Daily standup'), ['2026-10-23T08:30:00.000Z', '2026-10-25T09:30:00.000Z', '2026-10-27T09:30:00.000Z', '2026-10-29T09:30:00.000Z']);
  assert.deepEqual(at(r, 'Last Friday review'), ['2026-10-30T15:00:00.000Z', '2026-11-27T15:00:00.000Z', '2026-12-25T15:00:00.000Z', '2027-01-29T15:00:00.000Z']);
  assert.equal(r.events.find(e => e.summary === 'Last Friday review').end.dateTime, '2026-10-30T15:30:00.000Z', 'DURATION');
  assert.deepEqual(at(r, 'Reading week'), ['2026-11-02']);
  assert.equal(r.events.find(e => e.summary === 'Reading week').end.date, '2026-11-07');
  assert.deepEqual(at(r, 'Odd rule'), ['2026-10-15T12:00:00.000Z'], 'an unreadable rule keeps only its first date');
  assert.equal(r.skippedRules, 1);
  assert.deepEqual(at(r, 'Gone'), []);
  assert.deepEqual(at(r, 'Birthday'), ['2027-01-10'], 'yearly from 2020, only the one in range');
  assert.deepEqual(at(r, 'Weekly till date'), ['2026-10-01T08:00:00.000Z', '2026-10-08T08:00:00.000Z', '2026-10-15T08:00:00.000Z'], 'a date-only UNTIL includes that day');
  const ids = r.events.map(e => e.id);
  assert.equal(new Set(ids).size, ids.length, 'every occurrence has its own id');
  assert.ok(ids.every(id => /^ic[0-9a-f]{20}$/.test(id)));
  // Same input, same ids (notes and links on an event survive a refresh).
  assert.deepEqual(expandIcal(parseIcal(ICS), { from: '2026-10-01', to: '2027-02-28', timeZone: 'Europe/London' }).events.map(e => e.id), ids);
});

test('RRULE parts and helpers', () => {
  assert.equal(parseRrule('FREQ=HOURLY'), null);
  assert.equal(parseRrule('FREQ=WEEKLY;BYSETPOS=1'), null, 'parts we cannot read safely');
  assert.equal(parseRrule('FREQ=MONTHLY;BYDAY=XX'), null);
  assert.deepEqual(parseRrule('FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=-1').bymonthday, [-1]);
  const r = expandIcal(parseIcal('BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:m\nSUMMARY:Rent\nDTSTART;VALUE=DATE:20260131\nRRULE:FREQ=MONTHLY;BYMONTHDAY=-1;COUNT=4\nEND:VEVENT\nEND:VCALENDAR'), { from: '2026-01-01', to: '2026-12-31' });
  assert.deepEqual(at(r, 'Rent'), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  const m31 = expandIcal(parseIcal('BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:m31\nSUMMARY:Day 31\nDTSTART;VALUE=DATE:20260131\nRRULE:FREQ=MONTHLY;COUNT=3\nEND:VEVENT\nEND:VCALENDAR'), { from: '2026-01-01', to: '2026-12-31' });
  assert.deepEqual(at(m31, 'Day 31'), ['2026-01-31', '2026-03-31', '2026-05-31'], 'months without a 31st are skipped');
  assert.equal(parseDuration('PT1H30M'), 5400000);
  assert.equal(parseDuration('P1W'), 7 * 86400000);
  assert.equal(parseDuration('nonsense'), null);
  assert.equal(new Date(zonedToUtc(2026, 7, 1, 12, 0, 0, 'Europe/London')).toISOString(), '2026-07-01T11:00:00.000Z');
  assert.equal(new Date(zonedToUtc(2026, 1, 15, 9, 0, 0, 'America/New_York')).toISOString(), '2026-01-15T14:00:00.000Z');
  assert.equal(resolveZone('W. Europe Standard Time'), 'Europe/Berlin');
  assert.equal(resolveZone('/freeassociation.sourceforge.net/Europe/Paris'), 'Europe/Paris');
  assert.equal(resolveZone('Not/AZone'), null);
});

test('isPrivateAddress: loopback, private, link-local, CGNAT, multicast, IPv6 local and mapped', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', '::', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1', 'not-an-ip']) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  for (const ip of ['8.8.8.8', '172.32.0.1', '151.101.1.1', '2a00:1450:4009::200e']) assert.equal(isPrivateAddress(ip), false, ip);
});

/** A fake https.request: replies from a table {url: {status, headers, body}}. */
function fakeRequest(table, seen = []) {
  return (url, opts, cb) => {
    const req = new EventEmitter();
    req.destroy = () => {};
    req.end = () => {
      seen.push({ url: String(url), lookup: typeof opts.lookup });
      const r = table[String(url)];
      setImmediate(() => {
        if (!r) return req.emit('error', Object.assign(new Error('nope'), { code: 'ENOTFOUND' }));
        const res = new EventEmitter();
        res.statusCode = r.status || 200; res.headers = r.headers || {}; res.resume = () => {};
        cb(res);
        if (res.statusCode === 200) { for (const c of [].concat(r.body || '')) res.emit('data', Buffer.from(c)); res.emit('end'); }
      });
    };
    return req;
  };
}

test('fetchIcal: https only, no credentials, no private hosts, at most 3 redirects, a size cap; the safe lookup is always used', async () => {
  for (const [u, code] of [['http://cal.example/a.ics', 'BAD_URL'], ['file:///etc/passwd', 'BAD_URL'], ['https://u:p@cal.example/a.ics', 'BAD_URL'],
    ['https://127.0.0.1/a.ics', 'PRIVATE_ADDRESS'], ['https://[::1]/a.ics', 'PRIVATE_ADDRESS'], ['https://localhost/a.ics', 'PRIVATE_ADDRESS'], ['https://router.local/a.ics', 'PRIVATE_ADDRESS']]) {
    await assert.rejects(fetchIcal(u, { requestFn: fakeRequest({}) }), e => e.code === code, u);
  }
  const seen = [];
  const ok = await fetchIcal('webcal://cal.example/a.ics', { requestFn: fakeRequest({
    'https://cal.example/a.ics': { status: 302, headers: { location: '/b.ics' } },
    'https://cal.example/b.ics': { body: ['BEGIN:VCALENDAR\r\n', 'END:VCALENDAR'] },
  }, seen) });
  assert.equal(ok.finalUrl, 'https://cal.example/b.ics');
  assert.match(ok.text, /BEGIN:VCALENDAR/);
  assert.ok(seen.every(s => s.lookup === 'function'), 'every hop resolves through the private-address check');
  await assert.rejects(fetchIcal('https://cal.example/a.ics', { requestFn: fakeRequest({ 'https://cal.example/a.ics': { status: 302, headers: { location: 'https://10.0.0.5/x.ics' } } }) }), e => e.code === 'PRIVATE_ADDRESS', 'a redirect into the network is refused');
  await assert.rejects(fetchIcal('https://cal.example/a.ics', { requestFn: fakeRequest({ 'https://cal.example/a.ics': { status: 302, headers: { location: 'http://cal.example/b.ics' } } }) }), e => e.code === 'BAD_URL');
  const loop = {};
  for (let i = 0; i < 6; i++) loop[`https://cal.example/${i}.ics`] = { status: 301, headers: { location: `/${i + 1}.ics` } };
  await assert.rejects(fetchIcal('https://cal.example/0.ics', { requestFn: fakeRequest(loop) }), e => e.code === 'TOO_MANY_REDIRECTS');
  await assert.rejects(fetchIcal('https://cal.example/big.ics', { maxBytes: 100, requestFn: fakeRequest({ 'https://cal.example/big.ics': { body: ['x'.repeat(60), 'y'.repeat(60)] } }) }), e => e.code === 'TOO_LARGE');
  await assert.rejects(fetchIcal('https://cal.example/big.ics', { maxBytes: 100, requestFn: fakeRequest({ 'https://cal.example/big.ics': { headers: { 'content-length': '999999' }, body: 'x' } }) }), e => e.code === 'TOO_LARGE');
  await assert.rejects(fetchIcal('https://cal.example/404.ics', { requestFn: fakeRequest({ 'https://cal.example/404.ics': { status: 404 } }) }), e => e.code === 'HTTP_404');
});

test('fetchCalendarSource (iCal): one calendar per feed, its name, warnings, switched off means no events', async () => {
  const src = { id: 'calendar-uni-0001', capability: 'calendar', kind: 'ical', label: 'Uni', url: 'https://cal.example/a.ics', accounts: [] };
  const r = await fetchCalendarSource(src, { from: '2026-10-01', to: '2026-10-31', timeZone: 'Europe/London', fetchFn: async () => ({ text: ICS }) });
  assert.deepEqual(r.calendars, [{ id: 'feed', name: 'Uni timetable' }]);
  assert.ok(r.count > 5);
  assert.ok(r.events.every(e => e.calendarId === 'calendar-uni-0001/feed'));
  assert.equal(r.warnings.length, 1);
  const off = await fetchCalendarSource({ ...src, accounts: [{ id: 'feed', name: 'x', enabled: false }] }, { from: '2026-10-01', to: '2026-10-31', fetchFn: async () => ({ text: ICS }) });
  assert.equal(off.events.length, 0);
  await assert.rejects(fetchCalendarSource(src, { from: '2026-10-01', to: '2026-10-31', fetchFn: async () => ({ text: '<html>login</html>' }) }), e => e.code === 'NOT_ICAL');
});
