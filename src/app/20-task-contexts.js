/* ============================================================
   CONTEXTS AND ENERGY (owner: lists). Where a task can be done (@computer,
   @phone, @errands, @home, @office, or your own) and how much energy it
   takes (low / high). A task with no context can be done anywhere.
     TASK_CONTEXT_DEFAULTS                 the built-in contexts
     TASK_ENERGY                           {low, high}: label + icon
     ctxList()                             the contexts (state.taskContexts, else the defaults)
     ctxById(id) / ctxMatch(word)          a context by id, label or alias ('call' -> phone)
     ctxEnergyMatch(word)                  'low' | 'high' | null for low, lowenergy, low-energy, @high ...
     effContexts(item) / effEnergy(item)   a task's context ids / 'low' | 'high' | null
     setTaskContexts(id, ids, o)           with an activity entry and a save (o.noSave: neither save nor render)
     setTaskEnergy(id, level, o)
     ctxSaveList(list)                     the edited context list (data: synced, one undo step)
   Tasks keep them as item.contexts (array of ids) and item.energy; both sync
   like every other task field (lib/sync/manifest.mjs '── lists ──').
   ============================================================ */
const TASK_CONTEXT_DEFAULTS = Object.freeze([
  Object.freeze({ id: 'computer', label: 'Computer', icon: 'laptop', aliases: Object.freeze(['pc', 'laptop', 'desk', 'online']) }),
  Object.freeze({ id: 'phone', label: 'Phone', icon: 'phone', aliases: Object.freeze(['call', 'calls', 'mobile']) }),
  Object.freeze({ id: 'errands', label: 'Errands', icon: 'shopping-cart', aliases: Object.freeze(['errand', 'out', 'shops', 'shopping', 'town']) }),
  Object.freeze({ id: 'home', label: 'Home', icon: 'house', aliases: Object.freeze(['house']) }),
  Object.freeze({ id: 'office', label: 'Office', icon: 'building-2', aliases: Object.freeze([]) }),
]);
const TASK_ENERGY = Object.freeze({
  low: Object.freeze({ id: 'low', label: 'Low energy', short: 'Low', icon: 'leaf' }),
  high: Object.freeze({ id: 'high', label: 'High energy', short: 'High', icon: 'flame' }),
});
const CTX_ICONS = ['laptop', 'phone', 'shopping-cart', 'house', 'building-2', 'car', 'map-pin', 'mail', 'book-open', 'headphones', 'dumbbell', 'bike', 'coffee', 'briefcase', 'compass', 'keyboard'];

let _ctxMemoKey = null, _ctxMemo = null;
function ctxList() {
  const raw = typeof state !== 'undefined' && Array.isArray(state.taskContexts) ? state.taskContexts : null;
  if (raw === _ctxMemoKey && _ctxMemo) return _ctxMemo;
  const src = raw && raw.length ? raw : TASK_CONTEXT_DEFAULTS;
  const seen = new Set(), out = [];
  for (const c of src) {
    if (!c || typeof c !== 'object') continue;
    const id = ctxSlug(c.id || c.label);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const dflt = TASK_CONTEXT_DEFAULTS.find(d => d.id === id);
    out.push({ id, label: String(c.label || (dflt && dflt.label) || id).slice(0, 40), icon: _isIconName(c.icon) ? c.icon : (dflt ? dflt.icon : 'map-pin'),
      aliases: (Array.isArray(c.aliases) ? c.aliases : dflt ? dflt.aliases : []).map(a => String(a).toLowerCase()).filter(Boolean) });
  }
  _ctxMemoKey = raw; _ctxMemo = out;
  return out;
}
/** 'Train ride' -> 'train-ride' */
function ctxSlug(s) { return String(s || '').toLowerCase().trim().replace(/^@+/, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 30); }
function ctxById(id) { return ctxList().find(c => c.id === id) || null; }
function ctxMatch(word) {
  const w = String(word || '').toLowerCase().replace(/^@+/, '').replace(/[.,;:!?]+$/, '');
  if (!w) return null;
  const slug = ctxSlug(w);
  return ctxList().find(c => c.id === w || c.id === slug || c.label.toLowerCase() === w || c.aliases.includes(w)) || null;
}
function ctxEnergyMatch(word) {
  const w = String(word || '').toLowerCase().replace(/^@+/, '').replace(/[.,;:!?]+$/, '');
  let m;
  if ((m = /^(low|high)(?:[-_]?energy)?$/.exec(w)) && (w.length > 4 || w === 'low' || w === 'high')) return m[1];
  if ((m = /^energy[:=_-]?(low|high)$/.exec(w))) return m[1];
  if (w === 'tired' || w === 'easy' || w === 'brainless') return 'low';
  if (w === 'focus' || w === 'deep' || w === 'deepwork' || w === 'deep-work') return 'high';
  return null;
}
function effContexts(item) {
  if (!item || !Array.isArray(item.contexts)) return [];
  return item.contexts.filter(c => typeof c === 'string' && c);
}
function effEnergy(item) { return item && (item.energy === 'low' || item.energy === 'high') ? item.energy : null; }
function ctxLabel(id) { const c = ctxById(id); return c ? c.label : String(id || ''); }
function ctxIcon(id) { const c = ctxById(id); return c ? c.icon : 'map-pin'; }
function energyLabel(level) { return TASK_ENERGY[level] ? TASK_ENERGY[level].label : ''; }

function setTaskContexts(id, ids, o) {
  o = o || {};
  const item = getItem(id); if (!item) return false;
  const before = effContexts(item);
  const next = [...new Set((ids || []).map(ctxSlug).filter(Boolean))].slice(0, 12);
  if (before.join('|') === next.join('|')) return false;
  if (next.length) item.contexts = next; else delete item.contexts;
  logActivity(id, 'contexts', { added: next.filter(x => !before.includes(x)), removed: before.filter(x => !next.includes(x)) });
  if (!o.noSave) { saveData(); render(); }
  return true;
}
function setTaskEnergy(id, level, o) {
  o = o || {};
  const item = getItem(id); if (!item) return false;
  const from = effEnergy(item), to = level === 'low' || level === 'high' ? level : null;
  if (from === to) return false;
  if (to) item.energy = to; else delete item.energy;
  logActivity(id, 'energy', { from, to });
  if (!o.noSave) { saveData(); render(); }
  return true;
}
/** Save an edited context list (ids kept; tasks keep their ids, so a rename shows everywhere). */
function ctxSaveList(list) {
  state.taskContexts = (list || []).map(c => ({ id: ctxSlug(c.id || c.label), label: String(c.label || c.id).trim().slice(0, 40), icon: _isIconName(c.icon) ? c.icon : 'map-pin', ...(Array.isArray(c.aliases) && c.aliases.length ? { aliases: c.aliases.slice(0, 12) } : {}) }))
    .filter(c => c.id && c.label);
  saveData(); render();
}
/** Add a context by name (from a picker or @word); returns its id. */
function ctxAdd(label) {
  const id = ctxSlug(label);
  if (!id) return null;
  if (ctxById(id)) return id;
  const list = ctxList().map(c => ({ id: c.id, label: c.label, icon: c.icon, aliases: c.aliases }));
  list.push({ id, label: String(label).trim().replace(/^@+/, '').replace(/^\p{Ll}/u, ch => ch.toUpperCase()).slice(0, 40), icon: 'map-pin' });
  state.taskContexts = list;
  return id;
}
