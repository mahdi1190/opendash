/* ============================================================
   GARDEN, FISH: FAMILIES AND BODY PLANS. PURE: strings in, strings out. The owner, 1 Nov 2026: "they all look way too similar. They need to have unique shapes, sizes, groups etc, and have cool
   features and animations when you hold them, catch them etc, all of that, and all synced up."

   Every fish belongs to a family (gardenFishFamily, from its catalogue look and its id: nothing is saved, and ids do not change). A family is a body plan: one row of _GCP_SIDE when it is seen from
   the side (a height profile, fins, tail, mouth), or a drawer of _GCP_OWN when it is another animal altogether. Within a family a seeded hand varies proportions, fins and marks, the look's own
   t / d / m / x fields choose tail, back fin, mouth and extras, and the rarity and the name add features (_gcpTraits). Add a family: a row and a line in gardenFishFamily; the moves are in 94-garden-fish3-creatures.css.

     gardenFishFamily(def)          its family word (also a class on the drawing: gcf-<family>)
     gardenFishFrame(def, look)     where the body is, for the marks a variant wears (94-garden-fish-1vart.js)
     gardenFishShadow(def, L, ...)  its shadow in the water (94-garden-fish-6school.js)
     gardenCreatureFamily, gardenCreatureSizeK, gardenCreatureHoldK, gardenCreatureMomentFx   what the catch moment and the book need, for fish and bugs

   Parts that move carry a class and sit in a group whose 0,0 is their joint (a CSS transform turns them about it): gcp-tail, gcp-fin, gcp-seg, gcp-bell, gcp-tent, gcp-claw, gcp-leg, gcp-lure, gcp-jaw, gcp-whisk, gcp-glow.
   ============================================================ */
const _GCP_FAM_BY_SHAPE = Object.freeze({ fancy: 'fancy', koi: 'koi', carp: 'carp', flat: 'bream', pike: 'pike', eel: 'eel', cat: 'catfish', sturgeon: 'sturgeon', angler: 'angler', crayfish: 'crayfish', torpedo: 'salmon', disc: 'disc', tall: 'angel', chunky: 'bass', needle: 'gar', loach: 'loach', goby: 'goby', herring: 'herring', puffer: 'puffer', hump: 'hump', paddle: 'paddle', shark: 'shark', mola: 'mola', round: 'perch', ray: 'ray', seahorse: 'seahorse', jelly: 'jelly', crab: 'crab', turtle: 'turtle', newt: 'newt', squid: 'squid', shrimp: 'shrimp', skel: 'skel' });
const _GCP_FAM_BY_ID = Object.freeze({
  'silver-arowana-pup': 'sail', 'silver-mullet': 'sail', 'common-shad': 'sail', arapaima: 'sail', 'the-frost-maiden': 'sail', 'spawning-silverside': 'sail',
  'bluefin-giant': 'tuna', 'striped-bass': 'tuna', tigerfish: 'tuna', 'golden-dorado': 'tuna', 'meteor-fish': 'tuna', wanderer: 'tuna', 'vampire-fish': 'tuna',
  'paper-fish': 'flatfish', 'river-limpet-fish': 'flatfish', 'pebble-fish': 'flatfish', 'sand-goby': 'flatfish', 'weed-goby': 'flatfish', 'new-moon-bream': 'flatfish', 'moon-gazer': 'flatfish',
  moonfish: 'disc', 'sunburst-fish': 'disc', 'wishing-fish': 'disc',
  coelacanth: 'lobe', lungfish: 'lobe', bowfin: 'snakehead', snakehead: 'snakehead', 'giant-snakehead': 'snakehead', 'weather-loach': 'loach',
  lionfish: 'lion', 'frog-mouth': 'angler', 'lily-sprite': 'fancy', 'reed-pipefish': 'pipe',
  guppy: 'minnow', swordtail: 'minnow', mosquitofish: 'minnow', 'harlequin-rasbora': 'minnow',
  crappie: 'perch', 'black-crappie': 'perch',
  'lake-lamprey': 'lamprey', 'sea-lamprey': 'lamprey', oarfish: 'oar', 'silver-oarlet': 'oar',
});
function gardenFishFamily(def) {
  if (!def || !def.look) return '';
  const o = _GCP_FAM_BY_ID[def.id]; if (o) return o;
  const s = def.look.s, top = def.cm ? def.cm[1] : 30;
  if (s === 'slim') return /trout|char|salmon|grayling|whitefish|ghost/.test(def.id) ? 'salmon' : top <= 30 ? 'minnow' : 'chub';
  if (s === 'needle' && top <= 14) return 'goby';
  return _GCP_FAM_BY_SHAPE[s] || '';
}
/* the side-on plans. L length, H half-height, top/bot the back and the belly at seven stations from tail root to snout (fractions of H), tail its kind, tl its length, dor [from, to, height, kind] (fractions of L from the tail),
   ana the same, pec the fin behind the gill, mouth, eye [radius, where along], wh whiskers, mk the marks it has when the catalogue names none, nose how far the snout sits below the middle (of H), lock: the plan's tail whatever the look says */
const _GCP_SIDE = Object.freeze({
  minnow: { L: 54, H: 8.5, top: [.2, .5, .82, 1, .95, .68, .14], bot: [.2, .46, .74, .92, .88, .6, .14], tail: 'fork', tl: 13, dor: [[.42, .58, 7, 'soft']], ana: [[.2, .34, 5]], pec: .7, mouth: 'smile', eye: [3.4, .86], mk: ['stripe', 'stripe', 'speckle'] },
  herring: { L: 58, H: 10.5, top: [.18, .42, .66, .8, .84, .7, .1], bot: [.18, .62, 1, 1.14, 1.02, .72, .18], tail: 'fork', tl: 16, dor: [[.44, .56, 8, 'soft']], ana: [[.14, .26, 4]], pec: .7, mouth: 'smile', eye: [4.6, .84], nose: -.1, mk: ['speckle', 'stripe'] },
  chub: { L: 62, H: 13, top: [.22, .55, .84, 1, 1, .82, .3], bot: [.22, .5, .78, .96, 1, .82, .3], tail: 'fork', tl: 14, dor: [[.42, .58, 9, 'soft']], ana: [[.2, .32, 6]], pec: 1, mouth: 'under', eye: [3.4, .85], nose: .1, mk: ['scales', 'bars', 'stripe'] },
  salmon: { L: 66, H: 13.5, top: [.2, .5, .82, 1, .98, .72, .1], bot: [.2, .46, .72, .9, .9, .66, .2], tail: 'lunate', tl: 13, dor: [[.48, .62, 10, 'soft'], [.2, .25, 4, 'adip']], ana: [[.16, .28, 6]], pec: 1, mouth: 'kype', eye: [3.2, .86], mk: ['spots', 'speckle', 'spots'] },
  tuna: { L: 68, H: 16, top: [.08, .4, .86, 1.04, 1, .68, .08], bot: [.08, .36, .8, 1, .94, .6, .1], tail: 'crescent', tl: 12, lock: 1, dor: [[.52, .66, 13, 'spiny'], [.36, .44, 12, 'blade']], ana: [[.3, .38, 11, 'blade']], pec: 1.3, mouth: 'smile', eye: [3.6, .84], finlets: 1, mk: ['stripe', 'bars'] },
  sail: { L: 66, H: 11, top: [.22, .5, .78, .92, .94, .7, .1], bot: [.22, .5, .8, .98, .96, .66, .1], tail: 'fork', tl: 14, dor: [[.26, .76, 25, 'sail']], ana: [[.14, .34, 6]], pec: .9, mouth: 'smile', eye: [3.4, .87], mk: ['stripe', 'scales'] },
  perch: { L: 48, H: 18, top: [.2, .52, .9, 1.08, 1.02, .68, .12], bot: [.2, .46, .76, .9, .86, .54, .12], tail: 'fan', tl: 13, dor: [[.5, .72, 10, 'spiny'], [.26, .48, 8, 'soft']], ana: [[.18, .34, 7]], pec: 1, mouth: 'smile', eye: [4, .84], red: 1, mk: ['bars', 'bars', 'spots'] },
  bream: { L: 50, H: 24, top: [.16, .5, .9, 1.08, .98, .55, .08], bot: [.16, .54, .92, 1.04, .82, .42, .1], tail: 'fork', tl: 15, dor: [[.42, .58, 9, 'soft']], ana: [[.1, .46, 8]], pec: .8, mouth: 'under', eye: [3.6, .86], nose: .22, mk: ['scales', 'scales', 'bars'] },
  hump: { L: 56, H: 22, top: [.2, .5, .86, 1.12, 1.22, .72, .08], bot: [.2, .44, .66, .78, .74, .5, .1], tail: 'fork', tl: 14, dor: [[.26, .62, 9, 'soft']], ana: [[.18, .3, 7]], pec: 1, mouth: 'under', eye: [3, .9], nose: .3, mk: ['scales', 'bars'] },
  bass: { L: 56, H: 18, top: [.24, .54, .88, 1.02, 1, .8, .24], bot: [.24, .5, .82, .98, 1, .9, .42], tail: 'round', tl: 12, dor: [[.54, .72, 10, 'spiny'], [.24, .5, 8, 'soft']], ana: [[.16, .3, 7]], pec: 1, mouth: 'big', eye: [3.8, .82], nose: .1, mk: ['stripe', 'patches', 'bars'] },
  carp: { L: 60, H: 19, top: [.26, .6, .94, 1.08, 1.04, .78, .22], bot: [.26, .52, .82, .98, .94, .68, .22], tail: 'fan', tl: 15, dor: [[.26, .68, 9, 'soft']], ana: [[.18, .28, 6]], pec: 1, mouth: 'under', eye: [3.5, .86], nose: .2, wh: 2, mk: ['scales', 'scales', 'mirror'] },
  disc: { L: 40, H: 25, top: [.3, .7, .98, 1.06, .96, .66, .1], bot: [.3, .7, .98, 1.06, .96, .62, .1], tail: 'fan', tl: 11, dor: [[.16, .78, 6, 'soft']], ana: [[.16, .7, 6]], pec: .7, mouth: 'smile', eye: [4.4, .84], mk: ['bars', 'stripe', 'speckle'] },
  angel: { L: 34, H: 18, top: [.3, .7, .98, 1.02, .9, .62, .1], bot: [.3, .7, .98, 1.02, .9, .58, .1], tail: 'lyre', tl: 11, dor: [[.3, .66, 24, 'peak']], ana: [[.3, .62, 22, 'peak']], pec: .6, mouth: 'smile', eye: [3.8, .84], mk: ['bars', 'bars', 'stripe'] },
  fancy: { L: 32, H: 20, top: [.24, .6, .96, 1.08, 1.02, .7, .2], bot: [.24, .66, 1.08, 1.2, 1.08, .7, .2], tail: 'veil', tl: 26, dor: [[.32, .72, 13, 'soft']], ana: [[.24, .38, 8]], pec: .9, mouth: 'smile', eye: [4.6, .8], bulge: 1, mk: ['patches', 'scales'] },
  goby: { L: 44, H: 10.5, top: [.2, .42, .62, .82, 1, 1.02, .34], bot: [.2, .46, .7, .9, 1, 1, .42], tail: 'round', tl: 9, dor: [[.54, .68, 8, 'spiny'], [.24, .46, 8, 'soft']], ana: [[.2, .4, 5]], pec: 1.7, mouth: 'big', eye: [4, .84], eyeUp: 1, mk: ['speckle', 'bars', 'patches'] },
  loach: { L: 66, H: 6.8, top: [.42, .74, .9, .98, 1, .95, .44], bot: [.42, .72, .88, .96, 1, .92, .4], tail: 'round', tl: 9, dor: [[.4, .52, 5, 'soft']], ana: [[.16, .24, 3.5]], pec: .5, mouth: 'under', eye: [2.4, .9], nose: .3, wh: 4, mk: ['speckle', 'bars', 'patches'] },
  pike: { L: 76, H: 10, top: [.28, .62, .9, 1, .92, .5, .16], bot: [.28, .6, .88, 1, 1, .62, .12], tail: 'fork', tl: 11, dor: [[.14, .3, 9, 'soft']], ana: [[.12, .26, 8]], pec: .9, mouth: 'duck', eye: [3, .78], mk: ['patches', 'speckle', 'bars'] },
  gar: { L: 80, H: 6.2, top: [.5, .84, 1, 1, .9, .3, .12], bot: [.5, .8, 1, 1, .9, .3, .12], tail: 'round', tl: 8, dor: [[.1, .22, 6, 'soft']], ana: [[.08, .2, 5]], pec: .5, mouth: 'beak', eye: [2.5, .64], mk: ['speckle', 'scales', 'spots'] },
  pipe: { L: 82, H: 3.4, top: [.5, .8, 1, 1, 1, .7, .3], bot: [.5, .8, 1, 1, 1, .7, .3], tail: 'fan', tl: 6, dor: [[.4, .6, 3, 'soft']], ana: [], pec: 0, mouth: 'tube', eye: [2, .86], mk: ['bars'] },
  catfish: { L: 62, H: 13, top: [.18, .46, .78, .96, 1, .9, .3], bot: [.18, .44, .78, 1, 1.1, 1, .5], tail: 'round', tl: 10, dor: [[.56, .66, 9, 'blade']], ana: [[.06, .4, 6]], pec: 1.3, mouth: 'wide', eye: [2.5, .88], nose: .3, wh: 6, mk: ['speckle', 'patches', 'mirror'] },
  sturgeon: { L: 74, H: 11.5, top: [.2, .46, .72, .9, 1, .7, .06], bot: [.2, .44, .7, .88, .9, .5, .02], tail: 'shark', tl: 15, lock: 1, dor: [[.16, .28, 8, 'blade']], ana: [[.14, .24, 5]], pec: 1.1, mouth: 'under', eye: [2.4, .76], nose: -.7, wh: 3, under: 1, scutes: 1, mk: [''] },
  paddle: { L: 50, H: 11, top: [.2, .46, .76, .96, 1, .82, .3], bot: [.2, .44, .76, .98, 1, .88, .4], tail: 'shark', tl: 12, lock: 1, dor: [[.26, .38, 8, 'blade']], ana: [[.2, .3, 5]], pec: .8, mouth: 'wide', eye: [2.4, .86], paddle: 1, mk: ['speckle', ''] },
  shark: { L: 70, H: 12.5, top: [.12, .36, .7, .96, 1, .66, .04], bot: [.12, .34, .62, .84, .92, .62, .1], tail: 'shark', tl: 16, lock: 1, dor: [[.52, .66, 15, 'blade'], [.22, .28, 5, 'blade']], ana: [[.18, .24, 4, 'blade']], pec: 1.9, pecBlade: 1, mouth: 'teeth', eye: [2.4, .84], nose: -.2, gills: 1, mk: ['', 'bars'] },
  angler: { L: 42, H: 21, top: [.14, .36, .72, .98, 1.02, .9, .46], bot: [.14, .4, .78, 1, 1.02, .94, .4], tail: 'fan', tl: 9, dor: [[.2, .42, 8, 'soft']], ana: [[.16, .3, 6]], pec: .9, mouth: 'gape', eye: [4.8, .68], lure: 1, mk: ['speckle', 'patches'] },
  mola: { L: 36, H: 25, top: [.8, .92, 1.02, 1.04, .94, .66, .16], bot: [.8, .92, 1.02, 1.04, .94, .62, .16], tail: 'clavus', tl: 6, lock: 1, dor: [[.04, .2, 22, 'blade']], ana: [[.04, .2, 20, 'blade']], pec: .7, mouth: 'tube', eye: [4, .78], mk: ['speckle', 'patches'] },
  lobe: { L: 64, H: 14, top: [.32, .62, .9, 1, 1, .84, .36], bot: [.32, .6, .88, 1, 1, .84, .36], tail: 'lobe', tl: 13, lock: 1, dor: [[.5, .6, 8, 'blade'], [.28, .36, 8, 'blade']], ana: [[.24, .32, 7, 'blade']], pec: 0, lobes: 1, mouth: 'smile', eye: [3.6, .86], mk: ['spots', 'speckle'] },
  lion: { L: 40, H: 15, top: [.24, .54, .9, 1.04, 1, .76, .2], bot: [.24, .5, .82, .96, .94, .68, .2], tail: 'fan', tl: 10, dor: [[.26, .46, 8, 'soft']], ana: [[.2, .32, 6]], pec: 0, mouth: 'big', eye: [3.8, .84], plumes: 1, mk: ['bars'] },
  snakehead: { L: 72, H: 8.6, top: [.42, .76, .92, 1, 1, .9, .44], bot: [.42, .74, .92, 1, 1, .9, .44], tail: 'round', tl: 10, dor: [[.06, .82, 6, 'crest']], ana: [[.06, .4, 4, 'crest']], pec: .8, mouth: 'big', eye: [3, .88], mk: ['patches', 'bars'] },
});
function _gcpSmooth(P) {
  const n = P.length, at = (i) => P[(i + n) % n];
  let d = `M${_gfaN(P[0][0])} ${_gfaN(P[0][1])}`;
  for (let i = 0; i < n; i++) { const a = at(i - 1), b = at(i), c = at(i + 1), e = at(i + 2); d += `C${_gfaN(b[0] + (c[0] - a[0]) / 6)} ${_gfaN(b[1] + (c[1] - a[1]) / 6)} ${_gfaN(c[0] - (e[0] - b[0]) / 6)} ${_gfaN(c[1] - (e[1] - b[1]) / 6)} ${_gfaN(c[0])} ${_gfaN(c[1])}`; }
  return d + 'Z';
}
const _gcpJoint = (x, y, cls, inner, rot, style) => `<g transform="translate(${_gfaN(x)} ${_gfaN(y)})${rot ? ` rotate(${rot})` : ''}"><g class="${cls}"${style ? ` style="${style}"` : ''}>${inner}</g></g>`;
function _gcpEdge(c) { return _gfaDk(c, 0.5); }
/** The numbers of a side-on fish: the same for its drawing and for what a variant wears on it. */
function _gcpPlan(def, look, fam) {
  const R = _GCP_SIDE[fam], rnd = _gfaRng('plan|' + def.id), j = (v, a) => v * (1 + (rnd() - 0.5) * a), K = look.k || [1, 1];
  const tail = R.lock ? R.tail : look.t || R.tail;
  let L = j(R.L, 0.14) * K[0], H = j(R.H, 0.24) * K[1], tl = j(R.tl, 0.3) * (tail === 'whip' ? 1.5 : tail === 'veil' && !/veil/.test(R.tail) ? 1.6 : 1);
  const nose = R.nose || 0, snout = R.paddle ? 20 : R.mouth === 'beak' ? 0 : 0;
  if (L + tl + snout > 88) L = 88 - tl - snout;
  const x0 = -(L + tl + snout) / 2 + tl, x1 = x0 + L;
  const w = 0.08 + rnd() * 0.08, top = R.top.map((v, i) => v * (1 + (i ? (rnd() - 0.5) * w : 0))), bot = R.bot.map((v, i) => v * (1 + (i ? (rnd() - 0.5) * w : 0)));
  const yT = (t) => { const f = Math.max(0, Math.min(5.999, t * 6)), i = Math.floor(f); return -H * (top[i] + (top[i + 1] - top[i]) * (f - i)); }, yB = (t) => { const f = Math.max(0, Math.min(5.999, t * 6)), i = Math.floor(f); return H * (bot[i] + (bot[i + 1] - bot[i]) * (f - i)); };
  const P = []; for (let i = 0; i < 7; i++) P.push([x0 + L * i / 6, -H * top[i]]);
  P.push([x1 + 1, H * nose]);
  for (let i = 6; i >= 0; i--) P.push([x0 + L * i / 6, H * bot[i]]);
  const body = _gcpSmooth(P), er = j(R.eye[0], 0.3), ex = x0 + L * j(R.eye[1], 0.03), ey = R.eyeUp ? yT(R.eye[1]) * 0.72 : yT(R.eye[1]) * 0.42;
  return { fam, R, rnd, L, H, x0, x1, tail, tl, top, bot, yT, yB, body, er, ex, ey, nose };
}
function _gcpFinPath(kind, x0, x1, base, h, out, rnd) {   // out: -1 up, 1 down
  const b0 = base(0), b1 = base(1), w = x1 - x0;
  if (kind === 'spiny') { let d = `M${_gfaN(x0)} ${_gfaN(b0)}`; const n = Math.max(3, Math.round(w / 3.4)); for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, xx = x0 + w * t, hh = h * (0.8 + 0.3 * Math.sin(t * 3.14)); d += `L${_gfaN(xx)} ${_gfaN(base(t) + out * hh)}L${_gfaN(x0 + w * (i + 1) / n)} ${_gfaN(base((i + 1) / n) + out * hh * 0.42)}`; } return d + `L${_gfaN(x1)} ${_gfaN(b1)}Z`; }
  if (kind === 'adip') return `M${_gfaN(x0)} ${_gfaN(b0)}Q${_gfaN(x0)} ${_gfaN(b0 + out * h)} ${_gfaN(x1)} ${_gfaN(b1 + out * h * 0.2)}Z`;
  if (kind === 'blade') return `M${_gfaN(x1)} ${_gfaN(b1)}Q${_gfaN(x1 - w * 0.2)} ${_gfaN(b1 + out * h * 0.6)} ${_gfaN(x0 - w * 0.25)} ${_gfaN(b0 + out * h)}Q${_gfaN(x0 + w * 0.1)} ${_gfaN(b0 + out * h * 0.4)} ${_gfaN(x0)} ${_gfaN(b0)}Z`;
  if (kind === 'peak') return `M${_gfaN(x1)} ${_gfaN(b1)}C${_gfaN(x1 - w * 0.2)} ${_gfaN(b1 + out * h * 0.5)} ${_gfaN(x0 - w * 0.3)} ${_gfaN(b0 + out * h * 0.9)} ${_gfaN(x0 - w * 0.8)} ${_gfaN(b0 + out * h * 1.1)}C${_gfaN(x0 - w * 0.2)} ${_gfaN(b0 + out * h * 0.5)} ${_gfaN(x0)} ${_gfaN(b0 + out * h * 0.3)} ${_gfaN(x0)} ${_gfaN(b0)}Z`;
  if (kind === 'sail') return `M${_gfaN(x1)} ${_gfaN(b1)}C${_gfaN(x1 - w * 0.02)} ${_gfaN(b1 + out * h * 1.05)} ${_gfaN(x0 + w * 0.6)} ${_gfaN(b0 + out * h * 1.12)} ${_gfaN(x0 + w * 0.26)} ${_gfaN(b0 + out * h * 0.96)}C${_gfaN(x0 + w * 0.12)} ${_gfaN(b0 + out * h * 0.8)} ${_gfaN(x0)} ${_gfaN(b0 + out * h * 0.3)} ${_gfaN(x0)} ${_gfaN(b0)}Z`;
  if (kind === 'crest') return `M${_gfaN(x0)} ${_gfaN(b0)}Q${_gfaN(x0 + w * 0.1)} ${_gfaN(base(0.1) + out * h)} ${_gfaN(x0 + w * 0.5)} ${_gfaN(base(0.5) + out * h)}T${_gfaN(x1)} ${_gfaN(b1)}Z`;
  return `M${_gfaN(x0)} ${_gfaN(b0)}C${_gfaN(x0 + w * 0.15)} ${_gfaN(b0 + out * h * 1.1)} ${_gfaN(x0 + w * 0.7)} ${_gfaN(b1 + out * h * 1.2)} ${_gfaN(x1)} ${_gfaN(b1)}Z`;
}
function _gcpFinRays(x0, x1, base, h, out, n) { let d = ''; for (let i = 1; i < n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = base(t); d += `M${_gfaN(x)} ${_gfaN(y)}L${_gfaN(x - 1)} ${_gfaN(y + out * h * 0.68)}`; } return d; }
/** A tail, drawn behind 0,0 (the tail root). */
function _gcpTailPath(kind, tl, H, pt) {
  const n = _gfaN, t = -tl, a = Math.max(H * 0.9, tl * 0.56);
  switch (kind) {
    case 'lunate': return `M1 ${n(-pt)}C${n(t * 0.4)} ${n(-a * 0.4)} ${n(t * 0.9)} ${n(-a * 0.8)} ${n(t)} ${n(-a)}Q${n(t * 0.74)} 0 ${n(t)} ${n(a)}C${n(t * 0.9)} ${n(a * 0.8)} ${n(t * 0.4)} ${n(a * 0.4)} 1 ${n(pt)}Z`;
    case 'crescent': { const b = a * 1.45; return `M1 ${n(-pt)}C${n(t * 0.3)} ${n(-b * 0.3)} ${n(t * 0.7)} ${n(-b * 0.7)} ${n(t)} ${n(-b)}C${n(t * 0.62)} ${n(-b * 0.32)} ${n(t * 0.62)} ${n(b * 0.32)} ${n(t)} ${n(b)}C${n(t * 0.7)} ${n(b * 0.7)} ${n(t * 0.3)} ${n(b * 0.3)} 1 ${n(pt)}Z`; }
    case 'fan': return `M1 ${n(-pt)}C${n(t * 0.5)} ${n(-a * 1.1)} ${n(t * 1.1)} ${n(-a * 0.7)} ${n(t)} 0C${n(t * 1.1)} ${n(a * 0.7)} ${n(t * 0.5)} ${n(a * 1.1)} 1 ${n(pt)}Z`;
    case 'round': return `M1 ${n(-pt)}C${n(t * 0.3)} ${n(-a * 0.8)} ${n(t)} ${n(-a * 0.7)} ${n(t)} 0C${n(t)} ${n(a * 0.7)} ${n(t * 0.3)} ${n(a * 0.8)} 1 ${n(pt)}Z`;
    case 'shark': return `M1 ${n(-pt)}L${n(t)} ${n(-a * 1.45)}Q${n(t * 0.72)} ${n(-a * 0.4)} ${n(t * 0.4)} 0L${n(t * 0.7)} ${n(a * 0.72)}L1 ${n(pt)}Z`;
    case 'lyre': return `M1 ${n(-pt)}C${n(t * 0.4)} ${n(-a * 0.7)} ${n(t * 0.8)} ${n(-a * 1.1)} ${n(t * 1.2)} ${n(-a * 1.3)}C${n(t * 0.8)} ${n(-a * 0.5)} ${n(t * 0.6)} ${n(-a * 0.14)} ${n(t * 0.66)} 0C${n(t * 0.6)} ${n(a * 0.14)} ${n(t * 0.8)} ${n(a * 0.5)} ${n(t * 1.2)} ${n(a * 1.3)}C${n(t * 0.8)} ${n(a * 1.1)} ${n(t * 0.4)} ${n(a * 0.7)} 1 ${n(pt)}Z`;
    case 'whip': return `M1 ${n(-pt)}C${n(t * 0.3)} ${n(-a * 0.8)} ${n(t * 0.6)} ${n(-a * 0.6)} ${n(t * 0.62)} 0C${n(t * 0.6)} ${n(a * 0.4)} ${n(t * 0.9)} ${n(a * 0.62)} ${n(t * 1.2)} ${n(a * 0.76)}C${n(t * 0.7)} ${n(a * 0.86)} ${n(t * 0.3)} ${n(a * 0.76)} 1 ${n(pt)}Z`;
    case 'veil': return `M1 ${n(-pt)}C${n(t * 0.3)} ${n(-a * 1.3)} ${n(t * 0.9)} ${n(-a * 1.3)} ${n(t)} ${n(-a * 0.5)}C${n(t * 0.76)} ${n(-a * 0.1)} ${n(t * 1.06)} ${n(a * 0.3)} ${n(t * 0.84)} ${n(a * 1.1)}C${n(t * 0.5)} ${n(a * 1.4)} ${n(t * 0.14)} ${n(a * 0.8)} 1 ${n(pt)}Z`;
    case 'clavus': return `M1 ${n(-H * 0.8)}Q${n(t * 1.3)} ${n(-H * 0.45)} ${n(t)} 0Q${n(t * 1.3)} ${n(H * 0.45)} 1 ${n(H * 0.8)}Z`;
    case 'lobe': return `M1 ${n(-pt)}C${n(t * 0.3)} ${n(-a * 0.9)} ${n(t * 0.7)} ${n(-a * 0.7)} ${n(t * 0.7)} ${n(-a * 0.12)}C${n(t * 1.1)} ${n(-a * 0.3)} ${n(t * 1.2)} ${n(a * 0.3)} ${n(t * 0.7)} ${n(a * 0.12)}C${n(t * 0.7)} ${n(a * 0.7)} ${n(t * 0.3)} ${n(a * 0.9)} 1 ${n(pt)}Z`;
    default: return `M1 ${n(-pt)}C${n(t * 0.4)} ${n(-a * 0.6)} ${n(t * 0.9)} ${n(-a * 1.02)} ${n(t)} ${n(-a * 0.9)}Q${n(t * 0.66)} 0 ${n(t)} ${n(a * 0.9)}C${n(t * 0.9)} ${n(a * 1.02)} ${n(t * 0.4)} ${n(a * 0.6)} 1 ${n(pt)}Z`;
  }
}
function _gcpWhisk(x, y, list, e, w) { let d = ''; for (const [dx, dy] of list) d += `M0 0q${_gfaN(dx * 0.2)} ${_gfaN(dy * 0.9)} ${_gfaN(dx)} ${_gfaN(dy)}`; return _gcpJoint(x, y, 'gcp-whisk', `<path d="${d}" stroke="${e}" stroke-width="${w || 1.1}" fill="none" stroke-linecap="round"/>`); }
function _gcpMouth(P, look, e) {
  const { R, x1, H, nose } = P, y = H * nose + H * 0.1, m = look.m || R.mouth, n = _gfaN;
  switch (m) {
    case 'under': return `<path d="M${n(x1 - 0.5)} ${n(y + H * 0.08)}q-3 2.4 -6 0.4" stroke="${e}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
    case 'big': return `<path d="M${n(x1)} ${n(y - 1)}L${n(x1 - H * 0.6 - 3)} ${n(y + H * 0.22)}" stroke="${e}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
    case 'wide': return `<path d="M${n(x1)} ${n(y)}Q${n(x1 - H * 0.5)} ${n(y + H * 0.42)} ${n(x1 - H)} ${n(y + H * 0.14)}" stroke="${e}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
    case 'kype': return `<path d="M${n(x1 + 1)} ${n(y - 1)}q1.6 3 -1 3.6M${n(x1 - 1)} ${n(y + 2.6)}q-4 1.4 -8 -0.4" stroke="${e}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    case 'duck': return `<path d="M${n(x1 + 1)} ${n(y - 0.4)}L${n(x1 - P.L * 0.16)} ${n(y + 1)}" stroke="${e}" stroke-width="1.3" stroke-linecap="round"/>`;
    case 'beak': return `<path d="M${n(x1 + 1)} ${n(y - 0.3)}L${n(x1 - P.L * 0.2)} ${n(y)}" stroke="${e}" stroke-width="1" stroke-linecap="round"/><path d="M${n(x1 - 3)} ${n(y)}l1 1.5 1 -1.5 1 1.5 1 -1.5M${n(x1 - 12)} ${n(y)}l1 1.5 1 -1.5 1 1.5 1 -1.5" stroke="#fbf8ee" stroke-width=".7" fill="none"/>`;
    case 'tube': return `<ellipse cx="${n(x1 + 0.5)}" cy="${n(y)}" rx="1.8" ry="2.6" fill="${_gfaDk(look.c, 0.3)}" stroke="${e}" stroke-width=".8"/>`;
    case 'teeth': { const w = Math.max(10, H * 1.1); let z = ''; for (let i = 0; i < 6; i++) z += `L${n(x1 - 3 - w * (i + 1) / 6)} ${n(y + H * 0.28 + (i % 2 ? 0 : 2.2))}`; return `<path d="M${n(x1 - 3)} ${n(y + H * 0.2)}${z}" stroke="#fbf8ee" stroke-width="1.1" fill="none"/><path d="M${n(x1 - 2)} ${n(y + H * 0.16)}Q${n(x1 - w * 0.6)} ${n(y + H * 0.46)} ${n(x1 - w - 3)} ${n(y + H * 0.18)}" stroke="${e}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`; }
    case 'gape': { const w = H * 1.05, h = H * 0.62, mid = y + H * 0.14; let z = ''; for (let i = 0; i < 5; i++) { const x = x1 - 1 - w * (i + 0.6) / 5.4; z += `M${n(x - 1.5)} ${n(mid - h * 0.8 * (1 - i / 7))}l1.5 3.8 1.5 -3.8M${n(x - 1.5)} ${n(mid + h * 0.8 * (1 - i / 7))}l1.5 -3.8 1.5 3.8`; } return `<g class="gcp-gape"><path d="M${n(x1 + 1)} ${n(mid - h)}Q${n(x1 - w)} ${n(mid - h * 0.5)} ${n(x1 - w - 2)} ${n(mid)}Q${n(x1 - w)} ${n(mid + h * 0.5)} ${n(x1 + 1)} ${n(mid + h)}Z" fill="#2a0e14" stroke="${e}" stroke-width="1.1"/><path d="${z}" fill="#fbf8ee" stroke="#c8b8a0" stroke-width=".4"/></g>`; }
    case 'smile': default: return `<path d="M${n(x1 - 0.6)} ${n(y + 0.3)}q-2.6 2.6 -5.6 1.2" stroke="${e}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
  }
}
/** What rarity and the name add: returns {back, top}. Horns, crowns, frills and shining lines go where the plan says the head and the back are. */
function _gcpTraits(def, look, x, y, top, len, e, rnd) {
  const n = _gfaN, c3 = look.c3 || _gfaDk(look.c, 0.4), id = def.id, r = def.rarity; let back = '', over = '';
  const king = /king|queen|emperor|duchess|crown|ironclad|bishop|maiden|grandfather/.test(id), dragon = /dragon|devil|leviathan|thunderback/.test(id), horn = /horn|knight|goblin|bull|wreck-king/.test(id);
  if (r === 'legendary' || king) over += `<path transform="translate(${n(x)} ${n(top)})" d="M-6 1l-1.6 -7 3.8 3 3 -5.6 3 5.6 3.8 -3 -1.6 7z" fill="#f4c83a" stroke="#8a6a1a" stroke-width=".7" stroke-linejoin="round"/>`;
  if (dragon) over += `<path transform="translate(${n(x)} ${n(top)})" d="M-7 1Q-9 -5 -14 -8Q-8 -6 -4 1zM2 1Q3 -6 -1 -11Q6 -6 6 1z" fill="${c3}" stroke="${e}" stroke-width=".7"/>`;
  if (horn) over += `<path transform="translate(${n(x)} ${n(top)})" d="M-3 1Q-1 -5 -5 -9Q3 -5 3 1z" fill="${_gfaLt(c3, 0.3)}" stroke="${e}" stroke-width=".7"/>`;
  if (r === 'epic' || r === 'legendary') {
    let d = ''; const lx = x - len * 0.7; for (let i = 0; i < 6; i++) d += `M${n(lx + i * len * 0.12)} ${n(1 + Math.sin(i) * 0.8)}h.1`;
    over += `<path class="gcp-glow" d="${d}" stroke="${r === 'legendary' ? '#ffe27a' : _gfaLt(c3, 0.55)}" stroke-width="2.2" stroke-linecap="round"/>`;
  }
  if (r === 'legendary') back += `<ellipse class="gcp-glow" cx="${n(x - len * 0.4)}" cy="0" rx="${n(len * 0.74)}" ry="${n(Math.abs(top) + 8)}" fill="#ffe27a" fill-opacity=".2"/>`;
  if (/ghost|lake-ghost|fog/.test(id)) back += `<path d="M${n(x - len)} -8q-6 -4 -9 2t-7 2" stroke="${_gfaLt(look.c, 0.6)}" stroke-opacity=".6" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  if (/storm|thunder|electric/.test(id)) over += `<path d="M${n(x - len * 0.2)} -7l-3 5h3.4l-3.4 6M${n(x - len * 0.6)} -6l-2.4 4.4h3l-3 5.4" stroke="#ffe25a" stroke-width="1.4" fill="none" stroke-linejoin="round" class="gcp-glow"/>`;
  if (/moon/.test(id)) over += `<path d="M${n(x - len * 0.42)} -5a5 5 0 1 0 4 9a4 4 0 1 1 -4 -9z" fill="#f4f0d0" fill-opacity=".9" class="gcp-glow"/>`;
  if (/sun|dawn|sunset/.test(id) && (r !== 'common')) { let d = ''; const cx = x - len * 0.42; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; d += `M${n(cx + Math.cos(a) * 3.2)} ${n(Math.sin(a) * 3.2)}L${n(cx + Math.cos(a) * 6)} ${n(Math.sin(a) * 6)}`; } over += `<circle cx="${n(cx)}" cy="0" r="2.8" fill="#ffe27a"/><path d="${d}" stroke="#ffb02a" stroke-width="1.1" stroke-linecap="round" class="gcp-glow"/>`; }
  if (/frost|ice|snow/.test(id)) { let d = ''; for (let i = 0; i < 3; i++) { const cx = x - len * (0.2 + i * 0.26), cy = -3 + i * 3; d += `M${n(cx - 3)} ${n(cy)}h6M${n(cx)} ${n(cy - 3)}v6M${n(cx - 2)} ${n(cy - 2)}l4 4M${n(cx + 2)} ${n(cy - 2)}l-4 4`; } over += `<path d="${d}" stroke="#eef8ff" stroke-width=".9" stroke-linecap="round"/>`; }
  if (/clockwork/.test(id)) { const cx = x - len * 0.42; let d = ''; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; d += `M${n(cx + Math.cos(a) * 3.6)} ${n(Math.sin(a) * 3.6)}L${n(cx + Math.cos(a) * 5.8)} ${n(Math.sin(a) * 5.8)}`; } over += `<circle cx="${n(cx)}" cy="0" r="3.8" fill="none" stroke="#c8a23a" stroke-width="1.3"/><path d="${d}" stroke="#c8a23a" stroke-width="1.4"/><circle cx="${n(cx)}" cy="0" r="1.1" fill="#c8a23a"/>`; }
  if (/iron|knight|ironclad/.test(id)) { let d = ''; for (let i = 0; i < 4; i++) d += `M${n(x - len * (0.2 + i * 0.2))} -7a3 7 0 0 1 0 14`; over += `<path d="${d}" stroke="#d8dce0" stroke-width="1.2" stroke-opacity=".75" fill="none"/>`; }
  return { back, over };
}
function _gcpSideFish(def, look, fam, uid) {
  const P = _gcpPlan(def, look, fam), { R, L, H, x0, x1, yT, yB, rnd, ex, ey, er, tail, tl } = P, c = look.c, c2 = look.c2 || _gfaLt(c, 0.4), c3 = look.c3 || _gfaDk(c, 0.4), e = _gcpEdge(c), n = _gfaN;
  const fin = R.red ? _gfaMix(c3, '#d8542a', 0.45) : _gfaMix(c, c3, 0.5), ray = _gfaDk(fin, 0.35), line = `stroke="${e}" stroke-width="1" stroke-linejoin="round"`, finH = 0.76 + rnd() * 0.5;
  let back = '', s = '';
  // fins behind the body: what the look asks for, or the plan's
  const dors = R.dor.map((d) => d.slice());
  if (look.d === 'sail' && fam !== 'sail') { dors[0][0] = Math.max(0.2, dors[0][0] - 0.1); dors[0][1] = Math.min(0.82, dors[0][1] + 0.1); dors[0][2] *= 1.8; dors[0][3] = 'sail'; }
  if (look.d === 'spines') dors[0][3] = 'spiny';
  if (look.d === 'low') dors[0][2] *= 0.55;
  if (look.d === 'twin' && dors.length < 2) dors.push([dors[0][0] - 0.2, dors[0][0] - 0.06, dors[0][2] * 0.7, 'soft']);
  for (const [a, b, h0, k] of dors) {
    const xa = x0 + L * a, xb = x0 + L * b, base = (t) => yT(a + (b - a) * t) + 1.2, h = Math.min(h0 * finH, Math.max(5, 25 + base(0.5)));
    back += _gcpJoint(0, 0, 'gcp-back', `<path d="${_gcpFinPath(k || 'soft', xa, xb, base, h, -1, rnd)}" fill="${fin}" ${line}/>` + (k === 'spiny' || k === 'adip' || k === 'blade' ? '' : `<path d="${_gcpFinRays(xa, xb, base, h, -1, Math.max(3, Math.round((xb - xa) / 4)))}" stroke="${ray}" stroke-width=".6" stroke-opacity=".6" fill="none"/>`));
  }
  for (const [a, b, h0, k] of R.ana) { const xa = x0 + L * a, xb = x0 + L * b, base = (t) => yB(a + (b - a) * t) - 1.2, h = Math.min(h0 * finH, Math.max(4, 25 - base(0.5))); back += `<path d="${_gcpFinPath(k || 'soft', xa, xb, base, h, 1, rnd)}" fill="${fin}" ${line}/>`; }
  if (R.finlets) { let d = ''; for (let i = 0; i < 4; i++) { const x = x0 + L * (0.06 + i * 0.05); d += `M${n(x)} ${n(yT(0.06 + i * 0.05))}l-2 -3 3.4 .8zM${n(x)} ${n(yB(0.06 + i * 0.05))}l-2 3 3.4 -.8z`; } back += `<path d="${d}" fill="${c3}" stroke="${e}" stroke-width=".4"/>`; }
  back += _gcpJoint(x0, 0, 'gcp-tail', `<path d="${_gcpTailPath(tail, tl, H, Math.max(1.8, H * R.top[0]))}" fill="${fin}" ${line}/><path d="M-2 0L${n(-tl * 0.6)} ${n(-H * 0.34)}M-2 0L${n(-tl * 0.7)} 0M-2 0L${n(-tl * 0.6)} ${n(H * 0.34)}" stroke="${ray}" stroke-width=".7" stroke-opacity=".5" fill="none"/>`);
  if (R.lobes) { const lobe = (x, y, r) => _gcpJoint(x, y, 'gcp-fin', `<path d="M0 0q-1 4.6 -5 7c-2.4 2 -5 1 -6 -1q4 -1 5 -6z" fill="${fin}" ${line} transform="rotate(${r})"/>`); back += lobe(x0 + L * 0.72, yB(0.72) - 2, 0) + lobe(x0 + L * 0.42, yB(0.42) - 2, 8); }
  if (R.plumes) { let d = ''; for (let i = 0; i < 7; i++) { const t = 0.18 + i * 0.09, x = x0 + L * t, y = yT(t), a = -1.05 - i * 0.05, h = 15 + (i % 2) * 5; d += `M${n(x)} ${n(y)}L${n(x + Math.cos(a) * -h * 0.28)} ${n(Math.max(-27, y - h))}`; } let d2 = ''; for (let i = 0; i < 6; i++) { const t = 0.5 + i * 0.06, x = x0 + L * t, y = yB(t) - 3, h = 13 + i; d2 += `M${n(x)} ${n(y)}Q${n(x - 8)} ${n(y + h * 0.6)} ${n(x - 16 + i)} ${n(Math.min(26, y + h))}`; } back += _gcpJoint(0, 0, 'gcp-back', `<path d="${d}" stroke="${c3}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="${d2}" stroke="${c2}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`); }
  // the body with its back, marks, belly, shine, all inside the outline
  s += `<defs><clipPath id="${uid}-k"><path d="${P.body}"/></clipPath></defs><path d="${P.body}" fill="${c}" stroke="${e}" stroke-width="1.3" stroke-linejoin="round"/>`;
  const dx = x0 + L / 2, pk = look.p || R.mk[Math.floor(rnd() * R.mk.length)], S = { L, H, bel: 1 };
  s += `<g clip-path="url(#${uid}-k)"><path d="M${n(x0 - 2)} ${n(-H * 1.3)}H${n(x1 + 3)}V${n(-H * 0.34)}Q${n(x0 + L * 0.5)} ${n(-H * 0.5)} ${n(x0 - 2)} ${n(-H * 0.08)}z" fill="${_gfaDk(c, 0.22)}" fill-opacity=".55"/>`;
  s += pk ? `<g transform="translate(${n(dx)} 0)">${_gfaPattern(Object.assign({}, look, { p: pk }), S, rnd)}</g>` : '';
  s += `<path d="M${n(x0 - 2)} ${n(H * 0.26)}Q${n(x0 + L * 0.5)} ${n(H * 0.3)} ${n(x1 + 2)} ${n(H * 0.1)}V${n(H * 1.5)}H${n(x0 - 2)}z" fill="${c2}"/>`;
  s += `<path d="M${n(x0 + L * 0.3)} ${n(yT(0.3) * 0.68)}Q${n(x0 + L * 0.5)} ${n(yT(0.5) * 0.8)} ${n(x0 + L * 0.72)} ${n(yT(0.72) * 0.7)}" stroke="#fff" stroke-opacity=".5" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  if (R.gills) { let d = ''; for (let i = 0; i < 4; i++) d += `M${n(x0 + L * (0.7 + i * 0.03))} ${n(-H * 0.3)}q-1 ${n(H * 0.32)} 0 ${n(H * 0.62)}`; s += `<path d="${d}" stroke="${e}" stroke-width=".9" stroke-opacity=".7" fill="none"/>`; }
  s += '</g>';
  if (R.scutes) { let d = ''; const count = 7; for (let i = 0; i < count; i++) { const t = 0.2 + i * 0.09, x = x0 + L * t; d += `M${n(x - 2.8)} ${n(yT(t) + 1.4)}l2.8 -4 2.8 4zM${n(x - 2.4)} ${n(-1)}l2.4 -2.4 2.4 2.4 -2.4 2.4z`; } s += `<path d="${d}" fill="${_gfaLt(c3, 0.3)}" stroke="${e}" stroke-width=".7" stroke-linejoin="round"/>`; }
  if (R.paddle) { const pl = 20 + rnd() * 4; s += `<path d="M${n(x1 - 2)} ${n(-H * 0.26)}C${n(x1 + pl * 0.5)} ${n(-H * 0.24)} ${n(x1 + pl * 0.8)} ${n(-H * 0.64)} ${n(x1 + pl)} ${n(-H * 0.5)}C${n(x1 + pl + 2)} ${n(-H * 0.3)} ${n(x1 + pl * 0.6)} ${n(H * 0.1)} ${n(x1 - 2)} ${n(H * 0.18)}Z" fill="${_gfaMix(c, c2, 0.3)}" stroke="${e}" stroke-width="1"/>`; }
  if (look.x === 'saw') { const sl = 15; let t = ''; for (let i = 0; i < 6; i++) t += `M${n(x1 + i * sl / 6)} ${n(H * 0.1)}v-3.6M${n(x1 + i * sl / 6)} ${n(H * 0.1)}v3.6`; s += `<path d="M${n(x1 - 2)} ${n(H * 0.1)}H${n(x1 + sl)}" stroke="${c}" stroke-width="4" stroke-linecap="round"/><path d="${t}" stroke="#fbf8ee" stroke-width="1.1"/>`; }
  if (look.x === 'frill' || look.x === 'crown' && !/crown/.test(def.id)) s += `<path d="M${n(ex - 1)} ${n(yT(R.eye[1]))}l-3 -6M${n(ex + 3)} ${n(yT(R.eye[1]))}l0 -7M${n(ex + 7)} ${n(yT(R.eye[1]))}l3 -6" stroke="${c3}" stroke-width="1.8" stroke-linecap="round"/>`;
  if (look.x === 'spikes') { let d = ''; for (let i = 0; i < 7; i++) { const t = 0.36 + i * 0.08; d += `M${n(x0 + L * t)} ${n(yB(t))}l-3 7`; } s += `<path d="${d}" stroke="${e}" stroke-width="1.3" stroke-linecap="round"/>`; }
  // cheek, chest fin, eye, mouth, whiskers
  const gx = x1 - L * (R.pec ? 0.25 : 0.2);
  s += `<path d="M${n(gx)} ${n(yT(0.75) * 0.5)}Q${n(gx - 3)} ${n(H * 0.04)} ${n(gx)} ${n(yB(0.75) * 0.6)}" stroke="${e}" stroke-width="1" stroke-opacity=".55" fill="none" stroke-linecap="round"/>`;
  if (R.pec) { const pl = H * 0.8 * R.pec, pd = R.pecBlade ? `M0 -1L${n(-pl * 0.7)} ${n(pl * 0.9)}Q${n(-pl * 0.1)} ${n(pl * 0.4)} 3 1z` : `M0 -2C${n(-pl * 0.5)} ${n(-pl * 0.05)} ${n(-pl)} ${n(pl * 0.3)} ${n(-pl)} ${n(pl * 0.5)}C${n(-pl * 0.6)} ${n(pl * 0.7)} ${n(-pl * 0.2)} ${n(pl * 0.5)} 1 2z`; s += _gcpJoint(gx - 2, H * 0.2, 'gcp-fin', `<path d="${pd}" fill="${fin}" ${line}/>`); }
  if (R.bulge) s += `<circle cx="${n(ex)}" cy="${n(ey)}" r="${n(er + 2.2)}" fill="${_gfaLt(c, 0.2)}" stroke="${e}" stroke-width=".7"/>`;
  s += _gfaEye1(ex, ey, er, e) + _gcpMouth(P, look, e);
  if (R.wh) { const y = H * P.nose + H * 0.26, x = x1 - (R.under ? 8 : 1.6), long = /whisk|king|wels|goonch|mekong|thunder/.test(def.id) ? 1.5 : 1, list = R.under ? [[-1, 7], [2, 8], [-4, 7]] : R.wh >= 6 ? [[6 * long, 9 * long], [-2, 11 * long], [-9, 9 * long], [10 * long, -3], [8 * long, 2], [-5, 8]] : R.wh >= 4 ? [[4, 6], [0, 7], [-3, 6], [5, 2]] : [[3, 6], [-1, 6.5]]; s += _gcpWhisk(x, y, list, e, 1.2); }
  if (look.x === 'thread' || /gourami/.test(def.id)) s += _gcpWhisk(x0 + L * 0.72, yB(0.72) - 1, [[-10, 14], [-4, 16]], c3, 1);
  if (R.lure) s += `<path d="M${n(x1 - L * 0.34)} ${n(yT(0.66))}Q${n(x1 - 3)} ${n(yT(0.66) - 13)} ${n(x1 + 2)} ${n(yT(0.8) - 4)}" stroke="${e}" stroke-width="1.5" fill="none" stroke-linecap="round"/>` + _gcpJoint(x1 + 2, yT(0.8) - 2, 'gcp-lure', `<circle class="gcp-glow" r="7.5" fill="${c3}" fill-opacity=".3"/><circle r="3.4" fill="${_gfaLt(c3, 0.3)}" stroke="${e}" stroke-width=".7"/>`);
  const T = _gcpTraits(def, look, ex - 1, yT(R.eye[1]) - 0.5, x1 - x0 > 50 ? yT(R.eye[1]) - 0.5 : yT(R.eye[1]) - 0.5, L * 0.72, e, rnd);
  return `<g class="gfa-fish gcp gcf-${fam}">${T.back}${back}${s}${T.over}</g>`;
}
/* ---------- the animals that are not side-on fish ---------- */
function _gcpMarksOn(look, cx, cy, rx, ry, rnd, uidClip, fallback) {
  const p = look.p || fallback;
  return p ? _gfaOvalMarks(p, cx, cy, rx, ry, rnd, look) : '';
}
/** A body of joints that bend one after another, from the head at 0,0 backwards: an eel slithers, a worm inches. Outline, then fill, so the joins do not show. seg(i) adds marks to a joint. */
const _GCP_S = Object.freeze([12, 20, -18, -24, -18, 22, 26, 16]);
function _gcpChain(n, l, widthAt, c, e, seg) {
  const one = (fill, pad) => { let inner = ''; for (let i = n - 1; i >= 0; i--) { const bend = _GCP_S[i % _GCP_S.length], w = widthAt(i / n), add = fill && seg ? seg(i, w) : ''; inner = `<g transform="translate(${i === 0 ? 0 : _gfaN(-l)} 0) rotate(${bend})"><g class="gcp-seg" style="animation-delay:${_gfaN(-i * 0.13)}s"><path d="M1 0L${_gfaN(-l)} 0" stroke="${fill ? c : e}" stroke-width="${_gfaN(w + pad)}" stroke-linecap="round" fill="none"/>${add}${inner}</g></g>`; } return inner; };
  return one(false, 1.8) + one(true, 0);
}
function _gcpEel(def, look, fam, uid, rnd) {
  const c = look.c, c2 = look.c2 || _gfaLt(c, 0.4), c3 = look.c3 || _gfaDk(c, 0.4), e = _gcpEdge(c), id = def.id, n = _gfaN, big = Math.min(1.25, 0.85 + (def.cm[1] / 300) * 0.5);
  const W = (fam === 'oar' ? 8 : 10) * big * (0.86 + rnd() * 0.28), segs = fam === 'oar' ? 8 : 7, l = 74 / segs, p = look.p, hx = 30;
  const seg = (i, w) => {
    let m = `<path d="M0 ${n(w * 0.24)}L${n(-l)} ${n(w * 0.24)}" stroke="${c2}" stroke-width="${n(w * 0.36)}" stroke-linecap="round"/>`;
    if (p === 'bars' || /electric|storm/.test(id) && i % 2) m += `<path d="M${n(-l / 2)} ${n(-w * 0.5)}V${n(w * 0.1)}" stroke="${/electric|storm/.test(id) ? '#ffe25a' : c3}" stroke-width="2.2" stroke-linecap="round"${/electric|storm/.test(id) ? ' class="gcp-glow"' : ''}/>`;
    else if (p === 'spots' || p === 'speckle' || p === 'patches') m += `<circle cx="${n(-l * 0.3)}" cy="${n(-w * (0.1 + (i % 2) * 0.16))}" r="${n(w * 0.15)}" fill="${c3}"/>`;
    if (fam === 'oar') m += `<path d="M${n(-l * 0.2)} ${n(-w * 0.5)}l-1 -6M${n(-l * 0.7)} ${n(-w * 0.5)}l-1 -5" stroke="#d8402a" stroke-width="1.6" stroke-linecap="round"/>`;
    else if (look.x === 'frill' || i < 5) m += `<path d="M0 ${n(-w * 0.55)}L${n(-l)} ${n(-w * 0.55)}" stroke="${_gfaMix(c, c3, 0.5)}" stroke-width="1.8" stroke-linecap="round"/>`;
    return m;
  };
  let s = `<g transform="translate(${hx} 0)">${_gcpChain(segs, l, (t) => W * (1 - t * t * 0.74), c, e, seg)}`;
  if (fam === 'lamprey') { let t = ''; for (let i = 0; i < 7; i++) t += `<circle cx="${n(-6 - i * 2.2)}" cy="-1.4" r=".7" fill="${e}"/>`; s += `<ellipse cx="4" cy="0" rx="${n(W * 0.62)}" ry="${n(W * 0.58)}" fill="${c}" stroke="${e}" stroke-width="1.1"/><ellipse cx="9" cy="0" rx="${n(W * 0.26)}" ry="${n(W * 0.6)}" fill="#3a1218" stroke="${e}" stroke-width="1"/><path d="M9 -3v1M10 -1v1M10 1v1M9 3v1" stroke="#fbf8ee" stroke-width="1"/>${t}` + _gfaEye1(1, -2.4, 2, e); }
  else { const H0 = W * 0.76; s += `<path d="M-5 ${n(-H0)}C4 ${n(-H0 * 1.1)} 12 ${n(-H0 * 0.6)} 13 0C12 ${n(H0 * 0.8)} 2 ${n(H0)} -5 ${n(H0 * 0.9)}Z" fill="${c}" stroke="${e}" stroke-width="1.1" stroke-linejoin="round"/><path d="M12 1.4Q6 ${n(H0 * 0.7)} 0 2" stroke="${e}" stroke-width="1.2" fill="none" stroke-linecap="round"/>` + _gfaEye1(5, -H0 * 0.34, Math.max(2.2, W * 0.26), e);
    if (look.x === 'frill' || /dragon/.test(id)) s += `<path d="M2 ${n(-H0)}l-4 -6M6 ${n(-H0 * 0.9)}l0 -7M-2 ${n(-H0)}l-5 -4" stroke="${c3}" stroke-width="2.2" stroke-linecap="round"/>`; }
  const T = _gcpTraits(def, look, hx + 3, -W * 0.8, -W * 0.8, 26, e, rnd);
  return `<g class="gfa-fish gcp gcf-${fam}">${T.back}${s}</g>${T.over}</g>`;
}
function _gcpKoi(def, look, uid, rnd) {   // from above, in a pond: the one we all know that way
  const c = look.c, c2 = look.c2 || c, c3 = look.c3 || _gfaDk(c, 0.4), e = _gcpEdge(c), n = _gfaN, long = /butterfly/.test(def.id) || look.t === 'veil' ? 1.5 : 1, L = 62 + rnd() * 8, W = 11 + rnd() * 3.4, hx = L * 0.5, tx = -L * 0.44;
  const fin = _gfaMix(c, '#fff', 0.3), line = `stroke="${e}" stroke-width=".9" stroke-linejoin="round"`, pec = (x, m, r) => _gcpJoint(x, m * W * 0.7, 'gcp-fin', `<path transform="scale(1 ${m}) rotate(${r})" d="M2 0C-1 ${n(8 * long)} -10 ${n(14 * long)} -14 ${n(10 * long)}C-14 ${n(5 * long)} -8 1 -1 -1z" fill="${fin}" ${line}/>`);
  const body = _gcpSmooth([[tx, -2.6], [-L * 0.14, -W * 0.82], [L * 0.14, -W], [hx - 6, -W * 0.72], [hx, 0], [hx - 6, W * 0.72], [L * 0.14, W], [-L * 0.14, W * 0.82], [tx, 2.6]]);
  let m = ''; const patches = 2 + Math.floor(rnd() * 3); for (let i = 0; i < patches; i++) m += `<ellipse cx="${n(-L * 0.26 + i * L * 0.2 + rnd() * 4)}" cy="${n((rnd() - 0.5) * W)}" rx="${n(5 + rnd() * 6)}" ry="${n(4 + rnd() * 3.6)}" fill="${i % 2 ? c3 : c2}" transform="rotate(${Math.round(rnd() * 70 - 35)} 0 0)"/>`;
  if (/tancho/.test(def.id)) m = `<circle cx="${n(hx - 13)}" cy="0" r="6.4" fill="#d8301a"/>`;
  if (/platinum|ghost|porcelain/.test(def.id)) m = `<path d="M${n(-L * 0.3)} 0H${n(L * 0.3)}" stroke="#fff" stroke-opacity=".7" stroke-width="5" stroke-linecap="round"/>`;
  const T = _gcpTraits(def, look, hx - 13, -W - 2, -W - 2, 36, e, rnd);
  const tail = _gcpJoint(tx + 2, 0, 'gcp-tail', `<path d="M1 -2C-8 -10 ${n(-16 * long)} ${n(-11 * long)} ${n(-20 * long)} ${n(-7 * long)}C${n(-16 * long)} -2 ${n(-16 * long)} 2 ${n(-20 * long)} ${n(7 * long)}C${n(-16 * long)} ${n(11 * long)} -8 10 1 2z" fill="${fin}" ${line}/>`);
  return `<g class="gfa-fish gcp gcf-koi">${T.back}${tail}${pec(L * 0.22, -1, 8)}${pec(L * 0.22, 1, 8)}${pec(-L * 0.16, -1, -6)}${pec(-L * 0.16, 1, -6)}<defs><clipPath id="${uid}-k"><path d="${body}"/></clipPath></defs><path d="${body}" fill="${c}" stroke="${e}" stroke-width="1.2"/><g clip-path="url(#${uid}-k)">${m}</g><path d="M${n(-L * 0.28)} 0H${n(L * 0.2)}" stroke="${e}" stroke-width="1.4" stroke-opacity=".35" stroke-linecap="round"/>${_gfaEye1(hx - 9, -W * 0.58, 2.6, e)}${_gfaEye1(hx - 9, W * 0.58, 2.6, e)}<path d="M${n(hx - 1)} -2l3 -2.6M${n(hx - 1)} 2l3 2.6" stroke="${e}" stroke-width="1.1" stroke-linecap="round"/>${T.over}</g>`;
}
function _gcpFlatfish(def, look, uid, rnd) {   // lies on the bottom: an oval with a frill all round and both eyes on top
  const c = look.c, c2 = look.c2 || _gfaLt(c, 0.4), c3 = look.c3 || _gfaDk(c, 0.4), e = _gcpEdge(c), n = _gfaN, rx = 27 + rnd() * 7, ry = 15 + rnd() * 6;
  let frill = ''; const count = 26; for (let i = 0; i < count; i++) { const a = i / count * 6.283; if (Math.abs(a) < 0.3 || a > 5.98) continue; frill += `M${n(Math.cos(a) * rx * 0.92)} ${n(Math.sin(a) * ry * 0.92)}L${n(Math.cos(a) * (rx + 6))} ${n(Math.sin(a) * (ry + 6))}`; }
  let m = ''; const dots = 9 + Math.floor(rnd() * 6); for (let i = 0; i < dots; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * 0.8; m += `<circle cx="${n(Math.cos(a) * r * rx)}" cy="${n(Math.sin(a) * r * ry)}" r="${n(0.8 + rnd() * 1.8)}" fill="${i % 3 ? c3 : c2}"/>`; }
  const T = _gcpTraits(def, look, rx * 0.6, -ry, -ry, 28, e, rnd);
  return `<g class="gfa-fish gcp gcf-flatfish">${T.back}${_gcpJoint(-rx - 2, 0, 'gcp-tail', `<path d="M1 -2.4L-9 -8Q-7 0 -9 8L1 2.4z" fill="${_gfaMix(c, c3, 0.4)}" stroke="${e}" stroke-width=".9"/>`)}<g class="gcp-ripple"><ellipse rx="${n(rx + 6)}" ry="${n(ry + 6)}" fill="${_gfaMix(c, c2, 0.3)}" stroke="${e}" stroke-width="1"/><path d="${frill}" stroke="${e}" stroke-width=".7" stroke-opacity=".6"/></g><ellipse rx="${n(rx)}" ry="${n(ry)}" fill="${c}" stroke="${e}" stroke-width="1.2"/>${m}<path d="M${n(-rx * 0.7)} 0H${n(rx * 0.42)}" stroke="${e}" stroke-width="1" stroke-opacity=".5"/>${_gfaEye1(rx * 0.56, -ry * 0.38, 3.4, e)}${_gfaEye1(rx * 0.66, ry * 0.08, 3, e)}<path d="M${n(rx * 0.9)} ${n(ry * 0.24)}q-2.4 3 -5 1.6" stroke="${e}" stroke-width="1.2" fill="none" stroke-linecap="round"/>${T.over}</g>`;
}
function _gcpPuffer(def, look, rnd) {
  const c = look.c, c2 = look.c2 || _gfaLt(c, 0.5), c3 = look.c3 || _gfaDk(c, 0.4), e = _gcpEdge(c), n = _gfaN, R = 19 + rnd() * 3;
  let d = ''; for (let i = 0; i < 20; i++) { const a = i / 20 * 6.283, s = 3.4 + rnd() * 2; d += `M${n(Math.cos(a - 0.12) * R)} ${n(Math.sin(a - 0.12) * R)}L${n(Math.cos(a) * (R + s))} ${n(Math.sin(a) * (R + s))}L${n(Math.cos(a + 0.12) * R)} ${n(Math.sin(a + 0.12) * R)}Z`; }
  let m = ''; for (let i = 0; i < 9; i++) m += `<circle cx="${n(-R * 0.7 + rnd() * R * 1.2)}" cy="${n(-R * 0.72 + rnd() * R * 0.66)}" r="${n(1.2 + rnd() * 1.6)}" fill="${c3}"/>`;
  return `<g class="gfa-fish gcp gcf-puffer">${_gcpJoint(-R - 1, 0, 'gcp-tail', `<path d="M1 -2L-9 -6Q-7 0 -9 6L1 2z" fill="${c3}" stroke="${e}"/>`)}<g class="gcp-puff"><path d="${d}" fill="${_gfaLt(c3, 0.2)}" stroke="${e}" stroke-width=".6"/><circle r="${n(R)}" fill="${c}" stroke="${e}" stroke-width="1.3"/><path d="M${n(-R)} 3Q0 ${n(R * 0.3)} ${n(R)} 3A${n(R)} ${n(R)} 0 0 1 ${n(-R)} 3z" fill="${c2}"/>${m}<path d="M${n(R * 0.96)} 3q-2 3 -5 2" stroke="${e}" stroke-width="1.5" fill="none" stroke-linecap="round"/>${_gfaEye1(R * 0.52, -R * 0.26, 5.2, e)}${_gcpJoint(R * 0.1, R * 0.1, 'gcp-fin', `<path d="M0 0C-5 -1 -8 3 -8 7C-4 7 -1 4 0 2z" fill="${c3}" stroke="${e}" stroke-width=".8"/>`)}</g></g>`;
}
function _gcpOwn(def, look, fam, uid, rnd) {
  const c = look.c, c2 = look.c2 || _gfaLt(c, 0.4), c3 = look.c3 || _gfaDk(c, 0.4), e = _gcpEdge(c), n = _gfaN, A = `stroke="${e}" stroke-width="1.2" stroke-linejoin="round"`, p = look.p, big = Math.min(1, (def.cm[1] || 10) / 200);
  switch (fam) {
    case 'eel': case 'oar': case 'lamprey': return _gcpEel(def, look, fam, uid, rnd);
    case 'koi': return _gcpKoi(def, look, uid, rnd);
    case 'flatfish': return _gcpFlatfish(def, look, uid, rnd);
    case 'puffer': return _gcpPuffer(def, look, rnd);
    case 'ray': {
      const w = 24 + rnd() * 5, l = 30 + rnd() * 6, tl = 12 + rnd() * 10, wing = (m) => `<g class="gcp-flap"><path transform="scale(1 ${m})" d="M${n(l)} 0C${n(l * 0.7)} ${n(-w * 0.3)} ${n(l * 0.3)} ${n(-w)} ${n(-l * 0.1)} ${n(-w)}C${n(-l * 0.4)} ${n(-w * 0.8)} ${n(-l * 0.66)} ${n(-w * 0.3)} ${n(-l * 0.74)} 0Z" fill="${c}" ${A}/></g>`, royal = /queen|storm|sun/.test(def.id);
      const T = _gcpTraits(def, look, l * 0.5, -w * 0.44, -w * 0.44, 24, e, rnd);
      return `<g class="gfa-fish gcp gcf-ray">${T.back}${_gcpJoint(-l * 0.7, 0, 'gcp-tail', `<path d="M0 0Q${n(-tl * 0.6)} 2 ${n(-tl)} -2" stroke="${e}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M0 0Q${n(-tl * 0.6)} 2 ${n(-tl)} -2" stroke="${c}" stroke-width="1.3" fill="none" stroke-linecap="round"/>${royal ? `<path d="M${n(-tl * 0.5)} 0l-3 -4M${n(-tl * 0.3)} 1l-2 -4" stroke="${c3}" stroke-width="1.4"/>` : ''}`)}${wing(1)}${wing(-1)}<ellipse cx="${n(l * 0.1)}" rx="${n(l * 0.5)}" ry="${n(w * 0.34)}" fill="${_gfaLt(c, 0.14)}"/>${_gcpMarksOn(look, 2, 0, l * 0.5, w * 0.6, rnd, '', 'spots')}${royal ? `<path d="M${n(l * 0.9)} -4Q${n(l + 6)} -8 ${n(l + 6)} -13M${n(l * 0.9)} 4Q${n(l + 6)} 8 ${n(l + 6)} 13" stroke="${c3}" stroke-width="2.4" fill="none" stroke-linecap="round"/>` : ''}${_gfaEye1(l * 0.6, -6, 2.8, e)}${_gfaEye1(l * 0.6, 6, 2.8, e)}${T.over}</g>`;
    }
    case 'seahorse': {
      const crown = def.rarity === 'legendary', d = 'M-2 -16C10 -20 14 -9 7 -3C1 2 7 9 2 14C-3 20 -11 15 -7 10';
      return `<g class="gfa-fish gcp gcf-seahorse"><g class="gcp-bob"><path d="${d}" stroke="${e}" stroke-width="10.4" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${c}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M6 -8q2.4 2 1 5M5 0q3 2 1 4.6M4 7q2 2 0 4" stroke="${c3}" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M-1 -16L17 -14L16 -11L1 -11Z" fill="${c}" ${A}/><path d="M3 -22l2 4 3 -4 1 5 4 -2 -2 5z" fill="${crown ? '#f4c83a' : c3}" ${A}/>${_gcpJoint(-3, -6, 'gcp-fin', `<path d="M0 0Q-10 -3 -11 5Q-5 5 1 3Z" fill="${c2}" ${A}/>`)}${_gfaEye1(3, -17, 3.4, e)}${crown ? `<circle class="gcp-glow" cy="-4" r="22" fill="#ffe27a" fill-opacity=".18"/>` : ''}</g></g>`;
    }
    case 'jelly': {
      const R = 18 + rnd() * 5; let t = ''; for (let i = 0; i < 5; i++) { const x = -R * 0.62 + i * R * 0.31; t += _gcpJoint(x, 4, 'gcp-tent', `<path d="M0 0q${i % 2 ? 4 : -4} 7 0 12q${i % 2 ? -3 : 3} 4 0 8" stroke="${c3}" stroke-width="2" stroke-opacity=".85" fill="none" stroke-linecap="round"/>`, '', `animation-delay:${n(-i * 0.2)}s`); }
      return `<g class="gfa-fish gcp gcf-jelly"><g transform="translate(0 -4)">${t}<g class="gcp-bell"><path d="M${n(-R)} 4C${n(-R)} ${n(-R * 1.3)} ${n(R)} ${n(-R * 1.3)} ${n(R)} 4Q${n(R * 0.75)} 8 ${n(R * 0.5)} 4Q${n(R * 0.25)} 8 0 4Q${n(-R * 0.25)} 8 ${n(-R * 0.5)} 4Q${n(-R * 0.75)} 8 ${n(-R)} 4Z" fill="${c}" fill-opacity=".85" ${A}/><path d="M${n(-R * 0.5)} -5C${n(-R * 0.44)} ${n(-R * 0.72)} -1 ${n(-R * 0.84)} ${n(R * 0.26)} ${n(-R * 0.74)}" stroke="#fff" stroke-opacity=".75" stroke-width="2.4" fill="none" stroke-linecap="round"/><ellipse class="gcp-glow" cy="-5" rx="${n(R * 0.46)}" ry="${n(R * 0.3)}" fill="${c2}" fill-opacity=".6"/>${_gfaEye1(-5, -5, 2.2, e)}${_gfaEye1(5, -5, 2.2, e)}</g></g></g>`;
    }
    case 'crab': {
      const w = 22 + rnd() * 3, fiddler = /fiddler/.test(def.id), claw = (m, k) => _gcpJoint(m * 16, -3, m < 0 ? 'gcp-claw gcp-clawl' : 'gcp-claw', `<path transform="scale(${m * k} ${k})" d="M0 0Q8 0 11 -8Q7 -13 12 -17Q19 -15 19 -9Q16 -8 15 -6Q18 -5 17 -2Q11 3 0 4Z" fill="${c2}" ${A}/>`);
      const legs = (m) => [0, 1, 2].map((i) => _gcpJoint(m * (15 + i), 3 + i * 3, 'gcp-leg', `<path d="M0 0l${m * 8} 2 ${m * 3} 7" stroke="${e}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`, '', `animation-delay:${n(-i * 0.14)}s`)).join('');
      return `<g class="gfa-fish gcp gcf-crab"><g transform="translate(0 2)">${legs(1)}${legs(-1)}${claw(-1, fiddler ? 0.72 : 1)}${claw(1, fiddler ? 1.38 : 1)}<path d="M${n(-w)} 2C${n(-w)} -12 ${n(w)} -12 ${n(w)} 2C${n(w)} 13 ${n(-w)} 13 ${n(-w)} 2Z" fill="${c}" ${A}/><path d="M-12 -2Q0 -7 12 -2" stroke="${c3}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M-5 -8l-1 -6M5 -8l1 -6" stroke="${e}" stroke-width="1.6"/>${_gfaEye1(-6, -15, 2.8, e)}${_gfaEye1(6, -15, 2.8, e)}<path d="M-5 5q5 4 10 0" stroke="${e}" stroke-width="1.3" fill="none" stroke-linecap="round"/>${def.rarity === 'epic' ? '<path class="gcp-glow" d="M-10 2h.1M0 0h.1M10 2h.1M-5 6h.1M5 6h.1" stroke="#fff6c8" stroke-width="2.4" stroke-linecap="round"/>' : ''}</g></g>`;
    }
    case 'crayfish': {
      const claw = (m) => _gcpJoint(16, m * 4, 'gcp-claw' + (m < 0 ? ' gcp-clawl' : ''), `<path transform="scale(1 ${m})" d="M0 -1Q6 8 18 9Q25 6 21 2Q17 4 14 2Q18 -1 14 -3L4 -4z" fill="${c2}" ${A}/>`);
      let legs = ''; for (let i = 0; i < 4; i++) legs += `M${-10 + i * 6} -7l-2 -8M${-10 + i * 6} 7l-2 8`;
      return `<g class="gfa-fish gcp gcf-crayfish">${_gcpJoint(-26, 0, 'gcp-tail', `<path d="M1 0Q-9 -9 -5 -14Q4 -12 7 -3M1 0Q-9 9 -5 14Q4 12 7 3" fill="${c2}" ${A}/>`)}<g class="gcp-leg"><path d="${legs}" stroke="${e}" stroke-width="2" fill="none" stroke-linecap="round"/></g>${claw(-1)}${claw(1)}<path d="M-26 0C-26 -9 -10 -11 4 -9 14 -8 22 -5 24 0 22 5 14 8 4 9 -10 11 -26 9 -26 0Z" fill="${c}" ${A}/><path d="M-20 -7q3 7 0 14M-13 -8q3 8 0 16M-6 -9q3 9 0 18" stroke="${e}" stroke-width="1" stroke-opacity=".55" fill="none"/>${_gcpWhisk(22, -2, [[13, -8]], e, 1)}${_gcpWhisk(22, 2, [[13, 8]], e, 1)}${_gfaEye1(17, -4, 2.8, e)}${_gfaEye1(17, 4, 2.8, e)}</g>`;
    }
    case 'shrimp': {
      const ghost = p === 'ghost' || /ghost|fairy/.test(def.id);
      return `<g class="gfa-fish gcp gcf-shrimp"><path d="M-2 7l-2 8M5 7l0 8M12 6l2 8" stroke="${e}" stroke-width="1.6" stroke-linecap="round" class="gcp-leg"/>${_gcpWhisk(20, -6, [[17, -13], [20, -2]], e, 1.1)}<g class="gcp-bob"><path d="M-30 12Q-36 2 -24 -2Q-8 -12 12 -8Q24 -5 26 0Q18 8 4 8Q-14 8 -22 14Q-26 16 -30 12Z" fill="${c}" fill-opacity="${ghost ? 0.55 : 0.92}" ${A}/><path d="M-20 -2q2 6 0 12M-12 -6q3 7 0 14M-4 -8q3 8 0 16M4 -8q3 8 0 16" stroke="${c3}" stroke-width="1.2" stroke-opacity=".7" fill="none"/><path d="M24 -2L36 -4" stroke="${e}" stroke-width="1.8" stroke-linecap="round"/></g>${_gcpJoint(-30, 12, 'gcp-tail', `<path d="M0 0l-8 3l1 -7z" fill="${c2}" ${A}/>`)}${_gfaEye1(17, -5, 2.6, e)}</g>`;
    }
    case 'turtle': {
      const R = 21 + rnd() * 3, snap = /snapping/.test(def.id), fl = (x, y, m, r) => _gcpJoint(x, y, 'gcp-fin', `<ellipse cx="0" cy="${m * 5}" rx="4" ry="8" transform="rotate(${r})" fill="${_gfaLt(c, 0.25)}" stroke="${e}"/>`);
      let scutes = ''; if (snap) { for (let i = 0; i < 5; i++) scutes += `M${-14 + i * 7} -4l3 -4 3 4`; }
      return `<g class="gfa-fish gcp gcf-turtle">${fl(-13, -13, -1, 30)}${fl(-13, 13, 1, -30)}${fl(12, -13, -1, -25)}${fl(12, 13, 1, 25)}${_gcpJoint(-R, 0, 'gcp-tail', '<path d="M0 -2L-8 0L0 2z" fill="' + _gfaLt(c, 0.25) + '" stroke="' + e + '"/>')}${_gcpJoint(R - 2, 0, 'gcp-jaw', `<circle cx="7" r="7" fill="${_gfaLt(c, 0.25)}" ${A}/>${_gfaEye1(9, -3.4, 2.2, e)}${_gfaEye1(9, 3.4, 2.2, e)}${snap ? '<path d="M14 -2l-3 2 3 2" stroke="#fbf8ee" stroke-width="1.2" fill="none"/>' : ''}`)}<ellipse rx="${n(R)}" ry="${n(R * 0.8)}" fill="${c}" ${A}/><path d="M-8 -7L8 -7L14 0L8 7L-8 7L-14 0ZM-8 -7L-13 -15M8 -7L12 -15M-8 7L-13 15M8 7L12 15M-14 0H-23M14 0H23" stroke="${c2}" stroke-width="1.5" fill="none" stroke-linejoin="round"/>${scutes ? `<path d="${scutes}" fill="${c3}" stroke="${e}" stroke-width=".6"/>` : ''}</g>`;
    }
    case 'newt': {
      const fr = look.x === 'frill', ax = /axolotl/.test(def.id), l1 = 10, leg = (x, m, d) => _gcpJoint(x, m * 3, 'gcp-leg', `<path d="M0 0l${d * 3} ${m * 8}l${d * 5} ${m * 2}" stroke="${e}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
      const seg = (i, w) => `<path d="M0 ${n(w * 0.26)}L${-l1} ${n(w * 0.26)}" stroke="${c2}" stroke-width="${n(w * 0.34)}" stroke-linecap="round"/>` + (p === 'spots' || !p ? `<circle cx="-5" cy="${n(-w * 0.18)}" r="1.4" fill="${c3}"/>` : '') + (fr && i < 4 ? `<path d="M-2 ${n(-w * 0.5)}l-1 -5M-7 ${n(-w * 0.5)}l-1 -4" stroke="${c3}" stroke-width="2.2" stroke-linecap="round"/>` : '');
      return `<g class="gfa-fish gcp gcf-newt">${leg(-24, 1, -1)}${leg(-24, -1, -1)}${leg(11, 1, 1)}${leg(11, -1, 1)}<g transform="translate(14 0)">${_gcpChain(5, l1, (t) => 11 * (1 - t * t * 0.74), c, e, seg)}</g><ellipse cx="22" rx="10" ry="8" fill="${c}" ${A}/>${ax ? `${_gcpWhisk(14, -5, [[-7, -10], [-1, -11], [4, -10]], c3, 2.6)}${_gcpWhisk(14, 5, [[-7, 10], [-1, 11], [4, 10]], c3, 2.6)}` : ''}${_gfaEye1(26, -3, 3, e)}<path d="M31 2q-3 3 -8 2" stroke="${e}" stroke-width="1.2" fill="none" stroke-linecap="round"/></g>`;
    }
    case 'squid': {
      const K = /kraken/.test(def.id) ? 1 : 0.86, arms = 6 + (K === 1 ? 2 : 0); let t = '';
      for (let i = 0; i < arms; i++) { const y = -9 + i * 18 / (arms - 1); t += _gcpJoint(-4, y, 'gcp-tent', `<path d="M0 0C-10 ${n(y * 0.4)} -18 ${n(y * 0.2 + (i % 2 ? 6 : -6))} ${n(-28 - (i % 2) * 6)} ${n(y)}" stroke="${e}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M0 0C-10 ${n(y * 0.4)} -18 ${n(y * 0.2 + (i % 2 ? 6 : -6))} ${n(-28 - (i % 2) * 6)} ${n(y)}" stroke="${c}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`, '', `animation-delay:${n(-i * 0.17)}s`); }
      const T = _gcpTraits(def, look, 6, -13, -13, 18, e, rnd);
      return `<g class="gfa-fish gcp gcf-squid">${T.back}<g transform="scale(${K})">${t}<path d="M-6 -11C8 -16 26 -10 38 0C26 10 8 16 -6 11Q-12 0 -6 -11Z" fill="${c}" ${A}/><path d="M26 -8L38 -15L38 0ZM26 8L38 15L38 0Z" fill="${c2}" ${A}/>${_gcpMarksOn(look, 14, 0, 12, 7, rnd, '', '')}${_gfaEye1(1, -6, 3.6, e)}${_gfaEye1(1, 6, 3.6, e)}</g>${T.over}</g>`;
    }
    case 'skel': {
      let r = ''; for (let i = 0; i < 7; i++) { const x = -22 + i * 6.4, h = 12 - Math.abs(i - 3) * 1.6; r += `M${n(x)} ${n(-h)}Q${n(x + 3)} 0 ${n(x)} ${n(h)}`; }
      return `<g class="gfa-fish gcp gcf-skel">${_gcpJoint(-30, 0, 'gcp-tail', `<path d="M0 0L-12 -11M0 0L-12 11" stroke="${c}" stroke-width="2.8" stroke-linecap="round"/>`)}<path d="M-30 0H18" stroke="${e}" stroke-width="4"/><path d="M-30 0H18" stroke="${c}" stroke-width="2.4"/><path d="${r}" stroke="${e}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="${r}" stroke="${c}" stroke-width="1.8" fill="none" stroke-linecap="round"/>${_gcpJoint(13, 0, 'gcp-jaw', `<path d="M0 -13C12 -15 24 -8 24 0C24 6 16 9 8 8L2 12C-2 6 -4 -6 0 -13Z" fill="${c}" ${A}/><path d="M16 5l1 3M20 3l1 3" stroke="${e}" stroke-width="1.2"/><circle cx="10" cy="-4" r="4" fill="${c3}" stroke="${e}" stroke-width=".8"/><circle class="gcp-glow" cx="10" cy="-4" r="1.5" fill="#e8501a"/>`)}</g>`;
    }
    default: return '';
  }
}
/** The whole of a fish, or '' for anything without a family (the older drawing). */
function _gcpFishArt(def, look, uid) {
  const fam = gardenFishFamily(look === def.look ? def : Object.assign({}, def, { look }));
  if (!fam) return '';
  if (_GCP_SIDE[fam]) return _gcpSideFish(def, look, fam, uid);
  return _gcpOwn(def, look, fam, uid, _gfaRng('plan|' + def.id));
}
/** Where a variant's marks go on it. */
function gardenFishFrame(def, look) {
  const fam = gardenFishFamily(def); if (!fam) return null;
  if (_GCP_SIDE[fam]) { const P = _gcpPlan(def, look, fam); return { kind: 'fish', L: P.L, H: P.H, x0: P.x0, x1: P.x1, ex: P.ex, ey: P.ey, er: P.er, top: P.yT(P.R.eye[1]), k: 1, body: P.body }; }
  const box = { eel: [74, 6], oar: [74, 5], lamprey: [74, 6], koi: [62, 12], flatfish: [58, 18], puffer: [40, 19], ray: [56, 22], seahorse: [20, 16], jelly: [36, 16], crab: [44, 11], crayfish: [50, 9], shrimp: [52, 9], turtle: [42, 17], newt: [60, 6], squid: [44, 11], skel: [50, 11] }[fam] || [50, 12];
  return { kind: 'fish', L: box[0], H: box[1], x0: -box[0] / 2, x1: box[0] / 2, ex: box[0] * 0.32, ey: -box[1] * 0.3, er: 3, top: -box[1], k: 1, body: '' };
}
/* ---------- the shadow in the water: from above, its family's outline ---------- */
const _GCP_SHADOW = Object.freeze({ minnow: [.46, .1, 'fork'], herring: [.44, .12, 'fork'], chub: [.42, .15, 'fork'], salmon: [.46, .14, 'fork'], tuna: [.42, .18, 'crescent'], sail: [.44, .11, 'fork', 'sail'], perch: [.34, .18, 'fan'], bream: [.34, .14, 'fork'], hump: [.38, .2, 'fork'], bass: [.38, .2, 'fan'], carp: [.42, .2, 'fan'], disc: [.28, .12, 'fan'], angel: [.24, .08, 'fork', 'tall'], fancy: [.24, .2, 'veil'], goby: [.34, .14, 'fan', 'wings'], loach: [.5, .08, 'fan'], pike: [.52, .09, 'fork'], gar: [.56, .05, 'fan', 'beak'], pipe: [.56, .03, 'fan'], catfish: [.42, .2, 'fan', 'whisk'], sturgeon: [.52, .1, 'long', 'plate'], paddle: [.4, .1, 'long', 'paddle'], shark: [.52, .11, 'crescent', 'wings'], angler: [.3, .28, 'fan', 'lure'], mola: [.26, .24, 'none', 'tall'], lobe: [.44, .13, 'fan', 'wings'], lion: [.28, .16, 'fan', 'plumes'], snakehead: [.5, .09, 'fan'], koi: [.42, .15, 'fan', 'wings'] });
function _gcpShadowTail(k, x, L, ry, fill, op) {
  const n = _gfaN, F = `fill="${fill}" fill-opacity="${op}"`, t = L * 0.2, a = ry * 1.1;
  if (k === 'none') return '';
  const d = k === 'crescent' ? `M1 ${n(-a * 0.2)}L${n(-t)} ${n(-a * 1.8)}Q${n(-t * 0.5)} 0 ${n(-t)} ${n(a * 1.8)}L1 ${n(a * 0.2)}Z` : k === 'long' ? `M1 ${n(-a * 0.4)}L${n(-t * 1.2)} ${n(-a * 0.5)}L${n(-t * 1.2)} ${n(a * 0.2)}L1 ${n(a * 0.4)}Z` : k === 'veil' ? `M1 -2C${n(-t)} ${n(-a * 2.2)} ${n(-t * 2)} ${n(-a * 1.6)} ${n(-t * 1.8)} 0C${n(-t * 2)} ${n(a * 1.6)} ${n(-t)} ${n(a * 2.2)} 1 2Z` : k === 'fan' ? `M1 ${n(-a * 0.3)}C${n(-t * 0.6)} ${n(-a)} ${n(-t)} ${n(-a)} ${n(-t)} 0C${n(-t)} ${n(a)} ${n(-t * 0.6)} ${n(a)} 1 ${n(a * 0.3)}Z` : `M1 ${n(-a * 0.3)}L${n(-t)} ${n(-a)}L${n(-t * 0.7)} 0L${n(-t)} ${n(a)}L1 ${n(a * 0.3)}Z`;
  return _gcpJoint(x, 0, 'gcs-tail', `<path d="${d}" ${F}/>`);
}
/** Its shadow, the same on every screen. '' for anything without a family (the older oval). */
function gardenFishShadow(def, L, fill, op) { const s = _gcpShadow(def, L, fill); return s ? `<g opacity="${op}">${s}</g>` : ''; }   // (one opacity for the whole of it: the joins do not show as dark spots)
function _gcpShadow(def, L, fill) {
  const op = 1, fam = gardenFishFamily(def); if (!fam) return '';
  const n = _gfaN, F = `fill="${fill}" fill-opacity="${op}"`, S = `stroke="${fill}" stroke-opacity="${op}"`;
  switch (fam) {
    case 'eel': case 'oar': case 'lamprey': { const segs = 6, l = L * 1.05 / segs, w = Math.max(3, L * (fam === 'oar' ? 0.06 : 0.09)); let inner = ''; for (let i = segs - 1; i >= 0; i--) inner = `<g transform="translate(${i ? n(-l) : n(L * 0.5)} 0) rotate(${_GCP_S[i % _GCP_S.length]})"><g class="gcs-seg" style="animation-delay:${n(-i * 0.14)}s"><path d="M1 0L${n(-l)} 0" stroke="${fill}" stroke-opacity="${op}" stroke-width="${n(w * (1 - i / segs * 0.7))}" stroke-linecap="round"/>${inner}</g></g>`; return inner; }
    case 'ray': { const w = (m) => `<g class="gcs-flap"><path transform="scale(1 ${m})" d="M${n(L * 0.5)} 0Q${n(L * 0.1)} ${n(-L * 0.46)} ${n(-L * 0.12)} ${n(-L * 0.42)}Q${n(-L * 0.24)} ${n(-L * 0.1)} ${n(-L * 0.3)} 0Z" ${F}/></g>`; return `${w(1)}${w(-1)}<path d="M${n(-L * 0.3)} 0H${n(-L * 0.72)}" ${S} stroke-width="2" stroke-linecap="round"/>`; }
    case 'flatfish': return `<g class="gcs-pulse"><ellipse rx="${n(L * 0.4)}" ry="${n(L * 0.26)}" ${F}/></g>`;
    case 'jelly': { let d = ''; for (let i = 0; i < 4; i++) d += `M${n(-L * 0.16 + i * L * 0.1)} ${n(L * 0.1)}q${n(i % 2 ? 3 : -3)} ${n(L * 0.14)} 0 ${n(L * 0.28)}`; return `<path d="${d}" ${S} stroke-width="1.6" fill="none" stroke-linecap="round"/><g class="gcs-pulse"><ellipse rx="${n(L * 0.26)}" ry="${n(L * 0.22)}" ${F}/></g>`; }
    case 'crab': { const m = L * 0.26; return `<path d="M${n(-m)} 0L${n(-m * 1.6)} ${n(-m * 0.5)}M${n(-m)} ${n(m * 0.3)}L${n(-m * 1.7)} ${n(m * 0.5)}M${n(-m)} ${n(m * 0.6)}L${n(-m * 1.3)} ${n(m)}M${n(m)} 0L${n(m * 1.6)} ${n(-m * 0.5)}M${n(m)} ${n(m * 0.3)}L${n(m * 1.7)} ${n(m * 0.5)}M${n(m)} ${n(m * 0.6)}L${n(m * 1.3)} ${n(m)}" ${S} stroke-width="1.8" stroke-linecap="round"/><ellipse rx="${n(m)}" ry="${n(m * 0.7)}" ${F}/><g class="gcs-claw"><circle cx="${n(m * 0.9)}" cy="${n(-m * 1.1)}" r="${n(m * 0.42)}" ${F}/><circle cx="${n(-m * 0.9)}" cy="${n(-m * 1.1)}" r="${n(m * 0.42)}" ${F}/></g>`; }
    case 'crayfish': case 'shrimp': { const m = L * 0.36; return `<ellipse rx="${n(m)}" ry="${n(m * 0.24)}" ${F}/><path d="M${n(m * 0.7)} ${n(-m * 0.1)}L${n(m * 1.4)} ${n(-m * 0.5)}M${n(m * 0.7)} ${n(m * 0.1)}L${n(m * 1.4)} ${n(m * 0.5)}" ${S} stroke-width="2.6" stroke-linecap="round"/>${_gcpShadowTail('fan', -m, L * 0.8, m * 0.24, fill, op)}`; }
    case 'turtle': { const m = L * 0.3; return `<ellipse rx="${n(m)}" ry="${n(m * 0.8)}" ${F}/><circle cx="${n(m * 1.2)}" r="${n(m * 0.3)}" ${F}/><g class="gcs-flap"><path d="M${n(m * 0.5)} ${n(-m * 0.6)}l${n(m * 0.5)} ${n(-m * 0.6)}M${n(-m * 0.5)} ${n(-m * 0.6)}l${n(-m * 0.5)} ${n(-m * 0.6)}M${n(m * 0.5)} ${n(m * 0.6)}l${n(m * 0.5)} ${n(m * 0.6)}M${n(-m * 0.5)} ${n(m * 0.6)}l${n(-m * 0.5)} ${n(m * 0.6)}" ${S} stroke-width="${n(m * 0.3)}" stroke-linecap="round"/></g>`; }
    case 'newt': { const m = L * 0.4; return `<ellipse rx="${n(m)}" ry="${n(m * 0.16)}" ${F}/><path d="M${n(m * 0.5)} 0v${n(m * 0.4)}M${n(m * 0.5)} 0v${n(-m * 0.4)}M${n(-m * 0.4)} 0v${n(m * 0.4)}M${n(-m * 0.4)} 0v${n(-m * 0.4)}" ${S} stroke-width="2" stroke-linecap="round"/><path d="M${n(-m)} 0H${n(-m * 1.5)}" ${S} stroke-width="2.4" stroke-linecap="round" class="gcs-tail"/>`; }
    case 'squid': { let d = ''; for (let i = 0; i < 5; i++) d += `M${n(-L * 0.1)} ${n(-L * 0.1 + i * L * 0.05)}Q${n(-L * 0.3)} ${n(-L * 0.14 + i * L * 0.08)} ${n(-L * 0.46)} ${n(-L * 0.16 + i * L * 0.08)}`; return `<g class="gcs-tail"><path d="${d}" ${S} stroke-width="1.8" fill="none" stroke-linecap="round"/></g><ellipse cx="${n(L * 0.1)}" rx="${n(L * 0.26)}" ry="${n(L * 0.12)}" ${F}/>`; }
    case 'seahorse': { const m = L * 0.5; return `<g class="gcs-bob"><path d="M${n(-m * 0.1)} ${n(-m * 0.5)}C${n(m * 0.4)} ${n(-m * 0.6)} ${n(m * 0.4)} ${n(-m * 0.1)} ${n(m * 0.1)} 0S${n(m * 0.2)} ${n(m * 0.5)} ${n(-m * 0.2)} ${n(m * 0.4)}" ${S} stroke-width="${n(m * 0.26)}" fill="none" stroke-linecap="round"/></g>`; }
    case 'puffer': { const R = L * 0.26; let d = ''; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; d += `M${n(Math.cos(a) * R)} ${n(Math.sin(a) * R)}L${n(Math.cos(a) * (R + 3))} ${n(Math.sin(a) * (R + 3))}`; } return `<g class="gcs-pulse"><circle r="${n(R)}" ${F}/><path d="${d}" ${S} stroke-width="1.6"/></g>${_gcpShadowTail('fan', -R, L * 0.6, R * 0.4, fill, op)}`; }
    case 'skel': { let d = ''; for (let i = 0; i < 6; i++) d += `M${n(-L * 0.24 + i * L * 0.08)} ${n(-L * 0.1)}v${n(L * 0.2)}`; return `<path d="M${n(-L * 0.4)} 0H${n(L * 0.36)}" ${S} stroke-width="2.2" stroke-linecap="round"/><path d="${d}" ${S} stroke-width="1.6" stroke-linecap="round"/><ellipse cx="${n(L * 0.36)}" rx="${n(L * 0.09)}" ry="${n(L * 0.1)}" ${F}/>`; }
  }
  const R = _GCP_SHADOW[fam]; if (!R) return '';
  const rx = L * R[0], ry = L * R[1], x = R[3];
  const body = _gcpSmooth([[-rx, -ry * 0.24], [-rx * 0.3, -ry * 0.86], [rx * 0.3, -ry], [rx, 0], [rx * 0.3, ry], [-rx * 0.3, ry * 0.86], [-rx, ry * 0.24]]);
  let s = _gcpShadowTail(R[2], -rx + 1, L, ry, fill, op) + `<path d="${body}" ${F}/>`;
  if (x === 'wings') s += `<g class="gcs-fin"><path d="M${n(rx * 0.3)} ${n(-ry * 0.7)}L${n(-rx * 0.1)} ${n(-ry - L * 0.2)}L${n(-rx * 0.2)} ${n(-ry * 0.5)}ZM${n(rx * 0.3)} ${n(ry * 0.7)}L${n(-rx * 0.1)} ${n(ry + L * 0.2)}L${n(-rx * 0.2)} ${n(ry * 0.5)}Z" ${F}/></g>`;
  if (x === 'sail') s += `<path d="M${n(rx * 0.4)} ${n(-ry)}Q${n(-rx * 0.1)} ${n(-ry - L * 0.26)} ${n(-rx * 0.4)} ${n(-ry)}Z" ${F}/>`;
  if (x === 'tall') s += `<path d="M${n(rx * 0.3)} ${n(-ry)}L${n(-rx * 0.5)} ${n(-ry - L * 0.2)}L${n(-rx * 0.4)} ${n(-ry)}ZM${n(rx * 0.3)} ${n(ry)}L${n(-rx * 0.5)} ${n(ry + L * 0.2)}L${n(-rx * 0.4)} ${n(ry)}Z" ${F}/>`;
  if (x === 'beak') s += `<path d="M${n(rx)} 0H${n(rx + L * 0.1)}" ${S} stroke-width="1.6" stroke-linecap="round"/>`;
  if (x === 'paddle') s += `<ellipse cx="${n(rx + L * 0.14)}" rx="${n(L * 0.14)}" ry="${n(ry * 0.56)}" ${F}/>`;
  if (x === 'plate') { let d = ''; for (let i = 0; i < 6; i++) d += `M${n(-rx * 0.8 + i * rx * 0.3)} ${n(-ry * 1.3)}v${n(ry * 2.6)}`; s += `<path d="${d}" ${S} stroke-width="1"/>`; }
  if (x === 'whisk') s += `<path d="M${n(rx)} ${n(-ry * 0.3)}l${n(L * 0.1)} ${n(-L * 0.08)}M${n(rx)} ${n(ry * 0.3)}l${n(L * 0.1)} ${n(L * 0.08)}" ${S} stroke-width="1.1" stroke-linecap="round"/>`;
  if (x === 'lure') s += `<circle class="gcs-pulse" cx="${n(rx + L * 0.12)}" r="${n(L * 0.05)}" fill="#ffe27a" fill-opacity=".7"/>`;
  if (x === 'plumes') { let d = ''; for (let i = 0; i < 8; i++) { const a = -1.1 + i * 0.32, b = i < 4 ? 1 : -1; d += `M${n(-rx * 0.1)} 0L${n(-rx * 0.5 + Math.abs(a) * 3)} ${n(b * (ry + L * 0.18))}`; } s += `<path d="${d}" ${S} stroke-width="1.3" stroke-linecap="round"/>`; }
  return s;
}
/** How much the shadow's own wobble is: a slithering thing wriggles by its joints and does not swing as well; a flat thing glides. */
function gardenFishWobble(def) { const f = gardenFishFamily(def); return f === 'eel' || f === 'oar' || f === 'lamprey' || f === 'jelly' || f === 'seahorse' || f === 'puffer' ? 0.15 : f === 'ray' || f === 'flatfish' || f === 'turtle' || f === 'crab' ? 0.4 : f === 'pike' || f === 'gar' || f === 'sturgeon' ? 0.55 : 1; }
/* ---------- real sizes, and what the catch moment needs ---------- */
function gardenCreatureFamily(kind, def) { return !def ? '' : kind === 'fish' ? (def.cat === 'fish' ? gardenFishFamily(def) : '') : kind === 'bug' ? gardenBugFamily(def) : ''; }
/** The share of the picture it fills in the book: a minnow is small on its page, a sturgeon fills it. */
function gardenCreatureSizeK(kind, def) {
  if (!def) return 1;
  if (kind === 'fish') { if (def.cat !== 'fish') return 1; const cm = (def.cm[0] + def.cm[1]) / 2; return Math.max(0.42, Math.min(1, 0.4 + 0.6 * Math.log(Math.max(1, cm) / 3) / Math.log(100))); }
  return Math.max(0.5, Math.min(1, 0.5 + 0.5 * (def.size - 0.7) / 0.9));
}
/** How big it is in the hands, against the old fixed size. The very fish you caught: cm when told. */
function gardenCreatureHoldK(kind, def, cm) {
  if (kind === 'fish') { if (!def || def.cat !== 'fish') return 1; const v = Number(cm) || (def.cm[0] + def.cm[1]) / 2; return Math.max(0.6, Math.min(2.4, Math.sqrt(v) / 7.2)); }
  if (kind === 'bug' && def) return Math.max(0.55, Math.min(1.45, 0.55 + 0.75 * (def.size - 0.7)));
  return 1;
}
/** What happens around it while it is held up, behind and in front: water off a fish, dust off a wing, light off anything legendary. The same on every screen: nothing but the ids in `got`. */
function gardenCreatureMomentFx(kind, def, y) {
  const fam = gardenCreatureFamily(kind, def); if (!fam) return { back: '', over: '', cls: '' };
  const n = _gfaN, r = def.rarity; let back = '', over = '';
  if (r === 'legendary' || r === 'epic') { const R = r === 'legendary' ? 62 : 46, count = r === 'legendary' ? 14 : 9; let d = ''; for (let i = 0; i < count; i++) { const a = i / count * 6.283, w = 0.08; d += `M0 0L${n(Math.cos(a - w) * R)} ${n(Math.sin(a - w) * R)}L${n(Math.cos(a + w) * R)} ${n(Math.sin(a + w) * R)}z`; } back += _gcpJoint(0, y, 'gcm-shine', `<path d="${d}" fill="${r === 'legendary' ? '#ffe27a' : '#fff6d8'}" fill-opacity=".34"/>`); }
  if (kind === 'fish') {
    const drops = fam === 'jelly' || fam === 'puffer' || fam === 'seahorse' ? 'gcm-bub' : 'gcm-drop';
    for (let i = 0; i < 4; i++) { const x = [-30, -21, 21, 30][i], cls = drops; over += _gcpJoint(x, y + 8, cls, cls === 'gcm-bub' ? '<circle r="2" fill="#dff3fa" fill-opacity=".7" stroke="#8ac0d8" stroke-width=".5"/>' : '<path d="M0 -2.6C1.3 -.7 1.8 .2 1.8 1A1.8 1.8 0 0 1 -1.8 1C-1.8 .2 -1.3 -.7 0 -2.6z" fill="#8ac8e8" stroke="#4a8ab0" stroke-width=".4"/>', '', `animation-delay:${n(i * 0.17)}s`); }
  } else {
    const glow = fam === 'firefly', col = glow ? '#e8f07a' : '#fff0b0';
    if (glow) back += `<circle class="gcm-halo" cx="0" cy="${n(y)}" r="30" fill="#e8f07a" fill-opacity=".34"/>`;
    if (fam === 'butterfly' || fam === 'moth' || fam === 'firefly') for (let i = 0; i < 6; i++) over += _gcpJoint(-24 + i * 9.6, y + 2, 'gcm-dust', `<circle r="1.2" fill="${col}" stroke="#c8a23a" stroke-width=".3"/>`, '', `animation-delay:${n(i * 0.21)}s`);
    if (fam === 'spider') over += `<path d="M0 ${n(y - 34)}V${n(y - 6)}" stroke="#d8d8d0" stroke-width=".8"/>`;
  }
  return { back, over, cls: `gcm gcm-${kind} gcmf-${fam}${r === 'legendary' ? ' gcm-leg' : ''}` };
}
