/* Painted decorations, paths and ground covers: flat on the ground, seen at a
 * slant. Each tile is a soft lobed patch a little larger than its cell (48 x
 * 30), so one reads as a patch and a run blends into one path; o.tile (0..3)
 * moves the stones and specks so a run never repeats. The family look: lit
 * tops upper left, moss and grass in the joints and at the worn edges, frost
 * in the joints in winter. Registry: 94-garden-native-painted-decor-0kit.js. */
GardenPaintedDecor.add('paths', (function () {
  const BOX = [-27, -33, 27, 3];
  const LAWN = ['#5e8a44', '#82aa58', '#46703a'];
  // the tile's own random, moved by its position variant
  const rr = (o, id) => o.K.rng(o.K.hash(id) + (o.tile | 0) * 97 + o.v * 13 + 5);
  // the patch: a lobed outline round the cell; content drawn through it
  const patchPath = (r) => sceneDraw.blob(r, 0, -15, 27, 17, 12, .18);
  function tile(B, o, id, base, body) {
    const r = rr(o, id), edge = patchPath(r), cx = B.cx;
    B.f(edge, base);
    cx.save(); cx.clip(new Path2D(edge)); body(r);
    // a soft light over the upper left and shade to the lower right, like the scenes' ground
    B.f(B.rect(-30, -36, 60, 40), B.lin(-24, -30, 24, 0, [[0, 'rgba(255,250,230,.14)'], [.55, 'rgba(255,255,255,0)'], [1, 'rgba(40,40,20,.14)']]));
    cx.restore();
    // grass creeping in at the worn edge
    const L = o.K.leafOf(o.season);
    for (let i = 0; i < 8; i++) { const a = r() * Math.PI * 2, x = Math.cos(a) * 25.5, y = -15 + Math.sin(a) * 16; B.f(sceneDraw.blob(r, x, y, 2 + r() * 1.8, 1 + r() * .6, 6, .4), r() < .5 ? L[0] : L[1], .6); }
    for (let i = 0; i < 4; i++) { const x = (r() - .5) * 40, y = -1 - r() * 2; B.s(`M${x} ${y}q${(r() - .5) * 1.4} -1.4 ${(r() - .5) * 2} -2.6`, L[1], .6, .7); }
  }
  const frost = (B, o, r, n) => { if (o.season !== 'winter') return; for (let i = 0; i < (n || 14); i++) B.f(B.ell((r() - .5) * 50, -2 - r() * 27, 1.6 + r() * 2, .8 + r() * .6), '#f2f6f8', .75); };
  const speck = (B, r, n, cols, size, op) => { for (let i = 0; i < n; i++) { const x = (r() - .5) * 54, y = -r() * 32, w = size * (.6 + r() * .7); B.f(B.ell(x, y, w, w * .6), cols[i % cols.length], op == null ? 1 : op); } };
  // a stone lying flat: a dark rim below, the face, a lit top-left, a little moss
  const flatStone = (B, r, x, y, rx, ry, st, moss) => {
    B.f(sceneDraw.blob(r, x + .6, y + 1, rx, ry, 8, .2), st[3], .7).f(sceneDraw.blob(r, x, y, rx, ry, 8, .2), st[0]).f(sceneDraw.blob(r, x - rx * .2, y - ry * .25, rx * .55, ry * .45, 7, .25), st[2], .7);
    if (moss) B.f(sceneDraw.blob(r, x + rx * .3, y + ry * .45, rx * .4, ry * .25, 6, .5), moss, .8);
  };
  const STONE = ['#b9b2a4', '#a39b8c', '#d6d0c2', '#7e776a'], DIRT = '#9c8f74';
  return {
    'stepping-stones': { ground: true, tiles: 4, box: BOX, draw(B, o) {
      // three round stones set in the lawn (no patch: the grass shows between them)
      const r = rr(o, 'stepping-stones'), L = o.K.leafOf(o.season), t = o.tile | 0, sets = [[[-12, -12, 9, 5], [10, -6, 10, 5.6], [-4, -23, 7, 4]], [[-10, -8, 10, 5.4], [11, -15, 8.4, 4.6], [-6, -25, 7.4, 4]], [[-14, -18, 8, 4.6], [6, -8, 10, 5.4], [10, -25, 7, 4]], [[-2, -6, 9.4, 5], [-12, -20, 8, 4.4], [12, -22, 8.4, 4.6]]][t];
      for (const [x, y, rx, ry] of sets) { B.f(B.ell(x + 1, y + 1.4, rx + 1.4, ry + 1), 'rgba(50,60,30,.22)'); flatStone(B, r, x, y, rx, ry, STONE, o.season === 'winter' ? null : '#7d8f4e'); if (o.season === 'winter') B.f(B.ell(x - 1, y - 1, rx * .6, ry * .4), '#f4f8fa', .8); for (let i = 0; i < 3; i++) B.s(`M${x + (r() - .5) * rx * 2} ${y + ry}q${(r() - .5) * 2} -2 ${(r() - .5) * 2} -4`, L[1], .8, .9); }
    } },
    'gravel-path': { ground: true, tiles: 4, box: BOX, draw(B, o) {
      tile(B, o, 'gravel-path', '#d6cdb8', r => { speck(B, r, 60, ['#b0a58c', '#e8e0cc', '#c4b89c', '#9a8e74'], 1.4); speck(B, r, 30, ['#f4efe2'], .8, .9); frost(B, o, r, 10); });
    } },
    'brick-path': { ground: true, tiles: 4, v: 2, box: BOX, draw(B, o) {
      tile(B, o, 'brick-path', '#8a3f2a', r => {
        const cols = ['#b5573a', '#a84e34', '#c46848', '#9a4630'];
        const brick = (x, y, w, h) => { B.f(B.rr(x, y, w, h, .8), cols[Math.floor(r() * 4)]).f(B.rr(x, y, w, h * .35, .6), '#d8805e', .45); };
        if (o.v === 0) { for (let j = -1; j < 5; j++) for (let i = -2; i < 6; i++) { const x = -32 + i * 12 + (j % 2) * 6, y = -33 + j * 7.4; if ((i + j) % 2) brick(x, y, 10.6, 6.2); else { brick(x, y, 5, 6.2); brick(x + 5.6, y, 5, 6.2); } } }
        else for (let j = 0; j < 5; j++) for (let i = 0; i < 6; i++) { const x = -30 + i * 10.4, y = -32 + j * 7, s = (i + j) % 2; if (s) { brick(x, y, 9.6, 3); brick(x, y + 3.4, 9.6, 3); } else { brick(x, y, 4.6, 6.4); brick(x + 5, y, 4.6, 6.4); } }
        for (let i = 0; i < 5; i++) B.f(sceneDraw.blob(r, (r() - .5) * 44, -2 - r() * 26, 2.4, 1, 5, .5), '#7d8f4e', .7);
        frost(B, o, r, 12);
      });
    } },
    flagstones: { ground: true, tiles: 4, box: BOX, draw(B, o) {
      tile(B, o, 'flagstones', '#9d968a', r => {
        const st = ['#c7c2b8', '#b8b2a6', '#dcd8ce', '#8a8478'], t = o.tile | 0;
        // two courses of irregular slabs, the joints moved by the tile so a run never lines up
        const rows = [[-32, 15, [[18, 22, 16], [14, 20, 22], [22, 16, 18], [16, 24, 16]][t]], [-16, 15.6, [[24, 16, 16], [20, 22, 14], [14, 24, 18], [22, 14, 20]][t]]];
        for (const [y, h, ws] of rows) { let x = -30 - (t % 2) * 4; for (const w of ws) { B.f(B.rr(x + .6, y + .9, w - 1.4, h - 1.6, 1.6), st[3], .6).f(B.rr(x, y, w - 1.4, h - 1.6, 1.6), st[Math.floor(r() * 2)]).f(B.rr(x + 1, y + .8, (w - 2) * .5, (h - 2) * .35, 1), st[2], .5); if (r() < .4) B.s(`M${x + w * .3} ${y + 1}l${1 + r() * 3} ${h * .4}l${-1 + r() * 2} ${h * .4}`, st[3], .5, .6); x += w; } }
        for (let i = 0; i < 6; i++) B.f(sceneDraw.blob(r, (r() - .5) * 48, -2 - r() * 28, 3, 1, 5, .5), '#7d8f4e', .65);
        frost(B, o, r, 12);
      });
    } },
    'moss-stones': { ground: true, tiles: 4, box: BOX, draw(B, o) {
      tile(B, o, 'moss-stones', '#5f7a3c', r => {
        const st = ['#a9a99a', '#999a8a', '#c8c8b8', '#6f705f'], t = o.tile | 0;
        for (let i = 0; i < 18; i++) B.f(sceneDraw.blob(r, (r() - .5) * 54, -r() * 32, 5, 2.4, 6, .5), r() < .5 ? '#6f9a4a' : '#88ad5c', .8);
        for (const [x, y, rx, ry] of [[-14 + t * 2, -20, 12, 6.4], [12 - t, -9, 13, 6.6], [16, -25, 8, 4], [-12, -5, 8, 3.6]]) { flatStone(B, r, x, y, rx, ry, st, null); B.f(sceneDraw.blob(r, x + rx * .2, y + ry * .3, rx * .6, ry * .36, 7, .5), '#6f9a4a', .85).f(sceneDraw.blob(r, x - rx * .4, y - ry * .5, rx * .25, ry * .2, 6, .5), '#a3b06a', .8); }
        frost(B, o, r, 10);
      });
    } },
    boardwalk: { ground: true, tiles: 4, box: BOX, draw(B, o) { boards(B, o, false); }, side: { ground: true, box: BOX, draw(B, o) { boards(B, o, true); } } },
    'mosaic-path': { ground: true, tiles: 4, v: 3, box: BOX, draw(B, o) {
      tile(B, o, 'mosaic-path', '#e8e1d4', r => {
        // tiny tiles set in a sunburst round the cell's middle; a lighter grout
        const accent = ['#e04a3a', '#3f8f5a', '#9b7fd1'][o.v], cols = ['#3a7fc4', '#f2b33a', '#f4f1ea', accent];
        for (let y = -33; y < 3; y += 3.6) for (let x = -30; x < 30; x += 3.6) {
          const dx = (x + 1.6) / 1.6, dy = y + 13.4, d = Math.hypot(dx, dy), ray = Math.floor((Math.atan2(dy, dx) + Math.PI) / (Math.PI / 8)) % 2;
          const c = d < 4.4 ? cols[1] : d < 6 ? cols[3] : d > 16 ? (Math.floor(x / 3.6 + y / 3.6) % 2 ? cols[3] : cols[2]) : ray ? cols[0] : cols[2];
          B.f(B.rr(x + (r() - .5) * .5, y + (r() - .5) * .5, 3, 3, .7), c).f(B.rect(x + .3, y + .3, 1.4, .8), '#ffffff', .3);
        }
        frost(B, o, r, 8);
      });
    } },
    'rw-path-bark': { ground: true, tiles: 4, box: BOX, draw(B, o) {
      tile(B, o, 'rw-path-bark', '#8a6642', r => { for (let i = 0; i < 46; i++) { const x = (r() - .5) * 54, y = -r() * 32, a = r() * 3, l = 2.4 + r() * 3; B.s(`M${x} ${y}l${Math.cos(a) * l} ${Math.sin(a) * l * .6}`, ['#6a4c30', '#a47e56', '#7a5636', '#bf9868'][i % 4], 1.6 + r() * .8); } frost(B, o, r, 10); });
    } },
    'rw-path-cobble': { ground: true, tiles: 4, box: BOX, draw(B, o) {
      tile(B, o, 'rw-path-cobble', '#857d70', r => { const st = ['#b5ad9e', '#a39b8c', '#c4bdae', '#6f685c'], sh = (o.tile | 0) * 2.6; for (let y = 0; y < 5; y++) for (let x = 0; x < 6; x++) { const cx = -28 + x * 11 + ((y + (o.tile | 0)) % 2) * 5.5 - sh % 5, cy = -30 + y * 7.2; const c = st[Math.floor(r() * 3)]; B.f(B.ell(cx + .5, cy + 1, 5, 3.2), st[3], .7).f(B.ell(cx, cy, 5, 3.1), c).f(B.ell(cx - 1.4, cy - 1, 2.4, 1.2), '#e0dacc', .6); } for (let i = 0; i < 6; i++) B.f(sceneDraw.blob(r, (r() - .5) * 48, -r() * 30, 2.4, 1, 5, .5), '#7d8f4e', .7); frost(B, o, r, 12); });
    } },
    'rw-path-sleeper': { ground: true, tiles: 4, box: BOX, draw(B, o) {
      tile(B, o, 'rw-path-sleeper', '#6f6650', r => {
        speck(B, r, 30, ['#857a60', '#5e5642', '#9a8e74'], 1.2);
        for (let i = 0; i < 4; i++) { const y = -30 + i * 7.6, c = i % 2 ? '#5e432b' : '#6f5035', dx = (r() - .5) * 3; B.f(B.rr(-27 + dx, y + 1, 54, 5.6, 1.2), '#3e2c1c', .6).f(B.rr(-27 + dx, y, 54, 5.4, 1.2), c).f(B.rect(-27 + dx, y, 54, 1.4), '#8a6a46', .7); for (let k = 0; k < 3; k++) B.s(`M${-22 + r() * 40} ${y + 2.6 + r() * 1.4}h${4 + r() * 8}`, '#3e2c1c', .5, .6); B.f(B.circ(-20 + dx, y + 2.8, .9), '#5a5a5a').f(B.circ(20 + dx, y + 2.8, .9), '#5a5a5a'); }
        frost(B, o, r, 10);
      });
    } },
    'rw-path-shell': { ground: true, tiles: 4, box: BOX, draw(B, o) {
      tile(B, o, 'rw-path-shell', '#e9e2d2', r => { speck(B, r, 50, ['#f8f4ea', '#d8cdb8', '#e8c8b8', '#c8bca4'], 1.6); for (let i = 0; i < 6; i++) { const x = (r() - .5) * 46, y = -3 - r() * 26; B.f(`M${x - 2.4} ${y}q2.4 -3.4 4.8 0z`, '#f0d0c0').s(`M${x} ${y}v-2.4M${x - 1.2} ${y}l-.6 -2M${x + 1.2} ${y}l.6 -2`, '#c89a8a', .4); } frost(B, o, r, 8); });
    } },
    'rw-ground-bark': { ground: true, tiles: 4, box: BOX, draw(B, o) {
      tile(B, o, 'rw-ground-bark', '#5e4128', r => { for (let i = 0; i < 56; i++) { const x = (r() - .5) * 54, y = -r() * 32, a = r() * 3, l = 2 + r() * 3.4; B.s(`M${x} ${y}l${Math.cos(a) * l} ${Math.sin(a) * l * .6}`, ['#7a5636', '#936a44', '#a87c4f', '#4a3220'][i % 4], 1.8 + r()); } frost(B, o, r, 10); });
    } },
    'rw-ground-clover': { ground: true, tiles: 4, box: BOX, draw(B, o) {
      tile(B, o, 'rw-ground-clover', '#6f9f4e', r => {
        for (let i = 0; i < 26; i++) { const x = (r() - .5) * 54, y = -r() * 32, c = r() < .5 ? '#86b561' : '#5b8a3e'; for (let k = 0; k < 3; k++) { const a = k * 2.1 + r(); B.f(B.circ(x + Math.cos(a) * 1.4, y + Math.sin(a) * .9, 1.3), c); } }
        if (o.season !== 'winter') for (let i = 0; i < 6; i++) { const x = (r() - .5) * 46, y = -3 - r() * 26; B.f(B.circ(x, y, 1.6), '#f4f0e0').f(B.circ(x - .4, y - .4, .7), '#ffffff').f(B.circ(x + .5, y + .4, .5), '#e8b8c8', .7); }
        frost(B, o, r, 14);
      });
    } },
    'rw-ground-moss': { ground: true, tiles: 4, box: BOX, draw(B, o) {
      tile(B, o, 'rw-ground-moss', '#58803f', r => { for (let i = 0; i < 26; i++) B.f(sceneDraw.blob(r, (r() - .5) * 54, -r() * 32, 3 + r() * 4, 1.6 + r() * 2, 7, .5), ['#476b32', '#6f9a4a', '#88ad5c'][i % 3], .85); for (let i = 0; i < 10; i++) B.f(B.circ((r() - .5) * 50, -r() * 30, .7), '#c8d870', .8); frost(B, o, r, 14); });
    } },
    'rw-ground-sand': { ground: true, tiles: 4, box: BOX, draw(B, o) {
      tile(B, o, 'rw-ground-sand', '#e4d6ae', r => { for (let i = 0; i < 4; i++) B.s(`M${-28} ${-6 - i * 7 - r() * 2}q14 ${(r() - .5) * 4} 28 0t28 0`, '#d3c294', 1, .6); speck(B, r, 40, ['#d3c294', '#f0e5c6', '#c4b283'], .8); frost(B, o, r, 8); });
    } },
    'rw-ground-slate': { ground: true, tiles: 4, box: BOX, draw(B, o) {
      tile(B, o, 'rw-ground-slate', '#59616c', r => { for (let i = 0; i < 40; i++) { const x = (r() - .5) * 54, y = -r() * 32, w = 2 + r() * 2.6, a = (r() - .5) * .8; B.f(B.poly([[x - w, y + a], [x + w * .6, y - 1.2], [x + w, y + .6 - a], [x - w * .4, y + 1.4]]), ['#6c7480', '#828a96', '#4b525c', '#747c88'][i % 4]).f(B.poly([[x - w * .8, y + a * .5], [x + w * .4, y - 1]]), '#a8b0ba', .3); } for (let i = 0; i < 12; i++) B.s(`M${(r() - .5) * 50} ${-r() * 30}h1.6`, '#b4bcc4', .6, .7); frost(B, o, r, 14); });
    } },
  };
  // the boardwalk: planks across the run (front) or along it (turned), nail heads, a dark gap between, worn pale tops
  function boards(B, o, side) {
    tile(B, o, 'boardwalk', '#4a3622', r => {
      const cols = ['#a87c4f', '#9a7046', '#b88a5a', '#946a42'];
      if (!side) for (let i = 0; i < 9; i++) { const x = -30 + i * 6.8, c = cols[Math.floor(r() * 4)]; B.f(B.rr(x, -34, 6, 38, .8), c).f(B.rect(x, -34, 1.6, 38), '#d0a878', .5).f(B.rect(x + 4.6, -34, 1.4, 38), '#6a4a2e', .45); for (const y of [-27, -6]) B.f(B.circ(x + 3, y, .6), '#3a3030'); if (r() < .5) B.s(`M${x + 3} ${-30 + r() * 20}v${4 + r() * 6}`, '#6a4a2e', .4, .6); }
      else for (let j = 0; j < 6; j++) { const y = -34 + j * 6.2, c = cols[Math.floor(r() * 4)]; B.f(B.rr(-30, y, 60, 5.4, .8), c).f(B.rect(-30, y, 60, 1.4), '#d0a878', .55).f(B.rect(-30, y + 4.2, 60, 1.2), '#6a4a2e', .45); for (const x of [-20, 18]) B.f(B.circ(x, y + 2.6, .6), '#3a3030'); }
      frost(B, o, r, 10);
    });
  }
})());
