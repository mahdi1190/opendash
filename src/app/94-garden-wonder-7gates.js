/* ============================================================
   GARDEN WONDER, the gates' finds (94-garden-lands-0gates.js has the tables and the rule; docs/dev/GARDEN_PLAN.md, "Gates you open with a find").
   Each closed gate says plainly what it needs, with a picture, and who knows where it is. The find lies at a named place: a glint you walk up to,
   or a character who hands it over (sometimes for a fish). You take it to the gate and it opens; the mist behind it goes with the region.
   In your own garden only: a friend's gates are theirs, and show open or shut from their snapshot.
   ============================================================ */
const _wgt = { S: new Map(), hint: new Set(), glint: new Set() };
const WG_ITEM_ART = Object.freeze({
  shears() { const A = GART; return A.S('#5d6670', 2.2, 'M-12 -20L6 -6M-12 -6L6 -20') + A.P('#a8463a', A.circ(-14, -22, 3.6) + A.circ(-14, -4, 3.6)) + A.P('#f2e4c8', A.circ(-14, -22, 1.6) + A.circ(-14, -4, 1.6)) + A.S('#c8ccd0', 1.2, 'M2 -10L12 -17M2 -16L12 -9'); },
  plank() { const A = GART; return A.P('#b0864e', 'M-20 -12L18 -18L20 -12L-18 -6z') + A.S('#7a5a32', 0.8, 'M-14 -10L14 -15M-10 -8L6 -11') + A.P('#5a4630', A.circ(-15, -9, 0.9) + A.circ(15, -14, 0.9)); },
  lantern() { const A = GART; return A.S('#4a4a44', 1.4, 'M-4 -26Q0 -31 4 -26') + A.P('#5d6670', A.rrect(-7, -25, 14, 3, 1) + A.rrect(-8, -4, 16, 3, 1)) + A.P('#f2c45a', A.rrect(-6, -22, 12, 18, 2)) + A.P('#fff2b8', A.ell(0, -12, 3, 5)) + A.S('#5d6670', 1, 'M-6 -13H6M0 -22V-4'); },
  cog() { const A = GART; let t = ''; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, c = Math.cos(a), s = Math.sin(a); t += `M${(c * 9 - s * 2).toFixed(1)} ${(-12 + s * 9 + c * 2).toFixed(1)}L${(c * 13 - s * 2).toFixed(1)} ${(-12 + s * 13 + c * 2).toFixed(1)}L${(c * 13 + s * 2).toFixed(1)} ${(-12 + s * 13 - c * 2).toFixed(1)}L${(c * 9 + s * 2).toFixed(1)} ${(-12 + s * 9 - c * 2).toFixed(1)}z`; } return A.P('#9a7244', t + A.circ(0, -12, 10)) + A.P('#6e4e2c', A.circ(0, -12, 3.2)); },
  mill() { const A = GART; let s = ''; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; s += `M0 -14L${(Math.cos(a) * 12).toFixed(1)} ${(-14 + Math.sin(a) * 12).toFixed(1)}`; } return A.P('#5f8fae', 'M-20 0Q-10 -4 0 0T20 0V4H-20z', 0.8) + A.S('#7a5a32', 2.4, s) + A.S('#9a7244', 1.6, 'M0 -14m-12 0a12 12 0 1 0 24 0a12 12 0 1 0 -24 0') + A.P('#6e4e2c', A.circ(0, -14, 2.4)); },
  rope() { const A = GART; return A.S('#c4a066', 3, 'M0 -12m-12 0a12 7 0 1 0 24 0a12 7 0 1 0 -24 0') + A.S('#a8844a', 2.4, 'M0 -12m-7 0a7 4 0 1 0 14 0a7 4 0 1 0 -14 0') + A.S('#c4a066', 2, 'M10 -9Q16 -4 18 0'); },
});
/** A find's picture, for the gate prompt and the bag. */
function gardenGateItemSvg(key, px) { const it = GARDEN_GATE_ITEMS[key], d = it && WG_ITEM_ART[it.art]; return `<svg class="gd-gate-pic" viewBox="-24 -30 48 36" width="${px || 48}" height="${Math.round((px || 48) * 0.75)}" aria-hidden="true">${d ? d() : ''}</svg>`; }
function gardenGateHas(key) { return typeof gardenHas === 'function' && gardenHas('gk:' + key) > 0; }
function _wgtFishKinds() { try { return Object.keys(_gdG().fl || {}).filter(id => gardenFishDef(id)).length; } catch (e) { return 0; } }
function _wgtWho(id) { return typeof WD_FOLK_ROW !== 'undefined' && WD_FOLK_ROW.get(id) || null; }
/** The hint at a gate in the hinter's own voice (94-garden-wonder-1kin.js, wdFolkGateHint), else this table's plain line. {name, line} or null. */
function _wgtHint(gate, rule, m) {
  if (typeof wdFolkGateHint === 'function') { try { const h = wdFolkGateHint(gate.id, m); if (h && h.line) return { name: h.name || (_wgtWho(rule.who) || {}).name || '', line: h.line }; } catch (e) {} }
  const who = _wgtWho(rule.who); return who ? { name: who.name, line: rule.hint } : null;
}
/** What a closed zone needs, in words, for the land office and its map: {tag, line}, or null when it opens by level only. */
function gardenGateNeedWords(n) {
  const gate = gardenGateOf(Number(n)), rule = gate && gardenGateRule(gate), item = rule && GARDEN_GATE_ITEMS[rule.key]; if (!item) return null;
  const z = GARDEN_ZONES[gate.n], have = gardenGateHas(rule.key);
  return { tag: have ? 'Ready to open' : 'Needs ' + item.name.replace(/^(A|An|The) /, '').toLowerCase(), line: have ? `You have ${item.name.toLowerCase()}: take it to the gate.` : `Opens with ${item.name.toLowerCase()}, or by itself at garden level ${gardenZoneOpenLv(z)}.` };
}
/* ---------- the finds ---------- */
function _wgtGate(f) { return gardenGateOf(f.gate); }
/** Can this find be in the world now: its gate still shut, its level reached, not found, and whatever it needs first in your bag. */
function _wgtLive(f, m) {
  const gate = _wgtGate(f); if (!gate || m.visit || gardenGateHas(f.gives) || gardenGateIsOpen(gate, m.areas)) return false;
  if (m.level.level < gardenGateFindLv(gate)) return false;
  if (f.needs && f.needs.item && !gardenGateHas(f.needs.item)) return false;
  return true;
}
function _wgtSpot(f) {
  const p = gardenGateFindPoint(f); if (!p) return null;
  const ok = (x, y) => typeof gardenAreaOpenAt !== 'function' || gardenAreaOpenAt(Math.floor(x), Math.floor(y));
  if (!ok(p.x, p.y)) return null;   // (past a gate still shut: it shows once you can reach it)
  const q = wdFreeNear(p.x, p.y, 3) || p;
  return ok(q.x, q.y) ? { x: q.x, y: q.y } : null;
}
function _wgtArt(f) {
  const who = f.who && _wgtWho(f.who);
  if (who && typeof _wdFolkArt === 'function') return _wdFolkArt(who);
  const it = GARDEN_GATE_ITEMS[f.gives], d = it && WG_ITEM_ART[it.art];
  return `<g class="wg-find" transform="scale(.55)">${d ? d() : ''}</g><g class="gl-twinkle" transform="translate(7 -14)"><path d="M0 -5L1.2 -1.2L5 0L1.2 1.2L0 5L-1.2 1.2L-5 0L-1.2 -1.2z" fill="#fff4b8"/></g>`;
}
function _wgtPlace(f, m) {
  if (_wgt.S.has(f.id)) return;
  const at = _wgtSpot(f); if (!at) return;
  const who = f.who && _wgtWho(f.who), it = GARDEN_GATE_ITEMS[f.gives];
  const S = wdSprite({ id: 'wg-' + f.id, x: at.x, y: at.y, still: true, hit: 1.2, hitUp: who ? 14 : 8, label: who ? who.name : f.needs && f.needs.item ? 'The mill wheel' : 'Something glinting', cursor: 'hand', svg: _wgtArt(f), onClick: () => _wgtClick(f, S) });
  S._wgAt = at; S._wgName = it ? it.name : '';
  _wgt.S.set(f.id, S);
}
function _wgtDrop(id) { const S = _wgt.S.get(id); if (S) { S.remove(); _wgt.S.delete(id); } }
/** Take a find: once, by its item's id, in the ledger. */
function gardenGateTake(key) {
  const g = _gdG(), lk = 'gk.' + key; if (!GARDEN_GATE_ITEMS[key] || g.led[lk]) return false;
  g.led[lk] = { d: _gdToday(), k: 'gk', i: { ['gk:' + key]: 1 }, n: 1 };
  _gdSave();
  return true;
}
function _wgtClick(f, S) {
  const who = f.who && _wgtWho(f.who), it = GARDEN_GATE_ITEMS[f.gives], at = S._wgAt, gate = _wgtGate(f), rule = gate && gardenGateRule(gate);
  const art = who ? _wdFolkArt(who) : WG_ITEM_ART[it.art] ? WG_ITEM_ART[it.art]() : '';
  if (f.needs && f.needs.fish && _wgtFishKinds() < f.needs.fish) { wdTalk({ name: who ? who.name : it.name, at, art, lines: [f.ask || 'Not yet.'], bye: 'I’ll go fishing' }); return; }
  if (!gardenGateTake(f.gives)) return;
  _wgtDrop(f.id);
  _glFx(at.x, at.y, 'sparkle', { lift: 14 }); _glSound('twinkle');
  const tail = rule && rule.key === f.gives ? `Take it to the way into ${gardenZone(gate.n).name}: the gate is waiting.` : rule ? `Now: ${GARDEN_GATE_ITEMS[rule.key].name.toLowerCase()}.` : '';
  wdTalk({ name: who ? who.name : it.name, at, art: who ? art : `<g transform="translate(0 -6)">${art}</g>`, lines: f.lines.concat([`${it.name}: in your bag. ${tail}`]), bye: 'Thank you' });
}
/* ---------- the gate ---------- */
/** Open a gate with its find. {ok, msg}. */
function gardenGateOpen(gateId) {
  const gate = gardenGateOf(gateId), rule = gate && gardenGateRule(gate); if (!rule) return { ok: false, msg: 'This gate opens by itself' };
  const m = gardenModel(); if (m.visit) return { ok: false, msg: 'Your friend’s gate is theirs to open' };
  if (gardenGateIsOpen(gate, m.areas)) return { ok: true, msg: 'It is open already' };
  if (!gardenGateHas(rule.key)) return { ok: false, msg: `It needs ${GARDEN_GATE_ITEMS[rule.key].name.toLowerCase()}` };
  const g = _gdG(), lk = 'gt.' + gate.id;
  if (!g.led[lk]) g.led[lk] = { d: _gdToday(), k: 'gk', i: { ['gate:' + gate.id]: 1 }, n: 1 };
  _gdSave();
  _glFx(gate.door.x + 0.5, gate.door.y + 0.5, 'sparkle', { lift: 20 }); _glSound('twinkle');
  if (typeof gardenToast === 'function') gardenToast(rule.done, { icon: 'map-pin' });
  _gdEmit('landshow', {});   // (friends in a live garden see it open)
  return { ok: true, msg: rule.done };
}
/** The prompt at a gate: what is in the way, what it needs (with its picture), who knows. True when this gate has a rule and the prompt is open. */
function gardenGatePrompt(gate, at, m) {
  const rule = gardenGateRule(gate); if (!rule) return false;
  const zone = gardenZone(gate.n), item = GARDEN_GATE_ITEMS[rule.key], who = _wgtWho(rule.who), isOpen = gardenGateIsOpen(gate, m.areas);
  if (isOpen) { gardenBubbleOpen(at, { title: zone.name, sub: 'The way is open.', items: [], cls: 'is-empty is-words gd-gate' }); return true; }
  if (m.visit) { gardenBubbleOpen(at, { title: zone.name, sub: rule.block + ' This way is still shut in your friend’s garden.', items: [], cls: 'is-empty is-words gd-gate' }); return true; }
  const have = gardenGateHas(rule.key), lv = m.level.level, findLv = gardenGateFindLv(gate), openLv = gardenZoneOpenLv(zone);
  const said = _wgtHint(gate, rule, m), hint = !said ? '' : lv < findLv && !(typeof wdFolkGateHint === 'function') ? `${said.name} is still looking for it. Ask again at garden level ${findLv}.` : `${said.name}: “${said.line}”`;
  const need = { svg: gardenGateItemSvg(rule.key, 44), name: item.name, have };
  const items = have ? [{ svg: gardenGateItemSvg(rule.key, 22), label: rule.verb, text: rule.verb, cls: 'is-go gd-gate-use', run: (b) => { const r = gardenGateOpen(gate.id); if (!r.ok && typeof gameDenyOf === 'function') gameDenyOf({ ok: false, msg: r.msg }, b); } }] : [];
  gardenBubbleOpen(at, { title: zone.name, sub: rule.block, need, hint: have ? '' : hint, foot: have ? '' : `Still missing at garden level ${openLv}? ${who ? who.name + ' ' + rule.will : 'It opens by itself'}.`, items, cls: 'is-words gd-gate' + (items.length ? '' : ' is-empty') });
  return true;
}
/** The next-step card's line: the next shut gate you can reach, and what someone said about it. null when every gate is open. */
function gardenGateRumour(m) {
  if (!m || m.visit) return null;
  for (const gate of GARDEN_ZONE_GATES.slice().sort((a, b) => a.n - b.n)) {
    const rule = gardenGateRule(gate); if (!rule || gardenGateIsOpen(gate, m.areas)) continue;
    const region = gardenIslandRegionForZone(gate.n), from = region ? region.fromZone : 0; if (from && !m.areas.includes('zn-' + from)) continue;
    const who = _wgtWho(rule.who), it = GARDEN_GATE_ITEMS[rule.key], zone = gardenZone(gate.n), D = gate.door;
    const walk = { label: 'Walk to the gate', run: () => gardenWalkToPoint({ x: D.x + 0.5, y: D.y + 0.5 }, () => gardenGatePrompt(gate, { x: D.x + 0.5, y: D.y - 0.4 }, gardenHere()), { radius: 2 }) };
    if (gardenGateHas(rule.key)) return { icon: 'map-pin', title: `You have ${it.name.replace(/^(A|An) /, 'the ').toLowerCase()} for ${zone.name}`, text: 'The gate is waiting.', target: null, btn: walk, key: 'gate-have' + gate.id };
    if (m.level.level < gardenGateFindLv(gate)) continue;
    const f = GARDEN_GATE_FINDS.find(r => r.gate === gate.id && !gardenGateHas(r.gives) && (!r.needs || !r.needs.item || gardenGateHas(r.needs.item)));
    const said = _wgtHint(gate, rule, m);
    return { icon: 'message-circle', title: who ? `${who.name} has a tip about ${zone.name}` : zone.name, text: f && f.needs && f.needs.item ? f.ask : said ? said.line : rule.hint, target: null, btn: walk, key: 'gate-hint' + gate.id + (f ? f.id : '') };
  }
  return null;
}
wdMod({
  id: 'gate-finds', fun: false,
  begin(m) { _wgt.S.clear(); _wgt.hint.clear(); _wgt.glint.clear(); for (const f of GARDEN_GATE_FINDS) if (_wgtLive(f, m)) _wgtPlace(f, m); },
  tick(m) {
    if (m.visit) return;
    for (const f of GARDEN_GATE_FINDS) { if (_wgtLive(f, m)) _wgtPlace(f, m); else _wgtDrop(f.id); }
    // near a shut gate: what is in the way and who knows, once a visit; near a find: a glint
    for (const gate of GARDEN_ZONE_GATES) {
      const rule = gardenGateRule(gate); if (!rule || _wgt.hint.has(gate.id) || gardenGateIsOpen(gate, m.areas) || !wdNear(gate.door.x + 0.5, gate.door.y + 0.5, 4)) continue;
      if (typeof gardenAreaOpenAt === 'function' && !gardenAreaOpenAt(gate.door.x, gate.door.y)) continue;
      _wgt.hint.add(gate.id);
      const who = _wgtWho(rule.who), it = GARDEN_GATE_ITEMS[rule.key];
      wdAmbient(gardenGateHas(rule.key) ? `${rule.block} You have ${it.name.toLowerCase()}: click the gate.` : `${rule.block} ${who && m.level.level >= gardenGateFindLv(gate) ? who.name + ' might know where to find ' + it.name.toLowerCase() + '.' : ''}`, 9000, 'gate');
    }
    for (const [id, S] of _wgt.S) if (!_wgt.glint.has(id) && wdNear(S.x, S.y, 7)) { _wgt.glint.add(id); const f = GARDEN_GATE_FINDS.find(r => r.id === id); if (f && !f.who) wdAmbient(`Something is glinting near ${_wdLandmark(S.x, S.y)}.`, 7000, 'gate'); }
  },
  end() { for (const id of [..._wgt.S.keys()]) _wgtDrop(id); },
});
