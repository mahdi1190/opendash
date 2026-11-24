/* ============================================================
   SCENE EDITOR, the page's side (docs/dev/SCENE_ENGINE_V2.md 23). A DEVELOPER tool: the editor itself
   (src/dev/scene-editor.js and src/dev/scene-editor.css) is not in the page; it is loaded on first use from
   the dev routes in server/routes/scene-editor.mjs, which answer only when OPENDASH_SCENE_EDITOR=1 in a
   developer checkout. A normal install never shows the button and never loads the editor.

     sceneEditorAvailable()                         -> Promise<boolean>  (the status route answered 200; asked once per page)
     sceneEditorOpen(ref, { label, returnFocus })   -> loads the editor once, then opens it for a recipe ref ('<pack>/<id>')
   ============================================================ */
let _sceAvail = null, _sceLoad = null;
/** Is the editor's dev route on? Asked once per page (a 404 means off: a normal install never shows the button). */
function sceneEditorAvailable() {
  if (_sceAvail) return _sceAvail;
  if (typeof fetch !== 'function' || typeof location === 'undefined' || !/^https?:$/.test(location.protocol)) return (_sceAvail = Promise.resolve(false));
  _sceAvail = fetch('/api/scene-editor/status', { headers: { accept: 'application/json' } })
    .then(r => (r.ok ? r.json() : null)).then(j => !!(j && j.enabled)).catch(() => false);
  return _sceAvail;
}
function _sceLoadEditor() {
  if (typeof sceneEditorOpenLoaded === 'function') return Promise.resolve();
  if (_sceLoad) return _sceLoad;
  _sceLoad = new Promise((ok, no) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/api/scene-editor/editor.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = '/api/scene-editor/editor.js';
    s.onload = () => ok(); s.onerror = () => { _sceLoad = null; s.remove(); no(new Error('The scene editor could not load.')); };
    document.head.appendChild(s);
  });
  return _sceLoad;
}
/** Open the editor for a recipe ref ('<pack>/<id>'), loading it on first use. */
async function sceneEditorOpen(ref, o) {
  if (typeof document === 'undefined') return null;
  try { await _sceLoadEditor(); } catch (e) { if (typeof toast === 'function') toast(e.message, { kind: 'error' }); return null; }
  return typeof sceneEditorOpenLoaded === 'function' ? sceneEditorOpenLoaded(ref, o) : null;
}
