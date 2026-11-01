/* ============================================================
   PETS WITH AI (2.22, the page side). The person describes a change in their own words and the assistant picks
   options from the wardrobe (server: lib/pet-ai.mjs, POST /api/pets/style, the 'pet-style' job profile: no tools).
   Nothing changes until the person presses Apply, and Apply has an Undo. The answer is checked on the server and again
   here (locked options are never applied, whatever the assistant says), and every id still goes through the kit's
   tables (petNormalize) on its way into the pet.

     petAiOpen()      the "Restyle with AI" dialog (describe, preview before / after, apply)

   The wardrobe's button, the palette command 'pet-ai' and the pet page open it. Without the server, or without Claude, it
   says so and nothing breaks. Text from the assistant is shown with textContent only.
   ============================================================ */
const _PAI_LABEL = Object.freeze({ breed: 'Breed', coat: 'Coat', coatB: 'Belly', coatC: 'Pattern', marks: 'Markings', eyes: 'Eyes', collar: 'Collar', collarCol: 'Collar colour',
  bandana: 'Bandana', bandanaCol: 'Bandana colour', bow: 'Bow or flower', bowCol: 'Bow colour', hat: 'Hat', hatCol: 'Hat colour', glasses: 'Glasses', glassesCol: 'Glasses colour' });
const _PAI_EXAMPLES = Object.freeze(['Teal with amber eyes', 'A pink bandana and round glasses', 'Make it look like a tiny wizard']);

async function _paiPost(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(j.error || `HTTP ${r.status}`);
    err.code = j.code || 'HTTP_' + r.status; err.status = r.status;
    throw err;
  }
  return j;
}
function _paiWhy(e) {
  if (typeof netIsDown === 'function' && netIsDown(e)) return 'Freeflo isn\'t running, so the assistant can\'t restyle your pet. Open it from your shortcut, then try again.';
  if (e && e.status === 503) return 'Claude isn\'t connected, so the assistant cannot restyle your pet right now. Connect it in Connections, then try again.';
  return typeof netErrorMessage === 'function' ? netErrorMessage(e, 'The assistant could not do that. Try again.') : 'The assistant could not do that. Try again.';
}
/** {field: [ids]} of what this person has not unlocked yet (level, streak, season), so the assistant does not offer them. */
function _paiLocked(species) {
  const ctx = petUnlockCtx(), out = {};
  for (const f of PET_STYLE_FIELDS) {
    const ids = petOptions(f, species).filter(o => petLockOf(f, o.id, ctx, species)).map(o => o.id);
    if (ids.length) out[f] = ids;
  }
  return out;
}
/** A value as the person reads it: the option's name, or "Your own colour". */
function _paiName(field, id, species) {
  if (petHexOf(id)) return 'Your own colour';
  if (!id) return field === 'coatB' || field === 'coatC' ? 'Matched to coat' : 'None';
  const o = petOptions(field, species).find(x => x.id === id);
  return o ? o.label : String(id);
}
function _paiChip(field, id, species) {
  const c = _ptEl('span', 'pai-chip');
  const o = id ? petOptions(field, species).find(x => x.id === id) : null;
  const hex = petHexOf(id) || (o && o.hex) || '';
  if (/^#[0-9a-f]{6}$/i.test(hex)) { const dot = _ptEl('span', 'pai-dot'); dot.style.setProperty('--a', hex); dot.setAttribute('aria-hidden', 'true'); c.appendChild(dot); }
  c.appendChild(_ptEl('span', null, _paiName(field, id, species)));
  return c;
}

function petAiOpen() {
  if (!petGet().has) { if (typeof toast === 'function') toast('Adopt a pet first', { icon: 'paw-print' }); return; }
  let draft = null, busy = false;
  openDialog({
    title: 'Restyle with AI', size: 'md', resizeKey: 'pet-ai',
    body: (el, close) => {
      el.appendChild(_ptEl('p', 'muted pai-intro', 'Say what you would like to change and the assistant picks colours and accessories from the wardrobe. You see it first, and Apply can be undone.'));
      const field = _ptEl('label', 'field');
      field.appendChild(_ptEl('span', 'field-label', 'What should change?'));
      const ta = _ptEl('textarea', 'control pai-desc'); ta.rows = 3; ta.maxLength = 300; ta.placeholder = 'Make it teal with amber eyes, and give it a pink bandana';
      field.appendChild(ta);
      el.appendChild(field);
      const ex = _ptEl('div', 'pai-examples');
      for (const t of _PAI_EXAMPLES) { const b = _ptEl('button', 'pai-ex', t); b.type = 'button'; b.onclick = () => { ta.value = t; ta.focus(); }; ex.appendChild(b); }
      el.appendChild(ex);
      const status = _ptEl('div', 'pai-status muted'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
      const prev = _ptEl('div', 'pai-preview'); prev.hidden = true;
      const acts = _ptEl('div', 'pai-acts');
      el.append(status, prev, acts);
      let patch = {};
      const paintActs = () => {
        acts.replaceChildren();
        const go1 = _ptBtn(draft ? 'Try again' : 'Suggest', 'sparkles', go, draft ? 'btn-secondary' : 'btn-primary');
        go1.disabled = busy; acts.appendChild(go1);
        if (draft && Object.keys(patch).length) { const ap = _ptBtn('Apply', 'check', apply, 'btn-primary'); ap.disabled = busy; acts.appendChild(ap); }
      };
      const showDraft = () => {
        const sp = draft.look.species, ctx = petUnlockCtx(), skipped = [];
        patch = {};
        for (const [f, id] of Object.entries(draft.patch || {})) {
          if (!PET_STYLE_FIELDS.includes(f)) continue;
          const lock = petLockOf(f, id, ctx, sp);
          if (lock) skipped.push(`${_PAI_LABEL[f] || f}: ${_paiName(f, id, sp)} (${lock})`); else patch[f] = id;
        }
        for (const d of draft.dropped || []) if (d && d.why === 'locked') skipped.push(`${_PAI_LABEL[d.field] || d.field}: ${_paiName(d.field, d.id, sp)} is not unlocked yet`);
        prev.replaceChildren(); prev.hidden = false;
        const after = Object.assign({}, draft.look, patch);
        const keys = Object.keys(patch);
        if (keys.length) {
          const pair = _ptEl('div', 'pai-pair');
          for (const [lk, label] of [[draft.look, 'Now'], [after, 'After']]) {
            const w = _ptEl('div', 'pai-pet');
            const pe = petEl(lk, 104, { pose: 'sit', mood: { eyes: 'open', mouth: 'smile' }, motion: false, crop: 'none' });
            if (pe) w.appendChild(pe);
            w.appendChild(_ptEl('span', 'muted', label));
            pair.appendChild(w);
          }
          prev.appendChild(pair);
          const ul = _ptEl('ul', 'pai-changes');
          for (const f of keys) {
            const li = _ptEl('li', 'pai-row');
            li.appendChild(_ptEl('span', 'pai-f', _PAI_LABEL[f] || f));
            li.appendChild(_paiChip(f, draft.look[f], sp));
            li.appendChild(_ptEl('span', 'pai-arrow', '→'));
            li.appendChild(_paiChip(f, patch[f], sp));
            ul.appendChild(li);
          }
          prev.appendChild(ul);
        }
        if (draft.note) prev.appendChild(_ptEl('p', 'pai-note', draft.note));
        if (skipped.length) prev.appendChild(_ptEl('p', 'muted pai-skip', 'Left as it was: ' + skipped.slice(0, 4).join('; ') + '.'));
        if (draft.unmet) {
          const u = _ptEl('div', 'pai-unmet');
          u.appendChild(_ptEl('p', 'muted', 'The wardrobe has nothing for: ' + draft.unmet));
          if (typeof petAiDesignOpen === 'function') u.appendChild(_ptBtn('Design it as an accessory', 'wand-sparkles', () => { const d = ta.value.trim(); close(); petAiDesignOpen({ description: d }); }, 'btn-secondary'));
          prev.appendChild(u);
        }
        status.textContent = keys.length ? 'Here is what would change.' : (draft.unmet ? '' : 'Nothing to change. Try describing it another way.');
        paintActs();
      };
      async function go() {
        if (busy) return;
        const d = ta.value.trim();
        if (!d) { status.textContent = 'Say what to change first.'; ta.focus(); return; }
        busy = true; status.textContent = 'Thinking…'; paintActs();
        const look = Object.assign({}, petGet().look); delete look.name;
        try {
          const j = await _paiPost('/api/pets/style', { description: d, look, locked: _paiLocked(look.species) });
          draft = Object.assign({ look }, j); busy = false; showDraft();
        } catch (e) {
          draft = null; patch = {}; prev.hidden = true; status.textContent = _paiWhy(e);
        } finally { busy = false; paintActs(); }
      }
      function apply() {
        if (busy || !draft) return;
        const before = Object.assign({}, petGet().look), snap = JSON.stringify(before), note = draft.note;
        if (!_ptLookSet(patch)) { close(); return; }
        close();
        if (typeof toast === 'function') {
          toast(note || 'Your pet has a new look', { icon: 'sparkles', action: { label: 'Undo', run: () => {
            const i = _ptUI.undo.map(x => JSON.stringify(x)).lastIndexOf(snap);
            if (i >= 0) _ptUI.undo.splice(i, 1);
            const b = Object.assign({}, before); delete b.name;
            petSet({ look: b }); _ptRefresh();
          } } });
        }
        _ptRefresh();
      }
      ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); go(); } });
      paintActs();
      setTimeout(() => ta.focus(), 50);
    },
  });
}

/* ---------- My designs: the registry of your accessories, loaded from the server (lib/pet-ai.mjs, GET /api/pets/items) ---------- */
/** Fetch your saved designs and hand them to the pet code (petItemsSet checks each one again). false when the server or the file is not there. */
async function petItemsLoad() {
  try {
    const r = await fetch('/api/pets/items');
    if (!r.ok) return false;
    const j = await r.json();
    petItemsSet('me', Array.isArray(j.items) ? j.items : []);
    return true;
  } catch (e) { return false; }
}
if (typeof window !== 'undefined') window.addEventListener('load', () => setTimeout(petItemsLoad, 1200), { once: true });

/* ============================================================
   MY DESIGNS (2.22): accessories the assistant draws for your pet.
     petAiDesignOpen(o)        the "Design an accessory" dialog: describe, preview on your pet, redo with feedback, save (and wear)
     petDesignsSection(repaint) the wardrobe's "My designs" section: wear / take off a design, edit it, import a code
     petDesignEditOpen(item)   rename, recolour, nudge the fit for your species, copy the share code, delete (with Undo)
     petDesignImportOpen()     paste a share code: checked, previewed, then saved
   The assistant's drawing is checked on the server (petItemClean) and again here before it is drawn; nothing is saved or worn until
   the person says so; colours and the fit are the person's own and cost no assistant call.
   ============================================================ */
const _PDZ_EXAMPLES = Object.freeze(['A big blue wig', 'A wizard hat with stars', 'Round red glasses', 'A long striped scarf']);
function _pdzField(slot) { const s = PET_ITEM_SLOTS.find(x => x[0] === slot); return s ? s[2] : ''; }
function _pdzSlotLabel(slot) { const s = PET_ITEM_SLOTS.find(x => x[0] === slot); return s ? s[1] : String(slot); }
function _pdzWhy(e, verb) {
  if (typeof netIsDown === 'function' && netIsDown(e)) return 'Freeflo isn\'t running, so that didn\'t work. Open it from your shortcut, then try again.';
  if (e && e.status === 503) return 'Claude isn\'t connected, so the assistant cannot draw right now. Connect it in Connections, then try again.';
  if (e && e.code === 'GATE') return (verb || 'That') + ' did not pass the safety checks' + (e.errors && e.errors.length ? ` (${e.errors.slice(0, 2).join('; ')})` : '') + '. Try again, or describe it differently.';
  return typeof netErrorMessage === 'function' ? netErrorMessage(e, 'That did not work. Try again.') : 'That did not work. Try again.';
}
/** Your pet with a design on, as an <svg> string (a preview: nothing is saved or worn). */
function _pdzSvg(item, size, o) {
  o = o || {};
  const clean = petItemTrusted(item), field = clean ? _pdzField(clean.slot) : '';
  if (!clean || !field) return '';
  const look = Object.assign({}, petGet().look || petDefault()); delete look.name;
  return petSvg(Object.assign({}, look, { [field]: clean.id, items: { [field]: clean } }), { size, pose: 'sit', mood: { eyes: 'open', mouth: 'smile' }, crop: o.crop || 'none' });
}
/** Wear a design (its slot's field), or take it off. */
function _pdzWear(item, on) { return _ptLookSet({ [_pdzField(item.slot)]: on ? item.id : '' }); }

/* ---------- design with the assistant ---------- */
function petAiDesignOpen(o) {
  if (!petGet().has) { if (typeof toast === 'function') toast('Adopt a pet first', { icon: 'paw-print' }); return; }
  o = o || {};
  let draft = null, busy = false, showFeedback = false;
  openDialog({
    title: 'Design an accessory', size: 'md', resizeKey: 'pet-design',
    body: (el, close) => {
      const sp = petSpecies(petGet().look.species);
      el.appendChild(_ptEl('p', 'muted pai-intro', `Describe a wig, a hat, glasses, a scarf or a cape and the assistant draws it for your ${sp.label.toLowerCase()}. You see it first; it is only saved if you say so.`));
      const field = _ptEl('label', 'field');
      field.appendChild(_ptEl('span', 'field-label', 'What should it look like?'));
      const ta = _ptEl('textarea', 'control pai-desc'); ta.rows = 3; ta.maxLength = 300; ta.placeholder = 'A big fluffy blue wig'; ta.value = typeof o.description === 'string' ? o.description.slice(0, 300) : '';
      field.appendChild(ta);
      el.appendChild(field);
      const row = _ptEl('div', 'pdz-slotrow');
      row.appendChild(_ptEl('span', 'muted', 'Goes on'));
      const sel = _ptEl('select', 'control pdz-slot');
      for (const [v, l] of [['', 'Let the assistant choose'], ...PET_ITEM_SLOTS.map(s => [s[0], s[1]])]) { const op = _ptEl('option', null, l); op.value = v; sel.appendChild(op); }
      row.appendChild(sel);
      el.appendChild(row);
      const ex = _ptEl('div', 'pai-examples');
      for (const t of _PDZ_EXAMPLES) { const b = _ptEl('button', 'pai-ex', t); b.type = 'button'; b.onclick = () => { ta.value = t; ta.focus(); }; ex.appendChild(b); }
      el.appendChild(ex);
      const status = _ptEl('div', 'pai-status muted'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
      const prev = _ptEl('div', 'pdz-draft'); prev.hidden = true;
      const fb = _ptEl('div', 'pdz-fb'); fb.hidden = true;
      const fbIn = _ptEl('input', 'input'); fbIn.type = 'text'; fbIn.maxLength = 300; fbIn.placeholder = 'What should change? (shorter, curlier, a different blue...)'; fbIn.setAttribute('aria-label', 'What should change');
      fb.append(fbIn, _ptBtn('Redo', 'rotate-ccw', () => go(true), 'btn-secondary'));
      const acts = _ptEl('div', 'pai-acts');
      el.append(status, prev, fb, acts);
      const paintActs = () => {
        acts.replaceChildren();
        const again = _ptBtn(draft ? 'Draw again' : 'Draw it', 'sparkles', () => go(false), draft ? 'btn-secondary' : 'btn-primary'); again.disabled = busy; acts.appendChild(again);
        if (draft) {
          const tweak = _ptBtn('Change it', 'message-square', () => { showFeedback = !showFeedback; fb.hidden = !showFeedback; if (showFeedback) fbIn.focus(); }, 'btn-ghost'); tweak.disabled = busy; acts.appendChild(tweak);
          const s1 = _ptBtn('Save', 'check', () => save(false), 'btn-secondary'); s1.disabled = busy; acts.appendChild(s1);
          const s2 = _ptBtn('Save and wear', 'check', () => save(true), 'btn-primary'); s2.disabled = busy; acts.appendChild(s2);
        }
      };
      const showDraft = () => {
        const clean = petItemTrusted(draft);
        if (!clean) { draft = null; prev.hidden = true; status.textContent = 'The drawing did not pass the checks here. Try again.'; paintActs(); return; }
        draft = clean;
        prev.hidden = false; prev.replaceChildren();
        const art = _ptEl('div', 'pdz-art'); art.innerHTML = _pdzSvg(draft, 168);   // petSvg: allow-listed ids and numbers only
        prev.appendChild(art);
        const meta = _ptEl('div', 'pdz-meta');
        meta.appendChild(_ptEl('b', null, draft.label));
        meta.appendChild(_ptEl('span', 'muted', `${_pdzSlotLabel(draft.slot)} · ${draft.shapes.length} shapes`));
        prev.appendChild(meta);
        status.textContent = 'Here it is. Save it, change it, or draw it again.';
        paintActs();
      };
      async function go(redo) {
        if (busy) return;
        const d = ta.value.trim();
        if (!d) { status.textContent = 'Describe the accessory first.'; ta.focus(); return; }
        if (redo && !fbIn.value.trim()) { status.textContent = 'Say what should change first.'; fbIn.focus(); return; }
        busy = true; status.textContent = redo ? 'Changing it…' : 'Drawing…'; paintActs();
        try {
          const body = { description: d, species: petGet().look.species };
          if (sel.value) body.slot = sel.value; else if (redo && draft) body.slot = draft.slot;
          if (redo && draft) { body.feedback = fbIn.value.trim(); body.previous = draft; }
          const j = await _paiPost('/api/pets/items/make', body);
          draft = j.draft; busy = false; fbIn.value = ''; showDraft();
        } catch (e) {
          status.textContent = _pdzWhy(e, 'The drawing');
        } finally { busy = false; paintActs(); }
      }
      async function save(wear) {
        if (busy || !draft) return;
        busy = true; paintActs(); status.textContent = 'Saving…';
        try {
          const j = await _paiPost('/api/pets/items', { item: draft });
          petItemsSet('me', j.items);
          if (wear) _pdzWear(j.item, true);
          if (typeof toast === 'function') toast(wear ? `${j.item.label} is on` : `Saved to My designs: ${j.item.label}`, { icon: 'sparkles', kind: 'ok' });
          close(); _ptRefresh();
        } catch (e) {
          status.textContent = e && e.code === 'FULL' ? e.message : _pdzWhy(e, 'The drawing');
        } finally { busy = false; paintActs(); }
      }
      ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); go(false); } });
      fbIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(true); } });
      paintActs();
      setTimeout(() => ta.focus(), 50);
    },
  });
}

/* ---------- the wardrobe section ---------- */
function petDesignsSection(repaint) {
  repaint = typeof repaint === 'function' ? repaint : _ptRefresh;
  const sec = _ptSec('My designs', 'wand-sparkles');
  const bar = _ptEl('div', 'pdz-bar');
  bar.appendChild(uiButton({ label: 'Design with AI', icon: 'sparkles', kind: 'secondary', size: 'sm', cls: 'ai-only', data: { requires: 'claude' }, run: () => petAiDesignOpen() }));
  bar.appendChild(_ptBtn('Import a code', 'download', () => petDesignImportOpen(), 'btn-ghost'));
  sec.appendChild(bar);
  const items = petItemsList(), look = petGet().look || {};
  if (!items.length) {
    sec.appendChild(_ptEl('p', 'muted pdz-empty', 'Nothing here yet. Describe a wig, a hat, glasses or a scarf and the assistant draws it for your pet; what you make is kept here, and friends see it on your pet.'));
    return sec;
  }
  const grid = _ptEl('div', 'pt-tiles pdz-grid');
  for (const it of items) {
    const on = look[_pdzField(it.slot)] === it.id;
    const wrap = _ptEl('div', 'pdz-card');
    const t = _ptTile('', on, it.label, _pdzSvg(it, 56));
    t.setAttribute('aria-pressed', String(on));
    t.onclick = () => { if (_pdzWear(it, !on)) repaint(); };
    wrap.appendChild(t);
    wrap.appendChild(_ptEl('span', 'pdz-slot-l muted', _pdzSlotLabel(it.slot)));
    const ed = _ptBtn('', 'pencil', () => petDesignEditOpen(it, repaint), 'btn-ghost');
    ed.classList.add('pdz-edit'); ed.setAttribute('aria-label', `Edit ${it.label}`); ed.setAttribute('data-tip', 'Edit, recolour or share');
    wrap.appendChild(ed);
    grid.appendChild(wrap);
  }
  sec.appendChild(grid);
  return sec;
}

/* ---------- edit one: name, colours, fit, share code, delete ---------- */
function petDesignEditOpen(item, repaint) {
  repaint = typeof repaint === 'function' ? repaint : _ptRefresh;
  const species = (petGet().look || {}).species || 'cat';
  const d = JSON.parse(JSON.stringify(item));
  openDialog({
    title: 'Edit accessory', size: 'md', resizeKey: 'pet-design-edit',
    body: (el, close) => {
      const art = _ptEl('div', 'pdz-art pdz-art-edit');
      const paint = () => { art.innerHTML = _pdzSvg(d, 168); };   // petSvg: allow-listed ids and numbers only
      el.appendChild(art);
      const nameRow = _ptEl('label', 'field');
      nameRow.appendChild(_ptEl('span', 'field-label', 'Name'));
      const nameIn = _ptEl('input', 'input'); nameIn.type = 'text'; nameIn.maxLength = PET_ITEM.maxLabel; nameIn.value = d.label;
      nameIn.oninput = () => { d.label = petText(nameIn.value, PET_ITEM.maxLabel) || 'My design'; };
      nameRow.appendChild(nameIn);
      el.appendChild(nameRow);
      const colRow = _ptEl('div', 'pdz-cols');
      colRow.appendChild(_ptEl('span', 'muted', 'Colours'));
      d.cols.forEach((c, i) => {
        const inp = _ptEl('input', 'pdz-col-in'); inp.type = 'color'; inp.value = c; inp.setAttribute('aria-label', `Colour ${i + 1}`);
        inp.oninput = () => { d.cols[i] = inp.value.toLowerCase(); paint(); };
        colRow.appendChild(inp);
      });
      el.appendChild(colRow);
      const fit = () => petItemFitOf(d, species), setFit = (k, v) => { d.fitBy = d.fitBy || {}; d.fitBy[species] = Object.assign({}, fit(), { [k]: v }); paint(); };
      const fitBox = _ptEl('div', 'pdz-fit');
      fitBox.appendChild(_ptEl('span', 'muted', `Fit on your ${petSpecies(species).label.toLowerCase()}`));
      for (const [k, label, lo, hi, step] of [['dx', 'Left / right', -PET_ITEM.fit.dx, PET_ITEM.fit.dx, 1], ['dy', 'Up / down', -PET_ITEM.fit.dy, PET_ITEM.fit.dy, 1], ['s', 'Size', PET_ITEM.fit.smin, PET_ITEM.fit.smax, 0.05], ['rot', 'Tilt', -PET_ITEM.fit.rot, PET_ITEM.fit.rot, 1]]) {
        const r = _ptEl('label', 'pdz-range'); r.appendChild(_ptEl('span', null, label));
        const inp = _ptEl('input'); inp.type = 'range'; inp.min = String(lo); inp.max = String(hi); inp.step = String(step); inp.value = String(fit()[k]); inp.setAttribute('aria-label', label);
        inp.oninput = () => setFit(k, Number(inp.value));
        r.appendChild(inp); fitBox.appendChild(r);
      }
      el.appendChild(fitBox);
      const code = _ptEl('textarea', 'control pdz-code'); code.rows = 3; code.readOnly = true; code.hidden = true; code.setAttribute('aria-label', 'Share code');
      el.appendChild(code);
      const status = _ptEl('div', 'pai-status muted'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
      el.appendChild(status);
      const acts = _ptEl('div', 'pai-acts pdz-acts');
      const del = _ptBtn('Delete', 'trash-2', async () => {
        try {
          const j = await _paiPost('/api/pets/items/delete', { id: d.id });
          petItemsSet('me', j.items);
          const worn = petGet().look || {};
          for (const [, , f] of PET_ITEM_SLOTS) if (worn[f] === d.id) _ptLookSet({ [f]: '' });
          close(); repaint();
          if (typeof toast === 'function') toast(`Deleted ${item.label}`, { icon: 'trash-2', action: { label: 'Undo', run: async () => { try { const r = await _paiPost('/api/pets/items', { item }); petItemsSet('me', r.items); repaint(); } catch (e) { toast(_pdzWhy(e), { kind: 'error' }); } } } });
        } catch (e) { status.textContent = _pdzWhy(e); }
      }, 'btn-ghost');
      const share = _ptBtn('Share code', 'copy', async () => {
        try {
          const j = await _paiPost('/api/pets/items/export', { item: d });
          code.value = j.code; code.hidden = false;
          let copied = false;
          try { await navigator.clipboard.writeText(j.code); copied = true; } catch (e) { /* the box is there to copy by hand */ }
          status.textContent = copied ? 'Copied. Anyone with Freeflo can paste it under My designs > Import a code.' : 'Select the code above and copy it. Anyone with Freeflo can paste it under My designs > Import a code.';
        } catch (e) { status.textContent = _pdzWhy(e); }
      }, 'btn-ghost');
      const sv = _ptBtn('Save', 'check', async () => {
        try {
          const j = await _paiPost('/api/pets/items', { item: d });
          petItemsSet('me', j.items);
          close(); repaint();
        } catch (e) { status.textContent = _pdzWhy(e); }
      }, 'btn-primary');
      acts.append(del, share, sv);
      el.appendChild(acts);
      paint();
    },
  });
}

/* ---------- import a share code ---------- */
function petDesignImportOpen() {
  let draft = null;
  openDialog({
    title: 'Import an accessory', size: 'md', resizeKey: 'pet-design-import',
    body: (el, close) => {
      el.appendChild(_ptEl('p', 'muted pai-intro', 'Paste a code someone shared. It is checked first, and you see it on your pet before it is saved.'));
      const ta = _ptEl('textarea', 'control pdz-code'); ta.rows = 4; ta.placeholder = 'opendash-pet-item:v1:...'; ta.setAttribute('aria-label', 'Share code');
      el.appendChild(ta);
      const status = _ptEl('div', 'pai-status muted'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
      const prev = _ptEl('div', 'pdz-draft'); prev.hidden = true;
      const acts = _ptEl('div', 'pai-acts');
      el.append(status, prev, acts);
      const paintActs = () => {
        acts.replaceChildren();
        acts.appendChild(_ptBtn('Check it', 'search', check, draft ? 'btn-secondary' : 'btn-primary'));
        if (draft) acts.appendChild(_ptBtn('Save to My designs', 'check', save, 'btn-primary'));
      };
      async function check() {
        const c = ta.value.trim();
        if (!c) { status.textContent = 'Paste a code first.'; ta.focus(); return; }
        status.textContent = 'Checking…';
        try {
          const j = await _paiPost('/api/pets/items/import', { code: c });
          const clean = petItemTrusted(j.draft);
          if (!clean) throw Object.assign(new Error('x'), { code: 'GATE', errors: [] });
          draft = clean; prev.hidden = false; prev.replaceChildren();
          const art = _ptEl('div', 'pdz-art'); art.innerHTML = _pdzSvg(draft, 168); prev.appendChild(art);
          const meta = _ptEl('div', 'pdz-meta'); meta.appendChild(_ptEl('b', null, draft.label)); meta.appendChild(_ptEl('span', 'muted', `${_pdzSlotLabel(draft.slot)} · ${draft.shapes.length} shapes`)); prev.appendChild(meta);
          status.textContent = 'Here it is on your pet.';
        } catch (e) { draft = null; prev.hidden = true; status.textContent = _pdzWhy(e, 'That code'); }
        paintActs();
      }
      async function save() {
        if (!draft) return;
        try {
          const j = await _paiPost('/api/pets/items', { item: draft });
          petItemsSet('me', j.items);
          if (typeof toast === 'function') toast(`Saved to My designs: ${j.item.label}`, { icon: 'sparkles', kind: 'ok' });
          close(); _ptRefresh();
        } catch (e) { status.textContent = e && e.code === 'FULL' ? e.message : _pdzWhy(e); }
      }
      paintActs();
      setTimeout(() => ta.focus(), 50);
    },
  });
}
