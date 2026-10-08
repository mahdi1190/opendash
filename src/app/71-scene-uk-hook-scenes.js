/* ============================================================
   COMPOSED SCENES: the Hook area, Hampshire (Hook village and station, the
   Basingstoke Canal at North Warnborough and Greywell, the Greywell Tunnel,
   the River Whitewater, the fields and woods round Hook).
   docs/dev/SCENE_ENGINE.md 3 and 8. One data row per scene, built by the
   hook-country archetype (70-scene-lib-area-hook.js). Data only (PURE): the
   season comes from the date ('auto'), the light from the live sky.
   Registered by 72-anim-pack-uk-area-hook.js.
   ============================================================ */
(function () {
  if (typeof sceneAdd !== 'function' || typeof sceneTableDefine !== 'function') return;
  const PACK = 'uk-area-hook';
  // the archetype params first (they go into the table), then the item fields
  const COLS = ['id', 'form', 'lat', 'lon', 'heading', 'horizon', 'at', 'landmark', 'lmx', 'lms', 'lmy', 'vx', 'side', 'fronty', 'sign', 'signx', 'features',
    'label', 'site', 'ukKind', 'place', 'colour', 'mood', 'tags'];
  const NP = 17;
  const LM = { inn: 'landmark.hook-coaching-inn', st: 'landmark.hook-station', tun: 'landmark.greywell-tunnel-portal', cas: 'landmark.odiham-castle', oak: 'tree.ancient-oak' };
  const ROWS = [
    // ---- Hook village: the London Road high street
    ['hook-high-street', 'street', 51.2786, -0.9618, 20, 460, 'afternoon', LM.inn, 800, 0.95, null, null, null, 610, null, null, '',
      'Hook high street', 'The coaching inn on the London Road, Hook', 'heritage', 'hook-high-street', 'red', 'cosy', 'hook|high street|london road|coaching inn|village'],
    ['hook-high-street-dusk', 'street', 51.2788, -0.9624, 60, 470, 'dusk', LM.inn, 620, 0.9, null, null, null, 620, null, null, '',
      'Hook high street at dusk', 'Lit windows on the London Road, Hook', 'heritage', 'hook-high-street', 'amber', 'cosy', 'hook|high street|evening|coaching inn|village'],
    // ---- Hook station on the South Western main line
    ['hook-station', 'station', 51.2800, -0.9614, 340, 440, 'morning', LM.st, 1100, 1.3, null, null, null, 590, 'Hook', 520, '',
      'Hook station', 'Trains on the main line at Hook station', 'heritage', 'hook-station', 'slate', 'cheerful', 'hook|station|railway|main line|trains'],
    ['hook-station-evening', 'station', 51.2801, -0.9608, 320, 450, 'golden', LM.st, 480, 1.25, null, null, null, 600, 'Hook', 1150, '',
      'Evening at Hook station', 'A London train through Hook in the evening', 'heritage', 'hook-station', 'amber', 'calm', 'hook|station|railway|evening|commuters'],
    // ---- the Basingstoke Canal: the Greywell Tunnel and its bats, Odiham Castle, North Warnborough
    ['greywell-tunnel', 'tunnel', 51.2597, -0.9650, 250, 470, 'afternoon', LM.tun, 800, 0.66, null, 800, 'left', null, null, null, 'angler',
      'The Greywell Tunnel', 'The canal runs into the Greywell Tunnel', 'heritage', 'greywell-tunnel', 'green', 'calm', 'greywell|basingstoke canal|tunnel|towpath|bats'],
    ['greywell-tunnel-dusk', 'tunnel', 51.2598, -0.9646, 255, 480, 'dusk', LM.tun, 760, 0.64, null, 760, 'right', null, null, null, 'birdwatcher',
      'Bats at the Greywell Tunnel', 'Bats leave the Greywell Tunnel roost at dusk', 'landscape', 'greywell-tunnel', 'blue', 'dreamy', 'greywell|basingstoke canal|tunnel|bats|dusk|nature reserve'],
    ['odiham-castle-canal', 'canal', 51.2626, -0.9575, 330, 470, 'afternoon', LM.cas, 1050, 0.85, null, null, null, null, null, null, 'boat|heron',
      "Odiham Castle by the canal", "King John's Castle from the Basingstoke Canal towpath", 'heritage', 'odiham-castle', 'green', 'calm', 'odiham castle|north warnborough|basingstoke canal|castle|ruin'],
    ['odiham-castle-evening', 'canal', 51.2631, -0.9560, 230, 480, 'golden', LM.cas, 520, 0.8, null, null, null, null, null, null, 'moored|angler',
      'Evening at Odiham Castle', 'The ruined keep beside the canal in evening light', 'heritage', 'odiham-castle', 'amber', 'dreamy', 'odiham castle|basingstoke canal|evening|ruin'],
    ['north-warnborough-canal', 'canal', 51.2655, -0.9530, 200, 470, 'morning', LM.cas, 1320, 0.62, null, null, null, null, null, null, 'moored|boat|bench|bridge',
      'The canal at North Warnborough', 'Narrowboats on the Basingstoke Canal at North Warnborough', 'landscape', 'north-warnborough-canal', 'teal', 'cheerful', 'north warnborough|basingstoke canal|narrowboat|towpath'],
    // ---- the River Whitewater: a chalk stream through Greywell and North Warnborough
    ['river-whitewater', 'river', 51.2585, -0.9688, 200, 470, 'noon', LM.oak, 1220, 0.42, null, null, null, null, null, null, 'cattle|heron|flowers',
      'The River Whitewater', 'The River Whitewater at Greywell', 'landscape', 'river-whitewater', 'teal', 'calm', 'river whitewater|greywell|chalk stream|trout|water meadow'],
    ['river-whitewater-meadows', 'river', 51.2652, -0.9600, 100, 480, 'golden', LM.oak, 420, 0.4, null, null, null, null, null, null, 'cattle|bridge|angler',
      'Whitewater meadows', 'Water meadows by the Whitewater, North Warnborough', 'landscape', 'river-whitewater', 'amber', 'dreamy', 'river whitewater|north warnborough|water meadow|chalk stream'],
    // ---- the fields and woods round Hook
    ['hook-fields-main-line', 'fields', 51.2835, -0.9440, 10, 460, 'afternoon', LM.oak, 1200, 0.42, null, null, 'right', null, null, null, 'train|tractor',
      'Fields by the main line', 'Trains through the fields east of Hook', 'landscape', 'hook-fields', 'green', 'cheerful', 'hook|farmland|main line|trains|hedgerows'],
    ['butter-wood', 'fields', 51.2745, -0.9885, 290, 470, 'morning', LM.oak, 1150, 0.46, null, null, 'left', null, null, null, 'bluebells|deer',
      'Butter Wood', 'The wood edge and meadows at Butter Wood near Hook', 'landscape', 'hook-woods', 'green', 'calm', 'hook|butter wood|bluebells|woodland|nature reserve'],
    ['hook-common', 'fields', 51.2705, -0.9790, 160, 470, 'golden', LM.oak, 1000, 0.4, null, null, 'right', null, null, null, 'sheep|deer',
      'Hook Common', 'Evening over Hook Common', 'landscape', 'hook-woods', 'amber', 'dreamy', 'hook|common|heath|meadow|evening'],
  ];
  sceneTableDefine('uk-hook', { cols: COLS.slice(0, NP), lists: ['features'], rows: ROWS.map(r => r.slice(0, NP).map((v, i) => i === 0 ? 'hampshire-' + v : v)) });
  const rows = sceneTable('uk-hook');
  ROWS.forEach((r, i) => {
    const o = Object.fromEntries(COLS.map((c, k) => [c, r[k]]));
    const id = 'hampshire-' + o.id, params = {};
    for (const [k, v] of Object.entries(rows[i])) if (v != null && v !== '' && !(Array.isArray(v) && !v.length)) params[k] = v;
    params.id = id;
    sceneAdd(PACK, { id, label: o.label, site: o.site || o.label, ukKind: o.ukKind, ukPlace: o.place, colour: o.colour, mood: o.mood, intensity: 'subtle',
      tags: o.tags.split('|'), lat: o.lat, lon: o.lon }, () => sceneFromArchetype('hook-country', params, {}));
  });
})();
