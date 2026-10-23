// The live-sync address book (lib/sync/live/addrbook.mjs): what kind of
// address is what, which endpoints a computer publishes, what is accepted
// from a peer's record, and the order to try a peer's endpoints in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyAddress, parseV6, endpointsFrom, cleanAddressRecord, dialOrder, endpointsKey, pathOf, plainAddress, sameSubnet } from '../lib/sync/live/addrbook.mjs';

test('addresses are classified: private, carrier-grade NAT, loopback, link-local, unique-local, global, nonsense', () => {
  const cases = {
    '192.168.1.20': 'private', '10.1.2.3': 'private', '172.16.0.1': 'private', '172.32.0.1': 'global', '100.64.0.1': 'cgnat', '100.128.0.1': 'global',
    '127.0.0.1': 'loopback', '169.254.3.4': 'linklocal', '8.8.8.8': 'global', '0.0.0.0': 'invalid', '224.0.0.1': 'invalid', '203.0.113.9': 'invalid', '256.1.1.1': 'invalid',
    '::1': 'loopback', 'fe80::1%12': 'linklocal', 'fd12:3456::1': 'ula', '2a00:23c5:1::7': 'global', '2001:db8::1': 'invalid', '::ffff:192.168.0.4': 'private', 'ff02::1': 'invalid', 'nope': 'invalid', '1:2:3:4:5:6:7:8:9': 'invalid',
  };
  for (const [a, want] of Object.entries(cases)) assert.equal(classifyAddress(a), want, a);
  assert.deepEqual(parseV6('2a00::1'), [0x2a00, 0, 0, 0, 0, 0, 0, 1]);
  assert.deepEqual(parseV6('::ffff:1.2.3.4'), [0, 0, 0, 0, 0, 0xffff, 0x0102, 0x0304]);
  assert.equal(plainAddress('::ffff:10.0.0.2'), '10.0.0.2');
  assert.equal(pathOf('::ffff:192.168.1.9'), 'lan'); assert.equal(pathOf('81.2.3.4'), 'internet');
  assert.ok(sameSubnet('192.168.1.20', '192.168.1.99', 24)); assert.ok(!sameSubnet('192.168.1.20', '192.168.2.20', 24));
});

test('a computer publishes its LAN addresses, global IPv6 and the router mapping; never loopback or link-local', () => {
  const ifs = [
    { address: '127.0.0.1', family: 'IPv4', netmask: '255.0.0.0', internal: true },
    { address: '192.168.1.20', family: 'IPv4', netmask: '255.255.255.0', internal: false },
    { address: 'fe80::1c2b', family: 'IPv6', netmask: 'ffff:ffff:ffff:ffff::', internal: false },
    { address: '2a00:23c5:1::7', family: 'IPv6', netmask: 'ffff:ffff:ffff:ffff::', internal: false },
    { address: 'fd00::5', family: 'IPv6', netmask: 'ffff:ffff:ffff:ffff::', internal: false },
  ];
  const eps = endpointsFrom({ interfaces: ifs, port: 41731, mapped: { address: '81.2.3.4', port: 41800 } });
  assert.deepEqual(eps, [{ k: 'lan', a: '192.168.1.20', p: 41731, m: 24 }, { k: 'v6', a: '2a00:23c5:1::7', p: 41731 }, { k: 'lan6', a: 'fd00::5', p: 41731 }, { k: 'wan', a: '81.2.3.4', p: 41800 }]);
  assert.deepEqual(endpointsFrom({ interfaces: ifs, port: 1, mapped: { address: '100.64.0.9', port: 1 } }).filter(e => e.k === 'wan'), [], 'a CGNAT address is not a way in');
  assert.equal(endpointsKey(eps), endpointsKey([...eps].reverse()), 'order does not matter for "did it change"');
});

test("a peer's record is checked: bad kinds, ports, link-local and odd values are dropped", () => {
  const r = cleanAddressRecord({ v: 1, port: 41731, eps: [{ k: 'lan', a: '192.168.1.20', p: 41731, m: 24 }, { k: 'lan', a: 'fe80::1', p: 1 }, { k: 'evil', a: '1.2.3.4', p: 1 }, { k: 'wan', a: '81.2.3.4', p: 70000 }, { k: 'wan', a: 'x'.repeat(100), p: 1 }, null], nat: { state: 'mapped' }, at: 5 });
  assert.deepEqual(r.eps, [{ k: 'lan', a: '192.168.1.20', p: 41731, m: 24 }]);
  assert.equal(r.nat.state, 'mapped');
  assert.equal(cleanAddressRecord({ v: 2 }), null);
  assert.equal(cleanAddressRecord(null), null);
});

test('dialling order: heard on this network now, then the same subnet, then the internet, a foreign private address last', () => {
  const peer = [{ k: 'lan', a: '192.168.1.20', p: 41731, m: 24 }, { k: 'v6', a: '2a00::7', p: 41731 }, { k: 'wan', a: '81.2.3.4', p: 41800 }, { k: 'lan6', a: 'fd00::5', p: 41731 }];
  const home = [{ address: '192.168.1.33', netmask: '255.255.255.0' }];
  const office = [{ address: '10.20.30.40', netmask: '255.255.0.0' }];
  assert.deepEqual(dialOrder(peer, { mine: home }).map(e => e.a), ['192.168.1.20', '81.2.3.4', '2a00::7', 'fd00::5']);
  assert.deepEqual(dialOrder(peer, { mine: office }).map(e => e.a), ['81.2.3.4', '2a00::7', '192.168.1.20', 'fd00::5'], 'at the office the home LAN address is worth little');
  const heard = dialOrder(peer, { mine: office, heard: [{ a: '10.20.1.9', p: 41731, at: 1 }] });
  assert.equal(heard[0].a, '10.20.1.9'); assert.equal(heard[0].via, 'heard');
  assert.equal(dialOrder(peer, { heard: [{ a: '192.168.1.20', p: 41731 }] }).filter(e => e.a === '192.168.1.20').length, 1, 'no address twice');
});
