# The world stage: world scenes on the garden's engine

World engine (v3) scenes are drawn by Phaser 4.2.1 (WebGL), the engine the garden uses, behind the renderer
surface the scene host already uses. The opening, the cine overlays, the gallery stage and the Home card get
it with no change to their markup or timing. The canvas renderer stays as the baker and the fallback.

Files: `src/app/79-world-7stage-0core.js` (life cycle), `-1layers.js` (static layers, texture slots,
cross-fades, the frame), `-2movers.js` (the plan, the depth order, pooled images, the figure atlas, the
occluder redraws) and `-3fx.js` (water, mirrors, glints, rings, agent shadows, lamps, the weather overlay).
The host side is `_schStage` in `src/app/78-scene-host.js`. The opening starts the engine's parse in
`src/app/78-anim-wire.js`. The CSS is in `src/styles/76-scenes.css` (`.sc-stage`, `.sc-staged`). The tools
are `tools/stage.mjs`, and `tools/lib/scene-page.mjs` takes `renderer: 'stage'`.

## 1. Which hosts get the stage

`worldStageWanted(el, item, data)` decides. A host gets the stage when all of these hold:

- the derived data is a world's (`data.world3`, its live record has the compositor);
- the host is live (`is-live`), not a still, not hover-only;
- the host is at least 360 x 200 css px (tiles keep the canvas renderer);
- the garden's own game is not running (`GardenNative.active()`);
- WebGL has not already failed on this page;
- the stage is not switched off (`?stage=0` in the address, `window.__sceneStageOff`).

A tool page asks for the stage with `window.__sceneOpts.renderer === 'stage'`. Any other renderer
keeps tool pages as they were.

## 2. One bake, two players

`worldStageCreate(el, canvas, data, o)` returns the renderer surface: `start`, `stop`, `running`,
`ready`, `baked`, `baking`, `waiting`, `bakeIdle(w, h, {eager})`, `resize`, `setLight`, `setSeason`,
`setLod`, `frame(t)`, `snapshot(t)`, `attach`, `stats`, `resetStats`, `destroy`, `env`, `compiled`,
`geometry` and `exportBake`. It also adds `engine` ('phaser' or 'canvas'), `stage` (its own state),
`baker` and `fallBack(why)` for tools.

- **The baker.** The canvas renderer (`sceneRendererCreate`) runs on a detached canvas with the host's
  options. It bakes as always: sky, clouds and ground groups, plus the world compositor's chunks, water,
  walls, shadows and lights in `env._wfr`. While the stage plays, the baker never runs its loop. Its own
  frames (the warm-up, the frame after a bake) draw into one shared 1 x 1 context (`o.layers`), so its
  sprites are still made and its clock rules still hold.
- **The fallback.** When the stage cannot play, the same baker is attached to the host's canvas
  (`attach`) and plays there, with no second bake. The causes are:
  - the engine is missing, or it does not boot within 6 s;
  - no WebGL. A software context counts as none in the app (`failIfMajorPerformanceCaveat`). WebGL is probed once
    before the engine is even parsed (`_wsgGlProbe`), because Phaser's own boot error escapes every caller;
  - the context is lost;
  - the garden's game opens;
  - the stage is not ready 1.5 s after the baker;
  - a newer stage evicts it (at most `WORLD_STAGE_MAX` = 2 games at once);
  - a frame throws.

  `stats().stage.why` says which. The host's `sc-ready` comes from whichever player is ready.
- **No persistent cache.** The baker gets no `cache`. Its kept still is captured by a frame at t = 0 that
  steps the world's clock back (the clock-restart finding). Once that capture no longer moves the clock,
  passing `cache: ref` brings back the kept still on reload.

## 3. One game, one clock, ready

There is one `Phaser.Game` per stage:

- type WEBGL, on its own canvas `canvas.sc-canvas.sc-stage` inside the host. The host's original canvas is
  hidden under `.sc-staged` and stays empty;
- sized in device px from the baker's geometry. Phaser 4.2.1 has no resolution option, so CSS sizes the
  box;
- no banner, input or audio; `powerPreference` 'default'; `fps.limit` = the host's `maxFps`;
- `maxTextures: 1`. Phaser 4.2.1's multi-texture shader chooses a sampler by exact float equality on an
  interpolated varying (`outTexDatum == float(INDEX)`, else transparent). Wherever interpolation is off by a
  rounding error, the fragments of every texture but the batch's first vanish: rectangles of leaves went
  missing from a tree under SwiftShader. One texture per batch costs a draw call per texture change and
  compiles one shader.

The scene time is the host's (`o.time`, which is `_schTime`), never Phaser's. `frame(t)` draws t at once
(`game.step` with the time forced), and `snapshot(t)` reads the drawing buffer right after. When the stage
is stopped, its loop sleeps. Destroy completes even while the loop sleeps: Phaser 4.2.1 defers `destroy`
to the next step, so `_wsgDispose` follows the garden's `disposeGame`.

**Ready** means all of these, after which `o.onReady` fires and the host adds `sc-ready`:

1. the baker is ready;
2. every static texture of the bake is uploaded, in slices of 6 ms a frame;
3. the world's life driver exists (waited for at most 3 s);
4. two hidden warm frames have run (the canvas stays hidden until `sc-ready`), plus the batch shader
   suite (`_wsgShaders`, the garden's technique);
5. one real frame has been drawn.

When the likely next opening (`animOpeningPeek`, from the place known before) is a world scene, the opening
starts `FreefloGameEngine.load()` as the splash holds (`worldStagePreload`), so Phaser is parsed during the
brand and the location wait. Any other opening never loads the engine. A world scene chosen after all loads it
with its bake (the bake takes longer than the parse).

## 4. The frame

The frame is drawn from the world's own plan. `worldFramePlanAt(env, t)` is the planning half of
`_wfrDraw`, owned by the flicker builder. Until it is merged, `_wsgPlanCopy` (one function, delete after
the merge) stands in. Depths, in drawing order:

| depth | what |
|---|---|
| 0 / 1 / 2 | sky, stars (Graphics, three twinkle groups), clouds (`sceneCloudX`) |
| 10 + g | ground group g; its wind strips (a shear: a container pair); g + 0.2: the v2 base water (§5) |
| 900 | the weather's rings and the fog banks (v2 frameGroup passes): a Canvas 2D overlay at most 15 Hz, only while it draws |
| 1000-1013 | ground marks, water, falls, water rings, decks (baked once), the walls' image, channel walls with the low decks cut out, the static shadow, agent shadows, night path key (screen), lamp pools (add), beams (add) |
| 2000 + i | the world's depth order, item i: chunks (+0.1 glass, +0.2 halos, add), movers, redraws, 'static' items (I2) |
| 1e7+ | particles, rain, snow (Graphics), the fog veil, the v2 framePost passes (an overlay at most 15 Hz) |

- **Textures.** Every bitmap of a bake is uploaded once with `textures.addImage` (never a CanvasTexture
  for a big bitmap), keyed by the canvas itself. Mover sprites are uploaded at first use and let go after
  20 s unused. A canvas that changes in place (a rocking boat's bitmap, a hull drawn now) is uploaded
  again when its stamp changes.
- **Slots and cross-fades.** Each static place ('sky', 'g0', 'ch3', 'pools' ...) shows one texture. When
  its bitmap changes, the new one fades in over `WORLD_STAGE_FADE_S` (0.9 s); an additive layer fades the
  old one out at the same time. A place that goes away fades out. A re-bake (light key, season) is shown
  only once ALL its bitmaps are uploaded, and until then the frame keeps planning and drawing from the
  shown bake. A relit chunk (windows coming on) fades on its own. A new size switches at once, because
  nothing of the old bake fits.
- **Movers.** A mover's pose-plan blits (`_wfrPosePlan`, each a sprite with a 2 x 3 matrix) become pooled
  images. A matrix without a shear is one image (position, rotation, scale; a negative scale flips). A
  matrix with a shear is a container pair, from its closed-form SVD R S R.
- **The figure atlas** (`_wsgFigures`). Every person, animal and boat sprite is drawn ONCE a frame,
  whole, into its own rectangle of a 1024 (or 2048) render texture, at its own sub-pixel place:
  - a view change is a true dissolve: the old view whole, faded by 1 - k with an erase, plus the new view
    whole times k, added from a second texture;
  - a floater is cut below its waterline by an erased polygon;
  - the body is then one image at the figure's opacity, so a ghosting walker no longer shows its limbs
    through its body;
  - its mirror and its shadow come from the same posed drawing.

  Figures over 480 px are drawn straight.
- **Occluder redraws** are the static's own pixels cropped to the mover's box (`setCrop`), with no clip and
  no second blending:
  - a drawn piece from its 1:1 cache (`_wfrPrimCache`);
  - a sprite with the box mapped back into its texture;
  - its lit glass from the static's own small lit bitmap (`_wsgGlass`).

  A 'static' order item (I2) is drawn once, whole.

## 5. Water, mirrors, shadows, lamps

- **World water**, per region, is a render texture:
  1. the baked surface;
  2. the baked reflection in bands of two rows, each shifted by `worldWaterRipple` at the frame's scene
     time (frame rate; the canvas refreshes at 15 Hz);
  3. the agents' mirror and the glints, drawn into a second texture first and erased outside the outline
     (5frame clips them to `R.clips`);
  4. then everything under what lies over the water erased (`S.wet.over`, EVEN-ODD as `_wfrHoleClip`).

  The surface itself is never clipped to the outline (the canvas path does not clip it either).
- **Mirror.** The atlas drawing is flipped about the contact row: only its rows that mirror below it, at
  the kind's mirror strength times the figure's opacity. A hull is mirrored from its bitmap of the frame.
- **v2 base water** (78-scene-water.js frameGroup 20, where the world's water does not reach: the near
  shore) is its reflection in its own bands (`_scwaShift`) and its glints, kept where its mask is: an
  erase with the INVERSE mask is the pass's `destination-in`, exactly.
- **Agent shadows** (sun up). `worldShadowPlan` runs per frame. Each figure's atlas drawing is a silhouette
  (tint FILL, `#14202e`) through `sceneShadowMatrix`, a shear done as a container pair. That gives a
  walking shadow, an improvement on the canvas's rest sprite. Polygons are Graphics. Then the wet area is
  erased (even-odd), and the result is shown only over the shadows' box.
- **Lamps.** A live lamp's halo and a carried light use one shared radial texture (profile 1, .42, .12, 0 at
  0, .18, .45, 1) tinted and added. A beam uses a shared gradient triangle mapped onto its three points.
- **Rings, wakes, floating leaves** are Graphics, unclipped, as the canvas draws them.
- **Weather.** The v2 frame passes the stage does not draw natively (rings, fog banks, rain and snow
  streaks, lightning) and the falls use their own Canvas 2D code, drawn into a frame overlay refreshed at
  most 15 times a second and uploaded only while it draws something.

## 6. Pitfalls found (Phaser 4.2.1)

- `maxTextures` > 1 drops fragments: see §3.
- `DynamicTexture.erase('key')` and `draw('key')` stamp the texture CENTRED (origin 0.5). Erase with an
  Image object at origin 0 (`_wsgMaskImg`).
- A render texture's `draw(gameObject)` keeps the OBJECT, not its state, until `render()`. Use one object
  per draw per frame (`_wsgOff*`). `stamp(key, frame, x, y, config)` keeps its state (rotation, scale,
  origin, alpha, blend), so prefer it.
- `DynamicTexture` is a Texture (`add`, `has`, `get` frames). A frame is moved each frame with
  `setSize(w, h, x, y)`.
- `game.destroy()` waits for the next step: see §3.

## 7. Tools

- `node tools/stage.mjs render <ref> --dir=D --dates=summer,autumn,night [--t=4]` writes
  `<id>-<date>-{canvas,stage,pair,diff}.png` and the mean difference. It pins the world at scene time t,
  then reads the stage's own pixels and its baker's Canvas 2D frame of the SAME moment in the same page.
  Rewinding a world does not rewind its life (`_wlfSysInit` returns early), so two pages differ by where
  people stand. `--pages` gives a page per player.
- `node tools/stage.mjs perf <ref> [--date] [--seconds=10]` reports, per player, the load timeline to
  sc-ready and the per-frame CPU (the stage's update vs the canvas renderer's draw).
- `node tools/stage.mjs flicker <ref> [--seconds=3] [--fps=30] [--player=stage|canvas]` counts pixels that
  change and change back within 3 frames (one-off).
- `tools/lib/world/capture.mjs` names frames by time in ms, so sub-second frames no longer overwrite each
  other.
- Debug: `window.__worldStages()` (every stage's phase, why, timings, uploads, textures) and
  `__sceneStats()[i].stage` / `.engine`.

## 8. Measured (once, 14 Nov 2026)

Measured with `tools/stage.mjs perf` on a 4-core Xeon in headless Chrome, at 1600 x 900 with dpr 1. The canvas
used software raster and the stage used SwiftShader (software WebGL).

| scene | sc-ready canvas | sc-ready stage | stage after its baker | frame CPU canvas (median / p95) | frame CPU stage (median / p95) |
|---|---|---|---|---|---|
| Manchester centre 1, summer noon | 2234 ms | 2719 ms | +174 ms | 5.0 / 8.6 ms | 9.6 / 14.8 ms |
| Fleet Pond 2, summer noon | 2618 ms | 3423 ms | +301 ms | 73.7 / 92.7 ms | 9.4 / 15.1 ms |

Notes on these numbers:

- The canvas figure is its draw call recording. The 2D raster is deferred to presentation and not counted
  (see `scenePerf`'s flush).
- Under SwiftShader the stage's own update is mostly the main thread waiting on the GL command buffer. A
  profile shows 94 % "(program)" and a few ms of the stage's JS over 53 frames, because a software rasteriser
  fills every blended layer on the CPU. Its frame rate there is 3.5-6.9 fps against 11.4-49 for the canvas.
  On a real GPU those fills are cheap. Software GL is exactly what the app refuses (§2).
- The engine's parse took 165-233 ms.
- The bake in the stage page ran 300-500 ms longer than alone: the game boot and the parse share the main
  thread. The preload in §3 moves the parse out of the bake.
- Textures: 33 MB (Manchester) and 81 MB (Fleet Pond). Uploads: 116-206 ms in total, longest slice 11.7-25 ms
  (one big chunk).
- A light change while playing (Manchester, noon to dusk) cross-fades 21 slots. Mean luminance went 132.9
  before, 111.6 at 0.77 s, then 101.7 from 1.4 s on. The longest upload slice was 9.3 ms.
- Flicker probe (`stage.mjs flicker`, Manchester noon, 2 s at 30 fps, 800 x 450): A-B-A pixels per frame were
  median 1 and max 45 for the stage, against median 1 and max 31 for the canvas. Both have the same hot cell,
  the swaying planter grass (thin rotated blades); the stage adds no hot spot of its own.
- Same-moment renders (stage vs its baker), mean difference per channel:
  - Manchester centre 1: 0.12 (summer noon), 0.17 (night);
  - Fleet Pond 2: 0.2 (autumn), 0.2 (night);
  - Castlefield Basin: 0.16 (summer), 0.25 (night).

## 9. Known differences from the canvas path

- **Lamp halos.** A live lamp shows its halo; the canvas path draws it off its lamp: `_wfrDraw` calls
  `worldDrawLights` for a mover's own lamps with the last blit's transform still set.
- **Agent shadows** walk (posed silhouettes).
- **Water ripple** moves at frame rate, not in 15 Hz steps.
- **Glints** have square ends (Phaser lines have no round caps).
- **Translucent figures** are drawn whole, never part by part.
- **Shadow holes.** A shadow polygon's own holes (`holesScr`) are not cut (only the water is).
- **Figures over 480 px.** Their mirror is not drawn.
