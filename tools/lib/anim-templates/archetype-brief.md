# Brief: build the `{{archetype}}` archetype ({{what}})

An ARCHETYPE is one scene type instantiated many times with different parameters: one `station` archetype becomes a scene for every
station of a table, one `skyline-water` serves Singapore, New York and Sydney (docs/dev/SCENE_ENGINE.md sections 8.1, 8.2 and 8.5).
This brief is your whole task; read all of it first.

{{notes}}

## 1. What to build

- `src/app/70-scene-arch-{{archetype}}.js`: `sceneArchetypeDefine('{{archetype}}', { params, kits, slots, meta, build })`.
  `build(p, u)` is PURE and its seeds come from `u.hash(p.id)`. It names ROLES, never object ids (except its signature slot):
  `u.kit('tree')`, `u.kit('building-far')` ... so every new kit object reaches every scene built from it.
- The archetype's index entry is already there (hints: {{hints}}); default kits: {{kits}}.
- Every scene it builds must reach the bar (section 2) with ANY sensible row: test it with synthetic rows, not only the real ones.

## 2. The bar

{{bar}}

## 3. Data tables and batches

A table (`sceneTableDefine`) holds one row per scene: about 150 bytes a row (id, name, lat, lon, lists split by `|`, enums).
`sceneBatch('{{archetype}}', '<table>')` makes one registry item per row; each scene is built only when it is shown or linted.

## 4. Signs and the legal note

{{legal}}

## 5. Verify

```bash
{{verify}}
```

The batch summary must say pass for every row, the perf of the sample must meet the budget, and the contact sheet must show
clearly different scenes (era, colours, surroundings), not one picture with a different name. Report the summary table.
