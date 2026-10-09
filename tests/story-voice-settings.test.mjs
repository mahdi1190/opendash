// Voice settings transactions, with synthetic keys and a small labelled DOM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/app/79-story-voice.js', import.meta.url), 'utf8');
const tick = async () => { for (let i = 0; i < 4; i++) await new Promise(resolve => setImmediate(resolve)); };

function settings({ connected = false, provider = 'browser', voiceId = '', monthlyLimit = 18000, scope = 'all', account = { tier: 'free', remaining: 8100 }, failure } = {}) {
  let document;
  class Element {
    constructor(tag) {
      this.tagName = tag.toUpperCase(); this.children = []; this.attributes = {}; this.events = {}; this.value = ''; this._text = ''; this.hidden = false; this.disabled = false; this.dataset = {};
      this.classList = {
        add: name => { this.className = (this.className || '') + ' ' + name; },
        toggle: (name, on) => { this.className = (this.className || '').split(/\s+/).filter(x => x && x !== name).concat(on ? name : []).join(' '); },
      };
    }
    setAttribute(k, v) { this.attributes[k] = String(v); }
    getAttribute(k) { return this.attributes[k] ?? null; }
    removeAttribute(k) { delete this.attributes[k]; }
    appendChild(child) { child.parentElement = this; this.children.push(child); return child; }
    append(...children) { children.forEach(child => this.appendChild(child)); }
    replaceChildren(...children) { this.children = []; this._text = ''; this.append(...children); }
    set textContent(v) { this.replaceChildren(); this._text = String(v); }
    get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
    get isConnected() { return this === document.body || !!this.parentElement?.isConnected; }
    querySelectorAll(selector) {
      const matches = el => selector[0] === '.' ? (el.className || '').split(/\s+/).includes(selector.slice(1)) : el.tagName === selector.toUpperCase();
      const result = [];
      const visit = node => { for (const child of node.children) { if (matches(child)) result.push(child); visit(child); } }; visit(this); return result;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    addEventListener(name, fn) { (this.events[name] ||= []).push(fn); }
    dispatch(name, event = {}) { for (const fn of this.events[name] || []) fn(event); }
    click() { if (!this.disabled) { this.onclick?.(); this.dispatch('click'); } }
    focus() { document.activeElement = this; }
    async play() { this.played = true; }
    pause() { this.paused = true; }
  }
  document = { createElement: tag => new Element(tag), createTextNode: text => { const node = new Element('#text'); node.textContent = text; return node; } };
  document.body = new Element('body');
  const status = { connected, provider, voiceId, modelId: 'eleven_flash_v2_5', scope, monthlyLimit, usage: { used: 1200, remaining: monthlyLimit - 1200, period: '2026-10' } };
  const calls = [], updates = [], observers = [];
  const voices = [{ voiceId: 'voice_available', name: 'Available Voice', eligible: true }, { voiceId: 'voice_locked', name: 'Shared Voice', eligible: false }];
  const box = {
    document, console, AbortController, setTimeout, clearTimeout,
    MutationObserver: class { constructor(callback) { this.callback = callback; observers.push(this); } observe() {} disconnect() { this.disconnected = true; } },
    CustomEvent: class { constructor(type, opts) { this.type = type; this.detail = opts.detail; } },
    window: { dispatchEvent: event => updates.push(event) },
    _settingsRow(label, hint, control) {
      const row = new Element('div'); row.className = 'set-row'; row.dataset.settingLabel = label;
      const name = new Element('div'); name.className = 'set-t'; name.textContent = label;
      const note = new Element('div'); note.className = 'set-h'; note.textContent = hint || '';
      const c = new Element('div'); c.className = 'set-c'; if (control) c.appendChild(control); row.append(name, note, c); return row;
    },
    _settingsSeg(options, current, fn) {
      const seg = new Element('div'); seg.className = 'seg';
      for (const [v, text] of options) { const b = new Element('button'); b.textContent = text; b.setAttribute('aria-pressed', String(v === current)); b.onclick = () => fn(v); seg.appendChild(b); } return seg;
    },
    async fetch(url, options = {}) {
      const body = options.body ? JSON.parse(options.body) : undefined; calls.push({ url, body });
      if (failure?.(url, body)) return { ok: false, status: 401, json: async () => ({ error: 'This API key cannot access voices.' }) };
      let reply;
      if (url.endsWith('/settings')) {
        if (body.apiKey) status.connected = true;
        if (body.removeKey) { status.connected = false; delete status.account; delete status.voices; }
        for (const k of ['provider', 'voiceId', 'modelId', 'scope', 'monthlyLimit']) if (k in body) status[k] = body[k];
        reply = { ...status };
      } else if (url.endsWith('/voices')) { status.account = account; status.voices = voices; reply = { ...status }; }
      else if (url.endsWith('/speech')) reply = { url: '/api/narration/audio?id=' + 'a'.repeat(64), cached: false, usage: { used: 1284, remaining: 16716 } };
      else reply = { ...status };
      return { ok: true, json: async () => reply };
    },
  };
  vm.createContext(box); vm.runInContext(source, box);
  const section = box.renderStoryVoiceSettings(document.body);
  const control = label => [...section.querySelectorAll('input'), ...section.querySelectorAll('select')].find(el => el.getAttribute('aria-label') === label);
  const button = text => section.querySelectorAll('button').find(el => el.textContent === text);
  const choose = (label, value) => { const el = control(label); el.value = value; el.dispatch('change'); };
  return { section, control, button, choose, calls, updates, observers, status, document, box };
}

test('starts with a free browser voice and checks status without contacting ElevenLabs generation', async () => {
  const ui = settings(); await tick();
  assert.equal(ui.section.querySelector('.stv-cloud').open, false);
  assert.equal(ui.control('ElevenLabs API key').type, 'password');
  assert.deepEqual(ui.calls.map(c => c.url), ['/api/narration/status']);
  assert.match(ui.section.querySelector('.stv-connection').textContent, /no ElevenLabs allowance used/);
  assert.equal(ui.section.querySelector('.stv-feedback').textContent, '');
});

test('defaults to every spoken moment and makes highlights an explicit saved choice', async () => {
  const ui = settings({ connected: true, provider: 'elevenlabs' }); await tick();
  const scope = ui.control('Use ElevenLabs for');
  assert.equal(scope.value, 'all');
  assert.equal(scope.children[0].value, 'all');
  const row = ui.section.querySelectorAll('.set-row').find(r => r.dataset.settingLabel === 'Use ElevenLabs for');
  assert.match(row.textContent, /same voice throughout/);
  assert.match(row.textContent, /browser voice for supporting moments/);
  ui.choose('Use ElevenLabs for', 'highlights'); await tick();
  assert.deepEqual(ui.calls.find(c => c.url.endsWith('/settings')).body, { scope: 'highlights' });
  assert.equal(scope.value, 'highlights');
  const existing = settings({ scope: 'highlights' }); await tick();
  assert.equal(existing.control('Use ElevenLabs for').value, 'highlights');
});

test('connecting clears the secret field immediately and never includes a key in the status event', async () => {
  const ui = settings(); await tick();
  ui.control('ElevenLabs API key').value = 'synthetic-secret'; ui.button('Connect ElevenLabs').click();
  assert.equal(ui.control('ElevenLabs API key').value, '');
  await tick();
  assert.deepEqual(ui.calls.find(c => c.url.endsWith('/settings')).body, { apiKey: 'synthetic-secret', provider: 'elevenlabs' });
  assert.equal(ui.section.querySelector('.stv-cloud').open, true);
  assert.ok(ui.calls.some(c => c.url.endsWith('/voices')));
  assert.ok(ui.updates.every(e => !JSON.stringify(e.detail).includes('synthetic-secret')));
  const locked = ui.control('ElevenLabs voice').children.find(c => c.value === 'voice_locked');
  assert.equal(locked.disabled, true);
});

test('voice, model and scope save the newly chosen values through a busy-state refresh', async () => {
  const ui = settings({ connected: true, provider: 'elevenlabs', voiceId: 'old_voice' }); await tick();
  ui.button('Load voices').click(); await tick();
  ui.choose('ElevenLabs voice', 'voice_available'); await tick();
  ui.choose('Speech model', 'eleven_v3'); await tick();
  ui.choose('Use ElevenLabs for', 'all'); await tick();
  const patches = ui.calls.filter(c => c.url.endsWith('/settings')).map(c => c.body);
  assert.deepEqual(patches, [{ voiceId: 'voice_available' }, { modelId: 'eleven_v3', monthlyLimit: 9000 }, { scope: 'all' }]);
  assert.equal(ui.control('ElevenLabs voice').value, 'voice_available');
});

test('changing models preserves a custom cap and does not increase the existing cap automatically', async () => {
  const ui = settings({ connected: true, provider: 'elevenlabs', monthlyLimit: 4500 }); await tick();
  ui.choose('Speech model', 'eleven_v3'); await tick();
  ui.choose('Speech model', 'eleven_flash_v2_5'); await tick();
  assert.equal(ui.status.monthlyLimit, 4500);
  assert.ok(ui.calls.filter(c => c.url.endsWith('/settings')).every(c => !('monthlyLimit' in c.body)));
});

test('invalid caps stay inline without requests; a zero cap can be saved', async () => {
  const ui = settings({ connected: true, provider: 'elevenlabs' }); await tick();
  ui.control('Monthly character limit').value = '-1'; ui.button('Save limit').click(); await tick();
  assert.equal(ui.control('Monthly character limit').getAttribute('aria-invalid'), 'true');
  assert.equal(ui.calls.filter(c => c.url.endsWith('/settings')).length, 0);
  assert.match(ui.section.querySelector('.stv-feedback').textContent, /whole number/);
  ui.control('Monthly character limit').value = '0'; ui.button('Save limit').click(); await tick();
  assert.equal(ui.status.monthlyLimit, 0);
});

test('preview is an explicit generation request and plays the returned local audio', async () => {
  const ui = settings({ connected: true, provider: 'elevenlabs', voiceId: 'voice_available' }); await tick();
  assert.equal(ui.calls.some(c => c.url.endsWith('/speech')), false);
  ui.button('Test ElevenLabs voice').click(); await tick();
  const request = ui.calls.find(c => c.url.endsWith('/speech'));
  assert.equal(request.body.preview, true); assert.equal(request.body.delivery.pace, 'slow');
  assert.equal(ui.section.querySelector('audio').played, true);
  assert.match(ui.section.querySelector('.stv-usage-text').textContent, /1,284/);
  ui.button('Stop preview').click(); assert.equal(ui.section.querySelector('audio').paused, true);
});

test('failed account access shows an accessible inline error and re-enables setup', async () => {
  const ui = settings({ failure: url => url.endsWith('/voices') }); await tick();
  ui.control('ElevenLabs API key').value = 'synthetic-secret'; ui.button('Connect ElevenLabs').click(); await tick();
  const message = ui.section.querySelector('.stv-feedback');
  assert.equal(message.getAttribute('role'), 'status'); assert.match(message.textContent, /cannot access voices/);
  assert.equal(ui.button('Replace key').disabled, false);
  assert.equal(ui.control('ElevenLabs API key').value, '');
});

test('unknown account credits are shown as unavailable rather than exhausted', async () => {
  const ui = settings({ connected: true, provider: 'elevenlabs', account: { tier: 'unknown', remaining: null } }); await tick();
  ui.button('Load voices').click(); await tick();
  const note = ui.section.querySelector('.stv-usage').textContent;
  assert.match(note, /Account credits unavailable/); assert.doesNotMatch(note, /0 account credits/);
});

test('leaving the settings page stops a playing preview and disconnects its observer', async () => {
  const ui = settings({ connected: true, provider: 'elevenlabs', voiceId: 'voice_available' }); await tick();
  ui.button('Test ElevenLabs voice').click(); await tick();
  const audio = ui.section.querySelector('audio'); assert.equal(audio.played, true);
  ui.document.body.children = []; ui.section.parentElement = null;
  ui.observers[0].callback();
  assert.equal(audio.paused, true); assert.equal(ui.observers[0].disconnected, true);
});

test('removing the connection returns to browser narration and exposes searchable rows', async () => {
  const ui = settings({ connected: true, provider: 'elevenlabs', voiceId: 'voice_available' }); await tick();
  ui.button('Load voices').click(); await tick();
  assert.match(ui.section.querySelector('.stv-usage').textContent, /8,100 account credits/);
  ui.button('Remove connection').click(); await tick();
  assert.equal(ui.status.provider, 'browser'); assert.equal(ui.status.connected, false);
  assert.deepEqual(ui.calls.find(c => c.url.endsWith('/settings')).body, { removeKey: true, provider: 'browser' });
  assert.ok(ui.updates.at(-1).detail.account === undefined, 'removed account metadata is not retained');
  const labels = ui.section.querySelectorAll('.set-row').map(r => r.dataset.settingLabel);
  assert.ok(ui.box.window.StoryVoiceSettings.search.every(row => labels.includes(row[0])));
});
