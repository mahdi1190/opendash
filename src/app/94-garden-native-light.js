/* Scene lighting and atmosphere share one clock, wind field and camera. */
window.GardenNativeLight = (function () {
  'use strict';
  const TAU = Math.PI * 2, clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  let receivedClock = null, receivedClockSequence = 0;
  function receiveClock(value, fid, session) {
    if (!Array.isArray(value) || value.length !== 2 || !Number.isSafeInteger(value[0]) || value[0] < 0 || value[0] > 8.64e15 || value[1] !== 0 && value[1] !== 1 || !fid) return false;
    receivedClock = { phase: value[0], rate: value[1], at: performance.now(), fid, session: String(session || ''), sequence: ++receivedClockSequence };
    return true;
  }
  function clearClock() { receivedClock = null; }
  function random(seed) { let n = seed >>> 0; return () => { n = Math.imul(n ^ n >>> 15, 1 | n); n ^= n + Math.imul(n ^ n >>> 7, 61 | n); return ((n ^ n >>> 14) >>> 0) / 4294967296; }; }
  function create(scene, options) {
    options = options || {};
    const rng = random(91731), shadows = scene.add.container(0, 0).setDepth(-9305), actorShadows = scene.add.container(0, 0).setDepth(-9205);
    const clouds = scene.add.container(0, 0).setDepth(-9850).setName('garden-sky-clouds'), cloudShade = scene.add.container(0, 0).setDepth(-9310), glow = scene.add.graphics().setDepth(78000);
    const atmosphere = scene.add.graphics().setDepth(79900), rain = scene.add.container(0, 0).setDepth(79500), sky = scene.add.graphics().setDepth(-10020);
    const night = scene.add.graphics().setDepth(80000), moteHalo = scene.add.container(0, 0).setDepth(79395), motes = scene.add.container(0, 0).setName('garden-motes').setDepth(79400), bursts = scene.add.container(0, 0).setDepth(85000).setName('garden-bursts'), groundWeather = scene.add.graphics().setDepth(-9200);
    const objects = [shadows, actorShadows, clouds, cloudShade, glow, atmosphere, rain, sky, night, moteHalo, motes, bursts, groundWeather];
    let model = options.model || null, room = null, effects = null, dead = false, frame = 0, staticKey = '', staticAt = 0, screenKey = '', lamps = [], frozenAt = null, visibleActors = 0;
    let lastTime = null, ambientTime = 0, ambientAt = null, ambientOrigin = 0, ambientOriginAt = 0, ambientHeld = true, ambientSource = 'local', ambientFollowing = false, ambientSession = '', outdoorWetness = 0, lastMotion = true, fieldDirty = true, impactKind = '', precipitationVisible = 0;
    const drops = Array.from({ length: 110 }, () => ({ x: rng(), y: rng(), z: .3 + rng() * .7, phase: rng() * TAU }));
    const flecks = Array.from({ length: 18 }, () => ({ x: rng(), y: rng(), z: .25 + rng() * .75, phase: rng() * TAU }));
    const cloudList = Array.from({ length: 6 }, () => ({ x: rng(), y: rng(), w: 150 + rng() * 180, h: 22 + rng() * 18, speed: 2 + rng() * 3 }));
    const particles = [], impacts = Array.from({ length: 26 }, () => ({ x: 0, y: 0, age: rng(), life: .32 + rng() * .45, active: false })), pointLights = new Map(), environment = { windX: 1, windY: .18, gust: .3, rain: 0, snow: 0, wetness: 0, cloudCover: .12, daylight: 1, hour: 12 };
    const burstGlyphs = [], burstPoolLimit = 180; let visibleBurstGlyphs = 0;
    let preview = null;
    let clockKey = '', clockState = null;
    const shadowPool = new Map(), actorShadowPool = new Map(), creatureRows = new WeakMap(), actorCasts = new WeakMap(), softKey = '__garden-soft-' + scene.sys.settings.key, weatherKey = '__garden-weather-' + scene.sys.settings.key, cloudKey = '__garden-cloud-' + scene.sys.settings.key;
    const lightMembership = new Set();
    let visibleCloudLobes = 0, cloudTextureBuilds = 0;
    let creatureSerial = 0, visibleCreatures = 0;
    // A single native capture supplies soft, batchable penumbras. It is
    // deliberately feathered; object art and silhouettes remain sharp.
    if (!scene.textures.exists(softKey)) {
      const g = scene.make.graphics({ add: false }), radius = 63, steps = 40, rings = 12;
      const triangle = (a, b, c, aa, ab, ac) => g.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, aa, ab, ac, ac).fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y);
      const at = (r, a) => ({ x: 64 + Math.cos(a) * radius * r, y: 64 + Math.sin(a) * radius * r });
      for (let j = 0; j < rings; j++) for (let i = 0; i < steps; i++) {
        const r0 = j / rings, r1 = (j + 1) / rings, a0 = i / steps * TAU, a1 = (i + 1) / steps * TAU;
        const a = at(r0, a0), b = at(r1, a0), c = at(r1, a1), d = at(r0, a1), inner = (1 - r0 * r0) ** 2, outer = (1 - r1 * r1) ** 2;
        triangle(a, b, c, inner, outer, outer); if (j) triangle(a, c, d, inner, outer, inner);
      }
      const texture = scene.add.renderTexture(0, 0, 128, 128).setVisible(false);
      texture.draw(g).render(); texture.saveTexture(softKey); texture.destroy(); g.destroy();
    }
    // Screen-sized precipitation needs only a sharp disc and stroke. Retain
    // their native GPU capture instead of tessellating every flake each frame.
    // A third frame keeps autumn motes' original 32-point ellipse contour;
    // the existing snow/rain pixels and frames stay in their original slots.
    if (!scene.textures.exists(weatherKey)) {
      const g = scene.make.graphics({ add: false }).fillStyle(0xffffff, 1).fillCircle(32, 32, 30).fillRect(64, 0, 64, 8).fillEllipse(160, 32, 60, 60, 32);
      const texture = scene.add.renderTexture(0, 0, 192, 64).setVisible(false);
      texture.draw(g).render(); texture.saveTexture(weatherKey); texture.destroy(); g.destroy();
      const atlas = scene.textures.get(weatherKey); atlas.add('snow', 0, 0, 0, 64, 64); atlas.add('rain', 0, 64, 0, 64, 8); atlas.add('mote-leaf', 0, 128, 0, 64, 64);
    }
    // One opaque 32-vertex ellipse matches Graphics.fillEllipse's contour.
    // Each original lobe gets its own Image/alpha, preserving overlap opacity.
    const cloudTextureWidth = Math.min(3072, scene.game.renderer.getMaxTextureSize()), cloudTextureHeight = Math.min(512, scene.game.renderer.getMaxTextureSize()), cloudPadding = 2;
    if (!scene.textures.exists(cloudKey)) {
      const g = scene.make.graphics({ add: false }).fillStyle(0xffffff, 1).fillEllipse(cloudTextureWidth / 2, cloudTextureHeight / 2, cloudTextureWidth - cloudPadding * 2, cloudTextureHeight - cloudPadding * 2, 32);
      const texture = scene.add.renderTexture(0, 0, cloudTextureWidth, cloudTextureHeight).setVisible(false);
      texture.draw(g).render(); texture.saveTexture(cloudKey); texture.destroy(); g.destroy(); cloudTextureBuilds++;
    }
    const cloudImages = [];
    for (let i = 0; i < cloudList.length; i++) {
      cloudList[i].images = ['base', 'cap'].map(lobe => {
        const image = scene.add.image(0, 0, cloudKey).setOrigin(.5).setTint(0xf8f4e9).setVisible(false).setName('garden-sky-cloud:' + i + ':' + lobe);
        clouds.add(image); cloudImages.push(image); return image;
      });
    }
    for (const drop of drops) { drop.image = scene.add.image(0, 0, weatherKey, 'snow').setTint(0xfffdf5).setVisible(false); drop.glyph = 'snow'; rain.add(drop.image); }
    const cloudPatches = cloudList.map(() => { const image = scene.add.image(0, 0, softKey).setTint(0x344e45).setVisible(false); cloudShade.add(image); return image; });
    const moteGlyphs = flecks.map((_, i) => { const image = scene.add.image(0, 0, weatherKey, 'snow').setName('garden-mote-' + i).setVisible(false); motes.add(image); return image; });
    const moteHalos = flecks.map(() => { const image = scene.add.image(0, 0, softKey).setTint(0xe2e9a0).setVisible(false); moteHalo.add(image); return image; });
    function sync(next) { model = next; staticKey = ''; fieldDirty = true; }
    function effectState() { const owner = room || options.world, provider = room ? room.effectsState : options.world && options.world.effectsState; return typeof provider === 'function' ? provider.call(owner) : null; }
    function layer() { const parent = effects && effects.parent || room && room.root || options.world && options.world.rootNode && options.world.rootNode._inner; return parent && (parent._inner || parent.target || parent); }
    function setRoom(next) {
      for (const light of pointLights.values()) light.destroy(); pointLights.clear(); lightMembership.clear();
      for (const pool of [shadowPool, actorShadowPool]) { for (const image of pool.values()) image.destroy(); pool.clear(); }
      room = next || null; effects = effectState(); const parent = layer(); frame = 0;
      shadows.setDepth(room ? 50 : -9305); actorShadows.setDepth(room ? 75 : -9205);
      for (const object of objects) { if (object.parentContainer) object.parentContainer.remove(object); if (parent) parent.add(object); else if (!object.displayList) scene.add.existing(object); object.setVisible(true); }
      groundWeather.setVisible(!room);
      if (parent && parent.sort) parent.sort('depth');
      if (options.world && options.world.depthChanged) options.world.depthChanged();
      staticKey = ''; screenKey = ''; fieldDirty = true; for (const image of cloudImages) image.setVisible(false); visibleCloudLobes = 0; weatherParticles('', 0); groundWeather.clear(); hideBurstGlyphs(); glow.clear(); particles.length = 0; impactKind = '';
      visibleActors = 0; visibleCreatures = 0;
      if (room) { environment.rain = 0; environment.snow = 0; environment.wetness = 0; environment.cloudCover = 0; }
      for (const image of [...cloudPatches, ...moteGlyphs, ...moteHalos]) image.setVisible(false); for (const impact of impacts) impact.active = false;
    }
    function pauseAmbient(next) { const paused = !!(next && (next.frozen || next.hush)); if (paused !== (frozenAt != null)) { frozenAt = paused ? lastTime == null ? 0 : lastTime : null; if (ambientAt != null) ambientAt = performance.now(); ambientHeld = true; fieldDirty = true; } }
    function motionEnabled() { return typeof gardenMotionOn !== 'function' || gardenMotionOn(); }
    function localClockRunning() { return frozenAt == null && motionEnabled() && !document.hidden; }
    function sharedClock() { const visit = model && model.visit; return visit && visit.live && receivedClock && receivedClock.fid === visit.fid ? receivedClock : null; }
    function sharedPhase(sample, now) { return sample.phase + (sample.rate ? Math.max(0, now - sample.at) : 0); }
    function homePhase(now) { return ambientOrigin + Math.max(0, now - ambientOriginAt); }
    function advanceAmbient(time, motion) {
      const now = performance.now(), sample = sharedClock(), held = frozenAt != null || !motion || document.hidden, first = ambientAt == null, elapsed = first ? 0 : Math.max(0, now - ambientAt);
      ambientAt = now;
      if (sample && sample.session !== ambientSession) { ambientSession = sample.session; ambientFollowing = false; }
      if (first) { ambientOrigin = time; ambientOriginAt = now; ambientTime = sample ? sharedPhase(sample, now) : time; ambientFollowing = !!sample; }
      // A late first host sample may replace the local fallback while running.
      // Held views retain their phase and converge only after they resume.
      else if (sample && !ambientFollowing && !held && !ambientHeld) { ambientTime = sharedPhase(sample, now); ambientFollowing = true; fieldDirty = true; }
      else if (!held && !ambientHeld) {
        if (!sample || sample.rate) {
          ambientTime += elapsed;
          const target = sample ? sharedPhase(sample, now) : !model.visit ? homePhase(now) : ambientTime;
          ambientTime += clamp(target - ambientTime, -elapsed * .25, elapsed * .25);
        }
      }
      if (sample) ambientFollowing = true;
      ambientSource = sample ? 'host' : 'local'; ambientHeld = held;
    }
    function ambientClock() {
      if (dead || ambientAt == null || model && model.visit) return null;
      // The shared garden phase keeps running through this screen's local
      // holds. A spectacle or hidden host tab must not stop active visitors.
      return [Math.min(8.64e15, Math.max(0, Math.round(homePhase(performance.now())))), 1];
    }
    function clockStatus() {
      const sample = sharedClock(), now = performance.now();
      return { ambientSource, ambientRunning: localClockRunning() && (!sample || !!sample.rate), ambientHostRunning: sample ? !!sample.rate : null, ambientOffset: sample ? sharedPhase(sample, now) - ambientTime : null, ambientSampleAge: sample ? Math.max(0, now - sample.at) : null, ambientSample: sample ? [sample.phase, sample.rate] : null, ambientSampleSequence: sample ? sample.sequence : 0 };
    }
    function visibilityChanged() { ambientAt = ambientAt == null ? null : performance.now(); ambientHeld = true; fieldDirty = true; }
    document.addEventListener('visibilitychange', visibilityChanged);
    function view() { const cam = scene.cameras.main, origin = cam.getWorldPoint(0, 0); return { x: origin.x, y: origin.y, w: cam.width / cam.zoom, h: cam.height / cam.zoom, zoom: cam.zoom }; }
    function occluders() { return room ? room.occluders || [] : options.world && options.world.occluders ? options.world.occluders() : []; }
    function sources() { return effects && Array.isArray(effects.lights) ? effects.lights : room ? room.lights || [] : options.world && options.world.lightSources ? options.world.lightSources() : []; }
    function calendar() {
      const now = typeof Clock !== 'undefined' ? Clock.now() : Date.now(), snap = model && model.visit && model.visit.snap;
      const season = model && model.season || 'summer', key = Math.floor(now / 1000) + '|' + season + '|' + (snap ? [snap.tz, snap.sr, snap.ss].join(',') : 'home');
      if (key === clockKey) return clockState;
      clockKey = key;
      const theirs = snap && Number.isFinite(snap.tz), date = theirs ? new Date(now + snap.tz * 60000) : null, parts = !theirs && typeof Clock !== 'undefined' ? Clock.parts(now) : null;
      const hour = theirs ? date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600 : parts ? parts.h + parts.mi / 60 + (parts.s || 0) / 3600 : 12;
      const weather = !theirs && typeof _gdWeather === 'function' ? _gdWeather() : null, kept = !theirs && !(weather && weather.today) && typeof _gdSunKept === 'function' ? _gdSunKept() : null;
      const readHour = value => { const match = /(\d{1,2}):(\d{2})/.exec(String(value || '')); return match ? Number(match[1]) + Number(match[2]) / 60 : NaN; };
      let up = theirs && Number.isFinite(snap.sr) ? snap.sr / 60 : readHour(weather && weather.today ? weather.today.sunrise : kept && kept.up);
      let down = theirs && Number.isFinite(snap.ss) ? snap.ss / 60 : readHour(weather && weather.today ? weather.today.sunset : kept && kept.down);
      if (!Number.isFinite(up) || !Number.isFinite(down) || down <= up) [up, down] = { spring: [6.3, 19.6], summer: [5, 21.2], autumn: [7, 18], winter: [8, 16.2] }[season] || [7, 19];
      clockState = { hour, up, down }; return clockState;
    }
    function state(time, dt) {
      const t = time / 1000, sun = calendar(), hour = preview && Number.isFinite(preview.hour) ? preview.hour : frozenAt != null ? environment.hour : sun.hour;
      const season = model && model.season || 'summer', rise = clamp((hour - sun.up + .6) / 1.2), set = clamp((sun.down + .6 - hour) / 1.2);
      const daylight = room ? .38 : rise * rise * (3 - 2 * rise) * set * set * (3 - 2 * set), elevation = Math.max(.08, Math.sin(clamp((hour - sun.up) / (sun.down - sun.up)) * Math.PI));
      const override = preview && (preview.rain != null || preview.snow != null), weather = model && model.rain || {}, snow = clamp(Number(override ? preview.snow : weather.snow) || 0), rain = snow ? 0 : clamp(Number(override ? preview.rain : weather.now) || 0), wet = rain || snow;
      // Snow is precipitation even though it deliberately does not water plants.
      environment.hour = hour; environment.daylight = daylight; environment.rain = room ? 0 : rain; environment.snow = room ? 0 : snow;
      const targetWetness = Math.max(rain, snow * .2), wetRate = targetWetness > outdoorWetness ? 1.8 : .035;
      outdoorWetness += (targetWetness - outdoorWetness) * (1 - Math.exp(-dt * wetRate));
      environment.wetness = room ? 0 : outdoorWetness;
      environment.cloudCover = room ? 0 : clamp(.12 + environment.rain * .78 + environment.snow * .62);
      environment.gust = room ? 0 : (.25 + .75 * (.5 + .5 * Math.sin(t * .17 + Math.sin(t * .057)))) * (wet ? .9 : season === 'autumn' ? .55 : .33);
      environment.windX = room ? 0 : Math.cos(.3 + Math.sin(t * .013) * .4) * environment.gust;
      environment.windY = room ? 0 : .14 + Math.sin(t * .019) * .1;
      environment.sunX = Math.cos((hour - 6) / 24 * TAU); environment.sunY = .42 + Math.sin((hour - 8) / 24 * TAU) * .22; environment.elevation = elevation;
      return environment;
    }
    function imageFor(pool, parent, key) {
      let image = pool.get(key);
      if (!image) { image = scene.add.image(0, 0, softKey).setTint(room ? 0x2c2835 : 0x233e35); parent.add(image); pool.set(key, image); }
      image._gardenShadowFrame = frame; if (!image.visible) image.setVisible(true); return image;
    }
    function hideUnusedShadows(pool) {
      // A selected retained image stays visible through this pass. Hiding
      // every image first needlessly toggled each active shadow twice.
      for (const image of pool.values()) if (image._gardenShadowFrame !== frame && image.visible) image.setVisible(false);
    }
    function shadeShape(pool, parent, key, o, dx, dy, length, alpha, actor) {
      const x = Number(o.x) || 0, y = Number(o.y) || 0, w = Math.max(3, Number(o.w || o.width) || 20), footprint = actor ? clamp(Number(o.depth || o.h) || 7, 3, 12) : Math.max(2, Number(o.h || o.depth) || 7);
      const height = clamp(Number(o.tall || o.height) || 36, 8, 150), len = Math.min(85, height * length), sx = dx * len, sy = dy * len;
      const image = imageFor(pool, parent, key);
      image.setPosition(x + sx * .48, y + sy * .48 + 1).setDisplaySize(Math.max(5, w * (actor ? .95 : 1.2)), Math.max(7, footprint * (actor ? .7 : 1.5) + len * 1.1)).setRotation(Math.atan2(sy, sx) - Math.PI / 2).setAlpha(alpha);
    }
    function visible(source) { for (let node = source && (source.target || source); node; node = node.parentContainer) if (node.active === false || node.visible === false && !(node._nativeCacheHiddenBy && (!node._nativeNode || node._nativeNode._computedVisible !== false)) || node.alpha <= .025) return false; return true; }
    function sourceOpacity(source) { let amount = 1; for (let node = source && (source.target || source); node; node = node.parentContainer) amount *= node.alpha == null ? 1 : node.alpha; return amount; }
    function creatureRow(owner, node, body, x, y, lift, width, height, tiny, baked) {
      if (!node || !node._native || !node.isConnected || !body || !body.target || !visible(body.target)) return null;
      let row = creatureRows.get(owner);
      if (!row || row.node !== node) {
        row = { id: 'creature:' + (++creatureSerial), node, source: body.target, kind: tiny ? 'bug' : 'wildlife', bakedContact: false };
        creatureRows.set(owner, row);
        const shadow = baked || node.querySelector(tiny ? '.gb-sh' : '.gl-sh');
        if (shadow && shadow._native) shadow.style.display = 'none';
      }
      row.source = body.target; row.x = x; row.y = y; row.lift = Math.max(0, Number(lift) || 0); row.w = width; row.h = tiny ? 2.5 : clamp(width * .25, 3, 9); row.tall = height;
      row.shadowStrength = tiny ? .48 : .8; row.opacity = sourceOpacity(node.target); return row.opacity > .025 ? row : null;
    }
    function creatureActors(actors) {
      const rows = [], seen = new Set(), sources = new Set(), ids = new Set();
      for (const actor of actors) { ids.add(actor.id); sources.add(actor.source); if (actor.node) sources.add(actor.node.target || actor.node); }
      const add = row => { if (!row || seen.has(row.node) || sources.has(row.source) || sources.has(row.node.target) || ids.has(row.id)) return; seen.add(row.node); sources.add(row.source); rows.push(row); };
      const W = typeof GARDEN_WORLD === 'undefined' ? null : GARDEN_WORLD; if (!W) return rows;
      if (room) {
        const indoor = window.GardenNativeRooms && GardenNativeRooms.current(), list = indoor && !indoor.music && typeof _grm !== 'undefined' && _grm.S && _grm.S.bugs;
        if (list) for (const bug of list) { const art = indoor.bugArts.get(bug.key); if (!art) continue; const width = clamp((typeof GRB === 'undefined' ? .7 : GRB.scale) * bug.def.size * 18, 4, 20); add(creatureRow(bug, art.node, art.node, bug.x, bug.y, bug.lift, width, width * .7, true)); }
        return rows;
      }
      if (typeof _gw !== 'undefined' && _gw.bugs) for (const bug of _gw.bugs.values()) {
        const width = clamp((typeof GW_BUG_SCALE === 'undefined' ? .7 : GW_BUG_SCALE) * bug.def.size * 18, 4, 20);
        add(creatureRow(bug, bug.node, bug.inEl || bug.node, bug.x * W.cellW, W.sky + bug.y * W.cellH, bug.lift, width, width * .7, true));
      }
      const handled = new Set();
      const life = c => {
        const S = c && c.S; if (!S || handled.has(S)) return; handled.add(S);
        if (c.medium === 'water' || c.hidden || c.gone || c.left || c.onScreen === false || c.fade <= .025 || c.sink > .95) return;
        const tiny = c.def.group === 'insect', width = tiny ? 7 : clamp((c.def.foot == null ? .15 : c.def.foot) * W.cellW * 1.8 + 3, 6, 38);
        const row = creatureRow(c, c.node || S.node, c.artEl || c.poseEl || S.node, S.x * W.cellW, W.sky + S.y * W.cellH, S.lift, width, tiny ? 7 : Math.max(10, width * 1.2), tiny, c.shEl);
        if (row) { row.raisedPerch = !!(c.raisedPerch || c.perched && c.perched.lift > 0); row.shadowStrength *= 1 - clamp(Number(c.sink) || 0); add(row); }
      };
      if (typeof _gl !== 'undefined' && _gl.list) for (const c of _gl.list) life(c);
      if (typeof _glc !== 'undefined' && _glc.ghosts) for (const g of _glc.ghosts.values()) life(g.c);
      if (typeof _glVisitSprites !== 'undefined') for (const S of _glVisitSprites) {
        if (handled.has(S) || !S.node || !String(S.id || '').startsWith('life-') || S.node.getAttribute('data-med') === 'water') continue;
        const row = creatureRows.get(S), body = row && row.node === S.node ? row.source._nativeNode : S.node.querySelector('.gl-art') || S.node;
        add(creatureRow(S, S.node, body, S.x * W.cellW, W.sky + S.y * W.cellH, S.lift, 11, 14, false));
      }
      return rows;
    }
    function inView(o, v, margin) { return o.x >= v.x - margin && o.x <= v.x + v.w + margin && o.y >= v.y - margin && o.y <= v.y + v.h + margin; }
    function lampCasts(pool, parent, key, o, actor, env) {
      let first = null, second = null, best = 0, next = 0;
      for (const lamp of lamps) {
        const dx = o.x - lamp.x, dy = o.y - lamp.y, d = Math.hypot(dx, dy), radius = lamp.radius || 130;
        if (d < 8 || d > radius) continue;
        const amount = (room ? 1 : 1 - env.daylight) * (lamp.intensity == null ? 1 : lamp.intensity) * (1 - d / radius);
        if (amount > best) { second = first; next = best; first = { lamp, dx, dy, d, amount }; best = amount; } else if (amount > next) { second = { lamp, dx, dy, d, amount }; next = amount; }
      }
      for (const candidate of [first, second]) {
        if (!candidate || candidate.amount < .015) continue;
        const { lamp, dx, dy, d, amount } = candidate, tall = Number(o.tall || o.height) || 36;
        const length = clamp(d / Math.max(tall * 1.6, lamp.height || 160), .12, 1.2);
        const attenuation = (o.shadowStrength == null ? 1 : o.shadowStrength) * (o.shadowSoftness == null ? 1 : o.shadowSoftness) * (o.opacity == null ? 1 : o.opacity);
        shadeShape(pool, parent, key + ':lamp:' + (lamp.id || lamp.x + ',' + lamp.y), o, dx / d, dy / d, length, Math.min(.18, amount * (actor ? .22 : .14)) * attenuation, actor);
      }
    }
    function paintShadows(env, v) {
      const list = occluders(), direction = Math.hypot(env.sunX, env.sunY) || 1, length = .2 + (1 - env.elevation) * .62, strength = room ? 0 : env.daylight * .15 * (1 - env.cloudCover * .78);
      for (let i = 0; i < list.length; i++) {
        const o = list[i], key = o.id == null ? 'static:' + i : String(o.id);
        if (o.kind === 'actor' || o.kind === 'pet' || !inView(o, v, 220)) continue;
        if (strength > .004) shadeShape(shadowPool, shadows, key + ':sun', o, -env.sunX / direction, env.sunY / direction, length, strength, false);
        if (env.daylight < .65 || room) lampCasts(shadowPool, shadows, key, o, false, env);
      }
      hideUnusedShadows(shadowPool);
    }
    function paintActors(env, v) {
      const primary = effects && effects.actors || [], creatures = creatureActors(primary), actors = primary.concat(creatures), direction = Math.hypot(env.sunX, env.sunY) || 1, strength = room ? 0 : env.daylight * .19 * (1 - env.cloudCover * .82);
      visibleCreatures = 0;
      visibleActors = 0;
      for (let i = 0; i < actors.length; i++) {
        const actor = actors[i]; if (!Number.isFinite(actor.x) || !Number.isFinite(actor.y) || !visible(actor.source) || !inView(actor, v, 100)) continue;
        const key = actor.id == null ? 'actor:' + i : String(actor.id); visibleActors++; if (actor.kind === 'bug' || actor.kind === 'wildlife') visibleCreatures++;
        const lift = Math.max(0, Number(actor.altitude == null ? actor.lift : actor.altitude) || 0), softness = 1 / (1 + lift / 70), visibility = actor.opacity == null ? sourceOpacity(actor.source) : actor.opacity, opacity = visibility * (actor.shadowStrength == null ? 1 : actor.shadowStrength), scale = actor.shadowScale == null ? 1 : clamp(Number(actor.shadowScale), .25, 1.5);
        const source = actor.source && (actor.source.target || actor.source) || actor; let castActor = actorCasts.get(source); if (!castActor) { castActor = {}; actorCasts.set(source, castActor); }
        const castX = Number.isFinite(actor.groundX) ? actor.groundX : actor.x, castY = Number.isFinite(actor.groundY) ? actor.groundY : actor.y, castTall = (actor.tall || 40) + lift, castWidth = ((actor.w || 18) + lift * .16) * scale;
        Object.assign(castActor, actor);
        castActor.x = castX; castActor.y = castY; castActor.tall = castTall; castActor.w = castWidth; castActor.opacity = visibility; castActor.shadowSoftness = softness;
        if (!actor.raisedPerch && (!actor.bakedContact || actor.airborne || lift > 8)) {
          const image = imageFor(actorShadowPool, actorShadows, key + ':contact');
          image.setPosition(castActor.x, castActor.y + 1).setRotation(0).setDisplaySize(Math.max(5, castActor.w || 18) * 1.12, clamp(Number(actor.h) || 6, 3, 12) * 1.2 * scale).setAlpha((room ? .16 : .14) * softness * opacity);
        }
        const castStrength = strength * softness * opacity * (actor.bakedContact ? clamp((1 - env.elevation) * 4) : 1);
        if (castStrength > .004) shadeShape(actorShadowPool, actorShadows, key + ':sun', castActor, -env.sunX / direction, env.sunY / direction, .18 + (1 - env.elevation) * .88, castStrength, true);
        if (env.daylight < .8 || room) lampCasts(actorShadowPool, actorShadows, key, castActor, true, env);
      }
      hideUnusedShadows(actorShadowPool);
      if (frame % 120 === 0) for (const pool of [shadowPool, actorShadowPool]) for (const [key, image] of pool) if (!image.visible && frame - image._gardenShadowFrame > 180) { image.destroy(); pool.delete(key); }
    }
    function outdoorNightPresentation() { return !room && !!model && (model.tod === 'dusk' || model.tod === 'night'); }
    function outdoorDarkness(env) { return (1 - env.daylight) * (outdoorNightPresentation() ? .47 : .42) + env.rain * .035; }
    function paintAmbient(env, v) {
      const skyColor = room ? parseInt(String(room.background || '#101b19').replace('#', ''), 16) : env.daylight < .08 ? 0x273d57 : env.daylight < .7 ? env.hour < 12 ? 0xb7cdd0 : 0xd9b9a3 : env.rain || env.snow ? 0xa4babc : 0xb9d9d4;
      const key = [skyColor, Math.round(env.daylight * 80), env.rain, env.snow, Math.round(env.wetness * 16), !!room, outdoorNightPresentation()].join('|');
      if (screenKey === key) return; screenKey = key;
      const W = typeof GARDEN_WORLD === 'undefined' ? { cols: 80, cellW: 48, rows: 50, cellH: 30, sky: 150 } : GARDEN_WORLD;
      const x = -3000, y = -3000, width = W.cols * W.cellW + 6000, height = W.sky + W.rows * W.cellH + 6000;
      sky.clear().fillStyle(skyColor, 1).fillRect(x, y, width, height);
      night.clear(); atmosphere.clear();
      if (room) {
        const ambient = room.ambient == null ? .8 : Number(room.ambient);
        night.fillStyle(0x253450, (1 - clamp(ambient)) * .3).fillRect(x, y, width, height);
      } else {
        const darkness = outdoorDarkness(env) - (1 - env.daylight) * .07;
        if (darkness > .01) night.fillStyle(outdoorNightPresentation() ? 0x223554 : 0x263855, darkness).fillRect(x, y, width, height);
        const dusk = 1 - Math.abs(env.daylight * 2 - 1);
        if (dusk > .1) atmosphere.fillStyle(env.hour < 12 ? 0xffd6ab : 0xefb397, dusk * .045).fillRect(x, y, width, height);
        if (env.wetness > .04) atmosphere.fillStyle(0x73969d, env.wetness * .022).fillRect(x, y, width, height);
        if (env.snow) atmosphere.fillStyle(0xe5eff1, env.snow * .018).fillRect(x, y, width, height);
      }
    }
    function paintClouds(time, env, v) {
      for (const image of cloudPatches) image.setVisible(false); if (room || env.snow) return;
      const t = time / 1000, W = typeof GARDEN_WORLD === 'undefined' ? { cols: 80, cellW: 48, sky: 150, rows: 50, cellH: 30 } : GARDEN_WORLD;
      const width = W.cols * W.cellW + 1200;
      for (let i = 0; i < cloudList.length; i++) {
        const cloud = cloudList[i];
        const x = (cloud.x * width + t * cloud.speed * (.35 + env.gust)) % width - 600, y = 12 + cloud.y * Math.max(10, W.sky - 85);
        const opacity = (env.rain ? .1 : .22) * (.35 + env.daylight * .65), maskWidth = cloudTextureWidth - cloudPadding * 2, maskHeight = cloudTextureHeight - cloudPadding * 2;
        cloud.images[0].setPosition(x, y).setScale(cloud.w / maskWidth, cloud.h / maskHeight).setAlpha(opacity);
        cloud.images[1].setPosition(x - cloud.w * .17, y - cloud.h * .2).setScale(cloud.w * .53 / maskWidth, cloud.h * 1.25 / maskHeight).setAlpha(opacity);
        const groundY = W.sky + cloud.y * (W.rows * W.cellH), patch = cloudPatches[i], w = cloud.w * 2.2, h = cloud.h * 3.2;
        if (env.daylight > .05 && x + w > v.x && x - w < v.x + v.w && groundY + h > v.y && groundY - h < v.y + v.h) patch.setVisible(true).setPosition(x, groundY).setDisplaySize(w, h).setAlpha(env.daylight * (1 - env.cloudCover * .7) * .055);
      }
    }
    function cloudVisibility(env) {
      // Read the numeric camera now, including photo/export and resize views.
      // Phase/pose updates keep their existing six/thirty-frame field cadence.
      const cam = scene.cameras.main, zx = cam.zoomX || cam.zoom || 1, zy = cam.zoomY || cam.zoom || 1, width = cam.width / zx, height = cam.height / zy;
      const x = cam.scrollX + cam.width / 2 - width / 2, y = cam.scrollY + cam.height / 2 - height / 2;
      visibleCloudLobes = 0;
      for (const image of cloudImages) {
        const w = image.displayWidth / 2, h = image.displayHeight / 2, visible = !room && !env.snow && image.x + w >= x && image.x - w <= x + width && image.y + h >= y && image.y - h <= y + height;
        image.setVisible(visible); if (visible) visibleCloudLobes++;
      }
    }
    function paintGlows(time, env, v) {
      lightMembership.clear();
      for (const lamp of lamps) lightMembership.add(lamp.id || lamp.x + ',' + lamp.y);
      for (const [key, light] of pointLights) if (!lightMembership.has(key)) { light.destroy(); pointLights.delete(key); }
      glow.clear(); for (const light of pointLights.values()) light.setVisible(false); if (!room && env.daylight >= .8) return;
      const amount = room ? 1 : 1 - env.daylight, t = time / 1000, warmNight = outdoorNightPresentation(), lightDepth = warmNight ? 80010 : 78000;
      for (const lamp of lamps) {
        const radius = lamp.radius || 100;
        if (lamp.x + radius < v.x || lamp.x - radius > v.x + v.w || lamp.y + radius < v.y || lamp.y - radius > v.y + v.h) continue;
        const flicker = lamp.flicker ? .94 + Math.sin(t * 7 + lamp.x) * .035 + Math.sin(t * 13.1 + lamp.y) * .025 : 1;
        const color = typeof lamp.color === 'string' ? parseInt(lamp.color.replace('#', ''), 16) : lamp.color || 0xffd98b;
        const key = lamp.id || lamp.x + ',' + lamp.y; let light = pointLights.get(key);
        if (!light) { light = scene.add.pointlight(lamp.x, lamp.y, color, radius, .15, .09); light.setDepth(lightDepth); const parent = layer(); if (parent) { parent.add(light); parent.sort('depth'); } pointLights.set(key, light); }
        else if (light.depth !== lightDepth) { light.setDepth(lightDepth); if (light.parentContainer) light.parentContainer.sort('depth'); }
        light.setVisible(true).setPosition(lamp.x, lamp.y); light.radius = radius;
        // Outdoor emissive light sits above the cool night grade. Keep its
        // previous transmitted energy, with a small warm accent, instead of
        // exposing the formerly graded pool at full unattenuated intensity.
        const transmission = warmNight ? (1 - outdoorDarkness(env)) * 1.12 : 1;
        light.intensity = amount * flicker * (lamp.intensity == null ? 1 : lamp.intensity) * (.17 + env.wetness * .025) * transmission;
        light.color.setTo(color >> 16 & 255, color >> 8 & 255, color & 255);
      }
    }
    function weatherParticles(kind, count) {
      for (let i = count; i < precipitationVisible; i++) drops[i].image.setVisible(false);
      for (let i = 0; i < count; i++) { const drop = drops[i]; if (drop.glyph !== kind) { drop.image.setFrame(kind).setTint(kind === 'snow' ? 0xfffdf5 : 0xe1eeea); drop.glyph = kind; } drop.image.setVisible(true); }
      precipitationVisible = count;
    }
    function paintWeather(time, dt, env, v, motion) {
      for (const image of moteGlyphs) image.setVisible(false); for (const image of moteHalos) image.setVisible(false);
      weatherParticles(room ? '' : env.rain ? 'rain' : env.snow ? 'snow' : '', room ? 0 : env.rain ? Math.ceil(drops.length * env.rain) : env.snow ? Math.ceil(80 * env.snow) : 0);
      if (room) return;
      const t = time / 1000, z = v.zoom, sw = v.w * z, sh = v.h * z;
      const wrap = (n, size) => (n % size + size) % size;
      if (env.rain) {
        for (let i = 0; i < Math.ceil(drops.length * env.rain); i++) {
          const drop = drops[i];
          const speed = 260 + 260 * drop.z, x = v.x + (wrap(drop.x * (sw + 120) + t * speed * env.windX * .25, sw + 120) - 60) / z, y = v.y + (wrap(drop.y * (sh + 100) + t * speed, sh + 100) - 50) / z;
          const dx = (3 + env.windX * 6) / z, dy = (9 + drop.z * 7) / z;
          drop.image.setPosition(x + dx * .5, y + dy * .5).setRotation(Math.atan2(dy, dx)).setDisplaySize(Math.hypot(dx, dy), (.65 + .4 * drop.z) / z).setAlpha(.18 + drop.z * .18);
        }
      } else if (env.snow) for (let i = 0; i < Math.ceil(80 * env.snow); i++) {
        const drop = drops[i], x = v.x + (wrap(drop.x * (sw + 100) + t * (9 + env.windX * 18) + Math.sin(t + drop.phase) * 9, sw + 100) - 50) / z, y = v.y + (wrap(drop.y * (sh + 50) + t * (12 + drop.z * 22), sh + 50) - 25) / z;
        const diameter = (1.2 + drop.z * 2.3) / z * 64 / 60;
        drop.image.setPosition(x, y).setRotation(0).setDisplaySize(diameter, diameter).setAlpha(.3 + drop.z * .5);
      }
      for (let i = 0; i < flecks.length; i++) {
        const fleck = flecks[i], nightFly = env.daylight < .25 && model && model.season !== 'winter', autumn = model && model.season === 'autumn', pollen = !nightFly && !autumn && model && model.season !== 'winter' && env.daylight > .5 && fleck.z > .75;
        if (env.rain || env.snow || !nightFly && !pollen && (!autumn || fleck.z < .8)) continue;
        const x = v.x + (wrap(fleck.x * (sw + 60) + t * env.windX * 18 + Math.sin(t * .4 + fleck.phase) * 12, sw + 60) - 30) / z, y = v.y + (wrap(fleck.y * (sh + 60) + t * (autumn ? 7 : -2) + Math.sin(t * .7 + fleck.phase) * 8, sh + 60) - 30) / z;
        const alpha = nightFly ? .15 + (.5 + .5 * Math.sin(t * 1.7 + fleck.phase)) * .55 : pollen ? .16 : .2;
        if (pollen && !onLand(x, y)) continue;
        const image = moteGlyphs[i], glyph = nightFly || pollen ? 'snow' : 'mote-leaf';
        // The retained disc's 60-pixel contour sits inside a 64-pixel frame.
        // Preserve the original tiny world dimensions, including leaf flutter.
        const width = nightFly ? 2.2 / z : pollen ? 2 * (.65 + fleck.z * .35) / z : (2 + fleck.z * 2) / z;
        const height = nightFly || pollen ? width : (1 + fleck.z) * (motion ? .35 + Math.abs(Math.sin(t * 2.2 + fleck.phase)) * .65 : .75) / z;
        if (image.frame.name !== glyph) image.setFrame(glyph);
        image.setVisible(true).setPosition(x, y).setDisplaySize(width * 64 / 60, height * 64 / 60).setTint(nightFly ? 0xe7ee99 : pollen ? 0xf2e7bc : 0xc9a46b).setAlpha(alpha);
        if (nightFly) moteHalos[i].setVisible(true).setPosition(x, y).setDisplaySize(12 / z, 12 / z).setAlpha(alpha * .24);
      }
      void dt;
    }
    function onLand(x, y) {
      if (room) return false;
      const W = typeof GARDEN_WORLD === 'undefined' ? { cols: 80, cellW: 48, sky: 150, rows: 50, cellH: 30 } : GARDEN_WORLD;
      if (x < 0 || y < W.sky || x > W.cols * W.cellW || y > W.sky + W.rows * W.cellH) return false;
      return !!(effects && typeof effects.containsWater === 'function') && !effects.containsWater(x, y);
    }
    function paintGroundWeather(dt, env, v, motion) {
      groundWeather.clear();
      const kind = room || !motion ? '' : env.snow ? 'snow' : env.rain ? 'rain' : '';
      if (kind !== impactKind) { for (const impact of impacts) impact.active = false; impactKind = kind; }
      if (!kind) { for (const impact of impacts) impact.active = false; return; }
      const count = env.snow ? Math.ceil(16 * env.snow) : Math.ceil(impacts.length * env.rain);
      for (let i = count; i < impacts.length; i++) impacts[i].active = false;
      for (let i = 0; i < count; i++) {
        const impact = impacts[i]; impact.age += motion ? dt : 0;
        if (!impact.active || impact.age >= impact.life) {
          impact.active = false;
          if (frozenAt != null) continue;
          for (let attempt = 0; attempt < 3; attempt++) {
            const x = v.x + rng() * v.w, y = v.y + rng() * v.h;
            if (!onLand(x, y)) continue;
            impact.x = x; impact.y = y; impact.age = rng() * .08; impact.life = env.snow ? 1.4 + rng() * 1.3 : .3 + rng() * .28; impact.active = true; break;
          }
        }
        if (!impact.active || !inView(impact, v, 12)) continue;
        const p = clamp(impact.age / impact.life), size = (env.snow ? 1.6 : 1.8 + p * 4.8) / Math.max(.8, v.zoom);
        if (env.snow) groundWeather.fillStyle(0xf1f4e9, Math.sin(p * Math.PI) * .28).fillEllipse(impact.x, impact.y, size * 1.8, size * .6);
        else {
          groundWeather.lineStyle(.65 / Math.max(.8, v.zoom), 0xd7e7df, (1 - p) * .24).strokeEllipse(impact.x, impact.y, size * 2, size * .62);
          if (p < .35) groundWeather.lineStyle(.7 / Math.max(.8, v.zoom), 0xecf3e9, (1 - p / .35) * .3).lineBetween(impact.x, impact.y, impact.x + env.windX, impact.y - (1 - p / .35) * 3 / Math.max(.8, v.zoom));
        }
      }
    }
    function effect(kind, x, y, color) {
      if (typeof gardenMotionOn === 'function' && !gardenMotionOn()) return;
      if (typeof color === 'string') color = parseInt(color.replace('#', ''), 16);
      const count = kind === 'water' ? 10 : 18;
      for (let i = 0; i < count; i++) { const angle = rng() * TAU, speed = 12 + rng() * 40; particles.push({ kind, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 22, age: 0, life: .5 + rng() * .6, color: color || (kind === 'water' ? 0xc5eaf1 : kind === 'harvest' ? 0xf4d97d : 0x92704c), size: 1 + rng() * 2 }); }
      if (particles.length > 180) particles.splice(0, particles.length - 180);
    }
    function hideBurstGlyphs() {
      for (let i = 0; i < visibleBurstGlyphs; i++) burstGlyphs[i].setVisible(false);
      visibleBurstGlyphs = 0;
    }
    function paintEffects(dt) {
      let used = 0;
      // The producer's existing 180-particle cap also bounds this lazy pool.
      // Retain the original newest-to-oldest submission/overlap order.
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.age += dt; if (p.age >= p.life) { particles.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 55 * dt;
        let image = burstGlyphs[used];
        if (!image && used < burstPoolLimit) {
          image = scene.add.image(0, 0, weatherKey, 'snow').setOrigin(.5).setVisible(false).setName('garden-burst:' + used);
          bursts.add(image); burstGlyphs.push(image);
        }
        if (image) {
          // The shared snow disc is 60px across in its 64px padded frame.
          const diameter = p.size * 2 * 64 / 60;
          image.setPosition(p.x, p.y).setDisplaySize(diameter, diameter).setTint(p.color).setAlpha(1 - p.age / p.life).setVisible(true); used++;
        }
      }
      for (let i = used; i < visibleBurstGlyphs; i++) burstGlyphs[i].setVisible(false);
      visibleBurstGlyphs = used;
    }
    function update(time, delta) {
      if (dead || !model) return;
      const motion = motionEnabled(), elapsed = lastTime == null ? (delta > 1 ? delta : (delta || 0) * 1000) : Math.max(0, time - lastTime), dt = Math.min(.05, elapsed / 1000);
      advanceAmbient(time, motion);
      lastTime = time; if (motion !== lastMotion) { fieldDirty = true; lastMotion = motion; }
      const env = state(ambientTime, frozenAt == null ? dt : 0), v = view();
      if (!motion) particles.length = 0;
      effects = effectState(); lamps = sources();
      shadows.setDepth(room ? 50 : -9305); actorShadows.setDepth(room ? 75 : -9205); groundWeather.setVisible(!room); glow.setDepth(78000); atmosphere.setDepth(79900); night.setDepth(80000); bursts.setDepth(85000);
      const key = [Math.floor(v.x / 180), Math.floor(v.y / 180), Math.round(v.w / 100), Math.round(v.h / 100), Math.round(env.hour * 12), Math.round(env.daylight * 20), env.rain, env.snow, effects && effects.revision, !!room].join('|');
      if (key !== staticKey || time - staticAt > 1500) { staticKey = key; staticAt = time; paintShadows(env, v); }
      paintActors(env, v);
      paintAmbient(env, v);
      if (++frame === 1 || fieldDirty || frame % (motion ? 6 : 30) === 0) { paintClouds(ambientTime, env, v); paintGlows(ambientTime, env, v); fieldDirty = false; }
      cloudVisibility(env);
      paintWeather(ambientTime, dt, env, v, motion);
      paintGroundWeather(frozenAt == null ? dt : 0, env, v, motion);
      paintEffects(frozenAt == null ? dt : 0); if (window.GardenNativeArt && GardenNativeArt.environment) GardenNativeArt.environment(env);
    }
    function destroy() { if (dead) return; dead = true; document.removeEventListener('visibilitychange', visibilityChanged); for (const object of objects) object.destroy(); shadowPool.clear(); actorShadowPool.clear(); for (const light of pointLights.values()) light.destroy(); pointLights.clear(); lightMembership.clear(); if (scene.textures.exists(softKey)) scene.textures.remove(softKey); if (scene.textures.exists(weatherKey)) scene.textures.remove(weatherKey); if (scene.textures.exists(cloudKey)) scene.textures.remove(cloudKey); particles.length = 0; burstGlyphs.length = 0; visibleBurstGlyphs = 0; }
    function setPreview(next) { preview = next || null; staticKey = ''; screenKey = ''; fieldDirty = true; }
    setRoom(null);
    return { sync, setRoom, pauseAmbient, update, effect, destroy, ambientClock, preview: setPreview, environment: () => ({ ...environment, ambientTime, paused: frozenAt != null, reducedMotion: !lastMotion, room: !!room, ...clockStatus() }), status: () => ({ shadows: occluders().length, actorShadows: visibleActors, creatureShadows: visibleCreatures, shadowImages: shadowPool.size + actorShadowPool.size, lights: lamps.length, cloudCount: cloudList.length, cloudLobes: cloudImages.length, visibleCloudLobes, cloudTextureKey: cloudKey, cloudTextureSize: [cloudTextureWidth, cloudTextureHeight], cloudTextureBytes: cloudTextureWidth * cloudTextureHeight * 4, cloudTextureBuilds, precipitation: environment.rain ? Math.ceil(drops.length * environment.rain) : environment.snow ? Math.ceil(80 * environment.snow) : 0, precipitationKind: environment.snow ? 'snow' : environment.rain ? 'rain' : 'none', precipitationSprites: precipitationVisible, precipitationTextureBytes: 192 * 64 * 4, groundImpacts: impacts.filter(impact => impact.active).length, wetness: environment.wetness, outdoorWetness, particles: particles.length, burstPoolSize: burstGlyphs.length, visibleBurstGlyphs, burstPoolLimit, paused: frozenAt != null, reducedMotion: !lastMotion, ambientTime, windX: environment.windX, windY: environment.windY, gust: environment.gust, room: !!room, native: true, ...clockStatus() }) };
  }
  return Object.freeze({ create, receiveClock, clearClock });
})();
