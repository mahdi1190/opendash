/* ============================================================
   SOFT LIGHT. The owner, 1 Nov 2026: weird red circles and ovals over things in the garden, some of them bluish.
   A lamp's glow, a spring or a halo is drawn as a pale see-through circle in one flat colour, which shows as a hard-edged disc. Here every such shape in the garden gets a soft edge instead, in one place, so nobody who draws a light has to think about it.
   The fill becomes a soft gradient of the same colour, shared by colour from one small hidden set of definitions. Dark shapes (shadows) and small ones stay as they are. Anything inside a baked picture is left alone: a baked picture cannot see these definitions.
     gardenSoftGlowIn(root)   every pale circle and oval in it
   ============================================================ */
const GSG = Object.freeze({ minR: 8, maxOpacity: 0.6, minLum: 0.25 });   // the largest radius below which a shape is left alone; the most see-through a shape can be and still count; darker than this is a shadow
const _gsg = { svg: null, mo: null, defs: null, made: new Set() };
function _gsgLum(hex) {
  const h = hex.length === 4 ? hex.slice(1).replace(/./g, '$&$&') : hex.slice(1);
  return (0.2126 * parseInt(h.slice(0, 2), 16) + 0.7152 * parseInt(h.slice(2, 4), 16) + 0.0722 * parseInt(h.slice(4, 6), 16)) / 255;
}
function _gsgFill(hex) {
  const id = 'gsg-' + hex.slice(1).toLowerCase();
  if (!_gsg.made.has(id)) {
    const NS = 'http://www.w3.org/2000/svg';
    if (!_gsg.defs || !_gsg.defs.isConnected) {
      const s = document.createElementNS(NS, 'svg'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('width', '0'); s.setAttribute('height', '0'); s.style.position = 'absolute';
      _gsg.defs = document.createElementNS(NS, 'defs'); s.appendChild(_gsg.defs); document.body.appendChild(s); _gsg.made.clear();
    }
    const g = document.createElementNS(NS, 'radialGradient'); g.id = id;
    for (const [o, a] of [[0, 1], [0.6, 0.62], [1, 0]]) { const st = document.createElementNS(NS, 'stop'); st.setAttribute('offset', String(o)); st.setAttribute('stop-color', hex); st.setAttribute('stop-opacity', String(a)); g.appendChild(st); }
    _gsg.defs.appendChild(g); _gsg.made.add(id);
  }
  return `url(#${id})`;
}
function _gsgOne(el) {
  const fill = el.getAttribute('fill');
  if (!fill || !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(fill)) return;
  const size = el.tagName === 'circle' ? Number(el.getAttribute('r')) : Math.max(Number(el.getAttribute('rx')), Number(el.getAttribute('ry')));
  if (!(size >= GSG.minR)) return;
  const fo = el.getAttribute('fill-opacity'), op = el.getAttribute('opacity'), a = (fo == null ? 1 : Number(fo)) * (op == null ? 1 : Number(op));
  if (!(a <= GSG.maxOpacity) || _gsgLum(fill) < GSG.minLum || el.closest('.gart-bake')) return;
  el.setAttribute('fill', _gsgFill(fill));
}
function gardenSoftGlowIn(root) {
  if (!root || root.nodeType !== 1) return;
  if (root.tagName === 'circle' || root.tagName === 'ellipse') { _gsgOne(root); return; }
  for (const el of root.querySelectorAll('circle,ellipse')) _gsgOne(el);
}
function _gsgWatch() {
  const svg = typeof _gw !== 'undefined' ? _gw.svg : null;
  if (svg === _gsg.svg) return;
  if (_gsg.mo) _gsg.mo.disconnect();
  _gsg.svg = svg; if (!svg) return;
  gardenSoftGlowIn(svg);
  if (!_gsg.mo) _gsg.mo = new MutationObserver((list) => { for (const r of list) for (const n of r.addedNodes) gardenSoftGlowIn(n); });
  _gsg.mo.observe(svg, { childList: true, subtree: true });
}
wdMod({ id: 'soft-glow', fun: false, visit: true, begin() { _gsgWatch(); }, painted() { _gsgWatch(); }, tick() { _gsgWatch(); }, end() { if (_gsg.mo) _gsg.mo.disconnect(); _gsg.svg = null; } });
