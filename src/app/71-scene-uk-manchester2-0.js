/* ============================================================
   COMPOSED SCENES uk / Manchester and Salford, second batch (docs/dev/SCENE_ENGINE.md 8.1, 8.2).
   Twenty scenes, each a DIFFERENT real location (no second view of a spot, no dusk copy: the time
   of day and the seasons are already automatic). Each row: the place fields and caption, the view
   (lat, lon, heading, horizon) and the ground kind (square, street, towpath, quay, park) for the
   'mcr2-street' archetype (70-scene-lib-area-manchester2.js: sky, horizon, bands and water only),
   and its own PATCH: the landmark, the local things, the people and vehicles, the ground cover
   (two species per band, chosen for the place). No row copies another's composition.
   Locations (the list, in order):
     1 Piccadilly Gardens (lawn, pavilion wall, tram)              2 Piccadilly Basin (canal basin, footbridge)
     3 Piccadilly station platform (train shed, commuters)         4 Cathedral Gardens (the tower looked up at)
     5 Exchange Square (the copper dome corner, market stalls)     6 Faulkner Street (Chinatown gate in perspective)
     7 Canal Street (the Rochdale Canal towpath, bunting)          8 New Islington marina (moored narrowboats, the flats)
     9 Spinningfields (glass offices above the lawn)              10 Etihad plaza (match day, the bowl and the masts)
    11 Old Trafford stand (match day, the road and the buses)     12 Heaton Park lake (the hall across the boating lake)
    13 Oxford Road (the university mile, buses and students)      14 Fallowfield (terraces under the halls tower)
    15 Market Street (shoppers and a tram)                        16 Science and Industry Museum yard (heritage engine)
    17 Sackville Street (rain on red brick, wet road)             18 IWM North, Salford Quays (the shards over the dock)
    19 Ordsall Chord, the Irwell (harp bridge, river path)        20 Stockport viaduct, the Mersey (brick arches, river)
   Lint and look:
     node tools/anim-pack.mjs scene lint --pack uk-area-manchester2 --perf
     node tools/anim-pack.mjs scene sheet --pack uk-area-manchester2 --contact
   Care: no text (the Chinatown panel is blank, the colour bands on the flats carry no letters),
   no club colours or marks at either stadium, people are anonymous walkers (silhouette objects).
   ============================================================ */
const UK_MANCHESTER2_SCENES = (function () {
  let sd = 7;
  const seed = () => (sd = (sd * 37 + 11) % 9973) + 1;
  // the size helpers read the library at load time (this file loads after the 70- library files)
  const S = (obj, h) => { const d = sceneObj(obj); return d && d.size && d.size[1] ? Math.round(h / d.size[1] * 100) / 100 : 1; };
  const PS = (obj, y, H) => { const d = sceneObj(obj); return d && d.size ? scenePersonScale(d.size[1], y, { horizon: H }) : 0.5; };
  // a placed object, h = its height in units
  const at = (obj, x, y, h, layer, o) => Object.assign({ obj, x, y, s: S(obj, h), layer, seed: seed() }, o || {});
  // a standing person (static), sized at its row
  const pp = (obj, x, y, H, o) => Object.assign({ obj, x, y, s: PS(obj, y, H), layer: 'near', seed: seed() }, o || {});
  // a walker or rider along a line: dir +1 left to right, -1 right to left
  const go = (obj, y, dir, speed, H, layer, o) => Object.assign({ obj, layer: layer || 'near', path: dir > 0 ? [[-140, y], [1720, y]] : [[1720, y], [-140, y]], speed, loop: 'loop', s: PS(obj, y, H), seed: seed(), offset: (sd % 100) / 100, flip: dir < 0 }, o || {});
  // a seeded scatter rule over a rectangle (sizes spread, a warm tint, static)
  const sc = (obj, layer, rect, n, minGap, s, o) => Object.assign({ obj, layer, seed: seed(), area: { rect }, n, minGap, s: [Math.round(s[0] * 75) / 100, Math.round(s[1] * 130) / 100], flip: 0.5, variant: 'random', tint: { col: '#8a7a40', k: [0, 0.14] }, anim: false }, o || {});
  // a flock of birds that cross the view
  const fl = (obj, n, area, speed, s, layer) => ({ obj, n, area, speed, s, seed: seed(), layer: layer || 'far' });
  // the ground cover of a row: the lower band (from where the ground starts to fill the frame, the 35 %
  // line of the land height), two species of one category for the near band, two for the fore band
  const cover = (H, pairs, wet, k) => {
    const b = Math.round(H + 0.35 * (900 - H)) + 6, pr = p => ({ [p[0]]: 3, [p[1]]: 2 });
    return [
      sc(pr(pairs[0]), 'near', [-150, b, 1750, b + 100], Math.round(106 * k), 12, [0.5, 0.9], { reflect: !!wet }),
      sc(pr(pairs[1]), 'fore', [-150, b + 100, 1750, 905], Math.round(84 * k), 14, [0.5, 0.95], {}),
    ];
  };
  // the cover species of each row (same category within a band, so no category is one object)
  // a few dense places trim their cover a little, to keep the still's tile under the SVG budget (lint)
  const COVER_SCALE = { 'heaton-park-lake': 0.85 };
  const COVER = {
    'piccadilly-gardens': [['plant.planter', 'plant.shrub'], ['street.bollard', 'street.lamp']],
    'piccadilly-basin': [['plant.towpath-hedge', 'plant.grass'], ['plant.grass', 'plant.shrub']],
    'piccadilly-station': [['plant.planter', 'plant.shrub'], ['street.bollard', 'street.bench']],
    'manchester-cathedral': [['plant.shrub', 'plant.planter'], ['street.bollard', 'street.lamp']],
    'corn-exchange': [['plant.shrub', 'plant.planter'], ['street.bollard', 'street.lamp']],
    'chinatown-arch': [['street.bollard', 'street.lamp'], ['plant.planter', 'plant.shrub']],
    'canal-street': [['plant.towpath-hedge', 'plant.reed'], ['plant.grass', 'plant.towpath-hedge']],
    'new-islington-marina': [['plant.towpath-hedge', 'plant.reed'], ['plant.grass', 'plant.shrub']],
    'spinningfields': [['plant.grass', 'plant.shrub'], ['plant.planter', 'plant.grass']],
    'eastlands-match-day': [['street.bollard', 'street.lamp'], ['plant.planter', 'plant.shrub']],
    'old-trafford-match-day': [['street.bollard', 'street.bench'], ['plant.hedge', 'plant.grass']],
    'heaton-park-lake': [['plant.shrub', 'plant.bracken'], ['plant.grass', 'plant.bracken']],
    'oxford-road': [['street.bollard', 'street.lamp'], ['plant.planter', 'plant.shrub']],
    'fallowfield': [['plant.grass', 'plant.planter'], ['street.bollard', 'street.lamp']],
    'market-street': [['street.bollard', 'street.lamp'], ['plant.planter', 'plant.shrub']],
    'science-industry-museum': [['plant.planter', 'plant.shrub'], ['street.bollard', 'street.bench']],
    'rain-on-red-brick': [['street.bollard', 'street.bench'], ['street.lamp', 'street.bollard']],
    'iwm-north': [['street.bollard', 'street.bench'], ['plant.planter', 'plant.shrub']],
    'ordsall-chord': [['plant.grass', 'plant.reed'], ['plant.grass', 'plant.bracken']],
    'stockport-viaduct': [['plant.towpath-hedge', 'plant.reed'], ['rock.boulder', 'rock.stones']],
  };
  // one row: the caption fields, the archetype params and the scene's own patch (its cover is added here)
  const row = (id, town, label, kind, colour, tags, ukPlace, ukView, reason, params, patch, sp) => {
    const P = Object.assign({ id }, params), p = patch || {};
    return { id, town, label, kind, colour, tags, ukPlace, ukView, reason, params: P,
      patch: Object.assign({}, p, { scatter: (p.scatter || []).concat(cover(P.horizon, COVER[id] || sp, P.water && P.water !== 'none', COVER_SCALE[id] || 1)) }) };
  };
  const M = 'Manchester', S2 = 'Salford', ST = 'Stockport';
  return [
    // 1 Piccadilly Gardens: the pavilion wall on the right, a tram across the lawn in front of it
    row('piccadilly-gardens', M, 'Piccadilly Gardens', 'landmark', 'amber', ['piccadilly', 'gardens', 'pavilion', 'metrolink'], 'piccadilly-gardens', 'wide', 'The pavilion wall across the gardens and a tram on the lawn edge',
      { lat: 53.4809, lon: -2.2367, heading: 200, at: 'afternoon', horizon: 520, ground: 'square', water: 'none' },
      { place: [at('landmark.mcr-piccadilly-pavilion', 1080, 600, 190, 'mid'), at('building.tower-glass', 300, 470, 430, 'far'), at('tree.plane', 640, 610, 230, 'mid', { flip: true }), pp('person.walker', 1180, 842, 520)],
        actors: [go('vehicle.metrolink-m5000', 790, 1, 30, 520, 'near', { s: 0.82 }), go('person.shopper', 690, 1, 14, 520), go('person.couple', 760, -1, 11, 520), go('person.walker', 640, -1, 16, 520), go('person.student', 720, 1, 18, 520), go('person.phone-idler', 820, -1, 6, 520)],
        flocks: [fl('bird.gull', 6, [150, 170, 1400, 360], 28, 0.5), fl('bird.pigeon', 4, [300, 380, 1200, 470], 14, 0.5, 'mid')],
        scatter: [sc('street.bollard', 'near', [-150, 668, 1750, 688], 16, 80, [0.6, 0.8]), sc('ground.puddle', 'near', [-150, 800, 1750, 830], 14, 60, [0.5, 0.8])] },
      [['plant.planter', 'plant.shrub'], ['street.bollard', 'plant.planter']]),
    // 2 Piccadilly Basin: a canal basin seen across the water, a footbridge, narrowboats on the far side
    row('piccadilly-basin', M, 'Piccadilly Basin', 'heritage', 'slate', ['piccadilly', 'canal', 'basin', 'narrowboat'], 'piccadilly-basin', 'wide', 'Narrowboats in the basin under a brick footbridge',
      { lat: 53.4773, lon: -2.2318, heading: 280, at: 'golden', horizon: 470, ground: 'towpath', water: 'canal' },
      { place: [at('building.warehouse-canal', 260, 440, 330, 'far'), at('landmark.beetham-tower', 1500, 430, 380, 'far'), at('tree.bank-willow', 1500, 600, 300, 'mid', { flip: true }), at('tree.bank-willow', 120, 610, 280, 'mid'), at('building.warehouse-canal', 1260, 430, 300, 'far', { flip: true }), at('structure.bridge-brick', 760, 560, 240, 'mid', { reflect: true }), at('boat.narrowboat', 420, 590, 60, 'mid', { flip: true, reflect: true }), at('boat.narrowboat', 1120, 606, 60, 'mid', { reflect: true })],
        actors: [go('boat.narrowboat', 580, 1, 6, 470, 'mid', { s: 0.52 }), go('person.walker', 680, 1, 16, 470), go('person.cyclist', 720, -1, 22, 470), go('person.dog-walker', 760, 1, 12, 470)],
        flocks: [fl('bird.gull', 5, [200, 120, 1400, 320], 26, 0.5), fl('bird.small-flight', 5, [300, 230, 1300, 380], 22, 0.6, 'mid')],
        scatter: [sc('plant.reed', 'mid', [-150, 560, 1750, 576], 14, 50, [0.4, 0.6], { reflect: true }), sc('bird.mallard', 'mid', [200, 570, 1400, 612], 4, 120, [0.32, 0.4], { reflect: true }), sc('street.lamp', 'near', [-150, 800, 1750, 820], 4, 260, [0.7, 0.9])] },
      [['plant.towpath-hedge', 'plant.grass'], ['plant.grass', 'plant.shrub']]),
    // 3 Piccadilly station: the platform, the train shed behind and a train on the mainline track
    row('piccadilly-station', M, 'Piccadilly station platform', 'landmark', 'slate', ['piccadilly', 'station', 'platform', 'train shed'], 'piccadilly-station', 'wide', 'Commuters on the platform with the train shed and a train on the track',
      { lat: 53.4773, lon: -2.2301, heading: 150, at: 'day', horizon: 430, ground: 'square', water: 'none' },
      { ground: [{ layer: 'mid', d: 'M-160 596H1760V612H-160Z', fill: '#4a4e54' }, { layer: 'mid', d: 'M-160 598H1760V600H-160Z', fill: '#a8a8ae' }],
        place: [at('building.train-shed', 760, 470, 380, 'far'), at('street.station-clock', 300, 720, 200, 'near'), pp('person.walker', 1200, 870, 430)],
        actors: [go('rail.train-mainline', 590, 1, 40, 430, 'mid', { s: 0.8, loop: 'pingpong' }), go('person.walker', 700, 1, 14, 430), go('person.student', 760, -1, 12, 430), go('person.walker', 840, 1, 10, 430), go('person.cyclist', 900, -1, 12, 430), go('person.wheelchair-user', 780, 1, 6, 430)],
        flocks: [fl('bird.gull', 6, [200, 130, 1400, 300], 30, 0.5), fl('bird.small-flight', 4, [300, 220, 1300, 340], 20, 0.6, 'mid')],
        scatter: [sc('street.bench', 'near', [-150, 835, 1750, 850], 6, 260, [0.6, 0.8]), sc('street.bollard', 'fore', [-150, 880, 1750, 900], 12, 120, [0.9, 1.1])] },
      [['plant.planter', 'street.bollard'], ['plant.planter', 'plant.shrub']]),
    // 4 Cathedral Gardens: looking up at the west tower from the lawn, a plane tree framing the left
    row('manchester-cathedral', M, 'Manchester Cathedral', 'landmark', 'red', ['cathedral', 'gothic', 'tower', 'gardens'], 'manchester-cathedral', 'wide', 'The battlemented tower, looked up at from the gardens',
      { lat: 53.4847, lon: -2.2440, heading: 60, at: 'afternoon', horizon: 600, ground: 'square', water: 'none' },
      { place: [at('landmark.mcr-cathedral', 1120, 760, 560, 'mid'), at('street.bollard', 150, 860, 200, 'near'), at('structure.stone-wall', 520, 800, 90, 'near'), pp('person.bench-sitter', 900, 808, 600)],
        actors: [go('person.walker', 700, 1, 12, 600), go('person.walker', 770, -1, 9, 600), go('person.couple', 820, 1, 10, 600), go('person.student', 740, -1, 9, 600)],
        flocks: [fl('bird.gull', 6, [100, 120, 1500, 380], 28, 0.5), fl('bird.small-flight', 4, [300, 160, 1200, 300], 20, 0.6, 'mid')],
        scatter: [sc('street.bollard', 'near', [-150, 705, 1750, 720], 12, 100, [0.5, 0.7])] },
      [['plant.hedge', 'plant.shrub'], ['plant.grass', 'plant.shrub']]),
    // 5 Exchange Square: the curved corner and copper dome on the left, a cathedral tower far right, stalls below
    row('corn-exchange', M, 'The Corn Exchange', 'landmark', 'amber', ['corn exchange', 'edwardian', 'dome', 'market'], 'corn-exchange', 'wide', 'The copper dome on the curved corner with stalls on the square',
      { lat: 53.4846, lon: -2.2437, heading: 110, at: 'golden', horizon: 500, ground: 'square', water: 'none' },
      { place: [at('landmark.mcr-corn-exchange', 560, 590, 350, 'mid'), at('landmark.mcr-cathedral', 1400, 500, 300, 'far'), at('street.market-stall', 380, 820, 150, 'near'), at('street.market-stall', 1000, 780, 150, 'near', { flip: true }), at('street.market-stall', 1300, 800, 150, 'near'), pp('person.cafe-goer', 560, 790, 500)],
        actors: [go('person.shopper', 700, 1, 12, 500), go('person.walker', 740, -1, 14, 500), go('person.elderly-couple', 860, 1, 8, 500), go('person.buggy-walker', 900, -1, 7, 500)],
        flocks: [fl('bird.herring-gull-flight', 6, [150, 140, 1500, 340], 26, 0.6), fl('bird.small-flight', 4, [300, 300, 1200, 420], 20, 0.6, 'mid')],
        scatter: [sc('street.bollard', 'fore', [-150, 850, 1750, 905], 12, 90, [0.9, 1.1])] },
      [['plant.shrub', 'plant.planter'], ['street.bollard', 'plant.planter']]),
    // 6 Faulkner Street: the Chinatown gate in perspective, shophouses and a taxi down the street
    row('chinatown-arch', M, 'Chinatown arch', 'landmark', 'red', ['chinatown', 'arch', 'lanterns', 'faulkner street'], 'manchester-chinatown', 'wide', 'The red and gold archway down the street, lanterns strung across',
      { lat: 53.4789, lon: -2.2393, heading: 20, at: 'afternoon', horizon: 460, ground: 'street', water: 'none', road: 800 },
      { place: [at('landmark.mcr-chinatown-arch', 640, 690, 420, 'mid'), at('building.shophouse', 180, 560, 330, 'far'), at('building.shophouse', 1300, 560, 330, 'far', { flip: true }), at('building.shophouse-row', 1560, 700, 360, 'mid', { flip: true }), at('street.lantern-string', 300, 600, 150, 'mid'), at('street.lantern-string', 1150, 600, 150, 'mid', { flip: true })],
        actors: [go('vehicle.taxi', 836, -1, 40, 460, 'near', { s: 0.9 }), go('person.walker', 760, 1, 14, 460), go('person.shopper', 800, -1, 12, 460), go('person.takeaway-walker', 740, -1, 12, 460), go('person.couple', 850, 1, 9, 460)],
        flocks: [fl('bird.small-flight', 8, [150, 120, 1450, 300], 24, 0.6)],
        scatter: [sc('plant.planter', 'fore', [-150, 880, 1750, 905], 10, 120, [0.9, 1.1])] },
      [['street.bollard', 'ground.puddle'], ['ground.puddle', 'street.bollard']]),
    // 7 Canal Street: the towpath at water level, warehouses on both banks, bunting across the canal front
    row('canal-street', M, 'Canal Street', 'landmark', 'violet', ['canal street', 'village', 'canal', 'bunting'], 'canal-street', 'evening', 'Bunting over the Rochdale Canal and a boat passing the warehouses',
      { lat: 53.4766, lon: -2.2355, heading: 300, at: 'golden', horizon: 430, ground: 'towpath', water: 'canal' },
      { place: [at('building.warehouse-canal', 340, 470, 380, 'far'), at('building.warehouse-canal', 1230, 460, 330, 'far', { flip: true }), at('landmark.beetham-tower', 1100, 430, 380, 'far'), at('street.mcr-bunting', 760, 500, 200, 'mid', { reflect: true }), at('boat.narrowboat', 560, 560, 60, 'mid', { reflect: true })],
        actors: [go('boat.narrowboat', 548, 1, 5, 430, 'mid', { s: 0.55, reflect: true }), go('person.walker', 650, -1, 14, 430), go('person.dog-walker', 720, 1, 10, 430), go('person.phone-idler', 760, -1, 6, 430)],
        flocks: [fl('bird.gull', 6, [180, 150, 1400, 330], 26, 0.5), fl('bird.small-flight', 5, [260, 210, 1300, 330], 20, 0.6, 'mid')],
        scatter: [sc('plant.towpath-hedge', 'near', [-150, 600, 1750, 620], 24, 40, [0.5, 0.8], { reflect: true }), sc('structure.fence', 'near', [-150, 640, 1750, 660], 10, 120, [0.6, 0.8], { reflect: true }), sc('bird.mallard', 'mid', [260, 530, 1300, 572], 4, 140, [0.32, 0.4], { reflect: true })] },
      [['plant.grass', 'plant.towpath-hedge'], ['plant.grass', 'ground.puddle']]),
    // 8 New Islington marina: moored narrowboats across the basin, the stacked flats above them, a swan on the water
    row('new-islington-marina', M, 'New Islington marina', 'landmark', 'green', ['new islington', 'marina', 'ancoats', 'flats'], 'new-islington', 'wide', 'Moored narrowboats below the stacked flats',
      { lat: 53.4820, lon: -2.2235, heading: 20, at: 'morning', horizon: 470, ground: 'towpath', water: 'canal' },
      { place: [at('landmark.mcr-chips', 1060, 540, 300, 'mid'), at('boat.narrowboat', 230, 600, 60, 'mid', { reflect: true }), at('boat.narrowboat', 600, 612, 60, 'mid', { flip: true, reflect: true }), at('boat.narrowboat', 1220, 606, 60, 'mid', { reflect: true }), at('boat.narrowboat-receding', 1460, 598, 60, 'mid', { reflect: true })],
        actors: [go('bird.swan', 585, 1, 3, 470, 'mid', { s: 0.5 }), go('person.cyclist', 700, -1, 18, 470), go('person.dog-walker', 760, 1, 10, 470), go('person.walker', 800, -1, 12, 470)],
        flocks: [fl('bird.herring-gull-flight', 5, [200, 150, 1400, 320], 24, 0.5), fl('bird.small-flight', 4, [360, 230, 1200, 340], 20, 0.6, 'mid')],
        scatter: [sc('plant.reed', 'mid', [-150, 575, 1750, 588], 14, 50, [0.4, 0.6], { reflect: true }), sc('street.lamppost', 'near', [-150, 820, 1750, 840], 6, 260, [0.7, 0.9])] },
      [['plant.towpath-hedge', 'plant.reed'], ['plant.grass', 'plant.shrub']], true),
    // 9 Spinningfields: the glass offices and the mid-rise block behind a lawn with cafe tables, from a raised viewpoint
    row('spinningfields', M, 'Spinningfields', 'landmark', 'blue', ['spinningfields', 'glass', 'offices', 'lawn'], 'spinningfields', 'wide', 'Glass offices around the lawn and the cafe tables',
      { lat: 53.4801, lon: -2.2531, heading: 40, at: 'day', horizon: 430, ground: 'square', water: 'none' },
      { place: [at('landmark.beetham-tower', 1300, 520, 540, 'far'), at('building.tower-glass', 920, 500, 300, 'far'), at('building.media-block', 500, 520, 340, 'mid'), pp('person.cafe-goer', 520, 800, 430), pp('person.bench-reader', 1240, 790, 430), at('street.bench', 1000, 790, 60, 'near')],
        actors: [go('person.walker', 700, 1, 14, 430), go('person.cyclist', 760, -1, 22, 430), go('person.walker', 830, 1, 12, 430), go('person.phone-idler', 880, -1, 6, 430), go('person.student', 640, -1, 13, 430)],
        flocks: [fl('bird.gull', 6, [120, 140, 1450, 330], 28, 0.5), fl('bird.small-flight', 4, [260, 200, 1300, 320], 22, 0.6, 'mid')],
        scatter: [sc('plant.shrub', 'near', [-150, 735, 1750, 760], 12, 90, [0.6, 0.9])] },
      [['plant.grass', 'plant.shrub'], ['plant.planter', 'plant.grass']]),
    // 10 Etihad plaza: the bowl and its ring of masts on the left, fans crossing the plaza, a tram behind them
    row('eastlands-match-day', M, 'Match day at Eastlands', 'tradition', 'blue', ['football', 'stadium', 'match day', 'eastlands'], 'eastlands-stadium', 'wide', 'Fans crossing the plaza below the ring of masts',
      { lat: 53.4831, lon: -2.2004, heading: 200, at: 'afternoon', horizon: 520, ground: 'square', water: 'none' },
      { place: [at('landmark.mcr-etihad', 840, 600, 320, 'mid'), at('street.market-stall', 260, 790, 150, 'near'), at('street.market-stall', 1380, 800, 150, 'near', { flip: true }), at('street.lamppost', 60, 700, 220, 'near'), at('street.lamppost', 1540, 690, 220, 'near')],
        actors: [go('vehicle.metrolink-m5000', 760, -1, 30, 520, 'near', { s: 0.8 }), go('person.football-fan', 690, 1, 16, 520), go('person.football-fan', 730, 1, 18, 520), go('person.football-fan', 770, -1, 14, 520), go('person.takeaway-walker', 800, 1, 12, 520)],
        flocks: [fl('bird.gull', 6, [120, 140, 1450, 320], 30, 0.5), fl('bird.pigeon', 4, [200, 360, 1300, 460], 14, 0.5, 'mid')],
        scatter: [sc('street.bollard', 'near', [-150, 676, 1750, 694], 16, 80, [0.6, 0.8])] },
      [['street.bollard', 'ground.puddle'], ['plant.planter', 'ground.puddle']]),
    // 11 Old Trafford: the stand on the right, a double-decker bus on the road, the crowd on the pavement
    row('old-trafford-match-day', 'Manchester', 'Match day at Old Trafford', 'tradition', 'red', ['football', 'stadium', 'match day', 'trafford'], 'old-trafford', 'golden', 'Crowds walking up to the tall stand at golden hour',
      { lat: 53.4631, lon: -2.2913, heading: 340, at: 'golden', horizon: 470, ground: 'street', water: 'none', road: 800 },
      { place: [at('landmark.mcr-old-trafford', 1040, 560, 330, 'mid'), at('street.lamppost', 300, 730, 210, 'near'), at('street.bench', 180, 790, 70, 'near')],
        actors: [go('vehicle.bus-double-decker', 782, 1, 40, 470, 'near', { s: 0.9 }), go('vehicle.bus', 830, -1, 36, 470, 'near', { s: 0.85 }), go('person.football-fan', 690, 1, 16, 470), go('person.football-fan', 730, 1, 18, 470), go('person.football-fan', 760, -1, 14, 470), go('person.football-fan', 705, -1, 12, 470), go('person.takeaway-walker', 800, 1, 12, 470)],
        flocks: [fl('bird.herring-gull-flight', 6, [150, 140, 1400, 320], 26, 0.6), fl('bird.small-flight', 4, [300, 300, 1200, 420], 20, 0.6, 'mid')],
        scatter: [sc('plant.hedge', 'near', [-150, 742, 1750, 754], 10, 120, [0.5, 0.7])] },
      [['street.bollard', 'plant.hedge'], ['ground.puddle', 'plant.grass']]),
    // 12 Heaton Park lake: the hall across the boating lake, rowers, swans and an oak framing the near shore
    row('heaton-park-lake', M, 'Heaton Park boating lake', 'heritage', 'green', ['heaton park', 'lake', 'rowing', 'parkland'], 'heaton-park', 'lake', 'Rowing boats and swans on the lake below the hall',
      { lat: 53.5330, lon: -2.2480, heading: 300, at: 'afternoon', horizon: 470, ground: 'park', water: 'lake', setting: 'urban' },
      { place: [at('landmark.heaton-hall', 1120, 540, 250, 'mid'), at('tree.bank-alder', 260, 690, 300, 'near'), at('tree.bank-willow', 1480, 600, 330, 'mid', { flip: true }), at('street.bench', 420, 810, 60, 'near')],
        actors: [go('person.rower', 600, 1, 6, 470, 'mid', { loop: 'pingpong', s: 0.48 }), go('boat.dinghy', 640, -1, 5, 470, 'mid', { s: 0.55, loop: 'pingpong' }), go('bird.swan', 590, 1, 3, 470, 'mid', { s: 0.5 }), go('bird.goose', 640, -1, 3, 470, 'mid', { s: 0.46 }), go('person.dog-walker', 720, 1, 12, 470), go('person.jogger', 780, -1, 18, 470), go('person.couple', 840, 1, 9, 470), go('person.child-scooter', 800, 1, 9, 470)],
        flocks: [fl('bird.gull', 5, [200, 130, 1400, 300], 26, 0.5), fl('bird.small-flight', 4, [300, 230, 1300, 340], 20, 0.6, 'mid')],
        scatter: [sc('tree.bank-willow', 'far', [-150, 470, 1750, 520], 6, 200, [0.5, 0.8]), sc('plant.reed', 'mid', [-150, 580, 1750, 600], 16, 40, [0.4, 0.6], { reflect: true }), sc('plant.shrub', 'near', [-150, 700, 1750, 740], 20, 60, [0.5, 0.8])] },
      [['plant.grass', 'plant.shrub'], ['plant.grass', 'plant.bracken']], true),
    // 13 Oxford Road: the university mile, a red-brick block and Victorian terraces, buses and students
    row('oxford-road', M, 'Oxford Road', 'tradition', 'violet', ['oxford road', 'university', 'students', 'buses'], 'oxford-road', 'wide', 'Students, bikes and buses on the university mile',
      { lat: 53.4655, lon: -2.2335, heading: 200, at: 'morning', horizon: 470, ground: 'street', water: 'none', road: 800 },
      { place: [at('building.terrace-victorian', 280, 560, 380, 'far'), at('building.terrace-victorian', 1180, 540, 360, 'far', { flip: true }), at('building.mcr-mill', 700, 520, 340, 'far'), at('street.lamppost', 1440, 720, 200, 'near')],
        actors: [go('vehicle.bus', 790, 1, 34, 470, 'near', { s: 0.85 }), go('vehicle.bus-double-decker', 836, -1, 36, 470, 'near', { s: 0.9 }), go('person.student', 690, 1, 14, 470), go('person.cyclist', 730, -1, 20, 470), go('person.student', 720, 1, 14, 470), go('person.takeaway-walker', 760, -1, 12, 470), go('person.student', 680, -1, 12, 470)],
        flocks: [fl('bird.pigeon', 5, [200, 140, 1400, 300], 22, 0.6), fl('bird.small-flight', 4, [300, 240, 1300, 380], 20, 0.6, 'mid')],
        scatter: [sc('street.bollard', 'fore', [-150, 880, 1750, 900], 10, 140, [0.9, 1.1])] },
      [['street.bollard', 'plant.planter'], ['plant.planter', 'street.bollard']]),
    // 14 Fallowfield: the terraced front on both sides, the halls tower above the rooftops, students home on bikes
    row('fallowfield', M, 'Fallowfield', 'tradition', 'violet', ['fallowfield', 'students', 'terraces', 'halls'], 'fallowfield', 'golden', 'Terraced streets below the halls tower, students heading home',
      { lat: 53.4440, lon: -2.2195, heading: 200, at: 'golden', horizon: 500, ground: 'street', water: 'none' },
      { place: [at('building.terrace-northern', 240, 560, 320, 'far'), at('building.terrace-northern', 1210, 580, 340, 'mid', { flip: true }), at('landmark.mcr-owens-park-tower', 740, 560, 400, 'far')],
        actors: [go('person.student', 680, 1, 16, 500), go('person.student', 760, -1, 14, 500), go('person.cyclist', 820, 1, 20, 500), go('person.takeaway-walker', 720, -1, 12, 500), go('person.skateboarder', 880, -1, 14, 500)],
        flocks: [fl('bird.small-flight', 6, [200, 140, 1400, 300], 24, 0.6), fl('bird.pigeon', 4, [260, 300, 1300, 400], 14, 0.5, 'mid')],
        scatter: [sc('plant.hedge', 'near', [-150, 760, 1750, 780], 12, 90, [0.5, 0.8])] },
      [['plant.shrub', 'plant.hedge'], ['plant.shrub', 'plant.hedge']]),
    // 15 Market Street: the pedestrian street from the tram rails, shopfronts left, a tall glass block far right
    row('market-street', M, 'Market Street', 'landmark', 'amber', ['market street', 'shopping', 'tram', 'arndale'], 'market-street', 'wide', 'Shoppers on the pedestrian street and a tram down its middle',
      { lat: 53.4826, lon: -2.2412, heading: 90, at: 'afternoon', horizon: 430, ground: 'square', water: 'none' },
      { place: [at('landmark.beetham-tower', 300, 470, 400, 'far'), at('building.shopfront', 280, 500, 360, 'mid'), at('building.shopfront', 1400, 510, 370, 'mid', { flip: true }), at('building.tower-glass', 1080, 470, 420, 'far'), at('street.market-stall', 520, 690, 150, 'near'), at('street.market-stall', 980, 710, 150, 'near', { flip: true }), pp('person.photographer', 1180, 838, 430)],
        actors: [go('vehicle.metrolink-tram', 740, 1, 26, 430, 'near', { s: 0.85 }), go('person.shopper', 640, 1, 12, 430), go('person.shopper', 700, -1, 14, 430), go('person.couple', 760, 1, 9, 430), go('person.buggy-walker', 820, -1, 8, 430), go('person.shopper', 860, 1, 12, 430), go('person.elderly-couple', 900, -1, 7, 430)],
        flocks: [fl('bird.pigeon', 6, [200, 170, 1400, 320], 20, 0.6), fl('bird.small-flight', 4, [300, 240, 1200, 340], 20, 0.6, 'mid')],
        scatter: [sc('street.lamp', 'near', [-150, 640, 1750, 652], 4, 240, [0.7, 0.9])] },
      [['street.bollard', 'plant.planter'], ['plant.planter', 'ground.puddle']]),
    // 16 Science and Industry Museum yard: the 1830 station, a heritage engine and carriage on a short track
    row('science-industry-museum', M, 'Science and Industry Museum', 'heritage', 'slate', ['museum', 'railway', 'steam', 'castlefield'], 'science-industry-museum', 'wide', 'A heritage engine steaming past the 1830 station',
      { lat: 53.4770, lon: -2.2545, heading: 190, at: 'noon', horizon: 470, ground: 'square', water: 'none' },
      { ground: [{ layer: 'near', d: 'M-160 686H1760V704H-160Z', fill: '#5a524a' }, { layer: 'near', d: 'M-160 692H1760V694H-160Z', fill: '#9a9aa0' }],
        place: [at('landmark.mcr-sim-station', 900, 580, 230, 'mid'), at('building.mcr-mill', 220, 500, 280, 'far'), at('building.mill-red-brick', 1520, 510, 300, 'far', { flip: true }), pp('person.photographer', 1180, 840, 500)],
        actors: [go('rail.heritage-steam-loco', 700, 1, 10, 500, 'near', { s: 0.62, loop: 'pingpong' }), go('rail.heritage-coach', 700, 1, 10, 500, 'near', { s: 0.62, loop: 'pingpong', offset: 0.5 }), go('person.couple', 760, 1, 8, 500), go('person.child-scooter', 820, -1, 9, 500), go('person.walker', 780, -1, 12, 500)],
        flocks: [fl('bird.gull', 5, [200, 120, 1400, 300], 26, 0.5), fl('bird.small-flight', 4, [300, 240, 1200, 340], 20, 0.6, 'mid')],
        scatter: [sc('street.bollard', 'fore', [-150, 860, 1750, 880], 12, 110, [0.9, 1.1])] },
      [['plant.planter', 'plant.shrub'], ['street.bollard', 'plant.planter']]),
    // 17 Sackville Street: rain on the red brick, a wet road and the mills on both sides, a far tower through the gap
    row('rain-on-red-brick', M, 'Rain on red brick, Sackville Street', 'heritage', 'red', ['sackville street', 'warehouses', 'rain', 'brick'], 'sackville-street', 'rain', 'Wet street and red mills reflecting in the puddles',
      { lat: 53.4749, lon: -2.2383, heading: 350, at: 'dusk', horizon: 440, ground: 'street', water: 'none', road: 820 },
      { palette: { base: { hills: ['#6e6a68', '#8a8682'], ground: ['#6a6664', '#56524f'], pave: ['#8e8a84', '#76726c', '#5e5a56'], road: ['#3e4246', '#50545a'] }, autumn: { ground: ['#7a6446', '#5e4c34'], pave: ['#8a7a64', '#6e604c'] }, winter: { ground: ['#b8bcc0', '#9aa0a6'], pave: ['#c4c8cc', '#a4aab0', '#8a9098'], hills: ['#9aa4ac', '#b8c0c8'] } },
        place: [at('building.mcr-mill', 360, 520, 420, 'mid'), at('building.mill-red-brick', 1060, 530, 430, 'mid', { flip: true }), at('landmark.beetham-tower', 720, 470, 430, 'far')],
        actors: [go('vehicle.bus', 820, 1, 30, 440, 'near', { s: 0.85 }), go('vehicle.car-city', 850, -1, 30, 440, 'near', { s: 0.8 }), go('person.walker', 700, 1, 12, 440), go('person.walker', 740, -1, 14, 440), go('person.walker', 780, 1, 13, 440), go('person.couple', 880, -1, 9, 440), go('person.takeaway-walker', 720, 1, 12, 440)],
        flocks: [fl('bird.gull', 4, [200, 140, 1400, 300], 24, 0.5), fl('bird.pigeon', 4, [260, 230, 1300, 330], 16, 0.5, 'mid')],
        scatter: [sc('street.lamppost', 'near', [-150, 720, 1750, 740], 4, 240, [0.7, 0.9])] },
      [['ground.puddle', 'street.bollard'], ['ground.puddle', 'street.bollard']]),
    // 18 IWM North, Salford Quays: the three concrete shards over the dock, a water taxi and quayside walkers
    row('iwm-north', S2, 'IWM North, Salford Quays', 'landmark', 'blue', ['salford', 'quays', 'museum', 'shards'], 'iwm-north', 'wide', 'The three shards on the quay, a water taxi on the dock',
      { lat: 53.4735, lon: -2.2935, heading: 60, at: 'day', horizon: 470, ground: 'quay', water: 'quays' },
      { place: [at('landmark.iwm-north', 700, 570, 400, 'mid'), at('boat.tug', 1360, 606, 120, 'mid', { reflect: true }), at('street.bench', 1200, 690, 70, 'near'), at('street.bench', 330, 780, 70, 'near', { flip: true })],
        actors: [go('boat.water-taxi', 596, 1, 8, 470, 'mid', { s: 0.7, loop: 'pingpong', reflect: true }), go('person.walker', 760, 1, 14, 470), go('person.jogger', 800, -1, 20, 470), go('person.couple', 840, 1, 10, 470), go('person.cyclist', 720, -1, 22, 470)],
        flocks: [fl('bird.gull', 8, [120, 130, 1450, 320], 30, 0.5), fl('bird.small-flight', 4, [300, 220, 1300, 330], 20, 0.6, 'mid')],
        scatter: [sc('bird.herring-gull', 'mid', [200, 600, 1400, 630], 4, 160, [0.4, 0.5], { reflect: true })] },
      [['street.bollard', 'plant.planter'], ['plant.planter', 'plant.shrub']], true),
    // 19 Ordsall Chord: the harp pylon over the Irwell, a riverside path with bank trees, a dinghy and mallards
    row('ordsall-chord', S2, 'Ordsall Chord, the Irwell', 'landmark', 'slate', ['salford', 'bridge', 'harp', 'irwell'], 'ordsall-chord', 'golden', 'The harp bridge pylon above the river path',
      { lat: 53.4848, lon: -2.2565, heading: 170, at: 'golden', horizon: 430, ground: 'towpath', water: 'quays' },
      { place: [at('landmark.ordsall-chord', 820, 520, 330, 'mid', { reflect: true }), at('tree.bank-alder', 240, 640, 360, 'near'), at('tree.bank-willow', 1450, 600, 330, 'mid', { flip: true }), pp('person.walker', 1400, 860, 430)],
        actors: [go('boat.dinghy', 600, 1, 5, 430, 'mid', { s: 0.52, loop: 'pingpong', reflect: true }), go('person.cyclist', 700, 1, 20, 430), go('person.walker', 760, -1, 12, 430), go('person.dog-walker', 820, 1, 9, 430), go('person.jogger', 860, -1, 16, 430)],
        flocks: [fl('bird.gull', 6, [200, 130, 1400, 300], 26, 0.5), fl('bird.small-flight', 4, [300, 200, 1300, 330], 22, 0.6, 'mid')],
        scatter: [sc('tree.bank-alder', 'near', [-150, 660, 1750, 690], 8, 200, [0.6, 0.8], { reflect: true }), sc('plant.reed', 'mid', [-150, 560, 1750, 580], 16, 50, [0.4, 0.6], { reflect: true }), sc('bird.mallard', 'mid', [200, 530, 1400, 572], 4, 140, [0.32, 0.4], { reflect: true }), sc('street.lamp', 'near', [-150, 740, 1750, 760], 6, 260, [0.7, 0.9])] },
      [['plant.grass', 'plant.reed'], ['plant.grass', 'plant.bracken']], true),
    // 20 Stockport viaduct: the brick arches across the valley, the river below, a kayaker and bank trees
    row('stockport-viaduct', ST, 'Stockport viaduct', 'heritage', 'red', ['stockport', 'viaduct', 'brick', 'railway'], 'stockport-viaduct', 'wide', 'The brick viaduct over the river, a kayaker below',
      { lat: 53.4053, lon: -2.1617, heading: 150, at: 'afternoon', horizon: 460, ground: 'towpath', water: 'canal' },
      { place: [at('landmark.stockport-viaduct', 1000, 520, 380, 'mid', { reflect: true }), at('tree.bank-alder', 220, 610, 300, 'near'), at('tree.bank-willow', 1480, 640, 320, 'near', { flip: true }), at('rock.stones', 620, 760, 60, 'near')],
        actors: [go('person.kayaker', 590, 1, 10, 460, 'mid', { s: 0.6, loop: 'pingpong', reflect: true }), go('person.walker', 760, 1, 12, 460), go('person.dog-walker', 820, -1, 10, 460), go('person.cyclist', 740, -1, 20, 460)],
        flocks: [fl('bird.gull', 6, [180, 140, 1400, 300], 24, 0.5), fl('bird.small-flight', 4, [300, 220, 1300, 330], 20, 0.6, 'mid'), fl('bird.gull', 3, [200, 300, 1300, 380], 20, 0.5, 'mid')],
        scatter: [sc('plant.reed', 'mid', [-150, 560, 1750, 580], 16, 50, [0.4, 0.6], { reflect: true }), sc('bird.mallard', 'mid', [260, 540, 1300, 574], 4, 140, [0.32, 0.4], { reflect: true }), sc('rock.boulder', 'near', [-150, 770, 1750, 790], 8, 160, [0.4, 0.7])] },
      [['plant.towpath-hedge', 'rock.boulder'], ['plant.grass', 'plant.towpath-hedge']], true),
  ];
})();
