/* Optional set pieces belong to a chosen activity, rather than filling every
 * garden at once. Only the owner chooses what is out; visitors follow wd.aw. */
const GARDEN_WORLD_ACTIVITIES = Object.freeze([
  Object.freeze({ id: 'wind-kite', n: 1, level: 2, name: 'The wind kite' }),
  Object.freeze({ id: 'leaf-boats', n: 2, level: 3, name: 'Leaf-boat yard' }),
  Object.freeze({ id: 'soap-film', n: 3, level: 4, name: 'Giant soap films' }),
  Object.freeze({ id: 'listening-walk', n: 4, level: 5, name: 'The listening walk' }),
  Object.freeze({ id: 'shadow-courtyard', n: 5, level: 7, name: 'Borrowed shadows' }),
  Object.freeze({ id: 'marble-workshop', n: 6, level: 8, name: 'The marble workshop' }),
]);
const GARDEN_ACTIVITY_FX = Object.freeze({ kite: 'wind-kite', soap: 'soap-film', leaf: 'leaf-boats', marble: 'marble-workshop' });
function gardenActivityRow(id) { return GARDEN_WORLD_ACTIVITIES.find(r => r.id === id) || null; }
function gardenActivityUnlocked(id, model) {
  const row = gardenActivityRow(id); if (!row) return true;
  const m = model || gardenHere(), w = m.visit ? _wdTheir(m) : _wdG();
  // Existing discoveries remain accessible even if the level was later undone.
  if (id === 'listening-walk' && (m.visit ? Number(w.el) > 0 : gardenListeningWalkMask(w) > 0)) return true;
  if (id === 'shadow-courtyard' && (m.visit ? Array.isArray(w.sc) : !!gardenShadowCourtyardWire(w))) return true;
  return Number(m.level && m.level.level) >= row.level;
}
function gardenActivitySelection(model) {
  const m = model || gardenHere(), n = m.visit ? _wdTheir(m).aw : _wdG()['world.activity'];
  const row = GARDEN_WORLD_ACTIVITIES.find(r => r.n === n);
  return row && gardenActivityUnlocked(row.id, m) ? row.id : '';
}
function gardenActivityActive(id, model) { return !gardenActivityRow(id) || gardenActivitySelection(model) === id; }
function gardenActivityRetire(id, model) {
  const visit = !!(model || gardenHere()).visit;
  if (id === 'wind-kite') { if (visit) gardenKiteGuestClear(); else gardenKiteHostStop(); }
  else if (id === 'soap-film') { if (visit) gardenSoapGuestClear(); else gardenSoapHostStop(); }
  else if (id === 'leaf-boats') { if (visit) gardenLeafBoatGuestClear(); else gardenLeafBoatHostStop(); }
  else if (id === 'marble-workshop') { if (visit) gardenMarbleGuestClear(); else gardenMarbleHostStop(); }
}
function gardenActivityChoose(id) {
  const m = gardenHere(), row = gardenActivityRow(id);
  if (m.visit) return gardenActivitySelection(m) === id;
  if (id && !row) return false;
  if (row && !gardenActivityUnlocked(id, m)) {
    gardenMessage(row.name + ' opens at garden level ' + row.level + '.', { ms: 4500 }); return false;
  }
  if (gardenActivitySelection(m) === id) return true;
  _wdSet('world.activity', row ? row.n : 0);
  // Reconcile only the changed modules, preserving the rest of the living world.
  if (_wd.on) gardenWonderSync(m);
  if (typeof _glh !== 'undefined' && _glh.on && typeof _glhSnapAll === 'function') _glhSnapAll();
  return true;
}
function gardenActivityFxAllowed(family) {
  return !GARDEN_ACTIVITY_FX[family] || gardenActivityActive(GARDEN_ACTIVITY_FX[family]);
}
