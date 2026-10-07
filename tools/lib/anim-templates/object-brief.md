# Brief: add objects to the `{{kit}}` kit of the scene library

The scene library (docs/dev/SCENE_ENGINE.md section 2) holds every object once: variants, four seasons, animation hooks, night lights.
Scenes place them by kit and role, so an object you add here reaches every scene of the `{{kit}}` kit. This brief is your whole task;
read all of it first.

{{notes}}

## 1. What the kit has, and what to add

The kit today:

{{objects}}

Roles (exactly one per object): {{roles}}.

## 2. The object rules (section 2.6; the lint enforces them)

- Object-local units, the anchor at 0, 0 where it touches the ground, drawing upward. `size` is its natural width and height.
- Variants that genuinely differ (shape, not only colour); four seasons where nature or clothing changes (`palette` per season, or
  `shapeBySeason`); one look all year otherwise (`seasonal: false`).
- Hooks (sway, bob, flap, walk, paddle, turn, flicker, spin) move ONE part with one transform: name the parts, set the pivots inside the box.
- Buildings and vehicles: at least 4 glow shapes (windows lit at real dusk) unless tagged unlit; a `lit` part for floodlights.
- People: tiny anonymous silhouettes (tag silhouette, at most 60 shapes, no faces). No flags, emblems, holy figures or brands.
- Street, rail and building objects never contain a ring with a bar across it (the TfL roundel).
- At most 600 shapes and 60 KB of path data per variant; deterministic (draw with the `rnd` you are given).
- Tags: at least one kit tag (`kit:{{kit}}`) and exactly one role tag.

## 3. Steps

```bash
{{verify}}
```

Look at every sheet: the variants differ, the seasons differ, the night column is graded and the windows light. Report the lint
lines and the sheet paths.
