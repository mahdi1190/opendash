/* ============================================================
   REWARDS, the drawings: the ground styles, the paths and the fences (the ornaments are kit parts in their GARDEN_DECOR rows), and small pictures of the materials.
   Top-level gartDefine calls: this file sorts after 94-garden-art-0core.js, which defines it.
   ============================================================ */
const _grwTile = (s) => `<g transform="scale(1 1.3333)">${s}</g>`;
function _grwSpeck(id, n, cols, A, size) {
  let s = '';
  for (let i = 0; i < n; i++) { const h = gardenHash(id + i), x = -30 + h % 60, y = -28 + (h >>> 7) % 26, w = (size || 1.8) * (0.7 + ((h >>> 13) % 6) / 8); s += A.P(cols[(h >>> 17) % cols.length], A.ell(x, y, w, w * 0.6)); }
  return s;
}
function _grwGround(id, base, cols, n, size) { gartDefine('decor:' + id, { box: [64, 64], fit: 'none', draw: (o, r, A) => _grwTile(A.P(base, A.rect(-32, -30, 64, 30)) + _grwSpeck(id, n, cols, A, size)) }); }
_grwGround('rw-ground-bark', '#7a5636', ['#5e4128', '#936a44', '#a87c4f'], 26, 2.6);
_grwGround('rw-ground-clover', '#6f9f4e', ['#5b8a3e', '#86b561', '#e8e4d0'], 34, 1.7);
_grwGround('rw-ground-moss', '#58803f', ['#476b32', '#6f9a4a', '#88ad5c'], 24, 3);
_grwGround('rw-ground-sand', '#e4d6ae', ['#d3c294', '#f0e5c6', '#c4b283'], 30, 1.1);
_grwGround('rw-ground-slate', '#6c7480', ['#59616c', '#828a96', '#4b525c'], 20, 3.4);
_grwGround('rw-path-bark', '#8a6642', ['#6a4c30', '#a47e56'], 22, 2.4);
gartDefine('decor:rw-path-cobble', { box: [64, 64], fit: 'none', draw: (o, r, A) => { let s = A.P('#857d70', A.rect(-32, -30, 64, 30)); for (let y = 0; y < 4; y++) for (let x = 0; x < (y % 2 ? 5 : 6); x++) { const h = gardenHash('cb' + x + y); s += A.P(['#b5ad9e', '#a39b8c', '#c4bdae'][h % 3], A.ell(-27 + x * 11 + (y % 2) * 5, -26 + y * 7.4, 5, 3.1)); } return _grwTile(s); } });
gartDefine('decor:rw-path-sleeper', { box: [64, 64], fit: 'none', draw: (o, r, A) => { let s = A.P('#6f6650', A.rect(-32, -30, 64, 30)); for (let i = 0; i < 4; i++) s += A.P(i % 2 ? '#5e432b' : '#6f5035', A.rrect(-28, -28.5 + i * 7.2, 56, 5.6, 1)); return _grwTile(s); } });
gartDefine('decor:rw-path-shell', { box: [64, 64], fit: 'none', draw: (o, r, A) => _grwTile(A.P('#e9e2d2', A.rect(-32, -30, 64, 30)) + _grwSpeck('rw-shell', 30, ['#f8f4ea', '#d8cdb8', '#e8c8b8'], A, 2.1)) });
/* A fence that turns: seen along it, or end on. */
function _grwFence(id, draw) { gartDefine('decor:' + id, { box: [64, 64], fit: 'none', draw(o, r, A) { const side = (o.r || 0) % 2 === 1; return A.shadow(side ? 10 : 30, 3) + draw(side, A); } }); }
_grwFence('rw-fence-hurdle', (side, A) => { if (side) return A.P('#8a6a42', A.rrect(-4, -30, 8, 30, 2)); let s = ''; for (let i = 0; i < 5; i++) s += A.P(i % 2 ? '#9a7a4e' : '#7e5f3a', A.rrect(-30, -28 + i * 5.2, 60, 4, 1.6)); return s + A.P('#6a4e2e', A.rect(-30, -32, 4, 32)) + A.P('#6a4e2e', A.rect(26, -32, 4, 32)); });
_grwFence('rw-fence-kerb', (side, A) => { let s = ''; const n = side ? 2 : 6, w = side ? 8 : 11; for (let x = 0; x < n; x++) { const h = gardenHash('kb' + x); s += A.P(['#a39b8c', '#b5ad9e'][h % 2], A.rrect(-(n * w) / 2 + x * w, -10 - h % 3, w - 1, 10 + h % 3, 2.4)); } return s; });
_grwFence('rw-fence-rope', (side, A) => { if (side) return A.P('#7a5a3a', A.rrect(-3, -30, 6, 30, 1.6)); return A.P('#7a5a3a', A.rrect(-29, -30, 6, 30, 1.6)) + A.P('#7a5a3a', A.rrect(23, -30, 6, 30, 1.6)) + A.S('#d8c48e', 2.2, 'M-26 -26Q0 -15 26 -26') + A.S('#d8c48e', 2.2, 'M-26 -14Q0 -4 26 -14'); });

const _GRW_MAT_ART = Object.freeze({
  peg: '<path d="M7 4h4l1 3-1 8-2 5-2-5-1-8z" fill="#c9a26a" stroke="#7a5a3a" stroke-width="1"/><rect x="6" y="6" width="6" height="2.4" fill="#d8453a"/>',
  timber: '<rect x="2" y="8" width="20" height="5" rx="2.4" fill="#a87c4f"/><rect x="2" y="14" width="20" height="5" rx="2.4" fill="#8a6642"/><circle cx="20" cy="10.500" r="2" fill="#d8bd8e"/><circle cx="20" cy="16.500" r="2" fill="#d8bd8e"/>',
  stone: '<path d="M3 18Q2 10 9 8q5-3 9 1 5 3 3 9z" fill="#a39b8c" stroke="#6f685c" stroke-width="1"/><path d="M8 11q3-2 6-1" stroke="#d0c9ba" stroke-width="1.400" fill="none"/>',
  reed: '<path d="M6 21Q7 12 5 5M12 21V3M18 21Q17 12 19 6" stroke="#8f9a4a" stroke-width="2" fill="none"/><ellipse cx="5" cy="5" rx="1.800" ry="3.200" fill="#7a5636"/><ellipse cx="12" cy="4" rx="1.800" ry="3.200" fill="#7a5636"/><ellipse cx="19" cy="6" rx="1.800" ry="3.200" fill="#7a5636"/><path d="M4 15h16" stroke="#c9b36a" stroke-width="2"/>',
});
function gardenRewardMatSvg(id, px) { return `<svg viewBox="0 0 24 24" width="${px}" height="${px}" aria-hidden="true">${_GRW_MAT_ART[id] || ''}</svg>`; }
