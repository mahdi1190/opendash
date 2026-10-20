// People that pop, slide, snap and shake: the measurement (docs/dev/WORLD_ENGINE.md 16.4 `pops`, SCENE_LESSONS section AE). Node >= 20,
// no dependencies.
//
// The user (20 Oct): "animations are still strange, like people are changing size when they change movement directions", then "people are
// shaking about". This measures what is DRAWN, per person (and dog) per frame at 30 frames a second: the compositor's own draw records
// and pose plans (Node: render's worldFrameFigures over the life sim, the same views, hysteresis, scale and cross-fade as a frame;
// --browser: the blits the real page drew, S.figs), each blit's part through its matrix (appearance's worldArtHull: the exact outline,
// not the library's conservative box), with the life sim's own state for the causes. Per person it tracks the drawn figure's height,
// width, head and feet, its centre against its anchor, its legs' feet, its view and mirror, its facing, speed and walk cycle, and reports:
//   size pops      the drawn height per metre at its depth jumps over 6 % in one frame (foreshortening is the depth: divided out), and
//                  every change of view with the ratio of the new drawing to the old (swapPop when over 6 %), by view pair and object
//   width pops     the drawn width jumps over 20 % in one frame (a hard swap of a wide side for a narrow front)
//   position pops  the feet (the drawing's lowest row) or its centre jump over 4 px against the anchor in one frame, or the anchor
//                  itself jumps further than the body can move (a teleport)
//   foot slide     walking side-on (the stride drawn in the picture plane over 0.7 of a side-on one), the planted foot (the slower of the two drawn feet) moves on the screen at over half the body's speed
//   heading snaps  the facing the view is drawn from turns faster than the brain's turn rate allows (1.5 x, plus 30 degrees a second)
//   speed pops     the shown speed changes by over 4 m/s/s, or the walk cycle's rate by over 30 % in one frame; walk / stand flicker
//   jitter         (a) the anchor shaking: over 2.5 reversals a second of its sideways motion on a straight course, over 1 cm (RMS) off
//                  its smooth path (a centred 0.5 s window); (b) view flicker: a view or mirror back within 0.5 s; (c) gait noise: the leg
//                  amplitude or swing jumping by over 0.15 in a frame; (d) steering flicker in the sim: the heading's turn reversing over
//                  2.5 times a second on a straight course, a sidestep changing side; (e) dogs: the same, by kind
// Counts are per person-minute (of figures drawn at least 14 px tall); the worst offenders and the first examples name the frame, the
// object, the views and the numbers.
//
//   worldPopsRun(E, spec, o)                 -> report (Node)    o: { ms, wx, seconds (240), fps (30), warm (0) }
//   worldPopsBrowser(chrome, src, o)         -> report (the page) o: { at, seconds (60), fps (30), root, size }
//   popsTracker(E) / tracker.frame(t, figs) / tracker.report()   the analysis (shared by both)
//   worldPopsText(report, id)                -> printable lines
import { worldSimOf } from './adversarial.mjs';

export const POPS = Object.freeze({ size: 0.06, width: 0.2, pos: 4, slide: 0.5, snap: 1.5, snapAdd: 30, accel: 5, rate: 0.3, flicker: 0.5, shakeRev: 2.5, shakeRms: 0.01, minPx: 14, gaitJump: 0.15, win: 15, stutter: 0.5, skip: 1 });
const R3 = (v) => Math.round(v * 1000) / 1000;
const ang = (a) => ((((a % 360) + 540) % 360) - 180);

export function popsKind(obj, a) {
  const o = String(obj || '');
  if (/^animal\.dog/.test(o)) return 'dog';
  if (/^person\.cyclist/.test(o) || (a && a.cls === 'cyclist')) return 'cyclist';
  if (/jogger|runner/.test(o)) return 'runner';
  if (/dog-walker/.test(o)) return 'dog-walker';
  if (/family|buggy/.test(o)) return 'family';
  if ((a && a.age === 'child') || /child|kid/.test(o)) return 'child';
  if ((a && (a.age === 'older' || a.age === 'elderly')) || /elderly|older/.test(o)) return 'elderly';
  if (/^person\./.test(o)) return 'person';
  return null;
}

/** The drawn bounds of one drawing: the union of its blits (the parts through their matrices), and its legs' lowest points. */
function drawBox(E, d) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const feet = [];
  for (const b of d.blits) {
    if (!(b.a > 0.02)) continue;
    const H = E.worldArtHull(d.o, d.v, d.season, b.part);
    if (!H) continue;
    const M = b.M, P = H.pts, pad = H.pad * Math.hypot(M[0], M[1]);
    let fy = -Infinity, fx = 0;
    for (let i = 0; i < P.length; i += 2) {
      const x = M[0] * P[i] + M[2] * P[i + 1] + M[4], y = M[1] * P[i] + M[3] * P[i + 1] + M[5];
      if (x - pad < x0) x0 = x - pad; if (x + pad > x1) x1 = x + pad; if (y - pad < y0) y0 = y - pad; if (y + pad > y1) y1 = y + pad;
      if (y > fy) { fy = y; fx = x; }
    }
    if (/^leg/i.test(b.part)) feet.push({ part: b.part, x: fx, y: fy });
  }
  if (!isFinite(x0)) return null;
  return { x0, y0, x1, y1, feet };
}
/** The rest height of a drawing (its still art, unposed, at its scale): the change of view compares these. */
function restH(E, d) { const b = E.worldArtBounds(d.o, d.v, d.season, '*'); return b ? (b[3] - b[1]) * d.s : null; }

function newCounts() { return { sizePop: 0, swaps: 0, swapPop: 0, widthPop: 0, posPop: 0, anchorJump: 0, slideFrames: 0, sideOnFrames: 0, headingSnap: 0, speedPop: 0, ratePop: 0, clipFlicker: 0, viewFlicker: 0, mirrorFlip: 0, shakeFrames: 0, shakeOnsets: 0, stutterFrames: 0, stutterBase: 0, steerFlip: 0, sideFlip: 0, gaitNoise: 0, frames: 0, moving: 0 }; }

/** The analysis: feed it each frame's figures ({ id, obj, X, Y, x, z, height, view, mirror, draws, agent, raw, anim }). */
export function popsTracker(E, o = {}) {
  const fps = o.fps || 30, dt = 1 / fps, P = new Map(), C = newCounts(), byKind = {}, swaps = {}, examples = [], keep = o.keep || 40;
  const kindC = (k) => byKind[k] || (byKind[k] = newCounts());
  const ex = (rule, t, f, msg, extra) => { if (examples.filter(e => e.rule === rule).length < 6 && examples.length < keep) examples.push(Object.assign({ rule, t: R3(t), id: f.id, obj: f.obj, msg }, extra || {})); };
  const bump = (p, k, n = 1) => { C[k] += n; kindC(p.kind)[k] += n; p.c[k] = (p.c[k] || 0) + n; };
  let frames = 0;
  function frame(t, figs) {
    frames++;
    const seen = new Set();
    for (const f of figs) {
      const kind = popsKind(f.obj, f.agent);
      if (!kind || !f.draws || !f.draws.length) continue;
      seen.add(f.id);
      let p = P.get(f.id);
      if (!p) P.set(f.id, p = { id: f.id, obj: f.obj, kind, c: {}, prev: null, hist: [], keys: [], clips: [], hd: [], frames: 0, moving: 0 });
      // the drawings (two while a view change cross-fades): their share of the opacity normalised (an agent's own alpha is common to both)
      const sumA = f.draws.reduce((s, d) => s + (d.a > 0 ? d.a : 0), 0) || 1;
      let H = 0, W = 0, feetY = 0, headY = 0, cx = 0, any = false, legs = null, bestA = -1, newest = f.draws[f.draws.length - 1];
      for (const d of f.draws) {
        const w = (d.a > 0 ? d.a : 0) / sumA, b = drawBox(E, d);
        if (!b || !(w > 0)) continue;
        any = true;
        H += w * (b.y1 - b.y0); W += w * (b.x1 - b.x0); feetY += w * b.y1; headY += w * b.y0; cx += w * (b.x0 + b.x1) / 2;
        if (d.a > bestA) { bestA = d.a; legs = b.feet; }
      }
      if (!any) continue;
      const sp = f.agent ? Math.hypot(f.agent.vx || 0, f.agent.vz || 0) : 0, moving = sp > 0.15, big = H >= POPS.minPx;
      const key = newest.o + (newest.flip ? '~' : ''), clip = f.anim && f.anim.clip, rate = f.anim && f.anim.rate;
      const s = { t, X: f.X, Y: f.Y, x: f.x, z: f.z, height: f.height, H, W, feetY, headY, cx, legs, key, view: f.view, mirror: f.mirror, sp, clip, rate,
        k: f.anim ? f.anim.k : null, swing: f.anim && f.anim.gait ? f.anim.gait.swing : null, fs: f.anim && f.anim.gait ? f.anim.gait.fs : null, plane: f.anim && f.anim.gait ? f.anim.gait.plane : null,
        face: moving ? (f.anim && Number.isFinite(f.anim.yaw) ? f.anim.yaw : Math.atan2(f.agent.vx, f.agent.vz) * 180 / Math.PI) : null, heading: f.raw && Number.isFinite(f.raw.heading) ? f.raw.heading * 180 / Math.PI : null,
        turn: f.raw && f.raw.turn > 0 ? f.raw.turn : 0.5, sideDir: f.raw ? f.raw.sideDir : null, sideV: f.raw ? f.raw.sideV : 0, rest: restH(E, newest), fade: f.draws.length > 1, big };
      if (big) { p.frames++; C.frames++; kindC(kind).frames++; if (moving) { p.moving++; C.moving++; kindC(kind).moving++; } }
      const q = p.prev;
      if (q && t >= POPS.skip && Math.abs(t - q.t - dt) < dt * 0.6 && big && q.big) {
        const sameH = s.height === q.height;
        // (a) size: the drawn height per metre at its depth, frame to frame
        if (sameH && q.H > 0) {
          const k = (s.H * s.z) / (q.H * q.z);
          if (Math.abs(k - 1) > POPS.size) { bump(p, 'sizePop'); ex('sizePop', t, f, `drawn height ${q.H.toFixed(1)} -> ${s.H.toFixed(1)} px (${Math.round((k - 1) * 100)} % at its depth) ${q.view}${q.mirror ? '~' : ''} -> ${s.view}${s.mirror ? '~' : ''}${s.fade ? ' (cross-fading)' : ''}`, { k: R3(k) }); }
          const kw = q.W > 0 ? (s.W * s.z) / (q.W * q.z) : 1;
          if ((s.key !== q.key || s.fade) && Math.abs(kw - 1) > POPS.width) { bump(p, 'widthPop'); ex('widthPop', t, f, `drawn width ${q.W.toFixed(1)} -> ${s.W.toFixed(1)} px ${q.view} -> ${s.view}`); }
        }
        // a change of view: the new drawing's rest height against the old one's, at the same depth
        if (s.key !== q.key) {
          const pair = `${q.view}${q.mirror ? '~' : ''}>${s.view}${s.mirror ? '~' : ''}`, so = `${pair}|${f.obj}`;
          const k = q.rest > 0 && s.rest > 0 ? (s.rest * s.z) / (q.rest * q.z) : 1;
          const w = swaps[so] || (swaps[so] = { pair, obj: f.obj, kind, n: 0, pops: 0, sum: 0, max: 0 });
          w.n++; w.sum += Math.abs(k - 1); w.max = Math.max(w.max, Math.abs(k - 1));
          bump(p, 'swaps');
          if (sameH && Math.abs(k - 1) > POPS.size) { w.pops++; bump(p, 'swapPop'); ex('swapPop', t, f, `${pair}: the new view is drawn ${Math.round((k - 1) * 100)} % ${k > 1 ? 'taller' : 'shorter'} (${q.key} -> ${s.key})`, { k: R3(k) }); }
          if (q.view === s.view && q.mirror !== s.mirror) bump(p, 'mirrorFlip');
          // (b) view flicker: back to a drawing it showed within the last 0.5 s
          const back = p.keys.find(e => e.key === s.key && t - e.t <= POPS.flicker);
          if (back) { bump(p, 'viewFlicker'); ex('viewFlicker', t, f, `back to ${s.view}${s.mirror ? '~' : ''} ${R3(t - back.t)} s after leaving it`); }
          p.keys.push({ key: q.key, t });
          if (p.keys.length > 6) p.keys.shift();
        }
        // position: the feet and the centre against the anchor; the anchor against what the body can move
        if (sameH) {
          const dF = (s.feetY - s.Y) - (q.feetY - q.Y), dC = (s.cx - s.X) - (q.cx - q.X);
          if (Math.abs(dF) > POPS.pos || Math.abs(dC) > POPS.pos) { bump(p, 'posPop'); ex('posPop', t, f, `feet ${dF.toFixed(1)} px, centre ${dC.toFixed(1)} px against the anchor ${q.view}${q.mirror ? '~' : ''} -> ${s.view}${s.mirror ? '~' : ''}`); }
        }
        const dw = Math.hypot(s.x - q.x, s.z - q.z), allow = Math.max(s.sp, q.sp) * dt * 2.5 + 0.05;
        if (dw > allow) { bump(p, 'anchorJump'); ex('anchorJump', t, f, `the anchor moved ${dw.toFixed(2)} m in one frame at ${q.sp.toFixed(2)} m/s`); }
        // heading snaps: the facing the view is drawn from, against the brain's turn rate (180 degrees in brain.turn seconds)
        if (s.face != null && q.face != null && s.sp > 0.3 && q.sp > 0.3) {
          const rt = Math.abs(ang(s.face - q.face)) / dt, max = 180 / s.turn;
          if (rt > max * POPS.snap + POPS.snapAdd) { bump(p, 'headingSnap'); ex('headingSnap', t, f, `facing turned ${Math.round(rt)} deg/s (the brain allows ${Math.round(max)})`); }
        }
        // speed pops and the walk cycle
        // (over 0.1 s: the life ticks at 15 Hz, so the shown velocity steps every other frame)
        const q3 = p.hist.length >= 3 ? p.hist[p.hist.length - 3] : null;
        const jolt = q3 && Math.abs(s.sp - q3.sp) / (s.t - q3.t) > POPS.accel;
        if (jolt && !p.jolt) { bump(p, 'speedPop'); ex('speedPop', t, f, `shown speed ${q3.sp.toFixed(2)} -> ${s.sp.toFixed(2)} m/s in ${(s.t - q3.t).toFixed(2)} s`); }
        p.jolt = !!jolt;
        if (q3 && s.clip === q3.clip && /^(walk|run|trot)$/.test(String(s.clip)) && q3.rate > 0 && s.rate > 0 && Math.abs(s.rate / q3.rate - 1) > POPS.rate) { bump(p, 'ratePop'); ex('ratePop', t, f, `walk cycle ${q3.rate.toFixed(2)} -> ${s.rate.toFixed(2)} Hz in 0.1 s`); }
        if (s.clip !== q.clip) {
          const back = p.clips.find(e => e.clip === s.clip && t - e.t <= POPS.flicker);
          if (back && /^(walk|run|trot|idle)$/.test(String(s.clip))) { bump(p, 'clipFlicker'); ex('clipFlicker', t, f, `${q.clip} -> ${s.clip} ${R3(t - back.t)} s after leaving it`); }
          p.clips.push({ clip: q.clip, t }); if (p.clips.length > 6) p.clips.shift();
        }
        // (c) gait noise: the leg amplitude or swing jumping between frames
        if (moving && s.key === q.key && !s.fade && s.k != null && q.k != null && (Math.abs(s.k - q.k) > POPS.gaitJump || (s.swing != null && q.swing != null && Math.abs(s.swing - q.swing) > POPS.gaitJump))) { bump(p, 'gaitNoise'); ex('gaitNoise', t, f, `leg amplitude ${q.k} -> ${s.k}, swing ${q.swing} -> ${s.swing}`); }
        // foot slide: walking side-on, the planted foot is the slower of the two drawn feet; on a fixed camera it should stand still
        if (moving && /^(walk|run|trot)$/.test(String(s.clip)) && s.plane != null && s.plane > 0.7 && s.legs && q.legs && s.legs.length >= 2 && q.legs.length >= 2 && !s.fade && s.key === q.key && s.H >= 30) {
          const vA = Math.abs((s.X - q.X) / dt);
          if (vA > 4) {
            const vs = s.legs.map((L, i) => Math.abs((L.x - q.legs[i].x) / dt));
            p.slip = p.slip || [];
            p.slip.push(Math.min(...vs) / vA);
            if (p.slip.length > 9) p.slip.shift();
            if (p.slip.length >= 5) {
              const m = p.slip.slice().sort((a, b) => a - b)[Math.floor(p.slip.length / 2)];
              bump(p, 'sideOnFrames');
              if (m > POPS.slide) { bump(p, 'slideFrames'); if (!p.slid) ex('footSlide', t, f, `the planted foot moves at ${Math.round(m * 100)} % of the body's speed on the screen (${s.view}, rate ${s.rate} Hz, ${s.sp.toFixed(2)} m/s)`); p.slid = true; } else p.slid = false;
            }
          }
        }
        // (d) the sidestep changing side
        if (s.sideV > 0.01 && q.sideV > 0.01 && s.sideDir != null && q.sideDir != null && s.sideDir !== q.sideDir) bump(p, 'sideFlip');
      }
      // (a) the anchor shaking and (d) the heading's turn reversing: over a centred window of POPS.win frames each side
      p.hist.push(s);
      if (p.hist.length > 2 * POPS.win + 1) p.hist.shift();
      if (p.hist.length === 2 * POPS.win + 1 && t >= POPS.skip) shake(p, f);
      p.prev = s;
    }
    for (const id of [...P.keys()]) if (!seen.has(id)) { const p = P.get(id); if (t - p.prev.t > 1) { done.push(p); P.delete(id); } }
  }
  const done = [];
  function shake(p, f) {
    const Hs = p.hist, c = Hs[POPS.win];
    // a stutter: the body moving in fits and starts from frame to frame (the per-frame step's own change against its mean; a steady walk
    // is near 0, still-then-double steps (a 15 Hz move drawn at 30 or 60 Hz) are 2)
    if (c.big && Hs.every(h => h.sp > 0.3)) {
      let sd = 0, sdd = 0, n = 0, prevD = null;
      for (let i = 1; i < Hs.length; i++) { const d = Math.hypot(Hs[i].x - Hs[i - 1].x, Hs[i].z - Hs[i - 1].z); sd += d; if (prevD != null) { sdd += Math.abs(d - prevD); n++; } prevD = d; }
      const md = sd / (Hs.length - 1), st = n && md > 0.004 ? sdd / n / md : 0;
      bump(p, 'stutterBase');
      if (st > POPS.stutter) { bump(p, 'stutterFrames'); if (!p.stuttered) ex('stutter', c.t, f, `the body moves in fits and starts: the step from frame to frame changes by ${Math.round(st * 100)} % of its mean (${(md * 1000).toFixed(1)} mm a frame)`); p.stuttered = true; } else p.stuttered = false;
    }
    if (!c.big || !(c.sp > 0.15) || Hs.some(h => !(h.sp > 0.1))) { p.shaking = false; return; }
    const a = Hs[0], b = Hs[Hs.length - 1], L = Math.hypot(b.x - a.x, b.z - a.z);
    if (!(L > 0.2)) { p.shaking = false; return; }
    const ux = (b.x - a.x) / L, uz = (b.z - a.z) / L;
    // a straight course: the facing over the window within 30 degrees
    const f0 = Hs[0].face, f1 = Hs[Hs.length - 1].face;
    if (f0 == null || f1 == null || Math.abs(ang(f1 - f0)) > 30) { p.shaking = false; return; }
    let rev = 0, lastSign = 0, rms = 0, mx = 0, mz = 0;
    for (const h of Hs) { mx += h.x; mz += h.z; }
    mx /= Hs.length; mz /= Hs.length;
    for (let i = 1; i < Hs.length; i++) {
      const lat = -uz * (Hs[i].x - Hs[i - 1].x) + ux * (Hs[i].z - Hs[i - 1].z);
      if (Math.abs(lat) > 0.0015) { const sg = Math.sign(lat); if (lastSign && sg !== lastSign) rev++; lastSign = sg; }
    }
    // the residual off the straight line through the window (its own mean and course)
    for (const h of Hs) { const e = -uz * (h.x - mx) + ux * (h.z - mz); rms += e * e; }
    rms = Math.sqrt(rms / Hs.length);
    const secs = (Hs.length - 1) / fps, rate = rev / secs;
    // the heading's turn reversing (the sim's own heading, a straight course)
    let hrev = 0, hl = 0;
    for (let i = 1; i < Hs.length; i++) { if (Hs[i].heading == null || Hs[i - 1].heading == null) continue; const d = ang(Hs[i].heading - Hs[i - 1].heading); if (Math.abs(d) > 0.5) { const sg = Math.sign(d); if (hl && sg !== hl) hrev++; hl = sg; } }
    if (hrev / secs > POPS.shakeRev) { p.steerWin = (p.steerWin || 0) + 1; if (p.steerWin === 1) { bump(p, 'steerFlip'); ex('steerFlip', c.t, f, `the heading's turn reversed ${hrev} times in ${secs.toFixed(1)} s on a straight course`); } } else p.steerWin = 0;
    const sh = rate > POPS.shakeRev && rms > POPS.shakeRms;
    if (sh) { bump(p, 'shakeFrames'); if (!p.shaking) { bump(p, 'shakeOnsets'); ex('shake', c.t, f, `the body reverses sideways ${rate.toFixed(1)} times a second, ${Math.round(rms * 1000)} mm RMS off its line (${f.raw && f.raw.cause ? f.raw.cause : 'cause?'})`, { cause: f.raw ? f.raw.cause : null }); p.shakeCause = p.shakeCause || {}; const cs = f.raw && f.raw.cause || 'other'; p.shakeCause[cs] = (p.shakeCause[cs] || 0) + 1; } }
    p.shaking = sh;
  }
  function report() {
    const all = done.concat([...P.values()]);
    const mins = C.frames / fps / 60, per = (n, m) => (m > 0 ? R3(n / m) : 0);
    const perMin = {};
    for (const k of Object.keys(C)) if (!['frames', 'moving', 'slideFrames', 'sideOnFrames', 'shakeFrames', 'stutterFrames', 'stutterBase'].includes(k)) perMin[k] = per(C[k], mins);
    const kinds = {};
    for (const [k, c] of Object.entries(byKind)) { const m = c.frames / fps / 60; kinds[k] = { minutes: R3(m), swaps: c.swaps, swapPop: c.swapPop, sizePop: per(c.sizePop, m), posPop: per(c.posPop, m), headingSnap: per(c.headingSnap, m), viewFlicker: per(c.viewFlicker, m), shake: per(c.shakeOnsets, m), shakeShare: c.moving ? R3(c.shakeFrames / c.moving) : 0, slideShare: c.sideOnFrames ? R3(c.slideFrames / c.sideOnFrames) : 0, speedPop: per(c.speedPop, m), steerFlip: per(c.steerFlip, m), stutterShare: c.stutterBase ? R3(c.stutterFrames / c.stutterBase) : 0 }; }
    const sw = Object.values(swaps).map(w => ({ pair: w.pair, obj: w.obj, kind: w.kind, n: w.n, pops: w.pops, mean: R3(w.sum / w.n), max: R3(w.max) })).sort((a, b) => b.pops - a.pops || b.max - a.max);
    const score = (p) => (p.c.sizePop || 0) + (p.c.swapPop || 0) + (p.c.posPop || 0) + (p.c.headingSnap || 0) + (p.c.viewFlicker || 0) + (p.c.shakeOnsets || 0) * 2 + (p.c.speedPop || 0) + (p.c.clipFlicker || 0) + (p.c.slideFrames || 0) / 30;
    const worst = all.filter(p => score(p) > 0).sort((a, b) => score(b) - score(a)).slice(0, 10).map(p => ({ id: p.id, obj: p.obj, kind: p.kind, score: R3(score(p)), c: p.c, shakeCause: p.shakeCause || null }));
    return { frames, fps, personMinutes: R3(mins), movingMinutes: R3(C.moving / fps / 60), counts: C, perMin, shakeShare: C.moving ? R3(C.shakeFrames / C.moving) : 0, slideShare: C.sideOnFrames ? R3(C.slideFrames / C.sideOnFrames) : 0, stutterShare: C.stutterBase ? R3(C.stutterFrames / C.stutterBase) : 0, byKind: kinds, swaps: sw, worst, examples };
  }
  return { frame, report };
}

/** The cause of the moment for a life agent (raw record): what the steering is doing to it. */
export function popsCause(a, t) {
  if (!a) return null;
  if (a.lead && a.leader) return 'dog on a lead' + (a.leader && a.lead && Math.hypot(a.x - a.leader.x, a.z - a.leader.z) > a.lead.len * 0.85 ? ' (taut)' : '');
  if (a.yieldPinch != null && t - a.yieldPinch < 0.3) return 'pinch yield';
  if (a.squeezed != null && t - a.squeezed < 0.25) return 'pushed (separation)';
  if (a.held != null && t - a.held < 0.3) return 'queue or taut lead';
  if (a.ghost > 0) return 'ghost pass';
  if (a.sideV > 0.01) return 'sidestep';
  if (a.leader) return 'group follower';
  if (a.slow != null && a.slow < 0.9) return 'queue (easing)';
  if (a.turning) return 'turning';
  return 'free walk';
}
const rawOf = (a, t) => (a ? { heading: a.heading, turn: a.brain && a.brain.turn, sideDir: a.sideDir, sideV: a.sideV || 0, cause: popsCause(a, t) } : null);

/** The Node run: the life sim, render's worldFrameFigures (the compositor's draw records and pose plans) each frame. */
export function worldPopsRun(E, spec, o = {}) {
  const seconds = o.seconds || 240, fps = o.fps || 30, sim = worldSimOf(E, spec, o), T = popsTracker(E, { fps });
  if (!sim.world || typeof E.worldFrameFigures !== 'function' || typeof E.worldArtHull !== 'function') return Object.assign(T.report(), { error: sim.error || 'worldFrameFigures / worldArtHull are not loaded' });
  const mem = new Map(), season = sim.world.season || 'summer';
  for (let i = 0; i <= seconds * fps; i++) {
    if (i) sim.step(1 / fps);
    const agents = sim.agents(), L = sim.life, raw = new Map(((L && L.agents) || []).map(a => [String(a.id), a])), byId = new Map(agents.map(a => [String(a.id), a]));
    const figs = E.worldFrameFigures(sim.world, sim.t, { mem, agents, season, wet: false });
    const lt = L ? L.t : sim.t;
    T.frame(sim.t, figs.map(g => { const a = byId.get(String(g.id)) || null, an = a && typeof E.worldAnimOf === 'function' ? E.worldAnimOf(Object.assign({}, a, { obj: a.obj }), sim.world) : null; return Object.assign(g, { agent: a, raw: rawOf(raw.get(String(g.id)), lt), anim: an ? { clip: an.clip, rate: an.rate, k: an.k, gait: an.gait || null, yaw: an.yaw } : null }); }));
  }
  return Object.assign(T.report(), { seconds, source: 'node' });
}

/** The page: the blits the page drew (the compositor's S.figs), the page's own life for the causes. */
export async function worldPopsBrowser(chrome, src, o = {}) {
  const { worldPageOpen } = await import('./sheet.mjs');
  const seconds = o.seconds || 60, fps = o.fps || 30, T = popsTracker(o.E, { fps }), errors = [];
  const page = await worldPageOpen(chrome, src, { size: o.size || { w: 1600, h: 900 }, at: o.at || null, wx: o.wx || null, root: o.root, live: true, freeze: true });
  await page.rewind();
  const id = (src.id || (src.ref ? src.ref.split('/').pop() : 'world')) + '~w3';
  for (let k = 0; k <= seconds * fps; k++) {
    const t = Math.round(k / fps * 10000) / 10000;
    if (await page.frameAt(t) !== true) { errors.push('no canvas renderer'); break; }
    const r = await chrome.evaluate(`(() => { try {
      const rec = worldHostLive(${JSON.stringify(id)}), S = rec && rec.frame && rec.frame.last;
      if (!S) return { error: 'nothing drawn' };
      const first = !S.figRec; S.figRec = true;
      if (first || !S.drawn || !S.drawn.figs) return { skip: true };
      const L = rec.driver && rec.driver.life ? rec.driver.life() : null, raw = new Map((L ? L.agents : []).map(a => [String(a.id), a])), ag = new Map((S.drawn.agents || []).map(a => [String(a.id), a]));
      const by = new Map();
      for (const f of S.drawn.figs) { if (!by.has(f.id)) by.set(f.id, []); by.get(f.id).push(f); }
      const out = [];
      for (const [fid, ds] of by) {
        const a = ag.get(String(fid)) || null, w = ds[ds.length - 1], ra = raw.get(String(fid)), an = a && typeof worldAnimOf === 'function' ? worldAnimOf(a, rec.world) : null;
        out.push({ id: fid, obj: w.obj, X: w.X, Y: w.Y, x: w.x, z: w.z, height: w.height, view: w.view, mirror: w.mirror,
          draws: ds.map(d => ({ o: d.o, v: d.v, season: d.season, flip: d.flip, s: d.s, a: d.a, blits: d.blits })),
          agent: a ? { vx: a.vx, vz: a.vz, cls: a.cls, age: a.age } : null,
          raw: ra ? { heading: ra.heading, turn: ra.brain && ra.brain.turn, sideDir: ra.sideDir, sideV: ra.sideV || 0, lead: !!ra.lead, leader: !!ra.leader, taut: !!(ra.lead && ra.leader && Math.hypot(ra.x - ra.leader.x, ra.z - ra.leader.z) > ra.lead.len * 0.85), yieldPinch: ra.yieldPinch, squeezed: ra.squeezed, held: ra.held, ghost: ra.ghost, slow: ra.slow, turning: ra.turning, lt: L.t } : null,
          anim: an ? { clip: an.clip, rate: an.rate, k: an.k, gait: an.gait || null, yaw: an.yaw } : null });
      }
      return { t: S.drawn.tau, out };
    } catch (e) { return { error: String(e && e.stack || e) }; } })()`);
    if (!r || r.error) { errors.push((r && r.error) || 'no result'); break; }
    if (r.skip) continue;
    for (const q of r.out) if (q.raw) { const a = q.raw; q.raw.cause = a.lead && a.leader ? 'dog on a lead' + (a.taut ? ' (taut)' : '') : a.yieldPinch != null && a.lt - a.yieldPinch < 0.3 ? 'pinch yield' : a.squeezed != null && a.lt - a.squeezed < 0.25 ? 'pushed (separation)' : a.held != null && a.lt - a.held < 0.3 ? 'queue or taut lead' : a.ghost > 0 ? 'ghost pass' : a.sideV > 0.01 ? 'sidestep' : a.leader ? 'group follower' : a.slow != null && a.slow < 0.9 ? 'queue (easing)' : a.turning ? 'turning' : 'free walk'; }
    T.frame(r.t, r.out);
  }
  for (const e of await page.errors()) errors.push('page: ' + e);
  return Object.assign(T.report(), { seconds, source: 'page', errors });
}

export function worldPopsText(R, id) {
  const c = R.counts || {}, m = R.perMin || {}, pc = (v) => (v * 100).toFixed(1) + ' %';
  const L = [`${id}: ${R.frames} frames at ${R.fps} fps, ${R.personMinutes} person-minutes drawn (${R.movingMinutes} moving)`,
    `  size pops ${c.sizePop} (${m.sizePop}/min)  view changes ${c.swaps} (${m.swaps}/min), ${c.swapPop} of them over 6 % (${m.swapPop}/min)  width pops ${c.widthPop}`,
    `  position pops ${c.posPop} (${m.posPop}/min)  anchor jumps ${c.anchorJump}  heading snaps ${c.headingSnap} (${m.headingSnap}/min)  speed pops ${c.speedPop}  cycle-rate pops ${c.ratePop}  walk/stand flicker ${c.clipFlicker}`,
    `  foot slide ${pc(R.slideShare)} of side-on walking  view flicker ${c.viewFlicker} (${m.viewFlicker}/min)  mirror flips ${c.mirrorFlip}  gait noise ${c.gaitNoise}`,
    `  jitter: stutter ${pc(R.stutterShare || 0)} of moving time; shaking ${pc(R.shakeShare)} of moving time, ${c.shakeOnsets} onsets (${m.shakeOnsets}/min); steering reversals ${c.steerFlip} (${m.steerFlip}/min); sidestep side flips ${c.sideFlip}`];
  L.push('  by kind:');
  for (const [k, v] of Object.entries(R.byKind || {}).sort((a, b) => b[1].minutes - a[1].minutes)) L.push(`    ${k.padEnd(11)} ${String(v.minutes).padStart(7)} min  swaps ${String(v.swaps).padStart(4)} (${v.swapPop} pops)  size ${v.sizePop}/min  pos ${v.posPop}/min  snap ${v.headingSnap}/min  flicker ${v.viewFlicker}/min  shake ${v.shake}/min (${pc(v.shakeShare)})  slide ${pc(v.slideShare)}`);
  const sw = (R.swaps || []).filter(w => w.pops || w.max > 0.06).slice(0, 14);
  if (sw.length) { L.push('  view changes that change the size (pops / changes, mean and max |ratio - 1|):'); for (const w of sw) L.push(`    ${w.pair.padEnd(22)} ${String(w.obj).padEnd(28)} ${String(w.pops).padStart(4)} / ${String(w.n).padEnd(4)} mean ${(w.mean * 100).toFixed(1)} %  max ${(w.max * 100).toFixed(1)} %`); }
  if (R.worst && R.worst.length) { L.push('  worst:'); for (const w of R.worst) L.push(`    ${String(w.id).padEnd(10)} ${String(w.obj).padEnd(26)} ${w.kind.padEnd(10)} ${Object.entries(w.c).filter(([k, v]) => v && !['swaps', 'sideOnFrames'].includes(k)).map(([k, v]) => k + ' ' + v).join(', ')}${w.shakeCause ? '  shake: ' + Object.entries(w.shakeCause).map(([k, v]) => k + ' ' + v).join(', ') : ''}`); }
  if (R.examples && R.examples.length) { L.push('  examples:'); for (const e of R.examples.slice(0, 24)) L.push(`    t ${String(e.t).padEnd(8)} ${String(e.id).padEnd(10)} ${String(e.obj).padEnd(26)} ${e.rule.padEnd(12)} ${e.msg}`); }
  for (const e of R.errors || []) L.push('  ERROR ' + e);
  if (R.error) L.push('  ERROR ' + R.error);
  return L.join('\n');
}
