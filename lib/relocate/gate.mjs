// lib/relocate/gate.mjs - "changes are paused while your data moves".
//
// The server's state store checks it before every write (server/index.mjs
// passes it with the two-computer gate as the store's writeGate): while a move
// copies the data, saves answer 423 {code: 'MOVING'} and the page keeps the
// edit in the browser until OpenDash restarts in the new place. The automatic
// background jobs (lib/main-computer.mjs) are skipped while it is paused too.

export const MOVING = 'MOVING';

export function movingError() {
  const message = 'OpenDash is moving your data to its new folder. Changes are paused for a minute; this page keeps them and saves them when the move is done.';
  return Object.assign(new Error(message), { status: 423, code: MOVING, toJSON: () => ({ error: message, code: MOVING, message }) });
}

export function createMoveGate({ now = () => Date.now() } = {}) {
  let paused = null;
  return {
    pause(reason = 'moving') { paused = { since: now(), reason }; },
    resume() { paused = null; },
    get paused() { return !!paused; },
    status() { return paused ? { paused: true, ...paused } : { paused: false }; },
    check() { if (paused) throw movingError(); },
  };
}
