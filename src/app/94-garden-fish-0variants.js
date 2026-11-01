/* ============================================================
   GARDEN, VARIANTS OF FISH AND BUGS: THE TABLE (docs/dev/GARDEN_TOGETHER.md section 23). PURE: tables and small functions, no DOM, no state; Node evaluates it after the
   fish catalogue (lib/friends/garden.mjs), so a friend's snapshot is checked against these same ids. The owner, 1 Nov 2026: "variants, so like shiny, glowing, evil, angel ...
   EVERYTHING you can think of, to make every fish caught unique".

   ONE ROW IS ONE VARIANT. An id is saved and sent to friends: never rename or reuse one. Add one: a row here; a new mark to draw goes in 94-garden-fish-1vart.js.
     tier    how rare (GARDEN_VARIANT_TIERS: the words, how much more the market pays, how big the moment is)
     one     1 in this many of what spawns, in ordinary conditions
     for     'both', 'fish' or 'bug'
     only    it cannot appear unless this holds. A list means any one of them
     more    [[condition, times], ...] what raises the odds. THE WORDS THE PLAYER READS ARE MADE FROM THIS (gardenVariantHow), so they can never disagree with the game
     size    [lo, hi] times the size it would have been; diff: harder in the reel; fat: heavier
     look    what it looks like (94-garden-fish-1vart.js): c, c2, c3, mix (recolour), p (pattern), op, scale, fx (marks on the drawing), water (what its shadow shows)
   A condition: {tod, season, rain, snow, moon, event, zone, hab, work, chum, frenzy}. The one who decides rolls it when the thing spawns: gardenVariantRoll.
   ============================================================ */
const GARDEN_VARIANT_TIERS = Object.freeze({
  uncommon: Object.freeze({ id: 'uncommon', label: 'Uncommon', rank: 1, sell: 1.25 }),
  rare: Object.freeze({ id: 'rare', label: 'Rare', rank: 2, sell: 1.5 }),
  epic: Object.freeze({ id: 'epic', label: 'Very rare', rank: 3, sell: 2 }),
  legendary: Object.freeze({ id: 'legendary', label: 'Legendary', rank: 4, sell: 3 }),
  lifetime: Object.freeze({ id: 'lifetime', label: 'Once in a lifetime', rank: 5, sell: 5 }),
});
const GARDEN_VARIANT_MAX_SHARE = 0.3;   // never more than this share of what spawns is a variant, whatever the conditions: common things stay common
const _gvR = (id, name, tier, one, look, o) => Object.freeze(Object.assign({ id, name, tier, one, look: Object.freeze(look), for: 'both', only: null, more: Object.freeze([]), blurb: '' }, o || {}));
const GARDEN_VARIANTS = Object.freeze([
  /* ---------- uncommon: you will see these ---------- */
  _gvR('speckled', 'Speckled', 'uncommon', 60, { fx: ['speck:#3a2a1a'], water: { spark: '#d8e6ee' } }, { blurb: 'Freckled all over.' }),
  _gvR('pale', 'Pale', 'uncommon', 60, { c: '#efe8d8', mix: 0.55, c2: '#faf6ea', mix2: 0.6, water: { fill: '#8fb6c8', op: 0.5 } }, { blurb: 'All the colour has washed out of it.' }),
  _gvR('dusky', 'Dusky', 'uncommon', 60, { c: '#3a3550', mix: 0.55, fx: ['sheen:#8a7ab8'], water: { fill: '#1a1538', op: 0.55 } }, { more: [[{ tod: 'dusk' }, 4]], blurb: 'The colour of the sky just after sunset.' }),
  _gvR('tiny', 'Tiny', 'uncommon', 70, { scale: 0.62, fx: [], water: { spark: '#ffffff' } }, { size: [0.35, 0.55], fat: 0.8, blurb: 'Perfect in every way, and far too small.' }),
  _gvR('mossy', 'Mossy', 'uncommon', 60, { c: '#6a8a4a', mix: 0.35, fx: ['moss:#5a8a3a'], water: { fill: '#16402a', op: 0.5 } }, { more: [[{ work: 'reed-beds' }, 2], [{ hab: 'woods' }, 2], [{ room: 'hothouse' }, 6]], blurb: 'Has not moved much lately.' }),
  _gvR('barnacled', 'Barnacled', 'uncommon', 70, { fx: ['barnacles:#d8d2c0'], water: { fill: '#2a3a44', op: 0.5 } }, { for: 'fish', more: [[{ zone: 'deep' }, 2]], fat: 1.1, blurb: 'Carrying a few passengers.' }),
  _gvR('sunlit', 'Sunlit', 'uncommon', 45, { c: '#f4c04a', mix: 0.4, fx: ['sheen:#fff2b0', 'spark:#ffe27a'], water: { fill: '#d8b84a', op: 0.42, spark: '#fff2b0' } }, { only: { tod: ['day'] }, more: [[{ season: 'summer' }, 2]], blurb: 'The sun seems to follow it about.' }),
  _gvR('moonlit', 'Moonlit', 'uncommon', 45, { c: '#b8cce8', mix: 0.6, c2: '#eef4ff', mix2: 0.7, fx: ['sheen:#ffffff', 'aura:#cfe0ff:0.16'], water: { fill: '#dce8ff', op: 0.5, aura: ['#cfe0ff', 0.14] } }, { only: { tod: ['night'] }, more: [[{ moon: 'full' }, 4]], blurb: 'Silver, and only about when the moon is.' }),
  _gvR('rain-kissed', 'Rain-kissed', 'uncommon', 25, { c: '#6a9ac4', mix: 0.3, fx: ['drops:#bfe6ff'], water: { spark: '#bfe6ff' } }, { only: { rain: true }, blurb: 'Beaded with rain that never quite runs off.' }),
  _gvR('blossom', 'Blossom', 'uncommon', 40, { c: '#f4b4c4', mix: 0.45, fx: ['petals:#fbd0dc'], water: { fill: '#c88a9a', op: 0.42 } }, { only: { season: ['spring'] }, more: [[{ hab: 'flower' }, 2]], blurb: 'Petals cling to it all spring.' }),
  _gvR('autumn', 'Autumn', 'uncommon', 40, { c: '#c86a2a', mix: 0.55, c2: '#e8b04a', mix2: 0.5, fx: ['leaves:#b8501a'], water: { fill: '#6a3a14', op: 0.45 } }, { only: { season: ['autumn'] }, blurb: 'Turned with the leaves.' }),
  _gvR('festive', 'Festive', 'uncommon', 30, { fx: ['partyhat:#e0483c', 'spark:#ffe27a'], water: { spark: '#ffb0a0' } }, { only: { event: 'festival' }, blurb: 'Somebody has told it about the festival.' }),
  /* ---------- rare ---------- */
  _gvR('silver', 'Silver', 'rare', 250, { c: '#c4ccd4', mix: 0.85, c2: '#eef2f6', mix2: 0.85, c3: '#8a949e', fx: ['sheen:#ffffff', 'spark:#ffffff'], water: { fill: '#c8d4dc', op: 0.55, spark: '#ffffff' } }, { blurb: 'Like a new coin.' }),
  _gvR('golden', 'Golden', 'rare', 400, { c: '#e8b828', mix: 0.92, c2: '#fbe27a', mix2: 0.9, c3: '#b88a10', fx: ['sheen:#fff6c0', 'spark:#fff2a0'], water: { fill: '#e8c24a', op: 0.6, spark: '#fff2a0' } }, { blurb: 'Solid gold, by the look of it. It is not. It is still worth a lot.' }),
  _gvR('albino', 'Albino', 'rare', 300, { c: '#f8f4ee', mix: 0.95, c2: '#ffffff', mix2: 0.95, c3: '#f0d8d8', p: '', eye: '#e04a5a', water: { fill: '#f4f6f8', op: 0.62 } }, { more: [[{ room: 'cave' }, 12]], blurb: 'White from nose to tail, with pink eyes.' }),
  _gvR('melanistic', 'Melanistic', 'rare', 300, { c: '#1a1a22', mix: 0.92, c2: '#2c2c36', mix2: 0.9, c3: '#0c0c12', fx: ['sheen:#5a5a70'], water: { fill: '#02060c', op: 0.72 } }, { blurb: 'Melanistic means jet black: the opposite of an albino.' }),
  _gvR('shiny', 'Shiny', 'rare', 450, { sat: 1, fx: ['sheen:#ffffff', 'spark:#ffffff', 'spark2:#ffe27a'], water: { spark: '#ffffff', aura: ['#ffffff', 0.1] } }, { blurb: 'Exactly the same as any other, only it gleams.' }),
  _gvR('glowing', 'Glowing', 'rare', 350, { c: '#a8f4d8', mix: 0.5, c2: '#e4fff4', mix2: 0.7, fx: ['aura:#7ff0c8:0.26'], water: { fill: '#c4ffe8', op: 0.7, aura: ['#7ff0c8', 0.28] } }, { more: [[{ tod: 'night' }, 5], [{ work: 'night-lantern' }, 2]], blurb: 'Lights up the water around it.' }),
  _gvR('tiger', 'Tiger-striped', 'rare', 200, { c: '#e88a2a', mix: 0.5, fx: ['bars:#1a1410'], water: { fill: '#3a2410', op: 0.5, spark: '#f4b04a' } }, { blurb: 'Bold black bars. It knows it looks good.' }),
  _gvR('harlequin', 'Harlequin', 'rare', 250, { fx: ['patches:#e0483c', 'patches2:#f4e8d8'], water: { fill: '#8a3a3a', op: 0.5 } }, { blurb: 'Patches of red and cream, no two alike.' }),
  _gvR('scarred', 'Battle-scarred', 'rare', 250, { c: '#7a6a5a', mix: 0.3, fx: ['scars:#f0e0d0'], water: { fill: '#14202a', op: 0.6 } }, { size: [1.05, 1.25], diff: 1, blurb: 'It has got away from better anglers than you.' }),
  _gvR('dapper', 'Dapper', 'rare', 500, { fx: ['tophat:#1a1a22', 'monocle:#e8c24a'], water: { crown: '#10141c' } }, { blurb: 'No one knows where it got the hat.' }),
  _gvR('stained-glass', 'Stained-glass', 'rare', 300, { fx: ['facets:#e0483c', 'facets2:#3a6fc4', 'sheen:#ffffff'], water: { spark: '#a8c8ff' } }, { for: 'bug', more: [[{ hab: 'flower' }, 2]], blurb: 'Its wings are like a church window.' }),
  _gvR('giant', 'Giant', 'rare', 150, { scale: 1.14, fx: [], water: { aura: ['#07233a', 0.16] } }, { size: [1.35, 1.8], diff: 2, fat: 1.2, more: [[{ zone: 'deep' }, 3]], blurb: 'Far bigger than one of these has any right to be.' }),
  /* ---------- very rare ---------- */
  _gvR('lucky', 'Lucky', 'epic', 777, { c: '#6ac46a', mix: 0.35, fx: ['clover:#2f8a3f', 'spark:#d8ffc0'], water: { fill: '#2a8a4a', op: 0.5, spark: '#d8ffc0' } }, { blurb: 'A perfect four-leaf clover on its side.' }),
  _gvR('storm', 'Storm-touched', 'epic', 800, { c: '#4a5a7a', mix: 0.65, c2: '#8a9ab8', mix2: 0.5, fx: ['bolts:#ffe84a', 'aura:#c8d8ff:0.14'], water: { fill: '#2a3a5a', op: 0.62, spark: '#ffe84a' } }, { only: [{ rain: true }, { event: 'storm' }], more: [[{ event: 'storm' }, 5]], diff: 1, blurb: 'Crackling, faintly.' }),
  _gvR('starry', 'Starry', 'epic', 1000, { c: '#141c44', mix: 0.92, c2: '#242c64', mix2: 0.9, c3: '#0c1030', fx: ['stars:#ffffff', 'spark:#cfe0ff'], water: { fill: '#10183c', op: 0.72, spark: '#ffffff' } }, { only: { tod: ['night'] }, more: [[{ moon: 'new' }, 3], [{ event: 'meteor' }, 10]], blurb: 'A piece of the night sky, swimming.' }),
  _gvR('ghost', 'Ghost', 'epic', 1200, { c: '#dce8f0', mix: 0.85, c2: '#f4f8fc', mix2: 0.85, op: 0.58, fx: ['wisps:#dce8f0'], water: { fill: '#f0f6fa', op: 0.38, aura: ['#ffffff', 0.1] } }, { only: { tod: ['night', 'dawn', 'dusk'] }, more: [[{ event: 'fog' }, 8]], blurb: 'You can see the water through it.' }),
  _gvR('crystal', 'Crystal', 'epic', 1500, { c: '#bfe8f4', mix: 0.85, c2: '#e8fbff', mix2: 0.85, c3: '#8ac8dc', op: 0.86, fx: ['facets:#ffffff', 'facets2:#8ad4ec', 'spark:#ffffff'], water: { fill: '#cfeef8', op: 0.55, spark: '#ffffff' } }, { more: [[{ zone: 'deep' }, 2], [{ room: 'cave' }, 6]], blurb: 'Rings like a glass when you tap it.' }),
  _gvR('frozen', 'Frozen', 'epic', 500, { c: '#bcdcf0', mix: 0.8, c2: '#ecf8ff', mix2: 0.85, c3: '#8ab8d8', fx: ['frost:#ffffff', 'icicles:#dff4ff', 'spark:#ffffff'], water: { fill: '#dff2ff', op: 0.6, spark: '#ffffff', aura: ['#bfe6ff', 0.14] } }, { only: { season: ['winter'] }, more: [[{ snow: true }, 3]], diff: 1, blurb: 'Cold to the touch, and quite unbothered.' }),
  _gvR('rainbow', 'Rainbow', 'epic', 1500, { fx: ['bands', 'sheen:#ffffff', 'spark:#ffffff'], water: { fill: '#c88ae0', op: 0.5, spark: '#ffe27a', aura: ['#8ad0ff', 0.12] } }, { more: [[{ rain: true }, 4]], blurb: 'Every colour at once.' }),
  _gvR('ember', 'Ember', 'epic', 1500, { c: '#3a1a14', mix: 0.85, c2: '#6a2a1a', mix2: 0.8, fx: ['cracks:#ff8a2a', 'aura:#ff6a2a:0.16'], water: { fill: '#c8481a', op: 0.6, aura: ['#ff6a2a', 0.2] } }, { more: [[{ season: 'summer' }, 3]], blurb: 'Still warm. The water steams a little.' }),
  _gvR('skeleton', 'Skeleton', 'epic', 1500, { c: '#20242c', mix: 0.85, c2: '#2c303a', mix2: 0.85, fx: ['ribs:#f4f0e4'], water: { fill: '#e8e4d8', op: 0.45 } }, { more: [[{ tod: 'night' }, 3]], blurb: 'Nothing but bones, and still it pulled.' }),
  _gvR('pirate', 'Pirate', 'epic', 1800, { fx: ['eyepatch:#14141a', 'scars:#f0e0d0', 'bow:#c83a3a'], water: { crown: '#14141a' } }, { more: [[{ zone: 'deep' }, 2]], diff: 1, blurb: 'Has been at sea longer than this lake has been here.' }),
  _gvR('patchwork', 'Patchwork', 'epic', 2000, { fx: ['patches:#c8a24a', 'patches2:#6a8ac8', 'stitch:#3a2a1a'], water: { fill: '#6a5a3a', op: 0.5 } }, { blurb: 'Sewn together by someone who cared a great deal.' }),
  _gvR('clockwork', 'Clockwork', 'epic', 2500, { c: '#b88a3a', mix: 0.85, c2: '#d8b45a', mix2: 0.85, c3: '#7a5a1a', fx: ['gears:#6a4a14', 'sheen:#fff0c0'], water: { fill: '#a87a2a', op: 0.6, spark: '#ffe27a' } }, { diff: 1, blurb: 'You can hear it ticking.' }),
  /* ---------- legendary ---------- */
  _gvR('ancient', 'Ancient', 'legendary', 4000, { c: '#6a6452', mix: 0.75, c2: '#8a846e', mix2: 0.7, c3: '#3a3628', fx: ['cracks:#2a2618', 'moss:#5a7a3a', 'barnacles:#c8c2ae'], water: { fill: '#04101c', op: 0.74, aura: ['#04101c', 0.16] } }, { size: [1.1, 1.45], diff: 3, fat: 1.3, more: [[{ zone: 'deep' }, 3]], blurb: 'Older than the garden. Older than the lake, possibly.' }),
  _gvR('royal', 'Royal', 'legendary', 5000, { c: '#5a2a8a', mix: 0.8, c2: '#e8c24a', mix2: 0.5, c3: '#3a1a5a', fx: ['crown:#e8c24a', 'sheen:#d8b8ff', 'spark:#fff2a0'], water: { fill: '#3a1a6a', op: 0.66, crown: '#e8c24a', spark: '#fff2a0' } }, { diff: 2, blurb: 'It expects you to bow.' }),
  _gvR('two-headed', 'Two-headed', 'legendary', 5000, { fx: ['twohead'], water: { two: 1 } }, { diff: 1, blurb: 'The heads do not agree about much.' }),
  _gvR('cursed', 'Cursed', 'legendary', 5000, { c: '#3a2a5a', mix: 0.85, c2: '#6aa84a', mix2: 0.55, c3: '#1a1030', eye: '#9aff4a', fx: ['wisps:#8aff5a', 'aura:#6a2a9a:0.22'], water: { fill: '#2a1a4a', op: 0.74, aura: ['#7aff4a', 0.16] } }, { more: [[{ moon: 'new' }, 4]], diff: 2, blurb: 'You should probably put that back.' }),
  _gvR('angel', 'Angel', 'legendary', 6000, { c: '#fbf6e8', mix: 0.92, c2: '#ffffff', mix2: 0.92, c3: '#f4e4b0', fx: ['aura:#fff2c0:0.24', 'wings:#ffffff', 'halo:#f4c83a', 'spark:#fff6c8'], water: { fill: '#fffbe8', op: 0.72, aura: ['#fff2c0', 0.24], halo: '#ffe27a', wings: '#ffffff' } }, { more: [[{ tod: 'dawn' }, 3]], blurb: 'A halo and small white wings. It seems very calm about it.' }),
  _gvR('evil', 'Evil', 'legendary', 6000, { c: '#2a0c10', mix: 0.92, c2: '#6a1218', mix2: 0.85, c3: '#14060a', eye: '#ff2a1a', fx: ['aura:#3a0408:0.34', 'horns:#c8281a', 'brow:#14060a', 'wisps:#c8281a'], water: { fill: '#14040a', op: 0.82, aura: ['#6a0810', 0.32], horns: '#c8281a' } }, { more: [[{ tod: 'night' }, 2], [{ event: 'blood-moon' }, 30]], diff: 3, blurb: 'Two small horns, and a look you do not like.' }),
  _gvR('void', 'Void', 'legendary', 8000, { c: '#04040a', mix: 0.98, c2: '#08081a', mix2: 0.98, c3: '#000000', eye: '#ffffff', fx: ['aura:#14083a:0.4', 'stars:#8a7aff'], water: { fill: '#000000', op: 0.9, aura: ['#2a1a6a', 0.3] } }, { more: [[{ moon: 'new' }, 2], [{ zone: 'deep' }, 2]], diff: 3, blurb: 'It is not dark. It is an absence of everything else.' }),
  /* ---------- once in a lifetime ---------- */
  _gvR('prismatic', 'Prismatic', 'lifetime', 30000, { fx: ['rays:#ffffff', 'bands', 'facets:#ffffff', 'sheen:#ffffff', 'spark:#ffffff', 'spark2:#ffe27a'], water: { fill: '#f0d8ff', op: 0.72, aura: ['#c8a0ff', 0.3], spark: '#ffffff' } }, { more: [[{ rain: true }, 2]], blurb: 'Light comes out of it in pieces.' }),
  _gvR('celestial', 'Celestial', 'lifetime', 40000, { c: '#141c54', mix: 0.92, c2: '#2c3c8a', mix2: 0.9, c3: '#0c1030', eye: '#fff2c0', fx: ['rays:#fff2c0', 'aura:#8aa8ff:0.3', 'orbit:#ffe27a', 'stars:#ffffff', 'halo:#ffe27a', 'spark:#ffffff'], water: { fill: '#1c2a7a', op: 0.78, aura: ['#8aa8ff', 0.32], halo: '#ffe27a', spark: '#ffffff' } }, { more: [[{ moon: 'full' }, 2], [{ event: 'meteor' }, 5]], diff: 3, blurb: 'It fell. Nobody has worked out from where.' }),
  _gvR('phoenix', 'Phoenix', 'lifetime', 40000, { c: '#e8481a', mix: 0.9, c2: '#fbc84a', mix2: 0.9, c3: '#a82a0c', eye: '#fff2c0', fx: ['rays:#ffc84a', 'flames:#ff6a1a:#ffd84a', 'wings:#ffb03a', 'spark:#fff2a0'], water: { fill: '#ff7a2a', op: 0.76, aura: ['#ffb03a', 0.32], flame: '#ffc84a', wings: '#ffb03a' } }, { more: [[{ tod: 'dawn' }, 2], [{ season: 'summer' }, 2]], diff: 3, blurb: 'Burns, and is not burned.' }),
  _gvR('eldritch', 'Eldritch', 'lifetime', 50000, { c: '#142a2a', mix: 0.92, c2: '#2a4a4a', mix2: 0.88, c3: '#0a1414', eye: '#c8ff4a', fx: ['aura:#0a3a3a:0.4', 'tentacles:#1a4a4a', 'eyes:#c8ff4a', 'wisps:#8aff9a'], water: { fill: '#04181a', op: 0.88, aura: ['#2a8a7a', 0.3], two: 1 } }, { more: [[{ moon: 'new' }, 2], [{ event: 'blood-moon' }, 3], [{ zone: 'deep' }, 2]], diff: 4, blurb: 'It looked back. All of it.' }),
]);
const _GV_BY = new Map(GARDEN_VARIANTS.map(v => [v.id, v]));
function gardenVariantDef(id) { return _GV_BY.get(String(id || '')) || null; }
function gardenVariantTier(v) { const V = typeof v === 'string' ? gardenVariantDef(v) : v; return V ? GARDEN_VARIANT_TIERS[V.tier] : null; }
function gardenVariantRank(v) { const t = gardenVariantTier(v); return t ? t.rank : 0; }
/** The variant if this thing can be one (an id from the table, of the right family, on a real fish or a bug), else null: all a host, a guest or a saved copy can say goes through here. */
function gardenVariantFor(kind, def, id) {
  const V = gardenVariantDef(id); if (!V || !def) return null;
  if (V.for !== 'both' && V.for !== kind) return null;
  return kind === 'fish' ? (def.cat === 'fish' ? V : null) : V;
}
function gardenVariantList(kind) { return GARDEN_VARIANTS.filter(V => !kind || V.for === 'both' || V.for === kind); }

/* ---------- the odds ---------- */
function _gvIs(want, have) { return Array.isArray(want) ? want.includes(have) : want === have; }
function _gvHit(c, ctx) {
  if (Array.isArray(c)) return c.some(x => _gvHit(x, ctx));
  for (const k of Object.keys(c)) {
    if (k === 'event') { if (!(ctx.event && ctx.event(c.event))) return false; }
    else if (k === 'work') { if (!(ctx.work && ctx.work(c.work))) return false; }
    else if (!_gvIs(c[k], ctx[k])) return false;
  }
  return true;
}
/** [[variantId, chance], ...] for something spawning in these conditions. ctx: {tod, season, rain, snow, moon, zone, hab, chum, frenzy, event(id), work(id)}. */
function gardenVariantOdds(kind, ctx) {
  const out = []; let sum = 0;
  for (const V of GARDEN_VARIANTS) {
    if (V.for !== 'both' && V.for !== kind) continue;
    if (V.only && !_gvHit(V.only, ctx)) continue;
    let p = 1 / V.one;
    for (const [c, x] of V.more) if (_gvHit(c, ctx)) p *= x;
    out.push([V.id, p]); sum += p;
  }
  if (sum > GARDEN_VARIANT_MAX_SHARE) { const k = GARDEN_VARIANT_MAX_SHARE / sum; for (const r of out) r[1] *= k; }
  return out;
}
/** What this one turns out to be: a variant's id, or '' for an ordinary one (most of them). */
function gardenVariantRoll(kind, ctx, rnd) {
  let r = rnd();
  for (const [id, p] of gardenVariantOdds(kind, ctx)) { r -= p; if (r < 0) return id; }
  return '';
}
/** How long it can be with this variant: never beyond the wire's 400 cm. */
function gardenVariantCmRange(def, v) {
  const V = gardenVariantDef(v), s = V && V.size;
  return s ? [Math.max(1, Math.floor(def.cm[0] * s[0])), Math.min(400, Math.ceil(def.cm[1] * s[1]))] : def.cm;
}
function gardenVariantSize(def, cm, v, rnd) {
  const V = gardenVariantDef(v), s = V && V.size; if (!s) return cm;
  const r = gardenVariantCmRange(def, v);
  return Math.max(r[0], Math.min(r[1], Math.round(cm * (s[0] + rnd() * (s[1] - s[0])))));
}

/* ---------- the same thing in plain words (made from the data above) ---------- */
const _GV_EVENT_WORDS = Object.freeze({ 'blood-moon': 'during a blood moon', meteor: 'during a meteor shower', fog: 'in fog', storm: 'in a storm', festival: 'during a festival', frenzy: 'when the fish are feeding', spawning: 'in the spawning days' });
const _GV_TOD_WORDS = Object.freeze({ dawn: 'at dawn', day: 'by day', dusk: 'at dusk', night: 'at night' });
const _GV_ZONE_WORDS = Object.freeze({ pond: 'in a pond', shallow: 'in the shallows', mid: 'in open water', deep: 'in deep water' });
const _GV_HAB_WORDS = Object.freeze({ flower: 'on flowers', lawn: 'on the lawn', ground: 'on the ground', tree: 'in trees', water: 'at the water’s edge', light: 'near lights', woods: 'in the woods' });
const _GV_ROOM_WORDS = Object.freeze({ cave: 'in the cave pool at the back of the mossy grotto', hothouse: 'in the old hothouse' });
const _GV_WORK_WORDS = Object.freeze({ 'reed-beds': 'once you have built a bed of reeds', 'night-lantern': 'once you have built a night lantern' });
function _gvOr(list) { return list.length < 2 ? list.join('') : list.slice(0, -1).join(', ') + ' or ' + list[list.length - 1]; }
function _gvWords(c) {
  if (Array.isArray(c)) return _gvOr(c.map(_gvWords));
  const bits = [], many = (v) => (Array.isArray(v) ? v : [v]);
  if (c.tod) bits.push(_gvOr(many(c.tod).map(t => _GV_TOD_WORDS[t] || t)));
  if (c.season) bits.push(_gvOr(many(c.season).map(s => 'in ' + s)));
  if (c.rain) bits.push('when it rains');
  if (c.snow) bits.push('when it snows');
  if (c.moon) bits.push(_gvOr(many(c.moon).map(m => (m === 'full' ? 'under a full moon' : m === 'new' ? 'when there is no moon' : 'under a ' + m + ' moon'))));
  if (c.event) bits.push(_GV_EVENT_WORDS[c.event] || c.event);
  if (c.zone) bits.push(_gvOr(many(c.zone).map(z => _GV_ZONE_WORDS[z] || z)));
  if (c.hab) bits.push(_gvOr(many(c.hab).map(h => _GV_HAB_WORDS[h] || h)));
  if (c.room) bits.push(_GV_ROOM_WORDS[c.room] || 'in a hidden room');
  if (c.work) bits.push(_GV_WORK_WORDS[c.work] || 'with ' + c.work);
  if (c.chum) bits.push('when you throw in chum');
  if (c.frenzy) bits.push('when the fish are feeding');
  return bits.join(' ');
}
function _gvOneIn(n) { return n >= 1000 ? Math.round(n).toLocaleString('en-GB') : String(Math.round(n)); }
/** How to find one, in plain words: ['Only at night.', 'Far likelier under a full moon.', 'About 1 in 45.']. */
function gardenVariantHow(v) {
  const V = typeof v === 'string' ? gardenVariantDef(v) : v; if (!V) return [];
  const up = (s) => s.charAt(0).toUpperCase() + s.slice(1), out = [];
  if (V.only) out.push(`Only ${_gvWords(V.only)}.`);
  for (const [c, x] of V.more) out.push(`${x >= 5 ? 'Far likelier' : x >= 2.5 ? 'Much likelier' : 'Likelier'} ${_gvWords(c)}.`);
  const whom = V.for === 'fish' ? 'fish' : V.for === 'bug' ? 'bugs' : 'fish and bugs';
  const lead = V.more.length ? 'otherwise about' : V.tier === 'lifetime' ? 'you may never see one: about' : 'about';
  out.push(`${up(lead)} 1 in ${_gvOneIn(V.one)} of the ${whom} you see${V.only ? ' then' : ''}.`);
  return out;
}

/* ---------- what a friend's snapshot may say about their specimens (gardenSnapshotClean) ---------- */
const GARDEN_SPEC_WIRE = Object.freeze({ fish: 6, bugs: 4 });
/** {f: [[fishId, variantId or '-', cm, q, serial]], b: [[bugId, variantId or '-', mm, q, serial]], vn: variants found, c: catches}. Ids from the tables, numbers in bounds; a variant this version does not know is drawn as an ordinary one. No names, no days, no places. */
function gardenSpecClean(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const int = (v, lo, hi) => { const n = Number(v); return Number.isInteger(n) && n >= lo && n <= hi ? n : null; };
  const rows = (list, kind, max) => {
    const out = [];
    if (Array.isArray(list)) for (const x of list.slice(0, max)) {
      if (!Array.isArray(x)) continue;
      const def = kind === 'fish' ? gardenFishDef(x[0]) : gardenBugDef(x[0]); if (!def || (kind === 'fish' && def.cat !== 'fish')) continue;
      const c = int(x[2], 1, 999), q = int(x[3], 0, 3), n = int(x[4], 0, 1e7); if (c === null || q === null || n === null) continue;
      const V = gardenVariantFor(kind, def, x[1]);
      out.push([def.id, V ? V.id : '-', c, q, n]);
    }
    return out;
  };
  const f = rows(raw.f, 'fish', GARDEN_SPEC_WIRE.fish), b = rows(raw.b, 'bug', GARDEN_SPEC_WIRE.bugs);
  const vn = int(raw.vn, 0, 999) || 0, c = int(raw.c, 0, 1e7) || 0;
  if (!f.length && !b.length && !vn) return null;
  return { f, b, vn, c };
}
