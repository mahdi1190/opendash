import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const read = name => readFileSync(join(APP, name), 'utf8');
function context() {
  const calls = { views: [], renders: 0, connections: [], health: 0 };
  const box = {
    console, state: { view: 'settings:profile' }, APP_CONFIG: { travel: { on: false } },
    registerSection() {}, registerCommand() {},
    setView: view => calls.views.push(view), renderMain: () => calls.renders++,
    connOpen: id => calls.connections.push(id), googleHealthConnectionSetup: () => calls.health++,
    sgRules: () => [{ title: 'Fill a free afternoon', description: 'Offer a focus block in a schedule gap.', area: 'time' }],
    animPacks: () => [{ name: 'Coastal scenes', description: 'Sea, harbour and lighthouse drawings.' }],
  };
  vm.createContext(box);
  vm.runInContext(read('57-settings.js') + read('58-settings-search.js'), box);
  // Discover every real registration, without executing unrelated modules or
  // calling their renderers (many start network requests and watchers).
  for (const name of readdirSync(APP).filter(name => name.endsWith('.js'))) {
    for (const match of read(name).matchAll(/registerSettingsGroup\(\{\s*id: '([^']+)', title: '([^']+)'/g)) {
      const [, id, title] = match;
      vm.runInContext(`if (!SETTINGS_GROUPS.some(g => g.id === ${JSON.stringify(id)})) registerSettingsGroup({id: ${JSON.stringify(id)}, title: ${JSON.stringify(title)}, render() { throw new Error('Search must not render unopened settings'); }});`, box);
    }
  }
  return { box, calls };
}

test('finds controls in unopened submenus, with their real navigation paths', () => {
  const { box } = context();
  for (const [query, group, label] of [
    ['currency', 'profile', 'Currency'], ['dark', 'appearance', 'Theme'],
    ['compact', 'appearance', 'Task rows'], ['confidence threshold', 'autolink', 'Auto-attach confident links'],
    ['home clock', 'time', 'Second clock'], ['back up now', 'data', 'Backups'],
    ['startup', 'server', 'Start automatically when I log in'], ['12 hour', 'time', 'Clock'],
    ['birthday', 'animations', 'Your birthday'], ['Fahrenheit', 'brief', 'Temperatures'],
  ]) assert.ok(box.settingsSearchFind(query).some(entry => entry.group === group && entry.label === label), query);
  assert.equal(box.settingsSearchFind('Currency')[0].label, 'Currency', 'exact setting names rank first');
});

test('normalizes case, punctuation, accents and whitespace; all query words must match', () => {
  const { box } = context();
  assert.ok(box.settingsSearchFind('  FRANÇAIS  ').some(entry => entry.label === 'Language and date format'));
  assert.ok(box.settingsSearchFind('auto-attach links').some(entry => entry.label === 'Auto-attach confident links'));
  assert.equal(box.settingsSearchFind('notifications imaginarycontrol').length, 0);
  assert.equal(box.settingsSearchFind('').length, 0);
  assert.equal(box.settingsSearchFind('   ').length, 0);
  assert.equal(box.settingsSearchFind('<script>alert(1)</script>').length, 0);
});

test('every settings submenu has specific entries as well as its overview', () => {
  const { box } = context();
  const groups = vm.runInContext('SETTINGS_GROUPS.map(g => g.id)', box);
  const entries = box.settingsSearchEntries();
  for (const id of groups) {
    assert.ok(entries.some(entry => entry.group === id && entry.overview), id + ' overview');
    assert.ok(entries.some(entry => entry.group === id && !entry.overview), id + ' settings');
  }
  assert.ok(groups.length >= 18, 'all currently registered submenus were discovered');
});

test('dynamic suggestion rules and animation packs are searchable without rendering', () => {
  const { box } = context();
  assert.equal(box.settingsSearchFind('free afternoon')[0].label, 'Fill a free afternoon');
  assert.equal(box.settingsSearchFind('lighthouse')[0].label, 'Coastal scenes');
  box.registerSettingsGroup({ id: 'extra', title: 'Extra', search: [{ label: 'Custom control', keywords: 'extension' }], render() { throw new Error('Should not render'); } });
  assert.equal(box.settingsSearchFind('extension')[0].group, 'extra');
});

test('opening a result navigates or refreshes the selected group and consumes the search query', () => {
  const { box, calls } = context();
  vm.runInContext("_settingsSearchText = 'currency'", box);
  box.settingsSearchOpen(box.settingsSearchFind('Currency')[0]);
  assert.equal(calls.renders, 1, 'same group still reveals the target');
  assert.equal(box.settingsSearchQuery(), '');
  assert.equal(vm.runInContext('_settingsSearchPending.target', box), 'Currency');
  box.settingsSearchOpen(box.settingsSearchFind('Intensity')[0]);
  assert.deepEqual(calls.views, ['settings:animations']);
  box.settingsSearchClear();
  assert.equal(vm.runInContext('_settingsSearchPending', box), null);
});

test('Google Health, Fitbit, activity and sleep searches open the integration setup', () => {
  const { box, calls } = context();
  for (const query of ['Google Health', 'Fitbit', 'activity', 'sleep']) {
    const entry = box.settingsSearchFind(query).find(entry => entry.label === 'Google Health');
    assert.ok(entry, query); box.settingsSearchOpen(entry);
  }
  assert.deepEqual(calls.connections, Array(4).fill('google-health'));
  assert.equal(calls.health, 4);
  assert.equal(vm.runInContext('_settingsSearchPending', box), null);
});

test('targets the exact row before similarly named rows, including dynamic labels', () => {
  const { box } = context();
  const theme = { dataset: { settingLabel: 'Theme' } };
  const birthday = { dataset: { settingLabel: 'Your birthday' } };
  const muted = { dataset: { settingLabel: 'Muted and dismissed: 7' } };
  const pack = { dataset: { settingLabel: 'Coastal scenes · 42' } };
  const body = { querySelectorAll: () => [birthday, muted, pack, theme], querySelector: selector => selector === '.apg' ? birthday : null };
  assert.equal(box.settingsSearchTarget(body, { label: 'Theme' }), theme);
  assert.equal(box.settingsSearchTarget(body, { label: 'Muted and dismissed' }), muted);
  assert.equal(box.settingsSearchTarget(body, { target: 'Coastal scenes ·' }), pack);
  assert.equal(box.settingsSearchTarget(body, { selector: '.apg' }), birthday);
});

test('revealing a match opens collapsed ancestor menus and focuses/highlights the setting', () => {
  const { box } = context();
  const actions = [];
  const body = { isConnected: true, dataset: { group: 'animations' } };
  const details = { tagName: 'DETAILS', open: false, parentElement: body };
  const target = { dataset: { settingLabel: 'Your birthday' }, parentElement: details,
    classList: { add: value => actions.push(value), remove() {} },
    getAttribute: () => null, setAttribute: (key, value) => actions.push([key, value]),
    scrollIntoView: () => actions.push('scroll'), focus: () => actions.push('focus'),
  };
  body.querySelectorAll = () => [target];
  box.requestAnimationFrame = fn => fn(); box.setTimeout = () => 1; box.clearTimeout = () => {};
  box.settingsSearchOpen(box.settingsSearchFind('Your birthday')[0]);
  box.settingsSearchReveal(body);
  assert.equal(details.open, true);
  assert.equal(target.tabIndex, -1);
  assert.ok(actions.includes('set-search-hit'));
  assert.ok(actions.includes('focus'));
  assert.equal(vm.runInContext('_settingsSearchPending', box), null);
});
