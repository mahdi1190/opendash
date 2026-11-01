/* ============================================================
   GARDEN, CRAFTING: what crafted things look like (2.23, agent 'craft').
     PET_CRAFT_ITEMS     the accessories you make for pets. Each is a design in the same format as the custom ones (97-pets-0kititems.js: shapes in the head frame, or the
                         neck frame), so it fits every species and every pose by itself, and it is only an id on the wire: a friend on this version draws it from here, an older one ignores it.
     petCraftDesign(id)  the clean design, or null
     gardenCraftArt(r, px)   a recipe's result as an <svg> string
     gardenCraftBenchArt(p, sc, o)   the bench in the world (a `kind` of GARDEN_PROPS)
   A new pet accessory: one row below, one recipe row. Its slot says where it goes: head (the head is a circle of radius 50 about 0,0), neck (0,0 is the middle of the collar, 100 its width), back (the neck's frame, drawn behind the body).
   ============================================================ */
const _gcR = (v) => Math.round(v * 10) / 10;
const _gcC = (x, y, r0) => { const r = _gcR(r0), k = _gcR(r * 0.5523); x = _gcR(x); y = _gcR(y); const R = _gcR; return `M${R(x - r)} ${y}C${R(x - r)} ${R(y - k)} ${R(x - k)} ${R(y - r)} ${x} ${R(y - r)}C${R(x + k)} ${R(y - r)} ${R(x + r)} ${R(y - k)} ${R(x + r)} ${y}C${R(x + r)} ${R(y + k)} ${R(x + k)} ${R(y + r)} ${x} ${R(y + r)}C${R(x - k)} ${R(y + r)} ${R(x - r)} ${R(y + k)} ${R(x - r)} ${y}Z`; };
const _gcE = (x, y, rx, ry) => { const a = _gcR(rx * 0.5523), b = _gcR(ry * 0.5523); return `M${x - rx} ${y}C${x - rx} ${y - b} ${x - a} ${y - ry} ${x} ${y - ry}C${x + a} ${y - ry} ${x + rx} ${y - b} ${x + rx} ${y}C${x + rx} ${y + b} ${x + a} ${y + ry} ${x} ${y + ry}C${x - a} ${y + ry} ${x - rx} ${y + b} ${x - rx} ${y}Z`; };
/** Five round petals and a middle, as shapes. */
const _gcFlower = (x, y, r, pet, mid) => { let d = ''; for (let i = 0; i < 5; i++) { const a = i * 1.2566 - 1.57; d += _gcC(Math.round((x + Math.cos(a) * r * 0.72) * 10) / 10, Math.round((y + Math.sin(a) * r * 0.72) * 10) / 10, Math.round(r * 0.56 * 10) / 10); } return [{ p: _gcC(x, y, r * 1.12), f: 'k2', o: 0.4 }, { p: d, f: pet }, { p: _gcC(x, y, Math.round(r * 0.42 * 10) / 10), f: mid }]; };
const _gcBand = (extra) => [{ p: 'M-54 -6Q0 10 54 -6L10 64Q0 72 -10 64Z', f: 'k1' }, { p: 'M10 64L54 -6Q30 3 16 4L3 70Q7 69 10 64Z', f: 'k1s', o: 0.7 }, { p: 'M-54 -6Q0 10 54 -6L54 2Q0 18 -54 2Z', f: 'k1d', o: 0.45 }, ...(extra || []), { p: _gcC(52, -4, 8), f: 'k1s' }, { p: 'M56 2L66 20L52 14ZM50 4L44 22L56 14Z', f: 'k1' }];
/** A smaller flower for strings of them: a design is limited to 4,000 characters of drawing (petItemClean), and a collar has many. */
const _gcFlowerLite = (x, y, r, pet, mid) => { const R = Math.round; let d = ''; for (let i = 0; i < 5; i++) { const a = i * 1.2566 - 1.57, P = (o, k) => `${R(x + Math.cos(a + o) * r * k)} ${R(y + Math.sin(a + o) * r * k)}`; d += `M${x} ${y}Q${P(-0.62, 1)} ${P(0, 1.08)}Q${P(0.62, 1)} ${x} ${y}Z`; } return [{ p: _gcC(x, y, r * 1.12), f: 'k2', o: 0.4 }, { p: d, f: pet }, { p: _gcC(x, y, R(r * 0.42 * 10) / 10), f: mid }]; };
const _gcRing = (f, n) => { const out = []; for (let i = 0; i < n; i++) { const t = i / (n - 1), x = -46 + 92 * t, y = 4 + 8 * Math.sin(t * Math.PI); out.push(..._gcFlowerLite(Math.round(x), Math.round(y), 13, f(i), 'k3')); } return [{ p: 'M-52 0Q0 14 52 0L52 7Q0 21 -52 7Z', f: 'k2' }, ...out]; };
const PET_CRAFT_ITEMS = Object.freeze([
  { id: 'pi-cbandberry', label: 'Berry bandana', slot: 'neck', cols: ['#c8324e', '#ffffff'], shapes: _gcBand([{ p: _gcC(-20, 12, 4) + _gcC(4, 16, 4) + _gcC(-6, 34, 4) + _gcC(22, 8, 4) + _gcC(14, 32, 3.4) + _gcC(-30, 4, 3), f: 'k2', o: 0.9 }]) },
  { id: 'pi-cbandherb', label: 'Herb bandana', slot: 'neck', cols: ['#5a9a4a', '#e8f4d0'], shapes: _gcBand([{ p: 'M-30 8Q-22 2 -14 10Q-22 16 -30 8ZM-6 20Q2 14 10 22Q2 28 -6 20ZM14 6Q22 0 30 8Q22 14 14 6ZM-8 40Q0 34 8 42Q0 48 -8 40Z', f: 'k2', o: 0.9 }]) },
  { id: 'pi-cbandblue', label: 'Bluebell bandana', slot: 'neck', cols: ['#4a6ad0', '#ffffff'], shapes: _gcBand([{ p: 'M-42 3L42 3M-30 16L30 16M-18 30L18 30M-8 44L8 44', s: 'k2', w: 3.4, o: 0.85 }]) },
  { id: 'pi-ccolldaisy', label: 'Daisy collar', slot: 'neck', cols: ['#ffffff', '#6aa84a', '#f6c544'], shapes: _gcRing(() => 'k1', 6) },
  { id: 'pi-ccollrose', label: 'Rose collar', slot: 'neck', cols: ['#d8405a', '#3f7a3a', '#f6a0b0'], shapes: _gcRing((i) => (i % 2 ? 'k1' : 'k1l'), 5) },
  { id: 'pi-ccolllav', label: 'Lavender collar', slot: 'neck', cols: ['#9a78d8', '#5a8a58', '#f4e4ff'], shapes: _gcRing((i) => (i % 2 ? 'k1' : 'k1s'), 7) },
  { id: 'pi-chatstraw', label: 'Tiny straw hat', slot: 'head', cols: ['#e8c868', '#c8483a', '#a8823a'], shapes: [{ p: _gcE(0, -46, 62, 13), f: 'k1' }, { p: 'M-62 -46Q0 -30 62 -46Q0 -38 -62 -46Z', f: 'k3', o: 0.7 }, { p: 'M-30 -48C-30 -82 -14 -92 0 -92C14 -92 30 -82 30 -48Q0 -40 -30 -48Z', f: 'k1' }, { p: 'M10 -90C24 -84 30 -70 30 -48Q22 -46 16 -45C20 -62 18 -78 10 -90Z', f: 'k1s', o: 0.7 }, { p: 'M-30 -58Q0 -50 30 -58L30 -48Q0 -40 -30 -48Z', f: 'k2' }, { p: 'M-40 -44Q-20 -38 0 -38M6 -38Q26 -38 44 -44M-22 -76Q-6 -84 12 -80', s: 'k3', w: 1.6, o: 0.5 }] },
  { id: 'pi-chatacorn', label: 'Acorn cap', slot: 'head', cols: ['#a07040', '#7a5230', '#c89860'], shapes: [{ p: 'M-44 -40C-44 -74 -22 -86 0 -86C22 -86 44 -74 44 -40Q0 -26 -44 -40Z', f: 'k1' }, { p: 'M-34 -62L-14 -44M-14 -80L14 -46M14 -82L36 -56M-40 -48L-26 -74M0 -84L-20 -46M22 -78L6 -44', s: 'k2', w: 3, o: 0.8 }, { p: 'M-4 -86Q0 -102 8 -104L12 -100Q6 -94 6 -86Z', f: 'k2' }, { p: 'M-44 -40Q0 -26 44 -40L44 -34Q0 -20 -44 -34Z', f: 'k2' }] },
  { id: 'pi-chatclover', label: 'Clover crown', slot: 'head', cols: ['#5aa848', '#3a7a30', '#f6d35e'], shapes: [{ p: 'M-40 -44Q0 -56 40 -44L40 -36Q0 -48 -40 -36Z', f: 'k2' }, ...[-34, -12, 12, 34].flatMap((x) => { const y = -52 - (x === -12 || x === 12 ? 6 : 0); return [{ p: _gcC(x - 8, y - 2, 9) + _gcC(x + 8, y - 2, 9) + _gcC(x, y - 14, 9), f: 'k1' }, { p: _gcC(x, y - 5, 3), f: 'k3' }]; })] },
  { id: 'pi-chatpump', label: 'Pumpkin cap', slot: 'head', cols: ['#f08a3c', '#c8641e', '#5f8a3a'], shapes: [{ p: _gcE(-24, -62, 24, 26), f: 'k1s' }, { p: _gcE(24, -62, 24, 26), f: 'k1s' }, { p: _gcE(0, -64, 26, 30), f: 'k1' }, { p: 'M-14 -88Q-20 -64 -14 -40M14 -88Q20 -64 14 -40', s: 'k2', w: 2.4, o: 0.8 }, { p: 'M-2 -92Q2 -106 12 -110L16 -104Q8 -100 6 -92Z', f: 'k3' }] },
  { id: 'pi-chatbonnet', label: 'Flower bonnet', slot: 'head', cols: ['#f4e8d8', '#e87a9a', '#f6c544'], shapes: [{ p: 'M-48 -34C-54 -74 -24 -90 0 -90C24 -90 54 -74 48 -34Q26 -60 0 -60Q-26 -60 -48 -34Z', f: 'k1' }, { p: 'M12 -88C32 -82 52 -66 48 -34Q38 -50 24 -54C28 -66 24 -80 12 -88Z', f: 'k1s', o: 0.5 }, ..._gcFlower(-24, -70, 12, 'k2', 'k3'), ..._gcFlower(6, -78, 14, 'k2', 'k3'), ..._gcFlower(30, -66, 11, 'k2', 'k3')] },
  { id: 'pi-cwingfairy', label: 'Fairy wings', slot: 'back', cols: ['#bfe8ff', '#ffffff', '#f6c8ff'], shapes: [{ p: 'M0 0C-30 -70 -110 -130 -170 -100C-180 -50 -90 10 0 0Z', f: 'k1', o: 0.72 }, { p: 'M0 0C-40 20 -120 30 -140 70C-90 90 -30 50 0 0Z', f: 'k3', o: 0.7 }, { p: 'M0 0C30 -70 70 -120 110 -100C120 -50 50 0 0 0Z', f: 'k1', o: 0.62 }, { p: 'M0 0C-40 -50 -90 -90 -150 -92M0 0C-50 -20 -100 -40 -160 -66M0 0C-40 20 -90 34 -128 64M0 0C24 -50 56 -86 100 -92', s: 'k2', w: 3, o: 0.85 }] },
  { id: 'pi-cwingbfly', label: 'Butterfly wings', slot: 'back', cols: ['#f08a3c', '#2a2124', '#f6d35e'], shapes: [{ p: 'M0 0C-40 -80 -130 -130 -170 -90C-176 -40 -90 16 0 0Z', f: 'k1' }, { p: 'M0 0C-40 14 -110 24 -130 74C-80 92 -24 56 0 0Z', f: 'k1s' }, { p: 'M0 0C24 -70 80 -116 112 -92C120 -44 50 6 0 0Z', f: 'k1' }, { p: 'M-170 -90C-176 -40 -150 -30 -120 -22C-140 -44 -150 -70 -170 -90Z', f: 'k2' }, { p: _gcC(-120, -74, 12) + _gcC(-82, -46, 9) + _gcC(-84, 40, 9) + _gcC(74, -62, 9), f: 'k3' }, { p: _gcC(-146, -62, 5) + _gcC(-120, -40, 5) + _gcC(-112, 58, 5), f: 'k2' }] },
  { id: 'pi-cwingleaf', label: 'Leaf wings', slot: 'back', cols: ['#6cbf4a', '#3f8a2e', '#a6d870'], shapes: [{ p: 'M0 0C-30 -80 -100 -130 -170 -120C-160 -50 -90 6 0 0Z', f: 'k1' }, { p: 'M0 0C-60 -40 -110 -80 -160 -116M-44 -26L-40 -66M-86 -56L-84 -96M-40 -22L-80 -14M-84 -52L-124 -44', s: 'k2', w: 3, o: 0.9 }, { p: 'M0 0C24 -70 60 -116 110 -116C116 -50 50 4 0 0Z', f: 'k3' }, { p: 'M0 0C30 -50 60 -80 104 -112', s: 'k2', w: 3, o: 0.9 }] },
]);
const _gcDesign = new Map();
/** A built-in accessory by its id. Nothing a friend sends can change one: friends send the id. */
function petCraftDesign(id) {
  if (typeof id !== 'string' || !id.startsWith('pi-c')) return null;
  if (_gcDesign.has(id)) return _gcDesign.get(id);
  const row = PET_CRAFT_ITEMS.find(x => x.id === id); let out = null;
  if (row) { const slot = row.slot === 'back' ? 'neck' : row.slot, r = petItemClean(Object.assign({}, row, { slot })); if (r.ok) { out = r.item; if (row.slot === 'back') out.back = true; } }
  _gcDesign.set(id, out);
  return out;
}
/** The field of a pet's look a design goes in. */
function petCraftField(id) { const r = PET_CRAFT_ITEMS.find(x => x.id === id); return r ? (r.slot === 'back' ? 'itemBack' : r.slot === 'neck' ? 'itemNeck' : 'itemHead') : ''; }
function petCraftItemSvg(id, px) {
  const it = petCraftDesign(id); if (!it) return '';
  const a = { hc: [0, 0, 50], neck: { x: 0, y: 0, w: 100, rot: 0 }, top: [0, -50, 60, 0] };
  const shapes = petItemShapes(it, a, 'cat').map(s => _ptShapeSvg(s)).join('');
  const vb = it.back ? '-180 -140 300 240' : it.slot === 'neck' ? '-75 -30 150 110' : '-78 -116 156 130';
  return `<svg class="gcr-art" viewBox="${vb}" width="${px}" height="${px}" aria-hidden="true" focusable="false">${shapes}</svg>`;
}
const _GC_TREAT_ART = Object.freeze({ 'berry-biscuit': 'strawberry', 'veg-stew': 'carrot', 'apple-crumble': 'apple', 'honey-cake': 'sunberry', 'fish-pie': 'fish', 'royal-feast': 'cookie' });
const _GC_ICON_T = ['#c8a24a', '#a8823a', '#e8c86a', '#7a5a2a'];
function gardenCraftArt(r, px) {
  const mk = r.make;
  try {
    if (mk.wear) {
      if (mk.wear[0] === 'hat') return `<svg class="gcr-art" viewBox="${['flowercrown', 'wildcirclet', 'leafwreath'].includes(mk.wear[1]) ? '24 14 52 30' : '10 2 80 52'}" width="${px}" height="${px}" aria-hidden="true" focusable="false">${_pfHatMore(mk.wear[1], _GC_ICON_T, false)}</svg>`;
      if (mk.wear[0] === 'scarf') return `<svg class="gcr-art" viewBox="${mk.wear[1] === 'daisychain' ? '32 68 36 22' : '26 66 48 40'}" width="${px}" height="${px}" aria-hidden="true" focusable="false">${_pfScarfMore(mk.wear[1], ['#4f8a5a', '#3a6a44', '#7ab088', '#2a4a30'], ['#f4e8d8', '#d8c8a8', '#fff4e4', '#a89878'], false)}</svg>`;
      return `<svg class="gcr-art" viewBox="55 82 13.600 13.600" width="${px}" height="${px}" aria-hidden="true" focusable="false">${_pfPinArt(mk.wear[1], false)}</svg>`;
    }
    if (mk.pet) return petCraftItemSvg(mk.pet, px);
    if (mk.decor) return gardenIconSvg(mk.decor, { kind: 'decor', px });
    if (mk.treats) return petTreatSvg(_GC_TREAT_ART[r.id] || 'cookie', px);
    if (mk.emote) return `<span class="gcr-art gcr-art-ic" style="--gcr-px:${px}px">${icon(r.id === 'music-box' ? 'music' : 'sparkles')}</span>`;
  } catch (e) { /* the plain mark below */ }
  return `<span class="gcr-art gcr-art-ic" style="--gcr-px:${px}px">${icon('package')}</span>`;
}
function gardenCraftIngredientArt(key, px) {
  const [kind, id] = String(key).split(':');
  try {
    if (kind === 'fish') return gardenCatchSvg('fish', id, px, { uid: 'cr' + id });
    if (kind === 'bug') return gardenCatchSvg('bug', id, px, { uid: 'cr' + id });
    return _gdxItemIcon(key, px);
  } catch (e) { return icon('package', 'i-sm'); }
}

/* ---------- the bench, in the world ---------- */
function gardenCraftBenchArt(p, sc, o) {
  const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, base = W.sky, cx = (p.x + p.w / 2) * cw, by = base + (p.y + p.h) * ch - 3, N = _gwN;
  const wood = '#b07a46', dark = '#6a4426', lite = '#d09a60', top = by - 34, hw = cw * 0.92;
  let s = `<ellipse cx="${N(cx)}" cy="${N(by + 2)}" rx="${N(hw + 6)}" ry="5" fill="#1a2a14" fill-opacity="0.22"/>`;
  // the legs, a shelf with jars underneath
  s += `<path d="M${N(cx - hw + 5)} ${N(top)}V${N(by)}h7V${N(top)}zM${N(cx + hw - 12)} ${N(top)}V${N(by)}h7V${N(top)}z" fill="${dark}"/>`;
  s += `<rect x="${N(cx - hw + 6)}" y="${N(by - 13)}" width="${N(hw * 2 - 12)}" height="4.500" fill="${wood}" stroke="${dark}" stroke-width="1"/>`;
  s += `<path d="M${N(cx - 22)} ${N(by - 13)}v-10q0 -2 2 -2h8q2 0 2 2v10z" fill="#9fd0e0" fill-opacity="0.9" stroke="#5a8aa0" stroke-width="0.8"/><rect x="${N(cx - 21)}" y="${N(by - 20)}" width="10" height="7" fill="#e8a04a" fill-opacity="0.8"/><path d="M${N(cx + 2)} ${N(by - 13)}v-8q0 -2 2 -2h6q2 0 2 2v8z" fill="#c9e8b8" fill-opacity="0.95" stroke="#6a9a58" stroke-width="0.8"/><rect x="${N(cx + 16)}" y="${N(by - 19)}" width="9" height="6" rx="1" fill="#c87a4a" stroke="${dark}" stroke-width="0.7"/>`;
  // the top
  s += `<path d="M${N(cx - hw)} ${N(top - 7)}H${N(cx + hw)}L${N(cx + hw + 3)} ${N(top + 2)}H${N(cx - hw - 3)}Z" fill="${lite}" stroke="${dark}" stroke-width="1.200" stroke-linejoin="round"/><rect x="${N(cx - hw - 3)}" y="${N(top + 2)}" width="${N(hw * 2 + 6)}" height="5" fill="${wood}" stroke="${dark}" stroke-width="1"/>`;
  s += `<path d="M${N(cx - hw + 10)} ${N(top - 3)}H${N(cx - 4)}M${N(cx + 6)} ${N(top - 4)}H${N(cx + hw - 12)}" stroke="${dark}" stroke-width="0.7" stroke-opacity="0.45"/>`;
  // a vice at the left, a hammer lying down, a saw hanging, flowers in a jar
  s += `<rect x="${N(cx - hw + 2)}" y="${N(top - 16)}" width="12" height="9" rx="1.500" fill="#7a8a96" stroke="#3e4a54" stroke-width="1"/><rect x="${N(cx - hw - 3)}" y="${N(top - 13)}" width="6" height="3" fill="#a8b4bc"/><circle cx="${N(cx - hw - 3)}" cy="${N(top - 11.500)}" r="2" fill="#3e4a54"/>`;
  s += `<g transform="translate(${N(cx + 2)} ${N(top - 10)}) rotate(-14)"><rect x="-14" y="-1.700" width="24" height="3.400" rx="1.500" fill="#b08a58" stroke="${dark}" stroke-width="0.7"/><rect x="8" y="-6" width="9" height="11" rx="1.500" fill="#6a7682" stroke="#3e4a54" stroke-width="0.9"/></g>`;
  s += `<path d="M${N(cx + hw - 20)} ${N(top - 7)}v-10q0 -2 2 -2h6q2 0 2 2v10z" fill="#bfe0ea" fill-opacity="0.85" stroke="#6a9ab0" stroke-width="0.8"/><path d="M${N(cx + hw - 15)} ${N(top - 18)}v-10M${N(cx + hw - 12)} ${N(top - 18)}l4 -9M${N(cx + hw - 18)} ${N(top - 18)}l-4 -8" stroke="#4a8a3a" stroke-width="1.300" stroke-linecap="round"/><circle cx="${N(cx + hw - 15)}" cy="${N(top - 30)}" r="3.600" fill="#f6a5c0"/><circle cx="${N(cx + hw - 7.500)}" cy="${N(top - 29)}" r="3.200" fill="#f6d35e"/><circle cx="${N(cx + hw - 23)}" cy="${N(top - 28)}" r="3.200" fill="#fff4f8"/>`;
  return s;
}
/* ---------- the pet wardrobe: what you made, one tap to put on ---------- */
function petCraftStrip(g) {
  try {
    if (typeof gardenRecipes !== 'function' || !state.garden || !state.garden.since) return null;
    const mine = gardenRecipes().filter(r => r.def.make.pet && r.owned > 0);
    if (!mine.length) return null;
    const box = _ptEl('section', 'card ptb-made');
    box.appendChild(secHead({ title: 'Made at the bench', icon: 'hammer' }));
    const row = _ptEl('div', 'ptb-made-row');
    for (const r of mine) {
      const on = gardenCraftWorn(r.def), b = _ptEl('button', 'ptb-made-b' + (on ? ' is-on' : '')); b.type = 'button'; b.setAttribute('aria-pressed', String(on));
      b.innerHTML = petCraftItemSvg(r.def.make.pet, 54); b.appendChild(_ptEl('span', null, r.def.name));
      b.onclick = () => { gardenCraftWearToggle(r.def); if (typeof _ptRefresh === 'function') _ptRefresh(); };
      row.appendChild(b);
    }
    box.appendChild(row);
    return box;
  } catch (e) { return null; }
}
