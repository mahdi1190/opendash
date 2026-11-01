/* ============================================================
   THE WORKSPACE ICON. Owner: Shell.
   The mark next to the workspace name (sidebar, until you have a profile:
   then the corner shows your avatar, 97-profile-3corner.js), on the set-up
   card and in the browser tab. Automatic by default (14-shell.js setBrandMark:
   nearby animated artwork, then the user's initial or the OpenDash logo); the
   user can pick ("Change icon…" in the corner's menu, the palette, or Settings >
   Profile) an icon, an emoji, the logo, the initial, or go back to
   automatic. Saved as config.appIcon (lib/datadir.mjs normAppIcon).
   User request, 4 Oct: the icon was always chosen automatically.

     appIconKind(v)            '' | 'logo' | 'initial' | 'icon' | 'emoji'
     openAppIconPicker(anchor) the picker popover
     applyAppIconFavicon()     the tab icon follows the choice
   ============================================================ */
let _appIconOrigHref = null;   // the built-in favicons, kept so Automatic can put them back

function appIconKind(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  if (s === 'logo' || s === 'initial') return s;
  const k = typeof czSymbolKind === 'function' ? czSymbolKind(s) : (_isIconName(s) ? 'icon' : '');
  if (k === 'icon') return document.getElementById('i-' + s) ? 'icon' : '';
  return k === 'emoji' ? 'emoji' : '';
}

/** An SVG data URL for the tab icon of an icon or emoji choice ('' for the built-in ones). */
function _appIconSvg(choice) {
  const kind = appIconKind(choice);
  const enc = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  if (kind === 'emoji') {
    const t = String(choice).replace(/[<>&]/g, '');
    return enc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="32" y="36" font-size="52" text-anchor="middle" dominant-baseline="middle">${t}</text></svg>`);
  }
  if (kind === 'icon') {
    const sym = document.getElementById('i-' + choice);
    if (!sym) return '';
    const vb = sym.getAttribute('viewBox') || '0 0 24 24';
    return enc('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="t" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#6767e0"/><stop offset="1" stop-color="#7650d4"/></linearGradient></defs>'
      + `<rect width="64" height="64" rx="14" fill="url(#t)"/><svg x="14" y="14" width="36" height="36" viewBox="${vb}" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${sym.innerHTML}</svg></svg>`);
  }
  return '';
}

function applyAppIconFavicon(pref) {
  const links = [...document.querySelectorAll('link[rel="icon"]')];
  if (!links.length) return;
  if (!_appIconOrigHref) {
    const svgLink = links.find(l => l.getAttribute('type') === 'image/svg+xml');
    _appIconOrigHref = { all: links.map(l => l.getAttribute('href')), svg: svgLink ? svgLink.getAttribute('href') : '' };
  }
  const choice = pref !== undefined ? pref : (APP_CONFIG.appIcon || '');
  const custom = _appIconSvg(choice);
  // Automatic and the logo: the tab shows today's orb (the season's, or the holiday's); the .ico keeps the built-in one.
  const ck = appIconKind(choice), orb = (!ck || ck === 'logo') && typeof FreefloBrand !== 'undefined' ? FreefloBrand.favicon() : '';
  const want = orb ? links.map((l, i) => (l.getAttribute('type') === 'image/svg+xml' ? orb : _appIconOrigHref.all[i]))
    : custom ? links.map(() => custom) : _appIconOrigHref.all;
  links.forEach((l, i) => { if (want[i] && l.getAttribute('href') !== want[i]) l.setAttribute('href', want[i]); });
}

async function _appIconSave(val) {
  const v = String(val || '');
  if (v === String(APP_CONFIG.appIcon || '')) return true;
  const ok = await settingsSaveConfig({ appIcon: v }, false);
  if (ok) {
    APP_CONFIG.appIcon = v;
    document.querySelectorAll('.brand-mark').forEach(m => { delete m.dataset.mark; });
    if (typeof renderShell === 'function') renderShell();
    applyAppIconFavicon();
    if (state.view === 'settings' || String(state.view || '').startsWith('settings')) renderMain();
  }
  return ok;
}

/** Which orb the logo shows: follows the season and the holidays (default), seasons only, the classic colours, or any one of them (a preview). */
function _appIconStyleRow() {
  const B = FreefloBrand, V = B.VARIANTS, row = document.createElement('label'); row.className = 'appicon-style';
  const opt = (v, l) => '<option value="' + esc(v) + '">' + esc(l) + '</option>';
  const group = (l, kind) => '<optgroup label="' + l + '">' + Object.keys(V).filter(k => V[k].kind === kind).map(k => opt(k, V[k].label)).join('') + '</optgroup>';
  row.innerHTML = '<span>Logo style</span><select class="control control-sm" aria-label="Logo style">' + opt('auto', 'Seasons and holidays') + opt('seasons', 'Seasons only') + opt('classic', 'Classic colours')
    + group('Pin a season', 'season') + group('Pin a holiday', 'holiday') + '</select><span>The opening picks it up the next time you open the app.</span>';
  const sel = row.querySelector('select');
  sel.value = B.saved();
  if (sel.value !== B.saved()) sel.value = 'auto';
  sel.onchange = () => {
    try { localStorage.setItem('freeflo-logo', sel.value); } catch (e) { /* storage blocked: the choice lasts until reload */ }
    document.querySelectorAll('.brand-mark').forEach(m => { delete m.dataset.mark; });
    if (typeof renderShell === 'function') renderShell();
    applyAppIconFavicon();
  };
  return row;
}

/**
 * The picker: Automatic / OpenDash logo / Initial, then Icons or Emoji
 * (searchable; any emoji can be typed or pasted). A pick saves at once.
 * opts.name: the name the Initial uses (the set-up card passes what is typed).
 * opts.onPick(val): called after a successful save.
 */
function openAppIconPicker(anchor, opts) {
  opts = opts || {};
  let symTab = appIconKind(APP_CONFIG.appIcon) === 'emoji' ? 'emoji' : 'icons';
  let symQ = '';
  return openPopover(anchor, (pop, close) => {
    pop.classList.add('appicon-pop');
    pop.style.setProperty('--c', 'var(--accent)');
    pop.setAttribute('aria-label', 'Workspace icon');
    const h = document.createElement('div'); h.className = 'cz-h'; h.textContent = 'Workspace icon';
    pop.appendChild(h);
    const cur = () => String(APP_CONFIG.appIcon || '');
    const pick = async (val) => {
      if (val === cur()) return;
      if (await _appIconSave(val)) { markAll(); if (opts.onPick) opts.onPick(val); }
    };
    const top = document.createElement('div'); top.className = 'appicon-top'; top.setAttribute('role', 'radiogroup'); top.setAttribute('aria-label', 'Built-in choices');
    const name = opts.name !== undefined ? opts.name : (typeof userName === 'function' ? userName() : '');
    for (const [val, label] of [['', 'Automatic'], ['logo', 'Freeflo logo'], ['initial', 'Initial']]) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'appicon-opt'; b.dataset.val = val;
      b.setAttribute('role', 'radio');
      const mk = document.createElement('span'); mk.className = 'brand-mark'; mk.setAttribute('aria-hidden', 'true');
      setBrandMark(mk, val === 'initial' ? (name || 'Freeflo') : name, val);
      b.append(mk, Object.assign(document.createElement('span'), { textContent: label }));
      b.title = val ? label : 'Nearby animated art when available, otherwise your initial or the Freeflo logo';
      b.onclick = () => pick(val);
      top.appendChild(b);
    }
    pop.appendChild(top);
    if (typeof FreefloBrand !== 'undefined') pop.appendChild(_appIconStyleRow());
    const bar = document.createElement('div'); bar.className = 'cz-symbar';
    const tabs = document.createElement('div'); tabs.className = 'seg cz-tabs'; tabs.setAttribute('role', 'tablist');
    const q = document.createElement('input'); q.type = 'search'; q.className = 'control control-sm cz-q'; q.setAttribute('aria-label', 'Search icons, or paste an emoji');
    q.oninput = () => { symQ = q.value; paintGrid(); };
    q.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); const b = grid.querySelector('button'); if (b) b.click(); } };
    bar.append(tabs, q);
    pop.appendChild(bar);
    const grid = document.createElement('div'); grid.className = 'cz-grid'; grid.setAttribute('role', 'listbox'); grid.setAttribute('aria-label', 'Icons');
    pop.appendChild(grid);
    function paintTabs() {
      tabs.innerHTML = '';
      for (const [k, l] of [['icons', 'Icons'], ['emoji', 'Emoji']]) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = l; b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', String(symTab === k)); b.setAttribute('aria-pressed', String(symTab === k));
        b.onclick = () => { if (symTab === k) return; symTab = k; paintTabs(); paintGrid(); };
        tabs.appendChild(b);
      }
      q.placeholder = symTab === 'icons' ? 'Search icons…' : 'Type or paste an emoji';
    }
    function paintGrid() {
      grid.innerHTML = '';
      grid.classList.toggle('emoji', symTab === 'emoji');
      const sym = (val, html, label) => {
        const b = document.createElement('button'); b.type = 'button'; b.dataset.val = val;
        b.setAttribute('role', 'option'); b.setAttribute('aria-label', label); b.title = label;
        b.innerHTML = html;
        b.onclick = () => pick(val);
        grid.appendChild(b);
      };
      const typed = symQ.trim();
      if (typed && czIsEmoji(typed)) sym(typed, `<span>${esc(typed)}</span>`, 'Use ' + typed);
      if (symTab === 'emoji') {
        const list = CZ_EMOJI.slice();
        if (appIconKind(cur()) === 'emoji' && !list.includes(cur())) list.unshift(cur());
        for (const e of list) sym(e, `<span>${esc(e)}</span>`, e);
      } else {
        const curated = typeof TB_SYMBOLS !== 'undefined' ? TB_SYMBOLS : [];
        const list = czSymbolSearch(typed && !czIsEmoji(typed) ? typed : '', curated, czSpriteIcons(), typed ? 120 : 63);
        if (appIconKind(cur()) === 'icon' && !list.includes(cur())) list.unshift(cur());
        for (const n of list) sym(n, icon(n), n.replace(/-/g, ' '));
        if (!list.length) grid.appendChild(emptyLine('No icon matches. Try another word, or paste an emoji.'));
      }
      markAll();
    }
    function markAll() {
      const c = cur();
      for (const b of top.children) { const on = b.dataset.val === c; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }
      for (const b of grid.querySelectorAll('button')) { const on = b.dataset.val === c; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); }
    }
    paintTabs(); paintGrid();
  }, { width: 316, className: 'cz-popover', align: 'start' });
}

// 2.17.1: clicking the corner (mark included) opens your profile hub (97-profile-3corner.js); the icon is changed
// from "Change icon…" in it (the workspace items), the palette or Settings.
registerMoreItem({ id: 'app-icon', label: 'Change icon…', icon: 'palette', order: 405, where: ['workspace'], run: () => openAppIconPicker(document.getElementById('ws-btn')) });
registerCommand({ id: 'change-app-icon', label: 'Change the workspace icon', icon: 'palette', keywords: 'logo emoji avatar brand mark icon', run: () => openAppIconPicker(document.getElementById('ws-btn')) });
