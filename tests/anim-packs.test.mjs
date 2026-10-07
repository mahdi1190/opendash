// The animation registry (src/app/71-anim-registry.js) and the QUALITY GATE for every
// animation pack (src/app/72-anim-pack-*.js, found automatically): a valid manifest, every
// item renders (normal and reduced) without throwing, well-formed trusted markup, nothing
// fetched or scripted, size budgets, a reduced-motion variant, no near-duplicates in a slot.
// Then the daily look (seeded, stable within a day) and the look prefs. Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const src = (f) => readFileSync(join(APP, f), 'utf8');
const PACK_FILES = readdirSync(APP).filter(f => /^72-anim-pack-[a-z0-9-]+\.js$/.test(f)).sort();
const PART_FILES = PACK_FILES.filter(f => /\/\/ UK_SCENE_PART: ([a-z0-9-]+)\/([a-z0-9-]+)/.test(src(f)));
const NAMES = ['ANIM_SLOTS', 'ANIM_SLOT_IDS', 'ANIM_THEMES', 'ANIM_THEME_IDS', 'ANIM_ITEM_MAX_BYTES', 'ANIM_FULL_ITEM_MAX_BYTES', 'ANIM_RICH_ITEM_MAX_BYTES', 'ANIM_RICH_TILE_MAX_BYTES', 'ANIM_PACK_MAX_BYTES', 'animItemMaxBytes', 'animPackMaxBytes', 'animValidatePack', 'animRegisterPack',
  'animPacks', 'animPack', 'animItem', 'animItems', 'animLookNormalize', 'animSeasonOf', 'animDailyPick', 'animDailyLook', 'animThemeFor', 'animItemHtml',
  'animSpecialPick', 'animPickFor', 'animCountdownHeat', 'animCountdownStage', 'animStreakGrow', 'almDay', 'almAddDays', 'almEaster', 'almFestivals', 'almIsFestival', 'almSeasonMark', 'almClocksChange', 'almSunTimes', 'almSkyMoment',
  'almMoonPhase', 'almSceneLight', 'almMoonDiscPath', 'almMeteorShower', 'almAuroraNights', 'ALM_MOVING', 'UK_REGIONS', 'UK_COUNTIES', 'ukCounty', 'ukCountiesIn', 'ukCountyNearest', 'ukTowns'];
// The same order the build concatenates: the almanac, the libraries, the registry, then every pack.
const body = ['71-anim-almanac.js', '71-anim-library.js', '71-anim-registry.js', '71-delight-library.js', '71-uk-counties.js', '71-anim-texas-scenes.js', ...readdirSync(APP).filter(f => /^71-anim-(us2?|asia2?|uk)[-.]/.test(f)).sort(), ...PACK_FILES].map(src).join('\n;\n');
// eslint-disable-next-line no-new-func
const R = new Function(`"use strict";\n${body}\nreturn { ${NAMES.join(', ')}, ANIM_SCENES, Delight };`)();

/** Balanced tags, nothing executable, nothing fetched. Returns a problem or ''. */
function markupProblem(html) {
  if (/<script|<foreignObject|<iframe|<image\b|\son[a-z]+\s*=|javascript:/i.test(html)) return 'script or embedded content';
  if (/(href|src)\s*=\s*["']?(https?:|\/\/)|url\(\s*['"]?(https?:|\/\/)/i.test(html)) return 'fetches something';
  if (/NaN|undefined|\[object /.test(html)) return 'NaN / undefined in the markup';
  const stack = [];
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)) {
    if (m[4]) continue;
    if (!m[1]) stack.push(m[2]);
    else if (stack.pop() !== m[2]) return `unbalanced </${m[2]}>`;
  }
  return stack.length ? `unclosed <${stack[stack.length - 1]}>` : '';
}

test('there is at least the core pack, and every pack file registered a valid pack', () => {
  assert.ok(PACK_FILES.includes('72-anim-pack-core.js'));
  const ids = R.animPacks().map(p => p.id);
  assert.ok(ids.includes('core'));
  assert.ok(ids.length >= PACK_FILES.length - PART_FILES.length, `registration files ${PACK_FILES.length - PART_FILES.length}, registered ${ids.length}`);
  for (const file of PART_FILES) {
    const [, pack, part] = /\/\/ UK_SCENE_PART: ([a-z0-9-]+)\/([a-z0-9-]+)/.exec(src(file));
    assert.ok(R.animPack(pack)?.items.some(it => it.ukPart === part), `${file}: its drawing builder contributed scenes`);
    assert.ok(Buffer.byteLength(src(file)) <= 400000, `${file}: source part under 400 KB`);
  }
});

/** Fresh ids must not make identical drawings appear to be different art. */
function canonicalArt(html) {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  const names = new Map(ids.map((id, i) => [id, 'local-' + i]));
  return html.replace(/\bid="([^"]+)"/g, (all, id) => `id="${names.get(id)}"`)
    .replace(/url\(#([^)]+)\)/g, (all, id) => `url(#${names.get(id) || id})`)
    .replace(/href="#([^"]+)"/g, (all, id) => `href="#${names.get(id) || id}"`).replace(/\s+/g, ' ');
}

for (const pack of R.animPacks()) {
  test(`quality gate: pack "${pack.id}"`, () => {
    const v = R.animValidatePack(Object.assign({}, pack, { items: pack.items.map(it => Object.assign({}, it)) }));
    assert.deepEqual(v.errors, [], 'manifest');
    let total = pack.css.length;
    const seen = new Map();
    for (const it of pack.items) {
      for (const reduced of [false, true]) {
        let html;
        assert.doesNotThrow(() => { html = R.animItemHtml(it, { reduced, live: true, size: 'lg' }); }, `${it.ref} renders`);
        assert.ok(html && html.includes('<svg') && html.length > 120, `${it.ref} renders something`);
        assert.equal(markupProblem(html), '', `${it.ref}${reduced ? ' (reduced)' : ''}`);
        const max = R.animItemMaxBytes(it, 'lg');   // a full-viewport scene has its own budget; a rich local scene its tile budget here
        assert.ok(html.length <= max, `${it.ref}: ${html.length} bytes > ${max}`);
        // rich scenes draw less in small tiles: check the full-screen detail against its own cap (about 1 MB)
        if (it.rich) { const big = R.animItemHtml(it, { reduced, live: true, size: 'fill' }), bigMax = R.animItemMaxBytes(it, 'fill'); assert.equal(markupProblem(big), '', `${it.ref} full screen`); assert.ok(big.length <= bigMax, `${it.ref} full screen: ${big.length} bytes > ${bigMax}`); }
        if (it.full) assert.match(html, /viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"/, `${it.ref}: a full scene fills any screen`);
        total += html.length;
        if (reduced) {
          assert.ok(html.includes('ap-still') && !html.includes('is-live'), `${it.ref}: the reduced variant is still`);
          for (const th of R.ANIM_THEME_IDS) assert.ok(R.animItemHtml(it, { reduced: true, theme: th }).includes(`data-anim-theme="${th}"`));
        }
      }
      // near-duplicate check: two items of one slot may not draw the same thing
      const key = it.slot + '|' + canonicalArt(it.svg({}));
      assert.ok(!seen.has(key), `${it.ref} draws the same as ${seen.get(key)}`);
      seen.set(key, it.ref);
    }
    const budget = R.animPackMaxBytes(pack.items);   // shared allowance + each full or rich scene's own tile budget
    assert.ok(total <= budget, `pack ${pack.id}: ${total} bytes > ${budget}`);
  });
}

test('the core pack covers every slot and wires in the existing animations', () => {
  for (const s of R.ANIM_SLOTS.filter(x => x.group !== 'moments')) assert.ok(R.animItems({ slot: s.id, pack: 'core' }).length >= 2, `slot ${s.id}`);
  assert.equal(R.animItems({ slot: 'event-scene', pack: 'core' }).filter(i => i.id.startsWith('scene-')).length, R.ANIM_SCENES.length);
  assert.equal(R.animItems({ slot: 'celebration', pack: 'core' }).length, Object.keys(R.Delight.DL_ART).length);
  const ts = R.animItems({ slot: 'theme-switch' });
  assert.ok(ts.length >= 3 && ts.every(i => /^(circle|wipe|fade)$/.test(i.vt.kind)));
  assert.ok(ts.some(i => i.vt.kind === 'circle'));
});

test('moments (wave 4): the moments pack covers every moment slot; picks respect tags, keys, pins, blocks and the level', () => {
  const ms = R.ANIM_SLOTS.filter(x => x.group === 'moments').map(x => x.id);
  assert.ok(ms.length >= 10);
  for (const s of ms) assert.ok(R.animItems({ slot: s, pack: 'moments' }).length >= 2, `slot ${s}`);
  for (const tag of ['payday', 'under-budget', 'vendor']) assert.ok(R.animItems({ slot: 'money' }).filter(i => i.tags.includes(tag)).length >= 2, tag);
  for (const tag of ['living', 'idle']) assert.ok(R.animItems({ slot: 'home' }).filter(i => i.tags.includes(tag) && i.fx).length >= 2, tag);
  for (const tag of ['birthday', 'while']) assert.ok(R.animItems({ slot: 'people' }).filter(i => i.tags.includes(tag)).length >= 2, tag);
  for (const s of ['progress', 'meeting']) assert.ok(R.animItems({ slot: s }).every(i => /^[a-z]+$/.test(i.fx)), `${s} items carry an fx`);
  for (const s of ['streak', 'focus', 'countdown']) assert.ok(R.animItems({ slot: s }).every(i => i.svg({}).includes('ap-gr')), `${s} items grow`);
  const look = R.animLookNormalize({}), ctx = { level: 'standard' };
  const pay = R.animPickFor('money', '2026-10-04', look, ctx, { tag: 'payday' });
  assert.ok(pay.tags.includes('payday'));
  assert.equal(R.animPickFor('money', '2026-10-04', look, ctx, { tag: 'payday' }).ref, pay.ref, 'stable');
  // one style per stream, the same every day
  const st = (day, key) => R.animPickFor('task-done', day, look, ctx, { key, daily: false }).ref;
  assert.equal(st('2026-10-04', 'thesis'), st('2026-11-20', 'thesis'));
  assert.ok(new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(k => st('2026-10-04', k))).size >= 2, 'streams differ');
  // the level: the payday rain is standard, so nothing at subtle
  assert.equal(R.animPickFor('money', '2026-10-04', look, { level: 'subtle' }, { tag: 'payday' }), null);
  // blocks and pins
  const all = R.animItems({ slot: 'boss' }).map(i => i.ref);
  assert.equal(R.animPickFor('boss', '2026-10-04', { block: all }, ctx), null);
  assert.equal(R.animPickFor('boss', '2026-10-04', { pin: { boss: all[1] } }, ctx).ref, all[1]);
  assert.equal(R.animPickFor('money', '2026-10-04', { pin: { money: 'moments/pay-notes' } }, ctx, { tag: 'vendor' }).tags.includes('vendor'), true, 'a pin of another tag is ignored');
  assert.equal(R.animPickFor('boss', '2026-10-04', { packsOff: ['moments'] }, ctx), null, 'the pack switched off');
  // the maths
  assert.equal(R.animCountdownHeat(0), 1);
  assert.equal(R.animCountdownHeat(60), 0);
  assert.ok(R.animCountdownHeat(1) > R.animCountdownHeat(7) && R.animCountdownHeat(7) > R.animCountdownHeat(20));
  assert.equal(R.animCountdownStage(1), 'today');
  assert.equal(R.animCountdownStage(0), 'far');
  assert.equal(R.animStreakGrow(0), 0);
  assert.equal(R.animStreakGrow(1), 0.2);
  assert.equal(R.animStreakGrow(7), 1);
  assert.equal(R.animStreakGrow(30), 1);
  assert.match(R.animValidatePack({ id: 'x', name: 'X', items: [{ id: 'a', slot: 'progress', label: 'A', tags: [], mood: 'calm', intensity: 'subtle', fx: 'Bad Fx', svg: () => '<circle class="c" cx="3" cy="3" r="2"/>', reduced: 'static' }] }).errors.join(), /fx/);
});

test('rich local scenes: their own per-item budget, full-viewport only, counted sensibly in the pack', () => {
  assert.ok(R.ANIM_RICH_ITEM_MAX_BYTES > R.ANIM_FULL_ITEM_MAX_BYTES && R.ANIM_RICH_ITEM_MAX_BYTES <= 1048576, 'about 1 MB full screen');
  assert.ok(R.ANIM_RICH_TILE_MAX_BYTES > R.ANIM_FULL_ITEM_MAX_BYTES && R.ANIM_RICH_TILE_MAX_BYTES * 80 <= 12000000, 'a gallery page of 80 rich tiles stays light');
  assert.equal(R.animItemMaxBytes({ full: true, rich: true }), R.ANIM_RICH_ITEM_MAX_BYTES);
  assert.equal(R.animItemMaxBytes({ full: true, rich: true }, 'fill'), R.ANIM_RICH_ITEM_MAX_BYTES);
  assert.equal(R.animItemMaxBytes({ full: true, rich: true }, 'hero'), R.ANIM_RICH_ITEM_MAX_BYTES);
  assert.equal(R.animItemMaxBytes({ full: true, rich: true }, 'lg'), R.ANIM_RICH_TILE_MAX_BYTES, 'small tiles have the tile budget');
  assert.equal(R.animItemMaxBytes({ full: true }), R.ANIM_FULL_ITEM_MAX_BYTES, 'other full scenes keep 32 KB');
  assert.equal(R.animItemMaxBytes({ full: true }, 'fill'), R.ANIM_FULL_ITEM_MAX_BYTES);
  assert.equal(R.animItemMaxBytes({ rich: true }), R.ANIM_ITEM_MAX_BYTES, 'rich applies to full scenes only');
  assert.equal(R.animPackMaxBytes([{ full: true, rich: true }, { full: true }, {}]), R.ANIM_PACK_MAX_BYTES + 2 * R.ANIM_RICH_TILE_MAX_BYTES + 2 * R.ANIM_FULL_ITEM_MAX_BYTES);
  const item = { id: 'a', slot: 'opening', label: 'A', tags: [], mood: 'calm', intensity: 'subtle', svg: () => '<rect width="9" height="9"/>', reduced: 'static' };
  assert.match(R.animValidatePack({ id: 'x-rich', name: 'X', items: [Object.assign({}, item, { rich: true })] }).errors.join(), /rich scenes must be full-viewport/);
  assert.match(R.animValidatePack({ id: 'x-rich', name: 'X', items: [Object.assign({}, item, { full: true, rich: 'yes' })] }).errors.join(), /rich must be true or false/);
  assert.deepEqual(R.animValidatePack({ id: 'x-rich', name: 'X', items: [Object.assign({}, item, { full: true, rich: true })] }).errors, []);
});

test('validation names what is wrong', () => {
  const ok = { id: 'x-test', name: 'Test', items: [{ id: 'a', slot: 'symbol', label: 'A', tags: [], mood: 'calm', intensity: 'subtle', theme: 'any', season: 'any', region: 'any', svg: () => '<circle class="c" cx="32" cy="32" r="9"/>', reduced: 'static' }] };
  assert.equal(R.animValidatePack(ok).ok, true);
  const bad = (patch) => R.animValidatePack(Object.assign({}, ok, { items: [Object.assign({}, ok.items[0], patch)] })).errors.join(' | ');
  assert.match(bad({ reduced: undefined }), /reduced-motion variant/);
  assert.match(bad({ slot: 'nowhere' }), /slot must be/);
  assert.match(bad({ mood: 'grumpy' }), /mood/);
  assert.match(bad({ season: ['monsoon'] }), /season/);
  assert.match(bad({ region: ['england'] }), /region/);
  assert.match(bad({ slot: 'theme-switch' }), /vt/);
  assert.match(R.animValidatePack(Object.assign({}, ok, { css: '@import url(https://x.test/a.css);' })).errors.join(), /fetch/);
  assert.match(R.animValidatePack(Object.assign({}, ok, { id: 'Bad Id' })).errors.join(), /pack id/);
});

test('the daily look is seeded: the same all day, different across days, pins and blocks win', () => {
  const look = R.animLookNormalize({});
  const a = R.animDailyLook('2026-10-04', look, { level: 'standard' });
  assert.deepEqual(R.animDailyLook('2026-10-04', look, { level: 'standard' }), a);
  for (const s of R.ANIM_SLOT_IDS) assert.ok(a[s], `slot ${s} has a pick`);
  const days = new Set();
  for (let d = 1; d <= 20; d++) days.add(R.animDailyPick('theme-switch', `2026-10-${String(d).padStart(2, '0')}`, look, {}).ref);
  assert.ok(days.size >= 2, 'rotates across days');
  const pinned = R.animDailyPick('theme-switch', '2026-10-04', { pin: { 'theme-switch': 'core/theme-fade' } }, {});
  assert.equal(pinned.ref, 'core/theme-fade');
  const blockedAll = { block: R.animItems({ slot: 'theme-switch' }).map(i => i.ref) };
  assert.equal(R.animDailyPick('theme-switch', '2026-10-04', blockedAll, {}), null);
  const blockOne = { block: ['core/theme-iris', 'core/theme-dusk'], pin: { 'theme-switch': 'core/theme-iris' } };
  assert.equal(R.animDailyPick('theme-switch', '2026-10-04', blockOne, {}).ref, 'core/theme-fade', 'a blocked pin is ignored');
});

test('season and intensity filter the pool; favourites weigh more', () => {
  assert.equal(R.animSeasonOf('2026-01-10'), 'winter');
  assert.equal(R.animSeasonOf('2026-04-10'), 'spring');
  assert.equal(R.animSeasonOf('2026-10-04'), 'autumn');
  for (let d = 1; d <= 28; d++) {
    const day = `2026-07-${String(d).padStart(2, '0')}`;
    assert.notEqual(R.animDailyPick('sky', day, {}, {}).ref, 'core/sky-snow', 'no snow in July');
    const op = R.animDailyPick('opening', day, {}, { level: 'subtle' });
    assert.equal(op.intensity, 'subtle', 'subtle level keeps to subtle items');
  }
  const fav = { fav: ['core/sky-rain'] };
  let n = 0, m = 0;
  for (let d = 1; d <= 28; d++) {
    const day = `2026-07-${String(d).padStart(2, '0')}`;
    if (R.animDailyPick('sky', day, fav, {}).ref === 'core/sky-rain') n++;
    if (R.animDailyPick('sky', day, {}, {}).ref === 'core/sky-rain') m++;
  }
  assert.ok(n >= m, 'a favourite comes up at least as often');
});

test('look prefs are normalised; the core pack cannot be switched off; the daily theme rotates', () => {
  const l = R.animLookNormalize({ theme: 'neon', fav: ['core/a', 'core/a', 'junk', 7], packsOff: ['core', 'uk'], pin: { sky: 'core/sky-rain', bogus: 'x/y' } });
  assert.equal(l.theme, 'neon');
  assert.deepEqual(l.fav, ['core/a']);
  assert.deepEqual(l.packsOff, ['uk']);
  assert.deepEqual(l.pin, { sky: 'core/sky-rain' });
  assert.equal(R.animLookNormalize({ theme: 'nope' }).theme, 'calm');
  assert.ok(R.animItems({ look: { packsOff: ['core'] } }).length > 0);
  assert.equal(R.animThemeFor('2026-10-04', { theme: 'retro' }), 'retro');
  const set = new Set(); for (let d = 1; d <= 28; d++) set.add(R.animThemeFor(`2026-10-${String(d).padStart(2, '0')}`, { themeDaily: true }));
  assert.ok(set.size >= 4);
});

test('a second pack registers, can be switched off, and replaces itself by id', () => {
  const pack = { id: 'gate-demo', name: 'Demo', items: [{ id: 'dot', slot: 'symbol', label: 'Dot', tags: ['demo'], mood: 'calm', intensity: 'subtle', theme: ['neon'], season: 'any', region: ['GB'], svg: () => '<circle class="c x-pulse" cx="32" cy="32" r="6"/>', reduced: () => '<circle class="c" cx="32" cy="32" r="6"/>' }] };
  assert.equal(R.animRegisterPack(pack).ok, true);
  assert.ok(R.animItem('gate-demo/dot'));
  assert.equal(R.animItems({ slot: 'symbol', look: { packsOff: ['gate-demo'] } }).some(i => i.pack === 'gate-demo'), false);
  R.animRegisterPack(Object.assign({}, pack, { items: [Object.assign({}, pack.items[0], { id: 'dot2' })] }));
  assert.equal(R.animItem('gate-demo/dot'), null);
  assert.ok(R.animItem('gate-demo/dot2'));
  // region items only in their region
  const look = { pin: {}, block: R.animItems({ slot: 'symbol', pack: 'core' }).map(i => i.ref) };
  assert.equal(R.animDailyPick('symbol', '2026-10-04', look, { region: 'GB-ENG' }).ref, 'gate-demo/dot2');
});

/* ---------- wave 2: the almanac (dates, the sun, the moon) and the special-day packs ---------- */
const hm = (ms) => new Date(ms).toISOString().slice(11, 16);
const mins = (a, b) => Math.abs(a - b) / 60000;

test('almanac: Easter, Pancake Day and the moving festivals', () => {
  assert.deepEqual([2025, 2026, 2027, 2028, 2029, 2030].map(R.almEaster), ['2025-04-20', '2026-04-05', '2027-03-28', '2028-04-16', '2029-04-01', '2030-04-21']);
  assert.ok(R.almIsFestival('pancake-day', '2026-02-17'));
  assert.ok(R.almIsFestival('pancake-day', '2027-02-09'));
  assert.ok(R.almIsFestival('easter', '2026-04-03') && R.almIsFestival('easter', '2026-04-06'), 'Good Friday to Easter Monday');
  assert.ok(R.almIsFestival('lunar-new-year', '2026-02-17'));
  assert.ok(R.almIsFestival('diwali', '2026-11-08'));
  assert.ok(R.almIsFestival('eid', '2026-03-20') && R.almIsFestival('eid', '2026-05-27'));
  for (const [id, days] of Object.entries(R.ALM_MOVING)) {
    assert.ok(days.length >= 6, `${id}: about five years ahead`);
    assert.deepEqual([...days].sort(), days, `${id} in order`);
    for (let i = 1; i < days.length; i++) assert.equal(+days[i].slice(0, 4), +days[i - 1].slice(0, 4) + 1, `${id}: one a year`);
  }
  assert.deepEqual(R.almFestivals('2026-12-25'), ['christmas']);
  assert.ok(R.almFestivals('2026-12-24').includes('christmas-eve'));
  assert.ok(R.almIsFestival('new-year', '2027-01-01') && R.almIsFestival('new-year', '2026-12-31'));
  assert.ok(R.almIsFestival('halloween', '2026-10-31') && R.almIsFestival('bonfire-night', '2026-11-05') && R.almIsFestival('valentines', '2027-02-14'));
  assert.deepEqual(R.almFestivals('2026-10-04', { tz: 'Europe/London' }), [], 'an ordinary day');
  assert.equal(R.almAddDays('2028-02-28', 1), '2028-02-29');
});

test('almanac: solstices and equinoxes, the clocks, the birthday and the first snow', () => {
  const marks = (y) => { const out = []; for (let d = R.almDay(y, 1, 1); d.startsWith(String(y)); d = R.almAddDays(d, 1)) { const m = R.almSeasonMark(d); if (m) out.push(d.slice(5) + ' ' + m); } return out; };
  assert.deepEqual(marks(2026), ['03-20 spring-equinox', '06-21 summer-solstice', '09-23 autumn-equinox', '12-21 winter-solstice']);
  assert.deepEqual(marks(2027).map(s => s.slice(0, 5)), ['03-20', '06-21', '09-23', '12-22']);
  assert.ok(R.almIsFestival('summer-solstice', '2026-06-21') && R.almIsFestival('winter-solstice', '2026-12-21'));
  assert.equal(R.almClocksChange('2026-03-29', 'Europe/London'), 'forward');
  assert.equal(R.almClocksChange('2026-10-25', 'Europe/London'), 'back');
  assert.equal(R.almClocksChange('2026-03-08', 'America/New_York'), 'forward');
  assert.equal(R.almClocksChange('2026-03-28', 'Europe/London'), null);
  assert.equal(R.almClocksChange('2026-03-29', 'Asia/Tokyo'), null, 'no summer time there');
  assert.equal(R.almClocksChange('2027-03-28'), 'forward', 'the EU rule without a zone');
  assert.equal(R.almClocksChange('2027-10-31'), 'back');
  assert.ok(R.almIsFestival('clocks-forward', '2026-03-29', { tz: 'Europe/London' }));
  assert.ok(R.almIsFestival('birthday', '2026-07-09', { birthday: '07-09' }));
  assert.ok(R.almIsFestival('birthday', '2026-07-09', { birthday: '1990-07-09' }));
  assert.ok(!R.almIsFestival('birthday', '2026-07-10', { birthday: '07-09' }));
  assert.ok(R.almIsFestival('birthday', '2027-02-28', { birthday: '02-29' }), 'a leap-day birthday on the 28th');
  assert.ok(R.almIsFestival('birthday', '2028-02-29', { birthday: '02-29' }) && !R.almIsFestival('birthday', '2028-02-28', { birthday: '02-29' }));
  assert.ok(R.almIsFestival('first-snow', '2026-12-02', { firstSnow: '2026-12-02' }) && !R.almIsFestival('first-snow', '2026-12-03', { firstSnow: '2026-12-02' }));
});

test('almanac: sunrise and sunset at the real local times; polar day and night', () => {
  const LDN = [51.5074, -0.1278], EDI = [55.9533, -3.1883];
  // Published London times (UTC): 21 Jun 2026 03:43 / 20:21; 21 Dec 2026 08:04 / 15:53.
  let s = R.almSunTimes('2026-06-21', ...LDN);
  assert.ok(mins(s.rise, Date.UTC(2026, 5, 21, 3, 43)) <= 4 && mins(s.set, Date.UTC(2026, 5, 21, 20, 21)) <= 4, `${hm(s.rise)} ${hm(s.set)}`);
  s = R.almSunTimes('2026-12-21', ...LDN);
  assert.ok(mins(s.rise, Date.UTC(2026, 11, 21, 8, 4)) <= 4 && mins(s.set, Date.UTC(2026, 11, 21, 15, 53)) <= 4, `${hm(s.rise)} ${hm(s.set)}`);
  // Edinburgh, 4 Oct 2026: about 06:20 / 17:42 UTC (local 07:20 / 18:42 BST).
  s = R.almSunTimes('2026-10-04', ...EDI);
  assert.ok(mins(s.rise, Date.UTC(2026, 9, 4, 6, 20)) <= 6 && mins(s.set, Date.UTC(2026, 9, 4, 17, 42)) <= 6, `${hm(s.rise)} ${hm(s.set)}`);
  assert.equal(R.almSunTimes('2026-12-21', 78.2, 15.6).polar, 'night');
  assert.equal(R.almSunTimes('2026-06-21', 78.2, 15.6).polar, 'day');
  assert.equal(R.almSunTimes('nope', 0, 0).rise, null);
  const rise = R.almSunTimes('2026-10-04', ...LDN).rise, set = R.almSunTimes('2026-10-04', ...LDN).set;
  assert.equal(R.almSkyMoment(rise + 10 * 60000, ...LDN), 'sunrise');
  assert.equal(R.almSkyMoment(rise + 3 * 3600000, ...LDN), 'day');
  assert.equal(R.almSkyMoment(set - 20 * 60000, ...LDN), 'sunset');
  assert.equal(R.almSkyMoment(set + 3 * 3600000, ...LDN), 'night');
  assert.equal(R.almSkyMoment(rise - 3 * 3600000, ...LDN), 'night');
});

test('almanac: the moon phase, meteor showers and the rare aurora', () => {
  // Known: new moon 2024-04-08 18:21 UTC (the eclipse), full moon 2024-01-25 17:54 UTC, first quarter 2026-10-18 ~16:13 UTC.
  const p0 = R.almMoonPhase(Date.UTC(2024, 3, 8, 18, 21)).frac;
  assert.ok(p0 < 0.04 || p0 > 0.96, `new: ${p0}`);
  assert.equal(R.almMoonPhase(Date.UTC(2024, 3, 8, 18, 21)).name, 'New moon');
  const p4 = R.almMoonPhase(Date.UTC(2024, 0, 25, 17, 54));
  assert.ok(Math.abs(p4.frac - 0.5) < 0.04 && p4.index === 4 && p4.name === 'Full moon');
  const seq = []; for (let d = 0; d < 30; d++) seq.push(R.almMoonPhase(Date.UTC(2026, 9, 1 + d, 22)).index);
  assert.equal(new Set(seq).size, 8, 'all eight phases in a month');
  assert.equal(R.almMeteorShower('2026-08-12').id, 'perseids');
  assert.equal(R.almMeteorShower('2026-12-14').id, 'geminids');
  assert.equal(R.almMeteorShower('2026-10-04'), null);
  for (const y of [2026, 2027, 2028]) {
    const n = R.almAuroraNights(y, 57.1);
    assert.ok(n.length >= 1 && n.length <= 4, 'a few nights a year');
    assert.ok(n.every(d => d.startsWith(String(y)) && !['04', '05', '06', '07', '08'].includes(d.slice(5, 7))), 'dark months only');
    assert.deepEqual(R.almAuroraNights(y, 57.1), n, 'seeded');
  }
  assert.deepEqual(R.almAuroraNights(2026, 40), [], 'not that far south');
  assert.deepEqual(R.almAuroraNights(2026, NaN), []);
});

test('special days win their slot: festivals, the birthday, the sky by moment; plain picks never show them', () => {
  const look = {};
  assert.equal(R.animDailyPick('opening', '2026-12-25', look, {}).ref, 'seasons/open-christmas-tree');
  assert.equal(R.animDailyPick('opening', '2026-11-08', look, {}).ref, 'seasons/open-diwali-diya');
  assert.equal(R.animDailyPick('opening', '2026-10-31', look, {}).ref, 'seasons/open-halloween-pumpkin');
  assert.equal(R.animDailyPick('opening', '2026-07-09', look, { birthday: '07-09' }).ref, 'seasons/open-birthday-cake');
  assert.equal(R.animDailyPick('opening', '2026-12-25', look, { birthday: '12-25' }).ref, 'seasons/open-birthday-cake', 'the birthday outranks Christmas');
  assert.equal(R.animDailyPick('opening', '2026-03-29', look, { tz: 'Europe/London' }).ref, 'seasons/open-clocks-forward');
  assert.equal(R.animDailyPick('celebration', '2026-02-14', look, {}).ref, 'seasons/cel-valentine-letter');
  // a blocked special falls back to the ordinary daily pick; a pin still wins
  const blocked = R.animDailyPick('opening', '2026-12-25', { block: ['seasons/open-christmas-tree'] }, {});
  assert.equal(blocked.pack, 'core');
  assert.equal(R.animDailyPick('opening', '2026-12-25', { pin: { opening: 'core/open-plane' } }, {}).ref, 'core/open-plane');
  assert.equal(R.animDailyPick('opening', '2026-12-25', { packsOff: ['seasons'] }, {}).pack, 'core');
  // on ordinary days, items with a when() rule never come up
  for (let d = 1; d <= 28; d++) {
    const day = `2026-09-${String(d).padStart(2, '0')}`;
    for (const s of ['opening', 'sky', 'celebration']) assert.ok(!R.animDailyPick(s, day, look, {}).when, `${s} ${day}`);
  }
  // the sky by moment
  const LDN = { lat: 51.5, lon: -0.13 };
  assert.match(R.animSpecialPick('sky', '2026-10-04', look, Object.assign({ moment: 'sunrise' }, LDN)).ref, /^sky\/sunrise-/);
  assert.match(R.animSpecialPick('sky', '2026-10-04', look, Object.assign({ moment: 'sunset' }, LDN)).ref, /^sky\/sunset-/);
  assert.equal(R.animSpecialPick('sky', '2026-10-04', look, Object.assign({ moment: 'day' }, LDN)), null);
  const night = R.animSpecialPick('sky', '2026-10-04', look, Object.assign({ moment: 'night', now: Date.UTC(2026, 9, 4, 22) }, LDN));
  assert.equal(night.ref, 'sky/moon-' + R.almMoonPhase(Date.UTC(2026, 9, 4, 22)).name.toLowerCase().replace(/\s+/g, '-'));
  assert.equal(R.animSpecialPick('sky', '2026-08-12', look, Object.assign({ moment: 'night', now: Date.UTC(2026, 7, 12, 23) }, LDN)).ref, 'sky/meteor-shower');
  const aur = R.almAuroraNights(2026, 57.1)[0];
  assert.equal(R.animSpecialPick('sky', aur, look, { moment: 'night', lat: 57.1, lon: -2.1 }).ref, 'sky/aurora');
  assert.notEqual(R.animSpecialPick('sky', aur, look, { moment: 'night', lat: 45, lon: -0.1 }).ref, 'sky/aurora', 'too far south');
  // the seasons pack covers every festival asked for
  const tags = new Set(R.animItems({ pack: 'seasons' }).flatMap(i => i.tags));
  for (const t of ['christmas', 'new year', 'lunar new year', 'diwali', 'eid', 'easter', 'halloween', 'bonfire night', 'pancake day', 'valentines', 'summer solstice', 'winter solstice', 'first snow', 'clocks', 'birthday']) assert.ok(tags.has(t), t);
  assert.equal(R.animItems({ pack: 'sky' }).filter(i => i.tags.includes('moon')).length, 8);
});

test('UK county table: every nation and region, the nearest main town, nothing outside the UK', () => {
  const all = Object.values(R.UK_COUNTIES);
  const n = (nation) => all.filter(c => c.nation === nation).length;
  assert.equal(n('GB-ENG'), 47); assert.equal(n('GB-SCT'), 32); assert.equal(n('GB-WLS'), 22); assert.equal(n('GB-NIR'), 6);
  const regions = R.UK_REGIONS.map(r => r.id);
  assert.equal(regions.length, 12);
  for (const c of all) {
    assert.ok(regions.includes(c.region), `${c.id} region`);
    assert.ok(R.ukTowns().some(t => t.id === c.id), `${c.id} has a town`);
  }
  const towns = R.ukTowns();
  assert.ok(towns.length >= 300 && towns.length <= 1000, `${towns.length} towns`);
  for (const t of towns) assert.ok(t.lat > 49.8 && t.lat < 61 && t.lon > -8.7 && t.lon < 2, t.town);
  const at = (lat, lon) => (R.ukCountyNearest(lat, lon) || {}).id || null;
  assert.equal(at(50.26, -5.05), 'cornwall');       // Truro
  assert.equal(at(50.57, -3.92), 'devon');          // central Dartmoor
  assert.equal(at(51.38, -2.36), 'somerset');       // Bath
  assert.equal(at(51.455, -2.59), 'bristol');
  assert.equal(at(51.07, -1.80), 'wiltshire');      // Salisbury
  assert.equal(at(55.95, -3.19), 'edinburgh');
  assert.equal(at(51.48, -3.18), 'cardiff');
  assert.equal(at(54.60, -5.93), 'antrim');         // Belfast
  assert.equal(at(51.51, -0.13), 'greater-london');
  assert.equal(at(50.95, 1.85), null, 'Calais is not Kent');
  assert.equal(at(48.86, 2.35), null, 'Paris');
  assert.equal(at(53.35, -6.26), null, 'Dublin');
  assert.equal(R.ukCountyNearest('x', 1), null);
  assert.equal(R.ukCounty('highland').welcome, 'the Highlands');
});

test('UK packs: county-only, one signature, bounded baseline and meaningful place views', () => {
  const uk = R.animPacks().filter(p => p.id.startsWith('uk-'));
  assert.ok(uk.length >= 1, 'batch 1 ships the south west');
  for (const p of uk) {
    const region = p.id.slice(3);
    assert.ok(R.UK_REGIONS.some(r => r.id === region), `${p.id}: a UK region`);
    // The South East and London share one gallery pack, while each scene
    // keeps its authoritative county region. No county-only check is relaxed.
    const regions = p.id === 'uk-south-east' ? ['south-east', 'london'] : p.id === 'uk-north-west' ? ['north-west', 'yorkshire', 'east-midlands'] : [region];
    const per = new Map();
    for (const it of p.items) {
      const c = R.ukCounty(it.county);
      assert.ok(c, `${it.ref}: county ${it.county} is in UK_COUNTIES`);
      assert.ok(regions.includes(c.region), `${it.ref}: county in its pack regions`);
      assert.equal(it.ukRegion, c.region);
      assert.deepEqual(it.region, [c.nation], `${it.ref}: nation`);
      assert.ok(['signature', 'landmark', 'landscape', 'tradition', 'food', 'sport', 'heritage'].includes(it.ukKind), `${it.ref}: kind`);
      assert.ok(it.tags.includes(it.ukKind) && it.tags.includes('uk'));
      assert.equal(typeof it.when, 'function', `${it.ref}: plays only in its county`);
      assert.equal(it.when('2026-08-15', {}), false, `${it.ref}: off without a county (the opt-in)`);
      assert.equal(it.when('2026-08-15', { county: 'kent' === it.county ? 'devon' : 'kent' }), false, `${it.ref}: not elsewhere`);
      assert.ok((it.priority || 1) < 2, `${it.ref}: festivals still win`);
      per.set(it.county, (per.get(it.county) || []).concat(it));
    }
    for (const [county, list] of per) {
      assert.equal(list.filter(i => i.signature).length, 1, `${county}: one signature opening`);
      const baseline = list.filter(i => !i.ukPart);
      assert.ok(baseline.filter(i => !i.signature).length <= 11, `${county}: at most 11 baseline elements`);
      const kinds = new Map();
      for (const i of baseline.filter(x => !x.signature)) { const k = i.ukKind === 'heritage' ? 'sport' : i.ukKind; kinds.set(k, (kinds.get(k) || 0) + 1); }
      for (const [k, n] of kinds) assert.ok(n <= 3, `${county}: at most 3 of kind ${k}`);
      const places = new Map(), seasonalViews = new Set();
      for (const i of list.filter(x => x.ukPart)) {
        assert.ok(i.full && i.ukPlace && i.ukTown && i.ukLocality && i.ukView && i.viewReason, `${i.ref}: named place, locality, view and reason`);
        assert.ok(R.ukTowns().some(t => t.id === county && t.town === i.ukTown), `${i.ref}: offline town cluster in its county`);
        const views = places.get(i.ukPlace) || new Set();
        const variant = `${i.ukPlace}|${i.ukView}|${i.ukSeason || 'any'}`;
        assert.ok(!seasonalViews.has(variant), `${i.ref}: distinct viewpoint and season`);
        seasonalViews.add(variant); views.add(i.ukView); places.set(i.ukPlace, views);
      }
      for (const [place, views] of places) assert.ok(views.size <= 4, `${county}/${place}: no more than four considered views`);
      const sig = list.find(i => i.signature);
      assert.ok(sig.when('2026-03-03', { county }), `${county}: the signature plays any month`);
    }
  }
  // Hampshire (the South East's first county): a rich rotation, each with its own place line
  const hants = R.animItems({}).filter(i => i.county === 'hampshire');
  assert.ok(hants.filter(i => !i.ukPart).length >= 8 && hants.filter(i => !i.ukPart).length <= 12, 'Hampshire: 8 to 12 baseline scenes, plus researched place views');
  for (const i of hants) assert.ok(typeof i.site === 'string' && i.site && !i.site.includes('Hampshire'), `${i.ref}: a site line`);
  for (const i of hants) assert.equal(i.full, true, `${i.ref}: a full-viewport scene (the opening plays it edge to edge)`);
  // two renders never share gradient ids (a scene can show twice on a page: the gallery and Home)
  const ids = (h) => [...h.matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
  const a1 = ids(R.animItemHtml(hants[0], {})), a2 = ids(R.animItemHtml(hants[0], {}));
  assert.ok(a1.length && !a1.some(x => a2.includes(x)), 'fresh ids per render');
  assert.ok(R.animItemHtml(hants[0], { tod: 'night' }).includes('tod-night') && !R.animItemHtml(hants[0], { tod: 'bogus' }).includes('tod-'), 'the time of day is a known word');
  const days = new Set(); for (let d = 1; d <= 28; d++) days.add(R.animDailyPick('opening', '2026-10-' + String(d).padStart(2, '0'), {}, { county: 'hampshire', level: 'standard' }).ref);
  assert.ok([...days].filter(r => r.startsWith('uk-south-east/hampshire-')).length >= 6, 'Hampshire rotates through its scenes day by day (a festival still wins its day)');
  const sw = R.animPacks().find(p => p.id === 'uk-south-west');
  assert.deepEqual([...new Set(sw.items.map(i => i.county))].sort(), R.ukCountiesIn('south-west').map(c => c.id).sort(), 'every south-west county drawn');
  // in the county the opening comes from the pack (no festival that day); elsewhere never
  const pick = R.animDailyPick('opening', '2026-10-06', {}, { county: 'cornwall', level: 'standard' });
  assert.equal(pick.county, 'cornwall');
  assert.equal(R.animDailyPick('opening', '2026-10-06', {}, { level: 'standard' }).pack.startsWith('uk-'), false);
  assert.equal(R.animDailyPick('opening', '2026-12-25', {}, { county: 'cornwall', level: 'standard' }).pack, 'seasons', 'Christmas still wins');
  assert.equal(R.animDailyPick('opening', '2026-10-06', { packsOff: ['uk-south-west'] }, { county: 'cornwall', level: 'standard' }).pack.startsWith('uk-'), false);
});

test('South East and London: complete county rotations, full framing, local ids and dated traditions', () => {
  const expected = ['south-east', 'london'].flatMap(region => R.ukCountiesIn(region));
  const pack = R.animPack('uk-south-east');
  assert.deepEqual([...new Set(pack.items.map(i => i.county))].sort(), expected.map(c => c.id).sort());
  const ids = html => [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  for (const c of expected) {
    const list = pack.items.filter(i => i.county === c.id);
    assert.ok(list.filter(i => !i.ukPart).length >= 8 && list.filter(i => !i.ukPart).length <= 12, `${c.id}: 8–12 baseline scenes`);
    for (const it of list) {
      assert.equal(it.full, true, `${it.ref}: full viewport`);
      assert.ok(it.site && it.colour && it.tags.length >= 6, `${it.ref}: caption and metadata`);
      const a = R.animItemHtml(it, {}), b = R.animItemHtml(it, {});
      const first = ids(a), second = ids(b);
      assert.ok(first.length && !first.some(id => second.includes(id)), `${it.ref}: fresh ids`);
      assert.ok(!/<text\b|<image\b|<foreignObject\b/i.test(a), `${it.ref}: original shape art`);
      assert.ok(!/\b(?:href|src)="(?!#)/.test(a), `${it.ref}: local references only`);
      if (it.months) {
        assert.equal(it.ukKind, 'tradition');
        for (let mo = 1; mo <= 12; mo++) assert.equal(it.when(`2026-${String(mo).padStart(2, '0')}-15`, { county: c.id }), it.months.includes(mo), `${it.ref}: month ${mo}`);
      }
    }
  }
});


test('Yateley: four views of each place per season, matching the calendar and retaining saved refs', () => {
  const places = ['yateley-common', 'wyndhams-pool', 'yateley-green'];
  const all = R.animPack('uk-south-east').items;
  const scenes = all.filter(i => places.includes(i.ukPlace));
  assert.equal(scenes.length, 48);
  for (const place of places) {
    for (const season of ['spring', 'summer', 'autumn', 'winter']) {
      const views = scenes.filter(i => i.ukPlace === place && i.ukSeason === season);
      assert.equal(views.length, 4);
      assert.deepEqual(views.map(i => i.ukView).sort(), ['close','detail','evening','wide']);
      for (const it of views) assert.deepEqual(it.season, [season]);
    }
    for (let v = 1; v <= 4; v++) assert.ok(all.some(i => i.id === `hampshire-${place}-${v}`), 'saved scene refs survive');
  }
  const off = all.filter(i => !scenes.includes(i)).map(i => i.ref);
  for (let month = 1; month <= 12; month++) {
    const day = `2026-${String(month).padStart(2,'0')}-16`;
    const season = R.animSeasonOf(day), ctx = {county:'hampshire',ukTown:'Yateley',level:'standard'};
    const eligible = scenes.filter(i => i.when(day, ctx));
    assert.equal(eligible.length, 12, day);
    assert.ok(eligible.every(i => i.ukSeason === season), day);
    const picked = R.animSpecialPick('opening',day,{block:off},ctx);
    assert.ok(picked && picked.ukSeason === season, `${day}: automatic local selection respects seasons`);
  }
});


test('Yateley live skies: astronomical daylight, local timezone and lunar phase fit every view', () => {
  const lat=51.34,lon=-.83,zone='Europe/London';
  const summerTimes=R.almSunTimes('2026-06-21',lat,lon),winterTimes=R.almSunTimes('2026-12-21',lat,lon);
  const summer=R.almSceneLight((summerTimes.rise+summerTimes.set)/2,lat,lon,zone);
  const winter=R.almSceneLight((winterTimes.rise+winterTimes.set)/2,lat,lon,zone);
  assert.ok(summer.altitude>winter.altitude+35,'seasonal sun height changes without new scenes');
  assert.equal(summer.x,800);assert.equal(summer.tod,'day');
  const dawn=R.almSceneLight(summerTimes.rise,lat,lon,zone);
  const dusk=R.almSceneLight(summerTimes.set,lat,lon,zone);
  assert.equal(dawn.tod,'dawn');assert.equal(dusk.tod,'dusk');assert.ok(dawn.x<dusk.x);
  const night=R.almSceneLight(summerTimes.set+2*3600000,lat,lon,zone);
  assert.equal(night.tod,'night');assert.equal(night.sun,false);
  assert.equal(R.almSceneLight(Date.parse('2026-03-29T12:00Z'),lat,lon,zone).altitude,R.almSceneLight(Date.parse('2026-03-29T12:00Z'),lat,lon,'UTC').altitude,'DST does not move the physical sun');
  assert.equal(R.almSceneLight(0,null,null,zone),null);
  assert.equal(R.almSceneLight(0,lat,lon,'bad-zone'),null);
  assert.notEqual(R.almMoonDiscPath(.25,29),R.almMoonDiscPath(.75,29),'waxing and waning illuminate opposite sides');
  for(const it of R.animPack('uk-south-east').items.filter(i=>i.liveSky)) {
    for(const sky of [summer,winter,dawn,dusk,night]) {
      const html=R.animItemHtml(it,{sky,live:true});
      assert.equal(markupProblem(html),'',it.ref);
      assert.ok(html.length<=R.animItemMaxBytes(it,it.rich?'fill':'md'),`${it.ref}/${sky.tod}: ${html.length}`);   // a rich scene renders full detail without a size
      assert.ok(html.includes(`tod-${sky.tod}`));
      if(sky.tod==='night')assert.ok(html.includes('x-ukystar')||html.includes('x-ukntwinkle'),`${it.ref}: stars at night`);   // the old Yateley stars or the nature kit's
    }
  }
});
