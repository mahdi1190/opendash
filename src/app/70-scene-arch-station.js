/* ============================================================
   ARCHETYPE station (docs/dev/SCENE_ENGINE.md 8.1, 8.3, 8.4, section 11): a London rail station, built
   as `basic` plus the station. PURE.
   params: id, name (the sign), lines (line ids: colour bars only, never words), lat, lon, era, features.
   - The building by era (the signature): victorian -> building.station-victorian, holden ->
     building.station-holden, jubilee-modern / elizabeth-modern -> building.station-modern, others ->
     victorian.
   - A board sign with the name and the line bars (8.3): plain sans, NO roundel, no line diagram (8.4).
   - A street and a pavement; lamps, benches, planters and hedges as the dense urban cover.
   - Trees (plane-trees, trees, suburb), terraces (terrace, suburb) or towers (towers) far, a dock
     (water) with reflections.
   - Movers: walkers (8, on the forecourt rows; basic sizes them with the depth ladder, 2.8), a bus (bus),
     a train on the embankment, a flock, pecking pigeons.
   ============================================================ */
(function () {
  if (typeof sceneArchetypeDefine !== 'function') return;
  const ERAS = ['victorian', 'edwardian-tiled', 'holden', 'postwar', 'jubilee-modern', 'elizabeth-modern', 'dlr-elevated', 'overground-brick', 'terminus'];
  const BUILDING = { victorian: 'building.station-victorian', holden: 'building.station-holden', 'jubilee-modern': 'building.station-modern', 'elizabeth-modern': 'building.station-modern' };
  sceneArchetypeDefine('station', {
    signs: true,
    params: { id: 'id', name: 'sign', lines: 'list', lat: 'number', lon: 'number', era: ERAS, features: 'list' },
    kits: ['london', 'urban', 'temperate', 'people', 'birds', 'vehicles'],
    slots: [{ id: 'landmark', layer: 'mid', x: 800, y: 700, s: 1 }],
    meta: (p) => ({ id: 'station-' + p.id, label: p.name + ' station', site: p.name, tags: ['london', 'station', 'rail', 'demo', p.era].concat(p.lines || []), mood: 'calm', colour: 'red', region: ['GB-ENG'] }),
    build(p, u) {
      const has = u.has, H = 500;
      const towers = has('towers'), water = has('water');
      const data = sceneArchBasic(Object.assign({}, p, { horizon: H, climate: 'temperate', water: water ? 'canal' : 'none', landmarks: [], density: 1, kits: ['london', 'urban', 'temperate', 'people', 'birds', 'vehicles'] }),
        Object.assign({}, u, { kit: (role, tags) => {
          // the far band mixes the area's main type with the other (variety: no type above 80 %); street trees are the light urban ones
          if (role === 'building-far') { const a = sceneKitPick(towers ? ['towers'] : ['london'], role, { tags }), b = sceneKitPick(towers ? ['london'] : ['towers'], role, { tags }); for (const k in a) a[k] *= 3; return Object.assign(b, a); }
          if (role === 'tree') return sceneKitPick(['urban'], role, { tags });
          if (role === 'ground' || role === 'shrub') { const w = sceneKitPick(['urban', 'london'], role, { tags }); delete w['plant.hedge']; delete w['plant.wildflowers']; return w; }
          if (role === 'edge') { const w = sceneKitPick(['water'], role, { tags }); for (const k of Object.keys(w)) if (!/^plant\./.test(k)) delete w[k]; return w; }   // a dock has hard edges: a few reeds only   // the hedge is heavy for the SVG tile budget
          return sceneKitPick(['london', 'urban', 'temperate', 'people', 'birds', 'vehicles', 'boats', 'water'], role, { tags });
        } }),
        { setting: 'urban', road: H + 280, walkers: 8, walkY: H + 238 });
      data.id = 'station-' + p.id;
      // a station forecourt has a few street trees, not a wood (fewer than 15: one species is fine)
      for (const r of data.scatter) if (Object.keys(r.obj || {}).some(id => /^tree\./.test(id))) r.n = Math.min(r.n, r.layer === 'mid' ? 8 : 4);
      // a dock edge: a few reeds (under 20, one colour is fine), not a reed bed
      for (const r of data.scatter) if (r.seed === 10) { r.n = Math.min(r.n, 18); delete r.tint; }
      data.signage = true;
      data.at = 'afternoon';
      // the station building (the signature), at the head of the forecourt
      const bid = BUILDING[p.era] || BUILDING.victorian, bx = 800, by = H + 214;
      data.place.push({ obj: bid, x: bx, y: by, s: 1, layer: 'mid', seed: u.hash(p.id) % 1000 });
      // trees only where the features ask (plane-trees, trees, suburb); otherwise a hard urban forecourt
      if (!(has('plane-trees') || has('trees') || has('suburb'))) data.scatter = data.scatter.filter(r => !(r.layer === 'mid' && Object.keys(r.obj).some(id => /^tree\./.test(id))));
      // the pavement and the road stay clear of the ground cover (benches, planters and lamps stand there)
      for (const r of data.scatter) if (r.seed === 7 || r.seed === 8) r.mask = Object.assign({}, r.mask, { avoid: ((r.mask && r.mask.avoid) || []).concat([{ rect: [-200, H + 228, 1800, H + 300] }]) });
      // keep the forecourt in front of the building clear
      for (const r of data.scatter) if (r.layer === 'mid' || r.layer === 'near') r.mask = Object.assign({}, r.mask, { avoid: ((r.mask && r.mask.avoid) || []).concat([{ rect: [bx - 230, H + 40, bx + 230, by + 40] }]) });
      // the board sign: the name, the line colours as bars (no roundel, no line names)
      const bars = (p.lines || []).map(id => sceneLine(id)).filter(Boolean).map(l => l.col).slice(0, 6);
      data.signs = [{ layer: 'mid', x: bx, y: by - 236, w: Math.min(360, 60 + String(p.name).length * 16), h: 40, text: p.name, bars, style: 'board' }];
      // the railway: an embankment behind and a train along it
      data.place.push({ obj: 'rail.embankment', x: 300, y: H + 44, s: 0.9, layer: 'far', seed: 7, reflect: water }, { obj: 'rail.embankment', x: 1300, y: H + 46, s: 0.9, layer: 'far', seed: 8, flip: true, reflect: water });
      data.actors.push({ obj: 'rail.train', layer: 'far', path: [[-500, H + 8], [2100, H + 8]], speed: 60, loop: 'loop', s: 0.55, seed: 61, offset: 0.62 });
      // street furniture and planting along the pavement (the dense urban cover)
      data.scatter.push({ obj: { 'street.lamp': 1 }, layer: 'near', seed: 44, area: { rect: [-120, H + 240, 1720, H + 252] }, n: 8, minGap: 110, s: [0.3, 0.78], flip: 0.5, mask: { noise: { scale: 120, cut: 0.25 } }, variant: 'random' });
      data.scatter.push({ obj: { 'street.bench': 1, 'plant.planter': 2 }, layer: 'near', seed: 36, area: { rect: [-140, H + 236, 1740, H + 252] }, n: 30, minGap: 50, s: [0.55, 1], flip: 0.5, variant: 'random', tint: { col: '#8a7a60', k: [0, 0.1] } });
      data.scatter.push({ obj: { 'plant.planter': 2, 'plant.grass': 3 }, layer: 'near', seed: 34, area: { rect: [bx - 230, by + 6, bx + 230, H + 226] }, n: 40, minGap: 16, s: [0.45, 0.9], flip: 0.5, variant: 'random', tint: { col: '#6a7a40', k: [0, 0.1] }, anim: 'strip', mask: { avoid: [{ rect: [bx - 90, by, bx + 90, H + 236] }] } });
      // pecking pigeons on the pavement, and a flock
      data.scatter.push({ obj: 'bird.pigeon', layer: 'near', seed: 35, area: { rect: [300, H + 248, 1300, H + 264] }, n: 7, minGap: 24, mask: { noise: { scale: 260, cut: 0.45 } }, s: [0.6, 1.3], flip: 0.5, variant: 'random' });
      if (!data.flocks.length) data.flocks.push({ obj: 'bird.small-flight', n: 6, area: [200, 80, 1400, 300], speed: 30, s: 0.6, seed: 9, layer: 'far' });
      // the bus (bus) is one of the road's vehicles; without it the road carries the train's passengers only
      if (has('bus')) data.actors = data.actors.filter(a => !(a.obj === 'vehicle.bus' && a.flip)).concat([{ obj: 'vehicle.bus', layer: 'near', path: [[1900, H + 272], [-300, H + 272]], speed: 38, loop: 'loop', s: 1, seed: 71, offset: 0.4, variant: 1, flip: true }]);
      else data.actors = data.actors.filter(a => a.obj !== 'vehicle.bus');
      return data;
    },
  });
})();
