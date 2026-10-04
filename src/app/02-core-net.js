/* ============================================================
   NETWORK ERRORS (owner: Shell/Design): one clear message when the
   dashboard server is not running, for every fetch in the page.
   A request this page sends to its own server that cannot connect
   rejects with a bare TypeError ("Failed to fetch"), which says nothing
   useful. The wrapper at the end turns that into a TypeError whose message
   is NET_DOWN_MESSAGE (code 'SERVER_DOWN'), so every existing
   `toast(e.message)` and inline error says what to do. Callers keep what
   the user had (ticks, proposals, text) so Try again works.

     NET_DOWN_MESSAGE               the message
     netIsDown(e)                   "could not reach the server" (not an HTTP error, not an abort)
     netErrorMessage(e, fallback)   the text to show for any error
   Page only:
     window.DashboardNet = {message, isDown, messageFor, down, onChange(fn) -> off}
       `down` turns true when a request to this server fails to connect and
       false at the next one that gets any answer. onChange(fn(down)) and the
       window events 'dashboard:server-down' / 'dashboard:server-up' are for
       an offline banner (built by the server-control work in 86-live-sync).
   The helpers above the wrapper are pure: tests/net-errors.test.mjs runs them in Node.
   ============================================================ */
const NET_DOWN_MESSAGE = "The OpenDash server isn't running. Start it with start-opendash in the app folder (or your OpenDash shortcut), then try again.";
// Chrome/Edge: "Failed to fetch"; Firefox: "NetworkError when attempting to fetch resource."; Safari: "Load failed".
const _NET_DOWN_RE = /failed to fetch|networkerror|network error|load failed|network request failed|err_connection|econnrefused/i;

/** True when `e` means the server could not be reached at all. */
function netIsDown(e) {
  if (!e || typeof e !== 'object') return false;
  if (e.code === 'SERVER_DOWN') return true;
  if (e.name === 'AbortError') return false;
  return e.name === 'TypeError' && _NET_DOWN_RE.test(String(e.message || ''));
}
/** The text to show for an error: the server-not-running message, else its own message, else `fallback`. */
function netErrorMessage(e, fallback) {
  if (netIsDown(e)) return NET_DOWN_MESSAGE;
  const m = typeof e === 'string' ? e : (e && e.message);
  return m ? String(m) : (fallback || 'Something went wrong. Try again.');
}

(function _netWrapFetch() {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function' || window.fetch._netWrapped) return;
  // Opened as a file (no server at all): leave fetch alone.
  if (!/^https?:$/.test(location.protocol)) return;
  const orig = window.fetch;
  const subs = new Set();
  const net = {
    message: NET_DOWN_MESSAGE, isDown: netIsDown, messageFor: netErrorMessage, down: false,
    onChange(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
  const flip = (down) => {
    if (net.down === down) return;
    net.down = down;
    for (const fn of [...subs]) { try { fn(down); } catch (err) { console.error('[net]', err); } }
    try { window.dispatchEvent(new CustomEvent(down ? 'dashboard:server-down' : 'dashboard:server-up')); } catch (err) { /* no CustomEvent */ }
  };
  const ours = (input) => {
    try { return new URL(typeof input === 'string' ? input : (input && input.url) || String(input), location.href).origin === location.origin; } catch (err) { return false; }
  };
  const wrapped = function netFetch(input, init) {
    const mine = ours(input);
    return orig.call(window, input, init).then((r) => { if (mine) flip(false); return r; }, (e) => {
      if (!mine || !netIsDown(e)) throw e;
      flip(true);
      const err = new TypeError(NET_DOWN_MESSAGE);
      err.code = 'SERVER_DOWN'; err.cause = e;
      throw err;
    });
  };
  wrapped._netWrapped = true;
  window.fetch = wrapped;
  window.DashboardNet = net;
})();
