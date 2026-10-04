  // @part 42-toast.js · OWNER: C3 (toast)
  // ── Toast ─────────────────────────────────────────────────────────────
  // The app's toasts (11-ui-kit.js) when present, so Finances looks and
  // stacks like every other view; a local fallback otherwise.
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

