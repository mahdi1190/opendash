/* ============================================================
   SCENE LIBRARY: people (docs/dev/SCENE_ENGINE.md 2.8).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   Every person here is drawn by the shared, FACELESS builder (scenePeople, 70-scene-lib-people-0figure.js):
   person.walker (the reference, 8 presets), person.jogger, person.dog-walker, person.family, person.cyclist and
   person.angler. Each FACES RIGHT; anchor: the feet; anonymous; a wardrobe per season; four or more genuinely
   different variants. Size tier (detailPx): the fine pieces (detail: true) are drawn only when the person is at
   least 48 px tall. The far tier is the silhouette: figure() and farTier() also mark the builder's hands, a short
   sleeve's cuff, its form shading and its rim lights as fine pieces here (a far person costs about what the old
   local figure did in the SVG tile, which carries only the non-detail shapes).
   Night (night.glow): a cool rim light (near tier: the builder's on the people, one along a dog's back and a rod)
   and lit accessories: reflective bands, a runner's clip light and phone armband, an LED dog collar, a child's
   light-up trainers, a buggy's clip light, a bike's lamp and rear light, an angler's isotope float tip, lantern and
   head torch.

   Poses are the builder's (o.arms, o.legs); a lean, a child's scale or a held stride is applied to the path data
   itself (xf), never as a per-shape matrix, so a far person stays small.
   Parts and hooks: walker, jogger, family: legB (the far leg), body, legA (the near leg), the walk hook about the
   hip (scenePeople.HIP). dog-walker: + dog (the dog's near legs, on their own trot bob). cyclist: legB, bike, body,
   legA, the legs pedal about the saddle (-4, -40). angler: gear, body, rod, the rod tip twitches about the hands.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof scenePeople === 'undefined') return;   // the engine core or the people builder is not in this build
  const PP = scenePeople, HIP = PP.HIP, { D, ell, circ, tone4 } = PP;
  const P = (...a) => D(0, ...a);
  const shape = sh => (Array.isArray(sh) ? { f: sh[0], d: sh[1], op: sh[2] } : Object.assign({}, sh));
  const det = sh => Object.assign(shape(sh), { detail: true });
  const line = (s, w, d, op, extra) => Object.assign({ s, w, d, op }, extra || {});
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  /* ---------- path data through an affine map (a lean, a child's scale, a held stride): no per-shape matrix ---------- */
  /** [a, b, c, d, e, f] (SVG order): turn deg (+: clockwise on screen) and scale k about (px, py), then shift by (tx, ty). */
  const about = (deg, px, py, k, tx, ty) => { const r = deg * Math.PI / 180, c = Math.cos(r) * k, s = Math.sin(r) * k; return [c, s, -s, c, px - c * px + s * py + (tx || 0), py - s * px - c * py + (ty || 0)]; };
  const mul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
  const apply = (M, p) => [M[0] * p[0] + M[2] * p[1] + M[4], M[1] * p[0] + M[3] * p[1] + M[5]];
  const inv = M => { const k = M[0] * M[3] - M[1] * M[2]; return [M[3] / k, -M[1] / k, -M[2] / k, M[0] / k, (M[2] * M[5] - M[3] * M[4]) / k, (M[1] * M[4] - M[0] * M[5]) / k]; };
  const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
  const fmt = a => { let o = ''; for (const v of a) { const s = String(Math.round(v * 10) / 10 || 0); o += (o && s[0] !== '-' ? ' ' : '') + s; } return o; };
  /** Path data through M: the builder's commands (absolute M L Q C Z, relative a h v l). */
  function xf(d, M) {
    const k = Math.hypot(M[0], M[1]), deg = Math.atan2(M[1], M[0]) * 180 / Math.PI;
    const pt = (x, y, rel) => [M[0] * x + M[2] * y + (rel ? 0 : M[4]), M[1] * x + M[3] * y + (rel ? 0 : M[5])];
    let o = '';
    for (const [, c, a] of String(d).matchAll(/([A-Za-z])([^A-Za-z]*)/g)) {
      const n = (a.match(NUM) || []).map(Number), rel = c !== c.toUpperCase(), u = c.toUpperCase(), q = [];
      if (u === 'Z') { o += c; continue; }
      if (u === 'A') for (let i = 0; i + 7 <= n.length; i += 7) q.push(n[i] * k, n[i + 1] * k, n[i + 2] + deg, n[i + 3], n[i + 4], ...pt(n[i + 5], n[i + 6], rel));
      else if ((u === 'H' || u === 'V') && rel) { for (const v of n) q.push(...pt(u === 'H' ? v : 0, u === 'V' ? v : 0, true)); o += 'l' + fmt(q); continue; }
      else if ('MLQC'.includes(u)) for (let i = 0; i + 1 < n.length; i += 2) q.push(...pt(n[i], n[i + 1], rel));
      else throw new Error('people xf: path command ' + c + ' is not supported');
      o += c + fmt(q);
    }
    return o;
  }
  /** Shapes through M (their strokes scale with it). */
  const move = (list, M) => { const k = Math.hypot(M[0], M[1]); return list.map(sh => { const o = shape(sh); o.d = xf(o.d, M); if (o.w && k !== 1) o.w = Math.round(o.w * k * 100) / 100; return o; }); };
  /** The far tier: the builder's form shading (part-transparent pieces) and its rim lights become fine pieces, so a
   *  person under 48 px is its plain silhouette (lamps and screens stay: they light at night at any size); stroke widths
   *  are rounded (the SVG writes them as they are). */
  const farTier = list => list.map(sh => {
    const o = shape(sh);
    if (!o.detail && (o.glow === 'rim' || (!o.glow && o.op != null && o.op < 1))) o.detail = true;
    if (o.w) o.w = Math.round(o.w * 100) / 100;
    return o;
  });
  /** scenePeople.figure with a slimmer far tier: each arm's hand and a short sleeve's cuff are fine pieces too (under 48 px a
   *  hand is a pixel; the arm's round cap ends it). */
  const figure = o => {
    const f = PP.figure(o);
    for (const r of [f.at.farArm, f.at.nearArm]) {
      let n = 0;
      for (let i = r[0]; i < r[1]; i++) { const sh = shape(f.body[i]); if (sh.detail) continue; n++; if (!sh.s || n === 3) f.body[i] = Object.assign(sh, { detail: true }); }
    }
    return f;
  };
  /** The mean y of a path's absolute points (which shapes are the head, for a cyclist's raised head). */
  const meanY = d => { let n = 0, s = 0; for (const [, c, a] of String(d).matchAll(/([MLQC])([^A-Za-z]*)/g)) { const v = (a.match(NUM) || []).map(Number); for (let i = 1; i < v.length; i += 2) { s += v[i]; n++; } } return n ? s / n : 0; };

  /* ---------- palette and night: the builder's slots plus bikes, rods, dogs; the lit accessories' colours ---------- */
  const PAL = PP.palette({ tyre: tone4('#26272b'), alloy: tone4('#a9adb4'), cork: tone4('#b98d5e'), carbon: tone4('#2c2a28'), cane: tone4('#c9a86a'),
    gold: tone4('#c9975a'), dogblk: tone4('#2b2724'), dogwht: tone4('#ece6da'), dogtan: tone4('#b0743c'), lime: tone4('#c6dc3c'), float: tone4('#e0482c') });
  const NIGHT = { on: 1, glow: Object.assign({}, PP.NIGHT.glow, { led: '#ff4d3d', beam: '#fff4d6', tail: '#ff3b30', collar: '#6dffc4', isotope: '#d4ff5c', kicks: '#ff6ad5' }) };
  const t = (slot, k) => `@${slot}.${k || 0}`;

  /* ---------- person.walker: the reference person on the shared builder (70-scene-lib-people-0figure.js) ----------
     8 presets (scenePeople.PRESETS): age, build, skin, hair and a wardrobe per season; faceless; 100 to 150 shapes
     near, the fine ones (detail: true) dropped under 48 px (detailPx); at night a cool rim light, lit strips and screens. */
  PP.define({
    id: 'person.walker', category: 'person', size: [29, 64], variants: PP.PRESETS.length, seasonal: true, shapeBySeason: true, flippable: true, parts: ['legB', 'body', 'legA'],
    palette: PP.palette(), anim: PP.walkAnim(0.9, 22, 1.5), shadow: { rx: 11, ry: 2.4, h: 64 }, night: PP.NIGHT, detailPx: true,
    tags: PP.tags(['walker', 'path']),
    credit: 'the shared people builder (scenePeople.figure, 8 presets with a seasonal wardrobe)',
    build(v, r, ctx) { const f = PP.figure(PP.outfit(PP.PRESETS[v], ctx.season)); return { legB: f.legB, body: f.body, legA: f.legA }; },
  });

  /* ---------- person.jogger: run arms and legs, a forward lean, sportswear; at night a reflective band and a red clip light ---------- */
  const JOG = [
    { build: 'slim', skin: 2, hair: { style: 'crop', col: 0 },
      spring: { top: { kind: 'tee', col: 'teal' }, bottom: { kind: 'shorts', col: 'black' }, tights: 'black', shoes: { kind: 'trainer', col: 'coral' } },
      summer: { top: { kind: 'tee', col: 'coral' }, bottom: { kind: 'shorts', col: 'navy' }, shoes: { kind: 'trainer', col: 'white' }, hat: { kind: 'cap', col: 'white' } },
      autumn: { top: { kind: 'jacket', col: 'teal' }, bottom: { kind: 'joggers', col: 'black' }, shoes: { kind: 'trainer', col: 'coral' }, band: 1 },
      winter: { top: { kind: 'jacket', col: 'yellow' }, bottom: { kind: 'joggers', col: 'black' }, shoes: { kind: 'trainer', col: 'grey' }, hat: { kind: 'beanie', col: 'black' }, gloves: 'black', band: 1 } },
    { build: 'slim', skin: 0, hair: { style: 'pony', col: 3 },
      spring: { top: { kind: 'tee', col: 'pink' }, bottom: { kind: 'joggers', col: 'black' }, shoes: { kind: 'trainer', col: 'white' } },
      summer: { top: { kind: 'tee', col: 'sky' }, bottom: { kind: 'shorts', col: 'black' }, shoes: { kind: 'trainer', col: 'pink' }, hat: { kind: 'cap', col: 'pink' } },
      autumn: { top: { kind: 'hoodie', col: 'plum' }, bottom: { kind: 'joggers', col: 'black' }, shoes: { kind: 'trainer', col: 'white' }, band: 1 },
      winter: { top: { kind: 'jacket', col: 'coral' }, bottom: { kind: 'joggers', col: 'charcoal' }, shoes: { kind: 'trainer', col: 'grey' }, hat: { kind: 'beanie', col: 'white', pom: 'coral' }, gloves: 'charcoal', band: 1 } },
    { build: 'average', skin: 4, hair: { style: 'bald', col: 0 },
      spring: { top: { kind: 'tee', col: 'red' }, bottom: { kind: 'shorts', col: 'charcoal' }, shoes: { kind: 'trainer', col: 'grey' } },
      summer: { top: { kind: 'tee', col: 'yellow' }, bottom: { kind: 'shorts', col: 'black' }, shoes: { kind: 'trainer', col: 'white' } },
      autumn: { top: { kind: 'hoodie', col: 'grey' }, bottom: { kind: 'shorts', col: 'black' }, tights: 'black', shoes: { kind: 'trainer', col: 'white' }, band: 1 },
      winter: { top: { kind: 'jacket', col: 'black' }, bottom: { kind: 'joggers', col: 'black' }, shoes: { kind: 'trainer', col: 'white' }, hat: { kind: 'beanie', col: 'red' }, gloves: 'black', band: 1 } },
    { build: 'slim', age: 'young', skin: 5, hair: { style: 'curly', col: 0 },
      spring: { top: { kind: 'hoodie', col: 'forest' }, bottom: { kind: 'joggers', col: 'grey' }, shoes: { kind: 'trainer', col: 'white' } },
      summer: { top: { kind: 'tee', col: 'mustard' }, bottom: { kind: 'shorts', col: 'navy' }, shoes: { kind: 'trainer', col: 'white' } },
      autumn: { top: { kind: 'hoodie', col: 'navy', hood: 'up' }, bottom: { kind: 'joggers', col: 'charcoal' }, shoes: { kind: 'trainer', col: 'coral' }, band: 1 },
      winter: { top: { kind: 'hoodie', col: 'black', hood: 'up' }, bottom: { kind: 'joggers', col: 'black' }, shoes: { kind: 'trainer', col: 'white' }, gloves: 'black', band: 1 } },
  ];
  PP.define({
    id: 'person.jogger', category: 'person', size: [37, 64], variants: JOG.length, seasonal: true, shapeBySeason: true, flippable: true, parts: ['legB', 'body', 'legA'],
    palette: PAL, anim: PP.walkAnim(0.55, 28, 2), shadow: { rx: 11, ry: 2.4, h: 64 }, night: NIGHT, detailPx: true,
    tags: PP.tags(['jogger', 'runner', 'path']),
    credit: 'the shared people builder (scenePeople.figure: run arms and legs, sportswear)',
    build(v, r, ctx) {
      const o = PP.outfit(JOG[v], ctx.season), f = figure(Object.assign({}, o, { arms: 'run', legs: 'run' }));
      const s = f.shoulders.far[1] - 1.9, extra = [];   // s: the shoulder line
      // a clip light on the back of the waistband (red at night), a reflective band across the chest (autumn, winter)
      extra.push({ f: t('charcoal', 0), d: P('M', -5.6, -35.4, 'L', -4.2, -35.6, 'L', -4.1, -33.4, 'L', -5.5, -33.2, 'Z'), glow: 'led' });
      if (o.band) extra.push({ f: t('lime', 0), d: P('M', -3.6, s + 4.4, 'L', 3.6, s + 9.6, 'L', 3.4, s + 11.2, 'L', -3.8, s + 6, 'Z'), op: 0.9, glow: 'lamp' });
      const body = f.body.slice();
      if (!o.band) {   // a phone armband on the near upper arm (on top of it), its screen lit at night
        const sh = f.shoulders.near, el = PP.ik(sh, f.hands.near, 9.4, 9.7, 1)[0], m = lerp(sh, el, 0.45), u = [(el[0] - sh[0]) / 9.4, (el[1] - sh[1]) / 9.4], n = [-u[1], u[0]];
        const q = (a, b) => [m[0] + u[0] * a + n[0] * b, m[1] + u[1] * a + n[1] * b], quad = (a, b) => P('M', ...q(-a, -b), 'L', ...q(a, -b), 'L', ...q(a, b), 'L', ...q(-a, b), 'Z');
        body.splice(f.at.nearArm[1], 0, det([t('charcoal', 0), quad(1.5, 1.9)]), det({ f: t('sky', 1), d: quad(1.0, 1.2), glow: 'screen' }));
      }
      body.splice(f.at.nearArm[0], 0, ...extra);   // under the near arm
      return { legB: farTier(f.legB), body: farTier(move(body, about(7, f.pivot[0], f.pivot[1], 1))), legA: farTier(f.legA) };
    },
  });

  /* ---------- person.dog-walker: a walker holding a lead, and a dog that trots (its near legs on their own bob) ---------- */
  const DOGW = [
    { build: 'average', skin: 1, hair: { style: 'short', col: 2 }, lead: 'red',
      spring: { top: { kind: 'jacket', col: 'olive' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'tan' } },
      summer: { top: { kind: 'tee', col: 'navy' }, bottom: { kind: 'shorts', col: 'khaki' }, shoes: { kind: 'trainer', col: 'grey' }, hat: { kind: 'cap', col: 'navy' } },
      autumn: { top: { kind: 'jacket', col: 'tweed' }, bottom: { kind: 'trousers', col: 'charcoal' }, shoes: { kind: 'boot', col: 'black' }, hat: { kind: 'flatcap', col: 'tweed' }, scarf: { col: 'mustard' } },
      winter: { top: { kind: 'parka', col: 'forest', strip: 1 }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'black' }, hat: { kind: 'beanie', col: 'charcoal' }, gloves: 'black', scarf: { col: 'red' } } },
    { build: 'slim', skin: 3, hair: { style: 'long', col: 1 }, lead: 'teal',
      spring: { top: { kind: 'rain', col: 'sky' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'forest' } },
      summer: { top: { kind: 'blouse', col: 'coral' }, bottom: { kind: 'trousers', col: 'stone' }, shoes: { kind: 'sandal', col: 'tan' }, hat: { kind: 'sunhat', col: 'cream', band: 'coral' } },
      autumn: { top: { kind: 'jumper', col: 'mustard' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'tan' }, scarf: { col: 'rust' } },
      winter: { top: { kind: 'coat', col: 'camel', strip: 1 }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'black' }, hat: { kind: 'beanie', col: 'cream' }, scarf: { col: 'cream' }, gloves: 'tan' } },
    { build: 'slim', age: 'older', skin: 0, hair: { style: 'bun', col: 6 }, lead: 'navy',
      spring: { top: { kind: 'cardigan', col: 'sky', col2: 'cream' }, bottom: { kind: 'trousers', col: 'grey' }, shoes: { kind: 'shoe', col: 'navy' } },
      summer: { top: { kind: 'shirt', col: 'cream' }, bottom: { kind: 'trousers', col: 'khaki' }, shoes: { kind: 'shoe', col: 'tan' }, hat: { kind: 'sunhat', col: 'stone', band: 'navy' } },
      autumn: { top: { kind: 'rain', col: 'teal', strip: 1 }, bottom: { kind: 'trousers', col: 'charcoal' }, shoes: { kind: 'boot', col: 'black' } },
      winter: { top: { kind: 'coat', col: 'burgundy', strip: 1 }, bottom: { kind: 'trousers', col: 'charcoal' }, shoes: { kind: 'boot', col: 'black' }, hat: { kind: 'beanie', col: 'plum' }, scarf: { col: 'plum', col2: 'pink' }, gloves: 'plum' } },
    { build: 'average', age: 'young', skin: 5, hair: { style: 'crop', col: 0 }, lead: 'black',
      spring: { top: { kind: 'hoodie', col: 'grey' }, bottom: { kind: 'joggers', col: 'charcoal' }, shoes: { kind: 'trainer', col: 'white' } },
      summer: { top: { kind: 'tee', col: 'white' }, bottom: { kind: 'shorts', col: 'denim' }, shoes: { kind: 'trainer', col: 'white' }, hat: { kind: 'cap', col: 'red' } },
      autumn: { top: { kind: 'hoodie', col: 'red', hood: 'up' }, bottom: { kind: 'joggers', col: 'black' }, shoes: { kind: 'trainer', col: 'white' } },
      winter: { top: { kind: 'parka', col: 'black', hood: 'up', strip: 1 }, bottom: { kind: 'joggers', col: 'black' }, shoes: { kind: 'trainer', col: 'white' }, gloves: 'black' } },
  ];
  /* Dogs: H the shoulder height, L rump to chest, hs the head's scale, mz the muzzle, w a leg's width; coat colours. */
  const DOGS = [
    { breed: 'retriever', H: 19, L: 25, hs: 1, mz: 3.8, w: 3, coat: 'gold', ear: 'drop', tail: 'feather', collar: 'red' },
    { breed: 'labrador', H: 19, L: 24, hs: 1, mz: 3.8, w: 3.2, coat: 'dogblk', ear: 'drop', tail: 'otter', collar: 'lime' },
    { breed: 'terrier', H: 12, L: 15, hs: 0.78, mz: 3.0, w: 2.4, coat: 'dogwht', patch: 'dogtan', ear: 'button', tail: 'up', collar: 'navy', jacket: 'red' },
    { breed: 'collie', H: 18, L: 24, hs: 0.95, mz: 4.4, w: 2.9, coat: 'dogblk', bib: 'dogwht', ear: 'button', tail: 'plume', collar: 'red' },
  ];
  const DOG_X = 21, DOG_LIFT = 1.2;   // the dog's rump x (clear of the walker's forward foot); its near legs ride 1.2 up (the bob's low point)
  /** A dog facing right, paws on y 0: { body (far legs, tail, torso, head, collar; static), near (the near legs: the bob part), ring (the lead's end) }. */
  function dog(g, season) {
    const { H, L, hs, mz, w } = g, Q = (...a) => D(DOG_X, ...a), y = k => -H * k, c = g.coat;
    const Nx = L * 0.8, Ny = y(1), N = (x, yy) => [Nx + x * hs, Ny + yy * hs];
    const hp = (...pairs) => pairs.flatMap(p => (typeof p === 'string' ? [p] : N(p[0], p[1])));
    const legF = x => Q('M', x, y(0.66), 'L', x + w, y(0.66), 'L', x + w * 0.85, -1.6, 'Q', x + w * 1.55, -1.5, x + w * 1.5, 0, 'L', x - 0.2, 0, 'Z');
    const legR = x => Q('M', x - 0.6, y(0.74), 'Q', x + w * 1.9, y(0.76), x + w * 1.5, y(0.42), 'Q', x + w, y(0.26), x + w * 0.7, y(0.17), 'L', x + w * 0.8, -1.6, 'Q', x + w * 1.45, -1.5, x + w * 1.4, 0, 'L', x - 0.1, 0, 'L', x - 0.4, y(0.22), 'Q', x - 1.2, y(0.46), x - 0.6, y(0.74), 'Z');
    const xf0 = L * 0.86, xr0 = L * 0.08, sock = g.bib ? 'dogwht' : null;
    const legs = (far) => {
      const k = far ? 1 : 0, dx = far ? -2.6 : 0, dr = far ? 3 : 0, out = [[t(c, k), legF(xf0 + dx) + legR(xr0 + dr)]];   // both legs of a side in one path
      if (sock) out.push([t(sock, k), Q('M', xf0 + dx + 0.1, y(0.24), 'L', xf0 + dx + w * 0.9, y(0.24), 'L', xf0 + dx + w * 0.85, -1.6, 'Q', xf0 + dx + w * 1.55, -1.5, xf0 + dx + w * 1.5, 0, 'L', xf0 + dx - 0.2, 0, 'Z')
        + Q('M', xr0 + dr + w * 0.25, y(0.2), 'L', xr0 + dr + w * 0.95, y(0.2), 'L', xr0 + dr + w * 0.8, -1.6, 'Q', xr0 + dr + w * 1.45, -1.5, xr0 + dr + w * 1.4, 0, 'L', xr0 + dr - 0.1, 0, 'Z')]);
      // fine: the paws' toes, the elbow and hock shade, feathering on a retriever's legs
      out.push(det(line(t(sock || c, 3), 0.3, Q('M', xf0 + dx + w * 1.0, -0.9, 'L', xf0 + dx + w * 1.05, 0, 'M', xr0 + dr + w * 0.95, -0.9, 'L', xr0 + dr + w, 0), 0.6)));
      out.push(det(line(t(c, far ? 3 : 1), 0.45, Q('M', xr0 + dr + w * 1.3, y(0.5), 'Q', xr0 + dr + w * 1.1, y(0.3), xr0 + dr + w * 0.7, y(0.2)), 0.5)));
      if (g.tail === 'feather') out.push(det(line(t(c, 2), 0.5, Q('M', xf0 + dx - 0.2, y(0.56), 'Q', xf0 + dx - 1.2, y(0.42), xf0 + dx - 0.4, y(0.3), 'M', xr0 + dr - 0.4, y(0.6), 'Q', xr0 + dr - 1.6, y(0.46), xr0 + dr - 0.8, y(0.3)), 0.7)));
      return out;
    };
    const body = [...legs(true)];
    // the tail
    const TAIL = {
      feather: Q('M', 0.8, y(0.94), 'Q', -3.5, y(0.92), -6.6, y(0.62), 'Q', -5.4, y(0.58), -3.8, y(0.66), 'Q', -1.6, y(0.74), 0.2, y(0.78), 'Z'),
      otter: Q('M', 0.6, y(0.93), 'Q', -4.2, y(0.98), -7.2, y(0.8), 'Q', -7.2, y(0.74), -6.4, y(0.75), 'Q', -3.6, y(0.83), 0.2, y(0.8), 'Z'),
      up: Q('M', 1.2, y(0.94), 'Q', -0.6, y(1.2), 0.2, y(1.5), 'Q', 1, y(1.54), 1.3, y(1.44), 'Q', 1.0, y(1.2), 2.4, y(0.98), 'Z'),
      plume: Q('M', 0.5, y(0.92), 'Q', -3.6, y(0.74), -3.8, y(0.36), 'Q', -2.6, y(0.3), -2, y(0.36), 'Q', -1.4, y(0.66), 0.6, y(0.76), 'Z'),
    };
    body.push([t(c, 0), TAIL[g.tail]]);
    if (g.tail === 'feather') body.push(det(line(t(c, 2), 0.45, Q('M', -1.2, y(0.86), 'Q', -3.6, y(0.82), -5.4, y(0.66), 'M', -2, y(0.76), 'Q', -3.6, y(0.72), -4.6, y(0.62)), 0.7)));
    if (g.tail === 'plume') body.push(det([t('dogwht', 0), Q('M', -3.7, y(0.46), 'Q', -3.8, y(0.36), -3.4, y(0.32), 'Q', -2.6, y(0.3), -2, y(0.36), 'L', -2.2, y(0.46), 'Z')]));
    // the torso: rump, topline, chest, brisket, the belly's tuck, the rear thigh
    const torso = Q('M', 0.5, y(0.92), 'Q', L * 0.45, y(1.06), L * 0.82, y(1), 'Q', L * 1.02, y(0.98), L * 1.06, y(0.74), 'Q', L * 1.05, y(0.52), L * 0.86, y(0.47),
      'Q', L * 0.5, y(0.5), L * 0.3, y(0.58), 'Q', L * 0.08, y(0.5), -0.6, y(0.66), 'Q', -1.2, y(0.84), 0.5, y(0.92), 'Z');
    // the head and neck: nape, skull, stop, muzzle, nose, jaw, throat
    const head = Q(...hp('M', [-1.2, 0.6], 'Q', [1.4, -4.4], [4.2, -7.0], 'Q', [6.6, -9.8], [9.4, -7.2], 'L', [9.4 + mz, -5.9], 'Q', [10.6 + mz, -4.8], [9.6 + mz, -3.2], 'L', [8.0, -2.6], 'Q', [6.6, -1.4]), L * 1.06, y(0.74), 'L', ...N(1, 2), 'Z');
    body.push([t(c, 0), torso + head]);   // one path (both wind the same way)
    if (g.bib) body.push([t(g.bib, 0), Q(...hp('M', [3.4, -2.8], 'Q', [5.6, -3.4], [8.0, -2.6], 'Q', [6.6, -1.4]), L * 1.06, y(0.74), 'Q', L * 1.02, y(0.56), L * 0.9, y(0.5), 'Q', L * 0.84, y(0.78), ...N(3.4, -2.8), 'Z')],
      det([t(g.bib, 0), Q(...hp('M', [9.6, -5.8], 'L', [9.4 + mz, -5.9], 'Q', [10.6 + mz, -4.8], [9.6 + mz, -3.2], 'L', [9.2, -3.1], 'Z'))]));   // the white bib, a white muzzle (fine)
    if (g.patch) body.push([t(g.patch, 0), Q(...hp('M', [4.2, -6.8], 'Q', [6.6, -9.6], [9.4, -7.2], 'L', [9.6, -5.6], 'Q', [7.4, -5.0], [5.2, -3.8], 'Z'))], [t(g.patch, 0), Q('M', L * 0.32, y(1.03), 'Q', L * 0.5, y(1.08), L * 0.66, y(1.02), 'Q', L * 0.56, y(0.86), L * 0.4, y(0.88), 'Z')]);
    if (g.jacket && season === 'winter') body.push([t(g.jacket, 0), Q('M', L * 0.16, y(0.98), 'Q', L * 0.45, y(1.1), L * 0.8, y(1.04), 'L', L * 0.92, y(0.62), 'Q', L * 0.6, y(0.52), L * 0.22, y(0.62), 'Z')],
      det(line(t(g.jacket, 3), 0.4, Q('M', L * 0.22, y(0.66), 'Q', L * 0.6, y(0.56), L * 0.9, y(0.66)), 0.6)));   // a little dog's winter coat
    const EAR = {
      drop: hp('M', [5.2, -7.6], 'Q', [3.6, -5.8], [4.2, -2.6], 'Q', [5.6, -2.4], [6.6, -6.4], 'Z'),
      button: hp('M', [5.0, -7.8], 'Q', [6.0, -10.4], [8.2, -8.6], 'Q', [7.4, -7.6], [6.4, -7.2], 'Z'),
    };
    body.push(det([t(g.patch || c, 1), Q(...EAR[g.ear])]), det(['@ink.0', ell(DOG_X + N(9.9 + mz, -4.8)[0], N(0, -4.8)[1], 0.8 * hs, 0.7 * hs)]));   // the ear and the nose: fine
    // fine: the sheen along the back, the belly's shade, a chest fold, the ear's edge, the nose's light, the muzzle line
    body.push(det(line(t(c, 2), 0.6, Q('M', 1.4, y(0.98), 'Q', L * 0.45, y(1.09), L * 0.78, y(1.03)), 0.6)), det([t(c, 1), Q('M', L * 0.3, y(0.58), 'Q', L * 0.5, y(0.5), L * 0.86, y(0.47), 'Q', L * 0.6, y(0.58), L * 0.3, y(0.62), 'Z'), 0.6]));
    body.push(det(line(t(c, 1), 0.4, Q(...hp('M', [1.6, -1.2], 'Q', [3.6, -3.4], [5.0, -6.0])), 0.5)), det(line(t(c, 3), 0.35, Q(...hp('M', [8.0, -3.4], 'L', [9.2 + mz, -3.6])), 0.6)), det(['@ink.2', ell(DOG_X + N(10 + mz, -5.1)[0], N(0, -5.1)[1], 0.3 * hs, 0.22 * hs), 0.8]));
    if (g.tail === 'feather') body.push(det(line(t(c, 2), 0.45, Q('M', L * 1.0, y(0.62), 'Q', L * 0.96, y(0.5), L * 1.03, y(0.42), 'M', L * 0.7, y(0.5), 'Q', L * 0.66, y(0.42), L * 0.72, y(0.38)), 0.7)));   // chest and belly feathering
    body.push(det({ f: t(c, 0), op: 0.6, glow: 'rim', d: Q('M', 0.6, y(0.93), 'Q', L * 0.45, y(1.07), L * 0.8, y(1.01), 'L', L * 0.8, y(0.97), 'Q', L * 0.45, y(1.02), 1.0, y(0.88), 'Z') }));   // a rim light along the back
    // the collar (an LED collar at night) and its ring
    body.push({ f: t(g.collar, 0), d: Q(...hp('M', [0.9, -2.6], 'L', [2.4, -3.6], 'L', [6.2, -0.6], 'L', [5.0, 0.4], 'Z')), glow: 'collar' });
    const ring = N(1.6, -3.2);
    body.push(det(line(t('alloy', 0), 0.35, P('M', DOG_X + ring[0] - 0.5, ring[1], 'Q', DOG_X + ring[0], ring[1] - 0.9, DOG_X + ring[0] + 0.5, ring[1]), 0.9)));
    // the near legs, raised by DOG_LIFT (the bob carries them DOG_LIFT +- 1.6: a trot that never sinks far)
    const near = move(legs(false), [1, 0, 0, 1, 0, -DOG_LIFT]);
    return { body, near, ring: [DOG_X + ring[0], ring[1]] };
  }
  PP.define({
    id: 'person.dog-walker', category: 'person', size: [67, 68], variants: DOGW.length, seasonal: true, shapeBySeason: true, flippable: true, parts: ['legB', 'body', 'legA', 'dog'],
    palette: PAL, anim: Object.assign(PP.walkAnim(0.9, 22, 1.5), { bob: { part: 'dog', dy: 1.6, period: 0.42 } }), shadow: { rx: 28, ry: 2.6, h: 64 }, night: NIGHT, detailPx: true,
    tags: PP.tags(['dog-walker', 'dog', 'path']),
    credit: 'the shared people builder (scenePeople.figure, the near hand on a lead) and four dogs',
    build(v, r, ctx) {
      const W = DOGW[v], f = figure(Object.assign({}, PP.outfit(W, ctx.season), { arms: { far: 'back', near: 'hold' } })), g = dog(DOGS[v], ctx.season);
      const h = f.hands.near, q = g.ring, sag = Math.max(h[1], q[1]) + 6;
      const lead = [line(t(W.lead, 1), 0.8, P('M', h[0] + 0.4, h[1] + 0.4, 'Q', (h[0] + q[0]) / 2, sag, q[0], q[1])),
        det([t('charcoal', 0), P('M', h[0] - 0.4, h[1] - 1.4, 'L', h[0] + 1.6, h[1] - 1.0, 'L', h[0] + 1.2, h[1] + 1.4, 'L', h[0] - 0.6, h[1] + 1.0, 'Z')]),   // the lead's handle
        det(line(t(W.lead, 2), 0.35, P('M', h[0] + 2.4, h[1] + 1.6, 'Q', (h[0] + q[0]) / 2, sag - 0.4, q[0] - 1.4, q[1] + 0.2), 0.6))];
      return { legB: farTier(f.legB), body: farTier([...g.body, ...f.body, ...lead]), legA: farTier(f.legA), dog: g.near };
    },
  });

  /* ---------- person.family: an adult and a child hand in hand (one variant adds a second adult, one a buggy) ----------
     The lead adult walks (the walk hook); the others step in a held stride. Faceless, anonymous; not one silhouette. */
  const KIDS = [
    { build: 'slim', age: 'young', tall: -3, skin: 1, hair: { style: 'short', col: 3 },
      spring: { top: { kind: 'rain', col: 'yellow' }, bottom: { kind: 'trousers', col: 'navy' }, shoes: { kind: 'boot', col: 'red' } },
      summer: { top: { kind: 'tee', col: 'red' }, bottom: { kind: 'shorts', col: 'navy' }, shoes: { kind: 'trainer', col: 'white' }, hat: { kind: 'cap', col: 'sky' } },
      autumn: { top: { kind: 'hoodie', col: 'teal' }, bottom: { kind: 'trousers', col: 'navy' }, shoes: { kind: 'boot', col: 'red' } },
      winter: { top: { kind: 'parka', col: 'red', strip: 1 }, bottom: { kind: 'trousers', col: 'navy' }, shoes: { kind: 'boot', col: 'black' }, hat: { kind: 'beanie', col: 'navy', pom: 'white' }, gloves: 'navy', scarf: { col: 'yellow' } } },
    { build: 'slim', age: 'young', tall: -3, skin: 3, hair: { style: 'pony', col: 0 },
      spring: { top: { kind: 'jacket', col: 'pink' }, bottom: { kind: 'skirt', col: 'denim' }, tights: 'white', shoes: { kind: 'trainer', col: 'white' } },
      summer: { top: { kind: 'tee', col: 'yellow' }, bottom: { kind: 'skirt', col: 'pink' }, shoes: { kind: 'sandal', col: 'tan' }, hat: { kind: 'sunhat', col: 'cream', band: 'pink' } },
      autumn: { top: { kind: 'coat', col: 'red' }, bottom: { kind: 'skirt', col: 'navy' }, tights: 'navy', shoes: { kind: 'boot', col: 'black' } },
      winter: { top: { kind: 'parka', col: 'plum', hood: 'up', strip: 1 }, bottom: { kind: 'joggers', col: 'charcoal' }, shoes: { kind: 'boot', col: 'black' }, gloves: 'pink' } },
    { build: 'slim', age: 'young', tall: -3, skin: 0, hair: { style: 'curly', col: 4 },
      spring: { top: { kind: 'rain', col: 'red' }, bottom: { kind: 'joggers', col: 'navy' }, shoes: { kind: 'boot', col: 'yellow' } },
      summer: { top: { kind: 'tee', col: 'sky' }, bottom: { kind: 'shorts', col: 'khaki' }, shoes: { kind: 'trainer', col: 'white' }, hat: { kind: 'cap', col: 'yellow' } },
      autumn: { top: { kind: 'jumper', col: 'mustard' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'trainer', col: 'red' }, scarf: { col: 'red' } },
      winter: { top: { kind: 'coat', col: 'navy', strip: 1 }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'black' }, hat: { kind: 'beanie', col: 'red', pom: 'white' }, gloves: 'red' } },
    { build: 'slim', age: 'young', tall: -3, skin: 4, hair: { style: 'long', col: 1 },
      spring: { top: { kind: 'hoodie', col: 'coral' }, bottom: { kind: 'joggers', col: 'grey' }, shoes: { kind: 'trainer', col: 'white' }, bag: { kind: 'backpack', col: 'yellow' } },
      summer: { top: { kind: 'blouse', col: 'white' }, bottom: { kind: 'shorts', col: 'denim' }, shoes: { kind: 'sandal', col: 'tan' } },
      autumn: { top: { kind: 'rain', col: 'teal', strip: 1 }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'red' } },
      winter: { top: { kind: 'parka', col: 'coral', hood: 'up', strip: 1 }, bottom: { kind: 'joggers', col: 'navy' }, shoes: { kind: 'trainer', col: 'white' }, gloves: 'white' } },
  ];
  /* lead: the walking adult (a preset); kid: KIDS; k: the child's scale; cx: the child's x; other: a second adult (preset) at ox; buggy */
  const FAM = [
    { lead: 0, kid: 0, k: 0.64, cx: -14, other: 6, ox: -34 },
    { lead: 1, kid: 1, k: 0.6, cx: -14 },
    { lead: 5, kid: 2, k: 0.62, cx: -14 },
    { lead: 7, kid: 3, k: 0.7, cx: -16, buggy: 1 },
  ];
  /** A static figure's parts in a held stride (legs turned +-deg about the hip), scaled k about the feet, at x. */
  const posed = (f, deg, k, x) => {
    const at = (a) => mul([k, 0, 0, k, x, 0], about(a, 0, HIP, 1));
    return [...move(f.legB, at(deg)), ...move(f.body, [k, 0, 0, k, x, 0]), ...move(f.legA, at(-deg))];
  };
  /** Light-up soles on a child's trainers (a stride's legs carry them). */
  const kicks = (f, o) => { if (!o.shoes || o.shoes.kind !== 'trainer') return; for (const lg of [f.legB, f.legA]) lg.push({ f: t('sole', 0), d: P('M', -2.2, -0.5, 'L', 5.6, -0.5, 'L', 5.5, -0.1, 'L', -2.2, -0.1, 'Z'), glow: 'kicks' }); };
  function buggy() {
    const col = 'teal', out = [];
    out.push(line(t('charcoal', 0), 1.0, P('M', 10.6, -37.2, 'L', 21, -10.6, 'L', 33.4, -3.2, 'M', 21, -10.6, 'L', 20, -3.4)));   // the handle and the frame
    out.push(line(t('tyre', 0), 1.3, circ(20, -3.2, 2.6)), line(t('tyre', 0), 1.2, circ(33.4, -2.6, 2.1)));
    out.push([t(col, 0), P('M', 16.2, -21.6, 'Q', 22, -24, 30.4, -20.8, 'L', 31.6, -13.6, 'Q', 24, -11.4, 16.8, -13.4, 'Z')]);   // the seat
    out.push([t(col, 1), P('M', 15.4, -21.4, 'Q', 15.6, -31.4, 24.4, -31.6, 'Q', 22.4, -27, 23.6, -22.4, 'Q', 19.2, -22.6, 15.4, -21.4, 'Z')]);   // the hood
    out.push([t('cream', 0), P('M', 23.6, -22.6, 'Q', 27.4, -24.2, 30.4, -20.8, 'Q', 27, -19.6, 23.8, -20.4, 'Z')]);   // a blanket
    out.push(det(line(t(col, 3), 0.4, P('M', 17, -26.4, 'Q', 19.6, -29.6, 23.6, -29.8, 'M', 16.2, -23.4, 'Q', 19, -27.6, 23.2, -27.2), 0.6)), det(line(t('tyre', 2), 0.35, P('M', 20, -5.8, 'L', 20, -0.6, 'M', 17.4, -3.2, 'L', 22.6, -3.2, 'M', 33.4, -4.7, 'L', 33.4, -0.5, 'M', 31.3, -2.6, 'L', 35.5, -2.6), 0.7)),
      det([t('alloy', 0), circ(20, -3.2, 0.6)]), det([t('alloy', 0), circ(33.4, -2.6, 0.5)]), det(line(t('charcoal', 2), 0.4, P('M', 9.8, -37.8, 'L', 11.6, -36.6), 0.9)), det(line(t(col, 2), 0.45, P('M', 17, -14, 'Q', 24, -12.2, 31.2, -14.2), 0.5)));
    out.push({ f: t('charcoal', 1), d: P('M', 31.4, -17.4, 'L', 32.6, -17.6, 'L', 32.7, -16, 'L', 31.5, -15.8, 'Z'), glow: 'led' });   // a clip light on the buggy's front
    return out;
  }
  PP.define({
    id: 'person.family', category: 'person', size: [70, 70], variants: FAM.length, seasonal: true, shapeBySeason: true, flippable: true, parts: ['legB', 'body', 'legA'],
    palette: PAL, anim: PP.walkAnim(0.8, 18, 1.2), shadow: { rx: 32, ry: 2.6, h: 64 }, night: NIGHT, detailPx: true,
    tags: PP.tags(['family', 'child', 'path']).filter(x => x !== 'silhouette'),   // a group: not a single silhouette for the care rule
    credit: 'the shared people builder (scenePeople.figure: an adult and a child hand in hand)',
    build(v, r, ctx) {
      const F = FAM[v], se = ctx.season, ko = PP.outfit(KIDS[F.kid], se), K = F.k, cx = F.cx;
      const meet = [cx + 7.4, -31.4];   // where the adult's far hand holds the child's near hand
      const arms = F.buggy ? { far: { hand: [11.6, -37.6] }, near: { hand: [10.4, -36.8] } } : { far: { hand: meet }, near: 'back' };
      const a = figure(Object.assign(PP.outfit(PP.PRESETS[F.lead], se), { hold: null, arms }));
      const kid = figure(Object.assign({}, ko, F.buggy ? {} : { arms: { far: 'forward', near: { hand: [(meet[0] - cx) / K, meet[1] / K] } } }));
      kicks(kid, ko);
      const body = [];
      if (F.other != null) body.push(...posed(figure(Object.assign(PP.outfit(PP.PRESETS[F.other], se), { hold: null })), 14, 1, F.ox));
      body.push(...posed(kid, 16, K, cx), ...a.body);
      if (F.buggy) body.push(...buggy());
      return { legB: farTier(a.legB), body: farTier(body), legA: farTier(a.legA) };
    },
  });

  /* ---------- person.cyclist: a rider on a bike (four bikes); the legs pedal about the saddle; a helmet, lamp and rear light ----------
     The rider's hip sits on the saddle at (-4, -40), the walk hook's pivot; the torso leans over the bars by the bike's lean
     (the head turns back up, to look ahead); the hands are on the grips and the feet on the pedals (the builder's IK). */
  const CYC = [
    { build: 'average', skin: 3, hair: { style: 'long', col: 2 },
      spring: { top: { kind: 'rain', col: 'yellow' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'tan' }, hat: { kind: 'helmet', col: 'white' } },
      summer: { top: { kind: 'blouse', col: 'sky' }, bottom: { kind: 'skirt', col: 'navy' }, shoes: { kind: 'sandal', col: 'tan' }, hat: { kind: 'helmet', col: 'white' } },
      autumn: { top: { kind: 'jacket', col: 'rust' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'tan' }, scarf: { col: 'mustard' }, hat: { kind: 'helmet', col: 'white', strip: 1 } },
      winter: { top: { kind: 'coat', col: 'camel', strip: 1 }, bottom: { kind: 'jeans', col: 'black' }, shoes: { kind: 'boot', col: 'black' }, scarf: { col: 'red' }, gloves: 'charcoal', hat: { kind: 'helmet', col: 'white', strip: 1 } } },
    { build: 'average', skin: 1, hair: { style: 'short', col: 1 },
      spring: { top: { kind: 'jacket', col: 'navy' }, bottom: { kind: 'trousers', col: 'stone' }, shoes: { kind: 'shoe', col: 'tan' }, hat: { kind: 'helmet', col: 'navy' } },
      summer: { top: { kind: 'shirt', col: 'sky' }, bottom: { kind: 'trousers', col: 'khaki' }, shoes: { kind: 'shoe', col: 'tan' }, hat: { kind: 'helmet', col: 'navy' } },
      autumn: { top: { kind: 'rain', col: 'lime', strip: 1 }, bottom: { kind: 'trousers', col: 'charcoal' }, shoes: { kind: 'shoe', col: 'black' }, hat: { kind: 'helmet', col: 'navy', strip: 1 } },
      winter: { top: { kind: 'parka', col: 'navy', strip: 1 }, bottom: { kind: 'trousers', col: 'charcoal' }, shoes: { kind: 'boot', col: 'black' }, gloves: 'black', hat: { kind: 'helmet', col: 'navy', strip: 1 } } },
    { build: 'slim', skin: 2, hair: { style: 'crop', col: 0 },
      spring: { top: { kind: 'tee', col: 'red' }, bottom: { kind: 'shorts', col: 'black' }, tights: 'black', shoes: { kind: 'trainer', col: 'white' }, hat: { kind: 'helmet', col: 'red', strip: 1 } },
      summer: { top: { kind: 'tee', col: 'teal' }, bottom: { kind: 'shorts', col: 'black' }, shoes: { kind: 'trainer', col: 'white' }, hat: { kind: 'helmet', col: 'white' } },
      autumn: { top: { kind: 'jacket', col: 'red' }, bottom: { kind: 'shorts', col: 'black' }, tights: 'black', shoes: { kind: 'trainer', col: 'white' }, gloves: 'black', hat: { kind: 'helmet', col: 'red', strip: 1 } },
      winter: { top: { kind: 'jacket', col: 'black' }, bottom: { kind: 'joggers', col: 'black' }, shoes: { kind: 'trainer', col: 'white' }, gloves: 'black', hat: { kind: 'helmet', col: 'red', strip: 1 } } },
    { build: 'slim', age: 'young', skin: 5, hair: { style: 'pony', col: 0 },
      spring: { top: { kind: 'hoodie', col: 'teal' }, bottom: { kind: 'joggers', col: 'charcoal' }, shoes: { kind: 'trainer', col: 'grey' }, bag: { kind: 'backpack', col: 'olive' }, hat: { kind: 'helmet', col: 'black' } },
      summer: { top: { kind: 'tee', col: 'mustard' }, bottom: { kind: 'shorts', col: 'khaki' }, shoes: { kind: 'trainer', col: 'grey' }, bag: { kind: 'backpack', col: 'olive' }, hat: { kind: 'helmet', col: 'black' } },
      autumn: { top: { kind: 'jacket', col: 'olive' }, bottom: { kind: 'joggers', col: 'black' }, shoes: { kind: 'trainer', col: 'grey' }, bag: { kind: 'backpack', col: 'charcoal', strip: 1 }, hat: { kind: 'helmet', col: 'black', strip: 1 } },
      winter: { top: { kind: 'parka', col: 'teal' }, bottom: { kind: 'joggers', col: 'black' }, shoes: { kind: 'boot', col: 'black' }, gloves: 'black', bag: { kind: 'backpack', col: 'charcoal', strip: 1 }, hat: { kind: 'helmet', col: 'black', strip: 1 } } },
  ];
  /* The bikes: rear and front axles at y -r, the bottom bracket BB, the seat cluster S, the head tube H0 (top) -> H1, the grips,
     the frame colour, the tyre's width and the extras. Saddle top at y -36.7 (the hip, the pivot, 3.3 above it). */
  const BIKES = [
    { kind: 'city', lean: 10, r: 14, rx: -21, fx: 22, tw: 2.4, BB: [-3, -15.5], S: [-7.2, -31], H0: [12.4, -32.4], H1: [13.6, -27.2], grip: [6.4, -43.4], col: 'teal' },
    { kind: 'hybrid', lean: 30, r: 13.6, rx: -21, fx: 22, tw: 2.2, BB: [-3, -15.5], S: [-7.4, -31.6], H0: [13.2, -33.4], H1: [14.6, -28.2], grip: [13.6, -40.6], col: 'charcoal' },
    { kind: 'road', lean: 40, r: 13.4, rx: -21, fx: 21.6, tw: 1.6, BB: [-3, -15.5], S: [-7.6, -32.2], H0: [13.4, -32.4], H1: [14.8, -28.4], grip: [17.6, -38.4], col: 'red' },
    { kind: 'mtb', lean: 26, r: 13.8, rx: -21, fx: 23, tw: 3.2, BB: [-3, -16], S: [-7.4, -30], H0: [13.4, -32.6], H1: [15.2, -26.8], grip: [13.8, -42.2], col: 'lime' },
  ];
  const SADDLE = [-4, -40];   // the hip on the saddle: the walk hook's pivot
  function bike(b) {
    const { r, rx, fx, tw, BB, S, H0, H1, col } = b, ay = -r, out = [], fr = t(col, 0), road = b.kind === 'road', mtb = b.kind === 'mtb', city = b.kind === 'city';
    const wheel = x => {
      const w = [line(t('tyre', 0), tw, circ(x, ay, r - tw / 2)), det(line(t('alloy', 1), 0.7, circ(x, ay, r - tw - 0.5)))];   // the tyre; the rim (fine)
      // fine: spokes, the hub, the tyre's lit edge
      const sp = []; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 8; sp.push('M', x + Math.cos(a) * (r - tw - 0.6), ay + Math.sin(a) * (r - tw - 0.6), 'L', x - Math.cos(a) * (r - tw - 0.6), ay - Math.sin(a) * (r - tw - 0.6)); }
      w.push(det(line(t('alloy', 2), 0.25, P(...sp), 0.7)), det([t('alloy', 0), circ(x, ay, 1.1)]), det(line(t('tyre', 2), 0.4, P('M', x - r * 0.6, ay - r * 0.72, 'Q', x, ay - r - 0.6, x + r * 0.6, ay - r * 0.72), 0.5)));
      return w;
    };
    out.push(...wheel(rx), ...wheel(fx));
    if (city || b.kind === 'hybrid') out.push(det(line(t(col, 1), 1, P('M', rx - r * 0.95, ay + 1.4, 'Q', rx - r * 0.7, ay - r - 2.2, rx + r * 0.4, ay - r - 1.2, 'M', fx - r * 0.6, ay - r - 1.4, 'Q', fx + r * 0.5, ay - r - 2, fx + r * 0.95, ay + 0.6))));   // mudguards (fine)
    // the frame: chainstay, seatstay, seat tube, top tube (a city bike steps through), down tube, head tube, fork
    const fork = mtb ? [line(t('charcoal', 0), 2.2, P('M', H1[0], H1[1], 'L', (H1[0] + fx) / 2 + 0.6, (H1[1] + ay) / 2)), line(t('alloy', 0), 1.3, P('M', (H1[0] + fx) / 2 + 0.4, (H1[1] + ay) / 2, 'L', fx, ay))]
      : [line(fr, 1.3, P('M', H1[0], H1[1], 'Q', fx - 1.8, ay - 4, fx, ay))];
    const tubes = city ? P('M', rx, ay, 'L', BB[0], BB[1], 'L', S[0], S[1], 'L', rx, ay, 'M', BB[0], BB[1], 'Q', 4, -15, H1[0] - 0.4, H1[1] - 1.6)
      : P('M', rx, ay, 'L', BB[0], BB[1], 'L', S[0], S[1], 'L', rx, ay, 'M', S[0] + 0.3, S[1] + 0.8, 'L', H0[0], H0[1] + 0.8, 'M', BB[0], BB[1], 'L', H1[0], H1[1] - 0.4);
    out.push(line(fr, road ? 1.5 : 1.8, tubes + P('M', H0[0], H0[1], 'L', H1[0], H1[1])), ...fork);   // the tubes and the head tube in one stroke
    // the seatpost and saddle, the stem and bars
    out.push(det(line(t('alloy', 1), 1, P('M', S[0], S[1], 'L', SADDLE[0] - 1.6, -36.2))), [t('charcoal', 0), P('M', -9.6, -37.4, 'Q', -6, -38.4, -0.6, -37.2, 'Q', -0.4, -36.4, -1.6, -36.2, 'Q', -6, -35.6, -9.4, -36.2, 'Z')]);
    const g = b.grip;
    if (city) out.push(line(t('alloy', 1), 1.1, P('M', H0[0], H0[1], 'L', H0[0] - 0.6, H0[1] - 6.8, 'Q', H0[0] - 2, g[1] - 0.4, g[0] + 0.4, g[1])));
    else if (road) out.push(line(t('alloy', 1), 1.1, P('M', H0[0], H0[1], 'L', H0[0] + 2.6, H0[1] - 2.4, 'Q', g[0] + 1.6, g[1] + 0.6, g[0] + 1.8, g[1] + 3, 'Q', g[0] + 1.8, g[1] + 6.8, g[0] - 0.8, g[1] + 6.2)));   // the drops
    else out.push(line(t('alloy', 1), 1.1, P('M', H0[0], H0[1], 'L', g[0] + 0.4, g[1] + 0.6)));
    out.push(det(line(t('charcoal', 0), 1.4, P('M', g[0] - 0.8, g[1] + 0.2, 'L', g[0] + 1.0, g[1]))));   // the grip (under the hand)
    // the chainring and the crank's axle (the cranks and pedals go with the feet)
    out.push(det([t('charcoal', 0), circ(BB[0], BB[1], 2.4)]), det([t('alloy', 1), circ(BB[0], BB[1], 1.6), 0.9]), det(line(t('charcoal', 1), 0.45, P('M', BB[0], BB[1] - 2.4, 'L', rx, ay - 1.2, 'M', BB[0], BB[1] + 2.4, 'L', rx, ay + 1.0), 0.8)));
    if (city) out.push(det([t(col, 1), P('M', BB[0] - 3.4, BB[1] - 2.6, 'L', rx + 2, ay - 2, 'L', rx + 2, ay + 1.6, 'L', BB[0] - 3.2, BB[1] + 2.8, 'Z'), 0.9]));   // a chain guard
    // extras: a basket (city), a rack and pannier (hybrid), a bottle (road), a sus fork's crown (mtb)
    if (city) out.push([t('cane', 0), P('M', 14.6, -40.4, 'L', 25.6, -40.4, 'L', 24.6, -32.4, 'L', 15.4, -32.4, 'Z')], det(line(t('cane', 3), 0.35, P('M', 15, -37.6, 'L', 25.2, -37.6, 'M', 15.2, -35, 'L', 24.9, -35, 'M', 18.4, -40.2, 'L', 18.6, -32.6, 'M', 21.8, -40.2, 'L', 21.6, -32.6), 0.6)), det(line(t('cane', 2), 0.5, P('M', 14.6, -40.4, 'L', 25.6, -40.4), 0.8)));
    if (b.kind === 'hybrid') out.push(det(line(t('alloy', 1), 0.8, P('M', S[0] - 0.4, S[1] + 1, 'L', rx - 6, -27.4, 'L', rx + 2, -27.4, 'M', rx - 2, -27.4, 'L', rx, ay))), [t('navy', 0), P('M', rx - 7.2, -27.4, 'L', rx + 3.4, -27.4, 'L', rx + 2.8, -17.6, 'L', rx - 6.4, -17.6, 'Z')],
      det(line(t('navy', 3), 0.4, P('M', rx - 6.8, -24.4, 'L', rx + 3.1, -24.4), 0.7)), { f: t('stone', 2), d: P('M', rx - 6.6, -20.4, 'L', rx + 2.8, -20.4, 'L', rx + 2.7, -19.4, 'L', rx - 6.5, -19.4, 'Z'), op: 0.8, glow: 'lamp' });
    if (road) out.push(det([t('sky', 0), P('M', 2.2, -24.6, 'L', 4.6, -26.2, 'L', 6.4, -22.6, 'L', 4, -21.2, 'Z')]));
    if (mtb) out.push(det([t('charcoal', 2), P('M', H1[0] - 1.2, H1[1] + 0.4, 'L', H1[0] + 2.4, H1[1] - 0.4, 'L', H1[0] + 2.8, H1[1] + 1.4, 'L', H1[0] - 0.8, H1[1] + 2.2, 'Z')]));
    // the lamps: a front lamp on the bars or basket, a red rear light under the saddle (lit at night); pedal and spoke reflectors (fine)
    const fl = city ? [25.8, -37.6] : road ? [H0[0] + 2.4, H0[1] - 1.8] : [H0[0] + 1.6, H0[1] - 1.4];
    out.push(det({ f: t('charcoal', 0), d: P('M', fl[0] - 1.2, fl[1] - 1.3, 'L', fl[0] + 1.6, fl[1] - 1.4, 'L', fl[0] + 1.7, fl[1] + 1.3, 'L', fl[0] - 1.2, fl[1] + 1.3, 'Z') }),
      { f: t('cream', 0), d: P('M', fl[0] + 0.5, fl[1] - 1.2, 'L', fl[0] + 2.1, fl[1] - 1.1, 'L', fl[0] + 2.1, fl[1] + 1.1, 'L', fl[0] + 0.5, fl[1] + 1.2, 'Z'), glow: 'beam' });
    out.push({ f: t('burgundy', 0), d: P('M', S[0] - 2.2, S[1] - 2.4, 'L', S[0] - 0.8, S[1] - 2.6, 'L', S[0] - 0.7, S[1] - 0.2, 'L', S[0] - 2.1, S[1], 'Z'), glow: 'tail' });
    out.push(det({ f: t('mustard', 1), d: P('M', rx + r * 0.42, ay - r * 0.5, 'L', rx + r * 0.52, ay - r * 0.44, 'L', rx + r * 0.36, ay - r * 0.2, 'L', rx + r * 0.26, ay - r * 0.26, 'Z'), glow: 'lamp' }));
    return out;
  }
  /** Pedals and the near crank arm under each foot (they ride with the leg). */
  const pedal = (p, near) => [line(t('charcoal', near ? 0 : 1), 1.0, P('M', p[0] - 1.4, p[1] + 0.9, 'L', p[0] + 1.6, p[1] + 0.9)), det({ f: t('mustard', 1), d: P('M', p[0] + 1.0, p[1] + 0.5, 'L', p[0] + 1.7, p[1] + 0.5, 'L', p[0] + 1.7, p[1] + 1.3, 'L', p[0] + 1.0, p[1] + 1.3, 'Z'), glow: 'lamp' })];
  PP.define({
    id: 'person.cyclist', category: 'person', size: [70, 76], variants: BIKES.length, seasonal: true, shapeBySeason: true, flippable: true, parts: ['legB', 'bike', 'body', 'legA'],
    palette: PAL, anim: { walk: { parts: ['legA', 'legB'], pivot: SADDLE.slice(), deg: 16, period: 0.9, bob: 0.4 } }, shadow: { rx: 34, ry: 3, h: 60 }, night: NIGHT, detailPx: true,
    tags: PP.tags(['cyclist', 'bike', 'path', 'towpath']),
    credit: 'the shared people builder (scenePeople.figure: cycle legs, hands on the grips, a helmet) and four bikes',
    build(v, r, ctx) {
      const b = BIKES[v], o = PP.outfit(CYC[v], ctx.season);
      // the rider is built standing at the origin (hip at (0, HIP)), then the body leans about the hip and both move onto the saddle
      const T = [1, 0, 0, 1, SADDLE[0], SADDLE[1] - HIP], Mb = mul(T, about(b.lean, 0, HIP, 1)), Mi = inv(Mb);
      const gn = apply(Mi, b.grip), gf = apply(Mi, [b.grip[0] + 0.8, b.grip[1] - 0.4]);
      const f = figure(Object.assign({}, o, { legs: 'cycle', crank: [b.BB[0] - T[4], b.BB[1] - T[5]], crankLen: 5.5, pedal: 25, arms: { far: { hand: gf }, near: { hand: gn } } }));
      // the head turns back up by most of the lean (a rider looks ahead): the shapes above the neck turn about the nape
      const nape = [f.head.x - 0.6, f.head.y + f.head.ry + 1.4], Mh = mul(Mb, about(-b.lean * 0.6, nape[0], nape[1], 1)), neck = f.head.y + f.head.ry * 0.7;
      const body = f.body.map(sh => move([sh], meanY(shape(sh).d) < neck ? Mh : Mb)[0]);
      const legB = [...move(f.legB, T), ...move(pedal(f.pedals.far, false), T)], legA = [...move(f.legA, T), ...move(pedal(f.pedals.near, true), T)];
      return { legB: farTier(legB), bike: bike(b), body: farTier(body), legA: farTier(legA) };
    },
  });

  /* ---------- person.angler: on a box, a stool or a low chair (or standing) at the water's edge, rod in both hands ----------
     The rod (part 'rod') turns about the near hand at (10, -30): the tip dips, the float with it (a bite). At night the float's
     isotope tip glows; a lantern or a head torch where the angler has one. */
  const ANG = [
    { build: 'stout', skin: 1, hair: { style: 'short', col: 5 }, seat: 12, gear: 'box', brolly: 'forest',
      spring: { top: { kind: 'jacket', col: 'olive' }, bottom: { kind: 'trousers', col: 'khaki' }, shoes: { kind: 'boot', col: 'black' }, hat: { kind: 'flatcap', col: 'tweed' } },
      summer: { top: { kind: 'shirt', col: 'stone' }, bottom: { kind: 'trousers', col: 'khaki' }, shoes: { kind: 'boot', col: 'tan' }, hat: { kind: 'sunhat', col: 'stone', band: 'olive' } },
      autumn: { top: { kind: 'rain', col: 'forest' }, bottom: { kind: 'trousers', col: 'charcoal' }, shoes: { kind: 'boot', col: 'black' }, hat: { kind: 'flatcap', col: 'tweed' } },
      winter: { top: { kind: 'parka', col: 'olive' }, bottom: { kind: 'trousers', col: 'charcoal' }, shoes: { kind: 'boot', col: 'black' }, hat: { kind: 'beanie', col: 'forest' }, gloves: 'black', scarf: { col: 'forest' } } },
    { build: 'average', age: 'older', skin: 2, hair: { style: 'bald', col: 6 }, seat: 11, gear: 'stool',
      spring: { top: { kind: 'jumper', col: 'forest' }, bottom: { kind: 'trousers', col: 'grey' }, shoes: { kind: 'boot', col: 'tan' }, hat: { kind: 'flatcap', col: 'stone' } },
      summer: { top: { kind: 'shirt', col: 'cream' }, bottom: { kind: 'trousers', col: 'khaki' }, shoes: { kind: 'shoe', col: 'tan' }, hat: { kind: 'sunhat', col: 'khaki', band: 'forest' } },
      autumn: { top: { kind: 'jacket', col: 'tweed' }, bottom: { kind: 'trousers', col: 'charcoal' }, shoes: { kind: 'boot', col: 'black' }, hat: { kind: 'flatcap', col: 'tweed' }, scarf: { col: 'mustard' } },
      winter: { top: { kind: 'coat', col: 'charcoal' }, bottom: { kind: 'trousers', col: 'grey' }, shoes: { kind: 'boot', col: 'black' }, hat: { kind: 'beanie', col: 'navy' }, gloves: 'tan', scarf: { col: 'navy', col2: 'sky' } } },
    { build: 'slim', skin: 4, hair: { style: 'short', col: 0 }, stand: 16, gear: 'net',
      spring: { top: { kind: 'jacket', col: 'stone' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'black' }, hat: { kind: 'cap', col: 'olive' } },
      summer: { top: { kind: 'tee', col: 'olive' }, bottom: { kind: 'trousers', col: 'stone' }, shoes: { kind: 'boot', col: 'tan' }, hat: { kind: 'sunhat', col: 'olive', band: 'khaki' } },
      autumn: { top: { kind: 'rain', col: 'olive' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'black' }, hat: { kind: 'cap', col: 'olive' } },
      winter: { top: { kind: 'parka', col: 'khaki' }, bottom: { kind: 'jeans', col: 'denim' }, shoes: { kind: 'boot', col: 'black' }, hat: { kind: 'beanie', col: 'olive' }, gloves: 'charcoal' } },
    { build: 'broad', skin: 0, hair: { style: 'short', col: 3 }, seat: 9, gear: 'chair', brolly: 'olive',
      spring: { top: { kind: 'hoodie', col: 'navy' }, bottom: { kind: 'trousers', col: 'khaki' }, shoes: { kind: 'boot', col: 'tan' }, hat: { kind: 'cap', col: 'navy' } },
      summer: { top: { kind: 'tee', col: 'teal' }, bottom: { kind: 'shorts', col: 'khaki' }, shoes: { kind: 'boot', col: 'tan' }, hat: { kind: 'sunhat', col: 'cream', band: 'teal' } },
      autumn: { top: { kind: 'hoodie', col: 'forest' }, bottom: { kind: 'trousers', col: 'charcoal' }, shoes: { kind: 'boot', col: 'black' }, hat: { kind: 'beanie', col: 'charcoal' }, torch: 1 },
      winter: { top: { kind: 'parka', col: 'navy' }, bottom: { kind: 'trousers', col: 'charcoal' }, shoes: { kind: 'boot', col: 'black' }, hat: { kind: 'beanie', col: 'navy' }, gloves: 'black', scarf: { col: 'grey' }, torch: 1 } },
  ];
  const ROD = { p: [10, -30], tip: [110, -72], float: [124, -1] };   // the near hand (the pivot), the tip, the float
  const rodDir = (() => { const dx = ROD.tip[0] - ROD.p[0], dy = ROD.tip[1] - ROD.p[1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; })();
  const onRod = s => [ROD.p[0] + rodDir[0] * s, ROD.p[1] + rodDir[1] * s];
  function rod(o) {
    const [px, py] = ROD.p, b = onRod(-7), h = onRod(3.2), m = onRod(48), [tx, ty] = ROD.tip, [fx, fy] = ROD.float, out = [];
    out.push(det(line(t('cork', 0), 1.9, P('M', b[0], b[1], 'L', h[0], h[1]))), line(t('carbon', 0), 1.2, P('M', h[0], h[1], 'L', m[0], m[1])), line(t('carbon', 0), 0.65, P('M', m[0], m[1], 'L', tx, ty)));
    out.push(det([t('alloy', 1), ell(px + 0.9, py + 2.4, 1.5, 1.4)]), line(t('alloy', 2), 0.35, P('M', tx, ty, 'Q', tx + 9, ty + 30, fx, fy - 4.6), 0.75));   // the reel, the line
    out.push([t('float', 0), P('M', fx - 0.9, fy - 3.4, 'Q', fx, fy - 4.2, fx + 0.9, fy - 3.4, 'L', fx + 0.6, fy + 0.6, 'Q', fx, fy + 1.2, fx - 0.6, fy + 0.6, 'Z')]);   // the float
    out.push({ f: t('float', 0), d: ell(fx, fy - 4.2, 0.55, 0.8), glow: 'isotope' });   // its isotope tip
    // fine: rod rings, the reel's handle and line, the fingers over the rod at both hands, the cork's grain
    const rings = []; for (const s of [24, 44, 62, 78, 92, 104]) { const q = onRod(s); rings.push('M', q[0] - 0.2, q[1] + 0.2, 'L', q[0] + 0.4, q[1] + 1.4); }
    out.push(det(line(t('alloy', 1), 0.35, P(...rings), 0.9)), det(line(t('alloy', 3), 0.4, P('M', px + 0.9, py + 2.4, 'L', px + 2.4, py + 3.6), 0.9)), det(line(t('float', 2), 0.3, P('M', px + 0.9, py + 1.2, 'L', h[0] + 4, h[1] + 0.2), 0.6)));
    const sk = o.gloves || 'sk' + ((o.skin | 0) % PP.SKIN.length), fh = onRod(4.5);
    out.push(det([t(sk, 0), P('M', px - 0.9, py - 0.6, 'Q', px, py - 1.4, px + 0.9, py - 0.8, 'L', px + 1.1, py + 0.6, 'Q', px, py + 0.8, px - 0.8, py + 0.6, 'Z')]), det([t(sk, 1), P('M', fh[0] - 0.9, fh[1] - 0.6, 'Q', fh[0], fh[1] - 1.4, fh[0] + 0.9, fh[1] - 0.8, 'L', fh[0] + 1.1, fh[1] + 0.6, 'Q', fh[0], fh[1] + 0.8, fh[0] - 0.8, fh[1] + 0.6, 'Z')]));
    const a0 = onRod(3), n = [rodDir[1], -rodDir[0]];   // a sheen along the top of the blank (a cool rim light at night)
    out.push(det({ f: t('carbon', 2), op: 0.6, glow: 'rim', d: P('M', a0[0] + n[0] * 0.3, a0[1] + n[1] * 0.3, 'L', tx + n[0] * 0.2, ty + n[1] * 0.2, 'L', tx - n[0] * 0.1, ty - n[1] * 0.1, 'L', a0[0] - n[0] * 0.2, a0[1] - n[1] * 0.2, 'Z') }));
    out.push(det(line(t('cork', 3), 0.3, P('M', b[0] + 1.6, b[1] - 0.2, 'L', b[0] + 1.9, b[1] + 0.7, 'M', b[0] + 3.4, b[1] - 1, 'L', b[0] + 3.7, b[1] - 0.1), 0.6)));
    return out;
  }
  function gear(A) {
    const out = [], g = A.gear;
    if (A.brolly) {   // a fishing brolly behind, tilted to the wind; its pole in the bank
      const c = A.brolly;
      out.push(line(t('charcoal', 0), 0.9, P('M', -27, 0.6, 'L', -18, -52)));
      out.push([t(c, 0), P('M', -55, -34, 'Q', -46, -74, -12, -72, 'Q', 6, -70, 12, -54, 'Q', 2, -54, -6, -50, 'Q', -14, -48, -22, -44, 'Q', -34, -40, -42, -38, 'Q', -48, -36, -55, -34, 'Z')]);
      out.push([t(c, 1), P('M', -55, -34, 'Q', -46, -74, -12, -72, 'Q', -30, -62, -36, -40, 'Q', -46, -36, -55, -34, 'Z'), 0.8]);
      out.push(det(line(t(c, 3), 0.4, P('M', -18, -71.6, 'Q', -36, -60, -42, -38, 'M', -16, -71.6, 'Q', -16, -60, -22, -44, 'M', -14, -71.4, 'Q', 2, -64, -6, -50), 0.6)), det(line(t(c, 2), 0.5, P('M', -48, -50, 'Q', -40, -68, -14, -70), 0.5)));
    }
    if (g === 'box') out.push([t('forest', 0), P('M', -8.4, -12, 'L', 7.2, -12, 'L', 7.2, 0, 'L', -8.4, 0, 'Z')], det([t('forest', 1), P('M', -8.4, -12, 'L', 7.2, -12, 'L', 7.2, -9.4, 'L', -8.4, -9.4, 'Z')]),
      det([t('alloy', 1), P('M', -1.6, -9.4, 'L', 0.6, -9.4, 'L', 0.6, -7.6, 'L', -1.6, -7.6, 'Z')]), det(line(t('forest', 2), 0.4, P('M', -8.2, -5, 'L', 7, -5), 0.6)), det(line(t('forest', 3), 0.5, P('M', -8.2, -0.4, 'L', 7, -0.4), 0.7)));
    if (g === 'stool') out.push(line(t('alloy', 1), 0.9, P('M', -5.4, -10.4, 'L', 4.6, 0, 'M', 4.8, -10.4, 'L', -5.2, 0)), [t('olive', 0), P('M', -6.4, -11.6, 'Q', 0, -10.2, 6, -11.6, 'L', 5.6, -10.2, 'Q', 0, -9, -6, -10.2, 'Z')],
      [t('tan', 0), P('M', -23, 0, 'L', -22.4, -9.6, 'Q', -17.2, -11.6, -12.2, -9.6, 'L', -11.6, 0, 'Z')], det([t('tan', 1), P('M', -22.6, -9.4, 'Q', -17.2, -11.6, -12.2, -9.6, 'L', -12.4, -6, 'Q', -17.4, -7.2, -22.6, -6.2, 'Z')]),
      det(line(t('tan', 3), 0.4, P('M', -17.4, -6.8, 'L', -17.4, -4.6, 'M', -21.6, -2.4, 'L', -12.6, -2.4), 0.7)));
    if (g === 'chair') out.push(line(t('charcoal', 0), 0.9, P('M', -6, -9, 'L', -7.2, 0, 'M', 5.6, -9, 'L', 7, 0, 'M', -6.2, -9.4, 'L', -9, -25)), [t('olive', 0), P('M', -7, -10.4, 'L', 6.4, -10.4, 'L', 6.2, -8.6, 'L', -7, -8.6, 'Z')],
      [t('olive', 1), P('M', -7.4, -10, 'L', -10.4, -25.6, 'L', -7.6, -26.2, 'L', -4.8, -10, 'Z')], det(line(t('olive', 3), 0.4, P('M', -8.4, -14, 'L', -6, -14.4, 'M', -9.2, -19, 'L', -6.8, -19.4), 0.6)),
      // a camping lantern and a flask on the bank (the lantern lit at night)
      [t('charcoal', 0), P('M', 26.4, 0, 'L', 26.6, -5.6, 'L', 30.8, -5.6, 'L', 31, 0, 'Z')], { f: t('cream', 1), d: P('M', 27.2, -1, 'L', 27.3, -4.8, 'L', 30.1, -4.8, 'L', 30.2, -1, 'Z'), glow: 'lamp' },
      det(line(t('charcoal', 0), 0.45, P('M', 27.4, -5.6, 'Q', 28.7, -7.8, 30, -5.6), 0.9)), det([t('teal', 1), P('M', 17.4, 0, 'L', 17.4, -6.2, 'L', 19.6, -6.2, 'L', 19.6, 0, 'Z')]), det([t('alloy', 0), P('M', 17.2, -7.2, 'L', 19.8, -7.2, 'L', 19.8, -6.2, 'L', 17.2, -6.2, 'Z')]));
    if (g === 'net') out.push(line(t('carbon', 0), 0.8, P('M', -14, 0.4, 'L', -24, -46)), line(t('charcoal', 0), 0.6, ell(-24.6, -50.4, 3.4, 4.8)), det(line(t('grey', 2), 0.25, P('M', -27.6, -50, 'L', -21.6, -50.6, 'M', -26.8, -53, 'L', -22.6, -47.6, 'M', -22.4, -53.2, 'L', -26.6, -47.8), 0.6)),
      [t('olive', 0), P('M', -10, 0, 'L', -10, -8.2, 'Q', -4.6, -9.6, 1, -8.2, 'L', 1, 0, 'Z')], det([t('olive', 1), P('M', -10, -8.2, 'Q', -4.6, -9.6, 1, -8.2, 'L', 1, -6.2, 'Q', -4.6, -7.2, -10, -6.2, 'Z')]), det(line(t('olive', 3), 0.4, P('M', -9.6, -2.4, 'L', 0.6, -2.4), 0.6)));
    return out;
  }
  PP.define({
    id: 'person.angler', category: 'person', size: [184, 83], variants: ANG.length, seasonal: true, shapeBySeason: true, flippable: true, parts: ['gear', 'body', 'rod'],
    palette: PAL, anim: { turn: { part: 'rod', pivot: ROD.p.slice(), deg: 3, period: 5, hold: 0.5 } }, night: NIGHT, detailPx: true,
    tags: ['uk', 'people', 'anonymous', 'silhouette', 'angler', 'fishing', 'pond', 'canal', 'kit:people', 'kit:temperate', 'kit:water', 'role:walker'],
    credit: 'the shared people builder (scenePeople.figure: seated or standing, both hands on the rod) after the anglers of the Wyndhams Pool views',
    build(v, r, ctx) {
      const A = ANG[v], o = PP.outfit(A, ctx.season), stand = !!A.stand;
      // standing: the body leans over the water by A.stand degrees about the hip; the hand targets are found back through the lean
      const Mb = stand ? about(A.stand, 0, HIP, 1) : [1, 0, 0, 1, 0, 0], Mi = inv(Mb);
      const f = figure(Object.assign({}, o, { legs: stand ? 'walk' : 'seated', seat: A.seat, arms: { far: { hand: apply(Mi, onRod(4.5)) }, near: { hand: apply(Mi, ROD.p) } } }));
      const up = f.body.slice(0, f.at.nearArm[0]), arm = f.body.slice(f.at.nearArm[0]);
      // the near leg goes over the lap but under the near arm (the hands on the rod stay in front of the knee)
      const legB = stand ? move(f.legB, about(5, 0, HIP, 1)) : f.legB, legA = stand ? move(f.legA, about(-6, 0, HIP, 1)) : f.legA;
      const extra = [];
      if (o.torch) { const hd = f.head; extra.push(det(line(t('charcoal', 0), 0.6, P('M', hd.x - hd.rx - 0.2, hd.y - hd.ry * 0.38, 'L', hd.x + hd.rx + 0.1, hd.y - hd.ry * 0.5), 0.9)), { f: t('charcoal', 1), d: P('M', hd.x + hd.rx - 0.3, hd.y - hd.ry * 0.78, 'L', hd.x + hd.rx + 1.1, hd.y - hd.ry * 0.74, 'L', hd.x + hd.rx + 1.1, hd.y - hd.ry * 0.2, 'L', hd.x + hd.rx - 0.3, hd.y - hd.ry * 0.24, 'Z'), glow: 'beam' }); }
      const body = [...legB, ...move([...up, ...extra], Mb), ...legA, ...move(arm, Mb)];
      return { gear: farTier(gear(A)), body: farTier(body), rod: rod(o) };
    },
  });
})();
