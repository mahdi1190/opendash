/* Painted vale: the Whispering woodland's own pieces from its hand-authored layout (round 3, assets/garden/vale-woodland.json).
 *  - Wren's log (presentation.crossings kind 'log'): an old birch fallen across the brook, adzed flat along its top so it
 *    can be walked, its bark peeling, moss on its shaded side, the cut root plate on the far bank and its broken crown end
 *    in the ferns on the near one. Drawn over the deck the walk stands on (gardenIslandCrossingGeometry), so the feet
 *    are on the log and nowhere beside it. 94-garden-paint-vale-1places.js calls it from its crossings.
 * Ground paint only: cells, walking and saved rows are untouched. */
(function () {
  'use strict';
  const V = window.GardenPaintVale; if (!V) return;
  V.fallenLog = function (B, r, P, A, Bp, season, deck) {
    if (!deck) return;
    const hw = deck.halfWidth, R = hw * .95, q = (t, s, up) => { const p = deck.deckPoint(t, s); return { x: p.x, y: p.y - (up || 0) }; };
    const winter = season === 'winter', autumn = season === 'autumn';
    const bark = winter ? ['#d8d6cc', '#c4c2b6'] : ['#e4dfcf', '#cfc8b2'], dark = '#3a3630', moss = winter ? '#dfe4e2' : autumn ? '#8a8a46' : '#6f8a42';
    // its shadow on the water and the wet line where it lies in the banks
    B.cx.filter = 'blur(3px)'; B.f(B.poly([q(.04, -R + 4), q(.96, -R + 4), q(.96, R + 9), q(.04, R + 9)]), '#1c2a2e', .38); B.cx.filter = 'none';
    // the round body: an underside in shade, the flat walked top, the lit near flank
    B.f(B.poly([q(0, -R, 2), q(1, -R, 2), q(1, R, 0), q(0, R, 0)]), '#8c8676');
    B.f(B.poly([q(0, -R * .8, 7), q(1, -R * .8, 7), q(1, R * .55, 6), q(0, R * .55, 6)]), bark[1]);
    B.f(B.poly([q(0, -R * .6, 9), q(1, -R * .6, 9), q(1, R * .3, 8.5), q(0, R * .3, 8.5)]), bark[0]);
    // the adzed walking face: a paler strip with the tool's marks across it
    B.f(B.poly([q(.06, -R * .42, 9.4), q(.94, -R * .42, 9.4), q(.94, R * .18, 9.2), q(.06, R * .18, 9.2)]), '#efe6cc', .85);
    for (let t = .08; t < .93; t += .035 + r() * .03) { const a = q(t, -R * .4, 9.6), b = q(t + .01, R * .16, 9.4); B.s(`M${a.x} ${a.y}L${b.x} ${b.y}`, '#c9b98e', 1, .55); }
    // birch marks: short dark dashes across the bark, peeling curls
    for (let k = 0; k < 26; k++) { const t = .03 + r() * .94, s = (r() - .5) * R * 1.6, a = q(t, s, 5 + r() * 3), w = 3 + r() * 6; B.s(`M${a.x - w / 2} ${a.y}l${w} ${(r() - .5) * 1.5}`, dark, 1.4 + r(), .7); }
    for (let k = 0; k < 5; k++) { const p = q(.1 + r() * .8, R * (.2 + r() * .4), 6); B.s(`M${p.x} ${p.y}q3 -4 6 -1`, '#f6f1e4', 1.6, .9); }
    // moss along the shaded side, thicker toward the old root end
    for (let k = 0; k < 22; k++) { const t = Math.pow(r(), 1.6), p = q(t, -R * (.55 + r() * .35), 6 + r() * 2); B.f(B.blob(r, p.x, p.y, 3 + r() * 5, 1.4 + r() * 1.6, 6, .5), moss, .75); }
    // the root plate on the far bank: a torn disc of roots and earth standing up
    const e = q(0, 0, 8); B.f(B.ell(e.x, e.y - 6, R * 1.3, R * 1.5), '#5e4a34').f(B.ell(e.x + 2, e.y - 5, R * 1.05, R * 1.25), '#7a6248');
    for (let k = 0; k < 9; k++) { const a = Math.PI * 2 * k / 9 + r() * .3, l = R * (1.2 + r() * .6); B.s(`M${e.x} ${e.y - 6}l${Math.cos(a) * l} ${Math.sin(a) * l * 1.1}`, '#4a3a28', 2 + r() * 1.5, .9); }
    if (!winter) for (let k = 0; k < 4; k++) B.f(B.blob(r, e.x + (r() - .5) * R, e.y - 6 - R * (.6 + r() * .6), 4, 2, 6, .5), moss, .8);
    // the broken crown end in the ferns on the near bank: a split, pale core and two stub branches
    const f = q(1, 0, 8); B.f(B.ell(f.x, f.y, R * .55, R * .9), '#d8caa4').f(B.ell(f.x, f.y, R * .3, R * .55), '#bfae84');
    for (const s of [-1, 1]) { const a = q(.9, s * R * .4, 9); B.s(`M${a.x} ${a.y}l${6 + r() * 6} ${-8 - r() * 8}`, bark[1], 3, .95).s(`M${a.x} ${a.y}l${6 + r() * 6} ${-8 - r() * 8}`, dark, 1, .5); }
    // a ripple where the water meets it on both sides
    for (const s of [-1, 1]) { const pts = []; for (let t = .12; t <= .88; t += .04) pts.push(q(t, s * (R + 2.5), 0)); V.strokePts(B, pts, P.foam || '#eef2e2', 1.4, .45); }
  };
})();
