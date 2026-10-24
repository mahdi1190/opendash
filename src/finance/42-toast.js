  // @part 42-toast.js · OWNER: C3 (toast)
  // ── Toast ─────────────────────────────────────────────────────────────
  // The app's toasts (11-ui-kit.js) when present, so Finances looks and
  // stacks like every other view; a local fallback otherwise.
  // o: {bad, kind, icon, action: label, onAction}. bad -> the app's error kind; action -> {label, run}.
  function toast(msg, o) {
    o = o || {};
    if (typeof window.toast === 'function' && document.getElementById('toast-host')) {
      window.toast(msg, {
        kind: o.bad ? 'err' : o.kind || '', icon: o.icon,
        action: o.action ? { label: o.action, run: o.onAction } : null, timeout: o.action ? 7000 : 4200,
      });
      return;
    }
    ensureLayer(); if (!R.layer) return;
    if (R.toastEl) R.toastEl.remove();
    const el = h('div', { class: 'fv-toast' + (o.bad ? ' bad' : ''), role: 'status' }, h('span', { text: msg }),
      o.action ? h('button', { type: 'button', class: 'fv-link', text: o.action, onclick: () => { el.remove(); o.onAction(); } }) : null);
    R.layer.append(el); R.toastEl = el;
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(R.toastT);
    R.toastT = setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, o.action ? 7000 : 4200);
  }
  // "Couldn't <what>: <reason>." with Try again (11-ui-kit.js toastError); the local toast when the app's is not there.
  function toastErr(what, e, retry) {
    if (typeof window.toastError === 'function' && document.getElementById('toast-host')) return window.toastError(what, e, retry);
    const why = String((e && e.message) || e || 'something went wrong').replace(/[.\s]+$/, '');
    toast(`Couldn’t ${what}: ${why}.`, Object.assign({ bad: true }, typeof retry === 'function' ? { action: 'Try again', onAction: retry } : {}));
  }
