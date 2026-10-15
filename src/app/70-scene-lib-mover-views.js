/* ============================================================
   SCENE LIBRARY: the DIRECTIONAL views of the movers that walk, ride and swim along paths (docs/dev/SCENE_ENGINE_V2.md 4.3, 9.5).
   PURE: functions and sceneObjDefine calls only, built lazily per (variant, season).

   A path that runs toward or away from the camera, or across it on a diagonal, must not show a side-on person sliding
   sideways. Each mover gets five views, named as the view rule names them:
     side     the library object itself (faces right; flipped to face left)
     q-front  three-quarter, turned toward the camera (faces right and toward; flipped for left)
     front    head on (walking toward the camera)
     q-back   three-quarter, turned away (faces right and away)
     back     from behind (walking away)
   They are linked through each side object's `views` map: { front, back, rear (= back), 'q-front', 'q-back', q (= q-front) }.

   sceneMoverViews (this file, used by 70-scene-lib-people.js, which sorts after it):
     figure(o, view, opt)   one FACELESS person end-on or three-quarter, from the same outfit object as scenePeople.figure
                            (PP.outfit(preset, season)): the same slots (skin skN, hair hrN, the cloth tones), build, hair,
                            hats, hoods, scarves, bags, phone, umbrella, stick. -> { legB, body, legA, armA, hooks, hands, far }
                            opt: { arms: 'walk' | 'run' | 'bars', hand: { near | far: [x, y] } (a hand placed), dx }
     dogEnd(g, view, paint) a dog head on or from behind (g: the dog's measures, paint(slot, tone) its paints)
     xform(list, a, e, d, f) shapes through a diagonal affine map (x' = a x + e, y' = d y + f), every SVG command
     foreshorten(side, k)   a side object seen three-quarter: its drawing squeezed along its length (wheels become ellipses)
   Walk hooks: end on, the legs turn by a degree or two about a pivot far to one side, so the feet rise and fall in turn
   (a foot stepping toward the camera drops on the screen) and the body bobs; three-quarter, they swing about the hip
   by three quarters of the side view's angle. Lit from the LEFT, as the side views.
   ============================================================ */
const sceneMoverViews = (function () {
  const f1 = v => { const r = Math.round(v * 10) / 10; return r === 0 ? 0 : r; };
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  /** Path data from points: poly([[x, y], ...]) closed. */
  const poly = pts => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z';
  const pt = p => f1(p[0]) + ' ' + f1(p[1]);
  const YAW = { front: 0, 'q-front': 45, 'q-back': 135, back: 180 };

  /* ---------- a diagonal affine map over any SVG path ---------- */
  const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
  function xpath(d, a, e, dd, f) {
    let o = '';
    for (const [, c, args] of String(d).matchAll(/([A-Za-z])([^A-Za-z]*)/g)) {
      const n = (args.match(NUM) || []).map(Number), rel = c !== c.toUpperCase(), u = c.toUpperCase(), q = [];
      const X = x => (rel ? a * x : a * x + e), Y = y => (rel ? dd * y : dd * y + f);
      if (u === 'Z') { o += c; continue; }
      if (u === 'H') n.forEach(x => q.push(X(x)));
      else if (u === 'V') n.forEach(y => q.push(Y(y)));
      else if (u === 'A') for (let i = 0; i + 7 <= n.length; i += 7) q.push(Math.abs(a) * n[i], Math.abs(dd) * n[i + 1], n[i + 2], n[i + 3], a * dd < 0 ? 1 - n[i + 4] : n[i + 4], X(n[i + 5]), Y(n[i + 6]));
      else for (let i = 0; i + 1 < n.length; i += 2) q.push(X(n[i]), Y(n[i + 1]));
      o += c + q.map(v => String(Math.round(v * 100) / 100)).join(' ');
    }
    return o;
  }
  const xform = (list, a, e, d, f) => (list || []).map(sh => {
    const o = Array.isArray(sh) ? { f: sh[0], d: sh[1], op: sh[2] } : Object.assign({}, sh);
    if (o.d) o.d = xpath(o.d, a, e, d == null ? 1 : d, f || 0);
    if (o.w) o.w = Math.round(o.w * Math.sqrt(Math.abs(a * (d == null ? 1 : d))) * 100) / 100;
    if (o.m) o.m = null;
    return o;
  });

  /* ---------- the person ---------- */
  const BUILD = { slim: { d: 7.6, belly: 0, thigh: 5.4, arm: 2.9 }, average: { d: 8.6, belly: 0.4, thigh: 6.0, arm: 3.2 }, broad: { d: 9.6, belly: 0.6, thigh: 6.5, arm: 3.6 }, stout: { d: 9.8, belly: 2.4, thigh: 6.8, arm: 3.5 } };
  const TOPS = { tee: { hem: -30.4 }, blouse: { hem: -30.2, fl: 0.4 }, shirt: { hem: -30.4, collar: 1 }, jumper: { hem: -30.4, rib: 1 }, cardigan: { hem: -30.2, open: 1 },
    hoodie: { hem: -30.2, hood: 1, rib: 1 }, jacket: { hem: -30.6, fl: 0.2, collar: 1, zip: 1 }, rain: { hem: -24.5, fl: 1.2, hood: 1, zip: 1, long: 1 },
    parka: { hem: -22.5, fl: 1, hood: 1, zip: 1, long: 1 }, coat: { hem: -17.2, fl: 1.8, collar: 1, long: 1, buttons: 1 } };
  const SHORT = { tee: 1, blouse: 1 };
  const HIP = -31.5;
  const t = (slot, k) => `@${slot}.${k || 0}`;

  /**
   * One person in a view. o: the outfit (scenePeople.outfit). Coordinates as the side figure: feet on y 0, about 62 to the crown.
   * The near side (three-quarter) is the person's right, which faces the camera; head on the person's right is screen left.
   */
  function figure(o, view, opt) {
    opt = opt || {};
    const yaw = YAW[view] * Math.PI / 180, c = Math.cos(yaw), s = Math.sin(yaw), back = c < -0.01, end = Math.abs(s) < 0.01;
    const B = BUILD[o.build] || BUILD.average, T = TOPS[(o.top && o.top.kind) || 'tee'] || TOPS.tee, tall = o.tall || 0, dx = opt.dx || 0;
    const sk = k => t('sk' + (o.skin | 0), k), top = (o.top && o.top.col) || 'grey', bot = o.bottom || { kind: 'trousers', col: 'charcoal' };
    const gl = o.gloves ? k => t(o.gloves, k) : sk;
    const hw = (W, D) => Math.sqrt(W * W * c * c + D * D * s * s);
    const X = x => x + dx;
    const old = o.age === 'older', fwd = s * (old ? 1.6 : 0.7);   // three-quarter: the head sits a little forward
    const ys = -51 - tall, cy = ys - 6.6, rx = 4.2, ry = 5.1, hx = fwd;
    const Ws = B.d * 0.98, Dd = B.d * 0.5;
    const wS = hw(Ws, Dd), wW = hw(Ws * 0.7 + B.belly, Dd + B.belly * 0.5), wH = hw(Ws * 0.78, Dd) + (T.fl || 0) * 0.3;
    const hem = T.hem, wHem = T.long ? wH + (T.fl || 0) : wH;
    const skirt = bot.kind === 'skirt', sHem = skirt ? (bot.len === 'midi' ? -12 : -21) : null;
    const lowHem = Math.max(T.long ? hem : -99, skirt ? sHem : -99);
    const legTop = Math.max(-30.2, lowHem - 0.4);
    const legB = [], legA = [], body = [], armA = [], behind = [];
    const run = opt.arms === 'run';
    // ----- legs: lateral half-gap Lh; right leg (L -1) is the near leg -----
    const Lh = B.thigh * 0.42, wt = B.thigh * 0.42;
    function leg(L, out) {
      const x = X(L * Lh * c), sh = bot.kind, bare = skirt || sh === 'shorts';
      const legCol = bare ? (o.tights ? t(o.tights, L > 0 && !end ? 1 : 0) : sk(L > 0 && !end ? 1 : 0)) : t(bot.col, L > 0 && !end ? 1 : 0);
      const pts = [[x - wt, legTop], [x + wt, legTop], [x + 1.7, -17], [x + 1.25, -2.4], [x - 1.25, -2.4], [x - 1.8, -17]];
      out.push([legCol, poly(pts)]);
      if (sh === 'shorts') out.push([t(bot.col, 0), poly([[x - wt, legTop], [x + wt, legTop], [x + 2.1, -21.5], [x - 2.2, -21.5]])]);
      if (!bare) out.push({ s: t(bot.col, 3), w: 0.35, op: 0.5, d: `M${f1(x + (L < 0 ? 0.9 : -0.9))} ${f1(legTop + 1)}L${f1(x + (L < 0 ? 0.5 : -0.5))} -3`, detail: true });
      // the shoe: head on the toe comes toward us (a round toe cap); three-quarter it points forward; from behind the heel
      const shoe = (o.shoes && o.shoes.col) || 'charcoal', sandal = o.shoes && o.shoes.kind === 'sandal', boot = o.shoes && o.shoes.kind === 'boot';
      const sx = x + (end ? 0 : 1.3 * Math.sign(s) * (back ? -0.4 : 1)), srx = end ? 1.75 : 2.6, sy = back ? -1.3 : -1.1;
      if (sandal) out.push([sk(0), ell(sx, sy, srx * 0.9, 1.3)], [t(shoe, 0), `M${f1(sx - srx)} -0.2H${f1(sx + srx)}V0.4H${f1(sx - srx)}Z`], { s: t(shoe, 1), w: 0.6, d: `M${f1(sx - srx * 0.7)} -1.6H${f1(sx + srx * 0.7)}` });
      else {
        if (boot) out.push([t(shoe, 0), poly([[x - 1.5, -5.2], [x + 1.5, -5.2], [x + 1.6, -1.4], [x - 1.6, -1.4]])]);
        out.push([t(shoe, 0), ell(sx, sy, srx, back ? 1.5 : 1.6)], [t(shoe, 1), `M${f1(sx - srx)} ${f1(sy + 0.2)}Q${f1(sx)} ${f1(sy + 1.9)} ${f1(sx + srx)} ${f1(sy + 0.2)}Z`, 0.8]);
        if (o.shoes && o.shoes.kind === 'trainer') out.push([t('sole', 0), `M${f1(sx - srx)} ${f1(sy + 0.5)}Q${f1(sx)} ${f1(sy + 2)} ${f1(sx + srx)} ${f1(sy + 0.5)}L${f1(sx + srx)} ${f1(sy + 1)}Q${f1(sx)} ${f1(sy + 2.5)} ${f1(sx - srx)} ${f1(sy + 1)}Z`]);
      }
    }
    leg(1, legB); leg(-1, legA);
    // ----- arms: L +1 the left (far in three-quarter), L -1 the right (near); a hand target places it -----
    const sleeveLong = !SHORT[(o.top && o.top.kind) || 'tee'];
    const shX = L => X(L * (Ws - 1.4) * c), shY = ys + 1.6;
    const hands = {};
    function arm(L, target, out, shade) {
      const sx = shX(L), outw = L * c >= 0 ? 1 : -1;
      let hx2, hy2, ex, ey;
      if (target) { hx2 = target[0]; hy2 = target[1]; ex = (sx + hx2) / 2 + outw * 2.2; ey = Math.max(shY + 7, (shY + hy2) / 2 + 3); }
      else if (run) { ex = sx + outw * 1.6 + (end ? 0 : s * (L < 0 ? -2.5 : 2.5)); ey = -41.5; hx2 = sx - outw * 2.2 + (end ? 0 : s * (L < 0 ? 1 : 4)); hy2 = -46; }
      else { ex = sx + outw * 0.9 + (end ? 0 : s * 0.6); ey = -41; hx2 = sx + outw * 0.8 + (end ? 0 : s * 1.2); hy2 = -31.6 - tall * 0.3; }
      const k = shade ? 1 : 0, sl = sleeveLong ? t(top, k) : sk(k);
      out.push({ s: sl, w: B.arm, d: `M${pt([sx, shY])}L${pt([ex, ey])}L${pt([hx2, hy2])}`, cap: 'round' });
      if (!sleeveLong) out.push({ s: t(top, k), w: B.arm + 0.5, d: `M${pt([sx, shY])}L${pt([sx + (ex - sx) * 0.45, shY + (ey - shY) * 0.45])}`, cap: 'round' });
      else out.push({ s: t(top, 3), w: 0.4, op: 0.5, d: `M${pt([hx2 + (ex - hx2) * 0.18 - 1.2, hy2 + (ey - hy2) * 0.18])}l2.4 0`, detail: true });
      out.push([gl(k), ell(hx2, hy2 + 1.1, 1.45, 1.6)]);
      hands[L < 0 ? 'near' : 'far'] = [f1(hx2), f1(hy2 + 1.1)];
      return [hx2, hy2];
    }
    // ----- head pieces -----
    const hair = o.hair || { style: 'short', col: 0 }, hr = k => t('hr' + (hair.col | 0), k), hood = o.top && o.top.hood === 'up';
    const egg = (a0, a1, k, n) => { const out = []; for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; out.push([hx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); } return out; };
    const capPath = (a0, a1, k, ctl) => { const p = egg(a0, a1, k, 10); return 'M' + p.map(pt).join('L') + `Q${pt(ctl)} ${pt(p[0])}Z`; };
    const HAIRV = { front: [165, 375, [hx, cy - ry * 0.5]], back: [140, 400, [hx, cy + ry * 1.25]], 'q-front': [115, 325, [hx - rx * 0.35, cy - ry * 0.1]], 'q-back': [125, 400, [hx + rx * 0.5, cy + ry * 1.05]] };
    function hairBack(out) {   // long hair and a bun behind the head (drawn before the torso when we face the person)
      if (back) return;
      if (hair.style === 'long') out.push([hr(1), `M${pt([hx - rx * 1.12, cy - 1])}Q${pt([hx - rx * 1.4, ys + 2])} ${pt([hx - rx * 1.05 - s * 1.5, ys + 5.5])}H${f1(hx + rx * 1.05 - s * 3)}Q${pt([hx + rx * 1.4 - s * 2, ys + 2])} ${pt([hx + rx * 1.12, cy - 1])}Z`]);
      if (hair.style === 'bun' && !o.hat && !hood) out.push([hr(1), ell(hx - s * 2.6, cy - ry * 0.85, 2.2, 2)]);
      if (hair.style === 'pony' && !end && !hood) out.push({ s: hr(1), w: 2.4, d: `M${pt([hx - rx * 0.9, cy - 1])}Q${pt([hx - rx * 1.7, cy + 4])} ${pt([hx - rx * 1.3, ys + 3])}`, cap: 'round' });
    }
    function head(out) {
      out.push([sk(1), `M${f1(X(hx) - 1.5)} ${f1(ys + 0.6)}V${f1(cy + 2)}H${f1(X(hx) + 1.5)}V${f1(ys + 0.6)}Z`]);   // the neck
      if (hood) {   // the hood up: the face in its opening, or the hood's back
        const hc = t(top, 0);
        out.push([hc, ell(X(hx - s * 0.6), cy - 0.2, rx * 1.36, ry * 1.24)]);
        if (!back) out.push([sk(0), ell(X(hx + s * 1.1), cy + 0.8, rx * (end ? 0.74 : 0.6), ry * 0.8)], { s: t(top, 3), w: 0.5, op: 0.5, d: ell(X(hx + s * 1.1), cy + 0.8, rx * (end ? 0.78 : 0.64), ry * 0.84), detail: true });
        else out.push({ s: t(top, 3), w: 0.4, op: 0.5, d: `M${f1(X(hx))} ${f1(cy - ry * 1.2)}V${f1(cy + ry)}`, detail: true });
        return;
      }
      out.push([sk(0), ell(X(hx), cy, rx, ry)]);
      out.push([sk(1), `M${f1(X(hx + rx * 0.35))} ${f1(cy - ry * 0.9)}A${f1(rx)} ${f1(ry)} 0 0 1 ${f1(X(hx + rx * 0.35))} ${f1(cy + ry * 0.9)}Q${f1(X(hx + rx * 0.8))} ${f1(cy)} ${f1(X(hx + rx * 0.35))} ${f1(cy - ry * 0.9)}Z`, 0.45]);   // the shaded right cheek
      const st = hair.style, hv = HAIRV[view];
      if (st === 'bald') out.push([hr(0), ell(X(hx - rx * 0.92), cy + 0.6, 0.9, 1.9) + ell(X(hx + rx * 0.92), cy + 0.6, 0.9, 1.9)]);
      else {
        const k = st === 'curly' ? 1.17 : st === 'crop' ? 1.03 : 1.07, a0 = hv[0] + (st === 'crop' ? 15 : 0), a1 = hv[1] - (st === 'crop' ? 15 : 0);
        out.push([hr(0), xpath(capPath(a0, a1, k, hv[2]), 1, dx, 1, 0)]);
        out.push({ f: hr(2), d: xpath(capPath(200, 250, k * 0.98, [hx - rx * 0.4, cy - ry * 0.6]), 1, dx, 1, 0), op: 0.5, detail: true });   // the lit crown, from the left
        if (st === 'curly') out.push({ s: hr(3), w: 0.4, op: 0.5, d: xpath(`M${pt([hx - rx * 0.8, cy - ry * 0.6])}q1 -1 2 0q1 -1 2 0q1 -1 2 0`, 1, dx, 1, 0), detail: true });
      }
      if (back || view === 'q-back') {   // the hair falling down the back, the pony tail, the bun
        if (st === 'long') out.push([hr(0), `M${pt([X(hx) - rx * 1.1, cy])}Q${pt([X(hx) - rx * 1.3, ys + 3])} ${pt([X(hx) - rx * 1.0, ys + 6])}H${f1(X(hx) + rx * 1.0)}Q${pt([X(hx) + rx * 1.3, ys + 3])} ${pt([X(hx) + rx * 1.1, cy])}Z`]);
        if (st === 'pony' && !o.hat) out.push({ s: hr(0), w: 2.6, d: `M${pt([X(hx - s * 1.5), cy - 1])}Q${pt([X(hx - s * 2.5) + 0.6, cy + 5])} ${pt([X(hx - s * 2), ys + 3])}`, cap: 'round' }, [hr(1), ell(X(hx - s * 1.5), cy - 1, 1.2, 1.2)]);
        if (st === 'bun' && !o.hat) out.push([hr(0), ell(X(hx - s * 1.5), cy - ry * 0.75, 2.3, 2.1)]);
      }
      // the hats
      const hat = o.hat;
      if (hat) {
        const hc = k => t(hat.col || 'charcoal', k), brimDir = end ? 0 : (back ? -1 : 1);
        if (hat.kind === 'beanie') {
          out.push([hc(0), xpath(capPath(185, 355, 1.13, [hx, cy - ry * 0.25]), 1, dx, 1, 0)], [hc(1), `M${f1(X(hx) - rx * 1.12)} ${f1(cy - ry * 0.32)}Q${f1(X(hx))} ${f1(cy - ry * 0.12)} ${f1(X(hx) + rx * 1.12)} ${f1(cy - ry * 0.32)}L${f1(X(hx) + rx * 1.1)} ${f1(cy - ry * 0.05)}Q${f1(X(hx))} ${f1(cy + ry * 0.15)} ${f1(X(hx) - rx * 1.1)} ${f1(cy - ry * 0.05)}Z`]);
          if (hat.pom) out.push([t(hat.pom, 0), ell(X(hx), cy - ry * 1.2, 1.9, 1.8)]);
        } else if (hat.kind === 'cap' || hat.kind === 'flatcap') {
          const flat = hat.kind === 'flatcap';
          out.push([hc(0), xpath(capPath(185, 355, flat ? 1.1 : 1.12, [hx, cy - ry * (flat ? 0.45 : 0.35)]), 1, dx, flat ? 0.92 : 1, flat ? cy * 0.08 : 0)]);
          if (!back) out.push([hc(1), ell(X(hx + brimDir * 2.4), cy - ry * 0.38, end ? rx * 0.95 : rx * 0.8, flat ? 0.8 : 1.1)]);
        } else if (hat.kind === 'sunhat') {
          out.push([hc(1), ell(X(hx), cy - ry * 0.4, rx * 2.15, 1.6)], [hc(0), xpath(capPath(185, 355, 1.08, [hx, cy - ry * 0.4]), 1, dx, 1, 0)]);
          if (hat.band) out.push([t(hat.band, 0), `M${f1(X(hx) - rx * 1.05)} ${f1(cy - ry * 0.55)}H${f1(X(hx) + rx * 1.05)}V${f1(cy - ry * 0.4)}H${f1(X(hx) - rx * 1.05)}Z`]);
          out.push([hc(2), ell(X(hx - 2), cy - ry * 0.45, rx * 1.2, 0.6), 0.6]);
        } else if (hat.kind === 'helmet') {
          out.push([hc(0), xpath(capPath(180, 360, 1.2, [hx, cy - ry * 0.2]), 1, dx, 1, 0)], { s: hc(3), w: 0.5, op: 0.6, d: `M${f1(X(hx) - 1.6)} ${f1(cy - ry * 1.15)}V${f1(cy - ry * 0.5)}M${f1(X(hx) + 1.6)} ${f1(cy - ry * 1.15)}V${f1(cy - ry * 0.5)}` });
          if (hat.strip) out.push({ f: t('sole', 0), d: ell(X(hx), cy - ry * 0.45, 1.4, 0.5), glow: 'lamp' });
        }
      }
    }
    // ----- the torso -----
    function torso(out) {
      const yS = ys, p = [[-wS + 1.2, yS - 1.4], [-wS, yS + 2], [-wW, -38.5], [-wHem, hem], [wHem, hem], [wW, -38.5], [wS, yS + 2], [wS - 1.2, yS - 1.4]].map(q => [X(q[0]), q[1]]);
      // bottoms under the top: a trouser seat or a skirt
      if (skirt) out.push([t(bot.col, 0), poly([[X(-wH * 0.95), -34], [X(wH * 0.95), -34], [X(wH + (bot.len === 'midi' ? 3.6 : 2.4)), sHem], [X(-wH - (bot.len === 'midi' ? 3.6 : 2.4)), sHem]])],
        [t(bot.col, 1), poly([[X(wH * 0.3), -33], [X(wH * 0.95), -34], [X(wH + (bot.len === 'midi' ? 3.6 : 2.4)), sHem], [X(wH * 0.5), sHem]]), 0.6]);
      else out.push([t(bot.col, 0), poly([[X(-wH), -34], [X(wH), -34], [X(wH), -28.6], [X(-wH), -28.6]])]);
      out.push([t(top, 0), 'M' + pt(p[0]) + `Q${pt([X(-wS), yS - 0.8])} ${pt(p[1])}` + 'L' + p.slice(2, 7).map(pt).join('L') + `Q${pt([X(wS), yS - 0.8])} ${pt(p[7])}Q${pt([X(0), yS - 2.6])} ${pt(p[0])}Z`]);
      // form shading on the right (lit from the left); a hem band
      out.push({ f: t(top, 1), d: poly([[X(wS - 2.6), yS], [X(wS), yS + 2], [X(wW), -38.5], [X(wHem), hem], [X(wHem - 3), hem], [X(wW - 2.4), -38.5]]), op: 0.55 });
      out.push({ f: t(top, 2), d: poly([[X(-wS + 1.4), yS - 1.2], [X(-wS + 0.4), yS + 2], [X(-wW + 0.3), -38.5], [X(-wW + 1.3), -38.5], [X(-wS + 1.9), yS + 2]]), op: 0.5, detail: true });
      if (TOPS[o.top && o.top.kind] && (o.top.kind === 'jumper' || o.top.kind === 'hoodie')) out.push({ f: t(top, 1), d: poly([[X(-wH), hem - 1.4], [X(wH), hem - 1.4], [X(wH), hem], [X(-wH), hem]]), op: 0.8 });
      // the front: a zip, buttons, a collar, the open cardigan's inner layer; from behind a centre seam or the hood down
      const cx = X(Dd * s * (back ? -0.9 : 0.9));
      if (!back) {
        if (T.zip) out.push({ s: t(top, 3), w: 0.5, op: 0.8, d: `M${f1(cx)} ${f1(ys)}V${f1(hem)}` });
        if (T.buttons) out.push([t(top, 3), [-46, -40, -34, -28, -22].map(y => ell(cx + 0.9, y, 0.45, 0.45)).join('')]);
        if (T.open) out.push([t((o.top && o.top.col2) || 'cream', 0), poly([[cx - 1.6, ys - 0.8], [cx + 1.6, ys - 0.8], [cx + 1.2, hem], [cx - 1.2, hem]])]);
        if (T.collar) out.push([t(top, 1), `M${f1(cx - 3)} ${f1(ys - 1.4)}L${f1(cx)} ${f1(ys + 3.2)}L${f1(cx + 3)} ${f1(ys - 1.4)}L${f1(cx + 1.4)} ${f1(ys - 1.8)}L${f1(cx)} ${f1(ys + 0.8)}L${f1(cx - 1.4)} ${f1(ys - 1.8)}Z`]);
        if (T.hood && !hood) out.push([t(top, 1), `M${f1(X(-3.6))} ${f1(ys - 1.6)}Q${f1(X(0))} ${f1(ys + 2)} ${f1(X(3.6))} ${f1(ys - 1.6)}L${f1(X(3))} ${f1(ys - 0.4)}Q${f1(X(0))} ${f1(ys + 3.4)} ${f1(X(-3))} ${f1(ys - 0.4)}Z`]);
        if (!T.collar && !T.hood) out.push([sk(1), `M${f1(X(-2.2))} ${f1(ys - 1.6)}Q${f1(X(0))} ${f1(ys + 1.4)} ${f1(X(2.2))} ${f1(ys - 1.6)}Z`]);
      } else {
        out.push({ s: t(top, 3), w: 0.35, op: 0.4, d: `M${f1(cx)} ${f1(ys + 1)}V${f1(hem)}`, detail: true });
        if (T.hood && !hood) out.push([t(top, 1), `M${f1(cx - 4.2)} ${f1(ys - 1.4)}Q${f1(cx)} ${f1(ys - 2.6)} ${f1(cx + 4.2)} ${f1(ys - 1.4)}Q${f1(cx + 3.6)} ${f1(ys + 5.4)} ${f1(cx)} ${f1(ys + 6)}Q${f1(cx - 3.6)} ${f1(ys + 5.4)} ${f1(cx - 4.2)} ${f1(ys - 1.4)}Z`]);
      }
      if (o.top && o.top.belt) out.push([t(top, 3), poly([[X(-wW), -38.2], [X(wW), -38.2], [X(wW), -36.8], [X(-wW), -36.8]])]);
      if (o.top && o.top.strip) out.push({ f: t('sole', 0), d: poly([[X(-wW - 0.3), -41.4], [X(wW + 0.3), -41.4], [X(wW + 0.3), -40.2], [X(-wW - 0.3), -40.2]]), op: 0.9, glow: 'lamp' });
      // the scarf
      if (o.scarf) {
        const sc = k => t(o.scarf.col, k);
        out.push([sc(0), `M${f1(X(hx) - 3.8)} ${f1(ys - 2.6)}Q${f1(X(hx))} ${f1(ys - 0.6)} ${f1(X(hx) + 3.8)} ${f1(ys - 2.6)}L${f1(X(hx) + 4)} ${f1(ys - 0.2)}Q${f1(X(hx))} ${f1(ys + 1.8)} ${f1(X(hx) - 4)} ${f1(ys - 0.2)}Z`]);
        const tx = X(back ? -2 : 1.6) + fwd;
        out.push([sc(1), poly([[tx - 1.1, ys - 0.4], [tx + 1.1, ys - 0.4], [tx + 1.3, ys + (back ? 5 : 9)], [tx - 0.9, ys + (back ? 5 : 9)]])]);
        if (o.scarf.col2) out.push([t(o.scarf.col2, 0), poly([[tx - 1, ys + (back ? 3.2 : 6.8)], [tx + 1.2, ys + (back ? 3.2 : 6.8)], [tx + 1.2, ys + (back ? 4 : 7.6)], [tx - 1, ys + (back ? 4 : 7.6)]])]);
      }
      // the bag
      const bag = o.bag;
      if (bag) {
        const bc = k => t(bag.col || 'tan', k);
        if (bag.kind === 'backpack') {
          if (back || view === 'q-back') {
            const px = X(-Dd * s * 0.9), pw = Math.max(4.4, wS * 0.68);
            out.push([bc(0), `M${f1(px - pw)} ${f1(ys + 1.8)}Q${f1(px - pw)} ${f1(ys - 0.4)} ${f1(px)} ${f1(ys - 0.4)}Q${f1(px + pw)} ${f1(ys - 0.4)} ${f1(px + pw)} ${f1(ys + 1.8)}V-35.4Q${f1(px + pw)} -34 ${f1(px + pw - 1.4)} -34H${f1(px - pw + 1.4)}Q${f1(px - pw)} -34 ${f1(px - pw)} -35.4Z`],
              [bc(1), `M${f1(px - pw + 0.8)} -41H${f1(px + pw - 0.8)}V-35.6H${f1(px - pw + 0.8)}Z`], { s: bc(3), w: 0.4, op: 0.6, d: `M${f1(px - pw + 0.6)} ${f1(ys + 4)}Q${f1(px)} ${f1(ys + 6)} ${f1(px + pw - 0.6)} ${f1(ys + 4)}`, detail: true });
            if (bag.strip) out.push({ f: t('sole', 0), d: `M${f1(px - pw + 1)} -38.6H${f1(px + pw - 1)}V-37.6H${f1(px - pw + 1)}Z`, glow: 'lamp' });
          } else {
            out.push({ s: bc(1), w: 1.1, d: `M${f1(X(-wS + 2.6))} ${f1(ys - 0.6)}L${f1(X(-wW + 1.6))} -40M${f1(X(wS - 2.6))} ${f1(ys - 0.6)}L${f1(X(wW - 1.6))} -40` });
            if (!end) behind.push([bc(1), `M${f1(X(-wS - 1.6 * s))} ${f1(ys + 1)}H${f1(X(-wS + 2))}V-36H${f1(X(-wS - 1.6 * s))}Z`]);
          }
        } else if (bag.kind === 'crossbody') {
          const bx = X(back ? wH + 0.6 : -wH - 0.6);
          out.push({ s: bc(1), w: 0.8, d: `M${f1(X(back ? -wS + 2.2 : wS - 2.2))} ${f1(ys - 0.6)}L${f1(bx)} -36` }, [bc(0), `M${f1(bx - 2.2)} -37.2H${f1(bx + 2.2)}V-33.2Q${f1(bx)} -32.4 ${f1(bx - 2.2)} -33.2Z`], [bc(1), `M${f1(bx - 2.2)} -37.2H${f1(bx + 2.2)}V-35.8H${f1(bx - 2.2)}Z`]);
          if (bag.strip) out.push({ f: t('sole', 0), d: `M${f1(bx - 1.8)} -34.6H${f1(bx + 1.8)}V-34H${f1(bx - 1.8)}Z`, glow: 'lamp' });
        } else if (bag.kind === 'shoulder') {
          const bx = X(back ? -wS - 0.4 : wS + 0.4);
          out.push({ s: bc(1), w: 0.7, d: `M${f1(X(back ? -wS + 2 : wS - 2))} ${f1(ys - 0.6)}L${f1(bx)} -38` }, [bc(0), `M${f1(bx - 1.6)} -39H${f1(bx + 1.6)}L${f1(bx + 2)} -33.4H${f1(bx - 2)}Z`], [bc(1), `M${f1(bx - 2)} -34.6H${f1(bx + 2)}V-33.4H${f1(bx - 2)}Z`, 0.7]);
        }
      }
    }
    // ----- assembly: what is behind, the far arm (three-quarter), the torso, the head, the arms, held things -----
    const hold = o.hold, umb = hold === 'umbrella', phone = hold === 'phone', stick = hold === 'stick' || hold === 'brolly';
    const tgt = opt.hand || {};
    hairBack(body);
    body.push(...behind);
    let farArmOut = body;
    if (!end) { arm(1, tgt.far || (umb ? [X(fwd + 0.6), -49] : null), body, true); farArmOut = null; }
    torso(body);
    if (end) {
      // head on and from behind: the left arm (screen right head on, screen left from behind) is static; the right arm swings
      arm(1, tgt.far || (umb ? [X(fwd + (back ? -1.4 : 1.4)), -49] : null), body, false);
    }
    head(body);
    const nearBusy = phone || !!tgt.near || opt.arms === 'bars';
    const nearOut = nearBusy ? body : armA;
    const nh = arm(-1, tgt.near || (phone ? [X(fwd * 2 + (back ? 1.2 : -1.6)), -44.6] : null), nearOut, false);
    if (phone && !back) body.push([t('charcoal', 0), `M${f1(nh[0] - 1)} ${f1(nh[1] - 2.4)}H${f1(nh[0] + 1)}V${f1(nh[1] + 0.6)}H${f1(nh[0] - 1)}Z`]);
    if (phone && back) body.push({ f: t('sky', 1), d: `M${f1(nh[0] - 0.9)} ${f1(nh[1] - 2.6)}H${f1(nh[0] + 0.9)}V${f1(nh[1] - 1.8)}H${f1(nh[0] - 0.9)}Z`, glow: 'screen', op: 0.8 });
    if (stick) {
      const fh = hands.far, col = hold === 'brolly' ? t(o.holdCol || 'black', 0) : t('tan', 1);
      body.push({ s: col, w: hold === 'brolly' ? 1.3 : 0.9, d: `M${f1(fh[0])} ${f1(fh[1] - 0.4)}L${f1(fh[0] + (end ? 0.6 : 2.2))} -0.2` });
    }
    if (umb) {
      const fh = hands.far, ux = fh[0], col = o.holdCol || 'navy';
      body.push({ s: t('charcoal', 0), w: 0.7, d: `M${f1(ux)} ${f1(fh[1])}V-71` });
      body.push([t(col, 0), `M${f1(ux - 14)} -64.6Q${f1(ux - 13)} -75.5 ${f1(ux)} -76Q${f1(ux + 13)} -75.5 ${f1(ux + 14)} -64.6Q${f1(ux + 10.5)} -66.4 ${f1(ux + 7)} -64.8Q${f1(ux + 3.5)} -66.6 ${f1(ux)} -64.8Q${f1(ux - 3.5)} -66.6 ${f1(ux - 7)} -64.8Q${f1(ux - 10.5)} -66.4 ${f1(ux - 14)} -64.6Z`]);
      body.push({ f: t(col, 2), d: `M${f1(ux - 13)} -65.6Q${f1(ux - 12)} -74.8 ${f1(ux - 1)} -75.6Q${f1(ux - 8)} -72 ${f1(ux - 7)} -65.4Z`, op: 0.5 }, { s: t(col, 3), w: 0.4, op: 0.6, d: `M${f1(ux)} -76L${f1(ux)} -65M${f1(ux)} -76L${f1(ux - 7)} -65M${f1(ux)} -76L${f1(ux + 7)} -65`, detail: true });
      body.push({ s: t(col, 2), w: 0.5, op: 0.7, d: `M${f1(ux - 14)} -64.6Q${f1(ux - 10.5)} -66.4 ${f1(ux - 7)} -64.8`, glow: 'lamp' });
    }
    // hooks
    const per = opt.period || 0.9, deg = opt.deg || 22, armDeg = opt.armDeg || 16, bob = opt.bob == null ? 1.4 : opt.bob;
    const hooks = end
      ? [{ kind: 'walk', parts: ['legB', 'legA'], pivot: [X(0), HIP], deg: opt.endDeg || 3.5, period: per, bob }, { kind: 'walk', parts: ['armA'], pivot: [shX(-1), shY], deg: 3, period: per, bob: 0 }]
      : [{ kind: 'walk', parts: ['legB', 'legA'], pivot: [X(0), HIP], deg: Math.round(deg * 0.72), period: per, bob }, { kind: 'walk', parts: ['armA'], pivot: [shX(-1), shY], deg: Math.round(armDeg * 0.7), period: per, bob: 0 }];
    return { legB, body, legA, armA, hooks: armA.length ? hooks : hooks.slice(0, 1), hands, top: cy - ry, shoulderY: ys };
  }

  /* ---------- a dog end on (head on or from behind); g: { H (shoulder height), L (rump to chest), hs, w, ear, tail, bib, patch } ---------- */
  function dogEnd(g, view, paint, extra) {
    const back = view === 'back', H = g.H, hs = g.hs || 1, w = g.w || 3, wc = Math.max(4.2, g.L * 0.24), out = [], far = [], P = paint;
    const leg = (x, y0, k, list) => { list.push([P(g.legCoat || 'coat', k), `M${f1(x - w / 2)} ${f1(y0)}H${f1(x + w / 2)}L${f1(x + w * 0.42)} -1.2Q${f1(x + w * 0.6)} 0 ${f1(x)} 0Q${f1(x - w * 0.6)} 0 ${f1(x - w * 0.42)} -1.2Z`]); };
    if (!back) {
      leg(-wc * 0.55, -H * 0.62, 1, far); leg(wc * 0.55, -H * 0.62, 1, far);   // the hind legs, seen between the front legs
      for (const sh of far) { sh[1] = xpath(sh[1], 0.8, 0, 0.9, -1); }
      out.push(...far);
      out.push([P('coat', 0), ell(0, -H * 0.72, wc, H * 0.34)]);   // the chest
      if (g.bib) out.push([P('bib', 0), ell(0, -H * 0.68, wc * 0.55, H * 0.26)]);
      leg(-wc * 0.52, -H * 0.66, 0, out); leg(wc * 0.52, -H * 0.66, 0, out);
      if (g.bib) out.push([P('bib', 0), ell(-wc * 0.52, -1.2, w * 0.5, 1.2) + ell(wc * 0.52, -1.2, w * 0.5, 1.2)]);
      const hy = -H * 1.1, hr = 4.4 * hs;
      out.push({ f: P(g.collar ? 'collar' : 'coat', 0), d: ell(0, -H * 0.94, wc * 0.62, 1.3), glow: 'collar' });
      out.push([P('coat', 0), ell(0, hy, hr, hr * 0.95)]);
      if (g.patch) out.push([P('patch', 0), ell(-hr * 0.4, hy - hr * 0.35, hr * 0.5, hr * 0.45)]);
      if (g.ear === 'drop') out.push([P('coat', 1), `M${f1(-hr * 0.75)} ${f1(hy - hr * 0.7)}Q${f1(-hr * 1.55)} ${f1(hy)} ${f1(-hr * 1.1)} ${f1(hy + hr * 0.8)}Q${f1(-hr * 0.6)} ${f1(hy + hr * 0.4)} ${f1(-hr * 0.55)} ${f1(hy - hr * 0.4)}Z` + `M${f1(hr * 0.75)} ${f1(hy - hr * 0.7)}Q${f1(hr * 1.55)} ${f1(hy)} ${f1(hr * 1.1)} ${f1(hy + hr * 0.8)}Q${f1(hr * 0.6)} ${f1(hy + hr * 0.4)} ${f1(hr * 0.55)} ${f1(hy - hr * 0.4)}Z`]);
      else out.push([P(g.patch ? 'patch' : 'coat', 1), `M${f1(-hr * 0.85)} ${f1(hy - hr * 0.5)}L${f1(-hr * 0.95)} ${f1(hy - hr * 1.25)}L${f1(-hr * 0.25)} ${f1(hy - hr * 0.85)}Z` + `M${f1(hr * 0.85)} ${f1(hy - hr * 0.5)}L${f1(hr * 0.95)} ${f1(hy - hr * 1.25)}L${f1(hr * 0.25)} ${f1(hy - hr * 0.85)}Z`]);
      out.push([P(g.bib ? 'bib' : 'coat', 2), ell(0, hy + hr * 0.45, hr * 0.5, hr * 0.42)]);   // the muzzle toward us
      out.push(['#141012', ell(0, hy + hr * 0.25, hr * 0.22, hr * 0.17)]);
      out.push({ f: P('coat', 2), d: ell(-hr * 0.35, hy - hr * 0.45, hr * 0.4, hr * 0.25), op: 0.45, detail: true });
    } else {
      const hy = -H * 1.06, hr = 4 * hs;
      out.push([P('coat', 1), ell(0, hy, hr, hr * 0.9)]);   // the head beyond the back
      if (g.ear === 'drop') out.push([P('coat', 1), ell(-hr * 0.95, hy + hr * 0.2, hr * 0.38, hr * 0.7) + ell(hr * 0.95, hy + hr * 0.2, hr * 0.38, hr * 0.7)]);
      else out.push([P(g.patch ? 'patch' : 'coat', 1), `M${f1(-hr * 0.85)} ${f1(hy - hr * 0.4)}L${f1(-hr * 0.95)} ${f1(hy - hr * 1.2)}L${f1(-hr * 0.25)} ${f1(hy - hr * 0.8)}Z` + `M${f1(hr * 0.85)} ${f1(hy - hr * 0.4)}L${f1(hr * 0.95)} ${f1(hy - hr * 1.2)}L${f1(hr * 0.25)} ${f1(hy - hr * 0.8)}Z`]);
      out.push([P('coat', 0), ell(0, -H * 0.7, wc * 1.05, H * 0.36)]);   // the rump
      if (extra && extra.jacket) out.push([P('jacket', 0), ell(0, -H * 0.8, wc * 0.95, H * 0.24)]);
      out.push({ f: P('coat', 2), d: ell(-wc * 0.4, -H * 0.88, wc * 0.5, H * 0.12), op: 0.5, detail: true });
      leg(-wc * 0.55, -H * 0.62, 0, out); leg(wc * 0.55, -H * 0.62, 0, out);
      const ty = -H * 0.86, TAIL = {
        up: `M-1 ${f1(ty)}Q-1.6 ${f1(ty - H * 0.35)} 0 ${f1(ty - H * 0.5)}Q1.4 ${f1(ty - H * 0.35)} 1 ${f1(ty)}Z`,
        feather: `M-1.2 ${f1(ty)}Q-2.4 ${f1(ty + H * 0.3)} 0 ${f1(ty + H * 0.55)}Q2.4 ${f1(ty + H * 0.3)} 1.2 ${f1(ty)}Z`,
        otter: `M-1.3 ${f1(ty)}Q-1.4 ${f1(ty + H * 0.3)} 0 ${f1(ty + H * 0.48)}Q1.4 ${f1(ty + H * 0.3)} 1.3 ${f1(ty)}Z`,
        plume: `M-1.2 ${f1(ty)}Q-2.2 ${f1(ty + H * 0.4)} 0 ${f1(ty + H * 0.62)}Q2.2 ${f1(ty + H * 0.4)} 1.2 ${f1(ty)}Z`,
      };
      out.push([P('coat', 1), TAIL[g.tail] || TAIL.otter]);
      if (g.tail === 'plume') out.push([P('bib', 0), ell(0, ty + H * 0.56, 1, 1.2)]);
    }
    return out;
  }

  /* ---------- three-quarter by squeezing a side drawing along its length ---------- */
  const PIVOT_KEYS = ['pivot', 'hip', 'tail', 'neck', 'shoulder'];
  const scaleHook = (h, k, dx) => { const o = Object.assign({}, h); for (const key of PIVOT_KEYS) if (Array.isArray(o[key]) && o[key].length === 2) o[key] = [f1(o[key][0] * k + (dx || 0)), o[key][1]]; return o; };
  /**
   * A three-quarter view object of a side object (id), squeezed to k of its length. opt: { id, away (q-back: the head part drawn
   * under the body and raised), headPart, lift (units the far end rises), drop: [parts to omit], real }.
   */
  function foreshorten(sideId, opt) {
    const side = sceneObj(sideId);
    if (!side) return null;
    const k = opt.k || 0.62, away = !!opt.away;
    const order = (side.parts || ['body']).slice();
    if (away && opt.headPart && order.includes(opt.headPart)) { order.splice(order.indexOf(opt.headPart), 1); order.splice(order.indexOf('body') >= 0 ? order.indexOf('body') : 0, 0, opt.headPart); }
    const real = side.real ? { h: side.real.h, l: f1((side.real.l + (side.real.w || side.real.l * 0.4)) * 0.62), w: side.real.w || side.real.l * 0.4 } : undefined;
    const def = {
      id: opt.id, category: side.category, size: [Math.ceil((side.size || [60, 60])[0] * k), (side.size || [60, 60])[1]], variants: side.variants || 1,
      seasonal: side.seasonal, shapeBySeason: side.shapeBySeason, flippable: true, weight: 0, parts: order, palette: side.palette, night: side.night,
      detailPx: side.detailPx, reflect: side.reflect, shadow: side.shadow ? Object.assign({}, side.shadow, { rx: f1(side.shadow.rx * (k + 0.15)) }) : undefined,
      tags: (side.tags || []).filter(x => !/^place:/.test(x)).concat([away ? 'q-back' : 'q-front', 'view']),
      credit: (side.credit || sideId) + '; seen three-quarter (' + (away ? 'turned away' : 'turned toward the camera') + ')',
      build(v, r, ctx) {
        const raw = side.build(v, r, ctx) || {}, out = {};
        for (const name of Object.keys(raw)) {
          if ((opt.drop || []).includes(name)) continue;
          let list = xform(raw[name], k, 0, 1, 0);
          if (opt.headPart === name) list = xform(list, 1, 0, 1, away ? -(opt.lift || 1.6) : (opt.lift || 1.6) * 0.5);
          out[name] = list;
        }
        const hk = side.anim ? Object.entries(side.anim).map(([kind, a]) => Object.assign({ kind }, a)) : (raw.$anim || []);
        Object.defineProperty(out, '$anim', { value: hk.map(h => scaleHook(h, k)), enumerable: false });
        return out;
      },
    };
    if (real) def.real = real;
    if (side.behave) def.behave = [side.behave[0], scaleHook(side.behave[1] || {}, k)];
    return def;
  }
  /** Link views to an object already defined (a file that sorts before this one): only the links it has not got. */
  function link(id, views) {
    const d = typeof sceneObj === 'function' ? sceneObj(id) : null;
    if (!d) return;
    const have = d.views || {};
    d.views = Object.assign({}, views, have);
  }

  return Object.freeze({ figure, dogEnd, xform, xpath, foreshorten, link, YAW, ell, poly });
})();

/* ============================================================
   The animals and birds that walk and swim along paths: their views, defined here (their files sort before this one).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneObj !== 'function') return;
  const MV = sceneMoverViews;
  // three-quarter views by squeezing the side drawing: swimmers (head part raised and drawn under the body when turned away),
  // the grazing and walking beasts
  const Q = [
    ['bird.mallard', { headPart: 'head', lift: 2 }], ['bird.swan', { headPart: 'head', lift: 3 }], ['bird.goose', { headPart: 'head', lift: 2.4 }],
    ['bird.coot', { headPart: 'head', lift: 1.6 }], ['bird.moorhen', { headPart: 'head', lift: 1.6 }], ['bird.grebe', { headPart: 'head', lift: 1.6 }],
    ['animal.dog', { headPart: 'head', lift: 1.4 }], ['animal.cattle', { headPart: 'head', lift: 3 }], ['animal.pony', { headPart: 'head', lift: 3 }],
    ['animal.sheep', { headPart: 'head', lift: 2 }],
  ];
  for (const [id, o] of Q) {
    if (!sceneObj(id)) continue;
    const qf = MV.foreshorten(id, Object.assign({ id: id + '-qfront', k: 0.6 }, o)), qb = MV.foreshorten(id, Object.assign({ id: id + '-qback', k: 0.6, away: true }, o));
    if (qf) sceneObjDefine(qf);
    if (qb) sceneObjDefine(qb);
    MV.link(id, { 'q-front': id + '-qfront', 'q-back': id + '-qback', q: id + '-qfront' });
  }

  /* ---------- animal.dog head on and from behind (v0 black labrador, v1 springer spaniel, v2 terrier) ---------- */
  const dogSide = sceneObj('animal.dog');
  if (dogSide) {
    const G = [{ H: 17, L: 30, hs: 1.05, w: 3.6, ear: 'drop', tail: 'otter' }, { H: 16, L: 28, hs: 1, w: 3.4, ear: 'drop', tail: 'feather', bib: 1 }, { H: 15, L: 26, hs: 0.95, w: 3.4, ear: 'button', tail: 'up' }];
    const SL = ['@lab', '@spaniel', '@terrier'];
    for (const view of ['front', 'back']) {
      sceneObjDefine({
        id: 'animal.dog-' + view, category: 'animal', size: [24, 30], variants: 3, seasonal: false, flippable: true, weight: 0, parts: ['legsFar', 'body'],
        palette: dogSide.palette, real: { h: 0.55, l: 0.3, w: 0.8 }, shadow: { rx: 7, ry: 2.4, h: 24 },
        tags: ['uk', 'path', 'park', 'dog', 'pet', view === 'back' ? 'rear' : 'front', 'view', 'kit:animals', 'kit:people', 'kit:temperate', 'role:animal'],
        credit: 'animal.dog seen ' + (view === 'back' ? 'from behind' : 'head on'),
        build(v) {
          const c = SL[v], paint = (slot, k) => (slot === 'collar' ? '@collar.' + v : slot === 'bib' ? '@white.0' : `${c}.${k}`);
          const all = MV.dogEnd(G[v], view, paint);
          const out = { legsFar: [], body: all };
          // a trot: the whole dog rises and falls a little (the walk hook moves no part here but the near pair)
          Object.defineProperty(out, '$anim', { value: [{ kind: 'bob', parts: ['body'], part: 'body', dy: 1, period: 0.28 }], enumerable: false });
          return out;
        },
      });
    }
    MV.link('animal.dog', { front: 'animal.dog-front', back: 'animal.dog-back', rear: 'animal.dog-back' });
  }
})();
