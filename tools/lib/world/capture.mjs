// The full-loop capture (docs/dev/WORLD_ENGINE.md 16.4, 16.5 item 4; requirements U3, T1, A3). Node >= 20, no dependencies.
//
//   worldCapturePlan(o)               -> [t]: the scene times of the frames (o.full: the WHOLE loop, WORLD_LOOP_S, every o.every s,
//                                        default 6 s -> 60 frames, plus the frame after the seam, so a restart would show; else
//                                        o.seconds of the start)
//   worldCapture(chrome, src, o)      -> { strip, frames: [{ t, file }], gif?, seconds, errors }: one page, the host's clock stopped,
//                                        the world's life advanced to each t deterministically (the same t gives the same frame, R4),
//                                        each frame captured; the strip is a contact sheet of every frame with its time, and
//                                        o.gif writes an animated GIF of the same frames (tools/lib/scene-capture.mjs gifFromPngs)
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { worldPageOpen, composeSheet, worldReviewChecklist, fileSafe, WORLD_SIZES } from './sheet.mjs';
import { gifFromPngs } from '../scene-capture.mjs';

export const WORLD_LOOP_DEFAULT_S = 360;

export function worldCapturePlan(o = {}) {
  const loop = Number.isFinite(o.loop) ? o.loop : WORLD_LOOP_DEFAULT_S;
  if (o.full) {
    const every = o.every || 6, out = [];
    for (let t = 0; t < loop - 1e-9; t += every) out.push(Math.round(t * 100) / 100);
    out.push(loop, loop + every);   // the seam and the frame after it: the loop must carry on, never restart
    return out;
  }
  const seconds = o.seconds || 20, fps = o.fps || 2, out = [];
  for (let k = 0; k <= seconds * fps; k++) out.push(Math.round(k / fps * 100) / 100);
  return out;
}

const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}${t % 1 ? "." + Math.round((t % 1) * 10) : ""}`;

/** src: { ref } | { spec, id }. o: { full, every, seconds, loop, at, wx, size, dir, gif, root, cols }. */
export async function worldCapture(chrome, src, o = {}) {
  const size = o.size || { w: 480, h: 270 }, dir = o.dir || join(tmpdir(), 'opendash-world', 'capture'), name = fileSafe(src.ref || src.id || 'world');
  mkdirSync(dir, { recursive: true });
  const times = worldCapturePlan(o), errors = [], frames = [], pngs = [];
  // a LIVE page: the life advances with the pinned scene time (a still page shows the base moment in every frame)
  const page = await worldPageOpen(chrome, src, { size, at: o.at || null, wx: o.wx || null, root: o.root, live: true });
  await page.rewind();
  for (const t of times) {
    try {
      const ok = await page.frameAt(t);
      if (ok !== true) throw new Error('no canvas renderer');
      const png = await page.png(), file = join(dir, `${name}--t${String(Math.round(t)).padStart(4, '0')}.png`);
      writeFileSync(file, png); frames.push({ t, file }); pngs.push(png);
    } catch (e) { errors.push(`t ${t}: ${e.message}`); }
  }
  for (const e of await page.errors()) errors.push('page: ' + e);
  const cols = o.cols || 10, loop = Number.isFinite(o.loop) ? o.loop : WORLD_LOOP_DEFAULT_S;
  const cells = frames.map((f, i) => ({ row: Math.floor(i / cols), col: i % cols, rowLabel: i % cols === 0 ? mmss(f.t) : '', label: mmss(f.t) + (f.t >= loop ? ' (after the seam)' : ''), file: f.file }));
  const strip = join(dir, `${name}--${o.full ? 'loop' : 'capture'}-strip.png`);
  writeFileSync(strip, await composeSheet(chrome, cells, { title: `${src.ref || src.id}: ${o.full ? 'the whole loop (' + loop + ' s)' : times[times.length - 1] + ' s'}, a frame every ${o.full ? (o.every || 6) : 1 / (o.fps || 2)} s`,
    thumb: { w: Math.min(size.w, 240), h: Math.round(Math.min(size.w, 240) * size.h / size.w) }, notes: ['Reviewer: look for each of these across the strip:', ...worldReviewChecklist('capture')] }));
  let gif = null;
  if (o.gif && pngs.length) {
    const g = gifFromPngs(pngs, { fps: o.gifFps || 4 });
    gif = join(dir, `${name}--${o.full ? 'loop' : 'capture'}.gif`);
    writeFileSync(gif, g.gif);
  }
  return { strip, frames, gif, seconds: times[times.length - 1], errors, size: size || WORLD_SIZES.tile };
}
