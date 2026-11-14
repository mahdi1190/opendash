# World scenes: flicker and handover (14 Nov 2026)

What makes a world-engine (v3) scene flicker, jump or pop, and how the host, the compositor and the canvas renderer now avoid it. Both
renderers of a world scene draw from the same planning functions: the Canvas2D one (`78-scene-canvas.js` plus the `world-frame` pass in
`79-world-5frame.js`) and the Phaser stage. Read `docs/dev/WORLD_ENGINE.md` 2.1 to 2.8 and 11.3 first.

Files: `79-world-5host.js` (clock, life, interpolation), `79-world-5frame.js` (plan and draw), `79-world-3order.js` (depth order),
`79-world-4light.js` (lights, murk, shadows), `78-scene-canvas.js` (renderer, governor), `78-scene-0pass.js` (pass registry).

## 1. The opening handover: one clock, one life, no resets

- **The clock never runs backwards on its own** (`worldHostClock`). A host time that steps back (the opening's `sceneHostRestartClock`
  at the welcome, a `frame(0)`) **rebases**: the scene time goes on from where it is. Until 14 Nov it restarted at 0, and
  `worldHostAt` then showed the old driver's base positions for 300 ms and rebuilt a driver over the same life. Every person jumped back
  and then forward again (measured live: a 54 m jump in one frame in Manchester, 96 m at Fleet Pond).
- A renderer that draws after the clock's owner stopped takes the clock over where it is (rebased). A second renderer drawing at the
  same time only shows the moment.
- **Captures never touch the clock.** `frameInto` sets `env.capture` while it draws. A bake-cache still uses `'still'` (the base
  moment, so the next open starts from the same picture). `snapshot(t)` uses `'snap'` (the moment the clock is at). A **background
  renderer** (`o.background`, else `warm: false` and not a still: the host's idle prepare and the prebake tool) draws the base moment and
  never owns the clock.
- **The life is built inside the bake** (`_wfrBakeJob` step 0, `worldHostEnsureLife`). It runs in a hidden slice, so the scene is
  never ready without its people. The plan is made with the nav. Idle time builds it only if no bake did within 4 s.
- **Catch-up is capped** at `WORLD_HOST_SUBSTEPS` (8) ticks a live frame. The clock then waits for the life (`rec.stats.held`): the
  scene runs slower for a moment and never jumps. A pinned clock (tools) and sync frames run every tick (R4).
- **A real reset** (`worldHostResetLife(world)`) drops what the runner and the life systems keep on the world (`_wlfLife`, `sim`,
  `agents`, `runner`, the `_wsy*` slots, wind, particles, light, and appearance's `_wanWorlds` entry). The next driver then starts from
  the seed. `worldHostRewind`, a tool's pin to an earlier time and `worldFrameAt` going back all use it. Proof: after a reset, 50/50
  Manchester and 22/22 Fleet Pond agents are back at their base (before: 0/57 and 1/21).

## 2. Interface I1: `worldFramePlanAt(env, t)`

The planning half of a world frame. It returns `{ S, rec, world, cam, tau, L, aRecs, live, occl, movers, order, wet, lightsOn, ready,
capture, mem }`: the agents from `worldHostAt` and their draw records with the renderer's draw memory, the live statics (rocking
floaters rebuilt), the statics drawn on their own (I2), and the depth order. It draws nothing. `_wfrDraw` draws from it.

The draw memory (views, scale buckets, the LOD switch, dissolves) belongs to each renderer (`env.rid`, kept in `rec.frame.mems`). An
agent's memory outlives its last frame by `WORLD_FRAME_MEM_KEEP_S` (1 s). A still capture draws with a memory of its own.

## 3. Interpolation (interface I3) and opacity

- `_wh5Lerp` interpolates every presented scalar between two ticks. These are positions, the height (within one layer), `vx`, `vz`,
  `speed`, `alpha`, `alphaNoGhost`, `ghost` and `walkK`. Angles and phases (`heading`, `facing`, `phase`, `gaitPhase`) take the short
  way round. Discrete fields come from the nearer tick.
- The life steps at 15 Hz inside 30 Hz ticks, so what it alone sets would hold for one tick and then jump. `_wh5Steps` lays those
  scalars on a line through the last two **life steps**, late by `step - tick` (so the line always runs between two known steps). The
  life's discrete fields (`state`, `pose`, `clip`, `view`, `loco`, ...) switch halfway along that line. An agent new at a step comes up
  from opacity 0 over the step.
- **Ghost floor**: a figure at least `WORLD_FRAME_LOD_PX` device px tall is never more see-through than `WORLD_FRAME_GHOST_MIN` (0.85)
  from a ghost pass. Its fade in or out still applies (`alphaNoGhost`, made by the driver). Measured at Fleet Pond (30 s at 30 fps):
  visible figure-frames under 0.85 dropped from 1274 to 33; alpha steps over 0.04 a frame dropped from 354 (max 0.111) to 73 (max 0.056).

## 4. Lights by day, and lights that switch

- `worldFrameHookFilter(r, hooks, { lit })`: a light part (`lit`, `glow`, `lamp`, `lantern`, `beacon`) never draws from an animation
  hook while its light is off. An **electric lamp never flickers**; only a flame does (fire in the palette, or a torch, brazier,
  candle or stone lantern). So lamps are baked statics again, and their light comes from the light layer, gated by `worldGlowOn`. In
  Manchester at noon, 11 live lamps drew their halo and pool and pulsed; now 0 do (see the render, section 9).
- A live flame's light comes on and goes off over `WORLD_FRAME_LIGHT_FADE_S` (0.5 s, `_wfrLitK`).
- A relight that changes a chunk's lit windows keeps the old bitmap under the new one for 0.5 s. The lamp pools and halos (the light
  layers) cross-fade the same way (`S.lightsFade`).
- **Murk with hysteresis** (`worldMurky(sky, alt, was)`): murky at fog over 0.3, or overcast over 0.85 with the sun under 8 degrees.
  It clears only at fog under 0.24 and overcast under 0.8, or the sun over 9 degrees. The world's last murk is kept in
  `rec.frame.murky`, and `worldLights` takes the caller's `murky`.

## 5. Occluders (interface I2): every object drawn once

- `worldFrameOrder` slots a mover at least as late as any **earlier mover it overlaps**, not every earlier mover. Before, one walker
  slotted late pushed every nearer walker after the same chunks.
- **Statics drawn on their own** (`plan.occl`, order items `{ kind: 'static', ref }`, drawn once from `S.draw`). `_wfrPromote` puts
  probe figures on the standable nav cells and on the life's own agents at the base moment (the far crowd walks lanes beyond the nav).
  The frame's own order then says what would be redrawn over each probe. The most often hit go first, each **with** the nearer
  neighbours that would be redrawn over it once it is on its own (a group, or nothing). So taking one out never adds a redraw. Caps:
  64 statics, 12 prims, 1.2 frames of pixels.
- The redraws left (one frame, 30 fps, 20 s, Node): Manchester 55.8 → 4.9 a frame (29 statics on their own, the Town Hall facade
  among them); Fleet Pond 31.8 → 25.1 (39 on their own); Castlefield 37.6 → 32.6 (9 on their own). Never a long thing
  (a handrail, a fence, a coping, a terrain strip, a footprint over 2.5 m deep and narrower than that): one depth cannot order it against
  what stands beside it along its length, and drawn on its own the Fleet Pond boardwalk's handrails were cut into dashes by the grass.
- A redraw left over a mover is **masked to the mover's own pixels** when the static is soft (plants, trees, reeds, translucent parts)
  or carries a halo. The mover is drawn whole into a scratch, its opacity is laid on the scratch, and the statics are drawn over it with
  `source-atop`. A nearer lamp's halo is laid back on it, then the scratch goes on the frame once. An opaque static keeps the old
  rectangle clip: the picture is the same, and it is cheaper.

## 6. Re-bakes cross-fade

`adopt()` keeps the old bake when a scene on show is re-baked at the same size (a new light key, the season, a decoded image). The old
frame fades out over the new for `SCENE_SWAP_MS` (1 s). The old state is drawn live at the same t when frames are cheap (under 12 ms
median, so its people move with the new ones), else once and held. A resize instead makes the next loop frame draw whatever the frame
cap says (`forceNext`), so a cleared canvas is never shown.

## 7. The quality governor

A world scene is judged by the **real cadence** of its drawn frames (the loop's interval), not by dynamic CPU time. That time held
every chunk blit, so 6 ms of it took a steady 60 fps Manchester to level 4 in four seconds. It steps down while the median cadence
misses its target (the frame cap's interval, at least 60 Hz) by over a third **and** its own frames cost over 6 ms. It steps up after
10 s within 15 %. It **never thins people**; the old level-4 thinning (30 % of far agents popped out together) is gone, and the
fallback pass's index filter with it. Instead:
- level ≥ 1: the water refreshes at half rate (a third at level ≥ 3); posed shadows and mirrors are off;
- level ≥ 2: the whole-figure LOD threshold is ×1.5 (×2 at level 4), with the per-figure hysteresis below.

## 8. Smaller steps

- The whole-figure LOD switches below 12 and back above 16 device px (`WORLD_FRAME_LOD_LO/HI`, kept in the draw memory).
- Agents' **reflections and cast shadows use the posed figure** (`_wfrFigureInto`). They walk, and turn with the body's dissolve.
  This applies to the 6 largest figures at least 40 px tall, at governor level 0; the rest use their rest art.
- Rocking-floater bitmaps are kept per bake (`S.rock`), never on the plan's shared records.
- Warm-up uploads never go onto a canvas that is not playing. On a playing one, the next loop frame draws whatever the frame cap says.
- When the world's water regions cover every base water surface, the v2 water pass's per-frame ripple is not run for that bake
  (`S.stats.baseWaterOff`).
- A live record nobody drew for 10 minutes lets go of its bake products and draw memory. A record's kept bake products are capped at
  `WORLD_FRAME_CACHE_BYTES` (160 MB).

## 9. Measured (one-off runs, 14 Nov; never gates)

Scratch probes, run once each:
- `flk2.mjs`: the driver path at 30 fps, in Node.
- `live.mjs`: a live page in headless Chrome with the governor ON. It counts whole-frame A-B-A pixels at half resolution, pops and
  per-frame agent jumps, and calls `sceneHostRestartClock` halfway.
- `cost.mjs`: world frame ms with parts switched off.

| | Manchester centre 1, before → after | Fleet Pond 2, before → after |
|---|---|---|
| Life resets / clock steps back (live, 12 s) | 2 / 2 → 0 / 0 | 2 / 2 → 0 / 0 |
| Largest agent jump in one frame | 54.4 m → 0.83 m | 96.4 m → 2.1 m (fast birds at 13 fps) |
| Agent pops (opaque, in frame) | 25 → 4 | 7 → 1 |
| A-B-A pixels a frame (mean / max) | 1.7 / 35 → 1.5 / 28 | 140 / 671 → 148 / 631 (grass sway at 13 fps) |
| Live lamps drawing their light at noon | 11 → 0 | 0 → 0 |
| Redraws a frame (Node, 30 fps) | 55.8 → 4.9 | 31.8 → 25.1 |
| World frame ms (median, governor off) | 4.8–5.8 → 5.3–6.3 | 63–74 → 61–74 (software raster) |
| Light-key re-bake (noon → 19:40), warmth R−B of the screen | −19 → 22 within 0.57 s (one frame) → −8 at 0.66 s, 22 at 1.35 s | |

## 10. For the Phaser stage

- Call `worldFramePlanAt(env, t)` and draw its `order`. `'chunk'` draws a chunk bitmap and then its lights. `'agent'` draws a mover
  (pose plan, dissolve). `'static'` draws `S.draw.get(r.id)` once (a sprite with `M`, or a prim's bitmap `d.pc`). `'redraw'` is a static
  over the mover just drawn: crop it, or better, mask it to the mover.
- Pass `capture` or `background` on the env for frames that are not shown. Call `worldHostEnsureLife(rec)` before the first frame if
  your bake does not run `_wfrBakeJob`.
- Fade lit parts with `_wfrLitK`-style state, and cross-fade light layers (`S.lightsFade`, a chunk's `fade`).
