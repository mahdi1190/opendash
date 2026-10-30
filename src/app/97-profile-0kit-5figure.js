/* ============================================================
   PROFILE, the avatar kit: THE FULL FIGURE (2.18, agent 'wardrobe'). PURE, like 97-profile-0kit.js
   (read its header). The full figure IS a scene person (scenePeople.figure, 70-scene-lib-people-0figure.js,
   a faceless side view about 62 units tall, facing right): profileFigureOpts maps the avatar onto its
   options, and profileFigureDress adds what the people builder has no option for, as more shapes in the
   builder's own format ({f: '@slot.tone', d, op, s, w, detail}), so the profile's SVG and the scene
   engine draw them alike. Colours ride on palette slots of their own (pfTop, pfBot, pfOut, pfShoe, pfMetal,
   pfPat; sk0 and hr0 for skin and hair colours outside the scene palette): profileFigureOpts(a).slots.
     _PF_FIG_*                          the mapping tables (hair, tops, outerwear, dresses, bottoms, shoes, hats, bags)
     _pfFigOpts(a)                      {o, slots, hairHex}: what profileFigureOpts returns
     profileFigureDress(a, f, o)        adds the extra pieces to a figure() result (in place; returns f)
                                        o {PP: the people library}
     _pfFigPattern(kind, d, id, pc, base)   a fabric pattern clipped to one garment path (the profile's SVG only)
   What the figure wears, at its scale: every top, outerwear and dress (sleeveless ones bare the arms), every
   bottom (wide hems, cargo pockets, turn-ups, pleats, the dungarees' bib), every shoe, every hat, glasses and
   sunglasses, earrings, necklaces, ties, pins, watches, beards, bigger hair (afro, puffs, mohawk, high top,
   locs, braids, buns), bags and scarves. Face details (eyes, make-up, paint, piercings) are not drawn: the
   scene people have no faces.
   ============================================================ */
const _PF_FIG_HAIR = Object.freeze({ bald: 'bald', buzz: 'crop', crop: 'crop', mohawk: 'crop', pixie: 'crop', cornrows: 'crop', hightop: 'crop',
  short: 'short', side: 'short', spiky: 'short', fringe: 'short', curtains: 'short', quiff: 'short', slick: 'short', undercut: 'short',
  curly: 'curly', afro: 'curly', puffs: 'curly', bob: 'long', long: 'long', wavy: 'long', braids: 'long', sweep: 'long', halfup: 'long', shag: 'long',
  mullet: 'long', locs: 'long', boxbraids: 'long', pony: 'pony', pigtails: 'pony', bun: 'bun', buns: 'bun', topknot: 'bun' });
const _PF_FIG_TOP = Object.freeze({ tee: 'tee', vneck: 'tee', henley: 'tee', polo: 'shirt', shirt: 'shirt', blouse: 'blouse', ruffle: 'blouse', tank: 'tee', bardot: 'blouse',
  sweat: 'jumper', jumper: 'jumper', festive: 'jumper', turtle: 'jumper', cardigan: 'cardigan', hoodie: 'hoodie', rugby: 'shirt', jersey: 'tee', kurta: 'shirt',
  kimono: 'cardigan', sailor: 'blouse', jacket: 'jacket', coat: 'coat', parka: 'parka', lab: 'coat' });
const _PF_FIG_SLEEVELESS = Object.freeze(new Set(['tank', 'bardot']));
/** Outerwear that becomes the figure's top garment (the rest are drawn over the top: gilet, apron, hi-vis, cape). */
const _PF_FIG_OUTER = Object.freeze({ denim: 'jacket', leather: 'jacket', blazer: 'jacket', bomber: 'jacket', fleece: 'jacket', varsity: 'jacket', puffer: 'parka',
  raincoat: 'rain', trench: 'coat', robe: 'coat' });
/** Dresses: [the figure's top, the bottom, its length, sleeveless] */
const _PF_FIG_DRESS = Object.freeze({ sundress: ['tee', 'skirt', 'knee', 1], tea: ['blouse', 'skirt', 'midi', 0], wrap: ['blouse', 'skirt', 'knee', 0],
  shirtdress: ['shirt', 'skirt', 'knee', 0], slip: ['tee', 'skirt', 'midi', 1], knit: ['jumper', 'skirt', 'knee', 0], jumpsuit: ['shirt', 'trousers', 'knee', 0],
  gown: ['tee', 'skirt', 'midi', 1] });
const _PF_FIG_BOTTOM = Object.freeze({ jeans: 'jeans', trousers: 'trousers', chinos: 'trousers', cargo: 'trousers', wide: 'trousers', joggers: 'joggers', leggings: 'shorts',
  shorts: 'shorts', skirt: 'skirt', pleated: 'skirt', midi: 'skirt', dungarees: 'jeans' });
/** Shoes the people builder draws itself; the others are drawn here instead (its shoe is taken off first). */
const _PF_FIG_SHOE_OWN = Object.freeze(new Set(['trainer', 'shoe', 'boot', 'sandal']));
const _PF_FIG_HAT = Object.freeze({ strawhat: 'sunhat', beekeeper: 'sunhat', anglerhat: 'sunhat', pith: 'sunhat', beanie: 'beanie', slouch: 'beanie', bearbeanie: 'beanie', trapper: 'beanie', cap: 'cap', flatcap: 'flatcap', sunhat: 'sunhat',
  headscarf: 'beanie', santa: 'beanie' });
const _PF_FIG_BAG = Object.freeze({ crossbody: 'crossbody', satchel: 'crossbody', messenger: 'crossbody', bumbag: 'crossbody', shoulder: 'shoulder', tote: 'shoulder', backpack: 'backpack' });
const _PF_SUNGLASSES = Object.freeze(new Set(['sun', 'aviatorsun', 'roundsun', 'mirror', 'sport', 'heart', 'starsun', '3d']));

/** The scenePeople.figure() options of an avatar, and the colours of the slots they paint with. */
function _pfFigOpts(a) {
  const slots = {};
  const sm = /^s([0-5])$/.exec(a.skin), skin = sm ? Number(sm[1]) : 0;
  if (!sm) slots.sk0 = _pfHexOf('skin', a.skin, '#e2b08c');
  const hm = /^h(\d)$/.exec(a.hairCol), hairHex = hm ? null : _pfHexOf('hair', a.hairCol, '#2a211c');
  if (hairHex) slots.hr0 = hairHex;
  const cloth = (id, d) => _pfHexOf('cloth', id, d || '#888888');
  const o = { build: a.build, skin, hair: { style: _PF_FIG_HAIR[a.hair] || 'short', col: hm ? Number(hm[1]) : 0 }, arms: 'walk', legs: 'walk' };
  const dress = _PF_FIG_DRESS[a.dress], outer = _PF_FIG_OUTER[a.outer];
  slots.pfTop = a.top === 'lab' ? cloth('white') : cloth(a.topCol);
  slots.pfIn = cloth(a.top2Col, '#f2f0ea');
  slots.pfOut = cloth(a.outerCol, '#3e5a80');
  slots.pfBot = cloth(a.bottomCol, '#3e5a80');
  slots.pfDress = cloth(a.dressCol, '#9cb59a');
  slots.pfShoe = cloth(a.shoesCol, '#f2f0ea');
  slots.pfMetal = _pfHexOf('metal', a.metal, '#d9b04a');
  slots.pfPat = cloth(a.patCol, '#f2f0ea');
  if (dress) {
    // a coat or jacket over a dress: the coat is the top, the dress shows below it
    o.top = outer ? { kind: outer, col: 'pfOut', col2: 'pfDress', belt: a.outer === 'trench' ? 1 : 0 } : { kind: dress[0], col: 'pfDress', col2: 'pfIn' };
    o.bottom = { kind: dress[1], col: 'pfDress', len: dress[2] };
  } else {
    o.top = outer ? { kind: outer, col: 'pfOut', col2: 'pfTop', belt: a.outer === 'trench' ? 1 : 0 } : { kind: _PF_FIG_TOP[a.top] || 'tee', col: 'pfTop', col2: 'pfIn' };
    o.bottom = { kind: _PF_FIG_BOTTOM[a.bottom] || 'jeans', col: a.dress === 'pinafore' ? 'pfDress' : 'pfBot', len: a.bottom === 'midi' ? 'midi' : 'knee' };
    if (a.dress === 'pinafore') o.bottom = { kind: 'skirt', col: 'pfDress', len: 'knee' };
    if (a.bottom === 'leggings' && a.dress !== 'pinafore') o.tights = 'pfBot';
  }
  o.shoes = { kind: _PF_FIG_SHOE_OWN.has(a.shoes) ? a.shoes : 'trainer', col: 'pfShoe' };
  const hat = _PF_FIG_HAT[a.hat];
  if (hat) o.hat = { kind: hat, col: a.hat === 'santa' ? 'red' : a.hatCol, pom: a.hat === 'beanie' || a.hat === 'santa' ? 'cream' : undefined };
  if (a.scarf !== 'none') o.scarf = { col: a.scarf === 'rainbow' ? 'red' : a.scarfCol, col2: ['striped', 'tartan'].includes(a.scarf) ? a.scarf2Col : a.scarf === 'rainbow' ? 'yellow' : a.scarfCol };
  const bag = _PF_FIG_BAG[a.bag];
  if (bag) o.bag = { kind: bag, col: a.bagCol };
  return { o, slots, hairHex };
}

/* ---------- the extra pieces ---------- */
const _pfF = (v) => _pfN(v);
function _pfFD(...a) {   // path data from commands and numbers (absolute only)
  let s = '', prev = false;
  for (const t of a) { if (typeof t === 'number') { const n = _pfF(t); s += (prev && n[0] !== '-' ? ' ' : '') + n; prev = true; } else { s += t; prev = false; } }
  return s;
}
/**
 * Adds the 2.18 pieces to a scenePeople.figure() result f (in place) and returns it. a: a normalised avatar.
 * o {PP}: the people library (BUILD, TOPS). Keeps f.at (the arms' ranges in body) right after inserting.
 */
function profileFigureDress(a, f, o) {
  o = o || {};
  const PP = o.PP || (typeof scenePeople !== 'undefined' ? scenePeople : null);
  if (!f || !Array.isArray(f.body) || !PP) return f;
  const fo = _pfFigOpts(a).o;
  const sk = 'sk' + (fo.skin | 0), hr = 'hr' + ((fo.hair && fo.hair.col) | 0);
  const T = (PP.TOPS && PP.TOPS[fo.top.kind]) || { g: 0, hem: -30.4 }, B = (PP.BUILD && PP.BUILD[fo.build]) || { d: 8.6, belly: 0.4 };
  const head = f.head || { x: 0.7, y: -57.3, rx: 3.55, ry: 4.15 }, hx = head.x, hy = head.y, rx = head.rx, ry = head.ry;
  const sh = f.shoulders && f.shoulders.near ? f.shoulders.near : [-0.6, -48.5], ys = sh[1] - 1.9, lean = sh[0] + 0.6;
  const xf = B.d / 2 - 0.4 + (T.g || 0), xb = -B.d / 2 - (T.g || 0), bel = (B.belly || 0);
  const D = _pfFD, det = (x) => Object.assign(x, { detail: true });
  const S = (paint, w, d, op, extra) => Object.assign({ s: paint, w, d, op }, extra || {});
  const P = (paint, d, op) => ({ f: paint, d, op });
  const headX = [], torso = [], hairX = [], back = [], arm = [], legA = [], legB = [];
  const hatC = '@' + a.hatCol, metal = '@pfMetal';

  /* sleeveless tops and dresses bare the arms; a varsity jacket has cream sleeves */
  const dressDef = _PF_FIG_DRESS[a.dress];
  const bare = !_PF_FIG_OUTER[a.outer] && (dressDef ? !!dressDef[3] : _PF_FIG_SLEEVELESS.has(a.top));
  const sleeveTo = bare ? sk : a.outer === 'varsity' ? 'cream' : null;
  if (sleeveTo && f.at) {
    const topSlot = (fo.top && fo.top.col) || 'pfTop', re = new RegExp('^@' + topSlot + '\\.(\\d)$');
    for (const [s0, s1] of [f.at.farArm, f.at.nearArm]) {
      if (!Array.isArray([s0, s1]) || s1 == null) continue;
      for (let i = s0; i < s1; i++) {
        const x = f.body[i];
        if (!x || Array.isArray(x)) continue;
        if (bare && x.s && re.test(x.s) && Number(x.w) > (B.arm || 3.2) * 1.05) x.w = B.arm || 3.2;   // the short sleeve's stub becomes the bare upper arm
        if (x.s && re.test(x.s)) x.s = '@' + sleeveTo + '.' + re.exec(x.s)[1];
        if (x.f && re.test(x.f)) x.f = '@' + sleeveTo + '.' + re.exec(x.f)[1];
      }
    }
    if (bare) torso.push(S('@' + topSlot + '.1', 0.45, D('M', 0.2 + lean, ys + 0.4, 'L', -1.2 + lean, ys - 0.4)), S('@' + topSlot + '.1', 0.45, D('M', 1.6 + lean, ys + 0.6, 'L', 0.6 + lean, ys - 0.2)));
  }

  /* glasses (a lens at the front of the face, the arm to the ear) */
  if (a.glasses !== 'none' && a.glasses !== 'monocle') {
    const sun = _PF_SUNGLASSES.has(a.glasses), lx = hx + rx * 0.7, ly = hy - 0.5;
    headX.push(S('@' + a.glassesCol + '.0', 0.32, D('M', lx - 0.4, ly - 0.15, 'L', hx - rx * 0.15, ly + 0.15)));
    headX.push({ f: sun ? '@ink.0' : '#ffffff', d: D('M', lx - 0.5, ly - 0.75, 'L', lx + 0.95, ly - 0.75, 'Q', lx + 1.05, ly + 0.75, lx + 0.15, ly + 0.8, 'Q', lx - 0.55, ly + 0.7, lx - 0.5, ly - 0.75, 'Z'), op: sun ? 0.92 : 0.45,
      s: '@' + a.glassesCol + '.0', w: 0.28 });
  }
  /* earrings, at the lobe */
  if (a.earrings !== 'none') {
    const ex = hx - rx * 0.28, ey = hy + 1.6;   // the lobe, behind the cheek
    if (['hoops', 'bighoops'].includes(a.earrings)) headX.push(S(metal + '.0', 0.25, D('M', ex, ey, 'Q', ex - 0.9, ey + (a.earrings === 'bighoops' ? 1.8 : 1.1), ex, ey + (a.earrings === 'bighoops' ? 2.2 : 1.4), 'Q', ex + 0.9, ey + (a.earrings === 'bighoops' ? 1.8 : 1.1), ex, ey)));
    else headX.push(P(a.earrings === 'pearls' ? '#f3eee3' : metal + '.0', D('M', ex - 0.35, ey + 0.3, 'Q', ex, ey - 0.2, ex + 0.35, ey + 0.3, 'Q', ex, ey + 0.8, ex - 0.35, ey + 0.3, 'Z')));
  }
  /* beards: the jaw from below the ear to the chin */
  if (['beard', 'full', 'long', 'braided', 'anchor', 'goatee', 'chin', 'chops', 'stubble'].includes(a.facial)) {
    const low = a.facial === 'long' ? ry * 1.9 : a.facial === 'braided' ? ry * 1.5 : a.facial === 'full' ? ry * 1.25 : ry * 1.05;
    if (a.facial === 'goatee' || a.facial === 'anchor') headX.push(P('@' + hr + '.0', D('M', hx + rx * 0.35, hy + ry * 0.62, 'Q', hx + rx * 0.95, hy + ry * 0.7, hx + rx * 0.9, hy + ry * 0.95, 'Q', hx + rx * 0.55, hy + ry * 1.25, hx + rx * 0.25, hy + ry * 0.92, 'Z')));
    else headX.push(P('@' + hr + '.0', D('M', hx - rx * 0.3, hy + 0.1, 'Q', hx - rx * 0.1, hy + ry * 0.75, hx + rx * 0.2, hy + low, 'Q', hx + rx * 0.9, hy + low * 0.98, hx + rx * 0.98, hy + ry * 0.45,
      'Q', hx + rx * 0.5, hy + ry * 0.55, hx + rx * 0.05, hy + ry * 0.35, 'Q', hx - rx * 0.1, hy + 0.4, hx - rx * 0.3, hy + 0.1, 'Z'), a.facial === 'stubble' ? 0.35 : 1));
  }
  /* bigger hair */
  const crownY = hy - ry * 1.12;
  if (a.hair === 'afro') hairX.push(P('@' + hr + '.0', D('M', hx - rx - 1.6, hy + 1, 'Q', hx - rx - 3.2, hy - ry * 1.4, hx - 0.4, crownY - 2.6, 'Q', hx + rx + 2.6, crownY - 1.8, hx + rx + 1.4, hy - ry * 0.4, 'Q', hx + rx * 0.4, hy - ry * 0.7, hx - rx * 0.3, hy - ry * 0.3, 'Q', hx - rx * 0.6, hy + 0.6, hx - rx - 1.6, hy + 1, 'Z')),
    det(S('@' + hr + '.2', 0.35, D('M', hx - rx - 1, hy - ry * 0.8, 'Q', hx - rx * 0.4, crownY - 1.6, hx + rx * 0.6, crownY - 1.2), 0.5)));
  if (a.hair === 'puffs') for (const px of [hx - rx * 0.7, hx + rx * 0.5]) hairX.push(P('@' + hr + '.0', D('M', px - 1.7, crownY + 0.2, 'Q', px - 2, crownY - 2.6, px, crownY - 2.8, 'Q', px + 2, crownY - 2.6, px + 1.7, crownY + 0.2, 'Z')));
  if (a.hair === 'mohawk') hairX.push(P('@' + hr + '.0', D('M', hx - rx * 0.9, hy - ry * 0.9, 'Q', hx - rx * 0.4, crownY - 3.4, hx + rx * 0.6, crownY - 2.4, 'Q', hx + rx * 0.5, crownY - 0.6, hx + rx * 0.2, crownY + 0.4, 'Z')));
  if (a.hair === 'hightop') hairX.push(P('@' + hr + '.0', D('M', hx - rx * 0.85, crownY + 0.6, 'L', hx - rx * 0.8, crownY - 3.4, 'L', hx + rx * 0.75, crownY - 3.4, 'L', hx + rx * 0.85, crownY + 0.8, 'Z')),
    det(P('@' + hr + '.2', D('M', hx - rx * 0.8, crownY - 3.4, 'L', hx + rx * 0.75, crownY - 3.4, 'L', hx + rx * 0.7, crownY - 2.8, 'L', hx - rx * 0.75, crownY - 2.8, 'Z'), 0.6)));
  if (a.hair === 'topknot' || a.hair === 'halfup') hairX.push(P('@' + hr + '.0', D('M', hx - 1.6, crownY + 0.2, 'Q', hx - 1.8, crownY - 2.2, hx - 0.2, crownY - 2.3, 'Q', hx + 1.4, crownY - 2.2, hx + 1.2, crownY + 0.3, 'Z')));
  if (a.hair === 'buns') hairX.push(P('@' + hr + '.0', D('M', hx + 0.2, crownY + 0.4, 'Q', hx, crownY - 2, hx + 1.6, crownY - 2, 'Q', hx + 3, crownY - 1.6, hx + 2.4, crownY + 0.8, 'Z')));
  if (['locs', 'boxbraids', 'braids', 'pigtails'].includes(a.hair)) {
    const n = a.hair === 'locs' ? 4 : a.hair === 'boxbraids' ? 5 : 1, w = a.hair === 'locs' ? 0.7 : a.hair === 'boxbraids' ? 0.45 : 0.9, len = a.hair === 'pigtails' ? 7 : 11;
    for (let i = 0; i < n; i++) { const x0 = hx - rx * 0.6 - i * 0.55; hairX.push(S('@' + hr + '.' + (i % 2), w, D('M', x0, hy, 'Q', x0 - 1, hy + len * 0.5, x0 - 0.6 - i * 0.2, hy + len))); }
    if (a.hair === 'braids' || a.hair === 'pigtails') hairX.push(P('@red.0', D('M', hx - rx * 0.6 - 1.1, hy + len - 0.2, 'Q', hx - rx * 0.6 - 0.6, hy + len - 0.9, hx - rx * 0.6, hy + len - 0.2, 'Q', hx - rx * 0.6 - 0.6, hy + len + 0.5, hx - rx * 0.6 - 1.1, hy + len - 0.2, 'Z')));
  }
  /* hats the people builder has no shape for */
  const hatTop = (h, wTop, flat) => D('M', hx - rx * 0.92, hy - ry * 0.55, 'Q', hx - rx * 0.92, hy - ry * h, hx, hy - ry * h - 0.2, 'Q', hx + rx * 0.9, hy - ry * h, hx + rx * 0.9, hy - ry * 0.6, 'Z');
  const brim = (wL, wR, y, drop) => D('M', hx - rx - wL, hy - ry * y + drop, 'Q', hx, hy - ry * (y + 0.25), hx + rx + wR, hy - ry * y + drop, 'L', hx + rx + wR - 0.3, hy - ry * y + drop - 0.6, 'Q', hx, hy - ry * (y + 0.4), hx - rx - wL + 0.3, hy - ry * y + drop - 0.6, 'Z');
  switch (a.hat) {
    case 'bucket': headX.push(P(hatC + '.0', hatTop(1.5)), P(hatC + '.1', brim(1.6, 1.8, 0.5, 0.9))); break;
    case 'beret': headX.push(P(hatC + '.0', D('M', hx - rx - 1.2, hy - ry * 0.85, 'Q', hx - rx, crownY - 1.6, hx + 0.6, crownY - 1.4, 'Q', hx + rx + 0.6, crownY - 0.8, hx + rx * 0.7, hy - ry * 0.75, 'Q', hx, hy - ry * 0.6, hx - rx - 1.2, hy - ry * 0.85, 'Z')), P(hatC + '.3', D('M', hx - 0.2, crownY - 1.3, 'L', hx, crownY - 2.1, 'L', hx + 0.3, crownY - 1.3, 'Z'))); break;
    case 'fedora': case 'cowboy': case 'tophat': {
      const tall = a.hat === 'tophat' ? 2.4 : 1.6, c = a.hat === 'tophat' ? '@charcoal' : hatC;
      headX.push(P(c + '.0', D('M', hx - rx * 0.85, hy - ry * 0.62, 'L', hx - rx * 0.8, hy - ry * tall, 'Q', hx, hy - ry * (tall + (a.hat === 'tophat' ? 0.1 : -0.15)), hx + rx * 0.8, hy - ry * tall, 'L', hx + rx * 0.85, hy - ry * 0.62, 'Z')),
        P(a.hat === 'tophat' ? hatC + '.0' : c + '.3', D('M', hx - rx * 0.86, hy - ry * 0.95, 'L', hx + rx * 0.86, hy - ry * 0.95, 'L', hx + rx * 0.86, hy - ry * 0.7, 'L', hx - rx * 0.86, hy - ry * 0.7, 'Z')),
        P(c + '.1', a.hat === 'cowboy' ? D('M', hx - rx - 3.2, hy - ry * 1.05, 'Q', hx - rx - 1.6, hy - ry * 0.4, hx, hy - ry * 0.55, 'Q', hx + rx + 1.6, hy - ry * 0.4, hx + rx + 3.2, hy - ry * 1.05, 'Q', hx + rx + 1.8, hy - ry * 0.2, hx, hy - ry * 0.3, 'Q', hx - rx - 1.8, hy - ry * 0.2, hx - rx - 3.2, hy - ry * 1.05, 'Z') : brim(1.6, 1.8, 0.62, 0)));
      break;
    }
    case 'visor': case 'headband': headX.push(P(hatC + '.0', D('M', hx - rx - 0.2, hy - ry * 0.5, 'Q', hx, hy - ry * 0.85, hx + rx + 0.2, hy - ry * 0.55, 'L', hx + rx + 0.1, hy - ry * 0.3, 'Q', hx, hy - ry * 0.6, hx - rx - 0.1, hy - ry * 0.25, 'Z')));
      if (a.hat === 'visor') headX.push(P(hatC + '.1', D('M', hx + rx * 0.6, hy - ry * 0.45, 'L', hx + rx + 2.6, hy - ry * 0.32, 'L', hx + rx + 0.4, hy - ry * 0.2, 'Z'))); break;
    case 'bandana': headX.push(P(hatC + '.0', hatTop(1.22)), P(hatC + '.1', D('M', hx - rx * 0.92, hy - ry * 0.55, 'L', hx - rx - 1.6, hy + 0.4, 'L', hx - rx - 0.6, hy + 0.8, 'L', hx - rx * 0.6, hy - ry * 0.4, 'Z'))); break;
    case 'backcap': headX.push(P(hatC + '.0', hatTop(1.38)), P(hatC + '.1', D('M', hx - rx * 0.6, hy - ry * 0.5, 'L', hx - rx - 3.2, hy - ry * 0.55, 'Q', hx - rx - 3, hy - ry * 0.25, hx - rx * 0.4, hy - ry * 0.2, 'Z'))); break;
    case 'turban': case 'chef': headX.push(P(a.hat === 'chef' ? '#f6f4ef' : hatC + '.0', a.hat === 'chef'
      ? D('M', hx - rx * 0.85, hy - ry * 0.6, 'L', hx - rx, crownY - 2.6, 'Q', hx - rx - 1.2, crownY - 5, hx, crownY - 4.6, 'Q', hx + rx + 1.2, crownY - 5, hx + rx, crownY - 2.6, 'L', hx + rx * 0.85, hy - ry * 0.6, 'Z')
      : D('M', hx - rx - 0.6, hy - ry * 0.25, 'Q', hx - rx - 1, crownY - 1.6, hx + 0.4, crownY - 1.4, 'Q', hx + rx + 1, crownY - 1, hx + rx + 0.3, hy - ry * 0.5, 'Q', hx, hy - ry * 0.75, hx - rx - 0.6, hy - ry * 0.25, 'Z')));
      if (a.hat === 'turban') headX.push(det(S(hatC + '.3', 0.3, D('M', hx - rx, hy - ry * 0.5, 'Q', hx - rx * 0.2, crownY - 0.4, hx + rx * 0.8, hy - ry * 0.7), 0.6))); break;
    case 'crown': headX.push(P('#e9b949', D('M', hx - rx * 0.8, crownY + 1.2, 'L', hx - rx * 0.85, crownY - 1.8, 'L', hx - rx * 0.3, crownY - 0.6, 'L', hx, crownY - 2.4, 'L', hx + rx * 0.3, crownY - 0.6, 'L', hx + rx * 0.85, crownY - 1.8, 'L', hx + rx * 0.8, crownY + 1.2, 'Z'))); break;
    case 'halo': headX.push(S('#f2c94c', 0.4, D('M', hx - rx, crownY - 1.6, 'Q', hx, crownY - 2.6, hx + rx, crownY - 1.6, 'Q', hx, crownY - 0.8, hx - rx, crownY - 1.6, 'Z'))); break;
    case 'grad': headX.push(P('#26262c', hatTop(1.25)), P('#1d1d22', D('M', hx - rx - 1.6, crownY + 0.2, 'L', hx + rx + 1.6, crownY - 0.4, 'L', hx + rx + 1.6, crownY + 0.3, 'L', hx - rx - 1.6, crownY + 0.9, 'Z')),
      S('#d4a72c', 0.3, D('M', hx + rx + 1.2, crownY - 0.2, 'L', hx + rx + 1.4, crownY + 3))); break;
    case 'wizard': case 'witch': case 'party': {
      const c = a.hat === 'witch' ? '#2f2a3a' : hatC + '.0', h = a.hat === 'party' ? 4.6 : 7;
      headX.push(P(c, D('M', hx - rx * 0.85, hy - ry * 0.7, 'L', hx - 0.6, crownY - h, 'L', hx + rx * 0.85, hy - ry * 0.75, 'Z')));
      if (a.hat !== 'party') headX.push(P(a.hat === 'witch' ? '#26222e' : hatC + '.1', brim(1.8, 2, 0.7, 0)));
      break;
    }
    case 'horns': case 'antlers': case 'bunny': {
      const c = a.hat === 'horns' ? '#d63a3a' : a.hat === 'antlers' ? '#8a5a3a' : '#f6f4ef';
      if (a.hat === 'antlers') headX.push(S(c, 0.45, D('M', hx - 0.6, crownY + 0.6, 'Q', hx - 1.2, crownY - 2, hx - 2.4, crownY - 3.6, 'M', hx - 1.4, crownY - 2, 'L', hx - 0.2, crownY - 3.2, 'M', hx + 0.8, crownY + 0.6, 'Q', hx + 1.2, crownY - 2, hx + 2.2, crownY - 3.4)));
      else { const h = a.hat === 'bunny' ? 5.4 : 1.8; headX.push(P(c, D('M', hx - 1.2, crownY + 0.8, 'Q', hx - 1.8, crownY - h, hx - 0.6, crownY - h - 0.2, 'Q', hx - 0.1, crownY - h * 0.5, hx - 0.2, crownY + 0.6, 'Z')), P(c, D('M', hx + 0.6, crownY + 0.8, 'Q', hx + 0.8, crownY - h, hx + 1.8, crownY - h + 0.2, 'Q', hx + 1.6, crownY - h * 0.5, hx + 1.4, crownY + 0.8, 'Z'))); }
      break;
    }
    case 'flowers': for (let i = 0; i < 5; i++) { const t = i / 4, x = hx - rx * 0.9 + t * rx * 1.8, y = crownY + 0.8 - Math.sin(t * Math.PI) * 0.9; headX.push(P(['#f6a5c0', '#fff4f8', '#f6d35e', '#c9a7f0', '#f6a5c0'][i], D('M', x - 0.55, y, 'Q', x, y - 0.8, x + 0.55, y, 'Q', x, y + 0.8, x - 0.55, y, 'Z'))); } break;
    case 'bearbeanie': headX.push(P(hatC + '.0', D('M', hx - rx * 0.7, crownY + 0.2, 'Q', hx - rx * 0.8, crownY - 1.4, hx - rx * 0.2, crownY - 1.2, 'Q', hx - rx * 0.1, crownY, hx - rx * 0.7, crownY + 0.2, 'Z'))); break;
    case 'trapper': headX.push(P(hatC + '.0', D('M', hx - rx * 0.45, hy - ry * 0.5, 'L', hx + rx * 0.2, hy - ry * 0.5, 'L', hx + rx * 0.1, hy + ry * 0.5, 'Q', hx - rx * 0.2, hy + ry * 0.75, hx - rx * 0.5, hy + ry * 0.45, 'Z')), P('#e8dcc4', D('M', hx - rx * 0.5, hy + ry * 0.3, 'Q', hx - rx * 0.2, hy + ry * 0.8, hx + rx * 0.1, hy + ry * 0.4, 'L', hx + rx * 0.1, hy + ry * 0.55, 'Q', hx - rx * 0.2, hy + ry * 0.95, hx - rx * 0.55, hy + ry * 0.45, 'Z'))); break;
    default: break;
  }
  /* headphones over the ear */
  if (['over', 'gaming', 'cat', 'muffs'].includes(a.headphones)) headX.push(S('@' + a.headphonesCol + '.0', 0.5, D('M', hx - 0.6, hy - 1.2, 'Q', hx - 1.2, hy - ry * 1.62, hx + rx * 0.45, hy - ry * 1.3)),
    P('@' + a.headphonesCol + '.0', D('M', hx - 1.2, hy - 0.9, 'Q', hx - 1.2, hy - 1.6, hx - 0.3, hy - 1.6, 'Q', hx + 0.6, hy - 1.6, hx + 0.6, hy - 0.9, 'L', hx + 0.6, hy + 0.9, 'Q', hx + 0.6, hy + 1.6, hx - 0.3, hy + 1.6, 'Q', hx - 1.2, hy + 1.6, hx - 1.2, hy + 0.9, 'Z')));

  /* the torso: layers over the top, the front of the chest */
  // the torso: the first shape in the top's colour after the neck (a skirt in the same colour comes before the neck)
  const fillOf = (x) => (Array.isArray(x) ? x[0] : x && x.f), dOf = (x) => (Array.isArray(x) ? x[1] : x && x.d);
  const neckIdx = f.body.findIndex((x, i) => i >= (f.at ? f.at.farArm[1] : 0) && fillOf(x) === '@' + sk + '.1');
  const topFill = '@' + ((fo.top && fo.top.col) || 'pfTop') + '.0';
  const torsoIdx = f.body.findIndex((x, i) => i > neckIdx && fillOf(x) === topFill && typeof dOf(x) === 'string');
  const torsoD = torsoIdx >= 0 ? dOf(f.body[torsoIdx]) : null;
  if (torsoD && ['gilet', 'hivis'].includes(a.outer)) {
    const c = a.outer === 'hivis' ? '#d8f03a' : '@pfOut.0';
    torso.push(P(c, torsoD), P(a.outer === 'hivis' ? '#b8d020' : '@pfOut.1', D('M', xb + 0.2, ys + 1, 'Q', xb - 0.2, -40, xb + 0.4, T.hem || -30.4, 'L', xb + 1.8, T.hem || -30.4, 'Q', xb + 1.4, -40, xb + 1.6, ys + 2, 'Z'), 0.7));
    if (a.outer === 'hivis') for (const y of [-42, -36]) torso.push(P('#d6dbe0', D('M', xb + 0.2, y, 'L', xf + bel * 0.6, y - 0.2, 'L', xf + bel * 0.6, y + 0.9, 'L', xb + 0.2, y + 1.1, 'Z')));
    else for (const y of [-45, -40, -35]) torso.push(det(S('@pfOut.3', 0.3, D('M', xb + 0.4, y, 'Q', 0, y + 0.6, xf + bel * 0.4, y - 0.2), 0.6)));
  }
  if (a.outer === 'apron') torso.push(P('@pfOut.0', D('M', 0.8 + lean, ys + 4.6, 'L', xf + 0.3 + bel * 0.4, ys + 4.6, 'L', xf + 0.5 + bel, -27.4, 'L', 0.4, -27.4, 'Z')), S('@pfOut.1', 0.35, D('M', 1 + lean, ys + 4.6, 'L', -0.2 + lean, ys - 0.2)));
  if (a.outer === 'cape') back.push(P('@pfOut.0', D('M', -1.4 + lean, ys - 0.6, 'Q', xb - 3.6, ys + 6, xb - 5.4, -26, 'L', xb + 1.6, -25.4, 'Q', xb + 0.8, ys + 8, 1 + lean, ys + 0.4, 'Z')), P('@pfIn.0', D('M', xb - 5.4, -26, 'L', xb + 1.6, -25.4, 'L', xb + 1.4, -26.4, 'L', xb - 4.6, -27, 'Z')));
  if ((a.bottom === 'dungarees' && !dressDef) || a.dress === 'pinafore') {
    const c = a.dress === 'pinafore' ? '@pfDress' : '@pfBot';
    torso.push(P(c + '.0', D('M', 0.6, -41.4, 'L', xf + 0.1 + bel * 0.5, -41.6, 'L', xf + 0.3 + bel, T.hem || -30.4, 'L', 0.4, T.hem || -30.4, 'Z')), S(c + '.1', 0.55, D('M', 1.2, -41.2, 'Q', 0.2, ys + 2, -1.4 + lean, ys + 0.2)),
      P(metal + '.0', D('M', 1, -41.6, 'L', 2, -41.6, 'L', 2, -40.6, 'L', 1, -40.6, 'Z')));
  }
  if (a.necklace !== 'none' && !(a.necklace === 'choker' && (a.top === 'turtle' || a.dress === 'knit'))) {
    const nx = hx - 0.3, ny = ys - 0.4;
    torso.push(S(a.necklace === 'beads' ? '@red.0' : a.necklace === 'pearls' ? '#f3eee3' : metal + '.0', a.necklace === 'pearls' || a.necklace === 'beads' ? 0.45 : 0.3,
      a.necklace === 'choker' ? D('M', nx - 1.2, hy + ry * 0.95, 'L', nx + 1.5, hy + ry * 1.05) : D('M', nx - 1.4, ny - 0.4, 'Q', nx, ny + 2.4, xf - 0.6 + lean * 0.5, ny + 2.2)));
    if (['pendant', 'locket', 'medal', 'layered'].includes(a.necklace)) torso.push(P(a.necklace === 'medal' ? '#d4a72c' : metal + '.0', D('M', xf - 1.2 + lean * 0.5, ny + 2.2, 'Q', xf - 0.6, ny + 1.6, xf - 0.1 + lean * 0.5, ny + 2.4, 'Q', xf - 0.6, ny + 3.3, xf - 1.2 + lean * 0.5, ny + 2.2, 'Z')));
  }
  if (a.tie !== 'none') {
    const tc = '@' + a.tieCol;
    if (a.tie === 'bow') torso.push(P(tc + '.0', D('M', 1.4 + lean, ys + 0.2, 'L', 2.8 + lean, ys - 0.5, 'L', 2.8 + lean, ys + 1, 'Z')));
    else if (a.tie === 'lanyard') torso.push(S(tc + '.0', 0.3, D('M', 1 + lean, ys, 'L', xf - 0.8, ys + 7)), P('#fbfaf7', D('M', xf - 1.6, ys + 7, 'L', xf - 0.1 + bel * 0.3, ys + 7, 'L', xf + bel * 0.3, ys + 9.4, 'L', xf - 1.5, ys + 9.4, 'Z')));
    else torso.push(P(tc + '.0', D('M', 1.6 + lean, ys + 0.4, 'L', 2.6 + lean, ys + 0.2, 'L', xf - 0.2 + bel * 0.3, ys + (a.tie === 'skinny' ? 10 : 9.4), 'L', xf - 1 + bel * 0.3, ys + (a.tie === 'skinny' ? 10.2 : 9.8), 'Z')));
  }
  if (a.pin !== 'none') torso.push(P({ heart: '#e8475e', rainbow: '#3b82f6', flower: '#ffffff', leaf: '#4caf6a', planet: '#f08a3c', coffee: '#ffffff', bee: '#f6c945', owl: '#8a5a3a', flame: '#f08a3c' }[a.pin] || '#f6c945',
    D('M', xf - 1.8 + lean * 0.5, ys + 4.4, 'Q', xf - 1.3, ys + 3.8, xf - 0.8 + lean * 0.5, ys + 4.4, 'Q', xf - 1.3, ys + 5, xf - 1.8 + lean * 0.5, ys + 4.4, 'Z')));
  if (a.bottom === 'pleated' && !dressDef && a.dress !== 'pinafore') for (const x of [-2.6, -0.8, 1, 2.8]) torso.push(det(S('@pfBot.3', 0.3, D('M', x, -30, 'L', x + (x > 0 ? 0.6 : -0.6), -17.8), 0.45)));
  if (a.bag === 'bumbag') torso.push(P('@' + a.bagCol + '.0', D('M', xf - 2.4, -41, 'Q', xf + 1.6, -41.4, xf + 1.4, -38.8, 'Q', xf - 0.6, -37.6, xf - 2.4, -38.6, 'Z')));
  /* the watch on the near wrist */
  if (a.watch !== 'none' && f.hands && f.hands.near) {
    // the wrist sits 1.3 back from the hand's centre, towards the shoulder (the forearm's line, near enough)
    const hn = f.hands.near, shn = f.shoulders && f.shoulders.near ? f.shoulders.near : [hn[0], hn[1] - 10], dl = Math.hypot(hn[0] - shn[0], hn[1] - shn[1]) || 1;
    const wx = hn[0] - (hn[0] - shn[0]) / dl * 1.3, wy = hn[1] - (hn[1] - shn[1]) / dl * 1.3;
    if (a.watch === 'bangle') arm.push(S(metal + '.0', 0.3, D('M', wx - 0.8, wy - 0.4, 'L', wx + 0.8, wy + 0.2)), S(metal + '.2', 0.3, D('M', wx - 0.8, wy + 0.1, 'L', wx + 0.8, wy + 0.7)));
    else arm.push(S(a.watch === 'sport' ? '@coral.0' : a.watch === 'smart' ? '@ink.0' : '@tan.1', 0.65, D('M', wx - 0.8, wy - 0.3, 'L', wx + 0.75, wy + 0.3)),
      P(a.watch === 'smart' ? '@ink.0' : metal + '.0', D('M', wx - 0.3, wy - 0.6, 'L', wx + 0.5, wy - 0.3, 'L', wx + 0.3, wy + 0.5, 'L', wx - 0.5, wy + 0.2, 'Z')));
  }

  /* legs: hems, pockets, turn-ups; shoes the builder does not draw */
  const leg = (k, out) => {
    const bc = '@pfBot.' + k, ss = '@pfShoe.' + k, skn = '@' + sk + '.' + k;
    if (!dressDef && a.dress !== 'pinafore') {
      if (a.bottom === 'wide') out.push({ f: bc, d: D('M', -2.1, -13, 'L', 2.4, -13, 'L', 3.4, -2.2, 'L', -3.1, -2.2, 'Z') });
      if (a.bottom === 'cargo') out.push({ f: '@pfBot.' + (k + 1), d: D('M', -2.6, -24.6, 'L', 0.2, -24.6, 'L', 0.2, -20.8, 'L', -2.6, -20.8, 'Z'), op: 0.9 }, det(S('@pfBot.3', 0.3, D('M', -2.6, -23.6, 'L', 0.2, -23.6), 0.7)));
      if (a.bottom === 'chinos') out.push(det({ f: '@pfBot.2', d: D('M', -1.9, -4.2, 'L', 2.1, -4.2, 'L', 2, -2.6, 'L', -1.8, -2.6, 'Z'), op: 0.7 }));
      if (a.bottom === 'jeans' && a.shoes === 'heels') out.push(det({ f: bc, d: D('M', -1.8, -4, 'L', 2, -4, 'L', 1.9, -3, 'L', -1.7, -3, 'Z') }));
    }
    if (_PF_FIG_SHOE_OWN.has(a.shoes)) return;
    switch (a.shoes) {
      case 'hightops': out.push({ f: ss, d: D('M', -2.4, 0.2, 'L', -2.6, -6.4, 'Q', -1.4, -7, 1.7, -6.6, 'L', 1.9, -3.6, 'Q', 3.7, -3.1, 5.2, -1.7, 'Q', 6.1, -1, 5.8, 0.2, 'Z') },
        { f: '@sole.0', d: D('M', -2.4, -0.8, 'L', 5.9, -0.8, 'L', 5.8, 0.2, 'L', -2.4, 0.2, 'Z') }, { f: '#f4f2ee', d: D('M', 3.6, -2.6, 'Q', 5.2, -1.8, 5.8, -0.8, 'L', 3.6, -0.8, 'Z') },
        det(S('#f4f2ee', 0.3, D('M', 0, -6, 'L', 1.4, -5.6, 'M', 0.2, -4.8, 'L', 1.6, -4.4), 0.9))); break;
      case 'platforms': out.push({ f: ss, d: D('M', -2.3, -1, 'L', -2.5, -3.6, 'Q', -2.2, -4.6, -0.7, -4.6, 'L', 1.5, -4.5, 'Q', 3.5, -4.1, 5.1, -2.8, 'Q', 6, -2.1, 5.7, -1, 'Z') },
        { f: '@sole.0', d: D('M', -2.5, -1.4, 'L', 6, -1.4, 'L', 6.1, 0.3, 'L', -2.5, 0.3, 'Z') }, det(S('@sole.3', 0.3, D('M', -2.4, -0.5, 'L', 6, -0.5), 0.6))); break;
      case 'loafers': case 'flats': {
        const low = a.shoes === 'flats';
        out.push({ f: skn, d: D('M', -2, -2.8, 'L', 1.2, -2.8, 'Q', 3.4, -2.4, 4.8, -1.4, 'L', 1, -1.4, 'Z') });
        out.push({ f: ss, d: low ? D('M', -2.2, 0.2, 'L', -2.2, -1.9, 'Q', 0, -2.1, 2.6, -1.9, 'Q', 4.8, -1.6, 5.7, -0.6, 'L', 5.6, 0.2, 'Z') : D('M', -2.3, 0.2, 'L', -2.4, -2.5, 'Q', -2, -3.2, -0.6, -3.1, 'L', 1.6, -2.9, 'Q', 3.6, -2.5, 5.2, -1.5, 'Q', 6, -0.9, 5.7, 0.2, 'Z') });
        out.push({ f: '@pfShoe.3', d: D('M', -2.3, -0.4, 'L', 5.8, -0.4, 'L', 5.7, 0.2, 'L', -2.3, 0.2, 'Z') });
        if (low) out.push(det({ f: '@pfShoe.3', d: D('M', 3.6, -2.2, 'Q', 4.2, -2.8, 4.6, -2, 'Q', 4.2, -1.6, 3.6, -2.2, 'Z') }));
        else out.push(S('@pfShoe.3', 0.5, D('M', 1.4, -2.9, 'L', 2.4, -1.8)));
        break;
      }
      case 'heels': out.push({ f: skn, d: D('M', -2, -2.8, 'L', 1, -2.8, 'Q', 3.2, -2.2, 4.6, -0.8, 'L', 2.4, -0.6, 'Q', 0.6, -1.8, -1.8, -2, 'Z') },
        { f: ss, d: D('M', -2.1, -1.6, 'L', -2.1, -3.2, 'Q', -1, -2.6, 0.2, -2.3, 'L', 0.4, -1.6, 'Q', 2.4, -1.2, 4, -0.2, 'L', 5.9, -0.1, 'Q', 6.1, 0.3, 5.4, 0.3, 'L', 2.6, 0.3, 'Q', 0.8, -0.8, -1, -1.2, 'Z') },
        { f: '@pfShoe.3', d: D('M', -2.1, -1.4, 'L', -1.1, -1.2, 'L', -1.5, 0.3, 'L', -1.9, 0.3, 'Z') }); break;
      case 'wellies': out.push({ f: ss, d: D('M', -2.4, 0.2, 'L', -2.6, -11.6, 'L', 2.3, -11.6, 'L', 2.1, -3.6, 'Q', 3.9, -3.1, 5.4, -1.7, 'Q', 6.2, -0.9, 5.8, 0.2, 'Z') },
        { f: '@pfShoe.2', d: D('M', -2.6, -11.6, 'L', 2.3, -11.6, 'L', 2.3, -10.4, 'L', -2.6, -10.4, 'Z') }, { f: '@ink.0', d: D('M', -2.4, -0.6, 'L', 5.9, -0.6, 'L', 5.8, 0.2, 'L', -2.4, 0.2, 'Z'), op: 0.8 },
        det(S('#ffffff', 0.4, D('M', 1.2, -9.6, 'L', 1.1, -4.4), 0.3))); break;
      case 'chelsea': case 'hiking': out.push({ f: ss, d: D('M', -2.4, 0.2, 'L', -2.4, -7.4, 'L', 1.7, -7.4, 'L', 1.9, -3.6, 'Q', 3.8, -3.1, 5.4, -1.7, 'Q', 6.2, -0.9, 5.8, 0.2, 'Z') });
        if (a.shoes === 'chelsea') out.push({ f: '@pfShoe.3', d: D('M', -0.9, -7.4, 'L', 0.5, -7.4, 'L', 0.3, -4.2, 'L', -0.6, -4.2, 'Z'), op: 0.85 }, { f: '@pfShoe.3', d: D('M', -2.4, -0.4, 'L', 5.8, -0.4, 'L', 5.8, 0.2, 'L', -2.4, 0.2, 'Z') });
        else out.push({ f: '@chocolate.0', d: D('M', -2.5, -0.9, 'L', 5.9, -0.9, 'L', 5.9, 0.3, 'L', -2.5, 0.3, 'Z') }, S('@red.0', 0.35, D('M', 0.6, -6.8, 'L', 1.8, -6.4, 'M', 0.8, -5.4, 'L', 2, -5, 'M', 1, -4, 'L', 2.4, -3.6)),
          det(S('@pfShoe.3', 0.3, D('M', -2.4, -7, 'L', 1.7, -7), 0.6)));
        break;
      case 'slippers': out.push({ f: ss, d: D('M', -2.6, 0.3, 'Q', -2.9, -3.1, -0.2, -3.6, 'Q', 3.6, -3.6, 5.9, -1.4, 'Q', 6.7, 0.2, 5.4, 0.3, 'Z') },
        { f: '@pfShoe.2', d: D('M', -2.6, -2.6, 'Q', 0, -4.4, 3.2, -3.2, 'Q', 0, -3.2, -2.6, -1.6, 'Z'), op: 0.85 }, det({ f: '@pfShoe.3', d: D('M', -2.6, -0.2, 'L', 5.8, -0.2, 'L', 5.6, 0.3, 'L', -2.6, 0.3, 'Z'), op: 0.6 })); break;
      default: break;
    }
  };
  // a shoe the builder does not draw: take its trainer off first (its shapes paint with pfShoe or the sole)
  if (!_PF_FIG_SHOE_OWN.has(a.shoes)) for (const L of [f.legA, f.legB]) if (Array.isArray(L)) for (let i = L.length - 1; i >= 0; i--) {
    const x = L[i], paints = Array.isArray(x) ? [x[0]] : x ? [x.f, x.s] : [];
    if (paints.some(p => typeof p === 'string' && /^@(pfShoe|sole)\./.test(p))) L.splice(i, 1);
  }
  leg(0, legA); leg(1, legB);
  if (Array.isArray(f.legA)) f.legA.push(...legA);
  if (Array.isArray(f.legB)) f.legB.push(...legB);

  /* into the body, keeping the arms' ranges right: back pieces first, the torso's and the hair's after the torso
     (before the head), the head's before the near arm, the watch with the near arm (it swings with it) */
  const at = f.at ? { farArm: f.at.farArm.slice(), nearArm: f.at.nearArm.slice() } : null;
  const ins = (idx, list) => {
    if (!list.length) return;
    f.body.splice(idx, 0, ...list);
    if (at) for (const r of [at.farArm, at.nearArm]) { if (idx <= r[0]) { r[0] += list.length; r[1] += list.length; } else if (idx < r[1]) r[1] += list.length; }
  };
  if (at && arm.length) { f.body.splice(at.nearArm[1], 0, ...arm); at.nearArm[1] += arm.length; } else f.body.push(...arm);
  ins(at ? at.nearArm[0] : f.body.length, headX);
  let end = -1;
  if (torsoIdx >= 0) end = f.body.findIndex((x, i) => i > torsoIdx && x && /^@(sk|hr)\d\./.test(String(Array.isArray(x) ? x[0] : x.f || x.s || '')));
  ins(end >= 0 ? end : at ? at.nearArm[0] : f.body.length, torso.concat(hairX));
  ins(0, back);
  if (at) f.at = at;
  return f;
}

/** A fabric pattern clipped to one garment path of the figure (the profile's SVG only: scenes draw no patterns). */
function _pfFigPattern(kind, d, id, pc, base) {
  const nums = String(d).match(/-?\d*\.?\d+/g);
  if (!nums || nums.length < 4) return '';
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) { const x = Number(nums[i]), y = Number(nums[i + 1]); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (!Number.isFinite(x0) || x1 - x0 > 40 || y1 - y0 > 60) return '';
  const r = _pfRand(kind.length * 7 + 3);
  const rect = (x, y, w, h, f, op) => `<rect x="${_pfN(x)}" y="${_pfN(y)}" width="${_pfN(w)}" height="${_pfN(h)}" fill="${f}"${_pfOp(op)}/>`;
  let g = '';
  const X0 = x0 - 1, X1 = x1 + 1, Y0 = y0 - 1, Y1 = y1 + 1;
  switch (kind) {
    case 'stripes': case 'rugby': for (let y = Y0 + 0.6; y < Y1; y += 1.5) g += rect(X0, y, X1 - X0, 0.65, pc[0]); break;
    case 'pinstripe': for (let x = X0; x < X1; x += 1.1) g += rect(x, Y0, 0.2, Y1 - Y0, pc[0], 0.8); break;
    case 'gingham': case 'tartan': for (let x = X0; x < X1; x += 1.6) g += rect(x, Y0, 0.8, Y1 - Y0, pc[0], 0.42); for (let y = Y0; y < Y1; y += 1.6) g += rect(X0, y, X1 - X0, 0.8, pc[0], 0.42);
      if (kind === 'tartan') for (let x = X0 + 1.1; x < X1; x += 3.2) g += rect(x, Y0, 0.15, Y1 - Y0, base[3], 0.6); break;
    case 'polka': case 'floral': case 'stars': case 'hearts': case 'snow': case 'bats': case 'leopard': case 'tropical':
      for (let j = 0, y = Y0 + 0.8; y < Y1; y += 1.9, j++) for (let x = X0 + (j % 2) * 0.95; x < X1; x += 1.9) g += _pfC(x + (kind === 'polka' ? 0 : (r() - 0.5) * 0.6), y, kind === 'leopard' ? 0.45 : 0.32, kind === 'floral' ? (j % 2 ? pc[0] : '#f6d35e') : kind === 'leopard' ? '#2a2124' : pc[0], kind === 'leopard' ? 0.7 : 1);
      break;
    case 'zigzag': for (let y = Y0 + 1; y < Y1; y += 1.8) { let s = `M${_pfN(X0)} ${_pfN(y)}`; for (let x = X0, k = 0; x < X1; x += 0.9, k++) s += ` L${_pfN(x + 0.9)} ${_pfN(y + (k % 2 ? 0 : -0.6))}`; g += _pfS(s, pc[0], 0.35); } break;
    case 'block': g += rect(X0, (Y0 + Y1) / 2 + 2, X1 - X0, Y1, pc[0]); break;
    case 'raglan': break;
    case 'tiedye': { const cols = [pc[0], '#f06a9a', '#f6d35e', '#3fb4c8']; for (let i = 0, rr = 14; rr > 1; rr -= 1.6, i++) g += _pfC((X0 + X1) / 2, Y1, rr, cols[i % 4], 0.7); break; }
    case 'camo': { const cols = [pc[0], base[3], _pfMix(pc[0], base[0], 0.5)]; for (let i = 0; i < 18; i++) g += _pfE(X0 + r() * (X1 - X0), Y0 + r() * (Y1 - Y0), 1 + r() * 1.1, 0.6 + r() * 0.6, cols[i % 3], 0.9, r() * 180); break; }
    default: return '';
  }
  return g ? `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${g}</g>` : '';
}
