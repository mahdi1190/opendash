/* Painted vale: Millwater valley's screens (round 3 layout, assets/garden/vale-valley.json). The ground a tall roof would
 * hide is closed with something that belongs there, so nobody walks out of sight behind a building and no stop is invisible:
 *   the Ham        a hay paddock behind the mill: cut hay in windrows and haycocks inside a hawthorn hedge
 *   the wheel pit  the stone pit beside the wheel: wet flags, ferns and alder roots inside a low dry-stone wall
 *   the rickyard   behind the barn: two thatched hay ricks, nettles and elder inside a post-and-rail fence
 *   the reed bed   behind the smokehouse: reeds too thick to push through
 * Each screen is a landform (kind 'screen', a full collider), so the feet stop at its outline; what stands on that outline
 * here is the reason they stop. An edge against the building it lies behind is left bare (the wall is the reason there).
 * Ground pieces bake into the ground chunks; the hedge, wall, fence, ricks and reeds are standing sprites sorted by their
 * foot, so you pass in front of them and they never cover you from behind. Nothing here runs at load. */
(function () {
  'use strict';
  const V = window.GardenPaintVale; if (!V) return;
  // the part of a piece whose foot is within a few px of its lowest point: that is where it stands on the ground
  const footOf = (A, Bq) => { const lo = A.y >= Bq.y ? A : Bq, hi = lo === A ? Bq : A, dy = Math.abs(A.y - Bq.y), dx = hi.x - lo.x, k = dy > 5 ? 5 / dy : 1, x2 = lo.x + dx * k; return [Math.min(lo.x, x2) - 2, Math.max(lo.x, x2) + 2, 9]; };
  const NAME = { 'the-ham': 'the Ham hedge', 'wheel-pit': 'wheel pit wall', rickyard: 'rickyard fence', 'reed-bed': 'reed bed' };
  function compose(C) {
    const { L, kit, add, thing } = C, W = L.W, cw = L.cw, ch = L.ch, season = C.season;
    const forms = (L.D.landforms || []).filter(f => f.kind === 'screen' && f.polygon && f.polygon.length > 2); if (!forms.length) return;
    const winter = season === 'winter', autumn = season === 'autumn';
    const leaf = winter ? ['#4e5a3a', '#5e6a44', '#6e7a4e', '#3e4830'] : autumn ? ['#5e6a32', '#7a7a3a', '#94843e', '#46502a'] : ['#3f6a32', '#4f7c3a', '#679046', '#2f5226'];
    const hay = winter ? ['#a89870', '#8a7c58', '#c2b48a'] : ['#d8c07a', '#b89a54', '#ecd894'], stone = ['#9a9684', '#7e7a6a', '#b8b4a0', '#5e5a4e'];
    const reed = winter ? ['#b8a47a', '#9a8a62', '#d0bc8a'] : autumn ? ['#a89a5a', '#8a7e44', '#c4b06a'] : ['#7e8a4e', '#5c6a3a', '#a4ad62'];
    const building = (x, y) => (L.D.static || []).some(p => p.col === 'full' && x >= p.x - .05 && x < p.x + p.w + .05 && y >= p.y - .05 && y < p.y + p.h + .05);
    for (const f of forms) {
      const id = f.screen || f.id, poly = f.polygon, P = poly.map(L.pt), bb = kit.bboxOf(P, 40), seed = kit.hashStr('screen|' + id), clip = V.loopPath([P]);
      const inF = (x, y) => gardenIslandInPolygon ? gardenIslandInPolygon(x / cw, (y - W.sky) / ch, poly.map(([a, b]) => ({ x: a, y: b }))) : true;
      // 1. the ground inside, baked with the ground
      add(bb, seed & 0xffff, (B, r, cb) => {
        B.cx.save(); B.cx.clip(clip);
        if (id === 'the-ham') {
          B.f(B.rect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]), winter ? '#9a9a6a' : '#b8b468', .9);
          for (let y = bb[1] + 6; y < bb[3]; y += 11) { const rr = kit.rng(kit.hash(7, Math.round(y), seed)); B.s(`M${bb[0]} ${y}Q${(bb[0] + bb[2]) / 2} ${y + (rr() - .5) * 6} ${bb[2]} ${y + (rr() - .5) * 4}`, hay[1], 3.2, .55).s(`M${bb[0]} ${y - 1.4}H${bb[2]}`, hay[2], 1, .35); }
          kit.tiles(cb, 40, 6, seed & 255, (tx, ty, rr) => { for (let k = 0; k < 10; k++) { const x = tx + rr() * 40, y = ty + rr() * 40; B.s(`M${x} ${y}l${(rr() - .5) * 2} -${2 + rr() * 3}`, rr() < .5 ? hay[0] : '#8a9a4a', .9, .8); } });
        } else if (id === 'wheel-pit') {
          B.f(B.rect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]), '#5e6656');
          kit.tiles(cb, 30, 4, seed & 255, (tx, ty, rr) => { for (let k = 0; k < 3; k++) { const x = tx + rr() * 30, y = ty + rr() * 30; B.f(B.rr(x - 9, y - 5, 18 + rr() * 6, 10, 3), rr() < .5 ? stone[1] : stone[0], .85).f(B.rect(x - 7, y - 4, 10, 2), stone[2], .3); } });
          kit.tiles(cb, 36, 8, (seed + 3) & 255, (tx, ty, rr) => { for (let k = 0; k < 3; k++) { const x = tx + rr() * 36, y = ty + rr() * 36; B.f(B.blob(rr, x, y, 7, 3, 7, .4), '#4e7a3a', .6); } });
        } else if (id === 'rickyard') {
          B.f(B.rect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]), winter ? '#7a7454' : '#8a8048', .55);
          kit.tiles(cb, 44, 8, seed & 255, (tx, ty, rr) => { for (let k = 0; k < 7; k++) { const x = tx + rr() * 44, y = ty + rr() * 44; if (rr() < .55) { B.f(B.blob(rr, x, y, 8, 4, 7, .45), leaf[rr() < .5 ? 0 : 3], .8); for (let j = 0; j < 5; j++) B.s(`M${x + (rr() - .5) * 10} ${y}l${(rr() - .5) * 3} -${5 + rr() * 6}`, leaf[1], 1.4, .9); } else B.f(B.ell(x, y, 5, 2), hay[1], .55); } });
        } else {
          B.f(B.rect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]), '#5c6a3a', .85);
          kit.tiles(cb, 30, 6, seed & 255, (tx, ty, rr) => { for (let k = 0; k < 14; k++) { const x = tx + rr() * 30, y = ty + rr() * 30; B.s(`M${x} ${y}l${(rr() - .5) * 3} -${6 + rr() * 8}`, reed[Math.floor(rr() * 3)], 1.1, .9); } });
        }
        B.cx.restore();
      });
      // 2. what stands on the outline, where it meets ground you can walk on, in pieces sorted by their foot
      const pieces = [];
      for (let i = 0; i < poly.length; i++) {
        // (one piece per edge: an edge cut into short pieces stood each piece's foot against its neighbours')
        const a = poly[i], b = poly[(i + 1) % poly.length], len = Math.hypot((b[0] - a[0]) * cw, (b[1] - a[1]) * ch), n = Math.max(1, Math.ceil(len / 400));
        for (let k = 0; k < n; k++) {
          const p = [a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n], q = [a[0] + (b[0] - a[0]) * (k + 1) / n, a[1] + (b[1] - a[1]) * (k + 1) / n];
          const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, nx = -(q[1] - p[1]), ny = q[0] - p[0], nl = Math.hypot(nx, ny) || 1;
          // the outward side: the one that is not inside the screen
          let ox = nx / nl, oy = ny / nl; if (gardenIslandInPolygon(mx + ox * .3, my + oy * .3, poly.map(([u, v]) => ({ x: u, y: v })))) { ox = -ox; oy = -oy; }
          if ([.2, .5, .8].filter(t => building(p[0] + (q[0] - p[0]) * t + ox * .5, p[1] + (q[1] - p[1]) * t + oy * .5)).length >= 2) continue;   // against the building it lies behind: its wall is the stop
          // drawn a third of a cell inside the outline: it stands on the ground the feet cannot reach, its foot on the line where they stop
          const ix = -ox * .34, iy = -oy * .34; pieces.push([L.cpt(p[0] + ix, p[1] + iy), L.cpt(q[0] + ix, q[1] + iy)]);
        }
      }
      pieces.forEach(([p, q], i) => {
        const x0 = Math.min(p.x, q.x), x1 = Math.max(p.x, q.x), foot = Math.max(p.y, q.y), top = Math.min(p.y, q.y), ox = x0, oy = foot, rel = z => ({ x: z.x - ox, y: z.y - oy }), A = rel(p), Bq = rel(q), r0 = kit.rng(seed + i * 31);
        const tallPx = id === 'the-ham' ? 30 : id === 'wheel-pit' ? 34 : id === 'rickyard' ? 30 : 58;
        const box = [-14, top - foot - tallPx - 10, x1 - x0 + 14, 10];
        // (foot: the feet stop on what is drawn here, as they do on the screen's outline; walking (_gwBuildSolids) reads it)
        thing({ key: NAME[id] + '|' + id + '|' + i + '|' + season, x: ox, y: oy, depth: oy - 2, box, K: 1.4, foot: footOf(A, Bq), draw: B => {
          // the foot: a solid band where it meets the ground (hedge bottom, footing course, grass along the rails, wet reed bases)
          B.f(B.poly([[A.x, A.y - 5], [Bq.x, Bq.y - 5], [Bq.x, Bq.y + 1], [A.x, A.y + 1]]), id === 'the-ham' ? leaf[3] : id === 'wheel-pit' ? stone[1] : id === 'rickyard' ? leaf[3] : '#4e5a32');
          const along = n => { const out = []; for (let s = 0; s <= n; s++) { const t = s / n; out.push({ x: A.x + (Bq.x - A.x) * t, y: A.y + (Bq.y - A.y) * t }); } return out; };
          const steps = Math.max(2, Math.round(Math.hypot(Bq.x - A.x, Bq.y - A.y) / 9)), pts = along(steps), steep = Math.abs(Bq.y - A.y) > Math.abs(Bq.x - A.x), lo = steep ? .62 : 1;   // (a hedge or a wall running up the view is seen end on: lower and fuller, a band, not a column)
          if (id === 'the-ham') {   // a hawthorn hedge, clipped, half the player's height, with haws in autumn and may blossom in spring
            for (const z of pts) B.shadow(z.x + 4, z.y + 2, 14, 4, .22);
            for (const z of pts) { const h = (22 + r0() * 8) * lo; B.f(B.blob(r0, z.x, z.y - h * .45, steep ? 13 : 9, h * .5, 8, .35), leaf[3]); }
            for (const z of pts) { const h = (22 + r0() * 8) * lo; B.f(B.blob(r0, z.x - 1, z.y - h * .55, 7.5, h * .42, 8, .35), leaf[0]).f(B.blob(r0, z.x - 3, z.y - h * .72, 5, h * .22, 7, .35), leaf[2], .9);
              if (autumn && r0() < .6) for (let j = 0; j < 3; j++) B.f(B.circ(z.x + (r0() - .5) * 12, z.y - h * (.3 + r0() * .5), 1.3), '#a83228');
              if (season === 'spring' && r0() < .6) for (let j = 0; j < 4; j++) B.f(B.circ(z.x + (r0() - .5) * 12, z.y - h * (.4 + r0() * .5), 1.4), '#f4ece0', .95); }
          } else if (id === 'wheel-pit') {   // a low dry-stone wall with a coping of edge stones, moss and a fern at its foot
            for (const z of pts) B.shadow(z.x + 4, z.y + 2, 12, 4, .25);
            for (let row = 0; row < (steep ? 2 : 3); row++) for (const z of pts) B.f(B.rr(z.x - 6 + (row & 1) * 3, z.y - 9 - row * 8, 11 + r0() * 3, 8, 2.4), stone[Math.floor(r0() * 3)]).s(`M${z.x - 5} ${z.y - 2 - row * 8}h9`, stone[3], .6, .5);
            const cap = steep ? 25 : 33; for (const z of pts) { B.f(B.rr(z.x - 4, z.y - cap, 4, 9, 1.2), stone[2]).f(B.rr(z.x + 1, z.y - cap + 1, 4, 8, 1.2), stone[0]); if (r0() < .3) B.f(B.blob(r0, z.x, z.y - cap + 7, 6, 2, 6, .4), '#6a8a3a', .8); }
            for (const z of pts) if (r0() < .35) for (let j = 0; j < 5; j++) { const a = -Math.PI / 2 + (j - 2) * .4; B.s(`M${z.x} ${z.y - 1}q${Math.cos(a) * 6} ${Math.sin(a) * 6} ${Math.cos(a) * 12} ${Math.sin(a) * 10 + 4}`, winter ? '#8a7a4a' : '#5a8a3a', 2, .9); }
          } else if (id === 'rickyard') {   // a post-and-rail fence, weathered grey, nettles at its foot
            for (const z of pts) B.shadow(z.x + 3, z.y + 2, 9, 3, .18);
            const posts = pts.filter((z, j) => j % 3 === 0 || j === pts.length - 1);
            for (const k of [11, 21]) { const path = posts.map((z, j) => (j ? 'L' : 'M') + z.x + ' ' + (z.y - k)).join(''); B.s(path, '#5e5446', 3.4).s(path, '#9a8e78', 1.6, .9); }
            for (const z of posts) B.f(B.rr(z.x - 2.2, z.y - 27, 4.4, 28, 1.2), '#6a5e4c').f(B.rect(z.x - 2.2, z.y - 27, 1.6, 27), '#a09682', .6);
            for (const z of pts) if (r0() < .6) for (let j = 0; j < 4; j++) B.s(`M${z.x + (r0() - .5) * 8} ${z.y - 1}l${(r0() - .5) * 3} -${7 + r0() * 8}`, leaf[1], 1.6, .9);
          } else {   // reeds standing thick: a waving wall a figure and a half high, plumes on top
            for (const z of pts) B.shadow(z.x + 5, z.y + 2, 14, 4, .2);
            for (let row = 0; row < 2; row++) for (const z of pts) for (let j = 0; j < 7; j++) { const x = z.x + (r0() - .5) * 12, h = 40 + r0() * 18 - row * 6, lean = (r0() - .5) * 8; B.s(`M${x} ${z.y - row * 4}q${lean * .3} ${-h * .6} ${lean} ${-h}`, reed[Math.floor(r0() * 3)], 1.3, .95); if (r0() < .4) B.f(B.ell(x + lean, z.y - row * 4 - h + 2, 1.8, 5), winter ? '#c8b48a' : '#8a6a3a', .9); }
          }
        } });
      });
      // the reed bed is reeds right through: rows of standing reeds over the whole bed, each row its own sprite sorted by its foot
      if (id === 'reed-bed') for (let y = bb[1] + 40 + 14, k = 0; y < bb[3] - 40; y += 16, k++) {
        const xs = []; for (let x = bb[0] + 40; x < bb[2] - 40; x += 7) if (inF(x, y) && inF(x - cw * .5, y) && inF(x + cw * .5, y) && inF(x, y - ch * .6) && inF(x, y + ch * .3)) xs.push(x); if (xs.length < 2) continue;
        const ox = xs[0], r2 = kit.rng(seed + 501 + k * 17);
        thing({ key: 'reed bed|reeds|row' + k + '|' + season, x: ox, y, depth: y - 1, box: [-12, -70, xs[xs.length - 1] - ox + 12, 6], K: 1.4, foot: [-4, xs[xs.length - 1] - ox + 4, 9], draw: B => {
          B.f(B.rect(-4, -4, xs[xs.length - 1] - ox + 8, 5), '#4e5a32');
          for (const x0 of xs) for (let j = 0; j < 3; j++) { const x = x0 - ox + (r2() - .5) * 7, h = 42 + r2() * 20, lean = (r2() - .5) * 9; B.s(`M${x} 0q${lean * .3} ${-h * .6} ${lean} ${-h}`, reed[Math.floor(r2() * 3)], 1.3, .95); if (r2() < .3) B.f(B.ell(x + lean, -h + 2, 1.8, 5), winter ? '#c8b48a' : '#8a6a3a', .9); }
        } });
      }
      // 3. what stands inside and shows over the roof: the Ham's haycocks, the rickyard's two ricks
      const inner = id === 'the-ham' ? 3 : id === 'rickyard' ? 2 : 0, placed = [];
      for (let k = 0; k < inner; k++) {
        const r1 = kit.rng(seed + 977 + k * 13), big = id === 'rickyard'; let at = null;
        const m = big ? 1.4 : .9; for (let t = 0; t < 80 && !at; t++) { const x = bb[0] + 50 + r1() * (bb[2] - bb[0] - 100), y = bb[1] + 40 + r1() * Math.max(10, (bb[3] - bb[1]) * (big ? .75 : .5)); if (inF(x, y) && inF(x - cw * m, y) && inF(x + cw * m, y) && inF(x, y - ch * (big ? 1.7 : .8)) && inF(x, y + ch * .6) && !placed.some(q => Math.abs(q.x - x) < cw * (big ? 2.4 : 1.6) && Math.abs(q.y - y) < ch * (big ? 3.6 : 1.4))) at = { x, y }; }
        if (!at) continue; placed.push(at);
        thing({ key: (big ? 'hay rick' : 'haycock') + '|' + id + '|in' + k + '|' + season, x: at.x, y: at.y, box: big ? [-50, -96, 50, 10] : [-22, -34, 22, 6], K: 1.4, foot: big ? [-42, 42, 14] : [-17, 17, 8], draw: B => {
          if (big) {   // a hay rick: a rounded stack under a thatched ridge, pegged ropes down its side
            B.shadow(6, 2, 46, 8, .28);
            B.f('M-42 0L-44 -42Q-40 -54 0 -56Q40 -54 44 -42L42 0Z', hay[1]).f('M-38 -4L-40 -40Q-36 -50 -6 -52L-8 -4Z', hay[2], .5);
            for (let y = -8; y > -48; y -= 6) B.s(`M-43 ${y}Q0 ${y - 3} 43 ${y}`, hay[0], .8, .4);
            B.f('M-50 -44L0 -92L50 -44Q0 -50 -50 -44Z', winter ? '#8a7a56' : '#a88a4a').f('M-50 -44L0 -92L-6 -46Z', '#c4a660', .45);
            for (let x = -40; x <= 40; x += 10) B.s(`M${x} ${-44 - (40 - Math.abs(x)) * .1}L${x * .3} ${-80 + Math.abs(x) * .2}`, '#7a6234', .7, .5);
            B.s('M-30 -46L-34 -4M30 -46L34 -4', '#5e4a2a', 1, .7);
          } else {   // a haycock: a small rounded heap of cut hay
            B.shadow(4, 1, 20, 4, .24);
            B.f('M-18 0Q-20 -22 0 -28Q20 -22 18 0Z', hay[1]).f('M-14 -2Q-16 -20 -2 -25Q-6 -12 -4 -2Z', hay[2], .6);
            for (let j = 0; j < 8; j++) B.s(`M${-14 + j * 4} -2l${(j % 3) - 1} -${10 + (j % 4) * 3}`, hay[0], .7, .5);
          }
        } });
      }
    }
  }
  V.parts.push({ id: 'valley-screens', compose });
})();
