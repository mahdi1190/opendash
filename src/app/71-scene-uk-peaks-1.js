/* ============================================================
   COMPOSED SCENES, area "peaks": the view rows (one row = one item).
   _scPeaks.row(meta, params): meta holds the item's identity (the id without the
   county, label, place, town, view, reason, kind, tags); params are the archetype's
   (71-scene-uk-peaks-0.js). The first four rows REBUILD the hand-drawn Peak views of
   the uk-north-west pack with the same ids, place, view and caption fields.
   ============================================================ */
(function () {
  if (typeof _scPeaks !== 'object') return;
  const row = _scPeaks.row;

  /* ---------- Stanage Edge (rebuilt: wide and close-evening; new: High Neb, the Plantation boulders) ---------- */
  row({ id: 'stanage-edge', label: 'Stanage Edge', place: 'stanage-edge', town: 'Castleton', view: 'wide', reason: 'Gritstone ledges above the moor', kind: 'landscape', tags: ['gritstone', 'moorland', 'millstones'] },
    { id: 'stanage-edge', lat: 53.347, lon: -1.632, heading: 40, horizon: 450, at: 'afternoon', land: 'moor', seed: 510,
      sig: [{ obj: 'landmark.stanage-edge', x: 760, y: 606, s: 1.22, layer: 'mid' }],
      avoidMid: [{ rect: [-100, 470, 1700, 600] }], nNear: 130,
      farms: [[90, 618, 0.55, 0, 'mid'], [1520, 622, 0.5, 2, 'mid'], [1340, 640, 0.45, 1, 'mid']],
      walk: [[-60, 700], [500, 668], [900, 652], [1660, 680]], walkers: 4, sheep: 6,
      extra: { place: [
        { obj: 'rock.millstone', x: 520, y: 640, s: 0.5, layer: 'near', variant: 0, seed: 201 },
        { obj: 'rock.millstone', x: 980, y: 650, s: 0.55, layer: 'near', variant: 1, seed: 202 },
        { obj: 'rock.millstone', x: 1210, y: 806, s: 1.1, layer: 'fore', variant: 2, seed: 203 },
      ] } });
})();
