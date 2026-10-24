/* ============================================================
   NETWORK ERRORS (owner: Shell/Design): one clear message when the
   dashboard server is not running, for every fetch in the page.
   A request this page sends to its own server that cannot connect
   rejects with a bare TypeError ("Failed to fetch"), which says nothing
   useful. The wrapper at the end turns that into a TypeError whose message
   is NET_DOWN_MESSAGE (code 'SERVER_DOWN'), so every existing
   `toast(e.message)` and inline error says what to do. Callers keep what
   the user had (ticks, proposals, text) so Try again works.

     NET_DOWN_REASON                "OpenDash isn’t running" (the reason alone)
     NET_DOWN_MESSAGE               the reason and the next step, as sentences
     netIsDown(e)                   "could not reach the server" (not an HTTP error, not an abort)
     netErrorMessage(e, fallback)   the text to show for any error: whole sentences,
                                    its first one a reason that also reads after a colon
     netErrorReason(e, fallback)    the same as a reason that fits "Couldn’t X: <reason>."
                                    (no final full stop, a plain first word in lower case);
                                    toastError() (11-ui-kit.js) builds the toast from it
   Bare status errors ("HTTP 500", "GET 404", what the fetch helpers throw) become
   plain words: OpenDash isn’t answering / didn’t answer in time / is busy...
   Page only:
     window.DashboardNet = {message, isDown, messageFor, down, onChange(fn) -> off}
       `down` turns true when a request to this server fails to connect and
       false at the next one that gets any answer. onChange(fn(down)) and the
       window events 'dashboard:server-down' / 'dashboard:server-up' are for
       an offline banner (built by the server-control work in 86-live-sync).
   The helpers above the wrapper are pure (no DOM).
   ============================================================ */
const NET_DOWN_REASON = 'OpenDash isn’t running';
const NET_DOWN_MESSAGE = NET_DOWN_REASON + '. Start it with start-opendash in the app folder (or your OpenDash shortcut), then try again.';
// Chrome/Edge: "Failed to fetch"; Firefox: "NetworkError when attempting to fetch resource."; Safari: "Load failed".
const _NET_DOWN_RE = /failed to fetch|networkerror|network error|load failed|network request failed|err_connection|econnrefused/i;
// What the page's fetch helpers throw for a bad status with no message of its own: 'HTTP 500', 'GET 404', 'health 503'.
const _NET_STATUS_RE = /^(?:HTTP|GET|POST|PUT|PATCH|DELETE|health)\s*(\d{3})$/i;
/** Plain words for a bare status (null: no plain words for it; the caller's fallback is used). */
function _netStatusWords(code) {
  if (code === 408 || code === 504) return 'OpenDash didn’t answer in time. Try again.';
  if (code === 429) return 'OpenDash is busy. Try again in a moment.';
  if (code >= 500) return 'OpenDash isn’t answering. Try again in a moment.';
  if (code === 404) return 'That isn’t available. If OpenDash was just updated, restart it.';
  if (code === 409) return 'Something else changed it first. Try again.';
  if (code === 413) return 'It’s too big to save.';
  if (code === 401 || code === 403) return 'OpenDash didn’t accept it from this tab. Reload the page and try again.';
  return null;
}

/** True when `e` means the server could not be reached at all. */
function netIsDown(e) {
  if (!e || typeof e !== 'object') return false;
  if (e.code === 'SERVER_DOWN') return true;
  if (e.name === 'AbortError') return false;
  return e.name === 'TypeError' && _NET_DOWN_RE.test(String(e.message || ''));
}
/**
 * The text to show for an error: the server-not-running message, plain words for a bare
 * status or a timeout, else its own message, else `fallback`. Whole sentences; the first
 * one is the reason, so 'Couldn’t save: ' + netErrorMessage(e) reads right too.
 */
function netErrorMessage(e, fallback) {
  if (netIsDown(e)) return NET_DOWN_MESSAGE;
  if (e && typeof e === 'object' && e.name === 'TimeoutError') return 'OpenDash didn’t answer in time. Try again.';
  const m = String((typeof e === 'string' ? e : (e && e.message)) || '').trim();
  if (e && typeof e === 'object' && e.name === 'AbortError' && (!m || /\babort/i.test(m))) return 'It was stopped.';
  const st = _NET_STATUS_RE.exec(m);
  if (st) return _netStatusWords(Number(st[1])) || fallback || `Something went wrong (error ${st[1]}). Try again.`;
  return m || (fallback || 'Something went wrong. Try again.');
}
/**
 * The reason alone, to follow "Couldn’t X: ": no final full stop, and a plain first word
 * ("The", "That", "Try"...) in lower case. Names and acronyms keep their capitals.
 *   'Couldn’t save the note: ' + netErrorReason(e) + '.'
 */
function netErrorReason(e, fallback) {
  if (netIsDown(e)) return NET_DOWN_REASON;
  let s = String(netErrorMessage(e, fallback)).trim().replace(/\.+$/, '');
  s = s.replace(/^(The|That|This|These|Those|There|It|Its|It’s|It's|You|Your|A|An|No|Not|Nothing|Something|Some|Too|Please|Try|Check|Sign|Open|Start|Wait|Turn|Choose|Pick|Add|Ask)\b/, w => w.toLowerCase());
  return s || 'something went wrong';
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
  // Requests to this server carry the computer's time zone (X-Dashboard-Zone), so
  // the server's "today" is the page's (travel spec 2.2, P2; Clock: 07-core-clock.js).
  const withZone = (input, init) => {
    let zone = '';
    try { zone = (window.Clock && window.Clock.system()) || Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (err) { zone = ''; }
    if (!zone || typeof Headers !== 'function') return init;
    try {
      const h = new Headers((init && init.headers) || (typeof Request === 'function' && input instanceof Request ? input.headers : undefined));
      if (h.has('X-Dashboard-Zone')) return init;
      h.set('X-Dashboard-Zone', zone);
      return Object.assign({}, init || {}, { headers: h });
    } catch (err) { return init; }
  };
  const wrapped = function netFetch(input, init) {
    const mine = ours(input);
    if (mine) init = withZone(input, init);
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
