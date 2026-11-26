/* ============================================================
   AFTER DARK, named moons (FUN-ROADMAP Phase 8, the bigger piece). Each month's full moon has a vale name and a small happening of its
   own (AD_MOONS), out in the world near you on its three nights, from dusk until dawn. The water's moon path follows the real phase and
   takes the named moon's colour; moonflowers you planted glow until morning and leave a moon drop; the moon calendar (Play, the
   Journal, the notice board) shows the next one by name and keeps its happening a surprise the first time.

   Everything here stands at KINDS of places (adSpots: open grass, a tree's foot, a still bank, a doorstep ...), the same on every
   screen; a creature comes only in your own garden (a friend sees it through yours). What you pick up is yours, once a night.
   Saves: ad.ms.<moon> (the night you first saw it), ad.p.<night>.<spot> (picked tonight), ad.md.<night>.<plant> (a moon drop).
   Rewards: the moon's keepsake (13, a year to fill), a little XP after that, its own gift (honey, a fruit, light feet), moonflower seeds
   (Wick's two the first time, a moon drop's one), a moon lantern at 3 moons seen and a moon dial at 12.
   ============================================================ */
const _adm = { on: false, ids: new Set(), spawned: new Set(), sound: 0, bolt: new Map(), seen: '' };
/* ---------- the drawings: feet at 0,0, world px (H, the gardener's height, is about 41) ---------- */
const _AD_ART = {
  tracks: () => { let s = ''; for (let i = 0; i < 7; i++) { const x = -26 + i * 9, y = (i % 2 ? -2 : 2) + Math.sin(i) * 1.5; s += `<ellipse cx="${x}" cy="${y}" rx="2.1" ry="1.2" fill="#3a3a44" opacity="0.32"/><ellipse cx="${x + 1.8}" cy="${y + 0.3}" rx="1.4" ry="0.9" fill="#3a3a44" opacity="0.26"/>`; } return s; },
  hair: () => `${GART.P('#000000', GART.ell(0, 0.5, 6, 1.4), 0.14)}${GART.S('#eef2f8', 0.9, 'M-6 -1C-2 -5 2 -1 6 -6')}${GART.S('#ffffff', 0.5, 'M-5 -1.6C-2 -4.6 2 -1.4 5 -5.4', 0.8)}${adGlint(-10, '#f2f6ff')}`,
  candle: () => `${GART.P('#000000', GART.ell(0, 0.6, 7, 1.8), 0.22)}<path d="M-5 0Q-6 -6 -5 -11H5Q6 -6 5 0Z" fill="#d8e8ec" opacity="0.55"/><path d="M-3.4 -1V-7.4H3.4V-1Z" fill="#f6eed8"/><path d="M-3.4 -7.4H3.4" stroke="#e0d4b8" stroke-width="0.8"/><path d="M0 -7.6V-8.6" stroke="#3a3028" stroke-width="0.6"/><g class="ad-flicker"><path d="M0 -14C-1.6 -11.4 -1.2 -9.2 0 -8.6C1.2 -9.2 1.6 -11.4 0 -14Z" fill="#ffb84a"/><path d="M0 -12.6C-0.7 -11 -0.5 -9.6 0 -9.2C0.5 -9.6 0.7 -11 0 -12.6Z" fill="#fff4c0"/></g><path d="M-4.4 -9.4Q-4.8 -5 -4.2 -1.2" stroke="#ffffff" stroke-width="0.8" opacity="0.6" fill="none"/><path d="M-5.4 -11.2H5.4" stroke="#a8b8bc" stroke-width="1.2" stroke-linecap="round"/>`,
  hares: () => { const one = (fl) => `<g transform="scale(${fl} 1)">${GART.P('#000000', GART.ell(0, 0.6, 7, 1.6), 0.2)}<path d="M-4 0C-6 -6 -5 -13 -1 -16C3 -18 5 -13 4 -8C4 -4 3 -1 2 0Z" fill="#9a7a58"/><path d="M-1 -1C-2 -5 -1.6 -9 0.4 -11C2 -9 2 -4 1.4 -1Z" fill="#d8c4a4"/><circle cx="-3.4" cy="-2" r="1.6" fill="#f4efe6"/><g class="ad-box"><path d="M2 -13L7.4 -15.4L8 -14L3 -11.2Z" fill="#8a6a4a"/><circle cx="7.8" cy="-14.8" r="1.2" fill="#7a5a3c"/></g><path d="M1 -16C2 -17 4 -17.4 5 -16.4C4.6 -15 3 -14.4 1.6 -14.8Z" fill="#9a7a58"/><circle cx="3.4" cy="-16.2" r="0.6" fill="#1a1410"/><path d="M1 -17C0 -24 1.4 -27 2.4 -27C3.2 -26 3 -21 2.2 -16.8Z" fill="#8a6a4a"/><path d="M1.6 -25.4C1.8 -26.6 2.6 -27.2 2.4 -27C2.6 -26 2.4 -25.4 2.1 -25Z" fill="#2a1e14"/><path d="M2.6 -17C3 -23.4 5 -26 6 -25.6C6.4 -24.4 5 -20.4 3.6 -16.6Z" fill="#9a7a58"/></g>`; return `<g transform="translate(-8 0)">${one(1)}</g><g transform="translate(8 0)">${one(-1)}</g>`; },
  croak: () => `<g class="ad-ripple"><ellipse rx="7" ry="2.4" fill="none" stroke="#e0f0e0" stroke-width="0.7" opacity="0.6"/></g><g class="ad-ripple ad-r2"><ellipse rx="7" ry="2.4" fill="none" stroke="#e0f0e0" stroke-width="0.7" opacity="0.6"/></g>`,
  pebble: () => `${GART.P('#000000', GART.ell(0, 0.6, 5.4, 1.5), 0.2)}${GART.P('#6a9a6c', GART.ell(0, -2.4, 5, 3))}${GART.P('#a8d0a0', GART.ell(-1.4, -3.6, 2, 1.1), 0.8)}${GART.S('#e8f8d8', 0.6, 'M4 -8q2 -2 4 0M6 -11q2 -2 4 0', 0.7)}${adGlint(-12, '#e8ffd8')}`,
  petals: () => { let s = ''; for (let i = 0; i < 7; i++) { const x = -16 + i * 5.2 + Math.sin(i * 2.3) * 4, y = -40 - (i * 13) % 46; s += `<g class="ad-fall" style="animation-delay:${(-i * 0.9).toFixed(1)}s"><ellipse cx="${x.toFixed(1)}" cy="${y}" rx="2" ry="1.2" fill="${i % 2 ? '#ffd6e8' : '#fff0f6'}" transform="rotate(${i * 40} ${x.toFixed(1)} ${y})"/></g>`; } return s; },
  petal: () => `${GART.P('#000000', GART.ell(0, 0.4, 4, 1), 0.12)}<ellipse cx="0" cy="-1.4" rx="3.4" ry="1.8" fill="#ffd6e8" transform="rotate(-18)"/><ellipse cx="-0.8" cy="-1.8" rx="1.4" ry="0.6" fill="#ffffff" opacity="0.7"/>${adGlint(-10, '#fff0f8')}`,
  worms: () => { let s = ''; for (let i = 0; i < 6; i++) { const x = -14 + i * 5.6 + Math.sin(i * 1.7) * 3, y = -1 - (i % 3) * 1.6; s += `<circle class="ad-blink" style="animation-delay:${(-i * 0.43).toFixed(2)}s" cx="${x.toFixed(1)}" cy="${y}" r="1.1" fill="#e8ff8a"/>`; } return s; },
  honey: () => `${GART.P('#000000', GART.ell(0, 0.5, 5, 1.3), 0.16)}${GART.P('#4e7a3a', 'M-6 -1C-3 -5 3 -5 6 -1C3 0 -3 0 -6 -1Z')}${GART.S('#3a5a2a', 0.5, 'M-5 -1.2Q0 -3 5 -1.2')}<path d="M0.6 -7C1.8 -5.4 2.8 -4.4 2.8 -3.4A2.2 1.8 0 0 1 -1.6 -3.4C-1.6 -4.4 -0.6 -5.4 0.6 -7Z" fill="#f2b23a"/><ellipse cx="-0.2" cy="-4.2" rx="0.6" ry="0.9" fill="#fff4c8" opacity="0.8"/>${adGlint(-12, '#ffe8a0')}`,
  rings: () => `<g class="ad-ripple"><ellipse rx="9" ry="3" fill="none" stroke="#eef4ff" stroke-width="0.8" opacity="0.55"/></g><g class="ad-ripple ad-r2"><ellipse rx="9" ry="3" fill="none" stroke="#eef4ff" stroke-width="0.8" opacity="0.55"/></g><g class="ad-ripple ad-r3"><ellipse rx="9" ry="3" fill="none" stroke="#eef4ff" stroke-width="0.8" opacity="0.55"/></g>`,
  scale: () => `${GART.P('#000000', GART.ell(0, 0.4, 4, 1.1), 0.14)}<ellipse cx="0" cy="-1.6" rx="3.2" ry="2.4" fill="#d8e0ec"/><path d="M-2.4 -1.6Q0 -4 2.4 -1.6" stroke="#ffffff" stroke-width="0.6" fill="none" opacity="0.8"/><ellipse cx="-1" cy="-2.4" rx="1" ry="0.6" fill="#ffffff" opacity="0.8"/>${adGlint(-10, '#f0f6ff')}`,
  lampworm: () => `${GART.S('#5a8a3a', 0.9, 'M0 0Q-1 -5 1 -9')}${GART.S('#6e9a48', 0.8, 'M-2 0Q-3 -4 -4 -6M2 0Q3 -3 4 -5')}<circle class="ad-blink" cx="1.2" cy="-9.4" r="1.6" fill="#eaff8a"/>${adGlint(-15, '#f0ffc0')}`,
  fruit: (s) => { const c = _adFruitColour(s && s.tree && s.tree.sp); return `${GART.P('#000000', GART.ell(0, 0.5, 5, 1.3), 0.2)}${GART.P(GART.dk(c, 0.2), GART.circ(0, -3.2, 3.4))}${GART.P(c, GART.circ(-0.4, -3.6, 3))}${GART.P('#ffffff', GART.ell(-1.4, -4.8, 1.2, 0.8), 0.7)}${GART.S('#5a3a20', 0.7, 'M0 -6.4V-8')}<path d="M0 -7.6Q2 -9 3 -7.4Q1.6 -7 0 -7.6Z" fill="#5e8a44"/>${adGlint(-14, '#fff4d8')}`; },
  mug: () => `${GART.P('#000000', GART.ell(0, 0.6, 6, 1.6), 0.24)}<path d="M-4 0V-8H4V0Z" fill="#e8dcc4"/><path d="M-4 -8H4V-6.6H-4Z" fill="#8a5a3a"/><path d="M4 -6.6C7 -6.6 7 -2.4 4 -2.4" stroke="#d8c8a8" stroke-width="1.4" fill="none"/><path d="M-4 0V-8" stroke="#fffaf0" stroke-width="0.8" opacity="0.7"/><g class="ad-steam">${GART.S('#ffffff', 0.9, 'M-1.4 -10C-3 -13 0 -15 -1.4 -18', 0.55)}${GART.S('#ffffff', 0.9, 'M1.6 -10C0 -13 3 -15 1.6 -19', 0.45)}</g>`,
  owl: (s) => `<g transform="translate(${s && s.tree ? ((s.tree.x - s.x) * 48).toFixed(1) : 0} ${s && s.tree ? (-118 + (s.tree.y - s.y) * 30).toFixed(1) : -118})"><path d="M-9 4H9" stroke="#4a3a2a" stroke-width="2.2" stroke-linecap="round"/><g class="ad-owl">${GART.P('#8a7a64', 'M-5 3C-7 -4 -5 -11 0 -11C5 -11 7 -4 5 3Z')}${GART.P('#c8b89c', 'M-3 2C-4 -3 -3 -7 0 -7C3 -7 4 -3 3 2Z')}${GART.P('#e8dcc4', GART.circ(-2, -8, 1.9) + GART.circ(2, -8, 1.9))}${GART.P('#1a1410', GART.circ(-2, -8, 0.8) + GART.circ(2, -8, 0.8))}${GART.P('#d8a83a', 'M-0.6 -6.6H0.6L0 -5.4Z')}${GART.P('#6a5a44', 'M-5 -10L-4 -13L-2.6 -10.6ZM5 -10L4 -13L2.6 -10.6Z')}</g></g>`,
  feather: () => `${GART.P('#000000', GART.ell(0, 0.4, 6, 1.2), 0.14)}<path d="M-6 0C-3 -4 3 -5 7 -4C3 -2 -2 -0.4 -6 0Z" fill="#b8a890"/>${GART.S('#7a6a54', 0.5, 'M-6 0C-1 -2 3 -3 7 -4')}${GART.S('#8a7a64', 0.4, 'M-2 -1.4L-1 -3M1 -2.2L2 -3.8M4 -3L5 -4.2')}${adGlint(-10, '#fff8e8')}`,
  frost: () => { let s = ''; for (let i = 0; i < 9; i++) { const x = -22 + (i * 37) % 44, y = -2 + ((i * 17) % 9) - 4; s += `<g transform="translate(${x} ${y})"><g class="ad-twinkle" style="animation-delay:${(-i * 0.31).toFixed(2)}s"><path d="M0 -2.4L0.5 -0.5L2.4 0L0.5 0.5L0 2.4L-0.5 0.5L-2.4 0L-0.5 -0.5Z" fill="#f4faff"/></g></g>`; } return `<ellipse rx="26" ry="7" fill="#e8f4ff" opacity="0.12"/>${s}`; },
  froststar: () => `${GART.P('#000000', GART.ell(0, 0.4, 5, 1.2), 0.12)}${GART.P('#dff0ff', GART.star(0, -3.6, 6, 4, 1.6))}${GART.P('#ffffff', GART.star(0, -3.6, 6, 1.8, 0.8), 0.8)}${adGlint(-12, '#f0f8ff')}`,
  bluelight: () => `<g class="ad-bob"><circle cy="-14" r="2.4" fill="#a8c8ff"/><circle cy="-14" r="1" fill="#ffffff"/></g>`,
  bluescale: () => `${GART.P('#000000', GART.ell(0, 0.4, 4, 1.1), 0.14)}<ellipse cx="0" cy="-1.6" rx="3.2" ry="2.4" fill="#6a9aee"/><ellipse cx="-1" cy="-2.4" rx="1" ry="0.6" fill="#ffffff" opacity="0.8"/>${adGlint(-10, '#d8e8ff')}`,
  drop: () => `<path d="M0 -7C1.4 -5.2 2.4 -4 2.4 -3A2.4 2 0 0 1 -2.4 -3C-2.4 -4 -1.4 -5.2 0 -7Z" fill="#e8f0ff" opacity="0.9"/><ellipse cx="-0.8" cy="-3.8" rx="0.6" ry="0.9" fill="#ffffff"/>${adGlint(-12, '#f4f8ff')}`,
};
/** A fruit tree's fruit: its colour, and the crop it gives (only a crop the garden knows). */
const _AD_FRUIT = Object.freeze({ apple: ['#c8402e', 'apple'], pear: ['#c8c04a', 'pear'], plum: ['#6a3a7a', 'plum'], damson: ['#4a2a5a', 'plum'], cherry: ['#b8202e', 'cherry'], quince: ['#e8c84a', 'quince'], fig: ['#7a4a6a', 'fig'], crab: ['#d86a3a', 'apple'], gage: ['#9ac84a', 'plum'], mulberry: ['#3a1a2a', 'mulberry'] });
function _adFruitOf(sp) { const w = String(sp || '').toLowerCase(); for (const k of Object.keys(_AD_FRUIT)) if (w.includes(k)) return _AD_FRUIT[k]; return null; }
function _adFruitColour(sp) { const f = _adFruitOf(sp); return f ? f[0] : '#c8602e'; }
/* ---------- tonight ---------- */
function _admTonight(N) { return N && N.dark && N.moon.full && N.moon.row ? N.moon.row : null; }
/** The words for the moon (the look-up view, the year's moon row, the chip): [headline, a line under it]. */
function gardenNightMoonLine(P, m) {
  if (!adOn()) return null;
  const N = adNow(m || gardenHere()), M = N.moon, row = M.full ? M.row : null, nx = adNextMoon(N.night, N.south);
  if (row) return [`${row.name} is full tonight`, adGet('ms.' + row.id) && adGet('ms.' + row.id) !== N.night ? row.line : 'Something happens on its nights. Go out and look.'];
  const ph = M.name === 'new' ? 'The moon is new' : `The moon is ${M.name}`;
  return [ph, nx ? `${nx.row.name} is in ${_wdPlural(nx.days, 'night')}.` : 'The next full moon is a little way off.'];
}
/* ---------- the happening, in view ---------- */
function _admDraw(m, N, row) {
  const want = new Set(), mine = !m.visit && _gl.W && _gl.W.own;
  row.parts.forEach((part, i) => {
    let spots = adSpots(part.at, part.n, row.id + i, m);
    if (!spots.length && part.or) spots = adSpots(part.or, part.pick ? 1 : part.n, row.id + i + 'o', m);
    if (!spots.length && part.pick && part.or !== 'grass' && part.at !== 'grass') spots = adSpots('grass', 1, row.id + i + 'g', m);   // (a moon's find is always somewhere near: open grass when its own kind of place is not)
    for (const s of spots) {
      const id = 'mn-' + s.id, picked = !!adGet('p.' + N.nn + '.' + s.id);
      if (part.pick && picked) continue;
      const bs = part.bolt ? _adm.bolt.get(id) : '';
      if (bs === 'run') { want.add(id); continue; }   // (off over the grass: its own update moves it)
      if (bs === 'gone') { _admPickHere(id + 'k', s, row, part, N, true); want.add(id + 'k'); continue; }
      want.add(id);
      const svg = (_AD_ART[part.art] || _AD_ART.drop)(s), z = part.art === 'owl' ? s.y + 0.05 : part.art === 'rings' || part.art === 'croak' || part.art === 'tracks' ? s.y - 0.4 : s.y;
      if (part.pick && !part.bolt) _admPickHere(id, s, row, part, N, false, svg, z);
      else adSprite(id, { x: s.x, y: s.y, z, svg, hit: 0 });
      if (part.glow) wdGlow('ad-' + id, adGlowSvg(part.glow, part.art === 'petals' ? 34 : 16, part.art === 'petals' ? 60 : 8), s.x, s.y);
      if (part.spawn && mine && !_adm.spawned.has(id) && typeof gardenLifeSpawn === 'function') { _adm.spawned.add(id); try { gardenLifeSpawn(part.spawn, { at: { x: s.x + 0.6, y: s.y, fade: 0 } }); } catch (e) { /* no room just now */ } }
      if (part.sound && wdNear(s.x, s.y, 9) && _wd.t - _adm.sound > 11) { _adm.sound = _wd.t + Math.random() * 6; wdSound(part.sound === 'hoot' ? [[392, 0.32, 'sine', 0.02], [370, 0.5, 'sine', 0.018, 0.42]] : [[196, 0.12, 'square', 0.006], [174, 0.14, 'square', 0.006, 0.16], [196, 0.1, 'square', 0.005, 0.34]]); }
      if (part.bolt && wdNear(s.x, s.y, part.bolt) && !_adm.bolt.get(id)) _admBolt(id, s, row, part, N);
    }
  });
  return want;
}
/** The hares bolt when you come close: they run off over the grass, and something is left where they stood. */
function _admBolt(id, s, row, part, N) {
  _adm.bolt.set(id, 'run'); const S = _ad.sprites.get(id); const side = (typeof _gw !== 'undefined' && _gw.px < s.x) ? 1 : -1;
  if (S) { S.t = 0; S.still = false; S.update = function (dt, Sp) { Sp.t += dt; Sp.x += side * dt * 5.5; Sp.lift = Math.abs(Math.sin(Sp.t * 11)) * 6; if (Sp.t > 1.4) { adSprite(id, null); _adm.bolt.set(id, 'gone'); } }; }
  wdAmbient('Two hares, boxing in the moonlight. Gone, before you could say so.', 5000, 'moon');
}
function _admPickHere(id, s, row, part, N, bolted, svg, z) {
  const art = bolted ? (row.id === 'hare' ? _AD_ART.hair() : _AD_ART.drop()) : svg;
  adPick(id, { x: s.x + (bolted ? 0.2 : 0), y: s.y, z: z == null ? s.y : z, svg: art, words: _admWords(row, part), run: () => _admTake(id, s, row, part, N) });
}
function _admWords(row, part) { return { candle: 'Look at the candle', mug: 'Drink the warm mug', fruit: 'Pick up the moonlit fruit', feather: 'Pick up the owl’s feather', hair: 'Pick up the silver hair', hares: 'Pick up the hare’s whisker', pebble: 'Pick up the singing pebble', petal: 'Pick up the glowing petal', honey: 'Take the drop of moon honey', scale: 'Pick up the moonlit scale', lampworm: 'Look at the glow-worm', froststar: 'Pick up the frost star', bluescale: 'Pick up the blue scale' }[part.art] || 'Pick it up'; }   // (keyed by the find's own drawing: the Owl Moon's was keyed 'owl', the bird, so its feather said only "Pick it up")
/** Picked: the moon's keepsake the first time, then a little; its own gift each time. Once a night for each place, for each person. */
function _admTake(id, s, row, part, N) {
  const n0 = adNow(); if (adGet('p.' + n0.nn + '.' + s.id)) return;
  adSet('p.' + n0.nn + '.' + s.id, 1);
  const first = !adHas(row.keep);
  if (first) adKeep(row.keep);
  const gift = Object.assign({ x: 1 }, row.gift || {});
  if (part.art === 'fruit') { const f = _adFruitOf(s.tree && s.tree.sp); if (f && typeof gardenPlant === 'function' && gardenPlant(f[1])) gift['crop:' + f[1]] = 1; }
  const said = { candle: 'It is still burning. Somebody lit it for anyone walking home late.', mug: 'Warm all the way down. Your feet feel lighter.', fruit: 'Cold from the night, and sweeter for it.' }[part.art] || '';
  if (row.feet) { try { gpSet('fx.feet', _gdNow() + 15 * 60000); } catch (e) { /* no pot here */ } }
  if (!first) adGive('mp.' + s.id, gift, said || 'A small thing to remember the ' + row.name.replace(/^The /, '') + ' by');
  else { adGive('mp.' + s.id, Object.assign({}, gift, { x: 0 })); if (said) setTimeout(() => wdAmbient(said, 5000, 'moon'), 2600); }
  try { _glFx(s.x, s.y, 'sparkle', { lift: 8 }); } catch (e) { /* no fx layer */ }
  adPick(id, null); wdGlowOff('ad-' + id);
}
/* ---------- moonflowers: open wide under a named moon, glow until morning, and leave a moon drop ---------- */
function _admFlowers(m, N, want) {
  let drops = 0; for (const k of Object.keys(_wdG())) if (k.startsWith('ad.md.' + N.nn + '.')) drops++;
  for (const p of m.plants) {
    if (p.def.id !== 'moonflower' || p.stage < 4) continue;
    const x = p.x + p.fp / 2, y = p.y + p.fp - 0.2; if (!adInView(x, y, 2)) continue;
    const id = 'mf-' + p.x + '-' + p.y, h = Math.round(((p.def.look && p.def.look.h) || 1.2) * 24);
    want.add(id);
    wdGlow('ad-' + id, `<circle class="ad-glow-b" cy="${-h}" r="26" fill="#dfe8ff" opacity="0.24"/><circle cy="${-h}" r="9" fill="#f4f8ff" opacity="0.5"/>`, x, y);
    if (adGet('md.' + N.nn + '.' + p.x + '-' + p.y) || drops >= 3) { adSprite(id, { x, y: y + 0.05, svg: '', hit: 0 }); continue; }
    adPick(id, { x: x + 0.3, y: y + 0.12, svg: _AD_ART.drop(), words: 'Take the moon drop', run: () => {
      const n0 = adNow(); if (adGet('md.' + n0.nn + '.' + p.x + '-' + p.y)) return;
      adSet('md.' + n0.nn + '.' + p.x + '-' + p.y, 1);
      adGive('md.' + p.x + '-' + p.y, { 'seed:moonflower': 1, x: 1 }, 'A moon drop: a moonflower seed was inside it');
      try { _glFx(x, y, 'sparkle', { lift: h * 0.5 }); } catch (e) { /* no fx */ }
      adPick(id, null);
    } });
  }
}
/* ---------- seeing a named moon: Wick's gift the first time, the lantern at 3, the dial at 12 ---------- */
function _admSeen(m, N, row) {
  const k = 'ms.' + row.id;
  if (_adm.seen === N.nn + row.id) return; _adm.seen = N.nn + row.id;
  if (!adGet(k)) adSet(k, N.night);
  const n = AD_MOON_IDS.filter(id => adGet('ms.' + id)).length;
  setTimeout(() => { if (_wd.on) wdAmbient(`Tonight is ${row.name}.${adHas(row.keep) ? '' : ' Something is different out here.'}`, 6000, 'moon'); }, 2400);
  if (adGrant('moonseed', { 'seed:moonflower': 2 })) setTimeout(() => { if (_wd.on) wdTalk({ name: 'A note from Wick', lines: [`“${row.name}. They come round, the named moons, one a month, and each one does something. Two moonflower seeds for you: they open for it.”`], at: { x: _gw.px, y: _gw.py }, bye: 'Thank you, Wick' }); }, 7000);
  if (n >= 3) adGrant('moons-3', { 'decor:moon-lantern': 1 }, 'Three named moons seen: a moon lantern is in your bag');
  if (n >= 12) adGrant('moons-12', { 'decor:moon-dial': 1 }, 'Twelve named moons: the moon dial is in your bag');
}
wdMod({
  id: 'ad-moon', pref: 'night', visit: true,
  begin() { _adm.ids = new Set(); _adm.spawned = new Set(); _adm.bolt = new Map(); },
  tick(m) {
    if (!adOn()) { if (_adm.ids.size) { adSpritesOff('mn-'); adSpritesOff('mf-'); _adm.ids = new Set(); } return; }
    const N = adNow(m), row = _admTonight(N), want = new Set();
    if (row) {
      _admSeen(m, N, row);
      for (const id of _admDraw(m, N, row)) want.add(id);
      _admFlowers(m, N, want);
    }
    for (const id of _adm.ids) if (!want.has(id)) { adSprite(id, null); _ad.picks.delete(id); wdGlowOff('ad-' + id); }
    _adm.ids = want;
  },
  end() { adSpritesOff('mn-'); adSpritesOff('mf-'); _adm.ids = new Set(); },
});
/** The lake's events that come from the moon (94-garden-fish-0tackle.js gardenCatchEventsAt asks): the Lamp Moon. 3sky adds shooting stars. */
function gardenNightLakeEvents(iso, tod) {
  if (!adOn() || tod !== 'night') return [];
  const out = [], south = _ad.N ? _ad.N.south : _gdSouth(), M = adMoonOf(iso, south);
  if (M.full && M.row && M.row.event) out.push(M.row.event);
  if (typeof adSkyLakeEvents === 'function') for (const id of adSkyLakeEvents(iso, south)) out.push(id);
  return out;
}

/* ---------- the moon calendar ---------- */
/** A moon at its age, drawn in its own svg: the lit part pale, the dark part faintly there. */
function adMoonSvg(age, r, tint) {
  const x = age / _WD_SYN, wax = x < 0.5, k = Math.cos(x * 2 * Math.PI), rx = Math.abs(k) * r, lit = tint || '#f6f2d8';
  const d = `M0 ${-r}A${r} ${r} 0 0 ${wax ? 1 : 0} 0 ${r}A${rx.toFixed(2)} ${r} 0 0 ${(k > 0) === wax ? 0 : 1} 0 ${-r}z`;
  return `<circle r="${r}" fill="#2a3450"/><path d="${d}" fill="${lit}"/><circle r="${r}" fill="none" stroke="${lit}" stroke-opacity="0.25" stroke-width="0.6"/>`;
}
function _adCss(n) { return '#' + (n >>> 0).toString(16).padStart(6, '0'); }
function gardenNightMoonOpen() {
  gpStage('The moon calendar', (el) => {
    el.classList.add('ad-cal');
    const m = gardenHere(), N = adNow(m), M = N.moon, tonight = M.full ? M.row : null, nx = adNextMoon(N.night, N.south);
    const top = gpEl('div', 'ad-cal-top'), big = gpEl('div', 'ad-cal-moon');
    big.innerHTML = `<svg viewBox="-34 -34 68 68" width="96" height="96" aria-hidden="true"><circle r="33" fill="${tonight ? tonight.css : '#f6f2d8'}" opacity="0.12"/>${adMoonSvg(M.age, 24, tonight ? tonight.css : '')}</svg>`;
    const words = gpEl('div', 'ad-cal-words');
    words.appendChild(gpEl('h3', 'gd-h3', tonight ? `Tonight: ${tonight.name.replace(/^The /, 'the ')}` : `Tonight: a ${M.name === 'new' ? 'new' : M.name} moon`));
    words.appendChild(gpEl('p', null, tonight ? (adHas(tonight.keep) ? tonight.line : 'Something happens on its nights. Go out and look: the line below says where.') : nx ? `${nx.row.name} is in ${_wdPlural(nx.days, 'night')}, on ${_adDayWords(nx.iso)}.` : 'The next full moon is a little way off.'));
    if (tonight && !adHas(tonight.keep)) words.appendChild(gpEl('p', 'muted', tonight.hint));
    top.append(big, words); el.appendChild(top);
    // the next four weeks, night by night
    const strip = gpEl('div', 'ad-cal-strip'); strip.setAttribute('role', 'list');
    for (let d = 0; d < 30; d++) {
      const iso = _gdAddDays(N.night, d), Q = adMoonOf(iso, N.south), named = Q.row && Q.mid === iso, c = gpEl('div', 'ad-cal-n' + (named ? ' is-named' : '') + (d === 0 ? ' is-now' : '')); c.setAttribute('role', 'listitem');
      c.innerHTML = `<small>${d === 0 ? 'Tonight' : esc(_adDayWords(iso, true))}</small><svg viewBox="-12 -12 24 24" width="26" height="26" aria-hidden="true">${adMoonSvg(Q.age, 9, named ? Q.row.css : '')}</svg>${named ? `<b>${esc(Q.row.name.replace(/^The /, ''))}</b>` : ''}`;
      c.setAttribute('aria-label', (d === 0 ? 'Tonight' : _adDayWords(iso)) + (named ? ': ' + Q.row.name : ''));
      strip.appendChild(c);
    }
    el.appendChild(strip);
    // the year's moons
    el.appendChild(gpEl('h3', 'gd-h3', 'The named moons'));
    const grid = gpEl('div', 'ad-cal-grid'), seen = AD_MOON_IDS.filter(id => adGet('ms.' + id));
    for (const row of AD_MOONS.concat([AD_MOON_BLUE])) {
      const was = adGet('ms.' + row.id), next = nx && nx.row === row, kept = adHas(row.keep), k = GL_KEEPSAKE.get(row.keep);
      const c = gpEl('div', 'ad-cal-c' + (was ? ' is-seen' : next ? ' is-next' : ''));
      const art = gpEl('span', 'ad-cal-art'); art.innerHTML = `<svg viewBox="-14 -14 28 28" width="40" height="40" aria-hidden="true">${was || next ? `<circle r="13" fill="${row.css}" opacity="0.18"/>${adMoonSvg(_WD_SYN / 2, 9, row.css)}` : adMoonSvg(_WD_SYN / 2, 9, '#5a6478')}</svg>`;
      const t = gpEl('span', 'ad-cal-t');
      t.appendChild(gpEl('b', null, was || next || row.mo === 0 ? row.name : `${_WD_MONTHS[(N.south ? (row.mo + 5) % 12 : row.mo - 1)]}’s moon`));
      t.appendChild(gpEl('small', was ? null : 'muted', was ? (kept ? row.line : 'Seen. Its keepsake is still out there. ' + row.hint) : next ? `In ${_wdPlural(nx.days, 'night')}. ${row.hint}` : '· · ·'));
      c.append(art, t);
      if (kept && k) { const ks = gpEl('span', 'ad-cal-k'); ks.innerHTML = `<svg viewBox="-10 -13 20 16" width="26" height="22" aria-hidden="true">${gardenKeepsakeSvg(k)}</svg>`; ks.setAttribute('data-tip', k.name); c.appendChild(ks); }
      grid.appendChild(c);
    }
    el.appendChild(grid);
    el.appendChild(gpEl('p', 'muted', `Named moons seen: ${seen.length} of ${AD_MOON_IDS.length}. ${seen.length < 3 ? 'At three, a moon lantern for your garden.' : seen.length < 12 ? 'At twelve, the moon dial.' : 'The whole year of them.'} Moonflowers you plant open wide under a named moon and leave a moon drop.`));
  });
}
function _adDayWords(iso, short) { const d = Number(iso.slice(8, 10)), mo = _WD_MONTHS[Number(iso.slice(5, 7)) - 1]; return short ? d + ' ' + mo.slice(0, 3) : d + ' ' + mo; }
gardenPlayAdd({ id: 'ad-moons', name: 'The moon calendar', icon: 'moon', group: 'secret', blurb: 'Each month’s full moon has a name and a night of its own. See which is next.',
  status: () => { try { if (!adOn()) return ''; const N = adNow(); if (N.moon.full && N.moon.row) return N.moon.row.name + ' tonight'; const nx = adNextMoon(N.night, N.south); return nx ? `${nx.row.name.replace(/^The /, '')} in ${_wdPlural(nx.days, 'night')}` : ''; } catch (e) { return ''; } },
  open: gardenNightMoonOpen });
