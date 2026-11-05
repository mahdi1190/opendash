/* Tool feedback stays in world space and advances on the existing scene clock. */
window.GardenNativeActions = (function () {
  'use strict';
  let live = null, paused = false;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const moving = () => typeof gardenMotionOn !== 'function' || gardenMotionOn();
  function context() {
    if (!window.GardenNative || !GardenNative.active()) return null;
    const scene = GardenNative.scene(), room = GardenNative.inRoom() && GardenNativeRooms.current(), world = GardenNative.world();
    return scene && { scene, room: room || null, world, parent: room ? room.root : world && world.rootNode._inner };
  }
  function clear() {
    const s = live; if (!s) return;
    s.particles.length = 0; s.contacts.length = 0; s.dedupe.clear(); if (s.air.active) s.air.clear(); if (s.ground.active) s.ground.clear(); s.airPainted = false; s.groundPainted = false;
    for (const patch of s.patches) if (patch.image.active) patch.image.destroy(); s.patches.length = 0;
    for (const swing of [...s.swings]) { swing.animation.cancel(); if (!swing.node._dead) swing.node.remove(); } s.swings.clear();
  }
  function destroy() {
    paused = false;
    const s = live; if (!s) return; clear(); live = null;
    s.scene.events.off('update', s.tick); s.scene.events.off('shutdown', destroy);
    for (const object of [s.air, s.ground, s.soil]) if (object.active) object.destroy();
  }
  function ensure() {
    const c = context(); if (!c || !c.parent) return null;
    if (live && (live.scene !== c.scene || !live.air.active || !live.ground.active || !live.soil.active)) destroy();
    if (!live) {
      const s = live = { scene: c.scene, room: c.room, parent: null, air: c.scene.add.graphics().setDepth(85010), ground: c.scene.add.graphics(), soil: c.scene.add.container(0, 0), particles: [], contacts: [], patches: [], swings: new Set(), dedupe: new Map(), counts: {}, time: 0, last: null, airPainted: false, groundPainted: false };
      s.tick = (time, delta) => update(time, delta); c.scene.events.on('update', s.tick); c.scene.events.once('shutdown', destroy);
    }
    const s = live;
    if (s.parent !== c.parent) {
      clear(); s.room = c.room; s.parent = c.parent;
      s.soil.setDepth(c.room ? 55 : -9199); s.ground.setDepth(c.room ? 66 : -9198);
      for (const object of [s.soil, s.ground, s.air]) { if (object.parentContainer) object.parentContainer.remove(object); c.parent.add(object); }
      c.parent.sort('depth'); if (c.world && c.world.depthChanged) c.world.depthChanged();
    }
    return s;
  }
  function soil(s, x, y, width, height) {
    const key = Math.round(x) + ':' + Math.round(y), old = s.patches.find(p => p.key === key);
    if (old) { old.age = 0; old.image.setDisplaySize(width, height); return; }
    if (s.patches.length >= 24) s.patches.shift().image.destroy();
    // Lighting already owns this feathered native texture. Reuse it without a
    // new bake, scene capture, or an uncached stack of gradient commands.
    const texture = '__garden-soft-' + s.scene.sys.settings.key;
    if (!s.scene.textures.exists(texture)) return;
    const image = s.scene.add.image(x, y, texture).setTint(0x39291c).setAlpha(.3).setDisplaySize(width, height);
    s.soil.add(image); s.patches.push({ key, image, age: 0, life: 18 });
  }
  function effect(kind, x, y, options) {
    options = options || {}; const s = ensure(); if (!s || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    const width = clamp(Number(options.width) || 28, 10, 160), height = clamp(Number(options.height) || width * .32, 4, 44), motion = moving();
    const key = kind + ':' + Math.round(x) + ':' + Math.round(y), previous = s.dedupe.get(key);
    if (previous != null && s.time - previous < (kind === 'water' || kind === 'soil' ? 1500 : 220)) return true;
    s.dedupe.set(key, s.time); if (s.dedupe.size > 96) s.dedupe.delete(s.dedupe.keys().next().value);
    s.counts[kind] = (s.counts[kind] || 0) + 1; s.last = { kind, x, y, width, height, motion };
    if (kind === 'water' || kind === 'soil') soil(s, x, y, width, height);
    if (kind === 'soil') return true;
    const palette = { water: 0x86cde0, plant: 0x9b7650, grow: 0xa7ce78, trim: 0x91b46b, feed: 0xc5a678, harvest: 0xd2bc76, gold: 0xf0d46f, lift: 0xd9c9a4, place: 0xbfa478, turn: 0xe8d9ae, style: 0xe8cea0 };
    const color = palette[kind] == null ? palette.grow : palette[kind];
    if (s.contacts.length >= 20) s.contacts.shift();
    s.contacts.push({ kind, x, y, width, height, color, age: 0, life: motion ? .55 : .7, motion });
    if (!motion || kind === 'turn' || kind === 'style') return true;
    const grounded = kind === 'lift' || kind === 'place' || kind === 'plant', falling = kind === 'water' || kind === 'feed', count = grounded ? 4 : kind === 'water' ? 7 : kind === 'gold' ? 10 : 6;
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2, spread = width * .3, water = kind === 'water';
      s.particles.push({ kind, color, x: x + (falling ? (i / (count - 1) - .5) * spread : Math.cos(angle) * (grounded ? width * .3 : 3)), y: y - (falling ? 16 + i % 3 * 4 : 3), groundY: y, vx: falling ? (i % 2 ? 1 : -1) * 3 : Math.cos(angle) * (10 + i % 3 * 5), vy: falling ? (water ? 22 : 12) + i % 3 * 5 : grounded ? -8 - i % 2 * 4 : -24 - i % 3 * 7, age: 0, life: grounded ? .38 : falling ? .65 : .7 + i % 3 * .08, size: water ? 1.4 : grounded ? 1.2 : 1.5 + i % 2 * .5, angle, spin: (i % 2 ? 1 : -1) * 2.3, landed: false });
    }
    if (s.particles.length > 96) s.particles.splice(0, s.particles.length - 96);
    return true;
  }
  function swing(node, tool, duration) {
    const s = ensure(); if (!s || !moving() || !node || !tool || !tool.animate) return false;
    if (s.swings.size >= 8) { const old = s.swings.values().next().value; old.animation.cancel(); old.node.remove(); s.swings.delete(old); }
    tool.style.transformOrigin = '8px 0px';
    const animation = tool.animate([{ rotate: '-38deg', opacity: .1 }, { rotate: '20deg', opacity: .95, offset: .7 }, { rotate: '28deg', opacity: 0 }], { duration: duration || 360, easing: 'ease-out', fill: 'forwards' });
    const row = { node, animation }; s.swings.add(row);
    animation.onfinish = () => { s.swings.delete(row); animation.cancel(); node.remove(); };
    if (paused) animation.pause();
    s.counts.swing = (s.counts.swing || 0) + 1; return true;
  }
  function update(time, delta) {
    // Keep dedupe time fresh while idle without looking up the room or clearing
    // empty Graphics on every scene frame. A new effect reconciles its parent.
    if (!live) return; live.time = time;
    if (!live.particles.length && !live.contacts.length && !live.patches.length && !live.swings.size && !live.airPainted && !live.groundPainted) return;
    const s = ensure(); if (!s) return; const dt = paused ? 0 : Math.min(.05, Math.max(0, Number(delta) || 0) / 1000);
    if (!moving()) { s.particles.length = 0; for (const row of [...s.swings]) { row.animation.cancel(); row.node.remove(); } s.swings.clear(); }
    if (s.airPainted) s.air.clear(); if (s.groundPainted) s.ground.clear(); s.airPainted = false; s.groundPainted = false;
    for (let i = s.patches.length - 1; i >= 0; i--) { const p = s.patches[i]; p.age += dt; if (p.age >= p.life) { p.image.destroy(); s.patches.splice(i, 1); } else p.image.setAlpha(.3 * (1 - p.age / p.life)); }
    for (let i = s.contacts.length - 1; i >= 0; i--) {
      const p = s.contacts[i]; p.age += dt; if (p.age >= p.life) { s.contacts.splice(i, 1); continue; }
      const progress = p.age / p.life, size = p.motion && moving() ? .35 + progress * .5 : .65, edit = p.kind === 'turn' || p.kind === 'style', alpha = p.motion ? (1 - progress) * (edit ? .55 : .38) : .3;
      s.groundPainted = true; s.ground.lineStyle(.8, p.color, alpha);
      if (p.kind === 'turn') {
        const rx = p.width * .4, ry = p.height * .4, start = -.7 + (p.motion && moving() ? progress * .5 : 0), end = start + Math.PI * 1.45;
        s.ground.beginPath(); for (let k = 0; k <= 18; k++) { const a = start + (end - start) * k / 18, x = p.x + Math.cos(a) * rx, y = p.y + Math.sin(a) * ry; if (k) s.ground.lineTo(x, y); else s.ground.moveTo(x, y); } s.ground.strokePath();
        const x = p.x + Math.cos(end) * rx, y = p.y + Math.sin(end) * ry; s.ground.lineBetween(x, y, x + 4, y - 3).lineBetween(x, y, x + 4, y + 2);
      } else if (p.kind === 'style') {
        for (let k = 0; k < 3; k++) { const x = p.x + (k - 1) * p.width * .3, y = p.y - (k % 2 ? 2 : 0), r = 2 + (p.motion && moving() ? Math.sin(progress * Math.PI) : 0); s.ground.lineBetween(x - r, y, x + r, y).lineBetween(x, y - r * .65, x, y + r * .65); }
      } else s.ground.strokeEllipse(p.x, p.y, p.width * size, p.height * size);
    }
    for (let i = s.particles.length - 1; i >= 0; i--) {
      const p = s.particles[i]; p.age += dt; if (p.age >= p.life) { s.particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt;
      if (p.y >= p.groundY) { p.y = p.groundY; if (!p.landed) { p.landed = true; p.vx *= .35; p.vy = 0; p.life = Math.min(p.life, p.age + .15); } }
      const alpha = Math.max(0, 1 - p.age / p.life);
      if (p.landed) { s.groundPainted = true; s.ground.fillStyle(p.color, alpha * .65).fillEllipse(p.x, p.y, p.size * 2.4, .8); }
      else {
        s.airPainted = true; s.air.fillStyle(p.color, alpha);
        if (p.kind === 'water') s.air.lineStyle(p.size, p.color, alpha * .9).lineBetween(p.x, p.y - 2.8, p.x + .2, p.y);
        else if (p.kind === 'grow' || p.kind === 'trim' || p.kind === 'harvest') {
          const a = p.angle + p.age * p.spin, ux = Math.cos(a) * p.size * 1.6, uy = Math.sin(a) * p.size * 1.6, vx = -Math.sin(a) * p.size * .6, vy = Math.cos(a) * p.size * .6;
          s.air.fillTriangle(p.x - ux, p.y - uy, p.x + vx, p.y + vy, p.x + ux, p.y + uy).fillTriangle(p.x - ux, p.y - uy, p.x + ux, p.y + uy, p.x - vx, p.y - vy);
        } else if (p.kind === 'gold') {
          const radius = p.size * (1.2 + Math.sin(p.age / p.life * Math.PI)), inset = radius * .22;
          s.air.fillRect(p.x - inset, p.y - inset, inset * 2, inset * 2);
          for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2, ux = Math.cos(a), uy = Math.sin(a); s.air.fillTriangle(p.x + ux * radius, p.y + uy * radius, p.x + (ux - uy) * inset, p.y + (uy + ux) * inset, p.x + (ux + uy) * inset, p.y + (uy - ux) * inset); }
        } else if (p.kind === 'plant' || p.kind === 'lift' || p.kind === 'place') s.air.fillTriangle(p.x - p.size, p.y + p.size * .5, p.x - p.size * .3, p.y - p.size, p.x + p.size, p.y + p.size * .3);
        else s.air.fillCircle(p.x, p.y, p.size);
      }
    }
  }
  function pauseAmbient(flags) { paused = !!(flags && (flags.hush || flags.frozen)); if (live) for (const row of live.swings) if (paused) row.animation.pause(); else row.animation.play(); }
  return { effect, swing, clear, destroy, pauseAmbient, status: () => live ? { active: true, room: !!live.room, paused, particles: live.particles.length, contacts: live.contacts.length, soilPatches: live.patches.length, swings: live.swings.size, counts: { ...live.counts }, last: live.last } : { active: false, paused, particles: 0, contacts: 0, soilPatches: 0, swings: 0 } };
})();
