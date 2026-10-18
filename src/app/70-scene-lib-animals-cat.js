/* ============================================================
   SCENE LIBRARY: the domestic cat (Elm Hill, Norwich: "a few people and a cat"; any lane, doorstep, wall top or garden).
   PURE: one sceneObjDefine, built lazily per variant. Sits upright facing RIGHT (the engine flips it), feet on the ground at the anchor, tail curled
   round the front paws. Four coats: v0 ginger tabby, v1 black, v2 grey tabby, v3 black and white (the 'tuxedo'). A static animal: it sits where it is
   put (a doorstep, the foot of a wall); it is not a mover. 0.3 m to the crown of the head at the real scale (real size in 70-scene-1real.js).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const f1 = v => Math.round(v * 10) / 10;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const hx = c => { const n = parseInt(String(c).slice(1), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  /** A coat: [base, shade, light, stripe]. */
  const coat = c => [c, mix(c, '#000000', 0.28), mix(c, '#ffffff', 0.2), mix(c, '#000000', 0.5)];
  sceneObjDefine({
    id: 'animal.cat', category: 'animal', size: [40, 56], variants: 4, seasonal: false, flippable: true, parts: ['tail', 'body', 'head'],
    palette: { base: { ginger: coat('#c9803f'), black: coat('#26262a'), grey: coat('#8a8d92'), tux: coat('#2a2a2e'), white: '#f1ede4', nose: '#d89aa0', eye: '#d8b84a', pupil: '#111111' } },
    shadow: { rx: 14, ry: 2.6, h: 20 },
    tags: ['uk', 'street', 'village', 'cat', 'pet', 'kit:animals', 'kit:temperate', 'kit:urban', 'role:animal'],
    credit: 'a sitting domestic cat, drawn for the Elm Hill lane',
    build(v) {
      const c = ['@ginger', '@black', '@grey', '@tux'][v | 0], tab = v === 0 || v === 2;
      const tail = [{ s: c + '.0', w: 5, d: 'M-15-3q10 6 26 1q10-2 15-7', cap: 'round' }, { s: c + '.3', w: 5, d: 'M27-6q4-2 7-6', cap: 'round', op: v === 3 ? 0 : 0.85 }];
      const body = [
        [c + '.1', 'M-17 0q-6-4-5-17 1-14 12-19 9-3 15 2 4 5 5 15l-1 19z'],                      // the haunch and back, in shade
        [c + '.0', 'M-14 0q-5-6-4-16 1-12 10-17 8-3 13 1 3 5 4 14l-2 18z'],                      // the lit side of the body
        [c + '.2', 'M-9-31q7-5 14-1-7 0-14 6z', 0.6],                                             // the light along the back
        [c + '.2', 'M5-30q6-2 8 3 1 8-2 12-5-4-6-15z', 0.45],                                       // the chest
        [c + '.0', 'M8-27q3-2 6 1l1 25h-8z'],                                                      // the near front leg
        [c + '.1', 'M5-22q2-3 4-3l1 23H4z', 0.8],                                                 // the far front leg
        [c + '.0', ell(11.5, -1, 5.2, 2.1)], [c + '.1', ell(5.5, -0.8, 4.2, 1.8), 0.9],           // the paws
        [c + '.1', ell(-11, -2, 6, 2.4)],                                                         // the hind foot
      ];
      if (v === 3) body.push(['@white', 'M7-28q4-2 7 1l1 24h-8z'], ['@white', 'M3-27q5-3 9 1 0 6-2 8-5-1-7-9z', 0.95], ['@white', ell(11.5, -1, 5.2, 2.1)]);
      if (tab) for (let i = 0; i < 5; i++) body.push({ s: c + '.3', w: 1.5, op: 0.5, d: `M${-14 + i * 2.6} ${-28 + i * 4.4}q5-1 8.5 2` });
      const head = [
        [c + '.0', 'M3-42q0-8 8-8 8 0 9 8 0 7-8 8-9 0-9-8z'],
        [c + '.0', 'M4-47l1-9 6 5zM14-50l5-6 2 9z'],                                              // the two ears
        [c + '.1', 'M5-48l1-5 3 3zM15-50l3-3 1 5z', 0.7],
        [c + '.2', 'M6-46q5-3 10-1-5 0-10 3z', 0.5],
        ['@eye', ell(12, -43, 1.6, 1.2)], ['@pupil', ell(12.2, -43, 0.5, 1.1)], ['@eye', ell(17, -43, 1.5, 1.1)], ['@pupil', ell(17.1, -43, 0.45, 1)],
        ['@nose', ell(19.4, -40.5, 1, 0.7)],
      ];
      if (v === 3) head.push(['@white', 'M13-40q4 3 8 0 0 4-4 4-4 0-4-4z', 0.9]);
      if (tab) head.push({ s: c + '.3', w: 1, op: 0.6, d: 'M9-48l1 3M12-49v3M15-49l-1 3' });
      return { tail, body, head };
    },
  });
})();
