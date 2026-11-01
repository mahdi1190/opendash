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
     netPlainWords(raw)             plain words for a raw message (a system code, a stack, a status), or null if it reads fine
     netPlainError(raw)             the raw message with those words swapped in; every red toast goes through it
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
const NET_DOWN_REASON = 'Freeflo isn’t running';
const NET_DOWN_MESSAGE = NET_DOWN_REASON + '. Open it from your Freeflo shortcut, then try again.';
// Chrome/Edge: "Failed to fetch"; Firefox: "NetworkError when attempting to fetch resource."; Safari: "Load failed".
const _NET_DOWN_RE = /failed to fetch|networkerror|network error|load failed|network request failed|err_connection|econnrefused/i;
// What the page's fetch helpers throw for a bad status with no message of its own: 'HTTP 500', 'GET 404', 'health 503'.
const _NET_STATUS_RE = /^(?:HTTP|GET|POST|PUT|PATCH|DELETE|health)\s*(\d{3})$/i;
/** Plain words for a bare status (null: no plain words for it; the caller's fallback is used). */
function _netStatusWords(code) {
  if (code === 408 || code === 504) return 'Freeflo didn’t answer in time. Try again.';
  if (code === 429) return 'Freeflo is busy. Try again in a moment.';
  if (code >= 500) return 'Freeflo isn’t answering. Try again in a moment.';
  if (code === 404) return 'That isn’t available. If Freeflo was just updated, restart it.';
  if (code === 409) return 'Something else changed it first. Try again.';
  if (code === 413) return 'It’s too big to save.';
  if (code === 401 || code === 403) return 'Freeflo didn’t accept it from this tab. Reload the page and try again.';
  return null;
}

/* Words a person can act on, for the raw text that can reach them: what a server, the operating
   system, a bank or the browser said. Whole sentences: what happened, then what to do next. */
const _NET_INSIDE = 'Something unexpected went wrong inside Freeflo. Try again; if it keeps happening, close Freeflo and open it again.';
const _NET_UNREADABLE = 'Freeflo couldn’t understand that request. Reload the page and try again.';
const _NET_SIGNIN = 'Your sign-in to that account has run out. Open Connections and sign in again.';
function _netOfflineNow() { return typeof navigator !== 'undefined' && navigator.onLine === false; }
function _netServiceWords() { return _netOfflineNow() ? 'You’re offline. Connect to the internet, then try again.' : 'A service Freeflo needs didn’t answer. Check your internet connection, then try again.'; }
/** Plain words for a raw message, or null when it already reads fine. Pure apart from navigator.onLine. */
function netPlainWords(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return null;
  // 'PUT 500', 'PUT 500 — detail', 'AI request failed: 502', 'HTTP 500: detail'
  const st = /^(?:(?:HTTP|GET|POST|PUT|PATCH|DELETE|health)\s*|AI request failed:\s*)(\d{3})(?:\s*(?:[—:-]\s*)?(.*))?$/is.exec(s);
  if (st) return (st[2] && st[2].trim() ? netPlainWords(st[2]) || st[2].trim() : null) || _netStatusWords(Number(st[1])) || 'Something went wrong. Try again.';
  const pre = /^(?:Uncaught\s+)?(?:Error|Exception):\s*(.+)$/is.exec(s);
  if (pre) return netPlainWords(pre[1]) || pre[1].trim();
  if (/\bENOSPC\b|no space left/i.test(s)) return 'This computer’s disk is full. Free up some space, then try again.';
  if (/\b(?:EACCES|EPERM|EBUSY|EROFS)\b|permission denied|operation not permitted|resource busy|used by another process/i.test(s)) return 'This computer wouldn’t let Freeflo use that file. Close any other program using it, then try again.';
  if (/\bENOENT\b|no such file/i.test(s)) return 'Freeflo couldn’t find a file it needed. If you moved or renamed it, put it back and try again.';
  if (/\b(?:ENOTFOUND|EAI_AGAIN|ECONNRESET|ECONNREFUSED|ECONNABORTED|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH|EPIPE|UND_ERR_\w+|CERT_\w+)\b|getaddrinfo|socket hang up|\bfetch failed\b|failed to fetch|networkerror|load failed|network request failed/i.test(s)) return _netServiceWords();
  if (/invalid_grant|invalid_token|\bunauthori[sz]ed\b|\btoken (?:has )?expired|\bstatus(?: code)?:? 401\b/i.test(s)) return _NET_SIGNIN;
  if (/\bstatus(?: code)?:? 429\b|\brate.?limit(?:ed)?\b|too many requests/i.test(s)) return 'That service is busy right now. Try again in a few minutes.';
  if (/bad gateway|service unavailable|gateway time-?out|internal server error|\bstatus(?: code)?:? 5\d\d\b|\b5\d\d (?:error|response)\b/i.test(s)) return 'That service is having trouble right now. Try again in a few minutes.';
  if (/^(?:request |connection |fetch )?(?:timed out|timeout)\.?$/i.test(s)) return 'It took too long to answer. Try again.';
  if (/\b(?:TypeError|ReferenceError|SyntaxError|RangeError)\b|is not a function|is not defined|is not iterable|cannot (?:read|set) propert|\bundefined\b|\[object \w+\]|unexpected (?:token|end of)|not valid json|json\.parse|^not json$|\n\s+at .+:\d+/i.test(s)) return _NET_INSIDE;
  if (/^unknown\b.*\broute$/i.test(s)) return _netStatusWords(404);
  if (/^not found\.?$/i.test(s)) return 'That couldn’t be found. It may have been removed; refresh the page and try again.';
  if (/^(?:forbidden(?: origin)?|origin)\.?$/i.test(s)) return _netStatusWords(403);
  if (/^(?:invalid|body|bad request|unknown|content-type must\b.*|bad [\w ]{1,30})\.?$/i.test(s)) return _NET_UNREADABLE;
  if (/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/.test(s) && s.length > 2) return 'Something went wrong. Try again.';
  if (s.length > 400) return 'Something went wrong. Try again.';
  return null;
}
/** The text to show for a raw message, keeping a lead-in such as "Couldn’t save: " or "Bank didn’t update: ". */
function netPlainError(raw) {
  const s = String(raw == null ? '' : raw);
  const m = /^((?:Couldn[’']t|Could not|Can[’']t|Cannot) [^:\n]{1,80}|[^:\n]{1,60} didn[’']t update|Not restored|Not saved|Last update failed): (.+)$/s.exec(s.trim());
  if (m) { const w = netPlainWords(m[2]); return w ? m[1] + ': ' + w.replace(/^(The|That|This|It|You|You’re|Your|A|An|Something|Try|Check|Open)\b/, (x) => x.toLowerCase()) : s; }
  return netPlainWords(s) || s;
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
  if (e && typeof e === 'object' && e.name === 'TimeoutError') return 'Freeflo didn’t answer in time. Try again.';
  const m = String((typeof e === 'string' ? e : (e && e.message)) || '').trim();
  if (e && typeof e === 'object' && e.name === 'AbortError' && (!m || /\babort/i.test(m))) return 'It was stopped.';
  const st = _NET_STATUS_RE.exec(m);
  if (st) return _netStatusWords(Number(st[1])) || fallback || `Something went wrong (error ${st[1]}). Try again.`;
  return (m && netPlainWords(m)) || m || (fallback || 'Something went wrong. Try again.');
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
  // The page key (server/actions/auth.mjs): made at every server start and put into
  // this page's config. Changes and server controls need it, so a local program that
  // only fakes our Origin header is refused. After a restart the key is new: on a 401
  // the page reads the new key from a fresh copy of the page once and tries again.
  let pageKey = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG && typeof APP_CONFIG.pageKey === 'string') ? APP_CONFIG.pageKey : '';
  const withKey = (input, init) => {
    if (!pageKey || typeof Headers !== 'function') return init;
    try {
      const h = new Headers((init && init.headers) || (typeof Request === 'function' && input instanceof Request ? input.headers : undefined));
      h.set('X-Dashboard-Page', pageKey);
      return Object.assign({}, init || {}, { headers: h });
    } catch (err) { return init; }
  };
  let keyLoad = null;
  const freshKey = () => keyLoad || (keyLoad = orig.call(window, '/', { cache: 'no-store', credentials: 'same-origin' })
    .then(r => (r.ok ? r.text() : ''))
    .then((html) => {
      const m = /<script id="dashboard-config" type="application\/json">([\s\S]*?)<\/script>/.exec(html || '');
      const k = m ? (JSON.parse(m[1]) || {}).pageKey : '';
      return typeof k === 'string' ? k : '';
    })
    .catch(() => '')
    .finally(() => { setTimeout(() => { keyLoad = null; }, 2000); }));
  const resendable = (input, init) => typeof input === 'string' && (!init || init.body == null || typeof init.body === 'string');
  const wrapped = function netFetch(input, init) {
    const mine = ours(input);
    if (mine) init = withKey(input, withZone(input, init));
    const sent = pageKey;
    return orig.call(window, input, init).then((r) => {
      if (mine) flip(false);
      if (!mine || r.status !== 401 || !resendable(input, init)) return r;
      return freshKey().then((k) => {
        if (!k || k === sent) return r;
        pageKey = k;
        return orig.call(window, input, withKey(input, init));
      });
    }, (e) => {
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
