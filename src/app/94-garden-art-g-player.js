/* ============================================================
   GARDEN ART, the gardener (2.23). The owner, 30 Oct 2026: "It should be identical to the avatar page."
   So this file draws no person of its own. What walks round the garden is the avatar kit's own drawing, cut at its seams and stood up:
     the head, face, hair, hat, glasses and the shoulders with everything on them: profileAvatarSvg(a, {layers: true}), the portrait itself
     the arms, legs, shoes and the side-on body with its skirts and coats: profileFigureSvg(a, {layers: true}), the full figure from the Wardrobe page (a scene person)
   Only what the kit has no drawing for is added here, in the kit's own colours (profileFigureOpts(a).slots, pfTone): the front of the body between the portrait's
   chest and the hem, a bag at the hip, the back of a person. A new wardrobe item therefore shows up here by itself. Everything comes from allow-listed ids
   (profileAvatarNormalize), so a friend's avatar can never put anything but a known drawing here.

     gartPlayerSvg(avatar, {dir: 's'|'n'|'e', pose: 'idle'|'walk'|'water'|'dig'|'pick'|'fish', motion}) -> an SVG fragment, feet at 0,0, about 70 units tall (cached per avatar, way round and pose)
     gartPlayerFigureSvg(avatar, {size, uid}) -> the same person as an <svg> (standing, front on), for pages outside the walker: a friend's garden
     gartPlayerPaint(innerEl, gw) -> true when it drew the figure (the walker's _gwBody asks first; a page without this file keeps the old figure)
     gartPlayerStep(gw)           -> once per walker frame: turns the figure when the way it is going changes (a compare, nothing else)
     gartPlayerAct(pose, ms)      -> strike a pose for a moment. The garden's own events ('opendash:garden') already do: water, plant, harvest.

   WAYS ROUND. s: the portrait full on, with the figure's legs (toes out, one leg mirrored). e: the figure's side-on body with the portrait's head, its face turned the way it
   walks (the face slides over the egg, the ears the other way); west is the same drawing mirrored by the walker. n: the same body from behind (the top's outline, the back of
   the hair in the kit's own hair shapes, the hat, a backpack or cape on show).
   Motion is CSS on named limbs (94-garden-art.css, .gpl-*), transforms only: gpl-root, gpl-up (above the hips), gpl-hd (the head: two groups, behind and in front of the body),
   gpl-af / gpl-as (arms, front and side), gpl-lf / gpl-lg (legs). The moves (97-pets-tricks-6emote.js) and the walk both drive those. Reduced motion and the Fun level stop it with everything else.
   ============================================================ */
const _GPL = { cache: new Map(), dir: 's', pose: '', until: 0, key: '', t: 0, lastX: null, lastY: null };
const GPL_POSES = Object.freeze(['walk', 'water', 'dig', 'pick', 'fish', 'hold']);
/** Poses that face the camera whatever way the person was going (a catch held up: gartPlayerPaint and the other people's figures both ask). One row per pose; arms and class names are in _gplPoseArms. */
const GPL_POSE_FRONT = Object.freeze(new Set(['hold']));
/** The catch held up (AC-style, in our own drawing): both arms up and a little outward, stretched so the hands reach over the crown; the item sits between them. ang: how far the arms turn from hanging, k: how much longer they reach, y: where the item's middle is, in the walker's units (feet at 0). */
const GPL_HOLD = Object.freeze({ ang: 168, k: 1.62, y: -74 });
/** The proportions, in the portrait's units (its head is 44 tall): the ground, the crown, the shoulder line. The side-on figure is scaled to fit between them. */
const _GPL_FLOOR = 186, _GPL_CROWN = 16, _GPL_SHOULDER = 77;
const _GPL_S = 70 / (_GPL_FLOOR - _GPL_CROWN);                        // portrait units -> the walker's 70 units
const _GPL_KY = (_GPL_FLOOR - _GPL_SHOULDER) / 50.4;                  // figure units -> portrait units, up and down (the figure's shoulder line is at -50.4)
const _GPL_KX = _GPL_KY * 1.6, _GPL_KXL = _GPL_KY * 1.25;              // ...and across, side on: the body, the legs (a person side on is deeper than the figure's slim line, next to this head)
const _GPL_BUST = Object.freeze({ slim: 0.74, average: 0.8, broad: 0.88, stout: 0.88 });   // how wide the portrait's shoulders are drawn, front on
const _GPL_TURN = 4.6;                                                // how far the face slides over the head, side on

const _gplN = (v) => { const r = Math.round(v * 1000) / 1000; return String(r === 0 ? 0 : r); };
const _gplM = (a, d, e, f) => `matrix(${_gplN(a)} 0 0 ${_gplN(d)} ${_gplN(e)} ${_gplN(f)})`;
const _gplG = (tf, inner) => (inner ? `<g transform="${tf}">${inner}</g>` : '');
/** Portrait units -> the walker's, at this width across. */
const _gplPort = (kx) => _gplM(_GPL_S * (kx || 1), _GPL_S, -50 * _GPL_S * (kx || 1), -_GPL_FLOOR * _GPL_S);
const _gplY = (y) => (y - _GPL_FLOOR) * _GPL_S;
function _gplHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

/* -- what the person is holding: the garden's own tools, not part of the avatar -- */
function _gplTools() {
  const A = GART, ink = c => { const [h, s, l] = A.hsl(c); return A.fromHsl(h, Math.min(1, s * 0.9 + 0.08), Math.max(0.1, l * 0.45)); };
  const B = (c, d, w) => `<path fill="${c}" stroke="${ink(c)}" stroke-width="${w == null ? 1.15 : w}" stroke-linejoin="round" d="${d}"/>`;
  return {
    // the hand on the handle at 0,0, the rose low on the right
    can: () => `<g transform="rotate(14) scale(0.84)">${B('#6f9ab0', A.rrect(-2, 0, 15, 11.5, 2))}${A.P('#a8cadc', A.rect(-0.6, 1.4, 3, 8.6), 0.8)}${A.S('#3f6478', 1.3, 'M12.6 4L22 -2', 1)}${B('#6f9ab0', 'M20 -5L26 -1L24 1.4L18.6 -2.6z', 0.9)}${A.S('#3f6478', 1.4, 'M1 0Q5.4 -7 10 0')}</g>`,
    drops: () => `<g class="gpl-drops">${A.P('#8fd0ee', 'M0 0Q1.3 1.8 0 3Q-1.3 1.8 0 0zM5 -2Q6.3 -0.2 5 1Q3.7 -0.2 5 -2zM-4 3Q-2.7 4.8 -4 6Q-5.3 4.8 -4 3z')}</g>`,
    // the hand near the top of the shaft at 0,0, the blade 30 down
    spade: () => `${A.S('#6a4a2e', 3, 'M0 -6L0 25', 1, 'round')}${A.S('#a68454', 1, 'M-0.8 -6L-0.8 24', 0.8)}${B('#8a949c', 'M-4.6 24h9.2v5q-1 4 -4.6 6.4q-3.6 -2.4 -4.6 -6.4z', 0.9)}${A.P('#c0c8ce', 'M-3.4 25h2.6v7.6q-1.8 -1.4 -2.6 -4z', 0.85)}${A.S('#6a4a2e', 2.4, 'M-3.4 -6.4H3.4')}`,
    // the hand on the handle at 0,0
    basket: () => `<g transform="translate(0 7.5)">${B('#c8924a', 'M-9 -2H9L6.6 7H-6.6z')}${A.S('#8a5a2a', 0.7, 'M-7.8 1H7.8M-7 4H7M-3 -2L-2 7M3 -2L2 7', 0.7)}${A.S('#8a5a2a', 1.4, 'M-7 -2Q0 -11 7 -2')}${A.P('#d8452a', A.circ(-3, -3.4, 2.6))}${A.P('#7ac24a', A.circ(2.2, -3.8, 2.6))}${A.P('#f2c432', A.circ(0, -2.2, 2))}</g>`,
    rod: () => `${A.S('#7a5a34', 1.7, 'M0 3L19 -30')}${A.S('#c8a86a', 0.8, 'M0 3L18 -28.4', 0.7)}${A.P('#4a3a2a', A.circ(1.2, 1, 2.4))}`,
  };
}
/** An arm: its drawing hanging from the joint j, a class for its motion, a turn, what it holds at the hand. */
function _gplArm(art, j, len, cls, ang, tool, k) {
  const L = len * (k || 1), r = (ang || 0) * Math.PI / 180, h = [j[0] - Math.sin(r) * L, j[1] + Math.cos(r) * L];
  const body = k ? `<g transform="translate(${_gplN(j[0])} ${_gplN(j[1])}) scale(1 ${_gplN(k)}) translate(${_gplN(-j[0])} ${_gplN(-j[1])})">${art}</g>` : art;   // a longer reach: the arm's drawing stretched along itself, from the shoulder
  return `<g class="gpl-limb ${cls || ''}" style="transform-origin:${_gplN(j[0])}px ${_gplN(j[1])}px">${ang ? `<g transform="rotate(${_gplN(ang)} ${_gplN(j[0])} ${_gplN(j[1])})">${body}</g>` : body}${tool ? tool(h) : ''}</g>`;
}
/** Where each arm goes for a pose, and what it holds: {a: [turn, class, tool], b: [turn, class], tool}. a is the far (side) or left (front) arm, b the near or right. */
function _gplPoseArms(pose, side, T, stageRod) {
  const at = (x, y, inner, rot) => `<g transform="translate(${_gplN(x)} ${_gplN(y)})${rot ? ` rotate(${rot})` : ''}">${inner}</g>`;
  switch (pose) {
    case 'water': return side
      ? { a: [-14], b: [-68, 'gpl-wat'], tool: (h) => at(h[0], h[1], T.can() + at(23, 7, T.drops())) }
      : { a: [8], b: [-42, 'gpl-wat'], tool: (h) => at(h[0], h[1], T.can() + at(23, 7, T.drops())) };
    case 'dig': return side
      ? { a: [-38], b: [-50, 'gpl-dg'], tool: (h) => at(h[0], h[1] - 1, T.spade(), -12) }
      : { a: [16], b: [22, 'gpl-dg'], tool: (h) => at(h[0], h[1] - 1, T.spade(), -4) };
    case 'pick': return side
      ? { a: [-34, 'gpl-pk'], b: [-12, '', (h) => at(h[0], h[1], T.basket())] }   // the basket on the near side: a long skirt would hide it on the far one
      : { a: [6, '', (h) => at(h[0], h[1], T.basket())], b: [-16, 'gpl-pk'] };
    case 'fish': { const rod = stageRod ? null : (h) => at(h[0], h[1], T.rod()); return side
      ? { a: [-58], b: [-70, 'gpl-fs'], tool: rod }
      : { a: [-22], b: [-52, 'gpl-fs'], tool: rod }; }
    case 'hold': return { a: [-GPL_HOLD.ang, 'gpl-hup is-a'], b: [-GPL_HOLD.ang, 'gpl-hup is-b'], k: GPL_HOLD.k };   // (the left arm is mirrored by its caller: the same turn lifts both)
    default: return null;
  }
}

/* -- the body the portrait stands on (front and back): only what the kit has no front-on drawing for, in the kit's own colours -- */
const _GPL_OPEN = Object.freeze(new Set(['denim', 'leather', 'raincoat', 'trench', 'robe', 'hivis']));   // these hang open at the portrait's bottom edge; the others are done up
function _gplLower(a, fo, T, uid, back) {
  const tone = (slot) => pfTone(fo.slots[slot] || (PF_CLOTH[slot] && PF_CLOTH[slot].hex) || '#888888');
  const dressed = !!_PF_FIG_DRESS[a.dress], pina = a.dress === 'pinafore', dung = a.bottom === 'dungarees' && !dressed && !pina;
  const hivis = a.outer === 'hivis', over = hivis || a.outer === 'gilet';
  const main = hivis ? pfTone('#d8f03a') : tone(pina ? 'pfDress' : dung ? 'pfBot' : over ? 'pfOut' : fo.o.top.col);
  const Y = (fy) => _GPL_FLOOR + fy * _GPL_KY;
  const hem = Y(T.hem), fl = (T.fl || 0) * 3.4, botKind = fo.o.bottom.kind;
  const mid = (99 + hem) / 2, n = _gplN;
  const torsoD = `M24 99 L76 99 C75 ${n(mid)} 73.6 ${n(mid)} ${n(74 + fl)} ${n(hem)} Q50 ${n(hem + 2.4)} ${n(26 - fl)} ${n(hem)} C26.4 ${n(mid)} 25 ${n(mid)} 24 99 Z`;
  const patOn = a.pattern !== 'none' && fo.o.top.col !== 'pfOut' && !dung && !pina && !over;
  const pat = (d, id, base) => (patOn ? _gplPat(a, d, id, base) : '');
  let s = '';
  // the skirt (a dress's too), or the seat of the trousers: under the top's hem
  const bc = tone(fo.o.bottom.col);
  if (botKind === 'skirt') {
    const low = Y(fo.o.bottom.len === 'midi' ? -9.5 : -17.5), w = Y(-35.6), f = fo.o.bottom.len === 'midi' ? 12 : 9;
    const d = `M27 ${n(w)} L73 ${n(w)} Q${n(76 + f * 0.4)} ${n((w + low) / 2)} ${n(77 + f)} ${n(low)} Q50 ${n(low + 4)} ${n(23 - f)} ${n(low)} Q${n(24 - f * 0.4)} ${n((w + low) / 2)} 27 ${n(w)} Z`;
    s += _pfP(d, bc[0]) + (dressed ? pat(d, uid + 'k', bc) : '') + _pfP(`M73 ${n(w)} Q${n(76 + f * 0.4)} ${n((w + low) / 2)} ${n(77 + f)} ${n(low)} Q${n(70 + f)} ${n(low + 2.4)} ${n(66 + f * 0.6)} ${n(low + 1.6)} Q68 ${n((w + low) / 2)} 64 ${n(w)} Z`, bc[1], 0.55);
    if (a.bottom === 'pleated') for (const x of [36, 44, 50, 56, 64]) s += _pfS(`M${x} ${n(w + 6)} L${n(50 + (x - 50) * 1.5)} ${n(low)}`, bc[3], 0.9, 0.4);
    else s += _pfS(`M40 ${n(w + 8)} L${n(50 - 10 * 1.5)} ${n(low)} M60 ${n(w + 8)} L${n(50 + 10 * 1.5)} ${n(low)}`, bc[3], 0.9, 0.3);
  } else if (!T.long) {
    s += _pfP(`M27 ${n(hem - 12)} L73 ${n(hem - 12)} L72.6 ${n(hem + 11)} Q50 ${n(hem + 13)} 27.4 ${n(hem + 11)} Z`, bc[0]);
  }
  // the rest of the top, down to its hem
  s += _pfP(torsoD, main[0]) + pat(torsoD, uid + 'x', main);
  s += _pfP(`M76 99 C75 ${n(mid)} 73.6 ${n(mid)} ${n(74 + fl)} ${n(hem)} L${n(66 + fl * 0.6)} ${n(hem + 1.2)} Q68 ${n(mid)} 67 99 Z`, main[1], 0.5);
  s += _pfP(`M24 99 C25 ${n(mid)} 26.4 ${n(mid)} ${n(26 - fl)} ${n(hem)} L${n(30 - fl * 0.6)} ${n(hem + 0.6)} Q30 ${n(mid)} 29 99 Z`, main[2], 0.35);
  s += _pfS(`M${n(26.6 - fl)} ${n(hem - 0.6)} Q50 ${n(hem + 1.8)} ${n(73.4 + fl)} ${n(hem - 0.6)}`, main[3], 1, 0.3);
  if (!back) {
    const inner = over ? tone('pfTop') : _PF_FIG_OUTER[a.outer] ? (dressed ? tone('pfDress') : tone('pfTop')) : tone('pfIn');
    if (_GPL_OPEN.has(a.outer)) s += _pfP(`M45.4 99 L54.6 99 L${n(55 + fl * 0.3)} ${n(hem + 1)} Q50 ${n(hem + 1.6)} ${n(45 - fl * 0.3)} ${n(hem + 1)} Z`, inner[0]) + _pfS(`M45.4 99 L${n(45 - fl * 0.3)} ${n(hem + 1)} M54.6 99 L${n(55 + fl * 0.3)} ${n(hem + 1)}`, main[3], 0.9, 0.55);
    else if (['bomber', 'varsity', 'blazer', 'fleece', 'puffer', 'gilet'].includes(a.outer) || (a.outer === 'none' && !dressed && !dung && ['cardigan', 'kimono', 'jacket', 'coat', 'lab', 'parka', 'shirt', 'polo', 'rugby'].includes(a.top))) s += _pfS(`M50 99 L50 ${n(hem + 1)}`, main[3], 0.9, 0.5);
    if (a.outer === 'apron') { const ap = tone('pfOut'); s += _pfP(`M36.8 99 L63.2 99 L66 ${n(hem + 10)} Q50 ${n(hem + 12)} 34 ${n(hem + 10)} Z`, ap[0]) + _pfS(`M42 ${n(mid)} L58 ${n(mid)} L57 ${n(mid + 9)} L43 ${n(mid + 9)} Z`, ap[1], 0.9, 0.7); }
    if (dung) s += _pfS(`M41 ${n(mid - 3)} L59 ${n(mid - 3)} L58 ${n(mid + 7)} L42 ${n(mid + 7)} Z`, bc[3], 0.9, 0.5);
    if (hivis) for (const y of [mid - 4, mid + 6]) s += _pfP(`M24.6 ${n(y)} L75.4 ${n(y)} L75.2 ${n(y + 3)} L24.8 ${n(y + 3)} Z`, '#d6dbe0');
  }
  return s;
}
/** A cape's two front panels, carried on down from the portrait's shoulders, over the arms. */
function _gplCapeFront(fo) {
  const o = pfTone(fo.slots.pfOut || '#3e5a80');
  return _pfBoth('M6 99 L37 99 L33 133 Q20 138 6 131 Z', o[0]) + _pfP('M94 99 L72 99 L68 136 Q84 137 94 131 Z', o[1], 0.5) + _pfBothS('M37 99 L33 133', o[3], 0.9, 0.4);
}
/** A fabric pattern over a path in portrait units (the figure's pattern maker works in figure units: scaled up, the same pitch as the portrait's). */
function _gplPat(a, d, id, base) {
  const k = 2.6, down = String(d).replace(/-?\d*\.?\d+/g, (v) => _gplN(Number(v) / k));
  const g = _pfFigPattern(a.pattern, down, id, pfTone(_pfHexOf('cloth', a.patCol, '#f2f0ea')), base);
  return g ? `<g transform="scale(${k})">${g}</g>` : '';
}
/** A bag at the hip: the portrait draws only its strap. */
function _gplHipBag(a, back) {
  if (!['crossbody', 'satchel', 'messenger', 'shoulder', 'tote'].includes(a.bag)) return '';
  const c = pfTone(_pfHexOf('cloth', a.bagCol, '#9a6a40')), mt = pfTone(_pfHexOf('metal', a.metal, '#d9b04a')), cross = a.bag === 'crossbody' || a.bag === 'satchel' || a.bag === 'messenger';
  const right = back ? !cross : cross, x0 = right ? 76 : 24, w = a.bag === 'messenger' ? 24 : a.bag === 'tote' ? 22 : 19, h = a.bag === 'tote' ? 24 : 17, y = 110;
  const x = right ? x0 - w * 0.58 : x0 - w * 0.42, sx = right ? 74.6 : 28.6, n = _gplN;
  return _pfS(`M${n(sx)} 99 L${n(x + w / 2)} ${y + 1}`, c[1], a.bag === 'messenger' ? 4 : 3)
    + `<rect x="${n(x)}" y="${y}" width="${w}" height="${h}" rx="4" fill="${c[0]}"/>`
    + _pfP(`M${n(x)} ${y + 4} Q${n(x)} ${y} ${n(x + 4)} ${y} L${n(x + w - 4)} ${y} Q${n(x + w)} ${y} ${n(x + w)} ${y + 4} L${n(x + w)} ${y + 7} Q${n(x + w / 2)} ${y + 10} ${n(x)} ${y + 7} Z`, c[1])
    + (back ? '' : `<rect x="${n(x + w / 2 - 1.6)}" y="${y + 6}" width="3.2" height="3" rx="0.8" fill="${mt[0]}"/>`);
}
/** The person from behind: the top's outline in its own colour and pattern. */
function _gplBackBust(a, fo, uid) {
  const tone = (slot) => pfTone(fo.slots[slot] || (PF_CLOTH[slot] && PF_CLOTH[slot].hex) || '#888888');
  const sk = pfTone(_pfHexOf('skin', a.skin, '#e2b08c'));
  const dressed = !!_PF_FIG_DRESS[a.dress], outerAll = !!_PF_FIG_OUTER[a.outer] || a.outer === 'gilet' || a.outer === 'hivis';
  const bare = !outerAll && (dressed ? !!_PF_FIG_DRESS[a.dress][3] : _PF_FIG_SLEEVELESS.has(a.top));
  const c = a.outer === 'hivis' ? pfTone('#d8f03a') : tone(outerAll ? 'pfOut' : a.dress !== 'none' ? 'pfDress' : fo.o.top.col);
  const D = 'M8 100 C8 86 19 78.5 35 75.6 Q50 72.6 65 75.6 C81 78.5 92 86 92 100 Z', Dbare = 'M24.6 100 C25 92 28.4 86.6 33.6 84 Q50 86 66.4 84 C71.6 86.6 75 92 75.4 100 Z';
  const pat = a.pattern !== 'none' && !outerAll && a.dress !== 'pinafore' ? (d) => _pfPattern(a.pattern, pfTone(_pfHexOf('cloth', a.patCol, '#f2f0ea')), c, uid + 'bp', d, false) : null;
  if (bare) return _pfSkinChest(sk, true) + _pfP(Dbare, c[0]) + (pat ? pat(Dbare) : '');
  return _pfTopBase(c, false, pat ? { pat } : null, D);
}
/** The back of the head: a head of hair (or the headscarf, or the bare head), then the kit's own hair shapes and hat over it. */
function _gplBackHead(a, L) {
  const hc = pfTone(_pfHexOf('hair', a.hairCol, '#4a3324')), sk = pfTone(_pfHexOf('skin', a.skin, '#e2b08c'));
  const scarfOn = a.hat === 'headscarf', bald = (a.hair === 'bald' || a.hair === 'norwood7') && !scarfOn;
  const c = scarfOn ? pfTone(_pfHexOf('cloth', a.hatCol, '#b83a30')) : bald ? sk : hc;
  const rim = a.hair === 'norwood7' && !scarfOn ? _pfP('M30.8 45 C31 55 38 63 50 63.6 C62 63 69 55 69.2 45 C66 51 58 54 50 54 C42 54 34 51 30.8 45 Z', hc[0]) : '';   // seen from behind: the band round the back
  return L.ears + _pfP(PF_HEAD_D, c[0]) + rim + (bald ? _pfE(41, 31, 6, 3.2, sk[2], 0.45) : _pfP('M63 28 C69.6 35 70.6 52 60.6 63.2 C65.6 53.6 66.8 40.6 63 28 Z', c[1], 0.45) + _pfE(41, 31, 6.6, 3.4, c[2], 0.4)) + L.hair + L.hat + L.phones;
}
/** What shows on the back: a backpack, a cape. */
function _gplBackPack(a, fo, T) {
  const c = pfTone(_pfHexOf('cloth', a.bagCol, '#9a6a40')), mt = pfTone(_pfHexOf('metal', a.metal, '#d9b04a'));
  let s = '';
  if (a.outer === 'cape') { const o = pfTone(fo.slots.pfOut || '#3e5a80'), hem = _GPL_FLOOR + T.hem * _GPL_KY + 20; s += _pfP(`M18 88 Q50 80 82 88 L88 ${_gplN(hem)} Q50 ${_gplN(hem + 7)} 12 ${_gplN(hem)} Z`, o[0]) + _pfP(`M82 88 L88 ${_gplN(hem)} Q80 ${_gplN(hem + 3)} 70 ${_gplN(hem + 4)} Q74 110 68 86 Z`, o[1], 0.5); }
  if (a.bag === 'backpack') s += `<rect x="30" y="84" width="40" height="42" rx="9" fill="${c[0]}"/>` + _pfP('M30 96 Q30 84 39 84 L61 84 Q70 84 70 96 L70 101 Q50 106 30 101 Z', c[1]) + `<rect x="47.6" y="100" width="4.8" height="5" rx="1.2" fill="${mt[0]}"/>` + `<rect x="36" y="111" width="28" height="11" rx="3.4" fill="${c[1]}" opacity="0.7"/>`;
  return s;
}
/** From behind, a scarf's hanging end is on the far side: only the wrap at the neck shows. */
function _gplClipUp(s, uid) { return s ? `<clipPath id="${uid}u"><rect x="0" y="60" width="100" height="23"/></clipPath><g clip-path="url(#${uid}u)">${s}</g>` : ''; }

/* -- the whole person -- */
function _gplDraw(a, dir, pose, o) {
  const fo = profileFigureOpts(a), PP = _pfSP;
  if (!PP) return '';
  const uid = 'gpl' + _gplHash(JSON.stringify(a)) + dir + pose;
  const L = profileAvatarSvg(a, { size: 128, uid, layers: true, motion: !!o.motion });
  // the body comes bare-headed: the head is the portrait's. Arms hanging straight (a hand out of reach, straight down): the walk and the moves swing them
  const bare = Object.assign({}, a, { hair: 'bald', hat: 'none', glasses: 'none', earrings: 'none', facial: 'none', headphones: 'none', scarf: 'none' });   // and the portrait's scarf, every way round: a daisy chain stays a daisy chain
  const hang = { far: { hand: [0.1, 60] }, near: { hand: [-0.6, 60] } };
  const F = profileFigureSvg(bare, { layers: true, arms: hang, uid: uid + 'f', size: 240 });
  if (!F || !F.mid) return '';
  const Fp = profileFigureSvg(bare, { layers: true, arms: hang, uid: uid + 'a', size: 240, plain: true });   // the arms, without the fine pieces (they would only be smudges, scaled like this)
  const T = PP.TOPS[fo.o.top.kind] || PP.TOPS.tee, B = PP.BUILD[fo.o.build] || PP.BUILD.average;
  const S = _GPL_S, KY = _GPL_KY, Tools = _gplTools();
  // (the can they own, on every screen: 94-garden-fish-7gear.js)
  { const col = o.gear && o.gear.c && typeof GARDEN_CAN_LOOK !== 'undefined' ? GARDEN_CAN_LOOK[o.gear.c] : null; if (col) { const can0 = Tools.can; Tools.can = () => can0().split('#6f9ab0').join(col); } }
  const slung = o.gear && typeof _gplSlung === 'function' ? _gplSlung(o.gear, pose) : '';
  const side = dir === 'e', back = dir === 'n';
  const hipY = PP.HIP * KY * S, headO = `transform-origin:0px ${_gplN(_gplY(66))}px`;
  const P = _gplPoseArms(pose, side, Tools, o.stageRod);
  let legs = '', upper = '';   // the legs under the body: a hem or a hand always lies over a thigh
  if (side) {
    const KX = _GPL_KX, fig = _gplM(KX * S, KY * S, 0, 0), figL = _gplM(_GPL_KXL * S, KY * S, 0, 0), j = (p) => [p[0] * KX * S, p[1] * KY * S], len = 19.1 * KY * S;
    legs = `<g class="gpl-limb gpl-lg gpl-b" style="transform-origin:0px ${_gplN(hipY)}px">${_gplG(figL, F.legB)}</g><g class="gpl-limb gpl-lg gpl-a" style="transform-origin:0px ${_gplN(hipY)}px">${_gplG(figL, F.legA)}</g>`;
    const far = _gplG(fig, Fp.farArm), near = _gplG(fig, Fp.nearArm);
    const armFar = P ? _gplArm(far, j(F.shoulders.far), len, P.a[1] || '', P.a[0], P.a[2]) : _gplArm(far, j(F.shoulders.far), len, 'gpl-as gpl-a');
    const armNear = P ? _gplArm(near, j(F.shoulders.near), len, P.b[1] || '', P.b[0], P.tool || P.b[2]) : _gplArm(near, j(F.shoulders.near), len, 'gpl-as gpl-b');
    // the head turned the way it walks: the face slides over the egg, the ears the other way; what hangs behind goes behind (a ponytail trails)
    const t = _GPL_TURN;
    const head = _gplG(`translate(${_gplN(-t * 0.7)} 0)`, L.ears) + L.skull + `<clipPath id="${uid}h"><path d="${PF_HEAD_D}"/><rect x="20" y="60" width="45" height="70"/></clipPath><g clip-path="url(#${uid}h)">${_gplG(`translate(${t} 0)`, L.face)}</g>` + _gplG(`translate(${_gplN(t * 0.22)} 0)`, L.hair) + _gplG(`translate(${t} 0)`, L.glasses) + _gplG(`translate(${_gplN(t * 0.22)} 0)`, L.hat) + L.phones + L.extra;
    upper = `<g class="gpl-hd" style="${headO}">${_gplG(_gplPort(), `<g transform="translate(100 0) scale(-1 1)">${L.hairback}</g>`)}</g>`
      + _gplG(fig, F.back) + armFar + _gplG(_gplPort(), L.neck) + _gplG(fig, F.mid) + _gplG(_gplPort(), L.strands + L.scarf) + armNear
      + `<g class="gpl-hd" style="${headO}">${_gplG(_gplPort(), head)}</g>`;
  } else {
    const kb = _GPL_BUST[a.build] || 0.8, port = _gplPort(), bust = _gplPort(kb);
    const KXF = 3.0, dx = 9.4 * (kb / 0.8) * S;
    const legArt = (sgn) => _gplG(_gplM(sgn * KXF * S, KY * S, sgn * dx, 0), F.legA);
    legs = `<g class="gpl-limb gpl-lf gpl-a" style="transform-origin:${_gplN(-dx)}px ${_gplN(hipY)}px">${legArt(-1)}</g><g class="gpl-limb gpl-lf gpl-b" style="transform-origin:${_gplN(dx)}px ${_gplN(hipY)}px">${legArt(1)}</g>`;
    // the arms: the figure's, without the fine pieces, as wide as the portrait's sleeves (its seams are at 24 and 76)
    const FpL = a.watch === 'none' ? Fp : profileFigureSvg(Object.assign({}, bare, { watch: 'none' }), { layers: true, arms: hang, uid: uid + 'b', size: 240, plain: true });
    const w = B.arm + T.g * 0.6, ax = (16.4 * kb / w) * S, ay = KY * S, jx = 34 * kb * S, jy = _gplY(88), sh = Fp.shoulders.near;
    const armArt = (sgn, art) => _gplG(_gplM(sgn * ax, ay, sgn * (jx - sh[0] * ax), jy - sh[1] * ay), art), len = 19.1 * ay;
    const armL = armArt(-1, FpL.nearArm), armR = armArt(1, Fp.nearArm);
    const left = P ? _gplArm(armL, [-jx, jy], len, P.a[1] || '', -P.a[0], P.a[2], P.k) : _gplArm(armL, [-jx, jy], len, 'gpl-af gpl-b');
    const right = P ? _gplArm(armR, [jx, jy], len, P.b[1] || '', P.b[0], P.tool || P.b[2], P.k) : _gplArm(armR, [jx, jy], len, 'gpl-af gpl-a is-r');
    const lower = _gplG(bust, _gplLower(a, fo, T, uid, back)), cape = a.outer === 'cape';   // a cape lies over the arms
    if (back) {
      upper = lower + _gplG(bust, _gplBackBust(a, fo, uid) + _gplHipBag(a, true)) + left + right + _gplG(bust, L.neck)
        + `<g class="gpl-hd" style="${headO}">${_gplG(port, L.back + (a.outer === 'cape' ? '' : L.outerback) + L.hairback + L.strands)}</g>` + _gplG(bust, _gplClipUp(L.scarf, uid) + _gplBackPack(a, fo, T))
        + `<g class="gpl-hd" style="${headO}">${_gplG(port, _gplBackHead(a, L))}</g>`;
    } else {
      upper = `<g class="gpl-hd" style="${headO}">${_gplG(port, L.back + L.outerback + L.hairback)}</g>` + lower + (cape ? left + right : '') + _gplG(bust, L.neck + L.body + _gplHipBag(a, false) + (cape ? _gplCapeFront(fo) : '')) + (cape ? '' : left + right)
        + _gplG(port, L.strands) + _gplG(bust, L.scarf)
        + `<g class="gpl-hd" style="${headO}">${_gplG(port, L.ears + L.skull + L.face + L.hair + L.glasses + L.hat + L.phones + L.extra)}</g>`;
    }
  }
  return `<g class="gpl gpl-${pose} gpl-d${dir}"><g class="gpl-root" style="transform-origin:0px 0px">${legs}<g class="gpl-up" style="transform-origin:0px ${_gplN(hipY)}px">${back ? '' : slung}${upper}${back ? slung : ''}</g></g></g>`;
}

/** The figure as a fragment (cached per look, way round and pose). */
function gartPlayerSvg(avatar, o) {
  o = o || {};
  const dir = o.dir === 'n' || o.dir === 'e' ? o.dir : 's';
  const pose = GPL_POSES.includes(o.pose) ? o.pose : 'idle';
  let a;
  try { a = profileAvatarNormalize(avatar); } catch (e) { return ''; }
  const key = JSON.stringify(a) + dir + pose + (o.motion ? 'm' : '') + (o.stageRod ? 'r' : '') + (o.gear ? JSON.stringify(o.gear) : '');
  let s = _GPL.cache.get(key);
  if (s == null) { try { s = _gplDraw(a, dir, pose, o); } catch (e) { s = ''; } if (_GPL.cache.size > 40) _GPL.cache.clear(); _GPL.cache.set(key, s); }
  return s;
}
/** The same person as an <svg>, standing, front on: anywhere outside the walker (a friend's garden). */
function gartPlayerFigureSvg(avatar, o) {
  o = o || {};
  const inner = gartPlayerSvg(avatar, { dir: 's', pose: o.pose === 'walk' ? 'walk' : 'idle', motion: !!o.motion });
  if (!inner) return '';
  const h = Math.max(24, Math.min(400, Math.round(Number(o.size) || 64)));
  return `<svg class="pf-fig-svg gpl-svg" viewBox="-30 -74 60 78" width="${Math.round(h * 60 / 78)}" height="${h}" aria-hidden="true" focusable="false">${inner}</svg>`;
}
function _gplAvatar() { try { return typeof profileGet === 'function' ? profileGet().avatar : null; } catch (e) { return null; } }
/** Draw into the walker's inner group. Returns false to let the walker draw its old figure. */
function gartPlayerPaint(inner, gw) {
  if (!inner || !gw) return false;
  try {
    if (typeof profileAvatarNormalize !== 'function' || typeof profileFigureSvg !== 'function') return false;
    const motion = _gartMotionOk(), moving = gw.moving && motion;
    const now = Date.now();   // clock-ok: how long a pose lasts
    let pose = moving ? 'walk' : 'idle', stageRod = false;
    if ((gw.fishing && gw.fishing.state !== 'idle') || gw.casting) { pose = 'fish'; stageRod = true; }   // the fishing game draws the rod and the line itself
    if (_GPL.pose && now < _GPL.until && !moving) pose = _GPL.pose;
    const av = _gplAvatar(), dir = GPL_POSE_FRONT.has(pose) ? 's' : stageRod ? 'e' : _GPL.dir;   // fishing is side on: the game's rod starts from the hand on the side you face; a catch held up faces you
    const gear = typeof _gplMyGear === 'function' ? _gplMyGear() : null;
    const key = pose + dir + (motion ? 'm' : '') + (stageRod ? 'r' : '') + JSON.stringify(av) + JSON.stringify(gear);   // a compare: a wardrobe change shows at once, nothing else redraws
    if (_GPL.key !== key || !inner.firstChild || inner._gplKey !== key) {
      const s = gartPlayerSvg(av, { dir, pose, motion, stageRod, gear });
      if (!s) return false;
      _GPL.key = key; inner._gplKey = key;
      inner.innerHTML = s;
    }
    const S = typeof GW_SCALE === 'number' ? GW_SCALE : 0.74;
    inner.setAttribute('transform', `scale(${dir === 'e' && gw.face < 0 ? -S : S} ${S})`);
    return true;
  } catch (e) { return false; }
}
/** Once per walker frame: which way are we going? Only a real change of direction redraws. */
function gartPlayerStep(gw) {
  if (!gw) return;
  const x = gw.px, y = gw.py;
  if (_GPL.lastX == null) { _GPL.lastX = x; _GPL.lastY = y; return; }
  const dx = x - _GPL.lastX, dy = (y - _GPL.lastY) * 1.6;   // a row is shorter than a column on screen
  if (Math.abs(dx) + Math.abs(dy) < 0.04) return;
  _GPL.lastX = x; _GPL.lastY = y;
  const dir = Math.abs(dx) >= Math.abs(dy) * 0.8 ? 'e' : dy > 0 ? 's' : 'n';
  const turned = dir !== _GPL.dir || (dir === 'e' && dx !== 0 && (dx > 0) !== (_GPL.lastDx > 0));
  _GPL.lastDx = dx;
  if (typeof gartEmoteMoved === 'function') gartEmoteMoved();   // 2.23: sitting ends when you walk
  if (turned) { _GPL.dir = dir; if (typeof _gwBody === 'function') _gwBody(); }
}
/** Strike a pose for a moment, and turn back to idle afterwards. */
function gartPlayerAct(pose, ms) {
  _GPL.pose = pose; ms = ms || 900;
  _GPL.until = Date.now() + ms;   // clock-ok: how long a pose lasts
  try { if (typeof _gwBody === 'function') _gwBody(); } catch (e) { /* no walker here */ }
  clearTimeout(_GPL.t);
  _GPL.t = setTimeout(() => { _GPL.pose = ''; try { if (typeof _gwBody === 'function') _gwBody(); } catch (e) { /* gone */ } }, ms + 30);
}
if (typeof document !== 'undefined') {
  document.addEventListener('opendash:garden', (ev) => {
    const d = ev && ev.detail; if (!d) return;
    if (d.kind === 'water' && d.x != null) gartPlayerAct('water', 1000);
    else if (d.kind === 'plant') gartPlayerAct('dig', 760);
    else if (d.kind === 'harvest') gartPlayerAct('pick', 760);
    else if (d.kind === 'prune' || d.kind === 'feed') gartPlayerAct('pick', 560);
  });
  // a wardrobe change (here, or from another computer) shows at once
  document.addEventListener('opendash:profile', () => { try { if (typeof _gw !== 'undefined' && _gw.node && typeof _gwBody === 'function') _gwBody(); } catch (e) { /* no walker here */ } });
}
