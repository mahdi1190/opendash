// Personal or work OneDrive (lib/onedrive.mjs): %OneDrive% names the account
// added LAST (on a computer with both, often the work one), %OneDriveConsumer%
// the personal one, %OneDriveCommercial% the work one ("OneDrive - <Org>").
// Personal data is never put into a work or school OneDrive by default: sync
// picks a personal folder or asks, and the banner warns when the data folder
// already is in one. Synthetic paths only (Contoso is Microsoft's placeholder).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { oneDriveRoots, personalOneDrive, oneDriveOf, oneDriveLabel, kindFromName } from '../lib/onedrive.mjs';
import { createStateStore } from '../server/state-store.mjs';
import { createNodeSyncEngine } from '../lib/sync/node-host.mjs';

const W = 'C:\\Users\\sam\\OneDrive - Contoso', P = 'C:\\Users\\sam\\OneDrive';
const base = mkdtempSync(join(tmpdir(), 'od-onedrive-'));
after(() => rmSync(base, { recursive: true, force: true }));

test('which OneDrive: personal first, work or school marked, from the environment or the folder name', () => {
  const thisPc = { OneDrive: W, OneDriveCommercial: W, OneDriveConsumer: P };
  assert.deepEqual(oneDriveRoots(thisPc), [{ path: P, work: false, org: null }, { path: W, work: true, org: 'Contoso' }]);
  assert.equal(personalOneDrive(thisPc), P, '%OneDrive% is the work one here: the personal one is %OneDriveConsumer%');
  assert.equal(personalOneDrive({ OneDrive: W, OneDriveCommercial: W }), null, 'only a work OneDrive: no personal one');
  assert.equal(personalOneDrive({ OneDrive: W }), null, 'known as work from its name alone');
  assert.equal(personalOneDrive({ OneDrive: P }), P);
  assert.deepEqual(oneDriveOf(W + '\\Documents\\OpenDash\\data', thisPc), { work: true, org: 'Contoso', root: W });
  assert.deepEqual(oneDriveOf(P + '\\Documents\\OpenDash', thisPc), { work: false, org: null, root: P });
  assert.equal(oneDriveOf('D:\\Data\\OpenDash', thisPc), null);
  assert.equal(oneDriveOf('/Users/sam/Library/CloudStorage/OneDrive-Contoso/OpenDash', {}).work, true);
  assert.equal(oneDriveOf('/Users/sam/Library/CloudStorage/OneDrive-Personal/OpenDash', {}).work, false);
  assert.deepEqual(kindFromName('Dropbox'), null);
  assert.equal(oneDriveLabel({ work: true, org: 'Contoso' }), 'OneDrive (work or school: Contoso)');
  assert.equal(oneDriveLabel({ work: false }), 'OneDrive');
});

function engineWith(detected) {
  const data = join(base, 'data-' + Math.random().toString(16).slice(2));
  mkdirSync(join(data, 'state'), { recursive: true });
  const store = createStateStore({ stateDir: join(data, 'state') });
  return createNodeSyncEngine({ store, dataDir: data, localDir: join(data, '..', 'local-' + Math.random().toString(16).slice(2)), host: 'host-x', detect: () => detected, watch: false });
}

test('turning sync on without a folder never picks a work or school OneDrive', async () => {
  const work = join(base, 'OneDrive - Contoso'), mine = join(base, 'Dropbox');
  mkdirSync(work); mkdirSync(mine);
  const only = engineWith([{ kind: 'onedrive', label: 'OneDrive (work or school: Contoso)', path: work, work: true }]);
  await only.start();
  await assert.rejects(only.configure({ enabled: true }), (e) => e.code === 'NO_FOLDER' && /work or school OneDrive/.test(e.message));
  assert.equal((await only.status()).detected[0].work, true, 'the page sees which one is work');
  await only.stop();
  const two = engineWith([{ kind: 'onedrive', label: 'OneDrive (work or school: Contoso)', path: work, work: true }, { kind: 'dropbox', label: 'Dropbox', path: mine }]);
  await two.start();
  const st = await two.configure({ enabled: true });
  assert.equal(st.folder, mine, 'the personal folder, even when the work one is listed first');
  await two.configure({ enabled: false });
  await two.stop();
});

test('the banner: data in a work or school OneDrive is a warning with the way out', () => {
  const box = {};
  vm.createContext(box);
  vm.runInContext(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', '86-hosts-banner.js'), 'utf8'), box, { filename: '86-hosts-banner.js' });
  const items = JSON.parse(JSON.stringify(box.hostsBannerModel({ paused: false, others: [], conflicts: [], oneDrive: true, oneDriveWork: { org: 'Contoso' } })));
  assert.equal(items.length, 1);
  assert.equal(items[0].kind, 'onedrive-work'); assert.equal(items[0].tone, 'warning');
  assert.equal(items[0].title, 'Your data is in your work or school OneDrive (Contoso).');
  assert.match(items[0].sub, /Settings > Data > Move/);
  const personal = JSON.parse(JSON.stringify(box.hostsBannerModel({ paused: false, others: [], conflicts: [], oneDrive: true })));
  assert.equal(personal[0].kind, 'onedrive');
  assert.equal(JSON.parse(JSON.stringify(box.hostsBannerModel({ paused: false, others: [], conflicts: [], oneDrive: true, oneDriveWork: { org: null } }, { oneDriveOff: true })))[0].kind, 'onedrive-work', 'turning the personal banner off does not hide the work warning');
});
