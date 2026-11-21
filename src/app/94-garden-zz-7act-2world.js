/* ============================================================
   THE DRAWINGS OF PLACEABLE THINGS AND OF THE PARTS A KIND CARRIES (round 3, "player" branch; made general 20 Nov 2026).
   Nothing here says where anything is. A placeable thing (a ball, a campfire, a log seat, a telescope, a busker's pitch, a basket) is a row of
   layout data (assets/garden/vale-things.json, or a layout's own `things`) of a kind whose `art` names a drawing below; it is drawn wherever
   that row puts it, standing in the world all the time, with a base that meets the ground, a contact shadow and wear or growth at its foot.
   A kind's part with an `art` (GARDEN_KINDS lighthouse: a ladder up its side) is drawn on every thing of that kind, fixed to its footprint.
   gardenActWorldProps(sc, o) -> rows for gardenWorldProps (94-garden-fish-1world.js): [{z, x, html}] in world px.
   gardenActWorldRows()       -> what is drawn: [{ id, kind, art, x, y (cells, the foot), row (the part's own numbers) }].
   ============================================================ */
const _GAW_ART = Object.freeze({
  scope: () => '<ellipse cx="0" cy="1" rx="13" ry="3.2" fill="#1a1408" opacity="0.22"/><path d="M-12 1q4 -3 9 -1q5 -2 9 0q5 -1 7 1" stroke="#6a8a3a" stroke-width="1.4" fill="none" opacity="0.8"/>'
    + '<path d="M0 -24L-9 0M0 -24L9 0M0 -24L1 1" stroke="#5a3e22" stroke-width="1.8" stroke-linecap="round"/><path d="M-9 0h-1.6M9 0h1.6" stroke="#2a1e10" stroke-width="1.4"/>'
    + '<circle cx="0" cy="-25" r="2.2" fill="#8a6a2a" stroke="#3a2810" stroke-width="0.6"/>'
    + '<g transform="translate(0 -26) rotate(-16)"><rect x="-9" y="-2.4" width="22" height="4.8" rx="1.4" fill="#c89838" stroke="#6a4a14" stroke-width="0.7"/><rect x="-9" y="-2.4" width="22" height="1.6" rx="0.8" fill="#f0d47a" opacity="0.7"/><rect x="12" y="-3.3" width="5" height="6.6" rx="1" fill="#b08428" stroke="#6a4a14" stroke-width="0.7"/><circle cx="17" cy="0" r="2.1" fill="#9ad0e8" opacity="0.8"/><rect x="-12" y="-1.6" width="3.4" height="3.2" rx="0.8" fill="#4a3418"/><path d="M2 -2.4v4.8M7 -2.4v4.8" stroke="#8a6420" stroke-width="0.7"/></g>',
  // world px: rungs every 5.56 px (9.4 of the figure's units at its scale), the landing 79 px up, bracketed to the wall
  ladder: (o, inUse, row) => { const S = typeof GW_SCALE === 'number' ? GW_SCALE : 0.592, top = ((row && row.top) || GA_LADDER.top) * S, N = Math.max(4, Math.round((((row && row.top) || GA_LADDER.top) - GA_LADDER.first) / GA_LADDER.gap) + 1), g = GA_LADDER.gap * S, f = GA_LADDER.first * S; let r = '';
    const LT = row && row.deck ? Math.max(20, -row.deck.yf + row.deck.rh * 0.8) : top;   // (up to a landing: the ladder stops a hand's reach over its front edge)
    for (let i = 0; i < N; i++) if (f + i * g < LT - 1) r += `<path d="M-5.2 ${_gawN(-f - i * g)}H5.2" stroke="#8a6a40" stroke-width="1.3"/>`;
    // a hay-loft door in the wall at the landing (the barn): a dark doorway, hay spilling over its sill, the door swung open to one side
    const loft = row && row.loft ? `<path d="M-14 ${_gawN(-top - 1)}V${_gawN(-top - 32)}Q0 ${_gawN(-top - 38)} 14 ${_gawN(-top - 32)}V${_gawN(-top - 1)}z" fill="#2a1a10" stroke="#5a2a1a" stroke-width="1.2"/><path d="M-15 ${_gawN(-top - 1)}h30v2.4h-30z" fill="#6a4428"/><path d="M-10 ${_gawN(-top - 2)}q4 -7 9 -4q4 -5 10 2z" fill="#e8c460"/><path d="M-8 ${_gawN(-top - 4)}l3 -4M-2 ${_gawN(-top - 5)}l1 -5M4 ${_gawN(-top - 4)}l3 -4" stroke="#c89a38" stroke-width="0.8"/><path d="M14 ${_gawN(-top - 1)}l10 2V${_gawN(-top - 30)}l-10 -2z" fill="#a8382a" stroke="#5a1a14" stroke-width="0.7"/><path d="M15 ${_gawN(-top - 8)}l8 1.6M15 ${_gawN(-top - 22)}l8 1.6" stroke="#f0e0c8" stroke-width="0.9" opacity="0.8"/>` : '';
    // (height: a ladder up to a floor, the lighthouse's gallery, has no landing of its own: the floor is the landing; up to a loft door, the sill is)
    const landing = row && (row.bare || row.loft) ? '' : `<path d="M-13 ${_gawN(-top - 3)}h26v3.4h-26z" fill="#8a6438" stroke="#4a3218" stroke-width="0.6"/><path d="M-13 ${_gawN(-top + 0.4)}h26" stroke="#5a3e22" stroke-width="1"/><path d="M-12 ${_gawN(-top + 0.4)}l4 7M12 ${_gawN(-top + 0.4)}l-4 7" stroke="#6a4a2a" stroke-width="1.4"/>`
      + `<path d="M-12 ${_gawN(-top - 3)}V${_gawN(-top - 18)}M12 ${_gawN(-top - 3)}V${_gawN(-top - 18)}M-12 ${_gawN(-top - 17)}H12M-12 ${_gawN(-top - 10)}H12" stroke="#7a5a36" stroke-width="1.3" stroke-linecap="round"/>`;
    // (height: up to a loft door, a landing of boards on two brackets out from the wall, a rail along its front with the ladder's gap:
    // the hay loft's floor, 94-garden-zz-7act-3height.js, whose numbers it is drawn from so the rail drawn again over your legs matches)
    let deck = '';
    if (row && row.loft && row.deck) { const D = row.deck, x0 = _gawN(D.x0), x1 = _gawN(D.x1), yb = _gawN(D.yb), yf = _gawN(D.yf), rh = D.rh, g0 = D.g0, g1 = D.g1; let pl = '', ps = '';
      for (let y = D.yb + 3.4; y < D.yf - 1; y += 3.4) pl += `M${x0} ${_gawN(y)}H${x1}`;   // (boards along the wall, seen from above)
      for (const x of D.posts) ps += `M${_gawN(x)} ${_gawN(D.yf - 0.5)}v${_gawN(-rh)}`;
      deck = `<path d="M${x0 + 4} ${_gawN(D.yf + 3)}L${x0 + 4} ${_gawN(D.yf + 15)}L${x0 + 12} ${_gawN(D.yf + 3)}M${x1 - 4} ${_gawN(D.yf + 3)}L${x1 - 4} ${_gawN(D.yf + 15)}L${x1 - 12} ${_gawN(D.yf + 3)}" stroke="#5a3e22" stroke-width="2.2" fill="none"/>`
        + `<ellipse cx="${_gawN((D.x0 + D.x1) / 2)}" cy="${_gawN(D.yf + 6)}" rx="${_gawN((D.x1 - D.x0) / 2)}" ry="4" fill="#1a1408" opacity="0.18"/>`
        + `<path d="M${x0} ${yb}H${x1}V${yf}H${x0}Z" fill="#a27c4e" stroke="#4a3218" stroke-width="0.6"/><path d="${pl}" stroke="#6e5030" stroke-width="0.7" opacity="0.7"/><path d="M${x0} ${_gawN(D.yb + 1)}H${x1}" stroke="#5a3e22" stroke-width="1.4" opacity="0.5"/>`
        + `<path d="M${x0} ${yf}H${x1}v3.2H${x0}Z" fill="#6a4a2a"/><path d="M${x0} ${yf}H${x1}" stroke="#c8a070" stroke-width="0.7" opacity="0.8"/>`
        + `<path d="M${x0 + 0.6} ${yb}V${_gawN(D.yf - rh)}M${x1 - 0.6} ${yb}V${_gawN(D.yf - rh)}" stroke="${D.col}" stroke-width="1.2" opacity="0.8"/>`
        + `<path d="M${x0 + 0.6} ${_gawN(D.yb - rh)}L${x0 + 0.6} ${_gawN(D.yf - rh)}M${x1 - 0.6} ${_gawN(D.yb - rh)}L${x1 - 0.6} ${_gawN(D.yf - rh)}" stroke="${D.col}" stroke-width="${D.w}" stroke-linecap="round"/>`
        + `<path d="${ps}" stroke="${D.col}" stroke-width="${D.pw}" fill="none"/><path d="M${x0} ${_gawN(D.yf - rh)}H${_gawN(g0)}M${_gawN(g1)} ${_gawN(D.yf - rh)}H${x1}" stroke="${D.col}" stroke-width="${D.w}" stroke-linecap="round"/>`; }
    const stays = row && row.bare ? [0.3, 0.62, 0.9].map(k => `<path d="M-6 ${_gawN(-top * k)}l-3 -3M6 ${_gawN(-top * k)}l3 -3" stroke="#4a4e50" stroke-width="1.2"/>`).join('') : '';
    return loft + deck + `<ellipse cx="0" cy="1" rx="9" ry="2.2" fill="#1a1408" opacity="0.2"/>` + landing + stays
      + `<path d="M-5.4 0L-4.8 ${_gawN(-LT)}M5.4 0L4.8 ${_gawN(-LT)}" stroke="#7a5a36" stroke-width="1.6" stroke-linecap="round"/><path d="M-4.4 0L-3.9 ${_gawN(-LT)}" stroke="#a8844e" stroke-width="0.5" opacity="0.8"/>${r}<path d="M-8 0q2 -3 4 -1M5 0q2 -3 3 0" stroke="#6a8a3a" stroke-width="1.2" fill="none"/>`; },
  fire: (o) => { const still = o && o.still;
    return '<ellipse cx="0" cy="1" rx="17" ry="5" fill="#1a1408" opacity="0.24"/><ellipse cx="0" cy="-1" rx="12" ry="3.6" fill="#3a2a1a" opacity="0.8"/>'
      + [[-12, 0], [-8, -3.4], [0, -4.4], [8, -3.4], [12, 0], [7, 3], [-1, 3.6], [-8, 3]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="3.4" ry="2.4" fill="${i % 2 ? '#8a8478' : '#a8a294'}" stroke="#4a463c" stroke-width="0.5"/>`).join('')
      + '<path d="M-7 0L6 -3.2M-5 -3L7 1" stroke="#5a3a22" stroke-width="2.6" stroke-linecap="round"/><path d="M-7 0L6 -3.2" stroke="#8a5a32" stroke-width="0.8"/>'
      + `<g class="${still ? '' : 'gda-flicker'}"><path d="M-5 -1Q-6 -9 -1 -15Q0 -9 3 -12Q6 -6 4 -1z" fill="#f08a2a"/><path d="M-3 -1Q-3 -7 0 -10Q1 -6 2.6 -7Q3.4 -3 2 -1z" fill="#ffd060"/></g>`
      + `<g class="${still ? '' : 'gda-glow'}"><ellipse cx="0" cy="-4" rx="16" ry="9" fill="#ffb050" opacity="0.14"/></g>`
      + '<path d="M18 2q4 -2 10 -1q2 1 0 3q-5 1 -10 0z" fill="#6a4a2e" stroke="#3a2818" stroke-width="0.6"/><ellipse cx="27.6" cy="2.4" rx="1.6" ry="1.6" fill="#a87c4f"/>'; },
  ball: () => '<g transform="scale(1.35)"><ellipse cx="0" cy="1" rx="6" ry="1.8" fill="#1a1408" opacity="0.26"/><circle cx="0" cy="-4.6" r="5" fill="#f4efe4" stroke="#3a2a1a" stroke-width="0.7"/><path d="M-2 -7l2 -1.6l2 1.6l-0.8 2.4h-2.4z" fill="#2a2420"/><path d="M-4.6 -3.4l1.6 0.6M4.6 -3.4l-1.6 0.6M0 -1l0 1.6" stroke="#2a2420" stroke-width="0.7"/><ellipse cx="-1.8" cy="-6.6" rx="1.4" ry="0.8" fill="#ffffff" opacity="0.8"/><path d="M-7 1q2 -3 3 0M5 1q1 -3 3 -1" stroke="#5a8a32" stroke-width="1" fill="none"/></g>',
  leaves: () => { let s = '<ellipse cx="0" cy="1" rx="16" ry="4" fill="#1a1408" opacity="0.22"/>'; const C = ['#c8642a', '#e0a038', '#a8441e', '#d8862e', '#b8742a']; for (let i = 0; i < 26; i++) { const a = i * 2.4, r = (i % 7) * 1.9, x = Math.cos(a) * r * 1.6, y = -2 - Math.abs(Math.sin(a)) * r * 0.5 - (7 - i % 7) * 0.9; s += `<ellipse cx="${_gawN(x)}" cy="${_gawN(y)}" rx="3" ry="1.7" transform="rotate(${(i * 37) % 180} ${_gawN(x)} ${_gawN(y)})" fill="${C[i % 5]}" stroke="#6a3010" stroke-width="0.3"/>`; } return s; },
  // (music, 20 Nov) a band's pitch: four instruments laid out in a row on a worn patch, each with its own place to play it in front (GARDEN_KINDS
  // busker: the fiddle on its three-legged stool, the squeezebox on an upturned crate, the open fiddle case with coins and the tin whistle,
  // the frame drum stood on its rim against a sack). held: the places someone is playing now (94-garden-zz-7act-3music.js): that instrument
  // is in their hands, not here. World px at the pitch's foot, about 2.4 cells across.
  busker: (o, inUse, row, held) => { const H = (i) => !!(held ? held.has(i) : i === 0 && inUse);
    let s = '<ellipse cx="0" cy="1.5" rx="64" ry="9" fill="#5a4630" opacity="0.18"/><ellipse cx="-2" cy="1" rx="50" ry="6" fill="#3a2a1a" opacity="0.12"/>'
      + '<path d="M-62 3q2 -5 4 0M-30 5q1 -4 3 0M22 5q1 -4 3 0M60 3q2 -5 4 0M-8 6q1 -3 2 0" stroke="#5a8a32" stroke-width="1.1" fill="none" opacity="0.9"/><path d="M-57 4q1 -3 3 -1M56 4q1 -3 2 -1" stroke="#7aa840" stroke-width="0.9" fill="none"/>';
    // the stool and the fiddle
    s += '<ellipse cx="-44" cy="1" rx="10" ry="2.6" fill="#1a1408" opacity="0.26"/><path d="M-50 0.6L-46.4 -12M-38 0.6L-41.6 -12M-44 2L-44 -12" stroke="#5a3a1e" stroke-width="1.8" stroke-linecap="round"/><path d="M-48.4 -5.6h8.8" stroke="#4a2e16" stroke-width="1"/>'
      + '<ellipse cx="-44" cy="-12.6" rx="8" ry="2.6" fill="#8a6036" stroke="#3a2412" stroke-width="0.7"/><ellipse cx="-44.6" cy="-13.2" rx="5.4" ry="1.4" fill="#a87a48" opacity="0.7"/>';
    if (!H(0)) s += '<g transform="translate(-45 -15.6) rotate(-6)"><path d="M-6 0Q-6 -2.4 -4 -2.4Q-3 -1.6 -1.6 -2.2Q0 -3 1.6 -2.2Q3 -1.6 4 -2.4Q6 -2.4 6 0Q6 2.4 4 2.2Q3 1.4 1.6 2.2Q0 3 -1.6 2.2Q-3 1.4 -4 2.2Q-6 2.4 -6 0z" fill="#b0602c" stroke="#4a2210" stroke-width="0.6"/><path d="M6 0H13" stroke="#2a1a10" stroke-width="1.4"/><path d="M13 -0.8q2 0 2 0.8q0 0.8 -2 0.8" fill="#5a2a12"/><path d="M-5 -0.4H12M-5 0.4H12" stroke="#f0e6c8" stroke-width="0.25" opacity="0.8"/></g><path d="M-55 -14.4L-33 -16.6" stroke="#5a3e22" stroke-width="0.8" stroke-linecap="round"/><path d="M-55 -14.9L-33 -17.1" stroke="#f4eee0" stroke-width="0.35" opacity="0.8"/>';
    // the crate and the squeezebox
    s += '<ellipse cx="-15" cy="1" rx="11" ry="2.6" fill="#1a1408" opacity="0.28"/><path d="M-23 0V-11H-7V0z" fill="#9a7444" stroke="#4a3018" stroke-width="0.7"/><path d="M-23 -11L-20 -14H-4L-7 -11z" fill="#b48a54" stroke="#4a3018" stroke-width="0.6"/><path d="M-7 0V-11L-4 -14V-3z" fill="#7a5a32" stroke="#4a3018" stroke-width="0.6"/>'
      + '<path d="M-23 -5.6H-7M-23 -8.4H-7M-23 -2.8H-7" stroke="#6a4a26" stroke-width="0.6"/><path d="M-21.4 -10.4L-8.6 -0.6" stroke="#6a4a26" stroke-width="0.9"/>';
    if (!H(1)) s += '<g transform="translate(-13.4 -16.4)"><path d="M-6 -2.6H6V2.6H-6z" fill="#7a2a2a" stroke="#3a1010" stroke-width="0.4"/><path d="M-4 -2.6V2.6M-2 -2.6V2.6M0 -2.6V2.6M2 -2.6V2.6M4 -2.6V2.6" stroke="#d8b878" stroke-width="0.45"/><path d="M-10 -3.2H-6V3.2H-10L-11 0z" fill="#6a4426" stroke="#2a1808" stroke-width="0.5"/><path d="M10 -3.2H6V3.2H10L11 0z" fill="#6a4426" stroke="#2a1808" stroke-width="0.5"/><circle cx="-8.4" cy="-1.2" r="0.5" fill="#f0e6c8"/><circle cx="-8.4" cy="1" r="0.5" fill="#f0e6c8"/><circle cx="8.4" cy="-1.2" r="0.5" fill="#f0e6c8"/><circle cx="8.4" cy="1" r="0.5" fill="#f0e6c8"/></g>';
    // the open case: its lid up behind, the velvet, a few coins, and the whistle
    s += '<ellipse cx="14" cy="1" rx="15" ry="3" fill="#1a1408" opacity="0.26"/><path d="M1 -9.6Q0 -18 6 -19L23 -19Q28 -18 27 -9.6z" fill="#3a2430" stroke="#1a1018" stroke-width="0.7"/><path d="M3 -10.4Q3 -16.4 7 -17L21 -17Q25 -16.4 25 -10.4z" fill="#7a2a3a"/>'
      + '<path d="M0 0L28 0L26.6 -9.6L1.4 -9.6z" fill="#3a2430" stroke="#1a1018" stroke-width="0.7"/><path d="M2.6 -1.6L25.4 -1.6L24.6 -8.2L3.4 -8.2z" fill="#8a3040"/><path d="M3.4 -8.2L24.6 -8.2" stroke="#b04a58" stroke-width="0.6" opacity="0.8"/>'
      + '<circle cx="8" cy="-3.6" r="1.4" fill="#f0cc50" stroke="#9a7a20" stroke-width="0.3"/><circle cx="11" cy="-2.8" r="1.3" fill="#d8b040" stroke="#9a7a20" stroke-width="0.3"/><circle cx="21" cy="-3.2" r="1.2" fill="#c8c8c0" stroke="#7a7a72" stroke-width="0.3"/><circle cx="18.6" cy="-2.4" r="1.2" fill="#f0cc50" stroke="#9a7a20" stroke-width="0.3"/>';
    if (!H(2)) s += '<path d="M6 -6.4L22 -5.4" stroke="#d8d4c4" stroke-width="1.6" stroke-linecap="round"/><path d="M6 -6.4L9 -6.2" stroke="#2f5a3a" stroke-width="2" stroke-linecap="round"/><circle cx="13" cy="-6" r="0.35" fill="#3a3428"/><circle cx="15" cy="-5.9" r="0.35" fill="#3a3428"/><circle cx="17" cy="-5.8" r="0.35" fill="#3a3428"/>';
    // the sack, and the drum stood on its rim against it, its tipper by it
    s += '<ellipse cx="44" cy="1" rx="13" ry="3" fill="#1a1408" opacity="0.26"/><path d="M46 0.6Q42 -1 43 -8Q44 -14 48 -15Q47 -17 49 -17.4Q51 -17 50.4 -15Q55 -13 55 -7Q56 -1 52 0.6z" fill="#c8aa74" stroke="#6a5030" stroke-width="0.7"/><path d="M47.6 -15.2q2 1 3.4 0" stroke="#6a5030" stroke-width="0.6" fill="none"/><path d="M45 -6q4 1.4 8 0" stroke="#a88a58" stroke-width="0.5" fill="none"/>';
    if (!H(3)) s += '<g transform="translate(38.6 -9.6) rotate(-10)"><ellipse cx="0" cy="0" rx="7.6" ry="10.2" fill="#5a3a1e" stroke="#2a1808" stroke-width="0.7"/><ellipse cx="0.8" cy="0" rx="6.4" ry="9" fill="#e8d6a8"/><ellipse cx="-0.6" cy="-2.4" rx="3.4" ry="4" fill="#f6ead0" opacity="0.55"/></g><path d="M30 0.4L37.6 -1.2" stroke="#6a4424" stroke-width="1.4" stroke-linecap="round"/><circle cx="30" cy="0.4" r="0.9" fill="#4a2c14"/>';
    return s; },
  logseat: () => '<ellipse cx="0" cy="1" rx="25" ry="4.4" fill="#1a1408" opacity="0.26"/><path d="M-22 1Q-24 -10 -18 -11L18 -11Q23 -10 22 1Q0 4 -22 1z" fill="#6e4a2c" stroke="#3a2616" stroke-width="0.8"/>'
    + '<path d="M-18 -11L18 -11Q21 -10.4 21.6 -8L-20 -8Q-20 -10.4 -18 -11z" fill="#8e6a44"/><path d="M-16 -6.4Q-2 -5 14 -6.6M-14 -2.6Q2 -1.6 16 -3M-8 -9.4L6 -9.6" stroke="#4a301c" stroke-width="0.7" fill="none" opacity="0.8"/>'
    + '<ellipse cx="20.4" cy="-5" rx="3.6" ry="5.6" fill="#c89a62" stroke="#5a3a20" stroke-width="0.7"/><ellipse cx="20.4" cy="-5" rx="2.2" ry="3.6" fill="none" stroke="#9a7044" stroke-width="0.5"/><ellipse cx="20.4" cy="-5" rx="0.9" ry="1.5" fill="#9a7044"/>'
    + '<path d="M-21 -9Q-14 -12 -6 -10.6Q-12 -9.6 -21 -7z" fill="#6a8a36" opacity="0.85"/><path d="M-6 -11.4q1 -3 3 -1" stroke="#5a3a22" stroke-width="1" fill="none"/>'
    + '<path d="M-25 2q2 -5 4 0M-12 3q1 -4 2 0M8 3q1 -5 3 0M24 2q2 -5 3 0" stroke="#5a8a32" stroke-width="1.1" fill="none"/><path d="M-17 3q1 -3 3 -1" stroke="#7aa840" stroke-width="0.9" fill="none"/>',
  basket: () => '<ellipse cx="0" cy="1" rx="9" ry="2.4" fill="#1a1408" opacity="0.24"/><path d="M-7 -8H7L5.4 0H-5.4z" fill="#c8924a" stroke="#6a4218" stroke-width="0.7"/><path d="M-6.4 -5H6.4M-6 -2.4H6M-3 -8L-2.4 0M3 -8L2.4 0" stroke="#8a5a2a" stroke-width="0.6"/><path d="M-6 -8Q0 -16 6 -8" stroke="#8a5a2a" stroke-width="1.2" fill="none"/><circle cx="-2.6" cy="-9" r="2.2" fill="#d8452a"/><circle cx="1.8" cy="-9.4" r="2.2" fill="#7ac24a"/><circle cx="0" cy="-8.2" r="1.8" fill="#e8b830"/>',
  log: () => '<ellipse cx="0" cy="1" rx="14" ry="3" fill="#1a1408" opacity="0.24"/><path d="M-12 -1Q-13 -8 -9 -8L9 -8Q13 -8 12 -1Q0 1 -12 -1z" fill="#7a5432" stroke="#3a2818" stroke-width="0.7"/><ellipse cx="10" cy="-4.4" rx="3" ry="3.6" fill="#c8a070" stroke="#6a4a2a" stroke-width="0.6"/><ellipse cx="10" cy="-4.4" rx="1.4" ry="1.8" fill="none" stroke="#8a6440" stroke-width="0.5"/><path d="M-8 -6h12" stroke="#5a3a22" stroke-width="0.6"/>',
  bank: () => '<path d="M-26 -4Q-12 -9 0 -7Q14 -9 46 -4L48 2Q10 6 -28 2z" fill="#6a9a3a" opacity="0.9"/><path d="M-24 -2Q8 -6 44 -2" stroke="#8a6a3a" stroke-width="2.2" fill="none" opacity="0.7"/><path d="M-20 2q2 -5 4 0M-4 2q2 -6 3 0M14 2q1 -5 3 0M30 2q2 -6 3 0" stroke="#4a7a2a" stroke-width="1.1" fill="none"/><path d="M22 -6L26 -12M24 -6L22 -12" stroke="#6a4a2a" stroke-width="1"/>',
});
const _gawN = (v) => String(Math.round(v * 10) / 10);
/** Where a fixed thing is DRAWN (cells): { x (the drawn foot's middle), y (the layout's foot line), w (the drawn width) }. The native world's
 *  record of its picture first, else its painter's own box (a painter that draws at its own fixed size), else the kind's dw, else the
 *  layout's footprint. The parts a kind carries (a ladder) and their stand points are placed on this, so a resized footprint never moves
 *  a ladder off its wall. */
function gardenAffordDrawnBase(t) {
  const W = GARDEN_WORLD, K = (t && GARDEN_KINDS[t.kind]) || {};
  try {
    const w = window.GardenNative && GardenNative.world(), e = w && w.entities, rec = e instanceof Map ? e.get('prop:' + t.id) : null, b = rec && rec.bounds;
    if (b && b.width) { const f = rec.handle && rec.handle.foot; return { x: (f && Number.isFinite(f.x) ? f.x : b.x + b.width / 2) / W.cellW, y: t.y, w: b.width / W.cellW, from: 'drawn' }; }
  } catch (e) { /* no world yet */ }
  try {
    const P = window.GardenPaintedProps && GardenPaintedProps.paintTable, art = String(t.art || '').replace(/^l[df]-/, ''), box = P && (P['sight:' + art] || P[t.id] || P[art]) && (P['sight:' + art] || P[t.id] || P[art]).box;
    if (box) return { x: t.x, y: t.y, w: (box[2] - box[0]) / W.cellW, from: 'painter' };
  } catch (e) { /* no painter */ }
  if (K.dw) return { x: t.x, y: t.y, w: K.dw, from: 'kind' };
  return { x: t.x, y: t.y, w: t.w || 1, from: 'plan' };
}
/** What is drawn today: the placed things of a kind with a drawing, and the drawn parts of every found thing. */
function gardenActWorldRows() {
  const out = []; if (typeof gardenAffordThings !== 'function') return out;
  for (const t of gardenAffordThings()) {
    const K = t.kind && GARDEN_KINDS[t.kind]; if (!K) continue;
    if (t.src === 'thing' && K.paint && !K.art && t.drawn !== false) { out.push({ id: t.id, kind: t.kind, paint: K.paint, x: t.x, y: t.y, season: t.season || '', row: {} }); continue; }   // (its painter draws it: gardenActThingProp)
    if (t.src === 'thing' && K.art && t.drawn !== false) {
      const mv = typeof gartActMovedTo === 'function' ? gartActMovedTo(t.id) : null;
      out.push({ id: t.id, kind: t.kind, art: K.art, x: mv ? mv.x : t.x, y: mv ? mv.y : t.y, season: t.season || '', carry: (K.acts || []).some(a => a.carry), flat: !!K.flat, row: {} });
    }
    if (t.static && K.levels && typeof gardenLevelWayParts === 'function') for (const r of gardenLevelWayParts(t)) out.push(r);   // (a floor's ladder: 94-garden-zz-7act-3height.js)
    if (t.static && (K.acts || []).some(a => a.at)) { const B = gardenAffordDrawnBase(t); for (const s of gardenKindSpots({ kind: t.kind, x: B.x, y: B.y, w: B.w, front: t.front })) if (s.at && s.art && s.drawn !== false) out.push({ id: 'part-' + t.id + '-' + s.i, owner: t.id, kind: t.kind, art: s.art, x: s.x, y: s.y, row: s }); }   // (on the thing as drawn)
  }
  return out;
}
/** A thing placed through layout data whose kind has a painter (GARDEN_KINDS paint: a bench, a well, a notice board ...), as a fixed prop
 *  row for the native world to paint: { id, art, kind, x, y, w, h, name } in cells, or null. */
function gardenActThingProp(id) {
  if (typeof gardenAffordThings !== 'function') return null;
  for (const t of gardenAffordThings()) {
    if (t.id !== id || t.src !== 'thing') continue;
    const K = GARDEN_KINDS[t.kind]; if (!K || !K.paint) return null;
    const w = t.w || K.w || 1, h = t.h || K.h || 1, mv = typeof gartActMovedTo === 'function' ? gartActMovedTo(t.id) : null, fx = mv ? mv.x : t.x, fy = mv ? mv.y : t.y;
    return { id: t.id, art: K.paint, kind: K.paint, x: Math.round((fx - w / 2) * 100) / 100, y: Math.round((fy - h) * 100) / 100, w, h, name: t.name || K.name, thing: true };
  }
  return null;
}
/** The small boxes at the foot of placed things a painter draws (they stop the feet like a small prop): [{ x0, y0, x1, y1, src }] cells. */
function gardenActThingSolids() {
  const out = []; if (typeof gardenAffordThings !== 'function') return out;
  for (const t of gardenAffordThings()) {
    const K = t.src === 'thing' && GARDEN_KINDS[t.kind]; if (!K) continue;
    // a kind drawn here (_GAW_ART) that says it stops the feet (solid 'block': a band's pitch, a log seat, a campfire) stops them along its
    // whole drawn foot, a little in from each end; its places to stand are in front, clear of it (each kind's acts' stand points)
    if (!K.paint && K.solid === 'block' && K.art && !(typeof gartActCarried === 'function' && gartActCarried(t.id))) { const mv = typeof gartActMovedTo === 'function' ? gartActMovedTo(t.id) : null, x = mv ? mv.x : t.x, y = mv ? mv.y : t.y, bw = (t.w || K.w || 1) * 0.9; out.push({ x0: x - bw / 2, y0: y - 0.3, x1: x + bw / 2, y1: y - 0.02, src: 'placed ' + t.kind + ' [thing:' + t.id + ']' }); continue; }
    if (!K.paint) continue; const bw = Math.min(t.w || 1, 2) * 0.5, foot = t.y - 0.08; out.push({ x0: t.x - bw / 2, y0: foot - 0.28, x1: t.x + bw / 2, y1: foot, src: 'placed ' + t.kind + ' [thing:' + t.id + ']' }); }
  return out;
}
/** For gardenWorldProps: each drawn in world px at its foot, sorted in by its row. */
function gardenActWorldProps(sc, o) {
  const W = GARDEN_WORLD, out = [];
  for (const r of gardenActWorldRows()) {
    if (r.paint) { if (!(r.season && sc && sc.season !== r.season)) out.push({ z: r.y, x: Math.floor(r.x), html: `<g class="gd-it gd-prop" data-prop="${r.id}" data-z="${_gawN(r.y)}" pointer-events="none"></g>` }); continue; }   // (the native world paints it from gardenActThingProp)
    const art = _GAW_ART[r.art] || (typeof VALE_FOLK_ART !== 'undefined' && VALE_FOLK_ART[r.art]) || null;   // (the folk's homes: 94-garden-folk-2art.js)
    if (!art || (r.season && sc && sc.season !== r.season) || (typeof gartActCarried === 'function' && gartActCarried(r.id)) || (r.carry && typeof gartActMovedTo === 'function' && gartActMovedTo(r.id))) continue;   // (one set down elsewhere is drawn there as a sprite of its own)
    const x = r.x * W.cellW, y = W.sky + r.y * W.cellH;
    out.push({ z: r.flat ? r.y - 1.2 : r.y, x: Math.floor(r.x), html: `<g class="gd-it gd-prop gd-prop-work" data-prop="${r.id}" data-z="${_gawN(r.y)}" pointer-events="none"><g transform="translate(${_gawN(x)} ${_gawN(y)})">${art(o, typeof gartActInUse === 'function' && gartActInUse(r.id), r.row, typeof gardenMusicHeld === 'function' ? gardenMusicHeld(r.id) : null)}</g></g>` });
  }
  return out;
}
