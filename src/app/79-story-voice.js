/* ElevenLabs settings live beside the existing story and fallback-voice rows.
   The key is posted to the local server once and never kept in app config or
   browser storage. All later requests use the server's saved connection. */
function renderStoryVoiceSettings(el) {
  if (!el) return null;
  const section = document.createElement('section'); section.className = 'stv-settings';
  section.setAttribute('aria-label', 'Narration voice settings');
  const heading = document.createElement('h3'); heading.className = 'set-subhead'; heading.textContent = 'A voice for your stories';
  section.appendChild(heading);
  const id = 'stv-' + (++renderStoryVoiceSettings._sequence);
  let status = { connected: false, provider: 'browser', voiceId: '', modelId: 'eleven_flash_v2_5', scope: 'all', monthlyLimit: 18000, usage: { used: 0, remaining: 18000 } };
  let voices = [], busy = false, previewAudio = null, displayedProvider = null;
  const controls = [];
  const make = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
  const button = (text, cls) => { const b = make('button', 'btn btn-secondary btn-sm ' + (cls || ''), text); b.type = 'button'; controls.push(b); return b; };
  const input = (label, type) => { const n = make('input', 'control control-sm'); n.type = type || 'text'; n.setAttribute('aria-label', label); controls.push(n); return n; };
  const select = (label, options) => {
    const n = make('select', 'control control-sm'); n.setAttribute('aria-label', label); controls.push(n);
    for (const [value, text] of options) { const o = make('option', '', text); o.value = value; n.appendChild(o); }
    return n;
  };
  const row = (label, hint, control, parent) => {
    const r = _settingsRow(label, hint, control);
    const name = r.querySelector('.set-t'); name.id = id + '-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (control && /^(INPUT|SELECT)$/.test(control.tagName)) control.setAttribute('aria-labelledby', name.id);
    (parent || section).appendChild(r); return r;
  };
  const provider = _settingsSeg([['browser', 'Browser / computer'], ['elevenlabs', 'ElevenLabs']], 'browser', v => {
    run('Saving voice choice…', async () => { stopPreview(); accept(await request('/api/narration/settings', { provider: v })); return v === 'elevenlabs' ? 'ElevenLabs selected. Connect your account and choose a voice below.' : 'Browser voice selected.'; });
  });
  for (const b of provider.querySelectorAll('button')) controls.push(b);
  row('Narration voice', 'The browser voice stays available if ElevenLabs is unavailable or your allowance runs out.', provider);
  const connection = make('p', 'stv-connection'); section.appendChild(connection);
  const feedback = make('p', 'stv-feedback'); feedback.id = id + '-feedback'; feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite'); feedback.setAttribute('aria-atomic', 'true'); section.appendChild(feedback);
  const cloud = make('details', 'stv-cloud');
  cloud.appendChild(make('summary', 'stv-cloud-summary', 'ElevenLabs connection and voice')); section.appendChild(cloud);

  const keyWrap = make('div', 'stv-connect');
  const key = input('ElevenLabs API key', 'password'); key.autocomplete = 'new-password'; key.spellcheck = false; key.placeholder = 'Paste your API key'; key.setAttribute('aria-describedby', id + '-key-note'); key.maxLength = 512;
  const connect = button('Connect ElevenLabs');
  const remove = button('Remove connection');
  keyWrap.append(key, connect, remove);
  const keyRow = row('ElevenLabs connection', 'Your key is saved on this OpenDash server. It is never shown again in the browser.', keyWrap, cloud); keyRow.classList.add('set-row-stack');
  keyRow.querySelector('.set-h').id = id + '-key-note';
  const links = make('p', 'stv-note');
  const keyLink = make('a', '', 'Get an API key'); keyLink.href = 'https://elevenlabs.io/app/settings/api-keys'; keyLink.target = '_blank'; keyLink.rel = 'noopener noreferrer';
  links.append(keyLink, document.createTextNode(' from your ElevenLabs account. Your plan and voice access apply.')); cloud.appendChild(links);

  const voiceWrap = make('div', 'stv-inline');
  const voice = select('ElevenLabs voice', [['', 'Load voices or enter a voice ID']]);
  const load = button('Load voices'); voiceWrap.append(voice, load);
  row('ElevenLabs voice', 'Choose a voice available to your account. Shared Voice Library voices may need a paid plan.', voiceWrap, cloud);
  const manual = make('details', 'stv-manual');
  const summary = make('summary', '', 'Use a voice ID'); manual.appendChild(summary);
  const manualWrap = make('div', 'stv-inline');
  const voiceId = input('ElevenLabs voice ID'); voiceId.placeholder = 'Voice ID from your account'; voiceId.autocomplete = 'off'; voiceId.maxLength = 80;
  const saveId = button('Use this voice'); manualWrap.append(voiceId, saveId);
  row('Voice ID', 'Useful if your account provides a voice that is not listed above.', manualWrap, manual); cloud.appendChild(manual);
  const model = select('Speech model', [['eleven_flash_v2_5', 'Flash 2.5 · economical'], ['eleven_v3', 'Eleven v3 · more allowance']]);
  row('Speech model', 'Flash stretches a small allowance. Eleven v3 adds expressive delivery cues and uses more account credits. Availability depends on your account.', model, cloud);
  const scope = select('Use ElevenLabs for', [['all', 'Every spoken moment'], ['highlights', 'Intros, recap and closing']]);
  row('Use ElevenLabs for', 'Every spoken moment keeps the same voice throughout. Highlights saves allowance by using the browser voice for supporting moments.', scope, cloud);

  const limitWrap = make('div', 'stv-inline');
  const limit = input('Monthly character limit', 'number'); limit.min = '0'; limit.max = '1000000'; limit.step = '500'; limit.inputMode = 'numeric'; limit.setAttribute('aria-describedby', id + '-limit-note');
  const saveLimit = button('Save limit'); limitWrap.append(limit, saveLimit);
  const limitRow = row('Monthly character limit', 'OpenDash stops creating new audio at this limit and uses the browser voice. Set 0 to use saved audio only. Replaying saved audio uses no new allowance.', limitWrap, cloud); limitRow.querySelector('.set-h').id = id + '-limit-note';
  const usage = make('div', 'stv-usage');
  const usageText = make('p', 'stv-usage-text');
  const meter = make('progress', 'stv-meter'); meter.max = 18000; meter.value = 0; meter.setAttribute('aria-label', 'OpenDash monthly generated speech characters');
  const accountText = make('p', 'stv-note'); usage.append(usageText, meter, accountText);
  row('This month', 'OpenDash counts generated characters and resets each calendar month. ElevenLabs counts account credits, with its own reset date and usage from other apps.', usage, cloud);

  const previewWrap = make('div', 'stv-preview');
  const preview = button('Test ElevenLabs voice');
  const stop = button('Stop preview'); stop.hidden = true;
  const previewHint = make('p', 'stv-note', 'A short sample uses your allowance once. Identical samples replay saved audio.'); previewHint.id = id + '-preview-note'; preview.setAttribute('aria-describedby', previewHint.id);
  const audio = make('audio', 'stv-audio'); audio.controls = true; audio.preload = 'none'; audio.hidden = true; audio.setAttribute('aria-label', 'ElevenLabs voice preview');
  previewWrap.append(preview, stop, previewHint, audio);
  row('Try ElevenLabs', 'Hear a warm, unhurried greeting with your chosen voice.', previewWrap, cloud);

  const message = (text, error) => { feedback.textContent = text || ''; feedback.classList.toggle('is-error', !!error); };
  const number = value => Math.max(0, Math.floor(Number(value) || 0));
  const count = value => number(value).toLocaleString();
  const stopPreview = () => { if (previewAudio) { previewAudio.pause(); try { previewAudio.currentTime = 0; } catch (e) { /* no loaded media yet */ } } stop.hidden = true; };
  const update = () => {
    const enabled = status.provider === 'elevenlabs';
    if (displayedProvider !== status.provider) { cloud.open = enabled; displayedProvider = status.provider; }
    [...provider.querySelectorAll('button')].forEach((b, i) => b.setAttribute('aria-pressed', (i === (enabled ? 1 : 0)) ? 'true' : 'false'));
    connection.textContent = enabled ? (status.connected ? (status.account ? 'ElevenLabs connected. Audio is saved locally for replay.' : 'ElevenLabs key saved. Load voices to check access.') : 'Connect ElevenLabs to use its voices. Your browser voice is ready in the meantime.') : 'Browser or computer voice · no ElevenLabs allowance used.';
    section.setAttribute('aria-busy', busy ? 'true' : 'false');
    for (const c of controls) c.disabled = busy;
    load.disabled = busy || !status.connected;
    voice.disabled = busy || !status.connected;
    voiceId.disabled = busy || !status.connected;
    saveId.disabled = busy || !status.connected;
    preview.disabled = busy || !status.connected || !status.voiceId;
    remove.hidden = !status.connected;
    key.placeholder = status.connected ? 'Paste a replacement API key' : 'Paste your API key';
    connect.textContent = status.connected ? 'Replace key' : 'Connect ElevenLabs';
    model.value = status.modelId || 'eleven_flash_v2_5'; scope.value = status.scope === 'highlights' ? 'highlights' : 'all';
    limit.value = String(number(status.monthlyLimit)); voiceId.value = status.voiceId || '';
    voice.replaceChildren();
    const placeholder = make('option', '', status.voiceId ? 'Saved voice' : 'Choose a voice'); placeholder.value = ''; voice.appendChild(placeholder);
    let listed = false;
    for (const v of voices) {
      const vid = v.voiceId || v.voice_id || v.id; if (!vid) continue;
      const op = make('option', '', (v.name || vid) + (v.eligible === false ? ' · unavailable on this plan' : ''));
      op.value = vid; op.disabled = v.eligible === false; if (vid === status.voiceId) listed = true; voice.appendChild(op);
    }
    if (status.voiceId && !listed) { const op = make('option', '', 'Saved voice · ' + status.voiceId); op.value = status.voiceId; voice.appendChild(op); }
    voice.value = status.voiceId || '';
    const used = number(status.usage && status.usage.used), cap = number(status.monthlyLimit);
    usageText.textContent = count(used) + ' of ' + count(cap) + ' characters used' + (status.usage && status.usage.period ? ' · ' + status.usage.period : '');
    meter.max = Math.max(1, cap); meter.value = Math.min(used, meter.max); meter.setAttribute('aria-valuetext', usageText.textContent);
    accountText.textContent = status.account ? ((status.account.tier && status.account.tier !== 'unknown' ? status.account.tier + ' plan · ' : '') + (status.account.remaining === null || status.account.remaining === undefined ? 'Account credits unavailable' : count(status.account.remaining) + ' account credits remaining')) : (status.connected ? 'Load voices to check your account allowance.' : 'Your account allowance appears after connecting and loading voices.');
    if (status.warning) accountText.textContent += ' ' + status.warning;
    if (status.account && status.account.resetAt) {
      const raw = status.account.resetAt, d = new Date(typeof raw === 'number' && raw < 1e12 ? raw * 1000 : raw);
      if (!Number.isNaN(d.getTime())) accountText.textContent += ' · resets ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  };
  async function request(url, patch) {
    const ac = new AbortController(); const timer = setTimeout(() => ac.abort(), 50000);
    try {
      const r = await fetch(url, Object.assign({ signal: ac.signal }, patch === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }));
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || ('OpenDash could not finish this request (' + r.status + ').'));
      return j;
    } catch (e) { if (e.name === 'AbortError') throw new Error('The voice service took too long. Try again.'); throw e; }
    finally { clearTimeout(timer); }
  }
  function accept(reply) {
    const next = reply.status || reply;
    status = Object.assign({}, next); delete status.voices;
    voices = Array.isArray(next.voices) ? next.voices : [];
    window.dispatchEvent(new CustomEvent('story-voice-settings-changed', { detail: status }));
    update();
  }
  async function run(progress, work) {
    if (busy) return;
    const focusBefore = document.activeElement;
    busy = true; message(progress); update();
    try { const result = await work(); if (section.isConnected) message(result === undefined ? 'Saved.' : result); return true; }
    catch (e) { if (section.isConnected) message((e && e.message) || 'The OpenDash server is unavailable. Your browser voice is still available.', true); return false; }
    finally {
      busy = false; update();
      if (section.isConnected && controls.includes(focusBefore) && !focusBefore.disabled && !focusBefore.hidden && (!document.activeElement || document.activeElement === document.body)) focusBefore.focus();
    }
  }
  connect.addEventListener('click', () => {
    const apiKey = key.value.trim();
    if (!apiKey) { key.setAttribute('aria-invalid', 'true'); message('Paste your ElevenLabs API key to connect.', true); key.focus(); return; }
    key.removeAttribute('aria-invalid'); key.value = '';
    run('Connecting ElevenLabs…', async () => {
      accept(await request('/api/narration/settings', { apiKey, provider: 'elevenlabs' }));
      const reply = await request('/api/narration/voices'); accept(reply);
      return 'Connected. Choose an available voice, then test it below.';
    });
  });
  key.addEventListener('input', () => key.removeAttribute('aria-invalid'));
  key.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); connect.click(); } });
  remove.addEventListener('click', () => run('Removing the connection…', async () => { stopPreview(); voices = []; accept(await request('/api/narration/settings', { removeKey: true, provider: 'browser' })); return 'Connection removed. Stories use your browser voice.'; }));
  load.addEventListener('click', () => run('Loading available voices…', async () => { accept(await request('/api/narration/voices')); return voices.some(v => v.eligible !== false) ? 'Voices loaded. Choose one to use in your stories.' : 'No available voices were found. You can enter a voice ID from your account.'; }));
  voice.addEventListener('change', () => { const v = voice.value; if (v) run('Saving voice…', async () => { stopPreview(); accept(await request('/api/narration/settings', { voiceId: v })); return 'Voice saved.'; }); });
  saveId.addEventListener('click', () => {
    const v = voiceId.value.trim();
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(v)) { voiceId.setAttribute('aria-invalid', 'true'); message('Enter the voice ID from your ElevenLabs account.', true); voiceId.focus(); return; }
    voiceId.removeAttribute('aria-invalid'); run('Saving voice…', async () => { stopPreview(); accept(await request('/api/narration/settings', { voiceId: v })); return 'Voice saved. Test it below to check access.'; });
  });
  voiceId.addEventListener('input', () => voiceId.removeAttribute('aria-invalid'));
  model.addEventListener('change', () => {
    const modelId = model.value, patch = { modelId };
    if (modelId === 'eleven_v3' && status.monthlyLimit === 18000) patch.monthlyLimit = 9000;
    run('Saving speech model…', async () => { stopPreview(); accept(await request('/api/narration/settings', patch)); return patch.monthlyLimit === undefined ? 'Speech model saved.' : 'Speech model saved. The standard monthly limit was adjusted to ' + count(patch.monthlyLimit) + ' characters for this model.'; });
  });
  scope.addEventListener('change', () => { const v = scope.value; run('Saving narration scope…', async () => { accept(await request('/api/narration/settings', { scope: v })); return 'Narration scope saved.'; }); });
  saveLimit.addEventListener('click', () => {
    const cap = Number(limit.value);
    if (!limit.value.trim() || !Number.isSafeInteger(cap) || cap < 0 || cap > 1000000) { limit.setAttribute('aria-invalid', 'true'); message('Use a whole number between 0 and 1,000,000 characters.', true); limit.focus(); return; }
    limit.removeAttribute('aria-invalid'); run('Saving monthly limit…', async () => { accept(await request('/api/narration/settings', { monthlyLimit: cap })); return 'Monthly limit saved.'; });
  });
  limit.addEventListener('input', () => limit.removeAttribute('aria-invalid'));
  preview.addEventListener('click', () => run('Creating your voice preview…', async () => {
    stopPreview();
    const reply = await request('/api/narration/speech', { text: 'Good morning. A little space to plan, a few things that matter, and a good place to begin.', delivery: { tone: 'warm', pace: 'slow', pauseMs: 300 }, kind: 'intro', preview: true });
    if (reply.usage) status.usage = reply.usage;
    if (!reply.url || !/^\/api\/narration\/audio\?id=[a-f0-9]{64}$/.test(reply.url)) throw new Error('OpenDash did not return a playable voice preview.');
    audio.src = reply.url; audio.hidden = false; previewAudio = audio;
    if (!section.isConnected) return '';
    try { await audio.play(); if (!section.isConnected) { stopPreview(); return ''; } stop.hidden = false; } catch (e) { return 'Preview ready. Press Play in the audio controls below.'; }
    return reply.cached ? 'Playing your saved sample. No new allowance used.' : 'Playing your voice sample.';
  }));
  stop.addEventListener('click', stopPreview); audio.addEventListener('ended', () => { stop.hidden = true; });
  el.appendChild(section); update();
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => { if (!section.isConnected) { stopPreview(); observer.disconnect(); } });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  run('Checking narration settings…', async () => { accept(await request('/api/narration/status')); return ''; });
  return section;
}
renderStoryVoiceSettings._sequence = 0;
if (typeof window !== 'undefined') window.StoryVoiceSettings = Object.freeze({
  render: renderStoryVoiceSettings,
  search: [
    ['Narration voice', 'Choose ElevenLabs or the free browser voice.', 'speech text to speech TTS voice provider read aloud'],
    ['ElevenLabs connection', 'Connect an ElevenLabs API key or remove the saved connection.', 'eleven labs key account'],
    ['ElevenLabs voice', 'Load available voices or choose a saved voice.', 'voice ID'],
    ['Speech model', 'Economical Flash 2.5 or expressive Eleven v3.', 'inflections emotional tone delivery'],
    ['Use ElevenLabs for', 'Use one voice for every spoken moment, or save allowance with highlights.', 'highlights intro end of day all voice'],
    ['Monthly character limit', 'Limit generation and fall back to the browser voice.', 'quota cap allowance free credits'],
    ['This month', 'Generated speech characters and account credits remaining.', 'usage quota allowance'],
    ['Try ElevenLabs', 'Play a short voice preview with the selected voice.', 'test sample'],
  ],
});
