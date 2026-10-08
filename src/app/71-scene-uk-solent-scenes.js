/* ============================================================
   COMPOSED SCENES, the Solent area: Portsmouth Harbour, the Historic Dockyard, Southsea
   seafront, Gosport, Lee-on-the-Solent and Southampton's docks and Southampton Water.
   One row per scene on the archetype 'solent-shore' (71-scene-uk-solent-0arch.js), objects
   from the Solent area kit (70-scene-lib-area-solent.js) and the shared library. Each scene
   is a thunk (built only when shown or linted); the season comes from the date ('auto'), the
   light from the live sky. Registered by 72-anim-pack-uk-area-coast.js (pack uk-area-coast).
   The first three rows rebuild the hand-drawn South East items with the same ids, labels and
   captions: hampshire-portsmouth-harbour, hampshire-solent-ferry, hampshire-southampton-liner.
   ============================================================ */
(function () {
  if (typeof sceneAdd !== 'function' || typeof sceneArchetype !== 'function' || !sceneArchetype('solent-shore')) return;
  const PACK = 'uk-area-coast';
  const ROWS = [
    // ---- the rebuilt items (ids, labels and captions kept) ----
    { meta: { id: 'hampshire-portsmouth-harbour', label: 'The Spinnaker Tower and HMS Victory', site: 'The Spinnaker Tower and HMS Victory, Portsmouth', mood: 'proud', colour: 'blue', town: 'Portsmouth',
      tags: ['portsmouth', 'spinnaker tower', 'hms victory', 'harbour'] },
      row: { lat: 50.796, lon: -1.116, heading: 95, horizon: 520, at: 'afternoon', shore: 'quay', far: 'town',
        hero: ['spinnaker@960@532@380', 'victory@470@536@150'],
        extra: ['store@250@532@46', 'store@660@534@40@mid@flip'],
        boats: ['ferry@0.45@1@14@1.3', 'yacht@0.25@-1@8', 'tug@0.7@-1@10@1.2', 'carferry@0.1@1@6@1.2'] } },
    { meta: { id: 'hampshire-solent-ferry', label: 'The Isle of Wight ferry on the Solent', site: 'The Isle of Wight ferry, the Solent', mood: 'cheerful', colour: 'teal', town: 'Portsmouth',
      tags: ['solent', 'isle of wight', 'ferry', 'sea'] },
      row: { lat: 50.778, lon: -1.088, heading: 185, horizon: 500, at: 'day', shore: 'beach', far: 'island', hills: 40,
        hero: ['carferry@820@640@200', 'seafort@1210@512@30'],
        boats: ['yacht@0.2@-1@7', 'yacht@0.32@1@6@0.9', 'hover@0.12@-1@22', 'boxship@0.02@1@4@0.7'] } },
    { meta: { id: 'hampshire-southampton-liner', label: 'A liner leaving Southampton', site: 'A liner leaving Southampton', mood: 'proud', colour: 'indigo', town: 'Southampton',
      tags: ['southampton', 'liner', 'docks', 'southampton water'] },
      row: { lat: 50.896, lon: -1.408, heading: 165, horizon: 500, at: 'golden', shore: 'quay', far: 'docks', shoreAt: 0.55,
        hero: ['liner@760@630@210'],
        boats: ['tug@0.62@1@4@1.3', 'yacht@0.8@-1@8@1.1', 'tug@0.2@-1@6'] } },
    // ---- new views ----
    { meta: { id: 'hampshire-spinnaker-gunwharf', label: 'The Spinnaker Tower at Gunwharf Quays', site: 'The Spinnaker Tower from the Gunwharf waterfront, Portsmouth', mood: 'proud', colour: 'indigo', town: 'Portsmouth',
      tags: ['portsmouth', 'spinnaker tower', 'gunwharf', 'harbour', 'evening'] },
      row: { lat: 50.795, lon: -1.108, heading: 270, horizon: 600, shoreAt: 0.35, at: 'dusk', shore: 'quay', far: 'town', walkers: 4,
        hero: ['spinnaker@880@762@620@near'],
        boats: ['ferry@0.4@-1@12', 'yacht@0.7@1@7', 'taxi@0.2@1@16'] } },
    { meta: { id: 'hampshire-spinnaker-from-gosport', label: 'Portsmouth Harbour from Gosport', site: 'The Spinnaker Tower across Portsmouth Harbour from the Gosport waterfront', mood: 'calm', colour: 'amber', town: 'Gosport',
      tags: ['gosport', 'portsmouth', 'spinnaker tower', 'harbour', 'ferry'] },
      row: { lat: 50.793, lon: -1.118, heading: 80, horizon: 540, at: 'golden', shore: 'prom', far: 'town',
        hero: ['spinnaker@720@552@330'],
        extra: ['fort@1180@554@44@mid'],
        boats: ['ferry@0.5@1@12@1.3', 'ferry@0.3@-1@10@1.1', 'yacht@0.15@1@6', 'carferry@0.06@-1@5@1.2'] } },
    { meta: { id: 'hampshire-historic-dockyard', label: 'HMS Victory at the Historic Dockyard', site: 'HMS Victory in her dry dock among the Georgian storehouses, Portsmouth Historic Dockyard', mood: 'proud', colour: 'amber', town: 'Portsmouth',
      tags: ['portsmouth', 'hms victory', 'historic dockyard', 'heritage', 'ship'] },
      row: { lat: 50.802, lon: -1.112, heading: 60, horizon: 560, at: 'morning', shore: 'quay', far: 'town', shoreAt: 0.4,
        hero: ['victory@790@584@300'],
        extra: ['store@230@580@84', 'store@1330@582@76@mid@flip', 'crane@1530@584@120'],
        boats: ['tug@0.45@1@6', 'taxi@0.7@-1@14', 'yacht@0.85@1@7@1.2'] } },
    { meta: { id: 'hampshire-southsea-seafront', label: 'Southsea seafront', site: 'The promenade, the pier and the Solent at Southsea', mood: 'cheerful', colour: 'teal', town: 'Portsmouth',
      tags: ['southsea', 'seafront', 'pier', 'promenade', 'solent'] },
      row: { lat: 50.781, lon: -1.083, heading: 200, horizon: 500, at: 'noon', shore: 'prom', far: 'island', shoreAt: 0.45,
        extra: ['pier@1290@664@180@mid'],
        boats: ['hover@0.4@-1@20@1.4', 'yacht@0.2@1@7', 'carferry@0.08@1@5@1.2', 'yacht@0.6@-1@6@1.1'] } },
    { meta: { id: 'hampshire-southsea-castle', label: 'Southsea Castle', site: 'Southsea Castle on the shingle, looking out over the Solent', mood: 'calm', colour: 'slate', town: 'Portsmouth',
      tags: ['southsea', 'castle', 'beach', 'shingle', 'solent', 'heritage'] },
      row: { lat: 50.778, lon: -1.089, heading: 220, horizon: 500, at: 'afternoon', shore: 'beach', far: 'island',
        hero: ['fort@640@760@180@near'],
        boats: ['yacht@0.35@1@7@1.2', 'yacht@0.55@-1@6@1.1', 'carferry@0.1@-1@6@1.2', 'fishing@0.7@1@5'] } },
    { meta: { id: 'hampshire-round-tower', label: 'The Round Tower, Old Portsmouth', site: 'The Round Tower at the harbour mouth, Old Portsmouth', mood: 'calm', colour: 'blue', town: 'Portsmouth',
      tags: ['portsmouth', 'round tower', 'harbour mouth', 'old portsmouth', 'heritage'] },
      row: { lat: 50.791, lon: -1.108, heading: 285, horizon: 520, at: 'day', shore: 'quay', far: 'town', walkers: 4,
        hero: ['fort@330@742@230@near'],
        extra: ['spinnaker@1240@532@250'],
        boats: ['carferry@0.45@1@7@1.5', 'yacht@0.2@-1@8', 'ferry@0.7@-1@12@1.2'] } },
    { meta: { id: 'hampshire-southsea-hovercraft', label: 'The hovercraft at Southsea', site: 'The hovercraft crossing from Southsea to Ryde', mood: 'energetic', colour: 'teal', town: 'Portsmouth',
      tags: ['southsea', 'hovercraft', 'ryde', 'beach', 'solent'] },
      row: { lat: 50.783, lon: -1.093, heading: 190, horizon: 490, at: 'morning', shore: 'beach', far: 'island', hills: 44,
        hero: ['hover@1120@790@190@near'],
        boats: ['hover@0.55@1@24@1.6', 'hover@0.15@-1@20@1.3', 'yacht@0.3@1@6', 'carferry@0.05@1@5@1.1'] } },
    { meta: { id: 'hampshire-solent-forts', label: 'The Solent forts', site: 'The round sea forts standing in the Solent', mood: 'dreamy', colour: 'amber', town: 'Portsmouth',
      tags: ['solent', 'sea forts', 'yachts', 'beach', 'sea', 'heritage'] },
      row: { lat: 50.782, lon: -1.055, heading: 175, horizon: 520, at: 'golden', shore: 'beach', far: 'island', hills: 30,
        hero: ['seafort@780@612@180', 'seafort@1360@530@40'],
        boats: ['yacht@0.25@1@6', 'yacht@0.45@-1@7@1.1', 'yacht@0.62@1@5@1.2', 'carferry@0.06@-1@5'] } },
    { meta: { id: 'hampshire-southampton-docks', label: 'Southampton container port', site: 'Cranes and a container ship at the Southampton docks', mood: 'proud', colour: 'blue', town: 'Southampton',
      tags: ['southampton', 'docks', 'cranes', 'container ship', 'port'] },
      row: { lat: 50.915, lon: -1.45, heading: 220, horizon: 520, at: 'day', shore: 'quay', far: 'docks',
        extra: ['crane@1290@716@400@near', 'boxes@1530@760@70@near', 'crane@220@712@340@near@flip'],
        boats: ['boxship@0.35@1@3@1.6', 'tug@0.6@-1@7@1.2', 'tug@0.12@1@5'] } },
    { meta: { id: 'hampshire-mayflower-park', label: 'Mayflower Park, Southampton', site: 'A cruise ship at her berth across the water from Mayflower Park', mood: 'calm', colour: 'green', town: 'Southampton',
      tags: ['southampton', 'mayflower park', 'cruise ship', 'southampton water', 'park'] },
      row: { lat: 50.899, lon: -1.413, heading: 200, horizon: 520, at: 'afternoon', shore: 'prom', far: 'docks',
        hero: ['liner@800@574@200'],
        boats: ['carferry@0.5@-1@7@1.2', 'yacht@0.75@1@7@1.1', 'tug@0.25@1@5'] } },
    { meta: { id: 'hampshire-gosport-ferry', label: 'The Gosport ferry', site: 'The little harbour ferry crossing between Gosport and Portsmouth', mood: 'cheerful', colour: 'blue', town: 'Gosport',
      tags: ['gosport', 'ferry', 'portsmouth harbour', 'spinnaker tower', 'harbour'] },
      row: { lat: 50.794, lon: -1.12, heading: 70, horizon: 520, at: 'morning', shore: 'quay', far: 'town', shoreAt: 0.55,
        hero: ['spinnaker@1180@532@300'],
        boats: ['ferry@0.6@1@12@1.8', 'ferry@0.3@-1@10@1.2', 'taxi@0.15@1@14', 'yacht@0.8@-1@6@1.2'] } },
    { meta: { id: 'hampshire-lee-on-the-solent', label: 'Lee-on-the-Solent', site: 'The long shingle shore at Lee-on-the-Solent, looking to the Isle of Wight', mood: 'calm', colour: 'teal', town: 'Gosport',
      tags: ['lee-on-the-solent', 'gosport', 'beach', 'shingle', 'solent', 'isle of wight'] },
      row: { lat: 50.802, lon: -1.2, heading: 200, horizon: 500, at: 'afternoon', shore: 'beach', far: 'island', hills: 48,
        hero: ['liner@900@566@185'],
        boats: ['boxship@0.04@-1@4@0.7', 'yacht@0.3@1@6', 'yacht@0.5@-1@7@1.1', 'hover@0.12@1@18'] } },
    { meta: { id: 'hampshire-southsea-night', label: 'Southsea seafront at night', site: 'The pier lit up along Southsea seafront on a clear night', mood: 'dreamy', colour: 'indigo', town: 'Portsmouth',
      tags: ['southsea', 'seafront', 'pier', 'night', 'promenade', 'solent'] },
      row: { lat: 50.78, lon: -1.07, heading: 160, horizon: 510, at: 'night', shore: 'prom', far: 'island', walkers: 3,
        extra: ['pier@640@668@180@mid@flip', 'seafort@1300@522@30'],
        boats: ['carferry@0.15@1@6@1.2', 'hover@0.4@-1@18@1.2', 'yacht@0.6@1@5'] } },
    { meta: { id: 'hampshire-town-quay', label: 'Town Quay, Southampton', site: 'The island car ferry leaving Town Quay on Southampton Water', mood: 'calm', colour: 'amber', town: 'Southampton',
      tags: ['southampton', 'town quay', 'ferry', 'isle of wight', 'southampton water'] },
      row: { lat: 50.895, lon: -1.405, heading: 150, horizon: 510, at: 'dusk', shore: 'quay', far: 'docks',
        hero: ['carferry@620@664@190'],
        boats: ['liner@0.08@-1@2@0.8', 'yacht@0.3@-1@6', 'tug@0.75@1@6@1.2'] } },
  ];
  for (const { meta, row } of ROWS) {
    const params = Object.assign({ id: meta.id }, row);
    sceneAdd(PACK, Object.assign({ tags: [] }, meta, { tags: [...new Set(['uk', 'south east', 'hampshire', 'solent', 'coast'].concat(meta.tags))], ukTown: meta.town, liveSky: { lat: row.lat, lon: row.lon } }),
      () => sceneFromArchetype('solent-shore', params, {}));
  }
})();
