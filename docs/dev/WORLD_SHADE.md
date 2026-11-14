# World scenes: continuous shading (14 Nov 2026)

How a world-engine (v3) scene keeps its shading continuous on screen: the lamp light and haze on movers, the drawn sway of plants, the sun
tone of faces drawn every frame. It follows `docs/dev/WORLD_FLICKER.md` (read it first) and closes the steps that page left open. Both
players of a world scene (the Canvas2D compositor in `79-world-5frame.js` and the Phaser stage in `79-world-7stage-*.js`) draw the same
pose plans and ask for the same sprites, so everything here works on both with no change in their draw code.

Files: `79-world-5shade.js` (new: the shade of a mover), `79-world-5frame.js` (`_wfrSpriteOf` and `_wfrPosePlan` only),
`79-world-4light.js` (`worldLocalLight`), `79-world-4material.js` (`worldMaterialKey`), `79-world-6wind.js` (the drawn sway),
`79-world-4suntone.js` (`worldSunTone`).

## 1. The sprite raster key, and why movers stepped

A mover's colours come from MATERIALS and are rasterised once into sprites kept in the shared cache (`sceneSprites`, 78-scene-canvas.js).
What feeds the key: `_wfrSpriteOf` (5frame) asks `_wfrSprite` (5frame) for the sprite of a part at a scale bucket with a material context;
the key holds `worldMaterialKey(mctx)` (4material), the light band, the scale, the glow flag and the outfit. Two inputs of the context
change as a mover walks:

- the **lamp light at its feet**, `worldLocalLight(pools, x, z)` (4light): rounded to 0.1, capped at 0.6;
- the **haze of its depth**, `worldMaterialFor` (4material): keyed in steps of 0.1 (`'h' + q(haze, 10)`), and the colour memo kept
  whatever exact haze came first in a step.

Measured before (Manchester centre 1, a January night, the canvas player, one walker drawn alone every frame at 30 fps for 20 s and its
opaque pixels averaged): the walker passed a lamp and changed colour in four steps of 13.6 to 18.5 levels (of 255), at lamp light
0.05, 0.15, 0.25 and 0.35, against a frame-to-frame noise of about 2 levels from its own gait.

## 2. Lamp light: the blend of the two neighbouring steps (interface C4)

The cache keeps its steps of 0.1 (seven rasters a part at most, shared by every walker). The mover is drawn as the **blend** of the two
steps its light lies between:

- `worldShadeLight(S, r, tau)` (5shade) works out the continuous light `kc` (`worldLocalLight(...).kc`, the sum before its rounding),
  the nearer step `kb`, the farther step `ko` and the share `w` (0 to 0.5) of the farther one. It is kept on the mover's draw memory
  for the frame (`h._shNow`).
- `_wfrPosePlan` (5frame) passes its plan through `_wshBlend`: when `w >= WORLD_SHADE_MIN_W` (0.03), every blit is followed by a
  **blend blit**: the same part at the same matrix, its part prefixed `WORLD_SHADE_BLEND` (`'~:'`), its alpha `a x w`.
- `_wfrSpriteOf` reads the prefix: a blend blit gets the sprite of the farther step, every other blit the nearer step's
  (`_wshMcOf`). Both players call `_wfrSpriteOf(env, S, r, b.part, x)` and blit at `alpha x b.a`, so neither changes.
- Order: a part, then its blend, then the next part. Each part is the blend of its own two steps and a nearer limb still covers the body.
- The nearer step is the base and the farther is laid over at `w <= 0.5`: the colour is exactly `(1 - w) near + w far`. Two over-blends
  of an anti-aliased edge cover a little more than one; with this rule the extra cover rises and falls smoothly with `w` and is the same
  on both sides of each midpoint, so nothing switches at a step or at a midpoint.
- A translucent figure (a ghost pass, a fade) is drawn whole into a scratch first (5frame `_wfrDrawMover`, the stage's figure atlas), so
  its blend is made opaque and then laid at the figure's alpha.
- **A change of the lit set** (lamps coming on at dusk, any relight: `S.localLights` is planned again) fades the light on movers from
  the old pools to the new over `WORLD_SHADE_FADE_S` (1 s), as the pools and halos themselves cross-fade (`S.lightsFade`). The set is
  tracked on every pose plan (`_wshLitSet`), also while no pool is lit, so the first lamps of the evening fade in on the walkers under
  them (one-off check: a walker at a lamp's foot goes 0, 0.086, 0.275, 0.55 at 0, 0.25, 0.5 and 1.1 s after the lamp comes on).
- **A vehicle's lamps and lit windows** (the players draw its `litGlow` sprites when the light has windows on or is darker than 0.5)
  switched with one relight's reading, every vehicle at once. When that reading changes inside a bake, the state before the switch is
  laid over the new one for `WORLD_SHADE_FADE_S` (blits prefixed `WORLD_SHADE_GLOW`, `'~g:'`: `_wfrSpriteOf` draws them with
  `litGlow` inverted). A switch that comes with a new light key is a re-bake, which the canvas player already cross-fades whole.
- Movers without a draw memory (the tools' `worldFrameFigures`, a still capture) and statics are never blended.

Measured after (same walker, same frames): the largest change between two frames went from 18.5 to 6.0 levels, frames changing by more
than 6 levels from 4 to 0; through the old step at light 0.25 the red channel now climbs 78, 79, 81, 82, 82, 82, 83, 84 where it jumped
74 to 92. Cost (Manchester night): about 8 of 62 movers are blended in a frame, about 25 extra blits on some 250; the canvas player's
frame CPU median 8.1 ms before and 7.4 ms after (noise), the stage 9.6 and 10.3 ms (SwiftShader, noise); the sprite cache 593 to 666
entries (9.0 to 9.2 MB) over the run, the stage's textures 287 to 322 (39 MB both). By day nothing is blended.

## 3. Haze: a finer key for movers

A mover's context carries `hazeQ: 100`: its haze is keyed in steps of 0.01 (`'H' + q(haze, 100) + '/100'` in `worldMaterialKey`) and its
colour is the haze OF its step (the context's haze is set to the step, so two movers in one step are one sprite and a step is the same
change wherever it falls). A step is 1 % of the way to the haze colour: under 2 levels of 255 for a red coat against the usual haze
(the old step was up to 17). A walker crosses a step every 11 m in mist, 50 m in city air and 130 m in clear air, less often than its scale bucket changes (every
fifth of its distance), so its sprites are drawn again little more often than before (the Pier Head over 40 s: 768 to 806 cache
entries); statics keep their steps of 0.1 (they never move: no step is ever seen). In the
promoted scenes the walkers stand near enough that their haze barely moves (0.005 to 0.013 over 20 s at Fleet Pond and the Pier
Head); the steps showed on far movers and in misty air.

## 4. Drawn sway: one function, no jumps (79-world-6wind.js)

Every sway a frame draws goes through `_wwdPose(r, h, tau, L)` (called by `_wfrPosePlan` for statics; anything else falls back to
`sceneAnimPose`). It draws the library's sway (`deg x k x sceneWind(t, x, L)`), a tall plant's swing slowed to its height, and two causes
of a jump taken out:

- **Tall plants** (`_wwdDrawnWind`): a plant over `WORLD_WIND_TALL_M` (4 m) swings at `sqrt(4 / h)` of the library's speed (the world
  wind's natural-frequency law; never under 0.4), and the gust fronts keep the scene's timing. A big near tree swung its crown at the
  speed of a reed, and its 1 px twigs crossed the lit panes behind it a pixel a frame: Mediacity at night, a bare tree in front of lit
  glass, made 2,294 A-B-A pixels in 2 s; after, 113 (Stevenson Square's tree at noon 58 to 0). Plants up to 4 m are unchanged.

- **The light's wind** (`L.wind`, the weather's wind read again at each relight) multiplied every plant's swing at once: a new reading
  moved every swaying plant in one frame. It is now eased from the old strength to the new over `WORLD_WIND_EASE_S` (3 s), per record.
- **A reed being walked or swum through**: appearance's `worldAnimHooks` swaps its `sway` hook for a held `turn` of
  `deg x 6 x dir x amp` while the parting's amp is over 0.05, and back to the sway below it. The two angles differ, so the reed jumped
  at both ends. The parting is now laid **over** the sway it stands in for (the object's own sway hook, `_wwdSwayHookOf`), its share
  eased in from amp 0.05 to 0.2: at the switch it adds nothing either way.

One-off check (a sedge's 'tips' hook, Node, 30 fps): through the parting handover the largest change of angle between two frames went
from 1.24 degrees (the jump at amp 0.05) to 0.14; a wind reading going from 1 to 1.6 moved the plant 0.33 degrees in the frame of the
change (its normal motion is under 0.21 a frame), 0.08 after.

The two wind fields: the drawn sway is the library's field (`sceneWind`); the world field (`worldWind`: gust fronts that travel downwind)
moves the water's ripples and the particles, and the `wind` system's `ent.sway` (read by the tools and the invariants, never drawn).
Neither switches. Driving the drawn sway from the world field (plants leaning downwind with the gusts the water shows) changes how
every plant in every scene moves, so it is left as a decision (open issue below), not done here.

## 5. Sun tone in fine steps (79-world-4suntone.js)

`worldSunTone(hex, n, sun)` lights a face by its normal. It keyed the face's light in twelfths and memoised whatever exact value came first.
Registered models (boats, the hulls drawn in perspective) are drawn every frame with their normals, so a hull that turned or rocked
brightened in steps of up to 7 %, and two faces in one twelfth took the colour of whichever was drawn first. It is now keyed in
`WORLD_SUNTONE_STEPS` (96) and the colour is the one of its step (under 1 % of brightness a step). Generated buildings, baked once,
shift by under half an old step toward their exact tone.

## 6. The flicker audit of the promoted scenes (14 Nov)

One-off A-B-A probe (`tools/stage.mjs flicker`'s rule: a pixel that changes by more than 40 and is back within 12 one or two frames
later), the canvas player, 800 x 450, 2 s at 30 fps from scene time 2, all 32 scenes of the OPENING table at summer noon and the 20 city
scenes at night (52 runs, each before and after this work). Each A-B-A pixel is also classed by where it is: in an agent's box (padded
3 px), in a live static's box, or in the rest of the scenery. A scratch script kept a strip of six frames around the hottest cell, and
one around the hottest cell outside the agents.

Over the 52 runs: 200,655 A-B-A pixels in agents' boxes, 2,810 in live statics, 933 in the rest of the scenery.

| Rank | Scene, date | A-B-A in 2 s | What flickers (the strip around the hot cell) |
| --- | --- | --- | --- |
| 1 | Manchester centre 4, night and noon | 79,877 / 43,131 | A bus pulling past the shelter: its window bars (2 px) move 11 px a frame. True motion, steady. |
| 2 | Winter Garden, noon | 13,377 | The tram behind the kiosk (window bars), walkers' legs. Motion. |
| 3 | Whitby harbour, noon | 12,126 | A crowd walking on the quay: legs. Motion. |
| 4 | Manchester centre 3, night | 10,333 | The lit tram behind the shelter: interior bars. Motion. |
| 5 | Mediacity piazza, night | 7,483 (5,277 now) | The tram arriving (its side drawn in perspective, 1 px mullions, about a pixel a frame); a bare tree's twigs over lit glass: 2,294, now 113 (section 4). |
| 6 | Fleet Pond 2, noon | 3,274 | The far train behind the trees and its reflection (718 outside the agents' boxes: the reflection); legs on the boardwalk. |

The lamp blend does not add flicker: per scene the counts move by a few per cent either way (colours on movers under lamps change, so
legs cross the probe's threshold of 40 differently); Whitby at night went 1,918 to 2,307 in walkers' legs, while its walker passing the
lamps went from a largest frame-to-frame change of 7.2 levels (three over 6) to 5.2 (none). The stage player's probe of Manchester centre
1 at night is unchanged (35 A-B-A pixels before and after). Scenery outside the movers is quiet in every scene (0 to 104 pixels in 2 s)
except Fleet Pond's reflected train.

## Open issues

- The drawn sway is the library's field with the plant's own height timing; it is not driven by the world wind field's gusts and
  direction (section 4). That changes every plant's motion: the owner's decision.
- The water mirror of a walker that is not among the posed six (5frame `_wfrMirrorAgents`, the stage's 3fx mirror) is drawn from its
  rest sprite at the nearer lamp step only (`_wfrSpriteOf(..., '*')`), so a reflection under a lamp still changes by half a step at the
  midpoints. The fix is in those draw functions (a second blit `WORLD_SHADE_BLEND + '*'` at `r.mem._shNow.w`).
- A vehicle's lamps across a night switch that comes with a new light key (a re-bake): the canvas player cross-fades the whole frame,
  the stage switches movers to the new bake at once (its open issue). The umbrellas of the rain flag switch in one frame (5frame
  `_wfrRec`'s wardrobe).
- A moored boat's `bob` and `paddle` (rock) hooks swap at |rock| 0.05 in appearance's `worldAnimHooks` (79-world-6anim.js), the same
  kind of handover as the reeds; the bob's own phase is not in the hook that replaces it, so `_wwdPose` cannot lay one over the other.
  Not seen in the audit (no wakes in 2 s).
- Two over-blends of an anti-aliased edge cover up to an eighth more than one (at w = 0.5): a blended mover's outline is a touch
  bolder, smoothly. A 'lighter' mix in a scratch would be exact, at the cost of a scratch per blended mover.
