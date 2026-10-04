/* ============================================================
   CUSTOMISE TOP BAR (owner: Home / top-bar builder)
   openTopbarCustomiser({select: id, add: type}) and the older entry point
   openCountdownEditor(id | null). A modal with a live preview strip (drag
   to reorder), the widget list (drag, show/hide), "Add widget" types and a
   form for the selected widget. Works on a draft; Save writes it once (one
   undo step), Cancel throws it away. Look: mockup 03-countdown-editor.
   ============================================================ */
// Curated symbols (all in vendor/icons; tools/build-icon-sprite.mjs lists
// them). The first 24 show by default; search covers names and keywords.
const TB_SYMBOLS = [
  ['graduation-cap', 'thesis degree phd university viva graduation'], ['scroll-text', 'paper manuscript document review'],
  ['file-text', 'document report draft'], ['presentation', 'talk slides conference deck'], ['award', 'prize grant milestone'],
  ['flask-conical', 'lab experiment chemistry'], ['target', 'goal aim deadline'], ['rocket', 'launch start job'],
  ['briefcase', 'job work career contract'], ['building-2', 'company office organisation'], ['landmark', 'grant funding bank government'],
  ['coins', 'money savings'], ['plane', 'travel trip flight holiday conference'], ['map-pin', 'place location visit'],
  ['cake', 'birthday celebration'], ['gift', 'birthday present'], ['party-popper', 'celebrate party'], ['heart', 'love family health'],
  ['baby', 'baby family'], ['stethoscope', 'doctor health appointment'], ['mountain', 'hike climb adventure'],
  ['star', 'favourite important'], ['flag', 'milestone deadline'], ['hourglass', 'countdown time'],
  ['link', 'connect relationship'], ['trophy', 'win achievement'], ['calendar', 'date day'], ['sparkles', 'new special'],
  ['microscope', 'research science lab'], ['atom', 'science physics'], ['dna', 'biology genetics'], ['test-tube', 'lab experiment sample'],
  ['brain', 'thinking model ai'], ['factory', 'process plant manufacturing'], ['lightbulb', 'idea'], ['book-open', 'reading study book'],
  ['notebook-pen', 'notes writing journal'], ['pen-tool', 'design draw'], ['laptop', 'computer work remote'], ['code', 'programming software'],
  ['terminal', 'code script'], ['cpu', 'computer hardware'], ['database', 'data'], ['chart-line', 'trend results data'],
  ['trending-up', 'growth progress'], ['chart-pie', 'budget share'], ['banknote', 'money pay salary'],
  ['piggy-bank', 'savings budget'], ['wallet', 'money spend'], ['credit-card', 'card payment bill'], ['receipt', 'bill invoice expense'],
  ['house', 'home move rent'], ['key-round', 'keys move flat'], ['shopping-cart', 'shopping groceries'], ['package', 'delivery parcel'],
  ['truck', 'move delivery'], ['train-front', 'train travel commute'], ['car', 'drive driving test car'], ['bike', 'cycle ride'],
  ['ship', 'boat cruise'], ['map', 'trip route'], ['compass', 'explore direction'],
  ['tent', 'camping'], ['palmtree', 'holiday beach vacation'], ['luggage', 'trip travel packing'], ['snowflake', 'winter christmas'],
  ['sunrise', 'morning start'], ['sunset', 'evening end'], ['sun', 'summer day'], ['moon', 'night'], ['umbrella', 'rain weather'],
  ['leaf', 'nature autumn'], ['trees', 'forest nature'], ['tree-pine', 'christmas winter'], ['flower-2', 'spring garden'],
  ['sprout', 'growth new start'], ['recycle', 'recycling environment sustainability'], ['waves', 'sea swim'], ['anchor', 'boat stable'],
  ['pill', 'medicine health'], ['hospital', 'hospital health'],
  ['dumbbell', 'gym fitness exercise'], ['medal', 'race sport'], ['calendar-heart', 'anniversary date wedding'], ['coffee', 'break meeting'],
  ['utensils', 'dinner food restaurant'], ['wine', 'celebration dinner'], ['beer', 'pub drinks'], ['pizza', 'food'], ['cookie', 'treat'],
  ['apple', 'food health teacher'], ['music', 'concert gig'], ['headphones', 'music podcast'], ['mic', 'talk podcast interview'],
  ['camera', 'photo'], ['film', 'movie cinema'], ['ticket', 'event concert show'], ['gamepad-2', 'games play'], ['puzzle', 'problem hobby'],
  ['newspaper', 'news publication'], ['megaphone', 'announcement launch'], ['bell', 'reminder alert'], ['alarm-clock', 'reminder wake'],
  ['timer', 'time count'], ['clock', 'time'], ['mail', 'email letter'], ['send', 'submit send'], ['phone', 'call'], ['video', 'call meeting'],
  ['users', 'team people group'], ['user', 'person'], ['handshake', 'deal agreement contract partner'], ['school', 'school teaching'],
  ['shield-check', 'insurance safe security'], ['lock', 'secure private'], ['bug', 'bug fix'], ['wrench', 'fix repair'], ['hammer', 'build diy'],
  ['ruler', 'measure'], ['glasses', 'optician reading'], ['shirt', 'clothes'], ['dog', 'pet dog'], ['cat', 'pet cat'], ['paw-print', 'pet'],
  ['milestone', 'milestone progress'], ['signpost', 'direction decision'], ['goal', 'goal target'], ['crown', 'best'], ['gem', 'valuable'],
  ['rainbow', 'happy'], ['bed', 'sleep rest'], ['wifi', 'internet'], ['battery-charging', 'energy rest'], ['zap', 'energy fast'],
  ['flame', 'streak hot'], ['circle-check', 'done complete'], ['list-checks', 'tasks checklist'], ['calendar-clock', 'event meeting'],
];
const _TBE_FIRST = 24;
// Row summaries for the live task counts ("Live count of today's tasks").
const _TBE_COUNT_OF = { today: 'today’s tasks', overdue: 'overdue tasks', week: 'the next 7 days', doing: 'tasks in progress', pinned: 'pinned tasks' };

let _tbeOpen = null;   // the open editor (one at a time)

/**
 * A date field in the design-system look: [calendar icon] "Sun 20 Dec 2026"
 * [time] [x]. Clicking opens a mini month with quick picks and a box to
 * type an ISO date. Used by the customiser and the Home sheet.
 * o: { value, onChange(iso|''), time, onTime(hh:mm|''), label, placeholder, clearable, fk }
 */
function uiDateField(o) {
  o = o || {};
  const wrap = document.createElement('div'); wrap.className = 'input ui-datef';
  if (o.fk) wrap.dataset.fkWrap = o.fk;
  wrap.innerHTML = icon('calendar', 'i-sm');
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'ui-datef-btn';
  if (o.fk) btn.dataset.fk = o.fk;
  btn.setAttribute('aria-haspopup', 'dialog');
  const paint = () => {
    btn.textContent = o.value ? _uiLongDate(o.value) : (o.placeholder || 'Pick a date');
    btn.classList.toggle('is-empty', !o.value);
    btn.setAttribute('aria-label', (o.label || 'Date') + ': ' + (o.value ? _uiLongDate(o.value) : 'none'));
    if (clr) clr.hidden = !o.value;
  };
  wrap.appendChild(btn);
  if (typeof o.onTime === 'function') {
    const ti = document.createElement('input'); ti.type = 'time'; ti.className = 'ui-datef-time'; ti.value = o.time || '';
    ti.setAttribute('aria-label', 'Time (optional)');
    if (o.fk) ti.dataset.fk = o.fk + '-time';
    ti.classList.toggle('is-empty', !ti.value);
    ti.oninput = () => ti.classList.toggle('is-empty', !ti.value);
    ti.onchange = () => { ti.classList.toggle('is-empty', !ti.value); o.onTime(/^([01]\d|2[0-3]):[0-5]\d$/.test(ti.value) ? ti.value : ''); };
    // An empty time reads "Add time" instead of the browser's "--:--".
    const tw = document.createElement('span'); tw.className = 'ui-datef-tw';
    const tph = document.createElement('span'); tph.className = 'ui-datef-tph'; tph.setAttribute('aria-hidden', 'true');
    tph.innerHTML = icon('clock', 'i-xs') + '<span>Add time</span>';
    tw.append(ti, tph);
    wrap.appendChild(tw);
  }
  let clr = null;
  if (o.clearable) {
    clr = document.createElement('button'); clr.type = 'button'; clr.className = 'btn-icon btn-sm ui-datef-x';
    clr.innerHTML = icon('x'); clr.setAttribute('aria-label', 'Clear the date');
    clr.onclick = (e) => { e.stopPropagation(); o.value = ''; paint(); o.onChange && o.onChange(''); };
    wrap.appendChild(clr);
  }
  const pick = (iso) => { o.value = iso; paint(); o.onChange && o.onChange(iso); };
  btn.onclick = () => openPopover(wrap, (el, close) => {
    el.classList.add('pad', 'ui-datef-pop');
    const plus = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return fmtDate(d); };
    const nextMon = (() => { const d = new Date(); d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7)); return fmtDate(d); })();
    const inMonth = (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return fmtDate(d); })();
    const quick = document.createElement('div'); quick.className = 'ui-datef-quick';
    for (const [t, v] of [['Today', todayStr()], ['Tomorrow', plus(1)], ['Next week', nextMon], ['In a month', inMonth]]) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip chip-lg'; b.textContent = t;
      b.title = _uiLongDate(v);
      b.onclick = () => { close(); pick(v); btn.focus(); };
      quick.appendChild(b);
    }
    el.appendChild(quick);
    const mm = document.createElement('div');
    buildMiniMonth(mm, { value: o.value || '', month: (o.value || todayStr()).slice(0, 7), onPick: (d) => { close(); pick(d); btn.focus(); } });
    el.appendChild(mm);
    const typed = document.createElement('input'); typed.className = 'control control-sm ui-datef-typed'; typed.placeholder = 'Or type YYYY-MM-DD';
    typed.value = o.value || ''; typed.setAttribute('aria-label', 'Type a date as YYYY-MM-DD'); typed.maxLength = 10;
    typed.onkeydown = (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const v = typed.value.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v + 'T00:00:00'))) { close(); pick(v); btn.focus(); }
      else typed.classList.add('is-invalid');
    };
    el.appendChild(typed);
  }, { width: 268, align: 'start' });
  paint();
  return wrap;
}
function _uiLongDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return _tbFmtParts(d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) || iso;
}

function openCountdownEditor(cdId) {
  if (cdId) openTopbarCustomiser({ select: cdId });
  else openTopbarCustomiser({ add: 'countdown' });
}

function _tbeNewWidget(type, list) {
  const id = 'cd-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5);
  const used = new Set(list.map(w => w.color));
  const color = _CD_SWATCHES.find(c => !used.has(c)) || _CD_SWATCHES[list.length % _CD_SWATCHES.length];
  const plus = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return fmtDate(d); };
  const base = { id, type, label: '', color, headline: list.length === 0, visible: true };
  if (type === 'countdown') Object.assign(base, { date: plus(30), unit: 'days', warnDays: 14 });
  if (type === 'countup') Object.assign(base, { date: todayStr(), unit: 'days', warnDays: 0 });
  if (type === 'progress') Object.assign(base, { start: todayStr(), date: plus(30), showBar: true, warnDays: 0 });
  if (type === 'tasks') Object.assign(base, { tasks: 'today', warnDays: 0 });
  if (type === 'clock') Object.assign(base, { clock: 'both', color: 'slate' });
  if (type === 'event') Object.assign(base, { color: 'blue' });
  return tbNormalize(base, list.length, false);
}

function _tbeSummary(w) {
  const t = TB_TYPES[w.type];
  if (t.dated) {
    if (!w.date) return t.label + ' · no date';
    const d = daysUntil(w.date);
    const when = _tbShortDate(w.date, true);
    if (w.type === 'countup') return `Count up from ${_tbShortDate(w.date)}${d < 0 ? ` · ${-d} day${d === -1 ? '' : 's'}` : ''}${w.headline ? ' · headline' : ''}${!w.visible ? ' · hidden' : ''}`;
    const extra = w.type === 'progress' ? (w.start ? `from ${_tbShortDate(w.start)}` : 'needs a start date')
      : d < 0 ? `${-d} days ago` : d === 0 ? 'today' : w.unit === 'weeks' ? `${Math.floor(d / 7)} weeks` : `${d} days`;
    return `${when} · ${extra}${w.headline ? ' · headline' : ''}${!w.visible ? ' · hidden' : ''}`;
  }
  if (w.type === 'tasks') return `Live count of ${_TBE_COUNT_OF[w.tasks] || TB_TASK_FILTERS[w.tasks].toLowerCase()}${!w.visible ? ' · hidden' : ''}`;
  if (w.type === 'event') return `Next calendar event${!w.visible ? ' · hidden' : ''}`;
  return `${TB_CLOCK_FORMATS[w.clock]}${!w.visible ? ' · hidden' : ''}`;
}
function _tbeTitle(w) {
  if (w.label) return w.label;
  if (w.type === 'tasks') return TB_TASK_FILTERS[w.tasks];
  return TB_TYPES[w.type].label;
}

function openTopbarCustomiser(opts) {
  opts = opts || {};
  if (_tbeOpen) _tbeOpen.close(true);
  const ed = { draft: tbList().map(w => Object.assign({}, w)), sel: null, dirty: false, showAll: false, q: '', errors: {} };
  if (opts.add && TB_TYPES[opts.add]) { const w = _tbeNewWidget(opts.add, ed.draft); ed.draft.push(w); ed.sel = w.id; ed.dirty = true; ed.focusLabel = true; }
  else ed.sel = (opts.select && ed.draft.some(w => w.id === opts.select)) ? opts.select : (ed.draft[0] && ed.draft[0].id);

  const scrim = document.createElement('div'); scrim.className = 'scrim tbe-scrim';
  const dlg = document.createElement('div');
  dlg.className = 'modal tbe'; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-labelledby', 'tbe-title');
  dlg.innerHTML = `
    <div class="modal-h">${icon('sliders-horizontal', 'i-lg')}<h2 id="tbe-title">Customise top bar</h2><span class="tbe-hint">Drag to reorder. Changes preview live.</span>
      <button type="button" class="btn-icon" data-act="close" aria-label="Close">${icon('x')}</button></div>
    <div class="tbe-preview">
      <div class="tbe-preview-h"><span class="overline">Preview</span><span class="tbe-fit"></span></div>
      <div class="tbe-strip" role="list" aria-label="Preview of the top bar"></div>
    </div>
    <div class="tbe-body">
      <div class="tbe-list">
        <div class="overline tbe-sec">Widgets</div>
        <div class="tbe-rows" role="listbox" aria-label="Widgets"></div>
        <div class="overline tbe-sec">Add widget</div>
        <div class="add-types"></div>
      </div>
      <div class="tbe-form"></div>
    </div>
    <div class="modal-f">
      <button type="button" class="btn btn-ghost tbe-del" data-act="delete">${icon('trash-2', 'i-sm')}<span>Delete widget</span></button>
      <span class="spacer"></span>
      <button type="button" class="btn btn-ghost" data-act="cancel">Cancel</button>
      <button type="button" class="btn btn-primary" data-act="save"><span>Save</span><kbd class="kbd tbe-kbd" aria-label="Ctrl+Enter">Ctrl ↵</kbd></button>
    </div>`;
  const $ = (s) => dlg.querySelector(s);
  const prevFocus = document.activeElement;
  let sortStrip = null, sortRows = null, closed = false;
  const cur = () => ed.draft.find(w => w.id === ed.sel) || null;
  // The draft in display order (headline first), as the live objects.
  const edOrdered = () => { const h = ed.draft.find(w => w.headline); return h ? [h, ...ed.draft.filter(w => w !== h)] : ed.draft.slice(); };
  const touch = () => { ed.dirty = true; };

  /* ----- preview strip ----- */
  function renderPreview() {
    const strip = $('.tbe-strip');
    strip.innerHTML = '';
    const ordered = edOrdered();
    for (const w of ordered) {
      const el = tbWidgetEl(w, { tag: 'div' });
      el.setAttribute('role', 'listitem');
      el.classList.toggle('is-off', !w.visible);
      el.classList.toggle('is-sel', w.id === ed.sel);
      el.onclick = () => select(w.id);
      strip.appendChild(el);
    }
    if (!ordered.length) {
      const e = document.createElement('div'); e.className = 'tbe-empty'; e.textContent = 'No widgets yet: add one below.';
      strip.appendChild(e);
    }
    // How much of it fits in the real top bar at this window width.
    const host = document.getElementById('tb-widgets');
    const visible = ordered.filter(w => w.visible);
    let fits = visible.length;
    if (host) {
      const room = host.clientWidth - 44;
      let used = 0; fits = 0;
      for (const n of strip.querySelectorAll('.cdw:not(.is-off)')) { used += n.offsetWidth + 6; if (used <= room) fits++; }
    }
    const f = $('.tbe-fit');
    const over = visible.length - fits;
    f.textContent = `${visible.length} of ${ordered.length} visible` + (visible.length ? (over <= 0 ? ` · fits ${window.innerWidth} px` : ` · ${over} under “+${over}” at ${window.innerWidth} px`) : '');
    if (sortStrip) sortStrip.destroy();
    sortStrip = makeSortable(strip, { items: '.cdw[data-id]', axis: 'x', onReorder: (ids) => reorder(ids) });
    // A soft edge shows there is more to scroll to, instead of a hard cut.
    const edge = () => {
      const max = strip.scrollWidth - strip.clientWidth;
      strip.classList.toggle('fade-r', max > 1 && strip.scrollLeft < max - 1);
      strip.classList.toggle('fade-l', max > 1 && strip.scrollLeft > 1);
    };
    strip.onscroll = edge;
    requestAnimationFrame(edge);
  }
  function reorder(ids) {
    const map = new Map(ed.draft.map(w => [w.id, w]));
    ed.draft = ids.map(id => map.get(id)).filter(Boolean);
    // Whatever lands first becomes the headline (the bar always leads with it).
    if (ed.draft.length && !ed.draft[0].headline && ed.draft.some(w => w.headline)) {
      for (const w of ed.draft) if (w.headline) { w.headline = false; if (w.style === 'tinted') w.style = 'subtle'; }
      ed.draft[0].headline = true; if (ed.draft[0].style === 'subtle') ed.draft[0].style = 'tinted';
    }
    touch(); renderPreview(); renderRows(); renderForm();
  }

  /* ----- widget list ----- */
  function renderRows() {
    const box = $('.tbe-rows');
    box.innerHTML = '';
    for (const w of edOrdered()) {
      const r = document.createElement('div');
      const col = tbColorAttrs(w.color);
      r.className = 'wrow ' + col.cls + (w.id === ed.sel ? ' on' : '') + (w.visible ? '' : ' hidden') + (ed.errors[w.id] ? ' has-error' : '');
      if (col.style) r.setAttribute('style', col.style);
      r.dataset.id = w.id; r.tabIndex = w.id === ed.sel ? 0 : -1;
      r.setAttribute('role', 'option'); r.setAttribute('aria-selected', w.id === ed.sel ? 'true' : 'false');
      r.innerHTML = `<span class="grip" aria-hidden="true">${icon('grip-vertical')}</span><span class="cdw-ic">${tbIconHtml(w)}</span>`
        + `<span class="wrow-txt"><span class="t">${esc(_tbeTitle(w))}</span><span class="s">${esc(_tbeSummary(w))}</span></span>`
        + `<button type="button" class="btn-icon btn-sm vis" aria-label="${w.visible ? 'Hide' : 'Show'} ${escAttr(_tbeTitle(w))}" data-tip="${w.visible ? 'Hide from the top bar' : 'Show in the top bar'}">${icon(w.visible ? 'eye' : 'eye-off')}</button>`;
      r.onclick = (e) => {
        if (e.target.closest('.vis')) { w.visible = !w.visible; touch(); renderPreview(); renderRows(); renderForm(); focusRow(w.id); return; }
        select(w.id);
      };
      r.onkeydown = (e) => rowKey(e, w);
      box.appendChild(r);
    }
    if (sortRows) sortRows.destroy();
    sortRows = makeSortable(box, { items: '.wrow[data-id]', axis: 'y', onReorder: (ids) => reorder(ids) });
  }
  function focusRow(id) { setTimeout(() => { const r = dlg.querySelector(`.wrow[data-id="${CSS.escape(id)}"]`); if (r) r.focus(); }, 0); }
  function rowKey(e, w) {
    const ids = edOrdered().map(x => x.id);
    const i = ids.indexOf(w.id);
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const j = i + (e.key === 'ArrowUp' ? -1 : 1);
      if (j < 0 || j >= ids.length) return;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      reorder(ids); focusRow(w.id);
      return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const j = Math.max(0, Math.min(ids.length - 1, i + (e.key === 'ArrowUp' ? -1 : 1)));
      select(ids[j]); focusRow(ids[j]);
    } else if (e.key === 'Enter') { e.preventDefault(); const l = $('#tbe-label'); if (l) l.focus(); }
    else if (e.key === 'Delete') { e.preventDefault(); del(); }
  }
  function select(id) {
    if (ed.sel === id) return;
    ed.sel = id; ed.showAll = false; ed.q = '';
    renderPreview(); renderRows(); renderForm();
  }

  /* ----- add types ----- */
  function renderAdd() {
    const box = $('.add-types');
    box.innerHTML = '';
    for (const [type, t] of Object.entries(TB_TYPES)) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'add-type';
      b.innerHTML = icon(t.icon) + `<span>${esc(t.label)}</span>`;
      b.title = t.hint;
      b.onclick = () => {
        const w = _tbeNewWidget(type, ed.draft);
        ed.draft.push(w); ed.sel = w.id; touch();
        renderPreview(); renderRows(); renderForm();
        setTimeout(() => { const l = $('#tbe-label'); if (l) l.focus(); }, 0);
      };
      box.appendChild(b);
    }
  }

  /* ----- the form ----- */
  function seg(options, value, onPick, label) {
    const s = document.createElement('div'); s.className = 'seg seg-block'; s.setAttribute('role', 'radiogroup');
    if (label) s.setAttribute('aria-label', label);
    for (const [v, text] of options) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = text;
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', v === value ? 'true' : 'false');
      if (v === value) b.classList.add('on');
      b.onclick = () => onPick(v);
      s.appendChild(b);
    }
    return s;
  }
  function field(label, cls, control, hint) {
    const f = document.createElement('div'); f.className = 'field' + (cls ? ' ' + cls : '');
    const l = document.createElement('span'); l.className = 'field-label'; l.textContent = label; f.appendChild(l);
    if (control) f.appendChild(control);
    if (hint) { const h = document.createElement('span'); h.className = 'field-hint'; h.textContent = hint; f.appendChild(h); }
    return f;
  }
  function sw(on, title, sub, onFlip, extra) {
    const row = document.createElement('div'); row.className = 'toggle-row';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'switch'; b.setAttribute('role', 'switch');
    b.setAttribute('aria-checked', on ? 'true' : 'false'); b.setAttribute('aria-label', title);
    b.onclick = () => onFlip(!on);
    const txt = document.createElement('div');
    const t = document.createElement('div'); t.className = 'tr-t'; t.textContent = title;
    if (extra) t.appendChild(extra);
    txt.appendChild(t);
    if (sub) { const s = document.createElement('span'); s.className = 's'; s.textContent = sub; txt.appendChild(s); }
    row.append(b, txt);
    return row;
  }
  function changed(rerenderForm) { touch(); renderPreview(); renderRows(); if (rerenderForm) renderForm(); }

  function renderForm() {
    const form = $('.tbe-form');
    const keepFocus = document.activeElement && form.contains(document.activeElement) ? document.activeElement.dataset.fk : null;
    form.innerHTML = '';
    const w = cur();
    $('.tbe-del').disabled = !w;
    if (!w) {
      mountEmptyState(form, { icon: 'sliders-horizontal', title: 'No widget selected', text: 'Add a countdown, a live task count, your next event or a clock from the list on the left.', compact: true });
      return;
    }
    const T = TB_TYPES[w.type];
    // Label
    const lab = document.createElement('input'); lab.className = 'control'; lab.id = 'tbe-label'; lab.dataset.fk = 'label';
    lab.value = w.label; lab.maxLength = 80;
    lab.placeholder = w.type === 'countdown' ? 'e.g. Product launch' : w.type === 'tasks' ? TB_TASK_FILTERS[w.tasks] + ' (automatic)' : w.type === 'clock' ? 'Optional' : w.type === 'event' ? 'Optional (shows the event title)' : 'e.g. Project';
    lab.oninput = () => { w.label = lab.value; changed(false); };
    form.appendChild(field('Label', 'full', lab));

    if (T.dated) {
      form.appendChild(field('Type', '', seg([['countdown', 'Countdown'], ['countup', 'Count up'], ['progress', 'Progress']], w.type, (v) => {
        w.type = v;
        if (v === 'progress') { w.showBar = true; if (!w.start) { w.start = todayStr(); } }
        changed(true);
      }, 'Type')));
      const unitOpts = [['days', 'Days'], ['weeks', 'Weeks'], ['workdays', 'Work days'], ['date', 'Date']];
      const u = seg(unitOpts, w.unit, (v) => { w.unit = v; changed(true); }, 'Show as');
      if (w.type === 'progress') u.querySelectorAll('button').forEach(b => { b.disabled = true; });
      form.appendChild(field('Show as', '', u, w.type === 'progress' ? 'Progress shows a percentage.' : null));
      // Target date + time
      const tLabel = w.type === 'countup' ? 'Counting from' : w.type === 'progress' ? 'End' : 'Target';
      const di = uiDateField({
        value: w.date, label: tLabel, fk: 'date',
        onChange: (v) => { w.date = _TB_ISO.test(v) ? v : ''; delete ed.errors[w.id]; changed(true); },
        time: w.time, onTime: (v) => { w.time = v; changed(false); },
      });
      const fT = field(tLabel, '', di);
      if (ed.errors[w.id] && ed.errors[w.id].field === 'date') { const e = document.createElement('span'); e.className = 'field-error'; e.textContent = ed.errors[w.id].msg; fT.appendChild(e); di.classList.add('is-invalid'); }
      form.appendChild(fT);
      const si = uiDateField({
        value: w.start, label: 'Start', fk: 'start', clearable: w.type !== 'progress', placeholder: w.type === 'progress' ? 'Pick a start date' : 'Optional',
        onChange: (v) => { w.start = _TB_ISO.test(v) ? v : ''; if (w.type !== 'countup') w.showBar = !!w.start || w.type === 'progress'; delete ed.errors[w.id]; changed(true); },
      });
      const fS = field(w.type === 'progress' ? 'Start' : 'Start (for the progress bar)', '', si);
      if (ed.errors[w.id] && ed.errors[w.id].field === 'start') { const e = document.createElement('span'); e.className = 'field-error'; e.textContent = ed.errors[w.id].msg; fS.appendChild(e); si.classList.add('is-invalid'); }
      if (w.type !== 'countup') form.appendChild(fS);
    } else if (w.type === 'tasks') {
      form.appendChild(field('Count', 'full', seg(Object.entries(TB_TASK_FILTERS), w.tasks, (v) => { w.tasks = v; changed(true); }, 'Which tasks'), 'Updates live. Clicking it opens that list.'));
    } else if (w.type === 'clock') {
      form.appendChild(field('Show', 'full', seg(Object.entries(TB_CLOCK_FORMATS), w.clock, (v) => { w.clock = v; changed(true); }, 'Clock format'), 'Uses your locale from Settings.'));
    } else {
      const cal = calendarSoon(() => { if (!closed) renderPreview(); });
      const hint = document.createElement('div'); hint.className = 'callout' + (cal.ok || cal.loading ? '' : ' warn');
      hint.innerHTML = icon(cal.ok || cal.loading ? 'calendar-clock' : 'plug') + `<div>${esc(cal.ok || cal.loading ? 'Shows your next event in the coming 7 days. Clicking it opens the calendar.' : 'No calendar is connected yet, so this widget stays greyed out until you connect one in Connections.')}</div>`;
      form.appendChild(field('Source', 'full', hint));
    }

    // Symbol: the first two rows, then a quiet search line under the grid
    // ("Search all N symbols…"). Focusing it shows every symbol; typing
    // filters; pasting an emoji offers that emoji.
    const sym = document.createElement('div'); sym.className = 'tbe-sym';
    const sbox = document.createElement('label'); sbox.className = 'tbe-sym-q';
    sbox.innerHTML = icon('search', 'i-xs');
    const sq = document.createElement('input'); sq.type = 'search'; sq.placeholder = `Search all ${TB_SYMBOLS.length} symbols…`; sq.value = ed.q; sq.dataset.fk = 'symq';
    sq.setAttribute('aria-label', `Search ${TB_SYMBOLS.length} symbols, or paste an emoji`); sbox.title = `Search ${TB_SYMBOLS.length} symbols, or paste an emoji`;
    sbox.appendChild(sq);
    const grid = document.createElement('div'); grid.className = 'icon-grid ' + tbColorAttrs(w.color).cls; grid.setAttribute('role', 'listbox'); grid.setAttribute('aria-label', 'Symbols');
    const gs = tbColorAttrs(w.color).style; if (gs) grid.setAttribute('style', gs);
    const more = document.createElement('button'); more.type = 'button'; more.className = 'btn-link tbe-sym-more';
    const paintGrid = () => {
      grid.innerHTML = '';
      const q = ed.q.trim().toLowerCase();
      let list = TB_SYMBOLS;
      if (q) list = TB_SYMBOLS.filter(([n, k]) => n.includes(q) || k.includes(q));
      const emoji = q && /[^\x00-\x7f]/.test(ed.q.trim()) && Array.from(ed.q.trim()).length <= 2 ? ed.q.trim() : '';
      if (emoji) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'tbe-emoji' + (w.icon === emoji ? ' on' : '');
        b.textContent = emoji; b.title = 'Use this emoji'; b.setAttribute('role', 'option');
        b.onclick = () => { w.icon = emoji; changed(false); paintGrid(); };
        grid.appendChild(b);
      }
      const shown = q || ed.showAll ? list : list.slice(0, _TBE_FIRST);
      // Keep the current symbol visible even when it is not in the first rows.
      if (!q && !ed.showAll && !shown.some(([n]) => n === w.icon) && TB_SYMBOLS.some(([n]) => n === w.icon)) shown.splice(_TBE_FIRST - 1, 1, TB_SYMBOLS.find(([n]) => n === w.icon));
      for (const [n] of shown) {
        const b = document.createElement('button'); b.type = 'button';
        b.className = n === w.icon ? 'on' : '';
        b.innerHTML = icon(n); b.title = n.replace(/-/g, ' ');
        b.setAttribute('role', 'option'); b.setAttribute('aria-selected', n === w.icon ? 'true' : 'false'); b.setAttribute('aria-label', n.replace(/-/g, ' '));
        b.onclick = () => { w.icon = n; changed(false); paintGrid(); };
        grid.appendChild(b);
      }
      if (!shown.length && !emoji) { const e = document.createElement('div'); e.className = 'tbe-sym-none'; e.textContent = 'No symbol matches. Try another word, or paste an emoji.'; grid.appendChild(e); }
      more.hidden = !!q || !ed.showAll;
      more.textContent = 'Show fewer';
    };
    sq.oninput = () => { ed.q = sq.value; paintGrid(); };
    sq.onfocus = () => { if (!ed.showAll) { ed.showAll = true; paintGrid(); } };
    sq.onkeydown = (e) => { if (e.key === 'Escape' && sq.value) { e.preventDefault(); e.stopPropagation(); sq.value = ''; ed.q = ''; paintGrid(); } };
    more.onclick = () => { ed.showAll = false; ed.q = ''; sq.value = ''; paintGrid(); };
    paintGrid();
    const foot = document.createElement('div'); foot.className = 'tbe-sym-foot';
    foot.append(sbox, more);
    sym.append(grid, foot);
    form.appendChild(field('Symbol', 'full', sym));

    // Colour + style
    const sws = document.createElement('div'); sws.className = 'swatches'; sws.setAttribute('role', 'radiogroup'); sws.setAttribute('aria-label', 'Colour');
    for (const c of _CD_SWATCHES) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'swatch c-' + c + (w.color === c ? ' on' : '');
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', w.color === c ? 'true' : 'false'); b.setAttribute('aria-label', c); b.title = c;
      b.onclick = () => { w.color = c; changed(true); };
      sws.appendChild(b);
    }
    form.appendChild(field('Colour', '', sws));
    form.appendChild(field('Style', '', seg([['subtle', 'Subtle'], ['tinted', 'Tinted'], ['solid', 'Solid']], w.style, (v) => { w.style = v; changed(true); }, 'Style')));

    // Behaviour
    const tg = document.createElement('div'); tg.className = 'toggles full';
    tg.appendChild(sw(w.headline, 'Headline', 'Shown first, tinted. One per bar.', (on) => {
      if (on) { for (const x of ed.draft) if (x !== w && x.headline) { x.headline = false; if (x.style === 'tinted') x.style = 'subtle'; } if (w.style === 'subtle') w.style = 'tinted'; }
      w.headline = on;
      changed(true);
    }));
    if (T.dated && w.type !== 'countup') {
      tg.appendChild(sw(w.showBar, 'Progress bar', w.start ? 'Time elapsed since the start.' : 'Needs a start date.', (on) => { w.showBar = on; if (on && !w.start) w.start = todayStr(); changed(true); }));
    } else if (w.type === 'tasks' && w.tasks === 'today') {
      tg.appendChild(sw(w.showBar, 'Progress bar', "Share of today's tasks done.", (on) => { w.showBar = on; changed(true); }));
    }
    if (T.dated && w.type !== 'countup') {
      const n = document.createElement('input'); n.type = 'number'; n.min = '1'; n.max = '365'; n.className = 'control control-sm tbe-num'; n.dataset.fk = 'warn';
      n.value = String(w.warnDays || 14); n.setAttribute('aria-label', 'Warn under this many days');
      n.title = 'Click to change the number of days';
      // Reads as bold text ("Warn under 14 days") and grows with the number.
      const fit = () => { n.style.width = `${Math.max(1, String(n.value).length) + 0.2}ch`; };
      n.oninput = fit; fit();
      n.onclick = (e) => e.stopPropagation();
      n.onchange = () => { const v = Math.max(1, Math.min(365, Math.round(Number(n.value) || 14))); n.value = String(v); fit(); if (w.warnDays) { w.warnDays = v; changed(false); } else { n.dataset.pending = String(v); } };
      const lbl = document.createElement('b'); lbl.className = 'tbe-warn-l';
      lbl.append(n, document.createTextNode('days'));
      tg.appendChild(sw(!!w.warnDays, 'Warn under', 'Number turns red.', (on) => { w.warnDays = on ? Math.max(1, Number(n.value) || 14) : 0; changed(true); }, lbl));
      const hide = sw(w.hideWhenPast, 'Hide once passed', '', (on) => { w.hideWhenPast = on; changed(true); });
      hide.title = 'Disappears from the bar after the date.';
      tg.appendChild(hide);
    }
    form.appendChild(tg);
    if (keepFocus) { const f = form.querySelector(`[data-fk="${keepFocus}"]`); if (f) f.focus(); }
  }

  /* ----- delete, validate, save, close ----- */
  function del() {
    const w = cur(); if (!w) return;
    const ids = edOrdered().map(x => x.id);
    const i = ids.indexOf(w.id);
    ed.draft = ed.draft.filter(x => x.id !== w.id);
    if (w.headline && ed.draft.length) { const real = ed.draft[0]; real.headline = true; if (real.style === 'subtle') real.style = 'tinted'; }
    const rest = ids.filter(x => x !== w.id);
    ed.sel = rest[Math.min(i, rest.length - 1)] || null;
    delete ed.errors[w.id];
    touch(); renderPreview(); renderRows(); renderForm();
    toast(`Removed "${_tbeTitle(w)}". Cancel keeps it.`, { icon: 'trash-2' });
  }
  function validate() {
    ed.errors = {};
    for (const w of ed.draft) {
      if (!TB_TYPES[w.type].dated) continue;
      if (!w.date) ed.errors[w.id] = { field: 'date', msg: 'Pick a date.' };
      else if (w.type === 'progress' && (!w.start || w.start >= w.date)) ed.errors[w.id] = { field: 'start', msg: 'The start must be before the end.' };
    }
    const bad = Object.keys(ed.errors);
    if (bad.length) { ed.sel = bad[0]; renderPreview(); renderRows(); renderForm(); return false; }
    return true;
  }
  function save() {
    if (!validate()) return;
    close(true);
    if (!ed.dirty) return;
    tbSave(ed.draft, 'Top bar saved');
  }
  async function cancel() {
    if (ed.dirty) {
      const ok = await confirmDialog({ title: 'Discard your changes?', text: 'The top bar stays as it was.', confirmLabel: 'Discard', danger: true });
      if (!ok) return;
    }
    close(true);
  }
  function onKey(e) {
    if (closed) return;
    // A confirm dialog on top handles its own keys.
    if ([...document.querySelectorAll('.modal')].some(m => m !== dlg)) return;
    if (e.key === 'Escape') {
      if (document.querySelector('.pop:not([hidden])')) return;
      // Escape in a filled symbol search clears the search first.
      if (e.target && e.target.dataset && e.target.dataset.fk === 'symq' && e.target.value) return;
      e.preventDefault(); e.stopPropagation(); cancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.stopPropagation(); save(); }
    else if (e.key === 'Tab') {
      // Keep focus inside the dialog.
      const f = [...dlg.querySelectorAll('button:not(:disabled), input, [tabindex="0"]')].filter(n => n.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  }
  function close(force) {
    if (closed) return;
    closed = true; _tbeOpen = null;
    document.removeEventListener('keydown', onKey, true);
    if (sortStrip) sortStrip.destroy();
    if (sortRows) sortRows.destroy();
    scrim.remove(); dlg.remove();
    if (prevFocus && prevFocus.isConnected && prevFocus.focus) try { prevFocus.focus({ preventScroll: true }); } catch (e) {}
  }

  dlg.querySelector('[data-act="close"]').onclick = cancel;
  dlg.querySelector('[data-act="cancel"]').onclick = cancel;
  dlg.querySelector('[data-act="save"]').onclick = save;
  dlg.querySelector('[data-act="delete"]').onclick = del;
  scrim.onclick = cancel;
  document.body.append(scrim, dlg);
  if (typeof makeResizable === 'function') makeResizable(dlg, { key: 'dialog:topbar-editor', center: 'x', min: { w: 560, h: 360 }, max: () => ({ h: window.innerHeight - 80 }) });   // 13-splitter.js
  document.addEventListener('keydown', onKey, true);
  _tbeOpen = { close };
  renderAdd(); renderRows(); renderForm(); renderPreview();
  setTimeout(() => {
    const target = ed.focusLabel ? $('#tbe-label') : dlg.querySelector('.wrow.on') || $('#tbe-label');
    if (target) try { target.focus({ preventScroll: true }); } catch (e) {}
  }, 0);
  return _tbeOpen;
}
