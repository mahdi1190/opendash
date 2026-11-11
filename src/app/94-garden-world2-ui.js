/* Graphics choices for the classic garden and the native Phaser game scene. */
function gardenGraphicsOpen() {
  let close = null, applying = false;
  const body = document.createElement('div');
  body.className = 'gd-graphics';
  const prefs = _gdpPrefs();
  const lead = document.createElement('p');
  lead.textContent = 'Choose how the garden is drawn.';
  body.appendChild(lead);
  const group = document.createElement('fieldset');
  const legend = document.createElement('legend'); legend.textContent = 'Garden graphics'; group.appendChild(legend);
  const choices = [['standard', 'Classic', 'The original garden artwork and browser renderer.'], ['phaser', 'Phaser', 'The redesigned garden and indoor rooms, drawn as a native game scene with lighting and weather.']];
  const inputs = [];
  for (const [value, label, detail] of choices) {
    const row = document.createElement('label'); row.className = 'gd-graphics-choice';
    const input = document.createElement('input'); input.type = 'radio'; input.name = 'garden-rendering'; input.value = value;
    input.checked = value === (prefs.renderEngine === 'standard' ? 'standard' : 'phaser');
    const text = document.createElement('span'), name = document.createElement('strong'), hint = document.createElement('small');
    name.textContent = label; hint.textContent = detail; text.append(name, hint); row.append(input, text); group.appendChild(row); inputs.push(input);
  }
  body.appendChild(group);
  // The art style is separate from the renderer: the Painted village needs Phaser.
  const styleGroup = document.createElement('fieldset');
  const styleLegend = document.createElement('legend'); styleLegend.textContent = 'Art style'; styleGroup.appendChild(styleLegend);
  const styleInputs = [];
  for (const [value, label, detail] of [['classic', 'Classic', 'The original island drawing.'], ['painted', 'Painted village', 'The village and start area painted in the style of the opening scenes (Phaser only). The other regions keep the classic look for now.']]) {
    const row = document.createElement('label'); row.className = 'gd-graphics-choice';
    const input = document.createElement('input'); input.type = 'radio'; input.name = 'garden-art-style'; input.value = value;
    input.checked = value === (prefs.artStyle === 'painted' ? 'painted' : 'classic');
    const text = document.createElement('span'), name = document.createElement('strong'), hint = document.createElement('small');
    name.textContent = label; hint.textContent = detail; text.append(name, hint); row.append(input, text); styleGroup.appendChild(row); styleInputs.push(input);
  }
  body.appendChild(styleGroup);
  const note = document.createElement('p'); note.className = 'muted';
  note.textContent = 'Your plants, belongings and progress are kept when you switch.'; body.appendChild(note);
  const status = document.createElement('p'); status.className = 'muted'; status.setAttribute('role', 'status');
  const refreshStatus = () => {
    if (applying) return;
    const graphics = window.GardenNative && GardenNative.status ? GardenNative.status() : window.GardenPhaser && GardenPhaser.status ? GardenPhaser.status() : null;
    const mode = _gdpPrefs().renderEngine === 'standard' ? 'standard' : 'phaser';
    if (mode === 'standard') status.textContent = 'Classic graphics are selected.';
    else if (graphics && graphics.ready) status.textContent = graphics.room ? 'Phaser is drawing the indoor scene.' : 'Phaser is drawing the garden.';
    else if (graphics && graphics.lastError) status.textContent = 'Phaser could not open the garden. You can switch to Classic.';
    else if (window.GardenNative && GardenNative.active() || graphics && graphics.initialized) status.textContent = 'Opening the Phaser garden…';
    else status.textContent = 'Phaser will open when you enter the garden.';
  };
  refreshStatus();
  body.appendChild(status);
  close = openDialog({ title: 'Garden graphics', icon: 'monitor', size: 'md', body: el => el.appendChild(body),
    actions: [{ label: 'Cancel', run: () => close && close() }, { label: 'Use these graphics', primary: true, run: async () => {
      if (applying) return false;
      const selected = inputs.find(i => i.checked), mode = selected ? selected.value : 'standard';
      const currentMode = _gdpPrefs().renderEngine === 'standard' ? 'standard' : 'phaser';
      const styleChoice = styleInputs.find(i => i.checked), style = styleChoice ? styleChoice.value : 'classic', styleChanged = style !== (_gdpPrefs().artStyle === 'painted' ? 'painted' : 'classic');
      if (styleChanged) _gdpSetPref('artStyle', style);
      if (mode === currentMode && !styleChanged && (mode !== 'phaser' || window.GardenNative && GardenNative.status().ready)) { if (close) close(); return; }
      applying = true;
      if (mode === 'phaser') {
        status.textContent = 'Loading Phaser…';
        try { await FreefloGameEngine.load(); }
        catch (e) { applying = false; status.textContent = e.message || 'Phaser could not load. You can keep Classic graphics.'; return false; }
      }
      _gdpSetPref('renderEngine', mode);
      if (close) close();
      if (window.GardenNative && GardenNative.active()) GardenNative.destroy();
      if (window.GardenPhaser && typeof GardenPhaser.destroy === 'function') GardenPhaser.destroy();
      if (typeof _gdpWorldView === 'function' && _gdpWorldView()) {
        const view = state.view;
        _gdpWorldUnmount(true); renderMain();
        const box = _gdp.root && _gdp.root.querySelector('.gd-stagebox');
        const blocked = [...document.querySelectorAll('[role="dialog"], .modal, .scrim, .gd-guide, .cmdk.is-open, .palette.is-open, #od-splash')]
          .some(el => el.getClientRects().length && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden');
        if (state.view === view && _gdpWorldView() && box && box.isConnected
          && !blocked
          && !_gdpPopOpen()) box.focus({ preventScroll: true });
      }
      else setView('garden');
    } }],
  });
  const refresh = setInterval(() => { if (!body.isConnected) { clearInterval(refresh); return; } refreshStatus(); }, 1000);
}
registerCommand({ id: 'garden-graphics', label: 'Garden graphics', icon: 'monitor', keywords: 'garden graphics classic smooth performance renderer phaser native lighting weather', run: gardenGraphicsOpen });
