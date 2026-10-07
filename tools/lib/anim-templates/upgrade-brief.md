# Brief: upgrade {{count}} hand-drawn {{region_name}} scene{{count_s}} to the new standard (archetype {{archetype}}, batch {{batch}} of {{batches}})

You are upgrading hand-drawn region scenes of OpenDash to COMPOSED scenes (docs/dev/SCENE_ENGINE.md section 16). The old art is
the LEGACY tier: it follows its own floors but looks thin next to the bar. Each scene keeps its identity (id, key, place fields,
label, site, tags, when: pins and rotation keep working) and is recomposed around its landmark from the `{{archetype}}` archetype,
filled from the region's kits. This brief is your whole task; read all of it first.

{{notes}}

## 1. Your scenes

| # | ref | key | label | tier |
| --- | --- | --- | --- | --- |
{{refs}}

For each one you own exactly two new files, which `scene upgrade` writes: the landmark `src/app/70-scene-lib-landmark-<slug>.js` and
the upgrade `src/app/71-scene-upgrade-{{region_id}}-<slug>.js`. Touch nothing else: never the hand-drawn scene files, not the
engine, not `tools/`, `tests/` or `docs/`. Do not commit, push or `git add`. The git remote is PUBLIC: no personal data anywhere.

## 2. The bar

{{bar}}

## 3. Steps, per scene

1. Find the landmark: `node tools/anim-pack.mjs scene upgrade <ref>` lists the largest shape clusters of the old art with their boxes.
2. Scaffold: `node tools/anim-pack.mjs scene upgrade <ref> --box x0,y0,x1,y1` extracts the landmark, suggests the archetype
   (`{{archetype}}`; `basic` while it is not built) and writes the DRAFT upgrade (state: 'draft': the app keeps the old art).
3. REFINE the landmark (the checklist in its file header): the real structure, be factual; window grids or tiers; edge highlights and
   shaded sides from one light direction; the lit part (floodlights, crown lights); snow on roofs in winter where it snows; at least 80
   shapes. Check: `node tools/anim-pack.mjs object lint landmark.<slug>` and `node tools/anim-pack.mjs object sheet landmark.<slug> --mode night`.
4. Compose around it: the archetype's params (kits, water, horizon, density, palette lifted from the old art) and your own touches in
   the patch (place, scatter, actors): the scene's other sights, its local planting, its boats and birds.
5. Compare old and new and lint, until GOLD:

```bash
{{verify}}
```

6. Set `state: 'live'` ONLY when the lint prints GOLD and you have LOOKED at the compare sheet in light and night.

## 4. Care

{{care}}

## 5. Report

Per scene: GOLD or not (the last lint line), the bar and perf numbers, the compare sheet paths, what you refined on the landmark,
and anything you think is wrong elsewhere (under OTHER FILES I THINK ARE WRONG).
