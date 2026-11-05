/* Optional activity subjects for the native follow camera. Camera framing is
 * local presentation; providers never change game positions or saved zoom. */
window.GardenActivityCamera = (function () {
  'use strict';
  const providers = new Map();
  let ordered = [];
  function define(name, read, priority) {
    if (typeof name !== 'string' || !name || typeof read !== 'function') return;
    providers.set(name, { name, read, priority: Number(priority) || 0, warned: false });
    ordered = [...providers.values()].sort((a, b) => b.priority - a.priority);
  }
  function current() {
    for (const provider of ordered) {
      let subject;
      try { subject = provider.read(); }
      catch (error) { if (!provider.warned) { provider.warned = true; console.warn('[garden camera]', provider.name, error); } continue; }
      const b = subject && subject.bounds;
      if (!b || ![b.x, b.y, b.width, b.height].every(Number.isFinite) || b.width <= 0 || b.height <= 0) continue;
      return { id: provider.name + ':' + String(subject.id || ''), bounds: b, ...(Number.isFinite(subject.insetBottom) ? { insetBottom: Math.max(0, Math.min(400, subject.insetBottom)) } : {}) };
    }
    return null;
  }
  function panelInset(panel, viewport) {
    if (!panel || !viewport || !panel.isConnected || !viewport.isConnected) return 104;
    const p = panel.getBoundingClientRect(), v = viewport.getBoundingClientRect();
    return Math.max(104, Math.min(400, v.bottom - p.top + 12));
  }
  function frame(subject, player, size, baseHeight, zoom) {
    const b = subject.bounds, ar = size.w / Math.max(1, size.h);
    const left = Math.min(b.x, player.x - 26), right = Math.max(b.x + b.width, player.x + 26);
    const top = Math.min(b.y, player.y - 86), bottom = Math.max(b.y + b.height, player.y + 12);
    const padX = Math.min(.12, 56 / Math.max(1, size.w)), padTop = Math.min(.24, 112 / Math.max(1, size.h)), padBottom = subject.insetBottom == null ? Math.min(.22, 104 / Math.max(1, size.h)) : Math.min(.55, subject.insetBottom / Math.max(1, size.h));
    const h = Math.max(baseHeight, (bottom - top) / (1 - padTop - padBottom), (right - left) / (ar * (1 - padX * 2))) * zoom, w = h * ar;
    return { x: (left + right - w) / 2, y: (top + bottom) / 2 - h * (1 + padTop - padBottom) / 2, w, h };
  }
  return Object.freeze({ define, current, frame, panelInset });
})();
