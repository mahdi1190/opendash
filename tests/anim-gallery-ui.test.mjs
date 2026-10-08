// Synthetic artwork and a small DOM exercise gallery interactions without user data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = name => readFileSync(new URL('../src/app/' + name, import.meta.url), 'utf8');

function gallery({ reduced = false, extra = 0 } = {}) {
  let document;
  const matches = (el, selector) => {
    const tag = /^[a-z][\w-]*/i.exec(selector)?.[0];
    if (tag && el.tagName !== tag.toLowerCase()) return false;
    for (const m of selector.matchAll(/\.([\w-]+)/g)) if (!el.classList.contains(m[1])) return false;
    for (const m of selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)) {
      if (!el.hasAttribute(m[1]) || (m[2] !== undefined && el.getAttribute(m[1]) !== m[2])) return false;
    }
    return true;
  };
  class Element {
    constructor(tag) {
      this.tagName = tag.toLowerCase(); this.children = []; this.parentElement = null;
      this.attributes = new Map(); this._text = ''; this._html = ''; this.value = ''; this.hidden = false;
      this.style = { setProperty() {} };
      const classes = () => new Set((this.className || '').split(/\s+/).filter(Boolean));
      this.classList = {
        contains: name => classes().has(name),
        add: (...names) => { const set = classes(); names.forEach(name => set.add(name)); this.className = [...set].join(' '); },
        remove: (...names) => { const set = classes(); names.forEach(name => set.delete(name)); this.className = [...set].join(' '); },
        toggle: (name, on) => { const set = classes(), value = on === undefined ? !set.has(name) : on; if (value) set.add(name); else set.delete(name); this.className = [...set].join(' '); return value; },
      };
      this.dataset = new Proxy({}, { get: (_, key) => this.getAttribute('data-' + String(key).replace(/[A-Z]/g, c => '-' + c.toLowerCase())), set: (_, key, value) => { this.setAttribute('data-' + String(key).replace(/[A-Z]/g, c => '-' + c.toLowerCase()), value); return true; } });
    }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    hasAttribute(name) { return this.attributes.has(name); }
    removeAttribute(name) { this.attributes.delete(name); }
    get className() { return this.getAttribute('class') || ''; }
    set className(value) { this.setAttribute('class', value); }
    get id() { return this.getAttribute('id') || ''; }
    set id(value) { this.setAttribute('id', value); }
    get isConnected() { return this === document.documentElement || !!this.parentElement?.isConnected; }
    get lastChild() { return this.children.at(-1) || null; }
    appendChild(child) { child.remove(); child.parentElement = this; this.children.push(child); return child; }
    append(...children) { children.forEach(child => this.appendChild(child)); }
    prepend(child) { child.remove(); child.parentElement = this; this.children.unshift(child); }
    remove() { if (this.parentElement) { this.parentElement.children = this.parentElement.children.filter(child => child !== this); this.parentElement = null; } }
    replaceChildren(...children) { this.children.forEach(child => { child.parentElement = null; }); this.children = []; this._text = ''; this._html = ''; this.append(...children); }
    insertBefore(child, before) { child.remove(); const index = this.children.indexOf(before); child.parentElement = this; this.children.splice(index < 0 ? this.children.length : index, 0, child); }
    get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
    set textContent(value) { this.replaceChildren(); this._text = String(value); }
    get innerHTML() { return this._html; }
    set innerHTML(value) {
      this.replaceChildren(); this._html = String(value);
      const stack = [this];
      for (const token of this._html.match(/<[^>]+>|[^<]+/g) || []) {
        if (token.startsWith('</')) { if (stack.length > 1) stack.pop(); continue; }
        if (token.startsWith('<!')) continue;
        if (!token.startsWith('<')) { stack.at(-1)._text += token; continue; }
        const tag = /^<([\w-]+)/.exec(token)?.[1]; if (!tag) continue;
        const child = new Element(tag);
        for (const attr of token.matchAll(/([\w-]+)="([^"]*)"/g)) child.setAttribute(attr[1], attr[2]);
        stack.at(-1).appendChild(child);
        if (!/\/>$/.test(token) && !['input', 'br', 'hr', 'img'].includes(tag)) stack.push(child);
      }
    }
    querySelectorAll(selector) {
      const parts = selector.trim().split(/\s+/), found = [];
      const visit = node => { for (const child of node.children) { if (matches(child, parts.at(-1))) { let parent = child.parentElement, index = parts.length - 2; while (parent && index >= 0) { if (matches(parent, parts[index])) index--; parent = parent.parentElement; } if (index < 0) found.push(child); } visit(child); } };
      visit(this); return found;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    closest(selector) { for (let node = this; node; node = node.parentElement) if (matches(node, selector)) return node; return null; }
    focus() { document.activeElement = this; }
    scrollIntoView() { this.scrolled = true; }
    click() { this.onclick?.({ target: this, stopPropagation() {}, preventDefault() {} }); }
  }
  document = { createElement: tag => new Element(tag), activeElement: null };
  document.documentElement = new Element('html'); document.head = new Element('head'); document.body = new Element('body');
  document.documentElement.append(document.head, document.body);
  document.getElementById = id => { let found = null; const visit = node => { if (node.id === id) found = node; node.children.forEach(visit); }; visit(document.documentElement); return found; };
  const host = new Element('main'); document.body.appendChild(host);
  const timers = new Map(); let timer = 0, saved = 0;
  const Motion = { prefersReduced: () => reduced, level: () => 'standard' };
  const context = vm.createContext({
    document, window: { Motion }, Motion, Intl, console,
    state: { animPrefs: {} }, todayStr: () => '2026-10-08',
    saveData: () => { saved++; }, saveUI() {},
    esc: value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
    icon: () => '<svg></svg>',
    setTimeout: fn => { timers.set(++timer, fn); return timer; }, clearTimeout: id => timers.delete(id),
    _settingsRow: () => new Element('div'), _settingsSwitch: () => new Element('button'),
    _settingsSelect(options, current, pick) { const el = new Element('select'); el.value = current; el.onchange = () => pick(el.value); return el; },
    render: () => { host.replaceChildren(); vm.runInContext('animGalleryRender(__host)', context); }, __host: host,
  });
  for (const name of ['71-anim-registry.js', '71-anim-almanac.js', '77-anim-gallery-logic.js', '78-anim-gallery.js']) vm.runInContext(source(name), context, { filename: name });
  vm.runInContext(`
    const testArt = technique => o => '<rect data-technique="' + technique + '" data-preview-time="' + (o.tod || 'live') + '"/>';
    const testItem = (id, label) => ({ id, label, slot: 'opening', tags: ['harbor'], mood: 'calm', intensity: 'subtle', season: 'any', region: 'any', full: true, reduced: 'static', country: 'US', city: id, svg: testArt('old') });
    animRegisterPack({ id: 'test', name: 'Test locations', items: [
      Object.assign(testItem('alpha', 'Alpha Harbor'), { composed: true, rich: true, scene: {}, svg: testArt('new'), legacySvg: testArt('old'), liveSky: { lat: 40, lon: -74 } }),
      testItem('beta', 'Beta Harbor'),
      ...Array.from({ length: ${extra} }, (_, i) => testItem('extra-' + i, 'Extra Harbor ' + i))
    ] });
    animGalleryRender(__host);
  `, context);
  const root = () => host.querySelector('.apg');
  return {
    root, document, run: expression => vm.runInContext(expression, context), saved: () => saved,
    stage: () => root().querySelector('.apg-stage'),
    search(text, key = 'Enter') { const q = document.getElementById('apg-search'); q.value = text; q.oninput(); q.onkeydown({ key, stopPropagation() {}, preventDefault() {} }); },
    button: (area, label) => area.querySelectorAll('button').find(b => b.textContent === label || b.getAttribute('aria-label') === label),
    tile: ref => root().querySelectorAll('[data-gallery-ref]').find(el => el.getAttribute('data-gallery-ref') === ref),
  };
}

test('search Enter shows a matching preview immediately and an empty search clears stale art; Escape resets', () => {
  const G = gallery();
  assert.equal(G.stage().querySelector('b').textContent, 'Alpha Harbor');
  G.search('beta');
  assert.equal(G.stage().querySelector('b').textContent, 'Beta Harbor');
  assert.equal(G.root().querySelectorAll('[data-gallery-ref]').length, 1);
  G.search('nowhere-unpainted');
  assert.equal(G.stage().hidden, true);
  assert.equal(G.stage().querySelector('.anim-scene'), null, 'the unrelated previous preview is removed');
  assert.ok(G.root().querySelector('.apg-empty'));
  G.search('nowhere-unpainted', 'Escape');
  assert.equal(G.stage().hidden, false);
  assert.equal(G.root().querySelectorAll('[data-gallery-ref]').length, 3);
  assert.equal(G.document.activeElement, G.document.getElementById('apg-search'));
});

test('time controls redraw the requested lighting and all four versions, while reselection preserves a playing scene', () => {
  const G = gallery();
  const scene = G.stage().querySelector('.anim-scene');
  G.tile('test/alpha').querySelector('.apg-preview-button').click();
  assert.equal(G.stage().querySelector('.anim-scene'), scene);
  const originalTimeline = G.stage().querySelector('[data-scene-key]').getAttribute('data-scene-key');
  G.button(G.stage(), 'Play again').click();
  assert.notEqual(G.stage().querySelector('[data-scene-key]').getAttribute('data-scene-key'), originalTimeline,
    'explicit replay must start a fresh continuity timeline');
  const replayedScene = G.stage().querySelector('.anim-scene');
  G.tile('test/alpha').querySelector('.apg-preview-button').click();
  assert.equal(G.stage().querySelector('.anim-scene'), replayedScene, 'reselection preserves the replayed scene too');
  for (const time of ['Dawn', 'Day', 'Dusk', 'Night']) {
    G.button(G.stage().querySelector('.apg-time-row'), time).click();
    assert.ok(G.stage().querySelector('.anim-scene').classList.contains('tod-' + time.toLowerCase()));
    assert.equal(G.stage().querySelector('[data-preview-time]').getAttribute('data-preview-time'), time.toLowerCase());
  }
  G.button(G.stage().querySelector('.apg-time-row'), 'All times').click();
  assert.equal(G.stage().querySelectorAll('.apg-time-preview').length, 4);
  assert.deepEqual(G.stage().querySelectorAll('[data-preview-time]').map(el => el.getAttribute('data-preview-time')), ['dawn', 'day', 'dusk', 'night']);
  G.button(G.stage().querySelector('.apg-time-row'), 'Live').click();
  assert.equal(G.stage().querySelectorAll('.anim-scene').length, 1);
});

test('saved original actions use the live item identity and favorites preserve the selected stage', () => {
  const G = gallery();
  G.tile('test/alpha~legacy').querySelector('.apg-preview-button').click();
  assert.equal(G.stage().querySelector('[data-technique]').getAttribute('data-technique'), 'old');
  const scene = G.stage().querySelector('.anim-scene');
  G.tile('test/alpha~legacy').querySelector('.apg-favourite').click();
  assert.equal(G.stage().querySelector('.anim-scene'), scene, 'favoriting must not restart the preview');
  assert.equal(G.run('animLook().fav.join()'), 'test/alpha');
  assert.equal(G.tile('test/alpha').querySelector('.apg-favourite').getAttribute('aria-pressed'), 'true');
  assert.equal(G.tile('test/alpha~legacy').querySelector('.apg-favourite').getAttribute('aria-pressed'), 'true');
  G.button(G.tile('test/alpha~legacy'), 'Pin for this slot').click();
  assert.equal(G.run('animLook().pin.opening'), 'test/alpha');
  G.button(G.tile('test/alpha~legacy'), 'Block').click();
  assert.equal(G.run('animLook().block.join()'), 'test/alpha');
  assert.ok(G.tile('test/alpha').classList.contains('is-blocked'));
  assert.ok(G.tile('test/alpha~legacy').classList.contains('is-blocked'));
  assert.equal(G.saved(), 3);
});

test('reduced motion remains still through all-times preview and replay; pagination restores keyboard focus', () => {
  const G = gallery({ reduced: true, extra: 28 });
  G.button(G.stage().querySelector('.apg-time-row'), 'All times').click();
  const checkStill = () => G.stage().querySelectorAll('.anim-scene').forEach(scene => {
    assert.ok(scene.classList.contains('ap-still')); assert.ok(!scene.classList.contains('is-live'));
  });
  checkStill();
  const beforeReplay = G.stage().querySelectorAll('[data-scene-key]').map(el => el.getAttribute('data-scene-key'));
  G.button(G.stage(), 'Play again').click(); checkStill();
  const afterReplay = G.stage().querySelectorAll('[data-scene-key]').map(el => el.getAttribute('data-scene-key'));
  assert.equal(afterReplay.length, 4);
  assert.ok(afterReplay.every((key, index) => key !== beforeReplay[index]), 'each time comparison receives a fresh replay timeline');
  G.button(G.root().querySelector('.apg-paging'), 'Next').click();
  assert.equal(G.document.activeElement, G.root().querySelector('.apg-grid').querySelector('.apg-preview-button'));
  assert.ok(G.document.activeElement.isConnected);
});
