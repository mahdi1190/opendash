/* Painted vale: what holds you when you swim beneath things (the depth lane, 26 Nov 2026; the rules are
 * 94-garden-zz-8depth-0rules.js, the swimming 94-garden-zz-8depth-1under.js). Drawn in, in the house style (lit from the upper left,
 * no outlines), each from the zone's own numbers so what you see is exactly what stops you:
 *  - under a footbridge: its trestle posts standing in the water below the near beam (squared oak, dark and slimy at the waterline,
 *    weed trailing, ripple rings round their feet) and the band of shade under the deck's near edge, where the gap under it shows;
 *  - a bridge whose gate is shut: two logs chained end to end across each arch at the face's foot (the boom), so the way under it
 *    is plainly closed (rule 15);
 *  - shut water: where a river runs on from open land into land not yet open, a line of red and white floats on a rope across it,
 *    tied to a stake on each bank.
 * It also keeps the lids: each crossing painter hands over the drawing of its deck (V.lidSet), drawn again over a swimmer beneath it
 * (94-garden-zz-8depth-2lids.js). Nothing here runs at load. */
(function () {
  'use strict';
  const V = window.GardenPaintVale; if (!V) return;
  V.lids = new Map();
  V.lidSet = (id, box, draw) => { V.lids.set(String(id), { box, draw }); };
  const OAK = ['#4a3a2c', '#7a5e40', '#2a2018', '#a08460'], SLIME = ['#2e3a2c', '#5e7a4a', '#4e6a3a'];
  /** A trestle post under a deck: its foot at (0, 0) in the water, its top h px up, hidden under the deck's beam. */
  function post(B, r, h, season) {
    B.cx.save(); B.cx.filter = 'blur(1.5px)'; B.f(B.ell(3.6, 1.4, 5.4, 1.8), '#14242a', .34); B.cx.filter = 'none'; B.cx.restore();   // its shadow on the water, to the lee
    B.f(B.rect(-2.4, -h, 4.8, h + .6), OAK[0]).f(B.rect(-2.4, -h, 1.6, h + .6), OAK[1], .72).f(B.rect(1.2, -h, 1.2, h + .6), OAK[2], .6);
    B.s(`M-1.6 ${-h + 1.2}v${Math.max(2, h - 7)}`, OAK[3], .55, .5);
    B.f(B.rect(-2.4, -5.2, 4.8, 5.8), SLIME[0], .78);   // wet and dark where the water has been
    B.s('M-2.4 -5.2h4.8', season === 'winter' ? '#7a8a7a' : SLIME[1], .8, .75);
    for (let k = 0; k < 3; k++) { const x = -1.7 + k * 1.7 + (r() - .5) * .6; B.s(`M${x} -4.8q${(r() - .5) * 1.6} 2.4 ${(r() - .5) * 2.4} ${3.6 + r() * 1.6}`, SLIME[2], .65, .75); }   // weed trailing in the stream
    B.s(B.ell(0, .5, 6.6, 1.9), '#e8f2ee', .9, .5).s(B.ell(.6, .9, 10.5, 2.9), '#e8f2ee', .6, .22);   // rings round its foot
  }
  /** A log of the boom from a to b (px round the anchor), lying on the water. */
  function log(B, r, a, b, rad) {
    const L = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / L, uy = (b.y - a.y) / L, nx = -uy, ny = ux;
    const cap = (o, k, dy) => B.poly([{ x: a.x + nx * rad * k, y: a.y + ny * rad * k + dy + o }, { x: b.x + nx * rad * k, y: b.y + ny * rad * k + dy + o }, { x: b.x - nx * rad * k, y: b.y - ny * rad * k + dy + o }, { x: a.x - nx * rad * k, y: a.y - ny * rad * k + dy + o }]);
    B.cx.save(); B.cx.filter = 'blur(1.5px)'; B.f(cap(2.6, 1.1, 0), '#14242a', .32); B.cx.filter = 'none'; B.cx.restore();
    B.f(cap(0, 1, 0), '#5e4630').f(cap(-1.1, .55, 0), '#8a6a48', .85).f(cap(-1.6, .2, 0), '#b49068', .5);
    for (let k = 0; k < Math.floor(L / 6); k++) { const t = (k + .3 + r() * .4) * 6, x = a.x + ux * t, y = a.y + uy * t; B.s(`M${x - nx * rad * .6} ${y - ny * rad * .6}l${ux * (2 + r() * 2)} ${uy * (2 + r() * 2)}`, '#3a2c1e', .6, .55); }
    for (const p of [a, b]) B.f(B.ell(p.x, p.y, rad * .55, rad * .95), '#c4a478').s(B.ell(p.x, p.y, rad * .3, rad * .55), '#8a6a48', .5, .8);   // the sawn ends
    B.s(`M${a.x + nx * rad * 1.1} ${a.y + ny * rad * 1.1 + 1.5}L${b.x + nx * rad * 1.1} ${b.y + ny * rad * 1.1 + 1.5}`, '#e8f2ee', .8, .45);   // the water lapping at it
  }
  /** Two logs chained end to end on the water from fa to fb (world px), the chain run up to an iron ring in the stone ('pier') or to a
   *  mooring stake at each end ('stake'). A standing thing at the boom's own line. */
  function boom(C, key, fa, fb, seed, ends) {
    const { thing, kit } = C, mx = (fa.x + fb.x) / 2, my = Math.max(fa.y, fb.y);
    const rel = q => ({ x: q.x - mx, y: q.y - my }), A = rel(fa), Bq = rel(fb), M = { x: (A.x + Bq.x) / 2, y: (A.y + Bq.y) / 2 + 1.2 };
    thing({ key, x: Math.round(mx), y: Math.round(my) + 4, depth: my + 6, box: [Math.min(A.x, Bq.x) - 14, Math.min(A.y, Bq.y) - 22, Math.max(A.x, Bq.x) + 14, Math.max(A.y, Bq.y) + 6], shade: false, draw: B => {
      const r = kit.rng(seed);
      B.cx.translate(0, -4);
      for (let k = 0; k < 6; k++) { const t = (k + .5) / 6, x = A.x + (Bq.x - A.x) * t, y = A.y + (Bq.y - A.y) * t - 4.4; B.s(`M${x - 3} ${y}q3 -1.4 6 0`, '#eef4f0', 1, .5); }   // the river heaped a little against them
      log(B, r, { x: A.x + 2, y: A.y }, { x: M.x - .8, y: M.y }, 3.3); log(B, r, { x: M.x + .8, y: M.y }, { x: Bq.x - 2, y: Bq.y }, 3.1);
      const links = (p0, p1) => { const n = Math.max(2, Math.round(Math.hypot(p1.x - p0.x, p1.y - p0.y) / 2.6)); for (let k = 0; k <= n; k++) { const t = k / n; B.s(B.ell(p0.x + (p1.x - p0.x) * t, p0.y + (p1.y - p0.y) * t, 1.1, .7), '#2f3336', .7, .9); } };
      links({ x: A.x + 1, y: A.y - 1.2 }, { x: Bq.x - 1, y: Bq.y - 1.2 });
      for (const [e, dx] of [[A, -1], [Bq, 1]]) {
        if (ends === 'pier') { const ring = { x: e.x + dx * 4, y: e.y - 9 }; links({ x: e.x, y: e.y - 1.2 }, ring); B.s(B.ell(ring.x, ring.y, 1.8, 2.2), '#2f3336', 1.1, .95).s(B.ell(ring.x - .4, ring.y - .5, 1.2, 1.5), '#8a9094', .5, .6); }
        else { const s = { x: e.x + dx * 5, y: e.y + .5 }; B.f(B.ell(s.x + 1.6, s.y + 1, 3.4, 1.1), '#14242a', .3).f(B.rect(s.x - 1.5, s.y - 10, 3, 10.5), '#5e4630').f(B.rect(s.x - 1.5, s.y - 10, 1, 10.5), '#8a6a48', .8).f(B.ell(s.x, s.y - 10, 1.5, .7), '#c4a478').s(B.ell(s.x, s.y + .4, 4.4, 1.3), '#e8f2ee', .7, .45); links({ x: e.x, y: e.y - 1.2 }, { x: s.x, y: s.y - 6 }); }
      }
    } });
  }
  function compose(C) {
    if (typeof gardenUnderZones !== 'function') return;
    const { L, P, add, thing, kit } = C, W = L.W, season = C.season;
    let zones = []; try { zones = gardenUnderZones() || []; } catch (e) { zones = []; }
    for (const z of zones) {
      if (!z.deck || !z.swim) continue;
      const d = z.deck, c = z.crossing, P2 = (t, s) => c.deckPoint(t / d.L, s * d.near), rib = c.points.map(p => ({ x: p.x * W.cellW, y: W.sky + p.y * W.cellH }));
      // the shade under the deck's near edge: the gap beneath it, seen over the water (only over the water, never the banks)
      if (!z.rule.spans) {
        const run = []; for (let t = z.wet[0] - 6; t <= z.wet[1] + 6; t += 4) run.push(P2(t, d.hw));
        const lo = run.map(p => ({ x: p.x, y: p.y + 13 })).reverse(), poly = run.concat(lo), bb = kit.bboxOf(poly, 8);
        add(bb, 7, B => { B.cx.save(); B.cx.beginPath(); rib.forEach((p, i) => i ? B.cx.lineTo(p.x, p.y) : B.cx.moveTo(p.x, p.y)); B.cx.closePath(); B.cx.clip(); B.cx.filter = 'blur(2.5px)'; B.f(B.poly(poly), B.lin(0, run[0].y, 0, run[0].y + 13, [[0, 'rgba(14,30,34,.5)'], [1, 'rgba(14,30,34,0)']])); B.cx.restore(); });
      }
      // its trestle posts, standing in the water under the near beam
      z.posts.forEach((p, i) => { const h = p.y - p.top.y; thing({ key: 'dp-post|' + z.id + '|' + i + '|' + season, x: Math.round(p.x), y: Math.round(p.y), box: [-12, -h - 3, 13, 5], shade: false, draw: B => post(B, kit.rng(kit.hashStr(z.id) + i), h, season) }); });
      // the boom: the gate is shut, so logs are chained across each arch at the face's foot, and float along its upstream side too
      // (seen from upstream the arches are hidden under the deck: you see the logs that stop you)
      if (z.gate && typeof gardenUnderOpen === 'function' && !gardenUnderOpen(z)) z.open.forEach((o, i) => {
        const up = typeof GDU_BOOM !== 'undefined' ? GDU_BOOM.up : 18, a = P2(o[0] + 2, d.hw), b = P2(o[1] - 2, d.hw);
        boom(C, 'dp-boom|' + z.id + '|' + i + '|' + season, { x: a.x, y: a.y + z.face + 1 }, { x: b.x, y: b.y + z.face + 1 }, kit.hashStr(z.id) + 31 * i, 'pier');
        boom(C, 'dp-boom-up|' + z.id + '|' + i + '|' + season, P2(o[0] + 2, -(d.hw + up)), P2(o[1] - 2, -(d.hw + up)), kit.hashStr(z.id) + 57 * i, 'stake');
      });
    }
    // shut water: a line of floats across the river where it runs on into land not yet open
    let floats = []; try { floats = typeof gardenDepthRivers === 'function' ? gardenDepthRivers().floats : []; } catch (e) { floats = []; }
    floats.forEach((f, i) => {
      const k = f.hw + .35, a = L.cpt(f.x + f.nx * k, f.y + f.ny * k), b = L.cpt(f.x - f.nx * k, f.y - f.ny * k), mx = (a.x + b.x) / 2, my = Math.max(a.y, b.y);
      const A = { x: a.x - mx, y: a.y - my }, Bq = { x: b.x - mx, y: b.y - my };
      thing({ key: 'dp-floats|' + f.key + '|' + season, x: Math.round(mx), y: Math.round(my) + 2, depth: my + 3, box: [Math.min(A.x, Bq.x) - 10, Math.min(A.y, Bq.y) - 16, Math.max(A.x, Bq.x) + 10, Math.max(A.y, Bq.y) + 8], shade: false, draw: B => {
        const r = kit.rng(kit.hashStr(f.key)), Lr = Math.hypot(Bq.x - A.x, Bq.y - A.y) || 1, n = Math.max(3, Math.round(Lr / 8));
        B.cx.translate(0, -2);
        const at = t => ({ x: A.x + (Bq.x - A.x) * t, y: A.y + (Bq.y - A.y) * t + Math.sin(Math.PI * t) * 2.2 });   // the rope sags a little to the water
        // the stake on each bank, the rope tied round it
        for (const e of [A, Bq]) { B.f(B.ell(e.x + 1.4, e.y + .8, 3, 1), '#2e3420', .28).f(B.rect(e.x - 1.3, e.y - 9, 2.6, 9.4), '#5e4630').f(B.rect(e.x - 1.3, e.y - 9, .9, 9.4), '#8a6a48', .8).f(B.ell(e.x, e.y - 9, 1.3, .6), '#c4a478'); B.s(`M${e.x - 1.6} ${e.y - 6.4}h3.2`, '#c9b07a', 1.2, .95); }
        const rope = []; for (let k = 0; k <= 24; k++) rope.push(at(k / 24)); rope[0] = { x: A.x, y: A.y - 6.4 }; rope[24] = { x: Bq.x, y: Bq.y - 6.4 };
        V.strokePts(B, rope, '#c9b07a', 1.1, .9);
        for (let k = 1; k < n; k++) {
          const p = at(k / n), red = k % 2 === 1;
          B.s(B.ell(p.x, p.y + 1.6, 4.2, 1.2), '#e8f2ee', .7, .45);   // its ring on the water
          B.f(B.ell(p.x, p.y + .4, 3, 2.2), red ? '#c8432f' : '#f2ece0').f(B.ell(p.x - .9, p.y - .4, 1.3, .8), '#ffffff', red ? .35 : .6).f(B.ell(p.x + .6, p.y + 1.2, 2.2, .8), red ? '#8a2a1e' : '#b8b0a0', .55);
          void r;
        }
      } });
    });
  }
  V.parts.push({ id: 'depth', compose });
  // the composition follows what is shut: a gate opening takes its boom away, a region opening its floats
  V.groundSigs.push(() => typeof gardenDepthArtSig === 'function' ? gardenDepthArtSig() : '');
})();
