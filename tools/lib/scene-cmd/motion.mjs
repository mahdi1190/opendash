// `scene motion` (user request, 10 Oct: the animation overhaul): the motion lint of composed scenes, and a picture of it.
//
//   node tools/anim-pack.mjs scene motion <ref>[,<ref>...] [--pack <id>] [--out <file.png | dir>] [--violations <file.json>] [--strict]
//
// For every ground mover (actors, flow lanes) the engine's own motion rules (src/app/70-scene-1ground.js, sceneMotionCheck) report
// what is still wrong after the engine's automatic fixes: off the water or against a bank (moverWater), through a boat (moverHull),
// through a wall, fence, building, bench or trunk (moverBlocked), through a closed gate (moverGate), a walker on water or mid-air
// (moverGround), over 25 % off its real size at its depth (moverScale), popping in or out inside the frame (moverPop), two movers
// in one place (moverOverlap); moverFixed (info) lists what the engine corrected by itself.
// --out draws a frame of the scene with the paths (authored dashed, drawn solid), the blockers' footprints, the water, a depth
// ruler and every violation in red. --violations writes { scenes: { ref: { counts, problems } }, totals }. Exit 2 with errors under --strict.
import { writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';

const splitList = (v) => [].concat(v || []).flatMap(x => String(x).split(',')).map(s => s.trim()).filter(Boolean);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const R1 = (v) => Math.round(v * 10) / 10;

/** The motion report of one compiled scene, in JSON form (no functions, no ground arrays). */
export function motionReport(C, check) {
  const R = check(C);
  const counts = {};
  for (const p of R.problems) counts[p.rule] = (counts[p.rule] || 0) + 1;
  const sev = (s) => R.problems.filter(p => p.sev === s).length;
  return {
    v2: R.v2, errors: sev('error'), warns: sev('warn'), infos: sev('info'), counts,
    movers: R.movers.map(m => ({ i: m.i, o: m.o, cls: m.cls, mode: m.mode, flow: !!m.flow, moved: m.moved, detours: m.detours, scale: m.scale, bad: m.bad.length })),
    blockers: R.blockers.length,
    problems: R.problems.map(p => ({ rule: p.rule, sev: p.sev, i: p.i, obj: p.obj, at: p.at, msg: p.msg, fix: p.fix })),
    $R: R,
  };
}

/** The overlay (an SVG in scene units, 1600 x 900) of a motion report. */
export function motionOverlay(R, title) {
  const cam = R.cam, out = [];
  const proj = (x, d, h) => [cam.x0 + cam.f * x / d, cam.horizon + cam.f * (cam.eye - (h || 0)) / d];
  const pts = (P) => P.map(p => `${R1(p[0])},${R1(p[1])}`).join(' ');
  // water
  for (const P of R.water || []) out.push(`<polygon points="${pts(P)}" fill="#3aa0ff" fill-opacity=".16" stroke="#3aa0ff" stroke-width="1.5"/>`);
  // the depth ruler: rows of 5, 10, 20, 50, 100, 200 and 500 m
  for (const d of [5, 10, 20, 50, 100, 200, 500]) {
    if (d < cam.dMin) continue;
    const y = cam.horizon + cam.f * cam.eye / d;
    if (y > 900) continue;
    out.push(`<line x1="0" x2="1600" y1="${R1(y)}" y2="${R1(y)}" stroke="#fff" stroke-opacity=".22" stroke-dasharray="4 8"/><text x="6" y="${R1(y - 3)}" class="t">${d} m</text>`);
  }
  out.push(`<line x1="0" x2="1600" y1="${cam.horizon}" y2="${cam.horizon}" stroke="#ffe08a" stroke-opacity=".5"/><text x="6" y="${cam.horizon - 4}" class="t">horizon (eye ${R1(cam.eye)} m${cam.fitted ? ', fitted' : ''})</text>`);
  // blockers: their ground footprints
  for (const b of R.blockers || []) {
    if (b.d < cam.dMin) continue;
    const c = [proj(b.x - b.hx, b.d - b.hd), proj(b.x + b.hx, b.d - b.hd), proj(b.x + b.hx, b.d + b.hd), proj(b.x - b.hx, b.d + b.hd)];
    if (c.every(p => p[0] < -50 || p[0] > 1650)) continue;
    const col = b.kind === 'hull' ? '#ff9f1c' : b.kind === 'gate' ? '#ff4fd8' : b.kind === 'trunk' ? '#c79a5b' : '#ffcc00';
    out.push(`<polygon points="${pts(c)}" fill="${col}" fill-opacity=".28" stroke="${col}" stroke-width="1.5"/>`);
    if (b.d < 80) out.push(`<text x="${R1(c[3][0])}" y="${R1(c[3][1] + 11)}" class="t s">${esc(b.kind)}</text>`);
  }
  // movers: authored path (dashed), drawn path (green; red with a fault), the start labelled with its index, object and depth
  for (const m of R.movers || []) {
    const bad = m.bad && m.bad.length, col = bad ? '#ff3b30' : m.flow ? '#7dd3fc' : '#3ddc84';
    if (m.path && m.fixed && JSON.stringify(m.path) !== JSON.stringify(m.fixed)) out.push(`<polyline points="${pts(m.path)}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.5" stroke-dasharray="5 5"/>`);
    if (m.fixed && m.fixed.length) {
      out.push(`<polyline points="${pts(m.fixed)}" fill="none" stroke="${col}" stroke-width="2.5"/>`);
      const s = m.fixed[0], dd = m.ground && m.ground.length ? m.ground.map(p => p[1]) : null;
      out.push(`<circle cx="${R1(s[0])}" cy="${R1(s[1])}" r="4" fill="${col}"/><text x="${R1(s[0] + 6)}" y="${R1(s[1] - 6)}" class="t">${esc(String(m.i))} ${esc(m.o)}${dd ? ` ${R1(Math.min(...dd))}-${R1(Math.max(...dd))} m` : ''}${m.scale != null && Math.abs(m.scale - 1) > 0.25 ? ` x${m.scale}` : ''}</text>`);
    }
    for (const b of m.bad || []) out.push(`<circle cx="${R1(b.X)}" cy="${R1(b.Y)}" r="7" fill="none" stroke="#ff3b30" stroke-width="3"/>`);
  }
  // violations (every error and warning with a place)
  for (const p of R.problems || []) {
    if (p.sev === 'info' || !p.at) continue;
    const [x, y] = p.at;
    out.push(`<path d="M${x - 8} ${y - 8}L${x + 8} ${y + 8}M${x + 8} ${y - 8}L${x - 8} ${y + 8}" stroke="#ff3b30" stroke-width="3"/>`);
  }
  const counts = {};
  for (const p of R.problems || []) if (p.sev !== 'info') counts[p.rule] = (counts[p.rule] || 0) + 1;
  const lines = [title, `movers ${R.movers.length}, blockers ${R.blockers.length}`].concat(Object.entries(counts).map(([k, v]) => `${k}: ${v}`));
  if (lines.length === 2) lines.push('no violations');
  const h = 16 * lines.length + 10;
  out.push(`<rect x="1180" y="8" width="412" height="${h}" rx="6" fill="#000" fill-opacity=".62"/>` + lines.map((l, i) => `<text x="1192" y="${28 + 16 * i}" class="t${i > 1 ? ' r' : ''}">${esc(l)}</text>`).join(''));
  out.push(`<text x="1188" y="${h + 24}" class="t s">green: path as drawn; dashed white: as authored (the engine moved it); red: a fault</text><text x="1188" y="${h + 37}" class="t s">blue: water; orange: hulls; yellow: walls, fences, solids, logs; brown: trunks; pink: closed gates</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;font:12px system-ui,sans-serif"><style>.t{fill:#fff;paint-order:stroke;stroke:#000;stroke-width:3px}.s{font-size:10px}.r{fill:#ff8a80}</style>${out.join('')}</svg>`;
}

export default {
  summary: 'the motion lint: movers on their water or ground, round boats, walls, fences and gates, at their real size, never popping; --out draws it',
  usage: 'scene motion <ref>[,<ref>...] [--pack <id>] [--out <file.png | dir>] [--violations <file.json>] [--strict]',
  options: {
    out: { type: 'string', help: 'motion: a PNG (one scene) or a folder (one PNG per scene) with the paths, blockers, water and depth drawn over a frame' },
    violations: { type: 'string', help: 'motion: write the violations (per scene: counts and problems) to this JSON file' },
    strict: { type: 'boolean', help: 'motion: exit 2 when any scene has an error' },
  },
  async run(args, ctx, lib) {
    const pos = (ctx.positionals || []).filter(x => x !== 'motion');
    const reg = lib.loadRegistry(ctx.root, { fresh: true }), E = lib.engineOf(reg);
    E.require('scene motion');
    const check = reg.R.get('sceneMotionCheck');
    if (typeof check !== 'function') throw new Error('scene motion needs sceneMotionCheck (src/app/70-scene-1ground.js)');
    const scenes = lib.selectScenes(reg, E, args, pos);
    if (!scenes.length) throw new Error('scene motion needs refs (<pack>/<id>) or --pack');
    const rows = [];
    for (const s of scenes) {
      const C = E.compile(s.data(), { season: 'summer', lod: 1, L: null });
      const r = motionReport(C, check);
      rows.push({ s, r });
      ctx.out(`${r.errors ? 'FAIL' : r.warns ? 'warn' : 'PASS'}  ${s.ref}  (${r.v2 ? 'v2' : 'v1'}; ${r.movers.length} movers, ${r.blockers} blockers)  ${Object.entries(r.counts).map(([k, v]) => `${k} ${v}`).join(', ') || 'clean'}`);
      for (const p of r.problems) if (p.sev !== 'info') ctx.out(`    ${p.sev.padEnd(5)} ${p.rule.padEnd(13)} ${p.msg}`);
    }
    if (args.violations) {
      const scenesOut = {}, totals = {};
      for (const { s, r } of rows) {
        const { $R, ...plain } = r;
        scenesOut[s.ref] = plain;
        for (const [k, v] of Object.entries(r.counts)) totals[k] = (totals[k] || 0) + v;
      }
      mkdirSync(dirname(args.violations), { recursive: true });
      writeFileSync(args.violations, JSON.stringify({ generated: new Date().toISOString(), scenes: scenesOut, totals }, null, 1));
      ctx.out(`wrote ${args.violations}`);
    }
    if (args.out) {
      const many = rows.length > 1 || (existsSync(args.out) && statSync(args.out).isDirectory()) || extname(args.out).toLowerCase() !== '.png';
      if (many) mkdirSync(args.out, { recursive: true }); else mkdirSync(dirname(args.out), { recursive: true });
      const { launchChrome } = await import('../../release-chrome.mjs');
      const { findBrowser, itemPage } = await import('../anim-render.mjs');
      const exe = findBrowser();
      if (!exe) throw new Error('No Chrome, Edge or Chromium found. Set CHROME_PATH to its executable.');
      const chrome = await launchChrome({ executable: exe });
      try {
        for (const { s, r } of rows) {
          const entry = reg.items().find(e => e.ref === s.ref);
          if (!entry) { ctx.out(`(no registry entry for ${s.ref}: no picture)`); continue; }
          const html = itemPage(reg, entry, {}).replace('</body>', `${motionOverlay(r.$R, s.ref)}</body>`);
          const file = many ? join(args.out, s.ref.replace(/\//g, '__') + '.png') : args.out;
          writeFileSync(file, await chrome.screenshot({ html, width: 1600, height: 900, transparent: false }));
          ctx.out(`wrote ${file}`);
        }
      } finally { await chrome.close(); }
    }
    return args.strict && rows.some(x => x.r.errors) ? 2 : 0;
  },
};
