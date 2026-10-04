/* ============================================================
   MAKE YOUR OWN (v2.2 wave 6), the page side. The user describes an
   animation; the assistant drafts it (POST /api/anim/make: the 'anim-make'
   profile, no tools); the draft has already passed the sanitiser and the
   quality gate on the server, and is checked AGAIN here (71-anim-sanitize.js)
   before it is previewed. Save keeps it in the data folder
   (<data>/animations/mine.json); the "My animations" pack (id 'mine') is built
   from those records and registered like any other pack, so pins, favourites,
   blocks, packs off and the daily look all apply.
     animMineLoad()            fetch the saved records and (re)register the pack
     animMineItems()           the records loaded
     animMakeOpen()            the "Create an animation" dialog (preview, then save)
     animMineSection(onChange) the gallery's "My animations" block (create, delete)
   Without the server, or without Claude, it says so and nothing breaks.
   ============================================================ */
let _amMine = [];
let _amLoaded = false;

async function _amPost(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(j.error || `HTTP ${r.status}`);
    err.code = j.code || 'HTTP_' + r.status; err.status = r.status; err.errors = Array.isArray(j.errors) ? j.errors : [];
    throw err;
  }
  return j;
}
function animMineItems() { return _amMine.slice(); }
function _amRegister(items) {
  _amMine = Array.isArray(items) ? items : [];
  const pack = animMinePack(_amMine);
  if (pack) animRegisterPack(pack); else animUnregisterPack(ANIM_MAKE_PACK_ID);
  const st = document.getElementById('ap-css-' + ANIM_MAKE_PACK_ID);
  if (st) st.textContent = pack ? pack.css : '';
  if (typeof _agMemo !== 'undefined') _agMemo.key = '';
  if (typeof animThemeApply === 'function') animThemeApply();
}
async function animMineLoad() {
  try {
    const r = await fetch('/api/anim/mine');
    if (!r.ok) return false;
    const j = await r.json();
    _amLoaded = true;
    _amRegister(j.items);
    return true;
  } catch (e) { return false; }
}
function _amWhy(e) {
  if (typeof netIsDown === 'function' && netIsDown(e)) return 'The OpenDash server isn\'t running, so the assistant cannot draw. Start it, then try again.';
  if (e && e.status === 503) return 'Claude isn\'t connected, so the assistant cannot draw right now. Connect it in Connections, then try again.';
  if (e && e.code === 'GATE') return 'The drawing did not pass the safety and quality checks' + (e.errors && e.errors.length ? ` (${e.errors.slice(0, 2).join('; ')})` : '') + '. Try again, or describe it differently.';
  return typeof netErrorMessage === 'function' ? netErrorMessage(e, 'The assistant could not draw that. Try again.') : 'The assistant could not draw that. Try again.';
}

function animMakeOpen(onSaved) {
  let draft = null, busy = false;
  openDialog({
    title: 'Create an animation', width: 560, resizeKey: 'anim-make',
    body: (el, close) => {
      el.innerHTML = `<p class="muted am-intro">Describe a small looping animation and the assistant draws it. It is checked for safety and size, and you see it before anything is saved.</p>`
        + `<label class="field"><span class="field-label">Describe it</span><textarea class="control am-desc" rows="3" maxlength="400" placeholder="A paper boat bobbing on small waves, with a gull overhead"></textarea></label>`
        + `<label class="field"><span class="field-label">Where it plays</span></label>`
        + `<div class="am-status muted" role="status" aria-live="polite"></div><div class="am-preview" hidden></div>`
        + `<div class="am-acts"></div>`;
      const ta = el.querySelector('.am-desc'), status = el.querySelector('.am-status'), prev = el.querySelector('.am-preview'), acts = el.querySelector('.am-acts');
      const slotField = el.querySelectorAll('.field')[1];
      const slot = _settingsSelect([['', 'Let the assistant choose'], ...ANIM_MAKE_SLOTS.map(s => [s, _agSlotLabel(s)])], '', () => {});
      slot.classList.add('am-slot');
      slotField.appendChild(slot);
      const sel = slot.tagName === 'SELECT' ? slot : slot.querySelector('select');
      const btn = (label, cls, fn, ic) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm ' + cls; b.innerHTML = (ic ? icon(ic, 'i-sm') : '') + `<span>${esc(label)}</span>`; b.onclick = fn; return b; };
      const paintActs = () => {
        acts.replaceChildren();
        acts.appendChild(btn(draft ? 'Draw again' : 'Draw it', draft ? 'btn-secondary' : 'btn-primary', go, 'sparkles'));
        if (draft) acts.appendChild(btn('Save to My animations', 'btn-primary', save, 'check'));
      };
      const showDraft = () => {
        // Checked again on the page before anything is drawn (the server's answer is not trusted either).
        const v = animMakeItem(draft, { id: draft && draft.id });
        if (!v.ok) { draft = null; prev.hidden = true; status.textContent = 'The drawing did not pass the checks here. Try again.'; paintActs(); return; }
        draft = v.item;
        const pk = animMinePack([draft]);
        const it = Object.assign({ ref: ANIM_MAKE_PACK_ID + '/' + draft.id }, pk.items[0]);
        let styleEl = document.getElementById('am-preview-css');
        if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'am-preview-css'; document.head.appendChild(styleEl); }
        styleEl.textContent = pk.css || '';   // the gated css (only moves while live)
        const reduced = !!(window.Motion && Motion.prefersReduced && Motion.prefersReduced());
        prev.hidden = false;
        prev.innerHTML = `<div class="am-prev-art">${animItemHtml(it, { size: 'xl', live: true, reduced, label: draft.label })}<span class="muted">Moving</span></div>`
          + `<div class="am-prev-art">${animItemHtml(it, { size: 'xl', reduced: true })}<span class="muted">Still (reduced motion)</span></div>`
          + `<div class="am-prev-meta"><b>${esc(draft.label)}</b><span class="muted">${esc(_agSlotLabel(draft.slot))}</span><span class="apg-tags">${draft.tags.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</span></div>`;
        status.textContent = 'Here it is. Save it, or draw again.';
        paintActs();
      };
      async function go() {
        if (busy) return;
        const d = ta.value.trim();
        if (!d) { status.textContent = 'Describe the animation first.'; ta.focus(); return; }
        busy = true; status.textContent = 'Drawing…'; acts.querySelectorAll('button').forEach(b => { b.disabled = true; });
        try {
          const j = await _amPost('/api/anim/make', { description: d, slot: sel && sel.value ? sel.value : undefined });
          draft = j.draft; showDraft();
        } catch (e) {
          status.textContent = _amWhy(e); paintActs();
        } finally { busy = false; acts.querySelectorAll('button').forEach(b => { b.disabled = false; }); }
      }
      async function save() {
        if (busy || !draft) return;
        busy = true; status.textContent = 'Saving…';
        try {
          const j = await _amPost('/api/anim/mine', { draft });
          _amRegister(j.items);
          if (typeof toast === 'function') toast(`Saved to My animations: ${draft.label}`);
          close();
          if (typeof onSaved === 'function') onSaved(j.item);
        } catch (e) {
          status.textContent = e && e.code === 'FULL' ? e.message : _amWhy(e);
        } finally { busy = false; }
      }
      paintActs();
    },
    onClose: () => { const st = document.getElementById('am-preview-css'); if (st) st.remove(); },
  });
}

/** The gallery's "My animations" block: create, and the saved ones with Delete. */
function animMineSection(onChange) {
  const box = document.createElement('div'); box.className = 'apg-mine';
  const max = ANIM_MAKE_MAX_ITEMS;
  box.innerHTML = `<div class="apg-sub">My animations <span class="muted">· ${esc(_amMine.length)} of ${esc(max)} · describe one and the assistant draws it</span></div>`;
  const row = document.createElement('div'); row.className = 'apg-mine-row';
  const make = document.createElement('button'); make.type = 'button'; make.className = 'btn btn-secondary btn-sm am-create';
  make.innerHTML = icon('sparkles', 'i-sm') + '<span>Create an animation</span>';
  make.disabled = _amMine.length >= max;
  if (make.disabled) make.setAttribute('data-tip', 'My animations is full: delete one first.');
  make.onclick = () => animMakeOpen(() => { if (onChange) onChange(); });
  row.appendChild(make);
  const reduced = !!(window.Motion && Motion.prefersReduced && Motion.prefersReduced());
  for (const r of _amMine) {
    const it = animItem(ANIM_MAKE_PACK_ID + '/' + r.id);
    if (!it) continue;
    const f = document.createElement('figure'); f.className = 'ag-item apg-item apg-mine-item anim-hover-host';
    f.innerHTML = `${animItemHtml(it, { size: 'lg', hover: true, reduced })}<figcaption><b>${esc(r.label)}</b><span>${esc(_agSlotLabel(r.slot))}</span></figcaption>`;
    if (r.about) f.setAttribute('data-tip', r.about);
    const del = _agBtn('trash-2', 'Delete', false, async () => {
      const ok = typeof confirmDialog === 'function' ? await confirmDialog({ title: 'Delete this animation?', text: `"${r.label}" will be removed from My animations.`, confirmLabel: 'Delete', danger: true }) : true;
      if (!ok) return;
      try {
        const j = await _amPost('/api/anim/mine/delete', { id: r.id });
        _amRegister(j.items);
        if (onChange) onChange();
      } catch (e) { if (typeof toast === 'function') toast(netErrorMessage(e, 'Not deleted. Try again.')); }
    });
    const acts = document.createElement('div'); acts.className = 'apg-acts'; acts.appendChild(del);
    f.appendChild(acts);
    row.appendChild(f);
  }
  box.appendChild(row);
  if (!_amLoaded) {
    const p = document.createElement('p'); p.className = 'muted apg-mine-off';
    p.textContent = 'Saved animations load from the OpenDash server; they appear here once it answers.';
    box.appendChild(p);
  }
  return box;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('load', () => { setTimeout(() => { animMineLoad(); }, 600); }, { once: true });
}
